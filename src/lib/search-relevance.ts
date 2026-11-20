import type { Title } from "@/lib/catalog";

export function readSearchSignals(data: Record<string, unknown>): NonNullable<Title["searchSignals"]> {
  const number = (value: unknown, max: number) => typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= max ? value : 0;
  return { popularity: number(data.popularity, 1_000_000), rating: number(data.vote_average, 10), votes: Number.isSafeInteger(data.vote_count) ? number(data.vote_count, 1_000_000_000) : 0 };
}

function audienceScore(title: Title): number {
  const signals = title.searchSignals;
  if (!signals) return 0;
  const { popularity, rating, votes } = readSearchSignals({ popularity: signals.popularity, vote_average: signals.rating, vote_count: signals.votes });
  // Dampen huge counts and shrink small-sample ratings toward a neutral 6.5/10.
  // A 10/10 with one vote shouldn't displace a well-established, well-rated title.
  const ratingLift = rating > 0 ? (rating - 6.5) * votes / (votes + 250) : 0;
  return 1.5 * Math.log1p(popularity) + 0.6 * Math.log1p(votes) + 2 * ratingLift;
}

/** Articles and punctuation shouldn't bury a show when its familiar name is used. */
export function searchTitleKey(text: string): string {
  return text.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase()
    .replace(/[’']/g, "").replace(/[^\p{L}\p{N}]+/gu, " ").trim()
    .replace(/^(?:the|an|a)\s+/, "");
}

export function titleMatchRank(title: string, query: string): number {
  const name = searchTitleKey(title), phrase = searchTitleKey(query);
  if (!phrase) return 5;
  if (name === phrase) return 0;
  if (name.startsWith(`${phrase} `)) return 1;
  if (` ${name} `.includes(` ${phrase} `)) return 2;
  const terms = phrase.split(" "), words = name.split(" ");
  if (terms.every(term => words.includes(term))) return 3;
  if (terms.every(term => name.includes(term))) return 4;
  return 5;
}

function formatRank(title: Title): number {
  if (title.kind === "series") return 0;
  if (title.kind === "film") return title.episode || title.remote?.mediaType === "tv" ? 3 : 1;
  return 2;
}

function detailRank(title: Title): number {
  // Prefer an identified catalogue entry over a bare provider record on equal matches.
  return Number((title.kind === "series" || title.kind === "film") && title.year === null)
    + Number(!title.art.image?.poster)
    + Number(title.kind === "series" && title.seasons === 0);
}

/** Relevance first, then audience interest and reliable ratings; stable for equal results. */
export function rankSearchResults(items: readonly Title[], query: string): Title[] {
  if (!searchTitleKey(query)) return [...items];
  return items.map((title, index) => ({ title, index, match: titleMatchRank(title.title, query), episode: Number(title.kind === "film" && Boolean(title.episode || title.remote?.mediaType === "tv")), audience: audienceScore(title), format: formatRank(title), detail: detailRank(title) }))
    .sort((a, b) => a.match - b.match || a.episode - b.episode || b.audience - a.audience || a.format - b.format || a.detail - b.detail || a.index - b.index)
    .map(item => item.title);
}
