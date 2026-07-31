import React, { useState } from 'react';
import Icon from '@/components/icons/Icon';
import BrandDashedAddButton from '@/components/button/BrandDashedAddButton';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import { resolveSeverityBadgeStyle } from '@/components/badge/clinicalBadgeStyles';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import BrandButton from '@/components/button/BrandButton';
import { addDrugAllergy, removeDrugAllergy, updateDrugAllergy } from '@/data/mrPatients';

/* Editable แพ้ยา (drug allergy) list — ToR §1.9.2.2 / §1.9.5 "สามารถแสดง/
   บันทึก/ยกเลิก/แก้ไขข้อมูลเกี่ยวกับการแพ้ได้" and "สามารถบันทึก/แก้ไขข้อมูล
   การแพ้ยาได้ หากมีการอัปเดตข้อมูล". Same editable-repeating-list skeleton
   as `PharmacyOwnMedicationsList.jsx` (itself modeled on
   `RegistrationSteps.jsx`'s drug-allergy block), but targets the patient's
   actual `drugAllergies` record in `mrPatients.js` — so a change here is
   the same list `checkAllergyConflicts` and `PatientCard` read from,
   picked up immediately since the parent re-renders via `onChange`. */

const SEVERITY_OPTIONS = [
  { value: 'critical', label: 'วิกฤต'   },
  { value: 'high',     label: 'รุนแรง'   },
  { value: 'medium',   label: 'ปานกลาง' },
  { value: 'low',       label: 'เล็กน้อย' },
  { value: 'mild',      label: 'น้อย'    },
];

const inputStyle = {
  width: '100%', padding: 'var(--dim-space-150) var(--dim-space-300)',
  background: 'var(--surface-input-default)',
  border: 'var(--dim-stroke-100) solid var(--border-input-default)',
  borderRadius: 'var(--dim-radius-200)',
  fontSize: 'var(--type-size-sm)',
};

const PharmacyAllergyEditor = ({ hn, allergies = [], onChange }) => {
  const [name, setName] = useState('');
  const [symptom, setSymptom] = useState('');
  const [severity, setSeverity] = useState('medium');
  /* Entry id being edited in place, or null. */
  const [editingId, setEditingId] = useState(null);
  const [editSymptom, setEditSymptom] = useState('');
  const [editSeverity, setEditSeverity] = useState('medium');

  const handleAdd = () => {
    if (!name.trim()) return;
    addDrugAllergy(hn, { name, symptom, severity });
    setName('');
    setSymptom('');
    setSeverity('medium');
    onChange?.();
  };

  const handleRemove = (id) => {
    removeDrugAllergy(hn, id);
    onChange?.();
  };

  const startEdit = (a) => {
    setEditingId(a.id);
    setEditSymptom(a.symptom || '');
    setEditSeverity(a.severity || 'medium');
  };

  const handleSaveEdit = (id) => {
    updateDrugAllergy(hn, id, { symptom: editSymptom, severity: editSeverity });
    setEditingId(null);
    onChange?.();
  };

  return (
    <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
      {allergies.map((a) => (
        editingId === a.id ? (
          <div
            key={a.id}
            className='flex flex-wrap items-end w-full'
            style={{ gap: 'var(--dim-space-300)', padding: 'var(--dim-space-300)', background: 'var(--surface-brandPrimary-quaternary)', border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-default)', borderRadius: 'var(--dim-radius-200)' }}
          >
            <ColorfulBadge style={resolveSeverityBadgeStyle(editSeverity)} size='small' width='hug'>{a.name}</ColorfulBadge>
            <label className='flex flex-col flex-1 min-w-[200px]' style={{ gap: 'var(--dim-space-100, 4px)' }}>
              <span className='text-xs' style={{ color: 'var(--text-content-tertiary)' }}>อาการแพ้</span>
              <input style={inputStyle} value={editSymptom} onChange={(e) => setEditSymptom(e.target.value)} placeholder='เช่น ผื่นลมพิษ, หายใจไม่ออก' />
            </label>
            <label className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
              <span className='text-xs' style={{ color: 'var(--text-content-tertiary)' }}>ความรุนแรง</span>
              <select value={editSeverity} onChange={(e) => setEditSeverity(e.target.value)} style={{ ...inputStyle, width: 'var(--dim-size-2100, 160px)', appearance: 'none' }}>
                {SEVERITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </label>
            <NeutralSubdueButton variant='outline' size='sm' onClick={() => setEditingId(null)}>ยกเลิก</NeutralSubdueButton>
            <BrandButton size='sm' leadingIcon='save' onClick={() => handleSaveEdit(a.id)}>บันทึก</BrandButton>
          </div>
        ) : (
          <div
            key={a.id}
            className='flex items-center w-full'
            style={{ gap: 'var(--dim-space-300)', padding: 'var(--dim-space-300)', background: 'var(--surface-card-100)', border: 'var(--dim-stroke-100) solid var(--border-card-default)', borderRadius: 'var(--dim-radius-200)' }}
          >
            <ColorfulBadge style={resolveSeverityBadgeStyle(a.severity)} size='small' width='hug'>{a.name}</ColorfulBadge>
            <span className='flex-1 min-w-0 text-xs truncate' style={{ color: 'var(--text-content-tertiary)' }}>{a.symptom || '—'}</span>
            <button
              type='button'
              aria-label={`แก้ไขรายการแพ้ยา ${a.name}`}
              onClick={() => startEdit(a)}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-brandPrimary-default)' }}
            >
              <Icon name='edit' size={16} />
            </button>
            <button
              type='button'
              aria-label={`ลบรายการแพ้ยา ${a.name}`}
              onClick={() => handleRemove(a.id)}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-content-tertiary)' }}
            >
              <Icon name='close' size={16} />
            </button>
          </div>
        )
      ))}

      <div className='flex flex-wrap items-end w-full' style={{ gap: 'var(--dim-space-300)' }}>
        <label className='flex flex-col flex-1 min-w-[160px]' style={{ gap: 'var(--dim-space-100, 4px)' }}>
          <span className='text-xs' style={{ color: 'var(--text-content-tertiary)' }}>ชื่อยา/กลุ่มยาที่แพ้</span>
          <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder='เช่น Penicillin' />
        </label>
        <label className='flex flex-col flex-1 min-w-[200px]' style={{ gap: 'var(--dim-space-100, 4px)' }}>
          <span className='text-xs' style={{ color: 'var(--text-content-tertiary)' }}>อาการแพ้</span>
          <input style={inputStyle} value={symptom} onChange={(e) => setSymptom(e.target.value)} placeholder='เช่น ผื่นลมพิษ, หายใจไม่ออก' />
        </label>
        <label className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
          <span className='text-xs' style={{ color: 'var(--text-content-tertiary)' }}>ความรุนแรง</span>
          <select value={severity} onChange={(e) => setSeverity(e.target.value)} style={{ ...inputStyle, width: 'var(--dim-size-2100, 160px)', appearance: 'none' }}>
            {SEVERITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
      </div>
      <BrandDashedAddButton onClick={handleAdd} disabled={!name.trim()}>เพิ่มรายการแพ้ยา</BrandDashedAddButton>
    </div>
  );
};

export default PharmacyAllergyEditor;
