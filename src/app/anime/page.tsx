import { SiteFooter } from "@/components/site-footer";
import type { Metadata } from "next";
import Link from "next/link";
import { AnimeBrowser } from "@/components/anime-browser";
import { SiteHeader } from "@/components/site-header";
import { SeriesDialog } from "@/components/series-dialog";
import { PlayerDialog } from "@/components/player-dialog";
import { NoticeToast } from "@/components/notice-toast";

export const metadata: Metadata = { title: "Anime · Sidflix" };

export default function AnimePage() {
  return <><SiteHeader /><main className="px-gutter mx-auto w-full max-w-7xl flex-1 pt-36 pb-16 md:pt-28">
    <Link href="/" className="mb-6 inline-block text-sm text-fg-muted hover:text-fg">← Back to Sidflix</Link>
    <AnimeBrowser />
    
  </main><SiteFooter /><SeriesDialog /><PlayerDialog /><NoticeToast /></>;
}
