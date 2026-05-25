# Project rules

## Design tokens are the only source of truth

**Every value — color, dimension, typography, shadow, border, radius, stroke,
opacity, blur — that appears in any component, page, or new piece of
"vibe code" MUST alias a token defined in [`design.md`](design.md) and exposed
as a CSS custom property in [`src/index.css`](src/index.css).**

**The only exception is gradients.** Use inline `linear-gradient(...)` /
`radial-gradient(...)` directly. (Gradients aren't expressible as a single
token in Figma → CSS, and the design system doesn't catalog them.)

### What this means in practice

- ❌ `borderRadius: 8` → ✅ `borderRadius: 'var(--dim-radius-200, 8px)'`
- ❌ `padding: '12px 16px'` → ✅ `padding: 'var(--dim-space-300) var(--dim-space-400)'`
- ❌ `background: '#F4FBF8'` → ✅ `background: 'var(--surface-brandPrimary-quaternary)'`
- ❌ `fontSize: '14px'` → ✅ `fontSize: 'var(--type-size-sm)'`
- ❌ `boxShadow: '0 4px 12px rgba(0,0,0,0.12)'` → ✅ `boxShadow: 'var(--shadow-card)'`
- ✅ `background: 'linear-gradient(135deg, #007549 0%, #00A86B 100%)'` (gradient exception)

### Fallback pattern

Always pair the CSS variable with a literal fallback that **matches the variable's
actual value** (not what the author wishes it were):

```js
borderRadius: 'var(--dim-radius-150, 6px)'   // ✅ radius-150 = 6px → fallback 6px
borderRadius: 'var(--dim-radius-100, 6px)'   // ❌ radius-100 = 4px → fallback lies
```

A mismatched fallback signals that the wrong token was chosen — pick the
token whose value matches what you actually want, OR add a new token to
design.md + index.css if Figma calls for it.

### Before adding a new value

1. **Check [`design.md`](design.md) §3 (Token Scale)** for an existing token first
   — dimensions, radii, strokes, spaces, sizes, blurs, type sizes, weights.
2. **Check [`design.md`](design.md) §4 (Semantic Surfaces / Borders / Text / Icons)**
   for color tokens — never use raw hex.
3. **If Figma defines a value that isn't in design.md yet**, add the token to
   BOTH design.md (token table) AND [`src/index.css`](src/index.css) (`:root` block),
   then reference the new CSS variable. Do not silently introduce a literal.
4. **If the value isn't in Figma at all**, push back — values outside the design
   system are drift. Either it should be added to Figma + design.md, or the
   component should use the nearest existing token.

### Forbidden patterns (will be caught in review)

- `borderRadius: <number>` — numeric literal (except `0`)
- `borderRadius: '6px'` / `'8px'` etc — string literal
- `gap: <number>` / `padding: <number>` — pixel literals where a `--dim-space-*` exists
- `background: '#xxxxxx'` (where the hex matches an existing color token)
- `boxShadow: '0 ... rgba(...)'` (where a `--shadow-*` token covers it)
- `fontSize: '12px'` / `'14px'` / `'16px'` etc — use `--type-size-{xs,sm,base,lg,xl,...}`
- `fontWeight: 400 / 500 / 700` — use `--type-weight-{regular,medium,bold}`

### When in doubt

Grep [`src/index.css`](src/index.css) for an existing variable that matches what you
want before introducing a literal. If nothing matches, that's a signal to add
a token, not to bypass the rule.

---

## No browser-default input chrome

Custom search / input / textarea / select wrappers in this project own
their own border, focus, and shadow. The native `<input>` (or
`<textarea>` / `<select>`) sitting inside MUST be completely chrome-free
so no browser-default vertical edges, focus rings, or appearance lines
leak through the wrapper.

This came up repeatedly on AISearch — Webkit/Chromium kept rendering
thin blue vertical lines at the input's left/right edges and a blinking
caret that visually read as a "browser focus" line. Setting only inline
`style={{ border: 'none', outline: 'none' }}` is **not enough** on every
browser.

### The rule

Every time you build (or touch) a search / input / textarea / select
component whose visual border is owned by a wrapper element, inject a
stylesheet that strips every form-control chrome from the inner native
control:

```css
.mih-<component>-input,
.mih-<component>-input:focus,
.mih-<component>-input:focus-visible {
  caret-color: transparent;        /* hide blinking text caret */
  border: 0 !important;
  outline: none !important;
  box-shadow: none !important;
  background: transparent !important;
  -webkit-appearance: none !important;
  appearance: none !important;
}
```

Apply this via an idempotent module-load stylesheet injection (see
[`src/components/search/AISearch.jsx`](src/components/search/AISearch.jsx) for the canonical pattern) so HMR
picks up edits without leaving a stale `<style>` tag behind.

### Why `!important`

The global focus reset in [`src/index.css`](src/index.css) covers `outline`
but not `border` / `box-shadow` / `-webkit-appearance`. Skipping
`!important` lets Tailwind preflight or browser UA styles win on
specific browsers. Don't take the shortcut.

### Checklist when building a new search-like component

- [ ] Inner native control has its OWN class (e.g. `.mih-foo-input`) — don't
      rely on inline `style` alone.
- [ ] Class strips `border`, `outline`, `box-shadow`, `background`,
      `-webkit-appearance`, `appearance` with `!important`.
- [ ] Same rules repeated for `:focus` and `:focus-visible`.
- [ ] `caret-color: transparent` unless you have a specific reason to
      show the blinking text caret (the user finds it visually noisy in
      design-system search bars).
- [ ] `::placeholder` rule sets `color` from a design token + `opacity: 1`
      (Firefox defaults to 0.54).
- [ ] Verify in Chrome **and** Safari that no vertical edges appear at
      the input's left/right boundary in any state (default, hover,
      focus, typing, filled).
