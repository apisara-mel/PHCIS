import React, { useEffect, useMemo } from 'react';
import Icon from '@/components/icons/Icon';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import { getScreeningReview, meaningfulRecords } from '@/data/opdScreeningReview';

/* ScreeningStep5 — OPD Screening last step: ตรวจสอบข้อมูล (review).

   Replaces the old แบบฟอร์ม (FormsLibrary) step. Before forwarding the
   patient to a department, the nurse reads back what steps 1–4 captured
   instead of paging backwards through four forms:

     • สัญญาณชีพ           ← VitalsForm  (step 1)
     • อาการป่วย + คำสั่ง   ← SymptomStep (step 2)
     • ประวัติการแพ้ / โรค  ← ScreeningStep3's five sub-tabs
     • พฤติกรรมสุขภาพ       ← ScreeningStep4

   Values arrive through `opdScreeningReview` (see that module for why a
   store instead of props). A section the nurse never filled shows
   "ยังไม่ได้กรอก" rather than disappearing — an empty row is information.

   TOR 1.2.3.4's per-station audit table stays at the bottom. */


const sectionTitleStyle = {
  marginTop: 'var(--dim-space-0, 0px)',
  marginRight: 'var(--dim-space-0, 0px)',
  marginBottom: 'var(--dim-space-0, 0px)',
  marginLeft: 'var(--dim-space-0, 0px)',
  color: 'var(--text-brandPrimary-default, #007549)',
  fontFamily: 'var(--type-family-heading-content)',
  fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
  fontSize: 'var(--type-size-base)',
};

const EMPTY = 'ยังไม่ได้กรอก';

const SEVERITY_TONE = { high: 'red', medium: 'orange', low: 'blue' };
const SEVERITY_LABEL = { high: 'รุนแรง', medium: 'ปานกลาง', low: 'เล็กน้อย' };

const ReviewSection = ({ icon, title, children }) => (
  <section className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
    <div className='flex items-center' style={{ gap: 'var(--dim-space-200)' }}>
      <Icon name={icon} size={20} style={{ color: 'var(--text-brandPrimary-default, #007549)' }} />
      <h2 style={sectionTitleStyle}>{title}</h2>
    </div>
    {children}
  </section>
);

/* label · value pairs — same two-column read-back rhythm the pharmacy
   dispense page uses for ข้อมูลประกอบการจ่ายยา. */
const Pairs = ({ items }) => (
  <div
    className='grid w-full'
    style={{
      /* คอลัมน์ป้ายกว้างคงที่ ทุกกลุ่มจึงตรงคอลัมน์กัน (มติผู้ใช้ 28 ส.ค. 69) —
         `max-content` เดิมทำให้แต่ละกลุ่มกว้างตามป้ายที่ยาวที่สุดของกลุ่มตัวเอง
         ค่าจึงเริ่มคนละตำแหน่งเมื่อเลื่อนอ่านจากกลุ่มบนลงกลุ่มล่าง */
      gridTemplateColumns: '240px minmax(0, 1fr)',
      columnGap: 'var(--dim-space-400)',
      rowGap: 'var(--dim-space-200)',
    }}
  >
    {items.map(({ label, value }) => (
      <React.Fragment key={label}>
        <span
          style={{
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-sm)',
            color: 'var(--text-content-secondary, #636B72)',
          }}
        >
          {label}
        </span>
        <span
          style={{
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-sm)',
            color: value ? 'var(--text-content-default, #363B3F)' : 'var(--text-content-tertiary, #858C92)',
          }}
        >
          {value || EMPTY}
        </span>
      </React.Fragment>
    ))}
  </div>
);

const AllergyBlock = ({ label, section }) => {
  const rows = meaningfulRecords(section?.records);
  const declared = section?.declaresPresence;

  return (
    <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-150)' }}>
      <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
        <span
          style={{
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-sm)',
            fontWeight: 'var(--type-weight-medium)',
            color: 'var(--text-content-default, #363B3F)',
          }}
        >
          {label}
        </span>
        {section == null ? (
          <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-tertiary, #858C92)' }}>
            {EMPTY}
          </span>
        ) : declared === false ? (
          <ColorfulBadge style='green' size='small' hierarchy='secondary' width='hug'>ไม่มี</ColorfulBadge>
        ) : rows.length === 0 ? (
          <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-tertiary, #858C92)' }}>
            ระบุว่ามี แต่ยังไม่ได้กรอกรายการ
          </span>
        ) : (
          <ColorfulBadge style='orange' size='small' hierarchy='secondary' width='hug'>{rows.length} รายการ</ColorfulBadge>
        )}
      </div>

      {rows.length > 0 && (
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-100)', paddingLeft: 'var(--dim-space-300)' }}>
          {rows.map((r, i) => (
            <div key={`${r.name}-${i}`} className='flex items-start flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
              <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-default, #363B3F)' }}>
                {r.name || '—'}
              </span>
              {r.severity && (
                <ColorfulBadge style={SEVERITY_TONE[r.severity] || 'grey'} size='small' hierarchy='secondary' width='hug'>
                  {SEVERITY_LABEL[r.severity] || r.severity}
                </ColorfulBadge>
              )}
              {r.symptom && (
                <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary, #636B72)' }}>
                  {r.symptom}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const ALLERGY_TABS = [
  { key: 'drug',     label: 'แพ้ยา'       },
  { key: 'food',     label: 'แพ้อาหาร'    },
  { key: 'chemical', label: 'แพ้สารเคมี'  },
  { key: 'disease',  label: 'โรคประจำตัว' },
  { key: 'other',    label: 'อื่น ๆ'      },
];

const ScreeningStep5 = ({ onValidityChange, patient = {} }) => {
  /* Read once per mount — the nurse reaches this step after every earlier
     step has published, and steps are re-mounted on navigation. */
  const review = useMemo(() => getScreeningReview(patient.hn), [patient.hn]);

  /* Review is read-only — never blocks "ส่งต่อไปยังแผนก". */
  useEffect(() => {
    if (typeof onValidityChange === 'function') onValidityChange(true);
  }, [onValidityChange]);

  const v = review.vitals || null;
  const s = review.symptom || null;

  /* VitalsForm seeds unmeasured fields with 0 — a 0 °C body temperature is
     not a reading, so show it as "ยังไม่ได้กรอก" instead of a fake number. */
  const num = (x) => {
    const t = String(x ?? '').trim();
    return t === '' || Number(t) === 0 ? '' : t;
  };

  const vitalItems = [
    { label: 'อุณหภูมิ', value: num(v?.temp) ? `${num(v.temp)} °C` : '' },
    {
      label: 'ความดันโลหิต',
      value: num(v?.pressureSys) && num(v?.pressureDia)
        ? `${num(v.pressureSys)}/${num(v.pressureDia)} mmHg`
        : '',
    },
    { label: 'น้ำหนัก', value: num(v?.weight) ? `${num(v.weight)} กก.` : '' },
    { label: 'ส่วนสูง', value: num(v?.height) ? `${num(v.height)} ซม.` : '' },
    { label: 'รอบการวัด', value: v?.round?.date ? `${v.round.date} ${v.round.time || ''}`.trim() : '' },
  ];

  const symptomItems = [
    { label: 'อาการ (Chief Complaint)', value: s?.complaint },
    { label: 'ระยะเวลาที่มีอาการ', value: s?.duration },
    { label: 'ประวัติการเจ็บป่วยปัจจุบัน', value: s?.presentIllness },
    { label: 'ระดับความปวด', value: s?.pain },
    { label: 'ระดับการคัดแยก (Triage)', value: s?.triage },
    { label: 'คำสั่งการพยาบาล', value: (s?.orders || []).join(' · ') },
    { label: 'รายละเอียดคำสั่งอื่น ๆ', value: s?.othersNote },
    { label: 'ใบรับรองแพทย์', value: s?.cert },
  ];

  const behaviour = review.behaviour || null;
  const behaviourItems = [
    { label: 'การสูบบุหรี่', value: behaviour?.smoking },
    { label: 'การดื่มแอลกอฮอล์', value: behaviour?.alcohol },
    { label: 'การออกกำลังกาย', value: behaviour?.exercise },
    { label: 'รายละเอียดเพิ่มเติม', value: behaviour?.detail },
  ];

  return (
    <div
      className='flex flex-col'
      style={{
        gap: 'var(--dim-space-600)',
        paddingTop: 'var(--dim-space-600)',
        paddingBottom: 'var(--dim-space-600)',
        paddingLeft: 'var(--dim-space-600)',
        paddingRight: 'var(--dim-space-600)',
      }}
    >
      <ReviewSection icon='favorite' title='สัญญาณชีพ (ขั้นตอนที่ 1)'>
        <Pairs items={vitalItems} />
      </ReviewSection>

      <ReviewSection icon='smile' title='อาการป่วยและคำสั่งการพยาบาล (ขั้นตอนที่ 2)'>
        <Pairs items={symptomItems} />
      </ReviewSection>

      <ReviewSection icon='pill' title='ประวัติการแพ้ / โรคประจำตัว (ขั้นตอนที่ 3)'>
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
          {ALLERGY_TABS.map((t) => (
            <AllergyBlock key={t.key} label={t.label} section={review[`allergy.${t.key}`]} />
          ))}
        </div>
      </ReviewSection>

      <ReviewSection icon='self_improvement' title='พฤติกรรมสุขภาพ (ขั้นตอนที่ 4)'>
        <Pairs items={behaviourItems} />
      </ReviewSection>

    </div>
  );
};

export default ScreeningStep5;
