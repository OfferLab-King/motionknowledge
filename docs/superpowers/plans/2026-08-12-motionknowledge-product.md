# MotionKnowledge Working Product Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Build the complete private MotionKnowledge SaaS: source-grounded generation, editable typed scenes, deterministic previews, individual-scene regeneration, TTS and captions, background rendering, persistent multi-tenant projects, a DCF reference project, and downloadable MP4/SRT outputs.

**Architecture:** A pnpm/Turborepo modular monolith contains a Next.js web application, a long-running pg-boss worker, and a development Remotion Studio. Shared TypeScript packages own versioned schemas, relational persistence, the evidence/content pipeline, provider contracts, visual catalog, Remotion compositions, sandboxed HyperFrames rendering, storage, jobs, captions, and usage accounting. PostgreSQL/Supabase is the system of record; expensive stages run in the worker from immutable manifests.

**Tech Stack:** Node.js 24, pnpm 11.12.0, TypeScript 5.9.3, Next.js 16.2.11 LTS, React 19.2.8, Tailwind CSS 4.3.3, Supabase CLI 2.113.0, Supabase JS 2.112.3, PostgreSQL, Drizzle ORM 0.45.2, pg-boss 12.27.0, Zod 4.4.3, Remotion 4.0.508, HyperFrames 0.7.107, OpenAI SDK 7.4.0, Google Cloud TTS 7.0.0, ElevenLabs 1.59.0, Vitest 4.1.10, Playwright 1.62.1, FFmpeg and ffprobe.

## Global Constraints

- The repository is private and proprietary. Do not add an open-source license.
- Public branding is read only from packages/config/src/brand.ts; business logic never hard-codes MotionKnowledge.
- Use Next.js 16.2.11, Remotion 4.0.508, and HyperFrames 0.7.107; do not use preview releases.
- Before each substantial implementation, perform ADR 0005's build-versus-adopt check and record adopted packages in THIRD_PARTY_NOTICES.md.
- Never copy code, prompts, templates, tests, or assets from Agents365-ai/video-podcast-maker (CC BY-NC 4.0), prajwal-y/video_explainer (no license), or OpenMontage (AGPL-3.0).
- Models emit versioned structured artifacts. They do not generate a whole React/HTML video for standard scenes.
- Remotion owns the timeline, Player preview, audio, captions, transitions, and final render. HyperFrames is optional and sandboxed.
- Every tenant-owned row resolves to a workspace; browser-accessible tables use RLS and server code still authorizes workspace access.
- No expensive generation or rendering runs synchronously inside a web request.
- Every provider call and job has an input hash, idempotency key, status, usage record, and safe retry behavior.
- Every asset records origin, provider, source URL, license, attribution, prompt, estimated cost, and SHA-256.
- Test only named risks: schemas, tenant isolation, hostile inputs, cost/usage, job idempotency, provider normalization, scene regeneration, and real media output.
- Do not add broad snapshots, styling tests, wrapper tests, redundant provider permutations, or multi-minute CI renders.
- Do not commit API keys, downloaded model weights, generated MP4s, copyrighted fixtures, or provider secrets.
- Do not hard-code subscription prices. Internal provider cost and customer credits remain separate.
- Use frequent conventional commits and keep the repository runnable after every task.

## Planned File Structure

    apps/
      web/                         Next.js product and API surface
      worker/                      pg-boss worker and job registrations
      video-studio/                Remotion Studio development entry
    packages/
      config/                      brand and environment configuration
      schemas/                     versioned Zod pipeline contracts
      database/                    Drizzle schema, SQL migrations, repositories
      providers/                   LLM/research/TTS/storage/render contracts
      storage/                     local and S3-compatible object storage
      assets/                      asset provenance, hashing, policy
      jobs/                        job names, envelopes, enqueue/handler helpers
      usage/                       cost and usage ledger services
      observability/               structured logs and correlation context
      visual-library/              themes, components, catalog, preview fixtures
      visual-router/               deterministic visual selection policy
      remotion-engine/             compositions, Player inputs, render service
      hyperframes-adapter/         sandbox request and frozen-output adapter
      research/                    ingestion, URL safety, sources and claims
      content-engine/              lesson, script, storyboard, metadata pipeline
      tts/                         Google/ElevenLabs adapters and timing normalization
      captions/                    phrase grouping and SRT generation
      audio/                       FFmpeg mix and normalization orchestration
      analytics/                   no-op and pluggable product events
      ui/                          shared accessible application components
      testkit/                     fakes and high-risk fixtures only
    supabase/
      config.toml
      migrations/
      seed.sql
    docker/
      hyperframes/Dockerfile
      hyperframes/render-entrypoint.sh
    docs/

---

### Task 1: Private repository, workspace, brand, and dependency baseline

**Files:**
- Create: package.json, pnpm-workspace.yaml, turbo.json, tsconfig.base.json, .gitignore, .npmrc, .env.example, THIRD_PARTY_NOTICES.md
- Create: packages/config/package.json, packages/config/tsconfig.json, packages/config/src/brand.ts, packages/config/src/env.ts, packages/config/src/index.ts, packages/config/src/brand.test.ts
- Create: packages/testkit/package.json, packages/testkit/src/index.ts
- Modify: verified Git remote only after the private repository exists

**Interfaces:**
- Produces: brand: BrandConfig, parseServerEnv(input: NodeJS.ProcessEnv): ServerEnv, shared TypeScript/Vitest configuration, private GitHub repository.

- [ ] **Step 1: Resolve the authenticated owner and create the private repository**

    active_owner=$(gh api user --jq .login)
    gh repo view "$active_owner/motionknowledge" >/dev/null 2>&1 || gh repo create "$active_owner/motionknowledge" --private --source=. --remote=upstream
    gh repo view "$active_owner/motionknowledge" --json nameWithOwner,isPrivate,url

Expected: repository name motionknowledge and isPrivate true. Keep the existing origin until the new remote is verified.

- [ ] **Step 2: Add exact root workspace configuration**

Use this root package contract:

    {
      "name": "motionknowledge",
      "private": true,
      "packageManager": "pnpm@11.12.0",
      "engines": {"node": ">=24.0.0"},
      "scripts": {
        "dev": "turbo dev",
        "build": "turbo build",
        "lint": "turbo lint",
        "typecheck": "turbo typecheck",
        "test": "turbo test",
        "verify": "pnpm lint && pnpm typecheck && pnpm test && pnpm build"
      },
      "devDependencies": {
        "turbo": "2.10.9",
        "typescript": "5.9.3",
        "vitest": "4.1.10"
      }
    }

- [ ] **Step 3: Write the failing brand contract test**

    import {describe, expect, it} from 'vitest';
    import {brand} from './brand';

    describe('brand configuration', () => {
      it('exposes replaceable public identity', () => {
        expect(brand).toMatchObject({
          productName: 'MotionKnowledge',
          domain: 'motionknowledge.com',
          defaultTheme: 'professional',
        });
        expect(brand.supportEmail).toContain('@motionknowledge.com');
      });
    });

- [ ] **Step 4: Run the focused test**

Run: pnpm --filter @motionknowledge/config test

Expected: FAIL because brand.ts is missing.

- [ ] **Step 5: Implement brand and environment contracts**

    export type BrandConfig = Readonly<{
      productName: string;
      domain: string;
      logo: string;
      supportEmail: string;
      defaultTheme: 'professional';
      socialHandles: Readonly<Record<string, string>>;
    }>;

    export const brand: BrandConfig = Object.freeze({
      productName: process.env.NEXT_PUBLIC_PRODUCT_NAME ?? 'MotionKnowledge',
      domain: process.env.NEXT_PUBLIC_PRODUCT_DOMAIN ?? 'motionknowledge.com',
      logo: '/brand/logo.svg',
      supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? 'support@motionknowledge.com',
      defaultTheme: 'professional',
      socialHandles: {},
    });

parseServerEnv() uses Zod and keeps paid provider keys optional so the bundled DCF workflow operates without credentials.

- [ ] **Step 6: Install, verify, record notices, and commit**

    corepack enable
    pnpm install
    pnpm --filter @motionknowledge/config test
    pnpm typecheck
    git add package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json .gitignore .npmrc .env.example THIRD_PARTY_NOTICES.md packages/config packages/testkit
    git commit -m "chore: initialize MotionKnowledge workspace"

Expected: brand test and typecheck PASS.

### Task 2: Versioned schemas, state machine, and deterministic hashing

**Files:**
- Create: packages/schemas/package.json
- Create: packages/schemas/src/common.ts, source.ts, research.ts, lesson.ts, script.ts, visual.ts, scene.ts, audio.ts, render.ts, project.ts, state.ts, hash.ts, index.ts
- Create: packages/schemas/src/schemas.test.ts, hash.test.ts, state.test.ts

**Interfaces:**
- Produces: VideoProjectV1, SourceDocumentV1, ResearchClaimV1, ResearchSourceV1, LessonPlanV1, ScriptV1, ChapterV1, SceneV1, VisualInstructionV1, AssetManifestV1, TTSManifestV1, CaptionSegmentV1, StoryboardV1, RenderManifestV1, RenderResultV1, QAResultV1, YouTubeMetadataV1, transitionProjectStatus(), stableHash().

- [ ] **Step 1: Write schema, state, and hash tests**

    it('rejects a claim with no source', () => {
      expect(() => ResearchClaimV1.parse({
        schemaVersion: 1,
        id: 'claim-1',
        text: 'A bond price generally moves inversely to yield.',
        sourceIds: [],
        confidence: 'high',
      })).toThrow();
    });

    it('produces the same hash for reordered object keys', () => {
      expect(stableHash({b: 2, a: 1})).toBe(stableHash({a: 1, b: 2}));
    });

    it('rejects an invalid project transition', () => {
      expect(() => transitionProjectStatus('DRAFT', 'COMPLETE')).toThrow();
    });

- [ ] **Step 2: Run tests and verify red state**

Run: pnpm --filter @motionknowledge/schemas test

Expected: FAIL on missing exports.

- [ ] **Step 3: Implement versioned discriminated schemas**

The visual root is:

    export const VisualInstructionV1 = z.discriminatedUnion('type', [
      TitleHeroInstructionV1,
      CashflowTimelineInstructionV1,
      FormulaInstructionV1,
      ComparisonInstructionV1,
      CatalogInstructionV1,
      HyperframesInstructionV1,
    ]);

Declare project states exactly as DRAFT, RESEARCHING, OUTLINE_READY, SCRIPT_READY, STORYBOARD_READY, GENERATING, PREVIEW_READY, QA_FAILED, READY_FOR_REVIEW, APPROVED, RENDERING, and COMPLETE. Export an explicit adjacency map; never infer transitions from enum order.

- [ ] **Step 4: Implement canonical JSON hashing**

    export function stableHash(value: unknown): string {
      const canonical = canonicalize(value);
      return createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
    }

canonicalize() recursively sorts object keys, preserves array order, serializes dates as ISO strings, and rejects functions and symbols.

- [ ] **Step 5: Verify and commit**

    pnpm --filter @motionknowledge/schemas test
    pnpm --filter @motionknowledge/schemas typecheck
    git add packages/schemas
    git commit -m "feat: add versioned pipeline schemas"

### Task 3: Supabase relational model, repositories, and RLS

**Files:**
- Create: packages/database/package.json, packages/database/drizzle.config.ts
- Create: packages/database/src/client.ts
- Create: packages/database/src/schema/tenancy.ts, projects.ts, artifacts.ts, assets.ts, jobs.ts, usage.ts, index.ts
- Create: packages/database/src/repositories/projects.ts, artifacts.ts, scenes.ts, index.ts
- Create: packages/database/src/rls.integration.test.ts
- Create: supabase/config.toml, supabase/migrations/202608120001_initial.sql, supabase/seed.sql

**Interfaces:**
- Produces: Database, ProjectRepository.getAuthorized(), ProjectRepository.updateStatus(), ArtifactRepository.promoteVersion(), SceneRepository.restoreVersion().
- Consumes: Task 2 schemas.

- [ ] **Step 1: Write the cross-tenant denial test**

    it('prevents a user from reading another workspace project', async () => {
      const owner = await fixture.createUserWithWorkspace();
      const outsider = await fixture.createUserWithWorkspace();
      const project = await fixture.createProject(owner.workspaceId);
      const outsiderDb = fixture.asUser(outsider.userId);
      const result = await outsiderDb.query.projects.findFirst({
        where: eq(projects.id, project.id),
      });
      expect(result).toBeUndefined();
    });

- [ ] **Step 2: Start local Supabase and verify the pre-migration failure**

    pnpm dlx supabase@2.113.0 start
    pnpm --filter @motionknowledge/database test:integration

Expected: FAIL because the schema and policies do not exist.

- [ ] **Step 3: Implement normalized tables and RLS**

Create relational tables for profiles, workspaces, memberships, projects, sources, research documents, claims, claim-source links, lesson-plan versions, script versions, chapters, storyboard versions, scenes, scene versions, assets, asset links, audio assets, caption versions, generation jobs, render jobs, renders, usage events, subscriptions, and credit ledger.

Use this policy shape on tenant tables:

    alter table public.projects enable row level security;
    create policy "workspace members read projects" on public.projects
    for select to authenticated
    using (exists (
      select 1 from public.workspace_memberships m
      where m.workspace_id = projects.workspace_id
        and m.user_id = (select auth.uid())
    ));

Add SELECT and mutation policies, WITH CHECK clauses, and indexes for membership, workspace, project, status, and created-at query paths.

- [ ] **Step 4: Implement repository authorization and atomic promotion**

    export interface ProjectRepository {
      getAuthorized(projectId: string, workspaceId: string): Promise<ProjectRecord | null>;
      create(input: NewProject): Promise<ProjectRecord>;
      updateStatus(input: {
        projectId: string;
        workspaceId: string;
        from: ProjectStatus;
        to: ProjectStatus;
      }): Promise<boolean>;
    }

    export interface ArtifactRepository {
      promoteVersion<T>(input: {
        projectId: string;
        artifactType: ArtifactType;
        schemaVersion: 1;
        payload: T;
        inputHash: string;
      }): Promise<ArtifactVersion<T>>;
    }

Promotion inserts an immutable version and updates the active pointer in one transaction.

- [ ] **Step 5: Reset, verify, and commit**

    pnpm dlx supabase@2.113.0 db reset
    pnpm --filter @motionknowledge/database test:integration
    pnpm --filter @motionknowledge/database typecheck
    git add packages/database supabase
    git commit -m "feat: add tenant-safe relational persistence"

Expected: owner access, cross-tenant denial, and immutable promotion PASS.

### Task 4: Storage, provenance, jobs, usage, and logs

**Files:**
- Create: packages/providers/src/storage.ts, packages/providers/src/index.ts
- Create: packages/storage/package.json, packages/storage/src/local.ts, s3.ts, index.ts
- Create: packages/assets/package.json, packages/assets/src/provenance.ts, policy.ts, hash.ts, index.ts, provenance.test.ts
- Create: packages/jobs/package.json, packages/jobs/src/names.ts, envelope.ts, queue.ts, handler.ts, index.ts, idempotency.integration.test.ts
- Create: packages/usage/package.json, packages/usage/src/cost.ts, ledger.ts, index.ts, cost.test.ts
- Create: packages/observability/package.json, packages/observability/src/logger.ts, context.ts, index.ts
- Create: var/storage/.gitkeep

**Interfaces:**
- Produces: StorageProvider, AssetService.register(), assertCommercialAsset(), JobQueue.enqueue(), defineJobHandler(), UsageLedger.record(), UsageLedger.projectCost(), structured logger.

- [ ] **Step 1: Write provenance, idempotency, and cost tests**

    it('rejects an external asset with incomplete provenance', () => {
      expect(() => assertCommercialAsset({
        origin: 'stock',
        sourceUrl: null,
        license: 'unknown',
      })).toThrow('Commercial asset provenance incomplete');
    });

    it('returns one durable job for one idempotency key', async () => {
      const first = await queue.enqueue(job);
      const second = await queue.enqueue(job);
      expect(second.id).toBe(first.id);
    });

    it('keeps cost separate from credits', () => {
      expect(calculateUsage({providerCostUsd: '0.42', customerCredits: 12}))
        .toEqual({internalCostUsd: '0.42', customerCredits: 12});
    });

- [ ] **Step 2: Run the focused tests**

Run: pnpm --filter @motionknowledge/assets test && pnpm --filter @motionknowledge/jobs test:integration && pnpm --filter @motionknowledge/usage test

Expected: FAIL because the services are missing.

- [ ] **Step 3: Implement storage and provenance**

    export interface StorageProvider {
      put(input: {
        key: string;
        body: Uint8Array;
        contentType: string;
        sha256: string;
      }): Promise<StoredObject>;
      get(key: string): Promise<Uint8Array>;
      delete(key: string): Promise<void>;
      createSignedReadUrl(key: string, expiresInSeconds: number): Promise<string>;
    }

Use @aws-sdk/client-s3 3.1108.0 and @aws-sdk/s3-request-presigner 3.1108.0. Hash bytes before storage, key objects by workspace/project/hash, and reject unknown external licenses unless allowlisted.

- [ ] **Step 4: Implement pg-boss job envelopes and usage records**

Define `UsageEvent` with userId, workspaceId, projectId, provider, model, operation, inputUnits, outputUnits, providerCostUsd, computeDurationMs, jobId, and correlationId. `UsageLedger.record()` writes one event per provider or compute operation and maintains customer credit entries in a separate ledger.

    export type JobEnvelope<T> = Readonly<{
      schemaVersion: 1;
      jobId: string;
      workspaceId: string;
      projectId: string;
      operation: JobName;
      inputHash: string;
      idempotencyKey: string;
      attempt: number;
      payload: T;
    }>;

Use a unique idempotency constraint, three-attempt capped exponential retry for transient provider errors, and no retry for validation or security errors. Store money as decimal strings.

- [ ] **Step 5: Implement structured logging**

Every handler logs jobId, workspaceId, projectId, operation, provider, durationMs, status, and safe error code. Logger serializers redact keys matching token, secret, authorization, cookie, and password.

- [ ] **Step 6: Verify and commit**

    pnpm --filter @motionknowledge/assets test
    pnpm --filter @motionknowledge/jobs test:integration
    pnpm --filter @motionknowledge/usage test
    pnpm --filter @motionknowledge/observability typecheck
    git add packages/providers packages/storage packages/assets packages/jobs packages/usage packages/observability var/storage THIRD_PARTY_NOTICES.md
    git commit -m "feat: add durable jobs storage and usage accounting"

### Task 5: Design system, complete visual catalog, and router

**Files:**
- Create: packages/visual-library/package.json
- Create: packages/visual-library/src/theme.ts, layout.tsx, motion.ts, types.ts, registry.ts, fixtures.tsx, index.ts
- Create: packages/visual-library/src/components/typography.tsx, explanation.tsx, quantitative.tsx, technical.tsx, relationships.tsx, assessment.tsx, index.ts
- Create: packages/visual-library/visuals/catalog.json, packages/visual-library/src/catalog.test.ts
- Create: packages/visual-router/package.json, packages/visual-router/src/router.ts, policy.ts, index.ts, router.test.ts

**Interfaces:**
- Produces: professionalTheme, visualRegistry, getVisualDefinition(), VisualRouter.route(scene, context): RouteDecision.

- [ ] **Step 1: Perform the build-versus-adopt check**

Review Remotion shapes/effects APIs, HyperFrames registry metadata, and IBM chuk-motion's public catalog structure. Record Remotion packages and independently implemented MotionKnowledge components in THIRD_PARTY_NOTICES.md. Do not copy IBM or unlicensed component source.

- [ ] **Step 2: Write catalog and routing tests**

    it('maps every catalog item to a component and schema', () => {
      const catalog = VisualCatalogSchema.parse(catalogJson);
      for (const item of catalog) {
        expect(visualRegistry[item.id]).toBeDefined();
        expect(visualRegistry[item.id].propsSchema).toBeDefined();
        expect(item.preview).toMatch(/^fixture:/);
      }
    });

    it('prefers a registered diagram over generated media', () => {
      expect(router.route(cashflowScene, context).engine).toBe('remotion');
      expect(router.route(cashflowScene, context).componentId).toBe('cashflow-timeline');
    });

- [ ] **Step 3: Run focused tests and verify red state**

Run: pnpm --filter @motionknowledge/visual-library test && pnpm --filter @motionknowledge/visual-router test

Expected: FAIL because catalog and router do not exist.

- [ ] **Step 4: Implement centralized tokens and frame-driven motion**

    export const professionalTheme = {
      colors: {
        background: '#08111F',
        surface: '#10213A',
        primary: '#59D5E0',
        accent: '#F7C948',
        text: '#F8FAFC',
        muted: '#9FB2C8',
        danger: '#FB7185',
      },
      safeArea: {x: 96, y: 64},
      spacing: {xs: 8, sm: 16, md: 24, lg: 40, xl: 64},
      radius: {sm: 10, md: 18, lg: 28},
      motion: {fast: 12, normal: 24, slow: 40},
    } as const;

All animation derives from useCurrentFrame() and useVideoConfig(). CSS transitions and wall-clock timers are prohibited.

- [ ] **Step 5: Implement the complete grouped catalog**

Export bounded Zod props and renderers for title-hero, section-intro, definition-card, bullet-reveal, comparison, pros-cons, timeline, cashflow-timeline, process-flow, flow-chart, bar-chart, line-chart, area-chart, donut-chart, data-table, number-counter, formula, formula-derivation, equation-highlight, step-by-step-calculation, code-block, terminal-demo, browser-frame, screenshot-callout, relationship-diagram, network-diagram, matrix, pyramid, funnel, before-after, quote, key-takeaway, quiz-question, quiz-answer, summary, and outro.

All components share:

    export type VisualComponentProps<T> = Readonly<{
      data: T;
      theme: Theme;
      durationInFrames: number;
    }>;

- [ ] **Step 6: Implement routing policy**

The router uses the order registered component, approved asset, licensed external asset, HyperFrames, generated still, generated video, fallback. Persist reason, score, expected cost, and selected schema version.

- [ ] **Step 7: Verify one fixture per component family and commit**

    pnpm --filter @motionknowledge/visual-library test
    pnpm --filter @motionknowledge/visual-router test
    pnpm --filter @motionknowledge/visual-library typecheck
    git add packages/visual-library packages/visual-router THIRD_PARTY_NOTICES.md
    git commit -m "feat: add deterministic visual system"

Do not add one test per visual; the catalog test plus representative family fixtures is sufficient.

### Task 6: Remotion engine and sandboxed HyperFrames adapter

**Files:**
- Create: packages/remotion-engine/package.json, remotion.config.ts
- Create: packages/remotion-engine/src/SceneRenderer.tsx, ProjectComposition.tsx, Root.tsx, render.ts, probe.ts, qa.ts, index.ts
- Create: packages/remotion-engine/src/render.smoke.test.ts, packages/remotion-engine/fixtures/smoke-manifest.json
- Create: apps/video-studio/package.json, apps/video-studio/src/index.ts
- Create: packages/hyperframes-adapter/package.json
- Create: packages/hyperframes-adapter/src/types.ts, adapter.ts, validate.ts, index.ts, adapter.integration.test.ts
- Create: packages/hyperframes-adapter/fixtures/discount-factor-curve.html, variables.json
- Create: docker/hyperframes/Dockerfile, docker/hyperframes/render-entrypoint.sh

**Interfaces:**
- Produces: ProjectComposition, renderProject(), probeVideo(), evaluateRenderQa(), HyperFramesAdapter.render().
- Consumes: visual registry, RenderManifestV1, AssetService.

- [ ] **Step 1: Write the short render and sandbox policy tests**

    it('renders a valid H.264 MP4 from an immutable manifest', async () => {
      const output = await renderProject(smokeManifest, tempPath('smoke.mp4'));
      const probe = await probeVideo(output.path);
      expect(probe).toMatchObject({width: 640, height: 360, videoCodec: 'h264'});
      expect(probe.durationSeconds).toBeGreaterThan(4.8);
    });

    it('launches specialist rendering without network or credentials', () => {
      const args = buildDockerArgs(request);
      expect(args).toContain('--network=none');
      expect(args).toContain('--read-only');
      expect(args.join(' ')).not.toContain('OPENAI_API_KEY');
    });

- [ ] **Step 2: Ensure media tools exist and run red tests**

    brew list ffmpeg >/dev/null 2>&1 || brew install ffmpeg
    ffprobe -version
    pnpm --filter @motionknowledge/remotion-engine test:smoke
    pnpm --filter @motionknowledge/hyperframes-adapter test

Expected: FAIL because renderers are missing.

- [ ] **Step 3: Implement manifest-only Remotion composition**

    export const ProjectComposition: React.FC<{manifest: RenderManifest}> = ({manifest}) => (
      <AbsoluteFill style={{backgroundColor: manifest.theme.colors.background}}>
        {manifest.scenes.map((scene, index) => (
          <Sequence
            key={scene.sceneVersionId}
            from={scene.startFrame}
            durationInFrames={scene.durationInFrames}
            premountFor={30}
          >
            <SceneRenderer scene={scene} index={index} />
          </Sequence>
        ))}
      </AbsoluteFill>
    );

The composition performs no database or provider calls. renderProject() uses bundle(), selectComposition(), and renderMedia() from Remotion 4.0.508, then validates with ffprobe before promotion. evaluateRenderQa() emits QAResultV1 by checking expected duration, stream presence, dimensions, codec, silent or clipped narration, caption bounds, missing assets, and failed scene renders; failed critical checks prevent READY_FOR_REVIEW promotion.

- [ ] **Step 4: Pin and inspect HyperFrames**

    gh api repos/heygen-com/hyperframes/commits/main --jq .sha
    npm view hyperframes@0.7.107 dist.integrity

Record the inspected SHA and Apache-2.0 notice. Install no unused registry assets.

- [ ] **Step 5: Implement the container boundary and DCF specialist clip**

Validate request schema, copy only frozen local assets, run with --network=none, --read-only, --cpus=2, --memory=2g, --pids-limit=256, enforce a 120-second timeout, validate with ffprobe, hash output, and register provenance.

- [ ] **Step 6: Verify and commit**

    docker build -t motionknowledge-hyperframes:0.7.107 docker/hyperframes
    pnpm --filter @motionknowledge/remotion-engine test:smoke
    pnpm --filter @motionknowledge/hyperframes-adapter test
    RUN_HYPERFRAMES_SMOKE=1 pnpm --filter @motionknowledge/hyperframes-adapter test:integration
    git add packages/remotion-engine packages/hyperframes-adapter apps/video-studio docker/hyperframes THIRD_PARTY_NOTICES.md
    git commit -m "feat: add deterministic render engines"

### Task 7: Safe ingestion, research claims, and provider contracts

**Files:**
- Create: packages/providers/src/llm.ts, research.ts, tts.ts, render.ts, registry.ts, index.ts
- Create: packages/research/package.json
- Create: packages/research/src/ingest/text.ts, structured.ts, office.ts, url.ts, sniff.ts
- Create: packages/research/src/ssrf.ts, claims.ts, sources.ts, service.ts, index.ts
- Create: packages/research/src/ssrf.test.ts, claims.test.ts
- Create: packages/providers/src/openai.ts, mock.ts, provider-contract.test.ts

**Interfaces:**
- Produces: LLMProvider.generateStructured(), ResearchProvider.research(), ingestSource(), ResearchService.extractClaims().
- Consumes: source/research schemas, storage, usage ledger.

- [ ] **Step 1: Perform the ingestion build-versus-adopt check**

Adopt officeparser 7.5.1 (MIT) for PDF/DOCX/PPTX text extraction, file-type 22.0.1 (MIT) for content sniffing, ipaddr.js 2.5.0 (MIT) for IP classification, and OpenAI SDK 7.4.0 (Apache-2.0). Record versions and licenses.

- [ ] **Step 2: Write SSRF and claim-provenance tests**

    it.each(['http://127.0.0.1/x', 'http://169.254.169.254/latest/meta-data', 'http://[::1]/'])(
      'blocks private destination %s',
      async (url) => expect(assertSafeUrl(url, resolver)).rejects.toThrow('Unsafe URL destination'),
    );

    it('keeps claim-to-source links after normalization', async () => {
      const claims = await service.extractClaims(sourceDocument);
      expect(claims.every((claim) => claim.sourceIds.length > 0)).toBe(true);
    });

- [ ] **Step 3: Run tests and verify red state**

Run: pnpm --filter @motionknowledge/research test && pnpm --filter @motionknowledge/providers test

Expected: FAIL because ingestion and providers are missing.

- [ ] **Step 4: Implement safe ingestion**

Limit uploads by configured bytes, sniff content rather than trusting extensions, strip active HTML, block SVG scripts, resolve DNS before and after redirects, block loopback/private/link-local/metadata ranges, cap redirects at three, cap response bytes, and store raw plus normalized source hashes. structured.ts parses CSV and JSON into bounded, schema-validated tables/objects while preserving row or JSON-pointer provenance for downstream claims.

- [ ] **Step 5: Implement provider interfaces and adapters**

    export interface LLMProvider {
      generateStructured<T>(input: {
        operation: string;
        schema: z.ZodType<T>;
        system: string;
        prompt: string;
        idempotencyKey: string;
      }): Promise<ProviderResult<T>>;
    }

OpenAIProvider uses Responses structured output. MockProvider returns seeded DCF fixtures and deterministic test results. Source text is wrapped as untrusted data and cannot modify system instructions.

- [ ] **Step 6: Implement research and claim extraction**

ResearchService prefers supplied sources, then configured research provider, stores exact source URLs and retrieval time, rejects fabricated citations, and emits confidence plus claim-source edges.

- [ ] **Step 7: Verify and commit**

    pnpm --filter @motionknowledge/research test
    pnpm --filter @motionknowledge/providers test
    git add packages/research packages/providers THIRD_PARTY_NOTICES.md
    git commit -m "feat: add safe grounded research pipeline"

### Task 8: Lesson, script, storyboard, TTS, captions, and audio

**Files:**
- Create: packages/content-engine/package.json
- Create: packages/content-engine/src/lesson.ts, script.ts, storyboard.ts, metadata.ts, pipeline.ts, prompts.ts, index.ts
- Create: packages/content-engine/src/pipeline.integration.test.ts
- Create: packages/tts/package.json, packages/tts/src/google.ts, elevenlabs.ts, normalize.ts, service.ts, index.ts, contract.test.ts
- Create: packages/captions/package.json, packages/captions/src/group.ts, srt.ts, index.ts, group.test.ts
- Create: packages/audio/package.json, packages/audio/src/ffmpeg.ts, mix.ts, loudness.ts, index.ts

**Interfaces:**
- Produces: ContentPipeline.generateLesson/Script/Storyboard(), TTSService.synthesize(), groupCaptions(), toSrt(), AudioMixer.mix().
- Consumes: claims, visual registry metadata, providers, usage ledger, storage.

- [ ] **Step 1: Write the pipeline traceability and caption timing tests**

    it('keeps script paragraphs traceable to research claims', async () => {
      const result = await pipeline.generateScript(lessonPlan, claims);
      expect(result.chapters.flatMap((chapter) => chapter.segments)
        .every((segment) => segment.claimIds.length > 0)).toBe(true);
    });

    it('groups measured word timings without estimating from text length', () => {
      const captions = groupCaptions(realWordTimings, {
        maxWords: 7,
        maxDurationMs: 3200,
        maxCharsPerLine: 38,
      });
      expect(captions[0].startMs).toBe(realWordTimings[0].startMs);
      expect(captions.every((caption) => caption.endMs > caption.startMs)).toBe(true);
    });

- [ ] **Step 2: Run focused tests and verify red state**

Run: pnpm --filter @motionknowledge/content-engine test && pnpm --filter @motionknowledge/captions test

Expected: FAIL because pipeline and caption grouping are missing.

- [ ] **Step 3: Implement staged structured generation**

Lesson uses learning objectives and prerequisite ordering. Script segments reference claim IDs. Storyboard sees the compact visual catalog and produces SceneV1 objects, not JSX. Each stage validates, hashes, versions, records usage, and promotes only valid output.

- [ ] **Step 4: Implement TTS providers and measured timings**

Google adapter uses SSML marks for the economical provider. ElevenLabs uses timestamped synthesis for premium output. Normalize both to:

    export type TimedWord = Readonly<{
      text: string;
      startMs: number;
      endMs: number;
      confidence: number | null;
    }>;

Reject provider output with non-monotonic timestamps. A configured forced-alignment path handles audio without adequate timings.

- [ ] **Step 5: Implement captions and audio mix plans**

SRT uses measured timings. FFmpeg plans normalize narration, duck optional music during speech, mix optional effects, and never allow background audio to exceed the configured narration-relative level.

- [ ] **Step 6: Verify and commit**

    pnpm --filter @motionknowledge/content-engine test
    pnpm --filter @motionknowledge/tts test
    pnpm --filter @motionknowledge/captions test
    pnpm --filter @motionknowledge/audio typecheck
    git add packages/content-engine packages/tts packages/captions packages/audio THIRD_PARTY_NOTICES.md
    git commit -m "feat: add structured content and timed narration"

### Task 9: Worker orchestration and complete DCF reference project

**Files:**
- Create: apps/worker/package.json, apps/worker/src/index.ts, register.ts
- Create: apps/worker/src/handlers/research.ts, outline.ts, script.ts, storyboard.ts, scene.ts, tts.ts, captions.ts, preview.ts, qa.ts, render.ts, thumbnail.ts
- Create: packages/testkit/src/fixtures/dcf.ts, providers.ts, database.ts
- Create: examples/dcf/project.json, sources.json, claims.json, lesson.json, script.json, storyboard.json
- Create: scripts/generate-dcf.ts, scripts/render-dcf.ts
- Create: apps/worker/src/dcf.e2e.test.ts

**Interfaces:**
- Produces: registered handlers for all JobName values, generate DCF command, render DCF command.
- Consumes: Tasks 3 through 8.

- [ ] **Step 1: Write the DCF acceptance test with deterministic providers**

    it('generates, edits one scene, rerenders, and exports MP4 plus SRT', async () => {
      const project = await createDcfProject(fixture.workspaceId);
      await runProjectToPreview(project.id, mockProviders);
      const before = await fixture.sceneVersions(project.id);
      await regenerateScene(project.id, 'scene-calculation', {title: 'Present value, step by step'});
      const after = await fixture.sceneVersions(project.id);
      expect(after.length).toBe(before.length + 1);
      const render = await renderApprovedProject(project.id);
      expect(await probeVideo(render.mp4Path)).toMatchObject({videoCodec: 'h264'});
      expect(await readFile(render.srtPath, 'utf8')).toContain('discount rate');
    }, 180_000);

- [ ] **Step 2: Run the DCF test and verify red state**

Run: pnpm --filter @motionknowledge/worker test:e2e

Expected: FAIL because handlers and fixtures are missing.

- [ ] **Step 3: Implement one handler per expensive operation**

Handlers load authorized immutable inputs, verify the expected input hash, call one service, record usage, persist output, promote atomically, and enqueue the next requested stage. No handler reads mutable editor state after work starts. The QA handler evaluates the frozen preview, persists QAResultV1, moves critical failures to QA_FAILED, and promotes passing previews to READY_FOR_REVIEW. The thumbnail handler renders the selected cover scene at a deterministic frame and registers the resulting image as a versioned export asset.

- [ ] **Step 4: Implement the complete five-minute DCF fixture**

The project includes title, definition, cash-flow timeline, discount formula, step-by-step present-value calculation, value-versus-rate chart, DCF comparison, and summary scenes. Values are hypothetical and the script states that it is educational, not investment advice.

Use a local deterministic narration fixture for credential-free acceptance and retain Google/ElevenLabs for configured projects.

- [ ] **Step 5: Implement CLI commands**

    pnpm dcf:generate
    pnpm dcf:preview
    pnpm dcf:render

Commands print project ID, preview URL, output paths, duration, provider cost, and ffprobe result without printing secrets.

- [ ] **Step 6: Verify and commit**

    pnpm --filter @motionknowledge/worker test:e2e
    pnpm dcf:render
    ffprobe -v error -show_streams -show_format var/exports/dcf/video.mp4
    git status --short
    git add apps/worker packages/testkit examples/dcf scripts package.json
    git commit -m "feat: add complete DCF generation workflow"

Expected: MP4 and SRT exist under ignored var/exports; no media is staged.

### Task 10: Next.js application, authentication, dashboard, and project creation

**Files:**
- Create: apps/web/package.json, next.config.ts, postcss.config.mjs, tsconfig.json
- Create: apps/web/src/app/layout.tsx, globals.css, page.tsx
- Create: apps/web/src/app/(auth)/login/page.tsx, register/page.tsx, actions.ts
- Create: apps/web/src/app/(app)/layout.tsx, dashboard/page.tsx, projects/new/page.tsx, settings/page.tsx
- Create: apps/web/src/lib/supabase/client.ts, server.ts, proxy.ts, auth.ts
- Create: apps/web/src/lib/db.ts, services/projects.ts
- Create: packages/ui/package.json, packages/ui/src/button.tsx, field.tsx, card.tsx, status.tsx, shell.tsx, index.ts
- Create: apps/web/e2e/auth-project.spec.ts

**Interfaces:**
- Produces: authenticated application shell, createProjectAction(), dashboard project list.
- Consumes: brand, Supabase Auth, project repositories.

- [ ] **Step 1: Write the critical browser acceptance path**

    test('user registers and creates a configured project', async ({page}) => {
      await page.goto('/register');
      await page.getByLabel('Email').fill('creator@example.test');
      await page.getByLabel('Password').fill('Correct-Horse-42!');
      await page.getByRole('button', {name: 'Create account'}).click();
      await page.getByRole('link', {name: 'New video'}).click();
      await page.getByLabel('Topic').fill('What is a Discounted Cash Flow?');
      await page.getByLabel('Audience').selectOption('beginner');
      await page.getByLabel('Duration').selectOption('5');
      await page.getByRole('button', {name: 'Create project'}).click();
      await expect(page).toHaveURL(/projects\\/[a-f0-9-]+/);
    });

- [ ] **Step 2: Run Playwright and verify red state**

Run: pnpm --filter @motionknowledge/web test:e2e --grep "registers and creates"

Expected: FAIL because app pages are missing.

- [ ] **Step 3: Implement the restrained professional design system**

Landing uses the approved headline and two CTAs. App shell prioritizes project status and content, with no animation-heavy marketing effects. Forms are accessible, keyboard usable, and branded through the config package.

- [ ] **Step 4: Implement Supabase SSR auth and server authorization**

Use @supabase/ssr 0.12.4. Server actions derive the user from the validated Supabase session, resolve workspace membership, validate form input with Zod, and never accept workspace ownership from a client field.

- [ ] **Step 5: Implement dashboard and project creation**

Project form supports topic and uploaded source, audience, duration, language, tone, style, and aspect ratio. Create DRAFT project, source record, and initial generation job request; redirect to project workflow.

- [ ] **Step 6: Verify and commit**

    pnpm --filter @motionknowledge/web test:e2e --grep "registers and creates"
    pnpm --filter @motionknowledge/web typecheck
    pnpm --filter @motionknowledge/web build
    git add apps/web packages/ui
    git commit -m "feat: add authenticated project workspace"

### Task 11: Visible generation workflow, scene editor, preview, and regeneration

**Files:**
- Create: apps/web/src/app/(app)/projects/[projectId]/page.tsx
- Create: apps/web/src/app/(app)/projects/[projectId]/outline/page.tsx, script/page.tsx, storyboard/page.tsx
- Create: apps/web/src/app/(app)/projects/[projectId]/editor/page.tsx
- Create: apps/web/src/components/project/StageRail.tsx, ArtifactEditor.tsx, JobStatus.tsx
- Create: apps/web/src/components/editor/SceneList.tsx, Preview.tsx, SceneProperties.tsx, EditorShell.tsx
- Create: apps/web/src/app/api/projects/[projectId]/jobs/route.ts, scenes/[sceneId]/route.ts, scenes/[sceneId]/regenerate/route.ts
- Create: apps/web/src/services/artifacts.ts, scenes.ts, jobs.ts
- Create: apps/web/e2e/editor-regeneration.spec.ts

**Interfaces:**
- Produces: stage approval/edit actions, scene CRUD/versioning, scene-regeneration enqueue, Remotion Player preview.
- Consumes: active artifact versions, visual registry schemas, job queue.

- [ ] **Step 1: Write the editor regeneration acceptance test**

    test('edits and regenerates only one scene', async ({page}) => {
      await openSeededDcfEditor(page);
      const untouchedVersion = await page.getByTestId('scene-definition-version').textContent();
      await page.getByRole('button', {name: 'Step-by-step calculation'}).click();
      await page.getByLabel('Scene title').fill('Present value, step by step');
      await page.getByRole('button', {name: 'Regenerate scene'}).click();
      await expect(page.getByText('Scene ready')).toBeVisible();
      await expect(page.getByTestId('scene-definition-version')).toHaveText(untouchedVersion!);
      await expect(page.getByLabel('Scene title')).toHaveValue('Present value, step by step');
    });

- [ ] **Step 2: Run the focused browser test**

Run: pnpm --filter @motionknowledge/web test:e2e --grep "regenerates only one scene"

Expected: FAIL because editor routes are missing.

- [ ] **Step 3: Implement visible artifact stages**

Show sources/claims, outline, script, storyboard, scenes, narration/captions, preview/QA, and render. Each shows active version, validation, provider, cost, and status. Edits create new immutable versions.

- [ ] **Step 4: Implement the three-panel editor**

Left panel supports select, reorder, duplicate, delete, and restore. Center embeds @remotion/player 4.0.508 with the active immutable preview manifest. Right panel is generated from the selected component's Zod metadata and allows narration, text/data, template, duration, and asset edits.

Use @dnd-kit/core 6.3.1 and @dnd-kit/sortable 10.0.0 instead of building drag-and-drop infrastructure.

- [ ] **Step 5: Implement scene-local invalidation and regeneration**

Scene mutations create a new scene version and recompute only its input hash plus the project render manifest. Regeneration enqueues GENERATE_SCENE and dependent TTS/preview work only for the changed scene. Preserve all other active scene version IDs.

- [ ] **Step 6: Verify and commit**

    pnpm --filter @motionknowledge/web test:e2e --grep "regenerates only one scene"
    pnpm --filter @motionknowledge/web typecheck
    git add apps/web package.json pnpm-lock.yaml THIRD_PARTY_NOTICES.md
    git commit -m "feat: add editable scene generation workflow"

### Task 12: Exports, settings, analytics, security hardening, CI, and clean-install documentation

**Files:**
- Create: apps/web/src/app/api/projects/[projectId]/render/route.ts, downloads/[renderId]/route.ts
- Create: apps/web/src/app/(app)/projects/[projectId]/exports/page.tsx
- Create: apps/web/src/components/project/ExportPanel.tsx, UsageSummary.tsx
- Create: packages/analytics/package.json, packages/analytics/src/events.ts, noop.ts, index.ts
- Create: apps/web/src/services/downloads.ts, usage.ts, settings.ts
- Create: apps/web/e2e/full-dcf.spec.ts, apps/web/e2e/tenant-isolation.spec.ts
- Create: .github/workflows/ci.yml
- Create: README.md, docs/development/setup.md, docs/development/providers.md, docs/operations/worker.md, docs/operations/rendering.md, docs/security/threat-model.md
- Modify: .env.example, THIRD_PARTY_NOTICES.md, docs/architecture/production-deployment.md

**Interfaces:**
- Produces: render request/download routes, export bundle, usage summary, analytics abstraction, verified CI and operator docs.
- Consumes: all preceding tasks.

- [ ] **Step 1: Write final tenant and product acceptance tests**

    test('cannot download another workspace render', async ({request}) => {
      const response = await request.get(otherWorkspaceRenderUrl, {
        headers: await authHeadersFor(outsider),
      });
      expect(response.status()).toBe(404);
    });

    test('completes the DCF product journey', async ({page}) => {
      await createDcfProjectThroughUi(page);
      await approveOutlineScriptAndStoryboard(page);
      await editAndRegenerateCalculationScene(page);
      await page.getByRole('button', {name: 'Final render'}).click();
      await expect(page.getByText('Render complete')).toBeVisible({timeout: 180_000});
      await expect(page.getByRole('link', {name: 'Download MP4'})).toBeVisible();
      await expect(page.getByRole('link', {name: 'Download SRT'})).toBeVisible();
    });

- [ ] **Step 2: Run final focused tests and verify red state**

Run: pnpm --filter @motionknowledge/web test:e2e --grep "download another|DCF product journey"

Expected: FAIL because render/export routes are missing.

- [ ] **Step 3: Implement render requests and authorized exports**

POST render validates APPROVED status and enqueues RENDER_FINAL. Downloads resolve render to workspace, require membership, and issue a short-lived signed URL. Export page exposes MP4, SRT, transcript, chapters, thumbnail, description, sources, and metadata.

- [ ] **Step 4: Implement provider settings, usage summary, and analytics**

Settings reports configured/not-configured providers without returning secrets. Usage page aggregates internal provider cost by project and operation separately from customer credits. Analytics exposes typed `signup`, `project_created`, `artifact_generated`, `preview_generated`, `scene_regenerated`, `render_requested`, `render_completed`, `export_downloaded`, and `upgrade_requested` events with workspace/project correlation where applicable. It defaults to a no-op adapter, and adapter failures never block the product.

- [ ] **Step 5: Complete security controls**

Document and verify prompt-injection boundaries, SSRF, content sniffing, malicious SVG/HTML, size limits, XSS encoding, signed URL expiry, render sandbox, secret redaction, and cross-user isolation. Do not introduce a broad generic security test suite; keep only the concrete high-risk tests named above.

- [ ] **Step 6: Add CI with a short render only**

CI jobs run:

    corepack enable
    pnpm install --frozen-lockfile
    pnpm lint
    pnpm typecheck
    pnpm test
    pnpm build
    pnpm --filter @motionknowledge/remotion-engine test:smoke

Install FFmpeg in CI. Start local Supabase for database/security integration tests. Do not render the five-minute DCF video in routine CI.

- [ ] **Step 7: Write clean-install and provider documentation**

README includes exact install, Supabase start/reset, development, worker, test, DCF generation, preview, render, and export commands. Provider docs cover OpenAI, Google TTS, ElevenLabs, S3/Supabase storage, optional HyperFrames, and expected environment variables. It states current Remotion automation licensing and proprietary repository status.

- [ ] **Step 8: Run the complete fresh verification**

    pnpm dlx supabase@2.113.0 db reset
    pnpm lint
    pnpm typecheck
    pnpm test
    pnpm build
    pnpm --filter @motionknowledge/remotion-engine test:smoke
    pnpm --filter @motionknowledge/web test:e2e --grep "DCF product journey"
    pnpm dcf:render
    ffprobe -v error -show_streams -show_format var/exports/dcf/video.mp4
    git status --short
    git grep -nE "(sk-[A-Za-z0-9]|AKIA[0-9A-Z]|BEGIN PRIVATE KEY)" -- . ':!pnpm-lock.yaml'

Expected: every command exits 0; MP4 has H.264 video and audio, SRT exists, no secrets are found, and generated media is not staged.

- [ ] **Step 9: Commit, push, and verify private GitHub Actions**

    git add .github README.md docs apps/web packages/analytics .env.example THIRD_PARTY_NOTICES.md
    git commit -m "feat: complete MotionKnowledge working product"
    git push upstream main
    gh run watch --exit-status

Expected: private repository push succeeds and CI is green.

## Plan Self-Review Checklist

- [ ] Every requirement in the approved product design maps to Tasks 1 through 12.
- [ ] The build-versus-adopt check appears before custom visual, ingestion, renderer, and editor infrastructure.
- [ ] The plan never copies from non-commercial, unlicensed, or AGPL reference projects.
- [ ] Provider, storage, render, and job interfaces have exact method names and stable types.
- [ ] Standard scenes are structured registry entries, not generated React code.
- [ ] RLS and server authorization both enforce workspace ownership.
- [ ] Tests are limited to named high-risk invariants and acceptance paths.
- [ ] The DCF journey verifies preview, edit, individual-scene regeneration, MP4, and SRT.
- [ ] No step provisions paid cloud infrastructure or publishes the repository publicly.
- [ ] No step commits generated media or secrets.
