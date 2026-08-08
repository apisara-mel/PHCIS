import React, { useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import PrimarySearch from '@/components/search/PrimarySearch';
import FilterTag, { FilterDropdown } from '@/components/forms/FilterTag';
import BrandIconButton from '@/components/button/BrandIconButton';
import Table, { EllipsisText as TableEllipsisText } from '@/components/table/Table';
import Pagination from '@/components/pagination/Pagination';
import Badge from '@/components/badge/Badge';
import { PHARMACY_QUEUE, DISPENSE_STATUS, QUEUE_TYPES, PAYMENT_STATUS, checkAllergyConflicts, updatePharmacyRow } from '@/data/pharmacyQueue';
import { checkHighAlert } from '@/data/pharmacyRegistry';
import { findMrPatientByHn } from '@/data/mrPatients';
import PharmacySubNav, { PharmacyAddDrugButton } from '@/components/pharmacy/PharmacySubNav';
import StickyStatusTabBar, { QUEUE_STICKY_UNDER_STATUS_TABS } from '@/components/tab/StickyStatusTabBar';
import { buildDispenseStatusSummaryCards, countRows } from '@/pages/pharmacy/pharmacySummaryCards';
import { PHARMACY_WORKLIST_CARD_BODY } from '@/pages/pharmacy/pharmacyContentCard';
import QueuePatientAvatar, { resolveQueuePatientAvatarProps } from '@/components/patient/QueuePatientAvatar';
import MaskedWorklistName from '@/components/privacy/MaskedWorklistName';

const breadcrumb = ['ระบบงานเภสัชกรรม'];

const TABS = [
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
  urgent:  { style: 'error',   label: 'ด่วน'      },
  few:     { style: 'info',    label: 'ยาน้อย'    },
  general: { style: 'neutral', label: 'ยาทั่วไป'   },
};

/* สถานะการชำระเงิน (ToR §1.9.5.2). */
const PAYMENT_STATUS_PILL = {
  [PAYMENT_STATUS.NOT_APPLICABLE]: { style: 'neutral', label: 'ไม่มีค่าใช้จ่าย' },
  [PAYMENT_STATUS.UNPAID]:         { style: 'error',   label: 'ค้างชำระ'       },
  [PAYMENT_STATUS.PAID]:           { style: 'success', label: 'ชำระแล้ว'       },
};

const Pill = ({ pill }) => <Badge style={pill.style} size='small'>{pill.label}</Badge>;

/* Patient photo — registration queue avatar contract (QueuePatientAvatar). */
/* Allergy / High Alert flags for a row — shared by the table cell render
   AND the "แพ้ยา / High Alert" filter dropdown so both stay in sync on one
   computation instead of drifting. */
const getAllergyFlags = (row) => {
  const patient = findMrPatientByHn(row.hn);
  return {
    hasAllergy: checkAllergyConflicts(patient, row.items).length > 0,
    hasHighAlert: checkHighAlert(row.items).length > 0,
  };
};

const ALLERGY_FILTER_OPTIONS = [
  { value: 'all',        label: 'ทั้งหมด'          },
  { value: 'allergy',    label: 'แพ้ยาข้ามกลุ่ม'    },
  { value: 'highAlert',  label: 'High Alert'       },
  { value: 'none',       label: 'ไม่มีการแจ้งเตือน' },
];
const PAYMENT_FILTER_OPTIONS = [
  { value: 'all', label: 'ทั้งหมด' },
  { value: PAYMENT_STATUS.NOT_APPLICABLE, label: 'ไม่มีค่าใช้จ่าย' },
  { value: PAYMENT_STATUS.UNPAID,         label: 'ค้างชำระ'       },
  { value: PAYMENT_STATUS.PAID,           label: 'ชำระแล้ว'       },
];
const actionModeForStatus = (status) => {
  if ([DISPENSE_STATUS.DISPENSED, DISPENSE_STATUS.NO_SHOW, DISPENSE_STATUS.PROBLEM, DISPENSE_STATUS.CANCELLED].includes(status)) return 'disabled';
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

/* Column widths are content-fit in <Table> (max of header vs longest cell).
   Only `flex` / `minWidth` remain for the patient column that should grow. */
const BASE_COLUMNS = [
  { key: 'queueNo', label: 'คิว', render: (row) => <Badge style='success' size='small'>{row.queueNo}</Badge> },
  { key: 'hn', label: 'HN' },
  /* VN (Visit Number) — same value as the OPD screening queue for this
     patient (see `getVnByHn` in patientProfiles.js). Blank for the handful
     of mock HNs still "รอลงทะเบียน" with no screening visit yet. */
  { key: 'vn', label: 'VN', render: (row) => row.vn || '-' },
  {
    key: 'patient', label: 'ผู้ป่วย', flex: true, minWidth: 200,
    render: (row) => {
      /* Always show the HN's profile portrait (unique per patient).
         Pharmacy queue includes pending-registration HNs that have no VN yet —
         still show their photo, not initials. */
      const avatarProps = resolveQueuePatientAvatarProps({
        hn: row.hn,
        displayName: row.patientName,
      });
      return (
        <div className='flex items-center min-w-0' style={{ gap: 'var(--dim-space-200)' }}>
          <QueuePatientAvatar size={36} {...avatarProps} />
          <MaskedWorklistName
            name={row.patientName}
            recordKey={row.hn || row.queueNo}
            className='min-w-0 truncate flex-1'
          />
        </div>
      );
    },
  },
  { key: 'queueType', label: 'ประเภท', render: (row) => <Pill pill={QUEUE_TYPE_PILL[row.queueType]} /> },
  { key: 'items', label: 'จำนวนรายการยา', align: 'center', render: (row) => `${row.items.length} รายการ` },
  {
    key: 'allergy', label: 'แพ้ยา / High Alert', sortable: false,
    render: (row) => {
      const { hasAllergy, hasHighAlert } = getAllergyFlags(row);
      return (
        /* Two different warnings, two different tones: red is patient-specific
           (this person reacts to this drug class), amber is drug-specific
           (high-risk drug, safe for this patient). Both in red read as one
           undifferentiated alarm. */
        <div className='flex items-center' style={{ gap: 'var(--dim-space-100)', flexWrap: 'nowrap' }}>
          {hasAllergy && <Badge style='error' size='small'>แพ้ยาข้ามกลุ่ม</Badge>}
          {hasHighAlert && <Badge style='warning' size='small'>High Alert</Badge>}
        </div>
      );
    },
  },
  { key: 'issuedAt', label: 'เวลาสั่งยา' },
  { key: 'payment', label: 'การชำระเงิน', render: (row) => <Pill pill={PAYMENT_STATUS_PILL[row.paymentStatus]} /> },
  { key: 'status', label: 'สถานะ', render: (row) => <Pill pill={STATUS_PILL[row.status]} /> },
];

const PAGE_SIZE = 20;

/* Empty state speaks in the tab's own voice. An empty "มีปัญหา" tab is good
   news, not a failed search — only say "ไม่พบ" when a filter is what's
   hiding the rows. */
const EMPTY_MESSAGE = {
  waiting:   'ไม่มีคิวที่รอเรียก',
  called:    'ยังไม่มีคิวที่เรียกแล้ว',
  preparing: 'ไม่มีรายการที่กำลังจัดยา',
  dispensed: 'ยังไม่มีรายการที่จ่ายแล้ววันนี้',
  problem:   'ไม่มีรายการที่ติดปัญหา',
  no_show:   'ไม่มีผู้รับบริการที่ไม่มารับยา',
};

/* Tabs whose rows can still be acted on. On the terminal tabs every "เรียกคิว"
   button would render disabled, so the column is dropped instead of showing a
   row of dead controls. */
const ACTIONABLE_TABS = ['waiting', 'called', 'preparing'];

const PharmacyQueuePage = () => {
  const history = useHistory();
  const [rows, setRows] = useState(PHARMACY_QUEUE);
  const [activeTab, setActiveTab] = useState('waiting');
  const [searchQ, setSearchQ] = useState('');
  const [queueTypeFilter, setQueueTypeFilter] = useState('all');
  const [allergyFilter, setAllergyFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [lastCalled, setLastCalled] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  const handleTabChange = (key) => {
    setActiveTab(key);
    setPage(1);
  };

  /* Same toggler as the OPD screening worklist (src/pages/opd/QueuePage.jsx)
     — first click on a column sorts ascending, a second click on the same
     column flips to descending, clicking a different column resets to
     ascending on that column. */
  const handleSort = (key) => {
    setSortConfig((prev) => (
      prev.key === key
        ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'asc' }
    ));
  };

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
    if (allergyFilter !== 'all') {
      result = result.filter((r) => {
        const { hasAllergy, hasHighAlert } = getAllergyFlags(r);
        if (allergyFilter === 'allergy') return hasAllergy;
        if (allergyFilter === 'highAlert') return hasHighAlert;
        return !hasAllergy && !hasHighAlert; // 'none'
      });
    }
    if (paymentFilter !== 'all') result = result.filter((r) => r.paymentStatus === paymentFilter);
    if (searchQ) {
      const q = searchQ.toLowerCase();
      result = result.filter((r) =>
        r.patientName.toLowerCase().includes(q) ||
        r.hn.toLowerCase().includes(q) ||
        r.queueNo.toLowerCase().includes(q)
      );
    }
    return result;
  }, [rows, activeTab, queueTypeFilter, allergyFilter, paymentFilter, searchQ]);

  /* Column-header sort — same pattern as the OPD screening worklist
     (src/pages/opd/QueuePage.jsx): only applied once the pharmacist
     actually clicks a header (sortConfig.key === null keeps the existing
     insertion-order view untouched). */
  const sortedRows = useMemo(() => {
    if (!sortConfig.key) return filtered;
    const sign = sortConfig.direction === 'desc' ? -1 : 1;
    const normalize = (row, key) => {
      switch (key) {
        case 'patient':   return row.patientName || '';
        case 'queueType': return QUEUE_TYPE_PILL[row.queueType]?.label || '';
        case 'items':     return row.items.length;
        case 'payment':   return PAYMENT_STATUS_PILL[row.paymentStatus]?.label || '';
        case 'status':    return STATUS_PILL[row.status]?.label || '';
        default:          return row[key] ?? '';
      }
    };
    const collator = new Intl.Collator('th', { numeric: true, sensitivity: 'base' });
    return [...filtered].sort((a, b) => {
      const av = normalize(a, sortConfig.key);
      const bv = normalize(b, sortConfig.key);
      const primary = typeof av === 'number' && typeof bv === 'number'
        ? av - bv
        : collator.compare(String(av), String(bv));
      return sign * primary;
    });
  }, [filtered, sortConfig]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  /* Searching or filtering while parked on a late page can leave `page` past
     the end of the shortened list — the slice then returns nothing and the
     table reads as "no results" even though matches exist. Render from a
     clamped page, and settle the state back in an effect so a later "ล้าง
     ตัวกรอง" doesn't teleport the pharmacist back to page 4. */
  const safePage = Math.min(page, totalPages);
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pageRows = sortedRows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const rangeStart = filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(safePage * PAGE_SIZE, filtered.length);

  /* Summary cards mirror the six status tabs — fixed hierarchy, same counts
     no matter which tab is selected (OPD QueuePage / Figma 115:35757 pattern). */
  const summaryCards = useMemo(() => {
    const indicator = lastCalled
      ? `กำลังเรียก ${lastCalled}`
      : `รวม ${rows.length} รายการวันนี้`;
    return buildDispenseStatusSummaryCards(rows, { indicatorPrefix: indicator });
  }, [rows, lastCalled]);

  /* Every status tab carries its own count, so the pharmacist can see where
     the backlog is without clicking through. */
  const tabCounts = useMemo(() => Object.fromEntries(
    TABS.map((t) => [t.key, countRows(rows, TAB_STATUS_FILTER[t.key])]),
  ), [rows]);

  const filtersActive = queueTypeFilter !== 'all'
    || allergyFilter !== 'all'
    || paymentFilter !== 'all'
    || searchQ.trim() !== '';

  const clearFilters = () => {
    setQueueTypeFilter('all');
    setAllergyFilter('all');
    setPaymentFilter('all');
    setSearchQ('');
    setPage(1);
  };

  const queueTypeOptions = [{ value: 'all', label: 'ทุกประเภท' }, ...QUEUE_TYPES.map((t) => ({ value: t.key, label: t.label }))];

  const columns = useMemo(
    () => (ACTIONABLE_TABS.includes(activeTab)
      ? [...BASE_COLUMNS, { key: 'actions', label: 'การดำเนินการ', align: 'center', sortable: false, render: makeRenderActions({ onCall: handleCall }) }]
      : BASE_COLUMNS),
    [activeTab],
  );

  const statusTabs = useMemo(
    () => TABS.map((t) => ({ ...t, count: tabCounts[t.key] })),
    [tabCounts],
  );

  return (
    <QueuePageShell
      activeKey='pharmacy'
      breadcrumb={breadcrumb}
      title='ระบบงานเภสัชกรรม'
      summaryCards={summaryCards}
      actions={<PharmacyAddDrugButton />}
      belowSummary={<PharmacySubNav />}
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
          style={PHARMACY_WORKLIST_CARD_BODY}
        >
          <StickyStatusTabBar
            tabs={statusTabs}
            value={activeTab}
            onChange={handleTabChange}
          />

          <div className='w-full flex items-start justify-center'>
            <PrimarySearch
              value={searchQ}
              onChange={(v) => setSearchQ(v)}
              onSubmit={(v) => setSearchQ(v)}
              placeholder='ค้นหาคิว / HN / ชื่อ-สกุลผู้ป่วย'
              width={640}
            />
          </div>

          <div className='flex items-center flex-wrap w-full' style={{ gap: 'var(--dim-space-300)' }}>
            <FilterDropdown
              prefix='ประเภท:'
              options={queueTypeOptions}
              value={queueTypeFilter}
              onChange={setQueueTypeFilter}
            />
            <FilterDropdown
              prefix='แพ้ยา / High Alert:'
              options={ALLERGY_FILTER_OPTIONS}
              value={allergyFilter}
              onChange={setAllergyFilter}
            />
            <FilterDropdown
              prefix='การชำระเงิน:'
              options={PAYMENT_FILTER_OPTIONS}
              value={paymentFilter}
              onChange={setPaymentFilter}
            />
            {/* Same chip shape as the filters it clears, and only present once
                there is something to clear. */}
            {filtersActive ? (
              <FilterTag
                variant='neutral'
                leadingIcon='close'
                value='ล้างตัวกรอง'
                showTitle={false}
                onClick={clearFilters}
              />
            ) : null}
          </div>

          <div className='flex flex-col' style={{ minHeight: 'calc(100vh - 460px)' }}>
            <Table
              columns={columns}
              rows={pageRows}
              rowKey={(row) => row.id}
              sortConfig={sortConfig}
              onSort={handleSort}
              stickyColCount={2}
              onRowClick={handleRowClick}
              stickyHeaderTop={QUEUE_STICKY_UNDER_STATUS_TABS}
              emptyMessage={filtersActive
                ? 'ไม่พบรายการที่ตรงกับตัวกรอง'
                : EMPTY_MESSAGE[activeTab] || 'ยังไม่มีรายการ'}
              emptySubtext={filtersActive ? 'ลองล้างตัวกรองหรือแก้คำค้นหา' : null}
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
            <Pagination currentPage={safePage} pageCount={totalPages} onPageChange={setPage} />
          </div>
        </div>
      </div>
    </QueuePageShell>
  );
};

export default PharmacyQueuePage;
