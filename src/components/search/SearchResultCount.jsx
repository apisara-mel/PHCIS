import React from 'react';

/* บรรทัดนับผลใต้ช่องค้นหา / ตัวกรอง (แพตเทิร์นเดียวกับ NcdRegistry)

   สองข้อความ (มติผู้ใช้ 25 ส.ค. 69):
     • ยังไม่ค้นหา/ไม่กรอง → "ทั้งหมด 216 รายการ"
     • ค้นหาหรือกรองแล้ว   → "พบ 28 รายการ จาก 216 รายการ"

   ของเดิมขึ้น "พบ ... จาก ..." ตลอดแม้ยังไม่ได้ค้นอะไร ซึ่งอ่านเหมือนระบบ
   กรองอะไรบางอย่างทิ้งไปแล้วทั้งที่ยังไม่ได้ทำ

   `filtered` ส่งมาเองได้เมื่อผู้เรียกรู้สถานะตัวกรองจริง ๆ (เช่นแท็บที่เลือก
   ไม่นับเป็นการค้นหา) ถ้าไม่ส่ง จะอนุมานจาก found !== total */

const SearchResultCount = ({
  found = 0,
  total = 0,
  unit = 'รายการ',
  filtered,
  className = '',
  style = {},
}) => {
  const isFiltered = filtered === undefined ? found !== total : !!filtered;
  return (
    <div
      className={`text-xs text-ink-tertiary ${className}`.trim()}
      style={style}
      aria-live='polite'
    >
      {isFiltered ? (
        <>
          พบ <strong className='text-ink-secondary'>{found}</strong> {unit} จาก {total} {unit}
        </>
      ) : (
        <>
          ทั้งหมด <strong className='text-ink-secondary'>{total}</strong> {unit}
        </>
      )}
    </div>
  );
};

export default SearchResultCount;
