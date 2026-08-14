# Consent Management — Use Cases & Edge Cases

> ⓘ Flow การ **กรอกใบยินยอมเปิดเผยข้อมูล** (PD-1011 / TX-1011 / CL-1011) รวมขั้น
> เสียบบัตรประชาชนยืนยันตัวตน แยกไปอยู่ที่ [`consent-fill-user-flow.md`](consent-fill-user-flow.md)

> อัปเดต: 2 สิงหาคม 2569 · อ้างอิง Figma [PHCIS | Consent](https://www.figma.com/design/rRGyXjPE8dGrqLkrBfzECq/) + TOR ผนวก ก + `~/MIH-Docs-Vault/consent-management-ui-*.md`
> สถานะ: ✅ ทำแล้วใน prototype · 🟡 ทำบางส่วน · 📋 ออกแบบไว้/รอ backend · ❌ ยังไม่ทำ (ระบุ Phase)

## Actors

| Actor | ช่องทาง | สิ่งที่ทำ |
|---|---|---|
| เจ้าหน้าที่เวชระเบียน | Desktop | ขอ PDPA ตอนลงทะเบียน, กรอกแทนผู้ป่วย |
| พยาบาล / แพทย์ | Desktop | สร้างคำขอ consent, ติดตามสถานะ, เพิกถอน/Reconsent |
| Admin ฟอร์ม | Desktop | สร้าง/แก้เทมเพลต, เผยแพร่/เก็บถาวร, อนุมัติสิทธิ์เข้าถึง |
| ผู้ป่วย / ผู้รับบริการ | Mobile (QR / App) | อ่าน + เซ็น / ไม่ยินยอม / ถอนความยินยอม |
| ผู้ปกครอง (กรณีผู้เยาว์) | ที่ศูนย์บริการ | ลงนามแทนผู้เยาว์ |

---

## A. จัดการความยินยอม (Worklist — `/consent`)

| # | Use case | สถานะ | หมายเหตุ / ที่อยู่ในโค้ด |
|---|---|---|---|
| A1 | ดูภาพรวม: stat cards 6 ใบ + แท็บตามสถานะพร้อม count | ✅ | `ConsentManagementPage` |
| A2 | ค้นหาด้วยชื่อ/HN + filter ประเภท/ช่องทาง/สถานะ/วันที่ | ✅ | มี search history |
| A3 | CTA ต่างกันตามสถานะ: รอลงนาม→ยกเลิกคำขอ · ยินยอมแล้ว→เพิกถอน · ปฏิเสธ/ถอน/หมดอายุ→Reconsent | ✅ | `CONSENT_STATUS.action` + confirm dialog |
| A4 | ดูประวัติความยินยอมรายผู้ป่วย (ให้–ถอน–เซ็นใหม่ ครบ timeline) | ✅ | `ConsentHistoryPopup` + audit bar |
| A5 | เลือกหลายรายการ (bulk) → ยกเลิกคำขอ/Reconsent ทีเดียว | ✅ | chip "เลือก" + checkbox + bulk CTA ต่อแท็บ |
| A6 | นำส่งออกรายงาน → เก็บ log การส่งออก | ✅ | toast แจ้ง log (annotation: print ไม่เก็บ log) |
| A7 | สร้างแบบฟอร์มใหม่จาก worklist | ✅ | ปุ่มลัดไป `/consent/forms/new` |

**Edge cases**

| # | Edge | พฤติกรรมที่คาด | สถานะ |
|---|---|---|---|
| AE1 | ค้นหา/filter แล้วไม่พบ | empty state "ไม่พบรายการความยินยอม" + แนะปรับตัวกรอง | ✅ |
| AE2 | เทมเพลตออกเวอร์ชันใหม่หลังผู้ป่วยเซ็นแล้ว | สถานะ **มีเวอร์ชันใหม่** (superseded) ในแท็บรอลงนาม + CTA "ส่งเซ็นเวอร์ชันใหม่" · ฉบับเดิมยังอยู่ใน history | ✅ record #17 |
| AE3 | ผู้เยาว์ — ผู้ปกครองลงนามแทน | แสดง "ผู้แทน: …" ใต้ชื่อ + คอลัมน์ผู้แทนใน history popup | ✅ record #18 |
| AE4 | Consent หมดอายุ 1 ปี → Reconsent | สถานะ ใกล้หมดอายุ/หมดอายุ + สถานะกลาง "หมดอายุ-Reconsent" ระหว่างรอเซ็นใหม่ | ✅ |
| AE5 | เพิกถอน/ยกเลิกคำขอ ไม่ลบ audit | ทุก action ผ่าน confirm; history เก็บทุกรายการ ไม่มี hard delete | ✅ (mock ไม่ mutate) |
| AE6 | bulk บนแท็บ "ทั้งหมด" (สถานะปนกัน) | ไม่มี bulk CTA — แสดงคำอธิบายให้เลือกแท็บสถานะก่อน | ✅ |
| AE7 | เลือกข้ามหน้า (pagination) แล้วสั่ง bulk | selection คงอยู่ข้ามหน้า, ปุ่มแสดงจำนวนรวม | ✅ (Set by id) |
| AE8 | ผู้ป่วยถอนความยินยอมเองจาก Mobile App | ช่องทางที่ถอน = Mobile App โผล่ใน history | ✅ mock |
| AE9 | สิทธิ์ผู้ใช้ไม่ถึง (ABAC) → ซ่อนปุ่มเพิกถอน/แก้ไข | ต่อ role จริงตอนมี auth backend | 📋 |

---

## B. แบบฟอร์มความยินยอม (Templates — `/consent/forms`, `/consent/forms/:id/view`)

| # | Use case | สถานะ | หมายเหตุ |
|---|---|---|---|
| B1 | ทะเบียนเทมเพลต: ค้นหา + filter (ประเภท/Group Policy/สาขา/แผนก/ผู้สร้าง/สถานะ/วันที่) | ✅ | `ConsentFormsPage` |
| B2 | สลับมุมมองตาราง ⇄ การ์ด | ✅ | `ViewToggle` |
| B3 | สิทธิ์เข้าถึงหลาย scope ต่อฟอร์ม — "+N เพิ่มเติม" เปิด popover | ✅ | `ScopePopover` (Figma 291:254663) |
| B4 | ดูฟอร์ม: preview เอกสารเต็ม + Patient View (มือถือ Live) | ✅ | `ConsentFormViewPage` |
| B5 | Action จากหน้า view: แก้ไข · พิมพ์ (ไม่ log) · บันทึกผ่านคอมพิวเตอร์ (log) · แสดง QR Code | ✅ | ตาม annotation 414:123633 |
| B6 | วงจรชีวิตเทมเพลต: ร่าง → รอตรวจสอบ → เผยแพร่ → ไม่เผยแพร่/เก็บถาวร | ✅ badge/tab | เปลี่ยนสถานะจริงรอ backend 📋 |

**Edge cases**

| # | Edge | พฤติกรรมที่คาด | สถานะ |
|---|---|---|---|
| BE1 | ฟอร์มไม่เผยแพร่ → ปุ่มพิมพ์ต่อแถว disabled | ปุ่ม print จางในแถวไม่เผยแพร่ | ✅ |
| BE2 | id ที่ไม่มีใน `/consent/forms/:id/view` | fallback ไปฟอร์มแรก (กัน crash) — ควรเป็น 404 state เมื่อมี backend | 🟡 |
| BE3 | พิมพ์ซ้ำ → watermark "สำเนา" | ออกแบบไว้ใน spec — ต้อง print CSS + นับครั้งพิมพ์ฝั่ง backend | 📋 |
| BE4 | เทมเพลตถูกใช้ไปแล้ว ห้ามลบ — ทำได้แค่เก็บถาวร | สถานะ "เก็บถาวร" มีในการ์ด (Medication Consent v1.0) — ไม่มีปุ่มลบที่ไหนเลย | ✅ by design |

---

## C. สร้างแบบฟอร์มใหม่ (Wizard — `/consent/forms/new`)

| # | Use case | สถานะ | หมายเหตุ |
|---|---|---|---|
| C1 | เลือกแม่แบบ (หน้าเปล่า/ผ่าตัด/รักษา/วิจัย/บันทึกภาพ/ผู้เยาว์) → prefill ทุก step | ✅ | template key = type |
| C2 | เลือกหน้าปก หรืออัปโหลดรูปเอง | ✅ | `CoverCard` + custom upload |
| C3 | กรอกชื่อ/รายละเอียดด้วยเสียง (voice textarea + ภาษาไทย) | ✅ | `SuggestibleTextarea voice` |
| C4 | เพิ่ม/ลบ/เรียงข้อความยินยอมเป็นข้อ ๆ | ✅ | clause blocks + drag handle |
| C5 | เลือกฟิลด์ข้อมูลผู้ป่วย + ผู้ลงนาม (ผู้ป่วย/แพทย์/พยาน/พยาบาล) | ✅ | checkbox chips |
| C6 | ตั้งค่า: อายุเอกสาร (วัน), สำหรับผู้เยาว์ต้องมีผู้ปกครอง, อนุญาต e-Signature | ✅ | step 2 |
| C7 | ตรวจสอบ (preview + Patient View) → เผยแพร่ → Success | ✅ | `StepReview` + `SuccessScreen` |

**Edge cases**

| # | Edge | พฤติกรรมที่คาด | สถานะ |
|---|---|---|---|
| CE1 | ยังกรอกไม่ครบ → "ถัดไป" กดไม่ได้ | step validity gate + stepper ย้อนกลับได้เฉพาะ step ที่ผ่านแล้ว | ✅ |
| CE2 | ออกกลางคัน | "ร่างแบบฟอร์ม (บันทึกล่าสุด: …)" + ปุ่มบันทึกร่าง — autosave จริงรอ backend | 🟡 |
| CE3 | แก้เทมเพลตที่เผยแพร่แล้ว | ต้อง bump เวอร์ชัน → ผู้ที่เซ็นฉบับเดิมกลายเป็น "มีเวอร์ชันใหม่" (ดู AE2) | 📋 rule |

---

## D. กรอก/เซ็นแบบฟอร์ม (`/forms/:slug/fill` และ `?role=patient`)

| # | Use case | สถานะ | หมายเหตุ |
|---|---|---|---|
| D1 | เจ้าหน้าที่กรอกแทนผู้ป่วย (banner ฟ้า + ปุ่มยกเลิกกลับ detail) | ✅ | role=staff |
| D2 | ผู้ป่วยสแกน QR → หน้า mobile-first ไม่มี chrome เจ้าหน้าที่ | ✅ | role=patient |
| D3 | e-Signature 3 ช่องทาง: เลือกที่บันทึก / วาดใหม่ / อัปโหลดรูป (TOR 1.8.4) | ✅ | `ESignatureField` |
| D4 | Field types: text/textarea/date/datetime/select/checkbox/radio/slider/signature (TOR 1.4.9.1) | ✅ | `renderField` switch |
| D5 | บันทึกสำเร็จ → success + **รหัสอ้างอิง** + audit bar (TOR 1.4.3.16) | ✅ | เพิ่มรอบนี้ |
| D6 | ผู้ป่วยเลือก **ไม่ยินยอม** → confirm → หน้า declined + รหัสอ้างอิง + เปลี่ยนใจได้ | ✅ | เพิ่มรอบนี้ |

**Edge cases**

| # | Edge | พฤติกรรมที่คาด | สถานะ |
|---|---|---|---|
| DE1 | ช่อง required (รวมลายเซ็น) ว่าง | ปุ่มส่ง disabled + บอก "ต้องกรอกอีก n ช่องที่มีเครื่องหมาย *" | ✅ เพิ่มรอบนี้ |
| DE2 | ไม่ยินยอมโดยไม่ต้องกรอกครบ | ปุ่ม "ไม่ยินยอม" กดได้เสมอ (ปฏิเสธไม่ควรถูกบังคับกรอก) | ✅ |
| DE3 | กด "ไม่ยินยอม" พลาด | AlertDialog confirm ก่อน + ข้อความย้ำว่าไม่กระทบสิทธิบริการอื่น | ✅ |
| DE4 | slug ไม่ถูกต้อง (ลิงก์เสีย/ฟอร์มถูกถอน) | หน้า "ไม่พบแบบฟอร์มที่ตรงกับลิงก์นี้" | ✅ |
| DE5 | ผู้ป่วยเปิด QR แล้วเน็ตหลุดกลางทาง (offline draft) | ควรเก็บ draft ใน localStorage แล้ว sync เมื่อ online | 📋 backend |
| DE6 | QR หมดอายุ / คำขอถูกยกเลิกก่อนเซ็น | ควรแสดง "คำขอนี้ถูกยกเลิกแล้ว" แทนฟอร์ม | 📋 backend |
| DE7 | อัปโหลดลายเซ็นไฟล์ผิดชนิด/ใหญ่เกิน 5 MB | ปฏิเสธไฟล์ + ข้อความ error ระบุชื่อไฟล์/ขนาด (role=alert) | ✅ |
| DE8 | ผู้เยาว์: ฟอร์ม require guardian | แม่แบบ "การรักษาผู้เยาว์" มี requireGuardian + ฟิลด์ความสัมพันธ์ผู้แทน | ✅ wizard / 🟡 fill (ฟิลด์มีเมื่อเลือกในเทมเพลต) |

---

## E. PDPA ตอนลงทะเบียน (Registration)

| # | Use case | สถานะ | หมายเหตุ |
|---|---|---|---|
| E1 | เปิด PDPA popup (มาตรา 1–6 + ข้อ 5 ยินยอม/ไม่ยินยอมรายรายการ) | ✅ | `PersonalDataConsentEditPopup` |
| E2 | เซ็นในคลินิก หรือส่งไปมือถือผู้ป่วย (QR simulation 3 stage) | ✅ | `ConsentQrSendPopup` |
| E3 | Banner สรุป: ยังไม่เซ็น / เซ็นบางส่วน / ครบแล้ว | ✅ | `RegistrationConsentStep` |

**Edge cases**

| # | Edge | พฤติกรรมที่คาด | สถานะ |
|---|---|---|---|
| EE1 | ไม่ยินยอมข้อ 5.1/5.2 (เปิดเผยข้อมูล) | **ยังลงทะเบียน/รักษาได้** — กล่องเตือนสีส้มขึ้นใต้ tile ทันที: ไม่กระทบการรักษา แต่การส่งต่อข้อมูลต้องขออนุญาตรายครั้ง | ✅ |
| EE2 | ถอน PDPA ภายหลัง (มาตรา 6) | โหมด read-only มีปุ่ม "ยกเลิกความยินยอม" + confirm | ✅ |
| EE3 | ผู้แทนลงนาม (ผู้เยาว์/ผู้ไร้ความสามารถ) | ฟิลด์คำนำหน้า/ชื่อ/ความสัมพันธ์ผู้แทน | ✅ ฟิลด์มี |

---

## F. จัดการสิทธิ์การเข้าถึง (`/consent/access`)

| # | Use case | สถานะ | หมายเหตุ |
|---|---|---|---|
| F1 | เจ้าหน้าที่ขอสิทธิ์เข้าถึงฟอร์มที่ตนไม่มีสิทธิ์ → Admin อนุมัติ/ปฏิเสธ | ✅ | approve/reject + confirm |
| F2 | ซ่อน HN ในตาราง — เปิดดูได้ใน popup เท่านั้น | ✅ | annotation 422:123634 |
| F3 | ดูเอกสารแนบประกอบคำขอ (PDF) | ✅ | `FileCell` + `DocPreview` |
| F4 | ดูประวัติการขอสิทธิ์ย้อนหลัง | ✅ | แท็บประวัติ |

**Edge cases:** คำขอซ้ำระหว่างรออนุมัติ (ควร block ฝั่ง backend 📋) · อนุมัติแล้วสิทธิ์มีวันหมดอายุ (📋 Phase ถัดไป — "ประวัติและการเข้าถึง > ระบบแยก" ตาม annotation)

---

## G. สถิติและรายงาน (`/consent/report`)

| # | Use case | สถานะ |
|---|---|---|
| G1 | 5 รายงาน: สถิติยินยอม/ไม่ยินยอม · รายบุคคล · ส่งออกนอกหน่วยงาน · ผู้มีสิทธิ์เข้าถึง · Audit Log (IP/Session) | ✅ |
| G2 | ดูรายงาน (donut + ตาราง popup) + เลือกประเภทวันที่ (annotation 274:45632) | ✅ |
| G3 | นำออกรายงาน: บังคับช่วงวันที่ + รูปแบบไฟล์ ก่อนกดได้ | ✅ |
| G4 | Export ทุกครั้งเก็บ log (annotation) | ✅ toast |

**Edge case:** ช่วงวันที่ไม่มีข้อมูล → ตารางว่าง + donut 0 (🟡 ตอนนี้ mock คงที่)

---

## นอกขอบเขต prototype นี้ (ตาม Phase ใน pages-prompt)

| Phase | งาน | TOR |
|---|---|---|
| 2 | OPD Screening step 5 — wire `FormsLibrary` เข้า `formsLibrary.js` จริง + สถานะ consent ต่อคิว | 1.2.2.6 |
| 3 | CPOE gate — order ที่ `requiresConsent` ถูก block จนกว่าสถานะ signed + e-Document drawer ต่อ visit | 1.5.1.6, 1.5.11 |
| 4 | Mobile ขอใบรับรอง/ประวัติ + ดาวน์โหลด e-Document จริง (ตอนนี้ stub) | 4.5.4, 4.6.4 |
| 5 | Telemed pre-call PDPA ผูกเข้า consent record กลาง | 1.13.8–9 |
| — | รวม status enum 3 ชุด (consentRecords / consentFormRecords / registrationForm) เป็น model เดียวตอนต่อ API | — |
