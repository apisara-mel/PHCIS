import React, { useMemo, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import PatientCard from '@/components/card/PatientCard';
import Icon from '@/components/icons/Icon';
import InputField from '@/components/forms/InputField';
import Select from '@/components/forms/Select';
import DatePicker from '@/components/forms/DatePicker';
import TimePicker from '@/components/forms/TimePicker';
import Textarea from '@/components/forms/Textarea';
import SelectableTag from '@/components/forms/SelectableTag';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import DangerSubdueButton from '@/components/button/DangerSubdueButton';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import Table from '@/components/table/Table';
import Popup from '@/components/popup/Popup';
import EpiScheduleMatrix from '@/pages/clinic/immunization/EpiScheduleMatrix';
import {
  getActiveVaccines,
  getVaccineById,
  getVaccineLots,
  resolveLotWarning,
  isLotExpired,
  resolveVaccineRoute,
  INJECTION_SITE_OPTIONS,
  resolveInjectionSite,
} from '@/data/immunizationVaccines';
import {
  IMM_CHILDREN,
  IMM_CURRENT_USER,
  IMM_NURSES,
  EMPTY_DOSE,
  EMPTY_AEFI,
  AEFI_SEVERITY,
  AEFI_SEVERITY_STYLE,
  resolveAefiSeverity,
  AEFI_SYMPTOM_SUGGESTIONS,
  AEFI_TREATMENT_SUGGESTIONS,
  getImmChild,
  getImmPatientCard,
  getImmIntake,
  getImmRegistrationByHn,
  getImmDoses,
  getActiveImmDoses,
  saveImmDose,
  cancelImmDose,
  restoreImmDose,
  getAefiRecords,
  saveAefi,
  cancelAefi,
  restoreAefi,
  describeDose,
  buildEpiMatrix,
  summarizeEpi,
  logImmPrint,
  getImmPrintLog,
  formatImmDate,
  formatImmDateTime,
  formatAgeYMD,
  formatAgeShort,
  todayIso,
  hasImmunizationRights,
  setImmunizationRights,
} from '@/data/immunizationClinic';

/* ImmunizationVaccineBookPage — สมุดวัคซีน / ทะเบียนวัคซีนรายคน
   (TOR §1.11.2.1–.5). หัวใจของ IIS: ทุกเข็มมีครบ 4 กริยา —

     แสดง   — ตาราง EPI completeness + ประวัติย้อนหลังทั้งหมด (รวมเข็มที่ถูกยกเลิก)
     บันทึก — เพิ่มเข็มใหม่ รวมกรณี "รับจากหน่วยงานอื่น" (§1.11.2.2)
     แก้ไข  — แก้เข็มเดิม โดยเก็บ audit ผู้แก้ไข + เวลา
     ยกเลิก — soft cancel พร้อมเหตุผล แถวเดิมยังอยู่ให้ดูย้อนหลัง (§1.11.2.3)

   บวก AEFI (§1.11.2.5) ที่ผูกกับเข็มอ้างอิง และการพิมพ์สมุด/หนังสือรับรอง. */

const breadcrumb = ['ระบบบันทึกการรักษา', 'งานสร้างเสริมภูมิคุ้มกัน', 'สมุดวัคซีน'];

const TABS = [
  { key: 'matrix',  label: 'ความครบถ้วนตามเกณฑ์ EPI', icon: 'fact_check' },
  { key: 'history', label: 'ประวัติการได้รับวัคซีน',    icon: 'history' },
  { key: 'aefi',    label: 'อาการไม่พึงประสงค์ (AEFI)', icon: 'e911_emergency' },
];

const Card = ({ children }) => (
  <div
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
    {children}
  </div>
);

const TopicHeader = ({ icon, children }) => (
  <div className='flex items-center gap-2 w-full'>
    <span className='text-brand-500'><Icon name={icon} size={20} /></span>
    <h2 className='text-base font-bold text-brand-500'>{children}</h2>
  </div>
);

const Field = ({ label, required, children, hint, hintTone, width }) => (
  <div className='flex flex-col gap-1.5 min-w-0' style={{ flex: width ? `0 0 ${width}px` : '1 1 0', minWidth: 180 }}>
    <div className='flex items-center text-sm text-ink leading-snug'>
      <span>{label}</span>
      {required && <span className='ml-0.5' style={{ color: 'var(--text-input-require)' }}>*</span>}
    </div>
    {children}
    {hint && (
      <span style={{
        color: hintTone === 'error'
          ? 'var(--text-danger-default, #B91C1C)'
          : hintTone === 'warning'
            ? 'var(--text-warning-default, #C2410C)'
            : 'var(--text-content-quaternary, #ADB2B7)',
        fontSize: 'var(--type-size-xs)',
      }}>
        {hint}
      </span>
    )}
  </div>
);

const Banner = ({ tone = 'info', icon = 'info', children }) => {
  const palette = {
    info:    { bg: 'var(--surface-brandPrimary-quaternary, #F4FBF8)', fg: 'var(--text-brandPrimary-default, #007549)' },
    warning: { bg: 'var(--surface-warning-quaternary, #FFF9F0)',      fg: 'var(--text-warning-default, #C2410C)' },
    danger:  { bg: 'var(--surface-danger-quaternary, #FFF0F0)',       fg: 'var(--text-danger-default, #B91C1C)' },
    neutral: { bg: 'var(--surface-card-quaternary, #F9FBFB)',         fg: 'var(--text-content-secondary, #636B72)' },
  }[tone];
  return (
    <div
      className='flex items-start gap-2 w-full'
      style={{
        paddingTop: 'var(--dim-space-300, 12px)',
        paddingBottom: 'var(--dim-space-300, 12px)',
        paddingLeft: 'var(--dim-space-400, 16px)',
        paddingRight: 'var(--dim-space-400, 16px)',
        borderRadius: 'var(--dim-radius-200, 8px)',
        background: palette.bg,
        color: palette.fg,
        fontSize: 'var(--type-size-sm)',
      }}
    >
      <Icon name={icon} size={18} />
      <span className='min-w-0'>{children}</span>
    </div>
  );
};

const AuditLine = ({ children }) => (
  <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>{children}</span>
);

const ImmunizationVaccineBookPage = () => {
  const history = useHistory();
  const { state: navState } = useLocation();

  const [hn, setHn] = useState(navState?.hn || IMM_CHILDREN[0].hn);
  const [activeTab, setActiveTab] = useState('matrix');
  const [tick, setTick] = useState(0);
  const [printTick, setPrintTick] = useState(0);
  const [showCancelled, setShowCancelled] = useState(true);

  /* dose editor */
  const [doseDraft, setDoseDraft] = useState(null);
  const [doseErrors, setDoseErrors] = useState([]);
  const [doseCancelTarget, setDoseCancelTarget] = useState(null);
  const [doseCancelReason, setDoseCancelReason] = useState('');
  const [doseCancelError, setDoseCancelError] = useState('');

  /* AEFI editor */
  const [aefiDraft, setAefiDraft] = useState(null);
  const [aefiErrors, setAefiErrors] = useState([]);
  const [aefiCancelTarget, setAefiCancelTarget] = useState(null);
  const [aefiCancelReason, setAefiCancelReason] = useState('');
  const [aefiCancelError, setAefiCancelError] = useState('');

  const canWrite = hasImmunizationRights();

  const child = useMemo(() => getImmChild(hn), [hn]);
  const cardPatient = useMemo(() => getImmPatientCard(hn), [hn]);
  const intake = useMemo(() => getImmIntake(hn), [hn]);
  const registration = useMemo(() => getImmRegistrationByHn(hn), [hn]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const doses = useMemo(() => getImmDoses(hn), [hn, tick]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const activeDoses = useMemo(() => getActiveImmDoses(hn), [hn, tick]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const matrix = useMemo(() => buildEpiMatrix(hn), [hn, tick]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const epi = useMemo(() => summarizeEpi(hn), [hn, tick]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const aefiRecords = useMemo(() => getAefiRecords(hn), [hn, tick]);
  const printLog = useMemo(() => getImmPrintLog(hn), [hn, printTick]);

  const visibleDoses = showCancelled ? doses : doses.filter((d) => d.status !== 'cancelled');

  const doPrint = (docType) => { logImmPrint(hn, docType); setPrintTick((t) => t + 1); };

  /* ── dose CRUD ───────────────────────────────────────────────────── */
  const openNewDose = (prefill) => {
    setDoseErrors([]);
    setDoseDraft({ ...EMPTY_DOSE, hn, date: todayIso(), nurse: IMM_CURRENT_USER, ...(prefill || {}) });
  };

  const openEditDose = (dose) => {
    setDoseErrors([]);
    setDoseDraft({ ...dose });
  };

  const setDoseField = (key) => (value) => setDoseDraft((d) => ({ ...d, [key]: value }));

  const draftVaccine = doseDraft?.vaccineId ? getVaccineById(doseDraft.vaccineId) : null;
  const draftLots = draftVaccine ? getVaccineLots(draftVaccine.id) : [];
  const draftLot = draftLots.find((l) => l.lotNo === doseDraft?.lotNo) || null;
  const draftLotWarning = resolveLotWarning(draftLot);

  const validateDose = (d) => {
    const errs = [];
    if (!d.vaccineId) errs.push('กรุณาเลือกวัคซีน');
    if (!d.seq) errs.push('กรุณาระบุครั้งที่/เข็มที่');
    if (!d.date) errs.push('กรุณาระบุวันที่รับวัคซีน');
    if (!d.site) errs.push('กรุณาระบุตำแหน่งที่ให้วัคซีน');
    if (!d.lotNo) errs.push('กรุณาระบุ Lot No.');
    if (!d.expiry) errs.push('กรุณาระบุวันหมดอายุ');
    if (d.expiry && isLotExpired(d.expiry) && d.date >= todayIso()) {
      errs.push('วัคซีนหมดอายุแล้ว — บันทึกการให้วัคซีนวันนี้ไม่ได้');
    }
    if (d.otherFacility && !d.facilityName) errs.push('กรุณาระบุชื่อสถานพยาบาลที่ให้วัคซีน');
    if (!d.otherFacility && !d.nurse) errs.push('กรุณาระบุพยาบาลผู้ให้วัคซีน');
    if (d.immediateReaction && !d.reactionOnsetTime) errs.push('กรอกอาการผิดปกติแล้ว ต้องระบุเวลาที่เริ่มมีอาการ');
    if (child?.birthDate && d.date && d.date < child.birthDate) {
      errs.push('วันที่รับวัคซีนต้องไม่ก่อนวันเกิดของเด็ก');
    }
    return errs;
  };

  const commitDose = () => {
    const errs = validateDose(doseDraft);
    if (errs.length > 0) { setDoseErrors(errs); return; }
    saveImmDose({ ...doseDraft, hn });
    setDoseDraft(null);
    setDoseErrors([]);
    setTick((t) => t + 1);
  };

  const confirmDoseCancel = () => {
    if (!doseCancelReason.trim()) { setDoseCancelError('กรุณาระบุเหตุผลการยกเลิกเข็มวัคซีน'); return; }
    cancelImmDose(doseCancelTarget.id, doseCancelReason.trim());
    setDoseCancelTarget(null);
    setDoseCancelReason('');
    setTick((t) => t + 1);
  };

  /* ── AEFI CRUD ───────────────────────────────────────────────────── */
  const openNewAefi = (doseId) => {
    setAefiErrors([]);
    setAefiDraft({ ...EMPTY_AEFI, hn, doseId: doseId || '', reportedBy: IMM_CURRENT_USER });
  };

  const openEditAefi = (rec) => {
    setAefiErrors([]);
    setAefiDraft({ ...rec });
  };

  const setAefiField = (key) => (value) => setAefiDraft((a) => ({ ...a, [key]: value }));

  const validateAefi = (a) => {
    const errs = [];
    if (!a.doseId) errs.push('กรุณาเลือกเข็มวัคซีนที่อ้างอิง');
    if (!a.symptom.trim()) errs.push('กรุณาระบุอาการที่พบ');
    if (!a.onsetDate) errs.push('กรุณาระบุวันที่เริ่มมีอาการ');
    if (!a.onsetTime) errs.push('กรุณาระบุเวลาที่เริ่มมีอาการ');
    if (!a.severity) errs.push('กรุณาระบุความรุนแรง');
    const ref = doses.find((d) => d.id === a.doseId);
    if (ref && a.onsetDate && a.onsetDate < ref.date) {
      errs.push('วันที่เริ่มมีอาการต้องไม่ก่อนวันที่ได้รับวัคซีนเข็มที่อ้างอิง');
    }
    return errs;
  };

  const commitAefi = () => {
    const errs = validateAefi(aefiDraft);
    if (errs.length > 0) { setAefiErrors(errs); return; }
    saveAefi({ ...aefiDraft, hn });
    setAefiDraft(null);
    setAefiErrors([]);
    setTick((t) => t + 1);
  };

  const confirmAefiCancel = () => {
    if (!aefiCancelReason.trim()) { setAefiCancelError('กรุณาระบุเหตุผลการยกเลิกรายการ'); return; }
    cancelAefi(aefiCancelTarget.id, aefiCancelReason.trim());
    setAefiCancelTarget(null);
    setAefiCancelReason('');
    setTick((t) => t + 1);
  };

  /* ── columns ─────────────────────────────────────────────────────── */
  const doseColumns = useMemo(() => ([
    { key: 'date', label: 'วันที่-เวลา', render: (r) => `${formatImmDate(r.date)}${r.time ? ` ${r.time} น.` : ''}` },
    { key: 'age', label: 'อายุที่ได้รับ', render: (r) => formatAgeShort(child?.birthDate, r.date) },
    { key: 'vaccine', label: 'ชื่อวัคซีน', flex: true, minWidth: 220, render: (r) => `${getVaccineById(r.vaccineId)?.abbr || '—'} — ${getVaccineById(r.vaccineId)?.nameTh || ''}` },
    { key: 'seq', label: 'ครั้งที่' },
    { key: 'route', label: 'วิธีบริหาร', render: (r) => resolveVaccineRoute(getVaccineById(r.vaccineId)?.route) },
    { key: 'dose', label: 'ขนาด', render: (r) => getVaccineById(r.vaccineId)?.dose || '—' },
    { key: 'site', label: 'ตำแหน่ง', render: (r) => resolveInjectionSite(r.site) },
    { key: 'lotNo', label: 'Lot No.' },
    { key: 'expiry', label: 'วันหมดอายุ', render: (r) => formatImmDate(r.expiry) },
    { key: 'vialNo', label: 'ขวดที่', render: (r) => r.vialNo || '—' },
    {
      key: 'place', label: 'สถานที่รับวัคซีน', flex: true, minWidth: 200,
      render: (r) => (r.otherFacility ? (
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
          <ColorfulBadge style='indigo' size='small' hierarchy='secondary'>หน่วยงานอื่น</ColorfulBadge>
          <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
            {r.facilityName}{r.reference ? ` · อ้างอิง ${r.reference}` : ''}
          </span>
        </div>
      ) : (r.place || '—')),
    },
    { key: 'nurse', label: 'พยาบาลผู้ให้', flex: true, minWidth: 160, render: (r) => r.nurse || '—' },
    {
      key: 'reaction', label: 'อาการผิดปกติ', flex: true, minWidth: 180,
      render: (r) => (r.immediateReaction
        ? `${r.immediateReaction}${r.reactionOnsetTime ? ` (เริ่ม ${r.reactionOnsetTime} น.)` : ''}`
        : 'ไม่พบ'),
    },
    {
      key: 'status', label: 'สถานะ',
      render: (r) => (r.status === 'cancelled' ? (
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }} title={r.cancellation?.reason}>
          <ColorfulBadge style='red' size='small' hierarchy='secondary'>ยกเลิกแล้ว</ColorfulBadge>
          {r.cancellation && <AuditLine>เหตุผล: {r.cancellation.reason}</AuditLine>}
        </div>
      ) : (
        <ColorfulBadge style='green' size='small' hierarchy='secondary'>บันทึกแล้ว</ColorfulBadge>
      )),
    },
    {
      key: 'audit', label: 'ผู้บันทึก / แก้ไข', flex: true, minWidth: 220,
      render: (r) => (
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
          <AuditLine>บันทึกโดย {r.recordedBy} · {formatImmDateTime(r.recordedAt)}</AuditLine>
          {r.editedBy && <AuditLine>แก้ไขโดย {r.editedBy} · {formatImmDateTime(r.editedAt)}</AuditLine>}
          {r.cancellation && <AuditLine>ยกเลิกโดย {r.cancellation.by} · {formatImmDateTime(r.cancellation.at)}</AuditLine>}
        </div>
      ),
    },
    {
      key: 'actions', label: 'การดำเนินการ', sortable: false,
      render: (r) => (
        <div className='flex items-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          {r.status === 'cancelled' ? (
            <BrandSubdueButton
              variant='outline' size='sm' leadingIcon='restart_alt'
              disabled={!canWrite}
              onClick={() => { if (canWrite) { restoreImmDose(r.id); setTick((t) => t + 1); } }}
            >
              คืนรายการ
            </BrandSubdueButton>
          ) : (
            <>
              <NeutralSubdueButton size='sm' leadingIcon='edit' disabled={!canWrite} onClick={() => canWrite && openEditDose(r)}>
                แก้ไข
              </NeutralSubdueButton>
              <BrandSubdueButton
                variant='outline' size='sm' leadingIcon='e911_emergency'
                disabled={!canWrite}
                onClick={() => { if (canWrite) { setActiveTab('aefi'); openNewAefi(r.id); } }}
              >
                บันทึก AEFI
              </BrandSubdueButton>
              <DangerSubdueButton
                size='sm' leadingIcon='block'
                disabled={!canWrite}
                onClick={() => {
                  if (!canWrite) return;
                  setDoseCancelReason('');
                  setDoseCancelError('');
                  setDoseCancelTarget(r);
                }}
              >
                ยกเลิก
              </DangerSubdueButton>
            </>
          )}
        </div>
      ),
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ]), [canWrite, child, tick]);

  const aefiColumns = useMemo(() => ([
    { key: 'onset', label: 'วัน-เวลาที่เริ่มมีอาการ', render: (r) => `${formatImmDate(r.onsetDate)}${r.onsetTime ? ` ${r.onsetTime} น.` : ''}` },
    { key: 'dose', label: 'เข็มที่อ้างอิง', flex: true, minWidth: 200, render: (r) => describeDose(doses.find((d) => d.id === r.doseId)) },
    { key: 'symptom', label: 'อาการที่พบ', flex: true, minWidth: 280 },
    { key: 'severity', label: 'ความรุนแรง', render: (r) => (
      <ColorfulBadge style={AEFI_SEVERITY_STYLE[r.severity] || 'grey'} size='small' hierarchy='secondary'>
        {resolveAefiSeverity(r.severity)}
      </ColorfulBadge>
    ) },
    { key: 'treatment', label: 'การรักษา/จัดการ', flex: true, minWidth: 260 },
    { key: 'outcome', label: 'ผลลัพธ์', flex: true, minWidth: 200, render: (r) => r.outcome || '—' },
    { key: 'reportedBy', label: 'ผู้รายงาน', flex: true, minWidth: 160 },
    {
      key: 'status', label: 'สถานะ',
      render: (r) => (r.status === 'cancelled' ? (
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }} title={r.cancellation?.reason}>
          <ColorfulBadge style='red' size='small' hierarchy='secondary'>ยกเลิกแล้ว</ColorfulBadge>
          {r.cancellation && <AuditLine>เหตุผล: {r.cancellation.reason}</AuditLine>}
        </div>
      ) : <ColorfulBadge style='green' size='small' hierarchy='secondary'>บันทึกแล้ว</ColorfulBadge>),
    },
    {
      key: 'audit', label: 'ผู้บันทึก / แก้ไข', flex: true, minWidth: 220,
      render: (r) => (
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
          <AuditLine>บันทึกโดย {r.recordedBy} · {formatImmDateTime(r.recordedAt)}</AuditLine>
          {r.editedBy && <AuditLine>แก้ไขโดย {r.editedBy} · {formatImmDateTime(r.editedAt)}</AuditLine>}
        </div>
      ),
    },
    {
      key: 'actions', label: 'การดำเนินการ', sortable: false,
      render: (r) => (
        <div className='flex items-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          {r.status === 'cancelled' ? (
            <BrandSubdueButton
              variant='outline' size='sm' leadingIcon='restart_alt'
              disabled={!canWrite}
              onClick={() => { if (canWrite) { restoreAefi(r.id); setTick((t) => t + 1); } }}
            >
              คืนรายการ
            </BrandSubdueButton>
          ) : (
            <>
              <NeutralSubdueButton size='sm' leadingIcon='edit' disabled={!canWrite} onClick={() => canWrite && openEditAefi(r)}>
                แก้ไข
              </NeutralSubdueButton>
              <DangerSubdueButton
                size='sm' leadingIcon='block'
                disabled={!canWrite}
                onClick={() => {
                  if (!canWrite) return;
                  setAefiCancelReason('');
                  setAefiCancelError('');
                  setAefiCancelTarget(r);
                }}
              >
                ยกเลิก
              </DangerSubdueButton>
            </>
          )}
        </div>
      ),
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ]), [canWrite, doses, tick]);

  const isEditingDose = !!doseDraft?.id;
  const isEditingAefi = !!aefiDraft?.id;

  return (
    <QueuePageShell
      activeKey='treat'
      breadcrumb={breadcrumb}
      title='สมุดวัคซีน / ทะเบียนวัคซีนรายบุคคล'
      onBack={() => history.push('/clinic/immunization')}
      backLabel='กลับหน้าคิว'
      actions={(
        <div className='flex items-center' style={{ gap: 'var(--dim-space-300, 12px)' }}>
          <div style={{ minWidth: 280 }}>
            <Select
              showLabel={false} searchable size='md'
              value={hn}
              onChange={(v) => { setHn(v); setTick((t) => t + 1); }}
              options={IMM_CHILDREN.map((c) => ({ value: c.hn, label: `${c.hn} · ${c.fullName}` }))}
              placeholder='เลือกเด็ก'
            />
          </div>
          <NeutralSubdueButton
            size='sm'
            leadingIcon={canWrite ? 'lock_open' : 'lock'}
            onClick={() => { setImmunizationRights(!hasImmunizationRights()); setTick((t) => t + 1); }}
            title='สลับสิทธิปฏิบัติงานคลินิกเด็กดี (สำหรับทดสอบ)'
          >
            {canWrite ? 'สิทธิ: แก้ไขได้' : 'สิทธิ: อ่านอย่างเดียว'}
          </NeutralSubdueButton>
          <BrandSubdueButton variant='outline' leadingIcon='print' onClick={() => doPrint('สมุดบันทึกการได้รับวัคซีน')}>
            พิมพ์สมุดวัคซีน
          </BrandSubdueButton>
          <BrandSubdueButton variant='outline' leadingIcon='workspace_premium' onClick={() => doPrint('หนังสือรับรองการได้รับวัคซีน')}>
            พิมพ์หนังสือรับรอง
          </BrandSubdueButton>
        </div>
      )}
      tabs={TABS}
      activeTab={activeTab}
      onTabChange={setActiveTab}
    >
      {/* ── dose editor popup ───────────────────────────────────────── */}
      <Popup
        open={!!doseDraft}
        onClose={() => setDoseDraft(null)}
        title={isEditingDose ? 'แก้ไขการได้รับวัคซีน' : 'บันทึกการได้รับวัคซีน'}
        subtitle={`${child?.fullName || ''} · HN ${hn} · อายุ ${formatAgeYMD(child?.birthDate)}`}
        size='large'
        tertiaryAction={{ label: 'ยกเลิก', onClick: () => setDoseDraft(null) }}
        primaryAction={{ label: isEditingDose ? 'บันทึกการแก้ไข' : 'บันทึกเข็มวัคซีน', onClick: commitDose }}
      >
        {doseDraft && (
          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400, 16px)' }}>
            {doseErrors.length > 0 && (
              <Banner tone='danger' icon='error'>
                <span className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
                  {doseErrors.map((e) => <span key={e}>• {e}</span>)}
                </span>
              </Banner>
            )}

            <div className='flex items-center gap-2 flex-wrap'>
              <SelectableTag
                label='รับวัคซีนจากหน่วยงานอื่น (บันทึกย้อนหลัง)'
                size='lg'
                selected={!!doseDraft.otherFacility}
                onClick={() => setDoseDraft((d) => ({ ...d, otherFacility: !d.otherFacility }))}
              />
              <SelectableTag
                label='ส่งเบิกค่าบริการ'
                size='lg'
                selected={!!doseDraft.claimSubmitted}
                onClick={() => setDoseDraft((d) => ({ ...d, claimSubmitted: !d.claimSubmitted }))}
              />
            </div>

            {doseDraft.otherFacility && (
              <Banner tone='neutral' icon='info'>
                เข็มที่รับจากหน่วยงานอื่นจะไม่ตัดสต๊อกของหน่วยบริการ และจะแสดงป้าย &quot;หน่วยงานอื่น&quot; ในสมุดวัคซีน
              </Banner>
            )}

            <div className='flex items-start gap-4 w-full flex-wrap'>
              <Field label='ชื่อวัคซีน' required>
                <Select
                  showLabel={false} searchable size='lg'
                  value={doseDraft.vaccineId}
                  onChange={(v) => {
                    const vac = getVaccineById(v);
                    setDoseDraft((d) => ({ ...d, vaccineId: v, lotNo: '', expiry: '', site: vac?.route === 'PO' ? 'oral' : d.site }));
                  }}
                  options={getActiveVaccines().map((v) => ({ value: v.id, label: `${v.abbr} — ${v.nameTh}` }))}
                  placeholder='เลือกวัคซีน'
                />
              </Field>
              <Field label='ครั้งที่ / เข็มที่' required width={150}>
                <Select
                  showLabel={false} searchable={false} size='lg'
                  value={String(doseDraft.seq)}
                  onChange={(v) => setDoseField('seq')(Number(v))}
                  options={[1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: `ครั้งที่ ${n}` }))}
                  placeholder='เลือก'
                />
              </Field>
              <Field label='วันที่รับวัคซีน' required>
                <DatePicker
                  showLabel={false}
                  value={doseDraft.date ? new Date(doseDraft.date) : null}
                  onChange={(d) => setDoseField('date')(d ? d.toISOString().slice(0, 10) : '')}
                  placeholder='เลือกวันที่'
                />
              </Field>
              <Field label='เวลาที่ให้' width={160}>
                <TimePicker showLabel={false} value={doseDraft.time} onChange={setDoseField('time')} placeholder='--:--' />
              </Field>
            </div>

            {draftVaccine && (
              <Banner tone='neutral' icon='info'>
                วิธีบริหาร {resolveVaccineRoute(draftVaccine.route)} · ขนาด {draftVaccine.dose}
                {doseDraft.date ? ` · อายุ ณ วันที่รับ ${formatAgeShort(child?.birthDate, doseDraft.date)}` : ''}
              </Banner>
            )}

            <div className='flex items-start gap-4 w-full flex-wrap'>
              <Field label='ตำแหน่งที่ให้' required>
                <Select
                  showLabel={false} searchable={false} size='lg'
                  value={doseDraft.site} onChange={setDoseField('site')}
                  options={INJECTION_SITE_OPTIONS} placeholder='เลือกตำแหน่ง'
                />
              </Field>
              <Field
                label='Lot No. (จากคลัง)'
                hint={draftLotWarning
                  ? draftLotWarning.message
                  : (draftVaccine && draftLots.length === 0 ? 'คลังไม่มี lot ของวัคซีนนี้ — คีย์ Lot No. เองในช่องถัดไป' : undefined)}
                hintTone={draftLotWarning ? (draftLotWarning.blocking ? 'error' : 'warning') : undefined}
              >
                <Select
                  showLabel={false} searchable size='lg'
                  value={doseDraft.lotNo}
                  onChange={(lotNo) => {
                    const lot = draftLots.find((l) => l.lotNo === lotNo);
                    setDoseDraft((d) => ({ ...d, lotNo, expiry: lot?.expiry || d.expiry }));
                  }}
                  options={draftLots.map((l) => ({ value: l.lotNo, label: `${l.lotNo} · หมดอายุ ${formatImmDate(l.expiry)} · คงเหลือ ${l.remaining}` }))}
                  placeholder={draftLots.length === 0 ? 'คลังไม่มีข้อมูล lot' : 'เลือก Lot No.'}
                />
              </Field>
              <Field label='Lot No. (คีย์เอง)' required>
                <InputField
                  showLabel={false} showHelperText={false} showLeadingIcon={false}
                  value={doseDraft.lotNo} onChange={(v) => setDoseField('lotNo')(v)}
                  placeholder='เช่น ROTA-6912'
                />
              </Field>
            </div>

            <div className='flex items-start gap-4 w-full flex-wrap'>
              <Field label='วันหมดอายุ' required>
                <DatePicker
                  showLabel={false}
                  value={doseDraft.expiry ? new Date(doseDraft.expiry) : null}
                  onChange={(d) => setDoseField('expiry')(d ? d.toISOString().slice(0, 10) : '')}
                  placeholder='เลือกวันหมดอายุ'
                />
              </Field>
              <Field label='ขวดที่' width={140}>
                <InputField
                  showLabel={false} showHelperText={false} showLeadingIcon={false}
                  value={doseDraft.vialNo} onChange={(v) => setDoseField('vialNo')(v)}
                  placeholder='เช่น 3'
                />
              </Field>
              {doseDraft.otherFacility ? (
                <>
                  <Field label='ชื่อสถานพยาบาล' required>
                    <InputField
                      showLabel={false} showHelperText={false} showLeadingIcon={false}
                      value={doseDraft.facilityName} onChange={(v) => setDoseField('facilityName')(v)}
                      placeholder='เช่น โรงพยาบาลเจริญกรุงประชารักษ์'
                    />
                  </Field>
                  <Field label='เอกสารอ้างอิง'>
                    <InputField
                      showLabel={false} showHelperText={false} showLeadingIcon={false}
                      value={doseDraft.reference} onChange={(v) => setDoseField('reference')(v)}
                      placeholder='เช่น สมุดสีชมพู หน้า 12'
                    />
                  </Field>
                </>
              ) : (
                <>
                  <Field label='สถานที่รับวัคซีน'>
                    <InputField
                      showLabel={false} showHelperText={false} showLeadingIcon={false}
                      value={doseDraft.place} onChange={(v) => setDoseField('place')(v)}
                      placeholder='ศบส.22 วัดปากบ่อ'
                    />
                  </Field>
                  <Field label='พยาบาลผู้ให้วัคซีน' required>
                    <Select
                      showLabel={false} searchable={false} size='lg'
                      value={doseDraft.nurse} onChange={setDoseField('nurse')}
                      options={IMM_NURSES.map((n) => ({ value: n, label: n }))}
                      placeholder='เลือกผู้ให้วัคซีน'
                    />
                  </Field>
                </>
              )}
            </div>

            <div className='flex items-start gap-4 w-full flex-wrap'>
              <Field
                label='เวลาที่เริ่มมีอาการผิดปกติ'
                required={!!doseDraft.immediateReaction}
                width={220}
                hint={doseDraft.immediateReaction && !doseDraft.reactionOnsetTime ? 'ต้องระบุเวลาเริ่มมีอาการ' : undefined}
                hintTone={doseDraft.immediateReaction && !doseDraft.reactionOnsetTime ? 'error' : undefined}
              >
                <TimePicker showLabel={false} value={doseDraft.reactionOnsetTime} onChange={setDoseField('reactionOnsetTime')} placeholder='--:--' />
              </Field>
            </div>

            <SuggestibleTextarea
              voice
              label='อาการผิดปกติหลังได้รับวัคซีน'
              value={doseDraft.immediateReaction}
              onChange={(e) => setDoseField('immediateReaction')(e.target.value)}
              suggestions={AEFI_SYMPTOM_SUGGESTIONS}
              minChars={3}
              rows={2}
              minHeight={64}
              placeholder='เช่น ไม่พบอาการผิดปกติหลังสังเกตอาการ 30 นาที'
            />
          </div>
        )}
      </Popup>

      <Popup
        open={!!doseCancelTarget}
        onClose={() => setDoseCancelTarget(null)}
        title='ยกเลิกรายการเข็มวัคซีน'
        subtitle={doseCancelTarget ? describeDose(doseCancelTarget) : ''}
        tertiaryAction={{ label: 'ปิด', onClick: () => setDoseCancelTarget(null) }}
        primaryAction={{ label: 'ยืนยันยกเลิกเข็ม', onClick: confirmDoseCancel, tone: 'danger' }}
      >
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
          <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary, #636B72)' }}>
            ระบบจะไม่ลบข้อมูล — แถวเดิมยังอยู่ในสมุดวัคซีนพร้อมสถานะ &quot;ยกเลิกแล้ว&quot;
            เพื่อให้ดูย้อนหลังได้ (ตามข้อกำหนด §1.11.2.3)
          </span>
          <Textarea
            label='เหตุผลการยกเลิก'
            required
            value={doseCancelReason}
            onChange={(v) => { setDoseCancelReason(v); if (v.trim()) setDoseCancelError(''); }}
            error={doseCancelError || undefined}
            placeholder='เช่น บันทึกผิดคน / บันทึกซ้ำ / ระบุ lot ผิด'
          />
        </div>
      </Popup>

      {/* ── AEFI editor popup ───────────────────────────────────────── */}
      <Popup
        open={!!aefiDraft}
        onClose={() => setAefiDraft(null)}
        title={isEditingAefi ? 'แก้ไขบันทึกอาการไม่พึงประสงค์ (AEFI)' : 'บันทึกอาการไม่พึงประสงค์ (AEFI)'}
        subtitle={`${child?.fullName || ''} · HN ${hn}`}
        size='large'
        tertiaryAction={{ label: 'ยกเลิก', onClick: () => setAefiDraft(null) }}
        primaryAction={{ label: isEditingAefi ? 'บันทึกการแก้ไข' : 'บันทึก AEFI', onClick: commitAefi }}
      >
        {aefiDraft && (
          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400, 16px)' }}>
            {aefiErrors.length > 0 && (
              <Banner tone='danger' icon='error'>
                <span className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
                  {aefiErrors.map((e) => <span key={e}>• {e}</span>)}
                </span>
              </Banner>
            )}

            <div className='flex items-start gap-4 w-full flex-wrap'>
              <Field label='เข็มวัคซีนที่อ้างอิง' required>
                <Select
                  showLabel={false} searchable size='lg'
                  value={aefiDraft.doseId} onChange={setAefiField('doseId')}
                  options={activeDoses.map((d) => ({ value: d.id, label: describeDose(d) }))}
                  placeholder={activeDoses.length === 0 ? 'ยังไม่มีเข็มวัคซีนให้อ้างอิง' : 'เลือกเข็มที่อ้างอิง'}
                />
              </Field>
              <Field label='วันที่เริ่มมีอาการ' required>
                <DatePicker
                  showLabel={false}
                  value={aefiDraft.onsetDate ? new Date(aefiDraft.onsetDate) : null}
                  onChange={(d) => setAefiField('onsetDate')(d ? d.toISOString().slice(0, 10) : '')}
                  placeholder='เลือกวันที่'
                />
              </Field>
              <Field label='เวลาที่เริ่มมีอาการ' required width={180}>
                <TimePicker showLabel={false} value={aefiDraft.onsetTime} onChange={setAefiField('onsetTime')} placeholder='--:--' />
              </Field>
              <Field label='ความรุนแรง' required>
                <Select
                  showLabel={false} searchable={false} size='lg'
                  value={aefiDraft.severity} onChange={setAefiField('severity')}
                  options={AEFI_SEVERITY} placeholder='เลือกระดับความรุนแรง'
                />
              </Field>
            </div>

            <SuggestibleTextarea
              voice
              label='อาการที่พบ'
              required
              value={aefiDraft.symptom}
              onChange={(e) => setAefiField('symptom')(e.target.value)}
              suggestions={AEFI_SYMPTOM_SUGGESTIONS}
              minChars={3}
              placeholder='บรรยายอาการที่พบ ระยะเวลา และความรุนแรง'
            />
            <SuggestibleTextarea
              voice
              label='การรักษา / การจัดการ'
              value={aefiDraft.treatment}
              onChange={(e) => setAefiField('treatment')(e.target.value)}
              suggestions={AEFI_TREATMENT_SUGGESTIONS}
              minChars={3}
              placeholder='การดูแลที่ให้ และคำแนะนำแก่ผู้ปกครอง'
            />
            <SuggestibleTextarea
              voice
              label='ผลลัพธ์ / การติดตาม'
              value={aefiDraft.outcome}
              onChange={(e) => setAefiField('outcome')(e.target.value)}
              suggestions={['อาการดีขึ้นภายใน 24 ชั่วโมง', 'อาการหายเป็นปกติ ไม่มีภาวะแทรกซ้อน', 'ส่งต่อโรงพยาบาลแม่ข่ายเพื่อดูแลต่อ', 'ติดตามทางโทรศัพท์ครบ 7 วัน อาการปกติ']}
              minChars={3}
              rows={2}
              minHeight={64}
              placeholder='ผลลัพธ์หลังการดูแล และการติดตาม'
            />
            <div className='flex items-start gap-4 w-full flex-wrap'>
              <Field label='ผู้รายงาน'>
                <Select
                  showLabel={false} searchable={false} size='lg'
                  value={aefiDraft.reportedBy} onChange={setAefiField('reportedBy')}
                  options={IMM_NURSES.map((n) => ({ value: n, label: n }))}
                  placeholder='เลือกผู้รายงาน'
                />
              </Field>
            </div>
          </div>
        )}
      </Popup>

      <Popup
        open={!!aefiCancelTarget}
        onClose={() => setAefiCancelTarget(null)}
        title='ยกเลิกบันทึกอาการไม่พึงประสงค์'
        subtitle={aefiCancelTarget ? aefiCancelTarget.symptom : ''}
        tertiaryAction={{ label: 'ปิด', onClick: () => setAefiCancelTarget(null) }}
        primaryAction={{ label: 'ยืนยันยกเลิกรายการ', onClick: confirmAefiCancel, tone: 'danger' }}
      >
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
          <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary, #636B72)' }}>
            รายการจะคงอยู่ในระบบพร้อมสถานะ &quot;ยกเลิกแล้ว&quot; เพื่อการตรวจสอบย้อนหลัง
          </span>
          <Textarea
            label='เหตุผลการยกเลิก'
            required
            value={aefiCancelReason}
            onChange={(v) => { setAefiCancelReason(v); if (v.trim()) setAefiCancelError(''); }}
            error={aefiCancelError || undefined}
            placeholder='เช่น บันทึกซ้ำ / อาการไม่เกี่ยวข้องกับวัคซีน'
          />
        </div>
      </Popup>

      <div
        className='flex flex-col flex-1 min-w-0'
        style={{
          paddingTop: 'var(--dim-space-600, 24px)',
          paddingBottom: 'var(--dim-space-600, 24px)',
          paddingLeft: 'var(--dim-space-600, 24px)',
          paddingRight: 'var(--dim-space-600, 24px)',
          gap: 'var(--dim-space-400, 16px)',
        }}
      >
        <PatientCard
          patient={cardPatient}
          title='สมุดวัคซีน'
          drugAllergies={intake.drugAllergies}
          chronicDiseases={intake.chronicDiseases}
          actions={(
            <div className='flex items-center' style={{ gap: 'var(--dim-space-300, 12px)' }}>
              <ColorfulBadge style={epi.style} size='small' hierarchy='secondary'>{`วัคซีน EPI: ${epi.label}`}</ColorfulBadge>
              {registration
                ? <ColorfulBadge style='teal' size='small' hierarchy='secondary'>{registration.epiNumber}</ColorfulBadge>
                : <ColorfulBadge style='grey' size='small' hierarchy='secondary'>ยังไม่มีทะเบียน</ColorfulBadge>}
            </div>
          )}
        />

        {!canWrite && (
          <Banner tone='warning' icon='lock'>
            บัญชีของคุณไม่มีสิทธิแก้ไขข้อมูลคลินิกสุขภาพเด็กดี — เปิดดูสมุดวัคซีนได้อย่างเดียว
          </Banner>
        )}

        {activeTab === 'matrix' && (
          <Card>
            <TopicHeader icon='fact_check'>ตารางความครบถ้วนวัคซีนตามเกณฑ์ EPI</TopicHeader>
            <div className='flex items-center gap-3 flex-wrap'>
              <ColorfulBadge style={epi.style} size='small' hierarchy='secondary'>
                {`${epi.label} · ได้รับแล้ว ${epi.done}/${epi.expected} เข็มที่ถึงกำหนด (${epi.percent}%)`}
              </ColorfulBadge>
              <AuditLine>อายุปัจจุบัน {formatAgeYMD(child?.birthDate)}</AuditLine>
            </div>

            {epi.overdue > 0 && (
              <Banner tone='danger' icon='warning'>
                มีเข็มที่เกินกำหนด {epi.overdue} เข็ม — ให้วัคซีนแบบเร่งรัด (catch-up) ตามแนวทางกรมควบคุมโรค
                โดยไม่ต้องเริ่มนับหนึ่งใหม่ และนัดเข็มถัดไปห่างกันอย่างน้อย 1 เดือน
              </Banner>
            )}

            <EpiScheduleMatrix
              matrix={matrix}
              onCellClick={(cell) => {
                if (cell.status === 'done') { setActiveTab('history'); return; }
                if (!canWrite) return;
                const row = matrix.find((m) => m.cells.includes(cell));
                openNewDose({ vaccineId: row?.vaccineId, seq: cell.seq });
              }}
              emptyMessage='ยังไม่มีรายการวัคซีนในโปรแกรม EPI'
            />
            <AuditLine>คลิกที่ช่องสถานะเพื่อบันทึกเข็มที่ยังไม่ได้รับ หรือดูประวัติของเข็มที่ได้รับแล้ว</AuditLine>
          </Card>
        )}

        {activeTab === 'history' && (
          <Card>
            <div className='flex items-center justify-between w-full flex-wrap' style={{ gap: 'var(--dim-space-300, 12px)' }}>
              <TopicHeader icon='history'>ประวัติการได้รับวัคซีนย้อนหลังทั้งหมด</TopicHeader>
              <div className='flex items-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                <SelectableTag
                  label='แสดงรายการที่ยกเลิกแล้ว'
                  size='md'
                  selected={showCancelled}
                  onClick={() => setShowCancelled((v) => !v)}
                />
                <BrandSubdueButton variant='outline' size='sm' leadingIcon='domain_add' disabled={!canWrite} onClick={() => canWrite && openNewDose({ otherFacility: true })}>
                  บันทึกจากหน่วยงานอื่น
                </BrandSubdueButton>
                <BrandSubdueButton variant='fill' size='sm' leadingIcon='add' disabled={!canWrite} onClick={() => canWrite && openNewDose()}>
                  บันทึกเข็มวัคซีน
                </BrandSubdueButton>
              </div>
            </div>

            {doses.length === 0 ? (
              <div
                className='flex flex-col items-center text-center w-full'
                style={{
                  gap: 'var(--dim-space-300, 12px)',
                  paddingTop: 'var(--dim-space-800, 48px)',
                  paddingBottom: 'var(--dim-space-800, 48px)',
                  paddingLeft: 'var(--dim-space-600, 24px)',
                  paddingRight: 'var(--dim-space-600, 24px)',
                  borderRadius: 'var(--dim-radius-400, 12px)',
                  border: 'var(--dim-stroke-100, 1px) dashed var(--border-neutral-tertiary, #C6CACD)',
                  background: 'var(--surface-card-quaternary, #F9FBFB)',
                }}
              >
                <Icon name='vaccines' size={32} />
                <span style={{ fontWeight: 'var(--type-weight-bold)', fontSize: 'var(--type-size-base)', color: 'var(--text-content-default, #363B3F)' }}>
                  ยังไม่มีประวัติการได้รับวัคซีน
                </span>
                <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary, #636B72)', maxWidth: 520 }}>
                  เด็กคนนี้ยังไม่มีเข็มวัคซีนในระบบ — บันทึกเข็มแรกที่ให้ที่หน่วยบริการนี้
                  หรือบันทึกย้อนหลังจากสมุดสีชมพู/ใบสรุปการคลอดของหน่วยงานอื่น
                </span>
                <div className='flex items-center gap-3 flex-wrap'>
                  <BrandSubdueButton variant='fill' size='sm' leadingIcon='add' disabled={!canWrite} onClick={() => canWrite && openNewDose()}>
                    บันทึกเข็มแรก
                  </BrandSubdueButton>
                  <BrandSubdueButton variant='outline' size='sm' leadingIcon='domain_add' disabled={!canWrite} onClick={() => canWrite && openNewDose({ otherFacility: true })}>
                    บันทึกจากหน่วยงานอื่น
                  </BrandSubdueButton>
                </div>
              </div>
            ) : (
              <Table
                columns={doseColumns}
                rows={visibleDoses}
                rowKey={(r) => r.id}
                stickyColCount={2}
                emptyMessage='ไม่มีรายการตามเงื่อนไขที่เลือก'
              />
            )}
          </Card>
        )}

        {activeTab === 'aefi' && (
          <Card>
            <div className='flex items-center justify-between w-full flex-wrap' style={{ gap: 'var(--dim-space-300, 12px)' }}>
              <TopicHeader icon='e911_emergency'>อาการไม่พึงประสงค์ภายหลังได้รับวัคซีน (AEFI)</TopicHeader>
              <BrandSubdueButton
                variant='fill' size='sm' leadingIcon='add'
                disabled={!canWrite || activeDoses.length === 0}
                onClick={() => canWrite && openNewAefi()}
              >
                บันทึก AEFI
              </BrandSubdueButton>
            </div>

            {activeDoses.length === 0 && (
              <Banner tone='neutral' icon='info'>
                ยังไม่มีเข็มวัคซีนในระบบ — ต้องมีเข็มที่บันทึกแล้วอย่างน้อย 1 เข็มจึงจะบันทึก AEFI ได้
                (ทุกรายการ AEFI ต้องอ้างอิงเข็มที่ได้รับ)
              </Banner>
            )}

            <Table
              columns={aefiColumns}
              rows={aefiRecords}
              rowKey={(r) => r.id}
              stickyColCount={1}
              emptyMessage='ยังไม่มีรายงานอาการไม่พึงประสงค์ของเด็กคนนี้'
            />
          </Card>
        )}

        {printLog.length > 0 && (
          <Card>
            <TopicHeader icon='print'>ประวัติการพิมพ์เอกสาร</TopicHeader>
            <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
              {printLog.map((e, i) => (
                <AuditLine key={`${e.at}-${i}`}>พิมพ์{e.docType} โดย {e.by} · {formatImmDateTime(e.at)}</AuditLine>
              ))}
            </div>
          </Card>
        )}
      </div>
    </QueuePageShell>
  );
};

export default ImmunizationVaccineBookPage;
