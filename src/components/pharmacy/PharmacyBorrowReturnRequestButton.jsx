import React, { useEffect, useMemo, useState } from 'react';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import Popup from '@/components/popup/Popup';
import InputField from '@/components/forms/InputField';
import Select from '@/components/forms/Select';
import SuccessToast from '@/components/toast/SuccessToast';
import { CLINIC_OPTIONS, DEFAULT_CLINIC_VALUE } from '@/components/layout/HeaderClinicContext';
import {
  TRANSFER_TYPES,
  createBorrowReturnRequest,
} from '@/data/pharmacyQueue';
import {
  DRUG_REGISTRY,
  UNIT_TYPES,
  getRegistryDrug,
  subscribeRegistry,
} from '@/data/pharmacyRegistry';
import { resolveMedicationImage } from '@/data/medicationCatalog';

/* §1.9.9.4 — header action on every pharmacy page: สร้างคำร้องโอน/แลกล็อต.
   Drug name + counting unit resolve from ทะเบียนยา only.

   **มติ คทง.7** — ตัด "ยืม-คืน" ระหว่างศูนย์ฯ ออกจากตัวเลือกที่สร้างใหม่ได้
   (ใช้ "โอน" แทน เพื่อให้ตัดสต็อกถูกต้อง และปลายทางต้องกดยืนยันรับยา ยา
   จึงจะเข้าระบบ) — รายการยืม/คืนเดิมยังดูย้อนหลังได้ที่ตารางประวัติ */

const COUNTERPART_CENTER_OPTIONS = CLINIC_OPTIONS
  .filter((c) => c.value !== DEFAULT_CLINIC_VALUE)
  .map((c) => ({
    value: c.label.replace(/^ศูนย์/, 'ศูนย์บริการสาธารณสุข'),
    label: c.label.replace(/^ศูนย์/, 'ศูนย์บริการสาธารณสุข'),
  }));

const BORROW_TYPE_OPTIONS = TRANSFER_TYPES.map((t) => ({ value: t.key, label: t.label }));

const blankRequest = () => ({
  type: 'transfer',
  drugName: '',
  quantity: '',
  counterpartCenter: COUNTERPART_CENTER_OPTIONS[0]?.value || '',
});

const registryUnitLabel = (unitKey) => UNIT_TYPES.find((u) => u.key === unitKey)?.label || unitKey || '—';

const PharmacyBorrowReturnRequestButton = ({
  size = 'md',
  label = 'สร้างคำร้องโอน/แลกล็อต',
  onOpen,
  onCreated,
}) => {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(blankRequest);
  const [toastMessage, setToastMessage] = useState('');
  const [registryTick, setRegistryTick] = useState(0);
  useEffect(() => subscribeRegistry(() => setRegistryTick((t) => t + 1)), []);

  const registryDrugOptions = useMemo(
    () => DRUG_REGISTRY
      .filter((d) => d.active)
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name, 'th'))
      .map((d) => ({
        value: d.name,
        label: d.name,
        subtext: d.code || undefined,
        image: d.image || resolveMedicationImage(d.name, null) || undefined,
      })),
    [registryTick],
  );

  const selectedDrug = getRegistryDrug(form.drugName);
  const unitLabel = registryUnitLabel(selectedDrug?.unit);

  const openForm = () => {
    onOpen?.();
    setForm(blankRequest());
    setOpen(true);
  };

  const closeForm = () => setOpen(false);

  const handleSubmit = () => {
    if (!form.drugName.trim() || !form.quantity || !form.counterpartCenter) return;
    const drug = getRegistryDrug(form.drugName);
    if (!drug || !drug.active) {
      setToastMessage('เลือกชื่อยาจากทะเบียนยาที่เปิดใช้งานเท่านั้น');
      return;
    }
    const created = createBorrowReturnRequest({
      type: form.type,
      drugName: drug.name,
      quantity: form.quantity,
      unit: registryUnitLabel(drug.unit),
      counterpartCenter: form.counterpartCenter,
    });
    setToastMessage('ส่งคำร้องแล้ว');
    setForm(blankRequest());
    setOpen(false);
    onCreated?.(created);
  };

  return (
    <>
      <BrandSubdueButton
        variant='outline'
        size={size}
        leadingIcon='swap_horiz'
        aria-label='สร้างคำร้องโอน/แลกล็อต'
        onClick={openForm}
      >
        {label}
      </BrandSubdueButton>
      <Popup
        open={open}
        onClose={closeForm}
        size='large'
        title='สร้างคำร้องโอน/แลกล็อต'
        subtitle='ส่งคำร้องไปยังศูนย์บริการสาธารณสุขคู่กรณี — การโอนจะตัดสต็อกต้นทางทันที และเข้าสต็อกปลายทางเมื่อปลายทางกดรับยา'
        primaryAction={{
          label: 'ส่งคำร้อง',
          onClick: handleSubmit,
          disabled: !selectedDrug || !form.quantity,
        }}
        secondaryAction={{
          label: 'ยกเลิก',
          onClick: closeForm,
        }}
      >
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
          <Select
            label='ประเภท'
            value={form.type}
            onChange={(v) => setForm((p) => ({ ...p, type: v }))}
            options={BORROW_TYPE_OPTIONS}
            searchable={false}
            showHelperText={false}
          />
          <Select
            label='ชื่อยา'
            value={form.drugName}
            onChange={(v) => setForm((p) => ({ ...p, drugName: v, quantity: '' }))}
            options={registryDrugOptions}
            placeholder='เลือกจากทะเบียนยา'
            searchable
            showHelperText={false}
          />
          <InputField
            label={selectedDrug ? `จำนวน (${unitLabel})` : 'จำนวน'}
            type='number'
            value={form.quantity}
            onChange={(v) => setForm((p) => ({ ...p, quantity: v }))}
            placeholder={selectedDrug ? `เช่น 100 ${unitLabel}` : 'เลือกชื่อยาก่อน'}
            disabled={!selectedDrug}
            showHelperText={Boolean(selectedDrug)}
            helperText={selectedDrug
              ? `หน่วยนับจากทะเบียนยา · รหัส ${selectedDrug.code}`
              : undefined}
          />
          <Select
            label='ศูนย์บริการคู่กรณี'
            value={form.counterpartCenter}
            onChange={(v) => setForm((p) => ({ ...p, counterpartCenter: v }))}
            options={COUNTERPART_CENTER_OPTIONS}
            searchable={false}
            showHelperText={false}
          />
        </div>
      </Popup>
      <SuccessToast open={!!toastMessage} message={toastMessage} onClose={() => setToastMessage('')} />
    </>
  );
};

export default PharmacyBorrowReturnRequestButton;
