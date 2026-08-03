/* PHCIS | Consent — ช่องทางลงนาม (ด.1.1.6).
   มี 2 ช่องทางเท่านั้น:
     1. Mobile App
     2. ที่ศูนย์บริการ [เลขศูนย์] [ชื่อศูนย์] — อิงศูนย์ที่เลือกใน Header. */

import { CLINIC_OPTIONS, DEFAULT_CLINIC_VALUE } from '@/components/layout/HeaderClinicContext';

export const MOBILE_APP_CHANNEL = 'Mobile App';

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
