import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import Icon from '@/components/icons/Icon';
import Dropdown from '@/components/forms/Dropdown';
import InputField from '@/components/forms/InputField';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import Tooltip from '@/components/tooltip/Tooltip';
import NeutralSubdueIconButton from '@/components/button/NeutralSubdueIconButton';
import {
  QUEUE_ROLES,
  getQueueActor,
  setQueueActorRole,
  subscribeQueueCenter,
  subscribeQueueSettings,
  statusMeta,
  queueTypeMeta,
  URGENCY_LEVELS,
  maskIdentifier,
  logPiiReveal,
} from '@/data/queueCenterStore';

/* ────────────────────────────────────────────────────────────────────────
   queueCenterShared — ชิ้นส่วนที่ทั้ง 4 หน้าของ /queue-center ใช้ร่วมกัน

   แยกออกมาเป็นไฟล์ย่อยตั้งแต่ต้นตามข้อกังวลเรื่องขนาดไฟล์ในสเปก
   (QueueCenterConsolePage รวม TOR 1.3.1 / 1.3.3 / 1.3.5 ไว้หน้าเดียว)

   ทุกชิ้นเป็น "ประกอบจากคอมโพเนนต์ DS เดิม" ไม่ใช่คอมโพเนนต์ใหม่ของ
   design system — จึงอยู่ในโฟลเดอร์โมดูล ไม่ใช่ src/components/
   ──────────────────────────────────────────────────────────────────────── */

/* React 17 — ห้าม useSyncExternalStore. ใช้ useEffect + tick แบบ
   labPrintSettings.js (คู่มือ playbook §2 ข้อ 3) */
export const useQueueCenter = () => {
  const [tick, setTick] = useState(0);
  useEffect(() => subscribeQueueCenter(() => setTick((t) => t + 1)), []);
  return tick;
};

/* ────────────────────────────────────────────────────────── DraftInputField
   InputField ที่เก็บ "ค่าดิบที่กำลังพิมพ์" ไว้ใน local state แล้วค่อย commit
   ตอน blur

   ทำไมต้องมี: เดิมทุกช่องตัวเลขในหน้าตั้งค่า/หน้าเชื่อมต่อ clamp ทุก keystroke
   (`Math.max(1, Number(val) || 0)`) ผลคือ
     1. ลบค่าทิ้งเพื่อพิมพ์ใหม่ไม่ได้ — ช่องเด้งกลับเป็นค่าต่ำสุดทันทีที่ลบตัวสุดท้าย
     2. ค่าที่ผิดกติกาไปไม่ถึง store ข้อความ error ที่ผูกไว้ ('ต้องประกาศอย่างน้อย
        1 ครั้ง', 'จำนวนหลักต้องอย่างน้อย 1', 'ต้องอย่างน้อย 20 ตัวอักษร',
        'ต้องมากกว่า 0') จึงไม่มีทางแสดง = validation ที่ checklist อ้างถึงเป็น
        dead code

   จึง commit ค่าที่ผู้ใช้พิมพ์จริง (ไม่ clamp) แล้วปล่อยให้ prop `error` ของ
   แต่ละช่องเป็นคนแจ้ง — ฝั่ง consumer ใน store กันค่าเพี้ยนไว้แล้ว
   (previewQueueCode / roundWindowMinutes ใช้ Math.max, isOverdue เทียบ NaN
   ได้ false)                                                              */
export const DraftInputField = ({ value, onCommit, parse, ...rest }) => {
  const [draft, setDraft] = useState(null);
  const shown = draft == null ? String(value ?? '') : draft;
  return (
    <InputField
      {...rest}
      value={shown}
      onChange={(val) => setDraft(String(val ?? ''))}
      onBlur={() => {
        if (draft == null) return;
        const raw = draft;
        setDraft(null);
        onCommit(parse ? parse(raw) : raw);
      }}
    />
  );
};

/** ตัวเลขจากช่องกรอก — ว่าง = ว่าง (ไม่ใช่ 0) เพื่อให้ error แสดงได้ */
export const toNumberDraft = (raw) => (String(raw).trim() === '' ? '' : Number(raw));

export const useQueueSettingsTick = () => {
  const [tick, setTick] = useState(0);
  useEffect(() => subscribeQueueSettings(() => setTick((t) => t + 1)), []);
  return tick;
};

/* ─────────────────────────────────────────────────────────────── layout */

export const PAGE_BODY_STYLE = {
  paddingTop: 'var(--dim-space-600)',
  paddingRight: 'var(--dim-space-600)',
  paddingBottom: 'var(--dim-space-600)',
  paddingLeft: 'var(--dim-space-600)',
  gap: 'var(--dim-space-600)',
};

export const CARD_STYLE = {
  background: 'var(--surface-card-100)',
  borderRadius: 'var(--dim-radius-500, 16px)',
  border: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary)',
  boxShadow: 'var(--shadow-card-strong)',
  paddingTop: 'var(--dim-space-600)',
  paddingRight: 'var(--dim-space-600)',
  paddingBottom: 'var(--dim-space-600)',
  paddingLeft: 'var(--dim-space-600)',
  gap: 'var(--dim-space-500)',
};

export const SectionCard = ({ icon, title, subtitle, action, children, footer }) => (
  <section className='w-full flex flex-col' style={CARD_STYLE}>
    <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-300)' }}>
      {icon ? (
        <div
          className='shrink-0 inline-flex items-center justify-center'
          style={{
            width: 'var(--dim-size-800, 40px)',
            height: 'var(--dim-size-800, 40px)',
            borderRadius: 'var(--dim-radius-300, 10px)',
            background: 'var(--surface-brandPrimary-quaternary)',
            color: 'var(--text-brandPrimary-default)',
          }}
        >
          <Icon name={icon} size={20} />
        </div>
      ) : null}
      <div className='flex-1 min-w-0 flex flex-col' style={{ gap: 'var(--dim-space-050)' }}>
        <h2
          style={{
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-base, 16px)',
            fontWeight: 'var(--type-weight-bold, 700)',
            color: 'var(--text-content-primary)',
          }}
        >
          {title}
        </h2>
        {subtitle ? (
          <p
            style={{
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-xs, 12px)',
              color: 'var(--text-content-tertiary)',
            }}
          >
            {subtitle}
          </p>
        ) : null}
      </div>
      {action}
    </div>
    {children}
    {footer}
  </section>
);

export const FieldLabel = ({ children, required }) => (
  <span
    style={{
      fontFamily: 'var(--type-family-body)',
      fontSize: 'var(--type-size-xs, 12px)',
      fontWeight: 'var(--type-weight-medium, 500)',
      color: 'var(--text-content-secondary)',
    }}
  >
    {children}
    {required ? <span style={{ color: 'var(--text-input-require)' }}> *</span> : null}
  </span>
);

export const HelperText = ({ children, tone = 'default' }) => (
  <span
    style={{
      fontFamily: 'var(--type-family-body)',
      fontSize: 'var(--type-size-xs, 12px)',
      color: tone === 'error'
        ? 'var(--text-danger-secondary)'
        : 'var(--text-content-tertiary)',
    }}
  >
    {children}
  </span>
);

/* ────────────────────────────────────────────────── สลับบทบาท (สิทธิไม่พอ)

   สเปกกำหนด edge case "สิทธิไม่พอ": ต้องเห็นตารางแต่ปุ่มถูก disable พร้อม
   tooltip และหน้าตั้งค่า/เชื่อมต่อขึ้นแบนเนอร์อ่านอย่างเดียว — ในโหมด mock
   จึงต้องมีวิธีสลับบทบาทเพื่อดูสถานะนั้นได้จริง                            */
export const RoleSwitcher = () => {
  useQueueCenter();
  const actor = getQueueActor();
  return (
    <div className='flex items-center' style={{ gap: 'var(--dim-space-200)' }}>
      <Tooltip content='สลับบทบาทเพื่อดูสถานะสิทธิ (ข้อมูลจำลอง)' position='bottom'>
        <span className='inline-flex items-center' style={{ gap: 'var(--dim-space-100)' }}>
          <Icon name='badge' size={16} style={{ color: 'var(--text-content-tertiary)' }} />
          <span
            style={{
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-xs, 12px)',
              color: 'var(--text-content-tertiary)',
            }}
          >
            บทบาท
          </span>
        </span>
      </Tooltip>
      <Dropdown
        size='sm'
        value={actor.key}
        onChange={setQueueActorRole}
        options={QUEUE_ROLES.map((r) => ({ value: r.key, label: r.role }))}
        className='w-56'
      />
    </div>
  );
};

export const ReadOnlyBanner = () => null;

export const EmptyState = ({ icon = 'inbox', title, description, action }) => (
  <div
    className='w-full flex flex-col items-center justify-center'
    style={{
      gap: 'var(--dim-space-300)',
      paddingTop: 'var(--dim-space-1200)',
      paddingBottom: 'var(--dim-space-1200)',
      paddingLeft: 'var(--dim-space-600)',
      paddingRight: 'var(--dim-space-600)',
    }}
  >
    <div
      className='inline-flex items-center justify-center'
      style={{
        width: 'var(--dim-size-1700, 80px)',
        height: 'var(--dim-size-1700, 80px)',
        borderRadius: 'var(--dim-radius-full, 9999px)',
        background: 'var(--surface-brandPrimary-quaternary)',
        color: 'var(--text-brandPrimary-default)',
      }}
    >
      <Icon name={icon} size={36} />
    </div>
    <span
      style={{
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-base, 16px)',
        fontWeight: 'var(--type-weight-bold, 700)',
        color: 'var(--text-content-primary)',
      }}
    >
      {title}
    </span>
    {description ? (
      <span
        className='text-center'
        style={{
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-sm, 14px)',
          color: 'var(--text-content-tertiary)',
          maxWidth: 'var(--dim-size-2700, 448px)',
        }}
      >
        {description}
      </span>
    ) : null}
    {action}
  </div>
);

/* ────────────────────────────────────────────────────────────── badges */

export const StatusChip = ({ status }) => {
  const meta = statusMeta(status);
  return (
    <ColorfulBadge style={meta.color} size='small' hierarchy='secondary'>
      {meta.label}
    </ColorfulBadge>
  );
};

export const QueueTypeChip = ({ queueType, urgency }) => {
  const t = queueTypeMeta(queueType);
  const u = URGENCY_LEVELS.find((x) => x.key === urgency);
  return (
    <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-100)' }}>
      <ColorfulBadge style={t.color} size='small' hierarchy='secondary'>{t.label}</ColorfulBadge>
      {u && u.key !== 'normal' ? (
        <ColorfulBadge style={u.color} size='small' hierarchy='primary' icon='priority_high' showIcon>
          {u.label}
        </ColorfulBadge>
      ) : null}
    </div>
  );
};

/** รหัสคิวตัวหนา — ยกเลิกแล้วขีดฆ่า (พฤติกรรมคู่มือ HCIS §2.2) */
export const QueueCodeCell = ({ queue }) => {
  const cancelled = queue.status === 'cancelled';
  return (
    <span
      style={{
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-sm, 14px)',
        fontWeight: 'var(--type-weight-bold, 700)',
        color: cancelled ? 'var(--text-danger-default)' : 'var(--text-brandPrimary-default)',
        textDecoration: cancelled ? 'line-through' : 'none',
      }}
    >
      {queue.code}
    </span>
  );
};

/* ────────────────────────────────── HN ปกปิดจนกดเปิด + บันทึกการเปิดดู */

export const MaskedIdentifier = ({ queueId, field, value, revealed, onRequestReveal, disabled }) => {
  if (!value) return <span style={{ color: 'var(--text-content-tertiary)' }}>—</span>;
  if (revealed) {
    return (
      <span
        style={{
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-sm, 14px)',
          color: 'var(--text-content-primary)',
        }}
      >
        {value}
      </span>
    );
  }
  return (
    <span className='inline-flex items-center' style={{ gap: 'var(--dim-space-100)' }}>
      <span
        style={{
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-sm, 14px)',
          color: 'var(--text-content-tertiary)',
          letterSpacing: '0.04em',
        }}
      >
        {maskIdentifier(value)}
      </span>
      <Tooltip content={disabled ? 'ไม่มีสิทธิเปิดดูข้อมูลส่วนบุคคล' : 'กดเพื่อเปิดดู (บันทึกการเข้าถึง)'} position='top'>
        <NeutralSubdueIconButton
          icon='visibility'
          size='sm'
          variant='outline'
          disabled={disabled}
          aria-label={`เปิดดู ${field}`}
          onClick={disabled ? undefined : (e) => { e.stopPropagation(); onRequestReveal?.({ queueId, field, value }); }}
        />
      </Tooltip>
    </span>
  );
};

export const recordPiiReveal = (queueId, field) => logPiiReveal(queueId, field);

/* ────────────────────────────────────────── นาทีที่รอ + ป้ายเกินเกณฑ์ */

export const WaitCell = ({ minutes, overdue, threshold }) => (
  <span className='inline-flex items-center' style={{ gap: 'var(--dim-space-100)' }}>
    <span
      style={{
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-sm, 14px)',
        fontWeight: overdue ? 'var(--type-weight-bold, 700)' : 'var(--type-weight-regular, 400)',
        color: overdue ? 'var(--text-danger-default)' : 'var(--text-content-primary)',
      }}
    >
      {minutes} นาที
    </span>
    {overdue ? (
      <Tooltip content={`เกินเกณฑ์ ${threshold} นาที (ตั้งค่าที่หน้าตั้งค่าระบบคิว)`} position='top'>
        <span className='inline-flex'>
          <Icon name='running_with_errors' size={16} style={{ color: 'var(--text-danger-default)' }} />
        </span>
      </Tooltip>
    ) : null}
  </span>
);

/* ────────────────────────────────────────────────── แถบเมนูย่อยของโมดูล */

const SUB_NAV = [
  { path: '/queue-center/kiosk-settings', label: 'ตั้งค่าตู้บริการ', icon: 'print', exact: false },
  { path: '/queue-center/ticket-settings', label: 'ตั้งค่าใบคิว',     icon: 'receipt_long', exact: false },
  { path: '/queue-center/display',     label: 'ตั้งค่าจอแสดงผลการเรียกคิว', icon: 'tv',   exact: false },
];

export const QueueCenterSubNav = () => (
  <nav
    className='w-full flex items-center overflow-x-auto'
    style={{
      gap: 'var(--dim-space-100)',
      paddingTop: 'var(--dim-space-200)',
      paddingLeft: 'var(--dim-space-300)',
      paddingRight: 'var(--dim-space-300)',
      background: 'var(--surface-brandPrimary-quaternary)',
      border: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-tertiary)',
      borderRadius: 'var(--dim-radius-500, 16px)',
      boxShadow: 'var(--shadow-card)',
      whiteSpace: 'nowrap',
    }}
    role='tablist'
    aria-label='เมนูระบบบริหารจัดการคิว'
  >
    {SUB_NAV.map((item) => (
      <NavLink
        key={item.path}
        to={item.path}
        exact={item.exact}
        className='inline-flex items-center shrink-0'
        role='tab'
        style={{
          gap: 'var(--dim-space-150)',
          borderBottom: 'var(--dim-stroke-200, 2px) solid transparent',
          color: 'var(--text-content-secondary)',
          paddingTop: 'var(--dim-space-300)',
          paddingRight: 'var(--dim-space-400)',
          paddingBottom: 'var(--dim-space-300)',
          paddingLeft: 'var(--dim-space-400)',
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-sm, 14px)',
          fontWeight: 'var(--type-weight-medium, 500)',
          textDecoration: 'none',
        }}
        activeStyle={{
          background: 'var(--surface-card-100)',
          borderTopLeftRadius: 'var(--dim-radius-300, 10px)',
          borderTopRightRadius: 'var(--dim-radius-300, 10px)',
          borderBottomColor: 'var(--border-brandPrimary-default, var(--brand-p600))',
          color: 'var(--text-brandPrimary-default)',
          fontWeight: 'var(--type-weight-bold, 700)',
        }}
      >
        <Icon name={item.icon} size={16} />
        {item.label}
      </NavLink>
    ))}
  </nav>
);

/* ─────────────────────────────────── ชิปจุดบริการ + จุดเตือน SLA (1.3.7.2) */

export const StationChipBar = ({ stations, activeId, onSelect, summaryOf }) => (
  <div
    className='w-full flex items-center flex-wrap'
    style={{ gap: 'var(--dim-space-200)', paddingBottom: 'var(--dim-space-200)' }}
    role='tablist'
    aria-label='จุดบริการทั้งหมด'
  >
    {stations.map((st) => {
      const s = summaryOf(st.id);
      const selected = st.id === activeId;
      return (
        <button
          key={st.id}
          type='button'
          role='tab'
          aria-selected={selected}
          onClick={() => onSelect(st.id)}
          className='inline-flex items-center relative'
          style={{
            gap: 'var(--dim-space-150)',
            borderRadius: 'var(--dim-radius-600, 24px)',
            border: `var(--dim-stroke-100, 1px) solid ${selected ? 'var(--border-brandPrimary-tertiary, var(--border-brandPrimary-quaternary))' : 'var(--border-neutral-tertiary)'}`,
            background: selected ? 'var(--surface-brandPrimary-quaternary)' : 'var(--surface-card-100)',
            color: selected ? 'var(--text-brandPrimary-default)' : 'var(--text-content-secondary)',
            opacity: st.active ? 1 : 0.55,
            paddingTop: 'var(--dim-space-100)',
            paddingRight: 'var(--dim-space-300)',
            paddingBottom: 'var(--dim-space-100)',
            paddingLeft: 'var(--dim-space-300)',
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-xs, 12px)',
            fontWeight: selected ? 'var(--type-weight-bold, 700)' : 'var(--type-weight-medium, 500)',
          }}
          title={st.active ? `${st.label} · ${st.zone} ${st.floor}` : `${st.label} — ปิดรับคิวชั่วคราว`}
        >
          <span
            style={{
              fontWeight: 'var(--type-weight-bold, 700)',
              color: selected ? 'var(--text-brandPrimary-default)' : 'var(--text-content-primary)',
            }}
          >
            {st.prefix}
          </span>
          {st.label}
          <span
            className='inline-flex items-center justify-center'
            style={{
              minWidth: 'var(--dim-size-300, 16px)',
              height: 'var(--dim-size-300, 16px)',
              borderRadius: 'var(--dim-radius-full, 9999px)',
              background: 'var(--surface-neutral-tertiary)',
              color: 'var(--text-content-secondary)',
              fontSize: 'var(--type-size-xxs, 10px)',
              paddingLeft: 'var(--dim-space-100)',
              paddingRight: 'var(--dim-space-100)',
            }}
          >
            {s.remaining}
          </span>
          {s.overdue > 0 ? (
            <span
              aria-label={`มี ${s.overdue} คิวรอเกินเกณฑ์`}
              style={{
                position: 'absolute',
                top: 'var(--dim-space-0)',
                right: 'var(--dim-space-0)',
                width: 'var(--dim-space-200, 8px)',
                height: 'var(--dim-space-200, 8px)',
                borderRadius: 'var(--dim-radius-full, 9999px)',
                background: 'var(--surface-dangerButton-default)',
              }}
            />
          ) : null}
        </button>
      );
    })}
  </div>
);

/* ───────────────────────────────────────────────────── pagination footer */

export const PaginationFooter = ({ rangeStart, rangeEnd, total, children }) => (
  <div
    className='flex items-center w-full'
    style={{
      gap: 'var(--dim-space-200)',
      position: 'sticky',
      bottom: 'var(--dim-space-0)',
      zIndex: 50,
      background: 'var(--surface-card-100)',
      paddingTop: 'var(--dim-space-200)',
      borderTop: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary)',
    }}
  >
    <span
      style={{
        color: 'var(--text-content-secondary)',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-sm, 14px)',
      }}
    >
      {`แสดง ${rangeStart}–${rangeEnd} จาก ${total} รายการ`}
    </span>
    <div className='flex-1' />
    {children}
  </div>
);
