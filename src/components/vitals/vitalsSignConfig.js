/* Shared vital-tile catalogue — VitalsSignHorizontalPanel responsive layouts
   (PHCIS | CPOE 250:25052 lg · 250:25053 <1024 · 250:25054 <768). */

/** lg — single row (catalogue order). */
export const VITAL_SIGN_TILES = [
  { key: 'temp',   th: 'อุณหภูมิ',          en: 'Temperature (Temp)',    unit: '°C'   },
  { key: 'pr',     th: 'ชีพจร (ครั้ง/นาที)',  en: 'Pulse Rate (PR)'                     },
  { key: 'bp',     th: 'ความดัน (mmHg)',     en: 'Blood Pressure (BP)'                  },
  { key: 'spo2',   th: 'ค่าออกซิเจน (%)',     en: 'Oxygen Saturation (SpO₂)'             },
  { key: 'rr',     th: 'การหายใจ (ครั้ง/นาที)', en: 'Respiratory Rate (RR)'              },
  { key: 'height', th: 'ส่วนสูง (ซม.)',       en: 'Height (Ht)'                          },
  { key: 'weight', th: 'น้ำหนัก',             en: 'Weight (Wt)',           unit: 'กก.'  },
  { key: 'bmi',    th: 'Body Mass Index',     en: '(BMI)'                               },
  { key: 'waist',  th: 'เส้นรอบเอว (ซม.)',    en: 'Waist Circumference (WC)'            },
];

/** Two-row tablet layout — row 1 count (CPOE 250:25053 · 251:25374). */
export const VITAL_SIGN_TABLET_ROW1_COUNT = 5;

export const VITAL_SIGN_TABLET_COLUMN_COUNT = 5;

/** <md — 3-column grid cell order (250:25054, row-major). */
export const VITAL_SIGN_MOBILE_GRID_KEYS = [
  'temp', 'bp', 'weight',
  'pr', 'spo2', 'bmi',
  'rr', 'height', 'waist',
];
