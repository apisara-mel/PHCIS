import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import Icon from '@/components/icons/Icon';
import InputField from '@/components/forms/InputField';
import Select from '@/components/forms/Select';
import Footer from '@/components/layout/Footer';
import SuccessToast from '@/components/toast/SuccessToast';
import CommunityLayout from './CommunityLayout';
import { CommunityCard } from './communityShared';
import {
  COMMUNITY_OPTIONS,
  DISTRICT_OPTIONS,
  SUBDISTRICT_OPTIONS,
  VOLUNTEER_OPTIONS,
  RELATION_OPTIONS,
  PERSON_STATUS_OPTIONS,
} from './communityHouseholdData';

/* เพิ่มข้อมูลครัวเรือน — ported from claude/Community household-add.html.
   3-step wizard (ข้อมูลทะเบียนบ้าน / สมาชิกครัวเรือน / ตำแหน่งบนแผนที่) per the
   source's `.stepper` + `.wstep[data-step]` markup — footer contract per
   mih-step-form (ยกเลิก|ย้อนกลับ / บันทึกร่าง / ถัดไป: [step]), built on the
   shared <Footer> rather than the prototype's own .btn-form CSS. */

const STEPS = [
  { key: 'reg', title: 'ข้อมูลทะเบียนบ้าน', subtitle: 'House Registration' },
  { key: 'mem', title: 'สมาชิกครัวเรือน', subtitle: 'Household Members' },
  { key: 'map', title: 'ตำแหน่งบนแผนที่', subtitle: 'Location' },
];

const emptyMember = () => ({
  nid: '', name: '', sex: '', dob: '', relation: '', status: '',
});

const SectionTopic = ({ children }) => (
  <div
    className='flex items-center'
    style={{
      gap: 'var(--dim-space-300, 12px)',
      color: 'var(--text-topic-tertiary-title, #363B3F)',
      fontFamily: 'var(--type-family-heading-content, var(--type-family-body))',
      fontSize: 'var(--type-size-base, 16px)',
      fontWeight: 'var(--type-weight-title, var(--type-weight-medium, 500))',
    }}
  >
    {children}
  </div>
);

const FieldGrid = ({ columns = 2, children }) => (
  <div
    className='grid'
    style={{
      gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
      gap: 'var(--dim-space-600, 24px)',
    }}
  >
    {children}
  </div>
);

/** Stepper band — mirrors the source's numbered-node + connector rail
    (`.stepper`/`.wnode`/`.wline`), rebuilt with design.md tokens instead of
    the prototype's own CSS. Simple + self-contained (no scroll-morph
    dependency) since this module doesn't otherwise use the clinical
    PatientCard-driven wizard shell. */
const StepRail = ({ current, onStepClick }) => (
  <CommunityCard style={{ padding: 'var(--dim-space-400, 16px) var(--dim-space-600, 24px)' }}>
    <div className='flex items-center w-full'>
      {STEPS.map((step, i) => {
        const isActive = i === current;
        const isDone = i < current;
        return (
          <React.Fragment key={step.key}>
            <button
              type='button'
              onClick={() => onStepClick(i)}
              className='flex items-center text-left'
              style={{
                gap: 'var(--dim-space-300, 12px)',
                background: 'none',
                border: 0,
                padding: 0,
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              <span
                className='inline-flex items-center justify-center shrink-0'
                style={{
                  width: 'var(--dim-size-700, 32px)',
                  height: 'var(--dim-size-700, 32px)',
                  borderRadius: 'var(--dim-radius-full, 9999px)',
                  background: isActive || isDone
                    ? 'var(--surface-brandPrimary-default, var(--brand-p700, #007549))'
                    : 'var(--surface-neutral-tertiary, #F4F5F5)',
                  color: isActive || isDone
                    ? 'var(--text-brandPrimary-on-brand, #FFFFFF)'
                    : 'var(--text-content-tertiary, #858C92)',
                  fontFamily: 'var(--type-family-body)',
                  fontSize: 'var(--type-size-sm, 14px)',
                  fontWeight: 'var(--type-weight-medium, 500)',
                }}
              >
                {isDone ? <Icon name='check' size={16} /> : i + 1}
              </span>
              <span className='hidden md:flex flex-col'>
                <span
                  style={{
                    color: isActive ? 'var(--text-brandPrimary-default, #007549)' : 'var(--text-content-default, #363B3F)',
                    fontFamily: 'var(--type-family-body)',
                    fontSize: 'var(--type-size-sm, 14px)',
                    fontWeight: 'var(--type-weight-medium, 500)',
                  }}
                >
                  {step.title}
                </span>
                <span
                  style={{
                    color: 'var(--text-content-tertiary, #858C92)',
                    fontFamily: 'var(--type-family-body)',
                    fontSize: 'var(--type-size-xs, 12px)',
                  }}
                >
                  {step.subtitle}
                </span>
              </span>
            </button>
            {i < STEPS.length - 1 && (
              <span
                aria-hidden
                className='flex-1'
                style={{
                  height: 'var(--dim-stroke-100, 1px)',
                  margin: '0 var(--dim-space-400, 16px)',
                  background: isDone
                    ? 'var(--surface-brandPrimary-default, var(--brand-p700, #007549))'
                    : 'var(--border-neutral-quaternary, #F4F5F5)',
                }}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  </CommunityCard>
);

const MemberRow = ({ index, member, onChange, onRemove, canRemove }) => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--dim-space-400, 16px)',
      padding: 'var(--dim-space-400, 16px)',
      borderRadius: 'var(--dim-radius-400, 12px)',
      border: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary, #F4F5F5)',
    }}
  >
    <div className='flex items-center justify-between'>
      <span
        style={{
          color: 'var(--text-content-default, #363B3F)',
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-sm, 14px)',
          fontWeight: 'var(--type-weight-medium, 500)',
        }}
      >
        สมาชิกคนที่ {index + 1}
      </span>
      {canRemove && (
        <button
          type='button'
          onClick={onRemove}
          className='inline-flex items-center'
          style={{
            gap: 'var(--dim-space-100, 4px)',
            background: 'none',
            border: 0,
            padding: 0,
            cursor: 'pointer',
            color: 'var(--text-danger-default, #B91C1C)',
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-sm, 14px)',
          }}
        >
          <Icon name='delete' size={16} />
          ลบสมาชิก
        </button>
      )}
    </div>
    <FieldGrid columns={3}>
      <InputField
        label='เลขบัตรประชาชน'
        placeholder='เลขบัตรประชาชน 13 หลัก'
        value={member.nid}
        onChange={(v) => onChange({ ...member, nid: v })}
      />
      <InputField
        label='ชื่อ - นามสกุล'
        placeholder='ชื่อ - นามสกุล'
        value={member.name}
        onChange={(v) => onChange({ ...member, name: v })}
      />
      <Select
        label='เพศ'
        placeholder='-- เลือก --'
        value={member.sex}
        onChange={(v) => onChange({ ...member, sex: v })}
        options={['ชาย', 'หญิง']}
      />
      <InputField
        label='วันเกิด'
        type='date'
        value={member.dob}
        onChange={(v) => onChange({ ...member, dob: v })}
      />
      <Select
        label='ความสัมพันธ์กับเจ้าบ้าน'
        placeholder='-- เลือก --'
        value={member.relation}
        onChange={(v) => onChange({ ...member, relation: v })}
        options={RELATION_OPTIONS}
      />
      <Select
        label='สถานะ'
        placeholder='-- เลือก --'
        value={member.status}
        onChange={(v) => onChange({ ...member, status: v })}
        options={['อาศัยอยู่จริง', 'ย้ายออก', 'เสียชีวิต']}
      />
    </FieldGrid>
  </div>
);

const HouseholdAddPage = () => {
  const history = useHistory();
  const [step, setStep] = useState(0);
  const [draftToast, setDraftToast] = useState(false);

  const [reg, setReg] = useState({
    hno: '', community: '', addr: '', district: '', subdistrict: '',
    geo: '13.7651, 100.5525', volunteer: '', surveyDate: '', surveyor: 'นาง วันดี ทองใจ',
  });
  const [members, setMembers] = useState([emptyMember()]);
  const [loc, setLoc] = useState({ lat: '13.76490', lng: '100.55220' });

  const isFirstStep = step === 0;
  const isLastStep = step === STEPS.length - 1;

  const goPrev = () => setStep((s) => Math.max(0, s - 1));
  const goNext = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const leavePage = () => history.push('/community-health/household');
  const handleSaveDraft = () => setDraftToast(true);
  const handleCommit = () => history.push('/community-health/household');

  const updateMember = (idx, next) => setMembers((list) => list.map((m, i) => (i === idx ? next : m)));
  const addMember = () => setMembers((list) => [...list, emptyMember()]);
  const removeMember = (idx) => setMembers((list) => list.filter((_, i) => i !== idx));

  const primaryLabel = isLastStep ? 'บันทึกข้อมูลครัวเรือน' : `ถัดไป: ${STEPS[step + 1].title}`;

  return (
    <CommunityLayout
      activeKey='community'
      breadcrumb={['ข้อมูลชุมชน', 'ทะเบียนบ้านและสมาชิก', 'เพิ่มข้อมูลครัวเรือน']}
    >
      <StepRail current={step} onStepClick={setStep} />

      {step === 0 && (
        <CommunityCard>
          <SectionTopic>
            <Icon name='home' size={24} style={{ color: 'var(--text-brandPrimary-default, #007549)' }} />
            ข้อมูลทะเบียนบ้าน
          </SectionTopic>
          <FieldGrid>
            <InputField label='บ้านเลขที่' required placeholder='เช่น 123/45' value={reg.hno} onChange={(v) => setReg({ ...reg, hno: v })} />
            <Select label='ชุมชน' required placeholder='-- เลือก --' value={reg.community} onChange={(v) => setReg({ ...reg, community: v })} options={COMMUNITY_OPTIONS} />
            <InputField label='ที่อยู่' required placeholder='บ้านเลขที่ / ซอย / ถนน' value={reg.addr} onChange={(v) => setReg({ ...reg, addr: v })} className='col-span-2' style={{ gridColumn: '1 / -1' }} />
            <Select label='เขต / อำเภอ' required placeholder='-- เลือก --' value={reg.district} onChange={(v) => setReg({ ...reg, district: v })} options={DISTRICT_OPTIONS} />
            <Select label='แขวง / ตำบล' required placeholder='-- เลือก --' value={reg.subdistrict} onChange={(v) => setReg({ ...reg, subdistrict: v })} options={SUBDISTRICT_OPTIONS} />
            <InputField label='พิกัด (GPS)' value={reg.geo} disabled onChange={() => {}} />
            <Select label='อสส. ผู้รับผิดชอบ' required placeholder='-- เลือก --' value={reg.volunteer} onChange={(v) => setReg({ ...reg, volunteer: v })} options={VOLUNTEER_OPTIONS} />
          </FieldGrid>
          <SectionTopic>
            <Icon name='fact_check' size={24} style={{ color: 'var(--text-brandPrimary-default, #007549)' }} />
            ข้อมูลการสำรวจล่าสุด
          </SectionTopic>
          <FieldGrid>
            <InputField label='วันที่สำรวจล่าสุด' type='date' value={reg.surveyDate} onChange={(v) => setReg({ ...reg, surveyDate: v })} />
            <InputField label='ผู้สำรวจ' value={reg.surveyor} disabled onChange={() => {}} />
          </FieldGrid>
        </CommunityCard>
      )}

      {step === 1 && (
        <CommunityCard>
          <SectionTopic>
            <Icon name='groups' size={24} style={{ color: 'var(--text-brandPrimary-default, #007549)' }} />
            สมาชิกครัวเรือน
          </SectionTopic>
          {members.map((member, idx) => (
            <MemberRow
              key={idx}
              index={idx}
              member={member}
              onChange={(next) => updateMember(idx, next)}
              onRemove={() => removeMember(idx)}
              canRemove={members.length > 1}
            />
          ))}
          <button
            type='button'
            onClick={addMember}
            className='inline-flex items-center self-start'
            style={{
              gap: 'var(--dim-space-150, 6px)',
              background: 'var(--surface-brandPrimary-quaternary, #F4FBF8)',
              border: 'var(--dim-stroke-100, 1px) dashed var(--border-brandPrimary-quaternary, #E2F3EB)',
              borderRadius: 'var(--dim-radius-200, 8px)',
              padding: 'var(--dim-space-200, 8px) var(--dim-space-400, 16px)',
              cursor: 'pointer',
              color: 'var(--text-brandPrimary-default, #007549)',
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-sm, 14px)',
              fontWeight: 'var(--type-weight-medium, 500)',
            }}
          >
            <Icon name='add' size={16} />
            เพิ่มสมาชิก
          </button>
        </CommunityCard>
      )}

      {step === 2 && (
        <CommunityCard>
          <SectionTopic>
            <Icon name='location_on' size={24} style={{ color: 'var(--text-brandPrimary-default, #007549)' }} />
            ตำแหน่งบนแผนที่
          </SectionTopic>
          <p style={{ margin: 0, color: 'var(--text-content-secondary, #636B72)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm, 14px)' }}>
            ลากหมุดหรือคลิกบนแผนที่เพื่อกำหนดตำแหน่งครัวเรือน (ดูแผนที่แบบเต็มได้ที่หน้าแผนที่ภูมิศาสตร์)
          </p>
          <div
            className='flex flex-col items-center justify-center w-full'
            style={{
              minHeight: 260,
              borderRadius: 'var(--dim-radius-400, 12px)',
              background: 'var(--surface-brandPrimary-quaternary, #F4FBF8)',
              border: 'var(--dim-stroke-100, 1px) dashed var(--border-brandPrimary-quaternary, #E2F3EB)',
              gap: 'var(--dim-space-200, 8px)',
            }}
          >
            <Icon name='pin_drop' size={32} style={{ color: 'var(--text-brandPrimary-default, #007549)' }} />
            <span style={{ color: 'var(--text-content-tertiary, #858C92)', fontSize: 'var(--type-size-sm, 14px)' }}>
              ตำแหน่งที่เลือก: {loc.lat}, {loc.lng}
            </span>
          </div>
          <FieldGrid>
            <InputField label='พิกัดละติจูด' value={loc.lat} onChange={(v) => setLoc({ ...loc, lat: v })} />
            <InputField label='พิกัดลองจิจูด' value={loc.lng} onChange={(v) => setLoc({ ...loc, lng: v })} />
          </FieldGrid>
        </CommunityCard>
      )}

      <Footer
        type='with BTN'
        sticky
        showAutoSave={!isFirstStep}
        autoSaveText='ร่างแบบฟอร์ม (ยังไม่ได้บันทึกแบบร่าง)'
        showButton3
        button3Label={isFirstStep ? 'ยกเลิก' : 'ย้อนกลับ'}
        onButton3Click={isFirstStep ? leavePage : goPrev}
        showButton2
        button2Label='บันทึกร่าง'
        button2Icon='save'
        onButton2Click={handleSaveDraft}
        showButton1
        button1Label={primaryLabel}
        button1TrailingIcon={isLastStep ? 'check' : 'arrow_forward'}
        onButton1Click={isLastStep ? handleCommit : goNext}
        showLegal={false}
      />

      <SuccessToast open={draftToast} message='บันทึกร่างแบบฟอร์มเรียบร้อยแล้ว' onClose={() => setDraftToast(false)} />
    </CommunityLayout>
  );
};

export default HouseholdAddPage;
