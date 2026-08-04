import React, { useEffect, useMemo, useState } from 'react';
import QueuePageShell, { QUEUE_STICKY_UNDER_TABS } from '@/templates/QueuePageShell';
import { SummaryCard } from '@/components/layout/SummaryCardsBar';
import PrimarySearch from '@/components/search/PrimarySearch';
import useSearchHistory from '@/components/search/useSearchHistory';
import { FilterDropdown } from '@/components/forms/FilterTag';
import FilterDateTag from '@/components/forms/FilterDateTag';
import Table, { EllipsisText } from '@/components/table/Table';
import Pagination from '@/components/pagination/Pagination';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import BrandButton from '@/components/button/BrandButton';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralButton from '@/components/button/NeutralButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import NeutralSubdueIconButton from '@/components/button/NeutralSubdueIconButton';
import AlertDialog from '@/components/popup/AlertDialog';
import PhcisTopToast from '@/components/alert/PhcisTopToast';
import SuccessToast from '@/components/toast/SuccessToast';
import PersonalDataConsentEditPopup from '@/components/forms/PersonalDataConsentEditPopup';
import ConsentIdentityVerifyPopup from '@/components/popup/ConsentIdentityVerifyPopup';
import { useClinicFilter } from '@/components/layout/HeaderClinicContext';
import { formatServiceCenterChannel } from '@/data/consentChannels';
import {
  CONSENT_TABS, buildConsentSummary,
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
  CONSENT_PATIENT_SEARCH_POOL,
  consentPatientSearchHistorySeed,
  toConsentPatientSearchItem,
} from '@/data/consentPatientSearch';
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
import { matchesDateFilter } from '@/data/financePaymentPrototype';
import ConsentHistoryPopup from '@/pages/consent/ConsentHistoryPopup';

/* PHCIS | Consent — ระบบจัดการความยินยอม (Figma node 1:4).
   Consent registry: summary cards · tabs · search · filters · table with a
   STATUS-DEPENDENT action column (annotation 277:65195 — "แต่ละ Status, CTA
   ใน Column การดำเนินการจะต่างกัน"), the Consent History popup (299:86535),
   and per-action confirm AlertDialogs (277:84661 …).

   All values alias design.md tokens; UI copy is Thai; data is local mock. */

const PAGE_SIZE = 20;
const breadcrumb = ['จัดการความยินยอม'];

/* แท็บที่ tab กรองสถานะอยู่แล้ว — ซ่อน filter chip "สถานะ" */
const STATUS_FILTER_HIDDEN_TABS = new Set(['pending', 'consented', 'rejected', 'expiring', 'expired']);
/* ไม่มีแท็บที่ซ่อน filter ทั้งหมด — คง Set ว่างไว้ให้ onTabChange ใช้ได้ */
const FILTERS_HIDDEN_TABS = new Set();

const TEXT_CELL = {
  color: 'var(--text-content-default)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm)',
  fontWeight: 'var(--type-weight-regular)',
  lineHeight: 1.5,
};
const MUTED_CELL = { ...TEXT_CELL, color: 'var(--text-content-tertiary)' };

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

/** "2 มีนาคม 2569" → sort key (CE ms); invalid → 0 */
const thaiDateSortKey = (raw) => {
  const s = String(raw || '').trim();
  if (!s || s === '-') return 0;
  const monthIdx = THAI_MONTHS.findIndex((m) => s.includes(m));
  const yearMatch = s.match(/(25\d{2}|20\d{2})/);
  const dayMatch = s.match(/^(\d{1,2})\s/);
  if (monthIdx < 0 || !yearMatch || !dayMatch) return 0;
  let year = Number(yearMatch[1]);
  if (year >= 2400) year -= 543;
  return new Date(year, monthIdx, Number(dayMatch[1])).getTime() || 0;
};

const Cell = ({ value }) =>
  value && value !== '-'
    ? <span style={TEXT_CELL}>{value}</span>
    : <span style={MUTED_CELL}>-</span>;

export default function ConsentManagementPage() {
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
  const [activeTab, setActiveTab] = useState('pending');
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterChannel, setFilterChannel] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDate, setFilterDate] = useState({ quick: 'thisyear' });
  const [page, setPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: 'createdDate', direction: 'asc' });
  const [dialog, setDialog] = useState(null);      // { record, confirmKey }
  /* ── Workflow popups (ด.1.1.4 / ด.1.1.7 / ด.1.1.8 / ด.1.1.1 / ด.1.1.2) ── */
  const [createOpen, setCreateOpen] = useState(false);
  const [historyPopup, setHistoryPopup] = useState(null); /* null | { hn?: string } */
  const [reconsentFor, setReconsentFor] = useState(null);        // record
  const [paperFor, setPaperFor] = useState(null);                // record
  const [editFor, setEditFor] = useState(null);                  // signed record → PersonalDataConsentEditPopup
  /* Identity gate — { next: 'revoke'|'paper'|'edit', record } */
  const [verifyFor, setVerifyFor] = useState(null);
  const [verifiedAudit, setVerifiedAudit] = useState(null);
  const [toast, setToast] = useState(null);
  const [exportReport, setExportReport] = useState(null);
  const [exportDone, setExportDone] = useState(false);
  const { history: searchHistory, push: pushHistory, clear: clearHistory } =
    useSearchHistory('mih:primarysearch-history:consent', {
      seedIfEmpty: consentPatientSearchHistorySeed(4),
    });

  const searchSuggestions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    const seen = new Set();
    return rows
      .filter((r) => {
        if (!r?.hn || seen.has(r.hn)) return false;
        const hay = `${r.hn} ${r.name} ${r.formName || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
        seen.add(r.hn);
        return true;
      })
      .slice(0, 8)
      .map((r) => {
        const pool = CONSENT_PATIENT_SEARCH_POOL.find((p) => p.hn === r.hn);
        return pool
          ? toConsentPatientSearchItem(pool)
          : {
            id: r.hn,
            label: r.name,
            value: r.name,
            sublabel: r.formName || undefined,
            badges: [{ label: r.hn, tone: 'indigo' }],
          };
      });
  }, [search, rows]);

  /* ── Tabs with live counts (ทั้งระบบ) · Summary = เดือนนี้เท่านั้น ── */
  const tabs = useMemo(() => CONSENT_TABS.map((t) => ({
    key: t.value,
    label: t.label,
    icon: t.icon,
    count: t.value === 'all'
      ? rows.length
      : rows.filter((r) => (CONSENT_STATUS[r.status] || {}).tab === t.value).length,
  })), [rows]);

  const summaryCards = useMemo(() => buildConsentSummary(rows), [rows]);

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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      const meta = CONSENT_STATUS[r.status] || {};
      return (
        (activeTab === 'all' || meta.tab === activeTab) &&
        (!filterType || r.type === filterType) &&
        (!filterChannel || r.signChannel === filterChannel) &&
        (!filterStatus || r.status === filterStatus) &&
        matchesDateFilter(r.createdDate, filterDate) &&
        (!q || r.name.toLowerCase().includes(q) || r.hn.toLowerCase().includes(q))
      );
    });
  }, [rows, activeTab, search, filterType, filterChannel, filterStatus, filterDate]);

  const handleSort = (key) => setSortConfig((prev) => (
    prev.key === key
      ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
      : { key, direction: 'asc' }
  ));

  const sorted = useMemo(() => {
    const { key, direction } = sortConfig;
    const sign = direction === 'desc' ? -1 : 1;
    const copy = filtered.slice();
    if (!key) {
      return copy.sort((a, b) => thaiDateSortKey(a.createdDate) - thaiDateSortKey(b.createdDate) || a.id - b.id);
    }
    const isDateKey = key === 'createdDate' || key === 'signedDate' || key === 'withdrawnDate';
    const isNumKey = key === 'expiresInDays';
    copy.sort((a, b) => {
      let primary;
      if (isDateKey) {
        const aEmpty = !a[key] || a[key] === '-';
        const bEmpty = !b[key] || b[key] === '-';
        /* วันที่ว่าง (-) อยู่ท้ายเสมอ — ไม่ให้บังแถวที่มีค่าจริง */
        if (aEmpty && bEmpty) primary = 0;
        else if (aEmpty) primary = 1;
        else if (bEmpty) primary = -1;
        else primary = sign * (thaiDateSortKey(a[key]) - thaiDateSortKey(b[key]));
        return primary !== 0 ? primary : a.id - b.id;
      }
      if (isNumKey) {
        primary = Number(a[key] ?? Infinity) - Number(b[key] ?? Infinity);
      } else if (key === 'hn') {
        primary = String(a.hn ?? '').localeCompare(String(b.hn ?? ''), 'th', { numeric: true });
      } else {
        primary = String(a[key] ?? '').localeCompare(String(b[key] ?? ''), 'th');
      }
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
  const hideFilters = FILTERS_HIDDEN_TABS.has(activeTab);

  const handleSubmit = (value, item) => {
    const q = (item?.value || item?.label || value || '').trim();
    if (q) pushHistory(item?.badges ? item : { label: q, value: q });
    setSearch(q); setPage(1);
  };

  /* ── Mock mutations (session-only — ไม่ persist) ────────────────── */
  const patchRow = (id, patch) => patchConsentRecord(id, patch);
  const nextId = () => rows.reduce((m, r) => Math.max(m, r.id), 0) + 1;
  const pushToast = (message, variant = 'success') =>
    setToast({ id: Date.now(), variant, message });

  /* Re-Consent (ด.1.1.7): อัปเดตแถวเดิม → «รอลงนาม» แล้วไปแท็บรอดำเนินการ
     (ชื่อ/HN/แบบฟอร์มคงที่จากแถวตาราง — ไม่สร้างแถวซ้ำ) */
  const runReconsent = (record, { channel, dueDate, latestVersion }) => {
    const prevStatus = record.status === 'หมดอายุ-Reconsent' ? 'หมดอายุ' : record.status;
    const next = getConsentRecords().map((r) => (
      r.id !== record.id
        ? r
        : {
            ...r,
            status: 'รอลงนาม',
            version: latestVersion || r.version,
            signChannel: '-',
            requestChannel: channel,
            requester: STAFF_NAME,
            createdDate: todayThai(),
            signedDate: '-',
            withdrawnDate: '-',
            dueDate,
            pendingReconsent: false,
            history: [
              ...(r.history || []),
              {
                date: todayThai(),
                action: 'สร้างคำขอ',
                fromStatus: prevStatus,
                toStatus: 'รอลงนาม',
                formCode: r.formCode,
                formName: r.formName,
                type: r.type,
                version: latestVersion || r.version,
                channel,
                status: 'รอลงนาม',
              },
            ],
          }
    ));
    setConsentRecords(next);
    setActiveTab('pending');
    setPage(1);
    pushToast(`สร้างคำขอ ReConsent ของ ${record.name} แล้ว`);
  };

  /* ด.1.1.1 — ผ่านการพิสูจน์ตัวตนแล้วค่อยปล่อย action ที่ทำแทนเจ้าของข้อมูล */
  const handleVerified = (audit) => {
    const v = verifyFor;
    setVerifyFor(null);
    setVerifiedAudit(audit);
    if (!v) return;
    if (v.next === 'revoke') setDialog({ record: v.record, confirmKey: 'revoke' });
    else if (v.next === 'paper') setPaperFor(v.record);
    else if (v.next === 'edit') setEditFor(v.record);
  };

  /* ── Status-dependent action column ─────────────────────────────── */
  const renderAction = (row) => {
    const action = (CONSENT_STATUS[row.status] || {}).action;
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
          onClick={() => setHistoryPopup({ hn: row.hn })}
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
          action.kind === 'brand' ? (
            <BrandButton variant='fill' size='sm' onClick={fireAction}>
              {action.label}
            </BrandButton>
          ) : action.kind === 'brandSubdue' ? (
            <BrandSubdueButton variant='outline' size='sm' onClick={fireAction}>
              {action.label}
            </BrandSubdueButton>
          ) : action.kind === 'subdued' ? (
            <NeutralSubdueButton variant='outline' size='sm' onClick={fireAction}>
              {action.label}
            </NeutralSubdueButton>
          ) : (
            <NeutralButton variant='outline' size='sm' onClick={fireAction}>
              {action.label}
            </NeutralButton>
          )
        )}
      </div>
    );
  };

  const columns = useMemo(() => {
    const colCreatedDate = {
      key: 'createdDate',
      header: 'วันที่สร้างคำขอ/Reconsent',
      width: 210,
      sortable: true,
      render: (r) => <Cell value={r.createdDate} />,
    };
    const colSignedDate = {
      key: 'signedDate',
      header: 'วันที่ลงนาม',
      width: 150,
      sortable: true,
      render: (r) => <Cell value={r.signedDate} />,
    };
    const colHn = { key: 'hn', header: 'HN', width: 110, sortable: true, render: (r) => <Cell value={r.hn} /> };
    const colName = {
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
            {r.guardian && (
              <span className='truncate' style={{ ...MUTED_CELL, fontSize: 'var(--type-size-xs)' }}>
                ผู้แทน: {r.guardian}
              </span>
            )}
          </div>
        </div>
      ),
    };
    const mid = [
      {
        key: 'formName', header: 'ชื่อแบบฟอร์ม', flex: true, minWidth: 420, sortable: true,
        render: (r) => (
          <div className='min-w-0 w-full' style={TEXT_CELL}>
            <EllipsisText text={r.formName || '-'} />
          </div>
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
            <ColorfulBadge style={(CONSENT_STATUS[r.status] || {}).tone || 'grey'} size='small' hierarchy='secondary' width='hug'>
              {(CONSENT_STATUS[r.status] || {}).label || r.status}
            </ColorfulBadge>
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
      {
        key: 'signChannel', header: 'ช่องทางที่ลงนาม', width: 320, render: (r) => (
          <span
            className='block whitespace-nowrap'
            style={{
              color: 'var(--text-content-default)',
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-sm)',
              fontWeight: 'var(--type-weight-regular)',
              lineHeight: 1.5,
            }}
          >
            {r.signChannel && r.signChannel !== '-' ? r.signChannel : 'Mobile App'}
          </span>
        ),
      },
      { key: 'requester', header: 'ผู้สร้างคำขอ', width: 140, render: (r) => <Cell value={r.requester} /> },
    ];
    const colWithdrawn = {
      key: 'withdrawnDate',
      header: 'วันที่ถอนความยินยอม',
      width: 180,
      sortable: true,
      render: (r) => <Cell value={r.withdrawnDate} />,
    };
    const colExpiresInDays = {
      key: 'expiresInDays',
      header: 'จำนวนวันที่เหลือ',
      width: 160,
      sortable: true,
      render: (r) => (
        <span
          style={{
            color: 'var(--text-danger-default, #B91C1C)',
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-sm)',
            fontWeight: 'var(--type-weight-medium)',
            lineHeight: 1.5,
          }}
        >
          {r.expiresInDays != null ? `${r.expiresInDays} วัน` : '-'}
        </span>
      ),
    };
    const colAction = { key: 'action', header: 'การดำเนินการ', width: 280, render: renderAction };

    /* ยินยอมแล้ว: วันที่ลงนามขึ้นก่อน · วันที่สร้างอยู่หลังผู้สร้างคำขอ */
    if (activeTab === 'consented') {
      return [colSignedDate, colHn, colName, ...mid, colCreatedDate, colWithdrawn, colAction];
    }
    /* ปฏิเสธ / เพิกถอน: วันที่ถอน + วันที่ลงนามขึ้นก่อน · วันที่สร้างอยู่หลังผู้สร้างคำขอ */
    if (activeTab === 'rejected') {
      return [colWithdrawn, colSignedDate, colHn, colName, ...mid, colCreatedDate, colAction];
    }
    /* ใกล้หมดอายุ: จำนวนวันที่เหลือขึ้นก่อน · วันที่สร้างอยู่หลังผู้สร้างคำขอ */
    if (activeTab === 'expiring') {
      return [colExpiresInDays, colHn, colName, ...mid, colCreatedDate, colSignedDate, colWithdrawn, colAction];
    }
    /* หมดอายุ / ความยินยอมทั้งหมด: วันที่สร้างอยู่หลังผู้สร้างคำขอ */
    if (activeTab === 'expired' || activeTab === 'all') {
      return [colHn, colName, ...mid, colCreatedDate, colSignedDate, colWithdrawn, colAction];
    }
    return [colCreatedDate, colHn, colName, ...mid, colSignedDate, colWithdrawn, colAction];
  }, [activeTab]);

  const confirm = dialog ? CONSENT_CONFIRM[dialog.confirmKey] : null;

  /* ยืนยันแล้ว mutate state จริง (mock) — ครบ "แสดง/บันทึก/ยกเลิก/แก้ไข" */
  const runDialogConfirm = () => {
    if (!dialog?.record) return;
    const auditNote = verifiedAudit
      ? ` (พิสูจน์ตัวตนโดย ${verifiedAudit.method === 'otp' ? 'OTP' : 'เอกสาร'} · ${verifiedAudit.verifiedAt})`
      : '';
    if (dialog.confirmKey === 'cancel') {
      cancelConsentRequest(dialog.record.id);
      pushToast(`ยกเลิกคำขอความยินยอมของ ${dialog.record.name} แล้ว — ประวัติยังอยู่ครบ`);
    } else if (dialog.confirmKey === 'revoke') {
      patchRow(dialog.record.id, { status: 'ถอนความยินยอม', withdrawnDate: todayThai() });
      pushToast(`เพิกถอนความยินยอมของ ${dialog.record.name} แล้ว${auditNote}`);
    }
    setDialog(null);
    setVerifiedAudit(null);
  };

  const handleExport = () => {
    if (!canExportConsent()) return;
    setExportReport(buildWorklistExportReport(filtered));
  };

  return (
    <>
      <QueuePageShell
        activeKey='consent-manage'
        sidebarItems={CONSENT_NAV}
        sidebarFallbackKey='consent-manage'
        brandTitle='ระบบจัดการความยินยอม'
        breadcrumb={breadcrumb}
        title='จัดการความยินยอม'
        actions={(
          <div className='flex items-center' style={{ gap: 'var(--dim-space-200)' }}>
            {canCreateConsentRequest() && (
              <BrandButton variant='fill' size='md' leadingIcon='add' onClick={() => setCreateOpen(true)}>
                สร้างคำขอความยินยอม
              </BrandButton>
            )}
          </div>
        )}
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
          setSortConfig({
            key: key === 'consented'
              ? 'signedDate'
              : key === 'rejected'
                ? 'withdrawnDate'
                : key === 'expiring'
                  ? 'expiresInDays'
                  : key === 'all'
                    ? 'hn'
                    : 'createdDate',
            direction: 'asc',
          });
          if (STATUS_FILTER_HIDDEN_TABS.has(key)) setFilterStatus('');
          if (FILTERS_HIDDEN_TABS.has(key)) {
            setFilterType('');
            setFilterChannel('');
            setFilterDate({ quick: 'thisyear' });
          }
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
                placeholder='ค้นหา HN / เลขบัตร / Passport / ชื่อ-สกุล / โทรศัพท์'
                width={640}
                suggestions={searchSuggestions}
                history={searchHistory}
                onHistoryClear={searchHistory.length > 0 ? clearHistory : undefined}
              />
            </div>

            <div className='w-full flex flex-col' style={{ gap: 'var(--dim-space-300)' }}>
              <div className='flex items-start w-full' style={{ gap: 'var(--dim-space-300)' }}>
                <div className='flex items-center flex-wrap min-w-0' style={{ gap: 'var(--dim-space-200)' }}>
                  {!hideFilters && (
                    <>
                      <FilterDropdown prefix='ประเภท:' options={typeOptions} value={filterType} onChange={(v) => { setFilterType(v); setPage(1); }} />
                      <FilterDropdown prefix='ช่องทาง:' options={channelOptions} value={filterChannel} onChange={(v) => { setFilterChannel(v); setPage(1); }} />
                      {!hideStatusFilter && (
                        <FilterDropdown prefix='สถานะ:' options={statusOptions} value={filterStatus} onChange={(v) => { setFilterStatus(v); setPage(1); }} />
                      )}
                      <FilterDateTag
                        prefix='วันที่:'
                        value={filterDate}
                        onChange={(v) => { setFilterDate(v); setPage(1); }}
                        defaultQuick='thisyear'
                      />
                    </>
                  )}
                </div>
                <div className='flex-1' />
                {canExportConsent() && (
                  <NeutralSubdueButton leadingIcon='ios_share' size='sm' collapseLabelBelow='lg' onClick={handleExport}>
                    นำส่งออกรายงาน
                  </NeutralSubdueButton>
                )}
              </div>

              <Table
                columns={columns}
                rows={pageRows}
                rowKey={(row) => row.id}
                sortConfig={sortConfig}
                onSort={handleSort}
                stickyColCount={
                  activeTab === 'expired' || activeTab === 'all'
                    ? 2
                    : activeTab === 'rejected'
                      ? 4
                      : 3
                }
                /* Page scroll + sticky header ใต้ SubHeader/tabs — เหมือนแบบฟอร์มความยินยอม */
                stickyHeaderTop={QUEUE_STICKY_UNDER_TABS}
                emptyMessage='ไม่พบรายการความยินยอม'
                emptySubtext='ลองปรับตัวกรองหรือคำค้นหา'
              />

              <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-600)', paddingTop: 'var(--dim-space-400)' }}>
                <span style={{ flex: 1, color: 'var(--text-content-secondary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)', lineHeight: 1.5 }}>
                  แสดง {rangeStart}-{rangeEnd} จาก {sorted.length} รายการ
                </span>
                {totalPages > 1 && (
                  <Pagination currentPage={safePage} pageCount={totalPages} onPageChange={setPage} />
                )}
              </div>
            </div>
          </section>
        </div>
      </QueuePageShell>

      <ConsentHistoryPopup
        open={!!historyPopup}
        onClose={() => setHistoryPopup(null)}
        initialHn={historyPopup?.hn || null}
      />

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
