import React, { useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Icon from '@/components/icons/Icon';
import BrandButton from '@/components/button/BrandButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import Badge from '@/components/badge/Badge';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import { resolveHighAlertBadgeStyle } from '@/components/badge/clinicalBadgeStyles';
import { DRUG_REGISTRY, DRUG_CLASSIFICATIONS, UNIT_TYPES, currentPrice } from '@/data/pharmacyRegistry';
import PharmacySubNav from '@/components/pharmacy/PharmacySubNav';

/* Drug Registry (ระบบทะเบียนยา — ToR §1.9.1) list page. Mirrors
   `UsersAccessPage.jsx`'s hero + filter-bar + row-card layout exactly —
   same admin-list-page template, drug fields instead of user fields. */

const breadcrumb = ['ระบบงานเภสัชกรรม', 'ทะเบียนยา'];

const FilterSelect = ({ icon, label, value, options, onChange }) => (
  <label
    className='inline-flex items-center'
    style={{
      gap: 'var(--dim-space-200)',
      height: 'var(--dim-size-700, 36px)',
      paddingLeft: 'var(--dim-space-300)',
      paddingRight: 'var(--dim-space-200)',
      borderRadius: 'var(--dim-radius-200)',
      background: 'var(--surface-input-default)',
      border: 'var(--dim-stroke-100) solid var(--border-input-default)',
      color: 'var(--text-content-secondary)',
      fontSize: 'var(--type-size-sm)',
      cursor: 'pointer',
    }}
  >
    <Icon name={icon} size={16} />
    <span className='text-ink-tertiary'>{label}:</span>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        appearance: 'none',
        background: 'transparent',
        border: 'none',
        outline: 'none',
        color: 'var(--text-content-primary)',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-sm)',
        cursor: 'pointer',
        paddingRight: 'var(--dim-space-100)',
      }}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
    <Icon name='chevron-down' size={14} />
  </label>
);

const classificationLabel = (key) => DRUG_CLASSIFICATIONS.find((c) => c.key === key)?.label || key;

const DrugRow = ({ drug, onEdit }) => (
  <div
    role='button'
    tabIndex={0}
    onClick={onEdit}
    onKeyDown={(e) => { if (e.key === 'Enter') onEdit(); }}
    className='flex items-center w-full cursor-pointer transition-shadow hover:shadow-cardHover'
    style={{
      gap: 'var(--dim-space-400)',
      padding: 'var(--dim-space-400)',
      background: 'var(--surface-card-100)',
      border: 'var(--dim-stroke-100) solid var(--border-card-default)',
      borderRadius: 'var(--dim-radius-300)',
    }}
  >
    <div
      className='shrink-0 rounded-full overflow-hidden'
      style={{ width: 'var(--dim-size-900, 44px)', height: 'var(--dim-size-900, 44px)', background: 'var(--surface-card-quaternary, #F9FBFB)' }}
    >
      <img src={drug.image} alt='' className='w-full h-full object-cover' />
    </div>

    <div className='flex-1 min-w-0 flex flex-col'>
      <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
        <span className='text-sm font-bold text-ink truncate'>{drug.name}</span>
        {drug.highAlert && <ColorfulBadge style={resolveHighAlertBadgeStyle(true)} size='small'>High Alert</ColorfulBadge>}
        {!drug.active && <Badge style='neutral' size='small'>ปิดใช้งาน</Badge>}
      </div>
      <span className='text-xs text-ink-tertiary truncate'>
        {drug.code ? `${drug.code} · ` : ''}{drug.genericName}{drug.tradeName ? ` · ${drug.tradeName}` : ''}
      </span>
    </div>

    <div className='hidden md:flex flex-col shrink-0' style={{ gap: 'var(--dim-space-100)', minWidth: 200 }}>
      <Badge style={drug.classification === 'nlem' ? 'success' : 'info'} size='small'>
        {classificationLabel(drug.classification)}
      </Badge>
      <span className='text-xs text-ink-tertiary'>หน่วย: {drug.unit === 'capsule' ? 'แคปซูล' : 'เม็ด'}</span>
    </div>

    <div className='hidden lg:flex flex-col shrink-0' style={{ gap: 'var(--dim-space-100)', minWidth: 140 }}>
      <span className='text-xs text-ink-tertiary'>ราคาปัจจุบัน</span>
      <span className='text-sm font-bold text-ink'>฿{currentPrice(drug)}</span>
    </div>

    <div className='hidden lg:flex flex-col shrink-0' style={{ gap: 'var(--dim-space-100)', minWidth: 180 }}>
      <span className='text-xs text-ink-tertiary'>สิทธิที่เบิกได้</span>
      <span className='text-xs text-ink-secondary'>
        {drug.rightsEligible.length >= 5 ? 'ทุกสิทธิ' : drug.rightsEligible.join(', ')}
      </span>
    </div>

    <div className='shrink-0 inline-flex items-center'>
      <button
        type='button'
        aria-label='แก้ไขรายการยา'
        onClick={(e) => { e.stopPropagation(); onEdit(); }}
        className='inline-flex items-center justify-center'
        style={{
          width: 'var(--dim-size-700, 36px)', height: 'var(--dim-size-700, 36px)', borderRadius: 'var(--dim-radius-full)',
          background: 'var(--surface-brandPrimary-quaternary)',
          color: 'var(--text-brandPrimary-default)', border: 'none', cursor: 'pointer',
        }}
      >
        <Icon name='edit' size={18} />
      </button>
    </div>
  </div>
);

const PharmacyRegistryPage = () => {
  const history = useHistory();
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [highAlertFilter, setHighAlertFilter] = useState('all');
  const [unitFilter, setUnitFilter] = useState('all');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return DRUG_REGISTRY.filter((d) => {
      if (classFilter !== 'all' && d.classification !== classFilter) return false;
      if (statusFilter !== 'all' && (statusFilter === 'active') !== d.active) return false;
      if (highAlertFilter !== 'all' && (highAlertFilter === 'yes') !== d.highAlert) return false;
      if (unitFilter !== 'all' && d.unit !== unitFilter) return false;
      if (!q) return true;
      return (
        (d.code || '').toLowerCase().includes(q) ||
        d.name.toLowerCase().includes(q) ||
        d.genericName.toLowerCase().includes(q) ||
        d.tradeName.toLowerCase().includes(q)
      );
    });
  }, [search, classFilter, statusFilter, highAlertFilter, unitFilter]);

  const classOptions = [{ value: 'all', label: 'ทุกประเภท' }, ...DRUG_CLASSIFICATIONS.map((c) => ({ value: c.key, label: c.label }))];
  const statusOptions = [{ value: 'all', label: 'ทุกสถานะ' }, { value: 'active', label: 'ใช้งาน' }, { value: 'inactive', label: 'ปิดใช้งาน' }];
  const highAlertOptions = [{ value: 'all', label: 'ทั้งหมด' }, { value: 'yes', label: 'High Alert' }, { value: 'no', label: 'ยาปกติ' }];
  /* รูปแบบ (dosage form — ToR §1.9.5.1) — this data model's `unit` field
     IS the dosage form (tablet/capsule/bottle/...), so the filter reuses
     the same UNIT_TYPES catalog rather than inventing a parallel one. */
  const unitOptions = [{ value: 'all', label: 'ทุกรูปแบบ' }, ...UNIT_TYPES.map((u) => ({ value: u.key, label: u.label }))];

  return (
    <div className='min-h-screen w-full flex bg-brand-50'>
      <Sidebar activeKey='pharmacy' />
      <main className='flex-1 flex flex-col min-w-0'>
        <Header breadcrumb={breadcrumb} />
        <div className='p-3 md:p-6 flex-1 flex flex-col' style={{ gap: 'var(--dim-space-500)' }}>
          <PharmacySubNav />
          <section
            className='bg-surface-card rounded-card shadow-card flex flex-col md:flex-row md:items-center w-full'
            style={{ gap: 'var(--dim-space-400)', padding: 'var(--dim-space-600)' }}
          >
            <div
              className='shrink-0 inline-flex items-center justify-center'
              style={{ width: 'var(--dim-size-1200, 56px)', height: 'var(--dim-size-1200, 56px)', borderRadius: 'var(--dim-radius-500)', background: 'var(--surface-brandPrimary-quaternary)', color: 'var(--text-brandPrimary-default)' }}
            >
              <Icon name='pill' size={28} />
            </div>
            <div className='flex-1 min-w-0 flex flex-col gap-1'>
              <h1 className='text-lg font-bold text-ink'>ทะเบียนยาและเวชภัณฑ์</h1>
              <p className='text-sm text-ink-secondary'>
                กำหนดหน่วยนับ การจัดกลุ่มยา สิทธิที่เบิกได้ ราคา และรายการยาเสี่ยงสูง (High Alert Drug)
              </p>
              <p className='text-xs text-ink-tertiary'>
                ทั้งหมด <strong className='text-ink-secondary'>{DRUG_REGISTRY.length}</strong> รายการ ·
                ใช้งานอยู่ <strong className='text-ink-secondary'>{DRUG_REGISTRY.filter((d) => d.active).length}</strong> รายการ
              </p>
            </div>
            <div className='shrink-0'>
              <BrandButton size='md' leadingIcon='add' onClick={() => history.push('/pharmacy/registry/new')}>
                เพิ่มยาใหม่
              </BrandButton>
            </div>
          </section>

          <section
            className='bg-surface-card rounded-card shadow-card flex flex-col w-full'
            style={{ padding: 'var(--dim-space-500)', gap: 'var(--dim-space-300)' }}
          >
            <div className='flex flex-wrap items-center w-full' style={{ gap: 'var(--dim-space-300)' }}>
              <div
                className='flex items-center flex-1'
                style={{ minWidth: 'var(--dim-size-2280, 218px)', gap: 'var(--dim-space-200)', height: 'var(--dim-size-800, 40px)', paddingLeft: 'var(--dim-space-300)', paddingRight: 'var(--dim-space-300)', borderRadius: 'var(--dim-radius-200)', background: 'var(--surface-input-default)', border: 'var(--dim-stroke-100) solid var(--border-input-default)' }}
              >
                <Icon name='search' size={18} />
                <input
                  type='text'
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder='ค้นหารหัสยา / ชื่อการค้า / ชื่อสามัญ'
                  className='flex-1 bg-transparent border-none outline-none text-sm'
                  style={{ color: 'var(--text-content-primary)' }}
                />
                {search && (
                  <button type='button' onClick={() => setSearch('')} aria-label='clear' style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-content-tertiary)' }}>
                    <Icon name='close' size={16} />
                  </button>
                )}
              </div>
              <FilterSelect icon='category' label='ประเภท' value={classFilter} options={classOptions} onChange={setClassFilter} />
              <FilterSelect icon='straighten' label='รูปแบบ' value={unitFilter} options={unitOptions} onChange={setUnitFilter} />
              <FilterSelect icon='toggle_on' label='สถานะ' value={statusFilter} options={statusOptions} onChange={setStatusFilter} />
              <FilterSelect icon='warning' label='High Alert' value={highAlertFilter} options={highAlertOptions} onChange={setHighAlertFilter} />
              {(search || classFilter !== 'all' || statusFilter !== 'all' || highAlertFilter !== 'all' || unitFilter !== 'all') && (
                <NeutralSubdueButton
                  variant='outline'
                  size='sm'
                  onClick={() => { setSearch(''); setClassFilter('all'); setStatusFilter('all'); setHighAlertFilter('all'); setUnitFilter('all'); }}
                >
                  ล้างตัวกรอง
                </NeutralSubdueButton>
              )}
            </div>
            <div className='text-xs text-ink-tertiary'>
              พบ <strong className='text-ink-secondary'>{filtered.length}</strong> รายการ จาก {DRUG_REGISTRY.length} รายการ
            </div>
          </section>

          <section className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
            {filtered.length === 0 ? (
              <div className='bg-surface-card rounded-card shadow-card flex flex-col items-center text-center' style={{ padding: 'var(--dim-space-700)', gap: 'var(--dim-space-200)' }}>
                <Icon name='search_off' size={32} />
                <p className='text-sm text-ink-secondary'>ไม่พบรายการยาที่ตรงกับเงื่อนไข</p>
              </div>
            ) : (
              filtered.map((d) => (
                <DrugRow key={d.id} drug={d} onEdit={() => history.push(`/pharmacy/registry/${d.id}`)} />
              ))
            )}
          </section>
        </div>
        <Footer copyright='© 2026 ศูนย์บริการสาธารณสุข สำนักอนามัย กรุงเทพมหานคร' />
      </main>
    </div>
  );
};

export default PharmacyRegistryPage;
