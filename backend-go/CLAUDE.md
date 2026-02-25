# reLive — Go Backend

## What this is
Go backend (port 8081) for reLive — a concert video platform. Handles video upload, background processing, and music entity search. Sits alongside a TypeScript backend (port 3000) in the same monorepo.

## Running things
```bash
make dev          # run server
make migrate-up   # run pending migrations
make migrate-down # rollback last migration
make test         # go test ./...
make build        # build binary
```

## Architecture

### Layer rules
```
handlers → services → database (Store)
```
- Handlers: HTTP only. Parse request, call service, return response. No DB access.
- Services: Business logic and orchestration. No HTTP concerns.
- Store: Thin DB wrapper. No business logic. One file per domain (`store_artists.go`, `store_videos.go`, etc.).

### Key packages
- `apperr/` — typed sentinel errors (`ErrNotFound`, `ErrDuplicate`). Add here when callers need to branch on error type.
- `models/` — DB structs + DTOs. DTOs live in `*_dto.go` files alongside their domain.
- `config/` — env loading + `Validate()` which is called at startup and hard-fails on bad config.
- `workers/` — reusable Pool + Scheduler for background job processing. Not video-specific.
- `migrations/` — golang-migrate SQL files, numbered sequentially, always include both up and down.

---

## Product context

### What reLive is
reLive is a concert documentation and social platform. Users attend concerts, upload videos from those concerts, and build a personal record of their concert experiences. Other users who attended the same show can discover and watch each other's footage. The Watch page supports a multi-camera experience — multiple videos from the same concert play simultaneously, with the user able to swap between angles in real time.

### Two backends
The monorepo has two backends serving different concerns:
- **TypeScript backend (port 3000)** — older, handles concert/setlist data, legacy video metadata, and user home/profile aggregation. The frontend still calls this for concert pages, setlists, and user home.
- **Go backend (port 8081)** — newer, handles auth, video upload (multipart to DigitalOcean Spaces), background processing, and music entity search. The frontend calls this for upload and user sync.

The Go backend is the active development surface. The TS backend is not being changed.

### Data model
**Global entities** (canonical, shared across all users):
- `Artist` — internal source of truth. Has optional `musicbrainz_id`, `spotify_id`, `rym_id`. `is_verified` distinguishes canonical from user-contributed records.
- `Venue` — canonical venue record. Stores `google_place_id` as the stable deduplication key.
- `Concert` — a single show: `artist_id` (nullable for multi-artist events) + `venue_id` + `date`. Has `setlistfm_id` for external sync. The `artist_id` is a convenience denorm for the common solo-headliner case; `acts` is always the full picture.
- `Song` — a track/composition. `artist_id` is the credited/recording artist, not the concert performer. `artist_name_raw` exists for unresolved songs (`artist_id` is nullable by design).
- `Act` — one artist's set within a concert. Bridges `Concert` → `Artist`. `act_type` = `main` / `opener`.
- `SongPerformance` — a specific song within a specific act's setlist, with optional `position` and `started_at`. This is the setlist row.

### Notes

Upload is concert-first. Videos must be uploaded against a specific concert — the concert must exist in the database before upload is possible. This is intentional: it gives users a focused reason to come to the app, document their experience, and connect with others who attended the same show.

ConcertLog is the user-scoped concert entity. When a user attends a concert, they create a ConcertLog which owns their personal slice of that concert: []videos, []photos, title, description, review, rating, []songs. A Concert (global) has many ConcertLogs; a User has many ConcertLogs.

Song linking chain. video → song_performance → act → concert is how a video gets concert context. song_performance → song resolves what was actually played. Song-to-concert mapping can't be verified from video alone without audio fingerprinting — this is accepted. Wrong song mappings are handled via a reporting system for popular concerts; for local/small shows exact song accuracy isn't a priority.

Storage-based upload limits, not count-based. Restrict by bytes per ConcertLog and bytes total per user — users who care can compress/crop. Encourages concert photography and audio uploads too.

Video metadata is a signal, not a source of truth. Even though users select a concert explicitly at upload time, GPS/timestamp from video metadata is still read — for anomaly detection, venue proximity verification, and cross-user duplicate detection. It never overrides the user's stated concert.

**Per-user:**
- `Video` — belongs to a user. Links to a concert via `event_type` + `event_id` (polymorphic). Also has nullable `act_id` and `song_performance_id` for finer-grained tagging. Carries optional GPS, timestamp, dimensions, and duration (extracted from file or client-provided).

**Video has two independent state machines:**
- `status`: `pending_upload` → `completed` / `failed` — tracks whether the S3 upload is done.
- `processing_status`: `queued` → `processing` → `completed` / `failed` — tracks the background pipeline. Set to `queued` at upload init time if the client provided any metadata.

### Frontend
Ionic React + Capacitor app (iOS/Android + web). Brand color: chartreuse (`#7FFF00` / `#DFFF00`).



**What's built:**
- Auth0 login/signup with automatic user sync to Go backend on login
- Tab bar: Home, Search (stub), Upload, Profile
- Upload flow: native photo library picker (Capacitor) or web file picker → queue management → client-side metadata extraction via MediaInfo.js → multipart upload to Go backend → real-time progress per file
- Home page: concert list from TS backend
- Event page: concert details, stats, setlist, action buttons (Watch, Upload, Like, Share) from TS backend
- Watch page: multi-video player — videos sorted/grouped by `recorded_at`, timeline seek bar, alternate angles sidebar (up to 4 simultaneous videos), setlist sheet with song-to-video navigation
- Profile page: user info + recent activity from TS backend
- Artist page: stubbed (renders ID only)
- Venue page: stubbed (renders ID only)
- Search page: stubbed (renders searchbar only)

### Go backend — what's working
- Auth0 JWT validation middleware + dev bypass (`DEV_BYPASS_AUTH`)
- `POST /v2/api/users/sync` — upsert user from Auth0 profile on login
- `POST /v2/api/videos/upload/init` — creates DB record, initiates S3 multipart upload, returns presigned part URLs
- `POST /v2/api/videos/:id/upload/confirm` — completes S3 multipart upload, marks video `completed`
- `GET /v2/api/artists/search`, `GET /v2/api/artists/:id`
- `GET /v2/api/songs/search`, `GET /v2/api/songs/:id`
- Artist + song search use `pg_trgm` fuzzy ranking with `similarity()` + `ILIKE` fallback
- Job queue: Postgres-backed Pool + Scheduler, graceful shutdown, stuck video recovery
- `MediaService` (`ProbeMetadata` via ffprobe, `ExtractFrame` via ffmpeg) — built, not yet wired into the processing pipeline
- Migrations 1–13

### Go backend — what's stubbed
- `ProcessingService.Process()` — no-op that just marks `processing_status = completed`. Intended pipeline: download from S3 → ffprobe + ffmpeg thumbnail (concurrent) → upload thumbnail → update DB → mark completed. `MediaService` is ready to wire in.
- `GET /videos`, `GET /videos/:id`, `DELETE /videos/:id` — return 501
- `store_videos.go: SetVideoSong` — returns `not implemented`
- Artist/song search `source=external` and `source=mixed` — accepted by API, return 500. MusicBrainz integration is paused; future client lives in `search_service.go`.

