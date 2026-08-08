import React, { useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import QueuePageShell, { QUEUE_STICKY_UNDER_TABS } from '@/templates/QueuePageShell';
import PrimarySearch from '@/components/search/PrimarySearch';
import SearchResultCount from '@/components/search/SearchResultCount';
import useSearchHistory from '@/components/search/useSearchHistory';
import FilterTag, { FilterDropdown } from '@/components/forms/FilterTag';
import FilterDateTag from '@/components/forms/FilterDateTag';
import OverflowFlexRow from '@/components/overflow/OverflowFlexRow';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import Table from '@/components/table/Table';
import Pagination from '@/components/pagination/Pagination';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import MaskedWorklistName from '@/components/privacy/MaskedWorklistName';
import TelemedicineQueueBadge from '@/components/telemed/TelemedicineQueueBadge';
import { getPatientByHN } from '@/data/patientProfiles';
/* IMPORT-ONLY: the /appointment system's public store. Subscribing (never
   polling — React 17, so no useSyncExternalStore) keeps this worklist in step
   when a booking is made or cancelled elsewhere in the SPA. */
import { subscribeExtraAppointments } from '@/pages/appointment/appointmentExtraStore';
import {
  REHAB_CAUSES,
  resolveRehabCause,
  REHAB_THERAPIST_OPTIONS,
  getRehabQueueRows,
  getRehabScheduledNotArrived,
  checkInRehabAppointment,
  getRehabCancellation,
  getRehabRegistrationByHn,
  imcGoldenPeriod,
} from '@/data/rehabVisits';

/* RehabQueuePage — คิวงานเวชศาสตร์ฟื้นฟูและกายภาพบำบัด (TOR 1.10.10.1 +
   1.10.10.2) at /clinic/rehab. Mirrors AncQueuePage / NcdQueuePage (the
   §1.10.x clinic prototype — playbook §3) verbatim in mechanics:
   PrimarySearch + history, tag-filter row, column-header sort,
   "แสดง X–Y จาก Z รายการ" pagination, and the separate
   "นัดแล้วยังไม่มาติดต่อ" tab whose ส่งตรวจ check-in moves the appointment
   into รอตรวจ via sessionStorage + tick.

   Rehab-specific columns replace NCD's disease-group badges:
     • สาเหตุ/Dx หลัก (Stroke · SCI · TBI · Fracture · TKA · LBP · …)
     • Course ที่ / ครั้งที่ N จาก M ในคอร์ส
     • กลุ่ม IMC + golden-period countdown (6 เดือนจากวันเกิดโรค)
     • นักกายภาพ / แพทย์เวชศาสตร์ฟื้นฟูผู้รับผิดชอบ

   ข้อมูลทั่วไปผู้รับบริการเป็น read-only บนคิว (TOR 1.10.10.1) — แก้ไข
   ทะเบียนราษฎร์จากที่นี่ไม่ได้; PatientCard เต็มรูปแบบอยู่บนหน้าบันทึก. */

const breadcrumb = ['ระบบบันทึกการรักษา', 'งานเวชศาสตร์ฟื้นฟูและกายภาพบำบัด'];
const SUMMARY_TITLE = 'คิวกายภาพบำบัดและเวชศาสตร์ฟื้นฟู';

const SEARCH_HISTORY_KEY = 'mih:primarysearch-history:rehab-queue';
const PAGE_SIZE = 20;

const buildTabs = (rows, scheduledCount) => [
  { key: 'all',       label: 'ทั้งหมด',              icon: 'group',           count: rows.length },
  { key: 'waiting',   label: 'รอตรวจ',               icon: 'schedule',        count: rows.filter((p) => p.statusKey === 'waiting').length },
  { key: 'progress',  label: 'กำลังตรวจ',            icon: 'assignment',      count: rows.filter((p) => p.statusKey === 'progress').length },
  { key: 'done',      label: 'ตรวจเสร็จแล้ว',        icon: 'check_circle',    count: rows.filter((p) => p.statusKey === 'done').length },
  { key: 'draft',     label: 'ที่ร่างไว้',            icon: 'save',            count: rows.filter((p) => p.statusKey === 'draft').length },
  { key: 'scheduled', label: 'นัดแล้วยังไม่มาติดต่อ', icon: 'event_available', count: scheduledCount },
];

const TAB_STATUS_FILTER = {
  waiting:  (r) => r.statusKey === 'waiting',
  progress: (r) => r.statusKey === 'progress',
  done:     (r) => r.statusKey === 'done',
  draft:    (r) => r.statusKey === 'draft',
};

const STATUS_BADGE = {
  waiting:  { style: 'blue',   label: 'รอตรวจ'        },
  progress: { style: 'orange', label: 'กำลังทำกายภาพ' },
  done:     { style: 'teal',   label: 'ตรวจเสร็จแล้ว' },
  draft:    { style: 'grey',   label: 'ที่ร่างไว้'    },
};

const STATUS_SORT_ORDER = { waiting: 0, progress: 1, done: 2, draft: 3 };
const CAUSE_SORT_ORDER = REHAB_CAUSES.reduce((acc, c, i) => ({ ...acc, [c.key]: i }), {});

const FILTER_OPTIONS = {
  serviceType: [
    { value: 'all',     label: 'ทุกประเภทผู้รับบริการ' },
    { value: 'general', label: 'ฟื้นฟูทั่วไป' },
    { value: 'imc',     label: 'Intermediate Care (IMC)' },
  ],
  cause: [
    { value: 'all', label: 'ทุกสาเหตุ' },
    ...REHAB_CAUSES.map((c) => ({ value: c.key, label: `${c.short} — ${c.label}` })),
  ],
  therapist: [
    { value: 'all', label: 'ทุกคน' },
    ...REHAB_THERAPIST_OPTIONS.map((t) => ({ value: t, label: t })),
  ],
  visitType: [
    { value: 'all',      label: 'ทุกประเภทนัด' },
    { value: 'first',    label: 'ครั้งแรก (ประเมินแรกรับ)' },
    { value: 'followup', label: 'ต่อเนื่องใน Course' },
  ],
  time: [
    { value: 'all',       label: 'ทั้งวัน'                 },
    { value: 'morning',   label: 'ช่วงเช้า (06:00–12:00)'  },
    { value: 'afternoon', label: 'ช่วงบ่าย (12:00–18:00)'  },
    { value: 'evening',   label: 'ช่วงเย็น (18:00–24:00)'  },
  ],
};

const FILTER_DEFAULTS = {
  serviceType: 'all',
  cause: 'all',
  therapist: 'all',
  visitType: 'all',
  dateValue: { quick: 'today' },
  time: 'all',
};
const DATE_CHIP_LABELS = { today: 'วันนี้', yesterday: 'เมื่อวาน' };

const renderQueue = (row) => (
  <ColorfulBadge style='teal' size='small' hierarchy='secondary'>{row.queue}</ColorfulBadge>
);

const renderName = (row) => (
  <MaskedWorklistName
    name={row.name}
    recordKey={row.hn || row.queue}
    linkTo={{ pathname: '/clinic/rehab/record', state: { hn: row.hn, queue: row.queue, name: row.name } }}
  />
);

const renderCause = (row) => {
  const c = resolveRehabCause(row.cause);
  return c
    ? <ColorfulBadge style={c.badge} size='small' hierarchy='secondary'>{c.short}</ColorfulBadge>
    : <span>—</span>;
};

/* กลุ่ม IMC + golden period — IMC ที่เหลือน้อยกว่า 30 วันขึ้นสีเตือน
   (สปสช. ให้สิทธิฟื้นฟูเข้มข้นภายใน 6 เดือนนับจากวันเกิดโรค). */
const renderServiceType = (row) => {
  if (row.serviceType !== 'imc') {
    return <ColorfulBadge style='grey' size='small' hierarchy='secondary'>ทั่วไป</ColorfulBadge>;
  }
  const reg = getRehabRegistrationByHn(row.hn);
  const golden = imcGoldenPeriod(reg?.onsetDate);
  const tone = !golden ? 'blue' : golden.expired ? 'red' : golden.daysLeft <= 30 ? 'orange' : 'blue';
  const suffix = !golden
    ? ''
    : golden.expired
      ? ' · พ้นกรอบ 6 เดือน'
      : ` · เหลือ ${golden.daysLeft} วัน`;
  return (
    <ColorfulBadge style={tone} size='small' hierarchy='secondary'>
      {`IMC${suffix}`}
    </ColorfulBadge>
  );
};

const renderCourse = (row) => (
  <span className='flex flex-col' style={{ gap: 'var(--dim-space-050)' }}>
    <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-default)' }}>
      {row.courseNo || '—'}
    </span>
    <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
      {row.visitNo ? `ครั้งที่ ${row.visitNo}${row.courseTotal ? ` / ${row.courseTotal}` : ''}` : 'ยังไม่เริ่ม Course'}
    </span>
  </span>
);

const renderTelemedicine = (row) => (
  row.telemedicine
    ? <TelemedicineQueueBadge appointmentAt={row.telemedAppointmentAt} visitId={row.hn} />
    : null
);

/* Search suggestion carries the TOR 1.10.10.1 identity set (เพศ อายุ
   บัตรประชาชน สิทธิ) in its sublabel so the therapist can confirm the right
   person before opening the record. */
const queueRowToSearchItem = (row) => {
  const profile = getPatientByHN(row.hn);
  const identity = profile
    ? [profile.sex, profile.age, profile.nationalId, profile.insurance].filter(Boolean).join(' · ')
    : row.therapist;
  return {
    id: row.hn,
    label: row.name,
    sublabel: identity,
    value: row.name,
    badges: [
      { label: row.queue || 'นัดหมาย', tone: 'teal' },
      { label: row.hn, tone: 'indigo' },
    ],
    avatarSrc: profile?.avatarUrl,
  };
};

const RehabQueuePage = () => {
  const history = useHistory();
  const [activeTab, setActiveTab] = useState('all');
  const [searchQ, setSearchQ] = useState('');
  const [page, setPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [filters, setFilters] = useState(FILTER_DEFAULTS);
  /* Bumped after check-in — sessionStorage writes are synchronous but not
     React state, so nothing else re-derives the rows (ANC contract). */
  const [tick, setTick] = useState(0);

  const {
    history: searchHistory,
    push: pushHistory,
    clear: clearHistory,
  } = useSearchHistory(SEARCH_HISTORY_KEY, { seedIfEmpty: [] });

  const setFilter = (key) => (val) => setFilters((f) => ({ ...f, [key]: val }));
  const isAllDefault =
    filters.serviceType === FILTER_DEFAULTS.serviceType
    && filters.cause === FILTER_DEFAULTS.cause
    && filters.therapist === FILTER_DEFAULTS.therapist
    && filters.visitType === FILTER_DEFAULTS.visitType
    && filters.dateValue.quick === FILTER_DEFAULTS.dateValue.quick
    && filters.time === FILTER_DEFAULTS.time;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const rows = useMemo(() => getRehabQueueRows(), [tick]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const scheduledNotArrived = useMemo(() => getRehabScheduledNotArrived(), [tick]);
  const tabs = useMemo(() => buildTabs(rows, scheduledNotArrived.length), [rows, scheduledNotArrived]);

  /* A follow-up booked from the record lands in "นัดแล้วยังไม่มาติดต่อ" as
     soon as the /appointment store notifies — closes the
     จอง → มาถึง → ส่งตรวจ loop without leaving the module. */
  useEffect(() => subscribeExtraAppointments(() => setTick((t) => t + 1)), []);

  const handleCheckIn = (hn) => {
    checkInRehabAppointment(hn);
    setTick((t) => t + 1);
    setActiveTab('waiting');
  };

  const summaryCards = useMemo(() => ([
    { key: 'total',   label: 'คิวฟื้นฟูวันนี้',        value: rows.length,                                            color: 'info',        icon: 'accessibility_new' },
    { key: 'imc',     label: 'Intermediate Care (IMC)', value: rows.filter((p) => p.serviceType === 'imc').length,      color: 'brand',       icon: 'health_and_safety' },
    { key: 'waiting', label: 'รอทำกายภาพ',            value: rows.filter((p) => p.statusKey === 'waiting').length,    color: 'inprogress',  icon: 'schedule' },
    { key: 'telemed', label: 'ปรึกษาทางไกล',           value: rows.filter((p) => p.telemedicine).length,               color: 'positive',    icon: 'videocam' },
    { key: 'rights',  label: 'สิทธิต้องตรวจสอบ',        value: rows.filter((p) => p.rightsExpired).length,              color: 'destructive', icon: 'shield_question' },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ]), [rows]);

  const filtered = useMemo(() => {
    if (activeTab === 'scheduled') return [];
    let result = rows;
    const tabPred = TAB_STATUS_FILTER[activeTab];
    if (tabPred) result = result.filter(tabPred);
    if (filters.serviceType !== 'all') result = result.filter((r) => r.serviceType === filters.serviceType);
    if (filters.cause !== 'all') result = result.filter((r) => r.cause === filters.cause);
    if (filters.therapist !== 'all') result = result.filter((r) => r.therapist === filters.therapist);
    if (filters.visitType !== 'all') result = result.filter((r) => r.visitType === filters.visitType);
    /* date / time เป็นตัวกรองเชิงแสดงผล — แถวคิวยังไม่มี field วันที่ตรวจ
       (เหมือน OPD / ANC / NCD queue) */
    if (searchQ.trim()) {
      const q = searchQ.trim().toLowerCase();
      result = result.filter((row) =>
        [row.queue, row.hn, row.name, row.therapist, row.courseNo].some((f) => f && f.toLowerCase().includes(q)),
      );
    }
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, filters, searchQ, tick]);

  const sortedRows = useMemo(() => {
    const sign = sortConfig.direction === 'desc' ? -1 : 1;
    const arrivalCompare = (a, b) => String(a.queue).localeCompare(String(b.queue));
    if (!sortConfig.key) return [...filtered].sort(arrivalCompare);

    const NUMERIC_KEYS = ['status', 'cause', 'wait', 'course'];
    const normalize = (row, key) => {
      switch (key) {
        case 'status':  return STATUS_SORT_ORDER[row.statusKey] ?? 99;
        case 'cause':   return CAUSE_SORT_ORDER[row.cause] ?? 99;
        case 'wait':    return row.waitMinutes ?? 0;
        case 'course':  return row.visitNo ?? 0;
        case 'service': return row.serviceType === 'imc' ? 0 : 1;
        default:        return row[key] ?? '';
      }
    };
    const collator = new Intl.Collator('th', { numeric: true, sensitivity: 'base' });
    return [...filtered].sort((a, b) => {
      const av = normalize(a, sortConfig.key);
      const bv = normalize(b, sortConfig.key);
      const primary = NUMERIC_KEYS.includes(sortConfig.key)
        ? Number(av) - Number(bv)
        : collator.compare(String(av), String(bv));
      if (primary !== 0) return sign * primary;
      return arrivalCompare(a, b);
    });
  }, [filtered, sortConfig]);

  const handleSort = (key) => {
    setSortConfig((prev) => (prev.key === key
      ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
      : { key, direction: 'asc' }));
  };

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / PAGE_SIZE));
  const pageRows = sortedRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const rangeStart = sortedRows.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, sortedRows.length);

  /* Snap page back into range when filtering shrinks the result. */
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const handleTabChange = (key) => {
    setActiveTab(key);
    setPage(1);
  };

  /* Changing any filter resets paging — otherwise page 3 of a 2-page result
     renders an empty table before the snap-back effect runs. */
  const changeFilter = (key) => (val) => {
    setFilter(key)(val);
    setPage(1);
  };

  const handleRowClick = (row) => history.push({
    pathname: '/clinic/rehab/record',
    state: { hn: row.hn, queue: row.queue, name: row.name },
  });

  const resolveSearchRow = (query, item) => {
    if (item?.id) {
      const byId = rows.find((row) => row.hn === item.id);
      if (byId) return byId;
    }
    const q = (query ?? item?.value ?? item?.label ?? '').toString().trim().toLowerCase();
    if (!q) return null;
    return rows.find((row) =>
      [row.queue, row.hn, row.name, row.therapist, row.courseNo].some((f) => f && f.toLowerCase().includes(q)),
    ) ?? null;
  };

  const searchSuggestions = useMemo(() => {
    const q = searchQ.trim().toLowerCase();
    if (!q) return [];
    const matches = [];
    const seen = new Set();
    for (const row of rows) {
      if (matches.length >= 8) break;
      if (seen.has(row.hn)) continue;
      if ([row.queue, row.hn, row.name, row.therapist, row.courseNo].some((f) => f && f.toLowerCase().includes(q))) {
        seen.add(row.hn);
        matches.push(queueRowToSearchItem(row));
      }
    }
    return matches;
  }, [searchQ, rows]);

  const searchAvatars = useMemo(() => {
    const result = [];
    const seenHn = new Set();
    for (const entry of searchHistory) {
      if (result.length >= 3) break;
      const q = (typeof entry === 'string' ? entry : (entry?.value ?? entry?.label ?? '')).toString().trim().toLowerCase();
      const match = entry?.id
        ? rows.find((row) => row.hn === entry.id)
        : rows.find((row) => [row.queue, row.hn, row.name, row.therapist].some((f) => f && f.toLowerCase().includes(q)));
      if (!match || seenHn.has(match.hn)) continue;
      const src = getPatientByHN(match.hn)?.avatarUrl;
      if (!src) continue;
      seenHn.add(match.hn);
      result.push({ src });
    }
    return result;
  }, [searchHistory, rows]);

  /* Cancelled-registry rows stay visible with a red flag NEXT TO the visit
     status (not replacing it) — front-desk staff can still see where the
     patient is in today's flow while the registration state is obvious. */
  const renderStatus = (row) => {
    const cancellation = getRehabCancellation(row.hn);
    const badge = STATUS_BADGE[row.statusKey] || STATUS_BADGE.waiting;
    return (
      <span className='inline-flex items-center flex-wrap' style={{ gap: 'var(--dim-space-100)' }}>
        <ColorfulBadge style={badge.style} size='small' hierarchy='secondary'>{badge.label}</ColorfulBadge>
        {cancellation && (
          <ColorfulBadge style='red' size='small' hierarchy='secondary'>ยกเลิกทะเบียนแล้ว</ColorfulBadge>
        )}
        {row.rightsExpired && (
          <ColorfulBadge style='yellow' size='small' hierarchy='secondary'>ตรวจสอบสิทธิ</ColorfulBadge>
        )}
      </span>
    );
  };

  const renderActions = (row) => (
    <NeutralSubdueButton
      size='sm'
      leadingIcon='monitoring'
      onClick={(e) => {
        e.stopPropagation();
        history.push({ pathname: '/clinic/rehab/followup', state: { hn: row.hn } });
      }}
    >
      การติดตาม
    </NeutralSubdueButton>
  );

  const columns = useMemo(() => ([
    { key: 'queue',   label: 'คิว', render: renderQueue },
    { key: 'hn',      label: 'HN' },
    { key: 'name',    label: 'ชื่อ-นามสกุล', flex: true, minWidth: 160, render: renderName },
    { key: 'rights',  label: 'สิทธิการรักษา', render: (r) => getPatientByHN(r.hn)?.insurance || '—' },
    { key: 'cause',   label: 'สาเหตุหลัก (Dx)', render: renderCause },
    { key: 'service', label: 'กลุ่มผู้รับบริการ', render: renderServiceType },
    { key: 'course',  label: 'Course / ครั้งที่', render: renderCourse },
    { key: 'telemed', label: 'Telemedicine', align: 'center', sortable: false, render: renderTelemedicine },
    { key: 'room',    label: 'ห้อง' },
    { key: 'therapist', label: 'นักกายภาพ / แพทย์ฟื้นฟู', flex: true, minWidth: 160 },
    { key: 'wait',    label: 'รอนาน', render: (r) => (r.waitMinutes ? `${r.waitMinutes} นาที` : '—') },
    { key: 'status',  label: 'สถานะ', render: renderStatus },
    { key: 'actions', label: 'การดำเนินการ', sortable: false, render: renderActions },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ]), [tick]);

  /* "นัดแล้วยังไม่มาติดต่อ" — different row shape (เวลานัด แทน queue/wait/
     status) + a ส่งตรวจ check-in action (ANC contract). */
  const scheduledColumns = useMemo(() => ([
    { key: 'appointmentTime', label: 'เวลานัด' },
    { key: 'hn',              label: 'HN' },
    { key: 'name',            label: 'ชื่อ-นามสกุล', flex: true, minWidth: 160 },
    { key: 'cause',           label: 'สาเหตุหลัก (Dx)', render: renderCause },
    { key: 'service',         label: 'กลุ่มผู้รับบริการ', render: renderServiceType },
    { key: 'course',          label: 'Course / ครั้งที่', render: renderCourse },
    { key: 'clinic',          label: 'ห้อง' },
    { key: 'therapist',       label: 'นักกายภาพ / แพทย์ฟื้นฟู', flex: true, minWidth: 160 },
    {
      key: 'source', label: 'ที่มาของนัด', sortable: false,
      render: (row) => (row.fromRecord
        ? <ColorfulBadge style='teal' size='small' hierarchy='secondary'>นัดจากบันทึกการฟื้นฟู</ColorfulBadge>
        : <ColorfulBadge style='grey' size='small' hierarchy='secondary'>นัดล่วงหน้า</ColorfulBadge>),
    },
    {
      key: 'checkin', label: 'การดำเนินการ', sortable: false,
      render: (row) => (
        <BrandSubdueButton variant='fill' size='sm' leadingIcon='login' onClick={(e) => { e.stopPropagation(); handleCheckIn(row.hn); }}>
          ส่งตรวจ
        </BrandSubdueButton>
      ),
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ]), []);

  /* Empty states differ by cause — a filtered-out result needs a
     ล้างตัวกรอง escape hatch, an untouched empty tab does not (Nielsen #9:
     help users recognise + recover). */
  const filtersOrSearchActive = !isAllDefault || searchQ.trim() !== '';
  const emptyMessage = filtersOrSearchActive
    ? 'ไม่พบรายการที่ตรงกับคำค้นหาหรือตัวกรองที่เลือก'
    : 'วันนี้ยังไม่มีคิวในกลุ่มนี้';

  return (
    <QueuePageShell
      activeKey='treat'
      breadcrumb={breadcrumb}
      title='งานเวชศาสตร์ฟื้นฟูและกายภาพบำบัด'
      actions={
        /* Cross-nav to the module's sibling pages — the registry and the
           per-patient follow-up live on their own routes, so the worklist
           must surface them (Trunk Test: "what are my options here?"). */
        <div className='flex items-center' style={{ gap: 'var(--dim-space-200)' }}>
          <NeutralSubdueButton leadingIcon='contract' onClick={() => history.push('/clinic/rehab/registry')}>
            ทะเบียนฟื้นฟู / IMC
          </NeutralSubdueButton>
          <NeutralSubdueButton leadingIcon='monitoring' onClick={() => history.push('/clinic/rehab/followup')}>
            การติดตามการฟื้นฟู
          </NeutralSubdueButton>
        </div>
      }
      summaryTitle={SUMMARY_TITLE}
      summaryCards={summaryCards}
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={handleTabChange}
    >
      <div className='flex flex-col flex-1 min-w-0' style={{ padding: 'var(--dim-space-600)', gap: 'var(--dim-space-600)' }}>
        <div
          className='w-full flex flex-col'
          style={{
            background: 'var(--surface-card-100)',
            borderRadius: 'var(--dim-radius-500)',
            border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
            boxShadow: 'var(--shadow-card-strong)',
            padding: 'var(--dim-space-600)',
            gap: 'var(--dim-space-600)',
          }}
        >
          <div className='w-full flex items-start justify-center'>
            <PrimarySearch
              value={searchQ}
              onChange={(v) => { setSearchQ(v); setPage(1); }}
              onSubmit={(label, item) => {
                setSearchQ(label);
                const match = resolveSearchRow(label, item);
                pushHistory(match ? queueRowToSearchItem(match) : (item ?? label));
                if (match) handleRowClick(match);
              }}
              suggestions={searchSuggestions}
              history={searchHistory}
              onHistoryClear={searchHistory.length > 0 ? clearHistory : undefined}
              placeholder='ค้นหาคิว / HN / ชื่อ-สกุล / เลขที่ Course / ชื่อนักกายภาพ'
              width={640}
              avatars={searchAvatars}
            />
          </div>

          <div className='flex items-start w-full' style={{ gap: 'var(--dim-space-300)' }}>
            <OverflowFlexRow itemGap='var(--dim-space-200)' moreAriaLabel='แสดงตัวกรองที่ซ่อน'>
              <FilterTag value='ทั้งหมด' selected={isAllDefault} onClick={() => { setFilters(FILTER_DEFAULTS); setPage(1); }} />
              <FilterDropdown prefix='ประเภท:' options={FILTER_OPTIONS.serviceType} value={filters.serviceType} onChange={changeFilter('serviceType')} />
              <FilterDropdown prefix='สาเหตุ:' options={FILTER_OPTIONS.cause} value={filters.cause} onChange={changeFilter('cause')} />
              <FilterDropdown prefix='ผู้รักษา:' options={FILTER_OPTIONS.therapist} value={filters.therapist} onChange={changeFilter('therapist')} />
              <FilterDropdown prefix='ประเภทนัด:' options={FILTER_OPTIONS.visitType} value={filters.visitType} onChange={changeFilter('visitType')} />
              <FilterDateTag
                prefix='วัน:'
                value={filters.dateValue}
                onChange={changeFilter('dateValue')}
                defaultQuick={FILTER_DEFAULTS.dateValue.quick}
                quickLabels={DATE_CHIP_LABELS}
              />
              <FilterDropdown prefix='เวลา:' options={FILTER_OPTIONS.time} value={filters.time} onChange={changeFilter('time')} />
            </OverflowFlexRow>
          </div>

          {activeTab === 'scheduled' ? (
            <Table
              columns={scheduledColumns}
              rows={scheduledNotArrived}
              rowKey={(row) => row.hn}
              stickyHeaderTop={QUEUE_STICKY_UNDER_TABS}
              emptyMessage='ไม่มีนัดหมายที่ยังไม่มาติดต่อวันนี้'
            />
          ) : (
            <>
              <SearchResultCount found={sortedRows.length} total={rows.length} />
              <Table
                columns={columns}
                rows={pageRows}
                rowKey={(row) => row.hn}
                sortConfig={sortConfig}
                onSort={handleSort}
                onRowClick={handleRowClick}
                stickyColCount={3}
                stickyHeaderTop={QUEUE_STICKY_UNDER_TABS}
                emptyMessage={emptyMessage}
              />

              {sortedRows.length === 0 && filtersOrSearchActive && (
                <div className='flex items-center justify-center w-full' style={{ gap: 'var(--dim-space-200)' }}>
                  <NeutralSubdueButton
                    size='sm'
                    leadingIcon='filter_alt_off'
                    onClick={() => { setFilters(FILTER_DEFAULTS); setSearchQ(''); setPage(1); }}
                  >
                    ล้างตัวกรองและคำค้นหา
                  </NeutralSubdueButton>
                </div>
              )}

              <div
                className='flex items-center w-full'
                style={{
                  gap: 'var(--dim-space-200)',
                  position: 'sticky',
                  bottom: 'var(--dim-space-0)',
                  zIndex: 50,
                  background: 'var(--surface-card-100)',
                  paddingTop: 'var(--dim-space-200)',
                  borderTop: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
                }}
              >
                <span style={{ color: 'var(--text-content-secondary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)' }}>
                  {`แสดง ${rangeStart}–${rangeEnd} จาก ${sortedRows.length} รายการ`}
                </span>
                <div className='flex-1' />
                <Pagination currentPage={page} pageCount={totalPages} onPageChange={setPage} />
              </div>
            </>
          )}
        </div>
      </div>
    </QueuePageShell>
  );
};

export default RehabQueuePage;
