import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import {
  MobileShell,
  MobileHeader,
  Sym,
  BrandButton,
  BrandSubdueButton,
  BrandCircleSubdueIconButton,
} from '@/components/mobile';
import Alert from '@/components/alert/Alert';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import MobileIconBadge from '@/components/mobile/MobileIconBadge';
import { CURRENT_USER } from '@/data/mobileMock';
import { FakeQR } from '@/pages/mobile/MobileRegisterPage';
import { UnlockPinView } from '@/pages/mobile/MobileLoginPage';
import MobileOtpField from '@/components/mobile/OtpField';

const BMA_LOGO = '/images/office-health-logo.png';

/* BMA Health · Profile — Archive Figma 192:149632.
   Notes: sensitive edits require PIN/biometric when configured; otherwise OTP. */

const PROFILE_STORE_KEY = 'phcis_mobile_profile_v1';

const loadProfile = () => {
  try {
    const raw = localStorage.getItem(PROFILE_STORE_KEY);
    if (raw) return { ...CURRENT_USER, ...JSON.parse(raw) };
  } catch (_e) { /* ignore */ }
  return { ...CURRENT_USER };
};

const saveProfile = (p) => {
  try {
    localStorage.setItem(PROFILE_STORE_KEY, JSON.stringify(p));
  } catch (_e) { /* ignore */ }
};

const maskPhone = (phone) => {
  const d = String(phone || '').replace(/\D/g, '');
  if (d.length < 4) return phone;
  return `***-***-${d.slice(-4)}`;
};

const maskEmail = (email) => {
  const [user, domain] = String(email || '').split('@');
  if (!user || !domain) return email;
  if (user.length <= 2) return `${user[0]}*@${domain}`;
  return `${user[0]}${'*'.repeat(user.length - 2)}${user[user.length - 1]}@${domain}`;
};

const Card = ({ children, style }) => (
  <div
    style={{
      background: 'var(--surface-card-100, #FFFFFF)',
      borderRadius: 'var(--dim-radius-500, 16px)',
      boxShadow: 'var(--shadow-brand-drop-bottom-200)',
      padding: 'var(--dim-space-400, 16px)',
      ...style,
    }}
  >
    {children}
  </div>
);

const SectionTitle = ({ children }) => (
  <p style={{
    margin: '0 0 var(--dim-space-300, 12px)',
    fontFamily: 'var(--type-family-heading-graphic2)',
    fontSize: 'var(--type-size-base, 16px)',
    color: 'var(--text-brandPrimary-default, #007549)',
  }}
  >
    {children}
  </p>
);

const NavRow = ({ icon, label, value, badge, onClick, last }) => (
  <button
    type='button'
    onClick={onClick}
    className='flex items-start w-full text-left'
    style={{
      gap: 'var(--dim-space-300, 12px)',
      padding: 'var(--dim-space-300, 12px) 0',
      border: 0,
      background: 'transparent',
      cursor: 'pointer',
      borderBottom: last ? 0 : 'var(--dim-stroke-100) solid var(--border-neutral-quaternary, #F4F5F5)',
    }}
  >
    <MobileIconBadge icon={icon} tone='green' size={32} iconSize={16} />
    <div className='flex-1 min-w-0' style={{ display: 'flex', flexDirection: 'column', gap: 'var(--dim-space-100, 4px)' }}>
      {label && (
        <p style={{ margin: 0, fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>{label}</p>
      )}
      {badge}
      {value && (
        <p style={{
          margin: 0,
          fontSize: 'var(--type-size-sm)',
          color: 'var(--text-content-default)',
          whiteSpace: 'normal',
          wordBreak: 'break-word',
        }}
        >
          {value}
        </p>
      )}
    </div>
    <Sym name='chevron_right' size={20} color='var(--text-content-tertiary)' style={{ marginTop: 6, flexShrink: 0 }} />
  </button>
);

const Field = ({ label, required, helper, children }) => (
  <div className='flex flex-col' style={{ gap: 'var(--dim-space-150, 6px)', width: '100%' }}>
    <label style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-default)' }}>
      {label}{required && <span style={{ color: 'var(--text-danger-default, #DC2626)' }}> *</span>}
    </label>
    {children}
    {helper && <p style={{ margin: 0, fontSize: 'var(--type-size-sm)', color: 'var(--text-content-tertiary)' }}>{helper}</p>}
  </div>
);

const PillInput = ({ className = 'mih-profile-input', ...props }) => (
  <input
    className={className}
    {...props}
    style={{
      width: '100%',
      height: 56,
      padding: '0 var(--dim-space-600, 24px)',
      borderRadius: 'var(--dim-radius-full)',
      border: 'var(--dim-stroke-100) solid var(--border-input-default, #E2E4E6)',
      background: 'var(--surface-input-default, #FFFFFF)',
      fontFamily: 'var(--type-family-body)',
      fontSize: 'var(--type-size-base, 16px)',
      color: 'var(--text-content-default)',
      ...props.style,
    }}
  />
);

const EditShell = ({ title, onBack, onSave, saveDisabled, children }) => (
  <div className='flex flex-col' style={{ minHeight: '100%', background: 'var(--background-screen-brand-100, #F4FBF8)' }}>
    <MobileHeader title={title} onBack={onBack} />
    <div className='flex-1' style={{ padding: 'var(--dim-space-400, 16px) var(--dim-space-400, 16px) var(--dim-space-600, 24px)' }}>
      <Card style={{ borderRadius: 'var(--dim-radius-600, 24px)', padding: 'var(--dim-space-600, 24px)', gap: 'var(--dim-space-400, 16px)', display: 'flex', flexDirection: 'column' }}>
        {children}
      </Card>
    </div>
    <div style={{
      padding: 'var(--dim-space-400, 16px)',
      background: 'var(--surface-card-100)',
      borderTop: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
      boxShadow: 'var(--shadow-brand-drop-bottom-200)',
    }}
    >
      <BrandButton size='lg' trailingIcon='chevron_right' disabled={saveDisabled} onClick={onSave}>
        บันทึกการเปลี่ยนแปลง
      </BrandButton>
    </div>
  </div>
);

const SuccessToast = ({ message, onDone }) => {
  useEffect(() => {
    const t = window.setTimeout(onDone, 1600);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div
      className='flex flex-col items-center justify-center'
      style={{
        minHeight: '100%',
        background: 'var(--mobile-surface-brandPrimaryButton-default, #08A768)',
        padding: 'var(--dim-space-600, 24px)',
      }}
    >
      <div
        className='flex flex-col items-center'
        style={{
          width: '100%', maxWidth: 340,
          background: 'var(--surface-card-100)',
          borderRadius: 'var(--dim-radius-600, 24px)',
          padding: 'var(--dim-space-800, 32px) var(--dim-space-600, 24px)',
          gap: 'var(--dim-space-400, 16px)',
          boxShadow: 'var(--shadow-brand-drop-bottom-200)',
        }}
      >
        <span className='inline-flex items-center justify-center' style={{
          width: 72, height: 72, borderRadius: 'var(--dim-radius-full)',
          background: 'var(--surface-brandPrimary-quaternary)', color: 'var(--text-brandPrimary-default)',
        }}
        >
          <Sym name='check_circle' size={40} fill />
        </span>
        <p style={{
          margin: 0, textAlign: 'center',
          fontFamily: 'var(--type-family-heading-graphic2)',
          fontSize: 'var(--type-size-xl, 20px)',
          color: 'var(--text-brandPrimary-default)',
        }}
        >
          {message}
        </p>
      </div>
    </div>
  );
};

/* exported — /m/consent ใช้ยืนยันตัวตนก่อนลงนาม/ถอนความยินยอม (กติกาเดียวกัน) */
export const ProfileOtpVerification = ({ user, onBack, onVerified }) => {
  const [otp, setOtp] = useState('');

  return (
    <div
      className='flex flex-col'
      style={{
        height: '100%',
        minHeight: 0,
        background: 'var(--background-screen-brand-100, #F4FBF8)',
      }}
    >
      <MobileHeader title='ยืนยันตัวตน' onBack={onBack} />
      <main
        className='flex flex-1 min-h-0 flex-col items-center'
        style={{
          gap: 'var(--dim-space-600, 24px)',
          padding: 'var(--dim-space-800, 32px) var(--dim-space-400, 16px)',
        }}
      >
        <img
          src='/illustration/mobile/register-otp-lock.svg'
          alt=''
          aria-hidden
          style={{
            width: 'var(--dim-size-2000, 128px)',
            height: 'var(--dim-size-2000, 128px)',
          }}
        />
        <div className='flex flex-col items-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          <h1
            style={{
              margin: 0,
              fontFamily: 'var(--type-family-heading-graphic2)',
              fontSize: 'var(--type-size-2xl, 24px)',
              fontWeight: 'var(--type-weight-regular, 400)',
              lineHeight: 1.375,
              textAlign: 'center',
              color: 'var(--text-brandPrimary-default, #007549)',
            }}
          >
            กรอกรหัส OTP
          </h1>
          <p
            style={{
              margin: 0,
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-sm, 14px)',
              lineHeight: 1.5,
              textAlign: 'center',
              color: 'var(--text-content-secondary, #636B72)',
            }}
          >
            ส่งรหัสยืนยันไปยังเบอร์ {maskPhone(user.phone)}
          </p>
        </div>
        <MobileOtpField
          value={otp}
          onChange={setOtp}
          onComplete={onVerified}
          showFieldName={false}
          showHelperText={false}
        />
      </main>
      <footer
        style={{
          padding: 'var(--dim-space-400, 16px)',
          borderTop: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary, #E2F3EB)',
          boxShadow: 'var(--shadow-brand-drop-top-100)',
          background: 'var(--surface-card-100, #FFFFFF)',
        }}
      >
        <BrandButton
          size='lg'
          disabled={otp.length !== 6}
          onClick={onVerified}
          style={{ width: '100%' }}
        >
          ยืนยัน
        </BrandButton>
      </footer>
    </div>
  );
};

/* ─── Main profile ──────────────────────────────────────────────────── */

const ProfileHome = ({ user, onEdit, onCopyHn }) => {
  const history = useHistory();
  const hn = user.centers?.[0]?.hn || '67-004321';
  const fullName = `${user.prefix || ''}${user.firstName} ${user.lastName}`;
  const emergency = user.emergencyContacts?.[0];
  const emergencyLabel = emergency
    ? `${emergency.firstName} ${emergency.lastName} (${emergency.relation}), ${emergency.phone}`
    : '—';

  return (
    <div
      className='flex flex-col'
      style={{
        minHeight: '100%',
        background: 'linear-gradient(72deg, #13B292 58%, #00A08E 83%)',
      }}
    >
      {/* Top bar */}
      <div
        className='flex items-center justify-center'
        style={{
          gap: 'var(--dim-space-300, 12px)',
          padding: 'var(--dim-space-200, 8px)',
          paddingTop: 'var(--dim-space-100, 4px)',
        }}
      >
        <span style={{ width: 48, height: 48, flexShrink: 0 }} aria-hidden />
        <span style={{ width: 48, height: 48, flexShrink: 0 }} aria-hidden />
        <p style={{
          flex: 1, margin: 0, textAlign: 'center',
          fontFamily: 'var(--type-family-heading-graphic2)',
          fontSize: 'var(--type-size-base, 16px)',
          color: 'var(--text-neutral-on-neutral, #FFFFFF)',
        }}
        >
          โปรไฟล์
        </p>
        <button
          type='button'
          aria-label='ตั้งค่า'
          onClick={() => history.push('/m/settings')}
          className='inline-flex items-center justify-center shrink-0'
          style={{
            width: 48, height: 48, borderRadius: 'var(--dim-radius-full)',
            border: 'var(--dim-stroke-100) solid rgba(255,255,255,0.45)',
            background: 'transparent', color: '#FFFFFF', cursor: 'pointer',
          }}
        >
          <Sym name='settings' size={20} />
        </button>
        <button
          type='button'
          aria-label='การแจ้งเตือน'
          onClick={() => history.push('/m/notifications')}
          className='inline-flex items-center justify-center shrink-0'
          style={{
            position: 'relative',
            width: 48, height: 48, borderRadius: 'var(--dim-radius-full)',
            border: 'var(--dim-stroke-100) solid rgba(255,255,255,0.45)',
            background: 'transparent', color: '#FFFFFF', cursor: 'pointer',
          }}
        >
          <Sym name='notifications' size={20} />
          <span style={{
            position: 'absolute', top: 10, right: 10, width: 8, height: 8,
            borderRadius: 'var(--dim-radius-full)',
            background: 'var(--surface-danger-default, #DC2626)',
            pointerEvents: 'none',
          }}
          />
        </button>
      </div>

      {/* Avatar floats over the sheet */}
      <div className='flex justify-center' style={{ paddingTop: 'var(--dim-space-400, 16px)', position: 'relative', zIndex: 2 }}>
        <span className='overflow-hidden' style={{
          width: 96, height: 96, borderRadius: 'var(--dim-radius-full)',
          border: 'var(--dim-stroke-400, 4px) solid #FFFFFF',
          boxShadow: 'var(--shadow-brand-drop-bottom-200)',
          marginBottom: -48,
        }}
        >
          <img src={user.avatar} alt='' width={96} height={96} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </span>
      </div>

      {/* Content sheet */}
      <div
        className='flex-1 flex flex-col items-center'
        style={{
          marginTop: 'var(--dim-space-800, 32px)',
          padding: 'var(--dim-space-400, 16px)',
          paddingTop: 'var(--dim-space-1200, 48px)',
          paddingBottom: 'var(--dim-space-600, 24px)',
          gap: 'var(--dim-space-400, 16px)',
          background: 'linear-gradient(180deg, var(--surface-card-100, #FFFFFF) 0%, #F4FBF8 100%)',
          borderTopLeftRadius: 'var(--dim-radius-600, 24px)',
          borderTopRightRadius: 'var(--dim-radius-600, 24px)',
          boxShadow: 'var(--shadow-brand-drop-bottom-200)',
        }}
      >
        <div className='flex flex-col items-center' style={{ gap: 'var(--dim-space-200, 8px)', width: '100%' }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{
              margin: 0,
              fontFamily: 'var(--type-family-heading-graphic2)',
              fontSize: 'var(--type-size-xl, 20px)',
              color: 'var(--text-content-default)',
            }}
            >
              {user.firstName} {user.lastName}
            </p>
            <p style={{
              margin: 'var(--dim-space-100, 4px) 0 0',
              fontSize: 'var(--type-size-sm)',
              color: 'var(--text-content-tertiary)',
            }}
            >
              อายุ {user.age} ปี • กรุ๊ปเลือด {user.bloodType || 'O'}
            </p>
          </div>
          <BrandSubdueButton
            variant='outline'
            size='sm'
            leadingIcon='edit'
            onClick={() => onEdit('photo')}
            style={{ width: 'auto', minWidth: 80 }}
          >
            แก้ไข
          </BrandSubdueButton>
        </div>

        {/* Digital patient card */}
        <div
          style={{
            width: '100%',
            background: 'var(--surface-card-100, #FFFFFF)',
            borderRadius: 'var(--dim-radius-450, 14px)',
            borderTop: '8px solid var(--brand-p400, #6AD6A5)',
            boxShadow: 'var(--shadow-brand-drop-bottom-200)',
            padding: 'var(--dim-space-600, 24px) var(--dim-space-400, 16px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 'var(--dim-space-400, 16px)',
          }}
        >
          <div className='flex flex-col items-center' style={{ gap: 'var(--dim-space-200, 8px)', width: '100%' }}>
            <p style={{
              margin: 0, width: '100%', textAlign: 'center',
              fontFamily: 'var(--type-family-heading-graphic2)',
              fontSize: 'var(--type-size-base)',
              color: 'var(--text-content-default)',
            }}
            >
              บัตรผู้ป่วยดิจิทัล
            </p>
            <div className='flex flex-col items-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
              <span className='overflow-hidden' style={{
                width: 48, height: 48, borderRadius: 'var(--dim-radius-full)',
                border: 'var(--dim-stroke-400, 4px) solid #FFFFFF',
                background: 'var(--surface-card-100)',
              }}
              >
                <img
                  src={BMA_LOGO}
                  alt='สำนักอนามัย'
                  width={48}
                  height={48}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              </span>
              <p style={{
                margin: 0, textAlign: 'center',
                fontFamily: 'var(--type-family-heading-graphic)',
                fontWeight: 'var(--type-weight-bold, 700)',
                fontSize: 'var(--type-size-sm)',
                color: 'var(--text-brandPrimary-default, #007549)',
                lineHeight: 1.25,
              }}
              >
                สำนักอนามัย กรุงเทพมหานคร
              </p>
            </div>
          </div>

          <FakeQR seed={`HN-${hn}-${user.citizenId}`} size={128} />

          <div className='flex flex-col' style={{ gap: 'var(--dim-space-300, 12px)', width: '100%' }}>
            <div className='flex items-center' style={{ gap: 'var(--dim-space-300, 12px)' }}>
              <MobileIconBadge icon='face' tone='green' size={40} iconSize={16} />
              <div>
                <p style={{ margin: 0, fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>ชื่อ-นามสกุล</p>
                <p style={{
                  margin: 0,
                  fontFamily: 'var(--type-family-heading-graphic2)',
                  fontSize: 'var(--type-size-base)',
                  color: 'var(--text-content-default)',
                }}
                >
                  {fullName}
                </p>
              </div>
            </div>
            <div className='flex items-center' style={{ gap: 'var(--dim-space-300, 12px)' }}>
              <MobileIconBadge icon='calendar_today' tone='green' size={40} iconSize={16} />
              <div>
                <p style={{ margin: 0, fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>วันเกิด</p>
                <p style={{
                  margin: 0,
                  fontFamily: 'var(--type-family-heading-graphic2)',
                  fontSize: 'var(--type-size-base)',
                  color: 'var(--text-content-default)',
                }}
                >
                  {user.birthDate}
                </p>
              </div>
            </div>
          </div>

          <div
            className='flex items-end'
            style={{
              gap: 'var(--dim-space-400, 16px)',
              width: '100%',
              padding: 'var(--dim-space-400, 16px)',
              background: 'var(--surface-alert-info, #F0F6FF)',
              borderRadius: 'var(--dim-radius-600, 24px)',
            }}
          >
            <div className='flex-1'>
              <p style={{ margin: 0, fontSize: 'var(--type-size-xxs, 10px)', color: 'var(--text-content-tertiary)' }}>
                หมายเลขผู้ป่วย (HN)
              </p>
              <p style={{
                margin: 'var(--dim-space-100, 4px) 0 0',
                fontSize: 'var(--type-size-xl, 20px)',
                fontWeight: 'var(--type-weight-bold, 700)',
                color: 'var(--text-brandPrimary-default, #007549)',
              }}
              >
                HN: {hn}
              </p>
            </div>
            <BrandCircleSubdueIconButton
              variant='fill'
              size='md'
              icon='content_copy'
              aria-label='คัดลอก HN'
              onClick={() => onCopyHn(hn)}
            />
          </div>
        </div>

        {/* Contact */}
        <Card style={{ width: '100%' }}>
          <SectionTitle>ข้อมูลการติดต่อ</SectionTitle>
          <NavRow icon='smartphone' label='เบอร์โทร' value={maskPhone(user.phone)} onClick={() => onEdit('phone')} />
          <NavRow icon='mail' label='อีเมล' value={maskEmail(user.email)} onClick={() => onEdit('email')} />
          <NavRow icon='report' label='ผู้ติดต่อฉุกเฉิน' value={emergencyLabel} onClick={() => onEdit('emergency')} last />
        </Card>

        {/* Address */}
        <Card style={{ width: '100%' }}>
          <SectionTitle>ที่อยู่</SectionTitle>
          <NavRow icon='location_on' label='ที่อยู่ที่ติดต่อได้' value={user.address} onClick={() => onEdit('address')} />
          <NavRow
            icon='location_on'
            label='ที่อยู่สำหรับรับยา'
            badge={user.shippingSameAsContact ? (
              <ColorfulBadge style='teal' size='small' hierarchy='secondary' width='hug' showIcon icon='check'>
                ใช้ที่อยู่เดียวกับที่อยู่ที่ติดต่อได้
              </ColorfulBadge>
            ) : null}
            value={user.shippingAddress || user.address}
            onClick={() => onEdit('shipping')}
            last
          />
        </Card>

        {/* Benefits */}
        <Card style={{ width: '100%' }}>
          <SectionTitle>สิทธิการรักษาพยาบาล</SectionTitle>
          <Alert
            type='info'
            title='หากต้องการแก้ไข กรุณาติดต่อที่ศูนย์บริการใกล้บ้านท่าน'
            showSubtext={false}
            showCloseButton={false}
          />
          <div className='flex flex-col' style={{ gap: 'var(--dim-space-300, 12px)', marginTop: 'var(--dim-space-300, 12px)' }}>
            {(user.benefits || []).map((b) => (
              <div
                key={b.label}
                className='flex items-center'
                style={{ gap: 'var(--dim-space-300, 12px)' }}
              >
                <MobileIconBadge icon='id_card' tone='green' size={32} iconSize={16} />
                <p className='flex-1' style={{
                  margin: 0,
                  fontSize: 'var(--type-size-sm)',
                  color: 'var(--text-content-default)',
                }}
                >
                  {b.label}
                </p>
                {b.primary && (
                  <ColorfulBadge style='blue' size='small' hierarchy='secondary' width='hug'>
                    สิทธิหลัก
                  </ColorfulBadge>
                )}
              </div>
            ))}
          </div>
        </Card>

        {/* Consent (PDPA) — TOR 1.5.11 / ด.1.1.5: ให้ความยินยอม + ขอถอนจากมือถือ */}
        <Card style={{ width: '100%' }}>
          <SectionTitle>ความยินยอม (PDPA)</SectionTitle>
          <NavRow
            icon='privacy_tip'
            label='แบบฟอร์มความยินยอม · สแกน QR · ขอถอนความยินยอม'
            value='ดูและจัดการความยินยอมของคุณ'
            onClick={() => history.push('/m/consent')}
            last
          />
        </Card>
      </div>
    </div>
  );
};

/* ─── Edit views ────────────────────────────────────────────────────── */

const EditPhone = ({ user, onBack, onSave }) => {
  const [phone, setPhone] = useState(user.phone || '');
  const dirty = phone.replace(/\D/g, '') !== String(user.phone || '').replace(/\D/g, '') && phone.replace(/\D/g, '').length >= 9;
  return (
    <EditShell title='แก้ไขเบอร์โทรศัพท์' onBack={onBack} saveDisabled={!dirty} onSave={() => onSave({ phone })}>
      <Field label='เบอร์โทรศัพท์' required helper='ใช้สำหรับเข้าสู่ระบบ รับ OTP และการติดต่อ'>
        <PillInput type='tel' inputMode='numeric' value={phone} onChange={(e) => setPhone(e.target.value)} autoFocus />
      </Field>
      <Alert type='info' title='Information' subtext='เมื่อเปลี่ยนเบอร์ ระบบจะส่งรหัส OTP ไปยังเบอร์ใหม่เพื่อยืนยัน' showCloseButton={false} />
    </EditShell>
  );
};

const EditEmail = ({ user, onBack, onSave }) => {
  const [email, setEmail] = useState(user.email || '');
  const dirty = email.trim() !== user.email && email.includes('@');
  return (
    <EditShell title='แก้ไขอีเมล' onBack={onBack} saveDisabled={!dirty} onSave={() => onSave({ email: email.trim() })}>
      <Field label='อีเมล' required helper='ใช้สำหรับรับใบเสร็จและการแจ้งเตือน'>
        <PillInput type='email' value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
      </Field>
      <Alert type='info' title='Information' subtext='เมื่อเปลี่ยนอีเมล ระบบจะส่งรหัส OTP ไปยังอีเมลใหม่เพื่อยืนยัน' showCloseButton={false} />
    </EditShell>
  );
};

const RELATIONS = ['ภรรยา', 'สามี', 'บิดา', 'มารดา', 'บุตร', 'พี่น้อง', 'อื่นๆ'];

const EditEmergency = ({ user, onBack, onSave }) => {
  const initial = user.emergencyContacts?.[0] || { firstName: '', lastName: '', relation: 'ภรรยา', phone: '' };
  const [c, setC] = useState(initial);
  const valid = c.firstName.trim() && c.lastName.trim() && c.phone.replace(/\D/g, '').length >= 9;
  const dirty = JSON.stringify(c) !== JSON.stringify(initial);
  return (
    <EditShell
      title='แก้ไขผู้ติดต่อฉุกเฉิน'
      onBack={onBack}
      saveDisabled={!valid || !dirty}
      onSave={() => onSave({ emergencyContacts: [c] })}
    >
      <p style={{ margin: 0, fontFamily: 'var(--type-family-heading-graphic2)', fontSize: 'var(--type-size-base)', color: 'var(--text-brandPrimary-default)' }}>
        คนที่ 1
      </p>
      <Field label='ชื่อ' required>
        <PillInput value={c.firstName} onChange={(e) => setC({ ...c, firstName: e.target.value })} />
      </Field>
      <Field label='นามสกุล' required>
        <PillInput value={c.lastName} onChange={(e) => setC({ ...c, lastName: e.target.value })} />
      </Field>
      <Field label='ความสัมพันธ์' required>
        <div style={{ position: 'relative' }}>
          <select
            className='mih-profile-input'
            value={c.relation}
            onChange={(e) => setC({ ...c, relation: e.target.value })}
            style={{
              width: '100%', height: 56,
              padding: '0 var(--dim-space-600, 24px)',
              borderRadius: 'var(--dim-radius-full)',
              border: 'var(--dim-stroke-100) solid var(--border-input-default)',
              background: 'var(--surface-input-default)',
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-base)',
              appearance: 'none',
            }}
          >
            {RELATIONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <Sym name='expand_more' size={18} style={{ position: 'absolute', right: 20, top: 19, pointerEvents: 'none' }} />
        </div>
      </Field>
      <Field label='เบอร์โทรศัพท์' required>
        <PillInput type='tel' value={c.phone} onChange={(e) => setC({ ...c, phone: e.target.value })} />
      </Field>
      <Alert type='info' title='ใช้ติดต่อในกรณีฉุกเฉินเท่านั้น' showSubtext={false} showCloseButton={false} />
      <BrandSubdueButton variant='outline' size='lg' leadingIcon='add' onClick={() => window.alert('เพิ่มผู้ติดต่อฉุกเฉิน (สาธิต)')}>
        เพิ่มผู้ติดต่อฉุกเฉิน
      </BrandSubdueButton>
    </EditShell>
  );
};

const EditAddress = ({ user, onBack, onSave, mode }) => {
  const key = mode === 'shipping' ? 'shippingAddress' : 'address';
  const [value, setValue] = useState(user[key] || user.address || '');
  const [same, setSame] = useState(user.shippingSameAsContact !== false);
  const dirty = mode === 'shipping'
    ? (value !== (user.shippingAddress || user.address) || same !== user.shippingSameAsContact)
    : value !== user.address;
  return (
    <EditShell
      title={mode === 'shipping' ? 'แก้ไขที่อยู่สำหรับรับยา' : 'แก้ไขที่อยู่ที่ติดต่อได้'}
      onBack={onBack}
      saveDisabled={!dirty || !value.trim()}
      onSave={() => {
        if (mode === 'shipping') {
          onSave({
            shippingAddress: same ? user.address : value.trim(),
            shippingSameAsContact: same,
          });
        } else {
          onSave({
            address: value.trim(),
            ...(user.shippingSameAsContact ? { shippingAddress: value.trim() } : {}),
          });
        }
      }}
    >
      {mode === 'shipping' && (
        <label className='flex items-center' style={{ gap: 8, fontSize: 'var(--type-size-sm)' }}>
          <input type='checkbox' checked={same} onChange={(e) => setSame(e.target.checked)} />
          ใช้ที่อยู่เดียวกับที่อยู่ที่ติดต่อได้
        </label>
      )}
      <Field label='ที่อยู่' required>
        <textarea
          className='mih-profile-textarea'
          value={mode === 'shipping' && same ? user.address : value}
          disabled={mode === 'shipping' && same}
          onChange={(e) => setValue(e.target.value)}
          rows={4}
          style={{
            width: '100%',
            padding: 'var(--dim-space-300, 12px) var(--dim-space-400, 16px)',
            borderRadius: 'var(--dim-radius-400, 12px)',
            border: 'var(--dim-stroke-100) solid var(--border-input-default)',
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-base)',
            resize: 'none',
            opacity: mode === 'shipping' && same ? 0.7 : 1,
          }}
        />
      </Field>
    </EditShell>
  );
};

/* ─── Page ──────────────────────────────────────────────────────────── */

const MobileProfileInner = ({ onViewChange }) => {
  const [user, setUser] = useState(loadProfile);
  const [view, setView] = useState('home'); /* home | unlock | otp | edit views | success */
  const [pendingView, setPendingView] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [toast, setToast] = useState('');

  useEffect(() => {
    onViewChange?.(view);
  }, [view, onViewChange]);

  useEffect(() => {
    if (!toast) return undefined;
    const t = window.setTimeout(() => setToast(''), 1800);
    return () => clearTimeout(t);
  }, [toast]);

  const persist = (patch) => {
    const next = { ...user, ...patch };
    setUser(next);
    saveProfile(next);
    setSuccessMsg('บันทึกสำเร็จ');
    setView('success');
  };

  const finishVerification = () => {
    setView(pendingView || 'home');
    setPendingView('');
  };

  if (view === 'success') {
    return <SuccessToast message={successMsg} onDone={() => setView('home')} />;
  }
  if (view === 'unlock') {
    return (
      <UnlockPinView
        onSuccess={finishVerification}
        onForgot={() => setView('otp')}
        onClose={() => {
          setPendingView('');
          setView('home');
        }}
        onUseBiometric={finishVerification}
      />
    );
  }
  if (view === 'otp') {
    return (
      <ProfileOtpVerification
        user={user}
        onBack={() => {
          setPendingView('');
          setView('home');
        }}
        onVerified={finishVerification}
      />
    );
  }
  if (view === 'phone') return <EditPhone user={user} onBack={() => setView('home')} onSave={persist} />;
  if (view === 'email') return <EditEmail user={user} onBack={() => setView('home')} onSave={persist} />;
  if (view === 'emergency') return <EditEmergency user={user} onBack={() => setView('home')} onSave={persist} />;
  if (view === 'address') return <EditAddress user={user} mode='contact' onBack={() => setView('home')} onSave={persist} />;
  if (view === 'shipping') return <EditAddress user={user} mode='shipping' onBack={() => setView('home')} onSave={persist} />;

  return (
    <>
      <ProfileHome
        user={user}
        onEdit={(key) => {
          if (key === 'photo') {
            setToast('แก้ไขรูปโปรไฟล์ (สาธิต)');
            return;
          }
          setPendingView(key);
          try {
            const hasPin = Boolean(localStorage.getItem('phcis_mobile_pin_v1'));
            const hasBiometric = localStorage.getItem('phcis_mobile_biometric_enabled_v1') === '1';
            setView(hasPin || hasBiometric ? 'unlock' : 'otp');
          } catch (_e) {
            setView('otp');
          }
        }}
        onCopyHn={(hn) => {
          try {
            navigator.clipboard?.writeText(hn);
          } catch (_e) { /* ignore */ }
          setToast(`คัดลอก HN ${hn} แล้ว`);
        }}
      />
      {toast && (
        <div style={{
          position: 'fixed', left: '50%', bottom: 100, transform: 'translateX(-50%)',
          background: 'rgba(15,27,23,0.9)', color: '#fff',
          padding: '8px 16px', borderRadius: 999, fontSize: 12, zIndex: 50,
        }}
        >
          {toast}
        </div>
      )}
    </>
  );
};

if (typeof document !== 'undefined' && !document.getElementById('mih-profile-input-css')) {
  const style = document.createElement('style');
  style.id = 'mih-profile-input-css';
  style.textContent = `
.mih-profile-input,
.mih-profile-input:focus,
.mih-profile-input:focus-visible,
.mih-profile-textarea,
.mih-profile-textarea:focus,
.mih-profile-textarea:focus-visible {
  outline: none !important;
  box-shadow: none !important;
  -webkit-appearance: none !important;
  appearance: none !important;
}
.mih-profile-input:focus,
.mih-profile-input:focus-visible {
  border-color: var(--border-brandPrimary-default, #08A768) !important;
  box-shadow: 0 0 0 4px rgba(8, 167, 104, 0.15) !important;
}
.mih-profile-input::placeholder,
.mih-profile-textarea::placeholder {
  color: var(--text-content-tertiary, #858C92);
  opacity: 1;
}`;
  document.head.appendChild(style);
}

const MobileProfilePage = () => {
  const [shellView, setShellView] = useState('home');
  const showNav = shellView === 'home';
  return (
    <MobileShell
      requireAuth
      showBottomNav={showNav}
      background={shellView === 'home'
        ? 'linear-gradient(72deg, #13B292 58%, #00A08E 83%)'
        : 'var(--background-screen-brand-100, #F4FBF8)'}
    >
      <MobileProfileInner onViewChange={setShellView} />
    </MobileShell>
  );
};

export default MobileProfilePage;
