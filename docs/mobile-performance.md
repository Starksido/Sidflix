# Phone loading and playback investigation

The phone could reach Sidflix over HTTP but reported slow browsing and video buffering. Those are separate paths: Sidflix serves its own interface and artwork, while remote movie/episode iframes fetch video from the external player. Interface measurements alone do not establish stream reliability on the phone.

## Observations before changes

A fresh private Edge profile used a 390×844 viewport, 100ms simulated network latency, 375,000 bytes/second download throughput (3Mbps), 125,000 bytes/second upload throughput and 4× CPU slowdown. At sixteen seconds, the guest home page had 8,534 DOM elements, 545 image elements, seventy requests and 1,411,052 encoded downloaded bytes. First contentful paint was 1,688ms. The lower movies, TV and full genre collections all requested data immediately; the genre response alone was about 141KB. Each expandable feature card mounted both poster and backdrop artwork even though one was invisible.

This is a desktop browser simulation, not a measurement of the user's actual phone or Wi-Fi. Results also depend on upstream and server artwork caches.

During the production build, the TV provider returned HTTP 522 and stopped the home-page prerender. A later direct check returned HTTP 200 in 1.3 seconds. This establishes intermittent catalogue-service trouble; it does not establish the cause of every video stall.

## Changes

- Home rows keep their existing order and anchors but mount when within 300px of the viewport. Genre rows are also individually deferred. Revealed sections remain mounted.
- Each feature card mounts one artwork image, selecting poster or backdrop according to its focused state. It retains the existing expansion and card interactions.
- Navigation and genre cards stop speculative route prefetching. Browsing fetches abort or wait while a player is open, then resume when it closes without reloading completed results.
- Frequent account progress writes return a small saved acknowledgement rather than the account's entire history. Account history refreshes wait during video playback; actual progress recording and writes continue.
- Profile and identity subscriptions return stable selected values, so progress updates do not rerender unrelated browsing cards and profile controls.
- The hidden laptop library is no longer scanned or serialized into the home catalogue. Its configuration, saved files and playback paths remain available when the visibility switch is restored.
- A validated TV-provider index is saved on the server. A snapshot younger than six hours avoids the full network crawl; on a refresh failure, the last valid snapshot is retained for up to thirty days. An outage without a usable snapshot returns a bounded empty provider list inside the cached source, while explicit TV browsing/guides report temporary unavailability. The implementation does not invent availability or title names.
- Movie and episode player frames use a shorter minimum height on phones, retaining the desktop and fullscreen layouts.

## Verification and evidence

Targeted tests cover account separation and synchronisation after the smaller progress response, recommendations, episode navigation and credit markers. Snapshot tests verify validation, no network calls for a fresh saved index and recovery from a simulated provider timeout. Temporary test databases, directories and browser profiles are used instead of the user's browser profile.

Performance evidence lives under `C:/Users/User/.codex/visualizations/2026/11/12/01a1cf61-2398-7930-9255-fd4bab6da80f/`: `mobile-performance-before.json`, `mobile-performance-after.json` and `mobile-performance-interactions.json`.

The interaction check uses a labelled local iframe fixture for the external player. It tests deferred loading, pausing/resuming collection fetches, anchor uniqueness and phone layout; it does **not** test the upstream video or prove buffering is fixed. No unsupported quality URL parameters, source change, popup-permission relaxation or video proxy were added.

## Measured result

With a warmed server, a fresh guest browser and the same sixteen-second simulated-phone measurement, transferred bytes fell from 1,411,052 to 506,373 (64% less), requests from seventy to twenty-five, DOM elements from 8,534 to 204 and image elements from 545 to two. First contentful paint was 1,224ms versus 1,688ms. The initial cold-server run, captured separately as `mobile-performance-after-cold.json`, painted at 9,076ms during concurrent startup checks; the warm comparison is not a guarantee of cold-start time or the user's phone performance. Actual data usage varies as the user scrolls and signs in.

Ten browser interaction checks passed for deferred startup, one artwork per card, phone player size, suspending and resuming collections during playback, retaining all fourteen genre cards, unique anchors, accessible show controls and horizontal overflow. The harness was corrected to wait for an interactive hero before clicking Play; its first attempt clicked server-rendered markup before hydration and timed out. Targeted account, recommendation, episode and snapshot tests also passed.

## The Big Bang Theory S1E1

Two source checks produced different outcomes. The initial root-page-limited test started around twenty-four seconds and sampled ninety seconds of advancing 1920×1080 video without a stalled sample. The stricter repeat explicitly applied the same 3Mbps/100ms limit to the embedded player's target as well: main video was first observed advancing at 109.7 seconds, reached 47.1 seconds by the end of the run and had four stalled five-second samples. No human-verification warning or popup was observed. These are browser simulations, not phone measurements, full-episode tests or proof of a single network cause.

A quality-menu check exposed Auto and 1080p only; no selectable 720p entry was found in that sample. This did not establish smooth playback at a lower resolution, so the app does not claim to force a nonexistent 720p rendition. The evidence is `big-bang-s1e1-phone-results.json`, `big-bang-s1e1-phone-verified-results.json`, and `big-bang-s1e1-720p-results.json`. UI bandwidth reductions help avoid competition with playback, but that episode source's startup/limited-connection behaviour remains a material limitation.

The final production build passed and was restarted on the same Wi-Fi address. Eleven account/recommendation browser checks passed again after the stable profile subscriptions, with no browser runtime exceptions. The temporary QA account was removed. Phone-address checks returned HTTP 200 for home/account pages, 401 for unauthenticated private preferences and 404 for a direct database-file request. The existing iframe popup restrictions, episode identity checks, auto-next and sky-blue playback theme remain in place.
