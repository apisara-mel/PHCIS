import React, { useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { FilterDropdown } from '@/components/forms/FilterTag';
import { DASHBOARD_NAV_LINKS } from '@/components/dashboard/DashboardSubNav';
import {
  DASHBOARD_LAYOUTS,
  WIDGET_TYPES,
  WIDGET_DATASETS,
  WIDGET_TYPE_DATASETS,
  WIDGET_DEFAULT_SPAN,
  listDashboardTemplates,
  saveDashboardTemplate,
  widgetLabel,
} from '@/data/dashboardTemplates';
import ConsentDashboardTemplatePopup from '@/pages/consent/ConsentDashboardTemplatePopup';
import SuccessPopup from '@/components/popup/SuccessPopup';

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

/* ตัวสลับเป็น "ชิป" ชุดเดียวกับตัวกรองซ้ายมือ (วัน:/ปีงบ:) ไม่ใช่ช่อง Select
   ฝั่งขวาอีกต่อไป — มติผู้ใช้ 27 ส.ค. 69 ("ย้าย template มาไว้ด้านซ้าย และ
   สร้างเป็น Filter Tag") ขนาดจึงล็อกที่ `lg` (40px) ให้เท่าชิปตัวอื่นในแถว */
const TAG_SIZE_FOR_CONTROL = { sm: 'lg', md: 'lg', lg: 'lg' };

/** ค่า dropdown ของหน้าจอมาตรฐาน — ใช้ตอนหน้าอื่นบอกว่าตัวเองคือหน้าไหน */
export const screenValue = (key) => `${SCREEN_VALUE_PREFIX}${key}`;

export default function DashboardTemplateSwitcher({
  /** ค่าที่เลือกอยู่ — `screenValue('overview')` หรือ id ของเทมเพลตที่สร้างเอง */
  value,
  /** เรียกเมื่อผู้ใช้เลือกเทมเพลตที่สร้างเอง (เฉพาะหน้า /dashboard ที่เรนเดอร์ได้) */
  onSelectTemplate,
  /** override การเลือก "สร้างเทมเพลทใหม่" — ปกติไม่ต้องส่ง ตัวสลับเปิดป๊อปอัป
      ตัวสร้างให้เอง (แบบเดียวกับแดชบอร์ดระบบจัดการความยินยอม) */
  onCreate,
  /** เรียกหลังบันทึก/ลบเทมเพลตในป๊อปอัป — หน้าที่ render การ์ดตามเทมเพลตใช้
      รีเฟรชรายการและสลับไปใช้ตัวที่เพิ่งบันทึก */
  onApply,
  /** ทะเบียนเทมเพลตล่าสุด — ส่งเข้ามาเพื่อให้ลิสต์อัปเดตทันทีหลังบันทึก */
  templates,
  /** ขนาดชิป — ตั้งให้ตรงกับตัวกรองอื่นในแถวเดียวกันของแต่ละหน้า */
  size = 'lg',
}) {
  const history = useHistory();
  const [creatorOpen, setCreatorOpen] = useState(false);
  const [savedTemplate, setSavedTemplate] = useState(null);
  const custom = useMemo(
    () => (templates || listDashboardTemplates()).filter((t) => !t.locked),
    [templates],
  );

  const options = useMemo(() => ([
    { value: CREATE_VALUE, label: 'สร้างเทมเพลทใหม่', leadingIcon: 'dashboard_customize' },
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
      else setCreatorOpen(true);
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
    <>
      <FilterDropdown
        size={TAG_SIZE_FOR_CONTROL[size] || 'lg'}
        prefix='Template:'
        leadingIcon='dashboard'
        options={options}
        value={value}
        onChange={handleChange}
        placeholder='เลือกหน้าจอแดชบอร์ด'
        /* ชิปนี้มีค่าเสมอ — ปล่อยให้เดาสถานะเองจะเป็นสีขาวตอนค่าที่เลือกบังเอิญ
           เป็นตัวแรกในลิสต์ (ซึ่งคือคำสั่ง "สร้างเทมเพลทใหม่") */
        active={Boolean(value)}
      />

      {/* ตัวสร้างเทมเพลต — เปิดในหน้าเดิม ไม่พาผู้ใช้ออกไปไหน (pattern เดียวกับ
          แดชบอร์ดของระบบจัดการความยินยอม) ทะเบียนเต็มยังอยู่ที่จัดการระบบ */}
      <ConsentDashboardTemplatePopup
        open={creatorOpen}
        onClose={() => setCreatorOpen(false)}
        layouts={DASHBOARD_LAYOUTS}
        widgetTypes={WIDGET_TYPES}
        datasets={WIDGET_DATASETS}
        typeDatasets={WIDGET_TYPE_DATASETS}
        defaultSpan={WIDGET_DEFAULT_SPAN}
        fallbackDataset='phcis'
        onSaveTemplate={saveDashboardTemplate}
        /* การ์ดจริงของหน้านี้ผูกกับ state ของหน้าแดชบอร์ด เรนเดอร์นอกหน้าไม่ได้
           ตัวอย่างในขั้นจัดวางจึงเป็นกล่องชื่อการ์ด ไม่ใช่กราฟจริง */
        renderPreview={(w) => (
          <span
            className='flex items-center justify-center w-full h-full text-center'
            style={{
              minHeight: 'var(--dim-size-1900, 112px)',
              borderRadius: 'var(--dim-radius-300)',
              border: 'var(--dim-stroke-100) dashed var(--border-brandPrimary-quaternary)',
              background: 'var(--surface-brandPrimary-quaternary)',
              color: 'var(--text-content-secondary)',
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-xs)',
              paddingTop: 'var(--dim-space-300)',
              paddingBottom: 'var(--dim-space-300)',
              paddingLeft: 'var(--dim-space-200)',
              paddingRight: 'var(--dim-space-200)',
            }}
          >
            {w.title || widgetLabel(w.type)}
          </span>
        )}
        onSaved={(result) => {
          onApply?.(result);
          if (result?.name) setSavedTemplate(result);
        }}
      />

      <SuccessPopup
        open={Boolean(savedTemplate)}
        onClose={() => setSavedTemplate(null)}
        buttonLabel='ไปที่แดชบอร์ด'
        title={savedTemplate?.isEdit
          ? `บันทึกการแก้ไข “${savedTemplate?.name}” สำเร็จ`
          : `สร้างเทมเพลต “${savedTemplate?.name}” สำเร็จ`}
        description='เลือกใช้ได้จากช่อง Template บนหัวหน้าแดชบอร์ด'
      />
    </>
  );
}
