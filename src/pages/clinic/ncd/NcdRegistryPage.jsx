import React, { useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import Icon from '@/components/icons/Icon';
import Popup from '@/components/popup/Popup';
import Textarea from '@/components/forms/Textarea';
import InputField from '@/components/forms/InputField';
import Select from '@/components/forms/Select';
import DatePicker from '@/components/forms/DatePicker';
import SelectableTag from '@/components/forms/SelectableTag';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import Badge from '@/components/badge/Badge';
import SearchResultCount from '@/components/search/SearchResultCount';
import { getPatientByHN } from '@/data/patientProfiles';
import {
  NCD_DISEASE_GROUPS,
  resolveNcdGroup,
  NCD_SEVERITY_OPTIONS,
  resolveNcdSeverity,
  NCD_DOCTOR_OPTIONS,
  NCD_CURRENT_USER,
  formatNcdDate,
  formatNcdDateTime,
  getNcdRegistryRows,
  addNcdRegistration,
  updateNcdRegistration,
  cancelNcdRegistration,
  reactivateNcdRegistration,
  getNcdCancellation,
  canEditNcd,
} from '@/data/ncdVisits';

/* NcdRegistryPage — ทะเบียนผู้รับบริการโรคเฉพาะ (TOR 1.10.2.6) at
   /clinic/ncd/registry. List page on the PharmacyRegistryPage hero +
   filter-bar + row-card pattern (playbook §3 "ทะเบียนเฉพาะโรค"), with the
   full แสดง / บันทึก / แก้ไข / ยกเลิก TOR quartet:

     • แสดง   — row click opens a read-only detail popup incl. the audit
                trail (ผู้บันทึก + เวลา + ประวัติแก้ไข + ผู้ยกเลิก)
     • บันทึก — "ขึ้นทะเบียนใหม่" popup (กลุ่มโรค · วันวินิจฉัย · ICD-10 ·
                ความรุนแรง · แพทย์ผู้ดูแล), audit-stamped on save
     • แก้ไข — same popup pre-filled; closing with unsaved changes runs a
                dirty-check confirm; every save appends to editHistory
     • ยกเลิก — reason-required popup (validation blocks empty เหตุผล) +
                เปิดใช้งานอีกครั้ง reactivate (ANC cancel pattern)

   All writes go through the sessionStorage helpers in ncdVisits.js and
   re-render via the `tick` bump (AncQueuePage contract). When the on-duty
   user's role is view-only (canEditNcd() === false) the page renders
   read-only: action buttons hidden + "สิทธิ์ของคุณดูได้อย่างเดียว" banner. */

const breadcrumb = ['ระบบบันทึกการรักษา', 'งานกลุ่มโรคเฉพาะ NCD'];

/* The registry's filter-bar search is a wrapper-owned-border control: the
   surrounding div draws the border/background, so the native <input> inside
   must be completely chrome-free. Tailwind's `border-none outline-none` is
   NOT enough — Webkit still paints thin vertical edges at the input bounds
   and its own focus ring (CLAUDE.md "No browser-default input chrome").
   Idempotent module-load injection so HMR never leaves a stale <style>. */
if (typeof document !== 'undefined') {
  const styleId = 'mih-ncd-registry-search-style';
  const css = `
.mih-ncd-registry-search-input,
.mih-ncd-registry-search-input:focus,
.mih-ncd-registry-search-input:focus-visible {
  border: 0 !important;
  outline: none !important;
  box-shadow: none !important;
  background: transparent !important;
  -webkit-appearance: none !important;
  appearance: none !important;
}
.mih-ncd-registry-search-input::placeholder {
  color: var(--text-primarysearch-default, #ADB2B7);
  opacity: 1;
}
`;
  let el = document.getElementById(styleId);
  if (!el) {
    el = document.createElement('style');
    el.id = styleId;
    document.head.appendChild(el);
  }
  if (el.textContent !== css) el.textContent = css;
}

const EMPTY_DRAFT = {
  hn: '',
  name: '',
  diseaseGroups: [],
  diagnosisDate: '',
  icd10: '',
  severity: '',
  doctor: '',
};

const ICD10_OPTIONS = NCD_DISEASE_GROUPS.map((g) => ({ value: g.icd10, label: g.icd10Label }));

const SEVERITY_BADGE = { controlled: 'green', uncontrolled: 'yellow', complication: 'red' };

const FieldLabel = ({ children, required }) => (
  <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-default)' }}>
    {children}
    {required && <span style={{ color: 'var(--text-input-require)' }}> *</span>}
  </span>
);

const AuditLine = ({ icon, children }) => (
  <span
    className='inline-flex items-center'
    style={{ gap: 'var(--dim-space-100)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}
  >
    <Icon name={icon} size={14} />
    {children}
  </span>
);

/* Registration audit trail — ผู้บันทึก / ประวัติแก้ไข / การยกเลิก in one
   panel (TOR 1.10.2.6 audit requirement). Rendered inside the detail popup. */
const RegistryAuditPanel = ({ row, cancellation }) => (
  <div
    className='flex flex-col w-full'
    style={{
      gap: 'var(--dim-space-200)',
      paddingTop: 'var(--dim-space-300)',
      paddingBottom: 'var(--dim-space-300)',
      paddingLeft: 'var(--dim-space-400)',
      paddingRight: 'var(--dim-space-400)',
      borderRadius: 'var(--dim-radius-200)',
      background: 'var(--surface-neutral-quaternary)',
      border: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary)',
    }}
  >
    <span style={{ fontSize: 'var(--type-size-sm)', fontWeight: 'var(--type-weight-bold)', color: 'var(--text-content-default)' }}>
      ประวัติการบันทึก (Audit Trail)
    </span>
    <AuditLine icon='history'>
      ขึ้นทะเบียนโดย {row.registeredBy} · {formatNcdDateTime(row.registeredAt)}
    </AuditLine>
    {(row.editHistory || []).map((e, i) => (
      <AuditLine key={`${e.at}-${i}`} icon='edit'>
        แก้ไขโดย {e.by} · {formatNcdDateTime(e.at)} — {e.changes}
      </AuditLine>
    ))}
    {(row.editHistory || []).length === 0 && (
      <AuditLine icon='edit'>ยังไม่มีประวัติการแก้ไข</AuditLine>
    )}
    {cancellation && (
      <span
        className='inline-flex items-center'
        style={{ gap: 'var(--dim-space-100)', fontSize: 'var(--type-size-xs)', color: 'var(--text-danger-default, #C72121)' }}
      >
        <Icon name='block' size={14} />
        ยกเลิกทะเบียนโดย {cancellation.cancelledBy} · {formatNcdDateTime(cancellation.cancelledAt)} — เหตุผล: {cancellation.reason}
      </span>
    )}
  </div>
);

const RegistryRow = ({ row, cancellation, canEdit, onView, onEdit, onCancel, onReactivate, onFollowUp }) => (
  <div
    role='button'
    tabIndex={0}
    onClick={onView}
    onKeyDown={(e) => { if (e.key === 'Enter') onView(); }}
    className='flex items-center w-full cursor-pointer transition-shadow hover:shadow-cardHover flex-wrap'
    style={{
      gap: 'var(--dim-space-400)',
      padding: 'var(--dim-space-400)',
      borderRadius: 'var(--dim-radius-400)',
      background: 'var(--surface-card-100)',
      border: 'var(--dim-stroke-100) solid var(--border-card-default)',
      opacity: cancellation ? 0.75 : 1,
    }}
  >
    <div className='flex-1 min-w-0 flex flex-col' style={{ gap: 'var(--dim-space-100)' }}>
      <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
        <span className='text-sm font-bold text-ink truncate'>{row.name}</span>
        <span className='text-xs text-ink-tertiary'>HN {row.hn}</span>
        {(row.diseaseGroups || []).map((key) => {
          const g = resolveNcdGroup(key);
          return g ? <ColorfulBadge key={key} style={g.badge} size='small' hierarchy='secondary'>{g.short}</ColorfulBadge> : null;
        })}
        {cancellation && <ColorfulBadge style='red' size='small' hierarchy='secondary'>ยกเลิกทะเบียนแล้ว</ColorfulBadge>}
      </div>
      <span className='text-xs text-ink-tertiary truncate'>
        วินิจฉัย {formatNcdDate(row.diagnosisDate)} · {row.icd10} · แพทย์ผู้ดูแล {row.doctor}
      </span>
      <AuditLine icon='history'>
        ขึ้นทะเบียนโดย {row.registeredBy} · {formatNcdDateTime(row.registeredAt)}
        {(row.editHistory || []).length > 0 && ` · แก้ไข ${(row.editHistory || []).length} ครั้ง`}
      </AuditLine>
    </div>

    <div className='hidden md:flex flex-col shrink-0' style={{ gap: 'var(--dim-space-100)', minWidth: 140 }}>
      <span className='text-xs text-ink-tertiary'>ระยะ/ความรุนแรง</span>
      {row.severity ? (
        <ColorfulBadge style={SEVERITY_BADGE[row.severity] || 'grey'} size='small' hierarchy='secondary'>
          {resolveNcdSeverity(row.severity)?.label || row.severity}
        </ColorfulBadge>
      ) : <span className='text-xs text-ink-tertiary'>—</span>}
    </div>

    <div className='shrink-0 inline-flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
      <NeutralSubdueButton
        size='sm'
        leadingIcon='monitoring'
        onClick={(e) => { e.stopPropagation(); onFollowUp(); }}
      >
        การติดตาม
      </NeutralSubdueButton>
      {canEdit && !cancellation && (
        <>
          <BrandSubdueButton
            variant='outline'
            size='sm'
            leadingIcon='edit'
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
          >
            แก้ไข
          </BrandSubdueButton>
          <NeutralSubdueButton
            size='sm'
            leadingIcon='block'
            onClick={(e) => { e.stopPropagation(); onCancel(); }}
          >
            ยกเลิก
          </NeutralSubdueButton>
        </>
      )}
      {canEdit && cancellation && (
        <BrandSubdueButton
          variant='outline'
          size='sm'
          leadingIcon='restart_alt'
          onClick={(e) => { e.stopPropagation(); onReactivate(); }}
        >
          เปิดใช้งานอีกครั้ง
        </BrandSubdueButton>
      )}
    </div>
  </div>
);

const NcdRegistryPage = () => {
  const history = useHistory();
  const canEdit = canEditNcd();

  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [doctorFilter, setDoctorFilter] = useState('all');
  const [tick, setTick] = useState(0);

  /* Popup state — one slot per TOR action. `formMode` null | 'create' |
     'edit'; `draft` mirrors EMPTY_DRAFT; `baseline` powers the dirty-check
     confirm on close (spec edge case "cancel-edit discards with confirm"). */
  const [viewTarget, setViewTarget] = useState(null);
  const [formMode, setFormMode] = useState(null);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [baseline, setBaseline] = useState(EMPTY_DRAFT);
  const [formError, setFormError] = useState('');
  const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState('');

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const rows = useMemo(() => getNcdRegistryRows(), [tick]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      const cancellation = getNcdCancellation(r.hn);
      if (groupFilter !== 'all' && !(r.diseaseGroups || []).includes(groupFilter)) return false;
      if (statusFilter === 'active' && cancellation) return false;
      if (statusFilter === 'cancelled' && !cancellation) return false;
      if (doctorFilter !== 'all' && r.doctor !== doctorFilter) return false;
      if (!q) return true;
      return [r.hn, r.name, r.icd10, r.doctor].some((f) => f && f.toLowerCase().includes(q));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, search, groupFilter, statusFilter, doctorFilter, tick]);

  const activeRows = rows.filter((r) => !getNcdCancellation(r.hn));
  const summaryCards = useMemo(() => ([
    { key: 'total',     label: 'ทะเบียนทั้งหมด',        value: activeRows.length, color: 'info',        icon: 'contract' },
    { key: 'dm',        label: 'เบาหวาน (DM)',          value: activeRows.filter((r) => r.diseaseGroups.includes('dm')).length, color: 'brand', icon: 'water_drop' },
    { key: 'ht',        label: 'ความดันโลหิตสูง (HT)',   value: activeRows.filter((r) => r.diseaseGroups.includes('ht')).length, color: 'inprogress', icon: 'monitor_heart' },
    { key: 'resp',      label: 'หอบหืด / ถุงลมโป่งพอง', value: activeRows.filter((r) => r.diseaseGroups.includes('asthma') || r.diseaseGroups.includes('copd')).length, color: 'positive', icon: 'pulmonology' },
    { key: 'cancelled', label: 'ยกเลิกทะเบียน',          value: rows.length - activeRows.length, color: 'destructive', icon: 'block' },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ]), [rows, tick]);

  const groupOptions = [{ value: 'all', label: 'ทุกกลุ่มโรค' }, ...NCD_DISEASE_GROUPS.map((g) => ({ value: g.key, label: g.label }))];
  const statusOptions = [
    { value: 'all', label: 'ทุกสถานะ' },
    { value: 'active', label: 'ใช้งาน' },
    { value: 'cancelled', label: 'ยกเลิกแล้ว' },
  ];
  const doctorOptions = [{ value: 'all', label: 'ทุกคน' }, ...NCD_DOCTOR_OPTIONS.map((d) => ({ value: d, label: d }))];

  const filtersActive = search.trim() !== '' || groupFilter !== 'all' || statusFilter !== 'all' || doctorFilter !== 'all';

  /* ── บันทึก / แก้ไข ────────────────────────────────────────────── */

  const openCreate = () => {
    setDraft(EMPTY_DRAFT);
    setBaseline(EMPTY_DRAFT);
    setFormError('');
    setFormMode('create');
  };

  const openEdit = (row) => {
    const seed = {
      hn: row.hn,
      name: row.name,
      diseaseGroups: [...(row.diseaseGroups || [])],
      diagnosisDate: row.diagnosisDate || '',
      icd10: row.icd10 || '',
      severity: row.severity || '',
      doctor: row.doctor || '',
    };
    setDraft(seed);
    setBaseline(seed);
    setFormError('');
    setFormMode('edit');
  };

  const isDirty = JSON.stringify(draft) !== JSON.stringify(baseline);

  const requestCloseForm = () => {
    if (isDirty) setDiscardConfirmOpen(true);
    else setFormMode(null);
  };

  const discardForm = () => {
    setDiscardConfirmOpen(false);
    setFormMode(null);
  };

  const toggleDraftGroup = (key) => setDraft((d) => ({
    ...d,
    diseaseGroups: d.diseaseGroups.includes(key)
      ? d.diseaseGroups.filter((g) => g !== key)
      : [...d.diseaseGroups, key],
  }));

  const saveForm = () => {
    if (!draft.hn.trim() || !draft.name.trim()) {
      setFormError('ระบุ HN และชื่อ-สกุลผู้รับบริการ');
      return;
    }
    if (draft.diseaseGroups.length === 0) {
      setFormError('เลือกกลุ่มโรคอย่างน้อย 1 กลุ่ม');
      return;
    }
    if (!draft.diagnosisDate) {
      setFormError('ระบุวันที่วินิจฉัย');
      return;
    }
    if (!draft.doctor) {
      setFormError('เลือกแพทย์ผู้ดูแล');
      return;
    }
    if (formMode === 'create') {
      if (rows.some((r) => r.hn === draft.hn.trim())) {
        setFormError(`HN ${draft.hn.trim()} มีทะเบียนอยู่แล้ว — ใช้ "แก้ไข" แทนการขึ้นทะเบียนซ้ำ`);
        return;
      }
      addNcdRegistration({ ...draft, hn: draft.hn.trim(), name: draft.name.trim() });
    } else {
      /* Field-level diff label so the audit panel can show ค่าที่เปลี่ยน. */
      const changed = [];
      if (JSON.stringify(draft.diseaseGroups) !== JSON.stringify(baseline.diseaseGroups)) {
        changed.push(`กลุ่มโรค → ${draft.diseaseGroups.map((k) => resolveNcdGroup(k)?.short || k).join('+')}`);
      }
      if (draft.diagnosisDate !== baseline.diagnosisDate) changed.push(`วันวินิจฉัย → ${formatNcdDate(draft.diagnosisDate)}`);
      if (draft.icd10 !== baseline.icd10) changed.push(`ICD-10 → ${draft.icd10}`);
      if (draft.severity !== baseline.severity) changed.push(`ความรุนแรง → ${resolveNcdSeverity(draft.severity)?.label || draft.severity}`);
      if (draft.doctor !== baseline.doctor) changed.push(`แพทย์ → ${draft.doctor}`);
      updateNcdRegistration(draft.hn, {
        diseaseGroups: draft.diseaseGroups,
        diagnosisDate: draft.diagnosisDate,
        icd10: draft.icd10,
        severity: draft.severity,
        doctor: draft.doctor,
      }, changed.join(' · ') || 'แก้ไขข้อมูลทะเบียน');
    }
    setFormMode(null);
    setTick((t) => t + 1);
  };

  /* ── ยกเลิก / เปิดใช้งานอีกครั้ง ─────────────────────────────────── */

  const openCancel = (row) => {
    setCancelReason('');
    setCancelError('');
    setCancelTarget(row);
  };

  const confirmCancel = () => {
    if (!cancelReason.trim()) {
      setCancelError('ต้องระบุเหตุผลการยกเลิกก่อนยืนยัน');
      return;
    }
    cancelNcdRegistration(cancelTarget.hn, cancelReason.trim());
    setCancelTarget(null);
    setTick((t) => t + 1);
  };

  const reactivate = (row) => {
    reactivateNcdRegistration(row.hn);
    setTick((t) => t + 1);
  };

  const viewCancellation = viewTarget ? getNcdCancellation(viewTarget.hn) : null;
  const viewProfile = viewTarget ? getPatientByHN(viewTarget.hn) : null;

  return (
    <QueuePageShell
      activeKey='treat'
      breadcrumb={breadcrumb}
      title='ทะเบียนผู้รับบริการโรคเฉพาะ (NCD)'
      onBack={() => history.push('/clinic/ncd')}
      actions={canEdit ? (
        <BrandSubdueButton variant='fill' leadingIcon='person_add' onClick={openCreate}>
          ขึ้นทะเบียนใหม่
        </BrandSubdueButton>
      ) : undefined}
      summaryCards={summaryCards}
    >
      {/* แสดง — registration detail + audit trail */}
      <Popup
        open={!!viewTarget}
        onClose={() => setViewTarget(null)}
        size='large'
        title='รายละเอียดทะเบียนโรคเฉพาะ'
        subtitle={viewTarget ? `${viewTarget.name} · HN: ${viewTarget.hn}` : ''}
        tertiaryAction={{ label: 'ปิด', onClick: () => setViewTarget(null) }}
        secondaryAction={{ label: 'พิมพ์ทะเบียน', onClick: () => window.print() }}
        primaryAction={canEdit && viewTarget && !viewCancellation
          ? { label: 'แก้ไขทะเบียน', onClick: () => { const t = viewTarget; setViewTarget(null); openEdit(t); } }
          : undefined}
      >
        {viewTarget && (
          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
            <div className='grid grid-cols-2 gap-x-6 gap-y-2' style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-default)' }}>
              <span>HN: {viewTarget.hn}</span>
              <span>ชื่อ-สกุล: {viewProfile?.fullName || viewTarget.name}</span>
              <span>เพศ: {viewProfile?.sex || '—'}</span>
              <span>อายุ: {viewProfile?.age || '—'}</span>
              <span>เลขบัตรประชาชน: {viewProfile?.nationalId || '—'}</span>
              <span>สิทธิการรักษา: {viewProfile?.insurance || '—'}</span>
              <span>วันที่วินิจฉัย: {formatNcdDate(viewTarget.diagnosisDate)}</span>
              <span>ICD-10: {viewTarget.icd10 || '—'}</span>
              <span>
                ระยะ/ความรุนแรง: {resolveNcdSeverity(viewTarget.severity)?.label || '—'}
              </span>
              <span>แพทย์ผู้ดูแล: {viewTarget.doctor}</span>
            </div>
            <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
              {(viewTarget.diseaseGroups || []).map((key) => {
                const g = resolveNcdGroup(key);
                return g ? <ColorfulBadge key={key} style={g.badge} size='small' hierarchy='secondary'>{g.label}</ColorfulBadge> : null;
              })}
              {viewCancellation && <ColorfulBadge style='red' size='small' hierarchy='secondary'>ยกเลิกทะเบียนแล้ว</ColorfulBadge>}
            </div>
            <RegistryAuditPanel row={viewTarget} cancellation={viewCancellation} />
          </div>
        )}
      </Popup>

      {/* บันทึก / แก้ไข — shared form popup */}
      <Popup
        open={!!formMode}
        onClose={requestCloseForm}
        size='large'
        title={formMode === 'edit' ? 'แก้ไขทะเบียนโรคเฉพาะ' : 'ขึ้นทะเบียนผู้รับบริการโรคเฉพาะ'}
        subtitle={formMode === 'edit' ? `${draft.name} · HN: ${draft.hn}` : 'TOR 1.10.2.6 — บันทึกทะเบียนใหม่'}
        tertiaryAction={{ label: 'ยกเลิก', onClick: requestCloseForm }}
        primaryAction={{ label: formMode === 'edit' ? 'บันทึกการแก้ไข' : 'บันทึกทะเบียน', onClick: saveForm }}
      >
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
          {formMode === 'create' && (
            <div className='flex items-start w-full flex-wrap' style={{ gap: 'var(--dim-space-400)' }}>
              <div className='flex-1 min-w-0 flex flex-col' style={{ gap: 'var(--dim-space-100)' }}>
                <FieldLabel required>HN</FieldLabel>
                <InputField value={draft.hn} onChange={(v) => setDraft((d) => ({ ...d, hn: v }))} placeholder='เช่น 67-00031' />
              </div>
              <div className='flex-1 min-w-0 flex flex-col' style={{ gap: 'var(--dim-space-100)' }}>
                <FieldLabel required>ชื่อ-สกุล</FieldLabel>
                <InputField value={draft.name} onChange={(v) => setDraft((d) => ({ ...d, name: v }))} placeholder='ชื่อ-สกุลผู้รับบริการ' />
              </div>
            </div>
          )}

          <div className='flex flex-col' style={{ gap: 'var(--dim-space-100)' }}>
            <FieldLabel required>กลุ่มโรค (เลือกได้มากกว่า 1)</FieldLabel>
            <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
              {NCD_DISEASE_GROUPS.map((g) => (
                <SelectableTag
                  key={g.key}
                  label={`${g.label} (${g.short})`}
                  size='lg'
                  selected={draft.diseaseGroups.includes(g.key)}
                  onClick={() => toggleDraftGroup(g.key)}
                />
              ))}
            </div>
          </div>

          <div className='flex items-start w-full flex-wrap' style={{ gap: 'var(--dim-space-400)' }}>
            <div className='flex-1 min-w-0 flex flex-col' style={{ gap: 'var(--dim-space-100)' }}>
              <FieldLabel required>วันที่วินิจฉัย</FieldLabel>
              <DatePicker
                value={draft.diagnosisDate ? new Date(draft.diagnosisDate) : null}
                onChange={(d) => setDraft((prev) => ({ ...prev, diagnosisDate: d ? d.toISOString().slice(0, 10) : '' }))}
                placeholder='เลือกวันที่'
                showLabel={false}
              />
            </div>
            <div className='flex-1 min-w-0 flex flex-col' style={{ gap: 'var(--dim-space-100)' }}>
              <FieldLabel>รหัส ICD-10</FieldLabel>
              <Select
                showLabel={false}
                searchable={false}
                size='lg'
                value={draft.icd10}
                onChange={(v) => setDraft((d) => ({ ...d, icd10: v }))}
                options={ICD10_OPTIONS}
                placeholder='เลือกรหัส ICD-10'
              />
            </div>
          </div>

          <div className='flex items-start w-full flex-wrap' style={{ gap: 'var(--dim-space-400)' }}>
            <div className='flex-1 min-w-0 flex flex-col' style={{ gap: 'var(--dim-space-100)' }}>
              <FieldLabel>ระยะ / ความรุนแรง</FieldLabel>
              <Select
                showLabel={false}
                searchable={false}
                size='lg'
                value={draft.severity}
                onChange={(v) => setDraft((d) => ({ ...d, severity: v }))}
                options={NCD_SEVERITY_OPTIONS}
                placeholder='เลือกระยะ/ความรุนแรง'
              />
            </div>
            <div className='flex-1 min-w-0 flex flex-col' style={{ gap: 'var(--dim-space-100)' }}>
              <FieldLabel required>แพทย์ผู้ดูแล</FieldLabel>
              <Select
                showLabel={false}
                searchable={false}
                size='lg'
                value={draft.doctor}
                onChange={(v) => setDraft((d) => ({ ...d, doctor: v }))}
                options={NCD_DOCTOR_OPTIONS.map((d) => ({ value: d, label: d }))}
                placeholder='เลือกแพทย์ผู้ดูแล'
              />
            </div>
          </div>

          {formError && (
            <div
              className='flex items-center'
              style={{
                gap: 'var(--dim-space-200)',
                paddingTop: 'var(--dim-space-200)',
                paddingBottom: 'var(--dim-space-200)',
                paddingLeft: 'var(--dim-space-300)',
                paddingRight: 'var(--dim-space-300)',
                borderRadius: 'var(--dim-radius-200)',
                background: 'var(--surface-danger-quaternary, #FFF0F0)',
                color: 'var(--text-danger-default, #C72121)',
                fontSize: 'var(--type-size-sm)',
              }}
            >
              <Icon name='error' size={16} />
              {formError}
            </div>
          )}
        </div>
      </Popup>

      {/* Dirty-check confirm — closing the edit popup discards unsaved changes */}
      <Popup
        open={discardConfirmOpen}
        onClose={() => setDiscardConfirmOpen(false)}
        title='ยกเลิกการแก้ไข?'
        subtitle='ข้อมูลที่แก้ไขไว้ยังไม่ได้บันทึก หากปิดหน้าต่างนี้ข้อมูลจะหายไป'
        tertiaryAction={{ label: 'แก้ไขต่อ', onClick: () => setDiscardConfirmOpen(false) }}
        primaryAction={{ label: 'ทิ้งการแก้ไข', onClick: discardForm, tone: 'danger' }}
      />

      {/* ยกเลิก — reason required */}
      <Popup
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        title='ยกเลิกทะเบียนโรคเฉพาะ'
        subtitle={cancelTarget ? `${cancelTarget.name} · HN: ${cancelTarget.hn}` : ''}
        tertiaryAction={{ label: 'ปิด', onClick: () => setCancelTarget(null) }}
        primaryAction={{ label: 'ยืนยันยกเลิกทะเบียน', onClick: confirmCancel, tone: 'danger' }}
      >
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200)' }}>
          <Textarea
            label='เหตุผลการยกเลิก'
            required
            value={cancelReason}
            onChange={(v) => { setCancelReason(v); if (cancelError) setCancelError(''); }}
            placeholder='เช่น ย้ายไปรับการรักษาที่สถานพยาบาลอื่น / วินิจฉัยใหม่ไม่เข้าเกณฑ์กลุ่มโรคเฉพาะ'
          />
          {cancelError && (
            <span className='inline-flex items-center' style={{ gap: 'var(--dim-space-100)', color: 'var(--text-danger-default, #C72121)', fontSize: 'var(--type-size-sm)' }}>
              <Icon name='error' size={14} />
              {cancelError}
            </span>
          )}
        </div>
      </Popup>

      <div className='flex flex-col flex-1 min-w-0' style={{ padding: 'var(--dim-space-600)', gap: 'var(--dim-space-600)' }}>
        <section
          className='w-full flex flex-col'
          style={{
            background: 'var(--surface-card-100)',
            borderRadius: 'var(--dim-radius-500)',
            border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
            boxShadow: 'var(--shadow-card-strong)',
            padding: 'var(--dim-space-600)',
            gap: 'var(--dim-space-400)',
          }}
        >
          {!canEdit && (
            <div
              className='flex items-center'
              style={{
                gap: 'var(--dim-space-200)',
                paddingTop: 'var(--dim-space-300)',
                paddingBottom: 'var(--dim-space-300)',
                paddingLeft: 'var(--dim-space-400)',
                paddingRight: 'var(--dim-space-400)',
                borderRadius: 'var(--dim-radius-200)',
                background: 'var(--surface-alert-warning, #FFF9F0)',
                color: 'var(--text-warning-default, #C2410C)',
                fontSize: 'var(--type-size-sm)',
              }}
            >
              <Icon name='visibility' size={18} />
              สิทธิ์ของคุณดูได้อย่างเดียว — ไม่สามารถขึ้นทะเบียน แก้ไข หรือยกเลิกได้
            </div>
          )}

          <div className='flex flex-wrap items-center w-full' style={{ gap: 'var(--dim-space-300)' }}>
            <div
              className='flex items-center flex-1'
              style={{
                minWidth: 218,
                gap: 'var(--dim-space-200)',
                height: 'var(--dim-size-800, 40px)',
                paddingLeft: 'var(--dim-space-300)',
                paddingRight: 'var(--dim-space-300)',
                borderRadius: 'var(--dim-radius-200)',
                background: 'var(--surface-input-default)',
                border: 'var(--dim-stroke-100) solid var(--border-input-default)',
              }}
            >
              <Icon name='search' size={18} />
              <input
                type='text'
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder='ค้นหา HN / ชื่อ-สกุล / ICD-10 / แพทย์'
                className='mih-ncd-registry-search-input flex-1 text-sm'
                style={{ color: 'var(--text-content-primary)' }}
              />
              {search && (
                <button type='button' onClick={() => setSearch('')} aria-label='ล้างคำค้นหา' style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-content-tertiary)' }}>
                  <Icon name='close' size={16} />
                </button>
              )}
            </div>
            <Select showLabel={false} searchable={false} size='lg' value={groupFilter} onChange={setGroupFilter} options={groupOptions} placeholder='กลุ่มโรค' />
            <Select showLabel={false} searchable={false} size='lg' value={statusFilter} onChange={setStatusFilter} options={statusOptions} placeholder='สถานะ' />
            <Select showLabel={false} searchable={false} size='lg' value={doctorFilter} onChange={setDoctorFilter} options={doctorOptions} placeholder='แพทย์' />
            {filtersActive && (
              <NeutralSubdueButton
                variant='outline'
                size='sm'
                onClick={() => { setSearch(''); setGroupFilter('all'); setStatusFilter('all'); setDoctorFilter('all'); }}
              >
                ล้างตัวกรอง
              </NeutralSubdueButton>
            )}
          </div>

          <SearchResultCount found={filtered.length} total={rows.length} />

          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
            {filtered.length === 0 ? (
              <div className='flex flex-col items-center text-center' style={{ padding: 'var(--dim-space-700)', gap: 'var(--dim-space-200)' }}>
                <Icon name='search_off' size={32} />
                <p className='text-sm text-ink-secondary'>ไม่พบทะเบียนที่ตรงกับเงื่อนไข</p>
              </div>
            ) : (
              filtered.map((r) => (
                <RegistryRow
                  key={r.hn}
                  row={r}
                  cancellation={getNcdCancellation(r.hn)}
                  canEdit={canEdit}
                  onView={() => setViewTarget(r)}
                  onEdit={() => openEdit(r)}
                  onCancel={() => openCancel(r)}
                  onReactivate={() => reactivate(r)}
                  onFollowUp={() => history.push({ pathname: '/clinic/ncd/followup', state: { hn: r.hn } })}
                />
              ))
            )}
          </div>
        </section>
      </div>
    </QueuePageShell>
  );
};

export default NcdRegistryPage;
