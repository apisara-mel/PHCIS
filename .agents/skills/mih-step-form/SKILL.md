---
name: mih-step-form
description: >-
  Build MIH PHCIS multi-step record forms with sticky PatientCard, morph
  stepper band, and sticky footer actions (ยกเลิก / ย้อนกลับ / บันทึกร่าง /
  ถัดไป: [step]). Use when creating or migrating a step wizard form
  (pharmacy dispense, OPD screening, treatment/clinic record, observation,
  registration), or when the user mentions step form footer, ถัดไป, บันทึกร่าง,
  wizard footer, or form ที่เป็น step.
---

# MIH Step Form

Canonical chrome for **multi-step clinical / module forms** (not queue
worklists): sticky patient header + morph stepper + sticky bottom action bar.

**Reference implementations**
- Footer pattern (approved): [`PharmacyDispensePage.jsx`](../../../src/pages/pharmacy/PharmacyDispensePage.jsx)
- Same footer via shared `Footer`: [`ScreeningPage.jsx`](../../../src/pages/opd/ScreeningPage.jsx)
- Shell wrappers: [`FormShell.jsx`](../../../src/templates/FormShell.jsx), [`TreatmentFormShell.jsx`](../../../src/templates/TreatmentFormShell.jsx)
- Morph stepper: [wizard-morph-header](../wizard-morph-header/SKILL.md) → `RecordWizardMorphBand`

Button / slot details: [REFERENCE.md](REFERENCE.md)

## When to use

| Scenario | Use |
|----------|-----|
| New N-step record / dispense / screening form | ✅ |
| Migrate a long single-scroll form into steps | ✅ |
| Align footer to ยกเลิก / ย้อนกลับ / ถัดไป: [step] | ✅ |
| Sticky PatientCard + morph stepper on a record page | ✅ |

## When NOT to use

| Scenario | Use instead |
|----------|-------------|
| Queue / worklist page | `QueuePageShell` + [mih-table](../mih-table/SKILL.md) |
| QueuePageShell wizard (title+stepper only, no PatientCard) | [wizard-morph-header](../wizard-morph-header/SKILL.md) alone |
| Single-page form, no steps | Plain sticky `Footer` without step labels |

## Hard rules

1. **No top back on PatientCard** — pass `showBack={false}` (or `embedded` when SubHeader already owns title). Exit / prev live **only** in the sticky footer.
2. **Sticky PatientCard** — `sticky` so scroll-up keeps profile under the app header (collapses to compact). Morph band uses `stickyTop={MORPH_STICKY_BELOW_PATIENT}`.
3. **One stepper** — only via `RecordWizardMorphBand` / `WizardMorphHeader`. Do not duplicate `StepProgress` in the body.
4. **Footer left button switches by step**
   - Step 1 (`index === 0`): **ยกเลิก** → leave page / queue (no `arrow_back`).
   - Step 2+: **ย้อนกลับ** → previous step (`arrow_back` via Footer default). **No ยกเลิก.**
5. **บันทึกร่าง** always on the right group (discoverable). Wire a real draft save or toast.
6. **Primary = `ถัดไป: ${STEPS[i + 1].title}`** (space after colon). Last step swaps to the commit label (e.g. ยืนยันจ่ายยา / ส่งต่อไปยังแผนก / จบการบันทึก) — not another ถัดไป.
7. **Auto-save chip** — optional on step 1; **show on step 2+** (`showAutoSave={!isFirstStep}` with `Footer`).
8. **Tokens only** — no raw hex / px for chrome; use existing `Footer` / shell styles.

## Layout (top → bottom)

```
Header (breadcrumb)
PatientCard sticky showBack={false}
RecordWizardMorphBand stickyTop={MORPH_STICKY_BELOW_PATIENT}
scrollable step body
Footer sticky  ← ยกเลิก|ย้อนกลับ · (auto-save) · บันทึกร่าง · ถัดไป|commit
```

## Footer matrix

| | Step 1 | Step 2 … N−1 | Last step |
|---|--------|---------------|-----------|
| Left | ยกเลิก → exit | ย้อนกลับ → prev | ย้อนกลับ → prev |
| Auto-save | usually off | on | on |
| Middle-right | บันทึกร่าง | บันทึกร่าง | บันทึกร่าง |
| Primary | `ถัดไป: [step 2 title]` + `arrow_forward` | `ถัดไป: [next title]` + `arrow_forward` | commit label + domain icon (`check` / `move_down` / …) |

## Quick implementation (`Footer` component)

```jsx
import Footer from '@/components/layout/Footer';
import PatientCard from '@/components/card/PatientCard';
import RecordWizardMorphBand, { MORPH_STICKY_BELOW_PATIENT } from '@/components/layout/RecordWizardMorphBand';

const STEPS = [
  { title: 'ขั้น 1' },
  { title: 'ขั้น 2' },
  { title: 'ขั้น 3' },
];

// …
const isFirstStep = step === 0;
const isLastStep = step === STEPS.length - 1;
const primaryLabel = isLastStep
  ? 'ยืนยันบันทึก' // domain commit
  : `ถัดไป: ${STEPS[step + 1].title}`;

<PatientCard sticky showBack={false} patient={patient} title={pageTitle} />
<RecordWizardMorphBand
  title={pageTitle}
  steps={STEPS}
  current={step}
  onStepClick={setStep}
  stickyTop={MORPH_STICKY_BELOW_PATIENT}
/>
{/* step body */}
<Footer
  type='with BTN'
  sticky
  showAutoSave={!isFirstStep}
  autoSaveText={draftAutoSaveText}
  showButton3
  button3Label={isFirstStep ? 'ยกเลิก' : 'ย้อนกลับ'}
  onButton3Click={isFirstStep ? leavePage : goPrev}
  showButton2
  button2Label='บันทึกร่าง'
  button2Icon='save'
  onButton2Click={handleSaveDraft}
  showButton1
  button1Label={primaryLabel}
  button1TrailingIcon={isLastStep ? 'check' : 'arrow_forward'}
  onButton1Click={isLastStep ? handleCommit : goNext}
/>
```

Prefer reusing [`Footer.jsx`](../../../src/components/layout/Footer.jsx) over a one-off sticky bar unless the page already uses FormShell / TreatmentFormShell (those embed an equivalent bar).

## Checklist

- [ ] `PatientCard` has `sticky` + `showBack={false}` (or `embedded`)
- [ ] Stepper only in `RecordWizardMorphBand`
- [ ] Step 1 left = ยกเลิก (exit); step 2+ left = ย้อนกลับ (prev) — never both
- [ ] Primary non-last = `ถัดไป: ${nextTitle}`
- [ ] Last primary = commit action, not ถัดไป
- [ ] บันทึกร่าง always visible on the right
- [ ] No duplicate back control in Header / SubHeader / morph title
