import type { Metadata } from "next";
import Form from "next/form";
import { Suspense } from "react";
import { NicheCards } from "@/components/niche-cards";
import { NoticeToast } from "@/components/notice-toast";
import { PlayerDialog } from "@/components/player-dialog";
import { Rail } from "@/components/rail";
import { SearchEmpty } from "@/components/search-empty";
import { SiteHeader } from "@/components/site-header";
import { nicheHue, nicheOrder, niches } from "@/lib/catalog";
import { MIN_QUERY_LENGTH, normalizeQuery, searchCatalog } from "@/lib/search";

type SearchParams = PageProps<"/search">["searchParams"];

async function readQuery(searchParams: SearchParams): Promise<string> {
  const { q } = await searchParams;
  return (Array.isArray(q) ? q[0] : q) ?? "";
}

export async function generateMetadata({ searchParams }: PageProps<"/search">): Promise<Metadata> {
  const query = normalizeQuery(await readQuery(searchParams));
  return { title: query ? `Search: ${query} · Sidflix` : "Search · Sidflix" };
}

export default function SearchPage({ searchParams }: PageProps<"/search">) {
  return (
    <>
      <SiteHeader />
      <main className="flex-1 pt-24 pb-20 md:pt-28">
        <h1 className="sr-only">Search Sidflix</h1>
        <Suspense fallback={<SearchForm />}>
          <SearchBody searchParams={searchParams} />
        </Suspense>
      </main>
      <NoticeToast />
      <PlayerDialog />
    </>
  );
}

function SearchForm({ defaultValue = "" }: { defaultValue?: string }) {
  return (
    <Form action="/search" role="search" className="px-gutter">
      <label htmlFor="search-page-q" className="sr-only">
        Search anime, live sports, films and channels
      </label>
      <input
        // Remount on each search so the box shows the query that was run.
        key={defaultValue}
        id="search-page-q"
        name="q"
        type="search"
        defaultValue={defaultValue}
        placeholder="Search anime, live sports, films and channels"
        autoComplete="off"
        className="bg-surface-2 placeholder:text-fg-subtle w-full max-w-2xl rounded-lg px-4 py-3 text-base ring-1 ring-white/10 focus:ring-2 focus:ring-white/60 focus:outline-none md:text-lg"
      />
    </Form>
  );
}

async function SearchBody({ searchParams }: { searchParams: SearchParams }) {
  const raw = await readQuery(searchParams);
  const query = normalizeQuery(raw);
  return (
    <>
      <SearchForm defaultValue={raw} />
      <Suspense key={query} fallback={<ResultsSkeleton />}>
        <Results query={query} />
      </Suspense>
    </>
  );
}

async function Results({ query }: { query: string }) {
  if (query.length < MIN_QUERY_LENGTH) {
    return (
      <p className="text-fg-muted px-gutter mt-6 text-sm">
        {query ? `Type at least ${MIN_QUERY_LENGTH} characters.` : "Find a series, film, match or channel."}
      </p>
    );
  }

  const { results, unavailable } = await searchCatalog(query);

  return (
    <div className="mt-8 flex flex-col gap-10 md:gap-14">
      {unavailable.length > 0 && (
        <p className="text-fg-subtle px-gutter -mb-6 text-sm">
          Some sources didn&rsquo;t respond: {unavailable.join(", ")}.
        </p>
      )}
      {results.length === 0 ? (
        <p className="text-fg-muted px-gutter text-sm">No results for &ldquo;{query}&rdquo;.</p>
      ) : (
        <>
          <SearchEmpty maturities={results.map((t) => t.maturity)} query={query} />
          {nicheOrder.map((niche) => {
            const items = results.filter((t) => t.niche === niche);
            if (items.length === 0) return null;
            return (
              <Rail key={niche} id={`search-${niche}`} heading={niches[niche].label} hue={nicheHue[niche]}>
                <NicheCards niche={niche} items={items} />
              </Rail>
            );
          })}
        </>
      )}
    </div>
  );
}

function ResultsSkeleton() {
  return (
    <div aria-hidden className="px-gutter mt-8 flex flex-col gap-4">
      <div className="bg-surface-2 h-6 w-32 animate-pulse rounded-md motion-reduce:animate-none" />
      <div className="flex gap-3 overflow-hidden md:gap-4">
        {Array.from({ length: 6 }, (_, i) => (
          <div
            key={i}
            className="bg-surface-2 aspect-5/7 w-[38vw] max-w-44 shrink-0 animate-pulse rounded-lg motion-reduce:animate-none sm:w-40 lg:w-44"
          />
        ))}
      </div>
    </div>
  );
}
