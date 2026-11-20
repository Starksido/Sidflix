import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { test } from "node:test";
import ffmpeg from "ffmpeg-static";
import { findLocalMedia, getLocalMedia, mediaName, parseMediaRoots } from "../src/lib/local-media";
import { parseByteRange } from "../src/lib/media-range";
import { mediaDuration, mediaPlaylist, transcodeSegment } from "../src/lib/media-transcode";
import { GET, HEAD } from "../src/app/api/library/[id]/stream/route";
import { subtitleContent, subtitleTracks } from "../src/lib/media-subtitles";

const execute = promisify(execFile);

test("byte ranges handle seeking, suffixes and invalid requests", () => {
  assert.deepEqual(parseByteRange("bytes=2-5", 10), { start: 2, end: 5 });
  assert.deepEqual(parseByteRange("bytes=8-", 10), { start: 8, end: 9 });
  assert.deepEqual(parseByteRange("bytes=-3", 10), { start: 7, end: 9 });
  assert.deepEqual(parseByteRange("bytes=0-999", 10), { start: 0, end: 9 });
  assert.deepEqual(parseByteRange("bytes=-999", 10), { start: 0, end: 9 });
  for (const range of ["bytes=10-", "bytes=5-2", "bytes=-0", "bytes=-", "bytes=0-1,4-5", "bytes=1e3-"]) {
    assert.equal(parseByteRange(range, 10), null, range);
  }
  assert.equal(parseByteRange("bytes=0-", 0), null);
});

test("filenames preserve episode identities and remove release tags", () => {
  assert.deepEqual(mediaName("F1.The.Movie.2025.INTERNAL.1080p.HEVC.mp4"), { title: "F1 The Movie", year: 2025 });
  assert.deepEqual(mediaName("The.Big.Bang.Theory.S03E01.720p.AMZN.WEBRip.x264.mkv"), {
    title: "The Big Bang Theory S03E01", year: null,
  });
  assert.deepEqual(mediaName("Modern_Family_S05E01_Suddenly_Last_Summer_720p_WEB_HD_x264.mkv"), {
    title: "Modern Family S05E01 Suddenly Last Summer", year: null,
  });
  assert.deepEqual(mediaName("Unknown.webm"), { title: "Unknown", year: null });
  assert.throws(() => parseMediaRoots('[{"path":"relative"}]'));
  assert.throws(() => parseMediaRoots('{}'));
  assert.throws(() => parseMediaRoots(JSON.stringify([{ path: os.tmpdir(), recursive: "false" }])));
});

test("folder allowlist, streaming and compatibility conversion", async (t) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "sidflix-media-"));
  const original = process.env.LOCAL_MEDIA_ROOTS;
  const originalIndex = process.env.LOCAL_MEDIA_INDEX_PATH;
  process.env.LOCAL_MEDIA_INDEX_PATH = path.join(directory, "added.json");
  t.after(async () => {
    if (original === undefined) delete process.env.LOCAL_MEDIA_ROOTS;
    else process.env.LOCAL_MEDIA_ROOTS = original;
    if (originalIndex === undefined) delete process.env.LOCAL_MEDIA_INDEX_PATH;
    else process.env.LOCAL_MEDIA_INDEX_PATH = originalIndex;
    await rm(directory, { recursive: true, force: true });
  });
  const root = path.join(directory, "library");
  const nested = path.join(root, "season");
  const outside = path.join(directory, "outside");
  await mkdir(nested, { recursive: true });
  await mkdir(outside);
  const bytes = Buffer.from("0123456789");
  await writeFile(path.join(root, "Example.2025.mp4"), bytes);
  await writeFile(path.join(nested, "Show.S01E01.mkv"), bytes);
  await writeFile(path.join(outside, "Private.mp4"), bytes);
  await writeFile(path.join(root, "secret.txt"), "not a movie");
  // Junctions work without administrator privileges on Windows.
  await symlink(outside, path.join(root, "shortcut"), process.platform === "win32" ? "junction" : "dir");
  process.env.LOCAL_MEDIA_ROOTS = JSON.stringify([{ path: root, recursive: false }]);
  const shallow = await getLocalMedia();
  assert.equal(shallow.length, 1);
  assert.equal(shallow[0].title.year, 2025);
  assert.ok(!JSON.stringify(shallow[0].title).includes(directory));
  const id = shallow[0].id;
  const context = { params: Promise.resolve({ id }) };
  assert.equal(await findLocalMedia("../../secret.txt"), null);
  assert.equal(await findLocalMedia(`local-${"0".repeat(32)}`), null);

  const response = await GET(new Request("http://localhost", { headers: { Range: "bytes=2-5" } }), context);
  assert.equal(response.status, 206);
  assert.equal(response.headers.get("Content-Range"), "bytes 2-5/10");
  assert.equal(await response.text(), "2345");
  const full = await GET(new Request("http://localhost"), context);
  assert.equal(full.status, 200);
  assert.equal(await full.text(), "0123456789");
  const suffix = await GET(new Request("http://localhost", { headers: { Range: "bytes=-3" } }), context);
  assert.equal(await suffix.text(), "789");
  const head = await HEAD(new Request("http://localhost", { method: "HEAD" }), context);
  assert.equal(head.headers.get("Content-Length"), "10");
  assert.equal(await head.text(), "");
  const invalid = await GET(new Request("http://localhost", { headers: { Range: "bytes=10-" } }), context);
  assert.equal(invalid.status, 416);
  assert.equal(invalid.headers.get("Content-Range"), "bytes */10");
  const missing = await GET(new Request("http://localhost"), { params: Promise.resolve({ id: "bad" }) });
  assert.equal(missing.status, 404);

  process.env.LOCAL_MEDIA_ROOTS = JSON.stringify([{ path: root }, { path: root }]);
  const recursive = await getLocalMedia();
  assert.equal(recursive.length, 2, "deduplicate overlapping roots and exclude junctions");
  assert.equal(recursive.find((file) => file.id === id)?.id, id, "IDs survive rescans");

  await t.test("MKV conversion produces decodable H.264/AAC segments at the requested seek position", async () => {
    assert.ok(ffmpeg);
    const fixture = path.join(outside, "Fixture.2025.mkv");
    await execute(ffmpeg, ["-hide_banner", "-loglevel", "error", "-nostdin", "-y",
      "-f", "lavfi", "-i", "testsrc=size=320x180:rate=30",
      "-f", "lavfi", "-i", "sine=frequency=440:sample_rate=48000",
      "-t", "7.5", "-c:v", "ffv1", "-c:a", "pcm_s16le", fixture], { windowsHide: true });
    process.env.LOCAL_MEDIA_ROOTS = JSON.stringify([{ path: outside }]);
    const media = (await getLocalMedia()).find((file) => file.path === fixture)!;
    const duration = await mediaDuration(media);
    assert.ok(Math.abs(duration - 7.5) < 0.1);
    const playlist = mediaPlaylist(media.id, duration);
    assert.ok(playlist.includes("#EXTINF:6.000,"));
    assert.ok(playlist.includes("#EXTINF:1.500,"));
    assert.ok(playlist.endsWith("#EXT-X-ENDLIST\n"));
    const first = await transcodeSegment(media, 0);
    const last = await transcodeSegment(media, 1);
    assert.equal(first[0], 0x47, "MPEG transport stream sync byte");
    const segmentFile = path.join(directory, "seek.ts");
    await writeFile(segmentFile, last);
    const decoded = await execute(ffmpeg, ["-hide_banner", "-i", segmentFile, "-f", "null", "-"], { windowsHide: true });
    assert.match(decoded.stderr, /Video: h264/);
    assert.match(decoded.stderr, /Audio: aac/);
    assert.match(decoded.stderr, /start: 5\.9\d+/);
    assert.deepEqual(await transcodeSegment(media, 1), await readFile(segmentFile));
    await assert.rejects(transcodeSegment(media, 2), RangeError);

    // External SRTs and embedded text subtitles both become browser-readable WebVTT.
    const srt = "1\n00:00:00,500 --> 00:00:02,000\nHello from Sidflix\n";
    await writeFile(path.join(outside, "Fixture.2025.en.srt"), srt);
    const external = (await subtitleTracks(media)).find((track) => track.id.startsWith("sidecar-"))!;
    assert.ok(external);
    assert.match((await subtitleContent(media, external.id))!, /^WEBVTT/);
    assert.match((await subtitleContent(media, external.id))!, /Hello from Sidflix/);
    assert.equal(await subtitleContent(media, "../../secret"), null);

    const embeddedFile = path.join(directory, "embedded.mkv");
    await execute(ffmpeg, ["-hide_banner", "-loglevel", "error", "-y", "-i", fixture,
      "-i", path.join(outside, "Fixture.2025.en.srt"), "-map", "0:v", "-map", "0:a", "-map", "1:s",
      "-c", "copy", "-c:s", "srt", "-metadata:s:s:0", "language=eng", embeddedFile], { windowsHide: true });
    const embeddedMedia = { ...media, id: `${media.id}-embedded`, path: embeddedFile };
    const embedded = (await subtitleTracks(embeddedMedia)).find((track) => track.id.startsWith("embedded-"))!;
    assert.ok(embedded);
    assert.equal(embedded.language, "eng");
    assert.match((await subtitleContent(embeddedMedia, embedded.id))!, /Hello from Sidflix/);
  });
});
