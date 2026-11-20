type PlaybackSignal = { event: string; time: number; paused?: boolean };
type Command = { action: "getStatus" | "play" };

/** Frame load precedes the asynchronous player setup. Ask for readiness, then play. */
export function episodeAutoplay(send: (command: Command) => void, startedAt: number) {
  let active = true, lastPlay = -Infinity, lastTime: number | null = null;
  const stop = () => { active = false; };
  return {
    stop,
    get active() { return active; },
    poll(now: number) {
      if (now - startedAt >= 120_000) stop();
      if (active) send({ action: "getStatus" });
    },
    observe(signal: PlaybackSignal, now: number) {
      if (!active) return;
      if (now - startedAt >= 120_000) { stop(); return; }
      // An explicit pause is user intent. Never keep restarting a paused episode.
      if (signal.event === "play" || signal.event === "pause" || signal.event === "playerstatus" && signal.paused === false) { stop(); return; }
      if (signal.event === "timeupdate") {
        if (lastTime !== null && signal.time > lastTime && signal.time - lastTime <= 30) stop();
        lastTime = signal.time;
      }
      if (signal.event === "playerstatus" && signal.paused === true && now - lastPlay >= 1500) {
        lastPlay = now;
        send({ action: "play" });
      }
    },
  };
}
