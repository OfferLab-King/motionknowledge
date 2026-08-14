# Production Deployment

**Status:** Recommended architecture; no paid infrastructure is provisioned by this document.

## Deployment Units

1. **Web:** Next.js 16.2 LTS container or a compatible managed Next.js platform.
2. **Worker:** Long-running Node container consuming pg-boss jobs.
3. **Render worker:** Worker image with Chromium, Remotion, FFmpeg, ffprobe, fonts, and bounded scratch storage. It can initially share the general worker deployment but uses a separate queue and concurrency limit.
4. **PostgreSQL/Auth:** Managed Supabase project with point-in-time recovery on the selected plan, RLS, and separate service credentials.
5. **Object storage:** Private Supabase Storage initially; S3-compatible `StorageProvider` permits Cloudflare R2 or another provider later.
6. **CDN/downloads:** Signed, short-lived object URLs. Public marketing assets may use a public CDN bucket; project media does not.
7. **Monitoring:** Structured logs, job metrics, provider latency/cost, render duration/failure, queue depth, database health, and error tracking.

## Network and Trust Boundaries

- Only the web service is public.
- Workers accept no public inbound traffic.
- Database service credentials are worker/server-only.
- Render containers receive job-scoped signed inputs rather than broad storage credentials where possible.
- HyperFrames sandboxes have network disabled by default and no application credentials.
- Provider egress is allowlisted by operation.

## Stage 1: 0–100 Active Users

- One managed Supabase project.
- One web deployment with automatic horizontal scaling.
- One general worker and one render worker, each with low concurrency.
- Supabase private storage.
- pg-boss in the application database.
- Managed error tracking and centralized structured logs.
- Nightly database backups plus documented restore checks.

This stage minimizes fixed cost. Rendering is queued and may take longer during bursts. Concurrency is capped to protect memory and provider budgets.

## Stage 2: 100–1,000 Active Users

- Scale web instances independently.
- Split worker pools by content, audio/assets, and render queues.
- Add render workers based on queue depth and oldest-job age.
- Move large immutable outputs to R2 or another economical S3-compatible store if egress/storage economics justify it.
- Put public and signed media delivery behind a CDN.
- Add PostgreSQL connection pooling, queue-table maintenance, and query/index monitoring.
- Introduce provider budgets, workspace rate limits, and priority classes.
- Run periodic restore, tenant-isolation, and render-sandbox exercises.

## Stage 3: 1,000–10,000 Active Users

- Dedicated autoscaled render-worker pool with per-job ephemeral scratch volumes.
- Separate content and render compute accounts/projects to reduce blast radius.
- Read replicas for analytics/read-heavy workloads where supported; jobs and writes remain on the primary.
- Consider moving pg-boss to a dedicated PostgreSQL database or replacing it behind `JobQueue` only when measured database contention warrants it.
- Multi-region object delivery with a single authoritative project region initially.
- Formal SLOs for interactive API, preview availability, queue latency, and render completion.
- Centralized secrets management, audited production access, incident response, and cost anomaly alerts.
- Evaluate Remotion Lambda or another distributed renderer against container cost, licensing, cold starts, and observability.

## Hosting Options

### Web

- **Vercel:** Lowest Next.js operational friction; verify background/runtime boundaries and cost.
- **Cloudflare/OpenNext:** Attractive edge/CDN option using Next.js adapter support; validate all application features.
- **Container platform:** Fly.io, Railway, Render, Google Cloud Run, AWS ECS, or equivalent offer a uniform deployment model.

The application must remain deployable with standard `next start`; hosting-specific services do not enter domain packages.

### Render workers

- Dedicated VM/container is the baseline because Chromium and FFmpeg need predictable CPU, memory, fonts, and scratch space.
- Autoscaled container jobs are preferred once queue volume becomes bursty.
- Remotion Lambda is a later option, subject to current licensing and workload economics.

### Database and auth

Supabase is the default because it combines Postgres, Auth, RLS, Storage, signed URLs, and operational tooling. Migrations remain checked into the repository so another PostgreSQL provider can be adopted.

## Release and Migration Strategy

- Produce immutable web and worker images from one commit.
- Apply backward-compatible database migrations before application rollout.
- Workers understand the current and immediately previous artifact schema version during rolling deployment.
- Drain incompatible render jobs before removing old schema readers.
- Roll back application images without rolling back destructive migrations.
- Canary render-worker upgrades using the deterministic smoke composition.

## Backups and Retention

- Enable managed database backups and periodically prove restore.
- Object storage retention distinguishes source files, intermediate artifacts, previews, and final exports.
- Deleting a project creates a recoverable grace period before asynchronous object purge.
- Usage and billing records follow the documented financial retention policy even when media is deleted.

## Cost Controls

- Hard concurrency and per-workspace generation limits.
- Provider budgets and circuit breakers.
- Input-hash caches and changed-scene renders.
- Low-resolution previews; full 1080p rendering only on explicit request.
- Storage lifecycle rules for superseded previews and scratch assets.
- Cost dashboards by provider, operation, project, and workspace.

## Production Readiness Gate

Do not launch paid production until tenant isolation, signed URLs, URL-ingestion SSRF defenses, hostile document handling, render sandboxing, backup restore, provider budget limits, Remotion licensing, asset licenses, and end-to-end media verification have all passed documented checks.

## Status of this implementation

The first commercial release is implemented and verified locally against these controls:

- Tenant isolation: RLS policies + server-side workspace authorization, verified by
  `rls.integration.test.ts` and the browser `tenant-isolation` e2e.
- Signed downloads: HMAC-signed short-lived object URLs (5 minutes), verified in the tenant e2e.
- SSRF: DNS-before-and-after-redirect checks for loopback/private/link-local/metadata ranges.
- Hostile documents: content sniffing, HTML stripping, bounded sizes, provenance policy.
- Render sandbox: `docker/hyperframes` container with `--network=none --read-only` and resource
  caps; ffprobe-validated outputs.
- Remotion licensing: Automators plan budgeted; terms rechecked before launch.
- Media verification: short CI render + full DCF acceptance render (MP4/SRT) with ffprobe.

Local development runs entirely on deterministic mock providers; paid providers activate only when
their environment variables are present (see `docs/development/providers.md`).

## Phase 11 additions

- **Health endpoint**: `GET /api/health` (DB ping + version) for load balancer
  and monitoring probes.
- **Credits**: a workspace credit ledger (grants/consumes) is charged by every
  paid operation (LLM, TTS, renders, HyperFrames); free workspaces start with
  5,000 credits; the final-render API enforces a minimum balance (402);
  operators grant credits with `scripts/grant-credits.ts`. Payment-provider
  integration (Stripe) only needs to replace the grant path.
- **Share links**: read-only, token-based export shares (`/share/[token]`) with
  short-lived signed URLs.
- **Workspaces**: multi-workspace support with a session cookie-selected active
  workspace, invite-by-email members, and owner-managed membership.
- **Secret scan**: `scripts/scan-secrets.ts` runs in CI and fails on common
  credential patterns.
- **Render scaling**: render concurrency is capped at `min(4, cores)` per
  worker; moving renders to Remotion Lambda only requires replacing the
  `renderProject` implementation behind the same manifest contract.
