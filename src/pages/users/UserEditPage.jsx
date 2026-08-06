import React, { useMemo, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import Icon from '@/components/icons/Icon';
import InputField from '@/components/forms/InputField';
import Select from '@/components/forms/Select';
import Switch from '@/components/switch/Switch';
import Alert from '@/components/alert/Alert';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import BrandButton from '@/components/button/BrandButton';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import UnsavedChangesPopup from '@/components/popup/UnsavedChangesPopup';
import {
  ROLES,
  SUB_ROLES,
  DEPARTMENTS,
  FEATURE_GROUPS,
  TITLES,
  LICENSE_TYPES,
  PROFESSIONAL_ROLES,
  IDP_MANAGED_FIELDS,
  getUserById,
  getRole,
  countAccess,
  composeUserName,
  departmentCodeOf,
  expectedDepartmentCodes,
  validateUserForm,
  updateUser,
  createUser,
} from '@/data/usersAccess';
import { CLINIC_OPTIONS } from '@/components/layout/HeaderClinicContext';
import { getNotificationPref, saveNotificationPref } from '@/data/userNotifications';
import {
  SectionCard,
  RoleRadioCard,
  DepartmentChip,
  FeatureGroupBlock,
  IdpLockedChip,
  ACCESS_OPTIONS,
} from '@/pages/users/userEditParts';
import UserLoginTab from '@/pages/users/UserLoginTab';
import UserNotifyTab from '@/pages/users/UserNotifyTab';
import {
  CURRENT_USER_ID,
  EmptyState,
  LastEditedNote,
  ModuleCard,
  PermissionGate,
  ReadOnlyNotice,
  SourceBadge,
  auditAdmin,
  centerLabel,
  currentUserName,
} from '@/pages/users/usersShared';

/* UserEditPage — 1 บัญชี แบ่งเป็น 4 แท็บตาม TOR §1.17:
     ก) ข้อมูลผู้ใช้      — attribute ครบ 8 ตัว (1.17.1.3) + รูป (1.17.5.2)
     ข) บทบาทและสิทธิ์    — ของเดิมทั้งก้อน (1.17.1.2 / 1.17.2.x)
     ค) การเข้าสู่ระบบ    — ช่องทางรายบุคคล + QR + OTP (1.17.5.1 / 1.17.4.1)
     ง) การแจ้งเตือน      — เมทริกซ์ช่องทางรายบุคคล (1.17.5.5)

   กลไก feature matrix เดิมถูกย้ายไป userEditParts.jsx โดยไม่แก้ตรรกะ. */

const BLANK_USER = {
  id: 'new',
  name: '',
  titleKey: 'ms',
  givenName: '',
  lastName: '',
  email: '',
  phone: '',
  avatarUrl: '',
  status: 'active',
  role: 'nurse',
  subRole: '',
  departments: [],
  departmentCode: '',
  licenseType: 'rn',
  licenseNo: '',
  homeCenter: 'hc-4',
  centers: ['hc-4'],
  source: 'local',
  loginChannels: ['password'],
  features: {},
};

const TABS = [
  { key: 'profile', label: 'ข้อมูลผู้ใช้',    icon: 'account_circle' },
  { key: 'access',  label: 'บทบาทและสิทธิ์',  icon: 'lock_person' },
  { key: 'login',   label: 'การเข้าสู่ระบบ',  icon: 'login' },
  { key: 'notify',  label: 'การแจ้งเตือน',    icon: 'notifications' },
];

const UserEditPage = () => {
  const { id } = useParams();
  const history = useHistory();
  const isNew = !id || id === 'new';
  const existing = isNew ? null : getUserById(id);
  const base = existing || BLANK_USER;

  const [activeTab, setActiveTab] = useState('profile');
  const [form, setForm] = useState(() => ({
    ...base,
    departments: [...(base.departments || [])],
    centers: [...(base.centers || [])],
    loginChannels: [...(base.loginChannels || ['password'])],
    features: { ...(base.features || {}) },
  }));
  const [pref, setPref] = useState(() => getNotificationPref(isNew ? CURRENT_USER_ID : id));
  const [dirty, setDirty] = useState(false);
  const [errors, setErrors] = useState({});
  const [saved, setSaved] = useState('');
  const [otpVerified, setOtpVerified] = useState(!isNew);
  const [leaving, setLeaving] = useState(false);

  const markDirty = () => setDirty(true);

  const setField = (key, v) => {
    markDirty();
    setForm((prev) => {
      const next = { ...prev, [key]: v };
      /* Department-Code auto-fill จากแผนกแรก แต่แก้ทับได้ */
      if (key === 'departments') {
        const auto = departmentCodeOf(v[0]);
        const wasAuto = !prev.departmentCode || expectedDepartmentCodes(prev.departments).includes(prev.departmentCode);
        if (auto && wasAuto) next.departmentCode = auto;
      }
      return next;
    });
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const rest = { ...prev };
      delete rest[key];
      return rest;
    });
  };

  const toggleDepartment = (key) => {
    const next = form.departments.includes(key)
      ? form.departments.filter((k) => k !== key)
      : [...form.departments, key];
    setField('departments', next);
  };

  const setFeature = (key, level) => {
    markDirty();
    setForm((prev) => {
      const next = { ...prev.features };
      if (level === null || level === undefined) delete next[key];
      else next[key] = level;
      return { ...prev, features: next };
    });
  };

  const setRole = (roleKey) => {
    markDirty();
    const subs = SUB_ROLES[roleKey] || [];
    setForm((prev) => {
      const stillValid = subs.find((s) => s.key === prev.subRole);
      const licType = LICENSE_TYPES.find((t) => t.roles.includes(roleKey));
      return {
        ...prev,
        role: roleKey,
        subRole: stillValid ? prev.subRole : (subs[0]?.key || ''),
        licenseType: licType ? licType.key : 'none',
      };
    });
  };

  const subRoles = SUB_ROLES[form.role] || [];
  const access = useMemo(() => countAccess(form.features), [form.features]);
  const roleMeta = getRole(form.role);
  const fromIdp = form.source === 'idp';
  const isSelf = !isNew && id === CURRENT_USER_ID;
  const needsLicense = PROFESSIONAL_ROLES.includes(form.role);

  if (!isNew && !existing) {
    return (
      <QueuePageShell
        activeKey='users'
        breadcrumb={['ระบบงานผู้ดูแลระบบ', 'ผู้ใช้และสิทธิ์การเข้าถึง', 'ไม่พบผู้ใช้']}
        title='ไม่พบผู้ใช้'
        onBack={() => history.push('/users')}
        backLabel='กลับไปรายชื่อผู้ใช้'
      >
        <div className='flex flex-col flex-1' style={{ paddingTop: 'var(--dim-space-600, 24px)', paddingRight: 'var(--dim-space-600, 24px)', paddingBottom: 'var(--dim-space-600, 24px)', paddingLeft: 'var(--dim-space-600, 24px)' }}>
          <ModuleCard>
            <EmptyState
              icon='person_off'
              title='ไม่พบผู้ใช้ที่ตรงกับลิงก์นี้'
              subtitle={`รหัสผู้ใช้ "${id}" ไม่มีในระบบ — อาจถูกลบไปแล้วหรือลิงก์ไม่ถูกต้อง`}
              action={<BrandButton size='md' leadingIcon='arrow_back' onClick={() => history.push('/users')}>กลับไปรายชื่อผู้ใช้</BrandButton>}
            />
          </ModuleCard>
        </div>
      </QueuePageShell>
    );
  }

  const breadcrumb = [
    'ระบบงานผู้ดูแลระบบ',
    'ผู้ใช้และสิทธิ์การเข้าถึง',
    isNew ? 'เพิ่มผู้ใช้ใหม่' : (composeUserName(form) || 'แก้ไขผู้ใช้'),
  ];

  const goBack = () => {
    if (dirty) setLeaving(true);
    else history.push('/users');
  };

  const handleSave = () => {
    const errs = validateUserForm(form, { exceptId: isNew ? null : id, currentUserId: CURRENT_USER_ID });
    if (isNew && !otpVerified) errs.otp = 'ต้องยืนยันตัวตนด้วย OTP อย่างน้อย 1 ช่องทางก่อนสร้างบัญชี';
    setErrors(errs);
    if (Object.keys(errs).length) {
      /* พาไปแท็บที่มีปัญหาแทนการเงียบ */
      if (errs.otp || errs.loginChannels) setActiveTab('login');
      else setActiveTab('profile');
      auditAdmin(`บันทึกผู้ใช้ไม่สำเร็จ (ข้อมูลไม่ครบ) — ${composeUserName(form) || 'ผู้ใช้ใหม่'}`, false);
      return;
    }
    const prefResult = saveNotificationPref(isNew ? CURRENT_USER_ID : id, pref);
    if (!prefResult.ok) {
      setErrors(prefResult.errors);
      setActiveTab('notify');
      return;
    }
    if (isNew) {
      const row = createUser(form, currentUserName());
      auditAdmin(`สร้างผู้ใช้ใหม่ ${row.name} (ยืนยันตัวตนด้วย OTP แล้ว)`);
    } else {
      updateUser(id, form, currentUserName());
      auditAdmin(`บันทึกข้อมูลและสิทธิ์ของผู้ใช้ ${composeUserName(form)}`);
    }
    setDirty(false);
    setSaved(isNew ? 'สร้างบัญชีผู้ใช้เรียบร้อยแล้ว' : 'บันทึกการเปลี่ยนแปลงเรียบร้อยแล้ว');
    setTimeout(() => history.push('/users'), 600);
  };

  const titleOptions = TITLES.map((t) => ({ value: t.key, label: `${t.label} (${t.full})` }));
  const licenseOptions = LICENSE_TYPES.map((t) => ({ value: t.key, label: t.label }));
  const centerOptions = CLINIC_OPTIONS;

  /* ── แท็บ ก) ข้อมูลผู้ใช้ ─────────────────────────────────────────── */
  const renderProfile = (readOnly) => {
    const lock = (field) => readOnly || (fromIdp && IDP_MANAGED_FIELDS.includes(field));
    return (
      <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-500, 20px)' }}>
        {fromIdp ? (
          <Alert
            type='info'
            title='บัญชีนี้ sync มาจาก Directory Service'
            subtext='ฟิลด์ที่ IdP เป็นเจ้าของ (ชื่อ · นามสกุล · อีเมล · แผนก · รหัสวิชาชีพ · สถานะ) แก้ที่นี่ไม่ได้ — ต้องแก้ที่ระบบกลางแล้วรอรอบ sync ถัดไป'
            detail={(
              <BrandSubdueButton variant='outline' size='sm' leadingIcon='hub' onClick={() => history.push('/users/directory-service')}>
                ดูการตั้งค่า Directory Service
              </BrandSubdueButton>
            )}
          />
        ) : null}

        <SectionCard
          icon='account_circle'
          title={isNew ? 'ข้อมูลผู้ใช้ใหม่' : 'ข้อมูลผู้ใช้ (User Attribute)'}
          subtitle='ครบตามข้อกำหนด: Title · Given Name · Last Name · Email · Department · Department-Code · รหัสวิชาชีพ · Active'
          action={(
            <span className='inline-flex items-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
              <SourceBadge source={form.source} />
              <Switch
                checked={form.status === 'active'}
                disabled={lock('status') || isSelf}
                onChange={(next) => setField('status', next ? 'active' : 'inactive')}
                aria-label='เปิดใช้งานบัญชี (Active)'
              />
              <span style={{ color: 'var(--text-content-secondary)', fontSize: 'var(--type-size-sm, 14px)' }}>
                {form.status === 'active' ? 'ใช้งาน' : 'ปิดการใช้งาน'}
              </span>
            </span>
          )}
        >
          {errors.status ? <Alert type='error' title='ปิดการใช้งานบัญชีนี้ไม่ได้' subtext={errors.status} /> : null}
          {isSelf ? (
            <Alert type='info' title='นี่คือบัญชีของคุณเอง' subtext='ระบบไม่อนุญาตให้ปิดการใช้งานบัญชีตัวเอง เพื่อกันการล็อกตัวเองออกจากระบบ' />
          ) : null}

          <div className='flex flex-col md:flex-row items-start w-full' style={{ gap: 'var(--dim-space-400, 16px)' }}>
            {/* รูปประจำตัว — TOR 1.17.5.2 (คงของเดิม) */}
            <div className='flex flex-col items-center shrink-0' style={{ gap: 'var(--dim-space-200, 8px)' }}>
              <div
                className='rounded-full overflow-hidden flex items-center justify-center'
                style={{
                  width: 'var(--dim-size-1600, 72px)',
                  height: 'var(--dim-size-1600, 72px)',
                  background: 'var(--surface-card-100)',
                  border: 'var(--dim-stroke-100, 1px) solid var(--border-card-default)',
                }}
              >
                {form.avatarUrl
                  ? <img src={form.avatarUrl} alt='' className='w-full h-full object-cover' />
                  : <Icon name='person' size={32} />}
              </div>
              <NeutralSubdueButton variant='outline' size='sm' leadingIcon='photo_camera' disabled={readOnly}>
                เปลี่ยนรูป
              </NeutralSubdueButton>
            </div>

            <div className='flex-1 min-w-0 grid grid-cols-1 md:grid-cols-2 w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
              <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
                <Select
                  label='คำนำหน้า (Title)'
                  required
                  searchable={false}
                  disabled={lock('titleKey')}
                  value={form.titleKey}
                  onChange={(v) => setField('titleKey', v)}
                  options={titleOptions}
                />
                {fromIdp ? <IdpLockedChip /> : null}
              </div>
              <InputField
                label='ชื่อ (Given Name)'
                required
                disabled={lock('givenName')}
                value={form.givenName}
                onChange={(v) => setField('givenName', v)}
                error={errors.givenName}
                placeholder='เช่น สมหญิง'
              />
              <InputField
                label='นามสกุล (Last Name)'
                required
                disabled={lock('lastName')}
                value={form.lastName}
                onChange={(v) => setField('lastName', v)}
                error={errors.lastName}
                placeholder='เช่น รักษ์ดี'
              />
              <InputField
                label='อีเมล (Email)'
                required
                type='email'
                leadingIcon='mail'
                disabled={lock('email')}
                value={form.email}
                onChange={(v) => setField('email', v)}
                error={errors.email}
                placeholder='name@phcis.bma.go.th'
              />
              <InputField
                label='เบอร์ติดต่อ'
                leadingIcon='call'
                disabled={readOnly}
                value={form.phone}
                onChange={(v) => setField('phone', v)}
                placeholder='08x-xxx-xxxx'
                helperText='ใช้สำหรับส่ง OTP ทาง SMS'
              />
              <InputField
                label='ชื่อที่แสดงในระบบ'
                disabled
                value={composeUserName(form) || '—'}
                helperText='ประกอบอัตโนมัติจาก คำนำหน้า + ชื่อ + นามสกุล'
              />
            </div>
          </div>
        </SectionCard>

        <SectionCard
          icon='apartment'
          title='แผนก และรหัสแผนก (Department / Department-Code)'
          subtitle={`เลือกได้หลายแผนก — รหัสแผนกเติมอัตโนมัติจากแผนกแรก แก้ทับได้ (เลือกแล้ว ${form.departments.length} แผนก)`}
        >
          {errors.departments ? <Alert type='error' title='ยังไม่ได้เลือกแผนก' subtext={errors.departments} /> : null}
          <div className='flex flex-wrap w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
            {DEPARTMENTS.map((d) => (
              <DepartmentChip
                key={d.key}
                dep={d}
                selected={form.departments.includes(d.key)}
                onToggle={toggleDepartment}
                disabled={lock('departments')}
              />
            ))}
          </div>
          <div className='grid grid-cols-1 md:grid-cols-2 w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
            <InputField
              label='Department-Code'
              required
              disabled={lock('departmentCode')}
              value={form.departmentCode}
              onChange={(v) => setField('departmentCode', v)}
              error={errors.departmentCode}
              placeholder='เช่น DEP-OPD-01'
              helperText={form.departments.length
                ? `ค่าที่ตรงกับแผนกที่เลือก: ${expectedDepartmentCodes(form.departments).join(' / ')}`
                : 'เลือกแผนกก่อนเพื่อให้ระบบเติมรหัสให้'}
            />
          </div>
        </SectionCard>

        <SectionCard
          icon='badge'
          title='รหัสวิชาชีพและใบอนุญาต'
          subtitle={needsLicense
            ? 'บทบาทวิชาชีพ (แพทย์ / พยาบาล / เภสัชกร / นักเทคนิคการแพทย์) ต้องระบุรหัสวิชาชีพ'
            : 'บทบาทนี้ไม่ต้องใช้ใบอนุญาตประกอบวิชาชีพ'}
        >
          <div className='grid grid-cols-1 md:grid-cols-2 w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
            <Select
              label='ประเภทใบอนุญาต'
              searchable={false}
              disabled={readOnly}
              value={form.licenseType}
              onChange={(v) => setField('licenseType', v)}
              options={licenseOptions}
            />
            <InputField
              label='รหัสวิชาชีพ'
              required={needsLicense}
              disabled={lock('licenseNo')}
              value={form.licenseNo}
              onChange={(v) => setField('licenseNo', v)}
              error={errors.licenseNo}
              placeholder={LICENSE_TYPES.find((t) => t.key === form.licenseType)?.prefix ? `${LICENSE_TYPES.find((t) => t.key === form.licenseType).prefix}12345` : 'ไม่ต้องระบุ'}
              helperText='ต้องไม่ซ้ำกับบัญชีอื่น และขึ้นต้นตามประเภทใบอนุญาต'
            />
          </div>
        </SectionCard>

        <SectionCard
          icon='location_on'
          title='ศูนย์บริการที่สังกัดและสิทธิ์สลับศูนย์'
          subtitle='ศูนย์ที่เลือกไว้จะเป็นตัวเลือกในป๊อปอัป "สลับศูนย์" ของผู้ใช้รายนี้'
        >
          {errors.centers ? <Alert type='error' title='ยังไม่ได้เลือกศูนย์' subtext={errors.centers} /> : null}
          <div className='grid grid-cols-1 md:grid-cols-2 w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
            <Select
              label='ศูนย์ที่สังกัดหลัก'
              required
              disabled={readOnly}
              value={form.homeCenter}
              onChange={(v) => {
                setField('homeCenter', v);
                if (!form.centers.includes(v)) setField('centers', [...form.centers, v]);
              }}
              options={centerOptions}
            />
            <Select
              label='ศูนย์ที่มีสิทธิ์สลับไป'
              multiple
              disabled={readOnly}
              value={form.centers}
              onChange={(v) => setField('centers', Array.isArray(v) ? v : [v])}
              options={centerOptions}
              helperText={`เลือกแล้ว ${form.centers.length} ศูนย์ — ผู้ใช้ที่มีศูนย์เดียวจะกดปุ่มสลับศูนย์ไม่ได้`}
            />
          </div>
          <div className='flex flex-wrap items-center' style={{ gap: 'var(--dim-space-150, 6px)' }}>
            {form.centers.map((c) => (
              <ColorfulBadge key={c} style={c === form.homeCenter ? 'green' : 'grey'} size='small' icon='location_on'>
                {centerLabel(c)}
              </ColorfulBadge>
            ))}
          </div>
        </SectionCard>

        {!isNew ? (
          <div className='flex flex-wrap items-center w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
            <LastEditedNote by={form.updatedBy} at={form.updatedAt} />
            <div className='flex-1' />
            <NeutralSubdueButton variant='outline' size='sm' leadingIcon='calendar_month' onClick={() => history.push(`/users/${id}/schedule`)}>
              ดูตารางการทำงาน
            </NeutralSubdueButton>
          </div>
        ) : null}
      </div>
    );
  };

  /* ── แท็บ ข) บทบาทและสิทธิ์ (กลไกเดิมทั้งหมด) ───────────────────── */
  const renderAccess = (readOnly) => (
    <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-500, 20px)' }}>
      <SectionCard
        icon='badge'
        title='หน้าที่ (Role)'
        subtitle='เลือกหน้าที่หลักของผู้ใช้ — ใช้กำหนดสิทธิ์เริ่มต้นและจัดกลุ่มในระบบ'
      >
        <div
          className='grid w-full'
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 'var(--dim-space-300, 12px)' }}
        >
          {ROLES.map((r) => (
            <RoleRadioCard key={r.key} role={r} selected={form.role === r.key} onSelect={setRole} disabled={readOnly} />
          ))}
        </div>
        {subRoles.length > 0 ? (
          <Select
            label='บทบาทย่อย / ความเชี่ยวชาญ'
            searchable={false}
            disabled={readOnly}
            value={form.subRole || ''}
            onChange={(v) => setField('subRole', v)}
            options={subRoles.map((s) => ({ value: s.key, label: s.label }))}
            placeholder='— เลือกบทบาทย่อย —'
          />
        ) : null}
      </SectionCard>

      <SectionCard
        icon='lock_person'
        title='สิทธิ์การใช้งานฟีเจอร์'
        subtitle={`กำหนดการเข้าถึงแต่ละฟีเจอร์ ไม่มีสิทธิ์ / ดูได้ / แก้ไขได้ — สรุปปัจจุบัน: ดูได้ ${access.view} · แก้ไขได้ ${access.edit}`}
      >
        <div
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
          <span className='text-xs text-ink-secondary font-medium'>ระดับสิทธิ์:</span>
          {ACCESS_OPTIONS.map((opt) => (
            <span
              key={opt.value}
              className='inline-flex items-center'
              style={{ gap: 'var(--dim-space-100, 4px)', fontSize: 'var(--type-size-xs, 12px)', color: opt.color }}
            >
              <Icon name={opt.icon} size={14} />
              {opt.label}
            </span>
          ))}
          <span className='ml-auto text-xs text-ink-tertiary'>
            ฟีเจอร์บางอย่างเปิดได้แค่ "แก้ไขได้" หรือ "ดูได้" เท่านั้น
          </span>
        </div>

        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-500, 20px)' }}>
          {FEATURE_GROUPS.map((g) => (
            <FeatureGroupBlock key={g.key} group={g} features={form.features} setFeature={setFeature} disabled={readOnly} />
          ))}
        </div>
      </SectionCard>
    </div>
  );

  return (
    <QueuePageShell
      activeKey='users'
      breadcrumb={breadcrumb}
      title={isNew ? 'เพิ่มผู้ใช้ใหม่' : (composeUserName(form) || 'แก้ไขผู้ใช้')}
      tabs={TABS}
      activeTab={activeTab}
      onTabChange={setActiveTab}
    >
      <UnsavedChangesPopup
        open={leaving}
        onClose={() => setLeaving(false)}
        onSave={() => { setLeaving(false); handleSave(); }}
        onDiscard={() => { setLeaving(false); setDirty(false); history.push('/users'); }}
        title='ออกจากหน้านี้โดยไม่บันทึกหรือไม่ ?'
        description='ข้อมูลที่แก้ไขค้างไว้จะหายไปทั้งหมด — เลือก "บันทึก" เพื่อเก็บการเปลี่ยนแปลงก่อนออก'
      />

      <div className='flex flex-col flex-1 min-w-0' style={{ paddingTop: 'var(--dim-space-600, 24px)', paddingRight: 'var(--dim-space-600, 24px)', paddingBottom: 'var(--dim-space-600, 24px)', paddingLeft: 'var(--dim-space-600, 24px)', gap: 'var(--dim-space-500, 20px)' }}>
        <PermissionGate feature='users.manage' featureLabel='จัดการผู้ใช้และสิทธิ์'>
          {(readOnly) => (
            <>
              {readOnly ? <ReadOnlyNotice feature='ข้อมูลผู้ใช้' /> : null}
              {saved ? <Alert type='success' title='บันทึกสำเร็จ' subtext={saved} /> : null}
              {errors.otp ? <Alert type='error' title='ยังยืนยันตัวตนไม่สำเร็จ' subtext={errors.otp} /> : null}

              {activeTab === 'profile' ? renderProfile(readOnly) : null}
              {activeTab === 'access' ? renderAccess(readOnly) : null}
              {activeTab === 'login' ? (
                <UserLoginTab
                  form={form}
                  setField={setField}
                  isNew={isNew}
                  readOnly={readOnly}
                  verified={otpVerified}
                  onVerified={() => setOtpVerified(true)}
                  errors={errors}
                />
              ) : null}
              {activeTab === 'notify' ? (
                <UserNotifyTab
                  pref={pref}
                  onChange={(next) => { markDirty(); setPref(next); }}
                  readOnly={readOnly}
                />
              ) : null}

              {/* Sticky action bar — แสดง/บันทึก/ยกเลิก/แก้ไข ครบ */}
              <section
                className='bg-surface-card rounded-card shadow-card flex flex-wrap items-center w-full sticky bottom-0'
                style={{
                  gap: 'var(--dim-space-300, 12px)',
                  paddingTop: 'var(--dim-space-400, 16px)',
                  paddingBottom: 'var(--dim-space-400, 16px)',
                  paddingLeft: 'var(--dim-space-500, 20px)',
                  paddingRight: 'var(--dim-space-500, 20px)',
                  zIndex: 60,
                }}
              >
                <div className='flex-1 min-w-0 flex items-center flex-wrap' style={{ gap: 'var(--dim-space-300, 12px)' }}>
                  {roleMeta ? (
                    <span className='text-xs text-ink-tertiary'>
                      สรุป: <strong className='text-ink-secondary'>{roleMeta.label}</strong>
                      {' · '}{form.departments.length} แผนก
                      {' · '}ดูได้ {access.view}, แก้ไขได้ {access.edit}
                      {' · '}{form.loginChannels.length} ช่องทางเข้าสู่ระบบ
                    </span>
                  ) : null}
                  {dirty ? <ColorfulBadge style='orange' size='small' icon='edit'>มีการแก้ไขที่ยังไม่บันทึก</ColorfulBadge> : null}
                </div>
                {isNew && !otpVerified ? (
                  <span
                    className='inline-flex items-center'
                    style={{
                      gap: 'var(--dim-space-150, 6px)',
                      color: 'var(--text-input-require)',
                      fontFamily: 'var(--type-family-body)',
                      fontSize: 'var(--type-size-xs, 12px)',
                      maxWidth: 320,
                    }}
                  >
                    <Icon name='info' size={14} />
                    ต้องยืนยันตัวตนด้วย OTP ที่แท็บ "การเข้าสู่ระบบ" ก่อนจึงจะสร้างบัญชีได้
                  </span>
                ) : null}
                <NeutralSubdueButton variant='outline' size='md' onClick={goBack}>
                  ยกเลิก
                </NeutralSubdueButton>
                <BrandButton
                  size='md'
                  leadingIcon='save'
                  disabled={readOnly || (isNew && !otpVerified)}
                  onClick={handleSave}
                >
                  {isNew ? 'สร้างผู้ใช้' : 'บันทึกการเปลี่ยนแปลง'}
                </BrandButton>
              </section>
            </>
          )}
        </PermissionGate>
      </div>
    </QueuePageShell>
  );
};

export default UserEditPage;
