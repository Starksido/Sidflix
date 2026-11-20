"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { SparkleIcon, ThumbsUpIcon, ThumbsDownIcon, SlidersHorizontalIcon, ArrowCounterClockwiseIcon } from "@phosphor-icons/react";
import { FeatureRail } from "@/components/feature-rail";
import { authClient } from "@/lib/auth-client";
import type { Title } from "@/lib/catalog";
import { localClock, type Hemisphere } from "@/lib/recommendation-context";
import { moods, recommendationKey, recommendTitles } from "@/lib/recommendations";
import { resetRecommendations, setDailyMood, setTasteFeedback, updateRecommendationOptions, useRecommendationPreferences, useRecommendationSync } from "@/lib/recommendation-store";
import { useActiveProfile, useNowPlaying, useViewerIdentity } from "@/lib/viewer-store";

type Catalog = { items: Title[]; trendingKeys: string[]; generatedAt: number; partial: boolean };
export function RecommendedSection({ fallback, initialNow }: { fallback: Title[]; initialNow: number }) {
  const { data: session, isPending } = authClient.useSession();
  return <section id="recommended" className="recommendation-section scroll-mt-28" aria-label="Recommended for you">
    {!session ? <div className="px-gutter"><div className="recommendation-invitation"><span className="recommendation-symbol" aria-hidden><SparkleIcon weight="duotone" size={28} /></span>
      <div><p className="recommendation-eyebrow">YOUR NEXT FAVOURITE</p><h2 className="font-display mt-1 text-2xl font-semibold">Recommended for you</h2>
        <p className="mt-2 max-w-xl text-sm text-fg-muted">A world of stories, a little more your own. Sign in for picks that grow with your taste, wherever you watch.</p></div>
      <Link href="/account" className="recommendation-signin">{isPending ? "Your account" : "Make it yours"}</Link>
    </div></div> : <PersonalRecommendations key={session.user.id} userId={session.user.id} fallback={fallback} initialNow={initialNow} />}
  </section>;
}

function PersonalRecommendations({ userId, fallback, initialNow }: { userId: string; fallback: Title[]; initialNow: number }) {
  const profile = useActiveProfile(), identity = useViewerIdentity();
  const preferences = useRecommendationPreferences(identity), sync = useRecommendationSync(identity);
  const [catalog, setCatalog] = useState<Catalog | null>(null), [failed, setFailed] = useState(false), [attempt, setAttempt] = useState(0);
  const [clock, setClock] = useState({ now: initialNow, zone: "UTC" });
  const [settings, setSettings] = useState(false), [reset, setReset] = useState(false), [undo, setUndo] = useState<Title | null>(null);
  const playerOpen = useNowPlaying() !== null;
  const loadedCatalogKey = useRef("");
  const localDay = localClock(clock.now, clock.zone).day;
  const accountReady = identity === JSON.stringify([userId, profile.id]);
  useEffect(() => {
    const update = () => setClock({ now: Date.now(), zone: Intl.DateTimeFormat().resolvedOptions().timeZone });
    update(); const timer = setInterval(update, 60_000); return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    const requestKey = `${attempt}|${localDay}`;
    if (playerOpen || loadedCatalogKey.current === requestKey) return;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 90_000);
    fetch("/api/recommendations/catalog", { signal: controller.signal }).then(async response => {
      if (!response.ok) throw Error("Unavailable");
      const result: Catalog = await response.json();
      if (!Array.isArray(result.items)) throw Error("Invalid catalogue");
      loadedCatalogKey.current = requestKey;
      setCatalog(result); setFailed(false);
    }).catch(() => { if (!controller.signal.aborted) setFailed(true); }).finally(() => clearTimeout(timer));
    const timeout = setTimeout(() => { if (controller.signal.aborted) setFailed(true); }, 90_100);
    return () => { clearTimeout(timer); clearTimeout(timeout); controller.abort(); };
  }, [attempt, localDay, playerOpen]);
  const picks = useMemo(() => recommendTitles({ items: [...(catalog?.items ?? []), ...fallback], preferences, accountSeed: userId,
    now: clock.now, timeZone: clock.zone, maxMaturity: profile.maxMaturity, trendingKeys: catalog?.trendingKeys, count: 18 }), [catalog, fallback, preferences, userId, clock, profile.maxMaturity]);
  const selectedMood = preferences.mood?.day === localClock(clock.now, clock.zone).day ? preferences.mood.value : "auto";
  const controls = <div className="recommendation-controls">
    <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-fg-muted">What feels right today?</p>
      <button type="button" aria-expanded={settings} aria-controls="recommendation-settings" onClick={() => setSettings(value => !value)} className="recommendation-settings-button"><SlidersHorizontalIcon size={16} aria-hidden />Fine-tune your picks</button></div>
    <div className="recommendation-moods scrollbar-none" role="group" aria-label="Today’s mood">{moods.map(mood => <button key={mood.id} type="button" disabled={!accountReady || sync === "loading"} aria-pressed={selectedMood === mood.id} onClick={() => setDailyMood(identity, mood.id, clock.now, clock.zone)}>{mood.label}</button>)}</div>
    {settings && <div id="recommendation-settings" className="recommendation-settings">
      <label><input type="checkbox" checked={preferences.seasonal} onChange={event => updateRecommendationOptions(identity, { seasonal: event.target.checked })} />Seasonal &amp; holiday discoveries</label>
      <label><input type="checkbox" checked={preferences.trending} onChange={event => updateRecommendationOptions(identity, { trending: event.target.checked })} />Include what’s trending this week</label>
      <label>Seasonal setting<select aria-label="Seasonal setting" value={preferences.hemisphere} onChange={event => updateRecommendationOptions(identity, { hemisphere: event.target.value as Hemisphere })}><option value="auto">Use my time zone</option><option value="north">Northern seasons</option><option value="south">Southern seasons</option><option value="equatorial">Equatorial seasons</option></select></label>
      <div className="flex flex-wrap items-center gap-3"><button type="button" onClick={() => setReset(value => !value)} className="inline-flex items-center gap-2 text-sm text-fg-muted"><ArrowCounterClockwiseIcon size={15} aria-hidden />Start fresh</button>
        {reset && <><span className="text-xs text-fg-muted">Clear this account’s recommendation history and preferences?</span><button type="button" className="text-sm text-accent" onClick={() => { resetRecommendations(identity); setReset(false); }}>Clear preferences</button><button type="button" className="text-sm text-fg-muted" onClick={() => setReset(false)}>Keep them</button></>}</div>
      <p className="text-xs text-fg-subtle">Your viewing history and preferences belong to your account. Your mood resets tomorrow.</p>
    </div>}
    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-fg-subtle"><p>{preferences.history.length ? "Inspired by what you enjoy. Shaped by today." : "A few discoveries to begin. Watch or like a title to make these more personal."}</p>
      <p role="status">{sync === "offline" ? "Changes will sync when you reconnect." : sync === "saving" ? "Saving your taste…" : sync === "loading" ? "Bringing your taste with you…" : "Your taste, across every screen."}</p></div>
    {undo && <p role="status" className="text-sm text-fg-muted">We’ll show less like {undo.title}. <button type="button" className="text-accent underline" onClick={() => { setTasteFeedback(identity, undo, null); setUndo(null); }}>Undo</button></p>}
    {failed && <p className="text-xs text-fg-muted">More discoveries are taking a little longer. <button type="button" onClick={() => { setFailed(false); setAttempt(value => value + 1); }} className="underline">Try again</button></p>}
  </div>;
  if (!accountReady || sync === "loading") return <div className="px-gutter"><h2 className="font-display text-2xl font-semibold">Recommended for you</h2><p role="status" className="mt-3 text-sm text-fg-muted">Bringing your taste with you…</p></div>;
  if (!picks.length) return <div className="px-gutter"><h2 className="font-display text-2xl font-semibold">Recommended for you</h2><div className="mt-4">{controls}</div><p className="mt-5 text-sm text-fg-muted">Fresh stories are on their way. Try a different mood or explore the collections below.</p></div>;
  return <FeatureRail id="personal-picks" heading={<><SparkleIcon size={23} className="text-playback" weight="duotone" aria-hidden />Recommended for you</>}
    items={picks.map(pick => pick.title)} annotations={Object.fromEntries(picks.map(pick => [pick.title.id, pick.reason]))} controls={controls}
    actions={title => {
      const liked = preferences.feedback[recommendationKey(title)]?.value === "like";
      return <><button type="button" aria-pressed={liked} aria-label={`More like ${title.title}`} title="More like this" onClick={() => setTasteFeedback(identity, title, liked ? null : "like")}><ThumbsUpIcon weight={liked ? "fill" : "regular"} size={17} aria-hidden /></button>
        <button type="button" aria-label={`Not interested in ${title.title}`} title="Not for me" onClick={() => { setTasteFeedback(identity, title, "dislike"); setUndo(title); }}><ThumbsDownIcon size={17} aria-hidden /></button></>;
    }} />;
}
