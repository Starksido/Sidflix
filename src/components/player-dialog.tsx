"use client";

import { useEffect, useRef } from "react";
import { formatViewers, type Channel } from "@/lib/catalog";
import { closePlayer, useNowPlaying } from "@/lib/viewer-store";

// Twitch channels play in Twitch's official embed player. Twitch requires the
// embedding site's hostname as `parent`, so the URL is built in the browser.

export function PlayerDialog() {
  const channel = useNowPlaying();
  if (!channel?.twitchLogin) return null;
  return <TwitchPlayer key={channel.id} channel={channel} login={channel.twitchLogin} />;
}

function TwitchPlayer({ channel, login }: { channel: Channel; login: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  const src = new URL("https://player.twitch.tv/");
  src.searchParams.set("channel", login);
  src.searchParams.set("parent", window.location.hostname);
  src.searchParams.set("autoplay", "true");

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="player-title"
      // Escape closes the dialog natively; the buttons unmount it straight away.
      onClose={closePlayer}
      onClick={(e) => {
        // A click on the backdrop lands on the dialog element itself.
        if (e.target === e.currentTarget) closePlayer();
      }}
      className="bg-surface-1 text-fg m-auto w-[calc(100%-2rem)] max-w-5xl overflow-hidden rounded-xl p-0 shadow-2xl shadow-black/60 ring-1 ring-white/10 backdrop:bg-black/80 backdrop:backdrop-blur-sm"
    >
      <iframe
        src={src.toString()}
        title={`${channel.host} live on Twitch`}
        allow="autoplay; fullscreen"
        allowFullScreen
        className="aspect-video w-full bg-black"
      />
      <div className="flex items-start justify-between gap-4 px-4 py-3 md:px-5 md:py-4">
        <div className="min-w-0">
          <h2 id="player-title" className="font-display truncate text-lg font-semibold tracking-tight">
            {channel.title}
          </h2>
          <p className="text-fg-subtle mt-0.5 truncate text-sm">
            {channel.host} playing {channel.game} · {formatViewers(channel.viewers)} watching
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {channel.source && (
            <a
              href={channel.source.href}
              target="_blank"
              rel="noreferrer"
              className="text-fg-muted hover:text-fg hidden rounded-md px-2 py-1.5 text-sm sm:block"
            >
              Open on Twitch
            </a>
          )}
          <button
            type="button"
            autoFocus
            onClick={closePlayer}
            aria-label="Close player"
            className="bg-surface-2 hover:bg-surface-3 grid size-9 place-items-center rounded-full transition-colors"
          >
            <svg viewBox="0 0 20 20" className="size-3.5" aria-hidden>
              <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>
    </dialog>
  );
}
