import React from 'react';
import FilterDateTag from '@/components/forms/FilterDateTag';
import { FilterDropdown } from '@/components/forms/FilterTag';
import ClearFiltersTag from '@/components/forms/ClearFiltersTag';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import { ButtonSizeAliasProvider } from '@/components/button/ButtonSizeAliasContext';
import Topic from '@/components/topic/Topic';
import DashboardTemplateSwitcher from '@/components/dashboard/DashboardTemplateSwitcher';
import {
  FISCAL_YEAR_OPTIONS,
  fiscalYearDateFilter,
  fiscalYearOf,
} from '@/pages/dashboard/dashboardReportKit';

/* PHCIS | หัวหน้าจอแดชบอร์ด — "ต้นแบบเดียว" ของทุกหน้าแดชบอร์ดในระบบ
   (มติผู้ใช้ 27 ส.ค. 69: "สร้างเป็น component สำหรับ header ของหน้า Dashboard
   และ apply ไปใช้กับ Dashboard ทุกหน้า · สั่งเปลี่ยนที่นึง ที่อื่นต้องเปลี่ยนตาม")

   ════════ สเปกหัวหน้าจอ (แก้ที่นี่ที่เดียว ทุกหน้าเปลี่ยนตาม) ════════

     [ ชื่อหน้า ]  [Template: …▾] [วัน: …▾] [ปีงบ: …▾] [ตัวกรองเฉพาะหน้า] [ล้างตัวกรอง]
                                                              ⟵ ยืดเต็ม ⟶  [ ปุ่มเฉพาะหน้า ]

     • ทุกตัวกรองเป็น **FilterTag ชิป** ขนาด lg (40px) เรียงห่างกัน space-200
     • **Template เป็นชิปตัวแรกเสมอ** — มันเลือก "หน้าจอไหน" จึงอยู่ชุดเดียวกับ
       ตัวกรอง ไม่ใช่ปุ่มคำสั่งฝั่งขวา (เดิมเป็น <Select> ฝั่งขวา — ย้ายแล้ว)
     • รายการแรกในลิสต์ Template = คำสั่ง "สร้างเทมเพลทใหม่" (ไม่มีปุ่มแยก)
     • ฝั่งขวามีได้เฉพาะ *ปุ่มคำสั่ง* ของหน้านั้น และ **สูงเท่ากันทุกหน้า (36px)**
       บังคับด้วย <ButtonSizeAliasProvider size='sm'> เหมือนที่ <SubHeader> ทำ
       กับแถวชื่อหน้า — ไม่ว่าหน้าไหนจะส่ง `size` อะไรมาก็ตาม
     • ปุ่ม "นำส่งออกรายงาน" ใช้ <DashboardExportButton> เท่านั้น ห้ามประกอบเอง

   เคย drift มาแล้ว: หน้าที่ใช้ <QueuePageShell> ได้ density contract จาก
   <SubHeader> อัตโนมัติ แต่ /dashboard ประกอบแถบเอง ปุ่มจึงสูง 40px ไม่เท่าใคร

   ห้ามหน้าไหนประกอบแถบชิปนี้เอง — ทุกหน้าเรียกผ่าน component นี้เท่านั้น
   ผู้ใช้ทั้งสามระบบ: แดชบอร์ด PHCIS (§1.20) · จัดการระบบ · จัดการความยินยอม
   สามระบบมีทะเบียนเทมเพลตคนละชุด จึงส่ง `templateOptions` + `onSelectTemplate`
   ของตัวเองเข้ามาแทนลิสต์มาตรฐาน 5 หน้าจอของ PHCIS ที่ switcher ใช้เป็นค่าตั้งต้น

   แยกเป็นสามชิ้นเพราะหน้าในกลุ่มนี้มีสองทรง:
     • หน้าที่ใช้ <QueuePageShell> — ส่ง <DashboardHeaderFilters> เข้า `afterTitle`
       และ <DashboardHeaderActions> เข้า `actions`
     • หน้าภาพรวมโรงพยาบาลที่ประกอบ layout เอง — ใช้ <DashboardPageHeader> ทั้งแถบ */

/** แถบชิปซ้ายมือตามสเปกด้านบน — Template → วัน → ปีงบ → เฉพาะหน้า → ล้างตัวกรอง
    · ปีงบเซ็ตช่วงวันให้ ไม่ใช่ state แยก */
export const DashboardHeaderFilters = ({
  dateFilter,
  onDateFilterChange,
  defaultQuick = 'thisyear',
  templateValue,
  templates,
  onSelectTemplate,
  onApplyTemplate,
  /** ระบบที่มีทะเบียนเทมเพลตของตัวเอง (จัดการระบบ / ความยินยอม) ส่งลิสต์ของตัวเอง
      เข้ามา — ไม่ส่ง = ใช้ลิสต์มาตรฐาน 5 หน้าจอของแดชบอร์ด PHCIS */
  templateOptions,
  /** เรียกเมื่อเลือก "สร้างเทมเพลทใหม่" — ไม่ส่ง = switcher เปิด wizard ให้เอง */
  onCreateTemplate,
  switcherSize = 'lg',
  /** ปิดชิปปีงบเฉพาะหน้าที่ไม่ได้มองข้อมูลเป็นรอบปีงบประมาณ */
  showFiscalYear = true,
  /** ชิป "ล้างตัวกรอง" — ส่ง onClearFilters มาถึงจะแสดง */
  onClearFilters,
  clearActive = false,
  /** ตัวกรองเฉพาะหน้า (เช่น `คลินิก:`) วางต่อท้ายชุดมาตรฐาน */
  children,
}) => (
  <span className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
    <DashboardTemplateSwitcher
      size={switcherSize}
      value={templateValue}
      templates={templates}
      options={templateOptions}
      onSelectTemplate={onSelectTemplate}
      onCreate={onCreateTemplate}
      onApply={onApplyTemplate}
    />
    <FilterDateTag
      prefix='วัน:'
      value={dateFilter}
      onChange={onDateFilterChange}
      defaultQuick={defaultQuick}
    />
    {showFiscalYear && (
      <FilterDropdown
        prefix='ปีงบ:'
        options={FISCAL_YEAR_OPTIONS}
        value={fiscalYearOf(dateFilter)}
        onChange={(be) => onDateFilterChange?.(fiscalYearDateFilter(be))}
        /* ชิปนี้มีค่าเสมอเมื่อช่วงวันตรงรอบปีงบ — บังคับสถานะ selected ไม่งั้น
           ค่า default ที่บังเอิญเป็นตัวแรกในลิสต์จะทำให้ชิปเป็นสีขาว */
        active={Boolean(fiscalYearOf(dateFilter))}
      />
    )}
    {children}
    {onClearFilters && <ClearFiltersTag active={clearActive} onClear={onClearFilters} />}
  </span>
);

/** ขนาดปุ่มมาตรฐานของหัวหน้าจอแดชบอร์ด — ตรงกับ density contract ของ
    <SubHeader> (36px) ที่หน้าซึ่งใช้ <QueuePageShell> ได้อยู่แล้ว */
export const DASHBOARD_HEADER_BUTTON_SIZE = 'sm';

/** ปุ่ม "นำส่งออกรายงาน" มาตรฐาน — ทุกหน้าแดชบอร์ดต้องเรียกตัวนี้ ไม่ประกอบเอง
    ขนาด/ไอคอน/ข้อความจึงเท่ากันหมด · `menu` = เป็นปุ่มเปิด dropdown (มี chevron) */
export const DashboardExportButton = ({
  label = 'นำส่งออกรายงาน',
  menu = false,
  open = false,
  onClick,
  ...rest
}) => (
  <NeutralSubdueButton
    size={DASHBOARD_HEADER_BUTTON_SIZE}
    leadingIcon='ios_share'
    trailingIcon={menu ? (open ? 'expand_less' : 'expand_more') : undefined}
    onClick={onClick}
    {...rest}
  >
    {label}
  </NeutralSubdueButton>
);

/** ฝั่งขวา — ปุ่มเฉพาะหน้าเท่านั้น (Template ย้ายไปฝั่งซ้ายแล้ว)
    ตัวนี้ถูกส่งเข้า slot `actions` ของ <QueuePageShell> ซึ่งอยู่ใน <SubHeader>
    อยู่แล้ว จึงได้ density contract 36px มาเอง ไม่ต้องบังคับซ้ำ */
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
        {/* แถบนี้ไม่ได้อยู่ใน <SubHeader> จึงต้องครอบ density contract เอง ไม่งั้น
            ปุ่มฝั่งขวาสูง 40px ขณะที่หน้าอื่นได้ 36px (มติผู้ใช้ 27 ส.ค. 69) */}
        <ButtonSizeAliasProvider size={DASHBOARD_HEADER_BUTTON_SIZE}>
          <div className='flex items-center shrink-0' style={{ gap: 'var(--dim-space-300)' }}>
            <DashboardHeaderActions>{actions}</DashboardHeaderActions>
          </div>
        </ButtonSizeAliasProvider>
      </div>
    </div>
  );
}
