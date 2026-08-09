/* §1.20.8 — รายงานผลการตรวจสุขภาพ (สำนักอนามัย)
   8.3 ตามปัจจัยเสี่ยง · 8.4 ต่อเนื่อง ≥ 3 ปี · 8.5 ไทย/อังกฤษ
   checkupStore เก็บ catalog + ผลรายเคสของศูนย์เดียว ไม่มีชั้นสรุปหลายปี
   สำหรับรายงานหน่วยงาน จึงเพิ่มชั้นสรุปนี้ (playbook §4) */

import { makeRng, pick, between, BMA_SERVICE_CENTERS } from '@/data/dashboardCommon';

/** ปัจจัยเสี่ยงตามแบบรายงานตรวจสุขภาพของสำนักอนามัย (§1.20.8.3) */
export const RISK_FACTORS = [
  { key: 'bmi',      th: 'ภาวะน้ำหนักเกิน/อ้วน (BMI ≥ 25)', en: 'Overweight / Obesity (BMI ≥ 25)' },
  { key: 'bp',       th: 'ความดันโลหิตสูง',                  en: 'Hypertension' },
  { key: 'glucose',  th: 'น้ำตาลในเลือดสูง',                 en: 'High Blood Glucose' },
  { key: 'lipid',    th: 'ไขมันในเลือดผิดปกติ',              en: 'Dyslipidemia' },
  { key: 'vision',   th: 'สายตาผิดปกติ',                     en: 'Abnormal Vision' },
  { key: 'hearing',  th: 'การได้ยินผิดปกติ',                 en: 'Hearing Impairment' },
  { key: 'lung',     th: 'สมรรถภาพปอดผิดปกติ',              en: 'Abnormal Lung Function' },
  { key: 'normal',   th: 'ผลตรวจปกติ',                       en: 'Normal Result' },
];

export const riskFactorLabel = (key, lang = 'th') =>
  RISK_FACTORS.find((r) => r.key === key)?.[lang === 'en' ? 'en' : 'th'] || key || '—';

/** รูปแบบรายงานตามที่สำนักอนามัยกำหนด (§1.20.8.1) */
export const CHECKUP_REPORT_FORMATS = [
  {
    key: 'org-summary',
    th: 'แบบสรุปผลตรวจสุขภาพรายหน่วยงาน',
    en: 'Organization Summary Report',
    descTh: 'สรุปจำนวนผู้เข้ารับการตรวจ ผลปกติ/ผิดปกติ และปัจจัยเสี่ยงรายหน่วยงาน',
    descEn: 'Aggregated results and risk factors by organization',
  },
  {
    key: 'individual',
    th: 'แบบรายงานผลรายบุคคล',
    en: 'Individual Result Report',
    descTh: 'ใบรายงานผลตรวจสุขภาพรายบุคคล พร้อมค่าอ้างอิงและคำแนะนำ',
    descEn: 'Per-person report with reference ranges and advice',
  },
  {
    key: 'risk-group',
    th: 'แบบรายงานกลุ่มเสี่ยง',
    en: 'Risk Group Report',
    descTh: 'รายชื่อและจำนวนผู้ที่พบความเสี่ยงแยกตามปัจจัย เพื่อส่งต่อคลินิกโรคเรื้อรัง',
    descEn: 'Risk-stratified list for chronic-disease clinic referral',
  },
];

/** หน่วยงานที่ส่งพนักงานมาตรวจสุขภาพกับศูนย์บริการสาธารณสุข */
export const CHECKUP_ORGANIZATIONS = [
  { key: 'org-01', th: 'สำนักงานเขตดินแดง',            en: 'Din Daeng District Office' },
  { key: 'org-02', th: 'โรงเรียนวัดธาตุทอง',            en: 'Wat That Thong School' },
  { key: 'org-03', th: 'สำนักงานเขตคลองเตย',           en: 'Khlong Toei District Office' },
  { key: 'org-04', th: 'บริษัท ไทยพัฒนาการช่าง จำกัด', en: 'Thai Pattanakan Engineering Co., Ltd.' },
  { key: 'org-05', th: 'สหกรณ์ชุมชนลาดพร้าว',          en: 'Lat Phrao Community Cooperative' },
  { key: 'org-06', th: 'ศูนย์ฝึกอาชีพ กทม. บึงกุ่ม',     en: 'BMA Vocational Center, Bueng Kum' },
];

export const organizationLabel = (key, lang = 'th') =>
  CHECKUP_ORGANIZATIONS.find((o) => o.key === key)?.[lang === 'en' ? 'en' : 'th'] || key || '—';

/** ปีงบประมาณที่มีข้อมูล — §1.20.8.4 ต้องเทียบต่อเนื่อง ≥ 3 ปี
    2566 ตั้งใจให้ว่างในบางตัวชี้วัด เพื่อทดสอบกราฟที่มี "ปีไม่มีข้อมูล" */
export const CHECKUP_FISCAL_YEARS = ['2566', '2567', '2568', '2569'];

const buildCheckupResults = () => {
  const rng = makeRng(66120345);
  const rows = [];
  const riskKeys = RISK_FACTORS.map((r) => r.key);
  CHECKUP_FISCAL_YEARS.forEach((year) => {
    /* ปี 2566 เป็นปีตั้งต้น มีข้อมูลน้อยกว่า (ระบบเพิ่งเริ่มเก็บ) */
    const n = year === '2566' ? 180 : between(rng, 420, 620);
    for (let i = 0; i < n; i += 1) {
      const org = pick(rng, CHECKUP_ORGANIZATIONS).key;
      /* 44% ผลปกติ ที่เหลือกระจายตามปัจจัยเสี่ยง */
      const risk = rng() < 0.44 ? 'normal' : pick(rng, riskKeys.filter((k) => k !== 'normal'));
      rows.push({
        id: `chk-${year}-${String(i + 1).padStart(4, '0')}`,
        year,
        org,
        center: pick(rng, BMA_SERVICE_CENTERS).key,
        risk,
        gender: rng() < 0.52 ? 'หญิง' : 'ชาย',
        age: between(rng, 20, 64),
        followUp: risk !== 'normal' && rng() < 0.62,
      });
    }
  });
  return rows;
};

export const CHECKUP_RESULTS = buildCheckupResults();

export const checkupCountsByRisk = (rows = CHECKUP_RESULTS) => {
  const map = new Map(RISK_FACTORS.map((r) => [r.key, 0]));
  rows.forEach((r) => map.set(r.risk, (map.get(r.risk) || 0) + 1));
  return map;
};

/** หน่วยงานที่พบความเสี่ยงสูงสุด (สัดส่วนผลผิดปกติ) */
export const riskiestOrganizations = (rows = CHECKUP_RESULTS, limit = 6) => {
  const map = new Map();
  rows.forEach((r) => {
    const e = map.get(r.org) || { org: r.org, total: 0, abnormal: 0 };
    e.total += 1;
    if (r.risk !== 'normal') e.abnormal += 1;
    map.set(r.org, e);
  });
  return [...map.values()]
    .map((e) => ({ ...e, pct: e.total ? Math.round((e.abnormal / e.total) * 100) : 0 }))
    .sort((a, b) => b.pct - a.pct)
    .slice(0, limit);
};

/** §1.20.8.4 — แนวโน้มตัวชี้วัดต่อเนื่องรายปีงบประมาณ (≥ 3 ปี)
    ปี/ตัวชี้วัดที่ไม่มีข้อมูลคืน `null` เพื่อให้กราฟเว้นช่วง ไม่ใช่ค่า 0 หลอก */
export const CHECKUP_TREND_INDICATORS = [
  { key: 'bmi',     th: 'อัตราพบภาวะอ้วน (%)',        en: 'Obesity rate (%)' },
  { key: 'bp',      th: 'อัตราพบความดันสูง (%)',      en: 'Hypertension rate (%)' },
  { key: 'glucose', th: 'อัตราพบน้ำตาลสูง (%)',       en: 'High glucose rate (%)' },
  { key: 'lipid',   th: 'อัตราพบไขมันผิดปกติ (%)',    en: 'Dyslipidemia rate (%)' },
  { key: 'followup',th: 'อัตราติดตามต่อเนื่อง (%)',    en: 'Follow-up rate (%)' },
];

export const checkupTrendByYear = (indicatorKey) => (
  CHECKUP_FISCAL_YEARS.map((year) => {
    const rows = CHECKUP_RESULTS.filter((r) => r.year === year);
    if (!rows.length) return { year, value: null };
    /* ปี 2566 ยังไม่ได้เก็บผลไขมัน → gap ในกราฟ (ทดสอบ edge case) */
    if (indicatorKey === 'lipid' && year === '2566') return { year, value: null };
    const hit = indicatorKey === 'followup'
      ? rows.filter((r) => r.followUp).length
      : rows.filter((r) => r.risk === indicatorKey).length;
    return { year, value: Math.round((hit / rows.length) * 1000) / 10 };
  })
);

/** i18n เฉพาะหน้ารายงานตรวจสุขภาพ (§1.20.8.5) */
export const CHECKUP_I18N = {
  th: {
    pageTitle: 'รายงานผลการตรวจสุขภาพ',
    reportFormat: 'รูปแบบรายงาน',
    preview: 'ตัวอย่างก่อนพิมพ์',
    print: 'พิมพ์รายงาน',
    export: 'นำส่งออกรายงาน',
    email: 'ส่งรายงานทางอีเมล',
    shareLink: 'คัดลอกลิงก์รายงาน',
    org: 'หน่วยงาน',
    total: 'จำนวนผู้เข้ารับการตรวจ',
    normal: 'ผลปกติ',
    abnormal: 'ผลผิดปกติ',
    riskFactor: 'ปัจจัยเสี่ยง',
    people: 'คน',
    percent: 'ร้อยละ',
    year: 'ปีงบประมาณ',
    printedAt: 'วันที่พิมพ์',
    printedBy: 'ผู้พิมพ์',
    center: 'ศูนย์บริการสาธารณสุข',
    noData: 'ไม่พบข้อมูลในช่วงเวลาที่เลือก',
    /* ใช้ในแผ่นพิมพ์ 3 รูปแบบของ §1.20.8.1 */
    followUp: 'ส่งต่อเพื่อติดตาม',
    grandTotal: 'รวมทั้งสิ้น',
    ofAbnormal: 'ของผลผิดปกติ',
    sampleOne: 'ตัวอย่าง 1 ราย',
    examineeId: 'รหัสผู้เข้ารับการตรวจ',
    gender: 'เพศ',
    age: 'อายุ (ปี)',
    result: 'ผลการตรวจ',
    advice: 'คำแนะนำ',
  },
  en: {
    pageTitle: 'Health Check-up Report',
    reportFormat: 'Report format',
    preview: 'Print preview',
    print: 'Print report',
    export: 'Export report',
    email: 'Send report by e-mail',
    shareLink: 'Copy report link',
    org: 'Organization',
    total: 'Examinees',
    normal: 'Normal',
    abnormal: 'Abnormal',
    riskFactor: 'Risk factor',
    people: 'persons',
    percent: 'Percent',
    year: 'Fiscal year',
    printedAt: 'Printed on',
    printedBy: 'Printed by',
    center: 'Public Health Center',
    noData: 'No data in the selected period',
    followUp: 'Referred for follow-up',
    grandTotal: 'Total',
    ofAbnormal: 'of abnormal',
    sampleOne: 'sample of 1 examinee',
    examineeId: 'Examinee ID',
    gender: 'Gender',
    age: 'Age (years)',
    result: 'Result',
    advice: 'Advice',
  },
};
