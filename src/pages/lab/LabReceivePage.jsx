import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import Table from '@/components/table/Table';
import Pagination from '@/components/pagination/Pagination';
import PrimarySearch from '@/components/search/PrimarySearch';
import SearchResultCount from '@/components/search/SearchResultCount';
import ClearFiltersTag, { SmoothFilterResults } from '@/components/forms/ClearFiltersTag';
import { FilterDropdown } from '@/components/forms/FilterTag';
import useSmoothClearFilters from '@/hooks/useSmoothClearFilters';
import OverflowFlexRow from '@/components/overflow/OverflowFlexRow';
import Badge from '@/components/badge/Badge';
import Alert from '@/components/alert/Alert';
import AlertDialog from '@/components/popup/AlertDialog';
import Select from '@/components/forms/Select';
import InputField from '@/components/forms/InputField';
import BrandPrimaryButton from '@/components/button/BrandPrimaryButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import DangerSubdueButton from '@/components/button/DangerSubdueButton';
import SuccessToast from '@/components/toast/SuccessToast';
import { Icon } from '@/components/icons/Icon';
import LabSubNav from '@/components/lab/LabSubNav';
import StickyStatusTabBar, { QUEUE_STICKY_UNDER_STATUS_TABS } from '@/components/tab/StickyStatusTabBar';
import LabTubeDot from '@/pages/lab/LabTubeDot';
import LabReceiptFormPopup from '@/components/lab/LabReceiptFormPopup';
import {
  LAB_ORDERS, LAB_URGENCIES, LAB_LOCATIONS, subscribeOrders, withTestLabel,
  LAB_EXCEPTION_BY_KEY,
} from '@/data/labOrders';
import { LAB_GROUPS, LAB_TUBES } from '@/data/labCatalog';
import { useLabPermissions } from '@/data/labPermissions';
import {
  LAB_RECEIVE_STAGES, LAB_RECEIVE_STAGE_BY_KEY,
  LAB_RECEIVE_DISPOSITION_BY_KEY, LAB_RECEIVERS,
  rowsWaitingAt, receiptsFor, getReceipt, summariseSpecimens, receivableRows,
  applyReceipt, amendReceipt, cancelReceipt, subscribeReceipts,
} from '@/data/labReceive';
/* No appendLabAudit import here on purpose: every write on this page goes
   through labReceive.js, which already appends with scope 'receive'. Logging
   again from the page would double every entry in the trail. */

/* สถานีรับสิ่งส่งตรวจ — TOR §1.15.2 / §1.15.4.5, and the whole of chapter 2
   of the legacy manual (~/MIH-Docs-Vault/คู่มือระบบงาน/คู่มือระบบชันสูตรโรค.pdf).

   That chapter is four separate screens — §2.1.2 บันทึกรับคำขอตรวจวิเคราะห์,
   §2.1.4 บันทึกรับสิ่งส่งตรวจเบื้องต้น, §2.1.5 บันทึกรับสิ่งส่งตรวจที่งาน and
   §2.1.6 แบบกลุ่ม — and NONE of it was reachable anywhere in this app. An
   order could be created, worked and reported without any record of the
   specimen having been received, which is the one step a laboratory
   information system exists to document.

   One workstation, three stage tabs, because a receiving clerk stands at one
   counter with a rack of tubes; four screens for one physical journey is a
   vendor artefact. §2.1.6's batch path is "select N rows, apply one
   disposition" — a selection bar, not a fifth screen.

   The stages are LAB_RECEIVE_STAGES (src/data/labReceive.js), deliberately
   NOT new LAB_STATUSES keys: LabQueuePage derives its tab strip, summary
   cards, sort ranking and action gating from LAB_STATUSES, so adding three
   receive stages there would silently put three new tabs on the worklist and
   change what four other screens branch on. A receipt is a RECORD attached
   to an order; the order's pipeline status is orthogonal. */

const breadcrumb = ['งานชันสูตรโรค (Lab)', 'สถานีรับสิ่งส่งตรวจ'];
const PAGE_SIZE = 20;

/* Monospace for accession numbers — a rendering requirement for aligned
   identifiers, not a design-system value. tokens.css defines no
   --type-family-mono, so that var() only ever resolved to its own fallback;
   a plain stack states that honestly instead of naming a token that would
   silently change meaning the day a theme defines one. */
const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';


const ALL = '__all__';
const URGENCY_OPTIONS = [{ value: ALL, label: 'ทั้งหมด' }, ...LAB_URGENCIES.map((u) => ({ value: u.key, label: u.label }))];
const GROUP_OPTIONS = [{ value: ALL, label: 'ทั้งหมด' }, ...LAB_GROUPS.map((g) => ({ value: g.key, label: g.thai }))];
const LOCATION_OPTIONS = [{ value: ALL, label: 'ทั้งหมด' }, ...LAB_LOCATIONS.map((l) => ({ value: l, label: l }))];
const TUBE_OPTIONS = [{ value: ALL, label: 'ทั้งหมด' }, ...Object.values(LAB_TUBES).map((t) => ({ value: t.key, label: t.thai ?? t.label }))];

/* Read-only receipt stamp — แสดง, the first of the four verbs §1.15 asks of
   every recording leaf. A receipt that has been applied is not re-editable
   in place: it shows what was recorded, by whom and when, with แก้ไข and
   ยกเลิกการรับ beside it. */
const ReceiptStamp = ({ receipt }) => {
  if (!receipt) return null;
  const d = LAB_RECEIVE_DISPOSITION_BY_KEY[receipt.disposition];
  const tone = receipt.cancelled
    ? { badge: 'neutral', label: 'ยกเลิกการรับแล้ว' }
    : { badge: d?.color === 'success' ? 'success' : d?.color === 'error' ? 'error' : d?.color === 'warning' ? 'warning' : 'info', label: d?.label ?? receipt.disposition };
  return (
    <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-050, 2px)' }}>
      <span className='inline-flex items-center' style={{ gap: 'var(--dim-space-150)' }}>
        <Badge style={tone.badge} size='small' icon={receipt.cancelled ? 'undo' : d?.icon}>{tone.label}</Badge>
        {receipt.quantity > 0 && !receipt.cancelled && (
          <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-secondary)' }}>
            {receipt.quantity} {receipt.unit}
          </span>
        )}
      </span>
      <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
        {receipt.receivedBy} · {receipt.receivedAt}
      </span>
      {receipt.qualityNote && (
        <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-statusbadge-warning)' }}>
          {receipt.qualityNote}
        </span>
      )}
      {receipt.cancelled && receipt.cancelReason && (
        <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
          เหตุผลที่ยกเลิก: {receipt.cancelReason}
        </span>
      )}
    </div>
  );
};

const LabReceivePage = () => {
  const history = useHistory();

  /* Mock permission, resolved once. Open /lab/receive?role=viewer to see the
     read-only state — the state playbook §5 requires and that no lab screen
     could reach while the flag was a hardcoded `true`. */
  const { canEdit, denyReason, roleLabel, readOnly } = useLabPermissions();

  const [version, setVersion] = useState(0);
  useEffect(() => subscribeOrders(() => setVersion((v) => v + 1)), []);
  useEffect(() => subscribeReceipts(() => setVersion((v) => v + 1)), []);

  const liveRows = useMemo(
    () => LAB_ORDERS.map(withTestLabel),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version],
  );

  const [stage, setStage] = useState(LAB_RECEIVE_STAGES[0].key);
  const [query, setQuery] = useState('');
  const [urgency, setUrgency] = useState(ALL);
  const [group, setGroup] = useState(ALL);
  const [location, setLocation] = useState(ALL);
  const [tube, setTube] = useState(ALL);
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState([]);
  const [receiverKey, setReceiverKey] = useState(LAB_RECEIVERS[0].key);
  const [toast, setToast] = useState('');
  const [scanHint, setScanHint] = useState(null);
  const [formState, setFormState] = useState(null);   /* { rows, mode, existing } */
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  /* AlertDialog has no confirmDisabled and does not close itself, so
     confirming with an empty required reason used to be a DEAD CLICK:
     handleCancelReceipt returned early and the dialog sat there in silence.
     The static grey hint under the field is guidance, not an error state —
     playbook §5 asks for one on every destructive action. */
  const [cancelAttempted, setCancelAttempted] = useState(false);
  const searchWrapRef = useRef(null);

  const receiver = LAB_RECEIVERS.find((r) => r.key === receiverKey) ?? LAB_RECEIVERS[0];
  const stageDef = LAB_RECEIVE_STAGE_BY_KEY[stage];

  useEffect(() => { setPage(1); setSelectedIds([]); setScanHint(null); }, [stage, query, urgency, group, location, tube]);

  /* Rows waiting at THIS stage. rowsWaitingAt already drops rows that have a
     live receipt at the stage, so the counter genuinely empties as work is
     done — a list that never shrinks tells nobody what is left. */
  const stageRows = useMemo(
    () => rowsWaitingAt(liveRows, stage),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [liveRows, stage, version],
  );

  /* Rows already receipted at this stage, kept visible below the worklist so
     แสดง / แก้ไข / ยกเลิก exist for a receipt that has been applied. */
  const receiptedRows = useMemo(
    () => liveRows
      .filter((r) => {
        const rc = getReceipt(r.id, stage);
        return rc && (rc.cancelled || rc.disposition !== 'hold');
      })
      .map((r) => ({ ...r, receipt: getReceipt(r.id, stage) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [liveRows, stage, version],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return stageRows.filter((r) => {
      if (urgency !== ALL && r.urgency !== urgency) return false;
      if (group !== ALL && r.group !== group) return false;
      if (location !== ALL && r.location !== location) return false;
      if (tube !== ALL && r.tube?.key !== tube) return false;
      if (!q) return true;
      /* Confidential rows are excluded from free-text search exactly as
         LabQueuePage does — leaving them searchable by name defeats the
         masking that §1.15.6.4 asks for. Their accession still matches,
         because that is how the bench finds a tube it is holding. */
      const haystack = r.confidential
        ? `${r.accessionNo}`.toLowerCase()
        : `${r.accessionNo} ${r.patient.hn} ${r.patient.shortName} ${r.patient.fullName ?? ''} ${r.testLabel}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [stageRows, query, urgency, group, location, tube]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const rangeStart = filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, filtered.length);

  const filtersActive = query.trim() !== '' || urgency !== ALL || group !== ALL || location !== ALL || tube !== ALL;
  const { showClearChip, resultsOpaque, clearFilters } = useSmoothClearFilters(
    filtersActive,
    () => {
      setQuery('');
      setUrgency(ALL);
      setGroup(ALL);
      setLocation(ALL);
      setTube(ALL);
    },
  );

  const summary = useMemo(() => summariseSpecimens(receivableRows(liveRows)), [liveRows]);

  const summaryCards = useMemo(() => {
    const held = liveRows.filter((r) => r.exception === 'hold').length;
    const rejected = liveRows.filter((r) => r.exception === 'rejected' || r.exception === 'redraw').length;
    return [
      { key: 'waiting', label: 'รอรับที่ขั้นตอนนี้', value: stageRows.length, indicator: stageDef?.label, color: 'info', icon: stageDef?.icon ?? 'inventory_2' },
      { key: 'specimens', label: 'สิ่งส่งตรวจทั้งหมด', value: summary.totalSpecimens, indicator: `${summary.totalTests} รายการตรวจ`, color: 'brand', icon: 'science' },
      { key: 'hold', label: 'ค้างที่จุดรับ (รอ)', value: held, indicator: 'ต้องติดตามกับหน่วยงานที่ส่ง', color: 'inprogress', icon: 'pause_circle' },
      { key: 'rejected', label: 'ปฏิเสธ / เจาะซ้ำ', value: rejected, indicator: 'ต้องเก็บตัวอย่างใหม่', color: 'destructive', icon: 'block' },
    ];
  }, [liveRows, stageRows.length, stageDef, summary]);

  const tabs = useMemo(
    () => LAB_RECEIVE_STAGES.map((s) => ({
      key: s.key,
      label: `${s.short} ${s.manual}`,
      icon: s.icon,
      count: rowsWaitingAt(liveRows, s.key).length,
    })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [liveRows, version],
  );

  /* Barcode / accession scan. A code that matches nothing at THIS stage but
     does match a row at another one must say so — "ไม่พบ" would send a clerk
     hunting for a tube that is sitting one tab away. */
  const handleScan = (raw) => {
    const code = String(raw ?? '').trim().toUpperCase();
    if (!code) { setScanHint(null); return; }
    const here = stageRows.find((r) => r.accessionNo.toUpperCase() === code);
    if (here) {
      setSelectedIds([here.id]);
      setScanHint({ type: 'success', text: `พบ ${here.accessionNo} · ${here.testLabel} — เลือกไว้แล้ว กด "บันทึกรับ" เพื่อดำเนินการ` });
      return;
    }
    const done = liveRows.find((r) => r.accessionNo.toUpperCase() === code && getReceipt(r.id, stage) && !getReceipt(r.id, stage).cancelled);
    if (done) {
      const rc = getReceipt(done.id, stage);
      setScanHint({
        type: 'warning',
        text: `${done.accessionNo} ถูกบันทึกรับที่ขั้นตอนนี้แล้วเมื่อ ${rc.receivedAt} โดย ${rc.receivedBy} — ดูรายการที่รับแล้วด้านล่าง หรือกดแก้ไขหากบันทึกผิด`,
      });
      return;
    }
    const elsewhere = LAB_RECEIVE_STAGES
      .filter((s) => s.key !== stage)
      .map((s) => ({ stageDef: s, row: rowsWaitingAt(liveRows, s.key).find((r) => r.accessionNo.toUpperCase() === code) }))
      .find((x) => x.row);
    if (elsewhere) {
      setScanHint({
        type: 'info',
        text: `ตัวอย่างนี้อยู่ที่ขั้นตอน "${elsewhere.stageDef.label}" — สลับแท็บหรือไม่?`,
        goStage: elsewhere.stageDef.key,
      });
      return;
    }
    setScanHint({ type: 'error', text: `ไม่พบสิ่งส่งตรวจที่ตรงกับ "${code}" ในรายการขอตรวจของวันนี้` });
  };

  const openForm = (rows, mode = 'create', existing = null) => {
    if (!rows.length) return;
    setFormState({ rows, mode, existing });
  };

  const handleSubmitReceipt = (draft) => {
    if (!formState) return;
    const { rows, mode } = formState;
    const fn = mode === 'amend' ? amendReceipt : applyReceipt;
    let failed = 0;
    rows.forEach((row) => {
      const result = fn(row, { ...draft, stage }, { actor: receiver.name });
      if (!result.ok) failed += 1;
    });
    setFormState(null);
    setSelectedIds([]);
    setScanHint(null);
    setToast(failed > 0
      ? `บันทึกไม่สำเร็จ ${failed} รายการ — ตรวจสอบข้อมูลอีกครั้ง`
      : `${mode === 'amend' ? 'แก้ไข' : 'บันทึก'}การรับสิ่งส่งตรวจ ${rows.length} รายการแล้ว`);
  };

  const handleCancelReceipt = () => {
    setCancelAttempted(true);
    if (!cancelTarget || !cancelReason.trim()) return;
    cancelReceipt(cancelTarget, stage, { actor: receiver.name, reason: cancelReason.trim() });
    setCancelTarget(null);
    setCancelReason('');
    setCancelAttempted(false);
    setToast('ยกเลิกการรับสิ่งส่งตรวจแล้ว — รายการกลับไปรออยู่ที่ขั้นตอนนี้');
  };

  const selectedRows = useMemo(
    () => filtered.filter((r) => selectedIds.includes(r.id)),
    [filtered, selectedIds],
  );
  const allOnPageSelected = pageRows.length > 0 && pageRows.every((r) => selectedIds.includes(r.id));

  const columns = [
    {
      key: 'select',
      label: '',
      render: (row) => {
        const on = selectedIds.includes(row.id);
        return (
          <button
            type='button'
            aria-label={on ? `ยกเลิกเลือก ${row.accessionNo}` : `เลือก ${row.accessionNo}`}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedIds((prev) => (on ? prev.filter((id) => id !== row.id) : [...prev, row.id]));
            }}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 'var(--dim-space-0)', lineHeight: 0 }}
          >
            <Icon
              name={on ? 'check_box' : 'check_box_outline_blank'}
              size={20}
              style={{ color: on ? 'var(--text-brandPrimary-default)' : 'var(--text-content-quaternary)' }}
            />
          </button>
        );
      },
    },
    {
      key: 'accessionNo',
      label: 'Accession / สิ่งส่งตรวจ',
      render: (row) => (
        <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-050, 2px)' }}>
          <span className='inline-flex items-center' style={{ gap: 'var(--dim-space-150)', fontFamily: MONO, fontSize: 'var(--type-size-sm)', color: 'var(--text-content-default)' }}>
            <Icon name='barcode' size={14} />
            {row.accessionNo}
          </span>
          <span className='inline-flex items-center' style={{ gap: 'var(--dim-space-150)' }}>
            {row.tube && <LabTubeDot tube={row.tube} count={row.tubeCount} size={8} />}
            <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
              {row.tubeLabel} · {row.volumeMl} mL
            </span>
          </span>
        </div>
      ),
    },
    {
      key: 'patient',
      label: 'ผู้ป่วย',
      render: (row) => (
        <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-050, 2px)' }}>
          <span className='inline-flex items-center' style={{ gap: 'var(--dim-space-100)', fontFamily: 'var(--type-family-body)', fontWeight: 'var(--type-weight-medium)', fontSize: 'var(--type-size-sm)', color: 'var(--text-content-default)' }}>
            {row.confidential && <Icon name='lock' size={12} style={{ color: 'var(--text-content-quaternary)' }} />}
            {row.confidential ? 'ผู้ป่วยปกปิด (VCT)' : row.patient.shortName}
          </span>
          <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
            HN {row.confidential ? '•••••' : row.patient.hn} · {row.location}
          </span>
        </div>
      ),
    },
    {
      key: 'testLabel',
      label: 'รายการตรวจ',
      render: (row) => (
        <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-050, 2px)' }}>
          <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)', color: 'var(--text-content-default)' }}>
            {row.testLabel}
          </span>
          <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
            {row.groupLabel} · สั่ง {row.orderedAt}
          </span>
        </div>
      ),
    },
    {
      key: 'urgency',
      label: 'ความเร่งด่วน',
      render: (row) => (
        <Badge style={row.urgency === 'stat' ? 'error' : row.urgency === 'urgent' ? 'warning' : 'neutral'} size='small'>
          {row.urgencyLabel}
        </Badge>
      ),
    },
    {
      key: 'stageState',
      label: 'สถานะการรับก่อนหน้า',
      render: (row) => {
        const done = receiptsFor(row.id).filter((r) => !r.receipt.cancelled);
        const exception = row.exception ? LAB_EXCEPTION_BY_KEY[row.exception] : null;
        if (!done.length && !exception) {
          return (
            <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
              ยังไม่มีการรับ
            </span>
          );
        }
        return (
          <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-100)' }}>
            {exception && (
              <Badge style={exception.color === 'error' ? 'error' : exception.color === 'info' ? 'info' : 'warning'} size='small' icon={exception.icon}>
                {exception.label}
              </Badge>
            )}
            {done.map((d) => (
              <span key={d.stage} style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
                {LAB_RECEIVE_STAGE_BY_KEY[d.stage]?.short}: {LAB_RECEIVE_DISPOSITION_BY_KEY[d.receipt.disposition]?.label} · {d.receipt.receivedAt}
              </span>
            ))}
          </div>
        );
      },
    },
    {
      key: 'actions',
      label: '',
      render: (row) => (
        <BrandPrimaryButton
          size='sm'
          leadingIcon='inventory'
          disabled={!canEdit}
          title={canEdit ? undefined : denyReason}
          onClick={() => openForm([row], 'create')}
        >
          บันทึกรับ
        </BrandPrimaryButton>
      ),
    },
  ];

  const receiptedColumns = [
    {
      key: 'accessionNo',
      label: 'Accession',
      render: (row) => (
        <span style={{ fontFamily: MONO, fontSize: 'var(--type-size-sm)', color: 'var(--text-content-default)' }}>
          {row.accessionNo}
        </span>
      ),
    },
    {
      key: 'testLabel',
      label: 'รายการตรวจ / ผู้ป่วย',
      render: (row) => (
        <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-050, 2px)' }}>
          <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)', color: 'var(--text-content-default)' }}>
            {row.testLabel}
          </span>
          <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
            {row.confidential ? 'ผู้ป่วยปกปิด (VCT)' : `${row.patient.shortName} · HN ${row.patient.hn}`}
          </span>
        </div>
      ),
    },
    { key: 'receipt', label: 'ผลการรับ', render: (row) => <ReceiptStamp receipt={row.receipt} /> },
    {
      key: 'actions',
      label: '',
      render: (row) => (
        <div className='flex flex-wrap items-center' style={{ gap: 'var(--dim-space-150)' }}>
          <NeutralSubdueButton
            variant='outline'
            size='sm'
            leadingIcon='edit'
            disabled={!canEdit || row.receipt?.cancelled}
            title={canEdit ? undefined : denyReason}
            onClick={() => openForm([row], 'amend', row.receipt)}
          >
            แก้ไข
          </NeutralSubdueButton>
          <DangerSubdueButton
            variant='outline'
            size='sm'
            leadingIcon='undo'
            disabled={!canEdit || row.receipt?.cancelled}
            title={canEdit ? undefined : denyReason}
            onClick={() => { setCancelTarget(row); setCancelReason(''); setCancelAttempted(false); }}
          >
            ยกเลิกการรับ
          </DangerSubdueButton>
        </div>
      ),
    },
  ];

  return (
    <>
      <SuccessToast open={!!toast} message={toast} onClose={() => setToast('')} topOffset='var(--dim-space-800, 32px)' />

      <LabReceiptFormPopup
        open={!!formState}
        rows={formState?.rows ?? []}
        stage={stage}
        receiver={receiver}
        existing={formState?.existing ?? null}
        mode={formState?.mode ?? 'create'}
        onClose={() => setFormState(null)}
        onSubmit={handleSubmitReceipt}
      />

      <AlertDialog
        open={!!cancelTarget}
        type='warning'
        title='ยกเลิกการรับสิ่งส่งตรวจนี้?'
        description={cancelTarget
          ? `${cancelTarget.testLabel} (${cancelTarget.accessionNo}) จะกลับไปอยู่ในรายการรอรับที่ขั้นตอน ${stageDef?.label} — บันทึกการรับเดิมจะยังคงอยู่ในประวัติและไม่ถูกลบ`
          : ''}
        cancelLabel='ไม่ยกเลิก'
        confirmLabel='ยืนยันยกเลิกการรับ'
        onCancel={() => { setCancelTarget(null); setCancelReason(''); setCancelAttempted(false); }}
        onClose={() => { setCancelTarget(null); setCancelReason(''); setCancelAttempted(false); }}
        onConfirm={handleCancelReceipt}
      >
        <div className='w-full flex flex-col' style={{ gap: 'var(--dim-space-200)' }}>
          <InputField
            label='เหตุผลที่ยกเลิกการรับ'
            required
            showLeadingIcon={false}
            size='md'
            placeholder='เช่น บันทึกผิดหลอด · หน่วยงานขอถอนคำขอ'
            value={cancelReason}
            error={cancelAttempted && !cancelReason.trim() ? 'ต้องระบุเหตุผลก่อนจึงจะยืนยันได้' : undefined}
            onChange={(v) => setCancelReason(typeof v === 'string' ? v : v?.target?.value ?? '')}
          />
          {!cancelAttempted && !cancelReason.trim() && (
            <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
              ต้องระบุเหตุผลก่อนจึงจะยืนยันได้
            </span>
          )}
        </div>
      </AlertDialog>

      <QueuePageShell
        activeKey='lab'
        breadcrumb={breadcrumb}
        title='สถานีรับสิ่งส่งตรวจ'
        summaryCards={summaryCards}
        summaryFlushUnderSubHeader={false}
        belowSummary={<LabSubNav />}
      >
        <div
          className='flex flex-col flex-1 min-w-0'
          style={{
            paddingTop: 'var(--dim-space-600)',
            paddingLeft: 'var(--dim-space-600)',
            paddingRight: 'var(--dim-space-600)',
            paddingBottom: 'var(--dim-space-1200)',
            gap: 'var(--dim-space-600)',
          }}
        >
          {readOnly && (
            <Alert
              type='warning'
              iconName='lock'
              iconFill={1}
              title={`${roleLabel} — ดูข้อมูลได้อย่างเดียว`}
              subtext={denyReason}
              showBadge={false}
              showIndicator={false}
              showDetail={false}
            />
          )}

          <div
            className='flex flex-col w-full'
            style={{
              background: 'var(--surface-card-100)',
              borderRadius: 'var(--dim-radius-500)',
              boxShadow: 'var(--shadow-card)',
              paddingTop: 'var(--dim-space-600)',
              paddingRight: 'var(--dim-space-600)',
              paddingBottom: 'var(--dim-space-600)',
              paddingLeft: 'var(--dim-space-600)',
              gap: 'var(--dim-space-600)',
            }}
          >
            <StickyStatusTabBar
              tabs={tabs}
              value={stage}
              onChange={setStage}
              aria-label='ขั้นตอนรับสิ่งส่งตรวจ'
            />

            {/* Stage explainer + ผู้รับ. ผู้รับ must be chosen before any
                disposition can be applied — validateReceiptDraft rejects an
                empty receivedBy, so it is picked once at the counter rather
                than typed on every row. */}
            <div className='flex flex-wrap items-end w-full' style={{ gap: 'var(--dim-space-400)' }}>
              <div className='flex flex-col min-w-0' style={{ flex: '1 1 320px', gap: 'var(--dim-space-100)' }}>
                <span className='inline-flex items-center' style={{ gap: 'var(--dim-space-200)', fontFamily: 'var(--type-family-heading-content)', fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))', fontSize: 'var(--type-size-base)', color: 'var(--text-content-default)' }}>
                  <Icon name={stageDef?.icon ?? 'inventory_2'} size={20} style={{ color: 'var(--text-brandPrimary-default)' }} />
                  {stageDef?.label}
                  <Badge style='neutral' size='small'>{stageDef?.manual}</Badge>
                </span>
                <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)', color: 'var(--text-content-tertiary)' }}>
                  {stageDef?.hint}
                </span>
              </div>
              <div style={{ width: 320 }}>
                <Select
                  label='ผู้รับสิ่งส่งตรวจ'
                  required
                  value={receiverKey}
                  options={LAB_RECEIVERS.map((r) => ({ value: r.key, label: r.name, subtext: r.position }))}
                  onChange={setReceiverKey}
                  size='md'
                  searchable={false}
                />
              </div>
            </div>

            {/* Scan + search. The counter works barcode-first, same as the
                worklist. */}
            <div className='w-full flex flex-wrap items-start' style={{ gap: 'var(--dim-space-300)' }} ref={searchWrapRef}>
              <PrimarySearch
                value={query}
                onChange={(v) => { setQuery(v); if (!v) setScanHint(null); }}
                onSubmit={(v) => handleScan(v)}
                placeholder='สแกนบาร์โค้ดหลอด หรือค้นหา Accession / HN / ชื่อ'
                width={520}
              />
              <BrandPrimaryButton
                size='md'
                leadingIcon='barcode_scanner'
                onClick={() => {
                  const input = searchWrapRef.current?.querySelector('input');
                  if (input) input.focus();
                }}
              >
                สแกนบาร์โค้ด
              </BrandPrimaryButton>
              <NeutralSubdueButton variant='outline' size='md' leadingIcon='send' onClick={() => history.push('/lab/send-out')}>
                ส่งตรวจภายนอก
              </NeutralSubdueButton>
            </div>

            {scanHint && (
              <Alert
                type={scanHint.type === 'error' ? 'destructive' : scanHint.type === 'success' ? 'success' : scanHint.type}
                iconName={scanHint.type === 'error' ? 'search_off' : scanHint.type === 'success' ? 'check_circle' : 'info'}
                iconFill={1}
                title={scanHint.text}
                showSubtext={false}
                showBadge={false}
                showIndicator={false}
                showDetail={false}
                onClose={() => setScanHint(null)}
              />
            )}
            {scanHint?.goStage && (
              <div>
                <NeutralSubdueButton
                  variant='outline'
                  size='sm'
                  leadingIcon='swap_horiz'
                  onClick={() => { setStage(scanHint.goStage); setScanHint(null); }}
                >
                  สลับไปยังขั้นตอน {LAB_RECEIVE_STAGE_BY_KEY[scanHint.goStage]?.label}
                </NeutralSubdueButton>
              </div>
            )}

            <OverflowFlexRow itemGap='var(--dim-space-200)' moreAriaLabel='แสดงตัวกรองที่ซ่อน'>
              <NeutralSubdueButton
                variant='outline'
                size='sm'
                leadingIcon={allOnPageSelected ? 'check_box' : 'check_box_outline_blank'}
                disabled={pageRows.length === 0}
                onClick={() => setSelectedIds((prev) => {
                  const ids = pageRows.map((r) => r.id);
                  return allOnPageSelected ? prev.filter((id) => !ids.includes(id)) : [...new Set([...prev, ...ids])];
                })}
              >
                {allOnPageSelected ? 'ยกเลิกเลือกทั้งหน้า' : 'เลือกทั้งหน้า'}
              </NeutralSubdueButton>
              <FilterDropdown prefix='ความเร่งด่วน:' options={URGENCY_OPTIONS} value={urgency} onChange={setUrgency} />
              <FilterDropdown prefix='กลุ่มตรวจ:' options={GROUP_OPTIONS} value={group} onChange={setGroup} />
              <FilterDropdown prefix='จุดสั่ง:' options={LOCATION_OPTIONS} value={location} onChange={setLocation} />
              <FilterDropdown prefix='ชนิดหลอด:' options={TUBE_OPTIONS} value={tube} onChange={setTube} />
              <ClearFiltersTag active={showClearChip} onClear={clearFilters} />
            </OverflowFlexRow>

            <SmoothFilterResults opaque={resultsOpaque}>
            <SearchResultCount found={filtered.length} total={stageRows.length} />

            {/* §2.1.6 แบบกลุ่ม — one disposition applied to N selected rows. */}
            {selectedRows.length > 0 && (
              <div
                className='flex flex-wrap items-center w-full'
                style={{
                  gap: 'var(--dim-space-300)',
                  background: 'var(--surface-brandPrimary-quaternary)',
                  border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-default)',
                  borderRadius: 'var(--dim-radius-300)',
                  paddingTop: 'var(--dim-space-300)',
                  paddingRight: 'var(--dim-space-400)',
                  paddingBottom: 'var(--dim-space-300)',
                  paddingLeft: 'var(--dim-space-400)',
                }}
              >
                <span style={{ fontFamily: 'var(--type-family-body)', fontWeight: 'var(--type-weight-medium)', fontSize: 'var(--type-size-sm)', color: 'var(--text-brandPrimary-default)' }}>
                  เลือกไว้ {selectedRows.length} รายการ — บันทึกรับแบบกลุ่ม (§2.1.6)
                </span>
                <BrandPrimaryButton
                  size='sm'
                  leadingIcon='inventory'
                  disabled={!canEdit}
                  title={canEdit ? undefined : denyReason}
                  onClick={() => openForm(selectedRows, 'create')}
                >
                  บันทึกรับ {selectedRows.length} รายการ
                </BrandPrimaryButton>
                <div className='flex-1' />
                <NeutralSubdueButton variant='outline' size='sm' onClick={() => setSelectedIds([])}>
                  ล้างการเลือก
                </NeutralSubdueButton>
              </div>
            )}

            {filtered.length === 0 ? (
              /* Two DIFFERENT empty states. An idle receiving counter is a
                 legitimate, good state and must not read as an error; a
                 search that matched nothing is a dead end that needs a way
                 out. */
              <div
                className='w-full flex flex-col items-center justify-center'
                style={{
                  gap: 'var(--dim-space-300)',
                  minHeight: 260,
                  background: 'var(--surface-card-200)',
                  border: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary)',
                  borderRadius: 'var(--dim-radius-500)',
                }}
              >
                <Icon
                  name={filtersActive ? 'search_off' : 'inventory_2'}
                  size={32}
                  style={{ color: 'var(--text-content-quaternary)' }}
                />
                <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)', color: 'var(--text-content-tertiary)', textAlign: 'center' }}>
                  {filtersActive
                    ? `ไม่พบรายการที่ตรงกับ "${query.trim() || 'ตัวกรองที่เลือก'}"`
                    : 'ไม่มีสิ่งส่งตรวจรอรับที่ขั้นตอนนี้'}
                </span>
                {filtersActive ? (
                  <NeutralSubdueButton variant='outline' size='sm' leadingIcon='filter_alt_off' onClick={clearFilters}>
                    ล้างตัวกรอง
                  </NeutralSubdueButton>
                ) : (
                  <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-quaternary)' }}>
                    รายการจะปรากฏที่นี่เมื่อหน่วยงานส่งคำขอหรือสิ่งส่งตรวจมาถึงจุดรับ
                  </span>
                )}
              </div>
            ) : (
              <>
                <Table
                  columns={columns}
                  rows={pageRows}
                  rowKey={(row) => row.id}
                  stickyColCount={2}
                  stickyHeaderTop={QUEUE_STICKY_UNDER_STATUS_TABS}
                  emptyMessage='ไม่มีสิ่งส่งตรวจรอรับที่ขั้นตอนนี้'
                />
                <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-200)', paddingTop: 'var(--dim-space-200)', borderTop: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)' }}>
                  <span style={{ color: 'var(--text-content-secondary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)' }}>
                    แสดง {rangeStart}–{rangeEnd} จาก {filtered.length} รายการ
                  </span>
                  <div className='flex-1' />
                  <Pagination currentPage={page} pageCount={totalPages} onPageChange={setPage} />
                </div>
              </>
            )}
            </SmoothFilterResults>

            {/* รวมจำนวนสิ่งส่งตรวจ — counted per SPECIMEN (tube), never per
                test row: two tests drawn into one EDTA tube are one specimen,
                and reporting two would overstate the day's workload. */}
            <div
              className='flex flex-wrap items-center w-full'
              style={{
                gap: 'var(--dim-space-400)',
                paddingTop: 'var(--dim-space-300)',
                borderTop: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
              }}
            >
              <span style={{ fontFamily: 'var(--type-family-body)', fontWeight: 'var(--type-weight-medium)', fontSize: 'var(--type-size-sm)', color: 'var(--text-content-default)' }}>
                รวมจำนวนสิ่งส่งตรวจ {summary.totalSpecimens} ตัวอย่าง · {summary.totalTests} รายการตรวจ
              </span>
              {summary.groups.map((g) => (
                <span key={g.tubeLabel} className='inline-flex items-center' style={{ gap: 'var(--dim-space-150)' }}>
                  {g.tube && <LabTubeDot tube={g.tube} size={8} />}
                  <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
                    {g.tubeLabel} {g.specimens} ตัวอย่าง
                  </span>
                </span>
              ))}
            </div>
          </div>

          {/* รายการที่รับแล้วที่ขั้นตอนนี้ — แสดง / แก้ไข / ยกเลิก. */}
          <div
            className='flex flex-col w-full'
            style={{
              background: 'var(--surface-card-100)',
              borderRadius: 'var(--dim-radius-500)',
              boxShadow: 'var(--shadow-card)',
              paddingTop: 'var(--dim-space-600)',
              paddingRight: 'var(--dim-space-600)',
              paddingBottom: 'var(--dim-space-600)',
              paddingLeft: 'var(--dim-space-600)',
              gap: 'var(--dim-space-400)',
            }}
          >
            <span className='inline-flex items-center' style={{ gap: 'var(--dim-space-200)', fontFamily: 'var(--type-family-heading-content)', fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))', fontSize: 'var(--type-size-base)', color: 'var(--text-content-default)' }}>
              <Icon name='fact_check' size={20} style={{ color: 'var(--text-brandPrimary-default)' }} />
              รายการที่บันทึกรับแล้วที่ขั้นตอนนี้ ({receiptedRows.length})
            </span>
            {receiptedRows.length === 0 ? (
              <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)', color: 'var(--text-content-tertiary)' }}>
                ยังไม่มีการบันทึกรับที่ขั้นตอนนี้ในวันนี้
              </span>
            ) : (
              <Table
                columns={receiptedColumns}
                rows={receiptedRows}
                rowKey={(row) => row.id}
                emptyMessage='ยังไม่มีการบันทึกรับที่ขั้นตอนนี้'
              />
            )}
          </div>
        </div>
      </QueuePageShell>
    </>
  );
};

export default LabReceivePage;
