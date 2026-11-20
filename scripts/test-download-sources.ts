import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import path from "node:path";
import ffmpeg from "ffmpeg-static";

const directory = path.resolve("artifacts/download-source-trial");
const request = (url: string, headers: Record<string, string> = {}) => fetch(url, {
  headers: { "User-Agent": "Sidflix download source compatibility trial", Origin: "http://127.0.0.1:3000", ...headers },
  signal: AbortSignal.timeout(120_000),
});
const json = async (url: string) => { const response = await request(url); if (!response.ok) throw new Error(`Metadata HTTP ${response.status}`); return response.json(); };
type Candidate = { source: string; title: string; url: string; filename: string; expectedBytes?: number; md5?: string; license: string; details: string; qualities?: string[] };

async function discover(): Promise<Candidate[]> {
  const [archive, blender, commons] = await Promise.all([
    json("https://archive.org/metadata/BigBuckBunny_328"),
    json("https://video.blender.org/api/v1/videos/23f3ef79-15dc-44c5-aa45-cf92e78a4509"),
    json("https://commons.wikimedia.org/w/api.php?action=query&format=json&titles=File:Caminandes-_Llama_Drama_-_Short_Movie.ogv&prop=videoinfo&viprop=url%7Csize%7Cmime%7Cderivatives%7Cextmetadata"),
  ]);
  if (archive.is_dark || archive.metadata?.nodownload || !blender.downloadEnabled) throw new Error("Source does not allow this download");
  const archived = archive.files.find((file: { name: string }) => file.name === "BigBuckBunny_512kb.mp4");
  const movie = blender.files.find((file: { resolution: { id: number } }) => file.resolution.id === 720);
  const file = Object.values(commons.query.pages)[0] as { title: string; videoinfo: { extmetadata: { LicenseShortName: { value: string } }; derivatives: { src: string; transcodekey: string }[] }[] };
  const variant = file.videoinfo[0].derivatives.find(item => item.transcodekey === "480p.vp9.webm");
  if (!archived || !movie || !variant) throw new Error("Expected downloadable variant is missing");
  return [
    { source: "Internet Archive", title: archive.metadata.title, url: `https://archive.org/download/BigBuckBunny_328/${archived.name}`, filename: "archive-bunny.mp4", expectedBytes: Number(archived.size), md5: archived.md5, license: archive.metadata.licenseurl, details: "https://archive.org/details/BigBuckBunny_328" },
    { source: "Blender Video Library / PeerTube", title: blender.name, url: movie.fileDownloadUrl, filename: "blender-llamigos-720.mp4", expectedBytes: movie.size, license: blender.licence.label, qualities: blender.files.map((item: { resolution: { label: string } }) => item.resolution.label), details: blender.url },
    { source: "Wikimedia Commons", title: file.title, url: variant.src, filename: "commons-llama-480.webm", license: file.videoinfo[0].extmetadata.LicenseShortName.value, details: `https://commons.wikimedia.org/wiki/${encodeURIComponent(file.title)}` },
  ];
}

async function trial(candidate: Candidate) {
  const started = performance.now(), first = await request(candidate.url, { Range: "bytes=0-1048575" });
  if (![200, 206].includes(first.status)) throw new Error(`File HTTP ${first.status}`);
  const range = first.headers.get("content-range"), total = Number(range?.split("/")[1] ?? first.headers.get("content-length"));
  if (!Number.isSafeInteger(total) || total <= 0 || total > 60_000_000) { await first.body?.cancel(); throw new Error("File length unavailable or above the trial's 60 MB limit"); }
  const prefix = Buffer.from(await first.arrayBuffer());
  let data = prefix, resumed = false, resumeFailure: string | undefined;
  if (first.status === 206 && prefix.length < total) {
    if (!range?.startsWith(`bytes 0-${prefix.length - 1}/`)) throw new Error("Unexpected initial byte range");
    const validator = first.headers.get("etag"), lastModified = first.headers.get("last-modified");
    const ifRange = validator && !validator.startsWith("W/") ? validator : lastModified;
    const rest = await request(candidate.url, { Range: `bytes=${prefix.length}-`, ...(ifRange ? { "If-Range": ifRange } : {}) });
    if (rest.status !== 206 || rest.headers.get("content-range") !== `bytes ${prefix.length}-${total - 1}/${total}`) {
      resumeFailure = `HTTP ${rest.status}, Content-Range ${rest.headers.get("content-range")}`;
      await rest.body?.cancel();
      const full = await request(candidate.url);
      if (full.status !== 200) { await full.body?.cancel(); throw new Error(`Full download fallback failed: HTTP ${full.status}; resume ${resumeFailure}`); }
      data = Buffer.from(await full.arrayBuffer());
    } else {
      data = Buffer.concat([prefix, Buffer.from(await rest.arrayBuffer())]);
      resumed = true;
    }
  }
  if (data.length !== total || candidate.expectedBytes && data.length !== candidate.expectedBytes) throw new Error("Downloaded length does not match metadata");
  const md5 = createHash("md5").update(data).digest("hex");
  if (candidate.md5 && md5 !== candidate.md5) throw new Error("Published checksum mismatch");
  const filename = path.join(directory, candidate.filename);
  await writeFile(filename, data);
  const seconds = (performance.now() - started) / 1000;
  // Decode from the completed local file. FFmpeg receives no network URL.
  const decoded = spawnSync(ffmpeg!, ["-hide_banner", "-v", "error", "-ss", "10", "-i", filename, "-t", "2", "-f", "null", "-"], { encoding: "utf8", timeout: 30_000, windowsHide: true });
  if (decoded.status !== 0) throw new Error(`Local decoding failed: ${decoded.stderr.slice(0, 200)}`);
  return { ...candidate, bytes: data.length, seconds: Number(seconds.toFixed(2)), megabytesPerSecond: Number((data.length / 1e6 / seconds).toFixed(2)), resumed, resumeFailure, initialStatus: first.status, cors: first.headers.get("access-control-allow-origin"), disposition: first.headers.get("content-disposition"), sha256: createHash("sha256").update(data).digest("hex"), publishedChecksumVerified: Boolean(candidate.md5), localDecode: true };
}

async function main() {
await mkdir(directory, { recursive: true });
const candidates = await discover();
const previous: { results: { source: string; ok: boolean }[] } | null = process.argv.includes("--retry-failed") ? JSON.parse(await readFile(path.join(directory, "results.json"), "utf8")) : null;
const selected = previous ? candidates.filter(candidate => !previous.results.some(result => result.source === candidate.source && result.ok)) : candidates;
const retried = await Promise.all(selected.map(async candidate => {
  try { const result = await trial(candidate); console.log("PASS", result.source, result.bytes, "bytes", result.seconds, "seconds", "resume", result.resumed); return { ok: true, ...result }; }
  catch (error) { console.log("FAIL", candidate.source, (error as Error).message); return { ok: false, ...candidate, error: (error as Error).message }; }
}));
const results = [...(previous?.results.filter(result => result.ok) ?? []), ...retried];
await writeFile(path.join(directory, "results.json"), JSON.stringify({ checkedAt: new Date().toISOString(), results, scope: "Open-film samples. No commercial title catalogue coverage established; no streaming integration changed." }, null, 2));
const saved = JSON.parse(await readFile(path.join(directory, "results.json"), "utf8"));
if (saved.results.some((result: { ok: boolean }) => !result.ok)) process.exitCode = 1;
}
main().catch(error => { console.error(error instanceof Error ? error.message : "Download trial failed"); process.exitCode = 1; });
