import { CatalogProvider } from "@/components/catalog-provider";
import { FilmRail } from "@/components/film-rail";
import { LibrarySections } from "@/components/library-sections";
import { LiveTvSection } from "@/components/live-tv-section";
import { OnlineMovies } from "@/components/online-movies";
import { OnlineShows } from "@/components/online-shows";
import { AnimeHomeRow } from "@/components/anime-browser";
import { GenreSections } from "@/components/genre-sections";
import { SeriesDialog } from "@/components/series-dialog";
import { Hero } from "@/components/hero";
import { ContinueWatchingRow, TopTenRow } from "@/components/home-rows";
import { NicheCards } from "@/components/niche-cards";
import { NoticeToast } from "@/components/notice-toast";
import { PlayerDialog } from "@/components/player-dialog";
import { Rail } from "@/components/rail";
import { SiteHeader } from "@/components/site-header";
import { Fragment } from "react";
import { SiteFooter } from "@/components/site-footer";
import { filmGenres, nicheHue, nicheOrder, niches, type SeriesTitle } from "@/lib/catalog";
import { getHomeCatalog } from "@/lib/catalog-server";
import { SHOW_LOCAL_LIBRARY } from "@/lib/library-visibility";
import { RecommendedSection } from "@/components/recommended-section";
import { DeferredSection } from "@/components/deferred-section";

export default async function Home() {
  const catalog = await getHomeCatalog();

  return (
    <>
      <SiteHeader />
      <CatalogProvider catalog={catalog}>
        <main className="flex-1">
          <h1 className="sr-only">Sidflix: movies, TV shows, anime and live TV</h1>
          <Hero />
          <div className="home-rows flex flex-col gap-9 pt-8 pb-20 md:gap-10">
            <ContinueWatchingRow />
            <RecommendedSection fallback={catalog.titles} initialNow={catalog.generatedAt} />
            <DeferredSection anchor="online-movies" heading="Movies for your next night in"><OnlineMovies preview /></DeferredSection>
            <DeferredSection anchor="top-ten" heading="Top 10 today"><TopTenRow /></DeferredSection>
            <DeferredSection anchor="anime" heading="Anime"><AnimeHomeRow items={catalog.rails.anime.filter((title): title is SeriesTitle => title.kind === "series")} /></DeferredSection>
            <DeferredSection anchor="online-tv-shows" heading="Shows to get lost in"><OnlineShows preview /></DeferredSection>
            <DeferredSection anchor="genres" heading="Browse by genre"><GenreSections /></DeferredSection>
            {SHOW_LOCAL_LIBRARY && <LibrarySections items={catalog.library} initialNow={catalog.generatedAt} />}
            <DeferredSection anchor="live-tv" heading="Live TV"><LiveTvSection channels={catalog.liveTv} /></DeferredSection>
            {nicheOrder.filter(niche => niche !== "anime").map((niche) => (
              <Fragment key={niche}>
                <DeferredSection anchor={niche} heading={niches[niche].heading}><Rail
                  id={niche}
                  heading={niches[niche].heading}
                  description={niches[niche].description}
                  hue={nicheHue[niche]}
                >
                  <NicheCards niche={niche} items={catalog.rails[niche]} />
                </Rail></DeferredSection>
                {niche === "indie" &&
                  catalog.genreRails.map((row) => (
                    <DeferredSection key={row.genre} anchor={`indie-${row.genre}`} heading={filmGenres[row.genre].heading}><FilmRail
                      key={row.genre}
                      id={`indie-${row.genre}`}
                      heading={filmGenres[row.genre].heading}
                      description={filmGenres[row.genre].description}
                      items={row.items}
                    /></DeferredSection>
                  ))}
              </Fragment>
            ))}
          </div>
        </main>
      </CatalogProvider>
      <SiteFooter />
      <NoticeToast />
      <PlayerDialog />
      <SeriesDialog />
    </>
  );
}
