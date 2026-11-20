// Request fullscreen from the original click/OK event, before React mounts the player.
const VIEW_EVENT = "sidflix:playback-view";
const CLASS_NAME = "sidflix-playback-open";
let ownsFullscreen = false;
let listening = false;
let transition: Promise<void> = Promise.resolve();
export function playbackViewReady() { return transition; }

export function isImmersivePlayback() {
  return typeof document !== "undefined" && document.documentElement.classList.contains(CLASS_NAME);
}
function announce() { document.dispatchEvent(new Event(VIEW_EVENT)); }
function listen() {
  if (listening) return;
  listening = true;
  document.addEventListener("fullscreenchange", () => {
    if (!document.fullscreenElement && ownsFullscreen) {
      ownsFullscreen = false;
      document.documentElement.classList.remove(CLASS_NAME);
      announce();
    }
  });
}
export function enterPlaybackView() {
  if (typeof document === "undefined") return;
  listen();
  const root = document.documentElement;
  root.classList.add(CLASS_NAME); announce();
  if (document.fullscreenElement || !root.requestFullscreen) return;
  const target = document.querySelector<HTMLElement>("dialog[data-player-dialog][open] .player-shell, dialog[data-player-dialog][open] .tv-player-shell") ?? root;
  ownsFullscreen = true;
  try {
    transition = target.requestFullscreen().then(() => {
      if (!isImmersivePlayback() && document.fullscreenElement === target) void document.exitFullscreen().catch(() => {});
    }).catch(() => { ownsFullscreen = false; });
  } catch { ownsFullscreen = false; }
  // If native fullscreen is unavailable, the same player still fills the viewport.
}
export function exitPlaybackView() {
  if (typeof document === "undefined") return;
  document.documentElement.classList.remove(CLASS_NAME); announce();
  if (ownsFullscreen && document.fullscreenElement) void document.exitFullscreen().catch(() => {});
}
export function subscribePlaybackView(listener: () => void) {
  document.addEventListener(VIEW_EVENT, listener);
  document.addEventListener("fullscreenchange", listener);
  return () => { document.removeEventListener(VIEW_EVENT, listener); document.removeEventListener("fullscreenchange", listener); };
}
