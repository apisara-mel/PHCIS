/* Shared helpers for the §1.20 Dashboard / report-platform mock data.
   Deterministic pseudo-random so every reload renders the same numbers
   (screenshots + UAT stay stable) and every aggregate is reproducible. */

/** Mulberry32 — tiny deterministic PRNG (seeded, no Math.random). */
export const makeRng = (seed) => {
  let a = seed >>> 0;
  return () => {
    a += 0x6D2B79F5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export const pick = (rng, list) => list[Math.floor(rng() * list.length)];

export const between = (rng, min, max) => min + Math.floor(rng() * (max - min + 1));

export const THAI_MONTHS_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
];

export const THAI_MONTHS_FULL = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

/** ปีงบประมาณไทย: 1 ต.ค. (ปีก่อน) – 30 ก.ย. — เดือนที่ 1 ของปีงบคือ ต.ค. */
export const FISCAL_MONTH_ORDER = [9, 10, 11, 0, 1, 2, 3, 4, 5, 6, 7, 8];
export const FISCAL_MONTH_LABELS = FISCAL_MONTH_ORDER.map((m) => THAI_MONTHS_SHORT[m]);

export const toIsoDate = (d) => {
  const x = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(x.getTime())) return '';
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, '0');
  const day = String(x.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const formatIsoDateThai = (iso) => {
  if (!iso) return '—';
  const d = new Date(`${String(iso).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return String(iso);
  return `${d.getDate()} ${THAI_MONTHS_SHORT[d.getMonth()]} ${d.getFullYear() + 543}`;
};

export const formatIsoMonthThai = (iso) => {
  if (!iso) return '—';
  const [y, m] = String(iso).slice(0, 7).split('-');
  const idx = Number(m) - 1;
  if (Number.isNaN(idx) || !THAI_MONTHS_SHORT[idx]) return String(iso);
  return `${THAI_MONTHS_SHORT[idx]} ${Number(y) + 543}`;
};

/** Percent that never divides by zero (report legends show 0% not NaN%). */
export const safePct = (part, total, digits = 1) => {
  const t = Number(total) || 0;
  if (t <= 0) return 0;
  return Number(((Number(part) || 0) / t * 100).toFixed(digits));
};

/** ISO date `days` before/after today (negative = past). */
export const isoOffsetDays = (days = 0, base = new Date()) => {
  const d = new Date(base);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return toIsoDate(d);
};

/** ISO date at (monthsBack) months ago, keeping day-of-month within bounds. */
export const isoOffsetMonths = (monthsBack = 0, day = 1, base = new Date()) => {
  const d = new Date(base.getFullYear(), base.getMonth() - monthsBack, 1);
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, lastDay));
  return toIsoDate(d);
};

/** ศูนย์บริการสาธารณสุข กทม. ที่ใช้ร่วมกันทุกหน้ารายงาน §1.20 */
export const BMA_SERVICE_CENTERS = [
  { key: 'center-04', code: 'ศบส.4',  name: 'ศูนย์บริการสาธารณสุข 4 ดินแดง',        district: 'ดินแดง'      },
  { key: 'center-15', code: 'ศบส.15', name: 'ศูนย์บริการสาธารณสุข 15 ลาดพร้าว',     district: 'ลาดพร้าว'    },
  { key: 'center-21', code: 'ศบส.21', name: 'ศูนย์บริการสาธารณสุข 21 วัดธาตุทอง',   district: 'วัฒนา'       },
  { key: 'center-41', code: 'ศบส.41', name: 'ศูนย์บริการสาธารณสุข 41 คลองเตย',      district: 'คลองเตย'     },
  { key: 'center-56', code: 'ศบส.56', name: 'ศูนย์บริการสาธารณสุข 56 ทับเจริญ',      district: 'บึงกุ่ม'      },
  { key: 'center-67', code: 'ศบส.67', name: 'ศูนย์บริการสาธารณสุข 67 ทวีวัฒนา',      district: 'ทวีวัฒนา'    },
];

export const centerLabel = (key) =>
  BMA_SERVICE_CENTERS.find((c) => c.key === key)?.name || key || '—';

export const centerShortLabel = (key) =>
  BMA_SERVICE_CENTERS.find((c) => c.key === key)?.code || key || '—';

/** สิทธิการรักษา (§1.20.1.5 / §1.20.4.1) */
export const RIGHT_TYPES = [
  { key: 'uc',       label: 'สิทธิ สปสช. (บัตรทอง)'      },
  { key: 'bma',      label: 'สิทธิ กทม.'                  },
  { key: 'sso',      label: 'ประกันสังคม'                 },
  { key: 'ofc',      label: 'ข้าราชการ/รัฐวิสาหกิจ'        },
  { key: 'moph',     label: 'กระทรวงสาธารณสุข'            },
  { key: 'selfpay',  label: 'ชำระเงินเอง/อื่น ๆ'          },
];

export const rightLabel = (key) =>
  RIGHT_TYPES.find((r) => r.key === key)?.label || key || '—';

/** กลุ่มโรคตาม ICD-10 ที่ศูนย์บริการสาธารณสุขพบบ่อย (§1.20.5.4 / §1.20.5.5) */
export const ICD10_DISEASE_GROUPS = [
  { key: 'i10',  code: 'I10',     label: 'ความดันโลหิตสูง'                 },
  { key: 'e11',  code: 'E11',     label: 'เบาหวานชนิดที่ 2'                },
  { key: 'j00',  code: 'J00-J06', label: 'ติดเชื้อทางเดินหายใจส่วนบน'      },
  { key: 'e78',  code: 'E78',     label: 'ไขมันในเลือดผิดปกติ'             },
  { key: 'm54',  code: 'M54',     label: 'ปวดหลัง/ปวดกล้ามเนื้อ'           },
  { key: 'k29',  code: 'K29',     label: 'กระเพาะอาหารอักเสบ'              },
  { key: 'j45',  code: 'J45',     label: 'หืด/หลอดลมอักเสบ'                },
  { key: 'a09',  code: 'A09',     label: 'อุจจาระร่วงเฉียบพลัน'            },
  { key: 'n39',  code: 'N39',     label: 'ติดเชื้อทางเดินปัสสาวะ'          },
  { key: 'l30',  code: 'L30',     label: 'ผิวหนังอักเสบ'                   },
  { key: 'f32',  code: 'F32',     label: 'ภาวะซึมเศร้า'                    },
  { key: 'h25',  code: 'H25',     label: 'ต้อกระจก/สายตาผิดปกติ'           },
];

export const diseaseLabel = (key) =>
  ICD10_DISEASE_GROUPS.find((d) => d.key === key)?.label || key || '—';

export const diseaseCode = (key) =>
  ICD10_DISEASE_GROUPS.find((d) => d.key === key)?.code || '';

/** หน่วยบริการ/คลินิกภายในศูนย์ (§1.20.5.1 "ตามหน่วยบริการ") */
export const SERVICE_UNITS = [
  { key: 'opd',      label: 'คลินิกผู้ป่วยนอกทั่วไป' },
  { key: 'ncd',      label: 'คลินิกโรคเรื้อรัง (NCD)' },
  { key: 'anc',      label: 'คลินิกฝากครรภ์'          },
  { key: 'epi',      label: 'คลินิกเด็กดี/วัคซีน'      },
  { key: 'dental',   label: 'คลินิกทันตกรรม'          },
  { key: 'mental',   label: 'คลินิกสุขภาพจิต'          },
  { key: 'rehab',    label: 'คลินิกกายภาพบำบัด'        },
  { key: 'checkup',  label: 'คลินิกตรวจสุขภาพ'         },
];

export const serviceUnitLabel = (key) =>
  SERVICE_UNITS.find((u) => u.key === key)?.label || key || '—';

/** Mask a Thai full name to first name + initial (confidential clinics §1.4.2). */
export const maskThaiName = (fullName = '') => {
  const parts = String(fullName).trim().split(/\s+/);
  if (!parts.length) return '—';
  const first = parts[0];
  const rest = parts.slice(1).join(' ');
  if (!rest) return first;
  return `${first} ${rest.slice(0, 1)}.`;
};

export const maskHn = (hn = '') => {
  const s = String(hn);
  if (s.length <= 4) return s;
  return `${s.slice(0, 2)}${'x'.repeat(Math.max(0, s.length - 4))}${s.slice(-2)}`;
};
