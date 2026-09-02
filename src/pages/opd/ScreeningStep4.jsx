import React, { useEffect, useState } from 'react';
import SelectableCardButton from '@/components/button/SelectableCardButton';
import { setScreeningSection } from '@/data/opdScreeningReview';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import Icon from '@/components/icons/Icon';

/**
 * OPD Screening — Step 4: พฤติกรรมสุขภาพ.
 *
 * ประวัติโรคประจำตัว used to sit here on top of `DiseaseForm`; it now lives
 * as a sub-tab of step 3 (`ScreeningStep3`) together with the other allergy
 * categories, so the flow holds exactly one `DiseaseForm` instance.
 *
 * TOR 1.2.2.6 keeps the พฤติกรรมสุขภาพ section INSIDE the screening record
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

/* `padded=false` = หน้าที่เอาขั้นนี้ไปวางใน <SectionCard> ของตัวเองอยู่แล้ว
   (งานเยี่ยมบ้าน) — ถ้ายังใส่ระยะขอบของตัวเองซ้อนเข้าไปอีก ระยะจากเนื้อหาถึง
   ขอบการ์ดจะกลายเป็น 48px (มติผู้ใช้ 2 ก.ย. 69: ต้องเป็น 24px) */
const ScreeningStep4 = ({ onValidityChange, patient, padded = true }) => {
  const [choices, setChoices] = useState({ smoking: null, alcohol: null, exercise: null });
  const [detail, setDetail] = useState('');

  const pick = (group, option) =>
    setChoices((c) => ({ ...c, [group]: c[group] === option ? null : option }));

  /* ไม่มีฟิลด์บังคับในขั้นนี้ — โรคประจำตัวย้ายไปเป็นแท็บย่อยใน step 3 แล้ว
     (DiseaseForm ต้องมีอินสแตนซ์เดียวในโฟลว์ ไม่งั้น state สองชุดจะไม่ตรงกัน) */
  useEffect(() => {
    if (typeof onValidityChange === 'function') onValidityChange(true);
  }, [onValidityChange]);

  /* ส่งค่าให้ step "ตรวจสอบข้อมูล" อ่านต่อ */
  useEffect(() => {
    setScreeningSection(patient?.hn, 'behaviour', { ...choices, detail });
  }, [patient?.hn, choices, detail]);

  return (
    <div className='flex flex-col'>
      {/* TOR 1.2.2.6 — พฤติกรรมสุขภาพ captured in the screening record */}
      <section
        className='flex flex-col'
        /* ระยะจากเนื้อหาถึงขอบแผง 24px ทุกด้าน และระหว่างข้อ 24px
           (มติผู้ใช้ 28 ส.ค. 69) — เดิมไม่มีระยะด้านบนเลย หัวข้อจึงชนขอบ
           และระยะระหว่างข้อเป็น 16px ทำให้สามข้อดูติดกันเป็นก้อนเดียว */
        style={{
          gap: 'var(--dim-space-600)',
          paddingTop: padded ? 'var(--dim-space-600)' : 'var(--dim-space-0, 0px)',
          paddingBottom: padded ? 'var(--dim-space-600)' : 'var(--dim-space-0, 0px)',
          paddingLeft: padded ? 'var(--dim-space-600)' : 'var(--dim-space-0, 0px)',
          paddingRight: padded ? 'var(--dim-space-600)' : 'var(--dim-space-0, 0px)',
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
              fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
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
