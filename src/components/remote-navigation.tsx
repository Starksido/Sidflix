"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { adjacentRow, directionalTarget, remoteKey } from "@/lib/remote-navigation";
import { closePlayer, closeSeries } from "@/lib/viewer-store";
import { enterPlaybackView, exitPlaybackView, isImmersivePlayback } from "@/lib/playback-view";
import { isRemoteMode, setRemoteMode } from "@/lib/remote-mode";
import { revealEpisode } from "@/lib/episode-focus";

const FOCUSABLE = "button:not([disabled]),a[href],summary,input:not([disabled]),select:not([disabled]),[tabindex='0']";
function remoteTarget(target: EventTarget | null): HTMLElement {
  const element = target instanceof Element && target !== document.body && target !== document.documentElement ? target : document.activeElement;
  return (element?.closest<HTMLElement>("[data-episode-button]") ?? element?.closest<HTMLElement>(FOCUSABLE) ?? element ?? document.body) as HTMLElement;
}
function available(element: HTMLElement) {
  if (!element.getClientRects().length || getComputedStyle(element).visibility === "hidden" || element.closest("[inert],[data-remote-skip]") || isRemoteMode() && element.matches(".browse-all,.feature-remove")) return false;
  const details = element.closest("details:not([open])");
  return (!details || element === details.querySelector("summary")) && !(element instanceof HTMLInputElement && element.type === "hidden");
}
function focus(element: HTMLElement) {
  element.focus({ preventScroll: true });
  reveal(element);
}
function reveal(element: HTMLElement) {
  if (element.matches("[data-episode-button]") && revealEpisode(element)) return;
  requestAnimationFrame(() => {
    if (document.activeElement !== element || !element.isConnected) return;
    element.scrollIntoView({ block: element.matches("[data-title-button],.genre-tile,.category-strip>a") ? "center" : "nearest", inline: "nearest", behavior: "auto" });
  });
}

/** A remote moves the selection itself; horizontal rails need no paging buttons. */
export function RemoteNavigation() {
  const pathname = usePathname(), router = useRouter();
  const pagePositions = useRef(new Map<string, string>());
  useEffect(() => {
    const rows = new WeakMap<Element, HTMLElement>();
    const episodePositions = new WeakMap<Element, HTMLElement>();
    let browseFocus: HTMLElement | null = null;
    let hadModal = false;
    let waitingSection: HTMLElement | null = null;
    try {
      if (sessionStorage.getItem("sidflix:remote-mode") === "true" || /SmartTV|Smart-TV|Tizen|Web0S|WebOS|HbbTV|Android.*TV/i.test(navigator.userAgent)) setRemoteMode(true);
    } catch {}
    const initial = () => {
      if (pathname === "/downloads") return [...document.querySelectorAll<HTMLElement>("main .downloads-primary,main button,main a[href]")].find(available);
      const cards = [...document.querySelectorAll<HTMLElement>("main [data-title-button],main .category-strip>a")].filter(available);
      if (pathname === "/search") return document.querySelector<HTMLElement>(".screen-keyboard button") ?? cards[0];
      const remembered = pagePositions.current.get(pathname);
      return cards.find(card => card.dataset.titleButton === remembered) ?? cards[0] ?? document.querySelector<HTMLElement>(".cinema-nav [aria-current=page]");
    };
    const focusin = (event: FocusEvent) => {
      const element = remoteTarget(event.target);
      const episodeDialog = element.closest("dialog[data-episode-dialog][open]");
      if (episodeDialog) episodePositions.set(episodeDialog, element);
      const row = element.closest("[data-remote-row]");
      if (row && element.matches("[data-title-button],a[href]")) rows.set(row, element);
      if (!element.closest("dialog")) {
        browseFocus = element;
        if (element.dataset.titleButton) pagePositions.current.set(pathname, element.dataset.titleButton);
      }
      waitingSection = element.matches("[data-remote-placeholder],[data-remote-loading]") ? element.closest<HTMLElement>("[data-deferred-section]") ?? element : null;
      if (isRemoteMode()) reveal(element);
    };
    const recoverFocus = () => {
      const modal = document.querySelector("dialog[open]");
      if (hadModal && !modal && browseFocus?.isConnected && isRemoteMode()) focus(browseFocus);
      hadModal = Boolean(modal);
      if (modal?.hasAttribute("data-episode-dialog") && isRemoteMode() && document.hasFocus() && !modal.contains(document.activeElement)) {
        const remembered = episodePositions.get(modal);
        const destination = remembered?.isConnected && available(remembered) ? remembered : modal.querySelector<HTMLElement>("[data-episode-button]") ?? modal.querySelector<HTMLElement>(".season-picker-trigger") ?? modal.querySelector<HTMLElement>("button");
        if (destination) focus(destination);
      }
      if (modal || !isRemoteMode()) return;
      if (waitingSection && (waitingSection.contains(document.activeElement) || document.activeElement === document.body)) {
        const first = [...waitingSection.querySelectorAll<HTMLElement>("[data-title-button],.genre-tile,[data-remote-placeholder],button")].find(available);
        if (first) focus(first);
      } else if (document.activeElement === document.body || document.activeElement === document.documentElement) {
        const element = browseFocus?.isConnected ? browseFocus : initial();
        if (element) focus(element);
      }
      if (document.activeElement instanceof HTMLElement && document.activeElement.hasAttribute("data-title-button")) reveal(document.activeElement);
    };
    const remoteInput = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const key = remoteKey(event);
      if (key && (key !== "ok" || !remoteTarget(event.target).matches("input,textarea,select"))) setRemoteMode(true);
    };
    const pointer = (event: PointerEvent) => {
      if (event.pointerType === "mouse" && (event.type === "pointerdown" || event.movementX || event.movementY)) setRemoteMode(false);
    };
    const keydown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
      let target = remoteTarget(event.target);
      const key = remoteKey(event);
      if (!key) return;
      const modal = [...document.querySelectorAll<HTMLDialogElement>("dialog[open]")].at(-1);
      if (modal?.hasAttribute("data-episode-dialog") && !modal.contains(target)) {
        const remembered = episodePositions.get(modal);
        target = remembered?.isConnected && available(remembered) ? remembered : modal.querySelector<HTMLElement>("[data-episode-button]") ?? modal.querySelector<HTMLElement>(".season-picker-trigger") ?? modal.querySelector<HTMLElement>("button") ?? modal;
        focus(target);
      }
      if (target.matches("textarea,select,[contenteditable=true]")) return;
      if (target.matches("input")) {
        if (target instanceof HTMLInputElement && ["search", "text"].includes(target.type) && (key === "up" || key === "down")) {
          const destination = key === "down" ? document.querySelector<HTMLElement>("main [data-title-button],main .screen-keyboard button") : document.querySelector<HTMLElement>(".cinema-nav a");
          if (destination) { event.preventDefault(); focus(destination); }
        }
        return;
      }
      if (key === "back") {
        event.preventDefault();
        const menu = target.closest<HTMLElement>("[role=menu]"), details = target.closest<HTMLDetailsElement>("details[open]");
        if (menu) { document.querySelector<HTMLElement>(`[aria-controls="${CSS.escape(menu.id)}"]`)?.click(); return; }
        if (details) { details.open = false; details.querySelector<HTMLElement>("summary")?.focus(); return; }
        if (modal) {
          if (isImmersivePlayback()) exitPlaybackView();
          else if (modal.hasAttribute("data-offline-player")) modal.close();
          else if (modal.hasAttribute("data-player-dialog")) closePlayer(); else closeSeries();
        } else if (pathname !== "/") router.push("/");
        else { const home = document.querySelector<HTMLElement>('.cinema-nav a[href="/"]'); if (home) focus(home); }
        return;
      }
      if (key === "ok") {
        if (modal?.hasAttribute("data-player-dialog") && (target === document.body || target === modal)) {
          event.preventDefault(); if (!event.repeat) { enterPlaybackView(); modal.querySelector<HTMLElement>("[data-player-stage]")?.focus(); } return;
        }
        if (target.matches("button,a[href],summary,[role=button]")) { event.preventDefault(); if (!event.repeat) target.click(); }
        else if (!modal) { event.preventDefault(); const element = initial(); if (element) focus(element); }
        return;
      }
      const scope = modal ?? document;
      let elements = [...scope.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(available);
      if (waitingSection?.contains(target) && !elements.includes(target)) elements.push(target);
      if (target.hasAttribute("data-episode-button") && (key === "up" || key === "down")) {
        const episodes = [...scope.querySelectorAll<HTMLElement>("[data-episode-button]")].filter(available);
        const next = episodes[episodes.indexOf(target) + (key === "down" ? 1 : -1)];
        const destination = next ?? (key === "up" ? scope.querySelector<HTMLElement>(".season-picker-trigger") : null);
        event.preventDefault(); if (destination) focus(destination); return;
      }
      const currentRow = target.closest("[data-remote-row]");
      if (currentRow && (key === "left" || key === "right")) {
        const cards = [...currentRow.querySelectorAll<HTMLElement>("[data-title-button],a[href]")].filter(available);
        if (cards.includes(target)) {
          const next = cards[cards.indexOf(target) + (key === "right" ? 1 : -1)];
          event.preventDefault(); if (next) focus(next); return;
        }
      }
      if (currentRow && (key === "up" || key === "down")) {
        const outside = elements.filter(element => !currentRow.contains(element));
        const neighbours = adjacentRow(outside.map(element => {
          const rect = element.getBoundingClientRect();
          return { left: rect.left, top: rect.top - (!modal && element.closest(".cinema-header") ? window.scrollY : 0), width: rect.width, height: rect.height };
        }), currentRow.getBoundingClientRect(), key);
        elements = [target, ...neighbours.map(index => outside[index])];
      }
      const active = elements.indexOf(document.activeElement as HTMLElement);
      const next = directionalTarget(elements.map(element => {
        const rect = element.getBoundingClientRect();
        // A fixed header belongs above the content, rather than between scrolled rows.
        return { left: rect.left, top: rect.top - (!modal && element.closest(".cinema-header") ? window.scrollY : 0), width: rect.width, height: rect.height };
      }), active, key);
      event.preventDefault();
      if (active < 0 && !modal) { const element = initial(); if (element) focus(element); return; }
      if (next >= 0) {
        let destination = elements[next];
        const row = destination.closest("[data-remote-row]");
        const remembered = row && rows.get(row);
        if ((key === "up" || key === "down") && remembered?.isConnected && available(remembered)) destination = remembered;
        focus(destination);
      }
    };
    const observer = new MutationObserver(recoverFocus);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["open"] });
    document.addEventListener("focusin", focusin);
    const focusout = () => requestAnimationFrame(recoverFocus);
    document.addEventListener("focusout", focusout);
    window.addEventListener("focus", recoverFocus);
    document.addEventListener("keydown", remoteInput, true);
    document.addEventListener("keydown", keydown);
    document.addEventListener("pointermove", pointer, { passive: true });
    document.addEventListener("pointerdown", pointer, { passive: true });
    document.documentElement.dataset.remoteReady = "true";
    recoverFocus();
    return () => {
      observer.disconnect();
      document.removeEventListener("focusin", focusin);
      document.removeEventListener("focusout", focusout);
      window.removeEventListener("focus", recoverFocus);
      document.removeEventListener("keydown", remoteInput, true);
      document.removeEventListener("keydown", keydown);
      document.removeEventListener("pointermove", pointer);
      document.removeEventListener("pointerdown", pointer);
      delete document.documentElement.dataset.remoteReady;
    };
  }, [pathname, router]);
  return null;
}
