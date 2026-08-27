import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import Popover from '@/components/popup/Popover';
import Popup from '@/components/popup/Popup';
import PhcisTopToast from '@/components/alert/PhcisTopToast';
import ActionList from '@/components/list/ActionList';
import AppointmentCreationHistoryTimeline from '@/components/appointment/AppointmentCreationHistoryTimeline';
import AppointmentHistoryPopup from '@/components/popup/AppointmentHistoryPopup';
import AppointmentViewPopup from '@/components/popup/AppointmentViewPopup';
import AppointmentFormPopup from '@/pages/appointment/AppointmentFormPopup';
import { MY_CREATED_APPOINTMENTS } from '@/pages/appointment/appointmentCreationHistory';
import { INITIAL_APPOINTMENTS } from '@/pages/appointment/appointmentMockData';
import {
  APPOINTMENT_PATIENTS,
  APPT_STATUS_CONFIRMED,
  DEFAULT_PATIENT_AVATAR,
  STAFF,
} from '@/pages/appointment/appointmentShared';
import {
  addExtraAppointments,
  withExtraAppointments,
} from '@/pages/appointment/appointmentExtraStore';
import { findMrPatientByHn } from '@/data/mrPatients';
import { PHCIS_CURRENT_USER } from '@/data/phcisCurrentUser';

/* SubHeader "การนัดหมาย" split button — Figma PHCIS-ALL 2120:32577.
   BrandSubdue outline trigger opens a dropdown with:
     • สร้างการนัดหมาย      (calendar_add_on) → popup ฟอร์มสร้างนัดหมาย
       เดิมชื่อ "เพิ่มการนัดหมาย" เปลี่ยนให้ตรงกับคำว่า "สร้าง…" ที่ใช้ทั้งระบบ
       (มติผู้ใช้ 25 ส.ค. 69)
     • ดูการนัดหมาย        (calendar_month)  → popup ตารางนัดหมาย (อ่านอย่างเดียว)
     • ประวัติสร้างการนัดหมาย (history) → popup timeline ของผู้ใช้คนนี้
       (คู่ขนานกับ "ประวัติคำขอเข้าถึงข้อมูล" ในเมนูคำขอเข้าถึงข้อมูล)

   ทั้งสามรายการเปิดเป็น popup บนหน้าเดิม (มติผู้ใช้ 27 ส.ค. 69) — เมนูนี้อยู่บน
   worklist ที่เจ้าหน้าที่กำลังทำคิวอยู่ การ push ไป /appointment ทำให้เสียงาน
   ตรงหน้า ทั้งที่ส่วนใหญ่แค่มาเช็ก/สร้างนัดให้คนไข้รายหนึ่งแล้วกลับ

   ส่ง `patientHn` มาด้วย = โหมด "ของผู้รับบริการรายนี้" (เช่นบนหน้าลงทะเบียน
   มติผู้ใช้ 27 ส.ค. 69) — รายการที่สามกลายเป็น "ประวัติการนัดหมาย" ของคนไข้
   คนนั้น เปิด <AppointmentHistoryPopup> แทน timeline ของผู้ใช้ และฟอร์มสร้าง
   นัดจะเติมคนไข้ให้เลย ไม่มี hn = อยู่บน worklist จึงต้องเลือกคนไข้เองในฟอร์ม */

const menuItems = (patientScoped) => [
  /* "สร้าง" มาก่อน "ดู" — เมนูนี้อยู่บน worklist ที่คนกดส่วนใหญ่มาเพื่อสร้างนัด
     ให้คนไข้ตรงหน้า ไม่ได้มาเปิดดูตาราง (มติผู้ใช้ 27 ส.ค. 69) */
  { key: 'add', label: 'สร้างการนัดหมาย', icon: 'calendar_add_on' },
  { key: 'view', label: 'ดูการนัดหมาย', icon: 'calendar_month' },
  {
    key: 'history',
    /* คนละความหมาย: ของผู้รับบริการ = นัดของคนไข้คนนั้น · ไม่มี hn = นัดที่
       ผู้ใช้ที่ล็อกอินอยู่เป็นคนสร้าง */
    label: patientScoped ? 'ประวัติการนัดหมาย' : 'ประวัติสร้างการนัดหมาย',
    icon: 'history',
  },
];

/** คนไข้ที่ผูกกับหน้าปัจจุบัน → ค่าเริ่มต้นของฟอร์มสร้างนัด */
const scopedPatientInitial = (hn) => {
  if (!hn) return null;
  const appt = APPOINTMENT_PATIENTS[hn];
  if (appt) {
    return {
      hn: appt.hn,
      patient: appt.patient,
      rights: appt.rights,
      patientAvatar: appt.avatar,
    };
  }
  /* หน้าเวชระเบียนใช้ทะเบียน MR ซึ่งมีคนไข้มากกว่าชุด mock ของระบบนัดหมาย */
  const mr = findMrPatientByHn(hn);
  return {
    hn,
    patient: mr ? `${mr.prefixTh}${mr.firstNameTh} ${mr.lastNameTh}` : '',
    rights: mr?.rights || '',
    patientAvatar: mr?.avatarUrl || DEFAULT_PATIENT_AVATAR,
  };
};

export default function AppointmentMenuButton({
  onView,
  onAdd,
  /** HN ของผู้รับบริการที่กำลังเปิดอยู่ — ส่งมา = เมนูผูกกับคนไข้รายนี้ */
  patientHn,
  size = 'lg',
  className = '',
}) {
  const [open, setOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const triggerRef = useRef(null);
  const [menuWidth, setMenuWidth] = useState(null);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const w = triggerRef.current.getBoundingClientRect().width;
    setMenuWidth(Math.max(220, Math.round(w)));
  }, [open]);

  const close = () => setOpen(false);
  const patientScoped = Boolean(patientHn);

  const formInitial = useMemo(() => scopedPatientInitial(patientHn), [patientHn]);

  const handleView = () => {
    if (onView) onView();
    else setViewOpen(true);
  };

  const handleAdd = () => {
    if (onAdd) onAdd();
    else setFormOpen(true);
  };

  const handleSave = (payload) => {
    /* slot/แพทย์คิดจาก STAFF[0] เหมือนที่ AppointmentPage fallback ไว้ — เมนูนี้
       ไม่มีแพทย์ที่ "เลือกอยู่" ให้ยึด ผู้ใช้เปลี่ยนแพทย์ในฟอร์มได้ */
    const staffId = STAFF.find((s) => s.name === payload.doctor)?.id ?? STAFF[0]?.id ?? null;
    addExtraAppointments([{
      id: `A-${Date.now()}`,
      staffId,
      status: APPT_STATUS_CONFIRMED,
      createdBy: PHCIS_CURRENT_USER.displayName,
      ...payload,
    }]);
    setFormOpen(false);
    setToast({ id: Date.now(), variant: 'success', message: 'สร้างนัดหมายสำเร็จ' });
  };

  return (
    <div className={`inline-flex shrink-0 ${className}`}>
      <BrandSubdueButton
        ref={triggerRef}
        variant='outline'
        size={size}
        leadingIcon='calendar_clock'
        trailingIcon='expand_more'
        active={open}
        aria-haspopup='menu'
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        การนัดหมาย
      </BrandSubdueButton>
      <Popover
        open={open}
        onClose={close}
        anchorRef={triggerRef}
        style={{
          width: menuWidth ?? 220,
          background: 'var(--surface-dropdown-default)',
          border: 'var(--dim-stroke-100) solid var(--border-dropdown-default)',
          borderRadius: 'var(--dim-radius-500)',
          boxShadow: 'var(--shadow-dropdown)',
          padding: 'var(--dim-space-100)',
          zIndex: 'var(--sm-z-modal-popover, 1450)',
        }}
      >
        <div role='menu' aria-label='การนัดหมาย'>
          {menuItems(patientScoped).map((item) => (
            <ActionList
              key={item.key}
              as='button'
              role='menuitem'
              label={item.label}
              leadingIcon={item.icon}
              showLeadingIcon
              showSubtext={false}
              showSwitch={false}
              showBadge={false}
              showCheck={false}
              showChevronRight={false}
              onClick={() => {
                close();
                if (item.key === 'view') handleView();
                if (item.key === 'add') handleAdd();
                if (item.key === 'history') setHistoryOpen(true);
              }}
            />
          ))}
        </div>
      </Popover>

      <AppointmentViewPopup open={viewOpen} onClose={() => setViewOpen(false)} />

      {formOpen && (
        <AppointmentFormPopup
          open={formOpen}
          mode='create'
          staff={STAFF[0]}
          initial={formInitial}
          appointments={withExtraAppointments(INITIAL_APPOINTMENTS)}
          patientSelectable={!patientScoped}
          onClose={() => setFormOpen(false)}
          onSave={handleSave}
        />
      )}

      {patientScoped ? (
        /* ประวัติการนัดหมายของคนไข้รายนี้ — ตัวเดียวกับที่ห้องตรวจ/หน้านัดหมายใช้
           (popup กรองตาม hn ให้เอง) */
        <AppointmentHistoryPopup
          open={historyOpen}
          onClose={() => setHistoryOpen(false)}
          hn={patientHn}
          appointments={INITIAL_APPOINTMENTS}
        />
      ) : (
        <Popup
          open={historyOpen}
          onClose={() => setHistoryOpen(false)}
          size='extraLarge'
          title='ประวัติสร้างการนัดหมาย'
          subtitle={`นัดหมายที่ ${PHCIS_CURRENT_USER.displayName} เป็นผู้สร้าง · ${MY_CREATED_APPOINTMENTS.length} นัดหมาย`}
          secondaryAction={{ label: 'ปิด', onClick: () => setHistoryOpen(false) }}
        >
          <AppointmentCreationHistoryTimeline records={MY_CREATED_APPOINTMENTS} />
        </Popup>
      )}

      <PhcisTopToast session={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
