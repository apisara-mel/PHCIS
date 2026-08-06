# Wizard Morph Header — Reference

## Component stack

```
App.jsx
  └── HeaderMorphRoot          → useGlobalHeaderMorph() writes CSS vars on :root

QueuePageShell
  ├── SubHeader (optional)       → onBack only; NO title when using morph header
  └── PageHeaderInfoPanel dense  → white band, overflow hidden
        └── WizardMorphHeader
              ├── StepMorphHeader dense
              │     ├── title row (+ afterTitle)
              │     └── stepArea (in-flow min-height slot)
              │           └── stepGlide (GPU translate + scale)
              └── StepProgress
```

## CSS variables (`:root`)

| Variable | Set by | Used for |
|----------|--------|----------|
| `--header-morph` | lerp animator | padding, font-size morph |
| `--header-morph-motion` | smoothstep(`--header-morph`) | stepper position, scale, title max-width |

Registered in [`src/index.css`](../../../src/index.css) via `@property` for
browser interpolation.

## Key style exports (`headerMorphStyles.js`)

| Export | Role |
|--------|------|
| `morphStepHeaderRootDenseStyle` | flex-wrap root, overflow hidden, padding morph |
| `morphStepHeaderTitleWrapDenseStyle` | title narrows as morph→1 |
| `morphStepHeaderStepAreaDenseStyle` | in-flow slot; reserves 56→48px height |
| `morphStepHeaderStepGlideDenseStyle` | absolute within slot; centre→right glide |
| `morphTopicTitleDenseStyle` | title stops at `--type-size-sm` when collapsed |

## Motion pipeline

1. `window.scrollY` → `easeHeaderMorph(scrollY / RANGE)` = target
2. RAF lerp (`LERP` gain) → `current`
3. Emit `current` as `--header-morph`, `smoothstep(current)` as `--header-morph-motion`
4. CSS `calc()` reads vars — no React re-render per frame for layout

## `QueuePageShell` props

```js
WIZARD_MORPH_SHELL_PROPS = {
  stickyHeaderInfo: true,   // header sticks under Topbar (+ SubHeader if any)
  headerInfoDense: true,    // PageHeaderInfoPanel dense padding + overflow hidden
};
```

Pass `headerInfo={<WizardMorphHeader … />}` alongside the spread.

## Anti-patterns (learned from consent wizard iteration)

| ❌ Don't | Why |
|---------|-----|
| Root-level `position: absolute` on stepper | Stepper escapes header band, overlaps body cards |
| `marginLeft: 50%` + `translateX(-50%)` on flex spacers | Bounce/jitter when scroll stops |
| Discrete layout swap (expanded/collapsed React branches) | Snaps; loses smooth micro-interaction |
| `title` on both SubHeader and WizardMorphHeader | Duplicate title chrome |
| `completedSteps` tied to live validation in header | Stepper chrome jitters while user fills fields |

**Visit-order stepper in header:** omit `completedSteps` or gate ✓ only for
steps already passed — see `ConsentWizardHeader` comment in CreateConsentFormPage.

## Files touched when extending the pattern

| File | Change type |
|------|-------------|
| `src/components/layout/WizardMorphHeader.jsx` | New wizard pages import this only |
| `src/components/layout/StepMorphHeader.jsx` | Low-level layout; prefer WizardMorphHeader |
| `src/components/layout/headerMorphStyles.js` | Shared morph math — edit once |
| `src/components/layout/PageHeaderInfoPanel.jsx` | `dense` + `overflow: hidden` |
| `src/hooks/useGlobalHeaderMorph.js` | Motion tuning |
| `src/pages/**/**Page.jsx` | Per-page: shell props + remove body stepper |
