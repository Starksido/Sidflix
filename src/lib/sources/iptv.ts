import "server-only";
import sportsSnapshot from "../../../data/sports-channels.json";
import movieSnapshot from "../../../data/movie-channels.json";
import type { TvChannel } from "@/lib/catalog";
import { publicStreamUrl } from "@/lib/iptv-playlist";

type Snapshot = { channels: { id: string; name: string; country: string; language: string; urls: string[]; logo?: string; checkedAt: string }[] };

function channelsFromSnapshot(snapshot: Snapshot, category: TvChannel["category"]): TvChannel[] {
  return snapshot.channels.flatMap((channel) => {
    const streamUrls = channel.urls.filter((url) => publicStreamUrl(url) !== null);
    if (!streamUrls.length) return [];
    return [{
      id: channel.id, title: channel.name, kind: "tv-channel", category, niche: category === "movies" ? "indie" : "sports",
      // Continuous broadcasts have no reliable per-programme age rating.
      maturity: "16+", synopsis: `${channel.name} · ${channel.language}. ${category === "movies" ? "Movies broadcast on a continuous TV schedule." : "Sports events, replays and highlights."} Availability depends on the broadcaster and your region.`,
      art: { from: category === "movies" ? "#743a28" : "#145344", to: "#111e30" },
      streamUrls, country: channel.country, language: channel.language,
      logo: channel.logo, checkedAt: channel.checkedAt,
      source: { label: "iptv-org", href: "https://github.com/iptv-org/iptv" },
    } satisfies TvChannel];
  });
}

export function getSportsChannels(): TvChannel[] {
  return channelsFromSnapshot(sportsSnapshot, "sports");
}

export function getMovieChannels(): TvChannel[] {
  return channelsFromSnapshot(movieSnapshot, "movies");
}

export function getLiveTvChannels(): TvChannel[] {
  return [...getMovieChannels(), ...getSportsChannels()];
}
