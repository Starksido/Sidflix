# Playback colour audit

Sidflix's playback accent is `#72CEFA`. A yellow video timeline is a provider skin, not an account setting or a failed Sidflix stylesheet. Parent-page CSS cannot recolour a cross-origin player.

## Findings (16 November 2026)

- The main VidSpark player accepts `theme=72CEFA` and renders the actual seek and volume fills as `rgb(114, 206, 250)`. Confirmed in a live Supernatural S1 E1 player with decoded 1280px video and a seek to 120 seconds.
- On stream failure, its app replaces the player with a CDN iframe, omitting the original query string. That wrapper also stops responding to the player SDK and does not relay its child's messages. The CDN's own player supports the same `theme` parameter, but does not inherit it automatically.
- EmbedWave's Multi HD wrapper does not forward colour parameters to its selected Nxsha player. Nxsha defaults to yellow. Its working parameter is **`color=%2372CEFA`**; `theme`, `primaryColor` and `accentColor` do not work. Fetching the actual themed player confirmed `--player-accent:#72cefa`, and the live browser confirmed that value on its controls.
- VidSrc's current outer endpoint strips these colour parameters before requesting its inner player. Its current documentation does not expose a supported colour override. Its protection also interferes with browser inspection. Do not claim its video timeline is controllable by Sidflix.
- The CDN can fall back again to another external player (observed `player.vidprime.top`). That further player does not inherit the accent either. No CSS injection, video colour filters, arbitrary URL proxying or removal of working sources is used to hide this limitation.

## Changes

`useThemedSparkPlayer` keeps the primary player as the default. It watches for the provider's known failover behaviour: one nested iframe plus cessation of primary SDK responses. After a short confirmation window it owns the supported CDN URL directly, passing the same title/episode, sky-blue theme and last validated playback position. Monitoring remains active for failures during a long film. Valid ongoing SDK responses prevent a hidden iframe from being treated as a failover. Each mounted title/attempt can transfer only once.

Only the current supported player window may supply resume state. Unrelated windows, wrong origins, malformed or short advert progress are rejected. The fullscreen shell and episode queue remain mounted. Playback intent is retained; an explicit pause is respected. TV autoplay sends readiness and play requests to the actual current origin after a handoff.

Alternative 1 now embeds the **same previously selected Multi HD backend directly**, with its working colour parameter. Its existing internal server/quality controls remain available; the redundant EmbedWave server wrapper is omitted. Alternative 2 remains available with its original behaviour. Deeper unsupported fallbacks can still use their own colours; a uniform appearance across every external player requires provider support or replacement of those players.

## Verification

- Player-theme, episode autoplay/credits and movie-message tests passed (10 checks).
- A controlled browser failover verified the themed CDN URL, retention of position 125 seconds, unchanged native fullscreen, and the Alternative 1 URL. The fixture reproduces the wrapper's lack of message forwarding.
- Live browser inspection separately verified the main player's real seek-bar colour and the alternative backend's accent. Controlled fixtures are not evidence that an arbitrary remote film is playable.

Primary references: [VidSpark theme documentation](https://vidspark.to/#docs), [EmbedWave parameters](https://embedwave.cc/docs), [VidSrc current parameters](https://vidsrc.sh/vidsrc/docs/). Actual served provider bundles and runtime browser measurements were also inspected; provider behaviour can change independently of Sidflix.
