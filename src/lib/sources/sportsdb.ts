import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type { LiveEvent } from "@/lib/catalog";
import { artFromSeed, fetchJson } from "@/lib/sources/util";

// Today's fixtures and live scores from TheSportsDB. Metadata only: video for
// sports comes from rights holders' own embeds, never re-streamed here.
// "123" is TheSportsDB's public free key (a few events per sport per query).

const SPORTS = ["Soccer", "Basketball", "Cricket", "American Football", "Motorsport"];

const NOT_STARTED = new Set(["NS", "Not Started", "TBD", "TBA"]);
const OVER = new Set([
  "FT", "AET", "PEN", "AOT", "Match Finished", "Finished", "CANC", "Cancelled",
  "PST", "Postponed", "ABD", "Abandoned", "AWD", "WO",
]);

type Event = {
  idEvent: string;
  strEvent: string;
  strSport: string;
  strLeague: string;
  strHomeTeam?: string | null;
  strAwayTeam?: string | null;
  intHomeScore?: string | null;
  intAwayScore?: string | null;
  strTimestamp?: string | null;
  strVenue?: string | null;
  strThumb?: string | null;
  strStatus?: string | null;
  strPostponed?: string | null;
};

function toTitle(event: Event, now: number): LiveEvent | null {
  const status = event.strStatus?.trim() ?? "";
  const startsAt = event.strTimestamp ? Date.parse(`${event.strTimestamp}Z`) : NaN;
  if (OVER.has(status) || event.strPostponed === "yes") return null;

  const upcoming = NOT_STARTED.has(status) || (!status && startsAt > now);
  // No status and a past kick-off: state unknown, so leave it out.
  if (!upcoming && !status) return null;

  const home = event.strHomeTeam ?? event.strEvent;
  const away = event.strAwayTeam ?? event.strLeague;
  const hasScore = event.intHomeScore != null && event.intAwayScore != null;
  const time = Number.isFinite(startsAt) ? new Date(startsAt).toISOString().slice(11, 16) : null;

  return {
    id: `tsdb-${event.idEvent}`,
    kind: "live",
    title: event.strEvent,
    niche: "sports",
    maturity: event.strSport === "Fighting" ? "16+" : "all",
    competition: event.strLeague,
    status: upcoming ? (time ? `Starts ${time} UTC` : "Later today") : status,
    isLive: !upcoming,
    score: hasScore ? `${event.intHomeScore}–${event.intAwayScore}` : undefined,
    startsAt: Number.isFinite(startsAt) ? startsAt : undefined,
    synopsis: [event.strLeague, event.strVenue].filter(Boolean).join(" at ") + ".",
    art: {
      from: artFromSeed(home).from,
      to: artFromSeed(away).from,
      image: event.strThumb ? { backdrop: event.strThumb } : undefined,
    },
    source: { label: "TheSportsDB", href: `https://www.thesportsdb.com/event/${event.idEvent}` },
  };
}

/** Live and upcoming events today (UTC), live first. */
export async function getEventsFromSportsDb(limit = 8): Promise<LiveEvent[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("source:sportsdb");

  const key = process.env.SPORTSDB_API_KEY || "123";
  const now = Date.now();
  const day = new Date(now).toISOString().slice(0, 10);

  const results = await Promise.allSettled(
    SPORTS.map((sport) =>
      fetchJson<{ events: Event[] | null }>(
        `https://www.thesportsdb.com/api/v1/json/${key}/eventsday.php?d=${day}&s=${encodeURIComponent(sport)}`,
      ),
    ),
  );
  if (results.every((r) => r.status === "rejected")) throw results[0].reason;

  return results
    .flatMap((r) => (r.status === "fulfilled" ? (r.value.events ?? []) : []))
    .map((e) => toTitle(e, now))
    .filter((t) => t !== null)
    // Live first, then by kick-off.
    .sort(
      (a, b) =>
        Number(b.isLive) - Number(a.isLive) ||
        (a.startsAt ?? Infinity) - (b.startsAt ?? Infinity),
    )
    .slice(0, limit);
}

/**
 * Today's events whose name, teams or league contain the query. Filters the cached
 * fixtures: the free key's event search mostly returns finished matches.
 */
export async function searchTodaysEvents(query: string): Promise<LiveEvent[]> {
  const needle = query.toLowerCase();
  const events = await getEventsFromSportsDb(40);
  return events.filter((e) =>
    [e.title, e.competition].some((text) => text.toLowerCase().includes(needle)),
  );
}
