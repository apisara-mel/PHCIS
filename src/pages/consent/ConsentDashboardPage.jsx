import React, { useMemo, useState } from 'react';
import QueuePageShell from '@/templates/QueuePageShell';
import { SummaryCard } from '@/components/layout/SummaryCardsBar';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import FilterDateTag from '@/components/forms/FilterDateTag';
import ClearFiltersTag, { SmoothFilterResults } from '@/components/forms/ClearFiltersTag';
import useSmoothClearFilters from '@/hooks/useSmoothClearFilters';
import { Donut, HBarList } from '@/components/graph/Charts';
import { QUICK_OPTIONS } from '@/components/popup/DateFilterPopup';
import {
  CONSENT_RECORDS,
  buildConsentSummaryFromRows,
} from '@/data/consentRecords';
import {
  CONSENT_STATUS_BUCKETS,
  consentStatusSegmentsFrom,
  consentTypeStatusBarsFrom,
} from '@/data/consentReports';
import { matchesDateFilter } from '@/data/financePaymentPrototype';
import CONSENT_NAV from '@/pages/consent/consentNav';
import { ConsentReportSections, ReportCard, reportsForDateFilter } from '@/pages/consent/ConsentReportPage';

/* PHCIS | Consent — แดชบอร์ด (TOR ด.1.1.12 + ด.1.1.9).
   โครงสร้างที่สแกนง่าย:
     1) KPI strip จาก worklist (กรองตาม FilterDateTag)
     2) Donut สัดส่วนสถานะ (ส่วนของทั้งหมด) + HBar ตามประเภท
     3) การ์ดรายงาน — ใช้ chart ที่เหมาะกับชนิดข้อมูล (ไม่บังคับ pie) */

/* สถานะ → PHCIS dashboard series (design.md aliases) */
const STATUS_PALETTE = Object.fromEntries(
  CONSENT_STATUS_BUCKETS.map((b) => [b.label, b.color]),
);

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

export default function ConsentDashboardPage() {
  const [pageDate, setPageDate] = useState({ quick: 'thismonth' });
  const [exportReport, setExportReport] = useState(null);
  const [viewReport, setViewReport] = useState(null);
  const dateFiltersActive = (pageDate?.quick || 'thismonth') !== 'thismonth';
  const { showClearChip, resultsOpaque, clearFilters } = useSmoothClearFilters(dateFiltersActive, () => {
    setPageDate({ quick: 'thismonth' });
  });

  const periodReports = useMemo(() => reportsForDateFilter(pageDate), [pageDate]);
  const statusShareReport = useMemo(
    () => periodReports.find((r) => r.key === 'consent-status-share'),
    [periodReports],
  );
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

  const statusSegments = useMemo(() => consentStatusSegmentsFrom(filteredRecords), [filteredRecords]);
  const typeBars = useMemo(() => consentTypeStatusBarsFrom(filteredRecords), [filteredRecords]);
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
          <ClearFiltersTag active={showClearChip} onClear={clearFilters} />
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
        <SmoothFilterResults opaque={resultsOpaque} style={{ gap: 'var(--dim-space-400)' }}>
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
          <div className='flex items-start w-full flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
            <h2 style={{ ...TITLE_TEXT, flex: '1 1 auto', margin: 0 }}>สัดส่วนตามสถานะ</h2>
            {statusShareReport && (
              <div className='flex items-center shrink-0' style={{ gap: 'var(--dim-space-200)' }}>
                <NeutralSubdueButton
                  leadingIcon='visibility'
                  size='sm'
                  collapseLabelBelow='lg'
                  onClick={() => setViewReport(statusShareReport)}
                >
                  ดูรายงาน
                </NeutralSubdueButton>
                <NeutralSubdueButton
                  leadingIcon='ios_share'
                  size='sm'
                  collapseLabelBelow='lg'
                  onClick={() => setExportReport(statusShareReport)}
                >
                  นำส่งออกรายงาน
                </NeutralSubdueButton>
              </div>
            )}
          </div>
          <div className='flex items-stretch flex-wrap w-full' style={{ gap: 'var(--dim-space-400)' }}>
            <div
              className='flex flex-col'
              style={{
                gap: 'var(--dim-space-300)',
                flex: '1 1 var(--dim-size-2500, 320px)',
                minWidth: 0,
                width: '100%',
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
                  className='flex items-center justify-center flex-wrap w-full'
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
                flex: '1 1 var(--dim-size-2500, 320px)',
                minWidth: 0,
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
                  จำนวนตามวัตถุการเปิดเผยข้อมูล
                </h2>
                <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
                  {CONSENT_STATUS_BUCKETS.map((b) => (
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
          excludeKeys={['consent-status-share', 'consent-stats', 'personal-consent']}
        />
        </SmoothFilterResults>
      </div>
    </QueuePageShell>
  );
}
