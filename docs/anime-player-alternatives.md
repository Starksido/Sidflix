# Anime playback alternatives

Checked 15 November 2026. Research only: no production catalogue, source selection or player was changed. The user requires playable Japanese anime and Chinese donghua while avoiding ads and popups. Catalogue APIs alone do not meet that requirement.

## Candidates

| Candidate | Official reference | Observed result | Assessment |
| --- | --- | --- | --- |
| Yenime | https://api.yenime.net/ | Both episodes 1 and 2 of Solo Leveling and Link Click decoded and advanced at 1920×1080 with iframe popup and top-navigation restrictions retained. Advertising-popup attempts were recorded for both series. Extended checks below. | Strongest tested playback candidate; **not a clean ad-free source**. Published player HTML contains a popunder script. |
| VidSync | https://vidsync.pro/docs.html | Its player explicitly refuses automated browsers. | Manual verification lead only. Its ad-free claim is unverified. Do not bypass the automated-browser restriction. |
| AniLink | https://anilink.cc/docs | Both sample titles returned `stream-source-unavailable` and a playback-access renewal error. | Not working in this sample. |
| JustPlay | https://justplay.boo/ | Both sample titles returned `session_unreachable` / playback service not responding. | Not working in this sample. Empty optional ad configuration is not a promise of future ad-free playback. |
| Ani.pm | https://ani.pm/developers | Player explicitly refused the protected iframe configuration. | Unsuitable for the current protection requirements. |
| Aniweeb | https://api.aniweeb.net/docs | Public documentation and tested embed returned HTTP 502. | No working playback established. |
| AniFlow | https://jutsu.club/ and https://github.com/realmichaelstetson/AniFlow-API | Public demo/API unavailable during the check. The repository describes self-hostable player/backend code. | Possible engineering investigation; not an established working source. No code installed. |

SupaPlay remains rejected as the ad-free default: real opening and mid-episode ads were observed in the preceding extended trials. See [the reliability report](supaplay-reliability-test.md).

## Corrected Yenime extended check

| Check | Solo Leveling | Link Click |
| --- | --- | --- |
| Episode 1 startup | 19.04 seconds | 13.46 seconds |
| Episodes 1 and 2 decoded resolution | 1920×1080 | 1920×1080 |
| Continuous main video, 90 seconds | Advanced at every five-second sample | Advanced at every five-second sample |
| Physical pause/resume controls | Passed | Passed |
| Seek to 20%, 50%, 80% | Playback resumed at all positions | Playback resumed at all positions |
| English captions | Rendered in inspected late screenshot | Rendered in inspected late screenshot |
| Seek to final five seconds | Native ended flag and one parent ended event | Native ended flag and one parent ended event |
| Episode 2 startup | 5.21 seconds | 7.77 seconds |
| Episode 2 further advancement | Passed, another 12-second observation | Passed, another 12-second observation |
| Ad requests | Popunder script HTTP 200 on both loads | Popunder script HTTP 200 on both loads |
| Popup request events | One, `coronisoralogy.cfd` | One, `jn.fixuresrethink.cfd` |

Both parent pages stayed on localhost. These popup events establish attempted advertising; they do not establish successful popup navigation. The iframe never received permission to open popups. No in-player video advert was observed in these sampled positions, but the tests did not watch every minute or establish absence of other advertising. Episode 2 was loaded deliberately by the test harness; automatic next-episode handoff in Sidflix was not tested. Native completion was checked by seeking near the end, not by a full uninterrupted episode. Five-second sampling does not rule out shorter stalls. Decoded 1080p frames do not independently establish source-master quality, and audio was muted.

Recommendation: Yenime is a functional optional trial only if its advertising attempts are acceptable under retained protections. It does not satisfy a strict claim of an inherently ad-free provider. VidSync is the next manual-trial lead; its marketing claims cannot replace real viewing checks. None of the investigated alternatives warrants an unconditional ad-free guarantee or automatic production-default change.

## Method and limits

Samples use AniList 151807 (Solo Leveling) and 126403 (Link Click), with public documented iframe routes. Disposable private Edge profiles retained `allow-scripts allow-same-origin allow-forms allow-presentation`; popups and top navigation were not granted, downloads were denied and audio was muted. No user's browser profile was used. A real advancing video, not simply a loaded iframe or title metadata, is required for a playback pass.

An early generic probe could attempt native video playback without checking for an access-warning overlay. Any VidSync media observations from that probe are excluded: the explicit automated-browser refusal controls its assessment. Subsequent probes skip interaction when an access restriction or human-verification prompt is present.

The first focused Yenime run failed to capture the frame correctly during local-page navigation. Its empty observations are a test-harness failure, not proof that the provider was unavailable. The corrected run waits for the local document to finish loading before inserting the player.

Popup-ad code can exist even if browser restrictions prevent a window from opening. Likewise, no advert in a short sample does not prove no later adverts, full catalogue coverage or future availability. No guarantee is claimed.

Evidence is under `C:/Users/User/.codex/visualizations/2026/11/12/01a1cf61-2398-7930-9255-fd4bab6da80f/`: `other-anime-options-results.json`, `other-anime-debug-results.json`, `anilink-justplay-results.json`, and the corrected `yenime-solo-results.json` / `yenime-link-click-results.json`.
