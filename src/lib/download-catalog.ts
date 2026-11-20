import type { Title } from "@/lib/catalog";

export type DownloadVariant = { id: string; label: string; bytes: number; mime: "video/mp4" | "video/webm" };
export type DownloadItem = { id: string; title: string; year: number; seconds: number; synopsis: string; poster: string; variants: DownloadVariant[] };
export const DOWNLOAD_TITLES = [
  { id: "big-buck-bunny", title: "Big Buck Bunny", year: 2008, seconds: 596, poster: "/media-downloads/big-buck-bunny.jpg", synopsis: "A gentle giant rabbit finds a creative way to stand up to three woodland bullies." },
  { id: "caminandes-llamigos", title: "Caminandes: Llamigos", year: 2016, seconds: 150, poster: "/media-downloads/caminandes-llamigos.jpg", synopsis: "In a snowy Patagonia, Koro the llama and a persistent penguin compete for one last berry." },
  { id: "caminandes-llama-drama", title: "Caminandes: Llama Drama", year: 2013, seconds: 90, poster: "/media-downloads/caminandes-llama-drama.jpg", synopsis: "A stubborn llama discovers that crossing a quiet road can be an adventure of its own." },
] as const;

export function downloadableTitleId(title: Title): string | null {
  if (title.kind !== "film" || title.episode) return null;
  const name = title.title.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (title.year === 2008 && name === "bigbuckbunny") return "big-buck-bunny";
  if (title.year === 2016 && ["caminandes3llamigos", "caminandesllamigos"].includes(name)) return "caminandes-llamigos";
  if (title.year === 2013 && ["caminandesllamadrama", "caminandes1llamadrama"].includes(name)) return "caminandes-llama-drama";
  return null;
}
export function formatDownloadSize(bytes: number) { return bytes >= 1e9 ? `${(bytes / 1e9).toFixed(1)} GB` : `${(bytes / 1e6).toFixed(1)} MB`; }
export function downloadFilename(title: string, quality: string, mime: string) {
  let stem = `${title} ${quality}`.replace(/[\x00-\x1f\x7f/\\:*?"<>|]/g, " ").replace(/\s+/g, " ").trim().replace(/[. ]+$/, "").slice(0, 110);
  if (!stem || /^(CON|PRN|AUX|NUL|COM\d|LPT\d)(\.|$)/i.test(stem)) stem = `Sidflix ${stem}`;
  return `${stem}.${mime === "video/webm" ? "webm" : "mp4"}`;
}
