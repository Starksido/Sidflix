import { onlineMovieParams } from "@/lib/online-movies";
import { getOnlineMovies } from "@/lib/sources/online-movies";

export async function GET(request: Request) {
  const url = new URL(request.url);
  let options;
  try { options = onlineMovieParams({ page: url.searchParams.get("page"), sort: url.searchParams.get("sort"), query: url.searchParams.get("q") }); }
  catch { return Response.json({ error: "Invalid movie filters" }, { status: 400 }); }
  try { return Response.json(await getOnlineMovies(options.page, options.sort, options.query)); }
  catch { return Response.json({ error: "The online catalogue couldn’t be reached. Please try again." }, { status: 503 }); }
}
