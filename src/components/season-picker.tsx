"use client";

import { useEffect, useId, useRef, useState } from "react";
import { remoteKey } from "@/lib/remote-navigation";

export function SeasonPicker({ seasons, value, onChange }: { seasons: { number: number; name: string }[]; value: number; onChange: (season: number) => void }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null), trigger = useRef<HTMLButtonElement>(null), id = useId();
  const selected = seasons.find(season => season.number === value);
  useEffect(() => {
    if (!open) return;
    root.current?.querySelector<HTMLElement>("[aria-selected=true]")?.focus();
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);
  const close = () => { setOpen(false); trigger.current?.focus(); };
  return <div ref={root} className="season-picker">
    <button ref={trigger} type="button" aria-label={`Season: ${selected?.name ?? value}`} aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? id : undefined}
      onClick={() => setOpen(value => !value)} onKeyDown={event => {
        const key = remoteKey(event);
        if (key === "ok" && event.key !== "Enter") { event.preventDefault(); setOpen(value => !value); }
        if (!open && (key === "left" || key === "right")) {
          event.preventDefault(); const index = seasons.findIndex(item => item.number === value), next = seasons[index + (key === "right" ? 1 : -1)]; if (next) onChange(next.number);
        }
      }} className="season-picker-trigger">{selected?.name ?? `Season ${value}`}<span aria-hidden>⌄</span></button>
    {open && <div id={id} role="listbox" aria-label="Seasons" className="season-picker-menu" onKeyDown={event => {
      const key = remoteKey(event), options = [...event.currentTarget.querySelectorAll<HTMLButtonElement>("[role=option]")], index = options.indexOf(document.activeElement as HTMLButtonElement);
      if (key === "up" || key === "down") { event.preventDefault(); event.stopPropagation(); const next = Math.max(0, Math.min(options.length - 1, index + (key === "down" ? 1 : -1))); options[next]?.focus(); options[next]?.scrollIntoView({ block: "nearest" }); }
      else if (key === "back" || key === "left") { event.preventDefault(); event.stopPropagation(); close(); }
      else if (key === "ok" && event.key !== "Enter") { event.preventDefault(); event.stopPropagation(); (document.activeElement as HTMLButtonElement)?.click(); }
    }}>
      {seasons.map(season => <button key={season.number} role="option" aria-selected={value === season.number} tabIndex={-1} type="button" onClick={() => { onChange(season.number); close(); }}>{season.name}</button>)}
    </div>}
  </div>;
}
