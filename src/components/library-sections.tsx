"use client";

import { useSyncExternalStore } from "react";
import { FilmRail } from "@/components/film-rail";
import type { FilmTitle, SeriesTitle } from "@/lib/catalog";
import { isRecentlyAdded } from "@/lib/library-groups";

const subscribeClock = (callback: () => void) => {
  const timer = window.setInterval(callback, 30_000);
  return () => window.clearInterval(timer);
};
const minute = () => Math.ceil(Date.now() / 30_000) * 30_000;

export function LibrarySections({ items, initialNow }: {
  items: (FilmTitle | SeriesTitle)[]; initialNow: number;
}) {
  const now = useSyncExternalStore(subscribeClock, minute, () => initialNow);
  const recent = items.filter((item) => isRecentlyAdded(item.addedAt, now))
    .sort((a, b) => (b.addedAt ?? 0) - (a.addedAt ?? 0) || a.title.localeCompare(b.title));
  const movies = items.filter((item) => item.kind === "film");
  const shows = items.filter((item) => item.kind === "series");
  if (!items.length) return null;
  return (
    <div id="library" className="flex scroll-mt-24 flex-col gap-10 md:gap-14">
      {recent.length > 0 && <FilmRail id="recently-added" heading="Recently added"
        description="Fresh arrivals from the last 7 days." items={recent} />}
      {shows.length > 0 && <FilmRail id="your-shows" heading="TV shows"
        description="Pick a show. Choose a season. Find your next episode." items={shows} />}
      {movies.length > 0 && <FilmRail id="your-movies" heading="Movies"
        description="Your movie collection, ready when you are." items={movies} />}
    </div>
  );
}
