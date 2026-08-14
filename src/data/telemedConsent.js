/* ความยินยอม PDPA ของระบบ Telemedicine (TOR §1.13.8 / §1.13.9).

   หน้าทะเบียน /telemed/consent คือ "แหล่งความจริง" ที่ overlay ในสาย
   (TelemedConsultPage) และ MobileTelemedPage อ่านสถานะ "บันทึกได้ / บันทึกไม่ได้"

   ข้อจำกัดที่ integrator ต้องรู้:
     · src/data/consentRecords.js อ่านได้อย่างเดียวในโมดูลนี้ — จึง seed
       บางแถวจาก CONSENT_RECORDS (เฉพาะ type 'PDPA') มาเป็น store ท้องถิ่น
       และ **ใช้คำศัพท์สถานะจาก CONSENT_STATUS เดิมทั้งหมด** เพื่อให้รวมภายหลังได้
     · ConsentFormFillPopup รับ prop `form` ตามสัญญาของ src/data/formsLibrary.js
       (sections[].fields[] · type checkbox | signature | text) — ฟอร์ม
       PDPA-Telemed ด้านล่างจึงถูกนิยามให้ตรง schema นั้นเป๊ะ ๆ
       (ควรย้ายเข้า formsLibrary เมื่อ integrator รวมโมดูล) */

import { CONSENT_RECORDS, CONSENT_STATUS } from '@/data/consentRecords';
import { MOBILE_APP_CHANNEL, DEFAULT_SERVICE_CENTER_CHANNEL } from '@/data/consentChannels';
import { todayAt } from '@/data/telemedVisits';

/* ── ประเภทความยินยอมของโมดูล ────────────────────────────────────────── */
export const TELEMED_CONSENT_KIND = {
  service:   { label: 'ยินยอมรับบริการทางไกล',          tone: 'indigo', icon: 'video_call' },
  recording: { label: 'ยินยอมบันทึกภาพ-เสียง',           tone: 'red',    icon: 'radio_button_checked' },
  thirdParty:{ label: 'ยินยอมให้หน่วยบริการอื่นเข้าร่วมสาย', tone: 'blue',   icon: 'group_add' },
};

/** สถานะที่อนุญาตให้บันทึกสายได้ */
export const CONSENT_ALLOWS_RECORDING = 'ยินยอมแล้ว';

/** ระยะเวลาเก็บรักษาไฟล์บันทึกสายตามนโยบาย (เดือน) */
export const RECORDING_RETENTION_MONTHS = 12;

/* ── แบบฟอร์ม PDPA-Telemed (schema เดียวกับ formsLibrary.FORMS[n]) ──── */
export const TELEMED_PDPA_FORM = {
  slug: 'consent-telemed-pdpa',
  code: 'F-1021',
  category: 'consent',
  name: 'หนังสือยินยอมรับบริการปรึกษาทางไกล และการบันทึกภาพ-เสียง (PDPA)',
  summary: 'ใช้ก่อนเริ่มการปรึกษาทางไกลทุกครั้ง — ครอบคลุมการรับบริการ การบันทึกสาย และการให้หน่วยบริการอื่นเข้าร่วม',
  language: 'ไทย',
  estimatedMinutes: 3,
  version: 'v1.0 (2569)',
  sections: [
    {
      title: 'ข้อมูลผู้รับบริการ',
      fields: [
        { label: 'ชื่อ-นามสกุล', type: 'text', required: true },
        { label: 'เลขประจำตัวประชาชน', type: 'text', required: true },
        { label: 'HN (เลขประวัติผู้ป่วย)', type: 'text' },
      ],
    },
    {
      title: 'การยินยอมรับบริการปรึกษาทางไกล',
      fields: [
        { label: 'ข้าพเจ้ายินยอมรับบริการตรวจรักษาและให้คำปรึกษาผ่านระบบ Telemedicine', type: 'checkbox', required: true },
        { label: 'ข้าพเจ้าเข้าใจว่าการประเมินทางไกลมีข้อจำกัด และอาจต้องมาตรวจร่างกายที่ศูนย์บริการ', type: 'checkbox', required: true },
        { label: 'ข้าพเจ้ายินยอมให้ส่งค่าที่วัดจากอุปกรณ์ที่บ้านเข้าสู่ระบบเพื่อการติดตามอาการ (RPM)', type: 'checkbox' },
      ],
    },
    {
      title: 'การบันทึกภาพและเสียง (PDPA)',
      fields: [
        { label: 'ข้าพเจ้ายินยอมให้บันทึกภาพและเสียงระหว่างการปรึกษา เพื่อใช้ประกอบเวชระเบียนและการเบิกจ่าย', type: 'checkbox', required: true },
        { label: `ข้าพเจ้าทราบว่าไฟล์บันทึกจะถูกเก็บรักษาไม่เกิน ${RECORDING_RETENTION_MONTHS} เดือน แล้วทำลายตามนโยบายคุ้มครองข้อมูล`, type: 'checkbox', required: true },
        { label: 'ข้าพเจ้ายินยอมให้หน่วยบริการอื่น (เช่น อายุรแพทย์ที่ปรึกษา) เข้าร่วมสายเมื่อจำเป็น', type: 'checkbox' },
        { label: 'ข้าพเจ้าทราบว่าสามารถเพิกถอนความยินยอมได้ทุกเมื่อ โดยไฟล์ที่บันทึกไว้จะถูกลบ', type: 'checkbox', required: true },
      ],
    },
    {
      title: 'ลงนาม',
      fields: [
        { label: 'ลายเซ็นผู้รับบริการ / ผู้แทนโดยชอบธรรม', type: 'signature', required: true },
        { label: 'วันที่', type: 'date', required: true },
      ],
    },
  ],
};

/* ── seed: ผูก visit ของ worklist เข้ากับสถานะยินยอม ─────────────────── */
const monthsAhead = (n) => {
  const d = new Date();
  d.setMonth(d.getMonth() + n);
  return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });
};
const monthsAgo = (n) => {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });
};
/* createdDate เป็นสตริงไทยไว้แสดงผล — ตัวกรอง "ช่วง:" ต้องใช้ ISO ที่เทียบได้จริง
   จึงเก็บ createdAt คู่กันทุกแถว (หน้า /telemed/consent อ่านค่านี้) */
const monthsAgoIso = (n) => {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d.toISOString();
};

/** แถว PDPA จากทะเบียน Consent กลาง — อ่านอย่างเดียว ใช้ seed คำศัพท์/รูปแบบ
    หัวข้อหลัก "ข้อมูลส่วนบุคคล" คือ PDPA เดิม (ทะเบียนจัดใหม่เป็น 3 หัวข้อ) */
export const SEEDED_PDPA_SOURCE = CONSENT_RECORDS
  .filter((r) => r.type === 'ข้อมูลส่วนบุคคล')
  .slice(0, 6);

const SEED_CONSENTS = [
  {
    key: 'TMC-001', visitId: 'TMV-001', hn: '67-00001', name: 'นายสมชาย มีสุข',
    kind: 'recording', status: 'ยินยอมแล้ว', channel: MOBILE_APP_CHANNEL,
    formSlug: TELEMED_PDPA_FORM.slug, formCode: TELEMED_PDPA_FORM.code, formName: TELEMED_PDPA_FORM.name,
    version: 'V 1.0', requester: 'พว.กนกวรรณ ศรีทอง',
    createdAt: monthsAgoIso(1), createdDate: monthsAgo(1), signedDate: monthsAgo(1), expiryDate: monthsAhead(11), withdrawnDate: '-',
    recordings: [
      { id: 'REC-1001', name: 'telemed-67-00001-20260710.mp4', size: '182 MB', at: todayAt(9, 40), retentionMonths: RECORDING_RETENTION_MONTHS },
    ],
    history: [{ at: monthsAgo(1), by: 'พว.กนกวรรณ ศรีทอง', action: 'ลงนามยินยอมผ่าน Mobile App', reason: '' }],
  },
  {
    key: 'TMC-002', visitId: 'TMV-002', hn: '67-00002', name: 'นางสาวดวงใจ พินิจ',
    kind: 'service', status: 'รอลงนาม', channel: MOBILE_APP_CHANNEL,
    formSlug: TELEMED_PDPA_FORM.slug, formCode: TELEMED_PDPA_FORM.code, formName: TELEMED_PDPA_FORM.name,
    version: 'V 1.0', requester: 'นายวีรยุทธ พงษ์ไพศาล',
    createdAt: monthsAgoIso(0), createdDate: monthsAgo(0), signedDate: '-', expiryDate: '-', withdrawnDate: '-',
    recordings: [],
    history: [{ at: monthsAgo(0), by: 'นายวีรยุทธ พงษ์ไพศาล', action: 'ส่งคำขอความยินยอมไปที่แอปผู้รับบริการ', reason: '' }],
  },
  {
    key: 'TMC-003', visitId: 'TMV-003', hn: '67-00007', name: 'นางบุญมา ทองดี',
    kind: 'recording', status: 'ยินยอมแล้ว', channel: DEFAULT_SERVICE_CENTER_CHANNEL,
    formSlug: TELEMED_PDPA_FORM.slug, formCode: TELEMED_PDPA_FORM.code, formName: TELEMED_PDPA_FORM.name,
    version: 'V 1.0', requester: 'พว.กนกวรรณ ศรีทอง',
    createdAt: monthsAgoIso(2), createdDate: monthsAgo(2), signedDate: monthsAgo(2), expiryDate: monthsAhead(10), withdrawnDate: '-',
    recordings: [
      { id: 'REC-1003', name: 'telemed-67-00007-20260728.mp4', size: '96 MB', at: todayAt(9, 20), retentionMonths: RECORDING_RETENTION_MONTHS },
      { id: 'REC-1004', name: 'telemed-67-00007-20260715.mp4', size: '141 MB', at: todayAt(9, 22), retentionMonths: RECORDING_RETENTION_MONTHS },
    ],
    history: [{ at: monthsAgo(2), by: 'พว.กนกวรรณ ศรีทอง', action: 'ลงนามยินยอมที่ศูนย์บริการ', reason: '' }],
  },
  {
    key: 'TMC-004', visitId: 'TMV-004', hn: '67-00011', name: 'นายประเสริฐ วัฒนกุล',
    kind: 'recording', status: 'ปฏิเสธ', channel: MOBILE_APP_CHANNEL,
    formSlug: TELEMED_PDPA_FORM.slug, formCode: TELEMED_PDPA_FORM.code, formName: TELEMED_PDPA_FORM.name,
    version: 'V 1.0', requester: 'นายวีรยุทธ พงษ์ไพศาล',
    createdAt: monthsAgoIso(0), createdDate: monthsAgo(0), signedDate: '-', expiryDate: '-', withdrawnDate: '-',
    recordings: [],
    history: [{ at: monthsAgo(0), by: 'ผู้รับบริการ', action: 'ปฏิเสธการบันทึกภาพ-เสียง (ยังยินยอมรับบริการ)', reason: 'ไม่สะดวกให้บันทึกวิดีโอ' }],
  },
  {
    key: 'TMC-005', visitId: 'TMV-005', hn: '67-00005', name: 'นางสาวกาญจนา ศรีสุข',
    kind: 'recording', status: 'ใกล้หมดอายุ', channel: DEFAULT_SERVICE_CENTER_CHANNEL,
    formSlug: TELEMED_PDPA_FORM.slug, formCode: TELEMED_PDPA_FORM.code, formName: TELEMED_PDPA_FORM.name,
    version: 'V 1.0', requester: 'พญ.วราภรณ์ สุขใจ',
    createdAt: monthsAgoIso(11), createdDate: monthsAgo(11), signedDate: monthsAgo(11), expiryDate: monthsAhead(0), withdrawnDate: '-',
    expiresInDays: 12,
    recordings: [
      { id: 'REC-1005', name: 'telemed-67-00005-20260803.mp4', size: '74 MB', at: todayAt(8, 58), retentionMonths: RECORDING_RETENTION_MONTHS },
    ],
    history: [{ at: monthsAgo(11), by: 'พญ.วราภรณ์ สุขใจ', action: 'ลงนามยินยอมที่ศูนย์บริการ', reason: '' }],
  },
  {
    key: 'TMC-006', visitId: 'TMV-006', hn: '67-00009', name: 'นายวิเชียร มั่นคง',
    kind: 'thirdParty', status: 'ยินยอมแล้ว', channel: MOBILE_APP_CHANNEL,
    formSlug: TELEMED_PDPA_FORM.slug, formCode: TELEMED_PDPA_FORM.code, formName: TELEMED_PDPA_FORM.name,
    version: 'V 1.0', requester: 'นพ.ธนกร ใจดี',
    createdAt: monthsAgoIso(3), createdDate: monthsAgo(3), signedDate: monthsAgo(3), expiryDate: monthsAhead(9), withdrawnDate: '-',
    recordings: [],
    history: [{ at: monthsAgo(3), by: 'นพ.ธนกร ใจดี', action: 'ลงนามยินยอมผ่าน Mobile App', reason: '' }],
  },
  {
    key: 'TMC-007', visitId: 'TMV-007', hn: '67-00013', name: 'นางมาลี ศรีวิไล',
    kind: 'service', status: 'ขอเพิกถอน', channel: MOBILE_APP_CHANNEL,
    formSlug: TELEMED_PDPA_FORM.slug, formCode: TELEMED_PDPA_FORM.code, formName: TELEMED_PDPA_FORM.name,
    version: 'V 1.0', requester: 'พว.กนกวรรณ ศรีทอง',
    createdAt: monthsAgoIso(4), createdDate: monthsAgo(4), signedDate: monthsAgo(4), expiryDate: monthsAhead(8), withdrawnDate: '-',
    recordings: [
      { id: 'REC-1007', name: 'telemed-67-00013-20260620.mp4', size: '118 MB', at: todayAt(10, 30), retentionMonths: RECORDING_RETENTION_MONTHS },
    ],
    history: [{ at: monthsAgo(0), by: 'ผู้รับบริการ (Mobile App)', action: 'ยื่นคำขอเพิกถอนความยินยอม', reason: 'ลูกหลานขอให้หยุดบันทึกวิดีโอ' }],
  },
  {
    key: 'TMC-008', visitId: 'TMV-008', hn: '67-00016', name: 'นายอนุชา เรืองศรี',
    kind: 'recording', status: 'หมดอายุ', channel: DEFAULT_SERVICE_CENTER_CHANNEL,
    formSlug: TELEMED_PDPA_FORM.slug, formCode: TELEMED_PDPA_FORM.code, formName: TELEMED_PDPA_FORM.name,
    version: 'V 1.0', requester: 'นายวีรยุทธ พงษ์ไพศาล',
    createdAt: monthsAgoIso(14), createdDate: monthsAgo(14), signedDate: monthsAgo(14), expiryDate: monthsAgo(2), withdrawnDate: '-',
    recordings: [],
    history: [{ at: monthsAgo(2), by: 'ระบบ', action: 'ความยินยอมหมดอายุอัตโนมัติ', reason: 'ครบกำหนด 12 เดือน' }],
  },
];

/* ── store ───────────────────────────────────────────────────────────── */
const CONSENTS = SEED_CONSENTS.map((c) => ({
  ...c,
  recordings: c.recordings.map((r) => ({ ...r })),
  history: c.history.map((h) => ({ ...h })),
}));

const listeners = new Set();
const emit = () => listeners.forEach((fn) => { try { fn(); } catch { /* ignore */ } });
export const subscribeTelemedConsent = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };

export const getTelemedConsents = () => CONSENTS.map((c) => ({
  ...c,
  recordings: c.recordings.map((r) => ({ ...r })),
  history: c.history.map((h) => ({ ...h })),
}));

export const getTelemedConsent = (key) => getTelemedConsents().find((c) => c.key === key) || null;

export const getConsentByVisit = (visitId) => getTelemedConsents().find((c) => c.visitId === visitId) || null;

export const getConsentByHn = (hn) => getTelemedConsents().filter((c) => c.hn === hn);

/** โทนแบดจ์จากทะเบียน Consent กลาง (คำศัพท์เดียวกัน) */
export const consentTone = (status) => CONSENT_STATUS[status]?.tone || 'grey';

/** แท็บที่สถานะนี้อยู่ (ใช้ CONSENT_TABS ของโมดูล Consent) */
export const consentTab = (status) => CONSENT_STATUS[status]?.tab || 'pending';

/** บันทึกสายได้ไหม — ใช้ร่วมกันทั้ง web overlay และ mobile */
export const canRecordCall = (visitId) => {
  const c = getConsentByVisit(visitId);
  if (!c) return { allowed: false, reason: 'ยังไม่มีเอกสารความยินยอมสำหรับการปรึกษาครั้งนี้', status: null };
  if (c.status !== CONSENT_ALLOWS_RECORDING) {
    return { allowed: false, reason: `สถานะความยินยอมคือ "${c.status}" — บันทึกสายไม่ได้`, status: c.status, consent: c };
  }
  if (c.kind !== 'recording') {
    return { allowed: false, reason: 'ผู้รับบริการยินยอมรับบริการ แต่ยังไม่ได้ยินยอมให้บันทึกภาพ-เสียง', status: c.status, consent: c };
  }
  return { allowed: true, status: c.status, consent: c };
};

const pushHistory = (c, actor, action, reason) => {
  c.history.unshift({ at: new Date().toISOString(), by: actor, action, reason: reason || '' });
};

/** ขอความยินยอมใหม่ / บันทึกผลจาก ConsentFormFillPopup — TOR "บันทึก" */
export const grantTelemedConsent = (key, { kind = 'recording', channel, signedAt } = {}, actor) => {
  const c = CONSENTS.find((x) => x.key === key);
  if (!c) return { ok: false, reason: 'ไม่พบรายการความยินยอม' };
  c.kind = kind;
  c.status = 'ยินยอมแล้ว';
  c.channel = channel || c.channel;
  c.signedDate = new Date(signedAt || Date.now()).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });
  c.expiryDate = monthsAhead(RECORDING_RETENTION_MONTHS);
  c.withdrawnDate = '-';
  c.expiresInDays = undefined;
  pushHistory(c, actor, `ลงนามยินยอม (${TELEMED_CONSENT_KIND[kind].label})`, '');
  emit();
  return { ok: true };
};

/** สร้างคำขอใหม่สำหรับผู้ที่ยังไม่มีทะเบียน — TOR "เพิ่ม" */
export const requestTelemedConsent = ({ visitId, hn, name, kind = 'recording', channel }, actor) => {
  const key = `TMC-${Date.now()}`;
  CONSENTS.push({
    key, visitId, hn, name, kind,
    status: 'รอลงนาม',
    channel: channel || MOBILE_APP_CHANNEL,
    formSlug: TELEMED_PDPA_FORM.slug, formCode: TELEMED_PDPA_FORM.code, formName: TELEMED_PDPA_FORM.name,
    version: 'V 1.0', requester: actor,
    createdAt: monthsAgoIso(0), createdDate: monthsAgo(0), signedDate: '-', expiryDate: '-', withdrawnDate: '-',
    recordings: [],
    history: [{ at: new Date().toISOString(), by: actor, action: 'สร้างคำขอความยินยอม', reason: '' }],
  });
  emit();
  return { ok: true, key };
};

/** ปฏิเสธ — บังคับเหตุผลเหมือนทุกการกระทำที่ตัดสิทธิ์ (ยกเลิก/เพิกถอน/ลบไฟล์) */
export const denyTelemedConsent = (key, reason, actor) => {
  const c = CONSENTS.find((x) => x.key === key);
  if (!c) return { ok: false, reason: 'ไม่พบรายการความยินยอม' };
  if (!reason || !reason.trim()) return { ok: false, reason: 'ต้องระบุเหตุผลการปฏิเสธ' };
  c.status = 'ปฏิเสธ';
  c.denyReason = reason.trim();
  pushHistory(c, actor, 'บันทึกการปฏิเสธความยินยอม', reason.trim());
  emit();
  return { ok: true };
};

/** ผลกระทบก่อนกดเพิกถอน — โชว์ใน AlertDialog ก่อนยืนยัน */
export const revokeImpact = (key) => {
  const c = getTelemedConsent(key);
  if (!c) return null;
  return {
    stopRecording: c.kind === 'recording' && c.status === 'ยินยอมแล้ว',
    fileCount: c.recordings.length,
    fileNames: c.recordings.map((r) => r.name),
    notify: [c.requester, 'เจ้าหน้าที่ PDPA'].filter(Boolean),
  };
};

/** เพิกถอน — หยุดบันทึก + คิวลบไฟล์ + คงประวัติ (ห้ามลบแถวออกจากทะเบียน) */
export const revokeTelemedConsent = (key, reason, actor, { deleteFiles = true } = {}) => {
  const c = CONSENTS.find((x) => x.key === key);
  if (!c) return { ok: false, reason: 'ไม่พบรายการความยินยอม' };
  if (!reason || !reason.trim()) return { ok: false, reason: 'ต้องระบุเหตุผลการเพิกถอน' };
  const removed = c.recordings.length;
  c.status = 'ถอนความยินยอม';
  c.withdrawnDate = monthsAgo(0);
  if (deleteFiles) {
    c.recordings.forEach((r) => { r.queuedForDeletion = true; r.deletedAt = new Date().toISOString(); });
  }
  pushHistory(c, actor, `เพิกถอนความยินยอม · เข้าคิวลบไฟล์ ${removed} ไฟล์`, reason.trim());
  emit();
  return { ok: true, removed };
};

/** Reconsent — ส่งคำขอฉบับใหม่ (สถานะกลับเป็น "รอลงนาม") */
export const reconsentTelemed = (key, actor) => {
  const c = CONSENTS.find((x) => x.key === key);
  if (!c) return { ok: false, reason: 'ไม่พบรายการความยินยอม' };
  c.status = 'รอลงนาม';
  c.signedDate = '-';
  c.expiryDate = '-';
  c.version = `V 1.${Number(String(c.version).split('.').pop() || 0) + 1}`;
  pushHistory(c, actor, 'ส่งคำขอความยินยอมฉบับใหม่ (Reconsent)', '');
  emit();
  return { ok: true };
};

/** ลบไฟล์บันทึกรายไฟล์ (เฉพาะ role ที่มีสิทธิ์) */
export const deleteRecordingFile = (key, recordingId, reason, actor) => {
  const c = CONSENTS.find((x) => x.key === key);
  if (!c) return { ok: false, reason: 'ไม่พบรายการความยินยอม' };
  const rec = c.recordings.find((r) => r.id === recordingId);
  if (!rec) return { ok: false, reason: 'ไม่พบไฟล์บันทึก' };
  if (!reason || !reason.trim()) return { ok: false, reason: 'ต้องระบุเหตุผลการลบไฟล์' };
  rec.queuedForDeletion = true;
  rec.deletedAt = new Date().toISOString();
  rec.deletedBy = actor;
  rec.deleteReason = reason.trim();
  pushHistory(c, actor, `ลบไฟล์บันทึกสาย · ${rec.name}`, reason.trim());
  emit();
  return { ok: true };
};

/** บันทึกไฟล์ใหม่หลังจบสาย (overlay เรียกเมื่อ stop recording) */
export const attachRecording = (key, file, actor) => {
  const c = CONSENTS.find((x) => x.key === key);
  if (!c) return { ok: false, reason: 'ไม่พบรายการความยินยอม' };
  const row = {
    id: `REC-${Date.now()}`,
    name: file?.name || `telemed-${c.hn}-${Date.now()}.mp4`,
    size: file?.size || '—',
    at: new Date().toISOString(),
    retentionMonths: RECORDING_RETENTION_MONTHS,
  };
  c.recordings.push(row);
  pushHistory(c, actor, `บันทึกไฟล์การให้บริการ · ${row.name}`, '');
  emit();
  return { ok: true, recording: row };
};

/** สัดส่วนสายที่บันทึกได้ (มี consent) เทียบทั้งหมด — ใช้ในรายงาน 1.13.10 */
export const consentCoverage = () => {
  const all = getTelemedConsents();
  const consented = all.filter((c) => c.status === 'ยินยอมแล้ว').length;
  return { total: all.length, consented, pct: all.length ? Math.round((consented / all.length) * 100) : 0 };
};
