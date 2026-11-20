import { open } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { findLocalMedia } from "@/lib/local-media";
import { parseByteRange } from "@/lib/media-range";

const mime: Record<string, string> = {
  ".mp4": "video/mp4", ".m4v": "video/mp4", ".webm": "video/webm", ".mkv": "video/x-matroska",
  ".mov": "video/quicktime", ".avi": "video/x-msvideo", ".wmv": "video/x-ms-wmv", ".ts": "video/mp2t",
};
type Context = { params: Promise<{ id: string }> };

async function serve(request: Request, context: Context, head: boolean) {
  const media = await findLocalMedia((await context.params).id);
  if (!media) return new Response("Video not found", { status: 404 });
  const file = await open(media.path, "r").catch(() => null);
  if (!file) return new Response("Video not found", { status: 404 });
  let streaming = false;
  try {
    const { size } = await file.stat();
    const headers = new Headers({
      "Content-Type": mime[path.extname(media.path).toLowerCase()] ?? "application/octet-stream",
      "Accept-Ranges": "bytes", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff",
    });
    const rawRange = request.headers.get("range");
    const range = rawRange ? parseByteRange(rawRange, size) : null;
    if (rawRange && !range) {
      headers.set("Content-Range", `bytes */${size}`);
      return new Response(null, { status: 416, headers });
    }
    const start = range?.start ?? 0;
    const end = range?.end ?? size - 1;
    headers.set("Content-Length", String(range ? end - start + 1 : size));
    if (range) headers.set("Content-Range", `bytes ${start}-${end}/${size}`);
    if (head || size === 0) return new Response(null, { status: range ? 206 : 200, headers });
    const stream = file.createReadStream({ start, end, autoClose: true });
    streaming = true;
    return new Response(Readable.toWeb(stream) as ReadableStream<Uint8Array>, {
      status: range ? 206 : 200, headers,
    });
  } finally {
    if (!streaming) await file.close();
  }
}

export async function GET(request: Request, context: Context) { return serve(request, context, false); }
export async function HEAD(request: Request, context: Context) { return serve(request, context, true); }
