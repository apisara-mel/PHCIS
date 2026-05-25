import React, { useMemo, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Icon from '@/components/icons/Icon';
import BrandButton from '@/components/button/BrandButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import {
  ROLES,
  SUB_ROLES,
  DEPARTMENTS,
  FEATURE_GROUPS,
  ROLE_PALETTE,
  getUserById,
  getRole,
  countAccess,
} from '@/data/usersAccess';

const BLANK_USER = {
  id: 'new',
  name: '',
  email: '',
  avatarUrl: '',
  status: 'active',
  role: 'nurse',
  subRole: '',
  departments: [],
  features: {},
};

const ACCESS_OPTIONS = [
  { value: 'none', label: 'ไม่มีสิทธิ์', icon: 'block',      color: 'var(--text-content-tertiary)' },
  { value: 'view', label: 'ดูได้',       icon: 'visibility', color: 'var(--text-colorfulbadge-blue)',     surface: 'var(--surface-colorfulbadge-blue)' },
  { value: 'edit', label: 'แก้ไขได้',     icon: 'edit',       color: 'var(--text-brandPrimary-default)',   surface: 'var(--surface-brandPrimary-quaternary)' },
];

/* Section card — uniform white card with title row + content. */
const SectionCard = ({ icon, title, subtitle, children, action }) => (
  <section
    className='bg-white rounded-card shadow-card flex flex-col w-full'
    style={{ padding: 'var(--dim-space-600)', gap: 'var(--dim-space-400)' }}
  >
    <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-300)' }}>
      <div
        className='shrink-0 inline-flex items-center justify-center'
        style={{
          width: 40,
          height: 40,
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

const RoleRadioCard = ({ role, selected, onSelect }) => {
  const tone = ROLE_PALETTE[role.color] || ROLE_PALETTE.brand;
  return (
    <button
      type='button'
      onClick={() => onSelect(role.key)}
      className='flex flex-col items-start w-full text-left transition-shadow'
      style={{
        gap: 'var(--dim-space-200)',
        padding: 'var(--dim-space-300)',
        background: selected ? tone.surface : 'var(--surface-card-100)',
        border: `var(--dim-stroke-100) solid ${selected
          ? 'var(--border-brandPrimary-default)'
          : 'var(--border-card-default)'}`,
        borderRadius: 'var(--dim-radius-200)',
        cursor: 'pointer',
        boxShadow: selected ? 'var(--shadow-card-hover, none)' : 'none',
      }}
    >
      <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-200)' }}>
        <div
          className='shrink-0 inline-flex items-center justify-center'
          style={{
            width: 32,
            height: 32,
            borderRadius: 'var(--dim-radius-full)',
            background: selected ? 'rgba(255,255,255,0.6)' : tone.surface,
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
        {selected && (
          <Icon name='check_circle' size={18} style={{ color: tone.text }} />
        )}
      </div>
    </button>
  );
};

const DepartmentChip = ({ dep, selected, onToggle }) => (
  <button
    type='button'
    onClick={() => onToggle(dep.key)}
    className='inline-flex items-center text-left'
    style={{
      gap: 'var(--dim-space-200)',
      minHeight: 36,
      padding: '8px 12px',
      background: selected
        ? 'var(--surface-brandPrimary-quaternary)'
        : 'var(--surface-card-100)',
      border: `var(--dim-stroke-100) solid ${selected
        ? 'var(--border-brandPrimary-default)'
        : 'var(--border-card-default)'}`,
      borderRadius: 'var(--dim-radius-full)',
      color: selected
        ? 'var(--text-brandPrimary-default)'
        : 'var(--text-content-secondary)',
      fontSize: 'var(--type-size-sm)',
      fontWeight: selected ? 'var(--type-weight-medium)' : 'var(--type-weight-regular)',
      cursor: 'pointer',
      transition: 'background 120ms ease, border-color 120ms ease',
    }}
  >
    <Icon name={selected ? 'check' : 'add'} size={14} />
    {dep.label}
  </button>
);

/* Per-feature 3-segment access control. Unsupported levels render
   disabled (greyed) — clicking does nothing. The "ไม่มีสิทธิ์" segment
   is always available since revoking is a universal capability. */
const AccessSegmentedControl = ({ feature, value, onChange }) => {
  const supported = feature.supportedLevels || ['view', 'edit'];
  return (
    <div
      className='inline-flex items-center'
      style={{
        padding: 'var(--dim-space-100)',
        background: 'var(--surface-card-100)',
        border: 'var(--dim-stroke-100) solid var(--border-card-default)',
        borderRadius: 'var(--dim-radius-full)',
      }}
    >
      {ACCESS_OPTIONS.map((opt) => {
        const isSupported = opt.value === 'none' || supported.includes(opt.value);
        const selected = (value || 'none') === opt.value;
        const surface = opt.surface || 'var(--surface-brandPrimary-quaternary)';
        return (
          <button
            key={opt.value}
            type='button'
            disabled={!isSupported}
            onClick={() => isSupported && onChange(opt.value === 'none' ? null : opt.value)}
            className='inline-flex items-center'
            style={{
              gap: 'var(--dim-space-150)',
              height: 28,
              paddingLeft: 10,
              paddingRight: 'var(--dim-space-300)',
              borderRadius: 'var(--dim-radius-full)',
              background: selected ? surface : 'transparent',
              color: selected
                ? opt.color
                : (isSupported ? 'var(--text-content-secondary)' : 'var(--text-content-disabled, #B5B5B5)'),
              fontSize: 'var(--type-size-xs)',
              fontWeight: selected ? 'var(--type-weight-medium)' : 'var(--type-weight-regular)',
              border: 'none',
              cursor: isSupported ? 'pointer' : 'not-allowed',
              transition: 'background 120ms ease',
            }}
            title={!isSupported ? 'ฟีเจอร์นี้ไม่รองรับสิทธิ์ระดับนี้' : undefined}
          >
            <Icon name={opt.icon} size={14} />
            {opt.label}
          </button>
        );
      })}
    </div>
  );
};

const FeatureGroupBlock = ({ group, features, setFeature }) => {
  const groupCount = group.features.reduce((acc, f) => {
    const v = features[f.key];
    if (v === 'view') acc.view += 1;
    else if (v === 'edit') acc.edit += 1;
    return acc;
  }, { view: 0, edit: 0 });

  /* Bulk action: apply "edit" to all supported features in this group,
     or clear them. Skips features that don't support 'edit'. */
  const applyAll = (level) => {
    group.features.forEach((f) => {
      const ok = !level || (f.supportedLevels || ['view', 'edit']).includes(level);
      if (level && ok) setFeature(f.key, level);
      else if (!level) setFeature(f.key, null);
    });
  };

  return (
    <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
      <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-300)' }}>
        <div
          className='shrink-0 inline-flex items-center justify-center'
          style={{
            width: 32,
            height: 32,
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
        <div className='flex items-center' style={{ gap: 'var(--dim-space-150)' }}>
          <button
            type='button'
            onClick={() => applyAll('view')}
            className='text-xs underline'
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-colorfulbadge-blue)' }}
          >
            เลือกดูทั้งหมด
          </button>
          <span className='text-xs text-ink-tertiary'>·</span>
          <button
            type='button'
            onClick={() => applyAll('edit')}
            className='text-xs underline'
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-brandPrimary-default)' }}
          >
            ให้แก้ไขทั้งหมด
          </button>
          <span className='text-xs text-ink-tertiary'>·</span>
          <button
            type='button'
            onClick={() => applyAll(null)}
            className='text-xs underline'
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-content-tertiary)' }}
          >
            ล้าง
          </button>
        </div>
      </div>
      <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200)' }}>
        {group.features.map((f) => (
          <div
            key={f.key}
            className='flex flex-wrap items-center w-full'
            style={{
              gap: 'var(--dim-space-300)',
              padding: 'var(--dim-space-300)',
              background: 'var(--surface-card-100)',
              border: 'var(--dim-stroke-100) solid var(--border-card-default)',
              borderRadius: 'var(--dim-radius-200)',
            }}
          >
            <span className='flex-1 min-w-0 text-sm text-ink'>{f.label}</span>
            <AccessSegmentedControl
              feature={f}
              value={features[f.key]}
              onChange={(v) => setFeature(f.key, v)}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

const UserEditPage = () => {
  const { id } = useParams();
  const history = useHistory();
  const isNew = !id || id === 'new';
  const existing = isNew ? null : getUserById(id);
  const base = existing || BLANK_USER;

  const [form, setForm] = useState(() => ({
    ...base,
    departments: [...(base.departments || [])],
    features: { ...(base.features || {}) },
  }));

  const setField = (key, v) => setForm((prev) => ({ ...prev, [key]: v }));
  const toggleDepartment = (key) => setForm((prev) => ({
    ...prev,
    departments: prev.departments.includes(key)
      ? prev.departments.filter((k) => k !== key)
      : [...prev.departments, key],
  }));
  const setFeature = (key, level) => setForm((prev) => {
    const next = { ...prev.features };
    if (level === null || level === undefined) delete next[key];
    else next[key] = level;
    return { ...prev, features: next };
  });

  /* Switching role resets sub-role if the previous value doesn't belong
     to the new role. Avoids stale combos like nurse + "ทันตแพทย์". */
  const setRole = (roleKey) => {
    const subs = SUB_ROLES[roleKey] || [];
    const stillValid = subs.find((s) => s.key === form.subRole);
    setForm((prev) => ({
      ...prev,
      role: roleKey,
      subRole: stillValid ? prev.subRole : (subs[0]?.key || ''),
    }));
  };

  const subRoles = SUB_ROLES[form.role] || [];
  const access = useMemo(() => countAccess(form.features), [form.features]);
  const roleMeta = getRole(form.role);

  if (!isNew && !existing) {
    return (
      <div className='min-h-screen w-full flex bg-brand-50'>
        <Sidebar activeKey='users' />
        <main className='flex-1 flex flex-col min-w-0'>
          <Header breadcrumb={['ผู้ใช้และสิทธิ์การเข้าถึง', 'ไม่พบผู้ใช้']} />
          <div className='flex flex-1 items-center justify-center text-ink-tertiary'>
            ไม่พบผู้ใช้ที่ตรงกับลิงก์นี้
          </div>
        </main>
      </div>
    );
  }

  const breadcrumb = [
    'ผู้ใช้และสิทธิ์การเข้าถึง',
    isNew ? 'เพิ่มผู้ใช้ใหม่' : form.name || 'แก้ไขผู้ใช้',
  ];

  const handleSave = () => {
    /* Prototype only — no persistence. Return to list. */
    history.push('/users');
  };

  return (
    <div className='min-h-screen w-full flex bg-brand-50'>
      <Sidebar activeKey='users' />
      <main className='flex-1 flex flex-col min-w-0'>
        <Header breadcrumb={breadcrumb} />
        <div className='p-3 md:p-6 flex-1 flex flex-col' style={{ gap: 'var(--dim-space-500)' }}>
          {/* Back link */}
          <div>
            <button
              type='button'
              onClick={() => history.push('/users')}
              className='inline-flex items-center gap-1 text-sm text-ink-secondary hover:text-brand-500'
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 'var(--dim-space-0)' }}
            >
              <Icon name='chevron-left' size={16} />
              กลับไปยังรายชื่อผู้ใช้
            </button>
          </div>

          {/* Profile section */}
          <SectionCard
            icon='account_circle'
            title={isNew ? 'เพิ่มผู้ใช้ใหม่' : 'ข้อมูลผู้ใช้'}
            subtitle='ข้อมูลพื้นฐานและสถานะการใช้งาน'
            action={
              <label
                className='inline-flex items-center cursor-pointer'
                style={{ gap: 'var(--dim-space-200)' }}
              >
                <input
                  type='checkbox'
                  checked={form.status === 'active'}
                  onChange={(e) => setField('status', e.target.checked ? 'active' : 'inactive')}
                  style={{ width: 18, height: 18, accentColor: 'var(--surface-brandPrimary-default)' }}
                />
                <span className='text-sm text-ink-secondary'>เปิดใช้งานบัญชี</span>
              </label>
            }
          >
            <div
              className='flex flex-col md:flex-row items-start w-full'
              style={{ gap: 'var(--dim-space-400)' }}
            >
              <div
                className='shrink-0 rounded-full overflow-hidden flex items-center justify-center'
                style={{
                  width: 72,
                  height: 72,
                  background: 'var(--surface-card-100)',
                  border: 'var(--dim-stroke-100) solid var(--border-card-default)',
                }}
              >
                {form.avatarUrl ? (
                  <img src={form.avatarUrl} alt='' className='w-full h-full object-cover' />
                ) : (
                  <Icon name='person' size={32} />
                )}
              </div>
              <div className='flex-1 min-w-0 grid grid-cols-1 md:grid-cols-2 gap-3 w-full'>
                <label className='flex flex-col' style={{ gap: 'var(--dim-space-150)' }}>
                  <span className='text-xs text-ink-secondary'>ชื่อ-นามสกุล <span style={{ color: 'var(--text-input-require)' }}>*</span></span>
                  <input
                    type='text'
                    value={form.name}
                    onChange={(e) => setField('name', e.target.value)}
                    placeholder='เช่น พญ.สมหญิง รักษ์ดี'
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      background: 'var(--surface-input-default)',
                      border: 'var(--dim-stroke-100) solid var(--border-input-default)',
                      borderRadius: 'var(--dim-radius-200)',
                      fontSize: 'var(--type-size-sm)',
                      outline: 'none',
                    }}
                  />
                </label>
                <label className='flex flex-col' style={{ gap: 'var(--dim-space-150)' }}>
                  <span className='text-xs text-ink-secondary'>อีเมล <span style={{ color: 'var(--text-input-require)' }}>*</span></span>
                  <input
                    type='email'
                    value={form.email}
                    onChange={(e) => setField('email', e.target.value)}
                    placeholder='name@phcis.bma.go.th'
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      background: 'var(--surface-input-default)',
                      border: 'var(--dim-stroke-100) solid var(--border-input-default)',
                      borderRadius: 'var(--dim-radius-200)',
                      fontSize: 'var(--type-size-sm)',
                      outline: 'none',
                    }}
                  />
                </label>
              </div>
            </div>
          </SectionCard>

          {/* Role section */}
          <SectionCard
            icon='badge'
            title='หน้าที่ (Role)'
            subtitle='เลือกหน้าที่หลักของผู้ใช้ — ใช้กำหนดสิทธิ์เริ่มต้นและจัดกลุ่มในระบบ'
          >
            <div
              className='grid w-full'
              style={{
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: 'var(--dim-space-300)',
              }}
            >
              {ROLES.map((r) => (
                <RoleRadioCard
                  key={r.key}
                  role={r}
                  selected={form.role === r.key}
                  onSelect={setRole}
                />
              ))}
            </div>

            {subRoles.length > 0 && (
              <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200)' }}>
                <label className='text-xs text-ink-secondary'>บทบาทย่อย / ความเชี่ยวชาญ</label>
                <select
                  value={form.subRole || ''}
                  onChange={(e) => setField('subRole', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: 'var(--surface-input-default)',
                    border: 'var(--dim-stroke-100) solid var(--border-input-default)',
                    borderRadius: 'var(--dim-radius-200)',
                    fontSize: 'var(--type-size-sm)',
                    outline: 'none',
                    appearance: 'none',
                  }}
                >
                  <option value=''>— เลือกบทบาทย่อย —</option>
                  {subRoles.map((s) => (
                    <option key={s.key} value={s.key}>{s.label}</option>
                  ))}
                </select>
              </div>
            )}
          </SectionCard>

          {/* Department section */}
          <SectionCard
            icon='apartment'
            title='แผนกที่ดูแล'
            subtitle={`เลือกแผนกที่ผู้ใช้ปฏิบัติงาน (เลือกได้หลายแผนก) — ${form.departments.length} แผนกที่เลือก`}
          >
            <div className='flex flex-wrap w-full' style={{ gap: 'var(--dim-space-200)' }}>
              {DEPARTMENTS.map((d) => (
                <DepartmentChip
                  key={d.key}
                  dep={d}
                  selected={form.departments.includes(d.key)}
                  onToggle={toggleDepartment}
                />
              ))}
            </div>
          </SectionCard>

          {/* Features section */}
          <SectionCard
            icon='lock_person'
            title='สิทธิ์การใช้งานฟีเจอร์'
            subtitle={`กำหนดการเข้าถึงแต่ละฟีเจอร์ ไม่มีสิทธิ์ / ดูได้ / แก้ไขได้ — สรุปปัจจุบัน: ดูได้ ${access.view} · แก้ไขได้ ${access.edit}`}
          >
            {/* Legend */}
            <div
              className='flex flex-wrap items-center w-full'
              style={{
                gap: 'var(--dim-space-300)',
                padding: 'var(--dim-space-300)',
                background: 'var(--surface-card-100)',
                border: 'var(--dim-stroke-100) solid var(--border-card-default)',
                borderRadius: 'var(--dim-radius-200)',
              }}
            >
              <span className='text-xs text-ink-secondary font-medium'>ระดับสิทธิ์:</span>
              {ACCESS_OPTIONS.map((opt) => (
                <span
                  key={opt.value}
                  className='inline-flex items-center'
                  style={{ gap: 'var(--dim-space-100)', fontSize: 'var(--type-size-xs)', color: opt.color }}
                >
                  <Icon name={opt.icon} size={14} />
                  {opt.label}
                </span>
              ))}
              <span className='ml-auto text-xs text-ink-tertiary'>
                ฟีเจอร์บางอย่างเปิดได้แค่ "แก้ไขได้" หรือ "ดูได้" เท่านั้น
              </span>
            </div>

            <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-500)' }}>
              {FEATURE_GROUPS.map((g) => (
                <FeatureGroupBlock
                  key={g.key}
                  group={g}
                  features={form.features}
                  setFeature={setFeature}
                />
              ))}
            </div>
          </SectionCard>

          {/* Footer actions */}
          <section
            className='bg-white rounded-card shadow-card flex flex-wrap items-center w-full sticky bottom-0'
            style={{ gap: 'var(--dim-space-300)', padding: 'var(--dim-space-500)' }}
          >
            <div className='flex-1 min-w-0 flex items-center flex-wrap' style={{ gap: 'var(--dim-space-300)' }}>
              {roleMeta && (
                <span className='text-xs text-ink-tertiary'>
                  สรุป: <strong className='text-ink-secondary'>{roleMeta.label}</strong>
                  {' · '}
                  {form.departments.length} แผนก
                  {' · '}
                  ดูได้ {access.view}, แก้ไขได้ {access.edit}
                </span>
              )}
            </div>
            <NeutralSubdueButton
              variant='outline'
              size='md'
              onClick={() => history.push('/users')}
            >
              ยกเลิก
            </NeutralSubdueButton>
            <BrandButton
              size='md'
              leadingIcon='save'
              onClick={handleSave}
            >
              {isNew ? 'สร้างผู้ใช้' : 'บันทึกการเปลี่ยนแปลง'}
            </BrandButton>
          </section>
        </div>
        <Footer copyright='© 2026 ศูนย์การพยาบาลคุณภาพ ดินแดง กรุงเทพมหานคร' />
      </main>
    </div>
  );
};

export default UserEditPage;
