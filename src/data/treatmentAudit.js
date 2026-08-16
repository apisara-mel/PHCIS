import { STAFF_AVATARS } from '@/data/avatarAssets';

/* PHCIS | EMR §1.4 — Audit trail ของบันทึกการรักษา (TOR 1.4.3.16).
   ทะเบียนกลางของ "ใครแก้อะไร เมื่อไร" สำหรับทุก panel ใน /treat/record.
   Registration มี RegistrationEditHistoryPanel อยู่แล้ว — ไฟล์นี้คือ
   คู่ขนานฝั่งบันทึกการรักษา แต่เพิ่มสถานะ "ระบุว่าลงข้อมูลผิด"
   (erroneousAt) ที่ TOR สั่งไว้: ห้ามลบค่าเดิม ให้ขีดฆ่าและประทับเวลาแทน.

   Mock store แบบ in-memory + pub/sub (React 17 — ห้าม useSyncExternalStore
   ให้ subscribe ด้วย useEffect ตามแบบ labOrders.js). */

/* ── ผู้ใช้ปัจจุบัน (mock session) — ทุก audit row ประทับชื่อนี้ */
export const CURRENT_CLINICIAN = {
  id: 'u-001',
  name: 'พญ.สมหญิง รักษ์ดี',
  role: 'doctor',
  roleLabel: 'แพทย์',
  license: 'TH-00012345',
  center: 'ศูนย์บริการสาธารณสุข 4 ดินแดง',
};

/* หมวดของ audit row — ใช้เป็น ColorfulBadge tone ในตาราง */
export const AUDIT_CATEGORIES = [
  { key: 'problem',  label: 'รายการโรคปัจจุบัน', tone: 'teal'   },
  { key: 'note',     label: 'บันทึกทางคลินิก',   tone: 'purple' },
  { key: 'diagnosis',label: 'การวินิจฉัย',       tone: 'magenta'},
  { key: 'medrec',   label: 'ประสานรายการยา',    tone: 'blue'   },
  { key: 'vaccine',  label: 'วัคซีน',            tone: 'indigo' },
  { key: 'refer',    label: 'การส่งต่อ',         tone: 'orange' },
  { key: 'document', label: 'เอกสาร',           tone: 'pink'   },
  { key: 'attachment', label: 'ไฟล์แนบ',        tone: 'grey'   },
  { key: 'confidential', label: 'ข้อมูลลับ',     tone: 'purple' },
  { key: 'interface', label: 'เชื่อมต่อระบบภายนอก', tone: 'blue' },
];

export const auditCategoryMeta = (key) =>
  AUDIT_CATEGORIES.find((c) => c.key === key) || { key, label: key, tone: 'grey' };

const pad2 = (n) => String(n).padStart(2, '0');
const TH_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

/* วันเวลาแบบไทย (พ.ศ.) — ใช้กับทุก stamp ในโมดูลนี้ */
export const stampNow = (d = new Date()) =>
  `${d.getDate()} ${TH_MONTHS[d.getMonth()]} ${d.getFullYear() + 543} · ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;

let seq = 0;
const uid = (prefix) => `${prefix}-${Date.now().toString(36)}-${(seq += 1)}`;

/* ── store ─────────────────────────────────────────────────── */

const TREATMENT_AUDIT = [
  {
    id: 'ta-seed-6', hn: '67-00001', visitId: 'v-2569-05-06',
    category: 'diagnosis', field: 'ประเภทการวินิจฉัย (J06.9)',
    oldValue: 'CO-MORBIDITY (การวินิจฉัยโรคร่วม)',
    newValue: 'PRINCIPLE DX (การวินิจฉัยโรคหลัก)',
    by: 'พญ.สมหญิง รักษ์ดี', recordedAt: '6 พ.ค. 2569 · 10:12', amendedAt: '', erroneousAt: '', erroneousReason: '',
  },
  {
    id: 'ta-seed-5', hn: '67-00001', visitId: 'v-2569-05-06',
    category: 'problem', field: 'สถานะโรค — โรคกระเพาะอาหารอักเสบ (K29.7)',
    oldValue: 'กำลังรักษา', newValue: 'หายแล้ว (12 เม.ย. 2569)',
    by: 'พญ.สมหญิง รักษ์ดี', recordedAt: '6 พ.ค. 2569 · 10:04', amendedAt: '', erroneousAt: '', erroneousReason: '',
  },
  {
    id: 'ta-seed-4', hn: '67-00001', visitId: 'v-2569-05-06',
    category: 'medrec', field: 'ประสานยา — Amoxicillin 500 mg',
    oldValue: 'ยังไม่ประสาน', newValue: 'หยุดยา (ครบคอร์สแล้ว)',
    by: 'ภก.วราภรณ์ ดีเลิศ', recordedAt: '6 พ.ค. 2569 · 09:58', amendedAt: '', erroneousAt: '', erroneousReason: '',
  },
  {
    id: 'ta-seed-3', hn: '67-00001', visitId: 'v-2569-05-06',
    category: 'note', field: 'บันทึกการพยาบาล',
    oldValue: '—', newValue: 'ผู้รับบริการรู้สึกตัวดี ให้คำแนะนำเรื่องการพักผ่อนและดื่มน้ำ',
    by: 'พว.สุชาดา แก้วมณี', recordedAt: '6 พ.ค. 2569 · 09:33', amendedAt: '6 พ.ค. 2569 · 09:41', erroneousAt: '', erroneousReason: '',
  },
  {
    id: 'ta-seed-2', hn: '67-00001', visitId: 'v-2569-05-06',
    category: 'confidential', field: 'เปิดดูข้อมูลลับ — ผลตรวจ Anti-HIV',
    oldValue: 'ปกปิด (••••)', newValue: 'เปิดดู 1 ครั้ง (session ปัจจุบัน)',
    by: 'พญ.สมหญิง รักษ์ดี', recordedAt: '6 พ.ค. 2569 · 09:27', amendedAt: '', erroneousAt: '', erroneousReason: '',
  },
  {
    id: 'ta-seed-1', hn: '67-00001', visitId: 'v-2569-05-06',
    category: 'vaccine', field: 'วัคซีนไข้หวัดใหญ่ เข็มที่ 1 — Lot',
    oldValue: 'FLU-2569-A12', newValue: 'FLU-2569-A21',
    by: 'พว.มานพ เกษมสุข', recordedAt: '6 พ.ค. 2569 · 09:15', amendedAt: '',
    erroneousAt: '6 พ.ค. 2569 · 09:19', erroneousReason: 'คีย์เลข Lot สลับหลัก — บันทึกใหม่เป็นแถวถัดไป',
  },
];

const MOCK_AUDIT_USERS = [
  ['พญ.สมหญิง รักษ์ดี', STAFF_AVATARS[0]],
  ['นพ.กิตติ สุขใจ', STAFF_AVATARS[1]],
  ['พว.ณัฐชา แสงทอง', STAFF_AVATARS[2]],
  ['ภก.ปรีชา วัฒนกุล', STAFF_AVATARS[3]],
];
const MOCK_AUDIT_FIELDS = ['บันทึกอาการสำคัญ', 'การวินิจฉัยโรค', 'รายการยา', 'บันทึกทางการพยาบาล', 'ผลตรวจ Lab'];
for (let i = TREATMENT_AUDIT.length; i < 100; i += 1) {
  const [by, byAvatarUrl] = MOCK_AUDIT_USERS[i % MOCK_AUDIT_USERS.length];
  TREATMENT_AUDIT.push({
    id: `ta-mock-${i + 1}`,
    hn: '67-00001',
    visitId: 'v-2569-05-06',
    category: AUDIT_CATEGORIES[i % AUDIT_CATEGORIES.length].key,
    field: `${MOCK_AUDIT_FIELDS[i % MOCK_AUDIT_FIELDS.length]} ครั้งที่ ${i + 1}`,
    oldValue: '—',
    newValue: 'บันทึกข้อมูลตัวอย่าง',
    by,
    byAvatarUrl,
    recordedAt: `${(i % 28) + 1} มิ.ย. 2569 · ${String(8 + (i % 9)).padStart(2, '0')}:${String((i * 5) % 60).padStart(2, '0')}`,
    amendedAt: '', erroneousAt: '', erroneousReason: '',
  });
}

const listeners = new Set();
const emit = () => { listeners.forEach((fn) => fn(TREATMENT_AUDIT)); };

/* subscribe แบบ callback (ใช้กับ useEffect — React 17 safe) */
export const subscribeTreatmentAudit = (fn) => {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
};

export const getTreatmentAudit = () => TREATMENT_AUDIT.map((r) => ({ ...r }));

/* audit ของ visit เดียว (เรียงใหม่→เก่า) */
export const auditForVisit = (hn, visitId) => TREATMENT_AUDIT
  .filter((r) => (!hn || r.hn === hn) && (!visitId || r.visitId === visitId))
  .map((r) => ({ ...r }));

/* เขียน audit row ใหม่ — ทุก create/update/cancel/reveal ต้องเรียกอันนี้ */
export const appendAudit = ({
  hn, visitId = 'v-current', category = 'note', field = '',
  oldValue = '—', newValue = '—', by = CURRENT_CLINICIAN.name, at,
}) => {
  const row = {
    id: uid('ta'), hn, visitId, category, field,
    oldValue: oldValue === '' ? '—' : oldValue,
    newValue: newValue === '' ? '—' : newValue,
    by, recordedAt: at || stampNow(), amendedAt: '', erroneousAt: '', erroneousReason: '',
  };
  TREATMENT_AUDIT.unshift(row);
  emit();
  return row;
};

/* ระบุว่าลงข้อมูลผิด — ไม่ลบค่า, แค่ประทับ erroneousAt + เหตุผล
   และเขียน audit row ใหม่เพื่อให้การ mark เองก็ทิ้งร่องรอย */
export const markAuditErroneous = (id, { reason, by = CURRENT_CLINICIAN.name } = {}) => {
  const row = TREATMENT_AUDIT.find((r) => r.id === id);
  if (!row) return null;
  row.erroneousAt = stampNow();
  row.erroneousReason = reason || 'ไม่ได้ระบุเหตุผล';
  row.erroneousBy = by;
  appendAudit({
    hn: row.hn, visitId: row.visitId, category: row.category,
    field: `ระบุว่าลงข้อมูลผิด — ${row.field}`,
    oldValue: row.newValue, newValue: `ยกเลิกการใช้ค่านี้ (${row.erroneousReason})`, by,
  });
  return { ...row };
};

/* ยกเลิกการ mark — ห้ามเงียบ ๆ จึงเขียน audit row ใหม่เช่นกัน */
export const unmarkAuditErroneous = (id, { reason, by = CURRENT_CLINICIAN.name } = {}) => {
  const row = TREATMENT_AUDIT.find((r) => r.id === id);
  if (!row) return null;
  const prev = row.erroneousReason;
  row.erroneousAt = '';
  row.erroneousReason = '';
  row.erroneousBy = '';
  appendAudit({
    hn: row.hn, visitId: row.visitId, category: row.category,
    field: `ยกเลิกการระบุว่าลงข้อมูลผิด — ${row.field}`,
    oldValue: `ระบุว่าลงข้อมูลผิด (${prev})`, newValue: reason || 'กลับมาใช้ค่านี้ตามเดิม', by,
  });
  return { ...row };
};

/* บันทึกว่ามีการ "แก้ไข" ค่าเดิมของ audit row (amendedAt) */
export const stampAuditAmended = (id) => {
  const row = TREATMENT_AUDIT.find((r) => r.id === id);
  if (!row) return null;
  row.amendedAt = stampNow();
  emit();
  return { ...row };
};

export default TREATMENT_AUDIT;
