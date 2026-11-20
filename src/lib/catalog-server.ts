import "server-only";
import { cacheLife } from "next/cache";
import {
  demoTitles,
  filmGenreOrder,
  titlesInNiche,
  topTen as demoTopTen,
  type FilmTitle,
  type HomeCatalog,
  type Niche,
  type Title,
} from "@/lib/catalog";
import { getArchiveGenre, getFilmsFromArchive } from "@/lib/sources/archive";
import { getLibraryFilms } from "@/lib/sources/library";
import { getEventsFromSportsDb } from "@/lib/sources/sportsdb";
import { getAnimeFromTmdb } from "@/lib/sources/tmdb";
import { groupLibrary } from "@/lib/library-groups";
import { getLiveTvChannels } from "@/lib/sources/iptv";
import { getOnlineMovies } from "@/lib/sources/online-movies";
import { SHOW_LOCAL_LIBRARY } from "@/lib/library-visibility";

/**
 * Runs a source; null when it is unconfigured, empty or failing, so the home page's
 * niche uses demo titles. Failures are logged and reported through `onFail`.
 */
export async function settle<T>(
  name: string,
  load: () => Promise<T[] | null>,
  onFail?: () => void,
): Promise<T[] | null> {
  try {
    const items = await load();
    return items?.length ? items : null;
  } catch (error) {
    console.warn(`[catalog] ${name} unavailable:`, error instanceof Error ? error.message : error);
    onFail?.();
    return null;
  }
}

/** Fewest films a genre row needs to be worth showing. */
const MIN_GENRE_ROW = 4;

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

  const [library, anime, films, events, onlineMovies, ...genreFilms] = await Promise.all([
    // Keep the configured paths, but do not scan/serialize a library hidden from browsing.
    SHOW_LOCAL_LIBRARY ? settle("Your library", () => getLibraryFilms()) : Promise.resolve(null),
    settle("TMDB", () => getAnimeFromTmdb()),
    settle("Internet Archive", () => getFilmsFromArchive()),
    settle("TheSportsDB", () => getEventsFromSportsDb()),
    settle("Featured movies", async () => (await getOnlineMovies(1, "popular", "")).items),
    ...filmGenreOrder.map((genre) => settle(`Internet Archive (${genre})`, () => getArchiveGenre(genre))),
  ]);

  // The Blender open movies stay in the indie rail: they're the titles with trailers.
  const openMovies = demoTitles.filter((t) => t.id === "sintel" || t.id === "big-buck-bunny");

  const rails: Record<Niche, Title[]> = {
    anime: anime ?? [],
    sports: events ?? [],
    indie: films ? [...openMovies, ...films] : titlesInNiche("indie"),
    gaming: [],
  };

  // Genre rows skip films already shown above them, so the page doesn't repeat itself,
  // and drop out when too few films are left to fill a row.
  const shown = new Set(rails.indie.map((t) => t.id));
  const genreRails: HomeCatalog["genreRails"] = [];
  filmGenreOrder.forEach((genre, i) => {
    const items: FilmTitle[] = (genreFilms[i] ?? []).filter((t) => !shown.has(t.id)).slice(0, 12);
    if (items.length < MIN_GENRE_ROW) return;
    for (const t of items) shown.add(t.id);
    genreRails.push({ genre, items });
  });

  // Render real catalogue features in the initial HTML, before browser hydration.
  // The original Blender demo trailers must never act as a loading placeholder.
  const liveTv = getLiveTvChannels();
  const featureMovies = (onlineMovies ?? []).filter(title => title.art.image?.backdrop).slice(0, 5);
  const leads = [rails.anime[0], liveTv[0]]
    .filter((t) => t !== undefined)
    .map((t) => ({ id: t.id }));
  const featured = featureMovies.length ? featureMovies.map(title => ({ id: title.id })) : leads;

  // Ranked by each source's own popularity signal when live data exists.
  const topTen =
    anime || films
      ? interleave(rails.anime, films ?? rails.indie).slice(0, 10).map((t) => t.id)
      : [...demoTopTen];

  const titles = new Map<string, Title>();
  const genreTitles = genreRails.flatMap((row) => row.items);
  for (const title of [...(library ?? []), ...featureMovies, ...liveTv, ...Object.values(rails).flat(), ...genreTitles, ...demoTitles]) {
    if (!titles.has(title.id)) titles.set(title.id, title);
  }

  const groupedLibrary = groupLibrary(library ?? []);
  for (const title of groupedLibrary) titles.set(title.id, title);
  return { generatedAt: Date.now(), rails, featured, topTen, library: groupedLibrary, liveTv, genreRails, titles: [...titles.values()] };
}
