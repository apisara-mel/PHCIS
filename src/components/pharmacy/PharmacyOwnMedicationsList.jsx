import React, { useState } from 'react';
import Icon from '@/components/icons/Icon';
import BrandDashedAddButton from '@/components/button/BrandDashedAddButton';
import { addOwnMedication, removeOwnMedication } from '@/data/pharmacyQueue';

/* ยาที่ผู้รับบริการนำมาเอง (ToR §1.9.4.7 / §1.9.5) + feeds the Medication
   Reconciliation comparison on the dispense page. Simplified 2-field
   version of the editable repeating-list skeleton in
   `RegistrationSteps.jsx`'s drug-allergy block (entry state → add/remove
   handlers → card-per-row → dashed "add row" button) — this list only
   needs name + note, not the full allergy severity/symptom shape. */

const inputStyle = {
  width: '100%', padding: 'var(--dim-space-150) var(--dim-space-300)',
  background: 'var(--surface-input-default)',
  border: 'var(--dim-stroke-100) solid var(--border-input-default)',
  borderRadius: 'var(--dim-radius-200)',
  fontSize: 'var(--type-size-sm)',
};

const PharmacyOwnMedicationsList = ({ queueNo, row, onChange }) => {
  const [name, setName] = useState('');
  const [note, setNote] = useState('');

  const handleAdd = () => {
    if (!name.trim()) return;
    addOwnMedication(queueNo, name.trim(), note.trim());
    setName('');
    setNote('');
    onChange?.();
  };

  const handleRemove = (id) => {
    removeOwnMedication(queueNo, id);
    onChange?.();
  };

  return (
    <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
      <h3 style={{ margin: 0, fontFamily: 'var(--type-family-heading-content)', fontWeight: 'var(--type-weight-bold)', fontSize: 'var(--type-size-sm)', color: 'var(--text-content-default)' }}>
        ยาที่ผู้รับบริการนำมาเอง
      </h3>

      {row.ownMedications.map((m) => (
        <div
          key={m.id}
          className='flex items-center w-full'
          style={{ gap: 'var(--dim-space-300)', padding: 'var(--dim-space-300)', background: 'var(--surface-card-100)', border: 'var(--dim-stroke-100) solid var(--border-card-default)', borderRadius: 'var(--dim-radius-200)' }}
        >
          <div className='flex-1 min-w-0 flex flex-col'>
            <span className='text-sm font-medium' style={{ color: 'var(--text-content-default)' }}>{m.name}</span>
            {m.note && <span className='text-xs' style={{ color: 'var(--text-content-tertiary)' }}>{m.note}</span>}
          </div>
          <button
            type='button'
            aria-label='ลบรายการ'
            onClick={() => handleRemove(m.id)}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-content-tertiary)' }}
          >
            <Icon name='close' size={16} />
          </button>
        </div>
      ))}

      <div className='flex flex-wrap items-end w-full' style={{ gap: 'var(--dim-space-300)' }}>
        <label className='flex flex-col flex-1 min-w-[160px]' style={{ gap: 'var(--dim-space-100, 4px)' }}>
          <span className='text-xs' style={{ color: 'var(--text-content-tertiary)' }}>ชื่อยา</span>
          <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder='เช่น Vitamin B Complex' />
        </label>
        <label className='flex flex-col flex-1 min-w-[200px]' style={{ gap: 'var(--dim-space-100, 4px)' }}>
          <span className='text-xs' style={{ color: 'var(--text-content-tertiary)' }}>หมายเหตุ</span>
          <input style={inputStyle} value={note} onChange={(e) => setNote(e.target.value)} placeholder='เช่น รับประทานเองประจำ' />
        </label>
      </div>
      <BrandDashedAddButton onClick={handleAdd} disabled={!name.trim()}>เพิ่มรายการยา</BrandDashedAddButton>
    </div>
  );
};

export default PharmacyOwnMedicationsList;
