import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomBytes, createHash } from "node:crypto";

test("download routes enforce real membership and validate streamed bytes, ranges and redirects", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "sidflix-download-test-"));
  process.env.SIDFLIX_ACCOUNT_DB = path.join(directory, "accounts.sqlite");
  process.env.BETTER_AUTH_SECRET = randomBytes(48).toString("hex");
  process.env.BETTER_AUTH_URL = "http://localhost:3000";
  const { auth } = await import("../src/lib/auth");
  const { accountDatabase: db } = await import("../src/lib/account-database");
  const realFetch = globalThis.fetch;
  try {
    const { getMigrations } = await import("better-auth/db/migration");
    await (await getMigrations(auth.options)).runMigrations();
    const { grantAccountAccess } = await import("../src/lib/account-access");
    const { GET: catalogue } = await import("../src/app/api/downloads/catalog/route");
    const { GET, HEAD } = await import("../src/app/api/downloads/[id]/file/route");
    const sources = await import("../src/lib/sources/downloads");
    const { downloadFilename } = await import("../src/lib/download-catalog");
    const origin = "http://localhost:3000";
    const register = async (email: string) => {
      const response = await auth.api.signUpEmail({ body: { name: "sydo", email, password: "Test downloads private 651!" }, headers: new Headers({ origin }), asResponse: true });
      assert.equal(response.status, 200);
      return { id: (await response.json()).user.id as string, cookie: response.headers.getSetCookie().map(value => value.split(";")[0]).join("; ") };
    };
    const owner = await register("owner@example.test"), free = await register("free@example.test");
    grantAccountAccess(owner.id, "owner");
    const bytes = Buffer.alloc(4_749_930); for (let i = 0; i < bytes.length; i++) bytes[i] = i % 251;
    let calls = 0, mode = "normal";
    globalThis.fetch = async (input, init) => {
      calls++; const url = String(input);
      assert(sources.isDownloadUrlAllowed(url), "unsafe redirect must never be fetched");
      if (url.includes("/metadata/")) return Response.json({ files: [{ name: "BigBuckBunny_512kb.mp4", size: "43315070" }] });
      if (url.includes("/api/v1/videos/")) return Response.json({ downloadEnabled: true, files: [{ resolution: { id: 720 }, size: 29113055, hasVideo: true, fileUrl: "https://evil.example/payload" }] });
      if (mode === "redirect") return new Response(null, { status: 302, headers: { Location: "http://127.0.0.1/private" } });
      const range = new Headers(init?.headers).get("range"), parsed = range?.match(/^bytes=(\d+)-(\d+)$/);
      const ranged = parsed && mode !== "ignore-range";
      const start = ranged ? Number(parsed[1]) : 0, end = ranged ? Number(parsed[2]) : bytes.length - 1;
      const headers: Record<string, string> = { "Content-Type": mode === "html" ? "text/html" : "video/webm", "Content-Length": String(end - start + 1), ETag: '"verified-file"' };
      if (ranged) headers["Content-Range"] = mode === "bad-range" ? "bytes 1-2/3" : `bytes ${start}-${end}/${bytes.length}`;
      if (mode === "bad-length") headers["Content-Length"] = "123";
      return new Response(init?.method === "HEAD" ? null : bytes.subarray(start, end + 1), { status: ranged ? 206 : 200, headers });
    };
    const context = { params: Promise.resolve({ id: "caminandes-llama-drama" }) };
    const request = (cookie?: string, headers: Record<string, string> = {}, query = "quality=commons-480") => new Request(`${origin}/api/downloads/caminandes-llama-drama/file?${query}`, { headers: { ...(cookie ? { cookie } : {}), ...headers } });
    assert.equal((await GET(request(), context)).status, 401);
    assert.equal((await GET(request(free.cookie, { "x-sidflix-role": "owner" }, `quality=commons-480&accountId=${owner.id}&role=owner`), context)).status, 403);
    assert.equal((await catalogue(new Request(origin + "/api/downloads/catalog", { headers: { cookie: free.cookie } }))).status, 403);
    assert.equal(calls, 0, "unauthorized requests cannot reach upstream");
    const catalogResponse = await catalogue(new Request(origin + "/api/downloads/catalog", { headers: { cookie: owner.cookie } }));
    const catalogData = await catalogResponse.json(); assert.equal(catalogData.accountId, owner.id); assert.equal(catalogData.items.length, 3);
    assert(!JSON.stringify(catalogData).includes("evil.example")); assert(catalogData.items.every((item: { variants: object[] }) => item.variants.every(variant => !("url" in variant))));
    const full = await GET(request(owner.cookie), context); assert.equal(full.status, 200);
    assert.match(full.headers.get("cache-control")!, /private, no-store/); assert.equal(full.headers.get("vary"), "Cookie");
    assert.match(full.headers.get("content-disposition")!, /attachment;/);
    assert.equal(createHash("sha256").update(Buffer.from(await full.arrayBuffer())).digest("hex"), createHash("sha256").update(bytes).digest("hex"));
    const head = await HEAD(request(owner.cookie), context); assert.equal(head.body, null); assert.equal(Number(head.headers.get("content-length")), bytes.length);
    for (const range of ["bytes=1048576-", "bytes=-512", "bytes=0-19"]) {
      const response = await GET(request(owner.cookie, { range, "If-Range": '"verified-file"' }), context); assert.equal(response.status, 206);
      const match = response.headers.get("content-range")!.match(/^bytes (\d+)-(\d+)\//)!;
      assert.deepEqual(Buffer.from(await response.arrayBuffer()), bytes.subarray(Number(match[1]), Number(match[2]) + 1));
    }
    for (const range of ["bytes=99999999-", "bytes=3-2", "bytes=0-1,3-4", "other=2-3"]) assert.equal((await GET(request(owner.cookie, { range }), context)).status, 416);
    mode = "ignore-range"; const ignored = await GET(request(owner.cookie, { range: "bytes=1024-" }), context); assert.equal(ignored.status, 200); assert.equal((await ignored.arrayBuffer()).byteLength, bytes.length);
    for (const failure of ["bad-length", "bad-range", "html", "redirect"]) { mode = failure; assert.equal((await GET(request(owner.cookie, failure === "bad-range" ? { range: "bytes=0-10" } : {}), context)).status, 502, failure); }
    mode = "normal";
    assert.equal((await GET(request(owner.cookie, { "sec-fetch-site": "cross-site" }), context)).status, 403);
    assert.equal((await GET(request(owner.cookie, {}, "quality=evil&url=https://evil.example"), context)).status, 404);
    assert.equal((await GET(request(owner.cookie), { params: Promise.resolve({ id: "unknown" }) })).status, 404);
    const one = await GET(request(owner.cookie), context), two = await GET(request(owner.cookie), context);
    assert.equal((await GET(request(owner.cookie), context)).status, 429);
    await one.body!.cancel(); await two.body!.cancel();
    const afterCancel = await GET(request(owner.cookie), context); assert.equal(afterCancel.status, 200); await afterCancel.body!.cancel();
    grantAccountAccess(owner.id, "free"); assert.equal((await GET(request(owner.cookie), context)).status, 403, "membership revocation applies immediately");
    grantAccountAccess(free.id, "premium", Date.now() + 60_000); const premium = await GET(request(free.cookie), context); assert.equal(premium.status, 200); await premium.body!.cancel();
    assert.equal(sources.parseBlenderDownloads({ downloadEnabled: false, files: [] }, "x").length, 0);
    assert.equal(sources.parseBlenderDownloads({ downloadEnabled: true, files: [{ resolution: { id: 720 }, size: 3e9, hasVideo: true }] }, "x").length, 0);
    assert.equal(sources.parseArchiveDownloads({ metadata: { nodownload: true }, files: [{ name: "BigBuckBunny_512kb.mp4", size: 43 }] }).length, 0);
    for (const url of ["http://archive.org/file", "https://archive.org.evil.example/file", "https://user:password@archive.org/file", "https://archive.org:8443/file", "file:///etc/passwd"]) assert.equal(sources.isDownloadUrlAllowed(url), false);
    assert(!/[<>:"/\\|?*\x00-\x1f]/.test(downloadFilename('../../bad: title\n', '480p', 'video/webm')));
  } finally {
    globalThis.fetch = realFetch; db.close();
    if (path.dirname(directory) === path.resolve(tmpdir()) && path.basename(directory).startsWith("sidflix-download-test-")) await rm(directory, { recursive: true, force: true });
  }
});
