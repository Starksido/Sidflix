export type DownloadStatus = "queued" | "downloading" | "pausing" | "paused" | "completed" | "error";
export type SavedDownload = {
  key: string; accountId: string; itemId: string; variantId: string; title: string; year: number; poster: string;
  quality: string; mime: string; bytes: number; downloaded: number; status: DownloadStatus; createdAt: number;
  error?: string; validator?: string; lease?: { owner: string; until: number };
};
let opening: Promise<IDBDatabase> | null = null;
function database(): Promise<IDBDatabase> {
  if (!opening) opening = new Promise((resolve, reject) => {
    const request = indexedDB.open("sidflix-downloads-v1", 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      const jobs = db.createObjectStore("jobs", { keyPath: "key" }); jobs.createIndex("account", "accountId");
      const chunks = db.createObjectStore("chunks", { keyPath: ["key", "offset"] }); chunks.createIndex("job", "key");
    };
    request.onsuccess = () => { const db = request.result; db.onversionchange = () => { db.close(); opening = null; }; resolve(db); };
    request.onerror = () => { opening = null; reject(new Error("Downloads couldn’t access this device’s storage.")); };
  });
  return opening;
}
const completion = (transaction: IDBTransaction) => new Promise<void>((resolve, reject) => {
  transaction.oncomplete = () => resolve();
  transaction.onabort = () => reject(transaction.error ?? new Error("Download storage changed. Please try again."));
  transaction.onerror = () => reject(transaction.error ?? new Error("Download storage is unavailable."));
});
export async function listSavedDownloads(accountId: string): Promise<SavedDownload[]> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const request = db.transaction("jobs").objectStore("jobs").index("account").getAll(accountId);
    request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
  });
}
export async function writeSavedDownload(job: SavedDownload) {
  const db = await database(), tx = db.transaction("jobs", "readwrite"), done = completion(tx);
  tx.objectStore("jobs").put(job); await done;
}
async function changeJob(key: string, change: (job: SavedDownload | null) => SavedDownload | null) {
  const db = await database(), tx = db.transaction("jobs", "readwrite"), done = completion(tx); let result: SavedDownload | null = null;
  const store = tx.objectStore("jobs"), request = store.get(key);
  request.onsuccess = () => { result = change(request.result ?? null); if (result) store.put(result); };
  await done; return result;
}
export function queueSavedDownload(candidate: SavedDownload) {
  return changeJob(candidate.key, previous => {
    if (previous?.lease && previous.lease.until > Date.now()) return null;
    if (previous?.status === "completed") return previous;
    return { ...(previous ?? { ...candidate, downloaded: 0 }), status: "queued", error: undefined, lease: undefined };
  });
}
export function pauseSavedDownload(key: string) {
  return changeJob(key, previous => previous ? previous.status === "completed" ? previous : { ...previous, status: "paused", lease: undefined } : null);
}
export function finishOwnedDownload(job: SavedDownload, owner: string) {
  return changeJob(job.key, previous => previous?.lease?.owner === owner && previous.downloaded === job.downloaded ? { ...job, lease: undefined } : null);
}
export async function claimSavedDownload(key: string, owner: string): Promise<SavedDownload | null> {
  const db = await database(), tx = db.transaction("jobs", "readwrite"), done = completion(tx); let claimed: SavedDownload | null = null;
  const store = tx.objectStore("jobs"), request = store.get(key);
  request.onsuccess = () => {
    const job = request.result as SavedDownload | undefined;
    if (!job || job.status === "completed" || job.lease && job.lease.owner !== owner && job.lease.until > Date.now()) return;
    claimed = { ...job, status: "downloading", error: undefined, lease: { owner, until: Date.now() + 30_000 } }; store.put(claimed);
  };
  await done; return claimed;
}
export async function commitDownloadChunk(job: SavedDownload, data: Blob, owner: string): Promise<SavedDownload> {
  const db = await database(), tx = db.transaction(["jobs", "chunks"], "readwrite"), done = completion(tx);
  let next = job; const request = tx.objectStore("jobs").get(job.key);
  request.onsuccess = () => {
    const previous = request.result as SavedDownload | undefined;
    if (!previous || previous.lease?.owner !== owner || previous.downloaded !== job.downloaded) { tx.abort(); return; }
    next = { ...job, downloaded: job.downloaded + data.size, lease: { owner, until: Date.now() + 30_000 } };
    tx.objectStore("chunks").put({ key: job.key, offset: job.downloaded, data }); tx.objectStore("jobs").put(next);
  };
  await done; return next;
}
export async function clearDownloadChunks(job: SavedDownload, owner: string) {
  const db = await database(), tx = db.transaction(["jobs", "chunks"], "readwrite"), done = completion(tx);
  const read = tx.objectStore("jobs").get(job.key);
  read.onsuccess = () => {
    if ((read.result as SavedDownload | undefined)?.lease?.owner !== owner) { tx.abort(); return; }
    const request = tx.objectStore("chunks").index("job").openCursor(IDBKeyRange.only(job.key));
    request.onsuccess = () => { const cursor = request.result; if (cursor) { cursor.delete(); cursor.continue(); } };
    tx.objectStore("jobs").put({ ...job, downloaded: 0 });
  };
  await done;
}
export async function removeSavedDownload(key: string) {
  const db = await database(), tx = db.transaction(["jobs", "chunks"], "readwrite"), done = completion(tx);
  const request = tx.objectStore("chunks").index("job").openCursor(IDBKeyRange.only(key));
  request.onsuccess = () => { const cursor = request.result; if (cursor) { cursor.delete(); cursor.continue(); } };
  tx.objectStore("jobs").delete(key); await done;
}
export async function savedDownloadBlob(job: SavedDownload): Promise<Blob> {
  if (job.status !== "completed") throw new Error("This download isn’t ready yet.");
  const db = await database();
  return new Promise((resolve, reject) => {
    const request = db.transaction("chunks").objectStore("chunks").index("job").getAll(job.key);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const chunks = (request.result as { offset: number; data: Blob }[]).sort((a, b) => a.offset - b.offset); let expected = 0;
      for (const chunk of chunks) { if (chunk.offset !== expected) { reject(new Error("The saved file is incomplete. Please download it again.")); return; } expected += chunk.data.size; }
      if (expected !== job.bytes) { reject(new Error("The saved file is incomplete. Please download it again.")); return; }
      resolve(new Blob(chunks.map(chunk => chunk.data), { type: job.mime }));
    };
  });
}
