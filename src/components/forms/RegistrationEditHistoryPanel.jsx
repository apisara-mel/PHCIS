import React from 'react';
import Table from '@/components/table/Table';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import { getRegistrationAuditEntries } from '@/data/registrationForm';

/* MIH RegistrationEditHistoryPanel — audit log for the Registration
   form (Figma 2373:119045 "ประวัติการแก้ไขข้อมูล"). Opened from the
   SubHeader action button as a popup (formerly a second sub-tab).
   Read-only: each row pairs OLD (struck-through) with NEW value. */

/* Map each registration step to a ColorfulBadge tone so the หมวด column
   reads as a categorised tag rather than a plain string. Tones mirror
   the step rhythm (purple for ส่วนตัว, teal for ที่อยู่, etc.). */
const STEP_TONE = {
  ส่วนตัว: 'purple',
  ที่อยู่:  'teal',
  ติดต่อ:  'blue',
  สิทธิ:   'orange',
  Flag:    'pink',
  เวชระเบียน: 'indigo',
};

const EDIT_HISTORY_MOCK = [
  /* TOR 1.1.1.15 — legacy "บันทึกการแก้ไขชื่อสกุล" (manual §2.3): typed
     ชื่อ-สกุล change record with ค่าเดิม → ค่าใหม่ + ผู้บันทึก + วันเวลา. */
  {
    id: 'e-009',
    changedAt: '12 มิถุนายน 2569 · 10:04',
    changedBy: 'น.ส.พิมพ์ใจ ลงทะเบียน',
    step: 'ส่วนตัว',
    field: 'ชื่อ-นามสกุล',
    oldValue: 'นางสาวทักษพร ศรีสมบูรณ์',
    newValue: 'นางทักษพร ขำใจ (สมรส — เปลี่ยนคำนำหน้าและนามสกุล)',
  },
  {
    id: 'e-008',
    changedAt: '6 พฤษภาคม 2569 · 09:21',
    changedBy: 'พญ.สมหญิง รักษ์ดี',
    step: 'ติดต่อ',
    field: 'เบอร์โทรศัพท์',
    oldValue: '081-234-5678',
    newValue: '081-234-9999',
  },
  {
    id: 'e-007',
    changedAt: '6 พฤษภาคม 2569 · 09:18',
    changedBy: 'พญ.สมหญิง รักษ์ดี',
    step: 'ติดต่อ',
    field: 'อีเมล',
    oldValue: 'somchai@example.com',
    newValue: 'somchai.m@example.com',
  },
  {
    id: 'e-006',
    changedAt: '6 พฤษภาคม 2569 · 09:15',
    changedBy: 'น.ส.พิมพ์ใจ ลงทะเบียน',
    step: 'ที่อยู่',
    field: 'ที่อยู่ปัจจุบัน',
    oldValue: '88/9 ถ.พหลโยธิน แขวงสามเสนใน เขตพญาไท กรุงเทพมหานคร',
    newValue: '99/12 ถ.ลาดพร้าว แขวงจอมพล เขตจตุจักร กรุงเทพมหานคร',
  },
  {
    id: 'e-005',
    changedAt: '4 พฤษภาคม 2569 · 14:02',
    changedBy: 'น.ส.พิมพ์ใจ ลงทะเบียน',
    step: 'Flag',
    field: 'แพ้ยา',
    oldValue: 'ไม่มี',
    newValue: 'Penicillin, Aspirin',
  },
  {
    id: 'e-004',
    changedAt: '3 พฤษภาคม 2569 · 10:46',
    changedBy: 'นพ.ณัฐวุฒิ บุญมี',
    step: 'สิทธิ',
    field: 'สิทธิการรักษา',
    oldValue: 'ชำระเงินเอง',
    newValue: 'ประกันสังคม',
  },
  {
    id: 'e-003',
    changedAt: '28 เมษายน 2569 · 16:30',
    changedBy: 'น.ส.พิมพ์ใจ ลงทะเบียน',
    step: 'ส่วนตัว',
    field: 'อาชีพ',
    oldValue: '—',
    newValue: 'พนักงานบริษัทเอกชน',
  },
  {
    id: 'e-002',
    changedAt: '28 เมษายน 2569 · 16:28',
    changedBy: 'น.ส.พิมพ์ใจ ลงทะเบียน',
    step: 'ส่วนตัว',
    field: 'การศึกษา',
    oldValue: '—',
    newValue: 'ปริญญาตรี',
  },
  {
    id: 'e-001',
    changedAt: '15 กุมภาพันธ์ 2569 · 08:50',
    changedBy: 'น.ส.พิมพ์ใจ ลงทะเบียน',
    step: 'ส่วนตัว',
    field: 'สถานภาพ',
    oldValue: 'โสด',
    newValue: 'สมรส',
  },
];

export const getRegistrationEditHistoryRows = () => [
  ...getRegistrationAuditEntries(),
  ...EDIT_HISTORY_MOCK,
];

const renderStep = (row) => (
  <ColorfulBadge style={STEP_TONE[row.step] || 'grey'} size='small' hierarchy='secondary'>
    {row.step}
  </ColorfulBadge>
);

const renderOldValue = (row) => (
  <span
    style={{
      color: 'var(--text-content-tertiary, #858C92)',
      textDecoration: 'line-through',
      fontFamily: 'var(--type-family-body)',
      fontSize: 'var(--type-size-sm)',
      lineHeight: 1.5,
    }}
  >
    {row.oldValue || '—'}
  </span>
);

const renderNewValue = (row) => (
  <span
    style={{
      color: 'var(--text-content-default, #363B3F)',
      fontFamily: 'var(--type-family-body)',
      fontWeight: 'var(--type-weight-medium)',
      fontSize: 'var(--type-size-sm)',
      lineHeight: 1.5,
    }}
  >
    {row.newValue || '—'}
  </span>
);

const COLUMNS = [
  { key: 'changedAt', label: 'วันเวลา',  width: 200,  sortable: true },
  { key: 'changedBy', label: 'ผู้แก้ไข', width: 200,  sortable: true },
  { key: 'step',      label: 'หมวด',     width: 128, sortable: true, render: renderStep },
  { key: 'field',     label: 'รายการ',   width: 192, sortable: true },
  { key: 'oldValue',  label: 'ค่าเดิม',  flex: 1, minWidth: 200, sortable: false, render: renderOldValue },
  { key: 'newValue',  label: 'ค่าใหม่',  flex: 1, minWidth: 200, sortable: false, render: renderNewValue },
];

const RegistrationEditHistoryPanel = ({ embedded = false }) => {
  /* TOR 1.1.1.15 / 1.1.1.5 — live session entries merge in front of mock,
     newest-first. Re-read on each open so fresh audit rows appear. */
  const rows = getRegistrationEditHistoryRows();

  if (embedded) {
    return (
      <Table
        columns={COLUMNS}
        rows={rows}
        emptyMessage='ยังไม่มีประวัติการแก้ไขข้อมูล'
      />
    );
  }

  return (
    <div
      className='flex flex-col w-full'
      style={{
        borderRadius: 'var(--dim-radius-500)',
        background: 'var(--surface-card-100)',
        boxShadow: 'var(--shadow-brand-drop-bottom-200)',
        padding: 'var(--dim-space-600)',
        gap: 'var(--dim-space-400)',
      }}
    >
      <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-300)' }}>
        <span style={{
          color: 'var(--text-content-default)',
          fontFamily: 'var(--type-family-heading-content)',
          fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
          fontSize: 'var(--type-size-base)',
        }}>
          ประวัติการแก้ไขข้อมูล
        </span>
        <span style={{
          color: 'var(--text-content-tertiary)',
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-sm)',
        }}>
          {rows.length} รายการ · เรียงจากใหม่ไปเก่า
        </span>
      </div>
      <Table
        columns={COLUMNS}
        rows={rows}
        emptyMessage='ยังไม่มีประวัติการแก้ไขข้อมูล'
      />
    </div>
  );
};

export default RegistrationEditHistoryPanel;
