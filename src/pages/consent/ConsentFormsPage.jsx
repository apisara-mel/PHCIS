import React, { useMemo, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useHistory } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import { SummaryCard } from '@/components/layout/SummaryCardsBar';
import PrimarySearch from '@/components/search/PrimarySearch';
import useSearchHistory from '@/components/search/useSearchHistory';
import FilterTag, { FilterDropdown } from '@/components/forms/FilterTag';
import Table from '@/components/table/Table';
import Pagination from '@/components/pagination/Pagination';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import BrandButton from '@/components/button/BrandButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import NeutralSubdueIconButton from '@/components/button/NeutralSubdueIconButton';
import Icon from '@/components/icons/Icon';
import ViewToggle from '@/components/toggle/ViewToggle';
import {
  CONSENT_FORM_RECORDS, CONSENT_FORM_SUMMARY, CONSENT_FORM_TABS,
  CONSENT_FORM_STATUS, FORM_TYPE_TONE,
} from '@/data/consentFormRecords';
import CONSENT_NAV from '@/pages/consent/consentNav';

/* PHCIS | Consent — แบบฟอร์มความยินยอม (Figma 291:113045 · flow 277:150901).
   Consent-form TEMPLATE registry: summary cards · tabs · search · filters ·
   table with view / print / edit actions. Mirrors the consent registry page
   so the system stays consistent. Tokens aliased; copy Thai; data mock. */

const PAGE_SIZE = 10;
const breadcrumb = ['แบบฟอร์มความยินยอม'];
const GROUP_TONE = { 'แพทย์': 'green', 'พยาบาล': 'purple', 'เภสัชกร': 'teal', 'นักเทคนิคการแพทย์': 'blue' };

const TEXT_CELL = {
  color: 'var(--text-content-default)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm)',
  fontWeight: 'var(--type-weight-regular)',
  lineHeight: 1.5,
};
const MUTED_CELL = { ...TEXT_CELL, color: 'var(--text-content-tertiary)' };

/* White content card — shared by the table card and each grid group card
   (Figma p-24 · r-16 · 1px brand-quaternary border · card shadow). */
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

/* One Group Policy · สาขาย่อย · แผนก triplet — Figma popover "Group"
   (291:254663): magenta badge · dot · blue badge · dot · grey badge. */
const ScopeTripletRow = ({ scope }) => (
  <div className='flex items-center' style={{ gap: 'var(--dim-space-100)' }}>
    <ColorfulBadge style='magenta' size='small' hierarchy='secondary' width='hug'>{scope.group}</ColorfulBadge>
    <span style={{ color: 'var(--text-content-quaternary)', fontSize: 'var(--type-size-xs)', lineHeight: 1.5 }}>•</span>
    <ColorfulBadge style='blue' size='small' hierarchy='secondary' width='hug'>{scope.subBranch}</ColorfulBadge>
    <span style={{ color: 'var(--text-content-quaternary)', fontSize: 'var(--type-size-xs)', lineHeight: 1.5 }}>•</span>
    <ColorfulBadge style='grey' size='small' hierarchy='secondary' width='hug'>{scope.dept}</ColorfulBadge>
  </div>
);

/* "+N เพิ่มเติม" hint → floating popover listing every scope as a triplet.
   Figma 291:254663: white card · p-12 · radius-8 · Drop Shadow Bottom/400.
   Rendered via portal + fixed positioning so the scrolling/overflow table
   container never clips it. */
const ScopePopover = ({ scopes, moreCount }) => {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const btnRef = useRef(null);
  const popRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (popRef.current?.contains(e.target) || btnRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    const onScroll = () => setOpen(false);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [open]);

  const toggle = () => {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 6, left: r.left });
    }
    setOpen((v) => !v);
  };

  return (
    <>
      <button
        ref={btnRef}
        type='button'
        onClick={toggle}
        aria-haspopup='dialog'
        aria-expanded={open}
        style={{
          ...MUTED_CELL,
          fontSize: 'var(--type-size-xs)',
          background: 'none',
          border: 0,
          padding: 0,
          cursor: 'pointer',
          textAlign: 'left',
          color: open ? 'var(--text-brandPrimary-default)' : 'var(--text-content-tertiary)',
          transition: 'color 120ms ease',
        }}
      >
        +{moreCount} เพิ่มเติม
      </button>
      {open && pos && createPortal(
        <div
          ref={popRef}
          role='dialog'
          aria-label='ขอบเขตการใช้งานแบบฟอร์ม'
          style={{
            position: 'fixed',
            top: pos.top,
            left: pos.left,
            zIndex: 'var(--sm-z-overlay, 40)',
            background: 'var(--surface-card-100, #FFFFFF)',
            borderRadius: 'var(--dim-radius-200)',
            boxShadow: 'var(--shadow-dropdown)',
            padding: 'var(--dim-space-300)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--dim-space-200)',
            maxWidth: 380,
          }}
        >
          {scopes.map((s, i) => <ScopeTripletRow key={i} scope={s} />)}
        </div>,
        document.body,
      )}
    </>
  );
};

/* Group Policy · สาขาย่อย · แผนก cell — primary scope inline (group + subBranch
   badge, plain dept) + a "+N เพิ่มเติม" popover trigger when there are more. */
const ScopeCell = ({ row }) => (
  <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-100)' }}>
    <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-100)' }}>
      <ColorfulBadge style={GROUP_TONE[row.group] || 'grey'} size='small' hierarchy='secondary' width='hug'>{row.group}</ColorfulBadge>
      <ColorfulBadge style='blue' size='small' hierarchy='secondary' width='hug'>{row.subBranch}</ColorfulBadge>
      <span style={{ ...MUTED_CELL }}>{row.dept}</span>
    </div>
    {row.moreCount > 0 && (
      <ScopePopover scopes={row.scopes} moreCount={row.moreCount} />
    )}
  </div>
);

/* Cover illustration baked from Figma (PHCIS | Consent 356:111486). */
const GRID_COVER = '/illustration/consent/form-cover-01.svg';

/* Hide the grid carousel rows' scrollbars (idempotent module-load injection). */
if (typeof document !== 'undefined' && !document.getElementById('mih-grid-row-style')) {
  const s = document.createElement('style');
  s.id = 'mih-grid-row-style';
  s.textContent = '.mih-grid-row{scrollbar-width:none;-ms-overflow-style:none;}.mih-grid-row::-webkit-scrollbar{display:none;height:0;}';
  document.head.appendChild(s);
}

/* Grid-view card (Figma 336:170901) — cover illustration + type/version badge,
   title, code, and ดู / พิมพ์ / แก้ไข actions. Fixed width for the carousel. */
const FormGridCard = ({ row, onView, onEdit }) => (
  <div
    className='flex flex-col'
    style={{ width: 240, flexShrink: 0, background: 'var(--surface-card-100)', border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)', borderRadius: 'var(--dim-radius-400)', boxShadow: 'var(--shadow-card)', overflow: 'hidden' }}
  >
    <div style={{ width: '100%', height: 132, background: 'var(--surface-brandPrimary-quaternary)' }}>
      <img src={GRID_COVER} alt='' aria-hidden draggable={false} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
    </div>
    <div className='flex flex-col' style={{ padding: 'var(--dim-space-400)', gap: 'var(--dim-space-300)' }}>
      <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-100)' }}>
        <ColorfulBadge style={FORM_TYPE_TONE[row.type] || 'grey'} size='small' hierarchy='secondary' width='hug'>{row.type}</ColorfulBadge>
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

/* Subtitle copy per Consent type (Figma group header). */
const TYPE_SUBTITLE = {
  'การวิจัย': 'หนังสือยินยอมสำหรับการเข้าร่วมโครงการวิจัยในมนุษย์',
  'บันทึกภาพ/สื่อ': 'หนังสือยินยอมการบันทึกภาพและสื่อเพื่อการศึกษา',
  'การรักษา': 'หนังสือยินยอมสำหรับการรักษาและบริการทางการแพทย์',
  'ผ่าตัด': 'หนังสือยินยอมสำหรับการรักษาและหัตถการทางการแพทย์',
  'วัคซีน': 'หนังสือยินยอมสำหรับการรับวัคซีนและการสร้างเสริมภูมิคุ้มกัน',
  'PDPA': 'หนังสือยินยอมการเปิดเผยและคุ้มครองข้อมูลส่วนบุคคล',
};

/* One Consent-type group — white card with a header (icon · title · type badge ·
   count · subtitle · ดูทั้งหมด) and a horizontal carousel of form cards. */
const GroupSection = ({ type, rows, onView, onEdit, onSeeAll, cardStyle }) => (
  <section className='w-full flex flex-col' style={{ ...cardStyle, gap: 'var(--dim-space-400)' }}>
    <div className='flex items-center justify-between w-full' style={{ gap: 'var(--dim-space-300)' }}>
      <div className='flex items-center min-w-0' style={{ gap: 'var(--dim-space-300)' }}>
        <span
          className='inline-flex items-center justify-center shrink-0'
          style={{ width: 'var(--dim-size-800, 40px)', height: 'var(--dim-size-800, 40px)', borderRadius: 'var(--dim-radius-200)', background: 'var(--surface-brandPrimary-quaternary)', color: 'var(--text-brandPrimary-default)' }}
        >
          <Icon name='clipboard-list' size={20} />
        </span>
        <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-050)' }}>
          <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
            <span style={{ color: 'var(--text-content-default)', fontFamily: 'var(--type-family-heading-graphic2)', fontSize: 'var(--type-size-base)', lineHeight: 1.4 }}>
              แบบฟอร์มยินยอมประเภท{type}
            </span>
            <ColorfulBadge style={FORM_TYPE_TONE[type] || 'grey'} size='small' hierarchy='secondary' width='hug'>{type}</ColorfulBadge>
            <ColorfulBadge style='green' size='small' hierarchy='secondary' width='hug'>{rows.length} แบบฟอร์ม</ColorfulBadge>
          </div>
          <span className='truncate' style={{ ...MUTED_CELL }}>{TYPE_SUBTITLE[type] || 'หนังสือยินยอมสำหรับบริการทางการแพทย์'}</span>
        </div>
      </div>
      <NeutralSubdueButton trailingIcon='chevron_right' size='sm' onClick={onSeeAll}>ดูทั้งหมด</NeutralSubdueButton>
    </div>
    <div className='mih-grid-row' style={{ display: 'flex', gap: 'var(--dim-space-400)', overflowX: 'auto', paddingBottom: 'var(--dim-space-100)' }}>
      {rows.map((r) => (
        <FormGridCard key={r.id} row={r} onView={() => onView(r)} onEdit={onEdit} />
      ))}
    </div>
  </section>
);

export default function ConsentFormsPage() {
  const navigate = useHistory();
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterGroup, setFilterGroup] = useState('');
  const [filterSubBranch, setFilterSubBranch] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterCreator, setFilterCreator] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'grid'
  const [page, setPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const { history: searchHistory, push: pushHistory, clear: clearHistory } =
    useSearchHistory('mih:primarysearch-history:consent-forms');

  const tabs = useMemo(() => CONSENT_FORM_TABS.map((t) => ({
    key: t.value,
    label: t.label,
    icon: t.icon,
    count: t.value === 'all'
      ? CONSENT_FORM_RECORDS.length
      : CONSENT_FORM_RECORDS.filter((r) => (CONSENT_FORM_STATUS[r.status] || {}).tab === t.value).length,
  })), []);

  const typeOptions = useMemo(() => [
    { value: '', label: 'ทุกประเภท' },
    ...[...new Set(CONSENT_FORM_RECORDS.map((r) => r.type))].map((t) => ({ value: t, label: t })),
  ], []);
  const groupOptions = useMemo(() => [
    { value: '', label: 'ทุกกลุ่ม' },
    ...[...new Set(CONSENT_FORM_RECORDS.map((r) => r.group))].map((g) => ({ value: g, label: g })),
  ], []);
  const subBranchOptions = useMemo(() => [
    { value: '', label: 'ทุกสาขาย่อย' },
    ...[...new Set(CONSENT_FORM_RECORDS.map((r) => r.subBranch))].map((s) => ({ value: s, label: s })),
  ], []);
  const deptOptions = useMemo(() => [
    { value: '', label: 'ทุกแผนก' },
    ...[...new Set(CONSENT_FORM_RECORDS.map((r) => r.dept))].map((d) => ({ value: d, label: d })),
  ], []);
  const statusOptions = useMemo(() => [
    { value: '', label: 'ทุกสถานะ' },
    ...Object.keys(CONSENT_FORM_STATUS).map((s) => ({ value: s, label: s })),
  ], []);
  const creatorOptions = useMemo(() => [
    { value: '', label: 'ทุกคน' },
    ...[...new Set(CONSENT_FORM_RECORDS.map((r) => r.creator))].map((c) => ({ value: c, label: c })),
  ], []);
  const dateOptions = [
    { value: '', label: 'ทุกวัน' },
    { value: 'today', label: 'วันนี้' },
    { value: '7', label: '7 วันล่าสุด' },
    { value: '30', label: '30 วันล่าสุด' },
  ];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return CONSENT_FORM_RECORDS.filter((r) => {
      const meta = CONSENT_FORM_STATUS[r.status] || {};
      return (
        (activeTab === 'all' || meta.tab === activeTab) &&
        (!filterType || r.type === filterType) &&
        (!filterGroup || r.group === filterGroup) &&
        (!filterSubBranch || r.subBranch === filterSubBranch) &&
        (!filterDept || r.dept === filterDept) &&
        (!filterStatus || r.status === filterStatus) &&
        (!filterCreator || r.creator === filterCreator) &&
        (!q || r.name.toLowerCase().includes(q) || r.code.toLowerCase().includes(q))
      );
    });
  }, [activeTab, search, filterType, filterGroup, filterSubBranch, filterDept, filterStatus, filterCreator]);

  const handleSort = (key) => setSortConfig((prev) => (
    prev.key === key
      ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
      : { key, direction: 'asc' }
  ));

  const sorted = useMemo(() => {
    const { key, direction } = sortConfig;
    const sign = direction === 'desc' ? -1 : 1;
    const copy = filtered.slice();
    if (!key) return copy.sort((a, b) => a.id - b.id);
    copy.sort((a, b) => {
      const av = String(a[key] ?? ''); const bv = String(b[key] ?? '');
      const primary = av.localeCompare(bv, 'th');
      return primary !== 0 ? sign * primary : a.id - b.id;
    });
    return copy;
  }, [filtered, sortConfig]);

  /* Grid mode groups the FULL filtered list by Consent type (Figma 336:170901). */
  const grouped = useMemo(() => {
    const map = new Map();
    sorted.forEach((r) => {
      if (!map.has(r.type)) map.set(r.type, []);
      map.get(r.type).push(r);
    });
    return [...map.entries()].map(([type, rows]) => ({ type, rows }));
  }, [sorted]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const rangeStart = sorted.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(safePage * PAGE_SIZE, sorted.length);
  const isAllFilters = !filterType && !filterGroup && !filterSubBranch && !filterDept && !filterStatus && !filterCreator && !filterDate;

  const resetFilters = () => {
    setFilterType(''); setFilterGroup(''); setFilterSubBranch(''); setFilterDept('');
    setFilterStatus(''); setFilterCreator(''); setFilterDate(''); setPage(1);
  };

  const handleSubmit = (value) => {
    const q = (value || '').trim();
    if (q) pushHistory({ label: q, value: q });
    setSearch(q); setPage(1);
  };

  const renderAction = (row) => (
    <div className='flex items-center justify-end' style={{ gap: 'var(--dim-space-150)' }}>
      <NeutralSubdueIconButton icon='visibility' variant='outline' size='sm' aria-label='ดูแบบฟอร์ม' title='ดูแบบฟอร์ม' onClick={() => navigate.push(`/consent/forms/${row.id}/view`)} />
      <NeutralSubdueIconButton icon='print' variant='outline' size='sm' aria-label='พิมพ์' title='พิมพ์' />
      <NeutralSubdueButton leadingIcon='edit' size='sm' onClick={() => navigate.push('/consent/forms/new')}>แก้ไข</NeutralSubdueButton>
    </div>
  );

  /* Column widths per Figma 291:113045 HeaderCell w-[...]:
     128 · 384 · 160 · 96 · 384 · 160 · 128 · 128 · 224. */
  const columns = useMemo(() => [
    { key: 'code', header: 'รหัสแบบฟอร์ม', width: 128, sortable: true, render: (r) => <Cell value={r.code} /> },
    {
      key: 'name', header: 'ชื่อแบบฟอร์ม', width: 384, sortable: true,
      render: (r) => <span className='truncate' style={TEXT_CELL} title={r.name}>{r.name}</span>,
    },
    {
      key: 'type', header: 'ประเภท', width: 160, sortable: true,
      render: (r) => <ColorfulBadge style={FORM_TYPE_TONE[r.type] || 'grey'} size='small' hierarchy='secondary' width='hug'>{r.type}</ColorfulBadge>,
    },
    {
      key: 'version', header: 'เวอร์ชั่น', width: 96,
      render: (r) => <ColorfulBadge style='blue' size='small' hierarchy='secondary' width='hug'>{r.version}</ColorfulBadge>,
    },
    { key: 'group', header: 'Group Policy / สาขาย่อย / แผนก', width: 384, render: (r) => <ScopeCell row={r} /> },
    { key: 'updatedDate', header: 'วันที่อัปเดตล่าสุด', width: 160, sortable: true, render: (r) => <Cell value={r.updatedDate} /> },
    { key: 'creator', header: 'ผู้สร้าง', width: 128, render: (r) => <Cell value={r.creator} /> },
    {
      key: 'status', header: 'สถานะ', width: 128, sortable: true,
      render: (r) => <ColorfulBadge style={(CONSENT_FORM_STATUS[r.status] || {}).tone || 'grey'} size='small' hierarchy='secondary' width='hug'>{r.status}</ColorfulBadge>,
    },
    { key: 'action', header: 'การดำเนินการ', width: 224, render: renderAction },
  ], []);

  return (
    <QueuePageShell
      activeKey='consent-forms'
      sidebarItems={CONSENT_NAV}
      sidebarFallbackKey='consent-forms'
      brandTitle='ระบบจัดการความยินยอม'
      breadcrumb={breadcrumb}
      title='แบบฟอร์มความยินยอม'
      actions={(
        <BrandButton variant='outline' size='md' trailingIcon='chevron_right' onClick={() => navigate.push('/forms')}>
          ดูฟอร์มทั้งหมด
        </BrandButton>
      )}
      headerInfo={(
        <section className='flex items-stretch flex-wrap' style={{ gap: 'var(--dim-space-400)' }}>
          {CONSENT_FORM_SUMMARY.map((c) => (
            <SummaryCard key={c.key} card={c} variant='panel' hover />
          ))}
        </section>
      )}
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={(key) => { setActiveTab(key); setPage(1); }}
    >
      {/* Content area — Figma Consent_form_all_List: p-24, gap-16 between the
          search/filter card and the table card. */}
      <div className='flex flex-col flex-1 min-w-0' style={{ padding: 'var(--dim-space-600)', gap: 'var(--dim-space-400)' }}>
        {/* ── Search + filter card (Figma 334:125619 · p-24 · gap-24 · r-16) ── */}
        <section
          className='w-full flex flex-col items-center'
          style={{
            background: 'var(--surface-card-100)',
            borderRadius: 'var(--dim-radius-500)',
            border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
            boxShadow: 'var(--shadow-card)',
            padding: 'var(--dim-space-600)',
            gap: 'var(--dim-space-600)',
          }}
        >
          <div className='w-full flex items-start justify-center'>
            <PrimarySearch
              value={search}
              onChange={(v) => { setSearch(v); setPage(1); }}
              onSubmit={handleSubmit}
              placeholder='ค้นหาชื่อแบบฟอร์ม / กลุ่มงาน...'
              width={640}
              history={searchHistory}
              onHistoryClear={searchHistory.length > 0 ? clearHistory : undefined}
            />
          </div>

          {/* Filter Group (Figma 334:135520) — gap-16 between tag row · divider · action row */}
          <div className='w-full flex flex-col' style={{ gap: 'var(--dim-space-400)' }}>
            {/* filter tag row (gap-8) */}
            <div className='flex items-center flex-wrap w-full' style={{ gap: 'var(--dim-space-200)' }}>
              <FilterTag value='ทั้งหมด' selected={isAllFilters} onClick={resetFilters} />
              <FilterDropdown prefix='ประเภท:' options={typeOptions} value={filterType} onChange={(v) => { setFilterType(v); setPage(1); }} />
              <FilterDropdown prefix='Group Policy:' options={groupOptions} value={filterGroup} onChange={(v) => { setFilterGroup(v); setPage(1); }} />
              <FilterDropdown prefix='สาขาย่อย:' options={subBranchOptions} value={filterSubBranch} onChange={(v) => { setFilterSubBranch(v); setPage(1); }} />
              <FilterDropdown prefix='แผนก:' options={deptOptions} value={filterDept} onChange={(v) => { setFilterDept(v); setPage(1); }} />
              <FilterDropdown prefix='ผู้สร้าง:' options={creatorOptions} value={filterCreator} onChange={(v) => { setFilterCreator(v); setPage(1); }} />
              <FilterDropdown prefix='สถานะ:' options={statusOptions} value={filterStatus} onChange={(v) => { setFilterStatus(v); setPage(1); }} />
              <FilterDropdown prefix='วันที่สร้าง:' options={dateOptions} value={filterDate} onChange={(v) => { setFilterDate(v); setPage(1); }} />
            </div>

            {/* divider (Figma 334:135495 · 1px · neutral/quaternary) */}
            <div aria-hidden style={{ height: 'var(--dim-stroke-100)', width: '100%', background: 'var(--border-neutral-quaternary)' }} />

            {/* action row (Figma 334:134439 · justify-end · gap-24) */}
            <div className='flex items-center justify-end w-full' style={{ gap: 'var(--dim-space-600)' }}>
              <BrandButton variant='fill' size='sm' leadingIcon='add' onClick={() => navigate.push('/consent/forms/new')}>
                สร้างแบบฟอร์มใหม่
              </BrandButton>
              {/* vertical divider (Figma 334:134443 · 32×1 · neutral/tertiary) */}
              <div aria-hidden style={{ height: 32, width: 'var(--dim-stroke-100)', background: 'var(--border-neutral-tertiary)', flexShrink: 0 }} />
              <div className='flex items-center' style={{ gap: 'var(--dim-space-200)' }}>
                <span style={{ color: 'var(--text-content-tertiary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)' }}>มุมมอง</span>
                <ViewToggle value={viewMode} onChange={setViewMode} />
              </div>
            </div>
          </div>
        </section>

        {viewMode === 'list' ? (
          /* ── Table card (Figma 7:13056 · p-24 · r-16) ── */
          <section className='w-full flex flex-col' style={CARD_STYLE}>
            <Table
              columns={columns}
              rows={pageRows}
              rowKey={(row) => row.id}
              sortConfig={sortConfig}
              onSort={handleSort}
              stickyColCount={2}
              emptyMessage='ไม่พบแบบฟอร์มความยินยอม'
              emptySubtext='ลองปรับตัวกรองหรือคำค้นหา'
              style={{ maxHeight: 604, overflow: 'auto' }}
            />

            {/* Pagination (Figma 1:2651 · gap-24 · py-16) */}
            <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-600)', paddingTop: 'var(--dim-space-400)' }}>
              <span style={{ flex: 1, color: 'var(--text-content-secondary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)', lineHeight: 1.5 }}>
                แสดง {rangeStart}-{rangeEnd} จาก {sorted.length} รายการ
              </span>
              <Pagination currentPage={safePage} pageCount={totalPages} onPageChange={setPage} />
            </div>
          </section>
        ) : grouped.length === 0 ? (
          <section className='w-full flex flex-col items-center justify-center' style={{ ...CARD_STYLE, minHeight: 200 }}>
            <span style={{ ...MUTED_CELL }}>ไม่พบแบบฟอร์มความยินยอม</span>
          </section>
        ) : (
          /* ── Grid view — one white card per Consent type (Figma 336:170901) ── */
          grouped.map((g) => (
            <GroupSection
              key={g.type}
              type={g.type}
              rows={g.rows}
              cardStyle={CARD_STYLE}
              onView={(r) => navigate.push(`/consent/forms/${r.id}/view`)}
              onEdit={() => navigate.push('/consent/forms/new')}
              onSeeAll={() => { setFilterType(g.type); setPage(1); }}
            />
          ))
        )}
      </div>
    </QueuePageShell>
  );
}
