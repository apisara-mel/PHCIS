# Awaiting Components — UI ที่ยังไม่มีใน MIH Design System

ทะเบียนของ UI ที่ **สร้างขึ้นใหม่ใน vibe code เพราะไม่มี component ใน design system รองรับ**
ใช้ตอบคำถาม "component ไหนที่ยังไม่มีในระบบบ้าง" และเป็นคิวสำหรับตัดสินใจว่าจะยกขึ้น
design system เมื่อไร

**กติกา**

1. ก่อนสร้าง UI ใหม่ ต้องค้น `src/components/` และ [`design.md`](design.md) ก่อนเสมอ —
   ถ้ามีของเดิมให้ alias ไปใช้ ห้ามเขียนซ้ำ
2. ถ้าไม่มีจริง สร้างใน vibe code ได้ แต่ **ต้องมาลงทะเบียนในไฟล์นี้**
3. ยกขึ้น design system เมื่อมี **ผู้ใช้จริงตั้งแต่ 2 ที่ขึ้นไป** — ออกแบบจากเคสเดียว
   มักได้ API ที่ผูกกับเคสนั้นเกินไป
4. เมื่อยกขึ้น DS แล้ว ให้ย้ายรายการไปหัวข้อ "ยกขึ้น design system แล้ว" พร้อมใส่ชื่อ
   component + node Figma

**สถานะ**
`🕐 รอเคสที่ 2` · `📐 พร้อมออกแบบใน Figma` · `🚧 กำลังทำใน mih-design` · `✅ ยกขึ้น DS แล้ว`

---

## รายการที่รออยู่

### 1. Ward Attention Bar (แถบต้องดูแลด่วน) — 🕐 รอเคสที่ 2

| | |
|---|---|
| **ใช้อยู่ที่** | `src/pages/observation/ObservationQueuePage.jsx` (ระบบสังเกตอาการ) — 1 ที่ |
| **หน้าที่** | แถบบนสุดของหน้าคิว บอกว่า "ตอนนี้ต้องจัดการใคร" โดยไม่ต้องเลื่อนอ่านทั้งหน้า แต่ละรายการกดแล้วพาไปยังเรคคอร์ดนั้นโดยตรง |
| **ทำไมไม่มีของเดิมแทน** | `Alert` เป็นข้อความแจ้งเตือนแบบคงที่ ไม่ใช่รายการที่กดได้ · `ColorfulBadge` เป็นป้ายสถานะ ไม่ใช่ปุ่ม · ไม่มี component ไหนใน DS ที่เป็น "แถบรวมรายการที่ต้องลงมือทำ" |
| **ปัญหาที่แก้** | หน้าคิวเตียงยาว 4.2 หน้าจอ คำถามที่พยาบาลเปิดหน้านี้มาถาม (ใครทรุด / ใครอยู่นานเกิน) เดิมตอบได้ด้วยการเลื่อนอ่านทีละการ์ด |
| **โครงที่น่าจะเป็น** | `<AttentionBar title count>` + `<AttentionBar.Item tone icon label sublabel onClick>` — ตัว item จริง ๆ คือ ColorfulBadge ที่กดได้ (สูงอย่างน้อย 44px ตามเกณฑ์ touch target) |
| **พฤติกรรมที่ต้องรักษาไว้** | ไม่ render อะไรเลยเมื่อไม่มีรายการ — แถบเตือนที่ขึ้นตลอดเวลาจะเลิกเป็นคำเตือน · โทนสีของกรอบตามรายการที่รุนแรงที่สุด · เรียงตามความเร่งด่วน |
| **รอเคสอะไร** | ~~แผนกอื่นที่มีคิวยาวและมีเคสเร่งด่วน — เภสัชกรรม (ใบสั่งยาด่วน / แพ้ยา), Lab (ค่าวิกฤต critical value), X-Ray (อ่านผลด่วน), ANC (ครรภ์เสี่ยงสูง)~~ **เคสที่ 2 มาแล้ว:** `/xray/queue` (งานรังสีวินิจฉัย) มีทั้ง STAT ที่ต้องเด้งขึ้นบนสุด, "ผิดปกติเร่งด่วนวันนี้ — ต้องแจ้งแพทย์ผู้ส่งตรวจ" และแถวที่เกิน SLA — ตรงกับที่รอไว้ ตอนนี้ยกขึ้น DS ได้แล้วโดยออกแบบจาก 2 เคสพร้อมกัน (สังเกตอาการ + รังสี) แต่หน้ารังสียังใช้ summary card + badge อยู่ ยังไม่ได้ประกอบเป็นแถบ |
| **บันทึกเมื่อ** | 31 ก.ค. 2569 |

---

### 2. XrayReportSheet (เอกสารพิมพ์ของงานรังสีวินิจฉัย) — 📐 พร้อมออกแบบใน Figma

| | |
|---|---|
| **ใช้อยู่ที่** | `src/pages/xray/XrayResultPage.jsx` (ใบรายงานผล) · `src/pages/xray/XrayOrderPage.jsx` (ใบส่งตรวจ / ใบนัด / ฉลากซองฟิล์ม) · `src/pages/preview/XraySheetsPreviewPage.jsx` (`/preview/xray-sheets` — living demo) — **3 ที่** |
| **หน้าที่** | กระดาษของงานรังสี 4 ฟอร์แมตจาก masthead ระบบเดียว: `report` ใบรายงานผลการตรวจ (TOR §1.12.6.5) · `request` ใบส่งตรวจ · `appointment` ใบนัด (ผู้ป่วยถือ) · `filmLabel` ฉลากติดซองฟิล์ม 70×40 mm |
| **ทำไมไม่มีของเดิมแทน** | DS ไม่มี component สำหรับสื่อกระดาษเลย — `Card` เป็น surface บนจอที่มี shadow/radius ตามธีม, `Table` เป็นตารางบนจอ ไม่มีอะไรที่คุม `@page`, การไม่แบ่งหน้ากลางบล็อก, หรือลำดับสายตาแบบเอกสารราชการ |
| **ปัญหาที่แก้** | ใบผลของระบบเดิมฝัง IMPRESSION ไว้ล่างสุดด้วยตัวขนาดเดียวกับทุกบรรทัด ทั้งที่เป็นบรรทัดเดียวที่แพทย์ผู้ส่งตรวจอ่านจริง · และใบที่ยังไม่ยืนยันผลหน้าตาเหมือนใบจริง |
| **โครงที่น่าจะเป็น** | `<PrintSheet variant masthead identity>` + `<PrintSheet.Section eyebrow>` + `<PrintSheet.Stamp label emphasis>` + `<PrintSheet.SignatureLine role name license>` — ตัว domain (รังสี/แล็บ/ยา) ส่งแค่เนื้อหา |
| **พฤติกรรมที่ต้องรักษาไว้** | ประเภทผลเป็น**กรอบเส้น ไม่ใช่ป้ายสี** (เครื่องพิมพ์ขาวดำ) · เร่งด่วน = เส้นคู่ + บรรทัดแจ้งแพทย์ · ยังไม่ยืนยันผล = ลายน้ำ ฉบับร่าง + footer เตือน · พิมพ์ประวัติการแก้ไขผลเสมอ (§1.12.6.3) · eyebrow เป็นตัวพิมพ์ใหญ่เฉพาะอังกฤษ · `break-inside: avoid` ทุกบล็อก |
| **ต้องมี token ใหม่** | กระดาษไม่มี dark mode — ตอนนี้ตรึง ink/paper/rule เป็นค่า light ของ token ที่ mirror ไว้ ถ้ายกขึ้น DS ควรเพิ่ม `--print-paper` `--print-ink` `--print-ink-soft` `--print-ink-muted` `--print-rule` (ดู design.md §6.35) |
| **ช่องว่างที่รู้อยู่** | ฉลากฟิล์มพิมพ์เลข XN ตัวใหญ่แทน Code128 จริง — ยังไม่มี barcode lib ในโปรเจกต์ |
| **บันทึกเมื่อ** | 31 ก.ค. 2569 |

---

### 3. XrayOrderPicker (ตัวเลือกรายการตรวจ) — 📐 พร้อมออกแบบใน Figma

| | |
|---|---|
| **ใช้อยู่ที่** | `src/pages/xray/XrayOrderPage.jsx` · CPOE `src/components/forms/TreatmentSteps.jsx` step 5 แท็บ X-ray / RIS — **2 ที่** |
| **หน้าที่** | เลือกรายการตรวจจากทะเบียน: ค้นหา, กรองตามชนิดการตรวจ/ตำแหน่ง, ชุดรายการตรวจ, แสดงราคา + ยอดเบิกตามสิทธิ, เตือนสั่งซ้ำ (§1.12.5.9), รับได้ทั้งแบบ popup และ embedded |
| **ทำไมไม่มีของเดิมแทน** | `Popup` + `PrimarySearch` + `Checkbox` มีอยู่แล้วและถูกใช้ประกอบ แต่ตัว "ตัวเลือกรายการจากทะเบียนที่มีราคา/สิทธิ/คำเตือน" ไม่มีใน DS |
| **รอเคสอะไร** | ไม่ต้องรอแล้ว — ฝั่ง Lab (`src/components/lab/LabOrderPicker.jsx`) รูปร่างเดียวกัน ถ้ายกขึ้น DS ควรทำเป็น `OrderPicker` กลางที่รับ catalog adapter (`items`, `groups`, `priceFor`, `duplicateWarning`) แล้วให้ทั้งรังสีและแล็บเรียกใช้ ไม่ใช่ยก `XrayOrderPicker` ขึ้นตรง ๆ |
| **บันทึกเมื่อ** | 31 ก.ค. 2569 |

---

### 2. ESignatureField (ลายเซ็นอิเล็กทรอนิกส์ 3 ช่องทาง) — 🕐 รอเคสที่ 2

| | |
|---|---|
| **ใช้อยู่ที่** | `src/pages/forms/FormFillPage.jsx` (คลังแบบฟอร์ม — signature field) · `src/components/popup/ConsentFormFillPopup.jsx` (ลงทะเบียน — PDPA/ยินยอม) — 2 ที่ แต่เป็น flow เดียวกัน (การเซ็นใบยินยอม) จึงยังนับเป็นเคสเดียว |
| **หน้าที่** | ให้ผู้ลงนามเลือกช่องทางลายเซ็นตาม TOR 1.8.4.1–1.8.4.2: เลือกลายเซ็นที่บันทึกไว้ / วาดใหม่ (canvas `Signature` เดิม) / อัปโหลดรูป — ทุกช่องทางจบที่ `onChange(dataUrl)` เดียวกัน |
| **ทำไมไม่มีของเดิมแทน** | `Signature` (form-builder) มีเฉพาะช่องทาง "วาด" — ไม่มี saved-signature picker และไม่มี upload ที่ไหนในระบบ |
| **โครง API** | `<ESignatureField value onChange signerName height>` — tab state ภายใน, ลายเซ็นที่บันทึกเป็น mock 2 รายการ |
| **รอเคสอะไร** | ระบบอื่นที่ต้องเซ็น: การเงิน (ใบเสร็จ), Lab (ผู้รายงานผล), ใบรับรองแพทย์ — เคสที่ 2 เมื่อไรยกขึ้น DS พร้อม Figma variant ครบ 3 แท็บ |
| **บันทึกเมื่อ** | 2 ส.ค. 2569 |

---

### 3. ConsentAuditBar (แถบ audit trail ต่อการบันทึก) — 🕐 รอเคสที่ 2

| | |
|---|---|
| **ใช้อยู่ที่** | `src/components/popup/ConsentHistoryPopup.jsx` · `src/pages/consent/ConsentFormViewPage.jsx` · `src/pages/forms/FormFillPage.jsx` (success state) |
| **หน้าที่** | แสดง ผู้บันทึก · เวลาบันทึก · เวลาแก้ไขล่าสุด + ปุ่ม "ทำเครื่องหมายข้อมูลผิด" (เก็บเวลาที่ระบุข้อมูลผิด) ตาม TOR 1.4.3.16 |
| **ทำไมไม่มีของเดิมแทน** | `RegistrationEditHistoryPanel` เป็นตารางประวัติเต็ม (แสดง diff เก่า/ใหม่) — หนักเกินไปสำหรับจุดที่ต้องการแค่บรรทัด audit เดียวท้าย card |
| **โครง API** | `<ConsentAuditBar recordedBy recordedAt editedAt flaggedAt onFlag>` — confirm ผ่าน `AlertDialog` ก่อน mark เสมอ, ข้อมูลเดิมไม่ถูกลบ |
| **รอเคสอะไร** | ทุกจุดบันทึกทางคลินิกที่ TOR 1.4.3.16 ครอบคลุม (OPD screening, CPOE, เภสัช) — เคสที่ 2 เมื่อไรควรยกขึ้น DS เป็น `AuditBar` กลาง |
| **บันทึกเมื่อ** | 2 ส.ค. 2569 |

---

### 4. ConsentIdentityVerifyPopup (พิสูจน์ตัวตนเจ้าของข้อมูลก่อนทำแทน) — 🕐 รอเคสที่ 2

| | |
|---|---|
| **ใช้อยู่ที่** | `src/pages/consent/ConsentManagementPage.jsx` · `src/pages/consent/AccessManagementPage.jsx` · `src/pages/consent/ConsentAccessRightsPage.jsx` — 3 ที่ แต่ทั้งหมดอยู่ในระบบ Consent (flow เดียวกัน: เจ้าหน้าที่ทำ action แทนเจ้าของข้อมูล) จึงยังนับเป็นเคสเดียว |
| **หน้าที่** | บังคับพิสูจน์ตัวตน "เจ้าของข้อมูลส่วนบุคคล" ก่อนทุก action ที่เจ้าหน้าที่ทำแทน (เพิกถอน / บันทึกจากเอกสาร / แก้ไขความยินยอม / อนุมัติสิทธิ / เพิ่ม-ยกเลิกสิทธิ) ตาม TOR ด.1.1.1 — 2 เส้นทางเป็นแท็บ: (๑) เลขบัตร 13 หลัก ตรวจ checksum + OTP mock (นับถอยหลัง/ส่งใหม่/ผิดเกิน 3 ครั้ง → lock ชั่วคราวแล้วเสนอเส้นทางเอกสาร) · (๒) แนบเอกสารยืนยันตัวตน + ระบุความสัมพันธ์กรณีผู้แทน/ผู้เยาว์ |
| **ทำไมไม่มีของเดิมแทน** | `/login` มี Thai ID + OTP แต่เป็นหน้า auth เต็มจอของ "ผู้ใช้ระบบ" ไม่ใช่ popup ในเนื้องานสำหรับพิสูจน์ตัวตน "เจ้าของข้อมูล" ระหว่าง action · DS มี `Popup` / `OtpInput` / `FileUploadField` เป็นชิ้นส่วน แต่ไม่มี component ที่ประกอบเป็น identity-verify gate |
| **โครง API** | `<ConsentIdentityVerifyPopup open onClose onVerified actionLabel patientName hn>` — ผ่านแล้วเรียก `onVerified({ method, citizenId, relationship, verifiedBy, verifiedAt })` ให้ผู้เรียกเก็บ audit ต่อ (TOR 1.4.3.16) |
| **พฤติกรรมที่ต้องรักษาไว้** | การพิสูจน์จริง (DOPA/ThaID) เป็นงาน backend — ตัวนี้เป็น mock ระดับ UI · ผิด OTP เกิน 3 ครั้งต้องเสนอเส้นทางเอกสาร ไม่ใช่ปิดตาย · เส้นทางเอกสารต้องบังคับความสัมพันธ์ผู้แทนสอดคล้อง guardian record เดิม |
| **รอเคสอะไร** | ระบบอื่นที่เจ้าหน้าที่ทำ action แทนประชาชน เช่น เวชระเบียน (แก้ข้อมูลแทน), การเงิน (มอบอำนาจรับเงินคืน), เยี่ยมบ้าน — เคสที่ 2 เมื่อไรควรยกขึ้น DS เป็น `IdentityVerifyPopup` กลางที่รับ `actionLabel` + adapter การพิสูจน์ |
| **บันทึกเมื่อ** | 3 ส.ค. 2569 |

---

### 5. DuplicatePatientWarningPopup (เตือนชื่อ-สกุลซ้ำก่อนสร้างทะเบียน) — 🕐 รอเคสที่ 2

| | |
|---|---|
| **ใช้อยู่ที่** | `src/pages/registration/RegistrationFormPage.jsx` (งานเวชระเบียน — TOR 1.1.1.5) — 1 ที่ |
| **หน้าที่** | ตอน blur ช่องชื่อ/นามสกุลไทย และตอนกด "ถัดไป"/"บันทึก" ถ้าชื่อ+สกุลชนกับทะเบียนเดิม ให้แสดงผู้ชนทุกราย พร้อม **รูป + วัน เดือน ปีเกิด + HN** เพื่อให้เจ้าหน้าที่ตัดสินว่าเป็นคนเดียวกันหรือไม่ · ยืนยันแล้วเขียน audit ผู้ยืนยัน/เวลา/HN ที่ชน |
| **ทำไมไม่มีของเดิมแทน** | `AlertDialog` เป็นกล่องยืนยัน yes/no ข้อความล้วน ไม่มีที่วางรายการผู้ชนที่มีรูป · `Popup` + `Alert` + `QueuePatientAvatar` เป็นชิ้นส่วนที่ประกอบขึ้นได้ แต่ DS ไม่มี "กล่องยืนยันที่ต้องเทียบตัวตนจากรายการ" |
| **โครง API** | `<DuplicatePatientWarningPopup open matches onConfirm onCancel confirmedBy>` — `matches` = `[{ hn, fullName, dob, photoUrl }]`, `onConfirm` คืน `{ confirmedBy, confirmedAt, matchedHns }` ให้ผู้เรียกเก็บ audit เอง |
| **พฤติกรรมที่ต้องรักษาไว้** | เป็น **soft warning** — ชื่อซ้ำต้องผ่านไปได้ (คนไทยชื่อซ้ำจริง) ต่างจากเลขบัตรซ้ำที่ hard-block ตาม 1.1.1.4 · ยกเลิก = กลับฟอร์มโดยไม่บันทึกอะไร · ทุกการยืนยันต้องลง audit เสมอ ไม่มีทางลัดข้าม |
| **รอเคสอะไร** | จุดอื่นที่ต้องเทียบตัวตนก่อนสร้างเรคคอร์ดซ้ำ — ทะเบียนยา/ทะเบียนเฉพาะโรค (ผู้ป่วยซ้ำในทะเบียน), เยี่ยมบ้าน (ครัวเรือนซ้ำ), นัดหมาย (นัดซ้ำวันเดียวกัน) — เคสที่ 2 เมื่อไรควรยกขึ้น DS เป็น `DuplicateMatchPopup` ที่รับ `renderMatch` |
| **บันทึกเมื่อ** | 4 ส.ค. 2569 |

---

### 6. เอกสารพิมพ์ของงานเวชระเบียน — `PatientCardPrintPopup` · `QueueTicketPrintPopup` · `registrationPrint.js` — 📐 พร้อมออกแบบใน Figma

| | |
|---|---|
| **ใช้อยู่ที่** | `PatientCardPrintPopup` → `src/pages/registration/RegistrationFormPage.jsx` (เปิดอัตโนมัติหลังบันทึกสำเร็จ) + `src/pages/registration/RegistrationQueuePage.jsx` (row overflow) — **2 ที่** · `QueueTicketPrintPopup` → `src/pages/registration/RegistrationQueuePage.jsx` — 1 ที่ · `registrationPrint.js` → ทั้งสอง popup |
| **หน้าที่** | `PatientCardPrintPopup` = ใบ OPD CARD ตามคู่มือระบบเวชระเบียน หน้า 2-4 (barcode mock, HN, ชื่อ, เลขบัตร, วันเกิด/อายุ, เพศ, หมู่เลือด, สัญชาติ/ศาสนา, สถานภาพ, ที่อยู่, โทร, สิทธิ, ผู้ติดต่อฉุกเฉิน, วันที่ออกบัตร + ผู้ออกบัตร) — TOR 1.1.1.10 · `QueueTicketPrintPopup` = บัตรคิวสำรองกว้าง 72 mm กรณีตู้ Kiosk ขัดข้อง — TOR 1.1.1.9 · `registrationPrint.js` = **ไม่ใช่ component** แต่เป็น print-mode switch (idempotent stylesheet injection + `data-reg-print-mode`) ที่ทำให้ popup สองตัวพิมพ์คนละเอกสารได้แม้ mount พร้อมกันบนหน้าเดียว (pattern เดียวกับ `labPrintSettings.js`) |
| **ทำไมไม่มีของเดิมแทน** | เหตุผลเดียวกับรายการที่ 2 (XrayReportSheet) — DS ไม่มี component สำหรับสื่อกระดาษเลย ไม่มีอะไรคุม `@page`, การไม่แบ่งหน้ากลางบล็อก, หรือขนาดกระดาษเฉพาะ (72 mm) |
| **เกี่ยวกับรายการที่ 2** | นี่คือ **เคสที่ 4 และ 5 ของ `PrintSheet`** ต่อจากรังสี (`report` / `request` / `appointment` / `filmLabel`) — พอมีสองโดเมนที่ต้องพิมพ์แล้ว ข้อ 2 ควรถูกยกขึ้น DS เป็น `PrintSheet` กลางที่รับ `variant` + ขนาดกระดาษ แทนที่จะยก `XrayReportSheet` ขึ้นตรง ๆ และให้เวชระเบียนเรียก `variant='idCard'` / `variant='queueTicket'` |
| **โครง API** | `<PrintSheet variant='idCard'|'queueTicket' paperWidth masthead identity>` + `setPrintMode(mode)` จาก util กลาง (แทน `registrationPrint.js` + `labPrintSettings.js` ที่ตอนนี้เขียนซ้ำกันคนละโมดูล) |
| **พฤติกรรมที่ต้องรักษาไว้** | print-mode switch ต้อง idempotent (HMR ต้องไม่ทิ้ง `<style>` ค้าง) · popup สองตัวบนหน้าเดียวต้องไม่พิมพ์ทับกัน · บัตรคิวตรึงความกว้าง 72 mm ไม่ผูกกับ A4 · ตัวบัตรผู้รับบริการต้องมีผู้ออกบัตร + วันที่ออกบัตรเสมอ (audit บนกระดาษ) |
| **ช่องว่างที่รู้อยู่** | barcode บนบัตรเป็นตัวเลข HN ตัวใหญ่ ไม่ใช่ Code128 จริง (ยังไม่มี barcode lib ในโปรเจกต์ — ข้อจำกัดเดียวกับฉลากซองฟิล์ม) · **ยังไม่ได้ทดสอบพิมพ์จริงบน Chrome + Safari** — build แบบ headless เท่านั้น ต้องให้คนตรวจสายตาก่อน PR |
| **บันทึกเมื่อ** | 4 ส.ค. 2569 |

---

### 7. OpdDischargePopup (จำหน่าย/ส่งต่อผู้รับบริการ 3 ทาง) — 🕐 รอเคสที่ 2

| | |
|---|---|
| **ใช้อยู่ที่** | `src/pages/opd/OpdDischargePopup.jsx` — mount จาก row action "จำหน่าย/ส่งต่อ" บนแถวตรวจเสร็จแล้วของ `/opd/queue` · **mount หลักตาม TOR คือ `/treat/record` ซึ่งยังไม่ได้ต่อ** (อยู่นอก write scope ของ wave นี้) |
| **หน้าที่** | TOR 1.2.6.1 — 3 ทางเลือกในกล่องเดียว: ส่งตัวกลับบ้าน (คำแนะนำ + ลิงก์นัดครั้งถัดไป) · ส่งต่อแผนกอื่นภายในศูนย์ (เลือกแผนก → สร้าง Request Walk-in ให้เอง) · ส่งต่อสถานพยาบาลอื่น (ค้นหาสถานพยาบาล + เหตุผลการส่งต่อ + พิมพ์ใบส่งตัว) · ยืนยันแล้ว stamp ผู้บันทึก + เวลา |
| **ทำไมไม่มีของเดิมแทน** | DS มี `Popup` / `SelectableCardButton` / `Dropdown` / `SuggestibleTextarea` เป็นชิ้นส่วน แต่ไม่มี component ที่เป็น "กล่องปิดเคส 3 ปลายทาง" ซึ่งแต่ละปลายทางเปิดฟอร์มคนละชุดและมีผลข้างเคียงคนละอย่าง (สร้างคำขอ / พิมพ์เอกสาร / สร้างนัด) |
| **โครง API** | `<OpdDischargePopup open onClose visit onConfirm>` — `onConfirm({ disposition, department?, hospital?, reason, advice?, recordedBy, recordedAt })` ให้ผู้เรียกตัดสินใจเองว่าจะเขียนลง store ไหน |
| **พฤติกรรมที่ต้องรักษาไว้** | สิทธิหมดอายุ/ไม่มีสิทธิ ต้องขึ้นแถบเตือนแต่ **ไม่บล็อก** การจำหน่าย · ปลายทาง "แผนกอื่น" ต้องสร้าง Request Walk-in จริง ไม่ใช่แค่บันทึกข้อความ |
| **รอเคสอะไร** | ไม่ต้องรอนาน — `/treat/record` คือเคสที่ 2 ที่รู้อยู่แล้ว (mount หลักตาม TOR) พอต่อเสร็จควรยกขึ้น DS เป็น `DispositionPopup` ทันที |
| **บันทึกเมื่อ** | 4 ส.ค. 2569 |

---

### 8. SlotAssignmentPanel (ตารางเลือก Slot แพทย์ในคำขอ Walk-in) — 🕐 รอเคสที่ 2

| | |
|---|---|
| **ใช้อยู่ที่** | `src/pages/opd/OpdWalkinRequestPage.jsx` (เนื้อใน popup "ให้ Slot") — 1 ที่ (เขียน inline ยังไม่แยกไฟล์) |
| **หน้าที่** | TOR 1.2.1.5 — ตาราง slot ราย**แพทย์** x ราย**ช่วง** (เช้า/บ่าย) ของแผนกนั้นในวันนี้ · slot ที่ถูกจองในตารางหลักแล้ว render เป็น disabled พร้อม tooltip บอกเหตุผล · โควตาเต็ม disable ทุก slot เว้นแต่มีเหตุผล override ที่บันทึกไว้ที่ `/opd/room-config` |
| **ทำไมไม่มีของเดิมแทน** | `AppointmentCalendarSlot` เป็น **เซลล์เดียว**ในปฏิทินนัดหมาย ไม่ใช่ตัวเลือกทั้งตารางที่มี banner โควตาและเหตุผลกำกับ · DS ไม่มี picker ที่ disabled แล้วยังต้องอธิบายว่าทำไม |
| **โครง API** | `<SlotAssignmentPanel doctors periods slots quota onPick>` — `slots[i] = { doctorId, period, time, roomId, busyReason? }`, `quota = { limit, booked, overrideReason? }`, `onPick(slot)` |
| **พฤติกรรมที่ต้องรักษาไว้** | disabled ต้องบอกเหตุผลเสมอ (error prevention) ห้าม disable เงียบ ๆ · โควตาเต็ม + ไม่มี override = deep-link ไปหน้าโควตา ไม่ใช่ทางตัน · ยกเลิกต้องไม่แตะคำขอเดิม |
| **รอเคสอะไร** | หน้าอื่นที่ต้องยัดคนลง slot ที่มีเพดาน — นัดหมาย (`/appointment` ตอนแทรกเคสด่วน), คลินิกพิเศษที่จำกัดจำนวนต่อรอบ (ทันตกรรม/ANC) — เคสที่ 2 เมื่อไรยกขึ้น DS เป็น `SlotPicker` |
| **บันทึกเมื่อ** | 4 ส.ค. 2569 |

---

### 9. CopyConfigHistoryPicker (เลือกคัดลอกการตั้งค่าจากวันก่อนหน้า) — 🕐 รอเคสที่ 2

| | |
|---|---|
| **ใช้อยู่ที่** | `src/pages/opd/OpdRoomConfigPage.jsx` (เนื้อใน popup "คัดลอกจากประวัติ") — 1 ที่ (เขียน inline) |
| **หน้าที่** | TOR 1.2.7.1 — รายการการตั้งค่าที่เคยบันทึกไว้ (วันที่ + จำนวนแถว + ผู้บันทึก + หมายเหตุ) ให้เลือกมา 1 รายการแล้วคัดลอกมาเป็นค่าเริ่มของวันนี้ |
| **ทำไมไม่มีของเดิมแทน** | `HistoryCopyToast` ใน DS จัดการแค่ **feedback หลังคัดลอก** ไม่ใช่ตัวเลือกว่าจะคัดลอกจากไหน · `Table` ทำได้แต่ไม่มีสถานะ "เลือกได้ทีละรายการ + ยืนยัน" ที่เป็นรูปแบบซ้ำ ๆ |
| **โครง API** | `<CopyConfigHistoryPicker entries selectedId onSelect emptyLabel>` — `entries[i] = { id, date, summary, savedBy, note }` |
| **พฤติกรรมที่ต้องรักษาไว้** | ไม่มีประวัติ = ปุ่ม disabled **พร้อม tooltip อธิบาย** ไม่ใช่ปุ่มตายเงียบ ๆ · คัดลอกแล้วต้องยังไม่บันทึก — สถานะ "คัดลอกจาก &lt;วันที่&gt; — ยังไม่บันทึก" ต้องค้างให้เห็นจนกดบันทึก (จงใจไม่ใช้ toast ที่จางหาย) |
| **รอเคสอะไร** | หน้าตั้งค่าอื่นที่ทำซ้ำรายวัน/รายรอบ — ตารางเวร (`/schedule` คัดลอกสัปดาห์ก่อน), ตารางออกตรวจแพทย์, โควตาคลินิกพิเศษ — เคสที่ 2 เมื่อไรยกขึ้น DS คู่กับ `HistoryCopyToast` เป็นชุดเดียวกัน |
| **บันทึกเมื่อ** | 4 ส.ค. 2569 |

---

### 10. VitalsTwoTierAlertStrip (แถบเตือนสัญญาณชีพ 2 ระดับ x 2 ทิศทาง) — 🕐 รอเคสที่ 2

| | |
|---|---|
| **ใช้อยู่ที่** | `src/pages/opd/ScreeningStep1.jsx` (เหนือ `VitalsForm`) — 1 ที่ (เขียน inline) |
| **หน้าที่** | TOR 1.2.2.3 — เตือนค่าสัญญาณชีพผิดปกติแบบ 2 ชั้น (ส้ม *เฝ้าระวัง* / แดง *อันตราย*) x 2 ทิศทาง (สูง `arrow_upward` / ต่ำ `arrow_downward`) ครอบ BP(SBP), HR, RR, Temp, SpO2 · เรียงอันตรายขึ้นก่อน · ปกติแสดงบรรทัด "ปกติ" ชัดเจน |
| **ทำไมไม่มีของเดิมแทน** | pill critical เดิมที่ฝังใน `VitalsForm` มี **สีเดียว (ส้ม) และทิศทางเดียว (สูง)** — พูดถึง hypothermia / bradycardia / hypotension / SpO2 ต่ำ ไม่ได้เลย · `VitalsForm` เป็นโค้ด DS ที่ใช้ร่วมหลายที่ จึงไม่แก้ ทำเป็นแถบแยกวางเหนือแทน |
| **โครง API** | `<VitalsTwoTierAlertStrip vitals ranges>` → คำนวณเองแล้ว render `[{ metric, tier: 'warn'|'danger', direction: 'high'|'low', value }]` · ระยะยาวควรเป็น `getVitalAlerts(vitals, ranges)` (logic) + `<AlertPillRow>` (UI) แยกกัน |
| **พฤติกรรมที่ต้องรักษาไว้** | ใช้คู่โทน `warning`/`danger` เดียวกับ `PAIN_TONE_TOKENS` — ห้ามคิดสีใหม่ · ต้องมีสถานะ "ปกติ" ที่พูดออกมา ไม่ใช่แถบหายไปเฉย ๆ (ผู้ใช้แยกไม่ออกระหว่าง "ปกติ" กับ "ยังไม่ได้วัด") |
| **รอเคสอะไร** | ทุกที่ที่แสดง vital signs — `/observation` (สังเกตอาการ), `/treat/record`, คลินิกพิเศษที่วัดสัญญาณชีพ, `/m/profile/vitals` — เคสที่ 2 เมื่อไรควรยกขึ้น DS **แล้วกลืนเข้า `VitalsForm` เอง** เพื่อให้ทุกหน้าเตือนเหมือนกันโดยอัตโนมัติ |
| **ช่องว่างที่รู้อยู่** | cross-highlight ระหว่าง ESI ที่เลือกใน Step 2 กับแถบเตือนใน Step 1 **ยังไม่ได้ทำ** — สอง step อยู่คนละ component และไม่มี shared state |
| **บันทึกเมื่อ** | 4 ส.ค. 2569 |

---

### 11. StationTimesAuditTable (ตารางเวลาให้บริการรายสถานีงาน) — 🕐 รอเคสที่ 2

| | |
|---|---|
| **ใช้อยู่ที่** | `src/pages/opd/ScreeningStep5.jsx` (ขั้นสรุป) — 1 ที่ (เขียน inline) |
| **หน้าที่** | TOR 1.2.3.4 — ตาราง read-only *สถานี · เวลาเริ่ม · เวลาเสร็จ · ผู้ให้บริการ* ที่ระบบเก็บอัตโนมัติทุกครั้งที่ผู้ใช้เปลี่ยน step (แถวที่ยังไม่ปิดขึ้น "กำลังให้บริการ") |
| **ทำไมไม่มีของเดิมแทน** | `ConsentAuditBar` (รายการที่ 3) เป็น **บรรทัดเดียว** ท้าย card — ไม่รองรับ log หลายแถวที่มีเวลาเริ่ม/เวลาเสร็จ · `Table` ทั่วไปทำได้ แต่รูปแบบ "log เวลาให้บริการต่อสถานี" ซ้ำในทุกโมดูลที่มี flow หลายสถานี |
| **โครง API** | `<StationTimesAuditTable entries>` — `entries[i] = { station, startedAt, finishedAt?, servedBy }` · แถวที่ไม่มี `finishedAt` = กำลังให้บริการ |
| **พฤติกรรมที่ต้องรักษาไว้** | append-only — ไม่มีทางแก้เวลาย้อนหลังจาก UI · โหมด read-only (เปิดดูอย่างเดียว) **ต้องไม่บันทึกเวลา** เพราะไม่ได้ให้บริการจริง |
| **รอเคสอะไร** | โมดูลอื่นที่มีหลายสถานีต่อ visit — เภสัชกรรม (รับใบสั่ง → จัดยา → ตรวจสอบ → จ่าย), Lab (รับสิ่งส่งตรวจ → วิเคราะห์ → รายงานผล), รังสี (รับ request → ถ่าย → อ่านผล) — เคสที่ 2 เมื่อไรยกขึ้น DS พร้อมกับ `ConsentAuditBar` เป็นตระกูล `Audit*` เดียวกัน |
| **บันทึกเมื่อ** | 4 ส.ค. 2569 |

---

### 12. HospitalLookupField (ค้นหาสถานพยาบาลปลายทาง) — 🕐 รอเคสที่ 2

| | |
|---|---|
| **ใช้อยู่ที่** | `src/pages/opd/OpdDischargePopup.jsx` (สาขาส่งต่อสถานพยาบาลอื่น) — 1 ที่ (เขียน inline) |
| **หน้าที่** | ตามคู่มือระบบเดิม §2.10 — พิมพ์ตั้งแต่ 1 ตัวอักษรแล้วกรองรายชื่อสถานพยาบาล, มีสถานะไม่พบรายการ, เลือกแล้วกลายเป็น chip พร้อมปุ่ม "เปลี่ยนสถานพยาบาล" |
| **ทำไมไม่มีของเดิมแทน** | `Dropdown`/`Select` ของ DS เป็นรายการปิดที่รู้ตัวเลือกครบล่วงหน้า · `PrimarySearch` เป็น search ระดับหน้า ไม่ใช่ form field ที่มีค่าเดียวผูกกับฟอร์ม · `AISearch` ใกล้ที่สุดแต่เป็น search bar ไม่ใช่ field |
| **โครง API** | `<HospitalLookupField value onChange options minChars={1} emptyLabel>` — `options[i] = { code, name, type }` |
| **พฤติกรรมที่ต้องรักษาไว้** | input ด้านในต้อง chrome-free ตาม `CLAUDE.md` (stylesheet injection แบบ `AISearch.jsx` + `!important` ครบทั้ง `:focus` / `:focus-visible`) — ห้ามพึ่ง inline `style` อย่างเดียว · ไม่พบรายการต้องมี state ของตัวเอง ไม่ใช่ dropdown ว่าง |
| **รอเคสอะไร** | ทุกที่ที่อ้างถึงสถานพยาบาลปลายทาง/ต้นทาง — `/registration/visit` (สถานพยาบาลต้นทางกรณี refer-in, ตอนนี้ใช้ `Select` ที่ค้นหาได้แทน), CPOE refer (`/treat/record`), การส่งต่อของคลินิกพิเศษ — **เคสที่ 2 มีอยู่แล้วในโค้ดแต่ยังใช้คนละตัว** จึงควรยกขึ้น DS เป็น `LookupField` กลางที่รับ catalog adapter แล้วให้ทั้งสองที่เรียกใช้ |
| **บันทึกเมื่อ** | 4 ส.ค. 2569 |

---

### 13. QueueQrCode (ตัวสร้าง QR Code ในโปรเจกต์) — 📐 พร้อมออกแบบใน Figma

| | |
|---|---|
| **ใช้อยู่ที่** | `src/pages/queue-center/QueueQrCode.jsx` → ใช้ผ่าน `QueueTicket` ซึ่ง render อยู่ที่ `/queue-center` · `/queue-center/issue` (บัตรจริง + พรีวิว) · `/queue-center/settings` (พรีวิวสด) — **1 โมดูล 3 หน้า** |
| **หน้าที่** | encode ข้อความเป็น QR ตาม ISO/IEC 18004 แล้ววาดเป็น `<svg>` — Byte mode UTF-8, EC level L, version 1–6 (สูงสุด 134 ไบต์), mask 0 · ใช้บนบัตรคิวเพื่อให้ผู้รับบริการสแกนไปหน้าติดตามคิวออนไลน์ (TOR 1.3.2.5) |
| **ทำไมไม่มีของเดิมแทน** | repo มี `Barcode128` (Code 128 เชิงเส้น) แต่ **ไม่มีตัวสร้าง QR ที่ใช้ซ้ำได้เลย** — ที่อื่น (`/kiosk`, `/forms/:slug`, `/m/profile/qr`) วาดเป็น placeholder ตาราง · playbook ห้ามเพิ่ม dependency (`qrcode` / `qrcode.react`) จึง encode เองในไฟล์นี้ |
| **โครง API** | `<QueueQrCode value size />` — ระยะยาวควรเป็น `<QrCode value size level='L' />` ใน DS คู่กับ `Barcode128` เป็นตระกูล `code/*` เดียวกัน |
| **พฤติกรรมที่ต้องรักษาไว้** | เป็น `<svg>` ล้วน (ต้องพิมพ์คมบนเครื่องพิมพ์ความร้อน 72 mm) · ข้อความยาวเกิน version 6 ต้อง degrade อย่างชัดเจน ไม่ใช่วาด QR ที่สแกนไม่ออก |
| **ที่ verify แล้ว** | builder ตรวจด้วย script แยก: format bits ตรงมาตรฐาน L/mask0 (`111011111000100`) และจำนวนโมดูลข้อมูลว่างตรงสเปกทุกเวอร์ชัน v1–v6 (208/359/567/807/1079/1383) · **ยังไม่ได้สแกนด้วยมือถือจริง** — ต้องทดสอบก่อน PR |
| **รอเคสอะไร** | ไม่ต้องรอ — **เคสที่ 2–4 มีอยู่แล้วในโค้ดแต่ยังเป็น placeholder** (`/kiosk` QR บัตรคิว, `/forms/:slug` QR แชร์ฟอร์ม, `/m/profile/qr` QR ผู้รับบริการ) ยกขึ้น DS แล้วเปลี่ยน placeholder ทั้ง 3 จุดได้ทันที |
| **บันทึกเมื่อ** | 4 ส.ค. 2569 |

---

### 14. StationChipBar (แถบชิปจุดบริการพร้อมตัวนับ + จุดเตือน SLA) — 🕐 รอเคสที่ 2

| | |
|---|---|
| **ใช้อยู่ที่** | `src/pages/queue-center/queueCenterShared.jsx` → `QueueCenterConsolePage` (`/queue-center`) — 1 ที่ |
| **หน้าที่** | แถบเลือกจุดบริการที่แต่ละชิปพก **จำนวนคิวคงเหลือ** และ **จุดเตือนสีมุมขวาบน** เมื่อจุดนั้นมีคิวเกินเกณฑ์ SLA ที่ตั้งไว้ที่ `/queue-center/settings` |
| **ทำไมไม่มีของเดิมแทน** | `FilterTag` / `TabPill` ของ DS เป็นตัวกรอง/แท็บล้วน ไม่มีช่อง badge นับ และไม่มีจุดเตือนมุมขวาบน · ประกอบจากปุ่ม + token ล้วน ไม่มี component เทียบเท่า |
| **โครง API** | `<StationChipBar stations activeId onChange counts alerts />` — `counts[stationId] = number`, `alerts[stationId] = 'warn' \| 'danger' \| null` |
| **พฤติกรรมที่ต้องรักษาไว้** | ตัวนับต้องเป็นจำนวน**คงเหลือ** ไม่ใช่จำนวนทั้งหมด (เจ้าหน้าที่ถามว่าเหลือเท่าไร) · จุดเตือนต้องมาจากเกณฑ์จริง ไม่ใช่ค่าคงที่ |
| **ช่องว่างที่รู้อยู่** | เดิมตั้งใจให้ sticky แต่ `QueuePageShell` วาง slot `belowSummary` กับแถบแท็บที่ `top` เดียวกัน แถบแท็บจะทับ — จึงย้ายไปไว้ต้นเนื้อหาหน้าแทน (เลื่อนหายตามปกติ) ถ้าจะแก้จริงต้องให้ shell รับ offset แยกสองค่า |
| **รอเคสอะไร** | หน้าคิวอื่นที่มีหลายจุด/หลายห้องและมีเกณฑ์เวลารอ — `/pharmacy/queue` (จุดจ่ายยาย่อย), `/lab/queue` (สถานีวิเคราะห์), `/xray/queue` (ห้องถ่าย), `/observation` (โซนเตียง) — เคสที่ 2 เมื่อไรควรยกขึ้น DS เป็น `ChipBar` ที่รับ `badge` + `dot` |
| **บันทึกเมื่อ** | 4 ส.ค. 2569 |

---

### 15. MaskedIdentifier (เซลล์ปกปิด HN / เลขบัตรในตาราง) — 🕐 รอเคสที่ 2

| | |
|---|---|
| **ใช้อยู่ที่** | `src/pages/queue-center/queueCenterShared.jsx` → `QueueCenterConsolePage` (`/queue-center` คอลัมน์ HN) — 1 ที่ |
| **หน้าที่** | TOR 1.4.2 — แสดง HN/เลขบัตรแบบปกปิดจนกว่าผู้ใช้จะกดเปิด และบันทึก log การเข้าถึงทุกครั้งที่เปิดดู |
| **ทำไมไม่มีของเดิมแทน** | DS มี `PrivacyRevealPopup` ซึ่งเป็น **dialog เต็มกล่อง** — หนักเกินไปสำหรับเซลล์ในตารางที่ต้องเปิดดูทีละแถวเร็ว ๆ · ไม่มีเซลล์ปกปิดสำหรับตารางใน DS |
| **โครง API** | `<MaskedIdentifier value maskedValue onReveal revealedBy />` — `onReveal` คืน `{ value, revealedBy, revealedAt, context }` ให้ผู้เรียกเขียน log เอง (แบบเดียวกับ `ConsentAuditBar`) |
| **พฤติกรรมที่ต้องรักษาไว้** | เปิดแล้วต้อง log **เสมอ** ไม่มีทางลัดข้าม · ปกปิดกลับได้เอง ไม่ใช่เปิดแล้วเปิดค้างทั้งตาราง · ค่าที่ปกปิดต้องยังค้นหาเจอด้วย `PrimarySearch` (ไม่งั้นเจ้าหน้าที่ทำงานไม่ได้) |
| **รอเคสอะไร** | ตารางอื่นที่โชว์ข้อมูลระบุตัวบุคคล — `/audit/pii-access`, `/registration/queue`, `/consent/access`, `/opd/requests` (การวินิจฉัยที่ mask อยู่แล้วแต่เขียนเอง) — เคสที่ 2 เมื่อไรควรยกขึ้น DS คู่กับ `PrivacyRevealPopup` เป็นตระกูลเดียวกัน |
| **บันทึกเมื่อ** | 4 ส.ค. 2569 |

---

### 16. ชุดจอ TV เรียกคิว — `QueueTvFrame` · `QueueCallCard` · `BigQueueNumber` · `PassedNumbersBlock` · `AnnouncementMarquee` — 📐 พร้อมออกแบบใน Figma

| | |
|---|---|
| **ใช้อยู่ที่** | `src/components/queue-display/` ทั้งหมด · `QueueTvFrame` → 3 จอ (`/queue-center/display/hall` · `/station` · `/finance`) · `QueueCallCard` → hall (3 คอลัมน์) + finance (2 คอลัมน์) · `BigQueueNumber` → `QueueCallCard` + station (`variant='hero'`) · `PassedNumbersBlock` → `QueueCallCard` (`variant='card'`) + station (`variant='bar'`) · `AnnouncementMarquee` → `QueueTvFrame` |
| **หน้าที่** | TOR 1.3.4.1 — พื้นผิวจอ TV เต็มหน้าจอตาม Figma (TV1 129:62395 · TV2 129:62394 · TV3 129:62393): โครงจอ (โลโก้+นาฬิกา / เนื้อหา / แถบประกาศ / overlay heartbeat+สถานะเสียง) · การ์ดคิวต่อจุดบริการ · กล่องเลขคิวขนาด display · บล็อกหมายเลขที่เรียกผ่านไปแล้ว · แถบประกาศวิ่ง |
| **ทำไมไม่มีของเดิมแทน** | DS ทั้งชุดออกแบบมาสำหรับหน้าจอทำงานระยะ 60 ซม. ไม่มีอะไรรองรับ **surface ระยะ 5–10 เมตร**: ไม่มี full-bleed TV frame, ไม่มี marquee/ticker, type ramp หยุดที่ `--type-size-6xl` 60px แต่จอต้องการ 88 / 112 / 320px · `ColorfulBadge` ของ DS ถูกใช้ภายใน `QueueCallCard` แล้ว |
| **โครง API** | `<QueueTvFrame masthead clock announcement audioState stale>` + `<QueueCallCard station current next remaining passed accent>` + `<BigQueueNumber value variant='card'\|'hero'>` + `<PassedNumbersBlock numbers variant='card'\|'bar'>` + `<AnnouncementMarquee text>` |
| **พฤติกรรมที่ต้องรักษาไว้** | สเกล contain จาก canvas 1920×1270 ด้วย transform scale — ต้องพอดีทุกอัตราส่วนโดยไม่ crop · `BigQueueNumber` ย่อตามความยาวเลขอัตโนมัติ · `AnnouncementMarquee` **วัดความกว้างจริงก่อน** ตัดสินว่าจะวิ่งหรือจัดกึ่งกลางนิ่ง (ข้อความสั้นที่วิ่งอ่านยากกว่าเดิม) · `PassedNumbersBlock` ซ่อนทั้งบล็อกเมื่อว่าง และ auto-scroll เมื่อเกิน 4 ใบ · timer / marquee / wakeLock / subscribe ต้อง clear ครบใน cleanup (จอเปิดค้าง 12 ชม.) · ห้ามแสดงชื่อ/HN บนจอสาธารณะ |
| **ต้องมี token ใหม่** | เสนอเข้า `mih-design`: `--dim-stroke-600: 6px` (กรอบกล่องเลข TV1/TV3 — ตอนนี้ถอยไปใช้ `--dim-stroke-500` 5px), `--type-weight-extrabold: 800`, type step เหนือ 6xl (88 / 112 / 320px — ตอนนี้เขียนเป็น `calc()` ที่ alias `--type-size-6xl`), `blue/400 #60A5FA` + `pink/400 #F472B6` (ตอนนี้ใช้ `*-bold` ที่เข้มกว่า Figma) · ฟอนต์ Inter Extra Bold ที่ Figma ใช้ **ไม่ได้โหลดใน index.html เลย** ตัวเลขจึงเป็น Sarabun 700 |
| **รอเคสอะไร** | ไม่ต้องรอเคสที่ 2 ในความหมายปกติ — นี่คือ **สื่อคนละประเภท** (จอสาธารณะ) แบบเดียวกับที่ `PrintSheet` เป็นสื่อกระดาษ ควรตั้งเป็นตระกูล `Display*` / `Tv*` ใน DS ตั้งแต่ต้น พร้อมกันกับตอนตัดสินเรื่อง token ข้างบน |
| **บันทึกเมื่อ** | 4 ส.ค. 2569 |

---

### 17. Figma display glyphs (ClockGlyph24/32 · Volume2Glyph · TriangleAlertGlyph · RowDivider · AnamaiLogo) — 🚧 ควรกลืนเข้า `Icon.jsx` แทน

| | |
|---|---|
| **ใช้อยู่ที่** | `src/components/queue-display/queueDisplayUi.jsx` (จอ TV ทั้ง 3 จอ) — SVG ที่ export จาก Figma เก็บใน `src/assets/queue-display/` แล้ว recolour ด้วย CSS mask (pattern เดียวกับ `MaskIcon` ใน `SummaryCardsBar`) |
| **ทำไมไม่มีของเดิมแทน** | `Icon.jsx` **ไม่มี** glyph `volume-2` และ `triangle-alert` (ตรวจ `iconMap` แล้ว 52 case — มี `clock` อยู่แล้ว แต่ builder วาดใหม่เพราะต้องการเข็มขนาดจอ 32px ตาม Figma) และ repo ไม่ได้ติดตั้ง `lucide-react` — ตาม CLAUDE.md ลำดับคือ Figma → Lucide ซึ่งทั้งสองทางตันในตอนนี้ · โลโก้กรมอนามัยเป็น asset ของหน่วยงาน ไม่ใช่ไอคอน |
| **สิ่งที่ควรทำ (ไม่ใช่ยกขึ้น DS เป็น component ใหม่)** | เพิ่ม `volume_up` และ `warning` เข้า `iconMap` ของ `src/components/icons/Icon.jsx` ตามชื่อ Material Symbols · `clock` มีอยู่แล้ว ให้ `ClockGlyph24/32` อ้าง `<Icon name='clock'>` แทนการเก็บ SVG ซ้ำ — **นี่เป็นงานตามมาที่ควรทำก่อน PR ปิด wave** ไม่ใช่ component ที่รอเคสที่ 2 |
| **ข้อควรระวัง** | ไม่ใช่ inline `<svg>` ในคอมโพเนนต์ (ผิด CLAUDE.md) แต่เป็นไฟล์ asset + CSS mask ซึ่งอยู่ก้ำกึ่ง — ถ้าไม่กลืนเข้า `Icon.jsx` เร็ว ๆ จะกลายเป็นแหล่งไอคอนที่สองของโปรเจกต์ |
| **บันทึกเมื่อ** | 4 ส.ค. 2569 |

---

## ยกขึ้น design system แล้ว

*(ยังไม่มี)*

---

## เคยอยู่ในลิสต์แต่พบว่ามีของเดิมอยู่แล้ว

บันทึกไว้กันสร้างซ้ำรอบสอง

| สร้างเอง | ที่จริงมีอยู่แล้ว | ผลลัพธ์ |
|---|---|---|
| `AlertChip` — ป้ายสถานะสี red/orange + ไอคอน | **`ColorfulBadge`** (`src/components/badge/ColorfulBadge.jsx`) รับ `style` / `icon` / `fill` / `width` และใช้ token ชุด `--surface-colorfulbadge-*` ตัวเดียวกัน | alias ไปใช้ ColorfulBadge แล้ว (6 จุด) — ใส่ `width='hug'` เพราะค่าเริ่มต้น `cap` ตัดข้อความคลินิกเป็น "อาการทรุ…" |
| `<div role="alert">` แต่งเอง 5 กล่อง | **`Alert`** (`src/components/alert/Alert.jsx` · Figma 297:59) มี `type` / `title` / `subtext` / `indicators` / `badges` / `detail` / ปุ่มปิด | alias ไปใช้ Alert แล้ว (5 จุด) — ลิสต์ย่อยใช้ `indicators` แทนการเขียน `<ul>` เอง |
