import React from 'react';
import SelectableCardButton from '@/components/button/SelectableCardButton';
/* ตัวเลือกความเสี่ยง/พฤติกรรมใช้ชิปแบบไม่มีช่องติ๊กด้านหน้า (มติผู้ใช้
   30 ส.ค. 69) — ทรงเดียวกับแถวสูบบุหรี่/ดื่มสุราของขั้นพฤติกรรมสุขภาพที่อยู่
   เหนือมันในการ์ดเดียวกัน จะได้อ่านเป็นชุดเดียวกัน */
import SelectableTag from '@/components/forms/SelectableTag';
import InputField from '@/components/forms/InputField';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import { Field } from '@/components/forms/Fields';
import {
  RELIGION_OPTIONS,
  PERSON_STATUS_OPTIONS,
  COMMUNITY_ROLE_OPTIONS,
  RIGHTS_USAGE_OPTIONS,
  MINOR_ILLNESS_OPTIONS,
  HEALTH_RISK_OPTIONS,
  HEALTH_RISK_GROUPS,
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
      {/* สัญชาติ · เชื้อชาติ · ศาสนา ย้ายไปขั้น "ข้อมูลส่วนตัว" ทั้งสามช่อง
          (มติผู้ใช้ 30 ส.ค. 69) — เป็นข้อมูลระบุตัวบุคคล อยู่กับชื่อ/เพศ/วันเกิด
          ไม่ใช่กับแบบคัดกรอง · ใช้คีย์เดิมทั้งหมด (`nationality` · `ethnicity` ·
          `religion` + `…Other`) จึงไม่มีข้อมูลสองชุด */}

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
            <SelectableCardButton
              key={opt}
              selected={(v.minorIllness || []).includes(opt)}
              onClick={readOnly ? undefined : toggle('minorIllness', opt)}
              ariaLabel={opt}
            >
              {opt}
            </SelectableCardButton>
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
    /* ค่าน้ำตาลอ่านไม่ได้ถ้าไม่รู้ว่าอดอาหารมาหรือเปล่า จึงเป็นคู่กันเสมอ —
       และอยู่บรรทัดเดียวกัน (มติผู้ใช้ 2 ก.ย. 69) ช่องตัวเลขสั้น ๆ ไม่ควรกิน
       ทั้งบรรทัดแล้วดันสถานะการอดอาหารลงไปอีกแถว · ระยะห่างระหว่างสองกลุ่ม
       = 24px (--dim-space-600) */
    <div className='flex items-start w-full flex-wrap' style={{ gap: 'var(--dim-space-600, 24px)' }}>
      <div className='flex flex-col' style={{ flex: '0 0 240px', minWidth: 160 }}>
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
      <ChoiceRow label='สถานะการอดอาหารก่อนเจาะ DTX' options={DTX_FASTING_OPTIONS} value={v.dtxFasting} onChange={set('dtxFasting')} readOnly={readOnly} />
    </div>
  );
};

/* ── การปฏิบัติตัวเมื่อเจ็บป่วยเล็กน้อย — ขั้น "พฤติกรรมสุขภาพ" ──────
   (มติผู้ใช้ 30 ส.ค. 69) เป็นพฤติกรรมการใช้บริการ ไม่ใช่ข้อมูลประชากร
   ใช้คีย์เดิม `minorIllness` ของแบบคัดกรอง จึงไม่มีข้อมูลสองชุด */
export const MinorIllnessFields = ({ value, onChange, readOnly }) => {
  const { v, toggle } = useSetters(value, onChange);
  return (
    <div className='flex items-center flex-wrap w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
      {MINOR_ILLNESS_OPTIONS.map((opt) => (
        <SelectableCardButton
          key={opt}
          selected={(v.minorIllness || []).includes(opt)}
          onClick={readOnly ? undefined : toggle('minorIllness', opt)}
          ariaLabel={opt}
        >
          {opt}
        </SelectableCardButton>
      ))}
    </div>
  );
};

/* ── ความเสี่ยงด้านสุขภาพ 15 ข้อ — อยู่ในขั้น "พฤติกรรมสุขภาพ" ────────
   แยกเป็นกลุ่มตาม `HEALTH_RISK_GROUPS` (มติผู้ใช้ 30 ส.ค. 69) แทนแถวยาว
   แถวเดียวที่ไล่หาข้อที่ต้องการไม่เจอ */
export const HealthRiskFields = ({ value, onChange, readOnly }) => {
  const { v, toggle } = useSetters(value, onChange);
  const labelOf = (key) => HEALTH_RISK_OPTIONS.find((o) => o.key === key)?.label || key;
  return (
    <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-500, 20px)' }}>
      {HEALTH_RISK_GROUPS.map((g) => (
        <div key={g.key} className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          <span style={{
            color: 'var(--text-content-secondary, #636B72)',
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-sm)',
          }}>
            {g.label}
          </span>
          <div className='flex items-center flex-wrap w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
            {g.keys.map((key) => (
              /* ปุ่มความเสี่ยงทุกใบใช้ `SelectableCardButton` ชุดเดียวกับแถว
                 สูบบุหรี่/ดื่มสุรา/ออกกำลังกายของขั้นพฤติกรรมสุขภาพ (มติผู้ใช้
                 2 ก.ย. 69) — เดิมเป็น `CheckboxButton` ที่มีกล่องติ๊กนำหน้า
                 ขนาดและทรงจึงไม่ตรงกันทั้งที่อยู่ในการ์ดเดียวกัน

                 สารเสพติดถามเป็นสองตัวเลือก "ไม่ใช้ / ใช้" (มติผู้ใช้ 30 ส.ค. 69)
                 — ทรงเดียวกับแถวสูบบุหรี่/ดื่มสุราของขั้นพฤติกรรมสุขภาพที่อยู่
                 เหนือมันในหน้าเดียวกัน · เก็บที่คีย์เดิม: เลือก "ใช้" = ติ๊ก
                 `substance` ในลิสต์ความเสี่ยง เลือก "ไม่ใช้" = ถอดออก */
              key === 'substance' ? (
                <div key={key} className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-300, 12px)' }}>
                  <SelectableCardButton
                    selected={!(v.risks || []).includes(key)}
                    onClick={readOnly ? undefined : () => {
                      if ((v.risks || []).includes(key)) toggle('risks', key)();
                    }}
                    ariaLabel='ไม่ใช้สารเสพติด'
                  >
                    ไม่ใช้สารเสพติด
                  </SelectableCardButton>
                  <SelectableCardButton
                    selected={(v.risks || []).includes(key)}
                    onClick={readOnly ? undefined : () => {
                      if (!(v.risks || []).includes(key)) toggle('risks', key)();
                    }}
                    ariaLabel='ใช้สารเสพติด'
                  >
                    ใช้สารเสพติด
                  </SelectableCardButton>
                </div>
              ) : (
                <SelectableCardButton
                  key={key}
                  selected={(v.risks || []).includes(key)}
                  onClick={readOnly ? undefined : toggle('risks', key)}
                  ariaLabel={labelOf(key)}
                >
                  {labelOf(key)}
                </SelectableCardButton>
              )
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
