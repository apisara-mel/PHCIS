import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import Popup from '@/components/popup/Popup';
import Table from '@/components/table/Table';
import Badge from '@/components/badge/Badge';
import Icon from '@/components/icons/Icon';
import InputField from '@/components/forms/InputField';
import Dropdown from '@/components/forms/Dropdown';
import FilterDateTag from '@/components/forms/FilterDateTag';
import FilterTag from '@/components/forms/FilterTag';
import ClearFiltersTag, { SmoothFilterResults } from '@/components/forms/ClearFiltersTag';
import useSmoothClearFilters from '@/hooks/useSmoothClearFilters';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import SuccessToast from '@/components/toast/SuccessToast';
import { screenValue } from '@/components/dashboard/DashboardTemplateSwitcher';
import { DashboardHeaderActions, DashboardHeaderFilters } from '@/components/dashboard/DashboardPageHeader';
import { SummaryCard } from '@/components/layout/SummaryCardsBar';
import { AreaLineChart, DonutWithLegend, HBarList } from '@/components/graph/Charts';
import PHCIS_CHART, { PHCIS_CHART_PALETTE } from '@/data/phcisChartPalette';
import { ExportFormatPopup } from '@/pages/consent/consentExportPopup';
import { PHCIS_CURRENT_USER } from '@/data/phcisCurrentUser';
import {
  CARD,
  ChartPanel,
  ChartsRow,
  DASHBOARD_EXPORT_FOOTER,
  EmptyChartNote,
  ReportGroupCard,
  ReportToolbar,
  ReportViewPopup,
  StatTile,
  StatTileRow,
  buildExportReport,
  fiscalYearOf,
  hbarRows,
} from '@/pages/dashboard/dashboardReportKit';
import { formatIsoDateThai, safePct, toIsoDate } from '@/data/dashboardCommon';
import {
  CHECKUP_FISCAL_YEARS,
  CHECKUP_I18N,
  CHECKUP_ORGANIZATIONS,
  CHECKUP_REPORT_FORMATS,
  CHECKUP_RESULTS,
  CHECKUP_TREND_INDICATORS,
  RISK_FACTORS,
  checkupCountsByRisk,
  checkupTrendByYear,
  organizationLabel,
  riskFactorLabel,
} from '@/data/dashboardCheckupTrends';

/* TOR §1.20.8 — รายงานผลการตรวจสุขภาพ
   8.1 ออกรายงาน/พิมพ์ตามรูปแบบสำนักอนามัย · 8.2 รายงานออนไลน์ + ส่งอีเมล
   8.3 รายงานตามปัจจัยเสี่ยง · 8.4 ต่อเนื่อง ≥ 3 ปี · 8.5 ไทย/อังกฤษ

   ทั้งหน้าสลับภาษาได้ด้วยชิป ไทย/English — ทั้งหัวข้อบนจอ ตัวอย่างก่อนพิมพ์
   และหัวคอลัมน์ของไฟล์ที่ส่งออก */

const breadcrumb = ['แดชบอร์ด', 'รายงานตรวจสุขภาพ'];

const DEFAULT_YEAR = CHECKUP_FISCAL_YEARS[CHECKUP_FISCAL_YEARS.length - 1];
const DEFAULT_ORG = 'all';
const DEFAULT_FORMAT = 'org-summary';
const DEFAULT_LANG = 'th';

const EXPORT_GROUP_KEYS = {
  risk: ['risk-summary', 'risk-org'],
  trend: ['trend-year'],
  format: ['format-org-summary'],
};

const YEAR_OPTIONS = CHECKUP_FISCAL_YEARS.map((y) => ({ value: y, label: `ปีงบประมาณ ${y}` }));
const ORG_OPTIONS = [
  { value: 'all', label: 'ทุกหน่วยงาน' },
  ...CHECKUP_ORGANIZATIONS.map((o) => ({ value: o.key, label: o.th })),
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const EMAIL_MESSAGE_SUGGESTIONS = [
  'ขอส่งรายงานผลการตรวจสุขภาพประจำปีของหน่วยงานตามที่ประสานไว้',
  'กรุณาตรวจสอบรายชื่อผู้ที่พบความเสี่ยงและนัดหมายติดตามที่ศูนย์บริการสาธารณสุข',
  'รายงานฉบับนี้เป็นข้อมูลสรุปเชิงสถิติ ไม่มีข้อมูลระบุตัวบุคคล',
  'หากต้องการรายงานรายบุคคล กรุณาติดต่อเจ้าหน้าที่ศูนย์บริการสาธารณสุขโดยตรง',
  'ขอความกรุณาแจ้งกลับเมื่อได้รับรายงานเรียบร้อยแล้ว',
];

const t = (lang, key) => CHECKUP_I18N[lang === 'en' ? 'en' : 'th'][key] || key;

/* ── bilingual column builders (§1.20.8.5) ──────────────────────────────── */

const riskSummaryColumns = (lang) => [
  {
    key: 'risk',
    label: lang === 'en' ? 'Risk factor' : 'ปัจจัยเสี่ยง',
    flex: true,
    minWidth: 260,
    render: (r) => riskFactorLabel(r.risk, lang),
    csv: (r) => riskFactorLabel(r.risk, lang),
  },
  { key: 'count', label: lang === 'en' ? 'Persons' : 'จำนวน (คน)', align: 'center' },
  {
    key: 'pct',
    label: lang === 'en' ? 'Percent (%)' : 'ร้อยละ (%)',
    align: 'right',
    render: (r) => `${r.pct}%`,
    csv: (r) => r.pct,
  },
];

const riskOrgColumns = (lang) => [
  {
    key: 'org',
    label: lang === 'en' ? 'Organization' : 'หน่วยงาน',
    flex: true,
    minWidth: 280,
    render: (r) => organizationLabel(r.org, lang),
    csv: (r) => organizationLabel(r.org, lang),
  },
  { key: 'total', label: lang === 'en' ? 'Examinees' : 'ผู้เข้ารับการตรวจ', align: 'center' },
  { key: 'abnormal', label: lang === 'en' ? 'Abnormal' : 'ผลผิดปกติ', align: 'center' },
  {
    key: 'pct',
    label: lang === 'en' ? 'Abnormal rate (%)' : 'อัตราผิดปกติ (%)',
    align: 'right',
    render: (r) => (
      <Badge style={r.pct >= 60 ? 'error' : r.pct >= 50 ? 'warning' : 'success'} size='small'>
        {r.pct}%
      </Badge>
    ),
    csv: (r) => r.pct,
  },
];

const trendColumns = (lang) => [
  {
    key: 'indicator',
    label: lang === 'en' ? 'Indicator' : 'ตัวชี้วัด',
    flex: true,
    minWidth: 260,
  },
  ...CHECKUP_FISCAL_YEARS.map((y) => ({
    key: `y${y}`,
    label: lang === 'en' ? `FY ${y}` : `ปีงบ ${y}`,
    align: 'center',
    render: (r) => (r[`y${y}`] == null ? '—' : `${r[`y${y}`]}%`),
    csv: (r) => (r[`y${y}`] == null ? '' : r[`y${y}`]),
  })),
  {
    key: 'change',
    label: lang === 'en' ? 'Change vs first year' : 'เปลี่ยนแปลงจากปีแรก',
    align: 'right',
    render: (r) => (r.change == null ? '—' : `${r.change > 0 ? '+' : ''}${r.change}%`),
    csv: (r) => (r.change == null ? '' : r.change),
  },
];

const orgSummaryColumns = (lang) => [
  {
    key: 'org',
    label: lang === 'en' ? 'Organization' : 'หน่วยงาน',
    flex: true,
    minWidth: 280,
    render: (r) => organizationLabel(r.org, lang),
    csv: (r) => organizationLabel(r.org, lang),
  },
  { key: 'year', label: lang === 'en' ? 'Fiscal year' : 'ปีงบประมาณ', align: 'center' },
  { key: 'total', label: lang === 'en' ? 'Examinees' : 'จำนวนผู้เข้ารับการตรวจ', align: 'center' },
  { key: 'normal', label: lang === 'en' ? 'Normal' : 'ผลปกติ', align: 'center' },
  { key: 'abnormal', label: lang === 'en' ? 'Abnormal' : 'ผลผิดปกติ', align: 'center' },
  { key: 'followUp', label: lang === 'en' ? 'Referred for follow-up' : 'ส่งต่อเพื่อติดตาม', align: 'center' },
];

/* ── A4 print stylesheet (§1.20.8.1) ────────────────────────────────────
   `@page` / `@media print` ไม่สามารถเขียนเป็น inline style ได้ จึงต้องฉีดเป็น
   stylesheet แบบ idempotent (pattern เดียวกับ XrayReportSheet.jsx / AISearch.jsx)
   และฉีดเฉพาะตอนเปิดป๊อปอัปตัวอย่างก่อนพิมพ์ เพื่อไม่ให้กฎ `body > *` ไป
   กระทบการพิมพ์ของหน้าอื่น (Routes import ทุกหน้าแบบ eager)

   แผ่นรายงานถูก render ซ้ำผ่าน portal ที่เป็นลูกโดยตรงของ <body> เพราะ Popup
   เองอยู่ใน portal ที่มี overflow:hidden — ถ้าพิมพ์จากในป๊อปอัปจะโดน clip */
const PRINT_STYLE_ID = 'mih-checkup-print-style';
const PRINT_CSS = `
@page { size: A4 portrait; margin: 12mm; }
.mih-checkup-print-portal { display: none; }
@media print {
  /* พิมพ์เฉพาะแผ่นรายงาน — ซ่อน sidebar / header / sub-nav / แถบตัวกรอง
     และตัวป๊อปอัปเอง (ทุกตัวเป็นลูกโดยตรงของ body หรืออยู่ในนั้น) */
  body > *:not(.mih-checkup-print-portal) { display: none !important; }
  .mih-checkup-print-portal { display: block !important; }
  .mih-checkup-print-sheet {
    border: 0 !important;
    border-radius: 0 !important;
    box-shadow: none !important;
    width: 100% !important;
    max-width: none !important;
    margin: 0 !important;
    padding: 0 !important;
    background: var(--surface-card-100, #FFFFFF) !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .mih-checkup-print-sheet tr { break-inside: avoid; page-break-inside: avoid; }
  .mih-checkup-print-sheet thead { display: table-header-group; }
}
`;

const useCheckupPrintStyles = (active) => {
  useEffect(() => {
    if (typeof document === 'undefined' || !active) return undefined;
    let el = document.getElementById(PRINT_STYLE_ID);
    if (!el) {
      el = document.createElement('style');
      el.id = PRINT_STYLE_ID;
      document.head.appendChild(el);
    }
    if (el.textContent !== PRINT_CSS) el.textContent = PRINT_CSS;
    return () => { if (el.parentNode) el.parentNode.removeChild(el); };
  }, [active]);
};

/* ── A4 print preview (§1.20.8.1) ───────────────────────────────────────── */

const sheetHeadStyle = (align) => ({
  textAlign: align || 'left',
  color: 'var(--text-content-secondary)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-xs)',
  paddingTop: 'var(--dim-space-200)',
  paddingBottom: 'var(--dim-space-200)',
  paddingLeft: 'var(--dim-space-150)',
  paddingRight: 'var(--dim-space-150)',
  borderBottom: 'var(--dim-stroke-100) solid var(--border-table-default)',
});

const sheetCellStyle = (align, muted) => ({
  textAlign: align || 'left',
  color: muted ? 'var(--text-content-secondary)' : 'var(--text-content-default)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm)',
  paddingTop: 'var(--dim-space-150)',
  paddingBottom: 'var(--dim-space-150)',
  paddingLeft: 'var(--dim-space-150)',
  paddingRight: 'var(--dim-space-150)',
  borderBottom: 'var(--dim-stroke-100) solid var(--border-table-line)',
});

/** ตารางของแผ่นรายงาน — ใช้ <table> ธรรมดา ไม่ใช่ <Table> ของ DS
    เพราะแผ่นพิมพ์ต้องไม่มี sticky/scroll/pagination */
const SheetTable = ({ head, body }) => (
  <table className='w-full' style={{ borderCollapse: 'collapse' }}>
    <thead>
      <tr>
        {head.map((h) => (
          <th key={h.key} style={sheetHeadStyle(h.align)}>{h.label}</th>
        ))}
      </tr>
    </thead>
    <tbody>
      {body.map((r) => (
        <tr key={r.key}>
          {r.cells.map((c, i) => (
            <td key={head[i]?.key || i} style={sheetCellStyle(head[i]?.align, head[i]?.muted)}>{c}</td>
          ))}
        </tr>
      ))}
    </tbody>
  </table>
);

const num = (n) => Number(n || 0).toLocaleString('th-TH');

const SheetSectionLabel = ({ children }) => (
  <span
    style={{
      color: 'var(--text-brandPrimary-default)',
      fontFamily: 'var(--type-family-heading-graphic2)',
      fontSize: 'var(--type-size-sm)',
    }}
  >
    {children}
  </span>
);

const PrintPreview = ({ lang, formatKey, year, orgKey, rows }) => {
  const format = CHECKUP_REPORT_FORMATS.find((f) => f.key === formatKey) || CHECKUP_REPORT_FORMATS[0];
  const total = rows.length;
  const normal = rows.filter((r) => r.risk === 'normal').length;
  const abnormal = total - normal;
  const printedAt = formatIsoDateThai(toIsoDate(new Date()));

  /* §1.20.8.1 — สามรูปแบบต้องได้เอกสารคนละแบบจริง ไม่ใช่เปลี่ยนแค่หัวเรื่อง */
  const orgSummary = useMemo(() => {
    const map = new Map();
    rows.forEach((r) => {
      const e = map.get(r.org) || { org: r.org, total: 0, normal: 0, abnormal: 0, followUp: 0 };
      e.total += 1;
      if (r.risk === 'normal') e.normal += 1; else e.abnormal += 1;
      if (r.followUp) e.followUp += 1;
      map.set(r.org, e);
    });
    return [...map.values()].sort((a, b) => b.total - a.total);
  }, [rows]);

  const abnormalFactors = useMemo(() => RISK_FACTORS.filter((rf) => rf.key !== 'normal'), []);

  const crossTab = useMemo(() => {
    const orgs = orgSummary.map((o) => o.org);
    const body = abnormalFactors.map((rf) => {
      const perOrg = orgs.map((o) => rows.filter((r) => r.org === o && r.risk === rf.key).length);
      const sum = perOrg.reduce((a, b) => a + b, 0);
      return { key: rf.key, label: riskFactorLabel(rf.key, lang), perOrg, sum };
    }).filter((r) => r.sum > 0)
      .sort((a, b) => b.sum - a.sum);
    return { orgs, body };
  }, [orgSummary, abnormalFactors, rows, lang]);

  const sample = rows.find((r) => r.risk !== 'normal') || rows[0] || null;

  const genderLabel = (g) => (lang === 'en' ? (g === 'หญิง' ? 'Female' : 'Male') : g);

  const renderBody = () => {
    if (total === 0) {
      return (
        <EmptyChartNote
          text={t(lang, 'noData')}
          hint={lang === 'en' ? 'Try another fiscal year or organization' : 'ลองเลือกปีงบประมาณหรือหน่วยงานอื่น'}
        />
      );
    }

    /* แบบสรุปรายหน่วยงาน — จำนวนผู้ตรวจ / ปกติ / ผิดปกติ / ส่งต่อ */
    if (format.key === 'org-summary') {
      return (
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
          <SheetSectionLabel>{lang === 'en' ? format.en : format.th}</SheetSectionLabel>
          <SheetTable
            head={[
              { key: 'org', label: t(lang, 'org') },
              { key: 'total', label: t(lang, 'total'), align: 'right' },
              { key: 'normal', label: t(lang, 'normal'), align: 'right' },
              { key: 'abnormal', label: t(lang, 'abnormal'), align: 'right' },
              { key: 'followUp', label: t(lang, 'followUp'), align: 'right' },
              { key: 'pct', label: `${t(lang, 'abnormal')} (%)`, align: 'right', muted: true },
            ]}
            body={[
              ...orgSummary.map((o) => ({
                key: o.org,
                cells: [
                  organizationLabel(o.org, lang),
                  num(o.total),
                  num(o.normal),
                  num(o.abnormal),
                  num(o.followUp),
                  `${safePct(o.abnormal, o.total)}%`,
                ],
              })),
              {
                key: 'grand-total',
                cells: [
                  t(lang, 'grandTotal'),
                  num(total),
                  num(normal),
                  num(abnormal),
                  num(rows.filter((r) => r.followUp).length),
                  `${safePct(abnormal, total)}%`,
                ],
              },
            ]}
          />
        </div>
      );
    }

    /* แบบรายงานกลุ่มเสี่ยง — ปัจจัยเสี่ยง × หน่วยงาน เฉพาะแถวที่ผลผิดปกติ */
    if (format.key === 'risk-group') {
      return (
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
          <SheetSectionLabel>{lang === 'en' ? format.en : format.th}</SheetSectionLabel>
          {crossTab.body.length ? (
            <SheetTable
              head={[
                { key: 'risk', label: t(lang, 'riskFactor') },
                ...crossTab.orgs.map((o) => ({ key: o, label: organizationLabel(o, lang), align: 'right' })),
                { key: 'sum', label: t(lang, 'grandTotal'), align: 'right' },
                { key: 'pct', label: `% ${t(lang, 'ofAbnormal')}`, align: 'right', muted: true },
              ]}
              body={crossTab.body.map((r) => ({
                key: r.key,
                cells: [
                  r.label,
                  ...r.perOrg.map((v) => num(v)),
                  num(r.sum),
                  `${safePct(r.sum, abnormal)}%`,
                ],
              }))}
            />
          ) : (
            <EmptyChartNote
              text={lang === 'en' ? 'No abnormal result in this scope' : 'ไม่พบผลผิดปกติในขอบเขตที่เลือก'}
            />
          )}
        </div>
      );
    }

    /* แบบรายงานผลรายบุคคล — ต้นแบบยังไม่ต่อกับผลตรวจรายเคสจริง
       จึงพิมพ์เป็นใบตัวอย่าง 1 ราย พร้อมป้ายกำกับให้ชัดว่าเป็นตัวอย่าง */
    return (
      <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
        <SheetSectionLabel>
          {`${lang === 'en' ? format.en : format.th} · ${t(lang, 'sampleOne')}`}
        </SheetSectionLabel>
        <SheetTable
          head={[
            { key: 'field', label: lang === 'en' ? 'Field' : 'รายการ' },
            { key: 'value', label: lang === 'en' ? 'Value' : 'ข้อมูล' },
          ]}
          body={[
            { key: 'id', cells: [t(lang, 'examineeId'), sample?.id || '—'] },
            { key: 'org', cells: [t(lang, 'org'), organizationLabel(sample?.org, lang)] },
            { key: 'center', cells: [t(lang, 'center'), sample?.center || '—'] },
            { key: 'year', cells: [t(lang, 'year'), sample?.year || year] },
            { key: 'gender', cells: [t(lang, 'gender'), sample ? genderLabel(sample.gender) : '—'] },
            { key: 'age', cells: [t(lang, 'age'), sample ? num(sample.age) : '—'] },
            { key: 'result', cells: [t(lang, 'result'), riskFactorLabel(sample?.risk, lang)] },
            {
              key: 'followUp',
              cells: [
                t(lang, 'followUp'),
                sample?.followUp
                  ? (lang === 'en' ? 'Yes' : 'ต้องติดตาม')
                  : (lang === 'en' ? 'No' : 'ไม่ต้องติดตาม'),
              ],
            },
            {
              key: 'advice',
              cells: [
                t(lang, 'advice'),
                sample && sample.risk !== 'normal'
                  ? (lang === 'en'
                    ? 'Refer to the chronic-disease clinic for follow-up'
                    : 'ส่งต่อคลินิกโรคเรื้อรังเพื่อติดตามผล')
                  : (lang === 'en'
                    ? 'Repeat the annual check-up as scheduled'
                    : 'ตรวจสุขภาพประจำปีครั้งถัดไปตามกำหนด'),
              ],
            },
          ]}
        />
        <span
          style={{
            color: 'var(--text-content-tertiary)',
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-xs)',
            lineHeight: 1.6,
          }}
        >
          {lang === 'en'
            ? 'This prototype prints one sample examinee. The production report prints one sheet per examinee with reference ranges from the laboratory result set.'
            : 'ต้นแบบนี้พิมพ์ตัวอย่าง 1 ราย — ระบบจริงจะพิมพ์ใบรายงานแยกรายบุคคลพร้อมค่าอ้างอิงจากผลตรวจทางห้องปฏิบัติการ'}
        </span>
      </div>
    );
  };

  return (
    <div
      className='mih-checkup-print-sheet w-full'
      style={{
        background: 'var(--surface-card-100, #FFFFFF)',
        border: 'var(--dim-stroke-100) solid var(--border-card-default)',
        borderRadius: 'var(--dim-radius-300, 10px)',
        paddingTop: 'var(--dim-space-600)',
        paddingBottom: 'var(--dim-space-600)',
        paddingLeft: 'var(--dim-space-600)',
        paddingRight: 'var(--dim-space-600)',
        maxWidth: 'var(--dim-size-2900, 640px)',
        marginLeft: 'auto',
        marginRight: 'auto',
      }}
    >
      <div className='flex flex-col items-center' style={{ gap: 'var(--dim-space-100)' }}>
        <span
          style={{
            color: 'var(--text-content-default)',
            fontFamily: 'var(--type-family-heading-graphic2)',
            fontSize: 'var(--type-size-lg, 18px)',
          }}
        >
          {lang === 'en' ? 'Department of Health, Bangkok Metropolitan Administration' : 'สำนักอนามัย กรุงเทพมหานคร'}
        </span>
        <span
          style={{
            color: 'var(--text-brandPrimary-default)',
            fontFamily: 'var(--type-family-heading-graphic2)',
            fontSize: 'var(--type-size-base)',
          }}
        >
          {lang === 'en' ? format.en : format.th}
        </span>
        <span
          style={{
            color: 'var(--text-content-tertiary)',
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-xs)',
          }}
        >
          {t(lang, 'year')} {year} · {t(lang, 'org')}: {orgKey === 'all'
            ? (lang === 'en' ? 'All organizations' : 'ทุกหน่วยงาน')
            : organizationLabel(orgKey, lang)}
        </span>
      </div>

      <div
        className='w-full flex flex-wrap'
        style={{
          gap: 'var(--dim-space-400)',
          marginTop: 'var(--dim-space-500)',
          marginBottom: 'var(--dim-space-400)',
        }}
      >
        <StatTile label={t(lang, 'total')} value={total.toLocaleString('th-TH')} unit={t(lang, 'people')} />
        <StatTile label={t(lang, 'normal')} value={normal.toLocaleString('th-TH')} unit={t(lang, 'people')} />
        <StatTile label={t(lang, 'abnormal')} value={abnormal.toLocaleString('th-TH')} unit={t(lang, 'people')} tone='warning' />
        <StatTile label={`${t(lang, 'abnormal')} (%)`} value={`${safePct(abnormal, total)}%`} tone='warning' />
      </div>

      {renderBody()}

      <div
        className='flex items-center justify-between w-full flex-wrap'
        style={{ gap: 'var(--dim-space-300)', marginTop: 'var(--dim-space-500)' }}
      >
        <span
          style={{
            color: 'var(--text-content-tertiary)',
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-xs)',
          }}
        >
          {t(lang, 'printedAt')}: {printedAt} · {t(lang, 'printedBy')}: {PHCIS_CURRENT_USER.displayName}
        </span>
        <span
          style={{
            color: 'var(--text-content-tertiary)',
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-xs)',
          }}
        >
          {DASHBOARD_EXPORT_FOOTER}
        </span>
      </div>
    </div>
  );
};

/* ── page ────────────────────────────────────────────────────────────────── */

const CheckupAnalyticsPage = () => {
  const [lang, setLang] = useState(DEFAULT_LANG);
  const [year, setYear] = useState(DEFAULT_YEAR);
  const [pageDate, setPageDate] = useState({ quick: 'thisyear' });
  /* ชิป `ปีงบ:` บนหัวหน้าจอเป็นตัวเดียวกับปีงบที่กรองข้อมูลของหน้านี้ —
     เลือกช่วงวันแล้วถ้าตรงรอบปีงบไหน ให้ `year` เดินตามทันที ไม่ต้องมีสองที่ */
  const handleHeaderDate = (next) => {
    setPageDate(next);
    const be = fiscalYearOf(next);
    if (be) setYear(be);
  };
  const [org, setOrg] = useState(DEFAULT_ORG);
  const [formatKey, setFormatKey] = useState(DEFAULT_FORMAT);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [emailForm, setEmailForm] = useState({ to: '', subject: '', message: '' });
  const [emailTouched, setEmailTouched] = useState(false);
  const [sendLog, setSendLog] = useState([]);
  const [viewBundle, setViewBundle] = useState(null);
  const [exportReport, setExportReport] = useState(null);
  const [exportScopeKeys, setExportScopeKeys] = useState(null);
  const [exported, setExported] = useState(false);
  const [toast, setToast] = useState('');

  /* §1.20.8.1 — กฎ @page/@media print มีผลเฉพาะตอนเปิดตัวอย่างก่อนพิมพ์ */
  useCheckupPrintStyles(previewOpen);

  const rows = useMemo(() => CHECKUP_RESULTS.filter((r) => {
    if (year !== 'all' && r.year !== year) return false;
    if (org !== 'all' && r.org !== org) return false;
    return true;
  }), [year, org]);

  const total = rows.length;
  const normalCount = rows.filter((r) => r.risk === 'normal').length;
  const abnormalCount = total - normalCount;
  const followUpCount = rows.filter((r) => r.followUp).length;

  /* §1.20.8.3 — risk factors */
  const riskCounts = useMemo(() => checkupCountsByRisk(rows), [rows]);
  const riskDonut = useMemo(() => [...riskCounts.entries()]
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([key, value], i) => ({
      label: riskFactorLabel(key, lang),
      value,
      color: key === 'normal' ? PHCIS_CHART.teal : PHCIS_CHART_PALETTE[(i + 1) % PHCIS_CHART_PALETTE.length],
    })), [riskCounts, lang]);

  const riskiestOrgs = useMemo(() => {
    const map = new Map();
    rows.forEach((r) => {
      const e = map.get(r.org) || { org: r.org, total: 0, abnormal: 0 };
      e.total += 1;
      if (r.risk !== 'normal') e.abnormal += 1;
      map.set(r.org, e);
    });
    return [...map.values()]
      .map((e) => ({ ...e, id: e.org, pct: safePct(e.abnormal, e.total, 0) }))
      .sort((a, b) => b.pct - a.pct);
  }, [rows]);

  const riskOrgHbar = useMemo(
    () => hbarRows(
      riskiestOrgs.slice(0, 6).map((o) => ({ label: organizationLabel(o.org, lang), value: o.pct })),
      PHCIS_CHART.pink,
      '%',
    ),
    [riskiestOrgs, lang],
  );

  /* §1.20.8.4 — แนวโน้มต่อเนื่อง ≥ 3 ปีงบประมาณ
     AreaLineChart (component กลาง) รับได้เฉพาะตัวเลข และไม่มี prop สำหรับเว้นช่วง
     ปีที่ไม่มีข้อมูลจึงห้ามยัดค่า 0 หลอกลงไป (0% = "ไม่พบภาวะนี้เลย" ซึ่งไม่จริง)
     วิธีที่ซื่อสัตย์โดยไม่แตะ component กลาง: ตัดแกน X ให้เหลือช่วงปี "ต่อเนื่อง"
     ที่ทุกตัวชี้วัดที่วาดมีข้อมูลครบ แล้วบอกปีที่ตัดออกไว้ใน hint —
     ปีที่ไม่มีข้อมูลยังเห็นครบในตารางด้านล่าง (แสดงเป็น “—”) */
  const trendChart = useMemo(() => {
    const perIndicator = CHECKUP_TREND_INDICATORS.map((ind, i) => ({
      ind,
      color: PHCIS_CHART_PALETTE[i % PHCIS_CHART_PALETTE.length],
      points: checkupTrendByYear(ind.key),
    }));

    /* ช่วงต่อเนื่องล่าสุดของแต่ละตัวชี้วัด → ตัดเหลือส่วนที่ทับกันทั้งหมด */
    let start = 0;
    let end = CHECKUP_FISCAL_YEARS.length - 1;
    perIndicator.forEach(({ points }) => {
      let e = points.length - 1;
      while (e >= 0 && points[e].value == null) e -= 1;
      if (e < 0) return; /* ตัวชี้วัดที่ไม่มีข้อมูลเลย ไม่ควรบีบแกนของตัวอื่น */
      let s = e;
      while (s - 1 >= 0 && points[s - 1].value != null) s -= 1;
      if (s > start) start = s;
      if (e < end) end = e;
    });

    if (end < start) return { months: [], series: [], omittedYears: [] };

    const months = CHECKUP_FISCAL_YEARS.slice(start, end + 1);
    const series = perIndicator
      .filter(({ points }) => points.slice(start, end + 1).every((p) => p.value != null))
      .map(({ ind, color, points }) => ({
        label: lang === 'en' ? ind.en : ind.th,
        color,
        values: points.slice(start, end + 1).map((p) => p.value),
      }));
    const omittedYears = [
      ...CHECKUP_FISCAL_YEARS.slice(0, start),
      ...CHECKUP_FISCAL_YEARS.slice(end + 1),
    ];
    return { months, series, omittedYears };
  }, [lang]);

  const trendTableRows = useMemo(() => CHECKUP_TREND_INDICATORS.map((ind) => {
    const points = checkupTrendByYear(ind.key);
    const row = { id: ind.key, indicator: lang === 'en' ? ind.en : ind.th };
    points.forEach((p) => { row[`y${p.year}`] = p.value; });
    const first = points.find((p) => p.value != null);
    const last = [...points].reverse().find((p) => p.value != null);
    row.change = first && last && first !== last
      ? Math.round((last.value - first.value) * 10) / 10
      : null;
    return row;
  }), [lang]);

  const missingYears = useMemo(() => {
    const list = [];
    CHECKUP_TREND_INDICATORS.forEach((ind) => {
      checkupTrendByYear(ind.key).forEach((p) => {
        if (p.value == null) list.push(`${lang === 'en' ? ind.en : ind.th} · ${p.year}`);
      });
    });
    return list;
  }, [lang]);

  /* export rows */
  const exportRiskSummaryRows = useMemo(
    () => RISK_FACTORS.map((rf) => {
      const count = riskCounts.get(rf.key) || 0;
      return { id: rf.key, risk: rf.key, count, pct: safePct(count, total) };
    }),
    [riskCounts, total],
  );

  const exportOrgSummaryRows = useMemo(() => {
    const map = new Map();
    CHECKUP_RESULTS.forEach((r) => {
      const key = `${r.org}|${r.year}`;
      const e = map.get(key) || { id: key, org: r.org, year: r.year, total: 0, normal: 0, abnormal: 0, followUp: 0 };
      e.total += 1;
      if (r.risk === 'normal') e.normal += 1; else e.abnormal += 1;
      if (r.followUp) e.followUp += 1;
      map.set(key, e);
    });
    return [...map.values()].sort(
      (a, b) => String(b.year).localeCompare(String(a.year)) || b.total - a.total,
    );
  }, []);

  const reportsCatalog = useMemo(() => [
    buildExportReport('risk-summary', lang === 'en' ? 'Check-up results by risk factor' : 'รายงานผลการตรวจสุขภาพตามปัจจัยเสี่ยง', riskSummaryColumns(lang), exportRiskSummaryRows),
    buildExportReport('risk-org', lang === 'en' ? 'Organizations with the highest risk' : 'รายงานหน่วยงานที่พบความเสี่ยงสูงสุด', riskOrgColumns(lang), riskiestOrgs),
    buildExportReport('trend-year', lang === 'en' ? 'Multi-year check-up indicators' : 'รายงานผลการตรวจสุขภาพต่อเนื่องรายปีงบประมาณ', trendColumns(lang), trendTableRows),
    buildExportReport('format-org-summary', lang === 'en' ? 'Organization summary report' : 'รายงานสรุปผลตรวจสุขภาพรายหน่วยงาน', orgSummaryColumns(lang), exportOrgSummaryRows),
  ], [lang, exportRiskSummaryRows, riskiestOrgs, trendTableRows, exportOrgSummaryRows]);

  const exportTopics = useMemo(
    () => reportsCatalog.map((r) => ({ value: r.key, label: r.title })),
    [reportsCatalog],
  );

  const openExport = (keyOrReport, scopeKeys = null) => {
    setExportScopeKeys(scopeKeys);
    if (keyOrReport === 'all' || keyOrReport?.key === 'all') {
      setExportReport({ key: 'all', title: lang === 'en' ? 'All check-up reports' : 'รายงานตรวจสุขภาพทั้งหมด' });
      return;
    }
    if (typeof keyOrReport === 'string') {
      setExportReport(reportsCatalog.find((r) => r.key === keyOrReport) || { key: keyOrReport, title: 'รายงาน' });
      return;
    }
    setExportReport(keyOrReport);
  };

  const openExportGroup = (groupKey, title) => {
    const keys = EXPORT_GROUP_KEYS[groupKey] || [];
    if (keys.length === 1) { openExport(keys[0]); return; }
    openExport({ key: 'all', title }, keys);
  };

  const openViewGroup = (groupKey, title) => {
    const keys = EXPORT_GROUP_KEYS[groupKey] || [];
    const reports = keys.map((k) => reportsCatalog.find((r) => r.key === k)).filter(Boolean);
    if (!reports.length) return;
    setViewBundle({ key: groupKey, title, reports });
  };

  const scopedCatalog = useMemo(() => {
    if (!exportScopeKeys?.length) return reportsCatalog;
    return reportsCatalog.filter((r) => exportScopeKeys.includes(r.key));
  }, [reportsCatalog, exportScopeKeys]);

  const scopedTopics = useMemo(() => {
    if (!exportScopeKeys?.length) return exportTopics;
    return exportTopics.filter((t2) => exportScopeKeys.includes(t2.value));
  }, [exportTopics, exportScopeKeys]);

  /* §1.20.8.2 — share link + e-mail */
  const reportLink = typeof window !== 'undefined'
    ? `${window.location.origin}/dashboard/reports/checkup?year=${year}&org=${org}&format=${formatKey}&lang=${lang}`
    : `/dashboard/reports/checkup?year=${year}&org=${org}&format=${formatKey}&lang=${lang}`;

  const copyLink = () => {
    try {
      if (navigator?.clipboard?.writeText) navigator.clipboard.writeText(reportLink);
    } catch (err) {
      /* clipboard ถูกปิด — ผู้ใช้ยังคัดลอกจากช่องข้อความด้านล่างได้ */
    }
    setToast(lang === 'en' ? 'Report link copied' : 'คัดลอกลิงก์รายงานแล้ว');
  };

  const emailInvalid = emailTouched && !EMAIL_RE.test(emailForm.to.trim());
  const emailReady = EMAIL_RE.test(emailForm.to.trim()) && emailForm.subject.trim().length > 0;
  const emailDirty = !!(emailForm.to || emailForm.subject || emailForm.message);

  const closeEmail = () => {
    if (emailDirty) { setDiscardOpen(true); return; }
    setEmailOpen(false);
  };

  const discardEmail = () => {
    setEmailForm({ to: '', subject: '', message: '' });
    setEmailTouched(false);
    setDiscardOpen(false);
    setEmailOpen(false);
  };

  const sendEmail = () => {
    const now = new Date();
    const stamp = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    setSendLog((prev) => [{
      id: `send-${now.getTime()}`,
      to: emailForm.to.trim(),
      subject: emailForm.subject.trim(),
      at: `${formatIsoDateThai(toIsoDate(now))} ${stamp}`,
      by: PHCIS_CURRENT_USER.displayName,
      format: CHECKUP_REPORT_FORMATS.find((f) => f.key === formatKey)?.th || formatKey,
      lang: lang === 'en' ? 'English' : 'ไทย',
    }, ...prev]);
    setEmailForm({ to: '', subject: '', message: '' });
    setEmailTouched(false);
    setEmailOpen(false);
    setToast(lang === 'en' ? 'Report sent by e-mail (mock)' : 'ส่งรายงานทางอีเมลแล้ว (จำลอง)');
  };

  const filtersActive = year !== DEFAULT_YEAR
    || org !== DEFAULT_ORG
    || formatKey !== DEFAULT_FORMAT
    || lang !== DEFAULT_LANG;

  const { showClearChip, resultsOpaque, clearFilters } = useSmoothClearFilters(
    filtersActive,
    () => {
      setYear(DEFAULT_YEAR);
      setOrg(DEFAULT_ORG);
      setFormatKey(DEFAULT_FORMAT);
      setLang(DEFAULT_LANG);
    },
  );

  const summaryCards = useMemo(() => ([
    { key: 'total',    label: t(lang, 'total'),    value: total.toLocaleString('th-TH'),          indicator: `${t(lang, 'year')} ${year}`, color: 'brand',       icon: 'assignment' },
    { key: 'normal',   label: t(lang, 'normal'),   value: normalCount.toLocaleString('th-TH'),    indicator: `${safePct(normalCount, total)}%`, color: 'positive', icon: 'check_circle' },
    { key: 'abnormal', label: t(lang, 'abnormal'), value: abnormalCount.toLocaleString('th-TH'),  indicator: `${safePct(abnormalCount, total)}%`, color: 'destructive', icon: 'warning' },
    { key: 'follow',   label: lang === 'en' ? 'Referred for follow-up' : 'ส่งต่อเพื่อติดตาม', value: followUpCount.toLocaleString('th-TH'), indicator: `${safePct(followUpCount, abnormalCount)}% ${lang === 'en' ? 'of abnormal' : 'ของผลผิดปกติ'}`, color: 'inprogress', icon: 'follow_the_signs' },
    { key: 'orgs',     label: lang === 'en' ? 'Organizations' : 'หน่วยงานที่เข้ารับการตรวจ', value: riskiestOrgs.length, indicator: lang === 'en' ? 'in scope' : 'ในขอบเขตที่เลือก', color: 'info', icon: 'domain' },
    { key: 'years',    label: lang === 'en' ? 'Years of data' : 'ปีที่มีข้อมูล', value: CHECKUP_FISCAL_YEARS.length, indicator: 'TOR 1.20.8.4', color: 'brand', icon: 'timeline' },
  ]), [lang, total, normalCount, abnormalCount, followUpCount, riskiestOrgs, year]);

  return (
    <QueuePageShell
      activeKey='dashboard'
      breadcrumb={breadcrumb}
      title={t(lang, 'pageTitle')}
      afterTitle={(
        <DashboardHeaderFilters
          dateFilter={pageDate}
          onDateFilterChange={handleHeaderDate}
          defaultQuick='thisyear'
          templateValue={screenValue('checkup')}
        ></DashboardHeaderFilters>
      )}
    >
      <div
        className='flex flex-col flex-1 min-w-0'
        style={{
          paddingTop: 'var(--dim-space-600)',
          paddingRight: 'var(--dim-space-600)',
          paddingBottom: 'var(--dim-space-600)',
          paddingLeft: 'var(--dim-space-600)',
          gap: 'var(--dim-space-600)',
        }}
      >
        {/* การ์ดสรุปอยู่ใต้แถบ Tab (มติผู้ใช้ 27 ส.ค. 69) — `summaryCards` ของ
            QueuePageShell ถูกวางเหนือ tab เสมอ จึง render เองตรงนี้แทน */}
        <section className='w-full flex items-stretch flex-wrap' style={{ ...CARD, gap: 'var(--dim-space-400)' }}>
          {summaryCards.map((card) => (
            <SummaryCard key={card.key} card={card} variant='panel' />
          ))}
        </section>

        <ReportToolbar
          trailing={(
            <NeutralSubdueButton leadingIcon='ios_share' size='md' onClick={() => openExport('all')}>
              {t(lang, 'export')}
            </NeutralSubdueButton>
          )}
        >
          {/* ตัวควบคุมช่วงเวลาของหน้านี้คือ “ปีงบประมาณ” (1 ต.ค. – 30 ก.ย.)
              ไม่ใช่ช่วงวันแบบหน้ารายงานอื่น เพราะผลตรวจสุขภาพหน่วยงานสรุปเป็นรอบปี */}
          {/* ตัวกรองวัน — คู่กับปีงบประมาณ ให้ครบทุกหน้าแดชบอร์ด
              (มติผู้ใช้ 27 ส.ค. 69) */}
          <FilterDateTag prefix='วัน:' value={pageDate} onChange={setPageDate} defaultQuick='thisyear' />
          <div style={{ width: 'var(--dim-size-2200, 192px)' }}>
            <Dropdown size='md' value={org} onChange={setOrg} options={ORG_OPTIONS} placeholder={t(lang, 'org')} />
          </div>
          {/* §1.20.8.5 — ทั้งหน้าจอ ตัวอย่างก่อนพิมพ์ และหัวคอลัมน์ที่ส่งออก */}
          <div className='flex items-center' style={{ gap: 'var(--dim-space-150)' }}>
            <FilterTag value='ไทย' selected={lang === 'th'} onClick={() => setLang('th')} />
            <FilterTag value='English' selected={lang === 'en'} onClick={() => setLang('en')} />
          </div>
          <ClearFiltersTag active={showClearChip} onClear={clearFilters} />
        </ReportToolbar>

        <SmoothFilterResults opaque={resultsOpaque}>
          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-600)' }}>

            {/* ── 1.20.8.1 + 1.20.8.2 ──────────────────────────────────── */}
            <ReportGroupCard
              title={lang === 'en' ? 'Print & deliver the report' : 'ออกรายงานและนำส่งรายงาน'}
              subtitle={lang === 'en'
                ? 'TOR 1.20.8.1 print in the Department of Health format · 1.20.8.2 online link and e-mail'
                : 'TOR 1.20.8.1 พิมพ์ตามรูปแบบที่สำนักอนามัยกำหนด · 1.20.8.2 รายงานออนไลน์และส่งอีเมล'}
              onView={() => openViewGroup('format', lang === 'en' ? 'Organization summary report' : 'รายงานสรุปผลตรวจสุขภาพรายหน่วยงาน')}
              onExport={() => openExportGroup('format', lang === 'en' ? 'Organization summary report' : 'รายงานสรุปผลตรวจสุขภาพรายหน่วยงาน')}
            >
              <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
                <div className='flex items-end flex-wrap w-full' style={{ gap: 'var(--dim-space-300)' }}>
                  <div style={{ width: 'var(--dim-size-2500, 320px)', maxWidth: '100%' }}>
                    <Dropdown
                      size='md'
                      value={formatKey}
                      onChange={setFormatKey}
                      options={CHECKUP_REPORT_FORMATS.map((f) => ({ value: f.key, label: lang === 'en' ? f.en : f.th }))}
                      placeholder={t(lang, 'reportFormat')}
                    />
                  </div>
                  <NeutralSubdueButton size='md' leadingIcon='visibility' onClick={() => setPreviewOpen(true)}>
                    {t(lang, 'preview')}
                  </NeutralSubdueButton>
                  <NeutralSubdueButton size='md' leadingIcon='link' onClick={copyLink}>
                    {t(lang, 'shareLink')}
                  </NeutralSubdueButton>
                  <NeutralSubdueButton size='md' leadingIcon='mail' onClick={() => setEmailOpen(true)}>
                    {t(lang, 'email')}
                  </NeutralSubdueButton>
                </div>

                <span
                  style={{
                    color: 'var(--text-content-tertiary)',
                    fontFamily: 'var(--type-family-body)',
                    fontSize: 'var(--type-size-xs)',
                    lineHeight: 1.6,
                  }}
                >
                  {CHECKUP_REPORT_FORMATS.find((f) => f.key === formatKey)?.[lang === 'en' ? 'descEn' : 'descTh']}
                </span>

                {sendLog.length ? (
                  <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200)' }}>
                    <span
                      style={{
                        color: 'var(--text-brandPrimary-default)',
                        fontFamily: 'var(--type-family-heading-graphic2)',
                        fontSize: 'var(--type-size-sm)',
                      }}
                    >
                      {lang === 'en' ? 'Delivery history' : 'ประวัติการนำส่งรายงาน'}
                    </span>
                    <Table
                      columns={[
                        { key: 'at', label: lang === 'en' ? 'Sent at' : 'เวลาที่ส่ง', flex: true, minWidth: 200 },
                        { key: 'to', label: lang === 'en' ? 'Recipient' : 'ผู้รับ', flex: true, minWidth: 220 },
                        { key: 'subject', label: lang === 'en' ? 'Subject' : 'เรื่อง', flex: true, minWidth: 240 },
                        { key: 'format', label: lang === 'en' ? 'Format' : 'รูปแบบ', flex: true, minWidth: 200 },
                        { key: 'lang', label: lang === 'en' ? 'Language' : 'ภาษา' },
                        { key: 'by', label: lang === 'en' ? 'Sent by' : 'ผู้ส่ง', flex: true, minWidth: 180 },
                      ]}
                      rows={sendLog}
                      rowKey={(r) => r.id}
                      emptyMessage={lang === 'en' ? 'No delivery yet' : 'ยังไม่มีการนำส่ง'}
                      pagination={false}
                    />
                  </div>
                ) : null}
              </div>
            </ReportGroupCard>

            {/* ── 1.20.8.3 ─────────────────────────────────────────────── */}
            <ReportGroupCard
              title={lang === 'en' ? 'Results by risk factor' : 'ผลการตรวจสุขภาพตามปัจจัยเสี่ยง'}
              subtitle='TOR 1.20.8.3'
              onView={() => openViewGroup('risk', lang === 'en' ? 'Results by risk factor' : 'ผลการตรวจสุขภาพตามปัจจัยเสี่ยง')}
              onExport={() => openExportGroup('risk', lang === 'en' ? 'Risk factor reports' : 'รายงานตามปัจจัยเสี่ยง')}
            >
              <StatTileRow>
                <StatTile label={t(lang, 'total')} value={total.toLocaleString('th-TH')} unit={t(lang, 'people')} />
                <StatTile label={t(lang, 'normal')} value={normalCount.toLocaleString('th-TH')} unit={t(lang, 'people')} />
                <StatTile label={t(lang, 'abnormal')} value={abnormalCount.toLocaleString('th-TH')} unit={t(lang, 'people')} tone='warning' />
                <StatTile
                  label={lang === 'en' ? 'Abnormal rate' : 'อัตราผลผิดปกติ'}
                  value={`${safePct(abnormalCount, total)}%`}
                  tone='warning'
                  hint={total === 0 ? t(lang, 'noData') : undefined}
                />
              </StatTileRow>
              <ChartsRow>
                <ChartPanel title={lang === 'en' ? 'Distribution by risk factor' : 'สัดส่วนผลตรวจตามกลุ่มเสี่ยง'}>
                  {riskDonut.length ? (
                    <DonutWithLegend
                      segments={riskDonut}
                      size={180}
                      centerLabel={total.toLocaleString('th-TH')}
                      centerSub={t(lang, 'people')}
                    />
                  ) : <EmptyChartNote text={t(lang, 'noData')} />}
                </ChartPanel>
                <ChartPanel
                  title={lang === 'en' ? 'Organizations with the highest abnormal rate' : 'หน่วยงานที่พบความเสี่ยงสูงสุด'}
                  alignContent='start'
                >
                  {riskOrgHbar.length ? (
                    <div className='w-full'><HBarList valueLabel='%' rows={riskOrgHbar} /></div>
                  ) : <EmptyChartNote text={t(lang, 'noData')} />}
                </ChartPanel>
              </ChartsRow>
            </ReportGroupCard>

            {/* ── 1.20.8.4 ─────────────────────────────────────────────── */}
            <ReportGroupCard
              title={lang === 'en' ? 'Multi-year check-up trend (≥ 3 fiscal years)' : 'ผลการตรวจสุขภาพต่อเนื่อง (อย่างน้อย 3 ปีงบประมาณ)'}
              subtitle='TOR 1.20.8.4'
              onView={() => openViewGroup('trend', lang === 'en' ? 'Multi-year indicators' : 'ตัวชี้วัดต่อเนื่องรายปี')}
              onExport={() => openExportGroup('trend', lang === 'en' ? 'Multi-year report' : 'รายงานต่อเนื่องรายปี')}
            >
              <ChartsRow>
                <ChartPanel
                  title={lang === 'en'
                    ? `Indicator trend by fiscal year${trendChart.months.length ? ` (FY ${trendChart.months[0]}–${trendChart.months[trendChart.months.length - 1]})` : ''}`
                    : `แนวโน้มตัวชี้วัดรายปีงบประมาณ${trendChart.months.length ? ` (ปีงบ ${trendChart.months[0]}–${trendChart.months[trendChart.months.length - 1]})` : ''}`}
                  hint={trendChart.omittedYears.length
                    ? (lang === 'en'
                      ? `FY ${trendChart.omittedYears.join(', ')} is not plotted because some indicators have no data for it — the table below keeps every year and shows gaps as “—”`
                      : `ไม่วาดปีงบ ${trendChart.omittedYears.join(', ')} เพราะบางตัวชี้วัดยังไม่มีข้อมูลปีนั้น (กราฟไม่แสดงค่า 0 หลอก) — ตารางด้านล่างยังแสดงครบทุกปีและใช้ “—” แทนปีที่ไม่มีข้อมูล`)
                    : undefined}
                >
                  <div className='w-full'>
                    {trendChart.months.length >= 2 && trendChart.series.length ? (
                      <AreaLineChart
                        months={trendChart.months}
                        series={trendChart.series}
                        height={280}
                      />
                    ) : (
                      <EmptyChartNote
                        text={t(lang, 'noData')}
                        hint={lang === 'en'
                          ? 'At least two fiscal years with complete data are needed to draw the trend'
                          : 'ต้องมีข้อมูลครบอย่างน้อย 2 ปีงบประมาณจึงจะวาดกราฟแนวโน้มได้'}
                      />
                    )}
                  </div>
                </ChartPanel>
              </ChartsRow>
              <Table
                columns={trendColumns(lang)}
                rows={trendTableRows}
                rowKey={(r) => r.id}
                emptyMessage={t(lang, 'noData')}
                pagination={false}
              />
            </ReportGroupCard>

          </div>
        </SmoothFilterResults>

        <section className='w-full flex flex-col' style={{ ...CARD, gap: 'var(--dim-space-200)' }}>
          <span
            style={{
              color: 'var(--text-content-tertiary)',
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-xs)',
              lineHeight: 1.6,
            }}
          >
            {lang === 'en'
              ? 'E-mail delivery in this prototype is mocked: the recipient, subject, sender and timestamp are recorded in the delivery history, but no message leaves the browser. Real delivery requires the mail gateway on the server side.'
              : 'การส่งอีเมลในต้นแบบนี้เป็นการจำลอง — ระบบบันทึกผู้รับ เรื่อง ผู้ส่ง และเวลาไว้ในประวัติการนำส่ง แต่ยังไม่มีการส่งออกจากเบราว์เซอร์จริง การส่งจริงต้องต่อกับ mail gateway ฝั่งเซิร์ฟเวอร์'}
          </span>
        </section>
      </div>

      {/* ── ตัวอย่างก่อนพิมพ์ (§1.20.8.1) ─────────────────────────────── */}
      <Popup
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        size='extraLarge'
        title={t(lang, 'preview')}
        subtitle={lang === 'en'
          ? 'A4 layout following the Department of Health report format'
          : 'ขนาด A4 ตามรูปแบบรายงานที่สำนักอนามัยกำหนด'}
        primaryAction={{ label: t(lang, 'print'), onClick: () => { if (typeof window !== 'undefined') window.print(); } }}
        secondaryAction={{ label: t(lang, 'export'), onClick: () => { setPreviewOpen(false); openExport('format-org-summary'); } }}
        tertiaryAction={{ label: lang === 'en' ? 'Close' : 'ปิด', onClick: () => setPreviewOpen(false) }}
      >
        <div className='w-full' style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          <PrintPreview lang={lang} formatKey={formatKey} year={year} orgKey={org} rows={rows} />
        </div>
      </Popup>

      {/* สำเนาสำหรับพิมพ์ — ต้องเป็นลูกโดยตรงของ <body> เพราะ Popup อยู่ใน
          portal ที่ overflow:hidden (พิมพ์จากในป๊อปอัปจะโดน clip)
          ซ่อนอยู่บนจอเสมอ และแสดงเฉพาะใน @media print */}
      {previewOpen && typeof document !== 'undefined'
        ? createPortal(
          <div className='mih-checkup-print-portal'>
            <PrintPreview lang={lang} formatKey={formatKey} year={year} orgKey={org} rows={rows} />
          </div>,
          document.body,
        )
        : null}

      {/* ── ส่งรายงานทางอีเมล (§1.20.8.2) ─────────────────────────────── */}
      <Popup
        open={emailOpen}
        onClose={closeEmail}
        size='large'
        title={t(lang, 'email')}
        subtitle={lang === 'en'
          ? 'The report link and the selected format are attached to the message.'
          : 'ระบบจะแนบลิงก์รายงานและรูปแบบที่เลือกไปกับข้อความ'}
        primaryAction={{ label: lang === 'en' ? 'Send' : 'ส่งอีเมล', onClick: sendEmail, disabled: !emailReady }}
        secondaryAction={{ label: lang === 'en' ? 'Cancel' : 'ยกเลิก', onClick: closeEmail }}
      >
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
          <InputField
            label={lang === 'en' ? 'Recipient e-mail' : 'อีเมลผู้รับ'}
            required
            size='md'
            type='email'
            value={emailForm.to}
            onChange={(v) => { setEmailForm((p) => ({ ...p, to: v })); setEmailTouched(true); }}
            placeholder='name@bangkok.go.th'
            showLeadingIcon={false}
            error={emailInvalid ? (lang === 'en' ? 'Invalid e-mail address' : 'รูปแบบอีเมลไม่ถูกต้อง') : undefined}
            helperText={emailInvalid ? (lang === 'en' ? 'Invalid e-mail address' : 'รูปแบบอีเมลไม่ถูกต้อง') : undefined}
            showHelperText={emailInvalid}
          />
          <InputField
            label={lang === 'en' ? 'Subject' : 'เรื่อง'}
            required
            size='md'
            value={emailForm.subject}
            onChange={(v) => setEmailForm((p) => ({ ...p, subject: v }))}
            placeholder={lang === 'en' ? 'Health check-up report' : 'รายงานผลการตรวจสุขภาพ'}
            showLeadingIcon={false}
            showHelperText={false}
          />
          <SuggestibleTextarea
            voice
            label={lang === 'en' ? 'Message' : 'ข้อความถึงผู้รับ'}
            value={emailForm.message}
            onChange={(e) => setEmailForm((p) => ({ ...p, message: e.target.value }))}
            placeholder={lang === 'en' ? 'Message to the recipient…' : 'ระบุข้อความถึงผู้รับ…'}
            suggestions={EMAIL_MESSAGE_SUGGESTIONS}
            minChars={3}
            popoverAriaLabel={lang === 'en' ? 'Message suggestions' : 'คำแนะนำข้อความ'}
          />
          <div
            className='flex items-start w-full'
            style={{
              gap: 'var(--dim-space-200)',
              background: 'var(--surface-brandPrimary-quaternary, #F4FBF8)',
              borderRadius: 'var(--dim-radius-300, 10px)',
              paddingTop: 'var(--dim-space-300)',
              paddingBottom: 'var(--dim-space-300)',
              paddingLeft: 'var(--dim-space-300)',
              paddingRight: 'var(--dim-space-300)',
            }}
          >
            <span style={{ color: 'var(--text-brandPrimary-default)' }}>
              <Icon name='link' size={16} />
            </span>
            <span
              className='min-w-0 break-all'
              style={{
                color: 'var(--text-content-secondary)',
                fontFamily: 'var(--type-family-body)',
                fontSize: 'var(--type-size-xs)',
              }}
            >
              {reportLink}
            </span>
          </div>
        </div>
      </Popup>

      <Popup
        open={discardOpen}
        onClose={() => setDiscardOpen(false)}
        title={lang === 'en' ? 'Discard the message?' : 'ยกเลิกการส่งอีเมล?'}
        subtitle={lang === 'en'
          ? 'The text you typed will not be saved.'
          : 'ข้อความที่พิมพ์ไว้จะไม่ถูกบันทึก'}
        primaryAction={{ label: lang === 'en' ? 'Discard' : 'ยกเลิกและปิด', onClick: discardEmail }}
        secondaryAction={{ label: lang === 'en' ? 'Keep editing' : 'แก้ไขต่อ', onClick: () => setDiscardOpen(false) }}
      />

      <ReportViewPopup
        open={!!viewBundle}
        bundle={viewBundle}
        onClose={() => setViewBundle(null)}
        onExportReport={(report) => { if (report) openExport(report); }}
        footnote={viewBundle?.key === 'trend' && missingYears.length
          ? (lang === 'en'
            ? 'Cells shown as “—” have no data for that fiscal year and are excluded from the change column.'
            : 'ช่องที่แสดง “—” คือปีที่ยังไม่มีข้อมูล และไม่ถูกนำมาคิดคอลัมน์การเปลี่ยนแปลง')
          : null}
      />

      <ExportFormatPopup
        open={!!exportReport}
        report={exportReport}
        reportsCatalog={scopedCatalog}
        topics={scopedTopics}
        onClose={() => { setExportReport(null); setExportScopeKeys(null); }}
        onExported={() => setExported(true)}
        documentFooter={DASHBOARD_EXPORT_FOOTER}
        logExportFn={null}
        topicsFieldName='dashboard-checkup-export-topics'
      />

      <SuccessToast
        open={exported}
        message={lang === 'en' ? 'Report exported' : 'นำส่งออกรายงานตรวจสุขภาพแล้ว'}
        onClose={() => setExported(false)}
      />
      <SuccessToast open={!!toast} message={toast} onClose={() => setToast('')} />
    </QueuePageShell>
  );
};

export default CheckupAnalyticsPage;
