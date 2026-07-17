import React, { useEffect, useMemo, useRef, useState } from 'react';
import lottie from 'lottie-web';
import StatusBadge from '@/components/badge/StatusBadge';
import { Sym } from './Sym';
import MobileInputField from './InputField';
import BrandButton from './button/BrandButton';

const HealthIllustration = () => {
  const hostRef = useRef(null);

  useEffect(() => {
    if (!hostRef.current) return undefined;
    const animation = lottie.loadAnimation({
      container: hostRef.current,
      renderer: 'svg',
      loop: true,
      autoplay: true,
      path: '/illustration/mobile/online-health-checkup.json',
      rendererSettings: { preserveAspectRatio: 'xMidYMid meet' },
    });
    return () => animation.destroy();
  }, []);

  return (
    <div
      ref={hostRef}
      aria-hidden
      style={{
        width: 'var(--dim-size-2000, 128px)',
        height: 'var(--dim-size-2000, 128px)',
      }}
    />
  );
};

const HealthInfoSheet = ({ open, onClose, onSave }) => {
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');

  useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  const bmi = useMemo(() => {
    const weightNumber = Number(weight);
    const heightNumber = Number(height);
    if (!weightNumber || !heightNumber) return '22.5';
    return (weightNumber / ((heightNumber / 100) ** 2)).toFixed(1);
  }, [weight, height]);

  const bmiNumber = Number(bmi);
  const bmiStatus = bmiNumber < 18.5
    ? 'น้ำหนักน้อย'
    : bmiNumber < 25
      ? 'ปกติ'
      : bmiNumber < 30
        ? 'น้ำหนักเกิน'
        : 'อ้วน';

  if (!open) return null;

  const save = () => {
    onSave?.({
      weight: weight || '52',
      height: height || '165',
      systolic,
      diastolic,
      bmi,
    });
    onClose?.();
  };

  return (
    <div
      role='presentation'
      onClick={onClose}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 90,
        display: 'flex',
        alignItems: 'flex-end',
        background: 'var(--surface-overlay-default, rgb(100 116 139 / 0.40))',
      }}
    >
      <section
        role='dialog'
        aria-modal='true'
        aria-label='ข้อมูลสุขภาพ'
        onClick={(event) => event.stopPropagation()}
        style={{
          width: '100%',
          height: 'calc(100% - var(--dim-size-1300, 60px))',
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          background: 'var(--surface-card-100, #FFFFFF)',
          borderTopLeftRadius: 'var(--dim-radius-700, 38px)',
          borderTopRightRadius: 'var(--dim-radius-700, 38px)',
          boxShadow: 'var(--shadow-brand-top-200)',
        }}
      >
        <header
          className='flex flex-col items-center shrink-0'
          style={{
            paddingBottom: 'calc(var(--dim-space-200, 8px) + var(--dim-space-050, 2px))',
            borderBottom: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary, #F4F5F5)',
          }}
        >
          <div
            className='flex flex-col items-center'
            style={{
              height: 'var(--dim-size-300, 16px)',
              paddingTop: 'calc(var(--dim-space-100, 4px) + var(--dim-stroke-100, 1px))',
            }}
          >
            <span
              style={{
                width: 'var(--dim-size-700, 36px)',
                height: 'var(--dim-space-100, 4px)',
                borderRadius: 'var(--dim-radius-full, 9999px)',
                background: 'var(--border-switch-default, #C9CDD0)',
              }}
            />
          </div>

          <div
            className='flex items-center justify-between w-full'
            style={{ paddingInline: 'var(--dim-space-400, 16px)' }}
          >
            <span
              aria-hidden
              style={{ width: 'var(--dim-size-800, 40px)', height: 'var(--dim-size-800, 40px)' }}
            />
            <h2
              style={{
                margin: 0,
                fontFamily: 'var(--type-family-heading-graphic2)',
                fontSize: 'var(--type-size-base, 16px)',
                fontWeight: 'var(--type-weight-regular, 400)',
                lineHeight: 1.5,
                color: 'var(--text-content-default, #363B3F)',
              }}
            >
              ข้อมูลสุขภาพ
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
                color: 'var(--text-brandPrimary-secondary, #08A768)',
                cursor: 'pointer',
              }}
            >
              <Sym name='close' size='var(--dim-size-300, 16px)' />
            </button>
          </div>
        </header>

        <div className='flex-1 min-h-0 overflow-y-auto'>
          <div
            className='flex flex-col items-center'
            style={{
              padding: 'var(--dim-space-400, 16px)',
              gap: 'var(--dim-space-150, 6px)',
              borderBottom: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary, #F4F5F5)',
            }}
          >
            <HealthIllustration />
            <div className='flex flex-col items-center w-full' style={{ gap: 'var(--dim-space-150, 6px)' }}>
              <h3
                style={{
                  margin: 0,
                  textAlign: 'center',
                  fontFamily: 'var(--type-family-heading-graphic2)',
                  fontSize: 'var(--type-size-xl, 20px)',
                  fontWeight: 'var(--type-weight-regular, 400)',
                  lineHeight: 1.375,
                  color: 'var(--text-brandPrimary-default, #007549)',
                }}
              >
                กรอกข้อมูลสุขภาพก่อนพบแพทย์
              </h3>
              <p
                style={{
                  margin: 0,
                  textAlign: 'center',
                  fontFamily: 'var(--type-family-body)',
                  fontSize: 'var(--type-size-sm, 14px)',
                  fontWeight: 'var(--type-weight-regular, 400)',
                  lineHeight: 1.5,
                  color: 'var(--text-content-tertiary, #858C92)',
                }}
              >
                เพื่อช่วยให้แพทย์ประเมินอาการได้แม่นยำขึ้น
              </p>
            </div>
          </div>

          <div
            className='flex flex-col'
            style={{
              gap: 'var(--dim-space-600, 24px)',
              padding: 'var(--dim-space-600, 24px) var(--dim-space-400, 16px) var(--dim-space-400, 16px)',
            }}
          >
            <div className='flex flex-col' style={{ gap: 'var(--dim-space-200, 8px)' }}>
              <div className='flex items-start' style={{ gap: 'var(--dim-space-400, 16px)' }}>
                <MobileInputField
                  label='น้ำหนัก (กก.)'
                  required
                  type='number'
                  inputMode='decimal'
                  placeholder='52'
                  value={weight}
                  onChange={(event) => setWeight(event.target.value)}
                />
                <MobileInputField
                  label='ส่วนสูง (ซม.)'
                  required
                  type='number'
                  inputMode='decimal'
                  placeholder='165'
                  value={height}
                  onChange={(event) => setHeight(event.target.value)}
                />
              </div>

              <div
                className='flex items-center justify-between overflow-hidden'
                style={{
                  padding: 'var(--dim-space-300, 12px) var(--dim-space-400, 16px)',
                  border: 'var(--dim-stroke-100, 1px) solid var(--border-info-tertiary, #BFDBFE)',
                  borderRadius: 'var(--dim-radius-600, 24px)',
                  background: 'var(--surface-info-quaternary, #F0F6FF)',
                }}
              >
                <div className='flex flex-col' style={{ gap: 'var(--dim-space-050, 2px)' }}>
                  <span
                    style={{
                      fontFamily: 'var(--type-family-heading-graphic2)',
                      fontSize: 'var(--type-size-sm, 14px)',
                      lineHeight: 1.5,
                      color: 'var(--text-info-emphasis, #3B82F6)',
                    }}
                  >
                    ดัชนีมวลกาย (BMI)
                  </span>
                  <span
                    style={{
                      fontFamily: 'var(--type-family-body)',
                      fontSize: 'var(--type-size-xs, 12px)',
                      fontWeight: 'var(--type-weight-medium, 500)',
                      lineHeight: 1.5,
                      color: 'var(--text-info-tertiary, #60A5FA)',
                    }}
                  >
                    คำนวณอัตโนมัติจากน้ำหนักและส่วนสูง
                  </span>
                </div>
                <div className='flex items-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                  <strong
                    style={{
                      fontFamily: 'var(--type-family-heading-graphic2)',
                      fontSize: 'var(--type-size-2xl, 24px)',
                      fontWeight: 'var(--type-weight-medium, 500)',
                      lineHeight: 1.375,
                      color: 'var(--text-info-emphasis, #3B82F6)',
                    }}
                  >
                    {bmi}
                  </strong>
                  <StatusBadge style='success' size='small'>{bmiStatus}</StatusBadge>
                </div>
              </div>
            </div>

            <div className='flex flex-col' style={{ gap: 'var(--dim-space-150, 6px)' }}>
              <span
                style={{
                  fontFamily: 'var(--type-family-body)',
                  fontSize: 'var(--type-size-sm, 14px)',
                  lineHeight: 1.5,
                  color: 'var(--text-content-default, #363B3F)',
                }}
              >
                ความดันโลหิต
              </span>
              <div className='flex items-center' style={{ gap: 'var(--dim-space-150, 6px)' }}>
                <MobileInputField
                  showFieldName={false}
                  type='number'
                  inputMode='numeric'
                  placeholder='ตัวบน (SYS)'
                  value={systolic}
                  onChange={(event) => setSystolic(event.target.value)}
                />
                <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-base, 16px)' }}>/</span>
                <MobileInputField
                  showFieldName={false}
                  type='number'
                  inputMode='numeric'
                  placeholder='ตัวล่าง (DIA)'
                  value={diastolic}
                  onChange={(event) => setDiastolic(event.target.value)}
                />
              </div>
              <span
                style={{
                  fontFamily: 'var(--type-family-body)',
                  fontSize: 'var(--type-size-sm, 14px)',
                  lineHeight: 1.5,
                  color: 'var(--text-content-tertiary, #858C92)',
                }}
              >
                ไม่จำเป็นต้องกรอกหากไม่มีเครื่องวัด
              </span>
            </div>
          </div>
        </div>

        <footer
          className='flex flex-col shrink-0'
          style={{
            gap: 'var(--dim-space-300, 12px)',
            padding: 'var(--dim-space-400, 16px) var(--dim-space-400, 16px) var(--dim-space-800, 32px)',
            borderTop: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary, #E2F3EB)',
            background: 'var(--surface-card-100, #FFFFFF)',
            boxShadow: 'var(--shadow-brand-drop-top-100)',
          }}
        >
          <BrandButton size='Large' onClick={save}>บันทึกข้อมูลสุขภาพ</BrandButton>
          <BrandButton size='Medium' variant='Outline' onClick={onClose}>
            บันทึกข้อมูลสุขภาพภายหลัง
          </BrandButton>
        </footer>
      </section>
    </div>
  );
};

export default HealthInfoSheet;
