import assert from "node:assert/strict";
import { test } from "node:test";
import { parseIptvPlaylist, playlistLinks, publicStreamUrl } from "../src/lib/iptv-playlist";
import { getSportsChannels, getMovieChannels, getLiveTvChannels } from "../src/lib/sources/iptv";

test("sports M3U handles CRLF and excludes feeds requiring headers or insecure transport", () => {
  const list = '\uFEFF#EXTM3U\r\n' + [
    '#EXTINF:-1 tvg-id="Test.uk@HD" tvg-logo="https://cdn.example.com/logo.png",Test Sport (720p) [Not 24/7]',
    'https://cdn.example.com/live.m3u8',
    '#EXTINF:-1 tvg-id="Http.uk",Insecure', 'http://cdn.example.com/live.m3u8',
    '#EXTINF:-1 tvg-id="Headers.uk",Custom headers', '#EXTVLCOPT:http-referrer=https://example.com', 'https://cdn.example.com/headers.m3u8',
    '#EXTINF:-1 tvg-id="Agent.uk" http-user-agent="Custom",Custom agent', 'https://cdn.example.com/agent.m3u8',
    '#EXTINF:-1 tvg-id="Last.uk",Last feed', 'https://cdn.example.com/last.m3u8',
  ].join('\r\n');
  const entries = parseIptvPlaylist(list);
  assert.deepEqual(entries.map((entry) => entry.id), ["Test.uk@HD", "Last.uk"]);
  assert.equal(entries[0].name, "Test Sport");
  assert.equal(entries[0].logo, "https://cdn.example.com/logo.png");
});

test("playlist links resolve nested paths and keep only public HTTPS endpoints", () => {
  assert.deepEqual(playlistLinks('#EXTM3U\n#EXTINF:6,\n../seg/one.ts\n//video.example.com/two.ts\nhttp://example.com/no.ts', 'https://cdn.example.com/live/index.m3u8'),
    ['https://cdn.example.com/seg/one.ts', 'https://video.example.com/two.ts']);
  for (const value of ['file:///C:/movie.mp4', 'https://127.0.0.1/a', 'https://localhost/a', 'https://box.local/a',
    'https://[::1]/a', 'https://user:password@example.com/a', 'https://example.com:444/a', 'not a url']) {
    assert.equal(publicStreamUrl(value), null, value);
  }
});

test("sports line-up exposes playable channel records without fictitious match data", () => {
  const channels = getSportsChannels();
  assert.ok(channels.length >= 2);
  assert.equal(new Set(channels.map((channel) => channel.id)).size, channels.length);
  for (const channel of channels) {
    assert.equal(channel.kind, "tv-channel");
    assert.equal(channel.category, "sports");
    assert.equal(channel.maturity, "16+");
    assert.ok(channel.streamUrls.length > 0);
    assert.ok(channel.streamUrls.every((url) => publicStreamUrl(url)));
    assert.ok(Number.isFinite(Date.parse(channel.checkedAt)));
    if (channel.logo) assert.ok(channel.logo.startsWith('/media-channels/'));
  }
});

test("movie and sports feeds remain distinct, with one live TV entry per channel", () => {
  const movies = getMovieChannels();
  const channels = getLiveTvChannels();
  assert.ok(movies.length > 0);
  assert.ok(movies.every((channel) => channel.category === "movies" && channel.niche === "indie" && channel.streamUrls.length > 0));
  assert.equal(channels.length, movies.length + getSportsChannels().length);
  assert.equal(new Set(channels.map((channel) => channel.id)).size, channels.length);
  const movieSphere = movies.find((channel) => channel.title === "MovieSphere");
  assert.ok(movieSphere);
  assert.ok(movieSphere.streamUrls.every((url) => publicStreamUrl(url)));
});
