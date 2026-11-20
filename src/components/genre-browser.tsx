"use client";

import { useEffect, useState } from "react";
import { PosterCard } from "@/components/cards";
import { GenreLinks } from "@/components/genre-sections";
import { genreDefinition, type GenreKey, type GenrePage, type GenreSort } from "@/lib/genres";

export function GenreBrowser({ genre }: { genre: GenreKey }) {
  const definition = genreDefinition(genre)!;
  const [type, setType] = useState<"shows" | "movies">("shows"), [page, setPage] = useState(1);
  const [sort, setSort] = useState<GenreSort>("popular"), [retry, setRetry] = useState(0);
  const [result, setResult] = useState<{ key: string; data?: GenrePage; error?: string } | null>(null);
  const key = `${genre}|${type}|${page}|${sort}|${retry}`, current = result?.key === key ? result : null;
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => { controller.abort(); setResult({ key, error: "This collection is taking longer than usual. Please try again." }); }, 600_000);
    fetch(`/api/genres/${genre}?${new URLSearchParams({ type, page: String(page), sort })}`, { signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error("Collection unavailable");
      const data: GenrePage = await response.json();
      if (!controller.signal.aborted) setResult({ key, data });
    }).catch(() => { if (!controller.signal.aborted) setResult({ key, error: "This collection couldn’t be reached. Please try again." }); }).finally(() => clearTimeout(timer));
    return () => { clearTimeout(timer); controller.abort(); };
  }, [genre, type, page, sort, key]);
  return <section aria-labelledby="genre-title" id="genre-browser" className="scroll-mt-28">
    <GenreLinks selected={genre} />
    <h1 id="genre-title" className="font-display mt-6 text-3xl font-bold tracking-tight">{definition.label}</h1>
    <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
      <div role="tablist" aria-label="Title type" className="flex gap-2">{(["shows", "movies"] as const).map(value => <button key={value} id={`genre-tab-${value}`} type="button" role="tab" aria-selected={type === value} aria-controls="genre-results" onClick={() => { setType(value); setPage(1); }} className={`rounded-full px-5 py-2 text-sm font-semibold ${type === value ? "bg-fg text-ink" : "bg-surface-2 text-fg-muted hover:text-fg"}`}>{value === "shows" ? "TV shows" : "Movies"}</button>)}</div>
      <select aria-label="Sort collection" value={sort} onChange={event => { setSort(event.target.value as GenreSort); setPage(1); }} className="rounded-lg bg-surface-2 px-4 py-2.5 text-sm"><option value="popular">Popular</option><option value="top-rated">Top rated</option></select>
    </div>
    <div role="tabpanel" id="genre-results" aria-labelledby={`genre-tab-${type}`} aria-busy={!current}>
      {!current ? <p role="status" className="mt-7 text-sm text-fg-muted">Loading {definition.label.toLowerCase()} {type === "shows" ? "shows" : "movies"}…</p>
        : current.error ? <p role="alert" className="mt-7 text-sm text-fg-muted">{current.error}<button onClick={() => setRetry(value => value + 1)} className="ml-3 underline">Try again</button></p>
        : current.data && <>
          <ul className="mt-6 grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 [&>li]:w-full [&>li]:max-w-none">{current.data.items.map(title => <PosterCard key={title.id} title={title} />)}</ul>
          {!current.data.items.length && <p className="mt-5 text-sm text-fg-muted">No {type === "shows" ? "shows" : "movies"} to show right now. Try the other tab.</p>}
          {current.data.totalPages > 1 && <div className="mt-8 flex items-center justify-center gap-4"><button disabled={current.data.page <= 1} onClick={() => setPage(current.data!.page - 1)} className="rounded-lg bg-white/10 px-4 py-2 text-sm disabled:opacity-40">Previous</button><span className="text-sm text-fg-muted">Page {current.data.page}</span><button disabled={current.data.page >= current.data.totalPages} onClick={() => { setPage(current.data!.page + 1); document.getElementById("genre-browser")?.scrollIntoView(); }} className="rounded-lg bg-white/10 px-4 py-2 text-sm disabled:opacity-40">Next</button></div>}
        </>}
    </div>
  </section>;
}
