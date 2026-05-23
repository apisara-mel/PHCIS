# MIH PHCIS — Product Spec

Companion document to [design.md](../design.md). `design.md` is the **design-system
reference** (tokens, components, variants); this file is the **product spec** —
purpose, user flow, page logic, data shapes, and validation rules for every
subsystem in the app.

The codebase is a [Vite](../vite.config.mjs) + React 17 SPA. Routing is
`react-router-dom@5` (Switch/Route). State is per-page (no Redux / no
React Query) — the page that owns a flow also owns its `form` state object
and threads it through step bodies via `{ form, setForm }`. Mock data lives
in [src/data/](../src/data/) and is imported synchronously; there is no API
client. Persistence is opportunistic: only the OPD draft list is kept in
`sessionStorage` ([opdScreeningDrafts.js](../src/data/opdScreeningDrafts.js)).

---

## Table of Contents

1. [Architecture & Conventions](#1-architecture--conventions)
2. [Routes Map](#2-routes-map)
3. [Cross-cutting Patterns](#3-cross-cutting-patterns)
4. [Dashboard](#4-dashboard)
5. [OPD Screening](#5-opd-screening)
6. [Registration (เวชระเบียน)](#6-registration-เวชระเบียน)
7. [Treatment / CPOE](#7-treatment--cpoe)
8. [Forms Library (คลังแบบฟอร์ม)](#8-forms-library-คลังแบบฟอร์ม)
9. [Users & Access](#9-users--access)
10. [Dev Tools](#10-dev-tools)
11. [Appendix — Pitfalls & Gotchas](#11-appendix--pitfalls--gotchas)

---

## 1. Architecture & Conventions

| Concern | Choice | Notes |
|---|---|---|
| Bundler | Vite 2 | [vite.config.mjs](../vite.config.mjs) pins `host: '127.0.0.1'` to avoid a `uv_interface_addresses` crash that fired with default host binding. |
| React | 17 (no React-18 hooks) | `useId`, `useSyncExternalStore`, `useDeferredValue`, `useTransition`, `useInsertionEffect` are unavailable — they import as `undefined` and crash at render. |
| Router | `react-router-dom@5` (Switch + Route) | See [routes/Routes.jsx](../src/routes/Routes.jsx). |
| Styling | Tailwind 2 (JIT) + design tokens via CSS variables | Token reference lives in [design.md §6](../design.md). Inline `style={{ }}` uses tokens, not raw hex. |
| Fonts | Self-hosted Inter + Sarabun (CDN) + Material Symbols (CDN) | See [index.html](../index.html). |
| State | Per-page `useState` for the entire flow's form object | E.g. [RegistrationFormPage.jsx:33](../src/pages/registration/RegistrationFormPage.jsx#L33), [TreatmentFormPage.jsx:163-164](../src/pages/treat/TreatmentFormPage.jsx#L163-L164). |
| Persistence | sessionStorage for OPD drafts only | [opdScreeningDrafts.js](../src/data/opdScreeningDrafts.js). |
| Mocks | Static exports from `src/data/*.js` | Identity master is [patientProfiles.js](../src/data/patientProfiles.js); MR shape is [mrPatients.js](../src/data/mrPatients.js). |
| Brand mode | Multi-brand CSS variable swap | Documented in [design.md §2](../design.md). |
| Voice input | Web SpeechRecognition (Chrome/Edge/Safari) | Requires HTTPS or localhost. Wrapped by [SuggestibleTextarea](../src/components/forms/SuggestibleTextarea.jsx) + [speechRecognition.js](../src/utils/speechRecognition.js). |
| Camera | `getUserMedia` (desktop) + `<input capture>` (mobile) | Helpers in [cameraDevice.js](../src/utils/cameraDevice.js) + [useTakePhotoCapture.js](../src/hooks/useTakePhotoCapture.js). |

**Folder layout** (relevant):
```
src/
  data/        ← mock rosters, validators, helpers
  pages/       ← one folder per route domain
  components/  ← presentational + design-system primitives
  templates/   ← page shells (FormShell, TreatmentFormShell, QueuePageShell)
  routes/      ← Routes.jsx
  hooks/       ← cross-page hooks (useTakePhotoCapture, useSearchHistory, …)
  utils/       ← camera / speech / formatting helpers
```

---

## 2. Routes Map

Source of truth: [src/routes/Routes.jsx](../src/routes/Routes.jsx).

| Path | Page | Purpose |
|---|---|---|
| `/`, `/dashboard` | [DashboardPage](../src/pages/dashboard/DashboardPage.jsx) | Hospital-overview KPIs + clinical analytics cards |
| `/opd`, `/opd/queue` | [QueuePage (OPD)](../src/pages/opd/QueuePage.jsx) | OPD screening queue |
| `/opd/screening` | [ScreeningPage](../src/pages/opd/ScreeningPage.jsx) | 5-step nurse screening form |
| `/registration`, `/registration/queue` | [RegistrationQueuePage](../src/pages/registration/RegistrationQueuePage.jsx) | เวชระเบียน roster |
| `/registration/register` | [RegistrationFormPage](../src/pages/registration/RegistrationFormPage.jsx) | 5-step ลงทะเบียน form (chip read) |
| `/treat`, `/treat/queue` | [TreatmentQueuePage](../src/pages/treat/TreatmentQueuePage.jsx) | คิวตรวจรักษา (OPD CPOE) |
| `/treat/record` | [TreatmentFormPage](../src/pages/treat/TreatmentFormPage.jsx) | 7-step บันทึกการรักษา |
| `/forms` | [FormsLibraryPage](../src/pages/forms/FormsLibraryPage.jsx) | คลังแบบฟอร์ม hub |
| `/forms/category/:categoryKey` | [FormsCategoryPage](../src/pages/forms/FormsCategoryPage.jsx) | Category drill-down with cards + pagination |
| `/forms/:slug` | [FormDetailPage](../src/pages/forms/FormDetailPage.jsx) | Form detail + field-preview list + QR target |
| `/forms/:slug/fill` | [FormFillPage](../src/pages/forms/FormFillPage.jsx) | Live fillable form (`?role=patient` strips clinician chrome) |
| `/users` | [UsersAccessPage](../src/pages/users/UsersAccessPage.jsx) | User list with role/department filters |
| `/users/new`, `/users/:id` | [UserEditPage](../src/pages/users/UserEditPage.jsx) | Edit / create user + access matrix |
| `/components`, `/components/:slug` | [ComponentsLibraryPage](../src/pages/components/ComponentsLibraryPage.jsx) | Live design-system showcase (dev only) |
| `/preview/tabs` | [TabsPreviewPage](../src/pages/preview/TabsPreviewPage.jsx) | Tab variants showcase (dev only) |
| `/preview/cards` | [CardsPreviewPage](../src/pages/preview/CardsPreviewPage.jsx) | Card variants showcase (dev only) |
| `/preview/body-record` | [BodyRecordPreviewPage](../src/pages/preview/BodyRecordPreviewPage.jsx) | Body diagram + drawing canvas (dev only) |

**Cross-page navigation contract** — when a queue row navigates to a form
page it carries router state `{ hn, queue, name }`. The destination page
looks the patient up by `hn` against the appropriate roster
([PATIENT_PROFILES](../src/data/patientProfiles.js), [MR_PATIENTS](../src/data/mrPatients.js),
[TREATMENT_QUEUE_ROWS](../src/data/treatmentQueue.js)). Direct visits without
state fall back to a default profile (each page guards its lookup).

---

## 3. Cross-cutting Patterns

### 3.1 StepProgress check-mark rule

Component: [src/components/step/StepProgress.jsx](../src/components/step/StepProgress.jsx).

A step circle renders in one of three types:

| Type | Visual | When |
|---|---|---|
| `current` | brand-filled circle with 4-px outer ring, bold title | `idx === current` (always wins) |
| `success` | brand-filled circle with animated check mark | `completedSteps[idx] === true` (or `idx < current` when prop omitted) |
| `default` | neutral filled circle with step number | otherwise |

The `completedSteps={[bool, …]}` prop ([StepProgress.jsx:213-237](../src/components/step/StepProgress.jsx#L213-L237))
is the opt-in validation gate added so a step earns ✓ only when its
required fields are filled — not just because the user has advanced past
it. Parents compute the array; the component never validates on its own.

Per-form validators:
- Registration → [`getRegistrationCompletedSteps(form)`](../src/data/registrationForm.js) — array of 5 booleans, derived from the `<Field required>` markers in [RegistrationSteps.jsx](../src/components/forms/RegistrationSteps.jsx).
- Treatment → [`getTreatmentCompletedSteps(form, stepIndex)`](../src/data/treatmentVisits.js) — array of 7 booleans. Steps 1, 2, 3, 5 use advance-past semantics (no clear required field); Steps 4, 6, 7 use real validators.
- OPD Screening → computed inline from `stepValidities[idx]` ([ScreeningPage.jsx](../src/pages/opd/ScreeningPage.jsx)) — step bodies opt in by calling `onValidityChange(boolean)`; steps that haven't adopted the protocol fall back to advance-past semantics.

### 3.2 Dirty tracking + unsaved-changes guard

Pattern lives most fully in [ScreeningPage.jsx:823-921](../src/pages/opd/ScreeningPage.jsx#L823-L921):

- **`dirtyStepsRef` (ref) + `dirtySteps` (state mirror)** — per-step Set of touched steps.
- **`markDirty`** — listens to `onKeyDown` and `onPointerDown` on the form wrapper (NOT `onChange` / `onInput`, because those fire on autofill / library `dispatchEvent` calls). Gates on `event.isTrusted` and on `aria-pressed` / `aria-label="decrement|increment"` for pointer presses, so only real user gestures flip the flag.
- **Save-draft button** — visible always; disabled when `!anyDirty` so clicking it doesn't persist an empty draft.
- **Next button** — disabled until `currentStepValid` is true. `currentStepValid` is `stepValidities[current] ?? currentStepDirty` — explicit validity wins over the dirty-proxy heuristic.
- **Unsaved-changes popup** ([UnsavedChangesPopup](../src/components/popup/UnsavedChangesPopup.jsx)) fires from `handleBack` when `dirtyStepsRef.current.size > 0`. Outcomes: save-draft + leave, discard + leave, cancel.

The Registration and Treatment shells do not (yet) replicate the full
dirty-tracking pattern — they rely on form state being kept on the page
and on the StepProgress check mark for completion feedback.

### 3.3 PrimarySearch + history

Search bar component: [PrimarySearch](../src/components/search/PrimarySearch.jsx). Recent-search
history is page-scoped via `localStorage` key passed to
[useSearchHistory](../src/components/search/useSearchHistory.js).

| Page | localStorage key | Seed builder |
|---|---|---|
| OPD queue | `mih:primarysearch-history:opd-queue` | `buildOpdSearchHistorySeed` |
| Registration queue | (page-local) | `buildRegistrationSearchHistorySeed` |
| Treatment queue | `mih:primarysearch-history:treatment-queue` | `buildTreatmentSearchHistorySeed` |

Search history seed builders live in [primarySearchHistorySeeds.js](../src/data/primarySearchHistorySeeds.js).

The OPD queue also adopts `PrimarySearch`'s `inputCaptureWarning` chrome
prereqs documented in CLAUDE.md (`.mih-<component>-input` stripping
browser-default form chrome) — search wrapper owns the border / focus
ring so the inner native input must be chrome-free. The same rule applies
to any new search-like component (see [CLAUDE.md](../CLAUDE.md)).

### 3.4 Voice + AI inputs

- **[SuggestibleTextarea](../src/components/forms/SuggestibleTextarea.jsx)** — textarea with mic + language toggle + typing suggestions. Used pervasively across clinician-typed fields. Every voice textarea in this project **must** ship with `suggestions` + `minChars` — bare `VoiceTextarea` is forbidden by project convention.
- **[AISearch / Doctor AI](../src/components/search/AISearch.jsx)** — search field that powers Treatment Step 4's ICD-10 lookup (`icdQuery` state). Pre-defined recommended states (DEFAULT, FOCUSED, FILLED) with brand-tinted borders.
- **[VoiceTextarea](../src/components/forms/VoiceTextarea.jsx)** — lower-level primitive; do not use directly in clinician fields.

Helpers: [speechRecognition.js](../src/utils/speechRecognition.js) wraps the
browser's `SpeechRecognition` / `webkitSpeechRecognition` constructor and
requests mic permission via `getUserMedia` before starting recognition
(workaround for mobile browsers that swallow the SR prompt).

**HTTPS requirement** — SpeechRecognition and `getUserMedia(audio)`
require a secure context. Plain HTTP over LAN works for camera via
`<input capture>` but **does not work for voice**.

### 3.5 Camera flow

Hook: [useTakePhotoCapture](../src/hooks/useTakePhotoCapture.js) — used by the
Registration "ถ่ายรูป" button.

Two branches:
- **Mobile** → `<input type='file' capture>` opens the OS camera app. No HTTPS needed.
- **Desktop** → [CameraCapturePopup](../src/components/popup/CameraCapturePopup.jsx) with `getUserMedia` + device picker. Auto-prefers phone-like devices (Continuity Camera, USB phone, DroidCam) via [`pickPreferredVideoDeviceId`](../src/utils/cameraDevice.js).
- **In-app browsers** (LINE / Facebook / Instagram) — detected by `prefersInPageCameraPopup`. Falls back to the in-page popup since `<input capture>` is unreliable in those browsers.

### 3.6 Smart card chip read (Registration only)

Trigger: "อ่านบัตรสมาร์ทการ์ด" CTA in the Registration sub-header.

Handler: `applySmartCardRead(form, patient)` in [registrationForm.js:301](../src/data/registrationForm.js#L301) — merges chip-sourced fields into the form, then re-applies user-typed values for fields the real ID chip does NOT carry (`NON_CHIP_FIELDS = ['education', 'occupation', 'marital']` — [registrationForm.js:299](../src/data/registrationForm.js#L299)).

Chip read locks card-sourced fields (`disabled={fromChip}` on prefixTh / firstNameTh / lastNameTh / prefixEn / gender / nationalId / idIssueDate / idExpiryDate / addressRegistered) until cleared.

### 3.7 PatientCard sticky behaviour

Component: [PatientCard](../src/components/card/PatientCard.jsx).

When `sticky` prop is set, the card mounts an IntersectionObserver
sentinel + sticky wrapper internally. As the page scrolls and the card
tucks under the app header, it collapses to a compact "mini" layout
showing fullName + insurance pill only. Used by [TreatmentFormPage](../src/pages/treat/TreatmentFormPage.jsx) and [ScreeningPage](../src/pages/opd/ScreeningPage.jsx).

### 3.8 Step transition animation

Module: [src/components/step/stepTransition.js](../src/components/step/stepTransition.js). Hook `useStepDirection(stepIndex)` tracks forward / backward navigation so the step wrapper sets `data-direction` and the CSS keyframe animation slides content in from the corresponding side. The wrapper `key={stepIndex}` re-mount is what triggers the animation each step change.

### 3.9 Component Guidelines (Do / Don't)

All 118 routed components in the Components Library carry a `<Guidelines>` panel — three arrays summarising:

- **`behavior`** — semantic / accessibility contract, state resolution rules, ARIA wiring, project-specific tech gotchas (HTTPS for voice, chrome-stripping rule, etc.).
- **`dos`** — when + why to use the component, common pairings, recommended sizes / variants per context.
- **`donts`** — anti-patterns from real incidents (e.g. bare `VoiceTextarea` rule, missing aria-label for icon-only buttons), confusable alternatives ("use BrandSubdueButton not BrandButton when paired with primary").

**Where to read:**
- **Live viewer:** [docs/design-system.html](design-system.html) → pick a component → **Live** tab → Guidelines panel at the bottom of the Section.
- **Canonical source:** [src/pages/components/ComponentsLibraryPage.jsx](../src/pages/components/ComponentsLibraryPage.jsx). Each demo function ends with `<Guidelines behavior={[...]} dos={[...]} donts={[...]} />` inside its `<Section>`.

**Where NOT to read:** [design.md](../design.md). The token document is intentionally token-only — Guidelines live next to the live demo so they update with the same review as code changes.

When adding or editing a component:
1. Update token tables in design.md (visual contract).
2. Update the demo in ComponentsLibraryPage.jsx, including the `<Guidelines>` block.
3. The Guidelines panel auto-appears in `docs/design-system.html` (it embeds the live demo via iframe).

---

## 4. Dashboard

**Purpose.** Single-page hospital overview + clinical analytics. Lands on
`/` for any logged-in user, surfaces yearly KPIs and 14+ pre-built chart
cards (population pyramid, top-10 diseases, NCD control gauges, etc.).
Read-only.

**Routes** — `/`, `/dashboard` → [DashboardPage.jsx](../src/pages/dashboard/DashboardPage.jsx).

**Page structure** ([DashboardPage.jsx:42-51](../src/pages/dashboard/DashboardPage.jsx#L42-L51)):

1. **Year selector** (Dropdown — defaults to ปีงบประมาณ 2569).
2. **Hospital Overview banner** — 6 KPI cards: ประชากร / เกิด / เสียชีวิต / การรับบริการสะสม / ค่าบริการสะสม / หน่วยบริการ. Rendered via [SummaryCardsBar](../src/components/layout/SummaryCardsBar.jsx) variant `banner`.
3. **Big chart cards** — [PopulationPyramidCard](../src/components/graph/BigCharts.jsx), [OpdTypeLineCard](../src/components/graph/BigCharts.jsx), [ResidencePieCard](../src/components/graph/BigCharts.jsx), [ServiceCenterMapCard](../src/components/graph/BigCharts.jsx) (Leaflet map).
4. **Standard cards** — top-10 diseases, visit totals, age-service pyramid, rights donut, monthly visits, disease-21 groups, DM/HT new patients, DM/HT control gauges, working-age groups, COC, consent rate, DM complications. All from [DashboardCards.jsx](../src/components/graph/DashboardCards.jsx).
5. **Recent patients table** — [DashboardPage.jsx:76-…](../src/pages/dashboard/DashboardPage.jsx#L76) — mock list of last few visits.

**Data shape.** Year-pinned mock values per chart card. No live API.

**Pitfalls.** Leaflet's CSS and JS are loaded from a CDN ([index.html](../index.html)) and integrity-checked; if the SRI hash drifts the map silently breaks.

---

## 5. OPD Screening

**Purpose.** Nurse / triage workflow: pick a patient from the OPD queue, complete the 5-step screening form, hand off to the doctor (Treatment / CPOE).

**Routes & navigation.**
- `/opd`, `/opd/queue` → [QueuePage](../src/pages/opd/QueuePage.jsx)
- Queue row click → `/opd/screening` with router state `{ hn, queue, name }`
- Screening form → after the final step ("บันทึกข้อมูลผู้ป่วย" / Save), workflow returns to the queue with the row's status flipped or a draft saved in `sessionStorage`.

### 5.1 OPD Queue page

[QueuePage.jsx](../src/pages/opd/QueuePage.jsx) (~946 lines).

- **Breadcrumb:** "ระบบงานผู้รับบริการนอก (OPD)".
- **Summary cards (6, in one row)** — ผู้รับบริการรวมวันนี้ / Walk-in / Telemedicine / นัดหมายวันนี้ / กำลังรอคัดกรอง / คัดกรองเสร็จ ([QueuePage.jsx:29-36](../src/pages/opd/QueuePage.jsx#L29-L36)).
- **Tabs** — ทั้งหมด / รอคัดกรอง / กำลังคัดกรอง / คัดกรองแล้ว / ที่ร่างไว้ ([L45-51](../src/pages/opd/QueuePage.jsx#L45-L51)). The "ที่ร่างไว้" tab is populated by `applyOpdScreeningDrafts(rows)` ([opdScreeningDrafts.js](../src/data/opdScreeningDrafts.js)) — drafts persist across reloads via `sessionStorage`.
- **Filters** — แผนก / แพทย์ / ประเภท (walkin / appointment_hospital / telemedicine) / วันที่ (FilterDateTag) / เวลา.
- **Search** — [PrimarySearch](../src/components/search/PrimarySearch.jsx) with page-scoped history key `mih:primarysearch-history:opd-queue`.
- **Table** — 12 columns: queue pill, patient (avatar + name link), HN, gender, age, type, room, doctor, status pill, vitals (BP / HR / SpO2), time, actions. Row click → screening.
- **Delete-row popup** — [DeleteQueueConfirmPopup](../src/components/popup/DeleteQueueConfirmPopup.jsx) (edit-mode action).

### 5.2 Screening form (5 steps)

[ScreeningPage.jsx](../src/pages/opd/ScreeningPage.jsx) (~1069 lines).

**Confirm-on-entry popup** — [ScreeningConfirmPopup](../src/components/popup/ScreeningConfirmPopup.jsx) opens on first mount; cancel returns to the queue, confirm starts the form ([ScreeningPage.jsx:813-818](../src/pages/opd/ScreeningPage.jsx#L813-L818)).

**Steps** (`STEPS` at [ScreeningPage.jsx:29-35](../src/pages/opd/ScreeningPage.jsx#L29-L35)):

| # | Title | Body | Validity protocol | Key components |
|---|---|---|---|---|
| 1 | สัญญาณชีพ | [VitalsForm](../src/components/forms/VitalsForm.jsx) — BP, HR, RR, Temp, SpO2, weight, height | `onValidityChange` ✓ | VitalCard, PressureCard, Stepper |
| 2 | อาการป่วย | Inline SymptomStep ([ScreeningPage.jsx:443-…](../src/pages/opd/ScreeningPage.jsx#L443)) — CC, duration, present illness textareas + Pain / Triage / Care orders / Cert chip groups | `onValidityChange` ✓ | Textarea, SuggestibleTextarea, SelectableCardButton, BedSelectionPopup |
| 3 | ประวัติการแพ้ยา / สารเคมี | [AllergyForm](../src/components/forms/AllergyForm.jsx) — history-list card with "ไม่แพ้ยา" toggle | `onValidityChange` ✓ | HistoryListForm |
| 4 | ประวัติโรคประจำตัว | [ScreeningStep4](../src/pages/opd/ScreeningStep4.jsx) → [DiseaseForm](../src/components/forms/DiseaseForm.jsx) | `onValidityChange` ✓ | HistoryListForm |
| 5 | แบบฟอร์ม | [FormsLibrary](../src/components/forms/FormsLibrary.jsx) — picks consent / assessment forms to attach | (not yet adopted) | FormsLibrary widget |

**Required-fields → check-mark rule.** Step bodies that have adopted the
`onValidityChange` protocol report a boolean into `stepValidities[idx]`.
[ScreeningPage.jsx:884-895](../src/pages/opd/ScreeningPage.jsx#L884-L895) builds
`completedSteps`: a step gets ✓ iff `stepValidities[idx] === true`;
unreported steps fall back to `idx < current` (advance-past).

**Bed selection** — Symptom step's "เตียง" tag opens [BedSelectionPopup](../src/components/popup/BedSelectionPopup.jsx) ([mockPatientBeds.js](../src/data/mockPatientBeds.js)).

**Footer** — sticky, with autoSave indicator, ยกเลิก, บันทึกร่าง (disabled when `!anyDirty`), ถัดไป / บันทึกข้อมูลผู้ป่วย ([ScreeningPage.jsx:1009-…](../src/pages/opd/ScreeningPage.jsx#L1009)).

**Dirty tracking & step-validity protocol** — see [§3.2](#32-dirty-tracking--unsaved-changes-guard). Critical detail: the wrapper listens on `onKeyDown` + `onPointerDown` (not `onChange`) and gates on `event.isTrusted` so autofill / programmatic dispatch can't flip the dirty flag before a real user gesture.

**Save draft** — calls `saveOpdScreeningDraft({ hn, name, queue })` which writes a key into `sessionStorage` under `mih:opd-screening-drafts`. The queue page reads it back via `applyOpdScreeningDrafts(rows)` and tints those rows with `statusKey: 'draft'`.

---

## 6. Registration (เวชระเบียน)

**Purpose.** Medical-records workflow: register a new patient or open an existing one's MR. Captures identity, address, contact, insurance rights, medical flags. Uses the smart-card chip-read prefill where available.

**Routes & navigation.**
- `/registration`, `/registration/queue` → [RegistrationQueuePage](../src/pages/registration/RegistrationQueuePage.jsx)
- Queue row click → `/registration/register` with router state `{ hn, … }`
- "อ่านบัตรสมาร์ทการ์ด" in the form header → `applySmartCardRead(form, patient)` ([§3.6](#36-smart-card-chip-read-registration-only))

### 6.1 Registration Queue page

[RegistrationQueuePage.jsx](../src/pages/registration/RegistrationQueuePage.jsx) (~686 lines).

- **Breadcrumb:** "ระบบงานเวชระเบียน".
- **Summary cards (6)** — same metrics as OPD queue but relabeled for ซักประวัติ flow ([L39-46](../src/pages/registration/RegistrationQueuePage.jsx#L39-L46)).
- **Tabs** — ทั้งหมด / รอลงทะเบียน / กำลังลงทะเบียน / ลงทะเบียนแล้ว / ที่ร่างไว้ ([L49-55](../src/pages/registration/RegistrationQueuePage.jsx#L49-L55)).
- **Filters** — สถานะ (ตรวจเสร็จ / รอคัดกรอง / กำลังลงทะเบียน / รอลงทะเบียน / ที่ร่างไว้) + วันที่ + เวลา. (No แผนก/แพทย์/ประเภท triplet — the registration roster doesn't expose those axes.)
- **Search** — PrimarySearch.
- **Table columns** — คิว, HN, ชื่อ + avatar (initial-letter color-seeded), วันเกิด, อายุ, เลขบัตรประชาชน, โทรศัพท์, สิทธิการรักษา (color-coded RightsPill), สถานะ (StatusPill), การจัดการคิว.
- **AppointmentMenuButton** in toolbar — quick add appointment.

### 6.2 Registration form (5 steps)

Page: [RegistrationFormPage.jsx](../src/pages/registration/RegistrationFormPage.jsx) — owns the `form` state via `buildEmptyRegistrationForm()`.
Shell: [FormShell.jsx](../src/templates/FormShell.jsx).
Step bodies: [RegistrationSteps.jsx](../src/components/forms/RegistrationSteps.jsx).

**Step labels** ([FormShell.jsx:23-29](../src/templates/FormShell.jsx#L23-L29)):
```
['ข้อมูลส่วนตัว', 'ที่อยู่', 'ข้อมูลการติดต่อ', 'สิทธิการรักษา', 'หมายเหตุและ Flag']
```

**Form-shell chrome:**
- SubHeader with 4 trailing actions: ปริ้นบัตรคิว / เพิ่มการนัดหมาย / พิมพ์บัตรผู้รับบริการ / **อ่านบัตรสมาร์ทการ์ด** (Brand Primary, toggles `active` when `smartCardRead` is true).
- Tab strip — "ข้อมูลปัจจุบัน" / "ประวัติการแก้ไขข้อมูล" (history is read-only — [RegistrationEditHistoryPanel](../src/components/forms/RegistrationEditHistoryPanel.jsx)).
- StatusBar — สถานะรับบริการ + "ผู้ป่วยใหม่" pill + HN + Active/Inactive toggle.
- Footer — sticky, ย้อนกลับ / บันทึกร่าง / ถัดไป (or บันทึก on last step).

#### Step 1 — ข้อมูลส่วนตัว (Personal)

[RegistrationSteps.jsx:303-…](../src/components/forms/RegistrationSteps.jsx#L303). Captures:

- **Thai name triplet:** prefixTh (Select), firstNameTh, lastNameTh.
- **English name triplet:** prefixEn (Select — auto-derived from prefixTh via `TH_PREFIX_TO_EN`), firstNameEn, lastNameEn.
- **Gender + identity:** gender (เพศกำเนิด — required), genderIdentity (เพศสภาพ — optional).
- **National ID** — `formatNationalId(value)` injects the `1-####-##-###-###` mask as the user types ([registrationForm.js:214](../src/data/registrationForm.js#L214)).
- **ID card dates:** idIssueDate (วันออกบัตร), idExpiryDate (วันหมดอายุ). DatePicker with Thai-Buddhist format via `formatThaiBuddhistDate` / `parseThaiBuddhistDate`.
- **DOB + age display + bloodType** (age is read-only, computed).
- **Education / Occupation** (Select).
- **Marital** + conditional spouse fields (`SHOWS_SPOUSE_FIELDS(marital)`).
- **Photo tiles:** hospitalPhoto (left) + idCardPhoto (right). Hospital photo uses the camera flow ([§3.5](#35-camera-flow)).

**Required for step ✓:** `prefixTh, firstNameTh, lastNameTh, prefixEn, firstNameEn, lastNameEn, gender, nationalId, idIssueDate, idExpiryDate, dob, education, occupation` (13 fields) — see [registrationForm.js `STEP1_REQUIRED_KEYS`](../src/data/registrationForm.js).

**Chip-read locking** — when `form.idCardFromChip === true`, the eight card-sourced fields disable so the receptionist can't accidentally overwrite chip data. The receptionist still has to type the three NON_CHIP_FIELDS ([§3.6](#36-smart-card-chip-read-registration-only)).

#### Step 2 — ที่อยู่ (Address)

[RegistrationSteps.jsx:629-…](../src/components/forms/RegistrationSteps.jsx#L629). Three address slices:

1. `addressRegistered` — ที่อยู่ตามทะเบียนบ้าน. Required keys (`REGISTERED_ADDRESS_REQUIRED_KEYS`): zip, province, district.
2. `addressCurrent` — ที่อยู่ปัจจุบัน. "เหมือนที่อยู่ตามทะเบียนบ้าน" checkbox mirrors `addressRegistered` text fields. Includes [AddressMapBlock](../src/components/forms/AddressMapBlock.jsx) for lat/lng pin saving.
3. `addressContact` — ที่อยู่ติดต่อได้. Same mirror checkbox.

The mirror checkbox stays disabled until `isRegisteredAddressComplete` is true. Clearing the registered address downstream auto-drops both mirror flags so they don't get out of sync.

**Required for step ✓:** all three slices have zip + province + district (mirrored slices count).

#### Step 3 — ข้อมูลการติดต่อ (Contact)

[RegistrationSteps.jsx:765-…](../src/components/forms/RegistrationSteps.jsx#L765). Captures:

- **Phone (required) + altPhone + email** (`<Field>` triplet).
- **Emergency contacts** — array of `{ name, last, relation, phone, tag }`. RELATIONS list: บิดา/มารดา/คู่สมรส/บุตร/พี่-น้อง/ญาติ/เพื่อน/อื่นๆ. "เพิ่มผู้ติดต่อ" is gated by `isEmergencyContactComplete(lastEmergency)` so a new row only appears once the previous one is complete.

**Required for step ✓:** `phone` non-empty AND at least one emergency contact has name + last + relation + phone.

#### Step 4 — สิทธิการรักษา (Rights)

[RegistrationSteps.jsx:1528-…](../src/components/forms/RegistrationSteps.jsx#L1528). Two-state body:

- **Empty:** [Step4RightsLookupEmpty](../src/components/forms/RegistrationSteps.jsx#L1428) — centered [RightsLookupPanel](../src/components/forms/RegistrationSteps.jsx) prompts the user to look up rights.
- **Results:** [Step4RightsResults](../src/components/forms/RegistrationSteps.jsx#L1440) — lookup banner stays at top; below, one [RightsGroupCard](../src/components/forms/RegistrationSteps.jsx) per group (สิทธิที่ 1 / สิทธิที่ 2). Each card holds: priorityItems list (reorderable), documents (file uploads), photos (file/camera capture).

State flag: `form.rightsLookupDone` flips true after lookup. Mock result = `buildMockRightsGroups()` ([registrationForm.js:130](../src/data/registrationForm.js#L130)).

**Required for step ✓:** `rightsLookupDone === true`. Document/photo uploads are optional.

#### Step 5 — หมายเหตุและ Flag (Flags)

[RegistrationSteps.jsx:1716-…](../src/components/forms/RegistrationSteps.jsx#L1716). Captures:

- **Mobility** — RadioButton row (เดินได้ปกติ / นั่งรถเข็น / ใช้ไม้เท้า / มีผู้ช่วยพยุง / อื่นๆ + free-text `mobilityOther` Voice Textarea when "อื่นๆ").
- **Flags** — VIP / แพ้ยา / แพ้อื่นๆ / ผิวหนัง / เรื้อรัง / อื่นๆ (checkboxes).
- **Four history-list cards** — `drugAllergies`, `foodAllergies`, `chemicalAllergies`, `chronicConditions`. Each entry `{ id, name, symptom, severity }`. "เพิ่ม" gated by the entry-complete predicate. Removing a card with content opens a confirm dialog (`requestRemoveAllergy`); empty cards delete immediately.

**Required for step ✓:** `mobility` is set (and if `mobility === 'other'`, `mobilityOther` is non-empty).

#### Data shape

`buildEmptyRegistrationForm()` returns (excerpt — full at [registrationForm.js:86-127](../src/data/registrationForm.js#L86-L127)):

```js
{
  // Step 1
  prefixTh, firstNameTh, lastNameTh,
  prefixEn, firstNameEn, lastNameEn,
  gender, genderIdentity, nationalId, idIssueDate, idExpiryDate,
  dob, ageDisplay, bloodType, education, occupation, marital,
  spouseFirstName, spouseLastName,
  hospitalPhoto, idCardPhoto, idCardFromChip, idCardAddress,

  // Step 2
  addressRegistered, useRegisteredForCurrent, addressCurrent,
  useRegisteredForContact, addressContact,

  // Step 3
  phone, altPhone, email,
  emergency: [{ name, last, relation, phone, tag }],

  // Step 4
  rightsLookupDone, rightsGroups,

  // Step 5
  mobility, mobilityOther,
  flags: { vip, allergyDrug, allergyOther, skinReaction, chronic, flagOther },
  drugAllergies, foodAllergies, chemicalAllergies, chronicConditions,
}
```

`EMPTY_ADDRESS` keys: `{ zip, province, district, subdistrict, road, moo, houseNo, lat, lng, pinSaved }`.

---

## 7. Treatment / CPOE

**Purpose.** Doctor workflow for an OPD visit: review history + screening, perform exam, diagnose, order treatment, schedule follow-up, issue medical cert. Upstream of this step the patient was screened by OPD Screening; downstream the dispensary picks up the orders.

**Routes & navigation.**
- `/treat`, `/treat/queue` → [TreatmentQueuePage](../src/pages/treat/TreatmentQueuePage.jsx)
- Queue row click → `/treat/record` with `{ hn, queue, name }`
- Inside the form, the [QueueSubMenu](../src/components/layout/QueueSubMenu.jsx) side panel lets the doctor jump to other queued patients without leaving the open visit.

### 7.1 Treatment Queue + QueueSubMenu

[TreatmentQueuePage.jsx](../src/pages/treat/TreatmentQueuePage.jsx) (~654 lines).

- **Breadcrumb:** "ระบบบันทึกการรักษา → ตรวจรักษาทั่วไป (OPD)".
- **Summary cards (6, no trend indicator)** — คิวทั้งหมด / รอตรวจ / กำลังตรวจ / เสร็จแล้ว / เร่งด่วน / นาทีรอเฉลี่ย.
- **Tabs** — ทั้งหมด / รอตรวจ / กำลังตรวจ / ตรวจเสร็จแล้ว / ที่ร่างไว้.
- **Filters** — แผนก / แพทย์ / ประเภท / วันที่ / เวลา (same axes as OPD queue minus telemedicine sub-type).
- **Avatar** — gender-inferred (`isFemaleName(name)` heuristic) from the patient's name; falls back to a deterministic pool of mock male/female avatar files.
- **Table columns** — 12 cols matching Figma PHCIS-ALL `2760:140031`. Vitals chips + CC sample + status pill.

**Default sort:** `compareTreatmentQueueRows` ([treatmentQueue.js:18-25](../src/data/treatmentQueue.js#L18-L25)) — done → draft → progress → waiting, then by queue ID. The Treatment workflow surfaces completed cases first because the doctor often re-opens recent records.

**QueueSubMenu** ([src/components/layout/QueueSubMenu.jsx](../src/components/layout/QueueSubMenu.jsx)) — pinned between Sidebar and main column inside the form page. Three buckets: รอตรวจ / กำลังตรวจ / ตรวจเสร็จ. Each bucket carries `{ items, total }` so the section header can show the full queue size while the list only renders the Figma preview (5 / 1 / 5). Starts collapsed so the form gets full horizontal space until the doctor opts in. "ดูทั้งหมด" jumps to `/treat/queue`.

### 7.2 Treatment form (7 steps)

Page: [TreatmentFormPage.jsx](../src/pages/treat/TreatmentFormPage.jsx) — owns one `form` object via `buildInitialForm(patient)`.
Shell: [TreatmentFormShell.jsx](../src/templates/TreatmentFormShell.jsx).
Step bodies: [TreatmentSteps.jsx](../src/components/forms/TreatmentSteps.jsx) (~3700 lines, one of the largest in the project).

**Step labels** ([TreatmentFormShell.jsx:13](../src/templates/TreatmentFormShell.jsx#L13)) — 7 entries with bilingual subtitles.

| # | Title | Read/Write | Key components |
|---|---|---|---|
| 1 | ประวัติ | read-only | [HistoryTimeline](../src/components/timeline/HistoryTimeline.jsx), allergy / chronic-disease lists from MR patient |
| 2 | หน้าจอคัดกรอง | read-only | Screening summary card — vitals, CC, triage, mobility, pain, orders from upstream nurse |
| 3 | ตรวจร่างกาย | write | [BodyDrawingCanvas](../src/components/examination/BodyDrawingCanvas.jsx) + [BodyDiagramPanel](../src/components/examination/BodyDiagramPanel.jsx); nurse + doctor exam notes; attachments |
| 4 | บันทึกแพทย์ | write | [AISearch (Doctor AI)](../src/components/search/AISearch.jsx) for ICD-10; diagnoses table + SuggestibleTextarea for diagnosis + doctor order; ordering doctor |
| 5 | สั่งการรักษา | write | Category tabs (medication / lab / xray / procedure / consult); [AddMedicationPopup](../src/components/popup/AddMedicationPopup.jsx); FrequentOrdersCard chips; cross-class allergy alert panel |
| 6 | นัดหมาย | write | Mode radio (skip / schedule); ApptCollapse animation; clinic / type / doctor / reason / preparation; advance-orders; location (onsite / telemedicine); date + APPT_TIMESLOTS grid |
| 7 | ใบรับรองแพทย์ | write | Issue radio (รับ / ไม่รับ); cert type; rest-days pills; FormBuilder signature canvas; signer |

#### Cross-step linking

- **Step 4 → Step 3** — `Step4DoctorRecord` shows a "ตรวจร่างกาย" empty-state CTA when no body markers / drawings exist; clicking jumps to Step 3 via `onStepChange(STEP_EXAM_INDEX)`. The populated-state header also has an "แก้ไข" button doing the same.
- **Step 7 → Step 4** — `Step7Certificate` reads `form.diagnoses[0]` and `form.diagnosisNote` to populate the diagnosis section of the certificate; if either is missing, the section shows the empty-state with a "บันทึกการวินิจฉัย" CTA back to Step 4.

#### Required fields per step (check-mark rule)

From [`getTreatmentCompletedSteps`](../src/data/treatmentVisits.js):

| Step | Rule |
|---|---|
| 1 ประวัติ | `stepIndex > 0` (read-only; ✓ once advanced past) |
| 2 หน้าจอคัดกรอง | `stepIndex > 1` (read-only) |
| 3 ตรวจร่างกาย | `stepIndex > 2` (no enforced required field) |
| 4 บันทึกแพทย์ | `diagnosisNote` + `doctorOrderNote` + `orderingDoctor` non-empty |
| 5 สั่งการรักษา | `stepIndex > 4` (orders are optional — empty state is valid) |
| 6 นัดหมาย | `appointment.mode === 'skip'` **OR** `mode === 'schedule'` + clinic/type/doctor/reason/preparation all non-empty |
| 7 ใบรับรองแพทย์ | `certIssue === 'no'` **OR** `certIssue === 'yes'` + `certSignature` non-empty |

#### Data shape (excerpt — full at [TreatmentFormPage.jsx:39-136](../src/pages/treat/TreatmentFormPage.jsx#L39-L136))

```js
{
  // Step 2 summary (read-only)
  vitalsRecordedAt, vitals, symptoms, allergies,

  // Step 3 exam
  examSystem, examView, bodyMarkers, bodyDrawings,
  nurseExam, doctorExam, examAttachments,

  // Step 4 diagnosis
  diagnosisNote, doctorOrderNote, orderingDoctor,
  diagnoses: [{ icd10, label, type, note }],
  icdQuery,

  // Step 5 orders
  orderCategory, medications, labs, xrayOrders, procedureOrders, consultOrders,
  showAllergyAlert,

  // Step 6 appointment
  appointment: { mode, clinic, type, doctor, reason, preparation,
                 advance, location, date },

  // Step 7 cert
  certIssue, certType, certNo, restDays, startDate, endDate,
  certSignerDoctor, certSignerLicense, certSignature, certSignedAt,
}
```

`DEFAULT_APPOINTMENT` ([treatmentVisits.js:1087](../src/data/treatmentVisits.js#L1087)) keeps `mode` undefined so Step 6 lands with neither radio selected on first paint. `APPT_TIMESLOTS` ([treatmentVisits.js:1104](../src/data/treatmentVisits.js#L1104)) is a static 3×5 grid; slots with `taken: true` render the "(เต็ม)" disabled state.

#### Pitfalls

- **`buildInitialForm(patient)` runs once.** If the user switches to a different patient via QueueSubMenu, the page must re-mount or `setForm(buildInitialForm(newPatient))` — there's no derived-state effect.
- **Sticky PatientCard** ([§3.7](#37-patientcard-sticky-behaviour)) wraps the form chrome; its IntersectionObserver requires the form column to be scrollable, otherwise the mini state never engages.
- **ApptCollapse** (Step 6) keeps the schedule body mounted but height-collapsed so toggling `mode='skip'` ↔ `mode='schedule'` glides instead of snapping.
- **`certSignature` is base64 PNG** from the canvas — large strings; `certSignedAt` only flips when the doctor explicitly taps "ยืนยันลายเซ็น".
- **Empty-state vs filled-state transitions** are heavily commented in TreatmentSteps.jsx — the doctor's "first paint" must match Figma defaults precisely (no seeded ICD rows, no medication chips). The mock seed exports (DEFAULT_MEDICATION_ORDERS, etc.) still exist in [treatmentVisits.js](../src/data/treatmentVisits.js) but are only used by the Components Library demo screens.

---

## 8. Forms Library (คลังแบบฟอร์ม)

**Purpose.** Catalog of forms (consent letters, assessments, reports, surveys) that clinicians can either print, share via QR (patient fills on phone), or fill in-clinic ("เจ้าหน้าที่กรอกแทน"). Each form is a static schema in [formsLibrary.js](../src/data/formsLibrary.js) — sections + fields with type tags (`text`, `textarea`, `date`, `datetime`, `signature`, `checkbox`, `select`, `radio-4`, `radio-5`, `slider-0-10`).

**Routes:**
- `/forms` → [FormsLibraryPage](../src/pages/forms/FormsLibraryPage.jsx) — hub with category bands + full catalog table.
- `/forms/category/:categoryKey` → [FormsCategoryPage](../src/pages/forms/FormsCategoryPage.jsx) — category drill-down: filtered cards + TabPill pivot to other categories + pagination.
- `/forms/:slug` → [FormDetailPage](../src/pages/forms/FormDetailPage.jsx) — detail + field-preview list + QR target.
- `/forms/:slug/fill` → [FormFillPage](../src/pages/forms/FormFillPage.jsx) — live fillable. `?role=patient` strips clinician chrome so the QR-landed view feels patient-facing.

**Categories** ([formsLibrary.js:7](../src/data/formsLibrary.js#L7)):

| key | label | icon | color |
|---|---|---|---|
| `consent` | แบบฟอร์มยินยอม | verified_user | brand |
| `assessment` | แบบฟอร์มประเมิน | fact_check | blue |
| `report` | แบบฟอร์มรายงาน | report | orange |
| `survey` | แบบสอบถามสุขภาพ | assignment | teal |

**Form schema** ([formsLibrary.js:43](../src/data/formsLibrary.js#L43)):
```js
{ slug, code, category, name, summary, language, estimatedMinutes, version,
  sections: [{ title, fields: [{ label, type, required, critical, placeholder }] }] }
```

`field.critical` flags vitals fields with a "ตรวจซ้ำเมื่อพบสัญญาณเสี่ยง" pill ([FormDetailPage.jsx:59-64](../src/pages/forms/FormDetailPage.jsx#L59-L64)).

**Catalog filters** (FormsLibraryPage) — policy (OPD / IPD / ฉุกเฉิน), usage (เปิดใช้งาน / ปิด / ร่าง), department, creator, formStatus. Filter facets are pseudo-randomly assigned via a hash of the form slug ([FormsLibraryPage.jsx:28-46](../src/pages/forms/FormsLibraryPage.jsx#L28-L46)) — deterministic mock dimensions, not real metadata.

**Renderers** ([FormFillPage.jsx](../src/pages/forms/FormFillPage.jsx)) — one per field type. `radio-4` = "ไม่เลย / บางวัน / มากกว่าครึ่ง / เกือบทุกวัน" (PHQ-9 / GAD-7 scale). `radio-5` = "น้อยที่สุด … มากที่สุด". `signature` = inline canvas.

---

## 9. Users & Access

**Purpose.** Admin assigns roles, sub-roles, departments, and per-feature access (`none` / `view` / `edit`) to staff users.

**Routes:**
- `/users` → [UsersAccessPage](../src/pages/users/UsersAccessPage.jsx) — table with filters.
- `/users/new`, `/users/:id` → [UserEditPage](../src/pages/users/UserEditPage.jsx) — edit / create.

**Model** ([usersAccess.js](../src/data/usersAccess.js)):

- **ROLES** — doctor / nurse / pharmacist / registrar / lab-tech / admin. Each has `{ key, label, color, icon }`.
- **SUB_ROLES** — keyed by role. E.g. doctor → gp / surgeon / dentist / family / psychiatrist / obgyn. Nurse → opd-nurse / er-nurse / anc-nurse / wellness-nurse / tb-nurse.
- **DEPARTMENTS** — opd / registration / + more.
- **FEATURE_GROUPS** — feature catalog grouped by domain. Each feature declares `supportedLevels` (some only support `'edit'`, e.g. "ส่ง QR" — binary actions).
- **User shape** — `{ id, name, email, avatarUrl, status, role, subRole, departments[], features: { [featureKey]: 'view' | 'edit' } }`. Missing key = no access.

**`BLANK_USER`** ([UserEditPage.jsx:20](../src/pages/users/UserEditPage.jsx#L20)) — default for `/users/new`, status `active`, role `nurse`.

**UI patterns:**
- **RoleRadioCard** — role picker rendered as selectable card grid.
- **SectionCard** — uniform white card with title + icon for each section of the edit page.
- **Access matrix** — feature group → row with three radio levels (none / view / edit), respecting `supportedLevels`.

---

## 10. Dev Tools

These routes are not part of the clinician workflow — they're internal tools for the design system and engineering teams.

### 10.1 Components Library

Route: `/components`, `/components/:slug` → [ComponentsLibraryPage](../src/pages/components/ComponentsLibraryPage.jsx) (~7900 lines).

Live showcase of every design-system component documented in [design.md](../design.md). **118 routed components** organised into 21 categories (alert / badge / button × 3 families / checkbox / radio / switch / tag / topic / tooltip / card × 2 / charts / form fields / forms / form-builder / examination / layout / shells / popup / list-table / search / step / tab / timeline). Each demo renders state matrices (rows = sizes / checked-modes, cols = states) + interactive variants + a `<Guidelines>` panel (behavior · dos · donts — see [§3.9](#39-component-guidelines-do--dont)).

**Embed mode** — append `?embed=1` to the URL (e.g. `/components/brand-button?embed=1`) to hide the internal SideMenu so the page renders cleanly inside an iframe. `docs/design-system.html` uses this so its outer sidebar is the only navigation.

The "wide preview" slugs (`WIDE_PREVIEW_SLUGS`) get a full-width canvas — used by examination-canvas and table demos.

### 10.2 Preview pages

Standalone pages for visual review of complex composed surfaces. Each is purely demonstrative — no real state persistence:

- `/preview/tabs` → [TabsPreviewPage](../src/pages/preview/TabsPreviewPage.jsx) — every Tab variant (Underline / Capsule / Pill) side-by-side.
- `/preview/cards` → [CardsPreviewPage](../src/pages/preview/CardsPreviewPage.jsx) — VitalCard / PatientCard / SubCard variations.
- `/preview/body-record` → [BodyRecordPreviewPage](../src/pages/preview/BodyRecordPreviewPage.jsx) — [BodyDrawingCanvas](../src/components/examination/BodyDrawingCanvas.jsx) + [BodyRecordPopup](../src/components/examination/BodyRecordPopup.jsx) interaction sandbox.

These pages are useful when iterating on a complex component without booting the full clinician flow.

---

## 11. Appendix — Pitfalls & Gotchas

Collected from inline `/* */` comments in the codebase.

### React 17 only
React-18 hooks crash at render. See [memory note](../memory/project_react17_runtime.md).

### Voice textareas must include suggestions
Every voice textarea in clinician fields must ship with `suggestions` + `minChars`. Bare `VoiceTextarea` is forbidden. See [memory note](../memory/feedback_voice_textarea_suggestions.md).

### Input chrome stripping (CLAUDE.md)
Wrapper-owned border/focus chrome → inner native input must strip `border / outline / box-shadow / appearance / -webkit-appearance` with `!important` for `:focus` and `:focus-visible`. Pattern lives in [AISearch.jsx](../src/components/search/AISearch.jsx). See [CLAUDE.md](../CLAUDE.md).

### Vite host pinning
[vite.config.mjs](../vite.config.mjs) pins `host: '127.0.0.1'` to avoid a `uv_interface_addresses` crash that fired with default host (`true` or `'0.0.0.0'`). When exposing the dev server on a LAN IP, use the CLI flag `npx vite --host <ip>` to bind to one specific interface instead of enumerating all.

### Google Drive sync ghost files
[vite.config.mjs:24-26](../vite.config.mjs#L24-L26) ignores `**/.!*` (Drive placeholder files) and `**/.DS_Store` in the chokidar watch — without it, the watcher fires on missing files and Vite/Tailwind blow up with ENOENT.

### Dirty tracking event-source gates
On OPD ScreeningPage, `markDirty` listens on `keydown` + `pointerdown` only, gates on `event.isTrusted`, and for pointer presses additionally requires `[aria-pressed]` or `[aria-label="decrement|increment"]`. This prevents autofill engines and `dispatchEvent` from flipping the Next-button gate before a real user gesture.

### Continuity Camera labels
[cameraDevice.js](../src/utils/cameraDevice.js) hints include `'continuity'`, `'iphone'`, `'desk view'`, `'continuity camera'`. New phone vendors must be added to `PHONE_LABEL_HINTS` to be auto-picked.

### sessionStorage scope
OPD drafts persist only for the tab session, not across browser restarts. Production would need a real backend hook. The key (`mih:opd-screening-drafts`) is a flat list of `queue|hn|name` strings — adding fields needs migration logic.

### Mock identity rosters are not unified
Three rosters carry overlapping patients in different shapes:
- [PATIENT_PROFILES](../src/data/patientProfiles.js) — display shape for PatientCard (fullName / insurance / patientType).
- [MR_PATIENTS](../src/data/mrPatients.js) — registration / MR shape (structured address, rights, drugAllergies).
- [TREATMENT_QUEUE_ROWS](../src/data/treatmentQueue.js) — queue shape (queue id, status, room, vitals).

Pages look the patient up by HN against the appropriate roster; when adding a new mock patient, add them to **all three** rosters or downstream pages fall back to defaults.

### Thai Buddhist date formatting
DOB / ID issue / ID expiry use `formatThaiBuddhistDate` / `parseThaiBuddhistDate` ([registrationForm.js:165-190](../src/data/registrationForm.js#L165-L190)). String round-trip format: `"20 กุมภาพันธ์ 2563"`. Parser is strict — month names must match `THAI_MONTHS` exactly.

### National ID format mask
`formatNationalId(value)` ([registrationForm.js:214](../src/data/registrationForm.js#L214)) injects `1-####-##-###-###`. Raw value can be 17 chars (13 digits + 4 dashes).

### "อื่นๆ" branches with required free text
Mobility 'other' branches (Step 5 Registration) — `mobilityOther` must be non-empty for the step to count as complete. Mirror this pattern when adding any new "อื่นๆ" sub-text field.

### Chip-read NON_CHIP_FIELDS
The Thai ID chip does not carry `education`, `occupation`, `marital`. `applySmartCardRead` preserves whatever the user has already typed for these three keys; the receptionist must still input them manually.

### `caption2` token (NOT a duplicate of `caption1`)
A previous version of [design.md §4.6](../design.md) had `caption1` and `caption2` with identical 12 px values, which looked like a duplicate — and got deleted, leaving `caption1` + `caption3`. Figma `3465:2` actually defines **`caption2` as 10 px** (not 12). The fix re-numbered the 10 px token from `caption3` → `caption2`. If you see code referencing `caption3`, it's stale — it was renamed on 2026-05-22.

### Effect Styles audit (per Figma `3446:4426`)
Synced 2026-05-22. Notable token-table corrections that landed:
- **Brand Inner Shadow 100–600** values rewritten to match Figma's progressive blur (2 → 16 px) / y-offset (1 → 12) / α (8% → 22%). Previous design.md values were copy-paste errors.
- **Blur radii** corrected: `blur.overlay` 4 → 8 px · `blur.layer` 4 → 6 px · `blur.glass` 4 → 12 px.
- **Indigo Drop Shadow Bottom 100 / 200** added (were missing). Base colour: `#818CF8` (indigo-400, matching the existing `color.shadow.indigo-*` pattern).
- **Generic `effect.drop-shadow.{3xs,2xs,xs,sm,md,lg}`** removed — Tailwind-shaped tokens that were never wired into CSS variables; if you need a neutral shadow, use `drop-shadow-bottom.{100…600}` (Slate `#64748B`).

Total: 36 / 36 Figma styles now match design.md.

### UTF-8 markdown serving (Vite plugin)
[vite.config.mjs](../vite.config.mjs) has a `utf8MarkdownPlugin` middleware that appends `; charset=utf-8` to `text/markdown` responses. Without it, browsers fall back to Latin-1 → Thai text in `.md` files renders as mojibake (`ถ่ายรูป` → `à¸–à¹‰à¸²à¸¢à¸£à¸¹à¸›`). HTML files have an in-file `<meta charset="UTF-8">` so they were unaffected.

---

*End of spec. Last refreshed alongside the Component Guidelines + caption2 + Effect Styles audit (2026-05-23).*
