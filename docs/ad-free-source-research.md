# Ad-free movie source research

Checked 15 November 2026. The user asked to keep Sidflix's working VidSrc streams
available while researching alternatives. No player settings, defaults or popup
permissions were changed in the app during this investigation.

Subsequent user-approved integration: EmbedWave is now the default in the online
movie dialog, pinned to `nxsha` with the tested iframe restrictions. VidSrc remains
an explicitly selected fallback with its ads/popups labeled. There is no automatic
switch to VidSrc. The original three-title VidSrc diagnostic page remains separate.

## Findings

**Follow-up: fails the ad-free requirement for the reported titles.** The user
reported an opening advert and poor picture for The Odyssey and Other Mommy.
Title-specific checks reproduced betting promotions inside the playing video.
The initial short startup/control checks did not establish ad-free film content
or acceptable picture quality, and should not have been treated as sufficient.
See [the detailed source quality findings](source-quality-findings.md).

The subsequent [additional source checks](alternative-movie-sources.md) found
VidSpark as a stronger candidate: both reported titles passed a longer protected
opening/control check with cleaner sampled images and higher decoded resolutions.
No change to the app's source was made during that research.

| Candidate | Published offer | Check from this machine | Decision |
| --- | --- | --- | --- |
| [EmbedWave](https://embedwave.cc/) | Free movie/episode embeds addressed by TMDB ID; claims no injected ads | Startup/control checks passed, but subsequent title-specific checks reproduced in-video ads and degraded picture | Does not meet the ad-free requirement; do not recommend as a verified ad-free HD source |
| [vidsrc.sbs](https://vidsrc.sbs/) | Advertises free ad-free embeds | All three movie requests failed; the research browser also could not fetch the homepage | Not verified usable here |
| [vidsrc.hair](https://vidsrc.hair/) | Advertises prepaid ad-free views on verified domains | All three movie requests failed; the research browser also could not fetch the homepage | Pricing/availability not independently verified; no registration or purchase made |
| [VidSrc.sh](https://vidsrc.sh/vidsrc/docs/) | Current integration; custom-domain offer says 50% fewer ads | User confirms playback but reports redirects after verification and on pause | Keep available as requested; does not meet the ad-free requirement |

These similarly named domains are separate candidates; no affiliation with the
current VidSrc.sh service was established.

## EmbedWave browser observations

The [published API](https://embedwave.cc/docs) accepts the TMDB IDs already used
by Sidflix, so no new catalogue or API key would be needed. It is another iframe
service, not a documented direct-video API. Its player wraps upstream services;
the default in the tested responses was `web.nxsha.app` / `AwsPly-[Multi-Lang]`.
One alternate backend, [CineSrc](https://cinesrc.st/), explicitly advertises minimal
ads. A claim about the wrapper alone does not establish every upstream as ad-free.

Tests ran outside Sidflix in a disposable private browser. The outer iframe used
`sandbox="allow-scripts allow-same-origin allow-forms allow-presentation"`, with
no permissions for popups, top-page navigation or downloads. No verification
challenges were solved and no ads were clicked.

| Movie | TMDB ID | First video time | Second video time | Decoded video width |
| --- | --- | --- | --- | --- |
| Inception | 27205 | 0.036 s | 2.557 s | 1280 px |
| Interstellar | 157336 | 10.278 s | 12.820 s | 1280 px |
| The Dark Knight | 155 | 8.611 s | 11.124 s | 1280 px |

All three had a ready video element and advancing playback with the restrictions
in place. No popup requests or replacement of the top test page were observed
during those short checks. This does not prove uninterrupted full-film playback,
future uptime, audible audio, subtitle accuracy or the absence of all advertising.
The player defaulted to Hindi in this test; its source menu offered English HLS.
The English selection itself has not yet been playback-tested.

An initial pause check was sent during startup and did not pause; two subsequent
pause/resume cycles worked. The focused repeat waited for playable video and then
passed three consecutive pause/resume cycles, with no popup requests observed.
Paused video times were 4.840, 6.664 and 8.475 seconds; resumed times advanced to
6.661, 8.470 and 10.300 seconds. These were scripted control-button clicks with
browser user activation; real pointer interactions still need manual verification.
Results are recorded separately from startup observations.

## Recommendation

The later title-specific failure supersedes the original trial recommendation
below. Popup protection remains useful, but neither it nor a resolution label
establishes an ad-free, high-quality copy. A replacement needs checks of actual
film content beyond its opening and measured quality after switching settings.

Trial EmbedWave as a separately selected, restricted player while preserving
VidSrc. Keep the default upstream pinned during evaluation, and check English
audio, repeated real pointer interactions, seeking, subtitles and longer playback
before making it the default. Do not automatically fall back from a restricted
candidate to an unrestricted provider: that would reintroduce the popup behavior
the user is trying to avoid. Distribution rights were not established by these
technical checks.

Evidence and repeatable probes are stored at
`C:/Users/User/.codex/visualizations/2026/11/12/01a1cf61-2398-7930-9255-fd4bab6da80f/adfree-candidates/`.
Startup observations are in `browser-startup-results.json`; HTTP checks are in
`http-results.json`; the focused controls check writes `pause-resume-results.json`.
