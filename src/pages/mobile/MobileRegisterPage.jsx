import React, { useEffect, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';
import {
  MobileShell,
  MobileButton,
  MobileInput,
  MobileField,
  MobileInputField,
  Password,
  MobileBadge,
  useMobileApp,
  Sym,
  BrandButton,
  BrandSubdueButton,
  NeutralButton,
  KeypadButton,
  SmsPush,
  CameraPermissionPopup,
  SuccessCard,
  SUCCESS_CARD_BG,
} from '@/components/mobile';
import LottieIllustration from '@/components/illustrations/LottieIllustration';
import { isMobileBrowser } from '@/utils/cameraDevice';

/* BMA Health · Registration — Figma Mobile Application 6dCDQkwc8DhvyovBbDTyp5 · 2042:27920.
   Artboard notes applied:
   · Validation: เลขบัตรต้องครบ 13 หลัก
   · Error: มีบัญชีที่ใช้งานอยู่แล้ว (duplicate)
   · Edge: เลขบัตรเคยลงทะเบียนค้างไว้ → ทำ Step ต่อจากที่ค้างไว้
   · OTP: ผิด / หมดอายุ / กรอกผิดถึงจำนวนครั้งสูงสุด → cooldown + ช่องทางติดต่อ
   · Case: ถ้าในเครื่องเคย set biometric → แสดง Enable Fingerprint / FaceScan
   · Edge: เน็ตหลุดตอนบันทึก
   · Sticky: หลัง migrate เลข HN เคลมไม่ได้ เพราะเดิม 1 คนมีมากกว่า 1 HN
   Happy path: Welcome → Terms → Policy → Intro → ID/Phone → OTP → ID Card →
   Face → Password → PIN → Biometric(opt) → Success. */

const CORE_STEPS = ['citizenId', 'otp', 'face', 'idCard', 'facePrep', 'faceCapture', 'password'];
const STEP_META = {
  citizenId: { n: 1, label: 'ข้อมูลส่วนตัว' },
  /* Stepper label ≠ page title: Figma 2119:51183 shows "ยืนยันรหัส OTP" on the
     step row while the header stays "ยืนยัน OTP". */
  otp:       { n: 2, label: 'ยืนยันรหัส OTP' },
  /* Figma flow: identity verification (ThaID / face scan) is step 3, right
     after OTP; the ID-card capture follows as step 4 (2119:51121 · 2042:28018). */
  face:      { n: 3, label: 'ยืนยันตัวตน' },
  idCard:    { n: 4, label: 'ถ่ายบัตรประชาชน' },
  /* Face-scan prep + capture share step 5 "สแกนใบหน้า" (Archive 173:76113 /
     47:19902 both label "ขั้นตอนที่ 5 จาก 5"). Password is also step 5. */
  facePrep:    { n: 5, label: 'สแกนใบหน้า' },
  faceCapture: { n: 5, label: 'สแกนใบหน้า' },
  password:  { n: 5, label: 'ตั้งรหัสผ่าน' },
};
const TOTAL = 5;

/* Demo fixtures for artboard unhappy / edge cases. */
const DEMO_DUPLICATE_CID = '1103700123456';
const DEMO_RESUME_CID = '1103700987654';
const DEMO_OTP_EXPIRED = '999999';
const OTP_MAX_ATTEMPTS = 3;
const OTP_COOLDOWN_SEC = 60;

const C = {
  brand: 'var(--text-brandPrimary-default, #007549)',
  brandSoft: 'var(--surface-brandPrimary-quaternary, #F4FBF8)',
  brandTertiary: 'var(--surface-brandPrimary-tertiary, #E2F3EB)',
  brandFill: 'var(--surface-brandPrimary-default, #007549)',   /* stepper: completed */
  neutralInk: 'var(--text-neutral-default, #4D5358)',
  border: 'var(--border-brandPrimary-quaternary, #E2F3EB)',
  borderNeutral: 'var(--border-content-tertiary, #E1E3E5)',
  ink: 'var(--text-content-default, #111314)',
  sub: 'var(--text-content-secondary, #636B72)',
  muted: 'var(--text-content-tertiary, #858C92)',
  danger: 'var(--text-danger-default, #DC2626)',
  screen: 'var(--background-screen-brand-100, #F4FBF8)',
  card: 'var(--surface-card-100, #FFFFFF)',
  positive: 'var(--surface-positive-default, #196C65)',
};

const digits = (v) => String(v || '').replace(/\D/g, '');

/* ─── Shared chrome ─────────────────────────────────────────────────── */
const RegHeader = ({ title, onBack }) => (
  <div
    className='flex items-center shrink-0'
    style={{
      height: 68,
      padding: '0 var(--dim-space-200, 8px)',
      borderBottom: `var(--dim-stroke-100) solid ${C.border}`,
      background: 'var(--surface-navigation-default, #FFFFFF)',
      boxShadow: 'var(--shadow-brand-drop-bottom-100, 0 1px 2px rgba(8,167,104,0.08))',
      position: 'sticky',
      top: 0,
      zIndex: 5,
    }}
  >
    <button
      type='button'
      onClick={onBack}
      aria-label='ย้อนกลับ'
      className='inline-flex items-center justify-center'
      style={{
        width: 40,
        height: 40,
        border: 0,
        background: 'transparent',
        cursor: 'pointer',
        color: C.ink,
        borderRadius: 'var(--dim-radius-full)',
      }}
    >
      <Sym name='chevron_left' size={24} />
    </button>
    <span
      style={{
        flex: 1,
        textAlign: 'center',
        fontFamily: 'var(--type-family-heading-graphic2, var(--type-family-body))',
        fontSize: 'var(--type-size-base, 16px)',
        color: C.ink,
      }}
    >
      {title}
    </span>
    <span style={{ width: 40 }} aria-hidden />
  </div>
);

const StepBar = ({ stepKey }) => {
  const meta = STEP_META[stepKey];
  if (!meta) return null;
  return (
    <div
      style={{
        /* Figma Content top — Archive 44:10873 Steps sit under py-600 */
        padding: 'var(--dim-space-600, 24px) var(--dim-space-400, 16px) 0',
        background: C.screen,
      }}
    >
      <div
        className='flex flex-col'
        style={{ gap: 'var(--dim-space-300, 12px)', width: '100%' }}
      >
        <div
          className='flex items-end justify-between'
          style={{ gap: 'var(--dim-space-200, 8px)', width: '100%' }}
        >
          <span
            style={{
              flex: 1,
              minWidth: 0,
              fontFamily: 'var(--type-family-heading-graphic2)',
              fontSize: 'var(--type-size-sm, 14px)',
              lineHeight: 1.5,
              color: C.brand,
            }}
          >
            ขั้นตอนที่ {meta.n} จาก {TOTAL}
          </span>
          <span
            style={{
              flexShrink: 0,
              fontFamily: 'var(--type-family-heading-graphic2)',
              fontSize: 'var(--type-size-xs, 12px)',
              lineHeight: 1.5,
              color: C.brand,
            }}
          >
            {meta.label}
          </span>
        </div>
        {/* Figma 2119:51183 paints three distinct states, not two: steps already
            done are brandPrimary/default, the CURRENT one is positive/default,
            and the rest are brandPrimary/tertiary. Colouring every done-or-
            current bar the same teal loses "where am I" at a glance. */}
        <div className='flex items-center' style={{ gap: 'var(--dim-space-200, 8px)', width: '100%' }}>
          {Array.from({ length: TOTAL }).map((_, i) => (
            <span
              key={i}
              style={{
                flex: 1,
                minWidth: 0,
                height: 6,
                borderRadius: 3,
                background: i < meta.n - 1
                  ? C.brandFill
                  : i === meta.n - 1
                    ? C.positive
                    : C.brandTertiary,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

const Footer = ({ children }) => (
  <div
    style={{
      padding: 'var(--dim-space-400, 16px)',
      borderTop: `var(--dim-stroke-100) solid ${C.border}`,
      background: C.card,
      boxShadow: 'var(--shadow-brand-drop-top-100, 0 -1px 2px rgba(8,167,104,0.08))',
    }}
  >
    {children}
  </div>
);

const FormCard = ({ children }) => (
  <div
    style={{
      background: C.card,
      borderRadius: 'var(--dim-radius-600, 24px)',
      boxShadow: 'var(--shadow-brand-drop-bottom-100, 0 1px 2px rgba(8,167,104,0.08))',
      padding: 'var(--dim-space-600, 24px)',
      width: '100%',
    }}
  >
    {children}
  </div>
);

const Title = ({ children }) => (
  <h1
    style={{
      margin: 0,
      fontFamily: 'var(--type-family-heading-graphic2, var(--type-family-body))',
      fontSize: 'var(--type-size-2xl, 24px)',
      fontWeight: 'var(--type-weight-regular, 400)',
      lineHeight: 1.375,
      color: C.brand,
      textAlign: 'center',
    }}
  >
    {children}
  </h1>
);

const Subtitle = ({ children }) => (
  <p
    style={{
      margin: 'var(--dim-space-150, 6px) 0 0',
      fontSize: 'var(--type-size-sm, 14px)',
      color: C.muted,
      textAlign: 'center',
      lineHeight: 1.5,
    }}
  >
    {children}
  </p>
);

/* ─── Welcome carousel (Welcome1–4) — Figma 2042:28058 / 28073 / 28088 / 28103 ─ */
/* Welcome1 illus = Figma "Health insurance" → /illustration/mobile/health-insurance.json */
const WELCOME_ILLUS_SIZE = 192;
const WELCOME_BG = 'var(--surface-card-100, #FFFFFF)';
/* Figma BG component 2042:22944 — full-screen wash behind Welcome1–4
   Radial: center = background/bg/{blue,teal}-400 · edge = #FFFFFF @ 0% */
const WELCOME_GLOW_EDGE = 'rgba(255, 255, 255, 0)'; /* Figma stop 100% · opacity 0% */
const WELCOME_GLOW_BLUE = {
  width: 561,
  height: 566,
  left: -22,
  top: 7,
  /* ellipse 50% 50% → 100% stop sits on the soft edge (no hard circle clip) */
  background:
    `radial-gradient(ellipse 50% 50% at 50% 50%, var(--background-bg-blue-400, rgba(64, 170, 242, 0.2)) 0%, ${WELCOME_GLOW_EDGE} 100%)`,
};
const WELCOME_GLOW_TEAL = {
  width: 519,
  height: 526,
  left: -160,
  top: 27,
  background:
    `radial-gradient(ellipse 50% 50% at 50% 50%, var(--background-bg-teal-400, rgba(62, 195, 178, 0.2)) 0%, ${WELCOME_GLOW_EDGE} 100%)`,
};
const WELCOME_SLIDES = [
  {
    lottie: '/illustration/mobile/health-insurance.json',
    image: '/illustration/mobile/welcome-1-health-insurance.png',
    title: (
      <>
        เข้าถึงบริการสุขภาพ
        <br />
        ที่สะดวกยิ่งขึ้น
      </>
    ),
    body: (
      <>
        จองนัดหมาย พบแพทย์ และ
        <br />
        จัดการบริการสุขภาพของคุณได้ในที่เดียว
        <br />
        <br />
        โดยสำนักงานอนามัย กรุงเทพมหานคร
      </>
    ),
  },
  {
    /* Figma Welcome2 2042:28073 — "Doctor Appointment" */
    lottie: '/illustration/mobile/doctor-appointment-recolored.json',
    image: '/illustration/mobile/welcome-2-doctor-appointment.png',
    title: (
      <>
        นัดหมายและติดตามผล
        <br />
        ได้ทุกที่
      </>
    ),
    body: 'จองนัดพบแพทย์ ติดตามผลการรักษา และดูประวัติการรักษาย้อนหลังได้สะดวก ทุกที่ทุกเวลา',
  },
  {
    /* Figma Welcome3 2042:28088 — "Medical folder" */
    lottie: '/illustration/mobile/medical-folder-recolored.json',
    image: '/illustration/mobile/welcome-3-medical-folder.png',
    title: 'ดูประวัติและการชำระเงินได้',
    body: 'ตรวจสอบประวัติการรักษา ดูค่าใช้จ่าย และชำระเงินได้อย่างปลอดภัย ครบจบในแอปเดียว',
  },
  {
    /* Figma Welcome4 2042:28103 — "Mobile security" */
    lottie: '/illustration/mobile/mobile-security-recolored.json',
    image: '/illustration/mobile/welcome-4-mobile-security.png',
    title: 'ปลอดภัย ด้วยการยืนยันตัวตน',
    body: 'ยืนยันตัวตนด้วยอัตลักษณ์บุคคล (Biometric) เพื่อความปลอดภัยของข้อมูลสุขภาพของคุณ',
  },
];

const WelcomeIllustration = ({ slide }) => {
  const [anim, setAnim] = useState(null);
  useEffect(() => {
    if (!slide.lottie) {
      setAnim(null);
      return undefined;
    }
    let alive = true;
    fetch(slide.lottie)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive) setAnim(d); })
      .catch(() => { /* keep PNG fallback */ });
    return () => { alive = false; };
  }, [slide.lottie]);

  if (anim) {
    return (
      <LottieIllustration
        animationData={anim}
        size={WELCOME_ILLUS_SIZE}
        loop
      />
    );
  }
  return (
    <img
      src={slide.image}
      alt=''
      aria-hidden
      style={{
        display: 'block',
        width: WELCOME_ILLUS_SIZE,
        height: WELCOME_ILLUS_SIZE,
        objectFit: 'contain',
        flexShrink: 0,
      }}
    />
  );
};

/* Figma Welcome1–4 layout: BG wash → illus + text → stepper → footer CTA */
const WelcomeStep = ({ index, onNext }) => {
  const slide = WELCOME_SLIDES[index];
  return (
    <div
      className='relative flex flex-col overflow-hidden'
      style={{
        height: '100%',
        minHeight: '100%',
        background: WELCOME_BG,
      }}
    >
      {/* Figma BG 2042:22944 — Ellipse 2 (blue) + Ellipse 3 (teal), clipped to screen */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          overflow: 'hidden',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: WELCOME_GLOW_BLUE.left,
            top: WELCOME_GLOW_BLUE.top,
            width: WELCOME_GLOW_BLUE.width,
            height: WELCOME_GLOW_BLUE.height,
            background: WELCOME_GLOW_BLUE.background,
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: WELCOME_GLOW_TEAL.left,
            top: WELCOME_GLOW_TEAL.top,
            width: WELCOME_GLOW_TEAL.width,
            height: WELCOME_GLOW_TEAL.height,
            background: WELCOME_GLOW_TEAL.background,
          }}
        />
      </div>

      <div
        className='relative flex-1 flex flex-col items-center justify-center min-h-0'
        style={{
          padding: 'var(--dim-space-600, 24px)',
          gap: 'var(--dim-space-600, 24px)',
          zIndex: 1,
        }}
      >
        <div
          className='shrink-0 overflow-hidden'
          style={{ width: WELCOME_ILLUS_SIZE, height: WELCOME_ILLUS_SIZE }}
        >
          <WelcomeIllustration slide={slide} />
        </div>
        <div
          className='flex flex-col items-center w-full'
          style={{ gap: 'var(--dim-space-300, 12px)', textAlign: 'center' }}
        >
          <h1
            style={{
              margin: 0,
              width: '100%',
              fontFamily: 'var(--type-family-heading-graphic2, var(--type-family-body))',
              fontSize: 'var(--type-size-2xl, 24px)',
              fontWeight: 'var(--type-weight-medium, 500)',
              lineHeight: 1.375,
              color: 'var(--text-brandPrimary-default, #007549)',
            }}
          >
            {slide.title}
          </h1>
          <p
            style={{
              margin: 0,
              width: '100%',
              fontFamily: 'var(--type-family-heading-graphic2, var(--type-family-body))',
              fontSize: 'var(--type-size-lg, 18px)',
              fontWeight: 'var(--type-weight-regular, 400)',
              lineHeight: 1.5,
              color: 'var(--text-content-default, #111314)',
            }}
          >
            {slide.body}
          </p>
        </div>
      </div>

      {/* Stepper — Figma: only current segment is surface/positive/default */}
      <div
        className='relative flex items-center w-full shrink-0'
        style={{
          gap: 'var(--dim-space-200, 8px)',
          padding: 'var(--dim-space-300, 12px) var(--dim-space-400, 16px)',
          zIndex: 1,
        }}
      >
        {WELCOME_SLIDES.map((_, i) => (
          <span
            key={i}
            style={{
              flex: 1,
              height: 6,
              borderRadius: 'var(--dim-radius-100, 4px)',
              background: i === index
                ? 'var(--surface-positive-default, #196C65)'
                : 'var(--surface-brandPrimary-tertiary, #E2F3EB)',
            }}
          />
        ))}
      </div>

      {/* Footer — Brand Drop Shadow Top/100 */}
      <div
        className='relative shrink-0'
        style={{
          padding: 'var(--dim-space-400, 16px)',
          borderTop: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary, #E2F3EB)',
          background: 'var(--surface-card-100, #FFFFFF)',
          boxShadow: '0 -1px 4px var(--PrimaryShadow-600, rgba(8,167,104,0.08))',
          zIndex: 1,
        }}
      >
        <MobileButton variant='primary' size='lg' iconRight='chevron_right' onClick={onNext}>
          ถัดไป
        </MobileButton>
      </div>
    </div>
  );
};

/* ─── Terms / Policy ────────────────────────────────────────────────── */
/* Figma 2042:27956 Term · 2042:27973 Policy · accept states 27972 / 27989 */
const docBodyStyle = {
  margin: 0,
  color: 'var(--text-content-secondary, #636B72)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm, 14px)',
  fontWeight: 'var(--type-weight-regular, 400)',
  lineHeight: 1.5,
};
const docHeadingStyle = {
  margin: 0,
  color: 'var(--text-brandPrimary-default, #007549)',
  fontFamily: 'var(--type-family-heading-graphic2, var(--type-family-body))',
  fontSize: 'var(--type-size-base, 16px)',
  fontWeight: 'var(--type-weight-regular, 400)',
  lineHeight: 1.5,
};

const TERMS_BODY = (
  <>
    <p style={docBodyStyle}>
      ยินดีต้อนรับสู่แอปพลิเคชัน PHCIS Mobile (&quot;แอปพลิเคชัน&quot;) ซึ่งเป็นช่องทางบริการสุขภาพประชาชน
      ของสำนักอนามัย กรุงเทพมหานคร (&quot;ผู้ให้บริการ&quot;) เพื่อเชื่อมโยงกับระบบข้อมูลสุขภาพและคลินิก
      Primary Care ของกรุงเทพมหานคร (PHCIS) โปรดอ่านเงื่อนไขการให้บริการเหล่านี้ (&quot;เงื่อนไข&quot;)
      อย่างละเอียดก่อนเริ่มใช้งาน การที่คุณกด &quot;ยอมรับเงื่อนไขการให้บริการ&quot; และดำเนินการลงทะเบียนต่อ
      ถือว่าคุณได้อ่าน เข้าใจ และตกลงผูกพันตามเงื่อนไขทั้งหมด
    </p>

    <h3 style={docHeadingStyle}>1. คำนิยาม</h3>
    <ul style={{ ...docBodyStyle, paddingLeft: 21 }}>
      <li>
        &quot;ผู้ใช้บริการ&quot; หมายถึง บุคคลธรรมดาที่ลงทะเบียนและใช้งานแอปพลิเคชันด้วยตนเอง
        หรือเป็นผู้แทนโดยชอบด้วยกฎหมายของผู้เยาว์ / ผู้ไร้ความสามารถ
      </li>
      <li>
        &quot;PHCIS&quot; หมายถึงระบบสารสนเทศสุขภาพประชาชนกรุงเทพมหานคร (Primary Healthcare Information System)
        ที่ใช้ในศูนย์บริการสาธารณสุข สำนักงานอนามัยเขต และหน่วยบริการในสังกัดสำนักอนามัย กทม.
      </li>
      <li>
        &quot;หน่วยบริการ&quot; หมายถึง ศูนย์บริการสาธารณสุข คลินิกเฉพาะทาง หน่วยบริการปฐมภูมิ
        หรือสถานที่ให้บริการอื่นที่เชื่อมต่อกับระบบ PHCIS
      </li>
      <li>
        &quot;เลข HN&quot; หมายถึงหมายเลขประวัติผู้ป่วย (Hospital Number) ในระบบ PHCIS
        ซึ่งอาจมีมากกว่าหนึ่งเลขหากเคยรับบริการหลายหน่วย
      </li>
      <li>
        &quot;ข้อมูลสุขภาพ&quot; หมายถึงข้อมูลที่เกี่ยวข้องกับสุขภาพของผู้ใช้บริการ เช่น ประวัติการรักษา
        ผลการตรวจ วินิจฉัย รายการยา ค่าวัดสัญญาณชีพ สิทธิการรักษา และการนัดหมาย
      </li>
      <li>
        &quot;บริการ&quot; หมายถึงบริการผ่านแอปพลิเคชัน เช่น การลงทะเบียนและยืนยันตัวตน การนัดหมายพบแพทย์
        การปรึกษาทางไกล (Telemedicine) การเยี่ยมบ้าน การดูประวัติการรักษา การชำระค่าบริการ
        และการรับการแจ้งเตือนจากหน่วยบริการ
      </li>
    </ul>

    <h3 style={docHeadingStyle}>2. คุณสมบัติของผู้ใช้บริการ</h3>
    <p style={docBodyStyle}>
      2.1 ผู้ใช้บริการต้องมีอายุไม่ต่ำกว่า 20 ปีบริบูรณ์ หรือหากอายุต่ำกว่า 20 ปี
      ต้องได้รับความยินยอมจากผู้ปกครองหรือผู้แทนโดยชอบด้วยกฎหมายก่อนลงทะเบียนและใช้บริการ
    </p>
    <p style={docBodyStyle}>
      2.2 ผู้ใช้บริการต้องมีเลขประจำตัวประชาชนไทยที่ใช้งานได้ และหมายเลขโทรศัพท์มือถือ
      ที่ลงทะเบียนและใช้งานในราชอาณาจักรไทย เพื่อรับรหัส OTP และติดต่อจากหน่วยบริการ
    </p>
    <p style={docBodyStyle}>
      2.3 ผู้ให้บริการขอสงวนสิทธิ์ในการตรวจสอบและยืนยันตัวตนผ่านระบบของกรมการปกครอง (DOPA)
      รวมถึงการถ่ายภาพบัตรประชาชนและ/หรือการยืนยันด้วยอัตลักษณ์ชีวภาพ (Biometric)
      เพื่อความถูกต้องของข้อมูลตามมาตรฐานการให้บริการของสำนักอนามัย กทม.
    </p>
    <p style={docBodyStyle}>
      2.4 ผู้ใช้บริการรับรองว่าข้อมูลที่ให้ไว้เป็นความจริง หากตรวจพบข้อมูลเท็จหรือใช้เอกสารของผู้อื่น
      ผู้ให้บริการมีสิทธิระงับหรือยกเลิกบัญชีโดยไม่ต้องแจ้งล่วงหน้า
    </p>

    <h3 style={docHeadingStyle}>3. ขอบเขตของบริการ</h3>
    <p style={docBodyStyle}>
      3.1 แอปพลิเคชันเป็นช่องทางอำนวยความสะดวกในการเข้าถึงบริการสาธารณสุขของกรุงเทพมหานคร
      ไม่ใช่การวินิจฉัยโรคฉุกเฉิน และไม่ทดแทนการตรวจรักษาโดยบุคลากรทางการแพทย์ ณ หน่วยบริการ
    </p>
    <p style={docBodyStyle}>
      3.2 ในกรณีฉุกเฉินที่อาจเป็นอันตรายต่อชีวิตหรืออวัยวะสำคัญ ให้ติดต่อหมายเลขฉุกเฉิน 1669
      หรือเข้ารับบริการที่ห้องฉุกเฉินของสถานพยาบาลใกล้เคียงทันที ห้ามรอผลการนัดหมายผ่านแอปพลิเคชัน
    </p>
    <p style={docBodyStyle}>
      3.3 การนัดหมาย Telemedicine และการเยี่ยมบ้านขึ้นอยู่กับความพร้อมของหน่วยบริการ แพทย์/พยาบาล
      และสิทธิการรักษาของผู้ใช้บริการ ผู้ให้บริการอาจปรับเปลี่ยนหรือยกเลิกนัดหมายเมื่อมีความจำเป็น
      และจะพยายามแจ้งให้ทราบผ่านแอปพลิเคชันหรือช่องทางที่ลงทะเบียนไว้
    </p>
    <p style={docBodyStyle}>
      3.4 ข้อมูลประวัติการรักษาที่แสดงในแอปพลิเคชันเป็นข้อมูลจากระบบ PHCIS ตามสิทธิ์การเข้าถึงที่ได้รับ
      อาจมีความล่าช้าหรือไม่ครบถ้วนหากหน่วยบริการยังไม่บันทึกหรืออยู่ระหว่างตรวจสอบข้อมูล
    </p>

    <h3 style={docHeadingStyle}>4. บัญชีผู้ใช้ ความปลอดภัย และการใช้งาน</h3>
    <p style={docBodyStyle}>
      4.1 ผู้ใช้บริการต้องเก็บรักษารหัสผ่าน PIN รหัส OTP และข้อมูลชีวภาพไว้เป็นความลับ
      และไม่ยินยอมให้ผู้อื่นใช้บัญชีของตน เว้นแต่เป็นผู้แทนโดยชอบด้วยกฎหมายตามที่ระบบอนุญาต
    </p>
    <p style={docBodyStyle}>
      4.2 หากพบการใช้งานผิดปกติหรือสงสัยว่าบัญชีถูกละเมิด ให้เปลี่ยนรหัสผ่าน/PIN ทันที
      และแจ้งศูนย์บริการประชาชนหรือหน่วยบริการที่ลงทะเบียนไว้
    </p>
    <p style={docBodyStyle}>
      4.3 ผู้ใช้บริการตกลงไม่ใช้แอปพลิเคชันเพื่อวัตถุประสงค์ที่ไม่ชอบด้วยกฎหมาย การฉ้อฉล
      การแอบอ้างบุคคลอื่น การรบกวนระบบ หรือการเข้าถึงข้อมูลของผู้อื่นโดยไม่มีสิทธิ
    </p>

    <h3 style={docHeadingStyle}>5. การนัดหมาย การยกเลิก และการไม่มารับบริการ</h3>
    <p style={docBodyStyle}>
      5.1 ผู้ใช้บริการควรมาถึงหน่วยบริการหรือพร้อมเข้าร่วม Telemedicine ตามเวลาที่นัดหมาย
      หากไม่สามารถมารับบริการได้ ควรยกเลิกหรือเลื่อนนัดล่วงหน้าตามช่องทางที่กำหนด
    </p>
    <p style={docBodyStyle}>
      5.2 การไม่มารับบริการโดยไม่แจ้งล่วงหน้าซ้ำหลายครั้ง อาจส่งผลต่อการจองคิวนัดหมายครั้งถัดไป
      ตามระเบียบของหน่วยบริการนั้นๆ
    </p>

    <h3 style={docHeadingStyle}>6. ค่าบริการและการชำระเงิน</h3>
    <p style={docBodyStyle}>
      6.1 ค่าบริการขึ้นอยู่กับประเภทการรักษา สิทธิการรักษา (เช่น สิทธิหลักประกันสุขภาพแห่งชาติ
      สิทธิข้าราชการ สิทธิประกันสังคม หรือชำระเงินเอง) และระเบียบของหน่วยบริการ
    </p>
    <p style={docBodyStyle}>
      6.2 การชำระเงินผ่านแอปพลิเคชัน (หากมี) จะดำเนินการผ่านผู้ให้บริการชำระเงินที่ได้รับอนุญาต
      ผู้ใช้บริการมีหน้าที่ตรวจสอบรายการก่อนยืนยันการชำระ
    </p>

    <h3 style={docHeadingStyle}>7. ความรับผิดและการจำกัดความรับผิด</h3>
    <p style={docBodyStyle}>
      7.1 ผู้ให้บริการจะใช้ความระมัดระวังตามสมควรในการดูแลระบบ แต่ไม่อาจรับประกันว่าแอปพลิเคชัน
      จะปราศจากข้อผิดพลาด หยุดชะงัก หรือเข้าถึงได้ตลอดเวลา โดยเฉพาะในช่วงบำรุงรักษาระบบ
      หรือเหตุสุดวิสัย
    </p>
    <p style={docBodyStyle}>
      7.2 การตัดสินใจทางการแพทย์เป็นดุลพินิจของบุคลากรวิชาชีพ ณ หน่วยบริการ
      ผู้ให้บริการไม่รับผิดชอบต่อผลลัพธ์ทางคลินิกที่เกิดจากการวินิจฉัยหรือการรักษา
      นอกเหนือจากที่กฎหมายกำหนด
    </p>

    <h3 style={docHeadingStyle}>8. การระงับ ยกเลิก และการแก้ไขเงื่อนไข</h3>
    <p style={docBodyStyle}>
      8.1 ผู้ให้บริการมีสิทธิระงับหรือยกเลิกการให้บริการทั้งหมดหรือบางส่วน
      หากพบการละเมิดเงื่อนไข หรือเพื่อความมั่นคงปลอดภัยของระบบและข้อมูลประชาชน
    </p>
    <p style={docBodyStyle}>
      8.2 ผู้ให้บริการอาจปรับปรุงเงื่อนไขนี้เป็นครั้งคราว โดยจะแจ้งผ่านแอปพลิเคชัน
      หรือช่องทางที่เหมาะสม การใช้บริการต่อหลังจากมีการแก้ไข ถือว่าผู้ใช้บริการยอมรับเงื่อนไขฉบับใหม่
    </p>

    <h3 style={docHeadingStyle}>9. กฎหมายที่ใช้บังคับและการติดต่อ</h3>
    <p style={docBodyStyle}>
      9.1 เงื่อนไขนี้อยู่ภายใต้บังคับแห่งกฎหมายไทย
    </p>
    <p style={docBodyStyle}>
      9.2 หากมีข้อสงสัยเกี่ยวกับการใช้งานแอปพลิเคชันหรือบริการของศูนย์บริการสาธารณสุข
      กรุณาติดต่อสายด่วนสาธารณสุข กทม. หรือศูนย์บริการสาธารณสุขในพื้นที่ของท่าน
      ในวันและเวลาราชการ
    </p>
    <p style={docBodyStyle}>
      วันที่บังคับใช้ฉบับนี้: 1 ตุลาคม 2568 · ผู้ให้บริการ: สำนักอนามัย กรุงเทพมหานคร
    </p>
  </>
);

const POLICY_BODY = (
  <>
    <p style={docBodyStyle}>
      สำนักอนามัย กรุงเทพมหานคร (&quot;ผู้ให้บริการ&quot; หรือ &quot;เรา&quot;) ให้ความสำคัญกับการคุ้มครองข้อมูลส่วนบุคคล
      ของผู้ใช้แอปพลิเคชัน PHCIS Mobile (&quot;แอปพลิเคชัน&quot;) ตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA)
      และแนวปฏิบัติของหน่วยงานราชการ กรุณาอ่านนโยบายนี้โดยละเอียดก่อนกดยอมรับ
    </p>

    <h3 style={docHeadingStyle}>1. คำนิยาม</h3>
    <ul style={{ ...docBodyStyle, paddingLeft: 21 }}>
      <li>
        &quot;ข้อมูลส่วนบุคคล&quot; หมายถึงข้อมูลเกี่ยวกับบุคคลซึ่งทำให้สามารถระบุตัวบุคคลนั้นได้
        ไม่ว่าทางตรงหรือทางอ้อม เช่น ชื่อ–นามสกุล เลขประจำตัวประชาชน เบอร์โทรศัพท์ ที่อยู่
      </li>
      <li>
        &quot;ข้อมูลสุขภาพ&quot; หมายถึงข้อมูลส่วนบุคคลที่มีความอ่อนไหวเกี่ยวกับสุขภาพกายหรือสุขภาพจิต
        รวมถึงประวัติการรักษา ผลตรวจ การวินิจฉัย รายการยา สิทธิการรักษา และค่าวัดต่างๆ ในระบบ PHCIS
      </li>
      <li>
        &quot;ผู้ควบคุมข้อมูล&quot; หมายถึงสำนักอนามัย กรุงเทพมหานคร ซึ่งกำหนดวัตถุประสงค์และวิธีการ
        ในการเก็บรวบรวม ใช้ หรือเปิดเผยข้อมูลส่วนบุคคลผ่านแอปพลิเคชันและระบบ PHCIS
      </li>
      <li>
        &quot;หน่วยบริการ&quot; หมายถึงศูนย์บริการสาธารณสุข สำนักงานอนามัยเขต และหน่วยบริการอื่นในสังกัด
        ที่เชื่อมต่อกับระบบ PHCIS
      </li>
    </ul>

    <h3 style={docHeadingStyle}>2. ข้อมูลที่เราเก็บรวบรวม</h3>
    <p style={docBodyStyle}>
      2.1 ข้อมูลยืนยันตัวตน เช่น เลขประจำตัวประชาชน ชื่อ–นามสกุล วันเดือนปีเกิด ภาพบัตรประชาชน
      และผลการตรวจสอบกับกรมการปกครอง (DOPA) ตามความจำเป็นในการลงทะเบียน
    </p>
    <p style={docBodyStyle}>
      2.2 ข้อมูลการติดต่อ เช่น หมายเลขโทรศัพท์มือถือ อีเมล (หากมี) และที่อยู่สำหรับติดต่อหรือรับบริการ
    </p>
    <p style={docBodyStyle}>
      2.3 ข้อมูลบัญชีและความปลอดภัย เช่น รหัสผ่าน PIN รหัส OTP ประวัติการเข้าสู่ระบบ
      และข้อมูลชีวภาพ (ลายนิ้วมือ / Face ID) หากคุณเปิดใช้งานบนอุปกรณ์ของคุณ
    </p>
    <p style={docBodyStyle}>
      2.4 ข้อมูลสุขภาพและบริการ เช่น เลข HN ประวัติการนัดหมาย การรักษา Telemedicine / เยี่ยมบ้าน
      ผลการตรวจ รายการยา และการชำระค่าบริการ ที่เกี่ยวข้องกับการใช้บริการของหน่วยบริการ กทม.
    </p>
    <p style={docBodyStyle}>
      2.5 ข้อมูลเทคนิคของอุปกรณ์ เช่น รุ่นอุปกรณ์ ระบบปฏิบัติการ รหัสอุปกรณ์ และการแจ้งเตือน (Push Notification)
      เพื่อให้บริการและรักษาความมั่นคงปลอดภัยของระบบ
    </p>

    <h3 style={docHeadingStyle}>3. วัตถุประสงค์ในการใช้ข้อมูล</h3>
    <p style={docBodyStyle}>
      3.1 เพื่อยืนยันตัวตน ลงทะเบียนบัญชี และป้องกันการแอบอ้างบุคคลอื่น
    </p>
    <p style={docBodyStyle}>
      3.2 เพื่อจัดให้บริการสาธารณสุขผ่านแอปพลิเคชัน เช่น นัดหมาย พบแพทย์ ปรึกษาทางไกล
      เยี่ยมบ้าน ดูประวัติการรักษา และชำระค่าบริการ
    </p>
    <p style={docBodyStyle}>
      3.3 เพื่อเชื่อมโยงและปรับปรุงข้อมูลในระบบ PHCIS ให้หน่วยบริการสามารถดูแลต่อเนื่องได้
    </p>
    <p style={docBodyStyle}>
      3.4 เพื่อติดต่อแจ้งเตือนนัดหมาย ผลการให้บริการ หรือข้อมูลที่จำเป็นต่อความปลอดภัยของคุณ
    </p>
    <p style={docBodyStyle}>
      3.5 เพื่อปฏิบัติตามกฎหมาย คำสั่งศาล หรือภารกิจของหน่วยงานของรัฐที่เกี่ยวข้อง
    </p>
    <p style={docBodyStyle}>
      3.6 เพื่อวิเคราะห์และปรับปรุงคุณภาพบริการในภาพรวม โดยจะทำให้ข้อมูลเป็นข้อมูลนิรนามหรือรวมกลุ่ม
      เมื่อไม่จำเป็นต้องระบุตัวบุคคล
    </p>

    <h3 style={docHeadingStyle}>4. ฐานทางกฎหมายในการประมวลผล</h3>
    <p style={docBodyStyle}>
      เราประมวลผลข้อมูลส่วนบุคคลตามฐานความยินยอม ฐานการปฏิบัติตามสัญญา/การให้บริการที่คุณร้องขอ
      ฐานภารกิจของรัฐ ฐานประโยชน์สำคัญต่อชีวิต และฐานประโยชน์โดยชอบด้วยกฎหมาย ตามที่ PDPA อนุญาต
      สำหรับข้อมูลสุขภาพซึ่งเป็นข้อมูลอ่อนไหว เราจะประมวลผลภายใต้ข้อยกเว้นหรือความยินยอมตามที่กฎหมายกำหนด
    </p>

    <h3 style={docHeadingStyle}>5. การเปิดเผยข้อมูลแก่บุคคลอื่น</h3>
    <p style={docBodyStyle}>
      5.1 เราอาจเปิดเผยข้อมูลแก่บุคลากรและหน่วยบริการในสังกัดสำนักอนามัย กทม. เท่าที่จำเป็นต่อการให้บริการ
    </p>
    <p style={docBodyStyle}>
      5.2 เราอาจเปิดเผยข้อมูลแก่หน่วยงานของรัฐที่เกี่ยวข้อง (เช่น สปสช. ประกันสังคม กรมการปกครอง)
      ตามหน้าที่ทางกฎหมายหรือเพื่อตรวจสอบสิทธิการรักษา
    </p>
    <p style={docBodyStyle}>
      5.3 เราอาจใช้ผู้ประมวลผลข้อมูลภายนอก (เช่น ผู้ให้บริการโฮสติ้ง ระบบแจ้งเตือน หรือระบบชำระเงิน)
      ภายใต้สัญญาที่กำหนดมาตรการคุ้มครองข้อมูลตามมาตรฐานที่เหมาะสม
    </p>
    <p style={docBodyStyle}>
      5.4 เราจะไม่ขายหรือแลกเปลี่ยนข้อมูลส่วนบุคคลของคุณเพื่อวัตถุประสงค์ทางการค้า
    </p>

    <h3 style={docHeadingStyle}>6. การเก็บรักษาและความมั่นคงปลอดภัย</h3>
    <p style={docBodyStyle}>
      6.1 เราเก็บรักษาข้อมูลเท่าที่จำเป็นต่อวัตถุประสงค์ในการให้บริการและตามอายุการเก็บรักษาของราชการ
      หรือจนกว่าคุณถอนความยินยอม / ขอลบข้อมูล ในกรณีที่กฎหมายยังกำหนดให้เก็บไว้
    </p>
    <p style={docBodyStyle}>
      6.2 เราจัดให้มีมาตรการเชิงองค์กรและเชิงเทคนิคที่เหมาะสม เช่น การควบคุมสิทธิ์เข้าถึง การเข้ารหัส
      และการบันทึกประวัติการใช้งานระบบ เพื่อป้องกันการเข้าถึง ใช้ หรือเปิดเผยโดยไม่ได้รับอนุญาต
    </p>

    <h3 style={docHeadingStyle}>7. สิทธิของเจ้าของข้อมูล</h3>
    <p style={docBodyStyle}>
      คุณมีสิทธิขอเข้าถึง ขอสำเนา ขอแก้ไข ขอระงับใช้ ขอคัดค้าน ขอถอนความยินยอม ขอให้ลบหรือทำลาย
      และขอให้โอนย้ายข้อมูล ตามเงื่อนไขและข้อจำกัดของ PDPA รวมถึงสิทธิร้องเรียนต่อสำนักงานคณะกรรมการคุ้มครองข้อมูลส่วนบุคคล
      การใช้สิทธิบางประการอาจส่งผลให้ใช้บริการบางอย่างในแอปพลิเคชันไม่ได้
    </p>

    <h3 style={docHeadingStyle}>8. คุกกี้และเทคโนโลยีที่คล้ายกัน</h3>
    <p style={docBodyStyle}>
      แอปพลิเคชันอาจเก็บข้อมูลการตั้งค่าและรหัสเซสชันบนอุปกรณ์ของคุณเพื่อจดจำการเข้าสู่ระบบ
      และปรับปรุงประสบการณ์การใช้งาน คุณสามารถจัดการสิทธิ์การแจ้งเตือนและชีวภาพได้ในการตั้งค่าอุปกรณ์
    </p>

    <h3 style={docHeadingStyle}>9. การแก้ไขนโยบายและการติดต่อ</h3>
    <p style={docBodyStyle}>
      9.1 เราอาจปรับปรุงนโยบายนี้เป็นครั้งคราว และจะแจ้งผ่านแอปพลิเคชันหรือช่องทางที่เหมาะสม
      การใช้บริการต่อหลังจากมีการแก้ไข ถือว่าคุณรับทราบนโยบายฉบับใหม่
    </p>
    <p style={docBodyStyle}>
      9.2 หากมีคำถามเกี่ยวกับนโยบายนี้หรือต้องการใช้สิทธิเจ้าของข้อมูล
      กรุณาติดต่อเจ้าหน้าที่คุ้มครองข้อมูลส่วนบุคคล (DPO) ของสำนักอนามัย กรุงเทพมหานคร
      หรือศูนย์บริการสาธารณสุขในพื้นที่ ในวันและเวลาราชการ
    </p>
    <p style={docBodyStyle}>
      วันที่บังคับใช้ฉบับนี้: 1 ตุลาคม 2568 · ผู้ควบคุมข้อมูล: สำนักอนามัย กรุงเทพมหานคร
    </p>
  </>
);

/* Shared Terms / Policy — Figma Register:Term 2042:27956 · Register:Policy 2042:27973
   Layout: Header (parent) → Content (Steps + scroll card) → Footer CTA */
const ConsentDocStep = ({ title, body, onAccept, acceptLabel }) => {
  const scrollerRef = useRef(null);
  const [atBottom, setAtBottom] = useState(false);

  const onScroll = () => {
    const el = scrollerRef.current;
    if (!el) return;
    setAtBottom(el.scrollTop + el.clientHeight >= el.scrollHeight - 24);
  };

  const scrollToBottom = () => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  };

  useEffect(() => {
    onScroll();
  }, [title]);

  return (
    <div
      className='flex flex-col flex-1 min-h-0'
      style={{ height: '100%', background: C.screen }}
    >
      {/* Figma Content 2042:27976 — px-400 · py-600 · gap-400 */}
      <div
        className='flex flex-col flex-1 min-h-0'
        style={{
          padding: 'var(--dim-space-600, 24px) var(--dim-space-400, 16px)',
          gap: 'var(--dim-space-400, 16px)',
        }}
      >
        {/* Steps pinned — Figma 2042:27977 */}
        <div
          className='flex flex-col shrink-0'
          style={{ gap: 'var(--dim-space-300, 12px)', width: '100%' }}
        >
          <div
            className='flex items-end justify-between'
            style={{ gap: 'var(--dim-space-200, 8px)', width: '100%' }}
          >
            <span
              style={{
                flex: 1,
                minWidth: 0,
                fontFamily: 'var(--type-family-heading-graphic2)',
                fontSize: 'var(--type-size-sm, 14px)',
                lineHeight: 1.5,
                color: C.brand,
              }}
            >
              ขั้นตอนที่ 1 จาก {TOTAL}
            </span>
            <span
              style={{
                flexShrink: 0,
                fontFamily: 'var(--type-family-heading-graphic2)',
                fontSize: 'var(--type-size-xs, 12px)',
                lineHeight: 1.5,
                color: C.brand,
              }}
            >
              ข้อมูลส่วนตัว
            </span>
          </div>
          <div className='flex items-center' style={{ gap: 'var(--dim-space-200, 8px)', width: '100%' }}>
            {Array.from({ length: TOTAL }).map((_, i) => (
              <span
                key={i}
                style={{
                  flex: 1,
                  minWidth: 0,
                  height: 6,
                  borderRadius: 3,
                  background: i === 0 ? C.positive : C.brandTertiary,
                }}
              />
            ))}
          </div>
        </div>

        {/* Scrollable white card — Figma Content Body 2042:27979 */}
        <div
          ref={scrollerRef}
          onScroll={onScroll}
          className='flex-1 min-h-0 overflow-y-auto'
          style={{ width: '100%' }}
        >
          <FormCard>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--dim-space-300, 12px)',
                width: '100%',
              }}
            >
              <Title>{title}</Title>
              {body}
            </div>
          </FormCard>
        </div>
      </div>

      {/* Figma Footer 2042:27987 */}
      <Footer>
        {atBottom ? (
          <BrandButton
            size='Large'
            buttonStyle='Fill'
            showLeadingIcon={false}
            showTailingIcon={false}
            onClick={onAccept}
          >
            {acceptLabel}
          </BrandButton>
        ) : (
          <BrandSubdueButton
            size='Large'
            buttonStyle='Fill'
            leadingIcon='arrow_downward'
            showTailingIcon={false}
            onClick={scrollToBottom}
          >
            เลื่อนลงล่างด้านล่างสุด
          </BrandSubdueButton>
        )}
      </Footer>
    </div>
  );
};

/* ─── Intro (5 steps) — Register Intro + Archive Onboarding Steps 47:17960 ─ */
/* Hero = Figma "Mobile security" Lottie · step list = Archive divider rows */
const INTRO_HERO_LOTTIE = '/illustration/mobile/mobile-security-recolored.json';
const INTRO_HERO_FALLBACK = '/illustration/mobile/register-intro-hero.png';
const INTRO_ILLUS_SIZE = 112;
const FACE_VERIFY_LOTTIE = '/illustration/mobile/face-match-recolored.json';
const FACE_VERIFY_THAI_ID_LOGO = '/illustration/mobile/thai-id-logo.png';
const FACE_VERIFY_ILLUS_WIDTH = 124.777;
const FACE_VERIFY_ILLUS_HEIGHT = 128;
const INTRO_STEPS = [
  {
    icon: '/illustration/mobile/register-intro-user.svg',
    title: 'ข้อมูลยืนยันตัวตน',
    desc: (
      <>
        ใช้เลขบัตรประชาชนและเบอร์โทรศัพท์ที่
        <br />
        ติดต่อได้
      </>
    ),
  },
  {
    icon: '/illustration/mobile/register-intro-otp.svg',
    title: 'ยืนยันรหัส OTP',
    desc: 'รับรหัสผ่านทาง SMS เพื่อความปลอดภัยของบัญชี',
  },
  {
    icon: '/illustration/mobile/register-intro-idcard.svg',
    title: 'ถ่ายบัตรประชาชน',
    desc: 'ยืนยันตัวตนรูปถ่ายบัตรประชาชน',
  },
  {
    icon: '/illustration/mobile/register-intro-face.svg',
    title: 'สแกนใบหน้า',
    desc: 'ยืนยันตัวตนขั้นสูงด้วยเทคโนโลยีจดจำใบหน้า',
  },
  {
    icon: '/illustration/mobile/register-intro-shield.svg',
    title: 'ตั้งรหัสผ่าน',
    desc: 'สร้างรหัสผ่าน 6 หลักเพื่อเข้าใช้งานในครั้งต่อไป',
  },
];

const IntroHeroIllustration = () => {
  const [anim, setAnim] = useState(null);
  useEffect(() => {
    let alive = true;
    fetch(INTRO_HERO_LOTTIE)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive) setAnim(d); })
      .catch(() => { /* keep PNG fallback */ });
    return () => { alive = false; };
  }, []);

  if (anim) {
    return (
      <LottieIllustration
        animationData={anim}
        size={INTRO_ILLUS_SIZE}
        loop
      />
    );
  }
  return (
    <img
      src={INTRO_HERO_FALLBACK}
      alt=''
      aria-hidden
      width={INTRO_ILLUS_SIZE}
      height={INTRO_ILLUS_SIZE}
      style={{
        display: 'block',
        width: INTRO_ILLUS_SIZE,
        height: INTRO_ILLUS_SIZE,
        objectFit: 'contain',
      }}
    />
  );
};

const IntroStep = ({ onStart, onLogin }) => (
  <div
    className='flex flex-col flex-1 min-h-0'
    style={{ height: '100%', background: C.screen }}
  >
    {/* Figma Content 2042:27924 */}
    <div
      className='flex-1 min-h-0 overflow-y-auto'
      style={{ padding: 'var(--dim-space-400, 16px)' }}
    >
      {/* Steps Section 2042:27925 */}
      <div
        style={{
          width: '100%',
          background: C.card,
          borderRadius: 'var(--dim-radius-600, 24px)',
          boxShadow: 'var(--shadow-brand-drop-bottom-200)',
          paddingTop: 'var(--dim-space-600, 24px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {/* Header Text 2042:27926 */}
        <div
          className='flex flex-col items-center'
          style={{
            gap: 'var(--dim-space-150, 6px)',
            width: '100%',
            padding: '0 var(--dim-space-400, 16px)',
          }}
        >
          <div
            className='shrink-0'
            style={{
              width: INTRO_ILLUS_SIZE,
              height: INTRO_ILLUS_SIZE,
              overflow: 'hidden',
            }}
          >
            <IntroHeroIllustration />
          </div>
          <h1
            style={{
              margin: 0,
              width: '100%',
              fontFamily: 'var(--type-family-heading-graphic2, var(--type-family-body))',
              fontSize: 'var(--type-size-2xl, 24px)',
              fontWeight: 'var(--type-weight-regular, 400)',
              lineHeight: 1.375,
              color: C.brand,
              textAlign: 'center',
            }}
          >
            ลงทะเบียนเข้าใช้งาน
          </h1>
          <p
            style={{
              margin: 0,
              width: '100%',
              fontFamily: 'var(--type-family-heading-graphic2, var(--type-family-body))',
              fontSize: 'var(--type-size-base, 16px)',
              fontWeight: 'var(--type-weight-regular, 400)',
              lineHeight: 1.5,
              color: C.sub,
              textAlign: 'center',
            }}
          >
            เพียง 5 ขั้นตอน
          </p>
        </div>

        {/* Onboarding Steps — Archive 47:17960 · divider list, p-600, gap-400 */}
        <div
          className='flex flex-col'
          style={{
            gap: 'var(--dim-space-400, 16px)',
            width: '100%',
            padding: 'var(--dim-space-600, 24px)',
          }}
        >
          {INTRO_STEPS.map((s, i) => (
            <React.Fragment key={s.title}>
              {i > 0 ? (
                <div
                  aria-hidden
                  style={{
                    width: '100%',
                    height: 'var(--dim-stroke-100, 1px)',
                    background: C.border,
                    flexShrink: 0,
                  }}
                />
              ) : null}
              <div className='flex items-start' style={{ gap: 'var(--dim-space-400, 16px)', width: '100%' }}>
                <span
                  className='shrink-0'
                  style={{ width: 36, height: 36, overflow: 'hidden' }}
                >
                  <img
                    src={s.icon}
                    alt=''
                    aria-hidden
                    width={36}
                    height={36}
                    style={{ display: 'block', width: 36, height: 36 }}
                  />
                </span>
                <div className='flex flex-col flex-1 min-w-0' style={{ gap: 2 }}>
                  <span
                    style={{
                      fontFamily: 'var(--type-family-heading-graphic2, var(--type-family-body))',
                      fontSize: 'var(--type-size-base, 16px)',
                      fontWeight: 'var(--type-weight-regular, 400)',
                      lineHeight: 1.5,
                      color: C.ink,
                    }}
                  >
                    {s.title}
                  </span>
                  <span
                    style={{
                      fontFamily: 'var(--type-family-body)',
                      fontSize: 'var(--type-size-sm, 14px)',
                      fontWeight: 'var(--type-weight-regular, 400)',
                      lineHeight: 1.5,
                      color: C.muted,
                    }}
                  >
                    {s.desc}
                  </span>
                </div>
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>

    {/* Footer 2042:27936 */}
    <Footer>
      <div
        className='flex flex-col'
        style={{ gap: 'var(--dim-space-300, 12px)', width: '100%' }}
      >
        <BrandButton
          size='Large'
          buttonStyle='Fill'
          showLeadingIcon={false}
          tailingIcon='chevron_right'
          onClick={onStart}
        >
          เริ่มลงทะเบียน
        </BrandButton>
        <BrandButton
          size='Medium'
          buttonStyle='Ghost'
          showLeadingIcon={false}
          showTailingIcon={false}
          onClick={onLogin}
        >
          เคยลงทะเบียนแล้ว? เข้าสู่ระบบ
        </BrandButton>
      </div>
    </Footer>
  </div>
);

/* ─── Step 1 · National ID + phone — Archive Figma 44:10873 ─────────── */
const formatCid = (raw) => {
  const d = digits(raw).slice(0, 13);
  return [d.slice(0, 1), d.slice(1, 5), d.slice(5, 10), d.slice(10, 12), d.slice(12, 13)].filter(Boolean).join('-');
};
const formatPhone = (raw) => {
  const d = digits(raw).slice(0, 10);
  return [d.slice(0, 3), d.slice(3, 6), d.slice(6, 10)].filter(Boolean).join('-');
};

const CitizenIdStep = ({ cid, setCid, phone, setPhone, error, onNext }) => {
  const cidOk = digits(cid).length === 13;
  const phoneOk = digits(phone).length === 10;
  const canNext = cidOk && phoneOk;

  return (
    <div
      className='flex flex-col flex-1 min-h-0'
      style={{ height: '100%', background: C.screen }}
    >
      {/* Content 2042:27941 — Form Body fills remaining height (Figma size-full) */}
      <div
        className='flex flex-col flex-1 min-h-0'
        style={{
          padding: 'var(--dim-space-400, 16px) var(--dim-space-400, 16px) var(--dim-space-600, 24px)',
        }}
      >
        {/* Form Body 2042:27943 — white bg stretches full available screen */}
        <div
          className='flex flex-col flex-1 min-h-0 overflow-y-auto'
          style={{
            width: '100%',
            background: C.card,
            borderRadius: 'var(--dim-radius-600, 24px)',
            boxShadow: 'var(--shadow-brand-drop-top-100, 0 -1px 2px rgba(8,167,104,0.08))',
            padding: 'var(--dim-space-600, 24px)',
            gap: 'var(--dim-space-600, 24px)',
          }}
        >
          {/* Intro Block 2042:27944 */}
          <div
            className='flex flex-col items-center shrink-0'
            style={{ gap: 'var(--dim-space-150, 6px)', width: '100%' }}
          >
            <span
              className='shrink-0'
              style={{ width: 36, height: 36, overflow: 'hidden' }}
            >
              <img
                src='/illustration/mobile/register-cid-user.svg'
                alt=''
                aria-hidden
                width={36}
                height={36}
                style={{ display: 'block', width: 36, height: 36 }}
              />
            </span>
            <Title>ข้อมูลยืนยันตัวตน</Title>
            <p
              style={{
                margin: 0,
                width: '100%',
                fontFamily: 'var(--type-family-body)',
                fontSize: 'var(--type-size-sm, 14px)',
                fontWeight: 'var(--type-weight-regular, 400)',
                lineHeight: 1.5,
                color: C.muted,
                textAlign: 'center',
              }}
            >
              กรุณากรอกข้อมูลเพื่อใช้ในการตรวจสอบและรักษา
              <br />
              ความปลอดภัยของบัญชีท่าน
            </p>
          </div>

          {/* Input Group 2042:27949 */}
          <div
            className='flex flex-col shrink-0'
            style={{ gap: 'var(--dim-space-600, 24px)', width: '100%' }}
          >
            <MobileInputField
              size='lg'
              label='เลขประจำตัวประชาชน (13 หลัก)'
              required
              helperText='ข้อมูลนี้จะถูกเก็บรักษาอย่างปลอดภัยสูงสุด'
              error={error || undefined}
              placeholder='x-xxxx-xxxxx-xx-x'
              inputMode='numeric'
              autoComplete='off'
              value={cid}
              onChange={(e) => setCid(formatCid(e.target.value))}
            />
            <MobileInputField
              size='lg'
              label='เบอร์โทรศัพท์มือถือ'
              required
              helperText='ใช้สำหรับรับรหัส OTP ในขั้นตอนถัดไป'
              placeholder='0xx-xxx-xxxx'
              inputMode='tel'
              autoComplete='tel'
              value={phone}
              onChange={(e) => setPhone(formatPhone(e.target.value))}
            />
          </div>
        </div>
      </div>

      <Footer>
        <BrandButton
          size='Large'
          buttonStyle='Fill'
          showLeadingIcon={false}
          tailingIcon='chevron_right'
          disabled={!canNext}
          onClick={onNext}
        >
          ถัดไป
        </BrandButton>
      </Footer>
    </div>
  );
};

/* ─── Step 2 · OTP ─────────────────────────────────────────────────── */
const OTP_LEN = 6;

/* Batch reference shown under the destination so a caller to the help desk can
   quote it (Figma 2119:51192). Fixed in the mock — the real one comes from the
   send-OTP response. MobileResetPage uses the same literal. */
const OTP_REF = 'BMA7K';

/* Resend cooldown, seconds — Figma shows the timer mid-count at 0:46. */
const RESEND_SECS = 46;

/* Strip browser chrome from OTP cells (wrapper owns border). */
const OTP_CELL_STYLE_ID = 'mih-register-otp-cell-style';
if (typeof document !== 'undefined' && !document.getElementById(OTP_CELL_STYLE_ID)) {
  const style = document.createElement('style');
  style.id = OTP_CELL_STYLE_ID;
  /* Strip UA outline/appearance only — the focus RING (box-shadow) is our own
     design token (input/100), applied inline per focused cell, so it must NOT
     be forced to none here (Figma 5016:2050 State=Press). */
  style.textContent = `
.mih-register-otp-cell,
.mih-register-otp-cell:focus,
.mih-register-otp-cell:focus-visible {
  outline: none !important;
  -webkit-appearance: none !important;
  appearance: none !important;
}
`;
  document.head.appendChild(style);
}

/* Figma 2119:51191 masks with asterisks and keeps the last 4 digits. */
const maskPhone = (phone) => {
  const d = digits(phone);
  if (d.length < 4) return '***-***-****';
  return `***-***-${d.slice(-4)}`;
};

const OtpStep = ({
  phone,
  otp,
  setOtp,
  mode,
  attemptsLeft,
  cooldown,
  onVerify,
  onResend,
  onChangePhone,
}) => {
  const refs = useRef([]);
  const [secs, setSecs] = useState(RESEND_SECS);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  useEffect(() => {
    if (secs <= 0) return undefined;
    const id = setTimeout(() => setSecs((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [secs]);

  useEffect(() => {
    if (mode === 'locked') setSecs(0);
  }, [mode]);

  const setDigit = (i, v) => {
    const d = v.replace(/\D/g, '').slice(-1);
    const next = otp.split('');
    next[i] = d;
    const joined = next.join('').slice(0, OTP_LEN);
    setOtp(joined);
    if (d && refs.current[i + 1]) refs.current[i + 1].focus();
    /* Figma has no confirm CTA — once all 6 digits are in, auto-submit; a correct
       code advances to the next step (verifyOtp → go('face')). Pass `joined`
       explicitly: the setTimeout closes over THIS render's onVerify, whose parent
       `otp` is still the pre-6th-digit value — verifying that stale state would
       always read one digit short and reject a correct code. NB: the old
       `!joined.includes('')` guard was also dead — every string contains ''. */
    if (/^\d{6}$/.test(joined) && !isLocked) {
      window.setTimeout(() => onVerify(joined), 80);
    }
  };
  const onKey = (i, e) => {
    if (e.key === 'Backspace' && !otp[i] && refs.current[i - 1]) refs.current[i - 1].focus();
  };

  const isError = mode === 'wrong' || mode === 'expired';
  const isLocked = mode === 'locked';
  const title = isLocked
    ? 'ระงับการยืนยันชั่วคราว'
    : mode === 'expired'
      ? 'รหัส OTP หมดอายุ'
      : mode === 'wrong'
        ? 'รหัส OTP ไม่ถูกต้อง'
        : 'ยืนยันรหัส OTP';
  const subtitle = isLocked
    ? `กรอกผิดครบ ${OTP_MAX_ATTEMPTS} ครั้ง กรุณารอ ${cooldown} วินาที หรือติดต่อ Call Center 02-123-4567`
    : mode === 'expired'
      ? 'รหัสหมดอายุแล้ว กรุณาขอรหัสใหม่'
      : mode === 'wrong'
        ? `กรุณาตรวจสอบและกรอกอีกครั้ง (เหลือ ${attemptsLeft} ครั้ง)`
        : null;

  const canResend = secs <= 0 || isLocked;

  return (
    <div
      className='flex flex-col flex-1 min-h-0'
      style={{ height: '100%', background: C.screen }}
    >
      {/* Content 2119:51182 — px-400 · py-600 · gap-400; Steps live in StepBar */}
      <div
        className='flex flex-col flex-1 min-h-0'
        style={{
          padding: 'var(--dim-space-400, 16px) var(--dim-space-400, 16px) var(--dim-space-600, 24px)',
        }}
      >
        {/* Content Section 2119:51184 — flex-1 white card, radius-500 */}
        <div
          className='flex flex-col flex-1 min-h-0 overflow-y-auto items-center'
          style={{
            width: '100%',
            background: C.card,
            borderRadius: 'var(--dim-radius-500, 16px)',
            boxShadow: 'var(--shadow-brand-drop-bottom-100, 0 1px 2px rgba(8,167,104,0.08))',
            padding: 'var(--dim-space-600, 24px) 0',
            gap: 'var(--dim-space-600, 24px)',
          }}
        >
          {/* Intro Block 2119:51185 */}
          <div
            className='flex flex-col items-center shrink-0'
            style={{ gap: 'var(--dim-space-200, 8px)', width: '100%', padding: '0 var(--dim-space-600, 24px)' }}
          >
            <div
              className='flex flex-col items-center'
              style={{ gap: 'var(--dim-space-150, 6px)', width: '100%' }}
            >
              {!isLocked ? (
                <span className='shrink-0' style={{ width: 36, height: 36, overflow: 'hidden' }}>
                  <img
                    src='/illustration/mobile/register-otp-lock.svg'
                    alt=''
                    aria-hidden
                    width={36}
                    height={36}
                    style={{ display: 'block', width: 36, height: 36 }}
                  />
                </span>
              ) : null}
              <Title>{title}</Title>
              {subtitle ? (
                <p
                  style={{
                    margin: 0,
                    width: '100%',
                    fontFamily: 'var(--type-family-body)',
                    fontSize: 'var(--type-size-base, 16px)',
                    lineHeight: 1.5,
                    color: C.muted,
                    textAlign: 'center',
                  }}
                >
                  {subtitle}
                </p>
              ) : (
                <div
                  className='flex flex-col w-full'
                  style={{
                    textAlign: 'center',
                    fontSize: 'var(--type-size-base, 16px)',
                    lineHeight: 1.5,
                    fontFamily: 'var(--type-family-body)',
                  }}
                >
                  <span style={{ color: C.muted }}>กรุณากรอกรหัส 6 หลักที่เราได้ส่งไปยัง</span>
                  <span style={{ color: C.neutralInk, fontWeight: 'var(--type-weight-bold, 700)' }}>
                    {maskPhone(phone)}
                  </span>
                  <span style={{ color: C.muted }}>{` (อ้างอิง: ${OTP_REF})`}</span>
                </div>
              )}
            </div>
          </div>

          {/* OTP Group 2119:51193 */}
          <div
            className='flex flex-col items-center shrink-0'
            style={{ gap: 'var(--dim-space-600, 24px)', width: '100%', padding: '0 var(--dim-space-400, 16px)' }}
          >
            {!isLocked ? (
              <div
                className='flex items-center justify-center'
                style={{ gap: 'var(--dim-space-100, 4px)', width: '100%' }}
              >
                {Array.from({ length: OTP_LEN }).map((_, i) => {
                  /* State=Press (Figma 5016:2050): focused cell gets the 2px
                     border/input/hover edge + the input/100 ring. Error wins
                     over focus; filled/default share border/input/default. */
                  const isPress = focusedIndex === i && !isError;
                  return (
                  <input
                    key={i}
                    ref={(el) => { refs.current[i] = el; }}
                    inputMode='numeric'
                    maxLength={1}
                    value={otp[i] || ''}
                    onChange={(e) => setDigit(i, e.target.value)}
                    onKeyDown={(e) => onKey(i, e)}
                    onFocus={() => setFocusedIndex(i)}
                    onBlur={() => setFocusedIndex((cur) => (cur === i ? -1 : cur))}
                    aria-label={`OTP digit ${i + 1}`}
                    aria-invalid={isError || undefined}
                    className='mih-register-otp-cell'
                    style={{
                      boxSizing: 'border-box',
                      width: 'var(--dim-size-1000, 48px)',
                      height: 'var(--dim-size-1200, 56px)',
                      textAlign: 'center',
                      fontFamily: 'var(--type-family-body)',
                      fontSize: 'var(--type-size-2xl, 24px)',
                      fontWeight: 'var(--type-weight-bold, 700)',
                      lineHeight: 1.5,
                      color: isError ? C.danger : 'var(--text-input-typing, #4D5358)',
                      border: isError
                        ? 'var(--dim-stroke-100, 1px) solid var(--border-input-error, #DC2626)'
                        : isPress
                          ? 'var(--dim-stroke-200, 2px) solid var(--border-input-hover, #08A768)'
                          : 'var(--dim-stroke-100, 1px) solid var(--border-input-default, #E2E4E6)',
                      borderRadius: 'var(--dim-radius-200, 8px)',
                      outline: 'none',
                      /* input/100 effect: 0 0 0 4px @ primaryBorder/600 (15%). */
                      boxShadow: isPress
                        ? '0 0 0 var(--dim-stroke-400, 4px) var(--primaryBorder-600)'
                        : 'none',
                      background: isError
                        ? 'var(--surface-danger-quaternary, #FEF2F2)'
                        : 'var(--surface-input-default, #FFFFFF)',
                      padding: 'var(--dim-space-200, 8px) var(--dim-space-100, 4px)',
                      transition: 'border-color .15s ease, box-shadow .15s ease',
                    }}
                  />
                  );
                })}
              </div>
            ) : null}

            {/* Resend Group 2119:51195 */}
            <div
              className='flex flex-col items-center'
              style={{ gap: 'var(--dim-space-200, 8px)' }}
            >
              {/* Countdown Row · Figma 2119:51196 → MobileBadge md */}
              <MobileBadge size='md' tone='neutral' icon='schedule'>
                {secs > 0 && !isLocked
                  ? `ขอรหัสใหม่ได้ใน 0:${String(secs).padStart(2, '0')}`
                  : 'ไม่ได้รับรหัส?'}
              </MobileBadge>
              <BrandSubdueButton
                size='Large'
                buttonStyle='Outline'
                leadingIcon='refresh'
                showTailingIcon={false}
                disabled={!canResend}
                fullWidth={false}
                onClick={() => {
                  setSecs(RESEND_SECS);
                  onResend();
                }}
              >
                ส่งรหัสอีกครั้ง
              </BrandSubdueButton>
            </div>

            {/* Figma 2042:28017 → Neutral Button · Style=Ghost · Size=Large
                (node 47:14997) — text-only, no border/fill. */}
            <NeutralButton
              size='Large'
              buttonStyle='Ghost'
              showLeadingIcon={false}
              showTailingIcon={false}
              fullWidth={false}
              onClick={onChangePhone}
            >
              เปลี่ยนข้อมูลยืนยันตัวตน
            </NeutralButton>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─── Step 4 · ID Card capture — Figma 2042:28369 ────────────────────────
   Camera viewport with a card-frame guide + a tips list, and a single
   "เริ่มถ่ายภาพ" Brand Button (Fill/Large) in the footer. */
const ID_CARD_TIPS = [
  'ถ่ายในที่มีแสงสว่างเพียงพอ',
  'หลีกเลี่ยงแสงสะท้อนและเงาบนบัตร',
  'ให้เห็นข้อมูลบนบัตรครบถ้วนและชัดเจน',
  'ถือมือถือให้นิ่งจนกว่าจะถ่ายเสร็จ',
];

/* Framing guide — Archive Figma 228:25700 "Rectangle 3084"
   Dashed mint rect inside the 322×186 camera viewport.
   Figma geometry: 71×78 at (231, 88); stroke 1 · dash [4,4] · #E2F3EB @ 50%. */
const CARD_VIEW_W = 322;
const CARD_VIEW_H = 186;
const CARD_GUIDE_X = 231;
const CARD_GUIDE_Y = 88;
const CARD_GUIDE_W = 71;
const CARD_GUIDE_H = 78;

const IdCardStep = ({ cameraOn, onNext }) => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [status, setStatus] = useState('idle'); /* idle | live | denied | error */
  const [errorMsg, setErrorMsg] = useState('');

  /* Once the user taps "อนุญาต" in CameraPermissionPopup (`cameraOn` flips
     true) we open the device camera straight away — the rear/environment lens
     is best for capturing a document like the national-ID card. Every track is
     stopped on unmount so the OS camera indicator turns off and no hidden
     stream is left holding the camera. Mirrors CameraCapturePopup's pipeline. */
  useEffect(() => {
    if (!cameraOn) return undefined;
    let cancelled = false;
    setStatus('idle');
    setErrorMsg('');
    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('เบราว์เซอร์นี้ไม่รองรับการเข้าถึงกล้อง');
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: isMobileBrowser()
            ? { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }
            : { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setStatus('live');
      } catch (err) {
        if (cancelled) return;
        const name = err?.name || '';
        if (name === 'NotAllowedError' || name === 'SecurityError') {
          setStatus('denied');
          setErrorMsg('กรุณาอนุญาตให้เบราว์เซอร์เข้าถึงกล้อง');
        } else if (name === 'NotFoundError' || name === 'OverconstrainedError') {
          setStatus('error');
          setErrorMsg('ไม่พบกล้องที่ใช้งานได้');
        } else {
          setStatus('error');
          setErrorMsg(err?.message || 'ไม่สามารถเปิดกล้องได้');
        }
      }
    })();
    return () => {
      cancelled = true;
      const s = streamRef.current;
      if (s) { s.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, [cameraOn]);

  const isLive = cameraOn && status === 'live';

  /* Snapshot the live frame to a JPEG data URL so the confirm step can show
     the actual captured card, then advance. Falls back to null if not live. */
  const handleCapture = () => {
    const video = videoRef.current;
    let dataUrl = null;
    if (video && isLive && video.videoWidth) {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      }
    }
    onNext?.(dataUrl);
  };

  return (
    <>
      <div className='flex-1' style={{ padding: 'var(--dim-space-600, 24px) var(--dim-space-400, 16px)', background: C.screen }}>
        <div
          className='flex flex-col'
          style={{
            width: '100%',
            background: C.card,
            borderRadius: 'var(--dim-radius-600, 24px)',
            boxShadow: 'var(--shadow-brand-drop-bottom-100, 0 1px 2px rgba(8,167,104,0.08))',
            padding: 'var(--dim-space-600, 24px)',
            gap: 'var(--dim-space-400, 16px)',
          }}
        >
          {/* Live camera viewport with a dashed ID-card guide. The <video>
              fills behind the guide; before it goes live (or on deny/error)
              a status overlay explains what's happening. */}
          <div
            className='flex items-center justify-center'
            style={{
              position: 'relative',
              width: '100%',
              aspectRatio: '322 / 186',
              borderRadius: 'var(--dim-radius-500, 16px)',
              background: 'var(--d-bg, #111314)',
              overflow: 'hidden',
            }}
          >
            {cameraOn && (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  visibility: isLive ? 'visible' : 'hidden',
                }}
              />
            )}

            {/* ID-card guide — Figma 228:25700 · 71×78 @ (231,88) in 322×186 */}
            <svg
              aria-hidden
              viewBox={`0 0 ${CARD_VIEW_W} ${CARD_VIEW_H}`}
              preserveAspectRatio='xMidYMid meet'
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                zIndex: 1,
              }}
            >
              <rect
                x={CARD_GUIDE_X + 0.5}
                y={CARD_GUIDE_Y + 0.5}
                width={CARD_GUIDE_W - 1}
                height={CARD_GUIDE_H - 1}
                fill='none'
                stroke='var(--border-brandPrimary-quaternary, #E2F3EB)'
                strokeOpacity={0.5}
                strokeWidth={1}
                strokeDasharray='4 4'
              />
            </svg>

            {/* Status overlay before the feed is live */}
            {!isLive && (
              <div
                className='absolute inset-0 flex flex-col items-center justify-center text-center'
                style={{
                  gap: 'var(--dim-space-200, 8px)',
                  padding: 'var(--dim-space-400, 16px)',
                  color: 'var(--text-content-on-content, #FFFFFF)',
                  fontFamily: 'var(--type-family-body)',
                  fontSize: 'var(--type-size-sm, 14px)',
                  lineHeight: 1.5,
                }}
              >
                <Sym
                  name={status === 'denied' || status === 'error' ? 'no_photography' : 'photo_camera'}
                  size={24}
                  color='var(--text-content-on-content, #FFFFFF)'
                />
                {cameraOn && status === 'idle' && <span style={{ opacity: 0.85 }}>กำลังเปิดกล้อง…</span>}
                {cameraOn && (status === 'denied' || status === 'error') && (
                  <span style={{ opacity: 0.85 }}>{errorMsg}</span>
                )}
              </div>
            )}
          </div>

          <div className='flex flex-col items-center w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
            <p
              style={{
                margin: 0,
                width: '100%',
                textAlign: 'center',
                fontFamily: 'var(--type-family-heading-graphic2, var(--type-family-body))',
                fontSize: 'var(--type-size-xl, 20px)',
                lineHeight: 1.375,
                color: C.brand,
              }}
            >
              วางบัตรประชาชนให้อยู่ในกรอบ
            </p>
            <ul
              style={{
                margin: 0,
                paddingLeft: 'var(--dim-space-500, 20px)',
                width: '100%',
                listStyle: 'disc',
                color: C.sub,
                fontFamily: 'var(--type-family-body)',
                fontSize: 'var(--type-size-sm, 14px)',
                lineHeight: 1.5,
              }}
            >
              {ID_CARD_TIPS.map((t) => (<li key={t}>{t}</li>))}
            </ul>
          </div>
        </div>
      </div>
      <Footer>
        <BrandButton
          size='Large'
          buttonStyle='Fill'
          leadingIcon='photo_camera'
          showTailingIcon={false}
          fullWidth
          onClick={handleCapture}
        >
          เริ่มถ่ายภาพ
        </BrandButton>
      </Footer>
    </>
  );
};

/* ─── Step 4b · Confirm OCR-read details ─────────────────────────────────
   After the ID-card photo (เริ่มถ่ายภาพ) we surface what OCR pulled off the
   card so the user can verify / correct each field before continuing:
   capture → confirm → password. No step bar (sub-step of "ถ่ายบัตรประชาชน"). */
const ConfirmDetailsStep = ({ cid, photo, onNext }) => {
  /* Prefill with the OCR result (mock). ID number seeds from the number the
     user typed in step 1 so the flow stays consistent; the rest are the
     values read off the card. */
  const [idNo, setIdNo] = useState(digits(cid) || '1839900165072');
  const [issueDate, setIssueDate] = useState('2025-05-22');
  const [expiryDate, setExpiryDate] = useState('2033-06-25');
  const [firstName, setFirstName] = useState('นฤมล');
  const [lastName, setLastName] = useState('ลิ่มสืบเชื้อ');
  const [dob, setDob] = useState('1989-06-26');
  const [address, setAddress] = useState('123/271 ซ.พงษ์เวชอนุสรณ์ 2 แขวงพระโขนงใต้ เขตพระโขนง กรุงเทพมหานคร');

  const canNext = digits(idNo).length === 13 && firstName.trim() && lastName.trim();

  return (
    <div className='flex flex-col flex-1 min-h-0' style={{ height: '100%', background: C.screen }}>
      <div
        className='flex flex-col flex-1 min-h-0'
        style={{ padding: 'var(--dim-space-400, 16px) var(--dim-space-400, 16px) var(--dim-space-600, 24px)' }}
      >
        <div
          className='flex flex-col flex-1 min-h-0 overflow-y-auto'
          style={{
            width: '100%',
            background: C.card,
            borderRadius: 'var(--dim-radius-600, 24px)',
            boxShadow: 'var(--shadow-brand-drop-top-100, 0 -1px 2px rgba(8,167,104,0.08))',
            padding: 'var(--dim-space-600, 24px)',
            gap: 'var(--dim-space-600, 24px)',
          }}
        >
          {/* Intro */}
          <div className='flex flex-col items-center shrink-0' style={{ gap: 'var(--dim-space-150, 6px)', width: '100%' }}>
            <Title>ยืนยันข้อมูล</Title>
            <p
              style={{
                margin: 0,
                width: '100%',
                fontFamily: 'var(--type-family-body)',
                fontSize: 'var(--type-size-sm, 14px)',
                fontWeight: 'var(--type-weight-regular, 400)',
                lineHeight: 1.5,
                color: C.muted,
                textAlign: 'center',
              }}
            >
              กรุณาตรวจสอบให้ถูกต้องก่อนดำเนินการต่อ
            </p>
          </div>

          {/* Privacy assurance — DS Alert · Success (compact) · Figma 5156:2444.
              Light surface + 1px border, 24px radius, 16px outlined check-circle,
              single-line xs/medium text — all alert-success tokens. */}
          <div
            className='flex items-start shrink-0 w-full'
            style={{
              gap: 'var(--dim-space-300, 12px)',
              padding: 'var(--dim-space-400, 16px)',
              borderRadius: 'var(--dim-radius-600, 24px)',
              background: 'var(--surface-alert-success, #F4FBFA)',
              border: 'var(--dim-stroke-100, 1px) solid var(--border-alert-success, #D1F6EE)',
            }}
          >
            <span className='shrink-0 inline-flex' style={{ paddingTop: 'var(--dim-space-050, 2px)' }}>
              <Sym name='check_circle' size={16} color='var(--text-alert-success, #196C65)' />
            </span>
            <span
              style={{
                flex: 1,
                minWidth: 0,
                fontFamily: 'var(--type-family-body)',
                fontSize: 'var(--type-size-xs, 12px)',
                fontWeight: 'var(--type-weight-medium, 500)',
                lineHeight: 1.5,
                color: 'var(--text-alert-success, #196C65)',
              }}
            >
              ข้อมูลของคุณจะถูกใช้เพื่อยืนยันตัวตนเท่านั้น และจัดเก็บอย่างปลอดภัย
            </span>
          </div>

          {/* Captured ID-card photo (front only) */}
          <div className='flex flex-col shrink-0' style={{ gap: 'var(--dim-space-150, 6px)', width: '100%' }}>
            <div
              className='flex items-center justify-center w-full'
              style={{
                aspectRatio: '1.586 / 1',
                borderRadius: 'var(--dim-radius-400, 12px)',
                background: 'var(--surface-neutral-tertiary, #F4F5F5)',
                border: 'var(--dim-stroke-100, 1px) solid var(--border-input-default, #E2E4E6)',
                overflow: 'hidden',
              }}
            >
              {photo ? (
                <img src={photo} alt='บัตรประชาชนด้านหน้า' style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <Sym name='badge' size={28} color='var(--text-content-tertiary, #858C92)' />
              )}
            </div>
            <span
              style={{
                fontFamily: 'var(--type-family-body)',
                fontSize: 'var(--type-size-xs, 12px)',
                lineHeight: 1.5,
                color: C.muted,
                textAlign: 'center',
              }}
            >
              ด้านหน้า
            </span>
          </div>

          {/* OCR fields */}
          <div className='flex flex-col shrink-0' style={{ gap: 'var(--dim-space-600, 24px)', width: '100%' }}>
            <MobileInputField
              size='lg'
              label='เลขประจำตัวประชาชน'
              required
              inputMode='numeric'
              maxLength={13}
              value={idNo}
              onChange={(e) => setIdNo(digits(e.target.value).slice(0, 13))}
            />
            <MobileInputField
              size='lg'
              label='วันออกบัตร'
              required
              leadingIcon='calendar_month'
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
            />
            <MobileInputField
              size='lg'
              label='วันบัตรหมดอายุ'
              required
              leadingIcon='calendar_month'
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
            />
            <MobileInputField
              size='lg'
              label='ชื่อ (ภาษาไทย)'
              required
              helperText='ตรวจสอบชื่อให้ถูกต้อง โดยไม่รวมคำนำหน้า เช่น นาย นาง หรือ นางสาว'
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
            <MobileInputField
              size='lg'
              label='นามสกุล (ภาษาไทย)'
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
            <MobileInputField
              size='lg'
              label='วันเดือนปีเกิด'
              required
              leadingIcon='calendar_month'
              value={dob}
              onChange={(e) => setDob(e.target.value)}
            />

            {/* Address — multiline (chrome-stripped textarea per CLAUDE.md) */}
            <label className='flex flex-col items-start' style={{ gap: 'var(--dim-space-150, 6px)', width: '100%' }}>
              <span
                className='flex items-center'
                style={{
                  gap: 'var(--dim-space-050, 2px)',
                  fontFamily: 'var(--type-family-body)',
                  fontSize: 'var(--type-size-sm, 14px)',
                  lineHeight: 1.5,
                  color: 'var(--text-content-default, #111314)',
                }}
              >
                ที่อยู่ตามบัตร
                <span style={{ color: 'var(--text-input-require, #DC2626)', fontSize: 'var(--type-size-sm, 14px)' }}>*</span>
              </span>
              <span
                className='flex w-full'
                style={{
                  background: 'var(--surface-input-default, #FFFFFF)',
                  border: 'var(--dim-stroke-100, 1px) solid var(--border-input-default, #E2E4E6)',
                  borderRadius: 'var(--dim-radius-500, 16px)',
                  padding: 'var(--dim-space-300, 12px) var(--dim-space-400, 16px)',
                }}
              >
                <textarea
                  className='mih-mobile-inputfield-input'
                  value={address}
                  onChange={(e) => setAddress(e.target.value.slice(0, 100))}
                  maxLength={100}
                  rows={3}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    resize: 'none',
                    fontFamily: 'var(--type-family-body)',
                    fontSize: 'var(--type-size-base, 16px)',
                    lineHeight: 1.5,
                    color: 'var(--text-input-filled, #4D5358)',
                  }}
                />
              </span>
              <span
                className='w-full'
                style={{
                  textAlign: 'right',
                  fontFamily: 'var(--type-family-body)',
                  fontSize: 'var(--type-size-xs, 12px)',
                  lineHeight: 1.5,
                  color: C.muted,
                }}
              >
                {address.length}/100
              </span>
            </label>
          </div>
        </div>
      </div>

      <Footer>
        <BrandButton
          size='Large'
          buttonStyle='Fill'
          showLeadingIcon={false}
          tailingIcon='chevron_right'
          disabled={!canNext}
          onClick={onNext}
        >
          ยืนยันและดำเนินการต่อ
        </BrandButton>
      </Footer>
    </div>
  );
};

/* ─── Step 4 · Face capture ─────────────────────────────────────────── */
const FaceVerificationIllustration = () => {
  const [anim, setAnim] = useState(null);
  useEffect(() => {
    let alive = true;
    fetch(FACE_VERIFY_LOTTIE)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive) setAnim(d); })
      .catch(() => { /* leave empty if json is unavailable */ });
    return () => { alive = false; };
  }, []);

  if (!anim) {
    return (
      <div
        aria-hidden
        className='flex items-center justify-center'
        style={{
          width: FACE_VERIFY_ILLUS_WIDTH,
          height: FACE_VERIFY_ILLUS_HEIGHT,
          color: C.brand,
        }}
      >
        <Sym name='face' size={96} color={C.brand} />
      </div>
    );
  }

  return (
    <LottieIllustration
      animationData={anim}
      size={FACE_VERIFY_ILLUS_HEIGHT}
      loop
      style={{
        width: FACE_VERIFY_ILLUS_WIDTH,
        height: FACE_VERIFY_ILLUS_HEIGHT,
      }}
    />
  );
};

const FaceStep = ({ onThaiId, onFaceScan }) => {
  return (
    <>
      <div
        className='flex-1 flex flex-col'
        style={{ padding: 'var(--dim-space-600, 24px) var(--dim-space-400, 16px)', background: C.screen }}
      >
        <div
          className='flex flex-col items-center flex-1'
          style={{
            width: '100%',
            background: C.card,
            borderRadius: 'var(--dim-radius-500, 16px)',
            boxShadow: 'var(--shadow-brand-drop-bottom-100, 0 1px 2px rgba(8,167,104,0.08))',
            padding: 'var(--dim-space-600, 24px)',
            gap: 'var(--dim-space-600, 24px)',
          }}
        >
          <div
            className='shrink-0'
            style={{
              width: FACE_VERIFY_ILLUS_WIDTH,
              height: FACE_VERIFY_ILLUS_HEIGHT,
              overflow: 'hidden',
            }}
          >
            <FaceVerificationIllustration />
          </div>

          <div
            className='flex flex-col items-center w-full'
            style={{ gap: 'var(--dim-space-200, 8px)' }}
          >
            <Title>สแกนใบหน้า</Title>
            <p
              style={{
                margin: 0,
                width: '100%',
                fontFamily: 'var(--type-family-body)',
                fontSize: 'var(--type-size-base, 16px)',
                fontWeight: 'var(--type-weight-regular, 400)',
                lineHeight: 1.5,
                color: C.muted,
                textAlign: 'center',
              }}
            >
              เพื่อความปลอดภัยขั้นสูง โปรดยืนยันตัวตนผ่านแอป ThaID (แนะนำ)
              <br />
              หรือสแกนใบหน้าด้วยแอป
            </p>
          </div>

          <div className='flex flex-col items-center w-full' style={{ gap: 'var(--dim-space-400, 16px)' }}>
            <NeutralButton
              variant='outline'
              size='lg'
              type='button'
              onClick={onThaiId}
              style={{ justifyContent: 'center', gap: 'var(--dim-space-200, 8px)' }}
            >
              <img
                src={FACE_VERIFY_THAI_ID_LOGO}
                alt=''
                aria-hidden
                width={32}
                height={32}
                style={{
                  width: 32,
                  height: 32,
                  objectFit: 'cover',
                  borderRadius: 'var(--dim-radius-100, 4px)',
                  flexShrink: 0,
                }}
              />
              <span style={{ flex: 1, textAlign: 'left' }}>ดำเนินการต่อด้วย Thai ID</span>
            </NeutralButton>

            <BrandButton
              variant='outline'
              size='lg'
              type='button'
              leadingIcon='sensor_occupied'
              showTailingIcon={false}
              onClick={onFaceScan}
            >
              สแกนใบหน้าด้วยแอป
            </BrandButton>
          </div>
        </div>
      </div>
    </>
  );
};

/* ─── Step 3b · Navigate to Thai ID (Figma 171:69389 / 2042:28160) ───────
   "Opening ThaID" loading screen. Real flow deep-links out to ThaID and is
   handed back by the OS; here we intentionally PARK on this loading screen
   (no auto-navigation) — the only way forward/back is the header's back
   button. Uses the Figma "Insurance - recolored" illustration (171:69386). */
const THAI_ID_NAV_LOTTIE = '/illustration/mobile/insurance-recolored.json';

const ThaiIdNavigateStep = () => {
  const [anim, setAnim] = useState(null);
  useEffect(() => {
    let alive = true;
    fetch(THAI_ID_NAV_LOTTIE)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive) setAnim(d); })
      .catch(() => { /* fall back to the glyph */ });
    return () => { alive = false; };
  }, []);

  return (
    <div
      className='flex-1 flex flex-col'
      style={{ padding: 'var(--dim-space-600, 24px) var(--dim-space-400, 16px)', background: C.screen }}
    >
      <div
        className='flex flex-col items-center justify-center flex-1'
        style={{
          width: '100%',
          background: C.card,
          borderRadius: 'var(--dim-radius-500, 16px)',
          boxShadow: 'var(--shadow-brand-drop-bottom-100, 0 1px 2px rgba(8,167,104,0.08))',
          padding: 'var(--dim-space-600, 24px)',
          gap: 'var(--dim-space-600, 24px)',
        }}
      >
        <div className='shrink-0' style={{ width: 167, height: 160, overflow: 'hidden' }}>
          {anim ? (
            <LottieIllustration animationData={anim} size={160} loop style={{ width: 167, height: 160 }} />
          ) : (
            <div className='flex items-center justify-center' style={{ width: 167, height: 160, color: C.brand }}>
              <Sym name='verified_user' size={96} color={C.brand} />
            </div>
          )}
        </div>
        <div className='flex flex-col items-center w-full' style={{ gap: 'var(--dim-space-150, 6px)' }}>
          <Title>กำลังเปิดแอป ThaID</Title>
          <p
            style={{
              margin: 0,
              width: '100%',
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-base, 16px)',
              lineHeight: 1.5,
              color: C.muted,
              textAlign: 'center',
            }}
          >
            โปรดยืนยันตัวตนในแอป ThaID แล้วระบบจะพากลับมาที่นี่โดยอัตโนมัติ
          </p>
        </div>
      </div>
    </div>
  );
};

/* Camera permission popup lives in
   src/components/mobile/CameraPermissionPopup.jsx
   (Archive Figma 178:122748). */

/* ─── Step 5 · Face scan (สแกนใบหน้า) — Archive 173:76113 · 47:19902 ·
   173:77583 · 173:77034. Runs after the ID-card confirm:
   prep → capture → processing → success → password.
   Illustrations exported from Figma to /illustration/mobile/face-scan-*. */
const FACE_PREP_HERO = '/illustration/mobile/face-scan-smiley.png';
const FACE_PREP_TIPS = [
  { icon: '/illustration/mobile/face-scan-glasses.png', label: 'ถอดแว่น' },
  { icon: '/illustration/mobile/face-scan-cap.png',     label: 'ถอดหมวก' },
  { icon: '/illustration/mobile/face-scan-bg.png',      label: 'พื้นหลังว่าง' },
  { icon: '/illustration/mobile/face-scan-look.png',    label: 'มองตรงกล้อง' },
];

/* Prep — checklist before the scan (remove glasses/hat, clear bg, look at cam). */
const FaceScanPrepStep = ({ onNext }) => (
  <>
    <div className='flex-1' style={{ padding: 'var(--dim-space-600, 24px) var(--dim-space-400, 16px)', background: C.screen }}>
      <div
        className='flex flex-col'
        style={{
          width: '100%',
          background: C.card,
          borderRadius: 'var(--dim-radius-600, 24px)',
          boxShadow: 'var(--shadow-brand-drop-bottom-100, 0 1px 2px rgba(8,167,104,0.08))',
          padding: 'var(--dim-space-600, 24px)',
          gap: 'var(--dim-space-400, 16px)',
        }}
      >
        <div className='flex flex-col items-center w-full' style={{ gap: 'var(--dim-space-150, 6px)' }}>
          <img src={FACE_PREP_HERO} alt='' aria-hidden width={48} height={48} style={{ width: 48, height: 48, objectFit: 'contain', flexShrink: 0 }} />
          <p
            style={{
              margin: 0,
              width: '100%',
              textAlign: 'center',
              fontFamily: 'var(--type-family-heading-graphic2, var(--type-family-body))',
              fontSize: 'var(--type-size-2xl, 24px)',
              lineHeight: 1.375,
              color: C.brand,
            }}
          >
            เตรียมความพร้อมก่อน
            <br />
            สแกนใบหน้า
          </p>
          <p
            style={{
              margin: 0,
              width: '100%',
              textAlign: 'center',
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-sm, 14px)',
              lineHeight: 1.5,
              color: C.muted,
            }}
          >
            โปรดปฏิบัติตามขั้นตอนเหล่านี้ เพื่อให้การยืนยันตัวตนถูกต้องในครั้งเดียว
          </p>
        </div>

        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
          {FACE_PREP_TIPS.map((t, i) => (
            <React.Fragment key={t.label}>
              {i > 0 && (
                <div aria-hidden style={{ width: '100%', height: 'var(--dim-stroke-100, 1px)', background: 'var(--border-neutral-quaternary, #F4F5F5)' }} />
              )}
              <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-400, 16px)' }}>
                <img src={t.icon} alt='' aria-hidden width={48} height={48} style={{ width: 48, height: 48, objectFit: 'contain', flexShrink: 0 }} />
                <span
                  style={{
                    fontFamily: 'var(--type-family-heading-graphic2, var(--type-family-body))',
                    fontSize: 'var(--type-size-base, 16px)',
                    lineHeight: 1.5,
                    color: 'var(--text-content-default, #111314)',
                  }}
                >
                  {t.label}
                </span>
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
    <Footer>
      <BrandButton size='Large' buttonStyle='Fill' showLeadingIcon={false} tailingIcon='chevron_right' fullWidth onClick={onNext}>
        ถัดไป
      </BrandButton>
    </Footer>
  </>
);

/* Capture — live front camera with Figma Face scan dashed guide (173:74935).
   Camera permission was already granted on the ID-card step, so this opens
   the user-facing lens directly. Guide = Union of brand-soft segments, not
   stroke-dasharray. */
const FaceScanCaptureStep = ({ onNext }) => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [status, setStatus] = useState('idle'); /* idle | live | denied | error */
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('เบราว์เซอร์นี้ไม่รองรับการเข้าถึงกล้อง');
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'user' }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setStatus('live');
      } catch (err) {
        if (cancelled) return;
        const name = err?.name || '';
        if (name === 'NotAllowedError' || name === 'SecurityError') {
          setStatus('denied');
          setErrorMsg('กรุณาอนุญาตให้เบราว์เซอร์เข้าถึงกล้อง');
        } else if (name === 'NotFoundError' || name === 'OverconstrainedError') {
          setStatus('error');
          setErrorMsg('ไม่พบกล้องที่ใช้งานได้');
        } else {
          setStatus('error');
          setErrorMsg(err?.message || 'ไม่สามารถเปิดกล้องได้');
        }
      }
    })();
    return () => {
      cancelled = true;
      const s = streamRef.current;
      if (s) { s.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, []);

  const isLive = status === 'live';

  return (
    <>
      <div className='flex-1' style={{ padding: 'var(--dim-space-600, 24px) var(--dim-space-400, 16px)', background: C.screen }}>
        <div
          className='flex flex-col'
          style={{
            width: '100%',
            background: C.card,
            borderRadius: 'var(--dim-radius-600, 24px)',
            boxShadow: 'var(--shadow-brand-drop-bottom-100, 0 1px 2px rgba(8,167,104,0.08))',
            padding: 'var(--dim-space-600, 24px)',
            gap: 'var(--dim-space-400, 16px)',
          }}
        >
          <div
            className='flex items-center justify-center'
            style={{
              position: 'relative',
              width: '100%',
              aspectRatio: '322 / 439',
              borderRadius: 'var(--dim-radius-400, 16px)',
              background: 'var(--d-bg, #111314)',
              overflow: 'hidden',
            }}
          >
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transform: 'scaleX(-1)',
                visibility: isLive ? 'visible' : 'hidden',
              }}
            />
            {/* Face scan dashed guide — Archive Figma 173:74935
                Union of #E2F3EB @ 0.3 segments (not stroke-dasharray) */}
            <img
              src='/illustration/mobile/face-scan-guide.svg'
              alt=''
              aria-hidden
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'fill',
                pointerEvents: 'none',
                zIndex: 1,
              }}
            />
            {!isLive && (
              <div
                className='absolute inset-0 flex flex-col items-center justify-center text-center'
                style={{
                  gap: 'var(--dim-space-200, 8px)',
                  padding: 'var(--dim-space-400, 16px)',
                  color: 'var(--text-content-on-content, #FFFFFF)',
                  fontFamily: 'var(--type-family-body)',
                  fontSize: 'var(--type-size-sm, 14px)',
                  lineHeight: 1.5,
                  zIndex: 2,
                }}
              >
                <Sym name={status === 'denied' || status === 'error' ? 'no_photography' : 'photo_camera'} size={24} color='var(--text-content-on-content, #FFFFFF)' />
                {status === 'idle' && <span style={{ opacity: 0.85 }}>กำลังเปิดกล้อง…</span>}
                {(status === 'denied' || status === 'error') && <span style={{ opacity: 0.85 }}>{errorMsg}</span>}
              </div>
            )}
          </div>

          <p
            style={{
              margin: 0,
              width: '100%',
              textAlign: 'center',
              fontFamily: 'var(--type-family-heading-graphic2, var(--type-family-body))',
              fontSize: 'var(--type-size-xl, 20px)',
              lineHeight: 1.375,
              color: C.brand,
            }}
          >
            วางใบหน้าให้อยู่ในกรอบ
          </p>
        </div>
      </div>
      <Footer>
        <BrandButton size='Large' buttonStyle='Fill' leadingIcon='photo_camera' showTailingIcon={false} fullWidth onClick={onNext}>
          เริ่มถ่ายภาพ
        </BrandButton>
      </Footer>
    </>
  );
};

/* Processing — reuses the face-match Lottie; auto-advances to success. */
const FaceProcessingStep = ({ onDone }) => {
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  useEffect(() => {
    const id = setTimeout(() => doneRef.current(), 2600);
    return () => clearTimeout(id);
  }, []);

  return (
    <div className='flex-1 flex flex-col' style={{ padding: 'var(--dim-space-600, 24px) var(--dim-space-400, 16px)', background: C.screen }}>
      <div
        className='flex flex-col items-center justify-center flex-1'
        style={{
          width: '100%',
          background: C.card,
          borderRadius: 'var(--dim-radius-500, 16px)',
          boxShadow: 'var(--shadow-brand-drop-bottom-100, 0 1px 2px rgba(8,167,104,0.08))',
          padding: 'var(--dim-space-600, 24px)',
          gap: 'var(--dim-space-400, 16px)',
        }}
      >
        <div className='shrink-0' style={{ width: FACE_VERIFY_ILLUS_WIDTH, height: FACE_VERIFY_ILLUS_HEIGHT, overflow: 'hidden' }}>
          <FaceVerificationIllustration />
        </div>
        <div className='flex flex-col items-center w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          <p
            style={{
              margin: 0,
              width: '100%',
              textAlign: 'center',
              fontFamily: 'var(--type-family-heading-graphic2, var(--type-family-body))',
              fontSize: 'var(--type-size-xl, 20px)',
              lineHeight: 1.375,
              color: C.brand,
            }}
          >
            กำลังประมวลผลการยืนยันตัวตน
          </p>
          <p
            style={{
              margin: 0,
              width: '100%',
              textAlign: 'center',
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-sm, 14px)',
              lineHeight: 1.5,
              color: C.muted,
            }}
          >
            โปรดรอสักครู่ ระบบกำลังเปรียบเทียบใบหน้ากับฐานข้อมูล
          </p>
        </div>
      </div>
    </div>
  );
};

/* Success — Archive Figma 178:122765 via shared SuccessCard template */
const FACE_SUCCESS_DEMO_NAME = 'นายสมชาย มั่นใจดี';

const FaceSuccessStep = ({ cid, fullName, onNext }) => (
  <SuccessCard
    heroLottie='/illustration/mobile/best-employee-award-recolored.json'
    title='ยืนยันตัวตนสำเร็จ'
    rows={[
      { label: 'ชื่อ–สกุล', value: fullName || FACE_SUCCESS_DEMO_NAME },
      { label: 'เลขประจำตัวประชาชน', value: formatCid(cid) || '1-1678-89302-23-5' },
    ]}
    primaryAction={{
      label: 'ดำเนินการต่อ',
      onClick: onNext,
      showTailingIcon: true,
      tailingIcon: 'chevron_right',
    }}
  />
);

/* ─── Step 5 · Set password (Figma: ≥10 chars, case, digit) ─────────── */
const PW_RULES = [
  { key: 'len', label: 'ความยาวอย่างน้อย 10 ตัวอักษร', test: (p) => p.length >= 10 },
  { key: 'case', label: 'มีทั้งตัวอักษรพิมพ์ใหญ่และพิมพ์เล็ก (A-Z, a-z)', test: (p) => /[a-z]/.test(p) && /[A-Z]/.test(p) },
  { key: 'num', label: 'มีตัวเลขอย่างน้อย 1 ตัว (0-9)', test: (p) => /\d/.test(p) },
];

const PasswordStep = ({ pw, setPw, confirm, setConfirm, onDone }) => {
  const rules = PW_RULES.map((r) => ({ ...r, ok: r.test(pw) }));
  const strength = rules.filter((r) => r.ok).length;
  const allOk = rules.every((r) => r.ok);
  const matchOk = confirm.length > 0 && confirm === pw;

  return (
    <>
      <div className='flex-1' style={{ padding: 'var(--dim-space-600, 24px) var(--dim-space-400, 16px)', background: C.screen }}>
        <FormCard>
          <Title>สร้างรหัสผ่านของคุณ</Title>
          <div className='flex flex-col' style={{ gap: 'var(--dim-space-600, 24px)', marginTop: 'var(--dim-space-600, 24px)' }}>
            <Password
              label='รหัสผ่านใหม่'
              required
              placeholder='กรอกรหัสผ่าน'
              value={pw}
              autoComplete='new-password'
              onChange={(e) => setPw(e.target.value)}
            />

            <div
              style={{
                background: C.brandSoft,
                border: `var(--dim-stroke-100) solid ${C.border}`,
                borderRadius: 'var(--dim-radius-500, 16px)',
                padding: 'var(--dim-space-400, 16px)',
              }}
            >
              <span style={{ fontFamily: 'var(--type-family-heading-graphic2)', fontSize: 'var(--type-size-sm, 14px)', color: C.ink }}>
                ความปลอดภัยของรหัสผ่าน
              </span>
              {/* Strength meter — 3 segments (Figma 58:21890), 1:1 with the rules */}
              <div className='flex' style={{ gap: 'var(--dim-space-200, 8px)', margin: 'var(--dim-space-300, 12px) 0' }}>
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    style={{
                      flex: 1,
                      height: 6,
                      borderRadius: 3,
                      background: i < strength ? C.brand : C.brandTertiary,
                    }}
                  />
                ))}
              </div>
              <div className='flex flex-col' style={{ gap: 'var(--dim-space-150, 6px)' }}>
                {rules.map((r) => (
                  <div key={r.key} className='flex items-center' style={{ gap: 'var(--dim-space-300, 12px)', fontSize: 'var(--type-size-sm, 14px)', color: r.ok ? C.brand : C.muted }}>
                    <Sym name={r.ok ? 'check_circle' : 'radio_button_unchecked'} size={14} color={r.ok ? C.brand : C.muted} />
                    {r.label}
                  </div>
                ))}
              </div>
            </div>

            <Password
              label='ยืนยันรหัสผ่านใหม่'
              required
              placeholder='กรอกรหัสผ่านอีกครั้ง'
              value={confirm}
              autoComplete='new-password'
              error={confirm.length > 0 && !matchOk ? 'รหัสผ่านไม่ตรงกัน' : undefined}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
        </FormCard>
      </div>
      <Footer>
        <MobileButton variant='primary' disabled={!allOk || !matchOk} onClick={onDone}>
          เสร็จสิ้นการตั้งรหัสผ่าน
        </MobileButton>
      </Footer>
    </>
  );
};

/* ─── Set PIN — Archive Figma 314:43232 "Register: Set PIN" ───────────
   Teal gradient full-bleed · Mobile security 112 · white copy · 6 dots ·
   KeypadButton 72 / primary-400 ring · Brand Subdue Outline «ข้ามไปก่อน». */
const PIN_LEN = 6;
const PIN_BG = 'linear-gradient(155.3deg, rgb(19, 178, 146) 0%, rgb(0, 163, 166) 100%)';
const PIN_HERO_LOTTIE = '/illustration/mobile/mobile-security-recolored.json';
const PIN_HERO_FALLBACK = '/illustration/mobile/welcome-4-mobile-security.png';
const PIN_HERO_SIZE = 112;

const PinStep = ({ pin, setPin, confirm, setConfirm, phase, onConfirm, onMismatch, onSkip }) => {
  const value = phase === 'confirm' ? confirm : pin;
  const setValue = phase === 'confirm' ? setConfirm : setPin;
  const [heroAnim, setHeroAnim] = useState(null);

  useEffect(() => {
    let alive = true;
    fetch(PIN_HERO_LOTTIE)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive) setHeroAnim(d); })
      .catch(() => { /* PNG fallback */ });
    return () => { alive = false; };
  }, []);

  const press = (n) => {
    if (value.length >= PIN_LEN) return;
    const next = value + n;
    setValue(next);
    if (next.length === PIN_LEN) {
      if (phase === 'create') {
        window.setTimeout(() => onConfirm('confirm'), 120);
      } else if (next !== pin) {
        onMismatch();
      } else {
        onConfirm('done');
      }
    }
  };

  const backspace = () => setValue(value.slice(0, -1));

  const title = phase === 'confirm' ? 'ยืนยันรหัส PIN' : 'ตั้งรหัส PIN';
  const subtitle = phase === 'confirm'
    ? 'กรอกรหัส PIN อีกครั้งเพื่อยืนยัน'
    : (
      <>
        หลีกเลี่ยงเลขเรียงหรือเลขซ้ำ
        <br />
        เช่น 123456 หรือ 111111
      </>
    );

  /* Spacing from Archive 314:43232 / Frame 314:42268:
     px 32 · py ≈12 · section gap 32 · hero→copy 12 · title→sub 6 ·
     dots 16 @ track 186 · keypad row gap 12 · key gap 24. */
  return (
    <div
      className='flex flex-col items-center w-full'
      style={{
        flex: 1,
        minHeight: '100%',
        boxSizing: 'border-box',
        background: PIN_BG,
        paddingTop: 'var(--dim-space-300, 12px)',
        paddingBottom: 'var(--dim-space-600, 24px)',
        paddingLeft: 'var(--dim-space-800, 32px)',
        paddingRight: 'var(--dim-space-800, 32px)',
        gap: 'var(--dim-space-800, 32px)',
      }}
    >
      {/* Frame 3 — hero + intro · gap-300 */}
      <div
        className='flex flex-col items-center w-full shrink-0'
        style={{ gap: 'var(--dim-space-300, 12px)' }}
      >
        <span className='overflow-hidden shrink-0' style={{ width: PIN_HERO_SIZE, height: PIN_HERO_SIZE }}>
          {heroAnim ? (
            <LottieIllustration
              animationData={heroAnim}
              size={PIN_HERO_SIZE}
              loop
              ariaLabel=''
            />
          ) : (
            <img
              src={PIN_HERO_FALLBACK}
              alt=''
              width={PIN_HERO_SIZE}
              height={PIN_HERO_SIZE}
              style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
            />
          )}
        </span>

        <div
          className='flex flex-col items-center w-full'
          style={{ gap: 'var(--dim-space-150, 6px)' }}
        >
          <h1
            style={{
              margin: 0,
              width: '100%',
              textAlign: 'center',
              fontFamily: 'var(--type-family-heading-graphic2)',
              fontSize: 'var(--type-size-2xl, 24px)',
              fontWeight: 'var(--type-weight-regular, 400)',
              lineHeight: 1.375,
              color: 'var(--text-content-on-content, #FFFFFF)',
            }}
          >
            {title}
          </h1>
          <p
            style={{
              margin: 0,
              width: '100%',
              textAlign: 'center',
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-base, 16px)',
              fontWeight: 'var(--type-weight-regular, 400)',
              lineHeight: 1.5,
              color: 'var(--text-content-on-content, #FFFFFF)',
            }}
          >
            {subtitle}
          </p>
        </div>
      </div>

      {/* PIN dots — Figma 314:43235 · 6×16 · track 186 · gap 18 via space-between */}
      <div
        className='flex items-center shrink-0'
        style={{
          width: 186,
          height: 'var(--dim-size-300, 16px)',
          justifyContent: 'space-between',
        }}
        aria-label={`กรอกแล้ว ${value.length} จาก ${PIN_LEN} หลัก`}
      >
        {Array.from({ length: PIN_LEN }).map((_, i) => (
          <span
            key={i}
            style={{
              width: 'var(--dim-size-300, 16px)',
              height: 'var(--dim-size-300, 16px)',
              borderRadius: 'var(--dim-radius-full, 9999px)',
              boxSizing: 'border-box',
              background: i < value.length
                ? 'var(--text-content-on-content, #FFFFFF)'
                : 'transparent',
              border: 'var(--dim-stroke-200, 2px) solid var(--text-content-on-content, #FFFFFF)',
            }}
          />
        ))}
      </div>

      {/* Keypad — 264 wide · row gap-300 · key gap-600 */}
      <div
        className='flex flex-col shrink-0'
        style={{ gap: 'var(--dim-space-300, 12px)', width: 264 }}
      >
        {[
          ['1', '2', '3'],
          ['4', '5', '6'],
          ['7', '8', '9'],
          ['', '0', 'del'],
        ].map((row) => (
          <div
            key={row.join('-')}
            className='flex items-center'
            style={{ gap: 'var(--dim-space-600, 24px)' }}
          >
            {row.map((k) => {
              if (k === '') {
                return (
                  <span
                    key='empty'
                    aria-hidden
                    style={{
                      width: 'var(--dim-size-1600, 72px)',
                      height: 'var(--dim-size-1600, 72px)',
                      opacity: 0,
                    }}
                  />
                );
              }
              if (k === 'del') {
                return (
                  <KeypadButton
                    key='del'
                    type='icon'
                    icon='backspace'
                    onClick={backspace}
                    aria-label='ลบ'
                  />
                );
              }
              return (
                <KeypadButton
                  key={k}
                  type='Number'
                  digit={k}
                  onClick={() => press(k)}
                />
              );
            })}
          </div>
        ))}
      </div>

      {/* Skip — hug 128×56 (Figma 314:43838) · 32px above from section gap */}
      {phase === 'create' && onSkip ? (
        <BrandSubdueButton
          size='Large'
          buttonStyle='Outline'
          showLeadingIcon={false}
          showTailingIcon={false}
          fullWidth={false}
          onClick={onSkip}
          style={{
            background: 'transparent',
            border: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimaryButton-tertiary, #C5EDDA)',
            color: 'var(--text-content-on-content, #FFFFFF)',
            width: 'auto',
            minWidth: 'var(--dim-size-1700, 80px)',
            maxWidth: 'var(--dim-size-2600, 384px)',
            flexShrink: 0,
          }}
        >
          ข้ามไปก่อน
        </BrandSubdueButton>
      ) : null}
    </div>
  );
};

/* ─── Biometric opt-in (when device previously set biometric) ───────── */
const BiometricStep = ({ kind, onEnable, onSkip }) => (
  <div className='flex flex-col' style={{ minHeight: '100%', background: C.screen }}>
    <div className='flex-1 flex flex-col items-center justify-center' style={{ padding: 'var(--dim-space-600, 24px)' }}>
      <FormCard>
        <div className='flex flex-col items-center' style={{ gap: 'var(--dim-space-400, 16px)' }}>
          <span
            className='inline-flex items-center justify-center'
            style={{ width: 88, height: 88, borderRadius: 'var(--dim-radius-full)', background: C.brandSoft, color: C.brand }}
          >
            <Sym name={kind === 'face' ? 'face' : 'fingerprint'} size={48} />
          </span>
          <Title>{kind === 'face' ? 'เปิดใช้ Face ID' : 'เปิดใช้ลายนิ้วมือ'}</Title>
          <Subtitle>
            เครื่องนี้เคยตั้งค่า biometric ไว้แล้ว — เปิดใช้เพื่อเข้าสู่ระบบเร็วขึ้นโดยไม่ต้องพิมพ์รหัสผ่านทุกครั้ง
          </Subtitle>
        </div>
      </FormCard>
    </div>
    <Footer>
      <MobileButton variant='primary' onClick={onEnable}>
        {kind === 'face' ? 'เปิดใช้ Face ID' : 'เปิดใช้ลายนิ้วมือ'}
      </MobileButton>
      <div style={{ marginTop: 'var(--dim-space-300, 12px)' }}>
        <MobileButton variant='secondary' onClick={onSkip}>
          ข้ามไปก่อน
        </MobileButton>
      </div>
    </Footer>
  </div>
);

/* ─── Done — Archive Figma 171:70337 via SuccessCard ─────────────────── */
const DoneStep = ({ onEnter }) => (
  <SuccessCard
    heroLottie='/illustration/mobile/best-employee-award-recolored.json'
    title='ลงทะเบียนสำเร็จ'
    description='ยินดีต้อนรับเข้าสู่แอปพลิเคชัน PHCIS ข้อมูลของคุณถูกบันทึกเข้าระบบเรียบร้อยแล้ว'
    primaryAction={{
      label: 'เข้าสู่ระบบ',
      onClick: onEnter,
      showTailingIcon: true,
      tailingIcon: 'chevron_right',
    }}
  />
);

const NetworkErrorStep = ({ onRetry, onLater }) => (
  <div className='flex flex-col' style={{ minHeight: '100%', background: C.screen }}>
    <div className='flex-1 flex flex-col items-center justify-center' style={{ padding: 'var(--dim-space-600, 24px)' }}>
      <FormCard>
        <div className='flex flex-col items-center' style={{ gap: 'var(--dim-space-300, 12px)' }}>
          <Sym name='wifi_off' size={64} color={C.danger} />
          <Title>เน็ตหลุดตอนบันทึก</Title>
          <Subtitle>ไม่มีสัญญาณ — ข้อมูลที่กรอกไว้ยังอยู่ โปรดเชื่อมต่ออินเทอร์เน็ตแล้วลองอีกครั้ง</Subtitle>
        </div>
      </FormCard>
    </div>
    <Footer>
      <MobileButton variant='primary' icon='refresh' onClick={onRetry}>ลองอีกครั้ง</MobileButton>
      <div style={{ marginTop: 'var(--dim-space-300, 12px)' }}>
        <MobileButton variant='secondary' onClick={onLater}>
          บันทึกไว้ทำต่อภายหลัง
        </MobileButton>
      </div>
    </Footer>
  </div>
);

/* ─── FakeQR — deterministic 21×21 pseudo-QR ─────────────────────────── */
export const FakeQR = ({ seed = 'PHCIS', size = 160, framed = false }) => {
  /* Deterministic QR-style matrix: version-4 density, quiet zone, finder
     separators, timing tracks, alignment target and format bands. The seed
     keeps each patient/appointment visually unique without random flicker. */
  const cells = 33;
  const quietZone = 4;
  const viewSize = cells + (quietZone * 2);
  const grid = Array.from({ length: cells }, () => Array(cells).fill(false));
  const reserved = Array.from({ length: cells }, () => Array(cells).fill(false));
  let h = 2166136261;
  const eat = (n) => { h ^= n; h = Math.imul(h, 16777619) >>> 0; };
  for (let i = 0; i < seed.length; i += 1) eat(seed.charCodeAt(i));

  const setModule = (row, column, on) => {
    if (row < 0 || column < 0 || row >= cells || column >= cells) return;
    grid[row][column] = on;
    reserved[row][column] = true;
  };

  const finder = (rr, cc) => {
    for (let r = -1; r <= 7; r += 1) {
      for (let c = -1; c <= 7; c += 1) {
        const inside = r >= 0 && r <= 6 && c >= 0 && c <= 6;
        const onEdge = inside && (r === 0 || r === 6 || c === 0 || c === 6);
        const innerSquare = inside && r >= 2 && r <= 4 && c >= 2 && c <= 4;
        setModule(rr + r, cc + c, onEdge || innerSquare);
      }
    }
  };
  finder(0, 0); finder(0, cells - 7); finder(cells - 7, 0);

  for (let i = 8; i < cells - 8; i += 1) {
    setModule(6, i, i % 2 === 0);
    setModule(i, 6, i % 2 === 0);
  }

  for (let r = -2; r <= 2; r += 1) {
    for (let c = -2; c <= 2; c += 1) {
      const edge = Math.abs(r) === 2 || Math.abs(c) === 2;
      const centre = r === 0 && c === 0;
      setModule(26 + r, 26 + c, edge || centre);
    }
  }

  const formatCells = [
    [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 7], [8, 8],
    [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8],
    [8, cells - 1], [8, cells - 2], [8, cells - 3], [8, cells - 4],
    [cells - 1, 8], [cells - 2, 8], [cells - 3, 8], [cells - 4, 8],
  ];
  formatCells.forEach(([r, c], index) => {
    eat(index + 9000);
    setModule(r, c, (h & 1) === 1);
  });
  setModule(cells - 8, 8, true);

  for (let r = 0; r < cells; r += 1) {
    for (let c = 0; c < cells; c += 1) {
      if (reserved[r][c]) continue;
      eat((r * cells) + c);
      grid[r][c] = ((h >>> ((r + c) % 12)) & 1) === 1;
    }
  }

  const qr = (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${viewSize} ${viewSize}`}
      aria-label='QR Code'
      role='img'
      style={{ display: 'block', shapeRendering: 'crispEdges' }}
    >
      <rect width={viewSize} height={viewSize} fill='var(--surface-card-100, #FFFFFF)' />
      {grid.map((row, r) => row.map((on, c) => (on ? (
        <rect
          key={`${r}-${c}`}
          x={c + quietZone}
          y={r + quietZone}
          width='1'
          height='1'
          fill='var(--text-content-default, #363B3F)'
        />
      ) : null)))}
    </svg>
  );

  if (!framed) return qr;
  return (
    <span
      style={{
        display: 'inline-flex',
        border: 'var(--dim-stroke-800, 8px) solid var(--border-image-default, #FFFFFF)',
        background: 'var(--surface-card-100, #FFFFFF)',
        boxShadow: 'var(--shadow-drop-bottom-200)',
      }}
    >
      {qr}
    </span>
  );
};

/* Simulate device biometric capability (artboard note: ถ้าในเครื่องเคย set biometric). */
const deviceHadBiometric = () => {
  try {
    return localStorage.getItem('phcis_mobile_had_biometric_v1') === '1'
      || (typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches);
  } catch {
    return true;
  }
};

/* ─── Wizard shell ──────────────────────────────────────────────────── */
export default function MobileRegisterPage() {
  const history = useHistory();
  const { signIn } = useMobileApp();

  const [step, setStep] = useState('welcome');
  const [welcomeIdx, setWelcomeIdx] = useState(0);
  const [cid, setCid] = useState('');
  const [phone, setPhone] = useState('');
  const [cidError, setCidError] = useState('');
  const [otp, setOtp] = useState('');
  const [otpMode, setOtpMode] = useState('idle'); // idle | wrong | expired | locked
  const [otpAttempts, setOtpAttempts] = useState(0);
  const [otpCooldown, setOtpCooldown] = useState(0);
  /* The OTP we "texted" this session — generated per send, shown via SmsPush,
     and the only value verifyOtp accepts. `null` = no push on screen. */
  const [sentOtp, setSentOtp] = useState('');
  const [smsPush, setSmsPush] = useState(null);
  /* Camera-permission prompt shown over the ID-card capture step (step 4/5,
     2042:28441). Granting it flips `idCardCameraOn` so IdCardStep opens the
     device camera immediately. */
  const [cameraPopup, setCameraPopup] = useState(false);
  const [idCardCameraOn, setIdCardCameraOn] = useState(false);
  const [idCardPhoto, setIdCardPhoto] = useState(null);
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [pin, setPin] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [pinPhase, setPinPhase] = useState('create'); // create | confirm

  useEffect(() => {
    if (otpMode !== 'locked' || otpCooldown <= 0) return undefined;
    const id = setTimeout(() => setOtpCooldown((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [otpMode, otpCooldown]);

  useEffect(() => {
    if (otpMode === 'locked' && otpCooldown <= 0) {
      setOtpMode('idle');
      setOtpAttempts(0);
    }
  }, [otpMode, otpCooldown]);

  const go = (s) => setStep(s);

  /* Simulate the SMS gateway: mint a fresh 6-digit code, remember it for
     verification, and surface it as a push so the tester can read + type it. */
  const sendOtp = () => {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    setSentOtp(code);
    setSmsPush({ code, reference: OTP_REF });
  };

  const back = () => {
    const order = [
      'welcome', 'terms', 'policy', 'intro',
      'citizenId', 'otp', 'face', 'thaiId', 'idCard', 'confirm',
      'facePrep', 'faceCapture', 'faceProcessing', 'faceSuccess', 'password', 'pin', 'biometric', 'done',
    ];
    const idx = order.indexOf(step);
    if (step === 'welcome') {
      history.push('/m/login');
      return;
    }
    if (idx <= 0) {
      history.push('/m/login');
      return;
    }
    if (step === 'pin' && pinPhase === 'confirm') {
      setPinPhase('create');
      setPinConfirm('');
      return;
    }
    go(order[idx - 1]);
  };

  const submitCitizenId = () => {
    const raw = digits(cid);
    // Validation note: เลขบัตรไม่ครบ 13 หลัก
    if (raw.length < 13) {
      setCidError('กรุณากรอกเลขบัตรประชาชนให้ครบ 13 หลัก');
      return;
    }
    // Error note: มีบัญชีที่ใช้งานอยู่แล้ว (duplicate)
    if (raw === DEMO_DUPLICATE_CID) {
      setCidError('มีบัญชีที่ใช้งานอยู่แล้ว กรุณาเข้าสู่ระบบ หรือกู้คืนรหัสผ่าน');
      return;
    }
    setCidError('');
    // Edge note: เลขบัตรเคยลงทะเบียนค้างไว้ → ทำ Step ต่อจากที่ค้างไว้
    if (raw === DEMO_RESUME_CID) {
      sendOtp();
      go('otp');
      return;
    }
    sendOtp();
    go('otp');
  };

  const verifyOtp = (submitted) => {
    if (otpMode === 'locked') return;
    /* Prefer the value handed in by the auto-submit (avoids reading stale `otp`
       state); fall back to `otp` for any manual/CTA call. */
    const value = typeof submitted === 'string' ? submitted : otp;
    // Demo: 999999 = expired; anything else ≠ the texted code = wrong
    if (value === DEMO_OTP_EXPIRED) {
      setOtpMode('expired');
      return;
    }
    if (value !== sentOtp) {
      const nextAttempts = otpAttempts + 1;
      setOtpAttempts(nextAttempts);
      if (nextAttempts >= OTP_MAX_ATTEMPTS) {
        setOtpMode('locked');
        setOtpCooldown(OTP_COOLDOWN_SEC);
        setOtp('');
        return;
      }
      setOtpMode('wrong');
      return;
    }
    setOtpMode('idle');
    setOtpAttempts(0);
    setSmsPush(null);
    go('face');
  };

  const finishRegistration = ({ forceOffline = false } = {}) => {
    // Edge note: เน็ตหลุดตอนบันทึก
    const offline = forceOffline || (typeof navigator !== 'undefined' && navigator.onLine === false);
    if (offline) {
      go('networkError');
      return;
    }
    /* Persist PIN so Sign In unlocks via Unlock PIN (Figma 2042:27776 branch). */
    try {
      if (pin && pin.length === 6) {
        localStorage.setItem('phcis_mobile_pin_v1', pin);
      }
    } catch { /* noop */ }
    if (deviceHadBiometric()) {
      go('biometric');
      return;
    }
    go('done');
  };

  const enterApp = () => {
    signIn();
    history.replace('/m/home');
  };

  const headerTitle = step === 'terms' ? 'เงื่อนไขการให้บริการ'
    : step === 'policy' ? 'นโยบายความเป็นส่วนตัว'
      : step === 'otp' ? 'ยืนยัน OTP'
        : step === 'idCard' ? 'ถ่ายภาพบัตรประชาชน'
          : step === 'confirm' ? 'ยืนยันข้อมูล'
          : step === 'facePrep' || step === 'faceCapture' ? 'ถ่ายภาพใบหน้า'
          : step === 'faceProcessing' ? 'ยืนยันตัวตน'
          : step === 'face' || step === 'thaiId' ? 'ยืนยันตัวตน'
            : step === 'password' || step === 'pin' ? 'ตั้งรหัสผ่าน'
              : step === 'biometric' ? 'ความปลอดภัย'
                : 'ลงทะเบียน';

  const showChrome = !['welcome', 'intro', 'done', 'networkError', 'faceSuccess', 'pin'].includes(step);
  const showStepBar = CORE_STEPS.includes(step);
  const fillHeight = ['welcome', 'terms', 'policy', 'intro', 'citizenId', 'otp', 'confirm', 'faceSuccess', 'pin', 'done'].includes(step);

  return (
    <MobileShell
      requireAuth={false}
      showBottomNav={false}
      background={
        step === 'welcome' ? WELCOME_BG
          : step === 'faceSuccess' || step === 'done' ? SUCCESS_CARD_BG
            : step === 'pin' ? PIN_BG
              : C.screen
      }
    >
      <div
        className='flex flex-col'
        style={{ minHeight: '100%', height: fillHeight ? '100%' : undefined }}
      >
        {showChrome ? <RegHeader title={headerTitle} onBack={back} /> : null}
        {showStepBar ? <StepBar stepKey={step} /> : null}

        {step === 'welcome' && (
          <WelcomeStep
            index={welcomeIdx}
            onNext={() => {
              if (welcomeIdx >= WELCOME_SLIDES.length - 1) go('terms');
              else setWelcomeIdx((i) => i + 1);
            }}
          />
        )}
        {step === 'terms' && (
          <ConsentDocStep
            title='เงื่อนไขการให้บริการ'
            body={TERMS_BODY}
            acceptLabel='ยอมรับเงื่อนไขการให้บริการ'
            onAccept={() => go('policy')}
          />
        )}
        {step === 'policy' && (
          <ConsentDocStep
            title='นโยบายความเป็นส่วนตัว'
            body={POLICY_BODY}
            acceptLabel='ยอมรับนโยบายความเป็นส่วนตัว'
            onAccept={() => go('intro')}
          />
        )}
        {step === 'intro' && (
          <IntroStep onStart={() => go('citizenId')} onLogin={() => history.push('/m/login')} />
        )}
        {step === 'citizenId' && (
          <CitizenIdStep
            cid={cid}
            setCid={(v) => { setCid(v); setCidError(''); }}
            phone={phone}
            setPhone={setPhone}
            error={cidError}
            onNext={submitCitizenId}
          />
        )}
        {step === 'otp' && (
          <>
            {smsPush && (
              <SmsPush
                code={smsPush.code}
                reference={smsPush.reference}
                onDismiss={() => setSmsPush(null)}
              />
            )}
            <OtpStep
              phone={phone}
              otp={otp}
              setOtp={(v) => { setOtp(v); if (otpMode === 'wrong' || otpMode === 'expired') setOtpMode('idle'); }}
              mode={otpMode}
              attemptsLeft={OTP_MAX_ATTEMPTS - otpAttempts}
              cooldown={otpCooldown}
              onVerify={verifyOtp}
              onResend={() => { setOtp(''); setOtpMode('idle'); sendOtp(); }}
              onChangePhone={() => { setSmsPush(null); go('citizenId'); }}
            />
          </>
        )}
        {step === 'idCard' && (
          <>
            <IdCardStep cameraOn={idCardCameraOn} onNext={(photo) => { setIdCardPhoto(photo); go('confirm'); }} />
            {/* Camera-permission prompt sits over the ID-card page so the step
                bar behind it reads "ขั้นตอนที่ 4 จาก 5"; อนุญาต opens the
                camera right away, ไม่อนุญาต just dismisses. */}
            {cameraPopup && (
              <CameraPermissionPopup
                onAllow={() => { setCameraPopup(false); setIdCardCameraOn(true); }}
                onDeny={() => setCameraPopup(false)}
              />
            )}
          </>
        )}
        {step === 'face' && (
          <FaceStep
            onThaiId={() => go('thaiId')}
            onFaceScan={() => { setIdCardCameraOn(false); setCameraPopup(true); go('idCard'); }}
          />
        )}
        {step === 'confirm' && (
          <ConfirmDetailsStep cid={cid} photo={idCardPhoto} onNext={() => go('facePrep')} />
        )}
        {step === 'facePrep' && (
          <FaceScanPrepStep onNext={() => go('faceCapture')} />
        )}
        {step === 'faceCapture' && (
          <FaceScanCaptureStep onNext={() => go('faceProcessing')} />
        )}
        {step === 'faceProcessing' && (
          <FaceProcessingStep onDone={() => go('faceSuccess')} />
        )}
        {step === 'faceSuccess' && (
          <FaceSuccessStep cid={cid} onNext={() => go('password')} />
        )}
        {step === 'thaiId' && <ThaiIdNavigateStep />}
        {step === 'password' && (
          <PasswordStep
            pw={pw}
            setPw={setPw}
            confirm={confirm}
            setConfirm={setConfirm}
            onDone={() => {
              setPin('');
              setPinConfirm('');
              setPinPhase('create');
              go('pin');
            }}
          />
        )}
        {step === 'pin' && (
          <PinStep
            pin={pin}
            setPin={setPin}
            confirm={pinConfirm}
            setConfirm={setPinConfirm}
            phase={pinPhase}
            onConfirm={(next) => {
              if (next === 'confirm') setPinPhase('confirm');
              else finishRegistration();
            }}
            onMismatch={() => {
              setPinConfirm('');
              setPinPhase('create');
              setPin('');
            }}
            onSkip={() => {
              setPin('');
              setPinConfirm('');
              finishRegistration();
            }}
          />
        )}
        {step === 'biometric' && (
          <BiometricStep
            kind='fingerprint'
            onEnable={() => {
              try { localStorage.setItem('phcis_mobile_biometric_enabled_v1', '1'); } catch { /* noop */ }
              go('done');
            }}
            onSkip={() => go('done')}
          />
        )}
        {step === 'networkError' && (
          <NetworkErrorStep
            onRetry={() => finishRegistration({ forceOffline: false })}
            onLater={() => {
              try {
                localStorage.setItem('phcis_mobile_reg_draft_v1', JSON.stringify({ cid, phone, draft: true }));
              } catch { /* noop */ }
              history.push('/m/login');
            }}
          />
        )}
        {step === 'done' && <DoneStep onEnter={enterApp} />}
      </div>
    </MobileShell>
  );
}
