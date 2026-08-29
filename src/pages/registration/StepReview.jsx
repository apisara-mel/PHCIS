import React from 'react';
import { SectionTitle, SubCard } from '@/components/forms/Fields';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import StatusBadge from '@/components/badge/StatusBadge';
import {
  REGISTRATION_STEP_NAMES,
  getStepMissingFields,
} from '@/data/registrationForm';

/* PHCIS | เวชระเบียน — ขั้นที่ 7 "ตรวจสอบข้อมูล" (มติผู้ใช้ 27 ส.ค. 69)

   ทวนสิ่งที่กรอกมาทั้ง 6 ขั้นก่อนกดบันทึกจริง — แต่ละขั้นเป็นการ์ดหนึ่งใบ มีปุ่ม
   "แก้ไข" กระโดดกลับไปขั้นนั้นได้ทันที และติดป้ายบอกว่าขั้นไหนยังกรอกไม่ครบ
   (ใช้ `getStepMissingFields` ตัวเดียวกับที่ปุ่มบันทึกใช้ตรวจ — ผู้ใช้จึงไม่เจอ
   ว่าหน้านี้บอกว่าครบแล้วแต่กดบันทึกไม่ผ่าน)

   หน้านี้ไม่แก้ข้อมูลเอง เป็นหน้าอ่านอย่างเดียว การแก้ไขทำที่ขั้นตอนต้นทางเสมอ */

const dash = (v) => {
  const s = String(v ?? '').trim();
  return s || '—';
};

const fullNameTh = (f) => dash(
  [f.prefixTh, f.firstNameTh, f.lastNameTh].filter(Boolean).join(' '),
);

const addressLine = (a) => {
  if (!a) return '—';
  const parts = [
    a.houseNo && `เลขที่ ${a.houseNo}`,
    a.moo && `หมู่/ซอย ${a.moo}`,
    a.road && `ถ.${a.road}`,
    a.subdistrict,
    a.district,
    a.province,
    a.postcode,
  ].filter(Boolean);
  return parts.length ? parts.join(' · ') : '—';
};

/* แถวข้อมูลหนึ่งบรรทัด — ป้ายกำกับซ้าย ค่าขวา ค่าที่ยาวขึ้นบรรทัดใหม่ได้ */
const Row = ({ label, value }) => (
  <div
    className='flex items-start w-full'
    style={{ gap: 'var(--dim-space-400)' }}
  >
    <span
      className='shrink-0'
      style={{
        width: 'var(--dim-size-2200, 192px)',
        color: 'var(--text-content-secondary)',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-sm)',
        lineHeight: 1.5,
      }}
    >
      {label}
    </span>
    <span
      className='flex-1 min-w-0'
      style={{
        color: 'var(--text-content-default)',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-sm)',
        lineHeight: 1.5,
        wordBreak: 'break-word',
      }}
    >
      {value}
    </span>
  </div>
);

/* การ์ดหนึ่งขั้นตอน — ชื่อขั้น + สถานะครบ/ไม่ครบ + ปุ่มแก้ไข + รายการข้อมูล */
const StepCard = ({ stepIndex, form, onJumpToStep, children }) => {
  const missing = getStepMissingFields(form, stepIndex) || [];
  const complete = missing.length === 0;
  return (
    <SubCard>
      <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-300)' }}>
        <span style={{
          color: 'var(--text-content-default)',
          fontFamily: 'var(--type-family-heading-content)',
          fontSize: 'var(--type-size-base)',
          lineHeight: 1.5,
        }}>
          {`${stepIndex + 1}. ${REGISTRATION_STEP_NAMES[stepIndex]}`}
        </span>
        <StatusBadge
          size='small'
          style={complete ? 'success' : 'error'}
          icon={complete ? 'check_circle' : 'error'}
        >
          {complete ? 'ครบแล้ว' : `ขาด ${missing.length} รายการ`}
        </StatusBadge>
        <div className='flex-1' />
        <BrandSubdueButton
          variant='outline'
          size='sm'
          leadingIcon='edit'
          onClick={() => onJumpToStep?.(stepIndex)}
          className='shrink-0'
        >
          แก้ไข
        </BrandSubdueButton>
      </div>

      {/* ข้อมูลที่ยังขาดขึ้นก่อน — เป็นสิ่งที่ผู้ใช้ต้องจัดการ ไม่ใช่ค่าที่กรอกแล้ว */}
      {!complete && (
        <span style={{
          color: 'var(--text-danger-secondary, #DC2626)',
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-xs)',
          lineHeight: 1.5,
        }}>
          {`ยังไม่ได้กรอก: ${missing.join(' · ')}`}
        </span>
      )}

      <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200)' }}>
        {children}
      </div>
    </SubCard>
  );
};

const StepReview = ({ form, onJumpToStep }) => {
  const f = form || {};
  const emergency = Array.isArray(f.emergency) ? f.emergency : [];
  const flags = [
    f.flagVip && 'VIP / ผู้ป่วยพิเศษ',
    f.flagFoodAllergy && 'แพ้อาหาร',
    f.flagDrugAllergy && 'แพ้ยา',
    f.flagChemicalAllergy && 'แพ้สารเคมี',
    f.flagChronic && 'โรคประจำตัว',
    f.flagOther && 'อื่นๆ',
  ].filter(Boolean);

  return (
    <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-500)' }}>
      {/* หัวข้อมีพื้นขาวของตัวเอง — ขั้นนี้ไม่มีการ์ดใหญ่ครอบ ถ้าปล่อยลอยจะจม
          ไปกับพื้นหน้า (มติผู้ใช้ 27 ส.ค. 69) */}
      <div
        className='flex items-center w-full'
        style={{
          padding: 'var(--dim-space-400) var(--dim-space-600)',
          borderRadius: 'var(--dim-radius-400)',
          background: 'var(--surface-card-100)',
          boxShadow: 'var(--shadow-brand-drop-bottom-200)',
        }}
      >
        <SectionTitle icon='fact_check'>กรุณาตรวจสอบข้อมูลก่อนบันทึกและส่งต่อ</SectionTitle>
      </div>

      <StepCard stepIndex={0} form={f} onJumpToStep={onJumpToStep}>
        <Row label='แบบฟอร์มยินยอม' value={dash(f.consentFormStatus || 'ตรวจสอบที่ขั้นตอนแบบฟอร์มยินยอม')} />
      </StepCard>

      <StepCard stepIndex={1} form={f} onJumpToStep={onJumpToStep}>
        <Row label='ชื่อ-นามสกุล (ไทย)' value={fullNameTh(f)} />
        <Row label='ชื่อ-นามสกุล (อังกฤษ)' value={dash([f.prefixEn, f.firstNameEn, f.lastNameEn].filter(Boolean).join(' '))} />
        <Row label='เลขบัตรประชาชน' value={dash(f.nationalId)} />
        <Row label='วันเดือนปีเกิด' value={dash(f.dobUnknown ? `ปีเกิด ${f.birthYearBE || ''}` : f.dob)} />
        <Row label='เพศ' value={dash(f.gender)} />
        <Row label='หมู่เลือด' value={dash(f.bloodType)} />
        <Row label='สถานะการมีชีวิต' value={f.lifeStatus === 'deceased' ? `เสียชีวิต (${dash(f.deceasedDate)})` : 'มีชีวิตอยู่'} />
      </StepCard>

      <StepCard stepIndex={2} form={f} onJumpToStep={onJumpToStep}>
        <Row label='ที่อยู่ตามทะเบียนบ้าน' value={addressLine(f.addressRegistered)} />
        <Row
          label='ที่อยู่ปัจจุบัน'
          value={f.useRegisteredForCurrent ? 'เหมือนที่อยู่ตามทะเบียนบ้าน' : addressLine(f.addressCurrent)}
        />
        <Row
          label='ที่อยู่ติดต่อได้'
          /* ที่อยู่ติดต่อได้ยืมได้สองทาง — บอกว่ายืมจากไหน ไม่ใช่แค่ "เหมือนทะเบียนบ้าน"
             ไม่งั้นแถวนี้จะโกหกเมื่อผู้ใช้เลือก "เหมือนที่อยู่ปัจจุบัน" */
          value={f.useRegisteredForContact
            ? 'เหมือนที่อยู่ตามทะเบียนบ้าน'
            : f.useCurrentForContact
              ? 'เหมือนที่อยู่ปัจจุบัน'
              : addressLine(f.addressContact)}
        />
      </StepCard>

      <StepCard stepIndex={3} form={f} onJumpToStep={onJumpToStep}>
        <Row label='โทรศัพท์มือถือ' value={dash(f.phone)} />
        <Row label='อีเมล' value={dash(f.email)} />
        <Row
          label='ผู้ติดต่อฉุกเฉิน'
          value={emergency.filter((e) => e?.name).length
            ? emergency.filter((e) => e?.name).map((e) => `${e.name}${e.relation ? ` (${e.relation})` : ''}${e.phone ? ` · ${e.phone}` : ''}`).join('\n')
            : '—'}
        />
      </StepCard>

      <StepCard stepIndex={4} form={f} onJumpToStep={onJumpToStep}>
        <Row label='สิทธิการรักษา' value={dash(f.rightsType || f.rights)} />
        <Row label='สถานพยาบาลหลัก' value={dash(f.rightsHospital)} />
      </StepCard>

      <StepCard stepIndex={5} form={f} onJumpToStep={onJumpToStep}>
        <Row label='การเคลื่อนไหว' value={dash(f.mobility === 'other' ? f.mobilityOther : f.mobility)} />
        <Row label='Flag' value={flags.length ? flags.join(' · ') : '—'} />
      </StepCard>
    </div>
  );
};

/* ทุกขั้นตอนในหน้านี้เป็นการ์ดของตัวเอง — ไม่ต้องมีการ์ดใหญ่ครอบ */
StepReview.rendersOwnCards = true;

export default StepReview;
