import React, { useMemo } from 'react';
import { useHistory } from 'react-router-dom';
import Select from '@/components/forms/Select';
import { DASHBOARD_NAV_LINKS } from '@/components/dashboard/DashboardSubNav';
import { listDashboardTemplates } from '@/data/dashboardTemplates';

/* PHCIS | แดชบอร์ด — ตัวสลับ "เทมเพลตหน้าจอ" + ปุ่มสร้างเทมเพลต

   แทนแถบ Tab เดิมของกลุ่มแดชบอร์ด (มติผู้ใช้ 27 ส.ค. 69): แต่ละหน้าจอมาตรฐาน
   กลายเป็นเทมเพลตหนึ่งตัวใน dropdown เลือกแล้วสลับทั้งหน้าจอ — pattern เดียวกับ
   แดชบอร์ดของระบบจัดการความยินยอม ("เปลี่ยนเทมเพลตคือเปลี่ยนทั้งหน้าจอ")

   dropdown มีสองกลุ่มในลิสต์เดียว:
     • `screen:<key>` — หน้าจอมาตรฐาน 5 หน้า (เลือกแล้ว push route ไปหน้านั้น)
     • `<template id>` — เทมเพลตที่ผู้ใช้สร้างเอง (เรนเดอร์การ์ดบนหน้า /dashboard) */

export const SCREEN_VALUE_PREFIX = 'screen:';

/** รายการแรกในลิสต์ = คำสั่งสร้างเทมเพลตใหม่ (เดิมเป็นปุ่มแยกข้าง dropdown —
    ยุบเข้ามาไว้ในลิสต์เดียวกัน มติผู้ใช้ 27 ส.ค. 69) ตัวสร้างอยู่ที่จัดการระบบ
    → เมนู "เทมเพลตแดชบอร์ด" */
const CREATE_VALUE = '__create__';
const CREATE_PATH = '/admin/dashboard-templates';

/* ความสูงของ Select กับปุ่มไม่ได้ใช้สเกลเดียวกัน — ปุ่ม sm/md = 36/40px ส่วน
   Select sm/md/lg = 32/36/40px ถ้าส่ง size ตัวเดียวกันตรง ๆ ช่อง Template จะ
   เตี้ยกว่าปุ่มข้าง ๆ 4px จึงแมปให้ความสูงเท่ากัน (มติผู้ใช้ 27 ส.ค. 69) */
const SELECT_SIZE_FOR_BUTTON = { sm: 'md', md: 'lg', lg: 'lg' };

/** ค่า dropdown ของหน้าจอมาตรฐาน — ใช้ตอนหน้าอื่นบอกว่าตัวเองคือหน้าไหน */
export const screenValue = (key) => `${SCREEN_VALUE_PREFIX}${key}`;

export default function DashboardTemplateSwitcher({
  /** ค่าที่เลือกอยู่ — `screenValue('overview')` หรือ id ของเทมเพลตที่สร้างเอง */
  value,
  /** เรียกเมื่อผู้ใช้เลือกเทมเพลตที่สร้างเอง (เฉพาะหน้า /dashboard ที่เรนเดอร์ได้) */
  onSelectTemplate,
  /** เรียกเมื่อเลือก "สร้างเทมเพลทใหม่" — ไม่ส่งมา = ไปหน้าเทมเพลตแดชบอร์ด
      ในจัดการระบบ ซึ่งเป็นที่อยู่ของตัวสร้าง */
  onCreate,
  /** ทะเบียนเทมเพลตล่าสุด — ส่งเข้ามาเพื่อให้ลิสต์อัปเดตทันทีหลังบันทึก */
  templates,
  /** ขนาดคอนโทรล — ตั้งให้ตรงกับปุ่มอื่นในแถวเดียวกันของแต่ละหน้า */
  size = 'sm',
}) {
  const history = useHistory();
  const custom = useMemo(
    () => (templates || listDashboardTemplates()).filter((t) => !t.locked),
    [templates],
  );

  const options = useMemo(() => ([
    { value: CREATE_VALUE, label: 'สร้างเทมเพลทใหม่', icon: 'dashboard_customize' },
    ...DASHBOARD_NAV_LINKS.map((l) => ({
      value: screenValue(l.key),
      label: l.label,
      leadingIcon: 'dashboard',
    })),
    ...custom.map((t) => ({ value: t.id, label: t.name, leadingIcon: 'dashboard_customize' })),
  ]), [custom]);

  const handleChange = (next) => {
    if (next === CREATE_VALUE) {
      /* ไม่ใช่ค่าที่เลือกได้ — เป็นคำสั่ง เปิดตัวสร้างแล้วคงค่าเดิมไว้ */
      if (onCreate) onCreate();
      else history.push(CREATE_PATH);
      return;
    }
    if (String(next).startsWith(SCREEN_VALUE_PREFIX)) {
      const key = String(next).slice(SCREEN_VALUE_PREFIX.length);
      const link = DASHBOARD_NAV_LINKS.find((l) => l.key === key);
      /* หน้าจอมาตรฐานเป็นคนละ route — สลับเทมเพลตคือย้ายหน้า */
      if (link) history.push(link.path);
      return;
    }
    onSelectTemplate?.(next);
  };

  return (
    <div style={{ width: 'var(--dim-size-2450, 280px)', minWidth: 0 }}>
      <Select
        size={SELECT_SIZE_FOR_BUTTON[size] || 'md'}
        label='เทมเพลตหน้าจอ'
        prefix='Template:'
        showFieldName={false}
        showHelperText={false}
        leadingIcon='dashboard'
        options={options}
        value={value}
        onChange={handleChange}
        placeholder='เลือกหน้าจอแดชบอร์ด'
        searchable={false}
      />
    </div>
  );
}
