import React, { useEffect, useMemo, useState } from 'react';
import QueuePageShell, { QUEUE_STICKY_UNDER_TABS } from '@/templates/QueuePageShell';
import { SummaryCard } from '@/components/layout/SummaryCardsBar';
import PrimarySearch from '@/components/search/PrimarySearch';
import SearchResultCount from '@/components/search/SearchResultCount';
import useSearchHistory from '@/components/search/useSearchHistory';
import { FilterDropdown } from '@/components/forms/FilterTag';
import ClearFiltersTag, { SmoothFilterResults } from '@/components/forms/ClearFiltersTag';
import useSmoothClearFilters from '@/hooks/useSmoothClearFilters';
import FilterDateTag from '@/components/forms/FilterDateTag';
import Table from '@/components/table/Table';
import Pagination from '@/components/pagination/Pagination';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import NeutralSubdueIconButton from '@/components/button/NeutralSubdueIconButton';
import AlertDialog from '@/components/popup/AlertDialog';
import Popup from '@/components/popup/Popup';
import Switch from '@/components/switch/Switch';
import PhcisTopToast from '@/components/alert/PhcisTopToast';
import StaffProfileAvatar from '@/components/appointment/StaffProfileAvatar';
import {
  ACCESS_RECORDS, buildAccessSummary, ACCESS_TABS, ACCESS_STATUS,
  thaiDateOfIso, daysLeftOfIso, formatAccessCreatedTime, consumeAccessImports, accessPatientLabel,
  accessAvatarForGroup, isMyAccessRequest,
} from '@/data/accessRecords';
import { matchesDateFilter } from '@/data/financePaymentPrototype';
import { ApprovePeriodPopup, EditPeriodPopup, AccessDetailPopup } from '@/pages/consent/accessPopups';
import { ConsentFormViewPopup } from '@/pages/consent/ConsentFormViewPopup';
import { getConsentFormByCode } from '@/data/consentFormRecords';
import CONSENT_NAV from '@/pages/consent/consentNav';
import { ACCESS_TYPE_DISPLAY_LABEL } from '@/pages/consent/AccessRequestForm';
import PHCIS_CURRENT_USER from '@/data/phcisCurrentUser';

/* PHCIS | Consent — จัดการสิทธิ์การขอเข้าถึงแบบฟอร์ม (Figma node 363:122327).
   Access-request registry: summary cards · tabs · search · filters · table
   with a STATUS-DEPENDENT action column (✓ approve / ✗ reject, one disabled
   per status) and per-action confirm AlertDialogs. Mirrors the consent
   registry page (ConsentManagementPage) so the system stays consistent.
   All values alias design.md tokens; UI copy is Thai; data is local mock. */

const PAGE_SIZE = 20;
const breadcrumb = ['จัดการสิทธิ์การขอเข้าถึงแบบฟอร์ม'];
const GROUP_TONE = { 'แพทย์': 'green', 'พยาบาล': 'purple', 'เภสัชกร': 'teal', 'นักเทคนิคการแพทย์': 'blue' };

/* แท็บที่กรองสถานะอยู่แล้ว — ซ่อน filter chip "สถานะ" */
const STATUS_FILTER_HIDDEN_TABS = new Set(['pending', 'approved', 'rejected', 'expired']);

const MOCK_MY_PENDING_REQUESTS = [
  {
    id: 'my-req-01', reqNo: 'REQ-2569-8101', name: PHCIS_CURRENT_USER.displayName,
    empCode: PHCIS_CURRENT_USER.employeeCode, group: PHCIS_CURRENT_USER.groupPolicy,
    subBranch: PHCIS_CURRENT_USER.subBranch, dept: PHCIS_CURRENT_USER.department,
    createdDate: '16 สิงหาคม 2569', createdTime: '09:15 น.', hn: '67-00009',
    patientName: 'ธนวัฒน์ ศรีสุข', purpose: 'ตรวจสอบสถานะความยินยอมก่อนให้บริการ',
    reason: 'ตรวจสอบสถานะความยินยอมก่อนให้บริการ', accessType: 'patient_consent',
    accessTypeLabel: ACCESS_TYPE_DISPLAY_LABEL.patient_consent, formCode: 'PH-001',
    formName: 'ใบยินยอมการใช้ข้อมูลส่วนบุคคล (PDPA)', requestedPeriodStart: '2026-08-18',
    requestedPeriodEnd: '2026-08-31', period: '-', periodDays: '-', file: 'consent-pdpa.pdf',
    fileSize: '1.1 MB', status: 'รออนุมัติ', periodStart: null, periodEnd: null, active: false,
  },
  {
    id: 'my-req-02', reqNo: 'REQ-2569-8102', name: PHCIS_CURRENT_USER.displayName,
    empCode: PHCIS_CURRENT_USER.employeeCode, group: PHCIS_CURRENT_USER.groupPolicy,
    subBranch: PHCIS_CURRENT_USER.subBranch, dept: PHCIS_CURRENT_USER.department,
    createdDate: '15 สิงหาคม 2569', createdTime: '14:20 น.', hn: '67-00014',
    patientName: 'กมลวรรณ ใจดี', purpose: 'การรักษาพยาบาล', reason: 'ต้องใช้แบบฟอร์มในการให้บริการ',
    accessType: 'form', accessTypeLabel: ACCESS_TYPE_DISPLAY_LABEL.form, formCode: 'PH-007',
    formName: 'ใบยินยอมการรักษาทั่วไป', requestedPeriodStart: '2026-08-19',
    requestedPeriodEnd: '2026-09-02', period: '-', periodDays: '-', file: 'general-consent.jpg',
    fileSize: '860 KB', status: 'รออนุมัติ', periodStart: null, periodEnd: null, active: false,
  },
  {
    id: 'my-req-03', reqNo: 'REQ-2569-8103', name: PHCIS_CURRENT_USER.displayName,
    empCode: PHCIS_CURRENT_USER.employeeCode, group: PHCIS_CURRENT_USER.groupPolicy,
    subBranch: PHCIS_CURRENT_USER.subBranch, dept: PHCIS_CURRENT_USER.department,
    createdDate: '14 สิงหาคม 2569', createdTime: '10:05 น.', hn: '67-00021',
    patientName: 'วรากร พัฒนกิจ', purpose: 'การส่งต่อผู้ป่วย', reason: 'ส่งต่อ / ประสานงานกับหน่วยงานอื่น',
    accessType: 'patient_consent', accessTypeLabel: ACCESS_TYPE_DISPLAY_LABEL.patient_consent, formCode: 'PH-003',
    formName: 'ใบยินยอมเปิดเผยข้อมูลเพื่อการส่งต่อ', requestedPeriodStart: '2026-08-20',
    requestedPeriodEnd: '2026-09-10', period: '-', periodDays: '-', file: 'referral-consent.pdf',
    fileSize: '1.4 MB', status: 'รออนุมัติ', periodStart: null, periodEnd: null, active: false,
  },
].map((row, index) => ({ ...row, avatarSrc: accessAvatarForGroup(row.group, index), audit: null }));

const TEXT_CELL = {
  color: 'var(--text-content-default)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm)',
  fontWeight: 'var(--type-weight-regular)',
  lineHeight: 1.5,
};
const MUTED_CELL = { ...TEXT_CELL, color: 'var(--text-content-tertiary)' };

const Cell = ({ value }) =>
  value && value !== '-'
    ? <span style={TEXT_CELL}>{value}</span>
    : <span style={MUTED_CELL}>-</span>;

/* Two-line cell: primary line + muted sub line (date/time, range/days). */
const StackCell = ({ top, bottom }) => (
  <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-0)' }}>
    <span className='truncate' style={TEXT_CELL}>{top}</span>
    {bottom ? <span className='truncate' style={{ ...MUTED_CELL, fontSize: 'var(--type-size-xs)' }}>{bottom}</span> : null}
  </div>
);

/* ผู้รับบริการ — ชื่อ · HN คนละบรรทัด */
const PatientCell = ({ row }) => {
  if (!row?.hn || row.hn === '-') return <span style={MUTED_CELL}>-</span>;
  if (row.patientName) {
    return <StackCell top={row.patientName} bottom={`HN ${row.hn}`} />;
  }
  return <Cell value={`HN ${row.hn}`} />;
};

const requestedPeriodLabel = (row) => {
  if (!row?.requestedPeriodStart || !row?.requestedPeriodEnd) return '';
  return `${thaiDateOfIso(row.requestedPeriodStart)} – ${thaiDateOfIso(row.requestedPeriodEnd)}`;
};

/* แบบฟอร์มความยินยอม — ชื่อ · PH-xxx · คลิกเปิด ConsentFormViewPopup (เดียวกับเมนูแบบฟอร์ม) */
const FormCell = ({ row, onClick }) => {
  if (!row?.formName) return <span style={MUTED_CELL}>-</span>;
  const [hover, setHover] = useState(false);
  return (
    <button
      type='button'
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title='ดูแบบฟอร์มความยินยอม'
      className='flex flex-col min-w-0 text-left'
      style={{ background: 'transparent', border: 'none', outline: 'none', cursor: 'pointer', padding: 0, gap: 'var(--dim-space-0)' }}
    >
      <span
        className='truncate'
        style={{
          ...TEXT_CELL,
          color: hover ? 'var(--text-brandPrimary-default)' : TEXT_CELL.color,
          textDecoration: hover ? 'underline' : 'none',
          textUnderlineOffset: 2,
          transition: 'color 120ms ease',
        }}
      >
        {row.formName}
      </span>
      {row.formCode ? (
        <span
          className='truncate'
          style={{
            ...MUTED_CELL,
            fontSize: 'var(--type-size-xs)',
            color: hover ? 'var(--text-brandPrimary-default)' : MUTED_CELL.color,
          }}
        >
          {row.formCode}
        </span>
      ) : null}
    </button>
  );
};

const resolveAccessFormViewRecord = (row) => {
  if (!row?.formCode) return null;
  const hit = getConsentFormByCode(row.formCode);
  if (hit) return hit;
  if (!row.formName) return null;
  return {
    id: `access-form-${row.id}`,
    code: row.formCode,
    name: row.formName,
    version: 'V 1.0',
    type: 'การรักษา',
    status: 'เผยแพร่',
    group: row.group,
    scopes: [{
      group: row.group || '-',
      subBranch: row.subBranch || '-',
      dept: row.dept || '-',
    }],
    creator: row.name,
    updatedDate: row.createdDate || '-',
  };
};

/* Staff photo — keyed to กิจกรรม via row.avatarSrc (fallback by group). */
const RequesterAvatar = ({ row }) => (
  <StaffProfileAvatar
    staff={{
      name: row.name,
      avatarSrc: row.avatarSrc || accessAvatarForGroup(row.group, row.id || 0),
    }}
    size={36}
    alt={row.name}
  />
);

/* กิจกรรม · กิจกรรมย่อย · แผนก — badges บรรทัดเดียว (ไม่ wrap) */
const ScopeCell = ({ row }) => (
  <div className='flex items-center flex-nowrap min-w-0' style={{ gap: 'var(--dim-space-100)' }}>
    {row.group ? (
      <ColorfulBadge style={GROUP_TONE[row.group] || 'grey'} size='small' hierarchy='secondary' width='hug'>
        {row.group}
      </ColorfulBadge>
    ) : null}
    {row.subBranch ? (
      <ColorfulBadge style='blue' size='small' hierarchy='secondary' width='hug'>
        {row.subBranch}
      </ColorfulBadge>
    ) : null}
    {row.dept ? (
      <ColorfulBadge style='grey' size='small' hierarchy='secondary' width='hug'>
        {row.dept}
      </ColorfulBadge>
    ) : null}
  </div>
);

/* File chip — exported Figma PDF glyph + filename over its size. The whole
   cell is a button: clicking opens the attached document in a popup
   (Figma DataCell annotation "Users can click to view the document"). */
const PDF_ICON = '/illustration/pdf-file.svg';
const FileCell = ({ name, size, onClick }) => {
  const [hover, setHover] = useState(false);
  return (
    <button
      type='button'
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title='ดูเอกสารที่แนบ'
      className='flex items-center min-w-0 text-left'
      style={{ gap: 'var(--dim-space-200)', background: 'transparent', border: 'none', outline: 'none', cursor: 'pointer', padding: 0 }}
    >
      <img
        src={PDF_ICON}
        alt=''
        aria-hidden
        width={18}
        height={24}
        style={{ display: 'block', flexShrink: 0, opacity: hover ? 0.85 : 1, transition: 'opacity 120ms ease' }}
      />
      <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-0)' }}>
        <span
          className='truncate'
          style={{
            ...TEXT_CELL,
            color: hover ? 'var(--text-brandPrimary-default)' : TEXT_CELL.color,
            textDecoration: hover ? 'underline' : 'none',
            textUnderlineOffset: 2,
            transition: 'color 120ms ease',
          }}
        >
          {name}
        </span>
        <span className='truncate' style={{ ...MUTED_CELL, fontSize: 'var(--type-size-xs)' }}>{size}</span>
      </div>
    </button>
  );
};

/* Mock document preview shown inside the file popup. */
const DocRow = ({ label, value }) => (
  <div className='flex items-start w-full' style={{ gap: 'var(--dim-space-300)' }}>
    <span style={{ width: 150, flexShrink: 0, color: 'var(--text-content-tertiary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)' }}>{label}</span>
    <span style={{ flex: 1, color: 'var(--text-content-default)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)', fontWeight: 'var(--type-weight-medium)' }}>{value}</span>
  </div>
);
const DocPreview = ({ row }) => (
  <div className='flex justify-center w-full' style={{ background: 'var(--surface-neutral-quaternary, #F9FBFB)', padding: 'var(--dim-space-500)', borderRadius: 'var(--dim-radius-400)' }}>
    <div
      className='flex flex-col w-full'
      style={{ maxWidth: 540, background: 'var(--surface-card-100)', border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)', borderRadius: 'var(--dim-radius-400)', boxShadow: 'var(--shadow-card)', padding: 'var(--dim-space-600)', gap: 'var(--dim-space-400)' }}
    >
      <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-300)', paddingBottom: 'var(--dim-space-300)', borderBottom: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)' }}>
        <img src={PDF_ICON} alt='' aria-hidden width={26} height={35} style={{ display: 'block', flexShrink: 0 }} />
        <div className='flex flex-col min-w-0'>
          <span style={{ color: 'var(--text-brandPrimary-default)', fontFamily: 'var(--type-family-heading-graphic2)', fontSize: 'var(--type-size-base)' }}>แบบฟอร์มขอเข้าถึงข้อมูลผู้ป่วย</span>
          <span style={{ color: 'var(--text-content-tertiary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)' }}>{row.file} · {row.fileSize}</span>
        </div>
      </div>
      <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
        <DocRow label='เลขที่คำขอ' value={row.reqNo} />
        <DocRow label='ผู้ขอ (เจ้าหน้าที่)' value={row.name} />
        <DocRow label='รหัสพนักงาน' value={row.empCode} />
        {/* แยกเป็นบทบาท / สาขา / แผนก ตามที่ระบบเก็บจริง (มติผู้ใช้ 25 ส.ค. 69)
            — ป้าย "กิจกรรม / กิจกรรมย่อย" ของเดิมไม่ตรงกับค่าที่แสดง (แพทย์ ·
            สูตินรีแพทย์ · สูตินรีเวช คือบทบาท สาขา และแผนก) และยัดสามค่าไว้
            บรรทัดเดียวคั่นด้วย · ทำให้ไม่รู้ว่าค่าไหนคืออะไร */}
        <DocRow label='บทบาท' value={row.group || '-'} />
        <DocRow label='สาขา / ความเชี่ยวชาญ' value={row.subBranch || '-'} />
        <DocRow label='แผนก' value={row.dept || '-'} />
        <DocRow label='ประเภทการขอ' value={row.accessTypeLabel || '-'} />
        <DocRow label='แบบฟอร์มที่ขอเข้าถึง' value={row.formName ? `${row.formCode ? `${row.formCode} · ` : ''}${row.formName}` : '-'} />
        <DocRow label='เหตุผลที่ขอ' value={row.reason || '-'} />
        {row.note ? <DocRow label='บันทึกเพิ่มเติม' value={row.note} /> : null}
        <DocRow label='ผู้รับบริการ' value={accessPatientLabel(row)} />
        <DocRow label='วัตถุประสงค์' value={row.purpose} />
        <DocRow label='ช่วงวันที่ผู้ขอเสนอ' value={requestedPeriodLabel(row) || '-'} />
        <DocRow label='ช่วงเวลาสิทธิที่ Admin กำหนด' value={row.periodStart ? `${thaiDateOfIso(row.periodStart)} – ${thaiDateOfIso(row.periodEnd)}` : 'ยังไม่กำหนด'} />
      </div>
      <p style={{ color: 'var(--text-content-secondary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)', lineHeight: 1.6, margin: 0 }}>
        ข้าพเจ้าขออนุญาตเข้าถึงข้อมูลของผู้รับบริการตามรายละเอียดข้างต้น เพื่อใช้ในวัตถุประสงค์ที่ระบุไว้เท่านั้น และยินยอมให้มีการบันทึกการเข้าถึงตามนโยบายความเป็นส่วนตัวของหน่วยงาน
      </p>
    </div>
  </div>
);

/* ด.1.1.17.2 — หมดช่วงเวลา → Inactive อัตโนมัติ + ย้ายไปแท็บหมดช่วงเวลา */
const autoExpire = (r) => {
  if (r.status === 'อนุมัติแล้ว' && r.periodEnd && (daysLeftOfIso(r.periodEnd) ?? 1) < 0) {
    return { ...r, status: 'หมดอายุ', active: false, expiredByPeriod: true };
  }
  return { ...r };
};

export default function AccessManagementPage({ mineOnly = false }) {
  /* predicate ตัวเดียวกับ popup "ประวัติคำขอเข้าถึงข้อมูล" — อยู่ใน
     accessRecords.js จะได้ไม่กรองคนละเกณฑ์ (25 ส.ค. 69) */
  const isMine = (row) => !mineOnly || isMyAccessRequest(row);
  /* rows เป็น state จริง (mock mutate ใน session) */
  const [rows, setRows] = useState(() => [
    ...(mineOnly ? [...ACCESS_RECORDS, ...MOCK_MY_PENDING_REQUESTS] : ACCESS_RECORDS).map(autoExpire),
    ...consumeAccessImports().map(autoExpire),
  ].filter(isMine));
  const [activeTab, setActiveTab] = useState('pending');
  const [search, setSearch] = useState('');
  const [filterRequester, setFilterRequester] = useState('');
  const [filterPurpose, setFilterPurpose] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDate, setFilterDate] = useState({ quick: 'thisyear' });
  const [page, setPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [dialog, setDialog] = useState(null); // { record, kind: 'reject' }
  const [previewFile, setPreviewFile] = useState(null); // row whose attached doc is open
  const [formViewFor, setFormViewFor] = useState(null); // consent form → ConsentFormViewPopup
  /* ด.1.1.17 workflow — ขอสิทธิ์ย้ายไปปุ่มที่แบบฟอร์มความยินยอม */
  const [approveFor, setApproveFor] = useState(null);     // 17.2 อนุมัติ + ช่วงเวลา
  const [editPeriodFor, setEditPeriodFor] = useState(null); // admin แก้ไขช่วงเวลาสิทธิ
  const [detailFor, setDetailFor] = useState(null);       // detail + audit
  const [toggleFor, setToggleFor] = useState(null);       // 17.3 confirm Active switch
  const [toast, setToast] = useState(null);

  const handleApproveRequest = (row) => setApproveFor(row);

  const patchRow = (id, patch) => setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const pushToast = (message) => setToast({ id: Date.now(), variant: 'success', message });
  const nowThai = () => new Date().toLocaleString('th-TH', { dateStyle: 'long', timeStyle: 'short' });
  const { history: searchHistory, push: pushHistory, clear: clearHistory } =
    useSearchHistory('mih:primarysearch-history:access', {
      /* seed "ค้นหาล่าสุด" จากคำขอจริงในทะเบียน (มติผู้ใช้ 25 ส.ค. 69) */
      seedIfEmpty: ACCESS_RECORDS.slice(0, 4).map((r) => ({
        id: `access-${r.id}`,
        label: r.name,
        sublabel: `${r.reqNo} · ${r.status}`,
        value: r.reqNo,
        badge: r.reqNo,
        badgeStyle: 'indigo',
      })),
    });

  const searchSuggestions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return rows
      .filter((r) => `${r.reqNo} ${r.name} ${r.empCode} ${r.hn} ${r.patientName || ''} ${r.formCode || ''} ${r.formName || ''} ${r.purpose || ''}`.toLowerCase().includes(q))
      .slice(0, 8)
      .map((r) => ({
        id: String(r.id),
        label: r.name,
        value: r.reqNo,
        sublabel: [r.reqNo, r.hn && r.hn !== '-' ? `HN ${r.hn}` : '', r.purpose].filter(Boolean).join(' · '),
        badges: [{ label: r.reqNo, tone: 'teal' }],
      }));
  }, [search, rows]);

  /* รับคำขอที่สร้างจากหน้าแบบฟอร์มความยินยอม ขณะที่หน้านี้ยัง mount อยู่ */
  useEffect(() => {
    const pending = consumeAccessImports();
    if (pending.length === 0) return undefined;
    setRows((prev) => [...prev, ...pending.map(autoExpire).filter(isMine)]);
    return undefined;
  }, []);

  const summaryCards = useMemo(() => buildAccessSummary(rows), [rows]);

  const tabs = useMemo(() => ACCESS_TABS.map((t) => ({
    key: t.value,
    label: mineOnly && t.value === 'all' ? 'รายการคำขอเข้าถึงแบบฟอร์มทั้งหมด' : t.label,
    icon: t.icon,
    count: t.value === 'all'
      ? rows.length
      : rows.filter((r) => (ACCESS_STATUS[r.status] || {}).tab === t.value).length,
  })), [rows, mineOnly]);

  const requesterOptions = useMemo(() => [
    { value: '', label: 'ทุกคน' },
    ...[...new Set(rows.map((r) => r.name))].map((n) => ({ value: n, label: n })),
  ], [rows]);
  const purposeOptions = useMemo(() => [
    { value: '', label: 'ทุกวัตถุประสงค์' },
    ...[...new Set(rows.map((r) => r.purpose))].map((p) => ({ value: p, label: p })),
  ], [rows]);
  const statusOptions = useMemo(() => [
    { value: '', label: 'ทุกสถานะ' },
    ...Object.keys(ACCESS_STATUS).map((s) => ({ value: s, label: s })),
  ], []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      const meta = ACCESS_STATUS[r.status] || {};
      return (
        (activeTab === 'all' || meta.tab === activeTab) &&
        (!filterRequester || r.name === filterRequester) &&
        (!filterPurpose || r.purpose === filterPurpose) &&
        (!filterStatus || r.status === filterStatus) &&
        matchesDateFilter(r.createdDate, filterDate) &&
        (!q || `${r.reqNo} ${r.name} ${r.empCode} ${r.hn || ''} ${r.patientName || ''} ${r.formCode || ''} ${r.formName || ''}`.toLowerCase().includes(q))
      );
    });
  }, [rows, activeTab, search, filterRequester, filterPurpose, filterStatus, filterDate]);

  const handleSort = (key) => setSortConfig((prev) => (
    prev.key === key
      ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
      : { key, direction: 'asc' }
  ));

  const sorted = useMemo(() => {
    const { key, direction } = sortConfig;
    const sign = direction === 'desc' ? -1 : 1;
    const copy = filtered.slice();
    if (!key) return copy.sort((a, b) => a.id - b.id);
    copy.sort((a, b) => {
      const av = String(a[key] ?? ''); const bv = String(b[key] ?? '');
      const primary = av.localeCompare(bv, 'th');
      return primary !== 0 ? sign * primary : a.id - b.id;
    });
    return copy;
  }, [filtered, sortConfig]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const rangeStart = sorted.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(safePage * PAGE_SIZE, sorted.length);
  const isAllFilters = !filterRequester && !filterPurpose
    && (!filterStatus || STATUS_FILTER_HIDDEN_TABS.has(activeTab))
    && (!filterDate || filterDate.quick === 'thisyear');

  const resetFilters = () => {
    setFilterRequester(''); setFilterPurpose(''); setFilterStatus('');
    setFilterDate({ quick: 'thisyear' }); setPage(1);
  };

  const filtersActive = !isAllFilters || search.trim() !== '';
  const { showClearChip, resultsOpaque, clearFilters } = useSmoothClearFilters(filtersActive, () => {
    resetFilters();
    setSearch('');
  });

  const handleSubmit = (value, item) => {
    const q = (item?.value || item?.label || value || '').trim();
    if (q) pushHistory(item?.badges ? item : { label: q, value: q });
    setSearch(q); setPage(1);
  };

  /* Status-dependent action column — ✓ approve / ✗ reject, one disabled per
     status (Figma 363:122327) + ปุ่มดูรายละเอียด (audit).
     อนุมัติ → ApprovePeriodPopup ระบุช่วงเวลาเข้าถึง (ด.1.1.17.2). */
  const renderAction = (row) => {
    const meta = ACCESS_STATUS[row.status] || {};
    const showApproveReject = meta.canApprove || meta.canReject || row.status === 'อนุมัติแล้ว';
    return (
      <div className='flex items-center justify-end' style={{ gap: 'var(--dim-space-150)' }}>
        <NeutralSubdueIconButton
          icon='visibility'
          variant='outline'
          size='sm'
          aria-label='ดูรายละเอียดและ audit'
          title='รายละเอียด / audit'
          onClick={() => setDetailFor(row)}
        />
        {showApproveReject && (
          <>
            <NeutralSubdueIconButton
              icon='check'
              variant='outline'
              size='sm'
              disabled={!meta.canApprove}
              aria-label='อนุมัติคำขอ'
              title='อนุมัติ (ระบุช่วงเวลาสิทธิ)'
              onClick={() => meta.canApprove && handleApproveRequest(row)}
            />
            <NeutralSubdueIconButton
              icon='close'
              variant='outline'
              size='sm'
              disabled={!meta.canReject}
              aria-label='ปฏิเสธคำขอ'
              title={meta.canReject ? 'ปฏิเสธ' : 'ปฏิเสธ (ไม่สามารถปฏิเสธหลังอนุมัติแล้ว)'}
              onClick={() => meta.canReject && setDialog({ record: row, kind: 'reject' })}
            />
          </>
        )}
      </div>
    );
  };

  /* ด.1.1.17.3 — คอลัมน์ Active: Switch เปิด/ปิดการให้สิทธิตามเอกสาร */
  const renderActive = (row) => {
    if (row.status !== 'อนุมัติแล้ว' && row.status !== 'หมดอายุ') {
      return <span style={MUTED_CELL}>-</span>;
    }
    /* หมดช่วงเวลา → ห้าม re-activate จนกว่าจะตั้งช่วงใหม่ (อนุมัติใหม่) */
    const periodOver = row.periodEnd && (daysLeftOfIso(row.periodEnd) ?? 1) < 0;
    return (
      <span title={periodOver ? 'หมดช่วงเวลาแล้ว — ต้องอนุมัติพร้อมตั้งช่วงเวลาใหม่ก่อนจึงเปิดได้' : (row.active ? 'ปิดการให้สิทธิ' : 'เปิดการให้สิทธิ')}>
        <Switch
          checked={!!row.active}
          disabled={periodOver}
          onChange={() => !periodOver && setToggleFor(row)}
          aria-label={`สถานะ Active ของ ${row.reqNo}`}
        />
      </span>
    );
  };

  /* ด.1.1.17.2 — คอลัมน์ช่วงเวลาสิทธิ + วันคงเหลือ (admin คลิกแก้ไขได้) */
  const renderPeriod = (row) => {
    const editable = row.periodStart && (row.status === 'อนุมัติแล้ว' || row.status === 'หมดอายุ');
    if (!row.periodStart) return <StackCell top='รอ Admin กำหนดช่วงสิทธิ' bottom={requestedPeriodLabel(row) ? `ผู้ขอเสนอ: ${requestedPeriodLabel(row)}` : 'ยังไม่มีช่วงวันที่เสนอ'} />;
    const left = daysLeftOfIso(row.periodEnd);
    const top = `${thaiDateOfIso(row.periodStart)} – ${thaiDateOfIso(row.periodEnd)}`;
    const bottom = left != null && left >= 0 ? `เหลืออีก ${left} วัน` : 'หมดช่วงเวลาแล้ว';
    if (!editable) return <StackCell top={top} bottom={bottom} />;
    return (
      <button
        type='button'
        onClick={() => setEditPeriodFor(row)}
        title='คลิกเพื่อแก้ไขช่วงเวลาสิทธิ'
        className='flex flex-col min-w-0 text-left'
        style={{
          gap: 'var(--dim-space-0)',
          background: 'transparent',
          border: 'none',
          outline: 'none',
          cursor: 'pointer',
          padding: 0,
        }}
      >
        <span className='truncate' style={{ ...TEXT_CELL, color: 'var(--text-brandPrimary-default)', textDecoration: 'underline', textUnderlineOffset: 2 }}>{top}</span>
        <span className='truncate' style={{ ...MUTED_CELL, fontSize: 'var(--type-size-xs)' }}>{bottom} · แก้ไข</span>
      </button>
    );
  };

  const columns = useMemo(() => [
    { key: 'reqNo', header: 'เลขที่คำขอ', sortable: true, render: (r) => <Cell value={r.reqNo} /> },
    {
      key: 'name', header: 'ผู้ขอ (เจ้าหน้าที่)', sortable: true,
      render: (r) => (
        <div className='flex items-center min-w-0' style={{ gap: 'var(--dim-space-150)' }}>
          <RequesterAvatar row={r} />
          <span className='truncate' style={TEXT_CELL}>{r.name}</span>
        </div>
      ),
    },
    { key: 'empCode', header: 'รหัสพนักงาน', sortable: true, render: (r) => <Cell value={r.empCode} /> },
    {
      key: 'group', header: 'กิจกรรม / กิจกรรมย่อย / แผนก',
      render: (r) => <ScopeCell row={r} />,
    },
    { key: 'createdDate', header: 'วันที่สร้างคำขอ', sortable: true, render: (r) => <StackCell top={r.createdDate} bottom={formatAccessCreatedTime(r.createdTime)} /> },
    { key: 'hn', header: 'ขอเข้าถึงของผู้รับบริการ', render: (r) => <PatientCell row={r} /> },
    {
      key: 'accessType', header: 'ประเภทการขอ',
      render: (r) => {
        const value = r.accessTypeLabel || ACCESS_TYPE_DISPLAY_LABEL[r.accessType];
        return value && value !== '-'
          ? <span className='block truncate min-w-0' style={TEXT_CELL}>{value}</span>
          : <span style={MUTED_CELL}>-</span>;
      },
    },
    {
      key: 'formName', header: 'แบบฟอร์มที่ขอเข้าถึง', flex: true, minWidth: 360,
      render: (r) => (
        <FormCell
          row={r}
          onClick={() => {
            const rec = resolveAccessFormViewRecord(r);
            if (rec) setFormViewFor(rec);
          }}
        />
      ),
    },
    { key: 'reason', header: 'เหตุผลที่ขอ', render: (r) => <Cell value={r.reason} /> },
    { key: 'period', header: 'ช่วงเวลาสิทธิ (Admin)', render: renderPeriod },
    { key: 'file', header: 'หลักฐาน', render: (r) => <FileCell name={r.file} size={r.fileSize} onClick={() => setPreviewFile(r)} /> },
    {
      key: 'status', header: 'สถานะ', sortable: true,
      render: (r) => (
        <div className='flex flex-col items-start' style={{ gap: 'var(--dim-space-050)' }}>
          <ColorfulBadge style={(ACCESS_STATUS[r.status] || {}).tone || 'grey'} size='small' hierarchy='secondary' width='hug'>{r.status}</ColorfulBadge>
          {r.expiredByPeriod && (
            <span style={{ ...MUTED_CELL, fontSize: 'var(--type-size-xs)' }}>Inactive อัตโนมัติ (หมดช่วงเวลา)</span>
          )}
        </div>
      ),
    },
    /* ด.1.1.17.3 — เปิด/ปิดการให้สิทธิตามที่ระบุในเอกสาร */
    { key: 'active', header: 'Active', render: renderActive },
    { key: 'action', header: 'การจัดการ', render: renderAction },
  ].filter((column) => !mineOnly || !['name', 'empCode', 'active', 'action'].includes(column.key)), [mineOnly]);

  return (
    <>
      <QueuePageShell
        /* mineOnly ไม่มีเมนูของตัวเองแล้ว (ถอดออก 25 ส.ค. 69) — ไฮไลต์
           "จัดการสิทธิ์ฯ" ซึ่งเป็นหน้าเดียวกัน ไม่งั้น side menu จะไม่มีอะไร active */
        activeKey='consent-access'
        sidebarItems={CONSENT_NAV}
        sidebarFallbackKey='consent-access'
        brandTitle='ระบบจัดการความยินยอม'
        breadcrumb={mineOnly ? ['รายการคำขอของฉัน'] : breadcrumb}
        title={mineOnly ? 'รายการคำขอของฉัน' : 'จัดการสิทธิ์การขอเข้าถึงแบบฟอร์ม'}
        headerInfo={(
          <section className='flex items-stretch flex-wrap' style={{ gap: 'var(--dim-space-400)' }}>
            {summaryCards.map((c) => (
              <SummaryCard key={c.key} card={c} variant='panel' />
            ))}
          </section>
        )}
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={(key) => {
          setActiveTab(key);
          setPage(1);
          if (STATUS_FILTER_HIDDEN_TABS.has(key)) setFilterStatus('');
        }}
      >
        <div className='flex flex-col flex-1 min-w-0' style={{ padding: 'var(--dim-space-600)' }}>
          <section
            className='w-full flex flex-col'
            style={{
              background: 'var(--surface-card-100)',
              borderRadius: 'var(--dim-radius-500)',
              border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
              boxShadow: 'var(--shadow-card)',
              padding: 'var(--dim-space-600)',
              gap: 'var(--dim-space-600)',
            }}
          >
            <div className='w-full flex items-start justify-center'>
              <PrimarySearch
                value={search}
                onChange={(v) => { setSearch(v); setPage(1); }}
                onSubmit={handleSubmit}
                placeholder='ค้นหาเลขที่คำขอ / ชื่อเจ้าหน้าที่ / HN...'
                width={640}
                suggestions={searchSuggestions}
                history={searchHistory}
                onHistoryClear={searchHistory.length > 0 ? clearHistory : undefined}
              />
            </div>

            <div className='w-full flex flex-col' style={{ gap: 'var(--dim-space-300)' }}>
              <div className='flex items-start w-full' style={{ gap: 'var(--dim-space-300)' }}>
                <div className='flex items-center flex-wrap min-w-0' style={{ gap: 'var(--dim-space-200)' }}>
                  <FilterDropdown prefix='ผู้ขอ:' options={requesterOptions} value={filterRequester} onChange={(v) => { setFilterRequester(v); setPage(1); }} />
                  <FilterDropdown prefix='วัตถุประสงค์:' options={purposeOptions} value={filterPurpose} onChange={(v) => { setFilterPurpose(v); setPage(1); }} />
                  {!STATUS_FILTER_HIDDEN_TABS.has(activeTab) && (
                    <FilterDropdown prefix='สถานะ:' options={statusOptions} value={filterStatus} onChange={(v) => { setFilterStatus(v); setPage(1); }} />
                  )}
                  <FilterDateTag
                    prefix='วันที่:'
                    value={filterDate}
                    onChange={(v) => { setFilterDate(v); setPage(1); }}
                    defaultQuick='thisyear'
                  />
                  <ClearFiltersTag active={showClearChip} onClear={clearFilters} />
                </div>
              </div>

              <SmoothFilterResults opaque={resultsOpaque}>
              <SearchResultCount found={sorted.length} total={rows.length} filtered={filtersActive} />

              <Table
                columns={columns}
                rows={pageRows}
                rowKey={(row) => row.id}
                sortConfig={sortConfig}
                onSort={handleSort}
                stickyColCount={2}
                stickyHeaderTop={QUEUE_STICKY_UNDER_TABS}
                emptyMessage='ไม่พบคำขอสิทธิ์การเข้าถึง'
                emptySubtext='ลองปรับตัวกรองหรือคำค้นหา'
              />

              <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-600)', paddingTop: 'var(--dim-space-400)' }}>
                <span style={{ flex: 1, color: 'var(--text-content-secondary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)', lineHeight: 1.5 }}>
                  แสดง {rangeStart}-{rangeEnd} จาก {sorted.length} รายการ
                </span>
                {sorted.length > PAGE_SIZE && (
                  <Pagination currentPage={safePage} pageCount={totalPages} onPageChange={setPage} />
                )}
              </div>
              </SmoothFilterResults>
            </div>
          </section>
        </div>
      </QueuePageShell>

      {/* ปฏิเสธคำขอ — confirm แล้ว mutate จริง (mock) */}
      <AlertDialog
        open={!!dialog}
        type='warning'
        title='ยืนยันการปฏิเสธคำขอเข้าถึงข้อมูล'
        description={dialog ? `ยืนยันปฏิเสธคำขอ ${dialog.record.reqNo} ของ ${dialog.record.name}` : ''}
        confirmLabel='ยืนยัน'
        cancelLabel='ยกเลิก'
        onConfirm={() => {
          if (dialog) {
            patchRow(dialog.record.id, { status: 'ปฏิเสธ', active: false, audit: { by: 'ลดา ดีงาม', at: nowThai() } });
            pushToast('ปฏิเสธคำขอแล้ว');
          }
          setDialog(null);
        }}
        onCancel={() => setDialog(null)}
        onClose={() => setDialog(null)}
      />

      {/* ด.1.1.17.2 — อนุมัติพร้อมระบุช่วงเวลาสิทธิ */}
      <ApprovePeriodPopup
        open={!!approveFor}
        record={approveFor}
        onClose={() => setApproveFor(null)}
        onApprove={({ periodStart, periodEnd }) => {
          const rec = approveFor;
          setApproveFor(null);
          if (rec) {
            patchRow(rec.id, {
              status: 'อนุมัติแล้ว',
              active: true,
              periodStart,
              periodEnd,
              expiredByPeriod: false,
              audit: { by: 'ลดา ดีงาม', at: nowThai() },
            });
            pushToast('อนุมัติแล้ว');
          }
        }}
      />

      {/* admin แก้ไขช่วงเวลาสิทธิ — คลิกคอลัมน์ช่วงเวลา */}
      <EditPeriodPopup
        open={!!editPeriodFor}
        record={editPeriodFor}
        thaiDateOfIso={thaiDateOfIso}
        onClose={() => setEditPeriodFor(null)}
        onSave={({ periodStart, periodEnd }) => {
          const rec = editPeriodFor;
          setEditPeriodFor(null);
          if (!rec) return;
          const stillValid = (daysLeftOfIso(periodEnd) ?? -1) >= 0;
          patchRow(rec.id, {
            periodStart,
            periodEnd,
            ...(stillValid && rec.status === 'หมดอายุ'
              ? { status: 'อนุมัติแล้ว', active: true, expiredByPeriod: false }
              : {}),
            audit: {
              ...(rec.audit || {}),
              by: 'ลดา ดีงาม',
              at: rec.audit?.at || nowThai(),
              editedAt: nowThai(),
            },
          });
          pushToast(`แก้ไขช่วงเวลาสิทธิ ${rec.reqNo} แล้ว — ${thaiDateOfIso(periodStart)} ถึง ${thaiDateOfIso(periodEnd)}`);
        }}
      />

      {/* ด.1.1.17.3 — ยืนยันเปิด/ปิด Active (destructive เมื่อปิดสิทธิที่ใช้อยู่) */}
      <AlertDialog
        open={!!toggleFor}
        type={toggleFor && toggleFor.active ? 'destructive' : 'info'}
        title={toggleFor && toggleFor.active ? 'ปิดการให้สิทธิ (Inactive)?' : 'เปิดการให้สิทธิ (Active)?'}
        description={toggleFor
          ? `${toggleFor.reqNo} ของ ${toggleFor.name} — ${toggleFor.active
            ? 'สิทธินี้กำลังใช้งานอยู่ การปิดจะมีผลทันที และบันทึกผู้ทำ/เวลาไว้ใน audit (ไม่มีการลบประวัติ)'
            : 'เปิดการให้สิทธิตามช่วงเวลาที่ระบุไว้ในเอกสาร'}`
          : ''}
        confirmLabel={toggleFor && toggleFor.active ? 'ปิดสิทธิ' : 'เปิดสิทธิ'}
        cancelLabel='ยกเลิก'
        onConfirm={() => {
          if (toggleFor) {
            const next = !toggleFor.active;
            patchRow(toggleFor.id, { active: next, audit: { by: 'ลดา ดีงาม', at: nowThai() } });
            pushToast(`${next ? 'เปิด' : 'ปิด'}การให้สิทธิ ${toggleFor.reqNo} แล้ว — บันทึก audit ผู้ทำ/เวลา`);
          }
          setToggleFor(null);
        }}
        onCancel={() => setToggleFor(null)}
        onClose={() => setToggleFor(null)}
      />

      {/* รายละเอียด + audit */}
      <AccessDetailPopup
        open={!!detailFor}
        record={detailFor}
        onClose={() => setDetailFor(null)}
        thaiDateOfIso={thaiDateOfIso}
        onApprove={(row) => handleApproveRequest(row)}
        onReject={(row) => setDialog({ record: row, kind: 'reject' })}
      />

      <PhcisTopToast session={toast} onDismiss={() => setToast(null)} />

      <ConsentFormViewPopup
        open={!!formViewFor}
        record={formViewFor}
        onClose={() => setFormViewFor(null)}
        onToast={setToast}
        showAuditBar={false}
      />

      {/* Attached-document preview (Figma DataCell click annotation) */}
      <Popup
        open={!!previewFile}
        onClose={() => setPreviewFile(null)}
        size='large'
        title={previewFile ? previewFile.file : 'เอกสารที่แนบ'}
        subtitle={previewFile ? `แบบฟอร์มขอเข้าถึงข้อมูล · ${previewFile.fileSize}` : undefined}
        primaryAction={{ label: 'ปิด', onClick: () => setPreviewFile(null) }}
      >
        {previewFile && <DocPreview row={previewFile} />}
      </Popup>
    </>
  );
}
