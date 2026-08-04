import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useHistory } from 'react-router-dom';
import QueuePageShell, { QUEUE_STICKY_UNDER_TABS } from '@/templates/QueuePageShell';
import Table from '@/components/table/Table';
import Pagination from '@/components/pagination/Pagination';
import PrimarySearch from '@/components/search/PrimarySearch';
import { FilterDropdown } from '@/components/forms/FilterTag';
import OverflowFlexRow from '@/components/overflow/OverflowFlexRow';
import Badge from '@/components/badge/Badge';
import Alert from '@/components/alert/Alert';
import AlertDialog from '@/components/popup/AlertDialog';
import InputField from '@/components/forms/InputField';
import BrandPrimaryButton from '@/components/button/BrandPrimaryButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import DangerSubdueButton from '@/components/button/DangerSubdueButton';
import SuccessToast from '@/components/toast/SuccessToast';
import { Icon } from '@/components/icons/Icon';
import LabTubeDot from '@/pages/lab/LabTubeDot';
import LabSendOutFormPopup from '@/components/lab/LabSendOutFormPopup';
import LabSendOutManifest from '@/components/lab/LabSendOutManifest';
import {
  LAB_ORDERS, LAB_URGENCIES, LAB_LOCATIONS, subscribeOrders, withTestLabel,
} from '@/data/labOrders';
import { LAB_GROUPS } from '@/data/labCatalog';
import {
  LAB_EXTERNAL_LABS, LAB_EXTERNAL_LAB_BY_KEY, LAB_SENDOUT_REASON_BY_KEY,
  sendableRows, sentRows, getSendOut, confirmSendOut, cancelSendOut, markReturned,
  outstandingDays, isOverdueReturn, subscribeSendOuts,
} from '@/data/labSendOuts';
import { printLab } from '@/data/labPrintSettings';
import { useLabPermissions } from '@/data/labPermissions';

/* ส่งตรวจภายนอก (lab-out) — TOR §1.15.6.2.

   The clause reads as one requirement but is two halves, and only the second
   one existed. LabResultEntryPage can already record an outside lab's
   reference number for an order in status 'external' (L447), but NOTHING in
   the app could put an order INTO that status — `externalLab` and `sentOutAt`
   were seed-only fields on the mock rows. So a result could be captured from
   a send-out that the system had no record of ever sending.

   This is the missing half, and it is the legacy manual's §2.1.3 "บันทึกส่ง
   คำขอไปหน่วยงานที่ตรวจ": pick the requests this lab cannot run, name the
   receiving หน่วยงาน and the person carrying them, confirm against a summary
   grouped by ประเภทงาน, and print the manifest that travels with the box.

   The tab that matters most is the middle one. An outside lab that quietly
   never returns a result is the failure mode that hurts patients, and
   silence is its default — so an overdue consignment sorts to the top and
   carries a destructive badge with its day count. */

const breadcrumb = ['งานชันสูตรโรค (Lab)', 'ส่งตรวจภายนอก'];
const PAGE_SIZE = 20;

/* Monospace for accession numbers — a rendering requirement for aligned
   identifiers, not a design-system value. tokens.css defines no
   --type-family-mono, so that var() only ever resolved to its own fallback;
   a plain stack states that honestly instead of naming a token that would
   silently change meaning the day a theme defines one. */
const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

/* The mock's "today", matching LabQueuePage and LabOrderPage. A real
   deployment reads the clock; pinning it keeps the seeded overdue
   consignment reproducible. */
const TODAY = '2026-07-31';
const CURRENT_ACTOR = 'ทนพ.ญ. อารีย์ วงศ์สุข';

const ALL = '__all__';
const URGENCY_OPTIONS = [{ value: ALL, label: 'ทั้งหมด' }, ...LAB_URGENCIES.map((u) => ({ value: u.key, label: u.label }))];
const GROUP_OPTIONS = [{ value: ALL, label: 'ทั้งหมด' }, ...LAB_GROUPS.map((g) => ({ value: g.key, label: g.thai }))];
const LOCATION_OPTIONS = [{ value: ALL, label: 'ทั้งหมด' }, ...LAB_LOCATIONS.map((l) => ({ value: l, label: l }))];
const LAB_OPTIONS = [{ value: ALL, label: 'ทั้งหมด' }, ...LAB_EXTERNAL_LABS.map((l) => ({ value: l.key, label: l.short }))];

const TABS = [
  { key: 'pending',  label: 'รอส่ง',            icon: 'outbox' },
  { key: 'sent',     label: 'ส่งแล้ว / รอผลกลับ', icon: 'local_shipping' },
  { key: 'returned', label: 'รับผลกลับแล้ว',     icon: 'assignment_turned_in' },
];

const LabSendOutPage = () => {
  const history = useHistory();

  /* Mock permission, resolved once. Open /lab/send-out?role=viewer to see the
     read-only state — printing and browsing stay available, every write is
     disabled with the reason on the control. */
  const { canEdit, denyReason, roleLabel, readOnly } = useLabPermissions();

  const [version, setVersion] = useState(0);
  useEffect(() => subscribeOrders(() => setVersion((v) => v + 1)), []);
  useEffect(() => subscribeSendOuts(() => setVersion((v) => v + 1)), []);

  const liveRows = useMemo(
    () => LAB_ORDERS.map(withTestLabel),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version],
  );

  const [tab, setTab] = useState('pending');
  const [query, setQuery] = useState('');
  const [urgency, setUrgency] = useState(ALL);
  const [group, setGroup] = useState(ALL);
  const [location, setLocation] = useState(ALL);
  const [labFilter, setLabFilter] = useState(ALL);
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState([]);
  const [formOpen, setFormOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  /* AlertDialog has no confirmDisabled and does not self-close, so confirming
     with an empty required reason was a DEAD CLICK — handleCancelSendOut
     returned early and nothing at all happened. */
  const [cancelAttempted, setCancelAttempted] = useState(false);
  const [returnTarget, setReturnTarget] = useState(null);
  /* Rows + draft handed to the print-only manifest — set immediately before
     printing so one click prints one consignment, not every send-out. */
  const [manifest, setManifest] = useState({ rows: [], draft: null, batchNo: '' });

  useEffect(() => { setPage(1); setSelectedIds([]); }, [tab, query, urgency, group, location, labFilter]);

  const withRecord = (rows) => rows.map((r) => ({ ...r, sendOut: getSendOut(r.id) }));

  const tabRows = useMemo(() => {
    if (tab === 'pending') return sendableRows(liveRows).filter((r) => !getSendOut(r.id) || getSendOut(r.id).cancelled);
    const sent = withRecord(sentRows(liveRows));
    if (tab === 'sent') return sent.filter((r) => !r.sendOut?.returned);
    return sent.filter((r) => r.sendOut?.returned);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveRows, tab, version]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = tabRows.filter((r) => {
      if (urgency !== ALL && r.urgency !== urgency) return false;
      if (group !== ALL && r.group !== group) return false;
      if (location !== ALL && r.location !== location) return false;
      if (labFilter !== ALL && r.sendOut?.labKey !== labFilter) return false;
      if (!q) return true;
      /* Confidential rows match on accession only — same rule the worklist
         applies at LabQueuePage.jsx L548. */
      const haystack = r.confidential
        ? `${r.accessionNo} ${r.sendOut?.batchNo ?? ''}`.toLowerCase()
        : `${r.accessionNo} ${r.patient.hn} ${r.patient.shortName} ${r.testLabel} ${r.sendOut?.batchNo ?? ''}`.toLowerCase();
      return haystack.includes(q);
    });
    /* Overdue first on the outstanding tab — the consignment nobody has
       chased is the one that needs the screen's top row. */
    if (tab === 'sent') {
      list.sort((a, b) => {
        const ao = isOverdueReturn(a.sendOut, TODAY) ? 0 : 1;
        const bo = isOverdueReturn(b.sendOut, TODAY) ? 0 : 1;
        if (ao !== bo) return ao - bo;
        return (outstandingDays(b.sendOut, TODAY) ?? 0) - (outstandingDays(a.sendOut, TODAY) ?? 0);
      });
    }
    return list;
  }, [tabRows, query, urgency, group, location, labFilter, tab]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const rangeStart = filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, filtered.length);

  const hasFilter = query.trim() !== '' || urgency !== ALL || group !== ALL || location !== ALL || labFilter !== ALL;
  const clearFilters = () => { setQuery(''); setUrgency(ALL); setGroup(ALL); setLocation(ALL); setLabFilter(ALL); };

  const outstanding = useMemo(
    () => withRecord(sentRows(liveRows)).filter((r) => !r.sendOut?.returned),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [liveRows, version],
  );
  const overdue = outstanding.filter((r) => isOverdueReturn(r.sendOut, TODAY));

  const summaryCards = useMemo(() => [
    { key: 'pending', label: 'รอส่งออก', value: sendableRows(liveRows).filter((r) => !getSendOut(r.id) || getSendOut(r.id).cancelled).length, indicator: 'รายการที่ยังไม่ได้นำส่ง', color: 'info', icon: 'outbox' },
    { key: 'sent', label: 'ส่งแล้ว รอผลกลับ', value: outstanding.length, indicator: 'อยู่ที่หน่วยงานภายนอก', color: 'inprogress', icon: 'local_shipping' },
    { key: 'overdue', label: 'เกินกำหนดรับผล', value: overdue.length, indicator: 'ต้องติดตามกับหน่วยงานปลายทาง', color: 'destructive', icon: 'running_with_errors' },
    { key: 'returned', label: 'รับผลกลับแล้ว', value: withRecord(sentRows(liveRows)).filter((r) => r.sendOut?.returned).length, indicator: 'พร้อมบันทึกผล', color: 'brand', icon: 'assignment_turned_in' },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [liveRows, outstanding, overdue, version]);

  const tabs = useMemo(() => TABS.map((t) => {
    const count = t.key === 'pending'
      ? sendableRows(liveRows).filter((r) => !getSendOut(r.id) || getSendOut(r.id).cancelled).length
      : t.key === 'sent'
        ? outstanding.length
        : withRecord(sentRows(liveRows)).filter((r) => r.sendOut?.returned).length;
    return { ...t, count };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [liveRows, outstanding, version]);

  const selectedRows = useMemo(
    () => filtered.filter((r) => selectedIds.includes(r.id)),
    [filtered, selectedIds],
  );
  const allOnPageSelected = pageRows.length > 0 && pageRows.every((r) => selectedIds.includes(r.id));

  const handleConfirmSendOut = (draft) => {
    const result = confirmSendOut(selectedRows, draft, { actor: CURRENT_ACTOR });
    if (!result.ok) {
      setToast('ยืนยันการส่งไม่สำเร็จ — ตรวจสอบข้อมูลในแบบฟอร์มอีกครั้ง');
      return;
    }
    /* Print the manifest from the SAME rows that were just committed, so the
       paper and the record cannot disagree. */
    setManifest({ rows: selectedRows, draft, batchNo: result.batchNo });
    setFormOpen(false);
    setSelectedIds([]);
    setTab('sent');
    setToast(`ยืนยันส่งตรวจภายนอกแล้ว — ใบนำส่งเลขที่ ${result.batchNo}`);
    window.setTimeout(() => printLab('manifest'), 0);
  };

  const handleCancelSendOut = () => {
    setCancelAttempted(true);
    if (!cancelTarget || !cancelReason.trim()) return;
    cancelSendOut(cancelTarget, { reason: cancelReason.trim(), actor: CURRENT_ACTOR });
    setCancelTarget(null);
    setCancelReason('');
    setCancelAttempted(false);
    setToast('ยกเลิกการส่งตรวจภายนอกแล้ว — รายการกลับไปยังสถานะเดิมก่อนส่ง');
  };

  const handleMarkReturned = () => {
    if (!returnTarget) return;
    markReturned(returnTarget, { at: TODAY, actor: CURRENT_ACTOR });
    const id = returnTarget.id;
    setReturnTarget(null);
    setToast('บันทึกรับผลกลับแล้ว — บันทึกค่าที่หน้าบันทึกผลได้เลย');
    window.setTimeout(() => history.push(`/lab/result/${id}`), 700);
  };

  const reprintManifest = (row) => {
    const rec = row.sendOut;
    if (!rec) return;
    const batchRows = liveRows.filter((r) => getSendOut(r.id)?.batchNo === rec.batchNo);
    setManifest({
      rows: batchRows,
      draft: { labKey: rec.labKey, courier: rec.courier, sentAt: rec.sentAt, expectedAt: rec.expectedAt, reason: rec.reason, note: rec.note },
      batchNo: rec.batchNo,
    });
    window.setTimeout(() => printLab('manifest'), 0);
  };

  const identityCell = (row) => (
    <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-050, 2px)' }}>
      <span className='inline-flex items-center' style={{ gap: 'var(--dim-space-150)', fontFamily: MONO, fontSize: 'var(--type-size-sm)', color: 'var(--text-content-default)' }}>
        <Icon name='barcode' size={14} />
        {row.accessionNo}
      </span>
      <span className='inline-flex items-center' style={{ gap: 'var(--dim-space-100)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
        {row.confidential && <Icon name='lock' size={12} />}
        {row.confidential ? 'ผู้ป่วยปกปิด (VCT)' : `${row.patient.shortName} · HN ${row.patient.hn}`}
      </span>
    </div>
  );

  const testCell = (row) => (
    <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-050, 2px)' }}>
      <span className='inline-flex items-center' style={{ gap: 'var(--dim-space-150)', fontFamily: 'var(--type-family-body)', fontWeight: 'var(--type-weight-medium)', fontSize: 'var(--type-size-sm)', color: 'var(--text-content-default)' }}>
        {row.testLabel}
        {row.urgency === 'stat' && <Badge style='error' size='small'>STAT</Badge>}
      </span>
      <span className='inline-flex items-center' style={{ gap: 'var(--dim-space-150)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
        {row.tube && <LabTubeDot tube={row.tube} count={row.tubeCount} size={8} />}
        {row.groupLabel} · {row.location}
      </span>
    </div>
  );

  const pendingColumns = [
    {
      key: 'select',
      label: '',
      width: 44,
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
            <Icon name={on ? 'check_box' : 'check_box_outline_blank'} size={20} style={{ color: on ? 'var(--text-brandPrimary-default)' : 'var(--text-content-quaternary)' }} />
          </button>
        );
      },
    },
    { key: 'accessionNo', label: 'Accession / ผู้ป่วย', width: 220, render: identityCell },
    { key: 'testLabel', label: 'รายการตรวจ', render: testCell },
    {
      key: 'status',
      label: 'สถานะปัจจุบัน',
      width: 150,
      render: (row) => <Badge style='neutral' size='small'>{row.statusLabel}</Badge>,
    },
    {
      key: 'price',
      label: 'ราคา',
      width: 100,
      render: (row) => (
        <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary)' }}>
          {row.price?.toLocaleString('th-TH')} บาท
        </span>
      ),
    },
    {
      key: 'actions',
      label: '',
      width: 140,
      render: (row) => (
        <NeutralSubdueButton
          variant='outline'
          size='sm'
          leadingIcon='send'
          onClick={() => { setSelectedIds([row.id]); setFormOpen(true); }}
        >
          ส่งรายการนี้
        </NeutralSubdueButton>
      ),
    },
  ];

  const sentColumns = [
    { key: 'accessionNo', label: 'Accession / ผู้ป่วย', width: 220, render: identityCell },
    { key: 'testLabel', label: 'รายการตรวจ', render: testCell },
    {
      key: 'destination',
      label: 'หน่วยงานปลายทาง',
      width: 230,
      render: (row) => (
        <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-050, 2px)' }}>
          <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)', color: 'var(--text-content-default)' }}>
            {LAB_EXTERNAL_LAB_BY_KEY[row.sendOut?.labKey]?.short ?? row.sendOut?.labName ?? '—'}
          </span>
          <span style={{ fontFamily: MONO, fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
            {row.sendOut?.batchNo}
          </span>
          <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
            {LAB_SENDOUT_REASON_BY_KEY[row.sendOut?.reason]?.label ?? ''}
          </span>
        </div>
      ),
    },
    {
      key: 'timing',
      label: 'ส่ง / คาดว่าจะได้ผล',
      width: 210,
      render: (row) => {
        const rec = row.sendOut;
        const late = isOverdueReturn(rec, TODAY);
        const days = outstandingDays(rec, TODAY);
        return (
          <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-100)' }}>
            <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-secondary)' }}>
              ส่ง {rec?.sentAt} · ผู้นำส่ง {rec?.courier}
            </span>
            <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
              คาดว่าจะได้ผล {rec?.expectedAt}
            </span>
            {rec?.returned ? (
              <Badge style='success' size='small' icon='check_circle'>รับผลกลับ {rec.returnedAt}</Badge>
            ) : late ? (
              <Badge style='error' size='small' icon='running_with_errors'>เกินกำหนด · ค้าง {days} วัน</Badge>
            ) : (
              <Badge style='warning' size='small' icon='schedule'>ค้าง {days} วัน</Badge>
            )}
          </div>
        );
      },
    },
    {
      key: 'actions',
      label: '',
      width: 280,
      render: (row) => (
        <div className='flex flex-wrap items-center' style={{ gap: 'var(--dim-space-150)' }}>
          {!row.sendOut?.returned && (
            <BrandPrimaryButton size='sm' leadingIcon='inbox' disabled={!canEdit} title={canEdit ? undefined : denyReason} onClick={() => setReturnTarget(row)}>
              บันทึกรับผลกลับ
            </BrandPrimaryButton>
          )}
          {row.sendOut?.returned && (
            <NeutralSubdueButton variant='outline' size='sm' leadingIcon='edit_note' onClick={() => history.push(`/lab/result/${row.id}`)}>
              บันทึกผล
            </NeutralSubdueButton>
          )}
          <NeutralSubdueButton variant='outline' size='sm' leadingIcon='print' onClick={() => reprintManifest(row)}>
            ใบนำส่ง
          </NeutralSubdueButton>
          {!row.sendOut?.returned && (
            <DangerSubdueButton variant='outline' size='sm' leadingIcon='undo' disabled={!canEdit} title={canEdit ? undefined : denyReason} onClick={() => { setCancelTarget(row); setCancelReason(''); setCancelAttempted(false); }}>
              ยกเลิกการส่ง
            </DangerSubdueButton>
          )}
        </div>
      ),
    },
  ];

  const emptyCopy = () => {
    if (hasFilter) return `ไม่พบรายการที่ตรงกับ "${query.trim() || 'ตัวกรองที่เลือก'}"`;
    if (tab === 'pending') return 'ไม่มีรายการที่ต้องส่งตรวจภายนอก';
    if (tab === 'sent') return 'ไม่มีรายการที่ส่งออกและยังรอผลกลับ';
    return 'ยังไม่มีรายการที่รับผลกลับจากหน่วยงานภายนอก';
  };

  return (
    <>
      <SuccessToast open={!!toast} message={toast} onClose={() => setToast('')} topOffset='var(--dim-space-800, 32px)' />

      <LabSendOutFormPopup
        open={formOpen}
        rows={selectedRows}
        today={TODAY}
        onClose={() => setFormOpen(false)}
        onConfirm={handleConfirmSendOut}
      />

      <AlertDialog
        open={!!cancelTarget}
        type='warning'
        title='ยกเลิกการส่งตรวจภายนอก?'
        description={cancelTarget
          ? `${cancelTarget.testLabel} (${cancelTarget.accessionNo}) จะกลับไปยังสถานะก่อนส่ง (${cancelTarget.sendOut?.previousStatus ?? 'กำลังตรวจ'}) และหลุดออกจากใบนำส่ง ${cancelTarget.sendOut?.batchNo ?? ''}`
          : ''}
        cancelLabel='ไม่ยกเลิก'
        confirmLabel='ยืนยันยกเลิกการส่ง'
        onCancel={() => { setCancelTarget(null); setCancelReason(''); setCancelAttempted(false); }}
        onClose={() => { setCancelTarget(null); setCancelReason(''); setCancelAttempted(false); }}
        onConfirm={handleCancelSendOut}
      >
        <div className='w-full flex flex-col' style={{ gap: 'var(--dim-space-200)' }}>
          <InputField
            label='เหตุผลที่ยกเลิกการส่ง'
            required
            showLeadingIcon={false}
            size='md'
            placeholder='เช่น หน่วยงานปลายทางปฏิเสธรับ · เลือกรายการผิด'
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

      <AlertDialog
        open={!!returnTarget}
        type='info'
        title='บันทึกว่าได้รับผลกลับแล้ว?'
        description={returnTarget
          ? `ระบบจะปิดนาฬิกาค้างรับผลของ ${returnTarget.testLabel} (${returnTarget.accessionNo}) แล้วพาไปยังหน้าบันทึกผล เพื่อคีย์ค่าและเลขที่อ้างอิงของหน่วยงานภายนอก`
          : ''}
        cancelLabel='ยังไม่ใช่'
        confirmLabel='บันทึกรับผลกลับ'
        onCancel={() => setReturnTarget(null)}
        onClose={() => setReturnTarget(null)}
        onConfirm={handleMarkReturned}
      />

      <QueuePageShell
        activeKey='lab'
        breadcrumb={breadcrumb}
        title='ส่งตรวจภายนอก (Send-out lab)'
        onBack={() => history.push('/lab/queue')}
        backLabel='กลับไปยัง Worklist'
        summaryCards={summaryCards}
        summaryFlushUnderSubHeader={false}
        tabs={tabs}
        activeTab={tab}
        onTabChange={setTab}
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
          {/* An outside lab that never returns a result is silent by
              default — so the overdue count is announced above the table,
              not left to be discovered by scrolling. */}
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

          {overdue.length > 0 && (
            <Alert
              type='destructive'
              iconName='running_with_errors'
              iconFill={1}
              title={`มี ${overdue.length} รายการที่เกินกำหนดรับผลจากหน่วยงานภายนอก`}
              subtext='ติดต่อหน่วยงานปลายทางเพื่อติดตามผล — ผู้ป่วยและแพทย์ผู้สั่งยังรอผลนี้อยู่'
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
              gap: 'var(--dim-space-400)',
            }}
          >
            <div className='w-full flex flex-wrap items-start' style={{ gap: 'var(--dim-space-300)' }}>
              <PrimarySearch
                value={query}
                onChange={setQuery}
                onSubmit={setQuery}
                placeholder='ค้นหา Accession / HN / ชื่อ / เลขที่ใบนำส่ง'
                width={520}
              />
              {tab === 'pending' && (
                <BrandPrimaryButton
                  size='md'
                  leadingIcon='send'
                  disabled={!canEdit || selectedRows.length === 0}
                  title={canEdit ? undefined : denyReason}
                  onClick={() => setFormOpen(true)}
                >
                  ส่งตรวจภายนอก {selectedRows.length > 0 ? `(${selectedRows.length})` : ''}
                </BrandPrimaryButton>
              )}
              <NeutralSubdueButton variant='outline' size='md' leadingIcon='inventory_2' onClick={() => history.push('/lab/receive')}>
                สถานีรับสิ่งส่งตรวจ
              </NeutralSubdueButton>
            </div>

            <OverflowFlexRow itemGap='var(--dim-space-200)' moreAriaLabel='แสดงตัวกรองที่ซ่อน'>
              {tab === 'pending' && (
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
              )}
              <FilterDropdown prefix='ความเร่งด่วน:' options={URGENCY_OPTIONS} value={urgency} onChange={setUrgency} />
              <FilterDropdown prefix='กลุ่มตรวจ:' options={GROUP_OPTIONS} value={group} onChange={setGroup} />
              <FilterDropdown prefix='จุดสั่ง:' options={LOCATION_OPTIONS} value={location} onChange={setLocation} />
              {tab !== 'pending' && (
                <FilterDropdown prefix='หน่วยงานปลายทาง:' options={LAB_OPTIONS} value={labFilter} onChange={setLabFilter} />
              )}
              {hasFilter && (
                <NeutralSubdueButton variant='outline' size='sm' leadingIcon='filter_alt_off' onClick={clearFilters}>
                  ล้างตัวกรอง
                </NeutralSubdueButton>
              )}
            </OverflowFlexRow>

            {tab === 'pending' && selectedRows.length > 0 && (
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
                  เลือกไว้ {selectedRows.length} รายการ · รวม {selectedRows.reduce((s, r) => s + (r.price ?? 0), 0).toLocaleString('th-TH')} บาท
                </span>
                <BrandPrimaryButton size='sm' leadingIcon='send' disabled={!canEdit} title={canEdit ? undefined : denyReason} onClick={() => setFormOpen(true)}>
                  ยืนยันส่งออก
                </BrandPrimaryButton>
                <div className='flex-1' />
                <NeutralSubdueButton variant='outline' size='sm' onClick={() => setSelectedIds([])}>
                  ล้างการเลือก
                </NeutralSubdueButton>
              </div>
            )}

            {filtered.length === 0 ? (
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
                <Icon name={hasFilter ? 'search_off' : 'outbox'} size={32} style={{ color: 'var(--text-content-quaternary)' }} />
                <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)', color: 'var(--text-content-tertiary)', textAlign: 'center' }}>
                  {emptyCopy()}
                </span>
                {hasFilter && (
                  <NeutralSubdueButton variant='outline' size='sm' leadingIcon='filter_alt_off' onClick={clearFilters}>
                    ล้างตัวกรอง
                  </NeutralSubdueButton>
                )}
              </div>
            ) : (
              <>
                <Table
                  columns={tab === 'pending' ? pendingColumns : sentColumns}
                  rows={pageRows}
                  rowKey={(row) => row.id}
                  stickyColCount={tab === 'pending' ? 2 : 1}
                  stickyHeaderTop={QUEUE_STICKY_UNDER_TABS}
                  emptyMessage={emptyCopy()}
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
          </div>

          {/* Manifest preview — the same component the printer gets, on a
              grey desk so it can be checked before paper is burned. */}
          {manifest.rows.length > 0 && (
            <div
              className='flex flex-col w-full mih-lab-no-print'
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
              <div className='flex flex-wrap items-center w-full' style={{ gap: 'var(--dim-space-300)' }}>
                <span className='inline-flex items-center' style={{ gap: 'var(--dim-space-200)', fontFamily: 'var(--type-family-heading-content)', fontWeight: 'var(--type-weight-bold)', fontSize: 'var(--type-size-base)', color: 'var(--text-content-default)' }}>
                  <Icon name='receipt_long' size={20} style={{ color: 'var(--text-brandPrimary-default)' }} />
                  ตัวอย่างใบนำส่ง {manifest.batchNo}
                </span>
                <div className='flex-1' />
                <NeutralSubdueButton variant='outline' size='sm' leadingIcon='print' onClick={() => printLab('manifest')}>
                  พิมพ์ใบนำส่งอีกครั้ง
                </NeutralSubdueButton>
                <NeutralSubdueButton variant='outline' size='sm' onClick={() => setManifest({ rows: [], draft: null, batchNo: '' })}>
                  ปิดตัวอย่าง
                </NeutralSubdueButton>
              </div>
              <div
                className='w-full flex justify-center'
                style={{
                  background: 'var(--surface-card-200)',
                  borderRadius: 'var(--dim-radius-500)',
                  paddingTop: 'var(--dim-space-800, 32px)',
                  paddingBottom: 'var(--dim-space-800, 32px)',
                  paddingLeft: 'var(--dim-space-400)',
                  paddingRight: 'var(--dim-space-400)',
                  overflowX: 'auto',
                }}
              >
                <div style={{ flexShrink: 0, background: '#FFFFFF', boxShadow: 'var(--shadow-card-strong)' }}>
                  <LabSendOutManifest rows={manifest.rows} draft={manifest.draft} batchNo={manifest.batchNo} preview />
                </div>
              </div>
            </div>
          )}
        </div>
      </QueuePageShell>

      {/* The real print target — same component, hidden until printing.

          PORTALED TO body, not rendered in place. labPrintSettings.js hides
          `body > *:not(.mih-lab-print-root)` while printing, and this page
          lives inside #root — which matches that selector and goes
          display:none, taking any print root nested under it with it.
          `display:block !important` on the inner document cannot resurrect a
          subtree whose ancestor is hidden, so printLab('manifest') produced a
          blank page. The portal makes this a real `body > .mih-lab-print-root`
          and the selector leaves it alone. */}
      {typeof document !== 'undefined' && createPortal(
        <div className='mih-lab-print-root'>
          <LabSendOutManifest rows={manifest.rows} draft={manifest.draft} batchNo={manifest.batchNo} />
        </div>,
        document.body,
      )}
    </>
  );
};

export default LabSendOutPage;
