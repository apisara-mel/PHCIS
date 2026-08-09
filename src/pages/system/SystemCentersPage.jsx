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
import BrandButton from '@/components/button/BrandButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import Switch from '@/components/switch/Switch';
import AlertDialog from '@/components/popup/AlertDialog';
import SmallAlert from '@/components/alert/SmallAlert';
import LottieIllustration from '@/components/illustrations/LottieIllustration';
import { ExportFormatPopup } from '@/pages/consent/consentExportPopup';
import SuccessToast from '@/components/toast/SuccessToast';
import SYSTEM_NAV from '@/pages/system/systemNav';
import {
  readCenters,
  writeCenters,
  computeCenterStats,
  formatCenterAddress,
  formatCenterHoursLine,
  HOUR_GROUPS,
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

/* คำค้นตั้งต้นของ "ค้นหาล่าสุด" — ให้เห็นตั้งแต่เปิดหน้าครั้งแรก แล้วถูกแทนที่
   ด้วยคำที่ผู้ใช้ค้นจริง */
const CENTER_SEARCH_HISTORY_SEED = [
  '4 ดินแดง',
  '25 ห้วยขวาง',
  '35 หัวหมาก',
  '69 คันนายาว',
  'GA0012460',
];

/* รายงานที่ป้อนให้ ExportFormatPopup (ตัวเดียวกับหน้าจัดการความยินยอม) —
   popup ใช้ title/subtitle ขึ้นหัว และ table.columns เป็นตัวเลือกหัวข้อที่จะส่งออก */
const CENTER_EXPORT_REPORT = {
  key: 'center-registry',
  title: 'ทะเบียนศูนย์บริการ',
  subtitle: 'รายชื่อศูนย์บริการสาธารณสุขทั้งหมดในระบบ พร้อมรหัสหน่วยบริการและเวลาทำการ',
  table: {
    columns: [
      { key: 'hcode9', header: 'รหัสหน่วยบริการ (9 หลัก)', width: 180 },
      { key: 'hcode5', header: 'รหัสเดิม (5 หลัก)', width: 140 },
      { key: 'code', header: 'รหัสศูนย์', width: 100 },
      { key: 'name', header: 'ชื่อศูนย์บริการ', width: 220 },
      { key: 'address', header: 'ที่ตั้ง', width: 320 },
      { key: 'phone', header: 'เบอร์โทรศัพท์', width: 150 },
      { key: 'email', header: 'อีเมล', width: 200 },
      { key: 'hours', header: 'เวลาทำการ', width: 200 },
      { key: 'status', header: 'สถานะ', width: 120 },
    ],
    rows: [],
  },
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
  return <LottieIllustration animationData={anim} size={160} loop ariaLabel='ยังไม่มีศูนย์บริการ' />;
}

/* เวลาทำการแยกตามกลุ่มวัน — จันทร์-ศุกร์ / เสาร์-อาทิตย์ / วันหยุดนักขัตฤกษ์
   แสดงเฉพาะ "ในเวลาราชการ" ของแต่ละกลุ่มให้แถวไม่สูงเกินไป กลุ่มที่ปิดทำการ
   formatCenterHoursLine จะคืน "ปิดทำการ" ให้เอง. */
function HoursCell({ hours }) {
  return (
    <div className='flex flex-col' style={{ gap: 'var(--dim-space-100)' }}>
      {HOUR_GROUPS.map((g) => (
        /* กลุ่มวันกับช่วงเวลาอยู่บรรทัดเดียวกัน — แถวตารางจะได้ไม่สูงเป็น 6 บรรทัด */
        <div key={g.key} className='flex items-baseline' style={{ gap: 'var(--dim-space-200)' }}>
          <span style={SUBTEXT_CELL}>{g.label}</span>
          <span style={TEXT_CELL}>{formatCenterHoursLine(hours, 'in', g.key)}</span>
        </div>
      ))}
    </div>
  );
}

/* รหัสหน่วยบริการ — 9 หลักเป็นตัวหลัก, 5 หลักเดิมเป็นบรรทัดรอง. */
function HcodeCell({ row }) {
  return (
    <div className='flex flex-col'>
      <span style={TEXT_CELL}>{row.hcode9 || '—'}</span>
      <span style={SUBTEXT_CELL}>{row.hcode5 ? `เดิม ${row.hcode5}` : 'ไม่มีรหัสเดิม'}</span>
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
  /* นำส่งออกรายงาน — ใช้ popup ตัวเดียวกับหน้าจัดการความยินยอม (เลือกไฟล์
     PDF/Excel/CSV + ช่วงวันที่ + หัวข้อ + บันทึก log) ไม่สร้าง flow ใหม่ */
  const [exportReport, setExportReport] = useState(null);
  const [exportDone, setExportDone] = useState(false);

  /* ค้นหาล่าสุด — seed ไว้ให้เห็นตั้งแต่ครั้งแรกที่เปิดหน้า (เบราว์เซอร์ใหม่
     ยังไม่มีประวัติของตัวเอง) แล้วค่อยถูกแทนที่ด้วยคำที่ผู้ใช้ค้นจริง */
  const { history: searchHistory, push: pushHistory, clear: clearHistory } =
    useSearchHistory('mih:primarysearch-history:centers', {
      seedIfEmpty: CENTER_SEARCH_HISTORY_SEED,
    });

  /* เรียงตามคอลัมน์ที่กดบนหัวตาราง — กดซ้ำสลับ asc/desc */
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const handleSort = (key) => {
    setSortConfig((prev) => (
      prev.key === key
        ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'asc' }
    ));
  };

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
  const filtersActive = !!filterStatus || !!search.trim();
  const { showClearChip, resultsOpaque, clearFilters } = useSmoothClearFilters(
    filtersActive,
    () => {
      setSearch('');
      setFilterStatus('');
    },
  );

  const stats = useMemo(() => computeCenterStats(centers), [centers]);

  const summaryCards = useMemo(() => [
    {
      key: 'total',
      icon: 'local_hospital',
      color: 'info',
      value: String(stats.total),
      label: 'ศูนย์บริการทั้งหมด',
    },
    {
      key: 'active',
      icon: 'check_circle',
      color: 'positive',
      value: String(stats.active),
      label: 'ศูนย์ที่เปิดบริการ',
    },
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

      const hay = `${c.code} ${c.name} ${c.hcode9 || ''} ${c.hcode5 || ''}`.toLowerCase();
      const matchesSearch = !q || hay.includes(q);
      const matchesStatus = !filterStatus
        || (filterStatus === 'active' && c.active)
        || (filterStatus === 'inactive' && !c.active);
      return matchesSearch && matchesStatus;
    });
  }, [centers, search, filterStatus, activeTab]);

  /* ค่าที่ใช้เรียงต่อคอลัมน์ — เก็บแยกจาก render() เพราะบางคอลัมน์ render
     เป็น JSX (รหัสหน่วยบริการ / เวลาทำการ) เรียงจาก DOM ตรง ๆ ไม่ได้ */
  const sortValueOf = (row, key) => {
    switch (key) {
      case 'hcode': return row.hcode9 || '';
      case 'code': return Number(row.code) || 0;
      case 'name': return row.name || '';
      case 'address': return formatCenterAddress(row.location);
      case 'phone': return row.phones?.[0] || '';
      case 'email': return row.emails?.[0] || '';
      case 'website': return row.website || '';
      case 'hours': return formatCenterHoursLine(row.hours, 'in', 'weekday');
      case 'active': return row.active ? 1 : 0;
      default: return '';
    }
  };

  const sortedRows = useMemo(() => {
    if (!sortConfig.key) return filteredRows;
    const dir = sortConfig.direction === 'desc' ? -1 : 1;
    return [...filteredRows].sort((a, b) => {
      const av = sortValueOf(a, sortConfig.key);
      const bv = sortValueOf(b, sortConfig.key);
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
      return String(av).localeCompare(String(bv), 'th') * dir;
    });
  }, [filteredRows, sortConfig]);

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
    /* รหัสหน่วยบริการ 9 หลักเป็นรหัสหลักของศูนย์ จึงมาก่อนรหัสศูนย์ */
    {
      key: 'hcode',
      header: 'รหัสหน่วยบริการ',
      sortable: true,
      minWidth: 140,
      render: (row) => <HcodeCell row={row} />,
    },
    {
      key: 'code',
      header: 'รหัสศูนย์',
      sortable: true,
      render: (row) => <span style={TEXT_CELL}>{row.code || '—'}</span>,
    },
    {
      key: 'name',
      header: 'ชื่อศูนย์บริการ',
      sortable: true,
      render: (row) => <span style={TEXT_CELL}>{row.name}</span>,
    },
    {
      key: 'address',
      header: 'ที่ตั้ง',
      minWidth: 240,
      render: (row) => <span style={TEXT_CELL}>{formatCenterAddress(row.location)}</span>,
    },
    {
      key: 'phone',
      header: 'เบอร์โทรศัพท์',
      render: (row) => <span style={TEXT_CELL}>{row.phones?.[0] || '—'}</span>,
    },
    {
      key: 'email',
      header: 'อีเมล',
      minWidth: 180,
      render: (row) => <span style={TEXT_CELL}>{row.emails?.[0] || '—'}</span>,
    },
    {
      key: 'website',
      header: 'เว็บไซต์',
      minWidth: 160,
      render: (row) => <span style={TEXT_CELL}>{row.website || '—'}</span>,
    },
    {
      key: 'hours',
      header: 'เวลาทำการ',
      render: (row) => <HoursCell hours={row.hours} />,
    },
    {
      key: 'active',
      header: 'สถานะ',
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
        title='ศูนย์บริการ'
        headerInfo={hasCenters ? (
          /* ชื่อหน้า + ปุ่มเพิ่มศูนย์อยู่ใน SubHeader มาตรฐานแล้ว (เหมือนหน้าอื่น)
             ตรงนี้จึงเหลือเฉพาะการ์ดสรุป และเว้นบน 24px ให้เท่าหน้าอื่น */
          <section className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)', paddingTop: 'var(--dim-space-600)' }}>
            <div className='flex items-stretch flex-wrap w-full' style={{ gap: 'var(--dim-space-400)' }}>
              {summaryCards.map((c) => (
                <SummaryCard key={c.key} card={c} variant='panel' />
              ))}
            </div>
          </section>
        ) : null}
        /* ปุ่มเพิ่มศูนย์บริการอยู่ใน SubHeader ที่ sticky ด้วย — เลื่อนตาราง
           ลงไปแล้วปุ่มยังอยู่ ไม่ต้องเลื่อนกลับขึ้นบนสุด */
        actions={hasCenters ? (
          <BrandButton variant='fill' size='md' leadingIcon='add' onClick={goAdd}>
            เพิ่มศูนย์บริการ
          </BrandButton>
        ) : undefined}
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
            {/* ค้นหา + ตัวกรอง + ตาราง อยู่ในการ์ดขาวใบเดียวกัน — ตัวกรองคุม
                ตารางที่อยู่ใต้มันโดยตรง แยกการ์ดแล้วอ่านเหมือนคนละเรื่อง */}
            <section
              className='w-full flex flex-col'
              style={{ ...CARD, padding: 'var(--dim-space-600)', gap: 'var(--dim-space-600)' }}
            >
              <div className='w-full flex flex-col items-center' style={{ gap: 'var(--dim-space-600)' }}>
                <PrimarySearch
                  value={search}
                  onChange={setSearch}
                  onSubmit={handleSubmitSearch}
                  placeholder='ค้นหารหัสศูนย์ / รหัสหน่วยบริการ / ชื่อศูนย์บริการ'
                  width={640}
                  history={searchHistory}
                  onHistoryClear={searchHistory.length > 0 ? clearHistory : undefined}
                />

                <div className='flex items-start w-full flex-wrap' style={{ gap: 'var(--dim-space-300)' }}>
                  <div className='flex items-center flex-wrap min-w-0' style={{ gap: 'var(--dim-space-200)' }}>
                    <FilterDropdown
                      prefix='สถานะ:'
                      options={STATUS_OPTIONS}
                      value={filterStatus}
                      onChange={setFilterStatus}
                      placeholder='ทั้งหมด'
                    />
                    <ClearFiltersTag active={showClearChip} onClear={clearFilters} />
                  </div>
                  <div className='flex-1' />
                  <NeutralSubdueButton
                    leadingIcon='ios_share'
                    size='sm'
                    collapseLabelBelow='lg'
                    onClick={() => setExportReport(CENTER_EXPORT_REPORT)}
                  >
                    นำส่งออกรายงาน
                  </NeutralSubdueButton>
                </div>
              </div>

              <SmoothFilterResults opaque={resultsOpaque}>
              <Table
                columns={columns}
                rows={sortedRows}
                rowKey={(row) => row.id}
                sortConfig={sortConfig}
                onSort={handleSort}
                stickyColCount={3}
                stickyShadow
                emptyMessage={activeTab === 'draft' ? 'ไม่มีร่างศูนย์บริการ' : 'ไม่พบศูนย์บริการ'}
              />
              </SmoothFilterResults>
            </section>
          </div>
        )}
      </QueuePageShell>

      <ExportFormatPopup
        open={!!exportReport}
        report={exportReport}
        onClose={() => setExportReport(null)}
        onExported={() => setExportDone(true)}
      />
      <SuccessToast
        open={exportDone}
        message='นำส่งออกรายงานแล้ว — ระบบบันทึก log การส่งออกข้อมูล'
        onClose={() => setExportDone(false)}
      />

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
