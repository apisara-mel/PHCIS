# Figma token exports

This folder holds **W3C Design Token** JSON exports from the MIH Figma variable collections.

## Files

| File / folder | Description | Syncs to `design.md` |
|---------------|-------------|----------------------|
| `light.tokens.json` | Semantic tokens — light theme | §4.1–§4.5 |
| `dark.tokens.json` | Semantic tokens — dark theme | §4.1–§4.5 |
| `primitive.tokens.json` | Primitive tokens (color, typography, dimension) | §1a–§1c |
| [`brand/`](brand/) | Brand mode palettes — 10 themes | §2 (overview + per-mode values) |
| [`breakpoint/`](breakpoint/) | Responsive breakpoint min-widths | §3 |

### Brand modes (`brand/`)

| File | Brand key |
|------|-----------|
| `default.tokens.json` | `default` (emerald / forest) |
| `blue-serenity.tokens.json` | `blue-serenity` |
| `dusty-mauve.tokens.json` | `dusty-mauve` |
| `muted-teal.tokens.json` | `muted-teal` |
| `rose-mist.tokens.json` | `rose-mist` |
| `sakura.tokens.json` | `sakura` |
| `soft-lavender.tokens.json` | `soft-lavender` |
| `soft-peach.tokens.json` | `soft-peach` |
| `soft-sky.tokens.json` | `soft-sky` |
| `warm-gray.tokens.json` | `warm-gray` |

### Breakpoints (`breakpoint/`)

| File | Min-width (px) |
|------|----------------|
| `xs.tokens.json` | 402 |
| `sm.tokens.json` | 640 |
| `md.tokens.json` | 768 |
| `lg.tokens.json` | 1024 |
| `xl.tokens.json` | 1280 |
| `2xl.tokens.json` | 1536 |

## Sync to design.md

After replacing JSON exports from Figma, run:

```bash
npm run tokens:sync                  # all sections (§1–§4)
npm run tokens:sync:primitive        # §1 only
npm run tokens:sync:brand            # §2 only
npm run tokens:sync:breakpoint       # §3 only
npm run tokens:sync:semantic         # §4 only
```

**Not auto-synced** (no JSON export yet / maintained manually):

- §1d Effect Styles
- §4.6 Typography (text styles)
- §5–§6 Component tokens

## Source of truth chain

```
Figma variables
  → tokens/figma/**/*.tokens.json   (import drop zone)
  → design.md §1–§4                 (npm run tokens:sync)
  → src/index.css :root             (CSS custom properties — wire separately)
```

When adding tokens used in components, always alias CSS variables from `design.md` / `src/index.css` — never hardcode hex values in JSX.
