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

### 2. ESignatureField (ลายเซ็นอิเล็กทรอนิกส์ 3 ช่องทาง) — ✅ ครบเคสที่ 2 แล้ว · เสนอยกขึ้น DS

| | |
|---|---|
| **ใช้อยู่ที่** | `src/pages/forms/FormFillPage.jsx` (คลังแบบฟอร์ม) · `src/components/popup/ConsentFormFillPopup.jsx` (ลงทะเบียน — PDPA/ยินยอม) · **`src/pages/assess/AssessUserCreatePage.jsx` (จัดการระบบ — ลายเซ็นดิจิทัลของบุคลากร)** |
| **หน้าที่** | ให้ผู้ลงนามเลือกช่องทางลายเซ็นตาม TOR 1.8.4.1–1.8.4.2: เลือกลายเซ็นที่บันทึกไว้ / วาดใหม่ (canvas `Signature` เดิม) / อัปโหลดรูป — ทุกช่องทางจบที่ `onChange(dataUrl)` เดียวกัน |
| **ทำไมไม่มีของเดิมแทน** | `Signature` (form-builder) มีเฉพาะช่องทาง "วาด" — ไม่มี saved-signature picker และไม่มี upload ที่ไหนในระบบ |
| **โครง API** | `<ESignatureField value onChange signerName height>` — tab state ภายใน, ลายเซ็นที่บันทึกเป็น mock 2 รายการ |
| **สถานะ** | เดิมรอเคสที่ 2 — **10 ส.ค. 2569 ได้เคสที่ 2 จริงแล้ว**: การเซ็นของ *บุคลากร* (ไม่ใช่ผู้รับบริการเซ็นใบยินยอม) เป็นคนละ flow จึงนับเป็นเคสอิสระ → เข้าเกณฑ์ยกขึ้น DS พร้อม Figma variant ครบ 3 แท็บ |
| **บันทึกเมื่อ** | 2 ส.ค. 2569 · อัปเดต 10 ส.ค. 2569 |

---

### 18. RowActionMenu (เมนู ⋮ ประจำแถว) — ✅ ครบเคสที่ 2 แล้ว · เสนอยกขึ้น DS

| | |
|---|---|
| **ใช้อยู่ที่** | `src/pages/system/CenterStructureEditor.jsx` (แผนก / คลินิก / ห้อง-เตียง) · `src/pages/assess/AccessControlPage.jsx` (แม่แบบสิทธิ) — **2 ที่** และมี markup ชุดเดียวกันฝังอยู่ใน `src/pages/queue-center/QueueCenterConsolePage.jsx` ที่ควร alias ตามมา |
| **หน้าที่** | ปุ่ม `more_vert` + Popover รายการคำสั่งประจำแถว รองรับ `disabled` / `danger` และปิดเมนูอัตโนมัติหลังเลือก — คำสั่งหลักที่ใช้คือ "ทำสำเนา" |
| **ทำไมไม่มีของเดิมแทน** | `Popover` มีอยู่แล้วแต่เป็น shell เปล่า · `OverflowFlexRow` แก้คนละปัญหา (ปุ่มล้นแถว ไม่ใช่เมนูคำสั่ง) — ก่อนหน้านี้ทุกหน้าจึง copy markup เมนูไปเอง |
| **โครง API** | `<RowActionMenu items={[{key, icon, label, onClick, disabled, danger}]} ariaLabel size variant minWidth />` |
| **สถานะ** | เข้าเกณฑ์ยกขึ้น DS แล้ว — ถ้ายกควรกวาด `QueueCenterConsolePage` มา alias ด้วยจะได้เหลือชุดเดียว |
| **บันทึกเมื่อ** | 10 ส.ค. 2569 |

---

### 19. CenterStructureEditor (โครงสร้างศูนย์ 3 ระดับ) — 🕐 รอเคสที่ 2

| | |
|---|---|
| **ใช้อยู่ที่** | `src/pages/system/AddCenterPage.jsx` step "แผนกและคลินิก" — 1 ที่ |
| **หน้าที่** | แก้ไขต้นไม้ 3 ระดับ **แผนก → คลินิก → ห้องตรวจ/เตียง** ในฟอร์มเดียว: คลินิกมีเวลาเปิด-ปิดของตัวเอง (3 กลุ่มวัน) หรือใช้ตามเวลาศูนย์ · ห้อง/เตียงผูกกับคลินิก · ทุกระดับทำสำเนาได้จากเมนู ⋮ · เลือกได้ว่าจะใช้รูปแบบนี้กับศูนย์ใดบ้าง (`appliedCenters`) |
| **ทำไมไม่มีของเดิมแทน** | ไม่มี tree-editor ที่แก้ไขได้แบบ nested ใน DS — ของเดิมมีแต่ตาราง/ลิสต์แบนชั้นเดียว |
| **โครง API** | `<CenterStructureEditor departments onDepartmentsChange appliedCenters onAppliedCentersChange centerOptions />` · โมเดลอยู่ที่ `src/data/centerStructure.js` |
| **รอเคสอะไร** | ที่อื่นที่ต้องแก้ลำดับชั้นแบบนี้ — เช่น ผังคลังยา (คลัง → ชั้น → ช่องเก็บ) หรือผังห้องตรวจของระบบนัดหมาย ถ้ามีเคสที่ 2 ควรยกเป็น `NestedTreeEditor` กลางที่รับ schema ต่อระดับ ไม่ใช่ยกตัวนี้ตรง ๆ |
| **บันทึกเมื่อ** | 10 ส.ค. 2569 |

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

### 18. panelKit / panelHooks (ชุดกติกาซ้ำของแฟ้มเวชระเบียน — `GuardedAction` · `ReasonDialog` · `MaskedValue` · `AccessDeniedPanel` · `PanelAlert` · `CountLabel` · `useTreatmentAccess` · `useTreatmentStore` · `paginate`) — 🕐 รอเคสที่ 2

| | |
|---|---|
| **ใช้อยู่ที่** | `src/pages/treat/panels/panelHooks.jsx` (+ `panelKit.jsx` ที่มาก่อน) → panel ทั้ง 11 ตัวใต้ `src/pages/treat/panels/` · `src/pages/treat/ReferralRegisterPage.jsx` · `src/pages/treat/TreatmentInterfacesPage.jsx` — **13 ที่ แต่ทั้งหมดอยู่ในโมดูล §1.4 เดียวกัน จึงยังนับเป็นเคสเดียว** |
| **หน้าที่** | รวมกติกาที่ TOR §1.4 บังคับซ้ำทุกหน้าไว้ที่เดียว: (ก) `GuardedAction` — ปุ่มที่ต้อง **disable + บอกเหตุผล** เมื่อสิทธิ์ไม่พอ ห้ามซ่อนเงียบ · (ข) `ReasonDialog` — กล่องที่บังคับกรอกเหตุผลก่อนยกเลิก/แก้สถานะ · (ค) `MaskedValue` — ปิดบังค่าเป็น `••••` + ปุ่มขอเปิดดูที่บันทึก access log (§1.4.2) · (ง) `useTreatmentAccess` 4 โหมด · (จ) `useTreatmentStore` subscribe + `useEffect` (React 17 — **ห้าม** `useSyncExternalStore`) · (ฉ) `AccessDeniedPanel` / `PanelAlert` / `CountLabel` / `paginate` |
| **ทำไมไม่มีของเดิมแทน** | DS มี `AlertDialog` / `Tooltip` / `SuggestibleTextarea` / `Pagination` เป็นชิ้นส่วนแยกกัน แต่ไม่มีตัวประกอบสำเร็จรูปของกติกาทั้งสาม — ถ้าไม่รวมไว้ที่เดียวต้องเขียนซ้ำ 11 รอบและกติกาจะเพี้ยนกันเอง |
| **เกี่ยวกับรายการที่ 15** | `MaskedValue` คือ **เคสที่ 2 ของ `MaskedIdentifier`** (รายการ 15, `/queue-center` คอลัมน์ HN) — สัญญาเดียวกัน (ปิดบัง → กดเปิด → เขียน log เสมอ) ต่างกันแค่ตัวนี้บังคับกรอกเหตุผล ≥10 ตัวอักษรก่อนเปิด · **ถึงเกณฑ์ยกขึ้น DS แล้ว** ควรทำเป็น `MaskedValue` ตัวเดียวที่รับ `requireReason` แล้วให้ทั้งสองที่เรียกใช้ |
| **โครง API** | `<GuardedAction can reasonWhenDenied>{btn}</GuardedAction>` · `<ReasonDialog open title minChars onConfirm onClose>` · `<MaskedValue value requireReason onReveal>` · `useTreatmentAccess(feature) → { canView, canEdit, canManage }` · `useTreatmentStore(store, selector)` |
| **พฤติกรรมที่ต้องรักษาไว้** | ปุ่มที่สิทธิ์ไม่พอ **ต้อง disable พร้อมเหตุผลผ่าน Tooltip** ห้ามซ่อน (ผู้ใช้ต้องรู้ว่ามีฟังก์ชันนี้อยู่แต่ตัวเองไม่มีสิทธิ์) · ทุกการเปิดดูค่าที่ปิดบังต้องเขียน access log เสมอ ไม่มีทางลัดข้าม · `useTreatmentStore` ต้องคง subscribe + `useEffect` ไว้ตราบที่โปรเจกต์ยังเป็น React 17 |
| **รอเคสอะไร** | โมดูลอื่นที่มีกติกาสิทธิ์+เหตุผล+ข้อมูลลับชุดเดียวกัน — เภสัชกรรม (ยาเสพติด/วัตถุออกฤทธิ์), การเงิน (ยกเลิกใบเสร็จ), เวชระเบียน (แก้ข้อมูลย้อนหลัง), Consent · เคสที่ 2 เมื่อไรควรยกขึ้น DS เป็นตระกูล `Guarded*` / `Masked*` คู่กับ `AuditBar` (รายการ 3) |
| **บันทึกเมื่อ** | 4 ส.ค. 2569 |

---

### 19. GrowthChart (กราฟการเจริญเติบโตพร้อมแถบเปอร์เซ็นไทล์) — 🕐 รอเคสที่ 2

| | |
|---|---|
| **ใช้อยู่ที่** | `src/pages/treat/panels/VaccineGrowthPanel.jsx` (`/treat/record` Step 1 → แท็บวัคซีนและกราฟการเจริญเติบโต) — 1 ที่ |
| **หน้าที่** | TOR 1.4.3.10 — กราฟ 0–18 ปี เลือก น้ำหนัก / ส่วนสูง / เส้นรอบศีรษะ / BMI แยกตามเพศ โดยพล็อตค่าที่วัดจริงทับ **แถบเปอร์เซ็นไทล์** (polygon ระหว่าง p3–p97 / p10–p90 / p25–p75) |
| **ทำไมไม่มีของเดิมแทน** | `Charts.jsx` / `BigCharts.jsx` / `VitalTrendChart` รองรับเส้นแนวโน้มธรรมดา แต่ไม่มีตัวไหนวาดแถบเปอร์เซ็นไทล์ซ้อนใต้จุดที่วัดจริงได้ · เป็น `<svg>` ของข้อมูลสถิติ ไม่ใช่ไอคอน จึงไม่ขัดกฎ icon ของ CLAUDE.md |
| **โครง API** | `<GrowthChart points bands metric sex ageRange />` — `bands[i] = { label:'p3–p97', lower:[…], upper:[…] }`, `points[i] = { ageMonths, value }` |
| **พฤติกรรมที่ต้องรักษาไว้** | จุดเดียวไม่ลากเส้น · ค่าที่หายไประหว่างทางต้อง **ข้ามจุด ไม่ลากทะลุ** (ไม่งั้นอ่านเป็นการเติบโตที่ไม่มีจริง) · อายุเกิน 18 ปีขึ้น state เฉพาะ ไม่ใช่กราฟว่าง · BMI ที่ขาดค่าต้องบอกว่าขาดอะไร |
| **ช่องว่างที่รู้อยู่** | **แถบ percentile เป็นชุดค่าประมาณ ยังไม่ใช่ dataset ทางการของสมาคมต่อมไร้ท่อเด็กและวัยรุ่นไทย** ที่ TOR อ้างถึง — ต้องเปลี่ยนชุดข้อมูลก่อนใช้จริง |
| **รอเคสอะไร** | คลินิกที่ติดตามการเจริญเติบโต — ANC (กราฟน้ำหนักมารดา / การเจริญเติบโตของทารกในครรภ์), คลินิกเด็กดี/วัคซีน, สุขภาพนักเรียน · ถ้ามีเคสที่ 2 ควรยกขึ้น DS **พร้อมกับรายการ 20 (TrendLine)** เป็น component เดียวที่รับ `bands` เป็น optional |
| **บันทึกเมื่อ** | 4 ส.ค. 2569 |

---

### 20. TrendLine (sparkline ผลแล็บที่ระบายสีจุดตาม flag) — 🕐 รอเคสที่ 2

| | |
|---|---|
| **ใช้อยู่ที่** | `src/pages/treat/panels/LabRadiologyResultsPanel.jsx` (`/treat/record` Step 1 → แท็บผลตรวจแล็บ โหมดเปรียบเทียบช่วงเวลา) — 1 ที่ |
| **หน้าที่** | TOR 1.4.3.12 — sparkline ขนาดเล็กต่อ analyte ที่เลือก ระบายสีจุดตาม flag ปกติ / H / L / critical เทียบค่าปกติของรายการนั้น |
| **ทำไมไม่มีของเดิมแทน** | `VitalTrendChart` วาดเส้นสีเดียวและถือว่าทุกค่าเป็นตัวเลข — ตัวนี้ต้องระบายสีรายจุดตาม flag และต้อง **ข้ามค่าที่เป็นข้อความ** (ผลเพาะเชื้อ) โดยไม่วาดกราฟเลย |
| **โครง API** | `<TrendLine series unit />` — `series[i] = { at, value, flag: 'normal'|'high'|'low'|'critical' }`, ค่าที่ไม่ใช่ตัวเลขส่ง `value: null` แล้วผู้เรียกแสดงเป็นข้อความแทน |
| **พฤติกรรมที่ต้องรักษาไว้** | น้อยกว่า 2 ครั้งต้องบอกว่า "ต้องมีอย่างน้อย 2 ครั้ง" ไม่ใช่วาดกราฟจุดเดียว · ค่าวิกฤตต้องเด่นกว่า H/L (คนละสี ไม่ใช่แค่เข้มกว่า) · ค่าที่เป็นข้อความไม่วาดกราฟ |
| **รอเคสอะไร** | ไม่ต้องรอนาน — `/lab/report/:orderId` และหน้า trend ของ `/m/records` เป็นเคสที่รู้อยู่แล้ว · เมื่อยกขึ้น DS ควรรวมกับรายการ 19 (GrowthChart) เป็น component เดียว แล้วให้ `bands` / `flag` เป็น optional prop |
| **บันทึกเมื่อ** | 4 ส.ค. 2569 |

---

### 21. ReferralPrintSheet (ใบส่งตัวผู้รับบริการตามแบบ ศบส.) — 📐 พร้อมออกแบบใน Figma

| | |
|---|---|
| **ใช้อยู่ที่** | `src/pages/treat/ReferralPrintSheet.jsx` → `src/pages/treat/ReferralRegisterPage.jsx` (`/treat/refer` — ตัวอย่างในหน้า + เป้าหมายของ `window.print()`) — 1 ที่ |
| **หน้าที่** | TOR 1.4.6.1 — ใบส่งตัวตามแบบ ศบส. (คู่มือ HCIS §2.5.1): masthead ศูนย์บริการ + 3 บล็อกข้อมูล (ผู้รับบริการ+ที่อยู่+สิทธิ / ต้นทาง-ปลายทาง-ศบส.ที่เรียกเก็บ / ประวัติ-อาการ-ผลตรวจ-การรักษาที่ให้แล้ว-เหตุผลส่งต่อ) + ช่องลายเซ็น 2 ช่อง |
| **ทำไมไม่มีของเดิมแทน** | เหตุผลเดียวกับรายการ 2 และ 6 — DS ไม่มี component สำหรับสื่อกระดาษเลย · ทำตาม pattern `@media print` ของ `XrayReportSheet` แต่เป็นคนละแบบฟอร์ม จึง **คัดลอก pattern ไม่ใช่ alias component** |
| **เกี่ยวกับรายการที่ 2** | นี่คือ **เคสที่ 6 ของ `PrintSheet`** (ต่อจากรังสี 4 แบบ + เวชระเบียน 2 แบบในรายการ 6) — สื่อกระดาษมี 3 โดเมนแล้ว ควรยก `PrintSheet` กลางขึ้น DS ก่อนที่จะมีใบที่ 7 แล้วให้ใบส่งตัวเรียก `variant='referral'` |
| **โครง API** | `<PrintSheet variant='referral' masthead identity>` + `<PrintSheet.Section eyebrow>` + `<PrintSheet.SignatureLine role name license>` — ตัวโดเมนส่งแค่เนื้อหา |
| **พฤติกรรมที่ต้องรักษาไว้** | นับ `printCount` + เขียน audit ทุกครั้งที่พิมพ์ (ไม่ใช่แค่เปิด preview) · ใบที่ยังเป็นร่างต้องแยกออกจากใบที่ส่งแล้วบนกระดาษ · `break-inside: avoid` ทุกบล็อก |
| **ช่องว่างที่รู้อยู่** | **ยังไม่ได้ทดสอบพิมพ์จริงบน Chrome + Safari** — verify ด้วย build แบบ headless เท่านั้น · ไม่มี PDF engine (พิมพ์ผ่าน `@media print` เท่านั้น) |
| **บันทึกเมื่อ** | 4 ส.ค. 2569 |

---

### 22. AppointmentConflictPanel (แผงตรวจการชนทรัพยากรของนัดหมาย) — 🕐 รอเคสที่ 2

| | |
|---|---|
| **ใช้อยู่ที่** | `src/pages/appointment/AppointmentRequestDecisionPopup.jsx` · `src/pages/appointment/AppointmentRecurringPage.jsx` (ผ่าน `evaluateAppointmentConflicts`) · `src/pages/appointment/AppointmentRequestInboxPage.jsx` (re-check ตอนกดยืนยัน) — 3 ที่ แต่เป็นโมดูลนัดหมายทั้งหมด จึงยังนับเป็นเคสเดียว |
| **หน้าที่** | ตรวจ + แสดงเหตุผลที่ "นัดวันเวลานี้ไม่ได้" ครบทุกแกน: แพทย์ซ้อน · ห้องตรวจซ้อน · โควตาคลินิก · โควตาคิวรายวัน · วันหยุดสถานพยาบาล/Resource · นอกช่วงรับนัดล่วงหน้า (`advanceDays`) · สิทธิหมดอายุ — พร้อมทางออก (ค้น Slot ว่างที่เร็วที่สุด / เสนอเวลาใหม่) |
| **ทำไมไม่มีของเดิมแทน** | ประกอบจาก `StatusBadge` + `BrandSubdueButton` เดิมทั้งหมด ไม่ได้สร้าง visual ใหม่ — แต่ตัว "แผงสรุปผลการตรวจกฎหลายชั้นที่แยก block/warn แล้วเสนอ next action" ไม่มีใน DS · `Alert` เป็นข้อความก้อนเดียว ไม่แยกระดับความรุนแรงต่อรายการและไม่มีปุ่มแก้ |
| **โครง API** | `evaluateAppointmentConflicts({ date, time, staffId, doctor, clinic, appointments, ignoreAppointmentId, patientCount, rightsExpiry, needsRoom }) → result` แล้ว `<AppointmentConflictPanel result date time onFindEarliest onPropose compact />` · `CONFLICT_SEVERITY = { BLOCK, WARN }` |
| **พฤติกรรมที่ต้องรักษาไว้** | `BLOCK` ต้อง **ปิดปุ่มยืนยันจริง** ไม่ใช่แค่เตือน (TOR §1.6.1.5) · ต้อง re-evaluate ณ เวลากดยืนยันอีกรอบ ไม่ใช่ตอนเปิดป๊อปอัป — จับเคสคำขอ 2 ใบแย่ง slot เดียวกัน · `result === null` ไม่ render อะไรเลย |
| **รอเคสอะไร** | โมดูลอื่นที่จองทรัพยากรแบบมีโควตา + วันหยุด: `/opd/requests` (ให้ Slot แพทย์ Walk-in), `/xray/order` (นัดตรวจรังสี §1.12.3), `/schedule` (จัดเวรชนวันลา) — เมื่อมีเคสที่ 2 ควรยกเป็น `ResourceConflictPanel` กลางที่รับ rule adapter ไม่ใช่ยกตัวนี้ตรง ๆ |
| **บันทึกเมื่อ** | 4 ส.ค. 2569 |

---

### 23. AppointmentRequestDecisionPopup (ป๊อปอัปตัดสินใจคำขอนัด 3 ทาง) — 🕐 รอเคสที่ 2

| | |
|---|---|
| **ใช้อยู่ที่** | `src/pages/appointment/AppointmentRequestInboxPage.jsx` (`/appointment/requests`) — 1 ที่ |
| **หน้าที่** | หน้าจอเดียวที่เจ้าหน้าที่ตัดสินคำขอนัดจาก mobile/LINE/โทรศัพท์/เคาน์เตอร์: **ยืนยัน** / **ปฏิเสธ** (บังคับเหตุผลจาก master, "อื่น ๆ" ต้องหมายเหตุ ≥10 ตัวอักษร) / **เสนอเวลาใหม่** — โดยเห็นข้อมูลผู้รับบริการ + ผลตรวจการชน + Slot ว่างในจอเดียว |
| **ทำไมไม่มีของเดิมแทน** | ห่อของเดิมทั้งหมด (`Popup` + `PatientCard` + `SuggestibleTextarea` + `Timeslot` + รายการ 22) — แต่ DS ไม่มี pattern "ป๊อปอัปตัดสินใจหลายทางที่แต่ละทางเปลี่ยนชุดฟิลด์ที่ต้องกรอกและเงื่อนไข validate" · `AlertDialog` เป็นยืนยัน/ยกเลิก 2 ทางเท่านั้น |
| **โครง API** | `<AppointmentRequestDecisionPopup open request appointments canManage onClose onConfirm onReject onPropose onFindEarliest />` — decision state (`confirm` \| `reject` \| `propose`) อยู่ภายใน |
| **พฤติกรรมที่ต้องรักษาไว้** | เปลี่ยนทางเลือกแล้วต้องล้าง error ของทางเดิม แต่ **ไม่ล้างค่าที่กรอกไว้** · คำขอ "ไม่ระบุแพทย์" ยืนยันไม่ได้จนกว่าจะเลือกแพทย์จริง (§1.6.2.3) · `canManage=false` → read-only ทั้งใบ ไม่ใช่ซ่อนป๊อปอัป |
| **รอเคสอะไร** | คิวคำขอที่ต้องอนุมัติแบบเดียวกัน: `/consent/access` (คำขอสิทธิเข้าถึง) · `/opd/requests` (คำขอ Walk-in) · `/pharmacy/requisition` (ใบเบิก) — เคสที่ 2 คือเมื่อหน้าใดหน้าหนึ่งต้องการ 3 ทางเลือกพร้อม validate ต่างกัน |
| **บันทึกเมื่อ** | 4 ส.ค. 2569 |

---

### 24. AppointmentRecurrenceBuilder (ตัวสร้างกติกานัดซ้ำ) — 🕐 รอเคสที่ 2

| | |
|---|---|
| **ใช้อยู่ที่** | `src/pages/appointment/AppointmentRecurringPage.jsx` (`/appointment/recurring`) — 1 ที่ |
| **หน้าที่** | ประกอบกติกานัดต่อเนื่อง: ทุก N วัน / ทุกสัปดาห์ (เลือกวันในสัปดาห์) · จำนวนครั้ง หรือ จบเมื่อถึงวันที่ · พรีวิววันที่ที่จะเกิดจริงก่อนบันทึก |
| **ทำไมไม่มีของเดิมแทน** | ประกอบจาก `Select` · `DatePicker` · `InputField` · `Fields` เดิม — แต่ DS ไม่มี "ตัวแก้ recurrence rule" เลย และตรรกะ `buildOccurrenceDates` / `validateRecurrence` เป็นของที่ต้องแชร์ ไม่ใช่ของหน้าจอ |
| **โครง API** | `<AppointmentRecurrenceBuilder value onChange disabled />` + helper ที่ export คู่กัน: `DEFAULT_RECURRENCE` · `validateRecurrence(cfg)` · `buildOccurrenceDates(cfg)` · `describeRecurrence(cfg)` · `RECURRENCE_MODES` / `END_MODES` / `INTERVAL_PRESETS` / `WEEKDAY_OPTIONS` · ขอบเขต `RECURRENCE_MIN/MAX_INTERVAL` (1–180 วัน), `RECURRENCE_MIN/MAX_COUNT` (1–52 ครั้ง) |
| **พฤติกรรมที่ต้องรักษาไว้** | เพดาน 52 ครั้ง / 180 วัน กันสร้างนัดหลุด · `buildOccurrenceDates` ต้อง pure (หน้าอื่นเรียกเพื่อพรีวิวโดยไม่บันทึก) · โหมดรายสัปดาห์ที่ไม่ติ๊กวันใดเลย = invalid ไม่ใช่ "ทุกวัน" |
| **รอเคสอะไร** | ของอื่นที่เกิดซ้ำตามกติกา: `/schedule` (รูปแบบเวรประจำสัปดาห์) · `/pharmacy/registry` (ยาที่ต้องรับซ้ำ) · `/clinic/ncd/followup` (ตารางติดตามโรคเรื้อรัง) — เคสที่ 2 ควรยกเป็น `RecurrenceBuilder` กลางที่ไม่ผูกคำว่า "นัด" |
| **บันทึกเมื่อ** | 4 ส.ค. 2569 |

---

### 25. AppointmentNotifyLogTable (ตารางบันทึกการแจ้งเตือนขาออก) — 🕐 รอเคสที่ 2

| | |
|---|---|
| **ใช้อยู่ที่** | `src/pages/appointment/AppointmentSettingsPage.jsx` แท็บ "บันทึกการแจ้งเตือน" (`/appointment/settings`) — 1 ที่ |
| **หน้าที่** | ทะเบียนข้อความขาออกทุกฉบับ (push / LINE / SMS) พร้อมสถานะส่งสำเร็จ-ไม่สำเร็จ · ปุ่มส่งซ้ำรายแถว · ค้นหา + กรองช่องทาง/สถานะ · พิมพ์/ส่งออก |
| **ทำไมไม่มีของเดิมแทน** | ประกอบจาก `Table` + `Pagination` + `PrimarySearch` + `FilterTag` เดิม — แต่ "ตาราง outbound message log ที่มี retry ต่อแถว" ไม่มีใน DS และจะซ้ำทันทีที่ระบบอื่นเริ่มส่งข้อความ |
| **โครง API** | `<AppointmentNotifyLogTable canManage />` (อ่านจาก `appointmentNotifyStore` เอง) + `printNotifyLog(rows)` · ถ้ายกขึ้น DS ต้องเปลี่ยนเป็น `<MessageLogTable rows onRetry channels />` ที่รับข้อมูลจากภายนอกแทนการอ่าน store ตรง |
| **พฤติกรรมที่ต้องรักษาไว้** | แถวที่ส่งไม่สำเร็จต้องเด้งเป็น badge เตือนบนหน้าหลักด้วย ไม่ใช่ซ่อนอยู่ในแท็บ · ส่งซ้ำต้อง **append แถวใหม่** ไม่ทับของเดิม (log ต้องเป็น append-only) · `canManage=false` → ยังดูได้แต่กดส่งซ้ำไม่ได้ |
| **รอเคสอะไร** | ระบบอื่นที่ส่งข้อความออก: แจ้งผลแล็บวิกฤต (§1.15.6) · แจ้งเตือนคิว (`/queue-center`) · แจ้งเตือนยาใกล้หมดอายุ — เคสที่ 2 ยกเป็น `MessageLogTable` กลาง |
| **ช่องว่างที่รู้อยู่** | mock ล้วน — ไม่มี provider Push/LINE/SMS จริง (TOR 4.2.5 ยังเป็น `partial`) |
| **บันทึกเมื่อ** | 4 ส.ค. 2569 |

---

### 26. AppointmentCapacityBar (แถบความจุคิวรายวัน + Available/Non-available) — 🕐 รอเคสที่ 2

| | |
|---|---|
| **ใช้อยู่ที่** | `src/pages/appointment/AppointmentPage.jsx` (slot `belowSummary` ของ `/appointment`) — 1 ที่ |
| **หน้าที่** | TOR §1.6.2.8 — แถบ 14 วันข้างหน้า บอกจำนวนที่นัดแล้ว/โควตา + ป้าย Available / Non-available พร้อม**เหตุผล**ที่ไม่ว่าง (เต็มโควตา / วันหยุด / ปิดรับนัด) กดเลือกวันแล้วกรองตารางตาม |
| **ทำไมไม่มีของเดิมแทน** | ประกอบจาก `StatusBadge` + `NeutralSubdueButton` เดิม — DS ไม่มี "แถบเลือกวันที่พร้อมตัวชี้วัดความจุ" · `SummaryCardsBar` เป็นตัวเลขสรุปนิ่ง ไม่ใช่ตัวเลือกช่วงวัน · `DatePicker` เลือกวันได้แต่ไม่บอกว่าวันไหนเต็ม |
| **โครง API** | `<AppointmentCapacityBar appointments staffId days={14} selectedDate onSelectDate onOpenSettings />` |
| **พฤติกรรมที่ต้องรักษาไว้** | Non-available ต้องบอกเหตุผลเสมอ ไม่ใช่แค่ป้ายแดง (ผู้ใช้ต้องรู้ว่าแก้ที่ไหน → `onOpenSettings`) · โควตา 0 = ปิดรับนัด ต่างจากโควตาเต็ม · re-render เมื่อ store โควตาเปลี่ยน (React 17 subscribe + `setTick`) |
| **รอเคสอะไร** | หน้าที่ต้องเลือกวันโดยเห็นความจุก่อน: `/opd/room-config` (โควตาต่อหน่วยบริการ) · `/xray/order` (นัดตรวจรังสี) · `/m/book` (ฝั่งผู้รับบริการ) — เคสที่ 2 ยกเป็น `CapacityDateStrip` กลาง |
| **บันทึกเมื่อ** | 4 ส.ค. 2569 |

---

### 27. AppointmentNotArrivedView (มุมมองนัดวันนี้ที่ยังไม่มาติดต่อ) — 🕐 รอเคสที่ 2

| | |
|---|---|
| **ใช้อยู่ที่** | `src/pages/appointment/AppointmentPage.jsx` แท็บ "ยังไม่มาติดต่อวันนี้" (`/appointment`) — 1 ที่ |
| **หน้าที่** | รายการนัดของวันนี้ที่ยังไม่มีการมาติดต่อ + บันทึก "ไม่มาตามนัด" พร้อมเหตุผลและเวลา (เขียน audit) + แผงอ้างอิง read-only จากศูนย์บริหารคิว |
| **ทำไมไม่มีของเดิมแทน** | ประกอบจาก `Table` + `AlertDialog` + `Select` เดิม — แต่ "มุมมองรายการที่ควรเกิดแต่ยังไม่เกิด + ปุ่มปิดสถานะพร้อมเหตุผลบังคับ" ไม่มีใน DS |
| **โครง API** | `selectNotArrivedToday(appointments) → rows` (pure) + `<AppointmentNotArrivedView appointments canManage onMarkNoShow onOpenDetail />` |
| **พฤติกรรมที่ต้องรักษาไว้** | ตารางหลัก derive จากข้อมูลของโมดูลนัดหมายเอง · แผง `queueCenterStore.getAppointmentsNotArrived()` เป็น **read-only ที่ติดป้ายว่าเป็นคนละชุดข้อมูล** ห้าม join หรือเขียนกลับ (mock 5 แถว ไม่มีฟิลด์ `date`, HN/แพทย์คนละชุดกับ `INITIAL_APPOINTMENTS`) · เหตุผลไม่มาตามนัดเป็น master ไม่ใช่ free text ล้วน |
| **รอเคสอะไร** | หน้าอื่นที่มี "รายการค้างของวันนี้" ที่ต้องปิดพร้อมเหตุผล: `/lab/queue` (สั่งตรวจแล้วไม่มาเจาะ) · `/pharmacy/queue` (จ่ายยาแล้วไม่มารับ) · `/xray/queue` (นัดถ่ายแล้วไม่มา) — เคสที่ 2 ยกเป็น `NoShowWorklist` กลาง |
| **บันทึกเมื่อ** | 4 ส.ค. 2569 |

---

### 28. AppointmentMoreMenu (เมนู "เพิ่มเติม" ยุบทางเข้ารอง) — 🚧 ควรทำเป็น Menu/Popover จริงใน DS

| | |
|---|---|
| **ใช้อยู่ที่** | `src/pages/appointment/AppointmentPage.jsx` (action bar ของ `/appointment`) — 1 ที่ |
| **หน้าที่** | ยุบทางเข้ารอง 3 ทาง (นัดต่อเนื่อง · รูปแบบการนัดหมาย · ตั้งค่าระบบนัดหมาย) ไว้ปุ่มเดียว เพื่อให้ action bar เหลือ CTA หลักชุดเดียว |
| **ทำไมไม่มีของเดิมแทน** | `design.md` §6 ไม่มี dropdown-menu กลาง — มีแต่ `OverflowFlexRow` ที่ซ่อนรายการ**ตามความกว้างที่เหลือ** ซึ่งเป็นคนละพฤติกรรม (ยุบโดยตั้งใจ vs ยุบเพราะพื้นที่ไม่พอ) · ตัวนี้ประกอบจาก `NeutralSubdueButton` + `ActionList` เดิม ไม่ได้สร้าง visual ใหม่ |
| **โครง API** | ตอนนี้ `<AppointmentMoreMenu items label='เพิ่มเติม' />` — **ถ้ายกขึ้น DS ห้ามยกตัวนี้ตรง ๆ** ควรทำเป็น `Menu` / `Popover` จริงที่มี focus trap · ปิดด้วย `Esc` · `aria-expanded` / `aria-controls` · วางตำแหน่งแบบหลบขอบจอ ซึ่งตัวปัจจุบันยังไม่มีครบ |
| **พฤติกรรมที่ต้องรักษาไว้** | รายการในเมนูต้องเป็น**ทางเข้ารอง**เท่านั้น — CTA หลัก (คำขอนัด N · ตารางเวรแพทย์ · +สร้างนัด) ห้ามยุบเข้ามา · ทุกปลายทางต้องเข้าถึงได้จากเมนู Sidebar ด้วย ไม่ใช่ทางนี้ทางเดียว |
| **รอเคสอะไร** | ไม่ต้องรอเคสที่ 2 ในแง่ความต้องการ — action bar ที่ล้นมีทั่วระบบ (`/treat/record`, `/pharmacy/dispense`, `/queue-center`) สิ่งที่รอคือ**การออกแบบ `Menu` ใน Figma** ให้ครบ state + a11y ก่อน แล้วค่อยให้ทุกที่ alias |
| **บันทึกเมื่อ** | 4 ส.ค. 2569 |

---

### 29. TelemedEmrPanel (แฟ้มผู้รับบริการย่อ + แผงประเมินในสายวิดีโอ) — 🕐 รอเคสที่ 2

| | |
|---|---|
| **ใช้อยู่ที่** | `src/pages/telemed/TelemedConsultPage.jsx` (right panel แท็บ "EMR / ประเมิน") — 1 ที่ |
| **หน้าที่** | ย่อแฟ้มเวชระเบียนให้อ่านได้ในคอลัมน์กว้าง 360px ระหว่างสาย: visit ล่าสุด · ยาเดิม · แพ้ยา · โรคประจำตัว · LAB · X-ray · นัดหมาย · RPM 7 วัน + สลับเป็นโหมด "ประเมิน" เพื่อบันทึกอาการ/วินิจฉัย/แผน + สัญญาณชีพ ตามสิทธิ์ของบทบาท (TOR §1.13.1–.2, §1.13.6) |
| **ทำไมไม่มีของเดิมแทน** | `PatientSummaryCard` / `VitalsSignHorizontalPanel` / แผงใน `src/pages/treat` ออกแบบสำหรับหน้าเต็มความกว้าง — วางในคอลัมน์ 360px แล้วตารางล้น · DS ไม่มี "แฟ้มย่อ + ฟอร์มบันทึกในแผงเดียวที่สลับโหมดได้" |
| **โครง API** | `<TelemedEmrPanel hn patientName visitId role onOpenTreatmentRecord onRequestAccess onSaveAssessment gis />` — โหมด `emr` / `assess` เป็น state ภายใน, สิทธิ์อ่าน-แก้มาจาก `telemedCan(role, …)` |
| **พฤติกรรมที่ต้องรักษาไว้** | ทุกพาเนลมี empty state ของตัวเอง (ไม่ยุบหายไปเงียบ ๆ) · บทบาทที่ไม่มีสิทธิ์เห็นแผง "สิทธิ์ไม่พอ" + ปุ่มขอสิทธิ์ แทนที่จะซ่อนแท็บ · การบันทึกประเมินต้อง validate ก่อนและคืนค่าให้ผู้เรียกเก็บ audit เอง |
| **รอเคสอะไร** | จอแคบอื่นที่ต้องอ่านแฟ้มระหว่างทำงานอย่างอื่น — PiP ของสาย, แผงข้างของ CPOE, มือถือฝั่งบุคลากร, เยี่ยมบ้าน — เคสที่ 2 เมื่อไรควรยกขึ้น DS เป็น `CompactPatientChart` ที่รับ adapter ของแหล่งข้อมูล ไม่ผูกกับ mock ของ telemed |
| **ช่องว่างที่รู้อยู่** | ข้อมูลยัง mock ผูก HN 2 ราย (67-00007, 67-00001) — ยังไม่ได้อ่าน chart จริงจาก PHCIS |
| **บันทึกเมื่อ** | 4 ส.ค. 2569 |

---

### 30. TelemedOrderStrip (แถบสั่งการรักษาระหว่างสาย) — 🕐 รอเคสที่ 2

| | |
|---|---|
| **ใช้อยู่ที่** | `src/pages/telemed/TelemedConsultPage.jsx` (right panel แท็บ "คำสั่ง") · `src/pages/telemed/TelemedAssessmentPage.jsx` (ขั้นที่ 4) — 2 ที่ แต่เป็น flow เดียวกัน (สั่งการรักษาของ telemed) จึงยังนับเป็นเคสเดียว |
| **หน้าที่** | สั่งยา / LAB / X-ray / ปรึกษาภายใน / ส่งต่อภายนอก จากแถบเดียวระหว่างวิดีโอคอล แล้วเขียนกลับเข้า visit ให้ฝั่งมือถือกดรับทราบ + ยกเลิกคำสั่งพร้อมเหตุผล (TOR §4.3.3) |
| **ทำไมไม่มีของเดิมแทน** | DS ไม่มี "order bar" — CPOE เดิมเป็นหน้าเต็มใน `src/pages/treat` ซึ่งโมดูลนี้ import ข้ามไม่ได้ตาม playbook §4 · `XrayOrderPicker` / `LabOrderPicker` (รายการ #3) เป็นตัวเลือกรายการต่อชนิด ไม่ใช่แถบรวม 5 ชนิดในที่แคบ |
| **โครง API** | `<TelemedOrderStrip orders role onAddOrder onCancelOrder compact />` — ถ้ายกขึ้น DS ควรรับ catalog adapter ชุดเดียวกับ `OrderPicker` ที่เสนอไว้ในรายการ #3 แทนการฝังแคตตาล็อก |
| **พฤติกรรมที่ต้องรักษาไว้** | ยกเลิกต้องกรอกเหตุผลทุกครั้ง (validate ก่อนปิด) และขึ้นสถานะ "ยกเลิกโดยแพทย์" ไม่ใช่ลบแถว · บทบาทที่ไม่มีสิทธิ์สั่งเห็นเหตุผลที่ถูกปฏิเสธ (`telemedDenyReason`) ไม่ใช่ปุ่มที่กดแล้วเงียบ |
| **รอเคสอะไร** | จุดสั่งการรักษาที่ไม่ใช่หน้า CPOE เต็ม — เยี่ยมบ้าน, หน่วยแพทย์เคลื่อนที่, ห้องสังเกตอาการ — เคสที่ 2 เมื่อไรควรยกขึ้นเป็น `OrderStrip` กลาง |
| **ช่องว่างที่รู้อยู่** | ใช้แคตตาล็อกย่อใน `src/data/telemedVisits.js` ยังไม่เชื่อม `medicationCatalog` / `labCatalog` / xray กลาง |
| **บันทึกเมื่อ** | 4 ส.ค. 2569 |

---

### 31. TelemedRpmSparkline (micro-viz แนวโน้มค่าจากอุปกรณ์ที่บ้านในเซลล์ตาราง) — 🕐 รอเคสที่ 2

| | |
|---|---|
| **ใช้อยู่ที่** | `src/pages/telemed/TelemedRpmBoardPage.jsx` (คอลัมน์ "แนวโน้ม 7 วัน" + การ์ดใน grid view) · `src/components/telemed/TelemedEmrPanel.jsx` — 2 ที่ แต่ทั้งคู่อยู่ในโมดูล RPM เดียวกัน จึงยังนับเป็นเคสเดียว |
| **หน้าที่** | เส้นแนวโน้ม 7 จุดสูง 40px ในเซลล์ตาราง บอกทิศทางค่าที่ผู้รับบริการวัดเองที่บ้าน + ย้อมจุดที่หลุดเกณฑ์ (TOR §1.13.1) |
| **ทำไมไม่มีของเดิมแทน** | `VitalTrendChart` รองรับเฉพาะ parameter `bp/pulse/spo2/temp/rr` ตาม `SINGLE_SERIES_CONFIG` (ไม่มี DTX mg/dL) และวาดกราฟสูง ~300px พร้อมแกน + legend + tooltip — ใส่ในเซลล์ตารางไม่ได้ · `TrendLine` (รายการ #20) เป็น sparkline ของผลแล็บที่ระบายจุดตาม flag ของแล็บโดยเฉพาะ |
| **โครง API** | `<TelemedRpmSparkline points width height stroke isBreach ariaLabel />` — `points` เป็นตัวเลขล้วน, `isBreach(value, index)` ตัดสินจุดที่ต้องย้ำ |
| **พฤติกรรมที่ต้องรักษาไว้** | ไม่มีแกน/legend/tooltip โดยตั้งใจ (เป็น micro-viz ไม่ใช่กราฟ) · ต้องมี `ariaLabel` เสมอเพราะ SVG ไม่มีข้อความ · จุดเดียว/ไม่มีจุด ต้องไม่พังเลย์เอาต์ของเซลล์ |
| **รอเคสอะไร** | ควรยุบรวมกับ `TrendLine` (รายการ #20) เป็น `Sparkline` ตัวเดียวใน DS ที่รับ `points` + `pointTone(value)` — สองรายการนี้คือ component เดียวกันที่มาจากคนละโมดูล |
| **บันทึกเมื่อ** | 4 ส.ค. 2569 |

---

### 32. LabCriticalLogPanel (ทะเบียนค่าวิกฤต + นาฬิกาอายุการแจ้ง) — 🕐 รอเคสที่ 2

| | |
|---|---|
| **ใช้อยู่ที่** | `src/pages/lab/LabQueuePage.jsx` (drawer เปิดจากปุ่ม "ทะเบียนค่าวิกฤต" บนแถบเครื่องมือ) — 1 ที่ |
| **หน้าที่** | ทะเบียนผลที่เข้าเกณฑ์ค่าวิกฤตตาม TOR §1.15.3.2 — รายการค่าวิกฤตที่ยังไม่มีใครรับทราบ + นาฬิกานับอายุการแจ้งต่อรายการ + ฟอร์มกดรับทราบที่บังคับระบุชื่อผู้รับทราบและช่องทางที่แจ้ง |
| **ทำไมไม่มีของเดิมแทน** | ประกอบจาก `Popup` + `Table` + `Badge` + `Select` + `SuggestibleTextarea` ที่มีอยู่ทั้งหมด แต่ตรรกะ escalate เมื่อเกิน 30 นาทีและการนับอายุสดเป็นของโมดูลนี้ — ไม่มี component ใดใน DS ที่เป็น "ทะเบียนที่ต้องปิดด้วยการรับทราบภายในเวลา" |
| **โครง API** | `<LabCriticalLogPanel open onClose entries onAcknowledge escalateAfterMinutes />` — `onAcknowledge({ id, acknowledgedBy, channel, note, at })` ให้ผู้เรียกเขียน audit เอง |
| **พฤติกรรมที่ต้องรักษาไว้** | ไม่มีค่าวิกฤต = empty state โทน **success** (ไม่ใช่โทนกลาง — "ไม่มีอะไรต้องแจ้ง" คือข่าวดี) · นาฬิกาเดินสดไม่ใช่ค่านิ่ง · รับทราบแล้วยังลบไม่ได้ ต้องคงไว้เป็นประวัติ |
| **รอเคสอะไร** | จุดอื่นที่ต้อง "แจ้งแล้วต้องมีคนรับทราบภายในเวลา" — รังสี (ผิดปกติเร่งด่วน §1.12.6.9), ระบบสังเกตอาการ (สัญญาณชีพวิกฤต), CPOE (CDSS ที่แพทย์ override) — เคสที่ 2 เมื่อไรควรยกขึ้นเป็น `AcknowledgeLog` กลาง |
| **ช่องว่างที่รู้อยู่ (ขอให้ DS แก้)** | สเปกเดิมให้ทำเป็น summary card "ค่าวิกฤต" ที่กดได้ แต่ `SummaryCardsBar` (`src/components/layout/`) ไม่มี prop `onClick` จึงต้องย้ายไปเป็นปุ่มบนแถบเครื่องมือแทน — **ถ้า DS เพิ่ม `onClick`/`href` ต่อการ์ดใน `SummaryCardsBar` เมื่อไร ควรย้ายกลับ** · การกดรับทราบควรไปโผล่ในหน้าจอแพทย์ (`src/pages/treat`) ด้วย แต่ wave นี้แตะไม่ได้ จึงวางทะเบียนไว้ฝั่งแล็บเป็น workaround โดยเจตนา |
| **บันทึกเมื่อ** | 5 ส.ค. 2569 |

---

### 33. LabReceiptFormPopup (ฟอร์มรับสิ่งส่งตรวจ 4 ทางเลือกการจัดการ) — 🕐 รอเคสที่ 2

| | |
|---|---|
| **ใช้อยู่ที่** | `src/pages/lab/LabReceivePage.jsx` (row action + แถบทำงานหลายรายการ) — 1 ที่ |
| **หน้าที่** | ฟอร์มรับสิ่งส่งตรวจตามคู่มือระบบชันสูตรโรค §2.1.2/2.1.4/2.1.5/2.1.6 — เลือก disposition 4 ทาง (รับ / รับแบบมีเงื่อนไข / ปฏิเสธ / ขอเก็บใหม่) พร้อม validation ตาม `validateReceiptDraft` และรับได้ทั้งรายการเดียวและหลายรายการพร้อมกัน |
| **ทำไมไม่มีของเดิมแทน** | `Popup` + `RadioGroup` + `Select` มีอยู่แล้วและถูกใช้ประกอบ แต่ DS ไม่มี "ฟอร์มรับของที่แตกสาขาตามผลการตรวจรับ" — และแยกออกมาเพื่อไม่ให้หน้า worklist บวมแบบ `LabQueuePage` (84 KB) |
| **โครง API** | `<LabReceiptFormPopup open rows stage onSubmit onClose mode="receive\|amend" />` — `onSubmit(draft)` ส่งต่อให้ `applyReceipt` / `amendReceipt` ของ `labReceive.js` |
| **พฤติกรรมที่ต้องรักษาไว้** | error เป็น inline ต่อฟิลด์ ไม่ใช่ toast รวม · ทุก disposition ที่ไม่ใช่ "รับปกติ" บังคับเหตุผล · แก้ไข/ยกเลิกใบรับต้องมีเหตุผลเช่นกัน (ครบ 4 กริยา แสดง/บันทึก/แก้ไข/ยกเลิก) |
| **รอเคสอะไร** | จุดรับของอื่นที่มี disposition แตกสาขา — คลังยา (รับเข้าคลัง: รับ/รับบางส่วน/ปฏิเสธล็อต), รังสี (รับ/ปฏิเสธคำขอตรวจ) — เคสที่ 2 เมื่อไรควรยกขึ้นเป็น `DispositionFormPopup` ที่รับ options + validator |
| **บันทึกเมื่อ** | 5 ส.ค. 2569 |

---

### 34. LabSendOutFormPopup (ยืนยันส่งคำขอไปหน่วยงานภายนอก) — 🕐 รอเคสที่ 2

| | |
|---|---|
| **ใช้อยู่ที่** | `src/pages/lab/LabSendOutPage.jsx` (แถบเลือกรายการ) — 1 ที่ |
| **หน้าที่** | ยืนยันส่งคำขอไปหน่วยงานภายนอกตามหน้าจอระบบเดิม §2.1.3 — เลือกหน่วยงานจาก `LAB_EXTERNAL_LABS` + เหตุผล + ผู้นำส่ง + วันคาดว่าจะได้ผล (คำนวณจาก `turnaroundDays`) พร้อมสรุปแยกตามประเภทงานและรวมจำนวนสิ่งส่งตรวจก่อนกดยืนยัน |
| **ทำไมไม่มีของเดิมแทน** | เป็น confirm dialog ที่มี "สรุปยอดแยกกลุ่ม + คำนวณวันที่คาดการณ์" อยู่ในตัว — `AlertDialog` ของ DS รับได้แค่ข้อความ ไม่ใช่ตารางสรุป |
| **โครง API** | `<LabSendOutFormPopup open rows vendors onConfirm onClose />` — `onConfirm(draft)` ส่งต่อให้ `confirmSendOut` ของ `labSendOuts.js` |
| **พฤติกรรมที่ต้องรักษาไว้** | ต้องเห็นยอดรวมสิ่งส่งตรวจ (ไม่ใช่ยอดรายการตรวจ) ก่อนยืนยัน เพราะหลอดคือของที่ต้องนับตอนแพ็ก · ยกเลิกการส่งต้องมีเหตุผลและคืนสถานะเดิม |
| **รอเคสอะไร** | จุดอื่นที่ส่งงานออกนอกหน่วย — รังสี (ส่งอ่านผลภายนอก / teleradiology), การส่งต่อผู้รับบริการ — เคสที่ 2 เมื่อไรควรยกขึ้นพร้อม `LabReceiptFormPopup` เป็นตระกูลเดียวกัน |
| **บันทึกเมื่อ** | 5 ส.ค. 2569 |

---

### 35. LabSendOutManifest (ใบนำส่งสิ่งส่งตรวจไปหน่วยงานภายนอก) — 📐 พร้อมออกแบบใน Figma

| | |
|---|---|
| **ใช้อยู่ที่** | `src/pages/lab/LabSendOutPage.jsx` (preview + เป้าหมายการพิมพ์) — 1 ที่ แต่เป็นตระกูลเดียวกับ `LabCollectionReport` และ `LabPatientReport` ที่มีอยู่แล้ว |
| **หน้าที่** | เอกสารกระดาษ (หน่วย mm, ขาว-ดำ, ช่องลงชื่อผู้ส่ง/ผู้รับ) ที่เดินทางไปกับกล่องสิ่งส่งตรวจ — รายการหลอดแยกตามหน่วยงานปลายทาง + เลขใบนำส่ง |
| **ทำไมไม่มีของเดิมแทน** | เหตุผลเดียวกับรายการ #2 (`XrayReportSheet`) — DS ไม่มี component สำหรับสื่อกระดาษเลย ไม่มีอะไรที่คุม `@page` / การไม่แบ่งหน้ากลางบล็อก / ลำดับสายตาแบบเอกสารราชการ |
| **โครง API** | ควรเป็น variant ของ `PrintSheet` ที่เสนอไว้ในรายการ #2: `<PrintSheet variant="manifest" masthead identity>` + `<PrintSheet.SignatureLine role name license>` — ตัว domain ส่งแค่เนื้อหา |
| **พฤติกรรมที่ต้องรักษาไว้** | **พิมพ์เฉพาะชื่อกลุ่มตรวจ ไม่พิมพ์ชื่อรายการตรวจและไม่พิมพ์ชื่อผู้ป่วย** ตาม §1.15.6.4 (ใบนี้ออกนอกหน่วยงาน) · ช่องลงชื่อผู้ส่ง/ผู้รับต้องอยู่หน้าสุดท้ายเสมอ |
| **รอเคสอะไร** | ไม่ต้องรอเคสแล้ว — นับรวมกับ `XrayReportSheet` (#2), `ReferralPrintSheet` (#21), เอกสารเวชระเบียน (#6) เป็น 4 โมดูลที่ต้องการ `PrintSheet` ตัวเดียวกัน ควรออกแบบรวดเดียว |
| **บันทึกเมื่อ** | 5 ส.ค. 2569 |

---

### 36. LabQcRunPopup (บันทึกรอบควบคุมคุณภาพ + Levey-Jennings strip) — 🕐 รอเคสที่ 2

| | |
|---|---|
| **ใช้อยู่ที่** | `src/pages/lab/LabInterfacePage.jsx` (แท็บเครื่องตรวจวิเคราะห์) — 1 ที่ |
| **หน้าที่** | บันทึกผลรอบ IQC ต่อเครื่อง/ต่อระดับควบคุม พร้อม Levey-Jennings strip (SVG) และคำนวณ z-score สดขณะพิมพ์ — ใช้ gate การนำเข้าผลอัตโนมัติ (QC ไม่ผ่าน = เครื่องนั้นส่งผลเข้าระบบไม่ได้จนกว่าจะ rerun หรือ override พร้อมเหตุผล) |
| **ทำไมไม่มีของเดิมแทน** | `VitalTrendChart` เป็นกราฟสัญญาณชีพที่มีแกน + legend + tooltip สูง ~300px และผูก parameter ทางคลินิก — Levey-Jennings ต้องการเส้น ±1SD/±2SD/±3SD คงที่กับกฎ Westgard ซึ่งไม่ใช่ของที่ DS มี |
| **โครง API** | `<LabQcRunPopup open analyzer level history onSubmit onClose />` — `onSubmit({ value, lotNo, runBy, note })` คืน z-score ที่คำนวณให้ผู้เรียกเก็บเอง |
| **พฤติกรรมที่ต้องรักษาไว้** | z-score ต้องอัปเดตระหว่างพิมพ์ ไม่ใช่หลังกดบันทึก (คนกรอกต้องเห็นทันทีว่าค่าหลุด) · override ต้องบังคับเหตุผล + ผู้อนุมัติ · strip แสดงย้อนหลังพอให้เห็น trend ไม่ใช่จุดเดียว |
| **รอเคสอะไร** | งานที่มีการสอบเทียบ/ควบคุมคุณภาพเครื่องมืออื่น — รังสี (QA เครื่องเอกซเรย์), เครื่องวัดสัญญาณชีพที่ต้องสอบเทียบ — เคสที่ 2 เมื่อไรควรยกเฉพาะ **strip** ขึ้นเป็น `ControlChart` ส่วนตัวป๊อปอัปให้อยู่ที่โมดูล |
| **บันทึกเมื่อ** | 5 ส.ค. 2569 |

---

### 37. LabAnalyzerQcPanel · LabInterfacePanels (`LabCodeMappingPanel` · `LabMessageQueuePanel`) — 🚧 ไม่ใช่ของกลาง — แยกไฟล์ตามขนาด ไม่ใช่ candidate ของ DS

| | |
|---|---|
| **ใช้อยู่ที่** | `src/pages/lab/LabInterfacePage.jsx` แท็บ 2 / 3 / 4 — ทั้งสามไฟล์มีผู้ใช้ที่เดียวคือหน้าเดียวกัน |
| **หน้าที่** | panel เนื้อในของแท็บ: ทะเบียนเครื่องตรวจวิเคราะห์ + ประเภทการรายงานผล (`LabAnalyzerQcPanel`) · ตารางจับคู่รหัสรายการตรวจ ↔ TMLT (`LabCodeMappingPanel`) · คิวข้อความ ORM/ORU ของ LIS (`LabMessageQueuePanel`) |
| **ทำไมลงทะเบียนไว้ทั้งที่ไม่ควรยกขึ้น DS** | ลงทะเบียนเพื่อความครบถ้วนของทะเบียน แต่ระบุตรง ๆ ว่า **เหตุผลที่แยกไฟล์คือคุมขนาด `LabInterfacePage` (1065 → 604 บรรทัด) ไม่ใช่เพราะเป็น UI ใหม่** — เนื้อในประกอบจาก `Table` / `Badge` / `Select` / `FilterDropdown` ของ DS ล้วน ไม่มี primitive ใหม่ |
| **ถ้าจะยกขึ้น DS จริง ควรยกอะไร** | ไม่มีอะไรจากสามตัวนี้ — สิ่งที่ควรยกคือ "ตารางจับคู่รหัสสองระบบพร้อมสถานะ mapped/unmapped/conflict" ถ้ามีโมดูลที่ 2 ที่ต้อง map รหัส (ICD-10 ↔ SNOMED ใน EMR, รหัสยา ↔ TMT ในเภสัช) — ตอนนั้นค่อยออกแบบเป็น `CodeMappingTable` จาก 2 เคสพร้อมกัน |
| **บันทึกเมื่อ** | 5 ส.ค. 2569 |

---

### 38. ConfidentialMask (empty-state ข้อมูลลับ §1.4.2) — 📐 มี 2 ผู้ใช้แล้ว พร้อมยกขึ้น DS

| | |
|---|---|
| **ใช้อยู่ที่** | `MentalHealthSteps.jsx` (ConfidentialMask ของตัวเอง) · `src/pages/clinic/family-planning/FamilyPlanningSteps.jsx` (`FpConfidentialMask` — S4 ตรวจสตรี เมื่อสิทธิ์ไม่พอ) — **2 ที่ ประกาศซ้ำกันคนละไฟล์** |
| **หน้าที่** | empty-state "ข้อมูลลับ — สิทธิ์ของคุณไม่เพียงพอ" ตาม TOR §1.4.2 สำหรับ section ที่ต้อง gate ตามสิทธิ์ (จิตเวช, ตรวจภายใน, HIV) |
| **ทำไมควรยกขึ้น DS** | เข้าเกณฑ์ผู้ใช้ ≥2 ที่แล้ว และจะโตต่อ (HIV/STI §1.4.2, สังคมสงเคราะห์) — ควรรวมเป็น `<ConfidentialMask reason onRequestAccess>` กลางตัวเดียว แล้วให้ 2 ที่เดิม alias |
| **บันทึกเมื่อ** | 9 ส.ค. 2569 (Wave 2) |

---

### 39. BarthelIndexGrid (ตารางให้คะแนนแบบประเมินมาตรฐาน) — 🕐 รอเคสที่ 2

| | |
|---|---|
| **ใช้อยู่ที่** | `src/pages/clinic/rehab/BarthelIndexGrid.jsx` — RehabSteps S3 ประเมิน ADLs (Barthel 0–100 + แปลผลระดับ) — 1 ที่ |
| **หน้าที่** | ตาราง "หัวข้อ × ตัวเลือกคะแนน + รวมคะแนน + แปลผลระดับ" — รูปแบบของแบบประเมินมาตรฐานทุกตัว (Barthel, ADL, MMSE) |
| **รอเคสอะไร** | แบบประเมินตัวถัดไปที่เป็นตารางคะแนน — candidates ใกล้เคียง: แบบคัดกรอง 2Q/9Q/8Q/ST-5 ใน checkup (ตอนนี้เป็นฟอร์มของตัวเอง) และงานผู้สูงอายุ/เยี่ยมบ้าน (ADL) |
| **บันทึกเมื่อ** | 9 ส.ค. 2569 (Wave 2) |

---

### 40. FamilyPlanningFollowUpCard (บัตรติดตามวางแผนครอบครัว — เอกสารพิมพ์) — 🕐 รอเคสที่ 2

| | |
|---|---|
| **ใช้อยู่ที่** | `src/pages/clinic/family-planning/FamilyPlanningFollowUpCard.jsx` — S7 preview + ปุ่มพิมพ์ในทะเบียน — 1 โมดูล |
| **หน้าที่** | บัตรติดตามผู้รับบริการวางแผนครอบครัว (คู่มือ p.2-8/2-9) 2 โหมด: preview ใน Popup / print ผ่าน createPortal + `@media print` |
| **หมายเหตุ** | ถ้า PrintSheet (รายการ #2) ถูกยกขึ้น DS เมื่อไร บัตรนี้ควร refactor ไปใช้ PrintSheet เป็นฐาน |
| **บันทึกเมื่อ** | 9 ส.ค. 2569 (Wave 2) |

---

### 41. dashboardReportKit (ชุด primitive ของหน้ารายงาน — `ReportGroupCard` · `ChartPanel` · `ChartsRow` · `ReportViewPopup` · `ReportToolbar` · `StatTile` · `StatTileRow` · `EmptyChartNote` · `SectionTopic`) — 📐 มี 3 ผู้ใช้แล้ว พร้อมยกขึ้น DS

| | |
|---|---|
| **ใช้อยู่ที่** | `src/pages/dashboard/dashboardReportKit.jsx` — ทั้ง 6 หน้ารายงานของ §1.20 (`DashboardReportsHubPage` · `ServiceReportsPage` · `PharmacyAnalyticsPage` · `CheckupAnalyticsPage` · `SpecialClinicDashboardPage` · `ExecutiveDashboardPage`) |
| **หน้าที่** | โครงซ้ำของหน้ารายงานทุกโมดูล: การ์ดกลุ่มรายงาน + แถวกราฟ + ป๊อปอัป "ดูรายงาน" (ตาราง + ช่วงวันที่ + ส่งออก) + แถบเครื่องมือกรอง sticky + StatTile + empty-state ของกราฟ · helper: `buildExportReport` `matchesIsoDateFilter` `donutFromCounts` `hbarRows` |
| **ทำไมไม่มีของเดิมแทน** | เป็น pattern ที่ skill `mih-report-page` สั่งไว้ แต่วันนี้ถูก copy-paste ซ้ำระหว่าง `PharmacyReportsPage.jsx` กับ `ConsentReportPage.jsx` — ไม่มี component กลางใน DS เลย builder จึงสกัดเป็นชุดเดียวในโฟลเดอร์โมดูลแทนการแก้ไฟล์ของโมดูลอื่น |
| **ทำไมควรยกขึ้น DS** | ผู้ใช้ ≥2 แล้วชัดเจน (6 หน้าใน §1.20 + อีก 2 หน้าที่ทำมือไว้ก่อน) — ควรยกเป็น `src/components/report/*` แล้วให้ pharmacy/consent มา alias ตาม ไม่ใช่ให้แต่ละโมดูลถือสำเนาของตัวเอง |
| **โครง API ที่เสนอ** | `<ReportGroupCard title topic actions>` · `<ChartsRow>` / `<ChartPanel title footnote empty>` · `<ReportViewPopup reports activeKey onClose pageSize onExport>` · `<ReportToolbar sticky filters summary>` · `<StatTileRow>` / `<StatTile label value tone hint>` · `<EmptyChartNote icon reason howToFix>` |
| **พฤติกรรมที่ต้องรักษาไว้** | empty state ต้องบอก "เหตุผล + วิธีแก้" ไม่ใช่กราฟสูง 0 · ตารางในป๊อปอัปใช้ `pagination={false}` + `<Pagination>` ภายนอก (กัน pager ซ้อน) · ช่วงวันที่ start > end → error inline + ปิดปุ่มส่งออก · HBar Top-N ใช้ `alignContent='start'` + `minHeight` · หารด้วยศูนย์ผ่าน `safePct` เสมอ |
| **บันทึกเมื่อ** | 9 ส.ค. 2569 (Wave §1.20) |

---

### 42. DataSourceStrip (แถบแหล่งข้อมูล Read Replica + สถานะความสด) — 📐 มี 6 ผู้ใช้แล้ว พร้อมยกขึ้น DS

| | |
|---|---|
| **ใช้อยู่ที่** | `src/components/dashboard/DataSourceStrip.jsx` — `DashboardReportsHubPage` · `ServiceReportsPage` · `PharmacyAnalyticsPage` · `SpecialClinicDashboardPage` · `CheckupAnalyticsPage` · `ExecutiveDashboardPage` — **6 ที่** |
| **หน้าที่** | บอกผู้ใช้ว่า "ตัวเลขนี้มาจากไหนและสดแค่ไหน" ตาม TOR §1.20.9 — Read Replica ที่แยกจากฐานให้บริการ · 2 สถานะ (ปกติ · สัญญาณล่าช้าเมื่อ lag > 60 วิ) · เวลาอัปเดตล่าสุด · ป๊อปอัปรายละเอียด engine/scope/retention + ประวัติการซิงก์ |
| **ทำไมไม่มีของเดิมแทน** | `Alert` เป็นคำเตือนแบบคงที่ · `ColorfulBadge` เป็นป้ายเดี่ยว — ไม่มีอะไรใน DS ที่เป็น "แถบ provenance ของข้อมูลที่กดดูรายละเอียดได้" |
| **ทำไมควรยกขึ้น DS** | เกิน 2 ผู้ใช้ไปมาก และโมดูลอื่นที่แสดงตัวเลขรวม (การเงิน · สิทธิและการเบิกจ่าย · Lab QC) ต้องบอกที่มาของข้อมูลเหมือนกัน |
| **โครง API ที่เสนอ** | `<DataSourceStrip source lagSeconds updatedAt onOpenDetail syncHistory>` — สถานะคำนวณจาก `lagSeconds` ไม่ใช่ prop สี เพื่อไม่ให้ผู้เรียกตัดสินใจเรื่อง threshold เอง |
| **บันทึกเมื่อ** | 9 ส.ค. 2569 (Wave §1.20) |

---

### 43. DashboardSubNav (แถบสลับหน้ารายงานของโมดูลแดชบอร์ด) — 🚧 ไม่ใช่ของกลาง — เป็น nav เฉพาะโมดูล

| | |
|---|---|
| **ใช้อยู่ที่** | `src/components/dashboard/DashboardSubNav.jsx` — ทุกหน้าใน `src/pages/dashboard/*` ผ่าน `QueuePageShell` slot `belowSummary` |
| **หน้าที่** | สลับ ภาพรวม ↔ ศูนย์รวมรายงาน ↔ รายงานผู้รับบริการ/เภสัชกรรม/ตรวจสุขภาพ ↔ คลินิกพิเศษ ↔ ผู้บริหาร |
| **ทำไมไม่ยกขึ้น DS** | ตัวมันคือ `TabUnderline` ของ DS ที่ห่อ list ของ route ตาม pattern เดียวกับ `PharmacySubNav` / `LabSubNav` — สิ่งที่ซ้ำคือ *pattern* ไม่ใช่ component ที่ generalize ได้ (ลิสต์เมนูเป็นข้อมูลของโมดูล) |
| **หมายเหตุถึงผู้ดูแล nav** | `DASHBOARD_NAV_LINKS` ในไฟล์นี้ **ต้องตรงกับ** `subItems` ของเมนู `dashboard` ใน `src/components/layout/Sidebar.jsx` — แก้ที่เดียวแล้วอีกที่จะเพี้ยน |
| **บันทึกเมื่อ** | 9 ส.ค. 2569 (Wave §1.20) |

---

### 44. AreaHealthMapPanel (แผนที่เชิงตำแหน่งระดับพื้นที่ ผูกกับตัวกรอง) — 🕐 รอเคสที่ 2

| | |
|---|---|
| **ใช้อยู่ที่** | `src/components/dashboard/AreaHealthMapPanel.jsx` — `ExecutiveDashboardPage` (§1.20.10.1) — 1 ที่ |
| **หน้าที่** | ฉายพิกัด lat/lng จริงของศูนย์บริการลงกรอบสัดส่วน · ขนาดหมุด = จำนวนผู้ป่วย NCD · สีหมุด = ระดับความชุก · กดหมุดเพื่อกรองทั้งหน้า · sync สองทางกับตัวกรอง เขต → แขวง → สถานบริการ |
| **ทำไมไม่มีของเดิมแทน** | `AddressMapBlock` เป็นฟอร์มลากหมุดเดียวตอนลงทะเบียนที่อยู่ · `ServiceCenterMapCard` (`src/components/graph/BigCharts.jsx`) เป็นการ์ดปิดตาย ไม่รับ props และไม่ผูกกับตัวกรองใด — ทั้งคู่ทำงานนี้ไม่ได้ |
| **รอเคสอะไร** | โมดูลอื่นที่ต้องดูหลายหมุดพร้อมกันและกรองจากแผนที่ — เยี่ยมบ้าน (`/homevisit`), Telemedicine RPM (`TelemedGisOverviewPanel` รายการ #47 คือเคสใกล้เคียงที่สุด), รง.506 · **ถ้าเคสที่ 2 มา ควรออกแบบเป็น `MapOverviewPanel` ตัวเดียวที่รับ `markers` / `selectedKey` / `onSelect` แล้วให้ทั้งสองที่ alias** |
| **ข้อจำกัดที่ตั้งใจ** | เป็นแผนที่เชิงตำแหน่ง ไม่ใช่ choropleth รูปเขตจริง และไม่เพิ่ม map library ใหม่เข้าโปรเจกต์ — แผนที่ OSM เต็มรูปแบบยังอยู่ที่ `ServiceCenterMapCard` บน `/dashboard` |
| **คำขอถึงเจ้าของ `ServiceCenterMapCard`** | อยากได้ props `markers` / `selectedKey` / `onSelect` เพื่อให้แผนที่ OSM จริงผูกกับตัวกรองได้ — ถ้าได้ พาเนลนี้จะเลิกซ้ำและถูกยุบทิ้ง |
| **บันทึกเมื่อ** | 9 ส.ค. 2569 (Wave §1.20) |

---

### 45. printKit (ชุด primitive แผ่นพิมพ์ A4 — `PrintSheetFrame` · `PrintTable` · `PrintBlock` · `PrintCell` · `PrintSignatureLine` · `usePrintSheet` · `printWithFilename`) — 📐 มี 4 ผู้ใช้แล้ว พร้อมยกขึ้น DS — รวมร่างกับรายการ #2

| | |
|---|---|
| **ใช้อยู่ที่** | `src/pages/treat/printKit.jsx` — `ReferralPrintSheet` · `InternalReferralPrintSheet` · `LabRequestPrintSheet` · `XrayRequestPrintSheet` — **4 ที่** |
| **หน้าที่** | กติกากระดาษที่ทุกใบต้องมีเหมือนกัน: `@page` A4 portrait margin 12mm · `@media print` · หัวตาราง (`thead`) ซ้ำทุกหน้าเมื่อเกิน 1 หน้า · บล็อกห้ามฉีกกลางหน้า · ช่องลายเซ็น · `printWithFilename()` ตั้งชื่อไฟล์ผ่าน `document.title` ก่อนเรียก `window.print()` |
| **ทำไมไม่มีของเดิมแทน** | DS ไม่มีหมวดเอกสารสำหรับพิมพ์เลย (เหตุผลเดียวกับรายการ #2) — เดิม `ReferralPrintSheet` ฝังกฎพิมพ์ไว้ในไฟล์ตัวเอง ทำให้ใบใหม่ทุกใบต้องคัดลอกกฎตาม |
| **ทำไมควรยกขึ้น DS** | นี่คือ **implementation จริงตัวแรก** ของ `PrintSheet` ที่รายการ #2 (XrayReportSheet) เสนอไว้ — ถ้ายกขึ้น DS ควรยก `printKit` เป็นฐาน แล้วให้ `XrayReportSheet` · `FamilyPlanningFollowUpCard` (#40) · `registrationPrint` (#6) · `LabSendOutManifest` (#35) มา alias ทั้งหมด แทนที่จะออกแบบใหม่จากศูนย์ |
| **ต้องมี token ใหม่** | เหมือนรายการ #2 — `--print-paper` `--print-ink` `--print-ink-soft` `--print-ink-muted` `--print-rule` (กระดาษไม่มี dark mode) |
| **บันทึกเมื่อ** | 9 ส.ค. 2569 (Wave §1.4) |

---

### 46. ReferralHistoryPanel / ReferralHistoryTimeline (ไทม์ไลน์ใบส่งต่อข้าม visit) — 🕐 รอเคสที่ 2

| | |
|---|---|
| **ใช้อยู่ที่** | `src/pages/treat/panels/ReferralHistoryPanel.jsx` — ป๊อปอัปในทะเบียน `/treat/refer` + แท็บ "ประวัติการส่งต่อ" ใน Step 1 ของ `/treat/record` — 2 จุดเรียก แต่เป็น flow เดียว (ประวัติการส่งต่อ) จึงยังนับเป็นเคสเดียว |
| **หน้าที่** | ไทม์ไลน์รายใบส่งต่อ เรียงตามเวลาเสมอแม้ข้ามทิศทาง (ออก/เข้า/ภายใน) · แต่ละแถวมีบล็อกเหตุผลยกเลิก / ผลตอบกลับของตัวเอง · ใบยกเลิกขีดฆ่าแต่ไม่หายจากไทม์ไลน์ · ใบหมดอายุขึ้นป้าย · jump-to-detail สลับแท็บตามทิศทางของใบ |
| **ทำไมไม่มีของเดิมแทน** | `<Table>` บีบบล็อกเหตุผล/ผลตอบกลับจนอ่านไม่ออก · `HistoryTimeline` (ประวัติการวัด) เป็นไทม์ไลน์ค่าตัวเลข ไม่รับเนื้อหาอิสระต่อแถว — DS ยังไม่มี timeline ที่แถวมี body ของตัวเอง |
| **รอเคสอะไร** | ไทม์ไลน์เอกสารตัวถัดไปที่แถวมีเนื้อหายาว — ทะเบียนการส่งปรึกษาแพทย์ (`/treat/consult`), ประวัติความยินยอม (`/consent/history`), ประวัติการนำส่งรายงาน (§1.20.8.2) · ถ้ามาแล้วควรยกเป็น `<RecordTimeline items renderBody onJump>` กลาง |
| **บันทึกเมื่อ** | 9 ส.ค. 2569 (Wave §1.4) |

---

### 47. TelemedGisOverviewPanel (แผนที่จุดประเมิน RPM ระดับกระดาน) — 🕐 รอเคสที่ 2

| | |
|---|---|
| **ใช้อยู่ที่** | `src/components/telemed/TelemedGisOverviewPanel.jsx` — `/telemed/rpm` (พาเนล "แผนที่จุดประเมิน (GIS)" เหนือการ์ด/ตารางกระดาน RPM) — 1 ที่ |
| **หน้าที่** | หมุดของผู้รับบริการทุกรายพร้อมกัน สีตามระดับเฝ้าระวัง (ปกติ/เฝ้าระวัง/วิกฤต) · กรองตามสถานะ/เขต · คลิกหมุด → ค่าล่าสุด + sparkline + ไปที่การ์ดผู้ป่วย/เปิดสาย · empty state "ไม่พบจุดประเมินตามตัวกรอง" · ซ่อนตอนพิมพ์ · ทุก drill-down ยิง audit |
| **ทำไมไม่มีของเดิมแทน** | `AddressMapBlock` ปักได้หมุดเดียวและเป็นฟอร์มให้ผู้ใช้ลากหมุดเอง (ใช้ตอนลงทะเบียนที่อยู่) — ไม่มี component ใดใน `src/components/` ที่แสดงหลายหมุด + สีตามระดับ + คลิกเพื่อ drill-down |
| **รอเคสอะไร** | **เคสที่ 2 มาแล้วในเวฟเดียวกัน:** `AreaHealthMapPanel` (รายการ #44) ทำงานเดียวกันคนละโมดูล — ทั้งคู่เป็นแผนที่ SVG offline หลายหมุดที่ผูกกับตัวกรอง ควรออกแบบ `MapOverviewPanel` กลางตัวเดียวจาก 2 เคสนี้พร้อมกัน แทนที่จะยกตัวใดตัวหนึ่งขึ้นตรง ๆ |
| **ข้อจำกัดที่ตั้งใจ** | แผนที่ SVG offline — ไม่มี tile server / ไม่เพิ่ม Leaflet เข้าโปรเจกต์ · พิกัดเป็นข้อมูลสาธิตจาก `telemedRpm.js` และมีแบนเนอร์ระบุไว้ชัดบนหน้าจอ |
| **บันทึกเมื่อ** | 9 ส.ค. 2569 (Wave §1.13) |

---

### 48. AbacPolicyEditPopup (ตัวแก้กฎสิทธิ์ 3 แกน พร้อม preview กฎที่ชนะ) — 🕐 รอเคสที่ 2

| | |
|---|---|
| **ใช้อยู่ที่** | `src/pages/treat/AccessPolicyPage.jsx` (`/treat/access-policy`) — 1 ที่ |
| **หน้าที่** | แก้กฎ ABAC 3 แกน (บทบาท × หน่วยงาน × หมวดข้อมูล → ระดับผลลัพธ์ 4 ระดับ) + preview ว่ากฎอื่นตัวไหนจะชนะเมื่อชนกัน (deny-by-default เมื่อไม่มีกฎ) + บังคับเหตุผล ≥10 ตัวอักษรตอนปิดใช้กฎ + เขียน audit ผู้แก้/เวลา/ค่าเดิม→ใหม่ |
| **ทำไมไม่มีของเดิมแทน** | `AccessControlPage` (`/assess/access-control`) เป็นทะเบียนสิทธิ์ระดับ role ไม่ใช่ตัวแก้กฎหลายแกนที่มี conflict resolution — DS ไม่มี pattern "matrix rule editor" เลย |
| **รอเคสอะไร** | หน้าตั้งค่าสิทธิ์ตัวถัดไปที่กฎชนกันได้ — `/assess/consent-access-rights` (สิทธิเข้าถึงตามระดับความยินยอม) และการตั้งค่าสิทธิ์ของ Lab/เภสัช · ถ้ามาแล้วควรยกเป็น `<PolicyMatrixEditor axes levels resolveConflict>` |
| **หมายเหตุ** | ผลของกฎถูกบังคับใช้ที่ชั้น UI เท่านั้น (§1.4.8.1 ยังเป็น partial) — ถ้ายกขึ้น DS ต้องไม่สื่อว่า component นี้คือการบังคับสิทธิ์จริง |
| **บันทึกเมื่อ** | 9 ส.ค. 2569 (Wave §1.4) |

---

### 49. Hl7SegmentInspector (มุมมองข้อความ HL7 ต้นฉบับคู่ตารางฟิลด์ที่ถอดแล้ว) — 🕐 รอเคสที่ 2

| | |
|---|---|
| **ใช้อยู่ที่** | `src/pages/treat/TreatmentInterfacesPage.jsx` — `AlertDialog` "ข้อความ HL7 v2.5.1" ที่ `/treat/interfaces` — 1 ที่ |
| **หน้าที่** | แสดง raw segment (MSH/PID/OBR/OBX) แบบ monospace วางคู่ตารางฟิลด์ที่ถอดแล้วตามผนวก ง · ไฮไลต์ฟิลด์ที่ไม่ตรง (HN mismatch) เป็นสีเตือน · แถว malformed แสดง raw ครบและชี้ฟิลด์ที่ parse ไม่ได้โดยไม่ crash |
| **ทำไมไม่มีของเดิมแทน** | DS ไม่มี code/log viewer เลย — ไม่มี component ที่คุม monospace + word-break ของข้อความยาว + การไฮไลต์ช่วงอักขระ |
| **รอเคสอะไร** | จุดตรวจ interface อื่นที่ต้องดูข้อความดิบ — `/lab/interface` (LIS message queue), `/queue-center/integration`, DICOMweb request log (#ในหน้าเดียวกัน) · ถ้ามาแล้วควรยกเป็น `<RawMessageInspector raw fields highlights>` |
| **หมายเหตุ** | ตารางฟิลด์คือ "ผลที่ parser ควรถอดได้" ไม่ได้ถอดสด — ยังไม่มี HL7 parser จริง (§1.4.7.3 / §1.5.2.1 ยัง partial) |
| **บันทึกเมื่อ** | 9 ส.ค. 2569 (Wave §1.4) |

---

### 50. CertificateSignPopup (เลือกใบรับรอง + ยืนยัน PIN ก่อนลงนามดิจิทัล) — 🕐 รอเคสที่ 2 — คู่กับรายการ ESignatureField

| | |
|---|---|
| **ใช้อยู่ที่** | `src/pages/treat/panels/DocumentCenterPanel.jsx` — Step 8 ศูนย์เอกสารของ `/treat/record` — 1 ที่ |
| **หน้าที่** | เลือกใบรับรองจากรายการ (ผู้ถือ / เลขใบประกอบวิชาชีพ / serial / ผู้ออก / วันหมดอายุ) → ยืนยัน PIN → ประทับบล็อกลงนามพร้อม digest · ใบรับรองหมดอายุถูก block พร้อมเหตุผลและเสนอ fallback ลายเซ็นมือ · PIN ผิดครบ 3 ครั้งล็อกชั่วคราว |
| **ทำไมไม่มีของเดิมแทน** | `ESignatureField` (รายการลายเซ็นอิเล็กทรอนิกส์ 3 ช่องทาง) จัดการ *ภาพ* ลายเซ็น (บันทึกไว้/วาด/อัปโหลด) — ไม่มีอะไรใน DS ที่จัดการ *ใบรับรอง* + PIN + สถานะโมฆะ |
| **รอเคสอะไร** | จุดลงนามอื่นที่ TOR สั่งให้ผูก certificate — ใบผลแล็บที่ยืนยันโดยนักเทคนิค (§1.15.6), ใบรายงานผลรังสี (§1.12.6.5), ใบเสร็จการเงิน · ถ้ามาแล้วควรยกขึ้น DS **คู่กับ** `ESignatureField` เป็นตระกูลเดียวกัน (`<SignatureAction mode='drawn'|'certificate'>`) |
| **หมายเหตุ** | ไม่ใช่ PKI จริง — digest เป็น FNV-1a ในเบราว์เซอร์ ไม่ได้เซ็นด้วย private key ใน HSM/Token (§1.5.11.5 / §1.4.10.11 ยัง partial) · ถ้ายกขึ้น DS ต้องออกแบบให้สลับไป backend signing ได้โดยไม่เปลี่ยน API ฝั่งผู้เรียก |
| **บันทึกเมื่อ** | 9 ส.ค. 2569 (Wave §1.4) |

---

### 51. TabUnderline `groupStart` (เส้นคั่นกลุ่มในแถบแท็บเดียว) — 🕐 รอเคสที่ 2

| | |
|---|---|
| **ใช้อยู่ที่** | `src/pages/consent/ConsentManagementPage.jsx` — คั่นระหว่าง 6 แท็บสถานะ กับแท็บ "ผู้รับบริการทั้งหมด" — 1 ที่ |
| **หน้าที่** | prop เสริมบน `<TabUnderline>` (ไม่ใช่ component ใหม่): `tabs[i].groupStart === true` วาดเส้นตั้ง (`--border-neutral-tertiary`, 1×20px) **ก่อน** แท็บนั้น เพื่อบอกว่าแท็บที่เหลือคนละชนิดกับกลุ่มซ้าย · carry เข้าเมนู overflow เป็นเส้นนอนด้วย |
| **ทำไมไม่มีของเดิมแทน** | DS มี `TabUnderline` (แถบเดียว flat) กับ `TabPill` — ไม่มีตัวไหนรองรับ "แท็บสองชนิดในแถบเดียว" · ทางเลือกคือแยกเป็น 2 `<TabUnderline>` แต่จะได้ `role="tablist"` สองอันในแถวเดียว ซึ่งผิดสำหรับ screen reader |
| **ปัญหาที่แก้** | แท็บที่ 7 ("ผู้รับบริการทั้งหมด") ตอบคนละคำถามกับ 6 แท็บแรก และ**คนละหน่วยข้อมูล** — 6 แท็บแรก 1 แถว = 1 ฉบับ (worklist ตามสถานะ เรียงตามวันที่) ส่วนแท็บสุดท้าย 1 แถว = 1 คน (ทะเบียน เรียงตาม HN) พอวางเรียงกันหมดผู้ใช้อ่านเป็นสถานะที่ 7 แล้วตีความ count ผิดหน่วย |
| **ยังไม่มีใน Figma** | ต้องยืนยันกับ Figma ก่อนยกขึ้น DS — ตอนนี้เป็น drift ที่จงใจ · ไม่ได้เพิ่ม token ใหม่ ใช้ `--border-neutral-tertiary` ที่ design.md ระบุไว้ว่าสำหรับ vertical divider อยู่แล้ว |
| **รอเคสอะไร** | หน้าคิว/ทะเบียนอื่นที่มี "แท็บรวม" ต่อท้ายแท็บสถานะ — `/pharmacy`, `/lab/queue`, `/xray/queue` · ถ้ามาแล้วควรยกขึ้นเป็น API ทางการของ TabUnderline |
| **คู่กับ** | แท็บนั้นถูกแปลงเป็นตารางรายคนแล้ว (`PATIENT_DIRECTORY` + `patientRows` ใน `ConsentManagementPage.jsx`) — แถวมาจาก **MPI ทั้งทะเบียน** (`MR_PATIENTS` 100 ราย) ไม่ใช่ยุบจาก consent record จึงมีคนที่ "ไม่เคยให้ความยินยอม" อยู่ในตารางด้วย · คอลัมน์: จำนวนฉบับ / ป้ายสรุปสถานะ / ช่องทางล่าสุด / เคลื่อนไหวล่าสุด · ตัวกรองทำงานระดับฉบับก่อนยุบ · ปุ่ม view เปิด `ConsentConsentedFormsPopup` โหมด `allForPatient` (กางทุกฉบับทุกสถานะให้เลือก) |
| **บันทึกเมื่อ** | 13 ส.ค. 2569 |

---

### 52. PendingConsentFormCard (การ์ดแบบฟอร์มที่ยังไม่ขอความยินยอม) — 📐 มี 2 ผู้ใช้แล้ว พร้อมยกขึ้น DS

| | |
|---|---|
| **ใช้อยู่ที่** | `src/components/forms/RegistrationSteps.jsx` (Step 1 แบบฟอร์มยินยอม ของการลงทะเบียน) · `src/pages/consent/ConsentRequestFormsPopup.jsx` (ระบบจัดการความยินยอม → แท็บผู้รับบริการทั้งหมด → กรอกแบบฟอร์มความยินยอม) — 2 ที่ |
| **หน้าที่** | การ์ดแบบฟอร์มความยินยอม 1 ใบ: ภาพปก (227×113) + ป้ายหัวข้อ + ป้ายเวอร์ชัน + ชื่อฟอร์ม + รหัสฟอร์ม + แถบ action (พิมพ์ ไอคอน · กรอกแบบฟอร์ม) |
| **ทำไมไม่มีของเดิมแทน** | DS มี `Card` ทั่วไปกับ `FormCard` (`src/components/forms/FormsLibrary.jsx`) — FormCard เป็นการ์ดของคลังแบบฟอร์ม PHCIS (มี status badge / เวลาโดยประมาณ / หมวด) คนละสัญญากับการ์ดใบนี้ที่มีแค่ "ยังไม่ขอความยินยอม → กรอก/พิมพ์" |
| **ปัญหาที่แก้** | เดิมการ์ดนี้เขียนอยู่ในไฟล์ `RegistrationSteps.jsx` (private) — พอระบบจัดการความยินยอมต้องใช้หน้าตาเดียวกันเป๊ะใน popup จึงต้องแยกออกมาแทนที่จะ copy (การ์ดสองใบจะ drift แยกกันทันทีที่ Figma ขยับ) |
| **โครงที่เป็นอยู่** | `<PendingConsentFormCard categoryLabel categoryStyle version title code cover onPrint onFill fillLabel>` — ข้อมูลการ์ดมาจาก `REGISTRATION_PENDING_CONSENT_CARDS` (`src/data/registrationConsentForms.js`) |
| **แก้ระหว่างย้าย** | `gap: 6` → `var(--dim-space-150, 6px)` (ตามกติกา token) · เพิ่ม `flex-1` ที่บล็อกเนื้อหา เพื่อให้แถบปุ่มของทุกใบอยู่ระดับเดียวกันเมื่อชื่อฟอร์มขึ้นบรรทัดไม่เท่ากัน |
| **ยังไม่มีใน Figma** | มีใน Figma Registration 292:104252 (Consent Pending) แต่ยังไม่ได้เป็น component ของ MIH library — ต้องยืนยันชื่อ/variant ก่อนยกขึ้น DS |
| **บันทึกเมื่อ** | 14 ส.ค. 2569 |

---

### 53. ConsentQrScanBlock (บล็อกสแกน QR ให้ผู้รับบริการยินยอมเอง) — 📐 มี 2 ผู้ใช้แล้ว พร้อมยกขึ้น DS

| | |
|---|---|
| **ใช้อยู่ที่** | `src/pages/registration/RegistrationConsentFillPage.jsx` (แผงขวาหน้ากรอกใบยินยอม) · `src/pages/consent/CreateConsentFormPage.jsx` → `StepReview` เมื่อส่ง `showPatientQr` (popup ดูแบบฟอร์ม `/consent/forms`) — 2 ที่ |
| **หน้าที่** | ภาพประกอบมือถือสแกน + คำอธิบาย "หรือให้ผู้รับบริการยินยอมด้วยตนเองผ่านโทรศัพท์ Application โดยสแกน QR Code ด้านล่างนี้" + กรอบ QR — เสนอทางเลือกให้ผู้รับบริการเซ็นเองแทนเจ้าหน้าที่กรอกแทน |
| **ทำไมไม่มีของเดิมแทน** | `ConsentQrSendPopup` เป็น flow ส่ง QR ไปมือถือแบบ popup 3 stage · `FakeQR` เป็นตัว render QR ล้วน ๆ ไม่มี copy/ภาพประกอบ — บล็อกนี้คือ "ข้อเสนอ + QR" ที่ฝังในแผงข้างของหน้าเอกสาร |
| **โครงที่เป็นอยู่** | `<ConsentQrScanBlock qrSrc \| qrNode qrSize illustrationSrc alt>` — ส่ง QR ได้ทั้ง URL รูป (เวชระเบียนใช้ api.qrserver.com) หรือโหนด (`<FakeQR seed=… />` ในฝั่ง consent ที่ไม่พึ่ง network) |
| **ยังไม่มีใน Figma** | มีใน Figma Registration 295:41105 แต่ยังไม่ได้เป็น component ของ MIH library — ต้องยืนยันชื่อ/ขนาดก่อนยกขึ้น DS |
| **บันทึกเมื่อ** | 14 ส.ค. 2569 |

---

### 54. ConsentFormFillBody + ConsentDisclosureFillPopup (กรอกใบยินยอมเปิดเผยข้อมูล) — 📐 มี 3 ผู้ใช้แล้ว พร้อมยกขึ้น DS

| | |
|---|---|
| **ใช้อยู่ที่** | `src/pages/registration/RegistrationConsentFillPage.jsx` (หน้าเต็ม `/registration/consent/:formId`) · `src/components/forms/RegistrationSteps.jsx` → `StepConsent` (popup จากการ์ด Step 1) · `src/pages/consent/ConsentRequestFormsPopup.jsx` (nested popup ในระบบจัดการความยินยอม) · `src/pages/mobile/MobileConsentPage.jsx` (`/m/consent` — `showSidePanel={false}` ผู้รับบริการกรอกเองบนมือถือ) — 4 ที่ |
| **หน้าที่** | `ConsentFormFillBody` = ตัวเอกสาร: ข้อมูลผู้ป่วย → ข้อความยินยอมรายข้อ (ยินยอม/ไม่ยินยอม) → ลายมือชื่อ + แผงขวา QR/Patient View · `ConsentDisclosureFillPopup` = เปลือก popup + ปุ่มบันทึก + `recordMrConsentSigning` + เตือนก่อนทิ้ง |
| **ทำไมไม่มีของเดิมแทน** | `ConsentFormFillPopup` (`src/components/popup/`) กรอกฟอร์มจาก `formsLibrary.js` (checkbox + ลายเซ็น) คนละ schema กับใบเปิดเผยข้อมูล 3 ใบนี้ที่เป็น clause + ยินยอม/ไม่ยินยอมรายข้อ |
| **ปัญหาที่แก้** | เดิมเอกสารเขียนอยู่ในหน้าเต็มหน้าเดียว (640 บรรทัด) — พอต้องเปิดเป็น popup 2 ที่ ถ้า copy จะได้เอกสาร 3 สำเนาที่ drift แยกกันทันที |
| **โครงที่เป็นอยู่** | `<ConsentFormFillBody formId initialFullName initialNationalId initialHn showSidePanel onStateChange onSubmit>` — คุยกับปุ่มบันทึกของผู้เรียกผ่าน `onStateChange({ ready, submit })` (สัญญาเดียวกับ AccessRequestForm) |
| **บันทึกเมื่อ** | 14 ส.ค. 2569 |

### 55. ConsentIdentityVerifyPanel (แผงยืนยันตัวตนก่อนกรอกใบยินยอม ด.1.1.1) — 📐 มี 2 ผู้ใช้แล้ว พร้อมยกขึ้น DS

| | |
|---|---|
| **ใช้อยู่ที่** | `src/pages/consent/ConsentRequestFormsPopup.jsx` (worklist ผู้รับบริการทั้งหมด — มีการ์ดข้อมูลบัตรฝั่งซ้าย) · `src/pages/consent/ConsentFormViewPopup.jsx` (เมนูแบบฟอร์มความยินยอม — ไม่มีการ์ดซ้าย เพราะยังไม่รู้ตัวผู้รับบริการ) — 2 ที่ |
| **หน้าที่** | รวมขั้นยืนยันตัวตนทั้งชุดไว้ในคอมโพเนนต์เดียวที่ถือ state เอง: ตัวเลือก "ผู้ให้ความยินยอม" (ผู้รับบริการเอง / ผู้ปกครองแทนบุตรผู้เยาว์ — เปลี่ยนคำในกล่องยืนยันเป็น "ของผู้ปกครอง") → pill tab 3 วิธี (เสียบบัตร / เอกสารแทนบัตร / สแกนลายนิ้วมือ) → สถานะสำเร็จ · รายงานขึ้นผู้เรียกทาง `onChange({ verifiedAt, method, methodText, reading, subject })` |
| **ประกอบจาก** | `ConsentIdCardOnFile` + `ConsentIdCardReadStep` + `ConsentAltIdentityStep` + `ConsentFingerprintScanStep` + `ConsentIdentitySuccessStep` + `TabPill` + `RadioButton` + `CameraCapturePopup` (ลูกทั้งหมดรับ `personLabel` เพื่อสลับคำ ผู้รับบริการ/ผู้ปกครอง) |
| **ปัญหาที่แก้** | เดิม state ~10 ตัว + mock timer ของขั้นยืนยันฝังอยู่ใน ConsentRequestFormsPopup — พอเมนูแบบฟอร์มต้องมีขั้นเดียวกัน ถ้า copy จะ drift ทันที จึงดึงออกมาเป็นแผงกลาง ผู้เรียกเหลือแค่กระจก state ไว้เปิดปุ่ม "ต่อไป" |
| **บันทึกเมื่อ** | 14 ส.ค. 2569 |

### 56. QrScannerView (จอสแกน QR mock ฝั่ง Mobile — viewfinder + มุมกรอบ + เส้นสแกน) — 🕐 รอเคสที่ 2

| | |
|---|---|
| **ใช้อยู่ที่** | `src/pages/mobile/MobileConsentPage.jsx` (`/m/consent` — สแกน QR จากจอเจ้าหน้าที่เพื่อเปิดใบยินยอม) — 1 ที่ |
| **หน้าที่** | จอกล้องจำลองบนพื้นมืด: กรอบมุม 4 ด้าน + เส้นสแกนวิ่ง (keyframes `mih-mconsent-scan`) → เจอผลแล้วสลับเป็น check + ชื่อแบบฟอร์ม + ปุ่มไปต่อ/สแกนใหม่ · header ขาวของตัวเองเพราะ `MobileHeader` บังคับสีไอคอนเทาเข้ม อ่านไม่ออกบนพื้นกล้อง |
| **ทำไมไม่มีของเดิมแทน** | `ConsentQrScanBlock` (#53) เป็นฝั่ง "แสดง QR ให้สแกน" (เจ้าหน้าที่) — ตัวนี้คือฝั่งกล้องของผู้รับบริการ คนละหน้าที่ |
| **เคสที่ 2 ที่คาดว่าจะมา** | สแกน QR คิวตรวจ / สแกนเปิด e-Document อื่นบน Mobile app (TOR 4.5.4 / 4.6.4) |
| **บันทึกเมื่อ** | 17 ส.ค. 2569 |

---

### 57. SegmentedProgressBar (แถบความคืบหน้าหลายสถานะในรางเดียว) — 🕐 รอเคสที่ 2

| | |
|---|---|
| **ใช้อยู่ที่** | `src/pages/questionnaire/ProgressBar.jsx` — ใช้ใน `QuestionnaireOverviewPage` (ภาพรวม + ทุกแถวโมดูล) และ `QuestionnaireModulePage` (headerInfo) — 1 โมดูล |
| **หน้าที่** | รางเดียวแบ่งเป็นช่วงตามสถานะ (ตอบแล้ว / ต้องติดตาม / ไม่เกี่ยวข้อง) + บรรทัดสรุป `%` และตัวเลขแต่ละสถานะ · `compact` ตัดบรรทัดสรุปออกเหลือรางสูง 6px สำหรับใช้ในแถวลิสต์ |
| **ทำไมไม่มีของเดิมแทน** | `UploadProgressBar` เป็น progress ค่าเดียว (0–100 ของไฟล์) และ `StepProgress` เป็น stepper — ยังไม่มีตัวไหนแสดง "สัดส่วนหลายสถานะในรางเดียว" ซึ่งเป็นรูปแบบที่หน้าติดตามงานทุกหน้าต้องใช้ |
| **โครง API** | `<ProgressBar stats={{ total, answered, followup, na, pending, done, percent }} compact />` · ถ้ายกขึ้น DS ควรเปลี่ยนเป็น `<SegmentedProgressBar segments=[{key,label,value,tone}] total compact />` ให้ tone มาจาก StatusBadge style แทนการ hardcode 3 สถานะ |
| **พฤติกรรมที่ต้องรักษาไว้** | ช่วงที่ค่า 0 ต้องไม่ render (ไม่งั้นได้เส้นบางเกินคลิก/อ่านไม่ออก) · มี `role="progressbar"` + `aria-valuenow` · แต่ละช่วงมี `title` บอกจำนวน |
| **รอเคสอะไร** | หน้าติดตามความคืบหน้าอื่นที่มีหลายสถานะ เช่น ความครบถ้วนของแฟ้มเวชระเบียน · สถานะนำส่งรายงาน · ความคืบหน้าการตรวจสุขภาพรายกลุ่ม |
| **บันทึกเมื่อ** | 17 ส.ค. 2569 |

---

### 58. QuestionAnswerCard (การ์ดคำถาม + ช่องบันทึกคำตอบพร้อมสถานะ) — 🕐 รอเคสที่ 2

| | |
|---|---|
| **ใช้อยู่ที่** | `src/pages/questionnaire/QuestionCard.jsx` — ใช้ใน `QuestionnaireModulePage` (`/questionnaire/:moduleKey`) — 1 ที่ |
| **หน้าที่** | หนึ่งคำถามต่อหนึ่งการ์ด: ลำดับ · หัวข้อ · ข้อความคำถามเต็ม (`white-space: pre-line`) · ป้ายประเภทข้อมูล · `Textarea` คำตอบ + `InputField` หมายเหตุ + ชิปสถานะ (ต้องติดตาม / ไม่เกี่ยวข้อง) · debounce 350ms ก่อนเขียน store · แสดงเวลาบันทึกล่าสุด |
| **ทำไมไม่มีของเดิมแทน** | `FormBuilderCanvasBlock` เป็นตัว **ออกแบบ** ฟอร์ม ไม่ใช่ตัว **ตอบ** · ยังไม่มีการ์ด "โจทย์ + คำตอบ + สถานะติดตาม" ใน DS |
| **โครง API** | `<QuestionCard item={{id,no,topic,question,types[]}} entry={{answer,note,status,updatedAt}} index />` (เขียน store ผ่าน `setEntry` เอง) · ถ้ายกขึ้น DS ต้องรับ `onChange` จากภายนอกแทนการผูกกับ `questionnaireStore` |
| **พฤติกรรมที่ต้องรักษาไว้** | ข้อความคำถามต้องเห็นตลอดเวลาที่พิมพ์คำตอบ (recognition over recall) · state ในการ์ดต้อง re-seed เมื่อ `item.id` เปลี่ยนเท่านั้น ไม่งั้นตัวกรอง/ค้นหาจะทับสิ่งที่กำลังพิมพ์ |
| **รอเคสอะไร** | แบบประเมิน/แบบสอบถามอื่นที่ต้องกรอกทีละข้อ เช่น แบบคัดกรองสุขภาพจิต · checklist ตรวจรับงาน · แบบสำรวจชุมชน (§2.1.6) |
| **บันทึกเมื่อ** | 17 ส.ค. 2569 |

---

### 59. ServiceAreaMap (ขอบเขตพื้นที่รับผิดชอบ + จุดบริการหลายจุดในภาพเดียว) — 🕐 รอเคสที่ 2

| | |
|---|---|
| **ใช้อยู่ที่** | `src/pages/homevisit/HomeVisitRouteMapPanel.jsx` (มุมมองแผนที่ของคิวเยี่ยมบ้าน `/homevisit`) — 1 ที่ |
| **หน้าที่** | SVG แผนผังเดียวที่วาด (ก) polygon ขอบเขตพื้นที่รับผิดชอบของศูนย์บริการฯ (ข) หมุดศูนย์บริการฯ (ค) จุดเยี่ยมทุกจุดพร้อมลำดับการเดินทาง กดเลือกได้ — จุดที่อยู่นอกขอบเขตย้อมสีแดงและถูกสรุปเป็นคำเตือน |
| **ทำไมไม่มีของเดิมแทน** | `AddressMapBlock` ผูก **หนึ่งหมุดต่อหนึ่ง instance** ตาม contract `{lat,lng,pinSaved}` จึงแสดงหลายจุดพร้อมกันไม่ได้ และไม่มี component ไหนใน DS ที่วาด "ขอบเขตพื้นที่" (มติ คทง.4 ต่อ TOR §1.18.2 ให้เลิกวาดแผนที่ด้วยมือใน Family Folder) |
| **โครง API** | `<ServiceAreaMap stops selectedId onSelect />` โดยรับ polygon/center จาก `SERVICE_AREA` (`src/data/homevisitHhc.js`) — ถ้ายกขึ้น DS ต้องรับ `area={{polygon, center, label}}` + `points[]` จากภายนอกแทนการ import ข้อมูลเยี่ยมบ้านตรง ๆ |
| **พฤติกรรมที่ต้องรักษาไว้** | คำนวณ bounds จาก polygon + จุดทั้งหมด (ไม่ล็อกกรอบตายตัว) · จุดนอกเขตต้องต่างทั้งสีและข้อความ ไม่ใช่แค่สี · ยังเป็น mock ไม่ใช่ GIS จริง (§2.3 เป็นของอีกทีม) จึงต้องมีแถบบอกเสมอว่าเป็นแผนที่จำลอง |
| **รอเคสอะไร** | โมดูลอื่นที่ต้องเห็น "หลายจุดในขอบเขตเดียว" — งานชุมชน (§2.1 สำรวจบ้านรายชุมชน) · `AreaHealthMapPanel` ของแดชบอร์ด (รายการ #44) · `TelemedGisOverviewPanel` (รายการ #47) — ทั้งสามรายการนี้ควรออกแบบร่วมกันเป็น map primitive ตัวเดียว |
| **บันทึกเมื่อ** | 17 ส.ค. 2569 (รอบ Gap analysis คทง.4) |

---

### 60. ModuleSubNav (แถบสลับหน้าในโมดูล — TabUnderline ที่ช่อง `belowSummary`) — 📐 มี 3 ผู้ใช้แล้ว พร้อมยกขึ้น DS

| | |
|---|---|
| **ใช้อยู่ที่** | `src/components/pharmacy/PharmacySubNav.jsx` · `src/components/lab/LabSubNav.jsx` · `src/components/homevisit/HomeVisitSubNav.jsx` — 3 ที่ (โค้ดเกือบเหมือนกันทุกบรรทัด) |
| **หน้าที่** | แถวสลับหน้าระดับโมดูล (คิว / ทะเบียน / รายงาน …) วางที่ช่อง `belowSummary` ของ `QueuePageShell` แทนการทำ sub-menu ในเมนูซ้าย — หนึ่งโมดูล = หนึ่งปลายทางใน rail แล้วสลับหน้าย่อยที่ตัวหน้าเอง |
| **ทำไมไม่มีของเดิมแทน** | `TabUnderline` เป็น primitive ที่ไม่รู้เรื่อง routing · ทั้ง 3 ที่จึงเขียน `LINKS` + `resolveActiveKey(pathname)` + `history.push` ซ้ำกันเอง |
| **โครง API** | `<ModuleSubNav links={[{ key, label, path }]} />` โดย active key มาจาก `useLocation().pathname` (longest-prefix match) — ผู้เรียกไม่ต้องเขียน resolver เอง |
| **พฤติกรรมที่ต้องรักษาไว้** | `morphOnScroll` (ย่อเมื่อเลื่อน) · หน้าฟอร์มรายบุคคล (`/homevisit/visit`, `/pharmacy/dispense`) **ไม่อยู่** ในแถบ — เป็นหน้าของเคสหนึ่ง ไม่ใช่หน้าระดับโมดูล · `StickyStatusTabBar` วัดขอบล่างของแถบนี้ผ่าน `[data-mih-sticky-subnav]` เพื่อหยุดชิดกัน |
| **บันทึกเมื่อ** | 17 ส.ค. 2569 |

---

### 61. HomeVisitMapPopup (ดูแผนที่ / แก้หมุดบ้านจากแถวในตาราง) — 🕐 รอเคสที่ 2

| | |
|---|---|
| **ใช้อยู่ที่** | `src/pages/homevisit/HomeVisitMapPopup.jsx` — เปิดจากปุ่มในคอลัมน์ "ที่อยู่/เขต" ของ `HomeVisitQueuePage` — 1 ที่ |
| **หน้าที่** | Popup แผนที่ประจำแถว: ที่อยู่เต็ม + ระยะทางจากศูนย์ฯ + เตือนเมื่ออยู่นอกพื้นที่รับผิดชอบ + ปักหมุด/ลากหมุด/ใช้ตำแหน่งปัจจุบัน/ปักหมุดอัตโนมัติจากที่อยู่ แล้วบันทึกกลับ **2 ที่พร้อมกัน** (ทะเบียนผู้รับบริการ + overlay ของนัดในคิว) |
| **ทำไมไม่มีของเดิมแทน** | `AddressMapBlock` เป็น field ในฟอร์ม ไม่มี chrome ของ popup/สถานะบันทึก · ไม่มี pattern "แก้พิกัดจากแถวในตารางโดยไม่ต้องเปิดฟอร์มเต็ม" ใน DS |
| **โครง API** | `<HomeVisitMapPopup open row onClose onSaved />` — ถ้ายกขึ้น DS ต้องรับ `value` / `onSave(next)` แทนการเขียน store ของเยี่ยมบ้านเอง |
| **พฤติกรรมที่ต้องรักษาไว้** | ป้ายสถานะ/ระยะทางอ่านจากตำแหน่งที่**บันทึกแล้ว** ไม่ใช่ draft (ไม่งั้นกระพริบเป็น "ยังไม่ได้ปักหมุด" ระหว่างลาก) · กด "บันทึกตำแหน่ง" ถึงจะติด `pinSaved: true` · ปุ่มบันทึก disabled จนกว่าพิกัดจะเปลี่ยนจริง |
| **รอเคสอะไร** | หน้าอื่นที่ต้องแก้พิกัดจากแถว — ทะเบียนศูนย์บริการฯ (`/admin`), งานชุมชน §2.1 (สำรวจบ้าน), `AreaHealthMapPanel` (#44) |
| **บันทึกเมื่อ** | 17 ส.ค. 2569 |

---

### 62. schoolHealthShared — ชุด layout primitive ของหน้าโมดูล (PageBody · PageCard · SubCard · SectionHeader · NoticeBar · ErrorList · EmptyState · PagerRow · ReadField · Field · FieldRow · StatTile · StatRow · AuditLine · ReadOnlyBanner · StatusPill) — 📐 มีผู้ใช้ที่ 2 แล้ว (daycare) พร้อมยกขึ้น DS

| | |
|---|---|
| **ใช้อยู่ที่** | `src/pages/clinic/school-health/schoolHealthShared.jsx` — ทั้ง 7 หน้าของโมดูลงานอนามัยโรงเรียน (`src/pages/clinic/school-health/`) — 1 โมดูล |
| **หน้าที่** | ชุดโครงหน้า/การ์ด/หัวข้อ/แถบแจ้งเตือน/empty state/pager/ช่องอ่าน-กรอก/สรุปตัวเลข/บรรทัด audit/แถบ read-only/ป้ายสถานะ ที่ทุกหน้าในโมดูลใช้ร่วมกัน |
| **ทำไมไม่มีของเดิมแทน** | โครงเดียวกับที่ `src/pages/checkup/CheckupUi.jsx` ทำไว้ แต่ CheckupUi เป็นไฟล์ภายในของโมดูล checkup (playbook §4 ห้ามแก้/พึ่งพาไฟล์ page ของโมดูลอื่น) — จึงคัดโครงมาไว้ในโฟลเดอร์โมดูลตัวเอง |
| **โครง API** | primitive แต่ละตัวรับ props เรียบ ๆ (`title` / `tone` / `children`) — ถ้ายกขึ้น DS ควรเริ่มจากตัวที่ซ้ำจริงข้ามโมดูลแล้ว: `PageCard` / `SectionHeader` / `EmptyState` / `NoticeBar` / `PagerRow` / `StatTile` |
| **รอเคสอะไร** | **เคสที่ 2 มีแล้วโดยพฤตินัย** — `CheckupUi.jsx` (checkup) เป็นโครงเดียวกัน และ homevisit ก็มีโครงคล้ายกัน → เข้าเกณฑ์เสนอยก `PageCard`/`SectionHeader`/`EmptyState`/`NoticeBar`/`PagerRow`/`StatTile` ขึ้น DS แล้วให้ checkup + school-health + homevisit alias ตาม แต่ยังไม่ได้ออกแบบ API กลางร่วมกัน จึงคงสถานะรอไว้ก่อน |
| **บันทึกเมื่อ** | 23 ส.ค. 2569 |

---

### 63. TabScaffold + CancelRecordPopup + RecordActions + FormFooter (แพตเทิร์น "ฟอร์มบันทึก + ประวัติย้อนหลัง + แสดง/บันทึก/แก้ไข/ยกเลิก" ต่อแท็บบริการ) — 🕐 รอเคสที่ 2

| | |
|---|---|
| **ใช้อยู่ที่** | `src/pages/clinic/school-health/SchoolHealthSteps.jsx` — Tabs 6 บริการของ `StudentHealthProfilePage.jsx` (ตรวจสุขภาพ / ทันตกรรม / ประวัติวัคซีน / ให้บริการวัคซีน / ประเมินพัฒนาการ / สุขภาพจิต) — 1 ที่ |
| **หน้าที่** | โครงแท็บบริการมาตรฐาน: ฟอร์มบันทึกครั้งใหม่ + ตารางประวัติย้อนหลัง (ผู้บันทึก/ตำแหน่ง/เวลา/สถานะ) + ปุ่มชุด แสดง/บันทึก/บันทึกร่าง/แก้ไข/ยกเลิก(+เหตุผล)/เปิดใช้งานคืน ครบ 4 กริยาตาม TOR |
| **ทำไมไม่มีของเดิมแทน** | ตัว step body เป็นโดเมนเฉพาะอนามัยโรงเรียน แต่ scaffold (`TabScaffold` / `CancelRecordPopup` / `RecordActions` / `FormFooter`) เป็นแพตเทิร์นทั่วไปที่ DS ยังไม่มี — `TreatmentFormShell`/`FormShell` เป็น wizard ทั้งหน้า ไม่ใช่ "หลายบริการอิสระในหน้าเดียวผ่าน Tabs" |
| **โครง API** | `<TabScaffold form history readOnly onSave onSaveDraft onEdit onCancel />` + `<CancelRecordPopup open reason onConfirm />` — ถ้ายกขึ้น DS ให้แท็บโดเมนส่งเฉพาะเนื้อฟอร์ม/คอลัมน์ประวัติ |
| **รอเคสอะไร** | คลินิกอื่นที่มีหลายบริการอิสระต่อผู้รับบริการหนึ่งคนในหน้าเดียว — เช่น งานชุมชน (§2) หรือ childcare (§3.5) ที่จะเป็นโมดูลแยก |
| **บันทึกเมื่อ** | 23 ส.ค. 2569 |

---

### 64. StudentImportPopup (นำเข้าสเปรดชีตรายห้อง — เลือกไฟล์ → เลือกปลายทาง → preview → นำเข้าเฉพาะแถวที่ผ่าน) — 🕐 รอเคสที่ 2

| | |
|---|---|
| **ใช้อยู่ที่** | `src/pages/clinic/school-health/StudentImportPopup.jsx` — เปิดจาก `StudentRegistryPage.jsx` (นำเข้ารายชื่อนักเรียนรายห้อง) — 1 ที่ |
| **หน้าที่** | Popup นำเข้า Excel/CSV: เลือกไฟล์ → เลือกปลายทาง โรงเรียน→ชั้น→ห้อง→ปีการศึกษา (ตามคู่มือ HCIS §2.3.1) → ตาราง preview พร้อมรายงานแถว error (เลขบัตรซ้ำ/ผิดรูปแบบ · วันเกิดในอนาคต · ข้อมูลไม่ครบ) → นำเข้าเฉพาะแถวที่ผ่าน |
| **ทำไมไม่มีของเดิมแทน** | โครงเดียวกับ `CheckupImportPopup` (โมดูล checkup §1.19.2) แต่เพิ่มขั้นเลือกปลายทางแบบ cascade — DS ยังไม่มี popup นำเข้าสเปรดชีตกลาง |
| **โครง API** | ถ้ามีผู้ใช้ที่ 3 ควรทำ `SpreadsheetImportPopup` กลางใน DS: `<SpreadsheetImportPopup columns validators destinationFields onImport />` แล้วให้ checkup + school-health (+โมดูลที่ 3) ส่ง config |
| **รอเคสอะไร** | โมดูลที่ 3 ที่ต้องนำเข้าสเปรดชีต — ผู้ใช้จริงตอนนี้มี 2 ราย (CheckupImportPopup + StudentImportPopup) แต่ยังเป็นโค้ดแยกกัน 2 ชุด ยังไม่ได้ออกแบบ API กลางร่วมกัน |
| **บันทึกเมื่อ** | 23 ส.ค. 2569 |

### 65. CarriedDentalPanel (ผลตรวจทันตกรรมที่ส่งไปแสดงในคลินิกส่งเสริม — อ่านอย่างเดียว + ปุ่มส่งตรวจ) — 📐 มี 3 ผู้ใช้แล้ว พร้อมยกขึ้น DS

| | |
|---|---|
| **ใช้อยู่ที่** | `src/components/dental/CarriedDentalPanel.jsx` — ANC (`AncSteps.jsx` step 3) · NCD ติดตาม (`NcdFollowUpPage.jsx`) · เยี่ยมบ้าน (`HomeVisitSteps.jsx` step 2) — 3 ที่ |
| **หน้าที่** | แผงอ่านอย่างเดียวที่ดึงผลตรวจ/หัตถการทันตกรรมล่าสุดของ HN นั้นมาแสดงในคลินิกส่งเสริม (สถานะการตรวจฟันแปลผลอัตโนมัติ เกิน 6 เดือน = ควรตรวจซ้ำ · การวินิจฉัย · ตารางหัตถการพร้อมหน่วยนับ ซี่/ด้าน/ครั้ง) + ปุ่ม "ส่งตรวจทันตกรรม" ที่สร้าง **คำขอ** ไม่ใช่ Visit ใหม่ (มติ คทง.6 ครั้งที่ 3 · TOR §1.10.2.8) |
| **ทำไมไม่มีของเดิมแทน** | รูปแบบเดียวกับ `CarriedScreeningPanel` (ผลคัดกรองจากจุดคัดกรอง) แต่ต้นทางคนละโมดูลและมี action ส่งกลับ — DS ยังไม่มี "carried result panel" กลาง |
| **โครง API** | ควรทำ `<CarriedResultPanel source="dental|screening|lab" hn patientName from onRequest />` กลางใน DS แล้วให้ทันตกรรม/คัดกรอง/Lab ส่ง adapter ของตัวเอง — ตัวแผง (หัวข้อ + badge สถานะ + InfoPair แถว + ตาราง + แถบ read-only + ปุ่ม action) เหมือนกันหมด |
| **รอเคสอะไร** | มีผู้ใช้ครบ 3 ที่แล้ว รอเคาะ API `CarriedResultPanel` ร่วมกับเจ้าของ `CarriedScreeningPanel` ก่อนยกขึ้น DS |
| **บันทึกเมื่อ** | 23 ส.ค. 2569 |

### 66. ResultsInboxTab (To-Do List ผลตรวจ Lab/X-ray ที่ยังไม่มีใครรับทราบ) — 🕐 รอเคสที่ 2

| | |
|---|---|
| **ใช้อยู่ที่** | `src/data/resultsInbox.js` + แท็บ "ผลตรวจรอรับทราบ" ใน `src/pages/treat/TreatmentQueuePage.jsx` — 1 ที่ |
| **หน้าที่** | รวมผล Lab + X-ray ที่ออกแล้ว (terminalForDoctor) ของแพทย์ผู้สั่ง เป็นรายการเดียว เรียงวิกฤต→ผิดปกติ→ปกติ พร้อมปุ่ม "รับทราบผล" ที่ประทับชื่อ+เวลา (มติ คทง.1 — ผู้ป่วยกลับบ้านแล้วผลยังต้องมีคนตาม) |
| **ทำไมไม่มีของเดิมแทน** | ไม่มี inbox กลางใน DS; worklist ของ Lab/X-ray เป็นมุมของห้องแล็บ/รังสี ไม่ใช่มุมของแพทย์ผู้สั่ง |
| **โครง API** | ถ้ามีผู้ใช้ที่ 2 (เช่น พยาบาล OPD หรือหน้า Hub) ควรทำ `<ResultsInbox owner scope onAcknowledge />` กลาง แล้วให้ทุกหน้าเรียกด้วย owner ต่างกัน |
| **รอเคสอะไร** | หน้าที่ 2 ที่ต้องแสดง inbox เดียวกัน — คาดว่าเป็น Hub/หน้าแรกของแพทย์ |
| **บันทึกเมื่อ** | 23 ส.ค. 2569 |

### 67. daycareCore + โมดูลสถานรับเลี้ยงเด็กกลางวัน (แจ้งเตือนกิจกรรมตามอายุ · แปลผลโภชนาการเด็กปฐมวัย) — 🕐 รอเคสที่ 2

| | |
|---|---|
| **ใช้อยู่ที่** | `src/data/daycareCore.js` + 5 หน้าใน `src/pages/clinic/daycare/` — 1 โมดูล |
| **หน้าที่** | เครื่องยนต์แจ้งเตือน "กิจกรรมที่ถึงกำหนดตามอายุเด็ก" (`getChildAlerts`) 3 ระดับ upcoming/due/overdue ล่วงหน้า 7 วันและค้างเมื่อเกินกำหนด + แปลผลภาวะโภชนาการเด็ก 0–5 ปีจากน้ำหนักตามเกณฑ์ส่วนสูง (`interpretGrowth`) + นัดประเมินพัฒนาการครั้งที่ 2 อัตโนมัติ |
| **ทำไมไม่มีของเดิมแทน** | อนามัยโรงเรียนใช้ BMI for Age 5–19 ปีและรอบบริการรายเทอม คนละเกณฑ์กับเด็กปฐมวัยที่อิงอายุเป็นเดือน; ไม่มี alert engine กลางใน DS |
| **โครง API** | ถ้ามีโมดูลที่ 2 ที่ต้องเตือน "กิจกรรมตามอายุ/รอบเวลา" (เช่น ANC ตามอายุครรภ์, NCD ตามรอบนัด) ควรทำ `buildScheduleAlerts({ subject, rules, leadDays })` กลาง แล้วให้แต่ละโมดูลส่ง rules ของตัวเอง |
| **รอเคสอะไร** | โมดูลที่ 2 ที่ต้องการ alert engine แบบเดียวกัน |
| **บันทึกเมื่อ** | 24 ส.ค. 2569 |

### 68. StatTile — เลข 0 แสดงเป็น "ศูนย์ขีดทับ" อ่านเป็นสัญลักษณ์ห้าม — 🐞 ข้อสังเกตด้าน typography รอเจ้าของ DS เคาะ

| | |
|---|---|
| **พบที่** | `StatTile` ใน `src/pages/clinic/school-health/schoolHealthShared.jsx` — ใช้ที่ `/clinic/daycare/monitoring` และ Dashboard อนามัยโรงเรียน |
| **อาการ** | ค่า `value={0}` เรนเดอร์ด้วย `--type-family-heading-graphic2` (= **Mitr**) ซึ่ง glyph เลข 0 เป็น *slashed zero* — ที่ขนาด 24px อ่านเป็นสัญลักษณ์ 🚫 "ห้าม/ไม่อนุญาต" แทนที่จะเป็นเลขศูนย์ ทำให้การ์ด "ถึงกำหนดวันนี้ 0 รายการ" ดูเหมือนแจ้งเตือนแทนที่จะเป็นข่าวดี |
| **ทำไมยังไม่แก้** | เป็น typography ของ DS ที่มีอยู่ก่อนและกระทบโมดูลอนามัยโรงเรียนที่ส่งมอบไปแล้วด้วย — การเปลี่ยน font stack ของ StatTile เป็นการตัดสินใจของเจ้าของ design system ไม่ใช่แก้เฉพาะหน้าในโมดูลใหม่ |
| **ทางเลือกที่เสนอ** | (ก) เปลี่ยน StatTile ให้ใช้ `--type-family-heading-content` เหมือน summary card ของ QueuePageShell ซึ่งเลข 0 ปกติ · (ข) เพิ่ม `font-feature-settings: "zero" 0` ถ้า Mitr มี feature นี้ · (ค) ยอมรับตามนี้ถ้า Figma ตั้งใจใช้ Mitr |
| **บันทึกเมื่อ** | 24 ส.ค. 2569 |

---

## Token ที่รอ sync เข้า mih-design

ทะเบียนของ **design token ที่ mirror ในนี้ (`src/styles/tokens.css` + `design.md`) ล้ำหน้า
repo `mih-design`** — เกิดจาก typography sweep (Mitr) + redesign SecondarySearch เมื่อ 8 ส.ค. 2569
(PR #55) mirror ฝั่งนี้ใช้งานได้จริงแล้วทั้งหมด แต่ยังไม่ได้เปิด PR ฝั่ง `mih-design`
(`packages/design-tokens`) — ใครจะรัน `npm run tokens:pull` ต้องรอ sync ก่อน ไม่งั้น token
กลุ่มนี้จะถูกเขียนทับหาย

### T1. กลุ่ม typography title/button — 📐 เคาะครบแล้ว รอแค่เปิด PR mih-design

| Token | ค่า | alias ของ | ผู้ใช้ |
|---|---|---|---|
| `--type-weight-title` | 400 | `typography.weight.regular` | 216 จุด / 110 ไฟล์ (h1–h4, SubHeader, Popup, Topic, Table Header/FooterCell, card titles) |
| `--type-size-title` | 16px | `typography.size.base` | Popup · SubHeader · SummaryCardsBar · ObservationExternalReferForm |
| `--type-size-table-title` | **12px คงที่** | *(primitive จงใจ — ยกเว้นจาก data-font-size remap)* | Table.jsx HeaderCell |
| `--type-family-button` | Mitr | `typography.family.heading-content` | ปุ่ม 7 ตระกูล + mobile `_base` |
| `--type-size-button-xl/lg/md/sm` | **18/16/16/14px คงที่** | *(primitive จงใจ — ยกเว้น remap)* | ปุ่มชุดเดียวกัน (xl = BrandButton 52px) |
| `--type-size-content` | 14px | `typography.size.sm` | index.css body default + Table.jsx |
| ~~`--type-weight-button`~~ | — | — | ❌ ตัดทิ้งแล้ว (ไม่มีผู้ใช้จริง — alias ซ้อน alias) |
| ~~`--type-family-statussummarycard-number`~~ | — | — | ❌ ตัดทิ้งแล้ว — ใช้ `--type-family-body` ตรง ๆ + exception note ใน design.md |

**ประเด็นรอเคาะ:** ~~เคาะแล้ว 8 ส.ค. 2569~~ —
1. ✅ `--type-weight-button` **ตัดทิ้งแล้ว** (`--mobile-button-type-weight` ชี้ `--type-weight-title` แทน)
2. ✅ `--type-family-statussummarycard-number` **ตัดทิ้งแล้ว** — SummaryCardsBar ใช้ `--type-family-body` ตรง ๆ + exception note ใน design.md (§3 Family + §4 StatusSummaryCard)
3. ⏳ ยังต้องทำตอนเปิด PR mih-design: บันทึกเจตนา **fixed literal** ของกลุ่ม `button-*` + `table-title` — กันรอบ pull หน้ามีคนแก้กลับเป็น alias แล้วปุ่ม/หัวตารางบวมตาม accessibility font-scale

**รายการสุดท้ายที่ต้องเพิ่มใน mih-design (หลังเคาะ):** `--type-weight-title` · `--type-size-title` · `--type-size-table-title` (12px fixed) · `--type-family-button` · `--type-size-button-xl/lg/md/sm` (fixed) · `--type-size-content`

### T2. focus ring ของ SecondarySearch — ✅ เคาะแล้ว (8 ส.ค. 2569): ใช้ `--focus-ring-input-hover` เดิม

| | |
|---|---|
| **ผลการเคาะ** | ตัด `--ring-secondarysearch` ทิ้งแล้ว — `SecondarySearch.jsx` ใช้ `--focus-ring-input-hover` (ค่า = Figma effect `input/100` = `rgb(brand-p600 / 0.15)`, `box-shadow: 0 0 0 4px` ตอน hover/typing) ตัวเดียวกับ InputField |
| **ผลต่อ mih-design** | ไม่ต้องเพิ่ม token ใหม่ข้อนี้เลย — `--focus-ring-input-hover` มีอยู่แล้ว |

### T3. ฝั่ง retire + เปลี่ยนค่า (ต้องลบ/แก้ใน mih-design ให้ตรง mirror) — 📐 ค่าชัดแล้ว รอแค่เปิด PR

- ลบ state **focus** ของ search ทั้งคู่: `text/border/icon.primarySearch.focus`, `*.secondarySearch.focus` (focused = typing แล้ว)
- ลบ `shadow.secondarySearch` (เปลี่ยนเป็น ring)
- `border/icon/text.secondarySearch.*` เปลี่ยน brand เขียว → **neutral**: default/filled = neutral-300 (border) / neutral-400 (icon,text) · hover/typing = neutral-700 (icon,text) ส่วน border hover/typing ยัง brand-p700
- ⚠️ design.md ขัดกันเอง: §4 บอก `border.secondarySearch.hover` = **p700** (ตรงกับโค้ด) แต่ §6.17.5 เขียน **p600** — ต้องเคาะค่าเดียวตอน sync

**บันทึกเมื่อ** 8 ส.ค. 2569 · อ้างอิง PR #55

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

## 69. XraySlotPicker — ปฏิทินจองคิวตรวจรังสี

- **ไฟล์:** `src/components/xray/XraySlotPicker.jsx` · data layer `src/data/xraySchedule.js`
- **ใช้ที่:** `/xray/order` (TOR §1.12.3) — 1 ที่
- **สถานะ DS:** ยังไม่มีใน Figma/design.md — เป็น **composition** ของ DS ที่มีอยู่แล้ว
  (`forms/Calendar` + `timeslot/Timeslot` + `alert/Alert` + `badge/StatusBadge`)
  ไม่ได้สร้าง primitive ใหม่ จึงไม่ต้องยกขึ้น DS จนกว่าจะมีผู้ใช้ที่ 2
- **ยกขึ้น DS เมื่อ:** มีระบบอื่นต้องจองห้อง/ทรัพยากรตามช่วงเวลา (เช่น ห้องหัตถการ,
  ห้องทันตกรรม) → ตอนนั้นค่อยถอดเป็น `ResourceSlotPicker` ทั่วไป

### ส่วนที่แก้ใน DS component เดิม (additive, backward compatible)

- `forms/Calendar.jsx`
  - `locale='th'` — ชื่อเดือน/วันภาษาไทย + ปี พ.ศ. (default `'en'` เหมือนเดิม
    ผู้เรียกเดิม DateFilterPopup / DatePicker ไม่กระทบ)
  - `fullLabel` รับ **function `(Date) => string`** ได้แล้ว — วันที่ห้องปิดขึ้น "ปิด"
    ส่วนวันที่เต็มขึ้น "เต็ม" (เดิมเป็น string เดียวจึงบอกได้อย่างเดียว)
  - **ควรผลักกลับเข้า Figma** ทั้ง 2 ข้อ — ปฏิทินไทยเป็นค่า default ที่ถูกกว่าสำหรับ
    ระบบนี้ และ "ปิด ≠ เต็ม" เป็นข้อมูลคนละอย่าง

## 70. PatientCard — แถวแพ้ยา/โรคประจำตัว inline + ปุ่มประวัติการรักษา (มติผู้ใช้ 24 ส.ค. 69)

- **ไฟล์:** `src/components/card/PatientCard.jsx`
- Label "แพ้ยา" / "โรคประจำตัว" ย้ายมาอยู่ **บรรทัดเดียวกับ badge** ทั้ง 2 โหมด
  (เดิม full layout วางไว้บรรทัดบน — Figma 150:33649)
- ค่าในแถวข้อมูลผู้ป่วย (เพศ/อายุ/เลขบัตร/หมู่เลือด/ประเภท/แพทย์/สิทธิ์/ที่อยู่)
  เปลี่ยนจาก `font-bold` → `font-normal`
- ปุ่ม **ประวัติการรักษา** ใหม่ที่ท้ายแถว เปิด `MedicalHistoryPopup`
  (โหลดแบบ `React.lazy` เพราะ popup นั้น import กลับมาที่ `TreatmentSteps` —
  static import จะพา PatientCard เข้าไปอยู่ใน cycle เดิมและเสี่ยง TDZ)
  - props ใหม่: `onMedicalHistory` (override การกด) · `showMedicalHistory` (ซ่อนปุ่ม)
- **ต้องอัปเดต Figma** — ทั้ง 3 ข้อต่างจาก 150:33649 / 343:5629 ที่ catalog ไว้

## 71. StepProgress — สลับเป็นเลขซ้าย/ข้อความขวาเมื่อ scroll (มติผู้ใช้ 24 ส.ค. 69)

- **ไฟล์:** `src/components/step/StepProgress.jsx` · `src/hooks/useGlobalHeaderMorph.js`
- prop ใหม่ `inlineWhenMorphed` (default `false` — ผู้เรียกเดิมไม่กระทบ);
  `WizardMorphHeader` เปิดให้เอง แถบ step ทุกหน้าที่ใช้ scroll-morph จึงได้ทันที
- ใช้ `useHeaderMorphedFlag()` — อ่าน `<html data-header-morphed>` ที่
  `useGlobalHeaderMorph` เขียนอยู่แล้ว ผ่าน MutationObserver จึง **ไม่มี scroll
  listener ตัวที่สอง** และ re-render แค่ตอนข้าม threshold (0.55)
- เหตุที่ต้อง flip ไม่ใช่ interpolate: `flex-direction` interpolate ไม่ได้
- ระยะบน-ล่างของแถบ step ก่อน scroll ลดลง (`PageHeaderInfoPanel` dense
  paddingBottom 24→12px · `morphStepOnlyRootDenseStyle` paddingTop 12→8px)

## 72. EDocumentBuilderPopup + EDocumentSheet — สร้าง e-Document ในระเบียนผู้ป่วย (TOR §1.10.8.4)

- **ไฟล์:** `src/components/form-builder/EDocumentBuilderPopup.jsx` ·
  `src/components/form-builder/EDocumentSheet.jsx`
- **ใช้ที่:** `/clinic/family-planning/record` ขั้นตอนที่ 7 — 1 ที่
- **สถานะ DS:** composition ของ form-builder ที่มีอยู่แล้ว
  (`FormBuilderPalette` + `FormBuilderCanvas` + `FormBuilderPatientPreview`
  ใน `Popup`) ไม่ได้สร้าง primitive ใหม่
- **ยกขึ้น DS เมื่อ:** คลินิกอื่นต้องออก e-Document เองบ้าง (ANC, NCD, สังคมสงเคราะห์)
  → ตอนนั้นถอดเป็น `<ClinicalEDocumentSection value onChange />` ใช้ร่วมกัน

### ทำไมต้องมี EDocumentSheet แยกจาก FormBuilderPatientPreview

`FormBuilderPatientPreview` เป็น mock จอมือถือ 320px — ถูกสำหรับออกแบบฟอร์มที่
คนกรอกบนมือถือ แต่**ผิดสำหรับกระดาษที่ยื่นให้ผู้รับบริการเซ็น** `EDocumentSheet`
จึงเรนเดอร์บล็อกชุดเดียวกันเป็นใบ A4 มีเส้นประให้เขียน + ช่องลายเซ็น

### ส่วนที่แก้ของเดิม (additive, backward compatible)

- `useFormBuilder(opts)` — รับ `{ blocks, name, storageKey }` ได้แล้ว
  (`storageKey: null` = host เก็บเอง ไม่แตะ localStorage ของคลังเอกสาร);
  `publish()` คืน `blocks` มาด้วย · เรียกแบบไม่ส่ง opts ได้ผลเหมือนเดิมทุกอย่าง
- `formBuilderModel.js` — เพิ่ม `blocksFromLibraryForm` / `rekeyBlocks` /
  `countBlockFields`
- `familyPlanningVisits.js` — เพิ่ม `eDocuments: []` (คง `eDocBlocks` ไว้เป็น alias
  ของเอกสารใบแรก เผื่อโค้ดเดิม)

### บทเรียนที่ควรจำ

- คลังเอกสารเก็บ template เป็น preview แบน ๆ (`sections[].fields[]`) ไม่ใช่ schema จริง
  → ต้อง map ก่อนเข้า builder และ **ต้องยุบ checkbox ที่ติดกันให้เป็นบล็อกเดียว**
  ไม่งั้นหัวข้อ "การยินยอม" จะซ้ำ 4 บรรทัดบนใบพิมพ์ (เจอตอนตรวจหน้าจริง)
- print stylesheet ต้อง scope ด้วย attribute ของตัวเองบน `<html>` และ **portal
  ใบพิมพ์ไปที่ `document.body`** — กฎ `body > *:not(.print-only)` จะซ่อน `#root`
  ไปด้วยถ้าใบพิมพ์ฝังอยู่ข้างใน แล้วพิมพ์ออกมาได้หน้าเปล่า

## 73. AccessRequestHistoryTimeline — timeline แบ่งคอลัมน์ (มติผู้ใช้ 25 ส.ค. 69)

`src/components/consent/AccessRequestHistoryTimeline.jsx` — ใช้ใน popup
"ประวัติคำขอเข้าถึงข้อมูล" (`CreateConsentRequestHeaderAction`)

- **ปัญหาของเดิม:** เป็นการ์ดเรียงกัน ยัด 2 ฟิลด์ต่อบรรทัดคั่นด้วย "·"
  (`reqNo · name` / `reason · date`) ไม่มีอะไร align กัน กวาดตาลงมาเทียบข้าม
  รายการไม่ได้ · ไม่มีหัวคอลัมน์บอกว่าวันที่ที่เห็นคือวันที่ยื่นคำขอ ไม่ใช่ช่วง
  ที่ขอเข้าถึง · ใช้ `patientName || name` ช่องเดียวทั้งที่เป็นคนละคน
  (ผู้ขอ vs ผู้รับบริการ) · `slice(0, 12)` ตัดเงียบ ๆ ไม่บอกว่าเหลืออีกเท่าไร
- **ของใหม่:** grid `gridTemplateColumns` สตริงเดียวใช้ทั้งหัวตารางและทุกแถว
  → คอลัมน์ตรงกันเสมอ · รางเวลาซ้ายสุด (เส้น + จุดสีตามสถานะ) · หัวข้อเดือน
  sticky ผ่าน `GroupedTimeline` ที่มีอยู่แล้ว · หัวคอลัมน์ sticky
  · แสดงครบ 124 รายการ + บอกยอดรวมใน subtitle
- **คอลัมน์:** วันที่/เวลา · เลขคำขอ (+รหัสฟอร์ม) · ผู้ขอ (+หน่วยงาน) ·
  ผู้รับบริการ (+HN) · วัตถุประสงค์ (+purpose) · สถานะ
- **สถานะ DS:** composition ของ `GroupedTimeline` + `StickyTimelineDateHeader`
  + `ColorfulBadge` ที่มีอยู่แล้ว — ไม่ได้สร้าง primitive ใหม่ แต่ **โครง
  "timeline ที่แบ่งคอลัมน์"** ยังไม่มีใน DS
- **ยกขึ้น DS เมื่อ:** มีหน้าที่ 2 ต้องการ timeline แบบมีคอลัมน์ (เช่น audit log
  ของ `จัดการสิทธิ์`, ประวัติการแก้ไขแบบฟอร์ม) → ถอดเป็น
  `<ColumnTimeline columns rows groupBy />` ใช้ร่วมกัน

### บทเรียนที่ควรจำ

mock data ใน `accessRecords.js` ใช้ `i % 12` ทั้ง **เดือน** และ **ชื่อผู้ขอ**
(NAMES มี 12) และ `formCode` → ทุกรายการในเดือนเดียวกันกลายเป็นคนเดียวกันหมด
มองไม่ออกตอนเป็นการ์ด แต่พอทำเป็นคอลัมน์เห็นทันทีว่าซ้ำ 6 แถวรวด
**คูณ stride co-prime ไม่ช่วย** (`i*5 % 12` ยังอยู่ residue class เดิม) ต้องบวก
ค่าที่เดินหน้าเมื่อ `i` ครบรอบ — ใช้ `spread = Math.floor(i / MONTHS.length)`
