"use client";

import { isAllowed, type Maturity } from "@/lib/catalog";
import { useActiveProfile } from "@/lib/viewer-store";

/** Shown when a search found titles but none suit the active profile. */
export function SearchEmpty({ maturities, query }: { maturities: Maturity[]; query: string }) {
  const profile = useActiveProfile();
  if (maturities.some((m) => isAllowed(m, profile.maxMaturity))) return null;
  return (
    <p className="text-fg-muted px-gutter text-sm">
      Nothing for &ldquo;{query}&rdquo; is available on {profile.name}&rsquo;s profile.
    </p>
  );
}
