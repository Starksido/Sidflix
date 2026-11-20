import dotenv from "dotenv";
import { loadVidSparkShows } from "../src/lib/sources/online-shows";
import { synchronizeGenreShows } from "../src/lib/sources/genres";

dotenv.config({ path: ".env.local", quiet: true });

async function main() {
  const result = await synchronizeGenreShows(await loadVidSparkShows());
  console.info(`[genres] Ready: ${result.items.length} catalogue shows classified${result.partial ? " (some metadata requests failed)" : ""}.`);
}

main().catch(() => { console.error("[genres] Catalogue grouping could not finish. Existing progress is retained for retry."); process.exitCode = 1; });
