import { SiteFooter } from "@/components/site-footer";
import type { Metadata } from "next";
import { Suspense } from "react";
import { NoticeToast } from "@/components/notice-toast";
import { PlayerDialog } from "@/components/player-dialog";
import { SeriesDialog } from "@/components/series-dialog";
import { SiteHeader } from "@/components/site-header";
import { SearchExperience } from "@/components/search-experience";

export const metadata: Metadata = { title: "Search · Sidflix" };

async function SearchBody({ searchParams }: Pick<PageProps<"/search">, "searchParams">) {
  const params = await searchParams;
  const raw = Array.isArray(params.q) ? params.q[0] : params.q;
  const tvMode = params.tv === "1";
  return <SearchExperience key={`${raw ?? ""}|${tvMode}`} initialQuery={(raw ?? "").slice(0, 80)} tvMode={tvMode} />;
}

export default function SearchPage({ searchParams }: PageProps<"/search">) {
  return <>
    <SiteHeader />
    <main className="cinema-search-page flex-1 pb-20">
      <h1 className="sr-only">Search Sidflix</h1>
      <Suspense fallback={<p className="px-gutter text-fg-muted">Opening search…</p>}><SearchBody searchParams={searchParams} /></Suspense>
    </main><SiteFooter />
    <NoticeToast /><PlayerDialog /><SeriesDialog />
  </>;
}
