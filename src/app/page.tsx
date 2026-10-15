import { CatalogProvider } from "@/components/catalog-provider";
import { FilmRail } from "@/components/film-rail";
import { Hero } from "@/components/hero";
import { ContinueWatchingRow, TopTenRow } from "@/components/home-rows";
import { NicheCards } from "@/components/niche-cards";
import { NoticeToast } from "@/components/notice-toast";
import { PlayerDialog } from "@/components/player-dialog";
import { Rail } from "@/components/rail";
import { SiteHeader } from "@/components/site-header";
import { Fragment } from "react";
import { filmGenres, nicheHue, nicheOrder, niches } from "@/lib/catalog";
import { getHomeCatalog } from "@/lib/catalog-server";

export default async function Home() {
  const catalog = await getHomeCatalog();

  return (
    <>
      <SiteHeader />
      <CatalogProvider catalog={catalog}>
        <main className="flex-1">
          <h1 className="sr-only">Sidflix: anime, live sports, indie films and gaming streams</h1>
          <Hero />
          <div className="flex flex-col gap-10 pt-4 pb-20 md:gap-14">
            <ContinueWatchingRow />
            {catalog.library.length > 0 && (
              <FilmRail
                id="library"
                heading="Your library"
                description="Your own videos, streamed from your video repository."
                items={catalog.library}
              />
            )}
            <TopTenRow />
            {nicheOrder.map((niche) => (
              <Fragment key={niche}>
                <Rail
                  id={niche}
                  heading={niches[niche].heading}
                  description={niches[niche].description}
                  hue={nicheHue[niche]}
                >
                  <NicheCards niche={niche} items={catalog.rails[niche]} />
                </Rail>
                {niche === "indie" &&
                  catalog.genreRails.map((row) => (
                    <FilmRail
                      key={row.genre}
                      id={`indie-${row.genre}`}
                      heading={filmGenres[row.genre].heading}
                      description={filmGenres[row.genre].description}
                      items={row.items}
                    />
                  ))}
              </Fragment>
            ))}
          </div>
        </main>
      </CatalogProvider>
      <footer className="px-gutter border-line text-fg-subtle border-t py-10 text-xs leading-relaxed">
        <p className="font-display text-fg-muted text-sm font-bold">Sidflix</p>
        <p className="mt-2 max-w-2xl">
          Anime from TMDB, fixtures and scores from TheSportsDB, live channels from Twitch (played in Twitch&rsquo;s own embed), and
          public-domain films from the Internet Archive (played in the Archive&rsquo;s own player). Sintel and Big Buck Bunny are open movies by
          the Blender Foundation (CC BY 3.0). Your library plays videos from your own video repository. Rows whose source isn&rsquo;t connected show fictional
          demo titles. Profiles and watch progress are saved in this browser only.
        </p>
        <p className="mt-2 max-w-2xl">
          This product uses the TMDB API but is not endorsed or certified by TMDB.
        </p>
      </footer>
      <NoticeToast />
      <PlayerDialog />
    </>
  );
}
