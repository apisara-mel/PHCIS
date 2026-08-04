import React, { useMemo, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import Sidebar from '@/components/layout/Sidebar';
import QueueSubMenu from '@/components/layout/QueueSubMenu';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import PatientCard from '@/components/card/PatientCard';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import { ClinicFilterProvider } from '@/components/layout/HeaderClinicContext';
import TreatmentFormShell from '@/templates/TreatmentFormShell';
import {
  Step1History, Step2Screening, Step3Examination, Step4DoctorRecord,
  Step5Orders, Step6Appointment,
} from '@/components/forms/TreatmentSteps';
import SoapNotePanel from '@/pages/treat/panels/SoapNotePanel';
import CpoeDocumentsStep from '@/pages/treat/panels/CpoeDocumentsStep';
import {
  CPOE_TREATMENT_STEPS, getCpoeCompletedSteps, cpoeStepIndex, CPOE_STEP_DOCUMENTS,
} from '@/pages/treat/cpoeSteps';
import { blankSoap } from '@/data/treatmentSoap';
import PhcisTopToast from '@/components/alert/PhcisTopToast';
import TreatmentSafetyRail from '@/pages/treat/panels/TreatmentSafetyRail';
import { GuardedAction } from '@/pages/treat/panels/panelHooks';
import { findMrPatientByHn, DEFAULT_MR_PATIENT } from '@/data/mrPatients';
import { getPatientByHN, DEFAULT_PATIENT } from '@/data/patientProfiles';
import { TREATMENT_QUEUE_ROWS, buildQueueSubMenuBuckets } from '@/data/treatmentQueue';
import { sendPrescriptionToPharmacy } from '@/data/pharmacyQueue';
import { gateCpoeOrder } from '@/data/consentWorkflowStore';
import AlertDialog from '@/components/popup/AlertDialog';
import {
  TREATMENT_DEFAULT_VITALS,
  TREATMENT_DEFAULT_SYMPTOMS,
  TREATMENT_DEFAULT_ALLERGIES,
  DEFAULT_NURSE_EXAM_NOTES,
  DEFAULT_DOCTOR_EXAM_NOTES,
  DEFAULT_EXAM_ATTACHMENTS,
  DEFAULT_BODY_MARKERS,
  DEFAULT_BODY_DRAWINGS,
  DEFAULT_APPOINTMENT,
  getTreatmentCompletedSteps,
} from '@/data/treatmentVisits';

/* MIH TreatmentFormPage — Figma 2624:122771..2767:120407 (steps) and
   PHCIS|CPOE 132:16310..16311 (breadcrumb + PatientCard header).
   Owns one form-state object covering all 7 steps. The selected patient HN
   arrives via router state from TreatmentQueuePage; we look it up in
   MR_PATIENTS so the doctor sees the same identity that ลงทะเบียน
   produced and in PATIENT_PROFILES for PatientCard's display shape. */

const breadcrumb = ['ระบบบันทึกการรักษา', 'ตรวจรักษาทั่วไป (OPD)'];

const buildInitialForm = (p) => ({
  // Step 2 — screening summary (read-only)
  vitalsRecordedAt: '6 พ.ค. 2569 · 09:21',
  vitals: TREATMENT_DEFAULT_VITALS,
  symptoms: TREATMENT_DEFAULT_SYMPTOMS,
  allergies: p?.flags?.allergyDrug
    ? TREATMENT_DEFAULT_ALLERGIES
    : 'ไม่พบประวัติแพ้ยา / สารเคมี',

  // Step 3 — physical examination (Figma 2431:213971)
  examSystem: 'heent',
  examView: 'both',
  bodyMarkers: DEFAULT_BODY_MARKERS,
  bodyDrawings: DEFAULT_BODY_DRAWINGS,
  nurseExam: DEFAULT_NURSE_EXAM_NOTES,
  doctorExam: DEFAULT_DOCTOR_EXAM_NOTES,
  examAttachments: DEFAULT_EXAM_ATTACHMENTS,

  // Step 4 — วินิจฉัย / Diagnosis (Figma 330:42665 — "On first visit, the
  // default state appears."). diagnosisNote + doctorOrderNote start empty
  // so Step4DoctorRecord renders the placeholder example copy in grey.
  // orderingDoctor remains pre-filled to the on-duty physician (still
  // disabled in the form so the doctor can't reassign their own orders).
  diagnosisNote: '',
  doctorOrderNote: '',
  orderingDoctor: 'somying',
  /* `type` drives the ColorfulBadge style in the ICD table. `principle`
     → magenta (PRINCIPLE DX), `comorbidity` → blue, `complication` →
     orange, `externalCause` → purple. See DIAGNOSIS_TYPE_OPTIONS.
     Starts empty so Step 4 lands on the Figma 345:35724 empty state
     ("ยังไม่มีบันทึกรหัสการวินิจฉัย (ICD10)") on first paint — the
     doctor hasn't typed anything yet. Rows are pushed in as the
     clinician adds diagnoses via the Doctor AI search or the
     "เพิ่มรหัสการวินิจฉัย" CTA. */
  diagnoses: [],
  /* Doctor AI ICD search box value. Starts empty so the AISearch
     resolves to its DEFAULT state on first paint (per Figma
     MIH-DS Foundation 3396:1599 — empty + blurred + light-indigo border
     + "ค้นหารหัสโรค เช่น ไข้เลือดออก" placeholder). Seeding a value
     would push the field into `filled` and hide the placeholder. */
  icdQuery: '',

  // Step 5 — สั่งการรักษา / Treatment Order (Figma 2508:98417)
  /* Active category tab (`medication` | `lab` | `xray` | `procedure` |
     `consult`). All five categories start empty so Step 5 lands on the
     "ยังไม่มีรายการ … ที่สั่ง / กรุณาสั่ง …" empty state (Figma PHCIS|CPOE
     269:32427) on first paint — the doctor hasn't ordered anything yet.
     Rows are pushed in as the clinician clicks "เพิ่มยา" or picks chips
     from the FrequentOrdersCard / "Often order" section. The previous
     DEFAULT_MEDICATION_ORDERS seed is still exported from
     `treatmentVisits.js` for component-library / demo screens. */
  orderCategory: 'medication',
  medications: [],
  labs: [],
  /* X-ray orders — [{ examId, view, urgency }] written by Step5Orders'
     xray tab (TOR §1.12.5.4). `examId` keys XRAY_EXAM_BY_ID
     (xrayCatalog.js), `view` is one of that exam's ท่าถ่าย keys
     (XRAY_VIEWS), `urgency` keys XRAY_URGENCIES. Mock-only on the
     doctor's side: the order lives in this form state and is never
     pushed into XRAY_ORDERS (the RIS worklist mock). */
  xrayOrders: [],
  procedureOrders: [],
  consultOrders: [],
  /* Cross-class allergy warning panel — Figma 2508:98442. Dismissible
     per-visit; the parent stores the dismissed flag so re-entering Step 5
     doesn't keep flashing it once acknowledged. Only renders alongside
     the medication table (the empty-state branch in Step5Orders hides
     it so the placeholder reads cleanly). */
  showAllergyAlert: true,

  // Step 6 — นัดหมาย / Appointment (Figma 4046:18305 / 4046:19444 /
  // 4030:9506). Every field starts in its default (empty) state per
  // the Figma; only `doctor` is pre-seeded with this visit's on-duty
  // physician (same identifier Step 4 uses for `orderingDoctor`) so
  // the doctor doesn't have to re-pick themselves when scheduling a
  // follow-up.
  appointment: { ...DEFAULT_APPOINTMENT, doctor: 'somying' },

  // Step 7 — ใบรับรองแพทย์ / Medical Certificate (Figma 287:29898 default).
  /* Issuance toggle (`รับ` / `ไม่รับ`). Empty default so first paint
     shows both pills in neutral state and the bordered certificate
     card stays hidden until the doctor explicitly picks `รับ`. */
  certIssue: '',
  /* Certificate type: 'general' | 'sick' | 'medico' | 'travel'. */
  certType: 'travel',
  certNo: 'MC-2569-004821',
  /* Rest days pill selection — Figma 228:27018 default has NONE
     selected; the doctor explicitly picks a duration or "กำหนดเอง".
     Numeric pills auto-fill startDate / endDate from today (inclusive
     span); 'custom' leaves the range untouched for manual entry. */
  restDays: '',
  /* Date range starts empty — Figma 228:27018 shows the two
     DatePicker triggers in their placeholder state ("เลือกวันเริ่ม
     ต้น" / "เลือกวันสิ้นสุด"). */
  startDate: '',
  endDate:   '',
  certSignerDoctor:  'somying',
  certSignerLicense: 'TH-00012345',
  /* Form Builder Signature — base64 PNG from canvas; empty until confirmed. */
  certSignature: '',
  /* Set when the clinician taps ยืนยันลายเซ็น (formatCertSignedAt). */
  certSignedAt: '',

  /* ── EMR §1.4 (TOR wave) ────────────────────────────────────
     visitId ผูก note / audit / เอกสาร เข้ากับการตรวจครั้งนี้.
     medRecDispositions เก็บการตัดสินใจของ Medication Reconciliation
     ต่อแถว ({ [rowKey]: { disposition, reason } }) และ medRecPending
     คือจำนวนแถวที่ยังไม่ระบุ — ใช้เตือนตอนออกจาก Step 5.
     visitAttachments คือไฟล์แนบ multimedia ของ visit (โควตา 50 MB).
     patientAdvice คือคำแนะนำที่พิมพ์ลง Clinical Summary (§1.4.10.9). */
  visitId: 'v-2569-05-06',
  medRecDispositions: {},
  medRecPending: 0,
  visitAttachments: [],
  patientAdvice: '',
  externalCauseDraft: '',

  /* ── CPOE §1.5 (TOR wave) ───────────────────────────────────
     `soap` คือร่าง SOAP Note ของ step 4 — เก็บไว้บน form เดียวกันเพื่อให้
     auto-save ข้าม step ได้เอง (เปลี่ยน step แล้วกลับมาข้อความไม่หาย).
     `patientAdviceTopics` แยกคำแนะนำ 6 หัวข้อตาม TOR §1.5.4.10.
     `labRequest` คือหัวใบขอตรวจ (คู่มือ §2.8), `procedureOrders` /
     `nursingActivities` คือบันทึกหัตถการ (§2.4), `cdssDismissed` เก็บ
     คำเตือนที่กด "รับทราบ" แล้วเพื่อไม่ให้เด้งซ้ำใน visit เดียวกัน. */
  soap: blankSoap(),
  patientAdviceTopics: {},
  continueOrder: false,
  labRequest: {},
  nursingActivities: {},
  nursingOther: '',
  cdssDismissed: {},
  radiologistDecisions: {},
  xrayAcknowledged: {},
  /* ใบสั่งยาอื่นของ HN นี้ในวันเดียวกัน — ป้อนให้ CDSS ตรวจ "ซ้ำภายในวันเดียวกัน"
     (§1.5.1.9). ในระบบจริงมาจาก API; ที่นี่เป็น mock ที่สมจริง */
  sameDayPrescriptions: [
    { name: 'Paracetamol 500 mg', clinic: 'ห้องฉุกเฉิน', at: '08:12' },
  ],
});

/* Step 8 ห่อ Step7Certificate เดิมไว้ทั้งดุ้น (การ์ดใบรับรองแพทย์ทำงาน
   เหมือนเดิมทุกประการ) แล้วเติมศูนย์พิมพ์เอกสาร / เทมเพลตใบคำขอ /
   ใบรับรองภาษาอังกฤษ / แบบฟอร์มยินยอม ต่อท้าย */
const STEP_RENDERERS = [
  Step1History, Step2Screening, Step3Examination,
  SoapNotePanel,
  Step4DoctorRecord, Step5Orders, Step6Appointment, CpoeDocumentsStep,
];

/* index ของแต่ละ step ให้ panel ใช้กระโดดข้าม step โดยไม่ต้องรู้ตัวเลข */
const CPOE_STEP_INDEXES = {
  history: cpoeStepIndex('history'),
  screening: cpoeStepIndex('screening'),
  examination: cpoeStepIndex('examination'),
  soap: cpoeStepIndex('soap'),
  diagnosis: cpoeStepIndex('diagnosis'),
  orders: cpoeStepIndex('orders'),
  appointment: cpoeStepIndex('appointment'),
  documents: cpoeStepIndex('documents'),
};

const TreatmentFormPage = () => {
  const history = useHistory();
  const { state: navState } = useLocation();

  /* Patient identity used by the step bodies (MR shape — full address,
     rights, drugAllergies, etc.). */
  const patient = useMemo(() => {
    const p = (navState && findMrPatientByHn(navState.hn)) || DEFAULT_MR_PATIENT;
    return { ...p, queue: navState?.queue, name: navState?.name || `${p.firstNameTh} ${p.lastNameTh}` };
  }, [navState]);

  /* Patient identity in the shape PatientCard expects (fullName /
     englishName / patientType / insurance / …). Looked up by HN from
     the same PATIENT_PROFILES roster that seeds TreatmentQueuePage so
     the gradient card matches the queue row the user just clicked. */
  const cardPatient = useMemo(
    () => (navState?.hn && getPatientByHN(navState.hn)) || DEFAULT_PATIENT,
    [navState?.hn],
  );

  const [stepIndex, setStepIndex] = useState(0);
  const [form, setForm] = useState(() => buildInitialForm(patient));

  const ActiveStep = STEP_RENDERERS[stepIndex];
  /* 8 ช่องตามลำดับ CPOE (แทรก SOAP ที่ step 4) — ห้ามใช้ตัวเดิม 7 ช่อง
     ไม่งั้น StepProgress ติ๊กถูก/ผิดเลื่อนทั้งแถว */
  const completedSteps = useMemo(
    () => getCpoeCompletedSteps(form, stepIndex),
    [form, stepIndex],
  );

  /* QueueSubMenu buckets — read straight from the shared
     TREATMENT_QUEUE_ROWS roster (same source that backs the
     TreatmentQueuePage table) so the side panel's รอตรวจ / กำลังตรวจ /
     ตรวจเสร็จ lists stay consistent with the queue page. Each bucket
     carries `{ items, total }` so the section header can show the
     full queue size while the list only renders the Figma's short
     preview (5 / 1 / 5). */
  const queueBuckets = useMemo(() => {
    const raw = buildQueueSubMenuBuckets(TREATMENT_QUEUE_ROWS);
    const map = (rows) => rows.map((r) => ({
      id: r.id,
      hn: r.hn,
      name: r.name,
      queue: r.queue,
      badge: r.vipBadge,
    }));
    return {
      done:       { items: map(raw.done.items),       total: raw.done.total       },
      draft:      { items: map(raw.draft.items),      total: raw.draft.total      },
      inProgress: { items: map(raw.inProgress.items), total: raw.inProgress.total },
      waiting:    { items: map(raw.waiting.items),    total: raw.waiting.total    },
    };
  }, []);

  const goToPatientRecord = (p) => history.push({
    pathname: '/treat/record',
    state: { hn: p.hn, queue: p.queue, name: p.name },
  });

  /* ส่งยาไปห้องยา (ToR §1.9.11.1 — เชื่อมต่อกับระบบการสั่งยา/CPOE). Pushes
     this visit's medication orders into the pharmacy dispensing queue —
     the in-app stand-in for a CPOE→pharmacy message, since there's no
     real backend here. Disabled while Step 5 has no medication rows yet
     so it can't fire an empty prescription. */
  const [pharmacySendToast, setPharmacySendToast] = useState(null);
  const [consentGateOpen, setConsentGateOpen] = useState(null);
  const dismissPharmacySendToast = () => setPharmacySendToast(null);

  /* §1.5.4.17 / §1.5.4.18–.21 — สองคำสัญญาบนหน้าจอที่ต้องบังคับใช้จริง:
     (1) med-rec ยังประสานไม่ครบ  (2) มีคำเตือน CDSS ระดับ "บล็อก"
     MedicationCdssPanel ยกสถานะขึ้นมาไว้ที่ form.cpoeSendBlocked แล้ว */
  const medRecPending = Number(form.medRecPending || 0);
  const sendBlockReason = form.cpoeSendBlocked
    ? `ใบสั่งยาถูกกันไว้ — ${form.cpoeSendBlockReason || 'มีคำเตือน CDSS ระดับบล็อก'}`
    : medRecPending > 0
      ? `ยังประสานรายการยาเดิมไม่ครบ ${medRecPending} รายการ — ต้องระบุการตัดสินใจให้ครบก่อนส่งใบสั่งยา`
      : form.medications.length === 0
        ? 'ยังไม่มีรายการยาในใบสั่งยานี้'
        : '';
  const canSendToPharmacy = !sendBlockReason;

  const handleSendToPharmacy = () => {
    if (!canSendToPharmacy) return;
    const gate = gateCpoeOrder(patient.hn, { orderKind: 'medication' });
    if (!gate.allowed) {
      setConsentGateOpen(gate);
      return;
    }
    const row = sendPrescriptionToPharmacy({
      hn: patient.hn,
      diagnoses: form.diagnoses,
      medications: form.medications,
      vitals: form.vitals,
    });
    setPharmacySendToast({
      id: Date.now(),
      variant: row ? 'success' : 'error',
      message: row ? `ส่งใบสั่งยาไปห้องยาแล้ว (คิว ${row.queueNo})` : 'ส่งใบสั่งยาไม่สำเร็จ',
    });
  };

  return (
    <ClinicFilterProvider>
    <div className='flex w-full min-h-screen' style={{ background: 'var(--background-screen-brand-100, #F4FBF8)' }}>
      <Sidebar activeKey='treat' />
      {/* QueueSubMenu — Figma "Sub Menu B" (PHCIS-ALL 2624:122779
          collapsed / 2624:122781 expanded). Sits between the Sidebar
          and the form column so the doctor can glance at the rest of
          the queue without leaving the open visit. Starts collapsed so
          the form gets full horizontal space until the doctor opts in.
          "ดูทั้งหมด" jumps back to the full OPD queue page (Figma
          PHCIS-ALL 2760:140031). */}
      <QueueSubMenu
        queue={queueBuckets}
        onViewAll={() => history.push('/treat/queue')}
        onPickPatient={goToPatientRecord}
      />
      <div className='flex-1 min-w-0 flex flex-col'>
        <Header breadcrumb={breadcrumb} />
        {/* Sticky parallax header (Figma 9:3503 default · 343:5629 stuck).
            PatientCard owns the sentinel + IntersectionObserver + sticky
            wrapper internally — pass `sticky` and the card collapses to
            the compact mini layout once it tucks under the app header. */}
        <PatientCard
          sticky
          patient={cardPatient}
          title='บันทึกการรักษา'
          onBack={() => history.push('/treat/queue')}
          drugAllergies={patient.drugAllergies}
          chronicDiseases={patient.chronicDiseases}
          actions={
            <>
              <GuardedAction allowed={canSendToPharmacy} reason={sendBlockReason}>
                <BrandSubdueButton
                  variant='outline'
                  leadingIcon='local_hospital'
                  onClick={handleSendToPharmacy}
                >
                  ส่งยาไปห้องยา
                </BrandSubdueButton>
              </GuardedAction>
              {/* CPOE §1.5.10.1 — เดิมปุ่มนี้ยังไม่ผูก sheet จริง ตอนนี้พาไป
                  ศูนย์พิมพ์เอกสาร (step 8) ที่ต่อ PharmacyPrescriptionPrint
                  ไว้แล้ว พร้อม preview ก่อนพิมพ์ */}
              <BrandSubdueButton
                variant='outline'
                leadingIcon='medication'
                onClick={() => setStepIndex(CPOE_STEP_DOCUMENTS)}
              >
                พิมพ์ใบสั่งยา
              </BrandSubdueButton>
              <BrandSubdueButton variant='fill' leadingIcon='credit_card'>พิมพ์ OPD Card</BrandSubdueButton>
            </>
          }
        />
        {/* EMR §1.4.3.21 — แถบเฝ้าระวังคลินิก. TOR ระบุว่าข้อมูลการแพ้ต้อง
            เห็น "บนหน้าจอระหว่างการตรวจรักษา" แถบนี้จึง sticky อยู่ทุก step
            ใต้ PatientCard และไม่แตะ step body เลย */}
        <TreatmentSafetyRail patient={patient} form={form} />
        <PhcisTopToast session={pharmacySendToast} onDismiss={dismissPharmacySendToast} />
        <AlertDialog
          open={!!consentGateOpen}
          type='warning'
          title='ต้องมีความยินยอมก่อนส่งใบสั่งยา'
          description={consentGateOpen?.reason || 'ผู้ป่วยยังไม่มีความยินยอมที่จำเป็น'}
          confirmLabel='ไปจัดการความยินยอม'
          cancelLabel='ปิด'
          onConfirm={() => { setConsentGateOpen(null); history.push('/consent'); }}
          onCancel={() => setConsentGateOpen(null)}
          onClose={() => setConsentGateOpen(null)}
        />
        {/* CPOE §1.5 — ส่ง `steps` 8 ขั้นเข้า shell เอง. ห้ามแก้
            TREATMENT_STEPS ที่เป็น default ของ shell เพราะคลินิกอื่น
            (ANC / NCD / HIV-STI / Mental Health / Addiction / Dental)
            ใช้ค่าเดิมอยู่ */}
        <TreatmentFormShell
          steps={CPOE_TREATMENT_STEPS}
          stepIndex={stepIndex}
          onStepChange={setStepIndex}
          completedSteps={completedSteps}
        >
          {/* `cardPatient` mirrors what the sticky PatientCard header
              renders (fullName / insurance), so Step 6's mini patient
              strip can show the same person as the header even when the
              MR roster (`patient` prop) uses a different display name
              for the same HN. */}
          {/* `onStepChange` lets a step body request a jump to any other
              step — used by Step4DoctorRecord's "ตรวจร่างกาย" empty-state
              CTA and the populated-state "แก้ไข" header button to send
              the doctor back to Step 3 (Physical Examination) where the
              live editors live. Step 1/2/5/6/7 simply ignore the prop. */}
          {/* `stepIndexes` ให้ SOAP panel (และ panel อื่นในอนาคต) กระโดด
              ข้าม step ด้วย key แทน magic number ที่เลื่อนไปแล้ว */}
          <ActiveStep
            form={form}
            setForm={setForm}
            patient={patient}
            cardPatient={cardPatient}
            onStepChange={setStepIndex}
            stepIndexes={CPOE_STEP_INDEXES}
          />
        </TreatmentFormShell>
        <Footer />
      </div>
    </div>
    </ClinicFilterProvider>
  );
};

export default TreatmentFormPage;
