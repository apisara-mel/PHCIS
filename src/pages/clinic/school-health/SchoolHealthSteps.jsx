import React, { useMemo, useState } from 'react';
import InputField from '@/components/forms/InputField';
import Select from '@/components/forms/Select';
import DatePicker from '@/components/forms/DatePicker';
import Textarea from '@/components/forms/Textarea';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import Checkbox from '@/components/checkbox/Checkbox';
import Table from '@/components/table/Table';
import Popup from '@/components/popup/Popup';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import DangerSubdueButton from '@/components/button/DangerSubdueButton';
import GrowthPercentileChart from '@/pages/clinic/immunization/GrowthPercentileChart';
import {
  SH_ACADEMIC_YEARS, SH_TERMS, SH_DENTISTS, CURRENT_ACADEMIC_YEAR, CURRENT_TERM,
  formatShDate, formatShDateTime, todayIso, toIso, ageYearsAt, canViewSensitive,
} from '@/data/schoolHealthCore';
import {
  evaluateNutrition, classifyAnemia, isAnemiaScreeningTarget, nutritionBand,
  VISION_RESULTS, LICE_RESULTS, DEV_RESULTS, MENTAL_RESULTS, optionLabel, resolveOption,
  GROWTH_CHART_DEFS, estimatePercentile, BMI_AGE_MIN, BMI_AGE_MAX,
} from '@/data/schoolHealthGrowthRef';
import {
  getStudentServices, saveServiceRecord, cancelServiceRecord, reactivateServiceRecord,
  saveDraft, getDraft, removeDraft, getVaccineMatrix, getVaccineScheduleForGrade,
  getMissingVaccines, describeLot, validateLot,
} from '@/data/schoolHealthServices';
import { getActiveVaccines, getVaccineById, getVaccineLots, resolveLotWarning, INJECTION_SITE_OPTIONS, resolveInjectionSite } from '@/data/immunizationVaccines';
import {
  SubCard, SectionHeader, NoticeBar, ErrorList, EmptyState, ReadField, Field, FieldRow, AuditLine,
} from '@/pages/clinic/school-health/schoolHealthShared';

/* SchoolHealthSteps.jsx — เนื้อหาของ 6 แท็บบริการในหน้าข้อมูลนักเรียน
   (TOR §3.3.5–3.3.8, §3.4.1, §3.4.2 · มติ คทง.5)

     1) ตรวจสุขภาพ      — ซักประวัติ/ตรวจประจำปี · น้ำหนัก-ส่วนสูง → BMI for Age
                          แปลผลอัตโนมัติ · Pop-up คัดกรอง obesity เมื่อเริ่มอ้วน/อ้วน
                          · ตรวจทั่วไป/สายตา/เหา · คัดกรองซีดเฉพาะ ป.3 + ม.2 หญิง
                          (บังคับติ๊ก "ให้คำแนะนำ" ก่อนบันทึก) · กราฟการเจริญเติบโต
     2) ทันตกรรม        — ฟันผุ/อุด/ถอน · เหงือกอักเสบ · หินปูน · การรักษาที่ทำ
     3) ประวัติวัคซีน    — เมทริกซ์ความครบถ้วนตามระดับชั้น + บันทึกเข็มย้อนหลัง
     4) ให้บริการวัคซีน  — บันทึกรายคน + Lot No. จากคลัง (ตัดสต็อกตาม Lot)
     5) ประเมินพัฒนาการ — ข้อมูลอ่อนไหว (§1.4.2) แสดงเฉพาะผู้มีสิทธิ
     6) สุขภาพจิต       — ข้อมูลอ่อนไหว (§1.4.2) แสดงเฉพาะผู้มีสิทธิ

   ทุกแท็บมีชุดกริยาครบ 4: แสดงประวัติย้อนหลัง / บันทึก / แก้ไข / ยกเลิก
   (+ เปิดใช้งานคืน) และแนบผู้บันทึก ตำแหน่ง เวลา ทุก record */

/* ── suggestion sets (ทุก textarea ที่บุคลากรพิมพ์ต้องมี) ─────────── */

const FINDING_SUGGESTIONS = [
  'ตรวจร่างกาย 14 ระบบไม่พบความผิดปกติ',
  'ผิวหนังแห้งบริเวณแขนทั้งสองข้าง แนะนำทาโลชั่น',
  'ต่อมทอนซิลโตเล็กน้อย ไม่มีอาการเจ็บคอ',
  'พบขี้หูอุดตันหูขวา ทำความสะอาดแล้ว',
  'พบรอยโรคผิวหนังสงสัยกลาก แนะนำพบแพทย์',
];

const ADVICE_SUGGESTIONS = [
  'แนะนำดื่มนมจืดวันละ 2 แก้ว ลดขนมกรุบกรอบและน้ำหวาน',
  'แนะนำออกกำลังกายอย่างน้อยวันละ 60 นาที',
  'แนะนำล้างมือก่อนรับประทานอาหารและหลังเข้าห้องน้ำ',
  'แนะนำนอนหลับให้เพียงพอ 9–11 ชั่วโมงต่อคืน',
  'แนะนำผู้ปกครองพามาตรวจซ้ำที่ศูนย์บริการสาธารณสุข',
];

const OBESITY_PLAN_SUGGESTIONS = [
  'ให้คำแนะนำโภชนาการรายบุคคล + นัดติดตามน้ำหนักทุก 3 เดือน',
  'ประสานครูประจำชั้นและผู้ปกครองร่วมปรับพฤติกรรมการกิน',
  'ส่งต่อคลินิกโภชนาการที่ศูนย์บริการสาธารณสุข',
  'แนะนำลดเครื่องดื่มรสหวานและเพิ่มกิจกรรมทางกาย 60 นาที/วัน',
  'ตรวจวัดความดันโลหิตและคัดกรองภาวะแทรกซ้อนเพิ่มเติม',
];

const ANEMIA_ADVICE_SUGGESTIONS = [
  'ให้ความรู้เรื่องอาหารที่มีธาตุเหล็กสูง (ตับ เลือด เนื้อแดง ผักใบเขียว)',
  'จ่ายยาเสริมธาตุเหล็กสัปดาห์ละ 1 เม็ด และนัดตรวจซ้ำใน 1 เดือน',
  'แนะนำหลีกเลี่ยงดื่มชา/กาแฟพร้อมมื้ออาหาร',
  'ส่งต่อเข้ารับบริการตรวจเลือดเพิ่มเติมที่ศูนย์ฯ',
];

const DENTAL_ADVICE_SUGGESTIONS = [
  'แปรงฟันหลังอาหารกลางวันทุกวัน · ลดขนมหวานระหว่างมื้อ',
  'นัดเคลือบหลุมร่องฟันกรามแท้ซี่ที่ 6',
  'ส่งต่อคลินิกทันตกรรมเพื่ออุดฟันถาวร',
  'แนะนำผู้ปกครองพามาตรวจฟันทุก 6 เดือน',
];

const DEV_NOTE_SUGGESTIONS = [
  'พัฒนาการสมวัยทุกด้าน แนะนำส่งเสริมการอ่านที่บ้าน',
  'กล้ามเนื้อมัดเล็กช้ากว่าเกณฑ์เล็กน้อย แนะนำกิจกรรมฝึกมือ',
  'แจ้งครูประจำชั้นและผู้ปกครอง · นัดประเมินซ้ำใน 3 เดือน',
  'สงสัยพัฒนาการล่าช้าด้านภาษา ส่งต่อประเมินเพิ่มเติม',
];

const MH_NOTE_SUGGESTIONS = [
  'ไม่พบความเสี่ยงด้านสุขภาพจิต แนะนำช่องทางปรึกษาสายด่วน 1323',
  'ให้คำปรึกษาเบื้องต้น · ประสานครูแนะแนวติดตามต่อ',
  'พบความเสี่ยงด้านอารมณ์ นัดติดตามซ้ำใน 1 เดือน',
  'ส่งต่อคลินิกสุขภาพจิต ศูนย์บริการสาธารณสุข',
];

const VACCINE_NOTE_SUGGESTIONS = [
  'ไม่มีอาการข้างเคียงหลังฉีด สังเกตอาการ 30 นาทีแล้วปกติ',
  'ปวดบวมแดงบริเวณที่ฉีดเล็กน้อย แนะนำประคบเย็น',
  'ผู้ปกครองรับทราบและยินยอมให้รับวัคซีน',
  'เลื่อนการให้วัคซีนเนื่องจากมีไข้ นัดเก็บตกรอบถัดไป',
];

/* ── ตัวช่วยแสดงผล ────────────────────────────────────────────────── */

const statusBadge = (record) => (record.status === 'cancelled'
  ? <ColorfulBadge style='red' size='small' hierarchy='secondary'>ยกเลิกแล้ว</ColorfulBadge>
  : <ColorfulBadge style='green' size='small' hierarchy='secondary'>บันทึกแล้ว</ColorfulBadge>);

const auditColumn = {
  key: 'recordedBy',
  label: 'ผู้บันทึก · เวลา',
  flex: true,
  minWidth: 220,
  sortable: false,
  render: (r) => (
    <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
      <span style={{ fontSize: 'var(--type-size-sm, 14px)' }}>{r.recordedBy || '—'}</span>
      <span style={{ fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary, #858C92)' }}>
        {`${r.position || '—'} · ${formatShDateTime(r.recordedAt)}`}
      </span>
    </div>
  ),
};

const RecordActions = ({ row, canWrite, onEdit, onCancel, onReactivate }) => (
  <div className='flex items-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
    <NeutralSubdueButton size='sm' leadingIcon='edit' disabled={!canWrite || row.status === 'cancelled'} onClick={() => onEdit(row)}>
      แก้ไข
    </NeutralSubdueButton>
    {row.status === 'cancelled' ? (
      <BrandSubdueButton variant='outline' size='sm' leadingIcon='restart_alt' disabled={!canWrite} onClick={() => onReactivate(row)}>
        เปิดใช้งาน
      </BrandSubdueButton>
    ) : (
      <DangerSubdueButton size='sm' leadingIcon='block' disabled={!canWrite} onClick={() => onCancel(row)}>
        ยกเลิก
      </DangerSubdueButton>
    )}
  </div>
);

/** Popup ยืนยันยกเลิก record — ใช้ร่วมกันทุกแท็บ */
const CancelRecordPopup = ({ target, onClose, onConfirm }) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  return (
    <Popup
      open={!!target}
      onClose={onClose}
      title='ยกเลิกรายการบันทึกบริการ'
      subtitle={target ? `บันทึกวันที่ ${formatShDate(target.date)} · โดย ${target.recordedBy || '—'}` : ''}
      tertiaryAction={{ label: 'ปิด', onClick: onClose }}
      primaryAction={{
        label: 'ยืนยันยกเลิกรายการ',
        tone: 'danger',
        onClick: () => {
          if (!reason.trim()) { setError('กรุณาระบุเหตุผลการยกเลิก'); return; }
          onConfirm(reason.trim());
          setReason('');
          setError('');
        },
      }}
    >
      <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
        <NoticeBar tone='warning' icon='warning'>
          รายการจะไม่ถูกลบ — ระบบเก็บไว้ในสถานะ &quot;ยกเลิกแล้ว&quot; พร้อมเหตุผลและผู้ยกเลิก และเปิดใช้งานคืนได้
        </NoticeBar>
        <Textarea
          label='เหตุผลการยกเลิก'
          required
          value={reason}
          onChange={(v) => { setReason(v); if (v.trim()) setError(''); }}
          error={error || undefined}
          placeholder='เช่น บันทึกซ้ำ / บันทึกผิดคน'
        />
      </div>
    </Popup>
  );
};

/** โครงฟอร์ม + ประวัติที่ทุกแท็บใช้ร่วมกัน */
const TabScaffold = ({
  icon, title, subtitle, canWrite, readOnlyNote,
  errors, children, footer, historyTitle, historyBody, extra,
}) => (
  <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-500, 20px)' }}>
    <SectionHeader icon={icon} title={title} subtitle={subtitle} />
    {!canWrite ? <NoticeBar tone='warning' icon='lock'>{readOnlyNote || 'สิทธิไม่เพียงพอ — ดูข้อมูลได้อย่างเดียว ปุ่มบันทึกถูกปิดไว้'}</NoticeBar> : null}
    <ErrorList errors={errors} />
    {children}
    {footer}
    {extra}
    <SectionHeader icon='history' title={historyTitle} subtitle='แสดงผลและวันที่ย้อนหลังทุกครั้ง พร้อมผู้บันทึกและเวลา (TOR 3.3.8)' />
    {historyBody}
  </div>
);

const FormFooter = ({ canWrite, isEditing, onCancel, onDraft, onSave, saveLabel }) => (
  <div className='flex items-center w-full flex-wrap' style={{ gap: 'var(--dim-space-300, 12px)' }}>
    <div className='flex-1' />
    <NeutralSubdueButton size='md' leadingIcon='close' onClick={onCancel}>
      {isEditing ? 'ยกเลิกการแก้ไข' : 'ล้างฟอร์ม'}
    </NeutralSubdueButton>
    {onDraft ? (
      <NeutralSubdueButton size='md' leadingIcon='save' disabled={!canWrite} onClick={onDraft}>
        บันทึกร่าง
      </NeutralSubdueButton>
    ) : null}
    <BrandSubdueButton variant='fill' size='md' leadingIcon='check' disabled={!canWrite} onClick={onSave}>
      {saveLabel || (isEditing ? 'บันทึกการแก้ไข' : 'บันทึกผลการตรวจ')}
    </BrandSubdueButton>
  </div>
);

/* ═══════════════════ 1) แท็บตรวจสุขภาพ ═══════════════════ */

const emptyCheckup = () => ({
  id: '',
  type: 'checkup',
  date: todayIso(),
  academicYear: CURRENT_ACADEMIC_YEAR,
  term: CURRENT_TERM,
  weightKg: '',
  heightCm: '',
  generalFindings: '',
  vision: '',
  visionNote: '',
  lice: '',
  hct: '',
  anemiaAdvised: false,
  anemiaAdvice: '',
  obesityScreened: false,
  obesityPlan: '',
  advice: '',
});

export const SchoolHealthCheckupTab = ({ student, canWrite, onChanged }) => {
  const draft = getDraft(student.id, 'checkup');
  const [form, setForm] = useState(() => (draft?.form ? { ...emptyCheckup(), ...draft.form } : emptyCheckup()));
  const [errors, setErrors] = useState([]);
  const [obesityOpen, setObesityOpen] = useState(false);
  const [obesityAck, setObesityAck] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [chartKey, setChartKey] = useState('weight');

  const records = getStudentServices(student.id, 'checkup');
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  const nutrition = useMemo(() => evaluateNutrition({
    sex: student.sex,
    birthDate: student.birthDate,
    measuredAt: form.date,
    weightKg: form.weightKg,
    heightCm: form.heightCm,
  }), [student.sex, student.birthDate, form.date, form.weightKg, form.heightCm]);

  const anemiaTarget = isAnemiaScreeningTarget(student);
  const ageAtVisit = ageYearsAt(student.birthDate, form.date);
  const anemiaResult = anemiaTarget ? classifyAnemia(form.hct, ageAtVisit) : null;

  /* Pop-up คัดกรองภาวะอ้วนเปิดทันทีที่ผลออกมาเริ่มอ้วน/อ้วน (มติ คทง.5) */
  const needsObesity = !!nutrition?.needsObesityScreening;
  const obesityDone = form.obesityScreened && String(form.obesityPlan || '').trim() !== '';

  const openObesity = () => { setObesityAck(form.obesityScreened); setObesityOpen(true); };

  const validate = () => {
    const errs = [];
    if (!form.date) errs.push('กรุณาระบุวันที่ตรวจ');
    else if (form.date > todayIso()) errs.push('วันที่ตรวจต้องไม่เป็นวันในอนาคต');
    if (form.weightKg === '' || Number(form.weightKg) <= 0) errs.push('กรุณาระบุน้ำหนัก (กก.) ให้ถูกต้อง');
    if (form.heightCm === '' || Number(form.heightCm) <= 0) errs.push('กรุณาระบุส่วนสูง (ซม.) ให้ถูกต้อง');
    if (!form.vision) errs.push('กรุณาเลือกผลตรวจสายตา');
    if (!form.lice) errs.push('กรุณาเลือกผลตรวจเหา');
    if (needsObesity && !obesityDone) {
      errs.push('ผลโภชนาการอยู่ในเกณฑ์เริ่มอ้วน/อ้วน — ต้องทำแบบคัดกรองภาวะอ้วนและบันทึกแผนการดูแลก่อนบันทึก');
    }
    if (anemiaTarget) {
      if (form.hct === '' || Number(form.hct) <= 0) errs.push('นักเรียนกลุ่มเป้าหมายคัดกรองซีด — กรุณาระบุค่าความเข้มข้นเลือด (Hct %)');
      if (!form.anemiaAdvised) errs.push('ต้องติ๊ก "ให้คำแนะนำแล้ว" ในส่วนคัดกรองภาวะซีดก่อนบันทึก');
    }
    return errs;
  };

  const save = () => {
    const errs = validate();
    if (errs.length > 0) { setErrors(errs); return; }
    saveServiceRecord({
      ...form,
      studentId: student.id,
      type: 'checkup',
      weightKg: Number(form.weightKg),
      heightCm: Number(form.heightCm),
      hct: form.hct === '' ? null : Number(form.hct),
      bmi: nutrition?.bmi ?? null,
      nutritionKey: nutrition?.outOfRange ? 'out-of-range' : (nutrition?.key ?? null),
      anemiaKey: anemiaResult?.key || null,
      status: 'saved',
    });
    removeDraft(student.id, 'checkup');
    setForm(emptyCheckup());
    setErrors([]);
    onChanged('บันทึกผลการตรวจสุขภาพเรียบร้อย');
  };

  const historyColumns = [
    { key: 'date', label: 'วันที่ตรวจ', render: (r) => formatShDate(r.date) },
    { key: 'academicYear', label: 'ปี/ภาค', render: (r) => `${r.academicYear} / ${r.term}` },
    { key: 'weightKg', label: 'น้ำหนัก (กก.)', align: 'center' },
    { key: 'heightCm', label: 'ส่วนสูง (ซม.)', align: 'center' },
    { key: 'bmi', label: 'BMI', align: 'center', render: (r) => (r.bmi ?? '—') },
    {
      key: 'nutrition',
      label: 'แปลผลโภชนาการ',
      render: (r) => {
        if (r.nutritionKey === 'out-of-range') return <ColorfulBadge style='grey' size='small' hierarchy='secondary'>เกณฑ์ไม่ครอบคลุม</ColorfulBadge>;
        const band = nutritionBand(r.nutritionKey);
        return band ? <ColorfulBadge style={band.style} size='small' hierarchy='secondary'>{band.label}</ColorfulBadge> : '—';
      },
    },
    { key: 'vision', label: 'สายตา', render: (r) => optionLabel(VISION_RESULTS, r.vision) },
    { key: 'lice', label: 'เหา', render: (r) => optionLabel(LICE_RESULTS, r.lice) },
    {
      key: 'anemia',
      label: 'ภาวะซีด (Hct)',
      render: (r) => {
        if (!r.hct) return <span style={{ color: 'var(--text-content-tertiary, #858C92)' }}>ไม่อยู่ในกลุ่มคัดกรอง</span>;
        const a = classifyAnemia(r.hct, ageYearsAt(student.birthDate, r.date));
        return (
          <span className='inline-flex items-center' style={{ gap: 'var(--dim-space-150, 6px)' }}>
            <ColorfulBadge style={a?.style || 'grey'} size='small' hierarchy='secondary'>{a?.label || '—'}</ColorfulBadge>
            <span style={{ fontSize: 'var(--type-size-xs, 12px)' }}>{`${r.hct}%`}</span>
          </span>
        );
      },
    },
    { key: 'generalFindings', label: 'ผลตรวจร่างกาย', flex: true, minWidth: 260, sortable: false, render: (r) => r.generalFindings || '—' },
    { key: 'advice', label: 'คำแนะนำ', flex: true, minWidth: 240, sortable: false, render: (r) => r.advice || '—' },
    auditColumn,
    { key: 'status', label: 'สถานะ', render: statusBadge },
    {
      key: 'actions',
      label: 'การดำเนินการ',
      sortable: false,
      render: (r) => (
        <RecordActions
          row={r}
          canWrite={canWrite}
          onEdit={(row) => setForm({ ...emptyCheckup(), ...row, hct: row.hct ?? '', anemiaAdvised: !!row.anemiaAdvised })}
          onCancel={setCancelTarget}
          onReactivate={(row) => { reactivateServiceRecord(row.id); onChanged('เปิดใช้งานรายการอีกครั้งแล้ว'); }}
        />
      ),
    },
  ];

  /* กราฟการเจริญเติบโต (TOR 3.4.2) */
  const chartDef = GROWTH_CHART_DEFS.find((d) => d.key === chartKey) || GROWTH_CHART_DEFS[0];
  const refRows = chartDef.ref[student.sex === 'หญิง' ? 'female' : 'male'];
  const points = records
    .filter((r) => r.status !== 'cancelled')
    .map((r) => ({ x: ageYearsAt(student.birthDate, r.date), y: Number(r[chartDef.field]) || 0, date: r.date }))
    .filter((p) => p.x != null && p.y > 0)
    .sort((a, b) => a.x - b.x);
  const latestPoint = points[points.length - 1];
  const latestEvaluation = latestPoint
    ? (() => {
      const p = estimatePercentile(refRows, latestPoint.x, latestPoint.y);
      return {
        percentile: p,
        label: p <= 3 ? 'ต่ำกว่าเกณฑ์' : p >= 97 ? 'สูงกว่าเกณฑ์' : 'ตามเกณฑ์',
        style: p <= 3 ? 'red' : p >= 97 ? 'orange' : 'green',
      };
    })()
    : null;

  return (
    <>
      <CancelRecordPopup
        target={cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={(reason) => {
          cancelServiceRecord(cancelTarget.id, reason);
          setCancelTarget(null);
          onChanged('ยกเลิกรายการบันทึกแล้ว');
        }}
      />

      {/* Pop-up คัดกรองภาวะอ้วน (บังคับเมื่อผลเริ่มอ้วน/อ้วน) */}
      <Popup
        open={obesityOpen}
        onClose={() => setObesityOpen(false)}
        size='large'
        title='แบบคัดกรองภาวะอ้วนในนักเรียน'
        subtitle={`${student.fullName} · BMI ${nutrition?.bmi ?? '—'} · แปลผล ${nutrition?.label || '—'}`}
        tertiaryAction={{ label: 'ปิด', onClick: () => setObesityOpen(false) }}
        primaryAction={{
          label: 'บันทึกผลคัดกรอง',
          disabled: !canWrite || !obesityAck || !String(form.obesityPlan || '').trim(),
          onClick: () => { set('obesityScreened')(true); setObesityOpen(false); },
        }}
      >
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400, 16px)' }}>
          <NoticeBar tone='danger' icon='monitor_weight'>
            {`ผลภาวะโภชนาการอยู่ในเกณฑ์ "${nutrition?.label || '—'}" ตามเกณฑ์ BMI for Age อายุ ${BMI_AGE_MIN}–${BMI_AGE_MAX} ปี — ต้องคัดกรองภาวะอ้วนและบันทึกแผนการดูแลก่อนบันทึกผลตรวจ (มติ คทง.5)`}
          </NoticeBar>
          <SubCard tone='brand'>
            <div className='flex items-center flex-wrap w-full' style={{ gap: 'var(--dim-space-500, 20px)' }}>
              <ReadField label='น้ำหนัก' value={`${form.weightKg || '—'} กก.`} minWidth={140} />
              <ReadField label='ส่วนสูง' value={`${form.heightCm || '—'} ซม.`} minWidth={140} />
              <ReadField label='BMI' value={nutrition?.bmi ?? '—'} minWidth={120} />
              <ReadField label='อายุ ณ วันตรวจ' value={ageAtVisit != null ? `${ageAtVisit} ปี` : '—'} minWidth={150} />
              <ReadField
                label='เกณฑ์เริ่มอ้วน / อ้วน'
                value={nutrition?.cutoffs ? `≥ ${nutrition.cutoffs.over} / ≥ ${nutrition.cutoffs.obese}` : '—'}
                minWidth={190}
              />
            </div>
          </SubCard>
          <Field label='แผนการดูแล / คำแนะนำที่ให้' required flex='1 1 100%' minWidth={280}>
            <SuggestibleTextarea
              voice
              disabled={!canWrite}
              value={form.obesityPlan}
              onChange={(e) => set('obesityPlan')(e.target.value)}
              suggestions={OBESITY_PLAN_SUGGESTIONS}
              minChars={3}
              placeholder='เช่น ให้คำแนะนำโภชนาการรายบุคคล + นัดติดตามน้ำหนักทุก 3 เดือน'
            />
          </Field>
          <Checkbox
            checked={obesityAck}
            disabled={!canWrite}
            onChange={setObesityAck}
            label='ได้ทำแบบคัดกรองภาวะอ้วนและแจ้งผู้ปกครอง/ครูประจำชั้นแล้ว'
            description='จำเป็นต้องติ๊กก่อนจึงจะบันทึกผลคัดกรองได้'
          />
        </div>
      </Popup>

      <TabScaffold
        icon='stethoscope'
        title='ตรวจสุขภาพประจำปี'
        subtitle='ซักประวัติ · ชั่งน้ำหนัก-วัดส่วนสูง (แปลผล BMI for Age อัตโนมัติ) · ตรวจร่างกายทั่วไป สายตา เหา และคัดกรองภาวะซีดตามกลุ่มเป้าหมาย'
        canWrite={canWrite}
        errors={errors}
        historyTitle='ประวัติการตรวจสุขภาพย้อนหลัง'
        historyBody={records.length === 0 ? (
          <EmptyState icon='stethoscope' title='ยังไม่มีประวัติการตรวจสุขภาพของนักเรียนคนนี้' subtitle='บันทึกผลตรวจครั้งแรกจากฟอร์มด้านบน — กราฟการเจริญเติบโตจะเริ่มลงจุดให้ทันที' />
        ) : (
          <Table columns={historyColumns} rows={records} rowKey={(r) => r.id} stickyColCount={1} stickyRightColCount={1} emptyMessage='ไม่มีประวัติ' />
        )}
        extra={(
          <SubCard>
            <div className='flex items-center flex-wrap w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
              <span style={{ color: 'var(--text-brandPrimary-default, #007549)', fontFamily: 'var(--type-family-heading-graphic2)', fontSize: 'var(--type-size-sm, 14px)' }}>
                กราฟการเจริญเติบโต (TOR 3.4.2)
              </span>
              <div className='flex-1' />
              {GROWTH_CHART_DEFS.map((d) => (
                <BrandSubdueButton
                  key={d.key}
                  size='sm'
                  variant={chartKey === d.key ? 'fill' : 'outline'}
                  leadingIcon={d.key === 'weight' ? 'monitor_weight' : 'height'}
                  onClick={() => setChartKey(d.key)}
                >
                  {d.key === 'weight' ? 'น้ำหนักตามอายุ' : 'ส่วนสูงตามอายุ'}
                </BrandSubdueButton>
              ))}
            </div>
            <GrowthPercentileChart
              title={chartDef.title}
              unit={chartDef.unit}
              axisLabel={chartDef.axisLabel}
              reference={refRows}
              points={points}
              latestEvaluation={latestEvaluation}
              emptyMessage='ยังไม่มีข้อมูลการชั่งน้ำหนัก/วัดส่วนสูง — บันทึกผลตรวจด้านบนเพื่อลงจุดแรก'
            />
            <AuditLine icon='info'>
              เกณฑ์อ้างอิงเป็นชุดย่อสำหรับต้นแบบ (P3 / P50 / P97) — ตาราง LMS ฉบับเต็มของกรมอนามัยรอเชื่อมกับ backend
            </AuditLine>
          </SubCard>
        )}
        footer={(
          <FormFooter
            canWrite={canWrite}
            isEditing={!!form.id}
            onCancel={() => { setForm(emptyCheckup()); setErrors([]); }}
            onDraft={() => { saveDraft(student.id, 'checkup', form); onChanged('บันทึกร่างแล้ว — กลับมาแก้ต่อได้จากแท็บ "ที่ร่างไว้" ในหน้าคิว'); }}
            onSave={save}
          />
        )}
      >
        {draft?.form && !form.id ? (
          <NoticeBar tone='info' icon='save'>
            {`มีร่างที่บันทึกไว้เมื่อ ${formatShDateTime(draft.at)} โดย ${draft.by} — ฟอร์มด้านล่างถูกเติมค่าจากร่างนั้นให้แล้ว`}
          </NoticeBar>
        ) : null}

        <FieldRow>
          <Field label='วันที่ตรวจ' required flex='0 0 var(--dim-size-2450, 280px)' minWidth={200}>
            <DatePicker
              showLabel={false}
              showHelperText={false}
              value={form.date ? new Date(form.date) : null}
              onChange={(d) => set('date')(d ? toIso(d) : '')}
              placeholder='เลือกวันที่ตรวจ'
            />
          </Field>
          <Field label='ปีการศึกษา' flex='0 0 var(--dim-size-2200, 192px)' minWidth={160}>
            <Select showLabel={false} searchable={false} size='lg' disabled={!canWrite} value={form.academicYear} onChange={set('academicYear')} options={SH_ACADEMIC_YEARS} placeholder='เลือกปี' />
          </Field>
          <Field label='ภาคเรียน' flex='0 0 var(--dim-size-2200, 192px)' minWidth={160}>
            <Select showLabel={false} searchable={false} size='lg' disabled={!canWrite} value={form.term} onChange={set('term')} options={SH_TERMS} placeholder='เลือกภาค' />
          </Field>
        </FieldRow>

        <SubCard tone='brand'>
          <FieldRow>
            <Field label='น้ำหนัก (กก.)' required flex='0 0 var(--dim-size-2100, 160px)' minWidth={140}>
              <InputField showLabel={false} showHelperText={false} showLeadingIcon={false} type='number' disabled={!canWrite} value={form.weightKg} onChange={set('weightKg')} placeholder='เช่น 28.5' />
            </Field>
            <Field label='ส่วนสูง (ซม.)' required flex='0 0 var(--dim-size-2100, 160px)' minWidth={140}>
              <InputField showLabel={false} showHelperText={false} showLeadingIcon={false} type='number' disabled={!canWrite} value={form.heightCm} onChange={set('heightCm')} placeholder='เช่น 128' />
            </Field>
            <ReadField label='BMI (คำนวณอัตโนมัติ)' value={nutrition?.bmi ?? '—'} minWidth={160} />
            <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-100, 4px)', minWidth: 220 }}>
              <span style={{ color: 'var(--text-content-tertiary, #858C92)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs, 12px)' }}>
                แปลผลภาวะโภชนาการ (BMI for Age)
              </span>
              {nutrition ? (
                <ColorfulBadge style={nutrition.style} size='default' hierarchy='secondary'>{nutrition.label}</ColorfulBadge>
              ) : (
                <span style={{ fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-tertiary, #858C92)' }}>กรอกน้ำหนักและส่วนสูงให้ครบ</span>
              )}
            </div>
            <ReadField label='อายุ ณ วันตรวจ' value={ageAtVisit != null ? `${ageAtVisit} ปี` : '—'} minWidth={150} />
          </FieldRow>

          {nutrition?.outOfRange ? (
            <NoticeBar tone='info' icon='info'>{nutrition.note}</NoticeBar>
          ) : null}

          {needsObesity ? (
            <NoticeBar
              tone={obesityDone ? 'brand' : 'danger'}
              icon={obesityDone ? 'check_circle' : 'monitor_weight'}
              trailing={(
                <NeutralSubdueButton size='sm' leadingIcon='assignment' disabled={!canWrite} onClick={openObesity}>
                  {obesityDone ? 'แก้ไขแบบคัดกรอง' : 'ทำแบบคัดกรองภาวะอ้วน'}
                </NeutralSubdueButton>
              )}
            >
              {obesityDone
                ? `ทำแบบคัดกรองภาวะอ้วนแล้ว — แผนการดูแล: ${form.obesityPlan}`
                : `ผลอยู่ในเกณฑ์ "${nutrition.label}" — ต้องทำแบบคัดกรองภาวะอ้วนก่อนจึงจะบันทึกผลตรวจได้`}
            </NoticeBar>
          ) : null}
        </SubCard>

        <FieldRow>
          <Field label='ผลตรวจสายตา' required minWidth={220}>
            <Select showLabel={false} searchable={false} size='lg' disabled={!canWrite} value={form.vision} onChange={set('vision')} options={VISION_RESULTS} placeholder='เลือกผลตรวจ' />
          </Field>
          <Field label='รายละเอียดผลตรวจสายตา' flex='2 1 0' minWidth={260}>
            <InputField showLabel={false} showHelperText={false} showLeadingIcon={false} disabled={!canWrite} value={form.visionNote} onChange={set('visionNote')} placeholder='เช่น อ่านแผ่นวัดสายตาระยะ 6 เมตรได้ไม่ครบแถว 20/40' />
          </Field>
          <Field label='ผลตรวจเหา' required minWidth={200}>
            <Select showLabel={false} searchable={false} size='lg' disabled={!canWrite} value={form.lice} onChange={set('lice')} options={LICE_RESULTS} placeholder='เลือกผลตรวจ' />
          </Field>
        </FieldRow>

        {/* คัดกรองภาวะซีด — render เฉพาะนักเรียนหญิง ป.3 / ม.2 */}
        {anemiaTarget ? (
          <SubCard>
            <SectionHeader
              icon='water_drop'
              title={`คัดกรองภาวะซีด — นักเรียนหญิง ${student.gradeName}`}
              subtitle='มติ คทง.5: คัดกรองความเข้มข้นเลือดเฉพาะนักเรียนหญิงชั้น ป.3 และ ม.2 · ต้องติ๊ก "ให้คำแนะนำแล้ว" ก่อนบันทึก'
            />
            <FieldRow>
              <Field label='ความเข้มข้นเลือด Hct (%)' required flex='0 0 var(--dim-size-2200, 192px)' minWidth={170}>
                <InputField showLabel={false} showHelperText={false} showLeadingIcon={false} type='number' disabled={!canWrite} value={form.hct} onChange={set('hct')} placeholder='เช่น 38' />
              </Field>
              <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-100, 4px)', minWidth: 200 }}>
                <span style={{ color: 'var(--text-content-tertiary, #858C92)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs, 12px)' }}>
                  แปลผลอัตโนมัติ
                </span>
                {anemiaResult ? (
                  <ColorfulBadge style={anemiaResult.style} size='default' hierarchy='secondary'>
                    {`${anemiaResult.label} (เกณฑ์ ≥ ${anemiaResult.cutoff}%)`}
                  </ColorfulBadge>
                ) : (
                  <span style={{ fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-tertiary, #858C92)' }}>กรอกค่า Hct เพื่อแปลผล</span>
                )}
              </div>
              <Field label='คำแนะนำที่ให้' flex='2 1 0' minWidth={260}>
                <SuggestibleTextarea
                  voice
                  disabled={!canWrite}
                  value={form.anemiaAdvice}
                  onChange={(e) => set('anemiaAdvice')(e.target.value)}
                  suggestions={ANEMIA_ADVICE_SUGGESTIONS}
                  minChars={3}
                  placeholder='เช่น ให้ความรู้เรื่องอาหารที่มีธาตุเหล็กสูง และจ่ายยาเสริมธาตุเหล็ก'
                />
              </Field>
            </FieldRow>
            <Checkbox
              checked={!!form.anemiaAdvised}
              disabled={!canWrite}
              onChange={set('anemiaAdvised')}
              label='ให้คำแนะนำแล้ว'
              description='บังคับติ๊กก่อนบันทึก — ยืนยันว่าได้ให้คำแนะนำเรื่องโภชนาการ/ยาเสริมธาตุเหล็กแก่นักเรียนและผู้ปกครองแล้ว'
            />
          </SubCard>
        ) : (
          <NoticeBar tone='info' icon='info'>
            นักเรียนคนนี้ไม่อยู่ในกลุ่มเป้าหมายคัดกรองภาวะซีด (เฉพาะนักเรียนหญิงชั้น ป.3 และ ม.2) — ส่วนคัดกรองซีดจึงถูกซ่อนไว้
          </NoticeBar>
        )}

        <FieldRow>
          <Field label='ผลตรวจร่างกายทั่วไป' flex='1 1 0' minWidth={280}>
            <SuggestibleTextarea
              voice
              disabled={!canWrite}
              value={form.generalFindings}
              onChange={(e) => set('generalFindings')(e.target.value)}
              suggestions={FINDING_SUGGESTIONS}
              minChars={3}
              placeholder='เช่น ตรวจร่างกาย 14 ระบบไม่พบความผิดปกติ'
            />
          </Field>
          <Field label='คำแนะนำ / การดูแลต่อ' flex='1 1 0' minWidth={280}>
            <SuggestibleTextarea
              voice
              disabled={!canWrite}
              value={form.advice}
              onChange={(e) => set('advice')(e.target.value)}
              suggestions={ADVICE_SUGGESTIONS}
              minChars={3}
              placeholder='เช่น แนะนำดื่มนมจืดวันละ 2 แก้ว ลดขนมกรุบกรอบ'
            />
          </Field>
        </FieldRow>
      </TabScaffold>
    </>
  );
};

/* ═══════════════════ 2) แท็บทันตกรรม ═══════════════════ */

const emptyDental = () => ({
  id: '',
  type: 'dental',
  date: todayIso(),
  academicYear: CURRENT_ACADEMIC_YEAR,
  term: CURRENT_TERM,
  decayedPrimary: '',
  decayedPermanent: '',
  filled: '',
  missing: '',
  gingivitis: false,
  calculus: false,
  treatmentDone: '',
  advice: '',
  dentist: '',
});

export const SchoolHealthDentalTab = ({ student, canWrite, onChanged }) => {
  const [form, setForm] = useState(emptyDental());
  const [errors, setErrors] = useState([]);
  const [cancelTarget, setCancelTarget] = useState(null);
  const records = getStudentServices(student.id, 'dental');
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  const totalDecayed = (Number(form.decayedPrimary) || 0) + (Number(form.decayedPermanent) || 0);

  const save = () => {
    const errs = [];
    if (!form.date) errs.push('กรุณาระบุวันที่ตรวจ');
    else if (form.date > todayIso()) errs.push('วันที่ตรวจต้องไม่เป็นวันในอนาคต');
    if (!form.dentist) errs.push('กรุณาเลือกทันตแพทย์/เจ้าหน้าที่ผู้ตรวจ');
    ['decayedPrimary', 'decayedPermanent', 'filled', 'missing'].forEach((k) => {
      if (form[k] !== '' && Number(form[k]) < 0) errs.push('จำนวนซี่ฟันต้องไม่ติดลบ');
    });
    if (errs.length > 0) { setErrors([...new Set(errs)]); return; }
    saveServiceRecord({
      ...form,
      studentId: student.id,
      type: 'dental',
      decayedPrimary: Number(form.decayedPrimary) || 0,
      decayedPermanent: Number(form.decayedPermanent) || 0,
      filled: Number(form.filled) || 0,
      missing: Number(form.missing) || 0,
      needTreatment: totalDecayed > 0,
      status: 'saved',
    });
    setForm(emptyDental());
    setErrors([]);
    onChanged('บันทึกผลตรวจทันตกรรมเรียบร้อย');
  };

  const historyColumns = [
    { key: 'date', label: 'วันที่ตรวจ', render: (r) => formatShDate(r.date) },
    { key: 'decayedPrimary', label: 'ฟันน้ำนมผุ (ซี่)', align: 'center', render: (r) => (r.decayedPrimary ?? 0) },
    { key: 'decayedPermanent', label: 'ฟันแท้ผุ (ซี่)', align: 'center', render: (r) => (r.decayedPermanent ?? 0) },
    { key: 'filled', label: 'อุด (ซี่)', align: 'center', render: (r) => (r.filled ?? 0) },
    { key: 'missing', label: 'ถอน/สูญเสีย (ซี่)', align: 'center', render: (r) => (r.missing ?? 0) },
    { key: 'gingivitis', label: 'เหงือกอักเสบ', render: (r) => (r.gingivitis ? <ColorfulBadge style='orange' size='small' hierarchy='secondary'>พบ</ColorfulBadge> : 'ไม่พบ') },
    { key: 'calculus', label: 'หินปูน', render: (r) => (r.calculus ? <ColorfulBadge style='yellow' size='small' hierarchy='secondary'>พบ</ColorfulBadge> : 'ไม่พบ') },
    {
      key: 'needTreatment',
      label: 'ต้องรักษาต่อ',
      render: (r) => (r.needTreatment
        ? <ColorfulBadge style={r.treatmentDone ? 'green' : 'red'} size='small' hierarchy='secondary'>{r.treatmentDone ? 'รักษาแล้ว' : 'ยังไม่ได้รักษา'}</ColorfulBadge>
        : <ColorfulBadge style='green' size='small' hierarchy='secondary'>ไม่ต้องรักษา</ColorfulBadge>),
    },
    { key: 'treatmentDone', label: 'การรักษาที่ทำ', flex: true, minWidth: 240, sortable: false, render: (r) => r.treatmentDone || '—' },
    { key: 'advice', label: 'คำแนะนำ', flex: true, minWidth: 240, sortable: false, render: (r) => r.advice || '—' },
    auditColumn,
    { key: 'status', label: 'สถานะ', render: statusBadge },
    {
      key: 'actions',
      label: 'การดำเนินการ',
      sortable: false,
      render: (r) => (
        <RecordActions
          row={r}
          canWrite={canWrite}
          onEdit={(row) => setForm({ ...emptyDental(), ...row })}
          onCancel={setCancelTarget}
          onReactivate={(row) => { reactivateServiceRecord(row.id); onChanged('เปิดใช้งานรายการอีกครั้งแล้ว'); }}
        />
      ),
    },
  ];

  return (
    <>
      <CancelRecordPopup
        target={cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={(reason) => { cancelServiceRecord(cancelTarget.id, reason); setCancelTarget(null); onChanged('ยกเลิกรายการบันทึกแล้ว'); }}
      />
      <TabScaffold
        icon='dentistry'
        title='ตรวจทันตกรรม'
        subtitle='บันทึกฟันผุ/อุด/ถอน เหงือกอักเสบ หินปูน และการรักษาที่ให้ — บันทึกทั้งห้องพร้อมกันได้จากหน้า Batch entry'
        canWrite={canWrite}
        errors={errors}
        historyTitle='ประวัติการตรวจทันตกรรมย้อนหลัง'
        historyBody={records.length === 0 ? (
          <EmptyState icon='dentistry' title='ยังไม่มีประวัติการตรวจทันตกรรม' subtitle='บันทึกผลตรวจจากฟอร์มด้านบน หรือใช้ตารางติ๊กทั้งห้องที่หน้า Batch entry' />
        ) : (
          <Table columns={historyColumns} rows={records} rowKey={(r) => r.id} stickyColCount={1} stickyRightColCount={1} emptyMessage='ไม่มีประวัติ' />
        )}
        footer={(
          <FormFooter
            canWrite={canWrite}
            isEditing={!!form.id}
            onCancel={() => { setForm(emptyDental()); setErrors([]); }}
            onDraft={() => { saveDraft(student.id, 'dental', form); onChanged('บันทึกร่างแล้ว'); }}
            onSave={save}
          />
        )}
      >
        <FieldRow>
          <Field label='วันที่ตรวจ' required flex='0 0 var(--dim-size-2450, 280px)' minWidth={200}>
            <DatePicker showLabel={false} showHelperText={false} value={form.date ? new Date(form.date) : null} onChange={(d) => set('date')(d ? toIso(d) : '')} placeholder='เลือกวันที่' />
          </Field>
          <Field label='ทันตแพทย์ผู้ตรวจ' required minWidth={220}>
            <Select showLabel={false} searchable={false} size='lg' disabled={!canWrite} value={form.dentist} onChange={set('dentist')} options={SH_DENTISTS.map((d) => ({ value: d.label, label: d.label }))} placeholder='เลือกผู้ตรวจ' />
          </Field>
          <Field label='ปีการศึกษา' flex='0 0 var(--dim-size-2200, 192px)' minWidth={160}>
            <Select showLabel={false} searchable={false} size='lg' disabled={!canWrite} value={form.academicYear} onChange={set('academicYear')} options={SH_ACADEMIC_YEARS} placeholder='เลือกปี' />
          </Field>
        </FieldRow>
        <FieldRow>
          <Field label='ฟันน้ำนมผุ (ซี่)' flex='0 0 var(--dim-size-2100, 160px)' minWidth={140}>
            <InputField showLabel={false} showHelperText={false} showLeadingIcon={false} type='number' disabled={!canWrite} value={form.decayedPrimary} onChange={set('decayedPrimary')} placeholder='0' />
          </Field>
          <Field label='ฟันแท้ผุ (ซี่)' flex='0 0 var(--dim-size-2100, 160px)' minWidth={140}>
            <InputField showLabel={false} showHelperText={false} showLeadingIcon={false} type='number' disabled={!canWrite} value={form.decayedPermanent} onChange={set('decayedPermanent')} placeholder='0' />
          </Field>
          <Field label='ฟันที่อุดแล้ว (ซี่)' flex='0 0 var(--dim-size-2100, 160px)' minWidth={140}>
            <InputField showLabel={false} showHelperText={false} showLeadingIcon={false} type='number' disabled={!canWrite} value={form.filled} onChange={set('filled')} placeholder='0' />
          </Field>
          <Field label='ฟันที่ถอน/สูญเสีย (ซี่)' flex='0 0 var(--dim-size-2100, 160px)' minWidth={150}>
            <InputField showLabel={false} showHelperText={false} showLeadingIcon={false} type='number' disabled={!canWrite} value={form.missing} onChange={set('missing')} placeholder='0' />
          </Field>
          <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-200, 8px)', minWidth: 220 }}>
            <Checkbox checked={!!form.gingivitis} disabled={!canWrite} onChange={set('gingivitis')} label='พบเหงือกอักเสบ' />
            <Checkbox checked={!!form.calculus} disabled={!canWrite} onChange={set('calculus')} label='พบหินปูน' />
          </div>
        </FieldRow>
        {totalDecayed > 0 ? (
          <NoticeBar tone='warning' icon='dentistry'>
            {`พบฟันผุรวม ${totalDecayed} ซี่ — บันทึกการรักษาที่ทำ หรือส่งต่อคลินิกทันตกรรมผ่านปุ่ม "ส่งต่อเข้ารับบริการ" ด้านบนของหน้า`}
          </NoticeBar>
        ) : null}
        <FieldRow>
          <Field label='การรักษาที่ทำในวันนี้' flex='1 1 0' minWidth={280}>
            <SuggestibleTextarea
              voice
              disabled={!canWrite}
              value={form.treatmentDone}
              onChange={(e) => set('treatmentDone')(e.target.value)}
              suggestions={['เคลือบฟลูออไรด์', 'เคลือบหลุมร่องฟัน', 'อุดฟันชั่วคราว 1 ซี่', 'ขูดหินปูน', 'ยังไม่ได้ให้การรักษา — นัดหน่วยทันตกรรมเคลื่อนที่']}
              minChars={2}
              placeholder='เช่น เคลือบฟลูออไรด์ + อุดฟันชั่วคราว 1 ซี่'
            />
          </Field>
          <Field label='คำแนะนำทันตสุขภาพ' flex='1 1 0' minWidth={280}>
            <SuggestibleTextarea
              voice
              disabled={!canWrite}
              value={form.advice}
              onChange={(e) => set('advice')(e.target.value)}
              suggestions={DENTAL_ADVICE_SUGGESTIONS}
              minChars={3}
              placeholder='เช่น แปรงฟันหลังอาหารกลางวันทุกวัน'
            />
          </Field>
        </FieldRow>
      </TabScaffold>
    </>
  );
};

/* ═══════════════════ 3) แท็บประวัติวัคซีน ═══════════════════ */

const emptyHistoryDose = () => ({
  id: '',
  type: 'vaccineHistory',
  vaccineId: '',
  seq: '1',
  date: todayIso(),
  source: 'สมุดบันทึกสุขภาพแม่และเด็ก (สมุดสีชมพู)',
});

export const SchoolHealthVaccineHistoryTab = ({ student, canWrite, onChanged }) => {
  const [form, setForm] = useState(emptyHistoryDose());
  const [errors, setErrors] = useState([]);
  const [cancelTarget, setCancelTarget] = useState(null);
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  const matrix = getVaccineMatrix(student);
  const missing = getMissingVaccines(student);
  const plan = getVaccineScheduleForGrade(student.grade);
  const records = getStudentServices(student.id, 'vaccineHistory');

  const save = () => {
    const errs = [];
    if (!form.vaccineId) errs.push('กรุณาเลือกวัคซีน');
    if (!form.date) errs.push('กรุณาระบุวันที่ได้รับ');
    else if (form.date > todayIso()) errs.push('วันที่ได้รับต้องไม่เป็นวันในอนาคต');
    else if (student.birthDate && form.date < student.birthDate) errs.push('วันที่ได้รับต้องไม่ก่อนวันเกิดของนักเรียน');
    if (errs.length > 0) { setErrors(errs); return; }
    saveServiceRecord({ ...form, studentId: student.id, type: 'vaccineHistory', seq: Number(form.seq) || 1, status: 'saved' });
    setForm(emptyHistoryDose());
    setErrors([]);
    onChanged('บันทึกประวัติวัคซีนเรียบร้อย');
  };

  const matrixColumns = [
    { key: 'abbr', label: 'วัคซีน', render: (r) => `${r.abbr} — ${r.code}` },
    { key: 'nameTh', label: 'ชื่อวัคซีน', flex: true, minWidth: 260 },
    { key: 'doses', label: 'จำนวนเข็มที่ได้รับ', align: 'center', sortable: false, render: (r) => `${r.doses.length} เข็ม` },
    { key: 'lastDate', label: 'เข็มล่าสุด', render: (r) => (r.lastDate ? formatShDate(r.lastDate) : '—') },
    {
      key: 'planned',
      label: 'อยู่ในโปรแกรมของชั้นนี้',
      sortable: false,
      render: (r) => (r.planned
        ? <ColorfulBadge style='indigo' size='small' hierarchy='secondary'>ตามระดับชั้น</ColorfulBadge>
        : <span style={{ color: 'var(--text-content-tertiary, #858C92)' }}>—</span>),
    },
    {
      key: 'complete',
      label: 'ความครบถ้วน',
      render: (r) => (r.complete
        ? <ColorfulBadge style='green' size='small' hierarchy='secondary'>มีประวัติแล้ว</ColorfulBadge>
        : <ColorfulBadge style='red' size='small' hierarchy='secondary'>ยังไม่มีประวัติ</ColorfulBadge>),
    },
  ];

  const historyColumns = [
    { key: 'date', label: 'วันที่ได้รับ', render: (r) => formatShDate(r.date) },
    { key: 'vaccine', label: 'วัคซีน', flex: true, minWidth: 240, render: (r) => `${getVaccineById(r.vaccineId)?.abbr || '—'} — ${getVaccineById(r.vaccineId)?.nameTh || '—'}` },
    { key: 'seq', label: 'เข็มที่', align: 'center' },
    { key: 'source', label: 'แหล่งข้อมูล', flex: true, minWidth: 240, sortable: false },
    auditColumn,
    { key: 'status', label: 'สถานะ', render: statusBadge },
    {
      key: 'actions',
      label: 'การดำเนินการ',
      sortable: false,
      render: (r) => (
        <RecordActions
          row={r}
          canWrite={canWrite}
          onEdit={(row) => setForm({ ...emptyHistoryDose(), ...row, seq: String(row.seq || 1) })}
          onCancel={setCancelTarget}
          onReactivate={(row) => { reactivateServiceRecord(row.id); onChanged('เปิดใช้งานรายการอีกครั้งแล้ว'); }}
        />
      ),
    },
  ];

  return (
    <>
      <CancelRecordPopup
        target={cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={(reason) => { cancelServiceRecord(cancelTarget.id, reason); setCancelTarget(null); onChanged('ยกเลิกรายการบันทึกแล้ว'); }}
      />
      <TabScaffold
        icon='vaccines'
        title='ประวัติวัคซีนและความครบถ้วน'
        subtitle='ตรวจสอบความครบถ้วนตามตารางสร้างเสริมภูมิคุ้มกันของระดับชั้น และบันทึกเข็มย้อนหลังจากสมุดสีชมพู'
        canWrite={canWrite}
        errors={errors}
        historyTitle='รายการเข็มวัคซีนที่บันทึกไว้'
        historyBody={records.length === 0 ? (
          <EmptyState icon='vaccines' title='ยังไม่มีประวัติวัคซีนของนักเรียนคนนี้' subtitle='บันทึกเข็มย้อนหลังจากสมุดบันทึกสุขภาพแม่และเด็ก เพื่อให้ระบบคำนวณความครบถ้วนได้ถูกต้อง' />
        ) : (
          <Table columns={historyColumns} rows={records} rowKey={(r) => r.id} stickyColCount={1} stickyRightColCount={1} emptyMessage='ไม่มีประวัติ' />
        )}
        extra={(
          <>
            <SectionHeader
              icon='table_chart'
              title='เมทริกซ์ความครบถ้วนวัคซีน'
              subtitle={plan.length > 0
                ? `โปรแกรมของชั้น ${student.gradeName}: ${plan.map((p) => p.doseLabel).join(' · ')}`
                : `ชั้น ${student.gradeName} ไม่มีวัคซีนตามตารางสร้างเสริมภูมิคุ้มกันในโรงเรียน`}
            />
            {missing.length > 0 ? (
              <NoticeBar tone='warning' icon='warning'>
                {`ยังขาดวัคซีนตามระดับชั้น ${missing.length} รายการ: ${missing.map((m) => m.doseLabel).join(' · ')} — ส่งเข้ารอบเก็บตกได้จากหน้า Batch entry`}
              </NoticeBar>
            ) : (
              <NoticeBar tone='brand' icon='check_circle'>ได้รับวัคซีนครบตามตารางของระดับชั้นนี้แล้ว</NoticeBar>
            )}
            {matrix.length === 0 ? (
              <EmptyState compact icon='table_chart' title='ยังไม่มีข้อมูลวัคซีนสำหรับสร้างเมทริกซ์' />
            ) : (
              <Table columns={matrixColumns} rows={matrix} rowKey={(r) => r.id} emptyMessage='ไม่มีข้อมูล' />
            )}
          </>
        )}
        footer={(
          <FormFooter
            canWrite={canWrite}
            isEditing={!!form.id}
            onCancel={() => { setForm(emptyHistoryDose()); setErrors([]); }}
            onSave={save}
            saveLabel={form.id ? 'บันทึกการแก้ไข' : 'บันทึกเข็มย้อนหลัง'}
          />
        )}
      >
        <FieldRow>
          <Field label='วัคซีน' required minWidth={260}>
            <Select
              showLabel={false}
              size='lg'
              disabled={!canWrite}
              value={form.vaccineId}
              onChange={set('vaccineId')}
              options={getActiveVaccines().map((v) => ({ value: v.id, label: `${v.abbr} — ${v.nameTh}` }))}
              placeholder='เลือกวัคซีน'
            />
          </Field>
          <Field label='เข็มที่' flex='0 0 var(--dim-size-2100, 160px)' minWidth={130}>
            <InputField showLabel={false} showHelperText={false} showLeadingIcon={false} type='number' disabled={!canWrite} value={form.seq} onChange={set('seq')} placeholder='1' />
          </Field>
          <Field label='วันที่ได้รับ' required flex='0 0 var(--dim-size-2450, 280px)' minWidth={200}>
            <DatePicker showLabel={false} showHelperText={false} value={form.date ? new Date(form.date) : null} onChange={(d) => set('date')(d ? toIso(d) : '')} placeholder='เลือกวันที่' />
          </Field>
          <Field label='แหล่งข้อมูล' flex='2 1 0' minWidth={240}>
            <InputField showLabel={false} showHelperText={false} showLeadingIcon={false} disabled={!canWrite} value={form.source} onChange={set('source')} placeholder='เช่น สมุดสีชมพู / ใบรับรองจากสถานพยาบาลอื่น' />
          </Field>
        </FieldRow>
      </TabScaffold>
    </>
  );
};

/* ═══════════════════ 4) แท็บให้บริการวัคซีน ═══════════════════ */

const emptyGive = () => ({
  id: '',
  type: 'vaccineGive',
  vaccineId: '',
  lotNo: '',
  seq: '1',
  date: todayIso(),
  site: '',
  note: '',
});

export const SchoolHealthVaccineGiveTab = ({ student, canWrite, onChanged }) => {
  const [form, setForm] = useState(emptyGive());
  const [errors, setErrors] = useState([]);
  const [cancelTarget, setCancelTarget] = useState(null);
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  const records = getStudentServices(student.id, 'vaccineGive');
  const lots = form.vaccineId ? getVaccineLots(form.vaccineId) : [];
  const lotInfo = form.vaccineId && form.lotNo ? describeLot(form.vaccineId, form.lotNo) : null;
  const lotWarning = lotInfo?.warning || (lotInfo ? resolveLotWarning(lotInfo) : null);

  const save = () => {
    const errs = [];
    if (!form.vaccineId) errs.push('กรุณาเลือกวัคซีน');
    if (!form.date) errs.push('กรุณาระบุวันที่ให้บริการ');
    else if (form.date > todayIso()) errs.push('วันที่ให้บริการต้องไม่เป็นวันในอนาคต');
    if (!form.site) errs.push('กรุณาเลือกตำแหน่งที่ฉีด/ให้');
    const lotError = form.vaccineId ? validateLot(form.vaccineId, form.lotNo, 1) : 'กรุณาเลือกวัคซีนก่อน';
    if (lotError) errs.push(lotError);
    if (errs.length > 0) { setErrors(errs); return; }
    saveServiceRecord({ ...form, studentId: student.id, type: 'vaccineGive', seq: Number(form.seq) || 1, status: 'saved' });
    setForm(emptyGive());
    setErrors([]);
    onChanged('บันทึกการให้บริการวัคซีนเรียบร้อย');
  };

  const historyColumns = [
    { key: 'date', label: 'วันที่ให้บริการ', render: (r) => formatShDate(r.date) },
    { key: 'vaccine', label: 'วัคซีน', flex: true, minWidth: 240, render: (r) => `${getVaccineById(r.vaccineId)?.abbr || '—'} — ${getVaccineById(r.vaccineId)?.nameTh || '—'}` },
    { key: 'seq', label: 'เข็มที่', align: 'center', render: (r) => (r.seq ?? '—') },
    { key: 'lotNo', label: 'Lot No.', render: (r) => r.lotNo || '—' },
    { key: 'site', label: 'ตำแหน่งที่ฉีด', render: (r) => (r.site ? resolveInjectionSite(r.site) : '—') },
    { key: 'batch', label: 'ช่องทางบันทึก', render: (r) => (r.batch ? <ColorfulBadge style='indigo' size='small' hierarchy='secondary'>Batch รายห้อง</ColorfulBadge> : 'รายบุคคล') },
    { key: 'note', label: 'หมายเหตุ/อาการหลังฉีด', flex: true, minWidth: 260, sortable: false, render: (r) => r.note || '—' },
    auditColumn,
    { key: 'status', label: 'สถานะ', render: statusBadge },
    {
      key: 'actions',
      label: 'การดำเนินการ',
      sortable: false,
      render: (r) => (
        <RecordActions
          row={r}
          canWrite={canWrite}
          /* แก้ไขย้อนหลังคง Lot No. เดิมไว้เสมอเพื่อ traceability AEFI */
          onEdit={(row) => setForm({ ...emptyGive(), ...row, seq: String(row.seq || 1) })}
          onCancel={setCancelTarget}
          onReactivate={(row) => { reactivateServiceRecord(row.id); onChanged('เปิดใช้งานรายการอีกครั้งแล้ว'); }}
        />
      ),
    },
  ];

  return (
    <>
      <CancelRecordPopup
        target={cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={(reason) => { cancelServiceRecord(cancelTarget.id, reason); setCancelTarget(null); onChanged('ยกเลิกรายการบันทึกแล้ว'); }}
      />
      <TabScaffold
        icon='syringe'
        title='ให้บริการวัคซีนรายบุคคล'
        subtitle='เลือกวัคซีนและ Lot No. จากคลังของศูนย์ฯ — ระบบตัดสต็อกตาม Lot ที่ใช้จริงเพื่อการติดตาม AEFI'
        canWrite={canWrite}
        errors={errors}
        historyTitle='ประวัติการให้บริการวัคซีน'
        historyBody={records.length === 0 ? (
          <EmptyState icon='syringe' title='ยังไม่มีการให้บริการวัคซีนที่บันทึกไว้' subtitle='บันทึกรายบุคคลจากฟอร์มด้านบน หรือใช้ Batch entry เพื่อบันทึกทั้งห้องพร้อมกัน' />
        ) : (
          <Table columns={historyColumns} rows={records} rowKey={(r) => r.id} stickyColCount={1} stickyRightColCount={1} emptyMessage='ไม่มีประวัติ' />
        )}
        footer={(
          <FormFooter
            canWrite={canWrite}
            isEditing={!!form.id}
            onCancel={() => { setForm(emptyGive()); setErrors([]); }}
            onSave={save}
            saveLabel={form.id ? 'บันทึกการแก้ไข' : 'บันทึกการให้วัคซีน'}
          />
        )}
      >
        <FieldRow>
          <Field label='วัคซีน' required minWidth={260}>
            <Select
              showLabel={false}
              size='lg'
              disabled={!canWrite}
              value={form.vaccineId}
              onChange={(v) => { set('vaccineId')(v); set('lotNo')(''); }}
              options={getActiveVaccines().map((v) => ({ value: v.id, label: `${v.abbr} — ${v.nameTh}` }))}
              placeholder='เลือกวัคซีน'
            />
          </Field>
          <Field
            label='Lot No. (จากคลังวัคซีนของศูนย์ฯ)'
            required
            minWidth={220}
            hint={form.vaccineId && lots.length === 0 ? 'วัคซีนนี้ไม่มี Lot คงเหลือในคลัง — ประสานคลังเบิกก่อนให้บริการ' : undefined}
          >
            <Select
              showLabel={false}
              searchable={false}
              size='lg'
              disabled={!canWrite || !form.vaccineId || lots.length === 0}
              value={form.lotNo}
              onChange={set('lotNo')}
              options={lots.map((l) => ({ value: l.lotNo, label: `${l.lotNo} · หมดอายุ ${formatShDate(l.expiry)} · คงเหลือ ${l.remaining} โดส` }))}
              placeholder='เลือก Lot No.'
            />
          </Field>
          <Field label='เข็มที่' flex='0 0 var(--dim-size-2100, 160px)' minWidth={130}>
            <InputField showLabel={false} showHelperText={false} showLeadingIcon={false} type='number' disabled={!canWrite} value={form.seq} onChange={set('seq')} placeholder='1' />
          </Field>
          <Field label='วันที่ให้บริการ' required flex='0 0 var(--dim-size-2450, 280px)' minWidth={200}>
            <DatePicker showLabel={false} showHelperText={false} value={form.date ? new Date(form.date) : null} onChange={(d) => set('date')(d ? toIso(d) : '')} placeholder='เลือกวันที่' />
          </Field>
          <Field label='ตำแหน่งที่ฉีด/ให้' required minWidth={220}>
            <Select showLabel={false} searchable={false} size='lg' disabled={!canWrite} value={form.site} onChange={set('site')} options={INJECTION_SITE_OPTIONS} placeholder='เลือกตำแหน่ง' />
          </Field>
        </FieldRow>

        {lotInfo ? (
          <SubCard tone='brand'>
            <div className='flex items-center flex-wrap w-full' style={{ gap: 'var(--dim-space-500, 20px)' }}>
              <ReadField label='Lot No.' value={lotInfo.lotNo} minWidth={140} />
              <ReadField label='วันหมดอายุ' value={formatShDate(lotInfo.expiry)} minWidth={160} />
              <ReadField label='คงเหลือ (หลังหักที่ใช้ใน session)' value={`${lotInfo.remaining} โดส`} minWidth={220} />
              <ReadField label='การเก็บรักษา' value={lotInfo.coldChain} minWidth={140} />
            </div>
            {lotWarning ? (
              <NoticeBar tone={lotWarning.tone === 'danger' ? 'danger' : 'warning'} icon='warning'>{lotWarning.message}</NoticeBar>
            ) : null}
          </SubCard>
        ) : null}

        <Field label='หมายเหตุ / อาการหลังได้รับวัคซีน' flex='1 1 100%' minWidth={280}>
          <SuggestibleTextarea
            voice
            disabled={!canWrite}
            value={form.note}
            onChange={(e) => set('note')(e.target.value)}
            suggestions={VACCINE_NOTE_SUGGESTIONS}
            minChars={3}
            placeholder='เช่น สังเกตอาการ 30 นาทีหลังฉีด ไม่พบอาการข้างเคียง'
          />
        </Field>
      </TabScaffold>
    </>
  );
};

/* ═══════════════════ 5) แท็บประเมินพัฒนาการ ═══════════════════ */

const emptyDev = () => ({
  id: '',
  type: 'development',
  date: todayIso(),
  academicYear: CURRENT_ACADEMIC_YEAR,
  term: CURRENT_TERM,
  tool: 'แบบคัดกรองพัฒนาการเด็กวัยเรียน (ด้านการเรียนรู้ · สังคม · กล้ามเนื้อ)',
  result: '',
  note: '',
});

const SensitiveGate = ({ children }) => (canViewSensitive() ? <>{children}</> : (
  <NoticeBar tone='warning' icon='lock'>
    ผลประเมินพัฒนาการและสุขภาพจิตเป็นข้อมูลอ่อนไหวตามข้อกำหนดข้อมูลลับ (§1.4.2) —
    บัญชีของคุณไม่มีสิทธิดูหรือบันทึกส่วนนี้ กรุณาติดต่อผู้ดูแลระบบเพื่อขอสิทธิ
  </NoticeBar>
));

export const SchoolHealthDevelopmentTab = ({ student, canWrite, onChanged }) => {
  const [form, setForm] = useState(emptyDev());
  const [errors, setErrors] = useState([]);
  const [cancelTarget, setCancelTarget] = useState(null);
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));
  const records = getStudentServices(student.id, 'development');

  const save = () => {
    const errs = [];
    if (!form.date) errs.push('กรุณาระบุวันที่ประเมิน');
    else if (form.date > todayIso()) errs.push('วันที่ประเมินต้องไม่เป็นวันในอนาคต');
    if (!form.result) errs.push('กรุณาเลือกผลการประเมิน');
    if (form.result !== 'normal' && !String(form.note || '').trim()) {
      errs.push('ผลไม่สมวัย — ต้องบันทึกแนวทางการดูแล/การติดตามก่อนบันทึก');
    }
    if (errs.length > 0) { setErrors(errs); return; }
    saveServiceRecord({ ...form, studentId: student.id, type: 'development', status: 'saved' });
    setForm(emptyDev());
    setErrors([]);
    onChanged('บันทึกผลประเมินพัฒนาการเรียบร้อย');
  };

  const historyColumns = [
    { key: 'date', label: 'วันที่ประเมิน', render: (r) => formatShDate(r.date) },
    { key: 'tool', label: 'เครื่องมือที่ใช้', flex: true, minWidth: 300 },
    {
      key: 'result',
      label: 'ผลการประเมิน',
      render: (r) => {
        const o = resolveOption(DEV_RESULTS, r.result);
        return o ? <ColorfulBadge style={o.style} size='small' hierarchy='secondary'>{o.label}</ColorfulBadge> : '—';
      },
    },
    { key: 'note', label: 'แนวทางการดูแล', flex: true, minWidth: 300, sortable: false, render: (r) => r.note || '—' },
    auditColumn,
    { key: 'status', label: 'สถานะ', render: statusBadge },
    {
      key: 'actions',
      label: 'การดำเนินการ',
      sortable: false,
      render: (r) => (
        <RecordActions
          row={r}
          canWrite={canWrite}
          onEdit={(row) => setForm({ ...emptyDev(), ...row })}
          onCancel={setCancelTarget}
          onReactivate={(row) => { reactivateServiceRecord(row.id); onChanged('เปิดใช้งานรายการอีกครั้งแล้ว'); }}
        />
      ),
    },
  ];

  return (
    <SensitiveGate>
      <CancelRecordPopup
        target={cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={(reason) => { cancelServiceRecord(cancelTarget.id, reason); setCancelTarget(null); onChanged('ยกเลิกรายการบันทึกแล้ว'); }}
      />
      <TabScaffold
        icon='child_care'
        title='ประเมินพัฒนาการวัยเรียน'
        subtitle='ข้อมูลอ่อนไหว (§1.4.2) — แสดงเฉพาะผู้มีสิทธิ · ผลไม่สมวัยต้องบันทึกแนวทางการดูแลเสมอ'
        canWrite={canWrite}
        errors={errors}
        historyTitle='ประวัติการประเมินพัฒนาการ'
        historyBody={records.length === 0 ? (
          <EmptyState icon='child_care' title='ยังไม่มีผลการประเมินพัฒนาการ' subtitle='บันทึกผลการคัดกรองครั้งแรกจากฟอร์มด้านบน' />
        ) : (
          <Table columns={historyColumns} rows={records} rowKey={(r) => r.id} stickyColCount={1} stickyRightColCount={1} emptyMessage='ไม่มีประวัติ' />
        )}
        footer={(
          <FormFooter
            canWrite={canWrite}
            isEditing={!!form.id}
            onCancel={() => { setForm(emptyDev()); setErrors([]); }}
            onDraft={() => { saveDraft(student.id, 'development', form); onChanged('บันทึกร่างแล้ว'); }}
            onSave={save}
          />
        )}
      >
        <FieldRow>
          <Field label='วันที่ประเมิน' required flex='0 0 var(--dim-size-2450, 280px)' minWidth={200}>
            <DatePicker showLabel={false} showHelperText={false} value={form.date ? new Date(form.date) : null} onChange={(d) => set('date')(d ? toIso(d) : '')} placeholder='เลือกวันที่' />
          </Field>
          <Field label='เครื่องมือที่ใช้' flex='2 1 0' minWidth={280}>
            <InputField showLabel={false} showHelperText={false} showLeadingIcon={false} disabled={!canWrite} value={form.tool} onChange={set('tool')} placeholder='ระบุแบบคัดกรองที่ใช้' />
          </Field>
          <Field label='ผลการประเมิน' required minWidth={220}>
            <Select showLabel={false} searchable={false} size='lg' disabled={!canWrite} value={form.result} onChange={set('result')} options={DEV_RESULTS} placeholder='เลือกผล' />
          </Field>
        </FieldRow>
        <Field label='แนวทางการดูแล / การติดตาม' required={form.result !== 'normal'} flex='1 1 100%' minWidth={280}>
          <SuggestibleTextarea
            voice
            disabled={!canWrite}
            value={form.note}
            onChange={(e) => set('note')(e.target.value)}
            suggestions={DEV_NOTE_SUGGESTIONS}
            minChars={3}
            placeholder='เช่น แจ้งครูประจำชั้นและผู้ปกครอง · นัดประเมินซ้ำใน 3 เดือน'
          />
        </Field>
      </TabScaffold>
    </SensitiveGate>
  );
};

/* ═══════════════════ 6) แท็บสุขภาพจิต ═══════════════════ */

const emptyMental = () => ({
  id: '',
  type: 'mental',
  date: todayIso(),
  academicYear: CURRENT_ACADEMIC_YEAR,
  term: CURRENT_TERM,
  tool: 'SDQ ฉบับนักเรียนประเมินตนเอง + 2Q',
  score: '',
  result: '',
  note: '',
});

export const SchoolHealthMentalTab = ({ student, canWrite, onChanged }) => {
  const [form, setForm] = useState(emptyMental());
  const [errors, setErrors] = useState([]);
  const [cancelTarget, setCancelTarget] = useState(null);
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));
  const records = getStudentServices(student.id, 'mental');

  const save = () => {
    const errs = [];
    if (!form.date) errs.push('กรุณาระบุวันที่ประเมิน');
    else if (form.date > todayIso()) errs.push('วันที่ประเมินต้องไม่เป็นวันในอนาคต');
    if (form.score === '' || Number(form.score) < 0) errs.push('กรุณาระบุคะแนนรวมของแบบประเมิน (ไม่ติดลบ)');
    if (!form.result) errs.push('กรุณาเลือกผลการประเมิน');
    if (form.result !== 'normal' && !String(form.note || '').trim()) {
      errs.push('ผลมีความเสี่ยง/มีปัญหา — ต้องบันทึกแนวทางการช่วยเหลือหรือการส่งต่อก่อนบันทึก');
    }
    if (errs.length > 0) { setErrors(errs); return; }
    saveServiceRecord({ ...form, studentId: student.id, type: 'mental', score: Number(form.score), status: 'saved' });
    setForm(emptyMental());
    setErrors([]);
    onChanged('บันทึกผลประเมินสุขภาพจิตเรียบร้อย');
  };

  const historyColumns = [
    { key: 'date', label: 'วันที่ประเมิน', render: (r) => formatShDate(r.date) },
    { key: 'tool', label: 'แบบประเมิน', flex: true, minWidth: 280 },
    { key: 'score', label: 'คะแนนรวม', align: 'center' },
    {
      key: 'result',
      label: 'ผลการประเมิน',
      render: (r) => {
        const o = resolveOption(MENTAL_RESULTS, r.result);
        return o ? <ColorfulBadge style={o.style} size='small' hierarchy='secondary'>{o.label}</ColorfulBadge> : '—';
      },
    },
    { key: 'note', label: 'แนวทางการช่วยเหลือ', flex: true, minWidth: 300, sortable: false, render: (r) => r.note || '—' },
    auditColumn,
    { key: 'status', label: 'สถานะ', render: statusBadge },
    {
      key: 'actions',
      label: 'การดำเนินการ',
      sortable: false,
      render: (r) => (
        <RecordActions
          row={r}
          canWrite={canWrite}
          onEdit={(row) => setForm({ ...emptyMental(), ...row, score: String(row.score ?? '') })}
          onCancel={setCancelTarget}
          onReactivate={(row) => { reactivateServiceRecord(row.id); onChanged('เปิดใช้งานรายการอีกครั้งแล้ว'); }}
        />
      ),
    },
  ];

  return (
    <SensitiveGate>
      <CancelRecordPopup
        target={cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={(reason) => { cancelServiceRecord(cancelTarget.id, reason); setCancelTarget(null); onChanged('ยกเลิกรายการบันทึกแล้ว'); }}
      />
      <TabScaffold
        icon='psychology'
        title='คัดกรองสุขภาพจิตนักเรียน'
        subtitle='ข้อมูลอ่อนไหว (§1.4.2) — แสดงเฉพาะผู้มีสิทธิ · ผลที่มีความเสี่ยงต้องบันทึกแนวทางช่วยเหลือหรือการส่งต่อ'
        canWrite={canWrite}
        errors={errors}
        historyTitle='ประวัติการคัดกรองสุขภาพจิต'
        historyBody={records.length === 0 ? (
          <EmptyState icon='psychology' title='ยังไม่มีผลการคัดกรองสุขภาพจิต' subtitle='บันทึกผลแบบประเมินครั้งแรกจากฟอร์มด้านบน' />
        ) : (
          <Table columns={historyColumns} rows={records} rowKey={(r) => r.id} stickyColCount={1} stickyRightColCount={1} emptyMessage='ไม่มีประวัติ' />
        )}
        footer={(
          <FormFooter
            canWrite={canWrite}
            isEditing={!!form.id}
            onCancel={() => { setForm(emptyMental()); setErrors([]); }}
            onDraft={() => { saveDraft(student.id, 'mental', form); onChanged('บันทึกร่างแล้ว'); }}
            onSave={save}
          />
        )}
      >
        <FieldRow>
          <Field label='วันที่ประเมิน' required flex='0 0 var(--dim-size-2450, 280px)' minWidth={200}>
            <DatePicker showLabel={false} showHelperText={false} value={form.date ? new Date(form.date) : null} onChange={(d) => set('date')(d ? toIso(d) : '')} placeholder='เลือกวันที่' />
          </Field>
          <Field label='แบบประเมินที่ใช้' flex='2 1 0' minWidth={280}>
            <InputField showLabel={false} showHelperText={false} showLeadingIcon={false} disabled={!canWrite} value={form.tool} onChange={set('tool')} placeholder='เช่น SDQ ฉบับนักเรียนประเมินตนเอง' />
          </Field>
          <Field label='คะแนนรวม' required flex='0 0 var(--dim-size-2100, 160px)' minWidth={140}>
            <InputField showLabel={false} showHelperText={false} showLeadingIcon={false} type='number' disabled={!canWrite} value={form.score} onChange={set('score')} placeholder='0' />
          </Field>
          <Field label='ผลการประเมิน' required minWidth={220}>
            <Select showLabel={false} searchable={false} size='lg' disabled={!canWrite} value={form.result} onChange={set('result')} options={MENTAL_RESULTS} placeholder='เลือกผล' />
          </Field>
        </FieldRow>
        <Field label='แนวทางการช่วยเหลือ / การส่งต่อ' required={form.result !== 'normal'} flex='1 1 100%' minWidth={280}>
          <SuggestibleTextarea
            voice
            disabled={!canWrite}
            value={form.note}
            onChange={(e) => set('note')(e.target.value)}
            suggestions={MH_NOTE_SUGGESTIONS}
            minChars={3}
            placeholder='เช่น ให้คำปรึกษาเบื้องต้น · ประสานครูแนะแนว · ส่งต่อคลินิกสุขภาพจิต'
          />
        </Field>
      </TabScaffold>
    </SensitiveGate>
  );
};

export const SCHOOL_HEALTH_TABS = [
  { key: 'checkup', label: 'ตรวจสุขภาพ', icon: 'stethoscope', Component: SchoolHealthCheckupTab },
  { key: 'dental', label: 'ทันตกรรม', icon: 'dentistry', Component: SchoolHealthDentalTab },
  { key: 'vaccineHistory', label: 'ประวัติวัคซีน', icon: 'vaccines', Component: SchoolHealthVaccineHistoryTab },
  { key: 'vaccineGive', label: 'ให้บริการวัคซีน', icon: 'syringe', Component: SchoolHealthVaccineGiveTab },
  { key: 'development', label: 'ประเมินพัฒนาการ', icon: 'child_care', Component: SchoolHealthDevelopmentTab },
  { key: 'mental', label: 'สุขภาพจิต', icon: 'psychology', Component: SchoolHealthMentalTab },
];

export default SCHOOL_HEALTH_TABS;
