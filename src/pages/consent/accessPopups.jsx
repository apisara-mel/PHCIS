import React, { useEffect, useState } from 'react';
import Popup from '@/components/popup/Popup';
import DatePickerRange from '@/components/forms/DatePickerRange';
import Calendar, { startOfDay } from '@/components/forms/Calendar';
import PatientSummaryCard from '@/components/card/PatientSummaryCard';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import StaffProfileAvatar from '@/components/appointment/StaffProfileAvatar';
import AccessRequestForm from '@/pages/consent/AccessRequestForm';
import { accessPatientLabel, accessAvatarForGroup, ACCESS_STATUS } from '@/data/accessRecords';

/* Helper popups ของ AccessManagementPage — TOR ด.1.1.17 (แตกไฟล์ตาม playbook):

     • ScanImportPopup   — 17.1 อัปโหลดแบบฟอร์มขอเข้าถึงข้อมูลนำเข้าระบบ
                           (ศัพท์ HCIS: บันทึกการ SCAN เอกสาร): อัปโหลด/ถ่ายภาพ →
                           mock-OCR prefill → ตรวจแก้ → บันทึกเป็นคำขอใหม่
     • ApprovePeriodPopup — 17.2 อนุมัติโดยระบุช่วงเวลาสิทธิ เริ่มต้น-สิ้นสุด
                           (validate สิ้นสุด ≥ เริ่ม)
     • AccessDetailPopup — รายละเอียดคำขอ (17.3)

   Mock local; ทุกค่า visual alias design.md tokens; copy ไทย. */

const BODY_TEXT = {
  color: 'var(--text-content-secondary)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm)',
  lineHeight: 1.6,
};
const LABEL_TEXT = {
  color: 'var(--text-content-default)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm)',
  fontWeight: 'var(--type-weight-medium)',
  lineHeight: 1.5,
};
const ERROR_TEXT = {
  color: 'var(--text-danger-default, #B91C1C)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-xs)',
  lineHeight: 1.5,
};

const isoParse = (s) => (s ? new Date(`${s}T00:00:00`) : null);

const addDays = (d, n) => {
  const x = startOfDay(new Date(d));
  x.setDate(x.getDate() + n);
  return x;
};
const firstOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
const addMonthsFirst = (d, n) => new Date(d.getFullYear(), d.getMonth() + n, 1);
const addCalendarMonthsKeepDay = (d, n) => startOfDay(new Date(d.getFullYear(), d.getMonth() + n, d.getDate()));

/* ตัวเลือกด่วน — นับช่วงสิทธิตั้งแต่วันที่ยืนยัน (วันเริ่ม = วันยืนยัน) */
const ACCESS_PERIOD_QUICK = [
  { key: 'd1',  label: '1 วัน',  resolveEnd: (start) => addDays(start, 1) },
  { key: 'd3',  label: '3 วัน',  resolveEnd: (start) => addDays(start, 3) },
  { key: 'd7',  label: '7 วัน',  resolveEnd: (start) => addDays(start, 7) },
  { key: 'd14', label: '14 วัน', resolveEnd: (start) => addDays(start, 14) },
  { key: 'm1',  label: '1 เดือน', resolveEnd: (start) => addCalendarMonthsKeepDay(start, 1) },
  { key: 'm3',  label: '3 เดือน', resolveEnd: (start) => addCalendarMonthsKeepDay(start, 3) },
  { key: 'm6',  label: '6 เดือน', resolveEnd: (start) => addCalendarMonthsKeepDay(start, 6) },
];
const ACCESS_PERIOD_QUICK_CUSTOM = { key: 'custom', label: 'กำหนดเอง' };

const PeriodQuickRow = ({ option, selected, onClick }) => {
  const [hovered, setHovered] = useState(false);
  const tinted = selected || hovered;
  return (
    <button
      type='button'
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className='flex w-full cursor-pointer items-center text-left'
      style={{
        minHeight: 48,
        gap: 'var(--dim-space-200)',
        paddingLeft: 'var(--dim-space-300)',
        paddingRight: 'var(--dim-space-300)',
        paddingTop: 'var(--dim-space-200)',
        paddingBottom: 'var(--dim-space-200)',
        borderRadius: 'var(--dim-radius-150, 6px)',
        background: tinted ? 'var(--surface-popup-listitem-hover)' : 'var(--surface-list-default)',
        color: tinted ? 'var(--text-popup-listitem-hover)' : 'var(--text-list-default)',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-sm)',
        lineHeight: 1.5,
        border: 'none',
      }}
    >
      <span className='min-w-0 flex-1'>{option.label}</span>
      {selected && (
        <span
          className='material-symbols-outlined'
          style={{ fontFamily: 'Material Symbols Outlined', fontSize: 16, color: 'var(--icon-brandPrimary-default)' }}
        >
          check
        </span>
      )}
    </button>
  );
};

const isoFormat = (d) => {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

const GROUP_TONE = { 'แพทย์': 'green', 'พยาบาล': 'purple', 'เภสัชกร': 'teal', 'นักเทคนิคการแพทย์': 'blue' };

const AccessOrgBadges = ({ record }) => (
  <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-150)' }}>
    {record.group ? (
      <ColorfulBadge style={GROUP_TONE[record.group] || 'grey'} size='small' hierarchy='secondary' width='hug'>
        {record.group}
      </ColorfulBadge>
    ) : null}
    {record.subBranch ? (
      <ColorfulBadge style='blue' size='small' hierarchy='secondary' width='hug'>
        {record.subBranch}
      </ColorfulBadge>
    ) : null}
    {record.dept ? (
      <ColorfulBadge style='grey' size='small' hierarchy='secondary' width='hug'>
        {record.dept}
      </ColorfulBadge>
    ) : null}
    {!record.group && !record.subBranch && !record.dept ? (
      <span style={{ ...BODY_TEXT, color: 'var(--text-content-default)', fontWeight: 'var(--type-weight-medium)' }}>-</span>
    ) : null}
  </div>
);

/* ══ 17.1 — ขอสิทธิ์การเข้าถึงแบบฟอร์ม ══════════════════════════════ */
export function ScanImportPopup({ open, onClose, onImported }) {
  const [formApi, setFormApi] = useState({
    ready: false,
    dirty: false,
    submit: () => {},
    requestCancel: () => {},
  });

  if (!open) return null;

  return (
    <Popup
      open={open}
      onClose={() => (formApi.dirty ? formApi.requestCancel() : onClose())}
      /* ฟอร์มเดียวกับ "คำขอเข้าถึงข้อมูล" จึงต้องกว้างเท่ากัน ไม่งั้นตาราง
         ขอบเขตข้อมูล 2 คอลัมน์แตกบรรทัดเฉพาะทางเข้านี้ */
      size='large'
      width={960}
      title='ขอสิทธิ์การเข้าถึงแบบฟอร์ม'
      primaryAction={{ label: 'ส่งคำขอสิทธิ์เข้าถึงแบบฟอร์ม', onClick: () => formApi.submit(), disabled: !formApi.ready }}
      secondaryAction={{ label: 'ยกเลิก', onClick: () => (formApi.dirty ? formApi.requestCancel() : onClose()) }}
    >
      <AccessRequestForm
        key={open ? 'open' : 'closed'}
        showFooter={false}
        onCancel={onClose}
        onSubmit={(payload) => onImported?.(payload)}
        onStateChange={setFormApi}
      />
    </Popup>
  );
}

/* ══ 17.2 — แก้ไขช่วงเวลาสิทธิ (admin คลิกคอลัมน์) ═══════════════════════ */
export function EditPeriodPopup({ open, record, onClose, onSave, thaiDateOfIso }) {
  const [range, setRange] = useState(['', '']);

  useEffect(() => {
    if (!open || !record) return;
    setRange([record.periodStart || '', record.periodEnd || '']);
  }, [open, record]);

  const [startIso, endIso] = range;
  const invalidOrder = !!startIso && !!endIso && endIso < startIso;
  const ready = !!startIso && !!endIso && !invalidOrder;

  return (
    <Popup
      open={open}
      onClose={onClose}
      size='default'
      title='แก้ไขช่วงเวลาสิทธิ'
      subtitle={record ? `${record.reqNo} · ${record.name} · ${accessPatientLabel(record)}` : undefined}
      primaryAction={{ label: 'บันทึกช่วงเวลา', onClick: () => ready && onSave({ periodStart: startIso, periodEnd: endIso }), disabled: !ready }}
      secondaryAction={{ label: 'ยกเลิก', onClick: onClose }}
    >
      <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
        <span style={BODY_TEXT}>
          กำหนดวันเริ่มต้นและวันสิ้นสุดของสิทธิเข้าถึงข้อมูล — การเปลี่ยนแปลงจะบันทึกใน audit
        </span>
        <DatePickerRange
          label='ช่วงเวลาสิทธิ (เริ่มต้น - สิ้นสุด)'
          required
          value={range}
          onChange={setRange}
          format={isoFormat}
          parse={isoParse}
          error={invalidOrder ? 'วันสิ้นสุดต้องไม่ก่อนวันเริ่มต้น' : undefined}
          helperText={invalidOrder ? 'วันสิ้นสุดต้องไม่ก่อนวันเริ่มต้น' : (record?.periodStart
            ? `ปัจจุบัน: ${thaiDateOfIso(record.periodStart)} – ${thaiDateOfIso(record.periodEnd)}`
            : 'เลือกวันเริ่มต้นและวันสิ้นสุด')}
        />
      </div>
    </Popup>
  );
}

/* ══ 17.2 — อนุมัติพร้อมช่วงเวลาสิทธิ (DatePicker modal pattern) ═══════ */
export function ApprovePeriodPopup({ open, record, onClose, onApprove }) {
  const today = startOfDay(new Date());
  const [range, setRange] = useState({ start: null, end: null });
  const [viewMonth, setViewMonth] = useState(() => firstOfMonth(new Date()));
  const [quickKey, setQuickKey] = useState('custom');

  useEffect(() => {
    if (!open) return;
    const t = startOfDay(new Date());
    setRange({ start: t, end: null });
    setViewMonth(firstOfMonth(t));
    setQuickKey('custom');
  }, [open]);

  if (!record) return null;

  const { start, end } = range;
  const invalidOrder = !!start && !!end && end.getTime() < start.getTime();
  const ready = !!start && !!end && !invalidOrder;
  const rightMonth = addMonthsFirst(viewMonth, 1);
  const minDate = today;

  const handleRangeSelect = (date) => {
    const next = startOfDay(date);
    if (next.getTime() < minDate.getTime()) return;
    setRange((prev) => {
      if (!prev.start || (prev.start && prev.end)) return { start: next, end: null };
      if (next.getTime() < prev.start.getTime()) return { start: next, end: null };
      return { start: prev.start, end: next };
    });
    setQuickKey('custom');
  };

  const handleQuick = (key) => {
    if (key === 'custom') {
      setQuickKey('custom');
      return;
    }
    const opt = ACCESS_PERIOD_QUICK.find((o) => o.key === key);
    if (!opt) return;
    const startDate = today;
    const endDate = opt.resolveEnd(startDate);
    setRange({ start: startDate, end: endDate });
    setQuickKey(key);
    setViewMonth(firstOfMonth(startDate));
  };

  const commitApprove = () => {
    if (!ready) return;
    const lo = start.getTime() <= end.getTime() ? start : end;
    const hi = start.getTime() <= end.getTime() ? end : start;
    onApprove({ periodStart: isoFormat(lo), periodEnd: isoFormat(hi) });
  };

  const calendarPair = (
    <div
      className='scrollbar-thin flex min-h-0 w-full min-w-0 flex-1 flex-row flex-wrap content-start items-stretch justify-center overflow-x-hidden overflow-y-auto'
      style={{ background: 'var(--surface-card-100)', gap: 'var(--dim-space-200)' }}
    >
      <div className='flex min-w-0 justify-center' style={{ flex: '0 1 320px', maxWidth: '100%' }}>
        <Calendar
          viewMonth={viewMonth}
          mode='range'
          selection={range}
          minDate={minDate}
          onSelect={handleRangeSelect}
          onNavigate={(delta) => setViewMonth((m) => addMonthsFirst(m, delta))}
          showLeftChevron
          showRightChevron={false}
        />
      </div>
      <div className='flex min-w-0 justify-center' style={{ flex: '0 1 320px', maxWidth: '100%' }}>
        <Calendar
          viewMonth={rightMonth}
          mode='range'
          selection={range}
          minDate={minDate}
          onSelect={handleRangeSelect}
          onNavigate={(delta) => setViewMonth((m) => addMonthsFirst(m, delta))}
          showLeftChevron={false}
          showRightChevron
        />
      </div>
    </div>
  );

  return (
    <Popup
      open={open}
      onClose={onClose}
      title='ระบุระยะเวลาที่ให้เข้าถึงข้อมูล'
      subtitle='ระบุระยะเวลาที่ให้เข้าถึงข้อมูลก่อนการอนุมัติ'
      width={1024}
      primaryAction={{
        label: 'อนุมัติ',
        leadingIcon: 'check',
        onClick: commitApprove,
        disabled: !ready,
      }}
      secondaryAction={{ label: 'ยกเลิก', onClick: onClose }}
    >
      <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
        <PatientSummaryCard
          avatarUrl={record.avatarSrc || accessAvatarForGroup(record.group, record.id || 0)}
          avatarAlt={record.name}
          cells={[
            { label: 'ผู้ขอ (เจ้าหน้าที่)', value: record.name },
            { label: 'รหัสพนักงาน', value: record.empCode },
            { label: 'เลขที่คำขอ', value: record.reqNo },
            {
              label: 'กิจกรรม / กิจกรรมย่อย / แผนก',
              children: <AccessOrgBadges record={record} />,
            },
          ]}
        />

        {invalidOrder && (
          <span style={ERROR_TEXT}>วันสิ้นสุดต้องไม่ก่อนวันเริ่มต้น</span>
        )}

        <div
          className='flex min-h-0 w-full min-w-0 flex-col overflow-hidden lg:flex-row lg:items-stretch'
          style={{
            border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
            borderRadius: 'var(--dim-radius-400)',
            maxHeight: 'min(620px, calc(100dvh - 9rem))',
          }}
        >
          <div
            className='flex w-full shrink-0 flex-col overflow-hidden border-b border-solid lg:w-64 lg:border-b-0 lg:border-r'
            style={{
              gap: 'var(--dim-space-300)',
              padding: 'var(--dim-space-300)',
              background: 'var(--surface-popup-quickoptions)',
              borderColor: 'var(--border-popup-quickoptions)',
            }}
          >
            <p
              style={{
                color: 'var(--brand-p600)',
                fontFamily: 'var(--type-family-body)',
                fontSize: 'var(--type-size-xs)',
                fontWeight: 'var(--type-weight-medium)',
                lineHeight: 1.5,
                margin: 'var(--dim-space-0)',
              }}
            >
              ตัวเลือกด่วน
            </p>
            <p
              style={{
                color: 'var(--text-content-tertiary)',
                fontFamily: 'var(--type-family-body)',
                fontSize: 'var(--type-size-xs)',
                lineHeight: 1.5,
                margin: 'var(--dim-space-0)',
              }}
            >
              นับตั้งแต่วันที่ทำการยืนยัน
            </p>
            <div className='scrollbar-thin flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden' style={{ WebkitOverflowScrolling: 'touch' }}>
              <div className='flex w-full flex-col' style={{ gap: 'var(--dim-space-050)' }}>
                {ACCESS_PERIOD_QUICK.map((opt) => (
                  <PeriodQuickRow
                    key={opt.key}
                    option={opt}
                    selected={quickKey === opt.key}
                    onClick={() => handleQuick(opt.key)}
                  />
                ))}
                <PeriodQuickRow
                  option={ACCESS_PERIOD_QUICK_CUSTOM}
                  selected={quickKey === 'custom'}
                  onClick={() => handleQuick('custom')}
                />
              </div>
            </div>
          </div>
          {calendarPair}
        </div>
      </div>
    </Popup>
  );
}

/* ══ รายละเอียดคำขอ (17.3) ═════════════════════════════════════════════ */

/* Card + profile photo — pattern เดียวกับ ConsentAuditBar (view mode) / คอลัมน์ผู้ขอในตาราง */
const RequesterProfileCard = ({ record }) => (
  <div
    className='flex items-center min-w-0 w-full'
    style={{
      gap: 'var(--dim-space-300)',
      padding: 'var(--dim-space-300) var(--dim-space-400)',
      background: 'var(--surface-card-200, #FDFDFD)',
      border: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary, #F4F5F5)',
      borderRadius: 'var(--dim-radius-300)',
    }}
  >
    <StaffProfileAvatar
      staff={{
        name: record.name,
        avatarSrc: record.avatarSrc || accessAvatarForGroup(record.group, record.id || 0),
      }}
      size={36}
    />
    <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-0)', flex: 1 }}>
      <span style={{
        ...BODY_TEXT,
        color: 'var(--text-content-default)',
        fontWeight: 'var(--type-weight-medium)',
      }}
      >
        {record.name}
      </span>
      <span style={{ ...BODY_TEXT, color: 'var(--text-content-tertiary)', fontSize: 'var(--type-size-xs)' }}>
        {record.empCode}
      </span>
    </div>
    {record.group ? (
      <ColorfulBadge
        style={GROUP_TONE[record.group] || 'grey'}
        size='small'
        hierarchy='secondary'
        width='hug'
      >
        {record.group}
      </ColorfulBadge>
    ) : null}
  </div>
);

const ROW_DIVIDER = 'var(--dim-stroke-100) solid var(--border-neutral-quaternary, #E2E4E6)';

const DetailRow = ({ label, value, children, isLast = false }) => {
  const content = children ?? value;
  const isText = typeof content === 'string' || content == null;
  return (
  <div
    className='flex items-start w-full'
    style={{
      gap: 'var(--dim-space-300)',
      paddingTop: 'var(--dim-space-200)',
      paddingBottom: 'var(--dim-space-200)',
      borderBottom: isLast ? undefined : ROW_DIVIDER,
    }}
  >
    <span style={{
      width: 240,
      flexShrink: 0,
      whiteSpace: 'nowrap',
      ...BODY_TEXT,
      color: 'var(--text-content-tertiary)',
    }}
    >
      {label}
    </span>
    {isText ? (
      <span style={{ flex: 1, ...BODY_TEXT, color: 'var(--text-content-default)', fontWeight: 'var(--type-weight-medium)' }}>{content || '-'}</span>
    ) : (
      <div className='min-w-0' style={{ flex: 1 }}>{content}</div>
    )}
  </div>
  );
};

export function AccessDetailPopup({ open, record, onClose, thaiDateOfIso, onApprove, onReject }) {
  if (!record) return null;
  const meta = ACCESS_STATUS[record.status] || {};
  return (
    <Popup
      open={open}
      onClose={onClose}
      size='large'
      title='รายละเอียดสิทธิการเข้าถึง'
      primaryAction={{
        label: 'อนุมัติ',
        leadingIcon: 'check',
        onClick: () => { onClose(); onApprove?.(record); },
        disabled: !meta.canApprove,
      }}
      secondaryAction={{
        label: 'ไม่อนุมัติ',
        leadingIcon: 'close',
        onClick: () => { onClose(); onReject?.(record); },
        disabled: !meta.canReject,
      }}
    >
      <div className='flex flex-col w-full'>
        <DetailRow label='สถานะ'>
          <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-150)' }}>
            <ColorfulBadge style={record.active ? 'green' : 'grey'} size='small' hierarchy='secondary' width='hug'>
              {record.active ? 'Active' : 'Inactive'}
            </ColorfulBadge>
            <ColorfulBadge style={meta.tone || 'grey'} size='small' hierarchy='secondary' width='hug'>{record.status}</ColorfulBadge>
          </div>
        </DetailRow>
        <DetailRow label='เลขที่คำขอ' value={record.reqNo} />
        <DetailRow label='ผู้ขอ (เจ้าหน้าที่)'>
          <RequesterProfileCard record={record} />
        </DetailRow>
        <DetailRow
          label='กิจกรรม / กิจกรรมย่อย / แผนก'
          value={[record.group, record.subBranch, record.dept].filter(Boolean).join(' · ') || '-'}
        />
        <DetailRow label='ประเภทการขอ' value={record.accessTypeLabel || '-'} />
        <DetailRow
          label='แบบฟอร์มที่ขอเข้าถึง'
          value={record.formName ? `${record.formCode ? `${record.formCode} · ` : ''}${record.formName}` : '-'}
        />
        <DetailRow label='เหตุผลที่ขอ' value={record.reason || '-'} />
        <DetailRow label='บันทึกเพิ่มเติม' value={record.note || '-'} />
        <DetailRow label='ผู้รับบริการ' value={accessPatientLabel(record)} />
        <DetailRow
          label='ช่วงวันที่ผู้ขอเสนอ'
          value={record.requestedPeriodStart && record.requestedPeriodEnd
            ? `${thaiDateOfIso(record.requestedPeriodStart)} – ${thaiDateOfIso(record.requestedPeriodEnd)}`
            : '-'}
        />
        <DetailRow label='วัตถุประสงค์' value={record.purpose} />
        <DetailRow
          label='ช่วงเวลาสิทธิ'
          isLast
          value={record.periodStart
            ? `${thaiDateOfIso(record.periodStart)} – ${thaiDateOfIso(record.periodEnd)}`
            : 'ยังไม่กำหนด (รออนุมัติ)'}
        />
      </div>
    </Popup>
  );
}
