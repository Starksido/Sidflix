"use client";

import { useCallback, useRef, useState, type RefObject } from "react";
import type { FilmTitle } from "@/lib/catalog";
import { INITIAL_CINE_STATE, readCineTvMessage, type CineTvState } from "@/lib/cine-tv-controls";
import { CINE_TV_ORIGIN } from "@/lib/player-settings";

type Command = "play" | "pause" | "seek" | "setVolume" | "setMuted" | "setPlaybackRate" | "getPaused" | "getDuration" | "getVolume" | "getMuted" | "getPlaybackRate";
export function useCineTvController(frame: RefObject<HTMLIFrameElement | null>, title: FilmTitle, attempt: number) {
  const key = `${title.id}:${attempt}`;
  const latest = useRef({ key: "", state: INITIAL_CINE_STATE, autoRequested: false });
  const [snapshot, setSnapshot] = useState<{ key: string; state: CineTvState } | null>(null);
  const state = snapshot?.key === key ? snapshot.state : INITIAL_CINE_STATE;
  const send = useCallback((command: Command, args: (number | boolean)[] = []) => {
    frame.current?.contentWindow?.postMessage({ type: "cinesrc:command", command, args }, CINE_TV_ORIGIN);
  }, [frame]);
  const receive = useCallback((event: MessageEvent) => {
    const previous = latest.current.key === key ? latest.current.state : INITIAL_CINE_STATE;
    const value = readCineTvMessage(event.data, event.origin, Boolean(frame.current?.contentWindow && event.source === frame.current.contentWindow), title, previous);
    if (!value) return null;
    if (latest.current.key !== key) latest.current = { key, state: INITIAL_CINE_STATE, autoRequested: false };
    latest.current.state = value.state;
    setSnapshot({ key, state: value.state });
    if (value.state.ready && !latest.current.autoRequested) {
      latest.current.autoRequested = true;
      send("play"); send("getVolume"); send("getMuted"); send("getPlaybackRate");
    }
    return value.signal ?? null;
  }, [frame, key, title, send]);
  const load = () => {
    // The SDK can become ready before the iframe's load event. Keep an already
    // acknowledged pause instead of restarting playback after a late load.
    if (latest.current.key !== key || !latest.current.state.ready) {
      latest.current = { key, state: INITIAL_CINE_STATE, autoRequested: false };
      setSnapshot({ key, state: INITIAL_CINE_STATE });
    }
    send("getDuration"); send("getPaused");
  };
  const poll = useCallback(() => { send("getPaused"); if (latest.current.key !== key || !latest.current.state.ready) send("getDuration"); }, [key, send]);
  const toggle = () => { const current = latest.current; if (current.key !== key || !current.state.ready) return; current.autoRequested = true; send(current.state.paused ? "play" : "pause"); };
  const seek = (time: number) => { if (state.ready && Number.isFinite(time)) send("seek", [Math.max(0, Math.min(state.duration - 1, time))]); };
  const volume = (value: number) => { if (state.ready && Number.isFinite(value)) { send("setVolume", [Math.max(0, Math.min(1, value))]); if (value > 0) send("setMuted", [false]); } };
  const mute = () => { if (state.ready) send("setMuted", [!state.muted]); };
  const speed = () => { if (state.ready) send("setPlaybackRate", [state.rate === 1 ? 1.25 : state.rate === 1.25 ? 1.5 : state.rate === 1.5 ? 2 : 1]); };
  return { state, receive, load, poll, toggle, seek, volume, mute, speed };
}
