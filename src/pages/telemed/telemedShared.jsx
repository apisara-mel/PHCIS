import React from 'react';
import Icon from '@/components/icons/Icon';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import { FilterDropdown } from '@/components/forms/FilterTag';
import { TELEMED_ROLE_OPTIONS, getTelemedRole } from '@/utils/telemedAccess';
import { startTelemedAuditMirror } from '@/utils/telemedAuditPersist';

/* Page-local helpers ของโมดูล Telemedicine (เทียบ pattern กับ
   src/pages/clinic/tb/tbShared.jsx) — ไม่ใช่ design-system component,
   ใช้ภายในโฟลเดอร์ src/pages/telemed เท่านั้น. */

/* TOR §1.13.11 — เริ่มสะท้อน audit ของโมดูลลงเครื่องตั้งแต่หน้าแรกที่ถูกโหลด
   ไม่ใช่ตอนเปิดหน้ารายงาน มิฉะนั้นเหตุการณ์ที่เกิดก่อนเข้าหน้ารายงานจะไม่ถูก
   เก็บ. ฟังก์ชันนี้ idempotent (เรียกซ้ำได้) และ try/catch ครบ จึงไม่ทำให้
   หน้าจอพังแม้ localStorage ถูกปิด. */
startTelemedAuditMirror();

export const TELEMED_BREADCRUMB = (leaf) => ['ระบบ Telemedicine', leaf];

/* ── ตัวแปลงค่าจาก FilterDateTag → ช่วงวันจริง ──────────────────────────
   FilterDateTag ส่งกลับแค่ { quick } เมื่อเลือก preset (ไม่ส่งวันที่มาด้วย)
   และ { quick:'custom', tab, single, range } เมื่อเลือกจากปฏิทิน — ทุกหน้า
   ในโมดูลนี้จึงต้องแปลงเป็น {start,end} เองก่อนนำไปกรองแถว ไม่งั้นชิปจะ
   "ติ๊กได้แต่ผลลัพธ์ไม่เปลี่ยน" (ปัญหาที่ audit จับได้). */
const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const endOfDay = (d) => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
const endOfMonth = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);

/** แปลง value ของ FilterDateTag เป็น { start, end } (Date) — null = ไม่จำกัดช่วง */
export const resolveDateRange = (value, today = new Date()) => {
  const t = startOfDay(today);
  const day = (d) => ({ start: startOfDay(d), end: endOfDay(d) });
  const back = (n) => ({ start: addDays(t, -(n - 1)), end: endOfDay(t) });
  const quick = value?.quick;
  switch (quick) {
    case 'today':          return day(t);
    case 'yesterday':      return day(addDays(t, -1));
    case 'tomorrow':       return day(addDays(t, 1));
    case 'monthStart':     return day(startOfMonth(t));
    case 'monthEnd':       return day(endOfMonth(t));
    case 'lastMonthStart': return day(startOfMonth(new Date(t.getFullYear(), t.getMonth() - 1, 1)));
    case 'lastMonthEnd':   return day(endOfMonth(new Date(t.getFullYear(), t.getMonth() - 1, 1)));
    case 'todayLastYear':  return day(new Date(t.getFullYear() - 1, t.getMonth(), t.getDate()));
    case 'last7':
    case '7days':          return back(7);
    case 'last30':
    case '30days':         return back(30);
    case 'thisweek': {
      const s = addDays(t, -((t.getDay() + 6) % 7));
      return { start: startOfDay(s), end: endOfDay(addDays(s, 6)) };
    }
    case 'thisMonth':
    case 'thismonth':      return { start: startOfMonth(t), end: endOfMonth(t) };
    case 'lastmonth': {
      const prev = new Date(t.getFullYear(), t.getMonth() - 1, 1);
      return { start: startOfMonth(prev), end: endOfMonth(prev) };
    }
    case 'thisyear':       return { start: new Date(t.getFullYear(), 0, 1), end: new Date(t.getFullYear(), 11, 31, 23, 59, 59, 999) };
    case 'lastyear':       return { start: new Date(t.getFullYear() - 1, 0, 1), end: new Date(t.getFullYear() - 1, 11, 31, 23, 59, 59, 999) };
    case 'custom': {
      if (value.tab === 'single' && value.single) return day(new Date(value.single));
      if (value.range?.start && value.range?.end) {
        return { start: startOfDay(new Date(value.range.start)), end: endOfDay(new Date(value.range.end)) };
      }
      return null;
    }
    default: return null;
  }
};

/** true เมื่อ ISO/Date `at` อยู่ในช่วงที่ resolveDateRange คืนมา (null = ผ่านหมด) */
export const inDateRange = (at, range) => {
  if (!range) return true;
  if (!at) return false;
  const ms = new Date(at).getTime();
  if (Number.isNaN(ms)) return false;
  return ms >= range.start.getTime() && ms <= range.end.getTime();
};

/** yyyy-mm-dd สำหรับ <input type='date'> */
export const toDateInputValue = (d) => {
  const x = new Date(d);
  const p = (n) => String(n).padStart(2, '0');
  return `${x.getFullYear()}-${p(x.getMonth() + 1)}-${p(x.getDate())}`;
};

/** การ์ดสีอ่อนสำหรับ banner ระดับหน้า (ไม่ใช้ Alert เมื่อไม่ต้องการ close/scroll) */
export const PageBanner = ({ tone = 'info', icon, title, children, actions }) => {
  const map = {
    info:    { bg: 'var(--surface-alert-info, #F0F6FF)',     bd: 'var(--border-alert-info, #DBEAFE)',     fg: 'var(--text-alert-info, #1D4ED8)' },
    warning: { bg: 'var(--surface-alert-warning, #FFF9F0)',  bd: 'var(--border-alert-warning, #FFEDD5)',  fg: 'var(--text-alert-warning, #C2410C)' },
    danger:  { bg: 'var(--surface-alert-error, #FFF0F0)', bd: 'var(--border-alert-error, #FEE2E2)', fg: 'var(--text-alert-error, #B91C1C)' },
    success: { bg: 'var(--surface-alert-success, #F4FBFA)', bd: 'var(--border-alert-success, #D1F6EE)', fg: 'var(--text-alert-success, #196C65)' },
  };
  const c = map[tone] || map.info;
  return (
    <div
      className='flex items-start w-full'
      style={{
        gap: 'var(--dim-space-300)',
        borderRadius: 'var(--dim-radius-400, 12px)',
        border: 'var(--dim-stroke-100) solid ' + c.bd,
        background: c.bg,
        paddingTop: 'var(--dim-space-300)',
        paddingBottom: 'var(--dim-space-300)',
        paddingLeft: 'var(--dim-space-400)',
        paddingRight: 'var(--dim-space-400)',
      }}
    >
      <Icon name={icon || 'info'} size={20} style={{ color: c.fg, flexShrink: 0 }} />
      <div className='flex-1 min-w-0'>
        {title && (
          <div style={{ fontWeight: 'var(--type-weight-bold, 700)', fontSize: 'var(--type-size-sm)', color: c.fg }}>
            {title}
          </div>
        )}
        <div style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary)', lineHeight: 1.6 }}>
          {children}
        </div>
      </div>
      {actions ? <div className='flex items-center' style={{ gap: 'var(--dim-space-200)' }}>{actions}</div> : null}
    </div>
  );
};

/** ตัวสลับบทบาท — ทำให้สาธิตสถานะ "สิทธิ์ไม่พอ" ได้ทุกหน้าโดยไม่ต้อง login ใหม่ */
export const RoleSwitcher = ({ role, onChange }) => (
  <div className='flex items-center' style={{ gap: 'var(--dim-space-200)' }}>
    <span
      className='inline-flex items-center'
      style={{ gap: 'var(--dim-space-100)', fontSize: 'var(--type-size-sm)', color: 'var(--text-content-tertiary)' }}
    >
      <Icon name='badge' size={16} />
      บทบาท:
    </span>
    <FilterDropdown
      prefix=''
      options={TELEMED_ROLE_OPTIONS}
      value={role}
      onChange={onChange}
      size='lg'
    />
    <ColorfulBadge style='indigo' size='small' hierarchy='secondary'>
      {getTelemedRole(role).user}
    </ColorfulBadge>
  </div>
);

/** การ์ดเนื้อหาสีขาวมาตรฐานของหน้า queue/report ในโมดูลนี้ */
export const ContentCard = ({ children, style }) => (
  <div
    className='w-full flex flex-col'
    style={{
      background: 'var(--surface-card-100)',
      borderRadius: 'var(--dim-radius-500)',
      border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
      boxShadow: 'var(--shadow-card-strong)',
      paddingTop: 'var(--dim-space-600)',
      paddingBottom: 'var(--dim-space-600)',
      paddingLeft: 'var(--dim-space-600)',
      paddingRight: 'var(--dim-space-600)',
      gap: 'var(--dim-space-600)',
      ...style,
    }}
  >
    {children}
  </div>
);

/** Empty state กลางการ์ด — แยกข้อความ "ยังไม่มีข้อมูล" ออกจาก "ค้นหาไม่พบ" */
export const EmptyState = ({ icon = 'inbox', title, hint, action }) => (
  <div
    className='flex flex-col items-center text-center w-full'
    style={{
      paddingTop: 'var(--dim-space-800)',
      paddingBottom: 'var(--dim-space-800)',
      gap: 'var(--dim-space-300)',
    }}
  >
    <Icon name={icon} size={40} style={{ color: 'var(--text-content-quaternary, #ADB2B7)' }} />
    <span style={{ color: 'var(--text-content-secondary)', fontSize: 'var(--type-size-base)' }}>{title}</span>
    {hint && (
      <span style={{ color: 'var(--text-content-tertiary)', fontSize: 'var(--type-size-sm)' }}>{hint}</span>
    )}
    {action}
  </div>
);

/** แถบ "แสดง x–y จาก z รายการ" + Pagination (sticky ล่างการ์ด) */
export const PagerBar = ({ rangeStart, rangeEnd, total, children }) => (
  <div
    className='flex items-center w-full'
    style={{
      gap: 'var(--dim-space-200)',
      position: 'sticky',
      bottom: 'var(--dim-space-0)',
      zIndex: 50,
      background: 'var(--surface-card-100)',
      paddingTop: 'var(--dim-space-200)',
      borderTop: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
    }}
  >
    <span
      style={{
        color: 'var(--text-content-secondary)',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-sm)',
      }}
    >
      {`แสดง ${rangeStart}–${rangeEnd} จาก ${total} รายการ`}
    </span>
    <div className='flex-1' />
    {children}
  </div>
);

/** ข้อความ "ผู้บันทึก + เวลา" ท้ายแถว/การ์ด (audit trail บน UI) */
export const AuditStamp = ({ by, at, action }) => {
  if (!by && !at) return null;
  const time = at
    ? new Date(at).toLocaleString('th-TH', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
    : '';
  return (
    <span
      className='inline-flex items-center'
      style={{ gap: 'var(--dim-space-100)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}
    >
      <Icon name='history' size={12} />
      {[action, by, time].filter(Boolean).join(' · ')}
    </span>
  );
};
