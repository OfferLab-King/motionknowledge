# ADR 0005: Reuse-First Engineering and Risk-Based Testing

- **Status:** Accepted
- **Date:** 2026-08-12

## Context

MotionKnowledge spans ingestion, AI providers, media processing, visual components, rendering, storage, jobs, and a SaaS editor. Rebuilding working infrastructure wastes implementation time and tokens. Exhaustive low-value tests create similar cost without materially reducing product risk.

## Decision

Before building a substantial subsystem or visual primitive, inspect current working upstream projects and supported packages. Adopt commercially compatible, maintained implementations through stable public APIs when that is simpler than independent code. Record the exact source, version, license, modifications, assets, and notices. Do not reuse code with missing, ambiguous, non-commercial, copyleft-incompatible, or otherwise unsuitable terms.

Testing is proportional to risk. Tests protect domain invariants, tenant isolation, hostile-input boundaries, usage/cost calculations, idempotent jobs, provider normalization, scene regeneration, and real media output. Framework behavior, static presentation, simple wrappers, and repeated component variants are not re-tested.

## Consequences

- Implementation plans must include a build-versus-adopt check for each substantial task.
- `THIRD_PARTY_NOTICES.md` and dependency review begin with the first adopted package.
- Core product differentiation remains owned code even when infrastructure is reused.
- Test count and coverage percentage are not success metrics.
- Every new test names the failure or invariant it protects.
- A short render smoke test and focused end-to-end DCF acceptance flow replace large render suites.
