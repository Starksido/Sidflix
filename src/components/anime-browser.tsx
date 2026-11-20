"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { FeatureRail } from "@/components/feature-rail";
import { PosterCard } from "@/components/cards";
import type { SeriesTitle } from "@/lib/catalog";
import type { AnimePage, AnimeSort } from "@/lib/anime";

export function AnimeHomeRow({ items }: { items: SeriesTitle[] }) {
  return <div className="online-preview">
    <div className="px-gutter mb-2 flex justify-end"><Link href="/anime" className="browse-all">Explore anime</Link></div>
    {items.length ? <FeatureRail id="anime" heading="Anime" items={items} /> : <section id="anime" className="px-gutter"><h2 className="font-display text-xl font-semibold">Anime</h2><p className="mt-3 text-sm text-fg-muted">Anime previews are temporarily unavailable. <Link href="/anime" className="underline">Explore anime</Link></p></section>}
  </div>;
}

export function AnimeBrowser() {
  const [page, setPage] = useState(1), [sort, setSort] = useState<AnimeSort>("popular");
  const [draft, setDraft] = useState(""), [query, setQuery] = useState(""), [retry, setRetry] = useState(0);
  const [result, setResult] = useState<{ key: string; data?: AnimePage; error?: string } | null>(null);
  const key = `${page}|${sort}|${query}|${retry}`, current = result?.key === key ? result : null;
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => { controller.abort(); setResult({ key, error: "Anime is taking longer to load. Please try again." }); }, 120_000);
    fetch(`/api/anime?${new URLSearchParams({ page: String(page), sort, q: query })}`, { signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error("Anime unavailable");
      const data: AnimePage = await response.json();
      if (!controller.signal.aborted) setResult({ key, data });
    }).catch(() => { if (!controller.signal.aborted) setResult({ key, error: "Anime couldn’t be loaded. Please try again." }); }).finally(() => clearTimeout(timer));
    return () => { clearTimeout(timer); controller.abort(); };
  }, [key, page, sort, query]);
  const search = (event: FormEvent) => { event.preventDefault(); setQuery(draft.trim()); setPage(1); };
  return <section id="anime-catalogue" aria-labelledby="anime-heading" className="scroll-mt-28">
    <h1 id="anime-heading" className="font-display text-3xl font-bold tracking-tight">Anime</h1>
    <p className="mt-2 text-sm text-fg-muted">Find your next series. Pick a season and dive in.</p>
    <div className="mt-6 flex flex-wrap gap-3">
      <form role="search" onSubmit={search} className="flex min-w-0 flex-[1_1_20rem] gap-2">
        <input aria-label="Search anime" type="search" maxLength={80} value={draft} onChange={event => setDraft(event.target.value)} placeholder="Search anime" className="min-w-0 flex-1 rounded-lg bg-white/5 px-4 py-2.5 text-sm ring-1 ring-white/15 focus:ring-white focus:outline-none" />
        <button className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-accent-ink">Search</button>
      </form>
      <select aria-label="Sort anime" value={sort} onChange={event => { setSort(event.target.value as AnimeSort); setPage(1); }} className="rounded-lg bg-surface-2 px-4 py-2.5 text-sm">
        <option value="popular">Popular</option><option value="top-rated">Top rated</option><option value="updated">Recently updated</option><option value="name">A–Z</option>
      </select>
    </div>
    {!current ? <p role="status" className="mt-6 rounded-xl bg-surface-1 p-6 text-sm text-fg-muted">Loading anime…</p>
      : current.error ? <div role="alert" className="mt-6 rounded-xl bg-surface-1 p-6 text-sm text-fg-muted">{current.error}<button onClick={() => setRetry(value => value + 1)} className="ml-3 underline">Try again</button></div>
      : current.data && <>
        <ul className="mt-6 grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 [&>li]:w-full [&>li]:max-w-none">{current.data.items.map(title => <PosterCard key={title.id} title={title} />)}</ul>
        {!current.data.items.length && <p className="mt-5 text-sm text-fg-muted">No anime found. Try another title.</p>}
        {current.data.totalPages > 1 && <div className="mt-8 flex items-center justify-center gap-4">
          <button disabled={current.data.page <= 1} onClick={() => setPage(current.data!.page - 1)} className="rounded-lg bg-white/10 px-4 py-2 text-sm disabled:opacity-40">Previous</button>
          <span className="text-sm text-fg-muted">Page {current.data.page}</span>
          <button disabled={current.data.page >= current.data.totalPages} onClick={() => { setPage(current.data!.page + 1); document.getElementById("anime-catalogue")?.scrollIntoView(); }} className="rounded-lg bg-white/10 px-4 py-2 text-sm disabled:opacity-40">Next</button>
        </div>}
      </>}
  </section>;
}
