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
  Step5Orders, Step6Appointment, Step7Certificate,
} from '@/components/forms/TreatmentSteps';
import { findMrPatientByHn, DEFAULT_MR_PATIENT } from '@/data/mrPatients';
import { getPatientByHN, DEFAULT_PATIENT } from '@/data/patientProfiles';
import { TREATMENT_QUEUE_ROWS, buildQueueSubMenuBuckets } from '@/data/treatmentQueue';
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
});

const STEP_RENDERERS = [
  Step1History, Step2Screening, Step3Examination, Step4DoctorRecord,
  Step5Orders, Step6Appointment, Step7Certificate,
];

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
  const completedSteps = useMemo(
    () => getTreatmentCompletedSteps(form, stepIndex),
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
              <BrandSubdueButton variant='outline' leadingIcon='medication'>พิมพ์ใบสั่งยา</BrandSubdueButton>
              <BrandSubdueButton variant='fill' leadingIcon='credit_card'>พิมพ์ OPD Card</BrandSubdueButton>
            </>
          }
        />
        <TreatmentFormShell
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
          <ActiveStep
            form={form}
            setForm={setForm}
            patient={patient}
            cardPatient={cardPatient}
            onStepChange={setStepIndex}
          />
        </TreatmentFormShell>
        <Footer />
      </div>
    </div>
    </ClinicFilterProvider>
  );
};

export default TreatmentFormPage;
