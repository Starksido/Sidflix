import { config } from "dotenv";
import { randomBytes } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { networkInterfaces } from "node:os";

async function main() {
config({ path: [".env.local", ".env"], quiet: true });
let env = await readFile(".env.local", "utf8").catch(() => "");
const set = (key: string, value: string) => {
  const line = `${key}=${JSON.stringify(value)}`;
  const match = new RegExp(`^${key}=.*$`, "m");
  env = match.test(env) ? env.replace(match, () => line) : `${env.trimEnd()}\n${line}\n`;
  process.env[key] = value;
};
if (!process.env.BETTER_AUTH_SECRET || process.env.BETTER_AUTH_SECRET.length < 32) set("BETTER_AUTH_SECRET", randomBytes(48).toString("base64url"));
const port = new URL(process.env.BETTER_AUTH_URL ?? "http://localhost:3000").port || "3000";
const localOrigins = Object.values(networkInterfaces()).flat().filter(info => info?.family === "IPv4" && !info.internal && /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(info.address)).map(info => `http://${info!.address}:${port}`);
set("BETTER_AUTH_TRUSTED_ORIGINS", [...new Set([...(process.env.BETTER_AUTH_TRUSTED_ORIGINS ?? "").split(",").filter(Boolean), "http://localhost:3000", "http://127.0.0.1:3000", ...localOrigins])].join(","));
await writeFile(".env.local", env);
const { auth } = await import("../src/lib/auth");
const { getMigrations } = await import("better-auth/db/migration");
const migrations = await getMigrations(auth.options);
await migrations.runMigrations();
const { accountDatabase } = await import("../src/lib/account-database");
accountDatabase.exec(`CREATE TABLE IF NOT EXISTS account_taste (
  user_id TEXT PRIMARY KEY REFERENCES user(id) ON DELETE CASCADE,
  data TEXT NOT NULL,
  reset_at INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL
);`);
console.log("Sidflix account storage is ready. Account secrets were kept private.");
for (const origin of localOrigins) console.log(`Other devices on this network: ${origin}`);
}
main().catch((error: unknown) => {
  let message = error instanceof Error ? `${error.name}: ${error.message}` : "Unknown setup error";
  for (const value of [process.env.DATABASE_URL, process.env.BETTER_AUTH_SECRET]) if (value) message = message.replaceAll(value, "[private]");
  console.error(message); process.exitCode = 1;
});
