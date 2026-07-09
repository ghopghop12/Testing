# SoundForge API

A music streaming API for bot developers — one HTTP call returns a direct, playable audio link powered by yt-dlp. No cookies, no browser automation, no rate-limit roulette. Built for Telegram and Discord bot developers.

## Run & Operate

- `pnpm --filter @workspace/soundforge run dev` — run the landing page frontend (port auto-assigned)
- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string
- yt-dlp binary: `/home/runner/workspace/yt-dlp` (dev) or set `YTDLP_PATH` env var

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite (artifacts/soundforge)
- API: Express 5 (artifacts/api-server)
- DB: PostgreSQL + Drizzle ORM
- Audio: yt-dlp binary for YouTube stream resolution + search
- Validation: Zod (zod/v4), drizzle-zod
- API codegen: Orval (from OpenAPI spec in lib/api-spec/openapi.yaml)
- Build: esbuild (CJS bundle for API server)

## Where things live

- `artifacts/soundforge/` — React landing page + demo page
- `artifacts/api-server/src/routes/v1/` — stream, search, lyrics, usage, keys routes
- `artifacts/api-server/src/lib/ytdlp.ts` — yt-dlp wrapper with SSRF guard
- `artifacts/api-server/src/lib/auth.ts` — Bearer token auth + atomic quota enforcement
- `lib/db/src/schema/apiKeys.ts` — API keys table schema
- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for all API contracts)
- `render.yaml` — Render.com deployment config

## Architecture decisions

- yt-dlp binary is downloaded at build time on Render via `buildCommand` in render.yaml
- SSRF protection: only youtube.com/youtu.be hosts allowed for URL inputs to yt-dlp
- Quota enforcement uses a single atomic SQL UPDATE ... RETURNING to prevent race conditions
- Error messages are scrubbed before being returned to clients (no internal detail leakage)
- API keys follow format: `sf_<24 hex chars>`, key IDs: `kid_<12 hex chars>`

## Product

- `GET /api/v1/stream?query=` — resolve query or YouTube URL to direct audio stream
- `GET /api/v1/search?query=&limit=` — search tracks, returns up to 20 results
- `GET /api/v1/lyrics?track_id=|query=` — lyrics/caption info for a track
- `GET /api/v1/usage` — quota and usage info for the authenticated key
- `POST /api/v1/keys` — create a free-tier API key (500 req/day)

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- yt-dlp NDJSON: multi-result searches use `--dump-json` which outputs newline-delimited JSON; parse with `.split('\n').map(JSON.parse)`, not a single `JSON.parse()`
- yt-dlp binary is NOT installed via pip in NixOS; download the binary directly from GitHub releases instead
- After each OpenAPI spec change, re-run codegen before using the updated types
- `pnpm --filter @workspace/db run push` requires `DATABASE_URL` to be set

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- render.yaml at the repo root configures two Render services: soundforge-api (web service) and soundforge-frontend (static site)
