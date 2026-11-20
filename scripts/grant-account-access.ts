import { config } from "dotenv";

async function main() {
  config({ path: [".env.local", ".env"], quiet: true });
  const [userId, role] = process.argv.slice(2);
  if (!userId || !["free", "premium", "owner"].includes(role)) throw new Error("Usage: grant-account-access <account-id> <free|premium|owner>");
  const { grantAccountAccess } = await import("../src/lib/account-access");
  const access = grantAccountAccess(userId, role as "free" | "premium" | "owner");
  console.log("Account access updated:", access);
}
main().catch(error => { console.error(error instanceof Error ? error.message : "Account access could not be updated"); process.exitCode = 1; });
