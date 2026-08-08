import React, { useMemo, useState } from 'react';
import Table from '@/components/table/Table';
import InputField from '@/components/forms/InputField';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import { RIGHTS_GROUPS, formatBaht, visitInstant } from '@/data/financePaymentPrototype';

/* Audit cashier — TOR §1.5 (คู่มือ chapter อ้างอิง "Audit cashier"):
   ตรวจสอบยอดชำระแล้ว/ยอดค้างชำระ แยกตามสิทธิ, และค้นหาวันที่+สิทธิที่
   ผู้รับบริการมาใช้ครั้งล่าสุดจาก HN.

   Uses the shared <Table> — same component/style as the queue tables
   elsewhere in this module (and src/pages/opd/QueuePage.jsx) — rather
   than a raw <table>, per house style. */

const CashierAuditSection = ({ queue }) => {
  const [hn, setHn] = useState('');
  const [rightsQuery, setRightsQuery] = useState('');

  const byRights = useMemo(() => {
    /* Initialize every rights group up front (not just ones that appear
       in `queue`) so a group with zero rows still shows as ฿0 instead of
       silently disappearing from the table. */
    const groups = Object.fromEntries(
      Object.values(RIGHTS_GROUPS).map((rights) => [rights.key, { rights, paid: 0, paidCount: 0, outstanding: 0, outstandingCount: 0 }]),
    );
    queue.forEach((r) => {
      const key = r.rights.key;
      if (r.status === 'paid') { groups[key].paid += r.amountReceived || 0; groups[key].paidCount += 1; }
      if (r.status === 'pending') { groups[key].outstanding += r.amountDue; groups[key].outstandingCount += 1; }
    });
    return Object.values(groups);
  }, [queue]);

  /* ค้นหาสิทธิที่มีอยู่ในระบบได้ — TOR §1.8.7.4. Narrows the summary table
     to rights groups whose label matches the query, instead of always
     showing the full fixed 4-group list. */
  const visibleRights = useMemo(() => {
    const q = rightsQuery.trim().toLowerCase();
    if (!q) return byRights;
    return byRights.filter((g) => g.rights.label.toLowerCase().includes(q) || g.rights.short.toLowerCase().includes(q));
  }, [byRights, rightsQuery]);

  /* "วันที่และสิทธิที่มาใช้ครั้งล่าสุด" — TOR §1.8.7.3. Take the newest visit
     among the matches, not whichever row happens to sit first in the queue:
     one HN can hold several visits once this is wired to real data. */
  const lookupResult = useMemo(() => {
    const q = hn.trim();
    if (!q) return null;
    const matches = queue.filter((r) => r.hn.includes(q) || r.patient.shortName.includes(q));
    if (matches.length === 0) return 'not-found';
    return matches.reduce((latest, r) => (visitInstant(r) > visitInstant(latest) ? r : latest));
  }, [queue, hn]);

  const visitCount = useMemo(() => {
    const q = hn.trim();
    if (!q) return 0;
    return queue.filter((r) => r.hn.includes(q) || r.patient.shortName.includes(q)).length;
  }, [queue, hn]);

  const columns = [
    { key: 'rights', label: 'สิทธิการรักษา', flex: true, minWidth: 160, render: (g) => <ColorfulBadge badgeStyle={g.rights.badge} size='small'>{g.rights.label}</ColorfulBadge> },
    { key: 'paidCount', label: 'ชำระแล้ว (รายการ)', align: 'right', render: (g) => g.paidCount },
    { key: 'paid', label: 'ยอดชำระแล้ว', align: 'right', render: (g) => <span style={{ fontWeight: 'var(--type-weight-bold)' }}>{formatBaht(g.paid)}</span> },
    { key: 'outstandingCount', label: 'ค้างชำระ (รายการ)', align: 'right', render: (g) => g.outstandingCount },
    { key: 'outstanding', label: 'ยอดค้างชำระ', align: 'right', render: (g) => <span style={{ fontWeight: 'var(--type-weight-bold)', color: 'var(--text-statusbadge-warning, #B25E09)' }}>{formatBaht(g.outstanding)}</span> },
  ];

  return (
    <div className='flex flex-col' style={{ gap: 'var(--dim-space-500)' }}>
      <div className='flex flex-col' style={{ gap: 'var(--dim-space-200)' }}>
        <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)', fontWeight: 'var(--type-weight-bold)' }}>
          ยอดชำระแล้ว / ยอดค้างชำระ แยกตามสิทธิ
        </span>
        <InputField label='ค้นหาสิทธิที่มีอยู่ในระบบ' value={rightsQuery} onChange={setRightsQuery} placeholder='เช่น บัตรทอง หรือ ประกันสังคม' />
        <Table columns={columns} rows={visibleRights} rowKey={(g) => g.rights.key} emptyMessage='ไม่พบสิทธิที่ตรงกับคำค้นหา' />
      </div>

      <div className='flex flex-col' style={{ gap: 'var(--dim-space-200)' }}>
        <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)', fontWeight: 'var(--type-weight-bold)' }}>
          ตรวจสอบวันที่และสิทธิที่มาใช้บริการล่าสุด
        </span>
        <InputField label='ค้นหา HN หรือชื่อผู้ป่วย' value={hn} onChange={setHn} placeholder='เช่น 67-00001 หรือ สุดา' />
        {lookupResult === 'not-found' && (
          <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)', color: 'var(--text-content-tertiary)' }}>ไม่พบข้อมูล</span>
        )}
        {lookupResult && lookupResult !== 'not-found' && (
          <div
            className='flex items-center justify-between'
            style={{ background: 'var(--surface-brandPrimary-quaternary, #F4FBF8)', borderRadius: 'var(--dim-radius-300)', padding: 'var(--dim-space-300)' }}
          >
            <div className='flex flex-col'>
              <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)', fontWeight: 'var(--type-weight-medium)' }}>{lookupResult.patient.shortName} · HN {lookupResult.hn}</span>
              <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
              มาใช้บริการล่าสุด {lookupResult.visitDate} เวลา {lookupResult.visitTime} น.
              {visitCount > 1 && ` · พบ ${visitCount} ครั้งในระบบ`}
            </span>
            </div>
            <ColorfulBadge badgeStyle={lookupResult.rights.badge} size='small'>{lookupResult.rights.label}</ColorfulBadge>
          </div>
        )}
      </div>
    </div>
  );
};

export default CashierAuditSection;
