import { downloadAccess, downloadPrivateHeaders } from "@/lib/download-access";
import { getDownloadCatalogue } from "@/lib/sources/downloads";

export async function GET(request: Request) {
  const access = await downloadAccess(request); if (access.response) return access.response;
  const items = await getDownloadCatalogue();
  return Response.json({ accountId: access.accountId, role: access.access.role, items }, { headers: downloadPrivateHeaders });
}
