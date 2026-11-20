import { showFilters } from "@/lib/online-shows";
import { getOnlineShows } from "@/lib/sources/online-shows";

export async function GET(request: Request) {
  let filters;
  try { filters = showFilters(new URL(request.url).searchParams); }
  catch { return Response.json({ error: "Invalid TV show filters" }, { status: 400 }); }
  try { return Response.json(await getOnlineShows(filters.page, filters.sort, filters.query)); }
  catch { return Response.json({ error: "The TV catalogue couldn’t be reached. Please try again." }, { status: 503 }); }
}
