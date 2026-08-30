import React from 'react';
import Icon from '@/components/icons/Icon';
import StatusBadge from '@/components/badge/StatusBadge';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import {
  TREATMENT_DOCTOR_OPTIONS,
  APPT_CLINIC_OPTIONS,
  APPT_TYPE_OPTIONS,
  APPT_DOCTOR_OPTIONS,
  CERT_TYPE_CARDS,
  DIAGNOSIS_TYPE_OPTIONS,
} from '@/data/treatmentVisits';
import { LAB_TEST_BY_ID } from '@/data/labCatalog';
import { XRAY_EXAM_BY_ID } from '@/data/xrayCatalog';

/* CpoeReviewStep — ขั้นสุดท้ายของ /treat/record: "ตรวจสอบข้อมูล" (Review).

   ล้อทรงเดียวกับขั้นตรวจสอบข้อมูลของจุดคัดกรอง (`ScreeningStep5`) และของ
   เวชระเบียน (`StepReview`) — หนึ่งการ์ดต่อหนึ่งขั้น มีเลขขั้น · ป้ายครบ/ขาด ·
   ปุ่ม "แก้ไข" ที่กระโดดกลับไปขั้นนั้น แพทย์จึงอ่านทวนทั้ง visit ได้ในหน้าเดียว
   ก่อนกด "บันทึกและเสร็จสิ้น" แทนการเดินถอยหลังทีละขั้น (มติผู้ใช้ 31 ส.ค. 69)

   หน้านี้ **อ่านอย่างเดียว** — ไม่มีช่องกรอกของตัวเอง ทุกการแก้ไขเกิดที่ขั้น
   ต้นทางผ่านปุ่มแก้ไข เพื่อไม่ให้มีสองที่ที่แก้ค่าเดียวกันได้ */

const EMPTY = 'ยังไม่ได้กรอก';

const sectionTitleStyle = {
  margin: 0,
  color: 'var(--text-brandPrimary-default, #007549)',
  fontFamily: 'var(--type-family-heading-content)',
  fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
  fontSize: 'var(--type-size-base)',
};

const labelOf = (options, value, key = 'label') =>
  options.find((o) => o.value === value)?.[key] || '';

const trimmed = (v) => String(v ?? '').trim();

/* ชื่อรายการที่ยังไม่มีค่า — คิดจาก `items` ชุดเดียวกับที่แสดงผล ป้ายเตือนจึง
   ตรงกับแถวที่แพทย์เห็นเสมอ (เหตุผลเดียวกับ ScreeningStep5.missingFrom) */
const missingFrom = (items = []) => items
  .filter((i) => i.required && !trimmed(i.value))
  .map((i) => i.label);

/* การ์ดหนึ่งขั้นตอน · `optional` = ขั้นที่ไม่มีช่องบังคับ (ตรวจร่างกาย ·
   สั่งการรักษา · SOAP) — ว่างได้โดยไม่ถือว่าผิด แต่ต้องอ่านออกว่ายังว่าง
   จึงขึ้นป้ายเทา "ยังไม่มีบันทึก" แทนป้ายแดง "ขาด N รายการ" */
const ReviewSection = ({
  icon, stepNumber, title, missing = [], optional = false, empty = false,
  onEdit, children,
}) => {
  const complete = missing.length === 0;
  const badge = optional
    ? {
      style: empty ? 'neutral' : 'success',
      icon: empty ? 'remove' : 'check_circle',
      text: empty ? 'ยังไม่มีบันทึก' : 'บันทึกแล้ว',
    }
    : {
      style: complete ? 'success' : 'error',
      icon: complete ? 'check_circle' : 'error',
      text: complete ? 'ครบแล้ว' : `ขาด ${missing.length} รายการ`,
    };
  return (
    <section
      className='flex flex-col w-full'
      style={{
        gap: 'var(--dim-space-300)',
        background: 'var(--surface-card-100)',
        borderRadius: 'var(--dim-radius-500, 16px)',
        boxShadow: 'var(--shadow-card)',
        padding: 'var(--dim-space-600)',
      }}
    >
      <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-200)' }}>
        <Icon name={icon} size={20} style={{ color: 'var(--text-brandPrimary-default, #007549)' }} />
        <h2 style={sectionTitleStyle}>{`${stepNumber}. ${title}`}</h2>
        <StatusBadge size='small' style={badge.style} icon={badge.icon}>
          {badge.text}
        </StatusBadge>
        <div className='flex-1' />
        <BrandSubdueButton
          variant='outline'
          size='sm'
          leadingIcon='edit'
          className='shrink-0'
          onClick={onEdit}
        >
          แก้ไข
        </BrandSubdueButton>
      </div>

      {!optional && !complete && (
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

/* label · value — จังหวะอ่านสองคอลัมน์ชุดเดียวกับ ScreeningStep5.Pairs */
const Pairs = ({ items }) => (
  <div
    className='grid w-full'
    style={{
      gridTemplateColumns: '240px minmax(0, 1fr)',
      columnGap: 'var(--dim-space-400)',
      rowGap: 'var(--dim-space-200)',
    }}
  >
    {items.map(({ label, value }) => (
      <React.Fragment key={label}>
        <span style={{
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-sm)',
          color: 'var(--text-content-secondary, #636B72)',
        }}
        >
          {label}
        </span>
        <span style={{
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-sm)',
          whiteSpace: 'pre-wrap',
          color: trimmed(value)
            ? 'var(--text-content-default, #363B3F)'
            : 'var(--text-content-tertiary, #858C92)',
        }}
        >
          {trimmed(value) || EMPTY}
        </span>
      </React.Fragment>
    ))}
  </div>
);

/* รายการคำสั่ง/รหัสวินิจฉัยแบบบรรทัดต่อบรรทัด — หัวข้อกลุ่มพร้อมจำนวน แล้วจึง
   ไล่ชื่อรายการ กลุ่มที่ไม่มีรายการเลยตัดทิ้ง ไม่ขึ้นหัวข้อเปล่า */
const CountedList = ({ title, rows }) => {
  if (!rows.length) return null;
  return (
    <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-150)' }}>
      <div className='flex items-center' style={{ gap: 'var(--dim-space-200)' }}>
        <span style={{
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-sm)',
          fontWeight: 'var(--type-weight-medium)',
          color: 'var(--text-content-secondary, #636B72)',
        }}
        >
          {title}
        </span>
        <ColorfulBadge style='grey' size='small' hierarchy='secondary'>
          {`${rows.length} รายการ`}
        </ColorfulBadge>
      </div>
      <ul className='flex flex-col' style={{ gap: 'var(--dim-space-100)', margin: 0, paddingLeft: 'var(--dim-space-400, 16px)' }}>
        {rows.map((row, i) => (
          <li
            key={`${row}-${i}`}
            style={{
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-sm)',
              color: 'var(--text-content-default, #363B3F)',
              listStyle: 'disc',
            }}
          >
            {row}
          </li>
        ))}
      </ul>
    </div>
  );
};

const EmptyLine = ({ children }) => (
  <span style={{
    fontFamily: 'var(--type-family-body)',
    fontSize: 'var(--type-size-sm)',
    color: 'var(--text-content-tertiary, #858C92)',
  }}
  >
    {children}
  </span>
);

const CpoeReviewStep = ({ form = {}, onStepChange, stepIndexes = {} }) => {
  const jump = (key) => () => onStepChange?.(stepIndexes[key] ?? 0);

  /* ── 1 ตรวจร่างกาย ─────────────────────────────────────── */
  const doctorExam = form.doctorExam || {};
  const examItems = [
    { label: 'อาการ (Chief Complaint)', value: doctorExam.cc },
    { label: 'ประวัติการเจ็บป่วยปัจจุบัน (Present Illness)', value: doctorExam.pi },
    { label: 'ระยะเวลาที่มีอาการ', value: doctorExam.duration },
    { label: 'ตรวจร่างกาย (Physical Examination)', value: doctorExam.pe },
  ];
  const examMarks = [
    (form.bodyMarkers || []).length ? `จุดบนแผนภาพร่างกาย ${form.bodyMarkers.length} จุด` : '',
    (form.bodyDrawings || []).length ? `บันทึกวาด ${form.bodyDrawings.length} รายการ` : '',
    (form.examAttachments || []).length ? `ไฟล์แนบ ${form.examAttachments.length} ไฟล์` : '',
  ].filter(Boolean);
  const examEmpty = examItems.every((i) => !trimmed(i.value)) && examMarks.length === 0;

  /* ── 2 วินิจฉัย ────────────────────────────────────────── */
  const diagnoses = form.diagnoses || [];
  const diagnosisItems = [
    { label: 'วินิจฉัยเบื้องต้น', value: form.diagnosisNote, required: true },
    { label: 'คำสั่งการรักษาของแพทย์', value: form.doctorOrderNote, required: true },
    {
      label: 'แพทย์ผู้สั่งการรักษา',
      value: labelOf(TREATMENT_DOCTOR_OPTIONS, form.orderingDoctor),
      required: true,
    },
  ];
  const diagnosisRows = diagnoses.map((d) => {
    const type = labelOf(DIAGNOSIS_TYPE_OPTIONS, d.type, 'labelTh') || d.type || '';
    return `${d.code} — ${d.name}${type ? ` · ${type}` : ''}`;
  });

  /* ── 3 สั่งการรักษา ────────────────────────────────────── */
  const activeRows = (rows = []) => rows.filter((r) => !r.cancelledAt);
  const medRows = activeRows(form.medications).map((m) =>
    [m.name, m.usage, m.quantity ? `${m.quantity} ${m.unit || ''}`.trim() : ''].filter(Boolean).join(' · '));
  const supplyRows = activeRows(form.medicalSupplies).map((s) =>
    [s.name, s.quantity ? `${s.quantity} ${s.unit || ''}`.trim() : ''].filter(Boolean).join(' · '));
  const labRows = activeRows(form.labs).map((l) => {
    const test = LAB_TEST_BY_ID[l.testId];
    return [test?.nameTh || test?.nameEn || l.testId, l.urgency === 'stat' ? 'ด่วน (STAT)' : '']
      .filter(Boolean).join(' · ');
  });
  const xrayRows = activeRows(form.xrayOrders).map((x) => {
    const exam = XRAY_EXAM_BY_ID[x.examId];
    return [exam?.name || x.examId, x.view, x.urgency === 'stat' ? 'ด่วน (STAT)' : '']
      .filter(Boolean).join(' · ');
  });
  const procRows = activeRows(form.procedureOrders).map((p) =>
    [p.code, p.name].filter(Boolean).join(' — '));
  const consultRows = (form.consultOrders || []).map((c) =>
    c.name || c.label || c.source?.nameTh || 'ส่งปรึกษา');
  const orderGroups = [
    ['ยา', medRows],
    ['เวชภัณฑ์', supplyRows],
    ['ตรวจทางห้องปฏิบัติการ', labRows],
    ['ตรวจทางรังสี', xrayRows],
    ['หัตถการ', procRows],
    ['ส่งปรึกษา', consultRows],
  ];
  const ordersEmpty = orderGroups.every(([, rows]) => rows.length === 0);

  /* ── 4 SOAP Note ───────────────────────────────────────── */
  const soap = form.soap || {};
  const soapItems = [
    { label: 'S — Subjective', value: soap.s },
    { label: 'O — Objective', value: soap.o },
    { label: 'A — Assessment', value: soap.a },
    { label: 'P — Plan', value: soap.p },
  ];
  const soapEmpty = soapItems.every((i) => !trimmed(i.value));

  /* ── 5 นัดหมาย ─────────────────────────────────────────── */
  const appt = form.appointment || {};
  const apptSkipped = appt.mode === 'skip';
  const apptItems = apptSkipped
    ? [{ label: 'การนัดหมาย', value: 'ไม่นัดหมายครั้งถัดไป', required: true }]
    : [
      { label: 'การนัดหมาย', value: appt.mode ? 'นัดหมายครั้งถัดไป' : '', required: true },
      { label: 'คลินิก', value: labelOf(APPT_CLINIC_OPTIONS, appt.clinic), required: true },
      { label: 'ประเภทการนัด', value: labelOf(APPT_TYPE_OPTIONS, appt.type), required: true },
      { label: 'แพทย์ผู้นัด', value: labelOf(APPT_DOCTOR_OPTIONS, appt.doctor), required: true },
      { label: 'วันที่นัด', value: appt.date },
      {
        label: 'รูปแบบการเข้ารับบริการ',
        value: appt.location === 'telemedicine' ? 'Telemedicine' : (appt.location === 'onsite' ? 'มาที่หน่วยบริการ' : ''),
      },
      { label: 'เหตุผลการนัด', value: appt.reason, required: true },
      { label: 'การเตรียมตัว', value: appt.preparation, required: true },
    ];

  /* ── 6 เอกสาร / ใบรับรองแพทย์ ──────────────────────────── */
  const certDeclined = form.certIssue === 'no';
  const certItems = certDeclined
    ? [{ label: 'ใบรับรองแพทย์', value: 'ไม่ออกใบรับรองแพทย์', required: true }]
    : [
      { label: 'ใบรับรองแพทย์', value: form.certIssue === 'yes' ? 'ออกใบรับรองแพทย์' : '', required: true },
      {
        label: 'ประเภทใบรับรอง',
        value: CERT_TYPE_CARDS.find((c) => c.value === form.certType)?.titleTh || '',
      },
      { label: 'เลขที่เอกสาร', value: form.certNo },
      { label: 'วันที่เริ่ม–สิ้นสุด', value: [form.startDate, form.endDate].filter(Boolean).join(' – ') },
      {
        label: 'ลายเซ็นแพทย์',
        value: form.certSignature ? `ลงนามแล้ว${form.certSignedAt ? ` · ${form.certSignedAt}` : ''}` : '',
        required: form.certIssue === 'yes',
      },
    ];

  return (
    <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
      <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-200)' }}>
        <h2 style={sectionTitleStyle}>กรุณาตรวจสอบข้อมูลก่อนบันทึกและเสร็จสิ้นการตรวจ</h2>
      </div>

      <ReviewSection
        icon='stethoscope'
        stepNumber={1}
        title='ตรวจร่างกาย'
        optional
        empty={examEmpty}
        onEdit={jump('examination')}
      >
        <Pairs items={examItems} />
        {examMarks.length > 0 && <CountedList title='บันทึกบนแผนภาพร่างกาย' rows={examMarks} />}
      </ReviewSection>

      <ReviewSection
        icon='clinical_notes'
        stepNumber={2}
        title='วินิจฉัย'
        missing={missingFrom(diagnosisItems)}
        onEdit={jump('diagnosis')}
      >
        <Pairs items={diagnosisItems} />
        {diagnosisRows.length > 0
          ? <CountedList title='รหัสการวินิจฉัย (ICD-10)' rows={diagnosisRows} />
          : <EmptyLine>ยังไม่มีบันทึกรหัสการวินิจฉัย (ICD-10)</EmptyLine>}
      </ReviewSection>

      <ReviewSection
        icon='prescriptions'
        stepNumber={3}
        title='สั่งการรักษา'
        optional
        empty={ordersEmpty}
        onEdit={jump('orders')}
      >
        {ordersEmpty
          ? <EmptyLine>ยังไม่มีรายการที่สั่งใน visit นี้</EmptyLine>
          : orderGroups.map(([title, rows]) => (
            <CountedList key={title} title={title} rows={rows} />
          ))}
      </ReviewSection>

      <ReviewSection
        icon='description'
        stepNumber={4}
        title='SOAP Note'
        optional
        empty={soapEmpty}
        onEdit={jump('soap')}
      >
        <Pairs items={soapItems} />
      </ReviewSection>

      <ReviewSection
        icon='event'
        stepNumber={5}
        title='นัดหมาย'
        missing={missingFrom(apptItems)}
        onEdit={jump('appointment')}
      >
        <Pairs items={apptItems} />
      </ReviewSection>

      <ReviewSection
        icon='contract'
        stepNumber={6}
        title='เอกสาร/ใบรับรองแพทย์'
        missing={missingFrom(certItems)}
        onEdit={jump('documents')}
      >
        <Pairs items={certItems} />
      </ReviewSection>
    </div>
  );
};

export default CpoeReviewStep;
