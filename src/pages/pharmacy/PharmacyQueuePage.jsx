import React, { useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import PrimarySearch from '@/components/search/PrimarySearch';
import { FilterDropdown } from '@/components/forms/FilterTag';
import BrandIconButton from '@/components/button/BrandIconButton';
import Table, { EllipsisText as TableEllipsisText } from '@/components/table/Table';
import Pagination from '@/components/pagination/Pagination';
import Badge from '@/components/badge/Badge';
import { PHARMACY_QUEUE, DISPENSE_STATUS, QUEUE_TYPES, checkAllergyConflicts, updatePharmacyRow } from '@/data/pharmacyQueue';
import { checkHighAlert } from '@/data/pharmacyRegistry';
import { findMrPatientByHn } from '@/data/mrPatients';
import PharmacySubNav from '@/components/pharmacy/PharmacySubNav';

const breadcrumb = ['ระบบงานเภสัชกรรม'];

const TABS = [
  { key: 'all',       label: 'ทั้งหมด',     icon: 'group'        },
  { key: 'waiting',   label: 'รอเรียก',     icon: 'schedule'      },
  { key: 'called',    label: 'เรียกแล้ว',   icon: 'volume_up'     },
  { key: 'preparing', label: 'จัดยา',       icon: 'inventory_2'   },
  { key: 'dispensed', label: 'จ่ายแล้ว',    icon: 'check_circle'  },
  { key: 'problem',   label: 'มีปัญหา',     icon: 'report'        },
  { key: 'no_show',   label: 'ไม่มารับยา',  icon: 'person_off'    },
];

const TAB_STATUS_FILTER = {
  waiting:   (r) => r.status === DISPENSE_STATUS.WAITING,
  called:    (r) => r.status === DISPENSE_STATUS.CALLED,
  preparing: (r) => r.status === DISPENSE_STATUS.PREPARING,
  dispensed: (r) => r.status === DISPENSE_STATUS.DISPENSED || r.status === DISPENSE_STATUS.PARTIAL,
  problem:   (r) => r.status === DISPENSE_STATUS.PROBLEM,
  no_show:   (r) => r.status === DISPENSE_STATUS.NO_SHOW,
};

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

const QUEUE_TYPE_PILL = {
  urgent:   { style: 'error',   label: 'ด่วน'      },
  external: { style: 'warning', label: 'ยานอก'     },
  general:  { style: 'neutral', label: 'ยาทั่วไป'   },
};

const Pill = ({ pill }) => <Badge style={pill.style} size='small'>{pill.label}</Badge>;

const actionModeForStatus = (status) => {
  if ([DISPENSE_STATUS.DISPENSED, DISPENSE_STATUS.NO_SHOW, DISPENSE_STATUS.PROBLEM].includes(status)) return 'disabled';
  if (status === DISPENSE_STATUS.CALLED || status === DISPENSE_STATUS.PREPARING) return 'quaternary';
  return 'default';
};

const makeRenderActions = ({ onCall }) => function ActionsCell(row) {
  const mode = actionModeForStatus(row.status);
  const enabled = mode !== 'disabled';
  const variant = mode === 'default' ? 'fill' : mode === 'quaternary' ? 'quaternary' : 'ghost';
  const label = row.status === DISPENSE_STATUS.CALLED ? 'เรียกคิวอีกครั้ง' : 'เรียกคิว';
  return (
    <BrandIconButton
      icon='volume_up'
      size='sm'
      variant={variant}
      disabled={!enabled}
      aria-label={enabled ? label : 'เสร็จสิ้นแล้ว'}
      onClick={(e) => { e.stopPropagation(); onCall?.(row); }}
    />
  );
};

const BASE_COLUMNS = [
  { key: 'queueNo', label: 'คิว', width: 88, render: (row) => <Badge style='success' size='small'>{row.queueNo}</Badge> },
  {
    key: 'patient', label: 'ผู้ป่วย', flex: true, minWidth: 200,
    render: (row) => (
      <div className='flex flex-col min-w-0'>
        <TableEllipsisText text={row.patientName} />
        <span style={{ color: 'var(--text-content-tertiary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)' }}>
          HN {row.hn}
        </span>
      </div>
    ),
  },
  { key: 'queueType', label: 'ประเภท', width: 100, render: (row) => <Pill pill={QUEUE_TYPE_PILL[row.queueType]} /> },
  { key: 'items', label: 'จำนวนรายการยา', width: 130, align: 'center', render: (row) => `${row.items.length} รายการ` },
  {
    key: 'allergy', label: 'แพ้ยา / High Alert', width: 160, sortable: false,
    render: (row) => {
      const patient = findMrPatientByHn(row.hn);
      const conflicts = checkAllergyConflicts(patient, row.items);
      const highAlert = checkHighAlert(row.items);
      return (
        <div className='flex flex-wrap items-center' style={{ gap: 'var(--dim-space-100)' }}>
          {conflicts.length > 0 && <Badge style='error' size='small'>แพ้ยาข้ามกลุ่ม</Badge>}
          {highAlert.length > 0 && <Badge style='error' size='small'>High Alert</Badge>}
        </div>
      );
    },
  },
  { key: 'issuedAt', label: 'เวลาสั่งยา', width: 96 },
  { key: 'status', label: 'สถานะ', width: 128, render: (row) => <Pill pill={STATUS_PILL[row.status]} /> },
];

const PAGE_SIZE = 20;

const PharmacyQueuePage = () => {
  const history = useHistory();
  const [rows, setRows] = useState(PHARMACY_QUEUE);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQ, setSearchQ] = useState('');
  const [queueTypeFilter, setQueueTypeFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [lastCalled, setLastCalled] = useState(null);

  const handleTabChange = (key) => { setActiveTab(key); setPage(1); };

  const handleRowClick = (row) => history.push({
    pathname: '/pharmacy/dispense',
    state: { queueNo: row.queueNo },
  });

  const handleCall = (row) => {
    updatePharmacyRow(row.queueNo, { status: DISPENSE_STATUS.CALLED, calledAt: row.calledAt || 'เมื่อครู่' });
    setRows((prev) => prev.map((r) => (
      r.id === row.id ? { ...r, status: DISPENSE_STATUS.CALLED, calledAt: r.calledAt || 'เมื่อครู่' } : r
    )));
    setLastCalled(row.queueNo);
  };

  const filtered = useMemo(() => {
    let result = rows;
    const tabPred = TAB_STATUS_FILTER[activeTab];
    if (tabPred) result = result.filter(tabPred);
    if (queueTypeFilter !== 'all') result = result.filter((r) => r.queueType === queueTypeFilter);
    if (searchQ) {
      const q = searchQ.toLowerCase();
      result = result.filter((r) =>
        r.patientName.toLowerCase().includes(q) ||
        r.hn.toLowerCase().includes(q) ||
        r.queueNo.toLowerCase().includes(q)
      );
    }
    return result;
  }, [rows, activeTab, queueTypeFilter, searchQ]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const rangeStart = filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, filtered.length);

  const counts = useMemo(() => ({
    total:     rows.length,
    waiting:   rows.filter((r) => r.status === DISPENSE_STATUS.WAITING).length,
    called:    rows.filter((r) => r.status === DISPENSE_STATUS.CALLED).length,
    dispensed: rows.filter((r) => r.status === DISPENSE_STATUS.DISPENSED).length,
  }), [rows]);

  const summaryCards = [
    { key: 'total',     label: 'รายการยาทั้งหมดวันนี้', value: counts.total,     indicator: lastCalled ? `กำลังเรียก ${lastCalled}` : 'ยังไม่มีการเรียกคิว', color: 'brand',      icon: 'medication'    },
    { key: 'waiting',   label: 'รอเรียก',               value: counts.waiting,   indicator: 'รอจัดยา',                                            color: 'inprogress', icon: 'hourglass_top' },
    { key: 'called',    label: 'เรียกแล้ว',             value: counts.called,    indicator: 'กำลังตรวจสอบ/จัดยา',                                 color: 'info',       icon: 'volume_up'     },
    { key: 'dispensed', label: 'จ่ายแล้ว',              value: counts.dispensed, indicator: 'เสร็จสิ้นวันนี้',                                     color: 'positive',   icon: 'check_circle'  },
  ];

  const queueTypeOptions = [{ value: 'all', label: 'ทุกประเภทคิว' }, ...QUEUE_TYPES.map((t) => ({ value: t.key, label: t.label }))];

  const columns = useMemo(
    () => [
      ...BASE_COLUMNS,
      { key: 'actions', label: 'การดำเนินการ', width: 96, align: 'center', sortable: false, render: makeRenderActions({ onCall: handleCall }) },
    ],
    [],
  );

  return (
    <QueuePageShell
      activeKey='pharmacy'
      breadcrumb={breadcrumb}
      title='ระบบงานเภสัชกรรม'
      actions={<PharmacySubNav />}
      summaryCards={summaryCards}
      tabs={TABS}
      activeTab={activeTab}
      onTabChange={handleTabChange}
    >
      <div
        className='flex flex-col flex-1 min-w-0'
        style={{
          paddingTop: 'var(--dim-space-600)',
          paddingLeft: 'var(--dim-space-600)',
          paddingRight: 'var(--dim-space-600)',
          paddingBottom: 'var(--dim-space-600)',
          gap: 'var(--dim-space-600)',
        }}
      >
        <div
          className='w-full flex flex-col'
          style={{
            background: 'var(--surface-card-100)',
            borderRadius: 'var(--dim-radius-500)',
            border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
            boxShadow: 'var(--shadow-card-strong)',
            padding: 'var(--dim-space-600)',
            gap: 'var(--dim-space-600)',
          }}
        >
          <div className='w-full flex items-start justify-center'>
            <PrimarySearch
              value={searchQ}
              onChange={(v) => setSearchQ(v)}
              onSubmit={(v) => setSearchQ(v)}
              placeholder='ค้นหาคิว / HN / ชื่อ-สกุลผู้ป่วย'
              width={640}
            />
          </div>

          <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-300)' }}>
            <FilterDropdown
              prefix='ประเภทคิว:'
              options={queueTypeOptions}
              value={queueTypeFilter}
              onChange={setQueueTypeFilter}
            />
          </div>

          <div className='flex flex-col' style={{ minHeight: 'calc(100vh - 460px)' }}>
            <Table
              columns={columns}
              rows={pageRows}
              rowKey={(row) => row.id}
              stickyColCount={2}
              onRowClick={handleRowClick}
              stickyHeaderTop={113}
              emptyMessage='ไม่พบรายการยาที่ตรงกับเงื่อนไข'
            />
          </div>

          <div
            className='flex items-center w-full'
            style={{
              gap: 'var(--dim-space-200)',
              position: 'sticky',
              bottom: 'var(--dim-space-0)',
              zIndex: 50,
              background: 'var(--surface-card-100)',
              paddingTop: 'var(--dim-space-200)',
              borderTop: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
            }}
          >
            <span style={{ color: 'var(--text-content-secondary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)' }}>
              แสดง {rangeStart}–{rangeEnd} จาก {filtered.length} รายการ
            </span>
            <div className='flex-1' />
            <Pagination currentPage={page} pageCount={totalPages} onPageChange={setPage} />
          </div>
        </div>
      </div>
    </QueuePageShell>
  );
};

export default PharmacyQueuePage;
