import React, { useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import Icon from '@/components/icons/Icon';
import InputField from '@/components/forms/InputField';
import Select from '@/components/forms/Select';
import DatePicker from '@/components/forms/DatePicker';
import Textarea from '@/components/forms/Textarea';
import SelectableTag from '@/components/forms/SelectableTag';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import Table from '@/components/table/Table';
import Pagination from '@/components/pagination/Pagination';
import Popup from '@/components/popup/Popup';
import { ConfidentialMask } from '@/pages/clinic/mental-health/MentalHealthSteps';
import { getPatientByHN } from '@/data/patientProfiles';
import {
  hasMentalHealthRights,
  setMentalHealthRights,
  MH_ISSUED_AT_OPTIONS,
  resolveMhIssuedAt,
  EMPTY_MH_FAMILY,
  getMhRegistryRows,
  saveMhRegistration,
  cancelMhRegistration,
  reactivateMhRegistration,
  getMhQueueRows,
  MH_SCHEDULED_TODAY,
  formatMhDate,
  formatMhDateTime,
} from '@/data/mentalHealthClinic';

/* MentalHealthRegistryPage — ทะเบียนผู้รับบริการสุขภาพจิต (TOR 1.10.3.6,
   manual §2.3). Playbook §3 registry pattern (PharmacyRegistryPage): list
   + create/edit on ONE page — the edit form expands above the list. All
   4 TOR verbs live here:
     แสดง   — the list rows + read state of the form
     บันทึก — create: เลขที่สุขภาพจิต auto-runs ONLY on successful save
              (field stays read-only/blank before save, manual §2.3)
     แก้ไข  — row action opens the same form prefilled
     ยกเลิก — reason popup + audit line; cancelled rows stay visible
              greyed with ยกเลิกโดย/เมื่อ/เหตุผล + เปิดใช้งาน reactivate.

   ข้อมูลลับ §1.4.2 — a mental-health registration is confidential in the
   same way the visit record is: without the mental-health-clinic right
   เลขที่สุขภาพจิต / ที่อยู่ / ประวัติครอบครัว are masked and every write
   action (บันทึก / แก้ไข / ยกเลิก / เปิดใช้งาน) is disabled. Same gate
   (hasMentalHealthRights) the queue, record and follow-up pages use. */

const breadcrumb = ['ระบบบันทึกการรักษา', 'งานสุขภาพจิต', 'ทะเบียนสุขภาพจิต'];
const PAGE_SIZE = 10;
const MASKED = '••••••••';

/* No-browser-chrome rule (CLAUDE.md) — the search wrapper owns the border,
   so the native input must not paint its own edges/ring in any browser.
   Idempotent module-load injection so HMR never leaves a stale tag. */
const SEARCH_INPUT_CLASS = 'mih-mh-registry-search-input';
if (typeof document !== 'undefined' && !document.getElementById('mih-mh-registry-search-style')) {
  const style = document.createElement('style');
  style.id = 'mih-mh-registry-search-style';
  style.textContent = `
.${SEARCH_INPUT_CLASS},
.${SEARCH_INPUT_CLASS}:focus,
.${SEARCH_INPUT_CLASS}:focus-visible {
  caret-color: transparent;
  border: 0 !important;
  outline: none !important;
  box-shadow: none !important;
  background: transparent !important;
  -webkit-appearance: none !important;
  appearance: none !important;
}
.${SEARCH_INPUT_CLASS}::placeholder {
  color: var(--text-input-placeholder, #ADB2B7);
  opacity: 1;
}`;
  document.head.appendChild(style);
}

const SectionHeader = ({ icon, children }) => (
  <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
    <span className='text-brand-500'><Icon name={icon} size={20} /></span>
    <h2 className='text-base font-bold text-brand-500'>{children}</h2>
  </div>
);

const Field = ({ label, required, children, hint }) => (
  <div className='flex-1 flex flex-col gap-1.5 min-w-0' style={{ minWidth: 200 }}>
    <div className='flex items-center text-sm text-ink leading-snug'>
      <span>{label}</span>
      {required && <span className='ml-0.5' style={{ color: 'var(--text-input-require)' }}>*</span>}
    </div>
    {children}
    {hint && (
      <span style={{ color: 'var(--text-content-quaternary, #ADB2B7)', fontSize: 'var(--type-size-xs)' }}>
        {hint}
      </span>
    )}
  </div>
);

const EMPTY_FORM = {
  id: '',
  hn: '',
  name: '',
  mhNumber: '',
  issuedAt: '',
  currentAddress: '',
  houseRegAddress: '',
  sameAddress: false,
  family: {
    father: { ...EMPTY_MH_FAMILY },
    mother: { ...EMPTY_MH_FAMILY },
    spouse: { ...EMPTY_MH_FAMILY },
  },
};

const FAMILY_MEMBERS = [
  { key: 'father', label: 'บิดา' },
  { key: 'mother', label: 'มารดา' },
  { key: 'spouse', label: 'คู่สมรส' },
];

const MentalHealthRegistryPage = () => {
  const history = useHistory();
  const [tick, setTick] = useState(0);
  const [search, setSearch] = useState('');
  const [issuedAtFilter, setIssuedAtFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);

  /* null = list only · 'new' = create · row id = edit that row */
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [savedBanner, setSavedBanner] = useState(null);

  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState('');
  /* Re-render hook for the §1.4.2 rights demo toggle (sessionStorage). */
  const [, setRightsTick] = useState(0);

  const canRead = hasMentalHealthRights();
  const toggleRightsDemo = () => {
    setMentalHealthRights(!hasMentalHealthRights());
    setRightsTick((t) => t + 1);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const rows = useMemo(() => getMhRegistryRows(), [tick]);

  /* Patient picker options for a NEW registration — today's clinic roster
     (queue + scheduled) minus everyone already holding an active
     registration. */
  const patientOptions = useMemo(() => {
    const registeredHns = rows.filter((r) => r.status !== 'cancelled').map((r) => r.hn);
    const pool = [...getMhQueueRows(), ...MH_SCHEDULED_TODAY];
    const seen = new Set();
    return pool
      .filter((p) => !registeredHns.includes(p.hn))
      .filter((p) => (seen.has(p.hn) ? false : seen.add(p.hn)))
      .map((p) => ({ value: p.hn, label: `${p.name} · HN ${p.hn}` }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, tick]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (issuedAtFilter !== 'all' && r.issuedAt !== issuedAtFilter) return false;
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (!q) return true;
      return [r.mhNumber, r.hn, r.name].some((f) => f && f.toLowerCase().includes(q));
    });
  }, [rows, search, issuedAtFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const summaryCards = useMemo(() => ([
    { key: 'total',     label: 'ทะเบียนทั้งหมด', value: rows.length, color: 'info', icon: 'contact_page' },
    { key: 'active',    label: 'ใช้งาน',          value: rows.filter((r) => r.status === 'active').length, color: 'positive', icon: 'check_circle' },
    { key: 'cancelled', label: 'ยกเลิกแล้ว',      value: rows.filter((r) => r.status === 'cancelled').length, color: 'negative', icon: 'block' },
    { key: 'community', label: 'ออกที่ชุมชน/โรงเรียน', value: rows.filter((r) => r.issuedAt !== 'center').length, color: 'warning', icon: 'holiday_village' },
  ]), [rows]);

  /* ── form open / close ─────────────────────────────────────────── */
  const openCreate = () => {
    if (!canRead) return; /* §1.4.2 — no write without the right */
    setForm(EMPTY_FORM);
    setErrors({});
    setSavedBanner(null);
    setEditing('new');
  };

  /* Opening a row without the right is allowed but lands in a fully masked,
     read-only state (the list itself is not secret — its contents are). */
  const openEdit = (row) => {
    setForm({
      id: row.id,
      hn: row.hn,
      name: row.name,
      mhNumber: row.mhNumber,
      issuedAt: row.issuedAt,
      currentAddress: row.currentAddress || '',
      houseRegAddress: row.houseRegAddress || '',
      sameAddress: !!row.currentAddress && row.currentAddress === row.houseRegAddress,
      family: {
        father: { ...EMPTY_MH_FAMILY, ...(row.family?.father || {}) },
        mother: { ...EMPTY_MH_FAMILY, ...(row.family?.mother || {}) },
        spouse: { ...EMPTY_MH_FAMILY, ...(row.family?.spouse || {}) },
      },
      registeredDate: row.registeredDate,
      status: row.status,
    });
    setErrors({});
    setSavedBanner(null);
    setEditing(row.id);
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const closeForm = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setErrors({});
  };

  const setField = (key) => (value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const setFamily = (member, key) => (value) => setForm((f) => ({
    ...f,
    family: { ...f.family, [member]: { ...f.family[member], [key]: value } },
  }));

  const pickPatient = (hn) => {
    const p = [...getMhQueueRows(), ...MH_SCHEDULED_TODAY].find((r) => r.hn === hn);
    setForm((f) => ({ ...f, hn, name: p?.name || '' }));
    setErrors((e) => ({ ...e, hn: undefined }));
  };

  /* ข้อมูลทั่วไป read-only — pulled from the patient profile per manual
     §2.3 ("ระบบดึงข้อมูลทั่วไปจากทะเบียนผู้ป่วย"). */
  const profile = useMemo(() => (form.hn ? getPatientByHN(form.hn) : null), [form.hn]);
  const clinicRow = useMemo(
    () => (form.hn ? [...getMhQueueRows(), ...MH_SCHEDULED_TODAY].find((r) => r.hn === form.hn) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [form.hn, tick],
  );

  const save = () => {
    if (!canRead) return; /* §1.4.2 — write blocked without the right */
    const nextErrors = {};
    if (!form.hn) nextErrors.hn = 'กรุณาเลือกผู้รับบริการ';
    if (!form.issuedAt) nextErrors.issuedAt = 'กรุณาเลือกสถานที่ออกทะเบียน';
    if (!form.currentAddress.trim()) nextErrors.currentAddress = 'กรุณาระบุที่อยู่ปัจจุบัน';
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }
    const { saved, isNew } = saveMhRegistration({
      id: form.id || undefined,
      hn: form.hn,
      name: form.name,
      mhNumber: form.mhNumber || undefined,
      issuedAt: form.issuedAt,
      currentAddress: form.currentAddress.trim(),
      houseRegAddress: form.sameAddress ? form.currentAddress.trim() : form.houseRegAddress.trim(),
      family: form.family,
      registeredDate: form.registeredDate,
      status: form.status,
    });
    setTick((t) => t + 1);
    closeForm();
    setSavedBanner({
      mhNumber: saved.mhNumber,
      name: saved.name,
      isNew,
    });
  };

  /* ── ยกเลิก / เปิดใช้งาน ───────────────────────────────────────── */
  const openCancel = (row) => {
    if (!canRead) return;
    setCancelReason('');
    setCancelError('');
    setCancelTarget(row);
  };
  const confirmCancel = () => {
    if (!canRead) return;
    if (!cancelReason.trim()) {
      setCancelError('กรุณาระบุเหตุผลการยกเลิกทะเบียน');
      return;
    }
    cancelMhRegistration(cancelTarget.id, cancelReason.trim());
    setCancelTarget(null);
    setTick((t) => t + 1);
  };
  const reactivate = (row) => {
    if (!canRead) return;
    reactivateMhRegistration(row.id);
    setTick((t) => t + 1);
  };

  /* ── list columns ──────────────────────────────────────────────── */
  const cancelledText = { color: 'var(--text-content-tertiary, #858C92)' };

  const columns = useMemo(() => ([
    {
      key: 'mhNumber', label: 'เลขที่สุขภาพจิต',
      render: (r) => (
        <span
          style={r.status === 'cancelled' ? cancelledText : { fontWeight: 'var(--type-weight-medium)' }}
          title={canRead ? undefined : 'ข้อมูลลับ §1.4.2 — สิทธิไม่เพียงพอ'}
        >
          {canRead ? r.mhNumber : MASKED}
        </span>
      ),
    },
    { key: 'hn', label: 'HN', render: (r) => <span style={r.status === 'cancelled' ? cancelledText : undefined}>{r.hn}</span> },
    { key: 'name', label: 'ชื่อ-นามสกุล', flex: true, minWidth: 170, render: (r) => <span style={r.status === 'cancelled' ? cancelledText : undefined}>{r.name}</span> },
    { key: 'issuedAt', label: 'ออกที่', render: (r) => <span style={r.status === 'cancelled' ? cancelledText : undefined}>{resolveMhIssuedAt(r.issuedAt)}</span> },
    { key: 'registeredDate', label: 'วันที่ลงทะเบียน', render: (r) => <span style={r.status === 'cancelled' ? cancelledText : undefined}>{formatMhDate(r.registeredDate)}</span> },
    {
      key: 'status', label: 'สถานะ',
      render: (r) => (r.status === 'cancelled' ? (
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
          <ColorfulBadge style='red' size='small' hierarchy='secondary'>ยกเลิกทะเบียน</ColorfulBadge>
          {r.cancellation && (
            <span style={{ fontSize: 'var(--type-size-xs)', ...cancelledText }}>
              โดย {r.cancellation.by} · {formatMhDateTime(r.cancellation.at)}
              <br />เหตุผล: {r.cancellation.reason}
            </span>
          )}
        </div>
      ) : (
        <ColorfulBadge style='green' size='small' hierarchy='secondary'>ใช้งาน</ColorfulBadge>
      )),
    },
    {
      key: 'recordedBy', label: 'ผู้บันทึก', sortable: false,
      render: (r) => (
        <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-secondary, #636B72)' }}>
          {r.recordedBy}<br />{formatMhDateTime(r.recordedAt)}
        </span>
      ),
    },
    {
      key: 'actions', label: 'การดำเนินการ', sortable: false,
      render: (r) => (
        <div className='flex items-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          {!canRead ? (
            /* §1.4.2 — ทุกการเขียนถูกปิด แสดงเฉพาะสถานะสิทธิ */
            <ColorfulBadge style='grey' size='small' hierarchy='secondary'>สิทธิไม่เพียงพอ</ColorfulBadge>
          ) : r.status === 'cancelled' ? (
            <BrandSubdueButton
              variant='outline' size='sm' leadingIcon='restart_alt'
              onClick={(e) => { e.stopPropagation(); reactivate(r); }}
            >
              เปิดใช้งาน
            </BrandSubdueButton>
          ) : (
            <>
              <BrandSubdueButton
                variant='outline' size='sm' leadingIcon='edit'
                onClick={(e) => { e.stopPropagation(); openEdit(r); }}
              >
                แก้ไข
              </BrandSubdueButton>
              <NeutralSubdueButton
                size='sm' leadingIcon='block'
                onClick={(e) => { e.stopPropagation(); openCancel(r); }}
              >
                ยกเลิก
              </NeutralSubdueButton>
            </>
          )}
        </div>
      ),
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ]), [tick, canRead]);

  const issuedAtOptions = [{ value: 'all', label: 'ทุกสถานที่' }, ...MH_ISSUED_AT_OPTIONS];
  const statusOptions = [
    { value: 'all', label: 'ทุกสถานะ' },
    { value: 'active', label: 'ใช้งาน' },
    { value: 'cancelled', label: 'ยกเลิกแล้ว' },
  ];

  const filtersActive = search.trim() !== '' || issuedAtFilter !== 'all' || statusFilter !== 'all';

  return (
    <QueuePageShell
      activeKey='treat'
      breadcrumb={breadcrumb}
      title='ทะเบียนผู้รับบริการสุขภาพจิต'
      onBack={() => history.push('/clinic/mental-health')}
      backLabel='กลับหน้าคิว'
      actions={(
        <div className='flex items-center' style={{ gap: 'var(--dim-space-300, 12px)' }}>
          <ColorfulBadge style='red' size='small' hierarchy='secondary'>ข้อมูลลับ §1.4.2</ColorfulBadge>
          {/* Demo toggle for the สิทธิไม่พอ masked state (mock-only —
              real RBAC arrives with §1.4.2 / §1.20). */}
          <NeutralSubdueButton
            size='sm'
            leadingIcon={canRead ? 'lock_open' : 'lock'}
            onClick={toggleRightsDemo}
            title='สลับสิทธิการเข้าถึงข้อมูลลับ (สำหรับทดสอบ)'
          >
            {canRead ? 'สิทธิ: เข้าถึงได้' : 'สิทธิ: ถูกจำกัด'}
          </NeutralSubdueButton>
          <BrandSubdueButton variant='fill' leadingIcon='person_add' onClick={openCreate} disabled={!canRead}>
            ลงทะเบียนสุขภาพจิตใหม่
          </BrandSubdueButton>
        </div>
      )}
      summaryCards={summaryCards}
    >
      <Popup
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        title='ยกเลิกทะเบียนสุขภาพจิต'
        subtitle={cancelTarget ? `${cancelTarget.mhNumber} · ${cancelTarget.name} · HN: ${cancelTarget.hn}` : ''}
        tertiaryAction={{ label: 'ปิด', onClick: () => setCancelTarget(null) }}
        primaryAction={{ label: 'ยืนยันยกเลิกทะเบียน', onClick: confirmCancel, tone: 'danger' }}
      >
        <Textarea
          label='เหตุผลการยกเลิก'
          required
          value={cancelReason}
          onChange={(v) => { setCancelReason(v); if (v.trim()) setCancelError(''); }}
          error={cancelError || undefined}
          placeholder='เช่น ย้ายไปรับการรักษาที่สถานพยาบาลอื่น / ลงทะเบียนซ้ำ'
        />
      </Popup>

      <div className='flex flex-col flex-1 min-w-0' style={{ paddingTop: 'var(--dim-space-600, 24px)', paddingBottom: 'var(--dim-space-600, 24px)', paddingLeft: 'var(--dim-space-600, 24px)', paddingRight: 'var(--dim-space-600, 24px)', gap: 'var(--dim-space-600, 24px)' }}>

        {/* สิทธิไม่เพียงพอ (§1.4.2) — list stays visible, contents masked,
            ทุกการเขียนถูกปิด */}
        {!canRead && (
          <div
            className='flex items-center w-full'
            style={{
              gap: 'var(--dim-space-200, 8px)',
              paddingTop: 'var(--dim-space-300, 12px)',
              paddingBottom: 'var(--dim-space-300, 12px)',
              paddingLeft: 'var(--dim-space-400, 16px)',
              paddingRight: 'var(--dim-space-400, 16px)',
              borderRadius: 'var(--dim-radius-200, 8px)',
              background: 'var(--surface-warning-quaternary, #FFF9F0)',
              color: 'var(--text-warning-default, #C2410C)',
              fontSize: 'var(--type-size-sm)',
            }}
          >
            <Icon name='lock' size={18} />
            <span>
              บัญชีนี้ไม่มีสิทธิเข้าถึงข้อมูลลับของงานสุขภาพจิต (§1.4.2) —
              เลขที่สุขภาพจิต ที่อยู่ และประวัติครอบครัวถูกปกปิด และไม่สามารถ
              บันทึก / แก้ไข / ยกเลิกทะเบียนได้
            </span>
          </div>
        )}

        {/* Post-save confirmation — surfaces the auto-run เลขที่สุขภาพจิต
            the moment it exists (it is blank before save, manual §2.3). */}
        {savedBanner && (
          <div
            className='flex items-center w-full'
            style={{
              gap: 'var(--dim-space-200, 8px)',
              paddingTop: 'var(--dim-space-300, 12px)',
              paddingBottom: 'var(--dim-space-300, 12px)',
              paddingLeft: 'var(--dim-space-400, 16px)',
              paddingRight: 'var(--dim-space-400, 16px)',
              borderRadius: 'var(--dim-radius-200, 8px)',
              background: 'var(--surface-brandPrimary-quaternary, #F4FBF8)',
              color: 'var(--text-brandPrimary-default, #007549)',
              fontSize: 'var(--type-size-sm)',
            }}
          >
            <Icon name='check-circle' size={18} />
            <span>
              {savedBanner.isNew
                ? `ลงทะเบียนสำเร็จ — ออกเลขที่สุขภาพจิต ${savedBanner.mhNumber} ให้ ${savedBanner.name} แล้ว`
                : `บันทึกการแก้ไขทะเบียน ${savedBanner.mhNumber} (${savedBanner.name}) แล้ว`}
            </span>
            <div className='flex-1' />
            <button
              type='button'
              onClick={() => setSavedBanner(null)}
              aria-label='ปิดการแจ้งเตือน'
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-brandPrimary-default, #007549)' }}
            >
              <Icon name='close' size={16} />
            </button>
          </div>
        )}

        {/* ── Create / Edit form (expands above the list) ─────────── */}
        {editing !== null && (
          <section
            className='w-full flex flex-col'
            style={{
              background: 'var(--surface-card-100, #FFFFFF)',
              borderRadius: 'var(--dim-radius-500, 16px)',
              border: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary, #E2F3EB)',
              boxShadow: 'var(--shadow-card-strong)',
              paddingTop: 'var(--dim-space-600, 24px)',
              paddingBottom: 'var(--dim-space-600, 24px)',
              paddingLeft: 'var(--dim-space-600, 24px)',
              paddingRight: 'var(--dim-space-600, 24px)',
              gap: 'var(--dim-space-600, 24px)',
            }}
          >
            <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
              <h1 className='text-base font-bold' style={{ color: 'var(--text-content-default, #363B3F)' }}>
                {editing === 'new'
                  ? 'ลงทะเบียนสุขภาพจิตใหม่'
                  : `${canRead ? 'แก้ไขทะเบียน' : 'ทะเบียน'} ${canRead ? form.mhNumber : MASKED}`}
              </h1>
              <div className='flex-1' />
              <NeutralSubdueButton size='sm' leadingIcon='close' onClick={closeForm}>ปิดแบบฟอร์ม</NeutralSubdueButton>
            </div>

            {/* เลขที่สุขภาพจิต — read-only always; blank until first save. */}
            <div className='flex items-start w-full flex-wrap' style={{ gap: 'var(--dim-space-400, 16px)' }}>
              <Field
                label='เลขที่สุขภาพจิต'
                hint={form.mhNumber ? undefined : 'ระบบจะออกเลขที่ให้อัตโนมัติ (Run number) เมื่อบันทึกสำเร็จ'}
              >
                <InputField value={canRead ? form.mhNumber : MASKED} onChange={() => {}} disabled placeholder='ออกให้อัตโนมัติเมื่อบันทึก' />
              </Field>
              <Field label='ออกที่' required hint={errors.issuedAt}>
                <Select
                  showLabel={false}
                  searchable={false}
                  size='lg'
                  disabled={!canRead}
                  value={form.issuedAt}
                  onChange={setField('issuedAt')}
                  options={MH_ISSUED_AT_OPTIONS}
                  placeholder='เลือกสถานที่ออกทะเบียน'
                  error={errors.issuedAt ? ' ' : undefined}
                />
              </Field>
              <Field label='วันที่ลงทะเบียน' hint='บันทึกอัตโนมัติเป็นวันที่บันทึกสำเร็จ'>
                <InputField value={form.registeredDate ? formatMhDate(form.registeredDate) : formatMhDate(new Date())} onChange={() => {}} disabled />
              </Field>
            </div>

            {/* §1 ข้อมูลทั่วไป — read-only from the patient profile. */}
            <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
              <SectionHeader icon='person'>ข้อมูลทั่วไป (ดึงจากทะเบียนผู้ป่วย)</SectionHeader>
              {editing === 'new' ? (
                <Field label='ผู้รับบริการ' required hint={errors.hn || 'เลือกจากคิว/นัดหมายของคลินิกวันนี้ที่ยังไม่มีทะเบียน'}>
                  <Select
                    showLabel={false}
                    searchable
                    size='lg'
                    value={form.hn}
                    onChange={pickPatient}
                    options={patientOptions}
                    placeholder='ค้นหาชื่อ / HN'
                    error={errors.hn ? ' ' : undefined}
                  />
                </Field>
              ) : null}
              {form.hn ? (
                <div className='flex items-start w-full flex-wrap' style={{ gap: 'var(--dim-space-400, 16px)' }}>
                  <Field label='HN'><InputField value={form.hn} onChange={() => {}} disabled /></Field>
                  <Field label='ชื่อ-นามสกุล'><InputField value={form.name} onChange={() => {}} disabled /></Field>
                  <Field label='เพศ / อายุ'>
                    <InputField
                      value={clinicRow ? `${clinicRow.sex || '—'} / ${clinicRow.age || '—'}` : (profile ? `${profile.sex || '—'} / ${profile.age || '—'}` : '—')}
                      onChange={() => {}}
                      disabled
                    />
                  </Field>
                  <Field label='เลขบัตรประชาชน'>
                    <InputField value={clinicRow?.cid || profile?.cid || '—'} onChange={() => {}} disabled />
                  </Field>
                  <Field label='สิทธิการรักษา'>
                    <InputField value={clinicRow?.insurance || profile?.insurance || '—'} onChange={() => {}} disabled />
                  </Field>
                </div>
              ) : (
                <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-tertiary, #858C92)' }}>
                  ยังไม่ได้เลือกผู้รับบริการ — ข้อมูลทั่วไปจะแสดงเมื่อเลือกแล้ว
                </span>
              )}
            </div>

            {/* §2-4 ที่อยู่ + ประวัติครอบครัว — ข้อมูลลับ §1.4.2 */}
            {!canRead ? (
              <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
                <SectionHeader icon='lock'>ที่อยู่และประวัติครอบครัว</SectionHeader>
                <ConfidentialMask what='ที่อยู่ปัจจุบัน ที่อยู่ตามทะเบียนบ้าน และประวัติครอบครัวของทะเบียนสุขภาพจิต' />
              </div>
            ) : (
            <>
            {/* §2 ที่อยู่ปัจจุบัน */}
            <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
              <SectionHeader icon='home'>ที่อยู่ปัจจุบัน</SectionHeader>
              <Textarea
                showLabel={false}
                required
                value={form.currentAddress}
                onChange={(v) => { setField('currentAddress')(v); if (form.sameAddress) setForm((f) => ({ ...f, currentAddress: v, houseRegAddress: v })); }}
                error={errors.currentAddress}
                rows={2}
                placeholder='บ้านเลขที่ / หมู่ / ซอย / ถนน / แขวง / เขต / จังหวัด / รหัสไปรษณีย์'
              />
            </div>

            {/* §3 ที่อยู่ตามทะเบียนบ้าน */}
            <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
              <SectionHeader icon='other_houses'>ที่อยู่ตามทะเบียนบ้าน</SectionHeader>
              <SelectableTag
                label='ตรงกับที่อยู่ปัจจุบัน'
                size='lg'
                selected={form.sameAddress}
                onClick={() => setForm((f) => ({
                  ...f,
                  sameAddress: !f.sameAddress,
                  houseRegAddress: !f.sameAddress ? f.currentAddress : f.houseRegAddress,
                }))}
              />
              {!form.sameAddress && (
                <Textarea
                  showLabel={false}
                  value={form.houseRegAddress}
                  onChange={setField('houseRegAddress')}
                  rows={2}
                  placeholder='บ้านเลขที่ / หมู่ / ซอย / ถนน / แขวง / เขต / จังหวัด / รหัสไปรษณีย์'
                />
              )}
            </div>

            {/* §4 ประวัติครอบครัว — บิดา / มารดา / คู่สมรส (manual §2.3) */}
            <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
              <SectionHeader icon='family_restroom'>ประวัติครอบครัว</SectionHeader>
              {FAMILY_MEMBERS.map((m) => (
                <div key={m.key} className='flex items-end w-full flex-wrap' style={{ gap: 'var(--dim-space-400, 16px)' }}>
                  <Field label={`${m.label} — ชื่อ-นามสกุล`}>
                    <InputField
                      value={form.family[m.key].name}
                      onChange={setFamily(m.key, 'name')}
                      placeholder={`ชื่อ-นามสกุล${m.label}`}
                    />
                  </Field>
                  <Field label='วันเกิด'>
                    <DatePicker
                      value={form.family[m.key].birthDate ? new Date(form.family[m.key].birthDate) : null}
                      onChange={(d) => setFamily(m.key, 'birthDate')(d ? d.toISOString().slice(0, 10) : '')}
                      placeholder='เลือกวันเกิด'
                      showLabel={false}
                    />
                  </Field>
                  <Field label='อาชีพ'>
                    <InputField
                      value={form.family[m.key].occupation}
                      onChange={setFamily(m.key, 'occupation')}
                      placeholder='เช่น ค้าขาย / ข้าราชการ / ไม่ทราบ'
                    />
                  </Field>
                </div>
              ))}
            </div>
            </>
            )}

            <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
              <div className='flex-1' />
              <NeutralSubdueButton size='lg' onClick={closeForm}>
                {canRead ? 'ยกเลิก' : 'ปิด'}
              </NeutralSubdueButton>
              <BrandSubdueButton variant='fill' size='lg' leadingIcon='save' onClick={save} disabled={!canRead}>
                {editing === 'new' ? 'บันทึกและออกเลขที่สุขภาพจิต' : 'บันทึกการแก้ไข'}
              </BrandSubdueButton>
            </div>
          </section>
        )}

        {/* ── List card ───────────────────────────────────────────── */}
        <section
          className='w-full flex flex-col'
          style={{
            background: 'var(--surface-card-100, #FFFFFF)',
            borderRadius: 'var(--dim-radius-500, 16px)',
            border: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary, #E2F3EB)',
            boxShadow: 'var(--shadow-card-strong)',
            paddingTop: 'var(--dim-space-600, 24px)',
            paddingBottom: 'var(--dim-space-600, 24px)',
            paddingLeft: 'var(--dim-space-600, 24px)',
            paddingRight: 'var(--dim-space-600, 24px)',
            gap: 'var(--dim-space-400, 16px)',
          }}
        >
          <div className='flex flex-wrap items-center w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
            <div
              className='flex items-center flex-1'
              style={{
                minWidth: 218,
                gap: 'var(--dim-space-200, 8px)',
                height: 'var(--dim-size-800, 40px)',
                paddingLeft: 'var(--dim-space-300, 12px)',
                paddingRight: 'var(--dim-space-300, 12px)',
                borderRadius: 'var(--dim-radius-200, 8px)',
                background: 'var(--surface-input-default)',
                border: 'var(--dim-stroke-100, 1px) solid var(--border-input-default)',
              }}
            >
              <Icon name='search' size={18} />
              <input
                type='text'
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder='ค้นหาเลขที่สุขภาพจิต / HN / ชื่อ-สกุล'
                className={`${SEARCH_INPUT_CLASS} flex-1 text-sm`}
                style={{ color: 'var(--text-content-primary)' }}
              />
              {search && (
                <button type='button' onClick={() => setSearch('')} aria-label='ล้างคำค้นหา' style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-content-tertiary, #858C92)' }}>
                  <Icon name='close' size={16} />
                </button>
              )}
            </div>
            <Select
              showLabel={false} searchable={false} size='md'
              value={issuedAtFilter} onChange={setIssuedAtFilter}
              options={issuedAtOptions} placeholder='ออกที่'
            />
            <Select
              showLabel={false} searchable={false} size='md'
              value={statusFilter} onChange={setStatusFilter}
              options={statusOptions} placeholder='สถานะ'
            />
            {filtersActive && (
              <NeutralSubdueButton
                variant='outline' size='sm'
                onClick={() => { setSearch(''); setIssuedAtFilter('all'); setStatusFilter('all'); }}
              >
                ล้างตัวกรอง
              </NeutralSubdueButton>
            )}
          </div>

          <Table
            columns={columns}
            rows={pageRows}
            rowKey={(r) => r.id}
            onRowClick={(r) => (r.status === 'cancelled' ? undefined : openEdit(r))}
            emptyMessage='ไม่พบทะเบียนที่ตรงกับการค้นหา / ตัวกรอง'
          />

          <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
            <span style={{ color: 'var(--text-content-secondary, #636B72)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)' }}>
              {`แสดง ${filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, filtered.length)} จาก ${filtered.length} รายการ`}
            </span>
            <div className='flex-1' />
            <Pagination currentPage={page} pageCount={totalPages} onPageChange={setPage} />
          </div>
        </section>
      </div>
    </QueuePageShell>
  );
};

export default MentalHealthRegistryPage;
