import "server-only";
import { cacheLife } from "next/cache";
import {
  demoTitles,
  featured as demoFeatured,
  titlesInNiche,
  topTen as demoTopTen,
  type HomeCatalog,
  type Niche,
  type Title,
} from "@/lib/catalog";
import { getFilmsFromArchive } from "@/lib/sources/archive";
import { getEventsFromSportsDb } from "@/lib/sources/sportsdb";
import { getAnimeFromTmdb } from "@/lib/sources/tmdb";
import { getChannelsFromTwitch } from "@/lib/sources/twitch";

/** Runs a source; null when it is unconfigured, empty or failing, so its niche uses demo titles. */
async function settle<T>(name: string, load: () => Promise<T[] | null>): Promise<T[] | null> {
  try {
    const items = await load();
    return items?.length ? items : null;
  } catch (error) {
    console.warn(`[catalog] ${name} unavailable, showing demo titles:`, error instanceof Error ? error.message : error);
    return null;
  }
}

function interleave<T>(a: readonly T[], b: readonly T[]): T[] {
  const out: T[] = [];
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (i < a.length) out.push(a[i]);
    if (i < b.length) out.push(b[i]);
  }
  return out;
}

export async function getHomeCatalog(): Promise<HomeCatalog> {
  "use cache";
  // Bounds how long a failed source keeps its niche on demo titles.
  cacheLife("minutes");

  const [anime, films, events, channels] = await Promise.all([
    settle("TMDB", () => getAnimeFromTmdb()),
    settle("Internet Archive", () => getFilmsFromArchive()),
    settle("TheSportsDB", () => getEventsFromSportsDb()),
    settle("Twitch", () => getChannelsFromTwitch()),
  ]);

  // The Blender open movies stay in the indie rail: they're the titles with trailers.
  const openMovies = demoTitles.filter((t) => t.id === "sintel" || t.id === "big-buck-bunny");

  const rails: Record<Niche, Title[]> = {
    anime: anime ?? titlesInNiche("anime"),
    sports: events ?? titlesInNiche("sports"),
    indie: films ? [...openMovies, ...films] : titlesInNiche("indie"),
    gaming: channels ?? titlesInNiche("gaming"),
  };

  // Billboard: the trailers first and last, each other niche's lead title between.
  const [firstTrailer, ...otherTrailers] = demoFeatured.filter((f) => f.trailer);
  const leads = [rails.anime[0], rails.sports[0], rails.gaming[0]]
    .filter((t) => t !== undefined)
    .map((t) => ({ id: t.id }));
  const featured = [firstTrailer, ...leads, ...otherTrailers];

  // Ranked by each source's own popularity signal when live data exists.
  const topTen =
    anime || films
      ? interleave(rails.anime, films ?? rails.indie).slice(0, 10).map((t) => t.id)
      : [...demoTopTen];

  const titles = new Map<string, Title>();
  for (const title of [...Object.values(rails).flat(), ...demoTitles]) {
    if (!titles.has(title.id)) titles.set(title.id, title);
  }

  return { rails, featured, topTen, titles: [...titles.values()] };
}
