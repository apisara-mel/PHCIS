/* PHCIS | EMR §1.4.4.1 / §1.4.4.2 — Clinical Notes ตามประเภทผู้บันทึก.

   ═══ Wave-S (SOAP) hand-off contract ═══════════════════════════════
   รูปร่างของ entry ตายตัวแล้ว ห้ามเปลี่ยนใน wave ถัดไป:

     { id, visitId, hn, type, body, structured, author, authorRole,
       recordedAt, amendedAt, cancelledAt, cancelReason,
       erroneousAt, confidential }

   • `type` ∈ doctor | nurse | progress | treatment | pharmacist
   • `body`       — ข้อความอิสระ (wave นี้เขียนอย่างเดียว)
   • `structured` — { s, o, a, p } | null  ← Wave S เติมช่องนี้
     wave นี้เขียน null เสมอ; ตัว composer ฝั่ง UI ห้ามผูกกับ `body`
     แบบ string-only จนกว่า Wave S จะสลับ composer เข้ามา — ให้เรียก
     `noteDisplayBody(note)` ซึ่งรองรับทั้งสองรูปแบบอยู่แล้ว
   • filter ตาม type และ panel ประวัติ Note ไม่ต้องแก้เมื่อ SOAP มา
   ═════════════════════════════════════════════════════════════════ */

import { CURRENT_CLINICIAN, stampNow, appendAudit } from '@/data/treatmentAudit';

export const NOTE_TYPES = [
  { key: 'doctor',     label: 'บันทึกของแพทย์',            short: 'แพทย์',    tone: 'magenta', roles: ['doctor'] },
  { key: 'nurse',      label: 'บันทึกการพยาบาล',           short: 'พยาบาล',   tone: 'teal',    roles: ['nurse', 'doctor'] },
  { key: 'progress',   label: 'บันทึกความคืบหน้า (Progress)', short: 'Progress', tone: 'blue',    roles: ['doctor', 'nurse'] },
  { key: 'treatment',  label: 'บันทึกการทำหัตถการ (Treatment)', short: 'หัตถการ',  tone: 'orange',  roles: ['doctor', 'nurse'] },
  { key: 'pharmacist', label: 'บันทึกของเภสัชกร',          short: 'เภสัชกร',  tone: 'purple',  roles: ['pharmacist'] },
];

export const noteTypeMeta = (key) =>
  NOTE_TYPES.find((t) => t.key === key) || { key, label: key, short: key, tone: 'grey', roles: [] };

/* role ปัจจุบันเลือกประเภทนี้ได้ไหม — เภสัชกรโน้ตต้องเป็นเภสัชกรเท่านั้น
   (TOR edge case S4) */
export const canAuthorNoteType = (typeKey, role = CURRENT_CLINICIAN.role) =>
  noteTypeMeta(typeKey).roles.includes(role);

/* คำแนะนำสำหรับ SuggestibleTextarea ของแต่ละประเภท (ต้องมีเสมอ) */
export const NOTE_SUGGESTIONS = {
  doctor: [
    'ผู้รับบริการอาการดีขึ้น ไม่มีไข้ ตรวจร่างกายไม่พบความผิดปกติเพิ่มเติม',
    'อธิบายผลการตรวจและแผนการรักษาให้ผู้รับบริการและญาติรับทราบแล้ว',
    'พิจารณาปรับยาลดความดันโลหิต นัดติดตามผลใน 4 สัปดาห์',
    'ยังคงแผนการรักษาเดิม ให้สังเกตอาการต่อที่บ้าน',
  ],
  nurse: [
    'ผู้รับบริการรู้สึกตัวดี ให้คำแนะนำเรื่องการพักผ่อนและดื่มน้ำให้เพียงพอ',
    'วัดสัญญาณชีพซ้ำหลังให้ยา อาการคงที่ ไม่มีภาวะแทรกซ้อน',
    'ให้คำแนะนำการดูแลแผลที่บ้านและสังเกตอาการติดเชื้อ',
    'ผู้รับบริการปฏิเสธการนอนสังเกตอาการ ให้เอกสารคำแนะนำกลับบ้าน',
  ],
  progress: [
    'วันที่ 2 หลังเริ่มยาปฏิชีวนะ ไข้ลดลง อาการไอลดลงชัดเจน',
    'ติดตามผลแล็บซ้ำ ค่าน้ำตาลลดลงจากครั้งก่อน แนะนำคุมอาหารต่อ',
    'อาการปวดลดจาก 7/10 เหลือ 3/10 หลังได้รับยาแก้ปวด',
  ],
  treatment: [
    'ทำแผลที่ปลายแขนซ้าย ล้างด้วย NSS ปิดด้วยผ้าก๊อซปราศจากเชื้อ ไม่มีเลือดออกซึม',
    'เย็บแผล 4 เข็มด้วย Nylon 4-0 ฉีดยาชา 1% Lidocaine 3 mL นัดตัดไหม 7 วัน',
    'พ่นยาขยายหลอดลม 1 ครั้ง สังเกตอาการ 30 นาที ไม่มีผลข้างเคียง',
  ],
  pharmacist: [
    'ทบทวนรายการยา พบยาซ้ำกลุ่ม NSAIDs แจ้งแพทย์ผู้สั่งแล้ว',
    'ให้คำแนะนำการใช้ยาพ่นและตรวจสอบเทคนิคการใช้กับผู้รับบริการแล้ว',
    'ผู้รับบริการมีประวัติแพ้ Penicillin — ยืนยันว่ารายการยาครั้งนี้ไม่มียากลุ่มดังกล่าว',
  ],
};

export const noteSuggestions = (typeKey) => NOTE_SUGGESTIONS[typeKey] || NOTE_SUGGESTIONS.doctor;

let seq = 0;
const uid = () => `note-${Date.now().toString(36)}-${(seq += 1)}`;

const NOTES = [
  {
    id: 'note-seed-5', visitId: 'v-2569-05-06', hn: '67-00001', type: 'doctor',
    body: 'ผู้รับบริการมาด้วยไข้ต่ำ ๆ ปวดศีรษะและไอแห้ง 2 วัน ตรวจร่างกาย: คอแดงเล็กน้อย ปอดปกติ วินิจฉัยเป็นการติดเชื้อทางเดินหายใจส่วนบน ให้ยาตามอาการ นัดกลับหากไข้สูงเกิน 3 วัน',
    structured: null,
    author: 'พญ.สมหญิง รักษ์ดี', authorRole: 'doctor',
    recordedAt: '6 พ.ค. 2569 · 10:08', amendedAt: '', cancelledAt: '', cancelReason: '',
    erroneousAt: '', confidential: false,
  },
  {
    id: 'note-seed-4', visitId: 'v-2569-05-06', hn: '67-00001', type: 'nurse',
    body: 'ผู้รับบริการรู้สึกตัวดี ให้คำแนะนำเรื่องการพักผ่อนและดื่มน้ำให้เพียงพอ วัดสัญญาณชีพซ้ำเวลา 09:40 อยู่ในเกณฑ์ปกติ',
    structured: null,
    author: 'พว.สุชาดา แก้วมณี', authorRole: 'nurse',
    recordedAt: '6 พ.ค. 2569 · 09:33', amendedAt: '6 พ.ค. 2569 · 09:41', cancelledAt: '', cancelReason: '',
    erroneousAt: '', confidential: false,
  },
  {
    id: 'note-seed-3', visitId: 'v-2569-05-06', hn: '67-00001', type: 'pharmacist',
    body: 'ทบทวนรายการยาเดิม พบ Ibuprofen ที่ผู้รับบริการซื้อเองซ้ำกลุ่มกับยาที่แพทย์สั่ง แจ้งแพทย์ผู้สั่งและบันทึกในการประสานรายการยาแล้ว',
    structured: null,
    author: 'ภก.วราภรณ์ ดีเลิศ', authorRole: 'pharmacist',
    recordedAt: '6 พ.ค. 2569 · 09:58', amendedAt: '', cancelledAt: '', cancelReason: '',
    erroneousAt: '', confidential: false,
  },
  {
    id: 'note-seed-2', visitId: 'v-2569-04-02', hn: '67-00001', type: 'treatment',
    body: 'ทำแผลที่ปลายแขนซ้าย ล้างด้วย NSS ปิดด้วยผ้าก๊อซปราศจากเชื้อ ไม่มีเลือดออกซึม นัดทำแผลซ้ำใน 3 วัน',
    structured: null,
    author: 'พว.มานพ เกษมสุข', authorRole: 'nurse',
    recordedAt: '2 เม.ย. 2569 · 11:20', amendedAt: '', cancelledAt: '', cancelReason: '',
    erroneousAt: '', confidential: false,
  },
  {
    id: 'note-seed-1', visitId: 'v-2569-04-02', hn: '67-00001', type: 'doctor',
    body: 'ปรึกษาเรื่องผลตรวจคัดกรองที่เป็นข้อมูลอ่อนไหว — รายละเอียดถูกกำหนดเป็นข้อมูลลับตามนโยบายศูนย์บริการ',
    structured: null,
    author: 'นพ.อนุชา ศรีวิไล', authorRole: 'doctor',
    recordedAt: '2 เม.ย. 2569 · 10:02', amendedAt: '', cancelledAt: '', cancelReason: '',
    erroneousAt: '', confidential: true,
  },
];

const listeners = new Set();
const emit = () => { listeners.forEach((fn) => fn(NOTES)); };

export const subscribeTreatmentNotes = (fn) => {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
};

export const getTreatmentNotes = () => NOTES.map((n) => ({ ...n }));

export const notesForPatient = (hn) => NOTES
  .filter((n) => n.hn === hn)
  .map((n) => ({ ...n }))
  .sort((a, b) => String(b.recordedAt).localeCompare(String(a.recordedAt)));

export const notesForVisit = (hn, visitId) => notesForPatient(hn)
  .filter((n) => !visitId || n.visitId === visitId);

/* ตัวช่วยแสดงผลที่รองรับทั้ง body (wave นี้) และ structured (Wave S) */
export const noteDisplayBody = (note) => {
  if (!note) return '';
  if (note.structured) {
    const s = note.structured;
    return ['S', 'O', 'A', 'P']
      .map((k) => [k, s[k.toLowerCase()]])
      .filter(([, v]) => v)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n');
  }
  return note.body || '';
};

export const addTreatmentNote = ({
  hn, visitId = 'v-current', type = 'doctor', body = '',
  confidential = false, author = CURRENT_CLINICIAN.name, authorRole = CURRENT_CLINICIAN.role,
}) => {
  const note = {
    id: uid(), hn, visitId, type, body,
    /* Wave S จะเขียนค่าจริงลงช่องนี้ — wave ปัจจุบันเว้น null ตาม contract */
    structured: null,
    author, authorRole, recordedAt: stampNow(),
    amendedAt: '', cancelledAt: '', cancelReason: '', erroneousAt: '', confidential,
  };
  NOTES.unshift(note);
  emit();
  appendAudit({
    hn, visitId, category: 'note', field: noteTypeMeta(type).label,
    oldValue: '—', newValue: confidential ? 'บันทึกใหม่ (ข้อมูลลับ)' : body.slice(0, 80), by: author,
  });
  return { ...note };
};

export const updateTreatmentNote = (id, patch = {}) => {
  const note = NOTES.find((n) => n.id === id);
  if (!note) return null;
  const before = note.body;
  Object.assign(note, patch, { amendedAt: stampNow() });
  emit();
  appendAudit({
    hn: note.hn, visitId: note.visitId, category: 'note',
    field: `แก้ไข${noteTypeMeta(note.type).label}`,
    oldValue: before.slice(0, 80), newValue: note.body.slice(0, 80), by: CURRENT_CLINICIAN.name,
  });
  return { ...note };
};

/* ยกเลิก = soft-cancel เก็บแถวไว้พร้อมเหตุผล (TOR: แสดง/บันทึก/แก้ไข/ยกเลิก) */
export const cancelTreatmentNote = (id, reason) => {
  const note = NOTES.find((n) => n.id === id);
  if (!note) return null;
  note.cancelledAt = stampNow();
  note.cancelReason = reason || 'ไม่ได้ระบุเหตุผล';
  note.cancelledBy = CURRENT_CLINICIAN.name;
  emit();
  appendAudit({
    hn: note.hn, visitId: note.visitId, category: 'note',
    field: `ยกเลิก${noteTypeMeta(note.type).label}`,
    oldValue: note.body.slice(0, 80), newValue: `ยกเลิก — ${note.cancelReason}`, by: CURRENT_CLINICIAN.name,
  });
  return { ...note };
};

export const restoreTreatmentNote = (id) => {
  const note = NOTES.find((n) => n.id === id);
  if (!note) return null;
  const reason = note.cancelReason;
  note.cancelledAt = '';
  note.cancelReason = '';
  emit();
  appendAudit({
    hn: note.hn, visitId: note.visitId, category: 'note',
    field: `กู้คืน${noteTypeMeta(note.type).label}`,
    oldValue: `ยกเลิก — ${reason}`, newValue: 'กลับมาใช้งาน', by: CURRENT_CLINICIAN.name,
  });
  return { ...note };
};

export default NOTES;
