/* PHCIS | Consent — ช่องทางลงนาม (ด.1.1.6).
   มี 2 ช่องทางเท่านั้น:
     1. Mobile App
     2. ที่ศูนย์บริการ [เลขศูนย์] [ชื่อศูนย์] — อิงศูนย์ที่เลือกใน Header. */

import { CLINIC_OPTIONS, DEFAULT_CLINIC_VALUE } from '@/components/layout/HeaderClinicContext';

export const MOBILE_APP_CHANNEL = 'Mobile App';

/** Diverse ศบส. for mock rows — ลงนามได้เฉพาะแอป หรือที่ศูนย์บริการเท่านั้น (ไม่มี "-"). */
export const SERVICE_CENTER_CHANNEL_POOL = [
  'ที่ศูนย์บริการ 4 ดินแดง',
  'ที่ศูนย์บริการ 3 บางซื่อ',
  'ที่ศูนย์บริการ 5 จุฬาลงกรณ์',
  'ที่ศูนย์บริการ 8 บุญรอด รุ่งเรือง',
  'ที่ศูนย์บริการ 21 วัดธาตุทอง',
  'ที่ศูนย์บริการ 36 บุคคโล',
  'ที่ศูนย์บริการ 41 คลองเตย',
  'ที่ศูนย์บริการ 7 บุญมี ปุรุราชรังสรรค์',
  'ที่ศูนย์บริการ 1 สะพานมอญ',
  'ที่ศูนย์บริการ 15 ลาดพร้าว',
  'ที่ศูนย์บริการ 10 สุขุมวิท',
  'ที่ศูนย์บริการ 60 รสสุคนธ์ มโนชญากร',
];

/** Pick Mobile App or a varied service-center channel (never "-"). */
export const consentSignChannelOfIndex = (i) => {
  if (i % 3 === 0) return MOBILE_APP_CHANNEL;
  return SERVICE_CENTER_CHANNEL_POOL[i % SERVICE_CENTER_CHANNEL_POOL.length];
};

/** "ศูนย์ 4 ดินแดง" → "ที่ศูนย์บริการ 4 ดินแดง" */
export const formatServiceCenterChannel = (clinicValue = DEFAULT_CLINIC_VALUE) => {
  const opt = CLINIC_OPTIONS.find((o) => o.value === clinicValue);
  if (!opt) return 'ที่ศูนย์บริการ';
  const tail = opt.label.replace(/^ศูนย์\s*/, '');
  return `ที่ศูนย์บริการ ${tail}`;
};

export const DEFAULT_SERVICE_CENTER_CHANNEL = formatServiceCenterChannel(DEFAULT_CLINIC_VALUE);

/** Radio tiles ใน popup สร้างคำขอ / Re-Consent */
export const getConsentChannelOptions = (clinicValue = DEFAULT_CLINIC_VALUE) => {
  const serviceCenter = formatServiceCenterChannel(clinicValue);
  return [
    {
      value: serviceCenter,
      label: serviceCenter,
      icon: 'local_hospital',
      hint: 'เจ้าหน้าที่บันทึกให้ที่เคาน์เตอร์ศูนย์บริการ',
    },
    {
      value: MOBILE_APP_CHANNEL,
      label: MOBILE_APP_CHANNEL,
      icon: 'smartphone',
      hint: 'ส่งคำขอไปที่แอปผู้รับบริการ',
    },
  ];
};

/** @deprecated use getConsentChannelOptions(clinicValue) — default clinic seed */
export const CONSENT_CHANNEL_OPTIONS = getConsentChannelOptions();
