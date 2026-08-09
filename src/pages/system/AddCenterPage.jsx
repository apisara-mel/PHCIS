import React, { useMemo, useState } from 'react';
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
import CenterStructureEditor from '@/pages/system/CenterStructureEditor';
import { TIME_OPTIONS } from '@/pages/system/centerHourOptions';
import {
  readCenters,
  writeCenters,
  createCenter,
  isDuplicateCenterCode,
  isDuplicateHcode9,
  formatCenterHoursLine,
  normalizeHcode9,
  normalizeHcode5,
  isValidHcode9,
  deriveHcode5,
  HCODE_LOOKUP_URL,
  HOUR_GROUPS,
  DEFAULT_HOUR_GROUPS,
} from '@/data/centerStore';
import { isValidEmail, EMAIL_FORMAT_ERROR } from '@/data/usersAccess';
import {
  createStructureTemplate,
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
  { key: 'structure', n: 5, label: 'แผนกและคลินิก' },
  { key: 'review', n: 6, label: 'รีวิว' },
];
const PROVINCE_OPTS = [
  { value: '', label: 'จังหวัด' },
  { value: 'bkk', label: 'กรุงเทพมหานคร' }, { value: 'nonthaburi', label: 'นนทบุรี' },
  { value: 'samutprakan', label: 'สมุทรปราการ' }, { value: 'pathumthani', label: 'ปทุมธานี' },
];
const DISTRICT_OPTS = [
  { value: '', label: 'เขต/อำเภอ' },
  { value: 'dindaeng', label: 'ดินแดง' }, { value: 'watthana', label: 'วัฒนา' },
  { value: 'bangsue', label: 'บางซื่อ' }, { value: 'phranakhon', label: 'พระนคร' },
];
const SUBDISTRICT_OPTS = [
  { value: '', label: 'แขวง/ตำบล' },
  { value: 'dindaeng', label: 'ดินแดง' }, { value: 'samsennai', label: 'สามเสนใน' },
];
const TIME_OPTS = TIME_OPTIONS;

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

const FIELD_HINT = {
  color: 'var(--text-content-tertiary)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm)',
  lineHeight: 1.5,
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

export default function AddCenterPage() {
  const navigate = useHistory();
  const [step, setStep] = useState('info');
  const idx = STEPS.findIndex((s) => s.key === step);
  const goNext = () => idx < STEPS.length - 1 && setStep(STEPS[idx + 1].key);
  const goPrev = () => idx > 0 && setStep(STEPS[idx - 1].key);

  /* hcode9 = รหัสหน่วยบริการ 9 หลักแบบใหม่ (GA0012460) — บังคับและเป็นรหัสหลัก
     hcode5 = รหัสเดิม 5 หลัก (12460) — ไม่บังคับ เติมให้อัตโนมัติจาก 9 หลัก */
  const [info, setInfo] = useState({ hcode9: '', hcode5: '', code: '', name: '' });
  const [hcode5Touched, setHcode5Touched] = useState(false);
  const [loc, setLoc] = useState({
    zip: '', province: '', district: '', subdistrict: '', road: '', moo: '', no: '',
    lat: undefined, lng: undefined, pinSaved: false,
  });
  const setI = (k) => (v) => setInfo((p) => ({ ...p, [k]: v }));
  const setL = (k) => (v) => setLoc((p) => ({ ...p, [k]: v }));
  const handleMapChange = (patch) => setLoc((p) => ({ ...p, ...patch }));
  const [phones, setPhones] = useState(['']);
  const [emails, setEmails] = useState(['']);
  const [contactDelete, setContactDelete] = useState(null);
  /* เวลาทำการแยก 3 กลุ่มวัน: จันทร์-ศุกร์ / เสาร์-อาทิตย์ / วันหยุดนักขัตฤกษ์ */
  const [hours, setHours] = useState(() => JSON.parse(JSON.stringify(DEFAULT_HOUR_GROUPS)));
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

  /* บังคับแค่รหัส 9 หลัก (+ ชื่อศูนย์) — รหัส 5 หลักและรหัสศูนย์ไม่บังคับ */
  const hcode9Error = info.hcode9 && !isValidHcode9(info.hcode9)
    ? 'รูปแบบไม่ถูกต้อง — ต้องเป็นตัวอักษร 2 ตัวตามด้วยตัวเลข 7 หลัก เช่น GA0012460'
    : '';
  const infoValid = isValidHcode9(info.hcode9) && info.name.trim();
  const locationValid = Boolean(loc.zip && loc.province && loc.district && loc.pinSaved);
  /* ช่องอีเมลไม่บังคับกรอก แต่ถ้ากรอกแล้วต้องถูกรูปแบบ ไม่งั้นไปขั้นถัดไปไม่ได้ */
  const contactValid = emails.every(isValidEmail);
  /* ทุกแผนกต้องมีชื่อ และทุกคลินิกในแผนกต้องมีชื่อ */
  const structureValid = units.length > 0 && units.every((u) => u.name.trim());
  const cancel = () => navigate.push('/admin/centers');

  const setHcode9 = (raw) => {
    const next = normalizeHcode9(raw);
    setInfo((p) => ({
      ...p,
      hcode9: next,
      /* เดารหัสเดิม 5 หลักให้จนกว่าผู้ใช้จะพิมพ์ทับเอง */
      hcode5: hcode5Touched ? p.hcode5 : deriveHcode5(next),
    }));
  };

  const setHcode5 = (raw) => {
    setHcode5Touched(true);
    setInfo((p) => ({ ...p, hcode5: normalizeHcode5(raw) }));
  };

  const persistCenter = (draft) => {
    const existing = readCenters();
    if (!draft && isDuplicateHcode9(existing, info.hcode9)) {
      window.alert('รหัสหน่วยบริการ 9 หลักนี้มีอยู่แล้ว กรุณาตรวจสอบที่ hcode.moph.go.th');
      return false;
    }
    if (!draft && info.code.trim() && isDuplicateCenterCode(existing, info.code)) {
      window.alert('รหัสศูนย์ซ้ำกับที่มีอยู่ กรุณาเปลี่ยนรหัสศูนย์ใหม่');
      return false;
    }
    const center = createCenter({
      hcode9: info.hcode9,
      hcode5: info.hcode5,
      code: info.code,
      name: info.name,
      location: loc,
      phones,
      emails,
      website: '',
      hours,
      draft,
    });
    writeCenters([...existing, center]);

    /* โครงสร้างเก็บเป็น "รูปแบบ" แยก แล้วผูกกับศูนย์ที่กำลังสร้าง +
       ศูนย์อื่นที่ผู้ใช้เลือกให้ใช้รูปแบบเดียวกัน */
    writeStructures([
      ...readStructures(),
      createStructureTemplate({
        name: `โครงสร้าง ${info.name || info.hcode9}`,
        units,
        appliedCenters: Array.from(new Set([...(appliedCenters || []), info.hcode9].filter(Boolean))),
        draft,
      }),
    ]);
    return true;
  };

  const handleSaveDraft = () => {
    if (!info.hcode9.trim() && !info.name.trim()) {
      window.alert('กรุณาระบุรหัสหน่วยบริการ 9 หลัก หรือชื่อศูนย์บริการก่อนบันทึกร่าง');
      return;
    }
    if (persistCenter(true)) navigate.push('/admin/centers');
  };

  const handleCreate = () => {
    if (!infoValid || !structureValid) return;
    if (persistCenter(false)) setSubmitted(true);
  };

  /* ศูนย์ที่มีอยู่แล้วในทะเบียน — ใช้ทั้งรายการ "ดูรหัสที่มีอยู่" และตัวเลือก
     ศูนย์ที่จะใช้รูปแบบโครงสร้างเดียวกัน. อ่านครั้งเดียวตอน mount ก็พอ เพราะ
     ทะเบียนเปลี่ยนได้จากหน้าอื่นเท่านั้น ไม่ใช่จากในฟอร์มนี้. */
  const existingCenters = useMemo(() => readCenters().filter((c) => !c.draft), []);
  /* รูปแบบโครงสร้างที่บันทึกไว้จากหน้า "รูปแบบโครงสร้างศูนย์" */
  const savedStructures = useMemo(() => readStructures(), []);
  const [showCodeList, setShowCodeList] = useState(false);

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

  if (submitted) {
    return (
      <SuccessScreen
        title={`คุณเพิ่มศูนย์บริการ ${info.name || 'ใหม่'} สำเร็จ`}
        buttonLabel='ศูนย์บริการ'
        onDone={() => navigate.push('/admin/centers')}
      />
    );
  }

  return (
    <QueuePageShell
      activeKey='system-centers'
      sidebarItems={SYSTEM_NAV}
      sidebarFallbackKey='system-centers'
      brandTitle='ระบบ PHCIS'
      breadcrumb={breadcrumb}
      {...WIZARD_MORPH_SHELL_PROPS}
      headerInfo={(
        <WizardMorphHeader
          title='เพิ่มศูนย์บริการ'
          steps={STEPS.map((s) => s.label)}
          current={idx}
          onStepClick={(i) => { if (i < idx) setStep(STEPS[i].key); }}
        />
      )}
    >
      <div className='flex flex-col flex-1 min-w-0' style={{ gap: 'var(--dim-space-600, 24px)' }}>
        <div className='flex flex-col flex-1 min-w-0' style={{ padding: 'var(--dim-space-600)', gap: 'var(--dim-space-400)' }}>
        {/* Content card — stepper lives in WizardMorphHeader (sticky morph band). */}
        <section className='flex flex-col w-full overflow-hidden' style={{ background: 'var(--surface-card-100)', borderRadius: 'var(--dim-radius-500)', border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)', boxShadow: 'var(--shadow-card)' }}>
          <div className='flex flex-col' style={{ padding: 'var(--dim-space-600)' }}>

          {/* STEP 1 — center info (Figma 3:598) */}
          {step === 'info' && (
            <div className='flex flex-col' style={{ gap: 'var(--dim-space-300)' }}>
              <SectionHead icon='domain'>ข้อมูลศูนย์บริการ</SectionHead>
              {/* ช่องกรอกกว้าง 640 เท่าเดิม แต่ไม่ครอบคำอธิบายใต้ช่อง — ไม่งั้น
                  บรรทัด "รหัสหน่วยบริการแบบใหม่…hcode.moph.go.th" ถูกบีบจนตกบรรทัด */}
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
                    ไม่บังคับ — เติมให้อัตโนมัติจากรหัส 9 หลัก ใช้อ้างอิงกับระบบและรายงานเดิมที่ยังใช้รหัส 5 หลัก
                  </span>
                </div>

                <div className='flex flex-col' style={{ gap: 'var(--dim-space-150)' }}>
                  <div className='flex items-end' style={{ maxWidth: FIELD_W, gap: 'var(--dim-space-300)' }}>
                    <div className='flex-1 min-w-0'>
                      <InputField label='รหัสศูนย์' value={info.code} onChange={setI('code')} placeholder='เช่น 4' />
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
                  <span style={FIELD_HINT}>ต้องไม่ซ้ำกับที่มีอยู่แล้ว</span>
                </div>

                <div style={{ maxWidth: FIELD_W }}>
                  <InputField label='ชื่อสำนักงานอนามัย' required value={info.name} onChange={setI('name')} placeholder='ศูนย์ดินแดง' />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2 — location */}
          {step === 'location' && (
            <div className='flex flex-col' style={{ gap: 'var(--dim-space-400)' }}>
              <SectionHead icon='location_on'>ที่ตั้งศูนย์บริการ</SectionHead>
              <div className='flex flex-wrap' style={{ gap: 'var(--dim-space-400)' }}>
                <div style={{ flex: '1 1 200px', minWidth: 180 }}><Select label='รหัสไปรษณีย์' required options={[{ value: '', label: 'รหัสไปรษณีย์' }, { value: '10400', label: '10400' }, { value: '10110', label: '10110' }]} value={loc.zip} onChange={setL('zip')} /></div>
                <div style={{ flex: '1 1 200px', minWidth: 180 }}><Select label='จังหวัด' required options={PROVINCE_OPTS} value={loc.province} onChange={setL('province')} /></div>
                <div style={{ flex: '1 1 200px', minWidth: 180 }}><Select label='เขต/อำเภอ' required options={DISTRICT_OPTS} value={loc.district} onChange={setL('district')} /></div>
                <div style={{ flex: '1 1 200px', minWidth: 180 }}><Select label='แขวง/ตำบล' options={SUBDISTRICT_OPTS} value={loc.subdistrict} onChange={setL('subdistrict')} /></div>
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
                title='เบอร์โทรศัพท์'
                leadingIcon='call'
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
              {/* แยกตามกลุ่มวัน: จันทร์-ศุกร์ · เสาร์-อาทิตย์ · วันหยุดนักขัตฤกษ์
                  กลุ่มไหนปิดทำการก็ปิดสวิตช์ทิ้งไว้ ไม่ต้องกรอกเวลา */}
              <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-500)' }}>
                {HOUR_GROUPS.map((g) => (
                  <DayGroupHoursPanel
                    key={g.key}
                    group={g}
                    value={hours[g.key] || {}}
                    onChange={(patch) => setGroupHours(g.key, patch)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* STEP 5 — แผนก → คลินิก → ห้อง/เตียง */}
          {step === 'structure' && (
            <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-500)' }}>
              <Topic
                hierarchy='primary'
                title='แผนกและคลินิก'
                subText='แผนกและคลินิกอยู่ระดับเดียวกัน แต่ละรายการมีห้องตรวจ/เตียงของตัวเอง'
                leadingIcon='account_tree'
                showBadge={false}
                showChevron={false}
                showSuccess={false}
              />
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
              <CenterStructureEditor
                units={units}
                onUnitsChange={setUnits}
                appliedCenters={appliedCenters}
                onAppliedCentersChange={setAppliedCenters}
                centerOptions={otherCenterOptions}
              />
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
                {/* แผนกกับคลินิกอยู่ระดับเดียวกัน จึงเรียงเป็นรายการเดียว
                    ไม่ใช่คลินิกซ้อนอยู่ใต้แผนก */}
                <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
                  {units.map((u) => {
                    const rooms = u.nodes.filter((n) => n.kind !== 'bed').length;
                    const beds = u.nodes.length - rooms;
                    return (
                      <div key={u.id} className='flex flex-col' style={{ ...NEUTRAL_PANEL, gap: 'var(--dim-space-200)' }}>
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
          </div>
        </section>
        </div>

      <Footer
        type='with BTN'
        sticky
        showLegal={false}
        showButton3
        button3Label={idx === 0 ? 'ยกเลิก' : 'ย้อนกลับ'}
        button3Icon={idx === 0 ? undefined : 'arrow_back'}
        onButton3Click={idx === 0 ? cancel : goPrev}
        showButton2
        button2Label='บันทึกร่าง'
        button2Icon='save'
        onButton2Click={handleSaveDraft}
        showButton1
        button1Label={footerPrimary.label}
        button1TrailingIcon={footerPrimary.icon}
        button1Disabled={footerPrimary.disabled}
        onButton1Click={footerPrimary.onClick}
      />
      </div>
      <DeleteCenterContactConfirmPopup
        open={contactDelete !== null}
        kind={contactDelete?.kind ?? 'phone'}
        onClose={() => setContactDelete(null)}
        onConfirm={confirmContactDelete}
      />
      <ExistingCodesPopup
        open={showCodeList}
        centers={existingCenters}
        onClose={() => setShowCodeList(false)}
      />
    </QueuePageShell>
  );
}

function label(opts, v) { const o = opts.find((x) => x.value === v); return o && o.value ? o.label : '—'; }

/* เลือกรูปแบบโครงสร้างที่เคยสร้างไว้มาเป็นจุดตั้งต้นของศูนย์นี้.
   เลือกแล้วระบบคัดลอกมาเป็นชุดใหม่ (id ใหม่ทั้งหมด) — แก้ต่อในฟอร์มนี้ได้เลย
   โดยรูปแบบต้นทางในทะเบียนไม่เปลี่ยนตาม. */
function StructureTemplatePicker({ templates, value, onChange }) {
  const options = [
    { value: '', label: 'เริ่มจากโครงสร้างตั้งต้น (ไม่ใช้รูปแบบที่บันทึกไว้)' },
    ...templates.map((t) => ({
      value: t.id,
      label: `${t.name}${t.draft ? ' (ร่าง)' : ''} — ${summarizeStructure(t.units || [])}`,
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
      <Topic
        hierarchy='primary'
        title='ใช้รูปแบบที่เคยสร้างไว้'
        subText='เลือกรูปแบบโครงสร้างที่บันทึกไว้มาเป็นจุดตั้งต้น แล้วปรับต่อได้'
        leadingIcon='account_tree'
        showBadge={false}
        showChevron={false}
        showSuccess={false}
      />
      <div style={{ maxWidth: 640 }}>
        <Select
          label='รูปแบบโครงสร้างศูนย์'
          searchable
          showHelperText
          helperText={templates.length
            ? 'เลือกแล้วระบบจะคัดลอกมาให้ — แก้ต่อที่นี่ได้โดยรูปแบบต้นทางไม่เปลี่ยน'
            : 'ยังไม่มีรูปแบบที่บันทึกไว้ — สร้างได้ที่เมนู "รูปแบบโครงสร้างศูนย์"'}
          placeholder='เริ่มจากโครงสร้างตั้งต้น'
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
function ExistingCodesPopup({ open, centers, onClose }) {
  return (
    <Popup
      open={open}
      onClose={onClose}
      title='รหัสศูนย์ที่มีอยู่แล้ว'
      subtitle={centers.length
        ? `ใช้ไปแล้ว ${centers.length} รหัส — เลือกรหัสที่ยังไม่ถูกใช้`
        : 'ยังไม่มีศูนย์บริการในทะเบียน ใช้รหัสใดก็ได้'}
      size='default'
      primaryAction={{ label: 'ปิด', onClick: onClose }}
    >
      {centers.length === 0 ? (
        <span style={FIELD_HINT}>ยังไม่มีศูนย์บริการที่บันทึกไว้</span>
      ) : (
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200)' }}>
          {centers.map((c) => (
            <div
              key={c.id}
              className='flex items-center justify-between flex-wrap w-full'
              style={{
                gap: 'var(--dim-space-300)',
                paddingTop: 'var(--dim-space-300)',
                paddingRight: 'var(--dim-space-400)',
                paddingBottom: 'var(--dim-space-300)',
                paddingLeft: 'var(--dim-space-400)',
                border: 'var(--dim-stroke-100) solid var(--border-card-default)',
                borderRadius: 'var(--dim-radius-300)',
              }}
            >
              <div className='flex items-center min-w-0' style={{ gap: 'var(--dim-space-300)' }}>
                <ColorfulBadge style='green'>{c.code || '—'}</ColorfulBadge>
                <span className='truncate' style={{ color: 'var(--text-content-default)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)' }}>
                  {c.name || 'ไม่มีชื่อศูนย์'}
                </span>
              </div>
              <span style={FIELD_HINT}>{c.hcode9 || 'ไม่มีรหัสหน่วยบริการ'}</span>
            </div>
          ))}
        </div>
      )}
    </Popup>
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
      <BrandDashedAddButton className='w-full' style={{ width: '100%' }} onClick={onAdd}>
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
        <div className='flex items-center min-w-0' style={{ gap: 'var(--dim-space-200)' }}>
          <Icon name={group.icon} size={20} style={{ color: 'var(--text-brandPrimary-default)', flexShrink: 0 }} />
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
