import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { MaturityBadge } from "@/components/cards";
import { SiteHeader } from "@/components/site-header";
import { formatRuntime } from "@/lib/catalog";
import { getArchiveFilm, type ArchiveFilm } from "@/lib/sources/archive";

async function loadFilm(id: string): Promise<ArchiveFilm | null> {
  try {
    return await getArchiveFilm(decodeURIComponent(id));
  } catch (error) {
    console.warn("[watch] Internet Archive unavailable:", error instanceof Error ? error.message : error);
    return null;
  }
}

export async function generateMetadata({ params }: PageProps<"/watch/[id]">): Promise<Metadata> {
  const film = await loadFilm((await params).id);
  return {
    title: film ? `${film.title.title} | Sidflix` : "Film not found | Sidflix",
    description: film?.title.synopsis,
  };
}

export default function WatchPage({ params }: PageProps<"/watch/[id]">) {
  return (
    <>
      <SiteHeader />
      <main className="px-gutter flex-1 pt-20 pb-20 md:pt-24">
        <div className="mx-auto max-w-6xl">
          <Link
            href="/#indie"
            className="text-fg-muted hover:text-fg inline-flex items-center gap-1.5 text-sm transition-colors"
          >
            <svg viewBox="0 0 20 20" className="size-4 rotate-180" aria-hidden>
              <path d="M7 4l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            Back to browse
          </Link>
          <Suspense fallback={<PlayerSkeleton />}>
            <Film params={params} />
          </Suspense>
        </div>
      </main>
    </>
  );
}

async function Film({ params }: { params: PageProps<"/watch/[id]">["params"] }) {
  const film = await loadFilm((await params).id);
  if (!film) notFound();
  const { title, embedUrl, description } = film;

  return (
    <article className="mt-4">
      <div className="bg-surface-1 aspect-video w-full overflow-hidden rounded-lg ring-1 ring-white/10">
        <iframe
          src={embedUrl}
          title={`${title.title} player`}
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          className="size-full"
        />
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-[minmax(0,1fr)_16rem] md:gap-10">
        <div className="min-w-0">
          <h1 className="font-display text-3xl font-bold tracking-tight text-balance md:text-4xl">
            {title.title}
          </h1>
          <div className="text-fg-muted mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span>{title.year}</span>
            <span>{formatRuntime(title.minutes)}</span>
            <MaturityBadge maturity={title.maturity} />
          </div>
          {description && (
            <p className="text-fg-muted mt-4 max-w-3xl leading-relaxed whitespace-pre-line">{description}</p>
          )}
        </div>

        <dl className="text-fg-subtle grid content-start gap-3 text-sm">
          {title.director && (
            <div>
              <dt>Directed by</dt>
              <dd className="text-fg-muted">{title.director}</dd>
            </div>
          )}
          {title.source && (
            <div>
              <dt>Source</dt>
              <dd>
                <a
                  href={title.source.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:text-accent-hover"
                >
                  {title.source.label}
                </a>
              </dd>
            </div>
          )}
        </dl>
      </div>
    </article>
  );
}

function PlayerSkeleton() {
  return (
    <div className="mt-4" aria-busy="true">
      <div className="bg-surface-1 aspect-video w-full animate-pulse rounded-lg" />
      <div className="bg-surface-2 mt-6 h-9 w-2/3 max-w-md animate-pulse rounded-md" />
      <div className="bg-surface-2 mt-4 h-4 w-40 animate-pulse rounded-md" />
    </div>
  );
}
