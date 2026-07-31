import React, { useMemo, useState } from 'react';
import Table, { EllipsisText } from '@/components/table/Table';
import PrimarySearch from '@/components/search/PrimarySearch';
import { FilterDropdown } from '@/components/forms/FilterTag';
import FilterDateTag from '@/components/forms/FilterDateTag';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import {
  PAYMENT_METHODS, RIGHTS_GROUPS, CHARGE_CATEGORIES,
  formatBaht, timeToMinutes, matchesDateFilter,
} from '@/data/financePaymentPrototype';

/* ทะเบียนรายรับ (Revenue Register) — TOR §1.5.5. Read-only ledger of every
   paid receipt, with a per-payment-method subtotal strip so the cashier
   can eyeball today's cash vs. card vs. QR vs. transfer split before
   handing off to §2.2's daily cutoff.

   Search (HN/ชื่อ-สกุล, §1.8.1.12) + filters (สิทธิ / ประเภทรายการ / วันที่)
   and print per TOR §1.5.5.2 / §1.5.5.4. */

const FILTER_DEFAULTS = { rights: 'all', category: 'all', dateValue: { quick: 'today' } };

const RevenueRegisterSection = ({ queue }) => {
  const [q, setQ] = useState('');
  const [filters, setFilters] = useState(FILTER_DEFAULTS);
  const setFilter = (key) => (val) => setFilters((f) => ({ ...f, [key]: val }));

  const paidRows = useMemo(() => {
    let rows = queue.filter((r) => r.status === 'paid');
    if (q.trim()) {
      const query = q.trim().toLowerCase();
      rows = rows.filter((r) => r.hn.toLowerCase().includes(query) || r.patient.shortName.toLowerCase().includes(query));
    }
    if (filters.rights !== 'all') rows = rows.filter((r) => r.rights.key === filters.rights);
    if (filters.category !== 'all') rows = rows.filter((r) => r.items.some((i) => i.category === filters.category));
    rows = rows.filter((r) => matchesDateFilter(r.visitDate, filters.dateValue));
    return rows.sort((a, b) => timeToMinutes(a.visitTime) - timeToMinutes(b.visitTime));
  }, [queue, q, filters]);

  const methodTotals = useMemo(() => PAYMENT_METHODS.map((m) => ({
    ...m,
    total: paidRows.filter((r) => r.paymentMethod === m.key).reduce((s, r) => s + (r.amountReceived || 0), 0),
    count: paidRows.filter((r) => r.paymentMethod === m.key).length,
  })), [paidRows]);

  const grandTotal = paidRows.reduce((s, r) => s + (r.amountReceived || 0), 0);

  const columns = [
    {
      key: 'visitTime', label: 'วันที่และเวลา', width: 150,
      render: (row) => (
        <div className='flex flex-col'>
          <span>{row.visitDate}</span>
          <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>{row.visitTime} น.</span>
        </div>
      ),
    },
    { key: 'center', label: 'ศูนย์/คลินิก', width: 140 },
    { key: 'receiptNo', label: 'เลขที่ใบเสร็จ', width: 140 },
    {
      key: 'patient', label: 'ผู้ป่วย', flex: true, minWidth: 200,
      render: (row) => (
        <div className='flex flex-col min-w-0'>
          <EllipsisText text={row.patient.shortName} />
          <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>HN {row.hn}</span>
        </div>
      ),
    },
    {
      key: 'items', label: 'รายการ', flex: true, minWidth: 220,
      render: (row) => <EllipsisText text={row.items.map((i) => i.label).join(', ')} />,
    },
    {
      key: 'paymentMethod', label: 'วิธีชำระ', width: 140,
      render: (row) => PAYMENT_METHODS.find((m) => m.key === row.paymentMethod)?.label ?? '-',
    },
    { key: 'amountReceived', label: 'ยอดสุทธิ', width: 120, render: (row) => <span style={{ fontWeight: 'var(--type-weight-bold)' }}>{formatBaht(row.amountReceived)}</span> },
    { key: 'cashier', label: 'ผู้รับเงิน', width: 160 },
  ];

  return (
    <div className='flex flex-col' style={{ gap: 'var(--dim-space-400)' }}>
      <div className='w-full flex items-start justify-center'>
        <PrimarySearch value={q} onChange={setQ} placeholder='ค้นหาชื่อ-สกุลผู้ป่วย / HN' width={480} />
      </div>

      <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
        <FilterDropdown
          prefix='สิทธิ:'
          options={[{ value: 'all', label: 'ทุกสิทธิ' }, ...Object.values(RIGHTS_GROUPS).map((g) => ({ value: g.key, label: g.label }))]}
          value={filters.rights}
          onChange={setFilter('rights')}
        />
        <FilterDropdown
          prefix='ประเภทรายการ:'
          options={[{ value: 'all', label: 'ทุกประเภท' }, ...Object.values(CHARGE_CATEGORIES).map((c) => ({ value: c.key, label: c.label }))]}
          value={filters.category}
          onChange={setFilter('category')}
        />
        <FilterDateTag
          prefix='วัน:'
          value={filters.dateValue}
          onChange={setFilter('dateValue')}
          defaultQuick={FILTER_DEFAULTS.dateValue.quick}
        />
        <div className='flex-1' />
        <NeutralSubdueButton leadingIcon='print' onClick={() => window.print()}>พิมพ์</NeutralSubdueButton>
      </div>

      <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-300)' }}>
        {methodTotals.map((m) => (
          <div
            key={m.key}
            className='flex flex-col'
            style={{
              minWidth: 160,
              background: 'var(--surface-brandPrimary-quaternary, #F4FBF8)',
              borderRadius: 'var(--dim-radius-300)',
              padding: 'var(--dim-space-300)',
              gap: 'var(--dim-space-050, 2px)',
            }}
          >
            <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>{m.label} ({m.count})</span>
            <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-lg)', fontWeight: 'var(--type-weight-bold)' }}>{formatBaht(m.total)}</span>
          </div>
        ))}
        <div
          className='flex flex-col'
          style={{
            minWidth: 160,
            background: 'var(--surface-brandPrimary-default, #007549)',
            borderRadius: 'var(--dim-radius-300)',
            padding: 'var(--dim-space-300)',
            gap: 'var(--dim-space-050, 2px)',
          }}
        >
          <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-on-content, #FFFFFF)' }}>รวมรายรับวันนี้</span>
          <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-lg)', fontWeight: 'var(--type-weight-bold)', color: 'var(--text-content-on-content, #FFFFFF)' }}>{formatBaht(grandTotal)}</span>
        </div>
      </div>

      <Table columns={columns} rows={paidRows} rowKey={(row) => row.id} emptyMessage='ไม่พบรายรับที่ตรงกับเงื่อนไข' />
    </div>
  );
};

export default RevenueRegisterSection;
