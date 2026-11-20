# EPL and Champions League source options

Checked 12 November 2026 from this machine. This research does not add new players
or sources to Sidflix. API reachability is separate from match-video playback.

| Avenue | What was verified | Integration limits |
| --- | --- | --- |
| [SportyTV](https://sporty.com/about-us/index.html) | Its official site describes a free channel available in Kenya and EPL rights. The public [watch page](https://sporty.com/sporty-tv) returned HTTP 200. Its [iOS listing](https://apps.apple.com/ke/app/sportytv-live-sports-stream/id6746158223) includes Kenya among live-streaming regions. | Verify individual match schedules. Coverage of a competition in an app description does not establish every match is streamed. No public third-party video embedding agreement/API was found in the reviewed material. |
| [SportSRC](https://sportsrc.org/docs/) | Documents fixture and per-match stream-source endpoints returning embed URLs. Free plan advertises 1,000 requests/day. A request without credentials returned HTTP 401 with a missing-key message, matching its documentation. | Requires a key and an approved embedding domain. Its [embed guide](https://sportsrc.org/guides/embed-live-stream/) requires a normal iframe with a Referer and rejects sandboxing. Provider ads/popups remain. This is an aggregator; no EPL/UCL redistribution rights were established by the reviewed pages. No authenticated stream playback was tested. |
| [PPV](https://ppv.st/) | Its own public frontend names `https://api.ppv.st/api` as its API base. A GET of `/api/streams` returned HTTP 200 and a successful JSON event catalogue, including embed fields. | The response explicitly says prospective API users should contact the provider. A reachable catalogue is not integration permission. No current EPL/UCL candidates were identified by the title checks, and no video playback or broadcast permissions were verified. |
| [DaddyLive](https://daddylive.li/api) | Its public documentation describes `/api/events` and iframe player links. A GET of `/api/events` returned HTTP 200 with categories and 28 events at the time of checking. | No current EPL/UCL fixtures were identified by the title checks. Provider-controlled embeds may contain ads; playback and broadcast permissions remain unverified. Its disclaimer identifies third-party embedded sources. |
| [ScoreBat](https://www.scorebat.com/video-api/) | Documents official highlights and selected live broadcasts from verified publishers, with ready-made embeds. | Its free version is limited to the Free Feed; competition/team/live endpoints are listed on paid plans. This is not a verified all-match EPL/UCL service. No account or API token was created. |

## Outdated leads

[Streamed](https://streamed.pk/) currently displays a closure notice. Its former
`/api/matches/football` URL redirected to that notice instead of returning a match
feed. GitHub projects depending on that former endpoint need a replacement source;
their existence does not demonstrate a working integration.

## Practical decision

SportyTV is a concrete free viewing avenue to check against individual fixtures in
Kenya. SportSRC is the clearest documented match/embed API candidate, with account,
domain, advertising and source-permission constraints. PPV and DaddyLive are live
catalogue leads, not verified Sidflix playback integrations.

For comparison, DStv's [27 October Kenya package announcement](https://www.dstv.com/en-ke/news/151886/dstv-packages-2026-kenya/)
advertises all EPL/UCL matches on its Sports package from KSh3,000/month, launching
5 November. Older comparison pages still show previous package names/prices, so
confirm the actual account and streaming offer before paying. No direct Sidflix
embed/API was established for DStv.

Raw public-response snapshots are saved under ignored `artifacts/iptv/research/`.
