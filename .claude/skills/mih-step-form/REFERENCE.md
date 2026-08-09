# MIH Step Form — Reference

## Components

| Piece | Path | Role |
|-------|------|------|
| Sticky footer slots | `src/components/layout/Footer.jsx` | `button3` left · auto-save · `button2` draft · `button1` primary |
| Patient sticky header | `src/components/card/PatientCard.jsx` | `sticky`, `showBack={false}` |
| Morph stepper band | `src/components/layout/RecordWizardMorphBand.jsx` | under PatientCard |
| Draft toast (optional) | `src/components/alert/PhcisTopToast.jsx` | after บันทึกร่าง |
| Registration shell | `src/templates/FormShell.jsx` | embeds equivalent footer |
| CPOE / clinic shell | `src/templates/TreatmentFormShell.jsx` | embeds equivalent footer |

## Footer prop map

`Footer` Figma slots (node 1:2629):

| Slot | Prop prefix | Step-form use |
|------|-------------|---------------|
| Button 3 (left) | `button3*` | ยกเลิก / ย้อนกลับ |
| Auto-save | `showAutoSave`, `autoSaveText` | Off on step 1; on from step 2 |
| Button 2 | `button2*` | บันทึกร่าง + `save` icon |
| Button 1 | `button1*` | ถัดไป: … / commit |

`button3Icon` defaults to `arrow_back` only when `button3Label === 'ย้อนกลับ'`. Leave unset for ยกเลิก.

Primary forward actions use **`button1TrailingIcon`** (`arrow_forward`), not leading — matches Brand Button / Screening.

## Canonical pages

| Page | Notes |
|------|--------|
| `PharmacyDispensePage.jsx` | Approved footer matrix; last = ยืนยันจ่ายยา |
| `ScreeningPage.jsx` | Always shows auto-save; last = ส่งต่อไปยังแผนก |
| `ObservationDetailPage.jsx` | Custom sticky bar (same labels), not shared `Footer` |
| `FormShell.jsx` / `TreatmentFormShell.jsx` | Inline footer; same left/right rules |

## Primary label helper

```js
const nextStepLabel = isLast
  ? COMMIT_LABEL
  : `ถัดไป: ${steps[stepIndex + 1].title ?? steps[stepIndex + 1]}`;
```

Support both `{ title }` objects (dispense / treatment) and plain strings (screening).

## Related skills

- [wizard-morph-header](../wizard-morph-header/SKILL.md) — stepper morph band / QueuePageShell wizards
- [mih-table](../mih-table/SKILL.md) — tables inside a step body
- [wizard-morph-header](../wizard-morph-header/SKILL.md) Record forms section — when to use `RecordWizardMorphBand` vs `WizardMorphHeader` on QueuePageShell
