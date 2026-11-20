export type PlaylistEntry = { id: string; name: string; url: string; logo?: string };

/** Public HTTPS HLS feeds only; browser playback cannot supply custom request headers. */
export function publicStreamUrl(value: string): string | null {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443") ||
      !host.includes(".") || host.includes(":") || /^(?:\d{1,3}\.){3}\d{1,3}$/.test(host) ||
      /(?:^|\.)(?:localhost|local|internal|test|invalid)$/.test(host)) return null;
    return url.toString();
  } catch { return null; }
}

export function parseIptvPlaylist(text: string): PlaylistEntry[] {
  const entries: PlaylistEntry[] = [];
  let info: string | null = null;
  let unsupported = false;
  for (const line of text.replace(/^\uFEFF/, "").split(/\r?\n/).map((line) => line.trim())) {
    if (line.startsWith("#EXTINF:")) { info = line; unsupported = /http-(?:user-agent|referrer)=/i.test(line); }
    else if (/^#(?:EXTVLCOPT|KODIPROP)/.test(line)) unsupported = true;
    else if (line && !line.startsWith("#") && info) {
      const url = publicStreamUrl(line);
      const id = /tvg-id="([^"]+)"/.exec(info)?.[1];
      if (url && id && !unsupported) entries.push({ id, url,
        name: info.slice(info.lastIndexOf(",") + 1).replace(/\s*\([^)]*\)|\s*\[[^\]]*\]/g, "").trim(),
        logo: /tvg-logo="([^"]+)"/.exec(info)?.[1] });
      info = null;
    }
  }
  return entries;
}

export function playlistLinks(text: string, base: string): string[] {
  return text.split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith("#"))
    .map((line) => { try { return publicStreamUrl(new URL(line, base).toString()); } catch { return null; } })
    .filter((url): url is string => url !== null);
}
