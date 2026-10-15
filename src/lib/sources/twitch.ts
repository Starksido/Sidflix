import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type { Channel } from "@/lib/catalog";
import { artFromSeed, clip, fetchJson } from "@/lib/sources/util";

// Live channels from the Twitch Helix API. Playback goes through Twitch's
// official embed player, never a re-stream.

// Categories a family storefront shouldn't promote, mature flag or not.
const EXCLUDED_GAMES = new Set(["Slots", "Virtual Casino", "Poker"]);

type Stream = {
  user_login: string;
  user_name: string;
  game_name: string;
  title: string;
  viewer_count: number;
  thumbnail_url: string;
  is_mature: boolean;
};

// Reads the secret itself rather than taking it as an argument, so it never
// becomes part of a cache key.
async function getAppToken(): Promise<string> {
  "use cache";
  // App tokens last about 60 days; refresh well before that.
  cacheLife("days");

  const url = new URL("https://id.twitch.tv/oauth2/token");
  url.searchParams.set("client_id", process.env.TWITCH_CLIENT_ID ?? "");
  url.searchParams.set("client_secret", process.env.TWITCH_CLIENT_SECRET ?? "");
  url.searchParams.set("grant_type", "client_credentials");
  const { access_token } = await fetchJson<{ access_token: string }>(url.toString(), {
    method: "POST",
  });
  return access_token;
}

function isPromotable(stream: Stream): boolean {
  return !stream.is_mature && !EXCLUDED_GAMES.has(stream.game_name);
}

function toTitle(stream: Stream): Channel {
  return {
    id: `twitch-${stream.user_login}`,
    kind: "channel",
    title: clip(stream.title, 50) || stream.user_name,
    niche: "gaming",
    // Twitch's own minimum age is 13; mature-flagged streams are filtered out.
    maturity: "13+",
    game: stream.game_name || "Just Chatting",
    host: stream.user_name,
    viewers: stream.viewer_count,
    twitchLogin: stream.user_login,
    synopsis: clip(stream.title, 160),
    art: {
      ...artFromSeed(stream.user_login),
      image: {
        backdrop: stream.thumbnail_url.replace("{width}", "640").replace("{height}", "360"),
      },
    },
    source: { label: "Twitch", href: `https://www.twitch.tv/${stream.user_login}` },
  };
}

/** Most-watched English live channels, or null when Twitch credentials are not set. */
export async function getChannelsFromTwitch(limit = 10): Promise<Channel[] | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag("source:twitch");

  const clientId = process.env.TWITCH_CLIENT_ID;
  if (!clientId || !process.env.TWITCH_CLIENT_SECRET) return null;

  const token = await getAppToken();
  const { data } = await fetchJson<{ data: Stream[] }>(
    "https://api.twitch.tv/helix/streams?type=live&language=en&first=40",
    { headers: { "Client-Id": clientId, Authorization: `Bearer ${token}` } },
  );

  return data.filter(isPromotable).slice(0, limit).map(toTitle);
}

/** Live channels matching a query, or null when Twitch credentials are not set. */
export async function searchTwitchChannels(query: string, limit = 8): Promise<Channel[] | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag("source:twitch");

  const clientId = process.env.TWITCH_CLIENT_ID;
  if (!clientId || !process.env.TWITCH_CLIENT_SECRET) return null;

  const headers = { "Client-Id": clientId, Authorization: `Bearer ${await getAppToken()}` };
  const search = new URL("https://api.twitch.tv/helix/search/channels");
  search.searchParams.set("query", query);
  search.searchParams.set("live_only", "true");
  search.searchParams.set("first", "20");
  const { data: matches } = await fetchJson<{ data: { broadcaster_login: string }[] }>(search.toString(), {
    headers,
  });
  if (matches.length === 0) return [];

  // Search results lack viewer counts and the mature flag; the streams endpoint has both.
  const streams = new URL("https://api.twitch.tv/helix/streams");
  for (const match of matches) streams.searchParams.append("user_login", match.broadcaster_login);
  const { data } = await fetchJson<{ data: Stream[] }>(streams.toString(), { headers });

  return data
    .filter(isPromotable)
    .sort((a, b) => b.viewer_count - a.viewer_count)
    .slice(0, limit)
    .map(toTitle);
}
