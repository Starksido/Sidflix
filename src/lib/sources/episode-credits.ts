import "server-only";
import { cacheLife } from "next/cache";
import { parseCreditMarker } from "@/lib/episode-credits";
import { positiveId, record } from "@/lib/online-shows";
import { requestTmdb } from "@/lib/sources/online-shows";

export async function getEpisodeCredits(id: number, season: number, episode: number) {
  "use cache";
  cacheLife("hours");
  try {
    const external = record(await requestTmdb(`tv/${positiveId(id)}/external_ids`));
    const imdb = external.imdb_id;
    if (typeof imdb !== "string" || !/^tt[0-9]{7,8}$/.test(imdb) || season < 1) return null;
    const query = new URLSearchParams({ imdb_id: imdb, season: String(season), episode: String(episode) });
    const response = await fetch(`https://api.introdb.app/segments?${query}`, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) return null;
    return parseCreditMarker(await response.json(), imdb, season, episode);
  } catch {
    // Missing markers or an offline service must never prevent playback.
    return null;
  }
}
