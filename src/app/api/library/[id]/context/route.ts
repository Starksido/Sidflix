import { findLocalMedia, getLocalMedia } from "@/lib/local-media";
import { groupLibrary } from "@/lib/library-groups";
import { subtitleTracks } from "@/lib/media-subtitles";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const media = await findLocalMedia((await context.params).id);
  if (!media) return new Response("Video not found", { status: 404 });
  const series = media.title.episode
    ? groupLibrary((await getLocalMedia()).map((file) => file.title)).find((title) => title.id === media.title.episode!.seriesId)
    : null;
  return Response.json({
    episodes: series?.kind === "series" ? series.episodes?.map((episode) =>
      episode.episode?.season === media.title.episode?.season && episode.episode?.number === media.title.episode?.number
        ? media.title : episode) : [],
    subtitles: await subtitleTracks(media).catch(() => []),
  }, { headers: { "Cache-Control": "private, no-store" } });
}
