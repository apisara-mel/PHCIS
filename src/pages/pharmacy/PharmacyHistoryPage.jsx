import React, { useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import Table from '@/components/table/Table';
import Badge from '@/components/badge/Badge';
import PharmacySubNav from '@/components/pharmacy/PharmacySubNav';
import { PHARMACY_QUEUE, DISPENSE_STATUS, PAYMENT_STATUS } from '@/data/pharmacyQueue';

/* ประวัติการรับยาและใบสั่งยา — consolidates two separate legacy screens
   (คู่มือระบบงานห้องจ่ายยาและบริหารเวชภัณฑ์ §2.1.5 "บันทึกข้อมูลการตัดจ่าย
   ใบสั่งยา" — search by prescription number or HN to find/close a
   prescription — and §2.1.6 "สอบถามประวัติการได้รับยาของผู้ป่วย" — a
   read-only medication-history lookup) into one search-by-HN-or-queue-
   number page, since this app's `queueNo` already serves as the
   prescription identifier and every dispense action already records its
   own status/timestamps — a separate "cut-off" step would just duplicate
   what confirming dispense already does. */

const breadcrumb = ['ระบบงานเภสัชกรรม', 'ประวัติการรับยา'];

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

const PAYMENT_STATUS_PILL = {
  [PAYMENT_STATUS.NOT_APPLICABLE]: { style: 'neutral', label: 'ไม่มีค่าใช้จ่าย' },
  [PAYMENT_STATUS.UNPAID]:         { style: 'error',   label: 'ค้างชำระ'       },
  [PAYMENT_STATUS.PAID]:           { style: 'success', label: 'ชำระแล้ว'       },
};

const countRows = (rows, pred) => rows.filter(pred).length;

const buildHistorySummaryCards = (rows) => [
  { key: 'total',     label: 'ใบสั่งยาทั้งหมด', value: rows.length,                                                                                    indicator: 'ประวัติการรับยา',     color: 'brand',      icon: 'description'     },
  { key: 'dispensed', label: 'จ่ายแล้ว',         value: countRows(rows, (r) => r.status === DISPENSE_STATUS.DISPENSED),                               indicator: 'ปิดรายการแล้ว',       color: 'positive',   icon: 'check_circle'    },
  { key: 'partial',   label: 'จ่ายบางส่วน',      value: countRows(rows, (r) => r.status === DISPENSE_STATUS.PARTIAL),                                 indicator: 'รอจ่ายส่วนที่เหลือ',   color: 'inprogress', icon: 'hourglass_bottom' },
  { key: 'active',    label: 'รอดำเนินการ',      value: countRows(rows, (r) => [DISPENSE_STATUS.WAITING, DISPENSE_STATUS.CALLED, DISPENSE_STATUS.PREPARING].includes(r.status)), indicator: 'รอเรียก/จัดยา', color: 'info', icon: 'schedule' },
];

const PharmacyHistoryPage = () => {
  const history = useHistory();
  const [query, setQuery] = useState('');

  const summaryCards = useMemo(
    () => buildHistorySummaryCards(PHARMACY_QUEUE),
    [],
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return PHARMACY_QUEUE.filter((r) =>
      r.hn.toLowerCase().includes(q) ||
      r.queueNo.toLowerCase().includes(q) ||
      r.patientName.toLowerCase().includes(q)
    );
  }, [query]);

  const columns = [
    { key: 'queueNo', label: 'เลขที่ใบสั่งยา (คิว)', width: 160, render: (r) => <Badge style='success' size='small'>{r.queueNo}</Badge> },
    {
      key: 'patient', label: 'ผู้ป่วย', flex: true, minWidth: 200,
      render: (r) => (
        <div className='flex flex-col min-w-0'>
          <span>{r.patientName}</span>
          <span style={{ color: 'var(--text-content-tertiary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)' }}>HN {r.hn}</span>
        </div>
      ),
    },
    { key: 'items', label: 'รายการยา', width: 120, align: 'center', render: (r) => `${r.items.length} รายการ` },
    { key: 'issuedAt', label: 'เวลาสั่งยา', width: 100 },
    { key: 'dispensedAt', label: 'เวลาจ่ายยา', width: 110, render: (r) => r.dispensedAt || '—' },
    { key: 'payment', label: 'การชำระเงิน', width: 130, render: (r) => <Badge style={PAYMENT_STATUS_PILL[r.paymentStatus].style} size='small'>{PAYMENT_STATUS_PILL[r.paymentStatus].label}</Badge> },
    { key: 'status', label: 'สถานะ', width: 130, render: (r) => <Badge style={STATUS_PILL[r.status].style} size='small'>{STATUS_PILL[r.status].label}</Badge> },
  ];

  return (
    <QueuePageShell
      activeKey='pharmacy'
      breadcrumb={breadcrumb}
      title='ประวัติการรับยาและใบสั่งยา'
      summaryCards={summaryCards}
      belowSummary={<PharmacySubNav />}
    >
      <div className='flex flex-col flex-1 min-w-0' style={{ padding: 'var(--dim-space-600)', gap: 'var(--dim-space-600)' }}>
        <div
          className='w-full flex flex-col'
          style={{
            background: 'var(--surface-card-100)',
            borderRadius: 'var(--dim-radius-500)',
            boxShadow: 'var(--shadow-card-strong)',
            padding: 'var(--dim-space-600)',
            gap: 'var(--dim-space-400)',
          }}
        >
          <input
            type='text'
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder='ค้นหาด้วยเลขที่ใบสั่งยา (เช่น P-012) / HN / ชื่อผู้ป่วย'
            style={{
              width: '100%', maxWidth: 'var(--dim-size-2700, 448px)', padding: 'var(--dim-space-150) var(--dim-space-300)',
              background: 'var(--surface-input-default)',
              border: 'var(--dim-stroke-100) solid var(--border-input-default)',
              borderRadius: 'var(--dim-radius-200)', fontSize: 'var(--type-size-sm)', outline: 'none',
            }}
          />
          {query.trim() && (
            <span className='text-xs' style={{ color: 'var(--text-content-tertiary)' }}>
              พบ {results.length} รายการ
            </span>
          )}
          <Table
            columns={columns}
            rows={results}
            rowKey={(r) => r.id}
            onRowClick={(r) => history.push({ pathname: '/pharmacy/dispense', state: { queueNo: r.queueNo } })}
            emptyMessage={query.trim() ? 'ไม่พบข้อมูลที่ตรงกับเงื่อนไข' : 'พิมพ์เลขที่ใบสั่งยา, HN หรือชื่อผู้ป่วยเพื่อค้นหา'}
          />
        </div>
      </div>
    </QueuePageShell>
  );
};

export default PharmacyHistoryPage;
