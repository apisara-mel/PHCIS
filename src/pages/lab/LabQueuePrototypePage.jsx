import React, { useState } from 'react';
import QueuePageShell from '@/templates/QueuePageShell';
import { LAB_ORDERS } from '@/data/labOrdersPrototype';
import LabQueueVariantB, { LAB_TABS } from '@/pages/lab/variants/LabQueueVariantB';

/* PROTOTYPE — wipe me. `/prototype/lab` throwaway route.

   Question: "what should the lab module's (ห้องปฏิบัติการ, Sidebar key
   `lab`, icon `biotech`) main queue view look like?" — see NOTES.md next
   to this file for the full writeup.

   Verdict: table + status filter (Variant B), with a search box above the
   table and click-to-open detail panel (ported from Variant C) — picked
   over the Kanban-columns and list+detail-only directions. Variants A/C
   and the variant switcher have been removed; this now renders the winner
   directly.

   `lab` is a Sidebar stub (src/components/layout/Sidebar.jsx:58) with no
   `path`, so this is sub-shape B (new throwaway route) per the prototype
   skill — there's no existing lab page to host it inside. Reuses the real
   QueuePageShell chrome (sidebar/header) so it butts up against the real
   app instead of floating in a vacuum. The Sidebar `lab` stub is left
   untouched — this prototype is reachable only via the direct URL. */

const breadcrumb = ['ห้องปฏิบัติการ (Lab)'];

const SUMMARY_CARDS = [
  { key: 'collected', label: 'เก็บตัวอย่างแล้ว', value: LAB_ORDERS.filter((o) => o.status === 'collected').length, indicator: 'รอนำเข้าวิเคราะห์', color: 'info', icon: 'science' },
  { key: 'analysing', label: 'กำลังวิเคราะห์', value: LAB_ORDERS.filter((o) => o.status === 'analysing').length, indicator: 'อยู่ระหว่างดำเนินการ', color: 'inprogress', icon: 'hourglass_top' },
  { key: 'reported', label: 'รายงานผลแล้ว', value: LAB_ORDERS.filter((o) => o.status === 'reported').length, indicator: 'วันนี้', color: 'positive', icon: 'check_circle' },
  { key: 'critical', label: 'ค่าวิกฤต (Critical)', value: LAB_ORDERS.filter((o) => o.critical).length, indicator: 'แจ้งแพทย์แล้ว', color: 'destructive', icon: 'warning' },
];

const LabQueuePrototypePage = () => {
  const [activeTab, setActiveTab] = useState('all');

  return (
    <QueuePageShell
      activeKey='lab'
      breadcrumb={breadcrumb}
      title='ห้องปฏิบัติการ (Lab)'
      summaryCards={SUMMARY_CARDS}
      summaryFlushUnderSubHeader={false}
      tabs={LAB_TABS}
      activeTab={activeTab}
      onTabChange={setActiveTab}
    >
      <div
        className='flex flex-col flex-1 min-w-0'
        style={{
          paddingTop: 'var(--dim-space-600)',
          paddingLeft: 'var(--dim-space-600)',
          paddingRight: 'var(--dim-space-600)',
          paddingBottom: 'var(--dim-space-1200)',
          gap: 'var(--dim-space-600)',
        }}
      >
        <LabQueueVariantB activeTab={activeTab} onActiveTabChange={setActiveTab} />
      </div>
    </QueuePageShell>
  );
};

export default LabQueuePrototypePage;
