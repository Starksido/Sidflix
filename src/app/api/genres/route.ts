import { getGenreSections } from "@/lib/sources/genres";
import { connection } from "next/server";

export async function GET() {
  await connection();
  try {
    const result = await getGenreSections();
    if (!result.sections.some(section => section.items.length)) throw new Error("Genres unavailable");
    return Response.json(result);
  } catch { return Response.json({ error: "Genre collections couldn’t be reached. Please try again." }, { status: 503 }); }
}
