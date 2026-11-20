import assert from "node:assert/strict";
import { test } from "node:test";
import type { FilmTitle, SeriesTitle } from "../src/lib/catalog";
import { isVisibleInBrowse, SHOW_LOCAL_LIBRARY } from "../src/lib/library-visibility";

const movie: FilmTitle = { id: "online-1", kind: "film", title: "Example", niche: "indie", maturity: "16+", year: 2020, minutes: 90, synopsis: "", art: { from: "#000", to: "#111" }, remote: { provider: "vidspark", tmdb: 1 } };

test("laptop titles and gaming are hidden while online titles remain visible and data is retained", () => {
  const local: FilmTitle = { ...movie, id: "local-123", remote: undefined, local: true, video: "/api/library/local-123/stream" };
  const series: SeriesTitle = { ...movie, id: "local-series", kind: "series", seasons: 1, episodeMinutes: 24, remote: undefined, episodes: [local] };
  assert.equal(SHOW_LOCAL_LIBRARY, false);
  for (const title of [local, series, { ...movie, id: "lib-remote-library" }, { ...movie, niche: "gaming" as const }]) assert.equal(isVisibleInBrowse(title), false);
  assert.equal(isVisibleInBrowse(movie), true);
  assert.equal(isVisibleInBrowse({ ...movie, niche: "anime" }), true);
  assert.equal(local.video, "/api/library/local-123/stream");
  assert.equal(series.episodes?.[0], local);
});
