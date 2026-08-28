import React, { useEffect, useMemo } from 'react';
import Icon from '@/components/icons/Icon';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import StatusBadge from '@/components/badge/StatusBadge';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import { getScreeningReview, meaningfulRecords } from '@/data/opdScreeningReview';
import { clinicLabel, UNASSIGNED_DOCTOR } from '@/data/unassignedWorklist';

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

/* การ์ดหนึ่งขั้นตอน — ทรงเดียวกับขั้น "ตรวจสอบข้อมูล" ของเวชระเบียน
   (src/pages/registration/StepReview.jsx · มติผู้ใช้ 28 ส.ค. 69)
   เลขขั้น + ชื่อขั้น + ป้ายครบ/ขาด + ปุ่มแก้ไขที่กระโดดกลับไปขั้นนั้น แล้วจึงเป็น
   รายการข้อมูล เดิมทุกหมวดไหลต่อกันในการ์ดใบเดียว หาไม่เจอว่าอะไรยังขาดและ
   ต้องกลับไปแก้ที่ขั้นไหน */
const ReviewSection = ({ icon, stepIndex, title, missing = [], onJumpToStep, children }) => {
  const complete = missing.length === 0;
  return (
    <section
      className='flex flex-col w-full'
      style={{
        gap: 'var(--dim-space-300)',
        /* chrome เดียวกับการ์ดขั้นอื่นของฟอร์มคัดกรอง (bg-surface-card
           rounded-card shadow-card) — มติผู้ใช้ 29 ส.ค. 69 */
        background: 'var(--surface-card-100)',
        borderRadius: 'var(--dim-radius-500, 16px)',
        boxShadow: 'var(--shadow-card)',
        padding: 'var(--dim-space-600)',
      }}
    >
      <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-200)' }}>
        <Icon name={icon} size={20} style={{ color: 'var(--text-brandPrimary-default, #007549)' }} />
        <h2 style={sectionTitleStyle}>{`${stepIndex + 1}. ${title}`}</h2>
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
          className='shrink-0'
          onClick={() => onJumpToStep?.(stepIndex)}
        >
          แก้ไข
        </BrandSubdueButton>
      </div>

      {/* สิ่งที่ยังขาดขึ้นก่อนรายการค่าที่กรอกแล้ว — เป็นงานที่ผู้ใช้ต้องจัดการ */}
      {!complete && (
        <span style={{
          color: 'var(--text-danger-secondary, #DC2626)',
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-xs)',
          lineHeight: 1.5,
        }}
        >
          {`ยังไม่ได้กรอก: ${missing.join(' · ')}`}
        </span>
      )}

      {children}
    </section>
  );
};

/* ชื่อรายการที่ยังไม่มีค่า — ใช้ `items` ชุดเดียวกับที่แสดงผล ป้ายที่ขึ้นเตือน
   จึงตรงกับแถวที่ผู้ใช้เห็นเสมอ ไม่ต้องมีรายการชื่อฟิลด์ชุดที่สองให้หลุดจากกัน */
const missingFrom = (items = []) => items
  .filter((i) => !String(i.value ?? '').trim())
  .map((i) => i.label);

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

const ScreeningStep5 = ({ onValidityChange, patient = {}, onJumpToStep }) => {
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

  /* ค่าที่ขั้น "เลือกคลินิกและแพทย์" บันทึกไว้ */
  const assignment = review.doctor || null;
  const assignmentItems = [
    { label: 'คลินิกที่ต้องการรักษา', value: clinicLabel(assignment?.assignedClinicKey) },
    { label: 'แพทย์ผู้รักษา', value: assignment?.assignedDoctor },
    {
      label: 'ช่วงเวลาที่ลงคิว',
      /* ไม่ระบุแพทย์ = ยังไม่มีช่วงเวลา ไม่ใช่ "ยังไม่ได้กรอก" — ต้องอ่านออกว่า
         เป็นผลของทางเลือกที่ตั้งใจ ไม่ใช่ข้อมูลตกหล่น */
      value: assignment?.assignedDoctor === UNASSIGNED_DOCTOR
        ? 'รอแพทย์รับเคสจากคิวรวม'
        : assignment?.assignedSlot ? `${assignment.assignedSlot} น.` : '',
    },
  ];

  const behaviour = review.behaviour || null;
  const behaviourItems = [
    { label: 'การสูบบุหรี่', value: behaviour?.smoking },
    { label: 'การดื่มแอลกอฮอล์', value: behaviour?.alcohol },
    { label: 'การออกกำลังกาย', value: behaviour?.exercise },
    { label: 'รายละเอียดเพิ่มเติม', value: behaviour?.detail },
  ];

  return (
    <div className='flex flex-col' style={{ gap: 'var(--dim-space-400)' }}>
      <div
        className='flex items-center w-full'
        style={{
          gap: 'var(--dim-space-200)',
          background: 'var(--surface-card-100)',
          borderRadius: 'var(--dim-radius-500, 16px)',
          boxShadow: 'var(--shadow-card)',
          padding: 'var(--dim-space-400) var(--dim-space-600)',
        }}
      >
        <Icon name='fact_check' size={20} style={{ color: 'var(--text-brandPrimary-default, #007549)' }} />
        <h2 style={sectionTitleStyle}>กรุณาตรวจสอบข้อมูลก่อนบันทึกและส่งต่อ</h2>
      </div>

      <ReviewSection icon='favorite' stepIndex={0} title='สัญญาณชีพ' missing={missingFrom(vitalItems)} onJumpToStep={onJumpToStep}>
        <Pairs items={vitalItems} />
      </ReviewSection>

      <ReviewSection icon='smile' stepIndex={1} title='อาการป่วยและคำสั่งการพยาบาล' missing={missingFrom(symptomItems)} onJumpToStep={onJumpToStep}>
        <Pairs items={symptomItems} />
      </ReviewSection>

      {/* หมวดแพ้/โรคประจำตัว "ครบ" เมื่อทุกหัวข้อถูกตอบแล้ว (มี/ไม่มี) —
          ไม่มีประวัติแพ้ก็เป็นคำตอบ ต่างจากยังไม่ได้ถาม */}
      <ReviewSection
        icon='pill'
        stepIndex={2}
        title='ประวัติการแพ้ / โรคประจำตัว'
        missing={ALLERGY_TABS
          .filter((t) => review[`allergy.${t.key}`]?.declaresPresence == null)
          .map((t) => t.label)}
        onJumpToStep={onJumpToStep}
      >
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
          {ALLERGY_TABS.map((t) => (
            <AllergyBlock key={t.key} label={t.label} section={review[`allergy.${t.key}`]} />
          ))}
        </div>
      </ReviewSection>

      <ReviewSection icon='self_improvement' stepIndex={3} title='พฤติกรรมสุขภาพ' missing={missingFrom(behaviourItems.filter((i) => i.label !== 'รายละเอียดเพิ่มเติม'))} onJumpToStep={onJumpToStep}>
        <Pairs items={behaviourItems} />
      </ReviewSection>

      {/* ปลายทางของเคส — เป็นสิ่งที่ขั้นตรวจสอบต้องอ่านซ้ำก่อนกดส่งต่อ
          (มติผู้ใช้ 28 ส.ค. 69) ส่งคนผิดคลินิกหรือผิดหมอคือความผิดพลาดที่
          แก้ยากกว่าค่าที่กรอกผิด เพราะผู้รับบริการเดินไปรออีกจุดแล้ว */}
      <ReviewSection icon='stethoscope' stepIndex={4} title='คลินิกและแพทย์' missing={missingFrom(assignmentItems)} onJumpToStep={onJumpToStep}>
        <Pairs items={assignmentItems} />
      </ReviewSection>

    </div>
  );
};

export default ScreeningStep5;
