# Offline downloads

Open `/downloads` from the profile menu or More menu. Sign in as Stark for permanent owner access. Other accounts need Premium to start or resume a download. There is no public route for changing memberships; this release does not add billing.

## Behaviour

- Streaming stays on the existing Standard player. Downloads are a separate option and never replace the stream.
- The initial downloadable collection consists of the verified open films **Big Buck Bunny**, **Caminandes: Llamigos**, and **Caminandes: Llama Drama**. This does not imply download availability for the commercial movie, TV or anime catalogue.
- Picture quality and expected file size appear before downloading. Unavailable qualities and sources are omitted rather than represented as working downloads.
- One managed download runs at a time on each device. Downloads continue across Sidflix page navigation, support pause/resume and keep committed chunks after reload. Reloaded partial downloads wait for Resume; they do not silently restart.
- Each signed-in account sees only its own local download records. Signing out clears the offline account checkpoint and aborts an active managed download. Saved files remain on that device until removed.
- **Watch offline** uses the saved file, with native video controls and fullscreen. **Save video file** exports a normal MP4/WebM to the device’s Downloads folder. Downloading the same film on one device does not copy it to another device.
- Removing a managed download deletes its IndexedDB record and chunks. It cannot delete separately exported files from the device’s Downloads folder.

## Phone and offline access

The offline Downloads page uses a small service worker and works on **localhost or HTTPS**. It caches only a generic offline page, the logo and the three original thumbnails. Account responses, private HTML, provider pages and videos never enter that cache. Videos live in IndexedDB, scoped by account ID.

The existing phone address, `http://192.168.100.6:3000`, uses plain HTTP. Mobile browsers do not permit service workers there. Use **Save video file** and open the saved video from the phone’s Downloads folder when disconnected. Hosting Sidflix over HTTPS enables the in-app offline page on phones too.

Browser storage has device-specific limits and may be cleared by the browser, especially in private browsing or under storage pressure. This release does not introduce DRM: exported files are ordinary videos and remain playable after membership expires. Membership is checked for every new server download/range request, not for files already saved on a device.

## Integrity and authorization

`/api/downloads/catalog` and `/api/downloads/[id]/file` use the server-verified account session and database membership on every request. Guest requests return 401, free accounts 403. Query parameters, display names and browser-stored flags cannot grant access. Responses are private and uncached.

File requests accept only curated title IDs and known quality IDs. They cannot proxy a caller-provided URL. HTTPS destinations and every redirect are checked against the small source allowlist. Size, media type, HTTP ranges and Content-Range are validated; each account may have at most two simultaneous server streams.

Committed chunks and the corresponding byte offset update in one IndexedDB transaction. A short lease and offset comparison protect against stale writes from multiple tabs. If a source ignores a resumed range and sends the whole file (Commons does this), the old partial file is discarded before writing the full response. Playback/export require contiguous chunks with the exact expected total size.

## Verification

- `node --conditions=react-server --import tsx --test tests/downloads.test.ts tests/account-access.test.ts`: real temporary account database; guest/free/owner/premium access, spoofed client privileges, immediate revocation, full and ranged responses, HEAD, range rejection, redirect/type/length rejection, concurrency and cancellation.
- Browser verification uses temporary accounts and the real 4,749,930-byte Commons film: download under throttling, pause, resume, SHA-256 comparison against the separately verified source, saved-file persistence, decoded playback, offline reload/play/seek, export, per-account separation and removal.
- Source trial details and independent FFmpeg decoding are recorded in `docs/download-source-trials.md`.

Final verification: production build and lint passed, all **68 automated tests** passed, and **23 browser checks** passed against the production build. The browser checks also simulated interruption after the final chunk was committed; Resume completed the existing file without an invalid request beyond the end of the file. The offline test stopped the app connection completely, then verified playback, seeking and an exported file with the same SHA-256 as the original. Temporary test accounts and exported test files were removed afterwards.

Film attribution is available at `/credits`. Original film artwork is retained.
