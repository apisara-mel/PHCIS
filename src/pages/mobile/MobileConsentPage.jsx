import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';
import {
  MobileShell,
  MobileHeader,
  Sym,
  BrandButton,
  BrandSubdueButton,
} from '@/components/mobile';
import MobileIconBadge from '@/components/mobile/MobileIconBadge';
import Alert from '@/components/alert/Alert';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import RadioButton from '@/components/radio/RadioButton';
import ConsentFormFillBody from '@/components/consent/ConsentFormFillBody';
import { UnlockPinView } from '@/pages/mobile/MobileLoginPage';
import { ProfileOtpVerification } from '@/pages/mobile/MobileProfilePage';
import { CURRENT_USER } from '@/data/mobileMock';
import {
  REGISTRATION_PENDING_CONSENT_CARDS,
  getRegistrationConsentForm,
  resolveRegistrationConsentFormId,
} from '@/data/registrationConsentForms';
import {
  getConsentRecords,
  subscribeConsentStore,
  requestConsentWithdrawal,
  cancelConsentWithdrawalRequest,
  recordMrConsentSigning,
  completeConsentSigning,
  consentTypeFromMrForm,
  MOBILE_DEMO_HN,
} from '@/data/consentWorkflowStore';
import { CONSENT_TYPE_TONE } from '@/data/consentRecords';
import { MOBILE_APP_CHANNEL } from '@/data/consentChannels';

/* BMA Health · ความยินยอม (PDPA) — TOR 1.5.11 / ด.1.1.5 + Flow F ใน
   consent-management-ui-flow-prompt (Obsidian vault)

   หน้าเดียวรวม 3 งานของผู้รับบริการ:
   1. สแกน QR จากหน้าจอเจ้าหน้าที่เพื่อเปิดใบยินยอม (Flow E ฝั่งผู้ป่วย)
   2. ให้ความยินยอมจากแบบฟอร์มในเครื่อง — เอกสารฉบับเดียวกับระบบจัดการ
      ความยินยอม (ConsentFormFillBody: PD-1011 / TX-1011 / CL-1011)
   3. ดูความยินยอมของตนเอง + ขอถอนความยินยอม → record เข้าสถานะ
      «ขอเพิกถอน» รอเจ้าหน้าที่ดำเนินการใน worklist (/consent)

   ก่อนลงนามหรือส่งคำขอถอน ต้องยืนยันตัวตนเสมอ — PIN/biometric ถ้าตั้งไว้
   ไม่งั้น OTP (กติกาเดียวกับการแก้ข้อมูลอ่อนไหวใน MobileProfilePage) */

/* สถานะ record → ป้ายภาษาผู้รับบริการ (desktop ใช้ศัพท์เจ้าหน้าที่) */
const MOBILE_CONSENT_STATUS = {
  'ยินยอมแล้ว':        { label: 'ยินยอมแล้ว', tone: 'green', canWithdraw: true },
  'ใกล้หมดอายุ':       { label: 'ใกล้หมดอายุ', tone: 'yellow', canWithdraw: true },
  'ขอเพิกถอน':         { label: 'อยู่ระหว่างขอถอน', tone: 'orange', pendingWithdraw: true },
  'รอลงนาม':           { label: 'รอลงนาม', tone: 'orange', signable: true },
  'อยู่ระหว่างลงนาม':   { label: 'รอลงนาม', tone: 'orange', signable: true },
  'ถอนความยินยอม':     { label: 'ถอนความยินยอมแล้ว', tone: 'red' },
  'ปฏิเสธ':            { label: 'ไม่ยินยอม', tone: 'grey' },
  'หมดอายุ':           { label: 'หมดอายุ', tone: 'red' },
  'หมดอายุ-Reconsent': { label: 'หมดอายุ', tone: 'red' },
  'ถูกแทนที่ด้วยเวอร์ชันใหม่': { label: 'มีเวอร์ชันใหม่', tone: 'blue' },
  'มีเวอร์ชันใหม่':     { label: 'มีเวอร์ชันใหม่', tone: 'blue' },
  'ยกเลิกคำขอ':        { label: 'ยกเลิกคำขอ', tone: 'grey' },
};

const WITHDRAW_REASONS = [
  'ไม่ประสงค์ให้ใช้ข้อมูลอีกต่อไป',
  'กังวลเรื่องความเป็นส่วนตัวของข้อมูล',
  'ข้อมูลไม่ถูกต้อง / ต้องการแก้ไข',
  'อื่น ๆ',
];

const loadMobileProfile = () => {
  try {
    const raw = localStorage.getItem('phcis_mobile_profile_v1');
    if (raw) return { ...CURRENT_USER, ...JSON.parse(raw) };
  } catch (_e) { /* ignore */ }
  return { ...CURRENT_USER };
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

const SectionTitle = ({ icon, children }) => (
  <div className='flex items-center' style={{ gap: 'var(--dim-space-200, 8px)', marginBottom: 'var(--dim-space-300, 12px)' }}>
    {icon && <Sym name={icon} size={18} color='var(--text-brandPrimary-default, #007549)' />}
    <p style={{
      margin: 0,
      fontFamily: 'var(--type-family-heading-graphic2)',
      fontSize: 'var(--type-size-base, 16px)',
      color: 'var(--text-brandPrimary-default, #007549)',
    }}
    >
      {children}
    </p>
  </div>
);

const MetaText = ({ children }) => (
  <p style={{ margin: 0, fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>{children}</p>
);

/* ─── สแกน QR (mock กล้อง) ──────────────────────────────────────────── */

const QrScannerView = ({ onBack, onFound, resolveScan }) => {
  const [found, setFound] = useState(null);

  useEffect(() => {
    if (found) return undefined;
    const t = window.setTimeout(() => setFound(resolveScan()), 1800);
    return () => clearTimeout(t);
  }, [found, resolveScan]);

  return (
    <div className='flex flex-col' style={{ minHeight: '100%', background: '#10201B' }}>
      {/* header ขาวบนพื้นกล้องมืด — MobileHeader บังคับสีไอคอนเทาเข้ม อ่านไม่ออกบนพื้นนี้ */}
      <div className='flex items-center' style={{ height: 'var(--mobile-header-height, 56px)', padding: '0 var(--dim-space-300, 12px)', gap: 'var(--dim-space-200, 8px)' }}>
        <button
          type='button'
          onClick={onBack}
          aria-label='ย้อนกลับ'
          className='inline-flex items-center justify-center'
          style={{
            width: 'var(--dim-size-800, 40px)',
            height: 'var(--dim-size-800, 40px)',
            borderRadius: 'var(--dim-radius-full)',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-neutral-on-neutral, #FFFFFF)',
          }}
        >
          <Sym name='arrow_back' size={24} />
        </button>
        <p className='flex-1' style={{
          margin: 0,
          textAlign: 'center',
          fontFamily: 'var(--type-family-heading-graphic2)',
          fontSize: 'var(--type-size-base, 16px)',
          color: 'var(--text-neutral-on-neutral, #FFFFFF)',
        }}
        >
          สแกน QR Code
        </p>
        <span style={{ width: 'var(--dim-size-800, 40px)' }} aria-hidden />
      </div>
      <div className='flex-1 flex flex-col items-center justify-center' style={{ gap: 'var(--dim-space-600, 24px)', padding: 'var(--dim-space-600, 24px)' }}>
        <div
          style={{
            position: 'relative',
            width: 'var(--dim-size-3600, 240px)',
            height: 'var(--dim-size-3600, 240px)',
            borderRadius: 'var(--dim-radius-500, 16px)',
            /* viewfinder mock — ไล่เฉดแทนภาพกล้องจริง (gradient exception) */
            background: 'linear-gradient(160deg, #1E3A32 0%, #0D1B17 100%)',
            overflow: 'hidden',
          }}
        >
          {[
            { top: 0, left: 0, borderWidth: '3px 0 0 3px' },
            { top: 0, right: 0, borderWidth: '3px 3px 0 0' },
            { bottom: 0, left: 0, borderWidth: '0 0 3px 3px' },
            { bottom: 0, right: 0, borderWidth: '0 3px 3px 0' },
          ].map((corner, i) => (
            <span
              key={i}
              aria-hidden
              style={{
                position: 'absolute',
                width: 'var(--dim-size-500, 32px)',
                height: 'var(--dim-size-500, 32px)',
                borderStyle: 'solid',
                borderColor: 'var(--border-brandPrimary-default, #08A768)',
                borderRadius: 'var(--dim-radius-100, 4px)',
                ...corner,
              }}
            />
          ))}
          {!found && (
            <span aria-hidden className='mih-mconsent-scanline' style={{
              position: 'absolute', left: 12, right: 12, height: 2,
              background: 'var(--surface-brandPrimary-default, #08A768)',
              boxShadow: 'var(--shadow-brand-drop-bottom-200)',
            }}
            />
          )}
          {found && (
            <span className='inline-flex items-center justify-center' style={{ position: 'absolute', inset: 0 }}>
              <span className='inline-flex items-center justify-center' style={{
                width: 'var(--dim-size-1000, 64px)',
                height: 'var(--dim-size-1000, 64px)',
                borderRadius: 'var(--dim-radius-full)',
                background: 'var(--surface-brandPrimary-quaternary, #E2F3EB)',
                color: 'var(--text-brandPrimary-default, #007549)',
              }}
              >
                <Sym name='check_circle' size={40} fill />
              </span>
            </span>
          )}
        </div>

        <div className='flex flex-col items-center' style={{ gap: 'var(--dim-space-200, 8px)', textAlign: 'center' }}>
          <p style={{
            margin: 0,
            fontFamily: 'var(--type-family-heading-graphic2)',
            fontSize: 'var(--type-size-lg, 18px)',
            color: 'var(--text-neutral-on-neutral, #FFFFFF)',
          }}
          >
            {found ? 'พบแบบฟอร์มความยินยอม' : 'กำลังค้นหา QR Code…'}
          </p>
          <p style={{
            margin: 0,
            fontSize: 'var(--type-size-sm)',
            color: 'rgba(255,255,255,0.72)',
            lineHeight: 1.5,
          }}
          >
            {found
              ? found.title
              : 'เล็งกล้องไปที่ QR Code บนหน้าจอเจ้าหน้าที่ เพื่อเปิดใบยินยอมของคุณ'}
          </p>
        </div>

        {found && (
          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300, 12px)', maxWidth: 320 }}>
            <BrandButton size='lg' trailingIcon='chevron_right' onClick={() => onFound(found)}>
              ยืนยันตัวตนเพื่อกรอกใบยินยอม
            </BrandButton>
            <BrandSubdueButton variant='outline' size='lg' leadingIcon='qr_code_scanner' onClick={() => setFound(null)}>
              สแกนใหม่
            </BrandSubdueButton>
          </div>
        )}
      </div>
    </div>
  );
};

/* ─── ยืนยันการขอถอนความยินยอม ──────────────────────────────────────── */

const WithdrawConfirmView = ({ record, onBack, onConfirm }) => {
  const [reason, setReason] = useState('');
  const [otherText, setOtherText] = useState('');
  const finalReason = reason === 'อื่น ๆ' ? `อื่น ๆ: ${otherText.trim()}` : reason;

  return (
    <div className='flex flex-col' style={{ minHeight: '100%', background: 'var(--background-screen-brand-100, #F4FBF8)' }}>
      <MobileHeader title='ขอถอนความยินยอม' onBack={onBack} />
      <div className='flex-1 flex flex-col' style={{ gap: 'var(--dim-space-400, 16px)', padding: 'var(--dim-space-400, 16px)' }}>
        <Card>
          <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)', marginBottom: 'var(--dim-space-200, 8px)' }}>
            <ColorfulBadge style={CONSENT_TYPE_TONE[record.type] || 'teal'} size='small' hierarchy='secondary' width='hug'>
              {record.type}
            </ColorfulBadge>
            <ColorfulBadge style='green' size='small' hierarchy='secondary' width='hug'>
              {(MOBILE_CONSENT_STATUS[record.status] || {}).label || record.status}
            </ColorfulBadge>
          </div>
          <p style={{
            margin: 0,
            fontFamily: 'var(--type-family-heading-graphic2)',
            fontSize: 'var(--type-size-base)',
            color: 'var(--text-content-default)',
          }}
          >
            {record.formName}
          </p>
          <MetaText>{record.formCode} · {record.version} · ลงนามเมื่อ {record.signedDate}</MetaText>
        </Card>

        <Alert
          type='warning'
          title='ผลของการถอนความยินยอม'
          subtext='เมื่อเจ้าหน้าที่ดำเนินการถอนแล้ว หน่วยบริการจะหยุดเก็บ ใช้ และเปิดเผยข้อมูลตามขอบเขตของแบบฟอร์มนี้ ซึ่งอาจส่งผลต่อความต่อเนื่องของบริการบางรายการ'
          showCloseButton={false}
        />

        <Card>
          <SectionTitle>เหตุผล (ไม่บังคับ)</SectionTitle>
          <div className='flex flex-col' style={{ gap: 'var(--dim-space-200, 8px)' }}>
            {WITHDRAW_REASONS.map((r) => (
              <RadioButton
                key={r}
                name='withdraw-reason'
                value={r}
                title={r}
                checked={reason === r}
                onChange={() => setReason(r)}
                border
                showCircleIcon={false}
                showIcon={false}
                showDescription={false}
                showBadge={false}
                showBadgeTitle={false}
              />
            ))}
            {reason === 'อื่น ๆ' && (
              <textarea
                className='mih-mconsent-textarea'
                value={otherText}
                onChange={(e) => setOtherText(e.target.value)}
                rows={3}
                placeholder='โปรดระบุเหตุผล'
                style={{
                  width: '100%',
                  padding: 'var(--dim-space-300, 12px) var(--dim-space-400, 16px)',
                  borderRadius: 'var(--dim-radius-400, 12px)',
                  border: 'var(--dim-stroke-100) solid var(--border-input-default, #E2E4E6)',
                  fontFamily: 'var(--type-family-body)',
                  fontSize: 'var(--type-size-base)',
                  resize: 'none',
                }}
              />
            )}
          </div>
        </Card>
      </div>
      <div style={{
        padding: 'var(--dim-space-400, 16px)',
        background: 'var(--surface-card-100)',
        borderTop: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
        boxShadow: 'var(--shadow-brand-drop-top-100)',
      }}
      >
        <BrandButton size='lg' trailingIcon='chevron_right' onClick={() => onConfirm(finalReason)}>
          ยืนยันตัวตนเพื่อส่งคำขอถอน
        </BrandButton>
      </div>
    </div>
  );
};

/* ─── กรอกใบยินยอม (เอกสารฉบับเดียวกับ desktop) ─────────────────────── */

const ConsentFillView = ({ formId, user, primaryHn, onBack, onSubmit }) => {
  const fillApiRef = useRef({ ready: false, submit: null });
  const [ready, setReady] = useState(false);
  const meta = getRegistrationConsentForm(formId);

  return (
    <div className='flex flex-col' style={{ minHeight: '100%', background: 'var(--background-screen-brand-100, #F4FBF8)' }}>
      <MobileHeader title={meta.title} onBack={onBack} />
      <div className='flex-1' style={{ padding: 'var(--dim-space-400, 16px)' }}>
        <ConsentFormFillBody
          formId={formId}
          showSidePanel={false}
          initialFullName={`${user.prefix || ''}${user.firstName} ${user.lastName}`}
          initialNationalId={user.citizenId}
          initialHn={primaryHn}
          onStateChange={({ ready: r, submit }) => {
            fillApiRef.current = { ready: r, submit };
            setReady(r);
          }}
          onSubmit={onSubmit}
        />
      </div>
      <div style={{
        padding: 'var(--dim-space-400, 16px)',
        background: 'var(--surface-card-100)',
        borderTop: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
        boxShadow: 'var(--shadow-brand-drop-top-100)',
      }}
      >
        <BrandButton size='lg' disabled={!ready} onClick={() => fillApiRef.current.submit?.()}>
          ยืนยันการยินยอม
        </BrandButton>
      </div>
    </div>
  );
};

/* ─── หน้าเสร็จสิ้น ─────────────────────────────────────────────────── */

const SuccessView = ({ message, onDone }) => {
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
          width: '100%',
          maxWidth: 340,
          background: 'var(--surface-card-100)',
          borderRadius: 'var(--dim-radius-600, 24px)',
          padding: 'var(--dim-space-800, 32px) var(--dim-space-600, 24px)',
          gap: 'var(--dim-space-400, 16px)',
          boxShadow: 'var(--shadow-brand-drop-bottom-200)',
        }}
      >
        <span className='inline-flex items-center justify-center' style={{
          width: 'var(--dim-size-1100, 72px)',
          height: 'var(--dim-size-1100, 72px)',
          borderRadius: 'var(--dim-radius-full)',
          background: 'var(--surface-brandPrimary-quaternary)',
          color: 'var(--text-brandPrimary-default)',
        }}
        >
          <Sym name='check_circle' size={40} fill />
        </span>
        <p style={{
          margin: 0,
          textAlign: 'center',
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

/* ─── Hub ───────────────────────────────────────────────────────────── */

const ConsentHub = ({ user, myRecords, formCards, onBack, onScan, onFillForm, onWithdraw, onCancelWithdraw, onSignPending }) => (
  <div className='flex flex-col' style={{ minHeight: '100%', background: 'var(--background-screen-brand-100, #F4FBF8)' }}>
    <MobileHeader title='ความยินยอม (PDPA)' onBack={onBack} />
    <div className='flex-1 flex flex-col' style={{ gap: 'var(--dim-space-400, 16px)', padding: 'var(--dim-space-400, 16px)' }}>

      {/* สแกน QR */}
      <Card>
        <div className='flex items-center' style={{ gap: 'var(--dim-space-300, 12px)' }}>
          <MobileIconBadge icon='qr_code_scanner' tone='green' size={40} iconSize={20} />
          <div className='flex-1 min-w-0'>
            <p style={{
              margin: 0,
              fontFamily: 'var(--type-family-heading-graphic2)',
              fontSize: 'var(--type-size-base)',
              color: 'var(--text-content-default)',
            }}
            >
              สแกน QR เพื่อให้ความยินยอม
            </p>
            <MetaText>สแกนจากหน้าจอเจ้าหน้าที่ เพื่อเปิดใบยินยอมของคุณ</MetaText>
          </div>
        </div>
        <BrandButton
          size='md'
          leadingIcon='qr_code_scanner'
          onClick={onScan}
          style={{ width: '100%', marginTop: 'var(--dim-space-300, 12px)' }}
        >
          สแกน QR Code
        </BrandButton>
      </Card>

      {/* แบบฟอร์มความยินยอม */}
      <Card>
        <SectionTitle icon='description'>แบบฟอร์มความยินยอม</SectionTitle>
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-300, 12px)' }}>
          {formCards.map((f) => (
            <div
              key={f.id}
              className='flex flex-col'
              style={{
                gap: 'var(--dim-space-200, 8px)',
                padding: 'var(--dim-space-300, 12px)',
                borderRadius: 'var(--dim-radius-400, 12px)',
                border: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary, #F4F5F5)',
              }}
            >
              <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                <ColorfulBadge style={f.categoryStyle || 'blue'} size='small' hierarchy='secondary' width='hug'>
                  {f.categoryLabel}
                </ColorfulBadge>
                {f.statusMeta && (
                  <ColorfulBadge style={f.statusMeta.tone} size='small' hierarchy='secondary' width='hug'>
                    {f.statusMeta.label}
                  </ColorfulBadge>
                )}
              </div>
              <p style={{
                margin: 0,
                fontFamily: 'var(--type-family-heading-graphic2)',
                fontSize: 'var(--type-size-sm)',
                color: 'var(--text-content-default)',
                lineHeight: 1.4,
              }}
              >
                {f.title}
              </p>
              <MetaText>{f.code} · V {f.version}</MetaText>
              {f.canFill && (
                <BrandSubdueButton
                  variant='outline'
                  size='md'
                  trailingIcon='chevron_right'
                  onClick={() => onFillForm(f.id)}
                >
                  {f.refill ? 'ให้ความยินยอมใหม่' : 'ให้ความยินยอม'}
                </BrandSubdueButton>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* ความยินยอมของฉัน */}
      <Card>
        <SectionTitle icon='verified_user'>ความยินยอมของฉัน</SectionTitle>
        {myRecords.length === 0 && (
          <MetaText>ยังไม่มีรายการความยินยอม — เริ่มจากแบบฟอร์มด้านบน หรือสแกน QR จากเจ้าหน้าที่</MetaText>
        )}
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-300, 12px)' }}>
          {myRecords.map((r) => {
            const meta = MOBILE_CONSENT_STATUS[r.status] || { label: r.status, tone: 'grey' };
            return (
              <div
                key={r.id}
                className='flex flex-col'
                style={{
                  gap: 'var(--dim-space-200, 8px)',
                  padding: 'var(--dim-space-300, 12px)',
                  borderRadius: 'var(--dim-radius-400, 12px)',
                  border: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary, #F4F5F5)',
                }}
              >
                <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                  <ColorfulBadge style={CONSENT_TYPE_TONE[r.type] || 'teal'} size='small' hierarchy='secondary' width='hug'>
                    {r.type}
                  </ColorfulBadge>
                  <ColorfulBadge style={meta.tone} size='small' hierarchy='secondary' width='hug'>
                    {meta.label}
                  </ColorfulBadge>
                </div>
                <p style={{
                  margin: 0,
                  fontFamily: 'var(--type-family-heading-graphic2)',
                  fontSize: 'var(--type-size-sm)',
                  color: 'var(--text-content-default)',
                  lineHeight: 1.4,
                }}
                >
                  {r.formName}
                </p>
                <MetaText>
                  {r.formCode} · {r.version}
                  {r.signedDate && r.signedDate !== '-' ? ` · ลงนาม ${r.signedDate}` : ''}
                </MetaText>

                {meta.pendingWithdraw && (
                  <>
                    <Alert
                      type='info'
                      title={r.withdrawRequestDate && r.withdrawRequestDate !== '-'
                        ? `ส่งคำขอเมื่อ ${r.withdrawRequestDate} · รอเจ้าหน้าที่ดำเนินการ`
                        : 'ส่งคำขอถอนแล้ว · รอเจ้าหน้าที่ดำเนินการ'}
                      showSubtext={false}
                      showCloseButton={false}
                    />
                    <BrandSubdueButton variant='outline' size='md' onClick={() => onCancelWithdraw(r)}>
                      ยกเลิกคำขอถอน
                    </BrandSubdueButton>
                  </>
                )}
                {meta.canWithdraw && (
                  <BrandSubdueButton variant='outline' size='md' onClick={() => onWithdraw(r)}>
                    ขอถอนความยินยอม
                  </BrandSubdueButton>
                )}
                {meta.signable && (
                  <BrandButton size='md' trailingIcon='chevron_right' onClick={() => onSignPending(r)}>
                    ลงนามใบยินยอม
                  </BrandButton>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      <MetaText>
        ผู้ใช้: {user.prefix || ''}{user.firstName} {user.lastName} · การถอนความยินยอมมีผลเมื่อเจ้าหน้าที่ดำเนินการแล้ว
        โดยไม่กระทบการเก็บ ใช้ ข้อมูลที่ได้ดำเนินการไปก่อนหน้า
      </MetaText>
    </div>
  </div>
);

/* ─── Page ──────────────────────────────────────────────────────────── */

const MobileConsentInner = () => {
  const history = useHistory();
  const [user] = useState(loadMobileProfile);
  const primaryHn = user.centers?.[0]?.hn || MOBILE_DEMO_HN;
  /* HN ของผู้ใช้ทุกศูนย์ + HN demo ที่มีแถว mock ใน consent store */
  const myHns = useMemo(
    () => [...new Set([...(user.centers || []).map((c) => c.hn), MOBILE_DEMO_HN])],
    [user.centers],
  );

  const readMyRecords = () => getConsentRecords()
    .filter((r) => myHns.includes(r.hn))
    .sort((a, b) => b.id - a.id);

  const [records, setRecords] = useState(readMyRecords);
  useEffect(() => subscribeConsentStore(() => setRecords(readMyRecords())), [myHns]); // eslint-disable-line react-hooks/exhaustive-deps

  /* view: hub | scan | withdraw | fill | verify-pin | verify-otp | success */
  const [view, setView] = useState('hub');
  const [withdrawTarget, setWithdrawTarget] = useState(null);
  const [fill, setFill] = useState(null); /* { formId, recordId } */
  const [pendingAction, setPendingAction] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (!toast) return undefined;
    const t = window.setTimeout(() => setToast(''), 1800);
    return () => clearTimeout(t);
  }, [toast]);

  /* สถานะล่าสุดต่อแบบฟอร์ม — ขับป้าย + CTA ของการ์ดแบบฟอร์ม */
  const formCards = useMemo(() => REGISTRATION_PENDING_CONSENT_CARDS.map((f) => {
    const type = consentTypeFromMrForm({ id: f.id });
    const latest = records.find((r) => r.type === type) || null;
    const statusMeta = latest ? (MOBILE_CONSENT_STATUS[latest.status] || { label: latest.status, tone: 'grey' }) : null;
    const active = latest && (statusMeta.canWithdraw || statusMeta.pendingWithdraw || statusMeta.signable);
    return {
      ...f,
      statusMeta,
      canFill: !active,
      refill: Boolean(latest && !active),
    };
  }), [records]);

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setView('success');
  };

  const startVerify = (action) => {
    setPendingAction(action);
    try {
      const hasPin = Boolean(localStorage.getItem('phcis_mobile_pin_v1'));
      const hasBiometric = localStorage.getItem('phcis_mobile_biometric_enabled_v1') === '1';
      setView(hasPin || hasBiometric ? 'verify-pin' : 'verify-otp');
    } catch (_e) {
      setView('verify-otp');
    }
  };

  const cancelVerify = () => {
    const a = pendingAction;
    setPendingAction(null);
    setView(a?.kind === 'withdraw' ? 'withdraw' : 'hub');
  };

  const finishVerify = () => {
    const a = pendingAction;
    setPendingAction(null);
    if (!a) {
      setView('hub');
      return;
    }
    if (a.kind === 'withdraw') {
      requestConsentWithdrawal(a.id, { reason: a.reason });
      setWithdrawTarget(null);
      showSuccess('ส่งคำขอถอนความยินยอมแล้ว');
      return;
    }
    if (a.kind === 'fill') {
      setFill({ formId: a.formId, recordId: a.recordId || null });
      setView('fill');
    }
  };

  /* QR mock — ถ้ามีใบรอลงนามของผู้ใช้ ให้สแกนเจอใบนั้น ไม่งั้นเปิด PDPA */
  const resolveScan = () => {
    const pending = records.find((r) => ['รอลงนาม', 'อยู่ระหว่างลงนาม'].includes(r.status));
    const formId = pending
      ? resolveRegistrationConsentFormId({ formCode: pending.formCode, type: pending.type })
      : 'PD-1011';
    const meta = getRegistrationConsentForm(formId);
    return { formId, recordId: pending?.id || null, title: meta.title };
  };

  const handleFillSubmit = (payload) => {
    if (fill?.recordId) {
      completeConsentSigning(fill.recordId, { outcome: payload.outcome, channel: MOBILE_APP_CHANNEL });
    } else {
      recordMrConsentSigning({
        hn: primaryHn,
        name: payload.fullName,
        formId: payload.formId,
        formCode: payload.formId,
        formTitle: payload.meta.title,
        version: payload.meta.version,
        channel: MOBILE_APP_CHANNEL,
        outcome: payload.outcome,
        requester: 'ผู้รับบริการ (Mobile App)',
      });
    }
    setFill(null);
    showSuccess(payload.outcome === 'declined' ? 'บันทึกการไม่ยินยอมแล้ว' : 'ให้ความยินยอมสำเร็จ');
  };

  if (view === 'success') {
    return <SuccessView message={successMsg} onDone={() => setView('hub')} />;
  }
  if (view === 'verify-pin') {
    return (
      <UnlockPinView
        onSuccess={finishVerify}
        onForgot={() => setView('verify-otp')}
        onClose={cancelVerify}
        onUseBiometric={finishVerify}
      />
    );
  }
  if (view === 'verify-otp') {
    return <ProfileOtpVerification user={user} onBack={cancelVerify} onVerified={finishVerify} />;
  }
  if (view === 'scan') {
    return (
      <QrScannerView
        onBack={() => setView('hub')}
        resolveScan={resolveScan}
        onFound={({ formId, recordId }) => startVerify({ kind: 'fill', formId, recordId })}
      />
    );
  }
  if (view === 'withdraw' && withdrawTarget) {
    return (
      <WithdrawConfirmView
        record={withdrawTarget}
        onBack={() => {
          setWithdrawTarget(null);
          setView('hub');
        }}
        onConfirm={(reason) => startVerify({ kind: 'withdraw', id: withdrawTarget.id, reason })}
      />
    );
  }
  if (view === 'fill' && fill) {
    return (
      <ConsentFillView
        formId={fill.formId}
        user={user}
        primaryHn={primaryHn}
        onBack={() => {
          setFill(null);
          setView('hub');
        }}
        onSubmit={handleFillSubmit}
      />
    );
  }

  return (
    <>
      <ConsentHub
        user={user}
        myRecords={records}
        formCards={formCards}
        onBack={() => history.push('/m/profile')}
        onScan={() => setView('scan')}
        onFillForm={(formId) => startVerify({ kind: 'fill', formId })}
        onWithdraw={(r) => {
          setWithdrawTarget(r);
          setView('withdraw');
        }}
        onCancelWithdraw={(r) => {
          cancelConsentWithdrawalRequest(r.id);
          setToast('ยกเลิกคำขอถอนแล้ว — ความยินยอมเดิมยังมีผล');
        }}
        onSignPending={(r) => {
          const formId = resolveRegistrationConsentFormId({ formCode: r.formCode, type: r.type });
          startVerify({ kind: 'fill', formId, recordId: r.id });
        }}
      />
      {toast && (
        <div style={{
          position: 'fixed',
          left: '50%',
          bottom: 100,
          transform: 'translateX(-50%)',
          background: 'rgba(15,27,23,0.9)',
          color: 'var(--text-neutral-on-neutral, #FFFFFF)',
          padding: 'var(--dim-space-200, 8px) var(--dim-space-400, 16px)',
          borderRadius: 'var(--dim-radius-full)',
          fontSize: 'var(--type-size-xs)',
          zIndex: 50,
          whiteSpace: 'nowrap',
        }}
        >
          {toast}
        </div>
      )}
    </>
  );
};

if (typeof document !== 'undefined' && !document.getElementById('mih-mconsent-css')) {
  const style = document.createElement('style');
  style.id = 'mih-mconsent-css';
  style.textContent = `
@keyframes mih-mconsent-scan {
  0% { top: 12px; }
  50% { top: calc(100% - 14px); }
  100% { top: 12px; }
}
.mih-mconsent-scanline { animation: mih-mconsent-scan 2.4s ease-in-out infinite; }
.mih-mconsent-textarea,
.mih-mconsent-textarea:focus,
.mih-mconsent-textarea:focus-visible {
  outline: none !important;
  box-shadow: none !important;
  -webkit-appearance: none !important;
  appearance: none !important;
}
.mih-mconsent-textarea:focus,
.mih-mconsent-textarea:focus-visible {
  border-color: var(--border-brandPrimary-default, #08A768) !important;
}
.mih-mconsent-textarea::placeholder {
  color: var(--text-content-tertiary, #858C92);
  opacity: 1;
}`;
  document.head.appendChild(style);
}

const MobileConsentPage = () => (
  <MobileShell requireAuth showBottomNav={false} background='var(--background-screen-brand-100, #F4FBF8)'>
    <MobileConsentInner />
  </MobileShell>
);

export default MobileConsentPage;
