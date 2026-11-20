# Sidflix

All in one streaming.

Next.js (App Router, TypeScript, Tailwind CSS v4) with Better Auth and persistent server-side SQLite account storage.

## Setup

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env.local` and configure the catalogue keys you use.
3. Run `npm run accounts:setup`. It creates account tables and a private persistent sign-in secret without printing it. Node 22.13+ is required; this workspace uses Node 26.
4. Start the dev server: `npm run dev`. Create an account at `/account`.
5. For another device, open the same Sidflix server address. `localhost` always means the device currently browsing. Account setup prints local network addresses and adds them to the explicitly trusted origins. Re-run setup or update `BETTER_AUTH_TRUSTED_ORIGINS` if the server's network address changes.

Accounts and personal recommendations are stored in the ignored `data/accounts.sqlite` database, not in a visitor's browser. Keep that database and `BETTER_AUTH_SECRET` on persistent storage and back them up together. Other devices need access to the same running Sidflix server; the app has not been published to the internet. The earlier Neon/Drizzle scaffold remains available for a future hosted database migration, but is not the active account adapter.

See [personal recommendations](docs/recommendations.md) for ranking, syncing, contextual themes and limits. Guests can keep browsing; personal recommendations unlock after sign-in. No billing or subscription checkout is implemented.

## Local movies and shows

Set `LOCAL_MEDIA_ROOTS` in `.env.local` to a JSON array of folders on the machine
running Sidflix. Use forward slashes for Windows paths:

```dotenv
LOCAL_MEDIA_ROOTS='[{"path":"D:/","recursive":false},{"path":"D:/daredevil born again"},{"path":"D:/modern family"},{"path":"D:/the big bang theory"}]'
```

The drive root above includes only its video files; the three named folders include
their subfolders. Restart the dev server after changing the configuration.
Movies and shows appear in separate rows. Each show has one card, with a season
selector and episode list. Duplicate episode releases are grouped together.
**Recently added** shows titles discovered in the last seven days; timestamps are
saved in the ignored `data/library-added.json` file and survive server restarts.
New episodes bring their show back into Recently added. Older titles stay in Movies
and TV shows. Search matches both show names and their episodes.
Unknown years and runtimes are omitted. Local videos
use the existing 16+ profile restriction until real ratings are available.

Local playback uses the bundled FFmpeg executable and HLS.js to convert six-second
sections to H.264/AAC at up to 720p. Seeking converts the requested section directly;
original files are never changed or uploaded. Conversion uses CPU on this machine,
with at most two conversions at once and a bounded memory cache. The player supports
previous/next episodes, autoplay-next with an end-of-episode countdown, an episode
menu, ten-second skips, playback speeds, fullscreen, picture in picture, keyboard
shortcuts (Space/K, arrows, M, N/P), and actual saved playback progress. Preferences
and progress stay in this browser.

Embedded text subtitles and matching external `.srt`, `.vtt`, `.ass`, and `.ssa` files
are converted to WebVTT. Sidecar filenames must match the video stem, optionally
followed by a language code (for example `Movie.en.srt`). The player offers subtitles
only when available; picture-based PGS/VobSub tracks are not converted. The first
audio track is used; alternate audio selection is not implemented.

`/api/library/[id]/stream` also serves the original file with HTTP byte ranges and
HEAD support. File access is limited to indexed videos in the configured folders;
paths are kept on the server and symlinks/junctions are not scanned. Remote manifests
still work alongside local folders. Keep Sidflix running on this machine to access
its drives; a separately hosted deployment cannot read this machine's files.

Run `npm test` for range, folder access, streaming and FFmpeg conversion checks.

To download posters and backdrops for local movies and shows, set `TMDB_API_KEY`
and run `npm run library:artwork`. Artwork is matched by title and release year;
The Office Extended Cut uses the US show's artwork. Images are stored locally in
`public/media-artwork/`, with their TMDB source links in `data/library-artwork.json`,
so browsing does not require an online artwork lookup. Run the command again after
adding titles; existing matches are reused. Include `D:/Telegram Desktop` in your
local media roots to scan its videos and subfolders.

## Compression comparison

Run `npm run compression:test` for a repeatable comparison on four representative
local titles: F1, Predator: Badlands, Avatar Aang, and Citadel S02E01. This reads
the media files and writes separate test clips and reports under the ignored
`artifacts/compression/` directory. An alternate output directory can be passed as
the command's first argument.

The test samples three positions in each title, keeps the source resolution and
audio, and compares HEVC medium-preset encodes at CRF 20, 24 and 28. It optionally
tests a midpoint when a quality target falls between two settings. Each candidate
is scored against the existing file with FFmpeg's VMAF v0.6.1 model. A source-versus-
itself measurement checks the comparison pipeline before scoring candidates.

The trial requires each sampled scene to average VMAF 95+ and have a fifth-percentile
frame score of 90+. These are trial targets, not Netflix certification or a guarantee
of invisible differences. A smaller candidate is suggested only if all samples
pass; otherwise the recommendation is to retain the original. Scores use the native
source resolution and 8-bit precision, so subtle 10-bit differences are not measured.
Sampled size savings are not a whole-movie prediction. `report.html` includes frames
for visual review, and `results.json` preserves the measurements and settings.

## Live TV

The Live TV section uses checked movie and sports feeds from the
[iptv-org GitHub repository](https://github.com/iptv-org/iptv). Movies is the default
filter; choose Sports or All channels, or search by channel, language or country.
Movie channels include MovieSphere, Gravitas Movies and Hallmark Movies & More.
The sports line-up includes Red Bull TV, FIFA+, FUEL TV and Cricket Gold.
Logos are stored locally in `public/media-channels/`.

Click a channel to watch its current broadcast and switch channels in the live
player. Movie channels run a schedule; these are not individual on-demand films.
Native video controls provide pause, volume and full screen; the toolbar adds
Go live and automatic/manual quality. Subtitles appear when the broadcaster
supplies an HLS subtitle track. Live channels are restricted to profiles allowing
16+ because programme age ratings are not available.

Run `npm run movies:sync` to refresh `data/movie-channels.json`, or
`npm run sports:sync` to refresh `data/sports-channels.json`. These commands pull
the respective movie/sports playlist from iptv-org and check selected HTTPS
manifests and a video segment for accessibility and browser CORS support. They
skip feeds requiring custom request headers and write diagnostics to ignored
`artifacts/iptv/`. Verify playback in the browser after refreshing:
a link check cannot guarantee decoding, every quality level, or future uptime.
An unsuccessful refresh with no passing feeds preserves the previous line-up.

`/api/live-tv/channels` returns the combined checked line-up; the previous
`/api/sports/channels` route returns sports only. Channel records are also included
in catalogue search.

Streams play directly from each broadcaster/CDN, with no proxy or local recording.
They may contain broadcaster ads, region restrictions, replays or highlights;
being a live TV channel does not promise a particular live match. Sidflix retries
alternate checked feeds when available and offers retry/channel switching on
failure. iptv-org supplies links, not the broadcasts. Fixture cards from TheSportsDB
are separate schedule data and do not grant playback of those matches.

## Online movie catalogue

`/movies` browses TMDB's remote movie database using the existing `TMDB_API_KEY`.
It has Popular, Top Rated and Now Playing lists, full-title search, posters and
pagination. The home page previews Online Movies and links to the full browser;
global search combines movies, shows and local titles in relevance order. `/api/movies`
accepts `page` (1–500), `sort` (`popular`, `top-rated`, `now-playing`) and `q`.
The server keeps credentials private and caches catalogue responses for minutes.
Run the app with outbound network access for catalogue and image requests.

Catalogue information is supplied by TMDB. This does not supply movie files or
guarantee playback. Selecting an online film opens VidSpark directly by TMDB ID.
Its iframe restricts popups, top-page navigation and downloads. The source menu
also offers EmbedWave (tested `nxsha` upstream, in-video adverts reported) and
VidSrc (ads/popups). Sidflix never switches sources automatically. Retry reloads
the selected source, and newly opened titles default to VidSpark.
VidSrc availability is checked only when that source is selected, and does not
describe another source's availability. Distribution rights and availability are not
verified across the catalogue. Sidflix does not download or proxy these film files.

Online titles use `online-` IDs and never enter the local-file scanner or library
rows. Opening an external player does not invent watch progress. Continue Watching
is updated only after matching, validated VidSrc messages report advancing video
progress. VidSpark retains its own player resume behavior; its progress messages
are not yet connected to Sidflix's Continue Watching. Sidflix does not invent
watch history for it or EmbedWave. The existing local library and Live TV use their
own players. See `docs/alternative-movie-sources.md` for the source checks and limits.

## Genre collections

Home includes fourteen collections: Action, Adventure, Animation, Comedy, Crime,
Documentary, Drama, Fantasy, Historical / Biopic, Horror, Musical, Mystery, Romance
and Science Fiction. A title may belong to several collections. Each row mixes
provider-listed TV shows and movies from the existing TMDB movie catalogue;
Explore opens `/genres/{genre}` with separate TV Shows and Movies tabs,
pagination, Popular and Top Rated ordering.

TV classification covers the full provider index using TMDB genres and explicit
keywords. The TV database combines Action & Adventure and Sci-Fi & Fantasy, so
those source tags can place a show in both related collections. Horror, Romance,
Musical and biographical/period-drama keywords supplement genre tags; title words
alone never determine classification. Movies use TMDB's genre filters (History
for Historical / Biopic); Musical uses the exact musical keyword rather than
labelling every concert or music documentary a musical.

`/api/genres` returns the fourteen preview rows. `/api/genres/{genre}` accepts
`type=shows|movies`, `page` (1–500) and `sort=popular|top-rated`. Unknown categories
return 404, invalid filters return 400 and failed collections return 503. Local
library cards remain hidden. Credentials stay server-side.

The first TV classification scan is saved incrementally in ignored
`data/tv-genres.json`. Completed records survive interruptions, and subsequent
scans refresh new, changed or day-old records. To prepare the index explicitly:
`node --conditions=react-server --import tsx scripts/sync-genres.ts`.

## Anime catalogue

`/anime` provides a complete provider-matched catalogue of Japanese animated TV
series, with full-catalogue search (including original and provider title aliases),
Popular, Top Rated, Recently Updated and A–Z sorting, and pagination. The server
classifies TMDB's complete Japanese-animation discovery index, then intersects it
with VidSpark's listed TV IDs. Only matching provider-listed series are displayed.
The first load can take longer while the index is assembled. An atomic, ignored
snapshot at `data/anime-catalogue.json` persists for 24 hours; a saved index can
serve during metadata refresh failures, while provider membership remains checked.
TMDB credentials never reach the browser.

`/api/anime` accepts `page`, `sort` (`popular`, `top-rated`, `updated`, `name`) and
`q`. Cards open the existing season/episode guide and TV player, with previous,
next and supported completion-driven auto-next. Home and global anime search now
use provider-listed titles too. Listing a show does not guarantee every episode,
language or subtitle track is available; playback remains controlled by VidSpark.

Top 10 and Anime appear above the online TV preview on the home page. The Gaming
section, navigation links and search source are no longer shown or queried.

## Hidden laptop fallback

The connected library is hidden from home, navigation, search and Continue
Watching. Configured `LOCAL_MEDIA_ROOTS`, source files, stream routes and saved
progress are retained. To restore its browsing UI, set `SHOW_LOCAL_LIBRARY` to
`true` in `src/lib/library-visibility.ts`, then rebuild/restart. No media files or
folder configuration are removed by hiding it.

## Search ordering

Global search ranks exact title matches first, ignoring leading English articles,
case, accents and punctuation. Related titles follow. Within equally relevant
matches, TMDB popularity, vote count and a rating weighted by its vote count
promote established, well-rated movies and shows. A rating based on very few votes
has limited influence. Popularity measures catalogue interest, not verified
streaming audience totals. Unknown signals fall back to title format, metadata
completeness and stable provider order; episodes follow whole-title matches.
The shared ranking runs on the server, so normal and TV browsing show the same
order. No titles are hardcoded or removed by the ranking step.

## Online TV shows

`/tv-shows` browses VidSpark's complete published TV index, with Popular, Recently
Updated and A–Z ordering, full-title search, posters and pagination. The home page
previews the same catalogue. This is the provider's show list rather than TMDB's
general TV catalogue. The index is fetched in bounded batches and cached for an
hour; TMDB supplies artwork and season/episode metadata only for viewed titles.
Titles without available artwork metadata retain a fallback card.

`/api/tv-shows` accepts `page`, `sort` (`popular`, `updated`, `name`) and `q`.
`/api/tv-shows/{tmdbId}?season=1` returns a listed show's aired season guide.
Unlisted IDs and unavailable seasons return 404; malformed filters return 400;
upstream failures return 503. TMDB credentials remain on the server.

Cards open one show dialog with a season picker and episode list. Playback uses
VidSpark's TV route with popup, top-navigation and download restrictions. Previous
and Next navigate within and between aired seasons. Auto-next runs only after a
validated completion event from the current provider frame. Some nested TV
players do not report compatible events; manual navigation remains available.
The auto-next preference is saved in the browser. Watch history changes only when
validated messages report actual advancing playback; a player opening is not
treated as viewing. Existing local TV grouping and playback stay separate.

Online shows are unrated and restricted to profiles allowing 16+. A provider show
listing does not guarantee every TMDB-listed episode, picture quality or an ad-free
video. See `docs/tv-stream-trial.md` for the player differences observed in testing.

## Remote movie trial

Open `/movie-trial` to manually test three fixed titles through VidSrc.sh. The
trial is separate from the main catalogue and requires a profile allowing 13+.
An explicit Open player click loads the external iframe and checks the provider's
movie-info endpoint from the browser. Ads and human verification may appear;
verification must be completed manually by the viewer. The provider rejects
sandboxed frames, so its iframe uses normal cross-origin embedding.

The page distinguishes a source listing, player-page load, validated progress
messages, and the viewer's own playback verdict. Message handling checks the exact
origin, current frame, matching film IDs and finite feature-film progress values.
The external player controls its own media, ads and subtitles. Distribution rights
for the trial films have not been verified.

Results and notes reset when the page is reloaded or left. Export results downloads a JSON
report containing source latency, reported quality, attempts, player progress and
manual verdicts. Response timings include provider verification where applicable
and do not establish long-term uptime. No verification puzzles are automated, and
no raw movie files are downloaded or proxied by Sidflix.

## Structure

| Path | Purpose |
|------|---------|
| `src/db/index.ts` | Drizzle client over the Neon serverless HTTP driver |
| `src/db/schema.ts` | Drizzle schema entry point |
| `src/lib/auth.ts` | Better Auth server instance (Drizzle adapter) |
| `src/lib/auth-client.ts` | Better Auth React client |
| `src/app/api/auth/[...all]/route.ts` | Better Auth route handler |
| `drizzle.config.ts` | drizzle-kit config (reads `.env.local`) |

## Scripts

| Script | Does |
|--------|------|
| `dev` / `build` / `start` / `lint` | Next.js defaults |
| `typecheck` | `tsc --noEmit` |
| `movies:sync` / `sports:sync` | Refresh checked Live TV feeds and channel logos from iptv-org |
| `auth:generate` | Generate Better Auth Drizzle schema into `src/db/auth-schema.ts` |
| `db:generate` / `db:migrate` / `db:push` / `db:studio` | drizzle-kit |
