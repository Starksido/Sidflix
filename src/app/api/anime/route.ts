import { animeFilters } from "@/lib/anime";
import { getOnlineAnime } from "@/lib/sources/anime";

export async function GET(request: Request) {
  let filters;
  try { filters = animeFilters(new URL(request.url).searchParams); }
  catch { return Response.json({ error: "Invalid anime filters" }, { status: 400 }); }
  try { return Response.json(await getOnlineAnime(filters.page, filters.sort, filters.query)); }
  catch { return Response.json({ error: "The anime catalogue couldn’t be reached. Please try again." }, { status: 503 }); }
}
