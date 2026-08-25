import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useHistory, useLocation, useParams } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import Icon from '@/components/icons/Icon';
import PrimarySearch from '@/components/search/PrimarySearch';
import SearchResultCount from '@/components/search/SearchResultCount';
import useSearchHistory from '@/components/search/useSearchHistory';
import FilterTag from '@/components/forms/FilterTag';
import ClearFiltersTag, { SmoothFilterResults } from '@/components/forms/ClearFiltersTag';
import useSmoothClearFilters from '@/hooks/useSmoothClearFilters';
import FilterDateTag from '@/components/forms/FilterDateTag';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import { computeQuickRange, computeQuickSingle } from '@/components/popup/DateFilterPopup';
import QueuePatientAvatar from '@/components/patient/QueuePatientAvatar';
import PatientSummaryCard from '@/components/card/PatientSummaryCard';
import LottieIllustration from '@/components/illustrations/LottieIllustration';
import emptyHistoryAnim from '@/assets/illustrations/disease-history.json';
import ConsentSignedFormViewPopup from '@/pages/consent/ConsentSignedFormViewPopup';
import GroupedTimelineScrollFeed from '@/components/timeline/GroupedTimelineScrollFeed';
import {
  THAI_TIMELINE_MONTHS,
  groupTimelineEventsByMonth,
} from '@/components/timeline/groupTimelineByMonth';
import { CONSENT_TYPE_TONE } from '@/data/consentRecords';
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
  fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
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

const ACTION_FILTERS = [
  { key: 'สร้างคำขอ', label: 'สร้างคำขอ' },
  { key: 'ให้ความยินยอม', label: 'ให้ความยินยอม' },
  { key: 'ไม่ให้ความยินยอม', label: 'ไม่ให้ความยินยอม' },
  { key: 'ถอนความยินยอม', label: 'ถอนความยินยอม' },
  { key: 'แก้ไขความยินยอม', label: 'แก้ไขความยินยอม' },
  { key: 'มีเวอร์ชันใหม่', label: 'มีเวอร์ชันใหม่' },
];

/** Thai display date → local calendar Date at start of day (for FilterDateTag). */
const toEventCalendarDate = (dateTime) => {
  const raw = String(dateTime || '').trim();
  const monthIdx = THAI_TIMELINE_MONTHS.findIndex((m) => raw.includes(m));
  const yearMatch = raw.match(/(25\d{2}|20\d{2})/);
  const dayMatch = raw.match(/^(\d{1,2})\s/);
  if (monthIdx < 0 || !yearMatch || !dayMatch) return null;
  let year = Number(yearMatch[1]);
  if (year >= 2400) year -= 543;
  const d = new Date(year, monthIdx, Number(dayMatch[1]));
  d.setHours(0, 0, 0, 0);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** แสดงเฉพาะเวลาในการ์ด timeline — ดึงจาก "· HH:MM" หรือ derive จาก record id */
const formatTimelineEventTime = (dateTime, recordId = 0) => {
  const raw = String(dateTime || '').trim();
  const afterSep = raw.split('·').map((s) => s.trim())[1];
  if (afterSep && /^\d{1,2}:\d{2}$/.test(afterSep)) return afterSep;
  const inline = raw.match(/(\d{1,2}:\d{2})/);
  if (inline) return inline[1];
  const seed = Number(recordId) || raw.length || 0;
  const hour = 8 + (seed % 10);
  const minute = (seed * 7) % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
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
        <span className='inline-flex items-center min-w-0' style={{ ...MUTED_XS, gap: 'var(--dim-space-100)' }}>
          <Icon name='schedule' size={14} color='var(--text-content-tertiary)' />
          เวลา: {formatTimelineEventTime(ev.dateTime, ev.recordId)}
        </span>
        <div className='flex items-center flex-wrap min-w-0' style={{ gap: 'var(--dim-space-150)' }}>
          <ColorfulBadge style='grey' size='small' hierarchy='secondary' width='hug'>{ev.formCode}</ColorfulBadge>
          <ColorfulBadge style={CONSENT_TYPE_TONE[ev.type] || 'grey'} size='small' hierarchy='secondary' width='hug'>
            {ev.type}
          </ColorfulBadge>
          <ColorfulBadge style='blue' size='small' hierarchy='secondary' width='hug'>{ev.version}</ColorfulBadge>
        </div>
        <span style={{ ...BODY_TEXT, color: 'var(--text-content-default)', fontWeight: 'var(--type-weight-medium)' }}>
          {ev.formName}
        </span>
        <span style={BODY_TEXT}>การเปลี่ยนแปลง: {ev.changeDetail}</span>
        <span style={MUTED_XS}>ช่องทาง: {ev.channel}</span>
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

  const patientPoolTotal = useMemo(() => {
    const set = new Set();
    (records || []).forEach((r) => { if (r?.hn) set.add(r.hn); });
    return set.size;
  }, [records]);

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

        {search.trim() ? (
          <SearchResultCount found={results.length} total={patientPoolTotal} />
        ) : null}

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

/* `defaultDateQuick` — หน้า /consent/history ตั้งต้นที่ "ปีนี้" เหมือนเดิม แต่ตอน
   ฝังใน popup ของผู้รับบริการรายคน ต้องเป็น 'all' ให้ไทม์ไลน์ครอบคลุมช่วงเดียว
   กับแท็บแบบฟอร์ม/เปรียบเทียบ (ซึ่งไม่กรองวันที่) ไม่งั้นสามแท็บนับคนละช่วงเวลา */
function ConsentHistoryTimeline({
  hn, records, embedded = false, onViewForm = null, defaultDateQuick = 'thisyear',
}) {
  const [actionFilter, setActionFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState({ quick: defaultDateQuick });
  const timelineFiltersActive = (actionFilter && actionFilter !== 'all') || (dateFilter?.quick && dateFilter.quick !== defaultDateQuick);
  const { showClearChip, resultsOpaque, clearFilters } = useSmoothClearFilters(timelineFiltersActive, () => {
    setActionFilter('all'); setDateFilter({ quick: defaultDateQuick });
  });
  const [internalViewEvent, setInternalViewEvent] = useState(null);
  const scrollPanelRef = useRef(null);
  const [pageScrollMaxH, setPageScrollMaxH] = useState(null);

  const handleOpenForm = onViewForm || setInternalViewEvent;
  const viewEvent = onViewForm ? null : internalViewEvent;

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
    () => groupTimelineEventsByMonth(filtered),
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

  useLayoutEffect(() => {
    if (embedded) return undefined;
    const sync = () => {
      const el = scrollPanelRef.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top;
      setPageScrollMaxH(Math.max(280, window.innerHeight - top - 24));
    };
    sync();
    window.addEventListener('resize', sync);
    window.addEventListener('scroll', sync, { passive: true });
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(sync) : null;
    if (scrollPanelRef.current?.parentElement) ro?.observe(scrollPanelRef.current.parentElement);
    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', sync);
      window.removeEventListener('scroll', sync);
    };
  }, [embedded, hn, filtered.length]);

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

  const timelineFilters = (
    <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
      <FilterDateTag
        prefix='วันที่:'
        value={dateFilter}
        onChange={setDateFilter}
        defaultQuick={defaultDateQuick}
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
      <ClearFiltersTag active={showClearChip} onClear={clearFilters} />
    </div>
  );

  const stickyBg = embedded ? 'var(--surface-modal-default)' : 'var(--surface-card-100)';

  const timelineScrollPanel = (
    /* embedded: SmoothFilterResults เป็น flex item ที่สูงตามเนื้อหา (flex 0 1 auto)
       แต่ scroll panel ข้างในตั้ง `flex: 1 1 0; height: 0` ไว้ — พื้นที่ว่างใน
       parent จึงเป็น 0 แล้ว panel ยุบหายทั้งอัน (เหลือแค่แถวตัวกรองโดนตัดครึ่ง)
       ต้องให้ wrapper โตตาม parent ด้วย ไม่งั้นโซ่ flex ขาดตรงนี้
       non-embedded ไม่แตะ — หน้า /consent/history scroll ที่ระดับหน้า */
    <SmoothFilterResults
      opaque={resultsOpaque}
      className={embedded ? 'flex-1 min-h-0' : ''}
    >
    <div
      ref={scrollPanelRef}
      className={`mih-grouped-timeline-scroll w-full min-w-0 scrollbar-thin ${
        embedded ? 'flex-1 min-h-0' : 'mih-consent-timeline-page-scroll'
      }`}
      style={{
        ...(embedded
          ? {
            flex: '1 1 0',
            minHeight: 0,
            height: 0,
            WebkitOverflowScrolling: 'touch',
            paddingBottom: 'var(--dim-space-600)',
          }
          : {}),
        ...(pageScrollMaxH != null && !embedded ? { maxHeight: pageScrollMaxH } : {}),
      }}
    >
      {filtered.length === 0 ? (
        <>
          <div
            className='mih-timeline-sticky-chrome w-full min-w-0'
            style={{ background: stickyBg }}
          >
            <div className='mih-timeline-filter-bar'>{timelineFilters}</div>
          </div>
          <span style={BODY_TEXT}>ไม่พบเหตุการณ์ตามตัวกรองที่เลือก</span>
        </>
      ) : (
        <GroupedTimelineScrollFeed
          scrollRef={scrollPanelRef}
          groups={monthGroups}
          chrome={<div className='mih-timeline-filter-bar'>{timelineFilters}</div>}
          stickyBackground={stickyBg}
          titleStyle={MONTH_HEADING}
          mutedStyle={MUTED_XS}
          renderGroupBody={(group) => (
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
                  onOpen={handleOpenForm}
                />
              ))}
            </div>
          )}
        />
      )}
    </div>
    </SmoothFilterResults>
  );

  if (embedded) {
    return (
      <div
        className='flex flex-col flex-1 min-h-0 w-full min-w-0'
        style={{ flex: '1 1 0' }}
      >
        {timelineScrollPanel}
      </div>
    );
  }

  return (
    <div
      className='flex flex-col flex-1 min-w-0'
      style={{
        padding: 'var(--dim-space-600)',
        gap: 'var(--dim-space-400)',
      }}
    >
      <section
        className='w-full flex flex-col min-h-0'
        style={{ ...CARD_STYLE, gap: 0, padding: 'var(--dim-space-400)' }}
      >
        {timelineScrollPanel}
      </section>

      {!onViewForm && (
        <ConsentSignedFormViewPopup
          open={!!viewEvent}
          onClose={() => setInternalViewEvent(null)}
          event={viewEvent}
          patientHn={patient.hn || hn}
          patientName={patient.name || ''}
        />
      )}
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
      activeKey='consent-history'
      sidebarItems={CONSENT_NAV}
      sidebarFallbackKey='consent-history'
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
