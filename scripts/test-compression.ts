import { loadEnvConfig } from "@next/env";
import { execFile } from "node:child_process";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import ffmpeg from "ffmpeg-static";
import { getLocalMedia } from "../src/lib/local-media";

type Probe = { seconds: number; width: number; height: number; fps: number; codec: string; tenBit: boolean };
type VmafLog = { version: string; frames: { frameNum: number; metrics: { vmaf: number } }[] };
type Result = { title: string; scene: number; position: number; crf: number; bytes: number; referenceBytes: number;
  saving: number; mean: number; p5: number; min: number; frames: number; worstFrame: number; encodeSeconds: number; output: string; metric: string };
type Summary = { title: string; properties: Probe; sourceBytes: number; baselineMinimum: number;
  profiles: { crf: number; saving: number; mean: number; worstSceneMean: number; p5: number; passes: boolean }[];
  selectedCrf: number | null; selectedSaving: number; review: { reference: string; encoded: string; mean: number; min: number }[] };

const SAMPLE_SECONDS = 10;
const MEAN_TARGET = 95;
const P5_TARGET = 90;
const positions = [0.1, 0.45, 0.75];
const outputDirectory = path.resolve(process.argv[2] ?? "artifacts/compression");
const results: Result[] = [];
const summaries: Summary[] = [];

async function run(args: string[], expectedProbe = false): Promise<string> {
  const executable = ffmpeg;
  if (!executable) throw new Error("FFmpeg unavailable");
  return new Promise((resolve, reject) => {
    execFile(executable, ["-hide_banner", "-nostdin", ...args], {
      cwd: outputDirectory, windowsHide: true, timeout: 240_000, maxBuffer: 8 * 1024 * 1024, encoding: "utf8",
    }, (error, _stdout, stderr) => {
      if (error && !expectedProbe) reject(new Error(`FFmpeg failed: ${stderr.slice(-1200)}`));
      else resolve(stderr);
    });
  });
}

async function probe(filename: string): Promise<Probe> {
  const metadata = await run(["-i", filename], true);
  const duration = /Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/.exec(metadata);
  const video = metadata.split(/\r?\n/).find((line) => /Stream #.*Video:/.test(line)) ?? "";
  const size = /\b(\d{2,5})x(\d{2,5})\b/.exec(video);
  if (!duration || !size) throw new Error(`Cannot read video properties: ${path.basename(filename)}`);
  return { seconds: Number(duration[1]) * 3600 + Number(duration[2]) * 60 + Number(duration[3]),
    width: Number(size[1]), height: Number(size[2]), fps: Number(/([\d.]+) fps/.exec(video)?.[1]) || 24,
    codec: /Video:\s*(\w+)/.exec(video)?.[1] ?? "unknown", tenBit: /yuv\w*10/.test(video) };
}

async function metrics(distorted: string, reference: string, log: string) {
  await run(["-loglevel", "error", "-threads", "2", "-i", distorted, "-threads", "2", "-i", reference,
    "-filter_complex_threads", "2", "-filter_complex",
    `[0:v]settb=AVTB,setpts=PTS-STARTPTS,format=yuv420p[d];[1:v]settb=AVTB,setpts=PTS-STARTPTS,format=yuv420p[r];[d][r]libvmaf=model=version=vmaf_v0.6.1:log_fmt=json:log_path=${log}:n_threads=2:shortest=1`,
    "-an", "-f", "null", "-"]);
  const data = JSON.parse(await readFile(path.join(outputDirectory, log), "utf8")) as VmafLog;
  const scores = data.frames.map((frame) => frame.metrics.vmaf);
  if (scores.length < 100 || scores.some((score) => !Number.isFinite(score))) throw new Error("Incomplete quality measurement");
  const sorted = [...scores].sort((a, b) => a - b);
  const worstFrame = data.frames.reduce((worst, frame) => frame.metrics.vmaf < worst.metrics.vmaf ? frame : worst);
  return { mean: scores.reduce((sum, score) => sum + score, 0) / scores.length,
    p5: sorted[Math.floor(sorted.length * 0.05)], min: sorted[0], frames: scores.length, worstFrame: worstFrame.frameNum };
}

function profiles(title: string) {
  return [...new Set(results.filter((result) => result.title === title).map((result) => result.crf))].sort((a, b) => a - b).map((crf) => {
    const rows = results.filter((result) => result.title === title && result.crf === crf);
    const frames = rows.reduce((sum, row) => sum + row.frames, 0);
    const reference = rows.reduce((sum, row) => sum + row.referenceBytes, 0);
    const encoded = rows.reduce((sum, row) => sum + row.bytes, 0);
    return { crf, saving: (1 - encoded / reference) * 100,
      mean: rows.reduce((sum, row) => sum + row.mean * row.frames, 0) / frames,
      worstSceneMean: Math.min(...rows.map((row) => row.mean)), p5: Math.min(...rows.map((row) => row.p5)),
      passes: rows.length === positions.length && rows.every((row) => row.mean >= MEAN_TARGET && row.p5 >= P5_TARGET) };
  });
}

async function checkpoint() {
  await writeFile(path.join(outputDirectory, "results.json"), JSON.stringify({
    method: { codec: "libx265", preset: "medium", initialCrf: [20, 24, 28], refinement: "One midpoint between passing and failing settings when applicable",
      audio: "copy", resolution: "unchanged", requestedSampleSeconds: SAMPLE_SECONDS, positions,
      metric: "VMAF v0.6.1, every frame, native source resolution, both inputs converted to 8-bit for scoring",
      target: `Every scene mean >= ${MEAN_TARGET}, every scene frame p5 >= ${P5_TARGET}`,
      caveat: "Chosen trial thresholds, not Netflix certification or a guarantee of invisible differences. Samples do not cover the entire title. 10-bit differences below 8-bit precision are not measured. Remuxed samples can include keyframe preroll." },
    results, summaries,
  }, null, 2));
}

function htmlEscape(value: string) { return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]!)); }

async function report() {
  const rows = summaries.map((summary) => `| ${summary.title} | ${summary.properties.width}×${summary.properties.height} ${summary.properties.codec} | ${summary.selectedCrf ?? "Keep original"} | ${summary.selectedSaving.toFixed(1)}% |`).join("\n");
  await writeFile(path.join(outputDirectory, "report.md"), `# Sidflix compression trial\n\nOriginal resolution and audio preserved. HEVC medium preset. Three scene samples per title.\n\n| Title | Actual source | Selected CRF | Sample size saving |\n|---|---|---|---|\n${rows}\n\nThe trial requires every sampled scene to average VMAF 95+ and its fifth-percentile frame score to be 90+. These are chosen comparison thresholds, not Netflix certification. Check the comparison frames in report.html before converting a complete title. Full-file savings can differ. Originals were read only.\n`);
  const table = summaries.map((summary) => `<section><h2>${htmlEscape(summary.title)}</h2><p>${summary.properties.width} × ${summary.properties.height} · ${summary.properties.codec} · ${summary.selectedCrf === null ? "Keep the original: no smaller candidate met the trial targets." : `Candidate: HEVC CRF ${summary.selectedCrf}; ${summary.selectedSaving.toFixed(1)}% smaller across sampled clips.`}</p><table><tr><th>CRF</th><th>Size saving</th><th>Mean VMAF</th><th>Worst scene mean</th><th>Lowest scene p5</th><th>Meets targets</th></tr>${summary.profiles.map((item) => `<tr><td>${item.crf}</td><td>${item.saving.toFixed(1)}%</td><td>${item.mean.toFixed(2)}</td><td>${item.worstSceneMean.toFixed(2)}</td><td>${item.p5.toFixed(2)}</td><td>${item.passes ? "Yes" : "No"}</td></tr>`).join("")}</table>${summary.review.map((frame, index) => `<h3>Sample ${index + 1}: lowest-scoring frame for the reviewed candidate</h3><p>Scene mean ${frame.mean.toFixed(2)}; lowest frame ${frame.min.toFixed(2)}. Click an image to inspect it at full size.</p><div class="pair"><figure><a href="${frame.reference}"><img src="${frame.reference}" alt="Source frame"></a><figcaption>Source</figcaption></figure><figure><a href="${frame.encoded}"><img src="${frame.encoded}" alt="HEVC frame"></a><figcaption>HEVC candidate</figcaption></figure></div>`).join("")}</section>`).join("");
  await writeFile(path.join(outputDirectory, "report.html"), `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sidflix compression trial</title><style>body{font:16px/1.6 system-ui;margin:0;padding:32px;color:#eee;background:#101113;max-width:1400px;margin:auto}h1,h2{line-height:1.2}section{margin:48px 0;padding-top:24px;border-top:1px solid #444}p{color:#bbb;max-width:1000px}table{border-collapse:collapse;width:100%;font-size:14px}td,th{padding:12px;text-align:left;border-bottom:1px solid #444}.pair{display:grid;grid-template-columns:1fr 1fr;gap:16px}figure{margin:0}img{width:100%;height:auto}figcaption{color:#bbb}@media(max-width:700px){body{padding:16px}.pair{grid-template-columns:1fr}td,th{padding:6px}}</style><h1>Sidflix compression trial</h1><p>Three points in each title; several HEVC settings. Resolution and audio stay unchanged. Trial targets: every sampled scene averages VMAF 95+, with fifth-percentile frame scores of 90+. These scores are a useful screen, not a promise that differences are invisible. Full-movie savings can differ. Source files were read only.</p><p>The frames below show the lowest-scoring frame in each sampled scene. The metric uses the existing file as its reference, not a studio master; 10-bit sources are compared at 8-bit precision.</p>${table}</html>`);
}

async function main() {
  loadEnvConfig(process.cwd());
  await mkdir(outputDirectory, { recursive: true });
  const files = await getLocalMedia();
  const wanted = ["F1 The Movie", "Predator Badlands", "Avatar Aang The Last Airbender", "Citadel S02E01"];
  for (const [titleIndex, title] of wanted.entries()) {
    const source = files.find((file) => file.title.title === title);
    if (!source) throw new Error(`Source not found: ${title}`);
    const properties = await probe(source.path);
    const sourceBytes = (await stat(source.path)).size;
    console.log(JSON.stringify({ title, properties }));
    const references: { file: string; bytes: number; baseline: number }[] = [];
    for (const [scene, fraction] of positions.entries()) {
      const reference = `${titleIndex}-${scene}-source.mkv`;
      await run(["-loglevel", "error", "-y", "-ss", String(Math.floor(properties.seconds * fraction)), "-i", source.path,
        "-t", String(SAMPLE_SECONDS), "-map", "0:v:0", "-map", "0:a:0?", "-c", "copy", "-avoid_negative_ts", "make_zero", reference]);
      const baseline = await metrics(reference, reference, `${titleIndex}-${scene}-baseline.json`);
      if (baseline.mean < 98) throw new Error("Quality measurement baseline failed");
      references.push({ file: reference, bytes: (await stat(path.join(outputDirectory, reference))).size, baseline: baseline.mean });
    }
    async function encodeProfile(crf: number) {
      for (const [scene, reference] of references.entries()) {
        const output = `${titleIndex}-${scene}-crf${crf}.mkv`;
        const metric = `${titleIndex}-${scene}-crf${crf}-vmaf.json`;
        const started = Date.now();
        await run(["-loglevel", "error", "-y", "-threads", "2", "-i", reference.file, "-map", "0:v:0", "-map", "0:a:0?",
          "-c:v", "libx265", "-preset", "medium", "-crf", String(crf), "-pix_fmt", properties.tenBit ? "yuv420p10le" : "yuv420p",
          "-x265-params", "pools=2:frame-threads=2:log-level=error", "-fps_mode", "passthrough", "-c:a", "copy", output]);
        const encodeSeconds = (Date.now() - started) / 1000;
        const score = await metrics(output, reference.file, metric);
        const bytes = (await stat(path.join(outputDirectory, output))).size;
        const result = { title, scene, position: Math.floor(properties.seconds * positions[scene]), crf, bytes,
          referenceBytes: reference.bytes, saving: (1 - bytes / reference.bytes) * 100, ...score, encodeSeconds, output, metric };
        results.push(result);
        await checkpoint();
        console.log(JSON.stringify({ title, scene: scene + 1, crf, saving: +result.saving.toFixed(1), vmaf: +score.mean.toFixed(2), p5: +score.p5.toFixed(2) }));
      }
    }
    for (const crf of [20, 24, 28]) await encodeProfile(crf);
    const initial = profiles(title);
    const passing = initial.filter((item) => item.passes).sort((a, b) => b.crf - a.crf)[0];
    const failing = passing && initial.find((item) => item.crf > passing.crf && !item.passes);
    if (passing && failing && failing.crf - passing.crf > 1) await encodeProfile(Math.round((passing.crf + failing.crf) / 2));
    const measured = profiles(title);
    const selected = measured.filter((item) => item.passes && item.saving > 0).sort((a, b) => b.saving - a.saving)[0];
    const reviewCrf = selected?.crf ?? 20;
    const review: Summary["review"] = [];
    for (const result of results.filter((row) => row.title === title && row.crf === reviewCrf)) {
      const reference = `${titleIndex}-${result.scene}-source.png`;
      const encoded = `${titleIndex}-${result.scene}-candidate.png`;
      for (const [input, target] of [[references[result.scene].file, reference], [result.output, encoded]]) {
        await run(["-loglevel", "error", "-y", "-threads", "2", "-i", input, "-vf", `select=eq(n\\,${result.worstFrame})`,
          "-frames:v", "1", "-fps_mode", "vfr", target]);
      }
      review.push({ reference, encoded, mean: result.mean, min: result.min });
    }
    summaries.push({ title, properties, sourceBytes, baselineMinimum: Math.min(...references.map((item) => item.baseline)),
      profiles: measured, selectedCrf: selected?.crf ?? null, selectedSaving: selected?.saving ?? 0, review });
    await checkpoint();
    await report();
    console.log(JSON.stringify({ completed: title, selectedCrf: selected?.crf ?? null, sampleSaving: selected?.saving ?? 0 }));
  }
  console.log(`Report ready: ${path.join(outputDirectory, "report.html")}`);
}

main().catch((error) => { console.error(error instanceof Error ? error.message : "Compression trial failed"); process.exitCode = 1; });
