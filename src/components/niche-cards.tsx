import { ChannelCard, LiveCard, PosterCard } from "@/components/cards";
import type { Niche, Title } from "@/lib/catalog";

/** The card style each niche's rail uses. */
export function NicheCards({ niche, items }: { niche: Niche; items: Title[] }) {
  if (niche === "sports") {
    return items
      .filter((t) => t.kind === "live")
      .map((event) => <LiveCard key={event.id} event={event} />);
  }
  if (niche === "gaming") {
    return items
      .filter((t) => t.kind === "channel")
      .map((channel) => <ChannelCard key={channel.id} channel={channel} />);
  }
  return items.map((title) => <PosterCard key={title.id} title={title} />);
}
