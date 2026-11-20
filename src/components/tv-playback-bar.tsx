"use client";

import type { CineTvState } from "@/lib/cine-tv-controls";
import { remoteKey } from "@/lib/remote-navigation";
import { useEffect, useRef, useState } from "react";

const clock = (time: number) => `${Math.floor(time / 60)}:${String(Math.floor(time % 60)).padStart(2, "0")}`;
export function TvPlaybackBar({ state, visible, onActivity, onDismiss, onToggle, onSeek, onVolume, onMute, onSpeed }: {
  state: CineTvState; visible: boolean; onActivity: () => void; onDismiss: () => void;
  onToggle: () => void; onSeek: (time: number) => void; onVolume: (volume: number) => void; onMute: () => void; onSpeed: () => void;
}) {
  const [volumeOpen, setVolumeOpen] = useState(false);
  const volumeButton = useRef<HTMLButtonElement>(null), volumeRange = useRef<HTMLInputElement>(null);
  useEffect(() => { if (volumeOpen) volumeRange.current?.focus(); }, [volumeOpen]);
  const closeVolume = () => { setVolumeOpen(false); volumeButton.current?.focus(); };
  return <div data-tv-playback-bar data-visible={visible || state.paused || !state.ready} role="group" aria-label="Playback controls"
    className="tv-playback-bar" onPointerMove={onActivity} onFocusCapture={onActivity} onKeyDown={event => {
      onActivity();
      const key = remoteKey(event), target = event.target as HTMLElement;
      if (key === "up" && target instanceof HTMLButtonElement && target.closest(".tv-playback-buttons")) {
        event.preventDefault(); event.stopPropagation(); event.currentTarget.querySelector<HTMLInputElement>('[aria-label="Episode timeline"]')?.focus(); return;
      }
      if (target.getAttribute("aria-label") === "Episode timeline" && (key === "up" || key === "down")) {
        event.preventDefault(); event.stopPropagation();
        const next = key === "down" ? event.currentTarget.querySelector<HTMLButtonElement>("[data-tv-play]") : event.currentTarget.closest("dialog")?.querySelector<HTMLButtonElement>("[data-playback-options]");
        next?.focus(); return;
      }
      if (event.target instanceof HTMLInputElement && remoteKey(event) === "ok") { event.preventDefault(); event.stopPropagation(); event.currentTarget.querySelector<HTMLButtonElement>("[data-tv-play]")?.focus(); return; }
      if (remoteKey(event) === "back") { event.preventDefault(); event.stopPropagation(); onDismiss(); }
    }}>
    <p role="status" className="text-sm text-fg-muted">{state.error ? "Playback couldn’t load. Choose another playback option." : state.ready ? `${clock(state.time)} / ${clock(state.duration)}` : "Loading playback…"}</p>
    <input type="range" aria-label="Episode timeline" min={0} max={Math.max(1, Math.floor(state.duration))} step={10} value={Math.min(Math.floor(state.time), Math.floor(state.duration))} disabled={!state.ready} onChange={event => onSeek(Number(event.target.value))} />
    <div className="tv-playback-buttons">
      <button type="button" data-tv-play disabled={!state.ready} onClick={onToggle}>{state.paused ? "Play" : "Pause"}</button>
      <button type="button" aria-label="Rewind 10 seconds" disabled={!state.ready} onClick={() => onSeek(state.time - 10)}>−10s</button>
      <button type="button" aria-label="Forward 10 seconds" disabled={!state.ready} onClick={() => onSeek(state.time + 10)}>+10s</button>
      <button type="button" disabled={!state.ready} onClick={onMute}>{state.muted ? "Unmute" : "Mute"}</button>
      <div className="tv-volume-control">
        <button ref={volumeButton} type="button" aria-expanded={volumeOpen} disabled={!state.ready} onClick={() => setVolumeOpen(value => !value)}>Volume {Math.round((state.muted ? 0 : state.volume) * 100)}%</button>
        {volumeOpen && <div className="tv-volume-popup" onKeyDown={event => {
          if (["ok", "back"].includes(remoteKey(event) ?? "")) { event.preventDefault(); event.stopPropagation(); closeVolume(); }
        }}><input ref={volumeRange} type="range" aria-label="Volume" min={0} max={1} step={.1} disabled={!state.ready} value={state.muted ? 0 : state.volume} onChange={event => onVolume(Number(event.target.value))} /></div>}
      </div>
      <button type="button" aria-label={`Playback speed ${state.rate} times`} disabled={!state.ready} onClick={onSpeed}>{state.rate}×</button>
    </div>
  </div>;
}
