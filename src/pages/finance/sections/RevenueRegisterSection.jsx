import React, { useMemo, useState } from 'react';
import Table, { EllipsisText } from '@/components/table/Table';
import PrimarySearch from '@/components/search/PrimarySearch';
import { FilterDropdown } from '@/components/forms/FilterTag';
import FilterDateTag from '@/components/forms/FilterDateTag';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import {
  PAYMENT_METHODS, RIGHTS_GROUPS, CHARGE_CATEGORIES,
  formatBaht, timeToMinutes, matchesDateFilter, netCollected,
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
    /* Filter on the date money was RECEIVED, not the date of the visit —
       a register is a ledger of receipts. Paying today for yesterday's
       visit belongs in today's register (TOR §1.8.1.12 / §1.8.5.3). */
    rows = rows.filter((r) => matchesDateFilter(r.paidDate || r.visitDate, filters.dateValue));
    return rows.sort((a, b) => timeToMinutes(a.paidTime || a.visitTime) - timeToMinutes(b.paidTime || b.visitTime));
  }, [queue, q, filters]);

  const methodTotals = useMemo(() => PAYMENT_METHODS.map((m) => ({
    ...m,
    total: paidRows.filter((r) => r.paymentMethod === m.key).reduce((s, r) => s + netCollected(r), 0),
    count: paidRows.filter((r) => r.paymentMethod === m.key).length,
  })), [paidRows]);

  const grandTotal = paidRows.reduce((s, r) => s + netCollected(r), 0);

  const columns = [
    {
      key: 'paidTime', label: 'วันที่และเวลารับชำระ',
      render: (row) => (
        <div className='flex flex-col'>
          <span>{row.paidDate || row.visitDate}</span>
          <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
            {row.paidTime || row.visitTime} น.
            {row.paidDate && row.paidDate !== row.visitDate && ` · visit ${row.visitDate}`}
          </span>
        </div>
      ),
    },
    { key: 'center', label: 'ศูนย์/คลินิก' },
    { key: 'receiptNo', label: 'เลขที่ใบเสร็จ' },
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
      /* List what this receipt settled, not every charge on the visit —
         a partially-paid visit must not look like the whole bill was
         collected (TOR §1.8.1.15 / §1.8.5.3 "รายการ"). */
      render: (row) => {
        const settled = row.paidItemIds
          ? row.items.filter((i) => row.paidItemIds.includes(i.id))
          : row.items;
        return <EllipsisText text={settled.map((i) => i.label).join(', ')} />;
      },
    },
    {
      key: 'paymentMethod', label: 'วิธีชำระ',
      render: (row) => PAYMENT_METHODS.find((m) => m.key === row.paymentMethod)?.label ?? '-'},
    {
      key: 'amountReceived', label: 'ยอดสุทธิ',
      render: (row) => (
        <div className='flex flex-col'>
          <span style={{ fontWeight: 'var(--type-weight-bold)' }}>{formatBaht(netCollected(row))}</span>
          {row.changeDue > 0 && (
            <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
              รับ {formatBaht(row.amountReceived)} · ทอน {formatBaht(row.changeDue)}
            </span>
          )}
        </div>
      ),
    },
    { key: 'cashier', label: 'ผู้รับเงิน' },
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
