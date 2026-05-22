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

| Item | Status |
|---|---|
| Treatment sub-departments (Family Health, STD, Substance, Antenatal, Mental, Vaccine, Dental, TB, Psychiatry) | SideSubMenu opens but child items have no `path` |
| รังสีวินิจฉัย, ห้องปฏิบัติการ, เภสัชกรรม, งานการเงิน, นัดหมาย, ประวัติการใช้งาน | No `path` in `ITEMS` array |

These are placeholders for future implementation.

---

## 10 · Cross-flow shared patterns

- **Sidebar persists** across every routed page (except `/components` & `/preview/*`).
- **Queue → Form** pattern is identical for Registration / OPD / Treatment: row click pushes route with `state: { hn }`, the form prefills from `MR_PATIENTS` lookup, the back button on PatientCard returns to the originating queue.
- **FormShell / TreatmentFormShell** handles step index, prev/next, sticky footer, and `UnsavedChangesPopup` guard.
- **PatientCard header** is reused in Registration, OPD Screening, and Treatment detail pages (HN, name, avatar, age, insurance, status, contextual actions).
- **Multi-step forms** never have an explicit "complete" route — final save returns to the originating queue (and most likely fires a success toast, not traced here).
