import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import Icon from '@/components/icons/Icon';
import InputField from '@/components/forms/InputField';
import Select from '@/components/forms/Select';
import DatePicker from '@/components/forms/DatePicker';
import PhotoUploadField from '@/components/forms/PhotoUploadField';
import FileUploadField from '@/components/forms/FileUploadField';
import StepProgress from '@/components/step/StepProgress';
import Footer from '@/components/layout/Footer';
import BrandDashedAddButton from '@/components/button/BrandDashedAddButton';
import NeutralSubdueIconButton from '@/components/button/NeutralSubdueIconButton';
import SuccessScreen from '@/components/layout/SuccessScreen';
import CommunityLayout from './CommunityLayout';
import { CommunityCard } from './communityShared';
import {
  VOLUNTEER_CENTERS,
  VOLUNTEER_TYPES,
  VOLUNTEER_COMMUNITIES,
  nextVolunteerCode,
} from './communityVolunteerData';

/* เพิ่มอาสาสมัครชุมชน — ported from claude/Community volunteer-add.html, a
   3-step wizard (ข้อมูลส่วนตัว → ข้อมูลการปฏิบัติงาน + บ้านที่รับผิดชอบ →
   รูปถ่ายและเอกสาร) with per-step next/back and a cancel/draft/submit
   sticky footer — same chrome contract as the module's other step forms
   (ChcAddPage.jsx / HouseholdAddPage.jsx): plain <StepProgress> +
   <Footer type='with BTN' sticky> in CommunityLayout's `footer` slot, no
   PatientCard (this form has no patient). */

const STEPS = [
  { title: 'ข้อมูลส่วนตัว', subtitle: 'Personal Info' },
  { title: 'ข้อมูลการปฏิบัติงาน', subtitle: 'Assignment' },
  { title: 'รูปถ่ายและเอกสาร', subtitle: 'Photo & Documents' },
];

const SEX_OPTIONS = ['ชาย', 'หญิง'];
const STATUS_OPTIONS = [
  { value: 'active', label: 'ปฏิบัติงาน' },
  { value: 'inactive', label: 'พ้นสภาพ' },
];

const emptyHouse = () => ({ no: '', community: '' });

const SectionTitle = ({ icon, children }) => (
  <div className='flex items-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
    <Icon name={icon} size={18} style={{ color: 'var(--text-brandPrimary-default, #007549)' }} />
    <span
      style={{
        fontFamily: 'var(--type-family-heading-content, var(--type-family-body))',
        fontSize: 'var(--type-size-sm, 14px)',
        fontWeight: 'var(--type-weight-title, var(--type-weight-medium, 500))',
        color: 'var(--text-topic-tertiary-title, #363B3F)',
      }}
    >
      {children}
    </span>
  </div>
);

const FieldGrid = ({ children }) => (
  <div
    className='grid'
    style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--dim-space-400, 16px)' }}
  >
    {children}
  </div>
);

const HouseRow = ({ index, house, onChange, onRemove, removable }) => (
  <div
    className='flex flex-col'
    style={{
      gap: 'var(--dim-space-300, 12px)',
      padding: 'var(--dim-space-400, 16px)',
      borderRadius: 'var(--dim-radius-300, 10px)',
      border: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary, #F4F5F5)',
      background: 'var(--surface-card-100, #FFFFFF)',
    }}
  >
    <div className='flex items-center justify-between'>
      <span
        style={{
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-sm, 14px)',
          fontWeight: 'var(--type-weight-medium, 500)',
          color: 'var(--text-content-default, #363B3F)',
        }}
      >
        {`บ้านที่ ${index + 1}`}
      </span>
      {removable && (
        <NeutralSubdueIconButton
          type='button'
          variant='outline'
          size='sm'
          icon='delete'
          onClick={onRemove}
          aria-label={`ลบบ้านที่ ${index + 1}`}
        />
      )}
    </div>
    <FieldGrid>
      <InputField
        label='บ้านเลขที่'
        placeholder='เช่น 123/45'
        value={house.no}
        onChange={(v) => onChange({ no: v })}
      />
      <Select
        label='ชุมชน'
        placeholder='-- เลือก --'
        value={house.community}
        onChange={(v) => onChange({ community: v })}
        options={VOLUNTEER_COMMUNITIES}
        searchable={false}
      />
    </FieldGrid>
  </div>
);

const VolunteerAddPage = () => {
  const history = useHistory();
  const [step, setStep] = useState(0);
  const [code] = useState(() => nextVolunteerCode());
  const [form, setForm] = useState({
    name: '', sex: '', birth: null, cid: '', phone: '', email: '', addr: '',
    center: '', vtype: '', community: '', coverage: '', houses: '', startDate: null, status: '',
  });
  const [houseList, setHouseList] = useState([emptyHouse()]);
  const [photoFile, setPhotoFile] = useState(null);
  const [docFile, setDocFile] = useState(null);
  const [success, setSuccess] = useState(false);

  const setField = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  const isFirstStep = step === 0;
  const isLastStep = step === STEPS.length - 1;

  const step1Valid = Boolean(
    form.name.trim() && form.sex && form.cid.trim() && form.phone.trim() && form.addr.trim(),
  );
  const step2Valid = Boolean(form.center && form.vtype && form.community && form.status);

  const goNext = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const goPrev = () => setStep((s) => Math.max(s - 1, 0));
  const leavePage = () => history.push('/community-health/volunteer');
  /* No backend yet — this mock form has nothing to persist, so "บันทึกร่าง"
     is a no-op placeholder like the rest of the still-mock Community module. */
  const handleSaveDraft = () => {};
  const handleCommit = () => setSuccess(true);

  const updateHouse = (i, patch) => setHouseList((list) => list.map((h, idx) => (idx === i ? { ...h, ...patch } : h)));
  const removeHouse = (i) => setHouseList((list) => (list.length <= 1 ? list : list.filter((_, idx) => idx !== i)));
  const addHouse = () => setHouseList((list) => [...list, emptyHouse()]);

  const primaryLabel = isLastStep ? 'บันทึกข้อมูล' : `ถัดไป: ${STEPS[step + 1].title}`;
  const primaryDisabled = (step === 0 && !step1Valid) || (step === 1 && !step2Valid);

  return (
    <CommunityLayout
      activeKey='community'
      breadcrumb={['ข้อมูลชุมชน', 'อาสาสมัครชุมชน', 'เพิ่มอาสาสมัคร']}
      footer={(
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
          button1Disabled={primaryDisabled}
          onButton1Click={isLastStep ? handleCommit : goNext}
        />
      )}
    >
      <CommunityCard>
        <StepProgress
          steps={STEPS}
          current={step}
          onStepClick={(i) => { if (i < step) setStep(i); }}
        />
      </CommunityCard>

      {step === 0 && (
        <CommunityCard>
          <SectionTitle icon='badge'>ข้อมูลส่วนตัว</SectionTitle>
          <FieldGrid>
            <InputField
              label='รหัส อสส.'
              value={code}
              disabled
              helperText='ระบบสร้างรหัส อสส. ให้อัตโนมัติเมื่อบันทึกข้อมูล'
            />
            <InputField
              label='ชื่อ - นามสกุล'
              required
              placeholder='เช่น นางสมหญิง ใจดี'
              value={form.name}
              onChange={setField('name')}
            />
            <Select
              label='เพศ'
              required
              placeholder='-- เลือก --'
              value={form.sex}
              onChange={setField('sex')}
              options={SEX_OPTIONS}
              searchable={false}
            />
            <DatePicker
              label='วันเกิด'
              value={form.birth}
              onChange={setField('birth')}
            />
            <InputField
              label='เลขบัตรประชาชน'
              required
              placeholder='เลขบัตรประชาชน 13 หลัก'
              value={form.cid}
              onChange={setField('cid')}
            />
            <InputField
              label='เบอร์โทรติดต่อ'
              required
              type='tel'
              placeholder='08X - XXX - XXXX'
              value={form.phone}
              onChange={setField('phone')}
            />
            <InputField
              label='อีเมล'
              type='email'
              placeholder='อีเมล'
              value={form.email}
              onChange={setField('email')}
            />
            <InputField
              label='ที่อยู่'
              required
              placeholder='บ้านเลขที่ / ซอย / ถนน / แขวง / เขต'
              value={form.addr}
              onChange={setField('addr')}
              style={{ gridColumn: '1 / -1' }}
            />
          </FieldGrid>
        </CommunityCard>
      )}

      {step === 1 && (
        <>
          <CommunityCard>
            <SectionTitle icon='volunteer_activism'>ข้อมูลการปฏิบัติงาน</SectionTitle>
            <FieldGrid>
              <Select
                label='ศูนย์สุขภาพชุมชน'
                required
                placeholder='-- เลือก --'
                value={form.center}
                onChange={setField('center')}
                options={VOLUNTEER_CENTERS}
                searchable={false}
              />
              <Select
                label='ประเภทอาสาสมัคร'
                required
                placeholder='-- เลือก --'
                value={form.vtype}
                onChange={setField('vtype')}
                options={VOLUNTEER_TYPES}
                searchable={false}
              />
              <Select
                label='ชุมชนที่รับผิดชอบ'
                required
                placeholder='-- เลือก --'
                value={form.community}
                onChange={setField('community')}
                options={VOLUNTEER_COMMUNITIES}
                searchable={false}
              />
              <InputField
                label='พื้นที่รับผิดชอบ'
                placeholder='เช่น เขตดินแดง แขวงดินแดง'
                value={form.coverage}
                onChange={setField('coverage')}
              />
              <InputField
                label='จำนวนบ้านที่รับผิดชอบ'
                type='number'
                placeholder='เช่น 45'
                value={form.houses}
                onChange={setField('houses')}
              />
              <DatePicker
                label='วันที่เริ่มปฏิบัติงาน'
                value={form.startDate}
                onChange={setField('startDate')}
              />
              <Select
                label='สถานะ'
                required
                placeholder='-- เลือก --'
                value={form.status}
                onChange={setField('status')}
                options={STATUS_OPTIONS}
                searchable={false}
              />
            </FieldGrid>
          </CommunityCard>

          <CommunityCard>
            <SectionTitle icon='home'>บ้านที่รับผิดชอบ</SectionTitle>
            <p
              style={{
                margin: 0,
                color: 'var(--text-content-tertiary, #8A9099)',
                fontFamily: 'var(--type-family-body)',
                fontSize: 'var(--type-size-sm, 14px)',
              }}
            >
              ระบุบ้านที่อาสาสมัครคนนี้ดูแล (เพิ่มภายหลังได้จากหน้ารายละเอียด)
            </p>
            <div className='flex flex-col' style={{ gap: 'var(--dim-space-300, 12px)' }}>
              {houseList.map((h, i) => (
                <HouseRow
                  key={i}
                  index={i}
                  house={h}
                  removable={houseList.length > 1}
                  onChange={(patch) => updateHouse(i, patch)}
                  onRemove={() => removeHouse(i)}
                />
              ))}
            </div>
            <BrandDashedAddButton icon='add' onClick={addHouse} className='w-full'>
              เพิ่มบ้านที่ดูแล
            </BrandDashedAddButton>
          </CommunityCard>
        </>
      )}

      {step === 2 && (
        <CommunityCard>
          <SectionTitle icon='photo_camera'>รูปถ่ายและเอกสารประกอบ</SectionTitle>
          <p
            style={{
              margin: 0,
              color: 'var(--text-content-tertiary, #8A9099)',
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-sm, 14px)',
            }}
          >
            อัปโหลดรูปถ่ายและเอกสารประกอบการขึ้นทะเบียนอาสาสมัคร
          </p>
          <FieldGrid>
            <div className='flex flex-col' style={{ gap: 'var(--dim-space-200, 8px)' }}>
              <span
                style={{
                  fontFamily: 'var(--type-family-body)',
                  fontSize: 'var(--type-size-sm, 14px)',
                  fontWeight: 'var(--type-weight-medium, 500)',
                  color: 'var(--text-content-default, #363B3F)',
                }}
              >
                รูปถ่าย อสส.
              </span>
              <PhotoUploadField
                label='ลากและวางรูปถ่าย หรือคลิกเพื่ออัปโหลด'
                fullWidth
                onFiles={(files) => setPhotoFile(files?.[0]?.name || null)}
              />
              {photoFile && (
                <span style={{ fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary, #8A9099)' }}>
                  {photoFile}
                </span>
              )}
            </div>
            <FileUploadField
              label='เอกสารประกอบ'
              helperText='รองรับไฟล์ PDF, PNG, JPG ขนาดไม่เกิน 10 MB ต่อไฟล์'
              buttonLabel='เลือกไฟล์'
              fileName={docFile}
              onFile={(file) => setDocFile(file.name)}
              onClear={() => setDocFile(null)}
            />
          </FieldGrid>
        </CommunityCard>
      )}

      {success && (
        <SuccessScreen
          title={<>เพิ่มอาสาสมัครชุมชนเรียบร้อยแล้ว</>}
          buttonLabel='ตกลง'
          onDone={() => history.push('/community-health/volunteer')}
        />
      )}
    </CommunityLayout>
  );
};

export default VolunteerAddPage;
