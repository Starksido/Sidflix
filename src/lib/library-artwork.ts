import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { FilmTitle } from "@/lib/catalog";

export type LibraryArtwork = {
  poster: string;
  backdrop?: string;
  tmdbId: number;
  mediaType: "movie" | "tv";
  matchedTitle: string;
  year: number | null;
  source: string;
};

/** Read locally downloaded artwork without adding any network work to folder scanning. */
export async function addLibraryArtwork(films: FilmTitle[]): Promise<FilmTitle[]> {
  let entries: Record<string, LibraryArtwork>;
  try {
    entries = JSON.parse(await readFile(path.join(process.cwd(), "data", "library-artwork.json"), "utf8"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") console.warn("[library] could not read artwork cache");
    return films;
  }
  return films.map((film) => {
    const artwork = entries[film.episode?.seriesId ?? film.id];
    if (!artwork?.poster?.startsWith("/media-artwork/")) return film;
    return { ...film, art: { ...film.art, image: { poster: artwork.poster, backdrop: artwork.backdrop } } };
  });
}
