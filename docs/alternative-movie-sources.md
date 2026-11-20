# Additional movie source checks

Checked 15 November 2026 after the user reported advertising and poor picture on
The Odyssey and Other Mommy. These tests do not change Sidflix's current player
or default source.

Subsequent user-approved integration: VidSpark has been added to the movie source
menu and made the default for newly opened online movies. It uses the tested direct
movie URL and retains popup/navigation/download restrictions. EmbedWave and VidSrc
remain available as explicit choices; failed playback never changes source automatically.

## Shortlist

| Source | Observed result | Assessment |
| --- | --- | --- |
| [VidSpark](https://vidspark.to/) | Direct embeds played beyond 70 seconds of each reported title, retained high decoded resolution at two minutes, and passed pause/resume/seek controls with popup protection | Strongest candidate for a manual trial; not switched into Sidflix during this investigation |
| [VidSync](https://vidsync.pro/docs.html) | Published English-dub movie route loaded media but displayed an explicit automated-browser restriction | Requires ordinary manual testing; no attempt to bypass the restriction was made |
| [Stellar](https://stellar.rip/en/api) | Movie requests returned HTTP 403 / Cloudflare with SAMEORIGIN framing policy; protected browser frames displayed an error page | Playback not verified from this connection; documentation's ad-free claim is not a playback result |
| [APIPlayer](https://apiplayer.ru/) | Player HTML loaded, but the browser stayed at verification or reported verification failure | Playback not verified; no CAPTCHA interaction or token bypass |
| [VidLink](https://vidlink.pro/) | Browser explicitly displayed `Please Disable Sandbox` for both titles; advertising link present | Reject for popup-protected integration in this trial |
| [VidCore](https://vidcore.org/) | HTML framed VidSpark but also contained advertising scripts and click/focus-triggered ad logic, despite its ad-free marketing | Reject the wrapper; test VidSpark's independently documented direct endpoint instead |

VidSpark's published movie endpoint is `https://vidspark.to/movie/{tmdb_id}`.
It also documents TV episodes, playback/progress messages, playback commands,
subtitle support and a discovery API. No API key is requested by the published
embed flow. This is still a third-party movie aggregator; these technical checks
do not establish distribution rights or long-term reliability.

## Initial browser observations

All candidate players were loaded on an isolated localhost test page, separate
from Sidflix. Frames used
`sandbox="allow-scripts allow-same-origin allow-forms allow-presentation"` and
could not open popups, navigate the top page or download files. No verification
challenge was solved or bypassed.

Direct VidSpark observations:

- The Odyssey: decoded frames reached 1920 × 1080; the opening studio sequence
  and sampled film image were visibly sharper than the earlier source. No betting
  preroll or betting watermark was visible in those samples.
- Other Mommy: decoded frames reached 1920 × 873, preserving its wider aspect
  ratio. The sampled opening did not display the earlier betting advert.
- Runtime metadata was 2:52:35 and 1:34:17 respectively. TMDB metadata reported
  173 and 93 minutes; this is a useful consistency check, not proof of identity.
- Some startup buffering and stalls occurred. A pixel count is not a guarantee
  of uninterrupted playback or a pristine original master.

The initial observation windows did not cover a full film. A follow-up waits for
at least 70 seconds of actual video progress, tests the documented pause/play
commands, then seeks normally to two minutes to inspect film content. Its
results are recorded in `vidsparkdetail-browser-results.json`; do not confuse
wall-clock time with the amount of video actually played.

## Longer follow-up results

| Title | Natural opening observed through | Decoded resolution | Pause / resume times | Film sample after seeking |
| --- | --- | --- | --- | --- |
| The Odyssey | 71.649 s | 1920 × 1080 | Paused at 72.067 s; resumed through 73.985 s | Playing at 128.883 s, 1920 × 1080 |
| Other Mommy | 71.307 s | 1920 × 873 | Paused at 71.882 s; resumed through 74.136 s | Playing at 128.295 s, 1920 × 873 |

No popup requests were observed in these protected runs. Sampled opening and
two-minute images did not display the earlier betting preroll or watermark and
looked substantially cleaner than the prior source. English subtitle text was
visible in the longer Odyssey opening sample. Audible audio and complete subtitle
coverage were not verified.

Pause, play and seek used VidSpark's published parent-window control messages;
they changed the actual video state as shown above. These checks do not establish
whole-film uptime, absence of later adverts, every player button, or availability
for other movies. Some startup buffering and earlier stalls remain a practical
limitation. Recommend an ordinary manual trial of VidSpark before replacing the
current default; retain popup restrictions.

## Evidence

HTTP responses, browser observations and screenshots:
`C:/Users/User/.codex/visualizations/2026/11/12/01a1cf61-2398-7930-9255-fd4bab6da80f/more-movie-sources/`.

Repeatable scripts are `probe-more-sources.mjs` and
`test-more-movie-players.mjs` in that directory's parent.
