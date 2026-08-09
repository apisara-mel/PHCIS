import React, { useState } from 'react';
import Badge from '@/components/badge/Badge';
import BrandDashedAddButton from '@/components/button/BrandDashedAddButton';
import NeutralSubdueIconButton from '@/components/button/NeutralSubdueIconButton';
import InputField from '@/components/forms/InputField';
import Select from '@/components/forms/Select';
import { PHARMACY_NESTED_PANEL } from '@/pages/pharmacy/pharmacyContentCard';
import { addOwnMedication, removeOwnMedication } from '@/data/pharmacyQueue';

/* ยาที่ผู้รับบริการนำมาเอง — ToR §1.9.5.9.
   DS aliases: InputField · Select · Badge · BrandDashedAddButton ·
   NeutralSubdueIconButton. Parent supplies SectionCard title. */

const FORMULARY_OPTIONS = [
  { value: 'yes', label: 'มีในสำนักอนามัย' },
  { value: 'no', label: 'ไม่มีในสำนักอนามัย' },
];

const PharmacyOwnMedicationsList = ({ queueNo, row, onChange, disabled = false }) => {
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  /* §1.9.5.9 — "ทั้งยาที่มีและไม่มีในสำนักอนามัย" */
  const [inFormulary, setInFormulary] = useState('yes');

  const handleAdd = () => {
    if (!name.trim() || disabled) return;
    addOwnMedication(queueNo, name.trim(), note.trim(), inFormulary === 'yes');
    setName('');
    setNote('');
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
          <InputField
            label='ชื่อยา'
            value={name}
            onChange={setName}
            placeholder='เช่น Vitamin B Complex'
            showLeadingIcon={false}
            showHelperText={false}
            disabled={disabled}
            required
          />
        </div>
        <div className='flex-1 min-w-0' style={{ minWidth: 'var(--dim-size-2100, 160px)' }}>
          <InputField
            label='หมายเหตุ'
            value={note}
            onChange={setNote}
            placeholder='เช่น รับประทานเองประจำ'
            showLeadingIcon={false}
            showHelperText={false}
            disabled={disabled}
          />
        </div>
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

      <BrandDashedAddButton onClick={handleAdd} disabled={disabled || !name.trim()}>
        เพิ่มรายการยา
      </BrandDashedAddButton>
    </div>
  );
};

export default PharmacyOwnMedicationsList;
