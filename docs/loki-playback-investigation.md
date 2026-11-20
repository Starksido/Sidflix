# Loki playback investigation — 17 November 2026

Reported symptom: Loki season 1 episode 2 repeatedly redirects and never loads.

Sidflix's live episode guide returns the correct title, TMDB series 84958,
season 1 episode 2, “The Variant”. The requested player route is correct.

## Reproduced failure

An isolated browser iframe using Sidflix's popup restrictions, autoplay policy
and referrer settings reproduced the failure without Sidflix's player hooks:

1. The primary player's `/api/vidora/v1/tv/84958/1/2` request returns 404.
2. It loads its CDN fallback, whose source request returns 502.
3. That fallback loads `player.vidprime.top/tv/84958/1/2`.
4. The final server repeatedly returns a 301 redirect to the same URL. Chromium
   eventually stops with `net::ERR_TOO_MANY_REDIRECTS`; no video is decoded.

The season 1 episode 1 control follows the same failing chain. This is an
upstream source/fallback failure, rather than an incorrect episode number or a
redirect loop created by Sidflix. Sidflix's colour handoff can reload the CDN
once, but the independently reproduced self-redirect exists without it.

## Alternative test and decision

The existing alternative movie backend's TV embed played episode 2 in one
private-browser test: decoded video advanced from 4.259 to 12.071 seconds,
reported a 3,281-second runtime and 1,280-pixel width. Its audio selector showed
Hindi; English audio was not verified. These observations establish a short
successful opening, not full-episode availability or a fixed quality.

The initial repeat-test conclusion was incorrect: the test selected a hidden
blank/challenge execution context with the same origin, rather than the actual
`/embed/tv/84958/1/2` player. Selecting the context by its exact path confirmed
repeated decoded playback. No challenge was solved or bypassed.

## Sandbox rejection and TV backup

A later trace reproduced the user's exact error. The failing primary/CDN chain
now reached `cdn.vidprime.top/embed/tv/84958/1/2`, which returned 403 and navigated
to `/sandbox.php`: “This content can’t be embedded in a sandboxed frame”. This
is an upstream fallback policy, separate from the earlier self-redirect failure.

The alternative played with the existing sandbox retained. Its supported
`lang=en` query selected English automatically, decoded video reached 1,280px
width and advanced beyond 22 seconds with a 3,285.7-second runtime. This verifies
the selected English source and video playback; audible language was not
independently checked. Its `history=1` API emitted exact show/season/episode
progress to the explicitly configured parent origin.

TV now has a manual “Alternative 1” playback option, with Standard retained as
the default. The option keeps the fullscreen shell, Next/Previous buttons and
popup restrictions. English is preferred and the sky-blue accent is passed.
Its internal auto-next is initially disabled so Sidflix owns transitions; only
validated messages for the current frame, origin, history ID and exact episode
can update Continue Watching or trigger Sidflix auto-next. Unsupported or
external nested players cannot claim progress. No automatic source switch or
removal of the iframe sandbox is used.

## Evidence

Browser traces, the live guide, screenshots and test scripts are under
`C:/Users/User/.codex/visualizations/2026/11/12/01a1cf61-2398-7930-9255-fd4bab6da80f/`:

- `loki-source-trace.json`, `trace-loki.mjs`
- `loki-live-guide.json`
- `loki-primary-episode-2.png`, `loki-primary-episode-1.png`
- `loki-alternative-episode-2.png`
- `loki-backup-language.json`, `check-loki-backup.mjs`

The corrected language result file contains the actual player state and validated
history messages. The original source trace preserves the earlier redirect loop;
`loki-sandbox-trace.json` records the later 403 sandbox rejection.

The in-app browser test uses the captured live Loki guide and an inert Standard
placeholder to isolate the new option. Alternative video is real: episode 2
played with English selected, retained the sandbox and updated Continue Watching.
Next opened episode 3, which also played in native fullscreen. A normal supported
seek near episode 3's end produced the real ended message and advanced Sidflix to
episode 4 while retaining fullscreen. No completion event was fabricated. Sixteen
targeted unit checks, lint and TypeScript validation also passed.

## Fullscreen discovery fix

The user could not find the selector because fullscreen hides the regular
toolbar. Fullscreen now includes a Playback options button that stays visible
until validated playback advances, then hides on idle and returns on movement
or focus. Up from the player stage focuses it; OK opens it, Down selects the
alternative, and Back closes the menu without leaving fullscreen. Switching
keeps the same fullscreen shell. The menu remains available on the last episode.

The browser check verified this remote sequence, return to the player, hiding
after progress and revealing on pointer movement. Its screenshot also showed a
gambling advertisement in the alternative's opening video. Decoded video plus
matching episode metadata does not prove that the sampled opening is the episode
itself or ad-free. The alternative remains labeled “May include ads”; sandbox
protection blocks popups, not adverts contained in the supplied video.

## Replacing the betting-ad TV backup

After the user rejected the 1xBet promotion, three other server selections were
checked under the same sandbox. CastVid played Loki S1 E2 directly; the Citadel
and PureWave requests actually selected Nitro, so those are not independent
successful source results. The requested URL alone cannot establish which server
the provider ultimately selected.

TV Alternative 1 now explicitly prefers CastVid instead of AwsPly. The movie
alternative and the Standard default are unchanged. This is a server preference
in the existing official embed, not a proxy, stream extraction or an ad-skipping
timer. The provider can still change or fall back independently.

CastVid verification in Sidflix:

- The S1 E2 opening advanced naturally through 70.657 seconds. Inspected images
  at approximately 9, 21, 40 and 70 seconds showed Loki content without the
  previous gambling advert or betting watermark. A separate normal seek to
  two minutes showed the episode's Renaissance-fair scene.
- The player selected English and decoded 1920 × 804 frames, with a 3195.484-second
  runtime. Its actual accent was `#72cefa`. Audible language was not independently
  checked; dimensions do not guarantee a particular master or continuous quality.
- Manual Next started S1 E3 on CastVid, also at 1920px width. Its inspected opening
  showed Loki content. Seeking near that episode's actual end produced a real
  ended message; Sidflix automatically opened and played S1 E4 on CastVid while
  retaining native fullscreen. E3/E4 were short opening checks, not full episodes.
- Continue Watching updated, the sandbox remained enabled, and the targeted
  alternative-player/theme tests passed (5 checks), as did lint.

These are bounded samples, not a guarantee that every title or an entire episode
will be ad-free or continuously available. The playback-option label continues
to disclose that advertising is possible.

Evidence: `loki-other-servers.json`, `loki-CastVid-natural.json`,
`loki-CastVid-natural-*.png`, `loki-CastVid-120s.png`,
`loki-CastVid-episode3.png`, and `loki-CastVid-in-app-results.json` in the same
artifact directory. `check-castvid-in-app.mjs` reproduces the in-app check.
