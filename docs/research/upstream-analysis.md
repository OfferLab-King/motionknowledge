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

## 10. Technology Conclusions

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

## 11. Clean-Room Rules

1. Record the repository, commit, license, and asset origin before copying any upstream material.
2. Do not copy from ambiguous, missing-license, non-commercial, or AGPL sources into the proprietary product.
3. High-level facts, ideas, and workflows may inform independent code; expressive implementation, prompts, templates, and media may not.
4. Keep third-party code changes isolated and auditable.
5. Maintain `THIRD_PARTY_NOTICES.md` from the first dependency installation.
6. Recheck licenses at every significant version upgrade.
