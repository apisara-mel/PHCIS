---
name: face-identity-capture
description: >-
  The face-capture identity-verification popup on the เวชระเบียน registration
  identity step — 360° head-rotation enrollment (current) vs bust-guide still
  shot (previous, kept for the swap back). Use when adding, changing,
  reverting, or debugging face capture / ยืนยันตัวตนด้วยใบหน้า / FaceScanVerifyPopup /
  useFaceInFrame / useHeadPoseGestures / face landmarker / getUserMedia in PHCIS,
  or when switching between the still-shot and 360° capture methods.
---

# Face Identity Capture (ถ่ายรูปเพื่อยืนยันตัวตน)

Identity verification by face on the registration identity step. There are **two
capture methods** in this codebase; only one is wired at a time, and the project
has already swapped between them **twice** — assume it will swap again. Keep both
hooks alive; swap the popup body, never delete the unused hook.

**Current method (since 2026-08-27): 360° head-rotation enrollment.**
iOS Face ID–style — the person turns their head center → left → right → up, a
64-tick ring fills as each pose is held, then the still is captured automatically.
Design: [Figma MIH Design System — Popup `404:17893`](https://www.figma.com/design/I1pQchHR7IwrX6ZIBZRt6e/MIH-Design-System---Popup?node-id=404-17893).

**Previous method (2026-08-10 → 08-27): still shot inside a bust guide.**
The operator lines the person up inside a dashed กรอบคน and presses ถ่ายภาพ.
`useFaceInFrame` + `face-photo-guide*.svg` are still in the repo for the swap back.

**History: 360° → bust guide (10 ส.ค. 69) → 360° (27 ส.ค. 69).** It has flipped
twice. Never delete the hook or artwork of the method that is currently off.

**Source of truth (code):**
- [`FaceScanVerifyPopup.jsx`](../../../src/components/popup/FaceScanVerifyPopup.jsx) — the popup (370 lines)
- [`useHeadPoseGestures.js`](../../../src/lib/useHeadPoseGestures.js) — **360°** gating hook (wired)
- [`useFaceInFrame.js`](../../../src/lib/useFaceInFrame.js) — **still-shot** gating hook (kept for the swap back)
- [`faceLandmarker.js`](../../../src/lib/faceLandmarker.js) — shared MediaPipe landmarker loader
- [`RegistrationSteps.jsx`](../../../src/components/forms/RegistrationSteps.jsx) — the only caller

Both hooks are ports of the same files in **bma.kiosk** — thresholds, dwell
gating and baseline calibration are intentionally identical. Port fixes both ways.

## Which method is wired right now

| | 360° enrollment (current) | Still shot |
|---|---|---|
| Hook | `useHeadPoseGestures(videoRef, active)` | `useFaceInFrame(videoRef, active)` |
| Returns | `{ modelStatus, angles }` where angles = `{center,left,right,up}` | `{ modelStatus, faceInFrame }` |
| Gate | each of 4 poses held for **500 ms** | one face centred + correctly sized for **400 ms** |
| Artwork | 64-tick SVG ring, `StatusBadge` pose chips | `face-photo-guide.svg` / `-active.svg` (322×439) |
| Shutter | **auto** — fires 800 ms after the 4th pose, no button | manual `ถ่ายภาพ` button |
| Output | one JPEG data URL via `onCapture(dataUrl)` | same |
| Confirm step | ✅ side-by-side compare + checkbox before "ใช้รูปนี้" | ✅ same |

`GESTURE_KEYS = ['center', 'left', 'right', 'up']` is exported from
`useHeadPoseGestures` — it is the pose order the ring renders in.

## Contract (stable across both methods — do not change on a swap)

```jsx
<FaceScanVerifyPopup
  open={scanOpen}
  onClose={() => setScanOpen(false)}
  onCapture={handleCapture}          // (jpegDataUrl: string) => void
  patientName={patientName}
  referencePhoto={referencePhoto || idCardPhoto || FACE_VERIFIED_ID_FALLBACK}
/>
```

The captured photo lands in the registration form as the face-match result — see
`faceMatch` in [`registrationForm.js`](../../../src/data/registrationForm.js).
**Keep this prop shape identical when swapping methods** so the caller never changes.

## The 360° flow (current — matches Figma `404:17893`)

1. **Popup header** — `title='ถ่ายรูปเพื่อยืนยันตัวตน'` + X only. **No `subtitle`** — the
   design puts the real heading in the body.
2. **Reference strip** — avatar + `patientName` + "เปรียบเทียบใบหน้ากับภาพในระบบ/บัตรประชาชน"
   on `--surface-card-indigo-100`.
3. **In-body heading** — "สแกนใบหน้าเพื่อยืนยันตัวตน" (xl, 1.375) + "ค่อยๆ หมุนศีรษะเป็นวงกลม
   ช้าๆ จนกรอบรอบใบหน้าครบวง" (sm, tertiary), centred.
4. **Ring** — square box, `RING_TICKS = 64` radial ticks (`rx=0.6`, 1.2×6 in a 100×100
   viewBox). Lit `#63daac` · next `RING_FADE_TICKS = 3` at `#b4f7dd` · rest `#cfe8ff`.
   Camera circle at `inset: 13.33%`, **10 px white border** (turns `#63daac` at 100%),
   bg `#eaf5ff`, video mirrored `scaleX(-1)`.
5. **Percentage** — `Math.round(progress)%` at `--type-size-5xl`, weight 800, centred.
6. **Pose chips** — four `StatusBadge size='default'`: done = `style='success'` +
   `icon='check_circle'` · pending = `style='neutral'` + `showDot`. Labels
   ตรงกลาง · ด้านซ้าย · ด้านขวา · เงยขึ้น (`POSE_LABELS`, order = `GESTURE_KEYS`).
7. **Auto-shutter** — no button. 800 ms after progress hits 100 the popup draws the
   video to a canvas **mirrored** (`translate(w,0); scale(-1,1)`) and
   `toDataURL('image/jpeg', 0.92)`.
8. **Confirm** — side-by-side vs the reference + a checkbox, then `ใช้รูปนี้` /
   `ถ่ายใหม่`. Primary disabled until ticked.

Actions per phase: during the scan `[]` (X closes), after the shot `[ถ่ายใหม่, ใช้รูปนี้]`.

⚠️ **The confirm step is not in the Figma node** — `404:17893` ends at the PDPA line.
It was kept from the still-shot flow so `faceMatch` is never written without an
operator confirming the two faces match. That is a PDPA/consent call — if the
design intends true auto-advance, raise it before removing the checkbox.

### Fallback when the camera or model fails

`cameraError || modelStatus === 'error'` → `simulating`: progress advances itself over
`FALLBACK_DURATION_MS = 3000` in `FALLBACK_TICK_MS = 60` steps and the chips light at
25/50/75/100%, same as kiosk. The operator is never stuck staring at a dead ring.

## Rules that survive any method change

- **PDPA** — face data is biometric. The popup states this on screen
  (`ข้อมูลใบหน้าเป็น biometric ตาม PDPA`). Keep that line whatever the capture method.
- **Never leave the camera running.** The `open` effect stops every track and
  clears `srcObject` on close, on unmount, and when `open` flips false. There is a
  second effect that re-attaches the stream after the video node remounts
  (camera-error toggle, retake) — keep it or retake shows a black frame.
- **Model failure must not block the operator.** 360° → `simulating` drives progress
  itself; the still-shot version used `manualFraming` (guide becomes decorative,
  shutter enabled anyway). Whatever the method, keep an escape hatch.
- **Mirror the canvas** when saving, or the stored photo is flipped vs the preview.
- **Idempotent style injection** — `ensureGlowStyles` removes the previous
  `<style id='mih-face-frame-glow'>` before adding, so HMR doesn't stack rules.

## Swapping back to the still shot

1. Keep `FaceScanVerifyPopup`'s props and `onCapture` contract exactly as above —
   `RegistrationSteps.jsx` must not change.
2. Swap the hook: `useHeadPoseGestures` → `useFaceInFrame`; gate on `faceInFrame`
   (plus `manualFraming` when `modelStatus === 'error'`) instead of all four `angles`.
3. Frame goes back to `aspectRatio: '322 / 439'` with `face-photo-guide.svg` →
   `-active.svg` + the `.mih-face-frame-active` glow, instead of the circle + ring.
4. Restore `subtitle='วางใบหน้าให้อยู่ในกรอบ'` on the `Popup` and drop the in-body
   heading, the percentage, and the pose chips.
5. Bring back the manual shutter: actions `[ยกเลิก, ถ่ายภาพ]` and delete the
   auto-capture `useEffect`.
6. **Do not delete `useHeadPoseGestures`, `ProgressRing`, or the ring constants** —
   the method has flipped twice; it will likely flip again.

## Assets

`public/illustration/registration/` — `face-photo-guide.svg`,
`face-photo-guide-active.svg` (still shot) · `face-scan-dot.svg`,
`face-scan-check.svg` (per-pose artwork — **unused now**, the chips use
`StatusBadge` + `check_circle` per the Figma node) · `face-scan-ref.png` (reference
avatar fallback) · `face-scan-preview.png`, `face-verified-id.png`.

The ring is drawn in code (inline SVG in `ProgressRing`), not an exported asset —
64 ticks would be 64 nodes and the fill has to change per tick at runtime.
