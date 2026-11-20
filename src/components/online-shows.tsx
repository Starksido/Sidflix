"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { PosterCard } from "@/components/cards";
import { FeatureRail } from "@/components/feature-rail";
import { isAllowed } from "@/lib/catalog";
import { useActiveProfile, useNowPlaying } from "@/lib/viewer-store";
import type { OnlineShowPage, ShowSort } from "@/lib/online-shows";

export function OnlineShows({ preview = false }: { preview?: boolean }) {
  const [sort, setSort] = useState<ShowSort>("popular"), [page, setPage] = useState(1);
  const [query, setQuery] = useState(""), [draft, setDraft] = useState(""), [retry, setRetry] = useState(0);
  const [result, setResult] = useState<{ key: string; data?: OnlineShowPage; error?: string } | null>(null);
  const allowed = isAllowed("16+", useActiveProfile().maxMaturity), key = `${page}|${sort}|${query}|${retry}`;
  const current = result?.key === key ? result : null;
  const playerOpen = useNowPlaying() !== null;
  useEffect(() => {
    if (!allowed || playerOpen || current?.data) return;
    const controller = new AbortController();
    const timer = setTimeout(() => { controller.abort(); setResult({ key, error: "TV shows are taking longer to load. Please try again." }); }, 45_000);
    const params = new URLSearchParams({ page: String(page), sort, q: query });
    fetch(`/api/tv-shows?${params}`, { signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error("Catalogue unavailable");
      const data: OnlineShowPage = await response.json();
      if (!controller.signal.aborted) setResult({ key, data });
    }).catch(() => { if (!controller.signal.aborted) setResult({ key, error: "TV shows couldn’t be loaded. Please try again." }); }).finally(() => clearTimeout(timer));
    return () => { clearTimeout(timer); controller.abort(); };
  }, [allowed, key, page, query, sort, playerOpen, current?.data]);
  if (!allowed) return preview ? null : <p className="mt-8 text-fg-muted">These shows aren’t available on this profile.</p>;
  const search = (event: FormEvent) => { event.preventDefault(); setPage(1); setQuery(draft.trim()); };
  if (preview && current?.data?.items.length) return <div className="online-preview"><div className="px-gutter mb-2 flex justify-end"><Link href="/tv-shows" className="browse-all">Explore shows</Link></div><FeatureRail id="online-tv-shows" heading="Shows to get lost in" items={current.data.items.slice(0, 12)} /></div>;
  return <section id="online-tv-shows" aria-labelledby="online-tv-heading" data-remote-loading={preview && !current ? "" : undefined} tabIndex={preview && !current ? 0 : undefined} className="scroll-mt-28">
    <div className="flex flex-wrap items-end justify-between gap-3"><div>
      <h2 id="online-tv-heading" className="font-display text-2xl font-semibold">TV shows</h2>
      <p className="mt-2 text-sm text-fg-muted">Find a new obsession. One great episode leads to another.</p>
    </div>{preview && <Link data-remote-skip href="/tv-shows" className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-ink">Browse all TV shows →</Link>}</div>
    {!preview && <div className="mt-5 flex flex-wrap items-center gap-3">
      <form role="search" onSubmit={search} className="flex min-w-0 flex-1 gap-2">
        <input aria-label="Search TV shows" type="search" maxLength={80} placeholder="Search TV shows" value={draft} onChange={event => setDraft(event.target.value)} className="min-w-0 flex-1 rounded-lg bg-white/5 px-4 py-2.5 text-sm ring-1 ring-white/15 focus:ring-accent focus:outline-none" />
        <button className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-ink">Search</button>
      </form>
      <select aria-label="Sort TV shows" value={sort} onChange={event => { setSort(event.target.value as ShowSort); setPage(1); }} className="rounded-lg bg-surface-2 px-3 py-2.5 text-sm">
        <option value="popular">Popular</option><option value="updated">Recently updated</option><option value="name">A–Z</option>
      </select>
    </div>}
    {!current ? <div role="status" className="mt-6 rounded-xl bg-white/5 p-6 text-sm text-fg-muted">Loading TV shows…</div>
      : current.error ? <div role="alert" className="mt-6 rounded-xl bg-white/5 p-6 text-sm text-fg-muted">{current.error}<button onClick={() => setRetry(value => value + 1)} className="ml-3 text-accent underline">Try again</button></div>
      : current.data && <>
        <ul className={preview ? "mt-5 flex gap-4 overflow-x-auto py-1 pb-4" : "mt-6 grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 [&>li]:w-full [&>li]:max-w-none"}>
          {(preview ? current.data.items.slice(0, 12) : current.data.items).map(show => <PosterCard key={show.id} title={show} />)}
        </ul>
        {!current.data.items.length && <p className="mt-5 text-sm text-fg-muted">No shows found. Try another title.</p>}
        {!preview && <div className="mt-8 flex items-center justify-center gap-4">
          <button disabled={current.data.page <= 1} onClick={() => setPage(current.data!.page - 1)} className="rounded-lg bg-white/10 px-4 py-2 text-sm disabled:opacity-40">Previous</button>
          <span className="text-sm text-fg-muted">Page {current.data.page}</span>
          <button disabled={current.data.page >= current.data.totalPages} onClick={() => { setPage(current.data!.page + 1); document.getElementById("online-tv-shows")?.scrollIntoView(); }} className="rounded-lg bg-white/10 px-4 py-2 text-sm disabled:opacity-40">Next</button>
        </div>}
      </>}
  </section>;
}
