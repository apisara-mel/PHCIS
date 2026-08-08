import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { ClinicFilterProvider } from '@/components/layout/HeaderClinicContext';
import PatientCard from '@/components/card/PatientCard';
import Icon from '@/components/icons/Icon';
import { SectionTitle, SubCard, FieldGrid, Field } from '@/components/forms/Fields';
import InputField from '@/components/forms/InputField';
import Select from '@/components/forms/Select';
import DatePicker from '@/components/forms/DatePicker';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import SelectableTag from '@/components/forms/SelectableTag';
import RadioButton from '@/components/radio/RadioButton';
import Table from '@/components/table/Table';
import Pagination from '@/components/pagination/Pagination';
import StatusBadge from '@/components/badge/StatusBadge';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import BrandPrimaryButton from '@/components/button/BrandPrimaryButton';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import DeleteQueueConfirmPopup from '@/components/popup/DeleteQueueConfirmPopup';
import UnsavedChangesPopup from '@/components/popup/UnsavedChangesPopup';
import SuccessToast from '@/components/toast/SuccessToast';
import PhcisTopToast from '@/components/alert/PhcisTopToast';
import { findMrPatientByHn, DEFAULT_MR_PATIENT } from '@/data/mrPatients';
import { getPatientByHN, DEFAULT_PATIENT } from '@/data/patientProfiles';
import {
  MOBILITY_OTHER_SUGGESTIONS,
  formatThaiBuddhistDate,
  parseThaiBuddhistDate,
  appendRegistrationAudit,
} from '@/data/registrationForm';
import {
  REGISTRATION_CURRENT_USER,
  REGISTRATION_VISITS,
  VISIT_CLINICS,
  VISIT_DOCTORS,
  VISIT_URGENCIES,
  VISIT_ARRIVALS,
  VISIT_CONDITIONS,
  VISIT_CHIEF_COMPLAINT_SUGGESTIONS,
  REFERRAL_REASON_SUGGESTIONS,
  REFERRAL_HOSPITALS,
  mobilityToConditionKey,
  peekNextVn,
  openVisit,
  updateVisit,
  cancelVisit,
  findOpenVisitsByHn,
  pushArrivalConfirmation,
} from '@/data/registrationVisits';

/* MIH RegistrationVisitOpenPage — TOR §1.1.2 "ส่งตรวจ / เปิด Visit"
   (คู่มือระบบเวชระเบียน.pdf บทที่ 2: ห้องบัตร → ส่งตรวจ → Visit Number).

   Entered from a queue-row "ส่งตรวจ" action or straight after a
   registration save, both of which pass `{ hn, queue }` through router
   state exactly like /registration/register does.

   TOR leaves closed here:
   · 1.1.2.1 — เปิด/แสดง/แก้ไข/ยกเลิก Visit Number (VN running number,
     ห้องตรวจ, อาการสำคัญ, แพทย์, ความเร่งด่วน + today's visit list)
   · 1.1.2.2 — นัดหมายล่วงหน้า → แจ้งเตือนยืนยันการมาผ่าน Mobile
     Application (SIMULATION: toast + log, ไม่มี push จริง)
   · 1.1.2.4 — การเข้ามาของผู้ป่วย (ห้องบัตร / นัดมา / ส่งมาจากสถานพยาบาลอื่น
     + refer-in block)
   · 1.1.2.5 — สภาพผู้รับบริการครั้งนี้ (per-visit; Step 5 mobility ระดับ
     ทะเบียนผู้ป่วยเป็นค่า default ที่ pre-select ให้เท่านั้น) */

const breadcrumb = ['ระบบงานเวชระเบียน', 'ส่งตรวจ (เปิด Visit)'];

const PAGE_SIZE = 5;

const buildEmptyVisitForm = (mr) => ({
  clinic: '',
  chiefComplaint: '',
  doctor: '',
  urgency: 'normal',
  arrival: 'walkin',
  referralHospital: '',
  referralDocNo: '',
  referralDate: '',
  referralReason: '',
  condition: mobilityToConditionKey(mr?.mobility),
  conditionOther: '',
});

const urgencyMeta = (key) =>
  VISIT_URGENCIES.find((u) => u.key === key) || VISIT_URGENCIES[0];
const arrivalLabel = (key) =>
  (VISIT_ARRIVALS.find((a) => a.key === key) || VISIT_ARRIVALS[0]).label;
const conditionLabel = (key) =>
  (VISIT_CONDITIONS.find((c) => c.key === key) || VISIT_CONDITIONS[0]).label;

/* Page-local banner — same visual contract as the NCD form page's context
   banners (token-only, no new DS component needed). */
const Banner = ({ tone = 'warning', icon, children, action }) => {
  const palette = tone === 'danger'
    ? { bg: 'var(--surface-danger-quaternary, #FFF0F0)', fg: 'var(--text-danger-default, #B91C1C)' }
    : tone === 'info'
      ? { bg: 'var(--surface-brandPrimary-quaternary, #F4FBF8)', fg: 'var(--text-brandPrimary-default, #007549)' }
      : { bg: 'var(--surface-alert-warning, #FFF9F0)', fg: 'var(--text-warning-default, #C2410C)' };
  return (
    <div
      className='flex items-center flex-wrap w-full'
      style={{
        gap: 'var(--dim-space-300, 12px)',
        paddingTop: 'var(--dim-space-300, 12px)',
        paddingBottom: 'var(--dim-space-300, 12px)',
        paddingLeft: 'var(--dim-space-400, 16px)',
        paddingRight: 'var(--dim-space-400, 16px)',
        borderRadius: 'var(--dim-radius-200, 8px)',
        background: palette.bg,
        color: palette.fg,
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-sm, 14px)',
        lineHeight: 1.5,
      }}
    >
      <Icon name={icon} size={18} />
      <span className='flex-1 min-w-0'>{children}</span>
      {action}
    </div>
  );
};

/* Inline validation message under a field (token-only). */
const FieldError = ({ children }) => (
  children ? (
    <span
      role='alert'
      className='inline-flex items-center'
      style={{
        gap: 'var(--dim-space-100, 4px)',
        color: 'var(--text-danger-default, #B91C1C)',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-xs, 12px)',
        lineHeight: 1.5,
      }}
    >
      <Icon name='error' size={14} />
      {children}
    </span>
  ) : null
);

const RegistrationVisitOpenPage = () => {
  const history = useHistory();
  const { state: navState, search } = useLocation();

  const mr = useMemo(
    () => (navState?.hn && findMrPatientByHn(navState.hn)) || DEFAULT_MR_PATIENT,
    [navState?.hn],
  );
  const cardPatient = useMemo(
    () => (navState?.hn && getPatientByHN(navState.hn)) || DEFAULT_PATIENT,
    [navState?.hn],
  );
  const hn = mr?.hn || cardPatient?.hn || '';
  /* ชื่อผู้รับบริการต้องมาจากแหล่งเดียว (patientProfiles = แหล่งที่ PatientCard
     และหน้าคิวใช้) ไม่งั้นการ์ดหัวหน้า / banner / ตาราง VN จะเรียกคนคนเดียวกัน
     คนละชื่อ เพราะ mrPatients กับ patientProfiles ไม่ตรงกันราย HN.
     `mr` เก็บไว้ใช้เฉพาะข้อมูลระดับทะเบียน (lifeStatus, mobility, สิทธิ, แพ้ยา). */
  const patientName = cardPatient?.fullName
    || `${mr?.prefixTh || ''}${mr?.firstNameTh || ''} ${mr?.lastNameTh || ''}`.trim()
    || '—';

  /* ── สิทธิผู้ใช้งาน (mock role) + สถานะผู้รับบริการ ───────────────── */
  const deceased = mr?.lifeStatus === 'deceased';
  /* read-only เข้าถึงได้ 3 ทาง: mock role gate, router state, และ ?readOnly=1
     บน URL (ทางที่ reviewer/QA ใช้เปิดสถานะ "สิทธิไม่พอ" ได้จริงโดยไม่ต้องแก้โค้ด) */
  const readOnlyQuery = useMemo(() => {
    const raw = String(search || '');
    if (!raw) return false;
    const value = new URLSearchParams(raw).get('readOnly');
    return value !== null && value !== '0' && value !== 'false';
  }, [search]);
  const readOnly = !REGISTRATION_CURRENT_USER.canEditMedicalRecords
    || !!navState?.readOnly
    || readOnlyQuery;
  /* สิทธิหมดอายุ / ยังไม่ผ่านการตรวจสอบ — จากข้อมูลสิทธิ (Step 4) */
  const rightsUnverified = Array.isArray(mr?.insurance)
    && mr.insurance.length > 0
    && mr.insurance.every((i) => !i.verified);
  const [selfPay, setSelfPay] = useState(false);

  /* ── form state ──────────────────────────────────────────────────── */
  const [form, setForm] = useState(() => buildEmptyVisitForm(mr));
  const [errors, setErrors] = useState({});
  const [editingId, setEditingId] = useState(null);
  const dirtyRef = useRef(false);
  const set = (key) => (value) => {
    dirtyRef.current = true;
    setForm((s) => ({ ...s, [key]: value }));
    setErrors((e) => (e[key] ? { ...e, [key]: '' } : e));
  };

  /* ── list state ──────────────────────────────────────────────────── */
  const [listVersion, setListVersion] = useState(0);
  const [onlyThisPatient, setOnlyThisPatient] = useState(true);
  const [page, setPage] = useState(1);
  const bump = useCallback(() => setListVersion((v) => v + 1), []);

  /* Visibility of system status — แถวที่เพิ่งเปิด / แก้ไข / ยกเลิก ต้องอยู่ในสายตา
     เสมอ. openVisit() unshift แถวใหม่ไปหน้าแรก ถ้าเจ้าหน้าที่ยืนอยู่หน้า 2+ จะเห็น
     แต่ toast สำเร็จโดยหาแถวไม่เจอ — จึงเลื่อนไปหน้าที่แถวนั้นอยู่จริง (ไม่ใช่
     บังคับหน้า 1 เพราะการแก้ไข/ยกเลิกไม่ได้ย้ายลำดับแถว) */
  const focusRow = useCallback((id) => {
    const list = onlyThisPatient
      ? REGISTRATION_VISITS.filter((v) => v.hn === hn)
      : REGISTRATION_VISITS;
    const idx = list.findIndex((v) => v.id === id);
    setPage(idx < 0 ? 1 : Math.floor(idx / PAGE_SIZE) + 1);
  }, [hn, onlyThisPatient]);

  const visits = useMemo(() => {
    const all = REGISTRATION_VISITS;
    return onlyThisPatient ? all.filter((v) => v.hn === hn) : all;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hn, onlyThisPatient, listVersion]);

  const pageCount = Math.max(1, Math.ceil(visits.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageRows = visits.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  /* VN ค้างอยู่วันนี้ของ HN นี้ — warning เท่านั้น (ยังเปิดใหม่ได้) */
  const openVisitsToday = useMemo(
    () => findOpenVisitsByHn(hn).filter((v) => v.id !== editingId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [hn, editingId, listVersion],
  );

  /* ── toasts ──────────────────────────────────────────────────────── */
  const [toastSession, setToastSession] = useState(null);
  const toastSeqRef = useRef(0);
  const showToast = (variant, message) =>
    setToastSession({ id: ++toastSeqRef.current, variant, message });
  const [successToast, setSuccessToast] = useState('');

  /* ── validation (TOR 1.1.2.1 / 1.1.2.4 / 1.1.2.5) ─────────────────── */
  const validate = (f) => {
    const next = {};
    if (!String(f.clinic || '').trim()) next.clinic = 'เลือกห้องตรวจ / คลินิกปลายทาง';
    if (!String(f.chiefComplaint || '').trim()) next.chiefComplaint = 'ระบุอาการสำคัญของผู้รับบริการ';
    if (f.arrival === 'referral' && !String(f.referralHospital || '').trim()) {
      next.referralHospital = 'เลือกสถานพยาบาลต้นทางก่อนเปิด Visit';
    }
    if (!f.condition) next.condition = 'เลือกสภาพผู้รับบริการครั้งนี้';
    if (f.condition === 'other' && !String(f.conditionOther || '').trim()) {
      next.conditionOther = 'ระบุรายละเอียดสภาพผู้รับบริการ (อื่นๆ)';
    }
    return next;
  };

  const buildPayload = (f) => ({
    hn,
    patientName,
    clinic: f.clinic,
    doctor: f.doctor,
    urgency: f.urgency,
    arrival: f.arrival,
    chiefComplaint: f.chiefComplaint,
    condition: f.condition,
    conditionOther: f.condition === 'other' ? f.conditionOther : '',
    referral: f.arrival === 'referral'
      ? {
        hospital: f.referralHospital,
        docNo: f.referralDocNo,
        date: f.referralDate,
        reason: f.referralReason,
      }
      : null,
  });

  const resetForm = () => {
    setForm(buildEmptyVisitForm(mr));
    setErrors({});
    setEditingId(null);
    dirtyRef.current = false;
  };

  /* ── บันทึก (เปิด VN ใหม่ / บันทึกการแก้ไข) ──────────────────────────
     Returns true when the record was actually written, so the
     UnsavedChangesPopup's "บันทึกและออก" can navigate only on success. */
  const handleSave = () => {
    if (readOnly) return false;
    if (deceased) {
      showToast('error', 'ผู้รับบริการรายนี้ถูกระบุสถานะเสียชีวิต — เปิด Visit ไม่ได้');
      return false;
    }
    const next = validate(form);
    setErrors(next);
    const missing = Object.values(next).filter(Boolean);
    if (missing.length > 0) {
      showToast('error', `เปิด Visit ไม่ได้ — ข้อมูลไม่ครบ: ${missing.join(' · ')}`);
      return false;
    }

    if (editingId) {
      /* อัตลักษณ์ของแถว (HN + ชื่อ) ห้ามถูกเขียนทับด้วยผู้รับบริการที่เปิดหน้านี้อยู่
         — buildPayload ใส่ hn/patientName ระดับหน้าเสมอ ถ้าปล่อยไว้ VN ของคนอื่น
         จะถูกย้ายมาเป็นของคนนี้เงียบ ๆ (handleEdit บล็อกไว้ชั้นแรกแล้ว นี่คือชั้นสอง) */
      const target = REGISTRATION_VISITS.find((v) => v.id === editingId);
      const updated = updateVisit(editingId, {
        ...buildPayload(form),
        hn: target?.hn ?? hn,
        patientName: target?.patientName ?? patientName,
      });
      if (!updated) {
        showToast('error', 'แก้ไขไม่ได้ — VN นี้ถูกยกเลิกไปแล้ว');
        return false;
      }
      appendRegistrationAudit({
        step: 'เวชระเบียน',
        field: `แก้ไข Visit ${updated.vn}`,
        oldValue: 'ข้อมูลการส่งตรวจเดิม',
        newValue: `${updated.clinic} · ${urgencyMeta(updated.urgency).label} · ${arrivalLabel(updated.arrival)}`,
      });
      bump();
      focusRow(updated.id);
      resetForm();
      setSuccessToast(`บันทึกการแก้ไข ${updated.vn} สำเร็จ`);
      return true;
    }

    const created = openVisit(buildPayload(form));
    appendRegistrationAudit({
      step: 'เวชระเบียน',
      field: `เปิด Visit ${created.vn}`,
      oldValue: '—',
      newValue: `${created.clinic} · ${urgencyMeta(created.urgency).label} · ${arrivalLabel(created.arrival)}`,
    });
    bump();
    focusRow(created.id);
    resetForm();
    setSuccessToast(`เปิด Visit ${created.vn} สำเร็จ — ส่งผู้รับบริการไปที่ ${created.clinic}`);

    /* TOR 1.1.2.2 — นัดหมายล่วงหน้า → แจ้งเตือนยืนยันการมาผ่าน Mobile App
       (SIMULATION: log + toast เท่านั้น ไม่มี push จริง) */
    if (created.arrival === 'appointment') {
      pushArrivalConfirmation({
        hn,
        patientName,
        queue: navState?.queue || created.vn,
        message: `ยืนยันการมาตามนัด ${created.clinic}`,
      });
      showToast('success', 'ส่งการแจ้งเตือนยืนยันการมาตามนัดผ่าน Mobile Application แล้ว (จำลอง)');
    }
    return true;
  };

  /* ── แก้ไข VN เดิม ───────────────────────────────────────────────── */
  const handleEdit = (row) => {
    if (readOnly) return;
    if (row.status === 'cancelled') {
      showToast('error', `VN ${row.vn} ถูกยกเลิกแล้ว — แก้ไขไม่ได้`);
      return;
    }
    /* ตัวกรอง "ทั้งหน่วยบริการ" แสดง VN ของผู้รับบริการรายอื่นด้วย — ฟอร์มนี้
       ผูกกับ HN ที่เปิดหน้าอยู่ (การ์ดผู้รับบริการด้านบน) การแก้ไขข้ามรายจึงจะ
       ทำให้ VN นั้นถูกย้ายเจ้าของ ต้องบล็อกไว้ที่ต้นทาง */
    if (row.hn && hn && row.hn !== hn) {
      showToast(
        'error',
        `VN ${row.vn} เป็นของ ${row.patientName || 'ผู้รับบริการรายอื่น'} (HN ${row.hn}) — แก้ไขจากหน้านี้ไม่ได้ กรุณาเปิดหน้าส่งตรวจของ HN นั้นก่อน`,
      );
      return;
    }
    setEditingId(row.id);
    setErrors({});
    dirtyRef.current = false;
    setForm({
      clinic: row.clinic || '',
      chiefComplaint: row.chiefComplaint || '',
      doctor: row.doctor || '',
      urgency: row.urgency || 'normal',
      arrival: row.arrival || 'walkin',
      referralHospital: row.referral?.hospital || '',
      referralDocNo: row.referral?.docNo || '',
      referralDate: row.referral?.date || '',
      referralReason: row.referral?.reason || '',
      condition: row.condition || 'walk',
      conditionOther: row.conditionOther || '',
    });
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /* ── ยกเลิก VN (confirm popup + audit) ───────────────────────────── */
  const [cancelTarget, setCancelTarget] = useState(null);
  const handleConfirmCancel = () => {
    const row = cancelTarget;
    setCancelTarget(null);
    if (!row) return;
    const cancelled = cancelVisit(row.id);
    if (!cancelled) return;
    appendRegistrationAudit({
      step: 'เวชระเบียน',
      field: `ยกเลิก Visit ${cancelled.vn}`,
      oldValue: `${cancelled.clinic} · ${urgencyMeta(cancelled.urgency).label}`,
      newValue: `ยกเลิกโดย ${cancelled.cancelledBy} เวลา ${cancelled.cancelledAt}`,
    });
    if (editingId === row.id) resetForm();
    bump();
    focusRow(cancelled.id);
    setSuccessToast(`ยกเลิก ${cancelled.vn} แล้ว — รายการยังคงแสดงในประวัติพร้อมผู้ยกเลิก`);
  };

  /* ── ออกจากหน้าที่มีการแก้ไขค้าง ─────────────────────────────────── */
  const [unsavedOpen, setUnsavedOpen] = useState(false);
  const leavePathRef = useRef('/registration/queue');
  const requestLeave = (path) => {
    leavePathRef.current = path;
    if (dirtyRef.current) setUnsavedOpen(true);
    else history.push(path);
  };

  /* ── table ───────────────────────────────────────────────────────── */
  const columns = useMemo(() => [
    {
      key: 'vn',
      header: 'VN',
      sortable: true,
      render: (row) => (
        <span style={{
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-sm, 14px)',
          fontWeight: 'var(--type-weight-medium, 500)',
          color: 'var(--text-content-default, #363B3F)',
        }}>
          {row.vn}
        </span>
      ),
    },
    { key: 'time', header: 'เวลา', sortable: true },
    {
      key: 'patientName',
      header: 'ผู้รับบริการ',
      sortable: true,
      render: (row) => `${row.patientName || '—'} (${row.hn || '—'})`,
    },
    { key: 'clinic', header: 'ห้องตรวจ / คลินิก', sortable: true },
    {
      key: 'urgency',
      header: 'ความเร่งด่วน',
      render: (row) => {
        const u = urgencyMeta(row.urgency);
        return <StatusBadge style={u.badge} size='small' showDot>{u.label}</StatusBadge>;
      },
    },
    {
      key: 'arrival',
      header: 'การเข้ามา',
      render: (row) => (
        <span className='inline-flex items-center' style={{ gap: 'var(--dim-space-150, 6px)' }}>
          {arrivalLabel(row.arrival)}
          {row.referral?.hospital && (
            <ColorfulBadge style='indigo' size='small' hierarchy='secondary'>
              {row.referral.hospital}
            </ColorfulBadge>
          )}
        </span>
      ),
    },
    {
      key: 'condition',
      header: 'สภาพผู้รับบริการ',
      render: (row) => (row.condition === 'other'
        ? (row.conditionOther || 'อื่นๆ')
        : conditionLabel(row.condition))},
    {
      key: 'status',
      header: 'สถานะ',
      render: (row) => (row.status === 'cancelled'
        ? (
          <span className='inline-flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
            <StatusBadge style='error' size='small' showDot>ยกเลิก</StatusBadge>
            <span style={{
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-xs, 12px)',
              color: 'var(--text-content-tertiary, #858C92)',
            }}>
              {`โดย ${row.cancelledBy || '—'} · ${row.cancelledAt || '—'}`}
            </span>
          </span>
        )
        : (
          <span className='inline-flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
            <StatusBadge style='success' size='small' showDot>รอตรวจ</StatusBadge>
            <span style={{
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-xs, 12px)',
              color: 'var(--text-content-tertiary, #858C92)',
            }}>
              {`เปิดโดย ${row.openedBy || '—'} · ${row.openedAt || '—'}`}
            </span>
          </span>
        )),
    },
    {
      key: 'actions',
      header: 'การดำเนินการ',
      render: (row) => {
        const locked = row.status === 'cancelled' || readOnly;
        return (
          <div className='flex items-center' style={{ gap: 'var(--dim-space-150, 6px)' }}>
            <BrandSubdueButton
              variant='outline'
              size='sm'
              leadingIcon='edit'
              disabled={locked}
              onClick={locked ? undefined : () => handleEdit(row)}
            >
              แก้ไข
            </BrandSubdueButton>
            <NeutralSubdueButton
              variant='outline'
              size='sm'
              disabled={locked}
              onClick={locked ? undefined : () => setCancelTarget(row)}
            >
              ยกเลิก VN
            </NeutralSubdueButton>
          </div>
        );
      },
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [readOnly, hn]);

  const formDisabled = readOnly || deceased;
  /* SelectableTag ยังไม่มี prop `disabled` ใน DS (component กลาง — ห้ามแก้จากโมดูลนี้)
     จึงห่อกลุ่มไว้เพื่อให้สถานะ read-only / เสียชีวิต "ดูกดไม่ได้" จริง ๆ
     ไม่ใช่แค่ onClick เป็น undefined เงียบ ๆ */
  const tagGroupDisabledStyle = {
    opacity: formDisabled ? 0.5 : 1,
    pointerEvents: formDisabled ? 'none' : 'auto',
  };
  const isReferral = form.arrival === 'referral';

  return (
    <ClinicFilterProvider>
      <div
        className='flex w-full min-h-screen'
        style={{ background: 'var(--background-screen-brand-100, #F4FBF8)' }}
      >
        <Sidebar activeKey='registration' />
        <div className='flex-1 min-w-0 flex flex-col'>
          <Header breadcrumb={breadcrumb} standalone={false} />

          <PatientCard
            sticky
            patient={cardPatient}
            title='ส่งตรวจ / เปิด Visit (ห้องบัตร)'
            onBack={() => requestLeave('/registration/queue')}
            drugAllergies={mr?.drugAllergies}
            chronicDiseases={mr?.chronicDiseases}
            tags={
              <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                <ColorfulBadge style='teal' size='small' hierarchy='secondary'>
                  {`VN ถัดไป: ${editingId ? 'แก้ไขรายการเดิม' : peekNextVn()}`}
                </ColorfulBadge>
                {navState?.queue && (
                  <ColorfulBadge style='blue' size='small' hierarchy='secondary'>
                    {`คิว ${navState.queue}`}
                  </ColorfulBadge>
                )}
                {deceased && (
                  <StatusBadge style='neutral' size='small' showDot>เสียชีวิต</StatusBadge>
                )}
              </div>
            }
            actions={
              <div className='flex items-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                <NeutralSubdueButton
                  leadingIcon='arrow_back'
                  onClick={() => requestLeave('/registration/queue')}
                >
                  กลับรายการคิว
                </NeutralSubdueButton>
              </div>
            }
          />

          {/* Context banners — non-blocking ยกเว้นเคสเสียชีวิต */}
          <div
            className='flex flex-col w-full'
            style={{
              gap: 'var(--dim-space-200, 8px)',
              paddingTop: 'var(--dim-space-300, 12px)',
              paddingLeft: 'var(--dim-space-600, 24px)',
              paddingRight: 'var(--dim-space-600, 24px)',
            }}
          >
            {deceased && (
              <Banner tone='danger' icon='block'>
                {`ทะเบียนของ ${patientName} ถูกระบุสถานะ "เสียชีวิต"`}
                {mr?.deceasedDate ? ` เมื่อ ${mr.deceasedDate}` : ''}
                {' — ไม่สามารถเปิด Visit (ส่งตรวจ) ได้ หากเป็นการบันทึกผิดพลาดให้แก้ไขที่ทะเบียนผู้รับบริการก่อน'}
              </Banner>
            )}
            {readOnly && (
              <Banner tone='info' icon='lock'>
                บัญชีผู้ใช้งานนี้ไม่มีสิทธิแก้ไขเวชระเบียน — แสดงข้อมูลได้อย่างเดียว (read-only) และซ่อนปุ่มบันทึก
              </Banner>
            )}
            {rightsUnverified && !selfPay && (
              <Banner
                tone='warning'
                icon='shield_question'
                action={
                  <NeutralSubdueButton
                    size='sm'
                    leadingIcon='payments'
                    onClick={() => {
                      setSelfPay(true);
                      showToast('success', 'ตั้งการเรียกเก็บครั้งนี้เป็น "ชำระเงินเอง" แล้ว — ไม่กระทบการเปิด Visit');
                    }}
                  >
                    ใช้สิทธิชำระเงินเอง
                  </NeutralSubdueButton>
                }
              >
                {`สิทธิการรักษา "${mr?.rights || '—'}" ยังไม่ผ่านการตรวจสอบ / หมดอายุ — เปิด Visit ต่อได้ตามปกติ แต่แนะนำให้ตรวจสอบสิทธิหรือเลือกชำระเงินเอง`}
              </Banner>
            )}
            {selfPay && (
              <Banner tone='info' icon='payments'>
                ครั้งนี้เรียกเก็บแบบชำระเงินเอง — แจ้งผู้รับบริการที่จุดการเงินก่อนกลับ
              </Banner>
            )}
            {openVisitsToday.length > 0 && (
              <Banner tone='warning' icon='error'>
                {`ผู้รับบริการรายนี้มี Visit ค้างอยู่วันนี้แล้ว (${openVisitsToday.map((v) => `${v.vn} · ${v.clinic}`).join(' , ')}) — เปิด Visit ใหม่ได้ แต่โปรดตรวจสอบว่าไม่ซ้ำซ้อน`}
              </Banner>
            )}
          </div>

          {/* ── ฟอร์มส่งตรวจ ─────────────────────────────────────────── */}
          <div
            className='flex flex-col w-full'
            style={{
              gap: 'var(--dim-space-500, 20px)',
              paddingTop: 'var(--dim-space-400, 16px)',
              paddingBottom: 'var(--dim-space-800, 32px)',
              paddingLeft: 'var(--dim-space-600, 24px)',
              paddingRight: 'var(--dim-space-600, 24px)',
            }}
          >
            <div
              className='flex flex-col w-full'
              style={{
                gap: 'var(--dim-space-500, 20px)',
                borderRadius: 'var(--dim-radius-400, 12px)',
                background: 'var(--surface-card-100, #FFFFFF)',
                border: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary, #F4F5F5)',
                paddingTop: 'var(--dim-space-600, 24px)',
                paddingBottom: 'var(--dim-space-600, 24px)',
                paddingLeft: 'var(--dim-space-600, 24px)',
                paddingRight: 'var(--dim-space-600, 24px)',
              }}
            >
              <div className='flex items-center w-full flex-wrap' style={{ gap: 'var(--dim-space-300, 12px)' }}>
                <SectionTitle icon='stethoscope'>
                  {editingId ? 'แก้ไขข้อมูลการส่งตรวจ' : 'เปิด Visit Number (ส่งตรวจ)'}
                </SectionTitle>
                <div className='flex-1' />
                <ColorfulBadge style='teal' size='small' hierarchy='secondary'>
                  {editingId
                    ? `กำลังแก้ไข ${visits.find((v) => v.id === editingId)?.vn || ''}`
                    : `VN ที่จะได้รับ: ${peekNextVn()}`}
                </ColorfulBadge>
              </div>

              {/* 1.1.2.1 — ห้องตรวจ / แพทย์ / ความเร่งด่วน */}
              <FieldGrid cols={3} rowGap='var(--dim-space-400, 16px)' columnGap='var(--dim-space-400, 16px)'>
                <Field label='ห้องตรวจ / คลินิกปลายทาง' required>
                  <Select
                    value={form.clinic}
                    onChange={set('clinic')}
                    options={VISIT_CLINICS}
                    placeholder='เลือกห้องตรวจ'
                    disabled={formDisabled}
                    error={errors.clinic}
                    showHelperText={!!errors.clinic}
                    helperText={errors.clinic}
                  />
                </Field>
                <Field label='แพทย์ผู้ตรวจ' hint='ไม่บังคับ — ระบุภายหลังที่ห้องตรวจได้'>
                  <Select
                    value={form.doctor}
                    onChange={set('doctor')}
                    options={VISIT_DOCTORS}
                    placeholder='เลือกแพทย์ (ถ้ามี)'
                    disabled={formDisabled}
                  />
                </Field>
                <Field label='ความเร่งด่วน' required>
                  <div
                    role='group'
                    aria-label='ความเร่งด่วน'
                    aria-disabled={formDisabled}
                    className='flex items-center flex-wrap'
                    style={{ gap: 'var(--dim-space-200, 8px)', ...tagGroupDisabledStyle }}
                  >
                    {VISIT_URGENCIES.map((u) => (
                      <SelectableTag
                        key={u.key}
                        label={u.label}
                        selected={form.urgency === u.key}
                        onClick={formDisabled ? undefined : () => set('urgency')(u.key)}
                        ariaLabel={`ความเร่งด่วน ${u.label}`}
                      />
                    ))}
                  </div>
                </Field>
              </FieldGrid>

              {/* 1.1.2.1 — อาการสำคัญ (clinician-typed → SuggestibleTextarea) */}
              <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                <SuggestibleTextarea
                  voice
                  label='อาการสำคัญ (Chief complaint)'
                  required
                  disabled={formDisabled}
                  value={form.chiefComplaint}
                  onChange={set('chiefComplaint')}
                  suggestions={VISIT_CHIEF_COMPLAINT_SUGGESTIONS}
                  minChars={2}
                  placeholder='เช่น ไข้ ไอ เจ็บคอ 2 วัน / มาตามนัดรับยาความดัน'
                />
                <FieldError>{errors.chiefComplaint}</FieldError>
              </div>

              {/* 1.1.2.4 — การเข้ามาของผู้ป่วย */}
              <SubCard surfaceTone='neutral' title='การเข้ามาของผู้รับบริการ'>
                <div
                  role='radiogroup'
                  aria-label='การเข้ามาของผู้รับบริการ'
                  className='flex items-stretch flex-wrap w-full'
                  style={{ gap: 'var(--dim-space-300, 12px)' }}
                >
                  {VISIT_ARRIVALS.map((a) => (
                    <RadioButton
                      key={a.key}
                      name='visit-arrival'
                      value={a.key}
                      checked={form.arrival === a.key}
                      onChange={set('arrival')}
                      disabled={formDisabled}
                      title={a.label}
                      showDescription={false}
                      showCircleIcon={false}
                      showIcon={false}
                      showBadge={false}
                      showBadgeTitle={false}
                    />
                  ))}
                </div>

                {isReferral && (
                  <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400, 16px)' }}>
                    <FieldGrid cols={3} rowGap='var(--dim-space-400, 16px)' columnGap='var(--dim-space-400, 16px)'>
                      <Field label='สถานพยาบาลต้นทาง' required>
                        <Select
                          value={form.referralHospital}
                          onChange={set('referralHospital')}
                          options={REFERRAL_HOSPITALS}
                          placeholder='ค้นหา / เลือกสถานพยาบาล'
                          searchable
                          disabled={formDisabled}
                          error={errors.referralHospital}
                          showHelperText={!!errors.referralHospital}
                          helperText={errors.referralHospital}
                        />
                      </Field>
                      <Field label='เลขที่หนังสือส่งตัว'>
                        <InputField
                          value={form.referralDocNo}
                          onChange={set('referralDocNo')}
                          placeholder='เช่น รพ.กลาง/2569/00412'
                          disabled={formDisabled}
                        />
                      </Field>
                      <Field label='วันที่ส่งตัว'>
                        <DatePicker
                          size='lg'
                          value={parseThaiBuddhistDate(form.referralDate)}
                          onChange={(d) => set('referralDate')(d ? formatThaiBuddhistDate(d) : '')}
                          format={formatThaiBuddhistDate}
                          placeholder='วว/ดด/ปปปป'
                          showLabel={false}
                          showHelperText={false}
                          disabled={formDisabled}
                        />
                      </Field>
                    </FieldGrid>
                    <SuggestibleTextarea
                      voice
                      label='การวินิจฉัย / เหตุผลที่ส่งตัว'
                      disabled={formDisabled}
                      value={form.referralReason}
                      onChange={set('referralReason')}
                      suggestions={REFERRAL_REASON_SUGGESTIONS}
                      minChars={2}
                      placeholder='เช่น ส่งต่อเพื่อรับยาต่อเนื่องใกล้บ้าน'
                    />
                  </div>
                )}
              </SubCard>

              {/* 1.1.2.5 — สภาพผู้รับบริการครั้งนี้ (per-visit) */}
              <SubCard surfaceTone='neutral' title='สภาพผู้รับบริการครั้งนี้'>
                <span style={{
                  fontFamily: 'var(--type-family-body)',
                  fontSize: 'var(--type-size-xs, 12px)',
                  color: 'var(--text-content-tertiary, #858C92)',
                  lineHeight: 1.5,
                }}>
                  {`ค่าเริ่มต้นมาจากทะเบียนผู้รับบริการ (การเคลื่อนไหว: ${mr?.mobility || '—'}) — เลือกใหม่ได้เฉพาะการมาครั้งนี้ โดยไม่กระทบข้อมูลระดับทะเบียน`}
                </span>
                <div
                  role='group'
                  aria-label='สภาพผู้รับบริการครั้งนี้'
                  aria-disabled={formDisabled}
                  className='flex items-center flex-wrap w-full'
                  style={{ gap: 'var(--dim-space-200, 8px)', ...tagGroupDisabledStyle }}
                >
                  {VISIT_CONDITIONS.map((c) => (
                    <SelectableTag
                      key={c.key}
                      label={c.label}
                      selected={form.condition === c.key}
                      onClick={formDisabled ? undefined : () => set('condition')(c.key)}
                      ariaLabel={`สภาพผู้รับบริการ ${c.label}`}
                    />
                  ))}
                </div>
                <FieldError>{errors.condition}</FieldError>
                {form.condition === 'other' && (
                  <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                    <SuggestibleTextarea
                      voice
                      label='ระบุสภาพผู้รับบริการ (อื่นๆ)'
                      required
                      disabled={formDisabled}
                      value={form.conditionOther}
                      onChange={set('conditionOther')}
                      suggestions={MOBILITY_OTHER_SUGGESTIONS}
                      minChars={2}
                      placeholder='เช่น ใช้ไม้เท้าช่วยพยุง / ญาติประคอง'
                    />
                    <FieldError>{errors.conditionOther}</FieldError>
                  </div>
                )}
              </SubCard>

              {/* Actions — บันทึก / ยกเลิก (ซ่อนปุ่มบันทึกเมื่อ read-only) */}
              <div className='flex items-center w-full flex-wrap' style={{ gap: 'var(--dim-space-300, 12px)' }}>
                <div className='flex-1' />
                <NeutralSubdueButton
                  leadingIcon='close'
                  onClick={() => {
                    if (editingId) {
                      resetForm();
                      showToast('success', 'ยกเลิกการแก้ไขแล้ว — ข้อมูล VN เดิมไม่ถูกเปลี่ยนแปลง');
                      return;
                    }
                    resetForm();
                  }}
                >
                  {editingId ? 'ยกเลิกการแก้ไข' : 'ล้างฟอร์ม'}
                </NeutralSubdueButton>
                {!readOnly && (
                  <BrandPrimaryButton
                    leadingIcon={editingId ? 'save' : 'add_circle'}
                    disabled={deceased}
                    onClick={handleSave}
                  >
                    {editingId ? 'บันทึกการแก้ไข Visit' : 'เปิด Visit และส่งตรวจ'}
                  </BrandPrimaryButton>
                )}
              </div>
            </div>

            {/* ── รายการ Visit วันนี้ (แสดง / แก้ไข / ยกเลิก) ─────────── */}
            <div
              className='flex flex-col w-full'
              style={{
                gap: 'var(--dim-space-400, 16px)',
                borderRadius: 'var(--dim-radius-400, 12px)',
                background: 'var(--surface-card-100, #FFFFFF)',
                border: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary, #F4F5F5)',
                paddingTop: 'var(--dim-space-600, 24px)',
                paddingBottom: 'var(--dim-space-500, 20px)',
                paddingLeft: 'var(--dim-space-600, 24px)',
                paddingRight: 'var(--dim-space-600, 24px)',
              }}
            >
              <div className='flex items-center w-full flex-wrap' style={{ gap: 'var(--dim-space-300, 12px)' }}>
                <SectionTitle icon='list_alt'>รายการ Visit วันนี้</SectionTitle>
                <div className='flex-1' />
                <SelectableTag
                  label='เฉพาะผู้รับบริการรายนี้'
                  selected={onlyThisPatient}
                  onClick={() => { setOnlyThisPatient((v) => !v); setPage(1); }}
                  ariaLabel='กรองเฉพาะผู้รับบริการรายนี้'
                />
                <SelectableTag
                  label='ทั้งหน่วยบริการ'
                  selected={!onlyThisPatient}
                  onClick={() => { setOnlyThisPatient(false); setPage(1); }}
                  ariaLabel='แสดง Visit ทั้งหน่วยบริการ'
                />
              </div>

              <Table
                columns={columns}
                rows={pageRows}
                rowKey={(row) => row.id}
                emptyMessage='ยังไม่มีรายการ Visit'
                emptySubtext={onlyThisPatient
                  ? 'ผู้รับบริการรายนี้ยังไม่ถูกส่งตรวจในวันนี้ — กรอกแบบฟอร์มด้านบนเพื่อเปิด Visit'
                  : 'ยังไม่มีการส่งตรวจในวันนี้'}
              />

              {visits.length > PAGE_SIZE && (
                <div
                  className='flex w-full justify-end'
                  style={{
                    borderTop: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary, #E2F3EB)',
                    paddingTop: 'var(--dim-space-300, 12px)',
                  }}
                >
                  <Pagination currentPage={safePage} pageCount={pageCount} onPageChange={setPage} />
                </div>
              )}
            </div>
          </div>

          <Footer />
        </div>

        {/* ยกเลิก VN — confirm (แถวยังคงอยู่พร้อม badge + audit) */}
        <DeleteQueueConfirmPopup
          open={!!cancelTarget}
          onClose={() => setCancelTarget(null)}
          onConfirm={handleConfirmCancel}
          title='ยืนยันการยกเลิก Visit'
          subtitle='รายการจะยังคงแสดงในประวัติพร้อมสถานะ "ยกเลิก" ผู้ยกเลิก และเวลา — และจะแก้ไขไม่ได้อีก'
          queue={cancelTarget?.vn}
          hn={cancelTarget?.hn}
          patientName={cancelTarget?.patientName}
          avatarSrc={cardPatient?.avatarUrl}
        />

        <UnsavedChangesPopup
          open={unsavedOpen}
          onClose={() => setUnsavedOpen(false)}
          onSave={() => {
            setUnsavedOpen(false);
            /* บันทึกก่อนออก — ถ้า validation ไม่ผ่าน ให้ค้างอยู่หน้าเดิม
               พร้อม error toast แทนที่จะพาออกไปโดยข้อมูลหาย */
            if (handleSave()) history.push(leavePathRef.current);
          }}
          onDiscard={() => {
            setUnsavedOpen(false);
            dirtyRef.current = false;
            history.push(leavePathRef.current);
          }}
          title='ยังไม่ได้บันทึกข้อมูลการส่งตรวจ'
          description='ข้อมูลที่กรอกไว้ในแบบฟอร์มเปิด Visit จะหายไปหากออกจากหน้านี้'
        />

        <PhcisTopToast session={toastSession} onDismiss={() => setToastSession(null)} />
        <SuccessToast
          open={!!successToast}
          message={successToast}
          onClose={() => setSuccessToast('')}
        />
      </div>
    </ClinicFilterProvider>
  );
};

export default RegistrationVisitOpenPage;
