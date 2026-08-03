import React, { useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import { SummaryCard } from '@/components/layout/SummaryCardsBar';
import PrimarySearch from '@/components/search/PrimarySearch';
import useSearchHistory from '@/components/search/useSearchHistory';
import FilterTag, { FilterDropdown } from '@/components/forms/FilterTag';
import Table from '@/components/table/Table';
import Pagination from '@/components/pagination/Pagination';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import BrandButton from '@/components/button/BrandButton';
import NeutralButton from '@/components/button/NeutralButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import NeutralSubdueIconButton from '@/components/button/NeutralSubdueIconButton';
import AlertDialog from '@/components/popup/AlertDialog';
import CheckboxBox from '@/components/checkbox/CheckboxBox';
import PhcisTopToast from '@/components/alert/PhcisTopToast';
import SuccessToast from '@/components/toast/SuccessToast';
import PersonalDataConsentEditPopup from '@/components/forms/PersonalDataConsentEditPopup';
import ConsentIdentityVerifyPopup from '@/components/popup/ConsentIdentityVerifyPopup';
import { useClinicFilter } from '@/components/layout/HeaderClinicContext';
import { formatServiceCenterChannel } from '@/data/consentChannels';
import {
  CONSENT_RECORDS, CONSENT_SUMMARY, CONSENT_TABS,
  CONSENT_STATUS, CONSENT_TYPE_TONE, CONSENT_CONFIRM,
} from '@/data/consentRecords';
import {
  applySupersededTypesToRecords,
  cancelConsentRequest,
  getConsentRecords,
  isTypeSuperseded,
  listSupersededTypes,
  patchConsentRecord,
  setConsentRecords,
  subscribeConsentStore,
} from '@/data/consentWorkflowStore';
import {
  ExportFormatPopup,
  buildWorklistExportReport,
} from '@/pages/consent/consentExportPopup';
import {
  canCreateConsentRequest,
  canExportConsent,
  canManageConsent,
  canRevokeConsent,
} from '@/data/consentPermissions';
import {
  CreateConsentRequestPopup, ReconsentPopup, PaperConsentRecordPopup,
  STAFF_NAME, todayThai,
} from '@/pages/consent/consentWorkflowPopups';
import CONSENT_NAV from '@/pages/consent/consentNav';
import QueuePatientAvatar from '@/components/patient/QueuePatientAvatar';
import { enrichConsentRow } from '@/data/consentPatientDisplay';
import { resolveConsentFormFromTemplate } from '@/data/consentFormRecords';
import { openConsentHistoryTab } from '@/data/consentPatientHistory';

/* PHCIS | Consent — ระบบจัดการความยินยอม (Figma node 1:4).
   Consent registry: summary cards · tabs · search · filters · table with a
   STATUS-DEPENDENT action column (annotation 277:65195 — "แต่ละ Status, CTA
   ใน Column การดำเนินการจะต่างกัน"), the Consent History popup (299:86535),
   and per-action confirm AlertDialogs (277:84661 …).

   All values alias design.md tokens; UI copy is Thai; data is local mock. */

const PAGE_SIZE = 10;
const breadcrumb = ['จัดการความยินยอม'];

/* แท็บที่ tab กรองสถานะอยู่แล้ว — ซ่อน filter chip "สถานะ" */
const STATUS_FILTER_HIDDEN_TABS = new Set(['pending', 'consented', 'rejected', 'expiring']);

/* Checkbox ในคอลัมน์เลือก — กัน click ไปเปิดแถว + ไม่มี label โผล่ใน header */
const TableSelectCheckbox = ({ checked, label, onChange }) => (
  <label
    className='inline-flex items-center justify-center'
    onClick={(e) => e.stopPropagation()}
    onKeyDown={(e) => e.stopPropagation()}
    style={{ cursor: 'pointer' }}
  >
    <input
      type='checkbox'
      className='sr-only'
      checked={checked}
      aria-label={label}
      onChange={(e) => onChange?.(e.target.checked)}
    />
    <CheckboxBox checked={checked} />
  </label>
);

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

export default function ConsentManagementPage() {
  const navigate = useHistory();
  const { clinic } = useClinicFilter() || {};
  const serviceCenterChannel = formatServiceCenterChannel(clinic);
  /* ── Worklist rows เป็น state จริง (mock mutate ใน session) ──────────
     ด.1.1.5: record ที่เซ็นเทมเพลตซึ่งถูกเผยแพร่เวอร์ชันใหม่ไปแล้ว (store
     ข้ามหน้า) โผล่มาเป็นสถานะ "มีเวอร์ชันใหม่" ตั้งแต่โหลดหน้า. */
  const loadRows = () => applySupersededTypesToRecords(new Set(listSupersededTypes()))
    .map(enrichConsentRow);
  const [rows, setRows] = useState(loadRows);
  useEffect(() => subscribeConsentStore(() => setRows(loadRows())), []);
  const canManage = canManageConsent();
  const canRevoke = canRevokeConsent();
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterChannel, setFilterChannel] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [page, setPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [dialog, setDialog] = useState(null);      // { record | bulkIds, confirmKey }
  /* ── Workflow popups (ด.1.1.4 / ด.1.1.7 / ด.1.1.8 / ด.1.1.1 / ด.1.1.2) ── */
  const [createOpen, setCreateOpen] = useState(false);
  const [reconsentFor, setReconsentFor] = useState(null);        // record | { bulkIds }
  const [paperFor, setPaperFor] = useState(null);                // record
  const [editFor, setEditFor] = useState(null);                  // signed record → PersonalDataConsentEditPopup
  /* Identity gate — { next: 'revoke'|'paper'|'edit'|'bulk-revoke', record?, bulkIds? } */
  const [verifyFor, setVerifyFor] = useState(null);
  const [verifiedAudit, setVerifiedAudit] = useState(null);
  /* Bulk-select mode — Figma 297:128439 (แท็บรอลงนาม): chip "เลือก" เปิด
     คอลัมน์ checkbox เพื่อดำเนินการหลายรายการพร้อมกัน */
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [toast, setToast] = useState(null);
  const [exportReport, setExportReport] = useState(null);
  const [exportDone, setExportDone] = useState(false);
  const { history: searchHistory, push: pushHistory, clear: clearHistory } =
    useSearchHistory('mih:primarysearch-history:consent');

  /* ── Tabs with live counts ──────────────────────────────────────── */
  const tabs = useMemo(() => CONSENT_TABS.map((t) => ({
    key: t.value,
    label: t.label,
    icon: t.icon,
    count: t.value === 'all'
      ? rows.length
      : rows.filter((r) => (CONSENT_STATUS[r.status] || {}).tab === t.value).length,
  })), [rows]);

  const typeOptions = useMemo(() => [
    { value: '', label: 'ทั้งหมด' },
    ...[...new Set(rows.map((r) => r.type))].map((t) => ({ value: t, label: t })),
  ], [rows]);
  const channelOptions = useMemo(() => [
    { value: '', label: 'ทุกช่องทาง' },
    ...[...new Set(rows.map((r) => r.signChannel).filter((c) => c && c !== '-'))]
      .map((c) => ({ value: c, label: c })),
  ], [rows]);
  const statusOptions = useMemo(() => [
    { value: '', label: 'ทุกสถานะ' },
    ...Object.keys(CONSENT_STATUS).map((s) => ({ value: s, label: s })),
  ], []);
  const dateOptions = [
    { value: '', label: 'ทุกวัน' },
    { value: 'today', label: 'วันนี้' },
    { value: '7', label: '7 วันล่าสุด' },
    { value: '30', label: '30 วันล่าสุด' },
  ];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      const meta = CONSENT_STATUS[r.status] || {};
      return (
        (activeTab === 'all' || meta.tab === activeTab) &&
        (!filterType || r.type === filterType) &&
        (!filterChannel || r.signChannel === filterChannel) &&
        (!filterStatus || r.status === filterStatus) &&
        (!q || r.name.toLowerCase().includes(q) || r.hn.toLowerCase().includes(q))
      );
    });
  }, [rows, activeTab, search, filterType, filterChannel, filterStatus]);

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
  const hideStatusFilter = STATUS_FILTER_HIDDEN_TABS.has(activeTab);
  const isAllFilters = !filterType && !filterChannel && (!filterStatus || hideStatusFilter) && !filterDate;

  const resetFilters = () => {
    setFilterType(''); setFilterChannel(''); setFilterStatus(''); setFilterDate(''); setPage(1);
  };

  const handleSubmit = (value) => {
    const q = (value || '').trim();
    if (q) pushHistory({ label: q, value: q });
    setSearch(q); setPage(1);
  };

  /* ── Mock mutations (session-only — ไม่ persist) ────────────────── */
  const patchRow = (id, patch) => patchConsentRecord(id, patch);
  const nextId = () => rows.reduce((m, r) => Math.max(m, r.id), 0) + 1;
  const dueInDays = (days) => {
    const d = new Date(Date.now() + days * 86400000);
    return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });
  };
  const pushToast = (message, variant = 'success') =>
    setToast({ id: Date.now(), variant, message });

  /* Re-Consent จริง (ด.1.1.7): record เดิม → "หมดอายุ-Reconsent" + เกิด record
     ใหม่ "รอลงนาม" เวอร์ชันล่าสุดพร้อมช่องทาง/วันครบกำหนด. */
  const runReconsent = (record, { channel, dueDate, latestVersion }) => {
    const id = nextId();
    const next = getConsentRecords()
      .map((r) => (r.id === record.id ? { ...r, status: 'หมดอายุ-Reconsent', pendingReconsent: true } : r))
      .concat([{
        id,
        hn: record.hn,
        name: record.name,
        type: record.type,
        formCode: record.formCode,
        formName: record.formName,
        version: latestVersion || record.version,
        status: 'รอลงนาม',
        signChannel: '-',
        requestChannel: channel,
        requester: STAFF_NAME,
        createdDate: todayThai(),
        signedDate: '-',
        withdrawnDate: '-',
        dueDate,
        guardian: record.guardian,
        history: [...(record.history || [])],
      }]);
    setConsentRecords(next);
    pushToast(`สร้างคำขอ Re-Consent ของ ${record.name} แล้ว — รอลงนามผ่าน${channel} ภายใน ${dueDate}`);
  };

  /* ด.1.1.1 — ผ่านการพิสูจน์ตัวตนแล้วค่อยปล่อย action ที่ทำแทนเจ้าของข้อมูล */
  const handleVerified = (audit) => {
    const v = verifyFor;
    setVerifyFor(null);
    setVerifiedAudit(audit);
    if (!v) return;
    if (v.next === 'revoke') setDialog({ record: v.record, confirmKey: 'revoke' });
    else if (v.next === 'bulk-revoke') setDialog({ bulkIds: v.bulkIds, confirmKey: 'revoke' });
    else if (v.next === 'paper') setPaperFor(v.record);
    else if (v.next === 'edit') setEditFor(v.record);
  };

  /* ── Status-dependent action column ─────────────────────────────── */
  const renderAction = (row) => {
    const action = (CONSENT_STATUS[row.status] || {}).action;
    const isReconsent = action && action.confirm === 'reconsent';
    /* Edge: มีคำขอ reconsent ค้างอยู่แล้ว → ปุ่ม disabled + tooltip */
    const reconsentBlocked = isReconsent && row.pendingReconsent;
    const fireAction = () => {
      if (!action) return;
      if (action.confirm === 'revoke' && !canRevoke) return;
      if (action.confirm === 'revoke') setVerifyFor({ next: 'revoke', record: row });
      else if (action.confirm === 'reconsent') setReconsentFor(row);
      else setDialog({ record: row, confirmKey: action.confirm });
    };
    return (
      <div className='flex items-center justify-end' style={{ gap: 'var(--dim-space-150)' }}>
        <NeutralSubdueIconButton
          icon='history'
          variant='outline'
          size='sm'
          aria-label='ดูประวัติความยินยอม'
          title='ประวัติความยินยอม'
          onClick={() => openConsentHistoryTab(row.hn)}
        />
        {/* ด.1.1.8 — บันทึกให้/เพิกถอนจากเอกสารกระดาษ (ผ่าน identity verify) */}
        <NeutralSubdueIconButton
          icon='upload_file'
          variant='outline'
          size='sm'
          aria-label='บันทึกจากเอกสารกระดาษ'
          title='บันทึกจากเอกสาร'
          onClick={() => setVerifyFor({ next: 'paper', record: row })}
        />
        {/* ด.1.1.2 — แถว signed แก้ไข/เพิกถอนรายข้อ 5.1/5.2 (ผ่าน verify) */}
        {row.status === 'ยินยอมแล้ว' && (
          <NeutralSubdueIconButton
            icon='edit'
            variant='outline'
            size='sm'
            aria-label='แก้ไขความยินยอมรายข้อ'
            title='แก้ไขความยินยอม (5.1 / 5.2)'
            onClick={() => setVerifyFor({ next: 'edit', record: row })}
          />
        )}
        {action && (
          <span title={reconsentBlocked ? 'มีคำขอรอลงนามอยู่แล้ว' : undefined}>
            {action.kind === 'brand' ? (
              <BrandButton variant='fill' size='sm' disabled={reconsentBlocked} onClick={fireAction}>
                {action.label}
              </BrandButton>
            ) : action.kind === 'subdued' ? (
              <NeutralSubdueButton variant='outline' size='sm' disabled={reconsentBlocked} onClick={fireAction}>
                {action.label}
              </NeutralSubdueButton>
            ) : (
              <NeutralButton variant='outline' size='sm' disabled={reconsentBlocked} onClick={fireAction}>
                {action.label}
              </NeutralButton>
            )}
          </span>
        )}
      </div>
    );
  };

  const columns = useMemo(() => [
    { key: 'hn', header: 'HN', width: 110, sortable: true, render: (r) => <Cell value={r.hn} /> },
    {
      key: 'name', header: 'ชื่อ-นามสกุล', width: 220, sortable: true,
      render: (r) => (
        <div className='flex items-center min-w-0' style={{ gap: 'var(--dim-space-150)' }}>
          <QueuePatientAvatar
            hn={r.hn}
            name={r.name}
            avatarUrl={r.avatarUrl}
            size={36}
          />
          <div className='flex flex-col min-w-0'>
            <span className='truncate' style={TEXT_CELL}>{r.name}</span>
            {/* Edge ผู้เยาว์: แสดงผู้ปกครองผู้ลงนามแทนใต้ชื่อ */}
            {r.guardian && (
              <span className='truncate' style={{ ...MUTED_CELL, fontSize: 'var(--type-size-xs)' }}>
                ผู้แทน: {r.guardian}
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'formName', header: 'ชื่อแบบฟอร์ม', width: 280, sortable: true,
      render: (r) => (
        <span className='truncate block min-w-0' style={TEXT_CELL} title={r.formName}>
          {r.formName || '-'}
        </span>
      ),
    },
    {
      key: 'type', header: 'ประเภท Consent', width: 150, sortable: true,
      render: (r) => <ColorfulBadge style={CONSENT_TYPE_TONE[r.type] || 'grey'} size='small' hierarchy='secondary' width='hug'>{r.type}</ColorfulBadge>,
    },
    {
      key: 'version', header: 'เวอร์ชั่น', width: 104,
      render: (r) => <ColorfulBadge style='blue' size='small' hierarchy='secondary' width='hug'>{r.version}</ColorfulBadge>,
    },
    {
      key: 'status', header: 'สถานะ', width: 160, sortable: true,
      render: (r) => (
        <div className='flex flex-col items-start' style={{ gap: 'var(--dim-space-050)' }}>
          <ColorfulBadge style={(CONSENT_STATUS[r.status] || {}).tone || 'grey'} size='small' hierarchy='secondary' width='hug'>{r.status}</ColorfulBadge>
          {/* ด.1.1.7 — countdown บนแท็บใกล้หมดอายุ */}
          {r.expiresInDays != null && (CONSENT_STATUS[r.status] || {}).tab === 'expiring' && (
            <span style={{ color: 'var(--text-danger-default, #B91C1C)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', lineHeight: 1.4 }}>
              อีก {r.expiresInDays} วัน
            </span>
          )}
          {r.dueDate && r.status === 'รอลงนาม' && (
            <span style={{ color: 'var(--text-content-tertiary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', lineHeight: 1.4 }}>
              ครบกำหนด {r.dueDate}
            </span>
          )}
          {r.revokeRequestedDate && r.status === 'ขอเพิกถอน' && (
            <span style={{ color: 'var(--text-danger-default, #B91C1C)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', lineHeight: 1.4 }}>
              ขอเพิกถอน {r.revokeRequestedDate}
              {r.revokeRequestChannel ? ` · ${r.revokeRequestChannel}` : ''}
            </span>
          )}
        </div>
      ),
    },
    { key: 'signChannel', header: 'ช่องทางที่ลงนาม', width: 150, render: (r) => <Cell value={r.signChannel} /> },
    { key: 'requester', header: 'ผู้สร้างคำขอ', width: 140, render: (r) => <Cell value={r.requester} /> },
    { key: 'createdDate', header: 'วันที่สร้างคำขอ/Reconsent', width: 210, sortable: true, render: (r) => <Cell value={r.createdDate} /> },
    { key: 'signedDate', header: 'วันที่ลงนาม', width: 150, render: (r) => <Cell value={r.signedDate} /> },
    { key: 'withdrawnDate', header: 'วันที่ถอนความยินยอม', width: 180, render: (r) => <Cell value={r.withdrawnDate} /> },
    { key: 'action', header: 'การดำเนินการ', width: 210, render: renderAction },
  ], []);

  const confirm = dialog ? CONSENT_CONFIRM[dialog.confirmKey] : null;

  /* ── Bulk-select helpers ────────────────────────────────────────── */
  /* Bulk CTA ต่อแท็บ (แท็บ all ไม่มี bulk action — สถานะปนกัน) */
  const BULK_ACTION_BY_TAB = {
    pending:   { label: 'ยกเลิกคำขอ', confirm: 'cancel' },
    consented: { label: 'เพิกถอน',    confirm: 'revoke' },
    rejected:  { label: 'Reconsent',  confirm: 'reconsent' },
    expiring:  { label: 'Reconsent',  confirm: 'reconsent' },
    expired:   { label: 'Reconsent',  confirm: 'reconsent' },
  };
  const bulkAction = BULK_ACTION_BY_TAB[activeTab] || null;

  const toggleSelectMode = () => {
    setSelectMode((v) => !v);
    setSelectedIds(new Set());
  };
  const toggleRow = (id) => setSelectedIds((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const pageAllSelected = pageRows.length > 0 && pageRows.every((r) => selectedIds.has(r.id));
  const togglePageAll = () => setSelectedIds((prev) => {
    const next = new Set(prev);
    if (pageAllSelected) pageRows.forEach((r) => next.delete(r.id));
    else pageRows.forEach((r) => next.add(r.id));
    return next;
  });

  /* ยืนยันแล้ว mutate state จริง (mock) — ครบ "แสดง/บันทึก/ยกเลิก/แก้ไข" */
  const runDialogConfirm = () => {
    if (!dialog) return;
    const auditNote = verifiedAudit
      ? ` (พิสูจน์ตัวตนโดย ${verifiedAudit.method === 'otp' ? 'OTP' : 'เอกสาร'} · ${verifiedAudit.verifiedAt})`
      : '';
    if (dialog.bulkIds) {
      const ids = new Set(dialog.bulkIds);
      if (dialog.confirmKey === 'cancel') {
        dialog.bulkIds.forEach((id) => cancelConsentRequest(id));
      } else if (dialog.confirmKey === 'revoke') {
        setConsentRecords(getConsentRecords().map((r) => (
          ids.has(r.id) ? { ...r, status: 'ถอนความยินยอม', withdrawnDate: todayThai() } : r
        )));
      } else if (dialog.confirmKey === 'reconsent') {
        /* Bulk reconsent — ช่องทางเริ่มต้นที่ศูนย์บริการ ครบกำหนดใน 30 วัน */
        const targets = rows.filter((r) => ids.has(r.id) && !r.pendingReconsent);
        {
          let id = getConsentRecords().reduce((m, r) => Math.max(m, r.id), 0);
          const spawned = targets.map((t) => {
            id += 1;
            return {
              id, hn: t.hn, name: t.name, type: t.type, version: t.version,
              formCode: t.formCode, formName: t.formName,
              status: 'รอลงนาม', signChannel: '-', requestChannel: serviceCenterChannel,
              requester: STAFF_NAME, createdDate: todayThai(), signedDate: '-',
              withdrawnDate: '-', dueDate: dueInDays(30), guardian: t.guardian,
              history: [...(t.history || [])],
            };
          });
          setConsentRecords(
            getConsentRecords()
              .map((r) => (ids.has(r.id) ? { ...r, status: 'หมดอายุ-Reconsent', pendingReconsent: true } : r))
              .concat(spawned),
          );
        }
      }
      pushToast(`${confirm?.title || 'ดำเนินการ'}สำเร็จ ${dialog.bulkIds.length} รายการ${auditNote}`);
      setSelectedIds(new Set());
    } else if (dialog.record) {
      if (dialog.confirmKey === 'cancel') {
        cancelConsentRequest(dialog.record.id);
        pushToast(`ยกเลิกคำขอความยินยอมของ ${dialog.record.name} แล้ว — ประวัติยังอยู่ครบ`);
      } else if (dialog.confirmKey === 'revoke') {
        patchRow(dialog.record.id, { status: 'ถอนความยินยอม', withdrawnDate: todayThai() });
        pushToast(`เพิกถอนความยินยอมของ ${dialog.record.name} แล้ว${auditNote}`);
      }
    }
    setDialog(null);
    setVerifiedAudit(null);
  };

  const handleExport = () => {
    if (!canExportConsent()) return;
    setExportReport(buildWorklistExportReport(filtered));
  };

  const selectColumn = {
    key: '_select',
    width: 52,
    sortable: false,
    align: 'center',
    label: (
      <TableSelectCheckbox
        checked={pageAllSelected}
        label='เลือกทั้งหมดในหน้านี้'
        onChange={() => togglePageAll()}
      />
    ),
    render: (r) => (
      <TableSelectCheckbox
        checked={selectedIds.has(r.id)}
        label={`เลือก ${r.name}`}
        onChange={() => toggleRow(r.id)}
      />
    ),
  };
  /* ในโหมดเลือก: เพิ่มคอลัมน์ checkbox และซ่อนคอลัมน์การดำเนินการรายแถว
     (ตาม Figma แท็บรอลงนาม) */
  const displayColumns = selectMode
    ? [selectColumn, ...columns.filter((c) => c.key !== 'action')]
    : columns;

  return (
    <>
      <QueuePageShell
        activeKey='consent-manage'
        sidebarItems={CONSENT_NAV}
        sidebarFallbackKey='consent-manage'
        brandTitle='ระบบจัดการความยินยอม'
        breadcrumb={breadcrumb}
        title='จัดการความยินยอม'
        actions={canManage ? (
          <BrandButton
            variant='fill'
            size='md'
            leadingIcon='note_add'
            onClick={() => navigate.push('/consent/forms/new')}
          >
            สร้างแบบฟอร์มใหม่
          </BrandButton>
        ) : undefined}
        headerInfo={(
          <section className='flex items-stretch flex-wrap' style={{ gap: 'var(--dim-space-400)' }}>
            {CONSENT_SUMMARY.map((c) => (
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
        <div
          className='flex flex-col flex-1 min-w-0'
          style={{ padding: 'var(--dim-space-600)' }}
        >
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
                placeholder='ค้นหาชื่อผู้ป่วย, HN...'
                width={640}
                history={searchHistory}
                onHistoryClear={searchHistory.length > 0 ? clearHistory : undefined}
              />
            </div>

            <div className='w-full flex flex-col' style={{ gap: 'var(--dim-space-300)' }}>
              <div className='flex items-start w-full' style={{ gap: 'var(--dim-space-300)' }}>
                <div className='flex items-center flex-wrap min-w-0' style={{ gap: 'var(--dim-space-200)' }}>
                  {/* Chip "เลือก" — เปิด/ปิดโหมดเลือกหลายรายการ (Figma 297:128439) */}
                  <FilterTag
                    variant={selectMode ? 'brand' : 'neutral'}
                    selected={selectMode}
                    onClick={toggleSelectMode}
                    showTailingIcon={false}
                    showTitle={false}
                    leadingIcon={<CheckboxBox checked={selectMode} />}
                    value='เลือก'
                  />
                  <FilterTag value='ทั้งหมด' selected={isAllFilters} onClick={resetFilters} />
                  <FilterDropdown prefix='ประเภท:' options={typeOptions} value={filterType} onChange={(v) => { setFilterType(v); setPage(1); }} />
                  <FilterDropdown prefix='ช่องทาง:' options={channelOptions} value={filterChannel} onChange={(v) => { setFilterChannel(v); setPage(1); }} />
                  {!hideStatusFilter && (
                    <FilterDropdown prefix='สถานะ:' options={statusOptions} value={filterStatus} onChange={(v) => { setFilterStatus(v); setPage(1); }} />
                  )}
                  <FilterDropdown prefix='วันที่:' options={dateOptions} value={filterDate} onChange={(v) => { setFilterDate(v); setPage(1); }} />
                </div>
                <div className='flex-1' />
                <div className='flex items-center shrink-0' style={{ gap: 'var(--dim-space-200)' }}>
                  {canExportConsent() && (
                    <NeutralSubdueButton leadingIcon='ios_share' size='sm' collapseLabelBelow='lg' onClick={handleExport}>
                      นำส่งออกรายงาน
                    </NeutralSubdueButton>
                  )}
                  {canCreateConsentRequest() && (
                    <BrandButton variant='fill' size='sm' leadingIcon='add' onClick={() => setCreateOpen(true)}>
                      สร้างคำขอความยินยอม
                    </BrandButton>
                  )}
                </div>
              </div>

              {/* Bulk bar — แสดงเมื่อเลือกอย่างน้อย 1 รายการ */}
              {selectMode && selectedIds.size > 0 && (
                <div
                  className='w-full items-center'
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto 1fr',
                    alignItems: 'center',
                    gap: 'var(--dim-space-300)',
                    padding: 'var(--dim-space-200) var(--dim-space-400)',
                    background: 'var(--surface-brandPrimary-quaternary)',
                    border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-tertiary, #9ADBBF)',
                    borderRadius: 'var(--dim-radius-300)',
                  }}
                >
                  <BrandButton variant='outline' size='sm' onClick={() => setSelectedIds(new Set())}>
                    ยกเลิกการเลือก
                  </BrandButton>
                  <span
                    className='whitespace-nowrap text-center'
                    style={{
                      color: 'var(--text-brandPrimary-default)',
                      fontFamily: 'var(--type-family-body)',
                      fontSize: 'var(--type-size-sm)',
                      fontWeight: 'var(--type-weight-medium)',
                    }}
                  >
                    เลือกแล้ว {selectedIds.size} รายการ
                  </span>
                  <div className='flex items-center justify-end' style={{ gap: 'var(--dim-space-200)' }}>
                    {bulkAction ? (
                      bulkAction.confirm === 'cancel' ? (
                        <NeutralSubdueButton
                          variant='outline'
                          size='sm'
                          onClick={() => setDialog({ bulkIds: [...selectedIds], confirmKey: bulkAction.confirm })}
                        >
                          {bulkAction.label} ({selectedIds.size})
                        </NeutralSubdueButton>
                      ) : (
                        <BrandButton
                          variant='outline'
                          size='sm'
                          onClick={() => (bulkAction.confirm === 'revoke'
                            ? setVerifyFor({ next: 'bulk-revoke', bulkIds: [...selectedIds] })
                            : setDialog({ bulkIds: [...selectedIds], confirmKey: bulkAction.confirm }))}
                        >
                          {bulkAction.label} ({selectedIds.size})
                        </BrandButton>
                      )
                    ) : null}
                  </div>
                </div>
              )}

              <Table
                columns={displayColumns}
                rows={pageRows}
                rowKey={(row) => row.id}
                sortConfig={sortConfig}
                onSort={handleSort}
                stickyColCount={2}
                emptyMessage='ไม่พบรายการความยินยอม'
                emptySubtext='ลองปรับตัวกรองหรือคำค้นหา'
                style={{ maxHeight: 604, overflow: 'auto' }}
              />

              <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-600)', paddingTop: 'var(--dim-space-400)' }}>
                <span style={{ flex: 1, color: 'var(--text-content-secondary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)', lineHeight: 1.5 }}>
                  แสดง {rangeStart}-{rangeEnd} จาก {sorted.length} รายการ
                </span>
                <Pagination currentPage={safePage} pageCount={totalPages} onPageChange={setPage} />
              </div>
            </div>
          </section>
        </div>
      </QueuePageShell>

      {/* Per-status confirm dialog */}
      <AlertDialog
        open={!!dialog}
        type={confirm ? confirm.type : 'info'}
        title={confirm ? confirm.title : ''}
        description={confirm ? confirm.description : ''}
        confirmLabel={confirm ? confirm.confirmLabel : 'ตกลง'}
        cancelLabel='ยกเลิก'
        onConfirm={runDialogConfirm}
        onCancel={() => setDialog(null)}
        onClose={() => setDialog(null)}
      />

      {/* ด.1.1.4 / ด.1.1.6 — workflow สร้างคำขอความยินยอม */}
      <CreateConsentRequestPopup
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={({ patient, template, channel, dueDate }) => {
          const id = nextId();
          const { formCode, formName } = resolveConsentFormFromTemplate(template);
          const rec = {
            id,
            hn: patient.hn,
            name: patient.name,
            type: template.type,
            formCode,
            formName,
            version: template.version,
            status: 'รอลงนาม',
            signChannel: '-',
            requestChannel: channel,
            requester: STAFF_NAME,
            createdDate: todayThai(),
            signedDate: '-',
            withdrawnDate: '-',
            dueDate,
            guardian: patient.guardian,
            history: [],
          };
          setConsentRecords([...getConsentRecords(), rec]);
          setCreateOpen(false);
          pushToast(`สร้างคำขอความยินยอม ${template.code} ให้ ${patient.name} แล้ว — ลงนามผ่าน${channel} ภายใน ${dueDate}`);
        }}
      />

      {/* ด.1.1.7 — Re-Consent เลือกช่องทาง + วันครบกำหนด */}
      <ReconsentPopup
        open={!!reconsentFor}
        record={reconsentFor}
        onClose={() => setReconsentFor(null)}
        onConfirm={(payload) => {
          const rec = reconsentFor;
          setReconsentFor(null);
          if (rec) runReconsent(rec, payload);
        }}
      />

      {/* ด.1.1.8 — บันทึกให้/เพิกถอนจากเอกสารกระดาษ */}
      <PaperConsentRecordPopup
        open={!!paperFor}
        record={paperFor}
        onClose={() => setPaperFor(null)}
        onSave={({ mode, fileName, effectiveDate, reason }) => {
          const rec = paperFor;
          setPaperFor(null);
          if (rec) {
            if (mode === 'revoke') {
              patchRow(rec.id, { status: 'ถอนความยินยอม', withdrawnDate: effectiveDate });
            } else {
              patchRow(rec.id, { status: 'ยินยอมแล้ว', signChannel: serviceCenterChannel, signedDate: effectiveDate });
            }
            pushToast(`บันทึกจากเอกสาร (${fileName}) ของ ${rec.name} แล้ว · เหตุผล: ${reason.slice(0, 40)}${reason.length > 40 ? '…' : ''}`);
          }
        }}
      />

      {/* ด.1.1.1 — พิสูจน์ตัวตนเจ้าของข้อมูลก่อน action แทนเจ้าของข้อมูล */}
      <ConsentIdentityVerifyPopup
        open={!!verifyFor}
        onClose={() => setVerifyFor(null)}
        onVerified={handleVerified}
        actionLabel={
          verifyFor?.next === 'paper' ? 'บันทึกจากเอกสารกระดาษ'
            : verifyFor?.next === 'edit' ? 'แก้ไขความยินยอมรายข้อ'
              : 'เพิกถอนความยินยอม'
        }
        patientName={verifyFor?.record?.name}
        hn={verifyFor?.record?.hn}
      />

      {/* ด.1.1.2 — แก้ไข/เพิกถอนรายข้อ 5.1/5.2 ของแถวที่ลงนามแล้ว */}
      <PersonalDataConsentEditPopup
        open={!!editFor}
        onClose={() => setEditFor(null)}
        onConfirm={() => {
          const rec = editFor;
          setEditFor(null);
          if (rec) pushToast(`บันทึกการแก้ไขความยินยอมรายข้อของ ${rec.name} แล้ว — เก็บ audit trail ครบ`);
        }}
      />

      <PhcisTopToast session={toast} onDismiss={() => setToast(null)} />

      <ExportFormatPopup
        open={!!exportReport}
        report={exportReport}
        onClose={() => setExportReport(null)}
        onExported={() => setExportDone(true)}
      />
      <SuccessToast
        open={exportDone}
        message='นำส่งออกรายงานแล้ว — ระบบบันทึก log การส่งออกข้อมูล'
        onClose={() => setExportDone(false)}
      />
    </>
  );
}
