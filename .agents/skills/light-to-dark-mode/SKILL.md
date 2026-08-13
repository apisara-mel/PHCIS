---
name: light-to-dark-mode
description: >-
  Convert MIH PHCIS light-mode colors to a dark theme. Use whenever the user
  asks to add/fix dark mode, make a surface/border/text/icon "เปลี่ยนตาม mode",
  darken a page/component, or theme any element for dark. Every dark value MUST
  be picked from design.md (the neutral + brand palettes) — never invent hex.
  Covers the [data-mode="dark"] override system, the value-mapping table, the
  toggle mechanism, and headless verification.
---

# Light → Dark mode (MIH PHCIS)

Convert light-mode colors to dark. **The design system is the only source of
color** — this skill exists so dark values are always pulled from
[`design.md`](../../../design.md), not made up.

## 🔒 Golden rule — colors come from design.md ONLY

Every dark hex you write MUST be a value that already appears in `design.md`:
- **Neutral ramp** → `design.md` §1a `neutral` palette (steps 50–950).
- **Brand accents / tints** → `design.md` §2 *Brand Color Values per Mode* (the
  `primary` column, steps 50–950 — default = emerald).
- **Status colors** (info/success/warning/error/pink/…) → their palettes in
  §1a / §1a-2.

If a value you need is **not** in design.md, do NOT inline a literal — add the
step to design.md's palette table first (same discipline as
[`AGENTS.md`](../../../AGENTS.md)), then use it. Never pick a color "by eye".

## The dark ramp — mapped to design.md `neutral` (§1a)

Define these helper vars at the top of the dark block and build everything from
them. Values are the exact `neutral` / `brand` steps from design.md:

| Helper | design.md source | Hex | Use for |
|--------|------------------|-----|---------|
| `--d-bg`        | neutral/950 | `#111314` | screen background (darkest) |
| `--d-surface-1` | neutral/900 | `#222629` | card / navigation base |
| `--d-surface-2` | neutral/800 | `#363B3F` | input / modal / elevated |
| `--d-surface-3` | neutral/800 | `#363B3F` | active / raised tint (or /700 if more lift needed) |
| `--d-hover`     | neutral/800 | `#363B3F` | row / item hover |
| `--d-border-1`  | neutral/800 | `#363B3F` | subtle divider / gridline |
| `--d-border-2`  | neutral/700 | `#4D5358` | input / stronger border |
| `--d-text-1`    | neutral/100 | `#F4F5F5` | primary text (near-white) |
| `--d-text-2`    | neutral/400 | `#ADB2B7` | secondary text |
| `--d-text-3`    | neutral/500 | `#858C92` | tertiary / placeholder |
| `--d-icon`      | neutral/300 | `#C9CDD0` | default icon |

Brand-on-dark accents (from §2 `primary`, default emerald):
- **Brand text / icon** (was `brand-p700` `#007549`, unreadable on dark) → **`--brand-p400` `#6AD6A5`**.
- **Brand tint surface** (subtle green panel, was `brand-p50/p100`) → **`--brand-p900` `#003322`** / **`--brand-p950` `#002318`**.
- **Selected/active surface** → `--brand-p900`; **selected/active border/dashed** → `--brand-p600`.
- Use `var(--brand-p*)` (not the raw hex) so every `[data-brand]` theme stays on-brand.

## Where the overrides live

One block appended at the **end** of [`src/index.css`](../../../src/index.css):

```css
[data-mode="dark"] {
  /* Ramp helpers = the design.md neutral steps, written as the literal hex
     (the project exposes --brand-p* as CSS vars but NOT --neutral-*, so the
     neutral ramp uses the design.md value directly — always cite the step). */
  --d-bg:        #111314;   /* design.md neutral/950 */
  --d-surface-1: #222629;   /* neutral/900 */
  --d-surface-2: #363B3F;   /* neutral/800 */
  --d-border-2:  #4D5358;   /* neutral/700 */
  --d-text-1:    #F4F5F5;   /* neutral/100 */
  --d-text-3:    #858C92;   /* neutral/500 */
  /* …rest of ramp (see table)… */
  color-scheme: dark;
  background-color: var(--d-bg);
  /* semantic token overrides below — brand accents use var(--brand-p400) etc. */
}
```

Appended last so it wins the cascade (equal specificity to `:root`, later wins).
`[data-mode="dark"] body { background-color: var(--d-bg); }` prevents a light gutter.

## Value-mapping table (light → dark, all design.md-sourced)

| Light value (in `:root`) | Dark override |
|--------------------------|---------------|
| `#FFFFFF` / `#F9FBFB` (surface) | `--d-surface-1` or `--d-surface-2` |
| `#F4F5F5` / `#F5F7F9` (border) | `--d-border-1` |
| `#E2E4E6` / `#C9CDD0` (border) | `--d-border-2` |
| `#363B3F` / `#4D5358` / `#111314` (text) | `--d-text-1` |
| `#636B72` (text) | `--d-text-2` |
| `#858C92` / `#ADB2B7` (text) | `--d-text-3` |
| `var(--brand-p700)` (brand text/icon) | `var(--brand-p400)` |
| `var(--brand-p50)` (border) | `--d-border-1` |
| `var(--brand-p100)` (border) | `--d-border-2` |
| `var(--brand-p200)` (selected/hover/dashed border) | `var(--brand-p600)` |
| `var(--brand-p50/p100)` (tint surface) | `var(--brand-p900/p950)` |
| status pastel bg (`#FEE2E2`, `#DBEAFE`, …) | that hue's `900`-step from design.md (deep-tinted) + text → its `300`/`400` step |

## Conversion workflow

1. **Scan** the light section of `index.css` (everything before the first
   `[data-mode="dark"]`). Generate overrides with awk, mapping by literal value:
   ```bash
   awk '/^\[data-mode="dark"\]/{exit}
     /^[[:space:]]*--text-[a-zA-Z0-9-]+:[[:space:]]*#[0-9A-Fa-f]{6}[[:space:]]*;/{ … map to --d-text-* … }
     /^[[:space:]]*--border-[a-zA-Z0-9-]+:[[:space:]]*#[0-9A-Fa-f]{6}[[:space:]]*;/{ … map to --d-border-* … }' src/index.css
   ```
   Also scan for `--border-*: var(--brand-p50|p100|p200)` (var-aliased brand
   tints — literal-hex scans miss these).
2. **Append** the generated block. Coloured (`var(--brand-*)` / status-hex)
   tokens keep their hue; only neutral values remap.
3. **Verify** (below). Revert temp changes.

## Gotchas (learned the hard way)

- **Contrast pairing** — never remap a *text* token to light without checking
  its paired *surface* is dark. Light text on a still-light badge = unreadable.
  Fix the surface too, or leave both (e.g. colorful badges stay light).
- **Undefined vars with light fallbacks** — components read `var(--ink-line,
  #E2E4E6)`, `var(--surface-dropdown-default)`, `--surface-sidesubmenu-*`,
  `--surface-card-brand-100`, `--ink-neutral` (chart track/gridlines). These are
  **not** defined in `:root` (they fall back to light). **Define them inside the
  dark block** to theme charts, dropdowns, sub-menus.
- **Legacy Tailwind utilities** — `bg-white`, `bg-brand-50`, `text-ink*`,
  `border-ink-line`, `bg-ink-neutral` map to fixed hex / light brand primitives
  in `tailwind.config.js`. Override the class directly (specificity beats the
  plain utility, no `!important`):
  ```css
  [data-mode="dark"] .bg-white { background-color: var(--d-surface-1); }
  [data-mode="dark"] .bg-brand-50 { background-color: var(--d-bg); }
  [data-mode="dark"] .text-ink { color: var(--d-text-1); }
  ```
- **Hardcoded `bg-white` / `text-[#hex]` in JSX** (e.g. Header, SummaryCard) —
  swap the literal for a token (`--surface-navigation-default` etc.) so it
  follows the mode. Don't rely on the `.bg-white` catch-all for structural chrome.
- **`selected`/`active` states** keep a brand accent (`--brand-p400` text/icon,
  `--brand-p600` border, `--brand-p900` surface) so the affordance survives; only
  the *idle* neutrals go fully dark.

## Toggle mechanism (already wired — don't rebuild)

- `<html data-mode="dark">` drives everything. Set in two places:
  - [`src/main.jsx`](../../../src/main.jsx) — reads `localStorage['phcis.mode']`
    (`light`/`dark`/`system`) + `phcis.theme` and applies **before first paint**
    (no FOUC, covers standalone pages).
  - [`SidebarProfileMenu.jsx`](../../../src/components/layout/SidebarProfileMenu.jsx)
    — applies on live change; `system` follows `prefers-color-scheme`.
- [`SettingsModal.jsx`](../../../src/components/popup/SettingsModal.jsx) previews
  the mode live on selection and reverts on "ปิด".

## Verification (headless, then revert)

```bash
# temp-force dark so a fresh headless browser (empty localStorage) renders dark
sed -i '' "s/readPref('phcis.mode',  'light')/readPref('phcis.mode',  'dark')/" \
  src/components/layout/SidebarProfileMenu.jsx
cp src/components/layout/SidebarProfileMenu.jsx ~/MIH-PHCIS-local/src/components/layout/
# screenshot a data-rich page (dashboard / a seeded table page), read the PNG,
# confirm surfaces/text/borders/icons are dark & readable, then REVERT:
sed -i '' "s/readPref('phcis.mode',  'dark')/readPref('phcis.mode',  'light')/" \
  src/components/layout/SidebarProfileMenu.jsx
```

Default mode stays **light** — leave `SidebarProfileMenu` on `'light'` when done.
Always sync edits to `~/MIH-PHCIS-local` (dev runs from local disk, not Drive).
