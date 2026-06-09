import React, { useCallback, useEffect, useRef, useState } from 'react';
import QueuePageShell from '@/templates/QueuePageShell';
import AlertDialog from '@/components/popup/AlertDialog';
import PhcisTopToast from '@/components/alert/PhcisTopToast';
import AppointmentStaffHero from '@/components/appointment/AppointmentStaffHero';
import StaffListView from './StaffListView';
import AppointmentCalendarView from './AppointmentCalendarView';
import AppointmentListView from './AppointmentListView';
import AppointmentFormPopup from './AppointmentFormPopup';
import {
  STAFF,
  INITIAL_APPOINTMENTS,
  APPT_CREATE_SUCCESS_TOAST_DELAY_MS,
  isAppointmentReadOnly,
} from './appointmentShared';

/* MIH PHCIS · ระบบนัดหมาย (Figma Appointment · 0k2gyvvXwZ6JR3WQcokvEU)
   Staff list 3:10414 → calendar 3:10413 → popups 3:9730 / 4:17113 */

const breadcrumb = ['ระบบนัดหมาย'];

/** Figma 46:11239 — Tab Bar / Underline under PHCIS_Header_Summary OPD. */
const APPOINTMENT_ROOT_TABS = [
  { key: 'list', label: 'รายการนัด', icon: 'calendar_clock' },
  { key: 'staff', label: 'รายชื่อแพทย์', icon: 'stethoscope' },
];

const AppointmentPage = () => {
  const [staff] = useState(STAFF);
  const [appointments, setAppointments] = useState(INITIAL_APPOINTMENTS);
  const [selectedId, setSelectedId] = useState(null);
  const [rootView, setRootView] = useState('list');
  const [doctorView, setDoctorView] = useState('calendar');
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState('create');
  const [editingAppt, setEditingAppt] = useState(null);
  const [slotPick, setSlotPick] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [toast, setToast] = useState(null);
  const dismissToast = useCallback(() => setToast(null), []);
  const createToastTimerRef = useRef(null);

  const selected = staff.find((s) => s.id === selectedId);

  const clearCreateToastTimer = useCallback(() => {
    if (createToastTimerRef.current != null) {
      window.clearTimeout(createToastTimerRef.current);
      createToastTimerRef.current = null;
    }
  }, []);

  useEffect(() => () => clearCreateToastTimer(), [clearCreateToastTimer]);

  /** Figma Appointment 19:8245 — top-center Small Alert success. */
  const flashSuccess = useCallback((message, { delayMs = 0 } = {}) => {
    clearCreateToastTimer();
    if (delayMs > 0) {
      createToastTimerRef.current = window.setTimeout(() => {
        createToastTimerRef.current = null;
        setToast({ id: Date.now(), variant: 'success', message });
      }, delayMs);
      return;
    }
    setToast({ id: Date.now(), variant: 'success', message });
  }, [clearCreateToastTimer]);

  const openCreate = (pick) => {
    setFormMode('create');
    setEditingAppt(null);
    setSlotPick(pick);
    setFormOpen(true);
  };

  const openDetail = (appt) => {
    /* Stay on root list — Figma 73:15393 popup overlays the page; do not drill into doctor calendar. */
    setFormMode('edit');
    setEditingAppt(appt);
    setSlotPick({ date: appt.date, time: appt.time });
    setFormOpen(true);
  };

  const formStaff = staff.find(
    (s) => s.id === (editingAppt?.staffId ?? selectedId),
  );

  const saveForm = (form) => {
    if (editingAppt && isAppointmentReadOnly(editingAppt)) return;
    const isEdit = formMode === 'edit' && editingAppt;
    if (isEdit) {
      setAppointments((arr) => arr.map((a) => (a.id === editingAppt.id ? { ...a, ...form } : a)));
    } else {
      const id = `A-${Date.now()}`;
      setAppointments((arr) => [...arr, { id, staffId: selectedId, ...form }]);
    }
    setFormOpen(false);
    flashSuccess(
      isEdit ? 'บันทึกนัดหมายสำเร็จ' : 'สร้างนัดหมายสำเร็จ',
      { delayMs: APPT_CREATE_SUCCESS_TOAST_DELAY_MS },
    );
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    setAppointments((arr) => arr.filter((a) => a.id !== deleteTarget.id));
    setDeleteTarget(null);
    setFormOpen(false);
    flashSuccess('ยกเลิกนัดหมายสำเร็จ');
  };

  return (
    <>
      <QueuePageShell
        activeKey='appoint'
        breadcrumb={breadcrumb}
        title='ระบบนัดหมาย'
        onBack={selected ? () => { setSelectedId(null); setDoctorView('calendar'); } : undefined}
        headerInfo={selected ? <AppointmentStaffHero staff={selected} /> : undefined}
        tabs={selected ? undefined : APPOINTMENT_ROOT_TABS}
        activeTab={rootView}
        onTabChange={setRootView}
      >
        <div
          className='flex flex-col flex-1 min-w-0'
          style={{
            padding: 'var(--dim-space-600)',
            gap: 'var(--dim-space-600)',
          }}
        >
          {!selected ? (
            rootView === 'staff' ? (
              <StaffListView staff={staff} onSelect={setSelectedId} />
            ) : (
              <AppointmentListView
                staff={staff}
                appointments={appointments}
                onOpenDetail={openDetail}
              />
            )
          ) : (
            <div className='flex flex-col flex-1 min-w-0'>
              <AppointmentCalendarView
                staff={staff}
                staffId={selected.id}
                appointments={appointments}
                layoutMode={doctorView}
                onLayoutModeChange={setDoctorView}
                onBookSlot={openCreate}
                onOpenDetail={openDetail}
              />
            </div>
          )}
        </div>
      </QueuePageShell>

      {formOpen && formStaff && (
        <AppointmentFormPopup
          open={formOpen}
          mode={formMode}
          staff={formStaff}
          initial={editingAppt}
          slotPick={slotPick}
          appointments={appointments}
          onClose={() => setFormOpen(false)}
          onSave={saveForm}
          onDelete={() => {
            if (editingAppt && isAppointmentReadOnly(editingAppt)) return;
            setDeleteTarget(editingAppt);
          }}
        />
      )}

      <AlertDialog
        open={!!deleteTarget}
        type='destructive'
        title='ลบ Slot นัดหมาย'
        description='ยืนยันลบนัดหมายนี้หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้'
        confirmLabel='ลบ'
        cancelLabel='ยกเลิก'
        onConfirm={confirmDelete}
        onClose={() => setDeleteTarget(null)}
      />

      <PhcisTopToast session={toast} onDismiss={dismissToast} />
    </>
  );
};

export default AppointmentPage;
