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
import Popup from '@/components/popup/Popup';
import AlertDialog from '@/components/popup/AlertDialog';
import StatusBadge from '@/components/badge/StatusBadge';
import LottieIllustration from '@/components/illustrations/LottieIllustration';
import ASSESS_NAV from '@/pages/assess/assessNav';
import {
  CENTER_OPTIONS,
  readAccessControls,
  matchingAssignments,
  approvalLabel,
  APPROVAL_APPROVED,
  dataScopeLabel,
  piiLabel,
  formatDailyWindow,
} from '@/data/accessControlStore';
import { readActivities } from '@/data/activityStore';
import { readDepartments } from '@/data/departmentStore';
import { readPositions } from '@/data/positionStore';
import {
  readAssessUsers,
  writeAssessUsers,
  computeAssessUserStats,
  fullName,
  primaryAssignment,
  assignmentCenterLabel,
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
  const [toggleConfirm, setToggleConfirm] = useState(null);
  const [accessOf, setAccessOf] = useState(null);
  const [filterCenter, setFilterCenter] = useState('');
  const [filterRole, setFilterRole] = useState('');
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

  const activities = useMemo(() => readActivities(), [records]);
  const departments = useMemo(() => readDepartments(), [records]);
  const positions = useMemo(() => readPositions(), [records]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return records.filter((r) => {
      const primary = primaryAssignment(r);
      if (filterCenter && primary?.centerId !== filterCenter) return false;
      if (filterRole && primary?.subActivityId !== filterRole) return false;
      if (filterDept && primary?.departmentId !== filterDept) return false;
      if (filterPosition && primary?.positionId !== filterPosition) return false;
      if (!q) return true;
      const hay = [fullName(r), r.email, r.licenseNo, r.nameEn, r.surnameEn].join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [records, search, filterCenter, filterRole, filterDept, filterPosition]);

  const hasRecords = records.length > 0;
  const filtersActive = !!(filterCenter || filterRole || filterDept || filterPosition || search.trim());
  const { showClearChip, resultsOpaque, clearFilters } = useSmoothClearFilters(
    filtersActive,
    () => {
      setSearch('');
      setFilterCenter('');
      setFilterRole('');
      setFilterDept('');
      setFilterPosition('');
    },
  );

  const openCreate = () => navigate.push('/assess/users/new');
  const openDetail = (row) => navigate.push(`/assess/users/${row.id}`);

  /* ปุ่มในตารางเปิดสิทธิ์เป็น popup — ไม่พาออกจากหน้า เพราะส่วนใหญ่เปิดดูเทียบ
     หลายคนติด ๆ กัน (26 ส.ค. 69 มติผู้ใช้) */
  const openAccess = (row) => setAccessOf(row);

  const applyToggleActive = (id, next) => {
    persist(records.map((r) => (r.id === id ? { ...r, active: next } : r)));
    showToast(next ? 'เปิดใช้งานบุคลากรแล้ว' : 'ปิดใช้งานบุคลากรแล้ว');
  };

  /* สลับสถานะบุคลากรกระทบสิทธิ์เข้าระบบทันที — ถามยืนยันทั้งเปิดและปิด
     (ต่างจากหน้าตำแหน่ง/แผนกที่ถามเฉพาะตอนปิด) */
  const handleToggleActive = (row, next) => {
    setToggleConfirm({ id: row.id, next, name: fullName(row) });
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
    /* ทะเบียนที่ผูกกับบุคลากรมีแค่ 3 แบบ: ตำแหน่ง · บทบาท · แผนก
       (Group Policy เป็นแค่กล่องรวมบทบาท ไม่ใช่คุณสมบัติของคน จึงไม่มีคอลัมน์) */
    {
      key: 'position',
      header: 'ตำแหน่ง',
      render: (row) => {
        const p = primaryAssignment(row);
        return p?.position ? <PolicyBadge style='purple'>{p.position}</PolicyBadge> : <span style={TEXT_CELL}>—</span>;
      },
    },
    {
      key: 'role',
      header: 'บทบาท',
      render: (row) => {
        const p = primaryAssignment(row);
        return p?.subActivity ? <PolicyBadge style='teal'>{p.subActivity}</PolicyBadge> : <span style={TEXT_CELL}>—</span>;
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
      key: 'center',
      header: 'ศูนย์บริการ',
      render: (row) => <span style={TEXT_CELL}>{assignmentCenterLabel(primaryAssignment(row)) || '—'}</span>,
    },
    {
      key: 'active',
      header: 'สถานะการใช้งาน',
      render: (row) => (
        <span onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} role='presentation'>
          <Switch
            checked={row.active}
            onChange={(next) => handleToggleActive(row, next)}
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
          onClick={(e) => { e.stopPropagation(); openAccess(row); }}
        >
          สิทธิการเข้าถึงระบบ
        </NeutralSubdueButton>
      ),
    },
  ], [records]);

  /* แม่แบบสิทธิ์ที่ "ตรง" กับ assignment ของคนคนนี้ — เกณฑ์เดียวกับหน้าสิทธิ์
     การเข้าถึงระบบ (matchingAssignments) จึงไม่มีทางเห็นไม่ตรงกันสองที่ */
  const accessRows = useMemo(() => {
    if (!accessOf) return [];
    return readAccessControls()
      .map((rec) => ({ rec, matched: matchingAssignments(rec, accessOf) }))
      .filter((x) => x.matched.length > 0);
  }, [accessOf]);

  const filterOpts = {
    center: [{ value: '', label: 'ทั้งหมด' }, ...CENTER_OPTIONS],
    /* บทบาท = รายการย่อยใน Group Policy — แบนออกมาให้เลือกได้ตรง ๆ
       (หน้าบุคลากรแสดงแค่ 3 ทะเบียน: ตำแหน่ง · บทบาท · แผนก) */
    role: [{ value: '', label: 'ทั้งหมด' }, ...activities.flatMap((a) => (a.subActivities || []).map((sub) => ({ value: sub.id, label: sub.name })))],
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
        /* ชื่อหน้า + ปุ่มเพิ่มอยู่ใน SubHeader มาตรฐาน — ระยะบนจึงเท่ากันทุกหน้า
           และปุ่มยัง sticky ตอนเลื่อนตาราง (แก้พร้อมกันทุกหน้า 10 ส.ค. 2569) */
        title='บุคลากร'
        actions={hasRecords ? (
          <BrandButton variant='fill' size='md' leadingIcon='add' onClick={openCreate}>
            เพิ่มบุคลากร
          </BrandButton>
        ) : undefined}
        headerInfo={hasRecords ? (
          <section
            className='flex flex-col w-full'
            /* ระยะบนเท่ากับหน้าอื่น (26 ส.ค. 2569) — เดิม space-600 ทำให้การ์ดสรุปห่างจากแถวชื่อหน้ากว่าหน้าอื่น 24px */
            style={{ gap: 'var(--dim-space-400)' }}
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
            <section className='flex flex-col w-full' style={{ ...CARD, padding: 'var(--dim-space-600)', gap: 'var(--dim-space-400)' }}>
              {/* spacer สองข้างสมดุลกัน — กล่องค้นหาอยู่กึ่งกลางจริง เหมือนหน้าแผนก/ตำแหน่ง */}
              <div className='w-full flex items-center' style={{ gap: 'var(--dim-space-300)' }}>
                <div className='flex-1' />
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
                <div className='flex-1' />
              </div>
              <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
                <FilterDropdown prefix='ศูนย์:' options={filterOpts.center} value={filterCenter} onChange={setFilterCenter} placeholder='ทั้งหมด' />
                <FilterDropdown prefix='ตำแหน่ง:' options={filterOpts.pos} value={filterPosition} onChange={setFilterPosition} placeholder='ทั้งหมด' />
                <FilterDropdown prefix='บทบาท:' options={filterOpts.role} value={filterRole} onChange={setFilterRole} placeholder='ทั้งหมด' />
                <FilterDropdown prefix='แผนก:' options={filterOpts.dept} value={filterDept} onChange={setFilterDept} placeholder='ทั้งหมด' />
                <ClearFiltersTag active={showClearChip} onClear={clearFilters} />
              </div>
              <SmoothFilterResults opaque={resultsOpaque}>
              <Table
                columns={columns}
                rows={filteredRows}
                rowKey={(row) => row.id}
                onRowClick={openDetail}
                stickyColCount={1}
                emptyMessage='ไม่พบบุคลากรที่ตรงกับเงื่อนไข'
              />
              </SmoothFilterResults>
            </section>
          </div>
        )}
      </QueuePageShell>

      {/* สิทธิ์ของคนคนนี้ — อ่านอย่างเดียว แก้ไขที่หน้าสิทธิ์การเข้าถึงระบบ
          เพื่อไม่ให้มีที่แก้สองแห่งแล้วค่าไม่ตรงกัน */}
      <Popup
        open={!!accessOf}
        onClose={() => setAccessOf(null)}
        size='large'
        title='สิทธิการเข้าถึงระบบ'
        subtitle={accessOf ? `${fullName(accessOf)} · ${assignmentCenterLabel(primaryAssignment(accessOf)) || '—'}` : ''}
        tertiaryAction={{ label: 'ปิด', onClick: () => setAccessOf(null) }}
        primaryAction={{
          label: 'ไปหน้าสิทธิ์การเข้าถึงระบบ',
          onClick: () => { setAccessOf(null); navigate.push('/assess/access-control'); },
        }}
      >
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-300)' }}>
          {accessRows.length === 0 ? (
            <p style={{ ...TEXT_CELL, color: 'var(--text-content-tertiary)', margin: 0 }}>
              ยังไม่มีแม่แบบสิทธิ์ที่ตรงกับหน่วยงาน/ตำแหน่งของบุคลากรคนนี้
            </p>
          ) : accessRows.map(({ rec, matched }) => (
            <div
              key={rec.id}
              className='flex flex-col'
              style={{
                gap: 'var(--dim-space-200)',
                padding: 'var(--dim-space-400)',
                border: 'var(--dim-stroke-100) solid var(--border-card-default)',
                borderRadius: 'var(--dim-radius-400)',
              }}
            >
              <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
                <span style={{ ...TEXT_CELL, fontFamily: 'var(--type-family-heading-graphic2)' }}>{rec.templateName}</span>
                <StatusBadge style={rec.approvalStatus === APPROVAL_APPROVED ? 'success' : 'warning'}>
                  {approvalLabel(rec.approvalStatus)}
                </StatusBadge>
                {rec.active === false ? <StatusBadge style='neutral'>ปิดใช้งาน</StatusBadge> : null}
              </div>
              <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
                {matched.map((a) => (
                  <React.Fragment key={a.id}>
                    {a.position ? <PolicyBadge style='purple'>{a.position}</PolicyBadge> : null}
                    {a.subActivity ? <PolicyBadge style='teal'>{a.subActivity}</PolicyBadge> : null}
                    {a.department ? <PolicyBadge style='blue'>{a.department}</PolicyBadge> : null}
                  </React.Fragment>
                ))}
              </div>
              <span style={{ ...TEXT_CELL, color: 'var(--text-content-tertiary)', fontSize: 'var(--type-size-xs)' }}>
                {[
                  `ขอบเขตข้อมูล: ${dataScopeLabel(rec.dataScope)}`,
                  piiLabel(rec.pii),
                  `ช่วงเวลาใช้งาน: ${formatDailyWindow(rec)}`,
                ].join(' · ')}
              </span>
            </div>
          ))}
        </div>
      </Popup>

      <AlertDialog
        open={!!toggleConfirm}
        onClose={() => setToggleConfirm(null)}
        type='warning'
        alignment='center'
        title={toggleConfirm?.next ? 'เปิดใช้งานบุคลากร?' : 'ปิดใช้งานบุคลากร?'}
        description={toggleConfirm ? (
          <>
            {toggleConfirm.next ? 'ต้องการเปิดใช้งาน' : 'ต้องการปิดใช้งาน'}
            <br />
            {`"${toggleConfirm.name}"`}
            <br />
            {toggleConfirm.next ? 'ให้เข้าใช้ระบบได้อีกครั้งหรือไม่' : 'ไม่ให้เข้าใช้ระบบหรือไม่'}
          </>
        ) : ''}
        confirmLabel={toggleConfirm?.next ? 'เปิดใช้งาน' : 'ปิดการใช้งาน'}
        cancelLabel='ยกเลิก'
        onConfirm={() => {
          if (toggleConfirm) applyToggleActive(toggleConfirm.id, toggleConfirm.next);
        }}
      />

      {toast ? <SmallAlert variant='success' leadingGraphic='phcis'>{toast}</SmallAlert> : null}
    </>
  );
}
