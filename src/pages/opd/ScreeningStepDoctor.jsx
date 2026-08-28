import React, { useEffect, useMemo, useState } from 'react';
import Icon from '@/components/icons/Icon';
import Timeslot from '@/components/timeslot/Timeslot';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import NeutralSubdueIconButton from '@/components/button/NeutralSubdueIconButton';
import { setScreeningSection, getScreeningReview } from '@/data/opdScreeningReview';
import { UNASSIGNED_DOCTOR } from '@/data/unassignedWorklist';
import { buildDoctorRoster } from '@/pages/appointment/appointmentDoctorRoster';

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

/* กว้างพอให้ชิปช่วงเวลา 15 นาที (เช่น "08:00-08:15") วางได้สองชิปต่อแถวพอดี
   แคบกว่านี้ชิปจะตกบรรทัดละอัน กว้างกว่านี้กินที่ของรายชื่อแพทย์ */
const SLOT_PANEL_WIDTH = 340;

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
      slots.push({ value: `${hhmm(t)}-${hhmm(t + step)}`, start: t });
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

/* ไม่มีกรอบขาวรอบสองส่วนนี้ (มติผู้ใช้ 28 ส.ค. 69) — พื้นที่ของขั้นตอนอยู่ใน
   การ์ดขาวของฟอร์มคัดกรองอยู่แล้ว ใส่การ์ดซ้อนอีกชั้นได้แค่เส้นขอบที่ไม่ได้แบ่ง
   อะไร หัวข้อกับระยะห่างทำหน้าที่แบ่งส่วนพอแล้ว */
const CARD_STYLE = {};

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
const DoctorCard = ({ doctor, selected, freeCount, onClick }) => (
  <button
    type='button'
    onClick={onClick}
    className='flex items-center text-left w-full'
    style={{
      gap: 'var(--dim-space-300)',
      padding: 'var(--dim-space-300)',
      borderRadius: 'var(--dim-radius-300)',
      background: selected
        ? 'var(--surface-brandPrimary-quaternary)'
        : 'var(--surface-card-100)',
      border: selected
        ? 'var(--dim-stroke-200) solid var(--border-brandPrimary-default)'
        : 'var(--dim-stroke-100) solid var(--border-neutral-quaternary)',
      cursor: 'pointer',
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

const ScreeningStepDoctor = ({ onValidityChange, patient = {} }) => {
  /* อ่านค่าที่เคยเลือกไว้กลับมา — เดินย้อนขั้นแล้วกลับมาต้องไม่ลืมของเดิม */
  const saved = getScreeningReview(patient.hn)?.doctor || {};
  const [doctorName, setDoctorName] = useState(saved.assignedDoctor ?? UNASSIGNED_DOCTOR);
  const [slot, setSlot] = useState(saved.assignedSlot ?? '');

  const unassigned = doctorName === UNASSIGNED_DOCTOR;
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
  const valid = unassigned || (!!doctor && !!slot);
  useEffect(() => {
    if (typeof onValidityChange === 'function') onValidityChange(valid);
  }, [valid, onValidityChange]);

  useEffect(() => {
    setScreeningSection(patient.hn, 'doctor', {
      assignedDoctor: doctorName,
      assignedSlot: unassigned ? '' : slot,
      assignedDept: unassigned ? '' : (doctor?.dept || ''),
    });
  }, [patient.hn, doctorName, slot, unassigned, doctor]);

  const pickDoctor = (name) => {
    setDoctorName(name);
    /* เปลี่ยนหมอแล้วช่วงเวลาเดิมใช้ไม่ได้ — ตารางคนละคน */
    setSlot('');
  };

  return (
    /* สองคอลัมน์: รายชื่อแพทย์ทางซ้าย · ช่วงเวลาของคนที่เลือกเป็นการ์ดด้านขวา
       (มติผู้ใช้ 28 ส.ค. 69) — เดิมช่วงเวลาอยู่ใต้รายชื่อ พอเลือกหมอที่อยู่แถวล่าง
       ต้องเลื่อนลงไปอีก แล้วมองไม่เห็นว่ากำลังดูตารางของใครอยู่
       การ์ดขวา sticky จึงติดตาไว้ตลอดขณะไล่ดูรายชื่อ */
    <div
      className='flex w-full items-start'
      style={{ gap: 'var(--dim-space-400)', padding: 'var(--dim-space-600)' }}
    >
      <div className='flex flex-col flex-1 min-w-0' style={{ ...CARD_STYLE, gap: 'var(--dim-space-300)' }}>
        <SectionTitle icon='stethoscope'>แพทย์ผู้รักษา</SectionTitle>

        {/* ตัวเลือก "ไม่ระบุแพทย์" อยู่บนสุดและกินเต็มความกว้าง — เป็นทางเลือกเชิง
            นโยบายของศูนย์ ไม่ใช่ "หมออีกคนหนึ่ง" ในรายชื่อ */}
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
              ส่งเข้า “คิวรวมรอรับเคส” ให้แพทย์ที่ว่างกดรับเคสเอง — ไม่ต้องเลือกช่วงเวลา
            </span>
          </span>
        </button>

        <div
          className='grid w-full'
          style={{
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: 'var(--dim-space-300)',
          }}
        >
          {DOCTORS.map((d) => (
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

      {doctor && (
        <aside
          className='flex flex-col shrink-0'
          style={{
            width: SLOT_PANEL_WIDTH,
            position: 'sticky',
            top: 'var(--dim-space-400)',
            gap: 'var(--dim-space-400)',
            background: 'var(--surface-card-100)',
            borderRadius: 'var(--dim-radius-400)',
            border: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary)',
            boxShadow: 'var(--shadow-card)',
            padding: 'var(--dim-space-400)',
          }}
          aria-label={`ช่วงเวลาที่ว่างของ ${doctor.name}`}
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
            <NeutralSubdueIconButton
              icon='close'
              variant='ghost'
              size='sm'
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
              <div className='flex flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
                {p.slots.map((s, i) => {
                  const taken = isSlotTaken(doctor, p.key, i);
                  return (
                    <Timeslot
                      key={s.value}
                      value={s.value}
                      size='sm'
                      disabled={taken}
                      selected={slot === s.value}
                      onClick={() => setSlot(s.value)}
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
