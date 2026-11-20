# Dedicated anime and donghua catalogue research

Checked 15 November 2026. Research only; no catalogue or playback integration was changed.

## Current Sidflix findings

The full Anime discovery index uses TMDB animation genre 16 plus original language `ja`. The parser independently excludes other languages. Chinese animation cannot pass this classification even if the current playback provider lists it.

Solo Leveling is present in the local classification snapshot as TMDB TV 127532, original language `ja`. Live local `/api/anime?q=solo%20leveling` and `/api/tv-shows?q=solo%20leveling` both returned no items. It is therefore not enough merely to relax the language rule: the current provider-catalogue match is also failing for this title. Solo Leveling is a Japanese-produced anime adapted from a South Korean original, not a Chinese production.

## Recommended catalogue: AniList

The public GraphQL endpoint https://graphql.anilist.co responded HTTP 200 to a single read-only query without credentials. Its anime query supports country-of-origin filters, English/romanised/native titles, artwork, ratings, relationships, episode metadata and external links.

Live samples:

- Solo Leveling: AniList 151807, country JP.
- Link Click: 126403, CN.
- The Daily Life of the Immortal King: 114121, CN.
- To Be Hero X: 156092, CN.
- Lord of Mysteries: 137667, CN.
- The King’s Avatar: 98861, CN.
- Lookism: 158539, KR.

Use query-driven discovery and detail lookups rather than copying the database. AniList’s terms prohibit hoarding/mass collection and use in competing non-complementary list/tracker services. Review the intended product use before a broader integration or commercial launch; this research did not establish permission for every future Sidflix feature.

## Chinese-focused supplement: Bangumi

The official public API repository is https://github.com/bangumi/api and its API reference is https://bangumi.github.io/api/ . A read-only POST search to `https://api.bgm.tv/v0/search/subjects?limit=3` for `斗罗大陆`, animation type 2, returned HTTP 200 and Soul Land subjects 199425, 252950 and 294773. It is useful for Chinese names, aliases and animation/episode metadata. The documented search interface is experimental; keep its adapter isolated.

## Playback distinction

AniList and Bangumi are catalogue sources, not episode-video hosting APIs. Adding posters and searchable titles does not establish playback. Retain clear identities when mapping title/year/season to a video source, and test actual episodes separately. Never treat a loaded embed or a catalogue listing as video success.

For an official viewing-library reference, WeTV’s Anime channel lists Chinese series such as Soul Land, Swallowed Star, Renegade Immortal, Perfect World and Throne of Seal. Its pages distinguish Free and VIP content. No public free third-party playback integration was verified in this research.

## Proposed Sidflix scope

Broaden Anime discovery to Japanese anime, Chinese donghua and Korean animation, with optional region filters. Use dedicated catalogue aliases for search and retain the current layout. Connect only correctly matched, playable episodes; preserve fallback discovery when one metadata service is unavailable. AniList season/sequel entries must be mapped deliberately to Sidflix’s TV season model, rather than assuming their IDs or episode numbering are interchangeable.

## Primary references

- https://docs.anilist.co/reference/query
- https://docs.anilist.co/reference/object/media
- https://docs.anilist.co/guide/graphql/queries/media
- https://raw.githubusercontent.com/AniList/docs/master/docs/guide/terms-of-use.md
- https://github.com/bangumi/api/blob/master/open-api/v0.yaml
- https://www.sony.com/en/SonyInfo/IR/library/corporatereport/CorporateReport2025_E.pdf
- https://wetv.vip/en/explorar?__cv=2&category_value=0&first_category=3

## Follow-up: dedicated episode playback trial

The practical solution needs both broader catalogue coverage and an anime-specific episode player. Merely adding AniList metadata will not resolve video availability.

SupaPlay’s documented AniList-ID endpoint was tested in disposable Edge profiles with the existing iframe restrictions retained (scripts, same-origin, forms and presentation allowed; popups and top navigation not granted). Actual main-episode observations:

| Series | Episode | Decoded frame | Actual time reached | Video duration |
| --- | --- | --- | --- | --- |
| Solo Leveling (AniList 151807) | 1 | 1920×1080 | 19.58s | 1420.00s |
| Solo Leveling | 2 | 1920×1080 | 19.27s | 1421.96s |
| Link Click (AniList 126403) | 1 | 1920×1080 | 16.80s | 1396.76s |
| Link Click | 2 | 1920×1080 | 15.32s | 1415.60s |

These were separate episode loads, not an observed automatic handoff. Playback began after startup delays, approximately forty seconds for the Solo Leveling pair in this run. Brief six-second loading videos were excluded from episode-playback results. The inspected captures showed animated programme content. FREE and Zoro markings were visible; this is not an unbranded-player result. Audible audio, complete caption coverage, pause/seek, automatic transitions, a full episode and absence of later adverts were not established. There is no claim that every anime or donghua is available.

NikaStream’s documented embed delegated to a player that rejected the retained iframe restrictions. AnimeEmbed’s own documentation requires removing those restrictions and allows operator-enabled ads. Neither is recommended for the current protected trial.

The existing VidSpark Solo Leveling TV route loaded a 1280×720 video with a plausible episode runtime, but this check did not observe advancing playback or forwarded progress events. Discovery-feed absence alone is therefore not proof that an embed does not exist, but loading metadata is not successful playback either. Its nested player also did not inherit the requested sky-blue theme in this sample.

Recommended next integration scope: retain existing movie/TV behaviour; expand the Anime area to Japanese, Chinese and Korean animation; use a dedicated anime catalogue and exact AniList season/episode identifiers for a manually reviewable SupaPlay option. Do not make untested claims about ads, auto-next, theme customisation or whole-catalogue availability. No production player or catalogue source was changed during these research checks.

Primary player documentation: https://supaplay.fun/ , https://nikastream.blog/embed-api , https://animeembed.com/ . Evidence: `anime-dedicated-source-pairs.json`, `anime-source-solo-pair.png`, `anime-source-link-click-pair.png` and `solo-leveling-current-player-results.json` under `C:/Users/User/.codex/visualizations/2026/11/12/01a1cf61-2398-7930-9255-fd4bab6da80f/`.

## Extended test supersedes the short-trial recommendation

See `docs/supaplay-reliability-test.md`. Longer protected-browser tests observed real opening and mid-episode adverts in both series. SupaPlay is therefore rejected as the default for Sidflix’s ad-free goal. Playback, pause/resume, English captions and consecutive episode loads worked in the tested samples, but the presence of in-player adverts is a separate failed requirement. The earlier description of brief startup videos as loading animations was too certain: this longer run confirmed preroll video ads of similar duration. No production integration was made.

Further alternatives and protected-player checks are recorded in [anime-player-alternatives.md](anime-player-alternatives.md). Yenime is a promising trial candidate, with actual 1080p Solo Leveling and Link Click playback observed, but it contains popup-ad code. VidSync remains a manual-verification lead because its player explicitly refuses automated browsers. Neither is established as universally ad-free.
