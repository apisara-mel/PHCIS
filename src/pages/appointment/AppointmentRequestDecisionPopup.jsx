import React, { useEffect, useMemo, useState } from 'react';
import Popup from '@/components/popup/Popup';
import PatientCard from '@/components/card/PatientCard';
import Select from '@/components/forms/Select';
import DatePicker from '@/components/forms/DatePicker';
import Timeslot from '@/components/timeslot/Timeslot';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import { Field, FieldGrid } from '@/components/forms/Fields';
import StatusBadge from '@/components/badge/StatusBadge';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import BrandButton from '@/components/button/BrandButton';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import DangerSubdueButton from '@/components/button/DangerSubdueButton';
import { Sym } from '@/components/forms/_inputBox';
import { formatThaiBuddhistDate } from '@/data/registrationForm';
import AppointmentConflictPanel, { evaluateAppointmentConflicts } from './AppointmentConflictPanel';
import {
  REQUEST_STATUS,
  REQUEST_STATUS_PRESENTATION,
  isRequestOverdue,
  isRequestReadOnly,
} from './appointmentRequestStore';
import {
  APPT_PURPOSE_MASTER,
  REQUEST_REJECT_REASONS,
  REQUEST_DECISION_NOTE_SUGGESTIONS,
  getChannelMeta,
} from './appointmentHcisMasters';
import {
  ANY_DOCTOR_VALUE,
  STAFF,
  formatApptListDate,
  getStaffScheduleSlots,
  isSlotDisabled,
  isoKey,
  parseDateKey,
  slotRangeToTime,
} from './appointmentShared';
import { NO_PERMISSION_TOOLTIP } from './appointmentPermissions';

/* TOR 1.6.2.1 / 1.6.2.3 / 1.6.2.6 / 1.6.2.7 · 4.2.5 · 4.2.6.4
   ป๊อปอัป "ตัดสินใจคำขอนัดหมาย" — ยืนยัน / ปฏิเสธ / เสนอเวลาใหม่
   พร้อมตรวจ Resource ซ้ำซ้อนก่อนยืนยัน (AppointmentConflictPanel). */

const DECISIONS = [
  { value: 'confirm', label: 'ยืนยันนัด', icon: 'event_available' },
  { value: 'propose', label: 'เสนอเวลาใหม่ / เลื่อนนัด', icon: 'event_repeat' },
  { value: 'reject', label: 'ปฏิเสธคำขอ', icon: 'event_busy' },
];

const REJECT_NOTE_MIN = 10;

const labelStyle = {
  color: 'var(--text-content-tertiary)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-xs, 12px)',
};

const valueStyle = {
  color: 'var(--text-content-default)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm, 14px)',
  lineHeight: 1.5,
};

const sectionStyle = {
  gap: 'var(--dim-space-300, 12px)',
  paddingTop: 'var(--dim-space-400, 16px)',
  paddingBottom: 'var(--dim-space-400, 16px)',
  paddingLeft: 'var(--dim-space-400, 16px)',
  paddingRight: 'var(--dim-space-400, 16px)',
  borderRadius: 'var(--dim-radius-400, 12px)',
  border: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-tertiary)',
  background: 'var(--surface-card-100)',
};

const ReadOnlyRow = ({ label, children }) => (
  <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-050, 2px)' }}>
    <span style={labelStyle}>{label}</span>
    <span style={valueStyle}>{children ?? '—'}</span>
  </div>
);

const purposeLabel = (code) =>
  APPT_PURPOSE_MASTER.find((p) => p.code === code)?.label || 'ตรวจตามนัดปกติ';

const AppointmentRequestDecisionPopup = ({
  open,
  request,
  appointments = [],
  canManage = true,
  onClose,
  onConfirm,
  onReject,
  onPropose,
  onFindEarliest,
}) => {
  const [decision, setDecision] = useState('confirm');
  const [doctorName, setDoctorName] = useState('');
  const [dateValue, setDateValue] = useState(null);
  const [slotRange, setSlotRange] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [note, setNote] = useState('');
  const [touched, setTouched] = useState(false);

  const readOnly = !canManage || isRequestReadOnly(request);
  const decided = request && request.status !== REQUEST_STATUS.PENDING;

  /* ผูก effect กับ "id" ไม่ใช่ตัว object — ฝั่งเรียกสร้าง object ใหม่ทุก render
     ถ้าใช้ `request` เป็น dependency ฟอร์มจะถูกล้างทุกครั้งที่หน้าแม่ re-render. */
  const requestId = request?.id || null;
  useEffect(() => {
    if (!open || !requestId) return;
    setDecision('confirm');
    setDoctorName(request.doctor && request.doctor !== ANY_DOCTOR_VALUE ? request.doctor : '');
    setDateValue(request.requestedDate ? parseDateKey(request.requestedDate) : null);
    setSlotRange('');
    setRejectReason('');
    setNote('');
    setTouched(false);
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [open, requestId]);

  const doctorOptions = useMemo(() => ([
    { value: '', label: 'ยังไม่เลือกแพทย์ (รับเข้าคิวรวม)' },
    ...STAFF.map((s) => ({ value: s.name, label: `${s.name} · ${s.dept}` })),
  ]), []);

  const selectedStaff = useMemo(
    () => STAFF.find((s) => s.name === doctorName) || null,
    [doctorName],
  );

  const dateKey = dateValue ? isoKey(dateValue) : (request?.requestedDate || '');

  const slots = useMemo(() => {
    if (!selectedStaff || !dateKey) return [];
    return getStaffScheduleSlots(selectedStaff, dateKey);
  }, [selectedStaff, dateKey]);

  const effectiveTime = slotRange
    ? slotRangeToTime(slotRange)
    : (request?.requestedTime || '');

  const conflictResult = useMemo(() => {
    if (!request) return null;
    return evaluateAppointmentConflicts({
      date: dateKey,
      time: effectiveTime,
      staffId: selectedStaff?.id ?? null,
      doctor: doctorName || ANY_DOCTOR_VALUE,
      clinic: request.clinic,
      appointments,
      rightsExpiry: request.rightsExpiry,
      needsRoom: true,
    });
  }, [request, dateKey, effectiveTime, selectedStaff, doctorName, appointments]);

  if (!request) return null;

  const channel = getChannelMeta(request.channel);
  const statusPresentation = REQUEST_STATUS_PRESENTATION[request.status]
    || REQUEST_STATUS_PRESENTATION[REQUEST_STATUS.PENDING];
  const overdue = isRequestOverdue(request);

  const patientForCard = {
    shortName: String(request.patient || '').replace(/^(นาย|นาง|น\.ส\.|นางสาว)\s*/u, ''),
    fullName: request.patient,
    hn: request.hn,
    vn: '—',
    sex: '—',
    age: '—',
    nationalId: '—',
    bloodType: '—',
    patientType: 'ผู้รับบริการยื่นคำขอนัด',
    doctor: request.doctor || 'ไม่ระบุแพทย์',
    insurance: request.rights || 'ไม่ระบุสิทธิ',
    address: '—',
    avatarUrl: request.patientAvatar || undefined,
    vip: false,
  };

  const rejectNeedsNote = rejectReason === 'other';
  const rejectValid = !!rejectReason
    && (!rejectNeedsNote || note.trim().length >= REJECT_NOTE_MIN);

  const confirmBlocked = !!conflictResult?.blocking;
  const proposeValid = !!dateKey && !!effectiveTime;
  /* คำขอที่ยืนยันไปแล้วห้ามกด "ยืนยันนัด" ซ้ำ — ต้องไปแก้ที่ตารางนัดหมายแทน
     (กันสร้างนัดใบที่สอง + แจ้งเตือนซ้ำ) ส่วน "เสนอเวลาใหม่" ยังทำได้ */
  const alreadyConfirmed = request.status === REQUEST_STATUS.CONFIRMED;

  const primaryDisabled = readOnly
    || (decision === 'confirm' && (confirmBlocked || alreadyConfirmed))
    || (decision === 'reject' && !rejectValid)
    || (decision === 'propose' && !proposeValid);

  /* ปุ่ม "ค้นหา Slot ว่างที่เร็วที่สุด" ต้องเติมค่ากลับเข้าฟอร์มจริง ๆ
     (TOR 1.6.2.1) — ไม่ใช่แค่แจ้ง toast แล้วให้เจ้าหน้าที่กรอกซ้ำเอง. */
  const applyEarliest = () => {
    const hit = onFindEarliest?.(request);
    if (!hit) return;
    if (hit.staff?.name) setDoctorName(hit.staff.name);
    if (hit.date) setDateValue(parseDateKey(hit.date));
    setSlotRange(hit.slotRange || '');
  };

  const submit = () => {
    setTouched(true);
    if (primaryDisabled) return;
    const payload = {
      request,
      doctor: doctorName || null,
      staffId: selectedStaff?.id ?? null,
      date: dateKey,
      time: effectiveTime,
      slotRange,
      note: note.trim(),
    };
    if (decision === 'confirm') onConfirm?.(payload);
    else if (decision === 'reject') {
      onReject?.({
        ...payload,
        reasonCode: rejectReason,
        reasonLabel: REQUEST_REJECT_REASONS.find((r) => r.value === rejectReason)?.label || 'ไม่ระบุ',
      });
    } else onPropose?.(payload);
  };

  const primaryLabel = decision === 'confirm'
    ? 'ยืนยันนัดหมาย'
    : decision === 'reject' ? 'ยืนยันการปฏิเสธ' : 'ส่งข้อเสนอเวลาใหม่';

  return (
    <Popup
      open={open}
      onClose={onClose}
      width={980}
      title='รายละเอียดคำขอนัดหมาย'
      subtitle={`${request.id} · ${channel.label} · ยื่นคำขอเมื่อ ${request.submittedAt}`}
      primaryAction={readOnly ? undefined : {
        label: primaryLabel,
        onClick: submit,
        disabled: primaryDisabled,
      }}
      secondaryAction={{ label: 'ปิด', onClick: onClose }}
    >
      <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-500, 20px)' }}>
        {/* ── สถานะ + ป้ายเตือน ───────────────────────────────────── */}
        <div className='flex flex-wrap items-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          <StatusBadge style={statusPresentation.style} size='default'>
            {statusPresentation.label}
          </StatusBadge>
          <ColorfulBadge style={channel.style} size='small' hierarchy='secondary' width='hug'>
            {channel.label}
          </ColorfulBadge>
          {overdue ? (
            <StatusBadge style='warning' size='small' icon='schedule'>
              เกินกำหนดตอบกลับ 24 ชั่วโมง
            </StatusBadge>
          ) : null}
          {request.status === REQUEST_STATUS.PATIENT_CANCELLED ? (
            <StatusBadge style='neutral' size='small' icon='block'>
              ผู้รับบริการยกเลิกแล้ว — ดำเนินการต่อไม่ได้
            </StatusBadge>
          ) : null}
          {!canManage ? (
            <StatusBadge style='neutral' size='small' icon='lock'>
              {NO_PERMISSION_TOOLTIP}
            </StatusBadge>
          ) : null}
        </div>

        <PatientCard patient={patientForCard} embedded />

        {/* ── รายละเอียดคำขอ (read-only) ───────────────────────────── */}
        <section className='flex flex-col w-full' style={sectionStyle}>
          <span
            style={{
              color: 'var(--text-content-default)',
              fontFamily: 'var(--type-family-heading-graphic2)',
              fontSize: 'var(--type-size-sm, 14px)',
              fontWeight: 'var(--type-weight-medium)',
            }}
          >
            ข้อมูลคำขอจากผู้รับบริการ
          </span>
          <FieldGrid cols={3} columnGap='var(--dim-space-400)' rowGap='var(--dim-space-300)'>
            <ReadOnlyRow label='วันเวลาที่ยื่นคำขอ'>{request.submittedAt}</ReadOnlyRow>
            <ReadOnlyRow label='หน่วยงาน / คลินิกที่ขอ'>{request.clinic}</ReadOnlyRow>
            <ReadOnlyRow label='แพทย์ที่ขอ'>
              {request.doctor || 'ไม่ระบุแพทย์'}
            </ReadOnlyRow>
            <ReadOnlyRow label='วัน-เวลาที่ขอ'>
              {formatApptListDate(request.requestedDate)} · {request.requestedTime} น.
            </ReadOnlyRow>
            <ReadOnlyRow label='สิทธิการรักษา'>
              {request.rights}
              {request.rightsExpiry ? ` (หมดอายุ ${formatApptListDate(request.rightsExpiry)})` : ''}
            </ReadOnlyRow>
            <ReadOnlyRow label='นัดมาเพื่อ'>{purposeLabel(request.purposeCode)}</ReadOnlyRow>
            <ReadOnlyRow label='อาการเบื้องต้น'>{request.symptom}</ReadOnlyRow>
            <ReadOnlyRow label='หมายเหตุจากผู้รับบริการ'>{request.note || '—'}</ReadOnlyRow>
            <ReadOnlyRow label='ที่มาของคำขอ'>
              {request.sourceLabel || channel.label}
              {request.sourceRef ? ` · ${request.sourceRef}` : ''}
            </ReadOnlyRow>
          </FieldGrid>
        </section>

        {/* ── ผลการตัดสินใจเดิม (ถ้ามี) ─────────────────────────────── */}
        {decided && request.decision ? (
          <section
            className='flex flex-col w-full'
            style={{ ...sectionStyle, background: 'var(--surface-brandPrimary-quaternary)' }}
          >
            <span
              style={{
                color: 'var(--text-content-default)',
                fontFamily: 'var(--type-family-heading-graphic2)',
                fontSize: 'var(--type-size-sm, 14px)',
                fontWeight: 'var(--type-weight-medium)',
              }}
            >
              ผลการดำเนินการ (บันทึกผู้ดำเนินการและเวลาอัตโนมัติ)
            </span>
            <FieldGrid cols={2} columnGap='var(--dim-space-400)' rowGap='var(--dim-space-300)'>
              <ReadOnlyRow label='ผู้ดำเนินการ'>{request.decision.by}</ReadOnlyRow>
              <ReadOnlyRow label='เวลาที่ดำเนินการ'>{request.decision.at}</ReadOnlyRow>
              <ReadOnlyRow label='เหตุผล'>{request.decision.reasonLabel}</ReadOnlyRow>
              <ReadOnlyRow label='หมายเหตุ'>{request.decision.note || '—'}</ReadOnlyRow>
              {request.decision.proposedDate ? (
                <ReadOnlyRow label='วัน-เวลาที่เสนอใหม่'>
                  {formatApptListDate(request.decision.proposedDate)} · {request.decision.proposedTime} น.
                </ReadOnlyRow>
              ) : null}
              {request.appointmentId ? (
                <ReadOnlyRow label='เลขที่นัดหมายที่สร้าง'>{request.appointmentId}</ReadOnlyRow>
              ) : null}
            </FieldGrid>
          </section>
        ) : null}

        {/* ── การจัดสรรทรัพยากร ────────────────────────────────────── */}
        {!readOnly ? (
          <section className='flex flex-col w-full' style={sectionStyle}>
            <div className='flex items-center justify-between' style={{ gap: 'var(--dim-space-300, 12px)' }}>
              <span
                style={{
                  color: 'var(--text-content-default)',
                  fontFamily: 'var(--type-family-heading-graphic2)',
                  fontSize: 'var(--type-size-sm, 14px)',
                  fontWeight: 'var(--type-weight-medium)',
                }}
              >
                จัดสรรแพทย์และช่วงเวลา
              </span>
              <BrandSubdueButton
                variant='outline'
                size='sm'
                leadingIcon='bolt'
                onClick={applyEarliest}
              >
                ค้นหา Slot ว่างที่เร็วที่สุด
              </BrandSubdueButton>
            </div>

            <FieldGrid cols={2} columnGap='var(--dim-space-400)' rowGap='var(--dim-space-300)'>
              <Field label='แพทย์ผู้ตรวจ' required>
                <Select
                  options={doctorOptions}
                  value={doctorName}
                  onChange={setDoctorName}
                  size='md'
                  searchable
                  showLabel={false}
                  showHelperText={false}
                  placeholder='เลือกแพทย์'
                />
              </Field>
              <Field label='วันที่นัด' required>
                <DatePicker
                  size='md'
                  value={dateValue}
                  format={formatThaiBuddhistDate}
                  onChange={(d) => { setDateValue(d); setSlotRange(''); }}
                  placeholder='เลือกวันที่'
                  showLabel={false}
                  showHelperText={false}
                />
              </Field>
            </FieldGrid>

            {!doctorName ? (
              <span style={{ ...labelStyle, color: 'var(--text-alert-warning)' }}>
                คำขอนี้ยื่นแบบ “ไม่ระบุแพทย์” — ต้องเลือกแพทย์หรือกดรับเข้าคิวรวมก่อนยืนยัน (TOR 1.6.2.3)
              </span>
            ) : null}

            <span style={labelStyle}>
              ช่วงเวลา (Slot ซ้อนชั้น → เลขคิวตาม TOR 1.6.1.4) — เว้นว่างเพื่อใช้เวลา {request.requestedTime} น. ที่ผู้รับบริการขอ
            </span>
            {slots.length === 0 ? (
              <span style={{ ...valueStyle, color: 'var(--text-content-tertiary)' }}>
                {doctorName
                  ? 'วันที่เลือกไม่มีตารางออกตรวจของแพทย์ท่านนี้ (วันหยุด / นอกรูปแบบตาราง)'
                  : 'เลือกแพทย์ก่อนจึงจะแสดงช่วงเวลาที่ว่าง'}
              </span>
            ) : (
              <div className='flex flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                {slots.slice(0, 30).map((slot) => {
                  const t = slotRangeToTime(slot.value);
                  const taken = appointments.some((a) => (
                    a.date === dateKey
                    && a.time === t
                    && String(a.staffId) === String(selectedStaff?.id)
                    && a.status !== 'cancelled'
                  ));
                  return (
                    <Timeslot
                      key={slot.value}
                      value={slot.label || slot.value}
                      selected={slotRange === slot.value}
                      disabled={taken || isSlotDisabled(dateKey, t)}
                      disabledLabel={taken ? '(จองแล้ว)' : '(เลยเวลา)'}
                      onClick={() => setSlotRange(slot.value)}
                    />
                  );
                })}
              </div>
            )}
          </section>
        ) : null}

        {/* ── ตรวจความซ้ำซ้อน ─────────────────────────────────────── */}
        <AppointmentConflictPanel
          result={conflictResult}
          date={dateKey}
          time={effectiveTime}
          onFindEarliest={readOnly ? undefined : applyEarliest}
          onPropose={readOnly ? undefined : () => setDecision('propose')}
        />

        {/* ── การตัดสินใจ ─────────────────────────────────────────── */}
        {!readOnly ? (
          <section className='flex flex-col w-full' style={sectionStyle}>
            <span
              style={{
                color: 'var(--text-content-default)',
                fontFamily: 'var(--type-family-heading-graphic2)',
                fontSize: 'var(--type-size-sm, 14px)',
                fontWeight: 'var(--type-weight-medium)',
              }}
            >
              การดำเนินการกับคำขอนี้
            </span>
            <div className='flex flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
              {DECISIONS.map((d) => {
                const active = decision === d.value;
                const Btn = d.value === 'reject' ? DangerSubdueButton : BrandSubdueButton;
                return active && d.value !== 'reject' ? (
                  <BrandButton
                    key={d.value}
                    size='md'
                    variant='fill'
                    leadingIcon={d.icon}
                    onClick={() => setDecision(d.value)}
                  >
                    {d.label}
                  </BrandButton>
                ) : (
                  <Btn
                    key={d.value}
                    size='md'
                    variant={active ? 'fill' : 'outline'}
                    leadingIcon={d.icon}
                    onClick={() => setDecision(d.value)}
                  >
                    {d.label}
                  </Btn>
                );
              })}
            </div>

            {decision === 'reject' ? (
              <Field label='สาเหตุการปฏิเสธ (บังคับเลือกจากรายการ)' required>
                <Select
                  options={REQUEST_REJECT_REASONS}
                  value={rejectReason}
                  /* `touched` ต้องมาจากตัวฟิลด์เอง — ปุ่มหลักถูก disable ตอนฟอร์ม
                     ไม่ผ่าน onClick จึงไม่เคยยิง ข้อความ validation จะเป็น dead code */
                  onChange={(v) => { setRejectReason(v); setTouched(true); }}
                  size='md'
                  showLabel={false}
                  showHelperText={false}
                  searchable={false}
                  placeholder='เลือกสาเหตุ'
                  error={touched && !rejectReason ? 'กรุณาเลือกสาเหตุการปฏิเสธ' : undefined}
                />
              </Field>
            ) : null}

            <SuggestibleTextarea
              label={decision === 'reject'
                ? `หมายเหตุถึงผู้รับบริการ${rejectNeedsNote ? ` (บังคับ ≥ ${REJECT_NOTE_MIN} ตัวอักษร)` : ''}`
                : 'หมายเหตุการดำเนินการ (แนบไปกับข้อความแจ้งเตือน)'}
              required={rejectNeedsNote}
              value={note}
              onChange={(e) => { setNote(e?.target ? e.target.value : e); setTouched(true); }}
              placeholder='พิมพ์อย่างน้อย 3 ตัวอักษรเพื่อดูข้อความที่ใช้บ่อย'
              suggestions={REQUEST_DECISION_NOTE_SUGGESTIONS}
              minChars={3}
              voice
              rows={3}
              height={120}
            />

            {touched && rejectNeedsNote && note.trim().length < REJECT_NOTE_MIN ? (
              <span style={{ ...labelStyle, color: 'var(--text-alert-error)' }}>
                เลือก “อื่น ๆ” ต้องระบุหมายเหตุอย่างน้อย {REJECT_NOTE_MIN} ตัวอักษร
              </span>
            ) : null}

            {decision === 'confirm' && alreadyConfirmed ? (
              <span
                className='flex items-center'
                style={{ ...labelStyle, gap: 'var(--dim-space-100, 4px)', color: 'var(--text-alert-warning)' }}
              >
                <Sym name='event_available' size={16} color='var(--icon-alertdialog-warning)' />
                คำขอนี้ยืนยันแล้ว (นัด {request.appointmentId || '—'}) — แก้ไขวัน-เวลาได้ที่ตารางนัดหมาย
                หรือใช้ “เสนอเวลาใหม่ / เลื่อนนัด” เพื่อแจ้งผู้รับบริการ
              </span>
            ) : null}

            {decision === 'confirm' && !alreadyConfirmed && confirmBlocked ? (
              <span
                className='flex items-center'
                style={{ ...labelStyle, gap: 'var(--dim-space-100, 4px)', color: 'var(--text-alert-error)' }}
              >
                <Sym name='block' size={16} color='var(--icon-alertdialog-destructive)' />
                ยืนยันไม่ได้จนกว่าจะแก้การชนทรัพยากรด้านบน — ใช้ “ค้นหา Slot ว่างที่เร็วที่สุด” หรือเสนอเวลาใหม่
              </span>
            ) : null}

            <span style={labelStyle}>
              ระบบบันทึกผู้ดำเนินการและเวลาโดยอัตโนมัติ และจะส่งข้อความแจ้งกลับผู้รับบริการ
              (Push / LINE / SMS — ยังเป็นข้อมูลจำลอง) ทันทีหลังบันทึก
            </span>
          </section>
        ) : null}
      </div>
    </Popup>
  );
};

export default AppointmentRequestDecisionPopup;
