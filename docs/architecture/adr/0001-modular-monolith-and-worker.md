# ADR 0001: Modular Monolith with Separate Worker

- **Status:** Accepted
- **Date:** 2026-08-12

## Context

MotionKnowledge needs a commercial web application and long-running media jobs, while keeping the video engine independent of authentication, billing, and marketing concerns. A microservice fleet would add deployment and data-consistency costs before scale requires it.

## Decision

Use a TypeScript monorepo containing a Next.js web application, a long-running Node worker, a development Remotion Studio, and narrowly scoped shared packages. Web and worker deploy separately but share schemas, repositories, and domain packages.

## Consequences

- Package boundaries are enforced in code and tests rather than networks.
- Rendering cannot run inside a web request.
- Web and worker can scale independently.
- A package may become a service later without changing its public contract.
- Cyclic package dependencies and direct imports across private internals are prohibited.
