# ADR 0002: Schema-First Explanation Pipeline

- **Status:** Accepted
- **Date:** 2026-08-12

## Context

Generating whole React or HTML videos from a model is costly, inconsistent, unsafe, and difficult to edit. The product requires reproducible stages, source traceability, and scene-level regeneration.

## Decision

Models produce versioned Zod artifacts for claims, lesson plans, scripts, storyboards, scenes, assets, TTS, captions, renders, and QA. Reusable components consume validated scene specifications. Active artifacts point to immutable versions.

## Consequences

- Invalid provider output never reaches rendering.
- Schema migrations and compatibility readers are required.
- Generation prompts can remain small because they inspect the visual catalog rather than component source.
- Scene hashes enable precise caching and regeneration.
- Novel visuals require either a new registered component or the sandboxed specialist-render path.
