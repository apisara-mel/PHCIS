import React, { useEffect, useMemo, useState } from 'react';
import Popup from '@/components/popup/Popup';
import MedicalHistoryPopup from '@/components/popup/MedicalHistoryPopup';
import AppointmentHistoryPopup from '@/components/popup/AppointmentHistoryPopup';
import Topic from '@/components/topic/Topic';
import Timeslot from '@/components/timeslot/Timeslot';
import Select from '@/components/forms/Select';
import DatePicker from '@/components/forms/DatePicker';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import { Field, FieldGrid } from '@/components/forms/Fields';
import { Sym } from '@/components/forms/_inputBox';
import BrandButton from '@/components/button/BrandButton';
import DangerSubdueButton from '@/components/button/DangerSubdueButton';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import Information from '@/components/information/Information';
import RadioButton from '@/components/radio/RadioButton';
import {
  APPT_REASON_SUGGESTIONS,
  APPT_PREPARATION_SUGGESTIONS,
  APPT_PREPROCEDURE_SUGGESTIONS,
} from '@/data/treatmentVisits';
import { formatThaiBuddhistDate } from '@/data/registrationForm';
import {
  DEFAULT_PATIENT_AVATAR,
  APPT_MIN_LEAD_MS,
  isoKey,
  parseDateKey,
  isAppointmentReadOnly,
  getStaffSlotMinutes,
  getStaffScheduleSlots,
  timeToSlotRange,
  slotRangeToTime,
  STAFF,
} from './appointmentShared';
import { doctorSelectOptions } from './appointmentDoctorRoster';
import {
  AppointmentReadOnlyCards,
  AppointmentReadOnlyStatusBadge,
} from './AppointmentReadOnlyDetail';

/* MIH PHCIS · Appointment detail popup — Figma 73:15393 / 3:9730 / 29:13839 (past read-only). */

const BLANK_FORM = {
  patient: '',
  hn: '',
  rights: 'ประกันสังคม',
  patientAvatar: DEFAULT_PATIENT_AVATAR,
  clinic: 'คลินิกตรวจโรคทั่วไป',
  type: 'พบแพทย์',
  doctor: 'นพ. วันชัย อยู่เย็น',
  reason: '',
  prep: '',
  preOrder: 'none',
  preOrderNote: '',
  examMode: 'onsite',
  date: '',
  slotRange: '',
};

const DEMO_PREFILL = {
  patient: 'นายสมชาย มั่นใจดี',
  hn: '67-00001',
  rights: 'ประกันสังคม',
  patientAvatar: DEFAULT_PATIENT_AVATAR,
  clinic: 'คลินิกตรวจโรคทั่วไป',
  type: 'พบแพทย์',
  doctor: 'นพ. วันชัย อยู่เย็น',
  reason: 'มาติดตามผลการรักษาและตรวจซ้ำตามนัด',
  prep: 'งดอาหารและเครื่องดื่มยกเว้นน้ำเปล่าเล็กน้อยอย่างน้อย 8 ชั่วโมงก่อนเจาะเลือด',
  preOrder: 'none',
  preOrderNote: '',
  examMode: 'onsite',
};

const CLINIC_OPTIONS = [
  { value: 'คลินิกตรวจโรคทั่วไป', label: 'คลินิกตรวจโรคทั่วไป (General Clinic)' },
  { value: 'คลินิกอายุรกรรม', label: 'คลินิกอายุรกรรม (Internal Medicine)' },
  { value: 'ทันตกรรม', label: 'ทันตกรรม (Dental Clinic)' },
];

const TYPE_OPTIONS = [{ value: 'พบแพทย์', label: 'พบแพทย์' }];

const DOCTOR_OPTIONS = doctorSelectOptions(STAFF);

const PRE_ORDER_OPTIONS = [
  { value: 'none', label: 'ไม่มีคำสั่งล่วงหน้า' },
  { value: 'has', label: 'มีคำสั่งล่วงหน้า' },
];

const EXAM_MODE_OPTIONS = [
  { value: 'onsite', label: 'ตรวจที่โรงพยาบาล (Onsite)' },
  { value: 'telemedicine', label: 'ปรึกษาแพทย์ออนไลน์ (Telemedicine)' },
];

const ApptToolbarDivider = () => (
  <div
    aria-hidden
    style={{
      width: 'var(--dim-stroke-100, 1px)',
      alignSelf: 'stretch',
      background: 'var(--border-neutral-tertiary, #E2E4E6)',
      flexShrink: 0,
    }}
  />
);

const ApptDetailToolbar = ({
  hn,
  readOnly,
  onMedicalHistory,
  onAppointmentHistory,
}) => (
  <div
    className='flex items-center shrink-0 flex-wrap justify-end'
    style={{ gap: 'var(--dim-space-300)' }}
  >
    <BrandButton
      variant='outline'
      size='sm'
      leadingIcon='stethoscope'
      disabled={!hn}
      onClick={onMedicalHistory}
    >
      ประวัติการรักษา
    </BrandButton>
    <ApptToolbarDivider />
    <BrandButton
      variant='outline'
      size='sm'
      leadingIcon='history'
      disabled={!hn}
      onClick={onAppointmentHistory}
    >
      ประวัติการนัด
    </BrandButton>
    <ApptToolbarDivider />
    <BrandButton variant='fill' size='sm' leadingIcon='print' disabled={readOnly}>
      พิมพ์ใบนัด
    </BrandButton>
  </div>
);

const APPT_CARD_TITLE_STYLE = {
  color: 'var(--text-topic-primary-title, var(--brand-p700, #007549))',
  fontFamily: 'var(--type-family-heading-content)',
  fontWeight: 'var(--type-weight-bold)',
  fontSize: 'var(--type-size-base)',
  lineHeight: 1.5,
};

const ApptCard = ({ title, children }) => (
  <div
    className='flex flex-col w-full'
    style={{
      gap: 'var(--dim-space-400)',
      padding: 'var(--dim-space-600)',
      borderRadius: 'var(--dim-radius-400)',
      border: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary, #F4F5F5)',
      background: 'var(--surface-neutral-quaternary, #F9FBFB)',
    }}
  >
    <span style={APPT_CARD_TITLE_STYLE}>{title}</span>
    {children}
  </div>
);

const ApptCollapse = ({ open, children, gapBefore = 'var(--dim-space-400)' }) => (
  <div
    aria-hidden={!open}
    style={{
      display: 'grid',
      gridTemplateRows: open ? '1fr' : '0fr',
      opacity: open ? 1 : 0,
      transform: open ? 'translateY(0)' : 'translateY(-4px)',
      pointerEvents: open ? 'auto' : 'none',
      marginTop: open ? gapBefore : 0,
      transition: [
        'grid-template-rows 280ms cubic-bezier(0.32, 0.72, 0, 1)',
        'opacity 240ms cubic-bezier(0.32, 0.72, 0, 1)',
        'transform 240ms cubic-bezier(0.32, 0.72, 0, 1)',
        'margin-top 280ms cubic-bezier(0.32, 0.72, 0, 1)',
      ].join(', '),
    }}
  >
    <div className='min-h-0 overflow-hidden'>{children}</div>
  </div>
);

const parseApptDate = (raw) => {
  if (!raw) return null;
  if (raw instanceof Date) return Number.isNaN(raw.getTime()) ? null : raw;
  const d = parseDateKey(raw);
  return Number.isNaN(d.getTime()) ? null : d;
};

const parseTimeslotStartOnDate = (slotValue, dayDate) => {
  const m = String(slotValue).match(/^(\d{1,2}):(\d{2})\s*-\s*\d{1,2}:\d{2}/);
  if (!m) return null;
  const hh = parseInt(m[1], 10);
  const mm = parseInt(m[2], 10);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  return new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), hh, mm, 0, 0);
};

function mapApptToForm(appt, slotPick, mode, staff) {
  const slotMinutes = getStaffSlotMinutes(staff);
  if (appt) {
    const examMode = appt.examMode === 'tele' ? 'telemedicine' : (appt.examMode || 'onsite');
    return {
      ...BLANK_FORM,
      patient: appt.patient || '',
      hn: appt.hn || '',
      rights: appt.rights || BLANK_FORM.rights,
      patientAvatar: appt.patientAvatar || DEFAULT_PATIENT_AVATAR,
      clinic: appt.clinic || BLANK_FORM.clinic,
      type: appt.type || BLANK_FORM.type,
      doctor: appt.doctor || BLANK_FORM.doctor,
      reason: appt.reason || '',
      prep: appt.prep || '',
      preOrder: appt.preOrder || 'none',
      preOrderNote: appt.preOrderNote || '',
      examMode,
      date: appt.date || '',
      slotRange: timeToSlotRange(appt.time, slotMinutes),
      status: appt.status,
    };
  }
  const base = mode === 'create' ? { ...BLANK_FORM, ...DEMO_PREFILL } : { ...BLANK_FORM };
  if (staff?.name) {
    base.doctor = staff.name;
    if (staff.dept === 'ทันตกรรม') base.clinic = 'ทันตกรรม';
    else if (staff.dept === 'อายุรกรรม') base.clinic = 'คลินิกอายุรกรรม';
  }
  if (slotPick?.date) {
    base.date = slotPick.date;
    if (slotPick.time) base.slotRange = timeToSlotRange(slotPick.time, slotMinutes);
  }
  return base;
}

function formToSavePayload(form) {
  const time = slotRangeToTime(form.slotRange);
  const examMode = form.examMode === 'telemedicine' ? 'tele' : form.examMode;
  return {
    patient: form.patient.trim(),
    hn: form.hn.trim(),
    rights: form.rights,
    patientAvatar: form.patientAvatar,
    clinic: form.clinic,
    type: form.type,
    doctor: form.doctor,
    reason: form.reason,
    prep: form.prep,
    preOrder: form.preOrder,
    preOrderNote: form.preOrderNote,
    examMode,
    date: form.date,
    time,
  };
}

const AppointmentPatientStrip = ({ form }) => {
  const { patient, hn, rights, patientAvatar } = form;
  const [imgError, setImgError] = useState(false);
  useEffect(() => { setImgError(false); }, [patientAvatar]);

  return (
    <div
      className='flex items-center w-full flex-wrap'
      style={{
        gap: 'var(--dim-space-600)',
        padding: 'var(--dim-space-400)',
        borderRadius: 'var(--dim-radius-400)',
        background: 'var(--surface-brandPrimary-quaternary)',
        alignItems: 'center',
      }}
    >
      <div className='flex items-center shrink-0' style={{ gap: 'var(--dim-space-300)' }}>
        <span
          className='inline-flex items-center justify-center shrink-0 overflow-hidden'
          style={{
            width: 'var(--dim-size-1000)',
            height: 'var(--dim-size-1000)',
            boxSizing: 'border-box',
            borderRadius: 'var(--dim-radius-full)',
            border: 'var(--dim-stroke-400) solid var(--border-image-default)',
            background: 'var(--patient-card-avatar-bg)',
            boxShadow:
              'var(--sds-size-depth-0, 0px) var(--sds-size-depth-025, 1px) var(--sds-size-depth-100, 4px) var(--sds-size-depth-0, 0px) var(--color-shadow-050, rgba(100, 116, 139, 0.10))',
            color: 'var(--text-content-on-content, #FFFFFF)',
          }}
        >
          {!imgError && patientAvatar ? (
            <img
              src={patientAvatar}
              alt={patient}
              onError={() => setImgError(true)}
              className='w-full h-full object-cover'
            />
          ) : (
            <Sym name='person' size={24} color='currentColor' />
          )}
        </span>
        <Information
          subText='ชื่อ-นามสกุล ผู้ป่วย'
          text={patient || '—'}
          showBadge={false}
          showBadge2={false}
          className='shrink-0'
          style={{ gap: 'var(--dim-space-100)' }}
        />
      </div>
      <div
        aria-hidden
        className='shrink-0'
        style={{
          width: 'var(--dim-stroke-100)',
          height: '48px',
          background: 'var(--border-brandPrimary-tertiary)',
        }}
      />
      <Information
        subText='HN (Hospital Number)'
        text={hn || '—'}
        showBadge={false}
        showBadge2={false}
        className='shrink-0'
        style={{ gap: 'var(--dim-space-100)' }}
      />
      <div
        aria-hidden
        className='shrink-0'
        style={{
          width: 'var(--dim-stroke-100)',
          height: '48px',
          background: 'var(--border-brandPrimary-tertiary)',
        }}
      />
      <div className='flex flex-col shrink-0 justify-center' style={{ gap: 'var(--dim-space-100)' }}>
        <span
          style={{
            color: 'var(--text-content-tertiary)',
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-xs)',
          }}
        >
          สิทธิ์การรักษา
        </span>
        <ColorfulBadge style='blue' size='small' width='hug' hierarchy='primary'>
          {rights || '—'}
        </ColorfulBadge>
      </div>
    </div>
  );
};

const AppointmentFormPopup = ({
  open,
  mode,
  initial,
  slotPick,
  appointments,
  staff,
  onClose,
  onSave,
  onDelete,
}) => {
  const [form, setForm] = useState(BLANK_FORM);
  const [baseline, setBaseline] = useState('');
  const [medicalHistoryOpen, setMedicalHistoryOpen] = useState(false);
  const [appointmentHistoryOpen, setAppointmentHistoryOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const next = mapApptToForm(initial, slotPick, mode, staff);
    setForm(next);
    setBaseline(JSON.stringify(next));
  }, [open, initial, slotPick, mode, staff]);

  useEffect(() => {
    if (!open) {
      setMedicalHistoryOpen(false);
      setAppointmentHistoryOpen(false);
    }
  }, [open]);

  const historyPatient = useMemo(() => ({ hn: form.hn?.trim() || '' }), [form.hn]);

  const setField = (key) => (v) => setForm((f) => ({ ...f, [key]: v }));
  const setFromEvent = (key) => (e) => setForm((f) => ({ ...f, [key]: e?.target?.value ?? '' }));

  const dirty = JSON.stringify(form) !== baseline;
  const formComplete = form.patient.trim()
    && form.hn.trim()
    && form.clinic
    && form.type
    && form.doctor
    && form.reason.trim()
    && form.prep.trim()
    && form.date
    && form.slotRange
    && (form.preOrder !== 'has' || form.preOrderNote.trim());
  /* Create: prefilled demo is submittable without an extra edit (Figma filled state).
     Edit: require a change before บันทึก (Figma 3:9730 annotation). */
  const canSave = formComplete && (mode === 'create' || dirty);

  const apptDay = parseApptDate(form.date);
  /* Use `initial` immediately on open — `form` may lag one tick behind useEffect. */
  const readOnlyAppt = initial
    ? { ...initial, time: initial.time || slotRangeToTime(form.slotRange) }
    : {
      date: form.date,
      time: slotRangeToTime(form.slotRange),
      status: form.status,
    };
  const readOnly = isAppointmentReadOnly(readOnlyAppt);
  const slotMinutes = getStaffSlotMinutes(staff);

  const scheduleSlots = useMemo(
    () => (form.date && staff ? getStaffScheduleSlots(staff, form.date) : []),
    [staff, form.date],
  );

  const bookedRanges = useMemo(() => {
    if (!form.date || !staff?.id) return new Set();
    return new Set(
      appointments
        .filter((a) => a.staffId === staff.id && a.date === form.date && a.id !== initial?.id)
        .map((a) => timeToSlotRange(a.time, slotMinutes)),
    );
  }, [appointments, staff?.id, form.date, initial?.id, slotMinutes]);

  const slotDisabled = (slotValue) => {
    if (bookedRanges.has(slotValue)) return { disabled: true, label: '(เต็ม)' };
    if (!apptDay) return { disabled: false };
    const start = parseTimeslotStartOnDate(slotValue, apptDay);
    if (start && start.getTime() < Date.now() + APPT_MIN_LEAD_MS) {
      return {
        disabled: true,
        label: '(ก่อน 1 ชม.)',
      };
    }
    return { disabled: false };
  };

  return (
    <>
    <Popup
      open={open}
      onClose={onClose}
      title='รายละเอียดการนัดหมาย'
      subtitle='แสดงรายละเอียดการนัดหมายของผู้รับบริการ'
      size='extraLarge'
      tertiaryAction={readOnly ? undefined : { label: 'ปิด', onClick: onClose }}
      primaryAction={readOnly
        ? { label: 'ปิด', onClick: onClose }
        : {
          label: 'บันทึก',
          onClick: () => onSave(formToSavePayload(form)),
          disabled: !canSave,
        }}
    >
      <div
        className='flex flex-col w-full'
        style={{ gap: readOnly ? 'var(--dim-space-300)' : 'var(--dim-space-600)' }}
      >
        {readOnly ? (
          <>
            <div
              className='flex items-center w-full flex-wrap'
              style={{ gap: 'var(--dim-space-600)' }}
            >
              <AppointmentReadOnlyStatusBadge appt={readOnlyAppt} />
              <div className='flex flex-1 min-w-0 justify-end'>
                <ApptDetailToolbar
                  hn={historyPatient.hn}
                  readOnly
                  onMedicalHistory={() => setMedicalHistoryOpen(true)}
                  onAppointmentHistory={() => setAppointmentHistoryOpen(true)}
                />
              </div>
            </div>
            <AppointmentReadOnlyCards appt={form} />
          </>
        ) : (
          <>
        <Topic
          hierarchy='primary'
          title='นัดหมาย (Appointment)'
          leadingIcon='calendar_clock'
          showSubText={false}
          showBadge={false}
          showChevron={false}
          showSuccess={false}
          style={{
            gap: 'var(--dim-space-300)',
            paddingLeft: 0,
            paddingRight: 0,
          }}
          trailing={(
            <ApptDetailToolbar
              hn={historyPatient.hn}
              readOnly={false}
              onMedicalHistory={() => setMedicalHistoryOpen(true)}
              onAppointmentHistory={() => setAppointmentHistoryOpen(true)}
            />
          )}
        />

        <AppointmentPatientStrip form={form} />

        <ApptCard title='รายละเอียดการนัดหมาย'>
          <FieldGrid
            cols={2}
            rowGap='var(--dim-space-400)'
            columnGap='var(--dim-space-1200)'
          >
            <Field label='คลินิก / หน่วยงานที่นัดตรวจ' required>
              <Select
                size='large'
                value={form.clinic}
                onChange={setField('clinic')}
                options={CLINIC_OPTIONS}
                placeholder='เลือกคลินิก'
                showLabel={false}
                showHelperText={false}
              />
            </Field>
            <Field label='ลักษณะการนัดหมาย' required>
              <Select
                size='large'
                value={form.type}
                onChange={setField('type')}
                options={TYPE_OPTIONS}
                showLabel={false}
                showHelperText={false}
              />
            </Field>
            <Field label='แพทย์ผู้ตรวจ' required>
              <Select
                size='large'
                value={form.doctor}
                onChange={setField('doctor')}
                options={DOCTOR_OPTIONS}
                showLabel={false}
                showHelperText={false}
              />
            </Field>
            <div aria-hidden />
            <Field label='เหตุผลการนัดหมาย / อาการเบื้องต้น' required>
              <SuggestibleTextarea
                voice
                value={form.reason}
                onChange={setFromEvent('reason')}
                placeholder='พิมพ์หรือกดปุ่มไมโครโฟนเพื่อพูด...'
                height={160}
                minHeight={96}
                suggestions={APPT_REASON_SUGGESTIONS}
                minChars={2}
                popoverAriaLabel='คำแนะนำเหตุผลการนัดหมาย'
              />
            </Field>
            <Field label='การเตรียมตัวก่อนตรวจ' required>
              <SuggestibleTextarea
                voice
                value={form.prep}
                onChange={setFromEvent('prep')}
                placeholder='พิมพ์หรือกดปุ่มไมโครโฟนเพื่อพูด...'
                height={160}
                minHeight={96}
                suggestions={APPT_PREPARATION_SUGGESTIONS}
                minChars={2}
                popoverAriaLabel='คำแนะนำการเตรียมตัวก่อนตรวจ'
              />
            </Field>
          </FieldGrid>
        </ApptCard>

        <ApptCard title='คำสั่งล่วงหน้า'>
          <div
            role='radiogroup'
            aria-label='คำสั่งล่วงหน้า'
            className='flex flex-row flex-wrap w-full'
            style={{ gap: 'var(--dim-space-300)' }}
          >
            {PRE_ORDER_OPTIONS.map((o) => (
              <RadioButton
                key={o.value}
                name='appt-pre-order'
                value={o.value}
                checked={form.preOrder === o.value}
                onChange={setField('preOrder')}
                title={o.label}
                showRadio={false}
                showCircleIcon={false}
                showIcon={false}
                showBadgeTitle={false}
                showBadge={false}
                showDescription={false}
              />
            ))}
          </div>
          <ApptCollapse open={form.preOrder === 'has'}>
            <FieldGrid cols={2} columnGap='var(--dim-space-1200)' rowGap='var(--dim-space-400)'>
              <Field label='คำสั่ง' required>
                <BrandButton
                  type='button'
                  variant='outline'
                  size='sm'
                  leadingIcon='add'
                >
                  เลือกคำสั่งล่วงหน้า
                </BrandButton>
              </Field>
              <Field label='เงื่อนไขก่อนทำ' required>
                <SuggestibleTextarea
                  voice
                  value={form.preOrderNote}
                  onChange={setFromEvent('preOrderNote')}
                  placeholder='พิมพ์หรือกดปุ่มไมโครโฟนเพื่อพูด...'
                  height={160}
                  minHeight={96}
                  suggestions={APPT_PREPROCEDURE_SUGGESTIONS}
                  minChars={1}
                  popoverAriaLabel='คำแนะนำเงื่อนไขก่อนทำ'
                />
              </Field>
            </FieldGrid>
          </ApptCollapse>
        </ApptCard>

        <ApptCard title='วันเวลาที่ต้องการนัดหมาย'>
          <Field label='ประเภทการรับตรวจ'>
            <div
              role='radiogroup'
              aria-label='ประเภทการรับตรวจ'
              className='flex flex-row flex-wrap w-full'
              style={{ gap: 'var(--dim-space-300)' }}
            >
              {EXAM_MODE_OPTIONS.map((o) => (
                <RadioButton
                  key={o.value}
                  name='appt-exam-mode'
                  value={o.value}
                  checked={form.examMode === o.value}
                  onChange={setField('examMode')}
                  title={o.label}
                  showRadio={false}
                  showCircleIcon={false}
                  showIcon={false}
                  showBadgeTitle={false}
                  showBadge={false}
                  showDescription={false}
                />
              ))}
            </div>
          </Field>
          <Field label='วันที่นัดหมาย'>
            <div style={{ maxWidth: 320 }}>
              <DatePicker
                size='large'
                leadingIcon='calendar_today'
                value={apptDay}
                format={formatThaiBuddhistDate}
                onChange={(d) => setForm((f) => ({
                  ...f,
                  date: d ? isoKey(d) : '',
                  slotRange: '',
                }))}
                placeholder='เลือกวันที่'
                showLabel={false}
                showHelperText={false}
              />
            </div>
          </Field>
          <ApptCollapse open={!!form.date}>
            <div
              className='flex flex-col w-full'
              style={{ gap: 'var(--dim-space-200)' }}
            >
              <span
                style={{
                  color: 'var(--text-content-tertiary)',
                  fontFamily: 'var(--type-family-body)',
                  fontSize: 'var(--type-size-xs)',
                  fontWeight: 'var(--type-weight-medium)',
                }}
              >
                {scheduleSlots.length > 0
                  ? `ช่วงละ ${slotMinutes} นาที · ${scheduleSlots.length} slot`
                  : 'ไม่มีตารางเวรในวันนี้'}
              </span>
              {scheduleSlots.length > 0 && (
                <div
                  style={{
                    padding: 'var(--dim-space-400)',
                    borderRadius: 'var(--dim-radius-400)',
                    background: 'var(--surface-card-100)',
                    border: 'var(--dim-stroke-100, 1px) solid var(--border-timeslot-default, var(--border-brandPrimary-quaternary, #E2F3EB))',
                  }}
                >
                  <div
                    className='grid w-full'
                    style={{
                      gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
                      gap: 'var(--dim-space-200)',
                    }}
                  >
                    {scheduleSlots.map((slot) => {
                      const { disabled, label } = slotDisabled(slot.value);
                      return (
                        <Timeslot
                          key={slot.value}
                          size='sm'
                          value={slot.value}
                          selected={form.slotRange === slot.value}
                          disabled={disabled}
                          disabledLabel={label}
                          onClick={() => setField('slotRange')(slot.value)}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </ApptCollapse>
        </ApptCard>

        {mode === 'edit' && (
          <div
            className='flex w-full justify-center'
            style={{ paddingTop: 'var(--dim-space-200)' }}
          >
            <DangerSubdueButton
              variant='fill'
              size='lg'
              leadingIcon='delete'
              onClick={() => onDelete()}
            >
              ยกเลิกการนัดหมาย
            </DangerSubdueButton>
          </div>
        )}
          </>
        )}
      </div>
    </Popup>

    <MedicalHistoryPopup
      open={medicalHistoryOpen}
      onClose={() => setMedicalHistoryOpen(false)}
      patient={historyPatient}
    />
    <AppointmentHistoryPopup
      open={appointmentHistoryOpen}
      onClose={() => setAppointmentHistoryOpen(false)}
      hn={historyPatient.hn}
      appointments={appointments}
      highlightId={initial?.id}
    />
    </>
  );
};

export default AppointmentFormPopup;
