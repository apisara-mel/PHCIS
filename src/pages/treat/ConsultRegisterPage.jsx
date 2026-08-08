import React, { useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import Table from '@/components/table/Table';
import Pagination from '@/components/pagination/Pagination';
import PrimarySearch from '@/components/search/PrimarySearch';
import StatusBadge from '@/components/badge/StatusBadge';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import Select from '@/components/forms/Select';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import InputField from '@/components/forms/InputField';
import BrandButton from '@/components/button/BrandButton';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import AlertDialog from '@/components/popup/AlertDialog';
import UnsavedChangesPopup from '@/components/popup/UnsavedChangesPopup';
import PhcisTopToast from '@/components/alert/PhcisTopToast';
import ConsultPrintSheet from '@/pages/treat/ConsultPrintSheet';
import {
  PanelCard, PanelEmptyState, InfoPair, Sym, CancelledMark, strikeIf,
  PANEL_LABEL_STYLE, PANEL_VALUE_STYLE,
} from '@/pages/treat/panels/panelKit';
import {
  useTreatmentAccess, useTreatmentStore, GuardedAction, AccessDeniedPanel,
  ReasonDialog, PanelAlert, CountLabel, paginate, MaskedValue,
} from '@/pages/treat/panels/panelHooks';
import {
  CONSULT_STATUSES, CONSULT_CLINICS, CONSULT_TYPES, CONSULT_URGENCIES,
  consultStatusMeta, consultTypeMeta, consultUrgencyMeta, clinicMeta, doctorMeta,
  subscribeConsults, getConsults, missingConsultFields, isConsultIncomplete,
  isConsultOverdue, saveConsult, acceptConsult, replyConsult, cancelConsult,
  printConsult, CONSULT_REPLY_SUGGESTIONS, CONSULT_CANCEL_SUGGESTIONS,
  CONSULT_QUESTION_SUGGESTIONS,
} from '@/data/treatmentConsult';
import { CURRENT_CLINICIAN, appendAudit } from '@/data/treatmentAudit';
import MaskedWorklistName from '@/components/privacy/MaskedWorklistName';
import { NO_EDIT_RIGHT_TOOLTIP, NO_CONFIDENTIAL_RIGHT_TOOLTIP } from '@/data/treatmentAccess';

/* PHCIS | CPOE §1.5.6 — ทะเบียนการส่งปรึกษา (Consult worklist).
   หน้าเดียวครอบคลุมสองทิศทาง (ส่งออก / ส่งมาถึงฉัน) list + form
   pattern เดียวกับ ReferralRegisterPage — คัดลอกโครง ไม่แก้ไฟล์เดิม.
   คำศัพท์ตารางและ legend "ข้อมูลไม่สมบูรณ์" ตามคู่มือ HCIS §2.10. */

const breadcrumb = ['ระบบบันทึกการรักษา', 'ทะเบียนการส่งปรึกษาแพทย์'];

const DIRECTION_TABS = [
  { key: 'out', label: 'คำขอที่ส่งออก' },
  { key: 'in',  label: 'คำขอที่ส่งมาถึงฉัน' },
];

const PER_PAGE = 10;

/* ค้นหา 3 แบบตามคู่มือ §1.4 — HN / เลข 13 หลัก / ชื่อ+นามสกุล
   รองรับ wildcard `+` (AND ทุกคำ) และ `%` (แทนอักษรกี่ตัวก็ได้) */
const buildMatcher = (raw) => {
  const q = String(raw || '').trim();
  if (!q) return () => true;
  const digits = q.replace(/[^0-9]/g, '');
  if (digits.length === 13) {
    return (r) => String(r.cid || '').replace(/[^0-9]/g, '') === digits;
  }
  const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const terms = q.split('+').map((t) => t.trim()).filter(Boolean);
  const regexes = terms.map((t) => new RegExp(escapeRe(t).replace(/%/g, '.*'), 'i'));
  return (r) => {
    const hay = [r.hn, r.name, r.consultNo, r.cid, clinicMeta(r.toClinic)?.label, doctorMeta(r.toDoctor)?.name]
      .filter(Boolean).join(' ');
    return regexes.every((re) => re.test(hay));
  };
};

const ConsultRegisterPage = () => {
  const history = useHistory();
  const access = useTreatmentAccess();

  const [direction, setDirection] = useState('out');
  const [mode, setMode] = useState('list');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [clinicFilter, setClinicFilter] = useState('all');
  const [page, setPage] = useState(1);

  const [draft, setDraft] = useState(null);
  const [baseline, setBaseline] = useState(null);
  const [toast, setToast] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyBody, setReplyBody] = useState('');
  const [replyAdvice, setReplyAdvice] = useState('');
  const [replyAttachment, setReplyAttachment] = useState('');
  const [printTarget, setPrintTarget] = useState(null);
  const [leaveGuard, setLeaveGuard] = useState(false);
  const [sendGuard, setSendGuard] = useState(null);
  const [revealed, setRevealed] = useState({});

  /* เก็บ snapshot จริงไว้ใน state (ไม่ใช่แค่ refresh callback) เพราะ
     useMemo ต้องมี dependency ที่เปลี่ยนค่าจริงเมื่อ store ถูกแก้
     — ไม่งั้นตารางจะค้างข้อมูลเก่าหลังบันทึก/ยกเลิก */
  const [allConsults, refresh] = useTreatmentStore(subscribeConsults, getConsults, []);

  const directionRows = useMemo(
    () => allConsults.filter((c) => c.direction === direction),
    [allConsults, direction],
  );

  const filtered = useMemo(() => {
    const match = buildMatcher(query);
    return directionRows
      .filter(match)
      .filter((r) => statusFilter === 'all' || r.status === statusFilter)
      .filter((r) => clinicFilter === 'all' || r.toClinic === clinicFilter);
  }, [directionRows, query, statusFilter, clinicFilter]);

  useEffect(() => { setPage(1); }, [query, statusFilter, clinicFilter, direction]);

  const { pageCount, page: safePage, slice } = paginate(filtered, page, PER_PAGE);

  const summaryCards = useMemo(() => {
    const count = (pred) => directionRows.filter(pred).length;
    return [
      { key: 'sent',     label: 'รอรับเรื่อง',     value: count((r) => r.status === 'sent'),     indicator: 'ส่งแล้ว รอปลายทาง',   color: 'info',        icon: 'outgoing_mail' },
      { key: 'accepted', label: 'รับเรื่องแล้ว',   value: count((r) => r.status === 'accepted'), indicator: 'รอความเห็นแพทย์',      color: 'inprogress',  icon: 'assignment_ind' },
      { key: 'replied',  label: 'ตอบกลับแล้ว',     value: count((r) => r.status === 'replied'),  indicator: 'อ่านความเห็นได้',      color: 'positive',    icon: 'mark_email_read' },
      { key: 'overdue',  label: 'เกินกำหนดตอบ',    value: count(isConsultOverdue),               indicator: 'ด่วน/ด่วนมากที่ค้าง',   color: 'destructive', icon: 'schedule' },
      { key: 'incomplete', label: 'ข้อมูลไม่สมบูรณ์', value: count(isConsultIncomplete),          indicator: 'ต้องกรอกให้ครบก่อนส่ง', color: 'destructive', icon: 'error' },
      { key: 'cancelled', label: 'ยกเลิก',         value: count((r) => r.status === 'cancelled'), indicator: 'เก็บไว้เป็นหลักฐาน',   color: 'brand',       icon: 'block' },
    ];
  }, [directionRows]);

  const dirty = useMemo(
    () => (draft && baseline ? JSON.stringify(draft) !== JSON.stringify(baseline) : false),
    [draft, baseline],
  );

  const showToast = (variant, message) => setToast({ id: Date.now(), variant, message });

  const openRow = (row) => { setDraft({ ...row }); setBaseline({ ...row }); setMode('form'); };

  const backToList = () => {
    if (dirty) { setLeaveGuard(true); return; }
    setMode('list'); setDraft(null); setBaseline(null);
  };

  const doSave = () => {
    const saved = saveConsult({ ...draft });
    setDraft({ ...saved }); setBaseline({ ...saved });
    showToast('success', `บันทึกคำขอปรึกษา ${saved.consultNo} แล้ว`);
    refresh();
    return saved;
  };

  const doAccept = () => {
    const updated = acceptConsult(draft.id);
    setDraft({ ...updated }); setBaseline({ ...updated });
    showToast('success', `รับเรื่องคำขอ ${updated.consultNo} แล้ว`);
    refresh();
  };

  const doReply = () => {
    if (replyBody.trim().length < 10) { setSendGuard(['ความเห็นของแพทย์ผู้รับปรึกษา (อย่างน้อย 10 ตัวอักษร)']); return; }
    const updated = replyConsult(draft.id, {
      body: replyBody.trim(),
      advice: replyAdvice.trim(),
      attachments: replyAttachment.trim() ? [replyAttachment.trim()] : [],
    });
    setDraft({ ...updated }); setBaseline({ ...updated });
    setReplyOpen(false); setReplyBody(''); setReplyAdvice(''); setReplyAttachment('');
    showToast('success', `ตอบกลับคำขอ ${updated.consultNo} แล้ว`);
    refresh();
  };

  const doCancel = (reason) => {
    const updated = cancelConsult(cancelTarget.id, reason);
    if (draft?.id === updated.id) { setDraft({ ...updated }); setBaseline({ ...updated }); }
    setCancelTarget(null);
    showToast('success', `ยกเลิกคำขอ ${updated.consultNo} แล้ว (เก็บไว้ในทะเบียนพร้อมเหตุผล)`);
    refresh();
  };

  const doPrint = () => {
    const target = printTarget?.id ? printTarget : doSave();
    const updated = target?.id ? printConsult(target.id, 1) : null;
    if (!updated) {
      showToast('error', 'ยังพิมพ์ไม่ได้ — บันทึกคำขอก่อน แล้วจึงสั่งพิมพ์อีกครั้ง');
      setPrintTarget(null);
      return;
    }
    if (draft?.id === updated.id) { setDraft({ ...updated }); setBaseline({ ...updated }); }
    setPrintTarget(null);
    showToast('success', `บันทึกการพิมพ์แล้ว (รวมพิมพ์ ${updated.printCount} ครั้ง)`);
    refresh();
    if (typeof window !== 'undefined' && window.print) window.print();
  };

  const reveal = (row) => {
    setRevealed((r) => ({ ...r, [row.id]: true }));
    appendAudit({
      hn: row.hn, visitId: row.visitId, category: 'confidential',
      field: `ขอเปิดดูคำขอปรึกษาที่เป็นข้อมูลลับ ${row.consultNo}`,
      oldValue: 'ปิดบัง', newValue: `เปิดดูโดย ${CURRENT_CLINICIAN.name}`,
      by: CURRENT_CLINICIAN.name,
    });
  };

  /* คลินิกที่ทำเครื่องหมาย confidential (เช่น HIV/STI) ต้องถูก mask
     เมื่อสิทธิ์ไม่ถึง — สำคัญมากบนหน้านี้เพราะคนนอกคลินิกเจ้าของไข้เข้ามาดู */
  const isMasked = (row) => !!clinicMeta(row.toClinic)?.confidential
    && !access.canSeeConfidential && !revealed[row.id];

  if (!access.canView) {
    return (
      <QueuePageShell activeKey='treat' breadcrumb={breadcrumb} title='ทะเบียนการส่งปรึกษาแพทย์'>
        <div style={{
          paddingTop: 'var(--dim-space-600, 24px)', paddingRight: 'var(--dim-space-600, 24px)',
          paddingBottom: 'var(--dim-space-600, 24px)', paddingLeft: 'var(--dim-space-600, 24px)',
        }}>
          <AccessDeniedPanel what='ทะเบียนการส่งปรึกษา' onBack={() => history.push('/treat/queue')} />
        </div>
      </QueuePageShell>
    );
  }

  const canEdit = access.canEdit;
  /* ผู้รับปรึกษาเท่านั้นที่ตอบกลับได้ — คนอื่นเปิดอ่านได้แต่ปุ่มถูกปิด */
  const isRecipient = draft
    ? (draft.direction === 'in' || doctorMeta(draft.toDoctor)?.name === CURRENT_CLINICIAN.name)
    : false;
  const rowLocked = draft ? ['replied', 'cancelled'].includes(draft.status) : false;
  const requesterLocked = draft ? (draft.direction === 'out' && ['accepted', 'replied'].includes(draft.status)) : false;

  const columns = [
    {
      key: 'requestedAt', header: 'วันที่',
      render: (r) => <span style={{ ...PANEL_VALUE_STYLE, ...strikeIf(r.status === 'cancelled') }}>{r.requestedAt}</span>,
    },
    {
      key: 'consultNo', header: 'เลขที่คำขอ',
      render: (r) => (
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
          <span style={{ ...PANEL_VALUE_STYLE, ...strikeIf(r.status === 'cancelled') }}>{r.consultNo}</span>
          {isConsultIncomplete(r) ? (
            <span className='inline-flex items-center' style={{ gap: 'var(--dim-space-100, 4px)' }}>
              <Sym name='error' size={12} color='var(--icon-dangerButton-default, #B91C1C)' />
              <span style={{ ...PANEL_LABEL_STYLE, color: 'var(--text-alert-error, #B91C1C)' }}>ข้อมูลไม่สมบูรณ์</span>
            </span>
          ) : null}
        </div>
      ),
    },
    { key: 'hn', header: 'HN' },
    { key: 'cid', header: 'CID', render: (r) => r.cid || '—' },
    {
      key: 'name', header: 'ชื่อ - สกุล', flex: 1,
      render: (r) => (
        <MaskedWorklistName
          name={r.name}
          recordKey={r.hn || r.id}
          style={strikeIf(r.status === 'cancelled') || undefined}
        />
      ),
    },
    {
      key: 'toClinic', header: 'คลินิกที่ส่งไป',
      render: (r) => (
        <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-100, 4px)' }}>
          <span style={PANEL_VALUE_STYLE}>{clinicMeta(r.toClinic)?.label || 'ยังไม่ระบุคลินิก'}</span>
          <span style={PANEL_LABEL_STYLE}>{doctorMeta(r.toDoctor)?.name || 'ยังไม่ระบุแพทย์'}</span>
        </div>
      ),
    },
    {
      key: 'type', header: 'ประเภท / ความเร่งด่วน',
      render: (r) => (
        <div className='flex flex-wrap items-center' style={{ gap: 'var(--dim-space-100, 4px)' }}>
          <ColorfulBadge style='blue' size='small' width='hug'>{consultTypeMeta(r.consultType).label}</ColorfulBadge>
          <StatusBadge style={consultUrgencyMeta(r.urgency).badge} size='small'>
            {consultUrgencyMeta(r.urgency).label}
          </StatusBadge>
        </div>
      ),
    },
    {
      key: 'status', header: 'สถานะ',
      render: (r) => (
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
          <StatusBadge style={consultStatusMeta(r.status).badge} size='small'>{consultStatusMeta(r.status).label}</StatusBadge>
          {isConsultOverdue(r) ? <StatusBadge style='error' size='small' icon='schedule'>เกินกำหนดตอบ</StatusBadge> : null}
        </div>
      ),
    },
  ];

  return (
    <QueuePageShell
      activeKey='treat'
      breadcrumb={breadcrumb}
      title={mode === 'list' ? 'ทะเบียนการส่งปรึกษาแพทย์' : `คำขอปรึกษา ${draft?.consultNo || ''}`}
      onBack={mode === 'list' ? () => history.push('/treat/queue') : backToList}
      backLabel={mode === 'list' ? 'กลับไปหน้าคิว' : 'กลับไปทะเบียน'}
      summaryCards={mode === 'list' ? summaryCards : undefined}
      tabs={mode === 'list' ? DIRECTION_TABS.map((t) => ({
        key: t.key,
        label: `${t.label} (${allConsults.filter((c) => c.direction === t.key).length})`,
      })) : undefined}
      activeTab={direction}
      onTabChange={setDirection}
      actions={mode === 'list' ? (
        <NeutralSubdueButton
          variant='outline' size='sm' leadingIcon='medical_information'
          onClick={() => history.push('/treat/record')}
        >
          ไปสั่งปรึกษาในหน้าบันทึกการรักษา
        </NeutralSubdueButton>
      ) : null}
    >
      <PhcisTopToast session={toast} onDismiss={() => setToast(null)} />

      <div
        className='flex flex-col flex-1 min-w-0'
        style={{
          paddingTop: 'var(--dim-space-600, 24px)', paddingRight: 'var(--dim-space-600, 24px)',
          paddingBottom: 'var(--dim-space-600, 24px)', paddingLeft: 'var(--dim-space-600, 24px)',
          gap: 'var(--dim-space-400, 16px)',
        }}
      >
        {mode === 'list' ? (
          <PanelCard
            title={DIRECTION_TABS.find((t) => t.key === direction)?.label}
            subtitle='ค้นหาได้ 3 แบบตามคู่มือ — เลข HN · เลขประจำตัวประชาชน 13 หลัก · ชื่อ+นามสกุล (ใช้ + คั่นคำ และ % แทนอักษรที่ไม่ทราบ)'
            action={<CountLabel n={filtered.length} />}
          >
            <div className='flex flex-wrap items-center w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
              <PrimarySearch
                value={query}
                onChange={setQuery}
                width={480}
                placeholder='ค้นหา HN / เลขบัตร 13 หลัก / ชื่อ+นามสกุล'
              />
              <div style={{ minWidth: 200 }}>
                <Select
                  value={statusFilter}
                  onChange={setStatusFilter}
                  options={[{ value: 'all', label: 'ทุกสถานะ' }, ...CONSULT_STATUSES.map((s) => ({ value: s.key, label: s.label }))]}
                  placeholder='กรองตามสถานะ'
                  showLabel={false}
                  showHelperText={false}
                />
              </div>
              <div style={{ minWidth: 240 }}>
                <Select
                  value={clinicFilter}
                  onChange={setClinicFilter}
                  options={[{ value: 'all', label: 'ทุกคลินิก' }, ...CONSULT_CLINICS.map((c) => ({ value: c.key, label: c.label }))]}
                  placeholder='กรองตามคลินิก'
                  showLabel={false}
                  showHelperText={false}
                />
              </div>
              {query || statusFilter !== 'all' || clinicFilter !== 'all' ? (
                <NeutralSubdueButton
                  variant='outline' size='sm' leadingIcon='filter_alt_off'
                  onClick={() => { setQuery(''); setStatusFilter('all'); setClinicFilter('all'); }}
                >
                  ล้างตัวกรอง
                </NeutralSubdueButton>
              ) : null}
            </div>

            {/* legend ตามคู่มือ */}
            <div className='flex flex-wrap items-center' style={{ gap: 'var(--dim-space-300, 12px)' }}>
              <span className='inline-flex items-center' style={{ gap: 'var(--dim-space-100, 4px)' }}>
                <Sym name='error' size={14} color='var(--icon-dangerButton-default, #B91C1C)' />
                <span style={PANEL_LABEL_STYLE}>ข้อมูลไม่สมบูรณ์ — บันทึกร่างได้ แต่ยังส่งไม่ได้</span>
              </span>
              <span className='inline-flex items-center' style={{ gap: 'var(--dim-space-100, 4px)' }}>
                <Sym name='schedule' size={14} color='var(--icon-dangerButton-default, #B91C1C)' />
                <span style={PANEL_LABEL_STYLE}>เกินกำหนดตอบตามระดับความเร่งด่วน</span>
              </span>
              <span className='inline-flex items-center' style={{ gap: 'var(--dim-space-100, 4px)' }}>
                <Sym name='lock' size={14} color='var(--icon-neutral-tertiary, #ADB2B7)' />
                <span style={PANEL_LABEL_STYLE}>{NO_CONFIDENTIAL_RIGHT_TOOLTIP}</span>
              </span>
            </div>

            {filtered.length === 0 ? (
              <PanelEmptyState
                icon={directionRows.length === 0 ? 'forum' : 'search_off'}
                title={directionRows.length === 0
                  ? (direction === 'out' ? 'ยังไม่มีคำขอปรึกษาที่ส่งออก' : 'ยังไม่มีคำขอปรึกษาที่ส่งมาถึงคุณ')
                  : 'ไม่พบคำขอที่ตรงกับเงื่อนไขการค้นหา'}
                subtitle={directionRows.length === 0
                  ? 'ออกคำขอปรึกษาได้จากแท็บ "ปรึกษา" ในหน้าบันทึกการรักษาของผู้รับบริการ'
                  : 'ลองปรับคำค้น (HN / เลขบัตร 13 หลัก / ชื่อ+นามสกุล) หรือล้างตัวกรองสถานะ/คลินิก'}
                action={directionRows.length === 0 ? (
                  <BrandButton
                    variant='outline' size='sm' leadingIcon='medical_information'
                    onClick={() => history.push('/treat/record')}
                  >
                    ไปหน้าบันทึกการรักษา
                  </BrandButton>
                ) : (
                  <NeutralSubdueButton
                    variant='outline' size='sm' leadingIcon='filter_alt_off'
                    onClick={() => { setQuery(''); setStatusFilter('all'); setClinicFilter('all'); }}
                  >
                    ล้างตัวกรอง
                  </NeutralSubdueButton>
                )}
              />
            ) : (
              <>
                <div className='w-full min-w-0' style={{ overflowX: 'auto' }}>
                  <Table columns={columns} rows={slice} rowKey={(r) => r.id} onRowClick={openRow} />
                </div>
                {pageCount > 1 ? (
                  <div className='flex justify-end w-full'>
                    <Pagination currentPage={safePage} pageCount={pageCount} onPageChange={setPage} />
                  </div>
                ) : null}
              </>
            )}
          </PanelCard>
        ) : (
          <>
            <PanelCard
              title={`สถานะคำขอ · ${consultStatusMeta(draft.status).label}`}
              subtitle={`ผู้ขอ ${draft.requestedBy || '—'} · ${draft.requestedAt || '—'} · พิมพ์แล้ว ${draft.printCount || 0} ครั้ง`}
              action={
                <>
                  <GuardedAction allowed={canEdit && !rowLocked && !requesterLocked}>
                    <NeutralSubdueButton variant='outline' size='sm' leadingIcon='save' onClick={doSave}>
                      บันทึกการแก้ไข
                    </NeutralSubdueButton>
                  </GuardedAction>
                  <GuardedAction
                    allowed={canEdit && isRecipient && draft.status === 'sent'}
                    reason={!isRecipient ? 'คุณไม่ใช่แพทย์ผู้รับปรึกษาของใบนี้' : NO_EDIT_RIGHT_TOOLTIP}
                  >
                    <BrandButton variant='outline' size='sm' leadingIcon='assignment_ind' onClick={doAccept}>
                      รับเรื่อง
                    </BrandButton>
                  </GuardedAction>
                  <GuardedAction
                    allowed={canEdit && isRecipient && ['sent', 'accepted'].includes(draft.status)}
                    reason={!isRecipient
                      ? 'คุณไม่ใช่แพทย์ผู้รับปรึกษาของใบนี้ — เปิดอ่านได้แต่ตอบกลับไม่ได้'
                      : NO_EDIT_RIGHT_TOOLTIP}
                  >
                    <BrandButton variant='fill' size='sm' leadingIcon='reply' onClick={() => setReplyOpen(true)}>
                      ตอบกลับการปรึกษา
                    </BrandButton>
                  </GuardedAction>
                  <GuardedAction allowed={canEdit && !!draft.id && draft.status !== 'cancelled'}>
                    <BrandSubdueButton variant='outline' size='sm' leadingIcon='print' onClick={() => setPrintTarget(draft)}>
                      พิมพ์ใบส่งปรึกษา
                    </BrandSubdueButton>
                  </GuardedAction>
                  <GuardedAction allowed={canEdit && draft.status !== 'cancelled'}>
                    <NeutralSubdueButton variant='outline' size='sm' leadingIcon='block' onClick={() => setCancelTarget(draft)}>
                      ยกเลิกคำขอ
                    </NeutralSubdueButton>
                  </GuardedAction>
                </>
              }
            >
              {draft.cancelledAt ? (
                <CancelledMark at={draft.cancelledAt} reason={draft.cancelReason} label='คำขอปรึกษาถูกยกเลิก' />
              ) : null}
              {requesterLocked ? (
                <PanelAlert tone='info' icon='lock' title='คำขอถูกรับเรื่องแล้ว — แก้ไขไม่ได้'>
                  แพทย์ปลายทางรับเรื่องไปแล้ว หากข้อมูลผิดต้องยกเลิกใบนี้พร้อมเหตุผลแล้วออกใบใหม่
                </PanelAlert>
              ) : null}
              {!isRecipient && ['sent', 'accepted'].includes(draft.status) ? (
                <PanelAlert tone='info' icon='visibility' title='คุณไม่ใช่แพทย์ผู้รับปรึกษาของใบนี้'>
                  เปิดอ่านรายละเอียดได้ แต่ปุ่ม "รับเรื่อง" และ "ตอบกลับการปรึกษา" ถูกปิดไว้
                </PanelAlert>
              ) : null}
              {missingConsultFields(draft).length ? (
                <PanelAlert tone='warning' icon='error' title='ข้อมูลไม่สมบูรณ์'>
                  ยังขาด: {missingConsultFields(draft).join(' · ')}
                </PanelAlert>
              ) : null}

              <div className='flex flex-wrap w-full' style={{ gap: 'var(--dim-space-400, 16px)' }}>
                <InfoPair label='HN' value={draft.hn} minWidth={120} />
                <InfoPair label='เลขประจำตัวประชาชน' value={draft.cid} minWidth={200} />
                <InfoPair
                  label='ชื่อ - นามสกุล'
                  value={<MaskedValue masked={isMasked(draft)} onReveal={() => reveal(draft)}>
                    <span>{draft.name}</span>
                  </MaskedValue>}
                  minWidth={240}
                />
                <InfoPair label='สิทธิการรักษา' value={draft.rights} minWidth={180} />
                <InfoPair label='คลินิกที่ส่งไป' value={clinicMeta(draft.toClinic)?.label} minWidth={240} />
                <InfoPair label='แพทย์ที่ปรึกษา' value={doctorMeta(draft.toDoctor)?.name} minWidth={220} />
                <InfoPair label='ประเภทการปรึกษา' value={consultTypeMeta(draft.consultType).label} minWidth={240} />
                <InfoPair label='ความเร่งด่วน' value={consultUrgencyMeta(draft.urgency).label} minWidth={150} />
              </div>
            </PanelCard>

            <PanelCard title='รายละเอียดการปรึกษา'>
              <SuggestibleTextarea
                voice
                label='ผลการวินิจฉัยเบื้องต้น'
                value={draft.provisionalDx || ''}
                onChange={(e) => setDraft((d) => ({ ...d, provisionalDx: typeof e === 'string' ? e : e?.target?.value ?? '' }))}
                suggestions={CONSULT_QUESTION_SUGGESTIONS}
                minChars={2}
                height={120}
                minHeight={88}
                disabled={!canEdit || rowLocked || requesterLocked}
                popoverAriaLabel='ตัวอย่างผลการวินิจฉัยเบื้องต้น'
                placeholder='ผลการวินิจฉัยของแพทย์ผู้ขอปรึกษา'
              />
              <SuggestibleTextarea
                voice
                required
                label='ประเด็นที่ต้องการปรึกษา'
                value={draft.question || ''}
                onChange={(e) => setDraft((d) => ({ ...d, question: typeof e === 'string' ? e : e?.target?.value ?? '' }))}
                suggestions={CONSULT_QUESTION_SUGGESTIONS}
                minChars={2}
                height={140}
                minHeight={100}
                disabled={!canEdit || rowLocked || requesterLocked}
                popoverAriaLabel='ตัวอย่างประเด็นที่ต้องการปรึกษา'
                placeholder='คำถามทางคลินิกที่ต้องการความเห็น'
              />
              <InfoPair label='ข้อมูลประกอบ' value={draft.context} minWidth={320} />
              <InfoPair label='สิ่งที่ต้องการให้ดำเนินการ' value={draft.request} minWidth={320} />
            </PanelCard>

            {draft.status === 'replied' ? (
              <PanelCard
                title='ความเห็นและคำแนะนำของแพทย์ผู้รับปรึกษา'
                subtitle={`${draft.repliedBy || '—'} · ${draft.repliedAt || '—'}`}
              >
                <InfoPair label='ความเห็น' value={draft.replyBody} minWidth={320} />
                <InfoPair label='คำแนะนำ' value={draft.replyAdvice} minWidth={320} />
                <InfoPair
                  label='ไฟล์แนบ'
                  value={(draft.replyAttachments || []).join(' · ') || 'ไม่มีไฟล์แนบ'}
                  minWidth={320}
                />
              </PanelCard>
            ) : null}

            <PanelCard
              title='ตัวอย่างใบส่งปรึกษาสำหรับพิมพ์'
              subtitle='พิมพ์ผ่าน @media print ขนาด A4 — ยังไม่มี PDF engine ในเวฟนี้'
            >
              <ConsultPrintSheet row={draft} />
            </PanelCard>
          </>
        )}
      </div>

      {/* ตอบกลับการปรึกษา */}
      <AlertDialog
        open={replyOpen}
        type='info'
        title={`ตอบกลับการปรึกษา ${draft?.consultNo || ''}`}
        description='ความเห็นและคำแนะนำจะถูกบันทึกในเวชระเบียนของผู้รับบริการและแสดงให้แพทย์ผู้ขอปรึกษาเห็นทันที'
        confirmLabel='ส่งความเห็น'
        cancelLabel='ยกเลิก'
        onConfirm={doReply}
        onCancel={() => setReplyOpen(false)}
        onClose={() => setReplyOpen(false)}
      >
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
          <SuggestibleTextarea
            voice
            required
            label='ความเห็นของแพทย์ผู้รับปรึกษา'
            value={replyBody}
            onChange={(e) => setReplyBody(typeof e === 'string' ? e : e?.target?.value ?? '')}
            suggestions={CONSULT_REPLY_SUGGESTIONS}
            minChars={2}
            height={140}
            minHeight={100}
            popoverAriaLabel='ตัวอย่างความเห็น'
            placeholder='สรุปการประเมินและความเห็นทางคลินิก'
          />
          <SuggestibleTextarea
            voice
            label='คำแนะนำสำหรับแพทย์ผู้ขอปรึกษา'
            value={replyAdvice}
            onChange={(e) => setReplyAdvice(typeof e === 'string' ? e : e?.target?.value ?? '')}
            suggestions={CONSULT_REPLY_SUGGESTIONS}
            minChars={2}
            height={130}
            minHeight={96}
            popoverAriaLabel='ตัวอย่างคำแนะนำ'
            placeholder='แผนการรักษาที่แนะนำ การตรวจเพิ่มเติม และการติดตาม'
          />
          <InputField
            label='ชื่อไฟล์แนบ (ถ้ามี)'
            value={replyAttachment}
            onChange={setReplyAttachment}
            showLeadingIcon={false}
            placeholder='เช่น แนวทางการปรับยาความดัน.pdf'
            helperText='ระบบต้นแบบยังไม่มีที่เก็บไฟล์จริง — บันทึกเป็นชื่อเอกสารอ้างอิงไว้ก่อน'
          />
          {replyBody.trim().length > 0 && replyBody.trim().length < 10 ? (
            <span style={{ ...PANEL_LABEL_STYLE, color: 'var(--text-alert-error, #B91C1C)' }}>
              ความเห็นต้องยาวอย่างน้อย 10 ตัวอักษรจึงจะมีความหมายทางคลินิก
            </span>
          ) : null}
        </div>
      </AlertDialog>

      {/* ยกเลิกคำขอ */}
      <ReasonDialog
        open={!!cancelTarget}
        type='destructive'
        title='ยกเลิกคำขอปรึกษา'
        description='ระบบจะขีดฆ่าคำขอนี้ไว้ในทะเบียนพร้อมเหตุผล ไม่ลบออกจากระบบ'
        confirmLabel='ยืนยันการยกเลิก'
        suggestions={CONSULT_CANCEL_SUGGESTIONS}
        onConfirm={doCancel}
        onClose={() => setCancelTarget(null)}
      />

      {/* กันการส่งเมื่อข้อมูลไม่ครบ */}
      <AlertDialog
        open={!!sendGuard}
        type='warning'
        title='ยังส่งความเห็นไม่ได้'
        description={`ข้อมูลที่จำเป็นยังไม่ครบ: ${(sendGuard || []).join(' · ')}`}
        confirmLabel='กลับไปกรอกต่อ'
        showCancel={false}
        onConfirm={() => setSendGuard(null)}
        onClose={() => setSendGuard(null)}
      />

      {/* ยืนยันก่อนพิมพ์ */}
      <AlertDialog
        open={!!printTarget}
        type='info'
        title='พิมพ์ใบส่งปรึกษา'
        description={`ระบบจะนับจำนวนครั้งที่พิมพ์และบันทึกลงประวัติการแก้ไข (พิมพ์ไปแล้ว ${printTarget?.printCount || 0} ครั้ง)`}
        confirmLabel='พิมพ์'
        cancelLabel='ยกเลิก'
        onConfirm={doPrint}
        onCancel={() => setPrintTarget(null)}
        onClose={() => setPrintTarget(null)}
      />

      {/* กันออกจากฟอร์มโดยยังไม่บันทึก */}
      <UnsavedChangesPopup
        open={leaveGuard}
        onClose={() => setLeaveGuard(false)}
        onSave={() => { doSave(); setLeaveGuard(false); setMode('list'); setDraft(null); setBaseline(null); }}
        onDiscard={() => { setLeaveGuard(false); setMode('list'); setDraft(null); setBaseline(null); }}
        title='ยังไม่ได้บันทึกคำขอปรึกษาฉบับนี้'
        description='กด "บันทึก" เพื่อเก็บการแก้ไข หรือ "ไม่บันทึก" เพื่อคืนค่าเดิมทั้งหมดและกลับไปหน้าทะเบียน'
      />
    </QueuePageShell>
  );
};

export default ConsultRegisterPage;
