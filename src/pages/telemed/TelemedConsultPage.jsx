import React, { useEffect, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { DEFAULT_PATIENT } from '@/data/patientProfiles';
import { TREATMENT_DEFAULT_VITALS } from '@/data/treatmentVisits';
import BrandCircleSubdueIconButton from '@/components/button/BrandCircleSubdueIconButton';
import DangerCircleIconButton from '@/components/button/DangerCircleIconButton';
import DangerCircleSubdueIconButton from '@/components/button/DangerCircleSubdueIconButton';
import DangerButton from '@/components/button/DangerButton';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import AlertDialog from '@/components/popup/AlertDialog';
import VirtualBackgroundFeed from '@/components/telemed/VirtualBackgroundFeed';

/*
  ระบบ Telemedicine / RPM (TOR ข้อ 1.13) — ฝั่งแพทย์ (PHCIS web).
  เปิดจากปุ่ม Telemedicine (floating) ในระบบบันทึกการรักษา.

  ครอบคลุมตาม TOR:
   · ภาพ/เสียงแพทย์–ผู้ป่วย + เปิด-ปิดกล้อง/ไมค์
   · ข้อความ Chat · แชร์หน้าจอ/เอกสารผลตรวจ
   · เชื่อมข้อมูลผู้ป่วยจาก PHCIS (แพทย์ดูข้อมูลสุขภาพ/ประเมินได้ · read-only ตามสิทธิ์)
   · PDPA + สถานะยินยอมบันทึกสาย (บันทึกได้เฉพาะเมื่อผู้ป่วยอนุญาต)
   · ระยะเวลาสาย · ปุ่มวางสาย
   · การรับมือกล้อง/ไมค์/เครือข่ายขัดข้อง (แบนเนอร์แจ้งเตือน)
   · ตำแหน่งการประเมินผ่าน GIS
   · หลังจบสาย: สรุปคำปรึกษา · ยา/รายการตรวจ · ไปชำระเงิน

  Light-themed เพื่อให้สอดคล้องกับ MobileTelemedPage + design tokens.
  สื่อภาพ/เสียงถูกจำลอง (mock) — ไม่เรียก getUserMedia เพื่อเลี่ยง permission
  prompt ในโหมดสาธิต; สถานะกล้อง/ไมค์/เครือข่ายสลับได้เพื่อโชว์ error handling.
*/

/* ── Material Symbols glyph (web) — same contract as ScreeningPage's Sym ── */
const Sym = ({ name, size = 20, fill = 0, weight = 500, color, style }) => (
  <span
    className='material-symbols-outlined'
    aria-hidden
    style={{
      fontFamily: 'Material Symbols Outlined',
      fontVariationSettings: `'FILL' ${fill}, 'wght' ${weight}, 'opsz' ${size}`,
      fontSize: size,
      lineHeight: 1,
      width: size,
      height: size,
      color,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      ...style,
    }}
  >
    {name}
  </span>
);

const fmtElapsed = (s) => {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
};

const getInitials = (name = '') => {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
  return String(name).slice(0, 2).toUpperCase();
};

const classifyMediaError = (err) => {
  const name = err?.name || '';
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError' || name === 'OverconstrainedError') {
    return 'device-not-found';
  }
  return 'permission';
};

const ONBRAND = 'var(--text-brandPrimary-on-brand, #FFFFFF)';

/* ── Mock clinical context (would come from the PHCIS visit in production) ── */
const PATIENT = DEFAULT_PATIENT || {
  fullName: 'นายสมชาย มีสุข', hn: '67-00001', age: '42 ปี', bloodType: 'O',
  insurance: 'สิทธิประกันสังคม',
};
const VITALS = [
  { key: 'bp', label: 'ความดัน', value: TREATMENT_DEFAULT_VITALS?.bp ?? '128/82', unit: 'mmHg', tone: 'warn' },
  { key: 'hr', label: 'ชีพจร', value: TREATMENT_DEFAULT_VITALS?.hr ?? 78, unit: 'ครั้ง/นาที' },
  { key: 'temp', label: 'อุณหภูมิ', value: TREATMENT_DEFAULT_VITALS?.temp ?? 36.8, unit: '°C' },
  { key: 'spo2', label: 'SpO₂', value: TREATMENT_DEFAULT_VITALS?.spo2 ?? 98, unit: '%' },
  { key: 'rr', label: 'การหายใจ', value: TREATMENT_DEFAULT_VITALS?.rr ?? 18, unit: 'ครั้ง/นาที' },
  { key: 'bmi', label: 'BMI', value: TREATMENT_DEFAULT_VITALS?.bmi ?? 24.1, unit: 'kg/m²' },
];
const ALLERGIES = ['Penicillin (ผื่นลมพิษ)', 'Sulfa (คลื่นไส้)'];
const CHRONIC = ['เบาหวานชนิดที่ 2', 'ความดันโลหิตสูง'];
const SHARE_DOCS = [
  {
    id: 'lab1', name: 'ผลตรวจเลือด CBC.pdf', size: '156 KB', icon: 'labs', kind: 'pdf',
    docTitle: 'ผลตรวจความสมบูรณ์ของเม็ดเลือด (Complete Blood Count)', date: '15 ก.ค. 2569',
    type: 'lab-table',
    rows: [
      { test: 'WBC (เม็ดเลือดขาว)', value: '7.8', unit: '10³/µL', ref: '4.0–10.0' },
      { test: 'RBC (เม็ดเลือดแดง)', value: '4.9', unit: '10⁶/µL', ref: '4.5–5.9' },
      { test: 'Hemoglobin (Hb)', value: '14.2', unit: 'g/dL', ref: '13.0–17.0' },
      { test: 'Hematocrit (Hct)', value: '42', unit: '%', ref: '40–50' },
      { test: 'Platelets (เกล็ดเลือด)', value: '250', unit: '10³/µL', ref: '150–400' },
      { test: 'Neutrophils', value: '58', unit: '%', ref: '40–70' },
      { test: 'Lymphocytes', value: '32', unit: '%', ref: '20–40' },
    ],
    impression: 'ผลตรวจอยู่ในเกณฑ์ปกติทุกค่า',
  },
  {
    id: 'lab2', name: 'ผล X-ray ทรวงอก.jpg', size: '2.1 MB', icon: 'radiology', kind: 'image',
    docTitle: 'ภาพถ่ายรังสีทรวงอก (Chest X-ray, PA upright)', date: '15 ก.ค. 2569',
    type: 'image',
    reading: 'ปอดทั้งสองข้างโปร่งดี ไม่พบ infiltration หรือ pleural effusion · หัวใจขนาดปกติ (CT ratio < 0.5) · ไม่พบความผิดปกติของกระดูก',
    impression: 'Impression: Normal chest — ไม่พบความผิดปกติ',
  },
  {
    id: 'lab3', name: 'ผลน้ำตาลสะสม HbA1c.pdf', size: '88 KB', icon: 'labs', kind: 'pdf',
    docTitle: 'ผลตรวจน้ำตาลสะสม (HbA1c)', date: '15 ก.ค. 2569',
    type: 'lab-table',
    rows: [
      { test: 'HbA1c', value: '7.2', unit: '%', ref: '< 7.0 (เป้าหมาย)', flag: 'high' },
      { test: 'eAG (ค่าเฉลี่ยน้ำตาล)', value: '160', unit: 'mg/dL', ref: '—' },
    ],
    impression: 'ควบคุมน้ำตาลได้ปานกลาง สูงกว่าเป้าหมายเล็กน้อย แนะนำปรับพฤติกรรม/ทบทวนยา',
  },
];
const POST_MEDS = [
  { id: 'm1', name: 'Metformin 500 mg', detail: 'รับประทานครั้งละ 1 เม็ด วันละ 2 ครั้ง หลังอาหาร เช้า-เย็น' },
  { id: 'm2', name: 'Amlodipine 5 mg', detail: 'รับประทานครั้งละ 1 เม็ด วันละ 1 ครั้ง หลังอาหารเช้า' },
];
const POST_ORDERS = [
  { id: 'o1', name: 'ตรวจน้ำตาลสะสม (HbA1c)', detail: 'นัดติดตาม 3 เดือน' },
  { id: 'o2', name: 'ตรวจไขมันในเลือด (Lipid profile)', detail: 'งดอาหาร 8-12 ชม.' },
];

const DOCTOR = { name: 'พญ.สมหญิง รักษ์ดี', specialty: 'อายุรกรรม' };

/* Patient detail fields shown when TelemedPatientCard State=Show (Figma 25:3184). */
const PATIENT_DETAIL_FIELDS = [
  { key: 'gender', label: 'เพศ', value: 'ชาย', valueFont: 'heading' },
  { key: 'age', label: 'อายุ', value: '36 ปี - 7 เดือน - 11วัน' },
  { key: 'cid', label: 'เลขบัตรประชาชน', value: '1369900526072' },
  { key: 'insurance', label: 'สิทธิ์การรักษา', value: 'สิทธิประกันสังคม รพ.พระนั่งเกล้า (10686)' },
  { key: 'blood', label: 'หมู่เลือด', value: 'O' },
  { key: 'type', label: 'ประเภท', value: 'ผู้ป่วยเก่า' },
  { key: 'address', label: 'ที่อยู่', value: '124/64 พงษ์เวชอนุสรณ์ 2 สุขุมวิท บางจาก พระโขนง กรุงเทพมหานคร 10260', grow: true },
  { key: 'doctor', label: 'แพทย์เจ้าของคนไข้', value: DOCTOR.name },
];

/* ── TelemedPatientCard (Figma 25:3185) — State=Hide | State=Show ──────────
   Teal gradient patient banner. Hide = name + badges only (chevron down).
   Show = adds the detail field row (chevron up). Toggle uses Brand Circle
   Subdue Icon Button Outline · XSmall (Figma 25:3104 / 25:3178). */
const TelemedPatientCard = ({ open = false, onToggle }) => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      width: '100%',
      gap: open ? 'var(--dim-space-300, 12px)' : 0,
      padding: 'var(--dim-space-300, 12px) var(--dim-space-400, 16px)',
      borderRadius: 'var(--dim-radius-500, 16px)',
      background: open
        ? 'linear-gradient(97deg, #00A4AC 0.67%, #1FA091 100.76%)'
        : 'linear-gradient(101deg, #00A4AC 0.67%, #1FA091 100.76%)',
      color: 'var(--text-content-on-content, #FFFFFF)',
    }}
  >
    <div
      className='flex flex-wrap items-center'
      style={{ gap: 'var(--dim-space-400, 16px)', width: '100%' }}
    >
      <div
        style={{
          width: 'var(--dim-size-1000, 48px)',
          height: 'var(--dim-size-1000, 48px)',
          borderRadius: 'var(--dim-radius-full, 9999px)',
          border: 'var(--dim-stroke-400, 4px) solid var(--border-image-default, #FFFFFF)',
          background: '#6EBBD0',
          flexShrink: 0,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {PATIENT.avatarUrl ? (
          <img
            src={PATIENT.avatarUrl}
            alt={PATIENT.fullName}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <Sym name='person' size={28} fill={1} color='#FFFFFF' />
        )}
      </div>

      <div
        className='flex flex-col items-start'
        style={{
          flexShrink: 0,
          lineHeight: 1.5,
          color: 'var(--text-content-on-content, #FFFFFF)',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--type-family-heading-graphic2, "Mitr", sans-serif)',
            fontSize: 'var(--type-size-base, 16px)',
            fontWeight: 'var(--type-weight-regular, 400)',
            width: '100%',
          }}
        >
          {PATIENT.fullName}
        </span>
        <span
          style={{
            fontFamily: 'var(--type-family-body, "Sarabun", sans-serif)',
            fontSize: 'var(--type-size-sm, 14px)',
            fontWeight: 'var(--type-weight-regular, 400)',
            width: '100%',
          }}
        >
          {PATIENT.englishName || 'Somchai Manjaidee'}
        </span>
      </div>

      <div
        className='flex items-center'
        style={{ flex: '1 0 0', minWidth: 0, gap: 'var(--dim-space-200, 8px)' }}
      >
        <span
          style={{
            height: 'var(--dim-size-500, 24px)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            maxWidth: 'var(--dim-size-2300, 224px)',
            minWidth: 'var(--dim-size-800, 40px)',
            padding: 'var(--dim-space-100, 4px) var(--dim-space-200, 8px)',
            borderRadius: 'var(--dim-radius-full, 9999px)',
            background: 'var(--surface-colorfulbadge-green, #E2F3EB)',
            color: 'var(--text-colorfulbadge-green, #007549)',
            fontFamily: 'var(--type-family-body, "Sarabun", sans-serif)',
            fontSize: 'var(--type-size-xs, 12px)',
            fontWeight: 'var(--type-weight-medium, 500)',
            lineHeight: 1.5,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          HN: {PATIENT.hn}
        </span>
        <span
          style={{
            height: 'var(--dim-size-500, 24px)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            maxWidth: 'var(--dim-size-2300, 224px)',
            minWidth: 'var(--dim-size-800, 40px)',
            padding: 'var(--dim-space-100, 4px) var(--dim-space-200, 8px)',
            borderRadius: 'var(--dim-radius-full, 9999px)',
            background: 'var(--surface-colorfulbadge-red, #FEE2E2)',
            color: 'var(--text-colorfulbadge-red, #B91C1C)',
            fontFamily: 'var(--type-family-body, "Sarabun", sans-serif)',
            fontSize: 'var(--type-size-xs, 12px)',
            fontWeight: 'var(--type-weight-medium, 500)',
            lineHeight: 1.5,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          VIP / ผู้ป่วยพิเศษ
        </span>
      </div>

      <BrandCircleSubdueIconButton
        variant='outline'
        size='xs'
        icon={open ? 'keyboard_arrow_up' : 'keyboard_arrow_down'}
        aria-label={open ? 'ย่อข้อมูลผู้ป่วย' : 'ขยายข้อมูลผู้ป่วย'}
        aria-expanded={open}
        onClick={onToggle}
        style={{
          border: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimaryButton-tertiary, #C5EDDA)',
          flexShrink: 0,
        }}
      />
    </div>

    {open && (
      <div
        className='flex flex-wrap items-start content-start'
        style={{
          gap: 'var(--dim-space-600, 24px)',
          width: '100%',
          color: 'var(--text-content-on-content, #FFFFFF)',
        }}
      >
        {PATIENT_DETAIL_FIELDS.map((f) => (
          <div
            key={f.key}
            className='flex flex-col items-start justify-center'
            style={{
              minWidth: 0,
              flex: f.grow ? '1 0 0' : '0 0 auto',
              whiteSpace: f.grow ? 'normal' : 'nowrap',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--type-family-body, "Sarabun", sans-serif)',
                fontSize: 'var(--type-size-xs, 12px)',
                fontWeight: 'var(--type-weight-regular, 400)',
                lineHeight: 1.5,
              }}
            >
              {f.label}
            </span>
            <span
              style={{
                fontFamily: f.valueFont === 'heading'
                  ? 'var(--type-family-heading-graphic2, "Mitr", sans-serif)'
                  : 'var(--type-family-body, "Sarabun", sans-serif)',
                fontSize: 'var(--type-size-sm, 14px)',
                fontWeight: f.valueFont === 'heading'
                  ? 'var(--type-weight-medium, 500)'
                  : 'var(--type-weight-bold, 700)',
                lineHeight: f.valueFont === 'heading' ? 1.25 : 1.5,
                letterSpacing: f.valueFont === 'heading' ? '-0.28px' : undefined,
              }}
            >
              {f.key === 'age' ? (PATIENT.age || f.value) : f.key === 'blood' ? (PATIENT.bloodType || f.value) : f.key === 'insurance' ? (PATIENT.insurance || f.value) : f.value}
            </span>
          </div>
        ))}
      </div>
    )}
  </div>
);

/* ── Telemed_Prepare Info Column (Figma 37:6435) — clinic background presets ─
   Thumbnails exported from Figma Preview Thumbnail nodes. */
const BG_PRESETS = [
  { id: 'clinic-1', label: 'ห้องตรวจ 1', src: '/illustration/telemed/bg/clinic-1.png' },
  { id: 'clinic-2', label: 'ห้องตรวจ 2', src: '/illustration/telemed/bg/clinic-2.png' },
  { id: 'clinic-3', label: 'ห้องตรวจ 3', src: '/illustration/telemed/bg/clinic-3.png' },
  { id: 'clinic-4', label: 'ห้องตรวจ 4', src: '/illustration/telemed/bg/clinic-4.png' },
  { id: 'clinic-5', label: 'ห้องตรวจ 5', src: '/illustration/telemed/bg/clinic-5.png' },
  { id: 'clinic-6', label: 'ห้องตรวจ 6', src: '/illustration/telemed/bg/clinic-6.png' },
  { id: 'clinic-7', label: 'ห้องตรวจ 7', src: '/illustration/telemed/bg/clinic-7.png' },
  { id: 'clinic-8', label: 'ห้องตรวจ 8', src: '/illustration/telemed/bg/clinic-8.png' },
];

const PREPARE_PARTICIPANTS = [
  { id: 'p1', accent: '#0EA5E9' },
  { id: 'p2', accent: '#10B981' },
  { id: 'p3', accent: '#8B5CF6' },
];

const PREPARE_PREVIEW_FALLBACK_BG = 'linear-gradient(135deg, #232B36 0%, #131922 100%)';

const resolveVirtualBackgroundSrc = (bg, uploadedBg) => {
  if (bg === 'uploaded' && uploadedBg) return uploadedBg;
  const preset = BG_PRESETS.find((p) => p.id === bg);
  return preset?.src || null;
};

/** Map prepare/call bg selection → VirtualBackgroundFeed mode. */
const resolveVirtualBackgroundMode = (bg, backgroundSrc) => {
  if (bg === 'blur') return 'blur';
  if (backgroundSrc) return 'image';
  return 'none';
};

/* Figma 78:16880 — Preview Thumbnail selection drives Meet/Zoom-style
   person die-cut + virtual background compositing. */
const TelemedPreparePreview = ({
  backgroundSrc,
  blurMode = false,
  stream,
  camOn,
  camError,
  children,
}) => {
  const mode = blurMode ? 'blur' : resolveVirtualBackgroundMode(null, backgroundSrc);
  const showFeed = stream && camOn && !camError;

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        background: PREPARE_PREVIEW_FALLBACK_BG,
      }}
    >
      {showFeed ? (
        <VirtualBackgroundFeed
          stream={stream}
          mode={mode}
          backgroundSrc={blurMode ? null : backgroundSrc}
          mirror
        />
      ) : backgroundSrc && !blurMode ? (
        <img
          src={backgroundSrc}
          alt=''
          draggable={false}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            pointerEvents: 'none',
          }}
        />
      ) : (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 'var(--dim-space-200, 8px)',
          color: 'rgba(255,255,255,.7)',
        }}
        >
          <Sym name='videocam_off' size={40} color='rgba(255,255,255,.7)' />
          <span style={{ fontSize: 'var(--type-size-sm, 14px)' }}>ปิดกล้อง</span>
        </div>
      )}
      {children}
    </div>
  );
};

/* ── Small building blocks ─────────────────────────────────────────────── */

const Pill = ({ tone = 'neutral', icon, children }) => {
  const map = {
    neutral: { bg: 'var(--surface-neutral-secondary, #F1F3F5)', fg: 'var(--text-content-secondary, #565D6D)' },
    success: { bg: 'var(--surface-positive-secondary, #DCFCE7)', fg: 'var(--text-positive-primary, #067A4C)' },
    warn: { bg: 'var(--surface-warning-secondary, #FDF1E0)', fg: 'var(--text-warning-primary, #A5641B)' },
    danger: { bg: 'var(--surface-negative-secondary, #FBE8E8)', fg: 'var(--text-negative-primary, #C0392B)' },
    brand: { bg: 'var(--surface-brandPrimary-quaternary, #F4FBF8)', fg: 'var(--text-brandPrimary-default, #007549)' },
  };
  const c = map[tone] || map.neutral;
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 'var(--dim-space-100, 4px)',
        paddingTop: 'var(--dim-space-100, 4px)', paddingBottom: 'var(--dim-space-100, 4px)',
        paddingLeft: 'var(--dim-space-200, 8px)', paddingRight: 'var(--dim-space-200, 8px)',
        borderRadius: 'var(--dim-radius-round, 999px)',
        background: c.bg, color: c.fg,
        fontFamily: 'var(--type-family-body, "Sarabun", sans-serif)',
        fontSize: 'var(--type-size-xs, 12px)', fontWeight: 600, whiteSpace: 'nowrap', lineHeight: 1.4,
      }}
    >
      {icon && <Sym name={icon} size={14} color={c.fg} />}
      {children}
    </span>
  );
};

/* Round control button for the call action bar */
/* Call-control cell — Figma "Call Controls" (node 22:1463): a design-system
   circle icon button (Large 44) above a caption. Non-destructive controls use
   the Brand Circle Subdue Icon Button (outline); End Call uses the Danger
   Circle Icon Button (fill). `highlight` maps to the button's Active chrome
   for engaged toggles (sharing / chat open / recording). */
const ControlBtn = ({ icon, label, onClick, highlight = false, danger, mutedDanger, badge }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--dim-space-100, 4px)' }}>
    <div style={{ position: 'relative' }}>
      {danger ? (
        <DangerCircleIconButton variant='fill' size='lg' icon={icon} aria-label={label} onClick={onClick} />
      ) : mutedDanger ? (
        /* Muted mic / camera — Figma "Danger Circle Subdue Icon Button" (58:14582):
           red mic_off / videocam_off glyph + lighter tertiary red border (#FECACA). */
        <DangerCircleSubdueIconButton
          variant='outline' size='lg' icon={icon} aria-label={label} onClick={onClick}
          style={{ border: 'var(--dim-stroke-100, 1px) solid var(--border-dangerButton-tertiary, #FECACA)' }}
        />
      ) : (
        <BrandCircleSubdueIconButton
          variant='outline' size='lg' icon={icon} aria-label={label} active={highlight} onClick={onClick}
          /* Telemed "Call Controls" (Figma 22:1463) use the lighter tertiary
             border for the resting subdue control, not the standard #007549. */
          style={highlight ? undefined : { border: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimaryButton-tertiary, #C5EDDA)' }}
        />
      )}
      {badge > 0 && (
        <span style={{
          position: 'absolute', top: -2, right: -2, minWidth: 18, height: 18, padding: '0 4px',
          borderRadius: 'var(--dim-radius-round, 999px)', background: 'var(--surface-negative-primary, #D04949)',
          color: ONBRAND, fontSize: 'var(--type-size-2xs, 11px)', fontWeight: 'var(--type-weight-bold, 700)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none',
        }}
        >{badge}</span>
      )}
    </div>
    <span style={{
      fontFamily: 'var(--type-family-body, "Sarabun", sans-serif)', fontSize: 'var(--type-size-xs, 12px)',
      color: 'var(--text-content-secondary, #565D6D)', whiteSpace: 'nowrap',
    }}
    >{label}</span>
  </div>
);

/* Compact round button for the minimised (picture-in-picture) view */
const MiniBtn = ({ icon, onClick, active = true, danger, label }) => (
  <button
    type='button'
    onClick={onClick}
    aria-label={label}
    title={label}
    style={{
      width: 36, height: 36, borderRadius: 'var(--dim-radius-round, 999px)', border: 'none', cursor: 'pointer',
      background: danger ? 'var(--surface-negative-primary, #D04949)' : active ? 'var(--surface-neutral-secondary, #F1F3F5)' : 'var(--surface-neutral-tertiary, #E9ECEF)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}
  >
    <Sym name={icon} size={20} fill={danger ? 1 : 0} color={danger ? ONBRAND : 'var(--icon-content-primary, #171A1F)'} />
  </button>
);

/* A video tile — remote (patient) or self (doctor) */
const VideoTile = ({
  name,
  sub,
  camOn,
  micOn,
  big,
  accent = '#0EA5E9',
  speaking,
  stream,
  mirror = true,
  fit = 'cover',
  blurBackground = false,
  virtualBackgroundSrc = null,
}) => {
  const vbMode = blurBackground
    ? 'blur'
    : (virtualBackgroundSrc ? 'image' : 'none');
  const useVirtualFx = !!stream && (blurBackground || !!virtualBackgroundSrc);

  return (
  <div style={{
    position: 'relative', width: '100%', height: '100%', minHeight: big ? 320 : 132,
    borderRadius: 'var(--dim-radius-500, 20px)', overflow: 'hidden',
    background: camOn
      ? `linear-gradient(135deg, ${accent}22 0%, #1E293B 100%)`
      : 'linear-gradient(135deg, #232B36 0%, #131922 100%)',
    border: speaking ? '3px solid var(--surface-positive-primary, #08A768)' : '3px solid transparent',
    transition: 'border-color .2s ease',
  }}
  >
    {/* camera-off avatar / on placeholder */}
    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {stream ? (
        useVirtualFx ? (
          <VirtualBackgroundFeed
            stream={stream}
            mode={vbMode}
            backgroundSrc={blurBackground ? null : virtualBackgroundSrc}
            mirror={mirror}
          />
        ) : (
          <video
            autoPlay
            playsInline
            muted
            ref={(el) => { if (el && el.srcObject !== stream) el.srcObject = stream; }}
            style={{
              width: '100%',
              height: '100%',
              objectFit: fit,
              transform: mirror ? 'scaleX(-1)' : 'none',
            }}
          />
        )
      ) : camOn ? (
        <div style={{
          width: big ? 132 : 64, height: big ? 132 : 64, borderRadius: 'var(--dim-radius-round, 999px)',
          background: `linear-gradient(135deg, ${accent} 0%, #6366F1 100%)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 8px 24px rgba(0,0,0,.35)',
        }}
        >
          <Sym name='person' size={big ? 72 : 36} fill={1} color={ONBRAND} />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: big ? 'var(--dim-space-300, 12px)' : 'var(--dim-space-200, 8px)' }}>
          {big ? (
            <div style={{
              width: 120, height: 120, borderRadius: 'var(--dim-radius-round, 999px)',
              background: `linear-gradient(135deg, ${accent} 0%, #6366F1 100%)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(0,0,0,.35)',
              fontFamily: 'var(--type-family-heading-graphic2, "Mitr", sans-serif)',
              fontSize: 'var(--type-size-3xl, 32px)',
              fontWeight: 'var(--type-weight-medium, 500)',
              color: ONBRAND,
            }}
            >
              {getInitials(name)}
            </div>
          ) : (
            <Sym name='videocam_off' size={26} color='rgba(255,255,255,.55)' />
          )}
          {big && (
            <span style={{
              color: 'rgba(255,255,255,.85)',
              fontSize: 'var(--type-size-base, 16px)',
              fontWeight: 'var(--type-weight-bold, 700)',
              fontFamily: 'var(--type-family-heading-graphic2, "Mitr", sans-serif)',
              textAlign: 'center',
              maxWidth: '80%',
            }}
            >
              {name}
            </span>
          )}
          {!big && (
            <span style={{ color: 'rgba(255,255,255,.55)', fontSize: 11, fontFamily: 'var(--type-family-body, sans-serif)' }}>
              ปิดกล้อง
            </span>
          )}
        </div>
      )}
    </div>
    {/* name label */}
    <div style={{
      position: 'absolute', left: 'var(--dim-space-300, 12px)', bottom: 'var(--dim-space-300, 12px)',
      display: 'flex', alignItems: 'center', gap: 'var(--dim-space-150, 6px)',
      padding: '4px 10px', borderRadius: 'var(--dim-radius-200, 8px)', background: 'rgba(15,23,42,.6)',
      backdropFilter: 'blur(4px)',
    }}
    >
      <Sym name={micOn ? 'mic' : 'mic_off'} size={16} fill={1} color={micOn ? ONBRAND : '#FCA5A5'} />
      <span style={{ color: ONBRAND, fontSize: big ? 14 : 12, fontWeight: 600, fontFamily: 'var(--type-family-body, sans-serif)' }}>{name}</span>
      {sub && <span style={{ color: 'rgba(255,255,255,.7)', fontSize: 11 }}>· {sub}</span>}
    </div>
  </div>
  );
};

/* Read-only clinical field row */
const DataRow = ({ label, value, tone }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 'var(--dim-space-300, 12px)', padding: '6px 0' }}>
    <span style={{ color: 'var(--text-content-tertiary, #8A929A)', fontSize: 'var(--type-size-sm, 14px)', fontFamily: 'var(--type-family-body, sans-serif)' }}>{label}</span>
    <span style={{
      color: tone === 'warn' ? 'var(--text-warning-primary, #A5641B)' : 'var(--text-content-primary, #171A1F)',
      fontSize: 'var(--type-size-sm, 14px)', fontWeight: 600, fontFamily: 'var(--type-family-body, sans-serif)', textAlign: 'right',
    }}
    >{value}</span>
  </div>
);

const SectionTitle = ({ icon, children, right }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--dim-space-200, 8px)', marginBottom: 'var(--dim-space-200, 8px)' }}>
    {icon && <Sym name={icon} size={18} fill={1} color='var(--icon-brandPrimary-default, #007549)' />}
    <span style={{ fontWeight: 700, fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-primary, #171A1F)', fontFamily: 'var(--type-family-body, sans-serif)' }}>{children}</span>
    <div style={{ flex: 1 }} />
    {right}
  </div>
);

/* A rendered "document page" (mock lab report / X-ray) — shared by the
   preview modal and the in-meeting share stage. */
const DocumentPage = ({ doc }) => (
  <div style={{ background: '#FFFFFF', borderRadius: 'var(--dim-radius-200, 8px)', padding: 'var(--dim-space-600, 24px)', boxShadow: '0 2px 10px rgba(0,0,0,.12)', maxWidth: 460, width: '100%', margin: '0 auto' }}>
    <div style={{ textAlign: 'center', borderBottom: '2px solid var(--border-brandPrimary-default, #007549)', paddingBottom: 'var(--dim-space-300, 12px)', marginBottom: 'var(--dim-space-400, 16px)' }}>
      <div style={{ fontWeight: 700, fontSize: 'var(--type-size-base, 16px)', color: 'var(--text-brandPrimary-default, #007549)', fontFamily: 'var(--type-family-heading-graphic2, "Mitr", sans-serif)' }}>ศูนย์บริการสาธารณสุข 4 ดินแดง</div>
      <div style={{ fontSize: 11, color: 'var(--text-content-secondary, #565D6D)' }}>สำนักอนามัย กรุงเทพมหานคร</div>
    </div>
    <div style={{ fontWeight: 700, fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-primary, #171A1F)', marginBottom: 'var(--dim-space-300, 12px)', textAlign: 'center' }}>{doc.docTitle}</div>
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-content-secondary, #565D6D)', marginBottom: 'var(--dim-space-200, 8px)' }}>
      <span>ผู้รับบริการ: {PATIENT.fullName}</span>
      <span>HN {PATIENT.hn}</span>
    </div>
    <div style={{ fontSize: 11, color: 'var(--text-content-tertiary, #8A929A)', marginBottom: 'var(--dim-space-400, 16px)' }}>วันที่ตรวจ: {doc.date}</div>

    {doc.type === 'lab-table' && (
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--type-size-sm, 14px)' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border-neutral-tertiary, #DEE1E6)' }}>
            <th style={{ textAlign: 'left', padding: '6px 4px', color: 'var(--text-content-tertiary, #8A929A)', fontWeight: 600 }}>รายการ</th>
            <th style={{ textAlign: 'right', padding: '6px 4px', color: 'var(--text-content-tertiary, #8A929A)', fontWeight: 600 }}>ผล</th>
            <th style={{ textAlign: 'right', padding: '6px 4px', color: 'var(--text-content-tertiary, #8A929A)', fontWeight: 600 }}>ค่าอ้างอิง</th>
          </tr>
        </thead>
        <tbody>
          {doc.rows.map((r, i) => (
            <tr key={i} style={{ borderBottom: '1px solid var(--border-neutral-quaternary, #F1F3F5)' }}>
              <td style={{ padding: '6px 4px', color: 'var(--text-content-primary, #171A1F)' }}>{r.test}</td>
              <td style={{ padding: '6px 4px', textAlign: 'right', fontWeight: 700, color: r.flag === 'high' ? 'var(--text-warning-primary, #A5641B)' : 'var(--text-content-primary, #171A1F)' }}>
                {r.value} {r.unit}{r.flag === 'high' ? ' ↑' : ''}
              </td>
              <td style={{ padding: '6px 4px', textAlign: 'right', color: 'var(--text-content-tertiary, #8A929A)', fontSize: 12 }}>{r.ref}</td>
            </tr>
          ))}
        </tbody>
      </table>
    )}

    {doc.type === 'image' && (
      <div>
        <div style={{ height: 220, borderRadius: 'var(--dim-radius-200, 8px)', background: 'radial-gradient(circle at 50% 42%, #2b3442 0%, #0d1117 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 'var(--dim-space-300, 12px)', position: 'relative' }}>
          <Sym name='pulmonology' size={84} color='rgba(255,255,255,.35)' />
          <span style={{ position: 'absolute', top: 8, left: 8, fontSize: 10, color: 'rgba(255,255,255,.6)' }}>Chest PA · upright</span>
        </div>
        <div style={{ fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-primary, #171A1F)', lineHeight: 1.7 }}>{doc.reading}</div>
      </div>
    )}

    <div style={{ marginTop: 'var(--dim-space-400, 16px)', padding: '10px 12px', borderRadius: 'var(--dim-radius-200, 8px)', background: 'var(--surface-brandPrimary-quaternary, #F4FBF8)', fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-brandPrimary-default, #007549)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
      <Sym name='verified' size={16} fill={1} color='var(--icon-brandPrimary-default, #007549)' /> {doc.impression}
    </div>
    <div style={{ marginTop: 'var(--dim-space-500, 20px)', textAlign: 'right', fontSize: 12, color: 'var(--text-content-secondary, #565D6D)' }}>
      ผู้รายงานผล: {doc.type === 'image' ? 'พญ.รังสี วินิจฉัย (รังสีแพทย์)' : 'ทนพ. ห้องปฏิบัติการ'}
    </div>
  </div>
);

/* ── Right-panel tabs ──────────────────────────────────────────────────── */
const RIGHT_TABS = [
  { key: 'docs', label: 'เอกสาร', icon: 'description' },
  { key: 'health', label: 'ข้อมูลสุขภาพ', icon: 'ecg_heart' },
  { key: 'chat', label: 'แชท', icon: 'chat' },
];

export function TelemedConsultOverlay({ minimized = false, onMinimize, onMaximize, onClose }) {
  const history = useHistory();

  const [phase, setPhase] = useState('prepare'); // 'prepare' | 'in-call' | 'ended'
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [bg, setBg] = useState('clinic-1'); // selected virtual background (Figma 37:6435)
  const lastBgRef = useRef('clinic-1');
  const uploadInputRef = useRef(null);
  const [uploadedBg, setUploadedBg] = useState(null);
  const [patientCamOn, setPatientCamOn] = useState(true);
  const [patientMicOn] = useState(true);
  const [stream, setStream] = useState(null);        // doctor camera (getUserMedia)
  const [screenStream, setScreenStream] = useState(null); // shared screen (getDisplayMedia)
  const [sharing, setSharing] = useState(false);
  const [rightTab, setRightTab] = useState('chat');
  const [patientOpen, setPatientOpen] = useState(false); // TelemedPatientCard State=Hide (Figma 25:3185)
  const [peopleOpen, setPeopleOpen] = useState(false);  // participant-profiles popover
  const [chatOpen, setChatOpen] = useState(false);

  // PDPA / recording consent
  const [consent, setConsent] = useState('pending'); // 'pending' | 'granted' | 'denied'
  const [recording, setRecording] = useState(false);
  const [consentModal, setConsentModal] = useState(false);

  // device / network status (simulated)
  const [network, setNetwork] = useState('good'); // 'good' | 'weak' | 'lost'
  const [camError, setCamError] = useState(false);
  const [mediaErrorType, setMediaErrorType] = useState(null); // null | 'permission' | 'device-not-found'
  const [mediaHelpOpen, setMediaHelpOpen] = useState(false);

  // waiting room / admit flow
  const [patientPresent, setPatientPresent] = useState(false);
  const [admitOpen, setAdmitOpen] = useState(false);
  const [noShowAlert, setNoShowAlert] = useState(false);
  const [audioOnly, setAudioOnly] = useState(false);

  // shared-document preview (PDF / image)
  const [previewDoc, setPreviewDoc] = useState(null);
  // document presented onto the meeting's main stage
  const [sharedDoc, setSharedDoc] = useState(null);
  const shareDocument = (d) => { setSharedDoc(d); setPreviewDoc(null); if (sharing) stopShare(); };
  const stopShareDoc = () => setSharedDoc(null);

  // invite others to the meeting
  const [inviteOpen, setInviteOpen] = useState(false);
  const [participants, setParticipants] = useState([]); // extra invitees beyond doctor+patient
  const [pinnedId, setPinnedId] = useState(null);       // pinned participant → shown big
  const pinned = participants.find((p) => p.id === pinnedId) || null;
  const togglePin = (id) => setPinnedId((cur) => (cur === id ? null : id));
  const [linkCopied, setLinkCopied] = useState(false);
  const meetingLink = `https://phcis.bma.go.th/telemed/room/${(PATIENT.hn || 'ROOM').replace(/[^0-9A-Za-z]/g, '')}`;
  const copyLink = () => {
    try { navigator.clipboard?.writeText(meetingLink); } catch (e) { /* ignore */ }
    setLinkCopied(true);
    window.setTimeout(() => setLinkCopied(false), 1800);
  };
  const ROLE_PRESETS = [
    { name: 'แพทย์ที่ปรึกษา', role: 'consultant', accent: '#8B5CF6' },
    { name: 'เวชระเบียน', role: 'records', accent: '#0EA5E9' },
    { name: 'พยาบาล', role: 'nurse', accent: '#10B981' },
    { name: 'เภสัชกร', role: 'pharmacist', accent: '#F59E0B' },
  ];
  const invite = (preset) => {
    setParticipants((ps) => [...ps, { id: Date.now(), name: preset.name, role: preset.role, accent: preset.accent }]);
    setInviteOpen(false);
  };
  const removeParticipant = (id) => {
    setParticipants((ps) => ps.filter((p) => p.id !== id));
    setPinnedId((cur) => (cur === id ? null : cur));
  };

  // chat
  const [chat, setChat] = useState([
    { id: 1, me: false, text: 'สวัสดีค่ะคุณหมอ ได้ยินเสียงชัดเจนไหมคะ', t: '10:02' },
    { id: 2, me: true, text: 'สวัสดีครับ ได้ยินชัดเจนดีครับ วันนี้มีอาการอย่างไรบ้างครับ', t: '10:02' },
  ]);
  const [input, setInput] = useState('');
  const [chatBadge, setChatBadge] = useState(1);
  const chatScrollRef = useRef(null);

  const [summary, setSummary] = useState('ผู้ป่วยเบาหวานชนิดที่ 2 มาปรึกษาติดตามอาการผ่านระบบ Telemedicine อาการโดยรวมคงที่ ควบคุมอาหารได้ดีขึ้น แนะนำให้ทานยาต่อเนื่องและนัดตรวจ HbA1c ใน 3 เดือน');

  // call timer
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (phase !== 'in-call') return undefined;
    const id = window.setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => window.clearInterval(id);
  }, [phase]);

  // Doctor camera — REAL getUserMedia. Opens while camOn; stops on off/unmount.
  // A permission-denied / no-camera rejection flips to the camError banner.
  useEffect(() => {
    if ((phase !== 'in-call' && phase !== 'prepare') || !camOn || camError) { setStream(null); return undefined; }
    const md = navigator.mediaDevices;
    if (!md || !md.getUserMedia) {
      setMediaErrorType('device-not-found');
      setCamError(true);
      setCamOn(false);
      return undefined;
    }
    let active = true;
    let acquired = null;
    md.getUserMedia({ video: true, audio: false })
      .then((s) => {
        if (!active) { s.getTracks().forEach((t) => t.stop()); return; }
        acquired = s;
        setMediaErrorType(null);
        setStream(s);
      })
      .catch((err) => {
        if (active) {
          setMediaErrorType(classifyMediaError(err));
          setCamError(true);
          setCamOn(false);
        }
      });
    return () => { active = false; if (acquired) acquired.getTracks().forEach((t) => t.stop()); };
  }, [camOn, camError, phase]);

  const retryMedia = () => {
    setMediaErrorType(null);
    setCamError(false);
    setCamOn(true);
  };

  // Waiting room — simulate patient join request after doctor enters.
  useEffect(() => {
    if (phase !== 'in-call' || patientPresent || admitOpen || noShowAlert) return undefined;
    const admitTimer = window.setTimeout(() => setAdmitOpen(true), 4000);
    return () => window.clearTimeout(admitTimer);
  }, [phase, patientPresent, admitOpen, noShowAlert]);

  // No-show timeout while waiting alone in the room.
  useEffect(() => {
    if (phase !== 'in-call' || patientPresent) return undefined;
    const noShowTimer = window.setTimeout(() => setNoShowAlert(true), 60000);
    return () => window.clearTimeout(noShowTimer);
  }, [phase, patientPresent]);

  // Degrade to audio-only when connection is lost.
  useEffect(() => {
    if (network === 'lost') setAudioOnly(true);
  }, [network]);

  // Screen share — REAL getDisplayMedia (opens the browser's screen picker).
  const startShare = () => {
    const md = navigator.mediaDevices;
    if (!md || !md.getDisplayMedia) return;
    md.getDisplayMedia({ video: true })
      .then((s) => {
        setScreenStream(s);
        setSharing(true);
        // reflect it when the user stops sharing from the browser's own bar
        const track = s.getVideoTracks()[0];
        if (track) track.addEventListener('ended', () => { setScreenStream(null); setSharing(false); });
      })
      .catch(() => { /* user dismissed the picker — no-op */ });
  };
  const stopShare = () => {
    if (screenStream) screenStream.getTracks().forEach((t) => t.stop());
    setScreenStream(null);
    setSharing(false);
  };
  const toggleShare = () => (sharing ? stopShare() : startShare());

  useEffect(() => {
    if (chatOpen || rightTab === 'chat') setChatBadge(0);
  }, [chatOpen, rightTab, chat.length]);

  useEffect(() => {
    if (chatScrollRef.current) chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
  }, [chat, rightTab]);

  const sendChat = () => {
    const text = input.trim();
    if (!text) return;
    setChat((c) => [...c, { id: Date.now(), me: true, text, t: 'ตอนนี้' }]);
    setInput('');
  };

  const toggleRecord = () => {
    if (recording) { setRecording(false); return; }
    if (consent === 'granted') { setRecording(true); return; }
    setConsentModal(true); // must ask patient first (PDPA)
  };
  const grantConsent = () => { setConsent('granted'); setRecording(true); setConsentModal(false); };
  const denyConsent = () => { setConsent('denied'); setRecording(false); setConsentModal(false); };

  const endCall = () => {
    if (stream) stream.getTracks().forEach((t) => t.stop());
    if (screenStream) screenStream.getTracks().forEach((t) => t.stop());
    setRecording(false);
    setPhase('ended');
  };

  const enterCall = () => {
    if (camError || mediaErrorType) return;
    setElapsed(0);
    setPatientPresent(false);
    setAdmitOpen(false);
    setNoShowAlert(false);
    setAudioOnly(false);
    setPhase('in-call');
  };

  const confirmAdmit = () => {
    setPatientPresent(true);
    setAdmitOpen(false);
    setNoShowAlert(false);
  };

  const rejectAdmit = () => {
    setAdmitOpen(false);
  };

  const showPatientVideo = patientCamOn && network !== 'lost' && !audioOnly;
  const showDoctorVideo = camOn && !camError && !audioOnly;

  const onUploadBg = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setUploadedBg(url);
    lastBgRef.current = 'uploaded';
    setBg('uploaded');
  };

  const selectBackground = (nextBg) => {
    lastBgRef.current = nextBg;
    setBg(nextBg);
  };

  const toggleBlurBackground = () => {
    setBg((current) => {
      if (current === 'blur') return lastBgRef.current || 'clinic-1';
      lastBgRef.current = current;
      return 'blur';
    });
  };

  const virtualBackgroundSrc = resolveVirtualBackgroundSrc(bg, uploadedBg);

  const netTone = network === 'good' ? 'success' : network === 'weak' ? 'warn' : 'danger';
  const netLabel = network === 'good' ? 'สัญญาณดี' : network === 'weak' ? 'สัญญาณอ่อน' : 'สัญญาณหลุด';
  const cycleNetwork = () => setNetwork((n) => (n === 'good' ? 'weak' : n === 'weak' ? 'lost' : 'good'));

  /* ══════════════ PREPARE (Figma 37:4486) ══════════════
     Device check + virtual-background picker before entering the waiting room. */
  if (phase === 'prepare') {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 2147483000,
        display: 'flex', flexDirection: 'column', gap: 'var(--dim-space-600, 24px)',
        alignItems: 'center', background: 'var(--background-screen-brand-100, #F4FBF8)',
        fontFamily: 'var(--type-family-body, "Sarabun", sans-serif)', overflow: 'hidden',
      }}
      >
        {/* Header Bar */}
        <header style={{
          display: 'flex', alignItems: 'center', gap: 'var(--dim-space-600, 24px)',
          padding: 'var(--dim-space-300, 12px) var(--dim-space-600, 24px)', width: '100%',
          background: 'var(--surface-card-100, #FFFFFF)',
          borderBottom: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary, #E2F3EB)',
          flexShrink: 0,
        }}
        >
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 'var(--dim-space-050, 2px)' }}>
            <span style={{ fontFamily: 'var(--type-family-heading-graphic2, "Mitr", sans-serif)', fontSize: 'var(--type-size-base, 16px)', color: 'var(--text-brandPrimary-default, #007549)', lineHeight: 1.5 }}>ห้องตรวจรักษาออนไลน์</span>
            <span style={{ fontFamily: 'var(--type-family-body, "Sarabun", sans-serif)', fontSize: 'var(--type-size-xs, 12px)', fontWeight: 500, color: 'var(--text-topic-tertiary-subtext, #ADB2B7)', lineHeight: 1.5 }}>Session ID: TM-8842-2024</span>
          </div>
          <button type='button' onClick={onClose} aria-label='ปิด' title='ปิด' style={iconBtnStyle}>
            <Sym name='close' size={20} />
          </button>
        </header>

        {/* Content — two columns */}
        <div style={{ flex: 1, minHeight: 0, width: 1280, maxWidth: '100%', display: 'flex', gap: 'var(--dim-space-400, 16px)', alignItems: 'stretch', justifyContent: 'center', padding: '0 var(--dim-space-400, 16px)' }}>
          {/* Left — video preview column */}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 'var(--dim-space-400, 16px)', height: '100%' }}>
            {/* appointment card — TelemedPatientCard Hide/Show (Figma 25:3185) */}
            <div style={{ ...prepareCardStyle, gap: 'var(--dim-space-200, 8px)' }}>
              <span style={{ fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-secondary, #636B72)', lineHeight: 1.5 }}>คุณมีนัดหมายตรวจรักษาออนไลน์กับ</span>
              <TelemedPatientCard
                open={patientOpen}
                onToggle={() => setPatientOpen((v) => !v)}
              />
            </div>

            {/* video preview card */}
            <div style={{ ...prepareCardStyle, flex: 1, minHeight: 0, gap: 'var(--dim-space-400, 16px)' }}>
              <span style={{ fontFamily: 'var(--type-family-heading-graphic2, "Mitr", sans-serif)', fontSize: 'var(--type-size-base, 16px)', color: 'var(--text-content-default, #363B3F)', lineHeight: 1.5 }}>เตรียมตัวก่อนให้เข้าห้องตรวจ</span>
              <div style={{ flex: 1, minHeight: 0, position: 'relative', borderRadius: 'var(--dim-radius-400, 16px)', overflow: 'hidden' }}>
                <TelemedPreparePreview
                  backgroundSrc={virtualBackgroundSrc}
                  blurMode={bg === 'blur'}
                  stream={stream}
                  camOn={camOn}
                  camError={camError}
                >
                  {/* name badge */}
                  <div style={{ position: 'absolute', left: 'var(--dim-space-400, 16px)', bottom: 'var(--dim-space-400, 16px)', height: 32, display: 'inline-flex', alignItems: 'center', gap: 'var(--dim-space-150, 6px)', paddingLeft: 'var(--dim-space-300, 12px)', paddingRight: 'var(--dim-space-300, 12px)', borderRadius: 'var(--dim-radius-round, 9999px)', background: 'var(--surface-card-100, #FFFFFF)', zIndex: 1 }}>
                    <span style={{ fontSize: 'var(--type-size-sm, 14px)', fontWeight: 500, color: 'var(--text-content-default, #363B3F)' }}>{PATIENT.fullName} (ผู้รับบริการ)</span>
                  </div>
                </TelemedPreparePreview>
              </div>
              {/* device controls */}
              <div style={{ display: 'flex', gap: 'var(--dim-space-200, 8px)', alignItems: 'center', justifyContent: 'center' }}>
                {micOn ? (
                  <BrandCircleSubdueIconButton variant='outline' size='lg' icon='mic' aria-label='ปิดไมค์' onClick={() => setMicOn((v) => !v)} style={{ border: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimaryButton-tertiary, #C5EDDA)' }} />
                ) : (
                  /* Muted — Figma "Danger Circle Subdue Icon Button" (58:14582): red mic_off + tertiary red border. */
                  <DangerCircleSubdueIconButton variant='outline' size='lg' icon='mic_off' aria-label='เปิดไมค์' onClick={() => setMicOn((v) => !v)} style={{ border: 'var(--dim-stroke-100, 1px) solid var(--border-dangerButton-tertiary, #FECACA)' }} />
                )}
                {camOn && !camError ? (
                  <BrandCircleSubdueIconButton variant='outline' size='lg' icon='videocam' aria-label='ปิดกล้อง' onClick={() => setCamOn((v) => !v)} style={{ border: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimaryButton-tertiary, #C5EDDA)' }} />
                ) : (
                  <DangerCircleSubdueIconButton variant='outline' size='lg' icon='videocam_off' aria-label='เปิดกล้อง' onClick={() => { if (camError) { setCamError(false); setCamOn(true); } else setCamOn((v) => !v); }} style={{ border: 'var(--dim-stroke-100, 1px) solid var(--border-dangerButton-tertiary, #FECACA)' }} />
                )}
                <BrandCircleSubdueIconButton variant='outline' size='lg' icon='blur_on' aria-label='เบลอพื้นหลัง' active={bg === 'blur'} onClick={toggleBlurBackground} style={bg === 'blur' ? undefined : { border: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimaryButton-tertiary, #C5EDDA)' }} />
              </div>
            </div>

            {/* status tags — device selectors */}
            <div style={{ ...prepareCardStyle, flexDirection: 'row', gap: 'var(--dim-space-400, 16px)', alignItems: 'center', justifyContent: 'center' }}>
              {[
                { icon: 'mic', label: 'MacBook Air' },
                { icon: 'volume_up', label: 'AirPod (Bluetooth)' },
                { icon: 'volume_up', label: 'FaceTime HD Camera' },
              ].map((d) => (
                <div key={d.label} style={{ height: 40, display: 'inline-flex', alignItems: 'center', gap: 'var(--dim-space-150, 6px)', paddingLeft: 'var(--dim-space-300, 12px)', paddingRight: 'var(--dim-space-300, 12px)', borderRadius: 'var(--dim-radius-round, 9999px)', border: 'var(--dim-stroke-100, 1px) solid var(--border-brandtag-default, #E2E4E6)', background: 'var(--surface-brandtag-default, #FFFFFF)' }}>
                  <Sym name={d.icon} size={16} color='var(--text-brandtag-default, #4D5358)' />
                  <span style={{ fontSize: 'var(--type-size-sm, 14px)', fontWeight: 500, color: 'var(--text-brandtag-default, #4D5358)', whiteSpace: 'nowrap' }}>{d.label}</span>
                  <Sym name='keyboard_arrow_down' size={16} color='var(--text-brandtag-default, #4D5358)' />
                </div>
              ))}
            </div>
          </div>

          {/* Right — Info Column (Figma 37:6435) */}
          <aside
            style={{
              width: 448,
              flexShrink: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              height: '100%',
              paddingTop: 'var(--dim-space-400, 16px)',
              paddingLeft: 'var(--dim-space-400, 16px)',
              paddingRight: 'var(--dim-space-400, 16px)',
              paddingBottom: 0,
              background: 'var(--surface-card-100, #FFFFFF)',
              borderRadius: 'var(--dim-radius-500, 16px)',
              boxShadow: 'var(--shadow-brand-drop-bottom-200)',
            }}
          >
            {/* Topic — Hierarchy=Primary */}
            <div
              className='flex items-center w-full'
              style={{
                gap: 'var(--dim-space-300, 12px)',
                padding: 'var(--dim-space-200, 8px) var(--dim-space-300, 12px)',
                borderRadius: 'var(--dim-radius-400, 12px)',
                background: 'var(--surface-topic-default, #FFFFFF)',
                flexShrink: 0,
              }}
            >
              <div style={{ width: 'var(--dim-size-400, 20px)', paddingTop: 'var(--dim-space-050, 2px)', flexShrink: 0 }}>
                <Sym name='layers' size={20} color='var(--icon-brandPrimary-default, #007549)' />
              </div>
              <span
                style={{
                  flex: 1,
                  minWidth: 0,
                  fontFamily: 'var(--type-family-heading-graphic2, "Mitr", sans-serif)',
                  fontSize: 'var(--type-size-base, 16px)',
                  fontWeight: 'var(--type-weight-regular, 400)',
                  color: 'var(--text-topic-primary-title, #007549)',
                  lineHeight: 1.5,
                }}
              >
                เลือกพื้นหลัง
              </span>
            </div>

            {/* Upload section */}
            <div
              className='flex flex-col items-start w-full'
              style={{ gap: 'var(--dim-space-200, 8px)', padding: 'var(--dim-space-400, 16px) 0', flexShrink: 0 }}
            >
              <span
                style={{
                  fontFamily: 'var(--type-family-heading-graphic2, "Mitr", sans-serif)',
                  fontSize: 'var(--type-size-base, 16px)',
                  fontWeight: 'var(--type-weight-regular, 400)',
                  color: 'var(--text-topic-tertiary-title, #363B3F)',
                  lineHeight: 1.5,
                }}
              >
                ภาพที่อัปโหลดด้วยตนเอง
              </span>
              <button
                type='button'
                onClick={() => {
                  if (uploadedBg) selectBackground('uploaded');
                  else uploadInputRef.current?.click();
                }}
                aria-label='อัปโหลดภาพพื้นหลัง'
                aria-pressed={bg === 'uploaded'}
                style={{
                  width: 194,
                  height: 109,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 'var(--dim-space-600, 24px)',
                  cursor: 'pointer',
                  overflow: 'hidden',
                  borderRadius: 'var(--dim-radius-200, 8px)',
                  border: bg === 'uploaded'
                    ? 'var(--dim-stroke-200, 2px) solid var(--border-brandPrimary-default, #007549)'
                    : 'var(--dim-stroke-150, 1.5px) dashed var(--border-formbuilder-default, #C5EDDA)',
                  background: uploadedBg
                    ? `center / cover no-repeat url(${uploadedBg})`
                    : 'var(--surface-formbuilder-default, #F4FBF8)',
                }}
              >
                {!uploadedBg && (
                  <div className='flex flex-col items-center' style={{ gap: 'var(--dim-space-200, 8px)', flex: 1 }}>
                    <Sym name='image' size={20} color='var(--text-formbuilder-text, #007549)' />
                    <span
                      style={{
                        fontFamily: 'var(--type-family-body, "Sarabun", sans-serif)',
                        fontSize: 'var(--type-size-xs, 12px)',
                        fontWeight: 'var(--type-weight-medium, 500)',
                        color: 'var(--text-formbuilder-text, #007549)',
                        textAlign: 'center',
                        lineHeight: 1.5,
                      }}
                    >
                      อัปโหลดภาพ
                    </span>
                  </div>
                )}
              </button>
              <input ref={uploadInputRef} type='file' accept='image/*' onChange={onUploadBg} style={{ display: 'none' }} />
            </div>

            {/* Preset gallery — รูปภาพ */}
            <div
              className='flex flex-col items-start w-full'
              style={{ flex: 1, minHeight: 0, gap: 'var(--dim-space-200, 8px)', overflow: 'hidden' }}
            >
              <span
                style={{
                  fontFamily: 'var(--type-family-heading-graphic2, "Mitr", sans-serif)',
                  fontSize: 'var(--type-size-base, 16px)',
                  fontWeight: 'var(--type-weight-regular, 400)',
                  color: 'var(--text-topic-tertiary-title, #363B3F)',
                  lineHeight: 1.5,
                  flexShrink: 0,
                }}
              >
                รูปภาพ
              </span>
              <div
                className='flex flex-col w-full'
                style={{ flex: 1, minHeight: 0, gap: 'var(--dim-space-300, 12px)', overflowY: 'auto' }}
              >
                {[0, 2, 4, 6].map((start) => (
                  <div
                    key={start}
                    className='flex items-center w-full'
                    style={{ gap: 'var(--dim-space-300, 12px)', flexShrink: 0 }}
                  >
                    {BG_PRESETS.slice(start, start + 2).map((p) => {
                      const on = bg === p.id;
                      return (
                        <button
                          key={p.id}
                          type='button'
                          onClick={() => selectBackground(p.id)}
                          aria-label={p.label}
                          aria-pressed={on}
                          style={{
                            position: 'relative',
                            flex: '1 0 0',
                            minWidth: 0,
                            aspectRatio: '16 / 9',
                            padding: 0,
                            cursor: 'pointer',
                            borderRadius: 'var(--dim-radius-200, 8px)',
                            overflow: 'hidden',
                            border: on
                              ? 'var(--dim-stroke-200, 2px) solid var(--border-brandPrimary-default, #007549)'
                              : 'none',
                            background: 'var(--surface-neutral-secondary, #F1F3F5)',
                          }}
                        >
                          <img
                            src={p.src}
                            alt={p.label}
                            draggable='false'
                            style={{
                              position: 'absolute',
                              inset: 0,
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              borderRadius: 'var(--dim-radius-200, 8px)',
                              pointerEvents: 'none',
                            }}
                          />
                          {on && (
                            <span
                              style={{
                                position: 'absolute',
                                top: 'var(--dim-space-100, 4px)',
                                right: 'var(--dim-space-100, 4px)',
                                width: 'var(--dim-size-400, 20px)',
                                height: 'var(--dim-size-400, 20px)',
                                borderRadius: 'var(--dim-radius-full, 9999px)',
                                background: 'var(--surface-brandPrimaryButton-default, #007549)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <Sym name='check' size={12} fill={1} color='var(--text-brandPrimaryButton-on-brand, #FFFFFF)' />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* Action Group */}
            <div
              className='flex flex-col items-center w-full'
              style={{
                gap: 'var(--dim-space-300, 12px)',
                paddingTop: 'var(--dim-space-400, 16px)',
                paddingBottom: 'var(--dim-space-400, 16px)',
                background: 'var(--surface-card-100, #FFFFFF)',
                flexShrink: 0,
              }}
            >
              <div className='flex flex-col items-center justify-center w-full' style={{ gap: 'var(--dim-space-400, 16px)' }}>
                <button
                  type='button'
                  onClick={enterCall}
                  disabled={!!camError || !!mediaErrorType}
                  style={{
                    width: '100%',
                    maxWidth: 'var(--dim-size-2600, 384px)',
                    height: 'var(--dim-size-1100, 52px)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 'var(--dim-space-200, 8px)',
                    padding: 'var(--dim-space-200, 8px) var(--dim-space-600, 24px)',
                    border: 'none',
                    cursor: camError || mediaErrorType ? 'not-allowed' : 'pointer',
                    borderRadius: 'var(--dim-radius-200, 8px)',
                    background: camError || mediaErrorType
                      ? 'var(--surface-neutral-tertiary, #E9ECEF)'
                      : 'var(--surface-brandPrimaryButton-default, #007549)',
                    color: camError || mediaErrorType
                      ? 'var(--text-content-tertiary, #8A929A)'
                      : 'var(--text-brandPrimaryButton-on-brand, #FFFFFF)',
                    fontFamily: 'var(--type-family-heading-graphic2, "Mitr", sans-serif)',
                    fontSize: 'var(--type-size-lg, 18px)',
                    fontWeight: 'var(--type-weight-regular, 400)',
                    lineHeight: 1.5,
                    whiteSpace: 'nowrap',
                    boxShadow: camError || mediaErrorType ? 'none' : 'var(--shadow-brand-drop-bottom-200)',
                    opacity: camError || mediaErrorType ? 0.72 : 1,
                  }}
                >
                  <Sym name='stethoscope' size={24} color='var(--text-brandPrimaryButton-on-brand, #FFFFFF)' />
                  เข้าสู่ห้องรอตรวจ
                </button>

                <div className='flex items-center' style={{ gap: 'var(--dim-space-300, 12px)' }}>
                  <div className='flex items-center'>
                    {PREPARE_PARTICIPANTS.map((p, i) => (
                      <span
                        key={p.id}
                        style={{
                          width: 'var(--dim-size-600, 32px)',
                          height: 'var(--dim-size-600, 32px)',
                          borderRadius: 'var(--dim-radius-400, 16px)',
                          border: 'var(--dim-stroke-200, 2px) solid var(--border-image-default, #FFFFFF)',
                          marginLeft: i === 0 ? 0 : 'calc(var(--dim-space-300, 12px) * -1)',
                          background: `linear-gradient(135deg, ${p.accent}, #6366F1)`,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          overflow: 'hidden',
                          flexShrink: 0,
                        }}
                      >
                        <Sym name='person' size={18} fill={1} color='#FFFFFF' />
                      </span>
                    ))}
                    <span
                      style={{
                        width: 'var(--dim-size-600, 32px)',
                        height: 'var(--dim-size-600, 32px)',
                        borderRadius: 'var(--dim-radius-400, 16px)',
                        border: 'var(--dim-stroke-200, 2px) solid var(--border-image-default, #FFFFFF)',
                        marginLeft: 'calc(var(--dim-space-300, 12px) * -1)',
                        background: 'var(--surface-neutral-secondary, #F3F4F6)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontFamily: 'var(--type-family-body, "Sarabun", sans-serif)',
                        fontSize: 'var(--type-size-xxs, 10px)',
                        fontWeight: 'var(--type-weight-regular, 400)',
                        color: 'var(--text-content-secondary, #636B72)',
                        lineHeight: 1.5,
                        flexShrink: 0,
                      }}
                    >
                      +1
                    </span>
                  </div>
                  <BrandCircleSubdueIconButton
                    variant='outline'
                    size='xs'
                    icon='person_add'
                    aria-label='เชิญผู้เข้าร่วม'
                    onClick={() => setInviteOpen(true)}
                    style={{ border: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimaryButton-tertiary, #C5EDDA)' }}
                  />
                </div>
              </div>
            </div>
          </aside>
        </div>

        {/* Footer */}
        <footer style={{
          display: 'flex', alignItems: 'center', gap: 'var(--dim-space-600, 24px)', width: '100%', height: 56,
          padding: '14px var(--dim-space-600, 24px)', flexShrink: 0,
          background: 'var(--surface-navigation-default, #FFFFFF)',
          borderTop: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary, #F4F5F5)',
          fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-secondary, #636B72)',
        }}
        >
          <span style={{ flex: 1, minWidth: 0 }}>© 2026 ศูนย์บริการสาธารณสุข สำนักอนามัย กรุงเทพมหานคร</span>
          <div style={{ display: 'flex', gap: 'var(--dim-space-600, 24px)', alignItems: 'center', whiteSpace: 'nowrap' }}>
            <span>Privacy Policy</span>
            <span>Terms of Service</span>
          </div>
        </footer>

        {inviteOpen && (
          <div style={overlayStyle} onClick={() => setInviteOpen(false)}>
            <div style={{ ...cardStyle, width: 460, maxWidth: '92vw' }} onClick={(e) => e.stopPropagation()}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--dim-space-200, 8px)', marginBottom: 'var(--dim-space-200, 8px)' }}>
                <Sym name='group_add' size={24} fill={1} color='var(--icon-brandPrimary-default, #007549)' />
                <h2 style={{ margin: 0, fontSize: 'var(--type-size-lg, 18px)', fontWeight: 700, color: 'var(--text-content-primary, #171A1F)' }}>เชิญเข้าร่วมการปรึกษา</h2>
              </div>
              <p style={{ margin: '0 0 var(--dim-space-400, 16px)', fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-secondary, #565D6D)', lineHeight: 1.6 }}>
                แชร์ลิงก์ห้องประชุมให้ผู้เข้าร่วม — การเข้าร่วมอยู่ภายใต้ PDPA และต้องได้รับความยินยอมจากผู้รับบริการ
              </p>
              <div style={{ display: 'flex', gap: 'var(--dim-space-200, 8px)', alignItems: 'center', marginBottom: 'var(--dim-space-500, 20px)' }}>
                <div style={{ flex: 1, minWidth: 0, padding: '10px 12px', borderRadius: 'var(--dim-radius-300, 12px)', background: 'var(--surface-neutral-secondary, #F1F3F5)', fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-secondary, #565D6D)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{meetingLink}</div>
                <button type='button' onClick={copyLink} style={chipBtnStyle}>
                  <Sym name={linkCopied ? 'check' : 'content_copy'} size={16} /> {linkCopied ? 'คัดลอกแล้ว' : 'คัดลอก'}
                </button>
              </div>
              <div style={{ fontSize: 'var(--type-size-xs, 12px)', fontWeight: 700, color: 'var(--text-content-tertiary, #8A929A)', marginBottom: 'var(--dim-space-200, 8px)' }}>เชิญด่วน</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--dim-space-200, 8px)' }}>
                {ROLE_PRESETS.map((rp) => (
                  <button key={rp.role} type='button' onClick={() => invite(rp)} style={{ ...secondaryBtnStyle, width: '100%', justifyContent: 'flex-start', borderRadius: 'var(--dim-radius-300, 12px)' }}>
                    <span style={{ width: 28, height: 28, borderRadius: 'var(--dim-radius-round, 999px)', background: rp.accent, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Sym name='person' size={18} fill={1} color='#FFFFFF' />
                    </span>
                    {rp.name}
                    <span style={{ flex: 1 }} />
                    <Sym name='add' size={20} color='var(--icon-brandPrimary-default, #007549)' />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <AlertDialog
          open={!!mediaErrorType}
          type='destructive'
          title={mediaErrorType === 'device-not-found'
            ? 'ไม่พบอุปกรณ์กล้องหรือไมโครโฟน'
            : 'ไม่สามารถเข้าถึงกล้องหรือไมโครโฟน'}
          description={mediaErrorType === 'device-not-found'
            ? 'ระบบไม่พบกล้องหรือไมโครโฟนที่เชื่อมต่อ กรุณาเชื่อมต่ออุปกรณ์แล้วลองใหม่'
            : 'เบราว์เซอร์ไม่ได้รับอนุญาตให้ใช้กล้องหรือไมโครโฟน กรุณาอนุญาตในการตั้งค่าแล้วลองใหม่'}
          cancelLabel='ดูวิธีแก้ไข'
          confirmLabel='ลองใหม่'
          onCancel={() => setMediaHelpOpen(true)}
          onConfirm={retryMedia}
          onClose={() => setMediaErrorType(null)}
        />

        <AlertDialog
          open={mediaHelpOpen}
          type='info'
          title='วิธีแก้ไขการเข้าถึงกล้อง/ไมโครโฟน'
          description='1) ตรวจสอบว่ากล้อง/ไมค์เชื่อมต่อและไม่ถูกแอปอื่นใช้งาน 2) เปิดการตั้งค่าเว็บไซต์ → กล้อง/ไมโครโฟน → อนุญาต 3) รีเฟรชหน้าแล้วกด "ลองใหม่"'
          confirmLabel='เข้าใจแล้ว'
          showCancel={false}
          onConfirm={() => setMediaHelpOpen(false)}
          onClose={() => setMediaHelpOpen(false)}
        />
      </div>
    );
  }

  /* ══════════════ POST-CALL SUMMARY ══════════════ */
  if (phase === 'ended') {
    return (
      <div style={{ ...overlayStyle, alignItems: 'center' }}>
        <div style={{
          ...cardStyle, width: 448, maxWidth: '94vw', maxHeight: '88vh', overflowY: 'auto',
          padding: 'var(--dim-space-800, 32px)', fontFamily: 'var(--type-family-body, "Sarabun", sans-serif)',
        }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--dim-space-300, 12px)', marginBottom: 'var(--dim-space-600, 24px)' }}>
            <Sym name='check_circle' size={32} fill={1} color='var(--icon-alertdialog-success, #067A4C)' />
            <h1 style={{ margin: 0, fontSize: 'var(--type-size-lg, 18px)', fontWeight: 'var(--type-weight-bold, 700)', color: 'var(--text-alertdialog-text, #171A1F)', textAlign: 'center' }}>จบการปรึกษาแล้ว</h1>
            <p style={{ margin: 0, fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-alertdialog-subtext, #565D6D)', textAlign: 'center', lineHeight: 1.6 }}>
              {PATIENT.fullName} · HN {PATIENT.hn} · ระยะเวลา {fmtElapsed(elapsed)}
              {consent === 'granted' ? ' · บันทึกสายแล้ว' : ' · ไม่ได้บันทึกสาย'}
            </p>
          </div>

          <div style={{ fontWeight: 700, fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-primary, #171A1F)', marginBottom: 'var(--dim-space-150, 6px)' }}>สรุปคำปรึกษา</div>
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={3}
            style={{
              width: '100%', resize: 'vertical', borderRadius: 'var(--dim-radius-300, 12px)',
              border: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-tertiary, #DEE1E6)',
              padding: 'var(--dim-space-300, 12px)', fontFamily: 'inherit', fontSize: 'var(--type-size-sm, 14px)',
              color: 'var(--text-content-primary, #171A1F)', lineHeight: 1.6, outline: 'none', marginBottom: 'var(--dim-space-400, 16px)',
            }}
          />

          <div style={{ display: 'flex', gap: 'var(--dim-space-300, 12px)', marginBottom: 'var(--dim-space-600, 24px)' }}>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 'var(--dim-space-200, 8px)', padding: 'var(--dim-space-300, 12px)', borderRadius: 'var(--dim-radius-300, 12px)', background: 'var(--surface-brandPrimary-quaternary, #F4FBF8)' }}>
              <Sym name='pill' size={22} fill={1} color='var(--icon-brandPrimary-default, #007549)' />
              <div style={{ fontWeight: 700, fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-primary, #171A1F)' }}>ยา {POST_MEDS.length} รายการ</div>
            </div>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 'var(--dim-space-200, 8px)', padding: 'var(--dim-space-300, 12px)', borderRadius: 'var(--dim-radius-300, 12px)', background: 'var(--surface-brandPrimary-quaternary, #F4FBF8)' }}>
              <Sym name='science' size={22} fill={1} color='var(--icon-brandPrimary-default, #007549)' />
              <div style={{ fontWeight: 700, fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-primary, #171A1F)' }}>ตรวจ {POST_ORDERS.length} รายการ</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 'var(--dim-space-300, 12px)' }}>
            <button type='button' onClick={() => { onClose?.(); history.push('/treat/record'); }} style={{ ...secondaryBtnStyle, flex: 1, justifyContent: 'center' }}>
              บันทึกการรักษา
            </button>
            <button type='button' onClick={() => { onClose?.(); history.push('/m/payment'); }} style={{ ...primaryBtnStyle, flex: 1, justifyContent: 'center' }}>
              ไปชำระเงิน
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ══════════════ MINIMISED — floating picture-in-picture ══════════════
     Doctor keeps the call running while working in ระบบบันทึกการรักษา. */
  if (minimized) {
    return (
      <div style={{
        position: 'fixed', right: 'var(--dim-space-500, 20px)', bottom: 'var(--dim-space-500, 20px)',
        width: 320, zIndex: 2147483000, borderRadius: 'var(--dim-radius-500, 20px)', overflow: 'hidden',
        background: 'var(--surface-card-100, #FFFFFF)', boxShadow: 'var(--shadow-card-strong)',
        border: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary, #E9ECEF)',
        fontFamily: 'var(--type-family-body, "Sarabun", sans-serif)',
      }}
      >
        <div style={{ position: 'relative', height: 180 }}>
          <VideoTile
            name={sharing ? 'หน้าจอที่คุณแชร์' : PATIENT.fullName}
            camOn={showPatientVideo}
            micOn={patientMicOn}
            accent='#0EA5E9'
            stream={sharing && screenStream ? screenStream : undefined}
            mirror={false}
            fit={sharing ? 'contain' : 'cover'}
          />
          <div style={{ position: 'absolute', top: 8, left: 8, display: 'flex', gap: 6 }}>
            <Pill tone='danger' icon='schedule'>{fmtElapsed(elapsed)}</Pill>
            {recording && <Pill tone='danger' icon='fiber_manual_record'>REC</Pill>}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--dim-space-200, 8px)', padding: 'var(--dim-space-200, 8px) var(--dim-space-300, 12px)' }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-primary, #171A1F)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{PATIENT.fullName}</div>
            <div style={{ fontSize: 11, color: 'var(--text-content-tertiary, #8A929A)' }}>กำลังสนทนา · Telemedicine</div>
          </div>
          <MiniBtn icon={micOn ? 'mic' : 'mic_off'} active={micOn} onClick={() => setMicOn((v) => !v)} label='ไมค์' />
          <MiniBtn icon={camOn && !camError ? 'videocam' : 'videocam_off'} active={camOn && !camError} onClick={() => { if (camError) { setCamError(false); setCamOn(true); } else setCamOn((v) => !v); }} label='กล้อง' />
          <MiniBtn icon='open_in_full' onClick={onMaximize} label='ขยาย' />
          <MiniBtn icon='call_end' danger onClick={endCall} label='วางสาย' />
        </div>
      </div>
    );
  }

  /* ══════════════ IN-CALL ══════════════ */
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 2147483000,
      display: 'flex', flexDirection: 'column',
      background: 'var(--background-screen-brand-100, #F4FBF8)',
      fontFamily: 'var(--type-family-body, "Sarabun", sans-serif)', overflow: 'hidden',
    }}
    >
      {/* ── Header (Figma 22:2348) — title · session · recording · people · fullscreen ── */}
      {sharing && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--dim-space-400, 16px)',
          padding: 'var(--dim-space-200, 8px) var(--dim-space-600, 24px)',
          background: 'var(--surface-negative-secondary, #FBE8E8)',
          borderBottom: 'var(--dim-stroke-100, 1px) solid var(--border-negative-primary, #E7A0A0)',
          flexShrink: 0,
        }}
        >
          <Sym name='screen_share' size={20} color='var(--icon-negative-default, #C0392B)' />
          <span style={{ fontFamily: 'var(--type-family-heading-graphic2, "Mitr", sans-serif)', fontSize: 'var(--type-size-sm, 14px)', fontWeight: 'var(--type-weight-medium, 500)', color: 'var(--text-negative-primary, #C0392B)' }}>
            คุณกำลังแชร์หน้าจอ
          </span>
          <DangerButton size='sm' onClick={stopShare}>หยุดแชร์</DangerButton>
        </div>
      )}

      <header style={{
        display: 'flex', alignItems: 'center', gap: 'var(--dim-space-600, 24px)',
        padding: 'var(--dim-space-300, 12px) var(--dim-space-600, 24px)',
        background: 'var(--surface-card-100, #FFFFFF)',
        borderBottom: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary, #E2F3EB)',
        flexShrink: 0,
      }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--type-family-heading-graphic2, "Mitr", sans-serif)', fontSize: 'var(--type-size-base, 16px)', color: 'var(--text-brandPrimary-default, #007549)', lineHeight: 1.5 }}>ห้องปรึกษาแพทย์ออนไลน์</div>
          <button type='button' onClick={cycleNetwork} title='จำลองสัญญาณ (demo)' style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}>
            <div style={{ fontSize: 'var(--type-size-xs, 12px)', color: '#ADB2B7', fontWeight: 500 }}>Session ID: TM-8842-2024 · {netLabel}</div>
          </button>
        </div>

        {/* recording status pill */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--dim-space-150, 6px)', height: 32, paddingLeft: 'var(--dim-space-300, 12px)', paddingRight: 'var(--dim-space-300, 12px)', borderRadius: 'var(--dim-radius-round, 999px)', background: recording ? '#EC4899' : 'var(--surface-negative-secondary, #FBE8E8)', color: recording ? '#FFFFFF' : 'var(--text-negative-primary, #C0392B)' }}>
          <Sym name='radio_button_checked' size={16} fill={1} color={recording ? '#FFFFFF' : 'var(--text-negative-primary, #C0392B)'} />
          <span style={{ fontSize: 'var(--type-size-sm, 14px)', fontWeight: 500 }}>{recording ? 'กำลังบันทึกการสนทนา' : 'กำลังสนทนา'}</span>
        </div>

        {network === 'weak' && (
          <button type='button' onClick={cycleNetwork} title='จำลองสัญญาณ (demo)' style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer' }}>
            <ColorfulBadge style='yellow' hierarchy='primary' size='default' icon='wifi_off' width='hug'>
              สัญญาณอินเทอร์เน็ตไม่เสถียร · คุณภาพวิดีโออาจลดลง
            </ColorfulBadge>
          </button>
        )}

        {audioOnly && (
          <ColorfulBadge style='orange' hierarchy='secondary' size='default' icon='headphones' width='hug'>
            โหมดเสียงอย่างเดียว
          </ColorfulBadge>
        )}

        {/* participant profiles — avatar stack opens a popover (Figma 22:2210) */}
        {(() => {
          const people = [
            { name: DOCTOR.name, role: 'แพทย์ · คุณ', accent: '#10B981', you: true },
            { name: PATIENT.fullName, role: 'ผู้รับบริการ', accent: '#0EA5E9' },
            ...participants.map((p) => ({ id: p.id, name: p.name, role: 'ผู้เข้าร่วม', accent: p.accent })),
          ];
          const shown = people.slice(0, 3);
          const extra = people.length - shown.length;
          return (
            <div style={{ position: 'relative' }}>
              <button type='button' onClick={() => setPeopleOpen((v) => !v)} title='ผู้เข้าร่วม' aria-label='ผู้เข้าร่วม' style={{ display: 'flex', alignItems: 'center', border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}>
                {shown.map((pp, i) => (
                  <span key={i} style={{ width: 32, height: 32, borderRadius: 'var(--dim-radius-round, 999px)', border: '2px solid #FFFFFF', background: `linear-gradient(135deg,${pp.accent},#6366F1)`, marginLeft: i === 0 ? 0 : -12, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Sym name='person' size={18} fill={1} color='#FFFFFF' />
                  </span>
                ))}
                {extra > 0 && (
                  <span style={{ width: 32, height: 32, borderRadius: 'var(--dim-radius-round, 999px)', border: '2px solid #FFFFFF', background: '#F3F4F6', marginLeft: -12, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: 'var(--text-content-secondary, #636B72)', fontWeight: 600 }}>+{extra}</span>
                )}
              </button>
              {peopleOpen && (
                <>
                  <div onClick={() => setPeopleOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
                  <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 41, width: 280, background: 'var(--surface-card-100, #FFFFFF)', borderRadius: 'var(--dim-radius-300, 12px)', border: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary, #E9ECEF)', boxShadow: 'var(--shadow-card-strong)', padding: 'var(--dim-space-200, 8px)' }}>
                    <div style={{ padding: '6px 8px', fontWeight: 700, fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-primary, #171A1F)' }}>ผู้เข้าร่วม ({people.length})</div>
                    {people.map((pp, i) => (
                      <div key={pp.id || i} style={{ display: 'flex', alignItems: 'center', gap: 'var(--dim-space-300, 12px)', padding: '8px' }}>
                        <span style={{ width: 34, height: 34, borderRadius: 'var(--dim-radius-round, 999px)', background: `linear-gradient(135deg,${pp.accent},#6366F1)`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Sym name='person' size={20} fill={1} color='#FFFFFF' />
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-primary, #171A1F)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{pp.name}</div>
                          <div style={{ fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-secondary, #565D6D)' }}>{pp.role}</div>
                        </div>
                        {pp.id && (
                          <button type='button' onClick={() => removeParticipant(pp.id)} aria-label='นำออก' style={{ width: 26, height: 26, borderRadius: 'var(--dim-radius-round, 999px)', border: 'none', background: 'var(--surface-neutral-secondary, #F1F3F5)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Sym name='close' size={16} color='var(--icon-content-secondary, #565D6D)' />
                          </button>
                        )}
                      </div>
                    ))}
                    <button type='button' onClick={() => { setPeopleOpen(false); setInviteOpen(true); }} style={{ ...chipBtnStyle, width: '100%', justifyContent: 'center', marginTop: 'var(--dim-space-200, 8px)' }}>
                      <Sym name='group_add' size={16} /> เชิญเพิ่ม
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        })()}

        {/* fullscreen */}
        <button type='button' onClick={() => { try { document.documentElement.requestFullscreen?.(); } catch (e) { /* ignore */ } }} style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--dim-space-150, 6px)', height: 36, paddingLeft: 'var(--dim-space-300, 12px)', paddingRight: 'var(--dim-space-300, 12px)', borderRadius: 'var(--dim-radius-200, 8px)', border: '1px solid var(--border-brandPrimaryButton-tertiary, #C5EDDA)', background: 'transparent', cursor: 'pointer', color: 'var(--text-brandPrimary-default, #007549)', fontFamily: 'var(--type-family-heading-graphic2, "Mitr", sans-serif)', fontSize: 'var(--type-size-sm, 14px)' }}>
          <Sym name='fullscreen' size={16} color='var(--icon-brandPrimary-default, #007549)' /> เต็มจอ
        </button>
        {/* minimize (keep the PiP feature) */}
        <button type='button' onClick={onMinimize} aria-label='ย่อหน้าจอ' title='ย่อหน้าจอ (ใช้ระบบบันทึกการรักษาระหว่างสาย)' style={iconBtnStyle}>
          <Sym name='close_fullscreen' size={20} />
        </button>
      </header>

      {/* ── Patient info banner — TelemedPatientCard Hide/Show (Figma 25:3185) ── */}
      <div style={{ paddingLeft: 'var(--dim-space-600, 24px)', paddingRight: 'var(--dim-space-600, 24px)', paddingTop: 'var(--dim-space-400, 16px)', flexShrink: 0 }}>
        <TelemedPatientCard
          open={patientOpen}
          onToggle={() => setPatientOpen((v) => !v)}
        />
      </div>

      {/* ── Body: video stage + right panel ── */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {/* video stage */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, padding: 'var(--dim-space-400, 16px)', gap: 'var(--dim-space-300, 12px)' }}>
          {/* error / warning banners */}
          {network === 'lost' && (
            <Banner tone='danger' icon='wifi_off' title='การเชื่อมต่อหลุด'
              text='กำลังพยายามเชื่อมต่อใหม่… ระบบสลับเป็นโหมดเสียงอย่างเดียวชั่วคราว'
              action={<button type='button' onClick={() => { setNetwork('weak'); setAudioOnly(true); }} style={bannerBtnStyle}>ลองเชื่อมต่อใหม่</button>} />
          )}
          {network === 'weak' && (
            <Banner tone='warn' icon='network_check' title='สัญญาณไม่เสถียร'
              text='คุณภาพวิดีโออาจลดลงชั่วคราว ระบบปรับความละเอียดอัตโนมัติ' />
          )}
          {audioOnly && patientPresent && (
            <Banner tone='warn' icon='headphones' title='โหมดเสียงอย่างเดียว'
              text='วิดีโอถูกปิดชั่วคราวเพื่อรักษาการสนทนาให้ต่อเนื่อง' />
          )}
          {camError && (
            <Banner tone='danger' icon='videocam_off' title='ไม่พบกล้อง/ถูกปฏิเสธสิทธิ์'
              text='ตรวจสอบการอนุญาตใช้กล้องในเบราว์เซอร์ แล้วลองเปิดใหม่'
              action={<button type='button' onClick={() => { setCamError(false); setCamOn(true); }} style={bannerBtnStyle}>ลองอีกครั้ง</button>} />
          )}

          {/* main stage — screen share takes over when active, else patient */}
          <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
            {sharedDoc ? (
              <div style={{ width: '100%', height: '100%', borderRadius: 'var(--dim-radius-500, 20px)', overflow: 'auto', background: 'linear-gradient(135deg,#232B36 0%,#131922 100%)', padding: 'var(--dim-space-500, 20px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
                <DocumentPage doc={sharedDoc} />
              </div>
            ) : sharing && screenStream ? (
              <VideoTile big stream={screenStream} mirror={false} fit='contain' name='หน้าจอที่คุณแชร์' sub='กำลังแชร์' camOn micOn accent='#7A4CE5' />
            ) : pinned ? (
              <VideoTile big name={pinned.name} sub='ปักหมุดไว้' camOn micOn accent={pinned.accent} />
            ) : (
              <VideoTile big name={PATIENT.fullName} sub='ผู้รับบริการ' camOn={showPatientVideo} micOn={patientMicOn} accent='#0EA5E9' speaking={patientPresent} />
            )}

            {/* waiting for patient overlay */}
            {!patientPresent && !sharedDoc && !(sharing && screenStream) && (
              <div style={{
                position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 'var(--dim-space-300, 12px)',
                background: 'rgba(15,23,42,.55)', borderRadius: 'var(--dim-radius-500, 20px)', zIndex: 2,
              }}
              >
                <span className='inline-flex animate-spin' aria-hidden>
                  <Sym name='progress_activity' size={40} color='#FFFFFF' />
                </span>
                <span style={{ fontFamily: 'var(--type-family-heading-graphic2, "Mitr", sans-serif)', fontSize: 'var(--type-size-lg, 18px)', color: '#FFFFFF' }}>
                  รอผู้ป่วยเข้าห้อง…
                </span>
              </div>
            )}

            {/* unpin affordance on the big pinned tile */}
            {pinned && !(sharing && screenStream) && !sharedDoc && (
              <button type='button' onClick={() => setPinnedId(null)} style={{ position: 'absolute', left: 'var(--dim-space-400, 16px)', bottom: 'var(--dim-space-400, 16px)', display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 'var(--dim-radius-round, 999px)', border: 'none', cursor: 'pointer', background: 'rgba(15,23,42,.6)', color: '#FFFFFF', fontFamily: 'inherit', fontSize: 'var(--type-size-xs, 12px)', fontWeight: 600 }}>
                <Sym name='keep_off' size={16} color='#FFFFFF' /> เลิกปักหมุด
              </button>
            )}

            {/* patient PIP (top-left) when the main stage is something else */}
            {((sharing && screenStream) || pinned || sharedDoc) && (
              <div style={{ position: 'absolute', left: 'var(--dim-space-400, 16px)', top: 'var(--dim-space-400, 16px)', width: 200, height: 120, boxShadow: '0 8px 24px rgba(0,0,0,.28)', borderRadius: 'var(--dim-radius-500, 20px)' }}>
                <VideoTile name={PATIENT.fullName} sub='ผู้รับบริการ' camOn={showPatientVideo} micOn={patientMicOn} accent='#0EA5E9' />
              </div>
            )}

            {/* self PIP (bottom-right) — REAL camera feed */}
            <div style={{ position: 'absolute', right: 'var(--dim-space-400, 16px)', bottom: 'var(--dim-space-400, 16px)', width: 220, height: 132, boxShadow: '0 8px 24px rgba(0,0,0,.28)', borderRadius: 'var(--dim-radius-500, 20px)' }}>
              <VideoTile
                name={DOCTOR.name}
                sub='คุณ'
                camOn={showDoctorVideo}
                micOn={micOn}
                accent='#10B981'
                stream={showDoctorVideo ? stream : undefined}
                blurBackground={bg === 'blur'}
                virtualBackgroundSrc={bg === 'blur' ? null : virtualBackgroundSrc}
              />
            </div>

            {/* invited participants (top-right strip). The pinned one is shown
                big, so it is dropped from the strip. Hover a tile → pin / remove. */}
            {participants.filter((pt) => pt.id !== pinnedId).length > 0 && (
              <div style={{ position: 'absolute', right: 'var(--dim-space-400, 16px)', top: 'var(--dim-space-400, 16px)', display: 'flex', flexDirection: 'column', gap: 'var(--dim-space-200, 8px)' }}>
                {participants.filter((pt) => pt.id !== pinnedId).map((pt) => (
                  <div key={pt.id} style={{ position: 'relative', width: 168, height: 100, borderRadius: 'var(--dim-radius-400, 16px)', overflow: 'hidden', boxShadow: '0 6px 18px rgba(0,0,0,.25)' }}>
                    <VideoTile name={pt.name} camOn micOn accent={pt.accent} />
                    <div style={{ position: 'absolute', top: 4, right: 4, display: 'flex', gap: 4 }}>
                      <button type='button' onClick={() => togglePin(pt.id)} aria-label={`ปักหมุด ${pt.name}`} title='ปักหมุด' style={{ width: 22, height: 22, borderRadius: 'var(--dim-radius-round, 999px)', border: 'none', background: 'rgba(15,23,42,.6)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Sym name='push_pin' size={14} color='#FFFFFF' />
                      </button>
                      <button type='button' onClick={() => removeParticipant(pt.id)} aria-label='นำออก' style={{ width: 22, height: 22, borderRadius: 'var(--dim-radius-round, 999px)', border: 'none', background: 'rgba(15,23,42,.6)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Sym name='close' size={14} color='#FFFFFF' />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* screen share indicator */}
            {sharing && !sharedDoc && (
              <div style={{ position: 'absolute', left: 'var(--dim-space-400, 16px)', bottom: 'var(--dim-space-400, 16px)' }}>
                <Pill tone='brand' icon='screen_share'>กำลังแชร์หน้าจอ</Pill>
              </div>
            )}

            {/* shared document indicator + stop */}
            {sharedDoc && (
              <div style={{ position: 'absolute', left: 'var(--dim-space-400, 16px)', bottom: 'var(--dim-space-400, 16px)', display: 'flex', gap: 'var(--dim-space-200, 8px)', alignItems: 'center' }}>
                <Pill tone='brand' icon='description'>กำลังแชร์: {sharedDoc.name}</Pill>
                <button type='button' onClick={stopShareDoc} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 'var(--dim-radius-round, 999px)', border: 'none', cursor: 'pointer', background: 'rgba(15,23,42,.6)', color: '#FFFFFF', fontFamily: 'inherit', fontSize: 'var(--type-size-xs, 12px)', fontWeight: 600 }}>
                  <Sym name='stop_screen_share' size={16} color='#FFFFFF' /> หยุดแชร์
                </button>
              </div>
            )}
          </div>
        </div>

        {/* right panel */}
        <aside style={{
          width: 360, flexShrink: 0, background: 'var(--surface-card-100, #FFFFFF)',
          borderLeft: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary, #E9ECEF)',
          display: 'flex', flexDirection: 'column', minHeight: 0,
        }}
        >
          {/* tabs — pill bar (Figma 22:2725) */}
          <div style={{ padding: 'var(--dim-space-300, 12px) var(--dim-space-400, 16px)', flexShrink: 0, display: 'flex', justifyContent: 'center', background: 'var(--surface-card-100, #FFFFFF)' }}>
            <div style={{ display: 'inline-flex', gap: 2, padding: 4, borderRadius: 'var(--dim-radius-round, 999px)', background: 'var(--surface-tabpill-background, #E2F3EB)' }}>
              {RIGHT_TABS.map((t) => {
                const on = rightTab === t.key;
                return (
                  <button key={t.key} type='button' onClick={() => setRightTab(t.key)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 'var(--dim-space-150, 6px)',
                      paddingTop: 8, paddingBottom: 8, paddingLeft: 14, paddingRight: 14, borderRadius: 'var(--dim-radius-round, 999px)',
                      border: 'none', cursor: 'pointer', position: 'relative',
                      background: on ? 'var(--surface-tabpill-default, #FFFFFF)' : 'transparent',
                      boxShadow: on ? 'var(--shadow-card)' : 'none',
                    }}
                  >
                    <Sym name={t.icon} size={16} fill={on ? 1 : 0} color='var(--icon-brandPrimary-default, #007549)' />
                    <span style={{ fontFamily: 'var(--type-family-heading-graphic2, "Mitr", sans-serif)', fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-brandPrimary-default, #007549)', whiteSpace: 'nowrap' }}>{t.label}</span>
                    {t.key === 'chat' && chatBadge > 0 && (
                      <span style={{ position: 'absolute', top: 2, right: 2, width: 8, height: 8, borderRadius: 999, background: 'var(--surface-negative-primary, #D04949)' }} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* tab content */}
          <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
            {rightTab === 'health' && (
              <div style={{ padding: 'var(--dim-space-400, 16px)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 'var(--dim-space-300, 12px)' }}>
                  <Sym name='lock' size={14} color='var(--icon-content-tertiary, #8A929A)' />
                  <span style={{ fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary, #8A929A)' }}>ดูอย่างเดียว · แก้ไขได้ตามสิทธิ์ในระบบบันทึกการรักษา</span>
                </div>
                <div style={boxStyle}>
                  <SectionTitle icon='ecg_heart'>สัญญาณชีพล่าสุด</SectionTitle>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 var(--dim-space-400, 16px)' }}>
                    {VITALS.map((v) => (
                      <DataRow key={v.key} label={v.label} value={`${v.value} ${v.unit}`} tone={v.tone} />
                    ))}
                  </div>
                </div>
                <div style={{ ...boxStyle, marginTop: 'var(--dim-space-300, 12px)' }}>
                  <SectionTitle icon='allergy'>การแพ้ยา/อาหาร</SectionTitle>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--dim-space-150, 6px)' }}>
                    {ALLERGIES.map((a) => <Pill key={a} tone='danger' icon='warning'>{a}</Pill>)}
                  </div>
                </div>
                <div style={{ ...boxStyle, marginTop: 'var(--dim-space-300, 12px)' }}>
                  <SectionTitle icon='clinical_notes'>โรคประจำตัว</SectionTitle>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--dim-space-150, 6px)' }}>
                    {CHRONIC.map((c) => <Pill key={c} tone='warn' icon='medical_information'>{c}</Pill>)}
                  </div>
                </div>
              </div>
            )}

            {rightTab === 'chat' && (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--surface-card-100, #FFFFFF)' }}>
                <div ref={chatScrollRef} style={{ flex: 1, overflowY: 'auto', padding: 'var(--dim-space-300, 12px) var(--dim-space-400, 16px)', display: 'flex', flexDirection: 'column', gap: 'var(--dim-space-400, 16px)' }}>
                  {chat.map((m) => (
                    <div
                      key={m.id}
                      style={{
                        display: 'flex', flexDirection: 'column', gap: 'var(--dim-space-050, 2px)',
                        paddingLeft: m.me ? 'var(--dim-space-1200, 48px)' : 0,
                        paddingRight: m.me ? 0 : 'var(--dim-space-1200, 48px)',
                      }}
                    >
                      <div style={{
                        padding: 'var(--dim-space-400, 16px)',
                        background: m.me
                          ? 'var(--surface-brandprimary-secondary, #08A768)'
                          : 'var(--surface-card-indigo-100, #F3F5FC)',
                        borderRadius: m.me
                          ? 'var(--dim-radius-600, 24px) 0 var(--dim-radius-600, 24px) var(--dim-radius-600, 24px)'
                          : '0 var(--dim-radius-600, 24px) var(--dim-radius-600, 24px) var(--dim-radius-600, 24px)',
                        color: m.me ? 'var(--text-brandPrimary-on-brand, #FFFFFF)' : 'var(--text-content-default, #363B3F)',
                        fontFamily: 'var(--type-family-body, "Sarabun", sans-serif)',
                        fontSize: 'var(--type-size-sm, 14px)', lineHeight: 1.5,
                      }}
                      >{m.text}</div>
                      <div style={{
                        fontSize: 'var(--type-size-xxs, 10px)', lineHeight: 1.5,
                        color: 'var(--text-content-quaternary, #ADB2B7)',
                        textAlign: m.me ? 'right' : 'left',
                      }}
                      >{m.t}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 'var(--dim-space-200, 8px)', padding: 'var(--dim-space-300, 12px)', background: 'var(--surface-card-100, #FFFFFF)', borderTop: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary, #E2F3EB)' }}>
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') sendChat(); }}
                    placeholder='พิมพ์ข้อความ…'
                    style={{
                      flex: 1, borderRadius: 'var(--dim-radius-round, 999px)',
                      border: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-tertiary, #DEE1E6)',
                      padding: 'var(--dim-space-200, 8px) var(--dim-space-400, 16px)', fontFamily: 'inherit',
                      fontSize: 'var(--type-size-sm, 14px)', outline: 'none',
                    }}
                  />
                  <button type='button' onClick={sendChat} aria-label='ส่ง' style={{ ...iconBtnStyle, background: 'var(--surface-brandPrimary-bold, #007549)' }}>
                    <Sym name='send' size={20} fill={1} color={ONBRAND} />
                  </button>
                </div>
              </div>
            )}

            {rightTab === 'docs' && (
              <div style={{ padding: 'var(--dim-space-400, 16px)' }}>
                <SectionTitle icon='folder_shared'>เอกสาร/ผลตรวจที่แชร์ได้</SectionTitle>
                {SHARE_DOCS.map((d) => (
                  <div key={d.id} style={{ ...listItemStyle, justifyContent: 'space-between' }}>
                    <button type='button' onClick={() => setPreviewDoc(d)} style={{ display: 'flex', alignItems: 'center', gap: 'var(--dim-space-200, 8px)', minWidth: 0, flex: 1, border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', padding: 0 }}>
                      <Sym name={d.icon} size={22} fill={1} color='var(--icon-brandPrimary-default, #007549)' />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-primary, #171A1F)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-content-tertiary, #8A929A)' }}>{d.size} · แตะเพื่อดู</div>
                      </div>
                    </button>
                    <button type='button' onClick={() => shareDocument(d)} style={{ ...chipBtnStyle }}>
                      <Sym name='present_to_all' size={16} /> แชร์
                    </button>
                  </div>
                ))}
                {(sharedDoc || sharing) && (
                  <button type='button' onClick={() => { stopShareDoc(); if (sharing) stopShare(); }} style={{ ...secondaryBtnStyle, width: '100%', marginTop: 'var(--dim-space-300, 12px)', justifyContent: 'center' }}>
                    <Sym name='cancel_presentation' size={20} /> หยุดแชร์
                  </button>
                )}
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* ── Bottom control bar ── */}
      <footer style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--dim-space-400, 16px)',
        paddingTop: 'var(--dim-space-400, 16px)', paddingBottom: 'var(--dim-space-400, 16px)',
        paddingLeft: 'var(--dim-space-600, 24px)', paddingRight: 'var(--dim-space-600, 24px)',
        background: 'var(--surface-card-100, #FFFFFF)',
        borderTop: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary, #E9ECEF)', flexShrink: 0,
      }}
      >
        <ControlBtn icon={micOn ? 'mic' : 'mic_off'} label={micOn ? 'ปิดไมค์' : 'เปิดไมค์'} mutedDanger={!micOn} onClick={() => setMicOn((v) => !v)} />
        <ControlBtn icon={camOn && !camError ? 'videocam' : 'videocam_off'} label={camOn && !camError ? 'ปิดกล้อง' : 'เปิดกล้อง'} mutedDanger={!(camOn && !camError)} onClick={() => { if (camError) { setCamError(false); setCamOn(true); } else setCamOn((v) => !v); }} />
        <ControlBtn icon='screen_share' label={sharing ? 'หยุดแชร์' : 'แชร์หน้าจอ'} highlight={sharing} onClick={toggleShare} />
        {patientPresent && (
          <ControlBtn
            icon={patientCamOn ? 'videocam' : 'videocam_off'}
            label={patientCamOn ? 'กล้องผู้ป่วยปิด' : 'กล้องผู้ป่วยเปิด'}
            highlight={!patientCamOn}
            onClick={() => setPatientCamOn((v) => !v)}
          />
        )}
        <ControlBtn icon='chat' label='แชท' highlight={rightTab === 'chat'} badge={chatBadge} onClick={() => setRightTab('chat')} />
        <ControlBtn icon='radio_button_checked' label={recording ? 'หยุดบันทึก' : 'บันทึกสาย'} highlight={recording} onClick={toggleRecord} />
        <ControlBtn icon='call_end' label='วางสาย' danger onClick={endCall} />
      </footer>

      {/* ── PDPA recording-consent modal ── */}
      {consentModal && (
        <div style={overlayStyle} onClick={() => setConsentModal(false)}>
          <div style={{ ...cardStyle, width: 440, maxWidth: '90vw' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--dim-space-200, 8px)', marginBottom: 'var(--dim-space-300, 12px)' }}>
              <Sym name='shield_lock' size={24} fill={1} color='var(--icon-brandPrimary-default, #007549)' />
              <h2 style={{ margin: 0, fontSize: 'var(--type-size-lg, 18px)', fontWeight: 700, color: 'var(--text-content-primary, #171A1F)' }}>ขอความยินยอมบันทึกสาย</h2>
            </div>
            <p style={{ margin: 0, fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-secondary, #565D6D)', lineHeight: 1.6 }}>
              ตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล (PDPA) ระบบจะบันทึกภาพและเสียงของการปรึกษานี้
              <b> เฉพาะเมื่อผู้รับบริการยินยอมเท่านั้น </b>
              โปรดยืนยันการยินยอมของผู้รับบริการก่อนเริ่มบันทึก
            </p>
            <div style={{ display: 'flex', gap: 'var(--dim-space-300, 12px)', marginTop: 'var(--dim-space-500, 20px)', justifyContent: 'flex-end' }}>
              <button type='button' onClick={denyConsent} style={secondaryBtnStyle}>ผู้ป่วยไม่ยินยอม</button>
              <button type='button' onClick={grantConsent} style={primaryBtnStyle}>
                <Sym name='check' size={20} color={ONBRAND} /> ยินยอม เริ่มบันทึก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Invite others to the meeting ── */}
      {inviteOpen && (
        <div style={overlayStyle} onClick={() => setInviteOpen(false)}>
          <div style={{ ...cardStyle, width: 460, maxWidth: '92vw' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--dim-space-200, 8px)', marginBottom: 'var(--dim-space-200, 8px)' }}>
              <Sym name='group_add' size={24} fill={1} color='var(--icon-brandPrimary-default, #007549)' />
              <h2 style={{ margin: 0, fontSize: 'var(--type-size-lg, 18px)', fontWeight: 700, color: 'var(--text-content-primary, #171A1F)' }}>เชิญเข้าร่วมการปรึกษา</h2>
            </div>
            <p style={{ margin: '0 0 var(--dim-space-400, 16px)', fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-secondary, #565D6D)', lineHeight: 1.6 }}>
              แชร์ลิงก์ห้องประชุมให้ผู้เข้าร่วม — การเข้าร่วมอยู่ภายใต้ PDPA และต้องได้รับความยินยอมจากผู้รับบริการ
            </p>
            <div style={{ display: 'flex', gap: 'var(--dim-space-200, 8px)', alignItems: 'center', marginBottom: 'var(--dim-space-500, 20px)' }}>
              <div style={{ flex: 1, minWidth: 0, padding: '10px 12px', borderRadius: 'var(--dim-radius-300, 12px)', background: 'var(--surface-neutral-secondary, #F1F3F5)', fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-secondary, #565D6D)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{meetingLink}</div>
              <button type='button' onClick={copyLink} style={chipBtnStyle}>
                <Sym name={linkCopied ? 'check' : 'content_copy'} size={16} /> {linkCopied ? 'คัดลอกแล้ว' : 'คัดลอก'}
              </button>
            </div>
            <div style={{ fontSize: 'var(--type-size-xs, 12px)', fontWeight: 700, color: 'var(--text-content-tertiary, #8A929A)', marginBottom: 'var(--dim-space-200, 8px)' }}>เชิญด่วน</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--dim-space-200, 8px)' }}>
              {ROLE_PRESETS.map((rp) => (
                <button key={rp.role} type='button' onClick={() => invite(rp)} style={{ ...secondaryBtnStyle, width: '100%', justifyContent: 'flex-start', borderRadius: 'var(--dim-radius-300, 12px)' }}>
                  <span style={{ width: 28, height: 28, borderRadius: 'var(--dim-radius-round, 999px)', background: rp.accent, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Sym name='person' size={18} fill={1} color='#FFFFFF' />
                  </span>
                  {rp.name}
                  <span style={{ flex: 1 }} />
                  <Sym name='add' size={20} color='var(--icon-brandPrimary-default, #007549)' />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Shared-document preview (mock PDF / image per file name) ── */}
      {previewDoc && (
        <div style={overlayStyle} onClick={() => setPreviewDoc(null)}>
          <div style={{ background: 'var(--surface-card-100, #FFFFFF)', borderRadius: 'var(--dim-radius-400, 16px)', width: 560, maxWidth: '94vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: 'var(--shadow-card-strong)' }} onClick={(e) => e.stopPropagation()}>
            {/* toolbar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--dim-space-200, 8px)', padding: 'var(--dim-space-300, 12px) var(--dim-space-400, 16px)', borderBottom: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary, #E9ECEF)' }}>
              <Sym name={previewDoc.kind === 'image' ? 'image' : 'picture_as_pdf'} size={22} fill={1} color='var(--icon-negative-primary, #D04949)' />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-primary, #171A1F)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{previewDoc.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-content-tertiary, #8A929A)' }}>{previewDoc.size}</div>
              </div>
              <button type='button' onClick={() => shareDocument(previewDoc)} style={chipBtnStyle}><Sym name='present_to_all' size={16} /> แชร์ขึ้นจอ</button>
              <button type='button' onClick={() => setPreviewDoc(null)} aria-label='ปิด' style={iconBtnStyle}><Sym name='close' size={20} /></button>
            </div>
            {/* document page */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--dim-space-500, 20px)', background: 'var(--surface-neutral-tertiary, #E9ECEF)' }}>
              <DocumentPage doc={previewDoc} />
            </div>
          </div>
        </div>
      )}

      {/* ── Patient admit request (Figma 95:48873) ── */}
      {admitOpen && (
        <div style={overlayStyle} onClick={rejectAdmit}>
          <div
            style={{
              ...cardStyle, width: 480, maxWidth: '92vw',
              padding: 'var(--dim-space-800, 32px)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--dim-space-400, 16px)', marginBottom: 'var(--dim-space-600, 24px)' }}>
              <Sym name='door_open' size={32} fill={1} color='var(--icon-brandPrimary-default, #007549)' />
              <h2 style={{ margin: 0, fontFamily: 'var(--type-family-heading-graphic2, "Mitr", sans-serif)', fontSize: 'var(--type-size-xl, 20px)', fontWeight: 'var(--type-weight-regular, 400)', color: 'var(--text-content-primary, #171A1F)', textAlign: 'center' }}>
                ขอเข้าห้องตรวจรักษา
              </h2>
              <p style={{ margin: 0, fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-secondary, #565D6D)', textAlign: 'center', lineHeight: 1.6 }}>
                ผู้รับบริการขอเข้าร่วมการปรึกษา กรุณายืนยันก่อนเริ่มตรวจ
              </p>
            </div>
            <div style={{ marginBottom: 'var(--dim-space-600, 24px)' }}>
              <TelemedPatientCard open={false} onToggle={() => {}} />
            </div>
            <div style={{ display: 'flex', gap: 'var(--dim-space-300, 12px)' }}>
              <button type='button' onClick={rejectAdmit} style={{ ...secondaryBtnStyle, flex: 1, justifyContent: 'center' }}>ยกเลิก</button>
              <button type='button' onClick={confirmAdmit} style={{ ...primaryBtnStyle, flex: 1, justifyContent: 'center' }}>
                <Sym name='check' size={20} color={ONBRAND} /> ยืนยัน
              </button>
            </div>
          </div>
        </div>
      )}

      <AlertDialog
        open={noShowAlert}
        type='warning'
        title='ผู้ป่วยไม่เข้าร่วมตามนัด'
        description='ผู้รับบริการไม่ได้เข้าร่วมภายในเวลาที่กำหนด คุณสามารถวางสายและบันทึกผลได้'
        confirmLabel='วางสาย'
        showCancel={false}
        onConfirm={() => { setNoShowAlert(false); endCall(); }}
        onClose={() => setNoShowAlert(false)}
      />
    </div>
  );
}

/* ── Banner (error / warning) ── */
const Banner = ({ tone, icon, title, text, action }) => {
  const map = {
    danger: { bg: 'var(--surface-negative-secondary, #FBE8E8)', bd: 'var(--border-negative-primary, #E7A0A0)', fg: 'var(--text-negative-primary, #C0392B)' },
    warn: { bg: 'var(--surface-warning-secondary, #FDF1E0)', bd: 'var(--border-warning-primary, #F0C589)', fg: 'var(--text-warning-primary, #A5641B)' },
  };
  const c = map[tone] || map.warn;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 'var(--dim-space-300, 12px)',
      padding: 'var(--dim-space-300, 12px) var(--dim-space-400, 16px)', borderRadius: 'var(--dim-radius-300, 12px)',
      background: c.bg, border: `var(--dim-stroke-100, 1px) solid ${c.bd}`,
    }}
    >
      <Sym name={icon} size={22} fill={1} color={c.fg} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 'var(--type-size-sm, 14px)', color: c.fg }}>{title}</div>
        <div style={{ fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-secondary, #565D6D)' }}>{text}</div>
      </div>
      {action}
    </div>
  );
};

/* ── shared inline style objects ── */
const cardStyle = {
  background: 'var(--surface-card-100, #FFFFFF)', borderRadius: 'var(--dim-radius-400, 16px)',
  border: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary, #E9ECEF)',
  boxShadow: 'var(--shadow-card)', padding: 'var(--dim-space-500, 20px)',
};
const boxStyle = {
  background: 'var(--surface-neutral-secondary, #FAFAFA)', borderRadius: 'var(--dim-radius-300, 12px)',
  border: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary, #E9ECEF)', padding: 'var(--dim-space-400, 16px)',
};
/* Telemed_Prepare card (Figma 37:5681 / 55:6694 / 55:7253) — white card with
   the brand drop-shadow, 16px radius, 16px padding. */
const prepareCardStyle = {
  display: 'flex', flexDirection: 'column',
  padding: 'var(--dim-space-400, 16px)', borderRadius: 'var(--dim-radius-500, 16px)',
  background: 'var(--surface-card-100, #FFFFFF)', boxShadow: 'var(--shadow-brand-drop-bottom-100)',
};
const listItemStyle = {
  display: 'flex', alignItems: 'center', gap: 'var(--dim-space-300, 12px)',
  padding: 'var(--dim-space-300, 12px) 0', borderBottom: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary, #F1F3F5)',
};
const iconBtnStyle = {
  width: 40, height: 40, borderRadius: 'var(--dim-radius-round, 999px)', border: 'none',
  background: 'var(--surface-neutral-secondary, #F1F3F5)', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--icon-content-primary, #171A1F)', flexShrink: 0,
};
const primaryBtnStyle = {
  display: 'inline-flex', alignItems: 'center', gap: 'var(--dim-space-200, 8px)',
  padding: 'var(--dim-space-300, 12px) var(--dim-space-500, 20px)', borderRadius: 'var(--dim-radius-round, 999px)',
  border: 'none', background: 'var(--surface-brandPrimary-bold, #007549)', color: ONBRAND, cursor: 'pointer',
  fontFamily: 'var(--type-family-body, sans-serif)', fontSize: 'var(--type-size-base, 16px)', fontWeight: 600,
};
const secondaryBtnStyle = {
  display: 'inline-flex', alignItems: 'center', gap: 'var(--dim-space-200, 8px)',
  padding: 'var(--dim-space-300, 12px) var(--dim-space-500, 20px)', borderRadius: 'var(--dim-radius-round, 999px)',
  border: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-tertiary, #DEE1E6)',
  background: 'var(--surface-card-100, #FFFFFF)', color: 'var(--text-content-primary, #171A1F)', cursor: 'pointer',
  fontFamily: 'var(--type-family-body, sans-serif)', fontSize: 'var(--type-size-base, 16px)', fontWeight: 600,
};
const chipBtnStyle = {
  display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 'var(--dim-radius-round, 999px)',
  border: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-default, #007549)', background: 'var(--surface-brandPrimary-quaternary, #F4FBF8)',
  color: 'var(--text-brandPrimary-default, #007549)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'var(--type-size-xs, 12px)', fontWeight: 600, flexShrink: 0,
};
const bannerBtnStyle = {
  padding: '6px 14px', borderRadius: 'var(--dim-radius-round, 999px)', border: 'none',
  background: 'var(--surface-negative-primary, #D04949)', color: ONBRAND, cursor: 'pointer',
  fontFamily: 'inherit', fontSize: 'var(--type-size-xs, 12px)', fontWeight: 600, flexShrink: 0,
};
const overlayStyle = {
  position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15,23,42,.45)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--dim-space-400, 16px)',
};
