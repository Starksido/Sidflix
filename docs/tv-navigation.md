# TV browsing and fullscreen playback

Updated 16 November 2026.

TV browsing uses the whole card as the selection. Left and Right move through a rail, Up and Down move between rows, and OK activates the title. The selected card scrolls into view after its layout updates. Returning to a row remembers its selected card. Lazy sections can receive focus while loading, then transfer it to the first available card.

Remote mode activates on directional or OK input and on recognised TV browsers. It hides the pointer, row paging arrows, separate play icons and auxiliary browse links. The category cards and header remain available. Mouse interaction restores pointer browsing. The search keyboard appears for remote use or the explicit TV search route; its edge keys can move to the results. Desktop text inputs retain typing and caret navigation.

The episode guide supports remote scrolling and a season picker that uses arrows, OK and Back. Closing a dialog returns focus to the selected catalogue card. Common Android, Samsung and LG Back/OK key codes are normalised alongside browser arrow keys. The fullscreen Next icon appears on pointer movement and hides after 2.5 seconds of inactivity; remote focus also reveals it.

Selecting a playable film or episode requests native fullscreen during the original user action. Where fullscreen is denied or unsupported, the player fills the browser viewport. Re-entering fullscreen uses the existing shell; episode transitions retain the dialog and iframe. An icon-only Next episode button at the top left advances without confirmation. Up from the player stage selects this button, or the Exit fullscreen control for a film. Down enters the embedded player's own controls.

Cross-origin embedded players own their internal keyboard handling. Sidflix cannot intercept keys dispatched inside those frames; the browsing navigation and Sidflix controls operate in the parent page. Physical TV remote behaviour still needs confirmation on the target TV browser.

Original poster and backdrop choices are retained. Card changes affect borders, corners, shading, typography and the focused selection only.

Validation uses disposable Edge profiles, genuine CDP keyboard/pointer input and native browser fullscreen. Player media is replaced with a controlled cross-origin iframe fixture for these UI checks; they do not measure external stream quality or uninterrupted playback. Evidence is stored in the session's visualization directory: `tv-remote-fullscreen-results.json`, `tv-card-navigation-results.json`, `tv-card-highlight.png`, `tv-remote-episodes.png`, and `tv-fullscreen-next-icon.png`.

All 64 Node regression checks passed, including an adjacent-row case that prevents a wide loading row being skipped for a later card. Browser checks passed for 18 player/fullscreen behaviours, 12 browsing behaviours and 3 delayed-loading behaviours. The delayed response test holds the TV catalogue response for 6.5 seconds, verifies that Down selects its loading row, then verifies automatic transfer to a title without another press. Evidence: `tv-loading-row-results.json`.
# Episode-list focus recovery (17 November 2026)

The 1280×720 regression check also exposed a separate visibility failure: focus reached episode 10 while the dialog remained scrolled near episode 1, or stopped short of revealing the row. Episode rows now scroll their own dialog immediately using its visible bounds. They do not scroll the background page or wait for an animation frame. The episode list observes size changes so font loading, changing row heights and TV viewport changes keep the selected row visible. The same list component covers online and retained local guides.

The final TV-size check passed all focus cases, visible selection of S1 E10, movement back to E1, Android-style Down events, and OK opening E10 fullscreen. For that isolated UI regression, the guide was a freshly captured real 22-episode response replayed into the browser; the live guide endpoints were checked separately. This avoids treating intermittent metadata loading as a navigation failure. Video playback itself used an iframe fixture, not an assertion of provider availability.

Reproduced a TV input failure in the production build: dispatching ArrowDown at `document` while episode 1 held focus raised `TypeError: ...matches is not a function` and left episode 1 selected. Giving focus to a span inside an episode row also failed to advance. Losing focus inside the open guide caused the next arrow to select Close episodes instead of continuing down the list.

The remote controller now resolves page-level events to the active control and episode-row contents to their parent episode button. Each open episode dialog remembers its last focused control. Lost focus is restored within that dialog, without returning to episode 1 or the background page. Focus recovery is limited to the Sidflix episode guide; embedded player documents retain their own controls.

Verified with the real Supernatural season-one guide (22 episodes), a TV user agent and remote-only input: reach episode 10; move up to episode 1; continue after document-level, nested-content and lost-focus events; reach episode 10 using Android key code 20; press OK to open S1 E10 fullscreen. No synthetic source data was used for the guide. Playback used a local iframe fixture to verify episode selection and fullscreen without loading third-party adverts. The existing four remote-navigation tests also passed.

