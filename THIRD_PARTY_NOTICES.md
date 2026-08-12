# THIRD-PARTY NOTICES

MotionKnowledge is a private, proprietary product and ships no open-source
license. The material below is adopted from third parties and is used in
accordance with its licenses. This file records every adopted package with
license obligations as required by the reuse-first policy (ADR 0005).

## Adopted packages (installed as dependencies)

| Package | Version | License | Origin / notes |
| --- | --- | --- | --- |
| turbo | 2.10.9 | MIT | Vercel; monorepo task runner |
| typescript | 5.9.3 | Apache-2.0 | Microsoft |
| vitest | 4.1.10 | MIT | test runner |
| zod | 4.4.3 | MIT | schema validation |
| drizzle-orm | 0.45.2 | Apache-2.0 | ORM for PostgreSQL |
| drizzle-kit | 0.31.10 | Apache-2.0 | migrations tooling |
| postgres | 3.4.9 | Unlicense | porsager/postgres driver |
| @supabase/supabase-js | 2.112.3 | MIT | Supabase client |
| @aws-sdk/client-s3 | 3.1108.0 | Apache-2.0 | S3-compatible storage client |
| @aws-sdk/s3-request-presigner | 3.1108.0 | Apache-2.0 | signed URLs |
| pg-boss | 12.27.0 | MIT | Postgres-backed job queue |
| @types/node | 24.10.1 | MIT | type definitions |
| react / react-dom | 19.2.8 | MIT | UI runtime |
| @types/react / @types/react-dom | 19.2.14 / 19.2.3 | MIT | type definitions |
| remotion | 4.0.508 | Remotion License (source-available) | composition and rendering engine; see Render licensing below |

Notices for packages adopted in later tasks are appended as they are added.

## Render licensing

- **Remotion** uses a special source-available license (Remotion License).
  MotionKnowledge is an automation/video-creation application; it must
  budget for the Remotion Automators plan ($0.01 per render, $100 monthly
  minimum) when it no longer qualifies for the free small-entity terms.
  Terms are rechecked before production launch. No Remotion code is copied
  into this repository; Remotion is consumed as a published package.
- **HyperFrames 0.7.107** is Apache-2.0 (HeyGen). Reuse preserves required
  notices and avoids HeyGen trademarks. See NOTICE in docker/hyperframes/.
  The MotionKnowledge adapter does not copy HyperFrames source; it defines a
  bounded `HyperFrameRequest` contract and runs specialist HTML/SVG scenes in
  a sandboxed container built on chromium + FFmpeg (Apache-2.0/MIT toolchain,
  Alpine packages). The npm package integrity for hyperframes@0.7.107 was
  inspected at adoption: sha512-n42AOFT4j/DLhmg4pNODJ7Xw43/FHeSjtAPcN/Zz0pOzlj+ZKUf7eJAasluX3zCy46TJORJygSvu6XNh+2d7Zg==
- **Video Podcast Maker** (Agents365-ai/video-podcast-maker, CC BY-NC 4.0)
  is NOT reused in any form. Only high-level workflow facts informed an
  independent implementation; no code, templates, prompts, or media are
  copied, modified, embedded, or derived.
- The separate **Remotion skills repository** publishes no standalone
  license. Its prose is treated as documentation only and is not copied.
- **IBM chuk-motion** is not copied; only its public catalog structure was
  reviewed for registry design. Any IBM-contributed component source remains
  their copyright and is not included.

## Reuse decisions recorded (ADR 0005)

- **Visual components**: the deterministic visual library is independently
  implemented MotionKnowledge code built on the Remotion public API. The
  Remotion `shapes`/`effects` APIs and the public catalog structure of IBM
  chuk-motion were reviewed for registry design; no IBM component source is
  copied (see Prohibited reuse). HyperFrames registry metadata informed the
  machine-readable catalog shape only.
- **Drag and drop in the editor**: @dnd-kit (MIT) is adopted in the web
  editor instead of custom drag infrastructure (recorded at adoption).

## Prohibited reuse

- prajwal-y/video_explainer (no license): not used.
- OpenMontage (AGPL-3.0): not used.
