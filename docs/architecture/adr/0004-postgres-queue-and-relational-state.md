# ADR 0004: PostgreSQL Queue and Relational Pipeline State

- **Status:** Accepted
- **Date:** 2026-08-12

## Context

The product needs durable, retryable generation and render jobs but does not need Kafka or a separate Redis service. Tenant ownership, status, versions, and costs require relational integrity.

## Decision

Use Supabase PostgreSQL for application data and pg-boss for background jobs. Store business relationships relationally. Store validated pipeline payloads in immutable JSONB version rows. Every job has an idempotency key, normalized input hash, retry metadata, and correlation identifiers.

## Consequences

- A single managed database supports transactions, RLS, and jobs.
- Worker polling and job tables contribute database load and must be monitored.
- Queue handlers promote outputs transactionally and are safe to retry.
- A dedicated queue can replace pg-boss later behind the job interface if scale requires it.
