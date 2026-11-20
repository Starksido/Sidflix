"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { isAllowed } from "@/lib/catalog";
import { parseTrialAvailability, parseTrialPlayerEvent, trialEmbedUrl, trialInfoUrl, trialMovies, type TrialMovie, type TrialPlayerEvent } from "@/lib/movie-trial";
import { useActiveProfile } from "@/lib/viewer-store";

type TrialRecord = {
  source?: "checking" | "listed" | "missing" | "failed";
  sourceMs?: number;
  sourceQuality?: string;
  frameLoaded?: boolean;
  attempts?: number;
  player?: TrialPlayerEvent;
  progressReported?: boolean;
  timeToProgressMs?: number;
  verdict?: "confirmed" | "failed";
  notes?: string;
  updatedAt?: string;
};

export function MovieTrial() {
  const profile = useActiveProfile();
  const allowed = isAllowed("13+", profile.maxMaturity);
  const [selected, setSelected] = useState<TrialMovie>(trialMovies[0]);
  const [opened, setOpened] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [records, setRecords] = useState<Record<string, TrialRecord>>({});
  const frame = useRef<HTMLIFrameElement>(null);
  const request = useRef<AbortController | null>(null);
  const openedAt = useRef<number | null>(null);
  const firstProgress = useRef<number | null>(null);
  const record = records[selected.imdb] ?? {};

  const update = useCallback((id: string, patch: Partial<TrialRecord>) => {
    setRecords((current) => ({ ...current, [id]: { ...current[id], ...patch, updatedAt: new Date().toISOString() } }));
  }, []);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (!allowed) return;
      const message = parseTrialPlayerEvent(event.data, event.origin,
        Boolean(frame.current && event.source === frame.current.contentWindow), selected);
      if (!message) return;
      let advanced = false;
      if (message.status === "playing") {
        if (firstProgress.current === null) firstProgress.current = message.progress;
        advanced = message.progress > firstProgress.current + 1;
      }
      setRecords((current) => {
        const previous = current[selected.imdb] ?? {};
        return { ...current, [selected.imdb]: { ...previous, player: message,
          progressReported: previous.progressReported || advanced,
          timeToProgressMs: previous.timeToProgressMs ?? (advanced && openedAt.current !== null ? Math.round(performance.now() - openedAt.current) : undefined),
          updatedAt: new Date().toISOString() } };
      });
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [selected, allowed]);

  useEffect(() => () => { request.current?.abort(); request.current = null; }, []);

  const cancelCheck = () => {
    request.current?.abort();
    request.current = null;
    if (record.source === "checking") update(selected.imdb, { source: undefined, sourceMs: undefined });
  };

  const choose = (movie: TrialMovie) => {
    cancelCheck();
    openedAt.current = null;
    firstProgress.current = null;
    setOpened(false);
    setSelected(movie);
  };

  const checkSource = async (movie: TrialMovie) => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    const timer = setTimeout(() => controller.abort(), 12_000);
    const start = performance.now();
    update(movie.imdb, { source: "checking", sourceMs: undefined, sourceQuality: undefined });
    try {
      const response = await fetch(trialInfoUrl(movie), { signal: controller.signal, cache: "no-store" });
      if (response.status === 404) {
        update(movie.imdb, { source: "missing", sourceMs: Math.round(performance.now() - start) });
        return;
      }
      if (!response.ok) throw new Error("Source unavailable");
      const data = parseTrialAvailability(await response.json(), movie);
      if (!data) throw new Error("Source returned a different title or unexpected data");
      update(movie.imdb, { source: "listed", sourceQuality: data.quality, sourceMs: Math.round(performance.now() - start) });
    } catch {
      if (request.current === controller) update(movie.imdb, { source: "failed", sourceMs: Math.round(performance.now() - start) });
    } finally { clearTimeout(timer); }
  };

  const open = () => {
    openedAt.current = performance.now();
    firstProgress.current = null;
    update(selected.imdb, { attempts: (record.attempts ?? 0) + 1, verdict: undefined,
      player: undefined, progressReported: false, timeToProgressMs: undefined, frameLoaded: false });
    setAttempt((value) => value + 1);
    setOpened(true);
    void checkSource(selected);
  };

  const exportResults = () => {
    const report = { exportedAt: new Date().toISOString(), provider: "VidSrc.sh", results: trialMovies.map((movie) => ({
      title: movie.title, imdb: movie.imdb, tmdb: movie.tmdb, ...records[movie.imdb],
    })) };
    const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "sidflix-movie-trial.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const playback = record.verdict === "confirmed" ? "Confirmed by you" : record.verdict === "failed" ? "You reported a problem"
    : record.progressReported ? (record.player?.status === "paused" ? "Player reports paused" : "Player reports progress")
    : opened && allowed ? "Waiting for playback / verification" : "Not started";
  const source = record.source === "listed" ? `Listed · ${record.sourceQuality ?? "quality unknown"}`
    : record.source === "checking" ? "Checking…" : record.source === "missing" ? "Not listed"
    : record.source === "failed" ? "Couldn’t check source" : "Not checked";

  return (
    <main className="px-gutter mx-auto w-full max-w-7xl flex-1 pt-32 pb-16 md:pt-28">
      <Link href="/" className="text-fg-muted text-sm hover:text-fg">← Back to Sidflix</Link>
      <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-accent text-xs font-semibold tracking-widest uppercase">Experimental · On-demand movies</p>
          <h1 className="font-display mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Movie streaming trial</h1>
          <p className="text-fg-muted mt-3 max-w-2xl text-sm leading-relaxed">Choose a film, open its player and complete any verification yourself. Check picture, sound, seeking and subtitles, then record the result.</p></div>
        <button onClick={exportResults} disabled={!Object.keys(records).length} className="rounded-lg bg-white/10 px-4 py-2 text-sm hover:bg-white/15 disabled:opacity-40">Export results</button>
      </div>
      <p className="text-fg-subtle mt-4 text-xs leading-relaxed">External players may show ads or open popups. Distribution rights for these films have not been verified. Export results before reloading or leaving this page.</p>

      {!allowed ? <p className="mt-8 rounded-xl bg-white/5 p-6 text-fg-muted">These trial films require a profile allowing 13+ content. Use the profile menu to switch.</p> : <>
        <div role="group" aria-label="Choose a trial movie" className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {trialMovies.map((movie) => <button key={movie.imdb} aria-pressed={selected.imdb === movie.imdb} onClick={() => choose(movie)}
            className="flex min-w-0 items-center gap-4 rounded-xl bg-white/5 p-3 text-left ring-1 ring-white/10 transition-colors hover:bg-white/10 aria-pressed:bg-accent/10 aria-pressed:ring-accent">
            <div className="relative h-24 w-16 shrink-0 overflow-hidden rounded-md" style={{ background: movie.color }}>
              <Image src={`/media-artwork/movie-trial-${movie.tmdb}.jpg`} alt="" fill sizes="64px" className="object-cover" />
            </div>
            <span className="min-w-0"><span className="font-display block text-lg font-semibold">{movie.title}</span>
              <span className="text-fg-subtle mt-1 block text-xs">{movie.year} · 13+</span>
              {records[movie.imdb]?.verdict && <span className="mt-2 block text-xs text-accent">{records[movie.imdb].verdict === "confirmed" ? "You confirmed playback" : "Problem reported"}</span>}
            </span>
          </button>)}
        </div>

        <section aria-label={`${selected.title} player trial`} className="mt-7 overflow-hidden rounded-xl bg-surface-1 ring-1 ring-white/10">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
            <div><h2 className="font-display text-xl font-semibold">{selected.title}</h2><p className="mt-1 text-xs text-fg-subtle">External player · VidSrc.sh</p></div>
            <div className="flex gap-2">
              <button onClick={open} className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-ink hover:bg-accent-hover">{opened ? "Reload player" : "Open player"}</button>
              {opened && <button onClick={() => { cancelCheck(); setOpened(false); }} className="rounded-lg bg-white/10 px-4 py-2 text-sm hover:bg-white/15">Close player</button>}
            </div>
          </div>
          {opened ? <>
            {/* This provider rejects sandboxed frames. Load only after an explicit click. */}
            <iframe ref={frame} key={`${selected.imdb}-${attempt}`} src={trialEmbedUrl(selected)} title={`${selected.title} trial player`}
              allow="autoplay; fullscreen; encrypted-media; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin"
              onLoad={() => update(selected.imdb, { frameLoaded: true })} className="block aspect-video min-h-[32rem] w-full bg-black" />
            <p className="border-t border-white/10 px-5 py-3 text-xs leading-relaxed text-fg-muted">Press play inside the player. If a verification puzzle appears, complete it yourself here. Only mark success after you can see and hear the film.</p>
          </> : <div className="grid min-h-64 place-content-center gap-2 bg-black/50 p-6 text-center">
            <p className="font-display text-xl">Ready to try {selected.title}?</p><p className="max-w-lg text-sm text-fg-muted">Open player loads the external service. Its catalogue listing alone doesn’t confirm playback.</p>
          </div>}
          <dl className="grid gap-4 border-t border-white/10 p-5 sm:grid-cols-3" aria-live="polite">
            <div><dt className="text-xs text-fg-subtle">Source availability</dt><dd className="mt-1 text-sm">{source}</dd>
              {record.sourceMs !== undefined && <dd className="mt-1 text-xs text-fg-subtle">Response: {(record.sourceMs / 1000).toFixed(2)}s · quality is provider-reported</dd>}</div>
            <div><dt className="text-xs text-fg-subtle">Playback</dt><dd data-testid="trial-playback" className="mt-1 text-sm">{playback}</dd>
              {record.frameLoaded && !record.progressReported && <dd className="mt-1 text-xs text-fg-subtle">Player page loaded; video progress unconfirmed.</dd>}</div>
            <div><dt className="text-xs text-fg-subtle">Trial measurements</dt><dd className="mt-1 text-sm">{record.attempts ?? 0} player attempts</dd>
              {record.timeToProgressMs !== undefined && <dd className="mt-1 text-xs text-fg-subtle">First progress after {(record.timeToProgressMs / 1000).toFixed(1)}s, including verification.</dd>}</div>
          </dl>
        </section>

        <section className="mt-5 rounded-xl bg-white/5 p-5" aria-label="Your playback result">
          <h2 className="font-display text-lg font-semibold">Did it work for you?</h2>
          <p className="mt-1 text-sm text-fg-muted">Try watching for a few minutes, seek ahead, then check audio and subtitles.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button disabled={!opened} aria-pressed={record.verdict === "confirmed"} onClick={() => update(selected.imdb, { verdict: "confirmed" })}
              className="rounded-lg bg-white/10 px-4 py-2 text-sm hover:bg-white/15 aria-pressed:bg-emerald-600 disabled:opacity-40">I can see and hear it</button>
            <button disabled={!opened} aria-pressed={record.verdict === "failed"} onClick={() => update(selected.imdb, { verdict: "failed" })}
              className="rounded-lg bg-white/10 px-4 py-2 text-sm hover:bg-white/15 aria-pressed:bg-red-800 disabled:opacity-40">It didn’t play</button>
          </div>
          <label className="mt-4 block text-xs text-fg-subtle" htmlFor="trial-notes">Notes: buffering, subtitles, ads or errors</label>
          <textarea id="trial-notes" value={record.notes ?? ""} maxLength={2000} onChange={(event) => update(selected.imdb, { notes: event.target.value })}
            className="mt-2 min-h-24 w-full rounded-lg bg-black/30 p-3 text-sm ring-1 ring-white/15 focus:ring-accent focus:outline-none" />
        </section>
      </>}
      <p className="mt-6 text-xs text-fg-subtle">Artwork from TMDB. This product uses the TMDB API but is not endorsed or certified by TMDB.</p>
    </main>
  );
}
