import React from 'react';
import { useHistory } from 'react-router-dom';
import Icon from '@/components/icons/Icon';
import BrandButton from '@/components/button/BrandButton';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import { CLINIC_OPTIONS, DEFAULT_CLINIC_VALUE, useClinicFilter } from '@/components/layout/HeaderClinicContext';
import { readActiveCenter, writeActiveCenter } from '@/data/centerStore';
import { appendAuditEvent } from '@/pages/audit/auditData';
import { getUserById } from '@/data/usersAccess';

/* ชิ้นส่วนที่ 7 หน้าจอของ §1.17 ใช้ร่วมกัน — สิทธิ์, audit, ศูนย์ที่กำลังให้บริการ,
   การ์ดหัวข้อ, empty state. ทุกอย่างอยู่ในโฟลเดอร์โมดูล (ไม่ใช่ DS component). */

/** บัญชีที่กำลังใช้งานระบบ (prototype — ยังไม่มี auth store กลาง). */
export const CURRENT_USER_ID = 'u-012';
export const getCurrentUser = () => getUserById(CURRENT_USER_ID);
export const currentUserName = () => getCurrentUser()?.name || 'ผู้ดูแลระบบ';

/** ผู้ดูแลระดับสำนัก — เห็นข้อมูล "ทุกศูนย์" ได้ (คู่มือ MIS หน้า 1-4). */
export const isBureauAdmin = () => {
  const u = getCurrentUser();
  return u?.role === 'admin' && u?.subRole === 'sys-admin';
};

/** ระดับสิทธิ์ของ feature key เดิม: 'edit' | 'view' | null */
export const featureLevel = (key) => getCurrentUser()?.features?.[key] ?? null;
export const canEdit = (key) => featureLevel(key) === 'edit';
export const canView = (key) => featureLevel(key) === 'edit' || featureLevel(key) === 'view';

/** ลง audit trail ของงานผู้ดูแลระบบ — mod คงที่ 'ผู้ดูแลระบบ' ทุกครั้ง. */
export const auditAdmin = (action, ok = true) =>
  appendAuditEvent({ user: currentUserName(), action, mod: 'ผู้ดูแลระบบ', ok });

/* ── ศูนย์ที่กำลังให้บริการ ───────────────────────────────────────────── */

export const centerLabel = (value) =>
  CLINIC_OPTIONS.find((c) => c.value === value)?.label || value || '—';

/**
 * ศูนย์ที่กำลังให้บริการ — อ่านจาก `useClinicFilter()` (แหล่งความจริงเดียว
 * ที่ Header/Sidebar ใช้อยู่) และ persist ผ่าน centerStore เพื่อให้รีเฟรชแล้ว
 * ค่าไม่หาย. ห้ามสร้าง state ศูนย์ชุดใหม่ในหน้าใด ๆ.
 */
export function useActiveCenter() {
  const ctx = useClinicFilter();
  const clinic = ctx?.clinic ?? DEFAULT_CLINIC_VALUE;
  const restored = React.useRef(false);

  React.useEffect(() => {
    if (restored.current || !ctx?.setClinic) return;
    restored.current = true;
    const saved = readActiveCenter();
    if (saved && saved !== clinic && CLINIC_OPTIONS.some((c) => c.value === saved)) {
      ctx.setClinic(saved);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx]);

  const setCenter = React.useCallback((value) => {
    ctx?.setClinic?.(value);
    writeActiveCenter(value);
  }, [ctx]);

  return { center: clinic, label: centerLabel(clinic), setCenter, canSwitch: !!ctx?.setClinic };
}

/* ── UI ชิ้นเล็กที่ใช้ซ้ำ ───────────────────────────────────────────── */

/** การ์ดขาวมาตรฐานของหน้าจอในโมดูลนี้ (เทียบเท่าการ์ดของ AncQueuePage). */
export const ModuleCard = ({ children, style = {}, className = '' }) => (
  <div
    className={`w-full flex flex-col ${className}`}
    style={{
      background: 'var(--surface-card-100)',
      borderRadius: 'var(--dim-radius-500, 16px)',
      border: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary)',
      boxShadow: 'var(--shadow-card-strong)',
      paddingTop: 'var(--dim-space-600, 24px)',
      paddingRight: 'var(--dim-space-600, 24px)',
      paddingBottom: 'var(--dim-space-600, 24px)',
      paddingLeft: 'var(--dim-space-600, 24px)',
      gap: 'var(--dim-space-500, 20px)',
      ...style,
    }}
  >
    {children}
  </div>
);

export const SectionTitle = ({ icon, title, subtitle, action }) => (
  <div className='flex items-start w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
    {icon ? (
      <span
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
      </span>
    ) : null}
    <div className='flex-1 min-w-0 flex flex-col' style={{ gap: 'var(--dim-space-050, 2px)' }}>
      <span
        style={{
          color: 'var(--text-content-primary)',
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-base, 16px)',
          fontWeight: 'var(--type-weight-bold, 700)',
        }}
      >
        {title}
      </span>
      {subtitle ? (
        <span
          style={{
            color: 'var(--text-content-tertiary)',
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-xs, 12px)',
          }}
        >
          {subtitle}
        </span>
      ) : null}
    </div>
    {action}
  </div>
);

/** ป้ายบอกว่า "แก้ไขล่าสุดโดย … เมื่อ …" — เทียบเท่าหน้าต่างประวัติการบันทึกของคู่มือ MIS. */
export const LastEditedNote = ({ by, at, prefix = 'แก้ไขล่าสุดโดย' }) => {
  if (!by && !at) return null;
  return (
    <span
      className='inline-flex items-center'
      style={{
        gap: 'var(--dim-space-150, 6px)',
        color: 'var(--text-content-tertiary)',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-xs, 12px)',
      }}
    >
      <Icon name='history' size={14} />
      {prefix} {by || '—'} เมื่อ {at || '—'}
    </span>
  );
};

/** empty state มาตรฐาน — แยก "ค้นไม่พบ" ออกจาก "ยังไม่มีข้อมูลเลย". */
export const EmptyState = ({ icon = 'inbox', title, subtitle, action }) => (
  <div
    className='flex flex-col items-center justify-center w-full text-center'
    style={{
      gap: 'var(--dim-space-300, 12px)',
      paddingTop: 'var(--dim-space-800, 32px)',
      paddingBottom: 'var(--dim-space-800, 32px)',
      paddingLeft: 'var(--dim-space-600, 24px)',
      paddingRight: 'var(--dim-space-600, 24px)',
    }}
  >
    <span
      className='inline-flex items-center justify-center'
      style={{
        width: 'var(--dim-size-900, 44px)',
        height: 'var(--dim-size-900, 44px)',
        borderRadius: 'var(--dim-radius-full)',
        background: 'var(--surface-brandPrimary-quaternary)',
        color: 'var(--text-brandPrimary-default)',
      }}
    >
      <Icon name={icon} size={24} />
    </span>
    <span
      style={{
        color: 'var(--text-content-primary)',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-sm, 14px)',
        fontWeight: 'var(--type-weight-medium, 500)',
      }}
    >
      {title}
    </span>
    {subtitle ? (
      <span
        style={{
          color: 'var(--text-content-tertiary)',
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-xs, 12px)',
          maxWidth: 420,
        }}
      >
        {subtitle}
      </span>
    ) : null}
    {action}
  </div>
);

/** แถบ "คุณมีสิทธิ์ดูอย่างเดียว" — ใช้ตอน featureLevel === 'view'. */
export const ReadOnlyNotice = ({ feature = 'หน้านี้' }) => (
  <div
    className='flex items-center w-full'
    style={{
      gap: 'var(--dim-space-200, 8px)',
      paddingTop: 'var(--dim-space-200, 8px)',
      paddingBottom: 'var(--dim-space-200, 8px)',
      paddingLeft: 'var(--dim-space-300, 12px)',
      paddingRight: 'var(--dim-space-300, 12px)',
      borderRadius: 'var(--dim-radius-200, 8px)',
      background: 'var(--surface-pill-yellow)',
      color: 'var(--text-pill-yellow)',
      fontFamily: 'var(--type-family-body)',
      fontSize: 'var(--type-size-xs, 12px)',
    }}
  >
    <Icon name='visibility' size={16} />
    คุณมีสิทธิ์ดูอย่างเดียวสำหรับ{feature} — ปุ่มบันทึก / แก้ไข / ลบ ถูกปิดไว้
  </div>
);

/**
 * ประตูสิทธิ์: ไม่มีสิทธิ์เลย → empty state พร้อมปุ่มกลับ (ห้าม redirect เงียบ ๆ).
 * มีสิทธิ์ view → ส่ง readOnly=true ให้ children ผ่าน render prop.
 */
export const PermissionGate = ({ feature, featureLabel, children }) => {
  const history = useHistory();
  const level = featureLevel(feature);
  if (!level) {
    return (
      <ModuleCard>
        <EmptyState
          icon='lock'
          title='ไม่มีสิทธิ์เข้าถึงหน้านี้'
          subtitle={`บัญชีของคุณยังไม่ได้รับสิทธิ์ "${featureLabel || feature}" — ติดต่อผู้ดูแลระบบเพื่อขอสิทธิ์`}
          action={(
            <BrandButton size='md' leadingIcon='arrow_back' onClick={() => history.push('/users')}>
              กลับไปหน้าผู้ใช้และสิทธิ์
            </BrandButton>
          )}
        />
      </ModuleCard>
    );
  }
  return typeof children === 'function' ? children(level !== 'edit') : children;
};

/** ชิปสถานะ Active/Inactive ที่ใช้ทั้งโมดูล. */
export const ActiveBadge = ({ active }) => (
  <ColorfulBadge style={active ? 'green' : 'grey'} size='small' showDot>
    {active ? 'ใช้งาน' : 'ปิดการใช้งาน'}
  </ColorfulBadge>
);

/** ชิปบอกแหล่งบัญชี (Local / Directory Service). */
export const SourceBadge = ({ source }) => (
  <ColorfulBadge style={source === 'idp' ? 'indigo' : 'grey'} size='small' icon={source === 'idp' ? 'hub' : 'person'}>
    {source === 'idp' ? 'Directory Service' : 'สร้างในระบบ'}
  </ColorfulBadge>
);
