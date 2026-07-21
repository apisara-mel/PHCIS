---
name: drawing-ui-on-figma
description: >-
  Draw or compose UI screens in Figma by reusing MIH design-system library
  components (Foundation, Popup, Card, Table, Design Template) plus vibe-code
  components from src/components. Applies PHCIS-ALL product styling, design.md
  tokens, and full state/edge-case coverage. Use when the user asks to create,
  draw, build, or update UI in Figma, push a screen to Figma, or compose a
  Figma frame from existing components.
---

# Drawing UI on Figma (MIH)

Compose screens **inside Figma** by reusing published MIH components — never draw raw rectangles when a library instance exists. Cross-reference **vibe-code components** (`src/components/**`) so Figma layer names, variants, and tokens stay aligned with what ships in the repo.

## Mandatory prerequisites

Before any Figma write:

1. Load **figma-use** (Figma MCP plugin skill) — **required before every `use_figma` call**.
2. Load **figma-generate-design** when building a full page, modal, table view, or multi-section layout.
3. Read this skill's [REFERENCE.md](REFERENCE.md) (library file keys) and [LOGIC-MATRIX.md](LOGIC-MATRIX.md) (states / edge cases).

Optional companions:

- [ux-ui-designer](../ux-ui-designer/SKILL.md) — PHCIS domain flows
- [prototype-from-figma](../prototype-from-figma/SKILL.md) — reverse direction (Figma → code); reuse its layer-naming grammar

## Hard rules (user requirements)

When asked to create UI in Figma:

1. **Reuse components** from vibe-code (`src/components/**`, `ComponentsLibraryPage`) **and** the whole [MIH Design System Foundation](https://www.figma.com/design/SBdh4TtY0KAa22s3dnyRNr/MIH-Design-System-Foundation?node-id=297-2) file.
2. **Reuse components** from vibe-code **and** the whole [MIH Design System — Popup](https://www.figma.com/design/I1pQchHR7IwrX6ZIBZRt6e/MIH-Design-System---Popup?node-id=0-1) file.
3. **Reuse components** from vibe-code **and** the whole [MIH Design System — Card](https://www.figma.com/design/KGU3Sk3s04cgRNSbE2M78w/MIH-Design-System---Card?node-id=150-1223) file.
4. **Reuse components** from vibe-code **and** the whole [Design Template](https://www.figma.com/design/Urt0JAQES9364u2ud3XtpY/Design-Template?node-id=9-1494) file (page shells, header, side menu, queue layouts).
5. **Reuse components** from vibe-code **and** the whole [MIH Design System — Table](https://www.figma.com/design/49FBtstXs6YQGlpVqREqhy/MIH-Design-System---Table?node-id=0-1) file.
6. **Match styles** from [PHCIS-ALL](https://www.figma.com/design/h0fghZdYHA7HRJcjmRsUmF/PHCIS-ALL?node-id=2049-43819) — product-level spacing, hierarchy, Thai copy tone, queue/summary patterns. Treat PHCIS-ALL as the visual reference for *assembled* screens; Foundation/Popup/Card/Table as the *parts*.
7. **Create new nodes only when no reuse match exists** — new frames must **alias** existing variables / text styles / effect styles from the libraries. No orphan hex or px literals. Gradients are the only inline exception.
8. **Design logic and all use cases** — every interactive surface gets the full state matrix (see [LOGIC-MATRIX.md](LOGIC-MATRIX.md)). Matching is **case-insensitive** for component names, variant props, and layer searches.

## Workflow

Copy this checklist and track progress:

```
Drawing UI on Figma:
- [ ] 1. Scope — screen name, route/context, sections list
- [ ] 2. Discover — search libraries + grep vibe-code components
- [ ] 3. Map — component reuse table (Figma instance ↔ src file)
- [ ] 4. Styles — PHCIS-ALL reference + variable/style bindings
- [ ] 5. Assemble — import instances, auto-layout, token binds
- [ ] 6. States — empty / loading / error / edge cases per LOGIC-MATRIX
- [ ] 7. Verify — screenshot diff + layer naming + annotation pass
```

### Step 1 — Scope

- Identify **screen type**: queue page · form step · popup/modal · table · card grid · mobile view.
- List **sections** (Header, Summary, Filters, Table, Footer, …).
- Note **role** (registration / OPD / treat / telemed) — read `docs/product-spec.md` if unclear.

### Step 2 — Discover (reuse-first)

Run discovery **in parallel** where possible:

| Source | Tool / action |
|--------|----------------|
| Foundation, Popup, Card, Table, Design Template | `search_design_system` (Figma MCP) — query by component name |
| Vibe-code components | `grep` / `Glob` `src/components/**` + skim `ComponentsLibraryPage.jsx` |
| Code Connect mappings | `get_code_connect_map` + `*.figma.tsx` / `*.figma.ts` next to components |
| PHCIS-ALL product patterns | `get_design_context` + `get_screenshot` on the reference node |
| Tokens | `design.md` + `get_variable_defs` on Foundation |

**Search order:** exact component name → synonym (case-insensitive) → category (e.g. "Primary button" → `BrandButton`) → nearest variant in library.

Record a **reuse table** before drawing:

| UI need | Vibe-code | Figma library | File | Action |
|---------|-----------|---------------|------|--------|
| Primary CTA | `BrandButton` | Button / Brand | Foundation | instance |
| Confirm dialog | `AlertDialog` | Alert Dialog | Popup | instance |
| Queue table | `Table` | Table + HeaderCell | Table | instance |
| Page chrome | — | Header + Side Menu | Design Template | instance |

If no row resolves → mark **NEW (alias tokens)** and justify in a one-line note.

### Step 3 — Map vibe-code ↔ Figma

For each vibe-code component:

1. Find its Figma counterpart via Code Connect URL, `ComponentsLibraryPage` Figma link, or `search_design_system`.
2. Use the **exact** React component name as the Figma instance layer name (`BrandButton`, `FilterDropdown`, `TelemedicineQueueBadge`, …).
3. Mirror **variant props** as Figma component properties (style, size, state, leadingIcon, …).

Layer naming (aligned with prototype-from-figma):

- Screen → `Screen/<Name>`
- Section → `Section/<Name>`
- Component instance → `<ComponentName>` or `<ComponentName> · <State>`
- Dynamic placeholder → `data:<field>` · fixed copy → `label:<slug>`

### Step 4 — Styles (PHCIS-ALL + tokens)

1. Open PHCIS-ALL reference frame — extract layout rhythm (padding, card gaps, summary strip, tab underline).
2. Bind fills/text/strokes to **semantic variables** (Foundation / PHCIS file modes) — never hardcode `#RRGGBB`.
3. Apply **text styles** (Sarabun body/label, Mitr heading) and **effect styles** (shadow-card, dropdown) from Foundation.
4. For brand-dependent surfaces, use brand-primary / brand-secondary variable collections.

Token source of truth in repo: `design.md` + `tokens/figma/*.tokens.json` (run `npm run tokens:sync` after JSON imports).

### Step 5 — Assemble in Figma

Use `use_figma` incrementally (small scripts, return node IDs):

1. Create or navigate to target page/frame (`Screen/<Name>`).
2. **Import component instances** from libraries (`importComponentByKeyAsync` / design-system search results) — do not redraw buttons, inputs, badges.
3. Wrap sections in **auto-layout** frames; set HUG/FILL per figma-use rules.
4. For page shells: start from **Design Template** (header + side menu + content slot), then fill content.
5. For data-heavy views: compose **Table** library HeaderCell + DataCell; don't hand-draw grid lines.
6. For overlays: use **Popup** library (AlertDialog, DrawingCanvasPopup wrappers, etc.).

If building from running vibe-code UI (web): optional parallel `generate_figma_design` capture for pixel reference, then replace primitives with library instances (see figma-generate-design).

### Step 6 — States & logic (requirement 8)

For **every** interactive component and screen section, add Figma variants or sibling frames per [LOGIC-MATRIX.md](LOGIC-MATRIX.md):

- Default · Hover · Focus · Disabled · Loading · Error · Empty · Success
- Domain cases: no permission, device not found, connection lost, overdue badge, edit mode, pagination edge, long Thai text overflow

Name state frames: `<ComponentName> · <State>` (case-insensitive matching OK).

Popup flows: show trigger frame + open state + dismiss path. Table flows: sort icon, empty state, sticky header. Forms: validation error inline + disabled submit.

### Step 7 — Verify

1. `get_screenshot` on finished frame — compare to PHCIS-ALL reference.
2. Confirm **zero** unbound hex fills on library-eligible layers.
3. Confirm every layer maps to a vibe-code name OR is marked `NEW/*` with token aliases listed.
4. Add `note:*` layers for non-obvious logic (timeouts, PDPA, role gates).

## When to create new (requirement 7)

Allowed only when Steps 2–3 find **no** library or vibe-code match:

1. Document gap in reuse table (`Action: NEW`).
2. Build from **auto-layout + token-bound primitives** (not raw hex).
3. Prefer extending an existing component variant set over a one-off frame.
4. If the gap is reusable, propose adding it to Foundation and log for Code Connect.

## Anti-patterns

- ❌ Redrawing a Button/Input/Badge that exists in Foundation
- ❌ Hardcoded colors/sizes where variables exist
- ❌ Single happy-path frame with no empty/error/disabled siblings
- ❌ Layer names like `Frame 427` / `Group 12`
- ❌ Mixing icon families (Material Symbols + random SVG)
- ❌ Skipping Design Template chrome on staff-facing PHCIS pages

## Additional resources

- Library file keys & entry nodes → [REFERENCE.md](REFERENCE.md)
- State / edge-case matrix → [LOGIC-MATRIX.md](LOGIC-MATRIX.md)
