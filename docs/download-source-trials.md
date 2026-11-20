# Optional premium download sources

Tested 16 November 2026. Streaming continues to use the existing source. No download provider was installed as a streaming default, and no Downloads button or paid checkout has been added.

## Actual file tests

Each sample was downloaded completely, checked against its advertised byte count, decoded from the local file with FFmpeg, then played and sought in Edge with browser networking disabled. The browser test used a Blob URL made from the completed file. This verifies the files work offline; it does not claim that Sidflix already has a persistent offline app.

| Source | Sample | File | Download time in this run | Resume | Browser offline playback and seek |
|---|---|---|---|---|---|
| Internet Archive | Big Buck Bunny, complete 9m56s film | MP4, 426×240, 43.32 MB | 59.94 s | Passed; published MD5 also matched | Passed |
| Blender Video Library / PeerTube | Caminandes 3: Llamigos, complete 2m30s short | MP4, 1280×720, 29.11 MB | 43.51 s | Passed | Passed |
| Wikimedia Commons | Caminandes: Llama Drama, complete 1m30s short | WebM VP9/Opus, 854×480, 4.75 MB | 11.52 s including a full-download fallback | Not reliable in this sample: resume returned HTTP 200 instead of the requested range | Passed |

The first two transfers ran concurrently, so these timings are observations, not a provider speed ranking or sustained reliability guarantee. About 77.2 MB of complete sample files were retained in the ignored `artifacts/download-source-trial` directory.

## Recommendation

Use the **PeerTube download interface as the first integration prototype**: the tested Blender instance publishes `downloadEnabled`, file sizes, proper attachment URLs, and 240p–1080p choices. The tested 720p file supports resumption and cross-origin requests. PeerTube is a hosting platform; content varies by instance, and Blender's instance supplies its own open films and videos.

Internet Archive is a second adapter for selected films whose items permit downloads. The tested endpoint had no cross-origin response header, so a browser fetch-based download manager would need a same-origin server endpoint. Item metadata lists downloadable variants, file sizes and checksums; do not assume every item allows downloading.

Wikimedia is useful as a secondary open-media source. Its derivative formats need filtering: the inspected item offered WebM VP9/Opus, legacy MOV MPEG-4, and an original Ogg file. The tested WebM worked, but resumption required restarting the transfer. Do not blindly append a full HTTP 200 response to a partial file.

The official static Blender download directory also responded, but many movie packages are ZIP archives. The PeerTube MP4 download API is a more convenient fit for a browser download manager. No large ZIP was downloaded in this trial.

The project's default YTS endpoint (`yts.mx/api/v2`) failed to connect from this machine during discovery. The existing YTS adapter returns metadata; it does not implement a browser video download. It is not a validated download candidate here.

**Catalogue limitation:** these tests establish compatibility using openly released films. They do not establish downloadable coverage of Sidflix's current blockbuster or commercial series catalogue. No equivalent downloadable blockbuster provider has been validated.

## Access requirements

Downloads remain a separate, optional, premium-only action. Streaming remains unchanged. Owner access includes all current and future features without premium expiry. Privileges are stored against the authenticated account ID on the server, never a profile name, request flag or browser storage.

The existing `sydo` entry is a local profile, shared as the guest default. The user explicitly selected the registered `Stark` account for full access. On 16 November 2026 its stable account ID received the permanent `owner` grant, and the persisted role and null expiry were verified. This includes download entitlement and all-features access; guest profiles receive no owner privilege. Premium billing and download integration remain future work.

`account_access` stores free, premium and owner grants. `/api/account/access` reads only the authenticated user's access with private, non-cacheable responses; there is no public grant endpoint. Administrative provisioning uses `node --conditions=react-server --import tsx scripts/grant-account-access.ts <account-id> owner` after the intended account is identified. Owner grants have no expiry. Tests cover duplicate Sydo names, forged account/role flags, membership expiry, independent sessions and missing identities.

## Evidence and repeatability

- `scripts/test-download-sources.ts` downloads bounded samples, tests ranges, verifies lengths and the available checksum, and decodes local files. `--retry-failed` preserves successful results and repeats only failures.
- `artifacts/download-source-trial/results.json` records URLs, byte counts, hashes, formats and response observations.
- `artifacts/download-source-trial/offline-browser-results.json` records network-disabled playback and seeking for all three completed files.
- The disposable browser harness is `check-downloaded-offline-files.mjs` in this session's visualization directory. It does not modify the user's browser.

References: [Archive metadata API](https://archive.org/developers/md-read.html), [Archive sample](https://archive.org/details/BigBuckBunny_328), [PeerTube download API](https://docs.joinpeertube.org/api-rest-reference/api.html), [Blender sample](https://video.blender.org/videos/watch/23f3ef79-15dc-44c5-aa45-cf92e78a4509), [Commons sample and licence](https://commons.wikimedia.org/wiki/File:Caminandes-_Llama_Drama_-_Short_Movie.ogv), [Big Buck Bunny licence](https://peach.blender.org/about/).
