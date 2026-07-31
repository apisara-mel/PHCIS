import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import AlertDialog from '@/components/popup/AlertDialog';
import PhcisTopToast from '@/components/alert/PhcisTopToast';
import BrandButton from '@/components/button/BrandButton';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import AppointmentStaffHero from '@/components/appointment/AppointmentStaffHero';
import StaffListView from './StaffListView';
import AppointmentCalendarView from './AppointmentCalendarView';
import AppointmentListView from './AppointmentListView';
import AppointmentFormPopup from './AppointmentFormPopup';
import {
  STAFF,
  INITIAL_APPOINTMENTS,
  APPT_CREATE_SUCCESS_TOAST_DELAY_MS,
  APPT_STATUS_CANCELLED,
  APPT_STATUS_CONFIRMED,
  APPT_STATUS_PENDING,
  APPT_STATUS_NO_SHOW,
  getAppointmentDisplayStatus,
  isAppointmentReadOnly,
  isAppointmentSlotPast,
  isoKey,
} from './appointmentShared';
import { appendCancelAudit } from './appointmentSettingsStore';

/* MIH PHCIS · ระบบนัดหมาย (Figma Appointment · 0k2gyvvXwZ6JR3WQcokvEU)
   Staff list 3:10414 → calendar 3:10413 → popups 3:9730 / 4:17113. */

const breadcrumb = ['ระบบนัดหมาย'];

/** Deep-link for doctor roster in a new tab: /appointment?view=staff */
const STAFF_SCHEDULE_PATH = '/appointment?view=staff';

const initialRootViewFromSearch = (search) => {
  const view = new URLSearchParams(search || '').get('view');
  return view === 'staff' ? 'staff' : 'confirmed';
};

/** Figma 46:11239 — Tab Bar / Underline under PHCIS_Header_Summary OPD. */
const APPOINTMENT_ROOT_TAB_DEFS = [
  { key: 'confirmed', label: 'นัดหมายที่ยืนยันแล้ว', icon: 'event_available' },
  { key: 'pending', label: 'นัดหมายที่รอการยืนยัน', icon: 'hourglass_top' },
  { key: 'cancelled', label: 'นัดหมายที่ยกเลิก/ไม่มาตามนัด', icon: 'event_busy' },
  { key: 'all', label: 'นัดหมายทั้งหมด', icon: 'event_note' },
];

function countAppointmentsByTab(appointments) {
  let confirmed = 0;
  let pending = 0;
  let cancelled = 0;
  let all = 0;
  (appointments || []).forEach((a) => {
    all += 1;
    const status = getAppointmentDisplayStatus(a);
    if (status === APPT_STATUS_CANCELLED || status === APPT_STATUS_NO_SHOW) {
      cancelled += 1;
      return;
    }
    if (isAppointmentSlotPast(a)) return;
    if (status === APPT_STATUS_PENDING) pending += 1;
    else if (status === APPT_STATUS_CONFIRMED) confirmed += 1;
  });
  return { confirmed, pending, cancelled, all };
}

/** Status summary cards — same SummaryCardsBar pattern as OPD screening worklist. */
function buildAppointmentSummaryCards(appointments) {
  const counts = countAppointmentsByTab(appointments);
  const todayKey = isoKey(new Date());
  let todayTotal = 0;
  let todayTele = 0;
  let todayOnsite = 0;
  (appointments || []).forEach((a) => {
    if (a.date !== todayKey) return;
    todayTotal += 1;
    const mode = a.examMode === 'telemedicine' || a.examMode === 'tele' ? 'tele' : 'onsite';
    if (mode === 'tele') todayTele += 1;
    else todayOnsite += 1;
  });

  return [
    {
      key: 'today',
      label: 'นัดหมายวันนี้',
      value: todayTotal,
      indicator: 'ทุกสถานะ',
      color: 'info',
      icon: 'calendar_month',
    },
    {
      key: 'confirmed',
      label: 'ยืนยันแล้ว',
      value: counts.confirmed,
      indicator: 'รอพบแพทย์',
      color: 'positive',
      icon: 'event_available',
    },
    {
      key: 'pending',
      label: 'รอการยืนยัน',
      value: counts.pending,
      indicator: 'รอเจ้าหน้าที่',
      color: 'inprogress',
      icon: 'hourglass_top',
    },
    {
      key: 'cancelled',
      label: 'ยกเลิก/ไม่มาตามนัด',
      value: counts.cancelled,
      indicator: 'ทั้งหมด',
      color: 'destructive',
      icon: 'event_busy',
    },
    {
      key: 'tele',
      label: 'Telemedicine วันนี้',
      value: todayTele,
      indicator: 'ตรวจทางไกล',
      color: 'info',
      icon: 'videocam',
    },
    {
      key: 'onsite',
      label: 'ตรวจที่รพ. วันนี้',
      value: todayOnsite,
      indicator: 'Onsite',
      color: 'positive',
      icon: 'local_hospital',
    },
  ];
}

const CANCEL_REASONS = [
  'ผู้ป่วยขอยกเลิก',
  'แพทย์ไม่ว่าง / ปรับตาราง',
  'ผิดพลาดในการจอง',
  'อื่น ๆ',
];

const AppointmentPage = () => {
  const { search } = useLocation();
  const [staff] = useState(STAFF);
  const [appointments, setAppointments] = useState(INITIAL_APPOINTMENTS);
  const [selectedId, setSelectedId] = useState(null);
  const [rootView, setRootView] = useState(() => initialRootViewFromSearch(search));
  const [doctorView, setDoctorView] = useState('calendar');
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState('create');
  const [editingAppt, setEditingAppt] = useState(null);
  const [detailReadOnly, setDetailReadOnly] = useState(false);
  const [slotPick, setSlotPick] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState(CANCEL_REASONS[0]);
  const [toast, setToast] = useState(null);
  const dismissToast = useCallback(() => setToast(null), []);
  const createToastTimerRef = useRef(null);

  const selected = staff.find((s) => s.id === selectedId);

  useEffect(() => {
    if (new URLSearchParams(search).get('view') === 'staff') {
      setSelectedId(null);
      setDoctorView('calendar');
      setRootView('staff');
    }
  }, [search]);

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
    setDetailReadOnly(false);
    setFormOpen(true);
  };

  const openDetail = (appt, { readOnly = false } = {}) => {
    setFormMode('edit');
    setEditingAppt(appt);
    setSlotPick({ date: appt.date, time: appt.time });
    setDetailReadOnly(readOnly);
    setFormOpen(true);
  };

  const formStaff = staff.find(
    (s) => String(s.id) === String(editingAppt?.staffId ?? selectedId),
  ) || staff[0];

  const saveForm = (form) => {
    if (detailReadOnly || (editingAppt && isAppointmentReadOnly(editingAppt))) return;
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
    setAppointments((arr) => arr.map((a) => (
      a.id === deleteTarget.id
        ? { ...a, status: APPT_STATUS_CANCELLED, cancelReason }
        : a
    )));
    setDeleteTarget(null);
    setFormOpen(false);
    setCancelReason(CANCEL_REASONS[0]);
    flashSuccess('ยกเลิกนัดหมายสำเร็จ');
  };

  const confirmAppointment = useCallback((appt) => {
    if (!appt?.id) return;
    setAppointments((arr) => arr.map((a) => (
      a.id === appt.id ? { ...a, status: APPT_STATUS_CONFIRMED } : a
    )));
    flashSuccess('ยืนยันการนัดหมายสำเร็จ');
  }, [flashSuccess]);

  const openStaffSchedule = () => {
    window.open(STAFF_SCHEDULE_PATH, '_blank', 'noopener,noreferrer');
  };

  const leaveStaffOrDoctor = () => {
    if (selected) {
      setSelectedId(null);
      setDoctorView('calendar');
      return;
    }
    setRootView('confirmed');
  };

  const showingStaffRoster = rootView === 'staff' && !selected;

  const appointmentTabs = useMemo(() => {
    const counts = countAppointmentsByTab(appointments);
    return APPOINTMENT_ROOT_TAB_DEFS.map((tab) => ({
      ...tab,
      count: counts[tab.key] ?? 0,
    }));
  }, [appointments]);

  const summaryCards = useMemo(
    () => buildAppointmentSummaryCards(appointments),
    [appointments],
  );

  const showingListChrome = !selected && !showingStaffRoster;

  return (
    <>
      <QueuePageShell
        activeKey='appoint'
        breadcrumb={breadcrumb}
        title={
          selected
            ? `ตารางเวรของแพทย์ ${selected.name}`
            : showingStaffRoster
              ? 'ตารางเวรของแพทย์'
              : 'ระบบนัดหมาย'
        }
        onBack={selected || showingStaffRoster ? leaveStaffOrDoctor : undefined}
        headerInfo={selected ? <AppointmentStaffHero staff={selected} /> : undefined}
        summaryCards={showingListChrome ? summaryCards : undefined}
        tabs={showingListChrome ? appointmentTabs : undefined}
        activeTab={rootView}
        onTabChange={setRootView}
        actions={showingListChrome ? (
          <div className='flex items-center' style={{ gap: 'var(--dim-space-300)' }}>
            <BrandSubdueButton
              variant='outline'
              size='lg'
              leadingIcon='stethoscope'
              onClick={openStaffSchedule}
            >
              ตารางเวรของแพทย์
            </BrandSubdueButton>
            <BrandButton
              variant='fill'
              size='lg'
              leadingIcon='add'
              onClick={() => openCreate(null)}
            >
              สร้างการนัดหมายใหม่
            </BrandButton>
          </div>
        ) : undefined}
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
              <StaffListView
                staff={staff}
                appointments={appointments}
                onSelect={setSelectedId}
                onBookEarliest={(hit) => {
                  setSelectedId(hit.staff.id);
                  openCreate({ date: hit.date, time: hit.time, slotRange: hit.slotRange });
                }}
              />
            ) : (
              <AppointmentListView
                key={`list-${rootView}`}
                staff={staff}
                appointments={appointments}
                statusFilter={
                  rootView === 'pending' ? 'pending'
                    : rootView === 'all' ? 'all'
                      : rootView === 'cancelled' ? 'cancelled'
                        : 'confirmed'
                }
                onConfirmAppointment={rootView === 'pending' ? confirmAppointment : undefined}
                onOpenDetail={(appt) => openDetail(appt, {
                  readOnly: rootView === 'all' || rootView === 'cancelled',
                })}
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
          forceReadOnly={detailReadOnly}
          onClose={() => setFormOpen(false)}
          onSave={saveForm}
          onDelete={() => {
            if (detailReadOnly || (editingAppt && isAppointmentReadOnly(editingAppt))) return;
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
