import "server-only";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

/** Persist discovery times so restarting, reindexing or changing a file cannot reset the week. */
export async function rememberAdded(ids: string[], now: number): Promise<Record<string, number>> {
  const filename = process.env.LOCAL_MEDIA_INDEX_PATH ?? path.join(process.cwd(), "data", "library-added.json");
  let stored: Record<string, number> = {};
  try {
    // Runtime state belongs to this machine and must not be traced into a deployment.
    const value: unknown = JSON.parse(await readFile(/* turbopackIgnore: true */ filename, "utf8"));
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid library dates");
    stored = Object.fromEntries(Object.entries(value).filter(([id, date]) =>
      /^local-[a-f0-9]{32}$/.test(id) && typeof date === "number" && Number.isFinite(date) && date > 0));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  let changed = false;
  for (const id of ids) {
    if (stored[id] === undefined) { stored[id] = now; changed = true; }
  }
  if (changed) {
    await mkdir(path.dirname(filename), { recursive: true });
    const temporary = `${filename}.${process.pid}.${Math.random().toString(36).slice(2)}.tmp`;
    await writeFile(temporary, JSON.stringify(stored, null, 2));
    await rename(temporary, filename);
  }
  return stored;
}
