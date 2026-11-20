import type { GenreKey } from "@/lib/genres";

export type Hemisphere = "auto" | "north" | "south" | "equatorial";
export type RecommendationTheme = { label: string; genres: GenreKey[]; words?: string[] };
/** Editorial events must have explicit expiry dates; never invent news from a title. */
export type DatedTheme = RecommendationTheme & { starts: string; ends: string };
export const editorialEvents: DatedTheme[] = [];

export function localClock(now: number, timeZone: string) {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23" }).formatToParts(now);
  } catch {
    parts = new Intl.DateTimeFormat("en-CA", { timeZone: "UTC", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23" }).formatToParts(now);
  }
  const part = (key: string) => parts.find(part => part.type === key)?.value ?? "00";
  return { day: `${part("year")}-${part("month")}-${part("day")}`, month: Number(part("month")), date: Number(part("day")), hour: Number(part("hour")) };
}

export function seasonalThemes(now: number, timeZone: string, hemisphere: Hemisphere, events: readonly DatedTheme[] = editorialEvents): RecommendationTheme[] {
  const { day, month, date } = localClock(now, timeZone);
  const themes: RecommendationTheme[] = events.filter(event => event.starts <= day && day <= event.ends);
  if (month === 12 && date <= 26) themes.push({ label: "Festive favourites", genres: ["comedy", "romance", "animation"], words: ["christmas", "santa", "festive", "holiday"] });
  if (month === 12 && date >= 27 || month === 1 && date <= 7) themes.push({ label: "A fresh start", genres: ["adventure", "comedy"], words: ["new year", "new beginning"] });
  if (month === 2 && date >= 8 && date <= 15) themes.push({ label: "For the romantics", genres: ["romance"], words: ["valentine", "love story"] });
  if (month === 10 && date >= 18) themes.push({ label: "Halloween nights", genres: ["horror", "mystery"], words: ["halloween", "haunted", "ghost"] });
  if (month === 4 && date >= 18 && date <= 23) themes.push({ label: "Our remarkable planet", genres: ["documentary"], words: ["nature", "planet", "wildlife", "ocean", "earth"] });
  // Do not infer weather, location or religion. Equatorial/unknown zones use a neutral calendar theme.
  const inferred = /^(Australia|Antarctica)\//.test(timeZone) || timeZone === "Pacific/Auckland" ? "south"
    : /^(Europe|America)\//.test(timeZone) && !/Argentina|Santiago|Sao_Paulo|Lima|Bogota/.test(timeZone) ? "north" : "equatorial";
  const side = hemisphere === "auto" ? inferred : hemisphere;
  if (side !== "equatorial") {
    const warm = side === "north" ? month >= 6 && month <= 8 : month === 12 || month <= 2;
    const cool = side === "north" ? month === 12 || month <= 2 : month >= 6 && month <= 8;
    themes.push(warm ? { label: "Summer escapes", genres: ["adventure", "comedy", "romance"] }
      : cool ? { label: "Cosy evenings", genres: ["fantasy", "animation", "comedy"] }
        : { label: "A change of scene", genres: ["adventure", "drama"] });
  } else themes.push({ label: "A little escape", genres: month >= 10 || month <= 2 ? ["fantasy", "comedy"] : ["adventure", "documentary"] });
  return themes;
}
