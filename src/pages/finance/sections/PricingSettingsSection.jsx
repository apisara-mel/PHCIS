import React, { useState } from 'react';
import Table from '@/components/table/Table';
import InputField from '@/components/forms/InputField';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import { Icon } from '@/components/icons/Icon';
import { RIGHTS_GROUPS, CHARGE_CATEGORIES, formatBaht } from '@/data/financePaymentPrototype';

/* การตั้งค่า (Price Settings) — TOR §1.5 "การตั้งค่า": กำหนดราคาขายตาม
   Payer/สิทธิ, ชุดคำสั่งการรักษา, โปรแกรมการรักษา. Mocked as an editable
   price-adjustment-percent matrix (category × rights group), plus a
   second table for ชุดคำสั่งการรักษา (order sets) / โปรแกรมการรักษา
   (treatment programs) each with their own flat sale price — a config
   screen, not something the checkout flow reads from in this prototype
   (real pricing/order-set/program config needs a backend catalog).

   Uses the shared <Table> — same component/style as the queue tables
   elsewhere in this module (and src/pages/opd/QueuePage.jsx) — rather
   than a raw <table>, per house style. */

const CATEGORY_LIST = Object.values(CHARGE_CATEGORIES);
const RIGHTS_LIST = Object.values(RIGHTS_GROUPS);

const BASE_PRICE = { service: 300, lab: 450, radiology: 400, medication: 100, supplies: 180, equipment: 150, other: 100 };

/* ชุดคำสั่งการรักษา — a bundled set of orders (lab+meds+etc.) priced as one
   line rather than itemized, per TOR §1.8.9.1. */
const ORDER_SETS = [
  { key: 'annual-checkup', label: 'ชุดตรวจสุขภาพประจำปี', basePrice: 1200 },
  { key: 'dm-followup', label: 'ชุดติดตามเบาหวาน (FBS/HbA1c + ยา)', basePrice: 650 },
  { key: 'wound-dressing', label: 'ชุดทำแผล + เวชภัณฑ์', basePrice: 400 },
];

/* โปรแกรมการรักษา — a multi-visit treatment program priced as a package. */
const PROGRAMS = [
  { key: 'pt-course', label: 'โปรแกรมกายภาพบำบัด (5 ครั้ง)', basePrice: 2200 },
  { key: 'anc-package', label: 'โปรแกรมฝากครรภ์ (ANC package)', basePrice: 3500 },
];

export const emptyAdjustments = () => Object.fromEntries(
  CATEGORY_LIST.map((c) => [c.key, Object.fromEntries(RIGHTS_LIST.map((r) => [r.key, 0]))]),
);

export const defaultPricing = () => ({
  adjustments: emptyAdjustments(),
  orderSetPrices: Object.fromEntries(ORDER_SETS.map((o) => [o.key, o.basePrice])),
  programPrices: Object.fromEntries(PROGRAMS.map((p) => [p.key, p.basePrice])),
});

/* Controlled by FinancePaymentPage — the settings have to outlive this
   section's mount (the section switcher unmounts it) and, more importantly,
   the checkout flow has to be able to read them (TOR §1.8.9.1). */
const PricingSettingsSection = ({ value, onChange }) => {
  const { adjustments, orderSetPrices, programPrices } = value;
  const [saved, setSaved] = useState(false);
  const patch = (next) => { setSaved(false); onChange({ ...value, ...next }); };
  const setOrderSetPrices = (updater) => patch({ orderSetPrices: updater(orderSetPrices) });
  const setProgramPrices = (updater) => patch({ programPrices: updater(programPrices) });

  const setCell = (categoryKey, rightsKey, v) => patch({
    adjustments: {
      ...adjustments,
      [categoryKey]: { ...adjustments[categoryKey], [rightsKey]: Number(v) || 0 },
    },
  });

  const columns = [
    {
      key: 'category', label: 'หมวดค่าใช้จ่าย', flex: true, minWidth: 200,
      render: (row) => (
        <span className='flex items-center' style={{ gap: 'var(--dim-space-150)' }}>
          <Icon name={row.icon} size={16} /> {row.label}
        </span>
      ),
    },
    {
      key: 'basePrice', label: 'ราคาตั้งต้น',
      render: (row) => formatBaht(BASE_PRICE[row.key])},
    ...RIGHTS_LIST.map((r) => ({
      key: r.key, label: r.short, align: 'center', sortable: false,
      render: (row) => (
        <div className='flex items-center justify-center' style={{ gap: 'var(--dim-space-100)' }}>
          <InputField
            type='number'
            size='sm'
            showLabel={false}
            showHelperText={false}
            value={String(adjustments[row.key][r.key])}
            onChange={(v) => setCell(row.key, r.key, v)}
            style={{ width: 64 }}
            inputStyle={{ textAlign: 'center' }}
          />
          <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>%</span>
        </div>
      ),
    })),
  ];

  const packageColumns = (prices, setPrices) => [
    { key: 'label', label: 'รายการ', flex: true, minWidth: 260 },
    {
      key: 'price', label: 'ราคาขาย',
      render: (row) => (
        <InputField
          type='number'
          size='sm'
          showLabel={false}
          showHelperText={false}
          value={String(prices[row.key])}
          onChange={(v) => setPrices((prev) => ({ ...prev, [row.key]: Number(v) || 0 }))}
          style={{ width: 100 }}
          inputStyle={{ textAlign: 'right' }}
        />
      ),
    },
  ];

  return (
    <div className='flex flex-col' style={{ gap: 'var(--dim-space-500)' }}>
      <div className='flex flex-col' style={{ gap: 'var(--dim-space-200)' }}>
        <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)', color: 'var(--text-content-tertiary)' }}>
          กำหนดส่วนปรับราคาขาย (%) ตามหมวดค่าใช้จ่าย × สิทธิการรักษา (Payer) — ค่าบวก = ปรับราคาขึ้น, ค่าลบ = ส่วนลดราคามาตรฐาน
          <br />
          ค่าที่ตั้งไว้จะถูกนำไปคิดราคาจริงในหน้า “คิวชำระเงิน” ทันที (ยังไม่กระทบใบเสร็จที่ออกไปแล้ว)
        </span>
        <Table columns={columns} rows={CATEGORY_LIST} rowKey={(row) => row.key} emptyMessage='ไม่มีหมวดค่าใช้จ่าย' />
      </div>

      <div className='flex flex-col' style={{ gap: 'var(--dim-space-200)' }}>
        <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)', fontWeight: 'var(--type-weight-bold)' }}>
          ราคาขาย — ชุดคำสั่งการรักษา
        </span>
        <Table columns={packageColumns(orderSetPrices, setOrderSetPrices)} rows={ORDER_SETS} rowKey={(row) => row.key} emptyMessage='ไม่มีชุดคำสั่งการรักษา' />
      </div>

      <div className='flex flex-col' style={{ gap: 'var(--dim-space-200)' }}>
        <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)', fontWeight: 'var(--type-weight-bold)' }}>
          ราคาขาย — โปรแกรมการรักษา
        </span>
        <Table columns={packageColumns(programPrices, setProgramPrices)} rows={PROGRAMS} rowKey={(row) => row.key} emptyMessage='ไม่มีโปรแกรมการรักษา' />
      </div>

      <div className='flex items-center' style={{ gap: 'var(--dim-space-200)' }}>
        <BrandSubdueButton onClick={() => setSaved(true)}>บันทึกการตั้งค่าราคาขาย</BrandSubdueButton>
        {saved && (
          <span className='flex items-center' style={{ gap: 'var(--dim-space-100)', color: 'var(--text-statusbadge-success)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)' }}>
            <Icon name='check_circle' size={16} /> บันทึกแล้ว
          </span>
        )}
      </div>
    </div>
  );
};

export default PricingSettingsSection;
