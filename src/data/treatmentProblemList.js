/* PHCIS | EMR §1.4.3.8 / §1.4.3.9 — รายการโรคที่รักษาอยู่ปัจจุบัน
   (Active Problem List) + การปรับสถานะเป็น "หายแล้ว".

   แถวที่มาจากคลินิกเฉพาะทาง (TB / NCD / HIV / สุขภาพจิต) เป็น read-only
   ที่หน้านี้ — แก้ได้ที่ระบบต้นทางเท่านั้น เพื่อไม่ให้แก้ข้ามระบบ. */

import { CURRENT_CLINICIAN, stampNow, appendAudit } from '@/data/treatmentAudit';

export const PROBLEM_STATUSES = [
  { key: 'active',     label: 'กำลังรักษา', badge: 'warning' },
  { key: 'watch',      label: 'เฝ้าระวัง',  badge: 'info'    },
  { key: 'resolved',   label: 'หายแล้ว',    badge: 'success' },
  { key: 'cancelled',  label: 'ยกเลิกรายการ', badge: 'neutral' },
];

export const problemStatusMeta = (key) =>
  PROBLEM_STATUSES.find((s) => s.key === key) || PROBLEM_STATUSES[0];

export const PROBLEM_SOURCES = [
  { key: 'visit',    label: 'บันทึกจากการตรวจครั้งนี้', editable: true  },
  { key: 'chronic',  label: 'โรคประจำตัวเดิม',          editable: true  },
  { key: 'clinic',   label: 'จากคลินิกเฉพาะทาง',        editable: false },
];

export const problemSourceMeta = (key) =>
  PROBLEM_SOURCES.find((s) => s.key === key) || PROBLEM_SOURCES[0];

/* เหตุผลที่ใช้บ่อยเวลาปรับสถานะ — ป้อนเป็น suggestions ของ
   SuggestibleTextarea (playbook §2.6 ห้ามใช้ textarea เปล่า) */
export const PROBLEM_RESOLVE_SUGGESTIONS = [
  'อาการหายสนิท ตรวจร่างกายและผลแล็บกลับสู่ปกติแล้ว',
  'ครบคอร์สการรักษาและติดตามอาการแล้วไม่พบการกลับเป็นซ้ำ',
  'ผลตรวจยืนยันว่าหายจากโรคแล้ว จึงปิดรายการและเก็บไว้ในประวัติ',
  'วินิจฉัยใหม่แทนที่รายการเดิม — ปิดรายการนี้เพื่อไม่ให้ซ้ำซ้อน',
];

export const PROBLEM_CANCEL_SUGGESTIONS = [
  'บันทึกรหัสโรคผิด — ยกเลิกรายการและบันทึกใหม่ให้ถูกต้อง',
  'ซ้ำกับรายการที่มีอยู่แล้วในทะเบียนโรคของผู้รับบริการ',
  'ผู้รับบริการให้ข้อมูลคลาดเคลื่อน ตรวจสอบแล้วไม่เข้าเกณฑ์การวินิจฉัย',
];

let seq = 0;
const uid = () => `prob-${Date.now().toString(36)}-${(seq += 1)}`;

const PROBLEMS = [
  {
    id: 'prob-seed-1', hn: '67-00001', system: 'ICD-10', code: 'I10',
    name: 'ความดันโลหิตสูงชนิดไม่ทราบสาเหตุ (Essential hypertension)',
    onsetDate: '12 มีนาคม 2565', source: 'chronic', status: 'active',
    resolvedDate: '', resolveReason: '', cancelledAt: '', cancelReason: '',
    recordedBy: 'นพ.ปิยะ วัฒนชัย', recordedAt: '12 มี.ค. 2565 · 10:30', amendedAt: '',
    confidential: false, clinicName: '',
  },
  {
    id: 'prob-seed-2', hn: '67-00001', system: 'ICD-10', code: 'N18.3',
    name: 'โรคไตเรื้อรัง ระยะที่ 3 (Chronic kidney disease, stage 3)',
    onsetDate: '4 สิงหาคม 2567', source: 'clinic', status: 'active',
    resolvedDate: '', resolveReason: '', cancelledAt: '', cancelReason: '',
    recordedBy: 'คลินิกโรคไม่ติดต่อเรื้อรัง (NCD)', recordedAt: '4 ส.ค. 2567 · 14:05', amendedAt: '',
    confidential: false, clinicName: 'คลินิก NCD ศูนย์ 4 ดินแดง',
  },
  {
    id: 'prob-seed-3', hn: '67-00001', system: 'SNOMED-CT', code: '84114007',
    name: 'ภาวะหัวใจล้มเหลว (Heart failure)',
    onsetDate: '19 มกราคม 2568', source: 'chronic', status: 'watch',
    resolvedDate: '', resolveReason: '', cancelledAt: '', cancelReason: '',
    recordedBy: 'นพ.ปิยะ วัฒนชัย', recordedAt: '19 ม.ค. 2568 · 09:12', amendedAt: '',
    confidential: false, clinicName: '',
  },
  {
    id: 'prob-seed-4', hn: '67-00001', system: 'ICD-10', code: 'K29.7',
    name: 'กระเพาะอาหารอักเสบ ไม่ระบุชนิด (Gastritis, unspecified)',
    onsetDate: '2 เมษายน 2569', source: 'visit', status: 'resolved',
    resolvedDate: '12 เมษายน 2569',
    resolveReason: 'อาการหายสนิทหลังครบคอร์สยาลดกรด 10 วัน ตรวจซ้ำไม่พบอาการ',
    cancelledAt: '', cancelReason: '',
    recordedBy: 'พญ.สมหญิง รักษ์ดี', recordedAt: '2 เม.ย. 2569 · 10:44', amendedAt: '6 พ.ค. 2569 · 10:04',
    confidential: false, clinicName: '',
  },
];

const listeners = new Set();
const emit = () => { listeners.forEach((fn) => fn(PROBLEMS)); };

export const subscribeProblemList = (fn) => {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
};

export const problemsForPatient = (hn) => PROBLEMS
  .filter((p) => p.hn === hn)
  .map((p) => ({ ...p }));

export const activeProblemsForPatient = (hn) =>
  problemsForPatient(hn).filter((p) => p.status === 'active' || p.status === 'watch');

/* เพิ่มโรคซ้ำรหัสเดิมที่ยังกำลังรักษา → คืน row เดิมให้ UI เตือน */
export const findDuplicateProblem = (hn, code) => PROBLEMS.find(
  (p) => p.hn === hn && p.code === code && (p.status === 'active' || p.status === 'watch'),
) || null;

export const addProblem = ({
  hn, system = 'ICD-10', code, name, onsetDate = '', source = 'visit',
  status = 'active', confidential = false,
}) => {
  const row = {
    id: uid(), hn, system, code, name, onsetDate, source, status,
    resolvedDate: '', resolveReason: '', cancelledAt: '', cancelReason: '',
    recordedBy: CURRENT_CLINICIAN.name, recordedAt: stampNow(), amendedAt: '',
    confidential, clinicName: '',
  };
  PROBLEMS.unshift(row);
  emit();
  appendAudit({
    hn, category: 'problem', field: `เพิ่มรายการโรค — ${code}`,
    oldValue: '—', newValue: `${name} (${problemStatusMeta(status).label})`,
  });
  return { ...row };
};

export const updateProblem = (id, patch = {}) => {
  const row = PROBLEMS.find((p) => p.id === id);
  if (!row) return null;
  const before = `${row.name} · ${problemStatusMeta(row.status).label}`;
  Object.assign(row, patch, { amendedAt: stampNow() });
  emit();
  appendAudit({
    hn: row.hn, category: 'problem', field: `แก้ไขรายการโรค — ${row.code}`,
    oldValue: before, newValue: `${row.name} · ${problemStatusMeta(row.status).label}`,
  });
  return { ...row };
};

/* ปรับเป็นหายแล้ว — ต้องมีวันที่หาย + เหตุผล, ไม่ลบแถว */
export const resolveProblem = (id, { resolvedDate, reason }) => {
  const row = PROBLEMS.find((p) => p.id === id);
  if (!row) return null;
  row.status = 'resolved';
  row.resolvedDate = resolvedDate;
  row.resolveReason = reason || '';
  row.amendedAt = stampNow();
  emit();
  appendAudit({
    hn: row.hn, category: 'problem', field: `สถานะโรค — ${row.name} (${row.code})`,
    oldValue: 'กำลังรักษา', newValue: `หายแล้ว (${resolvedDate}) — ${row.resolveReason}`,
  });
  return { ...row };
};

export const reopenProblem = (id, reason) => {
  const row = PROBLEMS.find((p) => p.id === id);
  if (!row) return null;
  const prev = row.resolvedDate;
  row.status = 'active';
  row.resolvedDate = '';
  row.resolveReason = '';
  row.amendedAt = stampNow();
  emit();
  appendAudit({
    hn: row.hn, category: 'problem', field: `เปิดรายการโรคอีกครั้ง — ${row.code}`,
    oldValue: `หายแล้ว (${prev})`, newValue: reason || 'กลับมาเป็นซ้ำ',
  });
  return { ...row };
};

/* ยกเลิก = soft-cancel เก็บไว้ในประวัติพร้อมเหตุผล */
export const cancelProblem = (id, reason) => {
  const row = PROBLEMS.find((p) => p.id === id);
  if (!row) return null;
  row.status = 'cancelled';
  row.cancelledAt = stampNow();
  row.cancelReason = reason || 'ไม่ได้ระบุเหตุผล';
  row.cancelledBy = CURRENT_CLINICIAN.name;
  emit();
  appendAudit({
    hn: row.hn, category: 'problem', field: `ยกเลิกรายการโรค — ${row.code}`,
    oldValue: row.name, newValue: `ยกเลิก — ${row.cancelReason}`,
  });
  return { ...row };
};

/* ดึงการวินิจฉัยของ Step 4 เข้ารายการโรคในคลิกเดียว (TOR 1.4.3.8).
   คืน { added, skipped } เพื่อให้ UI บอกได้ว่าข้ามอะไรไปเพราะซ้ำ */
export const importDiagnosesToProblems = (hn, diagnoses = []) => {
  const added = [];
  const skipped = [];
  diagnoses.forEach((d) => {
    if (!d?.code) return;
    if (findDuplicateProblem(hn, d.code)) { skipped.push(d); return; }
    added.push(addProblem({
      hn,
      system: d.system || 'ICD-10',
      code: d.code,
      name: d.name || d.label || '',
      onsetDate: d.onsetDate || '',
      source: 'visit',
      status: 'active',
    }));
  });
  return { added, skipped };
};

export default PROBLEMS;
