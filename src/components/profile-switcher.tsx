"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { profiles, type Profile } from "@/lib/catalog";
import { switchProfile, useActiveProfile } from "@/lib/viewer-store";

export function Avatar({ profile, size = "sm" }: { profile: Profile; size?: "sm" | "md" }) {
  return (
    <span
      aria-hidden
      className={`font-display grid shrink-0 place-items-center rounded-md font-bold text-black ${
        size === "sm" ? "size-8 text-sm" : "size-10 text-base"
      }`}
      style={{ background: profile.color }}
    >
      {profile.name.charAt(0)}
    </span>
  );
}

export function ProfileSwitcher() {
  const active = useActiveProfile();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const items = menuRef.current?.querySelectorAll<HTMLElement>("[role=menuitemradio]");
    const checked = menuRef.current?.querySelector<HTMLElement>("[aria-checked=true]");
    (checked ?? items?.[0])?.focus();

    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const close = (restoreFocus: boolean) => {
    setOpen(false);
    if (restoreFocus) buttonRef.current?.focus();
  };

  const onMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const items = [...(menuRef.current?.querySelectorAll<HTMLElement>("[role=menuitemradio]") ?? [])];
    const index = items.indexOf(document.activeElement as HTMLElement);
    const focusAt = (i: number) => items[(i + items.length) % items.length]?.focus();

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        focusAt(index + 1);
        break;
      case "ArrowUp":
        event.preventDefault();
        focusAt(index - 1);
        break;
      case "Home":
        event.preventDefault();
        focusAt(0);
        break;
      case "End":
        event.preventDefault();
        focusAt(items.length - 1);
        break;
      case "Escape":
        event.preventDefault();
        close(true);
        break;
      case "Tab":
        setOpen(false);
        break;
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" && !open) {
            event.preventDefault();
            setOpen(true);
          }
        }}
        className="flex items-center gap-2 rounded-md p-1 pr-2 transition-colors hover:bg-white/10"
      >
        <Avatar profile={active} />
        <span className="hidden text-sm font-medium sm:inline">{active.name}</span>
        <span className="sr-only">, switch profile</span>
        <svg
          viewBox="0 0 20 20"
          aria-hidden
          className={`size-3.5 transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="M5 8l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label="Switch profile"
          onKeyDown={onMenuKeyDown}
          className="bg-surface-1/95 absolute top-full right-0 mt-2 w-60 rounded-xl p-1.5 shadow-2xl shadow-black/60 ring-1 ring-white/10 backdrop-blur-md"
        >
          <p className="text-fg-subtle px-2.5 pt-1.5 pb-2 text-xs">Who&apos;s watching?</p>
          {profiles.map((profile) => {
            const checked = profile.id === active.id;
            return (
              <button
                key={profile.id}
                type="button"
                role="menuitemradio"
                aria-checked={checked}
                tabIndex={-1}
                onClick={() => {
                  switchProfile(profile.id);
                  close(true);
                }}
                className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm outline-none hover:bg-white/10 focus:bg-white/10"
              >
                <Avatar profile={profile} size="md" />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{profile.name}</span>
                  <span className="text-fg-subtle block text-xs">
                    {profile.isKids ? "Kids profile, all ages and 7+" : `Up to ${profile.maxMaturity}`}
                  </span>
                </span>
                {checked && (
                  <svg viewBox="0 0 20 20" aria-hidden className="text-accent size-4">
                    <path d="M4 10.5l4 4 8-9" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
