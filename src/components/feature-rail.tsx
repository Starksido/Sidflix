"use client";

import { useState, type KeyboardEvent, type ReactNode } from "react";
import { PlayIcon, XIcon } from "@phosphor-icons/react";
import { Artwork } from "@/components/artwork";
import { MaturityBadge } from "@/components/cards";
import { Rail } from "@/components/rail";
import { formatRuntime, isAllowed, runtimeMinutes, type Title, type WatchEntry } from "@/lib/catalog";
import { playTitle, removeFromWatching, useActiveProfile } from "@/lib/viewer-store";

/** A focused title opens into a landscape card without covering its neighbours. */
export function FeatureRail({ id, heading, items, entries, controls, annotations, actions }: {
  id: string;
  heading: ReactNode;
  items: Title[];
  entries?: WatchEntry[];
  controls?: ReactNode;
  annotations?: Record<string, string>;
  actions?: (title: Title) => ReactNode;
}) {
  const profile = useActiveProfile();
  const allowed = items.filter(title => isAllowed(title.maturity, profile.maxMaturity));
  const [selection, setSelection] = useState<string | null>(null);
  const selected = allowed.some(title => title.id === selection) ? selection : allowed[0]?.id;
  if (!allowed.length) return null;

  const navigate = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    const buttons = [...event.currentTarget.closest("ul")!.querySelectorAll<HTMLButtonElement>("[data-title-button]")];
    const position = buttons.indexOf(event.currentTarget);
    const next = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : Math.max(0, Math.min(buttons.length - 1, position + (event.key === "ArrowRight" ? 1 : -1)));
    event.preventDefault();
    buttons[next]?.focus({ preventScroll: true });
    buttons[next]?.closest("li")?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
  };

  return <Rail id={id} heading={heading} controls={controls} gapClassName="gap-3">
    {allowed.map(title => {
      const active = title.id === selected;
      const entry = entries?.find(item => item.titleId === title.id);
      const duration = runtimeMinutes(title);
      const left = entry && duration ? Math.max(1, Math.round(duration * (1 - entry.progress))) : null;
      const facts = title.kind === "series" ? ["Show", title.year, title.seasons ? `${title.seasons} seasons` : null] : title.kind === "film" ? ["Movie", title.year, title.minutes ? formatRuntime(title.minutes) : null] : [title.kind === "live" || title.kind === "tv-channel" ? "Live TV" : "Live stream"];
      return <li key={title.id} data-selected={active} className="feature-card"
        onPointerEnter={event => { if (event.pointerType === "mouse") setSelection(title.id); }}
        onFocusCapture={() => setSelection(title.id)}>
        <div className="relative">
          <button type="button" data-title-button={title.id} className="feature-card-button" onKeyDown={navigate} onClick={() => playTitle(title)}
            aria-label={`${entry ? "Resume" : title.kind === "series" ? "Browse episodes of" : "Play"} ${title.title}`}>
            <div className={active ? "feature-landscape" : "feature-poster"}><Artwork title={title} shape={active ? "wide" : "poster"} fill sizes={active ? "(max-width: 600px) 85vw, 560px" : "(max-width: 600px) 46vw, 220px"} showTitle /></div>
            <div className="feature-card-caption"><span>{title.title}</span><PlayIcon weight="fill" size={22} aria-hidden /></div>
            {entry && <div className="feature-progress" role="progressbar" aria-label={`${title.title} progress`} aria-valuenow={Math.round(entry.progress * 100)} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${entry.progress * 100}%` }} /></div>}
          </button>
          {entry && <button type="button" className="feature-remove" aria-label={`Remove ${title.title} from Continue watching`} onClick={() => removeFromWatching(title)}><XIcon size={16} aria-hidden /></button>}
        </div>
        {actions && <div className="recommendation-card-actions">{actions(title)}</div>}
        <div className="feature-details" aria-hidden={!active}>
          {annotations?.[title.id] && <p className="recommendation-reason">{annotations[title.id]}</p>}
          {entry ? <><p>{entry.episode !== undefined ? `S${entry.season} E${entry.episode} · ` : ""}{title.kind === "film" && title.episode ? title.episode.name : title.title}</p>{left !== null && <p className="mt-1 text-fg-muted">{left}m left</p>}</> : <><div className="flex flex-wrap items-center gap-2 text-sm text-fg-muted">{facts.filter(Boolean).map((fact, index) => <span key={index}>{index > 0 && <span className="mr-2" aria-hidden>·</span>}{fact}</span>)}<MaturityBadge maturity={title.maturity} /></div><p className="mt-1.5 line-clamp-2 text-sm leading-relaxed">{title.synopsis}</p></>}
        </div>
      </li>;
    })}
  </Rail>;
}
