# Reported title quality and advertising

Checked 15 November 2026 against the user's reported films. App settings and
sources were not changed by these diagnostic checks.

| Title | TMDB ID | Highest menu setting selected | Decoded film frame after selection |
| --- | --- | --- | --- |
| The Odyssey | 1368337 | 1082p | 1280 × 721 at approximately 107 seconds |
| Other Mommy | 1400837 | 801p | 1280 × 535 at approximately 107 seconds |

## Advertising

The default EmbedWave `nxsha` route selected the upstream
`AwsPly-[Multi-Lang]` source. Both opening videos displayed betting promotions,
including visible 1XBET branding. Other Mommy still displayed the advert around
44 seconds into the video. The Odyssey displayed its movie opening by about
47 seconds. These are observations of sampled times, not exact ad boundaries.

The advert appeared in the video image itself. Ordinary seeking to 100 seconds
displayed film content while the media source remained unchanged. This supports
the conclusion that this is an upstream video-content problem; blocking popups
does not remove it. The checks did not establish whether the upstream spliced an
advert into its playlist or encoded it into the original file.

## Quality

Quality menus showed 1082/720/482/360p for The Odyssey and 801/534/358/266p for
Other Mommy. A normal pointer click selected the highest option; the player
subsequently displayed `Quality (1082p)` or `Quality (801p)`, respectively.

The measured video dimensions did not reach the selected heights during the
observation window. Other Mommy increased from 858 × 358 to 1280 × 535 after
selection and seeking; it still had a visibly degraded, soft image. The Odyssey
remained at 1280 × 721 and also looked degraded. Dimensions alone cannot prove
the original capture quality, and these tests do not establish why the provider's
selected setting and delivered dimensions differ. Do not claim that the quality
buttons are entirely nonfunctional or that a 1080p master is available.

The practical conclusion is that neither title's tested source meets the user's
ad-free, good-picture requirement. Sidflix cannot restore missing detail through
its page styling or popup restrictions. A satisfactory fix requires a better
playback source or content copy. Do not add a universal 40-second skip: advert
lengths differ and it would skip real content on other films.

## Evidence

Isolated private browser tests used the same outer iframe restrictions as Sidflix.
No CAPTCHA was bypassed, no ad was clicked, and no movie file was downloaded or
proxied by Sidflix. Initial automated attempts failed to select the numeric menu
options and are not evidence of quality switching. The final normal pointer
clicks were verified against the player's changed quality label.

Screenshots and final observations:
`C:/Users/User/.codex/visualizations/2026/11/12/01a1cf61-2398-7930-9255-fd4bab6da80f/adfree-candidates/source-quality/`.
The `*-highest-results.json` files and `*-film-highest.png` images record the final
settings. The earlier `*-results.json` and `*-after-60s.png` files show the sampled
opening, including the advert.
