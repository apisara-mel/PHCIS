# Prompt: Home Screen — PHCIS Mobile App

## Context

Design the **Home screen** ("หน้าแรก") for the **PHCIS Mobile App** (iOS + Android). It is the patient's daily landing page — must surface what is relevant **right now** (the next appointment, the latest vitals), give one-tap access to the most-used features, and feel calm, friendly, and trustworthy. Audience includes the general public and elderly users.

Use the **MIH Design System** as the foundation — do not detach instances, do not hard-code colour or spacing.

- Components: Avatar, Tag / Status Badge, Action List, Tab (bottom), Brand Button / Brand Subdue Button, Topic, Tooltip, Small Alert / Large Alert, Indicator, Status Summary Card, Card (Vital / Appointment), Bottom-sheet
- Tokens: MIH semantic tokens (light + dark + brand modes)
- Font: Noto Sans Thai
- Native targets: iOS 15+ / Android 9+

## Visual Reference

A reference of the Home screen is provided. Match this composition:

- **Hello card** at the top — full-width rounded card with a Brand-green gradient fill. Contains a round avatar (left), greeting + date (centre-left), bell / notification icon (right), and a pill with HN + entitlement scheme + blood type along the bottom
- **Quick actions card** — white rounded card with a soft grid (2 rows × 3 cols) of round illustrated icons + label below each: นัดหมาย / Telemedicine / ผลการรักษา / ใกล้บ้าน / ส่งคำขอ / ชำระเงิน
- **ข้อมูลสุขภาพ** section — section header with a "ดูทั้งหมด ›" link on the right; below it, a horizontally scrollable row of soft mint cards showing latest readings (BP / weight / heart rate)
- **นัดหมายถัดไป** — single appointment card with a coloured side stripe, big date on the left, title + location + time on the right, and a status pill ("ยืนยันแล้ว")
- **Bottom tab bar** (5 tabs): หน้าแรก (current) / นัดหมาย / ประวัติ / โปรไฟล์ / เพิ่มเติม

Keep the rest of the design consistent with this composition and rhythm.

## Frame & Layout (Mobile only)

- Artboards: iPhone 14 (390 × 844) primary + Android (360 × 800) variant
- Respect safe-area insets — Hello card extends to the top safe area; the bell icon sits at status-bar height + 8
- Page padding 16, vertical rhythm 16/24 between sections
- Bottom tab bar persists; content scrolls beneath it with a 12-px gradient mask at the bottom
- Pull-to-refresh on the scroll view (mint spinner)

## Sections

### 1. Hello Card (header)

- Full-width rounded card (radius lg), Brand-green gradient (top = brand-600 → bottom = brand-500), text/icons in white
- Left: round avatar (size 56). If the patient has a photo → photo; else show first initial(s) on a softer tinted circle
- Centre block:
  - Greeting line — context-aware:
    - 05:00–11:59 → "อรุณสวัสดิ์, {ชื่อ}" (or simply "สวัสดี, {ชื่อ}")
    - 12:00–17:59 → "สวัสดียามบ่าย, {ชื่อ}"
    - 18:00–04:59 → "สวัสดีค่ำคืน, {ชื่อ}"
  - Date sub-line — Thai weekday + Buddhist calendar date ("พุธที่ 6 พฤษภาคม 2569")
- Right: bell icon button (44 hit area), unread dot if there are notifications, optional small badge counter "5"
- Bottom strip — single pill, semi-transparent white-on-green, dot separators between facts:
  - HN ID ("HN 67-00001")
  - Entitlement scheme ("สิทธิ์ สปสช." / "ประกันสังคม" / "ข้าราชการ" / "ชำระเอง")
  - Blood type ("โลหิต B+")
- Tap on the pill → expand bottom-sheet with full identity card (HN, ชื่อ-นามสกุล, เลขบัตร, สิทธิ์, แพ้ยา, ฯลฯ) + QR code for staff scan
- Tap on the avatar → Profile tab

### 2. Quick Actions

- White rounded card with soft shadow, padding 20
- 2 × 3 grid of round illustrated icons, each 64–72 px, with a light tinted background colour per category:
  - นัดหมาย — mint, calendar illustration (uses **MIH "Calendar" illustration**)
  - Telemedicine — blue, video/TV illustration
  - ผลการรักษา — yellow-green, document illustration
  - ใกล้บ้าน — peach, location pin (map / nearby PCUs)
  - ส่งคำขอ — soft-yellow, envelope (form requests)
  - ชำระเงิน — lavender, credit card
- Label below each icon, single line, centred, ≤ 16 chars
- Items are configurable / reorderable in Settings (long-press → drag handle appears, or via Settings > Quick Actions)
- Each tile shows a notification dot if there is something pending:
  - นัดหมาย — dot if a confirmed appointment is within 24 h
  - ผลการรักษา — dot if new lab results unread
  - ส่งคำขอ — dot if a request status changed
  - ชำระเงิน — dot if an outstanding bill exists; show amount as a tiny chip "฿320" on the tile corner

### 3. Health Data ("ข้อมูลสุขภาพ")

- Section header row: title (left, bold) + "ดูทั้งหมด ›" link (right, Brand Subdue ghost button)
- 3 vital cards in a row (use the **Vital Card** from the design system, default flat style, mint-tinted fill):
  - **ความดัน** — value "128/82" + unit "mmHg" — micro trend indicator (▲ / ▼ / ─) + delta vs last reading
  - **น้ำหนัก** — "72.4" + "kg"
  - **ชีพจร** — "76" + "bpm"
- All cards display the timestamp of the latest reading on tap (Tooltip / small caption "วัดล่าสุด: 6 พ.ค. 09:00")
- Tap a card → opens the matching detail page in ประวัติ (history) with chart + entries
- Out-of-range readings (configurable thresholds) get a destructive border/tint and a Small Alert below the row "ความดันสูงกว่าค่าปกติ — ดูคำแนะนำ"
- If no readings recorded yet → empty state in this section: "ยังไม่มีข้อมูลสุขภาพ — บันทึกครั้งแรก" + Brand Subdue Button
- Optional: a 4th card on the right with a "+" to add a manual reading (long press for quick log)

### 4. Next Appointment ("นัดหมายถัดไป")

- Section header: "นัดหมายถัดไป" (no "see all" — link to the Appointments tab via tap-through on the card)
- Single card matching the reference:
  - Left coloured side stripe by visit type (mint = in-person, blue = video, peach = home visit)
  - Big date block — day + month abbreviation ("6 พ.ค.") on a faintly tinted block
  - Right block — bold title (purpose), location pin + centre name, clock + time + clinic
  - Status pill at the bottom-right ("ยืนยันแล้ว" — positive; "รออนุมัติ" — warning; "ใกล้ถึงเวลา" — brand emphasis)
  - Live countdown when < 24 h: caption "อีก 23 ชม. 12 นาที"
- Special case — video appointment within 15 min: card swaps the status pill for a **Brand Button "เข้าห้องวิดีโอคอล"**; primary CTA right on the home screen
- Tap → Appointment Detail
- If no upcoming appointment → swap the card for an empty-state row with illustration + "ยังไม่มีนัดหมาย" + Brand Subdue Button "ทำนัดหมายใหม่"

### 5. Optional sections (below the fold)

In priority order. Show them only when there's data:

- **"คำขอที่รอดำเนินการ"** — small list of pending requests (refill, sick-leave certificate) with status chip
- **"การชำระเงินค้างชำระ"** — outstanding bills with amount + Brand Button "ชำระตอนนี้"
- **"ข่าวสารและคำแนะนำ"** — 2–3 health-tip cards (vaccination reminders, seasonal flu warnings, etc.), sourced from a CMS
- **"นัดหมายล่าสุด"** — last completed visit summary (medications prescribed, follow-up tag)

Each section uses the same section-header pattern (title + ghost "ดูทั้งหมด" if applicable).

### 6. Bottom Tab Bar

- 5 items, equal width, icons + labels:
  - 🏠 **หน้าแรก** (current — Brand-coloured icon + label)
  - 📅 นัดหมาย
  - ≡ ประวัติ
  - ◉ โปรไฟล์
  - ⋯ เพิ่มเติม
- 56-pt tall (excluding safe-area), respect bottom inset
- Active state: brand colour icon + label; inactive: neutral
- Haptic light-impact on tab change
- Long-press "เพิ่มเติม" → bottom-sheet with secondary destinations (settings, support, language, sign out)

## States & Behaviours

**Loading (first paint)**:

- Skeleton shimmer for: greeting block, quick-actions tiles, vital cards, appointment card
- Avatar shows initials immediately (from cached profile), so even cold-launch feels personalised

**Pull-to-refresh**: mint spinner overlay at the top, re-fetch all sections in parallel; show a brief toast if any fail ("บางส่วนยังโหลดไม่สำเร็จ")

**Offline**:

- Persistent Small Alert below the Hello card: "ขณะนี้ออฟไลน์ — ข้อมูลที่แสดงอาจไม่อัปเดต"
- Cached data still rendered; "เข้าห้องวิดีโอคอล" disabled with a Tooltip

**Empty (first-time user)**:

- Quick actions visible
- Health data: empty state with CTA
- Next appointment: empty state with CTA
- News tips: still shown if available
- Onboarding tip-overlay surfaces twice on first launch (e.g. "แตะที่นี่เพื่อทำนัดครั้งแรก")

**Personalisation**:

- Greeting + date update live as midnight / time-of-day boundary changes (no need to relaunch)
- Theme: light/dark via semantic tokens — the Hello card uses brand-tinted dark variant in dark mode (deep teal gradient)
- Brand mode: if the patient is associated with a specific service centre brand (School / Veterinary / Community / Pharmacy), the Hello card uses that brand's primary token

## Native Interaction Specs

**Navigation**: Home is the root of the Home tab; deep links land here when ambiguous. Tab switches use cross-fade; in-tab pushes use platform default.

**Notifications integration**:

- Bell icon opens an **in-app notification centre** (sheet from the top): grouped by type (Appointments / Results / Requests / System) with "mark all as read"
- Tapping a notification deep-links to its destination
- Live Activity (iOS 16+) for the next upcoming appointment within 24 h

**Widgets** (out-of-app surfaces):

- iOS Home widget: small (next appointment) and medium (next appointment + 2 quick actions)
- Android widget: same shapes
- Lock-screen widget (iOS 16+): "อีก X ชม.X นาที — ตรวจสุขภาพประจำปี"

**Haptic feedback**:

- Pull-to-refresh start: light impact
- Refresh complete: success
- Tab switch: light impact

## Permissions

- Notifications — primed on first launch (see Notification flow doc); banner if denied
- Health data sync (optional) — Apple Health / Health Connect to import readings; primed when the user taps "เพิ่มค่าวัด" the first time
- Location — only when "ใกล้บ้าน" is tapped, never at launch

## Accessibility

- WCAG 2.1 AA contrast (the gradient hero card text vs background must clear 4.5:1 — use a soft dark text shadow if needed)
- Touch targets ≥ 44 pt (iOS) / 48 dp (Android)
- VoiceOver / TalkBack labels in Thai for every interactive element — the HN pill announces "เลขประจำตัวผู้ป่วย HN 67-00001, สิทธิ์ สปสช., โลหิต B+, แตะเพื่อดูเพิ่มเติม"
- Dynamic Type up to 200% — sections reflow; quick-actions grid drops to 2 columns at the largest sizes
- Don't rely on colour for status — pair every status pill with text and an icon
- Respect Reduce Motion (drop the live countdown's tick animation)
- Out-of-range vitals announced via aria-live polite

## Microcopy Guidelines

- "คุณ" not "ท่าน"
- Plain language, high-school reading level
- Greeting uses the patient's first name (or honorific + first name) — never the full legal name
- All status labels are short and consistent with the Appointments / History flows ("ยืนยันแล้ว", "ผ่านมาแล้ว", "ใกล้ถึงเวลา", "ยกเลิกแล้ว")
- Empty-state copy is encouraging not blaming — "ยังไม่มีข้อมูล" not "ไม่พบข้อมูล"

## Edge Cases to Cover

- New user — no HN yet (account exists but registration step at hospital pending): Hello card shows "รอการยืนยันที่ศูนย์บริการ" pill, quick actions limited to: ใกล้บ้าน + ส่งคำขอ + Telemedicine (assessment)
- Patient with multiple service centres → "ศูนย์ปัจจุบัน" badge on the appointment card; switch via Profile
- Patient with critical condition flag (e.g. allergy or chronic disease) → tiny "⚠️ มีข้อมูลทางการแพทย์สำคัญ" chip on the Hello card → tap opens the medical alert sheet
- Outstanding payment > 30 days overdue → a destructive banner above quick actions
- Power-saving mode — disable live countdown animation, fall back to static timestamp
- Locale changes to English mid-session — copy switches; date format follows locale; sections retain order

## Deliverables

1. Hi-fi mockups × 2 platforms (iOS 390 × 844, Android 360 × 800) for: Home default, Home with notifications (bell dot + counter), Home empty (new user), Home offline, Home with video call within 15 min, Home dark mode, Home with critical health alert
2. Use MIH library components throughout — no detached instances
3. Variants: light/dark; loading skeleton; empty/error states for each section
4. Prototype: Home → tap bell → notification centre; Home → tap appointment card → Detail; Home → tap quick action → respective feature; Home → pull-to-refresh
5. Widget mockups for iOS and Android (small + medium)
6. Spec sheet: token usage, breakpoints (small device 360-wide), transition timing, refresh policy, all status / empty / error strings
