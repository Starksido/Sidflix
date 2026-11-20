import { positiveId } from "@/lib/online-shows";
import { getOnlineShowGuide, ShowNotListed } from "@/lib/sources/online-shows";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  let id: number, season: number | undefined;
  try {
    id = positiveId((await context.params).id);
    const value = new URL(request.url).searchParams.get("season");
    if (value !== null) {
      season = Number(value);
      if (!/^[0-9]+$/.test(value) || !Number.isSafeInteger(season) || season < 0 || season > 1000) throw new Error("Invalid season");
    }
  } catch { return Response.json({ error: "Invalid show or season" }, { status: 400 }); }
  try { return Response.json(await getOnlineShowGuide(id, season)); }
  catch (error) { return Response.json({ error: error instanceof ShowNotListed ? "This show or season isn’t available." : "The episode guide couldn’t be reached. Please try again." }, { status: error instanceof ShowNotListed ? 404 : 503 }); }
}
