import React, { useState } from 'react';
import Badge from '@/components/badge/Badge';
import BrandDashedAddButton from '@/components/button/BrandDashedAddButton';
import NeutralSubdueIconButton from '@/components/button/NeutralSubdueIconButton';
import InputField from '@/components/forms/InputField';
import Select from '@/components/forms/Select';
import { PHARMACY_NESTED_PANEL } from '@/pages/pharmacy/pharmacyContentCard';
import { addOwnMedication, removeOwnMedication } from '@/data/pharmacyQueue';
import { DRUG_REGISTRY } from '@/data/pharmacyRegistry';
import { resolveMedicationImage } from '@/data/medicationCatalog';

/* ยาที่ผู้รับบริการนำมาเอง — ToR §1.9.5.9.
   DS aliases: InputField · Select · Badge · BrandDashedAddButton ·
   NeutralSubdueIconButton. Parent supplies SectionCard title. */

const FORMULARY_OPTIONS = [
  { value: 'yes', label: 'มีในสำนักอนามัย' },
  { value: 'no', label: 'ไม่มีในสำนักอนามัย' },
];

/* ชื่อยาเลือกจากทะเบียนยาเดียวกับที่ใช้ทั้งระบบ พร้อมรูปเม็ดยา — เภสัชกร
   ยืนยันของที่ผู้ป่วยหิ้วมาด้วยตาได้ทันที ไม่ต้องเดาจากชื่อที่พิมพ์ผิด */
const OWN_MED_NAME_OPTIONS = DRUG_REGISTRY.map((d) => ({
  value: d.name,
  label: d.name,
  image: resolveMedicationImage(d.name),
  subtext: d.genericName && d.genericName !== d.name ? d.genericName : undefined,
}));

const OTHER_NOTE_VALUE = '__other__';

/* หมายเหตุที่เจอซ้ำ ๆ หน้าห้องยา — ปิดท้ายด้วย "อื่น ๆ" ที่เปิดช่องพิมพ์เอง */
const OWN_MED_NOTE_OPTIONS = [
  { value: 'รับประทานเองประจำ', label: 'รับประทานเองประจำ' },
  { value: 'ยาเดิมจากโรงพยาบาลอื่น', label: 'ยาเดิมจากโรงพยาบาลอื่น' },
  { value: 'ซื้อจากร้านขายยา', label: 'ซื้อจากร้านขายยา' },
  { value: 'ยาสมุนไพร / อาหารเสริม', label: 'ยาสมุนไพร / อาหารเสริม' },
  { value: 'เหลือจากครั้งก่อน ยังไม่หมด', label: 'เหลือจากครั้งก่อน ยังไม่หมด' },
  { value: 'หยุดใช้ชั่วคราวตามคำสั่งแพทย์', label: 'หยุดใช้ชั่วคราวตามคำสั่งแพทย์' },
  { value: OTHER_NOTE_VALUE, label: 'อื่น ๆ (ระบุ)' },
];

const PharmacyOwnMedicationsList = ({ queueNo, row, onChange, disabled = false }) => {
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [noteOther, setNoteOther] = useState('');
  /* §1.9.5.9 — "ทั้งยาที่มีและไม่มีในสำนักอนามัย" */
  const [inFormulary, setInFormulary] = useState('yes');

  const isOtherNote = note === OTHER_NOTE_VALUE;
  const resolvedNote = isOtherNote ? noteOther.trim() : note;
  /* เลือก "อื่น ๆ" แล้วยังไม่พิมพ์ = ยังกรอกไม่เสร็จ */
  const canAdd = !!name && !disabled && !(isOtherNote && noteOther.trim() === '');

  const handleAdd = () => {
    if (!canAdd) return;
    addOwnMedication(queueNo, name, resolvedNote, inFormulary === 'yes');
    setName('');
    setNote('');
    setNoteOther('');
    setInFormulary('yes');
    onChange?.();
  };

  const handleRemove = (id) => {
    if (disabled) return;
    removeOwnMedication(queueNo, id);
    onChange?.();
  };

  return (
    <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
      {row.ownMedications.map((m) => (
        <div
          key={m.id}
          className='flex items-center w-full'
          style={{
            ...PHARMACY_NESTED_PANEL,
            gap: 'var(--dim-space-300)',
            padding: 'var(--dim-space-300)',
          }}
        >
          <div className='flex-1 min-w-0 flex flex-col' style={{ gap: 'var(--dim-space-100)' }}>
            <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-150)' }}>
              <span
                style={{
                  fontFamily: 'var(--type-family-body)',
                  fontSize: 'var(--type-size-sm)',
                  fontWeight: 'var(--type-weight-medium)',
                  color: 'var(--text-content-default)',
                }}
              >
                {m.name}
              </span>
              <Badge style={m.inFormulary ? 'success' : 'neutral'} size='small'>
                {m.inFormulary ? 'มีในสำนักอนามัย' : 'ไม่มีในสำนักอนามัย'}
              </Badge>
            </div>
            {m.note ? (
              <span
                style={{
                  fontFamily: 'var(--type-family-body)',
                  fontSize: 'var(--type-size-xs)',
                  color: 'var(--text-content-tertiary)',
                }}
              >
                {m.note}
              </span>
            ) : null}
          </div>
          <NeutralSubdueIconButton
            icon='close'
            variant='outline'
            size='sm'
            disabled={disabled}
            aria-label={`ลบ ${m.name}`}
            title='ลบรายการ'
            onClick={() => handleRemove(m.id)}
          />
        </div>
      ))}

      <div
        className='flex flex-wrap items-end w-full'
        style={{ gap: 'var(--dim-space-300)' }}
      >
        <div className='flex-1 min-w-0' style={{ minWidth: 'var(--dim-size-2100, 160px)' }}>
          <Select
            label='ชื่อยา'
            value={name}
            onChange={setName}
            options={OWN_MED_NAME_OPTIONS}
            placeholder='เลือกชื่อยา'
            searchable
            showHelperText={false}
            showLeadingIcon={false}
            disabled={disabled}
            required
          />
        </div>
        <div className='flex-1 min-w-0' style={{ minWidth: 'var(--dim-size-2100, 160px)' }}>
          <Select
            label='หมายเหตุ'
            value={note}
            onChange={(v) => {
              setNote(v);
              if (v !== OTHER_NOTE_VALUE) setNoteOther('');
            }}
            options={OWN_MED_NOTE_OPTIONS}
            placeholder='เลือกหมายเหตุ'
            searchable={false}
            showHelperText={false}
            showLeadingIcon={false}
            disabled={disabled}
          />
        </div>
        {isOtherNote && (
          <div className='flex-1 min-w-0' style={{ minWidth: 'var(--dim-size-2100, 160px)' }}>
            <InputField
              label='ระบุหมายเหตุ'
              value={noteOther}
              onChange={setNoteOther}
              placeholder='พิมพ์หมายเหตุ'
              showLeadingIcon={false}
              showHelperText={false}
              disabled={disabled}
              required
            />
          </div>
        )}
        <div className='min-w-0' style={{ flex: '1 1 var(--dim-size-2100, 160px)', maxWidth: '100%' }}>
          <Select
            label='มีในสำนักอนามัย'
            value={inFormulary}
            onChange={setInFormulary}
            options={FORMULARY_OPTIONS}
            searchable={false}
            showHelperText={false}
            showLeadingIcon={false}
            disabled={disabled}
          />
        </div>
      </div>

      <BrandDashedAddButton onClick={handleAdd} disabled={!canAdd}>
        เพิ่มรายการยา
      </BrandDashedAddButton>
    </div>
  );
};

export default PharmacyOwnMedicationsList;
