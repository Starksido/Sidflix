# SupaPlay extended reliability and advertising check

Checked 15 November 2026. **Recommendation: do not use SupaPlay as the default for an ad-free Sidflix experience. Actual adverts were observed.** No production catalogue or player source was changed.

## Scope

Separate disposable private Edge profiles were used for Solo Leveling (AniList 151807) and Link Click (126403). Each tested episode 1, two minutes of continuous main-episode playback, physical clicks on pause/resume, English caption selection, seeks to 20%, 50% and 80%, a seek near completion, episode 2, and an episode-1 restart. Iframe popup/top-navigation restrictions and download denial were retained. Two profiles ran concurrently; browser audio was muted and the user's browser profile was not touched.

## Results

| Check | Solo Leveling | Link Click |
| --- | --- | --- |
| Fresh episode-1 startup | 53.45 seconds | 40.27 seconds |
| Decoded main video | 1920×1080 | 1920×1080 |
| Two minutes continuous main video | Advanced throughout; no stalled sample | Advanced throughout; no stalled sample |
| Pause/resume through visible controls | Passed | Passed |
| English captions | Selectable and rendered text observed | Selectable and rendered text observed |
| Seek to 20% | Passed, approximately 5 seconds | Passed, approximately 5 seconds |
| Seek to 50% | Passed, approximately 5 seconds | Advert started; later video check inconclusive |
| Seek to 80% | Advert started; later video check inconclusive | Active advert; later video check inconclusive |
| End/completion check | Not verified during advertising | Not verified during advertising |
| Episode 2 | Loaded in 12.93s and advanced another 20s | Loaded in 12.85s and advanced another 20s |
| Restart episode 1 | Passed, 7.58s | Passed, 12.58s |
| Popup events observed | None with restrictions retained | None with restrictions retained |
| Ad-free requirement | **Failed** | **Failed** |

The continuous-playback metric samples at five-second intervals; it does not prove there were no shorter stalls. Audio decoding was observed but spoken language, audibility and full caption accuracy were not independently listened to or assessed. Only one 1080p quality level was exposed in these samples; alternate-resolution switching was not established.

## Actual advertising evidence

The player sent `vast-ad-play` events for an opening ad and a later break at 77% in Solo Leveling. Link Click sent a mid-roll ad-play event at 44%, and its second-episode startup included a preroll play/complete sequence. These later breaks were exercised by seeking across their positions, not by naturally watching every preceding minute. The initial Link Click preroll request reported a creative timeout; a clean opening in that case did not establish that later playback was ad-free.

Late screenshots show live-action video advertisements replacing the animated episode and a visible Skip control. `/super_vast` returned an advertising response and associated metadata; an impression-report endpoint returned 404, but that reporting failure does not negate the visible adverts or ad-play events.

The published player script configures a 0% ad and two later positions selected by `randomUniquePercents(2, 10, 100)`. Consequently, seeing no ads in an opening sample is not an ad-free guarantee. Popup restrictions did not remove these in-player video adverts.

Some JW Player getters ceased to return the normal main-video snapshot during active adverts. The raw probe records false outcomes for the subsequent seek/end checks; interpret those as inconclusive due to the active ad and an observation limitation, not proof that the ordinary seek control is broken. No automatic episode handoff or uninterrupted full episode was established.

## Correction to the earlier short trial

The earlier short-trial write-up described brief startup videos as loading videos. The extended run observed preroll advertising lasting about six seconds. Short-video duration alone cannot distinguish a loading animation from an advert, so the earlier label was too definite. Those short videos were correctly excluded from main-episode playback measurements, but the initial tests were insufficient to assess advertising.

## Evidence

Evidence directory: `C:/Users/User/.codex/visualizations/2026/11/12/01a1cf61-2398-7930-9255-fd4bab6da80f/`.

- `anime-reliability-summary.json` normalises the advertising messages (their event detail is an object; the message type identifies the ad).
- `anime-long-solo-results.json` and `anime-long-link-click-results.json` contain timestamps, media samples, caption/quality metadata, checks, advertising responses and parent-window messages.
- `anime-long-solo-continuous.png` and `anime-long-link-click-continuous.png` show main-episode playback.
- `anime-long-solo-late.png` and `anime-long-link-click-late.png` show the actual in-player adverts and Skip controls.
- `test-anime-reliability.mjs` is the repeatable probe. SDK calls are used for seeking/caption selection inside the test browser; production integration must use supported cross-origin messages or the player's own UI.

Primary player code inspected: https://supaplay.fun/public/anilist/play.js . API documentation: https://supaplay.fun/ . JW Player test-method reference: https://docs.jwplayer.com/players/docs/jw8-reference .
