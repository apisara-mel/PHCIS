import React, { useEffect, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';
import {
  MobileShell,
  MobileButton,
  MobileInput,
  MobileField,
  useMobileApp,
  Sym,
} from '@/components/mobile/MobileShell';

/* BMA Health · ลงทะเบียนเข้าใช้งาน — Figma "Mobile Application" 167:61741.
   Clean white wizard (4 ขั้นตอน): ข้อมูลส่วนตัว → ยืนยัน OTP → สแกนใบหน้า →
   ตั้งรหัสผ่าน. Bookended by an intro screen and a success screen. */

const STEPS = ['intro', 'citizenId', 'otp', 'face', 'password', 'done'];
/* The numbered counter only covers the 4 core steps (intro/done sit outside). */
const STEP_META = {
  citizenId: { n: 1, label: 'ข้อมูลส่วนตัว' },
  otp:       { n: 2, label: 'ยืนยันรหัส OTP' },
  face:      { n: 3, label: 'สแกนใบหน้า' },
  password:  { n: 4, label: 'ตั้งรหัสผ่าน' },
};
const TOTAL = 4;

const C = {
  brand: 'var(--text-brandPrimary-default, #007549)',
  brandSoft: 'var(--surface-brandPrimary-quaternary, #F4FBF8)',
  border: 'var(--border-content-tertiary, #E1E3E5)',
  ink: 'var(--text-content-default, #363B3F)',
  sub: 'var(--text-content-secondary, #636B72)',
  muted: 'var(--text-content-tertiary, #858C92)',
  danger: 'var(--text-danger-default, #D43838)',
};

/* ─── Header (back + centred title) ─────────────────────────────────── */
const RegHeader = ({ title, onBack }) => (
  <div
    className="flex items-center"
    style={{ height: 56, padding: '0 var(--dim-space-200, 8px)', borderBottom: `1px solid ${C.border}`, background: '#FFFFFF', position: 'sticky', top: 0, zIndex: 5 }}
  >
    <button
      type="button"
      onClick={onBack}
      aria-label="ย้อนกลับ"
      className="inline-flex items-center justify-center"
      style={{ width: 40, height: 40, border: 0, background: 'transparent', cursor: 'pointer', color: C.ink }}
    >
      <Sym name="arrow_back_ios_new" size={20} />
    </button>
    <span style={{ flex: 1, textAlign: 'center', fontFamily: 'var(--type-family-heading-graphic2, var(--type-family-body))', fontSize: 'var(--type-size-base, 16px)', color: C.ink }}>
      {title}
    </span>
    <span style={{ width: 40 }} aria-hidden />
  </div>
);

/* ─── Step progress bar ("ขั้นตอนที่ X จาก 4" + label + segments) ────── */
const StepBar = ({ stepKey }) => {
  const meta = STEP_META[stepKey];
  if (!meta) return null;
  return (
    <div style={{ padding: 'var(--dim-space-300, 12px) var(--dim-space-400, 16px)', borderBottom: `1px solid ${C.border}`, background: '#FFFFFF' }}>
      <div className="flex items-center justify-between" style={{ marginBottom: 'var(--dim-space-150, 6px)' }}>
        <span style={{ fontSize: 'var(--type-size-xs, 12px)', color: C.muted }}>ขั้นตอนที่ {meta.n} จาก {TOTAL}</span>
        <span style={{ fontSize: 'var(--type-size-xs, 12px)', color: C.brand, fontWeight: 'var(--type-weight-medium, 500)' }}>{meta.label}</span>
      </div>
      <div className="flex" style={{ gap: 'var(--dim-space-150, 6px)' }}>
        {Array.from({ length: TOTAL }).map((_, i) => (
          <span key={i} style={{ flex: 1, height: 4, borderRadius: 999, background: i < meta.n ? C.brand : 'var(--border-content-quaternary, #EEF0F2)' }} />
        ))}
      </div>
    </div>
  );
};

/* ─── Sticky footer primary button ─────────────────────────────────── */
const Footer = ({ children }) => (
  <div style={{ padding: 'var(--dim-space-400, 16px)', borderTop: `1px solid ${C.border}`, background: '#FFFFFF' }}>
    {children}
  </div>
);

const Title = ({ children }) => (
  <h1 style={{ margin: 0, fontFamily: 'var(--type-family-heading-graphic2, var(--type-family-body))', fontSize: 'var(--type-size-lg, 18px)', color: C.brand, textAlign: 'center' }}>{children}</h1>
);
const Subtitle = ({ children }) => (
  <p style={{ margin: '6px 0 0', fontSize: 'var(--type-size-sm, 14px)', color: C.sub, textAlign: 'center', lineHeight: 1.5 }}>{children}</p>
);

/* ─── Step 0 · Intro ───────────────────────────────────────────────── */
const INTRO_STEPS = [
  { icon: 'badge', title: 'ระบุข้อมูลส่วนตัว', desc: 'ใช้เลขบัตรประชาชนและเบอร์โทรศัพท์ที่ลงทะเบียนไว้' },
  { icon: 'sms',   title: 'ยืนยันรหัส OTP',    desc: 'รับรหัสผ่าน SMS เพื่อความปลอดภัยของบัญชี' },
  { icon: 'face',  title: 'สแกนใบหน้า',         desc: 'ยืนยันตัวตนด้วยใบหน้าตามมาตรฐานความปลอดภัย' },
  { icon: 'lock',  title: 'ตั้งรหัสผ่าน',        desc: 'สร้างรหัสผ่านสำหรับเข้าใช้งานครั้งต่อไป' },
];
const IntroStep = ({ onStart, onLogin }) => (
  <div className="flex flex-col" style={{ minHeight: '100%', background: C.brandSoft }}>
    <div className="flex-1" style={{ padding: 'var(--dim-space-400, 16px) var(--dim-space-400, 16px) var(--dim-space-600, 24px)' }}>
      {/* hero illustration (exported from Figma 47:18242) */}
      <img src="/illustration/mobile/register-intro.png" alt="" aria-hidden style={{ display: 'block', width: 224, maxWidth: '70%', margin: '8px auto 18px' }} />

      {/* white card — title + subtitle + step list */}
      <div style={{ background: '#FFFFFF', border: `1px solid ${C.border}`, borderRadius: 'var(--dim-radius-600, 24px)', boxShadow: 'var(--shadow-card)', padding: 'var(--dim-space-500, 20px)' }}>
        <Title>ลงทะเบียนเข้าใช้งาน</Title>
        <Subtitle>จัดการสุขภาพของคุณได้ง่ายๆ เพียง 4 ขั้นตอนเพื่อเริ่มต้นใช้งาน</Subtitle>

        <div className="flex flex-col" style={{ gap: 'var(--dim-space-300, 12px)', marginTop: 'var(--dim-space-500, 20px)' }}>
          {INTRO_STEPS.map((s) => (
            <div key={s.title} className="flex items-start" style={{ gap: 'var(--dim-space-300, 12px)', background: '#FFFFFF', border: `1px solid ${C.border}`, borderRadius: 'var(--dim-radius-400, 12px)', padding: 'var(--dim-space-300, 12px)' }}>
              <span className="inline-flex items-center justify-center shrink-0" style={{ width: 40, height: 40, borderRadius: 'var(--dim-radius-300, 10px)', background: C.brandSoft, color: C.brand }}>
                <Sym name={s.icon} size={22} />
              </span>
              <div className="flex flex-col" style={{ gap: 2 }}>
                <span style={{ fontSize: 'var(--type-size-sm, 14px)', fontWeight: 'var(--type-weight-medium, 500)', color: C.ink }}>{s.title}</span>
                <span style={{ fontSize: 'var(--type-size-xs, 12px)', color: C.muted, lineHeight: 1.5 }}>{s.desc}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
    <Footer>
      <MobileButton variant="primary" icon="arrow_forward" onClick={onStart}>เริ่มลงทะเบียน</MobileButton>
      <button type="button" onClick={onLogin} style={{ display: 'block', width: '100%', marginTop: 'var(--dim-space-300, 12px)', border: 0, background: 'transparent', cursor: 'pointer', fontSize: 'var(--type-size-sm, 14px)', color: C.sub }}>
        เคยลงทะเบียนแล้ว? <span style={{ color: C.brand, fontWeight: 'var(--type-weight-medium, 500)' }}>เข้าสู่ระบบ</span>
      </button>
    </Footer>
  </div>
);

/* ─── Step 1 · National ID + phone ─────────────────────────────────── */
const formatCid = (raw) => {
  const d = raw.replace(/\D/g, '').slice(0, 13);
  return [d.slice(0, 1), d.slice(1, 5), d.slice(5, 10), d.slice(10, 12), d.slice(12, 13)].filter(Boolean).join('-');
};
const formatPhone = (raw) => {
  const d = raw.replace(/\D/g, '').slice(0, 10);
  return [d.slice(0, 3), d.slice(3, 6), d.slice(6, 10)].filter(Boolean).join('-');
};
const CitizenIdStep = ({ cid, setCid, phone, setPhone, onNext }) => {
  const cidOk = cid.replace(/\D/g, '').length === 13;
  const phoneOk = phone.replace(/\D/g, '').length === 10;
  return (
    <>
      <div className="flex-1" style={{ padding: 'var(--dim-space-600, 24px) var(--dim-space-500, 20px)', background: '#FFFFFF' }}>
        <Title>ข้อมูลยืนยันตัวตน</Title>
        <Subtitle>กรุณากรอกข้อมูลให้ตรงกับฐานข้อมูลทะเบียนราษฎร์ เพื่อตรวจสอบและยืนยันบัญชีผู้ใช้</Subtitle>
        <div className="flex flex-col" style={{ gap: 'var(--dim-space-400, 16px)', marginTop: 'var(--dim-space-500, 20px)' }}>
          <MobileField label="เลขประจำตัวประชาชน (13 หลัก)" required hint="ข้อมูลนี้ถูกเก็บรักษาอย่างปลอดภัยตามกฎหมาย PDPA">
            <MobileInput inputMode="numeric" placeholder="x-xxxx-xxxxx-xx-x" value={cid} onChange={(e) => setCid(formatCid(e.target.value))} />
          </MobileField>
          <MobileField label="เบอร์โทรศัพท์มือถือ" required hint="ใช้สำหรับรับรหัส OTP ในขั้นตอนถัดไป">
            <MobileInput inputMode="tel" placeholder="0xx-xxx-xxxx" value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} />
          </MobileField>
        </div>
      </div>
      <Footer><MobileButton variant="primary" disabled={!cidOk || !phoneOk} onClick={onNext}>ถัดไป</MobileButton></Footer>
    </>
  );
};

/* ─── Step 2 · OTP ─────────────────────────────────────────────────── */
const OTP_LEN = 6;
const OtpStep = ({ phone, otp, setOtp, error, onVerify, onResend, onChangePhone }) => {
  const refs = useRef([]);
  const [secs, setSecs] = useState(46);
  useEffect(() => {
    if (secs <= 0) return undefined;
    const id = setTimeout(() => setSecs((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [secs]);
  const setDigit = (i, v) => {
    const d = v.replace(/\D/g, '').slice(-1);
    const next = otp.split('');
    next[i] = d;
    setOtp(next.join('').slice(0, OTP_LEN));
    if (d && refs.current[i + 1]) refs.current[i + 1].focus();
  };
  const onKey = (i, e) => { if (e.key === 'Backspace' && !otp[i] && refs.current[i - 1]) refs.current[i - 1].focus(); };
  const full = otp.length === OTP_LEN;
  return (
    <>
      <div className="flex-1" style={{ padding: 'var(--dim-space-600, 24px) var(--dim-space-500, 20px)', background: '#FFFFFF' }}>
        <Title>{error ? 'รหัส OTP ไม่ถูกต้อง' : 'ยืนยันรหัส OTP'}</Title>
        <Subtitle>{error ? 'กรุณาตรวจสอบและกรอกรหัสอีกครั้ง' : `เราได้ส่งรหัส 6 หลักไปที่ ${phone || 'เบอร์ของคุณ'}`}</Subtitle>
        <div className="flex justify-center" style={{ gap: 'var(--dim-space-200, 8px)', margin: 'var(--dim-space-600, 24px) 0 var(--dim-space-300, 12px)' }}>
          {Array.from({ length: OTP_LEN }).map((_, i) => (
            <input
              key={i}
              ref={(el) => { refs.current[i] = el; }}
              inputMode="numeric"
              maxLength={1}
              value={otp[i] || ''}
              onChange={(e) => setDigit(i, e.target.value)}
              onKeyDown={(e) => onKey(i, e)}
              style={{
                width: 44, height: 52, textAlign: 'center', fontSize: 'var(--type-size-xl, 20px)', color: error ? C.danger : C.ink,
                border: `1.5px solid ${error ? C.danger : C.border}`, borderRadius: 'var(--dim-radius-300, 10px)', outline: 'none',
                background: error ? 'var(--surface-danger-quaternary, #FEF2F2)' : '#FFFFFF',
              }}
            />
          ))}
        </div>
        {error && <p style={{ textAlign: 'center', fontSize: 'var(--type-size-xs, 12px)', color: C.danger, margin: 0 }}>รหัสไม่ถูกต้อง โปรดลองใหม่</p>}
        <p style={{ textAlign: 'center', fontSize: 'var(--type-size-xs, 12px)', color: C.muted, marginTop: 'var(--dim-space-400, 16px)' }}>
          {secs > 0 ? `ขอรหัสใหม่ได้ใน 0:${String(secs).padStart(2, '0')}` : 'ไม่ได้รับรหัส?'}
        </p>
        <div style={{ marginTop: 'var(--dim-space-200, 8px)' }}>
          <MobileButton variant="secondary" icon="refresh" disabled={secs > 0} onClick={() => { setSecs(46); onResend(); }}>ส่งรหัสอีกครั้ง</MobileButton>
        </div>
        <button type="button" onClick={onChangePhone} style={{ display: 'block', width: '100%', marginTop: 'var(--dim-space-300, 12px)', border: 0, background: 'transparent', cursor: 'pointer', fontSize: 'var(--type-size-sm, 14px)', color: C.brand }}>
          เปลี่ยนเบอร์โทรศัพท์
        </button>
      </div>
      <Footer><MobileButton variant="primary" disabled={!full} onClick={onVerify}>ยืนยัน</MobileButton></Footer>
    </>
  );
};

/* ─── Step 3 · Face capture ────────────────────────────────────────── */
const FaceStep = ({ onNext }) => (
  <>
    <div className="flex-1 flex flex-col" style={{ padding: 'var(--dim-space-600, 24px) var(--dim-space-500, 20px)', background: '#FFFFFF' }}>
      <Title>สแกนใบหน้าเพื่อยืนยันตัวตน</Title>
      <Subtitle>จัดใบหน้าให้อยู่ในกรอบ ในที่ที่มีแสงสว่างเพียงพอ</Subtitle>
      <div className="flex items-center justify-center" style={{ margin: 'var(--dim-space-600, 24px) auto', width: 240, height: 240, borderRadius: '50%', border: `3px dashed ${C.brand}`, background: C.brandSoft }}>
        <Sym name="face" size={120} color={C.brand} />
      </div>
      <div className="flex flex-col" style={{ gap: 'var(--dim-space-200, 8px)' }}>
        {['มองตรงไปที่กล้อง', 'ถอดแว่นตา / หน้ากากอนามัย', 'อยู่ในที่ที่มีแสงสว่างเพียงพอ'].map((t) => (
          <div key={t} className="flex items-center" style={{ gap: 'var(--dim-space-200, 8px)', fontSize: 'var(--type-size-sm, 14px)', color: C.sub }}>
            <Sym name="check_circle" size={18} color={C.brand} /> {t}
          </div>
        ))}
      </div>
    </div>
    <Footer><MobileButton variant="primary" icon="photo_camera" onClick={onNext}>เริ่มสแกนใบหน้า</MobileButton></Footer>
  </>
);

/* ─── Step 4 · Set password ────────────────────────────────────────── */
const PW_RULES = [
  { key: 'len', label: 'ความยาวอย่างน้อย 8 ตัวอักษร', test: (p) => p.length >= 8 },
  { key: 'case', label: 'มีตัวอักษรพิมพ์ใหญ่และพิมพ์เล็ก (A-Z, a-z)', test: (p) => /[a-z]/.test(p) && /[A-Z]/.test(p) },
  { key: 'num', label: 'มีตัวเลขอย่างน้อย 1 ตัว (0-9)', test: (p) => /\d/.test(p) },
  { key: 'sym', label: 'มีอักขระพิเศษอย่างน้อย 1 ตัว (เช่น @, #, $, %)', test: (p) => /[^A-Za-z0-9]/.test(p) },
];
const EyeBtn = ({ on, onClick }) => (
  <button type="button" onClick={onClick} aria-label="แสดง/ซ่อนรหัสผ่าน" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', border: 0, background: 'transparent', cursor: 'pointer', color: C.muted }}>
    <Sym name={on ? 'visibility' : 'visibility_off'} size={20} />
  </button>
);
const PasswordStep = ({ pw, setPw, confirm, setConfirm, onDone }) => {
  const [show1, setShow1] = useState(false);
  const [show2, setShow2] = useState(false);
  const rules = PW_RULES.map((r) => ({ ...r, ok: r.test(pw) }));
  const allOk = rules.every((r) => r.ok);
  const matchOk = confirm.length > 0 && confirm === pw;
  return (
    <>
      <div className="flex-1" style={{ padding: 'var(--dim-space-600, 24px) var(--dim-space-500, 20px)', background: '#FFFFFF' }}>
        <Title>สร้างรหัสผ่านของคุณ</Title>
        <div className="flex flex-col" style={{ gap: 'var(--dim-space-400, 16px)', marginTop: 'var(--dim-space-500, 20px)' }}>
          <MobileField label="รหัสผ่านใหม่" required>
            <div style={{ position: 'relative' }}>
              <MobileInput type={show1 ? 'text' : 'password'} placeholder="กรอกรหัสผ่าน" value={pw} onChange={(e) => setPw(e.target.value)} style={{ paddingRight: 44 }} />
              <EyeBtn on={show1} onClick={() => setShow1((v) => !v)} />
            </div>
          </MobileField>

          <div style={{ background: C.brandSoft, border: `1px solid ${C.border}`, borderRadius: 'var(--dim-radius-400, 12px)', padding: 'var(--dim-space-300, 12px)' }}>
            <span style={{ fontSize: 'var(--type-size-xs, 12px)', fontWeight: 'var(--type-weight-medium, 500)', color: C.ink }}>ความปลอดภัยของรหัสผ่าน</span>
            <div className="flex flex-col" style={{ gap: 'var(--dim-space-150, 6px)', marginTop: 'var(--dim-space-200, 8px)' }}>
              {rules.map((r) => (
                <div key={r.key} className="flex items-center" style={{ gap: 'var(--dim-space-200, 8px)', fontSize: 'var(--type-size-xs, 12px)', color: r.ok ? C.brand : C.muted }}>
                  <Sym name={r.ok ? 'check_circle' : 'radio_button_unchecked'} size={16} color={r.ok ? C.brand : C.muted} />
                  {r.label}
                </div>
              ))}
            </div>
          </div>

          <MobileField label="ยืนยันรหัสผ่านใหม่" required error={confirm.length > 0 && !matchOk ? 'รหัสผ่านไม่ตรงกัน' : undefined}>
            <div style={{ position: 'relative' }}>
              <MobileInput type={show2 ? 'text' : 'password'} placeholder="กรอกรหัสผ่านอีกครั้ง" value={confirm} onChange={(e) => setConfirm(e.target.value)} style={{ paddingRight: 44 }} />
              <EyeBtn on={show2} onClick={() => setShow2((v) => !v)} />
            </div>
          </MobileField>
        </div>
      </div>
      <Footer><MobileButton variant="primary" disabled={!allOk || !matchOk} onClick={onDone}>เสร็จสิ้นการตั้งรหัสผ่าน</MobileButton></Footer>
    </>
  );
};

/* ─── Step 5 · Done ────────────────────────────────────────────────── */
const DoneStep = ({ onEnter }) => (
  <div className="flex flex-col" style={{ minHeight: '100%', background: C.brandSoft }}>
    <div className="flex-1 flex flex-col items-center justify-center" style={{ padding: 'var(--dim-space-600, 24px)' }}>
      <span className="inline-flex items-center justify-center" style={{ width: 96, height: 96, borderRadius: '50%', background: 'var(--color-emerald-600, #08A768)', color: '#FFFFFF', boxShadow: 'var(--shadow-card)' }}>
        <Sym name="check" size={52} />
      </span>
      <h1 style={{ margin: '20px 0 0', fontFamily: 'var(--type-family-heading-graphic2, var(--type-family-body))', fontSize: 'var(--type-size-xl, 20px)', color: C.brand }}>ลงทะเบียนสำเร็จ</h1>
      <p style={{ margin: '8px 0 0', fontSize: 'var(--type-size-sm, 14px)', color: C.sub, textAlign: 'center', lineHeight: 1.5 }}>
        บัญชี BMA Health ของคุณพร้อมใช้งานแล้ว<br />เริ่มจัดการสุขภาพของคุณได้ทันที
      </p>
    </div>
    <Footer><MobileButton variant="primary" icon="arrow_forward" onClick={onEnter}>เข้าใช้งานแอป</MobileButton></Footer>
  </div>
);

/* ─── FakeQR — deterministic 21×21 pseudo-QR (re-exported; used by
   MobileProfileQrPage + MobilePaymentPage). Visual placeholder only. */
export const FakeQR = ({ seed = 'PHCIS', size = 160 }) => {
  const cells = 21;
  const grid = [];
  let h = 2166136261;
  const eat = (n) => { h ^= n; h = Math.imul(h, 16777619) >>> 0; };
  for (let i = 0; i < seed.length; i += 1) eat(seed.charCodeAt(i));
  for (let r = 0; r < cells; r += 1) {
    const row = [];
    for (let c = 0; c < cells; c += 1) {
      eat(r * cells + c);
      row.push((h & 1) === 1);
    }
    grid.push(row);
  }
  const finder = (rr, cc) => {
    for (let r = 0; r < 7; r += 1) for (let c = 0; c < 7; c += 1) {
      const onEdge = r === 0 || r === 6 || c === 0 || c === 6;
      const innerSquare = r >= 2 && r <= 4 && c >= 2 && c <= 4;
      grid[rr + r][cc + c] = onEdge || innerSquare;
    }
  };
  finder(0, 0); finder(0, cells - 7); finder(cells - 7, 0);
  const cell = size / cells;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-label="QR Code">
      <rect width={size} height={size} fill="#FFFFFF" rx={8} />
      {grid.map((row, r) => row.map((on, c) => (on ? (
        <rect key={`${r}-${c}`} x={c * cell} y={r * cell} width={cell} height={cell} fill="#0F1B17" />
      ) : null)))}
    </svg>
  );
};

/* ─── Wizard shell ─────────────────────────────────────────────────── */
export default function MobileRegisterPage() {
  const history = useHistory();
  const { signIn } = useMobileApp();
  const [step, setStep] = useState('intro');
  const [cid, setCid] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState(false);
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');

  const idx = STEPS.indexOf(step);
  const go = (s) => setStep(s);
  const back = () => {
    if (idx <= 0) { history.push('/m/login'); return; }
    setStep(STEPS[idx - 1]);
  };

  const verifyOtp = () => {
    // Demo: any 6 digits pass except literal "000000" (shows the error state).
    if (otp === '000000') { setOtpError(true); return; }
    setOtpError(false);
    go('face');
  };

  const finish = () => { signIn(); history.replace('/m/home'); };

  const title = step === 'otp' ? 'ยืนยัน OTP'
    : step === 'face' ? 'สแกนใบหน้า'
      : step === 'password' ? 'ตั้งรหัสผ่าน' : 'ลงทะเบียน';

  return (
    <MobileShell requireAuth={false} showBottomNav={false} background="#FFFFFF">
      <div className="flex flex-col" style={{ minHeight: '100%' }}>
        {step !== 'done' && <RegHeader title={title} onBack={back} />}
        {STEP_META[step] && <StepBar stepKey={step} />}

        {step === 'intro' && <IntroStep onStart={() => go('citizenId')} onLogin={() => history.push('/m/login')} />}
        {step === 'citizenId' && <CitizenIdStep cid={cid} setCid={setCid} phone={phone} setPhone={setPhone} onNext={() => go('otp')} />}
        {step === 'otp' && <OtpStep phone={phone} otp={otp} setOtp={setOtp} error={otpError} onVerify={verifyOtp} onResend={() => { setOtp(''); setOtpError(false); }} onChangePhone={() => go('citizenId')} />}
        {step === 'face' && <FaceStep onNext={() => go('password')} />}
        {step === 'password' && <PasswordStep pw={pw} setPw={setPw} confirm={confirm} setConfirm={setConfirm} onDone={() => go('done')} />}
        {step === 'done' && <DoneStep onEnter={finish} />}
      </div>
    </MobileShell>
  );
}
