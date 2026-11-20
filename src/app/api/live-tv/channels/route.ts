import { getLiveTvChannels } from "@/lib/sources/iptv";

export function GET() {
  return Response.json({ channels: getLiveTvChannels() });
}
