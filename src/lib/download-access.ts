import "server-only";
import { auth } from "@/lib/auth";
import { readAccountAccess } from "@/lib/account-access";

export const downloadPrivateHeaders = { "Cache-Control": "private, no-store", Vary: "Cookie", "X-Content-Type-Options": "nosniff" };
export async function downloadAccess(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers, query: { disableCookieCache: true } });
  if (!session) return { response: Response.json({ error: "Please sign in to download." }, { status: 401, headers: downloadPrivateHeaders }) };
  const access = readAccountAccess(session.user.id);
  if (!access.downloads) return { response: Response.json({ error: "Downloads are included with Premium." }, { status: 403, headers: downloadPrivateHeaders }) };
  return { accountId: session.user.id, access };
}
