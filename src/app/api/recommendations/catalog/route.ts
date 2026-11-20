import { connection } from "next/server";
import { getRecommendationCatalog } from "@/lib/sources/recommendations";

export async function GET() {
  await connection();
  try {
    const result = await getRecommendationCatalog();
    if (!result.items.length) throw Error("Unavailable");
    return Response.json(result);
  } catch { return Response.json({ error: "Your picks couldn’t be loaded. Please try again." }, { status: 503 }); }
}
