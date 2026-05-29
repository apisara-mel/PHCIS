# Prompt: Appointment Flow + Upcoming Reminders — PHCIS Mobile App

## Context

Design the appointment management experience for the **PHCIS Mobile App** (iOS + Android). The user is an existing patient who has registered. Audience includes the general public and elderly users. Thai language. The app supports three types of visits — in-person (พบแพทย์), telemedicine video call (วิดีโอคอล), and home visit (เยี่ยมบ้าน) — and must reliably remind the user before each appointment.

Use the **MIH Design System** as the foundation — do not detach instances, do not hard-code colour or spacing.

- Components: Stepper, Tab, Calendar / Date Picker, Time Slot, Tag / Status Badge, Brand Button / Brand Subdue Button / Danger Button, Small Alert / Large Alert, Action List, List (Dropdown item), Avatar, Tooltip, Bottom-sheet
- Tokens: MIH semantic tokens (light + dark + brand modes)
- Font: Noto Sans Thai
- Native targets: iOS 15+ / Android 9+

## Visual Reference

Reference screens are provided for: Appointments list, Appointment detail, Booking Step 4 (slot picker), and the Telemedicine in-call screen. Match their composition and use these as anchors:

- **List screen** — segmented tab (Upcoming / Past) at the top, large brand CTA "+ ทำนัดหมายใหม่", scrolling list of appointment cards with a coloured type badge, date-time bold, purpose, doctor + service centre, chevron, bottom tab bar
- **Detail screen** — single card with type badge, date-time hero, key-value list (centre, clinic, doctor, ref id, note), outline "เลื่อนนัดหมาย" + destructive "ยกเลิกนัดหมาย" CTAs, and a soft info banner about reminders
- **Booking step 4** — small step-dot indicator at the top, horizontal date strip (5 days, the selected one filled green), grid of time-slot tiles (selected one filled green), sticky bottom "ยืนยันนัดหมาย"
- **Telemedicine** — full-bleed dark UI, doctor name + connection timer at the top, video/chat toggle, large avatar centre stage, shared-files row above the controls, four circular controls at the bottom with the hang-up CTA in destructive red

## Frame & Layout (Mobile only)

- Artboards: iPhone 14 (390 × 844) primary + Android (360 × 800) variant
- Respect safe-area insets — content sits ≥ status-bar + 8 from the top, ≥ gesture-bar + 16 from the bottom
- App bar: back chevron + screen title; right area used only when an action is contextual (e.g. filter on the list)
- Bottom tab bar persists on top-level screens (Appointments list = "นัดหมาย" tab); booking flow, detail, and the call screen are **immersive** — tab bar hidden
- Telemedicine screen is dark by default regardless of system theme

## Screens to Design

### A. Appointments List — "นัดหมาย"

- App bar: title "นัดหมาย" (no back); right = filter icon (optional)
- Segmented Tab below the title: **กำลังจะมาถึง** / **ผ่านมาแล้ว** — defaults to Upcoming
- Sticky CTA row near the top: Brand Button (full width) "+ ทำนัดหมายใหม่"
- Card list, each item shows:
  - Coloured Tag at the top-left for the visit type — `พบแพทย์` (mint), `วิดีโอคอล` (blue), `เยี่ยมบ้าน` (peach)
  - Avatar / leading icon (stethoscope / video / home) matching the type
  - Date + time bold ("6 พ.ค. 2569 · 09:00 น.")
  - Purpose ("ตรวจสุขภาพประจำปี")
  - Doctor + centre on a separate line ("นพ.สมชาย ใจดี · ศ. 8 บางนา")
  - Trailing chevron — taps open Detail
- Past tab: same card style but de-emphasised (lower opacity title, neutral type badge); add a small status pill on each card — `เสร็จสิ้น` (positive) / `ยกเลิกแล้ว` (destructive) / `ไม่มาตามนัด` (warning)
- Empty states:
  - Upcoming empty: illustration + "ยังไม่มีนัดหมาย" + Brand Button "ทำนัดหมายใหม่"
  - Past empty: illustration + "ยังไม่มีประวัติการนัดหมาย"
- Pull-to-refresh refetches the list
- Bottom tab bar with 5 items (หน้าแรก / นัดหมาย / ประวัติ / โปรไฟล์ / เพิ่มเติม) — Appointments is the current tab

### B. New Appointment — 4-step Booking Flow

App bar on every step: back chevron + title "ทำนัดหมายใหม่" + small subtitle "ขั้นที่ N จาก 4". A dot stepper sits just below the app bar (4 dots, current dot filled brand). Sticky bottom Brand Button "ถัดไป" (last step: "ยืนยันนัดหมาย").

**Step 1 — Choose visit type**

- 3 large selectable cards (Action List pattern), each with icon + title + 1-line subtext:
  - "พบแพทย์ที่ศูนย์บริการ" — สำหรับการตรวจที่ต้องเจอแพทย์ที่ศูนย์
  - "วิดีโอคอลกับแพทย์" — ปรึกษาผ่านวิดีโอ ไม่ต้องเดินทาง
  - "เยี่ยมบ้าน" — แพทย์/พยาบาลไปตรวจที่บ้าน
- Single-select, ring + check mark on the chosen card
- Disabled state for types not available to this patient (with a Tooltip explaining why)

**Step 2 — Choose service centre + clinic**

- Search Input Field at the top to filter centres
- List of nearby centres (sorted by distance), each row: centre name, address, distance, hours, availability badge
- Tap a centre → reveals a chevron-disclosure with available clinics (e.g. ตรวจรักษาทั่วไป, อนามัย, ทันตกรรม)
- Selected clinic gets a check; "ถัดไป" enables

**Step 3 — Choose doctor (optional)**

- Toggle at top: "เลือกแพทย์เอง" / "แพทย์คนใดก็ได้" — defaults to "any"
- If "เลือกเอง": list of doctors with avatar, name + specialty, next available date, rating; tap to select
- If "ใดก็ได้": show a summary card "ระบบจะจัดแพทย์ที่ว่างให้คุณ"

**Step 4 — Choose date + time** (matches the reference)

- Date strip: 5 days starting today, horizontally scrollable (long-tap → opens full Calendar / Date Picker bottom-sheet for further dates). Each chip = tall tile with weekday letter + bold day number + month label. Selected chip = Brand fill, white text.
- Below: "{selected date} — เลือกเวลา"
- Time slot grid (3 columns): each slot is a tile with bold time. States: available / **selected** (Brand fill) / **disabled** (greyed, struck through if booked)
- Late afternoon / out-of-hours slots are hidden, not greyed
- Sticky bottom Brand Button: "ยืนยันนัดหมาย" → opens a Confirm bottom-sheet summarising the appointment, then routes to Detail

### C. Appointment Detail — "รายละเอียดนัดหมาย"

- App bar: back chevron + title "รายละเอียดนัดหมาย"
- Hero card:
  - Coloured Tag at the top (visit type)
  - Square icon tile (matches type)
  - Big centred date-time: "6 พ.ค. 2569 · 09:00 น."
  - Key-value list below:
    - ศูนย์บริการ — name
    - คลินิก — name
    - ผู้ตรวจ — doctor name (or "ระบบจะจัดให้")
    - รหัสนัดหมาย — APT-XXXX (monospace, tap to copy)
    - หมายเหตุ — free text from booking
  - Two CTAs stacked:
    - Brand Subdue Button (outline) "📅 เลื่อนนัดหมาย"
    - Danger Button (filled red) "✕ ยกเลิกนัดหมาย"
  - Info banner below: "🔔 ระบบจะส่งการแจ้งเตือนก่อนถึงเวลานัด 1 วัน และ 1 ชั่วโมง"
- Extra actions surfaced near the bottom:
  - "เพิ่มลงปฏิทินของฉัน" → opens system add-to-calendar
  - "นำทางไปยังศูนย์บริการ" → opens Maps with the centre coords
  - For video-call appointments only: "เข้าห้องวิดีโอคอล" — disabled until 15 min before the start time, becomes Brand Button when within window
- For appointments in the **Past** tab, hide reschedule/cancel and replace with: "ดูสรุปการตรวจ" (links to History) and "นัดหมายใหม่กับแพทย์ท่านนี้" (re-book shortcut)

### D. Reschedule Sheet

- Bottom-sheet opened from "เลื่อนนัดหมาย"
- Same date strip + slot grid as Booking Step 4 (re-uses the component)
- Header: "เลื่อนนัดหมาย — ปัจจุบัน: 6 พ.ค. 2569, 09:00 น."
- Cap: max 2 reschedules per appointment. After that, show inline Small Alert "เลื่อนได้ไม่เกิน 2 ครั้ง — โปรดติดต่อเจ้าหน้าที่"
- Brand Button "ยืนยันการเลื่อน" → Confirm bottom-sheet → success toast + back to Detail
- Free up to 24 hours in advance; within 24 h, show a Tooltip warning

### E. Cancel Confirmation

- Bottom-sheet opened from "ยกเลิกนัดหมาย"
- Title "ยืนยันการยกเลิก?"
- Body: appointment summary + warning if cancelling within 24 h: "ยกเลิกในช่วง 24 ชั่วโมงก่อนนัด อาจถูกบันทึกเป็น 'ไม่มาตามนัด'"
- Optional select: "เหตุผลในการยกเลิก" (ไม่ว่าง / ไม่สบาย / อื่นๆ) — required if within 24 h
- CTAs: Brand Subdue "เก็บนัดเดิมไว้" / Danger "ยืนยันการยกเลิก"

### F. Telemedicine — In-call (Video Call) screen

(Matches the dark reference)

- Status bar adapts to dark (light icons)
- Top bar: doctor name + specialty + connection indicator "🟢 กำลังคุย · 04:23" (live timer)
- Mode toggle pill below: **วิดีโอคอล** / **แชท** — switches the main area
- Main area:
  - Video mode: doctor's video feed (or large initials avatar in a coloured circle if video off), self-view PIP in the corner (drag to reposition)
  - Chat mode: chat thread, message composer at the bottom
- Shared files strip just above the controls: "เอกสารที่แพทย์แชร์ในห้องนี้" + horizontally scrollable cards showing pdf/image previews; tap to view in-app, long-press to save
- Controls row at the bottom (4 circular buttons, glassmorphism over dark):
  - ปิดไมค์ / เปิดไมค์ (toggle, red when muted)
  - ปิดกล้อง / เปิดกล้อง
  - แชร์จอ
  - วางสาย (destructive red, filled)
- Edge cases:
  - Poor network: small warning chip top-centre "สัญญาณอ่อน — กำลังพยายามเชื่อมต่อ"
  - Hung up: post-call rating sheet (1–5 stars + optional comment + Brand Button "บันทึก")
  - Doctor disconnected: large alert overlay with "Doctor disconnected — กำลังพยายามเชื่อมต่ออัตโนมัติ"
- Permissions: Camera + Microphone primed beforehand on a permission screen; if denied, the call cannot start (show recovery path)

## Notifications — Upcoming Appointment

### Schedule

| When | Channel(s) | Style |
|---|---|---|
| Booking confirmed | Push + in-app toast | Success — "นัดหมายของคุณยืนยันแล้ว · 6 พ.ค. 2569 09:00" |
| 1 day before | Push (10:00 of D-1) | Reminder — "พรุ่งนี้ 09:00 น. คุณมีนัด ตรวจสุขภาพประจำปี กับ นพ.สมชาย ใจดี" |
| 1 hour before | Push | Reminder — "อีก 1 ชั่วโมงคุณมีนัด ตรวจสุขภาพประจำปี ที่ ศ. 8 บางนา" |
| 15 min before (video call only) | Push, high priority | Action — "ห้องวิดีโอคอลจะเปิดในอีก 15 นาที · กดเพื่อเข้าห้อง" → deep link to Telemedicine screen |
| Doctor rescheduled / cancelled | Push + in-app banner + email | Warning / destructive |
| Missed appointment | Push (T+15 min) | Warning — "คุณไม่มาตามนัด — แตะเพื่อนัดใหม่" |

### Push payload (design hand-off)

- Title, body, deep link to `/appointments/{id}`
- Show actions on iOS / Android notification: "เข้าห้องวิดีโอคอล" (video only) and "เลื่อนนัด"
- Notification grouping: thread by appointment id (replaces previous reminder rather than stacking)
- Quiet hours: never send between 22:00–07:00 (defer to 07:00)
- User can mute reminders per appointment in Detail screen — Action List entry "ปิดการแจ้งเตือนนัดนี้"

### In-app banner / Home screen card

- On Home (หน้าแรก) and on Appointments list, surface an **"นัดถัดไป"** card showing the soonest upcoming appointment with a live countdown when < 24 h remain ("ในอีก 23 ชม.", "ในอีก 47 นาที")
- The card has a Brand Subdue Button "ดูรายละเอียด" → opens Detail; for video calls within 15 min, swap to a primary Brand Button "เข้าห้องวิดีโอคอล"

### Permission flow

- Request Notification permission on first launch with a priming screen (Large Alert) explaining why it matters for appointments
- If denied, show a persistent inline warning on Appointments list: "การแจ้งเตือนถูกปิด — คุณอาจพลาดนัดหมาย" with Brand Subdue Button linking to Settings

## Native Interaction Specs

**Navigation**: push transition between booking steps; Detail is a push from list; Reschedule/Cancel are bottom-sheets; Telemedicine is a presentation/modal that takes over the screen.

**Keyboard**: tap outside to dismiss; CTA floats above the keyboard; iOS "Done" accessory; Android "Next" between fields where relevant.

**Permissions**: Notifications (first launch), Camera + Microphone (before first video call), Calendar (when "เพิ่มลงปฏิทินของฉัน" is tapped), Location (optional, used to sort centres by distance).

**Loading / Network**:

- List uses skeleton rows; slot grid uses shimmer tiles
- Optimistic UI for confirm / reschedule / cancel — rollback with toast on failure
- Offline: greyed CTAs + a Small Alert "ไม่มีการเชื่อมต่อ"

**Haptic feedback**:

- Selecting a date / slot — selection
- Booking confirmed — success
- Cancel — warning
- Hang up — light impact

**Accessibility** (mandatory):

- WCAG 2.1 AA contrast (especially on the dark Telemedicine screen)
- Touch targets ≥ 44 pt (iOS) / 48 dp (Android)
- VoiceOver / TalkBack labels in Thai for every control — date chips read full date, slot tiles read "available 09:00"
- Dynamic Type / font scaling up to 200% — list cards reflow rather than truncating critical info
- Live regions announce connection-state changes during the call
- Respect Reduce Motion (skip slot-grid stagger animation, etc.)

**Dark mode**: every non-call screen supports light + dark via semantic tokens; the Telemedicine screen is always dark.

**Microcopy**: use "คุณ" instead of "ท่าน". Plain language. Confirmations explain consequences (reschedule limit, cancel within 24h, missed-appointment policy). Error messages explain how to fix the issue.

## Edge Cases to Cover

- Slot becomes unavailable between Step 4 and Confirm (race) → show inline error, ask to pick another
- Patient tries to book overlapping appointment → Large Alert with the conflict and "ดูนัดที่ทับซ้อน"
- Reschedule cap reached (2/2) → outline button disabled + Tooltip
- Cancelling within 24 h triggers "missed" policy — show clearly
- Past appointments cannot be rescheduled or cancelled
- Video call permission denied → call cannot start; show recovery screen with "ไปที่ Settings"
- Network drops mid-call → auto-reconnect attempt + visible status; if it fails, show summary screen
- Patient's preferred doctor leaves — appointment goes into "ระบบกำลังจัดแพทย์ใหม่" state with a soft warning on the card
- Notification permission denied → recommend in-app and email reminders as fallback; surface a banner

## Deliverables

1. Hi-fi mockups × 2 platforms (iOS 390 × 844, Android 360 × 800) for: Appointments list (Upcoming + Past + empty), Booking steps 1–4 + Confirm sheet, Appointment Detail, Reschedule sheet, Cancel sheet, Telemedicine in-call (video + chat modes + post-call rating), Home "นัดถัดไป" card, Permission priming
2. Use MIH library components throughout — no detached instances
3. Variants: light/dark for every non-call screen; default / loading / error / empty / disabled states
4. Prototype: Home → Appointments list → "+ ทำนัดหมายใหม่" → Step 1 → 2 → 3 → 4 → Confirm sheet → Detail → Reschedule → back; separate prototype from Detail → Join video call → Hang up → Rating
5. Notification mockups (push lock-screen + grouped, in-app banner, home card) — both languages of Thai system locale
6. Spec sheet: token usage, validation rules, transition timing, reminder schedule, error / permission copy
