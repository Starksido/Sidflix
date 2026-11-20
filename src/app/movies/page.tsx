import { SiteFooter } from "@/components/site-footer";
import type { Metadata } from "next";
import Link from "next/link";
import { OnlineMovies } from "@/components/online-movies";
import { SiteHeader } from "@/components/site-header";
import { PlayerDialog } from "@/components/player-dialog";

export const metadata: Metadata = { title: "Movies · Sidflix" };

export default function MoviesPage() {
  return <><SiteHeader /><main className="px-gutter mx-auto w-full max-w-7xl flex-1 pt-32 pb-16 md:pt-28">
    <Link href="/" className="mb-6 inline-block text-sm text-fg-muted hover:text-fg">← Back to Sidflix</Link>
    <h1 className="sr-only">Movies on Sidflix</h1>
    <OnlineMovies />
    
  </main><SiteFooter /><PlayerDialog /></>;
}
