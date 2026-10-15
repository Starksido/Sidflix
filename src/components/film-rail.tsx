"use client";

import { PosterCard } from "@/components/cards";
import { Rail } from "@/components/rail";
import { isAllowed, nicheHue, type FilmTitle } from "@/lib/catalog";
import { useActiveProfile } from "@/lib/viewer-store";

/**
 * A row of films outside the four niches: your library and the Archive genre rows.
 * Hidden when the active profile can't watch any of them, rather than showing an
 * empty row under its heading.
 */
export function FilmRail({
  id,
  heading,
  description,
  items,
}: {
  id: string;
  heading: string;
  description?: string;
  items: FilmTitle[];
}) {
  const { maxMaturity } = useActiveProfile();
  if (!items.some((t) => isAllowed(t.maturity, maxMaturity))) return null;

  return (
    <Rail id={id} heading={heading} description={description} hue={nicheHue.indie}>
      {items.map((title) => (
        <PosterCard key={title.id} title={title} />
      ))}
    </Rail>
  );
}
