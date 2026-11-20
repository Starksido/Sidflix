import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomBytes } from "node:crypto";

test("real account sessions isolate recommendations and sync across independent logins", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "sidflix-accounts-test-"));
  process.env.SIDFLIX_ACCOUNT_DB = path.join(directory, "accounts.sqlite");
  process.env.BETTER_AUTH_SECRET = randomBytes(48).toString("hex");
  process.env.BETTER_AUTH_URL = "http://localhost:3000";
  const { auth } = await import("../src/lib/auth");
  const { accountDatabase: db } = await import("../src/lib/account-database");
  try {
    const { getMigrations } = await import("better-auth/db/migration");
    await (await getMigrations(auth.options)).runMigrations();
    db.exec("CREATE TABLE account_taste (user_id TEXT PRIMARY KEY REFERENCES user(id) ON DELETE CASCADE, data TEXT NOT NULL, reset_at INTEGER NOT NULL DEFAULT 0, updated_at INTEGER NOT NULL)");
    const { GET, POST } = await import("../src/app/api/recommendations/preferences/route");
    const { patchAccountTaste } = await import("../src/lib/account-taste");
    const origin = "http://localhost:3000", url = origin + "/api/recommendations/preferences";
    const password = "Test-only private password 847!";
    const cookie = (response: Response) => response.headers.getSetCookie().map(value => value.split(";")[0]).join("; ");
    const register = async (email: string) => {
      const response = await auth.api.signUpEmail({ body: { name: email.split("@")[0], email, password }, headers: new Headers({ origin }), asResponse: true });
      assert.equal(response.status, 200);
      const body = await response.json(); return { cookie: cookie(response), id: body.user.id as string };
    };
    const alice = await register("alice@example.test"), bob = await register("bob@example.test");
    const get = (value: string) => GET(new Request(url, { headers: { cookie: value } }));
    const post = (owner: typeof alice, patch: unknown, extra: Record<string, string> = {}) => POST(new Request(url, { method: "POST", headers: { origin, cookie: owner.cookie, "Content-Type": "application/json", ...extra }, body: JSON.stringify({ accountId: owner.id, patch }) }));
    assert.equal((await GET(new Request(url))).status, 401);
    assert.equal((await post(alice, { type: "mood", day: "2026-11-15", value: "comfort" }, { origin: "https://attacker.example" })).status, 403);
    assert.equal((await post(alice, { type: "mood", day: "2026-11-15", value: "comfort" })).status, 200);
    assert.equal((await (await get(bob.cookie)).json()).preferences.mood, null);
    const secondLogin = await auth.api.signInEmail({ body: { email: "alice@example.test", password }, headers: new Headers({ origin }), asResponse: true });
    assert.equal(secondLogin.status, 200);
    assert.equal((await (await get(cookie(secondLogin))).json()).preferences.mood.value, "comfort");
    const rejected = await POST(new Request(url, { method: "POST", headers: { origin, cookie: bob.cookie }, body: JSON.stringify({ accountId: alice.id, patch: { type: "reset" } }) }));
    assert.equal(rejected.status, 409);
    assert.equal((await (await get(alice.cookie)).json()).preferences.mood.value, "comfort");
    const title = { id: "online-123", kind: "film", title: "Test title", niche: "indie", maturity: "16+", year: 2020, minutes: 100,
      genres: ["crime"], synopsis: "A story", art: { from: "#000", to: "#111" }, remote: { provider: "vidspark", tmdb: 123 } };
    const watchedAt = Date.now() - 1000;
    const entry = { itemId: title.id, workKey: "movie:123", title, duration: 6000, position: 1000, watchedSeconds: 1000, completed: false, lastWatchedAt: watchedAt, hour: 18 };
    const progressWrite = await post(alice, { type: "progress", history: [entry] });
    assert.equal(progressWrite.status, 200);
    assert.deepEqual(await progressWrite.json(), { accountId: alice.id, saved: true }, "frequent progress writes must not download the whole history again");
    assert.equal((await post(alice, { type: "progress", history: [{ ...entry, watchedSeconds: 40 }] })).status, 200);
    assert.equal((await (await get(cookie(secondLogin))).json()).preferences.history[0].watchedSeconds, 1000);
    assert.equal((await (await get(bob.cookie)).json()).preferences.history.length, 0);
    assert.match((await get(alice.cookie)).headers.get("cache-control") ?? "", /private, no-store/);
    assert.equal((await post(alice, { type: "options", hemisphere: "invalid" })).status, 400);
    const huge = new Request(url, { method: "POST", headers: { origin, cookie: alice.cookie }, body: "x".repeat(80_001) });
    assert.equal((await POST(huge)).status, 413);
    patchAccountTaste(alice.id, { type: "reset" }, Date.now());
    patchAccountTaste(alice.id, { type: "progress", history: [entry] });
    assert.equal((await (await get(alice.cookie)).json()).preferences.history.length, 0, "an old offline device must not restore reset history");
    const stored = db.prepare("SELECT password FROM account LIMIT 1").get();
    assert.ok(stored && typeof stored.password === "string" && !stored.password.includes(password));
  } finally {
    db.close();
    if (path.dirname(directory) === path.resolve(tmpdir()) && path.basename(directory).startsWith("sidflix-accounts-test-")) await rm(directory, { recursive: true, force: true });
  }
});
