# TOR Wave Playbook — กติกากลางสำหรับ agent ทุกตัวใน build-tor-wave / tor-final-audit

เอกสารนี้คือ contract ที่ agent ทุกตัวใน workflow ต้องอ่าน **ก่อนเริ่มงาน** และปฏิบัติตามทุกข้อ
(ใช้คู่กับ `CLAUDE.md` ที่ root — CLAUDE.md ชนะเสมอถ้าขัดกัน)

## 1. แหล่งความจริง (source of truth)

| เรื่อง | ที่อยู่ |
|---|---|
| ข้อกำหนด TOR รายข้อ + สถานะ | `docs/tor-checklist.html` — อ่านผ่าน `node scripts/tor-gap-report.mjs --section <id>` |
| Design tokens | `design.md` §1–§5 + `src/styles/tokens.css` (generated — ห้ามแก้) |
| Component catalog | `design.md` §6 + `src/pages/components/ComponentsLibraryPage.jsx` + `src/components/` |
| คู่มือระบบเดิม (HCIS) | `~/MIH-Docs-Vault/คู่มือระบบงาน/` (อ่านอย่างเดียว — วิธีทำงานจริงของแต่ละโมดูล) |
| Use-case docs ที่มีแล้ว | `docs/consent-use-cases.md`, `docs/finance-payment-use-cases.md`, `docs/observation-use-cases.md` |
| ทะเบียน component ใหม่ | `docs/awaiting-components.md` |

## 2. กติกา design (ย่อจาก CLAUDE.md — ต้องทำครบ)

1. **ทุกค่า visual ต้อง alias token** จาก `design.md` / `tokens.css`:
   `var(--dim-space-300)`, `var(--surface-brandPrimary-quaternary)`, `var(--type-size-sm)` ฯลฯ
   พร้อม fallback ที่ **ตรงกับค่าจริงของ token** ข้อยกเว้นเดียว: `linear-gradient(...)` inline ได้
2. **Icon**: Figma (Material Symbols ผ่าน `<Icon name>`) ก่อน → ไม่มีค่อยใช้ Lucide ผ่าน adapter — ห้าม inline SVG / ห้าม icon set อื่น
3. **React 17**: ห้าม `useId` / `useSyncExternalStore` / `useDeferredValue` / `useTransition` / `useInsertionEffect` — import มาได้แต่ runtime เป็น `undefined` แล้ว crash
4. **Tailwind 2.1**: `bg-[var(--x)]` ใช้ไม่ได้ (compile เป็น css ว่าง) — ใช้ class ที่ลงทะเบียนใน config หรือ inline `style`
5. **Inline style shorthand + var()**: `padding: 'var(--x) var(--y)'` render เป็น 0 — ใช้ longhand `paddingTop/Right/Bottom/Left` (margin เช่นกัน)
6. **Textarea ที่บุคลากรพิมพ์**: ใช้ `SuggestibleTextarea` + `voice` + `suggestions` + `minChars` เสมอ — ห้าม `VoiceTextarea` เปล่า
7. **Input ที่ wrapper เป็นเจ้าของ border**: ทำ chrome-free ตาม pattern `AISearch.jsx` (stylesheet injection + `!important`)
8. **ห้ามสร้าง component ซ้ำ**: ค้น `src/components/` + `design.md` §6 ก่อนเสมอ ถ้าจำเป็นต้องสร้างใหม่จริง → **ห้ามแก้ `docs/awaiting-components.md` เอง** ให้รายงานผ่าน manifest (`newComponents`) แล้ว integrator เป็นคนลงทะเบียน

## 3. Pattern มาตรฐานของคลินิกพิเศษ (§1.10.x)

ทุกคลินิกใช้ pattern เดียวกับ **ANC** (`src/pages/treat/anc/`) ซึ่งเป็นคลินิกต้นแบบที่ done 100%:

- **Queue page** — `templates/QueuePageShell` + `SummaryCardsBar` + ตารางคิว + `StatusBadge` (ดู `AncQueuePage.jsx`)
- **Record/Form page** — shell บาง ๆ + steps ใน `<Clinic>Steps.jsx` ผ่าน `TreatmentFormShell` / `FormShell` (ดู `AncFormPage.jsx` + `AncSteps.jsx`)
- **ทะเบียนเฉพาะโรค** (ถ้า TOR สั่ง) — pattern เดียวกับ `PharmacyRegistryPage` (list + create/edit ใช้หน้าเดียวกัน)
- Mock data อยู่ `src/data/<clinic>*.js` — คนไข้ไทยสมจริง สอดคล้องบริบทศูนย์บริการสาธารณสุข กทม.
- โครง directory: `src/pages/clinic/<slug>/` (หน้าใหม่ทั้งหมดของคลินิกอยู่ในโฟลเดอร์ตัวเอง)

ข้อมูลทั่วไปผู้รับบริการ (HN, ชื่อ, สิทธิ ฯลฯ) → ใช้ `PatientCard` เดิม; Vital Signs → `VitalsForm` / `VitalSignTimelineCard`; นัดหมาย → alias pattern จาก appointment เดิม

## 4. ขอบเขตไฟล์ (สำคัญที่สุด — กัน conflict ระหว่าง agent ที่รันขนาน)

**Builder agent แก้/สร้างได้เฉพาะ**:
- ไฟล์ใหม่ในโฟลเดอร์ของโมดูลตัวเอง (`src/pages/<module>/…`, `src/data/<module>*.js`, `src/components/<module>/…`)
- ไฟล์เดิมของระบบตัวเองเท่านั้น (กรณี wave เก็บ gap ระบบเดิม)

**ห้าม builder แตะเด็ดขาด** (integrator คนเดียวเป็นคนแก้ตาม manifest):
- `src/routes/Routes.jsx`
- `src/data/systemCatalog.js` / sidebar / nav กลางทุกไฟล์
- `docs/awaiting-components.md`, `docs/tor-checklist.html`, `docs/progress-tracker.html`
- `design.md`, `src/styles/tokens.css`, `src/index.css`, `CLAUDE.md`
- ไฟล์ของโมดูลอื่นใน wave เดียวกัน

สิ่งที่ต้องเชื่อม (route, เมนู, สถานะ checklist, component ใหม่) → ส่งกลับเป็น **manifest** (structured output)

## 5. ความครอบคลุม (ทุก scenario / edge case)

ทุกหน้าจอต้องมี state ครบ: default / loading-skeleton ไม่ต้อง (mock) แต่ต้องมี **empty state / error-validation / filled / read-only / สิทธิไม่พอ** ตามจริงของหน้า
Edge cases ขั้นต่ำที่ต้องเช็คกับ TOR รายข้อ: ยกเลิก+แก้ไขรายการ (ทุกข้อ "แสดง/บันทึก/ยกเลิก/แก้ไข" ต้องทำครบ 4), ผู้ป่วยไม่มีสิทธิ/สิทธิหมดอายุ, ข้อมูลลับ (§1.4.2), audit trail ผู้บันทึก+เวลา, การพิมพ์เอกสาร, ค้นหา-ว่างเปล่า, pagination
ก่อนปิดงานให้ประเมินตามหลัก ux-heuristics (Nielsen) และให้คะแนน 0–10 — ต่ำกว่า 8 ต้องแก้ก่อนส่ง

## 6. การ verify build

ห้ามรัน dev server / build บนโฟลเดอร์ Google Drive (esbuild โดน SIGKILL) ให้:
1. อ่าน `~/MIH-PHCIS-local/dev.sh` เพื่อดูคำสั่ง rsync Drive→local ที่ใช้จริง แล้วรันเฉพาะท่อน sync
2. build ที่ local ด้วย Node 16: `cd ~/MIH-PHCIS-local && ~/.local/node16/bin/npx vite build`
3. ถ้าจะ verify หน้าเว็บจริง ใช้ dev server local (`dev.sh`) — ถ้าแก้แล้วไม่เห็นผล ให้ `rm -rf ~/MIH-PHCIS-local/node_modules/.vite` แล้ว restart (HMR stale-cache bug)
4. grep needle ตรวจ stale ต้องเป็น **ASCII เท่านั้น** (esbuild escape ไทยเป็น `\uXXXX`)

## 7. Manifest schema (builder ต้องส่งกลับ)

```json
{
  "moduleId": "1.10.3",
  "filesCreated": ["src/pages/clinic/mental-health/…"],
  "routes": [{ "path": "/clinic/mental-health", "importName": "MentalHealthQueuePage", "importPath": "../pages/clinic/mental-health/MentalHealthQueuePage.jsx", "exact": true }],
  "navEntries": [{ "menu": "sidebar|systemCatalog", "label": "งานสุขภาพจิต", "path": "/clinic/mental-health", "icon": "psychology" }],
  "checklistUpdates": [{ "id": "1.10.3.1", "status": "done", "url": "/clinic/mental-health", "note": "PatientCard on queue+record" }],
  "newComponents": [{ "name": "…", "usedIn": "…", "reason": "ไม่มีใน DS เพราะ…" }],
  "notes": "ข้อจำกัด / การตัดสินใจสำคัญ"
}
```

`checklistUpdates` ต้อง**ซื่อสัตย์**: ทำจริงแค่ไหนรายงานแค่นั้น (`partial` พร้อม note ดีกว่า `done` ปลอม)
