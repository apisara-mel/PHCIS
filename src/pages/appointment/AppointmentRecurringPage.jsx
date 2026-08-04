import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import Table from '@/components/table/Table';
import Pagination from '@/components/pagination/Pagination';
import Select from '@/components/forms/Select';
import Timeslot from '@/components/timeslot/Timeslot';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import { Field, FieldGrid } from '@/components/forms/Fields';
import StatusBadge from '@/components/badge/StatusBadge';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import BrandButton from '@/components/button/BrandButton';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import AlertDialog from '@/components/popup/AlertDialog';
import UnsavedChangesPopup from '@/components/popup/UnsavedChangesPopup';
import PhcisTopToast from '@/components/alert/PhcisTopToast';
import { Sym } from '@/components/forms/_inputBox';
import AppointmentRecurrenceBuilder, {
  DEFAULT_RECURRENCE,
  buildOccurrenceDates,
  describeRecurrence,
  validateRecurrence,
} from './AppointmentRecurrenceBuilder';
import { evaluateAppointmentConflicts } from './AppointmentConflictPanel';
import { addExtraAppointments, withExtraAppointments } from './appointmentExtraStore';
import { pushNotify } from './appointmentNotifyStore';
import { appendSettingsAudit } from './appointmentSettingsStore';
import { getApptTypeOptions, getAllApptTypes } from './appointmentTypeCatalog';
import {
  APPT_PURPOSE_MASTER,
  CLINIC_MASTER,
  RECURRENCE_REASON_SUGGESTIONS,
  APPT_TYPE_PREP_SUGGESTIONS,
} from './appointmentHcisMasters';
import {
  getAppointmentRequests,
  REQUEST_STATUS,
  confirmRequest,
  subscribeApptRequests,
} from './appointmentRequestStore';
import {
  APPOINTMENT_PATIENTS,
  APPT_STATUS_CONFIRMED,
  STAFF,
  findEarliestFreeSlot,
  formatApptListDate,
  getStaffScheduleSlots,
  isoKey,
  parseDateKey,
  printAppointmentSlipBatch,
  slotRangeToTime,
  INITIAL_APPOINTMENTS,
} from './appointmentShared';
import {
  NO_PERMISSION_TOOLTIP,
  canManageAppointments,
  getApptActor,
  subscribeApptRole,
} from './appointmentPermissions';

/* TOR 1.6.1.2 · 1.6.1.5 · 1.6.2.4 · 1.6.2.5 · 1.6.3.1 · 1.4.12.1
   นัดต่อเนื่อง / นัดซ้ำ / นัดกลุ่ม — แปลงบล็อก "นัดต่อเนื่อง" ของ HCIS §2.3
   (วันที่นัดล่วงหน้า / เวลานัด / ลำดับที่ / คลินิกที่ตรวจ / แพทย์ที่นัดตรวจ)
   ให้เป็นหน้าเต็มพร้อมตรวจการชนราย occurrence ก่อนบันทึกทั้งชุด (all-or-nothing). */

const breadcrumb = ['ระบบนัดหมาย', 'นัดต่อเนื่อง / นัดกลุ่ม'];
const PREVIEW_PAGE_SIZE = 10;

const TEXT_CELL = {
  color: 'var(--text-neutral-default)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm, 14px)',
  lineHeight: 1.5,
};

const CARD = {
  background: 'var(--surface-card-100)',
  borderRadius: 'var(--dim-radius-500, 16px)',
  border: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary)',
  boxShadow: 'var(--shadow-brand-top-200)',
  paddingTop: 'var(--dim-space-600, 24px)',
  paddingBottom: 'var(--dim-space-600, 24px)',
  paddingLeft: 'var(--dim-space-600, 24px)',
  paddingRight: 'var(--dim-space-600, 24px)',
  gap: 'var(--dim-space-400, 16px)',
};

const TITLE = {
  color: 'var(--text-content-default)',
  fontFamily: 'var(--type-family-heading-graphic2)',
  fontSize: 'var(--type-size-base, 16px)',
  fontWeight: 'var(--type-weight-medium)',
};

const HINT = {
  color: 'var(--text-content-tertiary)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-xs, 12px)',
  lineHeight: 1.6,
};

const MODE_TABS = [
  { key: 'single', label: 'นัดต่อเนื่องรายคน', icon: 'event_repeat' },
  { key: 'custom', label: 'นัดซ้ำแบบกำหนดเอง', icon: 'edit_calendar' },
  { key: 'group', label: 'นัดกลุ่ม', icon: 'groups' },
];

/** กลุ่มผู้รับบริการสำเร็จรูปสำหรับโหมดนัดกลุ่ม (บริบท ศบส. กทม.). */
const PATIENT_GROUPS = [
  { value: 'ncd', label: 'กลุ่มโรคเรื้อรัง DM/HT', hns: ['67-00001', '67-00004', '67-00007', '67-00009', '67-00012'] },
  { value: 'vaccine', label: 'กลุ่มฉีดวัคซีนผู้สูงอายุ', hns: ['67-00003', '67-00005', '67-00007'] },
  { value: 'rehab', label: 'กลุ่มบำบัดผู้ใช้สารเสพติด', hns: ['67-00006', '67-00011', '67-00013', '67-00014'] },
];

const patientOptions = Object.values(APPOINTMENT_PATIENTS).map((p) => ({
  value: p.hn,
  label: `${p.hn} · ${p.patient}`,
}));

const OCCURRENCE_ACTION = { KEEP: 'keep', SKIP: 'skip', SHIFT: 'shift' };

const AppointmentRecurringPage = () => {
  const history = useHistory();
  const [tick, setTick] = useState(0);
  const bump = useCallback(() => setTick((n) => n + 1), []);
  useEffect(() => subscribeApptRequests(bump), [bump]);
  useEffect(() => subscribeApptRole(bump), [bump]);

  const canManage = canManageAppointments();
  const actor = getApptActor();

  const [mode, setMode] = useState('single');
  const [hns, setHns] = useState(['67-00001']);
  const [groupKey, setGroupKey] = useState('');
  const [clinic, setClinic] = useState(CLINIC_MASTER[0]);
  const [doctorName, setDoctorName] = useState(STAFF[0]?.name || '');
  const [typeName, setTypeName] = useState('');
  const [slotRange, setSlotRange] = useState('');
  const [purpose, setPurpose] = useState('P02');
  const [reason, setReason] = useState('');
  const [prep, setPrep] = useState('');
  const [recurrence, setRecurrence] = useState({ ...DEFAULT_RECURRENCE });
  const [overrides, setOverrides] = useState({});
  const [page, setPage] = useState(1);
  const [toast, setToast] = useState(null);
  const [confirmSave, setConfirmSave] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [saved, setSaved] = useState(null);

  const flash = useCallback((message, variant = 'success') => {
    setToast({ id: Date.now(), variant, message });
  }, []);

  const appointments = useMemo(
    /* `tick` re-merges rows created by this page + the request inbox. */
    () => withExtraAppointments(INITIAL_APPOINTMENTS),
    [tick],
  );

  const selectedStaff = useMemo(
    () => STAFF.find((s) => s.name === doctorName) || null,
    [doctorName],
  );

  const typeOptions = useMemo(() => getApptTypeOptions({ clinic: '' }), [tick]);

  /* คำสั่งนัดต่อเนื่องจากหน้าการรักษา (ingest ผ่าน store — ไม่แตะ TreatmentSteps.jsx) */
  const continuationOrders = useMemo(
    () => getAppointmentRequests().filter(
      (r) => r.channel === 'continuation' && r.status === REQUEST_STATUS.PENDING,
    ),
    [tick],
  );

  const firstSlots = useMemo(() => {
    const startKey = recurrence.startDate ? isoKey(recurrence.startDate) : null;
    if (!selectedStaff || !startKey) return [];
    return getStaffScheduleSlots(selectedStaff, startKey);
  }, [selectedStaff, recurrence.startDate]);

  const time = slotRange ? slotRangeToTime(slotRange) : '';

  const recurrenceErrors = validateRecurrence(recurrence);
  const patientCount = hns.length;

  /* ── สร้าง occurrence + ตรวจการชนรายครั้ง ─────────────────────── */
  const occurrences = useMemo(() => {
    if (recurrenceErrors.length || !time) return [];
    const dates = buildOccurrenceDates(recurrence);
    const staffId = selectedStaff?.id ?? null;
    /* แถวจำลองของ occurrence ที่ "จะถูกบันทึกจริง" — ใส่กลับเข้า pool ให้ครั้ง
       ถัดไปมองเห็น slot ที่พี่น้องในชุดเดียวกันจองไปแล้ว มิฉะนั้นสอง occurrence
       ที่กด "เลื่อนไป Slot ว่าง" จะยุบไปทับ slot เดียวกัน. */
    const claimed = [];
    return dates.map((dateKey, index) => {
      const pool = claimed.length ? appointments.concat(claimed) : appointments;
      const originalConflict = evaluateAppointmentConflicts({
        date: dateKey,
        time,
        staffId,
        doctor: doctorName,
        clinic,
        appointments: pool,
        patientCount,
      });
      const action = overrides[dateKey]
        || (originalConflict.blocking ? OCCURRENCE_ACTION.SKIP : OCCURRENCE_ACTION.KEEP);
      let effectiveDate = dateKey;
      let effectiveTime = time;
      let shiftLabel = '';
      let conflict = originalConflict;
      if (action === OCCURRENCE_ACTION.SHIFT) {
        const hit = findEarliestFreeSlot({
          staffList: selectedStaff ? [selectedStaff] : STAFF,
          appointments: pool,
          resourceType: 'all',
          fromDate: dateKey,
          days: 21,
        });
        if (hit) {
          effectiveDate = hit.date;
          effectiveTime = hit.time;
          /* findEarliestFreeSlot รู้จักแค่ STAFF_CLOSED_DATES — ไม่เห็นวันหยุด
             สถานพยาบาล / โควตารายวัน / advanceDays ใน appointmentSettingsStore
             จึงต้อง validate ปลายทางใหม่ ไม่งั้น all-or-nothing ที่โฆษณาไว้พัง. */
          conflict = evaluateAppointmentConflicts({
            date: hit.date,
            time: hit.time,
            staffId,
            doctor: doctorName,
            clinic,
            appointments: pool,
            patientCount,
          });
          shiftLabel = conflict.blocking
            ? `เลื่อนไป ${formatApptListDate(hit.date)} ${hit.time} น. ไม่ได้ — ${conflict.issues[0]?.title || 'ปลายทางไม่ว่าง'}`
            : `เลื่อนไป ${formatApptListDate(hit.date)} ${hit.time} น.`;
        } else {
          shiftLabel = 'ไม่พบ Slot ว่างภายใน 21 วัน';
          conflict = originalConflict;
        }
      }
      const blocked = action === OCCURRENCE_ACTION.SHIFT
        ? (!shiftLabel.startsWith('เลื่อนไป') || conflict.blocking)
        : conflict.blocking;
      if (action !== OCCURRENCE_ACTION.SKIP && !blocked) {
        claimed.push({
          id: `__series-claim-${dateKey}`,
          staffId,
          date: effectiveDate,
          time: effectiveTime,
          status: APPT_STATUS_CONFIRMED,
          patient: 'ชุดนัดที่กำลังสร้าง',
          doctor: doctorName,
          clinic,
          dept: clinic,
        });
      }
      return {
        key: dateKey,
        seq: index + 1,
        date: effectiveDate,
        time: effectiveTime,
        originalDate: dateKey,
        conflict,
        originalConflict,
        blocked,
        action,
        shiftLabel,
      };
    });
  }, [recurrence, recurrenceErrors.length, time, selectedStaff, doctorName, clinic, appointments, overrides, patientCount]);

  const keepable = occurrences.filter((o) => o.action !== OCCURRENCE_ACTION.SKIP && !o.blocked);
  const blockedAll = occurrences.length > 0 && keepable.length === 0;

  const totalRows = keepable.length * Math.max(1, patientCount);
  const totalPages = Math.max(1, Math.ceil(occurrences.length / PREVIEW_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = occurrences.slice((safePage - 1) * PREVIEW_PAGE_SIZE, safePage * PREVIEW_PAGE_SIZE);

  const formErrors = [];
  if (!hns.length) formErrors.push('ต้องเลือกผู้รับบริการอย่างน้อย 1 คน');
  if (!doctorName) formErrors.push('ต้องเลือกแพทย์ที่นัดตรวจ');
  if (!time) formErrors.push('ต้องเลือกเวลานัด (Slot)');
  if (reason.trim().length < 3) formErrors.push('ต้องระบุเหตุผลที่นัดอย่างน้อย 3 ตัวอักษร');
  const allErrors = [...recurrenceErrors, ...formErrors];
  if (occurrences.length && keepable.length === 0) {
    allErrors.push('ทุกครั้งในชุดถูกข้าม — ต้องมีอย่างน้อย 1 ครั้งที่บันทึกได้');
  }

  const dirty = !saved && (hns.length > 0 && (!!recurrence.startDate || !!reason || !!slotRange));

  const setOccurrenceAction = (dateKey, action) => {
    setOverrides((prev) => ({ ...prev, [dateKey]: action }));
  };

  const applyType = (name) => {
    setTypeName(name);
    const hit = getAllApptTypes().find((t) => t.name === name);
    if (!hit) return;
    if (hit.prepText) setPrep(hit.prepText);
    if (hit.recurrenceEveryDays) {
      setRecurrence((prev) => ({
        ...prev,
        mode: 'everyN',
        intervalPreset: String(hit.recurrenceEveryDays),
        intervalDays: hit.recurrenceEveryDays,
      }));
    }
    if ((hit.clinics || []).length && !hit.clinics.includes(clinic)) setClinic(hit.clinics[0]);
  };

  const loadContinuation = (order) => {
    setMode('single');
    setHns([order.hn]);
    setClinic(order.clinic);
    if (order.doctor) setDoctorName(order.doctor);
    setReason(order.symptom || 'นัดต่อเนื่องตามคำสั่งแพทย์');
    setRecurrence((prev) => ({
      ...prev,
      startDate: order.requestedDate ? parseDateKey(order.requestedDate) : prev.startDate,
      mode: 'everyN',
      intervalPreset: '14',
      intervalDays: 14,
      endMode: 'count',
      count: 4,
    }));
    setSlotRange('');
    setOverrides({});
    setSaved(null);
    flash(`โหลดคำสั่งนัดต่อเนื่อง ${order.sourceRef || order.id} เข้าฟอร์มแล้ว — เลือก Slot เพื่อสร้างชุดนัด`);
  };

  const doSave = () => {
    if (!canManage || allErrors.length) return;
    const seriesId = `SER-${Date.now()}`;
    const rows = [];
    keepable.forEach((o, idx) => {
      hns.forEach((hn) => {
        const p = APPOINTMENT_PATIENTS[hn];
        rows.push({
          id: `${seriesId}-${idx + 1}-${hn}`,
          seriesId,
          seriesSeq: idx + 1,
          seriesTotal: keepable.length,
          staffId: selectedStaff?.id ?? null,
          date: o.date,
          time: o.time,
          slotRange,
          status: APPT_STATUS_CONFIRMED,
          patient: p?.patient || hn,
          patientAvatar: p?.avatar,
          hn,
          rights: p?.rights || 'ไม่ระบุ',
          clinic,
          dept: clinic,
          type: typeName || 'พบแพทย์',
          doctor: doctorName,
          examMode: 'onsite',
          orderingUnit: mode === 'group' ? 'นัดกลุ่ม (ระบบนัดหมาย)' : 'นัดต่อเนื่อง (ระบบนัดหมาย)',
          reason,
          prep,
          purposeCode: purpose,
          createdBy: actor,
        });
      });
    });
    addExtraAppointments(rows);
    appendSettingsAudit({
      action: mode === 'group' ? 'สร้างนัดกลุ่ม' : 'สร้างชุดนัดต่อเนื่อง',
      target: `${seriesId} · ${clinic} · ${doctorName}`,
      before: '—',
      after: `${keepable.length} ครั้ง × ${hns.length} คน = ${rows.length} นัด (${describeRecurrence(recurrence)})`,
      reason,
      actor,
    });
    hns.forEach((hn) => {
      const p = APPOINTMENT_PATIENTS[hn];
      pushNotify({
        channel: 'push',
        kind: 'recurring',
        hn,
        patient: p?.patient || hn,
        title: 'ยืนยันชุดนัดหมายต่อเนื่อง',
        body: `${keepable.length} ครั้ง · ${describeRecurrence(recurrence)} · เริ่ม ${formatApptListDate(keepable[0]?.date)} เวลา ${keepable[0]?.time} น.`,
        actor,
      });
    });
    /* คำสั่งนัดต่อเนื่องที่ถูกใช้สร้างชุดนัดแล้ว ให้ปิดคำขอในกล่องรับนัดหมาย */
    continuationOrders
      .filter((o) => hns.includes(o.hn))
      .forEach((o) => confirmRequest(o.id, {
        actor,
        appointmentId: rows[0]?.id,
        date: keepable[0]?.date,
        time: keepable[0]?.time,
        note: `สร้างเป็นชุดนัดต่อเนื่อง ${seriesId}`,
      }));

    setSaved({ seriesId, rows });
    setConfirmSave(false);
    flash(`บันทึกชุดนัดสำเร็จ ${rows.length} รายการ — พิมพ์ใบนัดทั้งชุดได้จากปุ่มด้านบน`);
  };

  const printSeries = () => {
    const rows = saved?.rows || [];
    if (!rows.length) return;
    printAppointmentSlipBatch(rows, { heading: 'ใบนัดหมายต่อเนื่อง' });
  };

  const resetAll = () => {
    setHns(mode === 'group' ? [] : ['67-00001']);
    setGroupKey('');
    setSlotRange('');
    setReason('');
    setPrep('');
    setOverrides({});
    setRecurrence({ ...DEFAULT_RECURRENCE });
    setSaved(null);
  };

  const leavePage = () => {
    if (dirty) { setLeaveOpen(true); return; }
    history.push('/appointment');
  };

  const previewColumns = [
    {
      key: 'seq', header: 'ลำดับที่', width: 96, sortable: false,
      render: (o) => <span style={TEXT_CELL}>{o.seq}</span>,
    },
    {
      key: 'date', header: 'วันที่นัดล่วงหน้า', width: 200, sortable: false,
      render: (o) => (
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-050, 2px)' }}>
          <span style={TEXT_CELL}>{formatApptListDate(o.date)}</span>
          {o.action === OCCURRENCE_ACTION.SHIFT && o.shiftLabel ? (
            <span style={HINT}>{o.shiftLabel}</span>
          ) : null}
        </div>
      ),
    },
    {
      key: 'time', header: 'เวลานัด', width: 116, sortable: false,
      render: (o) => <span style={TEXT_CELL}>{o.time} น.</span>,
    },
    {
      key: 'clinic', header: 'คลินิกที่ตรวจ', width: 190, sortable: false,
      render: () => <span className='truncate' style={TEXT_CELL}>{clinic}</span>,
    },
    {
      key: 'doctor', header: 'แพทย์ที่นัดตรวจ', width: 190, sortable: false,
      render: () => <span className='truncate' style={TEXT_CELL}>{doctorName || '—'}</span>,
    },
    {
      key: 'flags', header: 'ผลการตรวจสอบ', flex: true, minWidth: 280, sortable: false,
      render: (o) => (
        o.conflict.issues.length === 0 ? (
          <StatusBadge style='success' size='small'>ว่าง — บันทึกได้</StatusBadge>
        ) : (
          <div className='flex flex-wrap' style={{ gap: 'var(--dim-space-100, 4px)' }}>
            {o.conflict.issues.map((i) => (
              <ColorfulBadge
                key={i.key}
                style={i.severity === 'block' ? 'red' : 'yellow'}
                size='small'
                hierarchy='secondary'
                width='hug'
              >
                {i.title}
              </ColorfulBadge>
            ))}
          </div>
        )
      ),
    },
    {
      key: 'action', header: 'การจัดการรายครั้ง', width: 260, sortable: false,
      render: (o) => (
        <div className='flex items-center' style={{ gap: 'var(--dim-space-150, 6px)' }}>
          <BrandSubdueButton
            variant={o.action === OCCURRENCE_ACTION.KEEP ? 'fill' : 'outline'}
            size='sm'
            /* ปุ่ม "บันทึก" = กลับไปใช้วันเดิม จึงต้องดูผลตรวจของวันเดิม
               (o.conflict อาจเป็นผลตรวจของปลายทางที่เลื่อนไปแล้ว) */
            disabled={!canManage || o.originalConflict.blocking}
            onClick={() => setOccurrenceAction(o.key, OCCURRENCE_ACTION.KEEP)}
          >
            บันทึก
          </BrandSubdueButton>
          <NeutralSubdueButton
            variant={o.action === OCCURRENCE_ACTION.SKIP ? 'fill' : 'outline'}
            size='sm'
            disabled={!canManage}
            onClick={() => setOccurrenceAction(o.key, OCCURRENCE_ACTION.SKIP)}
          >
            ข้ามครั้งนี้
          </NeutralSubdueButton>
          <BrandSubdueButton
            variant={o.action === OCCURRENCE_ACTION.SHIFT ? 'fill' : 'outline'}
            size='sm'
            disabled={!canManage}
            onClick={() => setOccurrenceAction(o.key, OCCURRENCE_ACTION.SHIFT)}
          >
            เลื่อนไป Slot ว่าง
          </BrandSubdueButton>
        </div>
      ),
    },
  ];

  const summaryCards = [
    { key: 'patients', label: 'ผู้รับบริการในชุดนัด', value: patientCount, indicator: mode === 'group' ? 'นัดกลุ่ม' : 'รายคน', color: 'info', icon: 'groups' },
    { key: 'occurrences', label: 'ครั้งที่สร้างได้', value: keepable.length, indicator: `จากทั้งหมด ${occurrences.length}`, color: 'positive', icon: 'event_repeat' },
    { key: 'skipped', label: 'ครั้งที่ถูกข้าม', value: occurrences.length - keepable.length, indicator: 'ชนวันหยุด/โควตา', color: 'destructive', icon: 'event_busy' },
    { key: 'total', label: 'จำนวนนัดที่จะบันทึก', value: totalRows, indicator: 'ครั้ง × คน', color: 'inprogress', icon: 'calendar_add_on' },
  ];

  return (
    <>
      <QueuePageShell
        activeKey='appoint'
        breadcrumb={breadcrumb}
        title='นัดต่อเนื่อง / นัดซ้ำ / นัดกลุ่ม'
        onBack={leavePage}
        summaryCards={summaryCards}
        tabs={MODE_TABS}
        activeTab={mode}
        onTabChange={(k) => {
          setMode(k);
          if (k === 'group' && hns.length <= 1) setHns([]);
          if (k !== 'group' && hns.length > 1) setHns([hns[0]]);
          setSaved(null);
        }}
        actions={(
          <div className='flex items-center' style={{ gap: 'var(--dim-space-300, 12px)' }}>
            <NeutralSubdueButton
              size='lg'
              variant='outline'
              leadingIcon='print'
              disabled={!saved}
              onClick={printSeries}
            >
              พิมพ์ใบนัดทั้งชุด
            </NeutralSubdueButton>
            <span title={canManage ? 'บันทึกชุดนัดทั้งหมด' : NO_PERMISSION_TOOLTIP}>
              <BrandButton
                variant='fill'
                size='lg'
                leadingIcon='save'
                disabled={!canManage || allErrors.length > 0}
                onClick={() => setConfirmSave(true)}
              >
                บันทึกชุดนัด ({totalRows})
              </BrandButton>
            </span>
          </div>
        )}
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
          {!canManage ? (
            <StatusBadge style='neutral' size='default' icon='lock'>
              บทบาทปัจจุบันเป็นแบบดูอย่างเดียว — {NO_PERMISSION_TOOLTIP}
            </StatusBadge>
          ) : null}

          {/* ── คำสั่งนัดต่อเนื่องจากหน้าการรักษา ─────────────────── */}
          {continuationOrders.length ? (
            <section className='flex flex-col w-full' style={CARD}>
              <span style={TITLE}>คำสั่งนัดต่อเนื่องจากหน้าการรักษา (§1.4.12.1)</span>
              <span style={HINT}>
                คำสั่งจาก SOAP/CPOE ขั้นตอนที่ 6 ของ /treat/record ที่ส่งเข้ามาผ่านคลังคำขอของโมดูลนี้ —
                กด “ใช้คำสั่งนี้” เพื่อเติมฟอร์มด้านล่างอัตโนมัติ
              </span>
              <div className='flex flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                {continuationOrders.map((o) => (
                  <div
                    key={o.id}
                    className='flex flex-col'
                    style={{
                      minWidth: 280,
                      gap: 'var(--dim-space-100, 4px)',
                      paddingTop: 'var(--dim-space-300, 12px)',
                      paddingBottom: 'var(--dim-space-300, 12px)',
                      paddingLeft: 'var(--dim-space-300, 12px)',
                      paddingRight: 'var(--dim-space-300, 12px)',
                      borderRadius: 'var(--dim-radius-300, 10px)',
                      border: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-tertiary)',
                      background: 'var(--surface-brandPrimary-quaternary)',
                    }}
                  >
                    <span style={{ ...TEXT_CELL, fontWeight: 'var(--type-weight-medium)' }}>
                      {o.patient} · HN {o.hn}
                    </span>
                    <span style={HINT}>{o.sourceRef} · {o.clinic} · {o.doctor || 'ไม่ระบุแพทย์'}</span>
                    <span style={HINT}>{o.note || o.symptom}</span>
                    <BrandSubdueButton
                      variant='outline'
                      size='sm'
                      leadingIcon='download'
                      disabled={!canManage}
                      onClick={() => loadContinuation(o)}
                    >
                      ใช้คำสั่งนี้
                    </BrandSubdueButton>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {/* ── ผู้รับบริการ + ทรัพยากร ─────────────────────────── */}
          <section className='flex flex-col w-full' style={CARD}>
            <span style={TITLE}>
              {mode === 'group' ? 'เลือกกลุ่มผู้รับบริการ' : 'ผู้รับบริการและทรัพยากร'}
            </span>

            {mode === 'group' ? (
              <FieldGrid cols={2} columnGap='var(--dim-space-400)' rowGap='var(--dim-space-300)'>
                <Field label='กลุ่มสำเร็จรูป'>
                  <Select
                    options={[{ value: '', label: 'เลือกกลุ่ม (หรือเลือกรายคนด้านขวา)' }, ...PATIENT_GROUPS]}
                    value={groupKey}
                    onChange={(v) => {
                      setGroupKey(v);
                      const hit = PATIENT_GROUPS.find((g) => g.value === v);
                      if (hit) setHns(hit.hns);
                    }}
                    size='md'
                    searchable={false}
                    showLabel={false}
                    showHelperText={false}
                    disabled={!canManage}
                  />
                </Field>
                <Field label='ผู้รับบริการในชุดนัด' required>
                  <Select
                    options={patientOptions}
                    value={hns}
                    onChange={setHns}
                    multiple
                    selectAllLabel='เลือกทั้งหมด'
                    size='md'
                    showLabel={false}
                    showHelperText={false}
                    placeholder='เลือกผู้รับบริการ'
                    disabled={!canManage}
                  />
                </Field>
              </FieldGrid>
            ) : (
              <FieldGrid cols={2} columnGap='var(--dim-space-400)' rowGap='var(--dim-space-300)'>
                <Field label='ผู้รับบริการ' required>
                  <Select
                    options={patientOptions}
                    value={hns[0] || ''}
                    onChange={(v) => setHns(v ? [v] : [])}
                    size='md'
                    showLabel={false}
                    showHelperText={false}
                    placeholder='ค้นหา HN หรือชื่อ'
                    disabled={!canManage}
                  />
                </Field>
                <Field label='รูปแบบการนัดหมาย (จากทะเบียนรูปแบบ)'>
                  <Select
                    options={[{ value: '', label: 'ใช้ค่าเริ่มต้น (พบแพทย์)' }, ...typeOptions]}
                    value={typeName}
                    onChange={applyType}
                    size='md'
                    showLabel={false}
                    showHelperText={false}
                    disabled={!canManage}
                  />
                </Field>
              </FieldGrid>
            )}

            <FieldGrid cols={3} columnGap='var(--dim-space-400)' rowGap='var(--dim-space-300)'>
              <Field label='คลินิกที่นัดตรวจ' required>
                <Select
                  options={CLINIC_MASTER.map((c) => ({ value: c, label: c }))}
                  value={clinic}
                  onChange={setClinic}
                  size='md'
                  showLabel={false}
                  showHelperText={false}
                  disabled={!canManage}
                />
              </Field>
              <Field label='แพทย์ที่นัดตรวจ' required>
                <Select
                  options={STAFF.map((s) => ({ value: s.name, label: `${s.name} · ${s.dept}` }))}
                  value={doctorName}
                  onChange={(v) => { setDoctorName(v); setSlotRange(''); }}
                  size='md'
                  showLabel={false}
                  showHelperText={false}
                  disabled={!canManage}
                />
              </Field>
              <Field label='นัดมาเพื่อ (รหัสตาม HCIS)' required>
                <Select
                  options={APPT_PURPOSE_MASTER.map((p) => ({ value: p.code, label: `${p.code} · ${p.label}` }))}
                  value={purpose}
                  onChange={setPurpose}
                  size='md'
                  showLabel={false}
                  showHelperText={false}
                  disabled={!canManage}
                />
              </Field>
            </FieldGrid>
          </section>

          {/* ── กติกาการนัดซ้ำ ─────────────────────────────────── */}
          <section className='flex flex-col w-full' style={CARD}>
            <span style={TITLE}>กติกาการนัดต่อเนื่อง</span>
            <AppointmentRecurrenceBuilder
              value={recurrence}
              onChange={(next) => { setRecurrence(next); setOverrides({}); setSaved(null); }}
              disabled={!canManage}
            />

            <span style={HINT}>
              เวลานัด (Slot ซ้อนชั้น → เลขคิว ตาม TOR 1.6.1.4) — อ้างอิงตารางของแพทย์ในวันนัดครั้งแรก
            </span>
            {firstSlots.length === 0 ? (
              <span style={{ ...TEXT_CELL, color: 'var(--text-content-tertiary)' }}>
                {recurrence.startDate
                  ? 'วันที่เลือกไม่มีตารางออกตรวจของแพทย์ท่านนี้ (วันหยุด / นอกรูปแบบตาราง) — เลือกวันหรือแพทย์ใหม่'
                  : 'เลือกวันที่นัดครั้งแรกก่อนจึงจะแสดงช่วงเวลาที่ว่าง'}
              </span>
            ) : (
              <div className='flex flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                {firstSlots.slice(0, 30).map((slot) => (
                  <Timeslot
                    key={slot.value}
                    value={slot.label || slot.value}
                    selected={slotRange === slot.value}
                    disabled={!canManage}
                    onClick={() => { setSlotRange(slot.value); setOverrides({}); setSaved(null); }}
                  />
                ))}
              </div>
            )}

            <FieldGrid cols={2} columnGap='var(--dim-space-400)' rowGap='var(--dim-space-300)'>
              <SuggestibleTextarea
                label='เหตุผลที่นัด / แผนการรักษา'
                required
                value={reason}
                onChange={(e) => setReason(e?.target ? e.target.value : e)}
                placeholder='พิมพ์อย่างน้อย 3 ตัวอักษรเพื่อดูข้อความที่ใช้บ่อย'
                suggestions={RECURRENCE_REASON_SUGGESTIONS}
                minChars={3}
                voice
                rows={3}
                height={128}
                disabled={!canManage}
              />
              <SuggestibleTextarea
                label='การเตรียมตัวก่อนตรวจ (พิมพ์ลงใบนัดทุกครั้ง)'
                value={prep}
                onChange={(e) => setPrep(e?.target ? e.target.value : e)}
                placeholder='พิมพ์อย่างน้อย 3 ตัวอักษรเพื่อดูข้อความมาตรฐาน'
                suggestions={APPT_TYPE_PREP_SUGGESTIONS}
                minChars={3}
                voice
                rows={3}
                height={128}
                disabled={!canManage}
              />
            </FieldGrid>

            {allErrors.length ? (
              <ul className='flex flex-col m-0 p-0 list-none' style={{ gap: 'var(--dim-space-100, 4px)' }}>
                {allErrors.map((e) => (
                  <li
                    key={e}
                    className='flex items-center'
                    style={{ ...HINT, gap: 'var(--dim-space-100, 4px)', color: 'var(--text-alert-error)' }}
                  >
                    <Sym name='error' size={16} color='var(--icon-alertdialog-destructive)' />
                    {e}
                  </li>
                ))}
              </ul>
            ) : null}
          </section>

          {/* ── ตารางตรวจสอบรายครั้ง ────────────────────────────── */}
          <section className='flex flex-col w-full' style={CARD}>
            <div className='flex flex-wrap items-center justify-between' style={{ gap: 'var(--dim-space-300, 12px)' }}>
              <div className='flex flex-col' style={{ gap: 'var(--dim-space-050, 2px)' }}>
                <span style={TITLE}>ตรวจสอบรายครั้งก่อนบันทึก</span>
                <span style={HINT}>
                  ธงรายครั้ง: ชนวันหยุดสถานพยาบาล / วันหยุด Resource / เต็มโควตาคิววันนั้น /
                  แพทย์-ห้องตรวจซ้ำซ้อน / เกินช่วงรับนัดล่วงหน้า — เลือก “ข้ามครั้งนี้” หรือ “เลื่อนไป Slot ว่าง” รายแถว
                </span>
              </div>
              {occurrences.length ? (
                <NeutralSubdueButton
                  size='sm'
                  variant='outline'
                  leadingIcon='restart_alt'
                  disabled={!canManage}
                  onClick={() => setOverrides({})}
                >
                  คืนค่าการจัดการรายครั้ง
                </NeutralSubdueButton>
              ) : null}
            </div>

            {blockedAll ? (
              <div
                className='flex flex-col'
                style={{
                  gap: 'var(--dim-space-200, 8px)',
                  paddingTop: 'var(--dim-space-400, 16px)',
                  paddingBottom: 'var(--dim-space-400, 16px)',
                  paddingLeft: 'var(--dim-space-400, 16px)',
                  paddingRight: 'var(--dim-space-400, 16px)',
                  borderRadius: 'var(--dim-radius-300, 10px)',
                  background: 'var(--surface-alert-error)',
                }}
              >
                <span style={{ ...TEXT_CELL, color: 'var(--text-alert-error)', fontWeight: 'var(--type-weight-medium)' }}>
                  ทุกครั้งในชุดนี้ชนวันหยุดหรือเต็มโควตา — บันทึกชุดว่างไม่ได้
                </span>
                <div className='flex flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                  <BrandSubdueButton
                    variant='outline'
                    size='sm'
                    leadingIcon='bolt'
                    disabled={!canManage}
                    onClick={() => {
                      const next = {};
                      occurrences.forEach((o) => { next[o.key] = OCCURRENCE_ACTION.SHIFT; });
                      setOverrides(next);
                      flash('เลื่อนทั้งชุดไป Slot ว่างถัดไปแล้ว — ตรวจสอบผลด้านล่างก่อนบันทึก');
                    }}
                  >
                    เลื่อนทั้งชุดไป Slot ว่างถัดไป
                  </BrandSubdueButton>
                  <NeutralSubdueButton
                    size='sm'
                    variant='outline'
                    leadingIcon='tune'
                    onClick={() => history.push('/appointment/settings')}
                  >
                    ไปปรับโควตา / วันหยุด
                  </NeutralSubdueButton>
                </div>
              </div>
            ) : null}

            {mode === 'group' && occurrences.length && keepable.length ? (
              (() => {
                const first = keepable[0];
                const remaining = first?.conflict?.availability?.remaining ?? 0;
                if (patientCount <= remaining) return null;
                return (
                  <div
                    className='flex flex-col'
                    style={{
                      gap: 'var(--dim-space-200, 8px)',
                      paddingTop: 'var(--dim-space-300, 12px)',
                      paddingBottom: 'var(--dim-space-300, 12px)',
                      paddingLeft: 'var(--dim-space-300, 12px)',
                      paddingRight: 'var(--dim-space-300, 12px)',
                      borderRadius: 'var(--dim-radius-300, 10px)',
                      background: 'var(--surface-alert-warning)',
                    }}
                  >
                    <span style={{ ...TEXT_CELL, color: 'var(--text-alert-warning)' }}>
                      กลุ่มมี {patientCount} คน แต่วันที่ {formatApptListDate(first.date)} รับได้อีก {remaining} คิว
                    </span>
                    <div className='flex flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                      <BrandSubdueButton
                        variant='outline'
                        size='sm'
                        leadingIcon='content_cut'
                        disabled={!canManage || remaining <= 0}
                        onClick={() => {
                          setHns((prev) => prev.slice(0, Math.max(1, remaining)));
                          flash(`ตัดผู้รับบริการที่เกินออก เหลือ ${Math.max(1, remaining)} คนในรอบนี้`);
                        }}
                      >
                        ตัดคนที่เกินไปนัดรอบถัดไป
                      </BrandSubdueButton>
                      <NeutralSubdueButton
                        size='sm'
                        variant='outline'
                        leadingIcon='tune'
                        onClick={() => history.push('/appointment/settings')}
                      >
                        ขยายโควตาวันนั้น
                      </NeutralSubdueButton>
                    </div>
                  </div>
                );
              })()
            ) : null}

            <Table
              columns={previewColumns}
              rows={pageRows}
              rowKey={(o) => o.key}
              emptyMessage='ยังไม่มีรายการนัดให้ตรวจสอบ'
              emptySubtext='กรอกวันที่นัดครั้งแรก เลือกแพทย์และช่วงเวลา ระบบจะสร้างรายการล่วงหน้าให้อัตโนมัติ'
              style={{ maxHeight: 520, overflow: 'auto' }}
            />

            <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-600, 24px)' }}>
              <span
                style={{
                  flex: 1,
                  color: 'var(--text-content-secondary)',
                  fontFamily: 'var(--type-family-body)',
                  fontSize: 'var(--type-size-sm, 14px)',
                }}
              >
                จะบันทึก {keepable.length} ครั้ง × {patientCount} คน = {totalRows} นัด
                {saved ? ` · บันทึกแล้วเมื่อสักครู่ (ชุด ${saved.seriesId})` : ''}
              </span>
              <Pagination currentPage={safePage} pageCount={totalPages} onPageChange={setPage} />
            </div>
          </section>
        </div>
      </QueuePageShell>

      <AlertDialog
        open={confirmSave}
        type='info'
        title='บันทึกชุดนัดทั้งหมด'
        description={`ระบบจะสร้าง ${totalRows} นัด (${keepable.length} ครั้ง × ${patientCount} คน) แบบทั้งชุด — ถ้ามีข้อผิดพลาดจะไม่บันทึกครึ่งชุด และจะบันทึกผู้ดำเนินการ ${actor} พร้อมเวลาไว้ในประวัติ`}
        confirmLabel='ยืนยันบันทึกทั้งชุด'
        cancelLabel='กลับไปแก้ไข'
        onConfirm={doSave}
        onClose={() => setConfirmSave(false)}
      />

      <UnsavedChangesPopup
        open={leaveOpen}
        title='ออกจากหน้านัดต่อเนื่องโดยยังไม่บันทึก ?'
        description='ชุดนัดที่ตั้งค่าไว้ยังไม่ถูกสร้าง — ถ้าออกตอนนี้จะไม่มีนัดใดถูกบันทึก (ทั้งชุดหรือไม่บันทึกเลย)'
        onClose={() => setLeaveOpen(false)}
        onSave={() => { setLeaveOpen(false); setConfirmSave(true); }}
        onDiscard={() => { setLeaveOpen(false); resetAll(); history.push('/appointment'); }}
      />

      <PhcisTopToast session={toast} onDismiss={() => setToast(null)} />
    </>
  );
};

export default AppointmentRecurringPage;
