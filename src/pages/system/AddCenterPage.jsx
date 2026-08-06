import React, { useState } from 'react';
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
import DeleteCenterContactConfirmPopup from '@/components/popup/DeleteCenterContactConfirmPopup';
import Icon from '@/components/icons/Icon';
import Topic from '@/components/topic/Topic';
import Information from '@/components/information/Information';
import WizardMorphHeader, { WIZARD_MORPH_SHELL_PROPS } from '@/components/layout/WizardMorphHeader';
import SYSTEM_NAV from '@/pages/system/systemNav';
import {
  readCenters,
  writeCenters,
  createCenter,
  isDuplicateCenterCode,
  formatCenterHoursLine,
} from '@/data/centerStore';

/* ระบบจัดการระบบ · เพิ่มศูนย์บริการ (Figma 4D3nTx53 · 1:3273 "Create Branch").
   5-step wizard: ข้อมูลศูนย์ → ที่ตั้ง → ข้อมูลการติดต่อ → เวลาทำการ → รีวิว.
   Reuses InputField / Select / buttons + the จัดการระบบ shell. */

const breadcrumb = ['จัดการระบบ', 'ศูนย์บริการ', 'เพิ่มศูนย์บริการ'];
const STEPS = [
  { key: 'info', n: 1, label: 'ข้อมูลศูนย์' },
  { key: 'location', n: 2, label: 'ที่ตั้ง' },
  { key: 'contact', n: 3, label: 'ข้อมูลการติดต่อ' },
  { key: 'hours', n: 4, label: 'เวลาทำการ' },
  { key: 'review', n: 5, label: 'รีวิว' },
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
const TIME_OPTS = (() => {
  const out = [];
  for (let h = 0; h < 24; h += 1) for (const m of ['00', '30']) out.push({ value: `${String(h).padStart(2, '0')}:${m}`, label: `${String(h).padStart(2, '0')}:${m}` });
  return out;
})();

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

  const [info, setInfo] = useState({ code: '', name: '' });
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
  const [hours, setHours] = useState({ inStart: '', inEnd: '', outStart: '', outEnd: '' });
  const setH = (k) => (v) => setHours((p) => ({ ...p, [k]: v }));

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

  const infoValid = info.code.trim() && info.name.trim();
  const locationValid = Boolean(loc.zip && loc.province && loc.district && loc.pinSaved);
  const cancel = () => navigate.push('/admin/centers');

  const persistCenter = (draft) => {
    const existing = readCenters();
    if (!draft && isDuplicateCenterCode(existing, info.code)) {
      window.alert('รหัสศูนย์ซ้ำกับที่มีอยู่ กรุณาเปลี่ยนรหัสศูนย์ใหม่');
      return false;
    }
    const center = createCenter({
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
    return true;
  };

  const handleSaveDraft = () => {
    if (!info.code.trim() && !info.name.trim()) {
      window.alert('กรุณาระบุรหัสศูนย์หรือชื่อศูนย์บริการก่อนบันทึกร่าง');
      return;
    }
    if (persistCenter(true)) navigate.push('/admin/centers');
  };

  const handleCreate = () => {
    if (!infoValid) return;
    if (persistCenter(false)) setSubmitted(true);
  };

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
      disabled: (step === 'info' && !infoValid) || (step === 'location' && !locationValid),
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
              <div className='flex flex-col' style={{ gap: 'var(--dim-space-600)', maxWidth: 640 }}>
                <div className='flex flex-col' style={{ gap: 'var(--dim-space-150)' }}>
                  <InputField label='รหัสสาขา' required value={info.code} onChange={setI('code')} placeholder='เช่น 4' />
                  <span style={{ color: 'var(--text-content-tertiary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)', lineHeight: 1.5 }}>รหัสสาขา ไม่ต้องใส่เลขศูนย์นำหน้า และต้องไม่ซ้ำกับที่มีอยู่แล้ว</span>
                </div>
                <InputField label='ชื่อสำนักงานอนามัย' required value={info.name} onChange={setI('name')} placeholder='เช่น ศูนย์บริการสาธารณสุข 69' />
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
              <MapPinBlock
                value={mapValue}
                onChange={handleMapChange}
              />
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
              <div className='flex flex-wrap items-stretch w-full' style={{ gap: 'var(--dim-space-600)' }}>
                <HoursFieldPanel
                  title='ในเวลาราชการ'
                  start={hours.inStart}
                  end={hours.inEnd}
                  onStart={setH('inStart')}
                  onEnd={setH('inEnd')}
                />
                <HoursFieldPanel
                  title='นอกเวลาราชการ'
                  start={hours.outStart}
                  end={hours.outEnd}
                  onStart={setH('outStart')}
                  onEnd={setH('outEnd')}
                />
              </div>
            </div>
          )}

          {/* STEP 5 — review (Figma 3:13253) */}
          {step === 'review' && (
            <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-600)' }}>
              <ReviewSection title='ข้อมูลศูนย์บริการ'>
                <ReviewInfoRow
                  fields={[
                    { key: 'code', label: 'รหัสศูนย์บริการ', value: info.code },
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
                  <ReviewSummaryPanel
                    title='ในเวลาราชการ'
                    label='ช่วงเวลา'
                    value={`${formatCenterHoursLine(hours, 'in')}`}
                  />
                  <ReviewSummaryPanel
                    title='นอกเวลาราชการ'
                    label='ช่วงเวลา'
                    value={`${formatCenterHoursLine(hours, 'out')}`}
                  />
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
    </QueuePageShell>
  );
}

function label(opts, v) { const o = opts.find((x) => x.value === v); return o && o.value ? o.label : '—'; }

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
        <div key={i} className='flex items-end w-full' style={{ gap: 'var(--dim-space-300)' }}>
          <div className='flex-1 min-w-0'>
            <InputField
              showLabel={false}
              showHelperText={false}
              showLeadingIcon={false}
              size='lg'
              value={value}
              onChange={(nv) => onChangeAt(i, nv)}
              placeholder={placeholder}
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

/* Figma 3:10212 — hours panel with tertiary-on topic + start/end selects. */
function HoursFieldPanel({ title, start, end, onStart, onEnd }) {
  return (
    <div className='flex flex-col' style={{ ...NEUTRAL_PANEL, gap: 'var(--dim-space-400)' }}>
      <Topic
        hierarchy='tertiary-on'
        title={title}
        showSubText={false}
        showBadge={false}
        showSuccess={false}
      />
      <div className='flex w-full' style={{ gap: 'var(--dim-space-600)' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Select label='เริ่ม' required options={TIME_OPTS} value={start} onChange={onStart} size='lg' placeholder='08:00' />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Select label='สิ้นสุด' required options={TIME_OPTS} value={end} onChange={onEnd} size='lg' placeholder='16:00' />
        </div>
      </div>
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

const MapPinBlock = ({ value, onChange, readOnly = false, compact = false }) => (
  <AddressMapBlock
    value={value}
    onChange={onChange}
    readOnly={readOnly}
    compact={compact}
    heading='ปักหมุดตำแหน่ง'
    hint='ลาก/ซูม เพื่อหาตำแหน่งที่แม่นยำ หรือกด “ใช้ตำแหน่งปัจจุบัน”'
  />
);
