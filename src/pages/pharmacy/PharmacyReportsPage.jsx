import React, { useMemo, useState } from 'react';
import QueuePageShell from '@/templates/QueuePageShell';
import Table from '@/components/table/Table';
import Badge from '@/components/badge/Badge';
import Popup from '@/components/popup/Popup';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import SuccessToast from '@/components/toast/SuccessToast';
import PharmacySubNav from '@/components/pharmacy/PharmacySubNav';
import { PHARMACY_QUEUE, DISPENSE_STATUS } from '@/data/pharmacyQueue';
import { getRegistryDrug, currentPrice } from '@/data/pharmacyRegistry';

/* รายงาน (ToR §1.9.11 / legacy manual §2.1.7 "รายงาน") — two report cards:
   1) รายละเอียดใบสั่งยารายวัน — every prescription issued today, one row per
      queue item.
   2) สรุปการจ่ายยา — per-drug rollup (quantity prescribed vs. actually
      dispensed, and estimated value at the registry's current price).
   This mock has only one day of seed data (PHARMACY_QUEUE resets on reload),
   so the date-range picker in the legacy screen is represented as a
   display-only "today" label rather than a live filter — there is no
   multi-day dataset to filter against yet. Export is illustrative, matching
   the same mocked-export + success-toast convention as ConsentReportPage. */

const breadcrumb = ['ระบบงานเภสัชกรรม', 'รายงาน'];

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

const todayThaiLabel = () => {
  const d = new Date();
  const TH_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  return `${d.getDate()} ${TH_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`;
};

const CARD = {
  background: 'var(--surface-card-100)',
  borderRadius: 'var(--dim-radius-500)',
  border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
  boxShadow: 'var(--shadow-card-strong)',
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

const STAT_TILE = (label, value) => (
  <div
    key={label}
    className='flex flex-col'
    style={{
      flex: '1 1 160px', minWidth: 160,
      padding: 'var(--dim-space-400)',
      borderRadius: 'var(--dim-radius-400)',
      background: 'var(--surface-brandPrimary-quaternary)',
      border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
      gap: 'var(--dim-space-100)',
    }}
  >
    <span style={{ color: 'var(--text-content-tertiary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)' }}>{label}</span>
    <span style={{ color: 'var(--text-brandPrimary-default)', fontFamily: 'var(--type-family-heading-graphic2)', fontSize: 'var(--type-size-xl)' }}>{value}</span>
  </div>
);

const DETAIL_COLUMNS = [
  { key: 'queueNo', label: 'เลขที่ใบสั่งยา', width: 130, render: (r) => <Badge style='success' size='small'>{r.queueNo}</Badge> },
  {
    key: 'patient', label: 'ผู้ป่วย', flex: true, minWidth: 200,
    render: (r) => (
      <div className='flex flex-col min-w-0'>
        <span>{r.patientName}</span>
        <span style={{ color: 'var(--text-content-tertiary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)' }}>HN {r.hn}</span>
      </div>
    ),
  },
  { key: 'items', label: 'รายการยา', flex: true, minWidth: 220, render: (r) => r.items.map((i) => i.name).join(', ') },
  { key: 'issuedAt', label: 'เวลาสั่งยา', width: 100 },
  { key: 'dispensedAt', label: 'เวลาจ่ายยา', width: 110, render: (r) => r.dispensedAt || '—' },
  { key: 'verifiedBy', label: 'เภสัชกรผู้ตรวจสอบ', width: 180, render: (r) => r.verifiedBy || '—' },
  { key: 'status', label: 'สถานะ', width: 130, render: (r) => <Badge style={STATUS_PILL[r.status].style} size='small'>{STATUS_PILL[r.status].label}</Badge> },
];

const SUMMARY_COLUMNS = [
  { key: 'name', label: 'ชื่อยา', flex: true, minWidth: 220 },
  { key: 'prescriptionCount', label: 'จำนวนใบสั่งยา', width: 130, align: 'center' },
  { key: 'totalQuantity', label: 'จำนวนสั่ง', width: 110, align: 'center', render: (r) => `${r.totalQuantity.toLocaleString()} ${r.unit}` },
  { key: 'totalDispensed', label: 'จำนวนจ่ายแล้ว', width: 130, align: 'center', render: (r) => `${r.totalDispensed.toLocaleString()} ${r.unit}` },
  { key: 'totalValue', label: 'มูลค่ารวม (โดยประมาณ)', width: 160, align: 'right', render: (r) => `฿${r.totalValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}` },
];

const buildDetailRows = () => PHARMACY_QUEUE;

const buildSummaryRows = () => {
  const byDrug = new Map();
  PHARMACY_QUEUE.forEach((row) => {
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

const EXPORT_FORMATS = [
  { value: 'pdf',  label: 'PDF' },
  { value: 'csv',  label: 'CSV' },
  { value: 'xlsx', label: 'XLSX' },
];

const ExportPopup = ({ open, reportTitle, onClose, onExported }) => (
  <Popup
    open={open}
    onClose={onClose}
    title='นำส่งออกรายงาน'
    subtitle={reportTitle}
    tertiaryAction={{ label: 'ยกเลิก', onClick: onClose }}
  >
    <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
      <span style={{ color: 'var(--text-content-secondary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)' }}>
        เลือกรูปแบบไฟล์ที่ต้องการนำส่งออก
      </span>
      <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
        {EXPORT_FORMATS.map((f) => (
          <NeutralSubdueButton key={f.value} leadingIcon='description' size='sm' onClick={() => { onExported(); onClose(); }}>
            {f.label}
          </NeutralSubdueButton>
        ))}
      </div>
    </div>
  </Popup>
);

const ReportCard = ({ title, subtitle, stats, columns, rows, emptyMessage, onExport }) => (
  <section className='w-full flex flex-col' style={{ ...CARD, gap: 'var(--dim-space-400)' }}>
    <div className='flex items-start w-full' style={{ gap: 'var(--dim-space-400)' }}>
      <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-050)' }}>
        <h2 style={CARD_TITLE}>{title}</h2>
        <span style={CARD_SUBTITLE}>{subtitle}</span>
      </div>
      <div className='flex-1' />
      <NeutralSubdueButton leadingIcon='ios_share' size='sm' onClick={onExport}>นำส่งออกรายงาน</NeutralSubdueButton>
    </div>
    <div className='flex items-stretch flex-wrap' style={{ gap: 'var(--dim-space-300)' }}>
      {stats.map(([label, value]) => STAT_TILE(label, value))}
    </div>
    <Table columns={columns} rows={rows} rowKey={(r) => r.id || r.name} emptyMessage={emptyMessage} />
  </section>
);

const PharmacyReportsPage = () => {
  const [exportTarget, setExportTarget] = useState(null);
  const [exported, setExported] = useState(false);

  const detailRows = useMemo(buildDetailRows, []);
  const summaryRows = useMemo(buildSummaryRows, []);

  const dispensedCount = detailRows.filter((r) => r.status === DISPENSE_STATUS.DISPENSED || r.status === DISPENSE_STATUS.PARTIAL).length;
  const totalValue = summaryRows.reduce((s, r) => s + r.totalValue, 0);

  return (
    <QueuePageShell
      activeKey='pharmacy'
      breadcrumb={breadcrumb}
      title='รายงานระบบงานเภสัชกรรม'
      actions={<PharmacySubNav />}
    >
      <div className='flex flex-col flex-1 min-w-0' style={{ padding: 'var(--dim-space-600)', gap: 'var(--dim-space-600)' }}>
        <ReportCard
          title='รายงานรายละเอียดใบสั่งยารายวัน'
          subtitle={`วันที่ ${todayThaiLabel()} · ${detailRows.length} ใบสั่งยา`}
          stats={[
            ['ใบสั่งยาทั้งหมด', detailRows.length],
            ['จ่ายแล้ว/บางส่วน', dispensedCount],
            ['รอดำเนินการ', detailRows.length - dispensedCount],
          ]}
          columns={DETAIL_COLUMNS}
          rows={detailRows}
          emptyMessage='ไม่มีใบสั่งยาในวันนี้'
          onExport={() => setExportTarget('รายงานรายละเอียดใบสั่งยารายวัน')}
        />
        <ReportCard
          title='รายงานสรุปการจ่ายยา'
          subtitle={`วันที่ ${todayThaiLabel()} · สรุปตามรายการยา`}
          stats={[
            ['รายการยาที่สั่ง', summaryRows.length],
            ['มูลค่ารวม (โดยประมาณ)', `฿${totalValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}`],
          ]}
          columns={SUMMARY_COLUMNS}
          rows={summaryRows}
          emptyMessage='ไม่มีข้อมูลการจ่ายยาในวันนี้'
          onExport={() => setExportTarget('รายงานสรุปการจ่ายยา')}
        />
      </div>

      <ExportPopup
        open={!!exportTarget}
        reportTitle={exportTarget}
        onClose={() => setExportTarget(null)}
        onExported={() => setExported(true)}
      />
      <SuccessToast open={exported} message='นำส่งออกรายงานแล้ว' onClose={() => setExported(false)} />
    </QueuePageShell>
  );
};

export default PharmacyReportsPage;
