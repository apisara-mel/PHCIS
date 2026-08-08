import React, { useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import Icon from '@/components/icons/Icon';
import PrimarySearch from '@/components/search/PrimarySearch';
import FilterTag, { FilterDropdown } from '@/components/forms/FilterTag';
import Badge from '@/components/badge/Badge';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import { resolveHighAlertBadgeStyle } from '@/components/badge/clinicalBadgeStyles';
import BrandCircleSubdueIconButton from '@/components/button/BrandCircleSubdueIconButton';
import NeutralSubdueIconButton from '@/components/button/NeutralSubdueIconButton';
import { DRUG_REGISTRY, DRUG_CLASSIFICATIONS, UNIT_TYPES, currentPrice, subscribeRegistry, setRegistryDrugActive } from '@/data/pharmacyRegistry';
import PharmacySubNav, { PharmacyAddDrugButton } from '@/components/pharmacy/PharmacySubNav';
import { buildRegistrySummaryCards } from '@/pages/pharmacy/pharmacySummaryCards';
import { PHARMACY_LIST_ROW, PHARMACY_WORKLIST_CARD_BODY } from '@/pages/pharmacy/pharmacyContentCard';

/* Drug Registry (ระบบทะเบียนยา — ToR §1.9.1) list page.
   Search / filters alias PrimarySearch + FilterDropdown + FilterTag
   (same pattern as PharmacyPatientsPage / UsersAccessPage). */

const breadcrumb = ['ระบบงานเภสัชกรรม', 'ทะเบียนยา'];

const CLASS_OPTIONS = [
  { value: 'all', label: 'ทุกประเภท' },
  ...DRUG_CLASSIFICATIONS.map((c) => ({ value: c.key, label: c.label })),
];
const STATUS_OPTIONS = [
  { value: 'all', label: 'ทุกสถานะ' },
  { value: 'active', label: 'ใช้งาน' },
  { value: 'inactive', label: 'ปิดใช้งาน' },
];
const HIGH_ALERT_OPTIONS = [
  { value: 'all', label: 'ทั้งหมด' },
  { value: 'yes', label: 'High Alert' },
  { value: 'no', label: 'ยาปกติ' },
];
/* รูปแบบ (dosage form — ToR §1.9.5.1) — `unit` IS the dosage form. */
const UNIT_OPTIONS = [
  { value: 'all', label: 'ทุกรูปแบบ' },
  ...UNIT_TYPES.map((u) => ({ value: u.key, label: u.label })),
];

const classificationLabel = (key) => DRUG_CLASSIFICATIONS.find((c) => c.key === key)?.label || key;

const DrugRow = ({ drug, onEdit, onToggleActive }) => (
  <div
    role='button'
    tabIndex={0}
    onClick={onEdit}
    onKeyDown={(e) => { if (e.key === 'Enter') onEdit(); }}
    className='flex items-center w-full cursor-pointer transition-shadow hover:shadow-cardHover'
    style={{
      gap: 'var(--dim-space-400)',
      padding: 'var(--dim-space-400)',
      ...PHARMACY_LIST_ROW,
    }}
  >
    <div
      className='shrink-0 rounded-full overflow-hidden'
      style={{
        width: 'var(--dim-size-900, 44px)',
        height: 'var(--dim-size-900, 44px)',
        background: 'var(--surface-card-quaternary)',
      }}
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

    <div className='hidden md:flex flex-col shrink-0' style={{ gap: 'var(--dim-space-100)', minWidth: 'var(--dim-size-2000, 200px)' }}>
      <Badge style={drug.classification === 'nlem' ? 'success' : 'info'} size='small'>
        {classificationLabel(drug.classification)}
      </Badge>
      <span className='text-xs text-ink-tertiary'>หน่วย: {drug.unit === 'capsule' ? 'แคปซูล' : 'เม็ด'}</span>
    </div>

    <div className='hidden lg:flex flex-col shrink-0' style={{ gap: 'var(--dim-space-100)', minWidth: 'var(--dim-size-1400, 140px)' }}>
      <span className='text-xs text-ink-tertiary'>ราคาปัจจุบัน</span>
      <span className='text-sm font-bold text-ink'>฿{currentPrice(drug)}</span>
    </div>

    <div className='hidden lg:flex flex-col shrink-0' style={{ gap: 'var(--dim-space-100)', minWidth: 'var(--dim-size-1800, 180px)' }}>
      <span className='text-xs text-ink-tertiary'>สิทธิที่เบิกได้</span>
      <span className='text-xs text-ink-secondary'>
        {drug.rightsEligible.length >= 5 ? 'ทุกสิทธิ' : drug.rightsEligible.join(', ')}
      </span>
    </div>

    <div className='shrink-0 inline-flex items-center' style={{ gap: 'var(--dim-space-200)' }}>
      <NeutralSubdueIconButton
        icon={drug.active ? 'block' : 'check_circle'}
        size='sm'
        variant='outline'
        aria-label={drug.active ? 'ปิดใช้งานรายการยา' : 'เปิดใช้งานรายการยา'}
        onClick={(e) => { e.stopPropagation(); onToggleActive(); }}
      />
      <BrandCircleSubdueIconButton
        icon='edit'
        size='sm'
        variant='fill'
        aria-label='แก้ไขรายการยา'
        onClick={(e) => { e.stopPropagation(); onEdit(); }}
      />
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
  const [registryTick, setRegistryTick] = useState(0);

  /* `DRUG_REGISTRY` is mutated in place by upsertRegistryDrug /
     setRegistryDrugActive; subscribing + bumping a tick state forces this
     page's `useMemo` to re-run so edits/toggles show up without a reload
     (same pattern as AppointmentSettingsPanel.jsx's settings-store sync). */
  useEffect(() => subscribeRegistry(() => setRegistryTick((t) => t + 1)), []);

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
  }, [search, classFilter, statusFilter, highAlertFilter, unitFilter, registryTick]);

  const summaryCards = useMemo(
    () => buildRegistrySummaryCards(DRUG_REGISTRY),
    [registryTick],
  );

  const filtersActive = search.trim() !== ''
    || classFilter !== 'all'
    || statusFilter !== 'all'
    || highAlertFilter !== 'all'
    || unitFilter !== 'all';

  const clearFilters = () => {
    setSearch('');
    setClassFilter('all');
    setStatusFilter('all');
    setHighAlertFilter('all');
    setUnitFilter('all');
  };

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
          padding: 'var(--dim-space-600)',
          gap: 'var(--dim-space-600)',
        }}
      >
        <section className='w-full flex flex-col' style={PHARMACY_WORKLIST_CARD_BODY}>
          <div className='w-full flex items-start justify-center'>
            <PrimarySearch
              value={search}
              onChange={setSearch}
              onSubmit={setSearch}
              placeholder='ค้นหารหัสยา / ชื่อการค้า / ชื่อสามัญ'
              width={640}
            />
          </div>

          <div className='flex items-center flex-wrap w-full' style={{ gap: 'var(--dim-space-300)' }}>
            <FilterDropdown
              prefix='ประเภท :'
              options={CLASS_OPTIONS}
              value={classFilter}
              onChange={setClassFilter}
            />
            <FilterDropdown
              prefix='รูปแบบ :'
              options={UNIT_OPTIONS}
              value={unitFilter}
              onChange={setUnitFilter}
            />
            <FilterDropdown
              prefix='สถานะ :'
              options={STATUS_OPTIONS}
              value={statusFilter}
              onChange={setStatusFilter}
            />
            <FilterDropdown
              prefix='High Alert :'
              options={HIGH_ALERT_OPTIONS}
              value={highAlertFilter}
              onChange={setHighAlertFilter}
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

          <div className='text-xs text-ink-tertiary'>
            พบ <strong className='text-ink-secondary'>{filtered.length}</strong> รายการ จาก {DRUG_REGISTRY.length} รายการ
          </div>

          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
            {filtered.length === 0 ? (
              <div className='flex flex-col items-center text-center' style={{ padding: 'var(--dim-space-700)', gap: 'var(--dim-space-200)' }}>
                <Icon name='search_off' size={32} />
                <p className='text-sm text-ink-secondary'>ไม่พบรายการยาที่ตรงกับเงื่อนไข</p>
              </div>
            ) : (
              filtered.map((d) => (
                <DrugRow
                  key={d.id}
                  drug={d}
                  onEdit={() => history.push(`/pharmacy/registry/${d.id}`)}
                  onToggleActive={() => setRegistryDrugActive(d.id, !d.active)}
                />
              ))
            )}
          </div>
        </section>
      </div>
    </QueuePageShell>
  );
};

export default PharmacyRegistryPage;
