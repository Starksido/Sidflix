import { findLocalMedia } from "@/lib/local-media";
import { MediaBusyError, transcodeSegment } from "@/lib/media-transcode";

export async function GET(_request: Request, context: { params: Promise<{ id: string; segment: string }> }) {
  const { id, segment } = await context.params;
  if (!/^\d{1,7}$/.test(segment)) return new Response("Segment not found", { status: 404 });
  const media = await findLocalMedia(id);
  if (!media) return new Response("Video not found", { status: 404 });
  try {
    const data = await transcodeSegment(media, Number(segment));
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": "video/mp2t", "Content-Length": String(data.length),
        "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof RangeError) return new Response("Segment not found", { status: 404 });
    return new Response(error instanceof MediaBusyError ? "Player busy; retry shortly" : "Video conversion failed", {
      status: 503, headers: { "Retry-After": "2" },
    });
  }
}
