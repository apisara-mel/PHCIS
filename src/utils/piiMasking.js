/* PHCIS | PII masking — มาตรฐานเดียวสำหรับชื่อใน worklist ทุกโมดูล
   แสดง 3 ตัวอักษรแรก + 3 ตัวท้าย ส่วนกลาง mask ด้วย • */

/** Headers that look like `name` but are NOT a person's name (drugs, ICD, files…). */
export const NON_PERSON_NAME_HEADER_RE =
  /แบบฟอร์ม|ยา|โรค|ไฟล์|ศูนย์|วัสดุ|ชุด|เทมเพลต|รูปแบบ|รายการยา|ชื่อยา|ชื่อโรค|ชื่อไฟล์|ชื่อศูนย์|ชื่อชุด|ชื่อเทมเพลต|ชื่อรูปแบบ|ชื่อรายการ|ชื่อวัสดุ|ชื่อผู้ใช้|ชื่อเจ้าหน้าที่|ผู้ดำเนินการ/;

/* ปิดการปิดบังชื่อทั้งระบบ (มติผู้ใช้ 28 ส.ค. 69) — ชื่อ-นามสกุลผู้รับบริการ
   แสดงเต็มทุกหน้า เจ้าหน้าที่ที่เข้าถึง worklist ได้คือคนที่ต้องเห็นชื่ออยู่แล้ว
   การกดเปิดทีละชื่อจึงเป็นด่านที่ไม่ได้กันใครจริง แต่ทำให้ค้นหาและกวาดสายตา
   ในตารางช้าลงทุกครั้ง

   สูตรเดิม (3 ตัวหน้า + • + 3 ตัวท้าย) ถูกถอดออก ถ้าต้องเปิดใช้ใหม่ให้เขียน
   กลับที่ฟังก์ชันนี้ที่เดียว — ทุกจอเรียกผ่านตัวนี้หมด */
/** @param {string} [name] */
export function maskWorklistName(name = '') {
  const s = String(name ?? '').trim();
  return s || '—';
}

/** Table auto-mask for `name` / `patientName` — skip drug / ICD / catalog labels. */
export function isMaskedWorklistNameColumn(col) {
  if (!col) return false;
  const key = String(col.key || '');
  if (key === 'patientName') return true;
  if (key !== 'name') return false;
  const header = String(col.label || col.header || '').trim();
  if (NON_PERSON_NAME_HEADER_RE.test(header)) return false;
  return true;
}
