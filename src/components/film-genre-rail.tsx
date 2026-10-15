"use client";

import { PosterCard } from "@/components/cards";
import { Rail } from "@/components/rail";
import { filmGenres, isAllowed, nicheHue, type FilmGenre, type FilmTitle } from "@/lib/catalog";
import { useActiveProfile } from "@/lib/viewer-store";

/**
 * One genre row of Archive films. Hidden when the active profile can't watch any of
 * them (Archive films are unrated, so kids profiles see none), rather than showing an
 * empty row under its heading.
 */
export function FilmGenreRail({ genre, items }: { genre: FilmGenre; items: FilmTitle[] }) {
  const { maxMaturity } = useActiveProfile();
  if (!items.some((t) => isAllowed(t.maturity, maxMaturity))) return null;

  const { heading, description } = filmGenres[genre];
  return (
    <Rail id={`indie-${genre}`} heading={heading} description={description} hue={nicheHue.indie}>
      {items.map((title) => (
        <PosterCard key={title.id} title={title} />
      ))}
    </Rail>
  );
}
