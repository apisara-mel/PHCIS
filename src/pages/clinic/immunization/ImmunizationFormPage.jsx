import React, { useMemo, useRef, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import PatientCard from '@/components/card/PatientCard';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import Popup from '@/components/popup/Popup';
import Icon from '@/components/icons/Icon';
import Table from '@/components/table/Table';
import { ClinicFilterProvider } from '@/components/layout/HeaderClinicContext';
import TreatmentFormShell from '@/templates/TreatmentFormShell';
import CarriedDentalPanel from '@/components/dental/CarriedDentalPanel';
import {
  ImmStep1General,
  ImmStep2BirthNutrition,
  ImmStep3Growth,
  ImmStep4Development,
  ImmStep5Vaccine,
  ImmStep6GeneralExam,
  ImmStepDiagnosis,
  ImmGrowthCharts,
  ImmStep7Orders,
  ImmStep8Summary,
} from '@/pages/clinic/immunization/ImmunizationSteps';
import {
  NUTRITION_STATUS_OPTIONS,
  DEFAULT_IMM_VISIT,
  getImmChild,
  getImmPatientCard,
  getImmIntake,
  getImmRegistrationByHn,
  getImmQueueRows,
  getImmDraft,
  saveImmDraft,
  clearImmDraft,
  saveImmVisitRecord,
  getImmVisitRecords,
  getImmCompletedSteps,
  summarizeEpi,
  hasImmunizationRights,
  setImmunizationRights,
  formatImmDateTime,
} from '@/data/immunizationClinic';

/* ImmunizationFormPage — ใบบันทึกสุขภาพเด็กดี (TOR 1.10.9 + IIS 1.11).
   โครง 5 ขั้นใช้ chrome เดียวกับ ANC: แบบประเมิน → ตรวจร่างกายและวินิจฉัย
   → สั่งการรักษา → นัดหมาย → สมุดวัคซีน. เนื้อหา domain เดิมยังใช้ต่อเพื่อ
   เก็บ lot/dose/audit และ session-storage contract เดิมไว้ครบถ้วน. */

const breadcrumb = ['บันทึกการรักษา', 'งานสร้างเสริมภูมิคุ้มกัน', 'บันทึกสุขภาพเด็กดี'];
const QUEUE_PATH = '/clinic/immunization';

const IMM_STEPS = [
  { title: 'แบบประเมิน', subtitle: 'Assessment' },
  { title: 'ตรวจร่างกายและวินิจฉัย', subtitle: 'Examination & Diagnosis' },
  { title: 'สั่งการรักษา', subtitle: 'Treatment Order' },
  { title: 'นัดหมาย', subtitle: 'Appointment' },
  { title: 'สมุดวัคซีน', subtitle: 'Vaccine Book' },
];

/* ย้ายเฉพาะโครง ไม่คัดลอกเนื้อหาฝากครรภ์: component เก่าถูกจัดกลุ่มใหม่ตาม
   TOR ของคลินิกเด็กดี เพื่อคง validation ของวัคซีน/lot และข้อมูลที่บันทึกไว้. */
/* ขั้นแรกใช้ตารางเดียวกับ ANC: เห็นว่ายังขาดแบบใดก่อน แล้วเปิดทำทีละชุด
   แทนการกางฟอร์มทุกชุดยาวต่อกันในหน้าหลัก. */
const ImmStepAssessment = (props) => {
  const [openTool, setOpenTool] = useState(null);
  const { form, immHn, child, registration } = props;
  const epi = summarizeEpi(immHn);
  const dspmAnswered = Object.keys(form.dspmAnswers || {}).length;
  const birthRecorded = Boolean(
    form.gestationalAgeWeeks || form.deliveryType || form.birthWeight || form.maternalBloodRh,
  );

  const tools = [
    {
      key: 'general', title: 'ข้อมูลทั่วไปและการซักประวัติ', code: 'ทะเบียนผู้รับบริการ · Nurse intake',
      score: registration ? 'ลงทะเบียนแล้ว' : 'ยังไม่มีทะเบียน',
      done: Boolean(form.nurseNote), status: form.nurseNote ? 'บันทึกแล้ว' : 'ยังไม่ได้ประเมิน',
      tone: form.nurseNote ? 'green' : 'grey',
    },
    {
      key: 'birth', title: 'ประวัติมารดา การคลอด และโภชนาการ', code: 'Maternal / Birth / Nutrition',
      score: birthRecorded ? 'บันทึกแล้ว' : '—',
      done: birthRecorded, status: birthRecorded ? 'บันทึกแล้ว' : 'ยังไม่ได้ประเมิน',
      tone: birthRecorded ? 'green' : 'grey',
    },
    {
      key: 'dspm', title: 'ประเมินพัฒนาการเด็ก', code: 'DSPM ตามช่วงอายุ',
      score: dspmAnswered ? `${dspmAnswered} ข้อ` : '—',
      done: dspmAnswered > 0, status: dspmAnswered ? 'อยู่ระหว่าง/ประเมินแล้ว' : 'ยังไม่ได้ประเมิน',
      tone: dspmAnswered ? 'teal' : 'grey',
    },
    {
      key: 'epi', title: 'ประเมินความครบถ้วนของวัคซีน', code: 'EPI schedule',
      score: epi.label, done: epi.complete, status: epi.complete ? 'ครบตามเกณฑ์' : 'มีรายการต้องติดตาม',
      tone: epi.style,
    },
  ];

  const activeTool = tools.find((tool) => tool.key === openTool);
  const ToolContent = openTool === 'general'
    ? ImmStep1General
    : openTool === 'birth'
      ? ImmStep2BirthNutrition
      : openTool === 'dspm'
        ? ImmStep4Development
        : ImmStep5Vaccine;

  return (
    <section className='flex flex-col' style={{ gap: 'var(--dim-space-600, 24px)' }}>
      <div className='flex items-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
        <Icon name='assignment' size={20} color='var(--text-brandPrimary-default, #007549)' />
        <h2 style={{ color: 'var(--text-brandPrimary-default, #007549)', fontSize: 'var(--type-size-base)', fontWeight: 'var(--type-weight-bold)' }}>แบบประเมิน</h2>
      </div>
      <Table
        columns={[
          {
            key: 'tool', label: 'หัวข้อแบบประเมิน', flex: true, minWidth: 260,
            render: (tool) => (
              <span className='flex flex-col' style={{ gap: 'var(--dim-space-50, 2px)' }}>
                <span style={{ color: 'var(--text-content-default, #363B3F)' }}>{tool.title}</span>
                <span style={{ color: 'var(--text-content-tertiary, #858C92)', fontSize: 'var(--type-size-xs)' }}>{tool.code}</span>
              </span>
            ),
          },
          { key: 'score', label: 'คะแนนประเมิน', minWidth: 140, render: (tool) => <span style={{ color: 'var(--text-brandPrimary-default, #007549)' }}>{tool.score}</span> },
          { key: 'status', label: 'สถานะการประเมิน', minWidth: 220, render: (tool) => <ColorfulBadge style={tool.tone} size='small' hierarchy='secondary'>{tool.status}</ColorfulBadge> },
          {
            key: 'action', label: 'ดำเนินการ', minWidth: 180,
            render: (tool) => (
              <BrandSubdueButton variant='outline' size='sm' leadingIcon={tool.done ? 'edit' : 'assignment'} onClick={() => setOpenTool(tool.key)}>
                {tool.done ? 'แก้ไข' : 'ทำแบบประเมิน'}
              </BrandSubdueButton>
            ),
          },
        ]}
        rows={tools}
        rowKey={(tool) => tool.key}
      />
      <Popup
        open={Boolean(openTool)}
        onClose={() => setOpenTool(null)}
        size='extraLarge'
        title={activeTool?.title || 'แบบประเมิน'}
        primaryAction={{ label: 'เสร็จสิ้น', onClick: () => setOpenTool(null) }}
      >
        <div style={{ padding: 'var(--dim-space-600, 24px)' }}>
          {openTool ? <ToolContent {...props} /> : null}
        </div>
      </Popup>
    </section>
  );
};

/* ขั้น "ตรวจร่างกายและวินิจฉัย" ใช้ layout เดียวกับฝากครรภ์ (มติผู้ใช้ 3 ก.ย. 69):
   การ์ดซ้าย = ตรวจร่างกาย (การเจริญเติบโต + ตรวจสุขภาพทั่วไป) · การ์ดขวา =
   วินิจฉัย · แผงผลตรวจทันตกรรมเป็นการ์ดเต็มความกว้างอยู่ใต้ทั้งสอง */
const SPLIT_CARD_STYLE = {
  flex: '1 1 0',
  gap: 'var(--dim-space-500, 20px)',
  padding: 'var(--dim-space-600, 24px)',
  borderRadius: 'var(--dim-radius-500)',
  background: 'var(--surface-card-100)',
  boxShadow: 'var(--shadow-brand-drop-bottom-200)',
};

const SplitCardTitle = ({ children }) => (
  <h2
    style={{
      fontFamily: 'var(--type-family-heading-content)',
      fontSize: 'var(--type-size-base)',
      fontWeight: 'var(--type-weight-bold)',
      color: 'var(--text-brandPrimary-default, #007549)',
      lineHeight: 1.5,
    }}
  >
    {children}
  </h2>
);

const ImmStepExamDiagnosis = (props) => (
  <div className='flex w-full flex-col min-w-0' style={{ gap: 'var(--dim-space-400)' }}>
    <div
      className='flex w-full flex-col xl:flex-row items-stretch min-w-0'
      style={{ gap: 'var(--dim-space-400)' }}
    >
      <div className='flex flex-col min-w-0 w-full xl:w-auto' style={SPLIT_CARD_STYLE}>
        <SplitCardTitle>ตรวจร่างกาย</SplitCardTitle>
        <ImmStep3Growth {...props} />
        <ImmStep6GeneralExam {...props} showDentalPanel={false} />
      </div>
      <div className='flex flex-col min-w-0 w-full xl:w-auto' style={SPLIT_CARD_STYLE}>
        <SplitCardTitle>วินิจฉัย</SplitCardTitle>
        <ImmStepDiagnosis {...props} />
      </div>
    </div>

    <div className='flex flex-col w-full min-w-0' style={{ ...SPLIT_CARD_STYLE, flex: '0 0 auto' }}>
      <CarriedDentalPanel
        hn={props.immHn}
        patientName={props.child?.fullName || props.child?.shortName}
        from='wbc'
        readOnly={props.locked}
        title='ผลการตรวจทันตกรรม (จากคลินิกทันตกรรม)'
        bordered={false}
        badgeNextToTitle
        showAskButton={false}
      />
    </div>
  </div>
);

const ImmStepTreatmentOrder = (props) => (
  <>
    <ImmStep5Vaccine {...props} />
    <ImmStep7Orders {...props} />
  </>
);

const ImmStepAppointment = (props) => (
  <ImmStep8Summary
    {...props}
    showDocuments={false}
    showSummary={false}
    showPrint={false}
    showConfirm={false}
  />
);

const ImmStepVaccineBook = (props) => (
  <ImmStep8Summary
    {...props}
    showAppointment={false}
  />
);

const STEP_RENDERERS = [
  ImmStepAssessment,
  ImmStepExamDiagnosis,
  ImmStepTreatmentOrder,
  ImmStepAppointment,
  ImmStepVaccineBook,
];

const cloneDefaultVisit = () => JSON.parse(JSON.stringify(DEFAULT_IMM_VISIT));
const clampStepIndex = (value) => Math.max(0, Math.min(IMM_STEPS.length - 1, Number(value) || 0));

/* แถบอ้างอิงใต้ stepper แบบ ANC: ค่าใน intake อ่านอย่างเดียว ส่วนช่องกรอกจริง
   อยู่ในขั้นตรวจร่างกายเพียงจุดเดียว จึงไม่เกิดข้อมูลสองชุด. */
const ImmVitalsTextRow = ({ form, intake, immHn, child }) => {
  const vitals = intake?.vitals || {};
  const [chartOpen, setChartOpen] = useState(false);
  /* โภชนาการมาจากหน้าคัดกรอง (แบบประเมินประวัติมารดา/โภชนาการ) */
  const nutrition = NUTRITION_STATUS_OPTIONS.find((o) => o.value === (form.nutritionStatus || intake?.nutritionStatus))?.label;
  const items = [
    ['อุณหภูมิ', vitals.temp ? `${vitals.temp} °C` : '—'],
    ['ชีพจร', vitals.hr ? `${vitals.hr} ครั้ง/นาที` : '—'],
    ['การหายใจ', vitals.rr ? `${vitals.rr} ครั้ง/นาที` : '—'],
    ['SpO₂', vitals.spo2 ? `${vitals.spo2} %` : '—'],
    ['น้ำหนัก', form.growth?.weight ? `${form.growth.weight} กก.` : (vitals.weight ? `${vitals.weight} กก.` : '—')],
    ['ส่วนสูง', form.growth?.height ? `${form.growth.height} ซม.` : (vitals.height ? `${vitals.height} ซม.` : '—')],
    ['เส้นรอบศีรษะ', form.growth?.headCirc ? `${form.growth.headCirc} ซม.` : (vitals.headCirc ? `${vitals.headCirc} ซม.` : '—')],
    ['โภชนาการ', nutrition || '—'],
  ];

  return (
    <div
      className='flex items-center w-full flex-wrap'
      style={{
        position: 'sticky',
        top: 'var(--mih-record-band-bottom, 0px)',
        /* อยู่เหนือ table header ของเนื้อหาเสมอ แต่ต่ำกว่า morph stepper
           (1085 < 1090) เพื่อให้แถบ vital signs ไม่ถูกหัวตารางทับตอนเลื่อน */
        zIndex: 1085,
        gap: 'var(--dim-space-400, 16px)',
        padding: 'var(--dim-space-300, 12px) var(--dim-space-600, 24px)',
        background: 'var(--surface-card-100, #FFFFFF)',
        boxShadow: 'var(--shadow-brand-drop-bottom-200)',
        fontSize: 'var(--type-size-xs)',
      }}
    >
      {items.map(([label, value]) => (
        <span key={label} className='flex items-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          <span style={{ color: 'var(--text-content-tertiary, #858C92)' }}>{label}</span>
          <span style={{ color: 'var(--text-content-default, #363B3F)', fontWeight: 'var(--type-weight-medium)' }}>{value}</span>
        </span>
      ))}
      <div className='flex-1' />
      <BrandSubdueButton variant='outline' size='sm' leadingIcon='show_chart' onClick={() => setChartOpen(true)}>
        ดูการเจริญเติบโต
      </BrandSubdueButton>
      <Popup
        open={chartOpen}
        onClose={() => setChartOpen(false)}
        title='การเจริญเติบโต'
        subtitle={child ? `${child.fullName} · HN ${immHn}` : ''}
        size='extraLarge'
        height='auto'
        primaryAction={{ label: 'ปิด', onClick: () => setChartOpen(false) }}
      >
        <div style={{ padding: 'var(--dim-space-600, 24px)' }}>
          <ImmGrowthCharts form={form} immHn={immHn} child={child} showTitle={false} chartHeight={480} legendAlign='center' showHistory />
        </div>
      </Popup>
    </div>
  );
};

const ImmunizationFormPage = () => {
  const history = useHistory();
  const { state: navState } = useLocation();

  const immHn = navState?.hn || getImmChild('69-10001')?.hn;
  const child = useMemo(() => getImmChild(immHn), [immHn]);
  const cardPatient = useMemo(() => getImmPatientCard(immHn), [immHn]);
  const intake = useMemo(() => getImmIntake(immHn), [immHn]);
  const registration = useMemo(() => getImmRegistrationByHn(immHn), [immHn]);
  const queueRow = useMemo(() => getImmQueueRows().find((r) => r.hn === immHn) || null, [immHn]);
  const epi = useMemo(() => summarizeEpi(immHn), [immHn]);

  const initial = useMemo(() => {
    const draft = getImmDraft(immHn);
    if (draft) {
      return { mode: 'draft', form: { ...cloneDefaultVisit(), ...draft.form }, stepIndex: clampStepIndex(draft.stepIndex), draftSavedAt: draft.savedAt };
    }
    const visits = getImmVisitRecords(immHn);
    const last = visits[visits.length - 1];
    if (last && (navState?.statusKey === 'done' || queueRow?.statusKey === 'done')) {
      return { mode: 'view', form: { ...cloneDefaultVisit(), ...last }, stepIndex: 0, lastVisit: last };
    }
    if (queueRow?.statusKey === 'draft') {
      return { mode: 'draft', form: cloneDefaultVisit(), stepIndex: clampStepIndex(queueRow.draftStep) };
    }
    return { mode: 'new', form: cloneDefaultVisit(), stepIndex: 0 };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [immHn]);

  const [mode, setMode] = useState(initial.mode); /* 'new' | 'draft' | 'view' | 'edit' */
  const [stepIndex, setStepIndex] = useState(initial.stepIndex);
  const [form, setFormState] = useState(initial.form);
  const [saved, setSaved] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [resumeBanner, setResumeBanner] = useState(initial.mode === 'draft');
  const [, setRightsTick] = useState(0);

  const seedJson = useRef(JSON.stringify(initial.form));
  const canWrite = hasImmunizationRights();
  const locked = mode === 'view' || saved || !canWrite;
  const dirty = !saved && JSON.stringify(form) !== seedJson.current;

  const setForm = (updater) => {
    setFormState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (!locked) saveImmDraft(immHn, next, stepIndex);
      return next;
    });
  };

  const handleStepChange = (idx) => {
    setStepIndex(idx);
    if (!locked && dirty) saveImmDraft(immHn, form, idx);
  };

  const confirmSave = () => {
    /* เก็บ record ที่ได้กลับเข้า state — พก visitId/doseId/appointmentId ไว้
       ให้การกด "แก้ไขบันทึก" รอบถัดไป update ของเดิมแทนสร้างซ้ำ */
    const record = saveImmVisitRecord(immHn, form);
    clearImmDraft(immHn);
    setFormState(record);
    seedJson.current = JSON.stringify(record);
    setSaved(true);
  };

  const handleBack = () => {
    if (dirty && !locked) { setLeaveOpen(true); return; }
    history.push(QUEUE_PATH);
  };

  const leaveKeepDraft = () => {
    saveImmDraft(immHn, form, stepIndex);
    setLeaveOpen(false);
    history.push(QUEUE_PATH);
  };

  const leaveDiscard = () => {
    clearImmDraft(immHn);
    setLeaveOpen(false);
    history.push(QUEUE_PATH);
  };

  const startEdit = () => {
    setMode('edit');
    setSaved(false);
    setResumeBanner(false);
  };

  const ActiveStep = STEP_RENDERERS[stepIndex];
  const completedSteps = useMemo(() => {
    const completed = getImmCompletedSteps(form, stepIndex);
    return [
      completed.includes(0) || completed.includes(1) || completed.includes(3),
      completed.includes(2) || completed.includes(5),
      completed.includes(4) || completed.includes(6),
      completed.includes(7),
      saved || completed.includes(7),
    ];
  }, [form, stepIndex, saved]);

  const bannerBase = {
    gap: 'var(--dim-space-300, 12px)',
    marginLeft: 'var(--dim-space-600, 24px)',
    marginRight: 'var(--dim-space-600, 24px)',
    marginTop: 'var(--dim-space-400, 16px)',
    paddingTop: 'var(--dim-space-300, 12px)',
    paddingBottom: 'var(--dim-space-300, 12px)',
    paddingLeft: 'var(--dim-space-400, 16px)',
    paddingRight: 'var(--dim-space-400, 16px)',
    borderRadius: 'var(--dim-radius-200, 8px)',
    fontSize: 'var(--type-size-sm)',
  };

  return (
    <ClinicFilterProvider>
      <div className='flex w-full min-h-screen' style={{ background: 'var(--background-screen-brand-100, #F4FBF8)' }}>
        <Sidebar activeKey='treat' />
        <div className='flex-1 min-w-0 flex flex-col'>
          <Header breadcrumb={breadcrumb} standalone={false} />
          <Popup
            open={leaveOpen}
            onClose={() => setLeaveOpen(false)}
            title='ยังไม่ได้บันทึกการตรวจ'
            subtitle={`${child?.fullName || ''} · HN: ${immHn}${navState?.queue ? ` · คิว ${navState.queue}` : ''}`}
            tertiaryAction={{ label: 'ละทิ้งร่างและออก', onClick: leaveDiscard }}
            primaryAction={{ label: 'บันทึกร่างและออก', onClick: leaveKeepDraft }}
          >
            <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary, #636B72)' }}>
              มีข้อมูลที่ยังไม่ได้บันทึกในใบบันทึกสุขภาพเด็กดี — บันทึกเป็นร่างไว้ทำต่อ
              (แสดงในแท็บ &quot;ที่ร่างไว้&quot; ของหน้าคิว) หรือละทิ้งการเปลี่ยนแปลงทั้งหมด
            </span>
          </Popup>

          <PatientCard
            sticky
            showBack={false}
            patient={cardPatient}
            alertGroupsLeft
            alertExpandable
            title='บันทึกสุขภาพเด็กดี'
            drugAllergies={intake.drugAllergies}
            chronicDiseases={intake.chronicDiseases}
            actions={(
              <div className='flex items-center' style={{ gap: 'var(--dim-space-300, 12px)' }}>
                <ColorfulBadge style={epi.style} size='small' hierarchy='secondary'>{`วัคซีน EPI: ${epi.label}`}</ColorfulBadge>
                {registration ? (
                  <ColorfulBadge style='teal' size='small' hierarchy='secondary'>{registration.epiNumber}</ColorfulBadge>
                ) : (
                  <ColorfulBadge style='grey' size='small' hierarchy='secondary'>ยังไม่มีทะเบียนสร้างเสริมภูมิคุ้มกัน</ColorfulBadge>
                )}
                <BrandSubdueButton
                  variant='outline'
                  size='sm'
                  leadingIcon='print'
                  onClick={() => history.push({ pathname: '/clinic/immunization/vaccine-book', state: { hn: immHn } })}
                >
                  พิมพ์สมุดวัคซีน
                </BrandSubdueButton>
                <NeutralSubdueButton
                  size='sm'
                  leadingIcon={canWrite ? 'lock_open' : 'lock'}
                  onClick={() => { setImmunizationRights(!hasImmunizationRights()); setRightsTick((t) => t + 1); }}
                  title='สลับสิทธิปฏิบัติงานคลินิกเด็กดี (สำหรับทดสอบ)'
                >
                  {canWrite ? 'สิทธิ: แก้ไขได้' : 'สิทธิ: อ่านอย่างเดียว'}
                </NeutralSubdueButton>
                {!locked && (
                  <NeutralSubdueButton
                    size='sm'
                    leadingIcon='block'
                    onClick={() => { if (dirty) setLeaveOpen(true); else history.push(QUEUE_PATH); }}
                  >
                    ยกเลิกการบันทึก
                  </NeutralSubdueButton>
                )}
              </div>
            )}
          />

          {!canWrite && (
            <div
              className='flex items-center'
              style={{ ...bannerBase, background: 'var(--surface-warning-quaternary, #FFF9F0)', color: 'var(--text-warning-default, #C2410C)' }}
            >
              <Icon name='lock' size={18} />
              <span>บัญชีของคุณไม่มีสิทธิปฏิบัติงานคลินิกสุขภาพเด็กดี — เปิดดูใบบันทึกได้อย่างเดียว</span>
            </div>
          )}

          {child?.rightsExpired && (
            <div
              className='flex items-center'
              style={{ ...bannerBase, background: 'var(--surface-warning-quaternary, #FFF9F0)', color: 'var(--text-warning-default, #C2410C)' }}
            >
              <Icon name='warning' size={18} />
              <span>
                สิทธิการรักษาของเด็กหมดอายุ ({child.insurance}) — ยังบันทึกการตรวจและให้วัคซีนได้
                แต่ช่องส่งเบิกจะไม่ถูกส่งจนกว่าจะต่อสิทธิ โปรดแจ้งผู้ปกครองติดต่องานสิทธิประโยชน์
              </span>
            </div>
          )}

          {resumeBanner && !saved && (
            <div
              className='flex items-center'
              style={{ ...bannerBase, background: 'var(--surface-brandPrimary-quaternary, #F4FBF8)', color: 'var(--text-brandPrimary-default, #007549)' }}
            >
              <Icon name='history' size={18} />
              <span>
                กลับมาทำต่อจากร่างที่บันทึกไว้{initial.draftSavedAt ? ` (${formatImmDateTime(initial.draftSavedAt)})` : ''} —
                เริ่มที่ขั้นตอนที่ {initial.stepIndex + 1}: {IMM_STEPS[initial.stepIndex].title}
              </span>
              <div className='flex-1' />
              <button
                type='button'
                onClick={() => setResumeBanner(false)}
                aria-label='ปิดการแจ้งเตือน'
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-brandPrimary-default, #007549)' }}
              >
                <Icon name='close' size={16} />
              </button>
            </div>
          )}

          {mode === 'view' && (
            <div
              className='flex items-center'
              style={{
                ...bannerBase,
                background: 'var(--surface-card-quaternary, #F9FBFB)',
                border: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary, #EEF0F1)',
                color: 'var(--text-content-secondary, #636B72)',
              }}
            >
              <Icon name='visibility' size={18} />
              <span>
                แสดงบันทึกการตรวจที่บันทึกแล้ว (อ่านอย่างเดียว)
                {initial.lastVisit ? ` · บันทึกโดย ${initial.lastVisit.savedBy} · ${formatImmDateTime(initial.lastVisit.savedAt)}` : ''}
              </span>
              <div className='flex-1' />
              {canWrite && (
                <BrandSubdueButton variant='outline' size='sm' leadingIcon='edit' onClick={startEdit}>
                  แก้ไขบันทึก
                </BrandSubdueButton>
              )}
            </div>
          )}

          {mode === 'edit' && !saved && (
            <div
              className='flex items-center'
              style={{ ...bannerBase, background: 'var(--surface-brandPrimary-quaternary, #F4FBF8)', color: 'var(--text-brandPrimary-default, #007549)' }}
            >
              <Icon name='edit' size={18} />
              <span>กำลังแก้ไขบันทึกที่บันทึกไว้แล้ว — การแก้ไขจะถูกบันทึกเป็นเวอร์ชันใหม่พร้อมผู้แก้ไขและเวลา</span>
            </div>
          )}

          {saved && (
            <div
              className='flex items-center'
              style={{ ...bannerBase, background: 'var(--surface-brandPrimary-quaternary, #F4FBF8)', color: 'var(--text-brandPrimary-default, #007549)' }}
            >
              <Icon name='check-circle' size={18} />
              <span>
                บันทึกการตรวจเรียบร้อยแล้ว — เข็มวัคซีนถูกเขียนลงสมุดวัคซีนของเด็กแล้ว
                กด &quot;จบการบันทึก&quot; ที่แถบด้านล่างเพื่อกลับหน้าคิว
              </span>
            </div>
          )}

          <TreatmentFormShell
            morphTitle='สุขภาพเด็กดี'
            hideMorphTitle
            stepIndex={stepIndex}
            onStepChange={handleStepChange}
            completedSteps={completedSteps}
            steps={IMM_STEPS}
            /* ขั้นตรวจร่างกายและวินิจฉัยวางการ์ดซ้าย/ขวาเอง — ไม่ให้ shell ห่อการ์ดซ้อน (ทรงเดียวกับฝากครรภ์) */
            plainBodySteps={[1]}
            queuePath={QUEUE_PATH}
            step0FlushLeft={false}
            onLeave={handleBack}
            belowBand={<ImmVitalsTextRow form={form} intake={intake} immHn={immHn} child={child} />}
            fromDepartment='คลินิกสุขภาพเด็กดี'
            onSaveDraft={() => { if (!locked) saveImmDraft(immHn, form, stepIndex); }}
            finishLabel='จบการบันทึก'
            hideCancelAfterFirst
          >
            <ActiveStep
              form={form}
              setForm={setForm}
              immHn={immHn}
              child={child}
              intake={intake}
              registration={registration}
              queueRow={queueRow}
              locked={locked}
              saved={saved}
              onConfirmSave={confirmSave}
            />
          </TreatmentFormShell>
          <Footer />
        </div>
      </div>
    </ClinicFilterProvider>
  );
};

export default ImmunizationFormPage;
