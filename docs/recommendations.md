# Personal recommendations and accounts

The home page places Recommended for you directly after Continue watching. Guests see an invitation to sign in. `/account` supports real email/password registration, persistent sign-in and sign-out through Better Auth 1.7.7. Passwords use the library's password hashing and sessions use its cookies; the application does not invent its own authentication protocol.

## Account storage and separation

The active server account adapter uses Node's built-in SQLite driver. Run `npm run accounts:setup` once to initialize the auth tables and `account_taste` table and generate a private secret if needed. The former Neon settings were placeholders, so no remote database was modified. Database files and local configuration are ignored by Git. Set `SIDFLIX_ACCOUNT_DB` to a persistent disk path when hosting; ephemeral serverless disks are unsuitable. All devices must reach the same Sidflix server and use the same account. This work does not publish a public site, add paid subscriptions, email delivery, verification or password-recovery emails.

Every private API request validates the server session. User IDs in client payloads are only checked for account-change races; they never select whose database row is accessed. Mutations require the same origin. Responses use `Cache-Control: private, no-store` and `Vary: Cookie`. Guest requests receive 401. Request size, history size, feedback size, metadata fields and artwork origins are bounded. Account switching closes the current player and selects a separate browser cache; old guest history is not silently assigned to a newly registered account. The existing single sydo profile remains the guest identity.

History updates merge in short database transactions, keeping the greatest observed watch time for an episode rather than replacing another device's history. This conservative merge avoids double-counting overlapping device playback. Daily mood, feedback and options sync immediately; playback syncs about every ten seconds and on player close, with a best-effort final update on page exit. The signed-in client refreshes from the server every thirty seconds while visible and on focus/reconnection. Pending changes are retried in that account's browser cache. A reset cutoff prevents an offline device from restoring pre-reset viewing records.

## Custom ranking

This is a deterministic content-based ranker, without an external AI service or collaborative tracking of other users.

- Viewing affinity uses actual advancing playback, watched seconds, completed items, episode patterns, format and viewing time of day. Interest fades with a 45-day half-life. Each series' influence is capped so a long binge cannot endlessly outweigh everything else.
- Seeking, rewinding, paused time, opening a title and unknown elapsed intervals do not manufacture watch time. Progress-capable players pass known durations. Player messages must come from the selected frame, an allowed origin and the expected title identity. Ads shorter than three minutes do not qualify as programme progress. A provider which sends no supported progress events cannot teach reliable viewing patterns; likes and mood choices still work.
- Film, series and episode aliases share a canonical work key. Episodes are not separate discovery cards. Completed films, recent in-progress works, hidden laptop content, fictional placeholders, future-year releases and maturity-restricted titles are excluded.
- The strongest personal term contributes up to .52 of a score. Quality contributes .16–.28 depending on how much history exists; ratings are weighted by vote confidence. Mood contributes up to .22, calendar context .08, weekly trending .07 and stable daily discovery .035. Likes add .12. These are weighted terms, not percentages of a user's viewing behaviour.
- Genre affinity and explicit likes shape taste. Disliked titles disappear and gently reduce their genres' affinity; Undo reverses the feedback. Greedy reranking penalizes repeated similar genres and long runs of one format, while preserving relevance.
- A new account starts with quality, context and daily discovery, then becomes personal as it watches or likes titles. The daily seed is stable within that account/day, so refreshing does not randomly reshuffle everything.

The public discovery pool combines genre-balanced TV entries, genre collections, popular and highly rated movies and verified weekly-trending metadata. Its shared cache contains no personal history or ranking. Source failures leave available titles and the existing home catalogue usable.

## Mood, seasons and current context

Viewers can choose cosy, exciting, curious, heartfelt, escapist or suspenseful picks. A mood is explicit, not an inferred mental-health/emotional assessment, and expires on the viewer's next local calendar day. For me returns to general taste.

Optional calendar themes cover festive films, New Year, Valentine's, Halloween and Earth Day. Northern and southern seasonal settings invert summer/winter; unknown/equatorial zones use neutral themes. The user can override the setting or turn seasonal context off. Time-zone inference is coarse; it is not geolocation or live weather.

Weekly trending reflects current catalogue interest, not verified news events. Expiring editorial event windows are supported by `editorialEvents` in `recommendation-context.ts`; the initial list is empty. No headline scraper or automatic claims tying films to real-world news have been added. Lunar/moving holidays are not assigned guessed dates. Seasonal context remains a small influence beside personal taste.

Fine-tune your picks includes seasonal/trending switches, hemisphere selection and an explicitly confirmed reset of this account's recommendation history and preferences.

## Verification

`tests/recommendations.test.ts` covers contrasting tastes, daily mood expiry/time zones, seek accounting, completion, alias deduplication, hidden content and maturity, cold starts/vote confidence, seasonal windows and input validation. `tests/account-recommendations.test.ts` uses a disposable database and real auth sessions to verify two logins to one account sync, another account stays empty, guest/cross-origin/mismatched-account requests fail, concurrent history updates retain watch time, payloads are bounded, old offline data cannot reverse a reset, and stored passwords do not contain the original password. No user credentials or browser profiles are used by these tests.

Primary references: [Better Auth email/password](https://better-auth.com/docs/authentication/email-password), [Node SQLite adapter](https://better-auth.com/docs/adapters/sqlite), [TMDB popularity and trending](https://developer.themoviedb.org/docs/popularity-and-trending). Installed Next.js guides for client boundaries, route handlers, caching and authentication were read before implementation.

The full test suite passed (58 tests). A disposable private-browser run passed 11 further checks: guest invitation/API denial, registration and signed-in cards, account-only visibility, server-saved mood, settings, dislike/Undo, mobile overflow, reload persistence and sign-out. Desktop and 390px mobile screenshots were inspected; no browser runtime exceptions were recorded. Its temporary QA account was deleted afterward. Build tracing explicitly excludes private database files and local environment files.
