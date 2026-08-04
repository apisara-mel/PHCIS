/* PHCIS | EMR §1.4.6.2–§1.4.6.5 / §1.4.10.11 — ศูนย์เอกสารประจำ Visit.

   • ออกเอกสาร (ใบรับรองแพทย์ 5 แบบ / ประวัติการตรวจรักษา / Clinical Summary
     / แบบฟอร์มส่งตัว)
   • ทะเบียน e-Document — ออกแล้ว / ยกเลิกพร้อมเหตุผล / จำนวนครั้งที่พิมพ์
   • ไฟล์แนบ multimedia (ใช้ร่วมกับ Step 3) — โควตาไฟล์ + โควตา visit */

import { CURRENT_CLINICIAN, stampNow, appendAudit } from '@/data/treatmentAudit';

/* ── ชนิดเอกสารที่ออกได้ ─────────────────────────────────────── */
export const DOC_TEMPLATES = [
  {
    key: 'cert-general', group: 'cert', icon: 'stethoscope',
    title: 'ใบรับรองแพทย์ทั่วไป', subtitle: 'General Medical Certificate',
    desc: 'ยืนยันการเข้ารับบริการและผลการตรวจโดยสรุป',
    requiresDiagnosis: true, requiresSignature: true,
  },
  {
    key: 'cert-sick', group: 'cert', icon: 'sick',
    title: 'ใบรับรองแพทย์เพื่อลาป่วย', subtitle: 'Sick Leave Certificate',
    desc: 'ระบุช่วงวันที่แพทย์แนะนำให้หยุดพัก',
    requiresDiagnosis: true, requiresSignature: true,
  },
  {
    key: 'cert-employment', group: 'cert', icon: 'badge',
    title: 'ใบรับรองแพทย์เพื่อสมัครงาน', subtitle: 'Pre-employment Certificate',
    desc: 'ตามแบบของแพทยสภา 5 โรคต้องห้าม',
    requiresDiagnosis: false, requiresSignature: true,
  },
  {
    key: 'cert-travel', group: 'cert', icon: 'flights_and_hotels',
    title: 'ใบรับรองแพทย์เพื่อเดินทางไปต่างประเทศ', subtitle: 'Fit-to-Fly / Travel Certificate',
    desc: 'ภาษาอังกฤษ พร้อมเลขที่หนังสือเดินทาง',
    requiresDiagnosis: true, requiresSignature: true,
  },
  {
    key: 'cert-migrant', group: 'cert', icon: 'diversity_3',
    title: 'ใบรับรองแพทย์สำหรับแรงงานต่างด้าว', subtitle: 'Migrant Worker Health Certificate',
    desc: 'ตามแบบตรวจสุขภาพแรงงานต่างด้าว 6 โรค',
    requiresDiagnosis: false, requiresSignature: true,
  },
  {
    key: 'medical-record', group: 'record', icon: 'history_edu',
    title: 'ประวัติการตรวจรักษา (Medical Record)', subtitle: 'เลือกช่วง visit ที่ต้องการพิมพ์',
    desc: 'สรุปทุก visit ในช่วงวันที่ที่เลือก',
    requiresDiagnosis: false, requiresSignature: false, needsRange: true,
  },
  {
    key: 'clinical-summary', group: 'record', icon: 'clinical_notes',
    title: 'Clinical Summary', subtitle: 'สรุปการรักษาครั้งนี้ 1 หน้า',
    desc: 'ข้อมูลทั่วไป · CC · vital signs · การแพ้ · problem list · ผลตรวจ · การวินิจฉัย · คำสั่งการรักษา · med rec · คำแนะนำ · นัดหมาย',
    requiresDiagnosis: false, requiresSignature: false,
  },
  {
    key: 'referral-form', group: 'refer', icon: 'send',
    title: 'แบบฟอร์มส่งตัว (ใบส่งต่อ)', subtitle: 'ตามแบบ ศบส. §2.5.1',
    desc: 'เปิดทะเบียนการส่งต่อเพื่อออกใบส่งตัว',
    requiresDiagnosis: false, requiresSignature: false, deepLink: '/treat/refer',
  },
];

export const docTemplateMeta = (key) => DOC_TEMPLATES.find((t) => t.key === key) || null;

export const DOC_STATUSES = [
  { key: 'draft',     label: 'ร่าง',     badge: 'neutral' },
  { key: 'issued',    label: 'ออกแล้ว',  badge: 'success' },
  { key: 'cancelled', label: 'ยกเลิก',   badge: 'error'   },
];

export const docStatusMeta = (key) =>
  DOC_STATUSES.find((s) => s.key === key) || DOC_STATUSES[0];

export const DOC_CANCEL_SUGGESTIONS = [
  'ระบุชื่อ-นามสกุลผู้รับบริการผิด — ออกเอกสารฉบับใหม่แทน',
  'ผู้รับบริการขอแก้ไขช่วงวันที่ลาป่วย',
  'ออกเอกสารซ้ำโดยไม่ตั้งใจ',
  'แพทย์ผู้ลงนามไม่ตรงกับผู้ตรวจจริง',
];

let seq = 0;
const uid = (p) => `${p}-${Date.now().toString(36)}-${(seq += 1)}`;
let docNoSeq = 4821;
const nextDocNo = () => { docNoSeq += 1; return `DOC-2569-${docNoSeq}`; };

const DOCUMENTS = [
  {
    id: 'doc-seed-1', hn: '67-00001', visitId: 'v-2569-05-06',
    templateKey: 'cert-sick', title: 'ใบรับรองแพทย์เพื่อลาป่วย', type: 'ใบรับรองแพทย์',
    docNo: 'DOC-2569-4818', issuedBy: 'พญ.สมหญิง รักษ์ดี', issuedAt: '6 พ.ค. 2569 · 10:52',
    status: 'issued', confidential: false, printCount: 2,
    cancelledAt: '', cancelReason: '',
  },
  {
    id: 'doc-seed-2', hn: '67-00001', visitId: 'v-2569-05-06',
    templateKey: 'clinical-summary', title: 'Clinical Summary — 6 พ.ค. 2569', type: 'สรุปการรักษา',
    docNo: 'DOC-2569-4819', issuedBy: 'พญ.สมหญิง รักษ์ดี', issuedAt: '6 พ.ค. 2569 · 11:02',
    status: 'issued', confidential: false, printCount: 1,
    cancelledAt: '', cancelReason: '',
  },
  {
    id: 'doc-seed-3', hn: '67-00001', visitId: 'v-2569-04-02',
    templateKey: 'cert-general', title: 'ใบรับรองแพทย์ทั่วไป', type: 'ใบรับรองแพทย์',
    docNo: 'DOC-2569-4712', issuedBy: 'นพ.อนุชา ศรีวิไล', issuedAt: '2 เม.ย. 2569 · 11:40',
    status: 'cancelled', confidential: false, printCount: 1,
    cancelledAt: '2 เม.ย. 2569 · 12:05',
    cancelReason: 'ระบุชื่อ-นามสกุลผู้รับบริการผิด — ออกเอกสารฉบับใหม่แทน',
  },
  {
    id: 'doc-seed-4', hn: '67-00001', visitId: 'v-2569-04-02',
    templateKey: 'medical-record', title: 'ประวัติการตรวจรักษา (ม.ค.–เม.ย. 2569)', type: 'ประวัติการรักษา',
    docNo: 'DOC-2569-4715', issuedBy: 'พญ.สมหญิง รักษ์ดี', issuedAt: '2 เม.ย. 2569 · 13:18',
    status: 'issued', confidential: true, printCount: 1,
    cancelledAt: '', cancelReason: '',
  },
];

const docListeners = new Set();
const emitDocs = () => { docListeners.forEach((fn) => fn(DOCUMENTS)); };

export const subscribeDocuments = (fn) => {
  docListeners.add(fn);
  return () => { docListeners.delete(fn); };
};

export const documentsForPatient = (hn) => DOCUMENTS
  .filter((d) => !hn || d.hn === hn)
  .map((d) => ({ ...d }));

export const issueDocument = ({ hn, visitId = 'v-current', templateKey, title, confidential = false }) => {
  const tpl = docTemplateMeta(templateKey);
  const row = {
    id: uid('doc'), hn, visitId, templateKey,
    title: title || tpl?.title || 'เอกสาร',
    type: tpl?.group === 'cert' ? 'ใบรับรองแพทย์' : tpl?.group === 'refer' ? 'ใบส่งต่อ' : 'สรุปการรักษา',
    docNo: nextDocNo(),
    issuedBy: CURRENT_CLINICIAN.name, issuedAt: stampNow(),
    status: 'issued', confidential, printCount: 0,
    cancelledAt: '', cancelReason: '',
  };
  DOCUMENTS.unshift(row);
  emitDocs();
  appendAudit({
    hn, visitId, category: 'document', field: `ออกเอกสาร — ${row.title}`,
    oldValue: '—', newValue: `${row.docNo}${confidential ? ' (ข้อมูลลับ)' : ''}`,
  });
  return { ...row };
};

export const printDocument = (id, copies = 1) => {
  const row = DOCUMENTS.find((d) => d.id === id);
  if (!row) return null;
  row.printCount = (row.printCount || 0) + copies;
  emitDocs();
  appendAudit({
    hn: row.hn, visitId: row.visitId, category: 'document', field: `พิมพ์ ${row.title}`,
    oldValue: `พิมพ์แล้ว ${row.printCount - copies} ครั้ง`,
    newValue: `พิมพ์เพิ่ม ${copies} ชุด (รวม ${row.printCount})`,
  });
  return { ...row };
};

export const cancelDocument = (id, reason) => {
  const row = DOCUMENTS.find((d) => d.id === id);
  if (!row) return null;
  row.status = 'cancelled';
  row.cancelledAt = stampNow();
  row.cancelReason = reason || 'ไม่ได้ระบุเหตุผล';
  row.cancelledBy = CURRENT_CLINICIAN.name;
  emitDocs();
  appendAudit({
    hn: row.hn, visitId: row.visitId, category: 'document', field: `ยกเลิกเอกสาร ${row.docNo}`,
    oldValue: row.title, newValue: `ยกเลิก — ${row.cancelReason}`,
  });
  return { ...row };
};

export const setDocumentConfidential = (id, confidential) => {
  const row = DOCUMENTS.find((d) => d.id === id);
  if (!row) return null;
  row.confidential = !!confidential;
  emitDocs();
  appendAudit({
    hn: row.hn, visitId: row.visitId, category: 'confidential', field: `สถานะข้อมูลลับ — ${row.title}`,
    oldValue: confidential ? 'ปกติ' : 'ข้อมูลลับ', newValue: confidential ? 'ข้อมูลลับ' : 'ปกติ',
  });
  return { ...row };
};

/* ── ไฟล์แนบ multimedia (§1.4.3.22 / §1.4.6.5) ───────────────── */

export const ATTACHMENT_KINDS = [
  { key: 'image', label: 'รูปภาพ', icon: 'image',       exts: ['jpg', 'jpeg', 'png', 'heic'] },
  { key: 'pdf',   label: 'PDF',    icon: 'picture_as_pdf', exts: ['pdf'] },
  { key: 'audio', label: 'เสียง',  icon: 'graphic_eq',  exts: ['m4a', 'mp3', 'wav'] },
  { key: 'video', label: 'วิดีโอ', icon: 'movie',       exts: ['mp4', 'mov', 'webm'] },
];

export const MAX_FILE_BYTES = 10 * 1024 * 1024;   /* 10 MB ต่อไฟล์ */
export const MAX_VISIT_BYTES = 50 * 1024 * 1024;  /* 50 MB ต่อ visit */

export const kindForFile = (fileName = '') => {
  const ext = String(fileName).split('.').pop().toLowerCase();
  return ATTACHMENT_KINDS.find((k) => k.exts.includes(ext)) || null;
};

export const formatBytes = (bytes = 0) => {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
};

/* ตรวจไฟล์ก่อนรับ — คืนข้อความบอกค่าจริงที่เกิน (ไม่ใช่แค่ "ไฟล์ใหญ่เกินไป") */
export const validateAttachment = (file, usedBytes = 0) => {
  const kind = kindForFile(file.name);
  if (!kind) {
    return {
      ok: false,
      message: `ไม่รองรับนามสกุลไฟล์ "${String(file.name).split('.').pop()}" — รองรับเฉพาะ ${ATTACHMENT_KINDS.map((k) => k.exts.join('/')).join(', ')}`,
    };
  }
  if (file.size > MAX_FILE_BYTES) {
    return {
      ok: false,
      message: `ไฟล์ "${file.name}" มีขนาด ${formatBytes(file.size)} เกินขีดจำกัด ${formatBytes(MAX_FILE_BYTES)} ต่อไฟล์`,
    };
  }
  if (usedBytes + file.size > MAX_VISIT_BYTES) {
    return {
      ok: false,
      message: `พื้นที่ของ visit นี้เหลือ ${formatBytes(Math.max(0, MAX_VISIT_BYTES - usedBytes))} แต่ไฟล์นี้ใหญ่ ${formatBytes(file.size)} (โควตารวม ${formatBytes(MAX_VISIT_BYTES)})`,
    };
  }
  return { ok: true, kind: kind.key, message: '' };
};

export const buildAttachmentEntry = (file, kindKey) => ({
  id: uid('att'),
  name: file.name,
  kind: kindKey,
  sizeBytes: file.size,
  /* object URL ให้ตัวเล่นเสียง/รูปพรีวิวได้จริงในหน้าเดียวกัน */
  url: typeof URL !== 'undefined' && URL.createObjectURL ? URL.createObjectURL(file) : '',
  durationLabel: '',
  uploadedBy: CURRENT_CLINICIAN.name,
  uploadedAt: stampNow(),
  cancelledAt: '', cancelReason: '',
});

export const logAttachmentEvent = ({ hn, visitId = 'v-current', action, name, reason }) => {
  appendAudit({
    hn, visitId, category: 'attachment', field: `${action} — ${name}`,
    oldValue: action === 'ลบไฟล์แนบ' ? name : '—',
    newValue: reason || action,
  });
};

/* ไฟล์แนบของ Step 3 ต้องโผล่ในทะเบียนเอกสารของ Step 7 ด้วย (§1.4.6.5) —
   เดิม logAttachmentEvent เขียนแค่ audit ทำให้ documentsForPatient() ไม่เห็นเลย.
   `attachmentId` ใช้ผูกกับไฟล์ต้นทาง เพื่อให้ยกเลิก/เปลี่ยนสถานะตามกันได้. */
export const addAttachmentDocument = ({
  hn, visitId = 'v-current', attachmentId, name, kind, confidential = false,
}) => {
  const kindLabel = (ATTACHMENT_KINDS.find((k) => k.key === kind) || {}).label || 'ไฟล์แนบ';
  const row = {
    id: uid('doc'), hn, visitId,
    templateKey: 'visit-attachment',
    attachmentId: attachmentId || '',
    title: name, type: `ไฟล์แนบ (${kindLabel})`,
    docNo: nextDocNo(),
    issuedBy: CURRENT_CLINICIAN.name, issuedAt: stampNow(),
    status: 'issued', confidential: !!confidential, printCount: 0,
    cancelledAt: '', cancelReason: '',
  };
  DOCUMENTS.unshift(row);
  emitDocs();
  return { ...row };
};

export const findAttachmentDocument = (attachmentId) =>
  DOCUMENTS.find((d) => d.attachmentId && d.attachmentId === attachmentId) || null;

/* ยกเลิก/เปลี่ยนสถานะข้อมูลลับของเอกสารที่ผูกกับไฟล์แนบ ให้ตามกันสองทาง */
export const cancelAttachmentDocument = (attachmentId, reason) => {
  const row = findAttachmentDocument(attachmentId);
  return row ? cancelDocument(row.id, reason) : null;
};

export const setAttachmentDocumentConfidential = (attachmentId, confidential) => {
  const row = findAttachmentDocument(attachmentId);
  return row ? setDocumentConfidential(row.id, confidential) : null;
};

export default DOCUMENTS;
