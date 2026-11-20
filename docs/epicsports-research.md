# EpicSports source research

Checked 12 November 2026. Target supplied by the user:
<https://www.epic-sports.live/>. Findings apply to these inspected pages, not every
website or app using the EpicSports name.

## Verified observations

- The [Manchester United–Aston Villa post](https://www.epic-sports.live/2026/11/mutd-asvilla.html)
  loads `widgets.365scores.com/partners/bolavip/main.js` and a game widget. Browser
  requests also reach `webwidgets.365scores.com` and `imagecache.365scores.com`.
  This identifies a match-information provider, not a video provider.
- That post links to a corresponding article on
  [epic.apks.online](https://epic.apks.online/2026/11/mutd-asvilla.html).
- The [Slavia Prague–Arsenal post](https://www.epic-sports.live/2026/11/slvprg-arsnl.html)
  links to a corresponding article on
  [epic.topyield.online](https://epic.topyield.online/2026/11/slvprg-arsnl.html).
  These linked pages contain match information, social links and advertising.
- The public HTML uses Blogger templates and scripts. The GitHub-hosted
  `asfarmed/players` script loaded as `timer.js` is a countdown plugin. Its repository
  name does not establish a video source.
- Headless Edge checks of the EPL post and linked UCL article found no video
  elements, match-player iframe, or HLS/DASH/media requests during the observation
  windows. The UCL article loaded advertising and Blogger iframes.
- Generic YouTube/Vimeo iframe strings occur inside reusable theme JavaScript.
  They are not evidence of an actual embedded match broadcast.
- The site's [disclaimer](https://www.epic-sports.live/p/disclaimer.html)
  describes an independent sports-information website and says it is unaffiliated
  with leagues and broadcasters unless explicitly stated. It does not name a
  live-video supplier.

## What remains unknown

The original source of any live match video is unverified. The inspected posts
relate to earlier fixtures and did not expose an active video player. This check
does not establish what another page or an active match might load, or whether any
video supplier authorizes redistribution.

No reusable EPL/Champions League video API was found in the reviewed pages.
For Sidflix, 365Scores widgets and match-page links must not be treated as playable
broadcast URLs. Tracing a real video provider requires an active player and its
actual media requests. No EpicSports streams were added to Sidflix.

Raw HTML and browser findings are saved locally under ignored
`artifacts/iptv/research/` for reproducibility.
