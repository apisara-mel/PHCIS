import React, { useEffect, useMemo, useState } from 'react';
import QueuePageShell, { QUEUE_STICKY_UNDER_TABS } from '@/templates/QueuePageShell';
import Table from '@/components/table/Table';
import PrimarySearch from '@/components/search/PrimarySearch';
import SearchResultCount from '@/components/search/SearchResultCount';
import FilterTag, { FilterDropdown } from '@/components/forms/FilterTag';
import Badge from '@/components/badge/Badge';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import { resolveHighAlertBadgeStyle } from '@/components/badge/clinicalBadgeStyles';
import BrandCircleSubdueIconButton from '@/components/button/BrandCircleSubdueIconButton';
import Switch from '@/components/switch/Switch';
import AlertDialog from '@/components/popup/AlertDialog';
import { DRUG_REGISTRY, DRUG_CLASSIFICATIONS, UNIT_TYPES, COUNT_UNIT_KEYS, currentPrice, subscribeRegistry, setRegistryDrugActive } from '@/data/pharmacyRegistry';
import PharmacySubNav, { PharmacyAddDrugButton } from '@/components/pharmacy/PharmacySubNav';
import PharmacyRegistryEditPopup from '@/components/pharmacy/PharmacyRegistryEditPopup';
import { buildRegistrySummaryCards } from '@/pages/pharmacy/pharmacySummaryCards';
import { PHARMACY_WORKLIST_CARD_BODY } from '@/pages/pharmacy/pharmacyContentCard';

/* Drug Registry (ระบบทะเบียนยา — ToR §1.9.1) list page.
   Search / filters alias PrimarySearch + FilterDropdown + FilterTag.
   List is a shared <Table> (same pattern as คลังยา / ผู้รับบริการ).
   Active toggle uses Switch + informative AlertDialog confirm
   (AccessManagement / Department pattern). */

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
  ...UNIT_TYPES.filter((u) => COUNT_UNIT_KEYS.includes(u.key)).map((u) => ({ value: u.key, label: u.label })),
];

const classificationLabel = (key) => DRUG_CLASSIFICATIONS.find((c) => c.key === key)?.label || key;
const unitLabel = (key) => UNIT_TYPES.find((u) => u.key === key)?.label || key || '—';

const PharmacyRegistryPage = () => {
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [highAlertFilter, setHighAlertFilter] = useState('all');
  const [unitFilter, setUnitFilter] = useState('all');
  const [registryTick, setRegistryTick] = useState(0);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  /* { drug, nextActive } — pending Switch confirm via informative AlertDialog */
  const [toggleConfirm, setToggleConfirm] = useState(null);
  /* ExtraLarge edit popup — row click / edit button (add still uses /new page) */
  const [editDrugId, setEditDrugId] = useState(null);

  const handleSort = (key) => {
    setSortConfig((prev) => (
      prev.key === key
        ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'asc' }
    ));
  };

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

  /* Sort only after the pharmacist clicks a header (null key keeps
     registry insertion order). */
  const sortedRows = useMemo(() => {
    if (!sortConfig.key) return filtered;
    const sign = sortConfig.direction === 'desc' ? -1 : 1;
    const normalize = (row, key) => {
      switch (key) {
        case 'name':           return row.name || '';
        case 'classification': return classificationLabel(row.classification);
        case 'unit':           return unitLabel(row.unit);
        case 'price':          return Number(currentPrice(row)) || 0;
        case 'rights':         return row.rightsEligible.length >= 5
          ? 'ทุกสิทธิ'
          : (row.rightsEligible || []).join(', ');
        case 'active':         return row.active ? 1 : 0;
        default:               return row[key] ?? '';
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

  const requestToggle = (drug) => {
    setToggleConfirm({ drug, nextActive: !drug.active });
  };

  const confirmToggle = () => {
    if (!toggleConfirm) return;
    setRegistryDrugActive(toggleConfirm.drug.id, toggleConfirm.nextActive);
    setToggleConfirm(null);
  };

  const turningOn = Boolean(toggleConfirm?.nextActive);
  const confirmDrug = toggleConfirm?.drug;

  const columns = [
    {
      key: 'name',
      label: 'ชื่อยา',
      flex: true,
      minWidth: 260,
      render: (d) => (
        <div className='flex items-center min-w-0' style={{ gap: 'var(--dim-space-300)' }}>
          <div
            className='shrink-0 rounded-full overflow-hidden'
            style={{
              width: 'var(--dim-size-900, 36px)',
              height: 'var(--dim-size-900, 36px)',
              background: 'var(--surface-card-quaternary)',
            }}
          >
            <img src={d.image} alt='' className='w-full h-full object-cover' />
          </div>
          <div className='flex flex-col min-w-0 flex-1'>
            <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
              <span className='truncate' style={{ fontWeight: 'var(--type-weight-bold)' }}>{d.name}</span>
              {d.highAlert ? (
                <ColorfulBadge style={resolveHighAlertBadgeStyle(true)} size='small'>High Alert</ColorfulBadge>
              ) : null}
              {!d.active ? <Badge style='neutral' size='small'>ปิดใช้งาน</Badge> : null}
            </div>
            <span
              className='truncate'
              style={{
                color: 'var(--text-content-tertiary)',
                fontFamily: 'var(--type-family-body)',
                fontSize: 'var(--type-size-xs)',
              }}
            >
              {d.code ? `${d.code} · ` : ''}{d.genericName}{d.tradeName ? ` · ${d.tradeName}` : ''}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'classification',
      label: 'ประเภท',
      render: (d) => (
        <Badge style={d.classification === 'nlem' ? 'success' : 'info'} size='small'>
          {classificationLabel(d.classification)}
        </Badge>
      ),
    },
    {
      key: 'unit',
      label: 'รูปแบบ',
      render: (d) => unitLabel(d.unit),
    },
    {
      key: 'price',
      label: 'ราคาปัจจุบัน',
      align: 'center',
      render: (d) => `฿${currentPrice(d)}`,
    },
    {
      key: 'rights',
      label: 'สิทธิที่เบิกได้',
      render: (d) => (
        d.rightsEligible.length >= 5 ? 'ทุกสิทธิ' : d.rightsEligible.join(', ')
      ),
    },
    {
      key: 'active',
      label: 'สถานะใช้งาน',
      align: 'center',
      render: (d) => (
        <div
          className='inline-flex flex-col items-center'
          style={{ gap: 'var(--dim-space-50)' }}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
            {d.active ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
          </span>
          <Switch
            checked={!!d.active}
            aria-label={`${d.active ? 'ปิด' : 'เปิด'}ใช้งาน ${d.name}`}
            onChange={() => requestToggle(d)}
          />
        </div>
      ),
    },
    {
      key: 'actions',
      label: 'การดำเนินการ',
      align: 'center',
      sortable: false,
      render: (d) => (
        <BrandCircleSubdueIconButton
          icon='edit'
          size='sm'
          variant='fill'
          aria-label={`แก้ไข ${d.name}`}
          onClick={(e) => {
            e.stopPropagation();
            setEditDrugId(d.id);
          }}
        />
      ),
    },
  ];

  return (
    <>
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

          <SearchResultCount found={filtered.length} total={DRUG_REGISTRY.length} />

          <Table
            columns={columns}
            rows={sortedRows}
            rowKey={(d) => d.id}
            sortConfig={sortConfig}
            onSort={handleSort}
            stickyColCount={1}
            stickyHeaderTop={QUEUE_STICKY_UNDER_TABS}
            onRowClick={(d) => setEditDrugId(d.id)}
            emptyMessage={filtersActive ? 'ไม่พบรายการยาที่ตรงกับเงื่อนไข' : 'ยังไม่มีรายการในทะเบียนยา'}
            emptySubtext={filtersActive ? 'ลองล้างตัวกรองหรือแก้คำค้นหา' : null}
          />
        </section>
      </div>
    </QueuePageShell>

    <PharmacyRegistryEditPopup
      open={Boolean(editDrugId)}
      drugId={editDrugId}
      onClose={() => setEditDrugId(null)}
    />

    <AlertDialog
      open={Boolean(toggleConfirm)}
      type='info'
      alignment='center'
      title={turningOn ? 'เปิดใช้งานรายการยานี้?' : 'ปิดใช้งานรายการยานี้?'}
      description={confirmDrug
        ? turningOn
          ? `ยืนยันเปิดใช้งาน «${confirmDrug.name}» — รายการนี้จะกลับมาสั่งจ่ายและเบิกได้ตามสิทธิที่ตั้งไว้`
          : `ยืนยันปิดใช้งาน «${confirmDrug.name}» — รายการนี้จะไม่แสดงให้สั่งจ่ายจนกว่าจะเปิดอีกครั้ง (ข้อมูลทะเบียนยังคงอยู่)`
        : ''}
      confirmLabel={turningOn ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
      cancelLabel='ยกเลิก'
      onConfirm={confirmToggle}
      onCancel={() => setToggleConfirm(null)}
      onClose={() => setToggleConfirm(null)}
    />
    </>
  );
};

export default PharmacyRegistryPage;
