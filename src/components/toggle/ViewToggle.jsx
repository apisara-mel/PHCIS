import React from 'react';
import TabPill, { TabBar } from '@/components/tab/TabPill';

/* MIH ViewToggle — สวิตช์สลับมุมมอง (รายการ / ตาราง / แผนที่).

   ═══ alias ของ design system ไม่ใช่ของที่วาดเอง ═══
   ตัวนี้เป็นเพียง preset ที่ผูก **Tab Bar + Tab Pill (style = Icon)** ของ
   design system เข้าด้วยกัน — design.md §6.15.2 · Figma "Tab Bar / Pill"
   (367-9620 · Tab Bar 2514:7929). ของเดิมวาด track / ปุ่ม / สี hover เองทั้งชุด
   ทำให้สีหลุดจาก token ชุด `*-tabpill-*` (ใช้ `--surface-brandPrimary-quaternary`
   แทน `--surface-tabpill-background`) และไม่ได้ indicator ที่เลื่อนตาม
   เหมือนแท็บอื่นในระบบ.

   ห้ามใส่สไตล์ของตัวเองกลับเข้ามาอีก — ถ้าต้องการหน้าตาต่างจากนี้ ให้แก้ที่
   `TabPill` / `TabBar` (หรือเพิ่ม variant ใน Figma ก่อน) เพื่อให้ทุกจอที่ใช้
   แท็บชุดนี้ขยับพร้อมกัน. */

/** ตัวเลือกมาตรฐาน — รายการ / ตาราง (ผู้เรียกเดิมไม่ต้องส่ง `options`). */
export const VIEW_TOGGLE_LIST_GRID = [
  { value: 'list', icon: 'format_list_bulleted', label: 'มุมมองรายการ' },
  { value: 'grid', icon: 'grid_view', label: 'มุมมองตาราง' },
];

/**
 * @param {string} value ค่ามุมมองปัจจุบัน
 * @param {(next:string)=>void} onChange
 * @param {Array<{value:string, icon:string, label:string}>} options
 *   ชุดมุมมองอื่นที่ไม่ใช่ list/grid เช่น รายการ/แผนที่ ของงานเยี่ยมบ้าน —
 *   ให้ยังเป็น component ตัวเดียวกัน จะได้ไม่มี toggle หน้าตาซ้ำในระบบ.
 */
const ViewToggle = ({
  value,
  onChange,
  options = VIEW_TOGGLE_LIST_GRID,
  'aria-label': ariaLabel = 'สลับมุมมอง',
}) => (
  <TabBar aria-label={ariaLabel} align='center' className='shrink-0'>
    {options.map(({ value: v, icon, label }) => (
      <TabPill
        key={v}
        style='icon'
        leadingIcon={icon}
        selected={value === v}
        onClick={() => onChange?.(v)}
        aria-label={label}
        title={label}
      />
    ))}
  </TabBar>
);

export default ViewToggle;
