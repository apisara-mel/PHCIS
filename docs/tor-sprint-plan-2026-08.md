# TOR Vibe Sprint — 2 วัน (3–4 ส.ค. 2026) · Multi-agent plan

เป้าหมาย: vibe code ครอบคลุม TOR ทุกข้อที่อยู่ในขอบเขต เพื่อ confirm กับลูกค้า (ยังไม่ทำ Figma)
เครื่องมือ: workflow `build-tor-wave` (สร้างทีละ wave) + `tor-final-audit` (ตรวจรวมก่อน PR)
กติกากลางทุก agent: `docs/tor-wave-playbook.md`

## ขอบเขต

**ตัด** (คนอื่นทำ): §5 คลังยาและเวชภัณฑ์ (43 ข้อ) · §3 สุขภาพนักเรียน/Childcare (31 ข้อ) · §2 Community/สาธารณสุขชุมชน (16 ข้อ)
⚠️ ข้อสังเกต: "ระบบงานสาธารณสุข + งานควบคุมป้องกันฯ ในชุมชน" เป็นชื่อจากคู่มือ HCIS เดิม ใน TOR ใหม่ตรงกับ §2 Community ทั้งก้อน — **ควร confirm ขอบเขตกับทีมอีกครั้ง** เพราะ §1.18 เยี่ยมบ้าน, §1.10.12, §1.19.8–9 (กิจกรรมชุมชน) อยู่ฝั่งเรา และหลายจอฝั่งเราต้องมี map placeholder (GIS §2.3 เป็นของทีมอื่น → ใช้ mock map)

**คงเหลือในขอบเขต ≈ 703 ข้อ** — สถานะ ณ 3 ส.ค. (จาก `node scripts/tor-gap-report.mjs`, branch นี้ยังไม่รวม RIS/LIS ที่ done บน main แล้ว):

| หมวดที่ยังเหลืองานมาก | todo | หมายเหตุ |
|---|---|---|
| §1.10 คลินิกพิเศษ 12 คลินิก | 75 | เหลือ 11 คลินิก (ANC done เป็นต้นแบบ) — **ก้อนใหญ่สุด** |
| §1.5 CPOE | 42 | ส่วนใหญ่ partial; consult (1.5.6) / refer (1.5.8) ยังไม่มี module |
| §1.20 รายงาน/Dashboard | 40 | 1.20.5–1.20.10 แทบยังไม่เริ่ม |
| §1.7 สิทธิและเบิกจ่าย | 26 | Claim (1.7.4) ทั้งก้อน |
| §1.19 ตรวจสุขภาพ | 21 | ยังไม่เริ่ม |
| §1.3 คิว | 16 | จอเรียกคิว/แสดงผล/ตั้งค่า |
| §1.4 EMR | 14 | เศษ 1.4.3 + 1.4.7 การเชื่อมต่อ |
| §1.18 เยี่ยมบ้าน | 10 | ยังไม่เริ่ม (mock GPS/map) |
| §1.11 Immunization | 6 | ยังไม่เริ่ม |
| §1.16 Kiosk | 6+9p | biometric, e-Receipt, ปิดสิทธิ |
| §1.1/§1.2/§1.13/§1.17 + Mobile §4 | ~25 รวม | เก็บเศษ partial |

เกือบเสร็จแล้ว (เก็บเศษใน Wave 3): §1.6 นัดหมาย 91% · §1.8 การเงิน 98% · §1.9 เภสัช 98% · §1.14 Observation 100% · Mobile §4 ~90%

## Setup ก่อน Wave 1 (main loop ทำเอง ไม่ใช้ workflow)

1. `git fetch && git checkout -b feature/tor-sprint-aug2026 origin/main` — **ต้องแตกจาก main** (branch ปัจจุบันตามหลัง 15 commits และไม่มี X-Ray/RIS)
2. ตรวจว่า `scripts/tor-gap-report.mjs`, `docs/tor-wave-playbook.md`, `.claude/workflows/*.js`, แผนนี้ อยู่บน branch ใหม่ แล้ว commit เป็น commit แรก
3. รัน `node scripts/tor-gap-report.mjs` อีกรอบบน main-based branch เพื่อ freeze ตัวเลขจริง (RIS/LIS ควรขยับเป็น done)

## Wave 1 — คลินิกพิเศษ ชุด 1 (Day 1 เช้า, ~6 โมดูล / ~25 agents)

```json
[
  {"id":"1.10.1","name":"งานทันตกรรม","route":"/clinic/dental","dir":"src/pages/clinic/dental","manual":"คู่มือระบบทันตกรรม.pdf","notes":"มี dental chart — เช็ค BodyDiagramPanel/BodyMark ก่อนสร้างใหม่"},
  {"id":"1.10.2","name":"งานกลุ่มโรคเฉพาะ NCD","route":"/clinic/ncd","dir":"src/pages/clinic/ncd","notes":"DM/HT/Asthma/COPD — reuse กราฟ DmControlGaugeCard, HtControlGaugeCard, DmComplicationsCard ที่มีแล้ว"},
  {"id":"1.10.3","name":"งานสุขภาพจิต","route":"/clinic/mental-health","dir":"src/pages/clinic/mental-health","manual":"คู่มือระบบสุขภาพจิตและคลินิกสุขภาพจิต.pdf","notes":"แบบประเมิน 2Q/9Q/8Q เป็น form step"},
  {"id":"1.10.4","name":"งานวัณโรค","route":"/clinic/tb","dir":"src/pages/clinic/tb","manual":"คู่มือระบบวัณโรค.pdf","notes":"DOT tracking + ผล Lab/X-ray link"},
  {"id":"1.10.5","name":"งานบำบัดสารเสพติด","route":"/clinic/addiction","dir":"src/pages/clinic/addiction","manual":"คู่มือระบบงานบำบัดและรักษาผู้ป่วยติดสารเสพติด.pdf","notes":"มีข้อ GIS 1.10.5.9 → mock map"},
  {"id":"1.10.6","name":"งาน HIV และโรคติดต่อทางเพศสัมพันธ์","route":"/clinic/hiv-sti","dir":"src/pages/clinic/hiv-sti","manual":"คู่มือระบบงานคลินิกโรคติดต่อทางเพศสัมพันธ์และโรคเอดส์.pdf","notes":"ข้อมูลลับ §1.4.2 — ต้องมี confidential gate"}
]
```

→ เสร็จแล้ว: commit + push + PR "feat(clinics): คลินิกพิเศษชุด 1 — TOR §1.10.1–1.10.6" + merge

## Wave 2 — คลินิกพิเศษ ชุด 2 + ระบบใหม่ (Day 1 บ่าย)

```json
[
  {"id":"1.10.8","name":"งานวางแผนครอบครัว","route":"/clinic/family-planning","dir":"src/pages/clinic/family-planning","manual":"คู่มือระบบคลินิกส่งเสริมสุขภาพ(วางแผนครอบครัว).pdf"},
  {"id":"1.10.9","name":"งานสร้างเสริมภูมิคุ้มกัน + ทะเบียนวัคซีน","route":"/clinic/immunization","dir":"src/pages/clinic/immunization","extraSections":["1.11"],"manual":"คู่มือระบบงานสร้างเสริมภูมิคุ้มกันโรค.pdf","notes":"ครอบ §1.11 IIS ด้วย — ทะเบียนวัคซีน + บันทึกการให้"},
  {"id":"1.10.10","name":"งานเวชศาสตร์ฟื้นฟูและกายภาพบำบัด","route":"/clinic/rehab","dir":"src/pages/clinic/rehab","manual":"คู่มือระบบงานสังคมสงเคราะห์และเวชศาสตร์ฟื้นฟู.pdf"},
  {"id":"1.10.11","name":"งานสังคมสงเคราะห์","route":"/clinic/social-work","dir":"src/pages/clinic/social-work","manual":"คู่มือระบบงานสังคมสงเคราะห์และเวชศาสตร์ฟื้นฟู.pdf"},
  {"id":"1.10.12","name":"เยี่ยมบ้าน + Home Visit","route":"/homevisit","dir":"src/pages/homevisit","extraSections":["1.18"],"notes":"§1.18 ทั้งก้อน: คิวนัดเยี่ยม, mock map/GPS, vitals จาก device, link EMR/CPOE/Telemed"},
  {"id":"1.19","name":"ระบบงานตรวจสุขภาพ","route":"/checkup","dir":"src/pages/checkup","manual":"คู่มือระบบงานส่งเสริมสุขภาพเฉพาะกลุ่มที่สำคัญ.pdf","notes":"Package, import spreadsheet, คัดกรอง 7 แบบ, แปลผลอัตโนมัติ, กิจกรรมชุมชน — โมดูลใหญ่ ใช้ 21 ข้อ"}
]
```

→ PR "feat(clinics,checkup): คลินิกพิเศษชุด 2 + ตรวจสุขภาพ + เยี่ยมบ้าน — TOR §1.10, §1.11, §1.18, §1.19" + merge

## Wave C — Consent Management ให้จบ (แทรกก่อนกลับไป Wave 1 — คำสั่ง user 3 ส.ค. ~18:20)

รันเดี่ยว (โมดูลเดียว ไม่ชนใคร) ด้วย build-tor-wave args:

```json
[
  {"id":"ด.1.1","name":"Consent Management ผนวก ด (ปิดให้ครบ 18 ข้อ)","route":"/consent","dir":"src/pages/consent","notes":"รันเดี่ยว แก้ได้ทั้ง src/pages/consent, src/pages/users, src/pages/forms, src/components/popup/Consent* ที่เกี่ยว โฟกัส: ด.1.1.12 template สร้าง dashboard, ด.1.1.17 จัดการการเข้าถึง (สแกนแบบฟอร์ม/สิทธิตามช่วงเวลา/Active), ด.1.1.18 สิทธิเข้าถึงตามระดับความยินยอม + ไล่ปิด partial 11 ข้อ (รายงาน 16.1–16.5 ที่เป็น stub, Re-Consent flow, version control, ช่องทางลงนาม) อ่าน ~/MIH-Docs-Vault/tor-consent-compliance.md + consent-management-ui-*.md ก่อน"}
]
```

## Wave R — Registration + OPD (แทรกหลัง Wave C ก่อนกลับ Wave 1 — คำสั่ง user 3 ส.ค. ~23:15)

สองโมดูลรันขนานกันได้ (คนละ dir) ด้วย build-tor-wave args:

```json
[
  {"id":"1.1","name":"ระบบงานเวชระเบียน (Registration) — ปิด gap","route":"/registration","dir":"src/pages/registration","manual":"คู่มือระบบเวชระเบียน.pdf","notes":"เก็บเฉพาะข้อ todo 7 + partial 8 จาก node scripts/tor-gap-report.mjs --section 1.1 — ระบบเดิมสร้างแล้ว (RegistrationQueuePage/FormPage/ConsentFillPage + RegistrationSteps ใน src/components/forms) ต่อยอดของเดิม ห้ามรื้อ อนุญาตแก้ src/pages/registration + src/components/forms/RegistrationSteps + src/data/mrPatients.js,registrationForm.js"},
  {"id":"1.2","name":"ระบบงานผู้รับบริการนอก (OPD) — ปิด gap","route":"/opd","dir":"src/pages/opd","manual":"คู่มือระบบคลินิกตรวจรักษา.pdf","notes":"เก็บเฉพาะข้อ todo 6 + partial 7 จาก node scripts/tor-gap-report.mjs --section 1.2 — ระบบเดิมสร้างแล้ว (QueuePage 946 + ScreeningPage 979) ต่อยอดของเดิม ห้ามรื้อ อนุญาตแก้ src/pages/opd + src/data/opdScreeningDrafts.js"}
]
```

## Wave Q — ระบบบริหารจัดการคิว §1.3 (แทรกหลัง Wave R — คำสั่ง user 4 ส.ค. ~11:40)

แยกเป็น 2 โมดูลรันขนาน (คนละ dir — จอ TV มีดีไซน์ Figma เฉพาะ):

```json
[
  {"id":"1.3","name":"ระบบบริหารจัดการคิว (ฝั่งเจ้าหน้าที่)","route":"/queue-center","dir":"src/pages/queue-center","notes":"todo 16 + partial 5 — ยังไม่มีโมดูลคิวกลาง สร้างใหม่: 1.3.1 จัดการคิว (จัดลำดับ/พัก/โอนจุดบริการ), 1.3.2 การออกคิว (บัตรคิว/barcode/พิมพ์ซ้ำ), 1.3.3 การเรียกคิว (เรียก/เรียกซ้ำ/ข้าม), 1.3.5 การเสร็จสิ้นคิว, 1.3.6 การเชื่อมต่อข้อมูล (ผูก OPD/registration/finance/pharmacy queue ที่มีอยู่), 1.3.7 ตั้งค่า (ผังจุดบริการ/รูปแบบรหัสคิว/เสียงเรียก) ห้ามสร้างจอ TV (อีกโมดูลทำ) แต่ต้องสร้าง src/data/queueCenterStore.js เป็น store กลางที่จอ TV จะ import ด้วย — export: currentByStation, nextQueues, passedNumbers, remainingCount, announcements reuse pattern ปุ่มเรียกคิวจาก finance (PR#33) + QueuePageShell ห้ามแตะ src/pages/opd, src/pages/registration"},
  {"id":"1.3.4","name":"จอ TV แสดงผลการเรียกคิว (Figma)","route":"/queue-center/display","dir":"src/pages/queue-display","notes":"TOR §1.3.4 — สร้าง 3 เลย์เอาต์จาก Figma file tobdR9prwt00v4X3aSMsxF: TV1 hall node 129:62395, TV2 station node 129:62394, TV3 finance node 129:62393 บังคับ: อ่าน docs/queue-tv-design-spec.md ก่อน แล้วโหลด guidance ผ่าน ReadMcpResourceTool (server 'claude.ai Figma', uri skill://figma/figma-design-to-code/SKILL.md) แล้วเรียก mcp__claude_ai_Figma__get_design_context ทั้ง 3 node ด้วยตัวเอง (skillNames resource:figma-design-to-code) ก่อนเขียนโค้ด — ดาวน์โหลด asset โลโก้/ไอคอนจริงมาใช้ ห้ามวาด SVG เอง หน้าจอต้อง standalone ไม่มี sidebar/header ของแอป (ดู pattern /kiosk) สเกลเต็มจอทุกอัตราส่วน นาฬิกาเดินจริง คิวอัปเดตอัตโนมัติจาก src/data/queueCenterStore.js (ถ้ายังไม่มีให้ใช้ mock ของตัวเองใน src/data/queueDisplayMock.js แล้วรายงานใน notes) ห้ามแตะ src/pages/queue-center (อีกโมดูลทำอยู่)"}
]
```

## Wave E — EMR §1.4 (ต่อจาก Wave Q)

```json
[
  {"id":"1.4","name":"ระบบบันทึกข้อมูลอิเล็กทรอนิกส์ทางการแพทย์ (EMR)","route":"/treat/record","dir":"src/pages/treat","notes":"todo 14 + partial 16 จาก node scripts/tor-gap-report.mjs --section 1.4 — โฟกัส 1.4.3 ข้อมูลการรักษา (todo 8), 1.4.6 การจัดการเอกสาร, 1.4.7 การเชื่อมต่อ (todo 4), 1.4.2 ข้อมูลลับ, 1.4.4 Note, 1.4.11 ระบบเดิมสร้างแล้ว (TreatmentFormPage + TreatmentSteps + components/examination) ต่อยอด ห้ามรื้อ อนุญาตแก้ src/pages/treat, src/components/forms/TreatmentSteps, src/components/examination, src/data/treatmentVisits.js ห้ามแตะ src/pages/treat/anc (ANC done แล้ว) และ src/pages/clinic/*"}
]
```

## Wave S — บันทึกข้อมูลการรักษา CPOE §1.5 + SOAP (ต่อจาก Wave E — คำสั่ง user 4 ส.ค. ~13:20)

```json
[
  {"id":"1.5","name":"ระบบบันทึกข้อมูลการรักษา (CPOE) + SOAP Note","route":"/treat/record","dir":"src/pages/treat","notes":"todo 42 + partial 19 — ก้อนใหญ่ ทำตามลำดับความสำคัญ: 1.5.4 สั่งยา (todo 14 — DI/แพ้ยา/ซ้ำซ้อน/ขนาดตามน้ำหนัก/ยาเสพติด/high alert), 1.5.2 สั่ง LAB (todo 8), 1.5.3 สั่ง Radiology (todo 6), 1.5.6 ส่งปรึกษาแพทย์ Internal Consult (todo 4 + partial 3 — ยังไม่มี module เลย สร้าง /treat/consult), 1.5.8 Refer (todo 3 — สร้าง /treat/refer), 1.5.5 หัตถการ, 1.5.1 general order, 1.5.7 order set, 1.5.9 ตั้งค่า, 1.5.10 พิมพ์เอกสาร, 1.5.11 e-Document **เพิ่ม SOAP Note เป็น step แรกของการบันทึกการรักษา** (Subjective/Objective/Assessment/Plan) — S ดึงอาการสำคัญ+ซักประวัติจาก OPD screening, O ดึง vital signs + ผลตรวจร่างกาย, A ผูกกับ Diagnosis (ICD-10) ที่มีอยู่, P ผูกกับ order ทุกชนิดในหน้าเดียวกัน แต่ละช่องใช้ SuggestibleTextarea voice + suggestions + minChars และมี template SOAP ให้เลือก + ประวัติ SOAP ครั้งก่อนแบบ copy-forward ระบบเดิมสร้างแล้ว (TreatmentFormPage + TreatmentSteps + components/examination + components/popup/*Diagnosis*/*Medication*) ต่อยอด ห้ามรื้อ ห้ามแตะ src/pages/treat/anc, src/pages/clinic/*"}
]
```

## Wave A — ระบบรับนัดหมาย Appointment §1.6 (ต่อจาก Wave S)

```json
[
  {"id":"1.6","name":"ระบบจัดการตารางนัดหมาย (Appointment)","route":"/appointment","dir":"src/pages/appointment","notes":"§1.6 done 14 / partial 3 (91%) — ปิด partial ที่เหลือให้ครบ 100% แล้วขยายฝั่ง 'รับนัดหมาย': รับนัดจากคำขอผู้รับบริการ (mobile §4.2 ยิงคำขอเข้ามา), ยืนยัน/ปฏิเสธ/เลื่อนนัด พร้อมเหตุผล + แจ้งเตือนกลับ, นัดต่อเนื่องจากหน้าการรักษา (§1.4.12), นัดกลุ่ม/นัดซ้ำ (recurring), การจัดสรร resource ห้องตรวจ+แพทย์ซ้ำซ้อน ต้องเช็คก่อนยืนยัน รวมข้อ 1.6 ทั้งหมดที่ยัง partial ต่อยอด AppointmentPage/CalendarView/ListView/FormPopup ที่มีอยู่ ห้ามรื้อ อ่าน ~/MIH-Docs-Vault/tor-appointment-compliance.md ก่อน ห้ามแตะ src/pages/schedule (คนละระบบ — Schedule Mgmt อยู่ระดับเดียวกับ PHCIS)"}
]
```

## Wave T — Telemedicine §1.13 + Mobile §4.3 (ต่อจาก Wave A — คำสั่ง user 4 ส.ค. ~17:50)

```json
[
  {"id":"1.13","name":"Telemedicine + ตรวจผู้รับบริการระยะไกล (RPM)","route":"/telemed","dir":"src/pages/telemed","extraSections":["4.3"],"notes":"§1.13 done 5 / partial 5 / todo 1 + §4.3 mobile partial 3 — ปิดให้ครบ: 1.13.5 GIS แสดงตำแหน่งผู้รับบริการ (todo — ใช้ mock map แบบเดียวกับ AddressMapBlock), PDPA recording consent (1.13.8/1.13.9 — ผูกกับระบบ consent ที่เพิ่งทำเสร็จ ผนวก ด), รายงานสถิติการโทร, log การเข้าใช้งาน, การเชื่อมกับ PHCIS/EMR ระหว่างสาย, RPM รับค่าจากอุปกรณ์ ระบบเดิมสร้างแล้ว (TelemedConsultPage 3057 บรรทัด + components/telemed + TelemedCallProvider) ต่อยอด ห้ามรื้อ อนุญาตแก้ src/pages/telemed, src/components/telemed, src/pages/mobile/MobileTelemedPage.jsx, src/utils/telemed*.js อ่าน ~/MIH-Docs-Vault/tor-telemedicine-compliance.md + คู่มือ Telemed/ตัวอย่างคู่มือ Telamed.pdf ก่อน"}
]
```

## Wave L — ระบบงานห้องปฏิบัติการ LIS §1.15 (ต่อจาก Wave T — คำสั่ง user 4 ส.ค. ~20:00)

หมายเหตุ: §1.14 Observation done 100% แล้ว (8/8) ไม่ต้องทำซ้ำ · §1.15 checklist โชว์ todo 22 แต่โค้ดมีอยู่จริง 4,297 บรรทัด (PR#18) → **ต้อง audit หน้าจริงก่อน แล้วอัปเดตสถานะให้ตรง แล้วปิดเฉพาะที่ขาดจริง**

```json
[
  {"id":"1.15","name":"ระบบงานห้องปฏิบัติการ (LIS)","route":"/lab","dir":"src/pages/lab","manual":"คู่มือระบบชันสูตรโรค.pdf","notes":"checklist โชว์ todo 22 ทั้งหมดแต่โค้ดมีอยู่แล้ว (LabQueuePage 1512, LabSetupPage 1008, LabResultEntryPage 671, LabOrderPage 542, LabReportPage 118, LabDetailPanel 393) — ขั้นตอนบังคับ: (1) รัน node scripts/tor-gap-report.mjs --section 1.15 อ่านข้อความ TOR ทุกข้อ (2) เปิดโค้ดหน้าจริงทั้ง 6 ไฟล์ ตรวจว่าข้อไหนทำแล้ว → รายงาน checklistUpdates เป็น done พร้อม note ที่อ้างอิงโค้ดจริง (3) ข้อที่ยังขาดจริงค่อยสร้าง/ต่อยอด โฟกัสที่มักขาด: 1.15.3 พิมพ์สติกเกอร์ Lab + barcode หลอด, การรับสิ่งส่งตรวจ (specimen receive/reject พร้อมเหตุผล), ค่าวิกฤต critical value ต้องแจ้งและกดรับทราบ, ผลย้อนหลัง/เปรียบเทียบ, การส่งตรวจภายนอก (send-out lab), QC/สอบเทียบเครื่อง, การเชื่อมต่อ LIS analyzer, TMLT mapping (ดู ~/MIH-Docs-Vault/Kaebrain/Links.md → TMLT Browser) อ่าน ~/MIH-Docs-Vault/Kaebrain/คู่มือการใช้งาน - Lab.pdf + คู่มือระบบชันสูตรโรค.pdf ก่อน ต่อยอดของเดิม ห้ามรื้อ ห้ามแตะ src/pages/treat, src/pages/xray, src/pages/clinic/*"}
]
```

## Wave M — ระบบงานผู้ดูแลระบบ §1.17 (ต่อจาก Wave L — คำสั่ง user 5 ส.ค. ~00:00)

สถานะ: done 5 / partial 4 / todo 5

```json
[
  {"id":"1.17","name":"ระบบงานผู้ดูแลระบบ (Admin)","route":"/users","dir":"src/pages/users","notes":"todo 5 + partial 4 — ปิดให้ครบ: **1.17.1.1 Directory Service (OIDC/SAML)** สร้างหน้าตั้งค่าการเชื่อมต่อ IdP (provider, client id, endpoints, attribute mapping, ทดสอบการเชื่อมต่อ, สถานะ sync) แบบ UI + mock; **1.17.3 Routing คำสั่งยาระหว่างคลินิกกับห้องยา** — ตารางกติกา clinic→pharmacy พร้อมลำดับความสำคัญ/เงื่อนไข/fallback และตรวจกติกาซ้อนทับ; **1.17.5.3 บันทึกตารางการทำงานของผู้ใช้** (เชื่อมกับ /schedule ที่มีอยู่แบบอ่านอย่างเดียว ห้ามแก้ src/pages/schedule); **1.17.5.4 สลับศูนย์บริการที่กำลังให้บริการ** — center switcher ใน profile menu + ผลต่อ context ทั้งระบบ; **1.17.5.5 ระบบแจ้งเตือน** — ศูนย์รวมการแจ้งเตือน (รับส่งตัว/รับผล/ส่งตรวจ/ค่าวิกฤต) + ตั้งค่าช่องทางรายบุคคล; partial: 1.17.1.3 User Attribute ครบตาม TOR (Department, Department-Code, รหัสวิชาชีพ, Given/Last Name, Email, Title, Active), 1.17.4.1 OTP ยืนยันตัวตนตอนลงทะเบียน (mock อีเมล+SMS), 1.17.4.3 รายงานการใช้งาน + export XLS/PDF, 1.17.5.1 เข้าสู่ระบบหลายช่องทาง (QR scan + OTP) ระบบเดิม: src/pages/users (UsersAccessPage 466, UserEditPage 606), src/pages/system (centers/staff/roles), src/pages/assess (group policy/dept/position/ACL), src/pages/audit ต่อยอด ห้ามรื้อ อนุญาตแก้ src/pages/users, src/pages/system, src/pages/assess, src/pages/audit, src/data/usersAccess.js + centerStore.js + auditData.js ห้ามแตะ src/pages/schedule, src/pages/telemed, src/pages/lab, src/pages/clinic/*, src/pages/appointment"}
]
```

## Wave 3 — เก็บ gap ระบบเดิม (Day 2 เช้า)

โมดูลใน wave นี้แก้ไฟล์เดิมของระบบตัวเองได้ (ยังห้ามแตะ shared files เหมือนเดิม)

```json
[
  {"id":"1.5","name":"CPOE gaps + Consult/Refer","route":"/treat","dir":"src/pages/treat","notes":"เฉพาะข้อ todo/partial: 1.5.6 Internal Consult (สร้าง /consult ใหม่ใน dir นี้ได้), 1.5.8 Refer, 1.5.2 LAB order gaps, 1.5.4 Medication order gaps — อ่าน tor-pharmacy-compliance.md เรื่อง pharmacySupportingInfo consult/radiology ที่ block ไว้ด้วย"},
  {"id":"1.7","name":"สิทธิและการเบิกจ่าย + Claim","route":"/rights","dir":"src/pages/rights","notes":"1.7.3 ส่งเบิก + 1.7.4 Claim 12 ข้อ + 1.7.5 ตั้งค่า — pattern ตาราง+รายละเอียดแบบ finance; เช็คสิทธิ สปสช. mock online"},
  {"id":"1.3","name":"ระบบคิว: เรียกคิว/จอแสดงผล/ตั้งค่า","route":"/queue-center","dir":"src/pages/queue-center","notes":"1.3.3 เรียกคิว, 1.3.4 จอแสดงผล (display screen แยก route เต็มจอ), 1.3.5 เสร็จสิ้น, 1.3.6, 1.3.7 — reuse pattern จาก finance เรียกคิว PR#33"},
  {"id":"1.20","name":"รายงาน/Dashboard ที่เหลือ","route":"/dashboard","dir":"src/pages/dashboard","notes":"1.20.5 ผู้รับบริการ, 1.20.6 เภสัช, 1.20.7 คลินิกพิเศษ 11 ข้อ, 1.20.8 ตรวจสุขภาพ, 1.20.10 ผู้บริหาร — reuse graph cards ทั้งหมดใน src/components/graph"},
  {"id":"1.4","name":"EMR + Admin เศษที่เหลือ","route":"/treat/record","dir":"src/pages","notes":"เฉพาะข้อ todo ใน 1.4.3/1.4.6/1.4.7 + §1.17 admin 5 ข้อ + §1.1/§1.2 เศษ — โมดูลนี้กระจายหลาย dir ให้ระวังไม่ชนโมดูลอื่นใน wave; อีกงาน: §1.15 LIS สร้างเสร็จแล้ว (PR #18, src/pages/lab) แต่ checklist ยังโชว์ todo 22 ข้อ → audit หน้าจริงแล้วอัปเดตสถานะให้ตรงความจริง"},
  {"id":"1.16","name":"Kiosk + Telemed + Mobile เศษ","route":"/kiosk","dir":"src/pages/kiosk","extraSections":["1.13"],"notes":"kiosk: ปิดสิทธิ 1.16.2, e-Receipt 1.16.3.3, biometric mock 1.16.1.11; telemed: 1.13.5 mock GIS, PDPA partials; mobile §4 partial ที่เหลือ (แก้ใน src/pages/mobile ของ repo นี้ — sync ไป bma.mobile ทีหลัง)"}
]
```

→ PR "feat(tor-gaps): CPOE/Claim/Queue/Reports/EMR/Kiosk gap closure" + merge

## Wave 4 — ตรวจรวม + ส่งงาน (Day 2 บ่าย)

1. Workflow `tor-final-audit` (ไม่ต้องใส่ args) — sweep 4 มิติ + adversarial verify + fix + build
2. Main loop: อ่านรายงาน แก้สิ่งที่ agent ทำไม่ได้ + spot-check หน้าจอสำคัญบน dev server local
3. Commit + push + PR สุดท้าย + merge
4. **ไม่ publish อัตโนมัติ** — UAT ขึ้นเมื่อสั่ง `gh workflow run "Deploy to production" --ref main` เท่านั้น (ตรงตามที่ต้องการให้คนอื่นเห็นเฉพาะเมื่อสั่ง publish)

Stretch (ถ้าเวลาเหลือ): AI Chatbot add-on (ข้อเสนอเพิ่มเติม — เว็บ + mobile in-app), sync mobile/kiosk ไป repo แยก

## วิธียิงแต่ละ wave

บอก Claude ว่า: **"รัน workflow build-tor-wave ด้วย args Wave N จากแผน docs/tor-sprint-plan-2026-08.md"**
Claude จะอ่าน args JSON จากไฟล์นี้แล้ว invoke ให้ — เสร็จแล้วอ่านรายงาน, commit, push, PR, merge ตามแผน

หมายเหตุ scale: แต่ละ wave ใช้ ~20–28 agents (เกิน guideline 15 โดยตั้งใจ เพราะงานเร่ง 2 วัน) — ถ้าอยากประหยัด แตก wave เป็น 2 ก้อน ก้อนละ 3 โมดูลได้ ผลลัพธ์เท่ากัน ช้ากว่าเล็กน้อย
