"use client";

import { ContinueCard, RankedCard } from "@/components/cards";
import { useCatalog } from "@/components/catalog-provider";
import { Rail } from "@/components/rail";
import { isAllowed } from "@/lib/catalog";
import { useActiveProfile, useViewerState } from "@/lib/viewer-store";

export function ContinueWatchingRow() {
  const { getTitle } = useCatalog();
  const { watching } = useViewerState();
  const profile = useActiveProfile();
  const entries = (watching[profile.id] ?? [])
    .flatMap((entry) => {
      // The saved snapshot covers titles the home catalogue no longer has, e.g. from search.
      const title = getTitle(entry.titleId) ?? entry.title;
      return title ? [{ entry, title }] : [];
    })
    .filter(({ title }) => isAllowed(title.maturity, profile.maxMaturity));

  const heading = `Continue watching for ${profile.name}`;

  if (entries.length === 0) {
    return (
      <section aria-labelledby="continue-heading" className="px-gutter">
        <h2 id="continue-heading" className="font-display text-xl font-semibold tracking-tight md:text-2xl">
          {heading}
        </h2>
        <p className="text-fg-muted border-line mt-3 max-w-md rounded-lg border border-dashed px-4 py-5 text-sm">
          Nothing in progress. Start any film or episode and it will wait for you here.
        </p>
      </section>
    );
  }

  return (
    <Rail id="continue" heading={heading}>
      {entries.map(({ entry, title }) => (
        <ContinueCard key={entry.titleId} entry={entry} title={title} />
      ))}
    </Rail>
  );
}

export function TopTenRow() {
  const { getTitle, topTen } = useCatalog();
  const profile = useActiveProfile();
  const ranked = topTen
    .map((id) => getTitle(id))
    .filter((title) => title !== undefined)
    .filter((title) => isAllowed(title.maturity, profile.maxMaturity));

  return (
    <Rail
      id="top-ten"
      heading={profile.isKids ? "Most watched by kids today" : "Top 10 today"}
      gapClassName="gap-3 md:gap-5"
    >
      {ranked.map((title, i) => (
        <RankedCard key={title.id} title={title} rank={i + 1} />
      ))}
    </Rail>
  );
}
