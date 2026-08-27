import React, { useEffect, useMemo, useState } from 'react';
import Popup from '@/components/popup/Popup';
import MedicalHistoryPopup from '@/components/popup/MedicalHistoryPopup';
import Topic from '@/components/topic/Topic';
import Timeslot from '@/components/timeslot/Timeslot';
import Select from '@/components/forms/Select';
import DatePicker from '@/components/forms/DatePicker';
import InputField from '@/components/forms/InputField';
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
  ANY_DOCTOR_OPTION,
  ANY_DOCTOR_VALUE,
  isoKey,
  parseDateKey,
  isAppointmentReadOnly,
  getStaffSlotMinutes,
  getStaffScheduleSlots,
  timeToSlotRange,
  slotRangeToTime,
  printAppointmentSlip,
  STAFF,
  APPOINTMENT_PATIENTS,
} from './appointmentShared';
import { doctorSelectOptions } from './appointmentDoctorRoster';
import {
  AppointmentReadOnlyCards,
  AppointmentReadOnlyStatusBadge,
} from './AppointmentReadOnlyDetail';
import { getResourcePattern } from './appointmentSettingsStore';
import { getApptTypeOptions } from './appointmentTypeCatalog';
import { APPT_DX_ICD10, APPT_PURPOSE_MASTER } from './appointmentHcisMasters';
import { useActiveCenter } from '@/pages/users/usersShared';

/** HCIS §2.3 "วันเวลาที่สั่งนัด" — auto, read-only. */
const orderedAtStamp = (() => {
  const d = new Date();
  const p2 = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())} ${p2(d.getHours())}:${p2(d.getMinutes())}`;
})();

/* MIH PHCIS · Appointment detail popup — Figma 73:15393 / 3:9730 / 29:13839 (past read-only). */

const BLANK_FORM = {
  patient: '',
  hn: '',
  rights: 'ประกันสังคม',
  patientAvatar: DEFAULT_PATIENT_AVATAR,
  orderingUnit: 'ศูนย์ 4 ดินแดง',
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
  orderingUnit: 'ศูนย์ 4 ดินแดง',
  clinic: 'คลินิกตรวจโรคทั่วไป',
  type: 'พบแพทย์',
  doctor: 'นพ. วันชัย อยู่เย็น',
  reason: 'มาติดตามผลการรักษาและตรวจซ้ำตามนัด',
  prep: 'งดอาหารและเครื่องดื่มยกเว้นน้ำเปล่าเล็กน้อยอย่างน้อย 8 ชั่วโมงก่อนเจาะเลือด',
  preOrder: 'none',
  preOrderNote: '',
  examMode: 'onsite',
};

const ORDERING_UNIT_OPTIONS = [
  { value: 'ศูนย์ 4 ดินแดง', label: 'ศูนย์ 4 ดินแดง' },
  { value: 'ศูนย์ 8 บางนา', label: 'ศูนย์ 8 บางนา' },
  { value: 'OPD อายุรกรรม', label: 'OPD อายุรกรรม' },
  { value: 'ห้องฉุกเฉิน', label: 'ห้องฉุกเฉิน' },
  { value: 'คลินิกเวชศาสตร์ครอบครัว', label: 'คลินิกเวชศาสตร์ครอบครัว' },
  { value: 'ทันตกรรม', label: 'ทันตกรรม' },
  { value: 'กุมารเวช', label: 'กุมารเวช' },
  { value: 'ศูนย์บริการสาธารณสุข 7', label: 'ศูนย์บริการสาธารณสุข 7' },
];

const CLINIC_OPTIONS = [
  { value: 'คลินิกตรวจโรคทั่วไป', label: 'คลินิกตรวจโรคทั่วไป (General Clinic)' },
  { value: 'คลินิกอายุรกรรม', label: 'คลินิกอายุรกรรม (Internal Medicine)' },
  { value: 'ทันตกรรม', label: 'ทันตกรรม (Dental Clinic)' },
];

/** Legacy fallback — used when the user-defined catalog (TOR 1.6.2.5) is empty. */
const TYPE_OPTIONS = [
  { value: 'พบแพทย์', label: 'พบแพทย์' },
  { value: 'เยี่ยมบ้าน', label: 'เยี่ยมบ้าน' },
];

/**
 * TOR 1.6.2.5 — ลักษณะการนัดหมายอ่านจากทะเบียน "รูปแบบการนัดหมาย" ที่เจ้าหน้าที่
 * กำหนดเอง (/appointment/types) โดยยังคงค่าดั้งเดิมไว้เสมอ เพื่อไม่ให้ฟอร์มเดิม
 * และนัดที่บันทึกไว้แล้ว (รวมถึง /treat/record ขั้นตอนที่ 6) พัง.
 */
function buildTypeOptions(currentValue) {
  const catalog = getApptTypeOptions();
  const merged = [...TYPE_OPTIONS];
  catalog.forEach((opt) => {
    if (!merged.some((m) => m.value === opt.value)) merged.push(opt);
  });
  if (currentValue && !merged.some((m) => m.value === currentValue)) {
    merged.push({ value: currentValue, label: currentValue });
  }
  return merged;
}

const DOCTOR_OPTIONS = [ANY_DOCTOR_OPTION, ...doctorSelectOptions(STAFF)];

const PRE_ORDER_OPTIONS = [
  { value: 'none', label: 'ไม่มีคำสั่งล่วงหน้า' },
  { value: 'has', label: 'มีคำสั่งล่วงหน้า' },
];

const EXAM_MODE_OPTIONS = [
  { value: 'onsite', label: 'ตรวจที่โรงพยาบาล (Onsite)' },
  { value: 'telemedicine', label: 'ปรึกษาแพทย์ออนไลน์ (Telemedicine)' },
  { value: 'homevisit', label: 'นัดหมายเยี่ยมบ้าน (Home visit)' },
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

/* แถบเครื่องมือหัว popup เหลือเท่าที่จำเป็น (มติผู้ใช้ 27 ส.ค. 69):
     • "ประวัติการนัด" ลบออก — ซ้ำกับรายการ "ประวัติการนัดหมาย" ในเมนู
       <AppointmentMenuButton> ที่อยู่บนหน้าเดียวกัน
     • "พิมพ์ใบนัด" ลบออกจากแถบนี้ — ย้ายไปเป็น nested popup ที่ถามหลังกด
       "บันทึก" แทน (ดู <PrintSlipChoicePopup>) เพราะการพิมพ์เป็นขั้นตอนท้าย
       ของการสร้างนัด ไม่ใช่เครื่องมือที่ต้องมีค้างไว้ตลอดการกรอกฟอร์ม
     • "ประวัติการรักษา" ซ่อนไว้ ไม่ได้ลบ: เจ้าหน้าที่เวชระเบียนไม่มีสิทธิดู
       ประวัติการรักษา และ popup นี้เปิดจากงานเวชระเบียนเป็นหลัก ยังไม่มี role
       model ที่แยกสิทธินี้ได้ (`appointmentPermissions.js` มีแค่ canManage /
       canConfigure) จึงปิดด้วย `canViewMedicalHistory` default = false ไว้ก่อน

   เหลือศูนย์ปุ่ม = ไม่ต้องเรนเดอร์กล่องเปล่าให้กินที่ */
const ApptDetailToolbar = ({
  hn,
  canViewMedicalHistory = false,
  onMedicalHistory,
}) => {
  if (!canViewMedicalHistory) return null;
  return (
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
    </div>
  );
};

const APPT_CARD_TITLE_STYLE = {
  color: 'var(--text-topic-primary-title, var(--brand-p700, #007549))',
  fontFamily: 'var(--type-family-heading-content)',
  fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
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

function mapApptToForm(appt, slotPick, mode, staff, patientSelectable = false) {
  const slotMinutes = getStaffSlotMinutes(staff);
  const resolveRange = (...candidates) => {
    for (const raw of candidates) {
      if (!raw) continue;
      const range = String(raw).includes('-')
        ? String(raw).trim()
        : timeToSlotRange(raw, slotMinutes);
      if (range) return range;
    }
    return '';
  };

  if (appt) {
    const examMode = appt.examMode === 'tele' ? 'telemedicine' : (appt.examMode || 'onsite');
    return {
      ...BLANK_FORM,
      patient: appt.patient || '',
      hn: appt.hn || '',
      rights: appt.rights || BLANK_FORM.rights,
      patientAvatar: appt.patientAvatar || DEFAULT_PATIENT_AVATAR,
      clinic: appt.clinic || BLANK_FORM.clinic,
      orderingUnit: appt.orderingUnit || appt.site || BLANK_FORM.orderingUnit,
      type: appt.type || BLANK_FORM.type,
      doctor: appt.doctor || BLANK_FORM.doctor,
      reason: appt.reason || '',
      prep: appt.prep || '',
      preOrder: appt.preOrder || 'none',
      preOrderNote: appt.preOrderNote || '',
      examMode,
      date: appt.date || slotPick?.date || '',
      slotRange: resolveRange(appt.slotRange, appt.time, slotPick?.time, slotPick?.slotRange),
      status: appt.status,
    };
  }
  const base = mode === 'create' ? { ...BLANK_FORM, ...DEMO_PREFILL } : { ...BLANK_FORM };
  /* เปิดจาก worklist = ยังไม่รู้ว่าเป็นของใคร — ต้องไม่เอา demo prefill มาใส่
     ไม่งั้นจะบันทึกนัดให้ "นายสมชาย มั่นใจดี" โดยที่ผู้ใช้ไม่ได้เลือก */
  if (patientSelectable) {
    base.patient = '';
    base.hn = '';
    base.rights = '';
    base.patientAvatar = DEFAULT_PATIENT_AVATAR;
  }
  if (staff?.name) {
    base.doctor = staff.name;
    if (staff.dept === 'ทันตกรรม') base.clinic = 'ทันตกรรม';
    else if (staff.dept === 'อายุรกรรม') base.clinic = 'คลินิกอายุรกรรม';
  }
  if (slotPick?.date) {
    base.date = slotPick.date;
    base.slotRange = resolveRange(slotPick.slotRange, slotPick.time);
  }
  return base;
}

/** Prefer an exact schedule slot value; fall back to matching by start time. */
function alignSlotRangeToSchedule(rangeOrTime, scheduleSlots, slotMinutes) {
  if (!rangeOrTime) return '';
  const asRange = String(rangeOrTime).includes('-')
    ? String(rangeOrTime).trim()
    : timeToSlotRange(rangeOrTime, slotMinutes);
  if (!asRange) return '';
  if (!scheduleSlots?.length) return asRange;
  const exact = scheduleSlots.find((s) => s.value === asRange);
  if (exact) return exact.value;
  const start = slotRangeToTime(asRange);
  const byStart = scheduleSlots.find((s) => slotRangeToTime(s.value) === start);
  return byStart?.value || asRange;
}

function isSameSlotRange(a, b) {
  if (!a || !b) return false;
  if (a === b) return true;
  return slotRangeToTime(a) === slotRangeToTime(b);
}

function formToSavePayload(form, scheduleSlots = []) {
  const time = slotRangeToTime(form.slotRange);
  const examMode = form.examMode === 'telemedicine' ? 'tele' : form.examMode;
  const slotMeta = scheduleSlots.find((s) => s.value === form.slotRange);
  return {
    patient: form.patient.trim(),
    hn: form.hn.trim(),
    rights: form.rights,
    patientAvatar: form.patientAvatar,
    clinic: form.clinic,
    orderingUnit: form.orderingUnit,
    type: form.examMode === 'homevisit' ? 'เยี่ยมบ้าน' : form.type,
    doctor: form.doctor || ANY_DOCTOR_VALUE,
    reason: form.reason,
    prep: form.prep,
    preOrder: form.preOrder,
    preOrderNote: form.preOrderNote,
    examMode,
    date: form.date,
    time,
    queueNo: slotMeta?.queueNo,
    slotRange: form.slotRange,
  };
}

/* ฟอร์มยาวกว่าหนึ่งหน้าจอ เลื่อนลงไปกรอกช่วงเวลาแล้วจะมองไม่เห็นว่ากำลังนัด
   ให้ใคร — ตรึงแถบผู้รับบริการไว้บนสุดของ body ที่เลื่อน (มติผู้ใช้ 27 ส.ค. 69)

   ตัวการ์ดเขียวอย่างเดียวไม่พอ: body ของ Popup มี paddingTop space-200 และ
   คอลัมน์ฟอร์มมี gap space-600 อยู่ใต้แถบ ทำให้เห็นเนื้อหาไหลผ่านช่องว่างทั้ง
   บนและล่าง จึงต้องมีกล่องครอบทึบสีเดียวกับพื้น modal แล้วดึงระยะขอบกลับด้วย
   margin ติดลบ เพื่อไม่ให้ layout ขยับ */
const STICKY_STRIP_WRAP = {
  position: 'sticky',
  top: 0,
  zIndex: 2,
  width: '100%',
  background: 'var(--surface-modal-default)',
  marginTop: 'calc(-1 * var(--dim-space-200))',
  paddingTop: 'var(--dim-space-200)',
  marginBottom: 'calc(-1 * var(--dim-space-600))',
  paddingBottom: 'var(--dim-space-600)',
};

const AppointmentPatientStrip = ({ form, sticky = true }) => {
  const { patient, hn, rights, patientAvatar } = form;
  const [imgError, setImgError] = useState(false);
  useEffect(() => { setImgError(false); }, [patientAvatar]);

  const strip = (
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

  /* ในการ์ด "ผู้รับบริการ" (โหมดเลือกคนไข้เอง) ไม่ต้องตรึง — การ์ดไม่ได้เลื่อน
     เอง และพื้นทึบสี modal จะตัดกับพื้นการ์ด */
  return sticky ? <div style={STICKY_STRIP_WRAP}>{strip}</div> : strip;
};

/* ทะเบียนผู้รับบริการสำหรับโหมด worklist — ป้ายเป็น "HN · ชื่อ" เพื่อให้พิมพ์
   ค้นได้ทั้งสองทาง (Select ของระบบ searchable ทั้ง label และ value) */
const PATIENT_PICK_OPTIONS = Object.values(APPOINTMENT_PATIENTS).map((p) => ({
  value: p.hn,
  label: `${p.hn} · ${p.patient}`,
}));

/* เปิดจาก worklist จึงยังไม่มีคนไข้ผูกมา — ต้องเลือกก่อน (มติผู้ใช้ 27 ส.ค. 69)
   เลือกแล้วยังโชว์ strip เดิมต่อ เพื่อให้เห็นสิทธิ์การรักษา/รูป ตรงกับตอนเปิด
   จากหน้าที่มีคนไข้อยู่แล้ว */
const AppointmentPatientPicker = ({ form, onPick }) => (
  <ApptCard title='ผู้รับบริการ'>
    <Field label='ค้นหาและเลือกผู้รับบริการ' required>
      <Select
        size='large'
        value={form.hn}
        onChange={onPick}
        options={PATIENT_PICK_OPTIONS}
        placeholder='ค้นหา HN หรือชื่อผู้รับบริการ'
        showLabel={false}
        showHelperText={false}
      />
    </Field>
    {form.hn ? <AppointmentPatientStrip form={form} sticky={false} /> : null}
  </ApptCard>
);

const AppointmentFormPopup = ({
  open,
  mode,
  initial,
  slotPick,
  appointments,
  staff,
  forceReadOnly = false,
  /** เปิดจาก worklist (ไม่มีคนไข้ผูกมา) — ให้เลือกผู้รับบริการในฟอร์มเอง */
  patientSelectable = false,
  onClose,
  onSave,
  onDelete,
}) => {
  /* แหล่งความจริงเดียวของ "ศูนย์ที่กำลังให้บริการ" — ตัวเดียวกับที่ Header/Sidebar
     ใช้ ห้ามสร้าง state ศูนย์ชุดใหม่ (ดู usersShared.useActiveCenter) */
  const { label: activeCenterLabel } = useActiveCenter();
  const [form, setForm] = useState(BLANK_FORM);
  const [baseline, setBaseline] = useState('');
  const [medicalHistoryOpen, setMedicalHistoryOpen] = useState(false);
  /** payload ที่รอคำตอบเรื่องพิมพ์ใบนัด — ไม่ null = nested popup เปิดอยู่ */
  const [pendingSave, setPendingSave] = useState(null);

  useEffect(() => {
    if (!open) return;
    const next = mapApptToForm(initial, slotPick, mode, staff, patientSelectable);
    /* นัดใหม่ = สั่งจากศูนย์ที่กำลังให้บริการอยู่เสมอ · นัดเดิมคงหน่วยงานที่บันทึกไว้ */
    if (mode === 'create' && activeCenterLabel) next.orderingUnit = activeCenterLabel;
    setForm(next);
    setBaseline(JSON.stringify(next));
  }, [open, initial, slotPick, mode, staff, patientSelectable, activeCenterLabel]);

  useEffect(() => {
    if (!open) {
      setMedicalHistoryOpen(false);
      setPendingSave(null);
    }
  }, [open]);

  const historyPatient = useMemo(() => ({ hn: form.hn?.trim() || '' }), [form.hn]);

  /* ช่องนี้ล็อกไว้ ดรอปดาวน์จึงมีตัวเลือกเดียวคือค่าที่ถืออยู่ — นัดเก่าที่สั่งจาก
     ศูนย์อื่นยังแสดงชื่อศูนย์เดิมได้ถูกต้อง ไม่ถูกเขียนทับด้วยศูนย์ปัจจุบัน */
  const orderingUnitOptions = useMemo(() => (
    form.orderingUnit
      ? [{ value: form.orderingUnit, label: form.orderingUnit }]
      : ORDERING_UNIT_OPTIONS
  ), [form.orderingUnit]);

  const pickPatient = (hn) => {
    const picked = APPOINTMENT_PATIENTS[hn];
    setForm((f) => ({
      ...f,
      hn: hn || '',
      patient: picked?.patient || '',
      rights: picked?.rights || '',
      patientAvatar: picked?.avatar || DEFAULT_PATIENT_AVATAR,
    }));
  };

  const setField = (key) => (v) => setForm((f) => ({ ...f, [key]: v }));
  const setFromEvent = (key) => (e) => setForm((f) => ({ ...f, [key]: e?.target?.value ?? '' }));

  const dirty = JSON.stringify(form) !== baseline;
  const formComplete = form.patient.trim()
    && form.hn.trim()
    && form.orderingUnit
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
  const readOnly = forceReadOnly || isAppointmentReadOnly(readOnlyAppt);
  const slotMinutes = getStaffSlotMinutes(staff);
  const nestedPattern = staff?.id ? getResourcePattern(staff.id) : null;

  const scheduleSlots = useMemo(
    () => (form.date && staff ? getStaffScheduleSlots(staff, form.date) : []),
    [staff, form.date],
  );

  /* Align stored appointment time to a real schedule chip once slots are known. */
  useEffect(() => {
    if (!open || !form.date || !scheduleSlots.length || !form.slotRange) return;
    const aligned = alignSlotRangeToSchedule(form.slotRange, scheduleSlots, slotMinutes);
    if (aligned && aligned !== form.slotRange) {
      setForm((f) => (f.slotRange === aligned ? f : { ...f, slotRange: aligned }));
    }
  }, [open, form.date, form.slotRange, scheduleSlots, slotMinutes]);

  const displaySlots = useMemo(() => {
    if (!form.slotRange) return scheduleSlots;
    if (scheduleSlots.some((s) => isSameSlotRange(s.value, form.slotRange))) {
      return scheduleSlots;
    }
    /* Keep the booked time visible/selected even if outside today's duty window. */
    const injected = {
      value: form.slotRange,
      label: form.slotRange,
      queueNo: null,
    };
    return [...scheduleSlots, injected].sort(
      (a, b) => slotRangeToTime(a.value).localeCompare(slotRangeToTime(b.value)),
    );
  }, [scheduleSlots, form.slotRange]);

  /* กด "บันทึก" แล้วถามก่อนว่าจะพิมพ์ใบนัดให้ผู้รับบริการไหม (มติผู้ใช้ 27 ส.ค. 69)
     — เก็บ payload ไว้ก่อน ยังไม่ commit เพราะ parent จะปิดฟอร์มทันทีที่ onSave
     ถูกเรียก แล้ว popup ที่ซ้อนอยู่จะหายไปพร้อมกัน */
  const requestSave = () => {
    setPendingSave(formToSavePayload(form, scheduleSlots));
  };

  const commitSave = (shouldPrint) => {
    const payload = pendingSave;
    setPendingSave(null);
    if (!payload) return;
    if (shouldPrint) printAppointmentSlip({ ...(initial || {}), ...payload });
    onSave(payload);
  };

  const bookedRanges = useMemo(() => {
    if (!form.date || !staff?.id) return new Set();
    return new Set(
      appointments
        .filter((a) => (
          String(a.staffId) === String(staff.id)
          && a.date === form.date
          && a.id !== initial?.id
        ))
        .map((a) => alignSlotRangeToSchedule(
          a.slotRange || a.time,
          scheduleSlots,
          slotMinutes,
        )),
    );
  }, [appointments, staff?.id, form.date, initial?.id, scheduleSlots, slotMinutes]);

  const slotDisabled = (slotValue) => {
    if (isSameSlotRange(slotValue, form.slotRange)) {
      return { disabled: false };
    }
    if (bookedRanges.has(slotValue)
      || [...bookedRanges].some((r) => isSameSlotRange(r, slotValue))) {
      return { disabled: true, label: '(เต็ม)' };
    }
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
          onClick: requestSave,
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
                  onMedicalHistory={() => setMedicalHistoryOpen(true)}
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
              onMedicalHistory={() => setMedicalHistoryOpen(true)}
            />
          )}
        />

        {patientSelectable ? (
          <AppointmentPatientPicker form={form} onPick={pickPatient} />
        ) : (
          <AppointmentPatientStrip form={form} />
        )}

        <ApptCard title='รายละเอียดการนัดหมาย'>
          <FieldGrid
            cols={2}
            /* 24px ระหว่างแถว (มติผู้ใช้ 27 ส.ค. 69) — 16px เดิมทำให้ label ของ
               แถวถัดไปเบียดขอบล่างของกล่องข้างบนจนอ่านเป็นก้อนเดียวกัน */
            rowGap='var(--dim-space-600)'
            columnGap='var(--dim-space-1200)'
          >
            {/* HCIS §2.3 — "วันเวลาที่สั่งนัด" ระบบเติมให้อัตโนมัติ แก้ไขไม่ได้ */}
            <Field label='วันเวลาที่สั่งนัด (ระบบบันทึกอัตโนมัติ)'>
              <InputField
                size='large'
                value={form.orderedAt || orderedAtStamp}
                disabled
                showLabel={false}
                showHelperText={false}
                leadingIcon='schedule'
              />
            </Field>
            {/* หน่วยงานที่สั่งนัด = ศูนย์ที่เจ้าหน้าที่กำลังให้บริการอยู่เสมอ และ
                แก้ไม่ได้ (มติผู้ใช้ 27 ส.ค. 69) — ตรงกับกติกา scope ของ MIS ที่
                ศูนย์เห็นและสั่งงานได้เฉพาะของตัวเอง เลือกเองได้เมื่อไรก็เท่ากับ
                เปิดช่องให้สั่งนัดในนามศูนย์อื่น */}
            <Field label='หน่วยงานที่สั่งนัด' required>
              <Select
                size='large'
                value={form.orderingUnit}
                options={orderingUnitOptions}
                placeholder='เลือกหน่วยงาน'
                disabled
                showLabel={false}
                showHelperText={false}
              />
            </Field>
            {/* HCIS §2.3 — "นัดมาเพื่อ" + "โรคที่นัดมาตรวจ (ICD-10)" master list มีรหัส */}
            <Field label='นัดมาเพื่อ (รหัสตาม HCIS)' required>
              <Select
                size='large'
                value={form.purposeCode || 'P01'}
                onChange={setField('purposeCode')}
                options={APPT_PURPOSE_MASTER.map((p) => ({ value: p.code, label: `${p.code} · ${p.label}` }))}
                placeholder='เลือกวัตถุประสงค์การนัด'
                showLabel={false}
                showHelperText={false}
              />
            </Field>
            <Field label='โรคที่นัดมาตรวจ (ICD-10)'>
              <Select
                size='large'
                value={form.dxCode || ''}
                onChange={setField('dxCode')}
                options={[
                  { value: '', label: 'ไม่ระบุ' },
                  ...APPT_DX_ICD10.map((d) => ({ value: d.code, label: `${d.code} · ${d.label}` })),
                ]}
                placeholder='ค้นหารหัส ICD-10 หรือชื่อโรค'
                showLabel={false}
                showHelperText={false}
              />
            </Field>
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
                options={buildTypeOptions(form.type)}
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
            <FieldGrid cols={2} columnGap='var(--dim-space-1200)' rowGap='var(--dim-space-600)'>
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
                onChange={(d) => setForm((f) => {
                  const nextDate = d ? isoKey(d) : '';
                  if (nextDate === f.date) return f;
                  return {
                    ...f,
                    date: nextDate,
                    slotRange: '',
                  };
                })}
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
                {displaySlots.length > 0
                  ? (nestedPattern
                    ? `Slot ซ้อนชั้น · major ${nestedPattern.majorMinutes} น. / minor ${nestedPattern.minorMinutes} น. · ${displaySlots.length} คิว`
                    : `ช่วงละ ${slotMinutes} นาที · ${displaySlots.length} slot`)
                  : 'ไม่มีตารางเวรในวันนี้'}
              </span>
              {displaySlots.length > 0 && (
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
                    {displaySlots.map((slot) => {
                      const { disabled, label } = slotDisabled(slot.value);
                      return (
                        <Timeslot
                          key={slot.value}
                          size='sm'
                          value={slot.label || slot.value}
                          selected={isSameSlotRange(form.slotRange, slot.value)}
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

    {/* ปิด (X / overlay) = ยกเลิกการบันทึก ยังไม่ commit — ต้องเลือกอย่างใด
        อย่างหนึ่งจึงจะบันทึกจริง เพื่อไม่ให้กดพลาดแล้วได้นัดที่ไม่ตั้งใจ */}
    <Popup
      open={Boolean(pendingSave)}
      onClose={() => setPendingSave(null)}
      size='default'
      title='พิมพ์ใบนัดหมาย'
      subtitle='ต้องการพิมพ์ใบนัดให้ผู้รับบริการหรือไม่'
      secondaryAction={{ label: 'ไม่พิมพ์ใบนัด', onClick: () => commitSave(false) }}
      primaryAction={{ label: 'พิมพ์ใบนัด', leadingIcon: 'print', onClick: () => commitSave(true) }}
    >
      <p
        style={{
          margin: 'var(--dim-space-0)',
          color: 'var(--text-content-secondary)',
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-sm)',
          lineHeight: 1.6,
        }}
      >
        {`นัดหมายของ ${form.patient || '—'} (HN ${form.hn || '—'}) จะถูกบันทึกทั้งสองทางเลือก`}
      </p>
    </Popup>

    <MedicalHistoryPopup
      open={medicalHistoryOpen}
      onClose={() => setMedicalHistoryOpen(false)}
      patient={historyPatient}
    />
    </>
  );
};

export default AppointmentFormPopup;
