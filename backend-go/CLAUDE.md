# reLive — Go Backend

## What this is
Go backend (port 8081) for reLive — a concert video platform. Handles video upload, background processing, and music entity search. Sits alongside a TypeScript backend (port 8080) in the same monorepo.

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

## Code conventions

### Receiver names
Use the service/type abbreviation — `s` for Store, `h` for handlers, `m` for MediaService, `ps` for ProcessingService, `jqs` for JobQueueService. Not `self`, not the full type name.

### Database
- Always use named column constants (`artistCols`, `songCols`, `videoCols`) — never `SELECT *`
- Scan helpers: `scanFoo(row pgx.Row)` for single rows, `scanFoos(rows pgx.Rows)` for collections
- Translate `pgx.ErrNoRows` → `apperr.ErrNotFound` inside scan helpers, not in the service
- All queries filter `deleted_at IS NULL` — soft deletes only
- Return `make([]T, 0)` not `var x []T` from scan functions — nil slices serialize as JSON `null`

### Errors
- Functions should error and let callers decide severity. Don't log inside a function that also returns an error.
- Use `fmt.Errorf("context: %w", err)` to wrap errors with context
- Expected/non-fatal conditions (missing GPS, missing timestamp) → `[INFO]` log at the call site, not `[ERROR]`
- Add to `apperr` only when callers need `errors.Is()` branching. Plain `fmt.Errorf` otherwise.

### Validation
- Validate at system boundaries (request binding, config load). Don't double-validate the same value in both handler and service.
- Handler clamps values (e.g. `max_results`) OR service validates — pick one, not both.

### HTTP handlers
- Use `c.ShouldBindJSON` / `c.ShouldBindQuery` with gin binding tags for request parsing
- Register static routes (`/search`) before parametric routes (`/:id`) in the same group — Gin panics otherwise
- Return `[]` not `null` for empty collections — initialize slices with `make`

## What's implemented vs stubbed

### Working
- Multipart video upload to DigitalOcean Spaces (S3-compatible)
- Job queue: Postgres-backed, Pool + Scheduler, graceful shutdown, stuck video recovery
- Artist + Song search endpoints with `pg_trgm` fuzzy ranking
- Config validation at startup
- Migrations 1–12

### Stubbed / not yet implemented
- `ProcessingService.Process()` — entire pipeline is a stub. Next major piece of work.
  - Intended pipeline: download from S3 → ffprobe metadata → ffmpeg thumbnail → upload thumbnail → update DB → mark completed
  - `MediaService` (`ProbeMetadata`, `ExtractFrame`) is ready and waiting to be wired in
  - Use `errgroup` for parallel steps (probe + frame extraction can run concurrently)
- `store_videos.go: SetVideoSong` — returns `not implemented`
- Artist/song search `source=external` and `source=mixed` — accepted by API but return 500
- `GET /videos`, `GET /videos/:id`, `DELETE /videos/:id` — all return 501

## Active design decisions
- **Separate `artist_service.go` / `song_service.go`** search logic intentionally — search behaviour may diverge between entity types
- **`search_service.go`** is a shared toolkit, not an orchestrator — future MusicBrainz client lives here
- **`SearchTrgmSimilarityThreshold`** is stored in `Store` but the `%` operator in SQL uses Postgres's session-level GUC, not this value — wiring it up is a known gap
- **Monorepo** with separate TS + Go backends is intentional — path-based CI triggers handle independent deploys
