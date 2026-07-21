---
name: prototype-from-figma
description: Turn a Figma frame into a working, design-system-accurate prototype in this repo. Prepares the Figma file (layer renames + reading every annotation), maps each value to design.md tokens and existing components, fills gaps (new tokens, or a Google Sheet of missing components), and mocks realistic in-context content. Use when the user shares a Figma URL and wants it built or prototyped, says "prototype from Figma", "build this Figma", "turn this design into code", or points at a Figma node to implement.
---

# Prototype from Figma

Build a runnable prototype that matches a Figma frame **and** the MIH design system. Load the `figma-use` skill before any `use_figma` write. Work the six gates in order — each depends on the one before it. Do not skip.

## 0. Prepare the Figma file — rename layers  [req 1]

AI reads a design by its layer names. Before extracting anything, rename layers (via `use_figma`) so every layer maps to a clear intent:

- Artboards → `Screen/<Name>`; regions → `Section/<Name>`.
- Any layer that is an MIH component → the **exact** component name (`BrandButton`, `PhotoUploadField`, …) so it aliases 1:1 in code.
- Repeated rows/cards → `<Item>/1`, `<Item>/2` …; stateful variants → `<Name> · <State>`.
- Text that is dynamic data → `data:<field>` (e.g. `data:patientName`); fixed copy → `label:<...>`.

Full grammar in [REFERENCE.md](REFERENCE.md). Renaming edits the user's file — show the rename plan and get confirmation before writing. After renaming, validate coverage: save the `get_metadata` tree to a JSON file and run

```
node .claude/skills/prototype-from-figma/scripts/validate-layers.mjs <meta.json>
```

It flags default/unnamed layers (exit 1), off-grammar names, and component names with no match in `src/components` (typo or a Gate-5 candidate), and lists the `data:*` fields to mock in Gate 6. Get to a clean run before extracting.

## 1. Read everything on the board  [req 2]

- `get_metadata` (tree) → `get_screenshot` (visual) → `get_design_context` + `get_variable_defs` (values).
- Read **every** annotation on the artboard: Figma dev-mode annotations, sticky notes/comments, and text layers named `note:*`. Collect them into a numbered list and treat each line as a build requirement — nothing on the board is decorative.
- Note the frame's **width → target breakpoint** (design.md §3: xs 402 · sm 640 · md 768 · lg 1024 · xl 1280 · 2xl 1536). If the screen has sibling frames at other widths (mobile/tablet/desktop), grab each — they define the responsive behaviour, not guesswork.

## 2. Map to the existing design system first  [req 3]

For every value and element, check the system before inventing anything:

- **Tokens** — reverse-lookup each Figma value with `scripts/find-token.mjs '#hex'` / `find-token.mjs 8px` (resolves `var()` chains → every matching token); exit 1 means no token has that value.
- **Components** — grep `src/components/**` and the `/components` registry for an existing component that fits.
- **Icons** — Figma glyph name → Material Symbols via `<Icon>` / `<Sym>`; if absent, Lucide. Never a third source.

Record two lists: *covered by the system* and *missing*.

## 3. Fill the gaps

- **Tokens**  [req 4] — if Figma defines a value the system lacks, add the token to BOTH `design.md` and `src/index.css`, then alias the CSS var (with a fallback that matches the real value). Never inline a raw hex/px. **Gradients are the only exception** — use inline `linear-gradient(...)` / `radial-gradient(...)`.
- **Components**  [req 5] — alias an existing component whenever one fits. If a required component genuinely does not exist, do **not** silently hand-roll it as production: recommend it and log it to a Google Sheet (schema + MCP call in [REFERENCE.md](REFERENCE.md) "Missing-components sheet"), then build a clearly-labelled local stand-in for the prototype only.

## 4. Mock realistic context  [req 6]

Fill every `data:*` slot with content that fits the clinical context — real-looking Thai patient names / HN / vitals (reuse `src/data/*`) and images from `public/avatars/*` or a context-appropriate placeholder. No "Lorem ipsum", no `example.com`, no grey box where a real photo belongs. Text and imagery must read as a plausible real screen.

## 5. Build and verify

- React 17 (`import React`), tokens-only, one route that follows the repo's existing routing convention, runnable with the current dev command. Name the route/file so it's obviously a prototype.
- Verify with `scripts/verify-route.mjs <route> --stale '<srcPath>::<needle>' --selector '<css>' --shot <png>` (run under `~/.local/node16/bin/node`). It fails on console/page errors, asserts selectors, screenshots for the Figma diff, and — critically — detects a **stale dev server** (rsync preserves mtimes → Vite serves an old compile) and prints the exact restart command (exit 3).

See [EXAMPLES.md](EXAMPLES.md) for a full six-gate run.

## Gate checklist

- [ ] Layers renamed to the grammar, user confirmed, `validate-layers.mjs` clean (exit 0)
- [ ] Every annotation captured as a numbered requirement
- [ ] Values mapped to tokens; any new token added to design.md + index.css (gradients excepted)
- [ ] Components aliased; genuinely-missing ones logged to the Google Sheet + stubbed locally
- [ ] All `data:*` slots mocked with in-context text and images
- [ ] `verify-route.mjs` passes (exit 0) — no errors, selectors present, server fresh; screenshot matches Figma
