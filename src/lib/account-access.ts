import "server-only";
import { accountDatabase as db } from "@/lib/account-database";

export type AccountRole = "free" | "premium" | "owner";
export type AccountAccess = { role: AccountRole; allFeatures: boolean; downloads: boolean };

export function ensureAccountAccessStorage() {
  db.exec(`CREATE TABLE IF NOT EXISTS account_access (
    user_id TEXT PRIMARY KEY REFERENCES user(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK(role IN ('free', 'premium', 'owner')),
    expires_at INTEGER,
    updated_at INTEGER NOT NULL,
    CHECK(role != 'owner' OR expires_at IS NULL)
  )`);
}

/** Privileges belong to the authenticated account ID, never its display name. */
export function readAccountAccess(userId: string, now = Date.now()): AccountAccess {
  ensureAccountAccessStorage();
  const row = db.prepare("SELECT role, expires_at FROM account_access WHERE user_id = ?").get(userId);
  const active = row && (row.expires_at === null || Number(row.expires_at) > now);
  const role: AccountRole = active && (row.role === "owner" || row.role === "premium") ? row.role : "free";
  return { role, allFeatures: role === "owner", downloads: role === "owner" || role === "premium" };
}

/** Administrative provisioning only; there is no public role-update endpoint. */
export function grantAccountAccess(userId: string, role: AccountRole, expiresAt: number | null = null) {
  if (!["free", "premium", "owner"].includes(role) || !userId || expiresAt !== null && (!Number.isSafeInteger(expiresAt) || expiresAt <= Date.now()) || role === "owner" && expiresAt !== null) throw new Error("Invalid account access grant");
  ensureAccountAccessStorage();
  if (!db.prepare("SELECT id FROM user WHERE id = ?").get(userId)) throw new Error("Account does not exist");
  db.prepare("INSERT INTO account_access (user_id, role, expires_at, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET role = excluded.role, expires_at = excluded.expires_at, updated_at = excluded.updated_at")
    .run(userId, role, expiresAt, Date.now());
  return readAccountAccess(userId);
}
