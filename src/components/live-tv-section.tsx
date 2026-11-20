"use client";

import { useState } from "react";
import { TvChannelCard } from "@/components/cards";
import { Rail } from "@/components/rail";
import { isAllowed, type TvChannel } from "@/lib/catalog";
import { useActiveProfile } from "@/lib/viewer-store";

const categories = [{ id: "movies", label: "Movies" }, { id: "sports", label: "Sports" }, { id: "all", label: "All channels" }] as const;

export function LiveTvSection({ channels }: { channels: TvChannel[] }) {
  const [category, setCategory] = useState<"all" | TvChannel["category"]>("movies");
  const [query, setQuery] = useState("");
  const profile = useActiveProfile();
  const allowed = channels.filter((channel) => isAllowed(channel.maturity, profile.maxMaturity));
  const visible = allowed.filter((channel) => (category === "all" || channel.category === category) &&
    `${channel.title} ${channel.language} ${channel.country}`.toLowerCase().includes(query.trim().toLowerCase()));
  if (!allowed.length) return null;

  return (
    <Rail id="live-tv" heading="Live TV" hue="var(--color-accent)"
      description="Movie channels, sports and more. Tune in to what’s playing now."
      controls={<div className="flex flex-wrap items-center gap-3">
        <div role="group" aria-label="Live TV category" className="flex flex-wrap gap-2">
          {categories.map((item) => <button key={item.id} onClick={() => setCategory(item.id)} aria-pressed={category === item.id}
            className="rounded-full bg-white/10 px-4 py-2 text-sm text-fg-muted transition-colors hover:bg-white/15 aria-pressed:bg-accent aria-pressed:text-accent-ink">
            {item.label}
          </button>)}
        </div>
        <input type="search" aria-label="Search Live TV" placeholder="Find a channel" value={query} onChange={(event) => setQuery(event.target.value)}
          className="ml-auto w-full rounded-full bg-white/5 px-4 py-2 text-sm ring-1 ring-white/15 placeholder:text-fg-subtle focus:ring-accent focus:outline-none sm:w-56" />
      </div>}>
      {visible.map((channel) => <TvChannelCard key={channel.id} channel={channel} />)}
      {!visible.length && <li className="w-full rounded-lg bg-white/5 px-5 py-8 text-sm text-fg-muted" role="status">
        No channels match this search.
        <button onClick={() => { setQuery(""); setCategory("all"); }} className="ml-3 text-accent underline underline-offset-4">Show all channels</button>
      </li>}
    </Rail>
  );
}
