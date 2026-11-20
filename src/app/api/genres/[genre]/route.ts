import { genreDefinition, genreFilters } from "@/lib/genres";
import { getGenrePage } from "@/lib/sources/genres";

export async function GET(request: Request, { params }: { params: Promise<{ genre: string }> }) {
  const definition = genreDefinition((await params).genre);
  if (!definition) return Response.json({ error: "Unknown genre" }, { status: 404 });
  let filters;
  try { filters = genreFilters(new URL(request.url).searchParams); }
  catch { return Response.json({ error: "Invalid genre filters" }, { status: 400 }); }
  try { return Response.json(await getGenrePage(definition.key, filters.type, filters.page, filters.sort)); }
  catch { return Response.json({ error: "This collection couldn’t be reached. Please try again." }, { status: 503 }); }
}
