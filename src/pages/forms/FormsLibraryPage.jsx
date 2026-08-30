import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Icon from '@/components/icons/Icon';
import PrimarySearch from '@/components/search/PrimarySearch';
import { FilterDropdown } from '@/components/forms/FilterTag';
import ClearFiltersTag, { SmoothFilterResults } from '@/components/forms/ClearFiltersTag';
import useSmoothClearFilters from '@/hooks/useSmoothClearFilters';
import OverflowFlexRow from '@/components/overflow/OverflowFlexRow';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import StatusBadge from '@/components/badge/StatusBadge';
import BrandSubdueIconButton from '@/components/button/BrandSubdueIconButton';
import BrandButton from '@/components/button/BrandButton';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import Pagination from '@/components/pagination/Pagination';
import Popup from '@/components/popup/Popup';
import Table, { EllipsisText } from '@/components/table/Table';
import ViewToggle from '@/components/toggle/ViewToggle';
import Tooltip from '@/components/tooltip/Tooltip';
import NeutralSubdueIconButton from '@/components/button/NeutralSubdueIconButton';
import OfficialFormCover from '@/components/consent/OfficialFormCover';
import FormDetailPopup from '@/components/forms/FormDetailPopup';
import { countFields } from '@/components/forms/FormStructurePreview';
import EDocumentBuilderPopup from '@/components/form-builder/EDocumentBuilderPopup';
import SuccessToast from '@/components/toast/SuccessToast';
import { blocksFromLibraryForm } from '@/utils/formBuilderModel';
import {
  FORM_CATEGORIES,
  FORMS,
  getFormsByCategory,
  FORM_CATALOG_CATEGORY_BADGE,
  catalogVersionPill,
} from '@/data/formsLibrary';
import EDOCUMENT_NAV, { EDOCUMENT_BRAND_TITLE } from '@/pages/forms/edocumentNav';

const breadcrumb = ['คลังเอกสาร e-document'];

/** Deterministic mock dimensions for PHCIS Forms toolbar filters (`14:46491`). */
const U32 = (s) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};
const pick = (slug, salt, values) => values[U32(`${slug}\0${salt}`) % values.length];

const catalogFiltersForForm = (form) => {
  const { slug } = form;
  return {
    policy: pick(slug, 'policy', ['opd', 'ipd', 'er']),
    usage: pick(slug, 'usage', ['active', 'active', 'active', 'inactive', 'draft']),
    department: pick(slug, 'dept', ['medicine', 'surgery', 'pediatrics', 'psychiatry', 'pharmacy']),
    creator: pick(slug, 'creator', ['system', 'mr', 'somchai', 'wichai']),
    formStatus: pick(slug, 'fstat', ['published', 'published', 'pending', 'draft', 'archived']),
  };
};

const POLICY_FILTER_OPTIONS = [
  { value: 'all', label: 'ทั้งหมด' },
  { value: 'opd', label: 'OPD' },
  { value: 'ipd', label: 'IPD' },
  { value: 'er', label: 'ฉุกเฉิน' },
];

const USAGE_FILTER_OPTIONS = [
  { value: 'all', label: 'ทั้งหมด' },
  { value: 'active', label: 'เปิดใช้งาน' },
  { value: 'inactive', label: 'ปิดใช้งาน' },
  { value: 'draft', label: 'ร่าง' },
];

const DEPARTMENT_FILTER_OPTIONS = [
  { value: 'all', label: 'ทั้งหมด' },
  { value: 'medicine', label: 'อายุรกรรม' },
  { value: 'surgery', label: 'ศัลยกรรม' },
  { value: 'pediatrics', label: 'กุมารเวช' },
  { value: 'psychiatry', label: 'จิตเวช' },
  { value: 'pharmacy', label: 'เภสัชกรรม' },
];

const CREATOR_FILTER_OPTIONS = [
  { value: 'all', label: 'ทั้งหมด' },
  { value: 'system', label: 'ระบบ' },
  { value: 'mr', label: 'แผนกเวชระเบียน' },
  { value: 'somchai', label: 'นางสาวสมใจ ใจดี' },
  { value: 'wichai', label: 'นายวิชัย รักษ์สุข' },
];

const FORM_STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'ทั้งหมด' },
  { value: 'published', label: 'เผยแพร่แล้ว' },
  { value: 'pending', label: 'รออนุมัติ' },
  { value: 'draft', label: 'ร่าง' },
  { value: 'archived', label: 'เก็บถาวร' },
];

const FORM_THUMB_ASPECT_RATIO = '227 / 113';

/** จำนวนการ์ดมากสุดต่อหนึ่งหมวดในหน้ารวม — ที่เหลืออยู่ใน popup "ดูทั้งหมด" */
const SECTION_CARD_LIMIT = 20;

/** FormCard chrome — MIH Design System Card + PHCIS | Forms (`14:46491`). */
function catalogCardFrameStyle({ hovered }) {
  const brandDrop = 'var(--shadow-brand-drop-bottom-200)';
  if (hovered) {
    return {
      boxShadow: `0 0 0 4px var(--border-brandPrimaryButton-tertiary), ${brandDrop}`,
    };
  }
  return { boxShadow: '0 0 0 1px var(--border-card-default)' };
}

/* หน้าปกการ์ด = ตราสำนักอนามัย กรุงเทพมหานคร (มติผู้ใช้ 30 ส.ค. 69) —
   แบบเดียวกับการ์ดใบยินยอมใน [[ConsentFormsPage]] ภาพประกอบสต็อกเดิมซ้ำกัน
   ทุกใบในหมวดเดียวกัน จึงไม่ได้บอกว่าเอกสารเป็นของหน่วยงานไหน */
const FormThumb = () => (
  <div
    className='relative w-full shrink-0 overflow-hidden'
    style={{
      aspectRatio: FORM_THUMB_ASPECT_RATIO,
      background: 'var(--surface-card-100)',
      borderBottom: 'var(--dim-stroke-100) solid var(--border-card-default)',
    }}
  >
    <OfficialFormCover compact />
  </div>
);

const CatalogFormCard = ({ form, onView, onEdit }) => {
  const [hovered, setHovered] = useState(false);
  const badgeStyle = FORM_CATALOG_CATEGORY_BADGE[form.category] || 'grey';
  const versionPill = catalogVersionPill(form.version);

  return (
    <div
      role='group'
      className='w-full h-full min-h-0 bg-surface-card rounded-xl overflow-hidden flex flex-col gap-3 pb-3 transition-[box-shadow] duration-200 ease-out'
      style={catalogCardFrameStyle({ hovered })}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* กดที่หน้าปกหรือชื่อ = เปิดป๊อปอัปรายละเอียด (มติผู้ใช้ 30 ส.ค. 69) */}
      <button
        type='button'
        onClick={onView}
        className='shrink-0 block w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 rounded-t-xl'
        style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }}
        aria-label={`เปิดรายละเอียด ${form.name}`}
      >
        <FormThumb />
      </button>
      <div className='flex flex-1 min-h-0 flex-col gap-1.5 px-3'>
        <div className='flex flex-wrap gap-2 items-center'>
          <ColorfulBadge
            style={badgeStyle}
            size='small'
            hierarchy='secondary'
            showDot={false}
            showIcon={false}
          >
            {FORM_CATEGORIES.find((c) => c.key === form.category)?.label ?? form.category}
          </ColorfulBadge>
          {versionPill && (
            <ColorfulBadge
              style='magenta'
              size='small'
              hierarchy='secondary'
              showDot={false}
              showIcon={false}
            >
              {versionPill}
            </ColorfulBadge>
          )}
        </div>
        <button
          type='button'
          onClick={onView}
          className='text-sm font-bold text-ink leading-snug text-left hover:text-brand-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 rounded-sm'
          style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }}
        >
          {form.name}
        </button>
        <p className='text-xs text-ink-secondary leading-snug line-clamp-2'>{form.summary}</p>
        {form.code && (
          <p className='text-xs text-ink-tertiary font-medium tracking-wide'>{form.code}</p>
        )}
      </div>
      <div
        className='flex shrink-0 items-center justify-end gap-2 border-t border-solid pt-4 px-3'
        style={{ borderTopColor: 'var(--border-neutral-quaternary)' }}
      >
        <BrandSubdueIconButton
          type='button'
          size='sm'
          variant='fill'
          icon='visibility'
          aria-label={`ดูรายละเอียด ${form.name}`}
          onClick={onView}
        />
        <NeutralSubdueButton
          type='button'
          size='sm'
          variant='outline'
          leadingIcon='edit'
          aria-label={`แก้ไข ${form.name}`}
          onClick={onEdit}
        >
          แก้ไข
        </NeutralSubdueButton>
      </div>
    </div>
  );
};

/* แถบการ์ดหนึ่งหมวด — เลื่อนซ้าย-ขวา พร้อมปุ่มลูกศรใต้แถว (มติผู้ใช้ 30 ส.ค. 69)
   ลากสกรอลล์อย่างเดียวไม่พอ: บนเดสก์ท็อปที่ไม่มีทัชแพดสองนิ้ว ผู้ใช้ไม่รู้ว่า
   ยังมีการ์ดถัดไปอยู่ · ปุ่มโผล่เฉพาะตอนการ์ดล้นแถว และดับเมื่อสุดทาง */
const CardScroller = ({ children, label }) => {
  const trackRef = useRef(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const [overflowing, setOverflowing] = useState(false);

  const updateEdges = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 1);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 1);
    setOverflowing(el.scrollWidth > el.clientWidth + 1);
  }, []);

  useEffect(() => { updateEdges(); }, [children, updateEdges]);

  /* การ์ดกว้างคงที่ — ต้องวัดใหม่เมื่อ container เปลี่ยนขนาด ไม่ใช่แค่ตอน
     จำนวนการ์ดเปลี่ยน (ย่อ/ขยายหน้าต่าง หรือกางเมนูซ้าย) */
  useEffect(() => {
    if (typeof ResizeObserver === 'undefined') return undefined;
    const el = trackRef.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(updateEdges);
    ro.observe(el);
    return () => ro.disconnect();
  }, [updateEdges]);

  const slide = (dir) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(el.clientWidth * 0.9, 280), behavior: 'smooth' });
  };

  return (
    <div className='flex flex-col w-full min-w-0' style={{ gap: 'var(--dim-space-300)' }}>
      <div
        ref={trackRef}
        onScroll={updateEdges}
        className='flex w-full min-w-0 overflow-x-auto scrollbar-thin'
        style={{
          gap: 'var(--dim-space-400)',
          /* เว้นขอบในแทร็ก ไม่งั้นวงแหวน/เงารอบการ์ดใบแรกกับใบสุดท้ายโดน
             overflow ตัดจนดูเหมือนการ์ดถูก crop (มติผู้ใช้ 30 ส.ค. 69) */
          paddingTop: 'var(--dim-space-100)',
          paddingBottom: 'var(--dim-space-200)',
          paddingLeft: 'var(--dim-space-100)',
          paddingRight: 'var(--dim-space-100)',
          scrollSnapType: 'x proximity',
          scrollPaddingLeft: 'var(--dim-space-100)',
          scrollPaddingRight: 'var(--dim-space-100)',
        }}
      >
        {children}
      </div>
      {overflowing && (
        <div className='flex items-center justify-center w-full' style={{ gap: 'var(--dim-space-200)' }}>
          <NeutralSubdueIconButton
            variant='outline'
            size='sm'
            icon='chevron_left'
            disabled={atStart}
            onClick={() => slide(-1)}
            aria-label={`เลื่อน${label}ไปทางซ้าย`}
          />
          <NeutralSubdueIconButton
            variant='outline'
            size='sm'
            icon='chevron_right'
            disabled={atEnd}
            onClick={() => slide(1)}
            aria-label={`เลื่อน${label}ไปทางขวา`}
          />
        </div>
      )}
    </div>
  );
};

const FormsLibraryPage = () => {
  const history = useHistory();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [policyFilter, setPolicyFilter] = useState('all');
  const [usageFilter, setUsageFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [creatorFilter, setCreatorFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  /* สองมุมมองเหมือนทะเบียนแบบฟอร์มความยินยอม (มติผู้ใช้ 30 ส.ค. 69):
     'list' = ตาราง · 'grid' = การ์ดแยกตามหมวด */
  const [viewMode, setViewMode] = useState('grid');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  /* ดู/แก้ไขจากการ์ดเปิดเป็นป๊อปอัป ไม่ย้ายหน้า (มติผู้ใช้ 30 ส.ค. 69) */
  const [detailForm, setDetailForm] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [savedToast, setSavedToast] = useState('');
  /* สร้างเอกสารใหม่เปิดเป็น popup ไม่ย้ายไปหน้า /doc-template/new
     (มติผู้ใช้ 30 ส.ค. 69) — ผู้ใช้ยังคาตัวกรอง/คำค้นของคลังไว้อยู่ */
  const [createOpen, setCreateOpen] = useState(false);
  /* "ดูทั้งหมด" ของหมวด = popup รวมทุกใบในหมวดนั้น ไม่ย้ายไปหน้าหมวด
     (มติผู้ใช้ 30 ส.ค. 69) */
  const [categoryPopup, setCategoryPopup] = useState(null);

  const normalizedQuery = search.trim().toLowerCase();

  const filtersAreDefault =
    categoryFilter === 'all' &&
    policyFilter === 'all' &&
    usageFilter === 'all' &&
    departmentFilter === 'all' &&
    creatorFilter === 'all' &&
    statusFilter === 'all';

  const resetToolbarFilters = () => {
    setCategoryFilter('all');
    setPolicyFilter('all');
    setUsageFilter('all');
    setDepartmentFilter('all');
    setCreatorFilter('all');
    setStatusFilter('all');
    setPage(1);
  };

  const filtersActive = !filtersAreDefault || !!normalizedQuery;
  const { showClearChip, resultsOpaque, clearFilters } = useSmoothClearFilters(
    filtersActive,
    () => {
      resetToolbarFilters();
      setSearch('');
    },
  );

  const passesToolbarFilters = (form) => {
    const m = catalogFiltersForForm(form);
    if (policyFilter !== 'all' && m.policy !== policyFilter) return false;
    if (usageFilter !== 'all' && m.usage !== usageFilter) return false;
    if (departmentFilter !== 'all' && m.department !== departmentFilter) return false;
    if (creatorFilter !== 'all' && m.creator !== creatorFilter) return false;
    if (statusFilter !== 'all' && m.formStatus !== statusFilter) return false;
    return true;
  };

  /** ตัวเลือกประเภท — label รายการแรกตรง Figma PHCIS | Forms `11:8151` (ทุกประเภท). */
  const categoryFilterOptions = useMemo(
    () => [
      { value: 'all', label: 'ทุกประเภท' },
      ...FORM_CATEGORIES.map((c) => ({ value: c.key, label: c.label })),
    ],
    [],
  );

  const visibleCategories = useMemo(() => {
    if (categoryFilter === 'all') return FORM_CATEGORIES;
    return FORM_CATEGORIES.filter((c) => c.key === categoryFilter);
  }, [categoryFilter]);

  const filteredFormsFlat = useMemo(() => {
    const q = normalizedQuery;
    return FORMS.filter((f) => {
      if (categoryFilter !== 'all' && f.category !== categoryFilter) return false;
      if (!passesToolbarFilters(f)) return false;
      if (!q) return true;
      const blob = [f.name, f.summary, f.slug, f.code, f.language]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return blob.includes(q);
    });
  }, [categoryFilter, normalizedQuery, policyFilter, usageFilter, departmentFilter, creatorFilter, statusFilter]);

  const queryMatchesForm = (form) => {
    if (!passesToolbarFilters(form)) return false;
    if (!normalizedQuery) return true;
    const blob = [form.name, form.summary, form.slug, form.code, form.language]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return blob.includes(normalizedQuery);
  };

  const searchSuggestions = useMemo(() => {
    const t = search.trim().toLowerCase();
    if (t.length < 1) return [];
    return FORMS.filter((f) => {
      const blob = [f.name, f.summary, f.slug, f.code, f.language]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return blob.includes(t);
    })
      .slice(0, 10)
      .map((f) => ({
        id: f.slug,
        label: f.name,
        sublabel: [f.code, FORM_CATEGORIES.find((c) => c.key === f.category)?.label]
          .filter(Boolean)
          .join(' · '),
        value: [f.name, f.code, f.summary].filter(Boolean).join(' '),
      }));
  }, [search]);

  /* ── มุมมองตาราง ────────────────────────────────────────────────── */
  const IconAction = ({ hint, ...props }) => (
    <Tooltip content={hint} position='top' variant='light'>
      <span className='inline-flex shrink-0'>
        <NeutralSubdueIconButton variant='outline' size='sm' aria-label={hint} {...props} />
      </span>
    </Tooltip>
  );

  const tableColumns = useMemo(() => [
    { key: 'code', header: 'รหัสแบบฟอร์ม', sortable: true, render: (r) => <span className='text-sm text-ink'>{r.code || '-'}</span> },
    {
      key: 'name',
      header: 'ชื่อแบบฟอร์ม',
      sortable: true,
      minWidth: 280,
      render: (r) => (
        <div className='min-w-0 w-full text-sm text-ink'>
          <EllipsisText text={r.name || '-'} />
        </div>
      ),
    },
    {
      key: 'category',
      header: 'ประเภท',
      sortable: true,
      render: (r) => (
        <ColorfulBadge
          style={FORM_CATALOG_CATEGORY_BADGE[r.category] || 'grey'}
          size='small'
          hierarchy='secondary'
          showDot={false}
          showIcon={false}
          width='hug'
        >
          {FORM_CATEGORIES.find((c) => c.key === r.category)?.label ?? r.category}
        </ColorfulBadge>
      ),
    },
    {
      key: 'version',
      header: 'เวอร์ชั่น',
      render: (r) => (
        <ColorfulBadge style='magenta' size='small' hierarchy='secondary' showDot={false} showIcon={false} width='hug'>
          {catalogVersionPill(r.version)}
        </ColorfulBadge>
      ),
    },
    {
      key: 'fields',
      header: 'จำนวนช่อง',
      sortable: true,
      render: (r) => <span className='text-sm text-ink-secondary'>{countFields(r)} ช่อง</span>,
    },
    {
      key: 'minutes',
      header: 'เวลาโดยประมาณ',
      sortable: true,
      render: (r) => <span className='text-sm text-ink-secondary'>~{r.estimatedMinutes} นาที</span>,
    },
    {
      key: 'status',
      header: 'สถานะ',
      render: (r) => {
        const status = catalogFiltersForForm(r).formStatus;
        const label = FORM_STATUS_FILTER_OPTIONS.find((o) => o.value === status)?.label ?? status;
        return (
          <StatusBadge style={status === 'published' ? 'success' : 'neutral'} size='small' showDot={false}>
            {label}
          </StatusBadge>
        );
      },
    },
    {
      key: 'actions',
      header: 'การดำเนินการ',
      minWidth: 200,
      render: (r) => (
        <div className='flex items-center justify-end flex-wrap shrink-0' style={{ gap: 'var(--dim-space-150)' }}>
          <IconAction icon='visibility' hint='ดูแบบฟอร์ม' onClick={() => setDetailForm(r)} />
          <IconAction icon='print' hint='พิมพ์' onClick={() => window.print?.()} />
          <NeutralSubdueButton
            leadingIcon='edit'
            size='sm'
            variant='outline'
            className='shrink-0'
            onClick={() => { setDetailForm(null); setEditForm(r); }}
          >
            แก้ไข
          </NeutralSubdueButton>
        </div>
      ),
    },
  ], []);

  const handleSort = (key) => setSortConfig((prev) => (
    prev.key === key
      ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
      : { key, direction: 'asc' }
  ));

  const sortedForms = useMemo(() => {
    const rows = [...filteredFormsFlat];
    const { key, direction } = sortConfig;
    if (!key) return rows;
    const valueOf = (r) => {
      if (key === 'fields') return countFields(r);
      if (key === 'minutes') return r.estimatedMinutes ?? 0;
      if (key === 'category') return FORM_CATEGORIES.find((c) => c.key === r.category)?.label ?? '';
      return r[key] ?? '';
    };
    rows.sort((a, b) => {
      const va = valueOf(a);
      const vb = valueOf(b);
      const cmp = typeof va === 'number' && typeof vb === 'number'
        ? va - vb
        : String(va).localeCompare(String(vb), 'th');
      return direction === 'asc' ? cmp : -cmp;
    });
    return rows;
  }, [filteredFormsFlat, sortConfig]);

  const pageSize = 20;
  const pageCount = Math.max(1, Math.ceil(sortedForms.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const rangeStart = sortedForms.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const rangeEnd = Math.min(safePage * pageSize, sortedForms.length);
  const pageRows = sortedForms.slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <div className='min-h-screen w-full flex bg-brand-50'>
      <Sidebar
        activeKey='edocument-catalog'
        items={EDOCUMENT_NAV}
        fallbackKey='edocument-dashboard'
      />
      <main className='flex-1 flex flex-col min-w-0'>
        <Header breadcrumb={breadcrumb} brandTitle={EDOCUMENT_BRAND_TITLE} />
        <div className='p-3 md:p-6 flex-1 flex flex-col' style={{ gap: 'var(--dim-space-500)' }}>
          {/* Search + filter toolbar — PHCIS | Forms */}
          <section
            className='bg-surface-card rounded-card shadow-card flex flex-col w-full'
            style={{
              padding: 'var(--dim-space-500)',
              gap: 'var(--dim-space-400)',
            }}
          >
            {/* แถวหัวการ์ด — ปุ่มสร้างเอกสารใหม่ (มติผู้ใช้ 30 ส.ค. 69) เมนูซ้ายมี
                ทางเข้า `/doc-template/new` อยู่แล้ว แต่คนที่กวาดตาอยู่กลางหน้ารวม
                ไม่เห็น จึงต้องมีปุ่มหลักอยู่บนหน้านี้ด้วย */}
            <div
              className='flex flex-wrap items-center justify-between w-full min-w-0'
              style={{ gap: 'var(--dim-space-300)' }}
            >
              <div className='flex flex-col min-w-0'>
                <h1 className='text-base font-bold text-ink'>คลังเอกสาร e-document</h1>
                <p className='text-xs text-ink-secondary'>
                  {FORMS.length} แบบฟอร์ม · {FORM_CATEGORIES.length} หมวดหมู่
                </p>
              </div>
              <BrandButton
                type='button'
                size='md'
                leadingIcon='note_add'
                className='shrink-0'
                onClick={() => setCreateOpen(true)}
              >
                สร้างเอกสาร e-document ใหม่
              </BrandButton>
            </div>
            <div className='w-full min-w-0 max-w-[640px] mx-auto'>
              <PrimarySearch
                value={search}
                onChange={(next) => {
                  setSearch(typeof next === 'string' ? next : '');
                  setPage(1);
                }}
                onSubmit={(next) => {
                  setSearch(typeof next === 'string' ? next : search);
                  setPage(1);
                }}
                placeholder='ค้นหาชื่อแบบฟอร์ม รหัส หรือคำอธิบาย…'
                width='100%'
                avatars={[]}
                history={[]}
                historyEmptyMessage={null}
                suggestions={searchSuggestions}
                suggestionsTitle='แบบฟอร์มที่ตรงกัน'
                emptyMessage='ไม่พบแบบฟอร์มที่ตรงกับคำค้น'
                scrollOffsetTop={null}
              />
            </div>
            <div role='toolbar' aria-label='กรองแบบฟอร์ม' className='w-full min-w-0'>
            <OverflowFlexRow className='w-full min-w-0' itemGap='var(--dim-space-200)' moreAriaLabel='แสดงตัวกรองที่ซ่อน'>
              <FilterDropdown
                prefix='ประเภท:'
                value={categoryFilter}
                onChange={(next) => {
                  setCategoryFilter(next);
                  setPage(1);
                }}
                options={categoryFilterOptions}
                variant='brand'
                size='lg'
              />
              <FilterDropdown
                prefix='กลุ่มนโยบาย:'
                value={policyFilter}
                onChange={(next) => {
                  setPolicyFilter(next);
                  setPage(1);
                }}
                options={POLICY_FILTER_OPTIONS}
                variant='brand'
                size='lg'
              />
              <FilterDropdown
                prefix='สถานะการใช้งาน:'
                value={usageFilter}
                onChange={(next) => {
                  setUsageFilter(next);
                  setPage(1);
                }}
                options={USAGE_FILTER_OPTIONS}
                variant='brand'
                size='lg'
              />
              <FilterDropdown
                prefix='หน่วยงาน:'
                value={departmentFilter}
                onChange={(next) => {
                  setDepartmentFilter(next);
                  setPage(1);
                }}
                options={DEPARTMENT_FILTER_OPTIONS}
                variant='brand'
                size='lg'
              />
              <FilterDropdown
                prefix='ผู้สร้าง:'
                value={creatorFilter}
                onChange={(next) => {
                  setCreatorFilter(next);
                  setPage(1);
                }}
                options={CREATOR_FILTER_OPTIONS}
                variant='brand'
                size='lg'
              />
              <FilterDropdown
                prefix='สถานะ:'
                value={statusFilter}
                onChange={(next) => {
                  setStatusFilter(next);
                  setPage(1);
                }}
                options={FORM_STATUS_FILTER_OPTIONS}
                variant='brand'
                size='lg'
              />
              <ClearFiltersTag active={showClearChip} onClear={clearFilters} size='lg' />
            </OverflowFlexRow>
            </div>
            {/* สลับมุมมอง ตาราง ↔ การ์ด แบบเดียวกับทะเบียนแบบฟอร์มความยินยอม */}
            <div className='flex items-center justify-end w-full' style={{ gap: 'var(--dim-space-200)' }}>
              <span
                style={{
                  color: 'var(--text-content-tertiary)',
                  fontFamily: 'var(--type-family-body)',
                  fontSize: 'var(--type-size-sm)',
                }}
              >
                มุมมอง
              </span>
              <ViewToggle value={viewMode} onChange={setViewMode} />
            </div>
          </section>

          <SmoothFilterResults opaque={resultsOpaque}>
          {filteredFormsFlat.length === 0 && (
            <section
              className='bg-surface-card rounded-card shadow-card border border-dashed flex flex-col items-center justify-center text-center'
              style={{
                padding: 'var(--dim-space-800)',
                gap: 'var(--dim-space-300)',
                borderColor: 'var(--border-neutral-tertiary)',
              }}
            >
              <span style={{ color: 'var(--text-ink-tertiary)' }} aria-hidden>
                <Icon name='search' size={32} />
              </span>
              <p className='text-sm font-medium text-ink'>ไม่พบแบบฟอร์ม</p>
              <p className='text-xs text-ink-secondary max-w-md'>
                ลองปรับตัวกรอง กด &ldquo;ทั้งหมด&rdquo; เพื่อรีเซ็ต หรือเปลี่ยนคำค้นหา
              </p>
            </section>
          )}

          {viewMode === 'list' ? (
            <section
              className='bg-surface-card rounded-card shadow-card flex flex-col w-full'
              style={{ padding: 'var(--dim-space-600)', gap: 'var(--dim-space-400)' }}
            >
              <Table
                columns={tableColumns}
                rows={pageRows}
                rowKey={(row) => row.slug}
                sortConfig={sortConfig}
                onSort={handleSort}
                stickyColCount={1}
                emptyMessage='ไม่พบแบบฟอร์ม'
                emptySubtext='ลองปรับตัวกรองหรือเปลี่ยนคำค้นหา'
              />
            </section>
          ) : visibleCategories.map((category) => {
            const forms = getFormsByCategory(category.key).filter(queryMatchesForm);
            if (forms.length === 0) return null;
            /* แถวของหมวดแสดงมากสุด 20 ใบ (มติผู้ใช้ 30 ส.ค. 69) — ที่เหลือดูได้
               จากปุ่ม "ดูทั้งหมด" ซึ่งเปิด popup รวมทุกใบของหมวดนั้น */
            const rowForms = forms.slice(0, SECTION_CARD_LIMIT);

            return (
              <section
                key={category.key}
                id={`forms-section-${category.key}`}
                className='bg-surface-card rounded-card shadow-card flex flex-col w-full'
                style={{
                  padding: 'var(--dim-space-600)',
                  gap: 'var(--dim-space-500)',
                }}
              >
                <div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
                  <div className='flex items-start w-full min-w-0' style={{ gap: 'var(--dim-space-300)' }}>
                    {/*
                      PHCIS | Forms `14:46491` — IconTile: circle 48, surface/brandPrimary/tertiary,
                      icon assignment_add + text/brandPrimary/default (ทุกหมวดเดียวกันในฟิกมา)
                    */}
                    <div
                      className='shrink-0 inline-flex items-center justify-center'
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 'var(--dim-radius-full)',
                        background: 'var(--surface-brandPrimary-tertiary)',
                        color: 'var(--text-brandPrimary-default)',
                      }}
                    >
                      <Icon name='assignment_add' size={24} />
                    </div>
                    <div className='flex-1 min-w-0 flex flex-col gap-1'>
                      <div className='flex flex-wrap items-center gap-2'>
                        <h2 className='text-base font-bold text-brand-500'>{category.label}</h2>
                        <span
                          className='inline-flex items-center justify-center'
                          style={{
                            height: 22,
                            minWidth: 32,
                            paddingLeft: 'var(--dim-space-200)',
                            paddingRight: 'var(--dim-space-200)',
                            borderRadius: 'var(--dim-radius-full)',
                            background: 'var(--surface-neutral-quaternary)',
                            color: 'var(--text-ink-secondary)',
                            fontFamily: 'var(--type-family-body)',
                            fontWeight: 'var(--type-weight-medium)',
                            fontSize: 'var(--type-size-xs)',
                            lineHeight: 1.5,
                          }}
                        >
                          {forms.length > SECTION_CARD_LIMIT
                            ? `แสดง ${SECTION_CARD_LIMIT} จาก ${forms.length} แบบฟอร์ม`
                            : `${forms.length} แบบฟอร์ม`}
                        </span>
                      </div>
                      <p className='text-sm text-ink-secondary'>{category.description}</p>
                    </div>
                  </div>
                  <BrandSubdueButton
                    type='button'
                    size='sm'
                    variant='outline'
                    trailingIcon='chevron_right'
                    className='shrink-0 self-start sm:self-center'
                    onClick={() => setCategoryPopup(category)}
                  >
                    ดูทั้งหมด
                  </BrandSubdueButton>
                </div>

                {/* หนึ่งหมวด = การ์ดแถวเดียว เลื่อนซ้าย-ขวา (มติผู้ใช้ 30 ส.ค. 69)
                    เดิมเป็นกริดหลายแถว ทำให้หมวดที่มี 51 ใบดันหมวดถัดไปตกจอ */}
                <CardScroller label={category.label}>
                  {rowForms.map((form) => (
                    <div
                      key={form.slug}
                      className='shrink-0'
                      style={{ width: 'var(--dim-size-2450, 280px)', scrollSnapAlign: 'start' }}
                    >
                      <CatalogFormCard
                        form={form}
                        onView={() => setDetailForm(form)}
                        onEdit={() => { setDetailForm(null); setEditForm(form); }}
                      />
                    </div>
                  ))}
                </CardScroller>
              </section>
            );
          })}

          <section
            className='bg-surface-card rounded-card shadow-card flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'
            style={{ padding: 'var(--dim-space-400) var(--dim-space-600)' }}
          >
            <p className='text-sm text-ink-secondary'>
              {sortedForms.length === 0
                ? 'ไม่พบแบบฟอร์มที่ตรงกับการค้นหา'
                : (viewMode === 'list'
                  ? `แสดง ${rangeStart}-${rangeEnd} จาก ${sortedForms.length} รายการ`
                  : `ทั้งหมด ${sortedForms.length} รายการ · เลื่อนการ์ดซ้าย-ขวาในแต่ละหมวด`)}
            </p>
            {/* มุมมองการ์ดแสดงครบทุกใบในแถวเลื่อนอยู่แล้ว จึงไม่ต้องแบ่งหน้า */}
            {viewMode === 'list' && (
              <Pagination
                currentPage={safePage}
                pageCount={pageCount}
                onPageChange={setPage}
                siblingCount={1}
              />
            )}
          </section>
          </SmoothFilterResults>
        </div>
        <Footer copyright='© 2026 ศูนย์การพยาบาลคุณภาพ ดินแดง กรุงเทพมหานคร' />
      </main>

      <FormDetailPopup
        open={!!detailForm}
        form={detailForm}
        onClose={() => setDetailForm(null)}
        onEdit={() => { setEditForm(detailForm); setDetailForm(null); }}
        onOpenFullPage={() => detailForm && history.push(`/forms/${detailForm.slug}/fill`)}
        onSaved={({ name }) => setSavedToast(`บันทึกร่าง “${name}” แล้ว`)}
      />

      {/* แก้ไข = เปิดตัวสร้างแบบฟอร์มพร้อมบล็อกของใบนี้ (ตัวเดียวกับที่ใช้
          สร้างเอกสารใหม่) — ต้นแบบยังไม่มีที่เก็บถาวร จึงแจ้งผลด้วย toast */}
      <EDocumentBuilderPopup
        open={!!editForm}
        onClose={() => setEditForm(null)}
        editing={editForm ? {
          id: editForm.slug,
          name: editForm.name,
          blocks: blocksFromLibraryForm(editForm),
          templateSlug: editForm.slug,
        } : null}
        title={editForm ? `แก้ไขแบบฟอร์ม · ${editForm.name}` : undefined}
        subtitle='ปรับโครงสร้างแบบฟอร์มในคลังเอกสาร e-document แล้วบันทึกเป็นเวอร์ชันใหม่'
        onSave={({ name }) => {
          setEditForm(null);
          setSavedToast(`บันทึกการแก้ไข “${name}” แล้ว`);
        }}
      />

      {/* ดูทั้งหมดของหมวด — การ์ดทุกใบในกริด ไม่ต้องเลื่อนทีละแถว */}
      <Popup
        open={!!categoryPopup}
        onClose={() => setCategoryPopup(null)}
        title={categoryPopup?.label ?? ''}
        subtitle={categoryPopup
          ? `${getFormsByCategory(categoryPopup.key).length} แบบฟอร์ม · ${categoryPopup.description}`
          : ''}
        size='extraLarge'
        bodyScrollable
        primaryAction={{ label: 'ปิด', onClick: () => setCategoryPopup(null) }}
      >
        {categoryPopup && (
          <div
            className='grid w-full min-w-0'
            style={{
              gridTemplateColumns: 'repeat(auto-fill, minmax(var(--dim-size-2450, 280px), 1fr))',
              gap: 'var(--dim-space-400)',
              alignItems: 'start',
              padding: 'var(--dim-space-100)',
            }}
          >
            {getFormsByCategory(categoryPopup.key).filter(queryMatchesForm).map((form) => (
              <CatalogFormCard
                key={form.slug}
                form={form}
                onView={() => { setCategoryPopup(null); setDetailForm(form); }}
                onEdit={() => { setCategoryPopup(null); setEditForm(form); }}
              />
            ))}
          </div>
        )}
      </Popup>

      <EDocumentBuilderPopup
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title='สร้างเอกสาร e-document ใหม่'
        subtitle='เลือกแบบฟอร์มตั้งต้นจากคลัง หรือเริ่มจากเอกสารเปล่า แล้วปรับด้วยตัวสร้างแบบฟอร์ม'
        onSave={({ name }) => {
          setCreateOpen(false);
          setSavedToast(`สร้างเอกสาร “${name}” แล้ว`);
        }}
      />

      <SuccessToast
        open={!!savedToast}
        message={savedToast}
        onClose={() => setSavedToast('')}
      />
    </div>
  );
};

export default FormsLibraryPage;
