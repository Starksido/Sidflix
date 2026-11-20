"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore, type KeyboardEvent } from "react";
import { enterPlaybackView, exitPlaybackView, isImmersivePlayback, subscribePlaybackView } from "@/lib/playback-view";
import { remoteKey } from "@/lib/remote-navigation";
import type { TvPlaybackProvider } from "@/lib/player-settings";

export function usePlaybackView() {
  return useSyncExternalStore(subscribePlaybackView, isImmersivePlayback, () => false);
}
export function playerRemoteKey(event: KeyboardEvent<HTMLElement>) {
  if (event.target !== event.currentTarget) return;
  const key = remoteKey(event);
  if (key === "ok") { event.preventDefault(); if (!event.repeat) enterPlaybackView(); }
  if (key === "up") { event.preventDefault(); const root = event.currentTarget.closest("dialog"); (root?.querySelector<HTMLButtonElement>("[data-playback-options]") ?? root?.querySelector<HTMLButtonElement>("[data-next-episode]:not([disabled])") ?? root?.querySelector<HTMLButtonElement>("[data-exit-playback]"))?.focus(); }
  if (key === "down") { event.preventDefault(); event.currentTarget.querySelector<HTMLElement>("iframe,video")?.focus(); }
}
export function PlayerViewExit() {
  const active = usePlaybackView();
  if (!active) return null;
  return <div className="player-view-exit-zone"><button type="button" data-exit-playback onClick={exitPlaybackView} className="player-view-exit" aria-label="Exit fullscreen">Exit fullscreen</button></div>;
}

export function FullscreenPlaybackControls({ disabled, hasNext, onNext, provider, onProviderChange, keepOptionsVisible }: {
  disabled: boolean; hasNext: boolean; onNext: () => void; provider: TvPlaybackProvider; onProviderChange: (provider: TvPlaybackProvider) => void; keepOptionsVisible: boolean;
}) {
  const [visible, setVisible] = useState(false), [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null), options = useRef<HTMLDivElement>(null), trigger = useRef<HTMLButtonElement>(null);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null), menuId = useId();
  const reveal = () => {
    setVisible(true);
    if (timeout.current) clearTimeout(timeout.current);
    timeout.current = setTimeout(() => setVisible(false), 2500);
  };
  useEffect(() => {
    const move = (event: PointerEvent) => {
      if (!root.current?.closest("dialog")?.contains(event.target as Node)) return;
      setVisible(true);
      if (timeout.current) clearTimeout(timeout.current);
      timeout.current = setTimeout(() => setVisible(false), 2500);
    };
    document.addEventListener("pointermove", move, { passive: true });
    return () => { document.removeEventListener("pointermove", move); if (timeout.current) clearTimeout(timeout.current); };
  }, []);
  useEffect(() => {
    if (!open) return;
    options.current?.querySelector<HTMLButtonElement>("[aria-selected=true]")?.focus();
    const outside = (event: PointerEvent) => { if (!options.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);
  const close = () => { setOpen(false); trigger.current?.focus(); reveal(); };
  return <div ref={root} className="player-floating-controls" onPointerEnter={reveal} onPointerMove={reveal} onFocusCapture={reveal}>
    {/* Only the top-edge reveal strip receives pointer input. The video and its
        own controls must receive their first click, including after inactivity. */}
    {hasNext && <button type="button" data-next-episode data-controls-visible={visible} aria-label="Next episode" disabled={disabled} onClick={onNext} className="player-next-episode">
      <svg viewBox="0 0 24 24" width="21" height="21" aria-hidden><path d="m5 4 12 8-12 8z" fill="currentColor" /><path d="M19 4v16" stroke="currentColor" strokeWidth="2.5" /></svg>
    </button>}
    <div ref={options} className="player-playback-options" data-controls-visible={visible || keepOptionsVisible || open} data-has-next={hasNext}>
      <button ref={trigger} type="button" data-playback-options aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? menuId : undefined}
        onClick={() => { reveal(); setOpen(value => !value); }} className="player-playback-trigger">Playback options</button>
      {open && <div id={menuId} role="listbox" aria-label="Playback options" className="player-playback-menu" onKeyDown={event => {
        const key = remoteKey(event), buttons = [...event.currentTarget.querySelectorAll<HTMLButtonElement>("[role=option]")], index = buttons.indexOf(document.activeElement as HTMLButtonElement);
        if (key === "up" || key === "down") { event.preventDefault(); event.stopPropagation(); buttons[Math.max(0, Math.min(buttons.length - 1, index + (key === "down" ? 1 : -1)))]?.focus(); }
        else if (key === "back" || key === "left") { event.preventDefault(); event.stopPropagation(); close(); }
        else if (key === "ok") { event.preventDefault(); event.stopPropagation(); if (!event.repeat) (document.activeElement as HTMLButtonElement)?.click(); }
      }}>
        {(["standard", "alternative", "tv"] as const).map(value => <button type="button" key={value} role="option" aria-selected={provider === value} tabIndex={-1}
          onClick={() => {
            if (provider !== value) onProviderChange(value);
            setOpen(false); reveal();
            root.current?.closest("dialog")?.querySelector<HTMLElement>("[data-player-stage]")?.focus({ preventScroll: true });
          }}>
          <span>{value === "standard" ? "Standard" : value === "tv" ? "TV player" : "Alternative 1"}</span>{value === "alternative" && <small>May include ads</small>}{value === "tv" && <small>Arrows and OK controls</small>}
        </button>)}
      </div>}
    </div>
  </div>;
}
