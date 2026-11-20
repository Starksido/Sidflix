import { getSportsChannels } from "@/lib/sources/iptv";

export function GET() {
  return Response.json({ channels: getSportsChannels() });
}
