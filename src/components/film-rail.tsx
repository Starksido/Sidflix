"use client";

import { FeatureRail } from "@/components/feature-rail";
import { isAllowed, type FilmTitle, type SeriesTitle } from "@/lib/catalog";
import { useActiveProfile } from "@/lib/viewer-store";

/**
 * A row of films outside the four niches: your library and the Archive genre rows.
 * Hidden when the active profile can't watch any of them, rather than showing an
 * empty row under its heading.
 */
export function FilmRail({
  id,
  heading,
  items,
}: {
  id: string;
  heading: string;
  description?: string;
  items: (FilmTitle | SeriesTitle)[];
}) {
  const { maxMaturity } = useActiveProfile();
  if (!items.some((t) => isAllowed(t.maturity, maxMaturity))) return null;

  return (
    <FeatureRail id={id} heading={heading} items={items} />
  );
}
