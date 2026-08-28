import React, { useMemo, useState } from 'react';
import Popup from '@/components/popup/Popup';
import Select from '@/components/forms/Select';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import AppointmentCalendarView from '@/pages/appointment/AppointmentCalendarView';
import { STAFF, INITIAL_APPOINTMENTS } from '@/pages/appointment/appointmentShared';
import { getExtraAppointments } from '@/pages/appointment/appointmentExtraStore';

/* ปุ่ม "ดูตารางเวร" ประจำทุกหน้าของเมนูบันทึกการรักษา
   ══════════════════════════════════════════════════════════════════════════
   ทุกหน้าในเมนูนี้ต้องมีปุ่มนี้ และกดแล้วเปิดเป็นป๊อปอัป (มติผู้ใช้ 28 ส.ค. 69)
   ตารางเวรเป็นข้อมูลที่ต้อง "เหลือบดู" ระหว่างทำงานอย่างอื่น — จะนัดคนไข้ต่อ
   จะส่งปรึกษา หรือจะหาว่าวันนี้ใครอยู่ ล้วนถามคำถามเดียวกัน การต้องออกจากหน้าที่
   ทำค้างอยู่ไปเปิดโมดูลนัดหมายแล้วเดินกลับมาใหม่คือการทิ้งงานที่ทำอยู่ทุกครั้ง

   ใช้ `AppointmentCalendarView` ตัวเดียวกับหน้านัดหมาย — ตารางเวรที่เห็นจาก
   ที่นี่กับที่เห็นในโมดูลนัดหมายต้องเป็นอันเดียวกันเสมอ ไม่ใช่สำเนาที่ค่อย ๆ
   เพี้ยนออกจากกัน

   อ่านอย่างเดียว: ป๊อปอัปนี้ตอบว่า "ใครอยู่เวรช่องไหน" ไม่ใช่ที่สำหรับลงนัด
   การลงนัดต้องมีผู้รับบริการและเหตุผลกำกับ ซึ่งเป็นงานของฟอร์มนัดหมายจริง
   จึงส่ง handler เปล่าเข้าไป ช่องว่างกดแล้วไม่มีอะไรเกิดขึ้น */

const DutyRosterAction = ({ label = 'ดูตารางเวร' }) => {
  const [open, setOpen] = useState(false);
  const [staffId, setStaffId] = useState(() => STAFF[0]?.id ?? null);
  const [layoutMode, setLayoutMode] = useState('calendar');

  /* นัดที่สร้างจากหน้าอื่น (คำขอนัด / นัดต่อเนื่อง) อยู่ใน store แยก — รวมเข้ามา
     ด้วย ไม่งั้นตารางในป๊อปอัปจะว่างกว่าตารางจริงของแพทย์คนนั้น */
  const appointments = useMemo(
    () => (open ? [...INITIAL_APPOINTMENTS, ...getExtraAppointments()] : []),
    [open],
  );

  const staffOptions = useMemo(
    () => STAFF.map((s) => ({
      value: String(s.id),
      label: s.name,
      image: s.avatarSrc,
      imageVariant: 'avatar',
    })),
    [],
  );

  const noop = () => {};
  /* วันที่ 1 ของเดือนปัจจุบัน — คำนวณตอนเปิดป๊อปอัปเท่านั้น จะได้ไม่สร้าง Date
     ใหม่ทุก render (ตัวปฏิทินเก็บ cursor ของมันเองหลังจากนั้น) */
  const monthStart = useMemo(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  }, [open]);
  const close = () => setOpen(false);

  return (
    <>
      <BrandSubdueButton
        variant='outline'
        leadingIcon='calendar_month'
        onClick={() => setOpen(true)}
      >
        {label}
      </BrandSubdueButton>

      <Popup
        open={open}
        onClose={close}
        title='ตารางเวร'
        subtitle='ตารางออกตรวจและช่วงเวลาที่ว่างของแพทย์ — ดูอย่างเดียว การลงนัดทำที่ระบบนัดหมาย'
        size='extraLarge'
        primaryAction={{ label: 'ปิด', onClick: close }}
      >
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
          <div className='shrink-0' style={{ maxWidth: 420 }}>
            <Select
              label='แพทย์'
              placeholder='เลือกแพทย์เพื่อดูตารางเวร'
              value={staffId == null ? '' : String(staffId)}
              onChange={(v) => setStaffId(Number(v))}
              options={staffOptions}
            />
          </div>

          <AppointmentCalendarView
            staff={STAFF}
            staffId={staffId}
            appointments={appointments}
            layoutMode={layoutMode}
            onLayoutModeChange={setLayoutMode}
            onBookSlot={noop}
            onOpenDetail={noop}
            /* เปิดมาที่เดือนปัจจุบัน ไม่ใช่เดือนที่ข้อมูลตัวอย่างของหน้านัดหมาย
               กระจุกอยู่ — คนเปิดตารางเวรถามถึงเวรของช่วงนี้ */
            initialCursor={monthStart}
            sectionTitle='ตารางออกตรวจ'
            sectionSubText='ช่องสีเขียวคือเวลาที่มีนัดแล้ว ช่องว่างคือเวลาที่ยังว่าง — ลงนัดได้ที่ระบบนัดหมาย'
          />
        </div>
      </Popup>
    </>
  );
};

export default DutyRosterAction;
