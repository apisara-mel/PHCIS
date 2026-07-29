# Sync MIH Component — Reference

## Figma library registry

| Library | URL | fileKey | Typical components |
|---------|-----|---------|-------------------|
| Foundation | [SBdh4TtY0KAa22s3dnyRNr](https://www.figma.com/design/SBdh4TtY0KAa22s3dnyRNr/MIH-Design-System-Foundation?node-id=297-2) | `SBdh4TtY0KAa22s3dnyRNr` | Button, Input, Badge, Checkbox, Switch, Search, Tabs, Icon buttons |
| Popup | [I1pQchHR7IwrX6ZIBZRt6e](https://www.figma.com/design/I1pQchHR7IwrX6ZIBZRt6e/MIH-Design-System---Popup?node-id=0-1) | `I1pQchHR7IwrX6ZIBZRt6e` | AlertDialog, DrawingCanvasPopup, popovers |
| Card | [KGU3Sk3s04cgRNSbE2M78w](https://www.figma.com/design/KGU3Sk3s04cgRNSbE2M78w/MIH-Design-System---Card?node-id=150-1223) | `KGU3Sk3s04cgRNSbE2M78w` | FormCard, PatientCard, SummaryCard |
| Table | [49FBtstXs6YQGlpVqREqhy](https://www.figma.com/design/49FBtstXs6YQGlpVqREqhy/MIH-Design-System---Table?node-id=0-1) | `49FBtstXs6YQGlpVqREqhy` | HeaderCell, DataCell, Table |
| Design Template | [Urt0JAQES9364u2ud3XtpY](https://www.figma.com/design/Urt0JAQES9364u2ud3XtpY/Design-Template?node-id=9-1494) | `Urt0JAQES9364u2ud3XtpY` | Header, Side Menu, queue scaffolds |

URL `node-id=297-2` → MCP `297:2`.

## Layer grammar (req 1)

Aligned with [prototype-from-figma](../prototype-from-figma/REFERENCE.md). Prefer English, PascalCase for components.

| Kind | Pattern | Example |
|------|---------|---------|
| Component / instance | Exact code name | `BrandButton` |
| Stateful instance | `<Name> · <State>` | `BrandButton · Disabled` |
| Variant label | Keep Figma props readable | `BrandButton · Style=Outline · Size=Sm` |
| Region | `Section/<Part>` | `Section/TrailingIcon` |
| Fixed copy | `label:<slug>` | `label:confirm` |
| Dynamic | `data:<field>` | `data:queueNo` |
| Note | `note:<slug>` | `note:focusRing4px` |
| Repeated | `<Item>/<n>` | `Row/1` |

**Forbidden:** `Frame 12`, `Group 3`, Thai-only opaque names, generic `Rectangle`.

Validate:

```bash
node .claude/skills/prototype-from-figma/scripts/validate-layers.mjs meta.json
```

## Dimension & token alias (req 2)

### Lookup

```bash
node .claude/skills/prototype-from-figma/scripts/find-token.mjs 4px 8px 12px 16px 24px 44px
node .claude/skills/prototype-from-figma/scripts/find-token.mjs '#F4FBF8' '#007549'
```

### Common dimension aliases

| Figma px | Prefer token | CSS |
|----------|--------------|-----|
| 0 | space/radius 0 | `--dim-space-0` / `--dim-radius-0` |
| 2 | space.050 | `--dim-space-050` |
| 4 | space.100 / radius.100 / stroke.100 | `--dim-space-100` etc. |
| 6 | space.150 / radius.150 | `--dim-space-150` |
| 8 | space.200 / radius.200 / size.100 | `--dim-space-200` |
| 12 | space.300 / radius.400 | `--dim-space-300` |
| 16 | space.400 / radius.500 / size.300 | `--dim-space-400` |
| 24 | space.600 / size.500 | `--dim-space-600` |
| 32 | space.800 / size.600 | `--dim-size-600` |
| 44 | size.900 (touch) | `--dim-size-900` |

Always pair CSS vars with a **literal fallback that equals the token**:

```js
padding: 'var(--dim-space-400, 16px)', // ✅
padding: 'var(--dim-space-400, 12px)', // ❌ lying fallback
```

### If Figma value is missing from design.md

1. Add row to `design.md` §1 / §3 / §4 as appropriate  
2. Add `:root` in `src/index.css`  
3. Optionally drop JSON into `tokens/figma/` + `npm run tokens:sync` for semantic/primitive tables  
4. Then reference the new var in the component  

## Docs checklist (req 3)

### A. `design.md` §6

Template for a new subsection:

```markdown
## 6.XX <ComponentName>

> **Figma:** [node](https://www.figma.com/design/<fileKey>/...?node-id=...) · **Code:** `src/components/.../<Name>.jsx` · **Demo:** `/components/<slug>`

### Properties

| Prop | Values | Default |
|------|--------|---------|
| `variant` | … | … |
| `size` | sm · md · lg | md |

### Token mapping (light)

| Part | State | Token |
|------|-------|-------|
| Surface | default | `surface.…` |
| Border | hover | `border.…` |
| Text | disabled | `text.…` |
| Padding | — | `dimension.space.…` |
| Radius | — | `dimension.radius.…` |
| Height | md | `dimension.size.…` |
```

### B. `ComponentsLibraryPage.jsx`

1. Import the component  
2. Add nav/slug entry (match existing `slug: '…'` pattern)  
3. Demo section: matrix of variants × sizes × key states  
4. `<Guidelines behavior={[…]} dos={[…]} donts={[…]} />`  

### C. Component source header

```jsx
/**
 * <Name> — Figma <fileKey> node <id>
 * Props: variant, size, disabled, …
 * Tokens: --surface-…, --dim-space-…, …
 */
```

### D. Optional

| Artifact | When |
|----------|------|
| `*.figma.tsx` Code Connect | Bridging Figma ↔ code for MCP |
| `docs/design-system.html` | If the human-readable DS page lists components |
| Appendix B icons in design.md | New custom medical SVG |

## Code placement

| Family | Folder |
|--------|--------|
| Buttons | `src/components/button/` |
| Forms / filters | `src/components/forms/` |
| Table | `src/components/table/` |
| Badge | `src/components/badge/` |
| Popup / dialog | `src/components/popup/` or existing popup path |
| Search | `src/components/search/` |
| Card | `src/components/card/` |
| Mobile | `src/components/mobile/` |

Match neighbors' export style (default export vs named) and React 17 patterns.

## Diff checklist (update existing)

- [ ] New Figma variants/props reflected in PropTypes or defaults  
- [ ] Old hardcoded values replaced with tokens  
- [ ] §6 table updated (not only code)  
- [ ] Library demo shows new states  
- [ ] Breaking API changes called out to user before merge  

## Example sync summary (agent output)

```markdown
## Synced: ColorfulBadge
- Figma: Foundation `3355:3149` — layers renamed (BrandButton → …)
- Tokens: height → --dim-size-600; radius → --dim-radius-full; …
- Code: src/components/badge/ColorfulBadge.jsx (updated)
- Docs: design.md §6.xx · /components/colorful-badge Guidelines
```
