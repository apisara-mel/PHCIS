import React, { useEffect, useMemo, useState } from 'react';
import Icon from '@/components/icons/Icon';
import Switch from '@/components/switch/Switch';
import Alert from '@/components/alert/Alert';
import OtpInput from '@/components/forms/OtpInput';
import SelectableOptionCard from '@/components/card/SelectableOptionCard';
import BrandButton from '@/components/button/BrandButton';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import { FakeQR } from '@/pages/mobile/MobileRegisterPage';
import { LOGIN_CHANNELS } from '@/data/usersAccess';
import { SectionCard } from '@/pages/users/userEditParts';
import { auditAdmin } from '@/pages/users/usersShared';

/* แท็บ "การเข้าสู่ระบบ" ของหน้าแก้ไข/สร้างผู้ใช้ —
   TOR 1.17.5.1 (เข้าสู่ระบบหลายช่องทาง: Username+Password / QR scan / OTP)
   และ TOR 1.17.4.1 (ยืนยันตัวตนด้วย OTP ก่อนสร้างบัญชี).

   หน้าจอ "การเข้าสู่ระบบจริง" อยู่ที่ /login + /login/verify (src/pages/auth)
   ซึ่งรองรับ QR ThaID และ OTP SMS/อีเมล อยู่แล้ว และไม่อยู่ในขอบเขตที่แก้ได้
   รอบนี้ — งานฝั่ง /users จึงเป็น "ตั้งค่าช่องทางรายบุคคล + ยืนยันตัวตน +
   พรีวิว QR" แล้ว deep-link ไปหน้าเข้าสู่ระบบจริง. */

const OTP_TTL_SECONDS = 5 * 60;      /* หมดอายุ 5 นาที (เท่ากับ LoginVerifyPage) */
const RESEND_COOLDOWN = 60;          /* ส่งรหัสใหม่ได้ทุก 60 วินาที */
const MAX_ATTEMPTS = 5;              /* ผิดครบ 5 ครั้ง → ล็อก */
const LOCK_SECONDS = 15 * 60;        /* ล็อก 15 นาที */
const QR_TTL_SECONDS = 60;           /* QR หมดอายุ 1 นาที แล้วออกใหม่อัตโนมัติ */
const MOCK_OTP = '123456';

const fmt = (s) => {
  const m = Math.floor(Math.max(0, s) / 60);
  const sec = Math.max(0, s) % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
};

const ChannelRow = ({ channel, checked, onToggle, locked, lockReason, disabled }) => (
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
    <span
      className='shrink-0 inline-flex items-center justify-center'
      style={{
        width: 'var(--dim-size-600, 32px)',
        height: 'var(--dim-size-600, 32px)',
        borderRadius: 'var(--dim-radius-200, 8px)',
        background: 'var(--surface-brandPrimary-quaternary)',
        color: 'var(--text-brandPrimary-default)',
      }}
    >
      <Icon name={channel.icon} size={18} />
    </span>
    <span className='flex-1 min-w-0 flex flex-col' style={{ gap: 'var(--dim-space-050, 2px)' }}>
      <span className='inline-flex items-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
        <span style={{ color: 'var(--text-content-primary)', fontSize: 'var(--type-size-sm, 14px)', fontWeight: 'var(--type-weight-medium, 500)' }}>
          {channel.label}
        </span>
        {locked ? <ColorfulBadge style='indigo' size='small' icon='lock'>ล็อกโดยระบบกลาง</ColorfulBadge> : null}
      </span>
      <span style={{ color: 'var(--text-content-tertiary)', fontSize: 'var(--type-size-xs, 12px)' }}>
        {locked ? lockReason : channel.desc}
      </span>
    </span>
    <Switch
      checked={checked}
      disabled={locked || disabled}
      onChange={(next) => onToggle(typeof next === 'boolean' ? next : !checked)}
      aria-label={`เปิด-ปิด ${channel.label}`}
    />
  </div>
);

const UserLoginTab = ({
  form,
  setField,
  isNew,
  readOnly,
  verified,
  onVerified,
  errors = {},
}) => {
  const fromIdp = form.source === 'idp';
  const channels = form.loginChannels || [];

  /* ── QR ประจำตัว ─────────────────────────────────────────────────── */
  const [qrSeed, setQrSeed] = useState(() => `${form.id || 'new'}-${Date.now()}`);
  const [qrLeft, setQrLeft] = useState(QR_TTL_SECONDS);
  useEffect(() => {
    const t = setInterval(() => {
      setQrLeft((prev) => {
        if (prev <= 1) {
          setQrSeed(`${form.id || 'new'}-${Date.now()}`);
          return QR_TTL_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [form.id]);

  /* ── OTP ─────────────────────────────────────────────────────────── */
  const [otpStep, setOtpStep] = useState('idle');   /* idle | channel | code */
  const [otpChannel, setOtpChannel] = useState('');
  const [code, setCode] = useState('');
  const [otpError, setOtpError] = useState('');
  const [ttl, setTtl] = useState(0);
  const [cooldown, setCooldown] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [lockLeft, setLockLeft] = useState(0);

  useEffect(() => {
    if (otpStep !== 'code' && lockLeft <= 0 && cooldown <= 0) return undefined;
    const t = setInterval(() => {
      setTtl((v) => (v > 0 ? v - 1 : 0));
      setCooldown((v) => (v > 0 ? v - 1 : 0));
      setLockLeft((v) => (v > 0 ? v - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, [otpStep, lockLeft, cooldown]);

  const smsReady = !!String(form.phone || '').trim();
  const mailReady = !!String(form.email || '').trim();

  const otpChannels = useMemo(() => ([
    {
      key: 'sms',
      title: 'SMS (ข้อความมือถือ)',
      desc: smsReady
        ? `ส่งรหัสยืนยัน 6 หลัก ไปยัง ${String(form.phone).replace(/\d(?=\d{4})/g, '*')}`
        : 'ยังไม่ได้กรอกเบอร์ติดต่อ — กลับไปกรอกที่แท็บ "ข้อมูลผู้ใช้" ก่อน',
      ready: smsReady,
    },
    {
      key: 'email',
      title: 'อีเมล (Email)',
      desc: mailReady
        ? `ส่งรหัสยืนยันไปยัง ${form.email}`
        : 'ยังไม่ได้กรอกอีเมล — กลับไปกรอกที่แท็บ "ข้อมูลผู้ใช้" ก่อน',
      ready: mailReady,
    },
  ]), [smsReady, mailReady, form.phone, form.email]);

  const sendOtp = (channelKey) => {
    setOtpChannel(channelKey);
    setOtpStep('code');
    setCode('');
    setOtpError('');
    setTtl(OTP_TTL_SECONDS);
    setCooldown(RESEND_COOLDOWN);
    auditAdmin(`ส่ง OTP (mock) ทาง ${channelKey === 'sms' ? 'SMS' : 'อีเมล'} เพื่อยืนยันตัวตนผู้ใช้`);
  };

  const verify = (value) => {
    if (lockLeft > 0) return;
    if (ttl <= 0) {
      setOtpError('รหัสหมดอายุแล้ว — กด "ส่งรหัสใหม่"');
      return;
    }
    if (value === MOCK_OTP) {
      setOtpError('');
      setOtpStep('idle');
      setAttempts(0);
      onVerified?.(otpChannel);
      auditAdmin('ยืนยันตัวตนด้วย OTP สำเร็จ (mock)');
      return;
    }
    const next = attempts + 1;
    setAttempts(next);
    if (next >= MAX_ATTEMPTS) {
      setLockLeft(LOCK_SECONDS);
      setOtpError(`ใส่รหัสผิดครบ ${MAX_ATTEMPTS} ครั้ง — ระบบล็อกการยืนยัน 15 นาที`);
      auditAdmin('ยืนยัน OTP ล้มเหลวครบ 5 ครั้ง — ล็อก 15 นาที', false);
    } else {
      setOtpError(`รหัสไม่ถูกต้อง (ผิดครั้งที่ ${next} จาก ${MAX_ATTEMPTS})`);
    }
  };

  const toggleChannel = (key, next) => {
    if (readOnly) return;
    const set = new Set(channels);
    if (next) set.add(key);
    else set.delete(key);
    if (set.size === 0) return;   /* ต้องเหลืออย่างน้อย 1 ช่องทาง */
    setField('loginChannels', [...set]);
  };

  const onlyOne = channels.length === 1;

  return (
    <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-500, 20px)' }}>
      <Alert
        type='warning'
        title='ส่วนนี้เป็น mock — ยังไม่ส่ง OTP / ไม่ยิง QR จริง'
        subtext={'รหัส OTP ทดสอบคือ 123456 (ไม่มีการส่ง SMS/อีเมลออกไปจริง) และ QR เป็นภาพจำลอง. '
          + 'การเชื่อมฐานข้อมูลบุคลากรของสำนักอนามัย (HR) เตรียมไว้เป็น hook สำหรับอนาคต ยังไม่ได้ต่อจริง. '
          + 'การเข้าสู่ระบบจริงยังใช้ mock auth ที่หน้า /login'}
      />

      <SectionCard
        icon='login'
        title='ช่องทางเข้าสู่ระบบของบัญชีนี้'
        subtitle={`เปิด-ปิดได้รายบุคคล — ต้องเหลืออย่างน้อย 1 ช่องทางเสมอ (ขณะนี้เปิดอยู่ ${channels.length} ช่องทาง)`}
        action={(
          <NeutralSubdueButton variant='outline' size='sm' leadingIcon='open_in_new' onClick={() => window.open('/login', '_blank', 'noopener')}>
            ดูหน้าเข้าสู่ระบบจริง
          </NeutralSubdueButton>
        )}
      >
        {errors.loginChannels ? (
          <Alert type='error' title='ปิดทุกช่องทางไม่ได้' subtext={errors.loginChannels} />
        ) : null}
        {onlyOne ? (
          <Alert
            type='info'
            title='เหลือช่องทางเดียว'
            subtext='ปิดช่องทางสุดท้ายไม่ได้ — ผู้ใช้จะเข้าสู่ระบบไม่ได้เลย ต้องเปิดช่องทางอื่นก่อนจึงจะปิดช่องทางนี้ได้'
          />
        ) : null}
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          {LOGIN_CHANNELS.map((c) => {
            const checked = channels.includes(c.key);
            const locked = fromIdp && c.key === 'password';
            return (
              <ChannelRow
                key={c.key}
                channel={c}
                checked={locked ? true : checked}
                locked={locked}
                lockReason='บัญชีนี้มาจาก Directory Service — รหัสผ่านถูกยืนยันที่ระบบกลาง (IdP) ปิด/แก้ที่นี่ไม่ได้'
                disabled={readOnly || (checked && onlyOne)}
                onToggle={(next) => toggleChannel(c.key, next)}
              />
            );
          })}
        </div>
      </SectionCard>

      <SectionCard
        icon='qr_code_2'
        title='QR ประจำตัวสำหรับสแกนเข้าสู่ระบบ'
        subtitle='ใช้สแกนที่หน้าเข้าสู่ระบบ — QR หมดอายุใน 1 นาที และระบบออกใหม่ให้อัตโนมัติ'
        action={<ColorfulBadge style={qrLeft > 15 ? 'green' : 'orange'} size='small' icon='timer'>{`หมดอายุใน ${fmt(qrLeft)}`}</ColorfulBadge>}
      >
        {!channels.includes('qr') ? (
          <Alert type='info' title='ช่องทาง QR ถูกปิดอยู่' subtext='เปิดสวิตช์ "สแกน QR ประจำตัว" ด้านบนก่อน ผู้ใช้จึงจะใช้ QR นี้เข้าสู่ระบบได้' />
        ) : null}
        <div className='flex flex-wrap items-center w-full' style={{ gap: 'var(--dim-space-500, 20px)' }}>
          <div
            className='shrink-0 inline-flex items-center justify-center'
            style={{
              paddingTop: 'var(--dim-space-300, 12px)',
              paddingBottom: 'var(--dim-space-300, 12px)',
              paddingLeft: 'var(--dim-space-300, 12px)',
              paddingRight: 'var(--dim-space-300, 12px)',
              background: 'var(--surface-card-100)',
              border: 'var(--dim-stroke-100, 1px) solid var(--border-card-default)',
              borderRadius: 'var(--dim-radius-300, 10px)',
              opacity: channels.includes('qr') ? 1 : 0.45,
            }}
          >
            <FakeQR seed={qrSeed} size={160} />
          </div>
          <div className='flex-1 min-w-0 flex flex-col' style={{ gap: 'var(--dim-space-200, 8px)' }}>
            <span style={{ color: 'var(--text-content-secondary)', fontSize: 'var(--type-size-sm, 14px)' }}>
              QR นี้ผูกกับบัญชี <strong>{form.email || 'ยังไม่ระบุอีเมล'}</strong> และเปลี่ยนค่าใหม่ทุก 1 นาที
              เพื่อกันการถ่ายภาพไปใช้ซ้ำ
            </span>
            <span style={{ color: 'var(--text-content-tertiary)', fontSize: 'var(--type-size-xs, 12px)' }}>
              รหัสอ้างอิง: {qrSeed}
            </span>
            <div className='flex flex-wrap items-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
              <BrandSubdueButton
                variant='outline'
                size='sm'
                leadingIcon='refresh'
                disabled={readOnly}
                onClick={() => {
                  setQrSeed(`${form.id || 'new'}-${Date.now()}`);
                  setQrLeft(QR_TTL_SECONDS);
                  auditAdmin('ออก QR ประจำตัวใหม่ให้ผู้ใช้');
                }}
              >
                ออก QR ใหม่ทันที
              </BrandSubdueButton>
              <NeutralSubdueButton variant='outline' size='sm' leadingIcon='print' onClick={() => window.print()}>
                พิมพ์บัตร QR
              </NeutralSubdueButton>
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        icon='verified_user'
        title={isNew ? 'ยืนยันตัวตนก่อนสร้างบัญชี (บังคับ)' : 'ทดสอบส่ง OTP'}
        subtitle={isNew
          ? 'TOR กำหนดให้ผู้ใช้ใหม่ต้องยืนยันตัวตนด้วย OTP อย่างน้อย 1 ช่องทางก่อนจึงจะสร้างบัญชีได้'
          : 'ส่งรหัสทดสอบไปยังช่องทางที่ผู้ใช้ลงทะเบียนไว้ เพื่อตรวจว่าเบอร์/อีเมลใช้งานได้จริง'}
        action={verified ? <ColorfulBadge style='green' size='small' icon='check_circle'>ยืนยันตัวตนแล้ว</ColorfulBadge> : null}
      >
        {isNew && !verified ? (
          <Alert
            type='warning'
            title='ยังไม่ได้ยืนยันตัวตน'
            subtext='ปุ่ม "สร้างผู้ใช้" จะยังกดไม่ได้จนกว่าจะยืนยัน OTP สำเร็จอย่างน้อย 1 ช่องทาง'
          />
        ) : null}

        {lockLeft > 0 ? (
          <Alert
            type='error'
            title='การยืนยันถูกล็อกชั่วคราว'
            subtext={`ใส่รหัสผิดเกินจำนวนที่กำหนด — ลองใหม่ได้ในอีก ${fmt(lockLeft)} นาที`}
          />
        ) : null}

        {otpStep === 'idle' ? (
          <div className='flex flex-wrap items-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
            <BrandButton
              size='md'
              leadingIcon='send'
              disabled={readOnly || lockLeft > 0 || (!smsReady && !mailReady)}
              onClick={() => setOtpStep('channel')}
            >
              {verified ? 'ยืนยันใหม่อีกครั้ง' : (isNew ? 'เริ่มยืนยันตัวตน' : 'ทดสอบส่ง OTP')}
            </BrandButton>
            {!smsReady && !mailReady ? (
              <span style={{ color: 'var(--text-input-require)', fontSize: 'var(--type-size-xs, 12px)' }}>
                ต้องกรอกอีเมลหรือเบอร์ติดต่อที่แท็บ "ข้อมูลผู้ใช้" ก่อน
              </span>
            ) : null}
          </div>
        ) : null}

        {otpStep === 'channel' ? (
          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
            <span style={{ color: 'var(--text-content-secondary)', fontSize: 'var(--type-size-sm, 14px)' }}>
              เลือกช่องทางรับรหัสยืนยัน
            </span>
            <div className='flex flex-wrap w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
              {otpChannels.map((c) => (
                <SelectableOptionCard
                  key={c.key}
                  icon={c.key === 'sms' ? 'sms' : 'mail'}
                  title={c.title}
                  description={c.desc}
                  disabled={!c.ready}
                  selected={otpChannel === c.key}
                  onSelect={() => c.ready && sendOtp(c.key)}
                  style={{ width: 320, maxWidth: '100%' }}
                />
              ))}
            </div>
            <div>
              <NeutralSubdueButton variant='outline' size='sm' onClick={() => setOtpStep('idle')}>
                ยกเลิกการยืนยัน
              </NeutralSubdueButton>
            </div>
          </div>
        ) : null}

        {otpStep === 'code' ? (
          <div className='flex flex-col items-start w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
            <span style={{ color: 'var(--text-content-secondary)', fontSize: 'var(--type-size-sm, 14px)' }}>
              กรอกรหัส 6 หลักที่ส่งไปยัง{otpChannel === 'sms' ? `เบอร์ ${form.phone}` : `อีเมล ${form.email}`}
              {' · '}
              <strong>{ttl > 0 ? `รหัสหมดอายุใน ${fmt(ttl)}` : 'รหัสหมดอายุแล้ว'}</strong>
            </span>
            <OtpInput
              length={6}
              size='xl'
              value={code}
              onChange={(v) => { setCode(v); if (otpError) setOtpError(''); }}
              onComplete={verify}
              error={otpError}
              disabled={lockLeft > 0}
              autoFocus
            />
            <div className='flex flex-wrap items-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
              <BrandSubdueButton
                variant='outline'
                size='sm'
                leadingIcon='refresh'
                disabled={cooldown > 0 || lockLeft > 0}
                onClick={() => sendOtp(otpChannel)}
              >
                {cooldown > 0 ? `ส่งรหัสใหม่ได้ใน ${cooldown} วินาที` : 'ส่งรหัสใหม่'}
              </BrandSubdueButton>
              <NeutralSubdueButton variant='outline' size='sm' onClick={() => { setOtpStep('idle'); setCode(''); setOtpError(''); }}>
                ยกเลิก
              </NeutralSubdueButton>
            </div>
          </div>
        ) : null}
      </SectionCard>
    </div>
  );
};

export default UserLoginTab;
