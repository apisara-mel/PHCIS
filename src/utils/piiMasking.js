/* PHCIS | PII masking — มาตรฐานเดียวสำหรับชื่อใน worklist ทุกโมดูล
   แสดง 3 ตัวอักษรแรก + 3 ตัวท้าย ส่วนกลาง mask ด้วย • */

/** Headers that look like `name` but are NOT a person's name (drugs, ICD, files…). */
export const NON_PERSON_NAME_HEADER_RE =
  /แบบฟอร์ม|ยา|โรค|ไฟล์|ศูนย์|วัสดุ|ชุด|เทมเพลต|รูปแบบ|รายการยา|ชื่อยา|ชื่อโรค|ชื่อไฟล์|ชื่อศูนย์|ชื่อชุด|ชื่อเทมเพลต|ชื่อรูปแบบ|ชื่อรายการ|ชื่อวัสดุ|ชื่อผู้ใช้|ชื่อเจ้าหน้าที่|ผู้ดำเนินการ/;

/** @param {string} [name] */
export function maskWorklistName(name = '') {
  const s = String(name ?? '').trim();
  if (!s) return '—';
  if (s.length <= 3) return '•'.repeat(s.length);
  if (s.length <= 6) {
    const head = s.slice(0, 3);
    const tail = s.slice(-3);
    return `${head}•${tail}`;
  }
  const head = s.slice(0, 3);
  const tail = s.slice(-3);
  const middleLen = Math.max(s.length - 6, 1);
  return `${head}${'•'.repeat(middleLen)}${tail}`;
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
