import React, { useMemo, useState } from 'react';
import { Link, useHistory } from 'react-router-dom';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Icon from '@/components/icons/Icon';
import PrimarySearch from '@/components/search/PrimarySearch';
import FilterTag, { FilterDropdown } from '@/components/forms/FilterTag';
import OverflowFlexRow from '@/components/overflow/OverflowFlexRow';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import StatusBadge from '@/components/badge/StatusBadge';
import BrandSubdueIconButton from '@/components/button/BrandSubdueIconButton';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import Pagination from '@/components/pagination/Pagination';
import {
  FORM_CATEGORIES,
  FORMS,
  getFormsByCategory,
  FORM_COVER_FOR_CATALOG,
  FORM_CATALOG_CATEGORY_BADGE,
  catalogVersionPill,
} from '@/data/formsLibrary';

const breadcrumb = ['คลังแบบฟอร์ม'];

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

const FormThumb = ({ src, alt = '' }) => (
  <div
    className='relative w-full shrink-0 overflow-hidden bg-brand-100'
    style={{
      aspectRatio: FORM_THUMB_ASPECT_RATIO,
      borderBottom: 'var(--dim-stroke-100) solid var(--border-card-default)',
    }}
  >
    <img
      src={src}
      alt={alt}
      className='absolute inset-0 h-full w-full object-cover object-center'
      loading='lazy'
      decoding='async'
    />
  </div>
);

const CatalogFormCard = ({ form }) => {
  const history = useHistory();
  const [hovered, setHovered] = useState(false);
  const badgeStyle = FORM_CATALOG_CATEGORY_BADGE[form.category] || 'grey';
  const coverSrc = FORM_COVER_FOR_CATALOG[form.category] || FORM_COVER_FOR_CATALOG.survey;
  const versionPill = catalogVersionPill(form.version);

  return (
    <div
      role='group'
      className='w-full h-full min-h-0 bg-white rounded-xl overflow-hidden flex flex-col gap-3 pb-3 transition-[box-shadow] duration-200 ease-out'
      style={catalogCardFrameStyle({ hovered })}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Link to={`/forms/${form.slug}`} className='shrink-0 block focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 rounded-t-xl' aria-label={`เปิดรายละเอียด ${form.name}`}>
        <FormThumb src={coverSrc} alt='' />
      </Link>
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
        <Link
          to={`/forms/${form.slug}`}
          className='text-sm font-bold text-ink leading-snug hover:text-brand-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 rounded-sm'
        >
          {form.name}
        </Link>
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
          onClick={() => history.push(`/forms/${form.slug}`)}
        />
        <NeutralSubdueButton
          type='button'
          size='sm'
          variant='outline'
          leadingIcon='edit'
          aria-label={`กรอกหรือแก้ไข ${form.name}`}
          onClick={() => history.push(`/forms/${form.slug}/fill`)}
        >
          แก้ไข
        </NeutralSubdueButton>
      </div>
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

  const pageSize = 20;
  const pageCount = Math.max(1, Math.ceil(filteredFormsFlat.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const rangeStart = filteredFormsFlat.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const rangeEnd = Math.min(safePage * pageSize, filteredFormsFlat.length);

  return (
    <div className='min-h-screen w-full flex bg-brand-50'>
      <Sidebar activeKey='consent' />
      <main className='flex-1 flex flex-col min-w-0'>
        <Header breadcrumb={breadcrumb} />
        <div className='p-3 md:p-6 flex-1 flex flex-col' style={{ gap: 'var(--dim-space-500)' }}>
          {/* Search + filter toolbar — PHCIS | Forms */}
          <section
            className='bg-white rounded-card shadow-card flex flex-col w-full'
            style={{
              padding: 'var(--dim-space-500)',
              gap: 'var(--dim-space-400)',
            }}
          >
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
              <FilterTag
                value='ทั้งหมด'
                variant='brand'
                size='lg'
                selected={filtersAreDefault}
                showLeadingIcon={false}
                showTailingIcon={false}
                onClick={resetToolbarFilters}
              />
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
            </OverflowFlexRow>
            </div>
          </section>

          {filteredFormsFlat.length === 0 && (
            <section
              className='bg-white rounded-card shadow-card border border-dashed flex flex-col items-center justify-center text-center'
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

          {visibleCategories.map((category) => {
            const forms = getFormsByCategory(category.key).filter(queryMatchesForm);
            if (forms.length === 0) return null;

            return (
              <section
                key={category.key}
                id={`forms-section-${category.key}`}
                className='bg-white rounded-card shadow-card flex flex-col w-full'
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
                        <StatusBadge style='success' size='small' showDot={false} icon='check_circle'>
                          เปิดใช้งาน
                        </StatusBadge>
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
                          {forms.length} แบบฟอร์ม
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
                    onClick={() => history.push(`/forms/category/${category.key}`)}
                  >
                    ดูทั้งหมด
                  </BrandSubdueButton>
                </div>

                <div
                  className='grid w-full'
                  style={{
                    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                    gap: 'var(--dim-space-400)',
                  }}
                >
                  {forms.map((form) => (
                    <CatalogFormCard key={form.slug} form={form} />
                  ))}
                </div>
              </section>
            );
          })}

          <section
            className='bg-white rounded-card shadow-card flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'
            style={{ padding: 'var(--dim-space-400) var(--dim-space-600)' }}
          >
            <p className='text-sm text-ink-secondary'>
              {filteredFormsFlat.length === 0
                ? 'ไม่พบแบบฟอร์มที่ตรงกับการค้นหา'
                : `แสดง ${rangeStart}-${rangeEnd} จาก ${filteredFormsFlat.length} รายการ`}
            </p>
            <Pagination
              currentPage={safePage}
              pageCount={pageCount}
              onPageChange={setPage}
              siblingCount={1}
            />
          </section>
        </div>
        <Footer copyright='© 2026 ศูนย์การพยาบาลคุณภาพ ดินแดง กรุงเทพมหานคร' />
      </main>
    </div>
  );
};

export default FormsLibraryPage;
