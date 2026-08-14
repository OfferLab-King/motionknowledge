# Format, Template and Style Architecture

- **Status:** Accepted
- **Date:** 2026-08-13
- **Scope:** Phase 1 of the multi-style visual explanation platform

## 1. Context

MotionKnowledge currently produces a single recognisable visual style. The audit
(2026-08-13) established that:

- `style` on `projects` is a free-form string used only in one LLM prompt line.
  It never reaches the storyboard, the render manifest, or any visual component.
- The LLM-emitted `StoryboardV1.theme` tokens are discarded by
  `buildRenderManifest`, which hardcodes `professionalTheme`; `SceneRenderer`
  passes `professionalTheme` to every component. Only the root background uses
  `manifest.theme.background`.
- There is exactly one theme type (`Theme = typeof professionalTheme`), a
  second flat wire schema (`ThemeTokenSchema`), and no converter between them.
- ~15 hex colors are hardcoded inside components outside the theme; `fonts` is
  a module singleton, not theme data; `theme.motion` frame tokens are dead code.
- `visual-router` is implemented and tested but never invoked in production.
- No template or format concept exists; the only structure is the 38-entry
  `visualRegistry` and the typed `VisualInstructionV1` union.

The goal is a platform where the same semantic scenes render in six production
quality visual styles, projects are created from templates, and the content
pipeline plans according to a pedagogical format — without forking the visual
library or duplicating components per style.

## 2. Core concepts

Three separate concerns, never conflated:

| Concept | Owns | Example |
|---|---|---|
| **Format** | Pedagogical/story structure (planning grammar) | Explainer, Tutorial, Course Lesson, Business Analysis, List/Breakdown, Story/Narrative |
| **Template** | A curated starting point: recommended format + default style + guidance | Whiteboard Teacher, Business Briefing, Minimal Concept |
| **Visual Style** | The presentation language: tokens, motion personality, component variants | Signature, Handwritten, Clean Presentation, Editorial, Business, Minimal |

### 2.1 Format (content-engine)

A format is a planning grammar: an ordered list of scene roles the content
engine may adapt when generating the lesson plan and storyboard. It is *not* a
fixed scene list. Formats live in `packages/content-engine/src/formats.ts` and
flow into the `LESSON_SYSTEM` and `STORYBOARD_SYSTEM` prompts so the LLM
structures content pedagogically.

### 2.2 Template (content-engine)

A template bundles: `id`, `name`, `description`, `tags`, `recommendedFormat`,
`defaultStyleId`, intro/outro patterns, pacing guidance, preferred visual
families, default duration, caption/voice/thumbnail treatment notes. Templates
live in `packages/content-engine/src/templates.ts`. Templates are *not*
permanent: users can change style or format after creation.

### 2.3 Visual Style (visual-library)

A style is a full `VisualStyleProfile`:

- identity: `id`, `name`, `description`, `tags`, `version`, `aspectRatios`
- colour tokens (background, surface, primary, accent, text, muted, danger,
  success, chart palette, contrast colours)
- fonts + typography scale
- background treatment (flat / gradient / texture / paper)
- surface / card treatment, strokes, borders, shadows, radius, spacing
- motion personality: frame durations, reveal type, spring config, easing,
  transition family
- scene layout preferences, density, safe areas
- treatment metadata for illustration, icon, chart, diagram, annotation,
  caption, emphasis, thumbnail
- `visualLanguage` — the renderer selector (`polished | hand-drawn | structured
  | infographic | business | minimal`) that components consult, plus preferred
  component variants

Styles are data, registered in `packages/visual-library/src/style/registry.ts`.
The registry is the single source of truth; no `if (style === 'handwritten')`
branches are allowed outside a component's own variant renderer.

### 2.4 Theme tokens (schemas)

The wire format `StyleTokenSchema` (`packages/schemas/src/style.ts`) is the
single source of truth for tokens. `Theme` in visual-library is
`z.infer<typeof StyleTokenSchema>`, eliminating the old
`Theme`/`ThemeTokenSchema` duplication. `RenderManifestV1.theme` carries the
full token set (extended with defaults so persisted v1 manifests still parse);
`RenderManifestV1.style` carries `{styleId, styleVersion}`.

## 3. Data flow

```
Research → claims → lesson plan (format-aware) → script → storyboard
(format + template + styleId) → typed scene specs → scene versions (DB)
→ render manifest (style tokens + per-scene overrides) → Remotion Player /
   preview render / final render / thumbnails
```

- Research is **style-independent**: presentation never contaminates factual
  reasoning. The storyboard prompt states that appearance is decided by the
  chosen style and asks for *semantic* visual choices (process, comparison,
  timeline, …) only.
- The visual router maps semantic intent + style to a registered deterministic
  component. HyperFrames remains a specialist fallback.
- The browser Player and the worker render path use the **same** manifest
  builder and the **same** theme resolution, so preview === final.

## 4. Style resolution

`resolveSceneTheme(manifest, scene)`:

1. Start from `manifest.tokens` (the project style's token set).
2. If `scene.styleOverride.styleId` is set and registered, replace the base
   tokens with that style's tokens.
3. Apply overrides: `variant` (component variant), `background` (background
   treatment), `motionIntensity` (scales `motion.fast/normal/slow`).
4. Return the merged token set, consumed by every visual component.

Per-scene overrides are stored in `SceneV1.styleOverride` (persisted in the
immutable `scene_versions.payload`), so old projects keep rendering identically
after styles evolve. Style changes are versioned: `projects.style_version`
increments whenever `style_id` changes.

## 5. Component variants

Semantic components stay reusable; styles are expressed through tokens and
variant renderers. `ProcessFlow` is the reference implementation: it renders

- polished motion graphics (Signature)
- hand-drawn boxes + animated stroke drawing (Handwritten)
- SmartArt-like structured shapes (Clean Presentation)
- bold infographic blocks (Editorial)
- restrained professional boxes (Business)
- ultra-minimal line diagram (Minimal)

via a single component that switches on `theme.visualLanguage` and reuses
token-driven primitives (`Panel`, `styling.tsx` helpers, `variants.tsx`
hand-drawn primitives). Other components shift via tokens (fonts, colours,
radius, strokes, reveal type); no second copies exist.

## 6. Deterministic style preview

`StyleShowcase` (`packages/remotion-engine/src/showcase/`) is a fixed 8-second
composition demonstrating the same sample concept ("Why compound interest
accelerates": title → process → statistic → chart → annotation → transition) in
any style. No AI is involved. It is used for the project-creation gallery,
template gallery, settings previews, and future marketing pages, via the
Remotion Player (web) and `renderStill` (thumbnails).

## 7. Schema changes (summary)

- `projects`: `format` (text, default `explainer`), `template_id` (text,
  nullable), `style_id` (text, default `signature`), `style_version` (int,
  default 1). Legacy `style` column retained (migrated to `style_id` on read
  for old rows).
- `SceneV1`: optional `styleOverride` (`{styleId?, variant?, background?,
  motionIntensity?}`).
- `StoryboardV1`: `format`, `templateId`, `styleId` (defaults for compat).
- `RenderManifestV1`: `style {styleId, styleVersion}`; `theme` extended to the
  full token set with defaults.
- Migration follows the repo convention: additive `alter table ... add column
  if not exists` SQL file + matching Drizzle schema + repository defaults.

## 8. Extension points (adding a 7th style)

1. Add tokens + profile in `packages/visual-library/src/style/<id>.ts` and
   register in `src/style/registry.ts` (metadata, tokens, version).
2. If the style needs distinct component treatments, extend the variant
   renderers in `src/components/variants.tsx` or the treatment switch inside a
   component — keyed by the new `visualLanguage` value.
3. Add a template that recommends the style in
   `packages/content-engine/src/templates.ts` (optional).
4. Registry validation tests and the style-matrix smoke test pick the style up
   automatically; add a still to the matrix snapshot set if desired.

No pipeline stage, schema, or web page needs modification.

## 9. Scene editor capabilities (Phase 2)

The editor (`/projects/{id}/editor`) supports, on top of Phase 1 overrides:

- **Visual switching**: pick any registered catalog visual; compatible scene
  data is kept, otherwise the component fixture seeds the payload
  (`packages/visual-router/src/visual-switch.ts`, used client-side; the server
  only validates the id against the React-free catalog subpath
  `@motionknowledge/visual-library/catalog`).
- **Per-scene component variant** (for visuals that declare `variants`).
- **Duplicate, delete, reorder** scenes (`services/artifacts.ts`); reorder
  refreshes payload `index` via new versions; delete cascades version history.
- **Version history + restore** (`restoreVersion` repository, exposed via
  `POST /scenes/[sceneId]/restore`).
- **Regenerate narration for one scene** — `SYNTHESIZE_TTS` accepts `force`,
  bypassing the existing-audio skip.
- **Editable artifacts**: outline/script/storyboard pages are editable JSON
  validated against their Zod schema + claim provenance
  (`POST /api/projects/[projectId]/artifacts/[type]`), then promote a new
  version and enqueue the downstream stage (script → storyboard → scenes).

Server-side web code must never import the Remotion-heavy visual-library main
index; use the `./style` and `./catalog` subpaths instead.

## 10. Phase 3: operational loops and source-led projects

- **Job retry**: `POST /api/projects/[id]/jobs/[jobId]/retry` re-enqueues a
  failed job with a fresh nonce (idempotency bypass) and resets the project
  status to the stage the operation resumes from. The UI shows a Retry button
  on failed jobs.
- **Regenerate preview**: `POST /api/projects/[id]/preview/regenerate`
  re-runs `GENERATE_PREVIEW` → `RUN_QA` so exported previews stay fresh after
  scene/artifact edits.
- **Artifact version history + restore**: `listVersions`/`restoreVersion` on
  the artifact repository; `GET|POST /api/projects/[id]/artifacts/[type]` and
  `.../restore`; the artifact editors list versions and restore, then
  regenerate downstream stages.
- **Source-led projects**: creation accepts pasted text or a URL. Pasted text
  is stored as a normalized source (`packages/research/src/source-text.ts`
  key convention) with `PROCESSED` status; URLs are fetched by the
  `INGEST_SOURCE` handler (`fetchSafeUrl`, SSRF-safe), stored, and marked
  `PROCESSED`/`FAILED`. `RESEARCH_PROJECT` runs `extractClaims` over every
  processed supplied source and merges those claims with topic research;
  claims link to the actual source rows.
- **Storyboard claim resilience**: scenes omitting `claimIds` are grounded via
  their script chapter; invented chapter ids are matched to the script by
  narration word overlap before failing.

## 11. Phase 4: project management, uploads, QA visibility, HyperFrames

- **Project management**: rename, duplicate (same settings, fresh pipeline) and
  delete (cascades artifacts/scenes/jobs/renders) via a project actions menu;
  dashboard cards show style + format badges.
- **File uploads**: project creation accepts PDF/DOCX/PPTX/TXT/MD/CSV/JSON
  files (25 MB cap, server action body limit). Bytes are sniffed by magic
  bytes (`ingestSource` allowlist; HTML/SVG/scripts rejected), the raw file is
  stored with provenance, the extracted text feeds `extractClaims`.
- **QA visibility**: the status API exposes the latest `QA_RESULT`; the
  project page shows the check list (pass/critical/message).
- **Exports**: source-list download (text) + `export_downloaded` tracking
  wired into the downloads route.
- **HyperFrames demonstration**: `RENDER_HYPERFRAME` job renders
  `hyperframes`-typed scenes in the sandboxed docker container
  (`motionknowledge-hyperframes:0.7.107`, no network/credentials/privileges,
  read-only inputs) and stores a provenance-tracked MP4 asset. The scene
  editor offers a "Custom animation (HyperFrames)" visual that seeds a
  deterministic demo HTML; the Remotion title card keeps the scene playable if
  docker is unavailable. Credential env forwarding is opt-in
  (`inheritEnv`); the default mode never forwards host environment.

## 12. Phase 5: release readiness

- **Live render progress**: `renders.progress` (0–100) updated by the worker
  during preview and final renders (`renderMedia.onProgress`, throttled);
  project page and exports page show a progress bar while rendering.
- **Preview playback**: the project page plays the latest QA'd preview render
  (signed, expiring URL) — the "inspect the preview" loop after QA_FAILED or
  scene edits.
- **Dashboard filter**: status chips (All / In progress / Ready / Complete).
- **CI + release gate**: `pnpm verify:release` = verify + the style-matrix
  smoke test; the CI verify job now renders one frame per style (16:9 and
  9:16) in a real browser.

## 13. Phase 6: economics and operational depth

- **Render reuse**: `renders.manifest_hash` stores the canonical manifest hash
  each render was produced from. Preview and final handlers skip identical
  re-renders (and skip the QA round-trip, since identical output implies an
  identical QA result), recording `render:preview:reused` /
  `render:final:reused` usage events.
- **Preview staleness**: the status API compares the active manifest with the
  latest preview's hash; the project page warns when scenes or narration
  changed after the last preview.
- **Render cancellation**: queued render jobs can be cancelled
  (`POST .../renders/[id]/cancel`) — the pg-boss job is cancelled by its
  singleton key, the `generation_jobs` row and the `renders` row are marked
  `cancelled`, and the project status is restored (APPROVED for final,
  READY_FOR_REVIEW for preview). Running renders refuse cancellation.
- **Source lifecycle**: the project page lists sources with their statuses
  (PENDING/PROCESSED/FAILED + reason) and a Retry action for failed URL
  sources (re-enqueues `INGEST_SOURCE`).

## 14. Phase 7: viewing and polish

- **Burned captions**: captions are rendered into the video itself, styled by
  the style's caption treatment tokens (pill / marker / block / flat). The
  `BurnedCaptions` component is frame-driven and deterministic; a project
  toggle (`projects.burned_captions`, manifest `burnedCaptions`) controls it.
- **Drag-and-drop scene reordering** in the scene editor (@dnd-kit), alongside
  the keyboard/button arrows.
- **Dashboard search** (title filter via `?q=`).
- **MP4 chapter metadata**: the final render re-muxes chapter markers derived
  from the manifest (script chapter titles, scene boundaries) with `-c copy`
  (`injectChapterMetadata`, `probeChapters` for verification).

## 15. Migration risks

- Old persisted `RENDER_MANIFEST` artifacts parse because new token fields have
  defaults and the old `theme` shape is a strict subset.
- Old persisted `STORYBOARD` artifacts parse because `format`/`templateId`/
  `styleId` default; old scenes render in Signature style (legacy
  `style = 'professional'` maps to `signature`).
- `SceneV1` parse of old payloads succeeds because `styleOverride` defaults to
  `{}`.
- Mock provider fixtures are updated to the new storyboard shape so
  credential-free flows and the DCF acceptance test keep working.

## 10. Verification

- `pnpm verify` (lint, typecheck, unit tests, build)
- web E2E (project creation gallery, editor overrides)
- Remotion smoke test renders
- DCF acceptance test (`pipeline.integration.test.ts` + `dcf:*` scripts)
- Style matrix: one representative frame per style, 16:9 and 9:16
