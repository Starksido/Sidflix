"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { BackspaceIcon, MagnifyingGlassIcon, MinusIcon, XIcon } from "@phosphor-icons/react";
import { PosterCard } from "@/components/cards";
import { isAllowed, type Title } from "@/lib/catalog";
import { useActiveProfile } from "@/lib/viewer-store";
import { useRemoteMode } from "@/lib/remote-mode";
import { mixPopularTitles, popularRotation } from "@/lib/popular-rotation";

const letters = "abcdefghijklmnopqrstuvwxyz1234567890".split("");
type Result = { key: string; items?: Title[]; error?: string; partial?: boolean };

function subscribePopularRotation(changed: () => void) {
  let timer: ReturnType<typeof setTimeout>;
  const check = () => {
    clearTimeout(timer);
    changed();
    const now = Date.now();
    timer = setTimeout(check, Math.max(1, popularRotation(now).nextAt - now));
  };
  const onVisible = () => { if (document.visibilityState === "visible") check(); };
  check();
  document.addEventListener("visibilitychange", onVisible);
  window.addEventListener("pageshow", check);
  return () => { clearTimeout(timer); document.removeEventListener("visibilitychange", onVisible); window.removeEventListener("pageshow", check); };
}
const currentPopularPage = () => popularRotation(Date.now()).page;
const initialPopularPage = () => 1;

export function SearchExperience({ initialQuery, tvMode = false }: { initialQuery: string; tvMode?: boolean }) {
  const remoteMode = useRemoteMode();
  const showKeyboard = tvMode || remoteMode;
  const [draft, setDraft] = useState(initialQuery);
  const [retry, setRetry] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const profile = useActiveProfile();
  const rotationPage = useSyncExternalStore(subscribePopularRotation, currentPopularPage, initialPopularPage);
  const query = draft.trim().replace(/\s+/g, " ").slice(0, 80);
  const popularPage = query ? 0 : rotationPage;
  const searchKey = `${query.toLowerCase()}|${retry}|${popularPage}`;
  const current = result?.key === searchKey ? result : null;

  useEffect(() => {
    const onPopState = () => setDraft(new URLSearchParams(location.search).get("q") ?? "");
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const debounce = setTimeout(async () => {
      const url = new URL(window.location.href);
      if (query) url.searchParams.set("q", query); else url.searchParams.delete("q");
      window.history.replaceState(null, "", url);
      if (query.length === 1) { clearTimeout(timeout); setResult({ key: searchKey, items: [] }); return; }
      try {
        if (query.length >= 2) {
          const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`, { signal: controller.signal });
          if (!response.ok) throw new Error("Search unavailable");
          const data = await response.json();
          if (!controller.signal.aborted) setResult({ key: searchKey, items: data.results, partial: data.unavailable?.length > 0 });
        } else {
          const pages = await Promise.allSettled([`/api/movies?page=${popularPage}&sort=popular&q=`, `/api/tv-shows?page=${popularPage}&sort=popular&q=`].map(async endpoint => {
            const response = await fetch(endpoint, { signal: controller.signal });
            if (!response.ok) throw new Error("Catalogue unavailable");
            return (await response.json()).items as Title[];
          }));
          const [movies, shows] = pages.map(page => page.status === "fulfilled" ? page.value : []);
          const items = mixPopularTitles(movies, shows);
          if (!items.length) throw new Error("Catalogue unavailable");
          if (!controller.signal.aborted) setResult({ key: searchKey, items, partial: pages.some(page => page.status === "rejected") });
        }
      } catch {
        if (!controller.signal.aborted) setResult({ key: searchKey, error: "Search couldn’t connect. Please try again." });
      } finally {
        clearTimeout(timeout);
      }
    }, query ? 450 : 0);
    const timeout = setTimeout(() => { controller.abort(); setResult({ key: searchKey, error: "Search is taking longer than usual. Please try again." }); }, 45_000);
    return () => { clearTimeout(debounce); clearTimeout(timeout); controller.abort(); };
  }, [query, searchKey, popularPage]);

  const items = current?.items?.filter(title => isAllowed(title.maturity, profile.maxMaturity)) ?? [];
  return <div className="search-workspace" data-tv={showKeyboard}>
    {showKeyboard && <aside className="search-sidebar" aria-label="Search controls">
      <div className="screen-keyboard" aria-label="On-screen keyboard">
        <button type="button" className="keyboard-wide" aria-label="Space" onClick={() => setDraft(value => `${value} `.slice(0, 80))}><MinusIcon size={24} aria-hidden /></button>
        <button type="button" className="keyboard-wide" aria-label="Delete last character" onClick={() => setDraft(value => value.slice(0, -1))}><BackspaceIcon size={24} aria-hidden /></button>
        {letters.map(letter => <button key={letter} type="button" onClick={() => setDraft(value => `${value}${letter}`.slice(0, 80))}>{letter}</button>)}
      </div>
      <div className="search-suggestions" aria-label="Suggested titles"><p className="suggestion-heading">{query ? "Related titles" : "Popular searches"}</p>
        {items.slice(0, 7).map(title => <button key={title.id} type="button" onClick={() => setDraft(title.title)}>{title.title}</button>)}
      </div>
    </aside>}
    <section className="search-results" aria-label="Search results" aria-busy={!current}>
      <form role="search" onSubmit={event => { event.preventDefault(); setRetry(value => value + 1); }} className="cinema-search-form">
        <MagnifyingGlassIcon size={23} weight="bold" aria-hidden />
        <label htmlFor="search-page-q" className="sr-only">Search Sidflix</label>
        <input id="search-page-q" name="q" type="search" value={draft} onChange={event => setDraft(event.target.value)} maxLength={80} placeholder="Movies, shows and more" autoComplete="off" />
        {draft && <button type="button" aria-label="Clear search" onClick={() => setDraft("")}><XIcon size={20} aria-hidden /></button>}
      </form>
      <p className="search-results-label" role="status">{!current ? (query ? "Searching…" : "Finding something good…") : current.error ? "Search unavailable" : query.length === 1 ? "Type at least 2 characters" : !query ? "Popular on Sidflix" : items.length ? `Explore titles related to “${query}”` : `No titles found for “${query}” on this profile.`}</p>
      {current?.error && <div role="alert" className="rounded-xl bg-surface-2 p-6 text-sm">{current.error}<button type="button" className="ml-3 underline" onClick={() => setRetry(value => value + 1)}>Try again</button></div>}
      {!current ? <div className="search-poster-grid" aria-hidden>{Array.from({ length: 8 }, (_, index) => <div key={index} className="aspect-2/3 animate-pulse rounded-lg bg-surface-2 motion-reduce:animate-none" />)}</div> : <ul className="search-poster-grid">{items.map(title => <PosterCard key={title.id} title={title} />)}</ul>}
      {current?.partial && <p className="mt-6 text-xs text-fg-subtle">Some collections couldn’t be reached. Showing the available titles.</p>}
    </section>
  </div>;
}
