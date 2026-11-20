"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState, type CSSProperties } from "react";
import { FeatureRail } from "@/components/feature-rail";
import { genreDefinitions, type GenreSection } from "@/lib/genres";
import { useNowPlaying } from "@/lib/viewer-store";
import { DeferredSection } from "@/components/deferred-section";

const genreAccents = ["#f1b56c", "#d7b67a", "#79d2f2", "#c5b0f5", "#e48d85", "#76c7b4", "#a7b8e2", "#b1a0ef", "#d7bc84", "#f07a86", "#d59ee9", "#85b5d7", "#eea0b5", "#76cfe2"];

export function GenreCards({ sections = [] }: { sections?: GenreSection[] }) {
  return <nav aria-label="Genre collections"><ul className="genre-card-grid">
    {genreDefinitions.map((genre, index) => {
      const items = sections.find(section => section.key === genre.key)?.items ?? [];
      const title = items.find(title => title.art.image?.backdrop) ?? items.find(title => title.art.image?.poster);
      const src = title?.art.image?.backdrop ?? title?.art.image?.poster;
      return <li key={genre.key}><Link prefetch={false} href={`/genres/${genre.key}`} className="genre-tile" style={{ "--genre-accent": genreAccents[index] } as CSSProperties} aria-label={`Browse ${genre.label} movies and TV shows`}>
        {src && <Image src={src} alt="" fill sizes="(min-width: 1280px) 15vw, (min-width: 600px) 25vw, 50vw" className="genre-tile-art" />}
        <span className="genre-tile-shade" aria-hidden />
        <span className="genre-tile-copy"><span className="genre-tile-name">{genre.label}</span><span className="genre-tile-caption">Movies &amp; TV shows</span></span>
      </Link></li>;
    })}
  </ul></nav>;
}

export function GenreLinks({ selected }: { selected?: string }) {
  return <nav aria-label="Genres" className="scrollbar-none flex gap-2 overflow-x-auto py-1 pb-3">
    {genreDefinitions.map(genre => <Link prefetch={false} key={genre.key} href={`/genres/${genre.key}`} aria-current={genre.key === selected ? "page" : undefined} className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium ${genre.key === selected ? "bg-fg text-ink" : "bg-surface-2 text-fg-muted hover:bg-surface-3 hover:text-fg"}`}>{genre.label}</Link>)}
  </nav>;
}

export function GenreSections() {
  const [retry, setRetry] = useState(0);
  const [result, setResult] = useState<{ attempt: number; sections?: GenreSection[]; error?: string } | null>(null);
  const current = result?.attempt === retry ? result : null;
  const playerOpen = useNowPlaying() !== null;
  useEffect(() => {
    if (playerOpen || current?.sections) return;
    const controller = new AbortController();
    const timer = setTimeout(() => { controller.abort(); setResult({ attempt: retry, error: "The genre collections are taking longer than usual. Please try again." }); }, 600_000);
    fetch("/api/genres", { signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error("Genres unavailable");
      const data: { sections: GenreSection[] } = await response.json();
      if (!controller.signal.aborted) setResult({ attempt: retry, sections: data.sections });
    }).catch(() => { if (!controller.signal.aborted) setResult({ attempt: retry, error: "The genre collections couldn’t be reached. Please try again." }); }).finally(() => clearTimeout(timer));
    return () => { clearTimeout(timer); controller.abort(); };
  }, [retry, playerOpen, current?.sections]);
  return <section id="genres" className="scroll-mt-28" aria-labelledby="genres-heading">
    <div className="px-gutter"><h2 id="genres-heading" className="font-display mb-4 text-2xl font-semibold">Browse by genre</h2><GenreCards sections={current?.sections} /></div>
    {!current ? <p role="status" className="px-gutter mt-4 text-sm text-fg-muted">Loading collections…</p>
      : current.error ? <p role="alert" className="px-gutter mt-4 text-sm text-fg-muted">{current.error}<button onClick={() => setRetry(value => value + 1)} className="ml-3 underline">Try again</button></p>
      : <div className="mt-7 flex flex-col gap-8">{current.sections?.map(section => <div key={section.key} className="online-preview" data-genre={section.key}>
        <div className="px-gutter mb-2 flex justify-end"><Link href={`/genres/${section.key}`} className="browse-all">Explore {section.label.toLowerCase()}</Link></div>
        {section.items.length ? <DeferredSection anchor={`genre-${section.key}`} heading={section.label}><FeatureRail id={`genre-${section.key}`} heading={section.label} items={section.items} /></DeferredSection> : <div className="px-gutter"><h3 className="font-display text-xl font-semibold">{section.label}</h3><p className="mt-3 text-sm text-fg-muted">More stories are on the way.</p></div>}
      </div>)}</div>}
  </section>;
}
