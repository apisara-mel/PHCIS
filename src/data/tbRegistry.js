/* tbRegistry.js — ทะเบียนผู้ป่วยวัณโรค (TOR §1.10.4.6–.8) mock store.
   Legacy vocabulary lifted from คู่มือระบบวัณโรค.pdf (HCIS TB module):
   เลขที่ขึ้นทะเบียน xx/ปีงบ · ประเภทผู้ป่วย (ดู tbQueue.js) · สูตรยามาตรฐาน
   CAT-1(1) <2PHZE/4HR> … CAT-4 · สิ่งส่งตรวจครั้งที่ 1–3 · ผล Culture
   (Growth/No Growth/NTM/Contaminate/Pending) · DST · ผลการรักษา
   (Cured/Complete/Died/Failed/Default/Transfer out) · Smart TB export.

   Store is module-level mutable state (same contract as pharmacyRegistry):
   pages call the mutation helpers below then bump a local `tick` so their
   useMemo re-derives — no React state lives here. Every mutation appends
   an audit row (ผู้บันทึก + วันเวลา, playbook §5). */

import { getTbQueueRowByHn } from '@/data/tbQueue';

/* ── Catalogs ─────────────────────────────────────────────────────── */

/* สูตรยามาตรฐาน — exact legacy CAT list. `drugs` are the regimen's
   agents so the CPOE step can cross-check them against แพ้ยา. */
export const TB_REGIMENS = [
  {
    value: 'cat1-1', label: 'CAT-1 (1) <2PHZE/4HR>',
    description: 'ผู้ป่วยใหม่ — เข้มข้น 2 เดือน (HRZE) ต่อเนื่อง 4 เดือน (HR)',
    drugs: ['Isoniazid', 'Rifampicin', 'Pyrazinamide', 'Ethambutol'],
    months: 6,
  },
  {
    value: 'cat1-2', label: 'CAT-1 (2) <2HRZE/4H3R3>',
    description: 'ผู้ป่วยใหม่ — ระยะต่อเนื่องแบบสัปดาห์ละ 3 ครั้ง',
    drugs: ['Isoniazid', 'Rifampicin', 'Pyrazinamide', 'Ethambutol'],
    months: 6,
  },
  {
    value: 'cat2', label: 'CAT-2 <2HRZES/1HRZE/5HRE>',
    description: 'Relapse / TAD — สูตรรักษาซ้ำ มี Streptomycin 2 เดือนแรก',
    drugs: ['Isoniazid', 'Rifampicin', 'Pyrazinamide', 'Ethambutol', 'Streptomycin'],
    months: 8,
  },
  {
    value: 'cat3', label: 'CAT-3 <2HRZ/4HR>',
    description: 'ผู้ป่วยเสมหะไม่พบเชื้อ รอยโรคน้อย / วัณโรคนอกปอดไม่รุนแรง',
    drugs: ['Isoniazid', 'Rifampicin', 'Pyrazinamide'],
    months: 6,
  },
  {
    value: 'cat4', label: 'CAT-4 (MDR regimen)',
    description: 'วัณโรคดื้อยาหลายขนาน — สูตรยาแนวที่สองตามผล DST',
    drugs: ['Levofloxacin', 'Bedaquiline', 'Linezolid', 'Clofazimine', 'Cycloserine'],
    months: 18,
  },
];

export const resolveTbRegimen = (value) => TB_REGIMENS.find((r) => r.value === value) || null;

/* ผลการรักษา (ปิดทะเบียน) — legacy outcome list. */
export const TB_OUTCOMES = [
  { value: 'cured',    label: 'รักษาหาย (Cured)',            badge: 'green'  },
  { value: 'complete', label: 'รักษาครบ (Treatment complete)', badge: 'teal' },
  { value: 'died',     label: 'เสียชีวิต (Died)',             badge: 'grey'  },
  { value: 'failed',   label: 'ล้มเหลว (Failed)',             badge: 'red'   },
  { value: 'default',  label: 'ขาดยา (Default)',              badge: 'orange' },
  { value: 'transfer', label: 'โอนออก (Transfer out)',        badge: 'blue'  },
];

export const resolveTbOutcome = (value) => TB_OUTCOMES.find((o) => o.value === value) || null;

/* ชนิดวัณโรค */
export const TB_DISEASE_SITES = [
  { value: 'pulmonary',      label: 'วัณโรคปอด (Pulmonary TB)' },
  { value: 'extrapulmonary', label: 'วัณโรคนอกปอด (Extrapulmonary TB)' },
];

/* ตำแหน่งนอกปอดที่พบบ่อยในเวชปฏิบัติศูนย์ฯ */
export const TB_EP_SITES = [
  'ต่อมน้ำเหลือง (Lymph node)', 'เยื่อหุ้มปอด (Pleura)', 'กระดูกสันหลัง (Spine)',
  'เยื่อหุ้มสมอง (Meninges)', 'ลำไส้/ช่องท้อง (Abdomen)', 'ผิวหนัง (Skin)', 'อื่น ๆ',
];

/* ผล Culture — exact legacy result vocabulary. */
export const TB_CULTURE_RESULTS = [
  { value: 'growth',      label: 'Growth',      badge: 'red'    },
  { value: 'noGrowth',    label: 'No Growth',   badge: 'green'  },
  { value: 'ntm',         label: 'NTM',         badge: 'purple' },
  { value: 'contaminate', label: 'Contaminate', badge: 'orange' },
  { value: 'pending',     label: 'Pending',     badge: 'grey'   },
];

export const resolveTbCultureResult = (value) =>
  TB_CULTURE_RESULTS.find((c) => c.value === value) || null;

/* ผลเสมหะ AFB (smear) — per สิ่งส่งตรวจครั้งที่ 1–3 */
export const TB_SMEAR_RESULTS = [
  { value: 'neg',   label: 'Negative', badge: 'green' },
  { value: 'scanty', label: 'Scanty',  badge: 'yellow' },
  { value: '1plus', label: '1+',       badge: 'orange' },
  { value: '2plus', label: '2+',       badge: 'red' },
  { value: '3plus', label: '3+',       badge: 'red' },
  { value: 'pending', label: 'รอผล',   badge: 'grey' },
];

export const resolveTbSmearResult = (value) =>
  TB_SMEAR_RESULTS.find((s) => s.value === value) || null;

export const TB_DOCTORS = ['พญ.ศิรินทร์ พัฒนกุล', 'พญ.สมหญิง รักษ์ดี', 'นพ.ณัฐวุฒิ บุญมี'];

/* ── Helpers ──────────────────────────────────────────────────────── */

export const formatTbDate = (d) => {
  if (!d) return '—';
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return String(d);
  return new Intl.DateTimeFormat('th-TH-u-ca-buddhist', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
};

export const nowTbStamp = () =>
  new Intl.DateTimeFormat('th-TH-u-ca-buddhist', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(new Date());

let auditSeq = 0;
const auditRow = (action, detail, by = 'พว.เพ็ญศรี สุขใจ') => ({
  id: `au-${Date.now()}-${auditSeq += 1}`,
  at: nowTbStamp(),
  by,
  action,
  detail,
});

/* ── ทะเบียน records ──────────────────────────────────────────────── */
/* HNs reuse tbQueue.js rows so PatientCard resolves real identities.
   `treatmentStartDate` is ISO — the DOT grid derives its month span from
   it. Records are intentionally spread across states: active month 0–6,
   MDR CAT-4, an EP case, one closed (Cured) prior registration for the
   Relapse patient (duplicate-registration + re-register edge), and one
   record already ยกเลิก. */

const isoDaysAgo = (days) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
};

export const TB_REGISTRY = [
  {
    id: 'tbreg-2569-01', regNo: '01/2569', fiscalYear: '2569',
    hn: '67-00009', name: 'นายกิตติ ศรีสมบูรณ์',
    patientType: 'newMPlus', diseaseSite: 'pulmonary', epSite: '',
    registeredDate: isoDaysAgo(64), treatmentStartDate: isoDaysAgo(62),
    regimen: 'cat1-1', treatmentMonth: 2, weightKg: 58.5,
    doctor: 'พญ.ศิรินทร์ พัฒนกุล',
    priorTreatment: 'ไม่เคยรักษาวัณโรคมาก่อน',
    cxr: { date: isoDaysAgo(64), result: 'Infiltration RUL (right upper lobe)', abnormal: true },
    sputumRows: [
      { id: 'sp-01-1', month: 'ก่อนเริ่มรักษา', specimenNo: 1, date: isoDaysAgo(65), result: '3plus', status: 'saved', recordedBy: 'ทนพ.วรุตม์ ชูเกียรติ', recordedAt: formatTbDate(isoDaysAgo(65)) },
      { id: 'sp-01-2', month: 'ก่อนเริ่มรักษา', specimenNo: 2, date: isoDaysAgo(65), result: '2plus', status: 'saved', recordedBy: 'ทนพ.วรุตม์ ชูเกียรติ', recordedAt: formatTbDate(isoDaysAgo(65)) },
      { id: 'sp-01-3', month: 'เดือนที่ 2', specimenNo: 1, date: isoDaysAgo(4), result: 'neg', status: 'saved', recordedBy: 'ทนพ.วรุตม์ ชูเกียรติ', recordedAt: formatTbDate(isoDaysAgo(4)) },
    ],
    regimenRows: [
      { id: 'rx-01-1', regimen: 'cat1-1', dispensedDate: isoDaysAgo(62), weightKg: 58.5, note: 'เริ่มยาเข้มข้น HRZE', complication: '', status: 'saved', recordedBy: 'ภญ.กมลชนก เวชกุล', recordedAt: formatTbDate(isoDaysAgo(62)) },
      { id: 'rx-01-2', regimen: 'cat1-1', dispensedDate: isoDaysAgo(32), weightKg: 59.0, note: 'รับยาเดือนที่ 2', complication: 'คลื่นไส้เล็กน้อย ให้กินยาพร้อมอาหาร', status: 'saved', recordedBy: 'ภญ.กมลชนก เวชกุล', recordedAt: formatTbDate(isoDaysAgo(32)) },
    ],
    cultureRows: [
      { id: 'cu-01-1', specimen: 'Sputum', sentDate: isoDaysAgo(65), result: 'growth', organism: 'M. tuberculosis complex', reportDate: isoDaysAgo(30) },
    ],
    dstRows: [
      { id: 'dst-01-1', sentDate: isoDaysAgo(30), isoniazid: 'S', rifampicin: 'S', ethambutol: 'S', streptomycin: 'S', reportDate: isoDaysAgo(12) },
    ],
    followUps: [
      { id: 'fu-01-1', date: isoDaysAgo(35), type: 'นัดรับยา', note: 'มาตามนัด อาการดีขึ้น ไอลดลง', by: 'พญ.ศิรินทร์ พัฒนกุล', status: 'saved' },
      { id: 'fu-01-2', date: isoDaysAgo(20), type: 'เยี่ยมบ้าน', note: 'เยี่ยมบ้านโดย อสส. — สภาพแวดล้อมระบายอากาศดี ผู้สัมผัสร่วมบ้าน 3 คน', by: 'อสส.สมพร ใจดี', status: 'saved' },
    ],
    nextAppointment: { date: isoDaysAgo(-14), type: 'นัดรับยา + ส่งเสมหะเดือนที่ 3' },
    contacts: [
      { id: 'ct-01-1', name: 'นางสายใจ ศรีสมบูรณ์', relation: 'ภรรยา', age: 49, screeningResult: 'ปกติ', screeningDate: isoDaysAgo(50), status: 'saved' },
      { id: 'ct-01-2', name: 'นายกิตติพงศ์ ศรีสมบูรณ์', relation: 'บุตร', age: 24, screeningResult: 'ยังไม่ได้คัดกรอง', screeningDate: '', status: 'saved' },
    ],
    closure: null, cancelled: null,
    auditTrail: [
      { id: 'au-seed-01a', at: formatTbDate(isoDaysAgo(64)) + ' · 10:02', by: 'พว.เพ็ญศรี สุขใจ', action: 'ขึ้นทะเบียน', detail: 'ขึ้นทะเบียนผู้ป่วยใหม่ New M+ เลขที่ 01/2569' },
      { id: 'au-seed-01b', at: formatTbDate(isoDaysAgo(32)) + ' · 09:40', by: 'ภญ.กมลชนก เวชกุล', action: 'บันทึกการจ่ายยา', detail: 'จ่ายยา CAT-1 (1) เดือนที่ 2' },
    ],
  },
  {
    id: 'tbreg-2569-02', regNo: '02/2569', fiscalYear: '2569',
    hn: '67-00018', name: 'นายธีรเดช อัครพงศ์',
    patientType: 'mdr', diseaseSite: 'pulmonary', epSite: '',
    registeredDate: isoDaysAgo(155), treatmentStartDate: isoDaysAgo(150),
    regimen: 'cat4', treatmentMonth: 5, weightKg: 55.0,
    doctor: 'พญ.ศิรินทร์ พัฒนกุล',
    priorTreatment: 'เคยรักษา CAT-1 ปี 2567 — ผล DST ดื้อ Isoniazid + Rifampicin',
    cxr: { date: isoDaysAgo(155), result: 'Bilateral upper lobe cavities', abnormal: true },
    sputumRows: [
      { id: 'sp-02-1', month: 'ก่อนเริ่มรักษา', specimenNo: 1, date: isoDaysAgo(156), result: '2plus', status: 'saved', recordedBy: 'ทนพ.วรุตม์ ชูเกียรติ', recordedAt: formatTbDate(isoDaysAgo(156)) },
      { id: 'sp-02-2', month: 'เดือนที่ 3', specimenNo: 1, date: isoDaysAgo(60), result: '1plus', status: 'saved', recordedBy: 'ทนพ.วรุตม์ ชูเกียรติ', recordedAt: formatTbDate(isoDaysAgo(60)) },
      { id: 'sp-02-3', month: 'เดือนที่ 5', specimenNo: 1, date: isoDaysAgo(6), result: 'pending', status: 'saved', recordedBy: 'ทนพ.วรุตม์ ชูเกียรติ', recordedAt: formatTbDate(isoDaysAgo(6)) },
    ],
    regimenRows: [
      { id: 'rx-02-1', regimen: 'cat4', dispensedDate: isoDaysAgo(150), weightKg: 54.0, note: 'เริ่มสูตร MDR ตามผล DST', complication: '', status: 'saved', recordedBy: 'ภญ.กมลชนก เวชกุล', recordedAt: formatTbDate(isoDaysAgo(150)) },
      { id: 'rx-02-2', regimen: 'cat4', dispensedDate: isoDaysAgo(28), weightKg: 55.0, note: 'รับยาเดือนที่ 5 — ทำ VOT ผ่าน Telemedicine', complication: 'ชาปลายมือปลายเท้า (Linezolid) — ติดตามใกล้ชิด', status: 'saved', recordedBy: 'ภญ.กมลชนก เวชกุล', recordedAt: formatTbDate(isoDaysAgo(28)) },
    ],
    cultureRows: [
      { id: 'cu-02-1', specimen: 'Sputum', sentDate: isoDaysAgo(156), result: 'growth', organism: 'M. tuberculosis complex', reportDate: isoDaysAgo(120) },
      { id: 'cu-02-2', specimen: 'Sputum', sentDate: isoDaysAgo(60), result: 'pending', organism: '', reportDate: '' },
    ],
    dstRows: [
      { id: 'dst-02-1', sentDate: isoDaysAgo(120), isoniazid: 'R', rifampicin: 'R', ethambutol: 'S', streptomycin: 'S', reportDate: isoDaysAgo(95) },
    ],
    followUps: [
      { id: 'fu-02-1', date: isoDaysAgo(90), type: 'เยี่ยมบ้าน', note: 'ผู้ป่วยอยู่คอนโดคนเดียว — จัด VOT แทน DOT เยี่ยมบ้าน', by: 'พว.อรทัย แก้วประเสริฐ', status: 'saved' },
      { id: 'fu-02-2', date: isoDaysAgo(28), type: 'นัดรับยา', note: 'มาตามนัด น้ำหนักเพิ่ม 1 กก.', by: 'พญ.ศิรินทร์ พัฒนกุล', status: 'saved' },
    ],
    nextAppointment: { date: isoDaysAgo(-7), type: 'นัดรับยา + ติดตามผล Culture เดือนที่ 5' },
    contacts: [
      { id: 'ct-02-1', name: 'นางสาวปรียา อัครพงศ์', relation: 'น้องสาว (มาเยี่ยมประจำ)', age: 38, screeningResult: 'สงสัย — ส่ง CXR', screeningDate: isoDaysAgo(88), status: 'saved' },
    ],
    closure: null, cancelled: null,
    auditTrail: [
      { id: 'au-seed-02a', at: formatTbDate(isoDaysAgo(155)) + ' · 13:20', by: 'พว.อรทัย แก้วประเสริฐ', action: 'ขึ้นทะเบียน', detail: 'ขึ้นทะเบียน MDR-TB เลขที่ 02/2569' },
    ],
  },
  {
    id: 'tbreg-2569-03', regNo: '03/2569', fiscalYear: '2569',
    hn: '67-00014', name: 'นายชัยวัฒน์ ก้องเกียรติ',
    patientType: 'relapse', diseaseSite: 'pulmonary', epSite: '',
    registeredDate: isoDaysAgo(40), treatmentStartDate: isoDaysAgo(38),
    regimen: 'cat2', treatmentMonth: 1, weightKg: 62.0,
    doctor: 'พญ.สมหญิง รักษ์ดี',
    priorTreatment: 'เคยรักษาหาย (Cured) ทะเบียน 18/2565 — กลับเป็นซ้ำ',
    cxr: { date: isoDaysAgo(40), result: 'New infiltration LLL', abnormal: true },
    sputumRows: [
      { id: 'sp-03-1', month: 'ก่อนเริ่มรักษา', specimenNo: 1, date: isoDaysAgo(41), result: '1plus', status: 'saved', recordedBy: 'ทนพ.วรุตม์ ชูเกียรติ', recordedAt: formatTbDate(isoDaysAgo(41)) },
      { id: 'sp-03-2', month: 'ก่อนเริ่มรักษา', specimenNo: 2, date: isoDaysAgo(41), result: 'scanty', status: 'cancelled', cancelReason: 'สิ่งส่งตรวจปนเปื้อน เก็บใหม่', recordedBy: 'ทนพ.วรุตม์ ชูเกียรติ', recordedAt: formatTbDate(isoDaysAgo(41)) },
      { id: 'sp-03-3', month: 'ก่อนเริ่มรักษา', specimenNo: 3, date: isoDaysAgo(39), result: '1plus', status: 'saved', recordedBy: 'ทนพ.วรุตม์ ชูเกียรติ', recordedAt: formatTbDate(isoDaysAgo(39)) },
    ],
    regimenRows: [
      { id: 'rx-03-1', regimen: 'cat2', dispensedDate: isoDaysAgo(38), weightKg: 62.0, note: 'เริ่ม CAT-2 — ระวังแพ้ Rifampicin (ประวัติผื่น)', complication: '', status: 'saved', recordedBy: 'ภญ.กมลชนก เวชกุล', recordedAt: formatTbDate(isoDaysAgo(38)) },
    ],
    cultureRows: [
      { id: 'cu-03-1', specimen: 'Sputum', sentDate: isoDaysAgo(41), result: 'pending', organism: '', reportDate: '' },
    ],
    dstRows: [],
    followUps: [
      { id: 'fu-03-1', date: isoDaysAgo(10), type: 'ติดตามทางโทรศัพท์', note: 'มีผื่นคันเล็กน้อย นัดพบแพทย์ก่อนกำหนด', by: 'พว.เพ็ญศรี สุขใจ', status: 'saved' },
    ],
    nextAppointment: { date: isoDaysAgo(-3), type: 'พบแพทย์ประเมินผื่นแพ้ยา' },
    contacts: [],
    closure: null, cancelled: null,
    auditTrail: [
      { id: 'au-seed-03a', at: formatTbDate(isoDaysAgo(40)) + ' · 09:55', by: 'พว.เพ็ญศรี สุขใจ', action: 'ขึ้นทะเบียน', detail: 'ขึ้นทะเบียน Relapse เลขที่ 03/2569 (ทะเบียนเดิม 18/2565 ปิดแล้ว)' },
    ],
  },
  {
    id: 'tbreg-2569-04', regNo: '04/2569', fiscalYear: '2569',
    hn: '67-00022', name: 'นายอนุชา สมบูรณ์ทรัพย์',
    patientType: 'tad', diseaseSite: 'pulmonary', epSite: '',
    registeredDate: isoDaysAgo(35), treatmentStartDate: isoDaysAgo(33),
    regimen: 'cat2', treatmentMonth: 1, weightKg: 66.0,
    doctor: 'นพ.ณัฐวุฒิ บุญมี',
    priorTreatment: 'ขาดยาจากทะเบียน 31/2568 นาน 3 เดือน — ขึ้นทะเบียนใหม่เป็น TAD',
    cxr: { date: isoDaysAgo(35), result: 'Infiltration RUL, unchanged', abnormal: true },
    sputumRows: [
      { id: 'sp-04-1', month: 'ก่อนเริ่มรักษา', specimenNo: 1, date: isoDaysAgo(36), result: '2plus', status: 'saved', recordedBy: 'ทนพ.วรุตม์ ชูเกียรติ', recordedAt: formatTbDate(isoDaysAgo(36)) },
    ],
    regimenRows: [
      { id: 'rx-04-1', regimen: 'cat2', dispensedDate: isoDaysAgo(33), weightKg: 66.0, note: 'เริ่ม CAT-2 พร้อมกำชับ DOT เข้ม', complication: '', status: 'saved', recordedBy: 'ภญ.กมลชนก เวชกุล', recordedAt: formatTbDate(isoDaysAgo(33)) },
    ],
    cultureRows: [], dstRows: [],
    followUps: [
      { id: 'fu-04-1', date: isoDaysAgo(15), type: 'เยี่ยมบ้าน', note: 'พบผู้ป่วยที่บ้าน กำชับการกินยาต่อหน้า อสส.', by: 'อสส.สมพร ใจดี', status: 'saved' },
    ],
    nextAppointment: { date: isoDaysAgo(-10), type: 'นัดรับยาเดือนที่ 2' },
    contacts: [
      { id: 'ct-04-1', name: 'นางบุญมี สมบูรณ์ทรัพย์', relation: 'มารดา', age: 68, screeningResult: 'ปกติ', screeningDate: isoDaysAgo(20), status: 'saved' },
      { id: 'ct-04-2', name: 'ด.ช.ภูมิ สมบูรณ์ทรัพย์', relation: 'บุตร', age: 6, screeningResult: 'ยังไม่ได้คัดกรอง', screeningDate: '', status: 'saved' },
    ],
    closure: null, cancelled: null,
    auditTrail: [
      { id: 'au-seed-04a', at: formatTbDate(isoDaysAgo(35)) + ' · 11:12', by: 'พว.เพ็ญศรี สุขใจ', action: 'ขึ้นทะเบียน', detail: 'ขึ้นทะเบียน TAD เลขที่ 04/2569' },
    ],
  },
  {
    id: 'tbreg-2569-05', regNo: '05/2569', fiscalYear: '2569',
    hn: '67-00016', name: 'นายปกรณ์ บุญพิทักษ์',
    patientType: 'newMMinus', diseaseSite: 'pulmonary', epSite: '',
    registeredDate: isoDaysAgo(6), treatmentStartDate: '',
    regimen: '', treatmentMonth: 0, weightKg: 65.5,
    doctor: 'นพ.ณัฐวุฒิ บุญมี',
    priorTreatment: 'ไม่เคยรักษาวัณโรคมาก่อน',
    cxr: { date: isoDaysAgo(7), result: 'Patchy infiltration RML', abnormal: true },
    sputumRows: [
      { id: 'sp-05-1', month: 'ก่อนเริ่มรักษา', specimenNo: 1, date: isoDaysAgo(7), result: 'neg', status: 'saved', recordedBy: 'ทนพ.วรุตม์ ชูเกียรติ', recordedAt: formatTbDate(isoDaysAgo(7)) },
      { id: 'sp-05-2', month: 'ก่อนเริ่มรักษา', specimenNo: 2, date: isoDaysAgo(7), result: 'neg', status: 'saved', recordedBy: 'ทนพ.วรุตม์ ชูเกียรติ', recordedAt: formatTbDate(isoDaysAgo(7)) },
    ],
    regimenRows: [], cultureRows: [], dstRows: [], followUps: [],
    nextAppointment: { date: isoDaysAgo(-1), type: 'พบแพทย์เริ่มยา (สิทธิหมดอายุ — แจ้งงานสิทธิแล้ว)' },
    contacts: [],
    closure: null, cancelled: null,
    auditTrail: [
      { id: 'au-seed-05a', at: formatTbDate(isoDaysAgo(6)) + ' · 10:30', by: 'พว.อรทัย แก้วประเสริฐ', action: 'ขึ้นทะเบียน', detail: 'ขึ้นทะเบียน New M- เลขที่ 05/2569 (สิทธิหมดอายุ — flag ไว้)' },
    ],
  },
  {
    id: 'tbreg-2569-06', regNo: '06/2569', fiscalYear: '2569',
    hn: '67-00007', name: 'นางมาลี อ่อนน้อม',
    patientType: 'ep', diseaseSite: 'extrapulmonary', epSite: 'ต่อมน้ำเหลือง (Lymph node)',
    registeredDate: isoDaysAgo(126), treatmentStartDate: isoDaysAgo(124),
    regimen: 'cat3', treatmentMonth: 4, weightKg: 52.0,
    doctor: 'พญ.ศิรินทร์ พัฒนกุล',
    priorTreatment: 'ไม่เคยรักษาวัณโรคมาก่อน',
    cxr: { date: isoDaysAgo(126), result: 'ปกติ — no active lesion', abnormal: false },
    sputumRows: [],
    regimenRows: [
      { id: 'rx-06-1', regimen: 'cat3', dispensedDate: isoDaysAgo(124), weightKg: 51.0, note: 'TB lymph node — เริ่ม CAT-3', complication: '', status: 'saved', recordedBy: 'ภญ.กมลชนก เวชกุล', recordedAt: formatTbDate(isoDaysAgo(124)) },
      { id: 'rx-06-2', regimen: 'cat3', dispensedDate: isoDaysAgo(35), weightKg: 52.0, note: 'รับยาเดือนที่ 4 ก้อนยุบลงชัดเจน', complication: '', status: 'saved', recordedBy: 'ภญ.กมลชนก เวชกุล', recordedAt: formatTbDate(isoDaysAgo(35)) },
    ],
    cultureRows: [
      { id: 'cu-06-1', specimen: 'Lymph node biopsy', sentDate: isoDaysAgo(126), result: 'growth', organism: 'M. tuberculosis complex', reportDate: isoDaysAgo(90) },
    ],
    dstRows: [],
    followUps: [
      { id: 'fu-06-1', date: isoDaysAgo(60), type: 'นัดรับยา', note: 'ก้อนที่คอเล็กลง ไม่มีไข้', by: 'พญ.ศิรินทร์ พัฒนกุล', status: 'saved' },
    ],
    nextAppointment: { date: isoDaysAgo(-21), type: 'นัดรับยาเดือนที่ 5' },
    contacts: [
      { id: 'ct-06-1', name: 'นายอ่อน อ่อนน้อม', relation: 'สามี', age: 50, screeningResult: 'ปกติ', screeningDate: isoDaysAgo(110), status: 'saved' },
    ],
    closure: null, cancelled: null,
    auditTrail: [
      { id: 'au-seed-06a', at: formatTbDate(isoDaysAgo(126)) + ' · 14:05', by: 'พว.เพ็ญศรี สุขใจ', action: 'ขึ้นทะเบียน', detail: 'ขึ้นทะเบียน EP (ต่อมน้ำเหลือง) เลขที่ 06/2569' },
    ],
  },
  {
    id: 'tbreg-2568-52', regNo: '52/2568', fiscalYear: '2568',
    hn: '67-00025', name: 'นายภาสกร ชาญฉลาด',
    patientType: 'newMPlus', diseaseSite: 'pulmonary', epSite: '',
    registeredDate: isoDaysAgo(190), treatmentStartDate: isoDaysAgo(186),
    regimen: 'cat1-1', treatmentMonth: 6, weightKg: 70.0,
    doctor: 'นพ.ณัฐวุฒิ บุญมี',
    priorTreatment: 'ไม่เคยรักษาวัณโรคมาก่อน',
    cxr: { date: isoDaysAgo(190), result: 'Infiltration LUL', abnormal: true },
    sputumRows: [
      { id: 'sp-52-1', month: 'ก่อนเริ่มรักษา', specimenNo: 1, date: isoDaysAgo(191), result: '2plus', status: 'saved', recordedBy: 'ทนพ.วรุตม์ ชูเกียรติ', recordedAt: formatTbDate(isoDaysAgo(191)) },
      { id: 'sp-52-2', month: 'เดือนที่ 2', specimenNo: 1, date: isoDaysAgo(130), result: 'neg', status: 'saved', recordedBy: 'ทนพ.วรุตม์ ชูเกียรติ', recordedAt: formatTbDate(isoDaysAgo(130)) },
      { id: 'sp-52-3', month: 'เดือนที่ 5', specimenNo: 1, date: isoDaysAgo(40), result: 'neg', status: 'saved', recordedBy: 'ทนพ.วรุตม์ ชูเกียรติ', recordedAt: formatTbDate(isoDaysAgo(40)) },
      { id: 'sp-52-4', month: 'เดือนที่ 6', specimenNo: 1, date: isoDaysAgo(8), result: 'neg', status: 'saved', recordedBy: 'ทนพ.วรุตม์ ชูเกียรติ', recordedAt: formatTbDate(isoDaysAgo(8)) },
    ],
    regimenRows: [
      { id: 'rx-52-1', regimen: 'cat1-1', dispensedDate: isoDaysAgo(186), weightKg: 68.0, note: 'เริ่มยา', complication: '', status: 'saved', recordedBy: 'ภญ.กมลชนก เวชกุล', recordedAt: formatTbDate(isoDaysAgo(186)) },
      { id: 'rx-52-2', regimen: 'cat1-1', dispensedDate: isoDaysAgo(8), weightKg: 70.0, note: 'รับยาเดือนสุดท้าย — เตรียมปิดทะเบียน', complication: '', status: 'saved', recordedBy: 'ภญ.กมลชนก เวชกุล', recordedAt: formatTbDate(isoDaysAgo(8)) },
    ],
    cultureRows: [
      { id: 'cu-52-1', specimen: 'Sputum', sentDate: isoDaysAgo(191), result: 'growth', organism: 'M. tuberculosis complex', reportDate: isoDaysAgo(160) },
      { id: 'cu-52-2', specimen: 'Sputum', sentDate: isoDaysAgo(40), result: 'noGrowth', organism: '', reportDate: isoDaysAgo(10) },
    ],
    dstRows: [
      { id: 'dst-52-1', sentDate: isoDaysAgo(160), isoniazid: 'S', rifampicin: 'S', ethambutol: 'S', streptomycin: 'S', reportDate: isoDaysAgo(140) },
    ],
    followUps: [
      { id: 'fu-52-1', date: isoDaysAgo(8), type: 'นัดรับยา', note: 'ครบ 6 เดือน เสมหะ Negative ต่อเนื่อง — รอแพทย์สรุปปิดทะเบียน', by: 'นพ.ณัฐวุฒิ บุญมี', status: 'saved' },
    ],
    nextAppointment: { date: isoDaysAgo(-5), type: 'นัดสรุปผลการรักษา / ปิดทะเบียน' },
    contacts: [
      { id: 'ct-52-1', name: 'นางสาวชลดา ชาญฉลาด', relation: 'ภรรยา', age: 39, screeningResult: 'ปกติ', screeningDate: isoDaysAgo(170), status: 'saved' },
    ],
    closure: null, cancelled: null,
    auditTrail: [
      { id: 'au-seed-52a', at: formatTbDate(isoDaysAgo(190)) + ' · 09:00', by: 'พว.เพ็ญศรี สุขใจ', action: 'ขึ้นทะเบียน', detail: 'ขึ้นทะเบียน New M+ เลขที่ 52/2568' },
    ],
  },
  /* ทะเบียนที่ปิดแล้ว (Cured) ของผู้ป่วย Relapse — ตัวอย่าง read-only หลังปิด
     + หลักฐานว่า Relapse ขึ้นทะเบียนใหม่ได้เมื่อทะเบียนเดิมปิดแล้ว. */
  {
    id: 'tbreg-2565-18', regNo: '18/2565', fiscalYear: '2565',
    hn: '67-00014', name: 'นายชัยวัฒน์ ก้องเกียรติ',
    patientType: 'newMPlus', diseaseSite: 'pulmonary', epSite: '',
    registeredDate: '2022-03-14', treatmentStartDate: '2022-03-16',
    regimen: 'cat1-1', treatmentMonth: 6, weightKg: 60.0,
    doctor: 'พญ.สมหญิง รักษ์ดี',
    priorTreatment: 'ไม่เคยรักษาวัณโรคมาก่อน',
    cxr: { date: '2022-03-14', result: 'Infiltration RUL', abnormal: true },
    sputumRows: [
      { id: 'sp-18-1', month: 'ก่อนเริ่มรักษา', specimenNo: 1, date: '2022-03-14', result: '2plus', status: 'saved', recordedBy: 'ทนพ.วรุตม์ ชูเกียรติ', recordedAt: '14 มี.ค. 2565' },
      { id: 'sp-18-2', month: 'เดือนที่ 6', specimenNo: 1, date: '2022-09-10', result: 'neg', status: 'saved', recordedBy: 'ทนพ.วรุตม์ ชูเกียรติ', recordedAt: '10 ก.ย. 2565' },
    ],
    regimenRows: [
      { id: 'rx-18-1', regimen: 'cat1-1', dispensedDate: '2022-03-16', weightKg: 60.0, note: 'เริ่มยา', complication: '', status: 'saved', recordedBy: 'ภญ.กมลชนก เวชกุล', recordedAt: '16 มี.ค. 2565' },
    ],
    cultureRows: [], dstRows: [], followUps: [],
    nextAppointment: null,
    contacts: [],
    closure: { outcome: 'cured', date: '2022-09-20', note: 'เสมหะ Negative เดือนที่ 5 และ 6 — รักษาหาย', by: 'พญ.สมหญิง รักษ์ดี', at: '20 ก.ย. 2565 · 15:10' },
    cancelled: null,
    auditTrail: [
      { id: 'au-seed-18a', at: '14 มี.ค. 2565 · 10:00', by: 'พว.เพ็ญศรี สุขใจ', action: 'ขึ้นทะเบียน', detail: 'ขึ้นทะเบียน New M+ เลขที่ 18/2565' },
      { id: 'au-seed-18b', at: '20 ก.ย. 2565 · 15:10', by: 'พญ.สมหญิง รักษ์ดี', action: 'ปิดทะเบียน', detail: 'ผลการรักษา: รักษาหาย (Cured)' },
    ],
  },
];

/* ── Queries ──────────────────────────────────────────────────────── */

export const getTbRegistryRows = () => TB_REGISTRY;

export const getTbRegistryById = (id) => TB_REGISTRY.find((r) => r.id === id) || null;

export const getTbRegistryByRegNo = (regNo) => TB_REGISTRY.find((r) => r.regNo === regNo) || null;

/* ทะเบียน active (ยังไม่ปิด + ไม่ยกเลิก) ของ HN — ใช้กันขึ้นทะเบียนซ้ำ. */
export const getActiveTbRegistrationByHn = (hn) =>
  TB_REGISTRY.find((r) => r.hn === hn && !r.closure && !r.cancelled) || null;

export const isTbRegistryReadOnly = (record) => !!(record?.closure || record?.cancelled);

/* ── Mutations (page bumps its own tick after each call) ──────────── */

let regSeq = 100;
const nextRowId = (prefix) => `${prefix}-${Date.now()}-${regSeq += 1}`;

export const appendTbAudit = (record, action, detail, by) => {
  record.auditTrail = [auditRow(action, detail, by), ...record.auditTrail];
};

/* บันทึกการเปิดดูทะเบียน (ข้อมูลลับ §1.4.2 — audit every view). */
export const logTbRegistryView = (record, viewer = 'ผู้ใช้งานปัจจุบัน') => {
  appendTbAudit(record, 'เปิดดูทะเบียน', `เปิดดูรายละเอียดทะเบียน ${record.regNo}`, viewer);
};

/* ขึ้นทะเบียนรายใหม่ — บังคับข้อมูลขั้นต่ำ + กันทะเบียนซ้ำที่ยัง active. */
export const registerTbPatient = ({ hn, patientType, registeredDate, diseaseSite, epSite = '', regimen = '', doctor = '', by }) => {
  if (!hn || !patientType || !registeredDate || !diseaseSite) {
    return { ok: false, error: 'ต้องระบุผู้ป่วย, ประเภทผู้ป่วย, วันขึ้นทะเบียน และชนิดวัณโรคให้ครบ' };
  }
  const existing = getActiveTbRegistrationByHn(hn);
  if (existing) {
    return { ok: false, error: 'duplicate', existing };
  }
  const queueRow = getTbQueueRowByHn(hn);
  const fiscalYear = String(new Date().getFullYear() + 543);
  const seq = TB_REGISTRY.filter((r) => r.fiscalYear === fiscalYear).length + 7;
  const regNo = `${String(seq).padStart(2, '0')}/${fiscalYear}`;
  const record = {
    id: `tbreg-${fiscalYear}-${String(seq).padStart(2, '0')}`,
    regNo, fiscalYear,
    hn, name: queueRow?.name || hn,
    patientType, diseaseSite, epSite,
    registeredDate, treatmentStartDate: '',
    regimen, treatmentMonth: 0, weightKg: null,
    doctor: doctor || queueRow?.doctor || '',
    priorTreatment: '',
    cxr: null,
    sputumRows: [], regimenRows: [], cultureRows: [], dstRows: [],
    followUps: [], nextAppointment: null, contacts: [],
    closure: null, cancelled: null,
    auditTrail: [auditRow('ขึ้นทะเบียน', `ขึ้นทะเบียนใหม่ เลขที่ ${regNo}`, by)],
  };
  TB_REGISTRY.unshift(record);
  return { ok: true, record };
};

/* ยกเลิกทะเบียน (ต้องมีเหตุผล — แถวยังอยู่ให้เห็นเป็น "ยกเลิก"). */
export const cancelTbRegistration = (id, reason, by) => {
  const record = getTbRegistryById(id);
  if (!record || !reason?.trim()) return false;
  record.cancelled = { reason: reason.trim(), at: nowTbStamp(), by: by || 'ผู้ใช้งานปัจจุบัน' };
  appendTbAudit(record, 'ยกเลิกทะเบียน', `เหตุผล: ${reason.trim()}`, by);
  return true;
};

/* ปิดทะเบียน — ต้องมีผลการรักษา; หลังปิด record เป็น read-only. */
export const closeTbRegistration = (id, { outcome, date, note = '', by }) => {
  const record = getTbRegistryById(id);
  if (!record || !outcome || !date) return false;
  record.closure = { outcome, date, note, by: by || 'ผู้ใช้งานปัจจุบัน', at: nowTbStamp() };
  appendTbAudit(record, 'ปิดทะเบียน', `ผลการรักษา: ${resolveTbOutcome(outcome)?.label || outcome}`, by);
  return true;
};

/* เปิดทะเบียนที่ปิดแล้วอีกครั้ง — ต้องมีเหตุผล (audited, สิทธิเฉพาะ). */
export const reopenTbRegistration = (id, reason, by) => {
  const record = getTbRegistryById(id);
  if (!record || !record.closure || !reason?.trim()) return false;
  appendTbAudit(record, 'เปิดทะเบียนอีกครั้ง', `ยกเลิกการปิดทะเบียน — เหตุผล: ${reason.trim()}`, by);
  record.closure = null;
  return true;
};

/* Generic row upsert/cancel for sputum / regimen / followUps / contacts —
   the four "แสดง/บันทึก/ยกเลิก/แก้ไข" collections (playbook §5 ×4). */
const COLLECTIONS = {
  sputum: 'sputumRows',
  regimen: 'regimenRows',
  followUp: 'followUps',
  contact: 'contacts',
  culture: 'cultureRows',
  dst: 'dstRows',
};

export const addTbRow = (id, collection, row, by) => {
  const record = getTbRegistryById(id);
  const key = COLLECTIONS[collection];
  if (!record || !key || isTbRegistryReadOnly(record)) return null;
  const full = {
    ...row,
    id: nextRowId(collection),
    status: 'saved',
    recordedBy: by || 'ผู้ใช้งานปัจจุบัน',
    recordedAt: nowTbStamp(),
  };
  record[key] = [...record[key], full];
  appendTbAudit(record, 'เพิ่มรายการ', `เพิ่มรายการใน ${key}`, by);
  return full;
};

export const updateTbRow = (id, collection, rowId, patch, by) => {
  const record = getTbRegistryById(id);
  const key = COLLECTIONS[collection];
  if (!record || !key || isTbRegistryReadOnly(record)) return false;
  record[key] = record[key].map((r) => (r.id === rowId
    ? { ...r, ...patch, editedBy: by || 'ผู้ใช้งานปัจจุบัน', editedAt: nowTbStamp() }
    : r));
  appendTbAudit(record, 'แก้ไขรายการ', `แก้ไขรายการ ${rowId} ใน ${key}`, by);
  return true;
};

export const cancelTbRow = (id, collection, rowId, reason, by) => {
  const record = getTbRegistryById(id);
  const key = COLLECTIONS[collection];
  if (!record || !key || isTbRegistryReadOnly(record) || !reason?.trim()) return false;
  record[key] = record[key].map((r) => (r.id === rowId
    ? { ...r, status: 'cancelled', cancelReason: reason.trim(), cancelledBy: by || 'ผู้ใช้งานปัจจุบัน', cancelledAt: nowTbStamp() }
    : r));
  appendTbAudit(record, 'ยกเลิกรายการ', `ยกเลิกรายการ ${rowId} ใน ${key} — เหตุผล: ${reason.trim()}`, by);
  return true;
};

export const setTbNextAppointment = (id, appointment, by) => {
  const record = getTbRegistryById(id);
  if (!record || isTbRegistryReadOnly(record)) return false;
  record.nextAppointment = appointment;
  appendTbAudit(record, 'บันทึกนัดหมาย', `นัดครั้งถัดไป ${formatTbDate(appointment?.date)} — ${appointment?.type || ''}`, by);
  return true;
};

/* น้ำหนัก + สูตรยาปัจจุบันของทะเบียน — sync จากแถวจ่ายยาล่าสุด. */
export const setTbCurrentRegimen = (id, regimen, weightKg, by) => {
  const record = getTbRegistryById(id);
  if (!record || isTbRegistryReadOnly(record)) return false;
  record.regimen = regimen;
  if (weightKg != null && weightKg !== '') record.weightKg = Number(weightKg);
  if (!record.treatmentStartDate) record.treatmentStartDate = new Date().toISOString().slice(0, 10);
  appendTbAudit(record, 'ปรับสูตรยา', `สูตรยาปัจจุบัน: ${resolveTbRegimen(regimen)?.label || regimen}`, by);
  return true;
};
