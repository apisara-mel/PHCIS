---
name: sync-mih-component
description: >-
  Syncs MIH Design System Figma components into vibe code — renames layers for
  AI readability, aliases every dimension/color to design.md tokens, implements
  or updates React components, and updates design.md §6 + ComponentsLibraryPage.
  Use when the user asks to check/update DS components, sync a Figma component
  into code, add a new Foundation/Popup/Card/Table component, or keep vibe code
  in sync with MIH Design System without repeating instructions each time.
---

# Sync MIH Design System → Vibe Code

Bring a Figma DS component into (or update in) this repo **without re-asking** for the same rules. Always: rename layers → alias tokens → ship code + docs.

**Not this skill:** full screen prototypes → [prototype-from-figma](../prototype-from-figma/SKILL.md). Drawing assembled UI in Figma → [drawing-ui-on-figma](../drawing-ui-on-figma/SKILL.md). Domain UX flows → [ux-ui-designer](../ux-ui-designer/SKILL.md).

## Hard rules (always)

1. **Rename layers** so AI/`get_metadata` can read intent (grammar below). Confirm before writing to a published library file.
2. **Alias every dimension and color** from [`design.md`](../../../design.md) / [`src/index.css`](../../../src/index.css) — never hardcode `8`, `16px`, `#007549`, etc. Gradients only may be inline.
3. **Create or update** the React component **and** related docs (`design.md` §6, `ComponentsLibraryPage`, component docblock).

Also enforce repo AGENTS.md: tokens-only, Material Symbols via `<Icon>`/`<Sym>` (else Lucide), chrome-free inputs when wrapping native controls.

## Prerequisites

1. Load **figma-use** before any `use_figma` write.
2. Source Figma URL (Foundation / Popup / Card / Table / Design Template) — see [REFERENCE.md](REFERENCE.md).
3. Optional: existing vibe-code path if updating (`src/components/...`).

## Workflow checklist

```
Sync MIH component:
- [ ] 1. Scope — new vs update; Figma fileKey + nodeId; target PascalCase name
- [ ] 2. Rename layers — plan → user confirm → use_figma → validate-layers
- [ ] 3. Extract — get_design_context + get_screenshot + get_variable_defs
- [ ] 4. Token map — find-token.mjs every px/hex; add missing tokens if needed
- [ ] 5. Code — create/update src/components/... (props + variants + states)
- [ ] 6. Docs — design.md §6 + ComponentsLibraryPage + file header Figma link
- [ ] 7. Verify — demo on /components/<slug>; no literal drift
```

### 1. Scope

| Question | Action |
|----------|--------|
| New or update? | Grep `src/components/**` + `ComponentsLibraryPage` for same name (case-insensitive) |
| Which library? | Foundation / Popup / Card / Table / Template — [REFERENCE.md](REFERENCE.md) |
| Component name | Exact PascalCase for code + Figma layer (e.g. `BrandDashedAddButton`) |
| Variants | style × size × state from Figma component set |

If an existing component is a close alias, **extend it** instead of forking a second style.

### 2. Rename layers  [req 1]

AI cannot reliably map `Frame 427` → code. Rename via `use_figma`:

| Layer | Name |
|-------|------|
| Component set / main | Exact React name: `BrandButton` |
| Variant | `<Name> · <Prop>=<Value>` or Figma property panel labels kept consistent |
| Internal region | `Section/<Part>` (e.g. `Section/LeadingIcon`) |
| Label text | `label:<slug>` |
| Dynamic slot | `data:<field>` |
| Annotation | `note:<slug>` |
| Intentional DS-only (no code yet) | keep as component name — code catches up in step 5 |

Show **old → new** rename plan; get confirmation before mutating published DS files. Then:

```bash
# save get_metadata JSON, then:
node .Codex/skills/prototype-from-figma/scripts/validate-layers.mjs meta.json
```

Exit 0 required before extracting values. Full grammar: [REFERENCE.md](REFERENCE.md) § Layer grammar.

### 3. Extract

- `get_metadata` → `get_screenshot` → `get_design_context` → `get_variable_defs`
- Capture every variant/state in the Figma component set
- Collect annotations (`note:*`, sticky notes, descriptions) as build requirements

### 4. Alias tokens  [req 2]

For **each** spacing, radius, size, stroke, blur, font size, and color:

```bash
node .Codex/skills/prototype-from-figma/scripts/find-token.mjs 8px
node .Codex/skills/prototype-from-figma/scripts/find-token.mjs '#007549'
```

| Result | Action |
|--------|--------|
| Match | Use `var(--dim-space-200, 8px)` / `var(--brand-p700, #007549)` with **matching** fallback |
| No match | Add token to `design.md` **and** `src/index.css`, then alias — do not inline |
| Gradient | Inline `linear-gradient(...)` / `radial-gradient(...)` only |

Prefer **dimension** tokens for layout: `--dim-space-*`, `--dim-radius-*`, `--dim-size-*`, `--dim-stroke-*`, `--dim-blur-*`. Prefer **semantic** color tokens over raw primitives when the Figma variable is semantic.

Build a **token map table** in the PR/summary (Figma value → CSS var).

### 5. Implement vibe code  [req 3a]

- Path: `src/components/<family>/<Name>.jsx` (match existing family folders)
- React 17, `import React`, props mirror Figma variants
- Derive hover/focus/disabled in CSS/handlers — callers do not pass `state="hover"`
- Icons: Figma Material Symbol name → `<Icon>` / `<Sym>`; else Lucide
- Docblock at top: Figma URL + node id + prop ↔ token matrix
- Update path: preserve public API; add props/variants; fix token drift

### 6. Update docs  [req 3b]

Always update **all** of these when shipping a component:

| Doc | What to add |
|-----|-------------|
| [`design.md`](../../../design.md) §6 | New subsection: Figma link, property table (variant × size × state → tokens) |
| [`ComponentsLibraryPage.jsx`](../../../src/pages/components/ComponentsLibraryPage.jsx) | Route/slug, live demo matrix, `<Guidelines behavior dos donts />` |
| Component file header | Figma node + usage |
| Optional | Code Connect `*.figma.tsx` if mapping exists; `docs/design-system.html` if that page lists the component |

Slug convention: kebab-case matching the library page (`brand-button`, `alert-dialog`).

### 7. Verify

- [ ] `/components/<slug>` renders all documented variants
- [ ] No hardcoded px/hex where a token exists (`rg` the new file)
- [ ] `validate-layers.mjs` still clean if Figma was renamed
- [ ] Touch targets ≥ `--dim-size-900` (44px) where interactive
- [ ] Icon-only controls have `accessibilityLabel`

## New vs update decision

```
Figma component
  │
  ├─ Exact match in src/components → UPDATE (tokens, variants, docs)
  ├─ Close alias (same role) → EXTEND existing + update §6
  └─ No match → CREATE new file + §6 + library demo
```

## Anti-patterns

- ❌ Skipping layer rename because "Figma already looks fine"
- ❌ `padding: 12` / `borderRadius: 8` instead of `--dim-space-300` / `--dim-radius-200`
- ❌ Shipping JSX without `design.md` §6 or ComponentsLibrary demo
- ❌ Second button/input style instead of extending Brand*/Input*
- ❌ Third icon family or inline SVG for an existing Material Symbol

## Resources

- Library fileKeys + docs checklist → [REFERENCE.md](REFERENCE.md)
- Layer validate → `../prototype-from-figma/scripts/validate-layers.mjs`
- Token reverse-lookup → `../prototype-from-figma/scripts/find-token.mjs`
- DS UX standards → [ux-ui-designer](../ux-ui-designer/SKILL.md) § Design system checklist
