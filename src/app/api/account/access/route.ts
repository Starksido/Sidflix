import { auth } from "@/lib/auth";
import { readAccountAccess } from "@/lib/account-access";

const headers = { "Cache-Control": "private, no-store", Vary: "Cookie" };
export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Please sign in." }, { status: 401, headers });
  return Response.json({ accountId: session.user.id, ...readAccountAccess(session.user.id) }, { headers });
}
