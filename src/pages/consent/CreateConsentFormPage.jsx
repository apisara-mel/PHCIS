import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import StepProgress from '@/components/step/StepProgress';
import Icon from '@/components/icons/Icon';
import InputField from '@/components/forms/InputField';
import Select from '@/components/forms/Select';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import Checkbox from '@/components/checkbox/Checkbox';
import BrandButton from '@/components/button/BrandButton';
import NeutralButton from '@/components/button/NeutralButton';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import BrandDashedAddButton from '@/components/button/BrandDashedAddButton';
import DangerSubdueIconButton from '@/components/button/DangerSubdueIconButton';
import BrandCircleSubdueIconButton from '@/components/button/BrandCircleSubdueIconButton';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import AlertDialog from '@/components/popup/AlertDialog';
import SuccessScreen from '@/components/layout/SuccessScreen';
import { markTypeSuperseded } from '@/data/consentWorkflowStore';
import CONSENT_NAV from '@/pages/consent/consentNav';

/* PHCIS | Consent — สร้างแบบฟอร์มใหม่ (Figma node 294:124265, steps
   350:130712 / 354:135439 / 355:140557).

   A 3-step create-consent-form wizard that lives ENTIRELY inside the Consent
   Management system: it reuses the same <QueuePageShell> + consent side menu
   (CONSENT_NAV) so pressing "สร้างแบบฟอร์มใหม่" never bounces the user out to
   the PHCIS forms library. Step state is local; the stepper drives which panel
   shows. All values alias design.md tokens; copy is Thai; data is local mock. */

/* Figma top bar (350:130181): breadcrumb is just Home / สร้างแบบฟอร์มใหม่ —
   the "ระบบจัดการความยินยอม" program name shows separately above it. */
const breadcrumb = ['สร้างแบบฟอร์มใหม่'];
const STEPS = ['ข้อมูลพื้นฐาน', 'เนื้อหาเอกสาร', 'ตรวจสอบและเผยแพร่'];

/* ── Reference data (mock, local) ───────────────────────────────────── */
const TEMPLATES = [
  { key: 'blank',       title: 'หน้าเปล่า',              subtitle: 'สร้างเองจากหน้าว่าง' },
  { key: 'treatment',   title: 'การรักษาทั่วไป',          subtitle: 'General Consent for Treatment' },
  { key: 'surgical',    title: 'การผ่าตัด',              subtitle: 'Surgical Consent มาตรฐาน' },
  { key: 'procedure',   title: 'หัตถการ / วิสัญญี',       subtitle: 'Procedure & Anesthesia Consent' },
  { key: 'research',    title: 'การวิจัยในมนุษย์',         subtitle: 'Research Consent (ICH-GCP)' },
  { key: 'media',       title: 'บันทึกภาพ / สื่อ',         subtitle: 'Media & Photography Consent' },
  { key: 'blood',       title: 'การให้เลือด',             subtitle: 'Blood Transfusion Consent' },
  { key: 'vaccine',     title: 'การฉีดวัคซีน',            subtitle: 'Vaccination Consent' },
  { key: 'screening',   title: 'การตรวจคัดกรองสุขภาพ',     subtitle: 'Health Screening Consent' },
  { key: 'data',        title: 'การเปิดเผยข้อมูลสุขภาพ',    subtitle: 'Health Data Disclosure (PDPA)' },
  { key: 'dental',      title: 'ทันตกรรม',               subtitle: 'Dental Treatment Consent' },
  { key: 'mental',      title: 'สุขภาพจิต / จิตเวช',       subtitle: 'Mental Health Consent' },
  { key: 'school',      title: 'อนามัยโรงเรียน',          subtitle: 'School Health Consent' },
  { key: 'homecare',    title: 'การดูแลที่บ้าน',          subtitle: 'Home Care & Home Visit Consent' },
  { key: 'referral',    title: 'การส่งต่อผู้ป่วย',         subtitle: 'Patient Referral Consent' },
  { key: 'genetic',     title: 'การตรวจทางพันธุกรรม',      subtitle: 'Genetic Testing Consent' },
  { key: 'telemed',     title: 'โทรเวชกรรม',             subtitle: 'Telemedicine Consent' },
  { key: 'rehab',       title: 'เวชศาสตร์ฟื้นฟู',         subtitle: 'Rehabilitation Consent' },
  { key: 'palliative',  title: 'การดูแลแบบประคับประคอง',    subtitle: 'Palliative Care Consent' },
  { key: 'minor',       title: 'การรักษาผู้เยาว์',         subtitle: 'Minor / Guardian Consent' },
];

/* Selecting a แม่แบบ pre-fills Step 1 (ข้อมูลพื้นฐาน) + Step 2 (เนื้อหาเอกสาร).
   The template key === the TYPE_OPTIONS value, so `type` is the key itself.
   Every field stays fully editable afterwards. (Figma 350:130188.) */
const COMMON_CLAUSES = [
  { title: 'การคุ้มครองข้อมูลส่วนบุคคล', detail: 'ข้าพเจ้ายินยอมให้สถานพยาบาลเก็บรวบรวมและใช้ข้อมูลสุขภาพเพื่อการรักษาพยาบาล ภายใต้พระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล (PDPA)' },
  { title: 'สิทธิในการเพิกถอนความยินยอม', detail: 'ข้าพเจ้าทราบว่าสามารถเพิกถอนความยินยอมนี้ได้ทุกเมื่อ โดยไม่กระทบต่อสิทธิในการรับบริการอื่น ๆ' },
];
const TPL = (name, lead, extra = {}) => ({ name, version: 'V 1.0', ttl: '30', leadClauses: lead, ...extra });
const TEMPLATE_PREFILL = {
  treatment:  TPL('ใบยินยอมรับการรักษาทั่วไป', [{ title: 'การยินยอมรับการรักษา', detail: 'ข้าพเจ้าได้รับคำอธิบายถึงแผนการรักษา ประโยชน์ และความเสี่ยงจากแพทย์ผู้ดูแลครบถ้วนแล้ว และยินยอมเข้ารับการรักษา' }]),
  surgical:   TPL('ใบยินยอมการผ่าตัด / หัตถการ', [{ title: 'การยินยอมเข้ารับการผ่าตัด', detail: 'ข้าพเจ้าได้รับคำอธิบายถึงวิธีการผ่าตัด ความเสี่ยง ภาวะแทรกซ้อน และทางเลือกอื่นในการรักษา และยินยอมเข้ารับการผ่าตัด' }]),
  procedure:  TPL('ใบยินยอมหัตถการและการระงับความรู้สึก', [{ title: 'การระงับความรู้สึก', detail: 'ข้าพเจ้ายินยอมรับการทำหัตถการและการระงับความรู้สึก โดยเข้าใจถึงความเสี่ยงของการดมยาสลบและการระงับความรู้สึก' }]),
  research:   TPL('ใบยินยอมเข้าร่วมโครงการวิจัย (ICF)', [{ title: 'การเข้าร่วมโครงการวิจัยโดยสมัครใจ', detail: 'ข้าพเจ้าได้รับข้อมูลเกี่ยวกับวัตถุประสงค์ ขั้นตอน ประโยชน์ และความเสี่ยงของโครงการวิจัย และยินยอมเข้าร่วมโดยสมัครใจ' }], { ttl: '365' }),
  media:      TPL('ใบยินยอมบันทึกภาพ / สื่อ', [{ title: 'การบันทึกและเผยแพร่ภาพ/สื่อ', detail: 'ข้าพเจ้ายินยอมให้บันทึกภาพ/วิดีโอเพื่อการศึกษาและเผยแพร่ตามขอบเขตที่ระบุไว้' }]),
  blood:      TPL('ใบยินยอมรับเลือดและส่วนประกอบของเลือด', [{ title: 'การรับเลือดและส่วนประกอบของเลือด', detail: 'ข้าพเจ้าได้รับคำอธิบายถึงความจำเป็นและความเสี่ยงของการรับเลือด และยินยอมรับเลือดและส่วนประกอบของเลือด' }]),
  vaccine:    TPL('ใบยินยอมการฉีดวัคซีน', [{ title: 'การรับวัคซีน', detail: 'ข้าพเจ้าได้รับข้อมูลเกี่ยวกับวัคซีน ประโยชน์ และอาการไม่พึงประสงค์ที่อาจเกิดขึ้น และยินยอมรับการฉีดวัคซีน' }]),
  screening:  TPL('ใบยินยอมการตรวจคัดกรองสุขภาพ', [{ title: 'การตรวจคัดกรองสุขภาพ', detail: 'ข้าพเจ้ายินยอมรับการตรวจคัดกรองสุขภาพตามรายการที่กำหนด' }]),
  data:       TPL('ใบยินยอมเปิดเผยข้อมูลสุขภาพ (PDPA)', [{ title: 'การเปิดเผยข้อมูลสุขภาพ', detail: 'ข้าพเจ้ายินยอมให้เปิดเผยข้อมูลสุขภาพแก่บุคคล/หน่วยงานที่ระบุ เพื่อวัตถุประสงค์ที่กำหนดไว้' }], { ttl: '365' }),
  dental:     TPL('ใบยินยอมการรักษาทางทันตกรรม', [{ title: 'การรักษาทางทันตกรรม', detail: 'ข้าพเจ้าได้รับคำอธิบายถึงแผนการรักษาทางทันตกรรม ความเสี่ยง และยินยอมเข้ารับการรักษา' }]),
  mental:     TPL('ใบยินยอมการรักษาสุขภาพจิต / จิตเวช', [{ title: 'การประเมินและรักษาทางสุขภาพจิต', detail: 'ข้าพเจ้ายินยอมรับการประเมินและรักษาทางสุขภาพจิตตามแผนการรักษาของแพทย์' }]),
  school:     TPL('ใบยินยอมอนามัยโรงเรียน', [{ title: 'บริการอนามัยโรงเรียน', detail: 'ข้าพเจ้า (ผู้ปกครอง) ยินยอมให้นักเรียนได้รับบริการตรวจสุขภาพและส่งเสริมสุขภาพในโรงเรียน' }], { requireGuardian: true }),
  homecare:   TPL('ใบยินยอมการดูแลที่บ้าน', [{ title: 'การดูแลรักษาที่บ้าน', detail: 'ข้าพเจ้ายินยอมรับบริการดูแลรักษาที่บ้านโดยทีมสหวิชาชีพตามแผนการดูแล' }]),
  referral:   TPL('ใบยินยอมการส่งต่อผู้ป่วย', [{ title: 'การส่งต่อผู้ป่วยและข้อมูล', detail: 'ข้าพเจ้ายินยอมให้ส่งต่อข้อมูลและรับการส่งต่อไปยังสถานพยาบาลที่เหมาะสม' }]),
  genetic:    TPL('ใบยินยอมการตรวจทางพันธุกรรม', [{ title: 'การตรวจทางพันธุกรรม', detail: 'ข้าพเจ้าได้รับคำอธิบายถึงการตรวจทางพันธุกรรม ผลกระทบที่อาจเกิดขึ้น และยินยอมเข้ารับการตรวจ' }], { ttl: '365' }),
  telemed:    TPL('ใบยินยอมโทรเวชกรรม (Telemedicine)', [{ title: 'บริการโทรเวชกรรม', detail: 'ข้าพเจ้ายินยอมรับบริการปรึกษาและรักษาผ่านระบบโทรเวชกรรม โดยเข้าใจข้อจำกัดของการตรวจทางไกล' }]),
  rehab:      TPL('ใบยินยอมเวชศาสตร์ฟื้นฟู', [{ title: 'โปรแกรมการฟื้นฟูสมรรถภาพ', detail: 'ข้าพเจ้ายินยอมรับโปรแกรมการฟื้นฟูสมรรถภาพตามแผนการรักษา' }]),
  palliative: TPL('ใบยินยอมการดูแลแบบประคับประคอง', [{ title: 'การดูแลแบบประคับประคอง', detail: 'ข้าพเจ้ายินยอมรับการดูแลแบบประคับประคองเพื่อบรรเทาอาการและส่งเสริมคุณภาพชีวิต' }]),
  minor:      TPL('ใบยินยอมการรักษาผู้เยาว์ (โดยผู้ปกครอง)', [{ title: 'การยินยอมโดยผู้ปกครอง', detail: 'ข้าพเจ้าในฐานะผู้ปกครองโดยชอบด้วยกฎหมาย ยินยอมให้ผู้เยาว์เข้ารับการรักษาตามแผนการรักษาของแพทย์' }], { requireGuardian: true, ttl: '90' }),
};

/* Form-cover thumbnails — exported illustration from Figma (PHCIS | Consent
   356:111486). The gradient + scene are baked into the SVG. */
const COVER_IMG = '/illustration/consent/form-cover-01.svg';
const COVERS = [
  { key: 'cover-01', label: 'หน้าปกแบบฟอร์ม 1', image: COVER_IMG },
  { key: 'cover-02', label: 'หน้าปกแบบฟอร์ม 2', image: COVER_IMG },
  { key: 'cover-03', label: 'หน้าปกแบบฟอร์ม 3', image: COVER_IMG },
  { key: 'cover-04', label: 'หน้าปกแบบฟอร์ม 4', image: COVER_IMG },
  { key: 'cover-05', label: 'หน้าปกแบบฟอร์ม 5', image: COVER_IMG },
];

const TYPE_OPTIONS = [
  { value: 'general',    label: 'ความยินยอมทั่วไป' },
  { value: 'treatment',  label: 'ความยินยอมการรักษา' },
  { value: 'surgical',   label: 'ความยินยอมการผ่าตัด' },
  { value: 'procedure',  label: 'ความยินยอมหัตถการ / วิสัญญี' },
  { value: 'research',   label: 'ความยินยอมการวิจัยในมนุษย์' },
  { value: 'media',      label: 'ความยินยอมบันทึกภาพ / สื่อ' },
  { value: 'blood',      label: 'ความยินยอมการให้เลือด' },
  { value: 'vaccine',    label: 'ความยินยอมการฉีดวัคซีน' },
  { value: 'screening',  label: 'ความยินยอมการตรวจคัดกรองสุขภาพ' },
  { value: 'data',       label: 'ความยินยอมเปิดเผยข้อมูลสุขภาพ (PDPA)' },
  { value: 'dental',     label: 'ความยินยอมทันตกรรม' },
  { value: 'mental',     label: 'ความยินยอมสุขภาพจิต / จิตเวช' },
  { value: 'school',     label: 'ความยินยอมอนามัยโรงเรียน' },
  { value: 'homecare',   label: 'ความยินยอมการดูแลที่บ้าน' },
  { value: 'referral',   label: 'ความยินยอมการส่งต่อผู้ป่วย' },
  { value: 'genetic',    label: 'ความยินยอมการตรวจทางพันธุกรรม' },
  { value: 'telemed',    label: 'ความยินยอมโทรเวชกรรม' },
  { value: 'rehab',      label: 'ความยินยอมเวชศาสตร์ฟื้นฟู' },
  { value: 'palliative', label: 'ความยินยอมการดูแลแบบประคับประคอง' },
  { value: 'minor',      label: 'ความยินยอมการรักษาผู้เยาว์' },
];
const TTL_OPTIONS = [
  { value: '1',   label: '1 วัน' },
  { value: '3',   label: '3 วัน' },
  { value: '5',   label: '5 วัน' },
  { value: '7',   label: '7 วัน' },
  { value: '15',  label: '15 วัน' },
  { value: '30',  label: '30 วัน' },
  { value: '60',  label: '60 วัน' },
  { value: '90',  label: '90 วัน' },
  { value: '365', label: '1 ปี (365 วัน)' },
];
/* Group Policy = กลุ่มวิชาชีพผู้ใช้งาน (แพทย์ / พยาบาล / เภสัชกร …). */
const GROUP_POLICY_OPTIONS = [
  { value: 'doctor',     label: 'แพทย์' },
  { value: 'nurse',      label: 'พยาบาล' },
  { value: 'pharmacist', label: 'เภสัชกร' },
  { value: 'medtech',    label: 'นักเทคนิคการแพทย์' },
  { value: 'physio',     label: 'นักกายภาพบำบัด' },
  { value: 'radiology',  label: 'นักรังสีการแพทย์' },
  { value: 'public',     label: 'นักวิชาการสาธารณสุข' },
  { value: 'nutrition',  label: 'นักโภชนาการ' },
  { value: 'psych',      label: 'นักจิตวิทยา' },
  { value: 'social',     label: 'นักสังคมสงเคราะห์' },
  { value: 'phc-officer',label: 'เจ้าพนักงานสาธารณสุข' },
  { value: 'admin',      label: 'เจ้าหน้าที่บริหาร / ธุรการ' },
];
/* สาขาย่อย = สาขาวิชาชีพภายในกลุ่มที่เลือก — ขึ้นกับ Group Policy. */
const SUB_BRANCH_BY_GROUP = {
  doctor: [
    { value: 'gp',         label: 'แพทย์ทั่วไป' },
    { value: 'specialist', label: 'แพทย์เฉพาะทาง' },
    { value: 'dentist',    label: 'ทันตแพทย์' },
    { value: 'thai-med',   label: 'แพทย์แผนไทย' },
  ],
  nurse: [
    { value: 'rn',       label: 'พยาบาลวิชาชีพ' },
    { value: 'er-nurse', label: 'พยาบาลห้องฉุกเฉิน' },
    { value: 'np',       label: 'พยาบาลเวชปฏิบัติ' },
    { value: 'pn',       label: 'ผู้ช่วยพยาบาล' },
  ],
  pharmacist: [
    { value: 'clin-pharm', label: 'เภสัชกรคลินิก' },
    { value: 'comm-pharm', label: 'เภสัชกรชุมชน' },
    { value: 'prod-pharm', label: 'เภสัชกรการผลิต' },
  ],
  medtech: [
    { value: 'medtech', label: 'นักเทคนิคการแพทย์' },
    { value: 'medsci',  label: 'นักวิทยาศาสตร์การแพทย์' },
  ],
  physio: [
    { value: 'pt', label: 'นักกายภาพบำบัด' },
    { value: 'ot', label: 'นักกิจกรรมบำบัด' },
  ],
  radiology: [
    { value: 'radtech',    label: 'นักรังสีการแพทย์' },
    { value: 'rad-officer',label: 'เจ้าพนักงานรังสีการแพทย์' },
  ],
  public: [
    { value: 'ph-academic', label: 'นักวิชาการสาธารณสุข' },
    { value: 'health-promo',label: 'นักวิชาการส่งเสริมสุขภาพ' },
    { value: 'epidemiology',label: 'นักระบาดวิทยา' },
  ],
  nutrition: [
    { value: 'nutritionist', label: 'นักโภชนาการ' },
    { value: 'dietitian',    label: 'นักกำหนดอาหาร' },
  ],
  psych: [
    { value: 'clin-psych', label: 'นักจิตวิทยาคลินิก' },
    { value: 'psychologist',label: 'นักจิตวิทยา' },
  ],
  social: [
    { value: 'social-worker', label: 'นักสังคมสงเคราะห์' },
    { value: 'community-dev',  label: 'นักพัฒนาสังคม' },
  ],
  'phc-officer': [
    { value: 'phc-officer',  label: 'เจ้าพนักงานสาธารณสุข' },
    { value: 'dental-officer',label: 'เจ้าพนักงานทันตสาธารณสุข' },
  ],
  admin: [
    { value: 'general-admin', label: 'เจ้าหน้าที่บริหารงานทั่วไป' },
    { value: 'clerk',         label: 'เจ้าพนักงานธุรการ' },
    { value: 'finance',       label: 'นักวิชาการเงินและบัญชี' },
  ],
};
/* รายการสาขาย่อยทั้งหมด (เรียงตามกลุ่ม) ติดแท็กกลุ่มต้นสังกัดไว้ใน `group`
   เพื่อใช้ enable/disable ตาม Group Policy ที่เลือก. */
const ALL_SUB_BRANCHES = Object.entries(SUB_BRANCH_BY_GROUP).flatMap(([group, opts]) =>
  opts.map((o) => ({ ...o, group })),
);
/* แผนก/งาน ภายในศูนย์บริการสาธารณสุข. */
const DEPT_OPTIONS = [
  { value: 'opd',            label: 'แผนกผู้ป่วยนอก (OPD)' },
  { value: 'dental',         label: 'งานทันตกรรม' },
  { value: 'pharmacy',       label: 'งานเภสัชกรรม' },
  { value: 'nursing',        label: 'งานการพยาบาล' },
  { value: 'promotion',      label: 'งานส่งเสริมสุขภาพ' },
  { value: 'mch',            label: 'งานอนามัยแม่และเด็ก' },
  { value: 'disease',        label: 'งานควบคุมโรคติดต่อ' },
  { value: 'env',            label: 'งานอนามัยสิ่งแวดล้อม' },
  { value: 'mental',         label: 'งานสุขภาพจิต' },
  { value: 'thai-med',       label: 'งานการแพทย์แผนไทย' },
  { value: 'rehab',          label: 'งานเวชศาสตร์ฟื้นฟู' },
  { value: 'lab',            label: 'งานชันสูตรสาธารณสุข (Lab)' },
  { value: 'records',        label: 'งานเวชระเบียน' },
];
/* ตำแหน่ง — ระดับตำแหน่งของผู้มีสิทธิ์ใช้งานในศูนย์ฯ (Figma 369:124873). */
const POSITION_OPTIONS = [
  { value: 'director',     label: 'ผู้อำนวยการศูนย์บริการสาธารณสุข' },
  { value: 'deputy',       label: 'รองผู้อำนวยการ' },
  { value: 'group-head',   label: 'หัวหน้ากลุ่มงาน' },
  { value: 'dept-head',    label: 'หัวหน้าแผนก' },
  { value: 'section-head', label: 'หัวหน้างาน' },
  { value: 'head-nurse',   label: 'หัวหน้าพยาบาล' },
  { value: 'practitioner', label: 'ผู้ปฏิบัติงาน' },
  { value: 'staff',        label: 'เจ้าหน้าที่ทั่วไป' },
];

const PATIENT_FIELDS = [
  { key: 'name',       label: 'ชื่อผู้ป่วย' },
  { key: 'hn',         label: 'หมายเลข HN' },
  { key: 'doctor',     label: 'แพทย์ผู้รักษา' },
  { key: 'birth',      label: 'วันเกิด / อายุ' },
  { key: 'citizen',    label: 'เลขบัตรประชาชน' },
  { key: 'contact',    label: 'ข้อมูลบุคคล' },
];
const SIGNATURE_FIELDS = [
  { key: 'patient', label: 'ผู้ป่วย / ผู้ปกครอง' },
  { key: 'doctor',  label: 'แพทย์ผู้รักษา' },
  { key: 'witness', label: 'พยาน' },
  { key: 'nurse',   label: 'พยาบาล' },
];

const TITLE_HINTS = ['ความยินยอมในการรักษา', 'การเปิดเผยข้อมูล', 'ความเสี่ยงและภาวะแทรกซ้อน', 'การถอนความยินยอม'];
const DETAIL_HINTS = [
  'ข้าพเจ้ายินยอมรับการตรวจวินิจฉัยและการรักษาตามที่แพทย์เห็นสมควร',
  'ข้าพเจ้าได้รับคำอธิบายถึงความเสี่ยงและภาวะแทรกซ้อนที่อาจเกิดขึ้นแล้ว',
  'ข้าพเจ้าสามารถถอนความยินยอมนี้ได้ทุกเมื่อโดยแจ้งเป็นลายลักษณ์อักษร',
];
const NAME_HINTS = ['ใบยินยอมรับการรักษาทั่วไป (General Consent for Treatment)', 'ใบยินยอมการผ่าตัด', 'ใบยินยอมเข้าร่วมการวิจัย'];

/* ด.1.1.13 — field type ต่อข้อความยินยอม (form builder) */
const FIELD_TYPE_OPTIONS = [
  { value: 'boolean',  label: 'ยินยอม / ไม่ยินยอม (Boolean)' },
  { value: 'checkbox', label: 'Checkbox รับทราบ' },
  { value: 'text',     label: 'ข้อความสั้น (Text)' },
  { value: 'textarea', label: 'ข้อความยาว (Textarea)' },
  { value: 'date',     label: 'วันที่ (Date)' },
  { value: 'number',   label: 'ตัวเลข (Number)' },
];

/* แผนที่ประเภทไทย (registry) → ค่า TYPE_OPTIONS ของ wizard — ใช้ตอน prefill
   จาก "สร้างเวอร์ชันใหม่" (ด.1.1.5) */
const TYPE_THAI_TO_VALUE = {
  'การวิจัย': 'research',
  'บันทึกภาพ/สื่อ': 'media',
  'การรักษา': 'treatment',
  'ผ่าตัด': 'surgical',
  'วัคซีน': 'vaccine',
  'PDPA': 'data',
};

let SECTION_SEQ = 2;
const makeSection = () => ({ id: `cs-${SECTION_SEQ++}`, title: '', detail: '', fieldType: 'boolean' });

/* ── Small presentational helpers ───────────────────────────────────── */
const SectionCard = ({ children, style }) => (
  <section
    className='w-full flex flex-col'
    style={{
      background: 'var(--surface-card-100)',
      borderRadius: 'var(--dim-radius-500)',
      border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
      boxShadow: 'var(--shadow-card)',
      padding: 'var(--dim-space-600)',
      gap: 'var(--dim-space-400)',
      ...style,
    }}
  >
    {children}
  </section>
);

const CardHeading = ({ title, subtext, badge }) => (
  <div className='flex items-start w-full' style={{ gap: 'var(--dim-space-300)' }}>
    <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-050)' }}>
      <h2
        style={{
          color: 'var(--text-brandPrimary-default)',
          fontFamily: 'var(--type-family-heading-graphic2)',
          fontSize: 'var(--type-size-base)',
          fontWeight: 'var(--type-weight-regular, 400)',
          lineHeight: 1.4,
        }}
      >
        {title}
      </h2>
      {subtext && (
        <span style={{ color: 'var(--text-content-quaternary, #ADB2B7)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', fontWeight: 'var(--type-weight-medium)' }}>
          {subtext}
        </span>
      )}
    </div>
    <div className='flex-1' />
    {badge && (
      <ColorfulBadge style='green' size='small' hierarchy='secondary' width='hug'>{badge}</ColorfulBadge>
    )}
  </div>
);

const ColumnHeading = ({ children }) => (
  <h3
    style={{
      color: 'var(--text-brandPrimary-default)',
      fontFamily: 'var(--type-family-heading-graphic2)',
      fontSize: 'var(--type-size-base)',
      fontWeight: 'var(--type-weight-regular, 400)',
      lineHeight: 1.4,
    }}
  >
    {children}
  </h3>
);

const CarouselArrows = ({ onPrev, onNext, prevDisabled = false, nextDisabled = false }) => (
  <div className='flex items-center justify-center w-full' style={{ gap: 'var(--dim-space-200)' }}>
    <BrandCircleSubdueIconButton icon='chevron_left' size='md' aria-label='ก่อนหน้า' onClick={onPrev} disabled={prevDisabled} />
    <BrandCircleSubdueIconButton icon='chevron_right' size='md' aria-label='ถัดไป' onClick={onNext} disabled={nextDisabled} />
  </div>
);

/* Template / category select-card — Figma "Select card Left" (350:128162)
   with the 3 interaction states from MIH Design System Card 247:32:
     • Default  : 1px border brandPrimary-quaternary (#e2f3eb) · shadow Bottom/200
     • Hover    : same border · shadow Bottom/400 (lift)
     • Selected : 2px border brandPrimary-default (#007549) · shadow Bottom/400
   Background stays surface/card/100 (white) in every state. The 65px medical
   illustration is the exported Figma "herb" glyph reused across all templates. */
const TEMPLATE_ILLUS = '/illustration/consent/form-template.svg';
const TemplateCard = ({ tpl, selected, onClick, style }) => {
  const [hovered, setHovered] = useState(false);
  const lifted = hovered || selected;
  return (
    <button
      type='button'
      onClick={onClick}
      aria-pressed={selected}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className='flex flex-col min-w-0 items-start justify-center text-left'
      style={{
        flex: '1 0 0',
        gap: 'var(--dim-space-400)',
        background: 'var(--surface-card-100)',
        /* Border WIDTH is constant 1px in every state — only the colour
           changes — so the content box never resizes and the card can't
           jolt on click. The selected state's 2px brand outline is the 1px
           border + a 1px inset box-shadow ring (layout-neutral). */
        border: `var(--dim-stroke-100) solid ${selected ? 'var(--border-brandPrimary-default, #007549)' : 'var(--border-brandPrimary-quaternary)'}`,
        borderRadius: 'var(--dim-radius-500)',
        padding: 'var(--dim-space-600)',
        boxShadow: selected
          ? 'inset 0 0 0 var(--dim-stroke-100) var(--border-brandPrimary-default, #007549), var(--shadow-brand-drop-bottom-400)'
          : lifted ? 'var(--shadow-brand-drop-bottom-400)' : 'var(--shadow-card)',
        outline: 'none',
        cursor: 'pointer',
        transition: 'box-shadow 0.18s ease, border-color 0.18s ease',
        ...(style || {}),
      }}
    >
      <img src={TEMPLATE_ILLUS} alt='' aria-hidden draggable={false} width={65} height={65} style={{ display: 'block', flexShrink: 0 }} />
      <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200)' }}>
        <span style={{ color: 'var(--text-brandPrimary-default)', fontFamily: 'var(--type-family-heading-graphic2)', fontSize: 'var(--type-size-base)', lineHeight: 1.5 }}>
          {tpl.title}
        </span>
        <span style={{ color: 'var(--color-emerald-600, #08A768)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)', lineHeight: 1.5 }}>
          {tpl.subtitle}
        </span>
      </div>
    </button>
  );
};

/* Hide the template track's scrollbar (idempotent module-load injection). */
if (typeof document !== 'undefined' && !document.getElementById('mih-tpl-track-style')) {
  const s = document.createElement('style');
  s.id = 'mih-tpl-track-style';
  s.textContent = '.mih-tpl-track{scrollbar-width:none;-ms-overflow-style:none;}.mih-tpl-track::-webkit-scrollbar{display:none;height:0;}';
  document.head.appendChild(s);
}

/* Template carousel — all 20 แม่แบบ in one horizontal track, 5 visible per view.
     • Arrow click slides exactly one view with smooth scroll.
     • Hovering near the left/right edge of the strip auto-slides continuously
       ("hover เพื่อ slide บนการ์ด") — pointer position drives the direction.
   Arrows disable once the track hits either end. */
/* Flex value that shows 5 cards per view (4 gaps of space/300 between them).
   Cards passed to <CardCarousel> carry `style={{ flex: CARD_BASIS }}`. */
const CARD_BASIS = '0 0 calc((100% - 4 * var(--dim-space-300)) / 5)';

/* Generic sliding carousel — a horizontal track + arrows + hover-to-slide.
   Used by both เลือกแม่แบบ and เลือกหน้าปก so they behave identically:
     • Arrow click slides exactly one view with smooth scroll.
     • Hovering near the left/right edge auto-slides continuously.
   Children are the flex items (cards). Arrows disable at either end. */
function CardCarousel({ children }) {
  const trackRef = useRef(null);
  const hoverDir = useRef(0);
  const hoverTimer = useRef(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const updateEdges = () => {
    const el = trackRef.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 1);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 1);
  };
  useEffect(() => { updateEdges(); }, [children]);

  const stopHoverSlide = () => {
    if (hoverTimer.current) { clearInterval(hoverTimer.current); hoverTimer.current = null; }
    hoverDir.current = 0;
  };
  const startHoverSlide = (dir) => {
    if (hoverDir.current === dir) return;
    stopHoverSlide();
    hoverDir.current = dir;
    hoverTimer.current = setInterval(() => {
      const el = trackRef.current;
      if (!el) return;
      el.scrollLeft += dir * 7;
    }, 16);
  };
  useEffect(() => stopHoverSlide, []);

  /* Arrow = explicit one-view smooth slide. */
  const slide = (dir) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth, behavior: 'smooth' });
  };

  /* Pointer within the left/right 64px gutter auto-slides that direction. */
  const onMove = (e) => {
    const el = trackRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const edge = 64;
    if (x < edge && el.scrollLeft > 1) startHoverSlide(-1);
    else if (x > rect.width - edge && el.scrollLeft + el.clientWidth < el.scrollWidth - 1) startHoverSlide(1);
    else stopHoverSlide();
  };

  return (
    <>
      <div
        ref={trackRef}
        onScroll={updateEdges}
        onMouseMove={onMove}
        onMouseLeave={stopHoverSlide}
        className='flex w-full mih-tpl-track'
        style={{ gap: 'var(--dim-space-300)', overflowX: 'auto' }}
      >
        {children}
      </div>
      <CarouselArrows
        onPrev={() => slide(-1)}
        onNext={() => slide(1)}
        prevDisabled={atStart}
        nextDisabled={atEnd}
      />
    </>
  );
}

/* Cover select-card — Figma "cover" 227×113 (350:130188 / DS Card 250:2578)
   with the 3 states:
     • Default  : no border, no shadow
     • Hover    : no border + shadow Bottom/200 (lift)
     • Selected : 2px brandPrimary-default ring, no drop shadow
   Selection ring + hover lift are drawn with box-shadow (layout-neutral) so the
   card never jolts on click. Dimension stays flex-1 + aspect-227/113 per the
   section layout (cards fill the row equally). */
const CoverCard = ({ cover, selected, onClick, style }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type='button'
      onClick={onClick}
      aria-pressed={selected}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className='relative min-w-0 overflow-hidden'
      style={{
        flex: '1 0 0',
        aspectRatio: '227 / 113',
        padding: 0,
        border: 'none',
        borderRadius: 'var(--dim-radius-400)',
        background: 'var(--surface-info-tertiary, #DBEAFE)',
        boxShadow: hovered ? 'var(--shadow-card)' : 'none',
        outline: 'none',
        cursor: 'pointer',
        transition: 'box-shadow 0.18s ease',
        ...(style || {}),
      }}
    >
      <img
        src={cover.image}
        alt={cover.label}
        draggable={false}
        className='block w-full h-full'
        style={{ objectFit: 'cover' }}
      />
      {/* Selected ring — overlay element sits ABOVE the image (an inset
          box-shadow would be hidden behind the full-bleed <img>). 2px brand
          border, layout-neutral (absolute), so the card never jolts. */}
      {selected && (
        <span
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            border: 'var(--dim-stroke-200) solid var(--border-brandPrimary-default, #007549)',
            borderRadius: 'var(--dim-radius-400)',
            pointerEvents: 'none',
          }}
        />
      )}
    </button>
  );
};
/* Photo upload dropzone — Figma "Photo" (3420:2565) Default/Hover states.
   Wrapped in a <label> with a hidden <input type="file">, so a click opens
   the OS image picker natively. Hover swaps the dashed border to
   border/formbuilder/hover (#08A768) per the Figma hover variant. */
const UploadDropzone = ({ onFile, style }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <label
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className='min-w-0 flex flex-col items-center justify-center'
      style={{
        flex: '1 0 0',
        aspectRatio: '227 / 113',
        border: `var(--dim-stroke-150) dashed ${hovered ? 'var(--border-formbuilder-hover, #08A768)' : 'var(--border-formbuilder-default, #c5edda)'}`,
        background: 'var(--surface-formbuilder-default, #f4fbf8)',
        borderRadius: 'var(--dim-radius-200)',
        gap: 'var(--dim-space-200)',
        padding: 'var(--dim-space-600)',
        color: 'var(--text-formbuilder-text, #007549)',
        cursor: 'pointer',
        transition: 'border-color 0.18s ease',
        ...(style || {}),
      }}
    >
      <input
        type='file'
        accept='image/*'
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files && e.target.files[0];
          if (file && onFile) onFile(file);
          e.target.value = '';
        }}
      />
      <Icon name='add_photo_alternate' size={20} />
      <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', fontWeight: 'var(--type-weight-medium)', textAlign: 'center' }}>
        เพิ่มรูปจากคอมพิวเตอร์
      </span>
    </label>
  );
};

/* Checkbox grid (ข้อมูลผู้ป่วย / ลายมือชื่อ) */
const CheckboxRow = ({ fields, value, onToggle }) => (
  <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-400) var(--dim-space-600)' }}>
    {fields.map((f) => (
      <Checkbox key={f.key} checked={value.has(f.key)} onChange={() => onToggle(f.key)} label={f.label} />
    ))}
  </div>
);

/* ── Page ───────────────────────────────────────────────────────────── */
export default function CreateConsentFormPage() {
  const history = useHistory();
  const location = useLocation();
  /* ด.1.1.5 — prefill จาก "สร้างเวอร์ชันใหม่" / "แก้ไข" (route state) */
  const prefill = (location.state && location.state.prefill) || null;
  const [step, setStep] = useState(0);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [published, setPublished] = useState(false);

  /* Step 1 */
  const [template, setTemplate] = useState('blank');
  const [cover, setCover] = useState(0);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [type, setType] = useState('');
  const [version, setVersion] = useState('');
  const [ttl, setTtl] = useState('');
  const [groupPolicy, setGroupPolicy] = useState([]);
  const [subBranch, setSubBranch] = useState([]);
  const [dept, setDept] = useState([]);
  const [position, setPosition] = useState([]);

  /* Step 2 */
  const [docTitle, setDocTitle] = useState('');
  const [patientFields, setPatientFields] = useState(() => new Set(['name', 'hn', 'doctor']));
  const [sections, setSections] = useState(() => [makeSection(), makeSection()]);
  const [signatures, setSignatures] = useState(() => new Set(['patient', 'doctor']));
  const [note, setNote] = useState('');
  const [requireGuardian, setRequireGuardian] = useState(false);
  const [allowESign, setAllowESign] = useState(true);

  const toggleIn = (setter) => (key) =>
    setter((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  /* Prefill ครั้งเดียวตอน mount (สร้างเวอร์ชันใหม่ — ด.1.1.5): ชื่อ/รหัส/
     ประเภทเดิม + เวอร์ชันที่ bump แล้ว. ทุก field แก้ต่อได้. */
  useEffect(() => {
    if (!prefill) return;
    if (prefill.name) { setName(prefill.name); setDocTitle(prefill.name); }
    if (prefill.code) setCode(prefill.code);
    if (prefill.typeLabel && TYPE_THAI_TO_VALUE[prefill.typeLabel]) setType(TYPE_THAI_TO_VALUE[prefill.typeLabel]);
    if (prefill.version) setVersion(prefill.version);
    setTtl((prev) => prev || '30');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* Select a แม่แบบ → pre-fill Step 1 + Step 2 (still fully editable).
     'blank' resets to an empty form. (Figma 350:130188.) */
  const applyTemplate = (key) => {
    setTemplate(key);
    if (key === 'blank' || !TEMPLATE_PREFILL[key]) {
      setName(''); setType(''); setVersion(''); setTtl('');
      setDocTitle(''); setRequireGuardian(false);
      setSections([makeSection(), makeSection()]);
      return;
    }
    const p = TEMPLATE_PREFILL[key];
    setName(p.name);
    setType(key); // template key === TYPE_OPTIONS value
    setVersion(p.version);
    setTtl(p.ttl);
    setDocTitle(p.name);
    setRequireGuardian(!!p.requireGuardian);
    setSections([...p.leadClauses, ...COMMON_CLAUSES].map((c) => ({ ...makeSection(), ...c })));
  };

  /* Step-1 validity gates the "ถัดไป" button (Figma annotation). */
  const step1Valid = name.trim() && code.trim() && type && version.trim() && ttl && groupPolicy.length && subBranch.length && dept.length && position.length;
  const step2Valid = sections.some((s) => s.title.trim() && s.detail.trim());
  const completedSteps = [Boolean(step1Valid), Boolean(step2Valid), false];
  const canAdvance = step === 0 ? step1Valid : step === 1 ? step2Valid : true;

  const goNext = () => {
    if (step < 2) { setStep(step + 1); window.scrollTo?.({ top: 0 }); }
    else {
      /* เผยแพร่เวอร์ชันใหม่ → record ที่เซ็นเวอร์ชันเก่าใน worklist กลายเป็น
         "มีเวอร์ชันใหม่" (เชื่อมผ่าน consentWorkflowStore — mock, ด.1.1.5) */
      if (prefill && prefill.supersedeType) markTypeSuperseded(prefill.supersedeType);
      setPublished(true);
    }
  };

  const updateSection = (id, patch) =>
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const removeSection = (id) =>
    setSections((prev) => (prev.length > 1 ? prev.filter((s) => s.id !== id) : prev));
  const reorderSections = (from, to) =>
    setSections((prev) => {
      if (from == null || to == null || from === to || from < 0 || to < 0) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });

  const nextLabel = step === 0 ? 'ถัดไป: เนื้อหาเอกสาร' : step === 1 ? 'ถัดไป: ตรวจสอบและเผยแพร่' : 'เผยแพร่';
  const nextIcon = 'arrow_forward';

  return (
    <>
      <QueuePageShell
        activeKey='consent-new'
        sidebarItems={CONSENT_NAV}
        sidebarFallbackKey='consent-new'
        brandTitle='ระบบจัดการความยินยอม'
        breadcrumb={breadcrumb}
        headerInfo={(
          /* Figma "PHCIS_Header_Summary Card Consent" (350:129658): the card's
             own title sits top-left, above the stepper. PageHeaderInfoPanel is
             already the white card, so StepProgress is unframed here. */
          <div className='w-full flex flex-col' style={{ gap: 'var(--dim-space-300)', paddingTop: 'var(--dim-space-400)' }}>
            <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
              <h1 style={{ color: 'var(--text-topic-tertiary-title)', fontFamily: 'var(--type-family-heading-graphic2)', fontSize: 'var(--type-size-base)', fontWeight: 'var(--type-weight-regular, 400)', lineHeight: 1.4 }}>
                สร้างแบบฟอร์มใหม่
              </h1>
              {/* ด.1.1.5 — โหมดสร้างเวอร์ชันใหม่ (bump จากเวอร์ชันเดิม) */}
              {prefill && prefill.fromVersion && (
                <ColorfulBadge style='blue' size='small' hierarchy='secondary' width='hug'>
                  สร้างเวอร์ชันใหม่จาก {prefill.fromVersion} → {prefill.version}
                </ColorfulBadge>
              )}
            </div>
            <StepProgress
              steps={STEPS}
              current={step}
              completedSteps={completedSteps}
              onStepClick={(idx) => { if (idx < step || completedSteps[idx - 1]) setStep(idx); }}
              className='w-full justify-center'
            />
          </div>
        )}
      >
        <div className='flex flex-col flex-1 min-w-0' style={{ padding: 'var(--dim-space-600)', gap: 'var(--dim-space-400)', paddingBottom: 96 }}>
          {step === 0 && (
            <StepBasics
              template={template} setTemplate={setTemplate} applyTemplate={applyTemplate}
              cover={cover} setCover={setCover}
              name={name} setName={setName} code={code} setCode={setCode}
              type={type} setType={setType} version={version} setVersion={setVersion} ttl={ttl} setTtl={setTtl}
              groupPolicy={groupPolicy} setGroupPolicy={setGroupPolicy}
              subBranch={subBranch} setSubBranch={setSubBranch} dept={dept} setDept={setDept}
              position={position} setPosition={setPosition}
            />
          )}
          {step === 1 && (
            <StepContent
              patientFields={patientFields} togglePatient={toggleIn(setPatientFields)}
              sections={sections} updateSection={updateSection} removeSection={removeSection}
              reorderSections={reorderSections}
              addSection={() => setSections((p) => [...p, makeSection()])}
              signatures={signatures} toggleSignature={toggleIn(setSignatures)}
              note={note} setNote={setNote}
              requireGuardian={requireGuardian} setRequireGuardian={setRequireGuardian}
              allowESign={allowESign} setAllowESign={setAllowESign}
            />
          )}
          {step === 2 && (
            <StepReview
              name={name} code={code} type={type} version={version} ttl={ttl}
              docTitle={docTitle} sections={sections} patientFields={patientFields} allowESign={allowESign}
            />
          )}
        </div>

        {/* Sticky wizard action bar (Figma footer 350:130686) */}
        <div
          className='sticky bottom-0 z-10 flex items-center w-full'
          style={{
            background: 'var(--surface-card-100)',
            borderTop: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
            boxShadow: '0 -2px 8px rgba(8,167,104,0.06)',
            padding: 'var(--dim-space-400) var(--dim-space-600)',
            gap: 'var(--dim-space-600)',
          }}
        >
          <div className='flex items-center min-w-0' style={{ gap: 'var(--dim-space-200)' }}>
            <span style={{ width: 8, height: 8, borderRadius: 'var(--dim-radius-full)', background: 'var(--surface-positive-secondary, #A2EDDE)' }} />
            <span className='truncate' style={{ color: 'var(--text-content-secondary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)' }}>
              ร่างแบบฟอร์ม (บันทึกล่าสุด: 2 นาทีที่แล้ว)
            </span>
          </div>
          <div className='flex-1' />
          <div className='flex items-center shrink-0' style={{ gap: 'var(--dim-space-300)' }}>
            <NeutralButton variant='outline' size='lg' onClick={() => setConfirmCancel(true)}>ยกเลิก</NeutralButton>
            <BrandSubdueButton variant='outline' size='lg' leadingIcon='save'>บันทึกร่าง</BrandSubdueButton>
            <BrandButton variant='fill' size='lg' trailingIcon={nextIcon} disabled={!canAdvance} onClick={goNext}>
              {nextLabel}
            </BrandButton>
          </div>
        </div>
      </QueuePageShell>

      <AlertDialog
        open={confirmCancel}
        type='warning'
        title='ยกเลิกการสร้างแบบฟอร์ม?'
        description='ข้อมูลที่ยังไม่ได้บันทึกจะหายไป ต้องการออกจากหน้านี้หรือไม่'
        confirmLabel='ออกจากหน้านี้'
        cancelLabel='ทำต่อ'
        onConfirm={() => { setConfirmCancel(false); history.push('/consent'); }}
        onCancel={() => setConfirmCancel(false)}
        onClose={() => setConfirmCancel(false)}
      />

      {published && (
        <SuccessScreen
          title='คุณสร้างแบบฟอร์มใหม่สำเร็จ'
          buttonLabel='แบบฟอร์มความยินยอมทั้งหมด'
          lottieSize={256}
          onDone={() => { setPublished(false); history.push('/consent/forms'); }}
        />
      )}
    </>
  );
}

/* ── Step 1 · ข้อมูลพื้นฐาน ───────────────────────────────────────────── */
function StepBasics(props) {
  const {
    template, setTemplate, applyTemplate, cover, setCover,
    name, setName, code, setCode, type, setType, version, setVersion, ttl, setTtl,
    groupPolicy, setGroupPolicy, subBranch, setSubBranch, dept, setDept,
    position, setPosition,
  } = props;
  /* รูปที่ผู้ใช้อัปโหลดจากคอม — แสดงเป็นการ์ดหน้าปกที่ถูกเลือกทันที. */
  const [customCover, setCustomCover] = useState(null);
  const handleCoverFile = (file) => {
    setCustomCover((prev) => { if (prev) URL.revokeObjectURL(prev); return URL.createObjectURL(file); });
    setCover('custom');
  };
  /* Selects that sit at the bottom of a column (อายุการใช้งาน, แผนก) open their
     dropdown downward — into the sticky action bar. Scroll the trigger to the
     viewport centre on open so the whole list clears the footer. */
  const scrollSelectIntoView = (node) =>
    node && node.scrollIntoView({ block: 'center', behavior: 'smooth' });
  /* สาขาย่อย ขึ้นกับ Group Policy ที่เลือก — เปลี่ยนกลุ่มแล้วล้างสาขาย่อยเดิม. */
  /* สาขาย่อย: แสดงทุกสาขา แต่ enable เฉพาะสาขาที่อยู่ในกลุ่มที่เลือก —
     สาขาที่ไม่เกี่ยวจะ disabled (เทา). ฟิลด์เปิดได้ต่อเมื่อเลือก Group Policy แล้ว. */
  const subBranchOptions = ALL_SUB_BRANCHES.map((o) => ({ ...o, disabled: !groupPolicy.includes(o.group) }));
  /* ตัดสาขาย่อยที่กลุ่มต้นสังกัดถูกเอาออกแล้ว เมื่อ Group Policy เปลี่ยน. */
  const onGroupPolicyChange = (vals) => {
    setGroupPolicy(vals);
    setSubBranch((prev) => prev.filter((sb) => {
      const opt = ALL_SUB_BRANCHES.find((o) => o.value === sb);
      return opt && vals.includes(opt.group);
    }));
  };
  return (
    <>
      <SectionCard>
        <CardHeading title='เลือกแม่แบบ' subtext='เป็นแม่แบบเบื้องต้น ซึ่งสามารถแก้ไขได้ภายหลัง' badge='20 แม่แบบ' />
        <CardCarousel>
          {TEMPLATES.map((t) => (
            <TemplateCard key={t.key} tpl={t} selected={template === t.key} onClick={() => applyTemplate(t.key)} style={{ flex: CARD_BASIS }} />
          ))}
        </CardCarousel>
      </SectionCard>

      <SectionCard>
        <CardHeading title='เลือกหน้าปกแบบฟอร์ม' subtext='เป็นแม่แบบเบื้องต้น ซึ่งสามารถแก้ไขได้ภายหลัง' badge='20 แม่แบบ' />
        <CardCarousel>
          <UploadDropzone key='upload' onFile={handleCoverFile} style={{ flex: CARD_BASIS }} />
          {customCover && (
            <CoverCard
              key='custom'
              cover={{ key: 'custom', label: 'รูปที่อัปโหลด', image: customCover }}
              selected={cover === 'custom'}
              onClick={() => setCover('custom')}
              style={{ flex: CARD_BASIS }}
            />
          )}
          {COVERS.map((c, i) => (
            <CoverCard key={c.key} cover={c} selected={cover === i} onClick={() => setCover(i)} style={{ flex: CARD_BASIS }} />
          ))}
        </CardCarousel>
      </SectionCard>

      <div className='flex items-stretch w-full' style={{ gap: 'var(--dim-space-600)' }}>
        <SectionCard style={{ flex: 1, gap: 'var(--dim-space-400)' }}>
          <ColumnHeading>ข้อมูลพื้นฐาน</ColumnHeading>
          <SuggestibleTextarea
            voice label='ชื่อแบบฟอร์ม Consent' required
            value={name} onChange={(v) => setName(typeof v === 'string' ? v : v?.target?.value ?? '')}
            placeholder='พิมพ์หรือกดปุ่มไมโครโฟนเพื่อพูด...'
            suggestions={NAME_HINTS} minChars={3} height={120}
          />
          <span style={{ marginTop: -8, color: 'var(--text-content-tertiary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)' }}>
            เช่น ใบยินยอมรับการรักษาทั่วไป (General Consent for Treatment)
          </span>
          <InputField label='รหัสแบบฟอร์ม Consent' required value={code} onChange={(v) => setCode(v)} placeholder='เช่น PH-001' />
          <Select label='ประเภท Consent' required options={TYPE_OPTIONS} value={type} onChange={setType} placeholder='เลือกประเภท' searchable={false} />
          <InputField label='เวอร์ชั่น' required value={version} onChange={(v) => setVersion(v)} placeholder='V 1.2' />
          <Select label='อายุการใช้งาน (วัน)' required options={TTL_OPTIONS} value={ttl} onChange={setTtl} placeholder='เลือกจำนวนวัน' searchable={false} onOpen={scrollSelectIntoView} />
        </SectionCard>

        <SectionCard style={{ flex: 1, gap: 'var(--dim-space-400)' }}>
          <ColumnHeading>ผู้ที่มีสิทธิ์ใช้งาน</ColumnHeading>
          <Select multiple selectAllLabel='เลือกทุก Group Policy' label='Group Policy' required options={GROUP_POLICY_OPTIONS} value={groupPolicy} onChange={onGroupPolicyChange} placeholder='เลือก Group Policy' searchable={false} />
          <Select multiple selectAllLabel='เลือกทุกสาขาย่อย' label='สาขาย่อย' required options={subBranchOptions} value={subBranch} onChange={setSubBranch} placeholder={groupPolicy.length ? 'เลือกสาขาย่อย' : 'เลือก Group Policy ก่อน'} disabled={!groupPolicy.length} searchable={false} />
          <Select multiple selectAllLabel='เลือกทุกแผนก' label='แผนก' required options={DEPT_OPTIONS} value={dept} onChange={setDept} placeholder='เลือกแผนก' searchable={false} onOpen={scrollSelectIntoView} />
          <Select multiple selectAllLabel='เลือกทุกตำแหน่ง' label='ตำแหน่ง' required options={POSITION_OPTIONS} value={position} onChange={setPosition} placeholder='เลือกตำแหน่ง' searchable={false} onOpen={scrollSelectIntoView} />
        </SectionCard>
      </div>
    </>
  );
}

/* ── Step 2 · เนื้อหาเอกสาร ───────────────────────────────────────────── */
/* Close (x) icon button — Figma "x button / info" (104:5369). 32×32 neutral
   close glyph; transparent at rest, hover fills with neutral-tertiary (#F4F5F5). */
const CardXButton = ({ onClick, disabled, label }) => {
  const [hover, setHover] = useState(false);
  return (
    <button
      type='button'
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className='inline-flex items-center justify-center shrink-0'
      style={{
        width: 'var(--dim-size-600, 32px)', height: 'var(--dim-size-600, 32px)',
        borderRadius: 'var(--dim-radius-200)',
        background: hover && !disabled ? 'var(--surface-neutral-tertiary, #F4F5F5)' : 'transparent',
        border: 'none', outline: 'none',
        color: 'var(--text-content-tertiary, #858C92)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        transition: 'background-color 120ms ease',
      }}
    >
      <Icon name='close' size={16} />
    </button>
  );
};

function StepContent(props) {
  const {
    patientFields, togglePatient,
    sections, updateSection, removeSection, reorderSections, addSection,
    signatures, toggleSignature, note, setNote,
    requireGuardian, setRequireGuardian, allowESign, setAllowESign,
  } = props;
  /* ลิงก์ไป Dashboard Builder (ด.1.1.13) */
  const builderHistory = useHistory();
  /* Drag-to-reorder consent clauses (HTML5 DnD). A card becomes draggable only
     while its grab handle is held, so typing/selecting inside the fields is
     never hijacked by a drag. */
  const [dragIdx, setDragIdx] = useState(null);
  const [overIdx, setOverIdx] = useState(null);
  const [grabIdx, setGrabIdx] = useState(null);
  const resetDrag = () => { setDragIdx(null); setOverIdx(null); setGrabIdx(null); };
  const dropOn = (to) => { if (dragIdx != null) reorderSections(dragIdx, to); resetDrag(); };
  return (
    <>
      <SectionCard>
        <ColumnHeading>ข้อมูลผู้ป่วย</ColumnHeading>
        <CheckboxRow fields={PATIENT_FIELDS} value={patientFields} onToggle={togglePatient} />
      </SectionCard>

      <SectionCard>
        <ColumnHeading>ข้อความยินยอม</ColumnHeading>
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-300)' }}>
          {sections.map((s, i) => (
            <div
              key={s.id}
              draggable={grabIdx === i}
              onDragStart={(e) => { setDragIdx(i); e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', String(i)); } catch (_) { /* noop */ } }}
              onDragEnter={() => { if (dragIdx != null && overIdx !== i) setOverIdx(i); }}
              onDragOver={(e) => { if (dragIdx != null) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; } }}
              onDrop={(e) => { e.preventDefault(); dropOn(i); }}
              onDragEnd={resetDrag}
              className='flex flex-col'
              style={{
                gap: 'var(--dim-space-300)',
                border: `var(--dim-stroke-100) solid ${overIdx === i && dragIdx !== i ? 'var(--border-brandPrimary-default, #007549)' : 'var(--border-brandPrimary-quaternary)'}`,
                borderRadius: 'var(--dim-radius-400)',
                padding: 'var(--dim-space-400)',
                background: 'var(--surface-neutral-quaternary, #F9FBFB)',
                opacity: dragIdx === i ? 0.45 : 1,
                transition: 'border-color 120ms ease, opacity 120ms ease',
              }}
            >
              <div className='flex items-center' style={{ gap: 'var(--dim-space-200)' }}>
                <span
                  onMouseDown={() => setGrabIdx(i)}
                  onMouseUp={() => setGrabIdx(null)}
                  title='ลากเพื่อจัดลำดับ'
                  style={{ color: 'var(--text-content-tertiary)', cursor: 'grab', lineHeight: 0, touchAction: 'none' }}
                >
                  <Icon name='drag_indicator' size={18} />
                </span>
                <span
                  className='inline-flex items-center justify-center'
                  style={{
                    width: 24, height: 24, borderRadius: 'var(--dim-radius-full)',
                    background: 'var(--surface-brandPrimary-quaternary)', color: 'var(--text-brandPrimary-default)',
                    fontFamily: 'var(--type-family-heading-graphic2)', fontSize: 'var(--type-size-sm)',
                  }}
                >
                  {i + 1}
                </span>
                <div className='flex-1' />
                <CardXButton label='ลบข้อความ' onClick={() => removeSection(s.id)} disabled={sections.length <= 1} />
              </div>
              <InputField label='หัวข้อ' required value={s.title} onChange={(v) => updateSection(s.id, { title: v })} placeholder='เช่น ยินยอมรับการรักษา' />
              <SuggestibleTextarea
                voice label='รายละเอียด' required
                value={s.detail} onChange={(v) => updateSection(s.id, { detail: typeof v === 'string' ? v : v?.target?.value ?? '' })}
                placeholder='พิมพ์หรือกดปุ่มไมโครโฟนเพื่อพูด...'
                suggestions={DETAIL_HINTS} minChars={3} height={120}
              />
              {/* ด.1.1.13 — เลือก field type ของคำตอบต่อข้อ */}
              <Select
                label='รูปแบบคำตอบของข้อนี้ (Field Type)'
                options={FIELD_TYPE_OPTIONS}
                value={s.fieldType || 'boolean'}
                onChange={(v) => updateSection(s.id, { fieldType: v })}
                searchable={false}
              />
            </div>
          ))}
          <BrandDashedAddButton icon='add' onClick={addSection}>เพิ่มข้อความ</BrandDashedAddButton>
        </div>
      </SectionCard>

      <SectionCard>
        <ColumnHeading>ลายมือชื่อ</ColumnHeading>
        <CheckboxRow fields={SIGNATURE_FIELDS} value={signatures} onToggle={toggleSignature} />
      </SectionCard>

      <SectionCard>
        <ColumnHeading>หมายเหตุพิเศษ และการตั้งค่าเพิ่มเติม</ColumnHeading>
        <SuggestibleTextarea
          voice label='ข้อความท้ายเอกสาร'
          value={note} onChange={(v) => setNote(typeof v === 'string' ? v : v?.target?.value ?? '')}
          placeholder='พิมพ์หรือกดปุ่มไมโครโฟนเพื่อพูด...'
          suggestions={DETAIL_HINTS} minChars={3} height={120}
        />
        <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-400) var(--dim-space-600)' }}>
          <Checkbox checked={requireGuardian} onChange={setRequireGuardian} label='สำหรับผู้ป่วย / จำเป็นต้องกรอกผู้ปกครอง' />
          <Checkbox checked={allowESign} onChange={setAllowESign} label='อนุญาตให้ใช้ e-Signature' />
        </div>
      </SectionCard>

      {/* ด.1.1.13 — เครื่องมือสร้าง "หน้าจอรายงาน" อยู่ที่ Dashboard Builder */}
      <SectionCard>
        <ColumnHeading>หน้าจอรายงานของแบบฟอร์มนี้</ColumnHeading>
        <span style={{ color: 'var(--text-content-secondary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)', lineHeight: 1.6 }}>
          สร้างหน้าจอสรุปผล/รายงานของแบบฟอร์ม (widget สถิติ · กราฟ · ตาราง) ได้จากเครื่องมือ Dashboard Builder — บันทึกเป็น template แล้วตั้งเป็นค่าเริ่มต้นของเมนูแดชบอร์ดได้
        </span>
        <div>
          <BrandSubdueButton variant='outline' size='md' leadingIcon='dashboard_customize' onClick={() => builderHistory.push('/consent/dashboard/builder')}>
            เปิด Dashboard Builder
          </BrandSubdueButton>
        </div>
      </SectionCard>
    </>
  );
}

/* ── Step 3 · ตรวจสอบและเผยแพร่ (Figma 355:140557) ────────────────────────
   Two columns: a full document preview (patient-info fields, numbered consent
   clauses with checkboxes, signature) on the left, and a live "Patient View"
   phone mock-up on the right. */
const PATIENT_SAMPLE = {
  name:    'เช่น นายสมชาย ใจดี',
  hn:      'เช่น 66-000123',
  doctor:  'เช่น พญ.วราภรณ์ สุขใจ',
  birth:   'เช่น 12/05/2530',
  citizen: 'เช่น 1-2345-67890-12-3',
  contact: 'เช่น 08x-xxx-xxxx',
};
export function StepReview({ name, code, type, version, ttl, docTitle, sections, patientFields, allowESign }) {
  const typeLabel = useMemo(() => (TYPE_OPTIONS.find((o) => o.value === type) || {}).label || 'เอกสารความยินยอม', [type]);
  const ttlDays = (TTL_OPTIONS.find((o) => o.value === ttl) || {}).label;
  const title = docTitle || name || 'ใบยินยอมรับการรักษาทั่วไป';
  const filledSections = sections.filter((s) => s.title.trim() || s.detail.trim());
  const patientPreview = PATIENT_FIELDS.filter((f) => patientFields.has(f.key));

  /* Unchecked checkbox glyph the patient would tick (Figma list checkbox). */
  const Tick = () => (
    <span
      aria-hidden
      style={{
        width: 'var(--dim-size-300, 16px)', height: 'var(--dim-size-300, 16px)', flexShrink: 0,
        borderRadius: 'var(--dim-radius-100)',
        border: 'var(--dim-stroke-150) solid var(--border-switch-default, #C9CDD0)',
        background: 'var(--surface-switch-default, #FFFFFF)',
        marginTop: 2,
      }}
    />
  );

  const Divider = () => (
    <div style={{ height: 'var(--dim-stroke-100)', background: 'var(--border-brandPrimary-quaternary)' }} />
  );

  const Clause = ({ index, title: ct, detail, compact }) => (
    <div className='flex items-start' style={{ gap: 'var(--dim-space-200)' }}>
      <Tick />
      <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-050)' }}>
        <span style={{ color: 'var(--text-brandPrimary-default)', fontFamily: 'var(--type-family-heading-graphic2)', fontSize: compact ? 11 : 'var(--type-size-sm)', lineHeight: 1.4 }}>
          ข้อที่ {index} · {ct || '(ไม่มีหัวข้อ)'}
        </span>
        {detail && (
          <span
            className={compact ? 'line-clamp-3' : undefined}
            style={{ color: 'var(--text-content-secondary)', fontFamily: 'var(--type-family-body)', fontSize: compact ? 10 : 'var(--type-size-sm)', lineHeight: compact ? 1.5 : 1.6 }}
          >
            {detail}
          </span>
        )}
      </div>
    </div>
  );

  return (
    <div className='flex items-start w-full' style={{ gap: 'var(--dim-space-600)' }}>
      {/* ── Left — full document preview ── */}
      <SectionCard style={{ flex: 1.4 }}>
        <div className='flex items-start w-full' style={{ gap: 'var(--dim-space-300)' }}>
          <span
            className='inline-flex items-center justify-center shrink-0'
            style={{ width: 'var(--dim-size-900, 44px)', height: 'var(--dim-size-900, 44px)', borderRadius: 'var(--dim-radius-200)', background: 'var(--surface-brandPrimary-quaternary)', color: 'var(--text-brandPrimary-default)' }}
          >
            <Icon name='description' size={24} />
          </span>
          <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-050)' }}>
            <h2 style={{ color: 'var(--text-brandPrimary-default)', fontFamily: 'var(--type-family-heading-graphic2)', fontSize: 'var(--type-size-lg)', fontWeight: 'var(--type-weight-regular, 400)', lineHeight: 1.3 }}>{title}</h2>
            <span style={{ color: 'var(--text-content-quaternary, #ADB2B7)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)' }}>
              {typeLabel} · {code || 'PH-001'} · {version || 'V1.0'}
            </span>
          </div>
        </div>

        <Divider />

        <ColumnHeading>ข้อมูลผู้ป่วย</ColumnHeading>
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-300)' }}>
          {patientPreview.length === 0 ? (
            <span style={{ color: 'var(--text-content-tertiary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)' }}>ยังไม่ได้เลือกข้อมูลผู้ป่วย</span>
          ) : patientPreview.map((f) => (
            /* Preview field — looks like a normal (default) input but is fully
               inert: readOnly + tabIndex -1 + pointer-events none, so it can be
               neither typed into nor focused/clicked. */
            <div key={f.key} style={{ pointerEvents: 'none' }}>
              <InputField label={f.label} required readOnly tabIndex={-1} aria-readonly='true' placeholder={PATIENT_SAMPLE[f.key] || `ระบุ${f.label}`} />
            </div>
          ))}
        </div>

        <Divider />

        <ColumnHeading>ข้อความยินยอม</ColumnHeading>
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-400)' }}>
          {filledSections.length === 0 ? (
            <span style={{ color: 'var(--text-content-tertiary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)' }}>ยังไม่มีข้อความยินยอม</span>
          ) : filledSections.map((s, i) => (
            <Clause key={s.id} index={i + 1} title={s.title} detail={s.detail} />
          ))}
        </div>

        <Divider />

        <ColumnHeading>ลายมือชื่อ</ColumnHeading>
        {/* Signature capture box — Figma "Signature / Default" (272:46900):
            formbuilder dashed box, edit glyph + "เซ็นชื่อในกล่องนี้". */}
        <div
          className='flex flex-col items-center justify-center w-full'
          style={{
            minHeight: 96,
            border: 'var(--dim-stroke-150) dashed var(--border-formbuilder-default, #C5EDDA)',
            background: 'var(--surface-formbuilder-default, #F4FBF8)',
            borderRadius: 'var(--dim-radius-200)',
            gap: 'var(--dim-space-200)',
            padding: 'var(--dim-space-600)',
            color: 'var(--text-formbuilder-subtext, #858C92)',
          }}
        >
          <Icon name='edit' size={20} />
          <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', fontWeight: 'var(--type-weight-medium)' }}>เซ็นชื่อในกล่องนี้</span>
        </div>
        {allowESign && (
          <div className='flex items-center justify-center' style={{ gap: 'var(--dim-space-150)' }}>
            <Icon name='check_circle' size={16} color='var(--text-brandPrimary-default)' />
            <span style={{ color: 'var(--text-content-default, #363B3F)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)' }}>
              อนุญาต e-Signature
            </span>
          </div>
        )}
        {/* Note box — Figma 355:139568. */}
        <div
          className='flex flex-col w-full'
          style={{
            background: 'var(--surface-card-200, #FDFDFD)',
            border: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary, #F4F5F5)',
            borderRadius: 'var(--dim-radius-400)',
            padding: 'var(--dim-space-400)',
            gap: 'var(--dim-space-100)',
            color: 'var(--text-content-secondary)',
          }}
        >
          <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)', fontWeight: 'var(--type-weight-bold)' }}>หมายเหตุ</span>
          <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)', lineHeight: 1.5 }}>
            เอกสารนี้มีอายุ {ttlDays || '—'} นับจากวันที่ลงนาม
          </span>
        </div>
      </SectionCard>

      {/* ── Right — live patient-view phone ── */}
      <SectionCard style={{ flex: 1, alignItems: 'center', gap: 'var(--dim-space-400)' }}>
        <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-200)' }}>
          <span style={{ color: 'var(--text-topic-tertiary-title)', fontFamily: 'var(--type-family-heading-content)', fontWeight: 'var(--type-weight-bold)', fontSize: 'var(--type-size-base)' }}>
            ตัวอย่างเอกสาร (Patient View)
          </span>
          <div className='flex-1' />
          <span
            className='inline-flex items-center'
            style={{ gap: 'var(--dim-space-100)', padding: '2px var(--dim-space-200)', borderRadius: 'var(--dim-radius-full)', background: 'var(--surface-statussummarycard-positive, #D1F6EE)', color: 'var(--text-statussummarycard-positive-number, #196C65)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', fontWeight: 'var(--type-weight-medium)' }}
          >
            <span style={{ width: 6, height: 6, borderRadius: 'var(--dim-radius-full)', background: 'currentColor' }} />
            Live
          </span>
        </div>

        {/* phone frame */}
        <div style={{ width: 300, borderRadius: 44, background: '#1D1D1F', padding: 10, boxShadow: '0 20px 48px rgba(8,167,104,0.14)' }}>
          <div style={{ position: 'relative', background: 'var(--surface-card-100)', borderRadius: 34, overflow: 'hidden', display: 'flex', flexDirection: 'column', height: 580 }}>
            {/* dynamic island */}
            <div style={{ position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)', width: 96, height: 24, borderRadius: 'var(--dim-radius-full)', background: '#1D1D1F', zIndex: 2 }} />
            {/* app bar */}
            <div
              className='flex items-center shrink-0'
              style={{ gap: 'var(--dim-space-200)', padding: '40px var(--dim-space-400) var(--dim-space-300)', borderBottom: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)' }}
            >
              <Icon name='arrow_back_ios_new' size={16} color='var(--text-content-secondary)' />
              <span style={{ flex: 1, textAlign: 'center', color: 'var(--text-content-default)', fontFamily: 'var(--type-family-heading-graphic2)', fontSize: 'var(--type-size-sm)' }}>ใบยินยอม</span>
              <span style={{ width: 16 }} />
            </div>
            {/* scrollable doc */}
            <div className='flex flex-col scrollbar-thin' style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 'var(--dim-space-400)', gap: 'var(--dim-space-300)' }}>
              <div className='flex flex-col' style={{ gap: 'var(--dim-space-150)', padding: 'var(--dim-space-300)', borderRadius: 'var(--dim-radius-200)', background: 'var(--surface-brandPrimary-quaternary)' }}>
                <span style={{ color: 'var(--text-brandPrimary-default)', fontFamily: 'var(--type-family-heading-graphic2)', fontSize: 'var(--type-size-sm)', lineHeight: 1.4 }}>{title}</span>
                <span style={{ color: 'var(--text-content-tertiary)', fontFamily: 'var(--type-family-body)', fontSize: 11 }}>{code || 'PH-001'} · {version || 'V1.0'}</span>
              </div>
              {filledSections.length === 0 ? (
                <span style={{ color: 'var(--text-content-tertiary)', fontFamily: 'var(--type-family-body)', fontSize: 11 }}>ยังไม่มีข้อความยินยอม</span>
              ) : filledSections.slice(0, 6).map((s, i) => (
                <Clause key={s.id} index={i + 1} title={s.title} detail={s.detail} compact />
              ))}
            </div>
            {/* sticky confirm */}
            <div className='shrink-0' style={{ padding: 'var(--dim-space-300) var(--dim-space-400)', borderTop: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)' }}>
              <BrandButton variant='fill' size='md' style={{ width: '100%' }}>ยืนยันการยินยอม</BrandButton>
            </div>
          </div>
        </div>
        <span style={{ color: 'var(--text-content-tertiary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', textAlign: 'center' }}>
          มุมมองที่ผู้ป่วยจะเห็นบนอุปกรณ์มือถือ
        </span>
      </SectionCard>
    </div>
  );
}
