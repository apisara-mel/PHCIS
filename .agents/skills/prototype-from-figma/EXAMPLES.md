# Prototype from Figma — worked example

End-to-end run of the six gates for one screen: the Telemed **Call Controls** bar
(Figma `JeQMryWzufiwlrXQuiFfTM / 22:1463`). Shows the exact tools/scripts per gate.

## Gate 0 — rename layers

`get_metadata` on the frame returns a tree with names like `Frame 42`, `Group 7`.
Propose renames, confirm with the user, then `use_figma` to apply:

```
Frame 1157      → Section/CallControls
Group (mic)     → BrandCircleSubdueIconButton · MicControl
… (end call)    → DangerCircleIconButton · EndCall
Text "ปิดไมค์"  → label:micToggle
```

Validate before extracting:

```
get_metadata … > /tmp/meta.json
node .claude/skills/prototype-from-figma/scripts/validate-layers.mjs /tmp/meta.json
```

Iterate until it exits 0 (no unnamed/default layers; component names all resolve
in `src/components`). Unknown names → typo, or Gate 5.

## Gate 1 — read everything

`get_screenshot` (visual) + `get_design_context` (values). Sweep annotations into
a numbered list:

```
A1. Non-destructive controls = Brand Circle Subdue (outline); End Call = Danger Circle (fill).
A2. Muted mic/cam → Danger Circle Subdue (red mic_off / videocam_off), tertiary red border.
A3. Bar: white surface, top divider, gap 16, padding 16/24.
```

## Gate 2 — map to the design system

Every value → a token; every element → an existing component:

```
node .claude/skills/prototype-from-figma/scripts/find-token.mjs '#C5EDDA' 16px 24
# → --border-brandPrimaryButton-tertiary, --dim-space-400, --dim-radius-600 …
```

Components already exist → alias them: `BrandCircleSubdueIconButton`,
`DangerCircleIconButton`, `DangerCircleSubdueIconButton` (from `src/components/button/`).
Icons: `mic` / `mic_off` / `videocam` / `call_end` via `<Sym>` (Material Symbols).

## Gate 3 — fill gaps

All values mapped to existing tokens; no new token needed here. (If `find-token`
had missed a value, add it to `design.md` + `src/index.css` first — unless it's a
gradient, which stays inline.)

## Gate 4 — mock context

Patient identity for the bar's surrounding screen comes from
`src/data/patientProfiles.js` (`DEFAULT_PATIENT` → สมชาย มีสุข, HN 67-00001), avatar
`/avatars/somchai-mock.png`. Labels are real Thai copy, not placeholders.

## Gate 5 — build + verify

Build the bar tokens-only (React 17, `import React`), wire the muted→Danger swap.
Then verify against the running dev server — with the staleness guard, because
rsync-preserved mtimes can leave Vite serving an old compile:

```
~/.local/node16/bin/node .claude/skills/prototype-from-figma/scripts/verify-route.mjs \
  /telemed \
  --stale 'src/pages/telemed/TelemedConsultPage.jsx::mutedDanger' \
  --selector 'button[aria-label="วางสาย"]' \
  --shot /tmp/callcontrols.png
```

Exit 0 = renders clean + selector present; exit 3 = stale server (run the printed
restart command, then re-verify); exit 1 = a real error to fix.

## If a component had been missing (Gate 5 illustration)

Say the End Call button had no existing match. Instead of hand-rolling it as
production, log it to the missing-components sheet and stub it:

```csv
Component,Purpose,Figma node,Variants / props,Nearest existing,Tokens needed,Priority,Status
DangerCircleIconButton,Round destructive end-call button,JeQ… / 22:1455,"fill · lg · states",BrandCircleIconButton,none,High,proposed
```

Create it as a Google Sheet via the Google Drive MCP (or append `docs/missing-components.csv`),
share the URL, then build a `// PROTOTYPE stand-in` locally.
