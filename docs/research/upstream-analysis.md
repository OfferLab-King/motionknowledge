# Upstream Analysis

**Research date:** 2026-08-12

**Scope:** Current repositories, official documentation, release metadata, licenses, architecture, and commercial-use implications relevant to MotionKnowledge.

## Executive Recommendation

Use Remotion as the primary composition and preview engine, subject to its commercial automation license. Use HyperFrames only through a sandboxed adapter for specialist HTML/SVG/GSAP/WebGL scenes. Use official agent skills as development guidance after inspection, not as runtime dependencies. Treat Video Podcast Maker as research-only because its governing repository license is CC BY-NC 4.0.

The strongest pattern across current systems is a persistent, stage-based production model with reusable visual primitives, immutable manifests, asynchronous work, asset provenance, and human review. MotionKnowledge should implement these ideas independently around an educational claim-to-scene graph.

## 1. Remotion

- **Repository:** https://github.com/remotion-dev/remotion
- **Purpose:** React-based deterministic video composition, preview, and server-side rendering.
- **Current release/activity:** v4.0.508, published 2026-08-11. The repository was active on the research date and had roughly 56,000 stars.
- **Architecture:** Large TypeScript monorepo containing the React timeline runtime, Player, Studio, renderer, media tooling, server-side/lambda rendering, effects, and supporting packages. Compositions are parameterized React trees evaluated by frame.
- **Useful concepts:** Parameterized compositions, frame-based determinism, browser preview through Player, metadata calculation, schema-described props, scene sequencing, server-side rendering, and render bundles.
- **License:** Custom Remotion License, not OSI open source. Individuals and for-profit organizations with up to three employees may use it commercially for creating videos. Larger entities require a company license. Remotion currently markets an Automators license for video editors and prompt-to-video applications at $0.01 per render with a $100 monthly minimum.
- **Commercial-use implications:** MotionKnowledge is explicitly an automation/video-creation application. It may qualify for the free small-entity license initially, but commercial planning must include the Automators license and a pre-launch terms review. Do not describe Remotion as MIT or unrestricted open source.
- **Dependencies/capabilities:** React 19, TypeScript, browser/Chromium rendering, Node, and FFmpeg-compatible media processing. Exact packages will be pinned to 4.0.508 initially.
- **Reuse:** Public APIs, supported packages, Player, renderer, composition conventions, and official examples within their terms.
- **Learn only:** Internal monorepo implementation details not required for integration.
- **Avoid:** Forking or reselling Remotion, relying on undocumented internals, assuming a permanent license price, or coupling domain schemas directly to Remotion components.
- **Recommendation:** Adopt as the primary renderer behind `RenderProvider`. Record version and license tier in deployment configuration.

Sources: [repository](https://github.com/remotion-dev/remotion), [v4.0.508 release](https://github.com/remotion-dev/remotion/releases/tag/v4.0.508), [license file](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md), [current commercial licensing](https://www.remotion.pro/license).

## 2. Official Remotion Agent Skills

- **Repository:** https://github.com/remotion-dev/skills
- **Purpose:** Agent-readable guidance for creating, editing, captioning, rendering, previewing, and operating Remotion projects.
- **Current release/activity:** Synced with Remotion 4.0.508 on 2026-08-11. The package is private/unpublished as `@remotion/skills`; the repository has no independent GitHub release stream.
- **Architecture:** A router skill with smaller domain skills for markup, captions, multimedia, rendering, SaaS integration, Studio, maps, interactivity, upgrades, and related references. This limits context loading by routing to focused documents.
- **Useful concepts:** Progressive documentation loading, separate creation/render/preview guidance, explicit render-stability rules, and local reference material instead of repeatedly injecting the full framework documentation.
- **License:** No standalone license file was found in the skills repository. Its package points back to the main Remotion monorepo.
- **Commercial-use implications:** Use as operational documentation. Do not copy substantial skill prose, assets, or code into MotionKnowledge unless its governing license is confirmed.
- **Dependencies:** Skill documents; development examples refer to Remotion packages, React, shapes, Three.js, Lottie, and Google Fonts.
- **Reuse:** Install or reference the official skills for development after reviewing their contents and pinning the resolved commit.
- **Learn only:** Routing structure and documentation decomposition.
- **Avoid:** Making the skill package a runtime dependency, executing broad setup scripts blindly, or copying unlicensed assets.
- **Recommendation:** Use the already available official Remotion skills during implementation and record the upstream commit in development documentation.

Source: [repository](https://github.com/remotion-dev/skills).

## 3. HyperFrames

- **Repository:** https://github.com/heygen-com/hyperframes
- **Purpose:** Deterministic HTML/CSS/media/animation-to-MP4 framework designed for agent-authored video.
- **Current release/activity:** v0.7.107, published 2026-08-11; highly active, with roughly 40,000 stars on the research date.
- **Architecture:** Bun/TypeScript monorepo with core runtime, engine, producer, player, studio, parsers, linting, CLI, SDK, registry, and deployment adapters for AWS Lambda and Google Cloud Run. HTML timing attributes and seekable animation timelines are the source of truth.
- **Useful concepts:** Seek-safe animation contracts, lint/inspect/snapshot/render loop, self-contained compositions, component/block registry, schema-driven variables, frozen local media, SDK embedding, and cloud render planning.
- **License:** Apache-2.0, copyright 2026 HeyGen, Inc.
- **Commercial-use implications:** Commercial use and modification are permitted subject to Apache-2.0 notice, license, patent, and trademark conditions. Any copied or modified material must be tracked in `THIRD_PARTY_NOTICES.md`.
- **Dependencies/capabilities:** Node 22+, Bun for repository development, FFmpeg, browser rendering, GSAP and other optional animation runtimes, and a large package surface.
- **Reuse:** Public CLI/SDK packages and selected registry components only after dependency and asset-license review. Prefer invoking the adapter as a process/container boundary.
- **Learn only:** Broad registry organization and agent production loop where direct dependency is unnecessary.
- **Avoid:** Making all scenes depend on HyperFrames; running generated HTML with network, credentials, or host access; pulling the entire registry without reviewing individual assets; using HeyGen branding.
- **Recommendation:** Adopt as an optional specialist renderer. The main video remains a Remotion composition that consumes validated HyperFrames output as a frozen asset.

Sources: [repository](https://github.com/heygen-com/hyperframes), [v0.7.107 release](https://github.com/heygen-com/hyperframes/releases/tag/v0.7.107), [license](https://github.com/heygen-com/hyperframes/blob/main/LICENSE), [documentation](https://hyperframes.heygen.com/).

## 4. Official HyperFrames Skills

- **Repository location:** `skills/` within https://github.com/heygen-com/hyperframes
- **Purpose:** Nineteen agent skills covering routing, explainers, product video, general video, animation, keyframes, creative direction, CLI operations, media, registry, captions, and migration.
- **Current command:** The upstream README recommends `npx skills add heygen-com/hyperframes --full-depth` for interactive selection or `npx hyperframes skills update` for the core set in non-interactive use. The command must be pinned or resolved to a reviewed commit before execution.
- **Architecture:** A small router loads creation workflows and atomic domain skills on demand. The `faceless-explainer` workflow is closest to MotionKnowledge, but its output remains free-form HTML rather than MotionKnowledge's structured scene registry.
- **License:** Distributed within the Apache-2.0 repository; individual third-party assets still require review.
- **Commercial-use implications:** Skill use is permitted under the repository license, but generated media and pulled registry items may carry separate obligations.
- **Reuse:** Development guidance, linting, validation, and adapter smoke-test workflow.
- **Learn only:** Intent routing and progressive skill loading.
- **Avoid:** Installing all 19 skills without need, treating skills as trusted executable code, or allowing them to bypass product schemas and sandbox policy.
- **Recommendation:** Install the core set only after recording the reviewed SHA and inspecting package lifecycle scripts.

Source: [HyperFrames README](https://github.com/heygen-com/hyperframes/blob/main/README.md).

## 5. HyperFrames Production Examples and Showcase

- **Repository/showcase:** [showcase](https://hyperframes.heygen.com/showcase), [registry examples](https://github.com/heygen-com/hyperframes/tree/main/registry/examples), [ADOPTERS.md](https://github.com/heygen-com/hyperframes/blob/main/ADOPTERS.md).
- **Current adopters:** HeyGen reports production use across its video product; tldraw uses it for narrated PR walkthroughs; reap.video uses it for agent-first clipping/editing; Typeframe uses word-timed caption videos; OpenMAIC exports interactive classrooms. TanStack and OptinMonster are described as evaluating it.
- **Representative examples:** data-heavy New York Times-style charts, decision trees, kinetic typography, product promos, pitch decks, Swiss-grid compositions, caption layouts, and code/editor visuals.
- **Useful concepts:** Treat examples as executable visual QA fixtures; require registry metadata and standalone demos; separate interactive preview from render entry points.
- **Commercial-use implications:** Apache-2.0 covers repository code, but fonts, images, music, logos, and example content may have independent terms. Never bulk-copy examples into a proprietary catalog.
- **Recommendation:** Rebuild product-specific visuals independently. Reuse an upstream example only after an item-level dependency and asset audit.

## 6. Video Podcast Maker

- **Repository:** https://github.com/Agents365-ai/video-podcast-maker
- **Purpose:** Agent-operated topic-to-video-podcast pipeline covering research, script, multi-provider TTS, timing, Remotion templates, captions, audio mixing, and publishing support.
- **Current release/activity:** v5.2.1, published 2026-08-01; active in August 2026.
- **Architecture:** A large Agent Skill with Python and TypeScript scripts, preferences, templates, reusable components, provider-specific TTS helpers, timing/alignment utilities, assets, and verification tests.
- **Useful concepts:** Stage checkpoints, preference files, TTS abstraction, audio-derived timing, reusable visual blocks, smoke renders, and automated output verification.
- **License:** The repository `LICENSE` file is CC BY-NC 4.0. GitHub/search summaries that say MIT are inconsistent and must not be relied on. The file-level license controls the commercial risk decision.
- **Commercial-use implications:** Non-commercial restriction makes copying, adapting, embedding, or deriving its expressive code, templates, prompts, assets, or skill contents unacceptable for this commercial SaaS without separate written permission.
- **Dependencies:** Python scripts, Node/TypeScript Remotion templates, multiple TTS providers, FFmpeg, and included media assets.
- **Reuse:** None by default.
- **Learn only:** Publicly observable high-level workflow facts: separate research/script/TTS/render stages, audio-timing verification, and scene/component reuse.
- **Avoid:** Code, templates, prompts, assets, preference schemas, tests, or close structural translation.
- **Recommendation:** Maintain a clean-room boundary. Do not add it as a dependency or install its skill.

Sources: [repository](https://github.com/Agents365-ai/video-podcast-maker), [v5.2.1 release](https://github.com/Agents365-ai/video-podcast-maker/releases/tag/v5.2.1), [license](https://github.com/Agents365-ai/video-podcast-maker/blob/main/LICENSE).

## 7. Open Design

- **Repository:** https://github.com/nexu-io/open-design
- **Purpose:** Agent-driven local design studio producing HTML, decks, images, and HyperFrames video from reusable design systems.
- **Current release/activity:** Created in April 2026 and very active by August 2026.
- **Architecture:** Local-first desktop/daemon product with skills, plugins, `DESIGN.md` contracts, sandboxed iframe previews, model adapters, and multi-artifact export.
- **Useful concepts:** A brand contract shared across outputs, sandboxed artifact previews, explicit provider adapters, and a studio organized around projects rather than prompts.
- **License:** Apache-2.0 according to repository metadata and license badge; verify the exact version before any direct reuse.
- **Commercial-use implications:** Compatible in principle with proprietary use when notices and third-party dependencies are honored.
- **Reuse:** No initial code dependency is necessary.
- **Learn only:** Design-contract and sandbox patterns.
- **Avoid:** Importing its broad plugin/runtime surface into a focused video product.
- **Recommendation:** Adopt the concept of a versioned frame/design contract, implemented independently in MotionKnowledge themes.

## 8. OpenMontage

- **Repository:** https://github.com/calesthio/OpenMontage
- **Purpose:** Agentic video-production system with many pipelines, tools, skills, and production stages.
- **Current release/activity:** Created in March 2026 and active through August 2026.
- **Architecture:** Pipeline definitions, stage-director skills, tool registry, and production knowledge spanning multiple forms of video work.
- **Useful concepts:** Explicit pipeline definitions, tool discovery, stage ownership, and production checklists.
- **License:** AGPL-3.0 according to repository metadata.
- **Commercial-use implications:** Network use and modification obligations make code reuse inappropriate for a proprietary SaaS without legal review or a separate license.
- **Reuse:** None.
- **Learn only:** Public high-level orchestration patterns.
- **Avoid:** Dependency, code copying, skill copying, or close adaptation.
- **Recommendation:** Exclude from the implementation dependency graph.

## 9. Jellyfish

- **Repository:** https://github.com/Forget-C/Jellyfish
- **Purpose:** End-to-end production workspace for AI-generated short dramas.
- **Current release/activity:** Created in March 2026 and active through July 2026.
- **Architecture:** React/Vite front end, FastAPI back end, structured scripts/shots/entities/assets, async task center, provider models, prompts, and media management.
- **Useful concepts:** Candidate confirmation before generation, explicit readiness states, entity/asset reuse, and context-linked async job navigation.
- **License:** Apache-2.0.
- **Commercial-use implications:** Permissive with notices, but its entertainment workflow is not a direct fit.
- **Reuse:** No initial dependency.
- **Learn only:** Versioned candidate-confirmation and job-status UX.
- **Avoid:** Character/shot abstractions that would distort an educational scene model.
- **Recommendation:** Independently implement the useful review-state patterns around claims and scenes.

## 10. Video Explainer System

- **Repository:** https://github.com/prajwal-y/video_explainer
- **Purpose:** The closest public codebase found for turning technical documents, Markdown, and URLs into narrated programmatic explainer videos.
- **Current release/activity:** Created 2025-12-28; last source push 2026-02-24; about 217 stars, 70 forks, and 150 commits when inspected on 2026-08-12. It has no tagged release and has not received source commits for roughly five and a half months.
- **Architecture:** Python pipeline for ingestion, understanding, planning, script, narration, TTS, storyboard, fact checking, scene generation, refinement, sound, sync, and shorts, paired with a TypeScript/React Remotion project. It reports 1,192 Python tests and 203 JavaScript tests. TTS precedes storyboard generation so the storyboard can use real word timings.
- **Useful concepts:** Separate source understanding from scripting; use audio-derived timing; keep a storyboard schema; support resumable stage execution; fact-check against supplied sources; run iterative visual inspection and feedback; keep project outputs self-contained.
- **License:** No root license file or declared GitHub license was present at inspection time.
- **Commercial-use implications:** No code, prompts, tests, schemas, components, or documentation may be copied into MotionKnowledge without the copyright holder granting a commercial license. Publicly observable workflow facts may inform a clean-room implementation.
- **Dependencies:** Python 3.10+, Node 20+, Remotion, FFmpeg, Claude/OpenAI adapters, ElevenLabs, Edge TTS, Whisper, and MusicGen-related tooling.
- **Reuse:** None unless a suitable license is added and reviewed.
- **Learn only:** Pipeline ordering, stage restart ergonomics, real-audio timing, refinement passes, and source fact-checking.
- **Avoid:** Its generated-React-scene approach, which conflicts with MotionKnowledge's schema-first reusable component principle; its Edge TTS path without a terms review; and any unlicensed implementation material.
- **Recommendation:** Treat as the closest conceptual reference, but not as a dependency or code source. MotionKnowledge's typed visual registry, SaaS tenancy, provenance, cost ledger, and background-job architecture remain materially different.

Source: [repository](https://github.com/prajwal-y/video_explainer).

## 11. Remotion Prompt-to-Motion-Graphics SaaS Template

- **Repository:** https://github.com/remotion-dev/template-prompt-to-motion-graphics-saas
- **Purpose:** Official Remotion template for a prompt-driven motion-graphics web application with live preview and optional cloud rendering.
- **Current release/activity:** Created 2025-12-17 and last pushed 2026-08-04. Its dependencies include Next.js 16.2.11, React 19.2.1, AI SDK 5, Remotion, Lambda, Player, web renderer, Monaco, Babel, Three.js, and Zod.
- **Architecture:** `prompt -> validation -> skill detection -> code generation -> sanitization -> in-browser compilation -> live Player preview`, with API routes for generation and Lambda render/progress. Skills inject only relevant chart, typography, sequencing, transition, social, spring, and 3D guidance.
- **Useful concepts:** Cheap prompt classification before expensive calls; contextual skill selection; streaming generation UX; automatic compile-error correction; render-progress polling; and version-matched Next.js/Remotion integration.
- **License:** No separate license file was present. The README points users to the special Remotion license.
- **Commercial-use implications:** Treat all template use as governed by Remotion's current terms unless Remotion confirms otherwise. A MotionKnowledge production deployment falls under the automation application category.
- **Dependencies:** Next.js 16.2.11, React 19.2.1, TypeScript 5.9, Zod 4.4, AI SDK 5, OpenAI adapter, Babel standalone, Monaco, and multiple Remotion packages.
- **Reuse:** Supported integration patterns may be followed within the Remotion license. Exact template code reuse requires confirming its terms.
- **Learn only:** Validation, skill routing, live preview, error correction, and Lambda progress patterns.
- **Avoid:** Generating and compiling an entire React composition for every project. That architecture is appropriate for open-ended motion experiments but conflicts with MotionKnowledge's deterministic catalog and security model.
- **Recommendation:** Use as the freshest official SaaS integration reference, not as the product foundation.

Source: [repository](https://github.com/remotion-dev/template-prompt-to-motion-graphics-saas).

## 12. IBM chuk-motion

- **Repository:** https://github.com/IBM/chuk-motion
- **Purpose:** Design-system-first Remotion MCP server exposing reusable video components and a track-based timeline to agents.
- **Current release/activity:** v0.2.1 in its package metadata; created 2025-10-14 and last source push 2026-02-16. The repository was still maintained administratively in July 2026 but had modest adoption.
- **Architecture:** Python MCP server and project manager generate Remotion projects from Pydantic-validated tools. The documented catalog contains 51 components covering charts, scenes, overlays, code, layouts, text animation, demo frames, content, and transitions, backed by centralized design tokens and safe margins.
- **Useful concepts:** Agent-facing tools should map to bounded component schemas; design tokens should control all components; timelines can expose explicit tracks and gaps; preview fixtures can exercise the whole catalog.
- **License:** Apache-2.0.
- **Commercial-use implications:** Commercial reuse is possible with Apache notices and dependency review. Remotion's separate license still applies to rendered output and applications.
- **Dependencies:** Python 3.11+, Pydantic, Jinja, virtual filesystem and MCP packages, generated Node/Remotion projects, plus repository tests and examples.
- **Reuse:** Consider selected design-token and tool-schema ideas. Direct code adoption is unnecessary because MotionKnowledge is TypeScript-first and needs different domain schemas.
- **Learn only:** Catalog breadth, MCP/tool ergonomics, safe-margin tokens, and component demonstration strategy.
- **Avoid:** Introducing a Python control plane solely to match this project or exposing low-level component construction directly to end users.
- **Recommendation:** Use as the strongest public component-library reference alongside HyperFrames' registry, while implementing MotionKnowledge's library independently in TypeScript.

Source: [repository](https://github.com/IBM/chuk-motion).

## 13. Remotion MCP App

- **Repository:** https://github.com/mcp-use/remotion-mcp-app
- **Purpose:** AI-authored Remotion compositions with an embedded live Player and in-place conversational editing.
- **Current release/activity:** v1.0.0 package; created 2026-02-11 and last pushed 2026-08-06.
- **Architecture:** A model-visible `create_video` tool compiles virtual React/Remotion files with esbuild and returns a bundle to an embedded Player. A mounted-view `update_video` tool merges changed files and swaps the preview without remounting a second artifact.
- **Useful concepts:** Incremental preview updates, isolated per-session project state, a single initial tool plus contextual edit tool, and immediate compile diagnostics.
- **License:** MIT, with Remotion separately licensed. The repository states that some rule tools were adapted from Remotion skills, whose standalone licensing remains unclear.
- **Commercial-use implications:** Core MIT code is permissive, but adapted skill prose and Remotion use need separate review.
- **Dependencies:** Node 22, MCP Use, esbuild, React 19, Remotion 4.0.505, Zod, PostHog, and shader UI packages.
- **Reuse:** No direct dependency is required.
- **Learn only:** Fast incremental preview and contextual edit-tool interaction.
- **Avoid:** Accepting arbitrary user/model source code in the primary product renderer. MotionKnowledge edits validated scene specifications instead.
- **Recommendation:** Apply its incremental-preview lesson at the scene-spec level, not by adopting arbitrary source compilation.

Source: [repository](https://github.com/mcp-use/remotion-mcp-app).

## 14. Coverage Verdict

No single public repository satisfies MotionKnowledge's complete product shape. The most relevant references serve different layers:

| Question | Strongest current reference | Finding |
|---|---|---|
| Most advanced deterministic renderer | HyperFrames | Deepest modern HTML/animation renderer, registry, linting, SDK, and cloud examples; Apache-2.0. |
| Most mature primary timeline ecosystem | Remotion | Best React Player/composition/rendering ecosystem; special commercial automation license. |
| Closest end-to-end explainer pipeline | `prajwal-y/video_explainer` | Broad document-to-explainer pipeline and tests, but stale since February 2026, not a SaaS, and unlicensed. |
| Freshest official prompt-video SaaS pattern | Remotion prompt-to-motion-graphics template | Current Next.js 16.2 integration and streaming preview, but deliberately generates whole compositions. |
| Strongest public reusable visual catalog | IBM chuk-motion | 51 documented components, typed tools, design tokens, and Apache-2.0 licensing. |
| Broadest agentic production system | OpenMontage | Very large workflow surface, but AGPL-3.0 and much broader than educational explanation. |
| Best live conversational preview pattern | Remotion MCP App | Incremental in-chat preview/edit loop, but based on arbitrary generated source. |

The recommended MotionKnowledge design remains a synthesis rather than a fork: Remotion for the primary timeline, HyperFrames for sandboxed specialist output, a clean-room source-to-storyboard pipeline, and an independently implemented typed visual catalog informed by public patterns.

## 15. Technology Conclusions

### Adopt

- Next.js 16.2 LTS rather than the 16.3 preview.
- React 19, TypeScript, Node 24, pnpm, and Turborepo.
- Supabase Postgres/Auth/Storage with explicit RLS and private buckets.
- Drizzle with checked-in SQL migrations; use stable versions rather than the 1.0 release candidate unless it becomes stable during implementation.
- pg-boss as the minimal durable Postgres-backed queue.
- Google Cloud TTS for economical speech and SSML timepoints.
- ElevenLabs for premium timestamped speech.

### Re-evaluate before production

- Remotion commercial terms and appropriate Automators tier.
- Exact storage economics between Supabase Storage and Cloudflare R2.
- Whether HyperFrames has stabilized sufficiently for production specialist renders.
- Current stable Drizzle version and migration/RLS behavior.
- TTS voice/model pricing and commercial output rights.

## 16. Clean-Room Rules

1. Record the repository, commit, license, and asset origin before copying any upstream material.
2. Do not copy from ambiguous, missing-license, non-commercial, or AGPL sources into the proprietary product.
3. High-level facts, ideas, and workflows may inform independent code; expressive implementation, prompts, templates, and media may not.
4. Keep third-party code changes isolated and auditable.
5. Maintain `THIRD_PARTY_NOTICES.md` from the first dependency installation.
6. Recheck licenses at every significant version upgrade.
