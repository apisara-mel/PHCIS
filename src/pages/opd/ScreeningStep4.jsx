import React, { useState } from 'react';
import DiseaseForm from '@/components/forms/DiseaseForm';
import SelectableCardButton from '@/components/button/SelectableCardButton';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import Icon from '@/components/icons/Icon';

/**
 * OPD Screening — Step 4: ประวัติโรคประจำตัว + พฤติกรรมสุขภาพ.
 *
 * Base = the domain `DiseaseForm` (Figma PHCIS | OPD 162:19069 —
 * `HistoryListForm` + chronic-disease schema), untouched.
 *
 * TOR 1.2.2.6 adds the พฤติกรรมสุขภาพ section INSIDE the screening record
 * (not only in the Forms Library): การสูบบุหรี่ / การดื่มแอลกอฮอล์ /
 * การออกกำลังกาย as SelectableCardButton radio groups + an optional detail
 * SuggestibleTextarea (voice + suggestions + minChars per project rule).
 */

const BEHAVIOR_GROUPS = [
  {
    key: 'smoking',
    icon: 'smoking_rooms',
    label: 'การสูบบุหรี่',
    options: ['ไม่สูบ', 'เคยสูบ เลิกแล้ว', 'สูบเป็นครั้งคราว', 'สูบประจำ'],
  },
  {
    key: 'alcohol',
    icon: 'liquor',
    label: 'การดื่มแอลกอฮอล์',
    options: ['ไม่ดื่ม', 'ดื่มเป็นครั้งคราว', 'ดื่มประจำ (ทุกสัปดาห์)', 'ดื่มทุกวัน'],
  },
  {
    key: 'exercise',
    icon: 'directions_run',
    label: 'การออกกำลังกาย',
    options: ['ไม่ออกกำลังกาย', 'น้อยกว่า 3 ครั้ง/สัปดาห์', '3-5 ครั้ง/สัปดาห์', 'ทุกวัน'],
  },
];

const BEHAVIOR_DETAIL_SUGGESTIONS = [
  'สูบบุหรี่วันละ 10 มวน มาประมาณ 15 ปี (7.5 pack-year) กำลังพยายามลด',
  'เลิกบุหรี่มาแล้ว 2 ปี หลังได้รับคำแนะนำจากคลินิกเลิกบุหรี่',
  'ดื่มเบียร์ 1-2 ขวดเฉพาะช่วงสังสรรค์ เดือนละ 1-2 ครั้ง',
  'เดินเร็ววันละ 30 นาที สัปดาห์ละ 3 วัน ตามคำแนะนำแพทย์',
  'ไม่ออกกำลังกายเนื่องจากปวดเข่า แนะนำกายภาพบำบัดท่านั่ง',
];

const ScreeningStep4 = ({ onValidityChange, patient }) => {
  const [choices, setChoices] = useState({ smoking: null, alcohol: null, exercise: null });
  const [detail, setDetail] = useState('');

  const pick = (group, option) =>
    setChoices((c) => ({ ...c, [group]: c[group] === option ? null : option }));

  return (
    <div className='flex flex-col'>
      <DiseaseForm onValidityChange={onValidityChange} patient={patient} />

      {/* TOR 1.2.2.6 — พฤติกรรมสุขภาพ captured in the screening record */}
      <section
        className='flex flex-col'
        style={{
          gap: 'var(--dim-space-400)',
          paddingTop: 'var(--dim-space-0, 0px)',
          paddingBottom: 'var(--dim-space-600)',
          paddingLeft: 'var(--dim-space-600)',
          paddingRight: 'var(--dim-space-600)',
        }}
      >
        <div className='flex items-center' style={{ gap: 'var(--dim-space-200)' }}>
          <Icon name='self_improvement' size={20} style={{ color: 'var(--text-brandPrimary-default, #007549)' }} />
          <h2
            style={{
              marginTop: 'var(--dim-space-0, 0px)',
              marginRight: 'var(--dim-space-0, 0px)',
              marginBottom: 'var(--dim-space-0, 0px)',
              marginLeft: 'var(--dim-space-0, 0px)',
              color: 'var(--text-brandPrimary-default, #007549)',
              fontFamily: 'var(--type-family-heading-content)',
              fontWeight: 'var(--type-weight-bold)',
              fontSize: 'var(--type-size-base)',
            }}
          >
            พฤติกรรมสุขภาพ
          </h2>
        </div>

        {BEHAVIOR_GROUPS.map((group) => (
          <div key={group.key} className='flex flex-col' style={{ gap: 'var(--dim-space-200)' }}>
            <span
              className='inline-flex items-center'
              style={{
                gap: 'var(--dim-space-150)',
                fontFamily: 'var(--type-family-body)',
                fontSize: 'var(--type-size-sm)',
                fontWeight: 'var(--type-weight-medium)',
                color: 'var(--text-content-default, #363B3F)',
              }}
            >
              <Icon name={group.icon} size={18} style={{ color: 'var(--text-content-secondary, #636B72)' }} />
              {group.label}
            </span>
            <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-300)' }}>
              {group.options.map((opt) => (
                <SelectableCardButton
                  key={opt}
                  selected={choices[group.key] === opt}
                  onClick={() => pick(group.key, opt)}
                  ariaLabel={`${group.label} ${opt}`}
                >
                  {opt}
                </SelectableCardButton>
              ))}
            </div>
          </div>
        ))}

        <SuggestibleTextarea
          label='รายละเอียดพฤติกรรมเพิ่มเติม (ถ้ามี)'
          voice
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
          placeholder='เช่น สูบบุหรี่วันละ 10 มวน มา 15 ปี กำลังพยายามลด'
          suggestions={BEHAVIOR_DETAIL_SUGGESTIONS}
          minChars={3}
          popoverAriaLabel='คำแนะนำพฤติกรรมสุขภาพ'
        />
      </section>
    </div>
  );
};

export default ScreeningStep4;
