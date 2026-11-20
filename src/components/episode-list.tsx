"use client";

import { useEffect, useRef, type HTMLAttributes } from "react";
import { revealEpisode } from "@/lib/episode-focus";

/** Keep the selected row visible when TV dimensions, fonts or row heights change. */
export function EpisodeList(props: HTMLAttributes<HTMLOListElement>) {
  const list = useRef<HTMLOListElement>(null);
  useEffect(() => {
    const element = list.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      const active = document.activeElement;
      const button = active instanceof Element ? active.closest<HTMLElement>("[data-episode-button]") : null;
      if (button && element.contains(button)) revealEpisode(button);
    });
    observer.observe(element);
    if (element.parentElement) observer.observe(element.parentElement);
    const dialog = element.closest("dialog"); if (dialog) observer.observe(dialog);
    return () => observer.disconnect();
  }, []);
  return <ol {...props} ref={list} onFocusCapture={event => {
    const button = event.target instanceof Element ? event.target.closest<HTMLElement>("[data-episode-button]") : null;
    if (button) revealEpisode(button);
    props.onFocusCapture?.(event);
  }} />;
}
