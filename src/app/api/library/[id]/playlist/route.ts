import { findLocalMedia } from "@/lib/local-media";
import { mediaDuration, mediaPlaylist } from "@/lib/media-transcode";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const media = await findLocalMedia((await context.params).id);
  if (!media) return new Response("Video not found", { status: 404 });
  try {
    return new Response(mediaPlaylist(media.id, await mediaDuration(media)), {
      headers: { "Content-Type": "application/vnd.apple.mpegurl", "Cache-Control": "private, no-store" },
    });
  } catch {
    return new Response("Could not prepare this video. Check the local file and FFmpeg installation.", { status: 503 });
  }
}
