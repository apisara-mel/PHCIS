import React, { useEffect, useState } from 'react';
import {
  SERVICES,
  SUB_SERVICES,
  findPatientById,
  pickDemoPatient,
  findTodayAppointment,
  generateQueueNumber,
  callingNowFor,
  estimateWaitMinutes,
} from '@/data/kioskMock';
import HubScreen from '@/pages/kiosk/steps/HubScreen';
import RightsDetailScreen from '@/pages/kiosk/steps/RightsDetailScreen';
import PaymentChannelScreen from '@/pages/kiosk/steps/PaymentChannelScreen';
import PaymentReceiptScreen from '@/pages/kiosk/steps/PaymentReceiptScreen';

/* MIH PHCIS · KIOSK multi-step flow.
   Figma file `PlyfeAl2AdZtqZK7eZrxKg` · userflow doc `docs/kiosk-userflow.html`.
   Stitch hub screens: docs/kiosk/stitch (service-select / rights / payment).

   State machine:
     welcome → hub
       ├─ register     → service → sub-service? → appointment → verify → confirm → ticket
       ├─ appointment  → appointment → verify → confirm → ticket
       ├─ eligibility  → verify → rights → service → … → ticket
       └─ payment      → payment-channel → payment-receipt

   Standalone surface — no Sidebar/Header chrome. Fixed canvas 1440×1462.
   All tokens alias design.md per CLAUDE.md (gradient is the documented
   exception). Icons use Material Symbols via the inline <Sym> helper
   because the local Icon catalog doesn't include the kiosk glyphs.
*/

/* ─── Sym helper ─── */
const Sym = ({ name, size = 24, color, fill = false }) => (
  <span
    aria-hidden
    className='material-symbols-outlined'
    style={{
      fontFamily: 'Material Symbols Outlined',
      fontSize: size,
      lineHeight: 1,
      color: color || 'inherit',
      fontVariationSettings: `'FILL' ${fill ? 1 : 0}, 'wght' 400, 'GRAD' 0, 'opsz' ${size}`,
      userSelect: 'none',
    }}
  >
    {name}
  </span>
);

/* ─── constants ─── */
const FACILITY = { brand: 'สำนักอนามัย', branch: 'ศูนย์ 4 ดินแดง' };
/* State-machine order (also listed inside `goBack` / `stepIndexFor`):
   welcome → hub → (intent branches) → … → ticket | payment-receipt */

/* ─── time helpers ─── */
const THAI_MONTHS = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
const fmtThaiDate = (d) => `${d.getDate()} ${THAI_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`;
const fmtThaiTime = (d) => `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')} น.`;

/* Pretty-print 13-digit Thai ID (X-XXXX-XXXXX-XX-X) */
const fmtThaiId = (id) => {
  const d = id.replace(/[^0-9]/g, '').slice(0, 13);
  const a = d.slice(0, 1), b = d.slice(1, 5), c = d.slice(5, 10), e = d.slice(10, 12), f = d.slice(12, 13);
  return [a, b, c, e, f].filter(Boolean).join('-');
};

/* ─── styling primitives ─── */
const cardStyle = {
  background: '#FFFFFF',
  border: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary, #B1E6CD)',
  borderRadius: 'var(--dim-radius-600, 24px)',
  boxShadow: 'var(--shadow-brand-drop-bottom-200)',
  padding: 'var(--dim-space-1200, 48px)',
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--dim-space-800, 32px)',
  boxSizing: 'border-box',
};

const stepHeaderStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--dim-space-600, 24px)',
  width: '100%',
};

const stepBadgeStyle = {
  width: 48,
  height: 48,
  borderRadius: 'var(--dim-radius-full, 9999px)',
  background: 'var(--text-brandPrimary-default, #007549)',
  color: 'var(--text-content-on-content)',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 'var(--type-size-2xl, 24px)',
  fontWeight: 'var(--type-weight-bold, 700)',
  flexShrink: 0,
};

/* ─── Header ─── */
const DateTimeChip = ({ now }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--dim-space-400, 16px)',
      padding: 'var(--dim-space-400, 16px) var(--dim-space-600, 24px)',
      borderRadius: 'var(--dim-radius-450, 14px)',
      background: 'rgba(0, 0, 0, 0.20)',
      color: 'var(--text-content-on-content)',
      width: 239,
      height: 80,
      boxSizing: 'border-box',
    }}
  >
    <Sym name='schedule' size={32} color='#FFFFFF' />
    <div style={{ display: 'flex', flexDirection: 'column', fontFamily: 'var(--type-family-body)' }}>
      <span style={{ fontSize: 'var(--type-size-lg, 18px)', fontWeight: 'var(--type-weight-medium, 500)' }}>
        {fmtThaiDate(now)}
      </span>
      <span style={{ fontSize: 'var(--type-size-2xl, 24px)', fontWeight: 'var(--type-weight-bold, 700)', marginTop: 4 }}>
        {fmtThaiTime(now)}
      </span>
    </div>
  </div>
);

const HeaderIconButton = ({ icon, label, dark, onClick }) => (
  <button
    type='button'
    onClick={onClick}
    style={{
      width: 80,
      height: 80,
      borderRadius: 'var(--dim-radius-450, 14px)',
      background: dark ? 'rgba(0, 0, 0, 0.20)' : '#FFFFFF',
      border: 'none',
      cursor: 'pointer',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      padding: 0,
      boxShadow: dark ? 'none' : 'var(--shadow-brand-drop-bottom-100)',
    }}
  >
    {icon && <Sym name={icon} size={32} color={dark ? '#FFFFFF' : 'var(--text-brandPrimary-default, #007549)'} />}
    <span
      style={{
        fontFamily: 'var(--type-family-body)',
        fontSize: dark ? 'var(--type-size-sm, 14px)' : 'var(--type-size-2xl, 24px)',
        fontWeight: 'var(--type-weight-bold, 700)',
        color: dark ? '#FFFFFF' : 'var(--text-brandPrimary-default, #007549)',
      }}
    >
      {label}
    </span>
  </button>
);

const KioskHeader = ({ now, lang, setLang }) => (
  <div
    style={{
      width: 1440,
      height: 144,
      background: 'linear-gradient(90deg, #54AA8C 0%, #4CC6AE 100%)',
      boxShadow: 'var(--shadow-brand-drop-bottom-100)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 var(--dim-space-1200, 48px)',
      boxSizing: 'border-box',
      flexShrink: 0,
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--dim-space-300, 12px)' }}>
      <div
        aria-hidden
        style={{
          width: 92, height: 92,
          borderRadius: 'var(--dim-radius-full, 9999px)',
          background: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Sym name='health_and_safety' size={56} color='var(--text-brandPrimary-default, #007549)' fill />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', color: 'var(--text-content-on-content)', fontFamily: 'var(--type-family-body)' }}>
        <span style={{ fontSize: 36, fontWeight: 'var(--type-weight-bold, 700)', lineHeight: 1.25 }}>{FACILITY.brand}</span>
        <span style={{ fontSize: 'var(--type-size-2xl, 24px)', fontWeight: 'var(--type-weight-bold, 700)', marginTop: 4 }}>{FACILITY.branch}</span>
      </div>
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--dim-space-200, 8px)' }}>
      <DateTimeChip now={now} />
      <HeaderIconButton icon='accessibility' label='ตัวช่วย' dark />
      <HeaderIconButton label='ไทย' icon={null} dark={lang !== 'th'} onClick={() => setLang('th')} />
      <HeaderIconButton label='EN' icon={null} dark={lang !== 'en'} onClick={() => setLang('en')} />
    </div>
  </div>
);

/* ─── Footer breadcrumb / nav ─── */
const StepFooter = ({ stepIndex, totalSteps, onBack, onReset }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 var(--dim-space-1200, 48px) var(--dim-space-800, 32px)',
      flexShrink: 0,
    }}
  >
    {onBack ? (
      <button
        type='button'
        onClick={onBack}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 'var(--dim-space-200, 8px)',
          padding: 'var(--dim-space-400, 16px) var(--dim-space-600, 24px)',
          borderRadius: 'var(--dim-radius-450, 14px)',
          background: '#FFFFFF',
          border: 'var(--dim-stroke-100, 1px) solid var(--border-card-default, #E2E4E6)',
          cursor: 'pointer',
          fontSize: 'var(--type-size-xl, 20px)',
          fontWeight: 'var(--type-weight-medium, 500)',
          color: 'var(--text-content-default, #171A1F)',
          boxShadow: 'var(--shadow-brand-drop-bottom-100)',
        }}
      >
        <Sym name='arrow_back' size={24} />
        ย้อนกลับ
      </button>
    ) : <span />}

    {stepIndex >= 0 && (
      <span style={{ fontSize: 'var(--type-size-lg, 18px)', color: 'var(--text-content-tertiary, #858C92)', fontFamily: 'var(--type-family-body)' }}>
        ขั้นตอน {stepIndex + 1} / {totalSteps}
      </span>
    )}

    {onReset ? (
      <button
        type='button'
        onClick={onReset}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 'var(--dim-space-200, 8px)',
          padding: 'var(--dim-space-400, 16px) var(--dim-space-600, 24px)',
          borderRadius: 'var(--dim-radius-450, 14px)',
          background: '#FFFFFF',
          border: 'var(--dim-stroke-100, 1px) solid var(--border-card-default, #E2E4E6)',
          cursor: 'pointer',
          fontSize: 'var(--type-size-xl, 20px)',
          fontWeight: 'var(--type-weight-medium, 500)',
          color: 'var(--text-content-secondary, #565D6D)',
        }}
      >
        <Sym name='restart_alt' size={24} />
        เริ่มใหม่
      </button>
    ) : <span />}
  </div>
);

/* ─── Welcome screen (Step 0) ─── */
const WelcomeScreen = ({ onStart }) => (
  <button
    type='button'
    onClick={onStart}
    aria-label='เริ่มใช้บริการ'
    style={{
      flex: '1 1 0%',
      minHeight: 0,
      background: 'transparent',
      border: 'none',
      cursor: 'pointer',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 'var(--dim-space-800, 32px)',
      padding: 'var(--dim-space-1200, 48px)',
      fontFamily: 'var(--type-family-body)',
    }}
  >
    <div
      aria-hidden
      style={{
        width: 240, height: 240,
        borderRadius: 'var(--dim-radius-full, 9999px)',
        background: 'var(--surface-brandPrimary-quaternary, #F7FCFA)',
        border: '4px solid var(--border-brandPrimary-quaternary, #B1E6CD)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: 'var(--shadow-brand-drop-bottom-200)',
      }}
    >
      <Sym name='waving_hand' size={120} color='var(--text-brandPrimary-default, #007549)' fill />
    </div>
    <div style={{ textAlign: 'center' }}>
      <p style={{ fontSize: 48, fontWeight: 'var(--type-weight-bold, 700)', margin: 0, color: 'var(--text-content-default, #171A1F)' }}>
        ยินดีต้อนรับ
      </p>
      <p style={{ fontSize: 'var(--type-size-2xl, 24px)', fontWeight: 'var(--type-weight-medium, 500)', margin: '12px 0 0', color: 'var(--text-content-secondary, #565D6D)' }}>
        ระบบบัตรคิวอัตโนมัติ
      </p>
    </div>
    <div
      style={{
        background: 'var(--text-brandPrimary-default, #007549)',
        color: 'var(--text-content-on-content)',
        padding: 'var(--dim-space-600, 24px) var(--dim-space-1200, 48px)',
        borderRadius: 'var(--dim-radius-450, 14px)',
        fontSize: 30,
        fontWeight: 'var(--type-weight-bold, 700)',
        boxShadow: 'var(--shadow-brand-drop-bottom-200)',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--dim-space-400, 16px)',
      }}
    >
      สัมผัสที่ใดก็ได้เพื่อเริ่มใช้บริการ
      <Sym name='arrow_forward' size={36} color='#FFFFFF' />
    </div>
  </button>
);

/* ─── Service picker (Step 1) ─── */
const ServiceCard = ({ item, selected, onClick, large = true }) => {
  const isSel = selected;
  return (
    <button
      type='button'
      onClick={onClick}
      aria-pressed={isSel}
      style={{
        flex: '1 1 0%',
        height: '100%',
        background: isSel ? 'var(--surface-brandPrimary-quaternary, #F7FCFA)' : '#FFFFFF',
        border: `4px solid ${isSel ? 'var(--border-brandPrimary-quaternary, #B1E6CD)' : '#DEE1E6'}`,
        borderRadius: 'var(--dim-radius-450, 14px)',
        boxShadow: isSel ? 'var(--shadow-brand-drop-bottom-200)' : 'none',
        padding: large ? 'var(--dim-space-800, 32px)' : 'var(--dim-space-600, 24px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--dim-space-400, 16px)',
        cursor: 'pointer',
        fontFamily: 'var(--type-family-body)',
        boxSizing: 'border-box',
        transition: 'background-color 160ms, border-color 160ms, box-shadow 160ms',
      }}
    >
      <span
        aria-hidden
        style={{
          width: large ? 104 : 80,
          height: large ? 104 : 80,
          borderRadius: 'var(--dim-radius-full, 9999px)',
          background: isSel
            ? 'var(--text-brandPrimary-default, #007549)'
            : 'var(--surface-brandPrimary-quaternary, #F7FCFA)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Sym name={item.icon} size={large ? 56 : 40} color={isSel ? '#FFFFFF' : 'var(--text-brandPrimary-default, #007549)'} />
      </span>
      <span
        style={{
          fontSize: large ? 30 : 'var(--type-size-2xl, 24px)',
          fontWeight: 'var(--type-weight-bold, 700)',
          color: isSel ? 'var(--text-brandPrimary-default, #007549)' : 'var(--text-content-default, #171A1F)',
          textAlign: 'center',
        }}
      >
        {item.label}
      </span>
      {item.desc && large && (
        <span
          style={{
            fontSize: 'var(--type-size-lg, 18px)',
            color: 'var(--text-content-secondary, #565D6D)',
            textAlign: 'center',
            lineHeight: 1.55,
          }}
        >
          {item.desc}
        </span>
      )}
    </button>
  );
};

const ServiceScreen = ({ selected, onPick }) => (
  <div style={{ ...cardStyle, flex: '1 1 0%' }}>
    <div style={stepHeaderStyle}>
      <span style={stepBadgeStyle}>1</span>
      <div style={{ flex: '1 1 0%', minWidth: 0 }}>
        <p style={{ fontSize: 36, fontWeight: 'var(--type-weight-bold, 700)', margin: 0 }}>เลือกบริการที่ต้องการ</p>
        <p style={{ fontSize: 'var(--type-size-xl, 20px)', color: 'var(--text-content-secondary, #565D6D)', margin: '12px 0 0' }}>
          สัมผัสที่ปุ่มเพื่อดำเนินการต่อ
        </p>
      </div>
    </div>
    {[0, 2, 4].map((rowStart) => (
      <div key={rowStart} style={{ display: 'flex', flex: '1 1 0%', minHeight: 0, gap: 'var(--dim-space-600, 24px)' }}>
        {SERVICES.slice(rowStart, rowStart + 2).map((s) => (
          <ServiceCard key={s.key} item={s} selected={selected === s.key} onClick={() => onPick(s.key)} />
        ))}
      </div>
    ))}
  </div>
);

/* ─── Sub-service picker (Step 1b) ─── */
const SubServiceScreen = ({ parentKey, selected, onPick }) => {
  const list = SUB_SERVICES[parentKey] || [];
  const cols = 4;
  const rows = Math.ceil(list.length / cols);
  return (
    <div style={{ ...cardStyle, flex: '1 1 0%' }}>
      <div style={stepHeaderStyle}>
        <span style={stepBadgeStyle}>2</span>
        <div style={{ flex: '1 1 0%' }}>
          <p style={{ fontSize: 36, fontWeight: 'var(--type-weight-bold, 700)', margin: 0 }}>
            เลือกประเภทบริการ
          </p>
          <p style={{ fontSize: 'var(--type-size-xl, 20px)', color: 'var(--text-content-secondary, #565D6D)', margin: '12px 0 0' }}>
            เลือกแผนกย่อยที่ต้องการเข้ารับบริการ
          </p>
        </div>
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} style={{ display: 'flex', flex: '1 1 0%', minHeight: 0, gap: 'var(--dim-space-400, 16px)' }}>
          {list.slice(r * cols, r * cols + cols).map((s) => (
            <ServiceCard key={s.key} item={s} selected={selected === s.key} onClick={() => onPick(s.key)} large={false} />
          ))}
          {/* Fill empty grid cells so cards keep equal width */}
          {Array.from({ length: cols - list.slice(r * cols, r * cols + cols).length }).map((_, i) => (
            <span key={`spacer-${i}`} style={{ flex: '1 1 0%' }} />
          ))}
        </div>
      ))}
    </div>
  );
};

/* ─── Appointment picker (Step 2) ─── */
const AppointmentScreen = ({ onPick }) => (
  <div style={{ ...cardStyle, flex: '1 1 0%' }}>
    <div style={stepHeaderStyle}>
      <span style={stepBadgeStyle}>3</span>
      <div style={{ flex: '1 1 0%' }}>
        <p style={{ fontSize: 36, fontWeight: 'var(--type-weight-bold, 700)', margin: 0 }}>คุณมีนัดหมายล่วงหน้าหรือไม่?</p>
        <p style={{ fontSize: 'var(--type-size-xl, 20px)', color: 'var(--text-content-secondary, #565D6D)', margin: '12px 0 0' }}>
          เลือกประเภทการมารับบริการของคุณ
        </p>
      </div>
    </div>
    <div style={{ display: 'flex', flex: '1 1 0%', gap: 'var(--dim-space-800, 32px)', alignItems: 'stretch' }}>
      <ServiceCard
        item={{ icon: 'event_available', label: 'มีนัดหมาย', desc: 'ฉันมาตามนัดที่จองไว้ล่วงหน้า' }}
        selected={false}
        onClick={() => onPick(true)}
      />
      <ServiceCard
        item={{ icon: 'person_add', label: 'ไม่มีนัด (Walk-in)', desc: 'รับบริการครั้งแรกหรือไม่ได้นัดหมาย' }}
        selected={false}
        onClick={() => onPick(false)}
      />
    </div>
  </div>
);

/* ─── Verify ID (Step 3) ─── */
const VerifyScreen = ({ onVerified, onManual }) => {
  const [reading, setReading] = useState(false);
  const [error, setError] = useState(null);

  const simulateChipRead = () => {
    setReading(true);
    setError(null);
    setTimeout(() => {
      setReading(false);
      const patient = pickDemoPatient();
      onVerified(patient);
    }, 2200);
  };

  return (
    <div style={{ ...cardStyle, flex: '1 1 0%', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ ...stepHeaderStyle, alignSelf: 'stretch' }}>
        <span style={stepBadgeStyle}>4</span>
        <div style={{ flex: '1 1 0%' }}>
          <p style={{ fontSize: 36, fontWeight: 'var(--type-weight-bold, 700)', margin: 0 }}>ยืนยันตัวตนด้วยบัตรประชาชน</p>
          <p style={{ fontSize: 'var(--type-size-xl, 20px)', color: 'var(--text-content-secondary, #565D6D)', margin: '12px 0 0' }}>
            เสียบบัตรประชาชนหันด้านชิปขึ้น หรือกรอกเลข 13 หลักด้วยตนเอง
          </p>
        </div>
      </div>

      <div
        style={{
          flex: '1 1 0%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 'var(--dim-space-800, 32px)',
          padding: 'var(--dim-space-1200, 48px)',
        }}
      >
        <div
          aria-hidden
          style={{
            width: 280, height: 280,
            borderRadius: 'var(--dim-radius-full, 9999px)',
            background: reading ? 'var(--text-brandPrimary-default, #007549)' : 'var(--surface-brandPrimary-quaternary, #F7FCFA)',
            border: `4px solid var(--border-brandPrimary-quaternary, #B1E6CD)`,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--shadow-brand-drop-bottom-200)',
            transition: 'background-color 220ms',
          }}
        >
          <Sym name={reading ? 'verified' : 'credit_card'} size={140} color={reading ? '#FFFFFF' : 'var(--text-brandPrimary-default, #007549)'} fill={reading} />
        </div>

        <p style={{ fontSize: 30, fontWeight: 'var(--type-weight-bold, 700)', textAlign: 'center', margin: 0 }}>
          {reading ? 'กำลังอ่านข้อมูล...' : 'วางบัตรในช่องอ่านบัตรด้านล่าง'}
        </p>

        {error && (
          <p style={{ color: 'var(--text-danger-default, #B91C1C)', fontSize: 'var(--type-size-xl, 20px)', margin: 0 }}>{error}</p>
        )}

        {!reading && (
          <div style={{ display: 'flex', gap: 'var(--dim-space-400, 16px)' }}>
            <button
              type='button'
              onClick={simulateChipRead}
              style={{
                background: 'var(--text-brandPrimary-default, #007549)',
                color: 'var(--text-content-on-content)',
                padding: 'var(--dim-space-400, 16px) var(--dim-space-800, 32px)',
                border: 'none',
                borderRadius: 'var(--dim-radius-450, 14px)',
                fontSize: 'var(--type-size-2xl, 24px)',
                fontWeight: 'var(--type-weight-bold, 700)',
                cursor: 'pointer',
                boxShadow: 'var(--shadow-brand-drop-bottom-100)',
                display: 'inline-flex', alignItems: 'center', gap: 'var(--dim-space-200, 8px)',
              }}
            >
              <Sym name='play_circle' size={28} color='#FFFFFF' />
              จำลองการอ่านบัตร (Demo)
            </button>
            <button
              type='button'
              onClick={onManual}
              style={{
                background: '#FFFFFF',
                color: 'var(--text-brandPrimary-default, #007549)',
                padding: 'var(--dim-space-400, 16px) var(--dim-space-800, 32px)',
                border: '4px solid var(--text-brandPrimary-default, #007549)',
                borderRadius: 'var(--dim-radius-450, 14px)',
                fontSize: 'var(--type-size-2xl, 24px)',
                fontWeight: 'var(--type-weight-bold, 700)',
                cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 'var(--dim-space-200, 8px)',
              }}
            >
              <Sym name='keyboard' size={28} color='var(--text-brandPrimary-default, #007549)' />
              กรอกเลขด้วยตนเอง
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

/* ─── Manual ID entry (sub-screen of verify) ─── */
const ManualEntryScreen = ({ onVerified, onCancel }) => {
  const [id, setId] = useState('');
  const [error, setError] = useState(null);

  const tap = (digit) => {
    if (id.length >= 13) return;
    setId(id + String(digit));
    setError(null);
  };
  const backspace = () => setId(id.slice(0, -1));
  const submit = () => {
    if (id.length !== 13) {
      setError('กรุณากรอกเลขบัตร 13 หลักให้ครบ');
      return;
    }
    const patient = findPatientById(id);
    if (!patient) {
      setError('ไม่พบข้อมูลในระบบ กรุณาติดต่อเจ้าหน้าที่');
      return;
    }
    onVerified(patient);
  };

  return (
    <div style={{ ...cardStyle, flex: '1 1 0%' }}>
      <div style={stepHeaderStyle}>
        <span style={stepBadgeStyle}>4</span>
        <div style={{ flex: '1 1 0%' }}>
          <p style={{ fontSize: 36, fontWeight: 'var(--type-weight-bold, 700)', margin: 0 }}>กรอกเลขบัตรประชาชน 13 หลัก</p>
          <p style={{ fontSize: 'var(--type-size-xl, 20px)', color: 'var(--text-content-secondary, #565D6D)', margin: '12px 0 0' }}>
            ลองใช้เลข <code>1100400123456</code> (mock) เพื่อทดสอบ
          </p>
        </div>
      </div>

      <div
        style={{
          background: '#FFFFFF',
          border: '4px solid var(--border-card-default, #E2E4E6)',
          borderRadius: 'var(--dim-radius-450, 14px)',
          padding: 'var(--dim-space-800, 32px)',
          fontFamily: 'Inter, var(--type-family-body)',
          fontSize: 48,
          fontWeight: 700,
          letterSpacing: 6,
          textAlign: 'center',
          color: 'var(--text-content-default, #171A1F)',
          minHeight: 96,
        }}
      >
        {id.length === 0 ? '_-____-_____-__-_' : fmtThaiId(id)}
      </div>

      {error && (
        <p style={{ color: 'var(--text-danger-default, #B91C1C)', fontSize: 'var(--type-size-xl, 20px)', margin: 0, textAlign: 'center' }}>{error}</p>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--dim-space-400, 16px)', flex: '1 1 0%', minHeight: 0 }}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <button
            key={n}
            type='button'
            onClick={() => tap(n)}
            style={{
              background: '#FFFFFF',
              border: '2px solid var(--border-card-default, #E2E4E6)',
              borderRadius: 'var(--dim-radius-450, 14px)',
              fontFamily: 'Inter, var(--type-family-body)',
              fontSize: 40,
              fontWeight: 700,
              color: 'var(--text-content-default, #171A1F)',
              cursor: 'pointer',
              minHeight: 88,
            }}
          >
            {n}
          </button>
        ))}
        <button
          type='button'
          onClick={backspace}
          style={{
            background: 'var(--surface-neutral-tertiary, #F4F5F5)',
            border: '2px solid var(--border-card-default, #E2E4E6)',
            borderRadius: 'var(--dim-radius-450, 14px)',
            cursor: 'pointer',
            minHeight: 88,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Sym name='backspace' size={36} color='var(--text-content-default, #171A1F)' />
        </button>
        <button
          type='button'
          onClick={() => tap(0)}
          style={{
            background: '#FFFFFF',
            border: '2px solid var(--border-card-default, #E2E4E6)',
            borderRadius: 'var(--dim-radius-450, 14px)',
            fontFamily: 'Inter, var(--type-family-body)',
            fontSize: 40,
            fontWeight: 700,
            color: 'var(--text-content-default, #171A1F)',
            cursor: 'pointer',
            minHeight: 88,
          }}
        >
          0
        </button>
        <button
          type='button'
          onClick={submit}
          style={{
            background: 'var(--text-brandPrimary-default, #007549)',
            color: 'var(--text-content-on-content)',
            border: 'none',
            borderRadius: 'var(--dim-radius-450, 14px)',
            fontSize: 'var(--type-size-2xl, 24px)',
            fontWeight: 'var(--type-weight-bold, 700)',
            cursor: 'pointer',
            minHeight: 88,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--dim-space-200, 8px)',
            boxShadow: 'var(--shadow-brand-drop-bottom-100)',
          }}
        >
          <Sym name='check' size={28} color='#FFFFFF' />
          ตรวจสอบ
        </button>
      </div>

      <button
        type='button'
        onClick={onCancel}
        style={{
          background: 'transparent',
          color: 'var(--text-content-secondary, #565D6D)',
          border: 'none',
          fontSize: 'var(--type-size-xl, 20px)',
          fontWeight: 'var(--type-weight-medium, 500)',
          cursor: 'pointer',
          alignSelf: 'center',
        }}
      >
        กลับไปอ่านชิปบัตร
      </button>
    </div>
  );
};

/* ─── Confirm (Step 4) ─── */
const ConfirmScreen = ({ patient, hasAppointment, service, subService, appointment, onConfirm, onCancel }) => (
  <div style={{ ...cardStyle, flex: '1 1 0%' }}>
    <div style={stepHeaderStyle}>
      <span style={stepBadgeStyle}>5</span>
      <div style={{ flex: '1 1 0%' }}>
        <p style={{ fontSize: 36, fontWeight: 'var(--type-weight-bold, 700)', margin: 0 }}>ตรวจสอบข้อมูล</p>
        <p style={{ fontSize: 'var(--type-size-xl, 20px)', color: 'var(--text-content-secondary, #565D6D)', margin: '12px 0 0' }}>
          กรุณายืนยันข้อมูลก่อนรับบัตรคิว
        </p>
      </div>
    </div>

    {/* Patient card */}
    <div
      style={{
        background: '#FFFFFF',
        border: 'var(--dim-stroke-100, 1px) solid var(--border-card-default, #E2E4E6)',
        borderRadius: 'var(--dim-radius-450, 14px)',
        padding: 'var(--dim-space-800, 32px)',
        display: 'flex',
        gap: 'var(--dim-space-600, 24px)',
      }}
    >
      <span
        aria-hidden
        style={{
          width: 96, height: 96,
          borderRadius: 'var(--dim-radius-full, 9999px)',
          background: 'var(--surface-brandPrimary-quaternary, #F7FCFA)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Sym name={patient.gender === 'หญิง' ? 'face_3' : 'face_6'} size={56} color='var(--text-brandPrimary-default, #007549)' fill />
      </span>
      <div style={{ flex: '1 1 0%' }}>
        <p style={{ fontSize: 'var(--type-size-lg, 18px)', color: 'var(--text-content-tertiary, #858C92)', margin: 0 }}>ผู้รับบริการ</p>
        <p style={{ fontSize: 36, fontWeight: 'var(--type-weight-bold, 700)', margin: '4px 0 8px' }}>{patient.fullName}</p>
        <p style={{ fontSize: 'var(--type-size-xl, 20px)', color: 'var(--text-content-secondary, #565D6D)', margin: 0 }}>
          HN {patient.hn} · {patient.age} ปี · {patient.gender} · กรุ๊ปเลือด {patient.bloodType} · สิทธิ {patient.rightsGroup}
        </p>
      </div>
    </div>

    {/* Service + appointment */}
    {hasAppointment && appointment ? (
      <div
        style={{
          background: 'var(--surface-brandPrimary-quaternary, #F7FCFA)',
          border: '3px solid var(--border-brandPrimary-quaternary, #B1E6CD)',
          borderRadius: 'var(--dim-radius-450, 14px)',
          padding: 'var(--dim-space-800, 32px)',
        }}
      >
        <p style={{ display: 'flex', alignItems: 'center', gap: 'var(--dim-space-200, 8px)', fontSize: 'var(--type-size-xl, 20px)', fontWeight: 'var(--type-weight-bold, 700)', color: 'var(--text-brandPrimary-default, #007549)', margin: 0 }}>
          <Sym name='event_available' size={28} color='var(--text-brandPrimary-default, #007549)' fill />
          นัดหมายวันนี้
        </p>
        <p style={{ fontSize: 30, fontWeight: 'var(--type-weight-bold, 700)', margin: '12px 0 4px' }}>
          {appointment.subLabel} · {appointment.time} น.
        </p>
        <p style={{ fontSize: 'var(--type-size-xl, 20px)', color: 'var(--text-content-secondary, #565D6D)', margin: 0 }}>
          {appointment.doctor} · ห้องตรวจ {appointment.room}
        </p>
      </div>
    ) : (
      <div
        style={{
          background: '#FDF1E0',
          border: '3px solid #F7DEB5',
          borderRadius: 'var(--dim-radius-450, 14px)',
          padding: 'var(--dim-space-800, 32px)',
        }}
      >
        <p style={{ display: 'flex', alignItems: 'center', gap: 'var(--dim-space-200, 8px)', fontSize: 'var(--type-size-xl, 20px)', fontWeight: 'var(--type-weight-bold, 700)', color: '#E0973C', margin: 0 }}>
          <Sym name='info' size={28} color='#E0973C' fill />
          {hasAppointment ? 'ไม่พบนัดหมายในวันนี้' : 'Walk-in — ไม่มีนัด'}
        </p>
        <p style={{ fontSize: 30, fontWeight: 'var(--type-weight-bold, 700)', margin: '12px 0 4px' }}>
          บริการที่เลือก: {subService?.label || service?.label}
        </p>
        <p style={{ fontSize: 'var(--type-size-xl, 20px)', color: 'var(--text-content-secondary, #565D6D)', margin: 0 }}>
          {service?.desc || 'ระบบจะออกคิวใหม่ให้คุณ'}
        </p>
      </div>
    )}

    <div style={{ display: 'flex', gap: 'var(--dim-space-400, 16px)', marginTop: 'auto' }}>
      <button
        type='button'
        onClick={onCancel}
        style={{
          flex: '1 1 0%',
          background: '#FFFFFF',
          color: 'var(--text-content-secondary, #565D6D)',
          border: 'var(--dim-stroke-100, 1px) solid var(--border-card-default, #E2E4E6)',
          borderRadius: 'var(--dim-radius-450, 14px)',
          padding: 'var(--dim-space-600, 24px)',
          fontSize: 'var(--type-size-2xl, 24px)',
          fontWeight: 'var(--type-weight-bold, 700)',
          cursor: 'pointer',
        }}
      >
        ยกเลิก
      </button>
      <button
        type='button'
        onClick={onConfirm}
        style={{
          flex: '2 1 0%',
          background: 'var(--text-brandPrimary-default, #007549)',
          color: 'var(--text-content-on-content)',
          border: 'none',
          borderRadius: 'var(--dim-radius-450, 14px)',
          padding: 'var(--dim-space-600, 24px)',
          fontSize: 30,
          fontWeight: 'var(--type-weight-bold, 700)',
          cursor: 'pointer',
          boxShadow: 'var(--shadow-brand-drop-bottom-200)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--dim-space-200, 8px)',
        }}
      >
        <Sym name='check_circle' size={32} color='#FFFFFF' fill />
        ยืนยันและรับคิว
      </button>
    </div>
  </div>
);

/* ─── Ticket + QR (Step 5) ─── */
const QRModal = ({ url, onClose }) => {
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=12&data=${encodeURIComponent(url)}`;
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: 'var(--surface-overlay-default)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#FFFFFF',
          borderRadius: 'var(--dim-radius-600, 24px)',
          padding: 'var(--dim-space-1200, 48px)',
          boxShadow: 'var(--shadow-drop-bottom-400)',
          width: 480,
          textAlign: 'center',
          fontFamily: 'var(--type-family-body)',
        }}
      >
        <p style={{ fontSize: 30, fontWeight: 'var(--type-weight-bold, 700)', margin: 0 }}>สแกน QR ด้วยกล้องโทรศัพท์</p>
        <p style={{ fontSize: 'var(--type-size-xl, 20px)', color: 'var(--text-content-secondary, #565D6D)', margin: '12px 0 24px' }}>
          เปิดบัตรคิวบนมือถือ + บันทึกภาพได้ทันที
        </p>
        <div style={{ display: 'inline-block', padding: 'var(--dim-space-400, 16px)', background: '#FFFFFF', border: '4px solid var(--border-card-default, #E2E4E6)', borderRadius: 'var(--dim-radius-450, 14px)' }}>
          <img src={qrSrc} alt='QR Code' width={280} height={280} />
        </div>
        <p style={{ fontFamily: 'Inter, var(--type-family-body)', fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-tertiary, #858C92)', marginTop: 'var(--dim-space-400, 16px)', wordBreak: 'break-all' }}>
          {url}
        </p>
        <button
          type='button'
          onClick={onClose}
          style={{
            marginTop: 'var(--dim-space-600, 24px)',
            background: 'var(--text-brandPrimary-default, #007549)',
            color: 'var(--text-content-on-content)',
            border: 'none',
            borderRadius: 'var(--dim-radius-450, 14px)',
            padding: 'var(--dim-space-400, 16px) var(--dim-space-800, 32px)',
            fontSize: 'var(--type-size-2xl, 24px)',
            fontWeight: 'var(--type-weight-bold, 700)',
            cursor: 'pointer',
            boxShadow: 'var(--shadow-brand-drop-bottom-100)',
          }}
        >
          ปิด
        </button>
      </div>
    </div>
  );
};

const TicketScreen = ({ queue, patient, service, subService, appointment, onDone }) => {
  const [qrOpen, setQrOpen] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [printDone, setPrintDone] = useState(false);

  const handlePrint = () => {
    setPrinting(true);
    setTimeout(() => { setPrinting(false); setPrintDone(true); }, 1600);
    setTimeout(() => { onDone(); }, 4000);
  };

  const dept = appointment?.subLabel || subService?.label || service?.label || '—';
  const calling = callingNowFor(queue.number);
  const eta = estimateWaitMinutes(queue.number, calling);
  const zone = appointment?.zone || 'โซน A ชั้น 1 หน้าห้องตรวจ';

  /* QR target = mobile ticket route. Uses location.origin so it works on
     LAN too (e.g. http://192.168.1.39:3000/kiosk/ticket/A-042?...) */
  const params = new URLSearchParams({
    dept,
    name: patient.fullName,
    hn: patient.hn,
    zone,
    calling: calling || '',
    eta: eta?.toString() || '',
  });
  const qrUrl = `${window.location.origin}/kiosk/ticket/${queue.number}?${params.toString()}`;

  return (
    <div style={{ ...cardStyle, flex: '1 1 0%', position: 'relative' }}>
      <div style={stepHeaderStyle}>
        <span style={{ ...stepBadgeStyle, background: 'var(--success, #08A768)' }}>
          <Sym name='check' size={28} color='#FFFFFF' />
        </span>
        <div style={{ flex: '1 1 0%' }}>
          <p style={{ fontSize: 36, fontWeight: 'var(--type-weight-bold, 700)', margin: 0 }}>บัตรคิวของคุณพร้อมแล้ว</p>
          <p style={{ fontSize: 'var(--type-size-xl, 20px)', color: 'var(--text-content-secondary, #565D6D)', margin: '12px 0 0' }}>
            พิมพ์บัตรคิวหรือสแกน QR เพื่อรับบัตรในมือถือ
          </p>
        </div>
      </div>

      <div
        style={{
          background: 'var(--surface-brandPrimary-quaternary, #F7FCFA)',
          borderRadius: 'var(--dim-radius-450, 14px)',
          padding: 'var(--dim-space-1200, 48px)',
          textAlign: 'center',
        }}
      >
        <p style={{ fontSize: 'var(--type-size-2xl, 24px)', color: 'var(--text-content-secondary, #565D6D)', margin: 0 }}>แผนก: {dept}</p>
        <div
          style={{
            display: 'block',
            fontFamily: 'Inter, var(--type-family-body)',
            fontSize: 144,
            fontWeight: 800,
            lineHeight: 1,
            letterSpacing: '-0.04em',
            color: 'var(--text-brandPrimary-default, #007549)',
            margin: 'var(--dim-space-400, 16px) 0',
          }}
        >
          {queue.number}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-around', fontSize: 'var(--type-size-xl, 20px)', marginTop: 'var(--dim-space-600, 24px)' }}>
          <div>
            <p style={{ color: 'var(--text-content-secondary, #565D6D)', margin: 0 }}>คิวที่กำลังเรียก</p>
            <p style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 36, margin: '8px 0 0', color: 'var(--text-content-default, #171A1F)' }}>{calling}</p>
          </div>
          <div>
            <p style={{ color: 'var(--text-content-secondary, #565D6D)', margin: 0 }}>เวลารอประมาณ</p>
            <p style={{ fontWeight: 700, fontSize: 36, margin: '8px 0 0', color: 'var(--text-content-default, #171A1F)' }}>~ {eta} นาที</p>
          </div>
          <div>
            <p style={{ color: 'var(--text-content-secondary, #565D6D)', margin: 0 }}>ไปนั่งรอที่</p>
            <p style={{ fontWeight: 700, fontSize: 24, margin: '8px 0 0', color: 'var(--text-content-default, #171A1F)' }}>{zone}</p>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 'var(--dim-space-400, 16px)', marginTop: 'auto' }}>
        <button
          type='button'
          onClick={handlePrint}
          disabled={printing || printDone}
          style={{
            flex: '1 1 0%',
            background: printDone ? 'var(--success, #08A768)' : 'var(--text-brandPrimary-default, #007549)',
            color: 'var(--text-content-on-content)',
            border: 'none',
            borderRadius: 'var(--dim-radius-450, 14px)',
            padding: 'var(--dim-space-600, 24px)',
            fontSize: 30,
            fontWeight: 'var(--type-weight-bold, 700)',
            cursor: printing || printDone ? 'default' : 'pointer',
            opacity: printing && !printDone ? 0.75 : 1,
            boxShadow: 'var(--shadow-brand-drop-bottom-100)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--dim-space-200, 8px)',
          }}
        >
          <Sym name={printDone ? 'check_circle' : 'print'} size={36} color='#FFFFFF' fill={printDone} />
          {printDone ? 'พิมพ์สำเร็จ' : printing ? 'กำลังพิมพ์...' : 'พิมพ์บัตรคิว'}
        </button>
        <button
          type='button'
          onClick={() => setQrOpen(true)}
          style={{
            flex: '1 1 0%',
            background: '#FFFFFF',
            color: 'var(--text-brandPrimary-default, #007549)',
            border: '4px solid var(--text-brandPrimary-default, #007549)',
            borderRadius: 'var(--dim-radius-450, 14px)',
            padding: 'var(--dim-space-600, 24px)',
            fontSize: 30,
            fontWeight: 'var(--type-weight-bold, 700)',
            cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--dim-space-200, 8px)',
          }}
        >
          <Sym name='qr_code_2' size={36} color='var(--text-brandPrimary-default, #007549)' />
          รับผ่าน QR
        </button>
        <button
          type='button'
          onClick={onDone}
          style={{
            background: 'transparent',
            color: 'var(--text-content-secondary, #565D6D)',
            border: 'var(--dim-stroke-100, 1px) solid var(--border-card-default, #E2E4E6)',
            borderRadius: 'var(--dim-radius-450, 14px)',
            padding: 'var(--dim-space-600, 24px) var(--dim-space-800, 32px)',
            fontSize: 'var(--type-size-2xl, 24px)',
            fontWeight: 'var(--type-weight-bold, 700)',
            cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 'var(--dim-space-200, 8px)',
          }}
        >
          เสร็จสิ้น
          <Sym name='restart_alt' size={28} />
        </button>
      </div>

      {qrOpen && <QRModal url={qrUrl} onClose={() => setQrOpen(false)} />}
    </div>
  );
};

/* ─── Page (state machine) ─── */
const EMPTY_FLOW = {
  intent: null,
  service: null,
  subService: null,
  hasAppointment: null,
  patient: null,
  appointment: null,
  queue: null,
  paymentChannel: null,
};

const KioskPage = () => {
  const [step, setStep] = useState('welcome');
  const [manualMode, setManualMode] = useState(false);
  const [flow, setFlow] = useState(EMPTY_FLOW);
  const [lang, setLang] = useState('th');
  const [now, setNow] = useState(() => new Date());

  /* Clock ticks once per minute */
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const reset = () => {
    setStep('welcome');
    setManualMode(false);
    setFlow(EMPTY_FLOW);
  };

  const pickHub = (svc) => {
    setFlow((f) => ({ ...EMPTY_FLOW, intent: svc.intent }));
    if (svc.intent === 'register') {
      setStep('service');
      return;
    }
    if (svc.intent === 'appointment') {
      setStep('appointment');
      return;
    }
    if (svc.intent === 'eligibility') {
      setStep('verify');
      return;
    }
    if (svc.intent === 'payment') {
      setStep('payment-channel');
    }
  };

  const goBack = () => {
    if (step === 'hub') return reset();

    /* Payment branch */
    if (flow.intent === 'payment') {
      if (step === 'payment-channel') return setStep('hub');
      if (step === 'payment-receipt') return setStep('payment-channel');
    }

    /* Eligibility: hub → verify → rights → service → [sub] → confirm → ticket */
    if (flow.intent === 'eligibility') {
      if (step === 'verify') {
        if (manualMode) {
          setManualMode(false);
          return;
        }
        return setStep('hub');
      }
      if (step === 'rights') return setStep('verify');
      if (step === 'service') return setStep('rights');
      if (step === 'sub-service') return setStep('service');
      if (step === 'confirm') {
        if (flow.service?.drill && flow.subService) return setStep('sub-service');
        return setStep('service');
      }
    }

    /* Appointment: hub → appointment → verify → … */
    if (flow.intent === 'appointment') {
      if (step === 'appointment') return setStep('hub');
      if (step === 'verify') {
        if (manualMode) {
          setManualMode(false);
          return;
        }
        return setStep('appointment');
      }
    }

    /* Register (and eligibility after service): classic queue order */
    const order = ['hub', 'service', 'sub-service', 'appointment', 'verify', 'confirm', 'ticket'];
    const idx = order.indexOf(step);
    if (idx <= 0) return reset();
    if (step === 'service') return setStep('hub');
    if (step === 'appointment' && !flow.service?.drill) {
      setStep('service');
      return;
    }
    if (step === 'verify' && manualMode) {
      setManualMode(false);
      return;
    }
    setStep(order[idx - 1]);
  };

  const pickService = (key) => {
    const svc = SERVICES.find((s) => s.key === key);
    setFlow((f) => ({ ...f, service: svc, subService: null }));
    if (svc.drill) {
      setStep('sub-service');
      return;
    }
    /* Eligibility already verified identity — skip re-verify */
    if (flow.intent === 'eligibility' && flow.patient) {
      setFlow((f) => ({ ...f, hasAppointment: false }));
      setStep('confirm');
      return;
    }
    setStep('appointment');
  };

  const pickSubService = (key) => {
    const sub = (SUB_SERVICES[flow.service.key] || []).find((s) => s.key === key);
    setFlow((f) => ({ ...f, subService: sub }));
    if (flow.intent === 'eligibility' && flow.patient) {
      setFlow((f) => ({ ...f, hasAppointment: false }));
      setStep('confirm');
      return;
    }
    setStep('appointment');
  };

  const pickAppointment = (has) => {
    setFlow((f) => ({ ...f, hasAppointment: has }));
    setStep('verify');
  };

  const onVerified = (patient) => {
    const subKey = flow.subService?.key;
    const appt = flow.hasAppointment ? findTodayAppointment(patient, subKey) : null;
    setFlow((f) => ({
      ...f,
      patient,
      appointment: appt,
      ...(flow.intent === 'appointment' && appt
        ? {
            service: SERVICES.find((s) => s.key === 'consultation') || f.service,
            subService: {
              key: appt.sub,
              label: appt.subLabel,
              queuePrefix: (appt.sub || 'A').charAt(0).toUpperCase(),
            },
          }
        : {}),
    }));
    setManualMode(false);
    if (flow.intent === 'eligibility') {
      setStep('rights');
      return;
    }
    setStep('confirm');
  };

  const onRightsConfirm = () => {
    /* TOR 1.16.1.3 — pick department + queue after rights OK */
    setStep('service');
  };

  const onConfirm = () => {
    const prefix = flow.subService?.queuePrefix || flow.service?.queuePrefix || 'Q';
    const seed = `${flow.patient.hn}|${flow.subService?.key || flow.service?.key || flow.intent}`;
    const number = generateQueueNumber(prefix, seed);
    setFlow((f) => ({ ...f, queue: { number } }));
    setStep('ticket');
  };

  const onPaymentChannel = (channelKey) => {
    setFlow((f) => ({ ...f, paymentChannel: channelKey }));
    setStep('payment-receipt');
  };

  /* Visible step index for the footer breadcrumb */
  const stepIndexFor = (s) => {
    if (s === 'welcome' || s === 'hub') return -1;
    if (flow.intent === 'payment') {
      return ['payment-channel', 'payment-receipt'].indexOf(s);
    }
    if (flow.intent === 'eligibility') {
      /* verify → rights → service → [sub] → confirm → ticket */
      const visible = ['verify', 'rights', 'service'];
      if (flow.service?.drill) visible.push('sub-service');
      visible.push('confirm', 'ticket');
      return visible.indexOf(s);
    }
    if (flow.intent === 'appointment') {
      return ['appointment', 'verify', 'confirm', 'ticket'].indexOf(s);
    }
    /* register */
    const visible = ['service'];
    if (flow.service?.drill) visible.push('sub-service');
    visible.push('appointment', 'verify', 'confirm', 'ticket');
    return visible.indexOf(s);
  };

  const totalSteps = (() => {
    if (flow.intent === 'payment') return 2;
    if (flow.intent === 'appointment') return 4;
    if (flow.intent === 'eligibility') return flow.service?.drill ? 6 : 5;
    return flow.service?.drill ? 6 : 5;
  })();

  /* Render current step */
  let content;
  switch (step) {
    case 'welcome':
      content = <WelcomeScreen onStart={() => setStep('hub')} />;
      break;
    case 'hub':
      content = <HubScreen onPick={pickHub} />;
      break;
    case 'service':
      content = <ServiceScreen selected={flow.service?.key} onPick={pickService} />;
      break;
    case 'sub-service':
      content = <SubServiceScreen parentKey={flow.service.key} selected={flow.subService?.key} onPick={pickSubService} />;
      break;
    case 'appointment':
      content = <AppointmentScreen onPick={pickAppointment} />;
      break;
    case 'verify':
      content = manualMode
        ? <ManualEntryScreen onVerified={onVerified} onCancel={() => setManualMode(false)} />
        : <VerifyScreen onVerified={onVerified} onManual={() => setManualMode(true)} />;
      break;
    case 'rights':
      content = (
        <RightsDetailScreen
          patient={flow.patient}
          onConfirm={onRightsConfirm}
          onPrint={() => { /* mock print rights summary */ }}
        />
      );
      break;
    case 'payment-channel':
      content = <PaymentChannelScreen onConfirm={onPaymentChannel} />;
      break;
    case 'payment-receipt':
      content = (
        <PaymentReceiptScreen
          channelKey={flow.paymentChannel}
          onBack={() => setStep('payment-channel')}
          onDone={reset}
        />
      );
      break;
    case 'confirm':
      content = <ConfirmScreen
        patient={flow.patient}
        hasAppointment={flow.hasAppointment}
        service={flow.service}
        subService={flow.subService}
        appointment={flow.appointment}
        onConfirm={onConfirm}
        onCancel={reset}
      />;
      break;
    case 'ticket':
      content = <TicketScreen
        queue={flow.queue}
        patient={flow.patient}
        service={flow.service}
        subService={flow.subService}
        appointment={flow.appointment}
        onDone={reset}
      />;
      break;
    default:
      content = null;
  }

  const stepIndex = stepIndexFor(step);
  const showFooter = step !== 'welcome' && step !== 'hub' && step !== 'ticket' && step !== 'payment-receipt';

  return (
    <div
      style={{
        width: 1440,
        minHeight: 1462,
        background: 'var(--background-screen-brand-100, #FAFCFA)',
        margin: '0 auto',
        boxShadow: '0 3px 6px rgba(18, 15, 40, 0.12)',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: 'var(--type-family-body)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <KioskHeader now={now} lang={lang} setLang={setLang} />

      <div
        style={{
          flex: '1 1 0%',
          display: 'flex',
          padding: 'var(--dim-space-1200, 48px)',
          paddingBottom: showFooter ? 'var(--dim-space-200, 8px)' : 'var(--dim-space-1200, 48px)',
          boxSizing: 'border-box',
        }}
      >
        {content}
      </div>

      {showFooter && (
        <StepFooter
          stepIndex={stepIndex}
          totalSteps={totalSteps}
          onBack={goBack}
          onReset={reset}
        />
      )}
    </div>
  );
};

export default KioskPage;
