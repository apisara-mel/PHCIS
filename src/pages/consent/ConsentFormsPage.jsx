import React, { useEffect, useMemo, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import QueuePageShell, { QUEUE_STICKY_UNDER_TABS } from '@/templates/QueuePageShell';
import { SummaryCard } from '@/components/layout/SummaryCardsBar';
import PrimarySearch from '@/components/search/PrimarySearch';
import useSearchHistory from '@/components/search/useSearchHistory';
import { FilterDropdown } from '@/components/forms/FilterTag';
import ClearFiltersTag, { SmoothFilterResults } from '@/components/forms/ClearFiltersTag';
import useSmoothClearFilters from '@/hooks/useSmoothClearFilters';
import FilterDateTag from '@/components/forms/FilterDateTag';
import Table, { EllipsisText } from '@/components/table/Table';
import Pagination from '@/components/pagination/Pagination';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import Tooltip from '@/components/tooltip/Tooltip';
import BrandButton from '@/components/button/BrandButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import NeutralSubdueIconButton from '@/components/button/NeutralSubdueIconButton';
import Icon from '@/components/icons/Icon';
import ViewToggle from '@/components/toggle/ViewToggle';
import Switch from '@/components/switch/Switch';
import AlertDialog from '@/components/popup/AlertDialog';
import PhcisTopToast from '@/components/alert/PhcisTopToast';
import {
  CONSENT_FORM_RECORDS, buildConsentFormSummary, CONSENT_FORM_TABS,
  CONSENT_FORM_STATUS,
} from '@/data/consentFormRecords';
import {
  CONSENT_FORM_DRAFTS_EVENT,
  getMergedConsentFormRecords,
} from '@/data/consentFormDraftStore';
import { logExport } from '@/data/consentWorkflowStore';
import { downloadConsentFormPdf } from '@/data/consentFormDownload';
import { matchesDateFilter } from '@/data/financePaymentPrototype';
import { VersionHistoryPopup, bumpVersion } from '@/pages/consent/consentVersionHistory';
import { ConsentFormEditPopup } from '@/pages/consent/CreateConsentFormPage';
import { ConsentFormViewPopup } from '@/pages/consent/ConsentFormViewPopup';
import FormAccessViewPopup from '@/components/consent/FormAccessViewPopup';
import { CONSENT_SCOPE_DEPTS, resolveRecordPositions } from '@/data/consentFormScopes';
import CONSENT_NAV from '@/pages/consent/consentNav';

/* PHCIS | Consent — แบบฟอร์มความยินยอม (Figma 291:113045 · flow 277:150901).
   Consent-form TEMPLATE registry: summary cards · tabs · search ·
   table with view / print / edit actions. Mirrors the consent registry page
   so the system stays consistent. Tokens aliased; copy Thai; data mock. */

const PAGE_SIZE = 20;
const breadcrumb = ['แบบฟอร์มความยินยอม'];

const recordScopes = (row) => (
  row.scopes?.length
    ? row.scopes
    : [{ group: row.group, subBranch: row.subBranch, dept: row.dept }]
);

const DRAFT_TAB_SORT = { key: 'updatedDate', direction: 'desc' };

/** Sort key for แท็บที่ร่างไว้ — user drafts use ISO `draftSavedAt`. */
const consentFormUpdatedAtMs = (row) => {
  if (row.draftSavedAt) {
    const t = Date.parse(row.draftSavedAt);
    if (!Number.isNaN(t)) return t;
  }
  return typeof row.id === 'number' ? row.id : 0;
};

const sortRowsByUpdatedDate = (rows, direction = 'desc') => {
  const sign = direction === 'desc' ? -1 : 1;
  return [...rows].sort((a, b) => {
    const ta = consentFormUpdatedAtMs(a);
    const tb = consentFormUpdatedAtMs(b);
    if (ta !== tb) return sign * (ta - tb);
    return sign * ((b.id ?? 0) - (a.id ?? 0));
  });
};

const TEXT_CELL = {
  color: 'var(--text-content-default)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm)',
  fontWeight: 'var(--type-weight-regular)',
  lineHeight: 1.5,
};
const MUTED_CELL = { ...TEXT_CELL, color: 'var(--text-content-tertiary)' };

/* White content card — table card + each grid group (Figma p-24 · r-16). */
const CARD_STYLE = {
  background: 'var(--surface-card-100)',
  borderRadius: 'var(--dim-radius-500)',
  border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
  boxShadow: 'var(--shadow-card)',
  padding: 'var(--dim-space-600)',
};

const Cell = ({ value }) =>
  value && value !== '-'
    ? <span style={TEXT_CELL}>{value}</span>
    : <span style={MUTED_CELL}>-</span>;

const AccessCell = ({ row, onView }) => (
  <NeutralSubdueButton
    leadingIcon='lock_person'
    variant='outline'
    size='sm'
    onClick={() => onView(row)}
  >
    ผู้ที่มีสิทธิ์เข้าถึง
  </NeutralSubdueButton>
);

/* Cover illustration baked from Figma (PHCIS | Consent 356:111486). */
const GRID_COVER = '/illustration/consent/form-cover-01.png';


/* Grid-view card (Figma 336:170901) — cover illustration + type/version badge,
   title, code, and ดู / พิมพ์ / แก้ไข actions.
   กว้างเต็ม track ของ grid — เดิมกว้างคงที่ 240px เพราะอยู่ใน carousel
   แนวนอน ซึ่งถอดออกแล้ว (มติผู้ใช้ 25 ส.ค. 69) */
const FormGridCard = ({ row, onView, onEdit }) => (
  <div
    className='flex flex-col'
    style={{ width: '100%', background: 'var(--surface-card-100)', border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)', borderRadius: 'var(--dim-radius-400)', boxShadow: 'var(--shadow-card)', overflow: 'hidden' }}
  >
    <div style={{ width: '100%', height: 132, background: 'var(--surface-brandPrimary-quaternary)' }}>
      <img src={GRID_COVER} alt='' aria-hidden draggable={false} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
    </div>
    <div className='flex flex-col' style={{ padding: 'var(--dim-space-400)', gap: 'var(--dim-space-300)' }}>
      <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-100)' }}>
        <ColorfulBadge style='orange' size='small' hierarchy='secondary' width='hug'>{row.version.replace(/^V\s*/, '')}</ColorfulBadge>
      </div>
      <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-100)' }}>
        <span className='line-clamp-2' title={row.name} style={{ color: 'var(--text-content-default)', fontFamily: 'var(--type-family-heading-graphic2)', fontSize: 'var(--type-size-sm)', lineHeight: 1.4, minHeight: '2.8em' }}>{row.name}</span>
        <span style={{ ...MUTED_CELL, fontSize: 'var(--type-size-xs)' }}>{row.code}</span>
      </div>
      <div className='flex items-center' style={{ gap: 'var(--dim-space-150)', paddingTop: 'var(--dim-space-300)', borderTop: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)' }}>
        <NeutralSubdueIconButton icon='visibility' variant='outline' size='sm' aria-label='ดูแบบฟอร์ม' title='ดูแบบฟอร์ม' onClick={onView} />
        <NeutralSubdueIconButton icon='print' variant='outline' size='sm' aria-label='พิมพ์' title='พิมพ์' />
        <NeutralSubdueButton leadingIcon='edit' size='sm' onClick={onEdit}>แก้ไข</NeutralSubdueButton>
      </div>
    </div>
  </div>
);

export default function ConsentFormsPage() {
  const navigate = useHistory();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(() => {
    const tab = new URLSearchParams(location.search || '').get('tab');
    return tab && CONSENT_FORM_TABS.some((t) => t.value === tab) ? tab : 'review';
  });
  const [search, setSearch] = useState('');
  const [filterGroup, setFilterGroup] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterCreator, setFilterCreator] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDate, setFilterDate] = useState({ quick: 'thismonth' });

  const filtersActive = search.trim() !== '' || !!filterGroup || !!filterDept || !!filterCreator || !!filterStatus || (filterDate?.quick && filterDate.quick !== 'thismonth');
  const { showClearChip, resultsOpaque, clearFilters } = useSmoothClearFilters(filtersActive, () => {
    setSearch(''); setFilterGroup(''); setFilterDept(''); setFilterCreator(''); setFilterStatus(''); setFilterDate({ quick: 'thismonth' }); setPage(1);
  });
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'grid'
  const [page, setPage] = useState(1);
  const [sortConfig, setSortConfig] = useState(() => {
    const tab = new URLSearchParams(location.search || '').get('tab');
    return tab === 'draft' ? DRAFT_TAB_SORT : { key: null, direction: 'asc' };
  });
  /* ด.1.1.5 Version Control + ด.1.1.15 ดาวน์โหลด PDF */
  const [versionFor, setVersionFor] = useState(null);   // record → VersionHistoryPopup
  const [bumpFor, setBumpFor] = useState(null);         // published record → บังคับ bump
  const [editFor, setEditFor] = useState(null);         // { record, newVersion } → ConsentFormEditPopup
  const [viewFor, setViewFor] = useState(null);         // record → ConsentFormViewPopup
  const [accessViewFor, setAccessViewFor] = useState(null);
  const [statusOverrides, setStatusOverrides] = useState({});
  const [statusConfirm, setStatusConfirm] = useState(null);
  const [toast, setToast] = useState(null);
  const [draftRev, setDraftRev] = useState(0);
  const { history: searchHistory, push: pushHistory, clear: clearHistory } =
    useSearchHistory('mih:primarysearch-history:consent-forms');

  useEffect(() => {
    const refresh = () => setDraftRev((v) => v + 1);
    window.addEventListener('storage', refresh);
    window.addEventListener(CONSENT_FORM_DRAFTS_EVENT, refresh);
    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener(CONSENT_FORM_DRAFTS_EVENT, refresh);
    };
  }, []);

  useEffect(() => {
    const tab = new URLSearchParams(location.search || '').get('tab');
    if (tab && CONSENT_FORM_TABS.some((t) => t.value === tab)) {
      setActiveTab(tab);
      setPage(1);
      if (tab === 'draft') setSortConfig(DRAFT_TAB_SORT);
    }
  }, [location.search]);

  const allRecords = useMemo(() => (
    getMergedConsentFormRecords(CONSENT_FORM_RECORDS).map((record) => ({
      ...record,
      status: statusOverrides[record.id] || record.status,
    }))
  ), [draftRev, statusOverrides]);

  const summaryCards = useMemo(
    () => buildConsentFormSummary(allRecords),
    [allRecords],
  );

  const searchSuggestions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return allRecords
      .filter((r) => `${r.code} ${r.name} ${r.group || ''} ${r.type || ''}`.toLowerCase().includes(q))
      .slice(0, 8)
      .map((r) => ({
        id: String(r.id),
        label: r.name,
        value: r.name,
        sublabel: [r.code, r.type, r.group].filter(Boolean).join(' · '),
        badges: [{ label: r.code, tone: 'teal' }],
      }));
  }, [search, allRecords]);

  const tabs = useMemo(() => CONSENT_FORM_TABS.map((t) => ({
    key: t.value,
    label: t.label,
    icon: t.icon,
    count: t.value === 'all'
      ? allRecords.length
      : allRecords.filter((r) => (CONSENT_FORM_STATUS[r.status] || {}).tab === t.value).length,
  })), [allRecords]);

  const groupOptions = useMemo(() => [
    { value: '', label: 'ทุกบทบาท' },
    ...[...new Set(allRecords.flatMap((record) => resolveRecordPositions(record)))]
      .map((role) => ({ value: role, label: role })),
  ], [allRecords]);
  const deptOptions = useMemo(() => [
    { value: '', label: 'ทุกแผนก' },
    ...CONSENT_SCOPE_DEPTS.map((d) => ({ value: d, label: d })),
  ], []);
  const statusOptions = useMemo(() => [
    { value: '', label: 'ทุกสถานะ' },
    ...Object.keys(CONSENT_FORM_STATUS).map((s) => ({ value: s, label: s })),
  ], []);
  const creatorOptions = useMemo(() => [
    { value: '', label: 'ทุกคน' },
    ...[...new Set(allRecords.map((r) => r.updatedBy || r.creator))].map((c) => ({ value: c, label: c })),
  ], [allRecords]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allRecords.filter((r) => {
      const meta = CONSENT_FORM_STATUS[r.status] || {};
      const scopes = recordScopes(r);
      return (
        (activeTab === 'all' || meta.tab === activeTab) &&
        (!filterGroup || resolveRecordPositions(r).includes(filterGroup)) &&
        (!filterDept || scopes.some((s) => s.dept === filterDept)) &&
        (!filterStatus || r.status === filterStatus) &&
        (!filterCreator || (r.updatedBy || r.creator) === filterCreator) &&
        matchesDateFilter(r.createdDate, filterDate) &&
        (!q || r.name.toLowerCase().includes(q) || r.code.toLowerCase().includes(q) || (r.group || '').toLowerCase().includes(q))
      );
    });
  }, [activeTab, search, filterGroup, filterDept, filterStatus, filterCreator, filterDate, allRecords]);

  const handleSort = (key) => setSortConfig((prev) => (
    prev.key === key
      ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
      : { key, direction: 'asc' }
  ));

  const sorted = useMemo(() => {
    const { key, direction } = sortConfig;
    const sign = direction === 'desc' ? -1 : 1;
    const copy = filtered.slice();

    if (activeTab === 'draft' && (!key || key === 'updatedDate')) {
      return sortRowsByUpdatedDate(copy, key ? direction : 'desc');
    }

    if (!key) return copy.sort((a, b) => a.id - b.id);
    copy.sort((a, b) => {
      const av = String(a[key] ?? ''); const bv = String(b[key] ?? '');
      const primary = av.localeCompare(bv, 'th');
      return primary !== 0 ? sign * primary : a.id - b.id;
    });
    return copy;
  }, [filtered, sortConfig, activeTab]);

  /* Grid mode — แบบฟอร์ม PDPA ทั้งหมดใน carousel เดียว */
  const grouped = useMemo(() => (
    sorted.length ? [{ type: 'PDPA', rows: sorted }] : []
  ), [sorted]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const rangeStart = sorted.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(safePage * PAGE_SIZE, sorted.length);

  const handleSubmit = (value, item) => {
    const q = (item?.value || item?.label || value || '').trim();
    if (q) pushHistory(item?.badges ? item : { label: q, value: q });
    setSearch(q); setPage(1);
  };

  /* ด.1.1.5 — สร้างเวอร์ชันใหม่: เปิด wizard ใน popup (prefill + bump) */
  const goCreateVersion = (row) => {
    setEditFor({ record: row, newVersion: true });
  };

  /* แก้ไข: เทมเพลตที่เผยแพร่แล้วบังคับ bump — ร่าง/รอตรวจสอบแก้ตรงได้ — เปิด popup */
  const handleEdit = (row) => {
    if (row.isUserDraft) {
      navigate.push(`/consent/forms/new?draftId=${row.id}`);
      return;
    }
    if (row.status === 'เผยแพร่') setBumpFor(row);
    else setEditFor({ record: row, newVersion: false });
  };

  /* ด.1.1.15 — ดาวน์โหลด PDF เพื่อพิมพ์ให้ลงนาม (export → เก็บ log) */
  const handleDownloadPdf = async (row) => {
    try {
      const filename = await downloadConsentFormPdf(row);
      logExport({ source: `${row.code} ${row.name}`, format: 'pdf' });
      setToast({ id: Date.now(), variant: 'success', message: `ดาวน์โหลด ${filename} แล้ว — ระบบบันทึก log การส่งออกข้อมูล` });
    } catch {
      setToast({ id: Date.now(), variant: 'error', message: 'ไม่สามารถดาวน์โหลด PDF ได้ — ลองใหม่อีกครั้ง' });
    }
  };

  /* ปุ่มไอคอนล้วนต้องมีคำอธิบายตอน hover (มติผู้ใช้ 25 ส.ค. 69) — title ของ
     เบราว์เซอร์ขึ้นช้าและสไตล์ไม่ตรงระบบ จึงห่อด้วย <Tooltip> ของ DS
     variant='light' = พื้นขาว (มติผู้ใช้ 25 ส.ค. 69)
     (aria-label ยังอยู่ครบสำหรับ screen reader) */
  const IconAction = ({ hint, ...props }) => (
    <Tooltip content={hint} position='top' variant='light'>
      <span className='inline-flex shrink-0'>
        <NeutralSubdueIconButton variant='outline' size='sm' aria-label={hint} {...props} />
      </span>
    </Tooltip>
  );

  const renderAction = (row) => (
    <div
      className='flex items-center justify-end flex-wrap shrink-0'
      style={{ gap: 'var(--dim-space-150)' }}
    >
      <IconAction icon='visibility' hint='ดูแบบฟอร์ม' onClick={() => setViewFor(row)} />
      {/* แชร์/ส่งออกทางอีเมล — ซ่อนไว้จนกว่าฟีเจอร์จะเผยแพร่ */}
      <IconAction icon='history' hint='ประวัติเวอร์ชัน (Version Control)' onClick={() => setVersionFor(row)} />
      <IconAction icon='download' hint='ดาวน์โหลด PDF (เก็บ log)' onClick={() => handleDownloadPdf(row)} />
      <IconAction icon='print' hint='พิมพ์ (ไม่เก็บ log)' onClick={() => window.print?.()} />
      <NeutralSubdueButton leadingIcon='edit' size='sm' className='shrink-0' onClick={() => handleEdit(row)}>แก้ไข</NeutralSubdueButton>
    </div>
  );

  /* Column widths — ชื่อแบบฟอร์ม fixed; EllipsisText + tooltip สำหรับชื่อยาว.
     แท็บ "ที่ร่างไว้" — วันที่อัปเดตล่าสุดอยู่คอลัมน์แรก. */
  const columns = useMemo(() => {
    const updatedDateCol = {
      key: 'updatedDate',
      header: 'วันที่อัปเดตล่าสุด',
      sortable: true,
      render: (r) => <Cell value={r.updatedDate} />,
    };
    const leading = [
      { key: 'code', header: 'รหัสแบบฟอร์ม', sortable: true, render: (r) => <Cell value={r.code} /> },
      {
        key: 'name', header: 'ชื่อแบบฟอร์ม', sortable: true,
        render: (r) => (
          <div className='min-w-0 w-full' style={TEXT_CELL}>
            <EllipsisText text={r.name || '-'} />
          </div>
        ),
      },
      {
        key: 'version', header: 'เวอร์ชั่น',
        render: (r) => <ColorfulBadge style='blue' size='small' hierarchy='secondary' width='hug'>{r.version}</ColorfulBadge>,
      },
    ];
    const trailing = [
      { key: 'updatedBy', header: 'ผู้ที่อัปเดตล่าสุด', render: (r) => <Cell value={r.updatedBy || r.creator} /> },
      {
        key: 'status', header: 'สถานะ', sortable: true,
        render: (r) => (
          <div className='flex items-center flex-nowrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
            {/* "รอตรวจสอบ" ยังไม่ผ่านการตรวจ จึงยังเผยแพร่ไม่ได้ — แสดงแค่
                สถานะ ไม่มี toggle (มติผู้ใช้ 25 ส.ค. 69) ของเดิมมี toggle
                ให้กดได้ทั้งที่ยังไม่ควรเผยแพร่ */}
            {r.status === 'รอตรวจสอบ' ? null : (
              <Switch
                checked={r.status === 'เผยแพร่'}
                aria-label={`${r.status === 'เผยแพร่' ? 'ยกเลิกเผยแพร่' : 'เผยแพร่'} ${r.code}`}
                onChange={(checked) => setStatusConfirm({ record: r, nextStatus: checked ? 'เผยแพร่' : 'ไม่เผยแพร่' })}
              />
            )}
            <ColorfulBadge style={(CONSENT_FORM_STATUS[r.status] || {}).tone || 'grey'} size='small' hierarchy='secondary' width='hug'>{r.status}</ColorfulBadge>
          </div>
        ),
      },
      /* ปุ่ม "ผู้ที่มีสิทธิ์เข้าถึง" ย้ายเข้าไปอยู่ใน popup ดูตัวอย่างแล้ว
         (มติผู้ใช้ 25 ส.ค. 69) คอลัมน์นี้จึงกลับมาแคบเท่าเดิม */
      { key: 'action', header: 'การดำเนินการ', minWidth: 304, render: renderAction },
    ];
    if (activeTab === 'draft') {
      return [updatedDateCol, ...leading, ...trailing];
    }
    return [...leading, updatedDateCol, ...trailing];
  }, [activeTab]);

  const renderMobileFormCard = (row) => (
    <article
      key={row.id}
      className='w-full flex flex-col'
      style={{
        gap: 'var(--dim-space-300)',
        padding: 'var(--dim-space-400)',
        background: 'var(--surface-card-100)',
        border: 'var(--dim-stroke-100) solid var(--border-card-default)',
        borderRadius: 'var(--dim-radius-300, 10px)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      <div className='flex items-start w-full' style={{ gap: 'var(--dim-space-300)' }}>
        <div className='flex flex-col flex-1 min-w-0' style={{ gap: 'var(--dim-space-100)' }}>
          <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
            <strong style={{ color: 'var(--text-content-default)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)', fontWeight: 'var(--type-weight-bold)' }}>
              {row.code}
            </strong>
            <ColorfulBadge style='blue' size='small' hierarchy='secondary' width='hug'>{row.version}</ColorfulBadge>
          </div>
          <button
            type='button'
            className='w-full text-left'
            onClick={() => setViewFor(row)}
            style={{
              minHeight: 'var(--dim-size-900, 44px)',
              padding: 0,
              background: 'transparent',
              border: 'none',
              color: 'var(--text-content-default)',
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-base)',
              fontWeight: 'var(--type-weight-medium)',
              lineHeight: 1.5,
            }}
          >
            {row.name}
          </button>
        </div>
        <div className='flex items-center shrink-0' style={{ gap: 'var(--dim-space-200)' }}>
          {/* การ์ดมือถือใช้กติกาเดียวกับตาราง — "รอตรวจสอบ" ไม่มี toggle */}
          {row.status === 'รอตรวจสอบ' ? null : (
            <Switch
              checked={row.status === 'เผยแพร่'}
              aria-label={`${row.status === 'เผยแพร่' ? 'ยกเลิกเผยแพร่' : 'เผยแพร่'} ${row.code}`}
              onChange={(checked) => setStatusConfirm({ record: row, nextStatus: checked ? 'เผยแพร่' : 'ไม่เผยแพร่' })}
            />
          )}
          <ColorfulBadge style={(CONSENT_FORM_STATUS[row.status] || {}).tone || 'grey'} size='small' hierarchy='secondary' width='hug'>
            {row.status}
          </ColorfulBadge>
        </div>
      </div>

      <div className='grid grid-cols-2 w-full' style={{ gap: 'var(--dim-space-300)' }}>
        <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-050)' }}>
          <span style={{ color: 'var(--text-content-tertiary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)' }}>อัปเดตล่าสุด</span>
          <span style={TEXT_CELL}>{row.updatedDate || '-'}</span>
        </div>
        <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-050)' }}>
          <span style={{ color: 'var(--text-content-tertiary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)' }}>ผู้แก้ไขล่าสุด</span>
          <span className='truncate' style={TEXT_CELL}>{row.updatedBy || row.creator || '-'}</span>
        </div>
      </div>

      <div className='flex items-center flex-wrap w-full' style={{ gap: 'var(--dim-space-200)' }}>
        <span style={{ color: 'var(--text-content-tertiary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)' }}>สิทธิ์การเข้าถึง</span>
        <AccessCell row={row} onView={setAccessViewFor} />
      </div>

      <div className='flex justify-end w-full' style={{ borderTop: 'var(--dim-stroke-100) solid var(--border-card-default)', paddingTop: 'var(--dim-space-300)' }}>
        {renderAction(row)}
      </div>
    </article>
  );

  return (
    <>
    <QueuePageShell
      activeKey='consent-forms'
      sidebarItems={CONSENT_NAV}
      sidebarFallbackKey='consent-forms'
      brandTitle='ระบบจัดการความยินยอม'
      breadcrumb={breadcrumb}
      title='แบบฟอร์มความยินยอม'
      actions={(
        <BrandButton variant='fill' size='md' leadingIcon='add' onClick={() => navigate.push('/consent/forms/new')}>
          สร้างแบบฟอร์มใหม่
        </BrandButton>
      )}
      headerInfo={(
        <section className='flex items-stretch flex-wrap' style={{ gap: 'var(--dim-space-400)' }}>
          {summaryCards.map((c) => (
            <SummaryCard key={c.key} card={c} variant='panel' />
          ))}
        </section>
      )}
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={(key) => {
        setActiveTab(key);
        setPage(1);
        if (key === 'draft') setSortConfig(DRAFT_TAB_SORT);
        else if (sortConfig.key === 'updatedDate') setSortConfig({ key: null, direction: 'asc' });
        if (key !== 'all') setFilterStatus('');
      }}
    >
      {/* Content — search + view toggle + table อยู่การ์ดขาวใบเดียว */}
      <div className='flex flex-col flex-1 min-w-0' style={{ padding: 'var(--dim-space-600)' }}>
        <section className='w-full flex flex-col' style={{ ...CARD_STYLE, gap: 'var(--dim-space-600)' }}>
          <div className='w-full flex items-start justify-center'>
            <PrimarySearch
              value={search}
              inputAriaLabel='ค้นหาแบบฟอร์มความยินยอมด้วยชื่อ รหัส หรือกลุ่มงาน'
              onChange={(v) => { setSearch(v); setPage(1); }}
              onSubmit={handleSubmit}
              placeholder='ค้นหาชื่อแบบฟอร์ม / รหัส / กลุ่มงาน...'
              width={640}
              suggestions={searchSuggestions}
              history={searchHistory}
              onHistoryClear={searchHistory.length > 0 ? clearHistory : undefined}
            />
          </div>

          <div className='w-full flex items-start' style={{ gap: 'var(--dim-space-300)' }}>
            <div className='flex items-center flex-wrap min-w-0 flex-1' style={{ gap: 'var(--dim-space-200)' }}>
              <FilterDropdown prefix='บทบาท:' options={groupOptions} value={filterGroup} onChange={(v) => { setFilterGroup(v); setPage(1); }} />
              <FilterDropdown prefix='แผนก:' options={deptOptions} value={filterDept} onChange={(v) => { setFilterDept(v); setPage(1); }} />
              <FilterDropdown prefix='ผู้ที่อัปเดตล่าสุด:' options={creatorOptions} value={filterCreator} onChange={(v) => { setFilterCreator(v); setPage(1); }} />
              {activeTab === 'all' && (
                <FilterDropdown prefix='สถานะ:' options={statusOptions} value={filterStatus} onChange={(v) => { setFilterStatus(v); setPage(1); }} />
              )}
              <FilterDateTag
                prefix='วันที่:'
                value={filterDate}
                onChange={(v) => { setFilterDate(v); setPage(1); }}
                defaultQuick='thisyear'
              />
              <ClearFiltersTag active={showClearChip} onClear={clearFilters} />
            </div>
            <div className='flex items-center shrink-0' style={{ gap: 'var(--dim-space-200)' }}>
              <span style={{ color: 'var(--text-content-tertiary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)' }}>มุมมอง</span>
              <ViewToggle value={viewMode} onChange={setViewMode} />
            </div>
          </div>

          {viewMode === 'list' ? (
            <SmoothFilterResults opaque={resultsOpaque}>
            <div className='w-full flex flex-col' style={{ gap: 'var(--dim-space-300)' }}>
              <div className='md:hidden flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
                {pageRows.length ? pageRows.map(renderMobileFormCard) : (
                  <div className='flex flex-col items-center text-center w-full' style={{ gap: 'var(--dim-space-200)', padding: 'var(--dim-space-600)' }}>
                    <strong style={{ color: 'var(--text-content-default)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-base)', fontWeight: 'var(--type-weight-bold)' }}>ไม่พบแบบฟอร์มความยินยอม</strong>
                    <span style={{ color: 'var(--text-content-tertiary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)' }}>ลองปรับคำค้นหาหรือเปลี่ยนแท็บ</span>
                  </div>
                )}
              </div>
              <div className='hidden md:block w-full'>
                <Table
                  columns={columns}
                  rows={pageRows}
                  rowKey={(row) => row.id}
                  sortConfig={sortConfig}
                  onSort={handleSort}
                  stickyColCount={2}
                  trailingInset='var(--dim-space-400, 16px)'
                  /* Pin under sticky SubHeader + tabs — offset tracks Topbar
                     auto-hide via --mih-queue-sticky-under-tabs (QueuePageShell). */
                  stickyHeaderTop={QUEUE_STICKY_UNDER_TABS}
                  emptyMessage='ไม่พบแบบฟอร์มความยินยอม'
                  emptySubtext='ลองปรับคำค้นหาหรือเปลี่ยนแท็บ'
                />
              </div>
              <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-600)', paddingTop: 'var(--dim-space-400)' }}>
                <span style={{ flex: 1, color: 'var(--text-content-secondary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)', lineHeight: 1.5 }}>
                  แสดง {rangeStart}-{rangeEnd} จาก {sorted.length} รายการ
                </span>
                {totalPages > 1 && (
                  <Pagination currentPage={safePage} pageCount={totalPages} onPageChange={setPage} />
                )}
              </div>
            </div>
            </SmoothFilterResults>
          ) : (
            <SmoothFilterResults opaque={resultsOpaque}>
            {/* มุมมองการ์ด = การ์ดล้วน ๆ ไม่มีหัวข้อกลุ่มและไม่แยก section
                (มติผู้ใช้ 25 ส.ค. 69) — เดิมห่อทุกกลุ่มด้วยหัวข้อ
                "แบบฟอร์มยินยอมเปิดเผยข้อมูล" ซ้ำกันและเลื่อนแนวนอนทีละแถว
                ทำให้เห็นแบบฟอร์มได้ทีละไม่กี่ใบ */}
            <div
              className='grid w-full min-w-0'
              style={{
                gridTemplateColumns: 'repeat(auto-fill, minmax(var(--dim-size-2450, 280px), 1fr))',
                gap: 'var(--dim-space-400)',
                alignItems: 'start',
              }}
            >
              {grouped.flatMap((g) => g.rows).map((r) => (
                <FormGridCard
                  key={r.id}
                  row={r}
                  onView={() => setViewFor(r)}
                  onEdit={() => handleEdit(r)}
                />
              ))}
            </div>
            </SmoothFilterResults>
          )}
        </section>
      </div>
    </QueuePageShell>

    <ConsentFormViewPopup
      open={!!viewFor}
      record={viewFor}
      onClose={() => setViewFor(null)}
      onToast={setToast}
    />

    <FormAccessViewPopup
      open={!!accessViewFor}
      record={accessViewFor}
      onClose={() => setAccessViewFor(null)}
    />

    {/* ด.1.1.5 — timeline เวอร์ชัน + สร้างเวอร์ชันใหม่ */}
    <VersionHistoryPopup
      open={!!versionFor}
      record={versionFor}
      onClose={() => setVersionFor(null)}
      onCreateVersion={(row) => { setVersionFor(null); goCreateVersion(row); }}
      onRestoreVersion={() => setVersionFor(null)}
      onToast={setToast}
    />

    {/* แก้ไข / สร้างเวอร์ชันใหม่ — wizard ใน popup (ไม่เปิดแท็บใหม่) */}
    <ConsentFormEditPopup
      key={editFor ? `${editFor.record.id}-${editFor.newVersion ? 'nv' : 'edit'}` : 'closed'}
      open={!!editFor}
      record={editFor?.record || null}
      newVersion={!!editFor?.newVersion}
      onClose={() => setEditFor(null)}
      onPublished={({ code, version: ver, newVersion }) => {
        setToast({
          id: Date.now(),
          variant: 'success',
          message: newVersion
            ? `เผยแพร่ ${code} เวอร์ชัน ${ver} แล้ว`
            : `บันทึกการแก้ไข ${code} แล้ว (เวอร์ชัน ${ver})`,
        });
      }}
    />

    {/* แก้ไขเทมเพลตที่เผยแพร่แล้ว → บังคับ bump เวอร์ชัน (ห้ามแก้ทับ) */}
    <AlertDialog
      open={!!bumpFor}
      type='warning'
      title='แบบฟอร์มนี้เผยแพร่แล้ว'
      description={bumpFor ? `${bumpFor.code} (${bumpFor.version}) แก้ทับไม่ได้ — ระบบจะสร้างเวอร์ชันใหม่ ${bumpVersion(bumpFor.version)} ให้แก้ไขแทน และเก็บประวัติเวอร์ชันเดิมไว้` : ''}
      confirmLabel='สร้างเวอร์ชันใหม่'
      cancelLabel='ยกเลิก'
      onConfirm={() => { const row = bumpFor; setBumpFor(null); if (row) goCreateVersion(row); }}
      onCancel={() => setBumpFor(null)}
      onClose={() => setBumpFor(null)}
    />

    <AlertDialog
      open={!!statusConfirm}
      type={statusConfirm?.nextStatus === 'เผยแพร่' ? 'info' : 'destructive'}
      title={statusConfirm?.nextStatus === 'เผยแพร่' ? 'ยืนยันการเผยแพร่แบบฟอร์ม' : 'ยืนยันการยกเลิกเผยแพร่'}
      description={statusConfirm
        ? statusConfirm.nextStatus === 'เผยแพร่'
          ? `${statusConfirm.record.code} จะพร้อมใช้งานสำหรับบทบาทและหน่วยงานที่ได้รับสิทธิ์`
          : `${statusConfirm.record.code} จะไม่สามารถถูกเลือกใช้กับรายการใหม่ได้ แต่ประวัติเดิมยังคงอยู่`
        : ''}
      confirmLabel={statusConfirm?.nextStatus === 'เผยแพร่' ? 'เผยแพร่' : 'ยกเลิกเผยแพร่'}
      cancelLabel='ยกเลิก'
      onConfirm={() => {
        if (!statusConfirm) return;
        setStatusOverrides((prev) => ({ ...prev, [statusConfirm.record.id]: statusConfirm.nextStatus }));
        setToast({
          id: Date.now(),
          variant: 'success',
          message: `${statusConfirm.record.code} เปลี่ยนสถานะเป็น ${statusConfirm.nextStatus} แล้ว`,
        });
        setStatusConfirm(null);
      }}
      onCancel={() => setStatusConfirm(null)}
      onClose={() => setStatusConfirm(null)}
    />

    <PhcisTopToast session={toast} onDismiss={() => setToast(null)} />
    </>
  );
}
