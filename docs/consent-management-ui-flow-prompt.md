# Prompt: Consent Management — UI Flow แบบละเอียด (MIH PHCIS · TOR)

> **Copy จากไฟล์นี้** — ใช้กับ Cursor, Figma AI, หรือนักออกแบบ (เน้น **flow / journey**)  
> **สร้างหน้า UI รายหน้า** → [`consent-management-ui-pages-prompt.md`](./consent-management-ui-pages-prompt.md)  
> FigJam ที่สร้างแล้ว: https://www.figma.com/board/HiJDtLgtzb16FoGMKjNaRH

---

## Prompt (คัดลอกทั้งบล็อกด้านล่าง)

```
คุณเป็น Senior UX/UI Designer + Product Designer สำหรับระบบ PHCIS (Primary Health Care Information System) ของสำนักอนามัย

ออกแบบ UI flow ครบวงจรของ Consent Management (การจัดการความยินยอม) ให้สอดคล้อง:
1. TOR ผนวก ก — ข้อที่ระบุในตาราง TOR ด้านล่าง (ห้ามตีความนอก TOR โดยไม่ระบุว่าเป็น "นอกขอบเขต / Phase 2")
2. MIH Design System — token จาก design.md + CSS variables ใน src/index.css เท่านั้น (ยกเว้น gradient)
3. โค้ดที่มีอยู่ — ขยายจาก pattern ที่ implement แล้ว ไม่สร้างระบบซ้ำ

Deliverable ที่ต้องได้:
- User flow diagram (Mermaid หรือ FigJam) แยก Desktop (เจ้าหน้าที่) และ Mobile (ผู้รับบริการ)
- Screen inventory (รายการหน้าจอ + route ที่เสนอ)
- Wireframe / high-fidelity spec ต่อหน้าจอ: layout, component, states, empty/error/loading
- Interaction spec: ปุ่ม, validation, guard ออกจากหน้า, audit trail
- Traceability matrix: TOR ID → หน้าจอ/สถานะ → acceptance criteria

---

### ขอบเขต TOR ที่ต้องครอบคลุม

| TOR ID | ข้อความ (สรุป) | โฟกัส UI |
|--------|----------------|----------|
| 1.4.9.1 | สร้างแบบฟอร์มเอกสาร — field types Number, Boolean, Text, Date, Datetime | Form Builder + คลังแบบฟอร์ม |
| 1.4.9.2 | แบบคัดกรอง/ทดสอบ/ประเมิน (2Q, 8Q, 9Q) | หมวด assessment ในคลังแบบฟอร์ม |
| 1.4.3.16 | บันทึก/แก้ไขแบบฟอร์ม + Audit (ผู้บันทึก, เวลาบันทึก, เวลาแก้ไข, เวลาระบุข้อมูลผิด) | ทุกจุดบันทึก consent |
| 1.5.1.6 | สร้างแบบฟอร์มความยินยอมตามที่สำนักอนามัยกำหนด | หมวด consent + เทมเพลตมาตรฐาน |
| 1.5.11.1–1.5.11.5 | e-Document: แสดง/บันทึก/ยกเลิก/แก้ไข, เลือกประเภท, พิมพ์, e-Signature | เอกสารที่เซ็นแล้ว |
| 1.8.4.1–1.8.4.2 | e-Signature: เลือกลายเซ็นที่บันทึก / สร้างใหม่ / อัปโหลด | Signature canvas |
| 1.2.2.6 | บันทึกพฤติกรรมสุขภาพในแบบฟอร์ม — OPD Screening step 5 | แนบฟอร์มจากคลัง |
| 1.13.8–1.13.9 | Telemedicine ตาม PDPA; บันทึกวิดีโอ/ภาพ/เสียงตามที่ผู้รับบริการอนุญาต | Consent ก่อนเปิดกล้อง |
| 4.5.4 | Mobile — ขอใบรับรองแพทย์ e-Document | Mobile profile + คำขอ |
| 4.6.4 | Mobile — ขอประวัติการรักษา + e-Document | Mobile request flow |

หมายเหตุ: Sidebar key `consent` ใน design.md = คลังแบบฟอร์ม (/forms) — consent กระจายข้าม Registration, OPD, CPOE, Forms, Mobile, Telemed

---

### Personas

| Persona | บทบาท | ช่องทาง |
|---------|--------|---------|
| เจ้าหน้าที่เวชระเบียน | PDPA ตอนลงทะเบียน | Desktop — PersonalDataConsentEditPopup |
| พยาบาล OPD | แนบฟอร์มระหว่างคัดกรอง | Screening step 5 FormsLibrary |
| แพทย์/เจ้าหน้าที่คลินิก | consent ก่อนหัตถการ/Lab; QR | CPOE step 5, Forms Library |
| ผู้ป่วย | กรอกยินยอม, ขอเอกสาร | Mobile, QR ?role=patient |
| Admin ฟอร์ม | เทมเพลต, เปิด/ปิดใช้งาน | ขยาย Forms Library |

---

### โครงสร้าง Consent 3 ชั้น

1. Consent Template (คลัง) — formsLibrary.js: slug, code F-1001, category consent, sections/fields
2. Consent Instance (ต่อ HN/VN) — status: draft | pending_patient | signed | declined | expired | revoked | superseded
3. PDPA Master Consent — personalDataConsentForm.js, popup Figma 351:66329, รายการ 5.1/5.2 ยินยอม|ไม่ยินยอม

---

### UI Flow หลัก (ออกแบบละเอียด)

**Flow A — คลังแบบฟอร์ม (/forms)**
Hub → category/consent → /forms/:slug → [พิมพ์] [เจ้าหน้าที่กรอก] [ส่ง QR] → fill staff หรือ fill?role=patient

**Flow B — PDPA ลงทะเบียน**
Registration → PersonalDataConsentEditPopup → ConsentChoiceTiles 5.1/5.2 → Signature → StatusBar "PDPA signed" + Audit

**Flow C — OPD Screening**
Step 5 FormsLibrary → แนบ instance → queue icon สถานะ consent

**Flow D — CPOE**
Order requiresConsent → block จน signed → เลือก template → e-Document list

**Flow E — QR ผู้ป่วย**
Scan QR → fill patient → submit → queue signed

**Flow F — Mobile**
Profile/Requests → ขอ cert (4.5.4) / ขอประวัติ (4.6.4) → OTP → download e-Document

**Flow G — Telemed**
Pre-call PDPA modal → ยินยอมบันทึก → เปิด video

---

### สถานะ Instance (StatusBadge)

| status | Label | Style |
|--------|-------|-------|
| draft | ร่าง | neutral |
| pending_patient | รอผู้ป่วยเซ็น | warning |
| signed | เซ็นแล้ว | success |
| declined | ไม่ยินยอม | error |
| expired | หมดอายุ | neutral |
| revoked | ยกเลิกแล้ว | warning |
| superseded | มีเวอร์ชันใหม่ | info |

---

### Component ในโปรเจกต์ (ใช้ซ้ำ)

Popup, PersonalDataConsentEditPopup, FormsLibrary, FormFillPage, Signature, Table, StatusBadge, FilterDateTag, PhcisTopToast, AlertDialog, Icon, QueuePageShell, FormShell, Sidebar activeKey=consent

กฎ: ทุกค่าเป็น var(--*) จาก design.md; input ใน wrapper strip chrome ตาม CLAUDE.md

---

### Edge cases

ผู้เยาว์+ผู้แทน; ไม่ยินยอม PDPA 5.1 ยังลงทะเบียนได้; แก้ไขหลังเซ็น = superseded; ยกเลิก order ไม่ลบ audit; QR offline draft; เวอร์ชันเทมเพลต; พิมพ์ซ้ำ watermark; ABAC ซ่อนปุ่มแก้ไข

---

### Phase แนะนำ

P1: Forms + Fill + QR + Audit stub (1.4.9, 1.5.11, 1.5.1.6)
P2: PDPA Registration + OPD step 5 (1.4.3.16)
P3: CPOE gate + e-Document (1.5.1.6, 1.5.11)
P4: Mobile e-Document (4.5.4, 4.6.4)
P5: Telemed PDPA + Form Builder admin (1.13.8-9)

---

### อ้างอิง repo

- docs/tor-checklist.html
- docs/product-spec.md §8 Forms Library
- src/data/formsLibrary.js, personalDataConsentForm.js
- src/components/forms/PersonalDataConsentEditPopup.jsx, FormsLibrary.jsx
- src/pages/forms/FormFillPage.jsx

---

### คำสั่งสุดท้าย

ออกแบบ UI flow Consent ครบ Flow A–G ตาม prompt นี้
ใช้ MIH Design System และ component ที่มี
ส่ง Mermaid/FigJam + ตารางหน้าจอ (route, components, states)
ทุกหน้ามี: default, loading, empty, error, success, permission-denied
ระบุ Gap จากโค้ดปัจจุบัน (ไม่มี persistence fill, Screening step 5 ยังไม่ adopt) แยกสี
```

---

## ที่อื่นในโปรเจกต์

| สิ่งที่ต้องการ | ที่ copy / เปิด |
|----------------|----------------|
| **Prompt ฉบับเต็ม** | ไฟล์นี้ — บล็อกในเครื่องหมาย ``` ด้านบน |
| **FigJam UI flow** | https://www.figma.com/board/HiJDtLgtzb16FoGMKjNaRH |
| **TOR checklist** | `docs/tor-checklist.html` (ค้นหา consent, 1.5.1.6, sidebar-consent) |
| **Product spec ฟอร์ม** | `docs/product-spec.md` — หัวข้อ §8 Forms Library |
