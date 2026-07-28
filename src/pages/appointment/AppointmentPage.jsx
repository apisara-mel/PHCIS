import React, { useCallback, useEffect, useRef, useState } from 'react';
import QueuePageShell from '@/templates/QueuePageShell';
import AlertDialog from '@/components/popup/AlertDialog';
import PhcisTopToast from '@/components/alert/PhcisTopToast';
import AppointmentStaffHero from '@/components/appointment/AppointmentStaffHero';
import StaffListView from './StaffListView';
import AppointmentCalendarView from './AppointmentCalendarView';
import AppointmentListView from './AppointmentListView';
import AppointmentFormPopup from './AppointmentFormPopup';
import AppointmentSettingsPanel from './AppointmentSettingsPanel';
import {
  STAFF,
  INITIAL_APPOINTMENTS,
  APPT_CREATE_SUCCESS_TOAST_DELAY_MS,
  isAppointmentReadOnly,
} from './appointmentShared';
import { appendCancelAudit } from './appointmentSettingsStore';

/* MIH PHCIS · ระบบนัดหมาย (Figma Appointment · 0k2gyvvXwZ6JR3WQcokvEU)
   Staff list 3:10414 → calendar 3:10413 → popups 3:9730 / 4:17113
   + TOR settings tab (1.6.1.3 / 1.6.4 / cancel audit). */

const breadcrumb = ['ระบบนัดหมาย'];

/** Figma 46:11239 — Tab Bar / Underline under PHCIS_Header_Summary OPD. */
const APPOINTMENT_ROOT_TABS = [
  { key: 'list', label: 'รายการนัด', icon: 'calendar_clock' },
  { key: 'staff', label: 'รายชื่อแพทย์', icon: 'stethoscope' },
  { key: 'settings', label: 'ตั้งค่า / ตาราง', icon: 'tune' },
];

const CANCEL_REASONS = [
  'ผู้ป่วยขอยกเลิก',
  'แพทย์ไม่ว่าง / ปรับตาราง',
  'ผิดพลาดในการจอง',
  'อื่น ๆ',
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
  const [cancelReason, setCancelReason] = useState(CANCEL_REASONS[0]);
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
    setFormMode('edit');
    setEditingAppt(appt);
    setSlotPick({ date: appt.date, time: appt.time });
    setFormOpen(true);
  };

  const formStaff = staff.find(
    (s) => s.id === (editingAppt?.staffId ?? selectedId),
  ) || staff[0];

  const saveForm = (form) => {
    if (editingAppt && isAppointmentReadOnly(editingAppt)) return;
    const isEdit = formMode === 'edit' && editingAppt;
    if (isEdit) {
      setAppointments((arr) => arr.map((a) => (a.id === editingAppt.id ? { ...a, ...form } : a)));
    } else {
      const id = `A-${Date.now()}`;
      const staffId = selectedId
        || staff.find((s) => s.name === form.doctor)?.id
        || staff[0]?.id;
      setAppointments((arr) => [...arr, { id, staffId, status: 'confirmed', ...form }]);
    }
    setFormOpen(false);
    flashSuccess(
      isEdit ? 'บันทึกนัดหมายสำเร็จ' : 'สร้างนัดหมายสำเร็จ',
      { delayMs: APPT_CREATE_SUCCESS_TOAST_DELAY_MS },
    );
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    appendCancelAudit({
      appointmentId: deleteTarget.id,
      patient: deleteTarget.patient,
      reason: cancelReason,
      date: deleteTarget.date,
      time: deleteTarget.time,
    });
    setAppointments((arr) => arr.filter((a) => a.id !== deleteTarget.id));
    setDeleteTarget(null);
    setFormOpen(false);
    setCancelReason(CANCEL_REASONS[0]);
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
            ) : rootView === 'settings' ? (
              <AppointmentSettingsPanel
                appointments={appointments}
                onBookEarliest={(hit) => {
                  setSelectedId(hit.staff.id);
                  openCreate({ date: hit.date, time: hit.time });
                }}
              />
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
        title='ยกเลิกนัดหมาย'
        description='ระบุเหตุผลการยกเลิก — ระบบจะบันทึกผู้ดำเนินการและเวลาไว้ในประวัติ (TOR 1.6.2.7)'
        confirmLabel='ยืนยันยกเลิก'
        cancelLabel='ปิด'
        onConfirm={confirmDelete}
        onClose={() => { setDeleteTarget(null); setCancelReason(CANCEL_REASONS[0]); }}
      >
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200)', marginTop: 'var(--dim-space-300)' }}>
          <label
            htmlFor='appt-cancel-reason'
            style={{
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-xs)',
              color: 'var(--text-content-tertiary)',
            }}
          >
            เหตุผลการยกเลิก
          </label>
          <select
            id='appt-cancel-reason'
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            style={{
              height: 40,
              borderRadius: 'var(--dim-radius-200)',
              border: 'var(--dim-stroke-100) solid var(--border-neutral-tertiary)',
              padding: '0 var(--dim-space-300)',
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-sm)',
              background: 'var(--surface-card-100)',
            }}
          >
            {CANCEL_REASONS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
      </AlertDialog>

      <PhcisTopToast session={toast} onDismiss={dismissToast} />
    </>
  );
};

export default AppointmentPage;
