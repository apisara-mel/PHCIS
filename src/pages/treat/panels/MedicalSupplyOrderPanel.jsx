import React, { useMemo, useState } from 'react';
import Table from '@/components/table/Table';
import Select from '@/components/forms/Select';
import Stepper from '@/components/stepper/Stepper';
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
  const [supplyOptionKey, setSupplyOptionKey] = useState('');
  const [quantity, setQuantity] = useState('1');
  const supplies = form.medicalSupplies || [];
  const selected = MEDICAL_SUPPLY_CATALOG.find((item) => item.value === supplyOptionKey);

  const addSupply = () => {
    if (!selected || Number(quantity) < 1) return;
    setForm((current) => ({
      ...current,
      medicalSupplies: [
        ...(current.medicalSupplies || []),
        {
          id: `supply-${Date.now()}`,
          itemType: 'non_drug_supply',
          /* เวชภัณฑ์มิใช่ยาไม่มี TMT — persist เฉพาะชื่อรายการ/หน่วย/จำนวน.
             `selected.value` เป็น key ของ dropdown ฝั่ง UI เท่านั้น. */
          name: selected.label,
          unit: selected.unit,
          quantity: Number(quantity),
          orderStatus: 'continue',
        },
      ],
    }));
    setSupplyOptionKey('');
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
      <div
        className='grid w-full items-end'
        style={{
          gridTemplateColumns: 'minmax(280px, 1fr) minmax(128px, 180px) auto',
          gap: 'var(--dim-space-300)',
          alignItems: 'end',
        }}
      >
        <Select
          label='รายการเวชภัณฑ์มิใช่ยา'
          value={supplyOptionKey}
          onChange={setSupplyOptionKey}
          options={MEDICAL_SUPPLY_CATALOG}
          placeholder='เลือกเวชภัณฑ์มิใช่ยา'
          size='lg'
          showHelperText={false}
        />
        <label className='flex flex-col items-start' style={{ gap: 'var(--dim-space-100)' }}>
          <span style={{
            color: 'var(--text-content-secondary)',
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-xs)',
            fontWeight: 'var(--type-weight-medium)',
            lineHeight: 1.5,
          }}>
            จำนวน
          </span>
          <Stepper
            value={Number(quantity)}
            onChange={(next) => setQuantity(String(next ?? 1))}
            min={1}
            max={999}
            step={1}
            size='large'
            aria-label='จำนวนเวชภัณฑ์มิใช่ยา'
          />
        </label>
        <div className='flex items-end'>
          <BrandPrimaryButton size='lg' leadingIcon='add' disabled={!selected || Number(quantity) < 1} onClick={addSupply}>เพิ่มรายการ</BrandPrimaryButton>
        </div>
      </div>
      {supplies.length > 0
        ? <Table columns={columns} rows={supplies} rowKey={(row) => row.id} />
        : <PanelEmptyState title='ยังไม่มีเวชภัณฑ์มิใช่ยาที่สั่ง' subtitle='เลือกสำลี ผ้าก๊อซ เทปกาว หรืออุปกรณ์จากรายการด้านบน' />}
    </PanelCard>
  );
};

export default MedicalSupplyOrderPanel;
