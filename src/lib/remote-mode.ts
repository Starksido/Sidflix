"use client";

import { useSyncExternalStore } from "react";

const EVENT = "sidflix:remote-mode";
export function isRemoteMode() {
  return typeof document !== "undefined" && document.documentElement.classList.contains("remote-navigation-active");
}
export function setRemoteMode(active: boolean) {
  if (isRemoteMode() === active) return;
  document.documentElement.classList.toggle("remote-navigation-active", active);
  try { sessionStorage.setItem("sidflix:remote-mode", String(active)); } catch {}
  document.dispatchEvent(new Event(EVENT));
}
function subscribe(listener: () => void) {
  document.addEventListener(EVENT, listener);
  return () => document.removeEventListener(EVENT, listener);
}
export function useRemoteMode() { return useSyncExternalStore(subscribe, isRemoteMode, () => false); }
