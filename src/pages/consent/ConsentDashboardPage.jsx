import React, { useMemo, useState } from 'react';
import QueuePageShell from '@/templates/QueuePageShell';
import { SummaryCard } from '@/components/layout/SummaryCardsBar';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import FilterDateTag from '@/components/forms/FilterDateTag';
import { Donut, HBarList } from '@/components/graph/Charts';
import { QUICK_OPTIONS } from '@/components/popup/DateFilterPopup';
import {
  CONSENT_RECORDS,
  CONSENT_TYPES,
  buildConsentSummaryFromRows,
} from '@/data/consentRecords';
import { PHCIS_CHART, PHCIS_CHART_PALETTE } from '@/data/phcisChartPalette';
import { matchesDateFilter } from '@/data/financePaymentPrototype';
import CONSENT_NAV from '@/pages/consent/consentNav';
import { ConsentReportSections, ReportCard, reportsForDateFilter } from '@/pages/consent/ConsentReportPage';

/* PHCIS | Consent — แดชบอร์ด (TOR ด.1.1.12 + ด.1.1.9).
   โครงสร้างที่สแกนง่าย:
     1) KPI strip จาก worklist (กรองตาม FilterDateTag)
     2) Donut สัดส่วนสถานะ (ส่วนของทั้งหมด) + HBar ตามประเภท
     3) การ์ดรายงาน — ใช้ chart ที่เหมาะกับชนิดข้อมูล (ไม่บังคับ pie) */

/* สถานะ → PHCIS dashboard series (design.md aliases) */
const STATUS_PALETTE = {
  'ยินยอมแล้ว': PHCIS_CHART.teal,
  'รอดำเนินการ': PHCIS_CHART.yellow,
  'ปฏิเสธ / ถอน': PHCIS_CHART.pink,
  'หมดอายุ / ใกล้หมด': PHCIS_CHART.indigo,
};
const FALLBACK_PALETTE = PHCIS_CHART_PALETTE;

const CARD_STYLE = {
  background: 'var(--surface-card-100)',
  borderRadius: 'var(--dim-radius-500)',
  border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
  boxShadow: 'var(--shadow-card)',
  padding: 'var(--dim-space-600)',
};
const TITLE_TEXT = {
  color: 'var(--text-brandPrimary-default)',
  fontFamily: 'var(--type-family-heading-graphic2)',
  fontSize: 'var(--type-size-base)',
  fontWeight: 'var(--type-weight-regular, 400)',
  lineHeight: 1.4,
};
const MUTED_XS = {
  color: 'var(--text-content-tertiary)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-xs)',
  lineHeight: 1.5,
};

const QUICK_LABEL_BY_VALUE = Object.fromEntries(QUICK_OPTIONS.map((o) => [o.value, o.label]));
const periodLabelOf = (dateFilter) => {
  const quick = dateFilter?.quick;
  if (!quick || quick === 'custom') return 'ช่วงที่เลือก';
  return QUICK_LABEL_BY_VALUE[quick] || 'ช่วงที่เลือก';
};

/** 4 สถานะเดียวกับ donut ด้านข้าง */
const STATUS_BUCKETS = [
  { label: 'ยินยอมแล้ว', match: ['ยินยอมแล้ว'] },
  { label: 'รอดำเนินการ', match: ['รอลงนาม', 'อยู่ระหว่างลงนาม', 'มีเวอร์ชันใหม่', 'ขอเพิกถอน'] },
  { label: 'ปฏิเสธ / ถอน', match: ['ปฏิเสธ', 'ถอนความยินยอม', 'ยกเลิกคำขอ'] },
  { label: 'หมดอายุ / ใกล้หมด', match: ['หมดอายุ', 'ใกล้หมดอายุ', 'หมดอายุ-Reconsent'] },
];

const bucketOfStatus = (status) => {
  const hit = STATUS_BUCKETS.find((b) => b.match.includes(status));
  return hit ? hit.label : null;
};

const statusSegmentsFrom = (records) => STATUS_BUCKETS.map((b, i) => ({
  label: b.label,
  color: STATUS_PALETTE[b.label] || FALLBACK_PALETTE[i % FALLBACK_PALETTE.length],
  value: records.filter((r) => b.match.includes(r.status)).length,
})).filter((s) => s.value > 0);

/** แถบตามประเภท — แบ่ง 4 สถานะเดียวกับ pie · โชว์ครบทุกประเภท Consent */
const typeBarsFrom = (records) => {
  const map = new Map(
    CONSENT_TYPES.map((type) => [type, {
      label: type,
      value: 0,
      counts: Object.fromEntries(STATUS_BUCKETS.map((b) => [b.label, 0])),
    }]),
  );
  records.forEach((r) => {
    const row = map.get(r.type) || {
      label: r.type,
      value: 0,
      counts: Object.fromEntries(STATUS_BUCKETS.map((b) => [b.label, 0])),
    };
    row.value += 1;
    const bucket = bucketOfStatus(r.status);
    if (bucket) row.counts[bucket] += 1;
    map.set(r.type, row);
  });
  return CONSENT_TYPES
    .map((type) => map.get(type))
    .filter((row) => row && row.value > 0)
    .map((row) => ({
      label: row.label,
      value: row.value,
      segments: STATUS_BUCKETS.map((b) => ({
        value: row.counts[b.label] || 0,
        color: STATUS_PALETTE[b.label],
        label: b.label,
      })),
    }))
    .sort((a, b) => b.value - a.value);
};

export default function ConsentDashboardPage() {
  const [pageDate, setPageDate] = useState({ quick: 'thismonth' });
  const [exportReport, setExportReport] = useState(null);
  const [viewReport, setViewReport] = useState(null);

  const periodReports = useMemo(() => reportsForDateFilter(pageDate), [pageDate]);
  const consentStatsReport = useMemo(
    () => periodReports.find((r) => r.key === 'consent-stats'),
    [periodReports],
  );
  const periodLabel = periodLabelOf(pageDate);

  const filteredRecords = useMemo(
    () => CONSENT_RECORDS.filter((r) => matchesDateFilter(r.createdDate, pageDate)),
    [pageDate],
  );
  const periodSummary = useMemo(
    () => buildConsentSummaryFromRows(filteredRecords, {
      allTimeTotal: CONSENT_RECORDS.length,
      periodLabel,
    }),
    [filteredRecords, periodLabel],
  );

  const statusSegments = useMemo(() => statusSegmentsFrom(filteredRecords), [filteredRecords]);
  const typeBars = useMemo(() => typeBarsFrom(filteredRecords), [filteredRecords]);
  const statusTotal = statusSegments.reduce((a, s) => a + s.value, 0);

  /* KPI ที่สแกนเร็ว — ไม่โชว์ทุกการ์ด summary (ตัดใกล้หมด/หมดอายุถ้าต้องการพื้นที่) */
  const kpiCards = periodSummary.filter((c) =>
    ['total', 'consented', 'pending', 'rejected'].includes(c.key),
  );

  return (
    <QueuePageShell
      activeKey='consent-dashboard'
      sidebarItems={CONSENT_NAV}
      sidebarFallbackKey='consent-dashboard'
      brandTitle='ระบบจัดการความยินยอม'
      breadcrumb={['แดชบอร์ด']}
      title='แดชบอร์ด'
      actions={(
        <>
          <FilterDateTag prefix='วัน:' value={pageDate} onChange={setPageDate} defaultQuick='thismonth' />
          <NeutralSubdueButton
            leadingIcon='ios_share'
            size='md'
            onClick={() => setExportReport({ key: 'all', title: 'รายงานทั้งหมด' })}
          >
            นำส่งออกรายงาน
          </NeutralSubdueButton>
        </>
      )}
    >
      <div className='flex flex-col flex-1 min-w-0' style={{ padding: 'var(--dim-space-600)', gap: 'var(--dim-space-400)' }}>
        {/* 1) KPI จาก worklist ตามช่วงวัน */}
        <section className='flex flex-col w-full' style={{ ...CARD_STYLE, gap: 'var(--dim-space-300)' }}>
          <div className='flex items-center justify-between flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
            <h2 style={TITLE_TEXT}>สรุปความยินยอม</h2>
          </div>
          <div className='flex items-stretch flex-wrap' style={{ gap: 'var(--dim-space-400)' }}>
            {kpiCards.map((card) => (
              <SummaryCard key={card.key} card={card} variant='panel' />
            ))}
          </div>
        </section>

        {/* 2) Donut + HBar รวมในการ์ดเดียว — pattern เดียวกับรายงานสัดส่วน */}
        <section className='flex flex-col w-full' style={{ ...CARD_STYLE, gap: 'var(--dim-space-400)' }}>
          <h2 style={TITLE_TEXT}>สัดส่วนตามสถานะ</h2>
          <div className='flex items-stretch flex-wrap w-full' style={{ gap: 'var(--dim-space-400)' }}>
            <div
              className='flex flex-col'
              style={{
                gap: 'var(--dim-space-300)',
                flex: '1 1 400px',
                minWidth: 360,
                maxWidth: 480,
                padding: 'var(--dim-space-400)',
                borderRadius: 'var(--dim-radius-400)',
                background: 'var(--surface-card-100)',
                border: 'var(--dim-stroke-100) solid var(--border-card-default)',
                boxSizing: 'border-box',
                justifyContent: 'center',
              }}
            >
              {statusSegments.length === 0 ? (
                <span style={MUTED_XS}>ไม่มีรายการในช่วงที่เลือก</span>
              ) : (
                <div
                  className='flex items-center justify-center w-full'
                  style={{ gap: 'var(--dim-space-400)', flex: 1 }}
                >
                  <Donut
                    segments={statusSegments}
                    size={200}
                    thickness={16}
                    centerLabel={statusTotal.toLocaleString('th-TH')}
                    centerSub='รายการ'
                  />
                  <div className='flex flex-col' style={{ gap: 'var(--dim-space-150)' }}>
                    {statusSegments.map((s) => (
                      <div
                        key={s.label}
                        className='inline-flex items-center'
                        style={{ gap: 'var(--dim-space-150)' }}
                      >
                        <span
                          aria-hidden
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: 'var(--dim-radius-full)',
                            background: s.color,
                            flexShrink: 0,
                          }}
                        />
                        <span style={{ ...MUTED_XS, color: 'var(--text-content-secondary)', whiteSpace: 'nowrap' }}>
                          {s.label}
                        </span>
                        <span style={{ ...MUTED_XS, color: s.color, whiteSpace: 'nowrap' }}>
                          {s.value.toLocaleString('th-TH')} · {statusTotal ? `${((s.value / statusTotal) * 100).toFixed(0)}%` : '0%'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div
              className='flex flex-col flex-1 min-w-0'
              style={{
                gap: 'var(--dim-space-300)',
                flex: '1 1 320px',
                minWidth: 320,
                padding: 'var(--dim-space-400)',
                borderRadius: 'var(--dim-radius-400)',
                background: 'var(--surface-card-100)',
                border: 'var(--dim-stroke-100) solid var(--border-card-default)',
                boxSizing: 'border-box',
              }}
            >
              <div className='flex items-center justify-between flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
                <h2
                  style={{
                    color: 'var(--text-content-default)',
                    fontFamily: 'var(--type-family-heading-graphic2)',
                    fontSize: 'var(--type-size-sm)',
                    fontWeight: 'var(--type-weight-regular, 400)',
                    lineHeight: 1.4,
                    margin: 0,
                  }}
                >
                  จำนวนตามประเภท Consent
                </h2>
                <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
                  {STATUS_BUCKETS.map((b) => (
                    <span key={b.label} className='inline-flex items-center' style={{ gap: 'var(--dim-space-100)' }}>
                      <span
                        aria-hidden
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 'var(--dim-radius-full)',
                          background: STATUS_PALETTE[b.label],
                        }}
                      />
                      <span style={MUTED_XS}>{b.label}</span>
                    </span>
                  ))}
                </div>
              </div>
              {typeBars.length === 0 ? (
                <span style={MUTED_XS}>ไม่มีรายการในช่วงที่เลือก</span>
              ) : (
                <HBarList rows={typeBars} valueLabel='รายการ' />
              )}
            </div>
          </div>
        </section>

        {consentStatsReport && (
          <ReportCard
            report={consentStatsReport}
            scale={1}
            onExport={setExportReport}
            onView={setViewReport}
          />
        )}

        <ConsentReportSections
          pageDate={pageDate}
          onPageDateChange={setPageDate}
          hideToolbar
          reports={periodReports}
          exportReport={exportReport}
          onExportReportChange={setExportReport}
          viewReport={viewReport}
          onViewReportChange={setViewReport}
          excludeKeys={['consent-stats', 'personal-consent']}
        />
      </div>
    </QueuePageShell>
  );
}
