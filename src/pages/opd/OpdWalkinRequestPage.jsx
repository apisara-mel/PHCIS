import React, { useMemo, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import PrimarySearch from '@/components/search/PrimarySearch';
import SearchResultCount from '@/components/search/SearchResultCount';
import Table, { EllipsisText as TableEllipsisText } from '@/components/table/Table';
import Pagination from '@/components/pagination/Pagination';
import Badge from '@/components/badge/Badge';
import Popup from '@/components/popup/Popup';
import AlertDialog from '@/components/popup/AlertDialog';
import PrivacyRevealPopup from '@/components/popup/PrivacyRevealPopup';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import Dropdown from '@/components/forms/Dropdown';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import Icon from '@/components/icons/Icon';
import {
  getWalkinRequests,
  updateWalkinRequest,
  assignWalkinSlot,
  cancelWalkinRequest,
  WALKIN_STATUS,
  WALKIN_DEPARTMENTS,
} from '@/data/opdWalkinRequests';
import {
  getRoomConfigOrDefault,
  getRoomForDoctorPeriod,
  todayKey,
  ROOM_PERIODS,
} from '@/data/opdRoomConfig';
import { buildDoctorRoster } from '@/pages/appointment/appointmentDoctorRoster';
import { INITIAL_APPOINTMENTS } from '@/pages/appointment/appointmentMockData';

/* OpdWalkinRequestPage — TOR 1.2.1.4 + 1.2.1.5 + 1.2.1.6.
   Per-department Walk-in Request board: screening forwards a patient to a
   destination department (ส่งต่อไปยังแผนก) → the request lands here → staff
   assigns a free doctor slot ("ให้ Slot", pattern borrowed from
   AppointmentDaySlotsPopup slot cells) → the exam queue number is issued
   bound to the slot time (running number per room per period). Slot quota
   comes READ-ONLY from the /opd/room-config store; appointment roster +
   master schedule are read-only imports (never modified here). */

const breadcrumb = ['ระบบงานผู้รับบริการนอก (OPD)', 'คำขอ Walk-in ตามแผนก'];
const PAGE_SIZE = 10;

/* จิตเวช in OPD vocabulary maps to สุขภาพจิต in the doctor roster;
   ตรวจรักษา (general exam) pulls the family-medicine pool. */
const DEPT_TO_ROSTER_DEPT = {
  'อายุรกรรม': ['อายุรกรรม'],
  'ศัลยกรรม': ['ศัลยกรรม', 'ศัลยกรรมกระดูก'],
  'กุมารเวช': ['กุมารเวช'],
  'จิตเวช': ['สุขภาพจิต'],
  'ตรวจรักษา': ['เวชศาสตร์ครอบครัว', 'อุบัติเหตุและฉุกเฉิน'],
};

const PERIOD_TIMES = {
  'เช้า': ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30'],
  'บ่าย': ['13:00', '13:30', '14:00', '14:30', '15:00', '15:30'],
};

const ESI_BADGE = { 1: 'error', 2: 'error', 3: 'warning', 4: 'info', 5: 'neutral' };

const CANCEL_REASON_SUGGESTIONS = [
  'ผู้ป่วยขอกลับก่อน อาการทุเลา',
  'ผู้ป่วยขอเลื่อนไปรับบริการวันอื่น',
  'ส่งต่อผิดแผนก สร้างคำขอใหม่ให้แผนกที่ถูกต้องแล้ว',
  'ผู้ป่วยไม่สะดวกรอ Slot ช่วงบ่าย',
  'แพทย์ปลายทางงดตรวจ ผู้ป่วยรับนัดวันถัดไปแทน',
];

const COMPLAINT_EDIT_SUGGESTIONS = [
  'ปวดท้องน้อยด้านขวา กดเจ็บ',
  'ไข้สูง หนาวสั่น มา 2 วัน',
  'เจ็บหน้าอกขณะออกแรง ร้าวไปแขนซ้าย',
  'ผื่นคันทั่วตัว สงสัยแพ้ยา',
  'ปรึกษาอาการวิตกกังวล นอนไม่หลับ',
];

const nowHHMM = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

/* Slot availability — a doctor's slot is busy when the read-only master
   schedule has an active appointment at that time today. Defensive access:
   if the appointment module's export shape changes, fall back to "free". */
const isSlotBusy = (staffId, time) => {
  try {
    return (INITIAL_APPOINTMENTS || []).some((a) => (
      a && a.staffId === staffId && a.date === todayKey() && a.time === time
      && a.status !== 'cancelled'
    ));
  } catch {
    return false;
  }
};

const OpdWalkinRequestPage = () => {
  const history = useHistory();
  /* ScreeningPage's ส่งต่อไปยังแผนก hands over the destination department
     so the board opens on the tab the request just landed in. */
  const { state: navState } = useLocation();
  const [rows, setRows] = useState(() => getWalkinRequests());
  const refresh = () => setRows(getWalkinRequests());

  const [activeTab, setActiveTab] = useState(
    () => (WALKIN_DEPARTMENTS.includes(navState?.dept) ? navState.dept : 'all'),
  );
  const [searchQ, setSearchQ] = useState('');
  const [page, setPage] = useState(1);

  /* Role mock — §1.4.2 confidential data. Non-clinical roles see the
     อาการนำ column masked; reveal per-row via PrivacyRevealPopup. */
  const [clinicalScope, setClinicalScope] = useState(true);
  const [revealedIds, setRevealedIds] = useState(() => new Set());
  const [revealCandidate, setRevealCandidate] = useState(null);

  const [detailRow, setDetailRow] = useState(null);
  const [editRow, setEditRow] = useState(null);
  const [editDept, setEditDept] = useState('');
  const [editComplaint, setEditComplaint] = useState('');
  const [cancelRow, setCancelRow] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [slotRow, setSlotRow] = useState(null);
  const [slotChoice, setSlotChoice] = useState(null); // { doctor, staffId, time, period, room }
  const [quotaAlert, setQuotaAlert] = useState(false);
  const [assignedResult, setAssignedResult] = useState(null);

  const counts = useMemo(() => ({
    new: rows.filter((r) => r.status === 'new').length,
    waitingSlot: rows.filter((r) => r.status === 'waitingSlot').length,
    assigned: rows.filter((r) => r.status === 'assigned').length,
    cancelled: rows.filter((r) => r.status === 'cancelled').length,
  }), [rows]);

  const summaryCards = [
    { key: 'new', label: 'คำขอใหม่', value: counts.new, indicator: 'จากจุดคัดกรองวันนี้', color: 'info', icon: 'assignment_add' },
    { key: 'waiting', label: 'รอ Slot', value: counts.waitingSlot, indicator: 'รอแพทย์ว่าง', color: 'inprogress', icon: 'hourglass_top' },
    { key: 'assigned', label: 'ได้คิวแล้ว', value: counts.assigned, indicator: 'ผูกกับเวลา Slot แล้ว', color: 'positive', icon: 'event_available' },
    { key: 'cancelled', label: 'ยกเลิก', value: counts.cancelled, indicator: 'เก็บไว้ตรวจสอบย้อนหลัง', color: 'info', icon: 'cancel' },
  ];

  const tabs = useMemo(() => ([
    { key: 'all', label: 'ทุกแผนก', icon: 'group', count: rows.length },
    ...WALKIN_DEPARTMENTS.map((d) => ({
      key: d,
      label: d,
      count: rows.filter((r) => r.dept === d).length})),
  ]), [rows]);

  const filtered = useMemo(() => {
    let result = rows;
    if (activeTab !== 'all') result = result.filter((r) => r.dept === activeTab);
    if (searchQ.trim()) {
      const q = searchQ.trim().toLowerCase();
      result = result.filter((r) => [r.requestQueue, r.hn, r.name, r.dept]
        .some((f) => f && f.toLowerCase().includes(q)));
    }
    return result;
  }, [rows, activeTab, searchQ]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  /* ── Slot assignment (1.2.1.5 + 1.2.1.6) ─────────────────────────── */
  /* `rows` is in the dep list so the config is re-read after every assign /
     cancel — assignWalkinSlot writes the consumed quota straight back into
     the room-config store, which is the SINGLE source of the booked figure
     both this page and /opd/room-config display. No client-side addend here,
     otherwise the two screens would disagree (and seed rows assigned before
     this session would be counted twice). */
  const roomCfg = useMemo(() => getRoomConfigOrDefault(todayKey()), [slotRow, rows]);
  const quotaRow = slotRow
    ? roomCfg.quotas.find((q) => q.unit === slotRow.dept)
    : null;
  const effectiveBooked = quotaRow ? Number(quotaRow.booked || 0) : 0;
  const quotaFull = !!quotaRow && effectiveBooked >= Number(quotaRow.quota);
  const quotaHasOverride = !!quotaRow && !!quotaRow.overrideReason;

  const deptDoctors = useMemo(() => {
    if (!slotRow) return [];
    const wanted = DEPT_TO_ROSTER_DEPT[slotRow.dept] || [];
    const roster = buildDoctorRoster() || [];
    /* Room binding comes from the doctor→room→period grid staff recorded on
       /opd/room-config (TOR 1.2.7.1), NOT from array position: one doctor can
       hold different rooms เช้า vs บ่าย, and a doctor with no configured room
       for a period must not be bookable at all — otherwise two doctors would
       share one per-room running queue sequence (TOR 1.2.1.6). */
    const withRooms = roster
      .filter((d) => wanted.includes(d.dept))
      .map((d) => ({
        ...d,
        roomByPeriod: ROOM_PERIODS.reduce((acc, period) => {
          acc[period] = getRoomForDoctorPeriod(todayKey(), d.name, period);
          return acc;
        }, {}),
      }));
    /* Doctors who actually hold a room today lead the list — otherwise a
       simple slice() could cut the only bookable doctor of the department. */
    const hasRoom = (d) => ROOM_PERIODS.some((p) => d.roomByPeriod[p]);
    return [...withRooms.filter(hasRoom), ...withRooms.filter((d) => !hasRoom(d))]
      .slice(0, 3);
  }, [slotRow, roomCfg]);

  const openSlotPopup = (row) => {
    setSlotChoice(null);
    setSlotRow(row);
    if (row.status === 'new') {
      updateWalkinRequest(row.id, { status: 'waitingSlot' });
      refresh();
    }
  };

  const confirmSlot = () => {
    if (!slotRow || !slotChoice) return;
    if (quotaFull && !quotaHasOverride) { setQuotaAlert(true); return; }
    const updated = assignWalkinSlot(slotRow.id, {
      doctor: slotChoice.doctor,
      time: slotChoice.time,
      room: slotChoice.room,
      period: slotChoice.period,
      assignedBy: 'จนท.สมพร ทองดี',
    });
    setSlotRow(null);
    setAssignedResult(updated);
    refresh();
  };

  /* ── Cell renderers ──────────────────────────────────────────────── */
  const renderComplaint = (row) => {
    const revealed = clinicalScope || revealedIds.has(row.id);
    return (
      <span className='flex items-center min-w-0' style={{ gap: 'var(--dim-space-200)' }}>
        <Badge style={ESI_BADGE[row.esi] || 'neutral'} size='small'>{`ESI ${row.esi}`}</Badge>
        {revealed ? (
          <TableEllipsisText text={row.complaint} />
        ) : (
          <button
            type='button'
            onClick={(e) => { e.stopPropagation(); setRevealCandidate(row); }}
            className='inline-flex items-center'
            style={{
              gap: 'var(--dim-space-100)',
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-content-tertiary, #858C92)',
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-sm)',
              paddingTop: 'var(--dim-space-0, 0px)',
              paddingBottom: 'var(--dim-space-0, 0px)',
              paddingLeft: 'var(--dim-space-0, 0px)',
              paddingRight: 'var(--dim-space-0, 0px)',
            }}
            aria-label='เปิดเผยข้อมูลอาการ (บันทึกการเข้าถึง)'
          >
            <Icon name='visibility_off' size={16} />
            ••••••••••
          </button>
        )}
      </span>
    );
  };

  const renderStatus = (row) => {
    const meta = WALKIN_STATUS[row.status] || WALKIN_STATUS.new;
    return (
      <span className='flex flex-col items-start' style={{ gap: 'var(--dim-space-050, 2px)' }}>
        <span className='flex items-center' style={{ gap: 'var(--dim-space-100)' }}>
          <Badge style={meta.badge} size='small'>{meta.label}</Badge>
          {/* Playbook §5 — an edited request must be distinguishable from an
              untouched one straight from the list, not only in the detail popup. */}
          {row.editedAt && <Badge style='neutral' size='small'>แก้ไขแล้ว</Badge>}
        </span>
        {row.status === 'assigned' && row.assignedSlot && (
          <span style={{ color: 'var(--text-content-tertiary, #858C92)', fontSize: 'var(--type-size-xs)', fontFamily: 'var(--type-family-body)' }}>
            {row.assignedSlot.queueNo} · {row.assignedSlot.time} น. · {row.assignedSlot.room}
          </span>
        )}
      </span>
    );
  };

  const renderActions = (row) => {
    const cancelled = row.status === 'cancelled';
    const assigned = row.status === 'assigned';
    return (
      <div className='flex items-center' style={{ gap: 'var(--dim-space-150)' }}>
        <BrandSubdueButton
          variant='fill'
          size='sm'
          disabled={cancelled || assigned}
          onClick={(e) => { e.stopPropagation(); openSlotPopup(row); }}
        >
          ให้ Slot
        </BrandSubdueButton>
        <NeutralSubdueButton
          variant='outline'
          size='sm'
          disabled={cancelled || assigned}
          onClick={(e) => {
            e.stopPropagation();
            setEditRow(row); setEditDept(row.dept); setEditComplaint(row.complaint);
          }}
        >
          แก้ไข
        </NeutralSubdueButton>
        <NeutralSubdueButton
          variant='outline'
          size='sm'
          disabled={cancelled}
          onClick={(e) => { e.stopPropagation(); setCancelRow(row); setCancelReason(''); }}
        >
          ยกเลิก
        </NeutralSubdueButton>
      </div>
    );
  };

  const columns = useMemo(() => ([
    { key: 'requestQueue', label: 'คิวคำขอ', render: (row) => <Badge style='success' size='small'>{row.requestQueue}</Badge> },
    { key: 'hn', label: 'HN' },
    { key: 'name', label: 'ชื่อ-นามสกุล', flex: true, minWidth: 160 },
    { key: 'complaint', label: 'อาการนำ / ESI', flex: true, minWidth: 220, sortable: false, render: renderComplaint },
    { key: 'dept', label: 'แผนกปลายทาง' },
    { key: 'requestedAt', label: 'เวลาส่งคำขอ' },
    { key: 'status', label: 'สถานะ', render: renderStatus },
    { key: 'actions', label: 'การดำเนินการ', sortable: false, render: renderActions },
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  ]), [clinicalScope, revealedIds, rows]);

  const emptyForDept = activeTab !== 'all'
    && rows.filter((r) => r.dept === activeTab).length === 0;

  return (
    <>
      {/* §1.4.2 reveal confirmation — logs access before unmasking */}
      <PrivacyRevealPopup
        open={!!revealCandidate}
        fieldLabel={`อาการนำของ ${revealCandidate?.name || ''}`}
        onClose={() => setRevealCandidate(null)}
        onConfirm={() => {
          setRevealedIds((prev) => new Set([...prev, revealCandidate.id]));
          setRevealCandidate(null);
        }}
      />

      {/* Quota exceeded — override path lives on /opd/room-config (1.2.7.2) */}
      <AlertDialog
        open={quotaAlert}
        onClose={() => setQuotaAlert(false)}
        onConfirm={() => { setQuotaAlert(false); history.push('/opd/room-config'); }}
        type='warning'
        title='โควตาแผนกเต็มแล้ว'
        description={quotaRow
          ? `แผนก${slotRow?.dept || ''} รับแล้ว ${effectiveBooked}/${quotaRow.quota} ราย — การรับเพิ่มต้องบันทึกเหตุผลการขยายโควตาที่หน้าตั้งค่าห้องตรวจและโควตาก่อน`
          : 'ต้องบันทึกเหตุผลการขยายโควตาที่หน้าตั้งค่าห้องตรวจและโควตาก่อน'}
        cancelLabel='กลับ'
        confirmLabel='ไปหน้าตั้งค่าโควตา'
      />

      {/* Assigned confirmation state (1.2.1.6) */}
      <AlertDialog
        open={!!assignedResult}
        onClose={() => setAssignedResult(null)}
        onConfirm={() => setAssignedResult(null)}
        type='success'
        title='ออกคิวห้องตรวจแล้ว'
        description={assignedResult?.assignedSlot
          ? `${assignedResult.name} ได้คิว ${assignedResult.assignedSlot.queueNo} · ${assignedResult.assignedSlot.room} ช่วง${assignedResult.assignedSlot.period} เวลา ${assignedResult.assignedSlot.time} น. กับ ${assignedResult.assignedSlot.doctor} (ผู้บันทึก ${assignedResult.assignedBy} เวลา ${assignedResult.assignedAt} น.)`
          : ''}
        showCancel={false}
        confirmLabel='ตกลง'
      />

      {/* Detail (แสดง) */}
      <Popup
        open={!!detailRow}
        onClose={() => setDetailRow(null)}
        title='รายละเอียดคำขอ Walk-in'
        subtitle={detailRow ? `${detailRow.requestQueue} · ${detailRow.name} · HN ${detailRow.hn}` : ''}
        primaryAction={{ label: 'ปิด', onClick: () => setDetailRow(null) }}
      >
        {detailRow && (
          <div className='flex flex-col' style={{ gap: 'var(--dim-space-200)' }}>
            {[
              ['แผนกปลายทาง', detailRow.dept],
              ['อาการนำ', clinicalScope || revealedIds.has(detailRow.id) ? detailRow.complaint : '•••••••••• (ต้องเปิดเผยจากตาราง)'],
              ['ระดับ ESI', `ESI ${detailRow.esi}`],
              ['เวลาส่งคำขอ', `${detailRow.requestedAt} น. โดย ${detailRow.requestedBy}`],
              ['สถานะ', WALKIN_STATUS[detailRow.status]?.label || detailRow.status],
              detailRow.editedAt && ['แก้ไขล่าสุด', `${detailRow.editedAt} น. โดย ${detailRow.editedBy}`],
              detailRow.assignedSlot && ['คิวที่ได้', `${detailRow.assignedSlot.queueNo} · ${detailRow.assignedSlot.room} · ${detailRow.assignedSlot.time} น. · ${detailRow.assignedSlot.doctor} (โดย ${detailRow.assignedBy} เวลา ${detailRow.assignedAt} น.)`],
              detailRow.cancelledReason && ['เหตุผลที่ยกเลิก', `${detailRow.cancelledReason} (โดย ${detailRow.cancelledBy} เวลา ${detailRow.cancelledAt} น.)`],
            ].filter(Boolean).map(([label, value]) => (
              <div key={label} className='flex items-start' style={{ gap: 'var(--dim-space-300)' }}>
                <span style={{ width: 128, flexShrink: 0, color: 'var(--text-content-tertiary, #858C92)', fontSize: 'var(--type-size-sm)', fontFamily: 'var(--type-family-body)' }}>{label}</span>
                <span style={{ color: 'var(--text-content-default, #363B3F)', fontSize: 'var(--type-size-sm)', fontFamily: 'var(--type-family-body)' }}>{value}</span>
              </div>
            ))}
          </div>
        )}
      </Popup>

      {/* แก้ไข — dept + complaint */}
      <Popup
        open={!!editRow}
        onClose={() => setEditRow(null)}
        title='แก้ไขคำขอ Walk-in'
        subtitle={editRow ? `${editRow.requestQueue} · ${editRow.name}` : ''}
        secondaryAction={{ label: 'ยกเลิก', onClick: () => setEditRow(null) }}
        primaryAction={{
          label: 'บันทึกการแก้ไข',
          disabled: !editDept || editComplaint.trim() === '',
          onClick: () => {
            updateWalkinRequest(editRow.id, {
              dept: editDept,
              complaint: editComplaint.trim(),
              editedBy: 'จนท.สมพร ทองดี',
              editedAt: nowHHMM(),
            });
            setEditRow(null);
            refresh();
          },
        }}
      >
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-300)' }}>
          <div className='flex flex-col' style={{ gap: 'var(--dim-space-150)' }}>
            <span style={{ color: 'var(--text-content-default, #363B3F)', fontSize: 'var(--type-size-sm)', fontWeight: 'var(--type-weight-medium)', fontFamily: 'var(--type-family-body)' }}>แผนกปลายทาง *</span>
            <Dropdown
              value={editDept}
              onChange={setEditDept}
              options={WALKIN_DEPARTMENTS.map((d) => ({ value: d, label: d }))}
              placeholder='เลือกแผนก'
            />
          </div>
          <SuggestibleTextarea
            label='อาการนำ'
            required
            voice
            value={editComplaint}
            onChange={(e) => setEditComplaint(e.target.value)}
            placeholder='อาการนำที่พบจากการคัดกรอง'
            suggestions={COMPLAINT_EDIT_SUGGESTIONS}
            minChars={3}
            popoverAriaLabel='คำแนะนำอาการนำ'
          />
        </div>
      </Popup>

      {/* ยกเลิกคำขอ — soft cancel with required reason */}
      <Popup
        open={!!cancelRow}
        onClose={() => setCancelRow(null)}
        title='ยกเลิกคำขอ Walk-in'
        subtitle={cancelRow ? `${cancelRow.requestQueue} · ${cancelRow.name} — แถวจะคงอยู่ในสถานะ "ยกเลิก" เพื่อการตรวจสอบ` : ''}
        secondaryAction={{ label: 'กลับ', onClick: () => setCancelRow(null) }}
        primaryAction={{
          label: 'ยืนยันการยกเลิก',
          tone: 'danger',
          disabled: cancelReason.trim() === '',
          onClick: () => {
            cancelWalkinRequest(cancelRow.id, cancelReason.trim(), 'จนท.สมพร ทองดี');
            setCancelRow(null);
            refresh();
          },
        }}
      >
        <SuggestibleTextarea
          label='เหตุผลการยกเลิก'
          required
          voice
          value={cancelReason}
          onChange={(e) => setCancelReason(e.target.value)}
          placeholder='เช่น ผู้ป่วยขอกลับก่อน อาการทุเลา'
          suggestions={CANCEL_REASON_SUGGESTIONS}
          minChars={3}
          popoverAriaLabel='คำแนะนำเหตุผลการยกเลิก'
        />
      </Popup>

      {/* ให้ Slot — today's free slots per doctor of the department */}
      <Popup
        open={!!slotRow}
        onClose={() => setSlotRow(null)}
        title='ให้ Slot ห้องตรวจ'
        subtitle={slotRow ? `${slotRow.name} → แผนก${slotRow.dept} · วันนี้ (${todayKey()})` : ''}
        secondaryAction={{ label: 'ยกเลิก', onClick: () => setSlotRow(null) }}
        primaryAction={{
          label: slotChoice ? `ยืนยันคิวเวลา ${slotChoice.time} น.` : 'เลือก Slot ก่อน',
          disabled: !slotChoice,
          onClick: confirmSlot,
        }}
      >
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-400)' }}>
          {quotaRow && (
            <div
              className='flex items-center'
              style={{
                gap: 'var(--dim-space-200)',
                paddingTop: 'var(--dim-space-200)',
                paddingBottom: 'var(--dim-space-200)',
                paddingLeft: 'var(--dim-space-300)',
                paddingRight: 'var(--dim-space-300)',
                background: quotaFull
                  ? 'var(--surface-alert-warning, #FFF9F0)'
                  : 'var(--surface-brandPrimary-quaternary, #F4FBF8)',
                borderRadius: 'var(--dim-radius-300, 10px)',
              }}
            >
              <Icon name={quotaFull ? 'warning' : 'check_circle'} size={18} style={{ color: quotaFull ? 'var(--text-warning-default, #C2410C)' : 'var(--text-brandPrimary-default, #007549)' }} />
              <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)', color: 'var(--text-content-default, #363B3F)' }}>
                โควตาแผนก{slotRow?.dept}: รับแล้ว {effectiveBooked}/{quotaRow.quota} ราย
                {quotaFull && (quotaHasOverride
                  ? ' — เต็มแล้ว แต่มีการอนุมัติขยายโควตา (รับเพิ่มได้)'
                  : ' — เต็มแล้ว ต้องขยายโควตาที่หน้าตั้งค่าก่อน')}
              </span>
            </div>
          )}
          {slotRow?.rightsExpired && (
            <div className='flex items-center' style={{ gap: 'var(--dim-space-200)' }}>
              <Badge style='warning' size='small'>สิทธิหมดอายุ</Badge>
              <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-warning-default, #C2410C)' }}>
                ตรวจสอบสิทธิการรักษาก่อนพบแพทย์
              </span>
            </div>
          )}
          {deptDoctors.length === 0 && (
            <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)', color: 'var(--text-content-tertiary, #858C92)' }}>
              ไม่มีแพทย์แผนกนี้ออกตรวจวันนี้ — ตรวจสอบการตั้งค่าห้องตรวจ
            </span>
          )}
          {deptDoctors.map((doc) => (
            <div key={doc.employeeId} className='flex flex-col' style={{ gap: 'var(--dim-space-200)' }}>
              <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)', fontWeight: 'var(--type-weight-medium)', color: 'var(--text-content-default, #363B3F)' }}>
                {doc.name} · {doc.subDivision}
              </span>
              {ROOM_PERIODS.map((period) => {
                const periodRoom = doc.roomByPeriod[period];
                return (
                <div key={period} className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-150)' }}>
                  <span style={{ width: 132, flexShrink: 0, fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
                    {period}{periodRoom ? ` · ${periodRoom}` : ''}
                  </span>
                  {!periodRoom && (
                    <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
                      แพทย์ท่านนี้ไม่มีห้องตรวจในช่วงนี้
                    </span>
                  )}
                  {periodRoom && PERIOD_TIMES[period].map((time) => {
                    const busy = isSlotBusy(doc.id, time);
                    const blocked = busy || (quotaFull && !quotaHasOverride);
                    const chosen = slotChoice
                      && slotChoice.staffId === doc.id
                      && slotChoice.period === period
                      && slotChoice.time === time;
                    return (
                      <button
                        key={time}
                        type='button'
                        disabled={blocked}
                        title={busy ? 'Slot นี้มีนัดหมายแล้ว' : (quotaFull && !quotaHasOverride ? 'โควตาเต็ม — ต้องขยายโควตาก่อน' : undefined)}
                        onClick={() => setSlotChoice({
                          doctor: doc.name, staffId: doc.id, time, period, room: periodRoom,
                        })}
                        style={{
                          paddingTop: 'var(--dim-space-100)',
                          paddingBottom: 'var(--dim-space-100)',
                          paddingLeft: 'var(--dim-space-300)',
                          paddingRight: 'var(--dim-space-300)',
                          borderRadius: 'var(--dim-radius-200, 8px)',
                          border: chosen
                            ? 'var(--dim-stroke-200, 2px) solid var(--border-brandPrimary-default, #007549)'
                            : 'var(--dim-stroke-100, 1px) solid var(--border-input-default, #E2E4E6)',
                          background: blocked
                            ? 'var(--surface-disabledButton-tertiary, #F4F5F5)'
                            : chosen
                              ? 'var(--surface-brandPrimary-quaternary, #F4FBF8)'
                              : 'var(--surface-card-100, #FFFFFF)',
                          color: blocked
                            ? 'var(--text-content-quaternary, #ADB2B7)'
                            : 'var(--text-content-default, #363B3F)',
                          fontFamily: 'var(--type-family-body)',
                          fontSize: 'var(--type-size-sm)',
                          cursor: blocked ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {time}
                      </button>
                    );
                  })}
                </div>
                );
              })}
            </div>
          ))}
        </div>
      </Popup>

      <QueuePageShell
        activeKey='opd'
        breadcrumb={breadcrumb}
        title='คำขอ Walk-in ตามแผนก'
        onBack={() => history.push('/opd/queue')}
        actions={(
          <NeutralSubdueButton
            leadingIcon={clinicalScope ? 'stethoscope' : 'badge'}
            onClick={() => setClinicalScope((v) => !v)}
            accessibilityLabel='สลับบทบาทตัวอย่าง'
          >
            {clinicalScope ? 'บทบาท: พยาบาล (เห็นข้อมูลคลินิก)' : 'บทบาท: เวชระเบียน (ปกปิดข้อมูลคลินิก)'}
          </NeutralSubdueButton>
        )}
        summaryCards={summaryCards}
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={(k) => { setActiveTab(k); setPage(1); }}
      >
        <div
          className='flex flex-col flex-1 min-w-0'
          style={{
            paddingTop: 'var(--dim-space-600)',
            paddingLeft: 'var(--dim-space-600)',
            paddingRight: 'var(--dim-space-600)',
            paddingBottom: 'var(--dim-space-600)',
            gap: 'var(--dim-space-600)',
          }}
        >
          <div
            className='w-full flex flex-col'
            style={{
              background: 'var(--surface-card-100)',
              borderRadius: 'var(--dim-radius-500)',
              boxShadow: 'var(--shadow-card-strong)',
              paddingTop: 'var(--dim-space-600)',
              paddingBottom: 'var(--dim-space-600)',
              paddingLeft: 'var(--dim-space-600)',
              paddingRight: 'var(--dim-space-600)',
              gap: 'var(--dim-space-600)',
            }}
          >
            <div className='w-full flex items-start justify-center'>
              <PrimarySearch
                value={searchQ}
                onChange={(v) => { setSearchQ(v); setPage(1); }}
                onSubmit={(v) => { setSearchQ(v); setPage(1); }}
                placeholder='ค้นหาคิวคำขอ / HN / ชื่อผู้ป่วย / แผนก'
                width={640}
              />
            </div>

            {emptyForDept ? (
              /* Empty state per department — CTA back to screening */
              <div
                className='w-full flex flex-col items-center'
                style={{
                  gap: 'var(--dim-space-300)',
                  paddingTop: 'var(--dim-space-600)',
                  paddingBottom: 'var(--dim-space-600)',
                }}
              >
                <Icon name='outbox' size={48} style={{ color: 'var(--text-content-quaternary, #ADB2B7)' }} />
                <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-base)', fontWeight: 'var(--type-weight-medium)', color: 'var(--text-content-default, #363B3F)' }}>
                  ยังไม่มีคำขอ Walk-in ของแผนก{activeTab}วันนี้
                </span>
                <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)', color: 'var(--text-content-tertiary, #858C92)' }}>
                  คำขอจะถูกสร้างเมื่อจุดคัดกรองส่งต่อผู้ป่วยมายังแผนกนี้
                </span>
                <BrandSubdueButton variant='outline' leadingIcon='arrow_back' onClick={() => history.push('/opd/queue')}>
                  กลับไปหน้าคิวคัดกรอง OPD
                </BrandSubdueButton>
              </div>
            ) : (
              <>
                <SearchResultCount found={filtered.length} total={rows.length} />
                <Table
                  columns={columns}
                  rows={pageRows}
                  rowKey={(row) => row.id}
                  stickyColCount={2}
                  onRowClick={(row) => setDetailRow(row)}
                  emptyMessage='ไม่พบรายการที่ค้นหา — ลองล้างคำค้นหรือเปลี่ยนแผนก'
                />
                <div
                  className='flex items-center w-full'
                  style={{
                    gap: 'var(--dim-space-200)',
                    paddingTop: 'var(--dim-space-200)',
                    borderTop: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
                  }}
                >
                  <span style={{ color: 'var(--text-content-secondary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)' }}>
                    แสดง {filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} จาก {filtered.length} รายการ
                  </span>
                  <div className='flex-1' />
                  <Pagination currentPage={safePage} pageCount={totalPages} onPageChange={setPage} />
                </div>
              </>
            )}
          </div>
        </div>
      </QueuePageShell>
    </>
  );
};

export default OpdWalkinRequestPage;
