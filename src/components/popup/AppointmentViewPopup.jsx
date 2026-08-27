import React, { useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import Popup from '@/components/popup/Popup';
import AppointmentListView from '@/pages/appointment/AppointmentListView';
import { AppointmentReadOnlyCards } from '@/pages/appointment/AppointmentReadOnlyDetail';
import {
  INITIAL_APPOINTMENTS,
  STAFF,
  isoKey,
} from '@/pages/appointment/appointmentShared';
import {
  getExtraAppointments,
  subscribeExtraAppointments,
} from '@/pages/appointment/appointmentExtraStore';

/* "ดูการนัดหมาย" จาก worklist — popup แทนการพาออกจากหน้า (มติผู้ใช้ 27 ส.ค. 69)

   เดิมเมนูนี้ push ไป /appointment ทำให้เจ้าหน้าที่เวชระเบียนเสียคิวที่กำลัง
   ทำอยู่ ทั้งที่ส่วนใหญ่แค่อยากเช็กว่าคนไข้ตรงหน้ามีนัดไหม → เปิดเป็น popup
   อ่านอย่างเดียวบนหน้าเดิม แล้วค่อยมีปุ่มไป "ระบบนัดหมาย" ให้คนที่ต้องแก้จริง

   ตารางใช้ <AppointmentListView embedded> ตัวเดียวกับระบบนัดหมาย — ค้นหา /
   ตัวกรอง / แบ่งหน้าจึงเป็นชุดเดียวกัน ไม่ต้องดูแลสองที่ */

const AppointmentViewPopup = ({ open, onClose }) => {
  const history = useHistory();
  const [tick, setTick] = useState(0);
  const [detail, setDetail] = useState(null);

  /* นัดที่เพิ่งสร้างจากเมนูเดียวกันเก็บอยู่ใน extra store — ต้อง subscribe
     ไม่งั้น popup จะไม่เห็นนัดที่ผู้ใช้เพิ่งกดสร้างไปเมื่อครู่ */
  useEffect(() => subscribeExtraAppointments(() => setTick((t) => t + 1)), []);
  useEffect(() => { if (!open) setDetail(null); }, [open]);

  const appointments = useMemo(
    () => [...INITIAL_APPOINTMENTS, ...getExtraAppointments()],
    [tick],
  );

  const todayCount = useMemo(() => {
    const today = isoKey(new Date());
    return appointments.filter((a) => a.date === today).length;
  }, [appointments]);

  return (
    <>
      <Popup
        open={open}
        onClose={onClose}
        size='extraLarge'
        title='ดูการนัดหมาย'
        subtitle={`นัดหมายวันนี้ ${todayCount} นัดหมาย · ทั้งหมด ${appointments.length} นัดหมาย`}
        /* "ปิด" เป็น outline เสมอ (Popup บังคับให้) — ถ้าวางไว้ในสล็อต primary
           ด้วยจะไม่เหลือปุ่มทึบในแถวเลย จึงให้ "เปิดระบบนัดหมาย" ซึ่งเป็นการ
           กระทำจริงเป็น primary แทน */
        secondaryAction={{ label: 'ปิด', onClick: onClose }}
        primaryAction={{
          label: 'เปิดระบบนัดหมาย',
          trailingIcon: 'open_in_new',
          onClick: () => {
            onClose?.();
            history.push('/appointment');
          },
        }}
      >
        <AppointmentListView
          embedded
          staff={STAFF}
          appointments={appointments}
          statusFilter='all'
          onOpenDetail={setDetail}
        />
      </Popup>

      {/* ซ้อนชั้นบน — Popup รองรับ stack อยู่แล้ว ปิดชั้นนี้แล้วตารางยังเปิดค้าง */}
      <Popup
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        size='large'
        title='รายละเอียดการนัดหมาย'
        subtitle={detail ? `${detail.patient || '—'} · HN ${detail.hn || '—'}` : ''}
        primaryAction={{ label: 'ปิด', onClick: () => setDetail(null) }}
      >
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
          <AppointmentReadOnlyCards appt={detail} />
        </div>
      </Popup>
    </>
  );
};

export default AppointmentViewPopup;
