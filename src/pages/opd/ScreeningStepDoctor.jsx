import React, { useEffect, useMemo, useState } from 'react';
import Icon from '@/components/icons/Icon';
import AppointmentCalendarSlot from '@/components/appointment/AppointmentCalendarSlot';
import Select from '@/components/forms/Select';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import NeutralIconButton from '@/components/button/NeutralIconButton';
import { setScreeningSection, getScreeningReview } from '@/data/opdScreeningReview';
import { UNASSIGNED_DOCTOR, TREAT_CLINICS } from '@/data/unassignedWorklist';
import { buildDoctorRoster } from '@/pages/appointment/appointmentDoctorRoster';
import { PATIENT_PROFILES } from '@/data/patientProfiles';

/* ScreeningStepDoctor — ขั้น "เลือกแพทย์" ของจุดคัดกรอง
   ══════════════════════════════════════════════════════════════════════════
   พยาบาลเป็นคนเลือกแพทย์เอง และต้องเห็นช่วงเวลาที่แพทย์คนนั้นยังว่างเพื่อลงคิว
   ให้ผู้รับบริการได้ในขั้นตอนเดียว (มติผู้ใช้ 28 ส.ค. 69)

   เดิมช่อง "แพทย์ผู้รักษา" เป็น dropdown เล็ก ๆ ท้ายขั้น "อาการป่วย" ซึ่งตอบได้
   แค่ว่าใคร ไม่ได้ตอบว่า "แล้วคิวไปลงตรงไหน" พยาบาลจึงต้องไปเปิดตารางเวรอีกจอ
   แล้วจำเวลากลับมากรอก การให้เลือกแพทย์กับเลือกช่วงเวลาอยู่ด้วยกันทำให้เห็นทันที
   ว่าหมอคนไหนคิวแน่นแล้ว และตัดสินใจจากของจริงแทนความจำ

   "ไม่ระบุแพทย์" ยังเป็นตัวเลือกแรกเสมอ — ศูนย์ที่ไม่มอบหมายแพทย์ที่จุดคัดกรอง
   ใช้ทางนี้ แล้วเคสจะไปรออยู่ที่ "คิวรวมรอรับเคส" ให้แพทย์หยิบเอง เลือกทางนี้แล้ว
   ไม่ต้องเลือกช่วงเวลา เพราะยังไม่รู้ว่าใครจะเป็นคนตรวจ

   ⚠️ ช่องที่ "เต็ม" เป็นข้อมูลจำลอง — ต้นแบบยังไม่มีตารางนัดจริงต่อแพทย์ต่อวัน
   จึงคำนวณจากรหัสแพทย์กับลำดับช่อง (deterministic ไม่สุ่ม) เพื่อให้แต่ละคน
   มีคิวแน่นไม่เท่ากันแบบที่ของจริงเป็น และค่าไม่กระโดดทุกครั้งที่ re-render */

const DOCTORS = buildDoctorRoster();

/* คลินิกของศูนย์ → แผนกของแพทย์ในทะเบียน (มติผู้ใช้ 28 ส.ค. 69)
   สองชุดคำนี้ไม่ตรงกันโดยธรรมชาติ: ทะเบียนแพทย์เก็บสาขาแบบโรงพยาบาล
   (อายุรกรรม/กุมารเวช) ส่วนคลินิกเป็นชื่อบริการของศูนย์บริการสาธารณสุข
   จึงต้องประกาศคู่กันไว้ตรง ๆ ที่เดียว แทนการเดาจากคำที่ซ้อนกัน

   คลินิกที่ไม่ได้ระบุไว้ (หรือระบุแล้วไม่มีแพทย์คนไหนตรง) จะแสดงรายชื่อทั้งหมด
   — ซ่อนหมอที่ถูกคนเพราะตารางแมปไม่ครบ แย่กว่าให้เลือกจากรายชื่อยาว */
const CLINIC_DEPTS = {
  'opd-treat': ['อายุรกรรม', 'เวชศาสตร์ครอบครัว', 'อุบัติเหตุและฉุกเฉิน', 'ศัลยกรรม',
    'ศัลยกรรมกระดูก', 'โรคผิวหนัง', 'โสต ศอ นาสิก', 'จักษุวิทยา', 'ประสาทวิทยา'],
  family:     ['สูติ-นรีเวช', 'เวชศาสตร์ครอบครัว'],
  std:        ['อายุรกรรม', 'เวชศาสตร์ครอบครัว'],
  drug:       ['สุขภาพจิต', 'อายุรกรรม'],
  anc:        ['สูติ-นรีเวช'],
  ncd:        ['อายุรกรรม', 'เวชศาสตร์ครอบครัว'],
  wellness:   ['เวชศาสตร์ครอบครัว', 'อายุรกรรม'],
  vaccine:    ['กุมารเวช', 'เวชศาสตร์ครอบครัว'],
  dental:     ['ทันตกรรม'],
  tb:         ['อายุรกรรม'],
  mental:     ['สุขภาพจิต'],
  rehab:      ['เวชศาสตร์ฟื้นฟู', 'ศัลยกรรมกระดูก'],
  social:     ['เวชศาสตร์ครอบครัว', 'สุขภาพจิต'],
};

export const doctorsForClinic = (clinicKey) => {
  const depts = CLINIC_DEPTS[clinicKey];
  if (!depts?.length) return DOCTORS;
  const matched = DOCTORS.filter((d) => depts.includes(d.dept));
  return matched.length ? matched : DOCTORS;
};

/* กว้างพอให้ชิปช่วงเวลา 15 นาที (เช่น "08:00-08:15") วางได้สองชิปต่อแถวพอดี
   แคบกว่านี้ชิปจะตกบรรทัดละอัน กว้างกว่านี้กินที่ของรายชื่อแพทย์ */
const SLOT_PANEL_WIDTH = 340;

/* ตารางการ์ดแพทย์ — ประกาศไว้ที่เดียวเพราะ dropdown คลินิกต้องกว้างเท่าการ์ด
   หนึ่งใบพอดี (มติผู้ใช้ 28 ส.ค. 69) วิธีที่ไม่ต้องเดาความกว้างคือให้ dropdown
   อยู่ใน grid ชุดเดียวกันแล้วกินหนึ่งช่อง ความกว้างจึงตรงกันเสมอแม้จอเปลี่ยน */
const DOCTOR_GRID_STYLE = {
  gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
  gap: 'var(--dim-space-300)',
};

/* ช่วงเวลาออกตรวจของศูนย์ — เช้า 08:00–12:00 · บ่าย 13:00–16:00 */
const PERIODS = [
  { key: 'morning',   label: 'ช่วงเช้า',  start: 8 * 60,  end: 12 * 60 },
  { key: 'afternoon', label: 'ช่วงบ่าย', start: 13 * 60, end: 16 * 60 },
];

const hhmm = (mins) =>
  `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;

const buildSlots = (doctor) => {
  const step = doctor?.slotMinutes || 15;
  return PERIODS.map((p) => {
    const slots = [];
    for (let t = p.start; t + step <= p.end; t += step) {
      slots.push({ value: `${hhmm(t)}-${hhmm(t + step)}`, label: hhmm(t), start: t });
    }
    return { ...p, slots };
  });
};

/* คิวที่ถูกจองไปแล้ว (จำลอง) — ผูกกับรหัสแพทย์ ช่วงเช้าแน่นกว่าบ่ายตามที่
   ศูนย์บริการสาธารณสุขเป็นจริง */
const isSlotTaken = (doctor, periodKey, index) => {
  const seed = Number(doctor?.id || 1);
  const density = periodKey === 'morning' ? 3 : 5;
  return (index + seed) % density === 0;
};

/* ใครจองช่องนั้นไว้ (จำลอง) — ช่องที่เต็มต้องบอกได้ว่าเต็มเพราะใคร ไม่ใช่แค่
   จางลงเฉย ๆ พยาบาลจะได้ตอบผู้รับบริการได้ว่าคิวนั้นมีคนแล้วจริง */
const slotHolder = (doctor, periodKey, index) => {
  const seed = Number(doctor?.id || 1) + index + (periodKey === 'morning' ? 0 : 7);
  const p = PATIENT_PROFILES[seed % PATIENT_PROFILES.length];
  return { name: p.shortName, avatar: p.avatarUrl };
};

/* ขั้นตอนนี้แบ่งเป็นสองกลุ่มการ์ด: เลือกแพทย์ (ซ้าย) กับ ช่วงเวลา (ขวา)
   (มติผู้ใช้ 28 ส.ค. 69) — เป็นคนละคำถามกัน "จะให้ใครตรวจ" กับ "กี่โมง"
   จึงต้องอ่านออกว่าเป็นคนละกล่อง ไม่ใช่เนื้อความยาวต่อกันไป
   ใช้ chrome ชุดเดียวกันทั้งสองใบ (พื้นขาว + เส้นขอบ + เงา) เพื่อให้อ่านเป็น
   ของระดับเดียวกัน ไม่ใช่กล่องหลักกับกล่องรอง */
/* ชุด chrome ของการ์ดขาว = การ์ดของขั้นอื่นในฟอร์มคัดกรองทุกตัว
   (fieldset ใน ScreeningPage: `bg-surface-card rounded-card shadow-card`)
   ผู้ใช้ชี้การ์ดขั้นสัญญาณชีพเป็นแบบอ้างอิง (มติผู้ใช้ 29 ส.ค. 69) — ไม่มีเส้นขอบ
   radius-500 และ --shadow-card ซึ่งเป็น Brand Drop Shadow Bottom/200 ตัวเดิม
   ค่าอื่นที่ลองมา (shadow-card-strong / เส้นขอบ / radius-400) ล้วนต่างจากนี้
   เล็กน้อยแต่เห็นได้เมื่ออยู่ในฟอร์มเดียวกัน */
const CARD_STYLE = {
  background: 'var(--surface-card-100)',
  borderRadius: 'var(--dim-radius-500, 16px)',
  boxShadow: 'var(--shadow-card)',
  padding: 'var(--dim-space-600)',
};

const SectionTitle = ({ icon, children, trailing }) => (
  <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-200)' }}>
    <Icon name={icon} size={18} color='var(--icon-brandPrimary-default)' />
    <span style={{
      color: 'var(--text-brandPrimary-default)',
      fontFamily: 'var(--type-family-heading-content)',
      fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
      fontSize: 'var(--type-size-base)',
    }}
    >
      {children}
    </span>
    <div className='flex-1' />
    {trailing}
  </div>
);

/* การ์ดแพทย์หนึ่งคน — รูป ชื่อ สาขา และจำนวนช่องที่ยังว่าง ซึ่งเป็นตัวเลขที่
   พยาบาลใช้ตัดสินใจจริงว่าจะส่งไปหาใคร */
const DoctorCard = ({ doctor, selected, freeCount, onClick }) => {
  /* การ์ดต้องขยับตอนชี้ (มติผู้ใช้ 28 ส.ค. 69) — ทั้งใบเป็นปุ่ม แต่หน้าตานิ่งสนิท
     จนไม่มีอะไรบอกว่ากดได้ ใช้พื้นแบรนด์จาง + เส้นขอบเข้มขึ้นตอน hover ซึ่งเป็น
     ครึ่งทางไปหาสถานะ selected คนใช้จึงเดาผลของการกดได้ก่อนกด */
  const [hover, setHover] = useState(false);
  return (
  <button
    type='button'
    onClick={onClick}
    onMouseEnter={() => setHover(true)}
    onMouseLeave={() => setHover(false)}
    onFocus={() => setHover(true)}
    onBlur={() => setHover(false)}
    className='flex items-center text-left w-full'
    style={{
      gap: 'var(--dim-space-300)',
      padding: 'var(--dim-space-300)',
      borderRadius: 'var(--dim-radius-300)',
      background: selected || hover
        ? 'var(--surface-brandPrimary-quaternary)'
        : 'var(--surface-card-100)',
      border: selected
        ? 'var(--dim-stroke-200) solid var(--border-brandPrimary-default)'
        : `var(--dim-stroke-100) solid ${hover
          ? 'var(--border-brandPrimary-tertiary, var(--border-brandPrimary-default))'
          : 'var(--border-neutral-quaternary)'}`,
      /* ยกการ์ดด้วย Brand Drop Shadow แทนการเปลี่ยนแค่เส้นขอบ (มติผู้ใช้
         28 ส.ค. 69) — เงาสีแบรนด์ทำให้ใบที่เลือกลอยขึ้นมาจากรายการจริง ๆ
         ไม่ใช่แค่เส้นเข้มขึ้นซึ่งมองข้ามได้ในรายการยาว hover ใช้ระดับ 100
         ที่เบากว่า เพื่อให้ลำดับความเด่นเป็น เลือกแล้ว > กำลังชี้ > ปกติ */
      boxShadow: selected
        ? 'var(--shadow-brand-drop-bottom-200)'
        : hover
          ? 'var(--shadow-brand-drop-bottom-100)'
          : 'none',
      cursor: 'pointer',
      transition: 'background 160ms cubic-bezier(0.32, 0.72, 0, 1), border-color 160ms cubic-bezier(0.32, 0.72, 0, 1), box-shadow 160ms cubic-bezier(0.32, 0.72, 0, 1)',
    }}
    aria-pressed={selected}
  >
    <img
      src={doctor.avatarSrc}
      alt=''
      width={40}
      height={40}
      style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
    />
    <span className='flex flex-col min-w-0 flex-1'>
      <span style={{
        fontFamily: 'var(--type-family-body)',
        fontWeight: 'var(--type-weight-medium)',
        fontSize: 'var(--type-size-sm)',
        color: 'var(--text-content-default)',
      }}
      >
        {doctor.name}
      </span>
      <span style={{
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-xs)',
        color: 'var(--text-content-tertiary)',
      }}
      >
        {[doctor.subDivision, doctor.dept].filter(Boolean).join(' · ')}
      </span>
    </span>
    <ColorfulBadge
      style={freeCount > 6 ? 'teal' : freeCount > 0 ? 'orange' : 'grey'}
      size='small'
      hierarchy='secondary'
      width='hug'
    >
      {freeCount > 0 ? `ว่าง ${freeCount} ช่อง` : 'เต็ม'}
    </ColorfulBadge>
  </button>
  );
};

const ScreeningStepDoctor = ({ onValidityChange, patient = {} }) => {
  /* อ่านค่าที่เคยเลือกไว้กลับมา — เดินย้อนขั้นแล้วกลับมาต้องไม่ลืมของเดิม */
  const saved = getScreeningReview(patient.hn)?.doctor || {};
  const [clinicKey, setClinicKey] = useState(saved.assignedClinicKey ?? 'opd-treat');
  const [doctorName, setDoctorName] = useState(saved.assignedDoctor ?? UNASSIGNED_DOCTOR);
  const [slot, setSlot] = useState(saved.assignedSlot ?? '');

  const unassigned = doctorName === UNASSIGNED_DOCTOR;
  const clinicDoctors = useMemo(() => doctorsForClinic(clinicKey), [clinicKey]);
  const doctor = useMemo(
    () => DOCTORS.find((d) => d.name === doctorName) || null,
    [doctorName],
  );

  const periods = useMemo(() => (doctor ? buildSlots(doctor) : []), [doctor]);

  const freeCountFor = (d) => buildSlots(d).reduce(
    (n, p) => n + p.slots.filter((_, i) => !isSlotTaken(d, p.key, i)).length,
    0,
  );

  /* เลือก "ไม่ระบุแพทย์" ถือว่าครบแล้ว · เลือกแพทย์ต้องเลือกช่วงเวลาด้วย
     ไม่งั้นได้ชื่อหมอแต่ไม่มีคิว ซึ่งเป็นสถานะที่ปลายทางใช้ไม่ได้ */
  /* ต้องเลือกคลินิกปลายทางเสมอ — เป็นสิ่งที่บอกว่าเคสจะไปโผล่ที่คิวไหน
     ส่วนแพทย์: เลือก "ไม่ระบุแพทย์" ถือว่าครบ · เลือกชื่อแพทย์ต้องมีช่วงเวลาด้วย */
  const valid = !!clinicKey && (unassigned || (!!doctor && !!slot));
  useEffect(() => {
    if (typeof onValidityChange === 'function') onValidityChange(valid);
  }, [valid, onValidityChange]);

  useEffect(() => {
    setScreeningSection(patient.hn, 'doctor', {
      assignedClinicKey: clinicKey,
      assignedDoctor: doctorName,
      assignedSlot: unassigned ? '' : slot,
      assignedDept: unassigned ? '' : (doctor?.dept || ''),
    });
  }, [patient.hn, clinicKey, doctorName, slot, unassigned, doctor]);

  const pickDoctor = (name) => {
    setDoctorName(name);
    /* เปลี่ยนหมอแล้วช่วงเวลาเดิมใช้ไม่ได้ — ตารางคนละคน */
    setSlot('');
  };

  /* เปลี่ยนคลินิกแล้วหมอที่เลือกไว้อาจไม่ออกตรวจคลินิกนั้น — ต้องคืนค่าเป็น
     "ไม่ระบุแพทย์" ไม่ใช่ปล่อยให้ชื่อค้างอยู่ทั้งที่หายไปจากรายชื่อแล้ว */
  const pickClinic = (nextKey) => {
    setClinicKey(nextKey);
    const stillListed = doctorsForClinic(nextKey).some((d) => d.name === doctorName);
    if (!stillListed) {
      setDoctorName(UNASSIGNED_DOCTOR);
      setSlot('');
    }
  };

  return (
    /* สองคอลัมน์: รายชื่อแพทย์ทางซ้าย · ช่วงเวลาของคนที่เลือกเป็นการ์ดด้านขวา
       (มติผู้ใช้ 28 ส.ค. 69) — เดิมช่วงเวลาอยู่ใต้รายชื่อ พอเลือกหมอที่อยู่แถวล่าง
       ต้องเลื่อนลงไปอีก แล้วมองไม่เห็นว่ากำลังดูตารางของใครอยู่
       การ์ดขวา sticky จึงติดตาไว้ตลอดขณะไล่ดูรายชื่อ */
    <div
      className='flex w-full items-start'
      /* ไม่ใส่ระยะขอบของตัวเอง (มติผู้ใช้ 28 ส.ค. 69) — คอนเทนเนอร์ของฟอร์ม
         คัดกรองให้ 24px มาแล้ว ใส่ซ้ำอีกชั้นกลายเป็น 48px ซึ่งห่างกว่าหน้าอื่น
         ในระบบเห็นได้ชัด (ขั้นอื่นไม่เจอปัญหานี้เพราะระยะขอบมาจากการ์ดของ
         fieldset ที่ขั้นนี้ถอดออกไปแล้ว) */
      style={{ gap: 'var(--dim-space-400)' }}
    >
      {/* ระยะระหว่าง "คลินิกที่ต้องการรักษา" กับ "แพทย์ผู้รักษา" = 24px
          (มติผู้ใช้ 28 ส.ค. 69) — สองหัวข้อนี้เป็นคนละเรื่อง 16px ยังอ่านติดกัน */}
      <div className='flex flex-col flex-1 min-w-0' style={{ ...CARD_STYLE, gap: 'var(--dim-space-600)' }}>
        {/* คลินิกที่ต้องการรักษา — บอกว่าเคสนี้จะไปโผล่ที่คิวไหน เดิมค่านี้ถูก
            "เดา" จากชื่อแผนกในป๊อปอัปส่งต่อ ซึ่งเป็นคนละชุดคำกับรายชื่อคลินิก
            ของศูนย์ ให้พยาบาลเลือกตรง ๆ ตรงนี้แทน

            เป็น dropdown ไม่ใช่แถวชิป (มติผู้ใช้ 28 ส.ค. 69) — 13 คลินิกที่ชื่อ
            ยาวไม่เท่ากันกินไปสามบรรทัดเต็มก่อนถึงรายชื่อแพทย์ ทั้งที่เลือกได้
            ค่าเดียว ชิปเหมาะกับตัวเลือกไม่กี่อันที่อยากให้เห็นพร้อมกันหมด */}
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
          <SectionTitle icon='home_health'>คลินิกที่ต้องการรักษา</SectionTitle>
          <div className='grid w-full' style={DOCTOR_GRID_STYLE}>
            <Select
              label='คลินิกที่ต้องการรักษา'
              showLabel={false}
              placeholder='เลือกคลินิก'
              value={clinicKey}
              onChange={pickClinic}
              options={TREAT_CLINICS.map((c) => ({ value: c.key, label: c.label }))}
            />
          </div>
        </div>

        {/* รายชื่อกรองตามคลินิกที่เลือก (มติผู้ใช้ 28 ส.ค. 69) — ดูตาราง
            CLINIC_DEPTS ด้านบนสำหรับคู่คลินิก↔แผนก
            หัวข้อกับรายการอยู่ในกล่องเดียวกันระยะ 12px เท่ากับหัวข้อคลินิกกับ
            dropdown — 24px ของระยะระหว่าง "หมวด" ใช้คั่นสองหมวดเท่านั้น
            ไม่ใช่คั่นหัวข้อกับเนื้อหาของตัวเอง */}
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
        <SectionTitle icon='stethoscope'>แพทย์ผู้รักษา</SectionTitle>

        <div className='grid w-full' style={DOCTOR_GRID_STYLE}>
            {/* "ไม่ระบุแพทย์" เป็นช่องแรกของ grid จึงกว้างเท่าการ์ดแพทย์ใบอื่น
                (มติผู้ใช้ 28 ส.ค. 69) — เดิมกินเต็มความกว้างจนดูเป็นแบนเนอร์
                คนละระดับกับตัวเลือกอื่น ทั้งที่มันคือตัวเลือกหนึ่งในชุดเดียวกัน
                เส้นประยังคงไว้เพื่อบอกว่าเป็นทางเลือกเชิงนโยบาย ไม่ใช่ตัวบุคคล */}
          <button
            type='button'
            onClick={() => pickDoctor(UNASSIGNED_DOCTOR)}
            className='flex items-center text-left w-full'
            style={{
              gap: 'var(--dim-space-300)',
              padding: 'var(--dim-space-300)',
              borderRadius: 'var(--dim-radius-300)',
              background: unassigned
                ? 'var(--surface-brandPrimary-quaternary)'
                : 'var(--surface-card-100)',
              border: unassigned
                ? 'var(--dim-stroke-200) solid var(--border-brandPrimary-default)'
                : 'var(--dim-stroke-100) dashed var(--border-neutral-tertiary, #E2E4E6)',
              cursor: 'pointer',
            }}
            aria-pressed={unassigned}
          >
            <Icon name='groups' size={24} color='var(--icon-brandPrimary-default)' />
            <span className='flex flex-col min-w-0 flex-1'>
              <span style={{
                fontFamily: 'var(--type-family-body)',
                fontWeight: 'var(--type-weight-medium)',
                fontSize: 'var(--type-size-sm)',
                color: 'var(--text-content-default)',
              }}
              >
                {UNASSIGNED_DOCTOR}
              </span>
              <span style={{
                fontFamily: 'var(--type-family-body)',
                fontSize: 'var(--type-size-xs)',
                color: 'var(--text-content-tertiary)',
              }}
              >
                ส่งเข้าคิวรวมรอรับเคส ให้แพทย์กดรับเคสเอง
              </span>
            </span>
          </button>

          {clinicDoctors.map((d) => (
            <DoctorCard
              key={d.id}
              doctor={d}
              selected={doctorName === d.name}
              freeCount={freeCountFor(d)}
              onClick={() => pickDoctor(d.name)}
            />
          ))}
        </div>
        </div>
      </div>

      {doctor && (
        <aside
          style={{
            width: SLOT_PANEL_WIDTH,
            position: 'sticky',
            /* top: 0 เพื่อให้ขอบบนของสองการ์ดตรงกัน (มติผู้ใช้ 28 ส.ค. 69) —
               เดิมเว้น 16px ทำให้การ์ดขวาต่ำกว่าการ์ดซ้ายตลอดเวลาที่เลื่อน */
            top: 0,
            gap: 'var(--dim-space-400)',
            ...CARD_STYLE,
          }}
          aria-label={`ช่วงเวลาที่ว่างของ ${doctor.name}`}
          /* เลื่อนเข้ามาจากด้านขวาแทนการโผล่ทันที (มติผู้ใช้ 28 ส.ค. 69) —
             การ์ดโผล่กลางจอทำให้สายตาหาไม่เจอว่าอะไรเพิ่งเปลี่ยน การเลื่อนบอก
             ว่ามันมาจากไหนและผูกกับหมอที่เพิ่งกด ใช้ key ผูกกับชื่อแพทย์
             เพื่อให้สลับหมอแล้ว animation เล่นใหม่ทุกครั้ง */
          key={doctor.name}
          className='mih-slot-panel-enter flex flex-col shrink-0'
        >
          <div className='flex items-start w-full' style={{ gap: 'var(--dim-space-200)' }}>
            <img
              src={doctor.avatarSrc}
              alt=''
              width={40}
              height={40}
              style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
            />
            <span className='flex flex-col min-w-0 flex-1'>
              <span style={{
                fontFamily: 'var(--type-family-body)',
                fontWeight: 'var(--type-weight-medium)',
                fontSize: 'var(--type-size-sm)',
                color: 'var(--text-content-default)',
              }}
              >
                {doctor.name}
              </span>
              <span style={{
                fontFamily: 'var(--type-family-body)',
                fontSize: 'var(--type-size-xs)',
                color: 'var(--text-content-tertiary)',
              }}
              >
                {[doctor.subDivision, doctor.dept].filter(Boolean).join(' · ')}
              </span>
            </span>
            {/* ปิดการ์ด = ไม่มอบหมายหมอคนนี้แล้ว จึงกลับไปเป็น "ไม่ระบุแพทย์"
                ซึ่งเป็นค่าตั้งต้น ไม่ใช่ปล่อยให้ขั้นตอนค้างแบบไม่มีคำตอบ */}
            {/* ปุ่มปิดชุดเดียวกับหัว Popup ของ design system (NeutralIconButton
                ghost) — ไม่มีพื้นสีจนกว่าจะ hover เพราะเป็น chrome ไม่ใช่ปุ่ม
                สั่งงาน ตัวเดิมมีพื้นเทาตลอดเวลาจนแย่งสายตาไปจากชื่อแพทย์
                (มติผู้ใช้ 28 ส.ค. 69) */}
            <NeutralIconButton
              icon='close'
              variant='ghost'
              size='lg'
              aria-label='ปิดตารางช่วงเวลา'
              onClick={() => pickDoctor(UNASSIGNED_DOCTOR)}
            />
          </div>

          <SectionTitle
            icon='schedule'
            trailing={slot ? (
              <ColorfulBadge style='teal' size='small' hierarchy='secondary' width='hug'>
                {`${slot} น.`}
              </ColorfulBadge>
            ) : null}
          >
            ช่วงเวลาที่ว่าง
          </SectionTitle>

          {periods.map((p) => (
            <div key={p.key} className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200)' }}>
              <span style={{
                fontFamily: 'var(--type-family-body)',
                fontSize: 'var(--type-size-xs)',
                fontWeight: 'var(--type-weight-medium)',
                color: 'var(--text-content-tertiary)',
              }}
              >
                {p.label}
              </span>
              {/* เรียงลงมาแถวละช่อง เต็มความกว้างพาเนล — ทรงเดียวกับตารางนัดของ
                  โมดูลนัดหมาย (มติผู้ใช้ 28 ส.ค. 69) ชิปสองอันต่อแถวอ่านเป็น
                  ตารางที่ต้องกวาดสายตาซ้าย-ขวา ทั้งที่เวลาเป็นลำดับเส้นตรง
                  ช่องที่เต็มแสดงชื่อคนที่จองไว้ ไม่ใช่แค่จางลง */}
              <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-150, 6px)' }}>
                {p.slots.map((s, i) => {
                  const taken = isSlotTaken(doctor, p.key, i);
                  const holder = taken ? slotHolder(doctor, p.key, i) : null;
                  return (
                    <AppointmentCalendarSlot
                      key={s.value}
                      size='medium'
                      time={s.label}
                      booked={taken}
                      patient={holder?.name}
                      patientAvatar={holder?.avatar}
                      disabled={taken}
                      onClick={taken ? undefined : () => setSlot(s.value)}
                      selected={slot === s.value}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </aside>
      )}
    </div>
  );
};

export default ScreeningStepDoctor;
