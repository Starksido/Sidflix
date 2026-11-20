export type ArtworkCandidate = {
  id: number; title?: string; name?: string; original_title?: string; original_name?: string;
  release_date?: string; first_air_date?: string; poster_path?: string | null; backdrop_path?: string | null;
  popularity?: number;
};

export function artworkQuery(title: string): { query: string; preferredYear?: number } {
  if (/^the office(?: extended cut)?$/i.test(title)) return { query: "The Office", preferredYear: 2005 };
  if (/^f1(?: the movie)?$/i.test(title)) return { query: "F1" };
  if (/^the fantastic four first steps$/i.test(title)) return { query: "The Fantastic 4: First Steps" };
  return { query: title.replace(/\s+(?:extended cut|directors? cut)$/i, "").trim() };
}

function normalized(title: string): string {
  return title.toLowerCase().normalize("NFKD").replace(/[^\p{L}\p{N}]/gu, "");
}

/** Require a title match and prefer the right year to avoid posters for remakes. */
export function chooseArtwork(candidates: ArtworkCandidate[], title: string, year: number | null): ArtworkCandidate | null {
  const query = artworkQuery(title);
  const wantedYear = query.preferredYear ?? year;
  const wantedTitle = normalized(query.query);
  const matches = candidates.filter((candidate) => candidate.poster_path &&
    [candidate.title, candidate.name, candidate.original_title, candidate.original_name]
      .some((name) => name && normalized(name) === wantedTitle));
  const dated = wantedYear ? matches.filter((candidate) =>
    Number((candidate.release_date ?? candidate.first_air_date)?.slice(0, 4)) === wantedYear) : matches;
  return (dated.length ? dated : wantedYear ? [] : matches)
    .sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))[0] ?? null;
}
