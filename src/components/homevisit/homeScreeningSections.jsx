import React from 'react';
import SelectableCardButton from '@/components/button/SelectableCardButton';
import CheckboxButton from '@/components/checkbox/CheckboxButton';
import InputField from '@/components/forms/InputField';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import { Field } from '@/components/forms/Fields';
import {
  NATIONALITY_OPTIONS,
  ETHNICITY_OPTIONS,
  RELIGION_OPTIONS,
  PERSON_STATUS_OPTIONS,
  COMMUNITY_ROLE_OPTIONS,
  RIGHTS_USAGE_OPTIONS,
  MINOR_ILLNESS_OPTIONS,
  HEALTH_RISK_OPTIONS,
  PRESENCE_OPTIONS,
  ALLERGY_STATUS_OPTIONS,
  FAMILY_HISTORY_SUGGESTIONS,
  DTX_FASTING_OPTIONS,
} from '@/data/homeScreeningForm';

/* ช่องของ "แบบคัดกรองสุขภาพรายบุคคล" (ฟอร์มกระดาษของทีมเยี่ยมบ้าน) แตกเป็น
   ส่วน ๆ เพื่อไปวางในขั้นที่มันควรอยู่ของบันทึกการเยี่ยมบ้าน ไม่ใช่ยกทั้งฟอร์ม
   ไปกองไว้ขั้นเดียว (มติผู้ใช้ 30 ส.ค. 69):

     ขั้น 2 ประวัติ        → PersonalProfileFields (ประชากร · สิทธิ · ประวัติ)
     ขั้น 3 สัญญาณชีพ      → DtxFields (DTX + สถานะอดอาหาร)
     ขั้น 4 ประเมิน/คัดกรอง → HealthRiskFields (ความเสี่ยง 15 ข้อ)

   ช่องที่ระบบมีอยู่แล้วไม่ถูกยกมาซ้ำ: ชื่อ-ที่อยู่-เบอร์-สิทธิ (เวชระเบียน) ·
   น้ำหนัก/ส่วนสูง/BMI/รอบเอว/BP/PR/RR/T (ขั้นสัญญาณชีพ) · รายการยาที่แพ้และ
   โรคประจำตัว (ขั้นประวัติ + การ์ดข้อมูลจากเวชระเบียน) · การเคลื่อนไหว
   (มาจากเวชระเบียนเยี่ยมบ้าน แสดงในการ์ดอ่านอย่างเดียว) */

const OTHER = 'อื่นๆ';

const ChoiceRow = ({ label, options, value, onChange, readOnly }) => (
  <Field label={label}>
    <div className='flex items-center flex-wrap w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
      {options.map((opt) => (
        <SelectableCardButton
          key={opt}
          selected={value === opt}
          onClick={readOnly ? undefined : () => onChange(value === opt ? '' : opt)}
          ariaLabel={`${label} ${opt}`}
        >
          {opt}
        </SelectableCardButton>
      ))}
    </div>
  </Field>
);

/** ตัวช่วยแก้ค่าเดียวใน object `homeScreening` ของฟอร์มเยี่ยมบ้าน */
const useSetters = (value, onChange) => {
  const v = value || {};
  const set = (key) => (next) => onChange({ ...v, [key]: next });
  /* เลือกตัวเลือกที่ไม่ใช่ "อื่นๆ" แล้วข้อความที่พิมพ์ไว้ต้องหลุดไปด้วย */
  const setWithOther = (key, otherKey) => (next) => onChange({
    ...v,
    [key]: next,
    ...(next === OTHER ? null : { [otherKey]: '' }),
  });
  const toggle = (key, item) => () => {
    const prev = Array.isArray(v[key]) ? v[key] : [];
    onChange({
      ...v,
      [key]: prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item],
    });
  };
  return { v, set, setWithOther, toggle };
};

/* ── ขั้นที่ 2 ประวัติ — ข้อมูลประชากรและประวัติที่ทะเบียนไม่ได้เก็บ ──── */
export const PersonalProfileFields = ({ value, onChange, readOnly }) => {
  const { v, set, setWithOther, toggle } = useSetters(value, onChange);
  return (
    <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400, 16px)' }}>
      <ChoiceRow label='สัญชาติ' options={NATIONALITY_OPTIONS} value={v.nationality} onChange={setWithOther('nationality', 'nationalityOther')} readOnly={readOnly} />
      {v.nationality === OTHER && (
        <Field label='ระบุสัญชาติ'>
          <InputField showLabel={false} showHelperText={false} value={v.nationalityOther || ''} onChange={set('nationalityOther')} disabled={readOnly} />
        </Field>
      )}

      <ChoiceRow label='เชื้อชาติ' options={ETHNICITY_OPTIONS} value={v.ethnicity} onChange={setWithOther('ethnicity', 'ethnicityOther')} readOnly={readOnly} />
      {v.ethnicity === OTHER && (
        <Field label='ระบุเชื้อชาติ'>
          <InputField showLabel={false} showHelperText={false} value={v.ethnicityOther || ''} onChange={set('ethnicityOther')} disabled={readOnly} />
        </Field>
      )}

      <ChoiceRow label='ศาสนา' options={RELIGION_OPTIONS} value={v.religion} onChange={setWithOther('religion', 'religionOther')} readOnly={readOnly} />
      {v.religion === OTHER && (
        <Field label='ระบุศาสนา'>
          <InputField showLabel={false} showHelperText={false} value={v.religionOther || ''} onChange={set('religionOther')} disabled={readOnly} />
        </Field>
      )}

      <ChoiceRow label='สถานะบุคคล' options={PERSON_STATUS_OPTIONS} value={v.personStatus} onChange={set('personStatus')} readOnly={readOnly} />

      <ChoiceRow label='สถานะในชุมชน' options={COMMUNITY_ROLE_OPTIONS} value={v.communityRole} onChange={setWithOther('communityRole', 'communityRoleOther')} readOnly={readOnly} />
      {v.communityRole === OTHER && (
        <Field label='ระบุสถานะในชุมชน'>
          <InputField showLabel={false} showHelperText={false} value={v.communityRoleOther || ''} onChange={set('communityRoleOther')} disabled={readOnly} />
        </Field>
      )}

      {/* "มีสิทธิอะไร" เวชระเบียนเก็บแล้ว ตรงนี้ถามว่า *ใช้* สิทธิยังไง */}
      <ChoiceRow label='การใช้สิทธิการรักษา' options={RIGHTS_USAGE_OPTIONS} value={v.rightsUsage} onChange={setWithOther('rightsUsage', 'rightsUsageOther')} readOnly={readOnly} />
      {v.rightsUsage === OTHER && (
        <Field label='ระบุการใช้สิทธิ'>
          <InputField showLabel={false} showHelperText={false} value={v.rightsUsageOther || ''} onChange={set('rightsUsageOther')} disabled={readOnly} />
        </Field>
      )}

      <Field label='การปฏิบัติตัวเมื่อเจ็บป่วยเล็กน้อย (เลือกได้หลายข้อ)'>
        <div className='flex items-center flex-wrap w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
          {MINOR_ILLNESS_OPTIONS.map((opt) => (
            <CheckboxButton
              key={opt}
              checked={(v.minorIllness || []).includes(opt)}
              onChange={readOnly ? undefined : toggle('minorIllness', opt)}
              label={opt}
              showCircleIcon={false}
              showIcon={false}
              disabled={readOnly}
            />
          ))}
        </div>
      </Field>

      <ChoiceRow label='โรคที่มีประวัติครอบครัวสายตรง' options={PRESENCE_OPTIONS} value={v.familyHistory} onChange={set('familyHistory')} readOnly={readOnly} />
      {v.familyHistory === 'มี' && (
        <SuggestibleTextarea
          voice
          label='ระบุโรคและความสัมพันธ์'
          value={v.familyHistoryDetail || ''}
          onChange={(e) => set('familyHistoryDetail')(e?.target ? e.target.value : e)}
          suggestions={FAMILY_HISTORY_SUGGESTIONS}
          minChars={1}
          disabled={readOnly}
          placeholder='เช่น เบาหวาน (มารดา) · ความดันโลหิตสูง (บิดา)'
        />
      )}

      {/* ฟอร์มมีสามสถานะ — "ไม่ทราบ" คือคำตอบที่พบบ่อยกับผู้สูงอายุที่อยู่ลำพัง
          รายการยา/อาหารที่แพ้จริง ๆ อยู่ในทะเบียนและการ์ดข้อมูลจากเวชระเบียน */}
      <ChoiceRow label='ประวัติแพ้ยา' options={ALLERGY_STATUS_OPTIONS} value={v.drugAllergyStatus} onChange={set('drugAllergyStatus')} readOnly={readOnly} />
      <ChoiceRow label='ประวัติแพ้อาหาร' options={ALLERGY_STATUS_OPTIONS} value={v.foodAllergyStatus} onChange={set('foodAllergyStatus')} readOnly={readOnly} />
    </div>
  );
};

/* ── ขั้นที่ 3 สัญญาณชีพ — DTX (ช่องเดียวที่ VitalsForm ไม่มี) ───────── */
export const DtxFields = ({ value, onChange, readOnly }) => {
  const { v, set } = useSetters(value, onChange);
  return (
    <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400, 16px)' }}>
      <div className='flex items-start w-full flex-wrap' style={{ gap: 'var(--dim-space-400, 16px)' }}>
        <Field label='DTX (mg%)'>
          <InputField
            showLabel={false}
            showHelperText={false}
            value={v.dtx || ''}
            onChange={set('dtx')}
            disabled={readOnly}
            placeholder='เช่น 110'
          />
        </Field>
      </div>
      {/* ค่าน้ำตาลอ่านไม่ได้ถ้าไม่รู้ว่าอดอาหารมาหรือเปล่า จึงเป็นคู่กันเสมอ */}
      <ChoiceRow label='สถานะการอดอาหารก่อนเจาะ DTX' options={DTX_FASTING_OPTIONS} value={v.dtxFasting} onChange={set('dtxFasting')} readOnly={readOnly} />
    </div>
  );
};

/* ── ขั้นที่ 4 ประเมินและคัดกรอง — ความเสี่ยงด้านสุขภาพ 15 ข้อ ──────── */
export const HealthRiskFields = ({ value, onChange, readOnly }) => {
  const { v, toggle } = useSetters(value, onChange);
  return (
    <div className='flex items-center flex-wrap w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
      {HEALTH_RISK_OPTIONS.map((o) => (
        <CheckboxButton
          key={o.key}
          checked={(v.risks || []).includes(o.key)}
          onChange={readOnly ? undefined : toggle('risks', o.key)}
          label={o.label}
          showCircleIcon={false}
          showIcon={false}
          disabled={readOnly}
        />
      ))}
    </div>
  );
};
