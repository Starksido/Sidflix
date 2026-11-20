"use client";

import { useEffect, useState, type RefObject } from "react";
import { alternativePlayerUrl, backupThemeSignal, vidSparkBackupUrl, vidSparkUrl } from "@/lib/player-settings";
import { episodeAutoplay } from "@/lib/episode-autoplay";

/** Own the supported backup URL so an upstream failover cannot discard its theme. */
export function useThemedSparkPlayer(frame: RefObject<HTMLIFrameElement | null>, id: number, episode?: { season: number; number: number }, enabled = true, attempt = 0) {
  const key = `${id}:${episode?.season ?? ""}:${episode?.number ?? ""}:${attempt}`;
  const [handoff, setHandoff] = useState<{ key: string; time: number; playing: boolean } | null>(null);
  const current = handoff?.key === key ? handoff : null;
  const season = episode?.season, number = episode?.number;
  useEffect(() => {
    if (!enabled) return;
    let alive = true, transferred = Boolean(current);
    let lastRootSignal = Date.now(), childSince: number | null = null;
    let position = { time: 0, playing: false };
    const started = Date.now();
    const resume = current?.playing ? episodeAutoplay(command => frame.current?.contentWindow?.postMessage(command, "https://cdn.vidspark.to"), started) : null;
    const onMessage = (event: MessageEvent) => {
      const player = frame.current?.contentWindow; if (!player) return;
      if (event.source === player) {
        const signal = backupThemeSignal(event.data, event.origin, true);
        if (signal) {
          lastRootSignal = Date.now();
          position = { time: signal.time, playing: event.data.event === "timeupdate" ? position.playing : signal.playing };
          if (current) resume?.observe({ event: event.data.event, time: signal.time, paused: event.data.paused }, Date.now());
        }
        return;
      }
      if (transferred) return;
      let child = false; try { child = event.source === player.frames[0]; } catch {}
      const signal = backupThemeSignal(event.data, event.origin, child);
      if (!signal || !alive) return;
      // Switch once, retaining the title, fullscreen shell and known position.
      transferred = true; setHandoff({ key, time: signal.time, playing: signal.playing });
    };
    const poll = () => {
      if (current) { resume?.poll(Date.now()); if (!resume?.active) clearInterval(timer); return; }
      // The primary replaces its SDK player with one iframe on failover and
      // stops answering getStatus. It does not relay its child's messages.
      // Only WindowProxy.length is read; no cross-origin DOM is accessed.
      try {
        const player = frame.current?.contentWindow;
        if (!player || player.length !== 1) { childSince = null; lastRootSignal = Date.now(); return; }
        player.postMessage({ action: "getStatus" }, "https://vidspark.to");
        childSince ??= Date.now();
        if (!transferred && Date.now() - childSince >= 2000 && Date.now() - lastRootSignal >= 3500 && alive) {
          transferred = true; setHandoff({ key, ...position });
        }
      } catch {}
    };
    window.addEventListener("message", onMessage);
    const timer = window.setInterval(poll, 1000);
    return () => { alive = false; clearInterval(timer); resume?.stop(); window.removeEventListener("message", onMessage); };
  }, [frame, key, current, enabled]);
  const episodeId = season !== undefined && number !== undefined ? { season, number } : undefined;
  return {
    url: current ? vidSparkBackupUrl(id, episodeId, current.time) : vidSparkUrl(id, episodeId),
    origin: current ? "https://cdn.vidspark.to" : "https://vidspark.to",
  };
}

export { alternativePlayerUrl };
