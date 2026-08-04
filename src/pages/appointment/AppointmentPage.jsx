import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import AlertDialog from '@/components/popup/AlertDialog';
import PhcisTopToast from '@/components/alert/PhcisTopToast';
import BrandButton from '@/components/button/BrandButton';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import OverflowFlexRow from '@/components/overflow/OverflowFlexRow';
import AppointmentStaffHero from '@/components/appointment/AppointmentStaffHero';
import StaffListView from './StaffListView';
import AppointmentCalendarView from './AppointmentCalendarView';
import AppointmentListView from './AppointmentListView';
import AppointmentFormPopup from './AppointmentFormPopup';
import AppointmentCapacityBar from './AppointmentCapacityBar';
import AppointmentMoreMenu from './AppointmentMoreMenu';
import AppointmentNotArrivedView, { selectNotArrivedToday } from './AppointmentNotArrivedView';
import {
  STAFF,
  INITIAL_APPOINTMENTS,
  APPT_CREATE_SUCCESS_TOAST_DELAY_MS,
  APPT_STATUS_CANCELLED,
  APPT_STATUS_CONFIRMED,
  APPT_STATUS_PENDING,
  APPT_STATUS_NO_SHOW,
  formatApptListDate,
  getAppointmentDisplayStatus,
  isAppointmentReadOnly,
  isAppointmentSlotPast,
  isoKey,
} from './appointmentShared';
import { appendCancelAudit } from './appointmentSettingsStore';
import {
  getExtraAppointments,
  subscribeExtraAppointments,
  updateExtraAppointment,
} from './appointmentExtraStore';
import { getFailedNotifyCount, pushNotify, subscribeApptNotify } from './appointmentNotifyStore';
import { getRequestCounts, subscribeApptRequests } from './appointmentRequestStore';
import { APPT_CANCEL_REASONS } from './appointmentHcisMasters';
import {
  NO_PERMISSION_TOOLTIP,
  canManageAppointments,
  getApptActor,
  subscribeApptRole,
} from './appointmentPermissions';

/* MIH PHCIS · ระบบนัดหมาย (Figma Appointment · 0k2gyvvXwZ6JR3WQcokvEU)
   Staff list 3:10414 → calendar 3:10413 → popups 3:9730 / 4:17113.

   TOR §1.6 wave (ส.ค. 2026): เพิ่ม 3 อย่างบนโครงเดิม —
     1) แถบความจุคิวรายวัน + Available/Non-available (1.6.1.2 / 1.6.2.8)
     2) แท็บ "ยังไม่มาติดต่อวันนี้" (1.6.2.8 / 1.3.2.3) + บันทึกไม่มาตามนัด
     3) ทางเข้า รับนัดหมาย / นัดต่อเนื่อง / รูปแบบการนัดหมาย / ตั้งค่าระบบ
        (ตั้งค่าระบบเดิมไม่มี route — AppointmentSettingsPanel กำพร้ามาตลอด) */

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
  { key: 'notarrived', label: 'ยังไม่มาติดต่อวันนี้', icon: 'person_off' },
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
  return {
    confirmed,
    pending,
    cancelled,
    all,
    notarrived: selectNotArrivedToday(appointments).length,
  };
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
      key: 'notarrived',
      label: 'ยังไม่มาติดต่อวันนี้',
      value: counts.notarrived,
      indicator: 'เลยเวลานัดแล้ว',
      color: 'destructive',
      icon: 'person_off',
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

const CANCEL_REASONS = APPT_CANCEL_REASONS;

const AppointmentPage = () => {
  const { search } = useLocation();
  const history = useHistory();
  const [staff] = useState(STAFF);
  const [baseAppointments, setBaseAppointments] = useState(INITIAL_APPOINTMENTS);
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
  const [tick, setTick] = useState(0);
  const dismissToast = useCallback(() => setToast(null), []);
  const createToastTimerRef = useRef(null);

  const bump = useCallback(() => setTick((n) => n + 1), []);
  useEffect(() => subscribeExtraAppointments(bump), [bump]);
  useEffect(() => subscribeApptRequests(bump), [bump]);
  useEffect(() => subscribeApptNotify(bump), [bump]);
  useEffect(() => subscribeApptRole(bump), [bump]);

  const canManage = canManageAppointments();
  const actor = getApptActor();

  /* นัดที่สร้างจาก /appointment/requests และ /appointment/recurring ถูกเก็บใน
     store แยก แล้วนำมารวมเป็นรายการเดียวสำหรับทุกมุมมองของหน้านี้ */
  const appointments = useMemo(
    () => [...baseAppointments, ...getExtraAppointments()],
    [baseAppointments, tick],
  );

  const requestCounts = useMemo(() => getRequestCounts(), [tick]);
  /* 4.2.5 — เตือนบนหน้าหลักเมื่อมีข้อความแจ้งเตือนที่ส่งกลับผู้รับบริการไม่สำเร็จ */
  const failedNotifyCount = useMemo(() => getFailedNotifyCount(), [tick]);

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
  const flashSuccess = useCallback((message, { delayMs = 0, variant = 'success' } = {}) => {
    clearCreateToastTimer();
    if (delayMs > 0) {
      createToastTimerRef.current = window.setTimeout(() => {
        createToastTimerRef.current = null;
        setToast({ id: Date.now(), variant, message });
      }, delayMs);
      return;
    }
    setToast({ id: Date.now(), variant, message });
  }, [clearCreateToastTimer]);

  /** Patch an appointment wherever it lives (base state or the extra store). */
  const patchAppointment = useCallback((id, patch) => {
    const inBase = baseAppointments.some((a) => a.id === id);
    if (inBase) {
      setBaseAppointments((arr) => arr.map((a) => (a.id === id ? { ...a, ...patch } : a)));
      return;
    }
    updateExtraAppointment(id, patch);
  }, [baseAppointments]);

  const openCreate = (pick) => {
    if (!canManage) {
      flashSuccess(NO_PERMISSION_TOOLTIP, { variant: 'error' });
      return;
    }
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
    setDetailReadOnly(readOnly || !canManage);
    setFormOpen(true);
  };

  const formStaff = staff.find(
    (s) => String(s.id) === String(editingAppt?.staffId ?? selectedId),
  ) || staff[0];

  const saveForm = (form) => {
    if (detailReadOnly || (editingAppt && isAppointmentReadOnly(editingAppt))) return;
    const isEdit = formMode === 'edit' && editingAppt;
    if (isEdit) {
      patchAppointment(editingAppt.id, form);
    } else {
      const id = `A-${Date.now()}`;
      const staffId = selectedId
        || staff.find((s) => s.name === form.doctor)?.id
        || staff[0]?.id;
      setBaseAppointments((arr) => [...arr, {
        id, staffId, status: APPT_STATUS_CONFIRMED, createdBy: actor, ...form,
      }]);
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
      actor,
      kind: 'ยกเลิกนัด',
      appointmentId: deleteTarget.id,
      patient: deleteTarget.patient,
      hn: deleteTarget.hn,
      reason: cancelReason,
      date: deleteTarget.date,
      time: deleteTarget.time,
    });
    patchAppointment(deleteTarget.id, { status: APPT_STATUS_CANCELLED, cancelReason });
    pushNotify({
      channel: 'push',
      kind: 'cancel',
      hn: deleteTarget.hn,
      patient: deleteTarget.patient,
      title: 'แจ้งยกเลิกนัดหมาย',
      body: `${formatApptListDate(deleteTarget.date)} เวลา ${deleteTarget.time} น. — ${cancelReason}`,
      appointmentId: deleteTarget.id,
      actor,
    });
    setDeleteTarget(null);
    setFormOpen(false);
    setCancelReason(CANCEL_REASONS[0]);
    flashSuccess('ยกเลิกนัดหมายสำเร็จ — บันทึกเหตุผลและผู้ดำเนินการแล้ว');
  };

  const confirmAppointment = useCallback((appt) => {
    if (!appt?.id || !canManage) return;
    patchAppointment(appt.id, { status: APPT_STATUS_CONFIRMED });
    pushNotify({
      channel: 'push',
      kind: 'confirm',
      hn: appt.hn,
      patient: appt.patient,
      title: 'ยืนยันนัดหมายเรียบร้อย',
      body: `${formatApptListDate(appt.date)} เวลา ${appt.time} น. · ${appt.clinic || ''}`,
      appointmentId: appt.id,
      actor,
    });
    flashSuccess('ยืนยันการนัดหมายสำเร็จ');
  }, [canManage, patchAppointment, flashSuccess, actor]);

  /** TOR 1.6.2.8 — บันทึกไม่มาตามนัด (เขียนลง state ของโมดูลเท่านั้น) */
  const markNoShow = useCallback((appt, reason) => {
    if (!appt?.id || !canManage) return;
    const now = new Date();
    const stamp = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    patchAppointment(appt.id, {
      status: APPT_STATUS_NO_SHOW,
      noShowReason: reason,
      noShowAt: stamp,
      noShowBy: actor,
    });
    appendCancelAudit({
      actor,
      kind: 'ไม่มาตามนัด',
      appointmentId: appt.id,
      patient: appt.patient,
      hn: appt.hn,
      reason,
      date: appt.date,
      time: appt.time,
    });
    pushNotify({
      channel: 'sms',
      kind: 'no_show',
      hn: appt.hn,
      patient: appt.patient,
      title: 'บันทึกการไม่มาตามนัด',
      body: `นัดวันที่ ${formatApptListDate(appt.date)} เวลา ${appt.time} น. — กรุณาติดต่อเจ้าหน้าที่เพื่อนัดใหม่`,
      appointmentId: appt.id,
      actor,
    });
    flashSuccess(`บันทึกไม่มาตามนัดของ ${appt.patient} เวลา ${stamp} น. แล้ว`);
  }, [canManage, patchAppointment, flashSuccess, actor]);

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
        belowSummary={showingListChrome ? (
          <div
            className='w-full'
            style={{
              paddingLeft: 'var(--dim-space-600, 24px)',
              paddingRight: 'var(--dim-space-600, 24px)',
              paddingTop: 'var(--dim-space-400, 16px)',
            }}
          >
            <AppointmentCapacityBar
              appointments={appointments}
              days={14}
              onOpenSettings={() => history.push('/appointment/settings')}
            />
          </div>
        ) : undefined}
        tabs={showingListChrome ? appointmentTabs : undefined}
        activeTab={rootView}
        onTabChange={setRootView}
        actions={showingListChrome ? (
          <OverflowFlexRow itemGap='var(--dim-space-200)' moreAriaLabel='เมนูเพิ่มเติมของระบบนัดหมาย'>
            <BrandSubdueButton
              variant='outline'
              size='lg'
              leadingIcon='inbox'
              onClick={() => history.push('/appointment/requests')}
            >
              {`คำขอนัดจากผู้รับบริการ (${requestCounts.pending || 0})`}
            </BrandSubdueButton>
            <BrandSubdueButton
              variant='outline'
              size='lg'
              leadingIcon='stethoscope'
              onClick={openStaffSchedule}
            >
              ตารางเวรของแพทย์
            </BrandSubdueButton>
            <AppointmentMoreMenu
              items={[
                {
                  key: 'recurring',
                  label: 'นัดต่อเนื่อง / นัดซ้ำ / นัดกลุ่ม',
                  subtext: 'สร้างชุดนัดทุก N วัน หรือนัดกลุ่ม NCD / วัคซีน',
                  icon: 'event_repeat',
                  onSelect: () => history.push('/appointment/recurring'),
                },
                {
                  key: 'types',
                  label: 'รูปแบบการนัดหมาย',
                  subtext: 'ทะเบียนรูปแบบที่หน่วยบริการกำหนดเอง',
                  icon: 'style',
                  onSelect: () => history.push('/appointment/types'),
                },
                {
                  key: 'settings',
                  label: failedNotifyCount
                    ? `ตั้งค่าระบบนัดหมาย · แจ้งเตือนส่งไม่สำเร็จ ${failedNotifyCount}`
                    : 'ตั้งค่าระบบนัดหมาย',
                  subtext: 'โควตาคิวรายวัน · วันหยุด · ประวัติการยกเลิก · การแจ้งเตือน',
                  icon: 'tune',
                  onSelect: () => history.push('/appointment/settings'),
                },
              ]}
            />
            <span title={canManage ? 'สร้างการนัดหมายใหม่' : NO_PERMISSION_TOOLTIP}>
              <BrandButton
                variant='fill'
                size='lg'
                leadingIcon='add'
                disabled={!canManage}
                onClick={() => openCreate(null)}
              >
                สร้างการนัดหมายใหม่
              </BrandButton>
            </span>
          </OverflowFlexRow>
        ) : undefined}
      >
        <div
          className='flex flex-col flex-1 min-w-0'
          style={{
            paddingTop: 'var(--dim-space-600, 24px)',
            paddingBottom: 'var(--dim-space-600, 24px)',
            paddingLeft: 'var(--dim-space-600, 24px)',
            paddingRight: 'var(--dim-space-600, 24px)',
            gap: 'var(--dim-space-600, 24px)',
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
            ) : rootView === 'notarrived' ? (
              <AppointmentNotArrivedView
                appointments={appointments}
                canManage={canManage}
                onMarkNoShow={markNoShow}
                onOpenDetail={(appt) => openDetail(appt, { readOnly: true })}
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
                onConfirmAppointment={rootView === 'pending' && canManage ? confirmAppointment : undefined}
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
        description='ระบุเหตุผลการยกเลิก — ระบบจะบันทึกผู้ดำเนินการและเวลาไว้ในประวัติ (TOR 1.6.2.7) และส่งข้อความแจ้งกลับผู้รับบริการ'
        confirmLabel='ยืนยันยกเลิก'
        cancelLabel='ปิด'
        onConfirm={confirmDelete}
        onClose={() => { setDeleteTarget(null); setCancelReason(CANCEL_REASONS[0]); }}
      >
        <div
          className='flex flex-col w-full'
          style={{ gap: 'var(--dim-space-200)', marginTop: 'var(--dim-space-300)' }}
        >
          <label
            htmlFor='appt-cancel-reason'
            style={{
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-xs)',
              color: 'var(--text-content-tertiary)',
            }}
          >
            เหตุผลการยกเลิก · ผู้ยกเลิก: {actor} (ระบบบันทึกอัตโนมัติ)
          </label>
          <select
            id='appt-cancel-reason'
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            style={{
              height: 'var(--dim-size-800, 40px)',
              borderRadius: 'var(--dim-radius-200)',
              border: 'var(--dim-stroke-100) solid var(--border-neutral-tertiary)',
              paddingLeft: 'var(--dim-space-300)',
              paddingRight: 'var(--dim-space-300)',
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
