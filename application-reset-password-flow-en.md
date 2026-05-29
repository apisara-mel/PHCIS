# Prompt: 3-Step Reset Password Flow — PHCIS Mobile App

## Context

Design the "Forgot password" / password-reset flow for the **PHCIS Mobile App** (iOS + Android). The user is an existing patient who has already registered (National ID + phone in DB), and is locked out. Audience includes the general public and elderly users. Thai language. Must feel secure but never punishing.

Use the **MIH Design System** as the foundation — do not detach instances, do not hard-code colour or spacing.

- Components: Steps, Stepper, Input Field, Brand Button / Brand Subdue Button, Small Alert / Large Alert, Tooltip
- Tokens: MIH semantic tokens (light + dark + brand modes)
- Font: Noto Sans Thai
- Native targets: iOS 15+ / Android 9+

## Visual Reference

A reference screenshot of Step 1 is provided. Match its overall composition:

- White rounded card (radius lg, soft shadow) centred on a neutral page background
- Illustrative phone icon inside the card
- Bold Thai title + greyed-out subtext explaining what will happen
- Single Input Field with placeholder masking
- Large green (Brand) primary button pinned to the bottom of the card
- Top app bar with back chevron, screen title "ลืมรหัสผ่าน", and a small step indicator "ขั้นที่ N จาก 3"

Apply the same card + sticky-CTA pattern to every step.

## Frame & Layout (Mobile only)

- Artboards: iPhone 14 (390 × 844) primary + Android (360 × 800) variant
- Respect **safe-area insets** — content sits ≥ status-bar + 8 from the top, ≥ gesture-bar + 16 from the bottom
- App bar: left = back chevron (system back also supported); centre/leading = "ลืมรหัสผ่าน" title + "ขั้นที่ N จาก 3" subtitle; right = empty (no close — this flow is committed to)
- Primary CTA pinned to the bottom of the card so it stays within thumb reach
- Single-card layout per step (no multi-card scroll)

## Screens to Design (5 total)

### 0. Entry Point — Sign-In screen

Not part of the 3 steps, but include for context:

- "ลืมรหัสผ่าน?" link (Brand Subdue Button, ghost style) below the sign-in form → opens Step 1

### 1. Step 1 — Enter National ID (matches the reference image)

- App bar: title "ลืมรหัสผ่าน" + subtitle "ขั้นที่ 1 จาก 3"
- Card content:
  - Phone illustration / icon at top-left of the card
  - Title: "ส่งรหัส SMS"
  - Subtext: "กรอกเลขบัตรประชาชน เราจะส่งรหัสไปยังเบอร์ที่ลงทะเบียนไว้"
  - Input Field: "เลขประจำตัวประชาชน" — `keyboard=numberPad`, mask `_-____-_____-__-_`, **autofill: NationalID**, max 13 digits
  - Brand Button (full width inside card): "ส่งรหัสยืนยัน"
- States:
  - default / typing / filled / disabled
  - inline error "เลขบัตรไม่ถูกต้อง" if checksum fails
  - **Generic error after submit** — "หากเลขบัตรนี้ลงทะเบียนไว้ในระบบ คุณจะได้รับรหัสทาง SMS" (do NOT confirm whether the ID exists; prevents account enumeration)
  - Rate-limit error "ขอรหัสบ่อยเกินไป กรุณารอ X นาที"
- Helper / safety note (small grey text below the button): "เบอร์โทรของคุณคือ 08X-XXX-XX42 — หากเปลี่ยนเบอร์แล้ว ติดต่อเจ้าหน้าที่"

### 2. Step 2 — OTP Verification

- App bar: "ลืมรหัสผ่าน" + "ขั้นที่ 2 จาก 3"
- Card content:
  - SMS / chat-bubble illustration
  - Title: "ยืนยันรหัส OTP"
  - Subtext: "เราส่งรหัส 6 หลักไปยัง 08X-XXX-XX42"
  - 6-cell OTP input — `keyboard=numberPad`, **iOS OTP autofill + Android SMS Retriever API**, auto-advance, paste supported
  - Countdown "ขอรหัสใหม่ได้ใน 0:59" → Brand Subdue Button "ขอรหัสใหม่" once it reaches zero
  - Link "เปลี่ยนเบอร์โทร?" → opens a bottom-sheet with the support phone number (because we won't let them silently change phone here — that's an identity-verification path)
  - Brand Button "ยืนยัน"
- States: default / typing / verifying (button loading) / error inline "รหัสไม่ถูกต้อง — เหลือ X ครั้ง" / locked after 3 failed attempts → Large Alert "บัญชีถูกล็อกชั่วคราว 30 นาที"
- OTP TTL: 5 minutes; show countdown ribbon at the top once < 60 s remain

### 3. Step 3 — Set New Password

- App bar: "ลืมรหัสผ่าน" + "ขั้นที่ 3 จาก 3"
- Card content:
  - Lock illustration
  - Title: "ตั้งรหัสผ่านใหม่"
  - Subtext: "ตั้งรหัสผ่านใหม่ที่จำง่ายแต่เดายาก"
  - Input Field (type=password) "รหัสผ่านใหม่" + show/hide toggle (eye icon)
  - Input Field "ยืนยันรหัสผ่านใหม่" + show/hide
  - Password strength meter (Weak / Medium / Strong)
  - Realtime checklist:
    - ≥ 8 characters
    - contains a number
    - contains an uppercase letter
    - contains a special character
    - **must not match your previous 3 passwords** (validated on submit)
  - Brand Button "บันทึกรหัสผ่าน" (disabled until all requirements pass and the two fields match)
- States: default / typing / mismatch error "รหัสผ่านไม่ตรงกัน" / weak / same-as-old-password error "รหัสนี้เคยถูกใช้แล้ว ตั้งใหม่อีกครั้ง"
- **Do not ask for the old password** — the user forgot it; asking defeats the flow

### 4. Step 4 — Success

- Full-screen, no card
- Large check-on-circle icon (Positive token)
- Title: "เปลี่ยนรหัสผ่านสำเร็จ"
- Subtext: "ใช้รหัสใหม่เพื่อเข้าสู่ระบบได้เลย"
- Brand Button "เข้าสู่ระบบ" (full width, sticky bottom) → returns to Sign-In with the National ID pre-filled
- Trigger a haptic success notification on appear
- **Sign out all other sessions** automatically (security) — mention this in a small note: "เพื่อความปลอดภัย คุณถูกออกจากระบบบนอุปกรณ์อื่นแล้ว"

## Native Interaction Specs

**Navigation**: push transition between steps (iOS slide-from-right / Android slide-up). Back is supported on Step 1 and 2 only; **Step 3 disables back** (after OTP verification, the user must complete the reset or explicitly cancel) — show a confirm sheet if back is attempted: "ยกเลิกการเปลี่ยนรหัสผ่าน?" / "ดำเนินการต่อ" / "ยกเลิก"

**Keyboard**:

- Tapping outside an input dismisses the keyboard
- CTA floats above the keyboard
- iOS "Done" accessory; Android "Next" between fields (Step 3)

**Permissions**: SMS read (Android, Step 2). No camera, no location.

**Loading / Network**:

- Inline button spinner during API calls
- Offline: Large Alert "ไม่มีการเชื่อมต่อ" + retry button
- API timeout 10 s → show retry CTA

**Haptic feedback**:

- Success: notification success
- Error: notification error (subtle)
- Step transition: light impact

**Accessibility** (mandatory):

- WCAG 2.1 AA contrast
- Touch targets ≥ 44 pt (iOS) / 48 dp (Android)
- VoiceOver / TalkBack labels in Thai for every control
- Dynamic Type / font scaling up to 200%
- Never rely on colour alone — pair every status with an icon and text
- Respect Reduce Motion

**Dark mode**: every screen supports light + dark via semantic tokens

**Microcopy**: use "คุณ" instead of "ท่าน". Plain language, around high-school reading level. Error messages explain how to fix the problem, not only what went wrong. **Never reveal whether a National ID is in the database** (security: prevent account enumeration).

## Security Requirements

- **Account enumeration protection**: Step 1 always returns the same success-style state regardless of whether the ID exists. The SMS is only sent if the ID is registered.
- **Rate limiting**: max 3 OTP requests per ID per hour; max 5 per day
- **OTP single-use**, 5-minute TTL, 3-attempt cap
- **Password history**: block reuse of last 3 passwords
- **Session invalidation**: after a successful reset, sign the user out of all other devices and force re-login
- **Audit log**: every step (request, verify, reset) writes to the audit trail with timestamp + device + IP
- All requests over HTTPS with cert pinning

## Edge Cases to Cover

- National ID not in DB → still show generic "code sent" state (do not leak existence)
- Phone number on file is invalid / SMS bounces → Large Alert "ส่งรหัสไม่สำเร็จ ติดต่อเจ้าหน้าที่ที่ XXX-XXX-XXXX"
- OTP expired (TTL > 5 min) → "รหัสหมดอายุ ขอรหัสใหม่"
- 3 failed OTP attempts → account locked 30 min + cool-down counter
- Phone number on file is no longer in use → "เปลี่ยนเบอร์โทร?" link routes to support (cannot self-serve)
- App backgrounded mid-flow → on resume, re-validate the OTP token; if expired, drop back to Step 1
- New password identical to one of last 3 → inline error, keep on Step 3
- User taps back during Step 3 → confirmation sheet

## Deliverables

1. Hi-fi mockups for all 5 screens (Entry link + 3 steps + Success) × 2 platforms (iOS 390 × 844, Android 360 × 800) in Figma
2. Use MIH library components throughout — no detached instances
3. Variants: light/dark, plus key default / error / loading / locked states
4. Prototype flow: Sign-In → "ลืมรหัสผ่าน?" → Step 1 → 2 → 3 → Success → Sign-In (with ID pre-filled)
5. Spec sheet: token usage, validation rules, transition timing, security copy, all error strings
