"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { PosterCard } from "@/components/cards";
import { FeatureRail } from "@/components/feature-rail";
import { isAllowed } from "@/lib/catalog";
import { useActiveProfile, useNowPlaying } from "@/lib/viewer-store";
import type { MovieSort, OnlineMoviePage } from "@/lib/online-movies";

export function OnlineMovies({ preview = false }: { preview?: boolean }) {
  const [sort, setSort] = useState<MovieSort>("popular");
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [page, setPage] = useState(1);
  const [retry, setRetry] = useState(0);
  const [result, setResult] = useState<{ key: string; data?: OnlineMoviePage; error?: string } | null>(null);
  const profile = useActiveProfile();
  const allowed = isAllowed("16+", profile.maxMaturity);
  const key = `${sort}|${query}|${page}|${retry}`;
  const current = result?.key === key ? result : null;
  const playerOpen = useNowPlaying() !== null;

  useEffect(() => {
    if (!allowed || playerOpen || current?.data) return;
    const controller = new AbortController();
    const timer = setTimeout(() => { controller.abort(); setResult({ key, error: "Movies are taking longer to load. Please try again." }); }, 20_000);
    const params = new URLSearchParams({ page: String(page), sort, q: query });
    fetch(`/api/movies?${params}`, { signal: controller.signal }).then(async (response) => {
      if (!response.ok) throw new Error("The online catalogue couldn’t be reached.");
      const data: OnlineMoviePage = await response.json();
      if (!controller.signal.aborted) setResult({ key, data });
    }).catch(() => { if (!controller.signal.aborted) setResult({ key, error: "Movies couldn’t be loaded. Please try again." }); }).finally(() => clearTimeout(timer));
    return () => { clearTimeout(timer); controller.abort(); };
  }, [allowed, key, page, query, sort, playerOpen, current?.data]);

  const search = (event: FormEvent) => { event.preventDefault(); setPage(1); setQuery(draft.trim()); };
  if (!allowed) return preview ? null : <p className="mt-8 text-fg-muted">These movies aren’t available on this profile.</p>;

  if (preview && current?.data?.items.length) return <div className="online-preview"><div className="px-gutter mb-2 flex justify-end"><Link href="/movies" className="browse-all">Explore movies</Link></div><FeatureRail id="online-movies" heading="Movies for your next night in" items={current.data.items.slice(0, 12)} /></div>;

  return <section id="online-movies" aria-labelledby="online-movies-heading" data-remote-loading={preview && !current ? "" : undefined} tabIndex={preview && !current ? 0 : undefined} className="scroll-mt-28">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div><h2 id="online-movies-heading" className="font-display text-2xl font-semibold">Movies</h2>
        <p className="mt-2 text-sm text-fg-muted">Discover your next favourite. Settle in for a great story.</p></div>
      {preview && <Link data-remote-skip href="/movies" className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-ink">Browse all movies →</Link>}
    </div>
    {!preview && <div className="mt-5 flex flex-wrap items-center gap-3">
      <form onSubmit={search} role="search" className="flex min-w-0 flex-1 gap-2">
        <input aria-label="Search movies" value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={80} type="search" placeholder="Search movies" className="min-w-0 flex-1 rounded-lg bg-white/5 px-4 py-2.5 text-sm ring-1 ring-white/15 focus:ring-accent focus:outline-none" />
        <button className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-ink">Search</button>
      </form>
      <select aria-label="Sort movies" value={sort} onChange={(event) => { setSort(event.target.value as MovieSort); setPage(1); setQuery(""); setDraft(""); }} className="rounded-lg bg-surface-2 px-3 py-2.5 text-sm">
        <option value="popular">Popular</option><option value="top-rated">Top rated</option><option value="now-playing">Now playing</option>
      </select>
    </div>}
    {!current ? <div role="status" className="mt-6 rounded-xl bg-white/5 p-6 text-sm text-fg-muted">Loading movies…</div>
      : current.error ? <div role="alert" className="mt-6 rounded-xl bg-white/5 p-6 text-sm text-fg-muted">{current.error}<button onClick={() => setRetry((value) => value + 1)} className="ml-3 text-accent underline">Try again</button></div>
      : current.data && <>
        <ul className={preview ? "mt-5 flex gap-4 overflow-x-auto py-1 pb-4" : "mt-6 grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 [&>li]:w-full [&>li]:max-w-none"}>
          {(preview ? current.data.items.slice(0, 12) : current.data.items).map((movie) => <PosterCard key={movie.id} title={movie} />)}
        </ul>
        {!current.data.items.length && <p className="mt-5 text-sm text-fg-muted">No movies found. Try another title.</p>}
        {!preview && <div className="mt-8 flex items-center justify-center gap-4">
          <button disabled={page <= 1} onClick={() => { setPage((value) => value - 1); document.getElementById("online-movies")?.scrollIntoView(); }} className="rounded-lg bg-white/10 px-4 py-2 text-sm disabled:opacity-40">Previous</button>
          <span className="text-sm text-fg-muted">Page {page}</span>
          <button disabled={page >= current.data.totalPages} onClick={() => { setPage((value) => value + 1); document.getElementById("online-movies")?.scrollIntoView(); }} className="rounded-lg bg-white/10 px-4 py-2 text-sm disabled:opacity-40">Next</button>
        </div>}
      </>}
  </section>;
}
