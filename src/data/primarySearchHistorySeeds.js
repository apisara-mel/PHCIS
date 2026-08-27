import { getPatientByHN } from '@/data/patientProfiles';
import { MR_PATIENTS } from '@/data/mrPatients';
import { MEDICATION_NAME_OPTIONS } from '@/data/medicationCatalog';
import { USERS } from '@/data/usersAccess';
import { BMA_SERVICE_CENTERS } from '@/data/dashboardCommon';

/* Rich recent-search rows for <PrimarySearch> — Figma PHCIS-OPD 290:48930 /
   3345:2981 (teal queue pill + indigo HN pill + name + sublabel). */

export function buildPatientSearchHistoryItem({
  id,
  leadingBadge,
  hn,
  name,
  sublabel,
}) {
  return {
    id,
    label: name,
    sublabel,
    value: name,
    badges: [
      { label: leadingBadge, tone: 'teal' },
      { label: hn, tone: 'indigo' },
    ],
    avatarSrc: getPatientByHN(hn)?.avatarUrl,
  };
}

export function buildOpdSearchHistorySeed(rows, count = 4) {
  return rows.slice(0, count).map((row) => buildPatientSearchHistoryItem({
    id: row.id,
    leadingBadge: row.queue,
    hn: row.hn,
    name: row.name,
    sublabel: row.doctor,
  }));
}

export function buildRegistrationSearchHistorySeed(rows, count = 4) {
  return rows.slice(0, count).map((row) => buildPatientSearchHistoryItem({
    id: row.id,
    leadingBadge: row.queue,
    hn: row.hn,
    name: row.name,
    sublabel: row.nationalId ? `เลขบัตร ${row.nationalId}` : (row.phone || ''),
  }));
}

export const buildTreatmentSearchHistorySeed = buildOpdSearchHistorySeed;

/* ─────────────────────────────────────────────────────────────────────────
   Mock "ค้นหาล่าสุด" ทุกช่องค้นหา (มติผู้ใช้ 27 ส.ค. 69)

   ช่องค้นหาส่วนใหญ่ในระบบไม่ได้ seed ประวัติไว้ ผู้ใช้จึงเจอ "ยังไม่มีประวัติ
   การค้นหา" ตลอดทั้งที่เป็น prototype ที่ต้องเดโม — <PrimarySearch> จึงถอย
   มาใช้ชุด mock ด้านล่างเมื่อ `history` ว่าง แล้วประวัติจริงจะเข้าไปแทนที่
   ทันทีที่ผู้ใช้ค้นครั้งแรก

   แยกตามชนิดของสิ่งที่หน้านั้นค้น เพราะแถวคนไข้ในหน้าคลังยาอ่านแล้วงง
   ค่ามาจากข้อมูลจริงในระบบเท่าที่มี (MR_PATIENTS / MEDICATION_NAME_OPTIONS /
   USERS / BMA_SERVICE_CENTERS) เพื่อให้กดแล้วค้นเจอจริง ไม่ใช่ชื่อลอย ๆ
   ───────────────────────────────────────────────────────────────────────── */

const mrFullName = (p) => `${p.prefixTh || ''}${p.firstNameTh || ''} ${p.lastNameTh || ''}`.trim();

const PATIENT_FALLBACK = MR_PATIENTS.slice(0, 5).map((p) => ({
  id: `mock-search-patient-${p.hn}`,
  label: mrFullName(p),
  value: mrFullName(p),
  sublabel: p.nationalId ? `เลขบัตร ${p.nationalId}` : (p.phone || ''),
  badges: [{ label: p.hn, tone: 'indigo' }],
  avatarSrc: p.avatarUrl,
}));

const DRUG_FALLBACK = MEDICATION_NAME_OPTIONS.slice(0, 5).map((m) => ({
  id: `mock-search-drug-${m.value}`,
  label: m.value,
  value: m.value,
  sublabel: 'รายการยาในบัญชีโรงพยาบาล',
  icon: 'pill',
}));

const STAFF_FALLBACK = USERS.slice(0, 5).map((u) => ({
  id: `mock-search-staff-${u.id}`,
  label: u.name,
  value: u.name,
  sublabel: u.email,
  avatarSrc: u.avatarUrl,
}));

const PLACE_FALLBACK = BMA_SERVICE_CENTERS.slice(0, 5).map((c) => ({
  id: `mock-search-place-${c.key}`,
  label: c.name,
  value: c.name,
  sublabel: `เขต${c.district}`,
  badges: [{ label: c.code, tone: 'teal' }],
  icon: 'apartment',
}));

/* ทะเบียนตั้งค่า (แบบฟอร์ม / ชุดคำสั่ง / ชุดตรวจ) ไม่มีแหล่งข้อมูลกลางร่วมกัน
   จึงเขียนเป็นค่าคงที่ — ใช้ชื่อที่มีอยู่จริงในทะเบียนของแต่ละหน้า */
const CATALOG_FALLBACK = [
  { id: 'mock-search-cat-1', label: 'แบบฟอร์มยินยอมเปิดเผยข้อมูลส่วนบุคคล (PDPA)', value: 'ยินยอม', sublabel: 'แบบฟอร์ม · งานเวชระเบียน', icon: 'description' },
  { id: 'mock-search-cat-2', label: 'ชุดตรวจสุขภาพประจำปี', value: 'ตรวจสุขภาพ', sublabel: 'ชุดรายการตรวจ · สิทธิข้าราชการ', icon: 'checklist' },
  { id: 'mock-search-cat-3', label: 'ชุดคำสั่งเบาหวาน (DM)', value: 'เบาหวาน', sublabel: 'ชุดคำสั่งการรักษา · คลินิก NCD', icon: 'medical_services' },
  { id: 'mock-search-cat-4', label: 'CBC — ตรวจนับเม็ดเลือดอย่างสมบูรณ์', value: 'CBC', sublabel: 'รายการตรวจ · ห้องปฏิบัติการ', icon: 'science' },
  { id: 'mock-search-cat-5', label: 'แบบคัดกรองสุขภาพจิต 2Q/9Q/8Q', value: '2Q', sublabel: 'แบบฟอร์ม · คลินิกสุขภาพจิต', icon: 'psychology' },
];

const FALLBACK_BY_KIND = {
  patient: PATIENT_FALLBACK,
  drug: DRUG_FALLBACK,
  staff: STAFF_FALLBACK,
  place: PLACE_FALLBACK,
  catalog: CATALOG_FALLBACK,
  none: [],
};

/* เดาชนิดจาก placeholder ของช่องค้นหา — ช่องค้นหามี 100+ จุด การไล่ใส่ prop
   ทีละจุดจะพลาดจุดที่เพิ่มทีหลังเสมอ ส่วน placeholder เขียนบอกอยู่แล้วว่าค้นอะไร
   เช็คสัญญาณ "คนไข้" ก่อนเพราะหน้าคิวมักพูดถึงแพทย์/หน่วยบริการ/ชุมชนปนมาด้วย
   หน้าไหนเดาผิดให้ส่ง `historyKind` มาทับได้ */
const PATIENT_CUES = /HN|ผู้รับบริการ|ผู้ป่วย|เลขบัตร|นักเรียน|ชื่อเด็ก|ชื่อ-นามสกุล|Passport/i;
const KIND_CUES = [
  ['drug', /ยา|Lot|วัคซีน|เวชภัณฑ์|คลัง/],
  ['staff', /บุคลากร|ผู้ใช้|อีเมล|บทบาท|ตำแหน่ง|แผนก|พนักงาน|วิชาชีพ|เจ้าหน้าที่|Department-Code/i],
  ['place', /ศูนย์|หน่วยบริการ|โรงเรียน/],
  ['catalog', /แบบฟอร์ม|ชุดตรวจ|ชุดคำสั่ง|ชื่อชุด|รายการตรวจ|ชื่อรูปแบบ|กติกา|กลุ่มเป้าหมาย|โครงการ|รหัสสาย/],
];

export function inferSearchHistoryKind(placeholder = '') {
  const text = String(placeholder || '');
  if (PATIENT_CUES.test(text)) return 'patient';
  const hit = KIND_CUES.find(([, re]) => re.test(text));
  return hit ? hit[0] : 'patient';
}

/** ชุด mock ที่ <PrimarySearch> ใช้เมื่อยังไม่มีประวัติการค้นหาจริง */
export function resolveSearchHistoryFallback(kind, placeholder) {
  const resolved = kind || inferSearchHistoryKind(placeholder);
  return FALLBACK_BY_KIND[resolved] || PATIENT_FALLBACK;
}
