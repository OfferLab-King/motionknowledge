# ADR 0006: Format, Template and Style Architecture

- **Status:** Accepted
- **Date:** 2026-08-13
- **Supersedes parts of:** ADR 0002 (schema-first pipeline) — visual planning
  gains a style/format dimension

## Context

The product produces one recognisable visual style. Projects carry a free-form
`style` string that only reaches one prompt line; storyboard theme tokens are
discarded at render time; no template or format concept exists. The product
must become a multi-style visual explanation platform without forking the
semantic visual library.

## Decision

1. **Separate format, template, and style.** Format = pedagogical structure
   (planning grammar), template = curated starting point, style = presentation
   language. They are registered, machine-readable configuration.
2. **Single source of truth for tokens.** `StyleTokenSchema` in
   `packages/schemas` defines the wire format; `Theme` in visual-library is its
   inferred type. `RenderManifestV1.theme` carries full tokens; `style`
   carries `{styleId, styleVersion}`.
3. **Deterministic style application.** The manifest builder resolves tokens
   from the style registry; `SceneRenderer` merges per-scene overrides
   (`SceneV1.styleOverride`). The browser Player and worker renders share the
   same resolution, so preview === final.
4. **Variant renderers over duplicated components.** Components switch
   treatment on `theme.visualLanguage` and reuse token-driven primitives.
5. **Research stays style-independent.** Only the storyboard stage is
   style/format aware, and it reasons about semantic intents, not visual code.
6. **Deterministic style previews.** A fixed `StyleShowcase` composition
   demonstrates one sample concept in every style; no AI call per preview.
7. **Versioned styles, immutable scene payloads.** Style changes bump
   `style_version`; scene overrides live in immutable `scene_versions.payload`,
   so old projects render identically.

## Consequences

- New styles are additive: registry entry + optional variant renderer + matrix
  test. No pipeline-stage edits.
- Persisted manifests/storyboards remain parseable (defaulted fields).
- The visual router becomes production code: semantic intent + style →
  registered component.
- HyperFrames remains a specialist fallback, not the default path to variety.
- All style-specific rendering knowledge lives in the style registry and
  component variant renderers; `if (style === ...)` conditionals are confined
  to those two places.
