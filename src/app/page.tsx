import { ChannelCard, LiveCard, PosterCard, nicheHue } from "@/components/cards";
import { CatalogProvider } from "@/components/catalog-provider";
import { Hero } from "@/components/hero";
import { ContinueWatchingRow, TopTenRow } from "@/components/home-rows";
import { NoticeToast } from "@/components/notice-toast";
import { Rail } from "@/components/rail";
import { SiteHeader } from "@/components/site-header";
import { nicheOrder, niches, type Niche, type Title } from "@/lib/catalog";
import { getHomeCatalog } from "@/lib/catalog-server";

function NicheCards({ niche, items }: { niche: Niche; items: Title[] }) {
  if (niche === "sports") {
    return items
      .filter((t) => t.kind === "live")
      .map((event) => <LiveCard key={event.id} event={event} />);
  }
  if (niche === "gaming") {
    return items
      .filter((t) => t.kind === "channel")
      .map((channel) => <ChannelCard key={channel.id} channel={channel} />);
  }
  return items.map((title) => <PosterCard key={title.id} title={title} />);
}

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
            <TopTenRow />
            {nicheOrder.map((niche) => (
              <Rail
                key={niche}
                id={niche}
                heading={niches[niche].heading}
                description={niches[niche].description}
                hue={nicheHue[niche]}
              >
                <NicheCards niche={niche} items={catalog.rails[niche]} />
              </Rail>
            ))}
          </div>
        </main>
      </CatalogProvider>
      <footer className="px-gutter border-line text-fg-subtle border-t py-10 text-xs leading-relaxed">
        <p className="font-display text-fg-muted text-sm font-bold">Sidflix</p>
        <p className="mt-2 max-w-2xl">
          Anime from TMDB, fixtures and scores from TheSportsDB, live channels from Twitch, and
          public-domain films from the Internet Archive. Sintel and Big Buck Bunny are open movies by
          the Blender Foundation (CC BY 3.0). Rows whose source isn&rsquo;t connected show fictional
          demo titles. Profiles and watch progress are saved in this browser only.
        </p>
        <p className="mt-2 max-w-2xl">
          This product uses the TMDB API but is not endorsed or certified by TMDB.
        </p>
      </footer>
      <NoticeToast />
    </>
  );
}
