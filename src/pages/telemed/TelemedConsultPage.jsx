import React, { useEffect, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { DEFAULT_PATIENT } from '@/data/patientProfiles';
import { TREATMENT_DEFAULT_VITALS } from '@/data/treatmentVisits';
import BrandCircleSubdueIconButton from '@/components/button/BrandCircleSubdueIconButton';
import BrandCircleIconButton from '@/components/button/BrandCircleIconButton';
import DangerCircleIconButton from '@/components/button/DangerCircleIconButton';
import DangerCircleSubdueIconButton from '@/components/button/DangerCircleSubdueIconButton';
import DangerButton from '@/components/button/DangerButton';
import BrandButton from '@/components/button/BrandButton';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import AlertDialog from '@/components/popup/AlertDialog';
import Popover from '@/components/popup/Popover';
import Popup from '@/components/popup/Popup';
import VirtualBackgroundFeed from '@/components/telemed/VirtualBackgroundFeed';
import TelemedParticipantsPopup, {
  DEFAULT_TELEMED_EXTRA_PARTICIPANTS,
} from '@/components/telemed/TelemedParticipantsPopup';
import TelemedLeaveCallPopup from '@/components/telemed/TelemedLeaveCallPopup';
import TelemedLayoutPopup from '@/components/telemed/TelemedLayoutPopup';
import TelemedConnectingPopup from '@/components/telemed/TelemedConnectingPopup';
import TelemedRecordingConfirmPopup from '@/components/telemed/TelemedRecordingConfirmPopup';
import DraggablePip from '@/components/telemed/DraggablePip';
import AddressMapBlock from '@/components/forms/AddressMapBlock';
import { appendAuditEvent } from '@/pages/audit/auditData';
/* ── ส่วนต่อยอด TOR §1.13.1/.2/.6 + §4.3.3 (เพิ่มเข้ามาแบบ additive) ── */
import TelemedEmrPanel from '@/components/telemed/TelemedEmrPanel';
import TelemedOrderStrip from '@/components/telemed/TelemedOrderStrip';
import {
  openTelemedSession,
  transportLabel,
  TELEMED_SESSION_EVENTS,
} from '@/utils/telemedSessionBridge';
import {
  createTelemedPeer,
  gradeConnection,
  rtcSupported,
  TELEMED_RTC_STATE,
} from '@/utils/telemedRtc';
import { startTelemedAuditMirror } from '@/utils/telemedAuditPersist';
import {
  markPending,
  queueVisitSync,
  retryVisitSync,
  recordNoShowVisit,
  PHCIS_SYNC_STATUS,
  NO_SHOW_REASON,
  phcisRecordLink,
} from '@/utils/telemedPhcisBridge';
import {
  getTelemedVisits,
  getTelemedVisitByHn,
  addTelemedOrder,
  cancelTelemedOrder,
  updateTelemedOrder,
  addTelemedEvidence,
  setTelemedServiceWindow,
  subscribeTelemedVisits,
  formatClock as formatVisitClock,
} from '@/data/telemedVisits';
import { canRecordCall, attachRecording } from '@/data/telemedConsent';
import {
  getAssessmentByVisit,
  makeBlankAssessment,
  saveAssessment,
} from '@/data/telemedAssessments';
import { TELEMED_DEFAULT_ROLE, telemedActor } from '@/utils/telemedAccess';

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

/* Figma annotation (223:24870): speaking effect when the user talks. */
const TELEMED_SPEAKING_STYLE_ID = 'mih-telemed-speaking-style';
if (typeof document !== 'undefined' && !document.getElementById(TELEMED_SPEAKING_STYLE_ID)) {
  const style = document.createElement('style');
  style.id = TELEMED_SPEAKING_STYLE_ID;
  style.textContent = `
@keyframes mih-telemed-speaking-pulse {
  0%, 100% { box-shadow: 0 0 0 3px color-mix(in srgb, var(--surface-positive-primary, #08A768) 28%, transparent); }
  50% { box-shadow: 0 0 0 6px color-mix(in srgb, var(--surface-positive-primary, #08A768) 45%, transparent); }
}
/* ย่อ/ขยายหน้าต่างสายต้องมีจังหวะให้ตาตาม ไม่ใช่สลับภาพทันที — สองโหมดนี้เป็น
   คนละ subtree กัน การสลับจึงเป็นการ mount ใหม่ ใส่อนิเมชันขาเข้าให้ทั้งคู่ */
@keyframes mih-telemed-pip-in {
  from { opacity: 0; transform: scale(0.92) translateY(8px); }
  to   { opacity: 1; transform: none; }
}
@keyframes mih-telemed-room-in {
  from { opacity: 0; transform: scale(0.985); }
  to   { opacity: 1; transform: none; }
}
@media (prefers-reduced-motion: reduce) {
  .mih-telemed-video-tile--speaking { animation: none !important; }
  .mih-telemed-pip, .mih-telemed-room { animation: none !important; }
}
`;
  document.head.appendChild(style);
}

/* Figma Section/TelemedDevicePickers (78:16405) + Section/TelemedSpeakerOutput
   (103:53180): dropdown row hover uses list tokens (green text on hover). */
const TELEMED_DEVICE_ROW_STYLE_ID = 'mih-telemed-device-row-style';
if (typeof document !== 'undefined' && !document.getElementById(TELEMED_DEVICE_ROW_STYLE_ID)) {
  const style = document.createElement('style');
  style.id = TELEMED_DEVICE_ROW_STYLE_ID;
  style.textContent = `
.mih-telemed-device-row:hover {
  background: var(--surface-list-hover, #F4FBF8) !important;
  color: var(--text-list-hover, #007549) !important;
}
`;
  document.head.appendChild(style);
}

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

/* ระยะเวลารอผู้รับบริการก่อนไต่ระดับ no-show. Figma กำหนด 5 นาที → 10 นาที →
   หมดช่วงนัด; ค่าที่ใช้อยู่นี้ย่อลงเพื่อให้สาธิตครบวงจรได้ในรอบเดียว —
   เปลี่ยนเป็น 5 * 60_000 / 10 * 60_000 ได้ที่จุดนี้จุดเดียว */
const NO_SHOW_FIRST_MS = 60000;
const NO_SHOW_NEXT_MS = 60000;

/* สายที่กำลังคุยอยู่ต้องลอยเหนือทุกอย่างของหน้าที่เปิดค้างไว้ ไม่ว่าจะเป็นหน้าไหน:
   ในระบบนี้มี modal 1400 · popover 1450 · tooltip 1500 · เมนู/ไซด์บาร์ 1600 และ
   Spotlight 9999 ซึ่งทั้งหมดสูงกว่า --sm-z-overlay (1300) ที่ PiP เคยใช้ ผลคือ
   เปิดดรอปดาวน์หรือป๊อปอัปในหน้าที่ทำงานอยู่แล้วสายจะถูกบัง. ค่านี้เป็นค่าเดียวกับ
   ที่ป๊อปอัปของโมดูล Telemedicine ใช้อยู่แล้ว (TelemedConnectingPopup ฯลฯ) */
const TELEMED_Z_TOP = 2147483640;

/* รูปผู้รับบริการต้องคงที่ต่อหนึ่ง HN — เลือกจากคลังด้วยผลรวมอักขระของ HN
   ไม่ใช่สุ่มใหม่ทุกครั้งที่เรนเดอร์ */
const PATIENT_FACES_MALE = ['/avatars/somchai-mock.png', '/avatars/patient-male-d.png', '/avatars/patient-male-e.png'];
const PATIENT_FACES_FEMALE = ['/avatars/patient-female-a.png', '/avatars/patient-female-b.png', '/avatars/patient-female-c.png'];
const patientAvatarFor = (hn = '', sex = '') => {
  const pool = sex === 'หญิง' ? PATIENT_FACES_FEMALE : PATIENT_FACES_MALE;
  const n = String(hn).split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return pool[n % pool.length];
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

/* GIS pin for assessment location (TOR 1.13.5) — Phra Khanong mock coords. */
const ASSESSMENT_GIS = {
  lat: 13.754,
  lng: 100.5288,
  pinSaved: true,
  label: '124/64 พงษ์เวชอนุสรณ์ 2 สุขุมวิท บางจาก พระโขนง',
};

const DOCTOR = {
  name: 'พญ.สมหญิง รักษาดี',
  specialty: 'อายุรกรรม',
  avatar: '/avatars/telemed/staff-doctor-female-1.png',
};

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

/* TelemedPatientCard ถูกถอดออก — การ์ดผู้รับบริการเต็มความกว้างไม่ได้ใช้แล้ว
   ทั้งบนหน้าเตรียมตัวและในห้องปรึกษา (ตัวตนอยู่บนกรอบวิดีโอ/หัวห้องแทน) */

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

/* Figma 272:21370 — avatar stack uses real staff photos, not initials/icons. */
/* รูปคนละคนที่ครอปเป็นรายบุคคลแล้ว — เดิมชี้ไปที่ doctor-a (แผ่นรวม 5 รูป) และ
   doctor-f (ภาพครึ่งตัวคนอยู่ชิดขวา) วงกลมจึงได้หลายหน้าซ้อนกัน/พื้นที่ว่าง */
const PREPARE_PARTICIPANTS = [
  { id: 'p1', name: 'พญ.สมหญิง รักษาดี', avatar: '/avatars/telemed/staff-doctor-female-1.png' },
  { id: 'p2', name: 'นพ.ธนกร ใจดี', avatar: '/avatars/telemed/staff-doctor-male-1.png' },
  { id: 'p3', name: 'พยาบาลวรรณา สุขใจ', avatar: '/avatars/telemed/staff-nurse-female-1.png' },
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
    neutral: { bg: 'var(--surface-neutral-secondary, #F1F3F5)', fg: 'var(--text-content-secondary, #636B72)' },
    success: { bg: 'var(--surface-positive-secondary, #DCFCE7)', fg: 'var(--text-positive-primary, #067A4C)' },
    warn: { bg: 'var(--surface-warning-secondary, #FDF1E0)', fg: 'var(--text-warning-primary, #A5641B)' },
    danger: { bg: 'var(--surface-negative-secondary, #FBE8E8)', fg: 'var(--text-negative-primary, #B91C1C)' },
    brand: { bg: 'var(--surface-brandPrimary-quaternary, #F4FBF8)', fg: 'var(--text-brandPrimary-default, #007549)' },
  };
  const c = map[tone] || map.neutral;
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 'var(--dim-space-100, 4px)',
        paddingTop: 'var(--dim-space-100, 4px)', paddingBottom: 'var(--dim-space-100, 4px)',
        paddingLeft: 'var(--dim-space-200, 8px)', paddingRight: 'var(--dim-space-200, 8px)',
        borderRadius: 'var(--dim-radius-full, 9999px)',
        background: c.bg, color: c.fg,
        fontFamily: 'var(--type-family-body, "Sarabun", sans-serif)',
        fontSize: 'var(--type-size-xs, 12px)', fontWeight: 'var(--type-weight-medium, 500)', whiteSpace: 'nowrap', lineHeight: 1.4,
      }}
    >
      {icon && <Sym name={icon} size={14} color={c.fg} />}
      {children}
    </span>
  );
};

/* Figma Section/TelemedDevicePickers (78:16405) — mic/speaker/camera options. */
const TELEMED_MIC_DEVICES = [
  { value: 'macbook-air', label: 'MacBook Air' },
  { value: 'macbook-pro-mic', label: 'MacBook Pro Microphone' },
  { value: 'airpods-pro', label: 'AirPods Pro' },
];
const TELEMED_SPEAKER_DEVICES = [
  { value: 'built-in', label: 'ลำโพงในตัว (Built-in)' },
  { value: 'airpods-pro', label: 'AirPods Pro (Bluetooth)' },
  { value: 'sony-wh1000xm5', label: 'Sony WH-1000XM5' },
  { value: 'jbl-flip6', label: 'JBL Flip 6' },
];
const TELEMED_CAMERA_DEVICES = [
  { value: 'facetime-hd', label: 'FaceTime HD Camera' },
  { value: 'logitech-c920', label: 'Logitech C920 HD Pro' },
];

/* Device picker pill — Figma Section/TelemedDevicePickers (78:16405) /
   Section/TelemedSpeakerOutput (103:53180): a brandtag pill trigger that
   opens a dropdown list (list tokens: hover highlight, checkmark on the
   selected device, matching the shared Dropdown popover chrome). */
const DevicePickerPill = ({ icon, value, options, onChange, ariaLabel }) => {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef(null);

  const selected = options.find((o) => o.value === value) || options[0];
  const tagColor = open ? 'var(--text-brandtag-selected, #007549)' : 'var(--text-brandtag-default, #4D5358)';

  return (
    <>
      <span ref={anchorRef} className='inline-flex' style={{ position: 'relative', minWidth: 0, flexShrink: 1 }}>
        <button
          type='button'
          onClick={() => setOpen((v) => !v)}
          aria-haspopup='listbox'
          aria-expanded={open}
          aria-label={ariaLabel}
          style={{
            height: 40, display: 'inline-flex', alignItems: 'center', gap: 'var(--dim-space-150, 6px)',
            minWidth: 0, maxWidth: '100%',
            paddingLeft: 'var(--dim-space-300, 12px)', paddingRight: 'var(--dim-space-300, 12px)',
            borderRadius: 'var(--dim-radius-full, 9999px)', cursor: 'pointer',
            border: `var(--dim-stroke-100, 1px) solid ${open ? 'var(--border-brandtag-selected, #C5EDDA)' : 'var(--border-brandtag-default, #E2E4E6)'}`,
            background: open ? 'var(--surface-brandtag-selected, #F4FBF8)' : 'var(--surface-brandtag-default, #FFFFFF)',
          }}
        >
          <Sym name={icon} size={16} color={tagColor} />
          <span style={{ fontSize: 'var(--type-size-sm, 14px)', fontWeight: 'var(--type-weight-medium, 500)', color: tagColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>
            {selected?.label}
          </span>
          <Sym
            name='keyboard_arrow_down'
            size={16}
            color={tagColor}
            style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 160ms ease' }}
          />
        </button>
      </span>

      {/* แถวเลือกอุปกรณ์อยู่ติดขอบล่างของการ์ด — dropdown ที่วางแบบ absolute
          ในตัวเองจะถูกกรอบ/ขอบจอตัดหัวท้าย. ใช้ Popover ของระบบซึ่ง portal ไป
          document.body, ตรึงตำแหน่งแบบ fixed และพลิกขึ้นด้านบนเองเมื่อพื้นที่
          ด้านล่างไม่พอ (ตัวเดียวกับที่ DatePicker/เมนูแถวใช้อยู่) */}
      <Popover
        open={open}
        onClose={() => setOpen(false)}
        anchorRef={anchorRef}
        style={{ zIndex: TELEMED_Z_TOP + 1 }}
      >
        <div
          role='listbox'
          aria-label={ariaLabel}
          style={{
            minWidth: 264, maxHeight: 260, overflowY: 'auto',
            padding: 'var(--dim-space-100, 4px)',
            borderRadius: 'var(--dim-radius-400, 12px)',
            background: 'var(--surface-dropdown-default, #FFFFFF)',
            border: 'var(--dim-stroke-100, 1px) solid var(--border-dropdown-default, #E2E4E6)',
            boxShadow: 'var(--shadow-dropdown)',
          }}
        >
          {options.length === 0 ? (
            <div style={{ padding: 'var(--dim-space-300, 12px)', fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-tertiary, #858C92)', textAlign: 'center' }}>
              ไม่พบอุปกรณ์เสียง
            </div>
          ) : options.map((o) => {
            const isSelected = o.value === value;
            return (
              <button
                key={o.value}
                type='button'
                role='option'
                aria-selected={isSelected}
                onClick={() => { onChange(o.value); setOpen(false); }}
                className='mih-telemed-device-row'
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 'var(--dim-space-200, 8px)',
                  minHeight: 40, padding: 'var(--dim-space-200, 8px) var(--dim-space-300, 12px)',
                  borderRadius: 'var(--dim-radius-150, 6px)', border: 'none', cursor: 'pointer', textAlign: 'left',
                  background: 'transparent', color: 'var(--text-list-default, #4D5358)',
                  fontFamily: 'var(--type-family-body, "Sarabun", sans-serif)', fontSize: 'var(--type-size-sm, 14px)',
                }}
              >
                <span style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {o.label}
                </span>
                {isSelected && <Sym name='check' size={16} color='var(--icon-list-check, #007549)' />}
              </button>
            );
          })}
        </div>
      </Popover>
    </>
  );
};

/* Round control button for the call action bar */
/* Call-control cell — Figma "Call Controls" (node 22:1463): a design-system
   circle icon button (Large 44) above a caption. Non-destructive controls use
   the Brand Circle Subdue Icon Button (outline); End Call uses the Danger
   Circle Icon Button (fill). `highlight` maps to the button's Active chrome
   for engaged toggles (sharing / chat open / recording). */
/* มาตรวัดเสียงไมค์ของแพทย์ — ฝั่งผู้รับบริการมีหน้า "ตรวจสอบความพร้อม" พร้อม
   มาตรวัดเสียงมาตั้งแต่แรก แต่ฝั่งแพทย์เห็นแค่ภาพตัวเอง จึงไม่มีทางรู้ว่าไมค์ดัง
   หรือเปล่าจนกว่าจะเข้าสายไปแล้ว. อ่านระดับจาก stream จริงที่จะใช้คุยจริง */
const MicLevelMeter = ({ stream, bars = 10 }) => {
  const [level, setLevel] = useState(0);

  useEffect(() => {
    const track = stream?.getAudioTracks?.()[0];
    if (!track) { setLevel(0); return undefined; }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return undefined;
    let ctx = null;
    let source = null;
    let id = null;
    try {
      ctx = new Ctx();
      source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      /* 10 ครั้ง/วินาทีพอให้ตาเห็นว่าขยับ และไม่กิน CPU เท่า requestAnimationFrame */
      id = window.setInterval(() => {
        analyser.getByteTimeDomainData(data);
        let peak = 0;
        for (let i = 0; i < data.length; i += 1) {
          const v = Math.abs(data[i] - 128);
          if (v > peak) peak = v;
        }
        setLevel(Math.min(1, peak / 48));
      }, 100);
    } catch {
      return undefined;
    }
    return () => {
      if (id != null) window.clearInterval(id);
      try { source?.disconnect(); } catch { /* ignore */ }
      try { ctx?.close(); } catch { /* ignore */ }
    };
  }, [stream]);

  const lit = Math.round(level * bars);
  const hint = stream ? 'ระดับเสียงไมโครโฟน — ลองพูดเพื่อทดสอบ' : 'ยังไม่พบไมโครโฟน';
  /* แถบสั้น ๆ ต่อท้ายตัวเลือกไมค์: อธิบายตัวเองอยู่แล้วจากบริบท และไม่ดันแถว
     ตัวเลือกอุปกรณ์ให้ตกบรรทัด — คำอธิบายเต็มอยู่ใน title/aria-label */
  return (
    <div
      className='flex items-center'
      title={hint}
      aria-label={hint}
      style={{ gap: 'var(--dim-space-200, 8px)', flexShrink: 0 }}
    >
      {!stream && <Sym name='mic_off' size={16} color='var(--text-content-tertiary, #858C92)' />}
      <div className='flex items-center' aria-hidden style={{ gap: 'var(--dim-space-050, 2px)' }}>
        {Array.from({ length: bars }).map((_, i) => (
          <span
            key={`mic-bar-${i}`}
            style={{
              width: 'var(--dim-space-100, 4px)',
              height: 'var(--dim-size-300, 16px)',
              borderRadius: 'var(--dim-radius-100, 4px)',
              background: i < lit
                ? 'var(--surface-positive-primary, #08A768)'
                : 'var(--surface-neutral-tertiary, #F4F5F5)',
            }}
          />
        ))}
      </div>
    </div>
  );
};

const ControlBtn = ({ icon, label, onClick, highlight = false, danger, mutedDanger, badge, disabled = false, title }) => (
  <div
    title={title}
    style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--dim-space-100, 4px)',
      opacity: disabled ? 0.45 : 1,
      pointerEvents: disabled ? 'none' : 'auto',
    }}
  >
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
          borderRadius: 'var(--dim-radius-full, 9999px)', background: 'var(--surface-negative-primary, #D04949)',
          color: ONBRAND, fontSize: 'var(--type-size-xxs, 10px)', fontWeight: 'var(--type-weight-bold, 700)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none',
        }}
        >{badge}</span>
      )}
    </div>
    <span style={{
      fontFamily: 'var(--type-family-body, "Sarabun", sans-serif)', fontSize: 'var(--type-size-xs, 12px)',
      fontWeight: 'var(--type-weight-regular, 400)',
      color: 'var(--text-content-secondary, #636B72)', whiteSpace: 'nowrap', lineHeight: 1.5,
    }}
    >{label}</span>
  </div>
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
  avatar = null, /* Figma 154:28137 — camera-off with uploaded profile picture */
}) => {
  const vbMode = blurBackground
    ? 'blur'
    : (virtualBackgroundSrc ? 'image' : 'none');
  const useVirtualFx = !!stream && (blurBackground || !!virtualBackgroundSrc);

  return (
  <div style={{
    position: 'relative', width: '100%', height: '100%', minHeight: 0,
    borderRadius: 'var(--dim-radius-500, 16px)', overflow: 'hidden',
    background: camOn
      ? `linear-gradient(135deg, ${accent}22 0%, #1E293B 100%)`
      : 'linear-gradient(135deg, #232B36 0%, #131922 100%)',
    border: speaking ? '3px solid var(--surface-positive-primary, #08A768)' : '3px solid transparent',
    boxShadow: speaking ? '0 0 0 4px color-mix(in srgb, var(--surface-positive-primary, #08A768) 35%, transparent)' : 'none',
    transition: 'border-color .2s ease, box-shadow .2s ease',
    animation: speaking ? 'mih-telemed-speaking-pulse 1.4s ease-in-out infinite' : 'none',
  }}
  className={speaking ? 'mih-telemed-video-tile--speaking' : undefined}
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
        avatar ? (
          <img
            src={avatar}
            alt=''
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              opacity: 1,
              pointerEvents: 'none',
            }}
          />
        ) : (
          <div style={{
            width: big ? 132 : 64, height: big ? 132 : 64, borderRadius: 'var(--dim-radius-full, 9999px)',
            background: `linear-gradient(135deg, ${accent} 0%, #6366F1 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(0,0,0,.35)',
          }}
          >
            <Sym name='person' size={big ? 72 : 36} fill={1} color={ONBRAND} />
          </div>
        )
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: big ? 'var(--dim-space-300, 12px)' : 'var(--dim-space-200, 8px)' }}>
          {big ? (
            avatar ? (
              <div style={{
                width: 120, height: 120, borderRadius: 'var(--dim-radius-full, 9999px)',
                overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,.35)',
              }}
              >
                <img src={avatar} alt='' style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            ) : (
              <div style={{
                width: 120, height: 120, borderRadius: 'var(--dim-radius-full, 9999px)',
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
            )
          ) : (
            avatar ? (
              <div style={{
                width: 40, height: 40, borderRadius: 'var(--dim-radius-full, 9999px)', overflow: 'hidden',
              }}
              >
                <img src={avatar} alt='' style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            ) : (
              <Sym name='videocam_off' size={26} color='rgba(255,255,255,.55)' />
            )
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
          {!big && !avatar && (
            <span style={{ color: 'rgba(255,255,255,.55)', fontSize: 'var(--type-size-xxs, 10px)', fontFamily: 'var(--type-family-body, sans-serif)' }}>
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
      padding: 'var(--dim-space-100, 4px) var(--dim-space-200, 8px)', borderRadius: 'var(--dim-radius-200, 8px)', background: 'var(--background-overlay-default, #64748B80)',
      backdropFilter: 'blur(4px)',
    }}
    >
      <Sym name={micOn ? 'mic' : 'mic_off'} size={16} fill={1} color={micOn ? ONBRAND : '#FCA5A5'} />
      <span style={{ color: ONBRAND, fontSize: big ? 'var(--type-size-sm, 14px)' : 'var(--type-size-xs, 12px)', fontWeight: 'var(--type-weight-medium, 500)', fontFamily: 'var(--type-family-body, sans-serif)' }}>{name}</span>
      {sub && <span style={{ color: 'rgba(255,255,255,.7)', fontSize: 'var(--type-size-xxs, 10px)' }}>· {sub}</span>}
    </div>
  </div>
  );
};

/* Read-only clinical field row */
const DataRow = ({ label, value, tone }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 'var(--dim-space-300, 12px)', padding: 'var(--dim-space-150, 6px) 0' }}>
    <span style={{ color: 'var(--text-content-tertiary, #858C92)', fontSize: 'var(--type-size-sm, 14px)', fontFamily: 'var(--type-family-body, sans-serif)' }}>{label}</span>
    <span style={{
      color: tone === 'warn' ? 'var(--text-warning-primary, #A5641B)' : 'var(--text-content-default, #363B3F)',
      fontSize: 'var(--type-size-sm, 14px)', fontWeight: 'var(--type-weight-medium, 500)', fontFamily: 'var(--type-family-body, sans-serif)', textAlign: 'right',
    }}
    >{value}</span>
  </div>
);

/* แสดงแทนแผง EMR / คำสั่ง เมื่อไม่พบ visit ที่ผูกกับผู้รับบริการบนจอนี้ —
   กันไม่ให้ fallback ไปหยิบเวชระเบียน/คำสั่งของผู้ป่วยรายอื่นมาแสดง */
const NoVisitNotice = ({ text }) => (
  <div style={{
    borderRadius: 'var(--dim-radius-300, 10px)',
    border: 'var(--dim-stroke-100, 1px) solid var(--border-alert-warning, #FFEDD5)',
    background: 'var(--surface-alert-warning, #FFF9F0)',
    paddingTop: 'var(--dim-space-300, 12px)',
    paddingBottom: 'var(--dim-space-300, 12px)',
    paddingLeft: 'var(--dim-space-400, 16px)',
    paddingRight: 'var(--dim-space-400, 16px)',
    display: 'flex',
    alignItems: 'flex-start',
    gap: 'var(--dim-space-200, 8px)',
  }}
  >
    <Sym name='info' size={18} color='var(--text-alert-warning, #C2410C)' />
    <span style={{ fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-alert-warning, #C2410C)', lineHeight: 1.6, fontFamily: 'var(--type-family-body, sans-serif)' }}>
      {text}
    </span>
  </div>
);

const SectionTitle = ({ icon, children, right }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--dim-space-200, 8px)', marginBottom: 'var(--dim-space-200, 8px)' }}>
    {icon && <Sym name={icon} size={18} fill={1} color='var(--icon-brandPrimary-default, #007549)' />}
    <span style={{ fontWeight: 'var(--type-weight-bold, 700)', fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-default, #363B3F)', fontFamily: 'var(--type-family-body, sans-serif)' }}>{children}</span>
    <div style={{ flex: 1 }} />
    {right}
  </div>
);

/* A rendered "document page" (mock lab report / X-ray) — shared by the
   preview modal and the in-meeting share stage. */
const DocumentPage = ({ doc, patient }) => (
  <div style={{ background: 'var(--surface-card-100, #FFFFFF)', borderRadius: 'var(--dim-radius-200, 8px)', padding: 'var(--dim-space-600, 24px)', boxShadow: '0 2px 10px rgba(0,0,0,.12)', maxWidth: 460, width: '100%', margin: '0 auto' }}>
    <div style={{ textAlign: 'center', borderBottom: '2px solid var(--border-brandPrimary-default, #007549)', paddingBottom: 'var(--dim-space-300, 12px)', marginBottom: 'var(--dim-space-400, 16px)' }}>
      <div style={{ fontWeight: 'var(--type-weight-heading-strong, var(--type-weight-medium, 500))', fontSize: 'var(--type-size-base, 16px)', color: 'var(--text-brandPrimary-default, #007549)', fontFamily: 'var(--type-family-heading-graphic2, "Mitr", sans-serif)' }}>ศูนย์บริการสาธารณสุข 4 ดินแดง</div>
      <div style={{ fontSize: 'var(--type-size-xxs, 10px)', color: 'var(--text-content-secondary, #636B72)' }}>สำนักอนามัย กรุงเทพมหานคร</div>
    </div>
    <div style={{ fontWeight: 'var(--type-weight-bold, 700)', fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-default, #363B3F)', marginBottom: 'var(--dim-space-300, 12px)', textAlign: 'center' }}>{doc.docTitle}</div>
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-secondary, #636B72)', marginBottom: 'var(--dim-space-200, 8px)' }}>
      <span>ผู้รับบริการ: {patient?.fullName}</span>
      <span>HN {patient?.hn}</span>
    </div>
    <div style={{ fontSize: 'var(--type-size-xxs, 10px)', color: 'var(--text-content-tertiary, #858C92)', marginBottom: 'var(--dim-space-400, 16px)' }}>วันที่ตรวจ: {doc.date}</div>

    {doc.type === 'lab-table' && (
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--type-size-sm, 14px)' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border-neutral-tertiary, #E2E4E6)' }}>
            <th style={{ textAlign: 'left', padding: 'var(--dim-space-150, 6px) var(--dim-space-100, 4px)', color: 'var(--text-content-tertiary, #858C92)', fontWeight: 'var(--type-weight-medium, 500)' }}>รายการ</th>
            <th style={{ textAlign: 'right', padding: 'var(--dim-space-150, 6px) var(--dim-space-100, 4px)', color: 'var(--text-content-tertiary, #858C92)', fontWeight: 'var(--type-weight-medium, 500)' }}>ผล</th>
            <th style={{ textAlign: 'right', padding: 'var(--dim-space-150, 6px) var(--dim-space-100, 4px)', color: 'var(--text-content-tertiary, #858C92)', fontWeight: 'var(--type-weight-medium, 500)' }}>ค่าอ้างอิง</th>
          </tr>
        </thead>
        <tbody>
          {doc.rows.map((r, i) => (
            <tr key={i} style={{ borderBottom: '1px solid var(--border-neutral-quaternary, #F1F3F5)' }}>
              <td style={{ padding: 'var(--dim-space-150, 6px) var(--dim-space-100, 4px)', color: 'var(--text-content-default, #363B3F)' }}>{r.test}</td>
              <td style={{ padding: 'var(--dim-space-150, 6px) var(--dim-space-100, 4px)', textAlign: 'right', fontWeight: 'var(--type-weight-bold, 700)', color: r.flag === 'high' ? 'var(--text-warning-primary, #A5641B)' : 'var(--text-content-default, #363B3F)' }}>
                {r.value} {r.unit}{r.flag === 'high' ? ' ↑' : ''}
              </td>
              <td style={{ padding: 'var(--dim-space-150, 6px) var(--dim-space-100, 4px)', textAlign: 'right', color: 'var(--text-content-tertiary, #858C92)', fontSize: 'var(--type-size-xs, 12px)' }}>{r.ref}</td>
            </tr>
          ))}
        </tbody>
      </table>
    )}

    {doc.type === 'image' && (
      <div>
        <div style={{ height: 220, borderRadius: 'var(--dim-radius-200, 8px)', background: 'radial-gradient(circle at 50% 42%, #2b3442 0%, #0d1117 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 'var(--dim-space-300, 12px)', position: 'relative' }}>
          <Sym name='pulmonology' size={84} color='rgba(255,255,255,.35)' />
          <span style={{ position: 'absolute', top: 'var(--dim-space-200, 8px)', left: 'var(--dim-space-200, 8px)', fontSize: 'var(--type-size-xxs, 10px)', color: 'rgba(255,255,255,.6)' }}>Chest PA · upright</span>
        </div>
        <div style={{ fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-default, #363B3F)', lineHeight: 1.7 }}>{doc.reading}</div>
      </div>
    )}

    <div style={{ marginTop: 'var(--dim-space-400, 16px)', padding: 'var(--dim-space-200, 8px) var(--dim-space-300, 12px)', borderRadius: 'var(--dim-radius-200, 8px)', background: 'var(--surface-brandPrimary-quaternary, #F4FBF8)', fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-brandPrimary-default, #007549)', fontWeight: 'var(--type-weight-medium, 500)', display: 'flex', alignItems: 'center', gap: 'var(--dim-space-150, 6px)' }}>
      <Sym name='verified' size={16} fill={1} color='var(--icon-brandPrimary-default, #007549)' /> {doc.impression}
    </div>
    <div style={{ marginTop: 'var(--dim-space-500, 20px)', textAlign: 'right', fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-secondary, #636B72)' }}>
      ผู้รายงานผล: {doc.type === 'image' ? 'พญ.รังสี วินิจฉัย (รังสีแพทย์)' : 'ทนพ. ห้องปฏิบัติการ'}
    </div>
  </div>
);

/* ── Right-panel tabs ──────────────────────────────────────────────────── */

export function TelemedConsultOverlay({ visitId = null, minimized = false, onMinimize, onMaximize, onClose }) {
  const history = useHistory();

  const [phase, setPhase] = useState('prepare'); // 'prepare' | 'in-call' | 'ended'
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [speakerOn, setSpeakerOn] = useState(true); // Figma call-control footer (278:21848)
  // Device pickers — Figma Section/TelemedDevicePickers (78:16405)
  const [micDevice, setMicDevice] = useState('macbook-air');
  const [speakerDevice, setSpeakerDevice] = useState('airpods-pro');
  const [cameraDevice, setCameraDevice] = useState('facetime-hd');
  const [bg, setBg] = useState('clinic-1'); // selected virtual background (Figma 37:6435)
  const lastBgRef = useRef('clinic-1');
  const uploadInputRef = useRef(null);
  const connectTimerRef = useRef(null);
  const videoStageRef = useRef(null);
  const [uploadedBg, setUploadedBg] = useState(null);
  const [uploadHover, setUploadHover] = useState(false); // Photo Default/Hover (Figma 3420:2565)
  const [bgPanelOpen, setBgPanelOpen] = useState(false); // พื้นหลังเสมือน — ยุบไว้ ไม่ใช่งานหลักก่อนเข้าห้อง
  const [bgBtnHover, setBgBtnHover] = useState(false);
  const [patientCamOn, setPatientCamOn] = useState(true);
  const [patientMicOn, setPatientMicOn] = useState(true);
  const [stream, setStream] = useState(null);        // doctor camera (getUserMedia)
  const [micStream, setMicStream] = useState(null);  // doctor microphone — แยกจากกล้อง เพราะปิดกล้องแล้วเสียงต้องไม่ดับ
  const [screenStream, setScreenStream] = useState(null); // shared screen (getDisplayMedia)
  /* สายจริง (WebRTC) — ภาพ/เสียงของผู้รับบริการที่ส่งข้ามมาจริง */
  const [remoteStream, setRemoteStream] = useState(null);
  const [rtcState, setRtcState] = useState(TELEMED_RTC_STATE.idle);
  const peerRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const [sharing, setSharing] = useState(false);
  /* เข้าห้องปรึกษามาแล้วแผงด้านขวาต้องปิดอยู่ — เดิมเปิดค้างที่แชททันที
     ทำให้พื้นที่วิดีโอถูกบีบทั้งที่ยังไม่มีใครขอใช้แชท */
  const [rightTab, setRightTab] = useState(null);
  const toggleRightTab = (key) => setRightTab((cur) => (cur === key ? null : key));
  const [patientOpen, setPatientOpen] = useState(false); // TelemedPatientCard State=Hide (Figma 25:3185)
  const [peopleOpen, setPeopleOpen] = useState(false);  // Figma 58:8962 → 114:56061
  const [peopleView, setPeopleView] = useState('list'); // 'list' | 'add'
  const [chatOpen, setChatOpen] = useState(false);

  // Connecting / Joining (Figma 85:11890 · 154:30106 · 94:48768)
  const [connectingOpen, setConnectingOpen] = useState(false);
  const [abortJoinOpen, setAbortJoinOpen] = useState(false);

  // PDPA / recording consent — Figma Recording Confirm (123:56678)
  const [consent, setConsent] = useState('pending'); // 'pending' | 'granted' | 'denied'
  const [recording, setRecording] = useState(false);
  const [consentModal, setConsentModal] = useState(false);

  // device / network status (simulated)
  const [network, setNetwork] = useState('good'); // 'good' | 'weak' | 'lost'
  const [camError, setCamError] = useState(false);
  const [mediaErrorType, setMediaErrorType] = useState(null); // null | 'permission' | 'device-not-found'
  const [mediaHelpOpen, setMediaHelpOpen] = useState(false);

  /* Additional Cases (Figma 85:11482):
     · Join request popup (146:20338 / 95:48873)
     · No-show ครั้งที่ 1·2 + timeslot auto-close (146:22674) */
  const [patientPresent, setPatientPresent] = useState(false);
  /* "เคยมีผู้รับบริการอยู่ในห้องจริงหรือไม่" ตลอดสายนี้ — ใช้ตัดสินว่าจะเขียน
     ข้อมูลกลับเข้า PHCIS ได้หรือไม่. ต้องเป็น ref เพราะตอน endCall() ทำงาน
     setPatientPresent(false) อาจถูกเรียกไปแล้ว (ผู้ป่วยวางสาย / สัญญาณหลุด) */
  const patientEverPresentRef = useRef(false);
  const [patientLeft, setPatientLeft] = useState(false);
  /* Mirror of `patientLeft` for the session listener — that effect is mounted
     once with [] deps, so its closure would otherwise always read `false`. */
  const patientLeftRef = useRef(false);
  const [joinRequestOpen, setJoinRequestOpen] = useState(false);
  const [noShowStep, setNoShowStep] = useState(null); // null | 1 | 2 | 'timeslot'
  const [timeslotCountdown, setTimeslotCountdown] = useState(30);
  const joinRequestTimerRef = useRef(null);
  const noShowTimerRef = useRef(null);
  /* เวลาที่จะไต่ระดับ no-show ครั้งถัดไป — เดิมเป็น timer ที่มองไม่เห็นเลย
     แพทย์จึงไม่รู้ว่าห้องจะปิดเองเมื่อไร (Nielsen #1) */
  const [noShowAt, setNoShowAt] = useState(null);
  const [noShowLeftMs, setNoShowLeftMs] = useState(0);
  const [closeReason, setCloseReason] = useState(null); // null | 'endMeeting' | 'no-show' | 'timeslot'
  const [audioOnly, setAudioOnly] = useState(false);

  /* ── การจับคู่ session ข้ามแท็บ web ↔ mobile (TOR §1.13.7) ──────────
     เดิมฝั่งเว็บ "แกล้ง" ให้ผู้ป่วยขอเข้าห้อง 1.4 วินาทีหลังหมอเข้าสาย.
     ตอนนี้ถ้ามีแท็บ /m/telemed เปิดอยู่ในเบราว์เซอร์เดียวกัน เหตุการณ์จะเดิน
     จริงผ่าน BroadcastChannel (fallback: localStorage) — ไม่มีแท็บคู่หูค่อย
     กลับไปใช้โหมดสาธิตเดิม. การจับคู่ข้ามเครื่องจริงต้องใช้ signalling
     server + WebRTC ซึ่งอยู่นอกขอบเขต wave นี้ → คงป้าย "โหมดสาธิต" ไว้. */
  const sessionRef = useRef(null);
  const [peerState, setPeerState] = useState({ supported: false, transport: 'none', hasPeer: false, duplicate: false });
  /* สถานะการส่งข้อมูลเข้า PHCIS ตอนจบสาย (TOR §1.13.3) */
  const [phcisSync, setPhcisSync] = useState(null);

  // shared-document preview (PDF / image)
  const [previewDoc, setPreviewDoc] = useState(null);
  // document presented onto the meeting's main stage
  const [sharedDoc, setSharedDoc] = useState(null);
  const shareDocument = (d) => { setSharedDoc(d); setPreviewDoc(null); if (sharing) stopShare(); };
  const stopShareDoc = () => setSharedDoc(null);

  // invite others to the meeting — Figma Participant popups (114:56061)
  const [participants, setParticipants] = useState(DEFAULT_TELEMED_EXTRA_PARTICIPANTS);
  const [pinnedId, setPinnedId] = useState(null);       // pinned participant → shown big
  const pinned = participants.find((p) => p.id === pinnedId) || null;
  const togglePin = (id) => setPinnedId((cur) => (cur === id ? null : id));
  const [linkCopied, setLinkCopied] = useState(false);
  /* ลิงก์เข้าห้องต้องเป็นของ bma.health ไม่ใช่ผู้ให้บริการภายนอก */
  const meetingLink = 'https://bma-health.mih.co.th/telemed/join/TM-8842-2024';
  const copyLink = () => {
    try { navigator.clipboard?.writeText(meetingLink); } catch (e) { /* ignore */ }
    setLinkCopied(true);
    window.setTimeout(() => setLinkCopied(false), 1800);
  };
  const openPeople = (view = 'list') => {
    setPeopleView(view);
    setPeopleOpen(true);
  };
  const inviteFromDirectory = (preset) => {
    setParticipants((ps) => {
      if (ps.some((p) => p.name === preset.name || p.directoryId === preset.id)) return ps;
      return [
        ...ps,
        {
          id: `inv-${Date.now()}`,
          directoryId: preset.id,
          name: preset.name,
          role: preset.role,
          avatar: preset.avatar,
          accent: preset.accent,
          micOn: true,
          camOn: true,
          status: 'connecting',
        },
      ];
    });
  };
  /* ถอนการเชิญจากหน้ารายชื่อ — จับคู่ด้วย directoryId ก่อน แล้วค่อยตกลงที่ชื่อ
     เพราะรายการที่เชิญไว้ก่อนหน้าอาจถูกสร้างจากชื่ออย่างเดียว */
  const uninviteFromDirectory = (preset) => {
    setParticipants((ps) => ps.filter((pp) => !(pp.directoryId === preset.id || pp.name === preset.name)));
  };

  const removeParticipant = (id) => {
    setParticipants((ps) => ps.filter((p) => p.id !== id));
    setPinnedId((cur) => (cur === id ? null : cur));
  };
  const toggleParticipantMedia = (id, kind) => {
    setParticipants((ps) => ps.map((p) => {
      if (p.id !== id) return p;
      if (kind === 'mic') return { ...p, micOn: !p.micOn };
      return { ...p, camOn: !p.camOn };
    }));
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

  /* TOR 1.13.11 — record telemed session login when the consult UI opens. */
  useEffect(() => {
    appendAuditEvent({ user: DOCTOR.name, action: 'เข้าสู่ระบบ Telemed' });
  }, []);

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

  /* Chat image / file attach — leading icons in the input bar (Figma 22:2698). */
  const chatImageInputRef = useRef(null);
  const onAttachChatImage = (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    const url = URL.createObjectURL(file);
    setChat((c) => [...c, { id: Date.now(), me: true, image: url, t: 'ตอนนี้' }]);
  };

  const chatFileInputRef = useRef(null);
  const onAttachChatFile = (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    setChat((c) => [...c, { id: Date.now(), me: true, file: { name: file.name, size: file.size }, t: 'ตอนนี้' }]);
  };

  /* ── ต่อยอด: ผูก visit + ทะเบียนความยินยอมจริง (TOR §1.13.8/.9) ──────
     สายผูกกับ "ผู้รับบริการที่แสดงอยู่บนจอนี้" (activePatient.hn) เท่านั้น —
     เดิมเลือกรายการแรกที่สถานะ inprogress/waiting ทำให้ EMR / คำสั่ง /
     ทะเบียนความยินยอมเป็นของคนอื่น (ข้อมูลผู้ป่วยข้ามคน). ถ้าไม่มี visit
     ที่ตรง HN → ไม่แสดงข้อมูลใคร แต่ขึ้นสถานะ "ไม่พบรายการปรึกษา". */
  const [visitTick, setVisitTick] = useState(0);
  useEffect(() => subscribeTelemedVisits(() => setVisitTick((t) => t + 1)), []);
  // eslint-disable-next-line react-hooks/exhaustive-deps

  /* ผู้รับบริการของสายนี้ = แถวที่กดเข้ามาจากหน้า worklist (/telemed/:visitId)
     ไม่ใช่ค่าคงที่ตัวเดียวของทั้งระบบ — ไม่งั้นกดแถวไหนก็ขึ้นชื่อเดิมทุกครั้ง */
  const activePatient = React.useMemo(() => {
    const key = String(visitId || '');
    const visit = getTelemedVisits().find((v) => v.id === key || v.hn === key) || null;
    if (!visit) return DEFAULT_PATIENT;
    return {
      ...DEFAULT_PATIENT,
      fullName: visit.name || DEFAULT_PATIENT.fullName,
      hn: visit.hn || DEFAULT_PATIENT.hn,
      age: visit.age ?? DEFAULT_PATIENT.age,
      insurance: visit.rights || DEFAULT_PATIENT.insurance,
      avatarUrl: patientAvatarFor(visit.hn, visit.sex),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visitId, visitTick]);

  const activeVisit = React.useMemo(() => getTelemedVisitByHn(activePatient.hn) || null, [visitTick]);
  const noVisitNotice = `ไม่พบรายการปรึกษาของผู้รับบริการรายนี้ (HN ${activePatient.hn}) — สร้างรายการที่หน้าห้องตรวจทางไกลก่อน`;
  const recordability = React.useMemo(
    () => (activeVisit ? canRecordCall(activeVisit.id) : { allowed: false, reason: noVisitNotice }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeVisit, visitTick],
  );
  const telemedRole = TELEMED_DEFAULT_ROLE;

  const toggleRecord = () => {
    if (recording) {
      setRecording(false);
      if (activeVisit && recordability.consent) {
        attachRecording(recordability.consent.key, null, telemedActor(telemedRole));
      }
      appendAuditEvent({ user: DOCTOR.name, action: 'หยุดบันทึกวิดีโอ' });
      return;
    }
    /* ไม่มีความยินยอมในทะเบียน → ปุ่มถูก disable อยู่แล้ว กันไว้อีกชั้น */
    if (!recordability.allowed) {
      appendAuditEvent({ user: DOCTOR.name, action: `พยายามบันทึกสายโดยไม่มีความยินยอม — ${recordability.reason}`, ok: false });
      return;
    }
    if (consent === 'granted') {
      setRecording(true);
      appendAuditEvent({ user: DOCTOR.name, action: 'เริ่มบันทึกวิดีโอ' });
      return;
    }
    /* ต้องถามเจ้าของข้อมูลก่อน (PDPA) — ถ้าเครื่องผู้รับบริการจับคู่อยู่ ให้คำขอ
       ไปโผล่บนเครื่องเขาจริง ๆ ส่วนป๊อปอัปนี้เหลือไว้บันทึกคำตอบกรณีตอบทางวาจา */
    if (sessionRef.current?.hasPeer()) {
      sessionRef.current.post(TELEMED_SESSION_EVENTS.consentRequest, { by: DOCTOR.name });
      appendAuditEvent({ user: DOCTOR.name, action: 'ส่งคำขอความยินยอมบันทึกสายไปยังเครื่องผู้รับบริการ' });
    }
    setConsentModal(true);
  };
  const grantConsent = () => {
    setConsent('granted');
    setRecording(true);
    setConsentModal(false);
    /* แจ้งแท็บผู้รับบริการให้เห็นสถานะ "กำลังบันทึก" ตรงกัน (TOR §1.13.7/§1.13.9) */
    sessionRef.current?.post(TELEMED_SESSION_EVENTS.consent, { granted: true });
    appendAuditEvent({ user: DOCTOR.name, action: 'ยินยอมบันทึกวิดีโอ + เริ่มบันทึก' });
  };
  const denyConsent = () => {
    setConsentModal(false);
    setConsent('denied');
    setRecording(false);
    sessionRef.current?.post(TELEMED_SESSION_EVENTS.consent, { granted: false });
    appendAuditEvent({ user: DOCTOR.name, action: 'ผู้รับบริการปฏิเสธการบันทึกสาย — หยุดบันทึกทันที', ok: false });
  };

  /* ผู้รับบริการเพิกถอนกลางสาย (ทะเบียนเปลี่ยนสถานะ) → หยุดบันทึกทันที */
  useEffect(() => {
    if (recording && !recordability.allowed) {
      setRecording(false);
      appendAuditEvent({
        user: DOCTOR.name,
        action: `หยุดบันทึกอัตโนมัติ — ${recordability.reason} (แจ้งทุกฝ่ายในสาย · ไฟล์เข้าคิวลบตาม retention)`,
        ok: false,
      });
    }
  }, [recordability.allowed, recording, recordability.reason]);

  /* บันทึกเวลาเริ่ม-สิ้นสุดการให้บริการลง visit (คู่มือ 5.3.5) */
  const [serviceStamped, setServiceStamped] = useState(false);
  const stampServiceStart = () => {
    if (!activeVisit || serviceStamped) return;
    setTelemedServiceWindow(activeVisit.id, { startedAt: new Date().toISOString() }, telemedActor(telemedRole));
    setServiceStamped(true);
  };
  const stampServiceEnd = () => {
    if (!activeVisit) return;
    setTelemedServiceWindow(activeVisit.id, { endedAt: new Date().toISOString() }, telemedActor(telemedRole));
  };
  const uploadEvidence = () => {
    if (!activeVisit) return;
    addTelemedEvidence(
      activeVisit.id,
      { name: `telemed-call-${Date.now()}.png`, type: 'image/png', sizeMb: 0.6 },
      telemedActor(telemedRole),
    );
    appendAuditEvent({ user: DOCTOR.name, action: 'อัพโหลดภาพหลักฐานการให้บริการ' });
  };

  const [leaveOpen, setLeaveOpen] = useState(false);
  const [layoutOpen, setLayoutOpen] = useState(false);
  /* VideoStage layouts — Figma 154:30183: Auto (2×2) · Grid · SpeakerFocus · Sidebar */
  const [videoLayout, setVideoLayout] = useState('auto');

  const clearConnectTimer = () => {
    if (connectTimerRef.current != null) {
      window.clearTimeout(connectTimerRef.current);
      connectTimerRef.current = null;
    }
  };

  const clearJoinRequestTimer = () => {
    if (joinRequestTimerRef.current != null) {
      window.clearTimeout(joinRequestTimerRef.current);
      joinRequestTimerRef.current = null;
    }
  };

  const clearNoShowTimer = () => {
    setNoShowAt(null);
    if (noShowTimerRef.current != null) {
      window.clearTimeout(noShowTimerRef.current);
      noShowTimerRef.current = null;
    }
  };

  const clearAdditionalCaseTimers = () => {
    clearJoinRequestTimer();
    clearNoShowTimer();
  };

  useEffect(() => () => {
    clearConnectTimer();
    clearAdditionalCaseTimers();
  }, []);

  /* เก็บ audit ของสายนี้ลงเครื่องด้วย (TOR §1.13.11) — idempotent */
  useEffect(() => { startTelemedAuditMirror(); }, []);

  /* เปิดช่องจับคู่ session กับแท็บมือถือ (TOR §1.13.7) — เปิดครั้งเดียวต่อหน้า */
  useEffect(() => {
    const session = openTelemedSession({
      role: 'web',
      onPeerChange: (s) => setPeerState((prev) => (
        prev.hasPeer === s.hasPeer && prev.duplicate === s.duplicate && prev.transport === s.transport
          ? prev
          : { ...prev, ...s }
      )),
      onMessage: (msg) => {
        switch (msg.type) {
          case TELEMED_SESSION_EVENTS.joinRequest:
            /* ไม่มีป๊อปอัปถามรับเข้าห้องอีกแล้ว — ผู้รับบริการที่ยิงคำขอมาคือเจ้าของ
               นัดหมายที่ล็อกอินแล้ว ระบบจึงรับเข้าห้องให้ทันทีและบันทึกไว้ใน audit */
            clearJoinRequestTimer();
            clearNoShowTimer();
            setNoShowStep(null);
            appendAuditEvent({ user: DOCTOR.name, action: 'ผู้รับบริการขอเข้าห้องปรึกษา (จากแอปมือถือ)' });
            admitJoinRequest();
            break;
          /* วางสายเอง ≠ สัญญาณหลุด — ต้องแยกกันทั้งบนหน้าจอและใน audit trail
             เพราะเวลาให้บริการ/การเบิกจ่าย (คู่มือ 5.3.5) อ่านจากบันทึกนี้ */
          case TELEMED_SESSION_EVENTS.leave:
            setPatientPresent(false);
            patientLeftRef.current = true;
            setPatientLeft(true);
            appendAuditEvent({ user: DOCTOR.name, action: 'ผู้รับบริการวางสาย (สิ้นสุดการปรึกษา)', ok: true });
            break;
          case TELEMED_SESSION_EVENTS.bye:
            /* แท็บผู้ป่วยปิด/รีเฟรชกลางคัน → เป็น "สัญญาณขาดหาย" จริง
               แต่ `bye` ถูกส่งตอน close() ทุกกรณี รวมถึงตอนผู้ป่วยกดวางสาย
               แล้วปิดแท็บตามมา — เคสนั้นสายจบไปแล้ว ห้ามพลิกเป็น "สัญญาณหลุด"
               (จะกลืนแบนเนอร์ "ผู้รับบริการวางสายแล้ว" และขึ้นให้เชื่อมต่อใหม่) */
            setPatientPresent(false);
            if (!patientLeftRef.current) {
              setNetwork('lost');
              appendAuditEvent({ user: DOCTOR.name, action: 'สัญญาณผู้รับบริการขาดหาย (แท็บผู้รับบริการหลุด)', ok: false });
            }
            break;
          case TELEMED_SESSION_EVENTS.consent:
            /* คำตอบมาจากเครื่องผู้รับบริการเอง — ปิดป๊อปอัปที่ค้างอยู่แล้วทำตามคำตอบ */
            setConsent(msg.granted ? 'granted' : 'denied');
            setConsentModal(false);
            setRecording(Boolean(msg.granted));
            appendAuditEvent({
              user: DOCTOR.name,
              action: msg.granted
                ? 'ผู้รับบริการยินยอมให้บันทึกสายจากแอปมือถือ — เริ่มบันทึก'
                : 'ผู้รับบริการไม่ยินยอมให้บันทึกสายจากแอปมือถือ — ไม่บันทึก',
              ok: Boolean(msg.granted),
            });
            setVisitTick((t) => t + 1);
            break;
          /* ── สายวิดีโอจริง ── */
          case TELEMED_SESSION_EVENTS.signal:
            peerRef.current?.handleSignal(msg.signal);
            break;
          case TELEMED_SESSION_EVENTS.rtcReady: {
            /* ฝั่งผู้รับบริการพร้อมแล้ว — แพทย์เป็นฝ่ายเปิดการเจรจา
               ถ้าสายต่อติดอยู่แล้วห้ามเจรจาใหม่: ข้อความที่มาซ้ำ (เช่นผู้รับบริการ
               รีเฟรชหน้า หรือ relay ส่งซ้ำ) จะทำให้สายรื้อแล้วต่อใหม่ไม่จบ */
            const peer = ensurePeer();
            if (peer && !peer.isConnected()) peer.negotiate();
            break;
          }
          case TELEMED_SESSION_EVENTS.media:
            if (typeof msg.camOn === 'boolean') setPatientCamOn(msg.camOn);
            if (typeof msg.micOn === 'boolean') setPatientMicOn(msg.micOn);
            break;
          default:
            break;
        }
      },
    });
    sessionRef.current = session;
    setPeerState({
      supported: session.supported,
      transport: session.transport,
      hasPeer: session.hasPeer(),
      duplicate: session.isDuplicate(),
    });
    return () => { session.close(); sessionRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const beginInCall = () => {
    clearConnectTimer();
    clearAdditionalCaseTimers();
    setConnectingOpen(false);
    setAbortJoinOpen(false);
    setElapsed(0);
    setPatientPresent(false);
    patientEverPresentRef.current = false;
    patientLeftRef.current = false;
    setPatientLeft(false);
    setJoinRequestOpen(false);
    setNoShowStep(null);
    setCloseReason(null);
    setAudioOnly(false);
    setPhase('in-call');
    appendAuditEvent({ user: DOCTOR.name, action: 'เข้าร่วมสาย Telemed' });
    /* เวลาเริ่มให้บริการ = เวลาที่แพทย์เข้าห้อง (คู่มือ 5.3.5) — ถ้าไม่บันทึกตรงนี้
       การส่งข้อมูลเข้า PHCIS ตอนจบสายจะล้มเหลวด้วยเหตุ "ไม่มีเวลาให้บริการ" เสมอ */
    stampServiceStart();
    /* ประกาศให้แท็บมือถือรู้ว่าแพทย์เข้าห้องแล้ว */
    sessionRef.current?.post(TELEMED_SESSION_EVENTS.hello, { phase: 'in-call' });
    /* ไม่มีแท็บผู้รับบริการคู่หู → กลับไปใช้โหมดสาธิตเดิม (Figma 95:48873)
       ถ้ามีแท็บคู่หู คำขอเข้าห้องจะมาจากฝั่งมือถือจริง ไม่ต้องแกล้ง */
    if (!sessionRef.current?.hasPeer()) {
      joinRequestTimerRef.current = window.setTimeout(() => {
        admitJoinRequest();
      }, 1400);
    }
  };

  const admitJoinRequest = () => {
    clearAdditionalCaseTimers();
    setJoinRequestOpen(false);
    setPatientPresent(true);
    patientEverPresentRef.current = true;   /* มีการให้บริการจริงแล้ว */
    patientLeftRef.current = false;
    setPatientLeft(false);
    setNoShowStep(null);
    sessionRef.current?.post(TELEMED_SESSION_EVENTS.accept, { by: DOCTOR.name });
    appendAuditEvent({ user: DOCTOR.name, action: 'รับผู้ป่วยเข้าสาย' });
  };

  const dismissJoinRequest = () => {
    clearJoinRequestTimer();
    setJoinRequestOpen(false);
    sessionRef.current?.post(TELEMED_SESSION_EVENTS.decline, { by: DOCTOR.name });
    appendAuditEvent({ user: DOCTOR.name, action: 'ยังไม่รับผู้ป่วยเข้าสาย (ปฏิเสธคำขอชั่วคราว)', ok: false });
    /* Patient still absent — escalate to no-show ครั้งที่ 1 after a short wait (demo). */
    clearNoShowTimer();
    setNoShowAt(Date.now() + NO_SHOW_FIRST_MS);
    noShowTimerRef.current = window.setTimeout(() => {
      setNoShowAt(null);
      setNoShowStep(1);
    }, NO_SHOW_FIRST_MS);
  };

  const waitNoShowFurther = () => {
    const next = noShowStep === 1 ? 2 : noShowStep === 2 ? 'timeslot' : null;
    setNoShowStep(null);
    if (!next) return;
    clearNoShowTimer();
    setNoShowAt(Date.now() + NO_SHOW_NEXT_MS);
    noShowTimerRef.current = window.setTimeout(() => {
      setNoShowAt(null);
      setNoShowStep(next);
    }, NO_SHOW_NEXT_MS);
  };

  const markNoShow = () => {
    clearAdditionalCaseTimers();
    setNoShowStep(null);
    endCall('no-show');
  };

  const closeTimeslotNow = () => {
    clearAdditionalCaseTimers();
    setNoShowStep(null);
    endCall('timeslot');
  };

  /* ── ส่งสรุปการให้บริการ + คำสั่ง เข้า PHCIS ตอนจบสาย (TOR §1.13.3) ──
     ยังไม่มี API จริง — เขียนลงสมุดบันทึกในเครื่องพร้อมสถานะที่ผู้ใช้เห็นได้
     (สำเร็จ / รอส่ง / ล้มเหลว-ลองใหม่) และหน้าห้องตรวจอ่านสถานะเดียวกัน */
  const pushVisitToPhcis = (extra = {}) => {
    const visit = getTelemedVisitByHn(activePatient.hn);
    if (!visit) {
      setPhcisSync({ status: 'none', reason: 'ไม่พบรายการตรวจของผู้รับบริการรายนี้ในหน้าห้องตรวจ' });
      return;
    }
    markPending(visit, telemedActor(telemedRole));
    const result = queueVisitSync(visit, telemedActor(telemedRole), extra);
    setPhcisSync(result.row);
    appendAuditEvent({
      user: DOCTOR.name,
      action: `ส่งสรุปการให้บริการเข้า PHCIS · ${result.ok ? result.row.phcisRef : result.row.reason}`,
      ok: result.ok,
    });
  };

  /* ปิดห้องโดยไม่มีการให้บริการ (ไม่มาตามนัด / หมดช่วงเวลานัด) — ห้ามเขียน
     กลับเข้า PHCIS เป็นบริการที่ให้แล้ว (TOR §1.13.3 + คู่มือ 5.3.5) */
  const recordNoShowToPhcis = (choice) => {
    const visit = getTelemedVisitByHn(activePatient.hn);
    if (!visit) {
      setPhcisSync({ status: 'none', reason: 'ไม่พบรายการตรวจของผู้รับบริการรายนี้ในหน้าห้องตรวจ' });
      return;
    }
    const result = recordNoShowVisit(visit, telemedActor(telemedRole), choice);
    setPhcisSync(result.row);
    appendAuditEvent({
      user: DOCTOR.name,
      action: `ปิดห้องโดยไม่มีการให้บริการ · ${result.row?.reason || NO_SHOW_REASON['no-show']} — ไม่ส่งเข้า PHCIS`,
      ok: false,
    });
  };

  /* ปลายทางที่ "แก้เหตุที่ส่งไม่สำเร็จได้จริง" — ปุ่มลองส่งใหม่เพียงอย่างเดียว
     เป็นทางตัน เพราะหน้าจอจบสายแก้หลักฐาน / เวลา / สิทธิ ไม่ได้เลย */
  const syncFixTarget = () => {
    const visit = activeVisit || getTelemedVisitByHn(activePatient.hn);
    if (!visit) return { label: 'ไปหน้าห้องตรวจ Telemedicine', path: '/telemed/worklist' };
    if (visit.rightsExpired) return { label: 'ไปตรวจสอบสิทธิการรักษา', path: '/telemed/worklist' };
    if (visit.authen === 'none' && !visit.authenCode) {
      return { label: 'ไปขอ Authen Code สปสช.', path: `/telemed/assessment/${visit.id}` };
    }
    return { label: 'ไปแนบหลักฐาน / บันทึกเวลาให้บริการ', path: `/telemed/assessment/${visit.id}` };
  };

  const retryPhcisSync = () => {
    const visit = getTelemedVisitByHn(activePatient.hn);
    if (!visit) return;
    const result = retryVisitSync(visit, telemedActor(telemedRole));
    setPhcisSync(result.row);
    appendAuditEvent({
      user: DOCTOR.name,
      action: `ลองส่งข้อมูลเข้า PHCIS อีกครั้ง · ${result.ok ? result.row.phcisRef : result.row.reason}`,
      ok: result.ok,
    });
  };

  const endCall = (choice = 'leave') => {
    clearConnectTimer();
    clearAdditionalCaseTimers();
    setConnectingOpen(false);
    setAbortJoinOpen(false);
    setJoinRequestOpen(false);
    if (stream) stream.getTracks().forEach((t) => t.stop());
    if (screenStream) screenStream.getTracks().forEach((t) => t.stop());
    setRecording(false);
    /* แจ้งแท็บผู้รับบริการว่าแพทย์ออกจากสายแล้ว */
    sessionRef.current?.post(TELEMED_SESSION_EVENTS.leave, { by: DOCTOR.name, reason: choice });
    /* เขียนกลับเข้า PHCIS เฉพาะเมื่อ "มีการให้บริการจริง" เท่านั้น —
       ปิดห้องเพราะไม่มาตามนัด / หมดช่วงเวลานัด ต้องบันทึกเป็นไม่มีการให้บริการ
       มิฉะนั้นรายการที่ไม่เคยตรวจจะขึ้นว่า "ส่งเข้า PHCIS แล้ว" และเบิกจ่ายได้ */
    const served = (choice === 'leave' || choice === 'endMeeting') && patientEverPresentRef.current;
    if (served) {
      /* ปิดเวลาให้บริการเมื่อมีการให้บริการจริงเท่านั้น — ถ้าประทับ endedAt ให้
         สายที่ไม่มีใครเข้าห้อง visit นั้นจะผ่าน blockingReason() แล้วถูก
         mirror อัตโนมัติเป็น "ซิงก์แล้ว" ที่หน้าห้องตรวจในภายหลัง */
      stampServiceEnd();
      pushVisitToPhcis({ summary, diagnosis: '' });
    } else {
      recordNoShowToPhcis(choice === 'leave' || choice === 'endMeeting' ? 'no-show' : choice);
    }
    setLeaveOpen(false);
    setNoShowStep(null);
    /* endMeeting = ปิดห้องสำหรับทุกคน; leave = แค่ออก */
    if (choice === 'endMeeting') setCloseReason((r) => r || 'endMeeting');
    else if (choice === 'no-show') setCloseReason('no-show');
    else if (choice === 'timeslot') setCloseReason('timeslot');
    else setCloseReason(null);
    setPhase('ended');
  };

  /* Figma 204:20664 — countdown badge then auto-close room. */
  useEffect(() => {
    if (noShowStep !== 'timeslot' || phase !== 'in-call') return undefined;
    setTimeslotCountdown(30);
    const id = window.setInterval(() => {
      setTimeslotCountdown((s) => {
        if (s <= 1) {
          window.clearInterval(id);
          endCall('timeslot');
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [noShowStep, phase]);

  const requestLeave = () => setLeaveOpen(true);

  /* Figma flow: Prepare → Connecting overlay (154:30106) → Meeting.
     Cancel mid-connect → ConfirmAbortJoin (94:48768). */
  const enterCall = () => {
    if (camError || mediaErrorType) return;
    clearConnectTimer();
    setAbortJoinOpen(false);
    setConnectingOpen(true);
    connectTimerRef.current = window.setTimeout(() => {
      beginInCall();
    }, 2200);
  };

  const requestAbortJoin = () => {
    clearConnectTimer();
    setAbortJoinOpen(true);
  };

  const stayConnecting = () => {
    setAbortJoinOpen(false);
    clearConnectTimer();
    connectTimerRef.current = window.setTimeout(() => {
      beginInCall();
    }, 1600);
  };

  const confirmAbortJoin = () => {
    clearConnectTimer();
    setAbortJoinOpen(false);
    setConnectingOpen(false);
  };

  /* เดินนาฬิกาให้แพทย์เห็นว่าเหลือเวลาอีกเท่าไรก่อนระบบจะไต่ระดับ no-show */
  useEffect(() => {
    if (noShowAt == null) { setNoShowLeftMs(0); return undefined; }
    const tick = () => setNoShowLeftMs(Math.max(0, noShowAt - Date.now()));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [noShowAt]);

  const showPatientVideo = patientPresent && patientCamOn && network !== 'lost' && !audioOnly;
  const showDoctorVideo = camOn && !camError && !audioOnly;

  /* ══ สายวิดีโอจริง (TOR §1.13.1) ═══════════════════════════════════════
     ก่อนหน้านี้ภาพผู้รับบริการเป็นรูปนิ่ง — ที่นี่ต่อ RTCPeerConnection จริง
     โดยส่ง SDP/ICE ผ่านช่องเดียวกับที่ใช้จับคู่ session อยู่แล้ว.
     ฝั่งแพทย์เป็น impolite = เป็นคนเปิดการเจรจา. */

  /* ไมค์แยกจากกล้อง: ปิดกล้อง (setStream(null)) ต้องไม่ทำให้เสียงหลุดไปด้วย
     และการปิดไมค์คือ track.enabled = false ไม่ใช่การหยุด track (หยุดแล้ว
     ต้องขออนุญาตใหม่ทุกครั้งที่เปิด) */
  /* ข้อความ "อีก X นาทีถึงเวลานัดหมาย" ต้องเดินเอง ไม่ใช่ค้างที่ค่าตอนเปิดหน้า */
  const [clockTick, setClockTick] = useState(0);
  useEffect(() => {
    if (phase !== 'prepare') return undefined;
    const id = window.setInterval(() => setClockTick((t) => t + 1), 30000);
    return () => window.clearInterval(id);
  }, [phase]);

  /* ข้อความสถานะเหนือปุ่มเข้าห้อง: อีกฝ่ายพร้อมแล้วหรือยัง / เหลืออีกกี่นาทีถึงเวลานัด */
  const waitStatus = React.useMemo(() => {
    /* สองบรรทัดคนละเรื่องกัน — บรรทัดแรกคือ "อีกฝ่ายอยู่ไหนแล้ว" บรรทัดที่สองคือ
       "เวลานัดหมายเหลือเท่าไร" แพทย์ต้องเห็นทั้งคู่ ไม่ใช่เลือกมาแสดงอันเดียว */
    const presence = peerState.hasPeer
      ? { ready: true, icon: 'check_circle', text: 'ผู้รับบริการรออยู่ในห้องแล้ว' }
      : (activeVisit?.checkinAt
        ? { ready: true, icon: 'how_to_reg', text: 'ผู้รับบริการเช็คอินแล้ว กำลังรอเข้าห้อง' }
        : { ready: false, icon: 'hourglass_top', text: 'ยังไม่พบผู้รับบริการในห้องรอ' });

    const at = activeVisit?.appointmentAt ? new Date(activeVisit.appointmentAt) : null;
    if (!at || Number.isNaN(at.getTime())) {
      return { ...presence, timeIcon: 'schedule', timeText: 'ยังไม่มีเวลานัดหมายในระบบ', overdue: false };
    }
    const hhmm = `${String(at.getHours()).padStart(2, '0')}:${String(at.getMinutes()).padStart(2, '0')} น.`;
    const mins = Math.round((at.getTime() - Date.now()) / 60000);
    if (mins > 0) {
      return { ...presence, timeIcon: 'schedule', timeText: `อีก ${mins} นาที ถึงเวลานัดหมาย ${hhmm}`, overdue: false };
    }
    if (mins === 0) {
      return { ...presence, timeIcon: 'schedule', timeText: `ถึงเวลานัดหมายแล้ว (${hhmm})`, overdue: false };
    }
    return {
      ...presence,
      timeIcon: 'running_with_errors',
      timeText: `เลยเวลานัดหมาย ${hhmm} มาแล้ว ${Math.abs(mins)} นาที`,
      overdue: true,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [peerState.hasPeer, activeVisit, clockTick]);

  const wantMedia = phase === 'prepare' || phase === 'in-call';
  useEffect(() => {
    if (!wantMedia) { setMicStream(null); return undefined; }
    const md = navigator.mediaDevices;
    if (!md || !md.getUserMedia) return undefined;
    let active = true;
    let acquired = null;
    md.getUserMedia({ audio: true, video: false })
      .then((s) => {
        if (!active) { s.getTracks().forEach((t) => t.stop()); return; }
        acquired = s;
        setMicStream(s);
      })
      .catch(() => { /* ไม่มีไมค์/ไม่อนุญาต — สายยังเดินต่อได้แบบไม่มีเสียงขาออก */ });
    return () => { active = false; if (acquired) acquired.getTracks().forEach((t) => t.stop()); };
  }, [wantMedia]);

  const closePeer = () => {
    peerRef.current?.close();
    peerRef.current = null;
    setRemoteStream(null);
    setRtcState(TELEMED_RTC_STATE.idle);
  };

  const ensurePeer = () => {
    if (peerRef.current && !peerRef.current.isClosed()) return peerRef.current;
    if (!rtcSupported()) return null;
    const peer = createTelemedPeer({
      polite: false,
      sendSignal: (payload) => sessionRef.current?.post(TELEMED_SESSION_EVENTS.signal, { signal: payload }),
      onRemoteStream: (s) => setRemoteStream(s),
      onState: (s) => setRtcState(s),
    });
    peerRef.current = peer;
    return peer;
  };

  /* เปิด/ปิดสายตามเฟส — และประกาศให้อีกฝั่งรู้ว่าพร้อมต่อแล้ว */
  useEffect(() => {
    if (phase !== 'in-call') { closePeer(); return undefined; }
    const peer = ensurePeer();
    if (!peer) return undefined;
    sessionRef.current?.post(TELEMED_SESSION_EVENTS.rtcReady, {});
    /* ถ้าฝั่งผู้รับบริการอยู่ในห้องก่อนแล้ว offer รอบแรกจะไม่มีใครรับ — เจรจาซ้ำ */
    if (sessionRef.current?.hasPeer()) peer.negotiate();
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  /* เก็บกวาดตอนออกจากหน้า */
  useEffect(() => () => closePeer(), []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ภาพขาออก = หน้าจอที่แชร์ (ถ้ากำลังแชร์) ไม่งั้นเป็นกล้องแพทย์ · ปิดกล้อง = ไม่ส่งภาพ */
  useEffect(() => {
    const peer = peerRef.current;
    if (!peer || peer.isClosed()) return;
    const outgoing = sharing && screenStream
      ? screenStream.getVideoTracks()[0]
      : (showDoctorVideo && stream ? stream.getVideoTracks()[0] : null);
    peer.setVideoTrack(outgoing || null);
  }, [stream, screenStream, sharing, showDoctorVideo, rtcState, phase]);

  /* เสียงขาออก — ปิดไมค์ด้วย enabled เพื่อไม่ต้องเจรจา SDP ใหม่ */
  useEffect(() => {
    const track = micStream?.getAudioTracks?.()[0] || null;
    if (track) track.enabled = micOn;
    const peer = peerRef.current;
    if (!peer || peer.isClosed()) return;
    peer.setAudioTrack(track);
  }, [micStream, micOn, rtcState, phase]);

  /* บอกอีกฝั่งว่ากล้อง/ไมค์เราเปิดอยู่ไหม เพื่อให้ป้ายบนจอทั้งสองฝั่งตรงกัน */
  useEffect(() => {
    if (phase !== 'in-call') return;
    sessionRef.current?.post(TELEMED_SESSION_EVENTS.media, { camOn: showDoctorVideo, micOn });
  }, [showDoctorVideo, micOn, phase]);

  /* เสียงของอีกฝั่งเล่นผ่าน <audio> ที่แขวนไว้กับ document โดยตรง — ไม่ผูกกับ
     ต้นไม้ React เพราะหน้านี้มีหลายเส้นทางเรนเดอร์ (เต็มจอ / PiP / จบสาย)
     ถ้าฝากไว้กับ <video> ในกรอบภาพ พอผู้รับบริการปิดกล้องหรือแพทย์ย่อหน้าต่าง
     กรอบนั้นจะถูกถอดออกแล้วเสียงจะเงียบไปด้วย */
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    if (!remoteAudioRef.current) {
      const el = document.createElement('audio');
      el.autoplay = true;
      el.setAttribute('playsinline', '');
      el.style.display = 'none';
      document.body.appendChild(el);
      remoteAudioRef.current = el;
    }
    const el = remoteAudioRef.current;
    if (el.srcObject !== remoteStream) el.srcObject = remoteStream || null;
    el.muted = !speakerOn;
    if (remoteStream) el.play?.().catch(() => { /* รอ gesture ถัดไป */ });
    return undefined;
  }, [remoteStream, speakerOn]);

  useEffect(() => () => {
    const el = remoteAudioRef.current;
    if (el) {
      el.srcObject = null;
      el.remove();
      remoteAudioRef.current = null;
    }
  }, []);

  /* คุณภาพสายจากสถิติจริง แทนการสุ่มสถานะ — มีผลเฉพาะตอนต่อสายจริงได้แล้ว */
  useEffect(() => {
    const live = rtcState === TELEMED_RTC_STATE.connected
      || rtcState === TELEMED_RTC_STATE.reconnecting
      || rtcState === TELEMED_RTC_STATE.failed;
    if (phase !== 'in-call' || !live) return undefined;
    let active = true;
    const sample = async () => {
      const stats = await peerRef.current?.readStats();
      if (active) setNetwork(gradeConnection(rtcState, stats));
    };
    sample();
    const id = window.setInterval(sample, 4000);
    return () => { active = false; window.clearInterval(id); };
  }, [rtcState, phase]);

  /* ต่อสายจริงสำเร็จ = ผู้รับบริการอยู่ในห้องแน่นอน (กันเคสที่ join-request
     ตกหล่นระหว่างทาง แล้วหน้าจอค้างอยู่ที่ "รอผู้รับบริการ" ทั้งที่ภาพมาแล้ว) */
  useEffect(() => {
    if (rtcState !== TELEMED_RTC_STATE.connected || phase !== 'in-call') return;
    setPatientPresent(true);
    patientEverPresentRef.current = true;
    patientLeftRef.current = false;
    setPatientLeft(false);
    setJoinRequestOpen(false);
  }, [rtcState, phase]);

  const onUploadBg = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setUploadedBg(url);
    lastBgRef.current = 'uploaded';
    setBg('uploaded');
  };

  /* Clicking the already-selected preset again deselects it (Figma 78:16892). */
  const selectBackground = (nextBg) => {
    setBg((current) => {
      const resolved = current === nextBg ? 'none' : nextBg;
      lastBgRef.current = resolved;
      return resolved;
    });
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

  /* ══════════════ PREPARE (Figma 37:4486) ══════════════
     Device check + virtual-background picker before entering the waiting room. */
  if (phase === 'prepare') {
    return (
      <>
        {/* หน้าเตรียมตัวก่อนเข้าห้องแสดงเป็นป๊อปอัปของระบบ ไม่ใช่หน้าเต็มจอ:
            แพทย์เปิดสายจากหน้างานที่ทำค้างไว้ (เช่น บันทึกการรักษา) หน้านั้นจึงควร
            ยังอยู่ข้างหลังให้เห็น และปิดกลับไปทำงานต่อได้ทันที */}
        <Popup
          open
          onClose={onClose}
          /* extraLarge = ตัวแปรของ design system ที่ยืดเต็มจอ (เว้นขอบ 24px)
             พร้อมกำหนดความสูงให้เต็มด้วย ไม่งั้นกล่องจะสูงตามเนื้อหาแล้วลอยกลางจอ */
          size='extraLarge'
          height='calc(100vh - 2 * var(--dim-space-600, 24px))'
          title='ห้องตรวจรักษาออนไลน์'
          subtitle='Session ID: TM-8842-2024'
          headerStyle={{ alignItems: 'center' }}
          bodyStyle={{ paddingTop: 0, minHeight: 0 }}
        >
        {/* Content — two columns */}
            <div style={{ width: '100%', flex: 1, minHeight: 0, display: 'flex', gap: 'var(--dim-space-400, 16px)', alignItems: 'stretch', justifyContent: 'center' }}>
            {/* Left — video preview column */}
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 'var(--dim-space-400, 16px)', height: '100%' }}>
              {/* การ์ดนัดหมาย/ผู้รับบริการถูกถอดออกจากหน้าเตรียมตัว — ชื่อผู้รับบริการ
                  อยู่บนกรอบภาพอยู่แล้ว และการ์ดเต็มยังอยู่ในห้องตรวจหลังเข้าสาย */}
              {/* video preview card */}
              <div style={{ ...prepareCardStyle, flex: 1, minHeight: 0, gap: 'var(--dim-space-400, 16px)' }}>
                {/* ป๊อปอัปสูงเต็มจอแล้ว กรอบภาพจึงยืดตามได้ — แต่ยังกัน minHeight ไว้
                    เผื่อจอเตี้ย ไม่ให้ยุบจนหายเหมือนตอนที่กล่องสูงตามเนื้อหา */}
                <div style={{ width: '100%', flex: 1, minHeight: 240, position: 'relative', borderRadius: 'var(--dim-radius-500, 16px)', overflow: 'hidden' }}>
                  <TelemedPreparePreview
                    backgroundSrc={virtualBackgroundSrc}
                    blurMode={bg === 'blur'}
                    stream={stream}
                    camOn={camOn}
                    camError={camError}
                  >
                    {/* name badge */}
                    {/* ปุ่มเปลี่ยนพื้นหลังอยู่ในกรอบภาพที่มันมีผล ไม่ใช่ในคอลัมน์ขวา
                        กดแล้วตัวเลือกจะไปกางอยู่ทางขวา */}
                    <button
                      type='button'
                      onClick={() => setBgPanelOpen((v) => !v)}
                      onMouseEnter={() => setBgBtnHover(true)}
                      onMouseLeave={() => setBgBtnHover(false)}
                      aria-pressed={bgPanelOpen}
                      style={{
                        position: 'absolute',
                        right: 'var(--dim-space-400, 16px)',
                        bottom: 'var(--dim-space-400, 16px)',
                        height: 32,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 'var(--dim-space-150, 6px)',
                        paddingLeft: 'var(--dim-space-300, 12px)',
                        paddingRight: 'var(--dim-space-300, 12px)',
                        borderRadius: 'var(--dim-radius-full, 9999px)',
                        border: 'none',
                        cursor: 'pointer',
                        zIndex: 1,
                        background: (bgPanelOpen || bgBtnHover)
                          ? 'var(--surface-brandPrimaryButton-tertiary, #E2F3EB)'
                          : 'var(--surface-card-100, #FFFFFF)',
                        color: 'var(--text-brandPrimary-default, #007549)',
                        fontFamily: 'var(--type-family-body, "Sarabun", sans-serif)',
                        fontSize: 'var(--type-size-sm, 14px)',
                        fontWeight: 'var(--type-weight-medium, 500)',
                        whiteSpace: 'nowrap',
                        boxShadow: 'var(--shadow-brand-drop-bottom-400)',
                        transition: 'background 120ms ease',
                      }}
                    >
                      <Sym name='layers' size={16} color='var(--icon-brandPrimary-default, #007549)' />
                      เปลี่ยนพื้นหลัง
                    </button>
                    <div style={{ position: 'absolute', left: 'var(--dim-space-400, 16px)', bottom: 'var(--dim-space-400, 16px)', height: 32, display: 'inline-flex', alignItems: 'center', gap: 'var(--dim-space-150, 6px)', paddingLeft: 'var(--dim-space-300, 12px)', paddingRight: 'var(--dim-space-300, 12px)', borderRadius: 'var(--dim-radius-full, 9999px)', background: 'var(--surface-card-100, #FFFFFF)', zIndex: 1 }}>
                      <span style={{ fontSize: 'var(--type-size-sm, 14px)', fontWeight: 'var(--type-weight-medium, 500)', color: 'var(--text-content-default, #363B3F)' }}>{DOCTOR.name} (คุณ)</span>
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

              {/* status tags — device selectors (Figma 78:16405 / 103:53180) */}
              {/* ตัวเลือกอุปกรณ์สามชิ้นต้องอยู่บรรทัดเดียวกันเสมอ — ปล่อยให้ป้ายชื่อ
                  ยาวเกินแล้วตัดด้วย ellipsis ดีกว่าให้ปุ่มตกไปอีกบรรทัด */}
              <div style={{ ...prepareCardStyle, flexDirection: 'row', gap: 'var(--dim-space-200, 8px)', alignItems: 'center', justifyContent: 'center', flexWrap: 'nowrap' }}>
                <DevicePickerPill icon='mic' ariaLabel='เลือกไมค์' options={TELEMED_MIC_DEVICES} value={micDevice} onChange={setMicDevice} />
                <MicLevelMeter stream={micStream} />
                <DevicePickerPill icon='volume_up' ariaLabel='เลือกลำโพง' options={TELEMED_SPEAKER_DEVICES} value={speakerDevice} onChange={setSpeakerDevice} />
                <DevicePickerPill icon='videocam' ariaLabel='เลือกกล้อง' options={TELEMED_CAMERA_DEVICES} value={cameraDevice} onChange={setCameraDevice} />
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
                boxShadow: 'var(--shadow-brand-drop-bottom-400)',
                paddingBottom: 'var(--dim-space-400, 16px)',
              }}
            >
              {/* โปรไฟล์ผู้รับบริการ + สถานะการรอ วางเหนือปุ่มเข้าห้อง — ก่อนกดเข้าห้อง
                  แพทย์ต้องรู้ว่าเข้าห้องของใคร และอีกฝ่ายพร้อมแล้วหรือยัง */}
              <div
                className='flex items-center w-full'
                style={{
                  gap: 'var(--dim-space-300, 12px)',
                  padding: 'var(--dim-space-300, 12px)',
                  borderRadius: 'var(--dim-radius-400, 12px)',
                  background: 'var(--surface-brandPrimary-quaternary, #F4FBF8)',
                  flexShrink: 0,
                }}
              >
                <span
                  style={{
                    width: 'var(--dim-size-900, 44px)', height: 'var(--dim-size-900, 44px)',
                    borderRadius: 'var(--dim-radius-full, 9999px)', overflow: 'hidden', flexShrink: 0,
                    background: 'var(--surface-neutral-tertiary, #F4F5F5)',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  {activePatient.avatarUrl ? (
                    <img src={activePatient.avatarUrl} alt={activePatient.fullName} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  ) : (
                    <Sym name='person' size={22} fill={1} color='var(--icon-content-tertiary, #858C92)' />
                  )}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontFamily: 'var(--type-family-heading-graphic2, "Mitr", sans-serif)',
                      fontSize: 'var(--type-size-base, 16px)',
                      fontWeight: 'var(--type-weight-regular, 400)',
                      color: 'var(--text-content-default, #363B3F)',
                      lineHeight: 1.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}
                  >
                    {activePatient.fullName}
                  </div>
                  <div style={{ fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary, #858C92)', lineHeight: 1.5 }}>
                    HN: {activePatient.hn}
                  </div>
                  <div
                    className='flex items-center'
                    style={{
                      gap: 'var(--dim-space-100, 4px)',
                      marginTop: 'var(--dim-space-100, 4px)',
                      fontSize: 'var(--type-size-xs, 12px)',
                      fontWeight: 'var(--type-weight-medium, 500)',
                      color: waitStatus.ready
                        ? 'var(--text-positive-primary, #08A768)'
                        : 'var(--text-content-secondary, #636B72)',
                    }}
                  >
                    <Sym name={waitStatus.icon} size={14} fill={waitStatus.ready ? 1 : 0} />
                    {waitStatus.text}
                  </div>
                  <div
                    className='flex items-center'
                    style={{
                      gap: 'var(--dim-space-100, 4px)',
                      fontSize: 'var(--type-size-xs, 12px)',
                      fontWeight: 'var(--type-weight-medium, 500)',
                      color: waitStatus.overdue
                        ? 'var(--text-alert-warning, #C2410C)'
                        : 'var(--text-content-secondary, #636B72)',
                    }}
                  >
                    <Sym name={waitStatus.timeIcon} size={14} />
                    {waitStatus.timeText}
                  </div>
                </div>
              </div>

              {/* กดเปลี่ยนพื้นหลังแล้วคอลัมน์ขวากลายเป็นหน้าเลือกพื้นหลัง — บล็อก
                  โปรไฟล์กับนาฬิกานับถอยหลังด้านบนยังอยู่ ไม่ถูกแทนที่ */}
              {!bgPanelOpen && (
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
                      width: 'fit-content',
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
                        ? 'var(--surface-neutral-tertiary, #F4F5F5)'
                        : 'var(--surface-brandPrimaryButton-default, #007549)',
                      color: camError || mediaErrorType
                        ? 'var(--text-content-tertiary, #858C92)'
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
                    เข้าห้องตรวจ
                  </button>

                  <div className='flex items-center' style={{ gap: 'var(--dim-space-300, 12px)' }}>
                    <button
                      type='button'
                      className='flex items-center'
                      onClick={() => openPeople('list')}
                      aria-label='ดูผู้เข้าร่วม'
                      style={{ padding: 0, border: 'none', background: 'transparent', cursor: 'pointer' }}
                    >
                      {PREPARE_PARTICIPANTS.map((p, i) => (
                        <span
                          key={p.id}
                          style={{
                            position: 'relative',
                            zIndex: i + 1,
                            width: 'var(--dim-size-600, 32px)',
                            height: 'var(--dim-size-600, 32px)',
                            borderRadius: 'var(--dim-radius-full, 9999px)',
                            border: 'var(--dim-stroke-200, 2px) solid var(--border-image-default, #FFFFFF)',
                            marginLeft: i === 0 ? 0 : 'calc(var(--dim-space-300, 12px) * -1)',
                            background: 'var(--surface-neutral-secondary, #F3F4F6)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden',
                            flexShrink: 0,
                          }}
                        >
                          <img
                            src={p.avatar}
                            alt={p.name}
                            style={{
                              position: 'absolute',
                              inset: 0,
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              pointerEvents: 'none',
                            }}
                          />
                        </span>
                      ))}
                      <span
                        style={{
                          position: 'relative',
                          zIndex: PREPARE_PARTICIPANTS.length + 1,
                          width: 'var(--dim-size-600, 32px)',
                          height: 'var(--dim-size-600, 32px)',
                          borderRadius: 'var(--dim-radius-full, 9999px)',
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
                    </button>
                    <BrandCircleSubdueIconButton
                      variant='outline'
                      size='xs'
                      icon='person_add'
                      aria-label='เชิญผู้เข้าร่วม'
                      onClick={() => openPeople('add')}
                      style={{ border: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimaryButton-tertiary, #C5EDDA)' }}
                    />
                  </div>
                </div>
              </div>
              )}

              {bgPanelOpen && (
                <>
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
                <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
                  <button
                    type='button'
                    onClick={() => uploadInputRef.current?.click()}
                    onMouseEnter={() => setUploadHover(true)}
                    onMouseLeave={() => setUploadHover(false)}
                    aria-label='อัปโหลดภาพพื้นหลัง'
                    style={{
                      /* ขนาดคงที่เสมอ — เดิมพออัปโหลดแล้วกล่องจะสลับเป็น flex:1
                         แล้วขยายใหญ่ขึ้นทั้งที่หน้าที่มันเหมือนเดิม */
                      flexShrink: 0,
                      width: 128,
                      minWidth: 0,
                      height: 72,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 'var(--dim-space-200, 8px)',
                      cursor: 'pointer',
                      overflow: 'hidden',
                      borderRadius: 'var(--dim-radius-200, 8px)',
                      border: uploadHover
                        ? 'var(--dim-stroke-150, 1.5px) dashed var(--border-formbuilder-hover, #08A768)'
                        : 'var(--dim-stroke-150, 1.5px) dashed var(--border-formbuilder-default, #C5EDDA)',
                      background: uploadHover
                        ? 'var(--surface-formbuilder-hover, #F4FBF8)'
                        : 'var(--surface-formbuilder-default, #F4FBF8)',
                      transition: 'border-color 150ms ease-out, background-color 150ms ease-out',
                    }}
                  >
                    <div className='flex flex-col items-center' style={{ gap: 'var(--dim-space-200, 8px)', flex: 1 }}>
                      <Sym name='image' size={16} color='var(--text-formbuilder-text, #007549)' />
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
                  </button>
                  {uploadedBg && (
                    <button
                      type='button'
                      onClick={() => selectBackground('uploaded')}
                      aria-label='ภาพที่อัปโหลด'
                      aria-pressed={bg === 'uploaded'}
                      style={{
                        position: 'relative',
                        flexShrink: 0,
                        width: 128,
                        height: 72,
                        minWidth: 0,
                        padding: 0,
                        cursor: 'pointer',
                        borderRadius: 'var(--dim-radius-200, 8px)',
                        overflow: 'hidden',
                        border: bg === 'uploaded'
                          ? 'var(--dim-stroke-400, 4px) solid var(--brand-p300, #91DFBB)'
                          : 'none',
                        background: 'var(--surface-neutral-secondary, #F1F3F5)',
                      }}
                    >
                      <img
                        src={uploadedBg}
                        alt='ภาพที่อัปโหลด'
                        draggable='false'
                        style={{
                          position: 'absolute',
                          inset: 0,
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          pointerEvents: 'none',
                        }}
                      />
                      {bg === 'uploaded' && (
                        <span
                          style={{
                            position: 'absolute',
                            top: 'var(--dim-space-100, 4px)',
                            right: 'var(--dim-space-100, 4px)',
                            width: 'var(--dim-size-500, 24px)',
                            height: 'var(--dim-size-500, 24px)',
                            borderRadius: 'var(--dim-radius-full, 9999px)',
                            background: 'var(--surface-colorfulbadge-green-bold, #54CF97)',
                            border: 'var(--dim-stroke-200, 2px) solid var(--border-image-default, #FFFFFF)',
                            boxSizing: 'border-box',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Sym name='check' size={14} fill={1} color='var(--text-brandPrimaryButton-on-brand, #FFFFFF)' />
                        </span>
                      )}
                    </button>
                  )}
                </div>
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
                  className='w-full'
                  style={{
                    flex: 1,
                    minHeight: 0,
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                    gap: 'var(--dim-space-200, 8px)',
                    alignContent: 'start',
                    overflowY: 'auto',
                  }}
                >
                  {/* 3 รูปต่อแถว: ใช้ grid แทนการหั่นเป็นแถวละ 2 ด้วยมือ — แถวสุดท้าย
                      ที่มีไม่ครบจะได้ไม่ยืดจนใหญ่กว่าแถวอื่น */}
                  {BG_PRESETS.map((p) => {
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
                              width: '100%',
                              minWidth: 0,
                              aspectRatio: '16 / 9',
                              padding: 0,
                              cursor: 'pointer',
                              borderRadius: 'var(--dim-radius-200, 8px)',
                              overflow: 'hidden',
                              border: on
                                ? 'var(--dim-stroke-400, 4px) solid var(--brand-p300, #91DFBB)'
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
                                pointerEvents: 'none',
                              }}
                            />
                            {on && (
                              <span
                                style={{
                                  position: 'absolute',
                                  top: 'var(--dim-space-100, 4px)',
                                  right: 'var(--dim-space-100, 4px)',
                                  width: 'var(--dim-size-500, 24px)',
                                  height: 'var(--dim-size-500, 24px)',
                                  borderRadius: 'var(--dim-radius-full, 9999px)',
                                  background: 'var(--surface-colorfulbadge-green-bold, #54CF97)',
                                  border: 'var(--dim-stroke-200, 2px) solid var(--border-image-default, #FFFFFF)',
                                  boxSizing: 'border-box',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                <Sym name='check' size={14} fill={1} color='var(--text-brandPrimaryButton-on-brand, #FFFFFF)' />
                              </span>
                            )}
                          </button>
                    );
                  })}
                </div>
              </div>
                </>
              )}
            </aside>
          </div>

        </Popup>


        <TelemedParticipantsPopup
          open={peopleOpen}
          onClose={() => setPeopleOpen(false)}
          initialView={peopleView}
          doctor={DOCTOR}
          patient={{ ...PATIENT, fullName: activePatient.fullName || 'นายสมชาย มั่นใจดี', avatar: activePatient.avatarUrl }}
          doctorMicOn={micOn}
          doctorCamOn={camOn && !camError}
          patientMicOn={patientMicOn}
          patientCamOn={patientCamOn}
          participants={participants}
          onToggleSelfMic={() => setMicOn((v) => !v)}
          onToggleSelfCam={() => { if (camError) { setCamError(false); setCamOn(true); } else setCamOn((v) => !v); }}
          onTogglePatientMic={() => setPatientMicOn((v) => !v)}
          onTogglePatientCam={() => setPatientCamOn((v) => !v)}
          onToggleParticipantMedia={toggleParticipantMedia}
          onInvite={inviteFromDirectory}
          onUninvite={uninviteFromDirectory}
          meetingLink={meetingLink}
          linkCopied={linkCopied}
          onCopyLink={copyLink}
        />

        <AlertDialog
          open={mediaErrorType === 'permission'}
          type='destructive'
          title='ไม่สามารถเข้าถึงกล้องหรือไมโครโฟน'
          description='กรุณาอนุญาตการใช้งานกล้องและไมโครโฟนในเบราว์เซอร์ แล้วลองใหม่อีกครั้ง'
          cancelLabel='ดูวิธีแก้ไข'
          confirmLabel='ลองใหม่'
          onCancel={() => setMediaHelpOpen(true)}
          onConfirm={retryMedia}
          onClose={() => setMediaErrorType(null)}
        />

        <AlertDialog
          open={mediaErrorType === 'device-not-found'}
          type='destructive'
          title='ไม่พบกล้องหรือไมโครโฟน'
          description='อุปกรณ์อาจไม่ได้เชื่อมต่อ หรือกำลังถูกใช้งานโดยแอปพลิเคชันอื่น'
          cancelLabel='ปิด'
          confirmLabel='ลองใหม่'
          onCancel={() => setMediaErrorType(null)}
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

        {/* Figma 85:11890 · Connecting overlay on prepare */}
        <TelemedConnectingPopup
          open={connectingOpen && !abortJoinOpen}
          onCancel={requestAbortJoin}
          patient={{ name: activePatient.fullName, avatar: activePatient.avatarUrl }}
        />

        {/* Figma 94:48768 · ConfirmAbortJoin */}
        <AlertDialog
          open={abortJoinOpen}
          type='warning'
          title='ยืนยันการยกเลิกเข้าห้องปรึกษา?'
          description='หากยกเลิกตอนนี้ คุณจะต้องเริ่มขั้นตอนเข้าห้องปรึกษาใหม่'
          cancelLabel='อย่าเพิ่งยกเลิก'
          confirmLabel='ยืนยันยกเลิก'
          onCancel={stayConnecting}
          onConfirm={confirmAbortJoin}
          onClose={stayConnecting}
        />
      </>
    );
  }

  /* ══════════════ POST-CALL / ROOM CLOSED (Figma 215:22019) ══════════════ */
  if (phase === 'ended') {
    const roomClosed = closeReason === 'timeslot' || closeReason === 'endMeeting' || closeReason === 'no-show';

    if (roomClosed) {
      return (
        <Popup
          open
          onClose={onClose}
          width={520}
          headerStyle={{ alignItems: 'center' }}
          bodyStyle={{ paddingTop: 0 }}
        >
            <div style={{
              width: 448, maxWidth: '94vw',
              padding: 'var(--dim-space-800, 32px)',
              borderRadius: 'var(--dim-radius-500, 16px)',
              background: 'var(--surface-card-100, #FFFFFF)',
              boxShadow: 'var(--shadow-card)',
              border: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary, #F4F5F5)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--dim-space-600, 24px)',
              textAlign: 'center',
            }}
            >
              <div style={{
                width: 'var(--dim-size-1400, 64px)', height: 'var(--dim-size-1400, 64px)', borderRadius: 'var(--dim-radius-full, 9999px)',
                background: 'var(--surface-negative-secondary, #FBE8E8)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
              >
                <Sym name='call_end' size={32} fill={1} color='var(--icon-alertdialog-destructive, #B91C1C)' />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--dim-space-200, 8px)', width: '100%' }}>
                <h1 style={{
                  margin: 0,
                  fontFamily: 'var(--type-family-heading-graphic2, "Mitr", sans-serif)',
                  fontSize: 'var(--type-size-2xl, 24px)',
                  fontWeight: 'var(--type-weight-regular, 400)',
                  color: 'var(--text-topic-primary-title, #007549)',
                  lineHeight: 1.375,
                }}
                >
                  ห้องปรึกษาถูกปิดแล้ว
                </h1>
                <p style={{
                  margin: 0,
                  fontSize: 'var(--type-size-base, 16px)',
                  color: 'var(--text-alertdialog-subtext, #636B72)',
                  lineHeight: 1.5,
                }}
                >
                  {closeReason === 'no-show'
                    ? `ทำเครื่องหมายขาดนัดแล้ว · ${activePatient.fullName}`
                    : closeReason === 'timeslot'
                      ? 'หมดเวลานัดหมาย · ระบบปิดห้องปรึกษาโดยอัตโนมัติ'
                      : 'ได้สิ้นสุดการปรึกษาและปิดห้องแล้ว\nระบบได้นำคุณออกจากห้องปรึกษาโดยอัตโนมัติ'}
                </p>
              </div>
              <div style={{
                width: '100%',
                padding: 'var(--dim-space-400, 16px)',
                borderRadius: 'var(--dim-radius-400, 12px)',
                background: 'var(--surface-brandPrimary-quaternary, #F4FBF8)',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--dim-space-300, 12px)',
              }}
              >
                {/* การ์ดสรุปต้องมีรูปผู้รับบริการด้วย ไม่ใช่ชื่อกับ HN ลอย ๆ */}
                <span
                  style={{
                    width: 'var(--dim-size-1000, 48px)', height: 'var(--dim-size-1000, 48px)',
                    borderRadius: 'var(--dim-radius-full, 9999px)', overflow: 'hidden', flexShrink: 0,
                    background: 'var(--surface-neutral-tertiary, #F4F5F5)',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  {activePatient.avatarUrl ? (
                    <img src={activePatient.avatarUrl} alt={activePatient.fullName} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  ) : (
                    <Sym name='person' size={24} fill={1} color='var(--icon-content-tertiary, #858C92)' />
                  )}
                </span>
                <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontFamily: 'var(--type-family-heading-graphic2, "Mitr", sans-serif)', fontSize: 'var(--type-size-base, 16px)', color: 'var(--text-content-default, #363B3F)' }}>
                  {activePatient.fullName}
                </div>
                <div style={{ fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-tertiary, #858C92)', marginTop: 'var(--dim-space-100, 4px)' }}>
                  HN: {activePatient.hn || '67-004321'}
                </div>
                <div style={{ fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-quaternary, #ADB2B7)', marginTop: 'var(--dim-space-200, 8px)' }}>
                  Session ID: TM-8842-2024 · ระยะเวลา {fmtElapsed(elapsed)}
                </div>
                </div>
              </div>
              <BrandButton
                size='lg'
                onClick={() => { onClose?.(); history.push('/treat/queue'); }}
                style={{ width: '100%' }}
              >
                กลับสู่หน้าหลัก
              </BrandButton>
            </div>
        </Popup>
      );
    }

    return (
      <div className='mih-telemed-room' style={{ ...overlayStyle, alignItems: 'center', animation: 'mih-telemed-room-in 220ms cubic-bezier(0.2, 0.8, 0.2, 1)' }}>
        <div style={{
          ...cardStyle, width: 448, maxWidth: '94vw', maxHeight: '88vh', overflowY: 'auto',
          padding: 'var(--dim-space-800, 32px)', fontFamily: 'var(--type-family-body, "Sarabun", sans-serif)',
        }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--dim-space-300, 12px)', marginBottom: 'var(--dim-space-600, 24px)' }}>
            <Sym name='check_circle' size={32} fill={1} color='var(--icon-alertdialog-success, #196C65)' />
            <h1 style={{ margin: 0, fontSize: 'var(--type-size-lg, 18px)', fontWeight: 'var(--type-weight-heading-strong, var(--type-weight-medium, 500))', color: 'var(--text-alertdialog-text, #363B3F)', textAlign: 'center' }}>
              จบการปรึกษาแล้ว
            </h1>
            <p style={{ margin: 0, fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-alertdialog-subtext, #636B72)', textAlign: 'center', lineHeight: 1.6 }}>
              {activePatient.fullName} · HN {activePatient.hn} · ระยะเวลา {fmtElapsed(elapsed)}
              {consent === 'granted' ? ' · บันทึกสายแล้ว' : ' · ไม่ได้บันทึกสาย'}
            </p>
          </div>

          <div style={{ fontWeight: 'var(--type-weight-bold, 700)', fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-default, #363B3F)', marginBottom: 'var(--dim-space-150, 6px)' }}>สรุปคำปรึกษา</div>
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={3}
            style={{
              width: '100%', resize: 'vertical', borderRadius: 'var(--dim-radius-400, 12px)',
              border: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-tertiary, #E2E4E6)',
              padding: 'var(--dim-space-300, 12px)', fontFamily: 'inherit', fontSize: 'var(--type-size-sm, 14px)',
              color: 'var(--text-content-default, #363B3F)', lineHeight: 1.6, outline: 'none', marginBottom: 'var(--dim-space-400, 16px)',
            }}
          />

          <div style={{ display: 'flex', gap: 'var(--dim-space-300, 12px)', marginBottom: 'var(--dim-space-600, 24px)' }}>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 'var(--dim-space-200, 8px)', padding: 'var(--dim-space-300, 12px)', borderRadius: 'var(--dim-radius-400, 12px)', background: 'var(--surface-brandPrimary-quaternary, #F4FBF8)' }}>
              <Sym name='pill' size={22} fill={1} color='var(--icon-brandPrimary-default, #007549)' />
              <div style={{ fontWeight: 'var(--type-weight-bold, 700)', fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-default, #363B3F)' }}>ยา {POST_MEDS.length} รายการ</div>
            </div>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 'var(--dim-space-200, 8px)', padding: 'var(--dim-space-300, 12px)', borderRadius: 'var(--dim-radius-400, 12px)', background: 'var(--surface-brandPrimary-quaternary, #F4FBF8)' }}>
              <Sym name='science' size={22} fill={1} color='var(--icon-brandPrimary-default, #007549)' />
              <div style={{ fontWeight: 'var(--type-weight-bold, 700)', fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-default, #363B3F)' }}>ตรวจ {POST_ORDERS.length} รายการ</div>
            </div>
          </div>

          {/* ── สถานะการส่งข้อมูลเข้า PHCIS (TOR §1.13.3) ── */}
          <div
            style={{
              padding: 'var(--dim-space-400, 16px)',
              borderRadius: 'var(--dim-radius-400, 12px)',
              border: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary, #F4F5F5)',
              background: 'var(--surface-neutral-quaternary, #F9FBFB)',
              marginBottom: 'var(--dim-space-600, 24px)',
              display: 'flex', flexDirection: 'column', gap: 'var(--dim-space-200, 8px)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--dim-space-200, 8px)' }}>
              <Sym
                name={PHCIS_SYNC_STATUS[phcisSync?.status]?.icon || 'cloud_upload'}
                size={20}
                fill={1}
                color={phcisSync?.status === 'synced'
                  ? 'var(--icon-alertdialog-success, #196C65)'
                  : phcisSync?.status === 'failed'
                    ? 'var(--icon-alertdialog-destructive, #B91C1C)'
                    : 'var(--text-content-tertiary, #858C92)'}
              />
              <div style={{ flex: 1, fontSize: 'var(--type-size-sm, 14px)', fontWeight: 'var(--type-weight-medium, 500)', color: 'var(--text-content-default, #363B3F)' }}>
                {phcisSync?.status === 'no-show'
                  ? 'ไม่ได้ส่งเข้า PHCIS — ไม่มีการให้บริการ'
                  : phcisSync?.status && PHCIS_SYNC_STATUS[phcisSync.status]
                    ? `ส่งข้อมูลเข้า PHCIS: ${PHCIS_SYNC_STATUS[phcisSync.status].label}`
                    : 'ยังไม่ได้ส่งข้อมูลเข้า PHCIS'}
              </div>
            </div>
            <div style={{ fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-secondary, #636B72)', lineHeight: 1.6 }}>
              {phcisSync?.status === 'synced'
                ? `เลขอ้างอิง ${phcisSync.phcisRef} · สรุปการปรึกษาและคำสั่งถูกบันทึกไว้ในสมุดส่งข้อมูล (จำลอง — ยังไม่ได้ต่อ API PHCIS จริง)`
                : phcisSync?.reason || 'ระบบจะส่งอัตโนมัติเมื่อปิดสาย'}
            </div>
            {phcisSync?.status === 'failed' && (() => {
              const target = syncFixTarget();
              return (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--dim-space-200, 8px)', alignItems: 'center' }}>
                  <button
                    type='button'
                    onClick={() => { onClose?.(); history.push(target.path); }}
                    style={{ ...primaryBtnStyle }}
                  >
                    {target.label}
                  </button>
                  <button
                    type='button'
                    onClick={retryPhcisSync}
                    style={{ ...secondaryBtnStyle }}
                  >
                    ลองส่งใหม่
                  </button>
                  <span style={{ flexBasis: '100%', fontSize: 'var(--type-size-xxs, 10px)', color: 'var(--text-content-tertiary, #858C92)', lineHeight: 1.6 }}>
                    แก้เหตุข้างต้นที่หน้าปลายทางก่อน แล้วจึงกด “ลองส่งใหม่” — กดซ้ำโดยไม่แก้จะได้ผลเดิม
                  </span>
                </div>
              );
            })()}
          </div>

          <div style={{ display: 'flex', gap: 'var(--dim-space-300, 12px)' }}>
            <button
              type='button'
              onClick={() => { onClose?.(); history.push(activeVisit ? phcisRecordLink(activeVisit) : '/treat/record'); }}
              style={{ ...secondaryBtnStyle, flex: 1, justifyContent: 'center' }}
            >
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
     Figma Picture-in-Picture (58:13727) — draggable anywhere on screen. */
  if (minimized) {
    return (
      <DraggablePip
        mode='fixed'
        width={320}
        defaultEdge={{ right: 'var(--dim-space-500, 20px)', bottom: 'var(--dim-space-500, 20px)' }}
        zIndex={TELEMED_Z_TOP}
        aria-label='หน้าต่าง Telemedicine PiP — ลากย้ายได้ทั้งหน้าจอ'
        className='mih-telemed-pip'
        style={{
          animation: 'mih-telemed-pip-in 220ms cubic-bezier(0.2, 0.8, 0.2, 1)',
          transition: 'box-shadow 160ms ease',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--dim-space-400, 16px)',
          padding: 'var(--dim-space-300, 12px)',
          borderRadius: 'var(--dim-radius-500, 16px)',
          overflow: 'hidden',
          background: 'var(--surface-card-100, #FFFFFF)',
          /* PiP ลอยเหนือหน้าอื่นที่พื้นหลังต่างกันไป เงาระดับ 100/200 จึงกลืนกับพื้น
             — ใช้ระดับ 400 ของโทน brand ให้เข้มพอโดยไม่หลุดจากโทนของระบบ */
          boxShadow: 'var(--shadow-brand-drop-bottom-400)',
          fontFamily: 'var(--type-family-body, "Sarabun", sans-serif)',
        }}
      >
        <div style={{ position: 'relative', width: '100%', aspectRatio: '320 / 180', borderRadius: 'var(--dim-radius-400, 12px)', overflow: 'hidden' }}>
          <VideoTile
            name={sharing ? 'หน้าจอที่คุณแชร์' : activePatient.fullName}
            camOn={sharing ? true : showPatientVideo}
            micOn={patientMicOn}
            accent='#0EA5E9'
            /* ย่อหน้าต่างแล้วต้องยังเห็นภาพผู้รับบริการจริง — เดิมส่งเฉพาะภาพหน้าจอ
               ที่แชร์ กรอบ PiP จึงกลับไปเป็นรูปแทนทุกครั้งที่ไม่ได้แชร์หน้าจอ */
            stream={sharing && screenStream ? screenStream : (showPatientVideo ? remoteStream : undefined)}
            mirror={false}
            fit={sharing ? 'contain' : 'cover'}
            avatar={activePatient.avatarUrl}
          />
          <div style={{ position: 'absolute', top: 'var(--dim-space-200, 8px)', left: 'var(--dim-space-200, 8px)', display: 'flex', gap: 'var(--dim-space-150, 6px)', pointerEvents: 'none' }}>
            <Pill tone='danger' icon='schedule'>{fmtElapsed(elapsed)}</Pill>
            {recording && <Pill tone='danger' icon='fiber_manual_record'>REC</Pill>}
          </div>
        </div>

        <div style={{
          fontFamily: 'var(--type-family-body, "Sarabun", sans-serif)',
          fontSize: 'var(--type-size-sm, 14px)',
          fontWeight: 'var(--type-weight-medium, 500)',
          color: 'var(--text-content-default, #363B3F)',
          textAlign: 'center',
          lineHeight: 1.5,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          width: '100%',
        }}
        >
          {DOCTOR.name} (กำลังพูด)
        </div>

        <div
          data-no-drag
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--dim-space-150, 6px)', width: '100%' }}
        >
          {micOn ? (
            <BrandCircleSubdueIconButton variant='outline' size='md' icon='mic' aria-label='ปิดไมค์' onClick={() => setMicOn((v) => !v)} style={{ border: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimaryButton-tertiary, #C5EDDA)' }} />
          ) : (
            <DangerCircleSubdueIconButton variant='outline' size='md' icon='mic_off' aria-label='เปิดไมค์' onClick={() => setMicOn((v) => !v)} style={{ border: 'var(--dim-stroke-100, 1px) solid var(--border-dangerButton-tertiary, #FECACA)' }} />
          )}
          {camOn && !camError ? (
            <BrandCircleSubdueIconButton variant='outline' size='md' icon='videocam' aria-label='ปิดกล้อง' onClick={() => setCamOn((v) => !v)} style={{ border: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimaryButton-tertiary, #C5EDDA)' }} />
          ) : (
            <DangerCircleSubdueIconButton variant='outline' size='md' icon='videocam_off' aria-label='เปิดกล้อง' onClick={() => { if (camError) { setCamError(false); setCamOn(true); } else setCamOn((v) => !v); }} style={{ border: 'var(--dim-stroke-100, 1px) solid var(--border-dangerButton-tertiary, #FECACA)' }} />
          )}
          <BrandCircleSubdueIconButton variant='outline' size='md' icon={sharing ? 'stop_screen_share' : 'screen_share'} aria-label={sharing ? 'หยุดแชร์' : 'แชร์หน้าจอ'} active={sharing} onClick={toggleShare} style={sharing ? undefined : { border: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimaryButton-tertiary, #C5EDDA)' }} />
          <BrandCircleSubdueIconButton variant='outline' size='md' icon='open_in_full' aria-label='ขยาย' onClick={onMaximize} style={{ border: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimaryButton-tertiary, #C5EDDA)' }} />
          <DangerCircleIconButton variant='fill' size='md' icon='call_end' aria-label='วางสาย' onClick={requestLeave} />
        </div>
      </DraggablePip>
    );
  }

  /* ══════════════ IN-CALL ══════════════ */
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 'var(--sm-z-overlay, 1300)',
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
          <Sym name='screen_share' size={20} color='var(--icon-alertdialog-destructive, #B91C1C)' />
          <span style={{ fontFamily: 'var(--type-family-heading-graphic2, "Mitr", sans-serif)', fontSize: 'var(--type-size-sm, 14px)', fontWeight: 'var(--type-weight-medium, 500)', color: 'var(--text-negative-primary, #B91C1C)' }}>
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
          <div style={{ fontFamily: 'var(--type-family-heading-graphic2, "Mitr", sans-serif)', fontSize: 'var(--type-size-base, 16px)', fontWeight: 'var(--type-weight-regular, 400)', color: 'var(--text-topic-secondary-title, #007549)', lineHeight: 1.5 }}>ห้องปรึกษาแพทย์ออนไลน์</div>
          {/* ตัวบอกสถานะต้องไม่เป็นปุ่มลับ — เดิมคลิกที่นี่จะสลับสถานะสัญญาณเอง
              ทำให้แพทย์ที่เผลอคลิกดู Session ID พาสายเข้าโหมดเสียงโดยไม่ตั้งใจ */}
          <div style={{ fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-topic-tertiary-subtext, #ADB2B7)', fontWeight: 'var(--type-weight-medium, 500)' }}>Session ID: TM-8842-2024 · {netLabel}</div>
        </div>

        {/* status badges — Figma "Status Badges" (70:4216): recording pill + call-duration clock pill */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--dim-space-200, 8px)' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--dim-space-150, 6px)', height: 'var(--dim-size-600, 32px)', paddingLeft: 'var(--dim-space-300, 12px)', paddingRight: 'var(--dim-space-300, 12px)', borderRadius: 'var(--dim-radius-full, 9999px)', background: recording ? 'var(--surface-colorfulbadge-pink-bold, #EC4899)' : 'var(--surface-negative-secondary, #FBE8E8)', color: recording ? 'var(--text-content-on-content, #FFFFFF)' : 'var(--text-negative-primary, #B91C1C)' }}>
            <Sym name='radio_button_checked' size={16} fill={1} color={recording ? 'var(--text-content-on-content, #FFFFFF)' : 'var(--text-negative-primary, #B91C1C)'} />
            <span style={{ fontSize: 'var(--type-size-sm, 14px)', fontWeight: 'var(--type-weight-medium, 500)' }}>{recording ? 'กำลังบันทึกการสนทนา' : 'กำลังสนทนา'}</span>
          </div>
          <div
            style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--dim-space-100, 4px)', height: 'var(--dim-size-600, 32px)', paddingLeft: 'var(--dim-space-300, 12px)', paddingRight: 'var(--dim-space-300, 12px)', borderRadius: 'var(--dim-radius-full, 9999px)', background: 'var(--surface-colorfulbadge-grey, #F5F7F9)', color: 'var(--text-colorfulbadge-grey, #4D5358)' }}
          >
            <Sym name='schedule' size={16} color='var(--text-colorfulbadge-grey, #4D5358)' />
            <span style={{ fontSize: 'var(--type-size-sm, 14px)', fontWeight: 'var(--type-weight-medium, 500)' }}>{fmtElapsed(elapsed)}</span>
          </div>
        </div>

        {network === 'weak' && (
          <ColorfulBadge style='yellow' hierarchy='primary' size='default' icon='wifi_off' width='hug'>
            สัญญาณอินเทอร์เน็ตไม่เสถียร · คุณภาพวิดีโออาจลดลง
          </ColorfulBadge>
        )}

        {network === 'lost' && (
          <ColorfulBadge style='red' hierarchy='primary' size='default' icon='wifi_off' width='hug'>
            การเชื่อมต่อหลุด · ระบบกำลังพยายามเชื่อมต่อใหม่
          </ColorfulBadge>
        )}

        {audioOnly && (
          <ColorfulBadge style='orange' hierarchy='secondary' size='default' icon='headphones' width='hug'>
            โหมดเสียงอย่างเดียว
          </ColorfulBadge>
        )}

        {/* participant profiles — Figma 58:8962 → Participant popup 114:56061 */}
        {(() => {
          const people = [
            { name: DOCTOR.name, avatar: DOCTOR.avatar, accent: '#10B981' },
            { name: activePatient.fullName, avatar: activePatient.avatarUrl, accent: '#0EA5E9' },
            ...participants.map((p) => ({ id: p.id, name: p.name, avatar: p.avatar, accent: p.accent })),
          ];
          const shown = people.slice(0, 3);
          const extra = people.length - shown.length;
          return (
            <button
              type='button'
              onClick={() => openPeople('list')}
              title='ผู้เข้าร่วม'
              aria-label='ผู้เข้าร่วม'
              style={{ display: 'flex', alignItems: 'center', border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}
            >
              {shown.map((pp, i) => (
                <span
                  key={pp.id || i}
                  style={{
                    width: 'var(--dim-size-600, 32px)',
                    height: 'var(--dim-size-600, 32px)',
                    borderRadius: 'var(--dim-radius-full, 9999px)',
                    border: 'var(--dim-stroke-200, 2px) solid var(--surface-card-100, #FFFFFF)',
                    background: pp.avatar
                      ? `center / cover no-repeat url(${pp.avatar}), var(--surface-neutral-tertiary, #F3F4F6)`
                      : `linear-gradient(135deg,${pp.accent},#6366F1)`,
                    marginLeft: i === 0 ? 0 : -12,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    zIndex: i + 1,
                  }}
                >
                  {!pp.avatar && <Sym name='person' size={18} fill={1} color='var(--text-content-on-content, #FFFFFF)' />}
                </span>
              ))}
              {extra > 0 && (
                <span style={{
                  width: 'var(--dim-size-600, 32px)',
                  height: 'var(--dim-size-600, 32px)',
                  borderRadius: 'var(--dim-radius-full, 9999px)',
                  border: 'var(--dim-stroke-200, 2px) solid var(--surface-card-100, #FFFFFF)',
                  background: 'var(--surface-neutral-tertiary, #F3F4F6)',
                  marginLeft: -12,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 'var(--type-size-xxs, 10px)',
                  color: 'var(--text-content-secondary, #636B72)',
                  fontWeight: 'var(--type-weight-regular, 400)',
                  zIndex: shown.length + 1,
                }}
                >
                  +{extra}
                </span>
              )}
            </button>
          );
        })()}

        {/* minimize (keep the PiP feature) */}
        <button type='button' onClick={onMinimize} title='ย่อหน้าจอ (ใช้ระบบบันทึกการรักษาระหว่างสาย)' style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--dim-space-150, 6px)', height: 'var(--dim-size-700, 36px)', paddingLeft: 'var(--dim-space-300, 12px)', paddingRight: 'var(--dim-space-300, 12px)', borderRadius: 'var(--dim-radius-200, 8px)', border: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimaryButton-tertiary, #C5EDDA)', background: 'transparent', cursor: 'pointer', color: 'var(--text-brandPrimary-default, #007549)', fontFamily: 'var(--type-family-heading-graphic2, "Mitr", sans-serif)', fontSize: 'var(--type-size-sm, 14px)' }}>
          <Sym name='close_fullscreen' size={16} color='var(--icon-brandPrimary-default, #007549)' /> ย่อจอ
        </button>
        {/* fullscreen */}
        <button type='button' onClick={() => { try { document.documentElement.requestFullscreen?.(); } catch (e) { /* ignore */ } }} style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--dim-space-150, 6px)', height: 'var(--dim-size-700, 36px)', paddingLeft: 'var(--dim-space-300, 12px)', paddingRight: 'var(--dim-space-300, 12px)', borderRadius: 'var(--dim-radius-200, 8px)', border: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimaryButton-tertiary, #C5EDDA)', background: 'transparent', cursor: 'pointer', color: 'var(--text-brandPrimary-default, #007549)', fontFamily: 'var(--type-family-heading-graphic2, "Mitr", sans-serif)', fontSize: 'var(--type-size-sm, 14px)' }}>
          <Sym name='fullscreen' size={16} color='var(--icon-brandPrimary-default, #007549)' /> เต็มจอ
        </button>
      </header>

      {/* ── Patient info banner — TelemedPatientCard Hide/Show (Figma 25:3185) ── */}
      <div style={{ paddingLeft: 'var(--dim-space-600, 24px)', paddingRight: 'var(--dim-space-600, 24px)', paddingTop: 'var(--dim-space-400, 16px)', flexShrink: 0 }}>
        {/* การ์ดผู้รับบริการถูกถอดออกจากห้องปรึกษา — ตัวตนอยู่บนกรอบวิดีโอและ
            บนหัวห้องแล้ว การ์ดเต็มความกว้างกินพื้นที่ที่ควรเป็นของภาพสนทนา */}
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
          {/* ผู้รับบริการวางสายเอง ≠ สัญญาณหลุด — ห้ามชวนแพทย์ "เชื่อมต่อใหม่"
             กับสายที่อีกฝ่ายตั้งใจจบไปแล้ว */}
          {patientLeft && network !== 'lost' && (
            <Banner tone='info' icon='call_end' title='ผู้รับบริการวางสายแล้ว'
              text='ผู้รับบริการจบการปรึกษาจากฝั่งของตนเอง — สรุปการให้บริการแล้วกดออกจากสายเพื่อปิดรายการ' />
          )}
          {!patientPresent && !patientLeft && !joinRequestOpen && noShowStep == null && (
            <Banner tone='warn' icon='hourglass_top' title='รอผู้รับบริการเข้าห้อง'
              text={noShowAt != null
                ? `เมื่อผู้รับบริการขอเข้า จะมีหน้าต่างยืนยันให้รับเข้าห้องตรวจ · ถ้ายังไม่เข้าภายใน ${fmtElapsed(Math.ceil(noShowLeftMs / 1000))} ระบบจะถามว่าจะรอต่อหรือปิดห้อง`
                : 'เมื่อผู้รับบริการขอเข้า จะมีหน้าต่างยืนยันให้รับเข้าห้องตรวจ'}
              action={noShowAt != null
                ? <button type='button' onClick={() => { clearNoShowTimer(); setNoShowStep(1); }} style={bannerBtnStyle}>จัดการตอนนี้</button>
                : undefined} />
          )}
          {/* ── สถานะการจับคู่กับแอปผู้รับบริการ (TOR §1.13.7) ── */}
          {peerState.duplicate ? (
            <Banner tone='warn' icon='devices' title='มีการเชื่อมต่ออยู่แล้ว'
              text='พบแท็บห้องตรวจของแพทย์เปิดอยู่มากกว่าหนึ่งแท็บ — ปิดแท็บที่ไม่ใช้เพื่อไม่ให้คำสั่งซ้ำซ้อน' />
          ) : peerState.hasPeer ? (
            <Banner tone='info' icon='smartphone' title='จับคู่กับแอปผู้รับบริการแล้ว'
              text={`${transportLabel(peerState.transport)} — คำขอเข้าห้อง · การรับเข้า · การออกจากสาย และภาพ/เสียงในสาย เดินจริงระหว่างสองเครื่อง`} />
          ) : null}
          {camError && (
            <Banner tone='danger' icon='videocam_off' title='ไม่พบกล้อง/ถูกปฏิเสธสิทธิ์'
              text='ตรวจสอบการอนุญาตใช้กล้องในเบราว์เซอร์ แล้วลองเปิดใหม่'
              action={<button type='button' onClick={() => { setCamError(false); setCamOn(true); }} style={bannerBtnStyle}>ลองอีกครั้ง</button>} />
          )}

          {/* main stage — screen share takes over when active; else VideoStage layout
              Figma Telemed Layout 154:30183 · Auto 2×2 · Grid equal · SpeakerFocus + PIP · Sidebar rail
              https://www.figma.com/design/JeQMryWzufiwlrXQuiFfTM/PHCIS-%7C-Telemedicine?node-id=154-30183 */}
          <div
            ref={videoStageRef}
            style={{
            flex: 1, minHeight: 0, position: 'relative',
            background: 'var(--color-slate-900, #0F172A)',
            borderRadius: 'var(--dim-radius-500, 16px)',
            overflow: 'hidden',
          }}
          >
            {sharedDoc ? (
              <div style={{ width: '100%', height: '100%', borderRadius: 'var(--dim-radius-500, 16px)', overflow: 'auto', background: 'linear-gradient(135deg,#232B36 0%,#131922 100%)', padding: 'var(--dim-space-500, 20px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
                <DocumentPage patient={activePatient} doc={sharedDoc} />
              </div>
            ) : sharing && screenStream ? (
              <VideoTile big stream={screenStream} mirror={false} fit='contain' name='หน้าจอที่คุณแชร์' sub='กำลังแชร์' camOn micOn accent='#7A4CE5' />
            ) : (() => {
              const extras = participants.filter((pt) => pt.id !== pinnedId);
              const focusTile = pinned ? (
                <VideoTile big name={pinned.name} sub='ปักหมุดไว้' camOn micOn accent={pinned.accent} />
              ) : (
                <VideoTile big name={activePatient.fullName} sub='ผู้รับบริการ' camOn={showPatientVideo} micOn={patientMicOn} accent='#0EA5E9' speaking={patientPresent} avatar={activePatient.avatarUrl} stream={showPatientVideo ? remoteStream : undefined} mirror={false} />
              );
              const selfTile = (
                <VideoTile
                  name={DOCTOR.name}
                  sub='คุณ'
                  camOn={showDoctorVideo}
                  micOn={micOn}
                  accent='#10B981'
                  stream={showDoctorVideo ? stream : undefined}
                  blurBackground={bg === 'blur'}
                  virtualBackgroundSrc={bg === 'blur' ? null : virtualBackgroundSrc}
                  avatar={DOCTOR.avatar}
                />
              );
              const patientTile = (
                <VideoTile name={activePatient.fullName} sub='ผู้รับบริการ' camOn={showPatientVideo} micOn={patientMicOn} accent='#0EA5E9' speaking={patientPresent} avatar={activePatient.avatarUrl} stream={showPatientVideo ? remoteStream : undefined} mirror={false} />
              );
              const stagePad = {
                width: '100%',
                height: '100%',
                boxSizing: 'border-box',
                padding: 'var(--dim-space-600, 24px)',
                gap: 'var(--dim-space-200, 8px)',
                minHeight: 0,
              };
              const cellWrap = {
                minWidth: 0,
                minHeight: 0,
                borderRadius: 'var(--dim-radius-500, 16px)',
                overflow: 'hidden',
                position: 'relative',
              };
              const allGridTiles = [
                { key: 'patient', node: patientTile },
                { key: 'self', node: selfTile },
                ...extras.map((pt) => ({
                  key: pt.id,
                  node: <VideoTile name={pt.name} camOn micOn accent={pt.accent} />,
                })),
              ];

              /* ── Grid (Figma VideoStage · Grid) — equal tiles, 2–3 columns ── */
              if (videoLayout === 'grid') {
                const cols = allGridTiles.length <= 4 ? 2 : 3;
                const rows = Math.max(2, Math.ceil(allGridTiles.length / cols));
                return (
                  <div
                    style={{
                      ...stagePad,
                      display: 'grid',
                      gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                      gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
                    }}
                    data-telemed-layout='grid'
                  >
                    {allGridTiles.map((t) => (
                      <div key={t.key} style={cellWrap}>{t.node}</div>
                    ))}
                  </div>
                );
              }

              /* ── Sidebar (Figma VideoStage · Sidebar) — hero + ~372px rail ── */
              if (videoLayout === 'sidebar') {
                const railTiles = [
                  { key: 'self', node: selfTile },
                  ...extras.map((pt) => ({
                    key: pt.id,
                    node: (
                      <>
                        <VideoTile name={pt.name} camOn micOn accent={pt.accent} />
                        <div style={{ position: 'absolute', top: 4, right: 4, display: 'flex', gap: 4 }}>
                          <button type='button' onClick={() => togglePin(pt.id)} aria-label={`ปักหมุด ${pt.name}`} title='ปักหมุด' style={{ width: 22, height: 22, borderRadius: 'var(--dim-radius-full, 9999px)', border: 'none', background: 'var(--background-overlay-default, #64748B80)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Sym name='push_pin' size={14} color='var(--text-content-on-content, #FFFFFF)' />
                          </button>
                        </div>
                      </>
                    ),
                  })),
                ];
                return (
                  <div
                    style={{ ...stagePad, display: 'flex', alignItems: 'stretch' }}
                    data-telemed-layout='sidebar'
                  >
                    <div style={{ ...cellWrap, flex: '1 1 0' }}>{focusTile}</div>
                    <div style={{
                      width: 'min(372px, 32%)',
                      flexShrink: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 'var(--dim-space-200, 8px)',
                      minHeight: 0,
                    }}
                    >
                      {railTiles.map((t) => (
                        <div key={t.key} style={{ ...cellWrap, flex: '1 1 0' }}>{t.node}</div>
                      ))}
                    </div>
                  </div>
                );
              }

              /* ── Speaker focus (Figma VideoStage · SpeakerFocus) — full stage + self PIP ── */
              if (videoLayout === 'speaker') {
                return (
                  <div
                    style={{ width: '100%', height: '100%', position: 'relative', minHeight: 0 }}
                    data-telemed-layout='speaker'
                  >
                    <div style={{ width: '100%', height: '100%', borderRadius: 'var(--dim-radius-500, 16px)', overflow: 'hidden' }}>
                      {focusTile}
                    </div>
                    <DraggablePip
                      mode='absolute'
                      boundaryRef={videoStageRef}
                      width={220}
                      height={132}
                      defaultEdge={{ right: 'var(--dim-space-400, 16px)', bottom: 'var(--dim-space-400, 16px)' }}
                      zIndex={2}
                      aria-label='PiP ของคุณ'
                      style={{
                        borderRadius: 'var(--dim-radius-500, 16px)',
                        overflow: 'hidden',
                        border: 'var(--dim-stroke-100, 1px) solid var(--border-image-default, #FFFFFF)',
                        boxShadow: 'var(--shadow-card, 0 8px 24px rgba(0,0,0,.28))',
                      }}
                    >
                      {selfTile}
                    </DraggablePip>
                  </div>
                );
              }

              /* ── Auto (Figma VideoStage · Auto) — equal 2×2 grid ── */
              const autoTiles = allGridTiles.slice(0, 4);
              while (autoTiles.length < 4) {
                const i = autoTiles.length;
                autoTiles.push({
                  key: `placeholder-${i}`,
                  node: <VideoTile name='รอผู้เข้าร่วม' camOn={false} micOn={false} accent='#64748B' />,
                });
              }
              return (
                <div
                  style={{
                    ...stagePad,
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                    gridTemplateRows: 'repeat(2, minmax(0, 1fr))',
                  }}
                  data-telemed-layout='auto'
                >
                  {autoTiles.map((t) => (
                    <div key={t.key} style={cellWrap}>{t.node}</div>
                  ))}
                </div>
              );
            })()}

            {/* unpin affordance — speaker / sidebar focus modes */}
            {pinned && !(sharing && screenStream) && !sharedDoc && (videoLayout === 'speaker' || videoLayout === 'sidebar') && (
              <button type='button' onClick={() => setPinnedId(null)} style={{ position: 'absolute', left: 'var(--dim-space-400, 16px)', bottom: 'var(--dim-space-400, 16px)', display: 'inline-flex', alignItems: 'center', gap: 'var(--dim-space-150, 6px)', padding: 'var(--dim-space-150, 6px) var(--dim-space-300, 12px)', borderRadius: 'var(--dim-radius-full, 9999px)', border: 'none', cursor: 'pointer', background: 'var(--background-overlay-default, #64748B80)', color: 'var(--text-content-on-content, #FFFFFF)', fontFamily: 'inherit', fontSize: 'var(--type-size-xs, 12px)', fontWeight: 'var(--type-weight-medium, 500)', zIndex: 3 }}>
                <Sym name='keep_off' size={16} color='var(--text-content-on-content, #FFFFFF)' /> เลิกปักหมุด
              </button>
            )}

            {/* patient PIP when main stage is share/doc — draggable (Figma 58:13727) */}
            {((sharing && screenStream) || sharedDoc) && (
              <DraggablePip
                mode='absolute'
                boundaryRef={videoStageRef}
                width={200}
                height={120}
                defaultEdge={{ left: 'var(--dim-space-400, 16px)', top: 'var(--dim-space-400, 16px)' }}
                zIndex={2}
                aria-label='PiP ผู้รับบริการ'
                style={{
                  borderRadius: 'var(--dim-radius-500, 16px)',
                  overflow: 'hidden',
                  boxShadow: 'var(--shadow-card, 0 8px 24px rgba(0,0,0,.28))',
                }}
              >
                <VideoTile name={activePatient.fullName} sub='ผู้รับบริการ' camOn={showPatientVideo} micOn={patientMicOn} accent='#0EA5E9' avatar={activePatient.avatarUrl} stream={showPatientVideo ? remoteStream : undefined} mirror={false} />
              </DraggablePip>
            )}

            {/* screen share indicator */}
            {sharing && !sharedDoc && (
              <div style={{ position: 'absolute', left: 'var(--dim-space-400, 16px)', bottom: 'var(--dim-space-400, 16px)', zIndex: 3 }}>
                <Pill tone='brand' icon='screen_share'>กำลังแชร์หน้าจอ</Pill>
              </div>
            )}

            {/* shared document indicator + stop */}
            {sharedDoc && (
              <div style={{ position: 'absolute', left: 'var(--dim-space-400, 16px)', bottom: 'var(--dim-space-400, 16px)', display: 'flex', gap: 'var(--dim-space-200, 8px)', alignItems: 'center', zIndex: 3 }}>
                <Pill tone='brand' icon='description'>กำลังแชร์: {sharedDoc.name}</Pill>
                <button type='button' onClick={stopShareDoc} style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--dim-space-100, 4px)', padding: 'var(--dim-space-150, 6px) var(--dim-space-300, 12px)', borderRadius: 'var(--dim-radius-full, 9999px)', border: 'none', cursor: 'pointer', background: 'var(--background-overlay-default, #64748B80)', color: 'var(--text-content-on-content, #FFFFFF)', fontFamily: 'inherit', fontSize: 'var(--type-size-xs, 12px)', fontWeight: 'var(--type-weight-medium, 500)' }}>
                  <Sym name='stop_screen_share' size={16} color='var(--text-content-on-content, #FFFFFF)' /> หยุดแชร์
                </button>
              </div>
            )}
          </div>
        </div>

        {/* right panel — โผล่เมื่อผู้ใช้เลือกแท็บเท่านั้น */}
        {rightTab && (
        <aside style={{
          width: 360, flexShrink: 0, background: 'var(--surface-card-100, #FFFFFF)',
          borderLeft: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary, #F4F5F5)',
          display: 'flex', flexDirection: 'column', minHeight: 0,
        }}
        >
          {/* แถบแท็บถูกถอดออก — เข้าถึงแต่ละแผงจากปุ่มบนแถบควบคุมสายด้านล่าง
              ปุ่มเดียวกันกดซ้ำเพื่อปิดแผง ไม่ต้องมีตัวนำทางสองชุดซ้อนกัน */}
          <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
            {rightTab === 'health' && (
              <div style={{ padding: 'var(--dim-space-400, 16px)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--dim-space-150, 6px)', marginBottom: 'var(--dim-space-300, 12px)' }}>
                  <Sym name='lock' size={14} color='var(--text-content-tertiary, #858C92)' />
                  <span style={{ fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary, #858C92)' }}>ดูอย่างเดียว · แก้ไขได้ตามสิทธิ์ในระบบบันทึกการรักษา</span>
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
                <div style={{ ...boxStyle, marginTop: 'var(--dim-space-300, 12px)' }}>
                  <SectionTitle icon='location_on'>ตำแหน่งการประเมิน (GIS)</SectionTitle>
                  <p style={{
                    margin: '0 0 var(--dim-space-200, 8px)',
                    fontSize: 'var(--type-size-xs, 12px)',
                    color: 'var(--text-content-tertiary, #858C92)',
                    fontFamily: 'var(--type-family-body, "Sarabun", sans-serif)',
                    lineHeight: 1.5,
                  }}
                  >
                    {ASSESSMENT_GIS.label}
                  </p>
                  <AddressMapBlock
                    value={ASSESSMENT_GIS}
                    readOnly
                    compact
                    heading='ตำแหน่งการประเมินผู้รับบริการ'
                    hint='พิกัดจาก GIS ณ เวลาประเมิน (ดูอย่างเดียว)'
                  />
                </div>
              </div>
            )}

            {/* ── TOR §1.13.1/.2/.6 — EMR จาก PHCIS + แผงประเมินในสาย ── */}
            {rightTab === 'emr' && (activeVisit ? (
              <TelemedEmrPanel
                hn={activeVisit.hn}
                patientName={activeVisit.name}
                visitId={activeVisit.id}
                role={telemedRole}
                gis={ASSESSMENT_GIS}
                onOpenTreatmentRecord={() => history.push(phcisRecordLink(activeVisit))}
                onSaveAssessment={(payload) => {
                  const base = getAssessmentByVisit(activeVisit.id) || makeBlankAssessment(activeVisit);
                  saveAssessment({
                    ...base,
                    vitals: {
                      ...base.vitals,
                      bpSys: payload.bpSys,
                      bpDia: payload.bpDia,
                      pulse: payload.pulse,
                      o2sat: payload.o2sat,
                      temp: payload.temp,
                      dtx: payload.dtx,
                    },
                    assessment: {
                      ...base.assessment,
                      symptoms: payload.symptoms,
                      diagnosis: payload.diagnosis,
                      severity: payload.severity,
                    },
                    plan: { ...base.plan, treatmentPlan: payload.plan },
                  }, telemedActor(telemedRole), { final: false });
                  appendAuditEvent({ user: DOCTOR.name, action: `บันทึกการประเมินระหว่างสาย · ${activeVisit.name}` });
                }}
              />
            ) : (
              <div style={{ paddingTop: 'var(--dim-space-400, 16px)', paddingBottom: 'var(--dim-space-400, 16px)', paddingLeft: 'var(--dim-space-400, 16px)', paddingRight: 'var(--dim-space-400, 16px)' }}>
                <NoVisitNotice text={noVisitNotice} />
              </div>
            ))}

            {/* ── TOR §4.3.3 — คำสั่งการรักษาระหว่างสาย + หลักฐานการให้บริการ ── */}
            {rightTab === 'orders' && (
              <div style={{ paddingTop: 'var(--dim-space-400, 16px)', paddingBottom: 'var(--dim-space-400, 16px)', paddingLeft: 'var(--dim-space-400, 16px)', paddingRight: 'var(--dim-space-400, 16px)', display: 'flex', flexDirection: 'column', gap: 'var(--dim-space-400, 16px)' }}>
                {!activeVisit && <NoVisitNotice text={noVisitNotice} />}
                {activeVisit && (
                <TelemedOrderStrip
                  compact
                  orders={activeVisit.orders || []}
                  role={telemedRole}
                  onAddOrder={(order) => {
                    addTelemedOrder(activeVisit.id, { ...order, by: telemedActor(telemedRole) }, telemedActor(telemedRole));
                    appendAuditEvent({ user: DOCTOR.name, action: `สั่งการรักษาระหว่างสาย · ${order.label}` });
                  }}
                  onCancelOrder={(orderId, reason) => {
                    cancelTelemedOrder(activeVisit.id, orderId, reason, telemedActor(telemedRole));
                    appendAuditEvent({ user: DOCTOR.name, action: `ยกเลิกคำสั่งการรักษา · ${reason}`, ok: false });
                  }}
                  onEditOrder={(orderId, patch) => {
                    updateTelemedOrder(activeVisit.id, orderId, patch, telemedActor(telemedRole));
                    appendAuditEvent({ user: DOCTOR.name, action: `แก้ไขคำสั่งการรักษา · ${patch.detail}` });
                  }}
                />
                )}

                {activeVisit && (
                <div style={boxStyle}>
                  <SectionTitle icon='photo_camera'>หลักฐานการให้บริการ</SectionTitle>
                  <p style={{ marginTop: 0, marginRight: 0, marginBottom: 'var(--dim-space-200, 8px)', marginLeft: 0, fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary, #858C92)', lineHeight: 1.5 }}>
                    ต้องมีภาพหลักฐานและเวลาเริ่ม-สิ้นสุดการให้บริการจึงจะเบิกจ่ายได้ (คู่มือ 5.3.5)
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--dim-space-200, 8px)' }}>
                    <button type='button' onClick={uploadEvidence} style={chipBtnStyle}>
                      <Sym name='photo_camera' size={16} /> อัพโหลดภาพหน้าจอ
                    </button>
                    <button type='button' onClick={stampServiceStart} style={chipBtnStyle}>
                      <Sym name='play_arrow' size={16} /> บันทึกเวลาเริ่ม
                    </button>
                    <button type='button' onClick={stampServiceEnd} style={chipBtnStyle}>
                      <Sym name='stop' size={16} /> บันทึกเวลาสิ้นสุด
                    </button>
                  </div>
                  <div style={{ marginTop: 'var(--dim-space-300, 12px)', display: 'flex', flexDirection: 'column', gap: 'var(--dim-space-100, 4px)' }}>
                    <DataRow label='เวลาเริ่มให้บริการ' value={activeVisit?.startedAt ? formatVisitClock(activeVisit.startedAt) : 'ยังไม่บันทึก'} />
                    <DataRow label='เวลาสิ้นสุด' value={activeVisit?.endedAt ? formatVisitClock(activeVisit.endedAt) : 'ยังไม่บันทึก'} />
                    <DataRow
                      label='ไฟล์หลักฐาน'
                      value={`${activeVisit.evidence?.length || 0} ไฟล์`}
                      tone={activeVisit.evidence?.length ? undefined : 'warn'}
                    />
                  </div>
                </div>
                )}

                {activeVisit && (
                <div style={boxStyle}>
                  <SectionTitle icon='verified_user'>สถานะความยินยอมของสายนี้</SectionTitle>
                  <DataRow
                    label='บันทึกสาย'
                    value={recordability.allowed ? 'บันทึกได้' : 'บันทึกไม่ได้'}
                    tone={recordability.allowed ? undefined : 'danger'}
                  />
                  {!recordability.allowed && (
                    <p style={{ marginTop: 'var(--dim-space-150, 6px)', marginRight: 0, marginBottom: 0, marginLeft: 0, fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-alert-error, #B91C1C)', lineHeight: 1.5 }}>
                      {recordability.reason} — จัดการได้ที่ทะเบียนความยินยอม (/telemed/consent)
                    </p>
                  )}
                </div>
                )}
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
                      {m.image ? (
                        <img
                          src={m.image}
                          alt={m.me ? 'รูปภาพที่คุณส่งในห้องสนทนา' : 'รูปภาพที่ผู้รับบริการส่งในห้องสนทนา'}
                          style={{
                            maxWidth: 200,
                            borderRadius: m.me
                              ? 'var(--dim-radius-600, 24px) 0 var(--dim-radius-600, 24px) var(--dim-radius-600, 24px)'
                              : '0 var(--dim-radius-600, 24px) var(--dim-radius-600, 24px) var(--dim-radius-600, 24px)',
                            alignSelf: m.me ? 'flex-end' : 'flex-start',
                          }}
                        />
                      ) : m.file ? (
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 'var(--dim-space-200, 8px)',
                          padding: 'var(--dim-space-300, 12px)', maxWidth: 220,
                          alignSelf: m.me ? 'flex-end' : 'flex-start',
                          background: m.me
                            ? 'var(--surface-brandprimary-secondary, #08A768)'
                            : 'var(--surface-card-indigo-100, #F3F5FC)',
                          borderRadius: m.me
                            ? 'var(--dim-radius-600, 24px) 0 var(--dim-radius-600, 24px) var(--dim-radius-600, 24px)'
                            : '0 var(--dim-radius-600, 24px) var(--dim-radius-600, 24px) var(--dim-radius-600, 24px)',
                        }}
                        >
                          <Sym name='description' size={20} fill={1} color={m.me ? '#FFFFFF' : 'var(--icon-brandPrimary-default, #007549)'} />
                          <span style={{
                            minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            fontFamily: 'var(--type-family-body, "Sarabun", sans-serif)',
                            fontSize: 'var(--type-size-sm, 14px)',
                            color: m.me ? 'var(--text-brandPrimary-on-brand, #FFFFFF)' : 'var(--text-content-default, #363B3F)',
                          }}
                          >{m.file.name}</span>
                        </div>
                      ) : (
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
                      )}
                      <div style={{
                        fontSize: 'var(--type-size-xxs, 10px)', lineHeight: 1.5,
                        color: 'var(--text-content-quaternary, #ADB2B7)',
                        textAlign: m.me ? 'right' : 'left',
                      }}
                      >{m.t}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--dim-space-200, 8px)', padding: 'var(--dim-space-300, 12px)', background: 'var(--surface-card-100, #FFFFFF)', borderTop: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary, #E2F3EB)' }}>
                  <BrandCircleSubdueIconButton variant='fill' size='md' icon='image' aria-label='แนบรูปภาพ' onClick={() => chatImageInputRef.current?.click()} />
                  <input ref={chatImageInputRef} type='file' accept='image/*' onChange={onAttachChatImage} style={{ display: 'none' }} />
                  <BrandCircleSubdueIconButton variant='fill' size='md' icon='attach_file' aria-label='แนบไฟล์' onClick={() => chatFileInputRef.current?.click()} />
                  <input ref={chatFileInputRef} type='file' onChange={onAttachChatFile} style={{ display: 'none' }} />
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') sendChat(); }}
                    placeholder='พิมพ์ข้อความ…'
                    style={{
                      flex: 1, borderRadius: 'var(--dim-radius-full, 9999px)',
                      border: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-tertiary, #E2E4E6)',
                      padding: 'var(--dim-space-200, 8px) var(--dim-space-400, 16px)', fontFamily: 'inherit',
                      fontSize: 'var(--type-size-sm, 14px)', outline: 'none',
                    }}
                  />
                  <BrandCircleIconButton variant='fill' size='md' icon='send' aria-label='ส่ง' onClick={sendChat} />
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
                        <div style={{ fontWeight: 'var(--type-weight-medium, 500)', fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-default, #363B3F)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.name}</div>
                        <div style={{ fontSize: 'var(--type-size-xxs, 10px)', color: 'var(--text-content-tertiary, #858C92)' }}>{d.size} · แตะเพื่อดู</div>
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
        )}
      </div>

      {/* ── Bottom control bar ── */}
      <footer style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--dim-space-400, 16px)',
        paddingTop: 'var(--dim-space-400, 16px)', paddingBottom: 'var(--dim-space-400, 16px)',
        paddingLeft: 'var(--dim-space-600, 24px)', paddingRight: 'var(--dim-space-600, 24px)',
        background: 'var(--surface-card-100, #FFFFFF)',
        borderTop: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary, #F4F5F5)', flexShrink: 0,
      }}
      >
        <ControlBtn icon={micOn ? 'mic' : 'mic_off'} label={micOn ? 'ปิดไมค์' : 'เปิดไมค์'} mutedDanger={!micOn} onClick={() => setMicOn((v) => !v)} />
        <ControlBtn icon={camOn && !camError ? 'videocam' : 'videocam_off'} label={camOn && !camError ? 'ปิดกล้อง' : 'เปิดกล้อง'} mutedDanger={!(camOn && !camError)} onClick={() => { if (camError) { setCamError(false); setCamOn(true); } else setCamOn((v) => !v); }} />
        <ControlBtn icon='screen_share' label={sharing ? 'หยุดแชร์' : 'แชร์หน้าจอ'} highlight={sharing} onClick={toggleShare} />
        {/* แถบนี้เป็นเครื่องมือของแพทย์ที่ล็อกอินอยู่ — การสั่งเปิด/ปิดกล้องของ
            ผู้รับบริการจึงไม่ควรอยู่ปนกับปุ่มของตัวเอง (กดพลาดคือไปปิดกล้องคนไข้)
            ยังทำได้จากรายชื่อผู้เข้าร่วม ซึ่งเป็นบริบทของคนอื่นในสายชัดเจนกว่า */}
        <ControlBtn icon='chat' label='แชท' highlight={rightTab === 'chat'} badge={chatBadge} onClick={() => toggleRightTab('chat')} />
        <ControlBtn icon='dashboard' label='เลย์เอาต์' highlight={layoutOpen || videoLayout !== 'auto'} onClick={() => setLayoutOpen(true)} />
        <ControlBtn icon={speakerOn ? 'volume_up' : 'volume_off'} label={speakerOn ? 'ปิดลำโพง' : 'เปิดลำโพง'} mutedDanger={!speakerOn} onClick={() => setSpeakerOn((v) => !v)} />
        {/* TOR §1.13.8/.9 — ไม่มีความยินยอมในทะเบียน = ปุ่มถูกปิดตั้งแต่ต้น */}
        <ControlBtn
          icon='radio_button_checked'
          label={recording ? 'หยุดบันทึก' : 'บันทึกสาย'}
          highlight={recording}
          disabled={!recording && !recordability.allowed}
          title={recordability.allowed ? undefined : recordability.reason}
          onClick={toggleRecord}
        />
        {/* EMR / ประเมิน และ คำสั่ง ถูกถอดออกจากแถบควบคุมสาย — เข้าถึงได้จากระบบ
            บันทึกการรักษาที่เปิดค้างอยู่ข้างหลัง ไม่ต้องซ้อนเครื่องมือสองชุด */}
        <ControlBtn icon='call_end' label='วางสาย' danger onClick={requestLeave} />
      </footer>

      {/* ป๊อปอัป "ขอเข้าห้องตรวจรักษา" ถูกถอดออก — คำขอจากผู้รับบริการที่ล็อกอินแล้ว
         ถูกรับเข้าห้องอัตโนมัติ (ดู admitJoinRequest ใน onMessage) */}

      {/* ── No-show ครั้งที่ 1 (Figma 87:13486) ── */}
      <AlertDialog
        open={noShowStep === 1}
        type='destructive'
        title='ผู้รับบริการยังไม่เข้าห้อง'
        description='เลยเวลานัด 5 นาที ผู้รับบริการยังไม่เข้าห้องปรึกษา'
        cancelLabel='รอต่อ'
        confirmLabel='ทำเครื่องหมายขาดนัด'
        onCancel={waitNoShowFurther}
        onConfirm={markNoShow}
        onClose={waitNoShowFurther}
      />

      {/* ── No-show ครั้งที่ 2 (Figma 204:20320) ── */}
      <AlertDialog
        open={noShowStep === 2}
        type='destructive'
        title='ผู้รับบริการยังไม่เข้าห้อง'
        description='เลยเวลานัด 10 นาที ผู้รับบริการยังไม่เข้าห้องปรึกษา'
        cancelLabel='รอต่อ'
        confirmLabel='ทำเครื่องหมายขาดนัด'
        onCancel={waitNoShowFurther}
        onConfirm={markNoShow}
        onClose={waitNoShowFurther}
      />

      {/* ── Timeslot expired (Figma 204:20664) ── */}
      <AlertDialog
        open={noShowStep === 'timeslot'}
        type='destructive'
        title='หมดเวลานัดหมาย'
        description='สิ้นสุดช่วงเวลานัดหมายแล้ว ระบบจะปิดห้องปรึกษาโดยอัตโนมัติ'
        showCancel={false}
        confirmLabel='ปิดห้องเดี๋ยวนี้'
        onConfirm={closeTimeslotNow}
        onClose={closeTimeslotNow}
      >
        <ColorfulBadge style='red' hierarchy='secondary' size='default' width='hug'>
          {`ปิดห้องอัตโนมัติใน ${String(Math.floor(timeslotCountdown / 60)).padStart(2, '0')}:${String(timeslotCountdown % 60).padStart(2, '0')}`}
        </ColorfulBadge>
      </AlertDialog>

      {/* ── PDPA recording confirm (Figma 123:56678) ── */}
      <TelemedRecordingConfirmPopup
        open={consentModal}
        onClose={denyConsent}
        onConfirm={grantConsent}
      />

      {/* ── Leave / end meeting (Figma 70:4532) — admin วางสาย ── */}
      <TelemedLeaveCallPopup
        open={leaveOpen}
        onClose={() => setLeaveOpen(false)}
        canEndMeeting
        onConfirm={(choice) => endCall(choice)}
      />

      {/* ── Layout picker (Figma 70:3729) — Call Controls layout button ── */}
      <TelemedLayoutPopup
        open={layoutOpen}
        onClose={() => setLayoutOpen(false)}
        currentLayout={videoLayout}
        onConfirm={(layout) => {
          setVideoLayout(layout);
          setLayoutOpen(false);
        }}
      />

      {/* ── Participants (Figma 114:56061) — opened from avatar stack 58:8962 ── */}
      <TelemedParticipantsPopup
        open={peopleOpen}
        onClose={() => setPeopleOpen(false)}
        initialView={peopleView}
        doctor={DOCTOR}
        patient={{ ...PATIENT, avatar: activePatient.avatarUrl }}
        doctorMicOn={micOn}
        doctorCamOn={camOn && !camError}
        patientMicOn={patientMicOn}
        patientCamOn={patientCamOn}
        participants={participants}
        onToggleSelfMic={() => setMicOn((v) => !v)}
        onToggleSelfCam={() => { if (camError) { setCamError(false); setCamOn(true); } else setCamOn((v) => !v); }}
        onTogglePatientMic={() => setPatientMicOn((v) => !v)}
        onTogglePatientCam={() => setPatientCamOn((v) => !v)}
        onToggleParticipantMedia={toggleParticipantMedia}
        onInvite={inviteFromDirectory}
        onUninvite={uninviteFromDirectory}
        meetingLink={meetingLink}
        linkCopied={linkCopied}
        onCopyLink={copyLink}
      />

      {/* ── Shared-document preview (mock PDF / image per file name) ── */}
      {previewDoc && (
        <div style={overlayStyle} onClick={() => setPreviewDoc(null)}>
          <div style={{ background: 'var(--surface-card-100, #FFFFFF)', borderRadius: 'var(--dim-radius-500, 16px)', width: 560, maxWidth: '94vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: 'var(--shadow-card-strong)' }} onClick={(e) => e.stopPropagation()}>
            {/* toolbar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--dim-space-200, 8px)', padding: 'var(--dim-space-300, 12px) var(--dim-space-400, 16px)', borderBottom: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary, #F4F5F5)' }}>
              <Sym name={previewDoc.kind === 'image' ? 'image' : 'picture_as_pdf'} size={22} fill={1} color='var(--icon-negative-primary, #D04949)' />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 'var(--type-weight-bold, 700)', fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-default, #363B3F)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{previewDoc.name}</div>
                <div style={{ fontSize: 'var(--type-size-xxs, 10px)', color: 'var(--text-content-tertiary, #858C92)' }}>{previewDoc.size}</div>
              </div>
              <button type='button' onClick={() => shareDocument(previewDoc)} style={chipBtnStyle}><Sym name='present_to_all' size={16} /> แชร์ขึ้นจอ</button>
              <button type='button' onClick={() => setPreviewDoc(null)} aria-label='ปิด' style={iconBtnStyle}><Sym name='close' size={20} /></button>
            </div>
            {/* document page */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--dim-space-500, 20px)', background: 'var(--surface-neutral-tertiary, #F4F5F5)' }}>
              <DocumentPage patient={activePatient} doc={previewDoc} />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

/* ── Banner (error / warning) ── */
const Banner = ({ tone, icon, title, text, action }) => {
  const map = {
    danger: { bg: 'var(--surface-negative-secondary, #FBE8E8)', bd: 'var(--border-negative-primary, #E7A0A0)', fg: 'var(--text-negative-primary, #B91C1C)' },
    warn: { bg: 'var(--surface-warning-secondary, #FDF1E0)', bd: 'var(--border-warning-primary, #F0C589)', fg: 'var(--text-warning-primary, #A5641B)' },
    info: { bg: 'var(--surface-alert-info, #F0F6FF)', bd: 'var(--border-alert-info, #DBEAFE)', fg: 'var(--text-alert-info, #1D4ED8)' },
  };
  const c = map[tone] || map.warn;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 'var(--dim-space-300, 12px)',
      padding: 'var(--dim-space-300, 12px) var(--dim-space-400, 16px)', borderRadius: 'var(--dim-radius-400, 12px)',
      background: c.bg, border: `var(--dim-stroke-100, 1px) solid ${c.bd}`,
    }}
    >
      <Sym name={icon} size={22} fill={1} color={c.fg} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 'var(--type-weight-bold, 700)', fontSize: 'var(--type-size-sm, 14px)', color: c.fg }}>{title}</div>
        <div style={{ fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-secondary, #636B72)' }}>{text}</div>
      </div>
      {action}
    </div>
  );
};

/* ── shared inline style objects ── */
const cardStyle = {
  background: 'var(--surface-card-100, #FFFFFF)', borderRadius: 'var(--dim-radius-500, 16px)',
  border: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary, #F4F5F5)',
  boxShadow: 'var(--shadow-card)', padding: 'var(--dim-space-500, 20px)',
};
const boxStyle = {
  background: 'var(--surface-neutral-secondary, #FAFAFA)', borderRadius: 'var(--dim-radius-400, 12px)',
  border: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary, #F4F5F5)', padding: 'var(--dim-space-400, 16px)',
};
/* Telemed_Prepare card (Figma 37:5681 / 55:6694 / 55:7253) — white card with
   the brand drop-shadow, 16px radius, 16px padding. */
const prepareCardStyle = {
  display: 'flex', flexDirection: 'column',
  padding: 'var(--dim-space-400, 16px)', borderRadius: 'var(--dim-radius-500, 16px)',
  /* เงาเดิม (brand/100) จางจนการ์ดแทบไม่แยกจากพื้นหลัง — ใช้ระดับ 400 ของโทน
     brand เพื่อให้เข้มขึ้นแต่ยังเป็นเงาโทนเดียวกับระบบ ไม่ใช่เงาเทากลาง */
  background: 'var(--surface-card-100, #FFFFFF)', boxShadow: 'var(--shadow-brand-drop-bottom-400)',
};
const listItemStyle = {
  display: 'flex', alignItems: 'center', gap: 'var(--dim-space-300, 12px)',
  padding: 'var(--dim-space-300, 12px) 0', borderBottom: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary, #F1F3F5)',
};
const iconBtnStyle = {
  width: 'var(--dim-size-800, 40px)', height: 'var(--dim-size-800, 40px)', borderRadius: 'var(--dim-radius-full, 9999px)', border: 'none',
  background: 'var(--surface-neutral-secondary, #F1F3F5)', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--icon-neutral-default, #4D5358)', flexShrink: 0,
};
const primaryBtnStyle = {
  display: 'inline-flex', alignItems: 'center', gap: 'var(--dim-space-200, 8px)',
  padding: 'var(--dim-space-300, 12px) var(--dim-space-500, 20px)', borderRadius: 'var(--dim-radius-full, 9999px)',
  border: 'none', background: 'var(--surface-brandPrimaryButton-default, #007549)', color: ONBRAND, cursor: 'pointer',
  fontFamily: 'var(--type-family-body, sans-serif)', fontSize: 'var(--type-size-base, 16px)', fontWeight: 'var(--type-weight-medium, 500)',
};
const secondaryBtnStyle = {
  display: 'inline-flex', alignItems: 'center', gap: 'var(--dim-space-200, 8px)',
  padding: 'var(--dim-space-300, 12px) var(--dim-space-500, 20px)', borderRadius: 'var(--dim-radius-full, 9999px)',
  border: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-tertiary, #E2E4E6)',
  background: 'var(--surface-card-100, #FFFFFF)', color: 'var(--text-content-default, #363B3F)', cursor: 'pointer',
  fontFamily: 'var(--type-family-body, sans-serif)', fontSize: 'var(--type-size-base, 16px)', fontWeight: 'var(--type-weight-medium, 500)',
};
const chipBtnStyle = {
  display: 'inline-flex', alignItems: 'center', gap: 'var(--dim-space-100, 4px)', padding: 'var(--dim-space-150, 6px) var(--dim-space-300, 12px)', borderRadius: 'var(--dim-radius-full, 9999px)',
  border: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-default, #007549)', background: 'var(--surface-brandPrimary-quaternary, #F4FBF8)',
  color: 'var(--text-brandPrimary-default, #007549)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'var(--type-size-xs, 12px)', fontWeight: 'var(--type-weight-medium, 500)', flexShrink: 0,
};
const bannerBtnStyle = {
  padding: 'var(--dim-space-150, 6px) var(--dim-space-400, 16px)', borderRadius: 'var(--dim-radius-full, 9999px)', border: 'none',
  background: 'var(--surface-negative-primary, #D04949)', color: ONBRAND, cursor: 'pointer',
  fontFamily: 'inherit', fontSize: 'var(--type-size-xs, 12px)', fontWeight: 'var(--type-weight-medium, 500)', flexShrink: 0,
};
const overlayStyle = {
  position: 'fixed', inset: 0, zIndex: TELEMED_Z_TOP, background: 'var(--background-overlay-default, #64748B80)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--dim-space-400, 16px)',
};
