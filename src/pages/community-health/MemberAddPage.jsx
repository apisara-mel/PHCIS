import React, { useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import Icon from '@/components/icons/Icon';
import InputField from '@/components/forms/InputField';
import Select from '@/components/forms/Select';
import Checkbox from '@/components/checkbox/Checkbox';
import Footer from '@/components/layout/Footer';
import CommunityLayout from './CommunityLayout';
import { CommunityCard } from './communityShared';
import {
  RELATION_OPTIONS,
  PERSON_STATUS_OPTIONS,
  DISABILITY_OPTIONS,
  DISABILITY_TYPE_OPTIONS,
  COVERAGE_OPTIONS,
  CHRONIC_OPTIONS,
  VULNERABLE_OPTIONS,
  OCCUPATION_OPTIONS,
  EDUCATION_OPTIONS,
  getHouseholdById,
} from './communityHouseholdData';

/* เพิ่มสมาชิกในครัวเรือน — ported from claude/Community member-add.html.
   Flat form (no wizard in the source — `.formcard` sections stacked in one
   scroll) covering ข้อมูลส่วนบุคคล / ความสัมพันธ์และสถานะ /
   ข้อมูลสุขภาพและสิทธิการรักษา / ข้อมูลเพิ่มเติม, ending in a plain
   ยกเลิก + บันทึก sticky footer (source's `.footer--nodraft` — no
   auto-save / draft slot since there's only one step to lose). */

const PREFIX_OPTIONS = ['นาย', 'นาง', 'นางสาว', 'เด็กชาย', 'เด็กหญิง'];
const NATIONALITY_OPTIONS = ['ไทย', 'อื่นๆ'];
const MARITAL_OPTIONS = ['โสด', 'สมรส', 'หม้าย', 'หย่า', 'แยกกันอยู่'];

const initialForm = {
  prefix: '', fname: '', lname: '', nid: '', sex: '', dob: '',
  age: '', nationality: '', marital: '',
  relation: '', personStatus: '', disability: '', disabilityType: '',
  coverage: '', phone: '', chronic: [], vulnerable: [],
  occupation: '', education: '', note: '',
};

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

const CheckGroup = ({ label, options, values, onToggle }) => (
  <div className='flex flex-col' style={{ gap: 'var(--dim-space-200, 8px)' }}>
    <span
      style={{
        color: 'var(--text-content-secondary, #636B72)',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-sm, 14px)',
      }}
    >
      {label}
    </span>
    <div className='grid' style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--dim-space-200, 8px)' }}>
      {options.map((opt) => (
        <Checkbox
          key={opt}
          label={opt}
          checked={values.includes(opt)}
          onChange={() => onToggle(opt)}
        />
      ))}
    </div>
  </div>
);

const MemberAddPage = () => {
  const { id } = useParams();
  const history = useHistory();
  const house = getHouseholdById(id);
  const [form, setForm] = useState(initialForm);

  const set = (patch) => setForm((prev) => ({ ...prev, ...patch }));
  const toggleList = (key, value) => setForm((prev) => ({
    ...prev,
    [key]: prev[key].includes(value) ? prev[key].filter((v) => v !== value) : [...prev[key], value],
  }));

  const backTarget = house ? `/community-health/household/${house.id}` : '/community-health/household';
  const breadcrumb = house
    ? ['ข้อมูลชุมชน', 'ทะเบียนบ้านและสมาชิก', `บ้านเลขที่ ${house.houseNo}`, 'เพิ่มสมาชิก']
    : ['ข้อมูลชุมชน', 'ทะเบียนบ้านและสมาชิก', 'เพิ่มสมาชิก'];

  const handleCancel = () => history.push(backTarget);
  const handleSave = () => history.push(backTarget);

  return (
    <CommunityLayout activeKey='community' breadcrumb={breadcrumb}>
      <CommunityCard>
        <SectionTopic>
          <Icon name='person' size={24} style={{ color: 'var(--text-brandPrimary-default, #007549)' }} />
          ข้อมูลส่วนบุคคล
        </SectionTopic>
        {house && (
          <p style={{ margin: 0, color: 'var(--text-content-secondary, #636B72)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm, 14px)' }}>
            เพิ่มสมาชิกเข้าครัวเรือน <b>บ้านเลขที่ {house.houseNo}</b> — {house.community}
          </p>
        )}
        <FieldGrid columns={3}>
          <Select label='คำนำหน้า' required placeholder='-- เลือก --' value={form.prefix} onChange={(v) => set({ prefix: v })} options={PREFIX_OPTIONS} />
          <InputField label='ชื่อ' required placeholder='ชื่อ' value={form.fname} onChange={(v) => set({ fname: v })} />
          <InputField label='นามสกุล' required placeholder='นามสกุล' value={form.lname} onChange={(v) => set({ lname: v })} />
          <InputField label='เลขประจำตัวประชาชน' required placeholder='เลข 13 หลัก' value={form.nid} onChange={(v) => set({ nid: v })} />
          <Select label='เพศ' required placeholder='-- เลือก --' value={form.sex} onChange={(v) => set({ sex: v })} options={['ชาย', 'หญิง']} />
          <InputField label='วันเดือนปีเกิด' required type='date' value={form.dob} onChange={(v) => set({ dob: v })} />
          <InputField label='อายุ' placeholder='คำนวณจากวันเกิด' value={form.age} disabled onChange={() => {}} />
          <Select label='สัญชาติ' placeholder='-- เลือก --' value={form.nationality} onChange={(v) => set({ nationality: v })} options={NATIONALITY_OPTIONS} />
          <Select label='สถานภาพสมรส' placeholder='-- เลือก --' value={form.marital} onChange={(v) => set({ marital: v })} options={MARITAL_OPTIONS} />
        </FieldGrid>
      </CommunityCard>

      <CommunityCard>
        <SectionTopic>
          <Icon name='diversity_3' size={24} style={{ color: 'var(--text-brandPrimary-default, #007549)' }} />
          ความสัมพันธ์และสถานะ
        </SectionTopic>
        <FieldGrid>
          <Select label='ความสัมพันธ์กับเจ้าบ้าน' required placeholder='-- เลือก --' value={form.relation} onChange={(v) => set({ relation: v })} options={RELATION_OPTIONS} />
          <Select label='สถานะบุคคล' required placeholder='-- เลือก --' value={form.personStatus} onChange={(v) => set({ personStatus: v })} options={PERSON_STATUS_OPTIONS} />
        </FieldGrid>
        <FieldGrid>
          <Select label='ความพิการ' placeholder='-- เลือก --' value={form.disability} onChange={(v) => set({ disability: v, disabilityType: v === 'มีความพิการ' ? form.disabilityType : '' })} options={DISABILITY_OPTIONS} />
          {form.disability === 'มีความพิการ' && (
            <Select label='ประเภทความพิการ' placeholder='-- เลือก --' value={form.disabilityType} onChange={(v) => set({ disabilityType: v })} options={DISABILITY_TYPE_OPTIONS} />
          )}
        </FieldGrid>
      </CommunityCard>

      <CommunityCard>
        <SectionTopic>
          <Icon name='medical_information' size={24} style={{ color: 'var(--text-brandPrimary-default, #007549)' }} />
          ข้อมูลสุขภาพและสิทธิการรักษา
        </SectionTopic>
        <FieldGrid>
          <Select label='สิทธิการรักษาพยาบาล' placeholder='-- เลือก --' value={form.coverage} onChange={(v) => set({ coverage: v })} options={COVERAGE_OPTIONS} />
          <InputField label='เบอร์โทรศัพท์' placeholder='เช่น 08x-xxx-xxxx' value={form.phone} onChange={(v) => set({ phone: v })} />
        </FieldGrid>
        <CheckGroup label='โรคประจำตัว (เลือกได้มากกว่า 1 ข้อ)' options={CHRONIC_OPTIONS} values={form.chronic} onToggle={(v) => toggleList('chronic', v)} />
        <CheckGroup label='กลุ่มเปราะบาง (ถ้ามี)' options={VULNERABLE_OPTIONS} values={form.vulnerable} onToggle={(v) => toggleList('vulnerable', v)} />
      </CommunityCard>

      <CommunityCard>
        <SectionTopic>
          <Icon name='notes' size={24} style={{ color: 'var(--text-brandPrimary-default, #007549)' }} />
          ข้อมูลเพิ่มเติม
        </SectionTopic>
        <FieldGrid>
          <Select label='อาชีพ' placeholder='-- เลือก --' value={form.occupation} onChange={(v) => set({ occupation: v })} options={OCCUPATION_OPTIONS} />
          <Select label='ระดับการศึกษา' placeholder='-- เลือก --' value={form.education} onChange={(v) => set({ education: v })} options={EDUCATION_OPTIONS} />
        </FieldGrid>
        <InputField
          label='หมายเหตุ'
          placeholder='ระบุข้อมูลเพิ่มเติมเกี่ยวกับสมาชิกรายนี้'
          value={form.note}
          onChange={(v) => set({ note: v })}
        />
      </CommunityCard>

      <Footer
        type='with BTN'
        sticky
        showAutoSave={false}
        showButton3
        button3Label='ยกเลิก'
        onButton3Click={handleCancel}
        showButton2={false}
        showButton1
        button1Label='บันทึก'
        button1TrailingIcon='check'
        onButton1Click={handleSave}
        showLegal={false}
      />
    </CommunityLayout>
  );
};

export default MemberAddPage;
