import React, { useEffect, useMemo, useState } from 'react';
import QueuePageShell, { QUEUE_STICKY_UNDER_TABS } from '@/templates/QueuePageShell';
import Table, { EllipsisText as TableEllipsisText } from '@/components/table/Table';
import Popup from '@/components/popup/Popup';
import Icon from '@/components/icons/Icon';
import StepProgress from '@/components/step/StepProgress';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import Checkbox from '@/components/checkbox/Checkbox';
import Textarea from '@/components/forms/Textarea';
import PrimarySearch from '@/components/search/PrimarySearch';
import SearchResultCount from '@/components/search/SearchResultCount';
import useSearchHistory from '@/components/search/useSearchHistory';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import QueueCallActions from '@/components/queue/QueueCallActions';
import SuccessToast from '@/components/toast/SuccessToast';
import MaskedWorklistName from '@/components/privacy/MaskedWorklistName';
import Select from '@/components/forms/Select';
import InputField from '@/components/forms/InputField';
import BrandButton from '@/components/button/BrandButton';
import { getPatientByHN } from '@/data/patientProfiles';
import { APPT_CLINIC_OPTIONS, APPT_DOCTOR_OPTIONS, APPT_TYPE_OPTIONS } from '@/data/treatmentVisits';
import { addExtraAppointments } from '@/pages/appointment/appointmentExtraStore';
import { findLatestTreatmentRecord } from '@/data/treatmentDraftStore';
import { LAB_TEST_BY_ID } from '@/data/labCatalog';
import { XRAY_EXAM_BY_ID } from '@/data/xrayCatalog';
import { TREATMENT_DOCTOR_OPTIONS, CERT_TYPE_CARDS, DIAGNOSIS_TYPE_OPTIONS } from '@/data/treatmentVisits';
import { ANY_DOCTOR_VALUE, APPT_STATUS_CONFIRMED } from '@/pages/appointment/appointmentShared';
import {
  EXIT_STATUS, EXIT_TASKS, getExitRows, subscribeExitQueue,
  taskProgress, toggleExitTask, closeExitVisit, reopenExitVisit, updateExitRow,
  toggleExitPause, cancelExitVisit,
  compareExitRows,
} from '@/data/exitNurseQueue';

/* MIH ExitNurseQueuePage — "Exist Nurse" (/exit)
   ══════════════════════════════════════════════════════════════════════════
   คู่ตรงข้ามของจุดคัดกรอง: คัดกรองรับคนเข้า Exist Nurse ส่งคนออก
   ชื่อเมนูใช้คำว่า "Exist Nurse" ตามที่ผู้ใช้กำหนด
   เดิมพอแพทย์กดจบการตรวจ ผู้รับบริการก็หายไปจากทุกจอ ทั้งที่ยังมีงานค้างกับเขา
   อีกหลายอย่าง งานพวกนั้นเคยอยู่ในความจำของพยาบาลล้วน ๆ (มติผู้ใช้ 28 ส.ค. 69)

   หน้านี้ทำสองอย่าง: บอกว่าใครยังรออยู่และรอมานานแค่ไหน กับบอกว่าคนคนนั้น
   เหลืออะไรต้องทำก่อนกลับ รายการงานเป็นของเฉพาะคน ไม่ใช่ checklist ชุดเดียว
   ใช้ทุกคน — คนที่ไม่ได้รับยาไม่ควรมีข้อ "อธิบายวิธีใช้ยา" ให้ติ๊ก */

const breadcrumb = ['Exist Nurse'];
const SUMMARY_TITLE = 'Exist Nurse';
const SEARCH_HISTORY_KEY = 'mih:primarysearch-history:exit-nurse';
/* รอนานเกินนี้ถือว่าผิดปกติ — 2 ชั่วโมง */
const LONG_WAIT_MINUTES = 120;

/* แท็บตามมติผู้ใช้ 29 ส.ค. 69 — "คิววันนี้" รวมรอส่งกลับกับกำลังส่งกลับเข้า
   ด้วยกัน เพราะสองสถานะนั้นคืองานที่ยังไม่จบเหมือนกัน แยกแท็บแล้วพยาบาลต้อง
   สลับไปมาเพื่อเห็นคิวทั้งหมดที่ยังค้าง ส่วนสถานะย่อยยังบอกได้ที่ป้ายในแถว */
const TABS = [
  { key: 'today', label: 'คิววันนี้',                  icon: 'hourglass_top' },
  { key: 'done',  label: 'ส่งต่อแล้ว',                 icon: 'check_circle' },
  { key: 'all',   label: 'รายชื่อผู้รับบริการทั้งหมด', icon: 'group' },
];

const PatientAvatar = ({ row }) => {
  const [imgError, setImgError] = useState(false);
  const src = row.avatarUrl || getPatientByHN(row.hn)?.avatarUrl;
  return (
    <div
      className='shrink-0 flex items-center justify-center text-white overflow-hidden'
      style={{
        width: 36,
        height: 36,
        borderRadius: '50%',
        background: 'var(--surface-neutral-tertiary, #9AA1A8)',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-sm)',
        fontWeight: 'var(--type-weight-medium)',
      }}
      aria-hidden
    >
      {src && !imgError ? (
        <img
          src={src}
          alt=''
          onError={() => setImgError(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (row.name || '?').trim().charAt(0)}
    </div>
  );
};

const RECORD_LABEL_STYLE = {
  color: 'var(--text-content-tertiary)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-xs)',
  lineHeight: 1.5,
};

const RECORD_VALUE_STYLE = {
  color: 'var(--text-content-default)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm)',
  lineHeight: 1.5,
  whiteSpace: 'pre-wrap',
  overflowWrap: 'anywhere',
};

const RecordRow = ({ label, value }) => (
  <div
    className='grid w-full items-start'
    style={{ gridTemplateColumns: '180px minmax(0, 1fr)', columnGap: 'var(--dim-space-300)' }}
  >
    <span style={RECORD_LABEL_STYLE}>{label}</span>
    <span style={{
      ...RECORD_VALUE_STYLE,
      color: String(value || '').trim() ? RECORD_VALUE_STYLE.color : 'var(--text-content-tertiary)',
    }}
    >
      {String(value || '').trim() || '—'}
    </span>
  </div>
);

const RecordCard = ({ icon, title, children }) => (
  <section
    className='flex flex-col w-full min-w-0'
    style={{
      gap: 'var(--dim-space-300)',
      padding: 'var(--dim-space-400)',
      borderRadius: 'var(--dim-radius-300)',
      border: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary)',
    }}
  >
    <div className='flex items-center' style={{ gap: 'var(--dim-space-200)' }}>
      <Icon name={icon} size={18} color='var(--icon-brandPrimary-default)' />
      <span style={{
        color: 'var(--text-content-default)',
        fontFamily: 'var(--type-family-heading-content)',
        fontSize: 'var(--type-size-sm)',
        fontWeight: 'var(--type-weight-bold)',
        lineHeight: 1.5,
      }}
      >
        {title}
      </span>
    </div>
    {children}
  </section>
);

const RecordList = ({ rows, empty }) => (
  rows.length === 0
    ? <span style={RECORD_LABEL_STYLE}>{empty}</span>
    : (
      <ul className='flex flex-col' style={{ gap: 'var(--dim-space-100)', margin: 0, paddingLeft: 'var(--dim-space-400)' }}>
        {rows.map((r, i) => (
          <li key={`${r}-${i}`} style={{ ...RECORD_VALUE_STYLE, listStyle: 'disc' }}>{r}</li>
        ))}
      </ul>
    )
);

/* สิ่งที่แพทย์กรอกไว้ใน visit นี้ แบบอ่านอย่างเดียว — Exist Nurse แก้ไม่ได้
   ถ้ายังไม่มีบันทึกในเซสชันนี้ ให้บอกตรง ๆ แล้วโชว์เท่าที่ตารางคิวรู้ ดีกว่า
   ป๊อปอัปเปล่าที่อ่านไม่ออกว่าแพทย์ยังไม่บันทึกหรือระบบพัง */
/* ขั้นตอนของป๊อปอัป "ข้อมูลจากแพทย์" — เรียงตามลำดับที่แพทย์กรอกจริงในหน้าตรวจรักษา
   (มติผู้ใช้ 31 ส.ค. 69) พยาบาลจึงอ่านเป็นเรื่องเดียวกับที่หมอเดิน ไม่ใช่กองข้อมูล
   ยาว ๆ ที่ต้องเลื่อนหา */
const RECORD_STEPS = [
  'ตรวจร่างกาย',
  'วินิจฉัย',
  'สั่งการรักษา',
  'SOAP Note',
  'นัดหมาย',
  'เอกสาร',
];

/* สิ่งที่แพทย์กรอกไว้ใน visit นี้ แบบอ่านอย่างเดียว — Exist Nurse แก้ไม่ได้
   ถ้ายังไม่มีบันทึกในเซสชันนี้ ให้บอกตรง ๆ แล้วโชว์เท่าที่ตารางคิวรู้ ดีกว่า
   ป๊อปอัปเปล่าที่อ่านไม่ออกว่าแพทย์ยังไม่บันทึกหรือระบบพัง */
const DoctorRecordView = ({ row, record, step, onStepChange }) => {
  const form = record?.form || null;
  const activeRows = (rows) => (rows || []).filter((r) => !r.cancelledAt);

  if (!form) {
    return (
      <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
        <RecordCard icon='info' title='ยังไม่มีบันทึกของแพทย์ในเซสชันนี้'>
          <span style={RECORD_LABEL_STYLE}>
            บันทึกการตรวจถูกเก็บไว้ต่อเซสชันของเบราว์เซอร์ — ถ้าแพทย์ตรวจจบจากเครื่องอื่น
            หรือเพิ่งรีเฟรชหน้า จะยังไม่มีให้อ่านที่นี่ · ข้อมูลเท่าที่คิวรู้อยู่ข้างล่าง
          </span>
        </RecordCard>
        <RecordCard icon='stethoscope' title='ข้อมูลจากคิว'>
          <RecordRow label='คลินิก' value={row.clinic} />
          <RecordRow label='แพทย์ผู้ตรวจ' value={row.doctor} />
          <RecordRow label='การวินิจฉัย' value={row.diagnosis} />
          <RecordRow label='ตรวจเสร็จเมื่อ' value={row.examDoneAt} />
        </RecordCard>
      </div>
    );
  }

  const exam = form.doctorExam || {};
  const soap = form.soap || {};
  const appt = form.appointment || {};
  const diagnoses = (form.diagnoses || []).map((d) => {
    const type = DIAGNOSIS_TYPE_OPTIONS.find((o) => o.value === d.type)?.labelTh || '';
    return `${d.code} — ${d.name}${type ? ` · ${type}` : ''}`;
  });
  const meds = activeRows(form.medications).map((m) =>
    [m.name, m.usage, m.quantity ? `${m.quantity} ${m.unit || ''}`.trim() : '', m.warning]
      .filter(Boolean).join(' · '));
  const labs = activeRows(form.labs).map((l) => {
    const test = LAB_TEST_BY_ID[l.testId];
    return [test?.nameTh || test?.nameEn || l.testId,
      l.urgency === 'stat' ? 'ด่วน (STAT)' : '',
      test?.fastingHours ? `งดอาหาร ${test.fastingHours} ชม.` : '']
      .filter(Boolean).join(' · ');
  });
  const xrays = activeRows(form.xrayOrders).map((x) => {
    const e = XRAY_EXAM_BY_ID[x.examId];
    return [e?.name || x.examId, x.view, x.urgency === 'stat' ? 'ด่วน (STAT)' : '']
      .filter(Boolean).join(' · ');
  });

  /* ขั้นที่ "มีของ" จริง — ใช้ติ๊กถูกบนแถบขั้นตอน พยาบาลจึงเห็นตั้งแต่แรกว่า
     ขั้นไหนแพทย์กรอกไว้บ้าง ไม่ต้องกดไล่ทีละขั้นเพื่อเจอหน้าว่าง */
  const filled = [
    ['cc', 'pi', 'pe', 'duration'].some((k) => String(exam[k] || '').trim()),
    diagnoses.length > 0 || !!String(form.diagnosisNote || '').trim(),
    meds.length + labs.length + xrays.length > 0,
    ['s', 'o', 'a', 'p'].some((k) => String(soap[k] || '').trim()),
    !!appt.mode,
    !!form.certIssue || !!String(form.patientAdvice || '').trim(),
  ];

  return (
    <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-500)' }}>
      <div className='flex w-full justify-center'>
        <StepProgress
          steps={RECORD_STEPS}
          current={step}
          completedSteps={filled}
          onStepClick={onStepChange}
          compact
        />
      </div>

      {step === 0 && (
        <RecordCard icon='stethoscope' title='บันทึกการตรวจร่างกาย'>
          <RecordRow label='อาการ (Chief Complaint)' value={exam.cc} />
          <RecordRow label='ประวัติการเจ็บป่วยปัจจุบัน' value={exam.pi} />
          <RecordRow label='ระยะเวลาที่มีอาการ' value={exam.duration} />
          <RecordRow label='ตรวจร่างกาย (Physical Examination)' value={exam.pe} />
        </RecordCard>
      )}

      {step === 1 && (
        <RecordCard icon='clinical_notes' title='วินิจฉัยและคำสั่งของแพทย์'>
          <RecordRow label='วินิจฉัยเบื้องต้น' value={form.diagnosisNote} />
          <RecordRow label='คำสั่งการรักษา' value={form.doctorOrderNote} />
          <RecordRow
            label='แพทย์ผู้สั่ง'
            value={TREATMENT_DOCTOR_OPTIONS.find((o) => o.value === form.orderingDoctor)?.label}
          />
          <RecordList rows={diagnoses} empty='ยังไม่มีรหัสการวินิจฉัย (ICD-10)' />
        </RecordCard>
      )}

      {/* Exist Nurse ต้องอธิบายวิธีใช้ยาและการเตรียมตัวก่อนตรวจ — สามหมวดนี้จึงเป็น
          หัวใจของป๊อปอัป ไม่ใช่ของแถม (มติผู้ใช้ 31 ส.ค. 69) */}
      {step === 2 && (
        <>
          <RecordCard icon='pill' title={`ยาที่สั่ง (${meds.length})`}>
            <RecordList rows={meds} empty='ไม่มีรายการยาที่สั่งใน visit นี้' />
          </RecordCard>
          <RecordCard icon='biotech' title={`ตรวจทางห้องปฏิบัติการ (${labs.length})`}>
            <RecordList rows={labs} empty='ไม่มีรายการแล็บที่สั่งใน visit นี้' />
          </RecordCard>
          <RecordCard icon='radiology' title={`ตรวจทางรังสี (${xrays.length})`}>
            <RecordList rows={xrays} empty='ไม่มีรายการตรวจทางรังสีที่สั่งใน visit นี้' />
          </RecordCard>
        </>
      )}

      {step === 3 && (
        <RecordCard icon='description' title='SOAP Note'>
          <RecordRow label='S — Subjective' value={soap.s} />
          <RecordRow label='O — Objective' value={soap.o} />
          <RecordRow label='A — Assessment' value={soap.a} />
          <RecordRow label='P — Plan' value={soap.p} />
        </RecordCard>
      )}

      {step === 4 && (
        <RecordCard icon='event' title='นัดหมายที่แพทย์ระบุ'>
          {appt.mode === 'skip' ? (
            <RecordRow label='การนัดหมาย' value='ไม่นัดหมายครั้งถัดไป' />
          ) : (
            <>
              <RecordRow label='วันที่นัด' value={appt.date} />
              <RecordRow label='เหตุผลการนัด' value={appt.reason} />
              <RecordRow label='การเตรียมตัว' value={appt.preparation} />
            </>
          )}
        </RecordCard>
      )}

      {step === 5 && (
        <RecordCard icon='contract' title='เอกสาร / ใบรับรองแพทย์'>
          <RecordRow
            label='ใบรับรองแพทย์'
            value={form.certIssue === 'yes'
              ? `ออกใบรับรองแพทย์${CERT_TYPE_CARDS.find((c) => c.value === form.certType)?.titleTh ? ` · ${CERT_TYPE_CARDS.find((c) => c.value === form.certType).titleTh}` : ''}`
              : (form.certIssue === 'no' ? 'ไม่ออกใบรับรองแพทย์' : '')}
          />
          <RecordRow label='คำแนะนำสำหรับผู้รับบริการ' value={form.patientAdvice} />
        </RecordCard>
      )}
    </div>
  );
};

const ExitNurseQueuePage = () => {
  const [activeTab, setActiveTab] = useState('today');
  const [searchQ, setSearchQ] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [openId, setOpenId] = useState(null);
  /* นัดหมายครั้งต่อไปจากจุด Exist Nurse (มติผู้ใช้ 31 ส.ค. 69) — งานสุดท้ายก่อน
     ผู้รับบริการกลับบ้านคือ "ยืนยันวันนัดครั้งต่อไป" ซึ่งเดิมเป็นแค่ช่องติ๊ก
     พยาบาลต้องไปเปิดโมดูลนัดหมายอีกหน้าเพื่อจองจริง · นัดที่สร้างที่นี่เขียนลง
     `appointmentExtraStore` ตัวเดียวกับที่หน้ารับคำขอนัดใช้ จึงไปโผล่ในโมดูล
     นัดหมายและแท็บ "นัดล่วงหน้า" ของทุกจุดงานทันที */
  /* ดูสิ่งที่แพทย์กรอกไว้ใน visit นี้ (มติผู้ใช้ 31 ส.ค. 69) — พยาบาลจุดส่งกลับ
     ต้องอธิบายยา ย้ำวันนัด และให้คำแนะนำ ซึ่งทั้งหมดเป็นของที่แพทย์เพิ่งบันทึก
     แต่หน้านี้เห็นแค่คลินิก/แพทย์/การวินิจฉัยย่อ ๆ ในตาราง */
  const [recordRow, setRecordRow] = useState(null);
  const [recordStep, setRecordStep] = useState(0);
  const openRecord = (row) => { setRecordRow(row); setRecordStep(0); };
  const doctorRecord = useMemo(
    () => (recordRow ? findLatestTreatmentRecord(recordRow.hn) : null),
    [recordRow],
  );
  const [apptRow, setApptRow] = useState(null);
  const [apptForm, setApptForm] = useState(null);

  const openAppointment = (row) => {
    setApptRow(row);
    setApptForm({
      clinic: '',
      doctor: ANY_DOCTOR_VALUE,
      type: 'followup',
      date: '',
      time: '',
      reason: row?.diagnosis || '',
      prep: '',
    });
  };
  const closeAppointment = () => { setApptRow(null); setApptForm(null); };
  const setApptField = (k) => (v) => setApptForm((f) => ({ ...f, [k]: typeof v === 'string' ? v : v?.target?.value ?? '' }));
  /* ครบพอจะจองจริง = รู้ว่าไปคลินิกไหน วันไหน เวลาไหน · แพทย์ปล่อย
     "ไม่ระบุแพทย์" ได้ เพราะบางคลินิกจัดแพทย์วันจริง */
  const apptReady = !!(apptForm?.clinic && apptForm?.date && apptForm?.time);

  const saveAppointment = () => {
    if (!apptRow || !apptReady) return;
    const clinicLabel = APPT_CLINIC_OPTIONS.find((o) => o.value === apptForm.clinic)?.label || apptForm.clinic;
    const doctorLabel = apptForm.doctor === ANY_DOCTOR_VALUE
      ? ANY_DOCTOR_VALUE
      : (APPT_DOCTOR_OPTIONS.find((o) => o.value === apptForm.doctor)?.label || apptForm.doctor);
    const typeLabel = APPT_TYPE_OPTIONS.find((o) => o.value === apptForm.type)?.label || 'ติดตามผล';
    addExtraAppointments([{
      id: `A-EXIT-${apptRow.id}-${Date.now()}`,
      staffId: null,
      date: apptForm.date,
      time: apptForm.time,
      slotRange: '',
      status: APPT_STATUS_CONFIRMED,
      patient: apptRow.name,
      patientAvatar: getPatientByHN(apptRow.hn)?.avatarUrl,
      hn: apptRow.hn,
      rights: getPatientByHN(apptRow.hn)?.insurance,
      clinic: clinicLabel,
      dept: clinicLabel,
      type: typeLabel,
      doctor: doctorLabel,
      examMode: 'onsite',
      orderingUnit: 'Exist Nurse',
      reason: apptForm.reason,
      prep: apptForm.prep,
      createdBy: 'Exist Nurse',
    }]);
    /* จองแล้ว = งาน "ยืนยันวันนัดครั้งต่อไป" ของแถวนั้นถือว่าเสร็จ ไม่ต้องให้
       พยาบาลไปติ๊กซ้ำอีกที */
    if (apptRow.tasks?.includes('appointment') && !apptRow.doneTasks?.appointment) {
      toggleExitTask(apptRow.id, 'appointment');
    }
    setToast(`นัด ${apptRow.name} วันที่ ${apptForm.date} เวลา ${apptForm.time} น. เรียบร้อย`);
    closeAppointment();
  };
  const [toast, setToast] = useState('');

  const [tick, setTick] = useState(0);
  useEffect(() => subscribeExitQueue(() => setTick((t) => t + 1)), []);
  const allRows = useMemo(
    () => getExitRows(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tick],
  );

  const {
    history: searchHistory,
    push: pushHistory,
    clear: clearHistory,
  } = useSearchHistory(SEARCH_HISTORY_KEY);

  const open = useMemo(() => allRows.find((r) => r.id === openId) ?? null, [allRows, openId]);

  const counts = useMemo(() => ({
    waiting: allRows.filter((r) => r.status === 'waiting').length,
    doing: allRows.filter((r) => r.status === 'doing').length,
    done: allRows.filter((r) => r.status === 'done').length,
    today: allRows.filter((r) => r.status !== 'done' && r.status !== 'cancelled').length,
    all: allRows.length,
  }), [allRows]);

  const summaryCards = useMemo(() => {
    const openRows = allRows.filter((r) => r.status !== 'done');
    const longest = openRows.reduce((m, r) => Math.max(m, r.waitMinutes ?? 0), 0);
    const pendingTasks = openRows.reduce((n, r) => {
      const { total, done } = taskProgress(r);
      return n + (total - done);
    }, 0);
    return [
      { key: 'waiting', label: 'รอส่งกลับ',        value: counts.waiting, color: 'inprogress', icon: 'hourglass_top' },
      { key: 'doing',   label: 'กำลังส่งกลับ',     value: counts.doing,   color: 'info',       icon: 'pending_actions' },
      { key: 'done',    label: 'ส่งกลับแล้ววันนี้', value: counts.done,    color: 'positive',   icon: 'check_circle' },
      { key: 'tasks',   label: 'งานที่ยังไม่ปิด',   value: pendingTasks,   color: 'info',       icon: 'checklist' },
      { key: 'longest', label: 'รอนานสุด (นาที)',   value: longest,        color: 'destructive', icon: 'schedule' },
    ];
  }, [allRows, counts]);

  const tabs = useMemo(
    () => TABS.map((t) => ({ ...t, count: counts[t.key] ?? 0 })),
    [counts],
  );

  const tabRows = activeTab === 'all'
    ? allRows
    : activeTab === 'today'
      ? allRows.filter((r) => r.status !== 'done' && r.status !== 'cancelled')
      : allRows.filter((r) => r.status === activeTab);

  const filtered = useMemo(() => {
    const q = searchQ.trim().toLowerCase();
    if (!q) return tabRows;
    return tabRows.filter((r) => [r.queue, r.hn, r.name, r.clinic, r.doctor, r.diagnosis]
      .some((f) => f && String(f).toLowerCase().includes(q)));
  }, [tabRows, searchQ]);

  const sortedRows = useMemo(() => {
    if (!sortConfig.key) return filtered.slice().sort(compareExitRows);
    const sign = sortConfig.direction === 'desc' ? -1 : 1;
    const collator = new Intl.Collator('th', { numeric: true, sensitivity: 'base' });
    const numeric = ['waitMinutes'];
    return filtered.slice().sort((a, b) => {
      const av = a[sortConfig.key] ?? '';
      const bv = b[sortConfig.key] ?? '';
      const primary = numeric.includes(sortConfig.key)
        ? (Number(av) || 0) - (Number(bv) || 0)
        : collator.compare(String(av), String(bv));
      return primary !== 0 ? sign * primary : compareExitRows(a, b);
    });
  }, [filtered, sortConfig]);

  const handleSort = (key) => setSortConfig((prev) => (
    prev.key === key
      ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
      : { key, direction: 'asc' }
  ));

  const handleClose = () => {
    if (!open) return;
    const closed = closeExitVisit(open.id);
    if (!closed) {
      setToast('ยังทำไม่ครบทุกข้อ — ปิดเยี่ยมไม่ได้');
      return;
    }
    setToast(`ส่งกลับ ${open.name} เรียบร้อย`);
    setOpenId(null);
  };

  const renderTasks = (row) => {
    const { done, total } = taskProgress(row);
    return (
      <div className='flex items-center' style={{ gap: 'var(--dim-space-200)' }}>
        <ColorfulBadge
          style={done === total ? 'teal' : done > 0 ? 'blue' : 'orange'}
          size='small'
          hierarchy='secondary'
          width='hug'
        >
          {`${done}/${total}`}
        </ColorfulBadge>
        <TableEllipsisText
          text={row.tasks.map((t) => EXIT_TASKS[t]?.label).filter(Boolean).join(' · ')}
        />
      </div>
    );
  };

  /* ปุ่มสามตัวเดียวกับคิวลงทะเบียน/คัดกรอง — เรียกคิว · พักคิว · ยกเลิกคิว
     (มติผู้ใช้ 29 ส.ค. 69) เรียกคิว = เรียกผู้รับบริการมาที่โต๊ะแล้วเปิดรายการ
     สิ่งที่ต้องทำก่อนกลับ ปุ่มเรียกเป็น fill เมื่อยังรอ และจางลงเมื่อเริ่มทำแล้ว
     ทรงเดียวกับที่คิวอื่นแยก "รอ" กับ "กำลังทำ" */
  /* ปุ่มนัดหมายอยู่ในทุกสถานะของแถว — เคสที่ส่งกลับไปแล้วก็ยังต้องนัดตามได้
     (มติผู้ใช้ 31 ส.ค. 69) */
  const renderRecordButton = (row) => (
    <NeutralSubdueButton
      variant='outline'
      size='sm'
      leadingIcon='clinical_notes'
      onClick={(e) => { e.stopPropagation(); openRecord(row); }}
    >
      ข้อมูลจากแพทย์
    </NeutralSubdueButton>
  );

  const renderAppointmentButton = (row) => (
    <BrandSubdueButton
      variant='outline'
      size='sm'
      leadingIcon='event_available'
      onClick={(e) => { e.stopPropagation(); openAppointment(row); }}
    >
      นัดหมาย
    </BrandSubdueButton>
  );

  const renderActions = (row) => {
    if (row.status === 'done' || row.status === 'cancelled') {
      return (
        <div className='flex items-center justify-center' style={{ gap: 'var(--dim-space-200)' }}>
          {renderRecordButton(row)}
          {renderAppointmentButton(row)}
          <NeutralSubdueButton
            variant='outline'
            size='sm'
            leadingIcon='undo'
            onClick={(e) => { e.stopPropagation(); reopenExitVisit(row.id); setToast(`เปิด ${row.name} กลับมาแก้ไขแล้ว`); }}
          >
            เปิดกลับมาแก้
          </NeutralSubdueButton>
        </div>
      );
    }
    return (
      <div className='flex items-center justify-center' style={{ gap: 'var(--dim-space-200)' }}>
      {renderRecordButton(row)}
      {renderAppointmentButton(row)}
      <QueueCallActions
        /* ปุ่มบอกสถานะจริงของแถว (มติผู้ใช้ 29 ส.ค. 69) */
        statusLabel={row.status === 'doing' ? 'กำลังส่งกลับ' : undefined}
        paused={!!row.paused}
        callVariant={row.status === 'waiting' ? 'fill' : 'quaternary'}
        onCall={() => setOpenId(row.id)}
        onPause={() => { toggleExitPause(row.id); setToast(row.paused ? `เรียก ${row.name} ต่อ` : `พักคิว ${row.name}`); }}
        onCancel={() => { cancelExitVisit(row.id); setToast(`ยกเลิกคิว ${row.name}`); }}
      />
      </div>
    );
  };

  const columns = useMemo(() => ([
    {
      key: 'queue', label: 'คิว',
      render: (row) => (
        <ColorfulBadge style='teal' size='small' hierarchy='secondary'>{row.queue}</ColorfulBadge>
      ),
    },
    { key: 'hn', label: 'HN' },
    {
      key: 'name', label: 'ชื่อ-นามสกุล', flex: true, minWidth: 170,
      render: (row) => (
        <div className='flex items-center gap-2 min-w-0'>
          <PatientAvatar row={row} />
          <MaskedWorklistName name={row.name} recordKey={row.hn || row.queue} />
        </div>
      ),
    },
    { key: 'clinic', label: 'คลินิก', flex: true, minWidth: 150, render: (row) => <TableEllipsisText text={row.clinic} /> },
    { key: 'doctor', label: 'แพทย์ผู้ตรวจ', flex: true, minWidth: 140, render: (row) => <TableEllipsisText text={row.doctor} /> },
    { key: 'diagnosis', label: 'การวินิจฉัย', flex: true, minWidth: 180, render: (row) => <TableEllipsisText text={row.diagnosis} /> },
    { key: 'tasks', label: 'สิ่งที่ต้องทำก่อนกลับ', flex: true, minWidth: 220, sortable: false, render: renderTasks },
    { key: 'examDoneAt', label: 'ตรวจเสร็จเมื่อ' },
    {
      key: 'waitMinutes', label: 'รอนาน',
      /* เกิน 2 ชั่วโมงขึ้นตัวบ่งชี้ (มติผู้ใช้ 29 ส.ค. 69) — คนที่ตรวจเสร็จแล้ว
         แต่ยังไม่ได้กลับบ้านนานขนาดนั้นคือคนที่ถูกลืม ตัวเลขเฉย ๆ ในคอลัมน์
         ไม่เตะตาพอ แสดงเฉพาะแถวที่ยังไม่ปิด แถวที่ส่งกลับแล้วไม่ได้รออยู่ */
      render: (row) => {
        const over = row.status !== 'done' && (row.waitMinutes ?? 0) > LONG_WAIT_MINUTES;
        return over ? (
          <ColorfulBadge style='red' size='small' hierarchy='secondary' width='hug' icon='schedule'>
            {`${row.waitMinutes} นาที`}
          </ColorfulBadge>
        ) : `${row.waitMinutes} นาที`;
      },
    },
    {
      key: 'status', label: 'สถานะ',
      render: (row) => {
        const s = EXIT_STATUS[row.status] ?? EXIT_STATUS.waiting;
        return (
          <div className='flex flex-col' style={{ gap: 2 }}>
            <ColorfulBadge style={s.badge} size='small' hierarchy='secondary' width='hug'>{s.label}</ColorfulBadge>
            {row.closedAt && (
              <span style={{
                fontFamily: 'var(--type-family-body)',
                fontSize: 'var(--type-size-xs)',
                color: 'var(--text-content-tertiary)',
              }}
              >
                {`${row.closedBy ?? ''} ${row.closedAt}`.trim()}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'actions', label: 'การดำเนินการ', sortable: false, align: 'center', minWidth: 420,
      /* ไม่มีปุ่ม EMR (ประวัติย้อนหลัง) ที่นี่ (มติผู้ใช้ 29 ส.ค. 69) — แต่มีปุ่ม
         "ข้อมูลจากแพทย์" ซึ่งอ่านเฉพาะ visit ที่เพิ่งตรวจจบ (มติผู้ใช้ 31 ส.ค. 69)
         คนละเรื่องกัน: อันแรกคือประวัติสะสม อันหลังคือสิ่งที่ต้องเอาไปอธิบายวันนี้ */
      render: renderActions,
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ]), []);

  const progress = open ? taskProgress(open) : { done: 0, total: 0, complete: false };

  return (
    <>
      <SuccessToast open={!!toast} message={toast} onClose={() => setToast('')} />

      {/* ป๊อปอัปปิดเยี่ยม — รายการงานของคนคนนี้ ไม่ใช่ checklist มาตรฐาน */}
      <Popup
        open={!!open}
        onClose={() => setOpenId(null)}
        title={open ? `ส่งกลับ ${open.name}` : 'ส่งกลับ'}
        subtitle={open
          ? `HN ${open.hn} · ${open.clinic} · ${open.doctor} · ${open.diagnosis}`
          : ''}
        size='large'
        primaryAction={{
          label: progress.complete ? 'ยืนยันส่งกลับ' : `ยังเหลือ ${progress.total - progress.done} ข้อ`,
          onClick: handleClose,
          disabled: !progress.complete,
        }}
        secondaryAction={{ label: 'ปิด', onClick: () => setOpenId(null) }}
      >
        {open && (
          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
            {open.tasks.map((key) => {
              const task = EXIT_TASKS[key];
              if (!task) return null;
              const checked = !!open.doneTasks?.[key];
              return (
                <button
                  key={key}
                  type='button'
                  onClick={() => toggleExitTask(open.id, key)}
                  className='flex items-start text-left w-full'
                  style={{
                    gap: 'var(--dim-space-300)',
                    padding: 'var(--dim-space-300)',
                    borderRadius: 'var(--dim-radius-300)',
                    background: checked
                      ? 'var(--surface-brandPrimary-quaternary)'
                      : 'var(--surface-card-200)',
                    border: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary)',
                    cursor: 'pointer',
                  }}
                >
                  {/* กล่องติ๊กเป็นตัวบอกสถานะเท่านั้น — ทั้งแถวคือปุ่มกดอยู่แล้ว
                      ถ้าให้กล่องรับคลิกเองด้วยจะสลับสองครั้งในคลิกเดียว */}
                  <span className='shrink-0' style={{ paddingTop: 2, pointerEvents: 'none' }}>
                    <Checkbox checked={checked} onChange={() => {}} />
                  </span>
                  <Icon name={task.icon} size={20} color='var(--icon-brandPrimary-default)' />
                  <span className='flex flex-col min-w-0 flex-1'>
                    <span style={{
                      fontFamily: 'var(--type-family-body)',
                      fontWeight: 'var(--type-weight-medium)',
                      fontSize: 'var(--type-size-sm)',
                      color: 'var(--text-content-default)',
                    }}
                    >
                      {task.label}
                    </span>
                    <span style={{
                      fontFamily: 'var(--type-family-body)',
                      fontSize: 'var(--type-size-xs)',
                      color: 'var(--text-content-tertiary)',
                    }}
                    >
                      {task.detail}
                    </span>
                  </span>
                </button>
              );
            })}

            {/* บันทึกของพยาบาล — สิ่งที่ผู้ป่วยถามหรือกังวล ซึ่งไม่มีช่องไหนรับ */}
            <Textarea
              label='บันทึกของพยาบาล Exist Nurse'
              placeholder='เช่น ผู้ป่วยยังไม่เข้าใจวิธีฉีดอินซูลิน นัดมาสอนซ้ำสัปดาห์หน้า'
              rows={3}
              value={open.note}
              onChange={(v) => updateExitRow(open.id, { note: typeof v === 'string' ? v : v?.target?.value ?? '' })}
            />
          </div>
        )}
      </Popup>

      <Popup
        open={!!recordRow}
        onClose={() => setRecordRow(null)}
        size='extraLarge'
        title={recordRow ? `ข้อมูลจากแพทย์ — ${recordRow.name}` : 'ข้อมูลจากแพทย์'}
        subtitle={recordRow
          ? `HN ${recordRow.hn} · ${recordRow.clinic} · ${recordRow.doctor}`
          : ''}
        /* ไม่มีบันทึกของแพทย์ = ไม่มีขั้นให้เดิน เหลือปุ่มปิดอย่างเดียว
           (พบตอนตรวจด้วย headless 31 ส.ค. 69 — ปุ่ม "ถัดไป" พาไปหน้าว่างเปล่า
           เพราะฝั่ง empty state ไม่ได้เรนเดอร์แถบขั้นตอน) */
        onBack={doctorRecord?.form && recordStep > 0 ? () => setRecordStep((v) => v - 1) : undefined}
        secondaryAction={doctorRecord?.form && recordStep > 0
          ? { label: 'ย้อนกลับ', onClick: () => setRecordStep((v) => v - 1) }
          : { label: 'ปิด', onClick: () => setRecordRow(null) }}
        primaryAction={doctorRecord?.form && recordStep < RECORD_STEPS.length - 1
          ? { label: 'ถัดไป', onClick: () => setRecordStep((v) => v + 1) }
          : { label: 'ปิด', onClick: () => setRecordRow(null) }}
      >
        {recordRow && (
          <DoctorRecordView
            row={recordRow}
            record={doctorRecord}
            step={recordStep}
            onStepChange={setRecordStep}
          />
        )}
      </Popup>

      <Popup
        open={!!apptForm}
        onClose={closeAppointment}
        size='large'
        title={apptRow ? `นัดหมายครั้งต่อไป — ${apptRow.name}` : 'นัดหมายครั้งต่อไป'}
        subtitle={apptRow ? `HN ${apptRow.hn} · ${apptRow.clinic} · ${apptRow.doctor}` : ''}
        secondaryAction={{ label: 'ยกเลิก', onClick: closeAppointment }}
        primaryAction={{
          label: 'บันทึกนัดหมาย',
          onClick: saveAppointment,
          disabled: !apptReady,
        }}
      >
        {apptForm && (
          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
            <div className='grid grid-cols-1 md:grid-cols-2' style={{ gap: 'var(--dim-space-400)' }}>
              <Select
                label='คลินิก'
                required
                value={apptForm.clinic}
                onChange={setApptField('clinic')}
                options={APPT_CLINIC_OPTIONS}
                placeholder='เลือกคลินิก'
              />
              <Select
                label='ประเภทการนัด'
                value={apptForm.type}
                onChange={setApptField('type')}
                options={APPT_TYPE_OPTIONS}
              />
              <Select
                label='แพทย์ผู้นัด'
                value={apptForm.doctor}
                onChange={setApptField('doctor')}
                options={[{ value: ANY_DOCTOR_VALUE, label: 'ไม่ระบุแพทย์' }, ...APPT_DOCTOR_OPTIONS]}
              />
              <InputField
                label='วันที่นัด'
                required
                type='date'
                value={apptForm.date}
                onChange={setApptField('date')}
              />
              <InputField
                label='เวลานัด'
                required
                type='time'
                value={apptForm.time}
                onChange={setApptField('time')}
              />
            </div>
            <Textarea
              label='เหตุผลการนัด'
              rows={2}
              value={apptForm.reason}
              onChange={setApptField('reason')}
              placeholder='เช่น ติดตามผลเลือดหลังปรับยา'
            />
            <Textarea
              label='สิ่งที่ต้องเตรียมมา'
              rows={2}
              value={apptForm.prep}
              onChange={setApptField('prep')}
              placeholder='เช่น งดอาหารก่อนเจาะเลือด 8 ชั่วโมง · นำยาเดิมมาด้วย'
            />
          </div>
        )}
      </Popup>

      <QueuePageShell
        activeKey='exit'
        breadcrumb={breadcrumb}
        summaryTitle={SUMMARY_TITLE}
        summaryCards={summaryCards}
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        /* แท็บ "นัดล่วงหน้า" — shell เป็นคนเติมแท็บและวาดเนื้อหา */
        upcoming={{}}
        /* ไม่มีปุ่มดูตารางเวรที่นี่ (มติผู้ใช้ 29 ส.ค. 69) — ตารางเวรตอบว่า
           "แพทย์คนไหนว่างกี่โมง" ซึ่งเป็นคำถามตอนจะส่งคนเข้าห้องตรวจ ส่วนหน้านี้
           ทำงานหลังการตรวจจบแล้ว ไม่มีจังหวะที่ต้องรู้เวรแพทย์ */
      >
        <div
          className='flex flex-col flex-1 min-w-0'
          style={{ padding: 'var(--dim-space-600)', gap: 'var(--dim-space-600)' }}
        >
          <div
            className='w-full flex flex-col'
            style={{
              background: 'var(--surface-card-100)',
              borderRadius: 'var(--dim-radius-500)',
              boxShadow: 'var(--shadow-card-strong)',
              padding: 'var(--dim-space-600)',
              /* 16px ไม่ใช่ 24px (มติผู้ใช้ 29 ส.ค. 69) — หน้าอื่นมีแถวตัวกรองคั่น
                 ระหว่างช่องค้นหากับตาราง ที่นี่ไม่มี 24px จึงกลายเป็นช่องว่างเปล่า */
              gap: 'var(--dim-space-400)',
            }}
          >
            <div className='w-full flex items-center' style={{ gap: 'var(--dim-space-300)' }}>
              <div className='flex-1' />
              <PrimarySearch
                value={searchQ}
                onChange={setSearchQ}
                onSubmit={(label, item) => { setSearchQ(label); pushHistory(item ?? label); }}
                history={searchHistory}
                onHistoryClear={searchHistory.length > 0 ? clearHistory : undefined}
                placeholder='ค้นหา HN / ชื่อ-สกุล / คิว / คลินิก / แพทย์'
                width={640}
              />
              <div className='flex-1' />
            </div>

            <SearchResultCount found={sortedRows.length} total={tabRows.length} />

            <Table
              columns={columns}
              rows={sortedRows}
              rowKey={(row) => row.id}
              sortConfig={sortConfig}
              onSort={handleSort}
              /* คลิกแถว = เปิดข้อมูลที่แพทย์บันทึกไว้ (มติผู้ใช้ 31 ส.ค. 69) —
                 ของเดิมคลิกแล้วเปิดป๊อปอัป "ส่งกลับ" ทันที ซึ่งเป็นการลงมือทำ
                 ไม่ใช่การอ่าน · การส่งกลับยังกดได้จากปุ่มเรียกคิวในแถวเหมือนเดิม
                 และเปิดได้ทุกสถานะ เพราะเคสที่ส่งกลับไปแล้วก็ยังต้องเปิดอ่านได้ */
              onRowClick={(row) => openRecord(row)}
              stickyColCount={3}
              stickyRightColCount={1}
              stickyHeaderTop={QUEUE_STICKY_UNDER_TABS}
              emptyMessage={activeTab === 'today'
                ? 'ไม่มีผู้รับบริการรอส่งกลับ — ทุกคนที่ตรวจเสร็จถูกปิดเยี่ยมแล้ว'
                : 'ไม่พบรายการ'}
            />
          </div>
        </div>
      </QueuePageShell>
    </>
  );
};

export default ExitNurseQueuePage;
