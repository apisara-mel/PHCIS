/* PHCIS | EMR §1.4.3.5 / §1.4.3.6 — ประสานรายการยา (Medication Reconciliation).

   ยาเดิมของผู้รับบริการมาจาก 3 แหล่งตาม TOR:
     1. ใบสั่งยาครั้งก่อนในระบบ  → PAST_VISIT_MEDICATIONS (treatmentVisits)
     2. ยาที่ผู้ป่วยแจ้งว่าใช้เองที่บ้าน → HOME_MEDICATIONS (ไฟล์นี้)
     3. ยาจากสถานพยาบาลอื่น       → treatmentRefer.incomingMedicationsFor()
   ทุกแถวต้องถูก disposition ก่อนปิด step (ใช้ต่อ / หยุดยา / ปรับขนาด /
   ไม่ทราบ) พร้อมเหตุผล + ผู้ประสาน + เวลา. */

import { CURRENT_CLINICIAN, stampNow, appendAudit } from '@/data/treatmentAudit';
import { PAST_VISIT_MEDICATIONS } from '@/data/treatmentVisits';
import { incomingMedicationsFor } from '@/data/treatmentRefer';

export const MED_REC_SOURCES = [
  { key: 'previous', label: 'ใบสั่งยาครั้งก่อนในระบบ', tone: 'blue'   },
  { key: 'home',     label: 'ยาที่ผู้ป่วยแจ้งว่าใช้อยู่ที่บ้าน', tone: 'orange' },
  { key: 'external', label: 'ยาจากสถานพยาบาลอื่น',     tone: 'purple' },
];

export const medRecSourceMeta = (key) =>
  MED_REC_SOURCES.find((s) => s.key === key) || MED_REC_SOURCES[0];

export const MED_REC_DISPOSITIONS = [
  { key: 'continue', label: 'ใช้ต่อ',                icon: 'play_arrow',  badge: 'success', needsReason: false, copiesToOrders: true  },
  { key: 'stop',     label: 'หยุดยา',                icon: 'block',       badge: 'error',   needsReason: true,  copiesToOrders: false },
  { key: 'adjust',   label: 'ปรับขนาด',              icon: 'tune',        badge: 'warning', needsReason: true,  copiesToOrders: true  },
  { key: 'unknown',  label: 'ไม่ทราบ / ผู้ป่วยจำไม่ได้', icon: 'help',        badge: 'neutral', needsReason: false, copiesToOrders: false },
];

export const dispositionMeta = (key) =>
  MED_REC_DISPOSITIONS.find((d) => d.key === key) || null;

export const MED_REC_REASON_SUGGESTIONS = [
  'ครบคอร์สการรักษาแล้ว จึงหยุดยาตามแผน',
  'ซ้ำกลุ่มกับยาที่สั่งในครั้งนี้ — หยุดยาเดิมเพื่อเลี่ยงการได้รับเกินขนาด',
  'ผู้รับบริการมีอาการข้างเคียง จึงลดขนาดยาลงและติดตามอาการ',
  'ค่าการทำงานของไตลดลง จึงปรับขนาดยาให้เหมาะกับ eGFR ปัจจุบัน',
  'ผู้รับบริการหยุดยาเองมากกว่า 2 สัปดาห์ ยืนยันว่าไม่ได้ใช้ต่อ',
];

/* ยาที่ผู้ป่วยแจ้งว่าใช้เองที่บ้าน — รวมยาสมุนไพร/ยาซื้อเอง */
const HOME_MEDICATIONS = {
  '67-00001': [
    { id: 'home-1', name: 'Ibuprofen 400 mg (ซื้อเองจากร้านขายยา)', strength: '400 mg', usage: 'รับประทานเมื่อปวด วันละ 2–3 ครั้ง', startedOn: '20 เมษายน 2569', prescriber: 'ผู้รับบริการซื้อเอง' },
    { id: 'home-2', name: 'ยาสมุนไพรลดความดัน (ไม่ทราบชื่อการค้า)', strength: 'ไม่ทราบ', usage: 'รับประทานวันละ 2 แคปซูล ก่อนนอน', startedOn: 'ประมาณต้นปี 2569', prescriber: 'ญาติแนะนำ' },
  ],
  '67-00003': [
    { id: 'home-3', name: 'Metformin 500 mg (ยาเดิมจากคลินิกเอกชน)', strength: '500 mg', usage: 'รับประทานวันละ 2 ครั้ง หลังอาหารเช้า-เย็น', startedOn: '10 มกราคม 2569', prescriber: 'คลินิกเวชกรรมใกล้บ้าน' },
  ],
};

export const homeMedicationsFor = (hn) => (HOME_MEDICATIONS[hn] || []).map((m) => ({ ...m }));

let homeSeq = 0;
export const addHomeMedication = (hn, entry) => {
  homeSeq += 1;
  const row = {
    id: `home-new-${Date.now().toString(36)}-${homeSeq}`,
    name: entry.name, strength: entry.strength || '', usage: entry.usage || '',
    startedOn: entry.startedOn || '', prescriber: entry.prescriber || 'ผู้รับบริการแจ้ง',
  };
  if (!HOME_MEDICATIONS[hn]) HOME_MEDICATIONS[hn] = [];
  HOME_MEDICATIONS[hn] = [...HOME_MEDICATIONS[hn], row];
  appendAudit({
    hn, category: 'medrec', field: 'เพิ่มยาที่ผู้ป่วยแจ้ง',
    oldValue: '—', newValue: `${row.name} · ${row.usage}`,
  });
  return { ...row };
};

/* รวมยาเดิมทั้ง 3 แหล่งให้เป็นรายการเดียว */
export const buildPriorMedications = (hn) => {
  const previous = PAST_VISIT_MEDICATIONS.map((m, i) => ({
    key: `prev-${m.id || i}`,
    source: 'previous',
    name: m.name,
    strength: m.dosePerTake ? `${m.dosePerTake} ${m.unit || ''}`.trim() : '',
    usage: [m.usage, m.frequency, m.when].filter(Boolean).join(' · '),
    startedOn: m.date || '',
    prescriber: m.editor || 'แพทย์ผู้สั่งครั้งก่อน',
    warning: m.warning || '',
  }));
  const home = homeMedicationsFor(hn).map((m) => ({
    key: `home-${m.id}`,
    source: 'home',
    name: m.name,
    strength: m.strength,
    usage: m.usage,
    startedOn: m.startedOn,
    prescriber: m.prescriber,
    warning: '',
  }));
  const external = incomingMedicationsFor(hn).map((m, i) => ({
    key: `ext-${i}-${m.name}`,
    source: 'external',
    name: m.name,
    strength: m.strength || '',
    usage: m.usage || '',
    startedOn: m.startedOn || '',
    prescriber: m.prescriber || '',
    warning: '',
    sourceLabel: m.sourceLabel,
  }));
  return [...previous, ...home, ...external];
};

/* ── ตรวจสอบความปลอดภัย: แพ้ยา + ซ้ำกลุ่มยา ─────────────────── */

const DRUG_CLASS_MAP = [
  { cls: 'NSAIDs',      match: ['ibuprofen', 'diclofenac', 'naproxen', 'aspirin', 'meloxicam'] },
  { cls: 'Penicillins', match: ['amoxicillin', 'ampicillin', 'penicillin', 'cloxacillin'] },
  { cls: 'Cephalosporins', match: ['cephalexin', 'cefixime', 'ceftriaxone'] },
  { cls: 'Paracetamol', match: ['paracetamol', 'acetaminophen'] },
  { cls: 'Biguanides',  match: ['metformin'] },
  { cls: 'Antivirals',  match: ['aciclovir', 'vilerm'] },
  { cls: 'PPI',         match: ['omeprazole', 'pantoprazole', 'esomeprazole'] },
];

export const drugClassOf = (name = '') => {
  const lower = String(name).toLowerCase();
  const hit = DRUG_CLASS_MAP.find((c) => c.match.some((m) => lower.includes(m)));
  return hit ? hit.cls : '';
};

/* คืน warning ต่อแถว: allergy (แพ้ยา/ข้ามกลุ่ม) + duplicate (ซ้ำกลุ่มกับที่สั่งครั้งนี้) */
export const analyseMedRecSafety = ({ priorRows = [], currentMedications = [], drugAllergies = [] }) => {
  const allergyNames = drugAllergies.map((a) => String(a.name || a).toLowerCase());
  const allergyClasses = drugAllergies
    .map((a) => drugClassOf(a.name || a))
    .filter(Boolean);
  const currentClasses = currentMedications
    .map((m) => ({ cls: drugClassOf(m.name), name: m.name }))
    .filter((x) => x.cls);

  return priorRows.map((row) => {
    const lower = String(row.name).toLowerCase();
    const cls = drugClassOf(row.name);
    const warnings = [];
    const directAllergy = allergyNames.find((a) => a && lower.includes(a));
    if (directAllergy) {
      warnings.push({
        level: 'critical',
        text: `ผู้รับบริการมีประวัติแพ้ ${directAllergy} — ห้ามใช้ต่อโดยไม่ทบทวน`,
      });
    } else if (cls && allergyClasses.includes(cls)) {
      warnings.push({
        level: 'warning',
        text: `อยู่ในกลุ่มยา ${cls} ซึ่งผู้รับบริการเคยมีประวัติแพ้ข้ามกลุ่ม`,
      });
    }
    const dup = currentClasses.find((c) => c.cls === cls);
    if (cls && dup) {
      warnings.push({
        level: 'warning',
        text: `ซ้ำกลุ่ม ${cls} กับ "${dup.name}" ที่สั่งในครั้งนี้`,
      });
    }
    return { ...row, drugClass: cls, warnings };
  });
};

/* ── ประวัติการประสานรายการยา (§1.4.3.5) ─────────────────────── */

let sessionSeq = 0;
const SESSIONS = [
  {
    id: 'mrs-seed-2', hn: '67-00001', date: '2 เม.ย. 2569 · 11:05',
    by: 'ภก.วราภรณ์ ดีเลิศ', total: 4, reconciled: 4,
    summary: 'ใช้ต่อ 2 · หยุดยา 1 · ปรับขนาด 1',
    items: [
      { name: 'Amlodipine 5 mg',   source: 'previous', disposition: 'continue', reason: '' },
      { name: 'Simvastatin 20 mg', source: 'previous', disposition: 'continue', reason: '' },
      { name: 'Ibuprofen 400 mg',  source: 'home',     disposition: 'stop',     reason: 'ค่าการทำงานของไตลดลง — งดยากลุ่ม NSAIDs' },
      { name: 'Furosemide 40 mg',  source: 'previous', disposition: 'adjust',   reason: 'ลดเหลือวันละครั้งเนื่องจากความดันต่ำในช่วงเช้า' },
    ],
  },
  {
    id: 'mrs-seed-1', hn: '67-00001', date: '10 ก.ย. 2568 · 09:22',
    by: 'ภก.รัตนา พูนผล', total: 3, reconciled: 3,
    summary: 'ใช้ต่อ 3',
    items: [
      { name: 'Amlodipine 5 mg',   source: 'previous', disposition: 'continue', reason: '' },
      { name: 'Simvastatin 20 mg', source: 'previous', disposition: 'continue', reason: '' },
      { name: 'Aspirin 81 mg',     source: 'previous', disposition: 'continue', reason: '' },
    ],
  },
];

const listeners = new Set();
const emit = () => { listeners.forEach((fn) => fn(SESSIONS)); };

export const subscribeMedRecSessions = (fn) => {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
};

export const medRecSessionsFor = (hn) => SESSIONS
  .filter((s) => s.hn === hn)
  .map((s) => ({ ...s, items: s.items.map((i) => ({ ...i })) }));

export const summariseDispositions = (dispositions = {}) => {
  const counts = MED_REC_DISPOSITIONS.reduce((acc, d) => ({ ...acc, [d.key]: 0 }), {});
  Object.values(dispositions).forEach((d) => {
    if (d && counts[d.disposition] != null) counts[d.disposition] += 1;
  });
  return MED_REC_DISPOSITIONS
    .filter((d) => counts[d.key] > 0)
    .map((d) => `${d.label} ${counts[d.key]}`)
    .join(' · ') || 'ยังไม่ได้ประสาน';
};

export const saveMedRecSession = ({ hn, rows = [], dispositions = {} }) => {
  sessionSeq += 1;
  const items = rows.map((r) => ({
    name: r.name,
    source: r.source,
    disposition: dispositions[r.key]?.disposition || '',
    reason: dispositions[r.key]?.reason || '',
  }));
  const reconciled = items.filter((i) => i.disposition).length;
  const session = {
    id: `mrs-${Date.now().toString(36)}-${sessionSeq}`,
    hn,
    date: stampNow(),
    by: CURRENT_CLINICIAN.name,
    total: rows.length,
    reconciled,
    summary: summariseDispositions(dispositions),
    items,
  };
  SESSIONS.unshift(session);
  emit();
  appendAudit({
    hn, category: 'medrec', field: 'บันทึกการประสานรายการยา',
    oldValue: '—', newValue: `${reconciled}/${rows.length} รายการ — ${session.summary}`,
  });
  return { ...session };
};

export const recordDisposition = ({ hn, row, disposition, reason }) => {
  appendAudit({
    hn, category: 'medrec', field: `ประสานยา — ${row.name}`,
    oldValue: 'ยังไม่ประสาน',
    newValue: `${dispositionMeta(disposition)?.label || disposition}${reason ? ` (${reason})` : ''}`,
  });
  return { by: CURRENT_CLINICIAN.name, at: stampNow() };
};

export default SESSIONS;
