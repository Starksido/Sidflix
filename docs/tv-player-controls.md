# Arrows-and-OK playback controls — 17 November 2026

The user reported controls requiring two OK presses and then being impossible to
operate with an arrows-and-OK remote. Two separate problems were reproduced.

## Fullscreen interception

The transparent fullscreen motion sensor consumed the first click and returned
after inactivity, consuming another click. The actual child player saw zero
clicks for the first action. It was removed. A 12px strip at the top edge reveals
Sidflix's floating buttons; video controls receive their first click. Remote
focus still reveals Sidflix buttons. Capturing every pointer movement in a
cross-origin video would require an interfering overlay; it is deliberately not
used again.

The before/after browser check measured real child clicks and video state. After
the fix, the first click reached the player, one Play/Pause click paused it, the
next resumed it, and another click after inactivity reached it too.

## TV player option

Nxsha's selected CastVid source plays Loki, but its web interface maps arrow keys
to seek/volume and does not expose play/pause in its parent messaging interface.
Its history interface supports progress and seeking. Revealing its own buttons
does not supply TV focus navigation. Do not add unsupported play/pause messages
to it or claim a working TV controller merely because buttons appear.

The new manual **TV player** option uses CineSrc's published command interface.
Standard and Alternative 1 remain available. The explicit choice is remembered
per series on this device; new series still start on Standard. The TV option has
Sidflix's own same-origin controls, so the remote stays in Sidflix:

- OK over the video plays/pauses; Left/Right seek ten seconds.
- Up/Down enters the control bar. Arrows select buttons and OK activates them.
- Up from the button row reaches the timeline; Left/Right adjusts it. OK/Down
  returns to the button row; Up reaches Playback options.
- Volume opens a range control. Arrows adjust it; OK/Back closes it. It cannot
  trap focus before the speed button.
- Back closes the bar before a subsequent Back exits fullscreen.

The bar shows acknowledged state, not an optimistic fake pause. It includes
play/pause, rewind/forward, timeline, mute, volume and speed. Sidflix's existing
Next and playback options remain reachable above it. A native full-window frame
is retained across episode changes, but each new TV episode gets a fresh iframe
WindowProxy, excluding queued messages from the prior episode.

Only the current CineSrc frame and exact origin may acknowledge commands.
Optional identity fields must match. Runtime bounds reject advert-length data;
paused seeking is not advancing watch progress. Metadata and getters do not
count as watching, and early ended events cannot advance the queue. A late iframe
load keeps an already acknowledged pause. Popup protection remains enabled.

The exposed interface does not include subtitle selection. TV mode keeps the
provider's subtitle defaults; there is no fake caption toggle in the host bar.
Do not claim remote control of subtitle or quality menus. Existing other playback
options retain their original controls.

Primary contract: [CineSrc player methods](https://cinesrc.st/docs). Actual browser
inspection confirmed its exposed methods, and real playback acknowledged play,
pause, seek, volume and speed commands. No stream extraction, challenge bypass,
arbitrary proxy or cross-origin DOM access is used by the application.

## Verification

Fourteen targeted unit checks passed. The browser check used the captured live
Loki guide and a Standard placeholder, with real CineSrc video and normal autoplay
policies. Arrows and OK selected TV player and operated actual video:

- One OK paused video at 3.077715s; it stayed paused. The next OK resumed through
  3.812408s. Left/Right, button focus, mute, volume and speed checks passed.
- A separate longer run played S1 E2 naturally through 70.333031s at 1920px
  width, with inspected images at approximately 10, 35 and 70 seconds showing
  Loki content and no previous 1xBet advert. These are sampled observations, not
  an entire-episode or catalogue-wide ad-free guarantee.
- Timeline navigation initially selected the distant top toolbar. Explicit
  vertical movement between the button row, timeline and options fixed it.
- The test's synthetic End key did not move the native range to its maximum.
  A normal documented API seek near the end was used to exercise the transition.
  The real video then ended; no ended event was fabricated. S1 E3 subsequently
  played automatically in the same native fullscreen shell, with a fresh frame.
- The sandbox remained enabled and the selected TV option was saved for Loki.

Evidence lives in
`C:/Users/User/.codex/visualizations/2026/11/12/01a1cf61-2398-7930-9255-fd4bab6da80f/`:
`player-interaction-before.json`, `player-interaction-after.json`,
`tv-remote-key-results.json`, `tv-remote-opening-*.png`,
`tv-remote-episode3.png`, and `cinesrc-gesture-check.json`.
`check-tv-remote-keys.mjs` and `check-player-interaction.mjs` reproduce the checks.

The full opening run later failed timeline navigation; that failure was fixed
and the control/transition sequence rerun. The final result JSON is the shorter
passing run. The opening images and recorded measurements above describe the
separate longer observation.
