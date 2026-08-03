import React, { useEffect, useState } from 'react';
import Popup from '@/components/popup/Popup';
import Table from '@/components/table/Table';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import Icon from '@/components/icons/Icon';
import { logExport } from '@/data/consentWorkflowStore';

/* PHCIS | Consent — shared export popup (Figma 399:124481 / ด.1.1.16).
   Every "นำส่งออกรายงาน" action in the consent module opens this popup:
   print-preview → date range → PDF/CSV/XLSX → confirm (logs export).
   "พิมพ์" is separate and does not log (annotation 414:123633). */

const FORMATS = [
  { value: 'pdf', label: 'PDF' },
  { value: 'csv', label: 'CSV' },
  { value: 'xlsx', label: 'XLSX' },
];

const SECTION_LABEL = {
  color: 'var(--text-content-default)',
  fontFamily: 'var(--type-family-heading-graphic2)',
  fontSize: 'var(--type-size-sm)',
  lineHeight: 1.5,
};

const STATUS_TONE = {
  'ยินยอม': 'green', 'สำเร็จ': 'green', 'อนุมัติ': 'green', 'ใช้งาน': 'green', 'ยินยอมแล้ว': 'green',
  'ปฏิเสธ': 'red', 'ถอน': 'red', 'ไม่ยินยอม': 'red', 'ถูกปฏิเสธ': 'red', 'ล้มเหลว': 'red', 'ปฏิเสธ/เพิกถอน': 'red',
  'รอตรวจสอบ': 'yellow', 'รอดำเนินการ': 'yellow', 'รอลงนาม': 'yellow', 'ขอเพิกถอน': 'red', 'หมดอายุ-Reconsent': 'yellow',
  'มีเวอร์ชันใหม่': 'orange',
};

const BADGE_TONE = {
  VIEW: 'blue', EXPORT: 'purple', UPDATE: 'orange', DELETE: 'red',
  Admin: 'purple', Editor: 'blue', Viewer: 'grey',
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
  render: (r) => {
    const v = r[c.key];
    if (c.kind === 'status') {
      return <ColorfulBadge style={STATUS_TONE[v] || 'grey'} size='small' hierarchy='secondary' width='hug'>{v}</ColorfulBadge>;
    }
    if (c.kind === 'badge') {
      return <ColorfulBadge style={BADGE_TONE[v] || 'blue'} size='small' hierarchy='secondary' width='hug'>{v}</ColorfulBadge>;
    }
    return <span style={CELL_TEXT}>{v}</span>;
  },
}));

const WORKLIST_EXPORT_COLUMNS = [
  { key: 'hn', header: 'HN', width: 110 },
  { key: 'name', header: 'ชื่อ-นามสกุล', width: 220 },
  { key: 'formName', header: 'ชื่อแบบฟอร์ม', width: 280 },
  { key: 'type', header: 'ประเภท Consent', width: 150, kind: 'badge' },
  { key: 'status', header: 'สถานะ', width: 160, kind: 'status' },
  { key: 'signChannel', header: 'ช่องทางที่ลงนาม', width: 150 },
];

/** Build export payload for the consent worklist (filtered rows). */
export const buildWorklistExportReport = (rows) => ({
  key: 'consent-worklist',
  title: 'รายงานรายการความยินยอม',
  table: {
    columns: WORKLIST_EXPORT_COLUMNS,
    rows: rows.map((r) => ({
      hn: r.hn,
      name: r.name,
      formName: r.formName,
      type: r.type,
      status: r.status,
      signChannel: r.signChannel,
    })),
  },
});

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
        minHeight: 56,
        minWidth: 64,
        padding: 'var(--dim-space-200) var(--dim-space-400)',
        borderRadius: 'var(--dim-radius-200)',
        border: `var(--dim-stroke-100) solid ${border}`,
        background,
        color,
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-sm)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        outline: 'none',
        transition: 'border-color 120ms ease, background-color 120ms ease, color 120ms ease',
      }}
    >
      {label}
    </button>
  );
};

/** Date range field used in export popup and report-table filters. */
export const DateInputBox = ({ placeholder, value, onClick }) => (
  <button
    type='button'
    onClick={onClick}
    className='flex items-center text-left'
    style={{
      flex: '1 1 0',
      gap: 'var(--dim-space-200)',
      minHeight: 44,
      padding: 'var(--dim-space-200) var(--dim-space-300)',
      borderRadius: 'var(--dim-radius-200)',
      border: 'var(--dim-stroke-100) solid var(--border-neutralbutton-tertiary, #E2E4E6)',
      background: 'var(--surface-card-100)',
      cursor: 'pointer',
      outline: 'none',
    }}
  >
    <Icon name='calendar_today' size={18} style={{ color: 'var(--text-content-tertiary)' }} />
    <span style={{ color: value ? 'var(--text-content-default)' : 'var(--text-content-tertiary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)' }}>
      {value || placeholder}
    </span>
  </button>
);

export function ExportFormatPopup({ open, report, onClose, onExported }) {
  const [format, setFormat] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  useEffect(() => { if (open) { setFormat(null); setStartDate(''); setEndDate(''); } }, [open]);
  const ready = !!format && !!startDate && !!endDate;
  const confirm = () => {
    if (!ready) return;
    logExport({ source: report ? report.title : 'รายงาน consent', format });
    onClose();
    if (onExported) onExported(format);
  };
  const previewCols = report && report.table ? buildReportTableColumns(report.table.columns) : [];
  const previewRows = report && report.table ? report.table.rows.slice(0, 5).map((r, i) => ({ ...r, _id: i })) : [];
  return (
    <Popup
      open={open}
      onClose={onClose}
      size='extraLarge'
      title='นำออกรายงาน'
      subtitle='ตรวจตัวอย่างเอกสาร เลือกช่วงวันที่และรูปแบบไฟล์ แล้วยืนยันนำออก (ระบบเก็บ log การส่งออก)'
      primaryAction={{ label: 'ยืนยันนำออกรายงาน', onClick: confirm, disabled: !ready }}
      secondaryAction={{ label: 'ยกเลิก', onClick: onClose }}
      tertiaryAction={{ label: 'พิมพ์ (ไม่เก็บ log)', onClick: () => window.print?.() }}
    >
      <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-500)' }}>
        <div
          className='flex justify-center w-full'
          style={{
            background: 'var(--surface-neutral-quaternary, #F9FBFB)',
            paddingTop: 'var(--dim-space-500)', paddingRight: 'var(--dim-space-500)',
            paddingBottom: 'var(--dim-space-500)', paddingLeft: 'var(--dim-space-500)',
            borderRadius: 'var(--dim-radius-400)',
            maxHeight: '38vh', overflowY: 'auto',
          }}
        >
          <div
            className='flex flex-col w-full'
            style={{
              maxWidth: 720,
              background: 'var(--surface-card-100)',
              border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
              borderRadius: 'var(--dim-radius-300)',
              boxShadow: 'var(--shadow-card)',
              paddingTop: 'var(--dim-space-600)', paddingRight: 'var(--dim-space-600)',
              paddingBottom: 'var(--dim-space-600)', paddingLeft: 'var(--dim-space-600)',
              gap: 'var(--dim-space-400)',
            }}
          >
            <div className='flex flex-col items-center' style={{ gap: 'var(--dim-space-050)' }}>
              <span style={{ color: 'var(--text-brandPrimary-default)', fontFamily: 'var(--type-family-heading-graphic2)', fontSize: 'var(--type-size-base)' }}>
                สำนักอนามัย กรุงเทพมหานคร
              </span>
              <span style={{ color: 'var(--text-content-default)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)', fontWeight: 'var(--type-weight-medium)' }}>
                {report ? report.title : 'รายงาน'}
              </span>
              <span style={{ color: 'var(--text-content-tertiary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)' }}>
                ช่วงวันที่ {startDate || '—'} ถึง {endDate || '—'} · ออกเอกสารโดยระบบจัดการความยินยอม (PHCIS)
              </span>
            </div>
            {previewRows.length > 0 ? (
              <Table columns={previewCols} rows={previewRows} rowKey={(r) => r._id} />
            ) : (
              <span style={{ color: 'var(--text-content-tertiary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)', textAlign: 'center' }}>
                รวมทุกรายงานในระบบ — ตัวอย่างตารางแสดงเมื่อเลือกรายงานเฉพาะหัวข้อ
              </span>
            )}
          </div>
        </div>

        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200)' }}>
          <span style={SECTION_LABEL}>
            เลือกช่วงวันที่ <span style={{ color: 'var(--text-danger-default, #B91C1C)' }}>*</span>
          </span>
          <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-200)' }}>
            <DateInputBox placeholder='วันเริ่มต้น' value={startDate} onClick={() => setStartDate('1 มิถุนายน 2569')} />
            <span style={{ color: 'var(--text-content-tertiary)' }}>-</span>
            <DateInputBox placeholder='วันสิ้นสุด' value={endDate} onClick={() => setEndDate('12 มิถุนายน 2569')} />
          </div>
        </div>
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200)' }}>
          <span style={SECTION_LABEL}>เลือกรูปแบบไฟล์ (PDF / CSV / XLSX)</span>
          <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-300)' }}>
            {FORMATS.map((f) => (
              <RadioPill key={f.value} label={f.label} selected={format === f.value} onClick={() => setFormat(f.value)} />
            ))}
          </div>
        </div>
      </div>
    </Popup>
  );
}

export default ExportFormatPopup;
