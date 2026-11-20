import { downloadAccess, downloadPrivateHeaders } from "@/lib/download-access";
import { DOWNLOAD_TITLES, downloadFilename } from "@/lib/download-catalog";
import { fetchDownloadSource, MAX_DOWNLOAD_BYTES, resolveDownloadVariants } from "@/lib/sources/downloads";
import { parseByteRange } from "@/lib/media-range";

type Context = { params: Promise<{ id: string }> };
const active = new Map<string, number>();
async function serve(request: Request, context: Context, head = false) {
  const access = await downloadAccess(request); if (access.response) return access.response;
  if (request.headers.get("sec-fetch-site") === "cross-site") return Response.json({ error: "Open downloads in Sidflix to continue." }, { status: 403, headers: downloadPrivateHeaders });
  const { id } = await context.params, title = DOWNLOAD_TITLES.find(item => item.id === id);
  if (!title) return Response.json({ error: "Download not found." }, { status: 404, headers: downloadPrivateHeaders });
  let release = () => {}, detach = () => {};
  try {
    const variants = await resolveDownloadVariants(id), variantId = new URL(request.url).searchParams.get("quality"), variant = variants.find(item => item.id === variantId);
    if (!variant) return Response.json({ error: "This download quality is unavailable." }, { status: 404, headers: downloadPrivateHeaders });
    const range = request.headers.get("range"), parsed = range ? parseByteRange(range, variant.bytes) : null;
    if (range && !parsed) return new Response(null, { status: 416, headers: { ...downloadPrivateHeaders, "Content-Range": `bytes */${variant.bytes}` } });
    if ((active.get(access.accountId) ?? 0) >= 2) return Response.json({ error: "Please wait for another download to finish." }, { status: 429, headers: downloadPrivateHeaders });
    active.set(access.accountId, (active.get(access.accountId) ?? 0) + 1);
    let released = false;
    release = () => { if (released) return; released = true; const n = (active.get(access.accountId) ?? 1) - 1; if (n) active.set(access.accountId, n); else active.delete(access.accountId); };
    const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 30_000);
    const abort = () => { controller.abort(); release(); };
    request.signal.addEventListener("abort", abort, { once: true });
    detach = () => request.signal.removeEventListener("abort", abort);
    if (request.signal.aborted) controller.abort();
    let upstream: Response;
    try {
      const ifRange = request.headers.get("if-range");
      upstream = await fetchDownloadSource(variant.url, { method: head ? "HEAD" : "GET", signal: controller.signal,
        headers: { "Accept-Encoding": "identity", ...(parsed ? { Range: `bytes=${parsed.start}-${parsed.end}` } : {}), ...(ifRange && ifRange.length < 256 ? { "If-Range": ifRange } : {}) } });
    } finally { clearTimeout(timeout); }
    const cleanup = () => { release(); detach(); };
    if (![200, 206].includes(upstream.status)) { await upstream.body?.cancel(); cleanup(); return Response.json({ error: "The download couldn’t connect. Please try again." }, { status: 502, headers: downloadPrivateHeaders }); }
    const type = upstream.headers.get("content-type")?.split(";")[0].trim();
    if (type && ![variant.mime, "application/octet-stream", "binary/octet-stream"].includes(type)) { await upstream.body?.cancel(); cleanup(); throw new Error("Unexpected download type"); }
    const length = Number(upstream.headers.get("content-length")), contentRange = upstream.headers.get("content-range");
    if (!Number.isSafeInteger(length) || length <= 0 || length > MAX_DOWNLOAD_BYTES || upstream.status === 200 && length !== variant.bytes || upstream.status === 206 && (!parsed || contentRange !== `bytes ${parsed.start}-${parsed.end}/${variant.bytes}` || length !== parsed.end - parsed.start + 1)) {
      await upstream.body?.cancel(); cleanup(); throw new Error("Unexpected download length");
    }
    const filename = downloadFilename(title.title, variant.label, variant.mime);
    const headers = new Headers({ ...downloadPrivateHeaders, "Content-Type": variant.mime, "Content-Length": String(length), "Accept-Ranges": "bytes",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}` });
    if (contentRange && upstream.status === 206) headers.set("Content-Range", contentRange);
    for (const key of ["etag", "last-modified"]) { const value = upstream.headers.get(key); if (value) headers.set(key, value); }
    if (head || !upstream.body) { cleanup(); return new Response(null, { status: upstream.status, headers }); }
    const reader = upstream.body.getReader(); let received = 0;
    const body = new ReadableStream<Uint8Array>({
      async pull(stream) {
        try {
          const { value, done } = await reader.read();
          if (done) { if (received !== length) throw new Error("Download ended early"); cleanup(); stream.close(); }
          else { received += value.byteLength; if (received > length) throw new Error("Download exceeded its length"); stream.enqueue(value); }
        } catch (error) { controller.abort(); cleanup(); stream.error(error); }
      },
      async cancel() { controller.abort(); cleanup(); await reader.cancel().catch(() => {}); },
    });
    return new Response(body, { status: upstream.status, headers });
  } catch { release(); detach(); return Response.json({ error: "This download is temporarily unavailable. Please try again." }, { status: 502, headers: downloadPrivateHeaders }); }
}
export function GET(request: Request, context: Context) { return serve(request, context); }
export function HEAD(request: Request, context: Context) { return serve(request, context, true); }
