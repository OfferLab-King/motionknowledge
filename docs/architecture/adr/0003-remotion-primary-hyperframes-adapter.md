# ADR 0003: Remotion Primary, HyperFrames by Adapter

- **Status:** Accepted
- **Date:** 2026-08-12

## Context

Remotion provides the strongest React timeline, preview, audio, and composition primitives. HyperFrames provides flexible seekable browser animation but expands the attack and dependency surface when HTML is generated dynamically.

## Decision

Remotion 4.0.508 owns the project timeline, Player preview, audio, captions, transitions, and final render. HyperFrames 0.7.107 is optional and accessed only through a bounded adapter that returns frozen, validated media. Generated HTML runs without credentials or unrestricted network/host access.

## Consequences

- Standard videos never require HyperFrames.
- Specialist scenes can use SVG, GSAP, Three.js, or browser-native techniques.
- HyperFrames output is cached by an input and dependency hash.
- MotionKnowledge must comply with Remotion's commercial automation terms and Apache-2.0 notices for reused HyperFrames material.
