import React, { useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import SearchResultCount from '@/components/search/SearchResultCount';
import Icon from '@/components/icons/Icon';
import Popup from '@/components/popup/Popup';
import AlertDialog from '@/components/popup/AlertDialog';
import InputField from '@/components/forms/InputField';
import Select from '@/components/forms/Select';
import DatePicker from '@/components/forms/DatePicker';
import SelectableTag from '@/components/forms/SelectableTag';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import MaskedWorklistName from '@/components/privacy/MaskedWorklistName';
import Table from '@/components/table/Table';
import Pagination from '@/components/pagination/Pagination';
import { getPatientByHN } from '@/data/patientProfiles';
import {
  REHAB_CAUSES,
  resolveRehabCause,
  REHAB_SERVICE_TYPES,
  REHAB_IMC_PHASES,
  resolveImcPhase,
  REHAB_DISCHARGE_STATUS,
  resolveDischargeStatus,
  REHAB_THERAPIST_OPTIONS,
  REHAB_REFER_HOSPITALS,
  REHAB_REGISTRY_CANCEL_SUGGESTIONS,
  formatRehabDate,
  formatRehabDateTime,
  imcGoldenPeriod,
  getRehabRegistryRows,
  addRehabRegistration,
  updateRehabRegistration,
  cancelRehabRegistration,
  reactivateRehabRegistration,
  getRehabCancellation,
  getRehabVisitCount,
  canEditRehab,
  todayIso,
} from '@/data/rehabVisits';

/* RehabRegistryPage — ทะเบียนผู้รับบริการฟื้นฟูและ Intermediate Care
   (TOR 1.10.10.6) at /clinic/rehab/registry. List + create/edit in the same
   page (PharmacyRegistryPage / NcdRegistryPage pattern, playbook §3), with
   the full แสดง / บันทึก / แก้ไข / ยกเลิก quartet:

     • แสดง   — row click opens a read-only detail popup incl. the audit trail
                (ผู้บันทึก + เวลา + ประวัติแก้ไข + ผู้ยกเลิก) และปุ่มพิมพ์ทะเบียน
     • บันทึก — "ขึ้นทะเบียนใหม่" popup (ประเภท ทั่วไป/IMC · สาเหตุ+ICD-10 ·
                วันเกิดโรค · วันรับเข้า · Barthel แรกรับ · ระยะ IMC ·
                รพ.ที่ส่งต่อ · ผู้รับผิดชอบ · เลขที่ Course + จำนวนครั้ง)
     • แก้ไข   — same popup pre-filled; closing with unsaved changes runs a
                dirty-check confirm; every save appends to editHistory
     • ยกเลิก  — reason-required popup (ห้ามเหตุผลว่าง) + เปิดใช้งานอีกครั้ง

   IMC rows carry the 6-month golden-period countdown from วันเกิดโรค —
   the whole point of the IMC registry is that the window is finite.

   All writes go through the sessionStorage helpers in rehabVisits.js and
   re-render via the `tick` bump (ANC contract). เมื่อสิทธิ์ผู้ใช้เป็นดูอย่างเดียว
   (canEditRehab() === false) ปุ่มทั้งหมดถูกซ่อนพร้อมแบนเนอร์แจ้งเตือน. */

const breadcrumb = ['บันทึกการรักษา', 'งานเวชศาสตร์ฟื้นฟูและกายภาพบำบัด'];

const PAGE_SIZE = 10;

/* ช่องค้นหาในแถบตัวกรองเป็น control ที่ wrapper เป็นเจ้าของ border —
   <input> ข้างในต้องไม่มี chrome ของเบราว์เซอร์เลย (CLAUDE.md "No
   browser-default input chrome"). Tailwind border-none/outline-none ไม่พอ:
   Webkit ยังวาดเส้นแนวตั้งที่ขอบและ focus ring ของตัวเอง.
   Injection แบบ idempotent เพื่อให้ HMR ไม่ทิ้ง <style> ค้าง. */
if (typeof document !== 'undefined') {
  const styleId = 'mih-rehab-registry-search-style';
  const css = `
.mih-rehab-registry-search-input,
.mih-rehab-registry-search-input:focus,
.mih-rehab-registry-search-input:focus-visible {
  caret-color: var(--text-content-primary, #363B3F);
  border: 0 !important;
  outline: none !important;
  box-shadow: none !important;
  background: transparent !important;
  -webkit-appearance: none !important;
  appearance: none !important;
}
.mih-rehab-registry-search-input::placeholder {
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
  serviceType: 'general',
  cause: '',
  icd10: '',
  imcPhase: '',
  onsetDate: '',
  admitDate: '',
  barthelAdmit: '',
  referHospital: '',
  owner: '',
  courseNo: '',
  courseTotal: '',
  dischargeStatus: 'ongoing',
};

const DISCHARGE_BADGE = {
  ongoing:   'blue',
  completed: 'green',
  partial:   'yellow',
  refer:     'purple',
  defaulted: 'orange',
};

const FieldLabel = ({ children, required }) => (
  <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-default)' }}>
    {children}
    {required && <span style={{ color: 'var(--text-input-require)' }}> *</span>}
  </span>
);

const FormField = ({ label, required, children, hint }) => (
  <div className='flex-1 min-w-0 flex flex-col' style={{ gap: 'var(--dim-space-100)' }}>
    <FieldLabel required={required}>{label}</FieldLabel>
    {children}
    {hint && (
      <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>{hint}</span>
    )}
  </div>
);

const AuditLine = ({ icon, children, tone }) => (
  <span
    className='inline-flex items-center'
    style={{
      gap: 'var(--dim-space-100)',
      fontSize: 'var(--type-size-xs)',
      color: tone === 'danger' ? 'var(--text-danger-default, #C72121)' : 'var(--text-content-tertiary)',
    }}
  >
    <Icon name={icon} size={14} />
    {children}
  </span>
);

/* Audit trail ของทะเบียน — ผู้บันทึก / ประวัติแก้ไข / การยกเลิก ในแผงเดียว
   (ข้อกำหนด audit ของ TOR 1.10.10.6) แสดงใน popup รายละเอียด. */
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
      ขึ้นทะเบียนโดย {row.registeredBy} · {formatRehabDateTime(row.registeredAt)}
    </AuditLine>
    {(row.editHistory || []).length === 0 ? (
      <AuditLine icon='edit'>ยังไม่มีประวัติการแก้ไข</AuditLine>
    ) : (
      (row.editHistory || []).map((e, i) => (
        <AuditLine key={`${e.at}-${i}`} icon='edit'>
          แก้ไขโดย {e.by} · {formatRehabDateTime(e.at)} — {e.changes}
        </AuditLine>
      ))
    )}
    {cancellation && (
      <AuditLine icon='block' tone='danger'>
        ยกเลิกทะเบียนโดย {cancellation.cancelledBy} · {formatRehabDateTime(cancellation.cancelledAt)} —
        เหตุผล: {cancellation.reason}
      </AuditLine>
    )}
  </div>
);

const RehabRegistryPage = () => {
  const history = useHistory();
  const canEdit = canEditRehab();

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [causeFilter, setCauseFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [ownerFilter, setOwnerFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [tick, setTick] = useState(0);

  /* Popup state — one slot per TOR action. `formMode` null | 'create' |
     'edit'; `draft` mirrors EMPTY_DRAFT; `baseline` powers the dirty-check
     confirm on close. */
  const [viewTarget, setViewTarget] = useState(null);
  const [formMode, setFormMode] = useState(null);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [baseline, setBaseline] = useState(EMPTY_DRAFT);
  const [formError, setFormError] = useState('');
  const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false);
  const [duplicateAlert, setDuplicateAlert] = useState('');
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState('');
  const [reactivateTarget, setReactivateTarget] = useState(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const rows = useMemo(() => getRehabRegistryRows(), [tick]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      const cancellation = getRehabCancellation(r.hn);
      if (typeFilter !== 'all' && r.serviceType !== typeFilter) return false;
      if (causeFilter !== 'all' && r.cause !== causeFilter) return false;
      if (statusFilter === 'active' && (cancellation || r.dischargeStatus !== 'ongoing')) return false;
      if (statusFilter === 'cancelled' && !cancellation) return false;
      if (statusFilter === 'discharged' && (cancellation || r.dischargeStatus === 'ongoing')) return false;
      if (ownerFilter !== 'all' && r.owner !== ownerFilter) return false;
      if (!q) return true;
      return [r.hn, r.name, r.icd10, r.owner, r.courseNo].some((f) => f && f.toLowerCase().includes(q));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, search, typeFilter, causeFilter, statusFilter, ownerFilter, tick]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const rangeStart = filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(safePage * PAGE_SIZE, filtered.length);

  const activeRows = rows.filter((r) => !getRehabCancellation(r.hn));
  const summaryCards = useMemo(() => ([
    { key: 'total',     label: 'ทะเบียนที่ใช้งาน',     value: activeRows.length, color: 'info', icon: 'contract' },
    { key: 'imc',       label: 'Intermediate Care',    value: activeRows.filter((r) => r.serviceType === 'imc').length, color: 'brand', icon: 'health_and_safety' },
    {
      key: 'golden',
      label: 'IMC ใกล้ครบ 6 เดือน (≤30 วัน)',
      value: activeRows.filter((r) => {
        if (r.serviceType !== 'imc') return false;
        const g = imcGoldenPeriod(r.onsetDate);
        return g && !g.expired && g.daysLeft <= 30;
      }).length,
      color: 'inprogress',
      icon: 'timer',
    },
    { key: 'discharged', label: 'จำหน่ายจาก Course แล้ว', value: activeRows.filter((r) => r.dischargeStatus && r.dischargeStatus !== 'ongoing').length, color: 'positive', icon: 'task_alt' },
    { key: 'cancelled',  label: 'ยกเลิกทะเบียน',          value: rows.length - activeRows.length, color: 'destructive', icon: 'block' },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ]), [rows, tick]);

  const typeOptions = [{ value: 'all', label: 'ทุกประเภท' }, ...REHAB_SERVICE_TYPES];
  const causeOptions = [{ value: 'all', label: 'ทุกสาเหตุ' }, ...REHAB_CAUSES.map((c) => ({ value: c.key, label: c.label }))];
  const statusOptions = [
    { value: 'all',        label: 'ทุกสถานะ' },
    { value: 'active',     label: 'กำลังฟื้นฟู' },
    { value: 'discharged', label: 'จำหน่ายจาก Course' },
    { value: 'cancelled',  label: 'ยกเลิกทะเบียน' },
  ];
  const ownerOptions = [{ value: 'all', label: 'ทุกคน' }, ...REHAB_THERAPIST_OPTIONS.map((t) => ({ value: t, label: t }))];

  const filtersActive = search.trim() !== ''
    || typeFilter !== 'all' || causeFilter !== 'all' || statusFilter !== 'all' || ownerFilter !== 'all';

  const clearFilters = () => {
    setSearch('');
    setTypeFilter('all');
    setCauseFilter('all');
    setStatusFilter('all');
    setOwnerFilter('all');
    setPage(1);
  };

  /* ── บันทึก / แก้ไข ────────────────────────────────────────────── */

  const openCreate = () => {
    setDraft({ ...EMPTY_DRAFT, admitDate: todayIso() });
    setBaseline({ ...EMPTY_DRAFT, admitDate: todayIso() });
    setFormError('');
    setFormMode('create');
  };

  const openEdit = (row) => {
    const seed = {
      hn: row.hn,
      name: row.name,
      serviceType: row.serviceType || 'general',
      cause: row.cause || '',
      icd10: row.icd10 || '',
      imcPhase: row.imcPhase || '',
      onsetDate: row.onsetDate || '',
      admitDate: row.admitDate || '',
      barthelAdmit: row.barthelAdmit != null ? String(row.barthelAdmit) : '',
      referHospital: row.referHospital || '',
      owner: row.owner || '',
      courseNo: row.courseNo || '',
      courseTotal: row.courseTotal != null ? String(row.courseTotal) : '',
      dischargeStatus: row.dischargeStatus || 'ongoing',
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

  const setField = (key) => (v) => setDraft((d) => ({ ...d, [key]: v }));

  /* เลือกสาเหตุแล้วเติม ICD-10 ให้อัตโนมัติ (แก้ทับได้) — ลดการพิมพ์ผิด */
  const pickCause = (key) => {
    const c = resolveRehabCause(key);
    setDraft((d) => ({ ...d, cause: key, icd10: d.icd10 && d.icd10 !== c?.icd10 ? d.icd10 : (c?.icd10 || '') }));
  };

  const saveForm = () => {
    const barthelNum = draft.barthelAdmit === '' ? null : Number(draft.barthelAdmit);
    const courseTotalNum = draft.courseTotal === '' ? null : Number(draft.courseTotal);

    if (!draft.hn.trim() || !draft.name.trim()) {
      setFormError('ระบุ HN และชื่อ-สกุลผู้รับบริการ');
      return;
    }
    if (!draft.cause) {
      setFormError('เลือกสาเหตุหลักของการฟื้นฟู');
      return;
    }
    if (!draft.onsetDate) {
      setFormError('ระบุวันที่เกิดโรค / วันที่บาดเจ็บ (ใช้คำนวณกรอบเวลา Intermediate Care)');
      return;
    }
    if (!draft.admitDate) {
      setFormError('ระบุวันที่รับเข้าโปรแกรมฟื้นฟู');
      return;
    }
    if (draft.admitDate < draft.onsetDate) {
      setFormError('วันที่รับเข้าต้องไม่ก่อนวันที่เกิดโรค');
      return;
    }
    if (draft.serviceType === 'imc' && !draft.imcPhase) {
      setFormError('ผู้รับบริการกลุ่ม Intermediate Care ต้องระบุระยะ IMC');
      return;
    }
    if (barthelNum != null && (Number.isNaN(barthelNum) || barthelNum < 0 || barthelNum > 100)) {
      setFormError('คะแนน Barthel แรกรับต้องอยู่ระหว่าง 0–100');
      return;
    }
    if (courseTotalNum != null && (Number.isNaN(courseTotalNum) || courseTotalNum <= 0)) {
      setFormError('จำนวนครั้งใน Course ต้องมากกว่า 0');
      return;
    }
    if (!draft.owner) {
      setFormError('เลือกผู้รับผิดชอบ (นักกายภาพบำบัด / แพทย์เวชศาสตร์ฟื้นฟู)');
      return;
    }

    const payload = {
      ...draft,
      hn: draft.hn.trim(),
      name: draft.name.trim(),
      barthelAdmit: barthelNum,
      courseTotal: courseTotalNum,
      imcPhase: draft.serviceType === 'imc' ? draft.imcPhase : '',
    };

    if (formMode === 'create') {
      const existing = rows.find((r) => r.hn === payload.hn);
      if (existing && !getRehabCancellation(existing.hn)) {
        /* กันขึ้นทะเบียนซ้ำสำหรับผู้ที่ยังใช้งานอยู่ (spec edge case) */
        setDuplicateAlert(`HN ${payload.hn} มีทะเบียนฟื้นฟูที่ใช้งานอยู่แล้ว (${existing.courseNo || 'ไม่มีเลขที่ Course'}) — ใช้ “แก้ไข” แทนการขึ้นทะเบียนซ้ำ`);
        return;
      }
      if (existing) {
        setFormError(`HN ${payload.hn} เคยขึ้นทะเบียนแล้วและถูกยกเลิกอยู่ — ใช้ปุ่ม “เปิดใช้งานอีกครั้ง” ในรายการแทน`);
        return;
      }
      addRehabRegistration(payload);
    } else {
      /* Field-level diff label เพื่อให้ audit panel แสดงค่าที่เปลี่ยนได้ */
      const changed = [];
      if (payload.serviceType !== baseline.serviceType) {
        changed.push(`ประเภท → ${REHAB_SERVICE_TYPES.find((t) => t.value === payload.serviceType)?.label || payload.serviceType}`);
      }
      if (payload.cause !== baseline.cause) changed.push(`สาเหตุ → ${resolveRehabCause(payload.cause)?.label || payload.cause}`);
      if (payload.icd10 !== baseline.icd10) changed.push(`ICD-10 → ${payload.icd10}`);
      if (payload.imcPhase !== baseline.imcPhase) changed.push(`ระยะ IMC → ${resolveImcPhase(payload.imcPhase)?.label || '—'}`);
      if (payload.onsetDate !== baseline.onsetDate) changed.push(`วันเกิดโรค → ${formatRehabDate(payload.onsetDate)}`);
      if (payload.admitDate !== baseline.admitDate) changed.push(`วันรับเข้า → ${formatRehabDate(payload.admitDate)}`);
      if (String(payload.barthelAdmit ?? '') !== baseline.barthelAdmit) changed.push(`Barthel แรกรับ → ${payload.barthelAdmit ?? '—'}`);
      if (payload.referHospital !== baseline.referHospital) changed.push(`รพ.ที่ส่งต่อ → ${payload.referHospital || '—'}`);
      if (payload.owner !== baseline.owner) changed.push(`ผู้รับผิดชอบ → ${payload.owner}`);
      if (payload.courseNo !== baseline.courseNo) changed.push(`เลขที่ Course → ${payload.courseNo || '—'}`);
      if (String(payload.courseTotal ?? '') !== baseline.courseTotal) changed.push(`จำนวนครั้ง → ${payload.courseTotal ?? '—'}`);
      if (payload.dischargeStatus !== baseline.dischargeStatus) {
        changed.push(`สถานะจำหน่าย → ${resolveDischargeStatus(payload.dischargeStatus)?.label || payload.dischargeStatus}`);
      }
      updateRehabRegistration(payload.hn, {
        serviceType: payload.serviceType,
        cause: payload.cause,
        icd10: payload.icd10,
        imcPhase: payload.imcPhase,
        onsetDate: payload.onsetDate,
        admitDate: payload.admitDate,
        barthelAdmit: payload.barthelAdmit,
        referHospital: payload.referHospital,
        owner: payload.owner,
        courseNo: payload.courseNo,
        courseTotal: payload.courseTotal,
        dischargeStatus: payload.dischargeStatus,
      }, changed.join(' · ') || 'แก้ไขข้อมูลทะเบียน');
    }
    setFormMode(null);
    setFormError('');
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
    cancelRehabRegistration(cancelTarget.hn, cancelReason.trim());
    setCancelTarget(null);
    setTick((t) => t + 1);
  };

  const confirmReactivate = () => {
    reactivateRehabRegistration(reactivateTarget.hn);
    setReactivateTarget(null);
    setTick((t) => t + 1);
  };

  const viewCancellation = viewTarget ? getRehabCancellation(viewTarget.hn) : null;
  const viewProfile = viewTarget ? getPatientByHN(viewTarget.hn) : null;
  const viewGolden = viewTarget?.serviceType === 'imc' ? imcGoldenPeriod(viewTarget.onsetDate) : null;

  /* ── ตาราง ─────────────────────────────────────────────────────── */

  const renderGolden = (row) => {
    if (row.serviceType !== 'imc') return <ColorfulBadge style='grey' size='small' hierarchy='secondary'>ทั่วไป</ColorfulBadge>;
    const g = imcGoldenPeriod(row.onsetDate);
    const tone = !g ? 'blue' : g.expired ? 'red' : g.daysLeft <= 30 ? 'orange' : 'blue';
    return (
      <span className='inline-flex items-center flex-wrap' style={{ gap: 'var(--dim-space-100)' }}>
        <ColorfulBadge style={tone} size='small' hierarchy='secondary'>
          {!g ? 'IMC' : g.expired ? 'พ้นกรอบ 6 เดือน' : `เหลือ ${g.daysLeft} วัน`}
        </ColorfulBadge>
        {row.imcPhase && (
          <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
            {resolveImcPhase(row.imcPhase)?.label?.split(' — ')[0]}
          </span>
        )}
      </span>
    );
  };

  const columns = useMemo(() => ([
    { key: 'hn', label: 'HN' },
    {
      key: 'name', label: 'ชื่อ-นามสกุล', flex: true, minWidth: 160,
      render: (row) => <MaskedWorklistName name={row.name} recordKey={row.hn} />,
    },
    {
      key: 'cause', label: 'สาเหตุ / ICD-10',
      render: (row) => {
        const c = resolveRehabCause(row.cause);
        return (
          <span className='inline-flex items-center flex-wrap' style={{ gap: 'var(--dim-space-100)' }}>
            {c && <ColorfulBadge style={c.badge} size='small' hierarchy='secondary'>{c.short}</ColorfulBadge>}
            <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>{row.icd10 || '—'}</span>
          </span>
        );
      },
    },
    { key: 'imc', label: 'กลุ่ม / กรอบเวลา IMC', render: renderGolden },
    { key: 'onsetDate', label: 'วันเกิดโรค', render: (row) => formatRehabDate(row.onsetDate) },
    { key: 'admitDate', label: 'วันรับเข้า', render: (row) => formatRehabDate(row.admitDate) },
    { key: 'barthelAdmit', label: 'Barthel แรกรับ', render: (row) => (row.barthelAdmit != null ? `${row.barthelAdmit}` : '—') },
    {
      key: 'course', label: 'Course / ครั้งที่รับบริการ',
      render: (row) => (
        <span className='flex flex-col' style={{ gap: 'var(--dim-space-050)' }}>
          <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-default)' }}>{row.courseNo || '—'}</span>
          <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
            {`มารับบริการแล้ว ${getRehabVisitCount(row.hn)} ครั้ง${row.courseTotal ? ` / แผน ${row.courseTotal}` : ''}`}
          </span>
        </span>
      ),
    },
    { key: 'owner', label: 'ผู้รับผิดชอบ', flex: true, minWidth: 150 },
    {
      key: 'status', label: 'สถานะทะเบียน', sortable: false,
      render: (row) => {
        const cancellation = getRehabCancellation(row.hn);
        const discharge = resolveDischargeStatus(row.dischargeStatus);
        return (
          <span className='inline-flex items-center flex-wrap' style={{ gap: 'var(--dim-space-100)' }}>
            {cancellation
              ? <ColorfulBadge style='red' size='small' hierarchy='secondary'>ยกเลิกทะเบียนแล้ว</ColorfulBadge>
              : <ColorfulBadge style={DISCHARGE_BADGE[row.dischargeStatus] || 'blue'} size='small' hierarchy='secondary'>{discharge?.label || 'อยู่ระหว่างการฟื้นฟู'}</ColorfulBadge>}
          </span>
        );
      },
    },
    {
      key: 'actions', label: 'การดำเนินการ', sortable: false,
      render: (row) => {
        const cancellation = getRehabCancellation(row.hn);
        return (
          <span className='inline-flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
            <NeutralSubdueButton
              size='sm'
              leadingIcon='monitoring'
              onClick={(e) => { e.stopPropagation(); history.push({ pathname: '/clinic/rehab/followup', state: { hn: row.hn } }); }}
            >
              การติดตาม
            </NeutralSubdueButton>
            {canEdit && !cancellation && (
              <>
                <BrandSubdueButton
                  variant='outline'
                  size='sm'
                  leadingIcon='edit'
                  onClick={(e) => { e.stopPropagation(); openEdit(row); }}
                >
                  แก้ไข
                </BrandSubdueButton>
                <NeutralSubdueButton
                  size='sm'
                  leadingIcon='block'
                  onClick={(e) => { e.stopPropagation(); openCancel(row); }}
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
                onClick={(e) => { e.stopPropagation(); setReactivateTarget(row); }}
              >
                เปิดใช้งานอีกครั้ง
              </BrandSubdueButton>
            )}
          </span>
        );
      },
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ]), [canEdit, tick]);

  return (
    <QueuePageShell
      activeKey='treat'
      breadcrumb={breadcrumb}
      title='ทะเบียนผู้รับบริการฟื้นฟูและ Intermediate Care'
      onBack={() => history.push('/clinic/rehab')}
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
        title='รายละเอียดทะเบียนฟื้นฟู'
        subtitle={viewTarget ? `${viewTarget.name} · HN: ${viewTarget.hn}` : ''}
        tertiaryAction={{ label: 'ปิด', onClick: () => setViewTarget(null) }}
        secondaryAction={{ label: 'พิมพ์ทะเบียน', onClick: () => window.print() }}
        primaryAction={canEdit && viewTarget && !viewCancellation
          ? { label: 'แก้ไขทะเบียน', onClick: () => { const t = viewTarget; setViewTarget(null); openEdit(t); } }
          : undefined}
      >
        {viewTarget && (
          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
            <div
              className='grid grid-cols-1 md:grid-cols-2'
              style={{ gap: 'var(--dim-space-200)', fontSize: 'var(--type-size-sm)', color: 'var(--text-content-default)' }}
            >
              <span>HN: {viewTarget.hn}</span>
              <span>ชื่อ-สกุล: {viewProfile?.fullName || viewTarget.name}</span>
              <span>เพศ: {viewProfile?.sex || '—'}</span>
              <span>อายุ: {viewProfile?.age || '—'}</span>
              <span>เลขบัตรประชาชน: {viewProfile?.nationalId || '—'}</span>
              <span>สิทธิการรักษา: {viewProfile?.insurance || '—'}</span>
              <span>ประเภท: {REHAB_SERVICE_TYPES.find((t) => t.value === viewTarget.serviceType)?.label || '—'}</span>
              <span>ระยะ IMC: {resolveImcPhase(viewTarget.imcPhase)?.label || '—'}</span>
              <span>สาเหตุ: {resolveRehabCause(viewTarget.cause)?.label || '—'}</span>
              <span>ICD-10: {viewTarget.icd10 || '—'}</span>
              <span>วันเกิดโรค: {formatRehabDate(viewTarget.onsetDate)}</span>
              <span>วันรับเข้า: {formatRehabDate(viewTarget.admitDate)}</span>
              <span>Barthel แรกรับ: {viewTarget.barthelAdmit != null ? `${viewTarget.barthelAdmit} คะแนน` : '—'}</span>
              <span>โรงพยาบาลที่ส่งต่อ: {viewTarget.referHospital || '—'}</span>
              <span>เลขที่ Course: {viewTarget.courseNo || '—'}</span>
              <span>จำนวนครั้งตามแผน: {viewTarget.courseTotal ?? '—'}</span>
              <span>ผู้รับผิดชอบ: {viewTarget.owner || '—'}</span>
              <span>สถานะจำหน่าย: {resolveDischargeStatus(viewTarget.dischargeStatus)?.label || '—'}</span>
            </div>

            {viewGolden && (
              <div
                className='flex items-center'
                style={{
                  gap: 'var(--dim-space-200)',
                  paddingTop: 'var(--dim-space-300)',
                  paddingBottom: 'var(--dim-space-300)',
                  paddingLeft: 'var(--dim-space-400)',
                  paddingRight: 'var(--dim-space-400)',
                  borderRadius: 'var(--dim-radius-200)',
                  background: viewGolden.expired
                    ? 'var(--surface-danger-quaternary, #FFF0F0)'
                    : 'var(--surface-brandPrimary-quaternary, #F4FBF8)',
                  color: viewGolden.expired
                    ? 'var(--text-danger-default, #C72121)'
                    : 'var(--text-brandPrimary-default, #007549)',
                  fontSize: 'var(--type-size-sm)',
                }}
              >
                <Icon name='timer' size={18} />
                {viewGolden.expired
                  ? `พ้นกรอบเวลา Intermediate Care แล้วเมื่อ ${formatRehabDate(viewGolden.deadlineIso)}`
                  : `อยู่ในกรอบ Intermediate Care — ครบกำหนด ${formatRehabDate(viewGolden.deadlineIso)} (เหลือ ${viewGolden.daysLeft} วัน)`}
              </div>
            )}

            <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
              <NeutralSubdueButton
                size='sm'
                leadingIcon='assignment'
                onClick={() => history.push({ pathname: '/clinic/rehab/record', state: { hn: viewTarget.hn, name: viewTarget.name } })}
              >
                เปิดบันทึกการฟื้นฟู
              </NeutralSubdueButton>
              <NeutralSubdueButton
                size='sm'
                leadingIcon='monitoring'
                onClick={() => history.push({ pathname: '/clinic/rehab/followup', state: { hn: viewTarget.hn } })}
              >
                ดูการติดตาม
              </NeutralSubdueButton>
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
        title={formMode === 'edit' ? 'แก้ไขทะเบียนฟื้นฟู' : 'ขึ้นทะเบียนผู้รับบริการฟื้นฟู / IMC'}
        subtitle={formMode === 'edit' ? `${draft.name} · HN: ${draft.hn}` : 'TOR 1.10.10.6 — บันทึกทะเบียนใหม่'}
        tertiaryAction={{ label: 'ยกเลิก', onClick: requestCloseForm }}
        primaryAction={{ label: formMode === 'edit' ? 'บันทึกการแก้ไข' : 'บันทึกทะเบียน', onClick: saveForm }}
      >
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
          {formMode === 'create' && (
            <div className='flex items-start w-full flex-wrap' style={{ gap: 'var(--dim-space-400)' }}>
              <FormField label='HN' required hint='ค้นหาผู้รับบริการจากทะเบียนราษฎร์ได้ที่ระบบเวชระเบียน'>
                <InputField value={draft.hn} onChange={setField('hn')} placeholder='เช่น 67-00031' />
              </FormField>
              <FormField label='ชื่อ-สกุล' required>
                <InputField value={draft.name} onChange={setField('name')} placeholder='ชื่อ-สกุลผู้รับบริการ' />
              </FormField>
            </div>
          )}

          <div className='flex flex-col' style={{ gap: 'var(--dim-space-100)' }}>
            <FieldLabel required>ประเภทผู้รับบริการ</FieldLabel>
            <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
              {REHAB_SERVICE_TYPES.map((t) => (
                <SelectableTag
                  key={t.value}
                  label={t.label}
                  size='lg'
                  selected={draft.serviceType === t.value}
                  onClick={() => setDraft((d) => ({ ...d, serviceType: t.value, imcPhase: t.value === 'imc' ? d.imcPhase : '' }))}
                />
              ))}
            </div>
          </div>

          <div className='flex flex-col' style={{ gap: 'var(--dim-space-100)' }}>
            <FieldLabel required>สาเหตุหลักของการฟื้นฟู</FieldLabel>
            <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
              {REHAB_CAUSES.map((c) => (
                <SelectableTag
                  key={c.key}
                  label={`${c.short} — ${c.label}`}
                  size='lg'
                  selected={draft.cause === c.key}
                  onClick={() => pickCause(c.key)}
                />
              ))}
            </div>
          </div>

          <div className='flex items-start w-full flex-wrap' style={{ gap: 'var(--dim-space-400)' }}>
            <FormField label='รหัส ICD-10' hint='เติมอัตโนมัติจากสาเหตุที่เลือก — แก้ไขได้'>
              <InputField value={draft.icd10} onChange={setField('icd10')} placeholder='เช่น I69.3' />
            </FormField>
            {draft.serviceType === 'imc' && (
              <FormField label='ระยะ Intermediate Care' required>
                <Select
                  showLabel={false}
                  searchable={false}
                  size='lg'
                  value={draft.imcPhase}
                  onChange={setField('imcPhase')}
                  options={REHAB_IMC_PHASES}
                  placeholder='เลือกระยะ IMC'
                />
              </FormField>
            )}
          </div>

          <div className='flex items-start w-full flex-wrap' style={{ gap: 'var(--dim-space-400)' }}>
            <FormField label='วันที่เกิดโรค / บาดเจ็บ (Onset)' required hint='ใช้คำนวณกรอบเวลา Intermediate Care 6 เดือน'>
              <DatePicker
                showLabel={false}
                value={draft.onsetDate ? new Date(draft.onsetDate) : null}
                onChange={(d) => setDraft((prev) => ({ ...prev, onsetDate: d ? d.toISOString().slice(0, 10) : '' }))}
                placeholder='เลือกวันที่'
              />
            </FormField>
            <FormField label='วันที่รับเข้าโปรแกรมฟื้นฟู' required>
              <DatePicker
                showLabel={false}
                value={draft.admitDate ? new Date(draft.admitDate) : null}
                onChange={(d) => setDraft((prev) => ({ ...prev, admitDate: d ? d.toISOString().slice(0, 10) : '' }))}
                placeholder='เลือกวันที่'
              />
            </FormField>
            <FormField label='คะแนน Barthel แรกรับ' hint='0–100 คะแนน'>
              <InputField type='number' value={draft.barthelAdmit} onChange={setField('barthelAdmit')} placeholder='เช่น 45' />
            </FormField>
          </div>

          <div className='flex items-start w-full flex-wrap' style={{ gap: 'var(--dim-space-400)' }}>
            <FormField label='โรงพยาบาลที่ส่งต่อ'>
              <Select
                showLabel={false}
                size='lg'
                value={draft.referHospital}
                onChange={setField('referHospital')}
                options={REHAB_REFER_HOSPITALS.map((h) => ({ value: h, label: h }))}
                placeholder='เลือกหน่วยบริการที่ส่งต่อ'
              />
            </FormField>
            <FormField label='ผู้รับผิดชอบ' required>
              <Select
                showLabel={false}
                size='lg'
                value={draft.owner}
                onChange={setField('owner')}
                options={REHAB_THERAPIST_OPTIONS.map((t) => ({ value: t, label: t }))}
                placeholder='เลือกผู้รับผิดชอบ'
              />
            </FormField>
          </div>

          <div className='flex items-start w-full flex-wrap' style={{ gap: 'var(--dim-space-400)' }}>
            <FormField label='เลขที่ Course'>
              <InputField value={draft.courseNo} onChange={setField('courseNo')} placeholder='เช่น C-2569-030' />
            </FormField>
            <FormField label='จำนวนครั้งตามแผน'>
              <InputField type='number' value={draft.courseTotal} onChange={setField('courseTotal')} placeholder='เช่น 12' />
            </FormField>
            <FormField label='สถานะจำหน่าย'>
              <Select
                showLabel={false}
                searchable={false}
                size='lg'
                value={draft.dischargeStatus}
                onChange={setField('dischargeStatus')}
                options={REHAB_DISCHARGE_STATUS}
                placeholder='เลือกสถานะ'
              />
            </FormField>
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

      {/* ขึ้นทะเบียนซ้ำ — บล็อกด้วย AlertDialog */}
      <AlertDialog
        open={!!duplicateAlert}
        onClose={() => setDuplicateAlert('')}
        onCancel={() => setDuplicateAlert('')}
        onConfirm={() => setDuplicateAlert('')}
        type='warning'
        title='ผู้รับบริการรายนี้มีทะเบียนอยู่แล้ว'
        description={duplicateAlert}
        confirmLabel='เข้าใจแล้ว'
        showCancel={false}
      />

      {/* Dirty-check confirm */}
      <Popup
        open={discardConfirmOpen}
        onClose={() => setDiscardConfirmOpen(false)}
        title='ยกเลิกการแก้ไข?'
        subtitle='ข้อมูลที่แก้ไขไว้ยังไม่ได้บันทึก หากปิดหน้าต่างนี้ข้อมูลจะหายไป'
        tertiaryAction={{ label: 'แก้ไขต่อ', onClick: () => setDiscardConfirmOpen(false) }}
        primaryAction={{ label: 'ทิ้งการแก้ไข', onClick: discardForm, tone: 'danger' }}
      />

      {/* ยกเลิกทะเบียน — reason required */}
      <Popup
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        title='ยกเลิกทะเบียนฟื้นฟู'
        subtitle={cancelTarget ? `${cancelTarget.name} · HN: ${cancelTarget.hn}` : ''}
        tertiaryAction={{ label: 'ปิด', onClick: () => setCancelTarget(null) }}
        primaryAction={{ label: 'ยืนยันยกเลิกทะเบียน', onClick: confirmCancel, tone: 'danger' }}
      >
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200)' }}>
          <SuggestibleTextarea
            voice
            label='เหตุผลการยกเลิก'
            required
            value={cancelReason}
            onChange={(e) => { setCancelReason(e.target.value); if (cancelError) setCancelError(''); }}
            suggestions={REHAB_REGISTRY_CANCEL_SUGGESTIONS}
            minChars={2}
            placeholder='เช่น ย้ายไปรับการฟื้นฟูที่สถานพยาบาลอื่น / วินิจฉัยใหม่ไม่เข้าเกณฑ์'
          />
          <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
            ทะเบียนจะยังแสดงในรายการพร้อมป้าย “ยกเลิกทะเบียนแล้ว” ชื่อผู้ยกเลิกและเวลา —
            เปิดใช้งานใหม่ได้ภายหลัง
          </span>
          {cancelError && (
            <span
              className='inline-flex items-center'
              style={{ gap: 'var(--dim-space-100)', color: 'var(--text-danger-default, #C72121)', fontSize: 'var(--type-size-sm)' }}
            >
              <Icon name='error' size={14} />
              {cancelError}
            </span>
          )}
        </div>
      </Popup>

      {/* เปิดใช้งานอีกครั้ง — ยืนยันก่อน เพราะเป็นการคืนสิทธิเข้ารับบริการ */}
      <Popup
        open={!!reactivateTarget}
        onClose={() => setReactivateTarget(null)}
        title='เปิดใช้งานทะเบียนอีกครั้ง?'
        subtitle={reactivateTarget ? `${reactivateTarget.name} · HN: ${reactivateTarget.hn}` : ''}
        tertiaryAction={{ label: 'ปิด', onClick: () => setReactivateTarget(null) }}
        primaryAction={{ label: 'เปิดใช้งานอีกครั้ง', onClick: confirmReactivate }}
      >
        <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary)' }}>
          ทะเบียนจะกลับมาใช้งานได้ทันที และผู้รับบริการจะนัดหมายฟื้นฟูต่อได้
          ประวัติการยกเลิกเดิมยังคงอยู่ใน Audit Trail
        </span>
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
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder='ค้นหา HN / ชื่อ-สกุล / ICD-10 / เลขที่ Course / ผู้รับผิดชอบ'
                className='mih-rehab-registry-search-input flex-1'
                style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-primary)' }}
              />
              {search && (
                <button
                  type='button'
                  onClick={() => { setSearch(''); setPage(1); }}
                  aria-label='ล้างคำค้นหา'
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-content-tertiary)' }}
                >
                  <Icon name='close' size={16} />
                </button>
              )}
            </div>
            <Select showLabel={false} searchable={false} size='lg' value={typeFilter} onChange={(v) => { setTypeFilter(v); setPage(1); }} options={typeOptions} placeholder='ประเภท' />
            <Select showLabel={false} searchable={false} size='lg' value={causeFilter} onChange={(v) => { setCauseFilter(v); setPage(1); }} options={causeOptions} placeholder='สาเหตุ' />
            <Select showLabel={false} searchable={false} size='lg' value={statusFilter} onChange={(v) => { setStatusFilter(v); setPage(1); }} options={statusOptions} placeholder='สถานะ' />
            <Select showLabel={false} searchable={false} size='lg' value={ownerFilter} onChange={(v) => { setOwnerFilter(v); setPage(1); }} options={ownerOptions} placeholder='ผู้รับผิดชอบ' />
            {filtersActive && (
              <NeutralSubdueButton size='sm' leadingIcon='filter_alt_off' onClick={clearFilters}>
                ล้างตัวกรอง
              </NeutralSubdueButton>
            )}
          </div>

          <SearchResultCount found={filtered.length} total={rows.length} />

          <Table
            columns={columns}
            rows={pageRows}
            rowKey={(row) => row.hn}
            onRowClick={(row) => setViewTarget(row)}
            stickyColCount={2}
            emptyMessage={filtersActive
              ? 'ไม่พบทะเบียนที่ตรงกับคำค้นหาหรือตัวกรองที่เลือก'
              : 'ยังไม่มีผู้รับบริการในทะเบียนฟื้นฟู — กด “ขึ้นทะเบียนใหม่” เพื่อเริ่ม'}
          />

          {filtered.length === 0 && filtersActive && (
            <div className='flex items-center justify-center w-full'>
              <NeutralSubdueButton size='sm' leadingIcon='filter_alt_off' onClick={clearFilters}>
                ล้างตัวกรองและคำค้นหา
              </NeutralSubdueButton>
            </div>
          )}

          <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-200)' }}>
            <span style={{ color: 'var(--text-content-secondary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)' }}>
              {`แสดง ${rangeStart}–${rangeEnd} จาก ${filtered.length} รายการ (ทั้งหมด ${rows.length} ทะเบียน)`}
            </span>
            <div className='flex-1' />
            <Pagination currentPage={safePage} pageCount={totalPages} onPageChange={setPage} />
          </div>
        </section>
      </div>
    </QueuePageShell>
  );
};

export default RehabRegistryPage;
