# TV stream trial: Tulsa King

Checked 15 November 2026 before making TV UI changes, as requested. The user
selected Tulsa King. Sidflix's application code, existing movie source menu and
local show library were not changed by these checks.

## Scope and playback

TMDB matched Tulsa King to series ID `153312`. Its season/episode metadata was
used to select the first episode and a consecutive recently listed pair. The
published VidSpark TV route is `https://vidspark.to/tv/{id}/{season}/{episode}`;
see [the provider documentation](https://vidspark.to/).

| Episode | Actual opening played through | Measured video | English subtitles |
| --- | --- | --- | --- |
| S1 E1 | 72.029 seconds | 1722 × 720 | English track listed; rendered captions not verified |
| S4 E4 | 72.077 seconds | 1920 × 816 | Track listed and captions visibly rendered |
| S4 E5 | 72.068 seconds | 1920 × 816 | Track listed and captions visibly rendered |

The sampled openings showed episode content rather than the earlier movie
betting preroll, and the inspected images did not show the earlier betting
watermark. These are short tests, not proof that whole episodes or every season
are ad-free or continuously available. Audible audio was not independently
verified. HTML HTTP 200 responses alone were not counted as successful playback.

The first episode used a nested `cdn.vidspark.to` player; the recent pair played
directly in `vidspark.to`. All ran inside an outer iframe restricting popups,
top-page navigation and downloads. The test page delegated media autoplay and
fullscreen across player origins. Startup delays and a manual-equivalent Play
action were needed during some runs.

## Controls and integration limits

- The public movie-style postMessage controls worked in an earlier S4 E4 check:
  video paused at 72.372 seconds, resumed through 74.598 seconds and played at
  129.298 seconds after a seek to two minutes.
- Those same parent-window commands did not control the nested first-episode
  player. Its own Play button is a toggle and retained the `Play` accessibility
  label while already playing; looking for an element labeled `Pause` was an
  incorrect test assumption.
- A focused test using the first episode's actual control button paused at
  12.414 seconds, resumed through 14.639 seconds, and then played at 129.733 seconds
  after a normal media seek. This does not mean Sidflix can use that internal DOM
  across origins: production integration must use supported messages or the
  provider's own controls.
- Several new-window attempts were reported during the first-episode control
  tests. A separate target-count check found only the localhost test page after
  those controls were exercised. The outer iframe restrictions remained enabled.
  That final count is not a complete history of transient browser targets, so do
  not overstate it as proof of zero window attempts or universally ad-free playback.
- Consecutive episode URLs were tested separately. No Sidflix Next/Previous
  buttons, auto-next behavior, season browser or remote Continue Watching
  integration have been implemented or claimed by this source trial. End-of-episode
  messages and automatic transitions still need verification across both players.
- Native text-track modes were not a reliable caption-display indicator for the
  recent player: its English caption text was visible in the rendered page while
  the native track reported `disabled`. Caption checks therefore included visual
  inspection.

## Evidence

Metadata, HTTP responses, trial scripts, console summaries and screenshots are in
`C:/Users/User/.codex/visualizations/2026/11/12/01a1cf61-2398-7930-9255-fd4bab6da80f/tulsa-king-stream-trial/`.

The recent episode measurements above were taken from the successful browser
observations and inspected opening screenshots. A focused first-episode control
run originally reused the generic result filename; its results are now stored as
`cdn-controls-results.json`, and its generator has been corrected to keep those
separate. The per-episode opening screenshots remain available. Earlier failed
startup/Play attempts are not evidence that an episode is unavailable.
