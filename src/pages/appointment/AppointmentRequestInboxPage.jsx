import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import Table from '@/components/table/Table';
import Pagination from '@/components/pagination/Pagination';
import PrimarySearch from '@/components/search/PrimarySearch';
import SearchResultCount from '@/components/search/SearchResultCount';
import { FilterDropdown } from '@/components/forms/FilterTag';
import FilterDateTag from '@/components/forms/FilterDateTag';
import { computeQuickRange, computeQuickSingle } from '@/components/popup/DateFilterPopup';
import OverflowFlexRow from '@/components/overflow/OverflowFlexRow';
import StatusBadge from '@/components/badge/StatusBadge';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import BrandButton from '@/components/button/BrandButton';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import PhcisTopToast from '@/components/alert/PhcisTopToast';
import AppointmentRequestDecisionPopup from './AppointmentRequestDecisionPopup';
import { evaluateAppointmentConflicts } from './AppointmentConflictPanel';
import {
  REQUEST_STATUS,
  REQUEST_STATUS_PRESENTATION,
  confirmRequest,
  getAppointmentRequests,
  getRequestById,
  getRequestCounts,
  isRequestOverdue,
  isRequestReadOnly,
  proposeNewSlot,
  rejectRequest,
  resetAppointmentRequests,
  subscribeApptRequests,
} from './appointmentRequestStore';
import { pushNotify } from './appointmentNotifyStore';
import { appendCancelAudit } from './appointmentSettingsStore';
import {
  addExtraAppointments,
  subscribeExtraAppointments,
  updateExtraAppointment,
  withExtraAppointments,
} from './appointmentExtraStore';
import { REQUEST_CHANNELS, getChannelMeta } from './appointmentHcisMasters';
import {
  APPT_STATUS_CONFIRMED,
  ANY_DOCTOR_VALUE,
  INITIAL_APPOINTMENTS,
  STAFF,
  findEarliestFreeSlot,
  formatApptListDate,
  isoKey,
  parseDateKey,
} from './appointmentShared';
import {
  NO_PERMISSION_TOOLTIP,
  canManageAppointments,
  getApptActor,
  subscribeApptRole,
} from './appointmentPermissions';

/* TOR 1.6.2.1 · 1.6.2.3 · 1.6.2.6 · 1.6.2.7 · 1.6.2.8 · 1.4.12.1 · 4.2.5 · 4.2.6.4
   หน้า "รับนัดหมาย" — worklist ของคำขอนัดจาก Mobile App / LINE / โทรศัพท์ /
   เคาน์เตอร์ / คำสั่งนัดต่อเนื่องจากการรักษา. */

const breadcrumb = ['ระบบนัดหมาย', 'รับนัดหมาย'];
const PAGE_SIZE = 12;

const TEXT_CELL = {
  color: 'var(--text-neutral-default)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm, 14px)',
  lineHeight: 1.5,
};

const TAB_DEFS = [
  { key: 'pending', label: 'รอตรวจสอบ', icon: 'hourglass_top' },
  { key: 'proposed', label: 'เสนอเวลาใหม่', icon: 'event_repeat' },
  { key: 'confirmed', label: 'ยืนยันแล้ว', icon: 'event_available' },
  { key: 'rejected', label: 'ปฏิเสธ', icon: 'event_busy' },
  { key: 'all', label: 'คำขอทั้งหมด', icon: 'inbox' },
];

const CHANNEL_FILTER = [
  { value: '', label: 'ทุกช่องทาง' },
  ...REQUEST_CHANNELS.map((c) => ({ value: c.value, label: c.label })),
];

const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const endOfDay = (d) => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; };

function resolveDateBounds(dateValue) {
  if (!dateValue?.quick || dateValue.quick === 'all') return null;
  const today = startOfDay(new Date());
  if (dateValue.quick === 'custom') {
    if (dateValue.tab === 'single' && dateValue.single) {
      return { start: startOfDay(dateValue.single), end: endOfDay(dateValue.single) };
    }
    if (dateValue.tab === 'range' && dateValue.range?.start && dateValue.range?.end) {
      return { start: startOfDay(dateValue.range.start), end: endOfDay(dateValue.range.end) };
    }
    return null;
  }
  const single = computeQuickSingle(dateValue.quick, today);
  if (single) return { start: startOfDay(single), end: endOfDay(single) };
  const range = computeQuickRange(dateValue.quick, today);
  if (range?.start && range?.end) return { start: startOfDay(range.start), end: endOfDay(range.end) };
  return null;
}

const AppointmentRequestInboxPage = () => {
  const history = useHistory();
  const [tick, setTick] = useState(0);
  const bump = useCallback(() => setTick((n) => n + 1), []);
  useEffect(() => subscribeApptRequests(bump), [bump]);
  useEffect(() => subscribeExtraAppointments(bump), [bump]);
  useEffect(() => subscribeApptRole(bump), [bump]);

  const [tab, setTab] = useState('pending');
  const [search, setSearch] = useState('');
  const [channel, setChannel] = useState('');
  const [clinic, setClinic] = useState('');
  const [dateValue, setDateValue] = useState({ quick: 'all' });
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState(null);
  const [toast, setToast] = useState(null);

  const canManage = canManageAppointments();
  const actor = getApptActor();

  const requests = getAppointmentRequests();
  const counts = getRequestCounts();
  /* `tick` re-merges the extra rows created by this page (React 17 subscribe pattern). */
  const appointments = useMemo(() => withExtraAppointments(INITIAL_APPOINTMENTS), [tick]);

  const flash = useCallback((message, variant = 'success') => {
    setToast({ id: Date.now(), variant, message });
  }, []);

  const clinicOptions = useMemo(() => {
    const set = new Set(requests.map((r) => r.clinic).filter(Boolean));
    return [{ value: '', label: 'ทุกคลินิก' }, ...[...set].map((c) => ({ value: c, label: c }))];
  }, [requests]);

  const dateBounds = useMemo(() => resolveDateBounds(dateValue), [dateValue]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return requests.filter((r) => {
      if (tab !== 'all' && r.status !== tab) {
        /* "รอตรวจสอบ" also surfaces requests the citizen has since withdrawn so
           staff see why the row disappeared from their queue. */
        if (!(tab === 'pending' && r.status === REQUEST_STATUS.PATIENT_CANCELLED)) return false;
      }
      if (channel && r.channel !== channel) return false;
      if (clinic && r.clinic !== clinic) return false;
      if (dateBounds) {
        const d = parseDateKey(r.requestedDate);
        if (d < dateBounds.start || d > dateBounds.end) return false;
      }
      if (!q) return true;
      return [r.hn, r.patient, r.doctor, r.clinic, r.symptom, r.id]
        .some((f) => String(f || '').toLowerCase().includes(q));
    });
  }, [requests, tab, channel, clinic, dateBounds, search]);

  const hasFilter = !!(search || channel || clinic || (dateValue.quick && dateValue.quick !== 'all'));
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const clearFilters = () => {
    setSearch(''); setChannel(''); setClinic(''); setDateValue({ quick: 'all' }); setPage(1);
  };

  const summaryCards = [
    { key: 'pending', label: 'รอตรวจสอบ', value: counts.pending || 0, indicator: 'ต้องตอบกลับ', color: 'inprogress', icon: 'hourglass_top' },
    { key: 'overdue', label: 'เกินกำหนดตอบกลับ', value: counts.overdue || 0, indicator: 'เกิน 24 ชม.', color: 'destructive', icon: 'schedule' },
    { key: 'confirmed', label: 'ยืนยันแล้ว', value: counts.confirmed || 0, indicator: 'สร้างนัดจริงแล้ว', color: 'positive', icon: 'event_available' },
    { key: 'proposed', label: 'เสนอเวลาใหม่', value: counts.proposed || 0, indicator: 'รอผู้รับบริการยืนยัน', color: 'info', icon: 'event_repeat' },
    { key: 'rejected', label: 'ปฏิเสธ', value: counts.rejected || 0, indicator: 'พร้อมเหตุผล', color: 'destructive', icon: 'event_busy' },
    { key: 'cancelled', label: 'ผู้รับบริการยกเลิกเอง', value: counts.patient_cancelled || 0, indicator: 'จาก Mobile App', color: 'neutral', icon: 'block' },
  ];

  const tabs = TAB_DEFS.map((t) => ({
    ...t,
    count: t.key === 'all' ? counts.all : (counts[t.key] || 0),
  }));

  /* ต้อง memoise — `getRequestById` คืน object ใหม่ทุกครั้ง ถ้าส่งตรงเข้า popup
     ทุก re-render ของหน้านี้ (เช่น toast เปิด/ปิด) จะทำให้ effect รีเซ็ตฟอร์ม
     ตัดสินใจในป๊อปอัปทำงานใหม่และล้างสิ่งที่เจ้าหน้าที่กรอกไปแล้ว. */
  const openRequest = useMemo(() => getRequestById(openId), [openId, tick]);

  /* ── การตัดสินใจ ─────────────────────────────────────────────── */

  const handleConfirm = ({ request, doctor, staffId, date, time, slotRange, note }) => {
    /* ตรวจซ้ำ ณ เวลากด — คำขอสองใบที่ขอ slot เดียวกันต้องถูกจับได้ที่นี่ */
    const live = withExtraAppointments(INITIAL_APPOINTMENTS);
    const recheck = evaluateAppointmentConflicts({
      date, time, staffId, doctor: doctor || ANY_DOCTOR_VALUE, clinic: request.clinic, appointments: live,
    });
    if (recheck.blocking) {
      flash(`ยืนยันไม่สำเร็จ — ${recheck.issues[0]?.title || 'ทรัพยากรถูกจองไปแล้ว'}`, 'error');
      bump();
      return;
    }
    /* คำขอที่เคยยืนยันแล้วต้อง "แก้ไขนัดเดิม" ไม่ใช่ append ซ้ำ — ไม่งั้นได้สอง
       แถวที่ใช้ id เดียวกัน (React key ซ้ำ + updateExtraAppointment แก้แถวแรก
       เสมอ) และนัดใบแรกกลายเป็นนัดกำพร้า. */
    const existingId = request.appointmentId || null;
    const apptId = existingId || `A-${request.id}`;
    const row = {
      id: apptId,
      staffId: staffId ?? null,
      date,
      time,
      slotRange,
      status: APPT_STATUS_CONFIRMED,
      patient: request.patient,
      patientAvatar: request.patientAvatar,
      hn: request.hn,
      rights: request.rights,
      clinic: request.clinic,
      dept: request.clinic,
      type: 'พบแพทย์',
      doctor: doctor || ANY_DOCTOR_VALUE,
      examMode: 'onsite',
      orderingUnit: 'รับนัดหมายจากคำขอผู้รับบริการ',
      reason: request.symptom,
      prep: '',
      requestId: request.id,
      createdBy: actor,
    };
    const patched = existingId ? updateExtraAppointment(existingId, row) : null;
    if (!patched) addExtraAppointments([row]);
    confirmRequest(request.id, { actor, appointmentId: apptId, doctor, staffId, date, time, slotRange, note });
    pushNotify({
      channel: request.channel === 'line' ? 'line' : 'push',
      kind: 'confirm',
      hn: request.hn,
      patient: request.patient,
      title: 'ยืนยันนัดหมายเรียบร้อย',
      body: `${formatApptListDate(date)} เวลา ${time} น. · ${request.clinic}${doctor ? ` · ${doctor}` : ''}`,
      requestId: request.id,
      appointmentId: apptId,
      actor,
    });
    setOpenId(null);
    flash(existingId
      ? `แก้ไขนัดหมาย ${apptId} ของคำขอนี้แล้ว — ส่งข้อความแจ้งกลับผู้รับบริการอีกครั้ง`
      : 'ยืนยันคำขอและสร้างนัดหมายสำเร็จ — ส่งข้อความแจ้งกลับผู้รับบริการแล้ว');
  };

  const handleReject = ({ request, reasonCode, reasonLabel, note }) => {
    rejectRequest(request.id, { actor, reasonCode, reasonLabel, note });
    appendCancelAudit({
      actor,
      kind: 'ปฏิเสธคำขอนัด',
      appointmentId: request.id,
      patient: request.patient,
      hn: request.hn,
      reason: reasonLabel,
      note,
      date: request.requestedDate,
      time: request.requestedTime,
    });
    pushNotify({
      channel: request.channel === 'line' ? 'line' : 'push',
      kind: 'reject',
      hn: request.hn,
      patient: request.patient,
      title: 'คำขอนัดหมายไม่ได้รับการอนุมัติ',
      body: `${reasonLabel}${note ? ` — ${note}` : ''}`,
      requestId: request.id,
      actor,
    });
    setOpenId(null);
    flash('บันทึกการปฏิเสธคำขอและแจ้งกลับผู้รับบริการแล้ว');
  };

  const handlePropose = ({ request, doctor, staffId, date, time, note }) => {
    proposeNewSlot(request.id, { actor, proposedDate: date, proposedTime: time, doctor, staffId, note });
    pushNotify({
      channel: request.channel === 'line' ? 'line' : 'push',
      kind: 'propose',
      hn: request.hn,
      patient: request.patient,
      title: 'เจ้าหน้าที่เสนอวัน-เวลาใหม่',
      body: `${formatApptListDate(date)} เวลา ${time} น.${note ? ` — ${note}` : ''}`,
      requestId: request.id,
      actor,
    });
    setOpenId(null);
    flash('ส่งข้อเสนอวัน-เวลาใหม่ให้ผู้รับบริการแล้ว');
  };

  /* คืนค่า `hit` กลับให้ป๊อปอัปเติมแพทย์/วันที่/Slot ให้เอง — ถ้าแค่ flash toast
     เจ้าหน้าที่ต้องกรอกซ้ำเองทั้งหมด (ปุ่มนี้คือหลักฐานของ TOR 1.6.2.1). */
  const handleFindEarliest = (request) => {
    const hit = findEarliestFreeSlot({
      staffList: STAFF,
      appointments: withExtraAppointments(INITIAL_APPOINTMENTS),
      resourceType: 'all',
      fromDate: isoKey(new Date()),
      days: 21,
    });
    if (!hit) {
      flash('ไม่พบ Slot ว่างในช่วง 21 วันข้างหน้า — ลองปรับโควตาหรือรูปแบบตาราง Resource', 'error');
      return null;
    }
    flash(`เติม Slot ว่างเร็วที่สุดให้แล้ว: ${formatApptListDate(hit.date)} ${hit.time} น. · ${hit.staff.name}${hit.queueNo != null ? ` · คิว ${hit.queueNo}` : ''}`);
    return hit;
  };

  const columns = [
    {
      key: 'submittedAt', header: 'เวลาที่ยื่นคำขอ', sortable: false,
      render: (r) => (
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-050, 2px)' }}>
          <span style={{ ...TEXT_CELL, whiteSpace: 'nowrap' }}>{r.submittedAt}</span>
          {isRequestOverdue(r) ? (
            <StatusBadge style='warning' size='small'>เกินกำหนดตอบกลับ</StatusBadge>
          ) : null}
        </div>
      ),
    },
    {
      key: 'channel', header: 'ช่องทาง', sortable: false,
      render: (r) => {
        const meta = getChannelMeta(r.channel);
        return (
          <ColorfulBadge style={meta.style} size='small' hierarchy='secondary' width='hug'>
            {meta.label}
          </ColorfulBadge>
        );
      },
    },
    {
      key: 'hn', header: 'HN', sortable: false,
      render: (r) => <span style={TEXT_CELL}>{r.hn}</span>,
    },
    {
      key: 'patient', header: 'ชื่อ-สกุล', sortable: false,
      render: (r) => (
        <span className='truncate' style={{ ...TEXT_CELL, fontWeight: 'var(--type-weight-medium)' }}>{r.patient}</span>
      ),
    },
    {
      key: 'rights', header: 'สิทธิการรักษา', sortable: false,
      render: (r) => (
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-050, 2px)' }}>
          <span className='truncate' style={TEXT_CELL}>{r.rights}</span>
          {r.rightsExpiry ? (
            <StatusBadge style='warning' size='small'>สิทธิหมดอายุ {formatApptListDate(r.rightsExpiry)}</StatusBadge>
          ) : null}
        </div>
      ),
    },
    {
      key: 'clinic', header: 'คลินิกที่ขอ', sortable: false,
      render: (r) => <span className='truncate' style={TEXT_CELL}>{r.clinic}</span>,
    },
    {
      key: 'doctor', header: 'แพทย์ที่ขอ', sortable: false,
      render: (r) => (
        r.doctor ? <span className='truncate' style={TEXT_CELL}>{r.doctor}</span>
          : <ColorfulBadge style='orange' size='small' hierarchy='secondary' width='hug'>ไม่ระบุแพทย์</ColorfulBadge>
      ),
    },
    {
      key: 'requestedDate', header: 'วัน-เวลาที่ขอ', sortable: false,
      render: (r) => (
        <span style={TEXT_CELL}>{formatApptListDate(r.requestedDate)} · {r.requestedTime} น.</span>
      ),
    },
    {
      key: 'symptom', header: 'อาการเบื้องต้น', flex: true, minWidth: 220, sortable: false,
      render: (r) => <span className='truncate' style={TEXT_CELL}>{r.symptom || '—'}</span>,
    },
    {
      key: 'status', header: 'สถานะคำขอ', sortable: false,
      render: (r) => {
        const p = REQUEST_STATUS_PRESENTATION[r.status] || REQUEST_STATUS_PRESENTATION.pending;
        return <StatusBadge style={p.style} size='small'>{p.label}</StatusBadge>;
      },
    },
    {
      key: 'actions', header: 'การดำเนินการ', sortable: false,
      render: (r) => {
        const locked = isRequestReadOnly(r);
        return (
          <span title={locked
            ? 'ผู้รับบริการยกเลิกคำขอแล้ว — ดำเนินการต่อไม่ได้'
            : canManage ? 'เปิดเพื่อยืนยัน / ปฏิเสธ / เสนอเวลาใหม่' : NO_PERMISSION_TOOLTIP}
          >
            <BrandSubdueButton
              variant='outline'
              size='sm'
              leadingIcon={locked || !canManage ? 'visibility' : 'fact_check'}
              onClick={(e) => { e.stopPropagation(); setOpenId(r.id); }}
            >
              {locked || !canManage ? 'ดูรายละเอียด' : 'ตรวจสอบคำขอ'}
            </BrandSubdueButton>
          </span>
        );
      },
    },
  ];

  return (
    <>
      <QueuePageShell
        activeKey='appoint'
        breadcrumb={breadcrumb}
        title='รับนัดหมาย (คำขอนัดจากผู้รับบริการ)'
        onBack={() => history.push('/appointment')}
        summaryCards={summaryCards}
        tabs={tabs}
        activeTab={tab}
        onTabChange={(k) => { setTab(k); setPage(1); }}
        actions={(
          <div className='flex items-center' style={{ gap: 'var(--dim-space-300, 12px)' }}>
            <NeutralSubdueButton
              size='lg'
              variant='outline'
              leadingIcon='restart_alt'
              onClick={() => { resetAppointmentRequests(); flash('คืนค่าคำขอตัวอย่างแล้ว'); }}
            >
              คืนค่าตัวอย่าง
            </NeutralSubdueButton>
            <BrandButton
              variant='fill'
              size='lg'
              leadingIcon='calendar_month'
              onClick={() => history.push('/appointment')}
            >
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
          <section
            className='w-full flex flex-col'
            style={{
              background: 'var(--surface-card-100)',
              borderRadius: 'var(--dim-radius-500, 16px)',
              border: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary)',
              boxShadow: 'var(--shadow-brand-top-200)',
              paddingTop: 'var(--dim-space-600, 24px)',
              paddingBottom: 'var(--dim-space-600, 24px)',
              paddingLeft: 'var(--dim-space-600, 24px)',
              paddingRight: 'var(--dim-space-600, 24px)',
              gap: 'var(--dim-space-500, 20px)',
            }}
          >
            {!canManage ? (
              <StatusBadge style='neutral' size='default' icon='lock'>
                บทบาทปัจจุบันเป็นแบบดูอย่างเดียว — {NO_PERMISSION_TOOLTIP} (เปลี่ยนบทบาทได้ที่ ตั้งค่าระบบนัดหมาย)
              </StatusBadge>
            ) : null}

            <div className='w-full flex items-start justify-center'>
              <PrimarySearch
                value={search}
                onChange={(v) => { setSearch(v); setPage(1); }}
                onSubmit={(v) => { setSearch(v); setPage(1); }}
                placeholder='ค้นหา HN / ชื่อผู้รับบริการ / เลขที่คำขอ / อาการ'
                width={640}
              />
            </div>

            <OverflowFlexRow itemGap='var(--dim-space-200)' moreAriaLabel='แสดงตัวกรองที่ซ่อน'>
              <FilterDropdown prefix='ช่องทาง:' options={CHANNEL_FILTER} value={channel} onChange={(v) => { setChannel(v); setPage(1); }} />
              <FilterDropdown prefix='คลินิก:' options={clinicOptions} value={clinic} onChange={(v) => { setClinic(v); setPage(1); }} />
              {/* ต้อง controlled ตลอดเวลา — ถ้าสลับเป็น undefined ตอน quick==='all'
                  FilterDateTag จะกลับไปใช้ state ภายในที่ค้างอยู่ ทำให้หลังกด
                  "ล้างตัวกรอง" ชิปยังโชว์วันที่เดิมทั้งที่ตารางไม่ได้กรองแล้ว */}
              <FilterDateTag
                prefix='วันที่ขอ:'
                value={dateValue}
                defaultQuick='all'
                quickLabels={{ all: 'ทุกวัน' }}
                placeholder='ทุกวัน'
                selectedWhen={(v) => v?.quick && v.quick !== 'all'}
                onChange={(v) => { setDateValue(v); setPage(1); }}
              />
              {hasFilter ? (
                <NeutralSubdueButton size='sm' variant='outline' leadingIcon='filter_alt_off' onClick={clearFilters}>
                  ล้างตัวกรอง
                </NeutralSubdueButton>
              ) : null}
            </OverflowFlexRow>

            <SearchResultCount found={filtered.length} total={requests.length} />

            <Table
              columns={columns}
              rows={pageRows}
              rowKey={(r) => r.id}
              onRowClick={(r) => setOpenId(r.id)}
              stickyColCount={2}
              emptyMessage={hasFilter
                ? `ไม่พบคำขอที่ตรงกับเงื่อนไขที่เลือก`
                : tab === 'pending' ? 'ไม่มีคำขอรอตรวจสอบ'
                  : tab === 'confirmed' ? 'ยังไม่มีคำขอที่ยืนยันแล้ว'
                    : tab === 'rejected' ? 'ยังไม่มีคำขอที่ถูกปฏิเสธ'
                      : tab === 'proposed' ? 'ยังไม่มีคำขอที่เสนอเวลาใหม่'
                        : 'ยังไม่มีคำขอนัดหมายเข้ามา'}
              emptySubtext={hasFilter
                ? 'ลองล้างตัวกรองแล้วค้นหาใหม่อีกครั้ง'
                : 'คำขอจาก Mobile App / LINE / โทรศัพท์ / เคาน์เตอร์ และคำสั่งนัดต่อเนื่องจากการรักษาจะเข้ามาที่นี่'}
              style={{ maxHeight: 620, overflow: 'auto' }}
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
                แสดง {filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1}-
                {Math.min(safePage * PAGE_SIZE, filtered.length)} จาก {filtered.length} คำขอ
              </span>
              <Pagination currentPage={safePage} pageCount={totalPages} onPageChange={setPage} />
            </div>
          </section>
        </div>
      </QueuePageShell>

      <AppointmentRequestDecisionPopup
        open={!!openRequest}
        request={openRequest}
        appointments={appointments}
        canManage={canManage}
        onClose={() => setOpenId(null)}
        onConfirm={handleConfirm}
        onReject={handleReject}
        onPropose={handlePropose}
        onFindEarliest={handleFindEarliest}
      />

      <PhcisTopToast session={toast} onDismiss={() => setToast(null)} />
    </>
  );
};

export default AppointmentRequestInboxPage;
