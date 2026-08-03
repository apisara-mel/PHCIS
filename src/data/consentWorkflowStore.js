/* PHCIS | Consent — module-level MOCK store เชื่อม state ข้ามหน้าใน session
   เดียว (ไม่ persist — refresh แล้วหาย, ตั้งใจ เพราะทั้งระบบเป็น mock local).

   ใช้เชื่อม 2 เหตุการณ์ตาม TOR ผนวก ด:
     • ด.1.1.5  เผยแพร่เทมเพลตเวอร์ชันใหม่ → record ที่เซ็นเวอร์ชันเก่าใน
                worklist (/consent) กลายเป็นสถานะ "มีเวอร์ชันใหม่"
     • ด.1.1.16 เก็บ log การ export รายงาน (print ไม่เก็บ — annotation
                414:123633)

   ไม่แตะ global state กลาง — เป็นแค่ตัวแปร module + getter/setter ธรรมดา. */

/* ── เทมเพลตที่ถูก bump เวอร์ชัน (คีย์ = ประเภท Consent ภาษาไทย) ────────── */
const supersededTypes = new Set();

export const markTypeSuperseded = (type) => {
  if (type) supersededTypes.add(type);
};
export const isTypeSuperseded = (type) => supersededTypes.has(type);
export const listSupersededTypes = () => [...supersededTypes];

/* ── Log การส่งออกข้อมูล (ด.1.1.16 / TOR 1.4.3.16) ─────────────────────── */
const exportLog = [];

export const logExport = ({ source, format, by = 'ลดา ดีงาม' }) => {
  exportLog.push({
    source,
    format: format || '-',
    by,
    at: new Date().toLocaleString('th-TH', { dateStyle: 'long', timeStyle: 'short' }),
  });
};
export const listExportLog = () => [...exportLog];
