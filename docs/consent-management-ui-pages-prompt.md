# Prompt: สร้างหน้า UI — Consent Management (MIH PHCIS)

> **Copy จากไฟล์นี้** — ใช้กับ Cursor Agent, Figma AI, หรือ vibe code  
> UI flow / FigJam: [`consent-management-ui-flow-prompt.md`](./consent-management-ui-flow-prompt.md) · https://www.figma.com/board/HiJDtLgtzb16FoGMKjNaRH  
> ก่อนลงมืออ่าน: `design.md`, `docs/product-spec.md` §8, `CLAUDE.md`, skill `.claude/skills/ux-ui-designer/SKILL.md`

---

## 1) Master prompt — สร้าง/ขยายหน้า UI ทั้งระบบ Consent

คัดลอกบล็อกนี้เมื่อต้องการให้ AI ออกแบบหรือ implement หลายหน้าพร้อมกัน:

```
คุณเป็น Senior UX/UI Designer + Frontend สำหรับ MIH PHCIS (React 17 + Vite + design tokens)

งาน: ออกแบบและ implement หน้า UI ของ Consent Management ตาม TOR ผนวก ก
ห้ามสร้าง design ใหม่นอก MIH Foundation — อ้างอิง component และ layout ที่มีในโปรเจกต์ก่อนเสมอ

## กฎบังคับ (ห้ามละเมิด)

### Design tokens
- ทุกสี/ขนาด/ระยะ/ตัวอักษร/เงา/ขอบ → var(--*) จาก design.md + src/index.css
- ยกเว้น gradient ใช้ linear-gradient ได้
- fallback ใน style ต้องตรงค่า token จริง

### Icons
- Figma/Material Symbols ผ่าน <Icon name="..." /> ก่อน
- ไม่มีใน Figma → lucide-react ผ่าน adapter เดิม ห้าม Heroicons/FontAwesome

### Input
- wrapper เป็นเจ้าของ border/focus — inner input ต้อง strip chrome (.mih-*-input + !important) ตาม CLAUDE.md

### โครงสร้างหน้า Desktop
- Sidebar activeKey="consent" สำหรับคลังแบบฟอร์ม (/forms)
- คิว/ฟอร์มยาว: QueuePageShell หรือ FormShell + StepProgress ตาม pattern เดิม
- Sticky footer: ย้อนกลับ | บันทึกร่าง | ถัดไป/บันทึก
- Patient context: PatientCard sticky เมื่อเกี่ยวกับ visit

## TOR ที่หน้าต้องรองรับ

| TOR | ความต้องการ UI |
|-----|----------------|
| 1.4.9.1 | Form types: text, textarea, date, datetime, checkbox, select, number, boolean |
| 1.4.9.2 | Assessment forms (PHQ-9, GAD-7) ในคลัง |
| 1.4.3.16 | Audit bar: ผู้บันทึก, เวลาบันทึก, เวลาแก้ไข, ทำเครื่องหมายข้อมูลผิด |
| 1.5.1.6 | แบบฟอร์มยินยอมมาตรฐาน สธ. ในหมวด consent |
| 1.5.11.x | e-Document list + สถานะ + พิมพ์ |
| 1.8.4.x | e-Signature: เลือกที่บันทึก / วาดใหม่ / อัปโหลด |
| 1.2.2.6 | OPD Screening step 5 — แนบฟอร์มจากคลัง |
| 4.5.4 / 4.6.4 | Mobile ขอเอกสาร + ดาวน์โหลด e-Document |

## Screen inventory (สร้าง/ขยายตามลำดับ Phase)

### Phase 1 — คลังแบบฟอร์ม (มีโค้ดแล้ว — ขยายให้ครบ TOR)
1. `/forms` FormsLibraryPage — hub + filter + table
2. `/forms/category/consent` FormsCategoryPage
3. `/forms/:slug` FormDetailPage — preview, QR, actions
4. `/forms/:slug/fill` FormFillPage — staff mode
5. `/forms/:slug/fill?role=patient` — patient mode (ตัด chrome เจ้าหน้าที่)

### Phase 2 — PDPA + OPD
6. PersonalDataConsentEditPopup (Figma 351:66329) — ขยาย revoke + audit
7. Registration — จุดเปิด PDPA + StatusBar สถานะ
8. OPD Screening step 5 — FormsLibrary embed + สถานะต่อคิว

### Phase 3 — CPOE + e-Document
9. Treatment step 5 — consent gate ก่อนสั่งหัตถการ/Lab
10. Visit e-Document drawer — รายการที่เซ็นแล้ว + พิมพ์/ยกเลิก

### Phase 4 — Mobile
11. `/m/requests` — ขอใบรับรอง + ขอประวัติรักษา

### Phase 5 — Telemed
12. Pre-call PDPA modal ก่อนเปิดกล้อง

## ต่อหน้าต้องส่ง spec นี้

สำหรับแต่ละหน้า ระบุ:
- Route + breadcrumb + page title (ภาษาไทย)
- Layout zones (header / filter / content / footer) พร้อม token spacing
- Component list จากโปรเจกต์ (ชื่อไฟล์จริง) — ห้ามสร้าง duplicate
- States: default, loading, empty, error, success, read-only, permission-denied
- Primary/secondary/destructive actions + disabled rules
- Validation + inline error copy (ภาษาไทย)
- Mock data shape (HN, VN, status, audit)
- TOR IDs ที่หน้านี้ปิด requirement
- Gap จากโค้ดปัจจุบัน (ถ้ามี)

## Component ที่ต้อง reuse (grep ก่อนใช้)

- Popup, Topic, Table, Pagination, FilterTag, FilterDateTag, PrimarySearch
- FormsLibrary, ColorfulBadge, StatusBadge, BrandButton, BrandSubdueButton
- PersonalDataConsentEditPopup, Signature, Field/FieldGrid, Information
- QueuePageShell, FormShell, StepProgress, PatientCard
- PhcisTopToast, AlertDialog

## ไฟล์อ้างอิง

- src/pages/forms/*.jsx
- src/data/formsLibrary.js, personalDataConsentForm.js
- src/components/forms/PersonalDataConsentEditPopup.jsx, FormsLibrary.jsx
- docs/product-spec.md §8

เริ่มจาก Phase 1 หน้าที่ user ระบุ (หรือทั้ง Phase 1) — ส่ง wireframe structure เป็น bullet แล้ว implement React ตาม token rules
```

---

## 2) Prompt รายหน้า — คัดลอกทีละหน้า

### หน้า 1: คลังแบบฟอร์ม Hub (`/forms`)

```
สร้าง/ปรับ UI หน้า Forms Library Hub สำหรับ MIH PHCIS

Route: /forms · Sidebar activeKey="consent"
อ้างอิง: src/pages/forms/FormsLibraryPage.jsx, src/components/forms/FormsLibrary.jsx

Layout:
- Breadcrumb: คลังแบบฟอร์ม
- Topic หัวข้อ + คำอธิบายสั้น
- แถบ category (consent / assessment / report / survey) — ColorfulBadge + ไอคอน verified_user ฯลฯ
- Filter row: PrimarySearch, FilterDropdown (นโยบาย OPD/IPD, สถานะเปิดใช้งาน, แผนก)
- ตาราง catalog: รหัส F-xxxx, ชื่อฟอร์ม, หมวด, เวอร์ชัน, สถานะ StatusBadge, การดำเนินการ
- Pagination

หมวด consent ต้องเด่น (TOR 1.5.1.6) — การ์ด consent-treatment, consent-surgery, consent-blood จาก formsLibrary.js

States: empty search, loading skeleton, ไม่มีผลลัพธ์
Actions ต่อแถว: ดูรายละเอียด → /forms/:slug

ใช้ design tokens เท่านั้น · ภาษาไทย · ไม่ hardcode hex/px
```

---

### หน้า 2: รายละเอียดฟอร์ม (`/forms/:slug`)

```
สร้าง/ปรับ UI หน้า Form Detail สำหรับแบบฟอร์มยินยอม

Route: /forms/consent-treatment (ตัวอย่าง)
อ้างอิง: src/pages/forms/FormDetailPage.jsx

Layout:
- Topic: ชื่อฟอร์ม + ColorfulBadge หมวด "แบบฟอร์มยินยอม" + รหัส F-1001 + version pill
- คอลัมน์ซ้าย: รายการ section/field preview (read-only) — label, type, required *
- คอลัมน์ขวา: QR panel สำหรับผู้ป่วย + คำแนะนำ
- Action bar (BrandButton):
  - พิมพ์ (TOR 1.5.11.4)
  - เจ้าหน้าที่กรอกแทน → /forms/:slug/fill
  - ส่ง QR ให้ผู้ป่วย (แสดง QR + deep link)

แสดง estimatedMinutes, language, summary
field.critical → pill "ตรวจซ้ำเมื่อพบสัญญาณเสี่ยง" (ถ้ามี)

States: ฟอร์มไม่พบ 404, ฟอร์มปิดใช้งาน (disabled actions + StatusBadge)
```

---

### หน้า 3: กรอกฟอร์ม — เจ้าหน้าที่ (`/forms/:slug/fill`)

```
สร้าง/ปรับ UI หน้า Form Fill (โหมดเจ้าหน้าที่) สำหรับใบยินยอม

Route: /forms/consent-treatment/fill
อ้างอิง: src/pages/forms/FormFillPage.jsx

Layout:
- Header: ชื่อฟอร์ม + HN/ชื่อผู้ป่วย (ถ้ามี query/state)
- การ์ดต่อ section (ApptReadOnlyCard style หรือ card token เดิม)
- Field renderers: text, textarea, date, datetime, checkbox, select, signature canvas
- Sticky footer: ยกเลิก | บันทึกร่าง | บันทึกและเซ็นจบ

Validation: required fields block submit · signature ว่าง block submit
หลังบันทึก: PhcisTopToast success · สถานะ instance = signed

Audit bar ด้านล่าง (TOR 1.4.3.16):
"บันทึกโดย [ชื่อ] · [วันที่เวลา]" · ปุ่ม "ทำเครื่องหมายข้อมูลผิด" (outline)

e-Signature (TOR 1.8.4): แท็บ เลือกลายเซ็นที่บันทึก | วาดใหม่ | อัปโหลดรูป
ใช้ component Signature จาก FormBuilder

Gap ปัจจุบัน: ยังไม่ persist — ออกแบบ UI ให้รองรับ draft/autosave ในอนาคต
```

---

### หน้า 4: กรอกฟอร์ม — ผู้ป่วย (`?role=patient`)

```
สร้าง/ปรับ UI หน้า Form Fill โหมดผู้ป่วย (QR landing)

Route: /forms/consent-treatment/fill?role=patient
อ้างอิง: FormFillPage — ตัด sidebar, ตัดปุ่มเจ้าหน้าที่, mobile-first

Layout:
- Logo โรงพยาบาล + ชื่อฟอร์มสั้น
- Progress: section 1/3 (optional stepper)
- ฟิลด์ใหญ่ touch-friendly (min height 48px)
- Checkbox ยอมรับ PDPA ก่อนเริ่ม (ลิงก์นโยบาย)
- Signature เต็มความกว้าง
- ปุ่ม primary เต็มแถว: "ยืนยันส่ง"

Success screen: ไอคอน success + "ส่งความยินยอมสำเร็จ" + รหัสอ้างอิง
Decline path: ปุ่มรอง "ไม่ยินยอม" → confirm → สถานะ declined

ภาษาไทยหลัก · contrast สูง · ไม่แสดงเมนู PHCIS
```

---

### หน้า 5: PDPA Popup (ลงทะเบียน)

```
สร้าง/ปรับ UI Popup PDPA — ยินยอมข้อมูลส่วนบุคคล

Component: PersonalDataConsentEditPopup
Figma: PHCIS | OPD · Popup ExtraLarge 351:66329
อ้างอิง: src/components/forms/PersonalDataConsentEditPopup.jsx
Data: src/data/personalDataConsentForm.js

Layout:
- Popup size ExtraLarge · title: "ยินยอมการเข้าถึงข้อมูลส่วนบุคคลและการเข้ารับบริการทางการแพทย์"
- Scroll area: clause sections 1–6
- Section 5: ConsentChoiceTiles — ยินยอม | ไม่ยินยอม (5.1, 5.2 แยกรายการ)
- ข้อความเตือนเมื่อไม่ยินยอม (ตาม TOR — ยังรักษาได้ ส่งต่อต้องขออนุญาต)
- ฟิลด์ผู้ลงนาม: คำนำหน้า, ชื่อ, ความสัมพันธ์ผู้แทน
- Signature + ปุ่มยืนยันลายเซ็น
- Footer: ปิด | บันทึก

Read-only mode: แสดงลายเซ็นเดิม + audit · ปุ่ม "ยกเลิกความยินยอม" (มาตรา 6) → AlertDialog confirm

ห้ามใช้ hex literal · ใช้ ConsentChoiceTiles และ card token เดิม
```

---

### หน้า 6: OPD Screening — แนบฟอร์ม (Step 5)

```
สร้าง/ปรับ UI OPD Screening Step 5 — แบบฟอร์มและความยินยอม

Context: ScreeningPage step index 4 · title "แบบฟอร์ม"
อ้างอิง: FormsLibrary embed ใน ScreeningPage, PersonalDataConsentEditPopup

Layout ในขั้นตอน:
- การ์ด PDPA หลัก (Figma style FormCard) — สถานะ signed/pending + ปุ่ม ดู/แก้ไข
- กริด FormCard ฟอร์มยินยอมอื่น (ผ่าตัด, เลือด, X-ray) — category consent
- ปุ่ม "เพิ่มแบบฟอร์มจากคลัง" → drawer เลือกฟอร์ม
- ต่อการ์ด: [กรอกที่นี่] [ส่ง QR] [พิมพ์]

Queue integration (แนะนำใน spec):
- ไอคอน consent ในตารางคิว OPD — เขียว/เหลือง/แดง

TOR: 1.2.2.6, 1.4.3.16
Gap: product-spec บอก step 5 ยัง not yet adopted — ออกแบบให้ครบแล้วค่อย wire
```

---

### หน้า 7: CPOE — Consent ก่อนสั่งรักษา

```
สร้าง/ปรับ UI ใน Treatment Step 5 (สั่งการรักษา) เมื่อรายการต้องมีใบยินยอม

Context: /treat/record · Step 5 · หัตถการ/Lab/X-ray ที่ flag requiresConsent

UI ใน order row หรือ modal:
- Inline Alert warning: "ต้องมีใบยินยอมก่อนสั่งรายการนี้"
- สถานะ StatusBadge: ยังไม่มี / รอผู้ป่วย / เซ็นแล้ว
- ปุ่ม: เลือกแบบฟอร์ม | ส่ง QR | เปิดที่เซ็นแล้ว
- ปุ่ม "สั่งรายการ" disabled จนกว่า consent status = signed

Drawer "e-Document ของ visit นี้":
- ตาราง: ชื่อฟอร์ม, วันที่เซ็น, ผู้บันทึก, สถานะ, actions พิมพ์/ดู/ยกเลิก
- Audit column หรือ expand row

TOR: 1.5.1.6, 1.5.11.x
```

---

### หน้า 8: รายการ Consent ต่อผู้ป่วย (ใหม่ — แนะนำ)

```
ออกแบบหน้าใหม่: รายการความยินยอมของผู้ป่วย (Consent Registry)

Route แนะนำ: /forms/patient/:hn หรือ drawer จาก PatientCard

Layout:
- PatientCard mini + HN + visit วันนี้
- FilterDateTag + FilterDropdown สถานะ (เสร็จสิ้น, รอเซ็น, ไม่ยินยอม, ยกเลิก)
- Table: วันที่, ชื่อฟอร์ม, รหัส F-, ช่องทาง (เจ้าหน้าที่/QR), สถานะ StatusBadge, แพทย์ผู้สั่ง
- Row click → read-only detail หรือ FormDetail

Actions: พิมพ์รวม, ส่ง QR ใหม่, ยกเลิก (ตามสิทธิ)

Read-only detail ใช้ pattern AppointmentReadOnlyDetail — การ์ด 3 ใบ + audit

TOR: 1.4.3.16, 1.5.11.1, 1.4.10.11 (e-Document ใน EMR)
```

---

### หน้า 9: Mobile — ขอเอกสาร

```
สร้าง/ปรับ UI Mobile ขอเอกสาร e-Document

Route: /m/requests (ขยาย type cert / medical-record)
อ้างอิง: src/pages/mobile/MobileRequestsPage.jsx pattern

หน้าขอใบรับรอง (TOR 4.5.4):
- ฟอร์ม: ประเภทใบรับรอง, วันที่ต้องการ, หมายเหตุ
- PDPA checkbox
- ส่งคำขอ → สถานะ รออนุมัติ / อนุมัติแล้ว / ปฏิเสธ
- ปุ่มดาวน์โหลด PDF เมื่อพร้อม

หน้าขอประวัติการรักษา (TOR 4.6.4):
- แจ้งความประสงค์ (radio วัตถุประสงค์)
- ช่วงวันที่
- ยืนยันตัวตน (OTP mock)
- Timeline สถานะคำขอ

Mobile shell: MobileShell, bottom nav, token mobile จาก design.md
```

---

## 3) Prompt สั้น — Vibe code ใน Cursor (implement หน้าเดียว)

```
Implement หน้า [ระบุชื่อ/route] สำหรับ MIH PHCIS Consent Management

Constraints:
- อ่าน CLAUDE.md + design.md + docs/product-spec.md §8
- Reuse components จาก src/components และ src/pages/forms — ห้าม duplicate
- ทุก style ใช้ CSS variables พร้อม fallback ที่ถูกต้อง
- Icon ผ่าน <Icon /> เท่านั้น
- ภาษาไทยใน UI copy
- Mock data ใน src/data/ — ไม่เรียก API

Deliverable:
- ไฟล์ page/component ที่แก้
- ลงทะเบียน route ใน Routes.jsx ถ้าเป็นหน้าใหม่
- States ที่ implement แล้วระบุใน comment สั้น ๆ หัวไฟล์

TOR ที่ปิด: [ระบุเช่น 1.5.1.6, 1.4.3.16]

อ้างอิง layout จาก: [ระบุไฟล์เช่น FormDetailPage.jsx]
```

---

## 4) Checklist ก่อนส่งงาน UI

- [ ] ทุก spacing/color/type เป็น token
- [ ] มี empty + error state
- [ ] ปุ่มหลัก/รองชัด · disabled มีเหตุผล
- [ ] Audit แสดงเมื่อบันทึกแล้ว (TOR 1.4.3.16)
- [ ] Signature ครบ 3 ช่องทาง (TOR 1.8.4) ถ้าหน้ามีการเซ็น
- [ ] โหมด patient ไม่มี sidebar PHCIS
- [ ] Trace TOR ID ใน PR description

---

## 5) ไฟล์ที่เกี่ยวข้องใน repo

| ประเภท | Path |
|--------|------|
| คลังฟอร์ม | `src/pages/forms/`, `src/data/formsLibrary.js` |
| PDPA popup | `src/components/forms/PersonalDataConsentEditPopup.jsx` |
| OPD embed | `src/components/forms/FormsLibrary.jsx`, `src/pages/opd/ScreeningPage.jsx` |
| TOR | `docs/tor-checklist.html` |
| UI flow prompt | `docs/consent-management-ui-flow-prompt.md` |
