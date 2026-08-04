/* hivStiVisits.js — mock data + vocabulary + session-scoped stores for
   งาน HIV และโรคติดต่อทางเพศสัมพันธ์ (TOR §1.10.6, /clinic/hiv-sti).

   Field structure + vocabulary follow the legacy HCIS manual
   "คู่มือระบบงานคลินิกโรคติดต่อทางเพศสัมพันธ์และโรคเอดส์" บทที่ 2:
   คิวซักประวัติ (2.1) → บันทึกการดูแลรักษาเอดส์ฯ 8 แท็บ (ข้อมูลทั่วไป /
   VCT / HIV Test / สังคมสงเคราะห์ / ข้อมูล STI / บริการคัดกรอง /
   การวินิจฉัยรักษา / การให้สุขศึกษา) → บันทึกคำสั่งแพทย์ → อัปโหลดเอกสาร
   (2.14) → พิมพ์ใบนัด/ใบรับรองแพทย์ (2.11/2.12).

   ข้อมูลลับ §1.4.2 — ทุกตารางแสดงผู้รับบริการแบบ mask (UIC code + ชื่อย่อ);
   ชื่อเต็ม/เลขบัตร/เบอร์โทรเปิดเผยรายช่องผ่าน PrivacyRevealPopup เท่านั้น
   และการเปิดเผยถูกบันทึกไว้ (logHivStiPiiReveal). ใช้คำว่า "ผู้รับบริการ"
   ตามคู่มือเสมอ — ไม่ใช่ "ผู้ป่วย".

   Session persistence copies the `ancVisits.js` pattern: sessionStorage
   survives route navigation within the tab but resets per session — enough
   to make ยกเลิก/แก้ไข/ตรวจสอบ audit trail real without a backend. */

/* ─── Current staff (mock) — stamps ผู้บันทึก+เวลา on every save ───── */
export const HIV_STI_CURRENT_STAFF = {
  name: 'พว.กัลยา ตั้งใจดี',
  position: 'พยาบาลวิชาชีพ คลินิก HIV/STI',
};

export const hivStiNowStamp = () => new Intl.DateTimeFormat('th-TH-u-ca-buddhist', {
  day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
}).format(new Date());

export const formatHivStiDate = (v) => {
  if (!v) return '—';
  const d = v instanceof Date ? v : new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return new Intl.DateTimeFormat('th-TH-u-ca-buddhist', {
    day: 'numeric', month: 'short', year: 'numeric',
  }).format(d);
};

/** ISO (YYYY-MM-DD) n วันจากวันนี้ — ใช้กับ "นัดครั้งถัดไป" และวันเริ่มยา PEP
    เพื่อให้สถานะ มาตามนัด / ครบกำหนดวันนี้ / ผิดนัด และตัวนับ 28 วัน
    ยังอ่านได้จริงไม่ว่าจะเปิดระบบวันไหน (ข้อมูลย้อนหลังยังคงเป็นวันที่ตายตัว). */
export const hivStiIsoOffsetDays = (n = 0) => {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

export const hivStiTodayIso = () => hivStiIsoOffsetDays(0);

/** ISO datetime ของเวลานัด telemedicine วันนี้ (ใช้กับ TelemedicineQueueBadge). */
const todayAtHivSti = (hour, minute = 0) => {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
};

/* ─── PII masking (§1.4.2) ────────────────────────────────────────── */

/** 'นางสาวพิมพ์ชนก แก้วกาญจน์' → 'พ. แก้วxxx' style ชื่อย่อ — keeps the
    prefix out (prefixes identify gender, fine to drop), shows first char
    of the first name + masked surname so rows stay distinguishable to
    staff without exposing the identity to shoulder-surfers. */
export const maskHivStiName = (fullName = '') => {
  const cleaned = String(fullName)
    .replace(/^(นาย|นางสาว|นาง|เด็กชาย|เด็กหญิง|ด\.ช\.|ด\.ญ\.)/, '')
    .trim();
  const [first = '', last = ''] = cleaned.split(/\s+/);
  const firstInitial = first ? `${first.charAt(0)}.` : '?';
  const lastMasked = last ? `${last.slice(0, 2)}xxx` : '';
  return `${firstInitial} ${lastMasked}`.trim();
};

export const maskNationalId = (id = '') =>
  (id ? `${String(id).slice(0, 1)}-xxxx-xxxxx-${String(id).slice(-2)}` : '—');

export const maskPhone = (phone = '') =>
  (phone ? `${String(phone).slice(0, 3)}-xxx-${String(phone).slice(-4)}` : '—');

/* ─── ทะเบียนผู้รับบริการ vocabulary (แท็บข้อมูลทั่วไป, คู่มือ 2.2) ───── */

export const HIV_STI_CLIENT_TYPES = [
  { value: 'new', label: 'รายใหม่' },
  { value: 'old', label: 'รายเก่า' },
];

/* กลุ่มประชากรเฉพาะ — ศัพท์ CITC/สอวพ. อย่างเป็นทางการ ห้ามใช้คำเรียกไม่เป็นทางการ */
export const HIV_STI_KEY_POPULATIONS = [
  { value: 'msm',      label: 'ชายที่มีเพศสัมพันธ์กับชาย (MSM)' },
  { value: 'tg',       label: 'สาวประเภทสอง / บุคคลข้ามเพศ (TG)' },
  { value: 'sw',       label: 'พนักงานบริการ (SW)' },
  { value: 'pwid',     label: 'ผู้ใช้สารเสพติดด้วยวิธีฉีด (PWID)' },
  { value: 'prisoner', label: 'ผู้ต้องขัง' },
  { value: 'migrant',  label: 'แรงงานข้ามชาติ' },
  { value: 'youth',    label: 'เยาวชน (15–24 ปี)' },
  { value: 'partner',  label: 'คู่ของผู้ติดเชื้อ / ผู้สัมผัส' },
  { value: 'general',  label: 'ประชากรทั่วไป' },
];

export const HIV_STI_OCCUPATIONS = [
  'รับจ้างทั่วไป', 'พนักงานบริษัท', 'ค้าขาย / ธุรกิจส่วนตัว', 'พนักงานบริการ',
  'นักเรียน / นักศึกษา', 'ข้าราชการ / รัฐวิสาหกิจ', 'ว่างงาน', 'อื่น ๆ',
];

export const HIV_STI_NATIONALITIES = ['ไทย', 'เมียนมา', 'ลาว', 'กัมพูชา', 'เวียดนาม', 'อื่น ๆ'];

export const HIV_STI_REFERRAL_SOURCES = [
  'มาด้วยตนเอง (Walk-in)',
  'ส่งต่อจากศูนย์บริการสาธารณสุขอื่น',
  'ส่งต่อจากโรงพยาบาลแม่ข่าย',
  'หน่วยบริการเชิงรุก (Mobile VCT)',
  'องค์กรภาคประชาสังคม (CBO)',
  'คลินิกเอกชน',
  'สายด่วน 1663 / นัดหมายออนไลน์',
];

export const HIV_STI_ARV_STATUS = [
  { value: 'none',     label: 'ยังไม่เริ่มยา ARV' },
  { value: 'here',     label: 'รับยา ARV ที่ศูนย์ฯ นี้' },
  { value: 'other',    label: 'รับยา ARV ที่สถานพยาบาลอื่น' },
  { value: 'ltfu',     label: 'ขาดการรับยา (LTFU)' },
  { value: 'na',       label: 'ไม่เกี่ยวข้อง (ผลลบ/ยังไม่ทราบผล)' },
];

export const resolveArvStatus = (value) => HIV_STI_ARV_STATUS.find((o) => o.value === value) || null;

/* ─── Step 2 — พฤติกรรมเสี่ยง + บริการคัดกรอง (แท็บบริการคัดกรอง/ข้อมูล STI) ── */

export const HIV_STI_RISK_BEHAVIORS = [
  { key: 'unprotectedSex',   label: 'มีเพศสัมพันธ์โดยไม่ใช้ถุงยางอนามัย (3 เดือนที่ผ่านมา)' },
  { key: 'multiplePartners', label: 'มีคู่เพศสัมพันธ์มากกว่า 1 คน' },
  { key: 'partnerHivPos',    label: 'คู่เพศสัมพันธ์ติดเชื้อ HIV / ไม่ทราบผลเลือดคู่' },
  { key: 'stiHistory',       label: 'เคยเป็นโรคติดต่อทางเพศสัมพันธ์มาก่อน' },
  { key: 'injectDrug',       label: 'ใช้สารเสพติดด้วยวิธีฉีด / ใช้เข็มร่วมกัน' },
  { key: 'sexWork',          label: 'ขาย/ซื้อบริการทางเพศ' },
  { key: 'alcoholBeforeSex', label: 'ดื่มแอลกอฮอล์/ใช้สารก่อนมีเพศสัมพันธ์' },
  { key: 'needleStick',      label: 'สัมผัสเลือด/สารคัดหลั่งจากการทำงาน (Occupational exposure)' },
];

/* Antibody Tests for Syphilis + ตรวจอื่น (คู่มือแท็บบริการคัดกรอง) */
export const HIV_STI_SYPHILIS_TESTS = [
  { key: 'rprVdrl', label: 'RPR / VDRL', options: ['Non-reactive', 'Reactive 1:1', 'Reactive 1:2', 'Reactive 1:4', 'Reactive 1:8', 'Reactive 1:16', 'Reactive ≥1:32', 'รอผล'] },
  { key: 'rapid',   label: 'Rapid test for Syphilis', options: ['Non-reactive', 'Reactive', 'รอผล'] },
  { key: 'tpha',    label: 'TPHA / TPPA', options: ['Non-reactive', 'Reactive', 'รอผล'] },
];

export const HIV_STI_OTHER_SCREENINGS = [
  { key: 'gramStain', label: 'Gram Stain', options: ['ไม่พบเชื้อ', 'พบ Gram-negative intracellular diplococci', 'พบเชื้ออื่น (ระบุในบันทึก)', 'รอผล'] },
  { key: 'wetSmear',  label: 'Wet Smear', options: ['ปกติ', 'พบ Trichomonas', 'พบ Clue cells', 'พบเชื้อรา (Candida)', 'รอผล'] },
  { key: 'papSmear',  label: 'Pap Smear', options: ['ปกติ (Negative)', 'ผิดปกติ — ส่งต่อสูตินรีแพทย์', 'รอผล', 'ไม่ได้ตรวจ'] },
];

/* ─── Step 3 — VCT & HIV Test (แท็บ VCT + HIV Test) ────────────────── */

export const HIV_TEST_DECISIONS = [
  { value: 'test',    label: 'ยินยอมตรวจ HIV' },
  { value: 'no-test', label: 'ไม่ตรวจครั้งนี้' },
];

export const HIV_NO_TEST_REASONS = [
  'ยังไม่พร้อมด้านจิตใจ — นัดให้คำปรึกษาซ้ำ',
  'อยู่ในช่วง Window period — นัดเจาะเลือดซ้ำ',
  'ขอกลับไปปรึกษาคู่/ครอบครัวก่อน',
  'ตรวจจากที่อื่นมาแล้วภายใน 1 เดือน',
];

export const HIV_TEST_RESULT_OPTIONS = [
  { value: 'negative',      label: 'Negative (ไม่พบการติดเชื้อ)', badge: 'green' },
  { value: 'indeterminate', label: 'Indeterminate (สรุปผลไม่ได้ — ตรวจซ้ำ)', badge: 'yellow' },
  { value: 'positive',      label: 'Positive (พบการติดเชื้อ)', badge: 'red' },
  { value: 'pending',       label: 'รอผล', badge: 'grey' },
];

export const PARTNER_HIV_RESULT_OPTIONS = [
  'ไม่ทราบผล', 'Negative', 'Positive — รับยา ARV แล้ว', 'Positive — ยังไม่รับยา', 'ไม่มีคู่ / ไม่ประสงค์ตอบ',
];

/* ─── Step 4 — การวินิจฉัย STI + ICD-10 (แท็บการวินิจฉัยรักษา) ───────── */

export const STI_DIAGNOSES = [
  { key: 'syphilis1',   label: 'ซิฟิลิสระยะที่ 1 (Primary syphilis)', icd10: 'A51.0' },
  { key: 'syphilis2',   label: 'ซิฟิลิสระยะที่ 2 (Secondary syphilis)', icd10: 'A51.3' },
  { key: 'syphilisLat', label: 'ซิฟิลิสระยะแฝง (Latent syphilis)', icd10: 'A53.0' },
  { key: 'gonorrhea',   label: 'หนองใน (Gonorrhoea)', icd10: 'A54.9' },
  { key: 'ngu',         label: 'หนองในเทียม (Non-gonococcal urethritis)', icd10: 'A56.0' },
  { key: 'herpes',      label: 'เริมอวัยวะเพศ (Genital herpes)', icd10: 'A60.0' },
  { key: 'chancroid',   label: 'แผลริมอ่อน (Chancroid)', icd10: 'A57' },
  { key: 'lgv',         label: 'กามโรคต่อมน้ำเหลือง (LGV)', icd10: 'A55' },
  { key: 'trichomonas', label: 'พยาธิช่องคลอด (Trichomoniasis)', icd10: 'A59.0' },
  { key: 'condyloma',   label: 'หูดหงอนไก่ (Condyloma acuminata)', icd10: 'A63.0' },
];

/* ─── Step 5 — CPOE + PEP/PrEP ────────────────────────────────────── */

export const PEP_REGIMEN_OPTIONS = [
  'TDF/3TC + DTG (สูตรแนะนำ)',
  'TDF/FTC + DTG',
  'TDF/3TC + LPV/r',
];

export const PREP_REGIMEN_OPTIONS = [
  'TDF/FTC วันละ 1 เม็ด (Daily PrEP)',
  'TDF/FTC แบบ On-demand (2-1-1)',
];

/** PEP ครบ 28 วัน: วันที่ครบ = วันเริ่มยา + 27 วัน (นับวันเริ่มเป็นวันที่ 1) */
export const computePepDueDate = (startDate) => {
  if (!startDate) return null;
  const d = new Date(startDate);
  if (Number.isNaN(d.getTime())) return null;
  d.setDate(d.getDate() + 27);
  return d;
};

export const computePepDayNumber = (startDate, asOf = new Date()) => {
  if (!startDate) return null;
  const start = new Date(startDate);
  if (Number.isNaN(start.getTime())) return null;
  const days = Math.floor((asOf - start) / 86400000) + 1;
  return Math.max(1, days);
};

/* ─── Step 6 — สุขศึกษา + เอกสารแนบ (แท็บการให้สุขศึกษา + คู่มือ 2.14) ── */

export const HEALTH_EDUCATION_TOPICS = [
  { key: 'condomUse',     label: 'สาธิตการใช้ถุงยางอนามัยอย่างถูกวิธี' },
  { key: 'condomGiven',   label: 'แจกถุงยางอนามัยและสารหล่อลื่น' },
  { key: 'adherence',     label: 'การกินยาต่อเนื่องตรงเวลา (Adherence)' },
  { key: 'partnerNotify', label: 'การชวนคู่มาตรวจ (Partner notification)' },
  { key: 'windowPeriod',  label: 'อธิบาย Window period และการตรวจซ้ำ' },
  { key: 'stiPrevention', label: 'การป้องกันโรคติดต่อทางเพศสัมพันธ์' },
  { key: 'harmReduction', label: 'การลดอันตรายจากการใช้สารเสพติด (Harm reduction)' },
];

export const HIV_STI_DOC_TYPES = [
  'ผลตรวจจากสถานพยาบาลอื่น', 'ใบส่งต่อ (Refer)', 'รูปภาพประกอบการรักษา', 'เอกสารอื่น ๆ',
];

export const HIV_STI_UPLOAD_ACCEPT = '.pdf,.jpg,.jpeg,.png';
export const HIV_STI_UPLOAD_MAX_MB = 10;

/** จำกัดชนิดไฟล์ pdf/jpg/png + ขนาดไม่เกิน 10MB — คืน error message หรือ null */
export const validateHivStiUpload = (file) => {
  if (!file) return 'ไม่พบไฟล์';
  const okType = /\.(pdf|jpe?g|png)$/i.test(file.name || '');
  if (!okType) return `ชนิดไฟล์ไม่รองรับ (${file.name}) — รองรับเฉพาะ PDF, JPG, PNG`;
  if ((file.size || 0) > HIV_STI_UPLOAD_MAX_MB * 1024 * 1024) {
    return `ไฟล์ใหญ่เกิน ${HIV_STI_UPLOAD_MAX_MB} MB`;
  }
  return null;
};

/* ─── Step 7 — นัดหมาย ────────────────────────────────────────────── */

export const HIV_STI_APPOINTMENT_TYPES = [
  { value: 'result',    label: 'นัดฟังผลตรวจ' },
  { value: 'retest',    label: 'นัดเจาะเลือดซ้ำ (Window period)' },
  { value: 'pep28',     label: 'นัดติดตาม PEP ครบ 28 วัน' },
  { value: 'prep',      label: 'นัดติดตาม PrEP (3 เดือน)' },
  { value: 'arv',       label: 'นัดรับยา ARV' },
  { value: 'sti',       label: 'นัดติดตามผลการรักษา STI' },
];

/* ─── SuggestibleTextarea word-lists ──────────────────────────────── */

export const HIV_STI_HISTORY_SUGGESTIONS = [
  'ไม่มีโรคประจำตัว',
  'มีไข้ต่ำ ๆ ต่อมน้ำเหลืองโต 2 สัปดาห์',
  'มีแผลบริเวณอวัยวะเพศ ไม่เจ็บ',
  'มีหนองไหลจากท่อปัสสาวะ ปัสสาวะแสบขัด',
  'ตกขาวผิดปกติ มีกลิ่น',
  'มีผื่นตามฝ่ามือฝ่าเท้า',
  'สัมผัสความเสี่ยงมาภายใน 72 ชั่วโมง — ประเมิน PEP',
  'มาขอรับ PrEP ต่อเนื่อง',
  'มารับยา ARV ตามนัด อาการปกติ',
];

export const HIV_STI_RISK_NOTE_SUGGESTIONS = [
  'สัมผัสความเสี่ยงครั้งล่าสุดเมื่อ 3 วันก่อน',
  'ใช้ถุงยางอนามัยไม่สม่ำเสมอ',
  'คู่ประจำทราบผลเลือดแล้ว',
  'ไม่เคยตรวจ HIV มาก่อน',
  'ตรวจ HIV ครั้งล่าสุดเมื่อ 6 เดือนก่อน ผล Negative',
  'ปฏิเสธการใช้สารเสพติดทุกชนิด',
];

export const VCT_PRETEST_SUGGESTIONS = [
  'ประเมินความพร้อมก่อนตรวจแล้ว ผู้รับบริการเข้าใจและยินยอมตรวจ',
  'อธิบายความหมายผลบวก/ผลลบ และ Window period แล้ว',
  'แนะนำการตรวจซ้ำหากยังอยู่ในช่วง Window period',
  'ผู้รับบริการขอเวลาตัดสินใจ — นัดให้คำปรึกษาซ้ำ',
];

export const VCT_POSTTEST_SUGGESTIONS = [
  'แจ้งผลตรวจและประเมินสภาพจิตใจหลังฟังผลแล้ว',
  'ผลลบ — เน้นย้ำการป้องกันและการตรวจซ้ำตามรอบ',
  'ผลบวก — ให้คำปรึกษาเชื่อมต่อระบบรับยา ARV เร็วที่สุด (Same-day ART)',
  'ประเมินความเสี่ยงต่อการทำร้ายตนเอง — ไม่พบ',
  'นัดหมายพบทีมสหวิชาชีพ/นักสังคมสงเคราะห์',
];

export const HIV_STI_DIAGNOSIS_NOTE_SUGGESTIONS = [
  'ไม่พบรอยโรค STI จากการตรวจร่างกาย',
  'พบแผล Chancre บริเวณอวัยวะเพศ เข้าได้กับซิฟิลิสระยะที่ 1',
  'พบหนองจากท่อปัสสาวะ เข้าได้กับหนองใน',
  'รอผล Lab ยืนยันก่อนสรุปการวินิจฉัย',
  'เข้าเกณฑ์รับ PEP — เริ่มยาภายใน 72 ชั่วโมงหลังสัมผัส',
  'เข้าเกณฑ์รับ PrEP — ตรวจ Cr และ HBsAg ก่อนเริ่มยา',
];

export const HIV_STI_EDUCATION_NOTE_SUGGESTIONS = [
  'ให้สุขศึกษารายบุคคลเรื่องการป้องกัน STI แล้ว',
  'สาธิตการใช้ถุงยางอนามัย ผู้รับบริการทำได้ถูกต้อง',
  'แนะนำชวนคู่มาตรวจเลือดพร้อมกันครั้งถัดไป',
  'ย้ำการกินยาตรงเวลาและมาตามนัดทุกครั้ง',
  'ให้เอกสารความรู้และช่องทางติดต่อสายด่วน 1663',
];

export const HIV_STI_APPOINTMENT_NOTE_SUGGESTIONS = [
  'งดน้ำงดอาหารก่อนเจาะเลือด 8 ชั่วโมง',
  'นำยาเดิมที่เหลือมาด้วยทุกครั้ง',
  'มาก่อนเวลานัด 15 นาทีเพื่อเจาะเลือดก่อนพบแพทย์',
  'หากมีอาการผิดปกติก่อนวันนัด ให้มาพบก่อนนัดได้ทันที',
  'แนะนำชวนคู่มาตรวจเลือดพร้อมกันในนัดครั้งถัดไป',
];

/* สรุปการปรึกษาทางไกล (Telemedicine — ข้อ Telemedicine ของ TOR 1.10.6.7) */
export const HIV_STI_TELEMED_NOTE_SUGGESTIONS = [
  'ยืนยันตัวตนผู้รับบริการก่อนเริ่มปรึกษาแล้ว',
  'ปรึกษาเรื่องผลข้างเคียงของยา — อาการดีขึ้น ไม่ต้องปรับสูตรยา',
  'ผู้รับบริการอยู่ในที่ส่วนตัว ยินยอมให้ปรึกษาผ่านวิดีโอ',
  'ประเมินการกินยาต่อเนื่อง (Adherence) — กินครบตามสั่ง',
  'นัดมารับยาที่ศูนย์ฯ ในครั้งถัดไป / ประสานส่งยาทางไปรษณีย์',
  'สัญญาณภาพ-เสียงไม่เสถียร — นัดปรึกษาซ้ำ',
];

/* เหตุผลที่กินยา PEP ไม่ครบ 28 วัน (บันทึกผลการติดตาม TOR 1.10.6.8) */
export const PEP_INCOMPLETE_REASON_SUGGESTIONS = [
  'มีผลข้างเคียงจากยา (คลื่นไส้/อาเจียน) — หยุดยาเอง',
  'ขาดการติดต่อ ติดตามทางโทรศัพท์ไม่สำเร็จ',
  'ลืมกินยาต่อเนื่องหลายวัน จึงหยุดยา',
  'ย้ายไปรับยาต่อที่สถานพยาบาลอื่น',
  'ผู้รับบริการประเมินว่าความเสี่ยงต่ำ จึงหยุดยาเอง',
];

/* บันทึกการติดตามผู้ผิดนัด (โทร/เยี่ยม — ใช้ใน follow-up contact CTA) */
export const HIV_STI_FOLLOWUP_CONTACT_SUGGESTIONS = [
  'โทรติดตามแล้ว — รับสายและยืนยันมาตามนัดใหม่',
  'โทรติดตามแล้ว — ไม่รับสาย จะติดตามซ้ำภายใน 3 วัน',
  'ฝากข้อความผ่านช่องทางที่ผู้รับบริการยินยอมไว้แล้ว',
  'ประสาน CBO ช่วยติดตามเยี่ยมตามที่อยู่ที่ให้ไว้',
  'ผู้รับบริการแจ้งย้ายไปรับบริการที่สถานพยาบาลอื่น',
];

/* ─── Default form (7 steps) ──────────────────────────────────────── */

export const DEFAULT_HIV_STI_VISIT = {
  /* step 1 — ซักประวัติ + Vital signs */
  examiningDoctor: '',              // บังคับตามคู่มือ 2.2 ข้อ 1.1
  chiefComplaint: '',
  illnessHistory: '',
  familyHistory: '',
  vitals: { bp: '', hr: '', temp: '', weight: '', height: '' },
  /* step 2 — พฤติกรรมเสี่ยง + คัดกรอง */
  riskBehaviors: {},
  riskNote: '',
  syphilisResults: {},
  otherScreenings: {},
  /* step 3 — VCT & HIV Test */
  preTestDone: false,
  preTestNote: '',
  hivTestDecision: '',              // 'test' | 'no-test'
  hivNoTestReason: '',
  hivTestResult: '',                // negative | indeterminate | positive | pending
  windowPeriod: false,
  partnerHivResult: '',
  postTestDone: false,
  postTestNote: '',
  /* step 4 — วินิจฉัย */
  stiChecklist: {},
  diagnoses: [],                    // [{code,name,type}] via AddDiagnosisPopup
  diagnosisNote: '',
  /* step 5 — CPOE */
  medications: [],                  // via AddMedicationPopup
  labOrders: [],                    // LabOrderPicker ids
  xrayOrders: [],                   // XrayOrderPicker ids
  pepPrescribed: false,
  pepRegimen: '',
  pepStartDate: '',
  prepPrescribed: false,
  prepRegimen: '',
  /* step 5 — Telemedicine (แสดงเฉพาะวิสิตที่เป็นการปรึกษาทางไกล) */
  telemedStatus: '',                // '' | 'started' | 'completed'
  telemedNote: '',
  /* step 6 — สุขศึกษา + เอกสารแนบ */
  educationTopics: {},
  educationNote: '',
  condomCount: '',
  attachments: [],                  // [{name,type,docType,sizeLabel}]
  /* step 7 — นัดหมาย (ครบ 4 กริยา: แสดง/บันทึก/ยกเลิก/แก้ไข) */
  appointment: {
    type: '', date: '', note: '',
    confirmed: false, confirmedAt: '', confirmedBy: '',
  },
  appointmentCancelled: null,       // { type, date, at, by } ของนัดที่ถูกยกเลิก
  printNeutralSlip: true,           // เอกสารพิมพ์ใช้ข้อความกลาง — ไม่ระบุผล HIV
  recordConfirmed: false,
  recordConfirmedAt: '',
  recordConfirmedBy: '',
};

/** Step-completion booleans for StepProgress — same contract as
    getAncCompletedSteps (index = step, true = shows the check). */
export const getHivStiCompletedSteps = (form) => [
  !!form.examiningDoctor && !!form.illnessHistory,
  Object.values(form.riskBehaviors || {}).some(Boolean) || !!form.riskNote,
  form.hivTestDecision === 'no-test'
    ? !!form.hivNoTestReason
    : (!!form.hivTestResult && (form.hivTestResult !== 'positive' || form.postTestDone)),
  (form.diagnoses || []).length > 0 || Object.values(form.stiChecklist || {}).some(Boolean) || !!form.diagnosisNote,
  (form.medications || []).length > 0 || (form.labOrders || []).length > 0
    || form.pepPrescribed || form.prepPrescribed,
  Object.values(form.educationTopics || {}).some(Boolean) || !!form.educationNote,
  !!form.appointment?.date,
];

/* ─── Mock roster — คิววันนี้ (ศูนย์บริการสาธารณสุข กทม.) ─────────────
   Reuses HNs from patientProfiles.js so PatientCard / avatar lookups
   resolve. `uic` = รหัส UIC ที่ใช้แสดงแทนตัวตนในตาราง (mask §1.4.2). */
export const HIV_STI_PATIENTS = [
  {
    hn: '67-00009', name: 'นายสมยศ พงษ์พานิช', uic: 'UIC-2517-09-14', nationalId: '3101500229481', phone: '0812345671',
    doctor: 'นพ.วีรพล ชัยวัฒน์', queue: 'H-001', room: 'STI1', statusKey: 'waiting', waitMinutes: 15,
    clientType: 'old', keyPopulation: 'general', arvStatus: 'here', visitReason: 'รับยา ARV ตามนัด',
  },
  {
    hn: '67-00010', name: 'นายกิตติพงศ์ แสงอรุณ', uic: 'UIC-2534-03-08', nationalId: '1103700456212', phone: '0898765432',
    doctor: 'นพ.วีรพล ชัยวัฒน์', queue: 'H-002', room: 'STI1', statusKey: 'progress', waitMinutes: 3,
    clientType: 'new', keyPopulation: 'msm', arvStatus: 'na', visitReason: 'ขอตรวจ HIV โดยสมัครใจ (VCT)',
    telemedicine: true, telemedAppointmentAt: todayAtHivSti(10, 30),
  },
  {
    hn: '67-00015', name: 'นางสาววราภรณ์ ศรีสุวรรณ', uic: 'UIC-2529-11-22', nationalId: '3100201893344', phone: '0865551234',
    doctor: 'พญ.อรทัย บุญประเสริฐ', queue: 'H-003', room: 'STI2', statusKey: 'waiting', waitMinutes: 22,
    clientType: 'new', keyPopulation: 'general', arvStatus: 'na', visitReason: 'ตกขาวผิดปกติ — ตรวจ STI',
  },
  {
    hn: '67-00016', name: 'นายธีรภัทร วงศ์สวัสดิ์', uic: 'UIC-2545-01-30', nationalId: '1101800334455', phone: '0923334455',
    doctor: 'พญ.อรทัย บุญประเสริฐ', queue: 'H-004', room: 'STI2', statusKey: 'waiting', waitMinutes: 8,
    clientType: 'new', keyPopulation: 'youth', arvStatus: 'na', visitReason: 'สัมผัสความเสี่ยง 2 วันก่อน — ประเมิน PEP',
  },
  {
    hn: '67-00020', name: 'นายอนุชา ทองคำ', uic: 'UIC-2536-06-19', nationalId: '3102003448899', phone: '0817778899',
    doctor: 'นพ.วีรพล ชัยวัฒน์', queue: 'H-005', room: 'STI1', statusKey: 'done', waitMinutes: 0,
    clientType: 'old', keyPopulation: 'msm', arvStatus: 'na', visitReason: 'รับ PrEP ต่อเนื่อง (เดือนที่ 6)',
  },
  {
    hn: '67-00023', name: 'นางสาวปาริชาติ อินทร์แก้ว', uic: 'UIC-2532-04-05', nationalId: '3110400221177', phone: '0845556677',
    doctor: 'พญ.อรทัย บุญประเสริฐ', queue: 'H-006', room: 'STI2', statusKey: 'done', waitMinutes: 0,
    clientType: 'old', keyPopulation: 'sw', arvStatus: 'na', visitReason: 'นัดฟังผลตรวจซิฟิลิส',
  },
  {
    hn: '67-00024', name: 'นายจักรกฤษณ์ บัวทอง', uic: 'UIC-2540-12-11', nationalId: '1104500667788', phone: '0956667788',
    doctor: 'นพ.วีรพล ชัยวัฒน์', queue: 'H-007', room: 'STI1', statusKey: 'draft', waitMinutes: 0,
    clientType: 'old', keyPopulation: 'pwid', arvStatus: 'ltfu', visitReason: 'กลับมารับยา ARV หลังขาดยา',
  },
];

export const HIV_STI_SCHEDULED_TODAY = [
  {
    hn: '67-00021', name: 'นางบุษบา แก้วมณี', uic: 'UIC-2518-08-02', nationalId: '3120100554433', phone: '0891112233',
    doctor: 'นพ.วีรพล ชัยวัฒน์', appointmentTime: '09:00', clinic: 'STI1',
    clientType: 'old', keyPopulation: 'partner', arvStatus: 'here', visitReason: 'นัดรับยา ARV + ตรวจ Viral load',
  },
  {
    hn: '67-00025', name: 'นายภูวดล จันทร์เพ็ญ', uic: 'UIC-2538-02-27', nationalId: '1100900887766', phone: '0902223344',
    doctor: 'พญ.อรทัย บุญประเสริฐ', appointmentTime: '10:30', clinic: 'STI2',
    clientType: 'old', keyPopulation: 'msm', arvStatus: 'na', visitReason: 'นัดติดตาม PEP วันที่ 28',
  },
];

export const HIV_STI_DOCTORS = ['นพ.วีรพล ชัยวัฒน์', 'พญ.อรทัย บุญประเสริฐ'];

export const getHivStiPatientByHn = (hn) =>
  HIV_STI_PATIENTS.find((p) => p.hn === hn)
  || HIV_STI_SCHEDULED_TODAY.find((p) => p.hn === hn)
  || null;

/* ─── ทะเบียนผู้รับบริการ (clinic-level enrollment, TOR 1.10.6.6) ─────
   ผูกกับ HN เดิม — ไม่ทำ demographic ซ้ำกับเวชระเบียนกลาง เก็บเฉพาะข้อมูล
   ระดับคลินิก: UIC, กลุ่มประชากรเฉพาะ, แหล่งที่มา, สถานะ ARV */
export const HIV_STI_REGISTRY_BASE = [
  {
    hn: '67-00009', name: 'นายสมยศ พงษ์พานิช', uic: 'UIC-2517-09-14', clientType: 'old',
    occupation: 'รับจ้างทั่วไป', nationality: 'ไทย', keyPopulation: 'general',
    referral: 'ส่งต่อจากโรงพยาบาลแม่ข่าย', arvStatus: 'here',
    registeredAt: '12 มกราคม 2569 · 09:14', registeredBy: 'พว.กัลยา ตั้งใจดี',
  },
  {
    hn: '67-00010', name: 'นายกิตติพงศ์ แสงอรุณ', uic: 'UIC-2534-03-08', clientType: 'new',
    occupation: 'พนักงานบริษัท', nationality: 'ไทย', keyPopulation: 'msm',
    referral: 'มาด้วยตนเอง (Walk-in)', arvStatus: 'na',
    registeredAt: '2 สิงหาคม 2569 · 08:45', registeredBy: 'พว.กัลยา ตั้งใจดี',
  },
  {
    hn: '67-00020', name: 'นายอนุชา ทองคำ', uic: 'UIC-2536-06-19', clientType: 'old',
    occupation: 'ค้าขาย / ธุรกิจส่วนตัว', nationality: 'ไทย', keyPopulation: 'msm',
    referral: 'หน่วยบริการเชิงรุก (Mobile VCT)', arvStatus: 'na',
    registeredAt: '3 กุมภาพันธ์ 2569 · 13:02', registeredBy: 'พว.สมศรี มีสุข',
  },
  {
    hn: '67-00023', name: 'นางสาวปาริชาติ อินทร์แก้ว', uic: 'UIC-2532-04-05', clientType: 'old',
    occupation: 'พนักงานบริการ', nationality: 'ไทย', keyPopulation: 'sw',
    referral: 'องค์กรภาคประชาสังคม (CBO)', arvStatus: 'na',
    registeredAt: '18 มีนาคม 2569 · 10:26', registeredBy: 'พว.สมศรี มีสุข',
  },
  {
    hn: '67-00024', name: 'นายจักรกฤษณ์ บัวทอง', uic: 'UIC-2540-12-11', clientType: 'old',
    occupation: 'ว่างงาน', nationality: 'ไทย', keyPopulation: 'pwid',
    referral: 'ส่งต่อจากศูนย์บริการสาธารณสุขอื่น', arvStatus: 'ltfu',
    registeredAt: '7 พฤศจิกายน 2568 · 14:40', registeredBy: 'พว.กัลยา ตั้งใจดี',
  },
];

/* ─── ประวัติการมารับบริการ (carry-forward + timeline, TOR 1.10.6.3/.8) ── */
export const HIV_STI_VISIT_HISTORY = {
  '67-00009': [
    { visitNo: 1, date: '12 ม.ค. 2569', summary: 'เริ่มยา ARV (TDF/3TC/DTG) — CD4 285', chiefComplaint: 'อ่อนเพลีย น้ำหนักลด', hivResult: 'Positive', doctor: 'นพ.วีรพล ชัยวัฒน์' },
    { visitNo: 2, date: '9 ก.พ. 2569', summary: 'รับยา ARV ต่อเนื่อง — ไม่มีผลข้างเคียง', chiefComplaint: 'มารับยาตามนัด', hivResult: '—', doctor: 'นพ.วีรพล ชัยวัฒน์' },
    { visitNo: 3, date: '11 พ.ค. 2569', summary: 'ตรวจ Viral load — 42 copies/mL', chiefComplaint: 'มารับยาตามนัด', hivResult: '—', doctor: 'นพ.วีรพล ชัยวัฒน์' },
  ],
  '67-00020': [
    { visitNo: 1, date: '3 ก.พ. 2569', summary: 'เริ่ม PrEP (TDF/FTC daily) — Cr ปกติ, HBsAg Negative', chiefComplaint: 'ขอรับ PrEP', hivResult: 'Negative', doctor: 'นพ.วีรพล ชัยวัฒน์' },
    { visitNo: 2, date: '4 พ.ค. 2569', summary: 'PrEP เดือนที่ 3 — Adherence ดี ตรวจ HIV ซ้ำ Negative', chiefComplaint: 'รับ PrEP ต่อเนื่อง', hivResult: 'Negative', doctor: 'นพ.วีรพล ชัยวัฒน์' },
  ],
  '67-00023': [
    { visitNo: 1, date: '18 มี.ค. 2569', summary: 'RPR Reactive 1:8 — เริ่ม Benzathine penicillin เข็มที่ 1', chiefComplaint: 'มีผื่นฝ่ามือฝ่าเท้า', hivResult: 'Negative', doctor: 'พญ.อรทัย บุญประเสริฐ' },
    { visitNo: 2, date: '25 มี.ค. 2569', summary: 'Benzathine penicillin เข็มที่ 2', chiefComplaint: 'ฉีดยาตามนัด', hivResult: '—', doctor: 'พญ.อรทัย บุญประเสริฐ' },
  ],
  '67-00025': [
    { visitNo: 1, date: '7 ก.ค. 2569', summary: 'เริ่ม PEP (TDF/3TC+DTG) ภายใน 48 ชม. หลังสัมผัส', chiefComplaint: 'ถุงยางแตกกับคู่ไม่ทราบผลเลือด', hivResult: 'Negative (baseline)', doctor: 'พญ.อรทัย บุญประเสริฐ' },
  ],
};

/* ─── การติดตามการดูแล (TOR 1.10.6.8) ─────────────────────────────── */

/* ค่าผลตรวจที่ยังไม่รายงาน — ต้องไม่ถูกนับเป็นจุดในกราฟและไม่ถือเป็น
   "ผลล่าสุด" (edge case จริงในข้อมูล: 2 รายมี VDRL รอผล). */
export const HIV_STI_PENDING_RESULT = 'รอผล';

/** ค่าที่ต่ำกว่า limit of detection ของเครื่องตรวจ Viral load —
    ต้องแสดงเป็น "Undetectable" ไม่ใช่ 0 (ตีความผิดทางคลินิก). */
export const HIV_STI_VL_LOD = 20;

/** '58,000' → 58000 · '<20' → 19 (ใต้ LOD) · 'รอผล' / '—' → null */
export const parseHivStiNumber = (raw) => {
  if (raw == null) return null;
  const text = String(raw).trim();
  if (!text || text === '—' || text === HIV_STI_PENDING_RESULT) return null;
  const cleaned = text.replace(/,/g, '');
  if (/^</.test(cleaned)) {
    const bound = Number(cleaned.replace(/^</, ''));
    return Number.isNaN(bound) ? null : Math.max(0, bound - 1);
  }
  const n = Number(cleaned);
  return Number.isNaN(n) ? null : n;
};

/** true เมื่อค่า Viral load อยู่ใต้ limit of detection (แสดงป้าย Undetectable) */
export const isHivStiUndetectable = (raw) => {
  const n = parseHivStiNumber(raw);
  return n != null && n < HIV_STI_VL_LOD;
};

export const isHivStiPending = (raw) => String(raw || '').trim() === HIV_STI_PENDING_RESULT;

export const HIV_STI_FOLLOW_UPS = [
  {
    hn: '67-00009', name: 'นายสมยศ พงษ์พานิช', uic: 'UIC-2517-09-14', track: 'ARV',
    nextDate: hivStiIsoOffsetDays(5), nextType: 'arv',
    labTrend: [
      { dateIso: '2026-01-12', date: '12 ม.ค. 2569', cd4: '285', viralLoad: '58,000', vdrl: 'Non-reactive', note: 'Baseline ก่อนเริ่ม ARV' },
      { dateIso: '2026-05-11', date: '11 พ.ค. 2569', cd4: '412', viralLoad: '42', vdrl: '—', note: 'เดือนที่ 4 หลังเริ่มยา' },
      { dateIso: '2026-07-10', date: '10 ก.ค. 2569', cd4: '505', viralLoad: '<20', vdrl: '—', note: 'กดไวรัสได้ — Adherence ดี' },
    ],
    xray: [
      { dateIso: '2026-01-12', date: '12 ม.ค. 2569', exam: 'Chest X-ray (PA)', result: 'ไม่พบ active pulmonary TB' },
      { dateIso: '2026-07-10', date: '10 ก.ค. 2569', exam: 'Chest X-ray (PA)', result: 'ปกติ เทียบกับฟิล์มเดิมไม่เปลี่ยนแปลง' },
    ],
    vitalsTrend: [
      { dateIso: '2026-01-12', date: '12 ม.ค. 2569', bp: '118/76', pulse: '82', temp: '36.8', weight: '54' },
      { dateIso: '2026-05-11', date: '11 พ.ค. 2569', bp: '120/78', pulse: '78', temp: '36.6', weight: '58' },
      { dateIso: '2026-07-10', date: '10 ก.ค. 2569', bp: '116/74', pulse: '76', temp: '36.5', weight: '60' },
    ],
  },
  {
    hn: '67-00025', name: 'นายภูวดล จันทร์เพ็ญ', uic: 'UIC-2538-02-27', track: 'PEP',
    nextDate: hivStiIsoOffsetDays(0), nextType: 'pep28',
    pep: { regimen: 'TDF/3TC + DTG (สูตรแนะนำ)', startDate: hivStiIsoOffsetDays(-27) },
    labTrend: [
      { dateIso: hivStiIsoOffsetDays(-27), date: formatHivStiDate(hivStiIsoOffsetDays(-27)), cd4: '—', viralLoad: '—', vdrl: 'Non-reactive', note: 'Baseline ก่อนเริ่ม PEP' },
    ],
    xray: [],
    vitalsTrend: [{ dateIso: hivStiIsoOffsetDays(-27), date: formatHivStiDate(hivStiIsoOffsetDays(-27)), bp: '122/80', pulse: '84', temp: '36.7', weight: '67' }],
  },
  {
    hn: '67-00020', name: 'นายอนุชา ทองคำ', uic: 'UIC-2536-06-19', track: 'PrEP',
    nextDate: hivStiIsoOffsetDays(89), nextType: 'prep',
    labTrend: [
      { dateIso: '2026-02-03', date: '3 ก.พ. 2569', cd4: '—', viralLoad: '—', vdrl: 'Non-reactive', note: 'ตรวจก่อนเริ่ม PrEP · Cr ปกติ' },
      { dateIso: '2026-05-04', date: '4 พ.ค. 2569', cd4: '—', viralLoad: '—', vdrl: HIV_STI_PENDING_RESULT, note: 'ส่งตรวจซ้ำเดือนที่ 3' },
    ],
    xray: [],
    vitalsTrend: [{ dateIso: '2026-05-04', date: '4 พ.ค. 2569', bp: '116/74', pulse: '72', temp: '36.4', weight: '70' }],
  },
  {
    hn: '67-00023', name: 'นางสาวปาริชาติ อินทร์แก้ว', uic: 'UIC-2532-04-05', track: 'STI',
    nextDate: hivStiIsoOffsetDays(-14), nextType: 'sti',
    labTrend: [
      { dateIso: '2026-03-18', date: '18 มี.ค. 2569', cd4: '—', viralLoad: '—', vdrl: 'Reactive 1:8', note: 'เริ่ม Benzathine penicillin เข็มที่ 1' },
      { dateIso: '2026-06-20', date: '20 มิ.ย. 2569', cd4: '—', viralLoad: '—', vdrl: 'Reactive 1:2', note: 'Titer ลดลง — ตอบสนองต่อการรักษา' },
    ],
    xray: [],
    vitalsTrend: [{ dateIso: '2026-03-18', date: '18 มี.ค. 2569', bp: '110/70', pulse: '80', temp: '36.9', weight: '52' }],
  },
  {
    hn: '67-00010', name: 'นายกิตติพงศ์ แสงอรุณ', uic: 'UIC-2534-03-08', track: 'VCT',
    nextDate: hivStiIsoOffsetDays(27), nextType: 'result',
    labTrend: [{ dateIso: '2026-08-02', date: '2 ส.ค. 2569', cd4: '—', viralLoad: '—', vdrl: HIV_STI_PENDING_RESULT, note: 'ตรวจครั้งแรก — รอผลยืนยัน' }],
    xray: [],
    vitalsTrend: [{ dateIso: '2026-08-02', date: '2 ส.ค. 2569', bp: '119/75', pulse: '74', temp: '36.6', weight: '63' }],
  },
];

export const HIV_STI_TRACK_LABELS = {
  ARV: 'รับยา ARV', PEP: 'ติดตาม PEP', PrEP: 'ติดตาม PrEP',
  VCT: 'นัดฟังผล VCT', STI: 'ติดตามผลการรักษา STI',
};

export const HIV_STI_TRACK_BADGE = {
  ARV: 'teal', PEP: 'orange', PrEP: 'blue', VCT: 'indigo', STI: 'purple',
};

export const HIV_STI_FOLLOWUP_STATUS = {
  onSchedule: { label: 'มาตามนัด', style: 'green' },
  due:        { label: 'ครบกำหนดวันนี้', style: 'yellow' },
  missed:     { label: 'ผิดนัด', style: 'red' },
};

/** สถานะนัดคำนวณจากวันนัดจริงเทียบวันนี้ — ไม่ hard-code ไว้ใน mock
    เพื่อให้สถานะยังถูกต้องหลังเจ้าหน้าที่บันทึกนัดครั้งถัดไปใหม่ */
export const resolveHivStiFollowUpStatus = (nextDateIso) => {
  if (!nextDateIso) return { status: 'onSchedule', overdueDays: 0 };
  const today = hivStiTodayIso();
  if (nextDateIso === today) return { status: 'due', overdueDays: 0 };
  if (nextDateIso > today) return { status: 'onSchedule', overdueDays: 0 };
  const days = Math.round((new Date(`${today}T12:00:00`) - new Date(`${nextDateIso}T12:00:00`)) / 86400000);
  return { status: 'missed', overdueDays: Math.max(1, days) };
};

/* ─── ช่องทางติดตามผู้ผิดนัด (TOR 1.10.6.8) ────────────────────────── */
export const HIV_STI_FOLLOWUP_CHANNELS = [
  { value: 'phone',     label: 'โทรศัพท์ติดตาม' },
  { value: 'visit',     label: 'เยี่ยมบ้าน / ลงพื้นที่' },
  { value: 'consented', label: 'ช่องทางที่ผู้รับบริการยินยอมไว้' },
  { value: 'cbo',       label: 'ประสานองค์กรภาคประชาสังคม (CBO)' },
];

export const resolveHivStiFollowUpChannel = (value) =>
  HIV_STI_FOLLOWUP_CHANNELS.find((c) => c.value === value)?.label || '—';

/* ─── ประวัติการได้รับยาต้านไวรัส (คู่มือ HCIS §2.16) ────────────────
   Mock ในโมดูลตัวเอง — ห้ามดึงจาก src/data ของโมดูลเภสัช/แล็บ เพราะจะทำให้
   ข้อมูลลับ HIV รั่วออกนอก gate §1.4.2 (playbook §4 file scope). */
export const HIV_STI_ARV_REGIMENS = [
  'TDF/3TC/DTG (สูตรพื้นฐานผู้ใหญ่)',
  'TDF/FTC/EFV',
  'ABC/3TC + DTG',
  'TDF/3TC + LPV/r',
];

const HIV_STI_DRUG_HISTORY = {
  '67-00009': [
    { dateIso: '2026-01-12', time: '10:24', category: 'ARV', drug: 'TDF/3TC/DTG (สูตรพื้นฐานผู้ใหญ่)', quantity: '30 เม็ด', prescriptionNo: 'RX69-000412', usage: 'รับประทานวันละ 1 เม็ด ก่อนนอน' },
    { dateIso: '2026-02-09', time: '09:48', category: 'ARV', drug: 'TDF/3TC/DTG (สูตรพื้นฐานผู้ใหญ่)', quantity: '90 เม็ด', prescriptionNo: 'RX69-001188', usage: 'รับประทานวันละ 1 เม็ด ก่อนนอน' },
    { dateIso: '2026-05-11', time: '11:02', category: 'ARV', drug: 'TDF/3TC/DTG (สูตรพื้นฐานผู้ใหญ่)', quantity: '90 เม็ด', prescriptionNo: 'RX69-003021', usage: 'รับประทานวันละ 1 เม็ด ก่อนนอน' },
    { dateIso: '2026-07-10', time: '10:15', category: 'ARV', drug: 'TDF/3TC/DTG (สูตรพื้นฐานผู้ใหญ่)', quantity: '90 เม็ด', prescriptionNo: 'RX69-004510', usage: 'รับประทานวันละ 1 เม็ด ก่อนนอน' },
  ],
  '67-00020': [
    { dateIso: '2026-02-03', time: '13:20', category: 'PrEP', drug: 'TDF/FTC วันละ 1 เม็ด (Daily PrEP)', quantity: '30 เม็ด', prescriptionNo: 'RX69-000731', usage: 'รับประทานวันละ 1 เม็ด เวลาเดิมทุกวัน' },
    { dateIso: '2026-05-04', time: '14:05', category: 'PrEP', drug: 'TDF/FTC วันละ 1 เม็ด (Daily PrEP)', quantity: '90 เม็ด', prescriptionNo: 'RX69-002877', usage: 'รับประทานวันละ 1 เม็ด เวลาเดิมทุกวัน' },
  ],
  '67-00025': [
    { dateIso: hivStiIsoOffsetDays(-27), time: '16:40', category: 'PEP', drug: 'TDF/3TC + DTG (สูตรแนะนำ)', quantity: '28 เม็ด', prescriptionNo: 'RX69-004902', usage: 'รับประทานวันละ 1 เม็ด ให้ครบ 28 วัน' },
  ],
  '67-00023': [
    { dateIso: '2026-03-18', time: '10:36', category: 'STI', drug: 'Benzathine penicillin G 2.4 MU', quantity: '1 ขวด', prescriptionNo: 'RX69-001904', usage: 'ฉีดเข้ากล้ามครั้งเดียว (เข็มที่ 1)' },
    { dateIso: '2026-03-25', time: '10:11', category: 'STI', drug: 'Benzathine penicillin G 2.4 MU', quantity: '1 ขวด', prescriptionNo: 'RX69-002033', usage: 'ฉีดเข้ากล้ามครั้งเดียว (เข็มที่ 2)' },
  ],
};

const inHivStiRange = (iso, fromIso, toIso) => {
  if (!iso) return false;
  if (fromIso && iso < fromIso) return false;
  if (toIso && iso > toIso) return false;
  return true;
};

const followUpBase = (hn) => HIV_STI_FOLLOW_UPS.find((r) => r.hn === hn) || null;

/** ประวัติการได้รับยา (§2.16) เรียงใหม่→เก่า, กรองตามช่วงเวลาที่เลือก */
export const getHivStiArvHistory = (hn, fromIso = null, toIso = null) =>
  (HIV_STI_DRUG_HISTORY[hn] || [])
    .filter((r) => inHivStiRange(r.dateIso, fromIso, toIso))
    .slice()
    .sort((a, b) => (a.dateIso < b.dateIso ? 1 : -1));

/** สูตรยาปัจจุบัน = รายการยาต้านไวรัสล่าสุดที่จ่ายจริง (ไม่ hard-code) */
export const getHivStiCurrentRegimen = (hn) => {
  const rows = getHivStiArvHistory(hn);
  return rows.length ? rows[0] : null;
};

/** ผล Lab ในช่วงเวลา (เรียงเก่า→ใหม่ ให้กราฟไล่ตามเวลา) */
export const filterHivStiLabTrend = (hn, fromIso = null, toIso = null) =>
  (followUpBase(hn)?.labTrend || [])
    .filter((r) => inHivStiRange(r.dateIso, fromIso, toIso))
    .slice()
    .sort((a, b) => (a.dateIso < b.dateIso ? -1 : 1));

export const filterHivStiVitalsTrend = (hn, fromIso = null, toIso = null) =>
  (followUpBase(hn)?.vitalsTrend || [])
    .filter((r) => inHivStiRange(r.dateIso, fromIso, toIso))
    .slice()
    .sort((a, b) => (a.dateIso < b.dateIso ? -1 : 1));

export const filterHivStiXray = (hn, fromIso = null, toIso = null) =>
  (followUpBase(hn)?.xray || [])
    .filter((r) => inHivStiRange(r.dateIso, fromIso, toIso))
    .slice()
    .sort((a, b) => (a.dateIso < b.dateIso ? 1 : -1));

/* ─── Session-scoped stores ───────────────────────────────────────── */

const canUseSessionStorage = () =>
  typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';

const readJson = (key, fallback) => {
  if (!canUseSessionStorage()) return fallback;
  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(key) || 'null');
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
};

const writeJson = (key, value) => {
  if (!canUseSessionStorage()) return;
  window.sessionStorage.setItem(key, JSON.stringify(value));
};

/* Confidential gate (§1.4.2) — ผ่านครั้งเดียวต่อ session ต่อโมดูล.
   NOTE: mock authentication เท่านั้น (PrivacyRevealPopup ไม่ตรวจรหัสจริง) —
   เป็น UX simulation ของข้อกำหนดข้อมูลลับ ไม่ใช่การเข้ารหัส/ยืนยันตัวตนจริง */
const GATE_KEY = 'mih:hivsti-gate-passed';

export const hasHivStiGatePassed = () => !!readJson(GATE_KEY, null);
export const passHivStiGate = () => {
  writeJson(GATE_KEY, { by: HIV_STI_CURRENT_STAFF.name, at: hivStiNowStamp() });
};
export const getHivStiGateAudit = () => readJson(GATE_KEY, null);

/* PII reveal audit — ทุกการเปิดเผยรายช่องถูกบันทึกผู้เปิด+เวลา */
const REVEAL_LOG_KEY = 'mih:hivsti-pii-reveals';

export const logHivStiPiiReveal = (hn, fieldLabel) => {
  const log = readJson(REVEAL_LOG_KEY, []);
  log.push({ hn, fieldLabel, by: HIV_STI_CURRENT_STAFF.name, at: hivStiNowStamp() });
  writeJson(REVEAL_LOG_KEY, log);
};
export const getHivStiPiiRevealLog = () => readJson(REVEAL_LOG_KEY, []);

/* ทะเบียน — สร้าง/แก้ไข/ยกเลิก/เปิดใช้งานใหม่ พร้อม audit stamp */
const REGISTRY_EDIT_KEY = 'mih:hivsti-registry-edits';
const REGISTRY_NEW_KEY = 'mih:hivsti-registry-new';
const REGISTRY_CANCEL_KEY = 'mih:hivsti-registry-cancelled';

export const getHivStiRegistryRows = () => {
  const edits = readJson(REGISTRY_EDIT_KEY, {});
  const created = readJson(REGISTRY_NEW_KEY, []);
  const base = HIV_STI_REGISTRY_BASE.map((row) => (edits[row.hn] ? { ...row, ...edits[row.hn] } : row));
  const merged = [...base];
  created.forEach((row) => {
    if (!merged.some((r) => r.hn === row.hn)) merged.push(edits[row.hn] ? { ...row, ...edits[row.hn] } : row);
  });
  return merged;
};

export const saveHivStiRegistryEntry = (entry, { isNew }) => {
  if (!entry?.hn) return;
  const stamp = { at: hivStiNowStamp(), by: HIV_STI_CURRENT_STAFF.name };
  if (isNew) {
    const created = readJson(REGISTRY_NEW_KEY, []);
    created.push({ ...entry, registeredAt: stamp.at, registeredBy: stamp.by });
    writeJson(REGISTRY_NEW_KEY, created);
  } else {
    const edits = readJson(REGISTRY_EDIT_KEY, {});
    edits[entry.hn] = { ...(edits[entry.hn] || {}), ...entry, editedAt: stamp.at, editedBy: stamp.by };
    writeJson(REGISTRY_EDIT_KEY, edits);
  }
};

export const cancelHivStiRegistry = (hn, reason) => {
  if (!hn) return;
  const store = readJson(REGISTRY_CANCEL_KEY, {});
  store[hn] = { reason: reason || 'ไม่ระบุเหตุผล', at: hivStiNowStamp(), by: HIV_STI_CURRENT_STAFF.name };
  writeJson(REGISTRY_CANCEL_KEY, store);
};

export const reactivateHivStiRegistry = (hn) => {
  if (!hn) return;
  const store = readJson(REGISTRY_CANCEL_KEY, {});
  delete store[hn];
  writeJson(REGISTRY_CANCEL_KEY, store);
};

export const getHivStiRegistryCancellation = (hn) => readJson(REGISTRY_CANCEL_KEY, {})[hn] || null;

/* Check-in จากแท็บ "นัดแล้วยังไม่มาติดต่อ" (คู่มือ 2.1) */
const CHECKED_IN_KEY = 'mih:hivsti-checked-in-today';

export const checkInHivStiAppointment = (hn) => {
  if (!hn) return;
  const store = readJson(CHECKED_IN_KEY, {});
  store[hn] = true;
  writeJson(CHECKED_IN_KEY, store);
};

export const getHivStiScheduledNotArrived = () => {
  const checkedIn = readJson(CHECKED_IN_KEY, {});
  return HIV_STI_SCHEDULED_TODAY.filter((p) => !checkedIn[p.hn]);
};

export const getHivStiQueueRows = () => {
  const checkedIn = readJson(CHECKED_IN_KEY, {});
  const drafts = readJson(DRAFT_KEY, {});
  const checkedInRows = HIV_STI_SCHEDULED_TODAY
    .filter((p) => checkedIn[p.hn])
    .map((p, idx) => ({
      ...p,
      queue: `W-${String(idx + 1).padStart(3, '0')}`,
      room: p.clinic,
      statusKey: 'waiting',
      waitMinutes: 0,
    }));
  return [...HIV_STI_PATIENTS, ...checkedInRows].map((row) =>
    (drafts[row.hn] ? { ...row, statusKey: 'draft' } : row));
};

/* ร่าง — ออกจากฟอร์มด้วย "บันทึกร่าง" → แถวไปโผล่แท็บที่ร่างไว้ */
const DRAFT_KEY = 'mih:hivsti-drafts';

export const saveHivStiDraft = (hn, form) => {
  if (!hn) return;
  const store = readJson(DRAFT_KEY, {});
  store[hn] = { form, savedAt: hivStiNowStamp(), savedBy: HIV_STI_CURRENT_STAFF.name };
  writeJson(DRAFT_KEY, store);
};
export const getHivStiDraft = (hn) => readJson(DRAFT_KEY, {})[hn] || null;
export const clearHivStiDraft = (hn) => {
  const store = readJson(DRAFT_KEY, {});
  delete store[hn];
  writeJson(DRAFT_KEY, store);
};

/* บันทึกการมารับบริการ — ต่อท้าย timeline (carry-forward ครั้งถัดไป) */
const VISIT_KEY = 'mih:hivsti-visit-history';

export const saveHivStiVisitRecord = (hn, record) => {
  if (!hn) return;
  const store = readJson(VISIT_KEY, {});
  store[hn] = [...(store[hn] || []), { ...record, recordedBy: HIV_STI_CURRENT_STAFF.name, recordedAt: hivStiNowStamp() }];
  writeJson(VISIT_KEY, store);
};

export const getHivStiVisitHistoryByHn = (hn) => {
  const stored = readJson(VISIT_KEY, {});
  return [...(HIV_STI_VISIT_HISTORY[hn] || []), ...(stored[hn] || [])];
};

export const getHivStiVisitNumber = (hn) => getHivStiVisitHistoryByHn(hn).length + 1;

/* PEP outcome (ครบ/ไม่ครบ 28 วัน + เหตุผล) + นัดติดตามครั้งถัดไป */
const PEP_OUTCOME_KEY = 'mih:hivsti-pep-outcomes';
const NEXT_FU_KEY = 'mih:hivsti-next-followups';

/** บันทึก/แก้ไขผลการกินยา PEP ครบ 28 วัน — บันทึกซ้ำถือเป็นการแก้ไข
    และทับ stamp ผู้แก้ไข+เวลาใหม่โดยยังเก็บผู้บันทึกครั้งแรกไว้ (audit) */
export const savePepOutcome = (hn, { completed, reason }) => {
  if (!hn) return;
  const store = readJson(PEP_OUTCOME_KEY, {});
  const prev = store[hn] || null;
  store[hn] = prev
    ? {
      ...prev,
      completed,
      reason: reason || '',
      editedAt: hivStiNowStamp(),
      editedBy: HIV_STI_CURRENT_STAFF.name,
    }
    : {
      completed,
      reason: reason || '',
      at: hivStiNowStamp(),
      by: HIV_STI_CURRENT_STAFF.name,
    };
  writeJson(PEP_OUTCOME_KEY, store);
};
export const getPepOutcome = (hn) => readJson(PEP_OUTCOME_KEY, {})[hn] || null;

/** ยกเลิกผลการติดตาม PEP ที่บันทึกไว้ (กลับสู่สถานะยังไม่สรุปผล) */
export const clearPepOutcome = (hn) => {
  const store = readJson(PEP_OUTCOME_KEY, {});
  delete store[hn];
  writeJson(PEP_OUTCOME_KEY, store);
};

export const saveNextFollowUp = (hn, { date, type }) => {
  if (!hn) return;
  const store = readJson(NEXT_FU_KEY, {});
  const prev = store[hn] || null;
  store[hn] = prev
    ? { ...prev, date, type, editedAt: hivStiNowStamp(), editedBy: HIV_STI_CURRENT_STAFF.name }
    : { date, type, at: hivStiNowStamp(), by: HIV_STI_CURRENT_STAFF.name };
  writeJson(NEXT_FU_KEY, store);
};
export const getNextFollowUp = (hn) => readJson(NEXT_FU_KEY, {})[hn] || null;

/** ยกเลิกนัดติดตามครั้งถัดไปที่บันทึกไว้ — กลับไปใช้วันนัดเดิมของระบบ */
export const clearNextFollowUp = (hn) => {
  const store = readJson(NEXT_FU_KEY, {});
  delete store[hn];
  writeJson(NEXT_FU_KEY, store);
};

/* ─── บันทึกการติดตามผู้ผิดนัด (โทร / เยี่ยม) ─────────────────────────
   เก็บครบ 4 กริยา: แสดง (get) · บันทึก (save) · แก้ไข (update) ·
   ยกเลิก (cancel — soft-cancel เพื่อคง audit trail ของผู้บันทึกเดิม) */
const FU_CONTACT_KEY = 'mih:hivsti-followup-contacts';

export const getHivStiFollowUpContacts = (hn) => readJson(FU_CONTACT_KEY, {})[hn] || [];

export const saveHivStiFollowUpContact = (hn, { channel, note }) => {
  if (!hn) return null;
  const store = readJson(FU_CONTACT_KEY, {});
  const entry = {
    id: `fu-${Date.now()}`,
    channel,
    note: note || '',
    at: hivStiNowStamp(),
    by: HIV_STI_CURRENT_STAFF.name,
    cancelled: null,
  };
  store[hn] = [entry, ...(store[hn] || [])];
  writeJson(FU_CONTACT_KEY, store);
  return entry;
};

export const updateHivStiFollowUpContact = (hn, id, { channel, note }) => {
  const store = readJson(FU_CONTACT_KEY, {});
  store[hn] = (store[hn] || []).map((c) => (c.id === id
    ? { ...c, channel, note: note || '', editedAt: hivStiNowStamp(), editedBy: HIV_STI_CURRENT_STAFF.name }
    : c));
  writeJson(FU_CONTACT_KEY, store);
};

export const cancelHivStiFollowUpContact = (hn, id, reason) => {
  const store = readJson(FU_CONTACT_KEY, {});
  store[hn] = (store[hn] || []).map((c) => (c.id === id
    ? { ...c, cancelled: { reason: reason || 'ไม่ระบุเหตุผล', at: hivStiNowStamp(), by: HIV_STI_CURRENT_STAFF.name } }
    : c));
  writeJson(FU_CONTACT_KEY, store);
};

/* ─── Worklist การติดตาม (base + สิ่งที่ session บันทึกทับ) ──────────── */

/** แถวของหน้าติดตามการดูแล — รวม base mock กับนัดครั้งถัดไป / ผล PEP /
    บันทึกการติดตาม ที่เจ้าหน้าที่บันทึกไว้ใน session แล้วคำนวณสถานะใหม่ */
export const getHivStiFollowUpRows = () => HIV_STI_FOLLOW_UPS.map((row) => {
  const saved = getNextFollowUp(row.hn);
  const nextDate = saved?.date || row.nextDate;
  const nextType = saved?.type || row.nextType || '';
  const { status, overdueDays } = resolveHivStiFollowUpStatus(nextDate);
  const pepOutcome = row.pep ? getPepOutcome(row.hn) : null;
  const contacts = getHivStiFollowUpContacts(row.hn).filter((c) => !c.cancelled);
  return {
    ...row,
    nextDate,
    nextType,
    nextFollowUpSaved: saved || null,
    status,
    overdueDays,
    pepOutcome,
    pepPending: !!row.pep && !pepOutcome,
    contactCount: contacts.length,
    cancelledRegistry: getHivStiRegistryCancellation(row.hn),
  };
});

export const getHivStiFollowUpByHn = (hn) => getHivStiFollowUpRows().find((r) => r.hn === hn) || null;

/* สิทธิผู้ใช้ (mock) — role ไม่มีสิทธิคลินิก HIV/STI เห็น read-only
   toggle ได้จาก sessionStorage เพื่อทดสอบ banner (ไม่มี UI สลับ role จริง) */
const ROLE_KEY = 'mih:hivsti-readonly-role';
export const canEditHivSti = () => !readJson(ROLE_KEY, false);
