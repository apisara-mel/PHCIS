import React, { useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import Icon from '@/components/icons/Icon';
import InputField from '@/components/forms/InputField';
import Select from '@/components/forms/Select';
import StepProgress from '@/components/step/StepProgress';
import Footer from '@/components/layout/Footer';
import BrandDashedAddButton from '@/components/button/BrandDashedAddButton';
import NeutralSubdueIconButton from '@/components/button/NeutralSubdueIconButton';
import SuccessScreen from '@/components/layout/SuccessScreen';
import CommunityLayout from './CommunityLayout';
import { CommunityCard } from './communityShared';
import {
  DISTRICT_OPTIONS,
  STATUS_OPTIONS,
  COMMUNITY_OPTIONS,
  subdistrictOptionsFor,
  getCommunityInfo,
} from './communityChcData';

/* เพิ่มศูนย์สุขภาพชุมชน — ported from claude/Community chc-add.html, a
   3-step wizard (ข้อมูลทั่วไป → ชุมชนที่รับผิดชอบ → ตำแหน่งบนแผนที่) with
   per-step next/back, a "ชุมชนที่รับผิดชอบ" row repeater, and a
   cancel/draft/submit sticky footer — same chrome contract as the
   non-clinical step forms elsewhere in PHCIS (e.g. AccessControlCreatePage):
   plain <StepProgress> + <Footer type='with BTN' sticky>, no PatientCard
   (this form has no patient). The prototype's draggable pin map (step 3)
   is intentionally simplified to a static coordinate preview + a link out
   to the full GIS page — same call as CommunityDashboardPage's
   MapTeaserCard, so we don't build a second bespoke map widget. */

const STEPS = [
  { title: 'ข้อมูลทั่วไป', subtitle: 'General Info' },
  { title: 'ชุมชนที่รับผิดชอบ', subtitle: 'Responsible Communities' },
  { title: 'ตำแหน่งบนแผนที่', subtitle: 'Location' },
];

const emptyMember = () => ({ community: '', district: '', subdistrict: '' });

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

const MemberRow = ({ index, member, onChange, onRemove, removable }) => (
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
        {`ชุมชนที่ ${index + 1}`}
      </span>
      {removable && (
        <NeutralSubdueIconButton
          type='button'
          variant='outline'
          size='sm'
          icon='delete'
          onClick={onRemove}
          aria-label={`ลบชุมชนที่ ${index + 1}`}
        />
      )}
    </div>
    <FieldGrid>
      <Select
        label='ชุมชน'
        placeholder='-- เลือก --'
        value={member.community}
        onChange={(v) => onChange({ community: v, district: getCommunityInfo(v)?.district || '', subdistrict: getCommunityInfo(v)?.subdistrict || '' })}
        options={COMMUNITY_OPTIONS}
        searchable={false}
      />
      <Select
        label='เขต'
        placeholder='-- เลือก --'
        value={member.district}
        options={member.district ? [{ value: member.district, label: member.district }] : []}
        disabled
        searchable={false}
      />
      <Select
        label='แขวง'
        placeholder='-- เลือก --'
        value={member.subdistrict}
        options={member.subdistrict ? [{ value: member.subdistrict, label: member.subdistrict }] : []}
        disabled
        searchable={false}
      />
    </FieldGrid>
  </div>
);

const ChcAddPage = () => {
  const history = useHistory();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    code: '', name: '', district: '', subdistrict: '', address: '', coverageArea: '', status: '',
  });
  const [members, setMembers] = useState([emptyMember()]);
  const [coords] = useState({ lat: '13.76490', lng: '100.55220' });
  const [success, setSuccess] = useState(false);

  const setField = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));
  const setDistrict = (value) => setForm((f) => ({ ...f, district: value, subdistrict: '' }));

  const isFirstStep = step === 0;
  const isLastStep = step === STEPS.length - 1;

  const step1Valid = Boolean(
    form.code.trim() && form.name.trim() && form.district && form.subdistrict && form.address.trim() && form.status,
  );

  const goNext = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const goPrev = () => setStep((s) => Math.max(s - 1, 0));
  const leavePage = () => history.push('/community-health/chc');
  /* No backend yet — this mock form has nothing to persist, so "บันทึกร่าง"
     is a no-op placeholder like the rest of the still-mock Community module. */
  const handleSaveDraft = () => {};
  const handleCommit = () => setSuccess(true);

  const updateMember = (i, patch) => setMembers((list) => list.map((m, idx) => (idx === i ? { ...m, ...patch } : m)));
  const removeMember = (i) => setMembers((list) => (list.length <= 1 ? list : list.filter((_, idx) => idx !== i)));
  const addMember = () => setMembers((list) => [...list, emptyMember()]);

  const subdistrictOptions = useMemo(() => subdistrictOptionsFor(form.district), [form.district]);

  const primaryLabel = isLastStep ? 'บันทึกข้อมูล' : `ถัดไป: ${STEPS[step + 1].title}`;
  const primaryDisabled = step === 0 && !step1Valid;

  return (
    <CommunityLayout
      activeKey='community'
      breadcrumb={['ข้อมูลชุมชน', 'ข้อมูลศูนย์สุขภาพชุมชน', 'เพิ่มศูนย์สุขภาพชุมชน']}
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
          <SectionTitle icon='local_hospital'>ข้อมูลทั่วไป</SectionTitle>
          <FieldGrid>
            <InputField
              label='รหัสศูนย์สุขภาพชุมชน'
              required
              placeholder='เช่น ศบส.4'
              value={form.code}
              onChange={setField('code')}
            />
            <InputField
              label='ชื่อศูนย์สุขภาพชุมชน'
              required
              placeholder='เช่น ศูนย์บริการสาธารณสุข 4 ดินแดง'
              value={form.name}
              onChange={setField('name')}
            />
            <Select
              label='เขต'
              required
              placeholder='-- เลือก --'
              value={form.district}
              onChange={setDistrict}
              options={DISTRICT_OPTIONS}
              searchable={false}
            />
            <Select
              label='แขวง'
              required
              placeholder='-- เลือก --'
              value={form.subdistrict}
              onChange={setField('subdistrict')}
              options={subdistrictOptions}
              disabled={!form.district}
              searchable={false}
            />
            <InputField
              label='ที่อยู่'
              required
              placeholder='เลขที่ / ซอย / ถนน'
              value={form.address}
              onChange={setField('address')}
              className='sm:col-span-2'
              style={{ gridColumn: '1 / -1' }}
            />
            <InputField
              label='พื้นที่รับผิดชอบ'
              placeholder='เช่น ครอบคลุม 3 ชุมชนในเขตดินแดง'
              value={form.coverageArea}
              onChange={setField('coverageArea')}
              style={{ gridColumn: '1 / -1' }}
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
      )}

      {step === 1 && (
        <CommunityCard>
          <SectionTitle icon='holiday_village'>ชุมชนที่รับผิดชอบ</SectionTitle>
          <div className='flex flex-col' style={{ gap: 'var(--dim-space-300, 12px)' }}>
            {members.map((m, i) => (
              <MemberRow
                key={i}
                index={i}
                member={m}
                removable={members.length > 1}
                onChange={(patch) => updateMember(i, patch)}
                onRemove={() => removeMember(i)}
              />
            ))}
          </div>
          <BrandDashedAddButton icon='add' onClick={addMember} className='w-full'>
            เพิ่มชุมชน
          </BrandDashedAddButton>
        </CommunityCard>
      )}

      {step === 2 && (
        <CommunityCard>
          <SectionTitle icon='travel_explore'>ตำแหน่งบนแผนที่</SectionTitle>
          <p
            style={{
              margin: 0,
              color: 'var(--text-content-tertiary, #8A9099)',
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-sm, 14px)',
            }}
          >
            กำหนดตำแหน่งศูนย์สุขภาพชุมชนบนแผนที่เต็มรูปแบบ — ระบบจะบันทึกพิกัดล่าสุดที่เลือกไว้ที่นี่
          </p>
          <button
            type='button'
            onClick={() => history.push('/community-health/gis')}
            className='flex flex-col items-center justify-center w-full'
            style={{
              minHeight: 220,
              borderRadius: 'var(--dim-radius-400, 12px)',
              background: 'var(--surface-brandPrimary-quaternary, #F4FBF8)',
              border: 'var(--dim-stroke-100, 1px) dashed var(--border-brandPrimary-quaternary, #E2F3EB)',
              gap: 'var(--dim-space-200, 8px)',
              cursor: 'pointer',
            }}
          >
            <Icon name='location_on' size={32} style={{ color: 'var(--text-brandPrimary-default, #007549)' }} />
            <span style={{ color: 'var(--text-brandPrimary-default, #007549)', fontSize: 'var(--type-size-sm, 14px)', fontWeight: 'var(--type-weight-medium, 500)' }}>
              เลือกตำแหน่งบนแผนที่เต็ม
            </span>
          </button>
          <FieldGrid>
            <InputField label='พิกัดละติจูด' value={coords.lat} disabled showHelperText={false} />
            <InputField label='พิกัดลองจิจูด' value={coords.lng} disabled showHelperText={false} />
          </FieldGrid>
        </CommunityCard>
      )}

      {success && (
        <SuccessScreen
          title={<>เพิ่มศูนย์สุขภาพชุมชนเรียบร้อยแล้ว</>}
          buttonLabel='ตกลง'
          onDone={() => history.push('/community-health/chc')}
        />
      )}
    </CommunityLayout>
  );
};

export default ChcAddPage;
