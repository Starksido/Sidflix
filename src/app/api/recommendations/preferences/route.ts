import { auth } from "@/lib/auth";
import { InvalidTastePatch, patchAccountTaste, readAccountTaste, type TastePatch } from "@/lib/account-taste";

const headers = { "Cache-Control": "private, no-store", Vary: "Cookie" };
export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Sign in to see your recommendations." }, { status: 401, headers });
  return Response.json({ accountId: session.user.id, preferences: readAccountTaste(session.user.id).preferences }, { headers });
}

export async function POST(request: Request) {
  // Only the app origin or an explicitly configured Sidflix address may mutate preferences.
  const origin = request.headers.get("origin");
  const trusted = auth.options.trustedOrigins;
  if (!origin || origin !== new URL(request.url).origin && !(Array.isArray(trusted) && trusted.includes(origin))) return Response.json({ error: "Request not allowed." }, { status: 403, headers });
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Please sign in again." }, { status: 401, headers });
  try {
    const reader = request.body?.getReader();
    if (!reader) throw new InvalidTastePatch();
    const chunks: Uint8Array[] = []; let length = 0;
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      length += value.byteLength;
      if (length > 80_000) { await reader.cancel(); return Response.json({ error: "Request is too large." }, { status: 413, headers }); }
      chunks.push(value);
    }
    const body = JSON.parse(Buffer.concat(chunks).toString("utf8")) as { accountId?: string; patch?: TastePatch };
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new InvalidTastePatch();
    if (body.accountId !== session.user.id) return Response.json({ error: "Your account changed. Please try again." }, { status: 409, headers });
    if (!body.patch || typeof body.patch !== "object") throw new InvalidTastePatch();
    const preferences = patchAccountTaste(session.user.id, body.patch);
    // Progress is frequent: acknowledge the write without downloading the entire history again.
    if (body.patch.type === "progress") return Response.json({ accountId: session.user.id, saved: true }, { headers });
    return Response.json({ accountId: session.user.id, preferences }, { headers });
  } catch (error) {
    return Response.json({ error: error instanceof InvalidTastePatch || error instanceof SyntaxError ? "Please check your selection." : "Your preferences couldn’t be saved. Please try again." }, { status: error instanceof InvalidTastePatch || error instanceof SyntaxError ? 400 : 503, headers });
  }
}
