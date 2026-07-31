import React, { useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Icon from '@/components/icons/Icon';
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

/* Drug Registry add/edit page (ToR §1.9.1 + §1.9.10 settings). Mirrors
   `UserEditPage.jsx`'s SectionCard / radio-card / chip-multiselect /
   sticky-footer-save template exactly — same admin edit-page shape,
   drug fields instead of user/role/feature fields. */

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
    className='bg-surface-card rounded-card flex flex-col w-full'
    style={{ padding: 'var(--dim-space-600)', gap: 'var(--dim-space-400)', boxShadow: 'var(--shadow-card-strong)' }}
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

const TextField = ({ label, value, onChange, placeholder, required }) => (
  <label className='flex flex-col' style={{ gap: 'var(--dim-space-150)' }}>
    <span className='text-xs text-ink-secondary'>{label} {required && <span style={{ color: 'var(--text-input-require)' }}>*</span>}</span>
    <input
      type='text'
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{ width: '100%', padding: 'var(--dim-space-150) var(--dim-space-300)', background: 'var(--surface-input-default)', border: 'var(--dim-stroke-100) solid var(--border-input-default)', borderRadius: 'var(--dim-radius-200)', fontSize: 'var(--type-size-sm)', outline: 'none' }}
    />
  </label>
);

const RadioCard = ({ label, icon = 'category', selected, onSelect }) => (
  <button
    type='button'
    onClick={onSelect}
    className='flex items-center w-full text-left transition-shadow'
    style={{
      gap: 'var(--dim-space-200)', padding: 'var(--dim-space-300)',
      background: selected ? 'var(--surface-brandPrimary-quaternary)' : 'var(--surface-card-100)',
      border: `var(--dim-stroke-100) solid ${selected ? 'var(--border-brandPrimary-default)' : 'var(--border-card-default)'}`,
      borderRadius: 'var(--dim-radius-200)', cursor: 'pointer',
    }}
  >
    <Icon name={icon} size={18} style={{ color: selected ? 'var(--text-brandPrimary-default)' : 'var(--text-content-tertiary)' }} />
    <span className='flex-1 min-w-0 text-sm font-bold' style={{ color: selected ? 'var(--text-brandPrimary-default)' : 'var(--text-content-primary)' }}>{label}</span>
    {selected && <Icon name='check_circle' size={18} style={{ color: 'var(--text-brandPrimary-default)' }} />}
  </button>
);

const Chip = ({ label, selected, onToggle }) => (
  <button
    type='button'
    onClick={onToggle}
    className='inline-flex items-center text-left'
    style={{
      gap: 'var(--dim-space-200)', minHeight: 'var(--dim-size-700, 36px)', padding: 'var(--dim-space-200) var(--dim-space-300)',
      background: selected ? 'var(--surface-brandPrimary-quaternary)' : 'var(--surface-card-100)',
      border: `var(--dim-stroke-100) solid ${selected ? 'var(--border-brandPrimary-default)' : 'var(--border-card-default)'}`,
      borderRadius: 'var(--dim-radius-full)',
      color: selected ? 'var(--text-brandPrimary-default)' : 'var(--text-content-secondary)',
      fontSize: 'var(--type-size-sm)', cursor: 'pointer',
    }}
  >
    <Icon name={selected ? 'check' : 'add'} size={14} />
    {label}
  </button>
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
      <div className='min-h-screen w-full flex bg-brand-50'>
        <Sidebar activeKey='pharmacy' />
        <main className='flex-1 flex flex-col min-w-0'>
          <Header breadcrumb={['ระบบงานเภสัชกรรม', 'ทะเบียนยา', 'ไม่พบรายการยา']} />
          <div className='flex flex-1 items-center justify-center text-ink-tertiary'>ไม่พบรายการยาที่ตรงกับลิงก์นี้</div>
        </main>
      </div>
    );
  }

  const breadcrumb = ['ระบบงานเภสัชกรรม', 'ทะเบียนยา', isNew ? 'เพิ่มยาใหม่' : form.name || 'แก้ไขรายการยา'];
  const replacementOptions = DRUG_REGISTRY.filter((d) => d.id !== form.id);

  const handleSave = () => {
    if (!form.name.trim()) return;
    upsertRegistryDrug(form);
    setSaved(true);
    setTimeout(() => history.push('/pharmacy/registry'), 700);
  };

  return (
    <div className='min-h-screen w-full flex bg-brand-50'>
      <Sidebar activeKey='pharmacy' />
      <main className='flex-1 flex flex-col min-w-0'>
        <Header breadcrumb={breadcrumb} />
        <div className='p-3 md:p-6 flex-1 flex flex-col' style={{ gap: 'var(--dim-space-500)' }}>
          <div>
            <button
              type='button'
              onClick={() => history.push('/pharmacy/registry')}
              className='inline-flex items-center gap-1 text-sm text-ink-secondary hover:text-brand-500'
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 'var(--dim-space-0)' }}
            >
              <Icon name='chevron-left' size={16} />
              กลับไปยังทะเบียนยา
            </button>
          </div>

          <SectionCard
            icon='medication'
            title={isNew ? 'เพิ่มยาใหม่' : 'ข้อมูลพื้นฐาน'}
            subtitle='ชื่อยา ชื่อสามัญ ชื่อการค้า และสถานะการใช้งาน'
            action={
              <label className='inline-flex items-center cursor-pointer' style={{ gap: 'var(--dim-space-200)' }}>
                <input
                  type='checkbox'
                  checked={form.active}
                  onChange={(e) => setField('active', e.target.checked)}
                  style={{ width: 'var(--dim-size-300, 16px)', height: 'var(--dim-size-300, 16px)', accentColor: 'var(--surface-brandPrimary-default)' }}
                />
                <span className='text-sm text-ink-secondary'>ใช้งาน</span>
              </label>
            }
          >
            <div className='grid grid-cols-1 md:grid-cols-4 gap-3 w-full'>
              <TextField label='รหัสยา' value={form.code} onChange={(v) => setField('code', v)} placeholder='เช่น MED-0001' />
              <TextField label='ชื่อยา (แสดงในระบบ)' required value={form.name} onChange={(v) => setField('name', v)} placeholder='เช่น Paracetamol 500 mg' />
              <TextField label='ชื่อสามัญ (Generic name)' value={form.genericName} onChange={(v) => setField('genericName', v)} placeholder='เช่น Paracetamol' />
              <TextField label='ชื่อการค้า (Trade name)' value={form.tradeName} onChange={(v) => setField('tradeName', v)} placeholder='ถ้ามี' />
            </div>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-3 w-full'>
              <label className='flex flex-col' style={{ gap: 'var(--dim-space-150)' }}>
                <span className='text-xs text-ink-secondary'>วันที่เริ่มจำหน่ายยาในสถานพยาบาล</span>
                <input
                  type='date' value={form.activeFrom || ''} onChange={(e) => setField('activeFrom', e.target.value)}
                  style={{ width: '100%', padding: 'var(--dim-space-150) var(--dim-space-300)', background: 'var(--surface-input-default)', border: 'var(--dim-stroke-100) solid var(--border-input-default)', borderRadius: 'var(--dim-radius-200)', fontSize: 'var(--type-size-sm)', outline: 'none' }}
                />
              </label>
              <label className='flex flex-col' style={{ gap: 'var(--dim-space-150)' }}>
                <span className='text-xs text-ink-secondary'>วันที่ตัดรายการยาออกจากสถานพยาบาล (ถ้ามี)</span>
                <input
                  type='date' value={form.activeTo || ''} onChange={(e) => setField('activeTo', e.target.value || null)}
                  style={{ width: '100%', padding: 'var(--dim-space-150) var(--dim-space-300)', background: 'var(--surface-input-default)', border: 'var(--dim-stroke-100) solid var(--border-input-default)', borderRadius: 'var(--dim-radius-200)', fontSize: 'var(--type-size-sm)', outline: 'none' }}
                />
              </label>
            </div>
          </SectionCard>

          <SectionCard icon='straighten' title='หน่วยนับและอัตราแปลง' subtitle='หน่วยจ่ายหลักของรายการยานี้ — พร้อมอัตราแปลงหน่วยเฉพาะของยารายการนี้'>
            <div className='grid w-full' style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 'var(--dim-space-300)' }}>
              {UNIT_TYPES.map((u) => (
                <RadioCard key={u.key} icon='straighten' label={u.label} selected={form.unit === u.key} onSelect={() => setField('unit', u.key)} />
              ))}
            </div>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-3 w-full'>
              <label className='flex flex-col' style={{ gap: 'var(--dim-space-150)' }}>
                <span className='text-xs text-ink-secondary'>ขนาดบรรจุต่อกล่อง (1 กล่อง = ? {UNIT_TYPES.find((u) => u.key === form.unit)?.label})</span>
                <input
                  type='number' min='1' value={form.packSize || ''}
                  onChange={(e) => setField('packSize', Number(e.target.value) || 0)}
                  placeholder='เช่น 100'
                  style={{ width: '100%', padding: 'var(--dim-space-150) var(--dim-space-300)', background: 'var(--surface-input-default)', border: 'var(--dim-stroke-100) solid var(--border-input-default)', borderRadius: 'var(--dim-radius-200)', fontSize: 'var(--type-size-sm)', outline: 'none' }}
                />
              </label>
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
                <RadioCard key={c.key} icon='category' label={c.label} selected={form.classification === c.key} onSelect={() => setField('classification', c.key)} />
              ))}
            </div>
            <label
              className='inline-flex items-center cursor-pointer w-fit'
              style={{ gap: 'var(--dim-space-200)', padding: 'var(--dim-space-300)', background: form.highAlert ? 'var(--surface-alert-warning)' : 'var(--surface-card-100)', border: 'var(--dim-stroke-100) solid var(--border-card-default)', borderRadius: 'var(--dim-radius-200)' }}
            >
              <input
                type='checkbox'
                checked={form.highAlert}
                onChange={(e) => setField('highAlert', e.target.checked)}
                style={{ width: 'var(--dim-size-300, 16px)', height: 'var(--dim-size-300, 16px)', accentColor: 'var(--surface-brandPrimary-default)' }}
              />
              <span className='text-sm text-ink-secondary'>เป็นยาเสี่ยงสูง (High Alert Drug) — ระบบจะแจ้งเตือนทุกครั้งก่อนจ่าย</span>
            </label>
          </SectionCard>

          <SectionCard icon='verified_user' title='สิทธิที่เบิกได้' subtitle={`เลือกสิทธิการรักษาที่สามารถเบิกจ่ายยานี้ได้ — ${form.rightsEligible.length} สิทธิที่เลือก`}>
            <div className='flex flex-wrap w-full' style={{ gap: 'var(--dim-space-200)' }}>
              {RIGHTS_LIST.map((r) => (
                <Chip key={r} label={r} selected={form.rightsEligible.includes(r)} onToggle={() => toggleRight(r)} />
              ))}
            </div>
          </SectionCard>

          <SectionCard icon='factory' title='ผู้ผลิต/ผู้จำหน่าย และอัตราการใช้' subtitle='กำหนดผู้ผลิต ผู้จำหน่าย และอัตราการใช้เฉลี่ยต่อเดือนเพื่อคำนวณจุดสั่งซื้อ'>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-3 w-full'>
              <TextField label='ผู้ผลิต' value={form.manufacturer} onChange={(v) => setField('manufacturer', v)} placeholder='เช่น องค์การเภสัชกรรม (GPO)' />
              <TextField label='ผู้จำหน่าย' value={form.distributor} onChange={(v) => setField('distributor', v)} placeholder='เช่น บริษัท ดีเคเอสเอช (ประเทศไทย) จำกัด' />
            </div>
            <div className='grid grid-cols-2 md:grid-cols-4 gap-3 w-full'>
              {[
                ['avgPerMonth', 'อัตราการใช้เฉลี่ย/เดือน'],
                ['maxQty', 'ปริมาณสูงสุด'],
                ['minQty', 'ปริมาณต่ำสุด'],
                ['reorderPoint', 'ปริมาณถึงระดับสั่งซื้อ'],
              ].map(([key, label]) => (
                <label key={key} className='flex flex-col' style={{ gap: 'var(--dim-space-150)' }}>
                  <span className='text-xs text-ink-secondary'>{label}</span>
                  <input
                    type='number' min='0' value={form.usageRate[key]}
                    onChange={(e) => setUsageRateField(key, e.target.value)}
                    style={{ width: '100%', padding: 'var(--dim-space-150) var(--dim-space-300)', background: 'var(--surface-input-default)', border: 'var(--dim-stroke-100) solid var(--border-input-default)', borderRadius: 'var(--dim-radius-200)', fontSize: 'var(--type-size-sm)', outline: 'none' }}
                  />
                </label>
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
              <div className='flex items-end' style={{ gap: 'var(--dim-space-200)' }}>
                <TextField label='เพิ่มโรคประจำตัวที่ไม่อนุญาต' value={newDisease} onChange={setNewDisease} placeholder='เช่น โรคไตเรื้อรัง ระยะ 3–4 (CKD)' />
                <NeutralSubdueButton variant='outline' size='sm' leadingIcon='add' onClick={addDisallowedDisease}>เพิ่ม</NeutralSubdueButton>
              </div>
            </div>
            <TextField label='กลุ่มแพทย์เฉพาะที่อนุญาตให้สั่ง (เว้นว่างถ้าไม่จำกัด)' value={form.restrictedToDoctorGroup} onChange={(v) => setField('restrictedToDoctorGroup', v)} placeholder='เช่น แพทย์ผิวหนัง / อายุรกรรม' />
          </SectionCard>

          <SectionCard icon='payments' title='ราคาและช่วงเวลามีผล' subtitle='ปรับราคายาล่วงหน้าได้โดยกำหนดวันที่เริ่มต้นและวันที่สิ้นสุด' action={
            <NeutralSubdueButton variant='outline' size='sm' leadingIcon='add' onClick={addPriceRow}>เพิ่มช่วงราคา</NeutralSubdueButton>
          }>
            <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200)' }}>
              {form.priceSchedule.map((p, i) => (
                <div key={p.id} className='flex flex-wrap items-center w-full' style={{ gap: 'var(--dim-space-300)', padding: 'var(--dim-space-300)', background: 'var(--surface-card-100)', border: 'var(--dim-stroke-100) solid var(--border-card-default)', borderRadius: 'var(--dim-radius-200)' }}>
                  <label className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
                    <span className='text-xs text-ink-tertiary'>เริ่มมีผล</span>
                    <input type='date' value={p.effectiveFrom} onChange={(e) => updatePriceRow(i, 'effectiveFrom', e.target.value)} style={{ padding: 'var(--dim-space-150) var(--dim-space-300)', background: 'var(--surface-input-default)', border: 'var(--dim-stroke-100) solid var(--border-input-default)', borderRadius: 'var(--dim-radius-200)', fontSize: 'var(--type-size-sm)' }} />
                  </label>
                  <label className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
                    <span className='text-xs text-ink-tertiary'>สิ้นสุด (ถ้ามี)</span>
                    <input type='date' value={p.effectiveTo || ''} onChange={(e) => updatePriceRow(i, 'effectiveTo', e.target.value || null)} style={{ padding: 'var(--dim-space-150) var(--dim-space-300)', background: 'var(--surface-input-default)', border: 'var(--dim-stroke-100) solid var(--border-input-default)', borderRadius: 'var(--dim-radius-200)', fontSize: 'var(--type-size-sm)' }} />
                  </label>
                  <label className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
                    <span className='text-xs text-ink-tertiary'>ราคา (บาท)</span>
                    <input type='number' min='0' value={p.price} onChange={(e) => updatePriceRow(i, 'price', Number(e.target.value))} style={{ width: 'var(--dim-size-1800, 96px)', padding: 'var(--dim-space-150) var(--dim-space-300)', background: 'var(--surface-input-default)', border: 'var(--dim-stroke-100) solid var(--border-input-default)', borderRadius: 'var(--dim-radius-200)', fontSize: 'var(--type-size-sm)' }} />
                  </label>
                </div>
              ))}
            </div>
          </SectionCard>

          {!isNew && (
            <SectionCard icon='block' title='ปิดใช้งานและรายการทดแทน' subtitle='เมื่อปิดใช้งานรายการยานี้ สามารถตั้งค่ารายการทดแทนไว้ล่วงหน้าได้ (ToR §1.9.10)'>
              <label className='flex flex-col w-full md:w-1/2' style={{ gap: 'var(--dim-space-150)' }}>
                <span className='text-xs text-ink-secondary'>รายการทดแทน</span>
                <select
                  value={form.replacementId || ''}
                  onChange={(e) => setField('replacementId', e.target.value)}
                  style={{ width: '100%', padding: 'var(--dim-space-150) var(--dim-space-300)', background: 'var(--surface-input-default)', border: 'var(--dim-stroke-100) solid var(--border-input-default)', borderRadius: 'var(--dim-radius-200)', fontSize: 'var(--type-size-sm)', outline: 'none', appearance: 'none' }}
                >
                  <option value=''>— ไม่กำหนดรายการทดแทน —</option>
                  {replacementOptions.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </label>
            </SectionCard>
          )}

          <section className='bg-surface-card rounded-card flex flex-wrap items-center w-full sticky bottom-0' style={{ gap: 'var(--dim-space-300)', padding: 'var(--dim-space-500)', boxShadow: 'var(--shadow-card-strong)' }}>
            <div className='flex-1 min-w-0 flex items-center flex-wrap' style={{ gap: 'var(--dim-space-300)' }}>
              <span className='text-xs text-ink-tertiary'>
                สรุป: <strong className='text-ink-secondary'>{DRUG_CLASSIFICATIONS.find((c) => c.key === form.classification)?.label}</strong>
                {' · '}{form.rightsEligible.length} สิทธิ{form.highAlert ? ' · High Alert' : ''}
              </span>
            </div>
            <NeutralSubdueButton variant='outline' size='md' onClick={() => history.push('/pharmacy/registry')}>ยกเลิก</NeutralSubdueButton>
            <BrandButton size='md' leadingIcon='save' onClick={handleSave} disabled={!form.name.trim()}>{isNew ? 'สร้างรายการยา' : 'บันทึกการเปลี่ยนแปลง'}</BrandButton>
          </section>
        </div>
        <Footer copyright='© 2026 ศูนย์บริการสาธารณสุข สำนักอนามัย กรุงเทพมหานคร' />
      </main>
      <SuccessToast open={saved} message={isNew ? 'สร้างรายการยาสำเร็จ' : 'บันทึกการเปลี่ยนแปลงสำเร็จ'} onClose={() => setSaved(false)} />
    </div>
  );
};

export default PharmacyRegistryEditPage;
