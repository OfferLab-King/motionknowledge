# MotionKnowledge Product Design

**Status:** Approved on 2026-08-12

**Product type:** Private, proprietary commercial SaaS

**Working brand:** MotionKnowledge; all public branding is configuration

**Working domain:** motionknowledge.com

## 1. Product Definition

MotionKnowledge turns a topic or source material into an editable, source-grounded visual explanation and a finished video. It is an explanation compiler, not a stock-footage assembler, avatar product, or wrapper around generative video models.

The product transforms:

`knowledge -> claims -> lesson plan -> script -> storyboard -> scene specifications -> deterministic visuals -> timed audio -> reviewed video`

The complete first commercial release is a working SaaS product. Users can sign up, create a project, generate and edit every intermediate artifact, preview scenes, regenerate one scene, render a final video, and download the video and supporting files.

## 2. Product Principles

1. **Understanding before rendering.** Research, claims, and lesson structure precede script and visual selection.
2. **Structured artifacts over generated code.** Models emit versioned schemas. Reusable components render them.
3. **Traceable claims.** Script statements and scenes retain links to authoritative sources.
4. **Editable stages.** Outline, script, storyboard, narration, and scenes remain visible and editable.
5. **Scene-level regeneration.** A local change does not rerun or rebill the whole project.
6. **Deterministic visuals first.** Diagrams, charts, formulas, and timelines take priority over generated footage.
7. **Commercial provenance.** Every external or generated asset records its origin, license, attribution, hash, and cost.
8. **Provider independence.** Domain logic depends on provider interfaces, never vendor SDKs directly.
9. **Measured economics.** Every paid operation and render records usage and estimated internal cost.
10. **Human approval.** The product never auto-publishes and always exposes a review step.
11. **Reuse before invention.** Before building infrastructure or a visual primitive, inspect current working upstream products and libraries. Adopt or adapt commercially compatible, maintained code when it is simpler and safer than an independent implementation.

## 3. Users and Initial Subject Fit

Primary users are educational creators, course creators, trainers, lecturers, finance and technology educators, consultants, and internal learning teams. The initial visual grammar is optimized for finance, economics, accounting, business, technology, programming, AI, data, career education, and professional training.

The first release does not attempt cinematic entertainment, avatar-led sales outreach, social-video trends, mobile editing, or an unrestricted professional timeline editor.

## 4. User Experience

### 4.1 Entry and project creation

Users can create a project from a topic, pasted text, URL, PDF, PowerPoint, or Word document. The creation form captures audience level, target duration, language, tone, style, and aspect ratio.

Topic-only projects can invoke a research provider. Source-led projects preserve document provenance and distinguish supplied material from supplemental research.

### 4.2 Visible generation workflow

The project workspace exposes these stages:

1. sources and extracted claims;
2. lesson outline;
3. script and chapters;
4. storyboard;
5. scene specifications;
6. narration and captions;
7. preview and QA;
8. final render and exports.

Each stage displays its status, version, validation result, provider, estimated cost, and last successful output. Users approve or edit artifacts before dependent stages run.

### 4.3 Scene editor

The editor has three regions:

- left: ordered scene list with duration and status;
- center: Remotion Player preview and playback controls;
- right: schema-driven properties for narration, copy, template, data, theme, assets, and timing.

Users can edit narration or text, change templates, adjust duration, replace assets, regenerate narration, regenerate the current scene, duplicate, delete, and reorder. Every accepted mutation creates a version. One previous version can be restored at minimum.

### 4.4 Delivery

An explicit final-render action enqueues the job. Completed projects expose:

- MP4 video;
- SRT captions;
- plain transcript;
- chapter list;
- thumbnail;
- title and description suggestions;
- source list;
- machine-readable render metadata.

## 5. System Architecture

MotionKnowledge is a modular monolith with a separate worker process. This provides strong internal boundaries and a single operational system without a microservice deployment burden.

### 5.1 Applications

- `apps/web`: Next.js 16.2 LTS application for marketing, authentication, dashboards, project creation, generation review, scene editing, settings, and downloads.
- `apps/worker`: long-running Node.js worker for ingestion, extraction, research, content generation, TTS, alignment, asset processing, previews, QA, and renders.
- `apps/video-studio`: development-only Remotion entry point for visual-library inspection and render debugging.

### 5.2 Packages

- `packages/config`: brand and runtime configuration.
- `packages/schemas`: versioned Zod domain and pipeline schemas.
- `packages/database`: Drizzle schema, migrations, RLS definitions, and repositories.
- `packages/content-engine`: research claims, lesson plan, script, and metadata workflows.
- `packages/storyboard`: scene decomposition and pedagogical sequencing.
- `packages/visual-library`: deterministic visual components, themes, and catalog.
- `packages/visual-router`: selection policy from scene intent to rendering strategy.
- `packages/remotion-engine`: compositions, timing, previews, and final render manifests.
- `packages/hyperframes-adapter`: sandboxed specialist-render interface.
- `packages/providers`: LLM, research, TTS, image, video, storage, and render contracts.
- `packages/tts`: provider routing, normalization, timings, and usage recording.
- `packages/captions`: word timing, phrase grouping, SRT, and on-video caption data.
- `packages/audio`: mixing plan, normalization, ducking, and FFmpeg orchestration.
- `packages/assets`: manifests, validation, hashing, license policy, and provenance.
- `packages/storage`: local and S3-compatible storage implementations.
- `packages/jobs`: pg-boss definitions, idempotency, retries, and handlers.
- `packages/usage`: provider and compute cost events.
- `packages/analytics`: vendor-neutral product event interface.
- `packages/ui`: shared accessible application components and tokens.
- `packages/testkit`: fixtures, provider fakes, tenant helpers, and render assertions.

Packages expose narrow public entry points. Web UI, billing, and authentication never enter the video engine.

## 6. Technology Decisions

- TypeScript on Node.js 24 with pnpm workspaces and Turborepo.
- Next.js 16.2 LTS and React 19 for the web application.
- PostgreSQL through Supabase for managed auth, database, and private storage.
- Drizzle ORM with checked-in SQL migrations and explicit RLS policies.
- pg-boss for Postgres-backed background jobs.
- Remotion 4.0.508 as primary preview and composition engine.
- HyperFrames 0.7.107 behind an optional adapter for specialist HTML/SVG/GSAP/WebGL scenes.
- Zod for versioned schema validation.
- FFmpeg/ffprobe for audio processing, final media validation, and smoke tests.
- Vitest, Testing Library, Playwright, and containerized PostgreSQL for verification.

Dependency versions are pinned at installation time. Renovation is deliberate because rendering and schema behavior must remain reproducible.

### 6.1 Build-versus-adopt gate

Every substantial subsystem and visual component begins with a short build-versus-adopt check:

1. search the already researched upstream repositories and current official ecosystem;
2. confirm that the candidate is working, maintained, compatible with the selected versions, and materially reduces implementation effort;
3. verify the repository license, file-level license, bundled assets, transitive dependencies, and commercial SaaS implications;
4. prefer a supported public API, package, or isolated adapter over copying source;
5. record the adopted version, origin, modifications, and required notice;
6. build independently only when no suitable candidate exists, integration would be more complex, the dependency weakens core product control, or licensing/security is unsuitable.

This rule applies especially to ingestion, job execution, storage, media inspection, captions, charts, animation primitives, editor controls, and provider SDK integrations. It does not justify adopting a large framework for a small need or importing a competing product wholesale. The typed scene grammar, evidence graph, routing policy, and product-specific user experience remain owned MotionKnowledge code.

## 7. Data Model

Relational entities include users, workspaces, workspace memberships, projects, sources, source versions, research documents, claims, claim-source links, lesson plans, scripts, chapters, storyboards, scenes, scene versions, assets, asset links, audio assets, captions, generation jobs, render jobs, renders, usage events, subscriptions, and credit-ledger entries.

Every tenant-owned table contains or can unambiguously join to `workspace_id`. Browser-accessible tables use RLS. Service-role operations still perform explicit workspace authorization before mutation.

Large pipeline artifacts use validated JSONB within version rows; ownership, status, costs, and relationships remain relational. Mutable pointers identify the active version while historical rows are immutable.

## 8. Versioned Pipeline Contracts

The schema package defines discriminated, versioned contracts for:

- `VideoProject`;
- `SourceDocument`;
- `ResearchClaim` and `ResearchSource`;
- `LessonPlan`;
- `Script` and `Chapter`;
- `Storyboard`, `Scene`, and `VisualInstruction`;
- `AssetManifest`;
- `TTSManifest` and `CaptionSegment`;
- `RenderManifest` and `RenderResult`;
- `QAResult`;
- `YouTubeMetadata`.

All provider output is parsed at the boundary. Invalid output is stored as diagnostic material but never promoted to an active artifact.

## 9. Visual System

### 9.1 Catalog and registry

The machine-readable registry contains each visual's identifier, intent description, suitability rules, avoidance rules, schema version, engine, preview reference, and example payload. Content generation sees registry metadata, not component source.

### 9.2 Initial deterministic library

The release supplies the requested component set, grouped internally as typography, explanation, comparison, quantitative, technical, relationship, assessment, and navigation visuals. Components accept structured props, support 16:9 and 9:16 where declared, respect safe areas, handle bounded text, use centralized themes, and have preview fixtures.

### 9.3 Routing order

The visual router applies this preference:

`reusable component > existing approved asset > licensed external asset > sandboxed HyperFrames > generated still > generated video > explicit fallback`

It scores learning intent, data shape, density, duration, available sources, engine capability, licensing, expected cost, and past QA. A route decision is persisted and explainable.

### 9.4 Design system

Typography, spacing, safe margins, colors, caption treatment, chart defaults, animation durations, and easing live in theme tokens. Models select tokens and components; they do not generate unrestricted CSS. Motion communicates sequence, change, comparison, causality, or emphasis.

## 10. Rendering Architecture

Remotion owns project timing, scenes, audio, captions, transitions, preview, and final composition. The Player supplies interactive previews without an MP4 render. Scene input hashes identify reusable preview and render outputs.

HyperFrames is optional. Its adapter consumes a bounded `HyperFrameRequest` and returns an asset manifest. Generated HTML is treated as hostile: no host filesystem, no credentials, no arbitrary network, fixed resources and timeout, frozen local assets, and output validation.

Final render workers consume immutable manifests. They never query mutable editor state after starting. ffprobe must confirm duration, codecs, streams, resolution, and frame rate before a render becomes downloadable.

## 11. Providers, TTS, and Captions

Provider interfaces expose capability metadata, request hashes, normalized results, usage, estimated cost, and raw diagnostics.

Google Cloud TTS is the economical speech implementation: it has a meaningful free allowance and supports SSML timepoints. ElevenLabs is the premium implementation and exposes timestamped synthesis. Where a provider lacks adequate word timings, a forced-alignment provider produces them from the real audio.

Caption grouping uses measured timings, phrase boundaries, maximum reading rate, line length, and safe-area constraints. It never estimates timing from character counts. Audio mixing prioritizes narration, normalizes loudness, and ducks optional music.

## 12. Jobs, Caching, and Cost Control

Expensive work runs through pg-boss. Job identity includes workspace, project, operation, schema version, and normalized input hash. Handlers use leases, bounded retries, structured errors, and idempotent output promotion.

Research, model outputs, TTS, assets, specialist scenes, and Remotion renders can be reused when their input hash and relevant dependency versions match. Explicit regeneration introduces a nonce and records why reuse was bypassed.

Every provider or compute operation emits a `UsageEvent` containing user, workspace, project, provider, model, operation, input/output units, estimated provider cost, compute duration, and correlation identifiers. Internal cost remains separate from future customer credits.

## 13. Security Model

- Supabase Auth handles email authentication; no password material is stored by the application.
- RLS and server-side authorization enforce tenant isolation.
- Uploads use allowlisted types, bounded sizes, content sniffing, malware hooks, and private object keys.
- URL ingestion blocks private, loopback, link-local, metadata, and redirect-to-private addresses.
- Source text is untrusted data and cannot override system or pipeline instructions.
- SVG, HTML, and remote scripts never execute in the main application origin.
- Workers receive narrowly scoped credentials and redact secrets from structured logs.
- Signed downloads are short-lived and bound to authorized project ownership.
- Render containers have fixed CPU, memory, process, filesystem, network, and time limits.

## 14. Failure and Recovery Design

Each stage has explicit queued, running, succeeded, failed, cancelled, and superseded states. Failures retain typed codes, safe user messages, retryability, provider diagnostics, and correlation IDs.

A failed downstream stage does not invalidate its last successful version. Scene failures remain local. Reordering or editing scenes invalidates only hashes that depend on the changed data. Users can retry safe operations or restore an earlier version.

## 15. DCF Reference Project

The bundled project, "What is a Discounted Cash Flow?", targets a beginner university audience, lasts approximately five minutes, and is clearly educational rather than investment advice. It contains title, definition, cash-flow timeline, discounting formula, step-by-step calculation, chart, comparison, and recap scenes using hypothetical values.

The reference project is both an onboarding example and the end-to-end acceptance fixture. It can be generated through the product, previewed, edited at scene level, rendered, and exported as MP4 and SRT.

## 16. Verification

Testing is risk-based and intentionally small. A test must protect a named product, financial, security, or rendering risk; tests are not added merely to increase coverage. Reused third-party libraries are tested at MotionKnowledge's integration boundary rather than having their upstream behavior re-tested.

Focused unit tests cover versioned schema parsing, state transitions, stable hashing/idempotency, visual-routing decisions, asset provenance policy, cost calculation, actual-audio caption grouping, and other deterministic domain rules that could silently corrupt output. Focused integration tests cover provider-contract normalization, one representative job retry/idempotency path, storage authorization, render-manifest promotion, and changed-scene regeneration. Security tests cover cross-tenant access, signed downloads, SSRF controls, dangerous uploads, and hostile source instructions.

Do not create broad snapshot suites, tests for static copy or styling, tests of framework/library behavior, one-test-per-component boilerplate, redundant provider permutations, or expensive multi-minute renders. Visual components use a small set of representative catalog fixtures and visual smoke checks instead of duplicative unit tests. New tests require either a reproduced defect, a high-risk invariant, or an acceptance criterion.

A short deterministic composition is rendered in CI and inspected with ffprobe. The full DCF project is an end-to-end local acceptance test, not a routine CI render. Clean-install documentation is verified in a fresh environment.

GitHub Actions runs locked installation, formatting, linting, type checking, unit tests, integration tests, security tests, production builds, and the short render smoke test.

## 17. Licensing Boundaries

The repository is private and proprietary and has no open-source license.

- Remotion uses a special license. MotionKnowledge qualifies as an automation/video-creation application and must budget for the current Automators plan when it no longer qualifies for the free small-entity terms. The current published rate is $0.01 per render with a $100 monthly minimum. Terms are rechecked before production launch.
- HyperFrames 0.7.107 is Apache-2.0. Reuse must preserve required notices and avoid HeyGen trademarks.
- Video Podcast Maker is CC BY-NC 4.0. No code, templates, prompts, media, or other expressive content may be copied, modified, embedded, or derived. Only high-level workflow facts may inform an independent implementation.
- The separate Remotion skills repository does not publish a standalone license file. Treat its prose and assets as documentation for agent behavior, not as a source of code to copy.

`THIRD_PARTY_NOTICES.md` records shipped third-party material and obligations.

## 18. Deployment Shape

The web application and worker are separately deployable containers. Managed Supabase provides Postgres, auth, and initial private storage. Rendering starts on a dedicated worker with local scratch storage and can later move to autoscaled containers or Remotion Lambda without changing the video-engine interface.

The first production topology avoids Kubernetes, Kafka, and a microservice fleet. Scaling occurs by increasing stateless web instances, adding job workers by queue, moving large objects behind a CDN, and separating render capacity from content jobs.

## 19. Product Analytics

The analytics abstraction records signup, project creation, artifact generation, preview, scene regeneration, render request/completion, export, and upgrade events. Analytics failures never interrupt core generation or rendering.

## 20. Completion Criteria

The release is complete only when the full user journey works from a clean install: authentication, persisted projects, grounded artifacts, editable intermediate stages, deterministic visuals, HyperFrames demonstration, TTS, timed captions, background jobs, preview, scene regeneration, final MP4/SRT, DCF reference project, cost records, tenant isolation, passing tests, CI, verified media, documentation, and a private GitHub repository with no committed secrets or prohibited content.
