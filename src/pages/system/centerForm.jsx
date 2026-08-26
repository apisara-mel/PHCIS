/* ระบบจัดการระบบ · ฟอร์มศูนย์บริการ (ใช้ร่วมกันระหว่างหน้าเต็มกับ popup)
   ══════════════════════════════════════════════════════════════════════
   แยกออกจาก AddCenterPage เพื่อให้ "เพิ่มศูนย์บริการ" (หน้าเต็ม) กับ
   "แก้ไขศูนย์บริการ" (popup ในตารางทะเบียน) ใช้ **เนื้อฟอร์มชุดเดียวกัน**
   ไม่ต้องมีฟอร์มสองก๊อปปี้ที่ค่อย ๆ เพี้ยนจากกัน

     useCenterForm({ existing, onSaved })  — state · validation · persist
     <CenterFormBody form={form} />        — เนื้อ 6 step ตาม form.step
     CENTER_FORM_STEPS                     — นิยาม step ใช้ทำ stepper

   `existing` ว่าง = โหมดสร้างใหม่ · ส่ง record ของศูนย์เข้ามา = โหมดแก้ไข
   (โหลดค่าเดิมเข้าฟอร์ม แล้วบันทึกทับ record เดิมแทนการเพิ่มใหม่) */

import React, { useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import Footer from '@/components/layout/Footer';
import SuccessScreen from '@/components/layout/SuccessScreen';
import InputField from '@/components/forms/InputField';
import Select from '@/components/forms/Select';
import AddressMapBlock from '@/components/forms/AddressMapBlock';
import BrandButton from '@/components/button/BrandButton';
import BrandDashedAddButton from '@/components/button/BrandDashedAddButton';
import BrandSubdueIconButton from '@/components/button/BrandSubdueIconButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import Popup from '@/components/popup/Popup';
import DeleteCenterContactConfirmPopup from '@/components/popup/DeleteCenterContactConfirmPopup';
import Icon from '@/components/icons/Icon';
import Topic from '@/components/topic/Topic';
import Information from '@/components/information/Information';
import WizardMorphHeader, { WIZARD_MORPH_SHELL_PROPS } from '@/components/layout/WizardMorphHeader';
import Switch from '@/components/switch/Switch';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import SYSTEM_NAV from '@/pages/system/systemNav';
import { StructureReview, StructureUnitsEditor } from '@/pages/system/structureForm';
import { TIME_OPTIONS } from '@/pages/system/centerHourOptions';
import {
  readCenters,
  writeCenters,
  createCenter,
  isDuplicateCenterCode,
  nextCenterCode,
  isDuplicateHcode9,
  formatCenterHoursLine,
  normalizeHcode9,
  normalizeHcode5,
  isValidHcode9,
  deriveHcode5,
  HCODE_LOOKUP_URL,
  HOUR_GROUPS,
  DEFAULT_HOUR_GROUPS,
  normalizeCenterHours,
  createBranch,
  formatCenterAddress,
  normalizeBranches,
} from '@/data/centerStore';
import { isValidEmail, EMAIL_FORMAT_ERROR } from '@/data/usersAccess';
import {
  createStructureTemplate,
  countStructure,
  defaultStructure,
  instantiateUnits,
  readStructures,
  writeStructures,
  summarizeStructure,
  unitKindLabel,
} from '@/data/centerStructure';

/* ระบบจัดการระบบ · เพิ่มศูนย์บริการ (Figma 4D3nTx53 · 1:3273 "Create Branch").
   5-step wizard: ข้อมูลศูนย์ → ที่ตั้ง → ข้อมูลการติดต่อ → เวลาทำการ → รีวิว.
   Reuses InputField / Select / buttons + the จัดการระบบ shell. */

const breadcrumb = ['จัดการระบบ', 'ศูนย์บริการ', 'เพิ่มศูนย์บริการ'];
const STEPS = [
  { key: 'info', n: 1, label: 'ข้อมูลศูนย์' },
  { key: 'location', n: 2, label: 'ที่ตั้ง' },
  { key: 'contact', n: 3, label: 'ข้อมูลการติดต่อ' },
  { key: 'hours', n: 4, label: 'เวลาทำการ' },
  /* สร้างศูนย์แล้วสร้างแผนก/คลินิก + ห้องตรวจ/เตียง ไปพร้อมกันในขั้นตอนเดียว */
  /* ป้าย step เปลี่ยนจาก "แผนกและคลินิก" เป็น "รูปแบบโครงสร้างศูนย์"
     25 ส.ค. 2569 — ให้ตรงกับชื่อเมนู/ทะเบียนที่ step นี้ไปหยิบรูปแบบมาใช้ */
  { key: 'structure', n: 5, label: 'รูปแบบโครงสร้างศูนย์' },
  { key: 'review', n: 6, label: 'รีวิว' },
];
/* ศูนย์บริการสาธารณสุขทั้งหมดอยู่ในกรุงเทพมหานคร — ช่องจังหวัดจึงล็อกค่าไว้
   ค่าเดียวและปิดการแก้ไข (25 ส.ค. 2569) ไม่ต้องให้เลือกจังหวัดอื่นแล้วหลุด */
const BKK_PROVINCE = 'bkk';
const PROVINCE_OPTS = [
  { value: BKK_PROVINCE, label: 'กรุงเทพมหานคร' },
];

/* รหัสไปรษณีย์เฉพาะที่มีในกรุงเทพมหานคร (25 รหัส) — แสดงเฉพาะตัวเลข
   ไม่ต่อท้ายด้วยชื่อเขต เพราะมีช่อง "เขต/อำเภอ" แยกอยู่แล้ว */
const BKK_ZIP_OPTS = [
  { value: '', label: 'รหัสไปรษณีย์' },
  { value: '10100', label: '10100' },
  { value: '10110', label: '10110' },
  { value: '10120', label: '10120' },
  { value: '10140', label: '10140' },
  { value: '10150', label: '10150' },
  { value: '10160', label: '10160' },
  { value: '10170', label: '10170' },
  { value: '10200', label: '10200' },
  { value: '10210', label: '10210' },
  { value: '10220', label: '10220' },
  { value: '10230', label: '10230' },
  { value: '10240', label: '10240' },
  { value: '10250', label: '10250' },
  { value: '10260', label: '10260' },
  { value: '10300', label: '10300' },
  { value: '10310', label: '10310' },
  { value: '10400', label: '10400' },
  { value: '10500', label: '10500' },
  { value: '10510', label: '10510' },
  { value: '10520', label: '10520' },
  { value: '10530', label: '10530' },
  { value: '10600', label: '10600' },
  { value: '10700', label: '10700' },
  { value: '10800', label: '10800' },
  { value: '10900', label: '10900' },
];
/* ทะเบียนเขต × แขวง ของกรุงเทพมหานคร ครบทั้ง 50 เขต / 180 แขวง
   (25 ส.ค. 2569 — เดิมเป็น placeholder 4 เขต) · `zip` = รหัสไปรษณีย์หลัก
   ของเขตนั้น ใช้เติมช่องรหัสไปรษณีย์ให้อัตโนมัติเมื่อเลือกเขต */
const BKK_DISTRICTS = [
  { name: 'พระนคร', zip: '10200', subdistricts: ['พระบรมมหาราชวัง', 'วังบูรพาภิรมย์', 'วัดราชบพิธ', 'สำราญราษฎร์', 'ศาลเจ้าพ่อเสือ', 'เสาชิงช้า', 'บวรนิเวศ', 'ตลาดยอด', 'ชนะสงคราม', 'บ้านพานถม', 'บางขุนพรหม', 'วัดสามพระยา'] },
  { name: 'ดุสิต', zip: '10300', subdistricts: ['ดุสิต', 'วชิรพยาบาล', 'สวนจิตรลดา', 'สี่แยกมหานาค', 'ถนนนครไชยศรี'] },
  { name: 'หนองจอก', zip: '10530', subdistricts: ['กระทุ่มราย', 'หนองจอก', 'คลองสิบ', 'คลองสิบสอง', 'โคกแฝด', 'คู้ฝั่งเหนือ', 'ลำผักชี', 'ลำต้อยติ่ง'] },
  { name: 'บางรัก', zip: '10500', subdistricts: ['มหาพฤฒาราม', 'สีลม', 'สุริยวงศ์', 'บางรัก', 'สี่พระยา'] },
  { name: 'บางเขน', zip: '10220', subdistricts: ['อนุสาวรีย์', 'ท่าแร้ง'] },
  { name: 'บางกะปิ', zip: '10240', subdistricts: ['คลองจั่น', 'หัวหมาก'] },
  { name: 'ปทุมวัน', zip: '10330', subdistricts: ['รองเมือง', 'วังใหม่', 'ปทุมวัน', 'ลุมพินี'] },
  { name: 'ป้อมปราบศัตรูพ่าย', zip: '10100', subdistricts: ['ป้อมปราบ', 'วัดเทพศิรินทร์', 'คลองมหานาค', 'บ้านบาตร', 'วัดโสมนัส'] },
  { name: 'พระโขนง', zip: '10260', subdistricts: ['บางจาก', 'พระโขนงใต้'] },
  { name: 'มีนบุรี', zip: '10510', subdistricts: ['มีนบุรี', 'แสนแสบ'] },
  { name: 'ลาดกระบัง', zip: '10520', subdistricts: ['ลาดกระบัง', 'คลองสองต้นนุ่น', 'คลองสามประเวศ', 'ลำปลาทิว', 'ทับยาว', 'ขุมทอง'] },
  { name: 'ยานนาวา', zip: '10120', subdistricts: ['ช่องนนทรี', 'บางโพงพาง'] },
  { name: 'สัมพันธวงศ์', zip: '10100', subdistricts: ['จักรวรรดิ', 'สัมพันธวงศ์', 'ตลาดน้อย'] },
  { name: 'พญาไท', zip: '10400', subdistricts: ['สามเสนใน', 'พญาไท'] },
  { name: 'ธนบุรี', zip: '10600', subdistricts: ['วัดกัลยาณ์', 'หิรัญรูจี', 'บางยี่เรือ', 'บุคคโล', 'ตลาดพลู', 'ดาวคะนอง', 'สำเหร่'] },
  { name: 'บางกอกใหญ่', zip: '10600', subdistricts: ['วัดท่าพระ', 'วัดอรุณ'] },
  { name: 'ห้วยขวาง', zip: '10310', subdistricts: ['ห้วยขวาง', 'บางกะปิ', 'สามเสนนอก'] },
  { name: 'คลองสาน', zip: '10600', subdistricts: ['สมเด็จเจ้าพระยา', 'คลองสาน', 'บางลำภูล่าง', 'คลองต้นไทร'] },
  { name: 'ตลิ่งชัน', zip: '10170', subdistricts: ['คลองชักพระ', 'ตลิ่งชัน', 'ฉิมพลี', 'บางพรม', 'บางระมาด', 'บางเชือกหนัง'] },
  { name: 'บางกอกน้อย', zip: '10700', subdistricts: ['ศิริราช', 'บ้านช่างหล่อ', 'บางขุนนนท์', 'บางขุนศรี', 'อรุณอมรินทร์'] },
  { name: 'บางขุนเทียน', zip: '10150', subdistricts: ['ท่าข้าม', 'แสมดำ'] },
  { name: 'ภาษีเจริญ', zip: '10160', subdistricts: ['บางหว้า', 'บางด้วน', 'บางจาก', 'บางแวก', 'คลองขวาง', 'ปากคลองภาษีเจริญ', 'คูหาสวรรค์'] },
  { name: 'หนองแขม', zip: '10160', subdistricts: ['หนองแขม', 'หนองค้างพลู'] },
  { name: 'ราษฎร์บูรณะ', zip: '10140', subdistricts: ['ราษฎร์บูรณะ', 'บางปะกอก'] },
  { name: 'บางพลัด', zip: '10700', subdistricts: ['บางพลัด', 'บางอ้อ', 'บางบำหรุ', 'บางยี่ขัน'] },
  { name: 'ดินแดง', zip: '10400', subdistricts: ['ดินแดง', 'รัชดาภิเษก'] },
  { name: 'บึงกุ่ม', zip: '10240', subdistricts: ['คลองกุ่ม', 'นวมินทร์', 'นวลจันทร์'] },
  { name: 'สาทร', zip: '10120', subdistricts: ['ทุ่งวัดดอน', 'ยานนาวา', 'ทุ่งมหาเมฆ'] },
  { name: 'บางซื่อ', zip: '10800', subdistricts: ['บางซื่อ', 'วงศ์สว่าง'] },
  { name: 'จตุจักร', zip: '10900', subdistricts: ['ลาดยาว', 'เสนานิคม', 'จันทรเกษม', 'จอมพล', 'จตุจักร'] },
  { name: 'บางคอแหลม', zip: '10120', subdistricts: ['บางคอแหลม', 'วัดพระยาไกร', 'บางโคล่'] },
  { name: 'ประเวศ', zip: '10250', subdistricts: ['ประเวศ', 'หนองบอน', 'ดอกไม้'] },
  { name: 'คลองเตย', zip: '10110', subdistricts: ['คลองเตย', 'คลองตัน', 'พระโขนง'] },
  { name: 'สวนหลวง', zip: '10250', subdistricts: ['สวนหลวง', 'อ่อนนุช', 'พัฒนาการ'] },
  { name: 'จอมทอง', zip: '10150', subdistricts: ['บางขุนเทียน', 'บางค้อ', 'บางมด', 'จอมทอง'] },
  { name: 'ดอนเมือง', zip: '10210', subdistricts: ['สีกัน', 'ดอนเมือง', 'สนามบิน'] },
  { name: 'ราชเทวี', zip: '10400', subdistricts: ['ทุ่งพญาไท', 'ถนนพญาไท', 'ถนนเพชรบุรี', 'มักกะสัน'] },
  { name: 'ลาดพร้าว', zip: '10230', subdistricts: ['ลาดพร้าว', 'จรเข้บัว'] },
  { name: 'วัฒนา', zip: '10110', subdistricts: ['คลองเตยเหนือ', 'คลองตันเหนือ', 'พระโขนงเหนือ'] },
  { name: 'บางแค', zip: '10160', subdistricts: ['บางแค', 'บางแคเหนือ', 'บางไผ่', 'หลักสอง'] },
  { name: 'หลักสี่', zip: '10210', subdistricts: ['ทุ่งสองห้อง', 'ตลาดบางเขน'] },
  { name: 'สายไหม', zip: '10220', subdistricts: ['สายไหม', 'ออเงิน', 'คลองถนน'] },
  { name: 'คันนายาว', zip: '10230', subdistricts: ['คันนายาว', 'รามอินทรา'] },
  { name: 'สะพานสูง', zip: '10240', subdistricts: ['สะพานสูง', 'ราษฎร์พัฒนา', 'ทับช้าง'] },
  { name: 'วังทองหลาง', zip: '10310', subdistricts: ['วังทองหลาง', 'สะพานสอง', 'คลองเจ้าคุณสิงห์', 'พลับพลา'] },
  { name: 'คลองสามวา', zip: '10510', subdistricts: ['สามวาตะวันตก', 'สามวาตะวันออก', 'บางชัน', 'ทรายกองดิน', 'ทรายกองดินใต้'] },
  { name: 'บางนา', zip: '10260', subdistricts: ['บางนาเหนือ', 'บางนาใต้'] },
  { name: 'ทวีวัฒนา', zip: '10170', subdistricts: ['ทวีวัฒนา', 'ศาลาธรรมสพน์'] },
  { name: 'ทุ่งครุ', zip: '10140', subdistricts: ['บางมด', 'ทุ่งครุ'] },
  { name: 'บางบอน', zip: '10150', subdistricts: ['บางบอนเหนือ', 'บางบอนใต้', 'คลองบางพราน', 'คลองบางบอน'] },
];

/* ค่าที่เก็บใน record เป็น "ชื่อไทย" ตรง ๆ ไม่ใช่ key ภาษาอังกฤษ — ให้ตรงกับ
   ทะเบียนศูนย์จริงจากสำนักอนามัย (CENTER_DIRECTORY) ที่เก็บชื่อเขตเป็นไทย */
const DISTRICT_OPTS = [
  { value: '', label: 'เขต/อำเภอ' },
  ...BKK_DISTRICTS.map((d) => ({ value: d.name, label: d.name })),
];

const DISTRICT_BY_NAME = BKK_DISTRICTS.reduce((acc, d) => { acc[d.name] = d; return acc; }, {});

/** ตัวเลือกแขวงของเขตที่เลือก — เขตยังไม่เลือก = ไม่มีตัวเลือก (ช่องถูก disabled) */
function subdistrictOptsFor(districtName) {
  const d = DISTRICT_BY_NAME[districtName];
  return [
    { value: '', label: 'แขวง/ตำบล' },
    ...((d?.subdistricts || []).map((x) => ({ value: x, label: x }))),
  ];
}

/** รวมทุกแขวงไว้ใช้ตอนแปลงค่า → ป้ายในหน้ารีวิว */
const SUBDISTRICT_OPTS = [
  { value: '', label: 'แขวง/ตำบล' },
  ...BKK_DISTRICTS.flatMap((d) => d.subdistricts.map((x) => ({ value: x, label: x }))),
];
const TIME_OPTS = TIME_OPTIONS;

/* ปุ่มเพิ่มแบบเส้นประในฟอร์มนี้ย่อจาก 56px เหลือ 48px + ตัวอักษรเล็กลง —
   ของเดิมสูงเท่าช่องกรอกทำให้แถบเส้นประเด่นกว่าเนื้อฟอร์ม (25 ส.ค. 2569) */
const DASHED_ADD_SM = {
  width: '100%',
  height: 'var(--dim-size-1000, 48px)',
  fontSize: 'var(--type-size-button-sm, 14px)',
};

const CARD = {
  background: 'var(--surface-card-100)',
  borderRadius: 'var(--dim-radius-500)',
  border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
  boxShadow: 'var(--shadow-card)',
  padding: 'var(--dim-space-600)',
};
/* Figma 3:9719 / 3:10212 — neutral/quaternary panels. */
const NEUTRAL_PANEL = {
  background: 'var(--surface-neutral-quaternary, #F9FBFB)',
  borderRadius: 'var(--dim-radius-400, 12px)',
  border: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary, #F4F5F5)',
  padding: 'var(--dim-space-600)',
  flex: '1 1 280px',
  minWidth: 0,
};

/* ความกว้างช่องกรอกใน step 1 — คงที่ 640 เท่าเดิม ส่วนคำอธิบายใต้ช่องปล่อยให้
   กว้างเต็มการ์ด จะได้อยู่บรรทัดเดียวไม่ถูกตัดขึ้นบรรทัดใหม่. */
const FIELD_W = 640;

/* คำนำหน้ารหัสสาขา (รหัสศูนย์แม่) — อ่านอย่างเดียว อยู่ในกล่องเดียวกับช่องกรอก */
const BRANCH_CODE_PREFIX = {
  color: 'var(--text-content-tertiary)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm)',
  lineHeight: 1.5,
  whiteSpace: 'nowrap',
};

/* ชื่อสาขาย่อยขึ้นต้นด้วยคำว่า "สาขา" เสมอ — ตรึงไว้เป็น prefix อ่านอย่างเดียว
   ผู้ใช้พิมพ์เฉพาะส่วนหลัง แบบเดียวกับรหัสสาขาที่ล็อกรหัสศูนย์แม่ไว้ข้างหน้า
   (26 ส.ค. 2569 มติผู้ใช้) เก็บลงข้อมูลเป็นชื่อเต็มเหมือนเดิม จึงไม่กระทบ
   ที่อื่นที่อ่าน branch.name อยู่แล้ว */
const BRANCH_NAME_PREFIX = 'สาขา';

const branchNameSuffixOf = (name) => {
  const v = String(name || '');
  return v.startsWith(BRANCH_NAME_PREFIX) ? v.slice(BRANCH_NAME_PREFIX.length) : v;
};

/* ล้างช่องว่าง = ชื่อว่าง ไม่ใช่เหลือคำว่า "สาขา" ลอย ๆ — ไม่งั้นการตรวจ
   "ต้องกรอก" จะผ่านทั้งที่ผู้ใช้ยังไม่ได้พิมพ์อะไร */
const branchNameFromSuffix = (suffix) => {
  const v = String(suffix || '');
  return v.trim() ? `${BRANCH_NAME_PREFIX}${v}` : '';
};

const FIELD_HINT = {
  color: 'var(--text-content-tertiary)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm)',
  lineHeight: 1.5,
};

/* ข้อความใต้ช่องตอนกรอกซ้ำ — ใช้สีเดียวกับ helper ตอน error ของ InputField */
const FIELD_ERROR = {
  ...FIELD_HINT,
  color: 'var(--text-input-errorHelper, var(--text-danger-secondary))',
};

const REVIEW_PANEL_TITLE = {
  color: 'var(--text-topic-tertiary-title)',
  fontFamily: 'var(--type-family-heading-graphic2)',
  fontSize: 'var(--type-size-sm)',
  fontWeight: 'var(--type-weight-regular)',
  lineHeight: 1.5,
};

/* Section topic header — MIH "Topic" pattern (icon + green title), identical to
   the assess pages' TopicHeader (Figma "Topic" 3:7802 / Step 1 node 3:598). */
const SectionHead = ({ icon, children }) => (
  <div className='flex items-start w-full' style={{ gap: 'var(--dim-space-200)' }}>
    <Icon name={icon} size={20} style={{ color: 'var(--text-brandPrimary-default)', flexShrink: 0 }} />
    <span style={{ color: 'var(--text-topic-primary-title, var(--text-brandPrimary-default))', fontFamily: 'var(--type-family-heading-graphic2)', fontSize: 'var(--type-size-base)', fontWeight: 'var(--type-weight-regular)', lineHeight: 1.5 }}>{children}</span>
  </div>
);

export const CENTER_FORM_STEPS = STEPS;

/* ══════════════════════════════════════════════════════════════════════
   useCenterForm — state ทั้งหมดของฟอร์มศูนย์บริการ
   ══════════════════════════════════════════════════════════════════════ */

export function useCenterForm({ existing = null, onSaved, branchOf = false, parentIdInit = '' } = {}) {
  const navigate = useHistory();
  /* ปิดฟอร์มแล้วไปไหน — หน้าเต็มกลับไปทะเบียนศูนย์ · popup แค่ปิดตัวเอง */
  const done = () => (onSaved ? onSaved() : navigate.push('/admin/centers'));
  const editing = existing;
  /* โหมด "ศูนย์บริการย่อย" — ต้องเลือกศูนย์แม่ก่อน ฟิลด์อื่นถึงจะโผล่
     (25 ส.ค. 2569) สาขาใช้รหัสหน่วยบริการเดียวกับศูนย์แม่ */
  const [parentId, setParentId] = useState(parentIdInit || '');
  const parentCenters = useMemo(() => readCenters().filter((c) => !c.draft && !c.parentId), []);
  const parentCenter = parentCenters.find((c) => c.id === parentId) || null;

  const [step, setStep] = useState('info');
  const idx = STEPS.findIndex((s) => s.key === step);
  const goNext = () => idx < STEPS.length - 1 && setStep(STEPS[idx + 1].key);
  const goPrev = () => idx > 0 && setStep(STEPS[idx - 1].key);

  /* hcode9 = รหัสหน่วยบริการ 9 หลักแบบใหม่ (GA0012460) — บังคับและเป็นรหัสหลัก
     hcode5 = รหัสเดิม 5 หลัก (12460) — ไม่บังคับ เติมให้อัตโนมัติจาก 9 หลัก */
  const [info, setInfo] = useState(() => ({
    hcode9: existing?.hcode9 || '',
    hcode5: existing?.hcode5 || '',
    /* สร้างใหม่ = เติมรหัสศูนย์ถัดไปให้เลย (ต่อจากรหัสสูงสุดในทะเบียน)
       ผู้ใช้แก้ทับได้ — ระบบตรวจซ้ำให้อยู่แล้ว (25 ส.ค. 2569) */
    code: existing?.code || nextCenterCode(readCenters()),
    name: existing?.name || '',
  }));
  const [hcode5Touched, setHcode5Touched] = useState(false);
  const [loc, setLoc] = useState(() => ({
    zip: '', province: BKK_PROVINCE, district: '', subdistrict: '', road: '', moo: '', no: '',
    lat: undefined, lng: undefined,
    ...(existing?.location || {}),
    /* จังหวัดล็อกเป็นกรุงเทพฯ เสมอ — record เก่าที่ไม่ได้บันทึกจังหวัดไว้จะได้
       ไม่ค้างเป็นค่าว่างจนผ่าน validation ไม่ได้ */
    province: BKK_PROVINCE,
    /* ศูนย์ที่บันทึกไว้แล้วถือว่าปักหมุดมาแล้ว ไม่ต้องบังคับปักซ้ำตอนแก้ไข */
    pinSaved: !!existing,
  }));
  const setI = (k) => (v) => setInfo((p) => ({ ...p, [k]: v }));
  const setL = (k) => (v) => setLoc((p) => ({ ...p, [k]: v }));
  /* เปลี่ยนเขต = ล้างแขวงที่เลือกไว้ (ไม่งั้นค้างเป็นแขวงของเขตเดิม) และเติม
     รหัสไปรษณีย์หลักของเขตนั้นให้ — ผู้ใช้แก้เองได้ถ้าเขตนั้นมีหลายรหัส */
  const handleDistrictChange = (v) => setLoc((p) => ({
    ...p,
    district: v,
    subdistrict: '',
    zip: DISTRICT_BY_NAME[v]?.zip || p.zip,
  }));
  const handleMapChange = (patch) => setLoc((p) => ({ ...p, ...patch }));
  const [phones, setPhones] = useState(() => (existing?.phones?.length ? existing.phones : ['']));
  const [emails, setEmails] = useState(() => (existing?.emails?.length ? existing.emails : ['']));
  const [contactDelete, setContactDelete] = useState(null);
  /* เวลาทำการแยก 3 กลุ่มวัน: จันทร์-ศุกร์ / เสาร์-อาทิตย์ / วันหยุดนักขัตฤกษ์ */
  const [hours, setHours] = useState(() => normalizeCenterHours(existing?.hours || DEFAULT_HOUR_GROUPS));
  const setGroupHours = (groupKey, patch) => setHours((p) => ({
    ...p,
    [groupKey]: { ...p[groupKey], ...patch },
  }));

  /* โครงสร้างภายในศูนย์ + ศูนย์อื่นที่ใช้รูปแบบเดียวกัน */
  const [units, setUnits] = useState(defaultStructure);
  const [appliedCenters, setAppliedCenters] = useState([]);
  /* รูปแบบโครงสร้างที่เคยสร้างไว้ (หน้า "รูปแบบโครงสร้างศูนย์") — เลือกมาใช้
     เป็นจุดตั้งต้นได้ แล้วปรับต่อในฟอร์มนี้โดยไม่กระทบตัวรูปแบบต้นทาง */
  const [structureTemplateId, setStructureTemplateId] = useState('');

  /* สาขาย่อย (ศบส.สาขา) — จุดให้บริการย่อยของศูนย์นี้ในพื้นที่ ใช้รหัสหน่วย
     บริการเดียวกับศูนย์แม่ แต่มีที่ตั้ง/เบอร์โทรของตัวเอง (25 ส.ค. 2569) */
  const [branches, setBranches] = useState(() => normalizeBranches(existing?.branches || []));
  const addBranch = () => setBranches((p) => [...p, createBranch()]);
  const updateBranch = (id, patch) => setBranches((p) => p.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  const removeBranch = (id) => setBranches((p) => p.filter((b) => b.id !== id));

  const handleRemovePhone = (i) => {
    if (phones[i]?.trim()) setContactDelete({ kind: 'phone', index: i });
    else setPhones((p) => p.filter((_, j) => j !== i));
  };
  const handleRemoveEmail = (i) => {
    if (emails[i]?.trim()) setContactDelete({ kind: 'email', index: i });
    else setEmails((p) => p.filter((_, j) => j !== i));
  };
  const confirmContactDelete = () => {
    if (!contactDelete) return;
    if (contactDelete.kind === 'phone') {
      setPhones((p) => p.filter((_, j) => j !== contactDelete.index));
    } else {
      setEmails((p) => p.filter((_, j) => j !== contactDelete.index));
    }
    setContactDelete(null);
  };

  /* ศูนย์ที่มีอยู่แล้วในทะเบียน — ใช้ทั้งรายการ "ดูรหัสที่มีอยู่" และตัวเลือก
     ศูนย์ที่จะใช้รูปแบบโครงสร้างเดียวกัน. อ่านครั้งเดียวตอน mount ก็พอ เพราะ
     ทะเบียนเปลี่ยนได้จากหน้าอื่นเท่านั้น ไม่ใช่จากในฟอร์มนี้. */
  const existingCenters = useMemo(
    () => readCenters().filter((c) => !c.draft && c.id !== editing?.id),
    [editing],
  );
  /* ตรวจซ้ำกับทะเบียนที่มีอยู่ (ไม่นับศูนย์ที่กำลังแก้ไข) —
     ไม่ซ้ำ = ติ๊กถูกท้ายช่อง · ซ้ำ = ขึ้น error ใต้ช่องและไปขั้นถัดไปไม่ได้ */
  const codeDupOwner = useMemo(() => {
    const v = info.code.trim();
    if (!v) return null;
    return existingCenters.find((c) => String(c.code || '').trim() === v) || null;
  }, [info.code, existingCenters]);
  const nameDupOwner = useMemo(() => {
    const v = info.name.trim();
    if (!v) return null;
    return existingCenters.find((c) => String(c.name || '').trim() === v) || null;
  }, [info.name, existingCenters]);

  const codeError = codeDupOwner
    ? `รหัสศูนย์นี้ถูกใช้แล้วโดย "${codeDupOwner.name || 'ศูนย์บริการอื่น'}"${codeDupOwner.hcode9 ? ` (${codeDupOwner.hcode9})` : ''}`
    : '';
  const nameError = nameDupOwner
    ? `ชื่อนี้ถูกใช้แล้ว${nameDupOwner.code ? ` โดยศูนย์รหัส ${nameDupOwner.code}` : ''}${nameDupOwner.hcode9 ? ` (${nameDupOwner.hcode9})` : ''}`
    : '';

  const codeUnique = !!info.code.trim() && !codeDupOwner;
  const nameUnique = !!info.name.trim() && !nameDupOwner;

  /* บังคับแค่รหัส 9 หลัก (+ ชื่อศูนย์) — รหัส 5 หลักและรหัสศูนย์ไม่บังคับ */
  const hcode9Error = info.hcode9 && !isValidHcode9(info.hcode9)
    ? 'รูปแบบไม่ถูกต้อง — ต้องเป็นตัวอักษร 2 ตัวตามด้วยตัวเลข 7 หลัก เช่น GA0012460'
    : '';
  /* ซ้ำแล้วไปต่อไม่ได้ — เดิมปล่อยผ่านจนถึงตอนกดบันทึกแล้วค่อยเด้ง alert */
  /* รหัสสาขา = รหัสศูนย์แม่ + "-" + เลขสาขา */
  const branchPrefix = branchOf && parentCenter ? String(parentCenter.code || '') : '';
  const branchSuffix = branchPrefix && String(info.code || '').startsWith(`${branchPrefix}-`)
    ? String(info.code).slice(branchPrefix.length + 1)
    : '';
  const infoValid = isValidHcode9(info.hcode9) && info.name.trim()
    && !codeDupOwner && !nameDupOwner
    /* สาขาย่อยต้องเลือกศูนย์แม่ และใส่เลขสาขาท้ายรหัสก่อนเสมอ */
    && (!branchOf || (!!parentId && !!branchSuffix));
  const locationValid = Boolean(loc.zip && loc.province && loc.district && loc.pinSaved);
  /* ช่องอีเมลไม่บังคับกรอก แต่ถ้ากรอกแล้วต้องถูกรูปแบบ ไม่งั้นไปขั้นถัดไปไม่ได้ */
  const contactValid = emails.every(isValidEmail);
  /* ทุกแผนกต้องมีชื่อ และทุกคลินิกในแผนกต้องมีชื่อ */
  const structureValid = units.length > 0 && units.every((u) => u.name.trim());
  const cancel = () => done();

  const setHcode9 = (raw) => {
    const next = normalizeHcode9(raw);
    setInfo((p) => ({
      ...p,
      hcode9: next,
      /* เดารหัสเดิม 5 หลักให้จนกว่าผู้ใช้จะพิมพ์ทับเอง */
      hcode5: hcode5Touched ? p.hcode5 : deriveHcode5(next),
    }));
  };

  /* รหัสศูนย์เป็นตัวเลขล้วน — กรองตัวอักษรทิ้งตั้งแต่ตอนพิมพ์ (25 ส.ค. 2569) */
  const setCode = (raw) => setInfo((p) => ({ ...p, code: String(raw || '').replace(/\D/g, '') }));

  /* รหัสสาขาย่อย = "<รหัสศูนย์หลัก>-<เลขสาขา>" — ส่วนหน้าล็อกไว้ตามศูนย์แม่
     ผู้ใช้พิมพ์แก้ได้เฉพาะเลขท้าย (25 ส.ค. 2569) */
  const setBranchSuffix = (raw) => {
    const digits = String(raw || '').replace(/\D/g, '');
    setInfo((p) => ({ ...p, code: `${branchPrefix}-${digits}` }));
  };

  /* เลือกศูนย์แม่ = คัดลอกรหัสหน่วยบริการ/ที่ตั้ง/เวลาทำการมาเป็นจุดตั้งต้น */
  const chooseParent = (id) => {
    setParentId(id);
    const p = parentCenters.find((c) => c.id === id);
    if (!p) return;
    const prefix = String(p.code || '');
    /* เลขสาขาถัดไปของศูนย์แม่นี้ */
    const used = readCenters()
      .map((c) => String(c.code || ''))
      .filter((c) => c.startsWith(`${prefix}-`))
      .map((c) => Number(c.slice(prefix.length + 1)))
      .filter((n) => Number.isFinite(n));
    const nextSuffix = used.length ? Math.max(...used) + 1 : 1;
    setInfo((prev) => ({
      ...prev,
      hcode9: p.hcode9 || '',
      hcode5: p.hcode5 || '',
      code: `${prefix}-${nextSuffix}`,
      name: prev.name || '',
    }));
    setLoc((prev) => ({ ...prev, ...(p.location || {}), province: BKK_PROVINCE, pinSaved: true }));
    setHours(normalizeCenterHours(p.hours || DEFAULT_HOUR_GROUPS));
  };

  /* เปิดจากปุ่ม "เพิ่มศูนย์บริการย่อย" ในแถวไหน = ศูนย์แถวนั้นเป็นศูนย์แม่ทันที */
  useEffect(() => {
    if (branchOf && parentIdInit) chooseParent(parentIdInit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setHcode5 = (raw) => {
    setHcode5Touched(true);
    setInfo((p) => ({ ...p, hcode5: normalizeHcode5(raw) }));
  };

  const persistCenter = (draft) => {
    const all = readCenters();
    if (!draft && isDuplicateHcode9(all, info.hcode9, editing?.id)) {
      window.alert('รหัสหน่วยบริการ 9 หลักนี้มีอยู่แล้ว กรุณาตรวจสอบที่ hcode.moph.go.th');
      return false;
    }
    if (!draft && info.code.trim() && isDuplicateCenterCode(all, info.code, editing?.id)) {
      window.alert('รหัสศูนย์ซ้ำกับที่มีอยู่ กรุณาเปลี่ยนรหัสศูนย์ใหม่');
      return false;
    }
    /* โหมดแก้ไข = ทับ record เดิม (คง id/active/draft เดิมไว้)
       โหมดสร้าง = ต่อท้ายทะเบียน */
    const center = createCenter({
      hcode9: info.hcode9,
      hcode5: info.hcode5,
      code: info.code,
      name: info.name,
      location: loc,
      phones,
      emails,
      /* ฟอร์มไม่มีช่องเว็บไซต์ — โหมดแก้ไขต้องคงค่าเดิมไว้ ไม่งั้นกดบันทึกทีเดียว
         เว็บไซต์ที่มีอยู่จะหายกลายเป็น "—" */
      website: editing?.website || '',
      hours,
      branches,
      draft,
    });
    /* สาขาย่อยอ้างศูนย์แม่ไว้ด้วย เพื่อไม่ให้ไปโผล่เป็นตัวเลือก "ศูนย์แม่" เอง */
    if (branchOf && parentId) center.parentId = parentId;
    if (editing) {
      /* กระจาย editing ก่อน เพื่อคงฟิลด์ที่ฟอร์มไม่ได้แตะไว้ครบ */
      const merged = { ...editing, ...center, id: editing.id, active: editing.active, draft };
      /* สาขาย่อยชุดตั้งต้นมีแต่รายการใน parent.branches ยังไม่มี record ของตัวเอง
         — แก้ครั้งแรกจึงต้อง "สร้าง" record ให้ ไม่ใช่ map หาแล้วไม่เจอเงียบ ๆ
         (26 ส.ค. 2569) */
      const exists = all.some((c) => c.id === editing.id);
      let next = exists
        ? all.map((c) => (c.id === editing.id ? merged : c))
        : [...all, merged];
      /* ชื่อ/ที่อยู่/เบอร์ ที่ศูนย์แม่ถืออยู่ต้องเดินตามด้วย ไม่งั้นทะเบียนโชว์
         ชื่อสาขาเก่าทั้งที่แก้ไปแล้ว */
      const linkParentId = merged.parentId || editing.parentId || '';
      const linkBranchId = editing.branchId || editing.id;
      if (linkParentId) {
        next = next.map((c) => (c.id === linkParentId
          ? {
            ...c,
            branches: (c.branches || []).map((b) => (b.id === linkBranchId
              ? {
                ...b,
                name: merged.name,
                address: formatCenterAddress(merged.location),
                phone: merged.phones?.[0] || '',
              }
              : b)),
          }
          : c));
      }
      writeCenters(next);
    } else if (branchOf && parentId) {
      /* บันทึกเป็นศูนย์ใหม่ + ผูกชื่อสาขาไว้ที่ศูนย์แม่ให้ทะเบียนแสดงได้ทันที */
      writeCenters([...all.map((c) => (c.id === parentId
        ? {
          ...c,
          branches: [...(c.branches || []), createBranch({
            name: center.name,
            address: formatCenterAddress(center.location),
            phone: center.phones?.[0] || '',
          })],
        }
        : c)), center]);
    } else {
      writeCenters([...all, center]);
    }

    /* โครงสร้างเก็บเป็น "รูปแบบ" แยก แล้วผูกกับศูนย์ที่กำลังสร้าง +
       ศูนย์อื่นที่ผู้ใช้เลือกให้ใช้รูปแบบเดียวกัน

       โหมดแก้ไข: ทับรูปแบบเดิมที่ผูกกับศูนย์นี้อยู่แล้ว ไม่งั้นกดบันทึกซ้ำ ๆ
       จะได้รูปแบบซ้ำเพิ่มขึ้นเรื่อย ๆ ในเมนู "รูปแบบโครงสร้างศูนย์" */
    const structures = readStructures();
    const linkKeys = [editing?.hcode9, editing?.code, info.hcode9].filter(Boolean);
    const existingTemplate = editing
      ? structures.find((t) => (t.appliedCenters || []).some((k) => linkKeys.includes(k)))
      : null;
    const nextTemplate = createStructureTemplate({
      name: existingTemplate?.name || `โครงสร้าง ${info.name || info.hcode9}`,
      units,
      appliedCenters: Array.from(new Set([...(appliedCenters || []), info.hcode9].filter(Boolean))),
      draft,
    });
    writeStructures(existingTemplate
      ? structures.map((t) => (t.id === existingTemplate.id
        ? { ...nextTemplate, id: existingTemplate.id }
        : t))
      : [...structures, nextTemplate]);
    return true;
  };

  const handleSaveDraft = () => {
    if (!info.hcode9.trim() && !info.name.trim()) {
      window.alert('กรุณาระบุรหัสหน่วยบริการ 9 หลัก หรือชื่อศูนย์บริการก่อนบันทึกร่าง');
      return;
    }
    if (persistCenter(true)) done();
  };

  const handleCreate = () => {
    if (!infoValid || !structureValid) return;
    if (!persistCenter(false)) return;
    /* หน้าเต็ม (ไม่มี onSaved) = โชว์หน้าสำเร็จ · popup (ส่ง onSaved มา) =
       ปิดตัวเองแล้วให้ผู้เรียกรีเฟรชตาราง + ขึ้น toast เอง ทั้งเพิ่มและแก้ไข */
    if (editing || onSaved) done(); else setSubmitted(true);
  };


  /* รูปแบบโครงสร้างที่บันทึกไว้จากหน้า "รูปแบบโครงสร้างศูนย์" */
  /* เก็บใน state เพราะผู้ใช้สร้างรูปแบบใหม่ได้จากใน step 5 (25 ส.ค. 2569) */
  const [savedStructures, setSavedStructures] = useState(() => readStructures());

  /* popup "ที่มีอยู่แล้ว" ใช้ตัวเดียวสองโหมด — 'code' (รหัสศูนย์) กับ
     'name' (ชื่อสำนักงานอนามัย) · null = ปิด */
  const [codeListMode, setCodeListMode] = useState(null);
  const showCodeList = !!codeListMode;
  const setShowCodeList = (v) => setCodeListMode(v ? (typeof v === 'string' ? v : 'code') : null);

  /* ตัวศูนย์ที่กำลังสร้างถูกผูกรูปแบบให้อยู่แล้ว จึงไม่ต้องอยู่ในตัวเลือก */
  const otherCenterOptions = useMemo(
    () => existingCenters.map((c) => ({
      value: c.hcode9 || c.code,
      label: `${c.name || 'ศูนย์บริการ'}${c.hcode9 ? ` (${c.hcode9})` : ''}`,
    })),
    [existingCenters],
  );

  /* success screen (Figma 5:14778) — Check Mark Lottie + confirmation. */
  const [submitted, setSubmitted] = useState(false);
  const mapValue = { lat: loc.lat, lng: loc.lng, pinSaved: loc.pinSaved };

  const footerPrimary = step === 'review'
    ? {
      label: 'สร้างศูนย์บริการนี้',
      icon: 'check',
      disabled: !infoValid,
      onClick: handleCreate,
    }
    : {
      label: `ถัดไป: ${STEPS[idx + 1].label}`,
      icon: 'arrow_forward',
      disabled: (step === 'info' && !infoValid)
        || (step === 'location' && !locationValid)
        || (step === 'contact' && !contactValid)
        || (step === 'structure' && !structureValid),
      onClick: goNext,
    };

  return {
    step, setStep, idx, goNext, goPrev, STEPS, footerPrimary,
    info, setI, setHcode9, setHcode5, setCode, hcode9Error,
    branchOf, parentId, chooseParent, parentCenters, parentCenter,
    branchPrefix, branchSuffix, setBranchSuffix,
    loc, setL, handleDistrictChange, mapValue, handleMapChange,
    phones, setPhones, handleRemovePhone,
    emails, setEmails, handleRemoveEmail,
    contactDelete, setContactDelete, confirmContactDelete,
    hours, setGroupHours,
    units, setUnits, appliedCenters, setAppliedCenters,
    branches, addBranch, updateBranch, removeBranch,
    structureTemplateId, setStructureTemplateId,
    savedStructures, otherCenterOptions,
    existingCenters, showCodeList, setShowCodeList, codeListMode,
    codeUnique, nameUnique, codeError, nameError,
    infoValid, locationValid, contactValid, structureValid,
    persistCenter, handleSaveDraft, handleCreate, cancel,
    submitted, setSubmitted,
    isEdit: !!existing,
  };
}

/* ══════════════════════════════════════════════════════════════════════
   CenterFormBody — เนื้อของ step ปัจจุบัน (ไม่มีเปลือกหน้า/ป๊อปอัป)
   ══════════════════════════════════════════════════════════════════════ */

export function CenterFormBody({ form }) {
  const {
    step, info, setI, setHcode9, setHcode5, setCode, hcode9Error,
    branchOf, parentId, chooseParent, parentCenters, parentCenter,
    branchPrefix, branchSuffix, setBranchSuffix,
    existingCenters, setShowCodeList, codeUnique, nameUnique, codeError, nameError,
    loc, setL, handleDistrictChange, mapValue, handleMapChange,
    phones, setPhones, handleRemovePhone,
    emails, setEmails, handleRemoveEmail,
    hours, setGroupHours,
    savedStructures, structureTemplateId, setStructureTemplateId,
    units, setUnits, appliedCenters, setAppliedCenters, otherCenterOptions,
    branches, addBranch, updateBranch, removeBranch,
  } = form;

  return (
    <>
          {/* STEP 1 — center info (Figma 3:598) */}
          {step === 'info' && (
            <div className='flex flex-col' style={{ gap: 'var(--dim-space-300)' }}>
              <SectionHead icon='domain'>
                {branchOf ? 'ข้อมูลศูนย์บริการย่อย' : 'ข้อมูลศูนย์บริการ'}
              </SectionHead>
              {branchOf ? (
                <div className='flex flex-col' style={{ gap: 'var(--dim-space-150)', maxWidth: FIELD_W }}>
                  <Select
                    label='ศูนย์บริการหลัก'
                    required
                    searchable
                    showHelperText={false}
                    placeholder='เลือกศูนย์บริการหลัก'
                    options={parentCenters.map((c) => ({
                      value: c.id,
                      label: c.name || 'ศูนย์บริการ',
                      subtext: c.hcode9 || '',
                    }))}
                    value={parentId}
                    onChange={chooseParent}
                  />
                  {/* บอกทางออกไว้ในบรรทัดเดียวกัน — ผู้ใช้ที่ยังไม่มีศูนย์แม่ในทะเบียน
                      จะได้ไม่ค้างอยู่หน้านี้โดยไม่รู้ว่าต้องไปทำอะไรก่อน (26 ส.ค. 2569) */}
                  <span style={FIELD_HINT}>
                    เลือกศูนย์หลักของศูนย์บริการย่อย หากไม่มีที่ต้องการให้ปิดหน้าต่างและ &quot;เพิ่มศูนย์บริการหลัก&quot; ก่อน
                  </span>
                </div>
              ) : null}
              {/* สาขาย่อยที่เลือกศูนย์แม่แล้ว — ข้อมูลที่สืบทอดจากศูนย์แม่แสดงเป็น
                  ข้อความอ่านอย่างเดียว เหลือกรอกแค่รหัสและชื่อของสาขา
                  (25 ส.ค. 2569) */}
              {branchOf && parentCenter ? (
                <div className='flex flex-col' style={{ gap: 'var(--dim-space-500)' }}>
                  {/* แถวเดียวไม่ตัดบรรทัด — ที่อยู่เป็นช่องเดียวที่ยืด/หดและขึ้น
                      บรรทัดใหม่ในตัวเอง หัวข้ออีก 5 อันจึงเรียงอยู่แถวบนเสมอ
                      (26 ส.ค. 2569 มติผู้ใช้) กว้างไม่พอเมื่อไหร่ก็เลื่อนแนวนอนแทน */}
                  <div
                    className='flex flex-nowrap items-start w-full'
                    style={{
                      gap: 'var(--dim-space-500)',
                      padding: 'var(--dim-space-400)',
                      background: 'var(--surface-brandPrimary-quaternary)',
                      borderRadius: 'var(--dim-radius-400, 12px)',
                      overflowX: 'auto',
                    }}
                  >
                    <BranchInfoItem label='รหัสศูนย์หลัก' value={parentCenter.code} />
                    <BranchInfoItem label='รหัสหน่วยบริการ (9 หลัก)' value={parentCenter.hcode9} />
                    <BranchInfoItem label='รหัสหน่วยบริการเดิม (5 หลัก)' value={parentCenter.hcode5} />
                    <BranchInfoItem label='ศูนย์บริการหลัก' value={parentCenter.name} />
                    <BranchInfoItem label='ที่ตั้งศูนย์แม่' value={formatCenterAddress(parentCenter.location)} grow />
                    <BranchInfoItem
                      label='เวลาทำการ (จันทร์–ศุกร์)'
                      value={formatCenterHoursLine(parentCenter.hours, 'in', 'weekday')}
                    />
                  </div>

                  <div className='flex flex-col' style={{ gap: 'var(--dim-space-150)', maxWidth: FIELD_W }}>
                    <InputField
                      label='รหัสศูนย์ย่อย'
                      required
                      value={branchSuffix}
                      onChange={setBranchSuffix}
                      placeholder='1'
                      leading={<span style={BRANCH_CODE_PREFIX}>{`${branchPrefix}-`}</span>}
                      error={codeError || undefined}
                      showHelperText={false}
                      trailing={codeUnique ? <UniqueTick label='รหัสนี้ยังไม่ถูกใช้' /> : undefined}
                    />
                    <span style={codeError ? FIELD_ERROR : FIELD_HINT}>
                      {codeError || 'รหัสของสาขาย่อย ต้องไม่ซ้ำกับที่มีอยู่แล้ว'}
                    </span>
                  </div>

                  <div className='flex flex-col' style={{ gap: 'var(--dim-space-150)', maxWidth: FIELD_W }}>
                    <InputField
                      label='ชื่อสาขาย่อย'
                      required
                      value={branchNameSuffixOf(info.name)}
                      onChange={(v) => setI('name')(branchNameFromSuffix(v))}
                      leading={<span style={BRANCH_CODE_PREFIX}>{BRANCH_NAME_PREFIX}</span>}
                      placeholder='ชุมชนวัดปากน้ำฝั่งเหนือ'
                      error={nameError || undefined}
                      showHelperText={false}
                      trailing={nameUnique ? <UniqueTick label='ชื่อนี้ยังไม่ถูกใช้' /> : undefined}
                    />
                    <span style={nameError ? FIELD_ERROR : FIELD_HINT}>
                      {nameError || 'ชื่อต้องไม่ซ้ำกับที่มีอยู่แล้ว'}
                    </span>
                  </div>
                </div>
              ) : null}

              {/* ศูนย์หลักใช้ฟอร์มเต็มตามเดิม */}
              {!branchOf ? (
              <div className='flex flex-col' style={{ gap: 'var(--dim-space-600)' }}>
                {/* รหัสหน่วยบริการ 9 หลัก มาก่อนทุกฟิลด์ — เป็นรหัสหลักของศูนย์ */}
                <div className='flex flex-col' style={{ gap: 'var(--dim-space-150)' }}>
                  <div style={{ maxWidth: FIELD_W }}>
                    <InputField
                      label='รหัสหน่วยบริการ (9 หลัก)'
                      required
                      value={info.hcode9}
                      onChange={setHcode9}
                      error={hcode9Error}
                      placeholder='เช่น GA0012460'
                      inputStyle={{ textTransform: 'uppercase' }}
                    />
                  </div>
                  <span style={FIELD_HINT}>
                    รหัสหน่วยบริการแบบใหม่ของกระทรวงสาธารณสุข (ตัวอักษร 2 ตัว + ตัวเลข 7 หลัก) ค้นรหัสได้ที่{' '}
                    <a
                      href={HCODE_LOOKUP_URL}
                      target='_blank'
                      rel='noreferrer'
                      style={{ color: 'var(--text-brandPrimary-default)', textDecoration: 'underline' }}
                    >
                      hcode.moph.go.th
                    </a>
                  </span>
                </div>

                <div className='flex flex-col' style={{ gap: 'var(--dim-space-150)' }}>
                  <div style={{ maxWidth: FIELD_W }}>
                    <InputField
                      label='รหัสหน่วยบริการเดิม (5 หลัก)'
                      value={info.hcode5}
                      onChange={setHcode5}
                      placeholder='เช่น 12460'
                    />
                  </div>
                  <span style={FIELD_HINT}>
                    เติมให้อัตโนมัติจากรหัส 9 หลัก ใช้อ้างอิงกับระบบและรายงานเดิมที่ยังใช้รหัส 5 หลัก
                  </span>
                </div>

                <div className='flex flex-col' style={{ gap: 'var(--dim-space-150)' }}>
                  <div className='flex items-end' style={{ maxWidth: FIELD_W, gap: 'var(--dim-space-300)' }}>
                    <div className='flex-1 min-w-0'>
                      <InputField
                        label='รหัสศูนย์'
                        value={info.code}
                        onChange={setCode}
                        placeholder='เช่น 4'
                        inputMode='numeric'
                        error={codeError || undefined}
                        showHelperText={false}
                        trailing={codeUnique ? <UniqueTick label='รหัสศูนย์นี้ยังไม่ถูกใช้' /> : undefined}
                      />
                    </div>
                    {/* กันกรอกซ้ำ — เปิดดูรหัสที่ใช้ไปแล้วได้โดยไม่ต้องออกจากฟอร์ม */}
                    <NeutralSubdueButton
                      leadingIcon='list'
                      size='md'
                      onClick={() => setShowCodeList(true)}
                    >
                      {`ดูรหัสที่มีอยู่ (${existingCenters.length})`}
                    </NeutralSubdueButton>
                  </div>
                  <span style={codeError ? FIELD_ERROR : FIELD_HINT}>
                    {codeError || 'รหัสศูนย์ต้องไม่ซ้ำกับที่มีอยู่แล้ว'}
                  </span>
                </div>

                <div className='flex flex-col' style={{ gap: 'var(--dim-space-150)' }}>
                  <div className='flex items-end' style={{ maxWidth: FIELD_W, gap: 'var(--dim-space-300)' }}>
                    <div className='flex-1 min-w-0'>
                      <InputField
                        label='ชื่อสำนักงานอนามัย'
                        required
                        value={info.name}
                        onChange={setI('name')}
                        placeholder='ศูนย์ดินแดง'
                        error={nameError || undefined}
                        showHelperText={false}
                        trailing={nameUnique ? <UniqueTick label='ชื่อนี้ยังไม่ถูกใช้' /> : undefined}
                      />
                    </div>
                    {/* กันตั้งชื่อซ้ำ — เปิดดูชื่อที่ใช้ไปแล้วได้จากในฟอร์มเลย */}
                    <NeutralSubdueButton
                      leadingIcon='list'
                      size='md'
                      onClick={() => setShowCodeList('name')}
                    >
                      {`ดูชื่อที่มีอยู่ (${existingCenters.length})`}
                    </NeutralSubdueButton>
                  </div>
                  <span style={nameError ? FIELD_ERROR : FIELD_HINT}>
                    {nameError || 'ชื่อต้องไม่ซ้ำกับที่มีอยู่แล้ว'}
                  </span>
                </div>
              </div>
              ) : null}
            </div>
          )}

          {/* STEP 2 — location */}
          {step === 'location' && (
            <div className='flex flex-col' style={{ gap: 'var(--dim-space-400)' }}>
              <SectionHead icon='location_on'>ที่ตั้งศูนย์บริการ</SectionHead>
              <div className='flex flex-wrap' style={{ gap: 'var(--dim-space-400)' }}>
                <div style={{ flex: '1 1 200px', minWidth: 180 }}><Select label='รหัสไปรษณีย์' required options={BKK_ZIP_OPTS} value={loc.zip} onChange={setL('zip')} /></div>
                {/* ล็อกเป็นกรุงเทพมหานครเสมอ — แสดงค่าไว้ให้เห็นแต่แก้ไม่ได้ */}
                <div style={{ flex: '1 1 200px', minWidth: 180 }}><Select label='จังหวัด' required disabled options={PROVINCE_OPTS} value={BKK_PROVINCE} onChange={() => {}} /></div>
                <div style={{ flex: '1 1 200px', minWidth: 180 }}><Select label='เขต/อำเภอ' required options={DISTRICT_OPTS} value={loc.district} onChange={handleDistrictChange} /></div>
                {/* ปิดไว้ก่อนจนกว่าจะเลือกเขต — แขวงขึ้นกับเขตที่เลือกเท่านั้น */}
                <div style={{ flex: '1 1 200px', minWidth: 180 }}>
                  <Select
                    label='แขวง/ตำบล'
                    disabled={!loc.district}
                    options={subdistrictOptsFor(loc.district)}
                    value={loc.subdistrict}
                    onChange={setL('subdistrict')}
                  />
                </div>
              </div>
              <div className='flex flex-wrap' style={{ gap: 'var(--dim-space-400)' }}>
                <div style={{ flex: '1 1 200px', minWidth: 180 }}><InputField label='ถนน' value={loc.road} onChange={setL('road')} placeholder='ถนน' /></div>
                <div style={{ flex: '1 1 200px', minWidth: 180 }}><InputField label='หมู่/ซอย' value={loc.moo} onChange={setL('moo')} placeholder='หมู่/ซอย' /></div>
                <div style={{ flex: '1 1 200px', minWidth: 180 }}><InputField label='เลขที่' value={loc.no} onChange={setL('no')} placeholder='เลขที่บ้าน' /></div>
                <div aria-hidden style={{ flex: '1 1 200px', minWidth: 180 }} />
              </div>
              {/* กว้างครึ่งเดียว แต่ยังชิดขอบซ้ายเดียวกับแถวฟิลด์ และขอบขวาลง
                  พอดีกับคอลัมน์ที่ 2 (จังหวัด / หมู่-ซอย):
                  แถวเป็น 4 คอลัมน์เท่ากัน กว้างคอลัมน์ละ (W-3g)/4 → สองคอลัมน์
                  บวกช่องไฟหนึ่งช่อง = W/2 − g/2 จึงหักครึ่งช่องไฟออกจาก 50%.
                  minWidth กันไม่ให้แผนที่แคบเกินอ่านตอนจอแคบ (ตอนนั้นฟิลด์
                  wrap เป็นคอลัมน์เดียวอยู่แล้ว) */}
              <div
                style={{
                  width: '100%',
                  maxWidth: 'calc(50% - (var(--dim-space-400, 16px) / 2))',
                  minWidth: 320,
                  /* เว้นบนเพิ่มอีก 24px จาก gap ปกติของ step (16px) ให้แผนที่
                     แยกตัวออกจากแถวช่องกรอกที่อยู่ชัดเจน */
                  marginTop: 'var(--dim-space-600, 24px)',
                }}
              >
                <MapPinBlock
                  value={mapValue}
                  onChange={handleMapChange}
                />
              </div>
            </div>
          )}

          {/* STEP 3 — contact (Figma 3:9719) */}
          {step === 'contact' && (
            <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-600)' }}>
              <Topic
                hierarchy='primary'
                title='ข้อมูลการติดต่อ'
                showLeadingIcon={false}
                showSubText={false}
                showBadge={false}
                showChevron={false}
                showSuccess={false}
              />
              <div className='flex flex-wrap items-stretch w-full' style={{ gap: 'var(--dim-space-600)' }}>
                <ContactFieldPanel
                  title='เบอร์โทรศัพท์'
                  values={phones}
                  placeholder='081-234-5678'
                  addLabel='เพิ่มเบอร์โทร'
                  onChangeAt={(i, nv) => setPhones((p) => p.map((x, j) => (j === i ? nv : x)))}
                  onAdd={() => setPhones((p) => [...p, ''])}
                  onRemove={handleRemovePhone}
                />
                <ContactFieldPanel
                  title='อีเมล'
                  values={emails}
                  placeholder='somchai.m@email.com'
                  addLabel='เพิ่มอีเมล'
                  onChangeAt={(i, nv) => setEmails((p) => p.map((x, j) => (j === i ? nv : x)))}
                  onAdd={() => setEmails((p) => [...p, ''])}
                  onRemove={handleRemoveEmail}
                  errorFor={(v) => (isValidEmail(v) ? '' : EMAIL_FORMAT_ERROR)}
                />
              </div>
            </div>
          )}

          {/* STEP 4 — hours (Figma 3:10212) */}
          {step === 'hours' && (
            <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-600)' }}>
              <Topic
                hierarchy='primary'
                title='เวลาทำการ'
                leadingIcon='schedule'
                showSubText={false}
                showBadge={false}
                showChevron={false}
                showSuccess={false}
              />
              {/* แยกตามกลุ่มวัน: จันทร์-ศุกร์ · เสาร์-อาทิตย์
                  กลุ่มไหนปิดทำการก็ปิดสวิตช์ทิ้งไว้ ไม่ต้องกรอกเวลา

                  "วันหยุดนักขัตฤกษ์" ถูกถอดออกจาก step นี้ 25 ส.ค. 2569 —
                  ย้ายไปคุมที่เมนู "วันหยุดประจำปี" ของจัดการระบบ ซึ่งเป็น
                  ทะเบียนกลางตามประกาศสำนักนายกฯ ใช้ร่วมกันทุกศูนย์
                  (ตั้งทีละศูนย์แล้วประกาศเปลี่ยนต้องไล่แก้ 69 ที่) */}
              <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-500)' }}>
                {HOUR_GROUPS.filter((g) => g.key !== 'holiday').map((g) => (
                  <DayGroupHoursPanel
                    key={g.key}
                    group={g}
                    value={hours[g.key] || {}}
                    onChange={(patch) => setGroupHours(g.key, patch)}
                  />
                ))}
                <span style={FIELD_HINT}>
                  วันหยุดนักขัตฤกษ์ปิดทำการตามประกาศวันหยุดราชการ —
                  แก้ไขได้ที่เมนู “วันหยุดประจำปี” ของจัดการระบบ ใช้ร่วมกันทุกศูนย์
                </span>
              </div>
            </div>
          )}

          {/* STEP 5 — แผนก → คลินิก → ห้อง/เตียง */}
          {step === 'structure' && (
            <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-500)' }}>
              {/* ปุ่ม "สร้างรูปแบบใหม่" ถูกถอดออก 25 ส.ค. 2569 — สร้างรูปแบบ
                  ทำที่เมนู "รูปแบบโครงสร้างศูนย์" ที่เดียว ตรงนี้เลือกอย่างเดียว */}
              <StructureTemplatePicker
                templates={savedStructures}
                value={structureTemplateId}
                onChange={(tplId) => {
                  setStructureTemplateId(tplId);
                  const tpl = savedStructures.find((t) => t.id === tplId);
                  /* คัดลอกมาเป็น id ใหม่ทั้งชุด แก้ในฟอร์มนี้แล้วรูปแบบต้นทางไม่เปลี่ยน */
                  setUnits(tpl ? instantiateUnits(tpl.units) : defaultStructure());
                }}
              />

              {/* เลือกรูปแบบที่บันทึกไว้ = โชว์รายละเอียดให้ตรวจ (อ่านอย่างเดียว)
                  เลือก "เริ่มจากโครงสร้างตั้งต้น" = กรอกเองด้วยฟอร์มชุดเดียวกับ
                  หน้าสร้างรูปแบบ (25 ส.ค. 2569) */}
              {structureTemplateId === STRUCTURE_FROM_SCRATCH ? (
                <StructureUnitsEditor units={units} onUnitsChange={setUnits} />
              ) : null}
              {structureTemplateId && structureTemplateId !== STRUCTURE_FROM_SCRATCH ? (
                <StructureReview
                  showName={false}
                  name=''
                  units={units}
                  counts={countStructure(units)}
                />
              ) : null}


              {/* ส่วน "สาขาย่อย" ถูกถอดออกจาก step 5 (25 ส.ค. 2569) — เพิ่มสาขาย่อย
                  ทำจากปุ่ม "เพิ่มศูนย์บริการ → เพิ่มศูนย์บริการย่อย" ในทะเบียนศูนย์ */}
            </div>
          )}

          {/* STEP 5 — review (Figma 3:13253) */}
          {step === 'review' && (
            <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-600)' }}>
              <ReviewSection title='ข้อมูลศูนย์บริการ'>
                <ReviewInfoRow
                  fields={[
                    { key: 'hcode9', label: 'รหัสหน่วยบริการ (9 หลัก)', value: info.hcode9 },
                    { key: 'hcode5', label: 'รหัสเดิม (5 หลัก)', value: info.hcode5 },
                    { key: 'code', label: 'รหัสศูนย์', value: info.code },
                    { key: 'name', label: 'ชื่อศูนย์บริการ', value: info.name },
                  ]}
                />
              </ReviewSection>

              <ReviewDivider />

              <ReviewSection title='ที่ตั้งศูนย์บริการ'>
                <ReviewInfoRow
                  fields={[
                    { key: 'zip', label: 'รหัสไปรษณีย์', value: loc.zip },
                    { key: 'province', label: 'จังหวัด', value: label(PROVINCE_OPTS, loc.province) },
                    { key: 'district', label: 'เขต/อำเภอ', value: label(DISTRICT_OPTS, loc.district) },
                    { key: 'subdistrict', label: 'แขวง/ตำบล', value: label(SUBDISTRICT_OPTS, loc.subdistrict) },
                  ]}
                />
                <ReviewInfoRow
                  fields={[
                    { key: 'road', label: 'ถนน', value: loc.road },
                    { key: 'moo', label: 'หมู่/ซอย', value: loc.moo },
                    { key: 'no', label: 'เลขที่', value: loc.no },
                  ]}
                />
                <MapPinBlock value={mapValue} readOnly compact />
              </ReviewSection>

              <ReviewDivider />

              <ReviewSection title='ข้อมูลการติดต่อ'>
                <div className='w-full' style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 'var(--dim-space-600)', alignItems: 'stretch' }}>
                  <ReviewSummaryPanel
                    title='เบอร์โทรศัพท์'
                    label='เบอร์โทรศัพท์'
                    value={phones.filter(Boolean).join(', ')}
                  />
                  <ReviewSummaryPanel
                    title='อีเมล'
                    label='อีเมล'
                    value={emails.filter(Boolean).join(', ')}
                  />
                  <ReviewSummaryPanel
                    title='เว็บไซต์'
                    label='เว็บไซต์'
                    value=''
                  />
                </div>
              </ReviewSection>

              <ReviewDivider />

              <ReviewSection title='เวลาทำการ'>
                <div className='w-full' style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 'var(--dim-space-600)', alignItems: 'stretch' }}>
                  {HOUR_GROUPS.map((g) => (
                    <div key={g.key} className='flex flex-col' style={{ ...NEUTRAL_PANEL, gap: 'var(--dim-space-300)' }}>
                      <span style={REVIEW_PANEL_TITLE}>{g.label}</span>
                      <Information
                        subText='ในเวลาราชการ'
                        text={formatCenterHoursLine(hours, 'in', g.key)}
                        showBadge={false}
                        showBadge2={false}
                        maxWidth='none'
                        style={{ width: '100%' }}
                      />
                      <Information
                        subText='นอกเวลาราชการ'
                        text={formatCenterHoursLine(hours, 'out', g.key)}
                        showBadge={false}
                        showBadge2={false}
                        maxWidth='none'
                        style={{ width: '100%' }}
                      />
                    </div>
                  ))}
                </div>
              </ReviewSection>

              <ReviewDivider />

              <ReviewSection title='แผนกและคลินิก'>
                <ReviewInfoRow
                  fields={[
                    { key: 'summary', label: 'โครงสร้างทั้งหมด', value: summarizeStructure(units) },
                    {
                      key: 'applied',
                      label: 'ศูนย์ที่ใช้รูปแบบนี้',
                      value: appliedCenters.length ? `อีก ${appliedCenters.length} ศูนย์` : 'เฉพาะศูนย์นี้',
                    },
                  ]}
                />
                {/* สาขาย่อยขึ้นก่อน — เป็นระดับ "สถานที่" ที่ครอบแผนก/คลินิก */}
                {branches.length ? (
                  <div className='flex flex-col w-full' style={{ ...NEUTRAL_PANEL, flex: 'none', gap: 'var(--dim-space-200)' }}>
                    <span style={REVIEW_PANEL_TITLE}>{`สาขาย่อย ${branches.length} แห่ง`}</span>
                    {branches.map((b) => (
                      <Information
                        key={b.id}
                        subText={[b.address, b.phone].filter(Boolean).join(' · ') || 'ยังไม่ระบุที่ตั้ง'}
                        text={b.name}
                        showBadge={false}
                        showBadge2={false}
                        maxWidth='none'
                        style={{ width: '100%' }}
                      />
                    ))}
                  </div>
                ) : null}

                {/* แผนกกับคลินิกอยู่ระดับเดียวกัน จึงเรียงเป็นรายการเดียว
                    ไม่ใช่คลินิกซ้อนอยู่ใต้แผนก */}
                <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
                  {units.map((u) => {
                    const rooms = u.nodes.filter((n) => n.kind !== 'bed').length;
                    const beds = u.nodes.length - rooms;
                    return (
                      <div key={u.id} className='flex flex-col' style={{ ...NEUTRAL_PANEL, flex: 'none', gap: 'var(--dim-space-200)' }}>
                        <span style={REVIEW_PANEL_TITLE}>
                          {`${unitKindLabel(u.kind)} · ${u.name || 'ไม่มีชื่อ'}`}
                        </span>
                        <Information
                          subText={u.followsCenterHours
                            ? 'ตามเวลาศูนย์'
                            : `เวลาเฉพาะรายการนี้ · ${formatCenterHoursLine(u.hours, 'in')}`}
                          text={`${rooms} ห้องตรวจ · ${beds} เตียง`}
                          showBadge={false}
                          showBadge2={false}
                          maxWidth='none'
                          style={{ width: '100%' }}
                        />
                      </div>
                    );
                  })}
                </div>
              </ReviewSection>
            </div>
          )}
    </>
  );
}

function label(opts, v) { const o = opts.find((x) => x.value === v); return o && o.value ? o.label : '—'; }

/* เลือกรูปแบบโครงสร้างที่เคยสร้างไว้มาเป็นจุดตั้งต้นของศูนย์นี้.
   เลือกแล้วระบบคัดลอกมาเป็นชุดใหม่ (id ใหม่ทั้งหมด) — แก้ต่อในฟอร์มนี้ได้เลย
   โดยรูปแบบต้นทางในทะเบียนไม่เปลี่ยนตาม. */
/* ค่าที่บอกว่า "เลือกแล้วว่าจะเริ่มจากโครงสร้างตั้งต้น" — ต่างจาก '' ที่แปลว่า
   ยังไม่ได้เลือกอะไรเลย ('' ทำให้ Select แสดงเป็น placeholder สีจาง) */
export const STRUCTURE_FROM_SCRATCH = '__scratch__';

function StructureTemplatePicker({ templates, value, onChange }) {
  const options = [
    { value: STRUCTURE_FROM_SCRATCH, label: 'เริ่มจากโครงสร้างตั้งต้น (ไม่ใช้รูปแบบที่บันทึกไว้)' },
    /* สรุปโครงสร้างเป็น subtext ของ DS (สีอ่อนกว่าและอยู่บรรทัดรอง) —
       เดิมต่อท้ายชื่อในบรรทัดเดียวด้วยสีเดียวกันจนอ่านเป็นชื่อยาว ๆ
       (25 ส.ค. 2569) */
    ...templates.map((t) => ({
      value: t.id,
      label: `${t.name}${t.draft ? ' (ร่าง)' : ''}`,
      subtext: summarizeStructure(t.units || []),
    })),
  ];

  return (
    <section
      className='flex flex-col w-full'
      style={{
        background: 'var(--surface-card-100)',
        border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
        borderRadius: 'var(--dim-radius-500)',
        boxShadow: 'var(--shadow-card)',
        padding: 'var(--dim-space-500)',
        gap: 'var(--dim-space-300)',
      }}
    >
      <div style={{ maxWidth: 640 }}>
        <Select
          label='รูปแบบโครงสร้างศูนย์'
          searchable
          showHelperText
          helperText={templates.length
            ? 'เลือกแล้วระบบจะคัดลอกมาให้ — แก้ต่อที่นี่ได้โดยรูปแบบต้นทางไม่เปลี่ยน'
            : 'ยังไม่มีรูปแบบที่บันทึกไว้ — สร้างได้ที่เมนู "รูปแบบโครงสร้างศูนย์"'}
          placeholder='เลือกรูปแบบโครงสร้างศูนย์'
          options={options}
          value={value}
          onChange={onChange}
          disabled={!templates.length}
        />
      </div>
    </section>
  );
}

/* รายการรหัสที่ถูกใช้ไปแล้ว — เปิดจากปุ่มข้างช่อง "รหัสศูนย์" เพื่อเช็คก่อนกรอก
   ว่ารหัสไหนชนบ้าง โดยไม่ต้องออกจากฟอร์มไปหน้าทะเบียนศูนย์. */
function ExistingCodesPopup({ open, centers, onClose, mode = 'code' }) {
  const isName = mode === 'name';
  return (
    <Popup
      open={open}
      onClose={onClose}
      title={isName ? 'ชื่อสำนักงานอนามัยที่มีอยู่แล้ว' : 'รหัสศูนย์ที่มีอยู่แล้ว'}
      subtitle={centers.length
        ? (isName ? 'กรุณาไม่ตั้งชื่อซ้ำ' : 'กรุณาไม่ใช้รหัสซ้ำ')
        : 'ยังไม่มีศูนย์บริการในทะเบียน ใช้ได้ทั้งหมด'}
      /* เต็มหน้าจอ — ทะเบียนมี 69 รหัส ถ้าเป็น popup ขนาดปกติต้อง scroll ยาวมาก */
      size='extraLarge'
      /* ปุ่มปิดเป็น Brand Subdue · outline (secondaryAction) — popup นี้แค่เปิดดู
         ไม่มีอะไรให้ยืนยัน จึงไม่ควรใช้ปุ่มหลักแบบ fill */
      secondaryAction={{ label: 'ปิด', onClick: onClose }}
    >
      {centers.length === 0 ? (
        <span style={FIELD_HINT}>ยังไม่มีศูนย์บริการที่บันทึกไว้</span>
      ) : (
        /* รายการแบบ dropdown — ไม่มีกรอบรายบรรทัด (25 ส.ค. 2569) แถวติดกัน
           อ่านเป็นลิสต์เดียว ไม่ใช่การ์ด 69 ใบซ้อนกัน · แบ่ง 3 คอลัมน์ให้
           กวาดตาหารหัสได้เร็วโดยไม่ต้อง scroll ยาว */
        <div
          className='w-full'
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            /* 40px ตามที่ผู้ใช้กำหนด — สเกล dimension.space ไม่มีขั้น 40px
               (มีแค่ 32 = space-800 กับ 48 = space-1200) จึงอ้าง dimension.size.800
               ซึ่งมีค่า 40px ตรงตัว · ถ้า Figma ยืนยันว่า gap 40px เป็นค่ามาตรฐาน
               ควรเพิ่ม --dim-space-1000: 40px ที่ mih-design แล้ว tokens:pull */
            columnGap: 'var(--dim-size-800, 40px)',
          }}
        >
          {centers.map((c) => (
            <div
              key={c.id}
              /* ชิดซ้ายทั้งแถว — เดิม justify-between ดันรหัสหน่วยบริการไปสุดขอบขวา
                 ทำให้ตากวาดไกลระหว่างชื่อกับรหัส (25 ส.ค. 2569) */
              className='flex items-center min-w-0 w-full'
              style={{
                gap: 'var(--dim-space-300)',
                paddingTop: 'var(--dim-space-300)',
                paddingRight: 'var(--dim-space-200)',
                paddingBottom: 'var(--dim-space-300)',
                paddingLeft: 'var(--dim-space-200)',
                borderRadius: 'var(--dim-radius-200, 8px)',
              }}
            >
              <ColorfulBadge style='green'>{c.code || '—'}</ColorfulBadge>
              <span className='truncate' style={{ color: 'var(--text-content-default)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)' }}>
                {c.name || 'ไม่มีชื่อศูนย์'}
              </span>
              <span style={{ ...FIELD_HINT, whiteSpace: 'nowrap' }}>{c.hcode9 || 'ไม่มีรหัสหน่วยบริการ'}</span>
            </div>
          ))}
        </div>
      )}
    </Popup>
  );
}

/* ข้อมูลที่สาขาย่อยสืบทอดจากศูนย์แม่ — อ่านอย่างเดียว */
/* `grow` = ช่องที่ยอมยืด/หดและตัดบรรทัดค่าเอง (ใช้กับที่อยู่ซึ่งยาวไม่แน่นอน)
   ช่องอื่นกว้างตามเนื้อหาและห้ามตัดบรรทัดที่ป้าย — หัวข้อทุกอันจึงอยู่แถวเดียวกัน
   ต่อให้ที่อยู่ยาวจนต้องขึ้นสองบรรทัด (26 ส.ค. 2569 มติผู้ใช้) */
function BranchInfoItem({ label, value, grow = false }) {
  return (
    <div
      className='flex flex-col'
      style={{
        gap: 'var(--dim-space-050, 2px)',
        ...(grow
          ? { flex: '1 1 0', minWidth: 200 }
          : { flex: '0 0 auto', minWidth: 0 }),
      }}
    >
      <span
        style={{
          color: 'var(--text-content-tertiary)',
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-xs)',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </span>
      <span
        style={{
          color: 'var(--text-content-default)',
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-sm)',
          lineHeight: 1.5,
          ...(grow ? {} : { whiteSpace: 'nowrap' }),
        }}
      >
        {String(value || '').trim() || '—'}
      </span>
    </div>
  );
}

/* ติ๊กถูกสีเขียวท้ายช่องกรอก — บอกว่าค่าที่พิมพ์ไม่ซ้ำกับทะเบียนที่มีอยู่ */
function UniqueTick({ label }) {
  return (
    <span className='inline-flex items-center' role='img' aria-label={label} title={label}>
      <Icon name='check_circle' size={20} color='var(--icon-positive-success, #24A899)' />
    </span>
  );
}

/* รายการสาขาย่อย — การ์ดละหนึ่งสาขา (ชื่อ / ที่ตั้ง / เบอร์โทร) + ปุ่มเพิ่ม
   ไม่บังคับกรอก: ศูนย์ที่ไม่มีสาขาย่อยก็ปล่อยว่างไว้ได้ (createCenter จะตัด
   รายการที่ไม่มีชื่อทิ้งตอนบันทึกอยู่แล้ว) */
function BranchesPanel({ branches, onAdd, onChange, onRemove }) {
  return (
    <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
      {branches.length === 0 ? (
        <span
          style={{
            color: 'var(--text-content-tertiary)',
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-sm)',
            lineHeight: 1.5,
          }}
        >
          ศูนย์นี้ยังไม่มีสาขาย่อย — กด “เพิ่มสาขาย่อย” ถ้ามีจุดให้บริการย่อยในพื้นที่
        </span>
      ) : null}

      {branches.map((b, i) => (
        <div key={b.id} className='flex flex-col' style={{ ...NEUTRAL_PANEL, gap: 'var(--dim-space-400)' }}>
          <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-300)' }}>
            <div className='flex-1 min-w-0'>
              <Topic
                hierarchy='tertiary-on'
                title={`สาขาย่อยที่ ${i + 1}`}
                showSubText={false}
                showBadge={false}
                showSuccess={false}
              />
            </div>
            <BrandSubdueIconButton
              icon='delete'
              variant='outline'
              size='md'
              aria-label={`ลบสาขาย่อยที่ ${i + 1}`}
              onClick={() => onRemove(b.id)}
            />
          </div>
          <div className='flex flex-wrap w-full' style={{ gap: 'var(--dim-space-400)' }}>
            <div style={{ flex: '1 1 260px', minWidth: 220 }}>
              <InputField
                label='ชื่อสาขาย่อย'
                showLeadingIcon={false}
                showHelperText={false}
                size='lg'
                value={branchNameSuffixOf(b.name)}
                onChange={(v) => onChange(b.id, { name: branchNameFromSuffix(v) })}
                leading={<span style={BRANCH_CODE_PREFIX}>{BRANCH_NAME_PREFIX}</span>}
                placeholder='ชุมชนวัดปากน้ำฝั่งเหนือ'
              />
            </div>
            <div style={{ flex: '2 1 320px', minWidth: 240 }}>
              <InputField
                label='ที่ตั้ง'
                showLeadingIcon={false}
                showHelperText={false}
                size='lg'
                value={b.address}
                onChange={(v) => onChange(b.id, { address: v })}
                placeholder='ชุมชนวัดปากน้ำฝั่งเหนือ แขวงคลองชักพระ เขตตลิ่งชัน'
              />
            </div>
            <div style={{ flex: '1 1 200px', minWidth: 180 }}>
              <InputField
                label='เบอร์โทรศัพท์'
                showLeadingIcon={false}
                showHelperText={false}
                size='lg'
                value={b.phone}
                onChange={(v) => onChange(b.id, { phone: v })}
                placeholder='0 2424 9410 ต่อ 21'
              />
            </div>
          </div>
        </div>
      ))}

      <BrandDashedAddButton className='w-full' style={DASHED_ADD_SM} onClick={onAdd}>
        เพิ่มสาขาย่อย
      </BrandDashedAddButton>
    </div>
  );
}

/* Figma 3:9719 / 3:14382 — neutral/quaternary panel + tertiary-on topic + input + dashed add.
   Delete: Brand Subdue Icon Button · outline · md (Figma 3:15139) — 40×40, gap 12px to input. */
function ContactFieldPanel({
  title,
  values,
  placeholder,
  addLabel,
  onChangeAt,
  onAdd,
  onRemove,
  /* คืนข้อความ error ต่อค่าหนึ่งช่อง ('' = ผ่าน) — ใช้กับช่องอีเมลเพื่อเช็ค
     รูปแบบ ส่วนช่องเบอร์โทรไม่ส่ง prop นี้มาก็ไม่ตรวจอะไร */
  errorFor,
}) {
  return (
    <div className='flex flex-col' style={{ ...NEUTRAL_PANEL, gap: 'var(--dim-space-400)' }}>
      <Topic
        hierarchy='tertiary-on'
        title={title}
        showSubText={false}
        showBadge={false}
        showSuccess={false}
      />
      {values.map((value, i) => (
        <div key={i} className='flex items-start w-full' style={{ gap: 'var(--dim-space-300)' }}>
          <div className='flex-1 min-w-0'>
            <InputField
              showLabel={false}
              showHelperText={!!errorFor}
              showLeadingIcon={false}
              size='lg'
              value={value}
              onChange={(nv) => onChangeAt(i, nv)}
              placeholder={placeholder}
              error={errorFor ? errorFor(value) : undefined}
            />
          </div>
          <BrandSubdueIconButton
            icon='delete'
            variant='outline'
            size='md'
            aria-label={`ลบ${title}`}
            disabled={values.length <= 1}
            onClick={() => onRemove(i)}
          />
        </div>
      ))}
      <BrandDashedAddButton className='w-full' style={DASHED_ADD_SM} onClick={onAdd}>
        {addLabel}
      </BrandDashedAddButton>
    </div>
  );
}

/* Figma 3:10212 — hours panel with tertiary-on topic + start/end selects.
   หนึ่งกลุ่มวัน (จันทร์-ศุกร์ / เสาร์-อาทิตย์ / วันหยุดนักขัตฤกษ์) ถือทั้ง
   ในเวลาและนอกเวลาราชการ พร้อมสวิตช์เปิด/ปิดทำการของกลุ่มนั้น. */
function DayGroupHoursPanel({ group, value, onChange }) {
  const closed = !!value.closed;
  return (
    <div
      className='flex flex-col w-full'
      style={{
        background: 'var(--surface-neutral-quaternary, #F9FBFB)',
        border: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary, #F4F5F5)',
        borderRadius: 'var(--dim-radius-400, 12px)',
        padding: 'var(--dim-space-500)',
        gap: 'var(--dim-space-400)',
      }}
    >
      <div className='flex items-center justify-between flex-wrap w-full' style={{ gap: 'var(--dim-space-300)' }}>
        {/* ไอคอนเรียงกับ "บรรทัดหัวข้อ" ไม่ใช่กึ่งกลางของบล็อกสองบรรทัด —
            หัวข้อ 16px line-height 1.5 = สูง 24px · ไอคอน 20px จึงเยื้องลง 2px
            เพื่อให้ศูนย์กลางไอคอนตรงกับศูนย์กลางบรรทัดหัวข้อ (25 ส.ค. 2569) */}
        <div className='flex items-start min-w-0' style={{ gap: 'var(--dim-space-200)' }}>
          <Icon
            name={group.icon}
            size={20}
            style={{
              color: 'var(--text-brandPrimary-default)',
              flexShrink: 0,
              marginTop: 'var(--dim-space-050, 2px)',
            }}
          />
          <div className='flex flex-col min-w-0'>
            <span style={{ color: 'var(--text-topic-tertiary-title)', fontFamily: 'var(--type-family-heading-graphic2)', fontSize: 'var(--type-size-base)', lineHeight: 1.5 }}>
              {group.label}
            </span>
            <span style={{ color: 'var(--text-content-tertiary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', lineHeight: 1.5 }}>
              {group.sub}
            </span>
          </div>
        </div>
        <div className='flex items-center' style={{ gap: 'var(--dim-space-200)' }}>
          <Switch
            checked={!closed}
            onChange={(next) => onChange({ closed: !next })}
            aria-label={`เปิดทำการ ${group.label}`}
          />
          <ColorfulBadge style={closed ? 'grey' : 'green'}>
            {closed ? 'ปิดทำการ' : 'เปิดทำการ'}
          </ColorfulBadge>
        </div>
      </div>

      {!closed && (
        <div className='flex flex-wrap items-stretch w-full' style={{ gap: 'var(--dim-space-600)' }}>
          <div className='flex flex-col' style={{ ...NEUTRAL_PANEL, background: 'var(--surface-card-100)', gap: 'var(--dim-space-400)' }}>
            <Topic hierarchy='tertiary-on' title='ในเวลาราชการ' showSubText={false} showBadge={false} showSuccess={false} />
            <div className='flex w-full' style={{ gap: 'var(--dim-space-600)' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Select label='เริ่ม' required options={TIME_OPTS} value={value.inStart || ''} onChange={(v) => onChange({ inStart: v })} size='lg' placeholder='08:00' />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Select label='สิ้นสุด' required options={TIME_OPTS} value={value.inEnd || ''} onChange={(v) => onChange({ inEnd: v })} size='lg' placeholder='16:00' />
              </div>
            </div>
          </div>
          <div className='flex flex-col' style={{ ...NEUTRAL_PANEL, background: 'var(--surface-card-100)', gap: 'var(--dim-space-400)' }}>
            <Topic hierarchy='tertiary-on' title='นอกเวลาราชการ' showSubText={false} showBadge={false} showSuccess={false} />
            <div className='flex w-full' style={{ gap: 'var(--dim-space-600)' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Select label='เริ่ม' options={TIME_OPTS} value={value.outStart || ''} onChange={(v) => onChange({ outStart: v })} size='lg' placeholder='17:00' />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Select label='สิ้นสุด' options={TIME_OPTS} value={value.outEnd || ''} onChange={(v) => onChange({ outEnd: v })} size='lg' placeholder='20:00' />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ReviewDivider() {
  return (
    <div
      aria-hidden
      style={{
        height: 'var(--dim-stroke-100)',
        width: '100%',
        background: 'var(--border-neutral-quaternary)',
      }}
    />
  );
}

function ReviewSection({ title, children }) {
  return (
    <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
      <Topic
        hierarchy='secondary'
        title={title}
        showSubText={false}
        showBadge={false}
        showSuccess={false}
      />
      {children}
    </div>
  );
}

function ReviewInfoRow({ fields }) {
  return (
    <div className='w-full' style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 'var(--dim-space-600)' }}>
      {fields.map(({ key, label: fieldLabel, value }) => (
        <div key={key} style={{ minWidth: 0 }}>
          <Information
            subText={fieldLabel}
            text={value || '—'}
            showBadge={false}
            showBadge2={false}
            maxWidth='none'
            style={{ width: '100%' }}
          />
        </div>
      ))}
    </div>
  );
}

function ReviewSummaryPanel({ title, label, value }) {
  return (
    <div className='flex flex-col' style={{ ...NEUTRAL_PANEL, gap: 'var(--dim-space-400)' }}>
      <span style={REVIEW_PANEL_TITLE}>{title}</span>
      <Information
        subText={label}
        text={value || '—'}
        showBadge={false}
        showBadge2={false}
        maxWidth='none'
        style={{ width: '100%' }}
      />
    </div>
  );
}

/* flush — ขอบซ้าย/ขวาของแผนที่ต้องตรงกับแถวฟิลด์ที่อยู่เหนือขึ้นไป
   (ไม่งั้นแผนที่ร่นเข้า 24px และตันที่ 780 ขณะที่ฟิลด์กว้างเต็มการ์ด) */
const MapPinBlock = ({ value, onChange, readOnly = false, compact = false }) => (
  <AddressMapBlock
    value={value}
    onChange={onChange}
    readOnly={readOnly}
    compact={compact}
    flush
    heading='ปักหมุดตำแหน่ง'
    hint='ลาก/ซูม เพื่อหาตำแหน่งที่แม่นยำ หรือกด “ใช้ตำแหน่งปัจจุบัน”'
  />
);

export { ExistingCodesPopup };
