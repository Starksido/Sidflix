import { findLocalMedia } from "@/lib/local-media";
import { subtitleContent } from "@/lib/media-subtitles";

export async function GET(_request: Request, context: { params: Promise<{ id: string; track: string }> }) {
  const { id, track } = await context.params;
  if (!/^(?:embedded-\d{1,4}|sidecar-[a-f0-9]{16})$/.test(track)) return new Response("Subtitles not found", { status: 404 });
  const media = await findLocalMedia(id);
  if (!media) return new Response("Video not found", { status: 404 });
  try {
    const content = await subtitleContent(media, track);
    return content === null ? new Response("Subtitles not found", { status: 404 }) : new Response(content, {
      headers: { "Content-Type": "text/vtt; charset=utf-8", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" },
    });
  } catch {
    return new Response("Could not load these subtitles", { status: 503 });
  }
}
