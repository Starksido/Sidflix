# Catalog connection options

Checked 12 November 2026. Title databases supply metadata; playable video comes from
a separate file, stream, or media service.

| Source | Useful data/content | Full playback | Sidflix status |
|---|---|---|---|
| [TMDB](https://developer.themoviedb.org/docs/faq) | Movie/show details, posters, backdrops, seasons and episodes | Metadata and artwork; not a full-video library | Used for anime and local artwork. The artwork manifest already records matched TMDB IDs. |
| [TVmaze](https://www.tvmaze.com/api) | Show search, season/episode lists, summaries, schedules and images | Metadata, not episode files | A new adapter would be needed. Its public API is free; follow its attribution and ShareAlike terms. |
| [IMDb datasets](https://developer.imdb.com/non-commercial-datasets/) | Downloadable title, episode, cast/crew and rating tables | Metadata, not movie files | Could be imported into a local index. These datasets are for personal/non-commercial use under IMDb's terms. |
| [Internet Archive](https://archive.org/developers/md-read.html) | Item metadata and downloadable/streamable files | Selected public-domain or appropriately licensed movies | An adapter and embedded player are already implemented. Review item rights; uploader-provided labels are not a guarantee. |
| [iptv-org/iptv](https://github.com/iptv-org/iptv) and [channel database](https://github.com/iptv-org/database) | Community-maintained M3U live-TV stream links and channel metadata | Live TV; not an on-demand series library | Live TV has movie and sports filters, channel search and an HLS player. Run `npm run movies:sync` or `npm run sports:sync` to refresh. Availability varies. The repository stores links, not video files. |
| [Jellyfin](https://github.com/jellyfin/jellyfin) | An API for a personal media server and its movie/show library | Your own media on your server | Would need a server connection and playback adapter. It does not include a supplied movie catalog. |

## Practical next step

Expand the existing TMDB connection first: the stored show IDs can be used with the
[TV season details API](https://developer.themoviedb.org/reference/tv-season-details)
to enrich the local episode browser. TVmaze is another option for episode guides.
Neither integration supplies missing video files.

For online playback without storing every file on this laptop, the existing
Internet Archive adapter covers selected freely available films; a remote personal
media server such as Jellyfin can serve a collection stored elsewhere. A provider
that supplies a playable library needs its own supported content integration.

## GitHub manifests

Sidflix already reads a remote `videos.json` through `LIBRARY_MANIFEST_URL` in
`src/lib/sources/library.ts`. A GitHub repository can host that catalog, including
HTTPS links to the actual videos. The current manifest format describes individual
films; remote series grouping would need to be added.

Use GitHub primarily for metadata and manifests. Regular repositories
[block files larger than 100 MiB](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github),
so a repository is not a practical ordinary-Git movie store. Jellyfin setup is
documented in its [quick start](https://jellyfin.org/docs/general/quick-start/).
