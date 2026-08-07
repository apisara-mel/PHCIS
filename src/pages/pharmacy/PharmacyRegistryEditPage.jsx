import React, { useCallback, useMemo, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import WizardMorphHeader, { WIZARD_MORPH_SHELL_PROPS } from '@/components/layout/WizardMorphHeader';
import { MIH_CHROME_MORPH_FOOTER } from '@/components/layout/wizardChromeMorphStyles';
import Icon from '@/components/icons/Icon';
import InputField from '@/components/forms/InputField';
import DatePicker from '@/components/forms/DatePicker';
import Select from '@/components/forms/Select';
import Checkbox from '@/components/checkbox/Checkbox';
import SelectableTag from '@/components/forms/SelectableTag';
import SelectableCardButton from '@/components/button/SelectableCardButton';
import BrandButton from '@/components/button/BrandButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import SuccessToast from '@/components/toast/SuccessToast';
import {
  DRUG_REGISTRY,
  DRUG_CLASSIFICATIONS,
  UNIT_TYPES,
  UNIT_CONVERSIONS,
  RIGHTS_LIST,
  getRegistryDrugById,
  upsertRegistryDrug,
} from '@/data/pharmacyRegistry';
import { PHARMACY_NESTED_PANEL, PHARMACY_WORKLIST_CARD } from '@/pages/pharmacy/pharmacyContentCard';

/* Drug Registry add/edit wizard (ToR §1.9.1 + §1.9.10). Step chrome +
   sticky footer mirror `CreateConsentFormPage.jsx`; every form control
   aliases design-system components (InputField, DatePicker, Select,
   Checkbox, SelectableTag, SelectableCardButton). */

const STEPS = ['ข้อมูลพื้นฐาน', 'หน่วยและประเภท', 'สิทธิและข้อจำกัด', 'ราคาและตรวจสอบ'];

const canNavigateToStep = (idx, step, completedSteps) =>
  idx < step || Boolean(completedSteps[idx - 1]);

const dateFromIso = (iso) => (iso ? new Date(`${iso}T12:00:00`) : null);
const isoFromDate = (d) => (d ? d.toISOString().slice(0, 10) : null);

const BLANK_DRUG = {
  id: 'new',
  code: '',
  name: '',
  genericName: '',
  tradeName: '',
  unit: 'tablet',
  packSize: 100,
  classification: 'nlem',
  highAlert: false,
  rightsEligible: [...RIGHTS_LIST],
  priceSchedule: [{ id: 'p-new-1', effectiveFrom: new Date().toISOString().slice(0, 10), effectiveTo: null, price: 0 }],
  active: true,
  activeFrom: new Date().toISOString().slice(0, 10),
  activeTo: null,
  replacementId: '',
  manufacturer: '',
  distributor: '',
  usageRate: { avgPerMonth: 0, maxQty: 0, minQty: 0, reorderPoint: 0 },
  disallowedChronicDiseases: [],
  restrictedToDoctorGroup: '',
};

const SectionCard = ({ icon, title, subtitle, children, action }) => (
  <section
    className='flex flex-col w-full'
    style={{ ...PHARMACY_WORKLIST_CARD, padding: 'var(--dim-space-600)', gap: 'var(--dim-space-400)' }}
  >
    <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-300)' }}>
      <div
        className='shrink-0 inline-flex items-center justify-center'
        style={{ width: 'var(--dim-size-800, 40px)', height: 'var(--dim-size-800, 40px)', borderRadius: 'var(--dim-radius-300, 10px)', background: 'var(--surface-brandPrimary-quaternary)', color: 'var(--text-brandPrimary-default)' }}
      >
        <Icon name={icon} size={20} />
      </div>
      <div className='flex-1 min-w-0 flex flex-col'>
        <h2 className='text-base font-bold text-ink'>{title}</h2>
        {subtitle && <p className='text-xs text-ink-tertiary'>{subtitle}</p>}
      </div>
      {action}
    </div>
    {children}
  </section>
);

const OptionCard = ({ label, icon = 'category', selected, onSelect }) => (
  <SelectableCardButton
    selected={selected}
    onClick={onSelect}
    ariaLabel={label}
    className='w-full justify-start'
    minHeight={48}
  >
    <Icon name={icon} size={18} style={{ color: selected ? 'var(--text-brandPrimary-default)' : 'var(--text-content-tertiary)' }} />
    <span className='flex-1 min-w-0 text-sm font-bold text-left' style={{ color: selected ? 'var(--text-brandPrimary-default)' : 'var(--text-content-primary)' }}>
      {label}
    </span>
    {selected ? <Icon name='check_circle' size={18} style={{ color: 'var(--text-brandPrimary-default)' }} /> : null}
  </SelectableCardButton>
);

const PharmacyRegistryEditPage = () => {
  const { id } = useParams();
  const history = useHistory();
  const isNew = !id || id === 'new';
  const existing = isNew ? null : getRegistryDrugById(id);
  const base = existing || BLANK_DRUG;

  const [form, setForm] = useState(() => ({
    ...base,
    rightsEligible: [...(base.rightsEligible || [])],
    priceSchedule: (base.priceSchedule || []).map((p) => ({ ...p })),
    usageRate: { ...(base.usageRate || BLANK_DRUG.usageRate) },
    disallowedChronicDiseases: [...(base.disallowedChronicDiseases || [])],
    restrictedToDoctorGroup: base.restrictedToDoctorGroup || '',
  }));
  const [saved, setSaved] = useState(false);
  const [step, setStep] = useState(0);

  const step0Valid = Boolean(form.name.trim());
  const step1Valid = Boolean(form.packSize > 0);
  const step2Valid = form.rightsEligible.length > 0;
  const completedSteps = [step0Valid, step1Valid, step2Valid, false];
  const canAdvance = step === 0 ? step0Valid : step === 1 ? step1Valid : step === 2 ? step2Valid : step0Valid;

  const handleStepClick = useCallback(
    (idx) => { if (canNavigateToStep(idx, step, completedSteps)) setStep(idx); },
    [step, step0Valid, step1Valid, step2Valid],
  );

  const goNext = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
      window.scrollTo?.({ top: 0 });
      return;
    }
    handleSave();
  };

  const goBack = () => {
    if (step > 0) {
      setStep(step - 1);
      window.scrollTo?.({ top: 0 });
      return;
    }
    history.push('/pharmacy/registry');
  };

  const nextLabel = useMemo(() => {
    if (step === 0) return 'ถัดไป: หน่วยและประเภท';
    if (step === 1) return 'ถัดไป: สิทธิและข้อจำกัด';
    if (step === 2) return 'ถัดไป: ราคาและตรวจสอบ';
    return isNew ? 'สร้างรายการยา' : 'บันทึกการเปลี่ยนแปลง';
  }, [step, isNew]);

  const summaryLine = useMemo(() => {
    const cls = DRUG_CLASSIFICATIONS.find((c) => c.key === form.classification)?.label || '—';
    const unit = UNIT_TYPES.find((u) => u.key === form.unit)?.label || form.unit;
    return `${form.name.trim() || 'ยังไม่ระบุชื่อยา'} · ${cls} · ${form.rightsEligible.length} สิทธิ · ${unit}${form.highAlert ? ' · High Alert' : ''}`;
  }, [form.name, form.classification, form.rightsEligible.length, form.unit, form.highAlert]);

  const setField = (key, v) => setForm((prev) => ({ ...prev, [key]: v }));
  const setUsageRateField = (key, v) => setForm((prev) => ({ ...prev, usageRate: { ...prev.usageRate, [key]: Number(v) || 0 } }));
  const toggleRight = (right) => setForm((prev) => ({
    ...prev,
    rightsEligible: prev.rightsEligible.includes(right)
      ? prev.rightsEligible.filter((r) => r !== right)
      : [...prev.rightsEligible, right],
  }));
  const [newDisease, setNewDisease] = useState('');
  const addDisallowedDisease = () => {
    if (!newDisease.trim()) return;
    setForm((prev) => ({ ...prev, disallowedChronicDiseases: [...prev.disallowedChronicDiseases, newDisease.trim()] }));
    setNewDisease('');
  };
  const removeDisallowedDisease = (disease) => setForm((prev) => ({
    ...prev,
    disallowedChronicDiseases: prev.disallowedChronicDiseases.filter((d) => d !== disease),
  }));
  const updatePriceRow = (idx, key, value) => setForm((prev) => ({
    ...prev,
    priceSchedule: prev.priceSchedule.map((p, i) => (i === idx ? { ...p, [key]: value } : p)),
  }));
  const addPriceRow = () => setForm((prev) => ({
    ...prev,
    priceSchedule: [...prev.priceSchedule, { id: `p-new-${prev.priceSchedule.length + 1}`, effectiveFrom: new Date().toISOString().slice(0, 10), effectiveTo: null, price: 0 }],
  }));

  if (!isNew && !existing) {
    return (
      <QueuePageShell
        activeKey='pharmacy'
        breadcrumb={['ระบบงานเภสัชกรรม', 'ทะเบียนยา', 'ไม่พบรายการยา']}
        title='ไม่พบรายการยา'
        onBack={() => history.push('/pharmacy/registry')}
        backLabel='กลับไปยังทะเบียนยา'
      >
        <div
          className='flex flex-1 items-center justify-center text-ink-tertiary'
          style={{ padding: 'var(--dim-space-600, 24px)' }}
        >
          ไม่พบรายการยาที่ตรงกับลิงก์นี้
        </div>
      </QueuePageShell>
    );
  }

  const breadcrumb = ['ระบบงานเภสัชกรรม', 'ทะเบียนยา', isNew ? 'เพิ่มทะเบียนยา' : form.name || 'แก้ไขรายการยา'];
  const replacementOptions = DRUG_REGISTRY.filter((d) => d.id !== form.id);

  const handleSave = () => {
    if (!form.name.trim()) return;
    upsertRegistryDrug(form);
    setSaved(true);
    setTimeout(() => history.push('/pharmacy/registry'), 700);
  };

  return (
    <>
      <QueuePageShell
        activeKey='pharmacy'
        breadcrumb={breadcrumb}
        {...WIZARD_MORPH_SHELL_PROPS}
        headerInfo={(
          <WizardMorphHeader
            title={isNew ? 'เพิ่มทะเบียนยา' : (form.name || 'แก้ไขรายการยา')}
            steps={STEPS}
            current={step}
            onStepClick={handleStepClick}
            completedSteps={completedSteps}
          />
        )}
      >
        <div
          className='flex flex-col flex-1 min-w-0'
          style={{ padding: 'var(--dim-space-600)', gap: 'var(--dim-space-400)', paddingBottom: 96 }}
        >
          {step === 0 && (
          <SectionCard
            icon='medication'
            title='ข้อมูลพื้นฐาน'
            subtitle='ชื่อยา ชื่อสามัญ ชื่อการค้า และสถานะการใช้งาน'
            action={
              <Checkbox
                checked={form.active}
                onChange={(v) => setField('active', v)}
                label='ใช้งาน'
              />
            }
          >
            <div
              className='grid grid-cols-1 md:grid-cols-4 w-full min-w-0'
              style={{ gap: 'var(--dim-space-300, 12px)' }}
            >
              <InputField label='รหัสยา' value={form.code} onChange={(v) => setField('code', v)} placeholder='เช่น MED-0001' showHelperText={false} />
              <InputField label='ชื่อยา (แสดงในระบบ)' required value={form.name} onChange={(v) => setField('name', v)} placeholder='เช่น Paracetamol 500 mg' showHelperText={false} />
              <InputField label='ชื่อสามัญ (Generic name)' value={form.genericName} onChange={(v) => setField('genericName', v)} placeholder='เช่น Paracetamol' showHelperText={false} />
              <InputField label='ชื่อการค้า (Trade name)' value={form.tradeName} onChange={(v) => setField('tradeName', v)} placeholder='ถ้ามี' showHelperText={false} />
            </div>
            <div
              className='grid grid-cols-1 md:grid-cols-2 w-full min-w-0'
              style={{ gap: 'var(--dim-space-300, 12px)' }}
            >
              <DatePicker
                label='วันที่เริ่มจำหน่ายยาในสถานพยาบาล'
                value={dateFromIso(form.activeFrom)}
                onChange={(d) => setField('activeFrom', isoFromDate(d) || '')}
                placeholder='เลือกวันที่'
                showHelperText={false}
              />
              <DatePicker
                label='วันที่ตัดรายการยาออกจากสถานพยาบาล (ถ้ามี)'
                value={dateFromIso(form.activeTo)}
                onChange={(d) => setField('activeTo', isoFromDate(d))}
                placeholder='เลือกวันที่'
                showHelperText={false}
              />
            </div>
          </SectionCard>
          )}

          {step === 1 && (
          <>
          <SectionCard icon='straighten' title='หน่วยนับและอัตราแปลง' subtitle='หน่วยจ่ายหลักของรายการยานี้ — พร้อมอัตราแปลงหน่วยเฉพาะของยารายการนี้'>
            <div className='grid w-full' style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 'var(--dim-space-300)' }}>
              {UNIT_TYPES.map((u) => (
                <OptionCard key={u.key} icon='straighten' label={u.label} selected={form.unit === u.key} onSelect={() => setField('unit', u.key)} />
              ))}
            </div>
            <div
              className='grid grid-cols-1 md:grid-cols-2 w-full min-w-0'
              style={{ gap: 'var(--dim-space-300, 12px)' }}
            >
              <InputField
                label={`ขนาดบรรจุต่อกล่อง (1 กล่อง = ? ${UNIT_TYPES.find((u) => u.key === form.unit)?.label})`}
                type='number'
                value={form.packSize ? String(form.packSize) : ''}
                onChange={(v) => setField('packSize', Number(v) || 0)}
                placeholder='เช่น 100'
                showHelperText={false}
              />
              <div className='flex flex-col justify-end' style={{ gap: 'var(--dim-space-150)' }}>
                <span className='text-xs text-ink-tertiary'>
                  อัตราแปลงของรายการนี้: 1 กล่อง = {form.packSize || 0} {UNIT_TYPES.find((u) => u.key === form.unit)?.label}
                </span>
              </div>
            </div>
            <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-150)' }}>
              <span className='text-xs text-ink-tertiary'>ตารางอัตราแปลงหน่วยอื่น ๆ (ใช้ร่วมกันทั้งระบบ — สำหรับหน่วยที่ไม่ใช่กล่อง/เม็ด-แคปซูล)</span>
              {UNIT_CONVERSIONS.map((c, i) => (
                <span key={i} className='text-xs text-ink-secondary'>
                  1 {UNIT_TYPES.find((u) => u.key === c.fromUnit)?.label} = {c.factor} {UNIT_TYPES.find((u) => u.key === c.toUnit)?.label} ({c.note})
                </span>
              ))}
            </div>
          </SectionCard>

          <SectionCard icon='category' title='การจัดประเภทยา' subtitle='บัญชียาหลักแห่งชาติ / วัตถุออกฤทธิ์ต่อจิตและประสาท และรายการยาเสี่ยงสูง (High Alert Drug)'>
            <div className='grid w-full' style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 'var(--dim-space-300)' }}>
              {DRUG_CLASSIFICATIONS.map((c) => (
                <OptionCard key={c.key} icon='category' label={c.label} selected={form.classification === c.key} onSelect={() => setField('classification', c.key)} />
              ))}
            </div>
            <div
              className='w-fit max-w-full'
              style={{
                ...PHARMACY_NESTED_PANEL,
                padding: 'var(--dim-space-300)',
                ...(form.highAlert ? { background: 'var(--surface-alert-warning)' } : null),
              }}
            >
              <Checkbox
                checked={form.highAlert}
                onChange={(v) => setField('highAlert', v)}
                label='เป็นยาเสี่ยงสูง (High Alert Drug) — ระบบจะแจ้งเตือนทุกครั้งก่อนจ่าย'
              />
            </div>
          </SectionCard>
          </>
          )}

          {step === 2 && (
          <>
          <SectionCard icon='verified_user' title='สิทธิที่เบิกได้' subtitle={`เลือกสิทธิการรักษาที่สามารถเบิกจ่ายยานี้ได้ — ${form.rightsEligible.length} สิทธิที่เลือก`}>
            <div className='flex flex-wrap w-full' style={{ gap: 'var(--dim-space-200)' }}>
              {RIGHTS_LIST.map((r) => (
                <SelectableTag
                  key={r}
                  label={r}
                  selected={form.rightsEligible.includes(r)}
                  onClick={() => toggleRight(r)}
                  size='md'
                />
              ))}
            </div>
          </SectionCard>

          <SectionCard icon='factory' title='ผู้ผลิต/ผู้จำหน่าย และอัตราการใช้' subtitle='กำหนดผู้ผลิต ผู้จำหน่าย และอัตราการใช้เฉลี่ยต่อเดือนเพื่อคำนวณจุดสั่งซื้อ'>
            <div
              className='grid grid-cols-1 md:grid-cols-2 w-full min-w-0'
              style={{ gap: 'var(--dim-space-300, 12px)' }}
            >
              <InputField label='ผู้ผลิต' value={form.manufacturer} onChange={(v) => setField('manufacturer', v)} placeholder='เช่น องค์การเภสัชกรรม (GPO)' showHelperText={false} />
              <InputField label='ผู้จำหน่าย' value={form.distributor} onChange={(v) => setField('distributor', v)} placeholder='เช่น บริษัท ดีเคเอสเอช (ประเทศไทย) จำกัด' showHelperText={false} />
            </div>
            <div
              className='grid grid-cols-2 md:grid-cols-4 w-full min-w-0'
              style={{ gap: 'var(--dim-space-300, 12px)' }}
            >
              {[
                ['avgPerMonth', 'อัตราการใช้เฉลี่ย/เดือน'],
                ['maxQty', 'ปริมาณสูงสุด'],
                ['minQty', 'ปริมาณต่ำสุด'],
                ['reorderPoint', 'ปริมาณถึงระดับสั่งซื้อ'],
              ].map(([key, label]) => (
                <InputField
                  key={key}
                  label={label}
                  type='number'
                  value={form.usageRate[key] ? String(form.usageRate[key]) : ''}
                  onChange={(v) => setUsageRateField(key, v)}
                  showHelperText={false}
                />
              ))}
            </div>
          </SectionCard>

          <SectionCard icon='block' title='ข้อจำกัดการสั่งจ่าย' subtitle='โรคประจำตัวที่ไม่อนุญาตให้จ่าย และกลุ่มแพทย์เฉพาะที่อนุญาตให้สั่ง (ถ้ามี)'>
            <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200)' }}>
              <span className='text-xs text-ink-secondary'>โรคประจำตัวที่ไม่อนุญาตให้จ่าย</span>
              <div className='flex flex-wrap w-full' style={{ gap: 'var(--dim-space-200)' }}>
                {form.disallowedChronicDiseases.map((d) => (
                  <span
                    key={d}
                    className='inline-flex items-center'
                    style={{ gap: 'var(--dim-space-150)', height: 'var(--dim-size-600, 32px)', padding: '0 var(--dim-space-300)', borderRadius: 'var(--dim-radius-full)', background: 'var(--surface-alert-error)', color: 'var(--text-alert-error)', fontSize: 'var(--type-size-sm)' }}
                  >
                    {d}
                    <button type='button' onClick={() => removeDisallowedDisease(d)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'inherit' }}>
                      <Icon name='close' size={14} />
                    </button>
                  </span>
                ))}
              </div>
              <div className='flex items-end w-full min-w-0' style={{ gap: 'var(--dim-space-200)' }}>
                <div className='flex-1 min-w-0'>
                  <InputField
                    label='เพิ่มโรคประจำตัวที่ไม่อนุญาต'
                    value={newDisease}
                    onChange={setNewDisease}
                    placeholder='เช่น โรคไตเรื้อรัง ระยะ 3–4 (CKD)'
                    showHelperText={false}
                  />
                </div>
                <NeutralSubdueButton variant='outline' size='sm' leadingIcon='add' onClick={addDisallowedDisease}>เพิ่ม</NeutralSubdueButton>
              </div>
            </div>
            <InputField
              label='กลุ่มแพทย์เฉพาะที่อนุญาตให้สั่ง (เว้นว่างถ้าไม่จำกัด)'
              value={form.restrictedToDoctorGroup}
              onChange={(v) => setField('restrictedToDoctorGroup', v)}
              placeholder='เช่น แพทย์ผิวหนัง / อายุรกรรม'
              showHelperText={false}
            />
          </SectionCard>
          </>
          )}

          {step === 3 && (
          <>
          <SectionCard icon='payments' title='ราคาและช่วงเวลามีผล' subtitle='ปรับราคายาล่วงหน้าได้โดยกำหนดวันที่เริ่มต้นและวันที่สิ้นสุด' action={
            <NeutralSubdueButton variant='outline' size='sm' leadingIcon='add' onClick={addPriceRow}>เพิ่มช่วงราคา</NeutralSubdueButton>
          }>
            <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200)' }}>
              {form.priceSchedule.map((p, i) => (
                <div key={p.id} className='flex flex-wrap items-end w-full' style={{ ...PHARMACY_NESTED_PANEL, gap: 'var(--dim-space-300)', padding: 'var(--dim-space-300)' }}>
                  <DatePicker
                    label='เริ่มมีผล'
                    value={dateFromIso(p.effectiveFrom)}
                    onChange={(d) => updatePriceRow(i, 'effectiveFrom', isoFromDate(d) || '')}
                    placeholder='เลือกวันที่'
                    showHelperText={false}
                  />
                  <DatePicker
                    label='สิ้นสุด (ถ้ามี)'
                    value={dateFromIso(p.effectiveTo)}
                    onChange={(d) => updatePriceRow(i, 'effectiveTo', isoFromDate(d))}
                    placeholder='เลือกวันที่'
                    showHelperText={false}
                  />
                  <InputField
                    label='ราคา (บาท)'
                    type='number'
                    value={p.price != null ? String(p.price) : ''}
                    onChange={(v) => updatePriceRow(i, 'price', Number(v) || 0)}
                    showHelperText={false}
                    style={{ width: 'var(--dim-size-1800, 96px)' }}
                  />
                </div>
              ))}
            </div>
          </SectionCard>

          {!isNew && (
            <SectionCard icon='block' title='ปิดใช้งานและรายการทดแทน' subtitle='เมื่อปิดใช้งานรายการยานี้ สามารถตั้งค่ารายการทดแทนไว้ล่วงหน้าได้ (ToR §1.9.10)'>
              <div className='w-full md:w-1/2 min-w-0'>
                <Select
                  label='รายการทดแทน'
                  value={form.replacementId || ''}
                  onChange={(v) => setField('replacementId', v)}
                  searchable={false}
                  showHelperText={false}
                  options={[
                    { value: '', label: '— ไม่กำหนดรายการทดแทน —' },
                    ...replacementOptions.map((d) => ({ value: d.id, label: d.name })),
                  ]}
                />
              </div>
            </SectionCard>
          )}

          <SectionCard icon='fact_check' title='ตรวจสอบก่อนบันทึก' subtitle='สรุปข้อมูลทะเบียนยาก่อนสร้างรายการในระบบ'>
            <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
              {[
                ['ชื่อยา', form.name || '—'],
                ['รหัสยา', form.code || '—'],
                ['ชื่อสามัญ', form.genericName || '—'],
                ['หน่วยจ่าย', UNIT_TYPES.find((u) => u.key === form.unit)?.label || '—'],
                ['การจัดประเภท', DRUG_CLASSIFICATIONS.find((c) => c.key === form.classification)?.label || '—'],
                ['สิทธิที่เบิกได้', `${form.rightsEligible.length} สิทธิ`],
                ['ราคาปัจจุบัน', form.priceSchedule?.[0]?.price != null ? `${form.priceSchedule[0].price.toLocaleString('th-TH')} บาท` : '—'],
                ['สถานะ', form.active ? 'ใช้งาน' : 'ปิดใช้งาน'],
              ].map(([label, value]) => (
                <div key={label} className='flex flex-wrap items-baseline w-full' style={{ gap: 'var(--dim-space-200)' }}>
                  <span className='text-xs text-ink-tertiary shrink-0' style={{ minWidth: 'var(--dim-size-2000, 120px)' }}>{label}</span>
                  <span className='text-sm text-ink-secondary'>{value}</span>
                </div>
              ))}
            </div>
          </SectionCard>
          </>
          )}
        </div>

        <div
          className={`sticky bottom-0 z-10 flex items-center w-full ${MIH_CHROME_MORPH_FOOTER}`}
          style={{
            background: 'var(--surface-card-100)',
            borderTop: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
            boxShadow: '0 -2px 8px rgba(8,167,104,0.06)',
            padding: 'var(--dim-space-400) var(--dim-space-600)',
            gap: 'var(--dim-space-600)',
          }}
        >
          {step > 0 ? (
            <NeutralSubdueButton
              size='lg'
              leadingIcon='arrow_back'
              onClick={goBack}
              className='shrink-0'
            >
              ย้อนกลับ
            </NeutralSubdueButton>
          ) : (
            <NeutralSubdueButton size='lg' onClick={() => history.push('/pharmacy/registry')} className='shrink-0'>
              ยกเลิก
            </NeutralSubdueButton>
          )}
          <div className='flex items-center min-w-0 flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
            <span style={{ width: 8, height: 8, borderRadius: 'var(--dim-radius-full)', background: 'var(--surface-positive-secondary, #A2EDDE)' }} />
            <span className='truncate' style={{ color: 'var(--text-content-secondary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)' }}>
              {summaryLine}
            </span>
          </div>
          <div className='flex-1' />
          <div className='flex items-center shrink-0' style={{ gap: 'var(--dim-space-300)' }}>
            {step > 0 && (
              <NeutralSubdueButton size='lg' onClick={() => history.push('/pharmacy/registry')}>
                ยกเลิก
              </NeutralSubdueButton>
            )}
            <BrandButton variant='fill' size='lg' trailingIcon={step < STEPS.length - 1 ? 'arrow_forward' : 'save'} disabled={!canAdvance} onClick={goNext}>
              {nextLabel}
            </BrandButton>
          </div>
        </div>
      </QueuePageShell>
      <SuccessToast open={saved} message={isNew ? 'สร้างรายการยาสำเร็จ' : 'บันทึกการเปลี่ยนแปลงสำเร็จ'} onClose={() => setSaved(false)} />
    </>
  );
};

export default PharmacyRegistryEditPage;
