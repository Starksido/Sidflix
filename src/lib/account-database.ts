import "server-only";
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import path from "node:path";

const filename = path.resolve(/* turbopackIgnore: true */ process.env.SIDFLIX_ACCOUNT_DB ?? path.join(process.cwd(), "data", "accounts.sqlite"));
mkdirSync(path.dirname(filename), { recursive: true });
const globalDb = globalThis as typeof globalThis & { sidflixAccounts?: DatabaseSync };
export const accountDatabase = globalDb.sidflixAccounts ??= new DatabaseSync(filename, { enableForeignKeyConstraints: true });
accountDatabase.exec("PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;");
