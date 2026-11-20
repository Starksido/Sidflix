# Free remote movie API trial

Update, 15 November 2026: the user subsequently confirmed that VidSrc movie streams
play, but reported advertising redirects after human verification and when pausing.
They asked to preserve those streams while finding another source. See
[ad-free source research](ad-free-source-research.md) for the isolated replacement
checks and their limits. The original automated findings below remain historical
observations of that earlier test.

Checked 15 November 2026 from this machine. The initial checks were isolated
availability/browser tests. A separate `/movie-trial` page now supports manual
verification, playback verdicts and JSON export; the main catalogue is unchanged.

## Sources

- [VidSrc.sh documentation](https://vidsrc.sh/vidsrc/docs/) describes free movie
  information endpoints and iframe players accepting IMDb/TMDB IDs, without an API
  key. It also documents advertising and player progress events. This is a
  third-party source; distribution rights for the tested films were not verified.
- [VidFast's domain directory](https://www.vidfast.domains/) lists `vidfast.vc` and
  describes movie/episode embedding. HTTP requests to that domain were tested.
- [TMDB watch providers](https://developer.themoviedb.org/reference/movie-watch-providers)
  supplies country-specific viewing availability, not movie video files or complete
  deep links. Metadata and video availability require separate integrations.

## Availability checks

Three consecutive requests per title were made to VidSrc's documented movie-info
endpoint. These were a short burst, and may have shared the provider's cache.

| Title | IMDb | TMDB | Valid matching responses | Quality reported by provider |
| --- | --- | --- | --- | --- |
| Inception | tt1375666 | 27205 | 3/3 | 1080p |
| Interstellar | tt0816692 | 157336 | 3/3 | 1080p |
| The Dark Knight | tt0468569 | 155 | 3/3 | 1080p |

All nine responses were HTTP 200 JSON, matched the requested title/TMDB ID, and
included an embed URL. Latency was 237–1,501 ms, with a median of 273 ms. These
figures measure the info endpoint, not video startup, bandwidth or long-term uptime.

A nonexistent IMDb ID returned HTTP 404 with a JSON `not found` error, matching
the documented missing-title behavior. VidFast's movie embed URLs returned HTTP
403 for each of the three titles in the HTTP probe. Browser playback through
VidFast was not tested.

## Browser findings

A temporary localhost page embedded the players in a disposable private Edge
profile. Downloads were disabled. The first run used a sandboxed iframe; the
provider explicitly rejected sandboxed embedding for the tested titles.

A second run used the standard iframe mode. The correct Inception and Interstellar
title pages loaded, but displayed human-verification puzzles. No playback progress
events were received during those observation windows. Verification challenges
were not solved or bypassed. Native video quality, audio, subtitles, seeking and
whole-film reliability therefore remain unverified. A catalogue claiming 1080p is
not a measured 1080p playback result.

## Existing Sidflix code

The YTS mapper in `src/lib/sources/yify.ts` currently creates catalogue entries.
It does not attach a `video` URL or player embed, despite the upstream type
including torrent fields. Finding a title in that search is not evidence of
browser-playable remote video. No torrent download was performed in this trial.

## Decision

Free third-party on-demand player endpoints do exist for mainstream movie IDs.
VidSrc.sh is a concrete candidate for a manual playback trial, with its catalogue
API confirmed in this small test. It is not yet a verified reliable playback
integration. Any pilot should distinguish metadata availability, player loading,
human verification and actual playback; offer an explicit unavailable state;
and validate player messages against the expected origin, frame and movie ID.

Raw responses, browser results, screenshots and the repeatable probe scripts are
stored under:
`C:/Users/User/.codex/visualizations/2026/11/12/01a1cf61-2398-7930-9255-fd4bab6da80f/remote-movie-trial/`.
The HTTP probe script is `probe-remote-movies.mjs` in that folder's parent.
