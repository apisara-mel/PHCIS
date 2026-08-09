/* ตัวเลือกเวลาสำหรับหน้าจอศูนย์บริการ — ใช้ร่วมกันระหว่างหน้าเพิ่มศูนย์
   (เวลาทำการของศูนย์) และตัวแก้ไขโครงสร้าง (เวลาเปิด-ปิดของคลินิก) เพื่อไม่ให้
   สองที่สร้าง TIME_OPTIONS คนละชุดแล้วช่วงเวลาเลื่อนไม่ตรงกัน. */

export { HOUR_GROUPS } from '@/data/centerStore';

/** ทุกครึ่งชั่วโมงตลอด 24 ชม. (00:00 – 23:30). */
export const TIME_OPTIONS = (() => {
  const out = [];
  for (let h = 0; h < 24; h += 1) {
    for (const m of ['00', '30']) {
      const t = `${String(h).padStart(2, '0')}:${m}`;
      out.push({ value: t, label: t });
    }
  }
  return out;
})();

export default TIME_OPTIONS;
