import { SiteFooter } from "@/components/site-footer";
import type { Metadata } from "next";
import Link from "next/link";
import { OnlineShows } from "@/components/online-shows";
import { SiteHeader } from "@/components/site-header";
import { PlayerDialog } from "@/components/player-dialog";
import { SeriesDialog } from "@/components/series-dialog";

export const metadata: Metadata = { title: "TV shows · Sidflix" };
export default function TvShowsPage() {
  return <><SiteHeader /><main className="px-gutter mx-auto w-full max-w-7xl flex-1 pt-32 pb-16 md:pt-28">
    <Link href="/" className="mb-6 inline-block text-sm text-fg-muted hover:text-fg">← Back to Sidflix</Link>
    <h1 className="sr-only">TV shows on Sidflix</h1><OnlineShows />
    
  </main><SiteFooter /><SeriesDialog /><PlayerDialog /></>;
}
