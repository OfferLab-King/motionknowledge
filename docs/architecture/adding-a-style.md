# Adding a Seventh Style — Extension Guide

This document is the extension contract for the style system. Following it, a
new style can be added **without modifying any pipeline stage, schema, worker
handler, web page, or existing component**.

Read `docs/architecture/style-template-format-system.md` first for the
concepts.

## 1. The one-file rule

A style is defined in a single file:
`packages/visual-library/src/style/styles.ts`. Add a `VisualStylePack`:

```ts
export const myStyle: VisualStylePack = {
  id: 'my-style',                       // unique, kebab-case
  name: 'My Style',
  description: 'One sentence on what it looks like and when to use it.',
  tags: ['tag-a', 'tag-b'],
  version: 1,                            // bump when tokens change meaning
  aspectRatios: ['16:9', '9:16'],
  suitability: ['explainer', 'education'],
  motionPersonality: 'smooth springs, slide-up reveals',
  componentVariants: {'process-flow': 'polished'},
  preview: 'showcase:my-style',
  tokens: { /* full ThemeTokens; must satisfy ThemeTokenSchema */ },
};
```

The `tokens` object must satisfy `ThemeTokenSchema`
(`packages/schemas/src/style.ts`). The registry validation test
(`src/style/registry.test.ts`) verifies every registered style automatically:
metadata completeness, token validity, unique ids, deterministic resolution.

## 2. Register the style

In `packages/visual-library/src/style/registry.ts`:

```ts
export const styleRegistry = {
  signature: signatureStyle,
  ...
  'my-style': myStyle,
};

export const STYLE_ORDER = [
  ..., // add 'my-style' (order controls gallery layout)
];
```

`listStyles()`, `resolveTheme('my-style')`, `isRegisteredStyle(...)`,
`applyStyleOverrides(...)` all pick the style up automatically.

## 3. Reuse or extend the visual language

`tokens.visualLanguage` selects the treatment family. The six existing
families (`polished | hand-drawn | structured | infographic | business |
minimal`) already make every component render differently.

- **Tokens-only style** (recommended first): pick the closest existing family
  and express the difference through colours, fonts, typography, radius,
  spacing, strokes, shadows, motion, background and density. Zero component
  changes.
- **New visual language**: if the style needs its own treatment (e.g.
  `comic`), add the value to the `visualLanguage` enum in
  `packages/schemas/src/style.ts`, then extend the variant renderers:

  - `packages/visual-library/src/components/explanation.tsx` —
    `ProcessFlow` and `FlowChart` treatment switches (the reference
    components).
  - `packages/visual-library/src/components/variants.tsx` — hand-drawn
    primitives (`SketchBox`, `HandArrow`, …) that other components reuse.
  - `packages/visual-library/src/styling.tsx` — `surfaceStyle`,
    `FlowArrow`, `BulletDot`, `rootBackgroundStyle` treatment switches.
  - `packages/visual-library/src/components/typography.tsx` — `Kicker`,
    `TitleHero`, underline/highlight treatment switches.

  The rule: `if (theme.visualLanguage === '<new>')` branches are allowed
  **only** inside these variant renderers. Never in pipeline stages, schemas,
  or web UI.

## 4. Component variants (optional)

If the style should change the *rendering choice* for a semantic component
(rather than its styling), extend the `variant` machinery:

- `packages/visual-library/src/registry.ts` — add the variant name to the
  component's `variants: [...]` list (e.g. `process-flow` declares all six
  treatments).
- `packages/visual-library/src/style/registry.ts` — `applyStyleOverrides`
  merges `theme.variants[componentId]`, so a scene can force a variant.
- `packages/visual-router/src/router.ts` — the `resolveVariant` map converts a
  style id to a treatment name; extend it if the new style has a visual
  language.

## 5. Templates (optional)

To recommend the new style in the template gallery, add a template in
`packages/content-engine/src/templates.ts` with `defaultStyleId: 'my-style'`.
The template registry test validates the reference.

## 6. Verification — no manual steps needed

The following tests pick a new style up automatically:

- `packages/visual-library/src/style/registry.test.ts` — registry integrity,
  token validation, deterministic resolution, override semantics.
- `packages/visual-library/src/style/render.test.tsx` — renders **every**
  registered component under **every** style at frame 30 and asserts markup.
- `packages/remotion-engine/src/showcase.smoke.test.ts` — the style matrix:
  renders a real browser still of the showcase composition in the new style
  (16:9) plus a 9:16 still.
- `packages/content-engine/src/templates.test.ts` — template → format/style
  mapping.

To add a gallery thumbnail snapshot, extend `showcase.smoke.test.ts` with an
extra frame assertion.

## 7. What you must not touch

- `packages/schemas` (except the `visualLanguage` enum for a new family)
- `packages/content-engine` pipeline stages (lesson/script/storyboard)
- `apps/worker` handlers
- `apps/web` pages and API routes
- `packages/remotion-engine` manifest/rendering path

The style registry is the only extension point for presentation.
