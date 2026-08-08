import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import Table from '@/components/table/Table';
import Pagination from '@/components/pagination/Pagination';
import PrimarySearch from '@/components/search/PrimarySearch';
import DatePicker from '@/components/forms/DatePicker';
import InputField from '@/components/forms/InputField';
import Select from '@/components/forms/Select';
import Checkbox from '@/components/checkbox/Checkbox';
import { Field, FieldGrid } from '@/components/forms/Fields';
import StatusBadge from '@/components/badge/StatusBadge';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import BrandButton from '@/components/button/BrandButton';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import DangerSubdueButton from '@/components/button/DangerSubdueButton';
import AlertDialog from '@/components/popup/AlertDialog';
import PhcisTopToast from '@/components/alert/PhcisTopToast';
import { Sym } from '@/components/forms/_inputBox';
import { formatThaiBuddhistDate } from '@/data/registrationForm';
import AppointmentSettingsPanel from './AppointmentSettingsPanel';
import AppointmentNotifyLogTable from './AppointmentNotifyLogTable';
import { pushNotify } from './appointmentNotifyStore';
import { withExtraAppointments, subscribeExtraAppointments } from './appointmentExtraStore';
import {
  AVAILABILITY,
  addFacilityHoliday,
  addResourceClosedDate,
  appendSettingsAudit,
  canCancelDaySchedule,
  countActiveAppointmentsOnDate,
  evaluateDayAvailability,
  getAppointmentsImpactedByHoliday,
  getCancelAuditLog,
  getCapacityOverride,
  getFacilityHolidays,
  getSettingsAuditLog,
  removeCapacityOverride,
  setCapacityOverride,
  subscribeApptSettings,
} from './appointmentSettingsStore';
import {
  APPT_ROLES,
  NO_PERMISSION_TOOLTIP,
  canConfigureAppointments,
  getApptActor,
  getApptRole,
  setApptRole,
  subscribeApptRole,
} from './appointmentPermissions';
import {
  INITIAL_APPOINTMENTS,
  STAFF,
  formatApptListDate,
  isoKey,
  parseDateKey,
} from './appointmentShared';

/* TOR 1.6.1.2 · 1.6.1.3 · 1.6.1.4 · 1.6.1.5 · 1.6.1.6 · 1.6.2.1 · 1.6.2.7 ·
   1.6.4.1 · 1.6.4.2 · 4.2.5

   หน้านี้ทำให้ `AppointmentSettingsPanel.jsx` (ที่ก่อนหน้านี้ไม่มีไฟล์ใด import
   เลย ⇒ ทุกข้อข้างต้นไม่มีทางเข้าใน UI) มี route จริงเป็นครั้งแรก แล้วเสริม
   โควตาคิวรายวัน · ผลกระทบวันหยุด · guard ยกเลิกตารางทั้งวัน · ประวัติการยกเลิก ·
   บันทึกการแจ้งเตือน · บทบาทผู้ใช้งาน เป็นแท็บเพิ่ม. */

const breadcrumb = ['ระบบนัดหมาย', 'ตั้งค่าระบบนัดหมาย'];
const CAPACITY_DAYS = 30;
const AUDIT_PAGE_SIZE = 10;

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

const TABS = [
  { key: 'resource', label: 'รูปแบบตาราง Resource + วันหยุด', icon: 'calendar_month' },
  { key: 'capacity', label: 'โควตาคิวรายวัน', icon: 'event_seat' },
  { key: 'holiday', label: 'วันหยุด & ผลกระทบต่อนัด', icon: 'beach_access' },
  { key: 'cancelday', label: 'ยกเลิกตารางทั้งวัน', icon: 'event_busy' },
  { key: 'audit', label: 'ประวัติการยกเลิกนัด', icon: 'history' },
  { key: 'notify', label: 'บันทึกการแจ้งเตือน', icon: 'notifications' },
  { key: 'role', label: 'บทบาทผู้ใช้งาน', icon: 'admin_panel_settings' },
];

const AppointmentSettingsPage = () => {
  const history = useHistory();
  const [tick, setTick] = useState(0);
  const bump = useCallback(() => setTick((n) => n + 1), []);
  useEffect(() => subscribeApptSettings(bump), [bump]);
  useEffect(() => subscribeExtraAppointments(bump), [bump]);
  useEffect(() => subscribeApptRole(bump), [bump]);

  const canConfigure = canConfigureAppointments();
  const actor = getApptActor();
  const role = getApptRole();

  const [tab, setTab] = useState('resource');
  const [toast, setToast] = useState(null);

  /* capacity tab */
  const [quotaDate, setQuotaDate] = useState(null);
  const [quotaValue, setQuotaValue] = useState('');
  const [quotaReason, setQuotaReason] = useState('');
  const [quotaError, setQuotaError] = useState('');
  const [confirmZero, setConfirmZero] = useState(false);

  /* holiday tab */
  const [holidayDate, setHolidayDate] = useState(null);
  const [holidayName, setHolidayName] = useState('');
  const [holidayConfirm, setHolidayConfirm] = useState(null);
  const [holidayNotify, setHolidayNotify] = useState(true);

  /* cancel-day tab */
  const [cancelStaffId, setCancelStaffId] = useState(STAFF[0]?.id ?? '');
  const [cancelDate, setCancelDate] = useState(null);

  /* audit tab */
  const [auditSearch, setAuditSearch] = useState('');
  const [auditRange, setAuditRange] = useState(null);
  const [auditPage, setAuditPage] = useState(1);

  const flash = useCallback((message, variant = 'success') => {
    setToast({ id: Date.now(), variant, message });
  }, []);

  const appointments = useMemo(() => withExtraAppointments(INITIAL_APPOINTMENTS), [tick]);

  /* ── โควตาคิวรายวัน (1.6.1.2) ─────────────────────────────── */
  const capacityRows = useMemo(() => {
    const out = [];
    const base = new Date();
    for (let i = 0; i < CAPACITY_DAYS; i += 1) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      const key = isoKey(d);
      const booked = countActiveAppointmentsOnDate(appointments, key);
      const verdict = evaluateDayAvailability({ dateKey: key, bookedCount: booked });
      out.push({ key, booked, override: getCapacityOverride(key), ...verdict });
    }
    return out;
  }, [appointments, tick]);

  const quotaDateKey = quotaDate ? isoKey(quotaDate) : '';
  const quotaBooked = quotaDateKey ? countActiveAppointmentsOnDate(appointments, quotaDateKey) : 0;

  const applyQuota = (confirmedZero = false) => {
    setQuotaError('');
    if (!canConfigure) return;
    if (!quotaDateKey) { setQuotaError('กรุณาเลือกวันที่ที่ต้องการปรับโควตา'); return; }
    const next = Number(quotaValue);
    if (!Number.isFinite(next) || next < 0) { setQuotaError('จำนวนคิวต้องเป็นตัวเลขตั้งแต่ 0 ขึ้นไป'); return; }
    if (next === 0 && !confirmedZero) { setConfirmZero(true); return; }
    const res = setCapacityOverride(quotaDateKey, next, {
      bookedCount: quotaBooked,
      reason: quotaReason,
      actor,
    });
    if (!res.ok) { setQuotaError(res.error); setConfirmZero(false); return; }
    setConfirmZero(false);
    setQuotaValue('');
    setQuotaReason('');
    flash(`บันทึกโควตาคิววันที่ ${formatApptListDate(quotaDateKey)} เป็น ${next} คิวแล้ว`);
  };

  /* ── วันหยุด + ผลกระทบ (1.6.4.1) ───────────────────────────── */
  const holidayKey = holidayDate ? isoKey(holidayDate) : '';
  const impacted = holidayKey ? getAppointmentsImpactedByHoliday(appointments, holidayKey) : [];

  const commitHoliday = (notifyPatients) => {
    addFacilityHoliday(holidayKey, holidayName.trim() || 'วันหยุดสถานพยาบาล', { actor });
    if (notifyPatients) {
      impacted.forEach((a) => pushNotify({
        channel: 'push',
        kind: 'holiday',
        hn: a.hn,
        patient: a.patient,
        title: 'แจ้งเปลี่ยนแปลงนัดหมาย — วันหยุดสถานพยาบาล',
        body: `${formatApptListDate(holidayKey)} หน่วยบริการปิดทำการ กรุณาติดต่อเจ้าหน้าที่เพื่อเลื่อนนัด`,
        appointmentId: a.id,
        actor,
      }));
    }
    setHolidayConfirm(null);
    setHolidayDate(null);
    setHolidayName('');
    flash(notifyPatients
      ? `บันทึกวันหยุดและแจ้งเตือนผู้รับบริการ ${impacted.length} รายแล้ว`
      : 'บันทึกวันหยุดสถานพยาบาลแล้ว');
  };

  /* ── ยกเลิกตารางทั้งวัน (1.6.1.6) ──────────────────────────── */
  const cancelKey = cancelDate ? isoKey(cancelDate) : '';
  const cancelCheck = cancelKey && cancelStaffId
    ? canCancelDaySchedule(appointments, cancelStaffId, cancelKey)
    : { ok: false, activeCount: 0, active: [] };

  const doCancelDay = () => {
    if (!canConfigure || !cancelCheck.ok) return;
    addResourceClosedDate(cancelStaffId, cancelKey, { actor });
    appendSettingsAudit({
      action: 'ยกเลิกตารางทั้งวัน (TOR 1.6.1.6)',
      target: `${STAFF.find((s) => String(s.id) === String(cancelStaffId))?.name || cancelStaffId} · ${cancelKey}`,
      before: 'เปิดตารางตามปกติ',
      after: 'ยกเลิกตารางทั้งวัน (ไม่มีนัด Active คงเหลือ)',
      actor,
    });
    setCancelDate(null);
    flash(`ยกเลิกตารางวันที่ ${formatApptListDate(cancelKey)} สำเร็จ`);
  };

  /* ── ประวัติการยกเลิก (1.6.2.7) + audit การตั้งค่า ──────────── */
  const cancelAudit = useMemo(() => getCancelAuditLog(), [tick]);
  const settingsAudit = useMemo(() => getSettingsAuditLog(), [tick]);

  const auditFiltered = useMemo(() => {
    const q = auditSearch.trim().toLowerCase();
    const start = auditRange?.start ? new Date(auditRange.start) : null;
    const end = auditRange?.end ? new Date(auditRange.end) : null;
    if (start) start.setHours(0, 0, 0, 0);
    if (end) end.setHours(23, 59, 59, 999);
    return cancelAudit.filter((r) => {
      /* ใช้ขอบที่เลือกไว้ทีละด้านได้ — เดิมต้องครบทั้งคู่ ทำให้เลือกแค่วันเริ่มต้น
         แล้วชิป/ข้อความ empty บอกว่ากรองอยู่ทั้งที่ยังไม่ได้กรองจริง */
      if ((start || end) && r.date) {
        const d = parseDateKey(r.date);
        if (start && d < start) return false;
        if (end && d > end) return false;
      }
      if (!q) return true;
      return [r.hn, r.patient, r.reason, r.actor, r.appointmentId, r.note]
        .some((f) => String(f || '').toLowerCase().includes(q));
    });
  }, [cancelAudit, auditSearch, auditRange]);

  const auditHasFilter = !!(auditSearch || auditRange?.start || auditRange?.end);
  const auditTotalPages = Math.max(1, Math.ceil(auditFiltered.length / AUDIT_PAGE_SIZE));
  const auditSafePage = Math.min(auditPage, auditTotalPages);
  const auditRows = auditFiltered.slice((auditSafePage - 1) * AUDIT_PAGE_SIZE, auditSafePage * AUDIT_PAGE_SIZE);

  const printAudit = () => {
    const body = auditFiltered.map((r) => `
      <tr><td>${r.at}</td><td>${r.kind || 'ยกเลิกนัด'}</td><td>${r.patient} (HN ${r.hn})</td>
      <td>${r.date} ${r.time}</td><td>${r.reason}</td><td>${r.note || ''}</td><td>${r.actor}</td></tr>`).join('');
    const html = `<!DOCTYPE html><html lang="th"><head><meta charset="utf-8"/><title>ประวัติการยกเลิกนัด</title>
<style>body{font-family:Sarabun,sans-serif;padding:24px;color:#232B36}
h1{font-size:18px;color:#007549;margin:0 0 4px}.meta{color:#858C92;font-size:12px;margin-bottom:16px}
table{width:100%;border-collapse:collapse;font-size:12px}th,td{border:1px solid #E2E4E6;padding:6px;text-align:left}
th{background:#F4FBF8}@media print{body{padding:0}}</style></head><body>
<h1>ประวัติการยกเลิกนัดหมาย (TOR 1.6.2.7)</h1>
<div class="meta">พิมพ์เมื่อ ${new Date().toLocaleString('th-TH')} · ${auditFiltered.length} รายการ</div>
<table><thead><tr><th>เวลาที่บันทึก</th><th>ประเภท</th><th>ผู้รับบริการ</th><th>วัน-เวลานัด</th><th>สาเหตุ</th><th>หมายเหตุ</th><th>ผู้ดำเนินการ</th></tr></thead>
<tbody>${body}</tbody></table></body></html>`;
    const w = window.open('', '_blank', 'noopener,noreferrer,width=1024,height=800');
    if (!w) return;
    w.document.open();
    w.document.write(html);
    w.document.close();
  };

  /* ── columns ────────────────────────────────────────────────── */
  const capacityColumns = [
    {
      key: 'date', header: 'วันที่', sortable: false,
      render: (r) => <span style={TEXT_CELL}>{formatApptListDate(r.key)}</span>,
    },
    {
      key: 'quota', header: 'โควตาคิว', sortable: false,
      render: (r) => (
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-050, 2px)' }}>
          <span style={{ ...TEXT_CELL, fontWeight: 'var(--type-weight-medium)' }}>{r.quota}</span>
          {r.override ? (
            <ColorfulBadge style='indigo' size='small' hierarchy='secondary' width='hug'>ปรับเฉพาะวัน</ColorfulBadge>
          ) : null}
        </div>
      ),
    },
    {
      key: 'booked', header: 'จองแล้ว', sortable: false,
      render: (r) => <span style={TEXT_CELL}>{r.booked}</span>,
    },
    {
      key: 'remaining', header: 'คงเหลือ', sortable: false,
      render: (r) => <span style={TEXT_CELL}>{r.remaining}</span>,
    },
    {
      key: 'status', header: 'สถานะรับนัด', sortable: false,
      render: (r) => (
        <StatusBadge style={r.style} size='small' showDot>
          {r.status === AVAILABILITY.AVAILABLE ? 'Available' : 'Non-available'}
        </StatusBadge>
      ),
    },
    {
      key: 'reason', header: 'เหตุผล', flex: true, minWidth: 220, sortable: false,
      render: (r) => (
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-050, 2px)' }}>
          <span style={TEXT_CELL}>{r.reason}</span>
          {r.override?.reason ? <span style={HINT}>บันทึก: {r.override.reason} · {r.override.actor}</span> : null}
        </div>
      ),
    },
    {
      key: 'actions', header: 'การดำเนินการ', sortable: false,
      render: (r) => (
        <div className='flex items-center' style={{ gap: 'var(--dim-space-150, 6px)' }}>
          <BrandSubdueButton
            variant='outline'
            size='sm'
            leadingIcon='edit'
            disabled={!canConfigure}
            onClick={() => {
              setQuotaDate(parseDateKey(r.key));
              setQuotaValue(String(r.quota));
              setQuotaReason(r.override?.reason || '');
              setQuotaError('');
            }}
          >
            แก้ไขโควตา
          </BrandSubdueButton>
          {r.override ? (
            <NeutralSubdueButton
              variant='outline'
              size='sm'
              leadingIcon='undo'
              disabled={!canConfigure}
              onClick={() => { removeCapacityOverride(r.key, { actor }); flash('คืนค่าโควตาตามรูปแบบตารางแล้ว'); }}
            >
              คืนค่า
            </NeutralSubdueButton>
          ) : null}
        </div>
      ),
    },
  ];

  const auditColumns = [
    { key: 'at', header: 'เวลาที่บันทึก', sortable: false, render: (r) => <span style={{ ...TEXT_CELL, whiteSpace: 'nowrap' }}>{r.at}</span> },
    {
      key: 'kind', header: 'ประเภท', sortable: false,
      render: (r) => (
        <ColorfulBadge style={r.kind === 'ปฏิเสธคำขอนัด' ? 'orange' : r.kind === 'ไม่มาตามนัด' ? 'yellow' : 'red'} size='small' hierarchy='secondary' width='hug'>
          {r.kind || 'ยกเลิกนัด'}
        </ColorfulBadge>
      ),
    },
    { key: 'patient', header: 'ผู้รับบริการ', sortable: false, render: (r) => <span className='truncate' style={TEXT_CELL}>{r.patient} · {r.hn}</span> },
    { key: 'slot', header: 'วัน-เวลานัด', sortable: false, render: (r) => <span style={TEXT_CELL}>{r.date ? formatApptListDate(r.date) : '—'} {r.time}</span> },
    { key: 'reason', header: 'สาเหตุ', flex: true, minWidth: 220, sortable: false, render: (r) => (
      <div className='flex flex-col' style={{ gap: 'var(--dim-space-050, 2px)' }}>
        <span style={TEXT_CELL}>{r.reason}</span>
        {r.note ? <span style={HINT}>{r.note}</span> : null}
      </div>
    ) },
    { key: 'actor', header: 'ผู้ดำเนินการ (อัตโนมัติ)', sortable: false, render: (r) => <span className='truncate' style={TEXT_CELL}>{r.actor}</span> },
    { key: 'ref', header: 'อ้างอิง', sortable: false, render: (r) => <span className='truncate' style={TEXT_CELL}>{r.appointmentId}</span> },
  ];

  const facility = getFacilityHolidays();

  const summaryCards = [
    { key: 'holidays', label: 'วันหยุดสถานพยาบาล', value: facility.length, indicator: 'TOR 1.6.4.1', color: 'info', icon: 'beach_access' },
    { key: 'overrides', label: 'วันที่ปรับโควตาเอง', value: capacityRows.filter((r) => r.override).length, indicator: 'TOR 1.6.1.2', color: 'inprogress', icon: 'event_seat' },
    { key: 'available', label: 'วันเปิดรับนัด (30 วัน)', value: capacityRows.filter((r) => r.status === AVAILABILITY.AVAILABLE).length, indicator: 'Available', color: 'positive', icon: 'event_available' },
    { key: 'cancel', label: 'ประวัติการยกเลิก', value: cancelAudit.length, indicator: 'TOR 1.6.2.7', color: 'destructive', icon: 'history' },
  ];

  return (
    <>
      <QueuePageShell
        activeKey='appoint'
        breadcrumb={breadcrumb}
        title='ตั้งค่าระบบนัดหมาย'
        onBack={() => history.push('/appointment')}
        summaryCards={summaryCards}
        tabs={TABS}
        activeTab={tab}
        onTabChange={setTab}
        actions={(
          <div className='flex items-center' style={{ gap: 'var(--dim-space-300, 12px)' }}>
            <NeutralSubdueButton size='lg' variant='outline' leadingIcon='style' onClick={() => history.push('/appointment/types')}>
              รูปแบบการนัดหมาย
            </NeutralSubdueButton>
            <BrandButton variant='fill' size='lg' leadingIcon='calendar_month' onClick={() => history.push('/appointment')}>
              ไปยังตารางนัดหมาย
            </BrandButton>
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
          {!canConfigure ? (
            <StatusBadge style='neutral' size='default' icon='lock'>
              บทบาท “{role.label}” แก้ไขการตั้งค่าไม่ได้ — {NO_PERMISSION_TOOLTIP} (เปลี่ยนได้ที่แท็บ บทบาทผู้ใช้งาน)
            </StatusBadge>
          ) : null}

          {/* ── 1. รูปแบบตาราง Resource + วันหยุด (panel เดิม) ────── */}
          {tab === 'resource' ? (
            <section className='flex flex-col w-full' style={CARD}>
              <span style={TITLE}>รูปแบบตาราง Resource · วันหยุด · ค้นหา Slot ว่างเร็วสุด</span>
              <span style={HINT}>
                แผงนี้คือ AppointmentSettingsPanel เดิมของโมดูล (TOR 1.6.1.3 / 1.6.1.5 / 1.6.1.6 /
                1.6.2.1 / 1.6.4.1 / 1.6.4.2) ซึ่งก่อนหน้านี้ไม่มีหน้าจอใดเรียกใช้ — ตอนนี้เข้าถึงได้จริงที่
                /appointment/settings
              </span>
              <AppointmentSettingsPanel
                appointments={appointments}
                onBookEarliest={(hit) => flash(`พบ Slot ว่าง ${formatApptListDate(hit.date)} ${hit.time} น. · ${hit.staff.name}`)}
              />
            </section>
          ) : null}

          {/* ── 2. โควตาคิวรายวัน (1.6.1.2) ───────────────────────── */}
          {tab === 'capacity' ? (
            <>
              <section className='flex flex-col w-full' style={CARD}>
                <span style={TITLE}>ปรับจำนวนคิวที่รับได้เฉพาะวัน (TOR 1.6.1.2)</span>
                <span style={HINT}>
                  ค่าที่ตั้งจะทับโควตาที่คำนวณจากรูปแบบตาราง Resource เฉพาะวันนั้น ·
                  โควตาใหม่ต้องไม่น้อยกว่าจำนวนที่จองไปแล้ว · ตั้ง 0 = ปิดรับนัดวันนั้น
                </span>
                <FieldGrid cols={3} columnGap='var(--dim-space-400)' rowGap='var(--dim-space-300)'>
                  <Field label='วันที่' required>
                    <DatePicker
                      size='md'
                      value={quotaDate}
                      format={formatThaiBuddhistDate}
                      onChange={(d) => { setQuotaDate(d); setQuotaError(''); }}
                      placeholder='เลือกวันที่'
                      showLabel={false}
                      showHelperText={false}
                      disabled={!canConfigure}
                    />
                  </Field>
                  <Field label={`จำนวนคิวที่รับได้ (จองแล้ว ${quotaBooked})`} required>
                    <InputField
                      type='number'
                      size='md'
                      value={quotaValue}
                      onChange={(e) => { setQuotaValue(e.target.value); setQuotaError(''); }}
                      placeholder='เช่น 30'
                      showLabel={false}
                      showHelperText={false}
                      disabled={!canConfigure}
                      error={quotaError || undefined}
                    />
                  </Field>
                  <Field label='เหตุผลการปรับ (บันทึกลง audit)'>
                    <InputField
                      size='md'
                      value={quotaReason}
                      onChange={(e) => setQuotaReason(e.target.value)}
                      placeholder='เช่น แพทย์ประชุมช่วงบ่าย'
                      showLabel={false}
                      showHelperText={false}
                      disabled={!canConfigure}
                    />
                  </Field>
                </FieldGrid>
                {quotaError ? (
                  <span className='flex items-center' style={{ ...HINT, gap: 'var(--dim-space-100, 4px)', color: 'var(--text-alert-error)' }}>
                    <Sym name='error' size={16} color='var(--icon-alertdialog-destructive)' />
                    {quotaError}
                  </span>
                ) : null}
                <div className='flex items-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                  <span title={canConfigure ? 'บันทึกโควตาวันนี้' : NO_PERMISSION_TOOLTIP}>
                    <BrandButton variant='fill' size='md' leadingIcon='save' disabled={!canConfigure} onClick={() => applyQuota(false)}>
                      บันทึกโควตา
                    </BrandButton>
                  </span>
                  <NeutralSubdueButton
                    size='md'
                    variant='outline'
                    onClick={() => { setQuotaDate(null); setQuotaValue(''); setQuotaReason(''); setQuotaError(''); }}
                  >
                    ยกเลิก
                  </NeutralSubdueButton>
                </div>
              </section>

              <section className='flex flex-col w-full' style={CARD}>
                <span style={TITLE}>ความจุคิวและสถานะรับนัด {CAPACITY_DAYS} วันข้างหน้า</span>
                <Table
                  columns={capacityColumns}
                  rows={capacityRows}
                  rowKey={(r) => r.key}
                  emptyMessage='ไม่มีข้อมูลความจุคิว'
                  style={{ maxHeight: 560, overflow: 'auto' }}
                />
              </section>
            </>
          ) : null}

          {/* ── 3. วันหยุด + ผลกระทบ (1.6.4.1) ───────────────────── */}
          {tab === 'holiday' ? (
            <section className='flex flex-col w-full' style={CARD}>
              <span style={TITLE}>ประกาศวันหยุดสถานพยาบาล พร้อมตรวจผลกระทบต่อนัดที่มีอยู่</span>
              <span style={HINT}>
                ก่อนบันทึก ระบบจะบอกจำนวนนัดที่ได้รับผลกระทบ และให้เลือกส่งข้อความแจ้งเตือนผู้รับบริการทุกคนของวันนั้น
              </span>
              <FieldGrid cols={2} columnGap='var(--dim-space-400)' rowGap='var(--dim-space-300)'>
                <Field label='วันที่' required>
                  <DatePicker
                    size='md'
                    value={holidayDate}
                    format={formatThaiBuddhistDate}
                    onChange={setHolidayDate}
                    placeholder='เลือกวันที่'
                    showLabel={false}
                    showHelperText={false}
                    disabled={!canConfigure}
                  />
                </Field>
                <Field label='ชื่อวันหยุด'>
                  <InputField
                    size='md'
                    value={holidayName}
                    onChange={(e) => setHolidayName(e.target.value)}
                    placeholder='เช่น วันหยุดชดเชย'
                    showLabel={false}
                    showHelperText={false}
                    disabled={!canConfigure}
                  />
                </Field>
              </FieldGrid>

              {holidayKey ? (
                <div
                  className='flex flex-col'
                  style={{
                    gap: 'var(--dim-space-200, 8px)',
                    paddingTop: 'var(--dim-space-300, 12px)',
                    paddingBottom: 'var(--dim-space-300, 12px)',
                    paddingLeft: 'var(--dim-space-300, 12px)',
                    paddingRight: 'var(--dim-space-300, 12px)',
                    borderRadius: 'var(--dim-radius-300, 10px)',
                    background: impacted.length ? 'var(--surface-alert-warning)' : 'var(--surface-alert-success)',
                  }}
                >
                  <span style={{ ...TEXT_CELL, color: impacted.length ? 'var(--text-alert-warning)' : 'var(--text-alert-success)' }}>
                    {impacted.length
                      ? `วันที่ ${formatApptListDate(holidayKey)} มีนัดที่ได้รับผลกระทบ ${impacted.length} รายการ`
                      : `วันที่ ${formatApptListDate(holidayKey)} ยังไม่มีนัดหมาย — ประกาศวันหยุดได้ทันที`}
                  </span>
                  {impacted.length ? (
                    <span style={HINT}>
                      {impacted.slice(0, 5).map((a) => `${a.time} ${a.patient}`).join(' · ')}
                      {impacted.length > 5 ? ` และอีก ${impacted.length - 5} รายการ` : ''}
                    </span>
                  ) : null}
                </div>
              ) : null}

              <div className='flex items-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                <span title={canConfigure ? 'บันทึกวันหยุด' : NO_PERMISSION_TOOLTIP}>
                  <BrandButton
                    variant='fill'
                    size='md'
                    leadingIcon='add'
                    disabled={!canConfigure || !holidayKey}
                    onClick={() => {
                      if (!impacted.length) { commitHoliday(false); return; }
                      setHolidayNotify(true);
                      setHolidayConfirm(holidayKey);
                    }}
                  >
                    บันทึกวันหยุด
                  </BrandButton>
                </span>
                <NeutralSubdueButton size='md' variant='outline' onClick={() => { setHolidayDate(null); setHolidayName(''); }}>
                  ยกเลิก
                </NeutralSubdueButton>
              </div>

              <span style={TITLE}>วันหยุดที่ประกาศไว้</span>
              {facility.length === 0 ? (
                <span style={HINT}>ยังไม่มีวันหยุดสถานพยาบาลในระบบ</span>
              ) : (
                <div className='flex flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                  {facility.map((h) => (
                    <ColorfulBadge key={h.date} style='yellow' size='small' hierarchy='secondary' width='hug'>
                      {formatApptListDate(h.date)} · {h.name}
                    </ColorfulBadge>
                  ))}
                </div>
              )}
            </section>
          ) : null}

          {/* ── 4. ยกเลิกตารางทั้งวัน (1.6.1.6) ──────────────────── */}
          {tab === 'cancelday' ? (
            <section className='flex flex-col w-full' style={CARD}>
              <span style={TITLE}>ยกเลิกตารางออกตรวจทั้งวัน (TOR 1.6.1.6)</span>
              <span style={HINT}>
                ยกเลิกได้ต่อเมื่อไม่มีนัด Active คงเหลือในวันนั้น — ถ้ายังมี ต้องยกเลิก/เลื่อนนัดให้หมดก่อน
              </span>
              <FieldGrid cols={2} columnGap='var(--dim-space-400)' rowGap='var(--dim-space-300)'>
                <Field label='แพทย์ / Resource' required>
                  <Select
                    options={STAFF.map((s) => ({ value: String(s.id), label: `${s.name} · ${s.dept}` }))}
                    value={String(cancelStaffId)}
                    onChange={(v) => setCancelStaffId(Number(v))}
                    size='md'
                    showLabel={false}
                    showHelperText={false}
                    disabled={!canConfigure}
                  />
                </Field>
                <Field label='วันที่' required>
                  <DatePicker
                    size='md'
                    value={cancelDate}
                    format={formatThaiBuddhistDate}
                    onChange={setCancelDate}
                    placeholder='เลือกวันที่'
                    showLabel={false}
                    showHelperText={false}
                    disabled={!canConfigure}
                  />
                </Field>
              </FieldGrid>

              {cancelKey ? (
                cancelCheck.ok ? (
                  <StatusBadge style='success' size='default' icon='check_circle'>
                    ไม่มีนัด Active ในวันนี้ — ยกเลิกตารางได้
                  </StatusBadge>
                ) : (
                  <div className='flex flex-col' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                    <StatusBadge style='error' size='default' icon='block'>
                      มีนัดหมาย Active คงเหลือ {cancelCheck.activeCount} รายการ — ต้องยกเลิก/เลื่อนให้หมดก่อน
                    </StatusBadge>
                    <ul className='flex flex-col m-0 p-0 list-none' style={{ gap: 'var(--dim-space-100, 4px)' }}>
                      {(cancelCheck.active || []).slice(0, 8).map((a) => (
                        <li key={a.id} style={HINT}>
                          {a.time} น. · {a.patient} (HN {a.hn}) · {a.clinic || a.dept}
                        </li>
                      ))}
                    </ul>
                    <BrandSubdueButton
                      variant='outline'
                      size='sm'
                      leadingIcon='open_in_new'
                      onClick={() => history.push('/appointment')}
                    >
                      ไปจัดการนัดของวันนี้
                    </BrandSubdueButton>
                  </div>
                )
              ) : null}

              <div className='flex items-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                <span title={cancelCheck.ok ? 'ยกเลิกตารางวันนี้' : 'ยังยกเลิกไม่ได้ — มีนัด Active คงเหลือ'}>
                  <DangerSubdueButton
                    variant='outline'
                    size='md'
                    leadingIcon='event_busy'
                    disabled={!canConfigure || !cancelCheck.ok}
                    onClick={doCancelDay}
                  >
                    ยกเลิกตารางทั้งวัน
                  </DangerSubdueButton>
                </span>
                <NeutralSubdueButton size='md' variant='outline' onClick={() => setCancelDate(null)}>
                  ยกเลิก
                </NeutralSubdueButton>
              </div>
            </section>
          ) : null}

          {/* ── 5. ประวัติการยกเลิกนัด (1.6.2.7) ─────────────────── */}
          {tab === 'audit' ? (
            <>
              <section className='flex flex-col w-full' style={CARD}>
                <div className='flex flex-wrap items-center justify-between' style={{ gap: 'var(--dim-space-300, 12px)' }}>
                  <div className='flex flex-col' style={{ gap: 'var(--dim-space-050, 2px)' }}>
                    <span style={TITLE}>ประวัติการยกเลิก / ปฏิเสธ / ไม่มาตามนัด (TOR 1.6.2.7)</span>
                    <span style={HINT}>ผู้ดำเนินการถูกบันทึกอัตโนมัติจากผู้ใช้งานที่ล็อกอิน — แก้ไขเองไม่ได้</span>
                  </div>
                  <NeutralSubdueButton size='sm' variant='outline' leadingIcon='print' onClick={printAudit}>
                    พิมพ์ / ส่งออก
                  </NeutralSubdueButton>
                </div>

                <div className='w-full flex items-start justify-center'>
                  <PrimarySearch
                    value={auditSearch}
                    onChange={(v) => { setAuditSearch(v); setAuditPage(1); }}
                    onSubmit={(v) => { setAuditSearch(v); setAuditPage(1); }}
                    placeholder='ค้นหา HN / ชื่อผู้รับบริการ / สาเหตุ / ผู้ดำเนินการ'
                    width={560}
                  />
                </div>

                <div className='flex flex-wrap items-end' style={{ gap: 'var(--dim-space-300, 12px)' }}>
                  <Field label='วันที่นัด — ตั้งแต่'>
                    <DatePicker
                      size='md'
                      value={auditRange?.start || null}
                      format={formatThaiBuddhistDate}
                      onChange={(d) => { setAuditRange((prev) => ({ ...(prev || {}), start: d })); setAuditPage(1); }}
                      placeholder='เลือกวันเริ่มต้น'
                      showLabel={false}
                      showHelperText={false}
                    />
                  </Field>
                  <Field label='ถึงวันที่'>
                    <DatePicker
                      size='md'
                      value={auditRange?.end || null}
                      format={formatThaiBuddhistDate}
                      onChange={(d) => { setAuditRange((prev) => ({ ...(prev || {}), end: d })); setAuditPage(1); }}
                      placeholder='เลือกวันสิ้นสุด'
                      minDate={auditRange?.start || undefined}
                      showLabel={false}
                      showHelperText={false}
                    />
                  </Field>
                  {auditHasFilter ? (
                    <NeutralSubdueButton
                      size='sm'
                      variant='outline'
                      leadingIcon='filter_alt_off'
                      onClick={() => { setAuditSearch(''); setAuditRange(null); setAuditPage(1); }}
                    >
                      ล้างตัวกรอง
                    </NeutralSubdueButton>
                  ) : null}
                </div>

                <Table
                  columns={auditColumns}
                  rows={auditRows}
                  rowKey={(r) => r.id}
                  emptyMessage={auditHasFilter
                    ? 'ยังไม่มีการยกเลิกนัดในช่วงที่เลือก'
                    : 'ยังไม่มีการยกเลิกนัดในระบบ'}
                  emptySubtext={auditHasFilter
                    ? 'ลองล้างตัวกรองช่วงวันที่แล้วดูใหม่อีกครั้ง'
                    : 'เมื่อยกเลิก / ปฏิเสธคำขอ / บันทึกไม่มาตามนัด ระบบจะบันทึกเหตุผลและผู้ดำเนินการไว้ที่นี่'}
                  style={{ maxHeight: 520, overflow: 'auto' }}
                />

                <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-600, 24px)' }}>
                  <span style={{ flex: 1, ...TEXT_CELL, color: 'var(--text-content-secondary)' }}>
                    แสดง {auditFiltered.length === 0 ? 0 : (auditSafePage - 1) * AUDIT_PAGE_SIZE + 1}-
                    {Math.min(auditSafePage * AUDIT_PAGE_SIZE, auditFiltered.length)} จาก {auditFiltered.length} รายการ
                  </span>
                  <Pagination currentPage={auditSafePage} pageCount={auditTotalPages} onPageChange={setAuditPage} />
                </div>
              </section>

              <section className='flex flex-col w-full' style={CARD}>
                <span style={TITLE}>ประวัติการเปลี่ยนแปลงการตั้งค่า (ก่อน → หลัง)</span>
                {settingsAudit.length === 0 ? (
                  <span style={HINT}>ยังไม่มีการเปลี่ยนแปลงการตั้งค่าในเซสชันนี้</span>
                ) : (
                  <ul className='flex flex-col m-0 p-0 list-none' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                    {settingsAudit.slice(0, 20).map((r) => (
                      <li
                        key={r.id}
                        className='flex flex-col'
                        style={{
                          gap: 'var(--dim-space-050, 2px)',
                          paddingTop: 'var(--dim-space-200, 8px)',
                          paddingBottom: 'var(--dim-space-200, 8px)',
                          paddingLeft: 'var(--dim-space-300, 12px)',
                          paddingRight: 'var(--dim-space-300, 12px)',
                          borderRadius: 'var(--dim-radius-200, 8px)',
                          background: 'var(--surface-brandPrimary-quaternary)',
                        }}
                      >
                        <span style={{ ...TEXT_CELL, fontWeight: 'var(--type-weight-medium)' }}>
                          {r.at} · {r.action} — {r.target}
                        </span>
                        <span style={HINT}>
                          {r.before} → {r.after}{r.reason ? ` · เหตุผล: ${r.reason}` : ''} · โดย {r.actor}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          ) : null}

          {/* ── 6. บันทึกการแจ้งเตือน (4.2.5) ────────────────────── */}
          {tab === 'notify' ? (
            <section className='flex flex-col w-full' style={CARD}>
              <span style={TITLE}>บันทึกการแจ้งเตือนกลับผู้รับบริการ (TOR 4.2.5 — ข้อมูลจำลอง)</span>
              <span style={HINT}>
                ทุกการยืนยัน / ปฏิเสธ / เลื่อนนัด / เตือนก่อนวันนัด จะถูกบันทึกเป็นข้อความขาออกที่นี่
                — ยังไม่ได้เชื่อมผู้ให้บริการ Push / LINE / SMS จริง จึงถือว่าข้อกำหนดนี้ยัง “partial”
              </span>
              <AppointmentNotifyLogTable canManage={canConfigure} />
            </section>
          ) : null}

          {/* ── 7. บทบาทผู้ใช้งาน ────────────────────────────────── */}
          {tab === 'role' ? (
            <section className='flex flex-col w-full' style={CARD}>
              <span style={TITLE}>บทบาทผู้ใช้งานระบบนัดหมาย (จำลองสำหรับทดสอบสิทธิ)</span>
              <span style={HINT}>
                ใช้ตรวจเคส “สิทธิไม่พอ”: บทบาทดูอย่างเดียวจะเห็นทุกตารางและปฏิทิน แต่ปุ่ม ยืนยัน · ปฏิเสธ ·
                เลื่อน · ยกเลิก · บันทึกตั้งค่า จะถูกปิดพร้อมข้อความ “{NO_PERMISSION_TOOLTIP}”
              </span>
              <div className='flex flex-col' style={{ gap: 'var(--dim-space-200, 8px)', maxWidth: 560 }}>
                {APPT_ROLES.map((r) => (
                  <button
                    key={r.value}
                    type='button'
                    onClick={() => { setApptRole(r.value); flash(`เปลี่ยนบทบาทเป็น ${r.label}`); }}
                    className='flex flex-col text-left cursor-pointer'
                    style={{
                      gap: 'var(--dim-space-050, 2px)',
                      paddingTop: 'var(--dim-space-300, 12px)',
                      paddingBottom: 'var(--dim-space-300, 12px)',
                      paddingLeft: 'var(--dim-space-400, 16px)',
                      paddingRight: 'var(--dim-space-400, 16px)',
                      borderRadius: 'var(--dim-radius-300, 10px)',
                      border: `var(--dim-stroke-100, 1px) solid ${
                        role.value === r.value ? 'var(--border-brandPrimary-default)' : 'var(--border-neutral-tertiary)'
                      }`,
                      background: role.value === r.value
                        ? 'var(--surface-brandPrimary-quaternary)'
                        : 'var(--surface-card-100)',
                    }}
                  >
                    <span className='flex items-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                      <span style={{ ...TEXT_CELL, fontWeight: 'var(--type-weight-medium)' }}>{r.label}</span>
                      {role.value === r.value ? (
                        <StatusBadge style='success' size='small'>ใช้งานอยู่</StatusBadge>
                      ) : null}
                    </span>
                    <span style={HINT}>{r.actor} · {r.hint}</span>
                  </button>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </QueuePageShell>

      <AlertDialog
        open={confirmZero}
        type='warning'
        title='ตั้งโควตาเป็น 0 = ปิดรับนัดทั้งวัน'
        description={`วันที่ ${quotaDateKey ? formatApptListDate(quotaDateKey) : ''} จะไม่รับนัดใหม่เลย และแสดงเป็น Non-available ในทุกหน้าจอ`}
        confirmLabel='ยืนยันปิดรับนัด'
        cancelLabel='กลับไปแก้ไข'
        onConfirm={() => applyQuota(true)}
        onClose={() => setConfirmZero(false)}
      />

      {/* ปุ่มที่มองเห็นทั้งสองปุ่มต้องไม่ commit ทั้งคู่ — เดิม "บันทึกอย่างเดียว"
          ก็บันทึกวันหยุด ทำให้ไม่มีทางถอยหลังจากเห็นรายการผลกระทบ (นอกจาก ESC).
          ตัวเลือกแจ้งเตือนย้ายมาเป็น checkbox ในตัว dialog */}
      <AlertDialog
        open={!!holidayConfirm}
        type='warning'
        title='วันหยุดนี้กระทบนัดที่มีอยู่'
        description={`มีนัดหมาย ${impacted.length} รายการในวันที่ ${holidayConfirm ? formatApptListDate(holidayConfirm) : ''} — ยืนยันบันทึกเป็นวันหยุดสถานพยาบาลหรือไม่ ?`}
        confirmLabel='ยืนยันบันทึกวันหยุด'
        cancelLabel='ยกเลิก'
        onConfirm={() => commitHoliday(holidayNotify)}
        onCancel={() => setHolidayConfirm(null)}
        onClose={() => setHolidayConfirm(null)}
      >
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-100, 4px)' }}>
          <Checkbox
            checked={holidayNotify}
            onChange={setHolidayNotify}
            label={`แจ้งเตือนผู้รับบริการทุกคนของวันนั้น (${impacted.length} ราย)`}
          />
          <span style={HINT}>
            ถ้าไม่ติ๊ก ระบบจะบันทึกวันหยุดอย่างเดียวโดยไม่ส่งข้อความออก
          </span>
        </div>
      </AlertDialog>

      <PhcisTopToast session={toast} onDismiss={() => setToast(null)} />
    </>
  );
};

export default AppointmentSettingsPage;
