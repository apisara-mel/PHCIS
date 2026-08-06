/* PHCIS | PII masking — มาตรฐานเดียวสำหรับชื่อใน worklist ทุกโมดูล
   แสดง 3 ตัวอักษรแรก + 3 ตัวท้าย ส่วนกลาง mask ด้วย • */

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
