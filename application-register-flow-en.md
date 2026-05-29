# Prompt: 4-Step Register Flow — PHCIS Mobile App

## Context

Design the new-user registration flow for the **PHCIS Mobile App** (iOS + Android). Users are members of the general public, including elderly users. App is frequently used outdoors, one-handed. The UI must feel trustworthy and be effortless to read in Thai.

The flow uses the **MIH Design System** as its foundation — do not detach instances, do not hard-code colour or spacing values.

- Components: Steps, Stepper, Input Field, Checkbox, Brand Button / Brand Subdue Button, Small Alert / Large Alert, Tooltip, Topic, Avatar, x button
- Tokens: MIH semantic tokens (light + dark + brand modes)
- Font: Noto Sans Thai
- Native targets: iOS 15+ / Android 9+

## Frame & Layout (Mobile only)

- Artboards: iPhone 14 (390 × 844) as the primary canvas + Android (360 × 800) variant
- Respect **safe-area insets** (notch / dynamic island / gesture bar) — content sits ≥ status-bar + 8 from the top, ≥ gesture-bar + 16 from the bottom
- The primary CTA is pinned to the bottom (sticky footer) so it stays within thumb reach
- Title bar: left = back chevron (system back also supported); centre = "ลงทะเบียน" (Register); right = close (X) on the Intro and Success screens only
- No tab bar during the flow — keep it immersive

## Screens to Design (6 total)

### 1. Intro — "Registration steps"

(Matches the reference image)

- A summary card listing the four steps vertically: a soft-coloured pill icon (mint / blue / peach / lavender) + "Step N" caption + step title
- Sticky footer: Brand Button "Start registration" + Brand Subdue Button link "Already registered? Sign in"

### 2. Step 1 — National ID + Phone Number

- Stepper at the top (Step 1 of 4)
- Input Field: National ID — `keyboard=numberPad`, mask `_-____-_____-__-_`, **autofill: NationalID**, max 13 digits
- Input Field: Phone number — `keyboard=phonePad`, autofill: telephoneNumber
- Checkbox: Accept Terms of Service + Privacy Policy (link opens a bottom-sheet, never navigates away)
- Footer Brand Button "Next" (disabled until both fields are valid) — floats above the keyboard when it appears
- States: default / typing / filled / inline error / disabled

### 3. Step 2 — OTP

- Stepper (Step 2 of 4)
- Subtext "A 6-digit code was sent to 08X-XXX-XX42"
- 6-cell OTP input — `keyboard=numberPad`, **iOS OTP autofill + Android SMS Retriever API**, auto-advance between cells, paste from clipboard supported
- Countdown "Request a new code in 0:59" → Brand Subdue Button "Request new code" once it reaches zero
- Link "Change phone number" (returns to Step 1)
- Brand Button "Verify"
- States: default / typing / verifying (button loading) / error inline "Incorrect code — X attempts left" / locked after 3 failed attempts

### 4. Step 3 — Face Capture

- Stepper (Step 3 of 4)
- **Permission priming screen first** if camera access has not been granted — use a Large Alert to explain why, before triggering the system permission dialog (reduces first-prompt denials)
- Full-bleed camera preview + face oval mask + alignment guides + circular shutter button at the bottom centre
- Helper text "Place your face within the frame in good lighting"
- Tooltip "Why do we need a photo?" (top-right → opens a bottom-sheet explaining PDPA and security)
- States: permission needed / idle / aligning (face not detected) / capturing (3-2-1 countdown) / verifying / success / error "Photo unclear" → "Retake" button
- Front camera by default, locked to portrait orientation

### 5. Step 4 — Set Password

- Stepper (Step 4 of 4)
- Input Field type=password + show/hide toggle (eye icon)
- Input Field: Confirm password
- **Disable iOS Strong Password Autofill suggestion** (or enable if the team allows it)
- Password strength meter (Weak / Medium / Strong) + a realtime checklist: ≥ 8 characters · contains a number · contains an uppercase letter · contains a special character
- Brand Button "Finish"
- After the password is set, prompt for **biometrics (Face ID / Fingerprint)** → bottom-sheet "Use Face ID to sign in next time?" + Brand Button "Enable" / Brand Subdue Button "Maybe later"

### 6. Success

- Large check-on-circle icon + title "Registration complete"
- Subtext: HN / User ID + welcome message
- Brand Button "Sign in" (full width, sticky bottom)
- Trigger a haptic success notification when this screen appears

## Native Interaction Specs

**Navigation**: push transition between steps (iOS slide-from-right / Android slide-up). Back is supported through both the chevron and the OS gesture / hardware back.

**Keyboard**:

- Tapping outside an input dismisses the keyboard
- The CTA floats above the keyboard (KeyboardAvoidingView / WindowInsets)
- iOS shows a "Done" accessory; Android shows "Next" between fields

**Permissions to request**: Camera (Step 3), SMS read (Android, Step 2), Notifications (after Success)

**Loading / Network**:

- Inline loading spinner inside the button
- Offline: Large Alert "No connection" + retry button
- Slow network: skeleton / shimmer after 1 s

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
- Respect Reduce Motion (remove non-essential animation)

**Dark mode**: every screen supports light + dark via semantic tokens (including the camera screen — the chrome around the preview themes correctly)

**Microcopy**: use "คุณ" instead of "ท่าน". Plain language, around high-school reading level. Error messages explain how to fix the problem, not only what went wrong.

## Edge Cases to Cover

- National ID already registered → Large Alert + "Sign in" button
- OTP expired
- Camera permission denied → screen explaining how to enable it in Settings, with a deep link
- Face verification fails 3 times → "Contact support" path
- App backgrounded mid-flow → resume on the same step when relaunched
- Password too weak (button disabled + reason shown)

## Deliverables

1. Hi-fi mockups for all 6 screens × 2 platforms (iOS 390 × 844, Android 360 × 800) in Figma
2. Use MIH library components throughout — no detached instances
3. Variants: light/dark, plus key default / error / loading states
4. Prototype flow: Intro → 1 → 2 → 3 → 4 → Success + biometric sheet
5. Spec sheet: token usage, validation rules, transition timing, permission copy
