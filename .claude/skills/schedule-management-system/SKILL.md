---
name: schedule-management-system
description: >
  Build the MIH PHCIS staff-schedule management system (จัดการตารางเวร) — the
  page where an administrator manages personnel rosters, work shifts, and
  leave. Use this skill whenever the user asks for: schedule management, work
  roster, shift planning, จัดการตารางเวร, ระบบจัดตารางเวร, ตารางเวร, nurse
  roster, doctor roster, on-call schedule, staff leave planning, or any page
  that lists clinical / admin personnel together with a "scheduleStatus"
  (รอจัดตารางเวร / กำลังจัดตารางเวร / จัดตารางเวรแล้ว / ที่ว่างไว้).

  This is distinct from the appointment-management-system skill: that one
  builds patient-appointment booking; THIS one is for the staff-side roster
  & shift configuration. Always use this skill whenever the user wants any
  kind of staff-schedule management UI in this project.
---

# Schedule Management System — Skill

Build "จัดการตารางเวร" pages for MIH PHCIS. Every page MUST be wrapped in the
PHCIS chrome (sidebar + header + content + footer); only the inner content
varies. Every dimension, color, radius, shadow, blur, and type value MUST
alias a token from `design.md` (the only exception is gradients). Icons come
from the Figma library via `<Icon>` first, shadcn / Lucide second — never any
other source.

## When this skill is triggered

Auto-trigger when the user mentions any of:
- ระบบจัดตารางเวร · จัดการตารางเวร · ตารางเวร
- "schedule management", "shift roster", "work-shift planning"
- Setting up a staff roster, on-call schedule, leave / holiday planning
- Building any page that lists clinical / admin personnel with a
  schedule-status pill

If a request overlaps with the legacy `appointment-management-system` skill,
prefer this skill whenever the focus is the staff-side roster rather than
patient appointments.

## Mandatory · Step 0: audit before writing any UI

Before creating or modifying any component, run this audit. Skipping it is
not allowed.

### 0.1 — Read `design.md`

Open the project's [`design.md`](../../../design.md) and confirm which tokens
cover the values you need (color, dimension, radius, typography, shadow,
blur, opacity, etc.). If any required value is missing, **add a new token to
both `design.md` and `src/index.css` `:root`** before writing the component.
Never silently introduce a literal.

### 0.2 — Audit the design system + existing pages

Search `src/components/**` and `src/pages/appointment/AppointmentSystemPage.jsx`
for atoms / molecules that match what you want to build. Re-use them — do not
duplicate.

Existing components you MUST alias (never re-create):

| Component                               | File                                                              |
| --------------------------------------- | ----------------------------------------------------------------- |
| `<Icon name='...' />`                   | `src/components/icons/Icon.jsx` (Material Symbols + custom map)  |
| `<Pill bg fg leading>...`               | inline in `AppointmentSystemPage.jsx` (token-only)               |
| `<Avatar name src fallbackIcon size>`   | inline in `AppointmentSystemPage.jsx` (DiceBear + icon fallback) |
| `<Switch on onClick label>`             | inline in `AppointmentSystemPage.jsx`                            |
| `<Card>...`                             | inline in `AppointmentSystemPage.jsx`                            |
| `<Table>` + `<EllipsisText>`            | `src/components/table/Table.jsx`                                 |
| `<FilterTag>` + `<FilterDropdown>`      | `src/components/forms/FilterTag.jsx`                             |
| `<FilterDateTag>`                       | `src/components/forms/FilterDateTag.jsx`                         |
| `<InputField>` / `<Select>`             | `src/components/forms/`                                          |
| `<DatePicker>`                          | `src/components/forms/DatePicker.jsx`                            |
| `<Popup>` (modal) / `<Popover>`         | `src/components/popup/`                                          |
| `<BrandButton>`                         | `src/components/button/BrandButton.jsx`                          |
| `<NeutralSubdueButton>`                 | `src/components/button/NeutralSubdueButton.jsx`                  |
| `<DangerSubdueButton>`                  | `src/components/button/DangerSubdueButton.jsx`                   |
| `<OverflowFlexRow>`                     | `src/components/overflow/OverflowFlexRow.jsx`                    |
| `<PhcisChrome>` (page shell)            | `src/pages/appointment/AppointmentSystemPage.jsx`                |
| `<StaffListView>`                       | `src/pages/appointment/AppointmentSystemPage.jsx`                |
| `<ShiftPopup>`                          | `src/pages/appointment/AppointmentSystemPage.jsx`                |

### 0.3 — Component policy

```
Existing component   → alias it (DO NOT duplicate)
No existing component → create new, alias tokens from design.md,
                        place under src/components/<category>/
```

If you must invent a new shared component, put it under the right
`src/components/` sub-folder so other features can re-use it. Inline
single-page atoms are acceptable only when they are clearly page-specific
(see `<Pill>`, `<Card>` inside `AppointmentSystemPage.jsx`).

## Layout · PHCIS Chrome (must be re-used, not re-implemented)

Every schedule-management page MUST be wrapped in `<PhcisChrome>` from
`src/pages/appointment/AppointmentSystemPage.jsx`. The chrome layout is
fixed — only the children change between pages.

```
PhcisChrome
├── Slim left sidebar (48px) — icon-only nav, active item uses
│                              --surface-brandPrimary-quaternary
├── Top header               — apps grid · "ระบบ PHCIS" · breadcrumb
│                              · branch chip (ศูนย์ 4 ดินแดง) · date
│                              pill · font-size buttons (ก ก ก) · user
│                              chip · "คู่มือใช้งานระบบ" button
├── <main>                   — your page content. Default padding via
│                              --dim-space-600 on all sides.
└── Footer                   — © 2026 ศูนย์บริการสาธารณสุข สำนักอนามัย
                               กรุงเทพมหานคร · Privacy Policy · Terms
                               of Service
```

DO NOT:
- Re-implement the sidebar, header, or footer inside your page.
- Wrap a schedule-management page in `<QueuePageShell>` — that template
  belongs to the OPD-queue subsystem; PHCIS-schedule has its own chrome.
- Add a sidebar entry without first asking the user.

DO:
- Pass page content as `children` of `<PhcisChrome>`.
- Override the breadcrumb crumbs and active sidebar icon via props when
  building a new sibling page.

## Pages this skill builds

### Page A · Staff list (Figma node `16:52625`)

A filterable roster of personnel by `scheduleStatus`.

1. **Page title** — `จัดการตารางเวร` (h1, `--type-size-xl`, primary text).
2. **5 status sub-tabs** — `ทั้งหมด · รอจัดตารางเวร · กำลังจัดตารางเวร ·
   จัดตารางเวรแล้ว · ที่ว่างไว้`. Each tab carries an icon + count badge.
   Active tab uses a 2px underline (`--brand-p700`) + bold label.
3. **Centered search bar** — pill-shaped 480px wide. A 2-avatar peek +
   `ค้นหาล่าสุด` label sits to the right of the input.
4. **Filter chips row** — `ทั้งหมด · Group Policy · สายย่อย · แผนก` (left),
   `ปริ้นต์/ออกรายงาน` outline button (right).
5. **Sortable 5-col table**:
   - ชื่อ-นามสกุล — Avatar + name
   - Group Policy — Pill (`GROUP_POLICY_META[s.groupPolicy]`)
   - สายย่อย — Pill (neutral background)
   - แผนก — Pill (indigo background)
   - สถานะ — Pill (`SCHEDULE_STATUS_META[s.scheduleStatus]`)
6. **Pagination** — `แสดง X–Y จาก Z รายการ` (left); page numbers + prev /
   next chevrons (right). Use the existing pagination logic, do not import
   a new pagination library.

Clicking a row opens **Page B** for that staff member.

### Page B · Staff schedule editor (Figma node `35:7311`)

The per-staff editor:

1. **Back nav row** — `← กลับ` button + `จัดการตารางเวร` page title.
2. **Hero card** — teal gradient (the ONE allowed gradient on this page):
   - Avatar (large)
   - `<staff.name>` + `<staff.nameEn>` stacked
   - Inline pills: Group Policy · สายย่อย · แผนก
   - Right-aligned white pill: `วันลาคงเหลือทั้งหมด <N> วัน`
3. **Month navigator** — `◀ <ThaiMonth> <BuddhistYear> ▶`. Month-only —
   no day / week toggle on this Figma frame.
4. **Time + booking row**:
   - ระยะเวลาตรวจ stepper: `− <minutes> +` นาที ต่อ slot
   - ประเภทการรับตรวจ dropdown + 3 sliders (จองปกติ / ออนไลน์ /
     พิเศษ-ฉุกเฉิน). พิเศษ = 100 − จองปกติ − ออนไลน์ (auto).
5. **เลือกตารางเวร** section header + `เลือกหลายวัน` checkbox right.
6. **Shift chips row** — drives single-click shift assignment on the
   calendar grid:

   | Chip       | Time          | Surface token                        | Text token                       |
   | ---------- | ------------- | ------------------------------------ | -------------------------------- |
   | เช้า       | 08:00–12:00   | `--surface-colorfulbadge-orange`     | `--text-colorfulbadge-orange`    |
   | เย็น       | 13:00–16:00   | `--surface-colorfulbadge-cyan`       | `--text-colorfulbadge-cyan`      |
   | ตอนเย็น    | 16:00–20:00   | `--surface-colorfulbadge-purple`     | `--text-colorfulbadge-purple`    |
   | On-call    | —             | `--surface-brandPrimary-quaternary`  | `--text-brandPrimary-default`    |
   | Day Off    | —             | `--surface-colorfulbadge-red`        | `--text-colorfulbadge-red`       |

7. **Calendar grid** — 7 cols × 5 rows (Mon-first). Each cell is a click
   target that opens `<ShiftPopup>`. National holidays render an info
   banner inside the cell but DO NOT block the schedule (see
   `doctorWorksDay` — `type === 'national'` is informational only).
8. **Sticky action bar** — `ยกเลิก` (NeutralSubdueButton) + `บันทึก`
   (BrandButton). Aligned right inside the editor card.

## Data shape

Extend the existing `INITIAL_STAFF` in
[`src/pages/appointment/AppointmentSystemPage.jsx`](../../../src/pages/appointment/AppointmentSystemPage.jsx)
rather than introducing a new array. Required fields:

```js
{
  id: 1,
  role: 'doctor' | 'nurse' | 'admin',
  gender: 'M' | 'F',
  name: 'นายสมชาย โสมวัฒน์',
  nameEn: 'Somchai Jaisawaddee',
  spec: 'อายุรกรรม' | '',
  dept: 'อายุรกรรม',           // แผนก column
  subDivision: 'เห็นพาเชนต์',  // สายย่อย column
  groupPolicy: 'doctor',       // key into GROUP_POLICY_META
  scheduleStatus: 'pending' | 'inprogress' | 'done' | 'reserved',
  avatar: dicebear('Somchai'),
  phone: '02-742-1234',
  schedule: defaultSchedule(false, false, false, false, false, false, false),
  daysOff: [],
  daysOn:  [],
  avgExamMin: 15,
  lastMonthMin: 4320,
  leaveBalance: {
    vacation: 3, sick: 5, personal: 2, study: 7,
    paternity: 0, ordination: 0, compensation: 1,
  },
}
```

`leaveBalance` keys MUST be a subset of `LEAVE_TYPES[].key`. Render the
breakdown card below the hero — each row: icon + label + used / quota +
progress bar + remaining days. Switch the accent to
`--text-colorfulbadge-orange` when remaining ≤ `max(2, 10% of quota)`.

## Color discipline (every value must be a token)

Map roles to tokens once, then never deviate.

| Role                    | Surface token                       | Text token                       |
| ----------------------- | ----------------------------------- | -------------------------------- |
| Brand / active          | `--surface-brandPrimary-quaternary` | `--text-brandPrimary-default`    |
| Doctor pill             | `--surface-colorfulbadge-indigo`    | `--text-colorfulbadge-indigo`    |
| Nurse pill              | `--surface-colorfulbadge-purple`    | `--text-colorfulbadge-purple`    |
| DPO pill                | `--surface-colorfulbadge-red`       | `--text-colorfulbadge-red`       |
| IT pill                 | `--surface-colorfulbadge-cyan`      | `--text-colorfulbadge-cyan`      |
| Admin pill              | `--surface-colorfulbadge-pink`      | `--text-colorfulbadge-pink`      |
| Registrar pill          | `--surface-colorfulbadge-yellow`    | `--text-colorfulbadge-yellow`    |
| Status · pending        | `--surface-colorfulbadge-orange`    | `--text-colorfulbadge-orange`    |
| Status · inprogress     | `--surface-colorfulbadge-cyan`      | `--text-colorfulbadge-cyan`      |
| Status · done           | `--surface-brandPrimary-quaternary` | `--text-brandPrimary-default`    |
| Status · reserved       | `--surface-colorfulbadge-purple`    | `--text-colorfulbadge-purple`    |
| Holiday / fullday leave | `--surface-colorfulbadge-red`       | `--text-colorfulbadge-red`       |

Leave-type accents (used by the per-type breakdown):

| Leave type                   | Token family |
| ---------------------------- | ------------ |
| ลาพักผ่อน                    | cyan         |
| ลาป่วย                       | red          |
| ลากิจส่วนตัว                 | purple       |
| ลาศึกษา / ฝึกอบรม            | indigo       |
| ลาคลอด                       | pink         |
| ช่วยภรรยาหลังคลอด            | pink         |
| ลาอุปสมบท / ฮัจย์            | yellow       |
| วันหยุดชดเชย                 | orange       |

If `design.md` is missing any of these palette slots, ADD them before
writing the component. Never invent inline colors.

## Workflow

### 1 · Confirm scope with the user

If the request is vague, ask whether they want: (a) staff-list page only,
(b) editor page only, or (c) both. Build incrementally and ask before
adding new routes / sidebar entries.

### 2 · Reuse first, build second

Open `src/pages/appointment/AppointmentSystemPage.jsx` and pull in the
existing pieces:

- Components: `PhcisChrome`, `StaffListView`, `Pill`, `Avatar`, `Switch`,
  `Card`, `ShiftPopup`, `Slider`
- Constants: `STATUS_TABS`, `SCHEDULE_STATUS_META`, `GROUP_POLICY_META`,
  `SHIFT_TYPES`, `LEAVE_TYPES`, `HOLIDAY_TYPES`, `HOLIDAY_SCOPES`,
  `TH_NATIONAL_HOLIDAYS_2026`, `THAI_MONTHS`, `WEEKDAY_KEYS`,
  `CAL_DAY_HEADERS`
- Helpers: `defaultSchedule`, `doctorWorksDay`, `holidayDisplayLabel`,
  `isoKey`, `toMin`, `pad2`, `buildMonthGrid`, `startOfWeek`

### 3 · Add tokens FIRST if a value is missing

1. Append the new token row to the right table in `design.md`.
2. Expose the matching CSS custom property in `src/index.css` `:root`.
3. Reference it via `var(--…)` in the component (with a literal fallback
   that matches the variable's actual value).

### 4 · Build / edit the page

Add or update files inside `src/pages/appointment/` (or a sibling folder
if the feature is genuinely standalone). Wrap in `<PhcisChrome>`. Wire to
existing handlers (`onApplyShift`, `onRemoveShift`, `onSetHoliday`,
`onToggleDay`). Don't introduce parallel state for shifts / holidays.

### 5 · Hook up navigation (only if needed)

If a new route is needed, update `src/routes/Routes.jsx`. Confirm with
the user whether the sidebar entry's label / icon should change. Do not
silently add a sidebar entry.

### 6 · Verify

- Parse-check with `@babel/parser` (React 17 + JSX). The project is
  React 17 — React-18-only hooks (`useId`, `useSyncExternalStore`,
  `useDeferredValue`, `useTransition`, `useInsertionEffect`) crash at
  render. DO NOT use them.
- Open `/appointment` in a browser. Test golden path AND edge cases
  (no staff, all-holiday day, low leave-balance accent). Type-check
  passing does NOT equal feature working.
- Grep-sanity-check token discipline:
  ```bash
  grep -Pn "borderRadius:\s*\d|background:\s*'#|fontSize:\s*'\d+px'" \
    src/pages/appointment/AppointmentSystemPage.jsx
  ```
  Expect zero hits in new code.

## Constraints (non-negotiable)

- React 17 — no React-18-only hooks.
- All `SuggestibleTextarea voice` fields ship with `suggestions` + `minChars`.
  No bare `VoiceTextarea`.
- Custom inputs strip every form-control chrome (`border`, `outline`,
  `box-shadow`, `background`, `-webkit-appearance`, `appearance`) via an
  injected idempotent stylesheet using `!important`, including `:focus` and
  `:focus-visible`. Set `caret-color: transparent` unless the caret is part
  of the design.
- Icons: Material Symbols via `<Icon>` first, shadcn / Lucide second.
  Nothing else. No inline `<svg>` for a glyph that already exists in those
  two libraries.
- Gradients are the only inline color form allowed. Every other value
  must alias a token.
- Never write secrets, never commit, never run destructive git commands
  unless the user explicitly asks.

## Common edits (cheat sheet)

| Change                       | What to edit                                              |
| ---------------------------- | --------------------------------------------------------- |
| Add a status tab             | `STATUS_TABS` + `SCHEDULE_STATUS_META`                    |
| Add a Group Policy           | `GROUP_POLICY_META` (add a `--*-colorfulbadge-*` first    |
|                              | if no matching palette slot exists)                       |
| Add a leave type             | `LEAVE_TYPES` (key, label, icon, quota, optional gender)  |
|                              | + `HOLIDAY_TYPES` so it's selectable inside `<ShiftPopup>`|
| Add a shift block            | `SHIFT_TYPES` (key, label, time, surface, text)           |
| Rename a sidebar entry       | `<PhcisChrome>` sidebar list — ask first if it changes    |
|                              | navigation                                                |
| Add a national holiday       | `TH_NATIONAL_HOLIDAYS_2026` (`{date, name, type: 'national',`|
|                              | `scope: 'fullday'}`). Banner-only; does not block staff.  |

## Anti-patterns (will be flagged in review)

- `borderRadius: 8` / `borderRadius: '6px'` — numeric or string literal
- `background: '#xxxxxx'` (where the hex matches an existing token)
- `padding: '12px 16px'` (where `--dim-space-*` exists)
- `fontSize: '14px'` / `fontWeight: 700` (use `--type-size-*` / `--type-weight-*`)
- `boxShadow: '0 4px 12px rgba(0,0,0,0.12)'` (where `--shadow-*` exists)
- Inline `<svg>` for an icon that already exists in Material Symbols or Lucide
- Re-implementing the sidebar / header / footer inside a schedule page
- Wrapping the page in `<QueuePageShell>` instead of `<PhcisChrome>`
- Introducing per-page state for shifts / holidays / staff (re-use the
  root handlers in `AppointmentSystemPage`)
