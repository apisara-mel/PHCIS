import React, { useMemo, useState } from 'react';
import { Link, useHistory, useParams } from 'react-router-dom';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Icon from '@/components/icons/Icon';
import TabPill from '@/components/tab/TabPill';
import Pagination from '@/components/pagination/Pagination';
import {
  FORM_CATEGORIES,
  FORMS,
  CATEGORY_PALETTE,
  getCategory,
  getFormsByCategory,
} from '@/data/formsLibrary';

/* คลังแบบฟอร์ม → category drill-down (Figma 14:79835).
   Routed at `/forms/category/:categoryKey`. Renders:
     • breadcrumb: คลังแบบฟอร์ม > [category label]
     • page title + form count
     • search bar (filters by form name / summary)
     • category filter tabs (TabPill row, "ทั้งหมด" + each FORM_CATEGORY)
     • responsive form-card grid (CSS auto-fill, min 220px)
     • pagination footer

   Tabs let the user pivot to other categories without going back to the
   /forms hub. Selecting "ทั้งหมด" shows every form across categories. */

const PAGE_SIZE = 20;

/* Card surface — slightly richer than the catalog's `FormCard`:
     • top icon strip in the category tone (visual category cue)
     • title row + summary
     • footer with field count, language, version
   Click → navigate to /forms/:slug (FormDetailPage). */
const CategoryFormCard = ({ form }) => {
  const cat = getCategory(form.category);
  const tone = (cat && CATEGORY_PALETTE[cat.color]) || CATEGORY_PALETTE.brand;
  const fieldCount = form.sections.reduce((sum, s) => sum + s.fields.length, 0);

  return (
    <Link
      to={`/forms/${form.slug}`}
      className='flex flex-col w-full text-left bg-surface-card rounded-xl transition-shadow hover:shadow-cardHover'
      style={{
        border: 'var(--dim-stroke-100) solid var(--border-card-default)',
        textDecoration: 'none',
        color: 'inherit',
        overflow: 'hidden',
      }}
    >
      {/* Top illustration strip — brand-tinted backdrop with a large
          category icon + version chip overlay. */}
      <div
        className='w-full flex items-center justify-center relative'
        style={{
          height: 120,
          background: tone.surface,
          color: tone.text,
        }}
      >
        <Icon name={cat?.icon || 'description'} size={48} />
        <span
          className='absolute'
          style={{
            top: 'var(--dim-space-200)',
            right: 'var(--dim-space-200)',
            height: 22,
            paddingLeft: 'var(--dim-space-200)',
            paddingRight: 'var(--dim-space-200)',
            borderRadius: 'var(--dim-radius-full)',
            background: 'rgba(255,255,255,0.85)',
            color: tone.text,
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-xs)',
            fontWeight: 'var(--type-weight-medium)',
            display: 'inline-flex',
            alignItems: 'center',
          }}
        >
          {form.version}
        </span>
      </div>

      {/* Body */}
      <div
        className='flex flex-col w-full'
        style={{ padding: 'var(--dim-space-400)', gap: 'var(--dim-space-200)' }}
      >
        <h3 className='text-sm font-bold text-ink leading-snug'>{form.name}</h3>
        <p className='text-xs text-ink-secondary leading-snug' style={{
          display: '-webkit-box',
          WebkitBoxOrient: 'vertical',
          WebkitLineClamp: 3,
          overflow: 'hidden',
        }}>
          {form.summary}
        </p>

        <div
          className='flex items-center flex-wrap text-xs text-ink-tertiary'
          style={{ gap: 'var(--dim-space-300)' }}
        >
          <span className='inline-flex items-center gap-1'>
            <Icon name='form' size={14} />
            {fieldCount} ช่อง
          </span>
          <span className='inline-flex items-center gap-1'>
            <Icon name='clock' size={14} />
            ~{form.estimatedMinutes} นาที
          </span>
          <span className='ml-auto inline-flex items-center text-brand-500 font-medium'>
            ดูรายละเอียด
            <Icon name='chevron-right' size={14} />
          </span>
        </div>
      </div>
    </Link>
  );
};

const FormsCategoryPage = () => {
  const { categoryKey } = useParams();
  const history = useHistory();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  /* Active category — pinned by URL, defaults to "all" on /forms/category/all. */
  const activeCategory = categoryKey === 'all' ? null : getCategory(categoryKey);
  const activeKey = categoryKey || 'all';

  /* Source list — every form when active=all, otherwise just this category. */
  const sourceForms = useMemo(() => {
    if (!activeCategory) return FORMS;
    return getFormsByCategory(activeCategory.key);
  }, [activeCategory]);

  /* Filter by search query across name + summary (case-insensitive). */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sourceForms;
    return sourceForms.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        f.summary.toLowerCase().includes(q),
    );
  }, [sourceForms, search]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const start = (safePage - 1) * PAGE_SIZE;
  const visible = filtered.slice(start, start + PAGE_SIZE);

  /* Tab change — also clears search state so the new tab's results are
     visible immediately (otherwise a stale query may zero them out). */
  const onTabChange = (key) => {
    setPage(1);
    history.push(`/forms/category/${key}`);
  };

  const breadcrumb = activeCategory
    ? ['คลังแบบฟอร์ม', activeCategory.label]
    : ['คลังแบบฟอร์ม', 'ทั้งหมด'];

  const title = activeCategory ? activeCategory.label : 'แบบฟอร์มทั้งหมด';
  const description = activeCategory
    ? activeCategory.description
    : 'ทุกประเภทแบบฟอร์มใน 1 หน้า — ใช้แท็บด้านล่างเพื่อกรองตามประเภท';

  return (
    <div className='min-h-screen w-full flex bg-brand-50'>
      <Sidebar activeKey='consent' />
      <main className='flex-1 flex flex-col min-w-0'>
        <Header breadcrumb={breadcrumb} />
        <div className='p-3 md:p-6 flex-1 flex flex-col' style={{ gap: 'var(--dim-space-500)' }}>
          {/* Hero */}
          <section
            className='bg-surface-card rounded-card shadow-card flex flex-col w-full'
            style={{ padding: 'var(--dim-space-600)', gap: 'var(--dim-space-400)' }}
          >
            <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-400)' }}>
              <button
                type='button'
                onClick={() => history.push('/forms')}
                className='inline-flex items-center justify-center'
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 'var(--dim-radius-full)',
                  background: 'var(--surface-card-100)',
                  border: 'var(--dim-stroke-100) solid var(--border-card-default)',
                  color: 'var(--text-content-secondary)',
                  cursor: 'pointer',
                }}
                aria-label='กลับไปคลังแบบฟอร์ม'
              >
                <Icon name='chevron-left' size={18} />
              </button>
              <div className='flex-1 min-w-0 flex flex-col gap-1'>
                <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
                  <h1 className='text-lg font-bold text-ink' style={{ margin: 'var(--dim-space-0)' }}>{title}</h1>
                  <span
                    className='inline-flex items-center'
                    style={{
                      height: 24,
                      paddingLeft: 'var(--dim-space-200)',
                      paddingRight: 10,
                      borderRadius: 'var(--dim-radius-full)',
                      background: 'var(--surface-brandPrimary-quaternary)',
                      color: 'var(--text-brandPrimary-default)',
                      fontFamily: 'var(--type-family-body)',
                      fontSize: 'var(--type-size-xs)',
                      fontWeight: 'var(--type-weight-medium)',
                    }}
                  >
                    {filtered.length} แบบฟอร์ม
                  </span>
                </div>
                <p className='text-sm text-ink-secondary'>{description}</p>
              </div>
            </div>

            {/* Search bar — large pill, brand-quaternary border, centered prefix icon. */}
            <div
              className='flex items-center w-full'
              style={{
                height: 56,
                gap: 'var(--dim-space-300)',
                paddingLeft: 'var(--dim-space-500)',
                paddingRight: 'var(--dim-space-300)',
                background: 'var(--surface-card-100)',
                border: 'var(--dim-stroke-200) solid var(--border-brandPrimary-tertiary)',
                borderRadius: 'var(--dim-radius-full)',
              }}
            >
              <Icon name='search' size={20} style={{ color: 'var(--text-brandPrimary-default)' }} />
              <input
                type='text'
                value={search}
                onChange={(e) => { setPage(1); setSearch(e.target.value); }}
                placeholder={`ค้นหาแบบฟอร์มใน "${title}"…`}
                className='flex-1 bg-transparent border-none outline-none'
                style={{
                  color: 'var(--text-content-primary)',
                  fontFamily: 'var(--type-family-body)',
                  fontSize: 'var(--type-size-base)',
                }}
              />
              {search && (
                <button
                  type='button'
                  onClick={() => setSearch('')}
                  aria-label='ล้างคำค้นหา'
                  className='inline-flex items-center justify-center'
                  style={{
                    width: 32, height: 32, borderRadius: 'var(--dim-radius-full)',
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    color: 'var(--text-content-tertiary)',
                  }}
                >
                  <Icon name='close' size={18} />
                </button>
              )}
            </div>
          </section>

          {/* Filter tabs */}
          <section
            className='bg-surface-card rounded-card shadow-card flex flex-wrap items-center w-full'
            style={{ padding: 'var(--dim-space-400)', gap: 'var(--dim-space-200)' }}
            role='tablist'
            aria-label='ตัวกรองประเภทแบบฟอร์ม'
          >
            <TabPill
              size='small'
              style='outline'
              selected={activeKey === 'all'}
              onClick={() => onTabChange('all')}
            >
              ทั้งหมด
            </TabPill>
            {FORM_CATEGORIES.map((c) => (
              <TabPill
                key={c.key}
                size='small'
                style='outline'
                leadingIcon={c.icon}
                selected={activeKey === c.key}
                onClick={() => onTabChange(c.key)}
              >
                {c.label}
              </TabPill>
            ))}
          </section>

          {/* Grid */}
          {visible.length === 0 ? (
            <section
              className='bg-surface-card rounded-card shadow-card flex flex-col items-center text-center'
              style={{ padding: 'var(--dim-space-700)', gap: 'var(--dim-space-200)' }}
            >
              <Icon name='search_off' size={32} style={{ color: 'var(--text-content-tertiary)' }} />
              <h2 className='text-base font-bold text-ink'>ไม่พบแบบฟอร์มที่ตรงกับเงื่อนไข</h2>
              <p className='text-sm text-ink-secondary'>ลองค้นหาด้วยคำอื่น หรือเปลี่ยนประเภทแบบฟอร์ม</p>
            </section>
          ) : (
            <div
              className='grid w-full'
              style={{
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                gap: 'var(--dim-space-400)',
              }}
            >
              {visible.map((form) => (
                <CategoryFormCard key={form.slug} form={form} />
              ))}
            </div>
          )}

          {/* Pagination footer */}
          {pageCount > 1 && (
            <section
              className='bg-surface-card rounded-card shadow-card flex items-center justify-between w-full'
              style={{ padding: 'var(--dim-space-400) var(--dim-space-600)' }}
            >
              <span className='text-xs text-ink-tertiary'>
                แสดง {start + 1}–{Math.min(start + PAGE_SIZE, filtered.length)} จาก {filtered.length} รายการ
              </span>
              <Pagination
                currentPage={safePage}
                pageCount={pageCount}
                onPageChange={setPage}
              />
            </section>
          )}
        </div>
        <Footer copyright='© 2026 ศูนย์การพยาบาลคุณภาพ ดินแดง กรุงเทพมหานคร' />
      </main>
    </div>
  );
};

export default FormsCategoryPage;
