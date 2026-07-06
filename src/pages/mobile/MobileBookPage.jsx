import React, { useMemo, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import {
  MobileShell,
  MobileCard,
  MobileButton,
  Sym,
} from '@/components/mobile/MobileShell';
import {
  BookingWizardShell,
  BookingPanel,
  BookingSearchRow,
  CentreListCard,
  DoctorListCard,
  BookingTagRow,
  ConfirmDetailRow,
  BOOKING_STEP_META,
} from '@/components/mobile/BookingWizard';
import { CLINICS, DOCTORS, SCHEDULE_SLOTS } from '@/data/mobileMock';
import { MOBILE_ICON_TONES } from '@/components/mobile/mobileIconTones';
import { bookAppointment } from '@/data/phcisLink';

/* Figma Mobile Application · Booking flow (6dCDQkwc8DhvyovBbDTyp5 · 173:82969).
   5-step wizard: ประเภทบริการ → ศูนย์ → แพทย์ → วัน/เวลา → ยืนยัน */

const STEPS = ['service', 'centre', 'doctor', 'datetime', 'confirm', 'success'];
const DEPT_KEY = 'general';
const DOCTOR_TAGS = ['ทั้งหมด', 'อายุรกรรม', 'กระดูกและข้อ', 'กุมารเวช'];

const THAI_MONTHS_SHORT = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

const formatThaiDateShort = (yyyyMmDd) => {
  const [, mm, dd] = yyyyMmDd.split('-').map(Number);
  const today = new Date();
  const isToday = today.getDate() === dd && (today.getMonth() + 1) === mm;
  return isToday ? `วันนี้, ${dd} ${THAI_MONTHS_SHORT[mm - 1]}` : `${dd} ${THAI_MONTHS_SHORT[mm - 1]}`;
};

const MobileBookInner = () => {
  const history = useHistory();
  const { search } = useLocation();
  const reschedule = new URLSearchParams(search).get('reschedule');

  const [step, setStep] = useState('service');
  const [serviceType, setServiceType] = useState(null);
  const [clinic, setClinic] = useState(null);
  const [doctor, setDoctor] = useState(null);
  const [date, setDate] = useState(null);
  const [time, setTime] = useState(null);
  const [symptom, setSymptom] = useState('');
  const [doctorTag, setDoctorTag] = useState('ทั้งหมด');
  const [centreQuery, setCentreQuery] = useState('');
  const [doctorQuery, setDoctorQuery] = useState('');

  const idx = STEPS.indexOf(step);
  const go = (s) => setStep(s);
  const goBack = () => {
    if (idx <= 0) history.push('/m/appointments');
    else setStep(STEPS[idx - 1]);
  };

  const schedule = useMemo(() => {
    if (!clinic) return {};
    return SCHEDULE_SLOTS[`${clinic.code}_${DEPT_KEY}`] || {};
  }, [clinic]);

  const filteredClinics = useMemo(() => {
    const q = centreQuery.trim().toLowerCase();
    if (!q) return CLINICS;
    return CLINICS.filter((c) => (
      String(c.number).includes(q)
      || (c.shortName || c.name).toLowerCase().includes(q)
      || c.name.toLowerCase().includes(q)
    ));
  }, [centreQuery]);

  const filteredDoctors = useMemo(() => {
    let list = DOCTORS.filter((d) => d.clinics.includes(clinic?.code) && d.dept === DEPT_KEY);
    if (doctorTag !== 'ทั้งหมด') {
      list = list.filter((d) => d.specialty.includes(doctorTag));
    }
    const q = doctorQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((d) => d.name.toLowerCase().includes(q) || d.specialty.toLowerCase().includes(q));
    }
    return list;
  }, [clinic, doctorTag, doctorQuery]);

  const confirmBooking = () => {
    if (!date || !time || !clinic || !doctor) return;
    bookAppointment({
      type: serviceType === 'online' ? 'video' : 'visit',
      date,
      time,
      clinic: clinic.code,
      deptKey: DEPT_KEY,
      deptLabel: serviceType === 'online' ? 'เข้ารับบริการออนไลน์' : 'ตรวจรักษาทั่วไป',
      doctor: doctor.name,
      note: symptom || 'จองผ่านแอปผู้รับบริการ',
    });
    go('success');
  };

  if (step === 'success') {
    return (
      <div className='flex flex-col' style={{ minHeight: '100%', background: 'var(--background-screen-brand-100)' }}>
        <div className='flex-1 flex flex-col items-center justify-center' style={{ padding: 'var(--dim-space-600, 24px)' }}>
          <span
            className='inline-flex items-center justify-center'
            style={{
              width: 96, height: 96, borderRadius: 'var(--dim-radius-full)',
              background: 'var(--surface-brandPrimary-default)',
              color: 'var(--text-brandPrimary-on-brand)',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            <Sym name='check' size={52} />
          </span>
          <h1 style={{
            margin: 'var(--dim-space-500, 20px) 0 0',
            fontFamily: 'var(--type-family-heading-graphic2)',
            fontSize: 'var(--type-size-xl)',
            color: 'var(--text-brandPrimary-default)',
          }}
          >
            {reschedule ? 'เลื่อนนัดหมายสำเร็จ' : 'จองนัดหมายสำเร็จ'}
          </h1>
          <p style={{
            margin: 'var(--dim-space-200, 8px) 0 0',
            fontSize: 'var(--type-size-sm)',
            color: 'var(--text-content-secondary)',
            textAlign: 'center',
            lineHeight: 1.5,
          }}
          >
            ระบบได้บันทึกนัดหมายและจะส่งการแจ้งเตือนก่อนถึงเวลา
          </p>
        </div>
        <div style={{ padding: 'var(--dim-space-400, 16px)' }}>
          <MobileButton onClick={() => history.push('/m/appointments')}>
            กลับสู่รายการนัดหมาย
          </MobileButton>
        </div>
      </div>
    );
  }

  if (step === 'service') {
    return (
      <BookingWizardShell
        stepKey='service'
        title={BOOKING_STEP_META.service.title}
        onBack={goBack}
        footerLabel='ถัดไป'
        footerDisabled={!serviceType}
        onFooter={() => go('centre')}
      >
        <BookingPanel title='เลือกรูปแบบการรับบริการ'>
          <div className='flex flex-col' style={{ gap: 'var(--dim-space-300, 12px)' }}>
            {[
              { key: 'online', icon: 'videocam', label: 'เข้ารับบริการออนไลน์', sub: 'Telemedicine · พบแพทย์ผ่านวิดีโอคอล', tone: 'indigo' },
              { key: 'clinic', icon: 'local_hospital', label: 'เข้ารับบริการที่ศูนย์', sub: 'นัดหมายที่ศูนย์บริการสาธารณสุข', tone: 'green' },
            ].map((opt) => {
              const palette = MOBILE_ICON_TONES[opt.tone];
              return (
              <button
                key={opt.key}
                type='button'
                onClick={() => setServiceType(opt.key)}
                className='flex items-center w-full text-left'
                style={{
                  gap: 'var(--dim-space-400, 16px)',
                  padding: 'var(--dim-space-400, 16px)',
                  borderRadius: 'var(--dim-radius-500, 16px)',
                  border: serviceType === opt.key
                    ? 'var(--dim-stroke-200) solid var(--border-brandPrimary-default)'
                    : 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
                  background: 'var(--surface-card-100)',
                  cursor: 'pointer',
                }}
              >
                <span
                  className='inline-flex items-center justify-center shrink-0'
                  style={{
                    width: 48, height: 48, borderRadius: 'var(--dim-radius-full)',
                    background: palette.bg,
                  }}
                >
                  <Sym name={opt.icon} size={24} color={palette.fg} fill />
                </span>
                <div>
                  <p style={{ margin: 0, fontWeight: 'var(--type-weight-bold)', color: 'var(--text-content-default)' }}>{opt.label}</p>
                  <p style={{ margin: 0, fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>{opt.sub}</p>
                </div>
              </button>
              );
            })}
          </div>
        </BookingPanel>
      </BookingWizardShell>
    );
  }

  if (step === 'centre') {
    return (
      <BookingWizardShell
        stepKey='centre'
        title={BOOKING_STEP_META.centre.title}
        onBack={goBack}
        footerLabel='ถัดไป'
        footerDisabled={!clinic}
        onFooter={() => go('doctor')}
      >
        <BookingPanel title='เลือกศูนย์บริการที่ต้องการนัดหมาย'>
          <BookingSearchRow
            placeholder='ค้นหาเลขหรือชื่อศูนย์บริการ'
            value={centreQuery}
            onChange={setCentreQuery}
            onFilter={() => {}}
          />
          <div className='flex flex-col' style={{ gap: 'var(--dim-space-200, 8px)' }}>
            {filteredClinics.map((c) => (
              <CentreListCard
                key={c.code}
                number={c.number}
                name={c.shortName || c.name}
                distanceKm={c.distanceKm}
                selected={clinic?.code === c.code}
                onClick={() => { setClinic(c); setDoctor(null); }}
              />
            ))}
          </div>
        </BookingPanel>
      </BookingWizardShell>
    );
  }

  if (step === 'doctor') {
    return (
      <BookingWizardShell
        stepKey='doctor'
        title={BOOKING_STEP_META.doctor.title}
        onBack={goBack}
        footerLabel='ถัดไป'
        footerDisabled={!doctor}
        onFooter={() => go('datetime')}
      >
        <BookingPanel title='เลือกแพทย์ที่ต้องการนัดหมาย'>
          <BookingSearchRow
            placeholder='ค้นหาชื่อแพทย์'
            value={doctorQuery}
            onChange={setDoctorQuery}
          />
          <BookingTagRow tags={DOCTOR_TAGS} value={doctorTag} onChange={setDoctorTag} />
          <div style={{ height: 1, background: 'var(--border-neutral-quaternary)', width: '100%' }} />
          <div className='flex flex-col' style={{ gap: 'var(--dim-space-200, 8px)' }}>
            {filteredDoctors.map((d) => (
              <DoctorListCard
                key={d.id}
                name={d.name}
                specialty={d.specialty}
                availableToday={d.availableToday}
                selected={doctor?.id === d.id}
                onClick={() => setDoctor(d)}
              />
            ))}
          </div>
        </BookingPanel>
      </BookingWizardShell>
    );
  }

  if (step === 'datetime') {
    const dates = Object.keys(schedule);
    return (
      <BookingWizardShell
        stepKey='datetime'
        title={BOOKING_STEP_META.datetime.title}
        onBack={goBack}
        footerLabel='ถัดไป'
        footerDisabled={!date || !time}
        onFooter={() => go('confirm')}
      >
        <BookingPanel title='เลือกวันและเวลาที่สะดวก'>
          <div className='flex overflow-x-auto' style={{ gap: 'var(--dim-space-200, 8px)', paddingBottom: 4 }}>
            {dates.map((d) => {
              const active = d === date;
              const [, mm, dd] = d.split('-');
              return (
                <button
                  key={d}
                  type='button'
                  onClick={() => { setDate(d); setTime(null); }}
                  style={{
                    flex: '0 0 72px',
                    height: 84,
                    borderRadius: 'var(--dim-radius-300, 10px)',
                    border: active
                      ? 'var(--dim-stroke-200) solid var(--border-brandPrimary-default)'
                      : 'var(--dim-stroke-100) solid var(--border-neutral-tertiary)',
                    background: active ? 'var(--surface-brandPrimary-default)' : 'var(--surface-card-100)',
                    color: active ? 'var(--text-brandPrimary-on-brand)' : 'var(--text-content-default)',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ fontSize: 'var(--type-size-xl)', fontWeight: 'var(--type-weight-bold)' }}>{Number(dd)}</div>
                  <div style={{ fontSize: 'var(--type-size-xs)' }}>{THAI_MONTHS_SHORT[mm - 1]}</div>
                </button>
              );
            })}
          </div>
          {date && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--dim-space-200, 8px)' }}>
              {schedule[date].map((t) => {
                const active = t === time;
                return (
                  <button
                    key={t}
                    type='button'
                    onClick={() => setTime(t)}
                    style={{
                      height: 44,
                      borderRadius: 'var(--dim-radius-full)',
                      border: active
                        ? 'var(--dim-stroke-200) solid var(--border-brandPrimary-default)'
                        : 'var(--dim-stroke-100) solid var(--border-neutral-tertiary)',
                      background: active ? 'var(--surface-brandPrimary-default)' : 'var(--surface-card-100)',
                      color: active ? 'var(--text-brandPrimary-on-brand)' : 'var(--text-content-default)',
                      fontWeight: 'var(--type-weight-bold)',
                      cursor: 'pointer',
                    }}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          )}
        </BookingPanel>
      </BookingWizardShell>
    );
  }

  /* confirm */
  return (
    <BookingWizardShell
      stepKey='confirm'
      title={BOOKING_STEP_META.confirm.title}
      onBack={goBack}
      footerLabel='ยืนยันเวลานัดหมาย'
      footerDisabled={!symptom.trim()}
      onFooter={confirmBooking}
    >
      <div className='flex flex-col' style={{ gap: 'var(--dim-space-200, 8px)' }}>
        <MobileCard padding='var(--dim-space-400, 16px)'>
          <div className='flex items-center' style={{ gap: 'var(--dim-space-400, 16px)' }}>
            <span
              className='inline-flex items-center justify-center shrink-0'
              style={{
                width: 48, height: 48, borderRadius: 'var(--dim-radius-full)',
                background: 'var(--surface-brandPrimary-default)',
                color: 'var(--text-brandPrimary-on-brand)',
                fontWeight: 'var(--type-weight-bold)',
              }}
            >
              {doctor?.name.replace(/[นพ\.พญ\.พ\.ว\.\s]/g, '').slice(0, 2)}
            </span>
            <div>
              <p style={{ margin: 0, fontFamily: 'var(--type-family-heading-graphic2)', fontSize: 'var(--type-size-base)' }}>{doctor?.name}</p>
              <div className='flex items-center' style={{ gap: 'var(--dim-space-100, 4px)' }}>
                <Sym name='stethoscope' size={14} color='var(--text-content-tertiary)' />
                <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-tertiary)' }}>{doctor?.specialty}</span>
              </div>
            </div>
          </div>
        </MobileCard>

        <MobileCard padding='var(--dim-space-400, 16px)'>
          <p style={{ margin: '0 0 var(--dim-space-400, 16px)', fontSize: 'var(--type-size-sm)', color: 'var(--text-content-tertiary)' }}>รายละเอียดการนัดหมาย</p>
          <div className='flex flex-col' style={{ gap: 'var(--dim-space-400, 16px)' }}>
            <ConfirmDetailRow icon='calendar_today' label='วันที่' value={formatThaiDateShort(date)} />
            <ConfirmDetailRow icon='schedule' label='เวลา' value={`${time} น.`} />
            <ConfirmDetailRow
              icon={serviceType === 'online' ? 'videocam' : 'local_hospital'}
              label='ประเภทการเข้ารับบริการ'
              value={serviceType === 'online' ? 'เข้ารับบริการออนไลน์ (Telemedicine)' : 'เข้ารับบริการที่ศูนย์'}
              tone={serviceType === 'online' ? 'indigo' : 'green'}
            />
          </div>
        </MobileCard>

        <MobileCard padding='var(--dim-space-400, 16px)'>
          <p style={{ margin: '0 0 var(--dim-space-300, 12px)', fontSize: 'var(--type-size-sm)', color: 'var(--text-content-tertiary)' }}>ข้อมูลประกอบการนัดหมาย</p>
          <label style={{ display: 'block', fontSize: 'var(--type-size-sm)', color: 'var(--text-content-default)', marginBottom: 'var(--dim-space-150, 6px)' }}>
            อาการเบื้องต้น / หมายเหตุ <span style={{ color: 'var(--text-input-require)' }}>*</span>
          </label>
          <textarea
            className='mih-mobile-book-note'
            value={symptom}
            onChange={(e) => setSymptom(e.target.value)}
            placeholder='เช่น มีอาการเจ็บหน้าอกแปลบๆ บางครั้งเวลาออกกำลังกายหนัก ต้องการปรึกษาเบื้องต้น'
            rows={4}
            style={{
              width: '100%',
              minHeight: 96,
              padding: 'var(--dim-space-200, 8px) var(--dim-space-300, 12px)',
              borderRadius: 'var(--dim-radius-200, 8px)',
              border: 'var(--dim-stroke-100) solid var(--border-input-default)',
              background: 'var(--surface-input-default)',
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-base)',
              color: 'var(--text-content-default)',
              resize: 'none',
            }}
          />
        </MobileCard>
      </div>
    </BookingWizardShell>
  );
};

const MobileBookPage = () => (
  <MobileShell showBottomNav={false} background='var(--background-screen-brand-100)'>
    <MobileBookInner />
  </MobileShell>
);

export default MobileBookPage;
