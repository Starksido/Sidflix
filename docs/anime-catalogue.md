# Anime catalogue and playback check

Checked 2026-11-15. The catalogue contains 96 provider-listed Japanese animated
series, matched against the complete TMDB classification index (275 pages at the
time of the scan). The first index build took approximately 20 seconds. The daily
snapshot is ignored by Git and keeps subsequent catalogue requests fast.

Implemented and verified:

- `/anime` and `/api/anime`, full-index title/original-name/provider-alias search,
  pagination, Popular/Top Rated/Recently Updated/A–Z sorts, posters and series cards.
- Existing episode guide, aired seasons/episodes and previous/next navigation.
- Home and global-search anime cards now open the episode browser.
- Top 10 and Anime occur before the online TV preview. Gaming is removed from
  navigation, home, metadata and search-source calls.
- Laptop library cards, links and saved local Continue Watching rows are hidden.
  Folder configuration, files, stream endpoints and history remain intact.
- Production build, changed-file ESLint, all 37 tests, live API checks and 11
  browser UI assertions pass.

## Current source-side playback blocker

Actual anime video playback could not start in either a temporary private or a
fresh normal browser profile. Naruto S1E1 and Jujutsu Kaisen S1E59 both follow:

`vidspark.to → cdn.vidspark.to → player.vidprime.top`

The final host loads an error frame. A direct request to the Naruto embed at that
host returned HTTP 301 with a Location equal to the same HTTPS URL, confirming a
redirect loop. No video element or advancing media time was observed. Catalogue
membership therefore does not establish current episode playability.

No source was silently substituted and popup restrictions remain enabled. The
provider host must recover, or a working alternative must be selected before
claiming anime playback passes. Existing manual episode navigation is verified;
native completion-driven auto-next could not be exercised against a playing anime.

Evidence is in the session artifact directory:
`C:/Users/User/.codex/visualizations/2026/11/12/01a1cf61-2398-7930-9255-fd4bab6da80f/`:
`anime-ui-results.json`, `anime-provider-frame-details.json`,
`kaisen-provider-frame-details.json`, and the `anime-*.png` captures.
