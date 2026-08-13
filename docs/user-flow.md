# PHCIS — App Userflow (ASCII)

Top-level userflow for the MIH PHCIS prototype. Source: route map in `src/routes/Routes.jsx`, sidebar in `src/components/layout/Sidebar.jsx`, page-level navigation handlers, and the modal/popup catalog. Stub menu items without `path` are noted in §9.

Legend:
```
┌──┐  page / screen          ╔══╗  modal / popup
│  │                          ║  ║
└──┘                          ╚══╝

──▶ navigation (Link / history.push)        ⤴ back / return
··▶ opens overlay (does not change route)    ✕ unwired / stub
```

---

## 0 · App entry & sidebar navigation

```
                       ┌──────────────────────────┐
                       │  Initial load (any URL)  │
                       └────────────┬─────────────┘
                                    │
                                    ▼
   ┌──────────────────────────────────────────────────────────────┐
   │                       AppShell (Sidebar + Content)           │
   │                                                              │
   │   ┌─────────────────────┐    Notifications · Profile         │
   │   │  Sidebar (rail)     │··▶ ProfilePopover ··▶ SettingsModal│
   │   │                     │                                    │
   │   │  • แดชบอร์ด        ─┼──▶ /dashboard                     │
   │   │  • คลังแบบฟอร์ม    ─┼──▶ /forms                         │
   │   │  • เวชระเบียน       ─┼──▶ /registration/queue            │
   │   │  • ผู้รับบริการนอก   ─┼──▶ /opd/queue                     │
   │   │  • บันทึกการรักษา ▶ │                                    │
   │   │     └─ ตรวจ OPD    ─┼──▶ /treat/queue                    │
   │   │     └─ อื่นๆ (9)    ✕ │ (stub: no path)                   │
   │   │  • รังสีวินิจฉัย     ✕ │                                  │
   │   │  • ห้องปฏิบัติการ    ✕ │                                  │
   │   │  • เภสัชกรรม        ✕ │                                  │
   │   │  • งานการเงิน       ✕ │                                  │
   │   │  • นัดหมาย         ✕ │                                  │
   │   │  • ประวัติการใช้งาน  ✕ │                                  │
   │   │  • ผู้ใช้และสิทธิ์   ─┼──▶ /users                        │
   │   └─────────────────────┘                                    │
   └──────────────────────────────────────────────────────────────┘
```

Standalone (no sidebar): `/components`, `/components/:slug`, `/preview/*`.

---

## 1 · Dashboard

```
┌────────────────────────┐
│ /dashboard             │   read-only analytics
│ DashboardPage.jsx      │   • 6 KPI cards (year filter)
│                        │   • 13 chart cards (pyramid / line / map / …)
│                        │   • recent patients table
└────────────────────────┘
```

No drill-down navigation — terminal screen.

### Logic — flow notes

- **Entry:** Sidebar item `dashboard` → `/dashboard`. Also the default landing route when the user opens the app with no path (handled by the router's index redirect).
- **State scope:** all charts/KPIs derive from in-memory mock arrays (`dashboardMock.js`). The page does not own any draft/dirty state — refresh is free.
- **No queue → form pattern:** unlike Registration / OPD / Treatment, no row click navigates anywhere. The "Recent patients" table is informational only.
- **No leave guard:** since nothing is editable, `UnsavedChangesPopup` is never wired into this route.

---

## 2 · ระบบงานเวชระเบียน (Registration)

```
┌────────────────────────────────┐
│ /registration/queue            │
│ RegistrationQueuePage.jsx      │
│                                │
│  • 6 summary cards             │
│  • tabs (all/pending/.../draft)│
│  • search + filter chips       │
│  • table 20/page (130 rows)    │
│  • smart-card / appointment    │
└─────────────┬──────────────────┘
              │  click row · search result
              │  navigate(`/registration/register`, { state:{ hn } })
              ▼
┌──────────────────────────────────────────────────────────────────┐
│ /registration/register                                           │
│ RegistrationFormPage.jsx  (FormShell, 5 steps)                   │
│                                                                  │
│  Step 1 ─▶ Step 2 ─▶ Step 3 ─▶ Step 4 ─▶ Step 5                  │
│  Personal   Address   Contact   Rights    Flags                  │
│   (TH/EN     (reg/     (phone/   (SSO/    (mobility,             │
│    ID, DOB,  current/  email/    Gold/    VIP, allergy,          │
│    blood,    contact)  emergency CSMBS/   chronic,               │
│    educ,                contacts) Other +  flags)                │
│    occu,                          claim                          │
│    spouse)                        codes)                         │
│                                                                  │
│  prev/next ◀──▶  ··▶ UnsavedChangesPopup (if navigating dirty)  │
└──────────────────────────────┬───────────────────────────────────┘
                               │ save
                               ⤴ /registration/queue (confirmation)
```

### Logic — flow notes

- **Entry:** queue row click → `history.push('/registration/register', { state: { hn } })`. Direct visit (no state) → page loads `BLANK_REGISTRATION` form (defensive).
- **State ownership:** `RegistrationFormPage` owns the full 5-step form; step bodies receive `{form, setForm}`. Switching patients requires a fresh push to `/registration/register` (re-mount).
- **Smart-card chip-read:** "อ่านบัตร" pulls Thai ID data into Step 1 + Step 2. `NON_CHIP_FIELDS = ['education', 'occupation', 'marital']` are preserved (chip doesn't carry them). Receptionist still types those manually.
- **Step 2 address mirror:** "ที่อยู่ปัจจุบันเหมือนทะเบียนบ้าน" checkbox mirrors `registeredAddress` → `currentAddress`; unchecking restores the previous typed value (not a hard reset).
- **Step 4 rights state machine:** rights group radio (`SSO` / `Gold` / `CSMBS` / `Other`) gates which sub-fields render. Switching group clears the previous group's sub-state.
- **Step 5 mobility "อื่นๆ" branch:** picking `other` requires `mobilityOther` to be non-empty for the step to count complete (mirror this pattern for any new "อื่นๆ" sub-text).
- **Step ✓ aggregation:** `getRegistrationCompletedSteps(form)` returns 5 booleans → passed to `StepProgress`.
- **Leave guard:** currently **not wired** to `UnsavedChangesPopup` on this page (gap vs OPD/Treatment — to be added).

---

## 3 · ระบบงานผู้รับบริการนอก (OPD Screening)

```
┌────────────────────────────────┐
│ /opd/queue                     │
│ QueuePage.jsx                  │
│                                │
│  table cols: queue · HN · name │
│             · type · TM · CC   │
│             · BP/PR/O₂ · room  │
│             · doctor · wait    │
│             · status · actions │
└─────────────┬──────────────────┘
              │  click row · search · "call"
              │  navigate(`/opd/screening`, { state:{ hn } })
              ▼
┌──────────────────────────────────────────────────────────────────┐
│ /opd/screening                                                   │
│ ScreeningPage.jsx  (multi-step)                                  │
│                                                                  │
│ ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌──────────────┐ │
│ │ Step 1     │─▶│ Step 2     │─▶│ Step 3     │─▶│ Step 4       │ │
│ │ Vitals     │  │ Chief      │  │ Allergies  │  │ Chronic Hx   │ │
│ │ (BP/PR/RR/ │  │ Complaint  │  │ + add-row  │  │ + add-row    │ │
│ │  O₂/temp/  │  │ + pain x5  │  │            │  │              │ │
│ │  W/H)      │  │ + triage   │  │            │  │              │ │
│ │            │  │ + care     │  │            │  │              │ │
│ │            │  │   order +  │  │            │  │              │ │
│ │            │  │   cert     │  │            │  │              │ │
│ └─────┬──────┘  └────────────┘  └────────────┘  └──────┬───────┘ │
│       │                                                │         │
│       │ ··▶ VitalsSignGraphDialog                      │         │
│       │     (history line chart)                       │         │
│       │                                          ··▶ BedSelectionPopup │
│       │                                                │         │
│       │                                                ▼         │
│       │                                          ┌──────────────┐│
│       │                                          │ Step 5 Forms ││
│       │                                          │ FormsLibrary ││
│       │                                          │ (breadcrumb  ││
│       │                                          │  pick form)  ││
│       │                                          └──────┬───────┘│
│       │                                                 │        │
│       ◀───  prev/next ─────────────────────────────────▶        │
│                                                                  │
│       ··▶ UnsavedChangesPopup (if leaving dirty)                 │
└──────────────────────────────┬───────────────────────────────────┘
                               │ save
                               ▼
                       ╔══════════════════════╗
                       ║ ScreeningConfirmPopup║
                       ╚══════════┬═══════════╝
                                  │ confirm
                                  ⤴ /opd/queue
```

### Logic — flow notes

- **Entry:** queue row click → `/opd/screening`, `state:{ hn, queue, name }`. Page reads `state.hn` to look up the patient in `MR_PATIENTS`; missing HN falls back to a draft from sessionStorage (`mih:opd-screening-drafts` keyed by `queue|hn|name`).
- **Per-step state model:** each step body owns its own slice; the parent stitches `stepValidities[idx]` (boolean per step) into the StepProgress check-marks.
- **`markDirty` event-source filter:** listens on `keydown` + `pointerdown` only, requires `event.isTrusted`, and for pointers requires `[aria-pressed]` or `[aria-label="decrement|increment"]`. Stops autofill / synthetic `dispatchEvent` from prematurely unlocking the Next button.
- **Save Draft:** explicit footer button → writes the current form snapshot to `sessionStorage`. Survives the tab session only (not browser restart).
- **Leave guard:** any dirty step + route change → `UnsavedChangesPopup` (Save / Discard / Cancel). Cancel keeps user on the current step.
- **Bed selection branch:** Step 4 "Bed" trigger opens `BedSelectionPopup`; picking a bed flips the IPD admission branch on for that visit.
- **Voice / AI gating:** Voice + AI inputs (e.g. Chief Complaint, AISearch in Step 5) require HTTPS — without it, `getUserMedia(audio)` is denied and the voice button silently disables.
- **Final save:** `ScreeningConfirmPopup` → confirm pushes the visit to the treatment queue and returns to `/opd/queue`.

---

## 4 · ระบบบันทึกการรักษา (Treatment Record) — the big one

```
┌────────────────────────────────┐
│ /treat/queue                   │
│ TreatmentQueuePage.jsx         │
│  (248 rows, 20/page)           │
└─────────────┬──────────────────┘
              │  click row · search · Link on name
              │  navigate(`/treat/record`, { state:{ hn, queue, name } })
              ▼
┌────────────────────────────────────────────────────────────────────────────┐
│ /treat/record   TreatmentFormPage.jsx (TreatmentFormShell, 7 steps)        │
│                                                                            │
│  ┌─────────────────────────────────────────────────────────────┐           │
│  │ Header  PatientCard  ⤴ back → /treat/queue                  │           │
│  │         actions: พิมพ์ใบสั่งยา · พิมพ์ OPD Card             │           │
│  └─────────────────────────────────────────────────────────────┘           │
│                                                                            │
│  Step 1 ─▶ Step 2 ─▶ Step 3 ─▶ Step 4 ─▶ Step 5 ─▶ Step 6 ─▶ Step 7        │
│  ─────────────────────────────────────────────────────────────────         │
│  ประวัติ   คัดกรอง    ตรวจ      บันทึก     สั่งยา /    นัดหมาย    ใบรับรอง  │
│  การรักษา  & ซัก       ร่างกาย    แพทย์     สั่งตรวจ                          │
│           ประวัติ      (Phys.    (Dx +     (med tbl +                       │
│  (left    (vitals +    Exam)     ICD-10    labs +                          │
│   rail +  symptoms     ★see       + plan)   advice)                        │
│   detail  + triage     below)                                              │
│   tabs)   + pain)                                                          │
│                                                                            │
│              │            │                                                │
│              │            │  Step 3 — Physical Exam (★)                    │
│              │            │  ┌──────────────────────────────┐              │
│              │            │  │ EXAM_SYSTEM_TABS row         │              │
│              │            │  │ (HEENT/Heart/Lungs/Abd/...)  │              │
│              │            │  │ + view toggle (front/back/   │              │
│              │            │  │   both)                      │              │
│              │            │  │ + BodyDiagramPanel           │              │
│              │            │  │ + ExamNotesPanel             │              │
│              │            │  │ + ExamSupportList            │              │
│              │            │  └────────────┬─────────────────┘              │
│              │            │               │ "บันทึกร่างกาย"                │
│              │            │               │                                │
│              │            │               ··▶ ╔══════════════════════╗     │
│              │            │                   ║ BodyRecordPopup      ║     │
│              │            │                   ║ (= DrawingCanvasPopup║     │
│              │            │                   ║    title resolved    ║     │
│              │            │                   ║    from systemKey)   ║     │
│              │            │                   ║                      ║     │
│              │            │                   ║ ┌──────────────────┐ ║     │
│              │            │                   ║ │ BodyDrawingCanvas│ ║     │
│              │            │                   ║ │ + tools sidebar  │ ║     │
│              │            │                   ║ │ + colors         │ ║     │
│              │            │                   ║ │ + markers w/     │ ║     │
│              │            │                   ║ │   suggestion     │ ║     │
│              │            │                   ║ │   dropdown       │ ║     │
│              │            │                   ║ └──────────────────┘ ║     │
│              │            │                   ║                      ║     │
│              │            │                   ║ ยกเลิก    บันทึก       ║     │
│              │            │                   ║          (gated by   ║     │
│              │            │                   ║           dirty flag)║     │
│              │            │                   ╚══════════┬═══════════╝     │
│              │            │                              │ save            │
│              │            │                              ⤴ Step 3 (canvas) │
│              │                                                             │
│              ··▶ VitalsSignGraphDialog                                      │
│                  (history chart from Step 2 vitals header)                 │
│                                                                            │
│  prev/next ◀──▶                                                            │
│  ··▶ UnsavedChangesPopup (navigate dirty)                                  │
└─────────────────────────────────┬──────────────────────────────────────────┘
                                  │ save (final step)
                                  ⤴ /treat/queue (or cert preview)
```

### Logic — flow notes

- **Entry:** `/treat/record`, `state:{ hn, queue, name }`. Page resolves **two** patient shapes — `patient` via `findMrPatientByHn` (full MR) and `cardPatient` via `getPatientByHN` (display). Both fall back to defaults so direct visits don't crash.
- **State ownership:** `form` lives on the page; `buildInitialForm(patient)` runs once on mount. Switching patients via `QueueSubMenu.onPickPatient` re-mounts the page via `history.push('/treat/record', ...)`.
- **Read-only steps (1, 2):** ประวัติ / หน้าจอคัดกรอง are summaries only — ✓ flips when `stepIndex > N` (advance-past).
- **Cross-step linking:**
  - Step 4 empty-state CTA "ตรวจร่างกาย" → `onStepChange(STEP_EXAM_INDEX)` jumps to Step 3.
  - Step 7 cert reads `form.diagnoses[0] + form.diagnosisNote` live from Step 4; missing → CTA back to Step 4.
- **Step 5 order category tabs:** `form.orderCategory` switches active tab. Each category owns its own array (`medications` / `labs` / `xrayOrders` / `procedureOrders` / `consultOrders`); switching the tab does NOT reset.
- **Step 6 appointment state machine:** `appointment.mode === 'skip'` collapses body (✓); `'schedule'` expands and requires `{ clinic, type, doctor, reason, preparation }`. `ApptCollapse` keeps body mounted but height-collapsed so toggling glides.
- **Step 7 cert state machine:** `certIssue === 'no'` ⇒ ✓; `'yes'` requires `certSignature` (base64 PNG from canvas). `certSignedAt` only flips on explicit "ยืนยันลายเซ็น" — never on every stroke.
- **Sticky PatientCard:** ABOVE TreatmentFormShell with `sticky` prop. Uses an internal IntersectionObserver + sentinel; collapses to mini variant as the form column scrolls under Header. Requires the `<main>` to be scrollable.
- **Step ✓ aggregation:** `getTreatmentCompletedSteps(form, stepIndex)` returns 7 booleans → `<TreatmentFormShell completedSteps={...} />` → `<StepProgress>`.
- **Leave guard:** dirty + route change → `UnsavedChangesPopup`. The page also intercepts the browser back gesture.

---

## 5 · คลังแบบฟอร์ม (Forms Library)

```
┌────────────────────────────┐
│ /forms                     │
│ FormsLibraryPage.jsx       │
│ • search + chip filters    │
│ • grid of form cards       │
└─────────┬──────────────────┘
          │ click card · category
          ▼
┌────────────────────────────┐
│ /forms/category/:key       │
│ FormsCategoryPage.jsx      │
│ • filtered grid by category│
└─────────┬──────────────────┘
          │ click card
          ▼
┌────────────────────────────┐
│ /forms/:slug               │
│ FormDetailPage.jsx         │
│ • metadata + QR + preview  │
│ • action: edit · download  │
└─────────┬──────────────────┘
          │ "Fill"
          ▼
┌────────────────────────────┐
│ /forms/:slug/fill          │
│ FormFillPage.jsx           │
│ • dynamic fields · save    │
└─────────┬──────────────────┘
          │ save · cancel
          ⤴ /forms
```

Also reachable inline from OPD Screening Step 5 (uses FormsLibrary with breadcrumb nav inside the page).

### Logic — flow notes

- **Navigation flow:** `/forms` (hub) → `/forms/category/:key` (drill-down) → `/forms/:slug` (detail + QR) → `/forms/:slug/fill` (live fill).
- **`?role=patient` chrome strip:** FormFillPage reads `useLocation().search`. When `role === 'patient'`, hides back-to-catalog button, hides "เจ้าหน้าที่กรอกแทน" banner, collapses sidebar to drawer. Same schema renders; only chrome differs — the QR-landed phone view feels patient-owned.
- **Field renderer dispatch:** `type` ∈ `{text, textarea, date, datetime, signature, checkbox, select, radio-4, radio-5, slider-0-10}` → one renderer per type. `radio-4` = PHQ-9/GAD-7 scale, `radio-5` = น้อยที่สุด…มากที่สุด. Unknown types fall through to text input (defensive default).
- **Filter facets (catalog):** `catalogFiltersForForm(slug)` uses a deterministic hash → mock policy / usage / department / creator / formStatus. Stable across reloads; NOT real metadata.
- **Persistence:** **none** — `useState` on FormFillPage owns the values map. Refresh loses everything. Production needs draft autosave.
- **Inline reuse from OPD Step 5:** the FormsLibrary surface renders inline (no route change) inside ScreeningPage Step 5; selection writes into the screening form's `forms[]` slice.

---

## 6 · ผู้ใช้และสิทธิ์การเข้าถึง (Users & Access)

```
┌────────────────────────────────┐                ╔════════════════════════╗
│ /users                         │ ··▶ delete ··▶ ║ DeleteQueueConfirmPopup║
│ UsersAccessPage.jsx            │                ╚═══════════┬════════════╝
│ • table + role/dept filters    │                            │ confirm
│ • per-row: edit · delete       │                            ⤴ /users
└─────────┬──────────────────────┘
          │ "เพิ่มผู้ใช้ใหม่"          ┌────────────────────────────────┐
          ├────────────────────────▶│ /users/new                     │
          │                         │ UserEditPage.jsx               │
          │ edit row                │ • username/email/name          │
          ├────────────────────────▶│ • role + sub-role + dept       │
          │                         │ • feature checklist            │
          │ /users/:id              └─────────┬──────────────────────┘
          │                                   │ save · cancel
          │                                   ⤴ /users
```

### Logic — flow notes

- **Role → SubRole cascade:** changing `user.role` clears `user.subRole` automatically (sub-role catalog is keyed by role). E.g. doctor → nurse invalidates `subRole='gp'`. If `SUB_ROLES[role]` is empty, the SubRole picker hides.
- **Feature access matrix:** each feature in `FEATURE_GROUPS` declares `supportedLevels: Array<'none' | 'view' | 'edit'>`. The row renders only the supported levels (e.g. binary "ส่ง QR" shows only `none | edit`). `user.features[key]` defaults to undefined → "ไม่มีสิทธิ์" (`none`).
- **`countAccess(user)` helper:** returns `{ none, view, edit }` counts across the catalog. Used in the table for "X features · Y view · Z edit" per-row summary.
- **Create vs Edit branch:** `/users/new` → `getUserById('new')` returns undefined → `BLANK_USER` seeds the form. `/users/:id` → real user, or BLANK_USER fallback. Save / Apply is a stub — no persistence wiring.
- **Status toggle:** `user.status ∈ {'active', 'inactive'}`. Inactive renders greyed; filtered out of role-based permission resolution at runtime (intended; not yet enforced in mocks).
- **Delete:** trash icon → `DeleteQueueConfirmPopup` → confirm removes the row (in-memory only in mocks).

---

## 7 · /components (Design System Preview)

```
┌────────────────────────────────────┐
│ /components | /components/:slug    │   standalone (no sidebar)
│ ComponentsLibraryPage.jsx          │   • per-component demos
│                                    │   • slug index list
│                                    │   • used for design review
└────────────────────────────────────┘
```

Legacy sandbox routes (deprecated, sidebar-less):
`/preview/tabs`, `/preview/cards`, `/preview/body-record`.

---

## 8 · Modal / popup catalog

| Popup | Trigger | Lifecycle |
|---|---|---|
| **BodyRecordPopup** (= DrawingCanvasPopup) | "บันทึกร่างกาย" in Step 3 Exam | Save gated by `dirty` (any mark/draw/note/erase enables it) → bubbles `onSave(markers)` then close |
| **VitalsSignGraphDialog** | Vitals header in Screening Step 1 / Treatment Step 2 | View-only chart → close |
| **ScreeningConfirmPopup** | Final save in `/opd/screening` | Confirm → return to `/opd/queue` |
| **BedSelectionPopup** | Bed selector in Screening Step 4 | Pick → return value, close |
| **UnsavedChangesPopup** | Navigate away from dirty multi-step form | Save · Discard · Cancel |
| **DeleteQueueConfirmPopup** | "ยกเลิก" / trash on queue row | Confirm → row removed |
| **AlertDialog** | Generic confirmation / error | OK · Cancel |
| **ProfilePopover** | User card in sidebar | Opens SettingsModal |
| **SettingsModal** | "Theme" in ProfilePopover | Light/dark/system + 10 brand colors |

---

## 9 · Unwired sidebar items (UI present, route missing)

The Sidebar (`src/components/layout/Sidebar.jsx`) lists **12 primary menus**. **6 are wired** (covered in §1–§6 above). **6 are stubs** — clickable but the click handler ignores items without `path`. Intended logic for each stub is documented below so future implementation work has a single reference.

### 9.1 `radiology` — แผนกรังสีวินิจฉัย

- **Sidebar:** key `radiology`, icon `radiology`.
- **Status:** stub — no route.
- **Intended flow:** queue (pending / in-progress / reported) → per-study viewer card → sign-off → "ตรวจเสร็จ" status flips → write back to TreatmentVisit.
- **Cross-system:** receives Treatment Step 5 `xrayOrders[]`; reports back to TreatmentVisit.history.

### 9.2 `lab` — ห้องปฏิบัติการ

- **Sidebar:** key `lab`, icon `biotech`.
- **Intended flow:** sample collection (collected → analysing → reported), critical-value alerts (red flag → doctor), historical trend view. Pre-set panels already exist in `treatmentVisits.js` (e.g. `'CBC + BUN/Cr + electrolyte panel'`).
- **Cross-system:** receives Treatment Step 5 `labs[]`; reports back to TreatmentVisit + Dashboard "top-tests-ordered" chart.

### 9.3 `pharmacy` — ระบบงานเภสัชกรรม

- **Sidebar:** key `pharmacy`, icon `pill`.
- **Intended flow:** queue of dispensable prescriptions (from Treatment Step 5 `medications[]`) → counter call (เรียกคิว) → label printing → allergy double-check (re-validated against patient `drugAllergies`) → inventory deduction.
- **Cross-system:** receives Treatment Step 5 `medications[]`; reports `dispensed` status back; consults MR `drugAllergies`. Catalog already lives in `medicationCatalog.js` (~50 drugs).

### 9.4 `finance` — งานการเงิน

- **Sidebar:** key `finance`, icon `baht`.
- **Intended flow:** charge calculation per visit (services + medications + labs + imaging) → claim eligibility per `rightsGroup` (set in Registration Step 4) → payment receipt printing → sign-off.
- **Cross-system:** consumes completed Treatment records + Registration rights; emits Dashboard "ค่าบริการสะสม" feed.

### 9.5 `appoint` — ระบบนัดหมาย

- **Sidebar:** key `appoint`, icon `calendar_clock`.
- **Intended flow:** weekly calendar grid → slot reservation → conflict detection → reminder notifications (SMS / LINE) → Telemedicine link generation.
- **Cross-system:** writes TreatmentVisit Step 6 `appointment` slice when the doctor confirms; emits "นัดหมายวันนี้" count for Dashboard; surfaces as the OPD queue "นัดหมาย" tab.

### 9.6 `log` — ประวัติการใช้งาน

- **Sidebar:** key `log`, icon `history`.
- **Intended flow:** filterable table (user / date range / entity type / action) → per-row diff view → export to CSV / PDF → retention policy (rolling N days).
- **Cross-system:** read-only consumer of every other subsystem's audit trail. The Registration `RegistrationEditHistoryPanel` is the per-patient prototype; this menu is the system-wide equivalent. Required for compliance review.

### 9.7 Treatment sub-menus (9 sub-departments)

The `treat` primary menu has 10 sub-items (`Sidebar.jsx:43-56`). Only the **first** is wired:

- ✅ `opd-treat` — ตรวจรักษาทั่วไป (OPD) → `/treat/queue`

The other 9 are stubs:

| sub-key | Label | Intended scope |
|---|---|---|
| `family` | แผนกส่งเสริมสุขภาพ (วางแผนครอบครัว) | Family planning + contraceptive dispensing. |
| `std` | แผนกโรคติดต่อทางเพศสัมพันธ์และโรคเอดส์ | STI screening + HIV care; restricted-access ward. |
| `drug` | แผนกบำบัดและรักษาผู้ป่วยติดสารเสพติด | Substance-abuse program; methadone clinic. |
| `anc` | แผนกฝากครรภ์ | Antenatal care; OB/GYN + ultrasound coordination. |
| `wellness` | แผนกส่งเสริมสุขภาพเฉพาะกลุ่มที่สำคัญ | Wellness (DM / HT / NCD high-risk) — visit cadence + lifestyle counseling. |
| `vaccine` | แผนกสร้างเสริมภูมิคุ้มกันโรค | Vaccination clinic + schedule tracking. |
| `dental` | แผนกทันตกรรม | Dental visits + procedures. |
| `tb` | แผนกวัณโรค | TB DOTS program — DOT visit logs + treatment milestones. |
| `mental` | แผนกสุขภาพจิตและคลินิกสุขภาพจิต | Mental health + PHQ-9 / GAD-7 (forms exist in Forms Library). |

**Shared logic sketch:** each sub-department reuses the same `TreatmentFormShell` + 7-step scaffold with a per-domain schema (e.g. ANC adds gestational age + fundus height; TB adds DOT cadence). Sub-menu click ⇒ same Treatment route filtered to that department.

---

## 10 · Cross-flow shared patterns

- **Sidebar persists** across every routed page (except `/components` & `/preview/*`).
- **Queue → Form** pattern is identical for Registration / OPD / Treatment: row click pushes route with `state: { hn }`, the form prefills from `MR_PATIENTS` lookup, the back button on PatientCard returns to the originating queue.
- **FormShell / TreatmentFormShell** handles step index, prev/next, sticky footer, and `UnsavedChangesPopup` guard.
- **PatientCard header** is reused in Registration, OPD Screening, and Treatment detail pages (HN, name, avatar, age, insurance, status, contextual actions).
- **Multi-step forms** never have an explicit "complete" route — final save returns to the originating queue (and most likely fires a success toast, not traced here).

---

## 11 · Mobile companion — ประวัติการเยี่ยมบ้าน

```
┌──────────────────────────────┐
│ /m/records                   │
│ MobileRecordsPage.jsx        │
│ แท็บ “ประวัติการเยี่ยมบ้าน” │
└──────────────┬───────────────┘
               │
               ▼
┌────────────────────────────────────────┐
│ /m/home-visits                          │
│ MobileHomeVisitHistoryPage.jsx          │
│ Timeline เรียงวันที่ล่าสุด → เก่าสุด     │
│ • วันที่ / เวลา / สถานที่                │
│ • สรุปการเยี่ยมและผู้ให้บริการ           │
└──────────────┬─────────────────────────┘
               │ กดรายการ
               ▼
┌──────────────────────────────┐
│ /m/visit/:id                 │
│ MobileVisitPage.jsx          │
│ รายละเอียดบันทึกการรักษา    │
└──────────────────────────────┘
```

- **Actor:** ผู้รับบริการที่เข้าสู่ระบบแล้ว
- **Data:** รายการ `type: 'homevisit'` จาก `usePhcisLink().visits`
- **Empty state:** แสดงข้อความว่าไม่มีประวัติการเยี่ยมบ้าน
