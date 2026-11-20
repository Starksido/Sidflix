import { ChannelCard, LiveCard, PosterCard, TvChannelCard } from "@/components/cards";
import type { Niche, Title } from "@/lib/catalog";

/** The card style each niche's rail uses. */
export function NicheCards({ niche, items }: { niche: Niche; items: Title[] }) {
  if (niche === "sports") {
    return items.map((item) => item.kind === "tv-channel"
      ? <TvChannelCard key={item.id} channel={item} />
      : item.kind === "live" ? <LiveCard key={item.id} event={item} /> : null);
  }
  if (niche === "gaming") {
    return items
      .filter((t) => t.kind === "channel")
      .map((channel) => <ChannelCard key={channel.id} channel={channel} />);
  }
  return items.map((title) => title.kind === "tv-channel" ? <TvChannelCard key={title.id} channel={title} /> : <PosterCard key={title.id} title={title} />);
}
