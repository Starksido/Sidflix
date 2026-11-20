import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { DownloadsBrowser } from "@/components/downloads-browser";

export const metadata = { title: "Downloads · Sidflix" };
export default function DownloadsPage() {
  return <><SiteHeader /><main className="downloads-page"><div className="downloads-intro"><p className="downloads-eyebrow">SIDFLIX, TO GO</p><h1>Stories that travel<br /><span>with you.</span></h1><p>A quiet evening. A long journey. Your favourites, close at hand.</p></div><DownloadsBrowser /></main><SiteFooter /></>;
}
