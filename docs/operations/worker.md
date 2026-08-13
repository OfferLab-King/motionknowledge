# Worker operations

## Overview

`apps/worker` is a long-running Node process consuming pg-boss queues. It performs every expensive
operation: ingestion, research, lesson/script/storyboard generation, scene generation, TTS,
captions, previews, QA, thumbnails, and final renders. The web application only enqueues jobs and
reads persisted artifacts.

## Running

```bash
pnpm --filter @motionknowledge/worker start
```

The worker reads the same environment as the web app (`.env` at the repository root). Key
variables: `DATABASE_URL`, `STORAGE_DRIVER`, provider credentials (see
`docs/development/providers.md`), and render resolutions.

## Queues

Job names are declared in `packages/jobs/src/names.ts`. pg-boss schema is `boss` (not
browser-accessible). Each job carries a versioned envelope with workspace/project context, input
hash, and idempotency key; retries are capped (3 attempts, exponential backoff) for transient
provider errors and disabled for validation/security errors.

## Pipeline

1. `RESEARCH_PROJECT` — extract claims from supplied sources, promote research document
2. `GENERATE_OUTLINE` → `GENERATE_SCRIPT` → `GENERATE_STORYBOARD` — content pipeline
3. `GENERATE_SCENE` × N — materialize scene versions from the storyboard
4. `SYNTHESIZE_TTS` × N — narration audio + measured word timings
5. `GENERATE_CAPTIONS` — phrase-grouped caption track
6. `GENERATE_PREVIEW` — build render manifest, render preview, store
7. `RUN_QA` — ffprobe checks (duration, codecs, dimensions, audio levels); critical failures move
   the project to `QA_FAILED`, passing previews to `READY_FOR_REVIEW`
8. `RENDER_FINAL` — final render at configured resolution + narration mix + exports
9. `GENERATE_THUMBNAIL` — cover still

Handlers load only immutable, authorized inputs (active artifact versions), verify input hashes,
record usage, promote outputs atomically, and enqueue the next stage. Scene regeneration
recomputes only the changed scene's version plus dependent captions/preview.

## Observability

Every handler logs `jobId`, `workspaceId`, `projectId`, `operation`, `provider`, `durationMs`,
`status`, and a safe error code. Log serializers redact keys matching token/secret/authorization/
cookie/password. Provider usage and internal cost are recorded per job in `usage_events`.

## Failure behavior

- Failed stages keep their last successful version.
- Transient failures retry with backoff; permanent failures are recorded with an error code and a
  safe user-facing message.
- A failed scene stays local — other scenes and versions are untouched.
