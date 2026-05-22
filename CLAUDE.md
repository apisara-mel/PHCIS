# Project rules

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
