# Drawing UI on Figma — Library Reference

## Figma file registry

| # | Library | URL | fileKey | Primary use |
|---|---------|-----|---------|-------------|
| 1 | MIH Design System Foundation | [Foundation](https://www.figma.com/design/SBdh4TtY0KAa22s3dnyRNr/MIH-Design-System-Foundation?node-id=297-2) | `SBdh4TtY0KAa22s3dnyRNr` | Atoms & molecules: Button, Input, Select, Badge, Checkbox, Radio, Switch, Stepper, Search, Tabs, Tooltip, Icon buttons, variables, text/effect styles |
| 2 | MIH Design System — Popup | [Popup](https://www.figma.com/design/I1pQchHR7IwrX6ZIBZRt6e/MIH-Design-System---Popup?node-id=0-1) | `I1pQchHR7IwrX6ZIBZRt6e` | Modals, AlertDialog, DrawingCanvasPopup, confirm/cancel overlays, popovers |
| 3 | MIH Design System — Card | [Card](https://www.figma.com/design/KGU3Sk3s04cgRNSbE2M78w/MIH-Design-System---Card?node-id=150-1223) | `KGU3Sk3s04cgRNSbE2M78w` | FormCard, PatientCard, SummaryCard, ClinicCard, stat cards |
| 4 | Design Template | [Template](https://www.figma.com/design/Urt0JAQES9364u2ud3XtpY/Design-Template?node-id=9-1494) | `Urt0JAQES9364u2ud3XtpY` | App shell: Header, Side Menu, Sub Menu, Breadcrumb, Footer, queue page scaffolds |
| 5 | MIH Design System — Table | [Table](https://www.figma.com/design/49FBtstXs6YQGlpVqREqhy/MIH-Design-System---Table?node-id=0-1) | `49FBtstXs6YQGlpVqREqhy` | HeaderCell, DataCell, FooterCell, sort icons, sticky columns, pagination row |
| 6 | PHCIS-ALL (product reference) | [PHCIS-ALL](https://www.figma.com/design/h0fghZdYHA7HRJcjmRsUmF/PHCIS-ALL?node-id=2049-43819) | `h0fghZdYHA7HRJcjmRsUmF` | Assembled staff UI patterns — spacing, copy, summary cards, queue tables, tabs |

**node-id format:** URL `297-2` → MCP `297:2`.

## Vibe-code discovery (repo)

| Need | Where to look |
|------|----------------|
| Component catalog + Figma links | `src/pages/components/ComponentsLibraryPage.jsx` |
| Implemented components | `src/components/**` |
| Page compositions | `src/pages/**`, `src/templates/**` |
| Design tokens | `design.md`, `src/index.css`, `tokens/figma/` |
| Domain flows | `docs/product-spec.md`, `docs/user-flow.md` |
| Code Connect | `**/*.figma.tsx`, `**/*.figma.ts` |

### Grep patterns (case-insensitive friendly)

```bash
# Find React component + any Figma URL in library page
rg -i "BrandButton|AlertDialog|Table" src/components src/pages/components

# Find Figma links for a component
rg "figma.com/design" src/pages/components/ComponentsLibraryPage.jsx
```

## Component routing guide

| UI pattern | Vibe-code (examples) | Figma library | File |
|------------|---------------------|---------------|------|
| Primary / secondary actions | `BrandButton`, `NeutralSubdueButton`, `DangerButton` | Button variants | Foundation |
| Icon-only actions | `BrandIconButton`, `BrandCircleIconButton` | Icon Button | Foundation |
| Text fields | `InputField`, `Select`, `PhotoUploadField` | Input, Select | Foundation |
| Filters | `FilterTag`, `FilterDropdown`, `FilterDateTag` | Filter / Tag | Foundation |
| Search | `PrimarySearch`, `AISearch` | Search | Foundation |
| Status pills | `ColorfulBadge` | Colorful Badge | Foundation |
| Steps / progress | `Stepper`, `StepProgress` | Step | Foundation |
| Data grid | `Table` (`src/components/table/Table.jsx`) | Table system | Table |
| Queue / OPD page shell | `QueuePageShell` | Template frames | Design Template |
| Confirm / alert | `AlertDialog` | Alert Dialog | Popup |
| Canvas modal | `DrawingCanvasPopup`, `BodyRecordPopup` | Drawing popup | Popup |
| Patient header | `PatientCard` | Patient / Form Card | Card |
| Summary metrics | Summary cards in queue pages | Summary Card | Card |

When names differ between code and Figma (case or spacing), match **case-insensitively** and prefer the **Code Connect** canonical name.

## MCP tool cheat sheet

| Goal | Tool |
|------|------|
| Find published component | `search_design_system` |
| Read structure | `get_metadata`, `get_design_context` |
| Visual check | `get_screenshot` |
| Variables on node | `get_variable_defs` |
| Build / import instances | `use_figma` (+ figma-use skill) |
| Code ↔ Figma map | `get_code_connect_map` |

Always call `search_design_system` before inventing a new component key.

## Token alias rules (new frames only)

1. Check `design.md` §1–§4 and `get_variable_defs`.
2. Bind `fills`, `strokes`, `text`, `effects` to variables / styles.
3. If Figma export adds a missing token → update `tokens/figma/*.json` + `npm run tokens:sync` + wire `src/index.css`.
4. **Gradients only** may stay inline.

## Target file selection

- **New exploratory screen** → user's target file or create via `create_new_file`.
- **Design-system contribution** → appropriate library file (Foundation / Popup / Card / Table) — get explicit user approval before writing to published libraries.
- **Product feature mock** → PHCIS-ALL or a feature file linked from the user's URL.
