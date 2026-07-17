import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import {
  BrandButton,
  BrandCircleSubdueIconButton,
  BrandSubdueButton,
  MobileInputField,
  MobileNavHeader,
  MobileShell,
  Sym,
} from '@/components/mobile';
import { StepIcon } from '@/components/mobile/stepIcons';
import LottieIllustration from '@/components/illustrations/LottieIllustration';

/* Pharmacy: Payment (Itemized + QR) — Figma 371:53490.
   Care-journey stepper (done → teal · current → emerald-50), prescription header,
   prescribing-doctor card, delivery details, itemised drugs + cost summary, QR CTA. */
const STEPS = [
  { key: 'book', label: 'จองนัด', icon: 'check', done: true },
  { key: 'consult', label: 'ปรึกษาแพทย์', icon: 'check', done: true },
  { key: 'pharmacy', label: 'จัดยา', icon: 'check', done: true },
  { key: 'payment', label: 'ชำระเงิน', icon: 'bill', active: true },
  { key: 'receive', label: 'รับยา', icon: 'medicine' },
];

const MEDICATIONS = [
  { name: 'Amlodipine 5 mg', detail: 'ยาลดความดัน · 30 เม็ด', price: '฿120' },
  { name: 'Metformin 500 mg', detail: 'ยาเบาหวาน · 60 เม็ด', price: '฿180' },
  { name: 'Atorvastatin 20 mg', detail: 'ยาลดไขมัน · 30 เม็ด', price: '฿250' },
];

const cardBase = {
  width: '100%',
  padding: 'var(--dim-space-400, 16px)',
  background: 'var(--surface-card-100, #FFFFFF)',
  boxShadow: 'var(--shadow-brand-drop-bottom-200)',
};

const divider = {
  width: '100%',
  height: 'var(--dim-stroke-100, 1px)',
  background: 'var(--border-neutral-quaternary, #F4F5F5)',
};

const PharmacyIconBadge = ({ src }) => (
  <span
    className='inline-flex items-center justify-center shrink-0'
    style={{
      width: 'var(--dim-size-800, 40px)',
      height: 'var(--dim-size-800, 40px)',
      borderRadius: 'var(--dim-radius-full, 9999px)',
      background: 'var(--surface-colorfulbadge-green, #E2F3EB)',
    }}
  >
    <img
      src={src}
      alt=''
      aria-hidden
      style={{
        width: 'var(--dim-size-300, 16px)',
        height: 'var(--dim-size-300, 16px)',
      }}
    />
  </span>
);

const JourneyStepper = ({ receipt = false }) => (
  <div
    className='flex items-start shrink-0 w-full'
    style={{
      padding: 'var(--dim-space-300, 12px) 0',
      background: 'var(--surface-card-100, #FFFFFF)',
      boxShadow: 'var(--shadow-brand-drop-bottom-200)',
    }}
  >
    {STEPS.map((step, index) => {
      const first = index === 0;
      const last = index === STEPS.length - 1;
      const done = receipt ? index < STEPS.length - 1 : step.done;
      const icon = done ? 'check' : step.icon;
      return (
        <div
          key={step.key}
          className='flex flex-col items-center'
          style={{ flex: 1, minWidth: 0, gap: 'var(--dim-space-100, 4px)' }}
        >
          <div className='flex items-center w-full'>
            <span style={{ flex: 1, height: 'var(--dim-stroke-200, 2px)', background: first ? 'transparent' : 'var(--border-brandPrimary-default, #007549)' }} />
            <span
              className='inline-flex items-center justify-center shrink-0'
              style={{
                boxSizing: 'border-box',
                width: 'var(--dim-size-900, 44px)',
                height: 'var(--dim-size-900, 44px)',
                borderRadius: 'var(--dim-radius-600, 24px)',
                border: 'var(--dim-stroke-200, 2px) solid var(--border-brandPrimary-default, #007549)',
                background: done
                  ? 'var(--surface-positive-tertiary, #D1F6EE)'
                  : 'var(--background-screen-brand-100, #F4FBF8)',
              }}
            >
              <StepIcon name={icon} size='var(--dim-size-400, 20px)' />
            </span>
            <span style={{ flex: 1, height: 'var(--dim-stroke-200, 2px)', background: last ? 'transparent' : 'var(--border-brandPrimary-default, #007549)' }} />
          </div>
          <span style={{
            width: '100%',
            fontFamily: 'var(--type-family-heading-graphic2)',
            fontSize: 'var(--type-size-xs, 12px)',
            lineHeight: 1.5,
            textAlign: 'center',
            color: done
              ? 'var(--text-brandPrimary-default, #007549)'
              : 'var(--text-content-secondary, #636B72)',
          }}
          >
            {step.label}
          </span>
        </div>
      );
    })}
  </div>
);

const MetaRow = ({ icon, label, value }) => (
  <div className='flex items-center' style={{ gap: 'var(--dim-space-100, 4px)' }}>
    <Sym name={icon} size='var(--dim-size-200, 12px)' color='var(--text-content-tertiary, #858C92)' />
    <span style={{ fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-tertiary, #858C92)' }}>
      {label}:
    </span>
    <span style={{ flex: 1, minWidth: 0, fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-secondary, #636B72)' }}>
      {value}
    </span>
  </div>
);

const MedicationRow = ({ medication }) => (
  <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
    <span
      className='overflow-hidden shrink-0'
      style={{
        position: 'relative',
        width: 'var(--dim-size-800, 40px)',
        height: 'var(--dim-size-800, 40px)',
        borderRadius: 'var(--dim-radius-full, 9999px)',
        border: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary, #F4F5F5)',
      }}
    >
      <img
        src='/illustration/mobile/medication-tablets.png'
        alt=''
        width={40}
        height={40}
        style={{
          position: 'absolute',
          top: '-117.97%',
          left: '-34.64%',
          width: '617.83%',
          height: '490.08%',
          maxWidth: 'none',
        }}
      />
    </span>
    <div style={{ flex: 1, minWidth: 0 }}>
      <p style={{
        margin: 0,
        fontSize: 'var(--type-size-sm, 14px)',
        fontWeight: 'var(--type-weight-bold, 700)',
        lineHeight: 1.5,
        color: 'var(--text-content-secondary, #636B72)',
      }}
      >
        {medication.name}
      </p>
      <p style={{
        margin: 0,
        fontSize: 'var(--type-size-xs, 12px)',
        lineHeight: 1.5,
        color: 'var(--text-content-tertiary, #858C92)',
      }}
      >
        {medication.detail}
      </p>
    </div>
    <strong style={{ fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-default, #111314)' }}>
      {medication.price}
    </strong>
  </div>
);

const CostRow = ({ label, value, danger = false }) => (
  <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
    <span style={{ flex: 1, fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-tertiary, #858C92)' }}>
      {label}
    </span>
    <strong style={{
      fontSize: 'var(--type-size-sm, 14px)',
      color: danger ? 'var(--text-danger-default, #B91C1C)' : 'var(--text-content-default, #111314)',
    }}
    >
      {value}
    </strong>
  </div>
);

const SectionTitle = ({ children }) => (
  <h2 style={{
    width: '100%',
    margin: 0,
    fontFamily: 'var(--type-family-heading-graphic2)',
    fontSize: 'var(--type-size-base, 16px)',
    fontWeight: 'var(--type-weight-regular, 400)',
    lineHeight: 1.5,
    color: 'var(--text-brandPrimary-default, #007549)',
  }}
  >
    {children}
  </h2>
);

const DELIVERY_OPTIONS = [
  {
    id: 'clinic',
    title: 'รับยาด้วยตนเองที่ศูนย์บริการ',
    description: 'เข้ารับยาที่ศูนย์บริการ [ศูนย์ที่เลือกใช้บริการ Tele]',
    icon: '/illustration/mobile/pharmacy-pickup-clinic.svg',
  },
  {
    id: 'delivery',
    title: 'รับยาทางไปรษณีย์',
    description: 'เราจะจัดส่งยาไปตามที่อยู่ที่คุณได้ระบุไว้ ภายในเขตกรุงเทพมหานคร',
    icon: '/illustration/mobile/pharmacy-delivery.svg',
  },
];

const DeliveryIllustration = () => {
  const [animationData, setAnimationData] = useState(null);

  useEffect(() => {
    let mounted = true;
    fetch('/illustration/mobile/man-visiting-hospital.json')
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (mounted) setAnimationData(data);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <LottieIllustration
      animationData={animationData}
      size='var(--dim-size-2000, 128px)'
      loop
      ariaLabel=''
    />
  );
};

const DeliveryMethodSheet = ({ open, onClose, onConfirm }) => {
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    if (!open) return undefined;
    setSelected(null);
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role='presentation'
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 80,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        background: 'var(--surface-overlay-default, rgb(100 116 139 / 0.40))',
      }}
    >
      <section
        role='dialog'
        aria-modal='true'
        aria-label='ช่องทางรับยา'
        className='flex flex-col'
        style={{
          width: 'min(100%, var(--dim-size-2610, 402px))',
          maxHeight: 'calc(100% - var(--dim-space-1200, 48px))',
          overflow: 'hidden',
          background: 'var(--surface-card-100, #FFFFFF)',
          borderTopLeftRadius: 'var(--dim-radius-700, 38px)',
          borderTopRightRadius: 'var(--dim-radius-700, 38px)',
          boxShadow: 'var(--shadow-drop-bottom-400)',
        }}
      >
        <header
          className='shrink-0'
          style={{
            borderBottom: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary, #F4F5F5)',
          }}
        >
          <div
            aria-hidden
            style={{
              width: 'var(--dim-size-700, 36px)',
              height: 'var(--dim-space-100, 4px)',
              margin: 'var(--dim-space-150, 6px) auto var(--dim-space-150, 6px)',
              borderRadius: 'var(--dim-radius-full, 9999px)',
              background: 'var(--border-neutral-secondary, #C6CACE)',
            }}
          />
          <div
            className='flex items-center justify-between'
            style={{ padding: '0 var(--dim-space-400, 16px) var(--dim-space-200, 8px)' }}
          >
            <span aria-hidden style={{ width: 'var(--dim-size-800, 40px)' }} />
            <h2
              style={{
                margin: 0,
                fontFamily: 'var(--type-family-heading-graphic2)',
                fontSize: 'var(--type-size-base, 16px)',
                fontWeight: 'var(--type-weight-regular, 400)',
                lineHeight: 1.5,
                color: 'var(--text-content-default, #111314)',
              }}
            >
              ช่องทางรับยา
            </h2>
            <button
              type='button'
              aria-label='ปิด'
              onClick={onClose}
              className='inline-flex items-center justify-center'
              style={{
                width: 'var(--dim-size-800, 40px)',
                height: 'var(--dim-size-800, 40px)',
                padding: 0,
                border: 0,
                borderRadius: 'var(--dim-radius-600, 24px)',
                background: 'var(--surface-brandPrimary-quaternary, #F4FBF8)',
                color: 'var(--icon-brandPrimary-default, #007549)',
                cursor: 'pointer',
              }}
            >
              <Sym name='close' size='var(--dim-size-300, 16px)' />
            </button>
          </div>
        </header>

        <div className='flex-1 min-h-0 overflow-y-auto'>
          <div className='flex flex-col items-center' style={{ padding: 'var(--dim-space-400, 16px)' }}>
            <DeliveryIllustration />
            <h3
              style={{
                margin: 0,
                width: '100%',
                fontFamily: 'var(--type-family-heading-graphic2)',
                fontSize: 'var(--type-size-xl, 20px)',
                fontWeight: 'var(--type-weight-regular, 400)',
                lineHeight: 1.375,
                textAlign: 'center',
                color: 'var(--text-brandPrimary-default, #007549)',
              }}
            >
              เลือกช่องทางที่ต้องการใช้ในการรับยา
            </h3>

            <div
              className='flex flex-col w-full'
              style={{ gap: 'var(--dim-space-300, 12px)', paddingTop: 'var(--dim-space-600, 24px)' }}
            >
              {DELIVERY_OPTIONS.map((option) => {
                const isSelected = selected === option.id;
                return (
                  <button
                    key={option.id}
                    type='button'
                    aria-pressed={isSelected}
                    onClick={() => setSelected(option.id)}
                    className='flex items-start w-full text-left'
                    style={{
                      gap: 'var(--dim-space-400, 16px)',
                      padding: 'var(--dim-space-400, 16px)',
                      border: `var(--dim-stroke-${isSelected ? '200, 2px' : '100, 1px'}) solid var(--border-brandPrimary-${isSelected ? 'default, #007549' : 'quaternary, #E2F3EB'})`,
                      borderRadius: 'var(--dim-radius-600, 24px)',
                      background: isSelected
                        ? 'var(--surface-brandPrimary-quaternary, #F4FBF8)'
                        : 'var(--surface-card-100, #FFFFFF)',
                      cursor: 'pointer',
                    }}
                  >
                    <img
                      src={option.icon}
                      alt=''
                      aria-hidden
                      style={{
                        width: 'var(--dim-size-700, 36px)',
                        height: 'var(--dim-size-700, 36px)',
                        flexShrink: 0,
                      }}
                    />
                    <span className='flex flex-col' style={{ flex: 1, minWidth: 0, gap: 'var(--dim-space-050, 2px)' }}>
                      <strong
                        style={{
                          fontFamily: 'var(--type-family-heading-graphic2)',
                          fontSize: 'var(--type-size-base, 16px)',
                          fontWeight: 'var(--type-weight-regular, 400)',
                          lineHeight: 1.5,
                          color: 'var(--text-content-default, #111314)',
                        }}
                      >
                        {option.title}
                      </strong>
                      <span
                        style={{
                          fontFamily: 'var(--type-family-body)',
                          fontSize: 'var(--type-size-sm, 14px)',
                          lineHeight: 1.5,
                          color: 'var(--text-content-tertiary, #858C92)',
                        }}
                      >
                        {option.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <footer
          className='shrink-0'
          style={{
            padding: 'var(--dim-space-400, 16px) var(--dim-space-400, 16px) var(--dim-space-800, 32px)',
            borderTop: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary, #E2F3EB)',
            boxShadow: 'var(--shadow-brand-drop-top-100)',
            background: 'var(--surface-card-100, #FFFFFF)',
          }}
        >
          <BrandButton
            size='lg'
            disabled={!selected}
            onClick={() => onConfirm(selected)}
            style={{ width: '100%' }}
          >
            ตกลง
          </BrandButton>
        </footer>
      </section>
    </div>
  );
};

const AddressSelect = ({ label, required, value, onChange, children, disabled = false }) => (
  <label className='flex flex-col w-full' style={{ gap: 'var(--dim-space-150, 6px)' }}>
    <span
      className='flex items-center'
      style={{
        gap: 'var(--dim-space-050, 2px)',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-sm, 14px)',
        fontWeight: 'var(--type-weight-medium, 500)',
        lineHeight: 1.5,
        color: 'var(--text-input-label, #4D5358)',
      }}
    >
      {label}
      {required && <span style={{ color: 'var(--text-input-require, #DC2626)' }}>*</span>}
    </span>
    <span
      className='flex items-center w-full overflow-hidden'
      style={{
        height: 'var(--dim-size-1200, 56px)',
        padding: 'var(--dim-space-200, 8px) var(--dim-space-400, 16px)',
        border: 'var(--dim-stroke-100, 1px) solid var(--border-input-default, #E2E4E6)',
        borderRadius: 'var(--dim-radius-full, 9999px)',
        background: disabled
          ? 'var(--surface-disabled-tertiary, #F4F5F5)'
          : 'var(--surface-input-default, #FFFFFF)',
      }}
    >
      <select
        className='mih-pharmacy-address-select'
        value={value}
        onChange={onChange}
        disabled={disabled}
        aria-label={label}
        style={{
          flex: 1,
          minWidth: 0,
          height: '100%',
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-base, 16px)',
          color: value
            ? 'var(--text-input-filled, #111314)'
            : 'var(--text-input-default, #ADB2B7)',
        }}
      >
        {children}
      </select>
      {!disabled && <Sym name='expand_more' size='var(--dim-size-300, 16px)' color='var(--icon-input-default, #ADB2B7)' />}
    </span>
  </label>
);

const PostalAddressSheet = ({ open, onBack, onClose, onConfirm }) => {
  const [form, setForm] = useState({
    postalCode: '',
    province: 'กรุงเทพมหานคร',
    district: '',
    subdistrict: '',
    road: '',
    soi: '',
    houseNumber: '',
    remember: false,
  });

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const setField = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };
  const canConfirm = Boolean(
    form.postalCode
    && form.district
    && form.subdistrict
    && form.road.trim()
    && form.houseNumber.trim(),
  );

  return (
    <div
      role='presentation'
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 90,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        background: 'var(--surface-overlay-default, rgb(100 116 139 / 0.40))',
      }}
    >
      <section
        role='dialog'
        aria-modal='true'
        aria-label='กรอกที่อยู่สำหรับรับยาทางไปรษณีย์'
        className='flex flex-col'
        style={{
          width: 'min(100%, var(--dim-size-2610, 402px))',
          maxHeight: 'calc(100% - var(--dim-space-1200, 48px))',
          overflow: 'hidden',
          background: 'var(--surface-card-100, #FFFFFF)',
          borderTopLeftRadius: 'var(--dim-radius-700, 38px)',
          borderTopRightRadius: 'var(--dim-radius-700, 38px)',
          boxShadow: 'var(--shadow-drop-bottom-400)',
        }}
      >
        <header
          className='shrink-0'
          style={{ borderBottom: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary, #F4F5F5)' }}
        >
          <div
            aria-hidden
            style={{
              width: 'var(--dim-size-700, 36px)',
              height: 'var(--dim-space-100, 4px)',
              margin: 'var(--dim-space-150, 6px) auto',
              borderRadius: 'var(--dim-radius-full, 9999px)',
              background: 'var(--border-neutral-secondary, #C6CACE)',
            }}
          />
          <div className='flex items-center justify-between' style={{ padding: '0 var(--dim-space-400, 16px) var(--dim-space-200, 8px)' }}>
            <button
              type='button'
              aria-label='ย้อนกลับ'
              onClick={onBack}
              className='inline-flex items-center justify-center'
              style={{
                width: 'var(--dim-size-800, 40px)',
                height: 'var(--dim-size-800, 40px)',
                padding: 0,
                border: 0,
                borderRadius: 'var(--dim-radius-600, 24px)',
                background: 'var(--surface-brandPrimary-quaternary, #F4FBF8)',
                color: 'var(--icon-brandPrimary-default, #007549)',
                cursor: 'pointer',
              }}
            >
              <Sym name='chevron_left' size='var(--dim-size-300, 16px)' />
            </button>
            <h2
              style={{
                margin: 0,
                fontFamily: 'var(--type-family-heading-graphic2)',
                fontSize: 'var(--type-size-base, 16px)',
                fontWeight: 'var(--type-weight-regular, 400)',
                lineHeight: 1.5,
              }}
            >
              ช่องทางรับยา
            </h2>
            <button
              type='button'
              aria-label='ปิด'
              onClick={onClose}
              className='inline-flex items-center justify-center'
              style={{
                width: 'var(--dim-size-800, 40px)',
                height: 'var(--dim-size-800, 40px)',
                padding: 0,
                border: 0,
                borderRadius: 'var(--dim-radius-600, 24px)',
                background: 'var(--surface-brandPrimary-quaternary, #F4FBF8)',
                color: 'var(--icon-brandPrimary-default, #007549)',
                cursor: 'pointer',
              }}
            >
              <Sym name='close' size='var(--dim-size-300, 16px)' />
            </button>
          </div>
        </header>

        <div className='flex-1 min-h-0 overflow-y-auto' style={{ padding: 'var(--dim-space-400, 16px)' }}>
          <h3
            style={{
              margin: '0 0 var(--dim-space-400, 16px)',
              fontFamily: 'var(--type-family-heading-graphic2)',
              fontSize: 'var(--type-size-xl, 20px)',
              fontWeight: 'var(--type-weight-regular, 400)',
              lineHeight: 1.375,
              textAlign: 'center',
              color: 'var(--text-brandPrimary-default, #007549)',
            }}
          >
            กรอกที่อยู่ที่ต้องการใช้ในการรับยา
            <br />
            ทางไปรษณีย์
          </h3>

          <div className='flex flex-col' style={{ gap: 'var(--dim-space-400, 16px)' }}>
            <AddressSelect label='รหัสไปรษณีย์' required value={form.postalCode} onChange={setField('postalCode')}>
              <option value=''>เลือกรหัสไปรษณีย์</option>
              <option value='10110'>10110</option>
              <option value='10400'>10400</option>
            </AddressSelect>
            <AddressSelect label='จังหวัด' value={form.province} disabled>
              <option value='กรุงเทพมหานคร'>กรุงเทพมหานคร</option>
            </AddressSelect>
            <AddressSelect label='เขต/อำเภอ' required value={form.district} onChange={setField('district')}>
              <option value=''>เลือกเขต/อำเภอ</option>
              <option value='คลองเตย'>คลองเตย</option>
              <option value='ดินแดง'>ดินแดง</option>
            </AddressSelect>
            <AddressSelect label='แขวง/ตำบล' required value={form.subdistrict} onChange={setField('subdistrict')}>
              <option value=''>เลือกแขวง/ตำบล</option>
              <option value='คลองตัน'>คลองตัน</option>
              <option value='ดินแดง'>ดินแดง</option>
            </AddressSelect>
            <MobileInputField
              label='ถนน'
              required
              value={form.road}
              onChange={setField('road')}
              placeholder='เช่น สุขุมวิท'
              showHelperText={false}
            />
            <MobileInputField
              label='หมู่/ซอย'
              value={form.soi}
              onChange={setField('soi')}
              placeholder='-'
              showHelperText={false}
            />
            <MobileInputField
              label='เลขที่บ้าน'
              required
              value={form.houseNumber}
              onChange={setField('houseNumber')}
              placeholder='เช่น 123/45'
              showHelperText={false}
            />
            <label
              className='flex items-start'
              style={{
                gap: 'var(--dim-space-400, 16px)',
                fontFamily: 'var(--type-family-body)',
                fontSize: 'var(--type-size-sm, 14px)',
                lineHeight: 1.5,
                color: 'var(--text-content-default, #111314)',
              }}
            >
              <input
                type='checkbox'
                checked={form.remember}
                onChange={(event) => setForm((current) => ({ ...current, remember: event.target.checked }))}
                style={{
                  width: 'var(--dim-size-400, 20px)',
                  height: 'var(--dim-size-400, 20px)',
                  accentColor: 'var(--surface-brandPrimary-default, #007549)',
                  flexShrink: 0,
                }}
              />
              บันทึกที่อยู่สำหรับครั้งถัดไป
            </label>
          </div>
        </div>

        <footer
          className='shrink-0'
          style={{
            padding: 'var(--dim-space-400, 16px) var(--dim-space-400, 16px) var(--dim-space-800, 32px)',
            borderTop: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary, #E2F3EB)',
            boxShadow: 'var(--shadow-brand-drop-top-100)',
            background: 'var(--surface-card-100, #FFFFFF)',
          }}
        >
          <BrandButton
            size='lg'
            disabled={!canConfirm}
            onClick={() => onConfirm(form)}
            style={{ width: '100%' }}
          >
            ตกลง
          </BrandButton>
        </footer>
      </section>
    </div>
  );
};

const PaymentProcessingScreen = () => {
  const [animationData, setAnimationData] = useState(null);

  useEffect(() => {
    let mounted = true;
    fetch('/illustration/mobile/insurance-recolored.json')
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (mounted) setAnimationData(data);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <main
      className='flex flex-col items-center'
      aria-live='polite'
      style={{
        height: '100%',
        minHeight: 0,
        padding: 'var(--dim-space-600, 24px) var(--dim-space-400, 16px)',
        background: 'var(--background-screen-brand-100, #F4FBF8)',
      }}
    >
      <section
        className='flex flex-1 flex-col items-center justify-center w-full'
        style={{
          minHeight: 0,
          gap: 'var(--dim-space-600, 24px)',
          padding: 'var(--dim-space-600, 24px)',
          borderRadius: 'var(--dim-radius-500, 16px)',
          background: 'var(--surface-card-100, #FFFFFF)',
          boxShadow: 'var(--shadow-brand-drop-bottom-100)',
        }}
      >
        <LottieIllustration
          animationData={animationData}
          size='var(--dim-size-2100, 160px)'
          loop
          ariaLabel=''
        />
        <div className='flex flex-col items-center w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          <h1
            style={{
              margin: 0,
              width: '100%',
              fontFamily: 'var(--type-family-heading-graphic2)',
              fontSize: 'var(--type-size-2xl, 24px)',
              fontWeight: 'var(--type-weight-regular, 400)',
              lineHeight: 1.375,
              textAlign: 'center',
              color: 'var(--text-brandPrimary-default, #007549)',
            }}
          >
            กำลังตรวจสอบการชำระเงิน
          </h1>
          <p
            style={{
              margin: 0,
              width: '100%',
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-base, 16px)',
              fontWeight: 'var(--type-weight-regular, 400)',
              lineHeight: 1.5,
              textAlign: 'center',
              color: 'var(--text-content-tertiary, #858C92)',
            }}
          >
            กรุณารอสักครู่
            <br />
            ระบบกำลังยืนยันการชำระเงินของคุณ
            <br />
            อย่าปิดหรือออกจากหน้านี้
          </p>
        </div>
      </section>
    </main>
  );
};

const QrCameraViewport = () => (
  <div
    style={{
      position: 'relative',
      width: '100%',
      aspectRatio: '1 / 1',
      overflow: 'hidden',
      borderRadius: 'var(--dim-radius-550, 22px)',
      background: 'var(--surface-camera-viewport, #111827)',
    }}
  >
    {[
      { top: 'var(--dim-size-1000, 48px)', left: 'var(--dim-size-800, 40px)', borderTop: true, borderLeft: true },
      { top: 'var(--dim-size-1000, 48px)', right: 'var(--dim-size-800, 40px)', borderTop: true, borderRight: true },
      { bottom: 'var(--dim-size-1000, 48px)', left: 'var(--dim-size-800, 40px)', borderBottom: true, borderLeft: true },
      { bottom: 'var(--dim-size-1000, 48px)', right: 'var(--dim-size-800, 40px)', borderBottom: true, borderRight: true },
    ].map((corner, index) => (
      <span
        key={index}
        aria-hidden
        style={{
          position: 'absolute',
          ...corner,
          width: 'calc(var(--dim-size-500, 24px) + var(--dim-space-100, 4px))',
          height: 'calc(var(--dim-size-500, 24px) + var(--dim-space-100, 4px))',
          borderTop: corner.borderTop ? 'var(--dim-stroke-300, 3px) solid var(--brand-p500, #54CF97)' : 'none',
          borderRight: corner.borderRight ? 'var(--dim-stroke-300, 3px) solid var(--brand-p500, #54CF97)' : 'none',
          borderBottom: corner.borderBottom ? 'var(--dim-stroke-300, 3px) solid var(--brand-p500, #54CF97)' : 'none',
          borderLeft: corner.borderLeft ? 'var(--dim-stroke-300, 3px) solid var(--brand-p500, #54CF97)' : 'none',
          borderRadius: 'var(--dim-radius-100, 4px)',
        }}
      />
    ))}
    <span
      aria-hidden
      style={{
        position: 'absolute',
        top: '50%',
        right: 'var(--dim-size-800, 40px)',
        left: 'var(--dim-size-800, 40px)',
        height: 'var(--dim-stroke-300, 3px)',
        borderRadius: 'var(--dim-radius-100, 4px)',
        background: 'var(--brand-p500, #54CF97)',
      }}
    />
    <span
      style={{
        position: 'absolute',
        right: 0,
        bottom: 'var(--dim-space-300, 12px)',
        left: 0,
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-xs, 12px)',
        fontWeight: 'var(--type-weight-medium, 500)',
        lineHeight: 1.5,
        textAlign: 'center',
        color: 'var(--text-content-on-content, #FFFFFF)',
      }}
    >
      วาง QR ให้อยู่ในกรอบ
    </span>
  </div>
);

const MedicationReceiptScreen = ({ onBack, onComplete }) => {
  const [flashlightOn, setFlashlightOn] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(onComplete, 3000);
    return () => window.clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className='flex flex-col' style={{ height: '100%', minHeight: 0 }}>
      <MobileNavHeader title='ยืนยันการรับยา' onBack={onBack} />
      <JourneyStepper receipt />
      <main
        className='flex-1 min-h-0 overflow-y-auto'
        style={{
          padding: 'var(--dim-space-400, 16px)',
          background: 'var(--background-screen-brand-100, #F4FBF8)',
        }}
      >
        <section
          className='flex flex-col items-center'
          style={{
            gap: 'var(--dim-space-400, 16px)',
            padding: 'var(--dim-space-600, 24px)',
            borderRadius: 'var(--dim-radius-600, 24px)',
            background: 'var(--surface-card-100, #FFFFFF)',
            boxShadow: 'var(--shadow-brand-drop-bottom-200)',
          }}
        >
          <div className='flex flex-col items-center w-full' style={{ gap: 'var(--dim-space-150, 6px)' }}>
            <h1
              style={{
                margin: 0,
                width: '100%',
                fontFamily: 'var(--type-family-heading-graphic2)',
                fontSize: 'var(--type-size-xl, 20px)',
                fontWeight: 'var(--type-weight-regular, 400)',
                lineHeight: 1.375,
                textAlign: 'center',
                color: 'var(--text-brandPrimary-default, #007549)',
              }}
            >
              สแกน QR บนถุงยา
            </h1>
            <p
              style={{
                margin: 0,
                width: '100%',
                fontFamily: 'var(--type-family-body)',
                fontSize: 'var(--type-size-sm, 14px)',
                lineHeight: 1.5,
                textAlign: 'center',
                color: 'var(--text-content-tertiary, #858C92)',
              }}
            >
              หันกล้องไปที่ QR code บนถุงยาของคุณ
              <br />
              เพื่อยืนยันว่าได้รับยาถูกต้องครบถ้วน
            </p>
          </div>
          <QrCameraViewport />
          <div className='flex flex-col items-center' style={{ gap: 'var(--dim-space-150, 6px)' }}>
            <BrandCircleSubdueIconButton
              icon={flashlightOn ? 'flashlight_on' : 'flashlight_off'}
              size='Large'
              variant='outline'
              aria-pressed={flashlightOn}
              aria-label={flashlightOn ? 'ปิดไฟฉาย' : 'เปิดไฟฉาย'}
              onClick={() => setFlashlightOn((current) => !current)}
            />
            <span
              style={{
                fontFamily: 'var(--type-family-body)',
                fontSize: 'var(--type-size-xs, 12px)',
                fontWeight: 'var(--type-weight-medium, 500)',
                lineHeight: 1.5,
                color: 'var(--text-content-default, #111314)',
              }}
            >
              {flashlightOn ? 'ปิดไฟฉาย' : 'เปิดไฟฉาย'}
            </span>
          </div>
        </section>
      </main>
    </div>
  );
};

const ReceiptSuccessMedicationRow = ({ medication }) => (
  <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
    <span
      className='overflow-hidden shrink-0'
      style={{
        width: 'var(--dim-size-800, 40px)',
        height: 'var(--dim-size-800, 40px)',
        borderRadius: 'var(--dim-radius-full, 9999px)',
        border: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary, #F4F5F5)',
      }}
    >
      <img
        src='/illustration/mobile/medication-tablets.png'
        alt=''
        aria-hidden
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
      />
    </span>
    <span className='flex flex-col' style={{ flex: 1, minWidth: 0 }}>
      <strong
        style={{
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-sm, 14px)',
          fontWeight: 'var(--type-weight-bold, 700)',
          lineHeight: 1.5,
          color: 'var(--text-content-secondary, #636B72)',
        }}
      >
        {medication.name}
      </strong>
      <span
        style={{
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-xs, 12px)',
          lineHeight: 1.5,
          color: 'var(--text-content-tertiary, #858C92)',
        }}
      >
        {medication.detail}
      </span>
    </span>
  </div>
);

const MedicationReceiptSuccess = ({ onViewInstructions, onHome }) => (
  <main
    className='flex items-center justify-center'
    style={{
      height: '100%',
      minHeight: 0,
      padding: 'var(--dim-space-600, 24px) var(--dim-space-400, 16px)',
      background: 'linear-gradient(155.3deg, rgb(19 178 146) 0%, rgb(1 180 160) 100%)',
    }}
  >
    <section
      className='flex flex-col items-center w-full'
      style={{
        gap: 'var(--dim-space-400, 16px)',
        padding: 'var(--dim-space-1200, 48px) var(--dim-space-400, 16px)',
        borderTopLeftRadius: 'var(--dim-radius-1000, 100px)',
        borderTopRightRadius: 'var(--dim-radius-1000, 100px)',
        borderBottomLeftRadius: 'var(--dim-radius-600, 24px)',
        borderBottomRightRadius: 'var(--dim-radius-600, 24px)',
        background: 'var(--surface-card-100, #FFFFFF)',
      }}
    >
      <img
        src='/illustration/mobile/booking-success-award.png'
        alt=''
        aria-hidden
        style={{
          width: 'var(--dim-size-2100, 160px)',
          height: 'var(--dim-size-2100, 160px)',
          objectFit: 'contain',
          flexShrink: 0,
        }}
      />
      <h1
        style={{
          margin: 0,
          width: '100%',
          fontFamily: 'var(--type-family-heading-graphic2)',
          fontSize: 'var(--type-size-2xl, 24px)',
          fontWeight: 'var(--type-weight-regular, 400)',
          lineHeight: 1.375,
          textAlign: 'center',
          color: 'var(--text-brandPrimary-default, #007549)',
        }}
      >
        รับยาสำเร็จ
      </h1>
      <p
        style={{
          margin: 0,
          width: '100%',
          fontFamily: 'var(--type-family-heading-graphic2)',
          fontSize: 'var(--type-size-base, 16px)',
          fontWeight: 'var(--type-weight-regular, 400)',
          lineHeight: 1.5,
          textAlign: 'center',
          color: 'var(--text-content-secondary, #636B72)',
        }}
      >
        ระบบได้บันทึกว่าคุณได้รับยาเรียบร้อยแล้ว
      </p>
      <div
        className='flex flex-col w-full'
        style={{
          gap: 'var(--dim-space-200, 8px)',
          padding: 'var(--dim-space-400, 16px)',
          border: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary, #E2F3EB)',
          borderRadius: 'var(--dim-radius-600, 24px)',
          background: 'var(--surface-card-100, #FFFFFF)',
        }}
      >
        <h2
          style={{
            margin: 0,
            fontFamily: 'var(--type-family-heading-graphic2)',
            fontSize: 'var(--type-size-sm, 14px)',
            fontWeight: 'var(--type-weight-regular, 400)',
            lineHeight: 1.5,
            color: 'var(--text-content-default, #111314)',
          }}
        >
          รายการยา
        </h2>
        {MEDICATIONS.map((medication, index) => (
          <React.Fragment key={medication.name}>
            <ReceiptSuccessMedicationRow medication={medication} />
            {index < MEDICATIONS.length - 1 && <span style={divider} />}
          </React.Fragment>
        ))}
      </div>
      <div className='flex flex-col items-center' style={{ gap: 'var(--dim-space-400, 16px)' }}>
        <BrandButton
          size='lg'
          onClick={onViewInstructions}
          style={{ width: 'var(--dim-size-2200, 192px)', whiteSpace: 'nowrap' }}
        >
          ดูวิธีใช้ยา
        </BrandButton>
        <BrandButton
          size='lg'
          variant='outline'
          onClick={onHome}
          style={{ width: 'var(--dim-size-2200, 192px)', whiteSpace: 'nowrap' }}
        >
          กลับสู่หน้าหลัก
        </BrandButton>
      </div>
    </section>
  </main>
);

const PharmacyPaymentInner = () => {
  const history = useHistory();
  const [hasDeliveryDetails, setHasDeliveryDetails] = useState(false);
  const [deliverySheetOpen, setDeliverySheetOpen] = useState(false);
  const [addressSheetOpen, setAddressSheetOpen] = useState(false);
  const [deliveryMethod, setDeliveryMethod] = useState(null);
  const [deliveryAddress, setDeliveryAddress] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [receiptConfirmation, setReceiptConfirmation] = useState(false);
  const [receiptSuccess, setReceiptSuccess] = useState(false);

  useEffect(() => {
    if (!processing) return undefined;
    const timer = window.setTimeout(() => {
      setProcessing(false);
      setReceiptConfirmation(true);
    }, 3000);
    return () => window.clearTimeout(timer);
  }, [processing]);

  if (receiptSuccess) {
    return (
      <MedicationReceiptSuccess
        onViewInstructions={() => history.push('/m/records')}
        onHome={() => history.push('/m/home')}
      />
    );
  }
  if (receiptConfirmation) {
    return (
      <MedicationReceiptScreen
        onBack={() => history.push('/m/home')}
        onComplete={() => {
          setReceiptConfirmation(false);
          setReceiptSuccess(true);
        }}
      />
    );
  }
  if (processing) return <PaymentProcessingScreen />;

  return (
    <div className='flex flex-col' style={{ height: '100%', minHeight: 0 }}>
      <MobileNavHeader title='ชำระเงิน' onBack={() => history.goBack()} />

      <JourneyStepper />

      <main
        className='flex-1 min-h-0 overflow-y-auto'
        style={{
          padding: 'calc(var(--dim-space-300, 12px) + var(--dim-space-050, 2px)) var(--dim-space-400, 16px) var(--dim-space-400, 16px)',
          background: 'var(--background-screen-brand-100, #F4FBF8)',
        }}
      >
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-300, 12px)' }}>
          {/* Prescription header row */}
          <section
            className='flex items-center'
            style={{ ...cardBase, gap: 'var(--dim-space-100, 4px)', borderRadius: 'var(--dim-radius-500, 16px)' }}
          >
            <h1 style={{
              flex: 1,
              margin: 0,
              fontFamily: 'var(--type-family-heading-graphic2)',
              fontSize: 'var(--type-size-base, 16px)',
              fontWeight: 'var(--type-weight-regular, 400)',
              color: 'var(--text-brandPrimary-default, #007549)',
            }}
            >
              ใบสั่งยา #PH-25690701
            </h1>
            <strong style={{ fontSize: 'var(--type-size-sm, 14px)' }}>1 ก.ค. 2569</strong>
          </section>

          {/* Prescribing doctor */}
          <section style={{ ...cardBase, borderRadius: 'var(--dim-radius-600, 24px)' }}>
            <p style={{ margin: '0 0 var(--dim-space-100, 4px)', fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-tertiary, #858C92)' }}>
              แพทย์ผู้สั่ง
            </p>
            <div className='flex items-start' style={{ gap: 'var(--dim-space-400, 16px)' }}>
              <span
                className='overflow-hidden shrink-0'
                style={{
                  width: 'var(--dim-size-1000, 48px)',
                  height: 'var(--dim-size-1000, 48px)',
                  borderRadius: 'var(--dim-radius-full, 9999px)',
                }}
              >
                <img
                  src='/illustration/mobile/doctor-h.png'
                  alt=''
                  width={48}
                  height={48}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scale(1.18)' }}
                />
              </span>
              <div className='flex flex-col' style={{ flex: 1, minWidth: 0, gap: 'var(--dim-space-050, 2px)' }}>
                <p style={{
                  margin: 0,
                  fontFamily: 'var(--type-family-heading-graphic2)',
                  fontSize: 'var(--type-size-base, 16px)',
                  lineHeight: 1.5,
                }}
                >
                  นพ. สมชาย ใจดี
                </p>
                <MetaRow icon='stethoscope' label='แผนก' value='อายุรแพทย์โรคหัวใจ' />
                <MetaRow icon='description' label='เลขใบประกอบวิชาชีพ' value='ว.12346' />
                <MetaRow icon='location_on' label='ศูนย์' value='ดินแดง' />
              </div>
            </div>
          </section>

          {/* Delivery details */}
          <section
            className='flex flex-col'
            style={{ ...cardBase, gap: 'var(--dim-space-400, 16px)', borderRadius: 'var(--dim-radius-500, 16px)' }}
          >
            <SectionTitle>รายละเอียดการรับยา</SectionTitle>

            {!hasDeliveryDetails ? (
              <BrandButton
                size='md'
                variant='outline'
                leadingIcon='add'
                onClick={() => setDeliverySheetOpen(true)}
                style={{
                  width: 'var(--dim-size-2190, 190px)',
                  whiteSpace: 'nowrap',
                }}
              >
                เพิ่มรายละเอียด
              </BrandButton>
            ) : (
              <>
            <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
              <PharmacyIconBadge
                src={deliveryMethod === 'clinic'
                  ? '/illustration/mobile/pharmacy-pickup-clinic.svg'
                  : '/illustration/mobile/pharmacy-truck.svg'}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 'var(--type-size-xs, 12px)', lineHeight: 1.5, color: 'var(--text-content-tertiary, #858C92)' }}>
                  ช่องทางรับยา
                </p>
                <p style={{ margin: 0, fontSize: 'var(--type-size-sm, 14px)', fontWeight: 'var(--type-weight-bold, 700)', lineHeight: 1.5, color: 'var(--text-content-default, #111314)' }}>
                  {deliveryMethod === 'clinic' ? 'รับด้วยตนเองที่ศูนย์บริการ' : 'รับทางไปรษณีย์'}
                </p>
              </div>
            </div>

            <span style={divider} />

            <div className='flex items-start w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
              <PharmacyIconBadge src='/illustration/mobile/pharmacy-map-pin.svg' />
              <div className='flex flex-col' style={{ flex: 1, minWidth: 0, gap: 'var(--dim-space-050, 2px)' }}>
                <p style={{ margin: 0, fontSize: 'var(--type-size-xs, 12px)', lineHeight: 1.5, color: 'var(--text-content-tertiary, #858C92)' }}>
                  {deliveryMethod === 'clinic' ? 'ศูนย์บริการสำหรับรับยา' : 'ที่อยู่สำหรับรับยา'}
                </p>
                <p style={{ margin: 0, fontSize: 'var(--type-size-sm, 14px)', lineHeight: 1.5, color: 'var(--text-content-default, #111314)' }}>
                  {deliveryMethod === 'clinic'
                    ? 'ศูนย์ 4, ดินแดง'
                    : `${deliveryAddress?.houseNumber || ''}${deliveryAddress?.soi ? ` ซอย${deliveryAddress.soi}` : ''} ถนน${deliveryAddress?.road || ''} แขวง${deliveryAddress?.subdistrict || ''} เขต${deliveryAddress?.district || ''} ${deliveryAddress?.province || ''} ${deliveryAddress?.postalCode || ''}`}
                </p>
                <div style={{ paddingTop: 'var(--dim-space-200, 8px)' }}>
                  <BrandSubdueButton
                    size='md'
                    variant='outline'
                    fullWidth={false}
                    leadingIcon='swap_horiz'
                    onClick={() => setDeliverySheetOpen(true)}
                  >
                    เปลี่ยนรายละเอียด
                  </BrandSubdueButton>
                </div>
              </div>
            </div>
              </>
            )}
          </section>

          {/* Itemised drugs + cost summary */}
          <section
            className='flex flex-col'
            style={{ ...cardBase, gap: 'var(--dim-space-200, 8px)', borderRadius: 'var(--dim-radius-600, 24px)' }}
          >
            <SectionTitle>รายการยา</SectionTitle>
            {MEDICATIONS.map((medication) => (
              <React.Fragment key={medication.name}>
                <MedicationRow medication={medication} />
                <span style={divider} />
              </React.Fragment>
            ))}
            <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
              <CostRow label='รวมค่ายา' value='฿550' />
              <CostRow label='หักสิทธิ์เบิกจ่าย / เคลม' value='−฿400' danger />
              <CostRow label='ค่าธรรมเนียมบริการ' value='฿20' />
            </div>
            <span style={{ ...divider, background: 'var(--border-neutral-tertiary, #EEF0F2)' }} />
            <div className='flex items-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
              <strong style={{
                flex: 1,
                fontFamily: 'var(--type-family-heading-graphic2)',
                fontSize: 'var(--type-size-base, 16px)',
                fontWeight: 'var(--type-weight-medium, 500)',
              }}
              >
                ยอดที่ต้องชำระ
              </strong>
              <strong style={{
                fontSize: 'var(--type-size-2xl, 24px)',
                color: 'var(--text-payment-total, #24A899)',
              }}
              >
                ฿170
              </strong>
            </div>
          </section>
        </div>
      </main>

      <footer
        className='shrink-0'
        style={{
          padding: 'var(--dim-space-400, 16px)',
          background: 'var(--surface-card-100, #FFFFFF)',
          borderTop: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary, #E2F3EB)',
          boxShadow: 'var(--shadow-brand-drop-top-100)',
        }}
      >
        <BrandButton
          size='lg'
          trailingIcon='chevron_right'
          disabled={!hasDeliveryDetails}
          onClick={() => setProcessing(true)}
          style={{ width: '100%' }}
        >
          ชำระเงิน
        </BrandButton>
      </footer>
      <DeliveryMethodSheet
        open={deliverySheetOpen}
        onClose={() => setDeliverySheetOpen(false)}
        onConfirm={(method) => {
          setDeliveryMethod(method);
          setDeliverySheetOpen(false);
          if (method === 'delivery') {
            setAddressSheetOpen(true);
          } else {
            setHasDeliveryDetails(true);
          }
        }}
      />
      <PostalAddressSheet
        open={addressSheetOpen}
        onBack={() => {
          setAddressSheetOpen(false);
          setDeliverySheetOpen(true);
        }}
        onClose={() => setAddressSheetOpen(false)}
        onConfirm={(address) => {
          setDeliveryAddress(address);
          setDeliveryMethod('delivery');
          setHasDeliveryDetails(true);
          setAddressSheetOpen(false);
        }}
      />
    </div>
  );
};

if (typeof document !== 'undefined') {
  const styleId = 'mih-pharmacy-address-select-css';
  document.getElementById(styleId)?.remove();
  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    .mih-pharmacy-address-select,
    .mih-pharmacy-address-select:focus,
    .mih-pharmacy-address-select:focus-visible {
      width: 100%;
      caret-color: transparent;
      border: 0 !important;
      outline: none !important;
      box-shadow: none !important;
      background: transparent !important;
      -webkit-appearance: none !important;
      appearance: none !important;
    }
  `;
  document.head.appendChild(style);
}

const MobilePharmacyPaymentPage = () => (
  <MobileShell
    requireAuth
    showBottomNav={false}
    background='var(--background-screen-brand-100, #F4FBF8)'
    statusBarStyle={{ height: 'var(--dim-size-1050, 50px)' }}
  >
    <PharmacyPaymentInner />
  </MobileShell>
);

export default MobilePharmacyPaymentPage;
