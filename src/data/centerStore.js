/* PHCIS | Assess-control — Service center registry (Figma 4D3nTx53 · 4:21032).
   Mock persistence via localStorage. */

import { CLINIC_OPTIONS } from '@/components/layout/HeaderClinicContext';

const STORAGE_KEY = 'mih:service-centers';

const uid = () => `center-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const PROVINCE_LABELS = {
  bkk: 'กรุงเทพฯ',
  nonthaburi: 'นนทบุรี',
  samutprakan: 'สมุทรปราการ',
  pathumthani: 'ปทุมธานี',
};

const DISTRICT_LABELS = {
  dindaeng: 'ดินแดง',
  watthana: 'วัฒนา',
  bangsue: 'บางซื่อ',
  phranakhon: 'พระนคร',
};

const SUBDISTRICT_LABELS = {
  dindaeng: 'ดินแดง',
  samsennai: 'สามเสนใน',
};

/* ══════════════════════════════════════════════════════════════════════
   รหัสหน่วยบริการ (MOPH health-facility code)
   ══════════════════════════════════════════════════════════════════════
   สำนักนโยบายและยุทธศาสตร์ สธ. เปลี่ยนรหัสหน่วยบริการจากแบบ **5 หลัก**
   (ตัวเลขล้วน เช่น `12460`) เป็นแบบ **9 หลัก** (ตัวอักษร 2 + ตัวเลข 7
   เช่น `GA0012460`) — ค้นรหัสได้ที่ https://hcode.moph.go.th/code/

   กติกาในระบบนี้: **9 หลักคือ first priority และเป็นฟิลด์บังคับ**
   ส่วน 5 หลักเก็บไว้เป็นรหัสเดิม (ไม่บังคับ) สำหรับ map กับระบบเก่า/
   รายงานที่ยังอ้างรหัสเดิมอยู่. */

export const HCODE_LOOKUP_URL = 'https://hcode.moph.go.th/code/';
export const HCODE9_PATTERN = /^[A-Za-z]{2}\d{7}$/;
export const HCODE5_PATTERN = /^\d{5}$/;

/** ตัดช่องว่าง/ขีด แล้วบังคับตัวอักษรนำหน้าเป็นพิมพ์ใหญ่ (GA0012460). */
export function normalizeHcode9(raw) {
  return String(raw || '').replace(/[\s-]/g, '').toUpperCase().slice(0, 9);
}

export function normalizeHcode5(raw) {
  return String(raw || '').replace(/\D/g, '').slice(0, 5);
}

export function isValidHcode9(raw) {
  return HCODE9_PATTERN.test(normalizeHcode9(raw));
}

/** รหัส 9 หลักส่วนใหญ่คือ `XX` + `00` + รหัสเดิม 5 หลัก → เดารหัสเก่าให้
    เป็นค่าตั้งต้น (ผู้ใช้แก้ทับได้เสมอ). คืน '' ถ้ารูปแบบไม่เข้าเกณฑ์. */
export function deriveHcode5(hcode9) {
  const m = normalizeHcode9(hcode9).match(/^[A-Z]{2}00(\d{5})$/);
  return m ? m[1] : '';
}

export function isDuplicateHcode9(centers, hcode9, excludeId = null) {
  const norm = normalizeHcode9(hcode9);
  if (!norm) return false;
  return (centers || []).some((c) => c.id !== excludeId && normalizeHcode9(c.hcode9) === norm);
}

/* ══════════════════════════════════════════════════════════════════════
   เวลาทำการ — แยกตามกลุ่มวัน
   ══════════════════════════════════════════════════════════════════════
   ศูนย์บริการเปิดไม่เหมือนกันในวันทำการ / เสาร์-อาทิตย์ / วันหยุด
   นักขัตฤกษ์ จึงเก็บเป็น 3 กลุ่ม กลุ่มละ ในเวลา + นอกเวลาราชการ และมี
   ธง `closed` สำหรับกลุ่มที่ปิดทำการ.

   ของเดิมเก็บแบน (`inStart`/`inEnd`/`outStart`/`outEnd`) — ยังเขียนคีย์
   ชุดนั้นไว้เป็น mirror ของกลุ่ม `weekday` เพื่อไม่ให้ CenterSwitcherPopup
   และข้อมูลที่ persist ไว้แล้วพัง. */

export const HOUR_GROUPS = [
  { key: 'weekday', label: 'วันจันทร์ – ศุกร์',   sub: 'วันทำการปกติ',            icon: 'calendar_month' },
  { key: 'weekend', label: 'วันหยุดสุดสัปดาห์',    sub: 'วันเสาร์ – อาทิตย์',       icon: 'weekend' },
  { key: 'holiday', label: 'วันหยุดนักขัตฤกษ์',    sub: 'ตามประกาศวันหยุดราชการ',   icon: 'event_busy' },
];

export const DEFAULT_HOUR_GROUPS = {
  weekday: { closed: false, inStart: '08:00', inEnd: '16:00', outStart: '17:00', outEnd: '20:00' },
  weekend: { closed: true,  inStart: '',      inEnd: '',      outStart: '',      outEnd: '' },
  holiday: { closed: true,  inStart: '',      inEnd: '',      outStart: '',      outEnd: '' },
};

/** รับได้ทั้งรูปแบบใหม่ (มีกลุ่มวัน) และรูปแบบแบนของเดิม. */
export function normalizeCenterHours(hours = {}) {
  const out = {};
  HOUR_GROUPS.forEach(({ key }) => {
    const fallback = DEFAULT_HOUR_GROUPS[key];
    /* ของเดิมไม่มีกลุ่มวัน — ค่าแบนที่ root คือเวลาทำการวันจันทร์-ศุกร์ */
    const legacy = key === 'weekday' && !hours.weekday ? hours : null;
    const g = hours[key] || legacy || fallback;
    out[key] = {
      closed: g.closed != null ? !!g.closed : fallback.closed,
      inStart: g.inStart || '',
      inEnd: g.inEnd || '',
      outStart: g.outStart || '',
      outEnd: g.outEnd || '',
    };
  });
  /* mirror วันทำการไว้ที่ root ให้ผู้อ่านรุ่นเก่ายังใช้ได้ */
  return { ...out, ...out.weekday };
}

/* ══════════════════════════════════════════════════════════════════════
   ศูนย์บริการตั้งต้น — ครบทั้ง 69 ศูนย์ของสำนักอนามัย กทม.
   ══════════════════════════════════════════════════════════════════════
   สร้างจาก CLINIC_OPTIONS (แหล่งความจริงเดียวของรายชื่อศูนย์ทั้งระบบ) แทนการ
   พิมพ์ 69 รายการซ้ำอีกชุด — ชื่อ/ลำดับจึงตรงกับ dropdown สลับศูนย์บน Header
   เสมอ ถ้ารายชื่อเปลี่ยนที่เดียวก็เปลี่ยนตามทั้งหมด.

   รหัสหน่วยบริการ: รหัสเดิม 5 หลักไล่ตามลำดับศูนย์ (ศูนย์ 4 = 12460 ตามค่าจริง) แล้วรหัสใหม่
   9 หลัก = `GA` + `00` + รหัสเดิม (รูปแบบเดียวกับ GA0012460 = ศูนย์ 4 ดินแดง
   ซึ่งเป็นค่าจริงที่ผู้ใช้ยืนยันมา) — ศูนย์ที่มีข้อมูลจริงถูก override ด้านล่าง. */

/* ที่อยู่ · เบอร์โทร · รหัสไปรษณีย์ · เขต ของทั้ง 69 ศูนย์ — คัดจากเว็บไซต์
   สำนักอนามัย กทม. (webportal.bangkok.go.th/health) หน้า "ศูนย์บริการสาธารณสุข
   สังกัดสำนักอนามัย" ศูนย์ 1-48 และ 49-69 · อีเมลใช้รูปแบบมาตรฐานของ กทม.
   healthcenter<n>@bangkok.go.th ซึ่งเว็บไซต์ปิดบังไว้ ไม่ได้เผยแพร่ตัวเต็ม. */
const CENTER_DIRECTORY = {
  1: { address: '3-5 ถ.เจริญกรุง แขวงวังบูรพาภิรมย์ เขตพระนคร', zip: '10200', district: 'พระนคร', phone: '0 2222 5897' },
  2: { address: '509 วัดดิสหงษาราม ถ.เพชรบุรีตัดใหม่ แขวงมักกะสัน เขตราชเทวี', zip: '10400', district: 'ราชเทวี', phone: '0 2251 7735-7' },
  3: { address: '596 ถ.เตชะวณิช แขวงบางซื่อ เขตบางซื่อ', zip: '10800', district: 'บางซื่อ', phone: '0 2587 0881' },
  4: { address: '4395 ถ.ประชาสงเคราะห์ แขวงดินแดง เขตดินแดง', zip: '10400', district: 'ดินแดง', phone: '0 2246 1553' },
  5: { address: '130 ซ.จุฬาฯ 36 ถ.บรรทัดทอง แขวงวังใหม่ เขตปทุมวัน', zip: '10330', district: 'ปทุมวัน', phone: '0 2214 1057' },
  6: { address: '426 ถ.พิษณุโลก แขวงสี่แยกมหานาค เขตดุสิต', zip: '10300', district: 'ดุสิต', phone: '0 2282 8493' },
  7: { address: '663 ถ.สาธุประดิษฐ์ แขวงบางโพงพาง เขตยานนาวา', zip: '10120', district: 'ยานนาวา', phone: '0 2284 3427-8' },
  8: { address: '23 ซ.อุดมสุข 18 สุขุมวิท 103 แขวงบางนา เขตบางนา', zip: '10260', district: 'บางนา', phone: '0 2361 6760-2' },
  9: { address: '64 ถ.ประชาธิปไตย แขวงบ้านพานถม เขตพระนคร', zip: '10200', district: 'พระนคร', phone: '0 2281 1907' },
  10: { address: '722 ซ.สุขุมวิท 30 แขวงคลองตัน เขตคลองเตย', zip: '10110', district: 'คลองเตย', phone: '0 2259 2523' },
  11: { address: '51/13 ซ.ประดิพัทธ์ 7 ถ.ประดิพัทธ์ แขวงสามเสนใน เขตพญาไท', zip: '10400', district: 'พญาไท', phone: '0 2271 1122' },
  12: { address: '860/37 ซ.เจริญกรุง 107 แยก 40 แขวงบางคอแหลม เขตบางคอแหลม', zip: '10120', district: 'บางคอแหลม', phone: '0 2291 7637-8' },
  13: { address: '527 ซ.อาเนี้ยเก็ง ถ.ทรงวาด แขวงจักรวรรดิ เขตสัมพันธวงศ์', zip: '10100', district: 'สัมพันธวงศ์', phone: '0 2222 7875' },
  14: { address: '21 ซ.จันทน์ 42 ถ.จันทน์ แขวงวัดพระยาไกร เขตบางคอแหลม', zip: '10120', district: 'บางคอแหลม', phone: '0 2211 2353' },
  15: { address: '179/1 ซ.ลาดพร้าว 41 ถ.ลาดพร้าว แขวงสามเสนนอก เขตห้วยขวาง', zip: '10310', district: 'ห้วยขวาง', phone: '0 2541 8380' },
  16: { address: '161/82 ซ.ปลูกจิต ถ.พระราม 4 แขวงลุมพินี เขตปทุมวัน', zip: '10330', district: 'ปทุมวัน', phone: '0 2251 2970' },
  17: { address: 'ถ.เทศบาลสงเคราะห์ แขวงลาดยาว เขตจตุจักร', zip: '10900', district: 'จตุจักร', phone: '0 2589 5768' },
  18: { address: '55 ซ.จันทน์ 43 ถ.จันทน์ แขวงบางโคล่ เขตบางคอแหลม', zip: '10120', district: 'บางคอแหลม', phone: '0 2211 0860' },
  19: { address: '675 ถ.วงศ์สว่าง แขวงบางซื่อ เขตบางซื่อ', zip: '10800', district: 'บางซื่อ', phone: '0 2910 7314-5' },
  20: { address: '245-249 ถ.นครสวรรค์ แขวงวัดโสมนัส เขตป้อมปราบศัตรูพ่าย', zip: '10100', district: 'ป้อมปราบศัตรูพ่าย', phone: '0 2223 0004' },
  21: { address: '1325/14 ถ.สุขุมวิท แขวงพระโขนงเหนือ เขตวัฒนา', zip: '10110', district: 'วัฒนา', phone: '0 2391 6082' },
  22: { address: '235 ซ.อ่อนนุช 35 แขวงสวนหลวง เขตสวนหลวง', zip: '10250', district: 'สวนหลวง', phone: '0 2349 1816-7' },
  23: { address: '383/4 ถ.สี่พระยา แขวงสี่พระยา เขตบางรัก', zip: '10500', district: 'บางรัก', phone: '0 2233 6329' },
  24: { address: '62 ถ.พหลโยธิน 45 แขวงลาดยาว เขตจตุจักร', zip: '10900', district: 'จตุจักร', phone: '0 2579 1342' },
  25: { address: '2 ถ.ประชาอุทิศ แขวงห้วยขวาง เขตห้วยขวาง', zip: '10310', district: 'ห้วยขวาง', phone: '0 2276 5995' },
  26: { address: '246 ถ.เทศบาลสาย 1 แขวงวัดกัลยาณ์ เขตธนบุรี', zip: '10600', district: 'ธนบุรี', phone: '0 2465 0014' },
  27: { address: '359 ถ.เทอดไท แขวงบางยี่เรือ เขตธนบุรี', zip: '10600', district: 'ธนบุรี', phone: '0 2465 1000' },
  28: { address: '124/16 ถ.กรุงธนบุรี แขวงบางลำภูล่าง เขตคลองสาน', zip: '10600', district: 'คลองสาน', phone: '0 2860 8210' },
  29: { address: '27/21 ซ.วุฒากาศ 49 แขวงบางค้อ เขตจอมทอง', zip: '10150', district: 'จอมทอง', phone: '0 2476 6493' },
  30: { address: '164/79 ซ.บางขุนนนท์ แขวงบางขุนนนท์ เขตบางกอกน้อย', zip: '10700', district: 'บางกอกน้อย', phone: '0 2423 0234' },
  31: { address: '252 ซ.จรัญสนิทวงศ์ 84/1 แขวงบางอ้อ เขตบางพลัด', zip: '10700', district: 'บางพลัด', phone: '0 2434 7303-5' },
  32: { address: '91 ซ.สุขุมวิท 64/1 แขวงบางจาก เขตพระโขนง', zip: '10260', district: 'พระโขนง', phone: '0 2331 9114' },
  33: { address: '127 ซ.วังเดิม ถ.วังเดิม แขวงวัดอรุณ เขตบางกอกใหญ่', zip: '10600', district: 'บางกอกใหญ่', phone: '0 2472 5895-6' },
  34: { address: '151 ซ.สายทิพย์ ถ.สุขุมวิท 56 แขวงบางจาก เขตพระโขนง', zip: '10260', district: 'พระโขนง', phone: '0 2331 9873-7' },
  35: { address: '4 ซ.รามคำแหง 40 ถ.รามคำแหง แขวงหัวหมาก เขตบางกะปิ', zip: '10240', district: 'บางกะปิ', phone: '0 2375 3550' },
  36: { address: '779/2 ถ.เจริญนคร แขวงดาวคะนอง เขตธนบุรี', zip: '10600', district: 'ธนบุรี', phone: '0 2468 2597' },
  37: { address: '2044 ถ.พัฒนาการ แขวงสวนหลวง เขตสวนหลวง', zip: '10250', district: 'สวนหลวง', phone: '0 2362 5238' },
  38: { address: '23 ศูนย์ราชการกรุงเทพมหานคร ถ.ทหาร แขวงถนนนครไชยศรี เขตดุสิต', zip: '10300', district: 'ดุสิต', phone: '0 2241 8378' },
  39: { address: '46 ถ.ราษฎร์บูรณะ แขวงราษฎร์บูรณะ เขตราษฎร์บูรณะ', zip: '10140', district: 'ราษฎร์บูรณะ', phone: '0 2427 7949' },
  40: { address: '578 ซ.เพชรเกษม 90 ถ.เพชรเกษม แขวงบางแคเหนือ เขตบางแค', zip: '10160', district: 'บางแค', phone: '0 2455 3870' },
  41: { address: '139 ถ.อาจณรงค์ แขวงคลองเตย เขตคลองเตย', zip: '10250', district: 'คลองเตย', phone: '0 2249 1385' },
  42: { address: '1 ซ.พระรามสอง ถ.พระราม 2 เขตบางขุนเทียน', zip: '10150', district: 'บางขุนเทียน', phone: '0 2416 8318' },
  43: { address: '319 หมู่ 1 ถ.สีหบุรานุกิจ แขวงมีนบุรี เขตมีนบุรี', zip: '10510', district: 'มีนบุรี', phone: '0 2540 5615-6' },
  44: { address: '96/5 หมู่ 9 ถ.สุวินทวงศ์ แขวงลำผักชี เขตหนองจอก', zip: '10530', district: 'หนองจอก', phone: '0 2988 1633-6' },
  45: { address: '361 หมู่ 4 ถ.เคหะชุมชนร่มเกล้า แขวงคลองสองต้นนุ่น เขตลาดกระบัง', zip: '10520', district: 'ลาดกระบัง', phone: '0 2543 0393' },
  46: { address: '523/2 ซ.ลาดกระบัง แขวงลาดกระบัง เขตลาดกระบัง', zip: '10520', district: 'ลาดกระบัง', phone: '0 2329 0320' },
  47: { address: '55 ซ.บางแวก 32 ถ.จรัญสนิทวงศ์ แขวงบางแวก เขตภาษีเจริญ', zip: '10160', district: 'ภาษีเจริญ', phone: '0 2410 1810' },
  48: { address: '40 ถ.เลียบคลองภาษีเจริญฝั่งเหนือ แขวงหนองแขม เขตหนองแขม', zip: '10160', district: 'หนองแขม', phone: '0 2421 2147' },
  49: { address: '271 ถ.ชัยพฤกษ์ แขวงตลิ่งชัน เขตตลิ่งชัน', zip: '10170', district: 'ตลิ่งชัน', phone: '0 2424 9410' },
  50: { address: '190 หมู่ 1 ถ.เสรีไทย แขวงคลองกุ่ม เขตบึงกุ่ม', zip: '10240', district: 'บึงกุ่ม', phone: '0 2375 2897' },
  51: { address: '4 ซ.พหลโยธิน 24 ถ.พหลโยธิน แขวงจอมพล เขตจตุจักร', zip: '10900', district: 'จตุจักร', phone: '0 2279 8972' },
  52: { address: '2000/30 ถ.ประชาสงเคราะห์ แขวงดินแดง เขตดินแดง', zip: '10400', district: 'ดินแดง', phone: '0 2275 6579' },
  53: { address: 'ซ.กำแพงเพชร 6 ซ.7 ถ.กำแพงเพชร แขวงทุ่งสองห้อง เขตหลักสี่', zip: '10210', district: 'หลักสี่', phone: '0 2575 2650' },
  54: { address: '410 ถ.พุทธบูชา แขวงบางมด เขตทุ่งครุ', zip: '10140', district: 'ทุ่งครุ', phone: '0 2426 3514' },
  55: { address: '27/4 ซ.48 ถ.พระราม 3 แขวงช่องนนทรี เขตยานนาวา', zip: '10120', district: 'ยานนาวา', phone: '0 2294 3247' },
  56: { address: '43/1 หมู่ 12 ถ.นวลจันทร์ แขวงนวลจันทร์ เขตบึงกุ่ม', zip: '10230', district: 'บึงกุ่ม', phone: '0 2184 2693' },
  57: { address: '226 ถ.เฉลิมพระเกียรติ ร.9 แขวงหนองบอน เขตประเวศ', zip: '10250', district: 'ประเวศ', phone: '0 2396 1866' },
  58: { address: '1/1 ซ.สุขสวัสดิ์ 30 ถ.สุขสวัสดิ์ แขวงบางปะกอก เขตราษฎร์บูรณะ', zip: '10140', district: 'ราษฎร์บูรณะ', phone: '0 2427 7512' },
  59: { address: '46 ซ.ประชาอุทิศ 90 ถ.ประชาอุทิศ แขวงทุ่งครุ เขตทุ่งครุ', zip: '10140', district: 'ทุ่งครุ', phone: '0 2463 5621' },
  60: { address: '60 หมู่ 4 ถ.สรงประภา แขวงดอนเมือง เขตดอนเมือง', zip: '10210', district: 'ดอนเมือง', phone: '0 2565 5257' },
  61: { address: '19/5 หมู่ 3 ซ.สายไหม 43 ถ.สายไหม แขวงสายไหม เขตสายไหม', zip: '10220', district: 'สายไหม', phone: '0 2536 0163' },
  62: { address: '68 ถ.ศาลธนบุรี 17 แยก 5 แขวงบางหว้า เขตภาษีเจริญ', zip: '10160', district: 'ภาษีเจริญ', phone: '0 2455 5804' },
  63: { address: '1/1 ซ.จันทน์ ถ.เย็นจิตร์ 12 แขวงทุ่งวัดดอน เขตสาทร', zip: '10120', district: 'สาทร', phone: '0 2675 9945' },
  64: { address: '1 ซ.เลียบคลองสอง 10 ถ.เลียบคลองสอง แขวงบางชัน เขตคลองสามวา', zip: '10510', district: 'คลองสามวา', phone: '0 2548 0495' },
  65: { address: '3 ซ.เอกชัย 121 ถ.เอกชัย แขวงบางบอน เขตบางบอน', zip: '10150', district: 'บางบอน', phone: '0 2453 0526' },
  66: { address: '4/98 ซ.โชคชัย 4 แยก 39 แขวงลาดพร้าว เขตลาดพร้าว', zip: '10230', district: 'ลาดพร้าว', phone: '0 2539 4828' },
  67: { address: '3 ถ.อุทยาน แขวงทวีวัฒนา เขตทวีวัฒนา', zip: '10170', district: 'ทวีวัฒนา', phone: '0 2441 4680' },
  68: { address: '1 ซ.รามคำแหง 118 แยก 33 แขวงสะพานสูง เขตสะพานสูง', zip: '10240', district: 'สะพานสูง', phone: '0 2372 2225' },
  69: { address: '15 ซ.01 กาญจนภิเษก 11/5 แขวงคันนายาว เขตคันนายาว', zip: '10230', district: 'คันนายาว', phone: '0 2379 8911' },
};

/* เวลาทำการมาตรฐานของศูนย์บริการสาธารณสุข: จันทร์-ศุกร์ 08:00-16:00
   เสาร์-อาทิตย์และวันหยุดนักขัตฤกษ์ปิด — ศูนย์ที่เปิดต่างจากนี้ override ท้ายไฟล์. */
const STANDARD_HOURS = {
  weekday: { closed: false, inStart: '08:00', inEnd: '16:00', outStart: '', outEnd: '' },
  weekend: { closed: true, inStart: '', inEnd: '', outStart: '', outEnd: '' },
  holiday: { closed: true, inStart: '', inEnd: '', outStart: '', outEnd: '' },
};

/* ศูนย์ที่เปิดนอกเวลา/เสาร์-อาทิตย์ด้วย (คลินิกนอกเวลาราชการ) */
const EXTENDED_HOURS_CENTERS = {
  4: {
    weekday: { closed: false, inStart: '08:00', inEnd: '16:00', outStart: '17:00', outEnd: '20:00' },
    weekend: { closed: false, inStart: '08:00', inEnd: '12:00', outStart: '', outEnd: '' },
    holiday: { closed: true, inStart: '', inEnd: '', outStart: '', outEnd: '' },
  },
  25: {
    weekday: { closed: false, inStart: '08:00', inEnd: '16:00', outStart: '16:00', outEnd: '20:00' },
    weekend: { closed: false, inStart: '08:00', inEnd: '12:00', outStart: '', outEnd: '' },
    holiday: { closed: true, inStart: '', inEnd: '', outStart: '', outEnd: '' },
  },
  43: {
    weekday: { closed: false, inStart: '08:00', inEnd: '16:00', outStart: '16:00', outEnd: '20:00' },
    weekend: { closed: false, inStart: '08:00', inEnd: '12:00', outStart: '', outEnd: '' },
    holiday: { closed: true, inStart: '', inEnd: '', outStart: '', outEnd: '' },
  },
};

export const DEMO_CENTERS = CLINIC_OPTIONS.map(({ value, label }) => {
  const n = Number(String(value).replace('hc-', ''));
  const name = label.replace(/^\u0e28\u0e39\u0e19\u0e22\u0e4c\s*\d+\s*/, '');
  /* n=4 (\u0e14\u0e34\u0e19\u0e41\u0e14\u0e07) \u0e15\u0e49\u0e2d\u0e07\u0e44\u0e14\u0e49 12460 \u0e0b\u0e36\u0e48\u0e07\u0e40\u0e1b\u0e47\u0e19\u0e04\u0e48\u0e32\u0e08\u0e23\u0e34\u0e07\u0e17\u0e35\u0e48\u0e1c\u0e39\u0e49\u0e43\u0e0a\u0e49\u0e22\u0e37\u0e19\u0e22\u0e31\u0e19 \u2192 \u0e10\u0e32\u0e19 12456 */
  const hcode5 = String(12456 + n);
  const info = CENTER_DIRECTORY[n] || {};
  const hours = EXTENDED_HOURS_CENTERS[n] || STANDARD_HOURS;
  return {
    id: `center-${n}`,
    code: String(n),
    hcode9: `GA00${hcode5}`,
    hcode5,
    name,
    location: {
      zip: info.zip || '',
      province: 'bkk',
      district: info.district || '',
      subdistrict: '',
      road: '',
      moo: '',
      /* ที่อยู่จริงเก็บเป็นบรรทัดเดียวใน `no` — ฟอร์มเพิ่มศูนย์แยก ถนน/หมู่/เลขที่
         แต่ข้อมูลจากสำนักอนามัยมาเป็นบรรทัดเดียว จะแตกเองแล้วเพี้ยน */
      no: info.address || '',
    },
    phones: info.phone ? [info.phone] : [],
    emails: [`healthcenter${n}@bangkok.go.th`],
    website: 'webportal.bangkok.go.th/health',
    /* mirror ค่าวันทำการไว้ที่ root ให้ผู้อ่านรุ่นเก่ายังใช้ได้ */
    hours: { ...hours, ...hours.weekday },
    active: true,
    draft: false,
  };
});

/** ทะเบียนว่าง (เบราว์เซอร์ใหม่) ให้คืนชุดตั้งต้น — ไม่งั้นหน้าศูนย์บริการ
    ขึ้น empty state และ dropdown ที่อ้างทะเบียนศูนย์ก็ว่างตามไปหมด.
    เขียนทับได้ทันทีที่ผู้ใช้กด "เพิ่มศูนย์บริการ". */
export function readCenters() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw == null) return DEMO_CENTERS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length ? parsed : DEMO_CENTERS;
  } catch {
    return DEMO_CENTERS;
  }
}

export function writeCenters(centers) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(centers));
}

export function createCenter(payload) {
  const {
    code,
    hcode9 = '',
    hcode5 = '',
    name,
    location = {},
    phones = [],
    emails = [],
    website = '',
    hours = {},
    draft = false,
  } = payload;

  return {
    id: uid(),
    code: String(code || '').trim(),
    hcode9: normalizeHcode9(hcode9),
    hcode5: normalizeHcode5(hcode5),
    name: String(name || '').trim(),
    location,
    phones: phones.map((p) => String(p).trim()).filter(Boolean),
    emails: emails.map((e) => String(e).trim()).filter(Boolean),
    website: String(website || '').trim(),
    hours: normalizeCenterHours(hours),
    active: true,
    draft: !!draft,
  };
}

export function computeCenterStats(centers) {
  const published = (centers || []).filter((c) => !c.draft);
  return {
    total: published.length,
    active: published.filter((c) => c.active).length,
    inactive: published.filter((c) => !c.active).length,
  };
}

export function isDuplicateCenterCode(centers, code, excludeId = null) {
  const norm = String(code || '').trim();
  if (!norm) return false;
  return centers.some((c) => c.id !== excludeId && String(c.code).trim() === norm);
}

function label(map, key) {
  if (!key) return '';
  return map[key] || key;
}

export function formatCenterAddress(loc = {}) {
  const sub = label(SUBDISTRICT_LABELS, loc.subdistrict);
  const dist = label(DISTRICT_LABELS, loc.district);
  const prov = label(PROVINCE_LABELS, loc.province);
  const zip = loc.zip || '';

  const parts = [
    loc.no,
    loc.road,
    sub ? `แขวง${sub}` : '',
    dist ? `เขต${dist}` : '',
    prov ? `${prov}${zip}` : zip,
  ].filter(Boolean);

  return parts.join(' ');
}

function formatHourToken(t) {
  if (!t) return '—';
  const [h, m] = String(t).split(':');
  const hour = Number(h);
  if (Number.isNaN(hour)) return t;
  const mins = m === '00' ? '' : `.${m}`;
  return `${hour}${mins}`;
}

/** `kind` = 'in' | 'out' · `groupKey` = weekday (ค่าตั้งต้น) | weekend | holiday. */
export function formatCenterHoursLine(hours = {}, kind, groupKey = 'weekday') {
  const g = normalizeCenterHours(hours)[groupKey] || {};
  if (g.closed) return 'ปิดทำการ';
  const [start, end] = kind === 'in' ? [g.inStart, g.inEnd] : [g.outStart, g.outEnd];
  if (!start && !end) return '—';
  return `${formatHourToken(start)}-${formatHourToken(end)}น.`;
}

export function loadDemoCenters() {
  writeCenters(DEMO_CENTERS);
  return DEMO_CENTERS;
}

/* ══════════════════════════════════════════════════════════════════════
   TOR §1.17.5.4 — ศูนย์บริการที่กำลังให้บริการ (active center)
   ══════════════════════════════════════════════════════════════════════
   แหล่งความจริงของ "ศูนย์ที่กำลังให้บริการ" คือ `useClinicFilter()` ใน
   src/components/layout/HeaderClinicContext.jsx (69 ศูนย์, mount ไว้ที่
   App.jsx และ Header/Sidebar consume อยู่แล้ว). ส่วนนี้ทำหน้าที่แค่
   **persist + broadcast** ค่านั้น เพื่อให้รีเฟรชแล้วศูนย์ที่เลือกยังอยู่ —
   ห้ามสร้าง state ศูนย์ชุดที่สาม ไม่งั้น Header กับ /users จะโชว์คนละศูนย์.

   คู่มือระบบสารสนเทศส่วนกลาง (MIS/EIS) หน้า 1-4 ระบุกติกา scope ไว้ตรง ๆ ว่า
   "ศูนย์บริการสาธารณสุขจะสามารถดูข้อมูลได้เฉพาะข้อมูลของศูนย์ฯ ตัวเองเท่านั้น"
   → การสลับศูนย์ = สลับ scope ข้อมูล (คิว/รายงาน/แจ้งเตือน/หัวกระดาษพิมพ์)
   ไม่ใช่แค่เปลี่ยน label. */

export const ACTIVE_CENTER_KEY = 'mih:active-center';

const activeCenterListeners = new Set();

/** อ่านศูนย์ที่ค้างไว้จากรอบก่อน (null = ยังไม่เคยเลือก → ใช้ค่า default ของ context). */
export function readActiveCenter() {
  try {
    const raw = localStorage.getItem(ACTIVE_CENTER_KEY);
    return raw ? String(raw) : null;
  } catch {
    return null;
  }
}

/** จำศูนย์ที่กำลังให้บริการไว้ข้ามการรีเฟรช. */
export function writeActiveCenter(value) {
  try {
    localStorage.setItem(ACTIVE_CENTER_KEY, String(value));
  } catch { /* โหมด private / storage เต็ม — ข้ามไป ไม่ให้หน้าจอพัง */ }
  activeCenterListeners.forEach((fn) => { try { fn(value); } catch { /* ignore */ } });
}

export function subscribeActiveCenter(fn) {
  activeCenterListeners.add(fn);
  return () => activeCenterListeners.delete(fn);
}

/** รายละเอียดศูนย์จากทะเบียน (ถ้ามี) — ใช้เติมเบอร์/ที่อยู่บนป๊อปอัปสลับศูนย์. */
export function findCenterDetail(centerValue) {
  const code = String(centerValue || '').replace('hc-', '');
  const all = [...readCenters(), ...DEMO_CENTERS];
  return all.find((c) => String(c.code) === code) || null;
}
