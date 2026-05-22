---
name: create-drawing-canvas-popup
description: Recipe for adding a new DrawingCanvasPopup-based modal (either using DrawingCanvasPopup directly, or creating a thin domain wrapper around it like BodyRecordPopup). Covers props, dirty-tracking semantics, registration in design.md + ComponentsLibraryPage, and the pitfalls that broke the Save button before.
---

# Create a DrawingCanvasPopup-based modal

`DrawingCanvasPopup` ([src/components/popup/DrawingCanvasPopup.jsx](src/components/popup/DrawingCanvasPopup.jsx)) is the **reusable shell** that hosts `BodyDrawingCanvas` inside the extraLarge `Popup`. It owns dirty tracking, markers/view mirroring, and the save/cancel flow.

Use this skill when adding any new modal whose body is a body-anatomy drawing canvas (e.g. wound mapping, pain locator, pre-op marking, physiotherapy session notes).

## 1 · Decision: direct use vs domain wrapper

```
Is the title fixed in the call site (a single screen / one feature)?
├── Yes → Use DrawingCanvasPopup directly. Skip §3.
└── No  → The title comes from context (system / exam type / form
         step) and the modal is opened from multiple places.
         → Create a thin domain wrapper (like BodyRecordPopup).
```

The wrapper should be **≤ 25 lines** — only resolve title (and maybe defaults), then forward `...rest` to `DrawingCanvasPopup`. Do NOT duplicate the open/markers/dirty state logic in the wrapper.

## 2 · Recipe A — Direct use

```jsx
import DrawingCanvasPopup from '@/components/popup/DrawingCanvasPopup';

const [open, setOpen] = useState(false);
const [markers, setMarkers] = useState([]);
const [drawings, setDrawings] = useState([]);

<DrawingCanvasPopup
  open={open}
  onClose={() => setOpen(false)}
  /* onSave fires with (markers, drawings). Either may be missing if
     the user only edited one type, so use the `?? prev` pattern. */
  onSave={(nextMarkers, nextDrawings) => {
    setMarkers(nextMarkers);
    setDrawings(nextDrawings ?? drawings);
    setOpen(false);
  }}
  title='หัวข้อของฟีเจอร์'
  subtitle='(optional) คำอธิบายสั้นใต้ title'
  viewKey='both'                  // 'both' | 'front' | 'back' | 'sides' | 'left' | 'right'
  markers={markers}
  onMarkersChange={setMarkers}    // optional live-bubble
  drawings={drawings}             // optional — persists pen/text/shape/arrow
  onDrawingsChange={setDrawings}  // pair with `drawings`; omit both for legacy popup-session mode
  onViewChange={() => {}}         // optional
  saveLabel='บันทึก'              // optional override
  cancelLabel='ยกเลิก'            // optional override
  minBodyHeight={480}             // optional override
/>
```

## 3 · Recipe B — Domain wrapper (like BodyRecordPopup)

File: `src/components/<domain>/<Name>Popup.jsx`

```jsx
import React, { useMemo } from 'react';
import DrawingCanvasPopup from '@/components/popup/DrawingCanvasPopup';
import { SOME_LOOKUP } from '@/data/<source>';

const resolveTitle = (key) =>
  SOME_LOOKUP.find((t) => t.key === key)?.label ?? key;

const FooBarPopup = ({ keyProp = 'default', ...rest }) => {
  const title = useMemo(() => resolveTitle(keyProp), [keyProp]);
  return <DrawingCanvasPopup title={title} {...rest} />;
};

export default FooBarPopup;
```

Rules:
- The wrapper **must not** declare its own `open`, `markers`, `viewKey`, or `dirty` state. That all lives in `DrawingCanvasPopup`.
- The wrapper **must not** add a competing `useEffect([open, markersProp])` that calls `setDirty(false)` or `setMarkers(markersProp)` — that's what broke the Save button before. The shell's `wasOpenRef` already handles the open transition.
- The wrapper **may** add: title/subtitle resolution, defaulting of `viewKey` or `markers`, custom `saveLabel`, analytics on `onSave`, side-effects on `onClose`.

## 4 · Props reference (DrawingCanvasPopup)

| Prop | Type | Default | Notes |
|---|---|---|---|
| `open` | boolean | — | Controls mount via `Popup` |
| `onClose` | () => void | — | Backdrop / Esc / Cancel / after Save |
| `onSave` | `(markers, drawings) => void` | — | Fires with the latest markers + drawings, then `onClose` |
| `title` | string | — | Required |
| `subtitle` | string | `'คลิกที่จุดต่างๆ บนร่างกายเพื่อบันทึกผลการตรวจเฉพาะที่'` | Override per context |
| `viewKey` | `'both' \| 'front' \| 'back' \| 'sides' \| 'left' \| 'right'` | `'both'` | Initial figure layout |
| `markers` | `BodyMarker[]` | `[]` | Snapshotted as baseline on the open ↑ transition |
| `onMarkersChange` | `(markers) => void` | — | Live-bubble; optional |
| `drawings` | `Drawing[]` | — | **Optional** — when supplied alongside `onDrawingsChange`, pen/text/circle/square/arrow strokes persist across opens. Omit both to keep drawings session-local (legacy). |
| `onDrawingsChange` | `(drawings) => void` | — | Live-bubble; pair with `drawings` |
| `onViewChange` | `(viewKey) => void` | — | Optional — bubble view tab switch |
| `saveLabel` | string | `'บันทึก'` | |
| `cancelLabel` | string | `'ยกเลิก'` | |
| `minBodyHeight` | number | `480` | Inner content min-height (px) |

## 4b · Tool sidebar contract (in-popup)

- Default `activeTool` is `cursor` (mouse-pointer / inspect mode) — does NOT place markers.
- `select` is the markpoint tool (icon `trip_origin`, tooltip "มาร์คจุด").
- Other tools: `pen`, `eraser`, `text`, `circle`, `square`, `arrow`.
- **Clicking the active tool toggles back to `cursor`** (except `cursor` itself, which is a no-op).
- Selection chrome (blue frame + corner/edge resize handles) only renders in cursor mode with a selected drawing or marker.
- Sidebar slider rebinds to the selected drawing's size field when cursor mode + a drawing is selected (pen→`width`, shapes/arrow→`strokeWidth`, text→`fontSize`).

## 4c · Tab isolation — how to scope annotations

Two orthogonal isolation patterns are wired in `BodyDiagramPanel` + `TreatmentSteps`:

| Scope | Pattern | Where |
|---|---|---|
| **Per exam system** (HEENT / Heart / Lungs / Abdomen / Extremities) | `form.bodyMarkers` and `form.bodyDrawings` are `Record<systemKey, …[]>`. Read the current system's slice; write back to that slot. | `TreatmentSteps Step3` (slice + writer); `BodyDiagramPanel` (mirrors slice via `useEffect`). |
| **Per view tab** (ทั้งสองด้าน / ด้านหน้า / ด้านหลัง / ทั้งสองข้าง / ด้านซ้าย / ด้านขวา) | Drawings are stamped with `viewKey` at creation (`handleAddDrawing`); render path filters by `!d.viewKey \|\| d.viewKey === viewKey`. Markers use the existing `side` (`'front'`/`'back'`) field — no `viewKey` tag. | Inside `BodyDrawingCanvas` (`visibleDrawings` + `annotationLayers`). |

When you build a new domain wrapper that needs per-context isolation, follow the same Record pattern the existing exam form uses:

```jsx
// In your form state
{ contextKey: 'a', byContext: { a: [...], b: [...] } }

// Slice for the panel
markers={(form.byContext && form.byContext[form.contextKey]) || []}
onMarkersChange={(next) => setForm((s) => ({
  ...s,
  byContext: { ...(s.byContext || {}), [s.contextKey]: next },
}))}
```

**Do not** try to introduce a `viewKey` filter for markers — that breaks the existing front/back side semantics.

## 5 · Dirty-tracking semantics — DO NOT BREAK

The Save button is gated by a `dirty` flag that flips `true` the moment the canvas detects any user-initiated change. The two pieces that make it work:

1. **Baseline capture** ([BodyDrawingCanvas.jsx](src/components/examination/BodyDrawingCanvas.jsx)): `baselineMarkersRef = useRef(cloneMarkers(markersProp))` — captured **once on mount**. The popup unmounts the canvas on close (`Popup` returns `null` when `!open`), so the baseline resets on the next open.

2. **Reset gate** ([DrawingCanvasPopup.jsx](src/components/popup/DrawingCanvasPopup.jsx)): `wasOpenRef` tracks the previous `open` value. State resets fire ONLY on the `false → true` transition. Depending on `markersProp` in the reset effect would re-fire on every parent reflection of `onMarkersChange` and clobber dirty back to `false` — that's the bug we already fixed.

If you ever add a useEffect involving `markersProp` in any wrapper or call site, audit whether it could re-run mid-session. If yes, gate it with `wasOpenRef` or a similar latch.

## 6 · Common pitfalls — checklist

- [ ] Did you put `setDirty(false)` in an effect with `markersProp` in deps? **Don't.**
- [ ] Did the wrapper declare its own `useState` for `markers` / `viewKey` / `dirty`? **Remove it.**
- [ ] Does the parent of the popup pass `markers={state}` and `onMarkersChange={setState}`? That's fine — the shell handles the reflection loop via `wasOpenRef`.
- [ ] Does the canvas remount on close? Verify by toggling `open` and checking the React DevTools tree.
- [ ] Did you `cloneMarkers` the initial baseline? Skipping it makes the baseline a live reference that mutates as you edit.

## 7 · Registration — required for every new popup

### 7a · ComponentsLibraryPage demo

[src/pages/components/ComponentsLibraryPage.jsx](src/pages/components/ComponentsLibraryPage.jsx)

1. **Import** at the top alongside `BodyRecordPopup` / `DrawingCanvasPopup`:
   ```jsx
   import FooBarPopup from '@/components/<domain>/FooBarPopup';
   ```
2. **Demo component** placed near `BodyRecordPopupDemo` / `DrawingCanvasPopupDemo`:
   ```jsx
   const FooBarPopupDemo = () => {
     const [open, setOpen] = useState(false);
     const [viewKey, setViewKey] = useState('both');
     const [markers, setMarkers] = useState(DEMO_BODY_MARKERS);
     return (
       <Section title='FooBarPopup' summary='…one-line description…'>
         <Variant label='Open popup' stack>
           <BrandButton onClick={() => setOpen(true)}>เปิด FooBarPopup</BrandButton>
           <FooBarPopup
             open={open}
             onClose={() => setOpen(false)}
             onSave={(next) => { setMarkers(next); setOpen(false); }}
             viewKey={viewKey}
             markers={markers}
             onMarkersChange={setMarkers}
             onViewChange={setViewKey}
           />
         </Variant>
       </Section>
     );
   };
   ```
3. **Register in the index list** (near `body-record-popup` / `drawing-canvas-popup`):
   ```js
   { slug: 'foo-bar-popup', name: 'FooBarPopup', Demo: FooBarPopupDemo },
   ```

Verify: `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/components/foo-bar-popup` → `200`.

### 7b · design.md — §6.13 Popup domain-wrappers table

[design.md](design.md)

Add a row to the domain-wrappers table (search for `DrawingCanvasPopup` to find it):

```md
| `FooBarPopup` | Figma <node-id> | [`FooBarPopup.jsx`](src/components/<domain>/FooBarPopup.jsx) | Thin wrapper over `DrawingCanvasPopup` — <what the wrapper adds (title resolution, defaults, side-effects)>. |
```

Update the **Preview** hint at the bottom of the section so the new slug is listed.

## 8 · Verification checklist

After landing the changes, run through:

1. `curl http://localhost:3000/components/<your-slug>` → 200.
2. Open the demo, click the trigger button.
3. **บันทึก** is disabled (no edits yet).
4. Place a mark **or** draw **or** type a note **or** erase → **บันทึก** enables.
5. Click **บันทึก** → fires `onSave(markers)` then `onClose`.
6. Reopen the popup → **บันทึก** is disabled again (baseline reset on open ↑).
7. Reopen and click **ยกเลิก** without editing → no side-effects, dirty stays false on the next open.

If step 4 fails (Save stays disabled after editing), the most likely cause is a wrapper effect that fights `wasOpenRef`. Re-read §5.

## 9 · Files this skill touches

For a domain-wrapper PR:

- `src/components/<domain>/<Name>Popup.jsx` — new wrapper (≤ 25 lines)
- `src/pages/components/ComponentsLibraryPage.jsx` — import + demo + index row
- `design.md` — domain-wrapper table row + preview hint

For a direct-use PR: only the call site changes.

Never edit `DrawingCanvasPopup.jsx` to special-case a single feature; thread it through props on the wrapper instead.
