import React, { useMemo, useState } from 'react';
import QueuePageShell from '@/templates/QueuePageShell';
import RightsCheckSection from '@/pages/rights/sections/RightsCheckSection';
import ClaimSubmitQueueSection from '@/pages/rights/sections/ClaimSubmitQueueSection';
import ClaimBillingSection from '@/pages/rights/sections/ClaimBillingSection';
import ClaimExportSection from '@/pages/rights/sections/ClaimExportSection';
import RightsSettingsSection from '@/pages/rights/sections/RightsSettingsSection';
import { RoleSwitcher, useRightsClaimTick } from '@/pages/rights/rightsUi';
import {
  RIGHTS_VISITS,
  RIGHTS_MASTER,
  DEDUCTION_TYPES,
  computeClaimTotals,
  formatBaht,
  submitStatusOf,
  getClaimRoleKey,
  setClaimRoleKey,
  getClaimRole,
  EXPORT_HISTORY,
  getRightsSection,
  setRightsSection,
} from '@/data/rightsClaimStore';

/* ระบบงานสิทธิและการเบิกจ่าย + Claim — TOR appendix ก §1.7.

   Structure mirrors src/pages/finance/FinancePaymentPage.jsx: one parent
   page owning QueuePageShell, with a section switcher in the sticky `tabs`
   slot and each functional area factored into src/pages/rights/sections/.
   Only two real routes exist (`/rights` and `/rights/submit/:visitId`) —
   sections are internal state, exactly like the finance module. If a later
   wave needs per-section deep links, the integrator can add a `?section=`
   query param without touching the sections themselves.

   Section → TOR mapping
     เช็คสิทธิ        §1.7.1.1 · §1.7.2.1 · §1.7.2.4 · §1.7.2.5
     ส่งเบิก          §1.7.3.1 (queue; the per-visit form is the detail route)
     เรียกเก็บ Claim   §1.7.4.1 – §1.7.4.9
     Export ส่งเบิก    §1.7.4.10 – §1.7.4.12
     ตั้งค่าสิทธิ       §1.7.5.1 – §1.7.5.5

   Deliberate overlap with src/pages/finance: finance already ships
   RightsAdjustmentSection + a single-CSV EclaimSection for its own TOR
   chapter (§1.5/§1.8). This module implements the full claim side (16 แฟ้ม /
   13 แฟ้ม / เบิกจ่ายตรง, รอบส่งเบิก, ตั้งค่าสิทธิ) in its own folder and never
   imports from finance — two CSV exporters exist on purpose.

   Everything is session-local mock (src/data/rightsClaimStore.js). Where a
   requirement needs a real backend to be honestly "done" (activation shared
   with Registration, user permissions), the UI says so on screen and the
   build manifest reports it as partial. */

const SECTIONS = [
  { key: 'check',    label: 'เช็คสิทธิ',        icon: 'verified_user' },
  { key: 'submit',   label: 'ส่งเบิก',          icon: 'fact_check' },
  { key: 'claim',    label: 'เรียกเก็บ Claim',  icon: 'request_quote' },
  { key: 'export',   label: 'Export ส่งเบิก',   icon: 'file_upload' },
  { key: 'settings', label: 'ตั้งค่าสิทธิ',      icon: 'tune' },
];

const breadcrumb = ['ระบบงานสิทธิและการเบิกจ่าย'];

const RightsClaimPage = () => {
  /* `tick` bumps on every store mutation. It has to sit in the dependency
     list of anything derived from the store, because the store mutates its
     arrays IN PLACE — the array reference never changes, so a useMemo keyed
     on `RIGHTS_VISITS` alone would keep serving pre-mutation numbers. */
  const tick = useRightsClaimTick();
  /* Restores the section the user drilled out of (see setRightsSection). */
  const [section, setSectionState] = useState(getRightsSection);
  const setSection = (key) => { setRightsSection(key); setSectionState(key); };
  const role = getClaimRole();

  const totals = useMemo(() => computeClaimTotals(RIGHTS_VISITS), [tick, section]);

  const submitCounts = useMemo(() => RIGHTS_VISITS.reduce((acc, v) => {
    const s = submitStatusOf(v);
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, { pending: 0, confirmed: 0, needsEdit: 0 }), [tick, section]);

  /* Summary cards follow the section — a claim-money strip above the
     ตั้งค่าสิทธิ table would just be noise. */
  const summaryCards = useMemo(() => {
    if (section === 'submit') {
      return [
        { key: 'pending',   label: 'รอตรวจสอบ',   value: submitCounts.pending,   indicator: 'คิวส่งเบิก',       color: 'info',        icon: 'hourglass_top' },
        { key: 'confirmed', label: 'ยืนยันแล้ว',   value: submitCounts.confirmed, indicator: 'พร้อมส่งเบิก',     color: 'positive',    icon: 'check_circle' },
        { key: 'needsEdit', label: 'ต้องแก้ไข',    value: submitCounts.needsEdit, indicator: 'ตีกลับให้แก้',     color: 'destructive', icon: 'error' },
        { key: 'all',       label: 'Close Visit ทั้งหมด', value: RIGHTS_VISITS.length, indicator: 'ในช่วงที่บันทึก', color: 'warning', icon: 'assignment_turned_in' },
      ];
    }
    if (section === 'claim') {
      return [
        { key: 'charge',      label: 'ค่าใช้จ่ายรวม',   value: formatBaht(totals.totalCharge),      indicator: `${totals.visitCount} ครั้งบริการ`, color: 'info',        icon: 'receipt_long' },
        { key: 'claim',       label: 'เรียกเก็บรวม',     value: formatBaht(totals.claimTotal),       indicator: 'ยอดที่ผู้เรียกเก็บรับผิดชอบ',       color: 'positive',    icon: 'request_quote' },
        { key: 'billed',      label: 'เรียกเก็บแล้ว',    value: formatBaht(totals.billedTotal),      indicator: 'รอบที่ส่งเบิกแล้ว',                color: 'warning',     icon: 'outbox' },
        { key: 'outstanding', label: 'ค้างชำระ (เงินสด)', value: formatBaht(totals.outstandingTotal), indicator: 'รอติดตามจากผู้รับบริการ',           color: 'destructive', icon: 'account_balance_wallet' },
      ];
    }
    if (section === 'export') {
      return [
        { key: 'ready',   label: 'ครั้งบริการที่ยืนยันแล้ว', value: submitCounts.confirmed,   indicator: 'พร้อมดึงข้อมูล',  color: 'positive', icon: 'verified' },
        { key: 'blocked', label: 'ยังยืนยันไม่ครบ',        value: submitCounts.pending + submitCounts.needsEdit, indicator: 'จะไม่ถูกดึงออกไป', color: 'warning', icon: 'pending_actions' },
        { key: 'history', label: 'ประวัติการดึงข้อมูล',     value: EXPORT_HISTORY.length,    indicator: 'ครั้งล่าสุดในระบบ', color: 'info',     icon: 'history' },
      ];
    }
    if (section === 'settings') {
      return [
        { key: 'rights',    label: 'สิทธิการรักษา',       value: RIGHTS_MASTER.filter((r) => r.active).length, indicator: `จาก ${RIGHTS_MASTER.length} รายการ`, color: 'info',     icon: 'verified_user' },
        { key: 'deduction', label: 'ประเภทการลดหย่อน',   value: DEDUCTION_TYPES.filter((d) => d.active).length, indicator: `จาก ${DEDUCTION_TYPES.length} รายการ`, color: 'positive', icon: 'percent' },
        { key: 'items',     label: 'รายการที่ผูกกับสิทธิ', value: RIGHTS_MASTER.reduce((s, r) => s + (r.items?.length || 0), 0), indicator: 'ทุกสิทธิรวมกัน', color: 'warning', icon: 'list_alt' },
      ];
    }
    /* check */
    return [
      { key: 'visits',  label: 'ครั้งบริการที่รอส่งเบิก', value: submitCounts.pending, indicator: 'จากคิว Close Visit', color: 'info',     icon: 'fact_check' },
      { key: 'rights',  label: 'สิทธิที่เปิดใช้งาน',       value: RIGHTS_MASTER.filter((r) => r.active).length, indicator: 'ตามตั้งค่าสิทธิ', color: 'positive', icon: 'verified_user' },
      { key: 'claim',   label: 'ยอดเรียกเก็บสะสม',       value: formatBaht(totals.claimTotal), indicator: 'ทุกครั้งบริการในระบบ', color: 'warning', icon: 'request_quote' },
    ];
  }, [section, submitCounts, totals]);

  const sectionTabs = SECTIONS.map((s) => ({ key: s.key, label: s.label, icon: s.icon }));

  return (
    <QueuePageShell
      activeKey='rights'
      breadcrumb={breadcrumb}
      title='สิทธิและการเบิกจ่าย'
      actions={<RoleSwitcher value={getClaimRoleKey()} onChange={setClaimRoleKey} />}
      summaryCards={summaryCards}
      summaryFlushUnderSubHeader={false}
      tabs={sectionTabs}
      activeTab={section}
      onTabChange={setSection}
    >
      <div
        className='flex flex-col flex-1 min-w-0'
        style={{
          paddingTop: 'var(--dim-space-600)',
          paddingRight: 'var(--dim-space-600)',
          paddingBottom: 'var(--dim-space-600)',
          paddingLeft: 'var(--dim-space-600)',
          gap: 'var(--dim-space-600)',
        }}
      >
        <div
          className='flex flex-col min-w-0'
          style={{
            gap: 'var(--dim-space-400)',
            background: 'var(--surface-card-100, #FFFFFF)',
            borderRadius: 'var(--dim-radius-300, 10px)',
            paddingTop: 'var(--dim-space-400)',
            paddingRight: 'var(--dim-space-400)',
            paddingBottom: 'var(--dim-space-400)',
            paddingLeft: 'var(--dim-space-400)',
          }}
        >
          {section === 'check'    && <RightsCheckSection role={role} />}
          {section === 'submit'   && <ClaimSubmitQueueSection role={role} />}
          {section === 'claim'    && <ClaimBillingSection role={role} />}
          {section === 'export'   && <ClaimExportSection role={role} />}
          {section === 'settings' && <RightsSettingsSection role={role} />}
        </div>
      </div>
    </QueuePageShell>
  );
};

export default RightsClaimPage;
