import React from 'react';
import Icon from '@/components/icons/Icon';
import { ROLE_PALETTE } from '@/data/usersAccess';

/* ชิ้นส่วนของหน้าแก้ไขผู้ใช้ — ย้ายมาจาก UserEditPage.jsx เดิม "ทั้งก้อน"
   โดยไม่แก้กลไก (feature matrix 3 ระดับ / role card / department chip)
   เพื่อไม่ให้ของเดิมที่ผ่านการตรวจรับแล้วพัง ตอนแตกหน้าเป็น 4 แท็บ.
   สิ่งเดียวที่เพิ่มคือ `disabled` เพื่อรองรับสิทธิ์ "ดูอย่างเดียว". */

export const ACCESS_OPTIONS = [
  { value: 'none', label: 'ไม่มีสิทธิ์', icon: 'block',      color: 'var(--text-content-tertiary)' },
  { value: 'view', label: 'ดูได้',       icon: 'visibility', color: 'var(--text-colorfulbadge-blue)',   surface: 'var(--surface-colorfulbadge-blue)' },
  { value: 'edit', label: 'แก้ไขได้',     icon: 'edit',       color: 'var(--text-brandPrimary-default)', surface: 'var(--surface-brandPrimary-quaternary)' },
];

/** Section card — การ์ดขาวหัวเรื่อง + เนื้อหา (เหมือนเดิมทุกประการ). */
export const SectionCard = ({ icon, title, subtitle, children, action }) => (
  <section
    className='bg-surface-card rounded-card shadow-card flex flex-col w-full'
    style={{
      paddingTop: 'var(--dim-space-600, 24px)',
      paddingRight: 'var(--dim-space-600, 24px)',
      paddingBottom: 'var(--dim-space-600, 24px)',
      paddingLeft: 'var(--dim-space-600, 24px)',
      gap: 'var(--dim-space-400, 16px)',
    }}
  >
    <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
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
      <div className='flex-1 min-w-0 flex flex-col'>
        <h2 className='text-base font-bold text-ink'>{title}</h2>
        {subtitle && <p className='text-xs text-ink-tertiary'>{subtitle}</p>}
      </div>
      {action}
    </div>
    {children}
  </section>
);

export const RoleRadioCard = ({ role, selected, onSelect, disabled = false }) => {
  const tone = ROLE_PALETTE[role.color] || ROLE_PALETTE.brand;
  return (
    <button
      type='button'
      disabled={disabled}
      onClick={() => onSelect(role.key)}
      className='flex flex-col items-start w-full text-left transition-shadow'
      style={{
        gap: 'var(--dim-space-200, 8px)',
        paddingTop: 'var(--dim-space-300, 12px)',
        paddingRight: 'var(--dim-space-300, 12px)',
        paddingBottom: 'var(--dim-space-300, 12px)',
        paddingLeft: 'var(--dim-space-300, 12px)',
        background: selected ? tone.surface : 'var(--surface-card-100)',
        border: `var(--dim-stroke-100, 1px) solid ${selected
          ? 'var(--border-brandPrimary-default)'
          : 'var(--border-card-default)'}`,
        borderRadius: 'var(--dim-radius-200, 8px)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        boxShadow: selected ? 'var(--shadow-card-hover, none)' : 'none',
      }}
    >
      <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
        <div
          className='shrink-0 inline-flex items-center justify-center'
          style={{
            width: 'var(--dim-size-600, 32px)',
            height: 'var(--dim-size-600, 32px)',
            borderRadius: 'var(--dim-radius-full)',
            background: selected ? 'var(--surface-card-100)' : tone.surface,
            color: tone.text,
          }}
        >
          <Icon name={role.icon} size={18} />
        </div>
        <span
          className='flex-1 min-w-0 text-sm font-bold'
          style={{ color: selected ? tone.text : 'var(--text-content-primary)' }}
        >
          {role.label}
        </span>
        {selected && <Icon name='check_circle' size={18} style={{ color: tone.text }} />}
      </div>
    </button>
  );
};

export const DepartmentChip = ({ dep, selected, onToggle, disabled = false }) => (
  <button
    type='button'
    disabled={disabled}
    onClick={() => onToggle(dep.key)}
    className='inline-flex items-center text-left'
    style={{
      gap: 'var(--dim-space-200, 8px)',
      minHeight: 'var(--dim-size-700, 36px)',
      paddingTop: 'var(--dim-space-200, 8px)',
      paddingBottom: 'var(--dim-space-200, 8px)',
      paddingLeft: 'var(--dim-space-300, 12px)',
      paddingRight: 'var(--dim-space-300, 12px)',
      background: selected ? 'var(--surface-brandPrimary-quaternary)' : 'var(--surface-card-100)',
      border: `var(--dim-stroke-100, 1px) solid ${selected
        ? 'var(--border-brandPrimary-default)'
        : 'var(--border-card-default)'}`,
      borderRadius: 'var(--dim-radius-full)',
      color: selected ? 'var(--text-brandPrimary-default)' : 'var(--text-content-secondary)',
      fontSize: 'var(--type-size-sm, 14px)',
      fontWeight: selected ? 'var(--type-weight-medium, 500)' : 'var(--type-weight-regular, 400)',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.6 : 1,
      transition: 'background 120ms ease, border-color 120ms ease',
    }}
  >
    <Icon name={selected ? 'check' : 'add'} size={14} />
    {dep.label}
  </button>
);

/* Per-feature 3-segment access control — กลไกเดิมทั้งหมด. */
export const AccessSegmentedControl = ({ feature, value, onChange, disabled = false }) => {
  const supported = feature.supportedLevels || ['view', 'edit'];
  return (
    <div
      className='inline-flex items-center'
      style={{
        paddingTop: 'var(--dim-space-100, 4px)',
        paddingBottom: 'var(--dim-space-100, 4px)',
        paddingLeft: 'var(--dim-space-100, 4px)',
        paddingRight: 'var(--dim-space-100, 4px)',
        background: 'var(--surface-card-100)',
        border: 'var(--dim-stroke-100, 1px) solid var(--border-card-default)',
        borderRadius: 'var(--dim-radius-full)',
      }}
    >
      {ACCESS_OPTIONS.map((opt) => {
        const isSupported = opt.value === 'none' || supported.includes(opt.value);
        const enabled = isSupported && !disabled;
        const selected = (value || 'none') === opt.value;
        const surface = opt.surface || 'var(--surface-brandPrimary-quaternary)';
        return (
          <button
            key={opt.value}
            type='button'
            disabled={!enabled}
            onClick={() => enabled && onChange(opt.value === 'none' ? null : opt.value)}
            className='inline-flex items-center'
            style={{
              gap: 'var(--dim-space-150, 6px)',
              height: 'var(--dim-size-500, 24px)',
              paddingLeft: 'var(--dim-space-250, 10px)',
              paddingRight: 'var(--dim-space-300, 12px)',
              borderRadius: 'var(--dim-radius-full)',
              background: selected ? surface : 'transparent',
              color: selected
                ? opt.color
                : (enabled ? 'var(--text-content-secondary)' : 'var(--text-content-tertiary)'),
              fontSize: 'var(--type-size-xs, 12px)',
              fontWeight: selected ? 'var(--type-weight-medium, 500)' : 'var(--type-weight-regular, 400)',
              border: 'none',
              cursor: enabled ? 'pointer' : 'not-allowed',
              transition: 'background 120ms ease',
            }}
            title={!isSupported ? 'ฟีเจอร์นี้ไม่รองรับสิทธิ์ระดับนี้' : (disabled ? 'คุณมีสิทธิ์ดูอย่างเดียว' : undefined)}
          >
            <Icon name={opt.icon} size={14} />
            {opt.label}
          </button>
        );
      })}
    </div>
  );
};

export const FeatureGroupBlock = ({ group, features, setFeature, disabled = false }) => {
  const groupCount = group.features.reduce((acc, f) => {
    const v = features[f.key];
    if (v === 'view') acc.view += 1;
    else if (v === 'edit') acc.edit += 1;
    return acc;
  }, { view: 0, edit: 0 });

  const applyAll = (level) => {
    if (disabled) return;
    group.features.forEach((f) => {
      const ok = !level || (f.supportedLevels || ['view', 'edit']).includes(level);
      if (level && ok) setFeature(f.key, level);
      else if (!level) setFeature(f.key, null);
    });
  };

  const bulkStyle = (color) => ({
    background: 'transparent',
    border: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    color,
    opacity: disabled ? 0.5 : 1,
  });

  return (
    <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
      <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
        <div
          className='shrink-0 inline-flex items-center justify-center'
          style={{
            width: 'var(--dim-size-600, 32px)',
            height: 'var(--dim-size-600, 32px)',
            borderRadius: 'var(--dim-radius-200, 8px)',
            background: 'var(--surface-brandPrimary-quaternary)',
            color: 'var(--text-brandPrimary-default)',
          }}
        >
          <Icon name={group.icon} size={16} />
        </div>
        <div className='flex-1 min-w-0 flex flex-col'>
          <span className='text-sm font-bold text-ink'>{group.label}</span>
          <span className='text-xs text-ink-tertiary'>
            ดูได้ {groupCount.view} · แก้ไขได้ {groupCount.edit} จาก {group.features.length} ฟีเจอร์
          </span>
        </div>
        <div className='flex items-center' style={{ gap: 'var(--dim-space-150, 6px)' }}>
          <button type='button' disabled={disabled} onClick={() => applyAll('view')} className='text-xs underline' style={bulkStyle('var(--text-colorfulbadge-blue)')}>
            เลือกดูทั้งหมด
          </button>
          <span className='text-xs text-ink-tertiary'>·</span>
          <button type='button' disabled={disabled} onClick={() => applyAll('edit')} className='text-xs underline' style={bulkStyle('var(--text-brandPrimary-default)')}>
            ให้แก้ไขทั้งหมด
          </button>
          <span className='text-xs text-ink-tertiary'>·</span>
          <button type='button' disabled={disabled} onClick={() => applyAll(null)} className='text-xs underline' style={bulkStyle('var(--text-content-tertiary)')}>
            ล้าง
          </button>
        </div>
      </div>
      <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
        {group.features.map((f) => (
          <div
            key={f.key}
            className='flex flex-wrap items-center w-full'
            style={{
              gap: 'var(--dim-space-300, 12px)',
              paddingTop: 'var(--dim-space-300, 12px)',
              paddingBottom: 'var(--dim-space-300, 12px)',
              paddingLeft: 'var(--dim-space-300, 12px)',
              paddingRight: 'var(--dim-space-300, 12px)',
              background: 'var(--surface-card-100)',
              border: 'var(--dim-stroke-100, 1px) solid var(--border-card-default)',
              borderRadius: 'var(--dim-radius-200, 8px)',
            }}
          >
            <span className='flex-1 min-w-0 text-sm text-ink'>{f.label}</span>
            <AccessSegmentedControl
              feature={f}
              value={features[f.key]}
              onChange={(v) => setFeature(f.key, v)}
              disabled={disabled}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

/** ป้ายบอกว่า field นี้ sync มาจาก IdP → แก้ที่ระบบกลางเท่านั้น. */
export const IdpLockedChip = () => (
  <span
    className='inline-flex items-center'
    style={{
      gap: 'var(--dim-space-100, 4px)',
      height: 'var(--dim-size-500, 24px)',
      paddingLeft: 'var(--dim-space-200, 8px)',
      paddingRight: 'var(--dim-space-200, 8px)',
      borderRadius: 'var(--dim-radius-full)',
      background: 'var(--surface-pill-blue)',
      color: 'var(--text-pill-blue)',
      fontFamily: 'var(--type-family-body)',
      fontSize: 'var(--type-size-xs, 12px)',
    }}
  >
    <Icon name='hub' size={12} />
    มาจาก Directory Service
  </span>
);
