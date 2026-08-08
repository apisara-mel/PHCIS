import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import { SummaryCard } from '@/components/layout/SummaryCardsBar';
import PrimarySearch from '@/components/search/PrimarySearch';
import useSearchHistory from '@/components/search/useSearchHistory';
import FilterTag, { FilterDropdown } from '@/components/forms/FilterTag';
import Table from '@/components/table/Table';
import BrandButton from '@/components/button/BrandButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import Switch from '@/components/switch/Switch';
import AlertDialog from '@/components/popup/AlertDialog';
import SmallAlert from '@/components/alert/SmallAlert';
import LottieIllustration from '@/components/illustrations/LottieIllustration';
import SYSTEM_NAV from '@/pages/system/systemNav';
import {
  readCenters,
  writeCenters,
  computeCenterStats,
  formatCenterAddress,
  formatCenterHoursLine,
} from '@/data/centerStore';

/* ระบบจัดการระบบ · ศูนย์บริการ
   Empty: Figma 4D3nTx53 · 1:2558
   List:  Figma 4D3nTx53 · 4:21032 */

const breadcrumb = ['จัดการระบบ', 'ศูนย์บริการ'];

const CARD = {
  background: 'var(--surface-card-100)',
  borderRadius: 'var(--dim-radius-500)',
  border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
  boxShadow: 'var(--shadow-card)',
};

const PANEL_TITLE = {
  color: 'var(--text-topic-tertiary-title)',
  fontFamily: 'var(--type-family-heading-content)',
  fontSize: 'var(--type-size-base)',
  fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
  lineHeight: 1.5,
  margin: 'var(--dim-space-0)',
};

const TEXT_CELL = {
  color: 'var(--text-content-default)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm)',
  fontWeight: 'var(--type-weight-regular)',
  lineHeight: 1.5,
};

const SUBTEXT_CELL = {
  color: 'var(--text-content-tertiary)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-xs)',
  fontWeight: 'var(--type-weight-regular)',
  lineHeight: 1.5,
};

const STATUS_OPTIONS = [
  { value: 'active', label: 'เปิดบริการ' },
  { value: 'inactive', label: 'ปิดใช้งาน' },
];

const CENTER_TABS = [
  { key: 'all', label: 'ทั้งหมด', icon: 'school' },
  { key: 'draft', label: 'บันทึกร่าง', icon: 'save' },
];

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
  return <LottieIllustration animationData={anim} size={160} loop ariaLabel='ยังไม่มีศูนย์บริการ' />;
}

function HoursCell({ hours }) {
  return (
    <div className='flex flex-col' style={{ gap: 'var(--dim-space-100)' }}>
      <div className='flex flex-col'>
        <span style={SUBTEXT_CELL}>ในเวลาราชการ</span>
        <span style={TEXT_CELL}>{formatCenterHoursLine(hours, 'in')}</span>
      </div>
      <div className='flex flex-col'>
        <span style={SUBTEXT_CELL}>นอกเวลาราชการ</span>
        <span style={TEXT_CELL}>{formatCenterHoursLine(hours, 'out')}</span>
      </div>
    </div>
  );
}

export default function SystemCentersPage() {
  const navigate = useHistory();
  const [centers, setCenters] = useState(() => readCenters());
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [toast, setToast] = useState(null);
  const [toggleConfirm, setToggleConfirm] = useState(null);

  const { history: searchHistory, push: pushHistory, clear: clearHistory } =
    useSearchHistory('mih:primarysearch-history:centers');

  const refresh = useCallback(() => {
    setCenters(readCenters());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const persist = useCallback((next) => {
    writeCenters(next);
    setCenters(next);
  }, []);

  const showToast = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2800);
  };

  const goAdd = () => navigate.push('/admin/centers/new');

  const hasCenters = centers.length > 0;
  const isAllFilters = !filterStatus;

  const stats = useMemo(() => computeCenterStats(centers), [centers]);

  const summaryCards = useMemo(() => [
    { key: 'total', icon: 'local_hospital', color: 'info', value: String(stats.total), label: 'ศูนย์บริการทั้งหมด' },
    { key: 'active', icon: 'check_circle', color: 'positive', value: String(stats.active), label: 'ศูนย์ที่เปิดบริการ' },
    {
      key: 'inactive',
      icon: 'cancel',
      value: String(stats.inactive),
      label: 'ศูนย์ที่ปิดใช้งาน',
      tileBg: 'var(--surface-danger-tertiary, #FEE2E2)',
      iconInk: 'var(--text-danger-default, #B91C1C)',
    },
  ], [stats]);

  const tabDefs = useMemo(() => {
    const published = centers.filter((c) => !c.draft).length;
    const drafts = centers.filter((c) => c.draft).length;
    return CENTER_TABS.map((t) => ({
      ...t,
      count: t.key === 'all' ? published : drafts,
    }));
  }, [centers]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return centers.filter((c) => {
      const inTab = activeTab === 'draft' ? c.draft : !c.draft;
      if (!inTab) return false;

      const hay = `${c.code} ${c.name}`.toLowerCase();
      const matchesSearch = !q || hay.includes(q);
      const matchesStatus = !filterStatus
        || (filterStatus === 'active' && c.active)
        || (filterStatus === 'inactive' && !c.active);
      return matchesSearch && matchesStatus;
    });
  }, [centers, search, filterStatus, activeTab]);

  const handleSubmitSearch = (value) => {
    const q = (value || '').trim();
    if (q) pushHistory({ label: q, value: q });
    setSearch(q);
  };

  const applyToggleActive = (centerId, next) => {
    persist(centers.map((c) => (c.id === centerId ? { ...c, active: next } : c)));
    setToggleConfirm(null);
    showToast(next ? 'เปิดบริการศูนย์แล้ว' : 'ปิดใช้งานศูนย์แล้ว');
  };

  const handleToggleActive = (centerId, next) => {
    if (!next) {
      setToggleConfirm({ centerId, next });
      return;
    }
    applyToggleActive(centerId, next);
  };

  const columns = useMemo(() => [
    {
      key: 'code',
      header: 'รหัสศูนย์',
      width: 96,
      sortable: true,
      render: (row) => <span style={TEXT_CELL}>{row.code || '—'}</span>,
    },
    {
      key: 'name',
      header: 'ชื่อศูนย์บริการ',
      width: 220,
      sortable: true,
      render: (row) => <span style={TEXT_CELL}>{row.name}</span>,
    },
    {
      key: 'address',
      header: 'ที่ตั้ง',
      minWidth: 240,
      width: 280,
      render: (row) => <span style={TEXT_CELL}>{formatCenterAddress(row.location)}</span>,
    },
    {
      key: 'phone',
      header: 'เบอร์โทรศัพท์',
      width: 140,
      render: (row) => <span style={TEXT_CELL}>{row.phones?.[0] || '—'}</span>,
    },
    {
      key: 'email',
      header: 'อีเมล',
      minWidth: 180,
      width: 200,
      render: (row) => <span style={TEXT_CELL}>{row.emails?.[0] || '—'}</span>,
    },
    {
      key: 'website',
      header: 'เว็บไซต์',
      minWidth: 160,
      width: 180,
      render: (row) => <span style={TEXT_CELL}>{row.website || '—'}</span>,
    },
    {
      key: 'hours',
      header: 'เวลาทำการ',
      width: 168,
      render: (row) => <HoursCell hours={row.hours} />,
    },
    {
      key: 'active',
      header: 'สถานะ',
      width: 96,
      render: (row) => (
        <Switch
          checked={row.active}
          onChange={(next) => handleToggleActive(row.id, next)}
          aria-label={`สถานะ ${row.name}`}
          disabled={row.draft}
        />
      ),
    },
    {
      key: 'action',
      header: 'การดำเนินการ',
      width: 128,
      render: () => (
        <NeutralSubdueButton
          leadingIcon='edit'
          size='sm'
          onClick={() => showToast('ฟีเจอร์แก้ไขกำลังพัฒนา')}
        >
          แก้ไข
        </NeutralSubdueButton>
      ),
    },
  ], [centers]);

  return (
    <>
      <QueuePageShell
        activeKey='system-centers'
        sidebarItems={SYSTEM_NAV}
        sidebarFallbackKey='system-centers'
        brandTitle='จัดการระบบ'
        breadcrumb={breadcrumb}
        title={hasCenters ? undefined : 'ศูนย์บริการ'}
        headerInfo={hasCenters ? (
          <section className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
            <div className='flex items-center justify-between w-full flex-wrap' style={{ gap: 'var(--dim-space-300)' }}>
              <h1 style={PANEL_TITLE}>ศูนย์บริการ</h1>
              <BrandButton variant='fill' size='md' leadingIcon='add' onClick={goAdd}>
                เพิ่มศูนย์บริการ
              </BrandButton>
            </div>
            <div className='flex items-stretch flex-wrap w-full' style={{ gap: 'var(--dim-space-400)' }}>
              {summaryCards.map((c) => (
                <SummaryCard key={c.key} card={c} variant='panel' hover />
              ))}
            </div>
          </section>
        ) : null}
        tabs={hasCenters ? tabDefs : undefined}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      >
        {!hasCenters ? (
          <div className='flex flex-col flex-1 min-w-0' style={{ padding: 'var(--dim-space-600)' }}>
            <section
              className='flex flex-col items-center justify-center flex-1 w-full'
              style={{ ...CARD, padding: 'var(--dim-space-600)', gap: 'var(--dim-space-400)', minHeight: 480 }}
            >
              <EmptyIllustration />
              <span
                style={{
                  color: 'var(--text-brandPrimary-default)',
                  fontFamily: 'var(--type-family-heading-graphic2)',
                  fontSize: 'var(--type-size-sm)',
                  lineHeight: 1.5,
                  textAlign: 'center',
                }}
              >
                คุณยังไม่มีศูนย์บริการในระบบ
              </span>
              <BrandButton variant='fill' size='lg' leadingIcon='add' onClick={goAdd}>
                เพิ่มศูนย์บริการ
              </BrandButton>
            </section>
          </div>
        ) : (
          <div className='flex flex-col flex-1 min-w-0' style={{ padding: 'var(--dim-space-600)', gap: 'var(--dim-space-300)' }}>
            <section
              className='w-full flex flex-col items-center'
              style={{ ...CARD, padding: 'var(--dim-space-600)', gap: 'var(--dim-space-600)' }}
            >
              <PrimarySearch
                value={search}
                onChange={setSearch}
                onSubmit={handleSubmitSearch}
                placeholder='ค้นหารหัสศูนย์ / ชื่อศูนย์บริการ'
                width={640}
                history={searchHistory}
                onHistoryClear={searchHistory.length > 0 ? clearHistory : undefined}
              />

              <div className='flex items-start w-full flex-wrap' style={{ gap: 'var(--dim-space-300)' }}>
                <div className='flex items-center flex-wrap min-w-0' style={{ gap: 'var(--dim-space-200)' }}>
                  <FilterTag
                    value='ทั้งหมด'
                    selected={isAllFilters}
                    onClick={() => setFilterStatus('')}
                  />
                  <FilterDropdown
                    prefix='สถานะ:'
                    options={STATUS_OPTIONS}
                    value={filterStatus}
                    onChange={setFilterStatus}
                    placeholder='ทั้งหมด'
                  />
                </div>
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
              <Table
                columns={columns}
                rows={filteredRows}
                rowKey={(row) => row.id}
                stickyColCount={2}
                stickyShadow
                emptyMessage={activeTab === 'draft' ? 'ไม่มีร่างศูนย์บริการ' : 'ไม่พบศูนย์บริการ'}
              />
            </section>
          </div>
        )}
      </QueuePageShell>

      <AlertDialog
        open={!!toggleConfirm}
        onClose={() => setToggleConfirm(null)}
        type='warning'
        alignment='center'
        title='ปิดใช้งานศูนย์บริการ?'
        description='การปิดใช้งานจะทำให้ศูนย์บริการนี้ไม่สามารถให้บริการได้จนกว่าจะเปิดอีกครั้ง'
        confirmLabel='ปิดใช้งาน'
        cancelLabel='ยกเลิก'
        onConfirm={() => {
          if (toggleConfirm) {
            applyToggleActive(toggleConfirm.centerId, toggleConfirm.next);
          }
        }}
      />

      {toast ? (
        <div
          className='fixed left-1/2 z-[200] -translate-x-1/2'
          style={{ bottom: 'var(--dim-space-600)' }}
        >
          <SmallAlert variant='success' leadingGraphic='phcis'>{toast}</SmallAlert>
        </div>
      ) : null}
    </>
  );
}
