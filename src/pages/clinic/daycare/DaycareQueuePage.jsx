import React, { useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import PrimarySearch from '@/components/search/PrimarySearch';
import SearchResultCount from '@/components/search/SearchResultCount';
import useSearchHistory from '@/components/search/useSearchHistory';
import ClearFiltersTag, { SmoothFilterResults } from '@/components/forms/ClearFiltersTag';
import { FilterDropdown } from '@/components/forms/FilterTag';
import useSmoothClearFilters from '@/hooks/useSmoothClearFilters';
import OverflowFlexRow from '@/components/overflow/OverflowFlexRow';
import Table from '@/components/table/Table';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import Popup from '@/components/popup/Popup';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import {
  ALERT_LEVELS, DAILY_FEE_NOTICE, DC_ROOMS,
  childFullName, daycareCenterOptions, formatAgeMonths, formatShDate,
  getCenterAlerts, getDaycareChildren, getGrowthRecords, interpretGrowth,
  resolveDaycareCenter, roomLabel,
} from '@/data/daycareCore';
import { NoticeBar, PagerRow } from '@/pages/clinic/school-health/schoolHealthShared';

/* DaycareQueuePage — หน้าแรกของระบบสถานรับเลี้ยงเด็กกลางวัน (TOR §3.5)

   โครงหน้าเดียวกับ SchoolHealthQueuePage โดยตั้งใจ: ที่ประชุม คทง.5 ครั้งที่ 3
   สั่งไว้ว่า "หน้าจอควรออกแบบให้สอดคล้องกันทั้งในคลินิกเด็กดี สถานรับเลี้ยงเด็ก
   และโรงเรียน" — เจ้าหน้าที่คนเดียวกันสลับไปมาระหว่างสามงานนี้ทั้งวัน

   สิ่งที่ต่างจากอนามัยโรงเรียนคือหน่วยของกลุ่มเป้าหมาย: เด็กปฐมวัย 0–5 ปี
   จัดกลุ่มตาม "ห้อง/ช่วงอายุ" ไม่ใช่ชั้นเรียน และตัวชี้วัดหลักคือกิจกรรมที่
   ถึงกำหนดตามอายุ (โภชนาการทุก 3 เดือน · พัฒนาการ DSPM · วัคซีน EPI)

   Pop-up เตือนตอนเปิดหน้า = มติ คทง.5 ครั้งที่ 5 (เตือนล่วงหน้า 1 สัปดาห์
   และค้างไว้เมื่อเกินกำหนด) — เปิดครั้งเดียวต่อการเข้าหน้า ไม่รบกวนซ้ำ */

const breadcrumb = ['สถานรับเลี้ยงเด็กกลางวัน', 'เด็กในความดูแล'];

const FILTER_DEFAULTS = { center: 'all', room: 'all', alert: 'all' };

const ALERT_FILTER_OPTIONS = [
  { value: 'all', label: 'ทุกสถานะ' },
  { value: 'overdue', label: 'เกินกำหนด' },
  { value: 'due', label: 'ถึงกำหนดแล้ว' },
  { value: 'upcoming', label: 'ใกล้ถึงกำหนด' },
  { value: 'clear', label: 'ไม่มีรายการค้าง' },
];

const PAGE_SIZE = 10;

const DaycareQueuePage = () => {
  const history = useHistory();
  const [filters, setFilters] = useState(FILTER_DEFAULTS);
  const [searchQ, setSearchQ] = useState('');
  const [page, setPage] = useState(1);
  const [alertPopupOpen, setAlertPopupOpen] = useState(true);
  const searchHistory = useSearchHistory('mih:daycare-children', { limit: 8 });

  const setFilter = (key) => (value) => { setFilters((f) => ({ ...f, [key]: value })); setPage(1); };

  const children = useMemo(
    () => getDaycareChildren({ centerId: filters.center }),
    [filters.center],
  );

  const alerts = useMemo(
    () => getCenterAlerts({ centerId: filters.center }),
    [filters.center],
  );

  /* กิจกรรมค้างรายคน — ใช้ทั้งคอลัมน์ในตารางและ pop-up เตือน */
  const alertsByChild = useMemo(() => {
    const map = new Map();
    alerts.forEach((a) => {
      const list = map.get(a.childId) || [];
      list.push(a);
      map.set(a.childId, list);
    });
    return map;
  }, [alerts]);

  const rows = useMemo(() => {
    const q = searchQ.trim().toLowerCase();
    return children
      .map((c) => {
        const childAlerts = alertsByChild.get(c.id) || [];
        const worst = childAlerts[0]?.level || null;
        const growth = getGrowthRecords(c.id)[0];
        const nutrition = growth ? interpretGrowth({ ...growth, birthDate: c.birthDate }) : null;
        return {
          ...c,
          name: childFullName(c),
          ageLabel: formatAgeMonths(c.birthDate),
          roomLabel: roomLabel(c.room),
          centerLabel: resolveDaycareCenter(c.centerId),
          alertCount: childAlerts.length,
          alertLevel: worst,
          nutritionLabel: nutrition?.label || 'ยังไม่มีผล',
          nutritionStyle: nutrition?.style || 'grey',
          lastGrowthAt: growth?.measuredAt || null,
        };
      })
      .filter((r) => (filters.room === 'all' ? true : r.room === filters.room))
      .filter((r) => {
        if (filters.alert === 'all') return true;
        if (filters.alert === 'clear') return r.alertCount === 0;
        return r.alertLevel === filters.alert;
      })
      .filter((r) => (q
        ? [r.name, r.nationalId, r.guardianName, r.roomLabel].some((f) => String(f || '').toLowerCase().includes(q))
        : true));
  }, [children, alertsByChild, filters.room, filters.alert, searchQ]);

  const overdueCount = alerts.filter((a) => a.level === 'overdue').length;
  const dueCount = alerts.filter((a) => a.level === 'due').length;
  const upcomingCount = alerts.filter((a) => a.level === 'upcoming').length;

  const summaryCards = useMemo(() => ([
    { key: 'children', label: 'เด็กในความดูแล', value: children.length, color: 'brand', icon: 'child_care' },
    { key: 'overdue', label: 'กิจกรรมเกินกำหนด', value: overdueCount, color: 'destructive', icon: 'error' },
    { key: 'due', label: 'ถึงกำหนดวันนี้', value: dueCount, color: 'inprogress', icon: 'event_available' },
    { key: 'upcoming', label: 'ใกล้ถึงกำหนด (7 วัน)', value: upcomingCount, color: 'info', icon: 'schedule' },
  ]), [children.length, overdueCount, dueCount, upcomingCount]);

  const filtersActive = filters.center !== 'all' || filters.room !== 'all' || filters.alert !== 'all';
  const { showClearChip, resultsOpaque, clearFilters } = useSmoothClearFilters(
    filtersActive,
    () => { setFilters(FILTER_DEFAULTS); setPage(1); },
  );

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const columns = useMemo(() => ([
    { key: 'name', label: 'ชื่อ-นามสกุล', flex: true, minWidth: 190 },
    { key: 'ageLabel', label: 'อายุ', width: 110 },
    { key: 'roomLabel', label: 'ห้อง/กลุ่มอายุ', flex: true, minWidth: 170 },
    {
      key: 'nutritionLabel', label: 'ภาวะโภชนาการล่าสุด', flex: true, minWidth: 170,
      render: (r) => (
        <ColorfulBadge style={r.nutritionStyle} size='small' hierarchy='secondary' width='hug'>
          {r.nutritionLabel}
        </ColorfulBadge>
      ),
    },
    {
      key: 'lastGrowthAt', label: 'ชั่ง/วัดล่าสุด', width: 130,
      render: (r) => (r.lastGrowthAt ? formatShDate(r.lastGrowthAt) : '—'),
    },
    {
      key: 'alertLevel', label: 'กิจกรรมที่ต้องทำ', flex: true, minWidth: 180,
      render: (r) => (r.alertCount === 0
        ? <ColorfulBadge style='green' size='small' hierarchy='secondary' width='hug'>ไม่มีรายการค้าง</ColorfulBadge>
        : (
          <ColorfulBadge style={ALERT_LEVELS[r.alertLevel].style} size='small' hierarchy='secondary' width='hug'>
            {`${ALERT_LEVELS[r.alertLevel].label} · ${r.alertCount} รายการ`}
          </ColorfulBadge>
        )),
    },
    {
      key: 'actions', label: 'การดำเนินการ', width: 140, sortable: false,
      render: (r) => (
        <BrandSubdueButton
          size='sm' variant='fill' leadingIcon='folder_open'
          onClick={(e) => { e.stopPropagation(); history.push(`/clinic/daycare/child/${r.id}`); }}
        >
          เปิดแฟ้มเด็ก
        </BrandSubdueButton>
      ),
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ]), []);

  /* pop-up เตือนตอนเปิดหน้า — แสดงเฉพาะที่ถึงกำหนด/เกินกำหนดจริง
     (ใกล้ถึงกำหนดอยู่ในตารางอยู่แล้ว ไม่ต้องเด้ง) */
  const popupAlerts = alerts.filter((a) => a.level !== 'upcoming');

  return (
    <QueuePageShell
      activeKey='daycare'
      breadcrumb={breadcrumb}
      title='สถานรับเลี้ยงเด็กกลางวัน'
      summaryTitle='เด็กในความดูแล'
      summaryCards={summaryCards}
      actions={(
        <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          <NeutralSubdueButton size='sm' leadingIcon='groups' onClick={() => history.push('/clinic/daycare/children')}>
            ทะเบียนเด็ก
          </NeutralSubdueButton>
          <NeutralSubdueButton size='sm' leadingIcon='menu_book' onClick={() => history.push('/clinic/daycare/lessons')}>
            กิจกรรมการเรียนการสอน
          </NeutralSubdueButton>
          <NeutralSubdueButton size='sm' leadingIcon='monitoring' onClick={() => history.push('/clinic/daycare/monitoring')}>
            ติดตามกิจกรรม
          </NeutralSubdueButton>
        </div>
      )}
    >
      <div className='flex flex-col flex-1 min-w-0' style={{ padding: 'var(--dim-space-600)', gap: 'var(--dim-space-500)' }}>
        {/* ข้อจำกัดที่ยังไม่มีข้อสรุปในที่ประชุม — บอกผู้ใช้ตรง ๆ ดีกว่าปล่อย
            ให้ไปหาเมนูเก็บเงินที่ไม่มีอยู่จริง */}
        <NoticeBar tone='warning' icon='payments'>{DAILY_FEE_NOTICE}</NoticeBar>

        <div
          className='w-full flex flex-col'
          style={{
            background: 'var(--surface-card-100)',
            borderRadius: 'var(--dim-radius-500)',
            boxShadow: 'var(--shadow-card-strong)',
            padding: 'var(--dim-space-600)',
            gap: 'var(--dim-space-500)',
          }}
        >
          <div className='w-full flex items-center' style={{ gap: 'var(--dim-space-300)' }}>
            <div className='flex-1' />
            <PrimarySearch
              value={searchQ}
              onChange={setSearchQ}
              onSubmit={(label) => { setSearchQ(label); setPage(1); }}
              history={searchHistory.history}
              onHistoryClear={searchHistory.history.length > 0 ? searchHistory.clear : undefined}
              placeholder='ค้นหาชื่อเด็ก / เลขบัตรประชาชน / ผู้ปกครอง'
            />
            <div className='flex-1' />
          </div>

          <div className='w-full'>
            <OverflowFlexRow gap='var(--dim-space-300)'>
              <FilterDropdown
                prefix='สถานรับเลี้ยง:'
                options={[{ value: 'all', label: 'ทุกแห่ง' }, ...daycareCenterOptions()]}
                value={filters.center}
                onChange={setFilter('center')}
              />
              <FilterDropdown
                prefix='ห้อง:'
                options={[{ value: 'all', label: 'ทุกห้อง' }, ...DC_ROOMS]}
                value={filters.room}
                onChange={setFilter('room')}
              />
              <FilterDropdown
                prefix='กิจกรรมค้าง:'
                options={ALERT_FILTER_OPTIONS}
                value={filters.alert}
                onChange={setFilter('alert')}
              />
              <ClearFiltersTag active={showClearChip} onClear={clearFilters} />
            </OverflowFlexRow>
          </div>

          <SmoothFilterResults opaque={resultsOpaque}>
            <SearchResultCount found={rows.length} total={children.length} />
            <Table
              columns={columns}
              rows={pageRows}
              rowKey={(r) => r.id}
              onRowClick={(r) => history.push(`/clinic/daycare/child/${r.id}`)}
              emptyMessage='ไม่พบเด็กที่ตรงกับคำค้น / ตัวกรอง'
            />
            <PagerRow page={page} pageSize={PAGE_SIZE} total={rows.length} onPageChange={setPage} unit='คน' />
            {totalPages > 1 ? null : null}
          </SmoothFilterResults>
        </div>
      </div>

      {/* มติ คทง.5 ครั้งที่ 5 — Pop-up แจ้งเตือนกิจกรรมที่ถึงกำหนด/เกินกำหนด */}
      <Popup
        open={alertPopupOpen && popupAlerts.length > 0}
        onClose={() => setAlertPopupOpen(false)}
        size='large'
        title={`มีกิจกรรมที่ต้องดำเนินการ ${popupAlerts.length} รายการ`}
        subtitle='ระบบแจ้งเตือนล่วงหน้า 1 สัปดาห์ และจะค้างการแจ้งเตือนไว้จนกว่าจะบันทึกกิจกรรมนั้นจริง (มติ คทง.5 ครั้งที่ 5)'
        primaryAction={{ label: 'ไปหน้าติดตามกิจกรรม', onClick: () => { setAlertPopupOpen(false); history.push('/clinic/daycare/monitoring'); } }}
        secondaryAction={{ label: 'ปิด', onClick: () => setAlertPopupOpen(false) }}
      >
        <Table
          columns={[
            { key: 'childName', label: 'ชื่อเด็ก', flex: true, minWidth: 170 },
            { key: 'kindLabel', label: 'กิจกรรม', flex: true, minWidth: 200 },
            { key: 'dueIso', label: 'กำหนด', width: 120, render: (r) => formatShDate(r.dueIso) },
            {
              key: 'level', label: 'สถานะ', width: 130,
              render: (r) => (
                <ColorfulBadge style={ALERT_LEVELS[r.level].style} size='small' hierarchy='secondary' width='hug'>
                  {ALERT_LEVELS[r.level].label}
                </ColorfulBadge>
              ),
            },
          ]}
          rows={popupAlerts}
          rowKey={(r) => r.key}
          emptyMessage='ไม่มีรายการค้าง'
        />
      </Popup>
    </QueuePageShell>
  );
};

export default DaycareQueuePage;
