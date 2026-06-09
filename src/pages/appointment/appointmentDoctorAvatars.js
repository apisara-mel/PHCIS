/* Doctor portrait paths — photorealistic AI-generated headshots (25 unique).
   Stored under `public/images/staff/doctors/doctor-portrait-NN.png`.
   Illustrated fallback: `python3 scripts/generate-doctor-portraits.py` */

export const DOCTOR_PORTRAIT_COUNT = 25;

export const doctorPortraitSrc = (index) =>
  `/images/staff/doctors/doctor-portrait-${String(index).padStart(2, '0')}.png`;

export const DOCTOR_PORTRAIT_POOL = Array.from(
  { length: DOCTOR_PORTRAIT_COUNT },
  (_, i) => doctorPortraitSrc(i + 1),
);
