import React, { useMemo, useState } from 'react';
import QueuePageShell from '@/templates/QueuePageShell';
import Table from '@/components/table/Table';
import Badge from '@/components/badge/Badge';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import SuccessToast from '@/components/toast/SuccessToast';
import AlertDialog from '@/components/popup/AlertDialog';
import PrimarySearch from '@/components/search/PrimarySearch';
import useSearchHistory from '@/components/search/useSearchHistory';
import SearchResultCount from '@/components/search/SearchResultCount';
import FilterTag, { FilterDropdown } from '@/components/forms/FilterTag';
import {
  MAIN_WAREHOUSE_STOCK,
  SUB_STOCK_BY_WAREHOUSE,
  listSubWarehouses,
  getSubWarehouse,
  getSubStockMap,
  getDefaultDispenseWarehouseId,
  resolveSubWarehouseTags,
  allSubWarehouseRows,
  nearExpirySubWarehouseCount,
  BORROW_RETURN_RECORDS,
  BORROW_RETURN_TYPES,
  confirmBorrowReturnRequest,
  nearExpiryEntries,
  WAREHOUSE_STATUS_OPTIONS,
  getWarehouseOperatingStatus,
  setWarehouseOperatingStatus,
  reorderNeededEntries,
  REQUISITION_TARGETS,
  createRequisition,
} from '@/data/pharmacyQueue';
import {
  DRUG_CLASSIFICATIONS,
  getRegistryDrug,
  STOCK_SEARCH_HISTORY_KEY,
  buildDrugRegistrySearchHistorySeed,
  createDrugRecentSearchEntry,
} from '@/data/pharmacyRegistry';
import { resolveMedicationImage } from '@/data/medicationCatalog';
import { DEFAULT_CLINIC_VALUE } from '@/components/layout/HeaderClinicContext';
import PharmacySubNav, { PharmacyHeaderActions } from '@/components/pharmacy/PharmacySubNav';
import PharmacyBorrowReturnRequestButton from '@/components/pharmacy/PharmacyBorrowReturnRequestButton';
import PharmacySectionTopic from '@/components/pharmacy/PharmacySectionTopic';
import Topic from '@/components/topic/Topic';
import TabPill, { TabBar } from '@/components/tab/TabPill';
import { buildStockSummaryCards } from '@/pages/pharmacy/pharmacySummaryCards';
import { PHARMACY_WORKLIST_CARD, PHARMACY_WORKLIST_CARD_BODY } from '@/pages/pharmacy/pharmacyContentCard';

/* คลังยาและเวชภัณฑ์ (ToR §1.9.8-1.9.9) — คลังยาใหญ่ของศูนย์ + คลังยาย่อย
   ที่ตั้งชื่อได้ (แท็กจุดบริการ + แผนก). */

const breadcrumb = ['ระบบงานเภสัชกรรม', 'คลังยาและเวชภัณฑ์'];

const TABS = [
  { key: 'main', label: 'คลังยาใหญ่ของศูนย์', icon: 'warehouse'     },
  { key: 'sub',  label: 'คลังยาย่อย',           icon: 'inventory_2'   },
];

/* Left-rail width — HistoryListForm default (Figma 162:17951 / allergy MR column). */
const SUB_WAREHOUSE_ASIDE_WIDTH = 280;

const toRows = (stockMap) => Object.entries(stockMap).map(([name, entry]) => ({ name, ...entry }));

const isNearExpiry = (expiryDate, monthsAhead = 6) => {
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() + monthsAhead);
  return expiryDate <= cutoff.toISOString().slice(0, 10);
};

const formatThaiDate = (iso) => new Date(iso).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });

/* จุดสั่งซื้อ (reorder point — ToR §1.9.8.3 "รายการที่ต้องทำการเบิกกับกอง
   เภสัชกรรมเพิ่มเติม... จะมีการอ้างอิงจากการตั้งค่า minimum ของยาและ
   เวชภัณฑ์แต่ละรายการ") — flags stock below the registry's usageRate.reorderPoint. */
const isBelowReorderPoint = (name, stock) => {
  const reg = getRegistryDrug(name);
  return !!reg && stock < reg.usageRate.reorderPoint;
};

const drugImageSrc = (name) => {
  const reg = getRegistryDrug(name);
  return reg?.image || resolveMedicationImage(name, null) || '';
};

/* Name cell — thumbnail + label (same contract as ทะเบียนยา list). */
const StockDrugNameCell = ({ name }) => {
  const src = drugImageSrc(name);
  return (
    <div className='flex items-center min-w-0' style={{ gap: 'var(--dim-space-300)' }}>
      <div
        className='shrink-0 rounded-full overflow-hidden'
        style={{
          width: 'var(--dim-size-900, 36px)',
          height: 'var(--dim-size-900, 36px)',
          background: 'var(--surface-card-quaternary)',
        }}
      >
        {src ? (
          <img src={src} alt='' className='w-full h-full object-cover' />
        ) : null}
      </div>
      <span className='truncate min-w-0' style={{ fontWeight: 'var(--type-weight-medium, 500)' }}>
        {name}
      </span>
    </div>
  );
};

/* Sub-warehouse picker card — visual twin of HistoryListForm HistoryEntry
   (คัดกรองและซักประวัติ left rail). Whole card selects; no copy affordance. */
const SubWarehouseCard = ({ warehouse, selected, itemCount, onSelect }) => {
  const [hovered, setHovered] = useState(false);
  const tags = resolveSubWarehouseTags(warehouse);
  const status = getWarehouseOperatingStatus('sub', warehouse.id);
  const statusPill = WAREHOUSE_STATUS_PILL[status.status] || WAREHOUSE_STATUS_PILL.open;
  const detailParts = [tags.zone, tags.floor].filter(Boolean);
  const detail = detailParts.length
    ? detailParts.join(' · ')
    : `จุดบริการ ${tags.stationLabel}`;
  const emphasize = selected || hovered;
  const borderWidth = emphasize ? 'var(--dim-stroke-200)' : 'var(--dim-stroke-100)';
  const borderColor = selected
    ? 'var(--border-brandPrimary-default, #007549)'
    : hovered
      ? 'var(--border-brandPrimary-tertiary)'
      : 'var(--border-card-default)';
  const padCompensate = emphasize ? 0 : 1;

  return (
    <button
      type='button'
      onClick={() => onSelect(warehouse.id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-pressed={selected}
      aria-label={`เลือก${warehouse.name}`}
      className='w-full text-left flex flex-col'
      style={{
        gap: 'var(--dim-space-150, 6px)',
        background: 'var(--surface-card-100, #FFFFFF)',
        borderWidth,
        borderStyle: 'solid',
        borderColor,
        borderRadius: 'var(--dim-radius-400, 12px)',
        boxShadow: emphasize ? 'var(--shadow-card-hover)' : 'none',
        padding: `calc(var(--dim-space-300, 12px) + ${padCompensate}px)`,
        transition: 'border-color 150ms ease, box-shadow 150ms ease',
        cursor: 'pointer',
      }}
    >
      <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-050, 2px)' }}>
        <p
          className='leading-snug'
          style={{
            fontFamily: 'var(--type-family-heading-content, var(--type-family-body))',
            fontSize: 'var(--type-size-sm)',
            fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
            color: selected
              ? 'var(--text-brandPrimary-default, #007549)'
              : 'var(--text-content-primary)',
          }}
        >
          {warehouse.name}
        </p>
        <p
          className='leading-snug'
          style={{
            fontSize: 'var(--type-size-xs)',
            color: 'var(--text-content-secondary)',
          }}
        >
          {detail}
          {typeof itemCount === 'number' ? ` · ${itemCount} รายการ` : ''}
        </p>
      </div>
      <div className='flex flex-wrap items-center' style={{ gap: 'var(--dim-space-150)' }}>
        <span
          style={{
            fontSize: 'var(--type-size-xs)',
            color: 'var(--text-content-secondary)',
          }}
        >
          {`จุด: ${tags.stationLabel}`}
        </span>
        <span
          style={{
            fontSize: 'var(--type-size-xs)',
            color: 'var(--text-content-tertiary)',
          }}
          aria-hidden
        >
          ·
        </span>
        <span
          style={{
            fontSize: 'var(--type-size-xs)',
            color: 'var(--text-content-secondary)',
          }}
        >
          {`แผนก: ${tags.departmentLabel}`}
        </span>
        <Badge style={statusPill.style} size='small'>{statusPill.label}</Badge>
      </div>
    </button>
  );
};

const BASE_COLUMNS = [
  {
    key: 'name',
    label: 'ชื่อยา',
    flex: true,
    minWidth: 260,
    render: (r) => <StockDrugNameCell name={r.name} />,
  },
  { key: 'lot', label: 'Lot No.' },
  {
    key: 'stock', label: 'คงคลัง', align: 'center',
    render: (r) => (
      <div className='flex flex-col items-center' style={{ gap: 'var(--dim-space-050)' }}>
        <span>{r.stock.toLocaleString()} {r.unit}</span>
        {isBelowReorderPoint(r.name, r.stock) && <Badge style='error' size='small'>ต่ำกว่าจุดสั่งซื้อ</Badge>}
      </div>
    ),
  },
  { key: 'unitPrice', label: 'ราคา/หน่วย (บาท)', align: 'center', render: (r) => r.unitPrice },
  {
    key: 'expiryDate', label: 'วันหมดอายุ',
    render: (r) => (
      <div className='flex flex-col items-start' style={{ gap: 'var(--dim-space-050)' }}>
        <span>{formatThaiDate(r.expiryDate)}</span>
        {isNearExpiry(r.expiryDate) && <Badge style='warning' size='small'>ใกล้หมดอายุ</Badge>}
      </div>
    ),
  },
];

const MAIN_COLUMNS = [
  ...BASE_COLUMNS,
  { key: 'receivedFrom', label: 'รับจาก' },
  { key: 'receivedAt', label: 'วันที่รับเข้า', render: (r) => formatThaiDate(r.receivedAt) },
];

const BORROW_RETURN_STATUS_PILL = {
  pending:   { style: 'warning', label: 'รอดำเนินการ' },
  completed: { style: 'success', label: 'เสร็จสิ้น'    },
};

const WAREHOUSE_STATUS_PILL = {
  open:        { style: 'success', label: 'เปิดดำเนินการ' },
  maintenance: { style: 'warning', label: 'ปิดปรับปรุง'    },
  suspended:   { style: 'error',   label: 'ระงับชั่วคราว'  },
};

const REORDER_CHANNEL_LABEL = Object.fromEntries(REQUISITION_TARGETS.map((t) => [t.key, t.label]));
const BORROW_RETURN_TYPE_LABEL = Object.fromEntries(BORROW_RETURN_TYPES.map((t) => [t.key, t.label]));

const CLASSIFICATION_OPTIONS = [{ value: 'all', label: 'ทุกประเภทยา' }, ...DRUG_CLASSIFICATIONS.map((c) => ({ value: c.key, label: c.label }))];
const EXPIRY_OPTIONS = [
  { value: 'all', label: 'ทุกช่วงเวลาหมดอายุ' },
  { value: '3',   label: 'หมดอายุภายใน 3 เดือน' },
  { value: '6',   label: 'หมดอายุภายใน 6 เดือน' },
  { value: '12',  label: 'หมดอายุภายใน 12 เดือน' },
];
/* §1.9.9.4–5 ประวัติ filter — TOR names แลกล็อต / ยืมยา / ยาที่ต้องคืน. */
const BORROW_HISTORY_FILTER_OPTIONS = [
  { value: 'all', label: 'ทุกประเภท' },
  { value: 'borrow', label: 'ยืมยา' },
  { value: 'return', label: 'ยาที่ต้องคืน' },
  { value: 'lot-exchange', label: 'แลกล็อต' },
];
const BORROW_DIRECTION_FILTER_OPTIONS = [
  { value: 'all', label: 'ทั้งหมด' },
  { value: 'outgoing', label: 'ผู้ส่งคำร้อง' },
  { value: 'incoming', label: 'ผู้รับคำร้อง' },
];
const BORROW_DIRECTION_LABEL = {
  outgoing: 'ผู้ส่งคำร้อง',
  incoming: 'ผู้รับคำร้อง',
};

const STOCK_SEARCH_HISTORY_SEED = buildDrugRegistrySearchHistorySeed(5);

/* White status card on tinted panels (คลังยาย่อย right rail). */
const WAREHOUSE_STATUS_CARD = {
  background: 'var(--surface-card-100, #FFFFFF)',
  borderRadius: 'var(--dim-radius-400, 12px)',
  boxShadow: 'var(--shadow-card)',
  padding: 'var(--dim-space-400)',
  gap: 'var(--dim-space-300)',
};

const WarehouseStatusCard = ({ operatingStatus, onRequestStatusChange }) => (
  <div className='flex items-center flex-wrap w-full' style={WAREHOUSE_STATUS_CARD}>
    <span className='text-sm' style={{ color: 'var(--text-content-secondary)' }}>สถานะคลัง:</span>
    <Badge style={WAREHOUSE_STATUS_PILL[operatingStatus.status].style} size='small'>
      {WAREHOUSE_STATUS_PILL[operatingStatus.status].label}
    </Badge>
    <span className='text-xs' style={{ color: 'var(--text-content-tertiary)' }}>
      อัปเดตล่าสุดโดย {operatingStatus.updatedBy} ({formatThaiDate(operatingStatus.updatedAt)})
    </span>
    <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-150)', marginLeft: 'auto' }}>
      {WAREHOUSE_STATUS_OPTIONS.filter((o) => o.key !== operatingStatus.status).map((o) => (
        <NeutralSubdueButton key={o.key} size='sm' variant='outline' onClick={() => onRequestStatusChange(o.key)}>
          {o.label}
        </NeutralSubdueButton>
      ))}
    </div>
  </div>
);

/* Confirm copy per target status — open = info; maintenance/suspended = warning. */
const STATUS_CONFIRM_SPEC = {
  open: {
    type: 'info',
    title: 'เปิดดำเนินการคลังนี้?',
    confirmLabel: 'เปิดดำเนินการ',
    description: (name) => `ยืนยันเปลี่ยนสถานะ «${name}» เป็นเปิดดำเนินการ — คลังจะพร้อมจ่าย/เบิกตามปกติ`,
  },
  maintenance: {
    type: 'warning',
    title: 'ปิดปรับปรุงคลังนี้?',
    confirmLabel: 'ปิดปรับปรุง',
    description: (name) => `ยืนยันเปลี่ยนสถานะ «${name}» เป็นปิดปรับปรุง — การจ่าย/เบิกจากคลังนี้อาจถูกระงับชั่วคราว`,
  },
  suspended: {
    type: 'warning',
    title: 'ระงับชั่วคราวคลังนี้?',
    confirmLabel: 'ระงับชั่วคราว',
    description: (name) => `ยืนยันเปลี่ยนสถานะ «${name}» เป็นระงับชั่วคราว — คลังจะไม่พร้อมใช้งานจนกว่าจะเปิดอีกครั้ง`,
  },
};

const PharmacyStockPage = () => {
  const [activeTab, setActiveTab] = useState('main');
  const [subWarehouseId, setSubWarehouseId] = useState(() => getDefaultDispenseWarehouseId());
  const [search, setSearch] = useState('');
  const [classificationFilter, setClassificationFilter] = useState('all');
  const [expiryFilter, setExpiryFilter] = useState('all');
  const [renderTick, setRenderTick] = useState(0);
  const bump = () => setRenderTick((n) => n + 1);
  const [requestedNames, setRequestedNames] = useState(() => new Set());
  const [toastMessage, setToastMessage] = useState('');
  const [pendingStatus, setPendingStatus] = useState(null);
  const [pendingConfirmBorrow, setPendingConfirmBorrow] = useState(null);
  const [borrowHistoryTypeFilter, setBorrowHistoryTypeFilter] = useState('all');
  const [borrowDirectionFilter, setBorrowDirectionFilter] = useState('all');
  const [borrowSortConfig, setBorrowSortConfig] = useState({ key: null, direction: 'asc' });
  const {
    history: searchHistory,
    push: pushHistory,
    clear: clearHistory,
  } = useSearchHistory(STOCK_SEARCH_HISTORY_KEY, {
    seedIfEmpty: STOCK_SEARCH_HISTORY_SEED,
  });

  const selectedSubWarehouse = getSubWarehouse(subWarehouseId);
  const selectedSubTags = resolveSubWarehouseTags(selectedSubWarehouse);
  const activeSubStock = getSubStockMap(subWarehouseId);
  const subWarehouses = useMemo(() => listSubWarehouses(), [renderTick]);
  const statusConfirmWarehouseName = activeTab === 'main'
    ? 'คลังยาใหญ่ของศูนย์'
    : (selectedSubWarehouse?.name || 'คลังยาย่อย');
  const statusConfirmSpec = pendingStatus ? STATUS_CONFIRM_SPEC[pendingStatus] : null;

  const mainRows = useMemo(() => toRows(MAIN_WAREHOUSE_STOCK), []);
  /* All sub rows across warehouses — summary cards; table uses selected map. */
  const allSubRows = useMemo(() => allSubWarehouseRows(), [renderTick]);
  const selectedSubRows = useMemo(
    () => toRows(getSubStockMap(subWarehouseId)),
    [subWarehouseId, renderTick],
  );
  const rows = activeTab === 'main' ? mainRows : selectedSubRows;
  const columns = activeTab === 'main' ? MAIN_COLUMNS : BASE_COLUMNS;

  const filteredRows = useMemo(() => {
    let result = rows;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((r) => r.name.toLowerCase().includes(q) || r.lot.toLowerCase().includes(q) || (getRegistryDrug(r.name)?.code || '').toLowerCase().includes(q));
    }
    if (classificationFilter !== 'all') {
      result = result.filter((r) => getRegistryDrug(r.name)?.classification === classificationFilter);
    }
    if (expiryFilter !== 'all') {
      result = result.filter((r) => isNearExpiry(r.expiryDate, Number(expiryFilter)));
    }
    return result;
  }, [rows, search, classificationFilter, expiryFilter]);

  const nearExpiryMain = useMemo(() => nearExpiryEntries(MAIN_WAREHOUSE_STOCK).length, []);
  const nearExpirySub = useMemo(() => nearExpirySubWarehouseCount(6), [renderTick]);

  const belowReorderMain = useMemo(
    () => mainRows.filter((r) => isBelowReorderPoint(r.name, r.stock)).length,
    [mainRows],
  );
  const belowReorderSub = useMemo(
    () => allSubRows.filter((r) => isBelowReorderPoint(r.name, r.stock)).length,
    [allSubRows],
  );

  /* §1.9.8.1/§1.9.9.1 — main = center warehouse; sub = selected named warehouse. */
  const operatingStatus = getWarehouseOperatingStatus(activeTab, subWarehouseId);
  const handleConfirmOperatingStatus = () => {
    if (!pendingStatus) return;
    setWarehouseOperatingStatus(activeTab, pendingStatus, activeTab === 'sub' ? subWarehouseId : undefined);
    const label = WAREHOUSE_STATUS_PILL[pendingStatus]?.label || pendingStatus;
    setPendingStatus(null);
    setToastMessage(`เปลี่ยนสถานะ${statusConfirmWarehouseName}เป็น${label}แล้ว`);
    bump();
  };

  /* §1.9.9.5 — confirm incoming ยืม/คืน/แลกล็อต after AlertDialog. */
  const handleConfirmBorrowReturn = () => {
    if (!pendingConfirmBorrow?.id) return;
    const { id, type, drugName } = pendingConfirmBorrow;
    const row = confirmBorrowReturnRequest(id);
    setPendingConfirmBorrow(null);
    if (row) {
      const typeLabel = BORROW_RETURN_TYPE_LABEL[type] || type;
      setToastMessage(`ยืนยันคำร้อง${typeLabel} «${drugName}» แล้ว`);
      bump();
    }
  };

  /* §1.9.8.3/§1.9.9.3 — items below reorder point for the active stock map. */
  const reorderNeeded = useMemo(
    () => reorderNeededEntries(activeTab === 'main' ? MAIN_WAREHOUSE_STOCK : activeSubStock),
    [activeTab, activeSubStock, renderTick],
  );

  /* §1.9.8.3/§1.9.9.3 — "สามารถทำการเบิกกับกองเภสัชกรรมผ่านระบบอัตโนมัติ".
     Creates a real requisition line straight from the below-reorder-point
     row instead of only displaying which channel it would route to; the
     row is then tracked as requested so the action doesn't fire twice in
     the same session (requisition status/approval is tracked from
     PharmacyRequisitionPage as usual afterwards). */
  const handleAutoReorder = (row) => {
    const drug = getRegistryDrug(row.name);
    createRequisition({
      items: [{ drugName: row.name, quantity: Math.max(drug?.usageRate?.maxQty || row.reorderPoint * 2, row.reorderPoint) - row.stock, unit: row.unit }],
      requisitionType: 'urgent',
      notes: 'สร้างอัตโนมัติจากรายการต่ำกว่าจุดสั่งซื้อ (คลังยาและเวชภัณฑ์)',
      requestingCenter: DEFAULT_CLINIC_VALUE,
      targetUnit: row.channel,
    });
    setRequestedNames((prev) => new Set(prev).add(row.name));
    setToastMessage(`สร้างใบเบิก${REORDER_CHANNEL_LABEL[row.channel]}สำหรับ ${row.name} แล้ว`);
  };

  /* §1.9.9.4–5 — combined ผู้ส่ง/ผู้รับคำร้อง + ประวัติ (ยืม / คืน / แลกล็อต). */
  const borrowHistoryRows = useMemo(
    () => BORROW_RETURN_RECORDS
      .filter((r) => borrowDirectionFilter === 'all' || r.direction === borrowDirectionFilter)
      .filter((r) => borrowHistoryTypeFilter === 'all' || r.type === borrowHistoryTypeFilter),
    [borrowDirectionFilter, borrowHistoryTypeFilter, renderTick],
  );

  const handleBorrowSort = (key) => {
    setBorrowSortConfig((prev) => (
      prev.key === key
        ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'asc' }
    ));
  };

  const sortedBorrowHistoryRows = useMemo(() => {
    if (!borrowSortConfig.key) return borrowHistoryRows;
    const sign = borrowSortConfig.direction === 'desc' ? -1 : 1;
    const normalize = (row, key) => {
      switch (key) {
        case 'direction': return BORROW_DIRECTION_LABEL[row.direction] || row.direction || '';
        case 'type': return BORROW_RETURN_TYPE_LABEL[row.type] || row.type || '';
        case 'quantity': return Number(row.quantity) || 0;
        case 'status': return BORROW_RETURN_STATUS_PILL[row.status]?.label || row.status || '';
        case 'requestedAt': return row.requestedAt || '';
        case 'requestedBy': return row.requestedBy || '';
        case 'counterpartCenter': return row.counterpartCenter || '';
        case 'drugName': return row.drugName || '';
        default: return row[key] ?? '';
      }
    };
    const collator = new Intl.Collator('th', { numeric: true, sensitivity: 'base' });
    return [...borrowHistoryRows].sort((a, b) => {
      const av = normalize(a, borrowSortConfig.key);
      const bv = normalize(b, borrowSortConfig.key);
      const primary = typeof av === 'number' && typeof bv === 'number'
        ? av - bv
        : collator.compare(String(av), String(bv));
      return sign * primary;
    });
  }, [borrowHistoryRows, borrowSortConfig]);

  const summaryCards = useMemo(
    () => buildStockSummaryCards({
      mainRows,
      subRows: allSubRows,
      nearExpiryMain,
      nearExpirySub,
      belowReorderMain,
      belowReorderSub,
      subWarehouseCount: listSubWarehouses().length,
    }),
    [mainRows, allSubRows, nearExpiryMain, nearExpirySub, belowReorderMain, belowReorderSub],
  );

  const tabCounts = useMemo(
    () => ({ main: mainRows.length, sub: allSubRows.length }),
    [mainRows.length, allSubRows.length],
  );

  const filtersActive = search.trim() !== ''
    || classificationFilter !== 'all'
    || expiryFilter !== 'all';

  const clearFilters = () => {
    setSearch('');
    setClassificationFilter('all');
    setExpiryFilter('all');
  };

  return (
    <QueuePageShell
      activeKey='pharmacy'
      breadcrumb={breadcrumb}
      title='ระบบงานเภสัชกรรม'
      summaryCards={summaryCards}
      actions={(
        <PharmacyHeaderActions
          borrowReturnProps={{
            onOpen: () => setActiveTab('sub'),
            onCreated: () => bump(),
          }}
        />
      )}
      belowSummary={<PharmacySubNav />}
    >
      <div
        className='flex flex-col flex-1 min-w-0'
        style={{ padding: 'var(--dim-space-600)', gap: 'var(--dim-space-600)' }}
      >
        <div
          className='w-full flex flex-col'
          style={PHARMACY_WORKLIST_CARD_BODY}
        >
          <TabBar aria-label='เลือกคลังยา' align='center' className='self-center shrink-0 max-w-full'>
            {TABS.map((t) => (
              <TabPill
                key={t.key}
                size='large'
                selected={activeTab === t.key}
                leadingIcon={t.icon}
                count={tabCounts[t.key]}
                onClick={() => setActiveTab(t.key)}
              >
                {t.label}
              </TabPill>
            ))}
          </TabBar>

          {activeTab === 'main' ? (
            <>
              {/* §1.9.8.1 — สถานะการทำงานของคลังยาใหญ่. */}
              <WarehouseStatusCard
                operatingStatus={operatingStatus}
                onRequestStatusChange={setPendingStatus}
              />
              <div className='w-full flex items-start justify-center'>
                <PrimarySearch
                  value={search}
                  onChange={setSearch}
                  onSubmit={(v, item) => {
                    const entry = createDrugRecentSearchEntry(v, item);
                    if (entry) pushHistory(entry);
                    setSearch(v);
                  }}
                  placeholder='ค้นหาชื่อยา / รหัสยา / Lot No.'
                  width={640}
                  history={searchHistory}
                  onHistoryClear={searchHistory.length > 0 ? clearHistory : undefined}
                />
              </div>

              <div className='flex items-center flex-wrap w-full' style={{ gap: 'var(--dim-space-300)' }}>
                <FilterDropdown
                  prefix='ประเภทยา :'
                  options={CLASSIFICATION_OPTIONS}
                  value={classificationFilter}
                  onChange={setClassificationFilter}
                />
                <FilterDropdown
                  prefix='วันหมดอายุ :'
                  options={EXPIRY_OPTIONS}
                  value={expiryFilter}
                  onChange={setExpiryFilter}
                />
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

              <SearchResultCount found={filteredRows.length} total={rows.length} />

              <Table columns={columns} rows={filteredRows} rowKey={(r) => r.name} stickyColCount={1} emptyMessage='ไม่พบรายการยาที่ตรงกับเงื่อนไข' />
            </>
          ) : (
            /* §1.9.9 — คลังยาย่อย: left rail cards (HistoryListForm pattern) + right drug list. */
            <div
              className='flex w-full min-h-0 items-stretch'
              style={{ gap: 'var(--dim-space-600)', minHeight: 'var(--dim-size-2800, 512px)' }}
            >
              <aside
                className='flex min-h-0 shrink-0 flex-col self-stretch'
                style={{
                  width: `${SUB_WAREHOUSE_ASIDE_WIDTH}px`,
                  background: 'var(--surface-brandPrimary-quaternary)',
                  border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
                  borderRadius: 'var(--dim-radius-400, 12px)',
                  padding: 'var(--dim-space-600)',
                  gap: 'var(--dim-space-400)',
                }}
              >
                <Topic
                  hierarchy='tertiary'
                  title='คลังยาย่อย'
                  subText='เลือกคลังเพื่อดูรายการยาทางด้านขวา'
                  showBadge={false}
                  showSuccess={false}
                  showLeadingIcon={false}
                  showChevron={false}
                />
                <div
                  className='flex min-h-0 flex-1 flex-col overflow-y-auto scrollbar-thin'
                  style={{ gap: 'var(--dim-space-200)' }}
                  role='listbox'
                  aria-label='รายการคลังยาย่อย'
                >
                  {subWarehouses.map((w) => (
                    <SubWarehouseCard
                      key={w.id}
                      warehouse={w}
                      selected={w.id === subWarehouseId}
                      itemCount={Object.keys(getSubStockMap(w.id)).length}
                      onSelect={setSubWarehouseId}
                    />
                  ))}
                </div>
              </aside>

              <div
                className='flex min-h-0 min-w-0 flex-1 flex-col self-stretch'
                style={{
                  padding: 'var(--dim-space-600)',
                  background: 'var(--surface-neutral-quaternary)',
                  border: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary)',
                  borderRadius: 'var(--dim-radius-400, 12px)',
                  gap: 'var(--dim-space-400)',
                }}
              >
                <div style={{ paddingInline: 'var(--dim-space-100)' }}>
                  <Topic
                    hierarchy='tertiary'
                    title={selectedSubWarehouse?.name || 'รายการยาในคลัง'}
                    subText={
                      `จุด: ${selectedSubTags.stationLabel} · แผนก: ${selectedSubTags.departmentLabel}`
                      + ((selectedSubTags.zone || selectedSubTags.floor)
                        ? ` · ${[selectedSubTags.zone, selectedSubTags.floor].filter(Boolean).join(' · ')}`
                        : '')
                    }
                    showBadge={false}
                    showSuccess={false}
                    showLeadingIcon={false}
                    showChevron={false}
                  />
                </div>

                {/* §1.9.9.1 — สถานะการทำงานของคลังย่อยที่เลือก. */}
                <WarehouseStatusCard
                  operatingStatus={operatingStatus}
                  onRequestStatusChange={setPendingStatus}
                />

                <div className='w-full flex items-start justify-center'>
                  <PrimarySearch
                    value={search}
                    onChange={setSearch}
                    onSubmit={(v, item) => {
                      const entry = createDrugRecentSearchEntry(v, item);
                      if (entry) pushHistory(entry);
                      setSearch(v);
                    }}
                    placeholder='ค้นหาชื่อยา / รหัสยา / Lot No.'
                    width={560}
                    history={searchHistory}
                    onHistoryClear={searchHistory.length > 0 ? clearHistory : undefined}
                  />
                </div>

                <div className='flex items-center flex-wrap w-full' style={{ gap: 'var(--dim-space-300)' }}>
                  <FilterDropdown
                    prefix='ประเภทยา :'
                    options={CLASSIFICATION_OPTIONS}
                    value={classificationFilter}
                    onChange={setClassificationFilter}
                  />
                  <FilterDropdown
                    prefix='วันหมดอายุ :'
                    options={EXPIRY_OPTIONS}
                    value={expiryFilter}
                    onChange={setExpiryFilter}
                  />
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

                <SearchResultCount found={filteredRows.length} total={rows.length} />

                <Table columns={columns} rows={filteredRows} rowKey={(r) => r.name} stickyColCount={1} emptyMessage='ไม่พบรายการยาที่ตรงกับเงื่อนไข' />
              </div>
            </div>
          )}
        </div>

        {/* §1.9.8.3/§1.9.9.3 — รายการที่ต้องเบิกเพิ่มเติม, split by channel:
            NLEM → กองเภสัชกรรม (the standard §1.9.6 requisition flow),
            non-NLEM → สปสช. (extra funding request). */}
        <div
          className='w-full flex flex-col'
          style={{ ...PHARMACY_WORKLIST_CARD, padding: 'var(--dim-space-600)', gap: 'var(--dim-space-300)' }}
        >
          <PharmacySectionTopic title='รายการที่ต้องเบิกเพิ่มเติม' />
          <Table
            columns={[
              {
                key: 'name',
                label: 'ชื่อยา',
                flex: true,
                minWidth: 260,
                render: (r) => <StockDrugNameCell name={r.name} />,
              },
              { key: 'stock', label: 'คงคลัง', align: 'center', render: (r) => `${r.stock.toLocaleString()} ${r.unit}` },
              { key: 'reorderPoint', label: 'จุดสั่งซื้อ', align: 'center', render: (r) => r.reorderPoint.toLocaleString() },
              { key: 'channel', label: 'เบิกจาก', render: (r) => <Badge style='warning' size='small'>{REORDER_CHANNEL_LABEL[r.channel]}</Badge> },
              {
                key: 'autoReorder', label: 'ดำเนินการ', align: 'center', sortable: false,
                render: (r) => requestedNames.has(r.name) ? (
                  <Badge style='success' size='small'>ส่งใบเบิกแล้ว</Badge>
                ) : (
                  <NeutralSubdueButton size='sm' variant='outline' leadingIcon='bolt' onClick={() => handleAutoReorder(r)}>เบิกอัตโนมัติ</NeutralSubdueButton>
                ),
              },
            ]}
            rows={reorderNeeded}
            rowKey={(r) => r.name}
            emptyMessage='ไม่มีรายการที่ต่ำกว่าจุดสั่งซื้อ'
          />
        </div>

        {activeTab === 'sub' && (
          /* §1.9.9.4–5 — ผู้ส่ง/ผู้รับคำร้อง + ประวัติ ในตารางเดียว */
          <div
            className='w-full flex flex-col'
            style={{ ...PHARMACY_WORKLIST_CARD, padding: 'var(--dim-space-600)', gap: 'var(--dim-space-300)' }}
          >
            <PharmacySectionTopic
              title='ประวัติคำร้องยืม–คืน–แลกล็อตระหว่างศูนย์'
              trailing={(
                <PharmacyBorrowReturnRequestButton
                  size='sm'
                  label='สร้างคำร้อง'
                  onCreated={() => bump()}
                />
              )}
            />
            <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-300)' }}>
              <FilterDropdown
                prefix='บทบาท :'
                options={BORROW_DIRECTION_FILTER_OPTIONS}
                value={borrowDirectionFilter}
                onChange={setBorrowDirectionFilter}
              />
              <FilterDropdown
                prefix='ประวัติ :'
                options={BORROW_HISTORY_FILTER_OPTIONS}
                value={borrowHistoryTypeFilter}
                onChange={setBorrowHistoryTypeFilter}
              />
            </div>
            <Table
              columns={[
                {
                  key: 'direction',
                  label: 'บทบาท',
                  render: (r) => (
                    <Badge style={r.direction === 'outgoing' ? 'info' : 'neutral'} size='small'>
                      {BORROW_DIRECTION_LABEL[r.direction]}
                    </Badge>
                  ),
                },
                { key: 'type', label: 'ประเภท', render: (r) => <Badge style={r.type === 'borrow' ? 'info' : r.type === 'return' ? 'success' : 'warning'} size='small'>{BORROW_RETURN_TYPE_LABEL[r.type]}</Badge> },
                { key: 'drugName', label: 'ชื่อยา', flex: true, minWidth: 180 },
                { key: 'quantity', label: 'จำนวน', align: 'center', render: (r) => `${r.quantity} ${r.unit}` },
                { key: 'requestedBy', label: 'ชื่อผู้สร้างคำร้อง', flex: true, minWidth: 180, render: (r) => r.requestedBy || '—' },
                { key: 'counterpartCenter', label: 'ศูนย์บริการคู่กรณี', flex: true, minWidth: 200 },
                { key: 'requestedAt', label: 'วันที่ทำรายการ', render: (r) => formatThaiDate(r.requestedAt) },
                { key: 'status', label: 'สถานะ', render: (r) => <Badge style={BORROW_RETURN_STATUS_PILL[r.status].style} size='small'>{BORROW_RETURN_STATUS_PILL[r.status].label}</Badge> },
                {
                  key: 'itemActions', label: 'ดำเนินการ', align: 'center', sortable: false,
                  render: (r) => (r.direction === 'incoming' && r.status === 'pending') ? (
                    <BrandSubdueButton size='sm' variant='fill' onClick={() => setPendingConfirmBorrow(r)}>
                      ยืนยัน
                    </BrandSubdueButton>
                  ) : '—',
                },
              ]}
              rows={sortedBorrowHistoryRows}
              rowKey={(r) => r.id}
              sortConfig={borrowSortConfig}
              onSort={handleBorrowSort}
              emptyMessage='ไม่มีประวัติคำร้อง'
            />
          </div>
        )}
      </div>
      <SuccessToast open={!!toastMessage} message={toastMessage} onClose={() => setToastMessage('')} />
      <AlertDialog
        open={Boolean(pendingStatus && statusConfirmSpec)}
        type={statusConfirmSpec?.type || 'info'}
        alignment='center'
        title={statusConfirmSpec?.title || ''}
        description={statusConfirmSpec ? statusConfirmSpec.description(statusConfirmWarehouseName) : ''}
        confirmLabel={statusConfirmSpec?.confirmLabel || 'ยืนยัน'}
        cancelLabel='ยกเลิก'
        onConfirm={handleConfirmOperatingStatus}
        onCancel={() => setPendingStatus(null)}
        onClose={() => setPendingStatus(null)}
      />
      <AlertDialog
        open={Boolean(pendingConfirmBorrow)}
        type='info'
        alignment='center'
        title='ยืนยันคำร้องนี้?'
        description={pendingConfirmBorrow
          ? `ยืนยันรับคำร้อง${BORROW_RETURN_TYPE_LABEL[pendingConfirmBorrow.type] || ''} «${pendingConfirmBorrow.drugName}» จำนวน ${pendingConfirmBorrow.quantity} ${pendingConfirmBorrow.unit} จาก ${pendingConfirmBorrow.counterpartCenter}`
          : ''}
        confirmLabel='ยืนยัน'
        cancelLabel='ยกเลิก'
        onConfirm={handleConfirmBorrowReturn}
        onCancel={() => setPendingConfirmBorrow(null)}
        onClose={() => setPendingConfirmBorrow(null)}
      />
    </QueuePageShell>
  );
};

export default PharmacyStockPage;
