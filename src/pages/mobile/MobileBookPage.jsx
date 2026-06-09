import React, { useMemo, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import {
  MobileShell,
  MobileHeader,
  MobileCard,
  MobileButton,
  MobileBadge,
  Sym,
} from '@/components/mobile/MobileShell';
import { CLINICS, DOCTORS, SCHEDULE_SLOTS } from '@/data/mobileMock';

/* MIH PHCIS Mobile · Appointment booking flow — TOR §4.2.1 / §4.2.6.4.
   4-step wizard:
     1. clinic       — pick a service center
     2. department   — pick a clinic department
     3. doctor       — pick from doctors available at that clinic + dept
     4. date + slot  — choose date and time from SCHEDULE_SLOTS grid
   Final success card shows the new appointment ID + summary.             */

const STEPS = ['clinic', 'dept', 'doctor', 'slot', 'done'];

const formatThaiDate = (yyyy_mm_dd) => {
  const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  const [y, m, d] = yyyy_mm_dd.split('-').map(Number);
  return `${d} ${months[m - 1]} ${y}`;
};

const StepDots = ({ idx }) => (
  <div className='flex items-center justify-center' style={{ gap: 6 }}>
    {STEPS.slice(0, -1).map((_, i) => (
      <span key={i}
        style={{
          width: i === idx ? 24 : 8,
          height: 8, borderRadius: 999,
          background: i <= idx ? 'var(--surface-brandPrimary-default, #007549)' : 'var(--surface-content-secondary, #E1E3E5)',
          transition: 'all 200ms ease',
        }}
      />
    ))}
  </div>
);

const MobileBookInner = () => {
  const history = useHistory();
  const { search } = useLocation();
  const reschedule = new URLSearchParams(search).get('reschedule');

  const [step, setStep] = useState('clinic');
  const [clinic, setClinic] = useState(null);
  const [dept,   setDept]   = useState(null);
  const [doctor, setDoctor] = useState(null);
  const [date,   setDate]   = useState(null);
  const [time,   setTime]   = useState(null);

  const idx = STEPS.indexOf(step);
  const titlePrefix = reschedule ? 'เลื่อนนัดหมาย' : 'ทำนัดหมายใหม่';

  const goBack = () => {
    const i = STEPS.indexOf(step);
    if (i > 0) setStep(STEPS[i - 1]);
    else history.push('/m/appointments');
  };

  const availableDoctors = useMemo(() => {
    if (!clinic || !dept) return [];
    return DOCTORS.filter((d) => d.dept === dept.key && d.clinics.includes(clinic.code));
  }, [clinic, dept]);

  const schedule = useMemo(() => {
    if (!clinic || !dept) return {};
    return SCHEDULE_SLOTS[`${clinic.code}_${dept.key}`] || {};
  }, [clinic, dept]);

  const renderClinic = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--dim-space-300, 12px)' }}>
      <p style={subStyle}>เลือกศูนย์บริการสาธารณสุขที่คุณต้องการเข้ารับบริการ</p>
      {CLINICS.map((c) => (
        <MobileCard key={c.code}
          onClick={() => { setClinic(c); setDept(null); setDoctor(null); setStep('dept'); }}>
          <div className='flex items-start' style={{ gap: 'var(--dim-space-300, 12px)' }}>
            <Sym name='local_hospital' size={28} color='var(--text-brandPrimary-default)' fill />
            <div className='flex-1 min-w-0'>
              <p style={{
                margin: 0,
                fontFamily: 'var(--type-family-display)',
                fontSize: 'var(--type-size-base, 16px)',
                fontWeight: 'var(--type-weight-bold, 700)',
                color: 'var(--text-content-primary)',
              }}>{c.name}</p>
              <p style={{ margin: 0, fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary)' }}>
                {c.distanceKm} กม. · {c.hours}
              </p>
            </div>
            <Sym name='chevron_right' size={20} color='var(--text-content-tertiary)' />
          </div>
        </MobileCard>
      ))}
    </div>
  );

  const renderDept = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--dim-space-300, 12px)' }}>
      <p style={subStyle}>คลินิกที่เปิดให้บริการที่ <strong>{clinic.name}</strong></p>
      {clinic.departments.map((d) => (
        <MobileCard key={d.key} onClick={() => { setDept(d); setDoctor(null); setStep('doctor'); }}>
          <div className='flex items-center' style={{ gap: 'var(--dim-space-300, 12px)' }}>
            <span style={{
              width: 40, height: 40, borderRadius: 'var(--dim-radius-300, 10px)',
              background: 'var(--surface-brandPrimary-quaternary, #F4FBF8)',
              color: 'var(--text-brandPrimary-default, #007549)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Sym name='stethoscope' size={20} fill />
            </span>
            <span style={{ flex: 1, fontWeight: 'var(--type-weight-bold, 700)', color: 'var(--text-content-primary)' }}>
              {d.label}
            </span>
            <Sym name='chevron_right' size={20} color='var(--text-content-tertiary)' />
          </div>
        </MobileCard>
      ))}
    </div>
  );

  const renderDoctor = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--dim-space-300, 12px)' }}>
      <p style={subStyle}>เลือกแพทย์ที่ <strong>{dept.label}</strong></p>
      {availableDoctors.length === 0 && (
        <MobileCard>
          <p style={{ margin: 0, color: 'var(--text-content-tertiary)', textAlign: 'center' }}>
            ขณะนี้ยังไม่มีตารางแพทย์ในคลินิกที่เลือก
          </p>
        </MobileCard>
      )}
      {availableDoctors.map((d) => (
        <MobileCard key={d.id} onClick={() => { setDoctor(d); setStep('slot'); }}>
          <div className='flex items-center' style={{ gap: 'var(--dim-space-300, 12px)' }}>
            <span style={{
              width: 48, height: 48, borderRadius: 'var(--dim-radius-full)',
              background: 'var(--surface-brandPrimary-default, #007549)',
              color: '#FFFFFF',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700,
            }}>{d.name.replace(/[นพ\.พญ\.พ\.ว\.\s]/g, '').slice(0, 2)}</span>
            <div className='flex-1 min-w-0'>
              <p style={{ margin: 0, fontWeight: 'var(--type-weight-bold, 700)', color: 'var(--text-content-primary)' }}>{d.name}</p>
              <p style={{ margin: 0, fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary)' }}>
                ID {d.id} · {dept.label}
              </p>
            </div>
            <Sym name='chevron_right' size={20} color='var(--text-content-tertiary)' />
          </div>
        </MobileCard>
      ))}
    </div>
  );

  const renderSlot = () => {
    const dates = Object.keys(schedule);
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--dim-space-300, 12px)' }}>
        <p style={subStyle}>เลือกวันและเวลาที่สะดวก</p>
        {/* Date row */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
          {dates.length === 0 && (
            <p style={{ color: 'var(--text-content-tertiary)' }}>ไม่มีตารางว่างของแพทย์ในระยะนี้</p>
          )}
          {dates.map((d) => {
            const active = d === date;
            const [, mm, dd] = d.split('-');
            return (
              <button key={d} type='button' onClick={() => { setDate(d); setTime(null); }}
                style={{
                  flex: '0 0 64px', height: 76,
                  borderRadius: 'var(--dim-radius-300, 10px)',
                  background: active ? 'var(--surface-brandPrimary-default, #007549)' : 'var(--surface-content-default, #FFFFFF)',
                  border: active ? '1.5px solid var(--surface-brandPrimary-default)' : '1.5px solid var(--border-content-tertiary)',
                  color: active ? '#FFFFFF' : 'var(--text-content-primary)',
                  cursor: 'pointer', display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                <span style={{ fontSize: 'var(--type-size-xs, 12px)', opacity: 0.85 }}>
                  {['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'][new Date(d).getDay()]}
                </span>
                <span style={{ fontSize: 'var(--type-size-xl, 20px)', fontWeight: 700, lineHeight: 1.1 }}>{Number(dd)}</span>
                <span style={{ fontSize: 'var(--type-size-xs, 12px)', opacity: 0.85 }}>เดือน {Number(mm)}</span>
              </button>
            );
          })}
        </div>

        {/* Time grid */}
        {date && (
          <div>
            <p style={{ margin: '0 0 8px', fontSize: 'var(--type-size-sm, 14px)', fontWeight: 700, color: 'var(--text-content-primary)' }}>
              {formatThaiDate(date)} — เลือกเวลา
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {schedule[date].map((t) => {
                const active = t === time;
                return (
                  <button key={t} type='button' onClick={() => setTime(t)}
                    style={{
                      height: 44, borderRadius: 'var(--dim-radius-300, 10px)',
                      background: active ? 'var(--surface-brandPrimary-default, #007549)' : 'var(--surface-content-default, #FFFFFF)',
                      border: active ? '1.5px solid var(--surface-brandPrimary-default)' : '1.5px solid var(--border-content-tertiary)',
                      color: active ? '#FFFFFF' : 'var(--text-content-primary)',
                      fontWeight: 700, cursor: 'pointer',
                    }}>{t}</button>
                );
              })}
            </div>
          </div>
        )}

        <MobileButton disabled={!date || !time} onClick={() => setStep('done')}>
          ยืนยันนัดหมาย
        </MobileButton>
      </div>
    );
  };

  const renderDone = () => {
    const id = `APT-${Math.floor(Math.random() * 9000 + 1000)}`;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--dim-space-400, 16px)' }}>
        <MobileCard padding='var(--dim-space-500, 20px)' style={{ textAlign: 'center' }}>
          <div style={{
            width: 72, height: 72, margin: '0 auto var(--dim-space-300, 12px)',
            background: 'linear-gradient(135deg, #007549 0%, #4CC6AE 100%)',
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF',
          }}>
            <Sym name='check' size={40} />
          </div>
          <h2 style={titleStyle}>{reschedule ? 'เลื่อนนัดหมายสำเร็จ' : 'ทำนัดหมายสำเร็จ'}</h2>
          <p style={subStyle}>ระบบได้บันทึกนัดหมายและจะส่งการแจ้งเตือนก่อนถึงเวลา</p>
        </MobileCard>

        <MobileCard>
          <Row label='รหัสนัดหมาย' value={id} mono />
          <Row label='ศูนย์บริการ' value={clinic.name} />
          <Row label='คลินิก' value={dept.label} />
          <Row label='แพทย์' value={doctor.name} />
          <Row label='วันและเวลา' value={`${formatThaiDate(date)} · ${time} น.`} />
        </MobileCard>

        <MobileButton onClick={() => history.push('/m/appointments')}>
          กลับสู่รายการนัดหมาย
        </MobileButton>
      </div>
    );
  };

  return (
    <>
      <MobileHeader
        title={step === 'done' ? 'ยืนยันการนัดหมาย' : titlePrefix}
        subtitle={step === 'done' ? undefined : `ขั้นที่ ${idx + 1} จาก 4`}
        onBack={goBack}
      />
      <div style={{ padding: 'var(--dim-space-400, 16px)', display: 'flex', flexDirection: 'column', gap: 'var(--dim-space-400, 16px)' }}>
        {step !== 'done' && <StepDots idx={idx} />}
        {step === 'clinic' && renderClinic()}
        {step === 'dept'   && renderDept()}
        {step === 'doctor' && renderDoctor()}
        {step === 'slot'   && renderSlot()}
        {step === 'done'   && renderDone()}
      </div>
    </>
  );
};

const Row = ({ label, value, mono }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--dim-space-300, 12px)', padding: '10px 0', borderBottom: '1px solid var(--border-content-quaternary, #F0F1F3)' }}>
    <span style={{ fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-tertiary)' }}>{label}</span>
    <span style={{
      fontSize: 'var(--type-size-sm, 14px)',
      fontWeight: 'var(--type-weight-bold, 700)',
      color: 'var(--text-content-primary)',
      fontFamily: mono ? 'ui-monospace, monospace' : 'inherit',
      textAlign: 'right',
    }}>{value}</span>
  </div>
);

const titleStyle = {
  margin: '0 0 4px',
  fontFamily: 'var(--type-family-display)',
  fontSize: 'var(--type-size-lg, 18px)',
  fontWeight: 'var(--type-weight-bold, 700)',
  color: 'var(--text-content-primary)',
};

const subStyle = {
  margin: 0,
  fontSize: 'var(--type-size-sm, 14px)',
  color: 'var(--text-content-tertiary)',
  lineHeight: 1.5,
};

const MobileBookPage = () => (
  <MobileShell>
    <MobileBookInner />
  </MobileShell>
);

export default MobileBookPage;
