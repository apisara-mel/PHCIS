import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import { SummaryCard } from '@/components/layout/SummaryCardsBar';
import { FilterDropdown } from '@/components/forms/FilterTag';
import ClearFiltersTag, { SmoothFilterResults } from '@/components/forms/ClearFiltersTag';
import useSmoothClearFilters from '@/hooks/useSmoothClearFilters';
import Table from '@/components/table/Table';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import BrandButton from '@/components/button/BrandButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import BrandDashedAddButton from '@/components/button/BrandDashedAddButton';
import RowMenu from '@/components/overflow/RowActionMenu';
import Switch from '@/components/switch/Switch';
import SmallAlert from '@/components/alert/SmallAlert';
import LottieIllustration from '@/components/illustrations/LottieIllustration';
import ASSESS_NAV from '@/pages/assess/assessNav';
import {
  readAccessControls,
  writeAccessControls,
  computeAccessControlStats,
  countPermissionBuckets,
  duplicateAccessControl,
  latestVersion,
  formatVersion,
  CENTER_OPTIONS,
} from '@/data/accessControlStore';
import { readActivities } from '@/data/activityStore';
import { readDepartments } from '@/data/departmentStore';

/* PHCIS | Assess-control — สิทธิการเข้าถึง list (Figma 4D3nTx53 · 16:43747). */

const breadcrumb = ['สิทธิการเข้าถึง'];

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
  return (
    <LottieIllustration
      animationData={anim}
      size={160}
      loop
      ariaLabel='ยังไม่มีสิทธิการเข้าถึงระบบ'
    />
  );
}

function PolicyBadge({ style, children }) {
  return (
    <ColorfulBadge style={style} size='small' hierarchy='secondary' width='hug'>
      {children}
    </ColorfulBadge>
  );
}

export default function AccessControlPage() {
  const navigate = useHistory();
  const [records, setRecords] = useState(() => readAccessControls());
  const [filterCenter, setFilterCenter] = useState('');
  const [filterActivity, setFilterActivity] = useState('');
  const [filterSub, setFilterSub] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [toast, setToast] = useState(null);

  const persist = useCallback((next) => {
    writeAccessControls(next);
    setRecords(next);
  }, []);

  const showToast = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2800);
  };

  const stats = useMemo(() => computeAccessControlStats(records), [records]);

  const summaryCards = useMemo(() => [
    { key: 'total', icon: 'clipboard-list', color: 'info', value: String(stats.total), label: 'สิทธิ์เข้าถึงระบบทั้งหมด' },
    { key: 'active', icon: 'clipboard-list', color: 'positive', value: String(stats.active), label: 'สิทธิ์เข้าถึงระบบที่เปิดใช้งาน' },
    {
      key: 'inactive',
      icon: 'clipboard-list',
      value: String(stats.inactive),
      label: 'สิทธิ์เข้าถึงระบบที่ปิดใช้งาน',
      tileBg: 'var(--surface-danger-tertiary, #FEE2E2)',
      iconInk: 'var(--text-danger-default, #B91C1C)',
    },
  ], [stats]);

  const activities = useMemo(() => readActivities(), [records]);
  const departments = useMemo(() => readDepartments(), [records]);

  const subActivityOptions = useMemo(() => {
    const subs = activities.flatMap((a) => (a.subActivities || []).map((sub) => ({
      value: sub.id,
      label: sub.name,
    })));
    return subs;
  }, [activities]);

  const filteredRows = useMemo(() => records.filter((r) => {
    if (filterCenter && r.centerId !== filterCenter) return false;
    if (filterActivity && r.activityId !== filterActivity) return false;
    if (filterSub && r.subActivityId !== filterSub) return false;
    if (filterDept && r.departmentId !== filterDept) return false;
    return true;
  }), [records, filterCenter, filterActivity, filterSub, filterDept]);

  const hasRecords = records.length > 0;
  const isAllFilters = !filterCenter && !filterActivity && !filterSub && !filterDept;
  const filtersActive = !isAllFilters;
  const { showClearChip, resultsOpaque, clearFilters } = useSmoothClearFilters(
    filtersActive,
    () => {
      setFilterCenter('');
      setFilterActivity('');
      setFilterSub('');
      setFilterDept('');
    },
  );

  const openCreate = () => navigate.push('/assess/access-control/new');
  const openDetail = (row) => navigate.push(`/assess/access-control/${row.id}`);
  const openEdit = (row) => navigate.push(`/assess/access-control/${row.id}/edit`);

  const applyToggleActive = (id, next) => {
    persist(records.map((r) => (r.id === id ? { ...r, active: next } : r)));
    showToast(next ? 'เปิดใช้งานสิทธิการเข้าถึงแล้ว' : 'ปิดใช้งานสิทธิการเข้าถึงแล้ว');
  };

  /* ทำสำเนาแม่แบบ — id ใหม่ ชื่อต่อท้าย (สำเนา) และเริ่มนับเวอร์ชันใหม่ที่ v1 */
  const handleDuplicate = (row) => {
    const copy = duplicateAccessControl(row);
    persist([...records, copy]);
    showToast(`ทำสำเนา "${copy.templateName}" แล้ว`);
  };

  const columns = useMemo(() => [
    /* แม่แบบตั้งชื่อไว้ก่อนผูกกิจกรรม ชื่อ+เวอร์ชันจึงเป็นคอลัมน์แรก */
    {
      key: 'template',
      header: 'แม่แบบ / เวอร์ชัน',
      sortable: true,
      minWidth: 200,
      render: (row) => (
        <div className='flex flex-col'>
          <span style={TEXT_CELL}>{row.templateName || 'ไม่มีชื่อแม่แบบ'}</span>
          <span style={{ ...TEXT_CELL, color: 'var(--text-content-tertiary)', fontSize: 'var(--type-size-xs)' }}>
            {formatVersion(latestVersion(row))}
          </span>
        </div>
      ),
    },
    {
      key: 'center',
      header: 'ศูนย์บริการ',
      sortable: true,
      render: (row) => <span style={TEXT_CELL}>{row.center}</span>,
    },
    {
      key: 'activity',
      header: 'กิจกรรม',
      render: (row) => <PolicyBadge style='blue'>{row.activity}</PolicyBadge>,
    },
    {
      key: 'subActivity',
      header: 'กิจกรรมย่อย',
      render: (row) => <PolicyBadge style='teal'>{row.subActivity}</PolicyBadge>,
    },
    {
      key: 'department',
      header: 'แผนก',
      render: (row) => <PolicyBadge style='blue'>{row.department}</PolicyBadge>,
    },
    {
      key: 'viewCount',
      header: 'ระบบที่มีสิทธิดู',
      align: 'center',
      render: (row) => {
        const { view } = countPermissionBuckets(row.permissions);
        return <span style={TEXT_CELL}>{view}</span>;
      },
    },
    {
      key: 'editCount',
      header: 'ระบบที่มีสิทธิบันทึก',
      align: 'center',
      render: (row) => {
        const { edit } = countPermissionBuckets(row.permissions);
        return <span style={TEXT_CELL}>{edit}</span>;
      },
    },
    {
      key: 'noneCount',
      header: 'ระบบที่ไม่มีสิทธิ',
      align: 'center',
      render: (row) => {
        const { none } = countPermissionBuckets(row.permissions);
        return <span style={TEXT_CELL}>{none}</span>;
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
            aria-label={`สถานะ ${row.templateName || row.activity || 'แม่แบบ'}`}
          />
        </span>
      ),
    },
    {
      key: 'action',
      header: 'การดำเนินการ',
      minWidth: 148,
      render: (row) => (
        <span
          className='inline-flex items-center'
          style={{ gap: 'var(--dim-space-200)' }}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          role='presentation'
        >
          <NeutralSubdueButton
            leadingIcon='edit'
            size='sm'
            onClick={() => openEdit(row)}
          >
            แก้ไข
          </NeutralSubdueButton>
          <RowMenu
            ariaLabel={`ตัวเลือก ${row.templateName || 'แม่แบบ'}`}
            items={[
              { key: 'dup', icon: 'content_copy', label: 'ทำสำเนาแม่แบบ', onClick: () => handleDuplicate(row) },
              { key: 'edit', icon: 'edit', label: 'แก้ไข (ออกเวอร์ชันใหม่)', onClick: () => openEdit(row) },
            ]}
          />
        </span>
      ),
    },
  ], [records]);

  const filterOpts = {
    center: [{ value: '', label: 'ทั้งหมด' }, ...CENTER_OPTIONS],
    activity: [{ value: '', label: 'ทั้งหมด' }, ...activities.map((a) => ({ value: a.id, label: a.name }))],
    sub: [{ value: '', label: 'ทั้งหมด' }, ...subActivityOptions],
    dept: [{ value: '', label: 'ทั้งหมด' }, ...departments.map((d) => ({ value: d.id, label: d.name }))],
  };

  return (
    <>
      <QueuePageShell
        activeKey='assess-access-control'
        sidebarItems={ASSESS_NAV}
        sidebarFallbackKey='assess-access-control'
        brandTitle='จัดการระบบ'
        breadcrumb={breadcrumb}
        /* ชื่อหน้า + ปุ่มเพิ่มอยู่ใน SubHeader มาตรฐาน — ระยะบนจึงเท่ากันทุกหน้า
           และปุ่มยัง sticky ตอนเลื่อนตาราง (แก้พร้อมกันทุกหน้า 10 ส.ค. 2569) */
        title='สิทธิการเข้าถึง'
        actions={hasRecords ? (
          <BrandButton variant='fill' size='md' leadingIcon='add' onClick={openCreate}>
            เพิ่มสิทธิการเข้าถึง
          </BrandButton>
        ) : undefined}
        headerInfo={hasRecords ? (
          <section
            className='flex flex-col w-full'
            style={{ gap: 'var(--dim-space-400)', paddingTop: 'var(--dim-space-600)' }}
          >
            <div className='flex items-stretch flex-wrap w-full' style={{ gap: 'var(--dim-space-400)' }}>
              {summaryCards.map((c) => (
                <SummaryCard key={c.key} card={c} variant='panel' />
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
              <span
                style={{
                  color: 'var(--text-brandPrimary-default)',
                  fontFamily: 'var(--type-family-heading-graphic2)',
                  fontSize: 'var(--type-size-sm)',
                }}
              >
                ในระบบยังไม่มีการสร้างสิทธิการเข้าถึงระบบ
              </span>
              <BrandButton variant='fill' size='lg' leadingIcon='add' onClick={openCreate}>
                เพิ่มสิทธิเข้าถึงระบบ
              </BrandButton>
            </section>
          </div>
        ) : (
          <div className='flex flex-col flex-1 min-w-0' style={{ padding: 'var(--dim-space-600)', gap: 'var(--dim-space-300)' }}>
            <section
              className='w-full flex flex-col'
              style={{ ...CARD, padding: 'var(--dim-space-600)', gap: 'var(--dim-space-300)' }}
            >
              <div className='flex items-start w-full flex-wrap' style={{ gap: 'var(--dim-space-300)' }}>
                <FilterDropdown prefix='ศูนย์:' options={filterOpts.center} value={filterCenter} onChange={setFilterCenter} placeholder='ทั้งหมด' />
                <FilterDropdown prefix='กิจกรรม:' options={filterOpts.activity} value={filterActivity} onChange={setFilterActivity} placeholder='ทั้งหมด' />
                <FilterDropdown prefix='กิจกรรมย่อย:' options={filterOpts.sub} value={filterSub} onChange={setFilterSub} placeholder='ทั้งหมด' />
                <FilterDropdown prefix='แผนก:' options={filterOpts.dept} value={filterDept} onChange={setFilterDept} placeholder='ทั้งหมด' />
                <ClearFiltersTag active={showClearChip} onClear={clearFilters} />
                <div className='flex-1' />
                <NeutralSubdueButton leadingIcon='ios_share' size='sm' collapseLabelBelow='lg'>
                  นำส่งออกรายงาน
                </NeutralSubdueButton>
              </div>
            </section>

            <section
              className='w-full flex flex-col'
              style={{ ...CARD, padding: 'var(--dim-space-600)', gap: 'var(--dim-space-300)' }}
            >
              <span style={{ ...TEXT_CELL, fontFamily: 'var(--type-family-heading-graphic2)', color: 'var(--text-topic-secondary-title)' }}>
                สิทธิ์เข้าถึงระบบ
              </span>

              <SmoothFilterResults opaque={resultsOpaque}>
              <Table
                columns={columns}
                rows={filteredRows}
                rowKey={(row) => row.id}
                onRowClick={openDetail}
                emptyMessage='ไม่พบสิทธิการเข้าถึง'
              />
              </SmoothFilterResults>

              <BrandDashedAddButton onClick={openCreate}>
                เพิ่มสิทธิ์เข้าถึงระบบ
              </BrandDashedAddButton>
            </section>
          </div>
        )}
      </QueuePageShell>

      {toast ? (
        <div className='fixed left-1/2 z-[200] -translate-x-1/2' style={{ bottom: 'var(--dim-space-600)' }}>
          <SmallAlert variant='success' leadingGraphic='phcis'>{toast}</SmallAlert>
        </div>
      ) : null}
    </>
  );
}
