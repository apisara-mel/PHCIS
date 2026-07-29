import React, { useMemo, useState } from 'react';
import BrandButton from '@/components/button/BrandButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import { DRUG_REGISTRY } from '@/data/pharmacyRegistry';
import { getAllergySafeDrugs } from '@/data/pharmacyQueue';

/* Add/edit a single medication line — the same screen-level capability
   the legacy ห้องจ่ายยา system offers (คู่มือระบบงานห้องจ่ายยาและบริหาร
   เวชภัณฑ์ §2.1.1): search/pick a drug by name (พิมพ์ที่ "รหัส" แล้วเลือก
   จากรายการ — here, a `<select>` over the drug registry) to add a fresh
   line or SUBSTITUTE an existing one for a different drug, then edit its
   dose/frequency/timing/quantity. Double-click-to-edit in the legacy UI;
   here, an explicit "แก้ไข" action opens this same form. */

const inputStyle = {
  width: '100%', padding: 'var(--dim-space-150) var(--dim-space-300)',
  background: 'var(--surface-input-default)',
  border: 'var(--dim-stroke-100) solid var(--border-input-default)',
  borderRadius: 'var(--dim-radius-200)',
  fontSize: 'var(--type-size-sm)',
};

const Field = ({ label, children }) => (
  <label className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
    <span className='text-xs' style={{ color: 'var(--text-content-tertiary)' }}>{label}</span>
    {children}
  </label>
);

const PharmacyMedicationEditor = ({ item, allergies = [], onSave, onCancel }) => {
  const isNew = !item;
  const [name, setName] = useState(item?.name || '');
  const [dosePerTake, setDosePerTake] = useState(item?.dosePerTake || '1');
  const [frequency, setFrequency] = useState(item?.frequency || '');
  const [when, setWhen] = useState(item?.when || '');
  const [quantity, setQuantity] = useState(item?.quantity || 1);
  const [instructions, setInstructions] = useState(item?.instructions || '');

  /* Drugs whose pharmacological class matches one of the patient's known
     allergies are hidden from the picker so the pharmacist can't
     accidentally re-select an allergen while swapping a conflicting line.
     The item's OWN original name stays visible even if it matches — this
     form is also used for a plain dose/frequency edit, not just an
     allergy swap, so the current drug must never vanish from its own
     select. */
  const selectableDrugs = useMemo(
    () => getAllergySafeDrugs(allergies, item?.name),
    [allergies, item],
  );
  const hiddenCount = DRUG_REGISTRY.length - selectableDrugs.length;

  const handleSave = () => {
    if (!name.trim()) return;
    const drug = DRUG_REGISTRY.find((d) => d.name === name);
    onSave({
      name,
      unit: drug?.unit === 'capsule' ? 'แคปซูล' : 'เม็ด',
      dosePerTake,
      frequency,
      when,
      quantity: Number(quantity) || 1,
      instructions,
    });
  };

  return (
    <div
      className='flex flex-col w-full'
      style={{ gap: 'var(--dim-space-300)', padding: 'var(--dim-space-400)', background: 'var(--surface-brandPrimary-quaternary)', border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-default)', borderRadius: 'var(--dim-radius-200)' }}
    >
      <span className='text-sm font-bold' style={{ color: 'var(--text-content-default)' }}>
        {isNew ? 'เพิ่มรายการยา' : `แก้ไขรายการยา — เปลี่ยนเป็นยาตัวอื่นได้`}
      </span>
      <div className='grid grid-cols-1 md:grid-cols-3 gap-3 w-full'>
        <Field label='ชื่อยา'>
          <select value={name} onChange={(e) => setName(e.target.value)} style={{ ...inputStyle, appearance: 'none' }}>
            <option value=''>— เลือกยา —</option>
            {selectableDrugs.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
          </select>
          {hiddenCount > 0 && (
            <span className='text-xs' style={{ color: 'var(--text-alert-error)' }}>
              ซ่อน {hiddenCount} รายการที่ผู้ป่วยมีประวัติแพ้
            </span>
          )}
        </Field>
        <Field label='ขนาดต่อครั้ง'>
          <input style={inputStyle} value={dosePerTake} onChange={(e) => setDosePerTake(e.target.value)} placeholder='เช่น 1' />
        </Field>
        <Field label='จำนวนที่สั่ง'>
          <input type='number' min='1' style={inputStyle} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
        </Field>
        <Field label='ความถี่'>
          <input style={inputStyle} value={frequency} onChange={(e) => setFrequency(e.target.value)} placeholder='เช่น วันละ 2 ครั้ง' />
        </Field>
        <Field label='เวลา'>
          <input style={inputStyle} value={when} onChange={(e) => setWhen(e.target.value)} placeholder='เช่น หลังอาหาร' />
        </Field>
        <Field label='คำแนะนำเพิ่มเติม'>
          <input style={inputStyle} value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder='ถ้ามี' />
        </Field>
      </div>
      <div className='flex items-center justify-end' style={{ gap: 'var(--dim-space-200)' }}>
        <NeutralSubdueButton variant='outline' size='sm' onClick={onCancel}>ยกเลิก</NeutralSubdueButton>
        <BrandButton size='sm' leadingIcon='save' disabled={!name.trim()} onClick={handleSave}>บันทึก</BrandButton>
      </div>
    </div>
  );
};

export default PharmacyMedicationEditor;
