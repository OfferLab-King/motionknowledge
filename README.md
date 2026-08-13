# MotionKnowledge

MotionKnowledge turns a topic or source material into an editable, source-grounded visual
explanation and a finished video. It is an explanation compiler: research → claims → lesson plan →
script → storyboard → scene specifications → deterministic visuals → timed audio → reviewed video.

This repository is **private and proprietary**; it ships no open-source license.

## Prerequisites

- Node.js 24 (via corepack: `corepack enable`)
- pnpm 11.12.0 (pinned in `package.json`)
- Docker (for local Supabase and the sandboxed HyperFrames container)
- FFmpeg + ffprobe on `PATH` (`brew install ffmpeg` on macOS)

## Install and start

```bash
pnpm install

# Start local Supabase (Postgres + auth + storage) on ports 54331/54332
pnpm dlx supabase@2.113.0 start

# Apply migrations and seed
pnpm dlx supabase@2.113.0 db reset

# Local environment
cp .env.example .env        # fill placeholders from `supabase status`
cp .env.example apps/web/.env

# Run the web application
pnpm --filter @motionknowledge/web dev

# Run the worker (pg-boss job processing)
pnpm --filter @motionknowledge/worker start
```

Open http://localhost:3000, register, and create a project. The DCF reference project can also be
run from the command line (below) with no paid provider credentials — all providers fall back to
deterministic local/mock implementations.

## Development commands

```bash
pnpm verify                 # lint + typecheck + test + build
pnpm test                   # all unit and integration tests
pnpm typecheck              # all packages typecheck
pnpm build                  # production builds

# Focused verification
pnpm --filter @motionknowledge/remotion-engine test:smoke    # short deterministic render + ffprobe
pnpm --filter @motionknowledge/worker test:e2e               # full DCF acceptance (renders MP4 + SRT)
pnpm --filter @motionknowledge/web test:e2e                  # Playwright browser acceptance suite

# DCF reference project
pnpm dcf:generate           # create + generate the DCF project to READY_FOR_REVIEW
pnpm dcf:preview            # copy the preview MP4 to var/exports/dcf/preview.mp4
pnpm dcf:render             # render final MP4/SRT/thumbnail to var/exports/dcf/
```

Generated media and storage live under ignored directories: `var/storage`, `var/exports`,
`var/scratch`. Nothing generated is ever committed.

## Architecture

A pnpm/Turborepo modular monolith (`apps/web` Next.js, `apps/worker` pg-boss worker,
`apps/video-studio` Remotion Studio) with shared packages under `packages/`:

- `schemas` — versioned Zod pipeline contracts and the project state machine
- `database` — Drizzle schema, checked-in SQL migrations, RLS, repositories
- `providers` — LLM/research/TTS/storage/render contracts, OpenAI adapter, deterministic mock
- `research` — safe ingestion (sniffing, SSRF control, office/text/CSV/JSON) and claim extraction
- `content-engine` — lesson/script/storyboard/metadata generation
- `visual-library` — deterministic visual components, themes, machine-readable catalog
- `visual-router` — routing policy (component → asset → HyperFrames → fallback)
- `remotion-engine` — manifest-only compositions, rendering, ffprobe QA
- `hyperframes-adapter` — sandboxed specialist render container (`docker/hyperframes`)
- `tts`, `captions`, `audio` — narration synthesis, measured caption timing, FFmpeg mixing
- `jobs` — pg-boss envelopes, idempotency, retries
- `usage`, `analytics`, `observability` — cost ledger, product events, structured logs
- `ui`, `config`, `testkit` — shared UI, brand/config, test fixtures

See `docs/` for setup, providers, operations, and the security threat model.

## Providers

All paid providers are optional and off by default; the product runs fully on deterministic
local/mock providers. Configure via environment variables:

- OpenAI (LLM): `OPENAI_API_KEY`, `LLM_PROVIDER=openai`, `LLM_MODEL`
- Google Cloud TTS: `GOOGLE_TTS_CREDENTIALS_JSON`, `TTS_PROVIDER=google`
- ElevenLabs TTS: `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`, `ELEVENLABS_MODEL`, `TTS_PROVIDER=elevenlabs`
- S3-compatible storage: `STORAGE_DRIVER=s3`, `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, credentials
- HyperFrames container: `HYPERFRAMES_RENDER_IMAGE` (default `motionknowledge-hyperframes:0.7.107`)

See `docs/development/providers.md` for details.

## Render licensing

Remotion uses a special source-available license. MotionKnowledge is an automation/video-creation
application; it must budget for the Remotion Automators plan ($0.01 per render, $100 monthly
minimum) when it no longer qualifies for the free small-entity terms. Terms are rechecked before
production launch. See `THIRD_PARTY_NOTICES.md`.
