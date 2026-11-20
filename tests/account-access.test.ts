import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomBytes } from "node:crypto";

test("owner access is permanent, account-bound and cannot be claimed using the sydo display name or client flags", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "sidflix-access-test-"));
  process.env.SIDFLIX_ACCOUNT_DB = path.join(directory, "accounts.sqlite");
  process.env.BETTER_AUTH_SECRET = randomBytes(48).toString("hex");
  process.env.BETTER_AUTH_URL = "http://localhost:3000";
  const { auth } = await import("../src/lib/auth");
  const { accountDatabase: db } = await import("../src/lib/account-database");
  try {
    const { getMigrations } = await import("better-auth/db/migration");
    await (await getMigrations(auth.options)).runMigrations();
    const { grantAccountAccess, readAccountAccess } = await import("../src/lib/account-access");
    const { GET } = await import("../src/app/api/account/access/route");
    const origin = "http://localhost:3000", url = origin + "/api/account/access";
    const register = async (email: string) => {
      const response = await auth.api.signUpEmail({ body: { name: "sydo", email, password: "Private test password 561!" }, headers: new Headers({ origin }), asResponse: true });
      assert.equal(response.status, 200);
      return { id: (await response.json()).user.id as string, cookie: response.headers.getSetCookie().map(value => value.split(";")[0]).join("; ") };
    };
    const owner = await register("owner@example.test"), other = await register("other@example.test");
    assert.equal(readAccountAccess(owner.id).role, "free");
    grantAccountAccess(owner.id, "owner");
    assert.deepEqual(readAccountAccess(owner.id, Date.now() + 100 * 365 * 86400_000), { role: "owner", allFeatures: true, downloads: true });
    assert.deepEqual(readAccountAccess(other.id), { role: "free", allFeatures: false, downloads: false });
    assert.equal((await GET(new Request(url))).status, 401);
    const forged = await GET(new Request(url + `?accountId=${owner.id}&role=owner`, { headers: { cookie: other.cookie, "x-sidflix-role": "owner" } }));
    assert.deepEqual(await forged.json(), { accountId: other.id, role: "free", allFeatures: false, downloads: false });
    const real = await GET(new Request(url, { headers: { cookie: owner.cookie } }));
    assert.equal((await real.json()).allFeatures, true);
    assert.match(real.headers.get("cache-control") ?? "", /private, no-store/);
    const expiry = Date.now() + 60_000;
    grantAccountAccess(other.id, "premium", expiry);
    assert.equal(readAccountAccess(other.id).downloads, true);
    assert.equal(readAccountAccess(other.id, expiry + 1).downloads, false);
    assert.throws(() => grantAccountAccess("missing-account", "owner"));
    assert.throws(() => grantAccountAccess(owner.id, "owner", expiry));
    const second = await auth.api.signInEmail({ body: { email: "owner@example.test", password: "Private test password 561!" }, headers: new Headers({ origin }), asResponse: true });
    const secondCookie = second.headers.getSetCookie().map(value => value.split(";")[0]).join("; ");
    assert.equal((await (await GET(new Request(url, { headers: { cookie: secondCookie } }))).json()).allFeatures, true);
  } finally {
    db.close();
    if (path.dirname(directory) === path.resolve(tmpdir()) && path.basename(directory).startsWith("sidflix-access-test-")) await rm(directory, { recursive: true, force: true });
  }
});
