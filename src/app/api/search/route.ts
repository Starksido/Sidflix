import type { NextRequest } from "next/server";
import { MIN_QUERY_LENGTH, normalizeQuery, searchCatalog } from "@/lib/search";

// GET /api/search?q=… returns matching titles from Sidflix's catalogue sources.
// Same-origin only: no CORS headers, and source errors stay in the server log.
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q");
  if (normalizeQuery(q).length < MIN_QUERY_LENGTH) {
    return Response.json(
      { error: `Query must be at least ${MIN_QUERY_LENGTH} characters.` },
      { status: 400 },
    );
  }
  return Response.json(await searchCatalog(q));
}
