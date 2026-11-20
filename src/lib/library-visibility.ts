import type { Title } from "@/lib/catalog";

/** Restore this switch to bring back the connected laptop library and its history. */
export const SHOW_LOCAL_LIBRARY = false;

export function isVisibleInBrowse(title: Title): boolean {
  if (title.niche === "gaming") return false;
  if (SHOW_LOCAL_LIBRARY) return true;
  return !title.id.startsWith("lib-") && !title.id.startsWith("local-") &&
    !(title.kind === "film" && title.local) &&
    !(title.kind === "series" && title.episodes?.some(episode => episode.local));
}
