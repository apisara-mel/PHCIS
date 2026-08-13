---
name: wizard-morph-header
description: >-
  Adds or migrates multi-step wizard pages to the sticky scroll-morph header
  (WizardMorphHeader + StepProgress). Use when building a new step wizard in
  QueuePageShell, migrating framed StepProgress out of content cards, fixing
  header/stepper morph layout, or when the user mentions wizard morph header,
  sticky stepper, or scroll-collapsing wizard chrome.
---

# Wizard Morph Header

Central pattern for **QueuePageShell multi-step wizards** whose title + horizontal
`StepProgress` live in a **sticky white header band** that morphs on scroll:
expanded → title full row, stepper centred below · collapsed → title left,
stepper right, vertically centred.

**Source of truth (code):**
- [`WizardMorphHeader.jsx`](../../../src/components/layout/WizardMorphHeader.jsx)
- [`StepMorphHeader.jsx`](../../../src/components/layout/StepMorphHeader.jsx)
- [`headerMorphStyles.js`](../../../src/components/layout/headerMorphStyles.js)
- [`useGlobalHeaderMorph.js`](../../../src/hooks/useGlobalHeaderMorph.js)

Architecture details: [REFERENCE.md](REFERENCE.md)

## When to use

| Scenario | Use this skill |
|----------|----------------|
| New N-step wizard page in `QueuePageShell` | ✅ |
| Existing page with `StepProgress framed` at top of content card | ✅ migrate |
| User asks for scroll-morph / sticky stepper header | ✅ |

## When NOT to use

| Scenario | Use instead |
|----------|-------------|
| Vertical step rail (sidebar stepper) | Custom rail — not this pattern |
| Single-page form, no steps | `QueuePageShell` `title` SubHeader only |
| Component library demos | Plain `StepProgress` variants for docs |

## Record forms & popups

Pages that are **not** `QueuePageShell` wizards (registration, CPOE/clinic
records, OPD screening, pharmacy dispense, telemed assessment, observation)
use [`RecordWizardMorphBand.jsx`](../../../src/components/layout/RecordWizardMorphBand.jsx)
— same dense `WizardMorphHeader`, sticky under PatientCard / tabs / topbar.

Modal wizards (e.g. `ConsentFormEditPopup`) use `PageHeaderInfoPanel dense` +
`WizardMorphHeader` inside the popup body (non-sticky; morph follows page scroll).

## Hard rules

1. **One stepper** — render steps only via `WizardMorphHeader`; never duplicate
   `StepProgress` in the page body (except popup variants of the same flow).
2. **Title in morph header** — do not also pass `title=` on `QueuePageShell`
   SubHeader. Use `onBack` alone when a back button is needed.
3. **Shell props** — always spread `WIZARD_MORPH_SHELL_PROPS` on `QueuePageShell`.
4. **Tokens only** — morph styles already use `design.md` tokens via CSS vars;
   do not add literals in page code.
5. **Global morph listener** — `HeaderMorphRoot` in `App.jsx` must stay mounted
   (sets `--header-morph` / `--header-morph-motion` on `:root`). Do not add a
   second scroll listener on the page.
6. **Stepper in header bounds** — step slot is in-flow (`stepArea`); do not
   revert to root-level `position: absolute` on the stepper (bleeds into body).

## Quick implementation

```jsx
import QueuePageShell from '@/templates/QueuePageShell';
import WizardMorphHeader, { WIZARD_MORPH_SHELL_PROPS } from '@/components/layout/WizardMorphHeader';

const STEPS = ['ขั้น 1', 'ขั้น 2', 'ขั้น 3'];

export default function MyWizardPage() {
  const [step, setStep] = useState(0);

  return (
    <QueuePageShell
      activeKey='…'
      breadcrumb={['…']}
      onBack={() => navigate.push('/…')}
      {...WIZARD_MORPH_SHELL_PROPS}
      headerInfo={(
        <WizardMorphHeader
          title='ชื่อ wizard'
          steps={STEPS}
          current={step}
          onStepClick={(idx) => { if (idx < step) setStep(idx); }}
          afterTitle={optionalBadge}
          completedSteps={optionalBooleans}
        />
      )}
    >
      {/* step body — NO StepProgress here */}
    </QueuePageShell>
  );
}
```

### `WizardMorphHeader` props

| Prop | Required | Notes |
|------|----------|-------|
| `title` | ✅ | Page topic (tertiary title typography) |
| `steps` | ✅ | string[] or StepProgress step objects |
| `current` | ✅ | 0-based active index |
| `onStepClick` | optional | Usually allow backward navigation only |
| `afterTitle` | optional | Badge/chip beside title (e.g. version chip) |
| `completedSteps` | optional | Validation-gated ✓ marks; omit for visit-order only |
| `labelNoWrap` | default `true` | Keep step labels on one line in dense header |
| `stepProgressClassName` | default `'justify-center'` | |

## Migration checklist (framed stepper → morph header)

```
Wizard morph migration:
- [ ] 1. Import WizardMorphHeader + WIZARD_MORPH_SHELL_PROPS
- [ ] 2. Remove QueuePageShell `title=` (keep `onBack` if needed)
- [ ] 3. Add {...WIZARD_MORPH_SHELL_PROPS} + headerInfo={<WizardMorphHeader … />}
- [ ] 4. Delete framed/plain StepProgress from content card top
- [ ] 5. Map step index: const idx = STEPS.findIndex(…) or use numeric state
- [ ] 6. Verify expanded spacing (title padding) + collapsed vertical centre
- [ ] 7. Scroll test — stepper stays inside white header, no overlap on body
```

## Reference implementations

| Page | Path |
|------|------|
| Consent create wizard | [`CreateConsentFormPage.jsx`](../../../src/pages/consent/CreateConsentFormPage.jsx) |
| Consent edit popup | [`CreateConsentFormPage.jsx`](../../../src/pages/consent/CreateConsentFormPage.jsx) (`ConsentFormEditPopup`) |
| Add service center | [`AddCenterPage.jsx`](../../../src/pages/system/AddCenterPage.jsx) |
| Create / edit assess user | [`AssessUserCreatePage.jsx`](../../../src/pages/assess/AssessUserCreatePage.jsx) |
| Registration record | [`FormShell.jsx`](../../../src/templates/FormShell.jsx) |
| CPOE / clinic records | [`TreatmentFormShell.jsx`](../../../src/templates/TreatmentFormShell.jsx) |
| OPD screening | [`ScreeningPage.jsx`](../../../src/pages/opd/ScreeningPage.jsx) |
| Telemed assessment | [`TelemedAssessmentPage.jsx`](../../../src/pages/telemed/TelemedAssessmentPage.jsx) |
| Pharmacy dispense | [`PharmacyDispensePage.jsx`](../../../src/pages/pharmacy/PharmacyDispensePage.jsx) |
| Observation detail | [`ObservationDetailPage.jsx`](../../../src/pages/observation/ObservationDetailPage.jsx) |

## Record forms (`RecordWizardMorphBand`)

For pages with PatientCard / SubHeader instead of `QueuePageShell`:

```jsx
import RecordWizardMorphBand, {
  MORPH_STICKY_BELOW_PATIENT,
} from '@/components/layout/RecordWizardMorphBand';

<PatientCard sticky … />
<RecordWizardMorphBand
  title='คัดกรองและซักประวัติ'
  steps={STEPS}
  current={step}
  onStepClick={setStep}
  stickyTop={MORPH_STICKY_BELOW_PATIENT}
/>
{/* body card — no StepProgress */}
```

Constants: `MORPH_STICKY_BELOW_TOPBAR` (64), `MORPH_STICKY_BELOW_PATIENT` (128),
`MORPH_STICKY_BELOW_TABS` (112).

## Domain wrapper (optional)

When a wizard needs fixed title copy + domain badges, wrap once per page:

```jsx
const ConsentWizardHeader = React.memo(({ step, prefill, onStepClick }) => (
  <WizardMorphHeader
    title='สร้างแบบฟอร์มจัดการความยินยอมใหม่'
    afterTitle={prefill?.fromVersion ? <VersionBadge … /> : null}
    steps={STEPS}
    current={step}
    onStepClick={onStepClick}
  />
));
```

Do not fork morph styles into the page — only pass props.

## Tuning motion (rare)

Adjust in [`useGlobalHeaderMorph.js`](../../../src/hooks/useGlobalHeaderMorph.js):

- `HEADER_MORPH_RANGE` — px scroll for 0→1 (default 160)
- `HEADER_MORPH_LERP` — follow smoothness (default 0.11, lower = silkier)

Layout/spacing tweaks → [`headerMorphStyles.js`](../../../src/components/layout/headerMorphStyles.js)
dense exports only; share changes across all wizard pages.
