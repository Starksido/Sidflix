"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { downloadFilename, formatDownloadSize, type DownloadItem } from "@/lib/download-catalog";
import { connectDownloadAccount, deleteDownload, enqueueDownload, pauseDownload, resumeDownload, useSavedDownloads } from "@/lib/download-manager";
import { savedDownloadBlob, type SavedDownload } from "@/lib/downloads-db";
import { enterPlaybackView, exitPlaybackView, playbackViewReady } from "@/lib/playback-view";
import { PlayerViewExit, playerRemoteKey } from "@/components/player-view";

type Catalogue = { accountId: string; role: string; items: DownloadItem[] };
const message = (error: unknown) => error instanceof Error ? error.message : "Please try again.";

export function DownloadsBrowser() {
  const { data: session, isPending, error } = authClient.useSession();
  if (isPending) return <p role="status" className="downloads-notice">Opening your downloads…</p>;
  if (!session) return <div className="downloads-gate"><DownloadGlyph /><h2>{error ? "Reconnect to your account" : "Take your favourites with you"}</h2>
    <p>Sign in to save films for the moments you’re away from a connection.</p>
    <Link href="/account?next=downloads" className="downloads-primary">Sign in</Link></div>;
  return <DownloadWorkspace key={session.user.id} account={{ id: session.user.id, name: session.user.name }} />;
}

function DownloadWorkspace({ account }: { account: { id: string; name: string } }) {
  const [catalogue, setCatalogue] = useState<Catalogue | null>(null), [status, setStatus] = useState<"loading" | "ready" | "locked" | "error">("loading");
  const [error, setError] = useState(""), [attempt, setAttempt] = useState(0), [playing, setPlaying] = useState<{ job: SavedDownload; url: string } | null>(null);
  const [offlineReady, setOfflineReady] = useState(false), [working, setWorking] = useState<string | null>(null);
  const jobs = useSavedDownloads().filter(job => job.accountId === account.id);
  useEffect(() => { void connectDownloadAccount(account); }, [account.id, account.name, account]);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/downloads/catalog", { signal: controller.signal, cache: "no-store" }).then(async response => {
      if (response.status === 403) { setStatus("locked"); return; }
      if (!response.ok) throw new Error("Your downloads couldn’t connect. Please try again.");
      const data: Catalogue = await response.json();
      if (data.accountId !== account.id) throw new Error("Your account changed. Please try again.");
      setCatalogue(data); setStatus("ready");
    }).catch(reason => { if (!controller.signal.aborted) { setError(message(reason)); setStatus("error"); } });
    return () => controller.abort();
  }, [account.id, attempt]);
  useEffect(() => {
    if (!window.isSecureContext || !("serviceWorker" in navigator)) return;
    let alive = true;
    navigator.serviceWorker.register("/sidflix-downloads-sw.js", { scope: "/" }).then(() => navigator.serviceWorker.ready).then(() => { if (alive) setOfflineReady(true); }).catch(() => {});
    return () => { alive = false; };
  }, []);
  const act = async (key: string, action: () => Promise<void>) => {
    if (working) return; setWorking(key); setError("");
    try { await action(); } catch (reason) { setError(message(reason)); } finally { setWorking(null); }
  };
  const play = async (job: SavedDownload) => {
    enterPlaybackView();
    await act(job.key, async () => { try { const blob = await savedDownloadBlob(job); setPlaying({ job, url: URL.createObjectURL(blob) }); } catch (reason) { exitPlaybackView(); throw reason; } });
  };
  const exportFile = (job: SavedDownload) => act(job.key, async () => {
    const blob = await savedDownloadBlob(job), url = URL.createObjectURL(blob), link = document.createElement("a");
    link.href = url; link.download = downloadFilename(job.title, job.quality, job.mime); document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 60_000);
  });
  const saved = jobs.filter(job => job.status === "completed"), queue = jobs.filter(job => job.status !== "completed");
  return <>
    <div className="downloads-account"><span className="downloads-pill">{catalogue?.role === "owner" ? "Owner · Full access" : status === "locked" ? "Premium" : "Your downloads"}</span><span>{account.name}</span></div>
    {error && <p role="alert" className="downloads-error">{error}</p>}
    {status === "locked" && <div className="downloads-gate"><DownloadGlyph /><h2>A little more to take with you</h2><p>Downloading new films is included with Premium. Your saved films stay on this device.</p><Link href="/" className="downloads-secondary">Back to browsing</Link></div>}
    <section aria-labelledby="saved-downloads-heading" className="downloads-section"><div className="downloads-section-heading"><div><p className="downloads-eyebrow">ALWAYS CLOSE BY</p><h2 id="saved-downloads-heading">Saved on this device</h2></div></div>
      {saved.length ? <ul className="downloads-saved-grid">{saved.map(job => <li key={job.key} className="downloads-saved-card"><Cover poster={job.poster} title={job.title} /><div className="downloads-card-copy"><h3>{job.title}</h3><p>{job.quality} · {formatDownloadSize(job.bytes)}</p><div className="downloads-actions"><button className="downloads-primary" disabled={working !== null} onClick={() => void play(job)}>▶ Watch offline</button><button className="downloads-secondary" disabled={working !== null} onClick={() => void exportFile(job)}>Save video file</button><button className="downloads-remove" disabled={working !== null} aria-label={`Remove ${job.title}`} onClick={() => void act(job.key, () => deleteDownload(job.key))}>Remove</button></div></div></li>)}</ul>
        : <div className="downloads-empty"><DownloadGlyph /><div><h3>Your next journey starts here</h3><p>Download a film below. It will be waiting here when you’re ready.</p></div></div>}
      <p className="downloads-hint">{offlineReady ? "This Downloads page is ready to open offline. Bookmark it for your next trip." : "Use Save video file to watch from your device’s Downloads folder when Sidflix is unreachable."}</p>
    </section>
    {queue.length > 0 && <section aria-labelledby="download-queue-heading" className="downloads-section"><h2 id="download-queue-heading">In your queue</h2><ul className="downloads-queue">{queue.map(job => <li key={job.key}>
      <div className="downloads-queue-title"><h3>{job.title}</h3><span>{job.quality}</span></div>
      <progress value={job.downloaded} max={job.bytes} aria-label={`${job.title} download progress`} />
      <div className="downloads-queue-meta"><p>{job.status === "pausing" ? "Pausing…" : job.status === "downloading" ? "Downloading" : job.status === "queued" ? "Queued" : job.status === "error" ? "Needs your attention" : "Paused"} · {formatDownloadSize(job.downloaded)} of {formatDownloadSize(job.bytes)}</p>
        <div className="downloads-actions">{["queued", "downloading"].includes(job.status) ? <button disabled={working !== null} onClick={() => void act(job.key, () => pauseDownload(job.key))}>Pause</button> : job.status !== "pausing" && status === "ready" ? <button disabled={working !== null} onClick={() => void act(job.key, () => resumeDownload(job.key))}>Resume</button> : null}<button disabled={working !== null || job.status === "pausing"} onClick={() => void act(job.key, () => deleteDownload(job.key))}>Remove</button></div></div>
      {job.error && <p className="downloads-error" role="alert">{job.error}</p>}
    </li>)}</ul></section>}
    {status !== "locked" && <section aria-labelledby="available-downloads-heading" className="downloads-section"><div className="downloads-section-heading"><div><p className="downloads-eyebrow">GOOD STORIES, WHEREVER YOU GO</p><h2 id="available-downloads-heading">Available to download</h2></div></div>
      {status === "loading" ? <p role="status" className="downloads-notice">Finding your next escape…</p> : status === "error" ? <button className="downloads-secondary" onClick={() => { setStatus("loading"); setAttempt(value => value + 1); }}>Try again</button>
        : catalogue?.items.length ? <ul className="downloads-catalogue">{catalogue.items.map(item => <DownloadCard key={item.id} item={item} disabled={working !== null} onDownload={quality => act(item.id, () => enqueueDownload(item, item.variants.find(variant => variant.id === quality)!))} />)}</ul>
          : <p className="downloads-notice">More downloads are on their way. Please check back soon.</p>}
    </section>}
    <Link href="/credits" className="downloads-credits">Film credits</Link>
    {playing && <DownloadedPlayer job={playing.job} url={playing.url} onClose={() => setPlaying(null)} />}
  </>;
}

function DownloadCard({ item, disabled, onDownload }: { item: DownloadItem; disabled: boolean; onDownload: (quality: string) => Promise<void> }) {
  const fallback = item.variants.find(variant => variant.label === "720p") ?? item.variants[0];
  const [quality, setQuality] = useState(fallback.id), selected = item.variants.find(variant => variant.id === quality) ?? fallback;
  return <li id={`download-${item.id}`} className="downloads-film-card"><Cover poster={item.poster} title={item.title} /><div className="downloads-card-copy"><p className="downloads-film-facts">{item.year} · {Math.floor(item.seconds / 60)}m {item.seconds % 60}s · Animation</p><h3>{item.title}</h3><p>{item.synopsis}</p>
    <label className="downloads-quality">Picture quality<select aria-label={`${item.title} download quality`} value={quality} onChange={event => setQuality(event.target.value)}>{item.variants.map(variant => <option key={variant.id} value={variant.id}>{variant.label} · {formatDownloadSize(variant.bytes)}</option>)}</select></label>
    <div className="downloads-actions"><button disabled={disabled} onClick={() => void onDownload(selected.id)} className="downloads-primary"><DownloadGlyph />Download · {formatDownloadSize(selected.bytes)}</button><a className="downloads-file-link" href={`/api/downloads/${item.id}/file?quality=${selected.id}`}>Save video file</a></div>
  </div></li>;
}
function Cover({ poster, title }: { poster: string; title: string }) {
  return <div className="downloads-cover"><Image src={poster} alt="" fill sizes="(max-width: 640px) 90vw, 340px" className="object-cover" /><div /><span>{title}</span></div>;
}
function DownloadGlyph() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden><path d="M12 3v12m-5-5 5 5 5-5M4 15v5h16v-5" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
function DownloadedPlayer({ job, url, onClose }: { job: SavedDownload; url: string; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null), stage = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = dialog.current;
    let alive = true; void playbackViewReady().then(() => { if (alive) { dialog.current?.showModal(); stage.current?.focus({ preventScroll: true }); } });
    return () => { alive = false; queueMicrotask(() => { if (!node?.isConnected) { exitPlaybackView(); URL.revokeObjectURL(url); } }); };
  }, [url]);
  return <dialog ref={dialog} data-player-dialog data-offline-player aria-label={`${job.title} offline player`} onClose={onClose} className="downloads-player"><div className="player-shell"><PlayerViewExit />
    <div ref={stage} data-player-stage tabIndex={0} onKeyDown={playerRemoteKey} onDoubleClick={enterPlaybackView} className="player-stage"><video src={url} controls autoPlay playsInline aria-label={job.title} /></div>
    <div className="player-chrome downloads-player-bar"><div><h2>{job.title}</h2><p>Saved on this device · {job.quality}</p></div><button onClick={() => dialog.current?.close()}>Close</button></div></div></dialog>;
}
