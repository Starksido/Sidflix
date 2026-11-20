# Episode transitions and playback theme

Implemented 15 November 2026.

- VidSpark movie and episode embeds use the documented `theme=72CEFA` setting. The default player timeline and Sidflix watch-progress indicators use the sky-blue playback accent.
- TV playback is keyed by series, not episode. The dialog, fullscreen shell and iframe element remain mounted as episode URLs change. Selecting a playable title requests Sidflix-owned fullscreen in the original click or OK event. Fullscreen entered inside a third-party frame is owned by that frame and may exit on navigation.
- Auto-next uses episode-specific published credit markers from IntroDB, resolved via the series IMDb identifier. No fixed remaining-time heuristic is used.
- Only exact episode identities, finite reasonable timings, published confidence of at least 0.9 and a positive submission count are accepted. Known post-credit scenes and explicit no-outro entries disable early switching.
- A credit marker must end within five seconds of the actual playing video’s duration. Different edits are not scaled or guessed. Missing, unavailable or mismatched data falls back to the real ended event. This conservative match can leave credits playing for some releases.
- An initial load, a seek alone, a stale end message, or a short advert must not advance the series. Real forward progress is required after loading a new episode. Auto-next can be disabled and its preference is retained.
- Attribution is on the separate Credits page. No new source names are shown in the player.

## Validation

Production build and lint passed. All 47 existing and new Node checks passed. A disposable Edge browser passed 18 transition checks: exact credit boundary, runtime mismatch, missing markers, stale end messages, next/previous across seasons, fullscreen DOM identity, disabled auto-next, final episode, mobile layout and the live marker endpoint. These transition checks use a controlled iframe fixture implementing the documented player messages; they do not establish uninterrupted upstream playback or a naturally observed credit-to-next transition.

A separate real embedded-player check confirmed the timeline fill `rgb(114, 206, 250)` and `--media-time-fill: #72CEFA`, with a decoded 1280×544 frame and real play/seek/timeupdate messages from the selected player. This was a brief check and not a whole-episode reliability test.

Live marker samples: The Blacklist S1 E1 returned credits 2672–2709 seconds; Breaking Bad S1 E1 returned 3431–3500; Tulsa King S1 E1 had no published outro marker. Community timings are not universal or independent verification of every release.

Evidence: `C:/Users/User/.codex/visualizations/2026/11/12/01a1cf61-2398-7930-9255-fd4bab6da80f/tv-playback-regression-results.json`, `tv-fullscreen-fixture.png`, `tv-player-mobile.png`, `live-player-theme-results.json` and `live-player-sky-blue.png`. Profiles used for browser checks were disposable; the user's browser state was not modified.

References: https://vidspark.to/ (theme and postMessage API); https://api.introdb.app/reference/get-segments/ (episode segments); https://api.introdb.app/open-data/ (attribution).

## Fullscreen hover refinement

The fullscreen episode menu is hidden and no longer takes space above the video. Exit fullscreen appears over the top-right corner on pointer hover or keyboard focus. Leaving that area hides it again. An icon-only Next episode button is available at the top left when another episode exists. Normal episode controls return after exiting fullscreen.

Build and component lint passed. Thirteen focused browser checks passed using a controlled player fixture and real pointer/fullscreen interactions: full-viewport video, hidden menu, exit-only hover display, continuous pointer leave, keyboard focus, auto-next keeping the controls hidden, exit click, and the normal mobile layout. Evidence: `fullscreen-hover-results.json`, `fullscreen-clean.png`, and `fullscreen-hover-exit.png` in the same evidence directory as above. No playback or marker logic changed in this refinement.

## Episode startup and pointer controls, 16 November 2026

Iframe load does not mean the asynchronous media player is ready. The episode player now polls the documented `getStatus` command, accepts only validated current-episode `playerstatus` messages with a real runtime, and requests Play after readiness. Requests stop on playback, explicit Pause, episode change, close, or a two-minute deadline. Status replies do not count as watch progress. No guessed autoplay URL parameter, hidden media clicks or mute/unmute workaround is used.

The fullscreen Next episode icon is hidden initially, appears on pointer movement and fades after 2.5 seconds of inactivity. Keyboard and TV remote focus reveal it. A temporary transparent motion sensor catches the first movement over the cross-origin iframe, then removes itself so subsequent pointer interaction reaches the video. On touch, the first tap while hidden reveals controls.

Eleven focused Node checks, component lint, TypeScript and eight delayed-player UI checks passed. Those UI checks cover late readiness, automatic episode startup, keeping fullscreen and iframe identity, preserving Pause, mouse visibility and remote focus. Evidence: `episode-autoplay-ui-results.json`.

A separate live test used normal Edge autoplay policies without the test flag that disables gesture requirements. Supernatural S1 E2 played after one initial Play press; after seeking near its actual ending and letting it end, S1 E3 loaded and advanced beyond four seconds with decoded 1280-wide video, `paused=false` and `muted=false`, without another Play interaction. This is a sampled transition, not a guarantee for every source or TV browser. Evidence: `supernatural-autoplay-live-results.json`. A fresh browser before any video interaction rejected unmuted playback with `NotAllowedError`; browser autoplay policy still applies.

References: [provider control API](https://vidspark.to/#player-api), [browser autoplay policy](https://developer.chrome.com/blog/autoplay/).
