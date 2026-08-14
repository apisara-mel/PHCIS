import React, { useMemo, useState } from 'react';
import Table from '@/components/table/Table';
import Select from '@/components/forms/Select';
import InputField from '@/components/forms/InputField';
import BrandPrimaryButton from '@/components/button/BrandPrimaryButton';
import NeutralSubdueIconButton from '@/components/button/NeutralSubdueIconButton';
import { PanelCard, PanelEmptyState } from '@/pages/treat/panels/panelKit';

export const MEDICAL_SUPPLY_CATALOG = [
  { value: 'gauze-sterile-2x2', label: 'ผ้าก๊อซปราศจากเชื้อ 2×2 นิ้ว', unit: 'ห่อ' },
  { value: 'cotton-ball', label: 'สำลีก้อน', unit: 'ถุง' },
  { value: 'medical-tape-1', label: 'เทปกาวทางการแพทย์ 1 นิ้ว', unit: 'ม้วน' },
  { value: 'plaster-strip', label: 'พลาสเตอร์ปิดแผล', unit: 'ชิ้น' },
  { value: 'syringe-5ml', label: 'กระบอกฉีดยา 5 mL', unit: 'ชิ้น' },
  { value: 'surgical-mask', label: 'หน้ากากอนามัยทางการแพทย์', unit: 'ชิ้น' },
];

const MedicalSupplyOrderPanel = ({ form, setForm }) => {
  const [catalogId, setCatalogId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const supplies = form.medicalSupplies || [];
  const selected = MEDICAL_SUPPLY_CATALOG.find((item) => item.value === catalogId);

  const addSupply = () => {
    if (!selected || Number(quantity) < 1) return;
    setForm((current) => ({
      ...current,
      medicalSupplies: [
        ...(current.medicalSupplies || []),
        {
          id: `supply-${Date.now()}`,
          itemType: 'non_drug_supply',
          catalogId: selected.value,
          name: selected.label,
          unit: selected.unit,
          quantity: Number(quantity),
          orderStatus: 'continue',
        },
      ],
    }));
    setCatalogId('');
    setQuantity('1');
  };

  const columns = useMemo(() => [
    { key: 'name', header: 'เวชภัณฑ์มิใช่ยา' },
    { key: 'quantity', header: 'จำนวน', align: 'center', render: (row) => `${row.quantity} ${row.unit}` },
    { key: 'actions', header: '', align: 'center', render: (row) => (
      <NeutralSubdueIconButton
        icon='delete'
        size='sm'
        aria-label={`ลบ ${row.name}`}
        onClick={() => setForm((current) => ({
          ...current,
          medicalSupplies: (current.medicalSupplies || []).filter((item) => item.id !== row.id),
        }))}
      />
    ) },
  ], [setForm]);

  return (
    <PanelCard title='สั่งเวชภัณฑ์มิใช่ยา' subtitle='รายการจะถูกส่งไปห้องยาพร้อมใบสั่ง CPOE เดียวกัน แต่แยกจากรายการยา'>
      <div className='grid w-full' style={{ gridTemplateColumns: 'minmax(280px, 1fr) minmax(120px, 180px) auto', gap: 'var(--dim-space-300)' }}>
        <Select
          value={catalogId}
          onChange={setCatalogId}
          options={MEDICAL_SUPPLY_CATALOG}
          placeholder='เลือกเวชภัณฑ์มิใช่ยา'
          showLabel={false}
          showHelperText={false}
        />
        <InputField label='จำนวน' type='number' min='1' value={quantity} onChange={setQuantity} />
        <div className='flex items-end'>
          <BrandPrimaryButton leadingIcon='add' disabled={!selected || Number(quantity) < 1} onClick={addSupply}>เพิ่มรายการ</BrandPrimaryButton>
        </div>
      </div>
      {supplies.length > 0
        ? <Table columns={columns} rows={supplies} rowKey={(row) => row.id} />
        : <PanelEmptyState title='ยังไม่มีเวชภัณฑ์มิใช่ยาที่สั่ง' subtitle='เลือกสำลี ผ้าก๊อซ เทปกาว หรืออุปกรณ์จากรายการด้านบน' />}
    </PanelCard>
  );
};

export default MedicalSupplyOrderPanel;
