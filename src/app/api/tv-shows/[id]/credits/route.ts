import { positiveId } from "@/lib/online-shows";
import { getEpisodeCredits } from "@/lib/sources/episode-credits";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  let id: number, season: number, episode: number;
  try {
    id = positiveId((await context.params).id);
    const query = new URL(request.url).searchParams;
    const s = query.get("season") ?? "", e = query.get("episode") ?? "";
    if (!/^\d{1,4}$/.test(s) || !/^\d{1,4}$/.test(e)) throw new Error("Invalid episode");
    season = Number(s); episode = Number(e);
    if (season > 1000 || episode < 1 || episode > 2000) throw new Error("Invalid episode");
  } catch { return Response.json({ error: "Invalid episode" }, { status: 400 }); }
  return Response.json({ marker: await getEpisodeCredits(id, season, episode) });
}
