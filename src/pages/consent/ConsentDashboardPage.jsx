import React, { useEffect, useMemo, useState } from 'react';
import QueuePageShell from '@/templates/QueuePageShell';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import FilterDateTag from '@/components/forms/FilterDateTag';
import ClearFiltersTag, { SmoothFilterResults } from '@/components/forms/ClearFiltersTag';
import useSmoothClearFilters from '@/hooks/useSmoothClearFilters';
import { QUICK_OPTIONS } from '@/components/popup/DateFilterPopup';
import {
  CONSENT_RECORDS,
  buildConsentSummaryFromRows,
} from '@/data/consentRecords';
import { matchesDateFilter } from '@/data/financePaymentPrototype';
import Select from '@/components/forms/Select';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import {
  DASHBOARD_LAYOUTS,
  listDashboardTemplates,
  getDefaultDashboardTemplateId,
  setDefaultDashboardTemplate,
} from '@/data/consentDashboardTemplates';
import {
  ConsentDashboardWidget,
  buildConsentWidgetContext,
} from '@/data/consentDashboardWidgets';
import Popup from '@/components/popup/Popup';
import LottieIllustration from '@/components/illustrations/LottieIllustration';
import { SUCCESS_LOTTIE } from '@/components/layout/SuccessScreen';
import ConsentDashboardTemplatePopup from '@/pages/consent/ConsentDashboardTemplatePopup';
import CONSENT_NAV from '@/pages/consent/consentNav';
import { ConsentReportSections, ReportCard, reportsForDateFilter } from '@/pages/consent/ConsentReportPage';

/* PHCIS | Consent — แดชบอร์ด (TOR ด.1.1.12 + ด.1.1.9).
   โครงสร้างที่สแกนง่าย:
     1) KPI strip จาก worklist (กรองตาม FilterDateTag)
     2) Donut สัดส่วนสถานะ (ส่วนของทั้งหมด) + HBar ตามประเภท
     3) การ์ดรายงาน — ใช้ chart ที่เหมาะกับชนิดข้อมูล (ไม่บังคับ pie) */

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
  /* หน้าจอรวมของแดชบอร์ดมาจาก "เทมเพลต" ที่สร้างไว้ (ด.1.1.12) — เทมเพลต
     มาตรฐานให้ผลเหมือนหน้าเดิมทุกประการ เปลี่ยนเทมเพลตคือเปลี่ยนทั้งหน้าจอ */
  const [templates, setTemplates] = useState(() => listDashboardTemplates());
  const [templateId, setTemplateId] = useState(() => getDefaultDashboardTemplateId());
  const [templatePopup, setTemplatePopup] = useState(false);
  const [savedTemplate, setSavedTemplate] = useState(null);
  const [successAnim, setSuccessAnim] = useState(null);

  /* โหลด Lottie เช็คถูกของ SuccessScreen มาใช้ในป๊อปอัปสำเร็จ (ไฟล์เดียวกับทั้งระบบ) */
  useEffect(() => {
    let alive = true;
    fetch(SUCCESS_LOTTIE)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive) setSuccessAnim(d); })
      .catch(() => { /* ไม่มีไฟล์ก็ข้ามภาพประกอบไป */ });
    return () => { alive = false; };
  }, []);
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

  /* KPI ที่สแกนเร็ว — ไม่โชว์ทุกการ์ด summary (ตัดใกล้หมด/หมดอายุถ้าต้องการพื้นที่) */
  const kpiCards = periodSummary.filter((c) =>
    ['total', 'consented', 'pending', 'rejected'].includes(c.key),
  );

  const activeTemplate = useMemo(
    () => templates.find((t) => t.id === templateId) || templates[0],
    [templates, templateId],
  );
  const templateColumns = (DASHBOARD_LAYOUTS.find((l) => l.key === activeTemplate?.layout) || { columns: 3 }).columns;
  const widgetCtx = useMemo(
    () => buildConsentWidgetContext({ records: filteredRecords, summary: kpiCards }),
    [filteredRecords, kpiCards],
  );
  const applyTemplate = (id) => {
    setTemplateId(id);
    setDefaultDashboardTemplate(id);
    setTemplates(listDashboardTemplates());
  };

  return (
    <QueuePageShell
      activeKey='consent-dashboard'
      sidebarItems={CONSENT_NAV}
      sidebarFallbackKey='consent-dashboard'
      brandTitle='ระบบจัดการความยินยอม'
      breadcrumb={['แดชบอร์ด']}
      title='แดชบอร์ด'
      /* ตัวกรองวันที่อยู่ติดกับชื่อหน้า — ไม่ปนกับปุ่มคำสั่งฝั่งขวา */
      afterTitle={(
        <span className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
          <FilterDateTag prefix='วัน:' value={pageDate} onChange={setPageDate} defaultQuick='thismonth' />
          <ClearFiltersTag active={showClearChip} onClear={clearFilters} />
        </span>
      )}
      actions={(
        <>
          <div style={{ width: 'var(--dim-size-2600, 384px)', minWidth: 0 }}>
            <Select
              label='เทมเพลตหน้าจอ'
              prefix='Template:'
              showFieldName={false}
              showHelperText={false}
              leadingIcon='dashboard'
              options={templates.map((t) => ({ value: t.id, label: t.name }))}
              value={activeTemplate?.id}
              onChange={applyTemplate}
              searchable={false}
            />
          </div>
          <NeutralSubdueButton
            leadingIcon='dashboard_customize'
            size='md'
            onClick={() => setTemplatePopup(true)}
          >
            สร้าง / จัดการเทมเพลต
          </NeutralSubdueButton>
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
        {/* หน้าจอรวมตามเทมเพลต — การ์ด/ตำแหน่ง/ข้อมูล มาจากเทมเพลตที่เลือก
            (เทมเพลตมาตรฐาน = KPI + สัดส่วนสถานะ + จำนวนตามประเภท เหมือนเดิม) */}
        <section className='flex flex-col w-full' style={{ ...CARD_STYLE, gap: 'var(--dim-space-400)' }}>
          <div className='flex items-start w-full flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
            <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)', flex: '1 1 auto', minWidth: 0 }}>
              <h2 style={{ ...TITLE_TEXT, margin: 0 }}>{activeTemplate?.name || 'แดชบอร์ด'}</h2>
              <ColorfulBadge style='indigo' size='small' hierarchy='secondary' width='hug'>
                {`${activeTemplate?.widgets?.length || 0} การ์ด · ${templateColumns} โซนต่อแถว`}
              </ColorfulBadge>
            </div>
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

          {!activeTemplate?.widgets?.length ? (
            <span style={MUTED_XS}>เทมเพลตนี้ยังไม่มีการ์ด — กด "สร้าง / จัดการเทมเพลต" เพื่อเลือกข้อมูลที่จะแสดง</span>
          ) : (
            <div
              className='w-full'
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${templateColumns}, minmax(0, 1fr))`,
                gap: 'var(--dim-space-400)',
              }}
            >
              {activeTemplate.widgets.map((w) => {
                const span = Math.min(w.span || 1, templateColumns);
                return (
                  <div
                    key={w.id}
                    className='flex flex-col'
                    style={{
                      gap: 'var(--dim-space-300)',
                      gridColumn: `span ${span} / span ${span}`,
                      minWidth: 0,
                      padding: 'var(--dim-space-400)',
                      borderRadius: 'var(--dim-radius-400)',
                      background: 'var(--surface-card-100)',
                      border: 'var(--dim-stroke-100) solid var(--border-card-default)',
                      boxSizing: 'border-box',
                    }}
                  >
                    <h3
                      style={{
                        color: 'var(--text-content-default)',
                        fontFamily: 'var(--type-family-heading-graphic2)',
                        fontSize: 'var(--type-size-sm)',
                        fontWeight: 'var(--type-weight-regular, 400)',
                        lineHeight: 1.4,
                        margin: 0,
                      }}
                    >
                      {w.title}
                    </h3>
                    <ConsentDashboardWidget widget={w} ctx={widgetCtx} compact={span < 2} />
                  </div>
                );
              })}
            </div>
          )}
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

      {/* ตัวสร้างเทมเพลตหน้าจอรวม — เปิดเป็นป๊อปอัป ไม่ต้องออกจากแดชบอร์ด */}
      <ConsentDashboardTemplatePopup
        open={templatePopup}
        onClose={() => setTemplatePopup(false)}
        onSaved={(saved) => {
          setTemplates(listDashboardTemplates());
          setTemplateId(getDefaultDashboardTemplateId());
          setSavedTemplate(saved || null);
        }}
      />

      {/* ป๊อปอัปสำเร็จหลังบันทึกเทมเพลต (ไม่ใช้จอเต็มหน้า) */}
      <Popup
        open={Boolean(savedTemplate)}
        onClose={() => setSavedTemplate(null)}
        size='default'
        showCloseButton={false}
        primaryAction={{ label: 'ไปที่แดชบอร์ด', onClick: () => setSavedTemplate(null) }}
      >
        <div
          className='flex flex-col items-center text-center w-full'
          style={{ gap: 'var(--dim-space-300)', paddingTop: 'var(--dim-space-400)' }}
        >
          {successAnim && (
            <LottieIllustration animationData={successAnim} size={160} loop={false} ariaLabel='' />
          )}
          <span
            style={{
              color: 'var(--text-brandPrimary-default)',
              fontFamily: 'var(--type-family-heading-graphic2)',
              fontSize: 'var(--type-size-lg)',
              lineHeight: 1.4,
            }}
          >
            {savedTemplate?.isEdit
              ? `บันทึกการแก้ไข “${savedTemplate?.name}” สำเร็จ`
              : `สร้างเทมเพลต “${savedTemplate?.name}” สำเร็จ`}
          </span>
          <span
            style={{
              color: 'var(--text-content-tertiary)',
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-sm)',
              lineHeight: 1.5,
            }}
          >
            เลือกใช้ได้จากช่อง Template บนหัวหน้าแดชบอร์ด
          </span>
        </div>
      </Popup>
    </QueuePageShell>
  );
}
