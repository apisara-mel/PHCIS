---
name: ux-assessment
description: >-
  Evaluates UI for accessibility (WCAG 2.2 AA), usability, and heuristic design
  (Nielsen + healthcare context). Audits Figma frames or implemented React screens
  in MIH PHCIS. Use when the user asks for accessibility review, a11y audit,
  usability check, heuristic evaluation, UX assessment, contrast/touch/focus
  review, or WCAG compliance on a page or component.
---

# UX Assessment (Accessibility · Usability · Heuristics)

Structured review of **Figma designs** or **vibe-code screens** against WCAG 2.2 AA, Nielsen heuristics, and PHCIS clinical-usability constraints. Output a scored findings report — never a vague "looks fine."

## When to run

| Trigger | Artifact |
|---------|----------|
| "เช็ค accessibility / a11y / WCAG" | Figma node or `src/pages/**` |
| "usability review" | Flow + screen |
| "heuristic evaluation" | Full screen or journey |
| Before shipping a new queue/form/popup | Code + Figma parity |
| After `drawing-ui-on-figma` assembly | Figma frame |

**Companion skills:** [ux-ui-designer](../ux-ui-designer/SKILL.md) (domain flows) · [drawing-ui-on-figma](../drawing-ui-on-figma/SKILL.md) (Figma build) · [light-to-dark-mode](../light-to-dark-mode/SKILL.md) (contrast in dark)

## Workflow

```
UX Assessment:
- [ ] 1. Scope — artifact, role (MR/พยาบาล/แพทย์), primary task
- [ ] 2. Gather — screenshot, code, Figma context, user flow doc
- [ ] 3. Automated scan (code only) — scan-a11y.mjs
- [ ] 4. Accessibility pass — ACCESSIBILITY.md checklist
- [ ] 5. Heuristic pass — HEURISTICS.md (Nielsen + clinical)
- [ ] 6. Usability pass — task success, errors, Thai copy, density
- [ ] 7. Report — findings table + severity + quick wins
```

### Step 1 — Scope

Record:

- **Artifact:** Figma URL + node **or** route (`/treat/queue`) + file paths
- **Persona:** เวชระเบียน · พยาบาล OPD · แพทย์ CPOE · ผู้ป่วย mobile
- **Primary task:** one sentence ("เรียกคิวถัดไป", "บันทึก vitals", "ยืนยันนัด telemed")
- **Modes:** light / dark / brand switch if relevant

Read `docs/product-spec.md` + `docs/user-flow.md` when the screen is clinical.

### Step 2 — Gather evidence

**Figma:** `get_screenshot` + `get_design_context` + `get_variable_defs` on the target node.

**Code:** read the page + child components; note `aria-*`, labels, focus styles, token usage.

**Design system:** `design.md` §3–§4 for touch (`--dim-size-900` = 44px), focus rings, semantic text/background pairs.

### Step 3 — Automated scan (code)

From repo root:

```bash
node .claude/skills/ux-assessment/scripts/scan-a11y.mjs src/pages/treat/TreatmentQueuePage.jsx
node .claude/skills/ux-assessment/scripts/scan-a11y.mjs src/components/table
```

Treat script output as **candidates** — confirm each finding manually. Exit 0 does not mean WCAG-compliant.

### Step 4–6 — Manual passes

Work through [ACCESSIBILITY.md](ACCESSIBILITY.md) and [HEURISTICS.md](HEURISTICS.md). For usability, answer:

1. Can the user complete the primary task in ≤3 clicks from entry?
2. Are errors preventable (HN, dosage, wrong patient)?
3. Is the next action obvious without reading every label?
4. Does Thai copy use consistent verbs (บันทึก / ยกเลิก / ตกลง / ลบ)?
5. Does density match role (queue = scan; form = progressive disclosure)?

### Step 7 — Report format

Use this structure in the response:

```markdown
# UX Assessment — <Screen name>

**Artifact:** … · **Persona:** … · **Task:** …

## Summary
| Area | Score (1–5) | Critical | Major | Minor |
|------|-------------|----------|-------|-------|
| Accessibility | | | | |
| Heuristics | | | | |
| Usability | | | | |

## Findings

| ID | Sev | Area | Location | Issue | Recommendation | Ref |
|----|-----|------|----------|-------|----------------|-----|
| A1 | Critical | A11y | … | … | … | WCAG 1.4.3 |
| H1 | Major | Heuristic | … | … | … | Nielsen #5 |
| U1 | Minor | Usability | … | … | … | — |

## Quick wins (≤30 min)
1. …

## Follow-ups (design / eng)
1. …
```

**Severity:**

| Level | Meaning |
|-------|---------|
| **Critical** | Blocks task, legal/clinical risk, WCAG A failure, wrong-patient risk |
| **Major** | Significant friction, AA failure, heuristic violation on core path |
| **Minor** | Polish, edge case, nice-to-have AA AAA |
| **Suggestion** | Enhancement, not required for ship |

## MIH-specific gates (always check)

| Gate | Rule |
|------|------|
| **Touch target** | Interactive control ≥ `--dim-size-900` (44px) on mobile/kiosk; icon buttons use `accessibilityLabel` |
| **Focus visible** | Keyboard focus ring on custom inputs (see CLAUDE.md chrome-free inputs + focus tokens) |
| **Color only** | Status never conveyed by color alone — add icon, label, or badge text |
| **Contrast** | Text/surface pairs from semantic tokens; verify light **and** dark (`data-theme=dark`) |
| **Icon buttons** | `accessibilityLabel` or `aria-label` — Material Symbols via `<Icon>` / `<Sym>` |
| **Tables** | Sortable headers identifiable; row action not only color; empty state has message |
| **Modals** | Focus trap, Esc/close, destructive = Danger button, confirm for irreversible clinical actions |
| **Thai text** | No truncation without tooltip on HN/name; avoid ALL CAPS Thai |
| **Time pressure** | Queue screens: high scannability; forms: clear step progress |
| **PDPA / consent** | Explicit opt-in copy; no pre-checked sensitive toggles |

## Figma vs code parity

When both exist, flag **drift**:

- Touch size smaller in code than Figma
- Missing focus/hover/disabled state in one artifact
- Token vs hardcoded hex (contrast drift risk)
- Component variant missing (e.g. error state only in Figma)

## Anti-patterns in reviews

- ❌ "Accessibility looks OK" without citing WCAG criterion
- ❌ Checking only color contrast, ignoring keyboard and screen reader
- ❌ Ignoring clinical error-prevention (wrong patient, wrong dose)
- ❌ Reviewing happy path only — skip empty/error/disabled/long-text
- ❌ Suggesting non-token colors instead of semantic token fixes

## Resources

- [ACCESSIBILITY.md](ACCESSIBILITY.md) — WCAG 2.2 AA checklist + MIH mapping
- [HEURISTICS.md](HEURISTICS.md) — Nielsen 10 + healthcare extensions
- [scripts/scan-a11y.mjs](scripts/scan-a11y.mjs) — automated code heuristics
