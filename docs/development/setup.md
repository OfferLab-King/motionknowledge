# Development setup

## Prerequisites

- Node.js 24 — install via nvm/volta, then `corepack enable`
- pnpm 11.12.0 — provided by corepack (the `packageManager` field pins it)
- Docker — required for local Supabase and the HyperFrames render container
- FFmpeg + ffprobe — `brew install ffmpeg` (macOS) or your platform equivalent

## Fresh install

```bash
corepack enable
pnpm install

# Local Supabase on isolated ports (API 54331, DB 54332, Studio 54333)
pnpm dlx supabase@2.113.0 start
pnpm dlx supabase@2.113.0 db reset

# Environment files
cp .env.example .env
cp .env.example apps/web/.env
```

The Supabase keys and JWT secret come from `pnpm dlx supabase@2.113.0 status -o env`.
Place the anon key in both `.env` files (`NEXT_PUBLIC_SUPABASE_ANON_KEY`) and the service role
key + JWT secret + DATABASE_URL in the root `.env`. Paid provider keys are optional.

## Running the product

| Command | Purpose |
| --- | --- |
| `pnpm --filter @motionknowledge/web dev` | web app on http://localhost:3000 |
| `pnpm --filter @motionknowledge/worker start` | pg-boss worker (processes jobs) |
| `pnpm --filter video-studio dev` | Remotion Studio for visual inspection |

## Testing

```bash
pnpm verify                 # lint + typecheck + test + build
pnpm --filter @motionknowledge/database test:integration    # RLS / cross-tenant (needs Supabase)
pnpm --filter @motionknowledge/jobs test:integration        # pg-boss idempotency (needs Supabase)
pnpm --filter @motionknowledge/remotion-engine test:smoke   # short render + ffprobe
pnpm --filter @motionknowledge/worker test:e2e              # full DCF acceptance (local, ~4 min)
pnpm --filter @motionknowledge/web test:e2e                 # Playwright browser acceptance
```

Playwright browsers: `cd apps/web && pnpm exec playwright install chromium`.

## DCF reference project

```bash
pnpm dcf:generate     # creates + generates the project (needs the worker's handlers in-process)
pnpm dcf:preview      # exports the preview MP4
pnpm dcf:render       # exports final MP4 + SRT + thumbnail + metadata to var/exports/dcf/
```

## Cleanup

```bash
pnpm dlx supabase@2.113.0 stop
```
