import React, { useEffect, useMemo, useState } from 'react';
import Popup from '@/components/popup/Popup';
import { DRUG_REGISTRY } from '@/data/pharmacyRegistry';
import { getAllergySafeDrugs } from '@/data/pharmacyQueue';

/* Add/edit a single medication line as a Popup — same capability as the
   legacy ห้องจ่ายยา add/edit screen (คู่มือระบบงานห้องจ่ายยาและบริหาร
   เวชภัณฑ์ §2.1.1). Opened from "เพิ่มรายการยา" / row "แก้ไข". */

const STYLE_ID = 'mih-pharmacy-med-editor-input-style';

if (typeof document !== 'undefined' && !document.getElementById(STYLE_ID)) {
  const css = document.createElement('style');
  css.id = STYLE_ID;
  css.textContent = `
    .mih-pharmacy-med-editor-input,
    .mih-pharmacy-med-editor-input:focus,
    .mih-pharmacy-med-editor-input:focus-visible {
      caret-color: var(--text-content-default, #1a1a1a);
      border: 0 !important;
      outline: none !important;
      box-shadow: none !important;
      background: transparent !important;
      -webkit-appearance: none !important;
      appearance: none !important;
    }
    .mih-pharmacy-med-editor-input::placeholder {
      color: var(--text-content-tertiary, #858c92);
      opacity: 1;
    }
  `;
  document.head.appendChild(css);
}

const FieldShell = ({ children }) => (
  <div
    className='flex items-center w-full'
    style={{
      minHeight: 'var(--dim-size-800, 40px)',
      padding: 'var(--dim-space-150) var(--dim-space-300)',
      background: 'var(--surface-input-default)',
      border: 'var(--dim-stroke-100) solid var(--border-input-default)',
      borderRadius: 'var(--dim-radius-200)',
      boxSizing: 'border-box',
    }}
  >
    {children}
  </div>
);

const Field = ({ label, children }) => (
  <label className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-100, 4px)' }}>
    <span
      style={{
        color: 'var(--text-content-tertiary)',
        fontSize: 'var(--type-size-xs)',
        fontFamily: 'var(--type-family-body)',
      }}
    >
      {label}
    </span>
    {children}
  </label>
);

const emptyDraft = () => ({
  name: '',
  dosePerTake: '1',
  frequency: '',
  when: '',
  quantity: 1,
  instructions: '',
  additionReason: '',
});

const ADDITION_REASON_OPTIONS = [
  'ปรับคำสั่งยาตามการทบทวนโดยเภสัชกร',
  'แก้ไขรายการยาที่ตกหล่นจากคำสั่งแพทย์',
  'เพิ่มยาสำหรับแก้ปัญหาความคลาดเคลื่อนทางยา',
  'เพิ่มยาตามแนวทางหรือบัญชียาของสถานพยาบาล',
  'เพิ่มยาหลังประสานและยืนยันกับแพทย์',
  'อื่น ๆ',
];

const PharmacyMedicationEditor = ({
  open = false,
  item = null,
  allergies = [],
  onSave,
  onCancel,
}) => {
  const isNew = !item;
  const [draft, setDraft] = useState(emptyDraft);

  useEffect(() => {
    if (!open) return;
    setDraft(item
      ? {
          name: item.name || '',
          dosePerTake: item.dosePerTake || '1',
          frequency: item.frequency || '',
          when: item.when || '',
          quantity: item.quantity || 1,
          instructions: item.instructions || '',
          additionReason: item.additionReason || '',
        }
      : emptyDraft());
  }, [open, item]);

  const setField = (key) => (e) => {
    const value = e?.target ? e.target.value : e;
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  /* Drugs whose pharmacological class matches one of the patient's known
     allergies are hidden from the picker so the pharmacist can't
     accidentally re-select an allergen while swapping a conflicting line.
     The item's OWN original name stays visible even if it matches. */
  const selectableDrugs = useMemo(
    () => getAllergySafeDrugs(allergies, item?.name),
    [allergies, item],
  );
  const hiddenCount = DRUG_REGISTRY.length - selectableDrugs.length;

  const canSave = Boolean(
    String(draft.name || '').trim()
    && (!isNew || String(draft.additionReason || '').trim()),
  );

  const handleSave = () => {
    if (!canSave) return;
    const name = draft.name.trim();
    const drug = DRUG_REGISTRY.find((d) => d.name === name);
    onSave?.({
      name,
      unit: drug?.unit === 'capsule' ? 'แคปซูล' : 'เม็ด',
      dosePerTake: draft.dosePerTake,
      frequency: draft.frequency,
      when: draft.when,
      quantity: Number(draft.quantity) || 1,
      instructions: draft.instructions,
      additionReason: draft.additionReason,
    });
  };

  return (
    <Popup
      open={open}
      onClose={onCancel}
      size='large'
      title={isNew ? 'เพิ่มรายการยา' : 'แก้ไขรายการยา'}
      subtitle={isNew ? undefined : 'เปลี่ยนเป็นยาตัวอื่นได้'}
      secondaryAction={{ label: 'ยกเลิก', onClick: onCancel }}
      primaryAction={{
        label: 'บันทึก',
        leadingIcon: 'save',
        disabled: !canSave,
        onClick: handleSave,
      }}
    >
      <div
        className='grid grid-cols-1 md:grid-cols-3 w-full'
        style={{ gap: 'var(--dim-space-300)' }}
      >
        <Field label='ชื่อยา'>
          <FieldShell>
            <select
              className='mih-pharmacy-med-editor-input w-full min-w-0'
              value={draft.name}
              onChange={setField('name')}
              style={{
                fontFamily: 'var(--type-family-body)',
                fontSize: 'var(--type-size-sm)',
                color: 'var(--text-content-default)',
              }}
            >
              <option value=''>— เลือกยา —</option>
              {selectableDrugs.map((d) => (
                <option key={d.id} value={d.name}>{d.name}</option>
              ))}
            </select>
          </FieldShell>
          {hiddenCount > 0 && (
            <span
              style={{
                color: 'var(--text-alert-error)',
                fontSize: 'var(--type-size-xs)',
                marginTop: 'var(--dim-space-050)',
              }}
            >
              ซ่อน {hiddenCount} รายการที่ผู้ป่วยมีประวัติแพ้
            </span>
          )}
        </Field>
        <Field label='ขนาดต่อครั้ง'>
          <FieldShell>
            <input
              className='mih-pharmacy-med-editor-input w-full min-w-0'
              value={draft.dosePerTake}
              onChange={setField('dosePerTake')}
              placeholder='เช่น 1'
              style={{
                fontFamily: 'var(--type-family-body)',
                fontSize: 'var(--type-size-sm)',
                color: 'var(--text-content-default)',
              }}
            />
          </FieldShell>
        </Field>
        <Field label='จำนวนที่สั่ง'>
          <FieldShell>
            <input
              type='number'
              min='1'
              className='mih-pharmacy-med-editor-input w-full min-w-0'
              value={draft.quantity}
              onChange={setField('quantity')}
              style={{
                fontFamily: 'var(--type-family-body)',
                fontSize: 'var(--type-size-sm)',
                color: 'var(--text-content-default)',
              }}
            />
          </FieldShell>
        </Field>
        <Field label='ความถี่'>
          <FieldShell>
            <input
              className='mih-pharmacy-med-editor-input w-full min-w-0'
              value={draft.frequency}
              onChange={setField('frequency')}
              placeholder='เช่น วันละ 2 ครั้ง'
              style={{
                fontFamily: 'var(--type-family-body)',
                fontSize: 'var(--type-size-sm)',
                color: 'var(--text-content-default)',
              }}
            />
          </FieldShell>
        </Field>
        <Field label='เวลา'>
          <FieldShell>
            <input
              className='mih-pharmacy-med-editor-input w-full min-w-0'
              value={draft.when}
              onChange={setField('when')}
              placeholder='เช่น หลังอาหาร'
              style={{
                fontFamily: 'var(--type-family-body)',
                fontSize: 'var(--type-size-sm)',
                color: 'var(--text-content-default)',
              }}
            />
          </FieldShell>
        </Field>
        <Field label='คำแนะนำเพิ่มเติม'>
          <FieldShell>
            <input
              className='mih-pharmacy-med-editor-input w-full min-w-0'
              value={draft.instructions}
              onChange={setField('instructions')}
              placeholder='ถ้ามี'
              style={{
                fontFamily: 'var(--type-family-body)',
                fontSize: 'var(--type-size-sm)',
                color: 'var(--text-content-default)',
              }}
            />
          </FieldShell>
        </Field>
        {isNew && (
          <Field label='เหตุผลที่เภสัชกรเพิ่มยา *'>
            <FieldShell>
              <select
                className='mih-pharmacy-med-editor-input w-full min-w-0'
                value={draft.additionReason}
                onChange={setField('additionReason')}
                style={{
                  fontFamily: 'var(--type-family-body)',
                  fontSize: 'var(--type-size-sm)',
                  color: 'var(--text-content-default)',
                }}
              >
                <option value=''>— เลือกเหตุผล —</option>
                {ADDITION_REASON_OPTIONS.map((reason) => (
                  <option key={reason} value={reason}>{reason}</option>
                ))}
              </select>
            </FieldShell>
          </Field>
        )}
      </div>
    </Popup>
  );
};

export default PharmacyMedicationEditor;
