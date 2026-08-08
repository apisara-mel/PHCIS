import React, { useMemo, useState } from 'react';
import QueuePageShell from '@/templates/QueuePageShell';
import Table from '@/components/table/Table';
import Badge from '@/components/badge/Badge';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import SuccessToast from '@/components/toast/SuccessToast';
import PharmacySubNav, { PharmacyAddDrugButton } from '@/components/pharmacy/PharmacySubNav';
import { sanitizeExportColumns } from '@/utils/exportPiiSanitize';
import { buildReportsSummaryCards } from '@/pages/pharmacy/pharmacySummaryCards';
import { PHARMACY_WORKLIST_CARD } from '@/pages/pharmacy/pharmacyContentCard';
import { PHARMACY_QUEUE, PHARMACY_USAGE_HISTORY, DISPENSE_STATUS } from '@/data/pharmacyQueue';
import { getRegistryDrug, currentPrice } from '@/data/pharmacyRegistry';

/* รายงาน (ToR §1.9.11 / legacy manual §2.1.7 "รายงาน") — two report cards:
   1) รายละเอียดใบสั่งยารายวัน — every prescription issued today, one row per
      queue item.
   2) สรุปการจ่ายยา — per-drug rollup (quantity prescribed vs. actually
      dispensed, and estimated value at the registry's current price),
      i.e. ToR §1.9.6.8's "สถิติการใช้ยาแต่ละประเภท".
   Both filter `[...PHARMACY_QUEUE, ...PHARMACY_USAGE_HISTORY]` by
   `issuedDate` (from/to date pickers, default = today) and export to a real
   downloaded CSV. `PHARMACY_USAGE_HISTORY` backfills the past 6 days as
   closed records (see pharmacyQueue.js) so picking a multi-day range shows
   a real day-to-day usage trend, not just today's single seeded day. */
const REPORT_SOURCE_ROWS = [...PHARMACY_QUEUE, ...PHARMACY_USAGE_HISTORY];

const breadcrumb = ['ระบบงานเภสัชกรรม', 'รายงาน'];

const todayIso = () => new Date().toISOString().slice(0, 10);

const csvEscape = (v) => {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const toCsv = (columns, rows) => {
  const header = columns.map((c) => csvEscape(c.label)).join(',');
  const body = rows.map((r) => columns.map((c) => csvEscape((c.csv || c.render || ((row) => row[c.key]))(r))).join(','));
  return [header, ...body].join('\r\n');
};

const downloadCsv = (filename, csvText) => {
  const blob = new Blob([`\uFEFF${csvText}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

const DATE_INPUT_STYLE = {
  padding: 'var(--dim-space-150) var(--dim-space-300)',
  background: 'var(--surface-input-default)',
  border: 'var(--dim-stroke-100) solid var(--border-input-default)',
  borderRadius: 'var(--dim-radius-200)',
  fontSize: 'var(--type-size-sm)',
  color: 'var(--text-content-primary)',
};

const THAI_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const formatIsoDateThai = (iso) => {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getDate()} ${THAI_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`;
};
const formatRangeLabel = (from, to) => (from === to ? `วันที่ ${formatIsoDateThai(from)}` : `${formatIsoDateThai(from)} – ${formatIsoDateThai(to)}`);

const STATUS_PILL = {
  [DISPENSE_STATUS.WAITING]:   { style: 'warning', label: 'รอเรียก'      },
  [DISPENSE_STATUS.CALLED]:    { style: 'info',    label: 'เรียกแล้ว'    },
  [DISPENSE_STATUS.PREPARING]: { style: 'info',    label: 'จัดยา'        },
  [DISPENSE_STATUS.DISPENSED]: { style: 'success', label: 'จ่ายแล้ว'     },
  [DISPENSE_STATUS.PARTIAL]:   { style: 'warning', label: 'จ่ายบางส่วน'  },
  [DISPENSE_STATUS.NO_SHOW]:   { style: 'neutral', label: 'ไม่มารับยา'   },
  [DISPENSE_STATUS.PROBLEM]:   { style: 'error',   label: 'มีปัญหา'      },
  [DISPENSE_STATUS.CANCELLED]: { style: 'neutral', label: 'ยกเลิก'       },
};

const CARD = {
  ...PHARMACY_WORKLIST_CARD,
  padding: 'var(--dim-space-600)',
};

const CARD_TITLE = {
  margin: 0,
  fontFamily: 'var(--type-family-heading-content)',
  fontWeight: 'var(--type-weight-bold)',
  fontSize: 'var(--type-size-base)',
  color: 'var(--text-content-default)',
};

const CARD_SUBTITLE = {
  color: 'var(--text-content-tertiary)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-xs)',
};

const DETAIL_COLUMNS = [
  { key: 'queueNo', label: 'เลขที่ใบสั่งยา', render: (r) => <Badge style='success' size='small'>{r.queueNo}</Badge>, csv: (r) => r.queueNo },
  {
    key: 'patient', label: 'ผู้ป่วย', flex: true, minWidth: 200,
    render: (r) => (
      <div className='flex flex-col min-w-0'>
        <span>{r.patientName}</span>
        <span style={{ color: 'var(--text-content-tertiary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)' }}>HN {r.hn}</span>
      </div>
    ),
    csv: (r) => r.hn,
  },
  { key: 'items', label: 'รายการยา', flex: true, minWidth: 220, render: (r) => r.items.map((i) => i.name).join(', ') },
  { key: 'issuedDate', label: 'วันที่สั่งยา', render: (r) => formatIsoDateThai(r.issuedDate) },
  { key: 'issuedAt', label: 'เวลาสั่งยา' },
  { key: 'dispensedAt', label: 'เวลาจ่ายยา', render: (r) => r.dispensedAt || '—' },
  { key: 'verifiedBy', label: 'เภสัชกรผู้ตรวจสอบ', render: (r) => r.verifiedBy || '—' },
  { key: 'status', label: 'สถานะ', render: (r) => <Badge style={STATUS_PILL[r.status].style} size='small'>{STATUS_PILL[r.status].label}</Badge>, csv: (r) => STATUS_PILL[r.status].label },
];

const SUMMARY_COLUMNS = [
  { key: 'name', label: 'ชื่อยา', flex: true, minWidth: 220 },
  { key: 'prescriptionCount', label: 'จำนวนใบสั่งยา', align: 'center' },
  { key: 'totalQuantity', label: 'จำนวนสั่ง', align: 'center', render: (r) => `${r.totalQuantity.toLocaleString()} ${r.unit}`, csv: (r) => `${r.totalQuantity} ${r.unit}` },
  { key: 'totalDispensed', label: 'จำนวนจ่ายแล้ว', align: 'center', render: (r) => `${r.totalDispensed.toLocaleString()} ${r.unit}`, csv: (r) => `${r.totalDispensed} ${r.unit}` },
  { key: 'totalValue', label: 'มูลค่ารวม (โดยประมาณ)', align: 'right', render: (r) => `฿${r.totalValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}`, csv: (r) => r.totalValue.toFixed(2) },
];

const buildDetailRows = (from, to) => REPORT_SOURCE_ROWS.filter((r) => r.issuedDate >= from && r.issuedDate <= to);

const buildSummaryRows = (from, to) => {
  const byDrug = new Map();
  REPORT_SOURCE_ROWS.filter((r) => r.issuedDate >= from && r.issuedDate <= to).forEach((row) => {
    row.items.forEach((item) => {
      const entry = byDrug.get(item.name) || {
        name: item.name, unit: item.unit, prescriptionCount: 0, totalQuantity: 0, totalDispensed: 0, totalValue: 0,
      };
      entry.prescriptionCount += 1;
      entry.totalQuantity += item.quantity;
      entry.totalDispensed += item.quantityDispensed || 0;
      const drug = getRegistryDrug(item.name);
      entry.totalValue += item.quantity * currentPrice(drug);
      byDrug.set(item.name, entry);
    });
  });
  return Array.from(byDrug.values()).sort((a, b) => b.totalQuantity - a.totalQuantity);
};

const ReportCard = ({ title, subtitle, columns, rows, emptyMessage, onExport }) => (
  <section className='w-full flex flex-col' style={{ ...CARD, gap: 'var(--dim-space-400)' }}>
    <div className='flex items-start w-full' style={{ gap: 'var(--dim-space-400)' }}>
      <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-050)' }}>
        <h2 style={CARD_TITLE}>{title}</h2>
        <span style={CARD_SUBTITLE}>{subtitle}</span>
      </div>
      <div className='flex-1' />
      <NeutralSubdueButton leadingIcon='ios_share' size='sm' onClick={onExport}>นำส่งออกรายงาน</NeutralSubdueButton>
    </div>
    <Table columns={columns} rows={rows} rowKey={(r) => r.id || r.name} emptyMessage={emptyMessage} />
  </section>
);

const PharmacyReportsPage = () => {
  const [fromDate, setFromDate] = useState(todayIso);
  const [toDate, setToDate] = useState(todayIso);
  const [exported, setExported] = useState(false);

  const detailRows = useMemo(() => buildDetailRows(fromDate, toDate), [fromDate, toDate]);
  const summaryRows = useMemo(() => buildSummaryRows(fromDate, toDate), [fromDate, toDate]);

  const dispensedCount = detailRows.filter((r) => r.status === DISPENSE_STATUS.DISPENSED || r.status === DISPENSE_STATUS.PARTIAL).length;
  const totalValue = summaryRows.reduce((s, r) => s + r.totalValue, 0);
  const rangeLabel = formatRangeLabel(fromDate, toDate);

  const summaryCards = useMemo(
    () => buildReportsSummaryCards({ detailRows, summaryRows, dispensedCount, totalValue, rangeLabel }),
    [detailRows, summaryRows, dispensedCount, totalValue, rangeLabel],
  );

  const handleExport = (title, columns, rows) => {
    const filename = `${title.replace(/\s+/g, '-')}_${fromDate}_${toDate}.csv`;
    const exportCols = sanitizeExportColumns(columns);
    downloadCsv(filename, toCsv(exportCols, rows));
    setExported(true);
  };

  const resetToToday = () => { setFromDate(todayIso()); setToDate(todayIso()); };
  const setLast7Days = () => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    setFromDate(d.toISOString().slice(0, 10));
    setToDate(todayIso());
  };

  return (
    <QueuePageShell
      activeKey='pharmacy'
      breadcrumb={breadcrumb}
      title='รายงานระบบงานเภสัชกรรม'
      summaryCards={summaryCards}
      actions={<PharmacyAddDrugButton />}
      belowSummary={<PharmacySubNav />}
    >
      <div className='flex flex-col flex-1 min-w-0' style={{ padding: 'var(--dim-space-600)', gap: 'var(--dim-space-600)' }}>
        <section className='w-full flex flex-wrap items-end' style={{ ...CARD, gap: 'var(--dim-space-300)' }}>
          <label className='flex flex-col' style={{ gap: 'var(--dim-space-150)' }}>
            <span style={CARD_SUBTITLE}>ตั้งแต่วันที่</span>
            <input type='date' value={fromDate} max={toDate} onChange={(e) => setFromDate(e.target.value)} style={DATE_INPUT_STYLE} />
          </label>
          <label className='flex flex-col' style={{ gap: 'var(--dim-space-150)' }}>
            <span style={CARD_SUBTITLE}>ถึงวันที่</span>
            <input type='date' value={toDate} min={fromDate} onChange={(e) => setToDate(e.target.value)} style={DATE_INPUT_STYLE} />
          </label>
          <NeutralSubdueButton variant='outline' size='sm' leadingIcon='today' onClick={resetToToday}>วันนี้</NeutralSubdueButton>
          <NeutralSubdueButton variant='outline' size='sm' leadingIcon='date_range' onClick={setLast7Days}>7 วันล่าสุด</NeutralSubdueButton>
        </section>

        <ReportCard
          title='รายงานรายละเอียดใบสั่งยารายวัน'
          subtitle={`${rangeLabel} · ${detailRows.length} ใบสั่งยา`}
          columns={DETAIL_COLUMNS}
          rows={detailRows}
          emptyMessage='ไม่มีใบสั่งยาในช่วงวันที่เลือก'
          onExport={() => handleExport('รายงานรายละเอียดใบสั่งยารายวัน', DETAIL_COLUMNS, detailRows)}
        />
        <ReportCard
          title='รายงานสรุปการจ่ายยา'
          subtitle={`${rangeLabel} · สรุปตามรายการยา`}
          columns={SUMMARY_COLUMNS}
          rows={summaryRows}
          emptyMessage='ไม่มีข้อมูลการจ่ายยาในช่วงวันที่เลือก'
          onExport={() => handleExport('รายงานสรุปการจ่ายยา', SUMMARY_COLUMNS, summaryRows)}
        />
      </div>

      <SuccessToast open={exported} message='ดาวน์โหลดรายงาน CSV แล้ว' onClose={() => setExported(false)} />
    </QueuePageShell>
  );
};

export default PharmacyReportsPage;
