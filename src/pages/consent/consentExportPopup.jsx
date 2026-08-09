import React, { useEffect, useMemo, useState } from 'react';
import Popup from '@/components/popup/Popup';
import Table, { EllipsisText } from '@/components/table/Table';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import DatePicker from '@/components/forms/DatePicker';
import Checkbox from '@/components/checkbox/Checkbox';
import CheckboxGroup from '@/components/checkbox/CheckboxGroup';
import { formatThaiBuddhistDate } from '@/data/registrationForm';
import { logExport } from '@/data/consentWorkflowStore';
import { CONSENT_DASHBOARD_REPORTS } from '@/data/consentReports';
import { CONSENT_STATUS } from '@/data/consentRecords';
import { PHCIS_CHART } from '@/data/phcisChartPalette';
import Icon from '@/components/icons/Icon';
import { sanitizeExportReportMeta } from '@/utils/exportPiiSanitize';
import {
  buildConsentExportSections,
  downloadConsentReport,
} from '@/utils/consentReportExport';

/* PHCIS | Consent — shared export popup (Figma 399:124481 / ด.1.1.16).
   Every "นำส่งออกรายงาน" action in the consent module opens this popup:
   print-preview → date range → PDF/CSV/XLSX → confirm (logs export).
   "พิมพ์" is separate and does not log (annotation 414:123633). */

const OFFICE_HEALTH_LOGO = '/images/office-health-logo.png';

const FORMATS = [
  { value: 'pdf', label: 'PDF' },
  { value: 'csv', label: 'CSV' },
  { value: 'xlsx', label: 'XLSX' },
];

/** หัวข้อรายงานที่เลือกได้ตอนนำออกจากแดชบอร์ด / รายงานทั้งหมด */
export const CONSENT_EXPORT_TOPICS = CONSENT_DASHBOARD_REPORTS.map((r) => ({
  value: r.key,
  label: r.title,
}));

const SECTION_LABEL = {
  color: 'var(--text-content-default)',
  fontFamily: 'var(--type-family-heading-graphic2)',
  fontSize: 'var(--type-size-sm)',
  lineHeight: 1.5,
};

const STATUS_TONE = {
  'ยินยอม': 'green', 'ให้ความยินยอม': 'green', 'สำเร็จ': 'green', 'อนุมัติ': 'green', 'ใช้งาน': 'green', 'ยินยอมแล้ว': 'green', 'เผยแพร่': 'green',
  'ปฏิเสธ': 'red', 'ถอน': 'red', 'ไม่ยินยอม': 'red', 'ไม่ให้ความยินยอม': 'red', 'ถูกปฏิเสธ': 'red', 'ล้มเหลว': 'red', 'ปฏิเสธ/เพิกถอน': 'red', 'ไม่เผยแพร่': 'red',
  'รอตรวจสอบ': 'yellow', 'รอดำเนินการ': 'yellow', 'รอลงนาม': 'yellow', 'ขอเพิกถอน': 'red', 'หมดอายุ-Reconsent': 'yellow',
  'ถูกแทนที่ด้วยเวอร์ชันใหม่': 'orange', 'มีเวอร์ชันใหม่': 'orange', 'ร่าง': 'grey', 'หมดอายุ': 'grey',
};

const BADGE_TONE = {
  VIEW: 'blue', EXPORT: 'purple', UPDATE: 'orange', DELETE: 'red',
  Admin: 'purple', Editor: 'blue', Viewer: 'grey',
  'แพทย์': 'blue', 'พยาบาล': 'teal', 'เภสัชกร': 'purple', 'นักเทคนิคการแพทย์': 'indigo',
  'ผ่าตัด': 'blue', 'การรักษา': 'green', 'การวิจัย': 'purple', 'เลือด': 'red', 'PDPA': 'indigo', 'เบิกจ่าย': 'magenta',
  'วัคซีน': 'teal', 'บันทึกภาพ/สื่อ': 'blue',
};

const CELL_TEXT = {
  color: 'var(--text-content-default)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm)',
  lineHeight: 1.5,
};

export const buildReportTableColumns = (cols) => cols.map((c) => ({
  key: c.key,
  header: c.header,
  width: c.width,
  flex: c.flex,
  minWidth: c.minWidth,
  render: (r) => {
    const v = r[c.key];
    if (c.kind === 'status') {
      return <ColorfulBadge style={STATUS_TONE[v] || 'grey'} size='small' hierarchy='secondary' width='hug'>{v}</ColorfulBadge>;
    }
    if (c.kind === 'badge') {
      return <ColorfulBadge style={BADGE_TONE[v] || 'blue'} size='small' hierarchy='secondary' width='hug'>{v}</ColorfulBadge>;
    }
    if (c.kind === 'nowrap' || c.key === 'signChannel') {
      return (
        <span className='block whitespace-nowrap' style={CELL_TEXT}>
          {v == null || v === '' ? '-' : String(v)}
        </span>
      );
    }
    if (c.kind === 'ellipsis' || c.key === 'formName') {
      return (
        <div className='min-w-0 w-full' style={CELL_TEXT}>
          <EllipsisText text={v == null || v === '' ? '-' : String(v)} />
        </div>
      );
    }
    return <span style={CELL_TEXT}>{v}</span>;
  },
}));

const WORKLIST_EXPORT_COLUMNS = [
  { key: 'hn', header: 'HN' },
  { key: 'formName', header: 'ชื่อแบบฟอร์ม', flex: true, minWidth: 360, kind: 'ellipsis' },
  { key: 'status', header: 'สถานะ', kind: 'status' },
  { key: 'signChannel', header: 'ช่องทางที่ลงนาม', kind: 'nowrap' },
];

/** Build export payload for the consent worklist (filtered rows). */
export const buildWorklistExportReport = (rows) => ({
  key: 'consent-worklist',
  title: 'รายงานรายการความยินยอม',
  table: {
    columns: WORKLIST_EXPORT_COLUMNS,
    rows: rows.map((r) => ({
      hn: r.hn,
      formName: r.formName,
      status: r.status,
      signChannel: r.signChannel,
    })),
  },
});

const COMPARE_EXPORT_COLUMNS = [
  { key: 'outcome', header: 'ผลลัพธ์', kind: 'status' },
  { key: 'formName', header: 'ชื่อแบบฟอร์ม', flex: true, minWidth: 280, kind: 'ellipsis' },
  { key: 'formCode', header: 'รหัส' },
  { key: 'version', header: 'เวอร์ชัน' },
  { key: 'status', header: 'สถานะ', kind: 'status' },
  { key: 'reconsent', header: 'Reconsent' },
];

const compareExportRow = (item, outcome) => ({
  outcome,
  formName: item.formName,
  formCode: item.formCode,
  version: item.version,
  status: (CONSENT_STATUS[item.status] || {}).label || item.status,
  reconsent: item.reconsentSent ? 'ส่ง Reconsent แล้ว' : '-',
});

/** Build export payload for compare popup — mirrors on-screen two-column layout. */
export const buildConsentCompareExportReport = (groups) => {
  if (!groups?.patient) return null;
  const { patient, consented = [], declined = [] } = groups;
  const rows = [
    ...consented.map((item) => compareExportRow(item, 'ให้ความยินยอม')),
    ...declined.map((item) => compareExportRow(item, 'ไม่ให้ความยินยอม')),
  ];
  return {
    key: 'consent-compare',
    snapshot: true,
    title: `เปรียบเทียบการให้ความยินยอม · HN ${patient.hn}`,
    patient: { hn: patient.hn },
    compare: { consented, declined },
    table: {
      columns: COMPARE_EXPORT_COLUMNS,
      rows,
    },
  };
};

const COMPARE_MUTED = {
  color: 'var(--text-content-tertiary)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-xs)',
  lineHeight: 1.5,
};
const COMPARE_BODY = {
  color: 'var(--text-content-default)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm)',
  lineHeight: 1.5,
};
const COMPARE_COLUMN = {
  flex: '1 1 240px',
  minWidth: 220,
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--dim-space-300)',
  padding: 'var(--dim-space-300)',
  borderRadius: 'var(--dim-radius-300)',
  background: 'var(--surface-card-200)',
  border: 'var(--dim-stroke-100) solid var(--border-card-default)',
  boxSizing: 'border-box',
};

const CompareExportFormRow = ({ item }) => {
  const statusTone = (CONSENT_STATUS[item.status] || {}).tone || 'grey';
  const statusLabel = (CONSENT_STATUS[item.status] || {}).label || item.status;
  return (
    <div
      className='flex flex-col w-full'
      style={{
        gap: 'var(--dim-space-150)',
        padding: 'var(--dim-space-300)',
        borderRadius: 'var(--dim-radius-200)',
        background: 'var(--surface-card-100)',
        border: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary, #E2E4E6)',
      }}
    >
      <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-050)' }}>
        <span className='truncate' style={COMPARE_BODY}>{item.formName}</span>
        <span style={COMPARE_MUTED}>{item.formCode} · {item.version}</span>
      </div>
      <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-150)' }}>
        <ColorfulBadge style={statusTone} size='small' hierarchy='secondary' width='hug'>
          {statusLabel}
        </ColorfulBadge>
        {item.reconsentSent && (
          <ColorfulBadge style='orange' size='small' hierarchy='secondary' width='hug'>
            ส่ง Reconsent แล้ว
          </ColorfulBadge>
        )}
      </div>
    </div>
  );
};

const CompareExportColumn = ({ title, icon, tone, items, emptyLabel }) => {
  const accent = tone === 'teal' ? PHCIS_CHART.teal : PHCIS_CHART.pink;
  return (
    <div style={COMPARE_COLUMN}>
      <div className='flex items-center justify-between' style={{ gap: 'var(--dim-space-200)' }}>
        <div className='inline-flex items-center' style={{ gap: 'var(--dim-space-150)' }}>
          <Icon name={icon} size={18} color={accent} />
          <span style={{ ...COMPARE_BODY, color: accent, fontWeight: 'var(--type-weight-medium)' }}>{title}</span>
        </div>
        <span style={COMPARE_MUTED}>{items.length} รายการ</span>
      </div>
      {items.length === 0 ? (
        <span style={COMPARE_MUTED}>{emptyLabel}</span>
      ) : (
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-200)' }}>
          {items.map((item) => (
            <CompareExportFormRow key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
};

const CompareExportPreview = ({ patient, compare }) => (
  <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
    <div
      className='flex flex-wrap w-full'
      style={{
        gap: 'var(--dim-space-400)',
        padding: 'var(--dim-space-300)',
        borderRadius: 'var(--dim-radius-300)',
        background: 'var(--surface-brandPrimary-quaternary)',
        border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
      }}
    >
      <div className='flex flex-col' style={{ gap: 'var(--dim-space-050)', minWidth: 140 }}>
        <span style={COMPARE_MUTED}>HN (Hospital Number)</span>
        <span style={COMPARE_BODY}>{patient.hn || '—'}</span>
      </div>
    </div>
    <div className='flex items-stretch flex-wrap w-full' style={{ gap: 'var(--dim-space-400)' }}>
      <CompareExportColumn
        title='ให้ความยินยอม'
        icon='check_circle'
        tone='teal'
        items={compare.consented}
        emptyLabel='ยังไม่มีแบบฟอร์มที่ให้ความยินยอม'
      />
      <CompareExportColumn
        title='ไม่ให้ความยินยอม'
        icon='cancel'
        tone='pink'
        items={compare.declined}
        emptyLabel='ยังไม่มีแบบฟอร์มที่ไม่ให้ความยินยอม'
      />
    </div>
  </div>
);

const RadioPill = ({ label, selected, onClick, disabled = false }) => {
  const [hover, setHover] = useState(false);
  const border = disabled
    ? 'var(--border-neutralbutton-tertiary, #E2E4E6)'
    : (selected || hover) ? 'var(--border-brandPrimary-default, #007549)' : 'var(--border-neutralbutton-tertiary, #E2E4E6)';
  const background = selected ? 'var(--surface-brandPrimary-quaternary)' : 'var(--surface-neutralbutton-quinary, #FFFFFF)';
  const color = disabled
    ? 'var(--text-disabledbutton-tertiary, #ADB2B7)'
    : selected ? 'var(--text-brandPrimary-default)' : 'var(--text-content-default)';
  return (
    <button
      type='button'
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => !disabled && setHover(true)}
      onMouseLeave={() => setHover(false)}
      aria-pressed={selected}
      aria-disabled={disabled}
      disabled={disabled}
      className='inline-flex items-center justify-center'
      style={{
        height: 'var(--dim-size-800, 40px)',
        minWidth: 'var(--dim-size-800, 40px)',
        padding: '0 var(--dim-space-400)',
        borderRadius: 'var(--dim-radius-200)',
        border: `var(--dim-stroke-100) solid ${border}`,
        background,
        color,
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-sm)',
        boxSizing: 'border-box',
        cursor: disabled ? 'not-allowed' : 'pointer',
        outline: 'none',
        transition: 'border-color 120ms ease, background-color 120ms ease, color 120ms ease',
      }}
    >
      {label}
    </button>
  );
};

/** Compact date field — opens Calendar dropdown (MIH DatePicker). */
export const DateInputBox = ({
  label,
  placeholder = 'เลือกวันที่',
  value = null,
  onChange,
  minDate,
  style = {},
}) => (
  <div
    style={{
      width: 'var(--dim-size-2280, 218px)',
      maxWidth: '100%',
      flex: '0 0 auto',
      ...style,
    }}
  >
    <DatePicker
      size='md'
      value={value}
      onChange={onChange}
      minDate={minDate}
      format={formatThaiBuddhistDate}
      placeholder={placeholder}
      label={label || placeholder}
      leadingIcon='calendar_today'
      showFieldName={!!label}
      showLabel={!!label}
      showHelperText={false}
      showLeadingIcon
    />
  </div>
);

export function useExportFormatState({
  open,
  report,
  reportsCatalog = CONSENT_DASHBOARD_REPORTS,
  topics = CONSENT_EXPORT_TOPICS,
  onClose,
  onExported,
  /** Footer line under preview / in exported file (default = consent module). */
  documentFooter = 'ออกเอกสารโดยระบบจัดการความยินยอม (PHCIS)',
  /** Override / disable consent export log. Pass null to skip logging. */
  logExportFn = logExport,
  topicsFieldName = 'consent-export-topics',
}) {
  const [format, setFormat] = useState(null);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [selectedTopics, setSelectedTopics] = useState([]);

  const topicKeys = useMemo(() => topics.map((t) => t.value), [topics]);
  const showTopicPicker = !report?.key || report.key === 'all';
  const isCompareExport = report?.key === 'consent-compare';
  const isSnapshotExport = !!report?.snapshot;

  useEffect(() => {
    if (!open) return;
    setFormat(null);
    setStartDate(null);
    setEndDate(null);
    if (showTopicPicker) {
      setSelectedTopics([...topicKeys]);
    } else if (report?.key) {
      setSelectedTopics([report.key]);
    } else {
      setSelectedTopics([]);
    }
  }, [open, showTopicPicker, report?.key, topicKeys]);

  const allSelected = topicKeys.length > 0 && topicKeys.every((k) => selectedTopics.includes(k));
  const someSelected = showTopicPicker ? selectedTopics.length > 0 : true;

  const toggleAll = (checked) => {
    setSelectedTopics(checked ? [...topicKeys] : []);
  };

  const ready = isSnapshotExport
    ? !!format && someSelected && (report?.table?.rows?.length > 0)
    : !!format && !!startDate && !!endDate && someSelected;

  const selectedReports = useMemo(() => {
    const catalog = Array.isArray(reportsCatalog) ? reportsCatalog : [];
    return selectedTopics
      .map((key) => catalog.find((r) => r.key === key) || topics.find((t) => t.value === key))
      .filter(Boolean)
      .map((r) => (r.title ? r : { key: r.value, title: r.label }));
  }, [selectedTopics, reportsCatalog, topics]);

  const previewReport = useMemo(() => {
    if (!showTopicPicker && report?.table) return report;
    if (selectedTopics.length === 1) {
      const key = selectedTopics[0];
      const fromCatalog = (reportsCatalog || []).find((r) => r.key === key);
      if (fromCatalog) return fromCatalog;
      if (report?.key === key && report.table) return report;
    }
    return null;
  }, [selectedTopics, reportsCatalog, report, showTopicPicker]);

  const previewTitle = (() => {
    if (!showTopicPicker) return report?.title || 'รายงาน';
    if (selectedTopics.length === 0) return 'ยังไม่ได้เลือกรายงาน';
    if (allSelected) return 'รายงานทั้งหมด';
    if (selectedTopics.length === 1) {
      return selectedReports[0]?.title || report?.title || 'รายงาน';
    }
    return `รายงานที่เลือก (${selectedTopics.length} หัวข้อ)`;
  })();

  const confirm = () => {
    if (!ready) return;
    const topicLabels = isCompareExport
      ? (report?.title || 'เปรียบเทียบการให้ความยินยอม')
      : selectedReports.map((r) => r.title).join(', ');
    const topicListLine = showTopicPicker && selectedTopics.length > 1 && !allSelected
      ? selectedReports.map((r) => r.title).join(' · ')
      : undefined;
    const sections = buildConsentExportSections({
      report,
      reportsCatalog,
      selectedTopics,
      showTopicPicker,
      isCompareExport,
      isSnapshotExport,
      startDate,
      endDate,
      previewTitle,
      selectedReports,
      sanitizeExportReportMeta,
    });
    downloadConsentReport({
      format,
      previewTitle,
      startDate,
      endDate,
      formatThaiDate: formatThaiBuddhistDate,
      sections,
      isCompareExport,
      topicListLine,
      filenameBase: previewTitle,
      documentFooter,
    });
    if (typeof logExportFn === 'function') {
      logExportFn({
        source: topicLabels || (report ? report.title : 'รายงาน'),
        format,
        topics: selectedTopics,
      });
    }
    onClose?.();
    onExported?.(format, {
      topics: selectedTopics,
      report: sanitizeExportReportMeta(report),
    });
  };

  const previewReportSanitized = useMemo(() => {
    if (!previewReport) return previewReport;
    return sanitizeExportReportMeta(previewReport);
  }, [previewReport]);

  const previewCols = previewReportSanitized?.table
    ? buildReportTableColumns(previewReportSanitized.table.columns)
    : [];
  const previewRows = previewReportSanitized?.table
    ? previewReportSanitized.table.rows.slice(0, 5).map((r, i) => ({ ...r, _id: i }))
    : [];

  const title = 'นำออกรายงาน';
  const subtitle = isCompareExport
    ? 'รายงานเปรียบเทียบความยินยอมของผู้รับบริการรายนี้ — เลือกรูปแบบไฟล์แล้วยืนยันนำออก'
    : 'เลือกหัวข้อรายงาน ช่วงวันที่ และรูปแบบไฟล์ แล้วยืนยันนำออก (ระบบเก็บ log การส่งออก)';

  return {
    ready,
    confirm,
    title,
    subtitle,
    showTopicPicker,
    isCompareExport,
    isSnapshotExport,
    format,
    setFormat,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    selectedTopics,
    setSelectedTopics,
    allSelected,
    someSelected,
    toggleAll,
    topicKeys,
    topics,
    topicsFieldName,
    previewTitle,
    previewCols,
    previewRows,
    selectedReports,
    report,
    documentFooter,
    primaryAction: { label: 'ยืนยันนำออกรายงาน', onClick: confirm, disabled: !ready },
    secondaryAction: { label: 'ยกเลิก', onClick: onClose },
    tertiaryAction: { label: 'พิมพ์', leadingIcon: 'print', onClick: () => window.print?.() },
  };
}

export function ExportFormatFormBody({ form }) {
  const {
    showTopicPicker,
    isCompareExport,
    isSnapshotExport,
    format,
    setFormat,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    selectedTopics,
    setSelectedTopics,
    allSelected,
    someSelected,
    toggleAll,
    topics,
    topicsFieldName,
    previewTitle,
    previewCols,
    previewRows,
    selectedReports,
    report,
    documentFooter,
  } = form;

  return (
    <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-500)' }}>
      {showTopicPicker && (
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
          <span style={SECTION_LABEL}>
            เลือกหัวข้อรายงาน <span style={{ color: 'var(--text-danger-default, #B91C1C)' }}>*</span>
          </span>
          <Checkbox
            label='เลือกทั้งหมด'
            checked={allSelected}
            onChange={toggleAll}
          />
          <CheckboxGroup
            options={topics}
            value={selectedTopics}
            onChange={setSelectedTopics}
            name={topicsFieldName}
            error={!someSelected ? 'เลือกอย่างน้อย 1 หัวข้อรายงาน' : undefined}
          />
        </div>
      )}

      <div
        className='flex items-end flex-wrap w-full'
        style={{ gap: 'var(--dim-space-1200, 48px)' }}
      >
        {!isSnapshotExport && (
          <div className='flex flex-col' style={{ gap: 'var(--dim-space-200)' }}>
            <span style={SECTION_LABEL}>
              เลือกช่วงวันที่ <span style={{ color: 'var(--text-danger-default, #B91C1C)' }}>*</span>
            </span>
            <div className='flex items-center' style={{ gap: 'var(--dim-space-200)' }}>
              <DateInputBox
                placeholder='วันเริ่มต้น'
                value={startDate}
                onChange={(d) => {
                  setStartDate(d);
                  if (endDate && d && endDate.getTime() < d.getTime()) setEndDate(null);
                }}
              />
              <span style={{ color: 'var(--text-content-tertiary)', flexShrink: 0 }}>-</span>
              <DateInputBox
                placeholder='วันสิ้นสุด'
                value={endDate}
                onChange={setEndDate}
                minDate={startDate || undefined}
              />
            </div>
          </div>
        )}
        <div className='flex flex-col shrink-0' style={{ gap: 'var(--dim-space-200)' }}>
          <span style={SECTION_LABEL}>เลือกรูปแบบไฟล์</span>
          <div className='flex items-center' style={{ gap: 'var(--dim-space-300)' }}>
            {FORMATS.map((f) => (
              <RadioPill key={f.value} label={f.label} selected={format === f.value} onClick={() => setFormat(f.value)} />
            ))}
          </div>
        </div>
      </div>

      <div
        className='flex justify-center w-full'
        style={{
          background: 'var(--surface-neutral-quaternary, #F9FBFB)',
          paddingTop: 'var(--dim-space-500)', paddingRight: 'var(--dim-space-500)',
          paddingBottom: 'var(--dim-space-500)', paddingLeft: 'var(--dim-space-500)',
          borderRadius: 'var(--dim-radius-400)',
          width: '100%',
          minHeight: 'min(52vh, 560px)',
        }}
      >
        <div
          className='flex flex-col w-full'
          style={{
            width: '100%',
            maxWidth: '100%',
            background: 'var(--surface-card-100)',
            border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
            borderRadius: 'var(--dim-radius-300)',
            boxShadow: 'var(--shadow-card)',
            paddingTop: 'var(--dim-space-600)', paddingRight: 'var(--dim-space-600)',
            paddingBottom: 'var(--dim-space-600)', paddingLeft: 'var(--dim-space-600)',
            gap: 'var(--dim-space-400)',
          }}
        >
          <div className='flex flex-col items-center' style={{ gap: 'var(--dim-space-200)' }}>
            <img
              src={OFFICE_HEALTH_LOGO}
              alt='ตราสัญลักษณ์สำนักอนามัย กรุงเทพมหานคร'
              style={{
                width: 'var(--dim-size-1600, 72px)',
                height: 'var(--dim-size-1600, 72px)',
                objectFit: 'cover',
                borderRadius: 'var(--dim-radius-full)',
                flexShrink: 0,
              }}
            />
            <span style={{ color: 'var(--text-brandPrimary-default)', fontFamily: 'var(--type-family-heading-graphic2)', fontSize: 'var(--type-size-base)' }}>
              สำนักอนามัย กรุงเทพมหานคร
            </span>
            <span style={{ color: 'var(--text-content-default)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)', fontWeight: 'var(--type-weight-medium)', textAlign: 'center' }}>
              {previewTitle}
            </span>
            {selectedTopics.length > 1 && !allSelected && (
              <span style={{ color: 'var(--text-content-secondary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', textAlign: 'center' }}>
                {selectedReports.map((r) => r.title).join(' · ')}
              </span>
            )}
            <span style={{ color: 'var(--text-content-tertiary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', textAlign: 'center' }}>
              {isCompareExport
                ? `HN ${report?.patient?.hn || '—'} · ${documentFooter}`
                : `ช่วงวันที่ ${startDate ? formatThaiBuddhistDate(startDate) : '—'} ถึง ${endDate ? formatThaiBuddhistDate(endDate) : '—'} · ${documentFooter}`}
            </span>
          </div>
          {isCompareExport && report?.compare ? (
            <CompareExportPreview patient={report.patient} compare={report.compare} />
          ) : previewRows.length > 0 ? (
            <Table columns={previewCols} rows={previewRows} rowKey={(r) => r._id} />
          ) : (
            <span style={{ color: 'var(--text-content-tertiary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)', textAlign: 'center' }}>
              {selectedTopics.length === 0
                ? 'เลือกหัวข้อรายงานด้านบนเพื่อดูตัวอย่าง'
                : selectedTopics.length === 1
                  ? 'ตัวอย่างตารางจะแสดงเมื่อรายงานมีข้อมูลในช่วงที่เลือก'
                  : 'รวมรายงานที่เลือก — ตัวอย่างตารางแสดงเมื่อเลือกเพียง 1 หัวข้อ'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export function ExportFormatPopup({
  open,
  report,
  reportsCatalog = CONSENT_DASHBOARD_REPORTS,
  topics = CONSENT_EXPORT_TOPICS,
  onClose,
  onExported,
  documentFooter,
  logExportFn,
  topicsFieldName,
}) {
  const form = useExportFormatState({
    open,
    report,
    reportsCatalog,
    topics,
    onClose,
    onExported,
    documentFooter,
    logExportFn,
    topicsFieldName,
  });

  return (
    <Popup
      open={open}
      onClose={onClose}
      size='extraLarge'
      title={form.title}
      subtitle={form.subtitle}
      primaryAction={form.primaryAction}
      secondaryAction={form.secondaryAction}
      tertiaryAction={form.tertiaryAction}
    >
      <ExportFormatFormBody form={form} />
    </Popup>
  );
}

export default ExportFormatPopup;
