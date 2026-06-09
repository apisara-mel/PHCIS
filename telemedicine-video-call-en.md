# Prompt: Telemedicine Video Call with Doctor — PHCIS Mobile App

## Context

Design the **telemedicine video-call** feature for the **PHCIS Mobile App** (iOS + Android). It launches when the patient taps "Join video call" from an appointment of type **วิดีโอคอล**. The other party on the call is a doctor (or, in some flows, a clinical officer / pharmacist). Audience includes the general public and elderly users — must be reliable, low-friction, and reassuring on flaky mobile networks.

Use the **MIH Design System** as the foundation — do not detach instances, do not hard-code colour or spacing. The call screen is **dark by default** regardless of system theme; chrome around it uses semantic tokens.

- Components: Avatar, Tag / Status Badge, Tab (segmented), Small Alert / Large Alert, Tooltip, Brand Button / Danger Button, Action List, Bottom-sheet, Action Bar (custom round controls)
- Tokens: MIH semantic tokens
- Font: Noto Sans Thai
- Native targets: iOS 15+ / Android 9+
- Real-time stack assumption: WebRTC; signalling via PHCIS backend

## Visual Reference

A reference of the in-call screen is provided. Match its composition:

- Dark background (near-black with a subtle green tint card area)
- Top: doctor name (bold), small clinician avatar, presence dot + state "กำลังคุย · 04:23" with a live timer
- Segmented pill toggle just below: **🎥 วิดีโอคอล** / **💬 แชท** — the active mode has a 1px ring
- Main stage: large rounded card. If video is off / not started, show a big Brand-coloured circular avatar with the doctor's initials ("นพ")
- "เอกสารที่แพทย์แชร์ในห้องนี้" section above the controls, with a horizontally scrollable strip of file cards (filename, file-type icon, thumbnail)
- Bottom: 4 round controls in glassmorphism / matte-dark, labelled below — **ปิดไมค์ · ปิดกล้อง · แชร์จอ · วางสาย** (the last one filled destructive red)

Carry this language across every state on the screen.

## Frame & Layout (Mobile only)

- Artboards: iPhone 14 (390 × 844) primary + Android (360 × 800) variant
- Respect safe-area insets — controls sit ≥ gesture-bar + 16 from the bottom; top bar avoids the notch / dynamic island
- Status bar adapts to dark (light icons)
- **Immersive**: no app tab bar; back chevron hidden — the only way out is "วางสาย" or "ย่อหน้าจอ"
- Lock to portrait by default; allow landscape for screen sharing only (re-flows controls to a vertical strip on the right)

## Screens / States to Design

### 1. Pre-call · Permission priming

Shown the first time the patient taps "Join video call".

- Large Alert in a card layout — soft icon, title "ต้องการเข้าถึงไมโครโฟนและกล้อง", body explaining why (talk to the doctor + show your face / symptoms), and a small note "เปิดได้/ปิดได้ระหว่างการสนทนา"
- Brand Button "อนุญาต" → triggers system permission dialog
- Brand Subdue Button "ยังไม่อนุญาต" → dismisses; returns to appointment Detail with a banner about how to enable later
- If permission already granted, skip this screen

### 2. Pre-call · Connection check / Lobby

- Dark layout, doctor avatar centre stage, doctor name + appointment time
- Sub-status: "กำลังเชื่อมต่อ..." → "ทดสอบสัญญาณ..." → "พร้อมเริ่มการสนทนา"
- Network-quality chip top-centre — small dot + label: **ดี / พอใช้ / อ่อน** (green / amber / red). Tap → bottom-sheet with tips ("เข้าใกล้ Wi-Fi", "ปิดแอปอื่น", "ใช้หูฟัง")
- Self-preview tile (your camera) in a rounded rectangle, mirrored; toggle camera and mic before joining
- Brand Button (large, full width) "เข้าห้องวิดีโอคอล" — disabled until permissions OK + network passes minimum
- Hint copy if early: "ห้องจะเปิด 15 นาทีก่อนเวลานัด — เริ่มได้ตอน 08:45 น."

### 3. Pre-call · Waiting room (doctor not joined yet)

- Same dark canvas
- Centre: large pulsing avatar with the doctor's initials + caption "กำลังรอคุณหมอเข้าห้อง..."
- Below: estimated wait if available ("รอประมาณ 2 นาที") or a tip ("คุณสามารถส่งข้อความทักทายไว้ก่อนได้")
- Bottom controls show **ปิดไมค์ / ปิดกล้อง / แชท / วางสาย** (no "แชร์จอ" yet — locked until doctor joins)
- After 5 min with no doctor: Small Alert "คุณหมออาจติดเคสอื่นอยู่ — รอต่อหรือยกเลิก?" with "รอต่อ" / "ยกเลิกการนัด"

### 4. In-call · Video mode (matches the reference)

- Top bar:
  - Doctor name + speciality (e.g. "นพ.ปรีชา ปรารถนา · เวชศาสตร์ครอบครัว")
  - Small avatar (clinical icon if doctor has no photo)
  - Presence dot + state: "🟢 กำลังคุย · 04:23" — live MM:SS timer that increments
  - Right side: minimise button "ย่อหน้าจอ" (chevron-down) → Picture-in-Picture
- Mode toggle pill (segmented): **🎥 วิดีโอคอล** / **💬 แชท**
- Main stage (rounded card, soft brand-tinted background):
  - Doctor's video feed fills the card; if doctor's camera off, show their initials avatar centred
  - Patient's self-view as a small PIP tile at the top-right of the stage, draggable to any corner, mirrored
  - Network indicator overlay (bottom-left of the stage) appears only when quality drops to amber/red
  - Speaking indicator: a soft glow ring around whoever is currently speaking
- Shared documents:
  - Label "เอกสารที่แพทย์แชร์ในห้องนี้"
  - Horizontal scrollable cards; each card has file-type icon, name (e.g. `lab-2569-04-02.pdf`), small "ใหม่" badge if shared in the last 60s
  - Tap → opens an in-app viewer overlay (pinch-to-zoom, swipe between pages); long-press → "บันทึกลงเครื่อง" / "ส่งให้ตัวเอง"
- Controls row (4 round buttons), labels below:
  - **ปิดไมค์** / "เปิดไมค์" — mic icon, fill = destructive when muted; subtle red border when muted
  - **ปิดกล้อง** / "เปิดกล้อง" — camera icon
  - **แชร์จอ** — screen-share icon; tap → bottom-sheet "เริ่มแชร์หน้าจอ?" with privacy note
  - **วางสาย** — phone-down icon in destructive red, filled

### 5. In-call · Chat mode

- Same top bar
- Stage replaced by a chat thread:
  - Doctor messages on the left (neutral bubble), patient on the right (Brand bubble)
  - System messages centred and italic (e.g. "เริ่มการสนทนาเวลา 09:00", "แพทย์แชร์ไฟล์: lab-2569-04-02.pdf")
  - Time stamps under each bubble, grouped per minute
  - Read receipts (small check on the patient's side once doctor reads)
- Composer at the bottom (above the controls): Input Field "พิมพ์ข้อความ...", attach icon (image/file) on the left, send icon on the right
- Voice-message option (long-press the send icon → record waveform → release to send)
- Files sent in chat also appear in the shared-files strip
- Controls row remains visible above the keyboard

### 6. In-call · Screen sharing

- Patient shares: small red "🔴 กำลังแชร์หน้าจอ" pill at the top, large "หยุดแชร์" button persistent
- Doctor shares: doctor's screen renders in the main stage, with a Pip of doctor's camera; cards on the shared-files strip can be tapped to open

### 7. In-call · Network problems

- Amber state: chip top-centre "🟡 สัญญาณอ่อน — ภาพอาจกระตุก"; toast on first detection
- Red state: full overlay Large Alert "📶 กำลังพยายามเชื่อมต่อใหม่..." with a 30s retry countdown and a "วางสาย" escape; auto-resume when restored
- If disconnected > 60s: post-call summary screen with "เชื่อมต่อใหม่" CTA (re-joins the same room)

### 8. In-call · Doctor disconnected / Patient backgrounded

- Doctor drops: Large Alert overlay "คุณหมอหลุดการเชื่อมต่อ — กำลังรอกลับเข้าห้อง..." with options "รอต่อ" / "วางสาย"
- Patient leaves app: enter **Picture-in-Picture** automatically (audio continues), notification persists with "กลับเข้าห้องวิดีโอคอล"
- Returning to app: resumes immediately on the call screen; no re-join required

### 9. Post-call · Summary + Rating

- Replaces the call screen on hang-up (any side)
- Header: ✓ "สิ้นสุดการสนทนา · ใช้เวลา 14:32 น."
- Summary card: doctor, date-time, files shared, key vitals or note (if doctor wrote one), follow-up tag (e.g. "นัดติดตาม 2 สัปดาห์")
- Star rating row (1–5) — required only on the first call of the week; otherwise optional
- Optional text feedback ("เล่าเพิ่ม เพื่อให้บริการดีขึ้น"), up to 280 chars
- Quick chips: "คุณหมอฟังดี" / "ภาพชัด เสียงชัด" / "อยากนัดท่านนี้อีก" — tap to toggle
- Brand Button "บันทึก" (or "ข้าม" — Brand Subdue)
- Auto-route after submit:
  - If doctor scheduled a follow-up → opens Appointment Detail of the new appointment
  - Else → returns to Appointments list with success toast "บันทึกการสนทนาแล้ว"

## Native Interaction Specs

**Presentation**: Telemedicine is a full-screen modal/route that takes over from the appointment Detail. Hang-up returns to Detail with the summary applied; minimise = PIP.

**Picture-in-Picture (PIP)**:

- iOS: enter on minimise or when app goes to background (if entitlement granted)
- Android: same via system PIP
- PIP shows doctor's video (or avatar) only; tap to expand; cannot mute/end from PIP — must expand

**Audio routing**:

- Speaker by default
- Auto-route to connected Bluetooth / wired headset
- Action List entry in the More menu (top-right "⋯") to switch route manually

**Haptic feedback**:

- Mute / un-mute: light impact
- Hang-up: heavy impact (warning)
- Reconnect succeeded: success notification
- Doctor joins / leaves: light impact + soft audio cue

**Lock-screen / system controls**:

- Live Activity (iOS 16+) showing call duration + mute/hang-up controls
- Foreground service notification (Android) — non-dismissable while call is live, with mute and hang-up actions

**Wake lock**: keep screen on for the duration of the call; respect "always-on display" preference

## Permissions to Request

- Microphone (required, before joining)
- Camera (required for video; can join audio-only if denied — show a chip "เข้าร่วมแบบเสียงเท่านั้น")
- Notifications (so the user is alerted when the doctor joins if they backgrounded the app)
- Bluetooth (only if needed for headset selection on iOS)

## Accessibility

- WCAG 2.1 AA contrast — extra careful on the dark theme (label text ≥ 4.5:1 against the near-black, button icons ≥ 3:1)
- Touch targets ≥ 44 pt (iOS) / 48 dp (Android); circular controls visually 56 × 56 with 44+ hit area
- VoiceOver / TalkBack labels in Thai for every control — mic state announced ("ไมโครโฟนปิด, แตะเพื่อเปิด"); timer announced via aria-live polite
- **Live captions** option in the More menu: real-time speech-to-text for accessibility (on-device when possible); always-on for users with hearing accessibility preference
- Dynamic Type up to 200% — chat bubbles reflow, controls labels truncate elegantly
- Respect Reduce Motion (drop the speaking-glow animation)
- Provide an **audio-only mode** as a one-tap entry for low-bandwidth or accessibility needs

## Privacy & Security

- E2E encrypted media (DTLS-SRTP); display a small lock chip "🔒 เข้ารหัสปลายทาง" on the lobby and at the top of the call screen
- **No call recording on device.** If the doctor needs to record, prompt the patient: "คุณหมอขออนุญาตบันทึกการสนทนาเพื่อ {เหตุผล}" — Brand Button "ยินยอม" / Brand Subdue "ไม่ยินยอม" (PDPA compliance)
- Screen capture / screenshots are blocked while the doctor's video or shared documents are visible (FLAG_SECURE on Android, equivalent on iOS); show a soft toast if attempted
- Audit log: enter/leave room, mute/unmute, share-screen events, files opened — all server-side
- Shared documents have signed, short-lived URLs and are stored in the patient's "ประวัติ" after the call
- Auto-disconnect after 30 min of inactivity (no audio + no chat) with a 60s warning

## Edge Cases to Cover

- Patient denies mic permission → cannot join; show recovery screen with deep link to Settings
- Patient denies camera but allows mic → join audio-only, doctor's video still shown
- Slot expired (patient joins > 30 min after start) → "ห้องสนทนานี้ปิดแล้ว — แตะเพื่อนัดใหม่"
- Doctor never joins → after 15 min, auto-end with "ขออภัยในความไม่สะดวก — เราจะติดต่อกลับและคืนเครดิตการนัดให้คุณ"
- Two doctors on the same call (handoff) → top bar shows both, speaking indicator highlights the active one
- Phone rings during call → mute system call by default (Do Not Disturb is recommended in a pre-call tip)
- App killed by OS → on relaunch, banner "การสนทนาก่อนหน้าจบโดยไม่คาดคิด — เข้าใหม่?" if room still open
- Low battery (< 10%) → Small Alert advising the patient to plug in

## Deliverables

1. Hi-fi mockups × 2 platforms (iOS 390 × 844, Android 360 × 800) for: Permission priming, Pre-call/Lobby, Waiting room, In-call Video mode (doctor video + doctor camera off), In-call Chat mode, Screen sharing (patient sharing / doctor sharing), Network warnings (amber + red), Doctor disconnected overlay, PIP frame, Post-call Summary + Rating, Audio-only fallback
2. Use MIH library components throughout — no detached instances
3. Variants for every state shown above; the call screen is **always dark**
4. Prototype: Appointment Detail → Permission priming → Lobby → Waiting room → In-call (video) → toggle Chat → toggle Screen share → trigger network warning → Hang-up → Post-call Summary
5. Spec sheet: dark-mode tokens used, control hit-area sizes, transition timing, audio/video routing rules, permission and consent copy, all toast/alert strings
