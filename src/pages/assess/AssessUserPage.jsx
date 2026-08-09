import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import { SummaryCard } from '@/components/layout/SummaryCardsBar';
import PrimarySearch from '@/components/search/PrimarySearch';
import useSearchHistory from '@/components/search/useSearchHistory';
import { FilterDropdown } from '@/components/forms/FilterTag';
import ClearFiltersTag, { SmoothFilterResults } from '@/components/forms/ClearFiltersTag';
import useSmoothClearFilters from '@/hooks/useSmoothClearFilters';
import Table from '@/components/table/Table';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import BrandButton from '@/components/button/BrandButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import Switch from '@/components/switch/Switch';
import SmallAlert from '@/components/alert/SmallAlert';
import LottieIllustration from '@/components/illustrations/LottieIllustration';
import ASSESS_NAV from '@/pages/assess/assessNav';
import { CENTER_OPTIONS } from '@/data/accessControlStore';
import { readGroupPolicies } from '@/data/groupPolicyStore';
import { readDepartments } from '@/data/departmentStore';
import { readPositions } from '@/data/positionStore';
import {
  readAssessUsers,
  writeAssessUsers,
  computeAssessUserStats,
  fullName,
  primaryAssignment,
} from '@/data/assessUserStore';

/* PHCIS | Assess-control — บุคลากร list (Figma 4D3nTx53 · 10:47222 empty · 12:38968 detail). */

const breadcrumb = ['บุคลากร'];

const CARD = {
  background: 'var(--surface-card-100)',
  borderRadius: 'var(--dim-radius-500)',
  border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
  boxShadow: 'var(--shadow-card)',
};

const TEXT_CELL = {
  color: 'var(--text-content-default)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm)',
  fontWeight: 'var(--type-weight-regular)',
  lineHeight: 1.5,
};

const AMBULANCE_LOTTIE = '/illustration/ambulance.json';

function EmptyIllustration() {
  const [anim, setAnim] = useState(null);
  useEffect(() => {
    let alive = true;
    fetch(AMBULANCE_LOTTIE)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive) setAnim(d); })
      .catch(() => { /* decorative */ });
    return () => { alive = false; };
  }, []);

  if (!anim) {
    return <span style={{ width: 160, height: 160 }} aria-hidden />;
  }
  return <LottieIllustration animationData={anim} size={160} loop ariaLabel='ยังไม่มีบุคลากร' />;
}

function PolicyBadge({ style, children }) {
  return (
    <ColorfulBadge style={style} size='small' hierarchy='secondary' width='hug'>
      {children}
    </ColorfulBadge>
  );
}

export default function AssessUserPage() {
  const navigate = useHistory();
  const [records, setRecords] = useState(() => readAssessUsers());
  const [search, setSearch] = useState('');
  const [filterCenter, setFilterCenter] = useState('');
  const [filterGroup, setFilterGroup] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterPosition, setFilterPosition] = useState('');
  const [toast, setToast] = useState(null);
  const { history: searchHistory, push: pushHistory, clear: clearHistory } =
    useSearchHistory('mih:primarysearch-history:assess-users');

  const persist = useCallback((next) => {
    writeAssessUsers(next);
    setRecords(next);
  }, []);

  const showToast = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2800);
  };

  const stats = useMemo(() => computeAssessUserStats(records), [records]);

  const summaryCards = useMemo(() => [
    { key: 'total', icon: 'group', color: 'info', value: String(stats.total), label: 'บุคลากรทั้งหมด' },
    { key: 'active', icon: 'group', color: 'positive', value: String(stats.active), label: 'บุคลากรที่เปิดใช้งาน' },
    {
      key: 'inactive',
      icon: 'group',
      value: String(stats.inactive),
      label: 'บุคลากรที่ปิดใช้งาน',
      tileBg: 'var(--surface-danger-tertiary, #FEE2E2)',
      iconInk: 'var(--text-danger-default, #B91C1C)',
    },
  ], [stats]);

  const groupPolicies = useMemo(() => readGroupPolicies(), [records]);
  const departments = useMemo(() => readDepartments(), [records]);
  const positions = useMemo(() => readPositions(), [records]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return records.filter((r) => {
      const primary = primaryAssignment(r);
      if (filterCenter && primary?.centerId !== filterCenter) return false;
      if (filterGroup && primary?.groupPolicyId !== filterGroup) return false;
      if (filterDept && primary?.departmentId !== filterDept) return false;
      if (filterPosition && primary?.positionId !== filterPosition) return false;
      if (!q) return true;
      const hay = [fullName(r), r.email, r.licenseNo, r.nameEn, r.surnameEn].join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [records, search, filterCenter, filterGroup, filterDept, filterPosition]);

  const hasRecords = records.length > 0;
  const filtersActive = !!(filterCenter || filterGroup || filterDept || filterPosition || search.trim());
  const { showClearChip, resultsOpaque, clearFilters } = useSmoothClearFilters(
    filtersActive,
    () => {
      setSearch('');
      setFilterCenter('');
      setFilterGroup('');
      setFilterDept('');
      setFilterPosition('');
    },
  );

  const openCreate = () => navigate.push('/assess/users/new');
  const openDetail = (row) => navigate.push(`/assess/users/${row.id}`);

  const applyToggleActive = (id, next) => {
    persist(records.map((r) => (r.id === id ? { ...r, active: next } : r)));
    showToast(next ? 'เปิดใช้งานบุคลากรแล้ว' : 'ปิดใช้งานบุคลากรแล้ว');
  };

  const columns = useMemo(() => [
    {
      key: 'name',
      header: 'ชื่อ-นามสกุล / Name',
      flex: 1,
      minWidth: 220,
      sortable: true,
      render: (row) => (
        <div className='flex flex-col min-w-0'>
          <span style={TEXT_CELL} className='truncate'>{fullName(row)}</span>
          <span style={{ ...TEXT_CELL, color: 'var(--text-content-tertiary)', fontSize: 'var(--type-size-xs)' }} className='truncate'>
            {[row.nameEn, row.surnameEn].filter(Boolean).join(' ') || '—'}
          </span>
        </div>
      ),
    },
    {
      key: 'groupPolicy',
      header: 'Group Policy',
      render: (row) => {
        const p = primaryAssignment(row);
        return p?.groupPolicy ? <PolicyBadge style='blue'>{p.groupPolicy}</PolicyBadge> : <span style={TEXT_CELL}>—</span>;
      },
    },
    {
      key: 'subBranch',
      header: 'สาขาย่อย',
      render: (row) => {
        const p = primaryAssignment(row);
        return p?.subBranch ? <PolicyBadge style='teal'>{p.subBranch}</PolicyBadge> : <span style={TEXT_CELL}>—</span>;
      },
    },
    {
      key: 'department',
      header: 'แผนก',
      render: (row) => {
        const p = primaryAssignment(row);
        return p?.department ? <PolicyBadge style='blue'>{p.department}</PolicyBadge> : <span style={TEXT_CELL}>—</span>;
      },
    },
    {
      key: 'position',
      header: 'ตำแหน่ง',
      render: (row) => {
        const p = primaryAssignment(row);
        return p?.position ? <PolicyBadge style='purple'>{p.position}</PolicyBadge> : <span style={TEXT_CELL}>—</span>;
      },
    },
    {
      key: 'center',
      header: 'ศูนย์บริการหลัก',
      render: (row) => {
        const p = primaryAssignment(row);
        return <span style={TEXT_CELL}>{p?.center || '—'}</span>;
      },
    },
    {
      key: 'active',
      header: 'สถานะการใช้งาน',
      render: (row) => (
        <span onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} role='presentation'>
          <Switch
            checked={row.active}
            onChange={(next) => applyToggleActive(row.id, next)}
            aria-label={`สถานะ ${fullName(row)}`}
          />
        </span>
      ),
    },
    {
      key: 'action',
      header: 'การดำเนินการ',
      render: (row) => (
        <NeutralSubdueButton
          leadingIcon='visibility'
          size='sm'
          onClick={(e) => { e.stopPropagation(); openDetail(row); }}
        >
          ดู
        </NeutralSubdueButton>
      ),
    },
  ], [records]);

  const filterOpts = {
    center: [{ value: '', label: 'ทั้งหมด' }, ...CENTER_OPTIONS],
    group: [{ value: '', label: 'ทั้งหมด' }, ...groupPolicies.map((g) => ({ value: g.id, label: g.name }))],
    dept: [{ value: '', label: 'ทั้งหมด' }, ...departments.map((d) => ({ value: d.id, label: d.name }))],
    pos: [{ value: '', label: 'ทั้งหมด' }, ...positions.map((p) => ({ value: p.id, label: p.name }))],
  };

  return (
    <>
      <QueuePageShell
        activeKey='system-staff'
        sidebarItems={ASSESS_NAV}
        sidebarFallbackKey='system-staff'
        brandTitle='จัดการระบบ'
        breadcrumb={breadcrumb}
        title={hasRecords ? undefined : 'บุคลากร'}
        headerInfo={hasRecords ? (
          <section className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
            <div className='flex items-center justify-between w-full flex-wrap' style={{ gap: 'var(--dim-space-300)' }}>
              <h1 style={{
                color: 'var(--text-topic-tertiary-title)',
                fontFamily: 'var(--type-family-heading-content)',
                fontSize: 'var(--type-size-base)',
                fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
                lineHeight: 1.5,
                margin: 'var(--dim-space-0)',
              }}
              >
                บุคลากรและการเข้าถึง
              </h1>
              <BrandButton variant='fill' size='md' leadingIcon='add' onClick={openCreate}>
                เพิ่มบุคลากร
              </BrandButton>
            </div>
            <div className='flex items-stretch flex-wrap w-full' style={{ gap: 'var(--dim-space-400)' }}>
              {summaryCards.map((c) => (
                <SummaryCard key={c.key} card={c} variant='panel' hover />
              ))}
            </div>
          </section>
        ) : null}
      >
        {!hasRecords ? (
          <div className='flex flex-col flex-1 min-w-0' style={{ padding: 'var(--dim-space-600)' }}>
            <section
              className='flex flex-col items-center justify-center flex-1 w-full'
              style={{ ...CARD, padding: 'var(--dim-space-900, 48px)', gap: 'var(--dim-space-400)', minHeight: 480 }}
            >
              <EmptyIllustration />
              <p style={{
                color: 'var(--text-brandPrimaryButton-default)',
                fontFamily: 'var(--type-family-heading-graphic2)',
                fontSize: 'var(--type-size-sm)',
                lineHeight: 1.5,
                textAlign: 'center',
                margin: 0,
              }}
              >
                ในระบบยังไม่มีบุคลากร
              </p>
              <BrandButton variant='fill' size='lg' leadingIcon='add' onClick={openCreate}>
                เพิ่มบุคลากร
              </BrandButton>
            </section>
          </div>
        ) : (
          <div className='flex flex-col flex-1 min-w-0' style={{ padding: 'var(--dim-space-600)', gap: 'var(--dim-space-400)' }}>
            <section className='flex flex-col w-full' style={{ ...CARD, gap: 'var(--dim-space-400)' }}>
              <PrimarySearch
                value={search}
                onChange={setSearch}
                onSubmit={(v) => {
                  const q = (v || '').trim();
                  if (q) pushHistory({ label: q, value: q });
                  setSearch(q);
                }}
                placeholder='ค้นหาชื่อบุคลากร'
                width={640}
                history={searchHistory}
                onHistoryClear={searchHistory.length > 0 ? clearHistory : undefined}
              />
              <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
                <FilterDropdown prefix='ศูนย์:' options={filterOpts.center} value={filterCenter} onChange={setFilterCenter} placeholder='ทั้งหมด' />
                <FilterDropdown prefix='Group Policy:' options={filterOpts.group} value={filterGroup} onChange={setFilterGroup} placeholder='ทั้งหมด' />
                <FilterDropdown prefix='แผนก:' options={filterOpts.dept} value={filterDept} onChange={setFilterDept} placeholder='ทั้งหมด' />
                <FilterDropdown prefix='ตำแหน่ง:' options={filterOpts.pos} value={filterPosition} onChange={setFilterPosition} placeholder='ทั้งหมด' />
                <ClearFiltersTag active={showClearChip} onClear={clearFilters} />
              </div>
              <SmoothFilterResults opaque={resultsOpaque}>
              <Table
                columns={columns}
                rows={filteredRows}
                rowKey={(row) => row.id}
                onRowClick={openDetail}
                emptyMessage='ไม่พบบุคลากรที่ตรงกับเงื่อนไข'
              />
              </SmoothFilterResults>
            </section>
          </div>
        )}
      </QueuePageShell>
      {toast ? <SmallAlert variant='success' leadingGraphic='phcis'>{toast}</SmallAlert> : null}
    </>
  );
}
