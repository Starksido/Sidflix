import "server-only";
import type { Art } from "@/lib/catalog";

/** Fetches JSON or throws, so each source can fall back as a whole. */
export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${new URL(url).host}`);
  return (await res.json()) as T;
}

/** Stable artwork colours from a name, for sources that don't supply any. */
export function artFromSeed(seed: string): Art {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  return {
    from: `oklch(0.72 0.15 ${hue})`,
    to: `oklch(0.24 0.08 ${(hue + 40) % 360})`,
  };
}

export function clip(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
}
