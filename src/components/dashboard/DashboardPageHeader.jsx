import React from 'react';
import FilterDateTag from '@/components/forms/FilterDateTag';
import { FilterDropdown } from '@/components/forms/FilterTag';
import Topic from '@/components/topic/Topic';
import DashboardTemplateSwitcher from '@/components/dashboard/DashboardTemplateSwitcher';
import {
  FISCAL_YEAR_OPTIONS,
  fiscalYearDateFilter,
  fiscalYearOf,
} from '@/pages/dashboard/dashboardReportKit';

/* PHCIS | แดชบอร์ด — หัวหน้าจอชุดเดียวกันทุกหน้าในกลุ่ม §1.20
   (มติผู้ใช้ 27 ส.ค. 69: "สร้างเป็น component สำหรับ header ของหน้า Dashboard
   และ apply ไปใช้กับ Dashboard ทุกหน้า")

   ซ้าย  = ชื่อหน้า + Template → วัน → ปีงบประมาณ (FilterTag ทั้งหมด)
   ขวา   = ปุ่มเฉพาะหน้า

   Template ย้ายจากฝั่งขวามาเป็นชิปตัวแรกฝั่งซ้าย (มติผู้ใช้ 27 ส.ค. 69) —
   มันเลือก "หน้าจอไหน" เหมือนตัวกรองเลือกขอบเขต ไม่ใช่ปุ่มคำสั่ง

   แยกเป็นสามชิ้นเพราะหน้าในกลุ่มนี้มีสองทรง:
     • หน้าที่ใช้ <QueuePageShell> — ส่ง <DashboardHeaderFilters> เข้า `afterTitle`
       และ <DashboardHeaderActions> เข้า `actions`
     • หน้าภาพรวมโรงพยาบาลที่ประกอบ layout เอง — ใช้ <DashboardPageHeader> ทั้งแถบ */

/** ตัวกรองซ้ายมือ — Template แล้ววัน แล้วปีงบประมาณ · ปีงบเซ็ตช่วงวันให้
    ไม่ใช่ state แยก */
export const DashboardHeaderFilters = ({
  dateFilter,
  onDateFilterChange,
  defaultQuick = 'thisyear',
  /** ชุดเดียวกับที่เคยส่งให้ <DashboardHeaderActions> — ย้ายมาฝั่งซ้ายแล้ว */
  templateValue,
  templates,
  onSelectTemplate,
  onApplyTemplate,
  switcherSize = 'lg',
  /** ตัวกรองเฉพาะหน้า (เช่น `คลินิก:`) วางต่อท้ายชุดมาตรฐาน */
  children,
}) => (
  <span className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
    <DashboardTemplateSwitcher
      size={switcherSize}
      value={templateValue}
      templates={templates}
      onSelectTemplate={onSelectTemplate}
      onApply={onApplyTemplate}
    />
    <FilterDateTag
      prefix='วัน:'
      value={dateFilter}
      onChange={onDateFilterChange}
      defaultQuick={defaultQuick}
    />
    <FilterDropdown
      prefix='ปีงบ:'
      leadingIcon='event'
      options={FISCAL_YEAR_OPTIONS}
      value={fiscalYearOf(dateFilter)}
      onChange={(be) => onDateFilterChange?.(fiscalYearDateFilter(be))}
      /* ชิปนี้มีค่าเสมอเมื่อช่วงวันตรงรอบปีงบ — บังคับสถานะ selected ไม่งั้น
         ค่า default ที่บังเอิญเป็นตัวแรกในลิสต์จะทำให้ชิปเป็นสีขาว */
      active={Boolean(fiscalYearOf(dateFilter))}
    />
    {children}
  </span>
);

/** ฝั่งขวา — ปุ่มเฉพาะหน้าเท่านั้น (Template ย้ายไปฝั่งซ้ายแล้ว) ยังคงไว้เป็น
    จุดต่อเดียวของแถวปุ่ม เพื่อให้ทุกหน้าในกลุ่มประกอบหัวหน้าจอเหมือนกัน */
export const DashboardHeaderActions = ({ children }) => <>{children}</>;

/** แถบหัวเต็มสำหรับหน้าที่ไม่ได้ใช้ QueuePageShell */
export default function DashboardPageHeader({
  title,
  dateFilter,
  onDateFilterChange,
  defaultQuick,
  templateValue,
  templates,
  onSelectTemplate,
  onApplyTemplate,
  switcherSize = 'lg',
  /** ตัวกรองเฉพาะหน้า (ต่อท้ายชุดมาตรฐานฝั่งซ้าย) */
  filters,
  /** ปุ่มเฉพาะหน้า (ฝั่งขวา) */
  actions,
}) {
  return (
    <div className='bg-surface-card px-6 pt-6 pb-4 border-b-0 shadow-header flex flex-col gap-4'>
      <div className='flex items-center flex-wrap w-full min-w-0' style={{ gap: 'var(--dim-space-400)' }}>
        <div className='min-w-0'>
          <Topic
            hierarchy='tertiary'
            title={title}
            showSubText={false}
            showBadge={false}
            showChevron={false}
            showLeadingIcon={false}
            showSuccess={false}
          />
        </div>
        <DashboardHeaderFilters
          dateFilter={dateFilter}
          onDateFilterChange={onDateFilterChange}
          defaultQuick={defaultQuick}
          templateValue={templateValue}
          templates={templates}
          onSelectTemplate={onSelectTemplate}
          onApplyTemplate={onApplyTemplate}
          switcherSize={switcherSize}
        >
          {filters}
        </DashboardHeaderFilters>
        <div className='flex-1' />
        <DashboardHeaderActions>{actions}</DashboardHeaderActions>
      </div>
    </div>
  );
}
