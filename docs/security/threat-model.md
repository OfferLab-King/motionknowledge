# Security threat model

## Assets and trust boundaries

- **AuthN**: Supabase Auth (email/password). The application never stores password material.
  Server code always re-derives the user from the validated session; client-supplied identity or
  workspace fields are never trusted.
- **AuthZ**: two layers — Postgres RLS for browser-accessible tables (workspace membership
  subqueries) and explicit server-side workspace checks on every service-role operation. The
  cross-tenant denial test (`packages/database/src/rls.integration.test.ts`) and the browser
  tenant-isolation test (`apps/web/e2e/tenant-isolation.spec.ts`) guard this invariant.
- **Workspace isolation**: every tenant-owned table resolves to `workspace_id`. Downloads resolve
  render → project → workspace → membership before any bytes are served; cross-workspace requests
  return 404.

## Untrusted input

- **Uploads**: allowlisted types (sniffed with file-type, never extensions), bounded sizes,
  active-HTML stripping, SVG/script rejection.
- **URLs**: SSRF protection blocks loopback, private, link-local, metadata (169.254.169.254),
  multicast, unspecified, and broadcast destinations; DNS is resolved before and after redirects;
  redirects are capped at 3; response bytes are capped.
- **Prompt injection**: source text is wrapped as untrusted data and cannot modify system
  instructions; provider output is parsed at the boundary and invalid output is never promoted.
- **Fabricated citations**: claims must cite known sources; unknown source IDs are rejected.

## Rendering

- The main application origin never executes SVG/HTML from sources. Specialist scenes render only
  inside the sandboxed container (no network, no credentials, read-only root, resource and
  pid limits, timeout).
- Render workers consume immutable manifests only; they never query mutable editor state after
  starting. Outputs are ffprobe-validated and content-addressed.

## Secrets

- Workers receive narrowly scoped credentials via environment; log serializers redact
  token/secret/authorization/cookie/password keys. No API keys or private keys are committed
  (the secret scan in CI greps for `sk-`, `AKIA`, and `BEGIN PRIVATE KEY`).

## Downloads

- Downloads are short-lived signed URLs (HMAC over object key + expiry, 5 minutes), bound to
  workspace membership at issuance and signature-verified at serving time.

## Session and cookies

- Supabase SSR session cookies are HTTP-only and SameSite=Lax; server actions validate the session
  before any mutation; the middleware refreshes sessions on navigation.

## Test coverage (risk-based)

| Risk | Test |
| --- | --- |
| Cross-tenant read/write | rls.integration.test.ts, tenant-isolation.spec.ts |
| Signed download expiry/ownership | tenant-isolation.spec.ts |
| SSRF destination classes | research/src/ssrf.test.ts |
| Hostile source instructions | claims.test.ts (rejects fabricated citations) |
| Upload content sniffing | research/src/ingest/sniff.ts (unit behavior) |
| Render sandbox flags | hyperframes-adapter adapter.test.ts |
| Provider output normalization | tts/contract.test.ts, providers/provider-contract.test.ts |
| Idempotent jobs | jobs/idempotency.integration.test.ts |
| Scene-local regeneration | editor-regeneration.spec.ts, dcf.e2e.test.ts |
| Real media output | remotion-engine render.smoke.test.ts, dcf.e2e.test.ts |
