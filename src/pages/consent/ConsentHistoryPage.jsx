import React, { useEffect, useMemo, useState } from 'react';
import { useHistory, useLocation, useParams } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import Icon from '@/components/icons/Icon';
import PrimarySearch from '@/components/search/PrimarySearch';
import useSearchHistory from '@/components/search/useSearchHistory';
import FilterTag from '@/components/forms/FilterTag';
import FilterDateTag from '@/components/forms/FilterDateTag';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import { computeQuickRange, computeQuickSingle } from '@/components/popup/DateFilterPopup';
import QueuePatientAvatar from '@/components/patient/QueuePatientAvatar';
import PatientSummaryCard from '@/components/card/PatientSummaryCard';
import LottieIllustration from '@/components/illustrations/LottieIllustration';
import emptyHistoryAnim from '@/assets/illustrations/disease-history.json';
import ConsentSignedFormViewPopup from '@/pages/consent/ConsentSignedFormViewPopup';
import { CONSENT_TYPE_TONE, CONSENT_STATUS } from '@/data/consentRecords';
import { getConsentRecords, subscribeConsentStore } from '@/data/consentWorkflowStore';
import {
  buildPatientConsentTimeline,
  searchConsentPatients,
  CONSENT_HISTORY_ACTIONS,
} from '@/data/consentPatientHistory';
import { resolveConsentPatient, resolveConsentPatientCard } from '@/data/consentPatientDisplay';
import {
  CONSENT_PATIENT_SEARCH_POOL,
  consentPatientSearchHistorySeed,
  consentPatientSearchSuggestions,
  filterConsentPatientSearch,
  toConsentPatientSearchItem,
} from '@/data/consentPatientSearch';
import CONSENT_NAV from '@/pages/consent/consentNav';

/* PHCIS | Consent — ประวัติความยินยอมรายบุคคล (Timeline · new tab).
   /consent/history          → ค้นหาชื่อ / HN แล้วเลือกผู้ป่วย
   /consent/history/:hn      → Timeline รวมทุกเหตุการณ์ของ HN นั้น
   Timeline: การ์ดรายเหตุการณ์ · จัดกลุ่มรายเดือน (เดือนล่าสุดบนสุด) · FilterTag */

const breadcrumbSearch = ['จัดการความยินยอม', 'ประวัติความยินยอม'];
const breadcrumbTimeline = ['จัดการความยินยอม', 'Timeline การเปลี่ยนแปลงความยินยอม'];

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

const BODY_TEXT = {
  color: 'var(--text-content-secondary)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm)',
  lineHeight: 1.6,
};
const TITLE_TEXT = {
  color: 'var(--text-brandPrimary-default)',
  fontFamily: 'var(--type-family-heading-graphic2)',
  fontSize: 'var(--type-size-base)',
  fontWeight: 'var(--type-weight-regular, 400)',
  lineHeight: 1.4,
};
const MUTED_XS = { ...BODY_TEXT, color: 'var(--text-content-tertiary)', fontSize: 'var(--type-size-xs)' };
const MONTH_HEADING = {
  color: 'var(--text-content-default)',
  fontFamily: 'var(--type-family-heading-content)',
  fontSize: 'var(--type-size-sm)',
  fontWeight: 'var(--type-weight-bold)',
  lineHeight: 1.5,
};

const CARD_STYLE = {
  background: 'var(--surface-card-100)',
  borderRadius: 'var(--dim-radius-500)',
  border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
  boxShadow: 'var(--shadow-card)',
  padding: 'var(--dim-space-600)',
};

const EVENT_CARD_STYLE = {
  background: 'var(--surface-card-100)',
  borderRadius: 'var(--dim-radius-400)',
  border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
  boxShadow: 'var(--shadow-card)',
  padding: 'var(--dim-space-400)',
};

const ACTION_BADGE_TONE = {
  green: 'green',
  red: 'red',
  yellow: 'yellow',
  blue: 'blue',
};

const ACTION_FILTERS = [
  { key: 'สร้างคำขอ', label: 'สร้างคำขอ' },
  { key: 'ให้ความยินยอม', label: 'ให้ความยินยอม' },
  { key: 'ไม่ให้ความยินยอม', label: 'ไม่ให้ความยินยอม' },
  { key: 'ถอนความยินยอม', label: 'ถอนความยินยอม' },
  { key: 'แก้ไขความยินยอม', label: 'แก้ไขความยินยอม' },
  { key: 'มีเวอร์ชันใหม่', label: 'มีเวอร์ชันใหม่' },
];

/** แปลง "4 มีนาคม 2569 · 11:20" → { monthLabel, sortKey, instant } */
const parseThaiDateTime = (dateTime) => {
  const raw = String(dateTime || '').trim();
  const monthIdx = THAI_MONTHS.findIndex((m) => raw.includes(m));
  const yearMatch = raw.match(/(25\d{2}|20\d{2})/);
  const dayMatch = raw.match(/^(\d{1,2})\s/);
  const timeMatch = raw.match(/(\d{1,2}:\d{2})/);
  const year = yearMatch ? Number(yearMatch[1]) : 0;
  const month = monthIdx >= 0 ? monthIdx : 0;
  const day = dayMatch ? Number(dayMatch[1]) : 0;
  const [hh = 0, mm = 0] = (timeMatch?.[1] || '0:0').split(':').map(Number);
  const buddhistYear = year >= 2400 ? year : year > 0 ? year + 543 : 0;
  const monthLabel = monthIdx >= 0 && buddhistYear
    ? `${THAI_MONTHS[monthIdx]} ${buddhistYear}`
    : 'ไม่ระบุเดือน';
  const sortKey = buddhistYear * 100 + month;
  const instant = buddhistYear * 1e10 + month * 1e8 + day * 1e6 + hh * 100 + mm;
  return { monthLabel, sortKey, instant };
};

/** Thai display date → local calendar Date at start of day (for FilterDateTag). */
const toEventCalendarDate = (dateTime) => {
  const raw = String(dateTime || '').trim();
  const monthIdx = THAI_MONTHS.findIndex((m) => raw.includes(m));
  const yearMatch = raw.match(/(25\d{2}|20\d{2})/);
  const dayMatch = raw.match(/^(\d{1,2})\s/);
  if (monthIdx < 0 || !yearMatch || !dayMatch) return null;
  let year = Number(yearMatch[1]);
  if (year >= 2400) year -= 543;
  const d = new Date(year, monthIdx, Number(dayMatch[1]));
  d.setHours(0, 0, 0, 0);
  return Number.isNaN(d.getTime()) ? null : d;
};

const resolveDateFilterRange = (value) => {
  if (!value?.quick) return null;
  if (value.quick === 'custom') {
    if (value.tab === 'single' && value.single) return { start: value.single, end: value.single };
    if (value.tab === 'range' && value.range?.start && value.range?.end) return value.range;
    return null;
  }
  const single = computeQuickSingle(value.quick);
  if (single) return { start: single, end: single };
  return computeQuickRange(value.quick);
};

const matchesDateFilter = (dateTime, value) => {
  const range = resolveDateFilterRange(value);
  if (!range?.start || !range?.end) return true;
  const d = toEventCalendarDate(dateTime);
  if (!d) return false;
  const start = new Date(range.start);
  start.setHours(0, 0, 0, 0);
  const end = new Date(range.end);
  end.setHours(23, 59, 59, 999);
  return d >= start && d <= end;
};

const groupEventsByMonth = (events) => {
  const map = new Map();
  events.forEach((ev) => {
    const meta = parseThaiDateTime(ev.dateTime);
    const enriched = { ...ev, _monthLabel: meta.monthLabel, _monthSort: meta.sortKey, _instant: meta.instant };
    if (!map.has(meta.monthLabel)) {
      map.set(meta.monthLabel, { label: meta.monthLabel, sortKey: meta.sortKey, events: [] });
    }
    map.get(meta.monthLabel).events.push(enriched);
  });
  const groups = [...map.values()];
  groups.forEach((g) => {
    g.events.sort((a, b) => b._instant - a._instant);
  });
  groups.sort((a, b) => b.sortKey - a.sortKey);
  return groups;
};

const eventIconBg = (tone) => {
  if (tone === 'green') return 'var(--surface-statussummarycard-positive, #D1F6EE)';
  if (tone === 'red') return 'var(--surface-statussummarycard-destructive, #FEE2E2)';
  if (tone === 'yellow') return 'var(--surface-statussummarycard-inprogress, #FFEDD5)';
  return 'var(--surface-statussummarycard-info, #DBEAFE)';
};

const eventIconFg = (tone) => {
  if (tone === 'green') return 'var(--text-statussummarycard-positive-number, #196C65)';
  if (tone === 'red') return 'var(--text-statussummarycard-destructive-number, #B91C1C)';
  if (tone === 'yellow') return 'var(--text-statussummarycard-inprogress-number, #C2410C)';
  return 'var(--text-statussummarycard-info-number, #1D4ED8)';
};

function TimelineEventCard({ ev, showConnector, onOpen }) {
  const meta = CONSENT_HISTORY_ACTIONS[ev.action] || { tone: 'grey', icon: 'info' };
  const statusTone = (CONSENT_STATUS[ev.toStatus] || {}).tone || ACTION_BADGE_TONE[meta.tone] || 'grey';
  const canView = Boolean(onOpen);
  return (
    <>
      <div className='flex flex-col items-center h-full' style={{ width: 24 }}>
        <span
          aria-hidden
          className='inline-flex items-center justify-center'
          style={{
            width: 22,
            height: 22,
            borderRadius: 'var(--dim-radius-full)',
            background: eventIconBg(meta.tone),
            color: eventIconFg(meta.tone),
            flexShrink: 0,
          }}
        >
          <Icon name={meta.icon} size={14} />
        </span>
        {showConnector && (
          <span
            aria-hidden
            style={{
              width: 'var(--dim-stroke-100)',
              flex: 1,
              minHeight: 'var(--dim-space-400)',
              background: 'var(--border-neutral-tertiary)',
            }}
          />
        )}
      </div>
      <div
        className='flex flex-col min-w-0 text-left'
        style={{
          ...EVENT_CARD_STYLE,
          gap: 'var(--dim-space-150)',
          marginBottom: showConnector ? 'var(--dim-space-300)' : 0,
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        <div className='flex items-center flex-wrap min-w-0' style={{ gap: 'var(--dim-space-150)' }}>
          <ColorfulBadge style={ACTION_BADGE_TONE[meta.tone] || 'grey'} size='small' hierarchy='secondary' width='hug'>
            {ev.action}
          </ColorfulBadge>
          <ColorfulBadge style='grey' size='small' hierarchy='secondary' width='hug'>{ev.formCode}</ColorfulBadge>
          <ColorfulBadge style={CONSENT_TYPE_TONE[ev.type] || 'grey'} size='small' hierarchy='secondary' width='hug'>
            {ev.type}
          </ColorfulBadge>
          <ColorfulBadge style='blue' size='small' hierarchy='secondary' width='hug'>{ev.version}</ColorfulBadge>
          <ColorfulBadge style={statusTone} size='small' hierarchy='secondary' width='hug'>{ev.toStatus}</ColorfulBadge>
        </div>
        <span style={{ ...BODY_TEXT, color: 'var(--text-content-default)', fontWeight: 'var(--type-weight-medium)' }}>
          {ev.formName}
        </span>
        <span style={BODY_TEXT}>การเปลี่ยนแปลง: {ev.changeDetail}</span>
        <span style={MUTED_XS}>ช่องทาง: {ev.channel}</span>
        <span style={MUTED_XS}>วันเวลา: {ev.dateTime}</span>
        {canView && (
          <div style={{ paddingTop: 'var(--dim-space-100)' }}>
            <BrandSubdueButton
              variant='outline'
              size='sm'
              leadingIcon='visibility'
              onClick={() => onOpen(ev)}
            >
              ดูแบบฟอร์มความยินยอม
            </BrandSubdueButton>
          </div>
        )}
      </div>
    </>
  );
}

function ConsentHistorySearch({ records, onSelectHn, embedded = false }) {
  const navigate = useHistory();
  const location = useLocation();
  const [search, setSearch] = useState('');
  const { history: searchHistory, push: pushHistory, clear: clearHistory } =
    useSearchHistory('mih:primarysearch-history:consent-history', {
      seedIfEmpty: consentPatientSearchHistorySeed(4),
    });

  const results = useMemo(
    () => searchConsentPatients(search, records),
    [search, records],
  );

  const searchSuggestions = useMemo(
    () => consentPatientSearchSuggestions(search),
    [search],
  );

  const goToTimeline = (hn) => {
    if (!hn) return;
    if (typeof onSelectHn === 'function') {
      onSelectHn(hn);
      return;
    }
    navigate.push({
      pathname: `/consent/history/${encodeURIComponent(hn)}`,
      search: location.search,
    });
  };

  const handleSubmit = (value, item) => {
    const q = (item?.value || item?.label || value || '').trim();
    if (!q) return;

    /* Resolve HN: suggestion/history id → pool match → first search hit */
    const hn = item?.id
      || filterConsentPatientSearch(q)[0]?.hn
      || searchConsentPatients(q, records)[0]?.hn
      || null;

    const pool = hn
      ? CONSENT_PATIENT_SEARCH_POOL.find((p) => p.hn === hn)
      : null;
    pushHistory(pool ? toConsentPatientSearchItem(pool) : (item || { label: q, value: q }));

    if (hn) {
      goToTimeline(hn);
      return;
    }
    setSearch(q);
  };

  return (
    <div
      className='flex flex-col flex-1 min-w-0'
      style={{
        padding: embedded ? 0 : 'var(--dim-space-600)',
        gap: 'var(--dim-space-400)',
      }}
    >
      <section className='w-full flex flex-col' style={{ ...CARD_STYLE, gap: 'var(--dim-space-600)' }}>
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-150)' }}>
          <h2 style={TITLE_TEXT}>ค้นหาประวัติความยินยอม</h2>
        </div>

        <div className='w-full flex flex-col items-center' style={{ gap: 'var(--dim-space-400)' }}>
          <div className='flex flex-col items-center' style={{ gap: 'var(--dim-space-200)' }}>
            <LottieIllustration animationData={emptyHistoryAnim} size={160} />
            <span style={{ ...TITLE_TEXT, textAlign: 'center' }}>พิมพ์ชื่อหรือ HN เพื่อค้นหา</span>
          </div>
          <PrimarySearch
            value={search}
            onChange={setSearch}
            onSubmit={handleSubmit}
            placeholder='ค้นหา HN / เลขบัตร / Passport / ชื่อ-สกุล / โทรศัพท์'
            width={640}
            suggestions={searchSuggestions}
            history={searchHistory}
            onHistoryClear={searchHistory.length > 0 ? clearHistory : undefined}
          />
        </div>

        {search.trim() && results.length === 0 && (
          <div className='flex flex-col items-center' style={{ gap: 'var(--dim-space-200)', padding: 'var(--dim-space-600)' }}>
            <span style={BODY_TEXT}>ไม่พบผู้รับบริการที่ตรงกับ “{search.trim()}”</span>
          </div>
        )}
        {search.trim() && results.length > 0 && (
          <ul className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200)', listStyle: 'none', margin: 0, padding: 0 }}>
            {results.map((p) => (
              <li key={p.hn}>
                <button
                  type='button'
                  onClick={() => goToTimeline(p.hn)}
                  className='w-full flex items-center text-left'
                  style={{
                    gap: 'var(--dim-space-400)',
                    padding: 'var(--dim-space-400)',
                    borderRadius: 'var(--dim-radius-400)',
                    border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
                    background: 'var(--surface-card-100)',
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                >
                  <QueuePatientAvatar
                    hn={p.hn}
                    name={p.name}
                    avatarUrl={resolveConsentPatient(p.hn, p.name).avatarUrl}
                    size={40}
                  />
                  <div className='flex flex-col min-w-0 flex-1' style={{ gap: 'var(--dim-space-050)' }}>
                    <span style={{ ...BODY_TEXT, color: 'var(--text-content-default)', fontWeight: 'var(--type-weight-medium)' }}>
                      {p.name}
                    </span>
                    <span style={MUTED_XS}>HN {p.hn} · {p.formCount} รายการความยินยอม</span>
                  </div>
                  <Icon name='chevron_right' size={20} color='var(--text-content-tertiary)' />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function ConsentHistoryTimeline({ hn, records, embedded = false }) {
  const [actionFilter, setActionFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState({ quick: 'thisyear' });
  const [viewEvent, setViewEvent] = useState(null);

  const { patient, events } = useMemo(
    () => buildPatientConsentTimeline(hn, records),
    [hn, records],
  );

  const dateFiltered = useMemo(
    () => events.filter((e) => matchesDateFilter(e.dateTime, dateFilter)),
    [events, dateFilter],
  );

  const filtered = useMemo(() => {
    if (actionFilter === 'all') return dateFiltered;
    return dateFiltered.filter((e) => e.action === actionFilter);
  }, [dateFiltered, actionFilter]);

  const monthGroups = useMemo(
    () => groupEventsByMonth(filtered),
    [filtered],
  );

  const actionCounts = useMemo(() => {
    const counts = {};
    ACTION_FILTERS.forEach((f) => {
      counts[f.key] = dateFiltered.filter((e) => e.action === f.key).length;
    });
    return counts;
  }, [dateFiltered]);

  useEffect(() => {
    if (actionFilter === 'all') return;
    if ((actionCounts[actionFilter] ?? 0) === 0) setActionFilter('all');
  }, [actionCounts, actionFilter]);

  if (!patient) {
    return (
      <div
        className='flex flex-col flex-1 min-w-0'
        style={{
          padding: embedded ? 0 : 'var(--dim-space-600)',
          gap: 'var(--dim-space-400)',
        }}
      >
        <section style={CARD_STYLE}>
          <span style={BODY_TEXT}>ไม่พบประวัติความยินยอมของ HN {hn || '—'}</span>
        </section>
      </div>
    );
  }

  return (
    <div
      className='flex flex-col flex-1 min-w-0'
      style={{
        padding: embedded ? 0 : 'var(--dim-space-600)',
        gap: 'var(--dim-space-400)',
      }}
    >
      <section className='w-full flex flex-col' style={{ ...CARD_STYLE, gap: 'var(--dim-space-400)' }}>
        <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
          <FilterDateTag
            prefix='วันที่:'
            value={dateFilter}
            onChange={setDateFilter}
            defaultQuick='thisyear'
          />
          {ACTION_FILTERS.map((f) => {
            const count = actionCounts[f.key] ?? 0;
            if (count === 0) return null;
            return (
              <FilterTag
                key={f.key}
                value={`${f.label} (${count})`}
                selected={actionFilter === f.key}
                onClick={() => setActionFilter((prev) => (prev === f.key ? 'all' : f.key))}
              />
            );
          })}
        </div>

        {filtered.length === 0 ? (
          <span style={BODY_TEXT}>ไม่พบเหตุการณ์ตามตัวกรองที่เลือก</span>
        ) : (
          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-600)' }}>
            {monthGroups.map((group) => (
              <div key={group.label} className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
                <div className='flex items-center' style={{ gap: 'var(--dim-space-200)' }}>
                  <span style={MONTH_HEADING}>{group.label}</span>
                  <span style={MUTED_XS}>{group.events.length} รายการ</span>
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '24px max-content',
                    columnGap: 'var(--dim-space-300)',
                    width: 'max-content',
                    maxWidth: '100%',
                    alignItems: 'stretch',
                  }}
                >
                  {group.events.map((ev, i) => (
                    <TimelineEventCard
                      key={ev.id}
                      ev={ev}
                      showConnector={i < group.events.length - 1}
                      onOpen={setViewEvent}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <ConsentSignedFormViewPopup
        open={!!viewEvent}
        onClose={() => setViewEvent(null)}
        event={viewEvent}
        patientHn={patient.hn || hn}
        patientName={patient.name || ''}
      />
    </div>
  );
}

export { ConsentHistorySearch, ConsentHistoryTimeline };

export default function ConsentHistoryPage() {
  const history = useHistory();
  const location = useLocation();
  const { hn: hnParam } = useParams();
  const hn = hnParam ? decodeURIComponent(hnParam) : '';
  const [records, setRecords] = useState(getConsentRecords);
  useEffect(() => subscribeConsentStore(() => setRecords(getConsentRecords())), []);

  /* PatientSummaryCard in white header band — avatar · ชื่อ · HN only (PHCIS). */
  const timelinePatientCard = useMemo(() => {
    if (!hn) return null;
    const { patient } = buildPatientConsentTimeline(hn, records);
    return patient ? resolveConsentPatientCard(patient.hn, patient.name) : null;
  }, [hn, records]);

  const handleBack = () => {
    const fromRaw = new URLSearchParams(location.search).get('from') || location.state?.from;
    const from = typeof fromRaw === 'string' ? fromRaw.trim() : '';
    /* กลับไปหน้าต้นทางที่เปิดประวัติมา (เช่น worklist /consent) */
    if (from.startsWith('/') && !from.startsWith('//') && !from.startsWith('/consent/history')) {
      history.push(from);
      return;
    }
    if (hn) {
      /* Timeline → หน้าค้นหา (คง ?from= ไว้ให้กลับ worklist ได้ต่อ) */
      history.push({ pathname: '/consent/history', search: location.search });
      return;
    }
    if (history.length > 1) {
      history.goBack();
      return;
    }
    history.push('/consent');
  };

  return (
    <QueuePageShell
      activeKey='consent-manage'
      sidebarItems={CONSENT_NAV}
      sidebarFallbackKey='consent-manage'
      brandTitle='ระบบจัดการความยินยอม'
      breadcrumb={hn ? breadcrumbTimeline : breadcrumbSearch}
      title={hn ? 'Timeline การเปลี่ยนแปลงความยินยอม' : 'ประวัติความยินยอม'}
      onBack={handleBack}
      stickyHeaderInfo={!!timelinePatientCard}
      headerInfo={
        timelinePatientCard ? (
          <PatientSummaryCard
            variant='gradient'
            avatarUrl={timelinePatientCard.avatarUrl}
            avatarAlt={timelinePatientCard.fullName || timelinePatientCard.shortName || ''}
            cells={[
              {
                label: 'ชื่อ-นามสกุล ผู้รับบริการ',
                value: timelinePatientCard.fullName || timelinePatientCard.shortName || '—',
              },
              {
                label: 'HN (Hospital Number)',
                value: timelinePatientCard.hn || '—',
              },
            ]}
          />
        ) : undefined
      }
    >
      {hn
        ? <ConsentHistoryTimeline hn={hn} records={records} />
        : <ConsentHistorySearch records={records} />}
    </QueuePageShell>
  );
}
