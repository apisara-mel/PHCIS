import React, { useMemo, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import PatientCard from '@/components/card/PatientCard';
import Alert from '@/components/alert/Alert';
import Badge from '@/components/badge/Badge';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import Table, { EllipsisText as TableEllipsisText } from '@/components/table/Table';
import Stepper from '@/components/stepper/Stepper';
import PharmacyLabelPrint from '@/components/pharmacy/PharmacyLabelPrint';
import PharmacyPrescriptionPrint from '@/components/pharmacy/PharmacyPrescriptionPrint';
import PharmacyAuxLabelPrint from '@/components/pharmacy/PharmacyAuxLabelPrint';
import PharmacyPrintLangButton from '@/components/pharmacy/PharmacyPrintLangButton';
import { triggerPharmacyPrint } from '@/components/pharmacy/pharmacyPrintUtils';
import PharmacyVerificationPanel from '@/components/pharmacy/PharmacyVerificationPanel';
import PharmacyCounselingPanel from '@/components/pharmacy/PharmacyCounselingPanel';
import PharmacyDeliveryPanel from '@/components/pharmacy/PharmacyDeliveryPanel';
import PharmacyOwnMedicationsList from '@/components/pharmacy/PharmacyOwnMedicationsList';
import PharmacyMedicationEditor from '@/components/pharmacy/PharmacyMedicationEditor';
import PharmacyChangeDrugPopup from '@/components/pharmacy/PharmacyChangeDrugPopup';
import FormularyStatusBadge from '@/components/pharmacy/FormularyStatusBadge';
import OutOfRightsBadge from '@/components/pharmacy/OutOfRightsBadge';
import PharmacyVoiceSuggestInput from '@/components/pharmacy/PharmacyVoiceSuggestInput';
import PharmacySectionTopic from '@/components/pharmacy/PharmacySectionTopic';
import PharmacyMedicationOrderStatusBadge from '@/components/pharmacy/PharmacyMedicationOrderStatusBadge';
import { PHARMACY_NESTED_PANEL, PHARMACY_WORKLIST_CARD } from '@/pages/pharmacy/pharmacyContentCard';
import RecordWizardMorphBand, { MORPH_STICKY_BELOW_PATIENT } from '@/components/layout/RecordWizardMorphBand';
import PhcisTopToast from '@/components/alert/PhcisTopToast';
import Checkbox from '@/components/checkbox/Checkbox';
import NeutralSubdueIconButton from '@/components/button/NeutralSubdueIconButton';
import DeleteMedicationConfirmPopup from '@/components/popup/DeleteMedicationConfirmPopup';
import Popup from '@/components/popup/Popup';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import Textarea from '@/components/forms/Textarea';
import DragAndDrop from '@/components/form-builder/DragAndDrop';
import { DEFAULT_MR_PATIENT, findMrPatientByHn } from '@/data/mrPatients';
import { getPatientByHN } from '@/data/patientProfiles';
import { resolveMedicationImage } from '@/data/medicationCatalog';
import {
  DISPENSE_STATUS,
  PHARMACY_QUEUE,
  checkAllergyConflicts,
  getStock,
  deductStock,
  updatePharmacyRow,
  findPharmacyRowByQueueNo,
  logMedError,
  toggleItemPrepared,
  toggleOwnMedicationReconciled,
  setOutOfRightsDocAttached,
  addPharmacyItem,
  updatePharmacyItem,
  removePharmacyItem,
  appendPharmacistNote,
  AUX_LABEL_OPTIONS,
  defaultAuxLabelsFor,
  createRefillPlan,
  clearRefillPlan,
  CURRENT_CLINICAL_PHARMACIST,
} from '@/data/pharmacyQueue';
import { appendAuditEvent } from '@/pages/audit/auditData';
import {
  checkDrugInteractions,
  checkDuplicateDrugs,
  checkHighAlert,
  checkOutOfRights,
  checkDisallowedChronicDisease,
  checkDoctorGroupRestriction,
  getRegistryDrug,
} from '@/data/pharmacyRegistry';

const breadcrumb = ['ระบบงานเภสัชกรรม', 'จ่ายยา'];

const Sym = ({ name, size = 18, color }) => (
  <span className='material-symbols-outlined' style={{ fontSize: size, color, lineHeight: 1, display: 'inline-flex' }} aria-hidden>{name}</span>
);

/* Circular drug-photo tile — same 36px/full-radius/neutral-quaternary-ring
   spec as `MedImageTile` in TreatmentSteps.jsx (not exported from there,
   so reproduced locally — this per-page duplication mirrors how OPD /
   Registration / Treatment queue pages each keep their own local `Pill`
   / `Avatar` helpers instead of sharing one). */
const MedImageTile = ({ src, alt }) => {
  const [broken, setBroken] = useState(false);
  const baseStyle = { width: 'var(--dim-size-700, 36px)', height: 'var(--dim-size-700, 36px)', borderRadius: 'var(--dim-radius-full)', border: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary, #F4F5F5)', flexShrink: 0, boxSizing: 'border-box' };
  if (src && !broken) {
    return <img src={src} alt={alt || 'medication'} loading='lazy' onError={() => setBroken(true)} style={{ ...baseStyle, objectFit: 'cover', background: 'var(--surface-card-quaternary, #F9FBFB)' }} />;
  }
  return (
    <span className='inline-flex items-center justify-center' style={{ ...baseStyle, background: 'var(--surface-brandPrimary-quaternary)', color: 'var(--text-brandPrimary-default)' }} aria-hidden>
      <Sym name='medication' size={18} color='currentColor' />
    </span>
  );
};

const SectionCard = ({ title, action, children }) => (
  <div
    className='w-full flex flex-col'
    style={{
      ...PHARMACY_WORKLIST_CARD,
      padding: 'var(--dim-space-600)',
      gap: 'var(--dim-space-400)',
    }}
  >
    {title ? (
      <PharmacySectionTopic title={title} trailing={action || undefined} />
    ) : null}
    {children}
  </div>
);

/* Label + value as two grid cells — parent owns columns so every group's
   left labels share one vertical edge and every group's values share another. */
const SupportingInfoCells = ({ label, children }) => (
  <>
    <span
      className='shrink-0'
      style={{
        color: 'var(--text-content-tertiary)',
        fontSize: 'var(--type-size-sm)',
        fontFamily: 'var(--type-family-body)',
        lineHeight: 1.5,
        paddingTop: 'var(--dim-space-025, 1px)',
      }}
    >
      {label}
    </span>
    <div
      className='min-w-0'
      style={{
        color: 'var(--text-content-default)',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-sm)',
        lineHeight: 1.5,
        whiteSpace: 'pre-wrap',
      }}
    >
      {children}
    </div>
  </>
);

const supportingValue = (value) => (
  <span style={{ color: value ? 'var(--text-content-default)' : 'var(--text-content-secondary)' }}>
    {value || 'ไม่มีข้อมูล'}
  </span>
);

const SUPPORTING_GRID_STYLE_ID = 'mih-pharmacy-supporting-grid-style-v2';
if (typeof document !== 'undefined' && !document.getElementById(SUPPORTING_GRID_STYLE_ID)) {
  const css = document.createElement('style');
  css.id = SUPPORTING_GRID_STYLE_ID;
  css.textContent = `
    .mih-pharmacy-supporting-grid {
      display: grid;
      grid-template-columns: max-content minmax(0, 1fr);
      column-gap: var(--dim-space-400, 16px);
      row-gap: var(--dim-space-300, 12px);
      align-items: start;
      width: 100%;
    }
    @media (min-width: 768px) {
      .mih-pharmacy-supporting-grid {
        /* label · value · label · value — labels/values align across both groups */
        grid-template-columns: max-content minmax(0, 1fr) max-content minmax(0, 1fr);
        column-gap: var(--dim-space-400, 16px);
      }
      /* Extra space between the two groups (after each left-group value) */
      .mih-pharmacy-supporting-grid > :nth-child(4n + 2) {
        padding-right: var(--dim-space-400, 16px);
      }
    }
  `;
  document.head.appendChild(css);
}

/* Attention blink for แพ้ยา / ยาไม่พอ badges in รายการยาที่ต้องจ่าย. */
const ALERT_BADGE_BLINK_STYLE_ID = 'mih-pharmacy-alert-badge-blink-style';
if (typeof document !== 'undefined') {
  const cssText = `
@keyframes mih-pharmacy-alert-badge-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.35; }
}
.mih-pharmacy-alert-badge-blink {
  animation: mih-pharmacy-alert-badge-blink 1.1s ease-in-out infinite;
}
@media (prefers-reduced-motion: reduce) {
  .mih-pharmacy-alert-badge-blink { animation: none; opacity: 1; }
}
`;
  let el = document.getElementById(ALERT_BADGE_BLINK_STYLE_ID);
  if (!el) {
    el = document.createElement('style');
    el.id = ALERT_BADGE_BLINK_STYLE_ID;
    document.head.appendChild(el);
  }
  if (el.textContent !== cssText) el.textContent = cssText;
}

const resolveRow = (queueNo) =>
  findPharmacyRowByQueueNo(queueNo)
  || PHARMACY_QUEUE.find((r) => r.status === DISPENSE_STATUS.CALLED)
  || PHARMACY_QUEUE.find((r) => r.status === DISPENSE_STATUS.WAITING)
  || PHARMACY_QUEUE[0];

const addressLine = (a) => (a ? `${a.houseNo} ${a.road} ${a.subdistrict} ${a.district} ${a.province} ${a.zip}` : '');

/* PatientCard's shape historically comes from `patientProfiles.js`, but
   that roster is a separate, unsynced mock from `mrPatients.js` (the one
   that actually carries `drugAllergies`) — at some HNs the two disagree
   on who the patient even is. Pharmacy cross-checks allergies, so it
   builds the card's `patient` prop directly from the same `mrPatients.js`
   record instead, guaranteeing the header always matches the allergy list
   underneath it. `avatarUrl` is the one field still borrowed from
   `patientProfiles.js` — a photo carries no identity risk the way name/HN
   would, and `mrPatients.js` has no image field of its own. Falls back to
   PatientCard's own initials-avatar when the HN isn't in that roster. */
const toPatientCardShape = (mr) => ({
  fullName: `${mr.prefixTh}${mr.firstNameTh} ${mr.lastNameTh}`,
  englishName: `${mr.prefixEn} ${mr.firstNameEn} ${mr.lastNameEn}`,
  avatarUrl: getPatientByHN(mr.hn)?.avatarUrl,
  hn: mr.hn,
  vip: !!mr.flags?.vip,
  sex: mr.gender,
  age: `${mr.age} ปี`,
  nationalId: mr.nationalId,
  bloodType: mr.bloodType,
  patientType: mr.status === 'active' ? 'ผู้ป่วยเก่า' : 'ผู้ป่วยใหม่',
  doctor: 'พญ.สมหญิง รักษ์ดี',
  insurance: mr.rights,
  address: addressLine(mr.address),
  drugAllergies: mr.drugAllergies || [],
  chronicDiseases: mr.chronicDiseases || [],
});

/* Frequently-typed phrases per free-text field — surfaced as a
   suggestion dropdown once 3+ characters are typed (SuggestibleTextarea
   / PharmacyVoiceSuggestInput). Not pulled from any registry; these are
   just the wording that recurs across real ห้องจ่ายยา exception
   entries, so retyping the whole sentence isn't necessary every time. */
const MED_ERROR_SUGGESTIONS = [
  'ลายมือแพทย์อ่านไม่ออก',
  'คำสั่งยาไม่ครบถ้วน',
  'จ่ายยาผิดขนาด',
  'จ่ายยาผิดชนิด',
  'จ่ายยาผิดคน',
  'ฉลากยาไม่ตรงกับคำสั่งแพทย์',
  'จำนวนยาที่จ่ายไม่ตรงกับใบสั่งยา',
  'ลืมแจ้งข้อควรระวังการใช้ยา',
  'ขนาดยาที่สั่งไม่เหมาะสมกับผู้ป่วย',
  'ยาที่สั่งไม่มีในคลัง ต้องปรึกษาแพทย์เปลี่ยนยา',
];
const NO_SHOW_SUGGESTIONS = [
  'รอเกิน 3 วัน',
  'ผู้ป่วยไม่สะดวกมารับยา',
  'ผู้ป่วยเปลี่ยนใจไม่รับยา',
  'ติดต่อผู้ป่วยไม่ได้',
];
const PROBLEM_SUGGESTIONS = [
  'ลายมือแพทย์อ่านไม่ออก',
  'คำสั่งยาไม่ครบถ้วน',
  'ขนาดยาที่สั่งไม่เหมาะสมกับผู้ป่วย',
  'ยาที่สั่งไม่มีในคลัง ต้องปรึกษาแพทย์เปลี่ยนยา',
  'ข้อมูลผู้ป่วยไม่ตรงกับใบสั่งยา',
];
const REDIAGNOSIS_SUGGESTIONS = [
  'ผู้ป่วยแพ้ยาที่สั่ง — ไม่มียาทดแทนที่เหมาะสม',
  'ขนาดยาที่สั่งไม่เหมาะสมกับผู้ป่วย',
  'ยาที่สั่งไม่มีในคลังและไม่มียาทดแทน',
  'สงสัยวินิจฉัยไม่ตรงกับอาการ/ผลตรวจ',
  'ยาตีกันรุนแรง — ต้องการทบทวนแผนการรักษา',
  'คำสั่งยาไม่ครบถ้วน ต้องให้แพทย์แก้ไข',
];

const MED_ERROR_SEVERITY_OPTIONS = [
  { value: 'low', label: 'ความรุนแรงต่ำ' },
  { value: 'medium', label: 'ความรุนแรงปานกลาง' },
  { value: 'high', label: 'ความรุนแรงสูง' },
];

/* Compact refill / full-qty tags for the การแบ่งจ่าย column. */
const RefillQtyTag = ({ selected, disabled, onClick, title, children }) => (
  <button
    type='button'
    title={title}
    aria-label={title}
    aria-pressed={selected}
    disabled={disabled}
    onMouseDown={(e) => e.stopPropagation()}
    onClick={(e) => {
      e.stopPropagation();
      if (disabled) return;
      onClick?.(e);
    }}
    className='inline-flex items-center justify-center shrink-0'
    style={{
      height: 'var(--dim-size-500, 24px)',
      minWidth: 'var(--dim-size-500, 24px)',
      paddingLeft: 'var(--dim-space-200, 8px)',
      paddingRight: 'var(--dim-space-200, 8px)',
      borderRadius: 'var(--dim-radius-full)',
      border: `var(--dim-stroke-100) solid ${
        selected
          ? 'var(--border-brandPrimary-tertiary, #C5EDDA)'
          : 'var(--border-neutralbutton-tertiary, #E5E7EB)'
      }`,
      background: selected
        ? 'var(--surface-brandPrimary-quaternary, #E6F4EE)'
        : 'var(--surface-neutralbutton-quinary, #F9FAFB)',
      color: selected
        ? 'var(--text-brandprimarybutton-default, #007549)'
        : 'var(--text-content-secondary)',
      fontFamily: 'var(--type-family-body)',
      fontSize: 'var(--type-size-xs)',
      fontWeight: selected ? 'var(--type-weight-medium)' : 'var(--type-weight-regular)',
      lineHeight: 1,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.6 : 1,
      whiteSpace: 'nowrap',
      position: 'relative',
      zIndex: 1,
    }}
  >
    {children}
  </button>
);

const PharmacyDispensePage = () => {
  const history = useHistory();
  const { state: navState } = useLocation();
  const row = resolveRow(navState?.queueNo);

  const mrPatient = findMrPatientByHn(row.hn) || DEFAULT_MR_PATIENT;
  const patient = toPatientCardShape(mrPatient);

  const [alertsOpen, setAlertsOpen] = useState({ allergy: true, interaction: true, duplicate: true, highAlert: true, watch: true, rights: true, orderChanged: true, disease: true, doctorGroup: true });
  const closeAlert = (key) => setAlertsOpen((s) => ({ ...s, [key]: false }));

  /* Splits what used to be one long single-scroll page into 4 steps so the
     pharmacist isn't scanning 9+ stacked sections at once (usability
     feedback: the all-in-one-scroll layout "ดูแล้วงง"). Step 0 — the
     medication list itself, the actual reason for this page — is the
     default/first step per that same feedback (ข้อมูลประกอบการจ่ายยา +
     รายการยาที่ต้องจ่าย must show at the top, not buried under the
     review/alert sections). Uses the same `StepProgress` numbered-circle
     component as the OPD screening flow (`src/pages/opd/ScreeningPage.jsx`)
     — free navigation (`onStepClick` jumps to any step), not a gated
     wizard, since dispensing isn't strictly linear (a pharmacist may need
     to revisit "ตรวจสอบ / แพ้ยา" after starting "จัดยา"). */
  const [currentStep, setCurrentStep] = useState(0);
  const [draftSavedAt, setDraftSavedAt] = useState(null);
  const [draftToast, setDraftToast] = useState(null);

  const [labelLang, setLabelLang] = useState('th');
  const [dispenseNow, setDispenseNow] = useState({});
  const [noShowOpen, setNoShowOpen] = useState(false);
  const [noShowReason, setNoShowReason] = useState('');
  const [problemOpen, setProblemOpen] = useState(false);
  const [problemReason, setProblemReason] = useState('');
  /* Manual Med Error log (ToR §1.9.2.4 "การบันทึกหากมี Med Error") — a
     direct entry point, distinct from the automatic entries `logMedError`
     already writes as a side effect of "ส่งกลับแพทย์"/"แจ้งปัญหาใบยา". */
  const [medErrorOpen, setMedErrorOpen] = useState(false);
  const [medErrorText, setMedErrorText] = useState('');
  const [medErrorSeverity, setMedErrorSeverity] = useState('medium');
  /* null = closed, 'new' = adding a line, an item id = editing that line —
     matches the legacy ห้องจ่ายยา screen's add/double-click-to-edit model. */
  const [editingItemId, setEditingItemId] = useState(null);
  /* Set when the editor was opened via the allergy alert's "เปลี่ยนยา"
     action (TOR: pharmacist must be able to swap an allergy-conflicting
     drug for another one) — lets onSave log a pharmacist note naming both
     the old and new drug once the swap is confirmed. */
  const [allergySwapConflict, setAllergySwapConflict] = useState(null);
  /* Pending row for trash-icon delete confirmation (same chrome as CPOE). */
  const [pendingDeleteItem, setPendingDeleteItem] = useState(null);
  /* Row targeted by the DS เปลี่ยนยา popup (table column or allergy alert). */
  const [changeDrugItem, setChangeDrugItem] = useState(null);
  /* Row targeted by ฉลากช่วย edit popup — draft holds selected phrases until save. */
  const [auxLabelItem, setAuxLabelItem] = useState(null);
  const [auxLabelDraft, setAuxLabelDraft] = useState([]);
  const [auxLabelOtherOn, setAuxLabelOtherOn] = useState(false);
  const [auxLabelOtherText, setAuxLabelOtherText] = useState('');
  /* ส่งกลับแพทย์เพื่อวินิจฉัยใหม่ — null closed; item = from table row;
     'allergy-all' = from allergy alert (all conflicts). */
  const [rediagnosisTarget, setRediagnosisTarget] = useState(null);
  const [rediagnosisReason, setRediagnosisReason] = useState('');
  /* Per-item sent state — leading icon stays as check after confirm. */
  const [rediagnosisSentById, setRediagnosisSentById] = useState({});
  /* แนบเอกสารประกอบ — { item, kind: 'formulary' | 'rights' } + File[] draft. */
  const [supportDocTarget, setSupportDocTarget] = useState(null);
  const [supportDocFiles, setSupportDocFiles] = useState([]);
  /* Preview an already-attached support doc ({ id, name, url, type }). */
  const [supportDocPreview, setSupportDocPreview] = useState(null);

  /* Forces a re-render after mutators change the module-level row in
     place (see `pharmacyQueue.js`) — the object reference stays the
     same so React needs an explicit nudge. */
  const [, forceRender] = useState(0);
  const bump = () => forceRender((n) => n + 1);

  const conflicts = useMemo(() => checkAllergyConflicts(mrPatient, row.items), [mrPatient, row.items]);
  const interactions = useMemo(() => checkDrugInteractions(row.items), [row.items]);
  const duplicates = useMemo(() => checkDuplicateDrugs(row.items), [row.items]);
  const highAlertItems = useMemo(() => checkHighAlert(row.items), [row.items]);
  const outOfRightsItems = useMemo(() => checkOutOfRights(mrPatient.rights, row.items), [mrPatient, row.items]);
  const outOfRightsIds = useMemo(
    () => new Set(outOfRightsItems.map((it) => it.id)),
    [outOfRightsItems],
  );
  const diseaseConflicts = useMemo(() => checkDisallowedChronicDisease(mrPatient, row.items), [mrPatient, row.items]);
  const doctorRestricted = useMemo(() => checkDoctorGroupRestriction(row.items), [row.items]);
  const watch = mrPatient.specialWatch || {};
  const hasWatchFlag = watch.pregnant || watch.breastfeeding || watch.g6pd;

  /* Badge count on the "ตรวจสอบ / แพ้ยา" tab — every distinct CDSS-style
     check that's currently flagging something, so a pharmacist parked on
     the "รายการยา" tab still sees at a glance that something needs review,
     without the alert banners themselves needing to be on-screen. */
  const reviewIssueCount =
    conflicts.length + interactions.length + duplicates.length + highAlertItems.length
    + diseaseConflicts.length + doctorRestricted.length + outOfRightsItems.length
    + (hasWatchFlag ? 1 : 0);

  const DISPENSE_STEPS = [
    { title: 'รายการยา' },
    { title: 'ตรวจสอบ / แพ้ยา', subtitle: reviewIssueCount > 0 ? `${reviewIssueCount} รายการ` : null },
    { title: 'จัดยา' },
    { title: 'ตรวจสอบคำสั่ง / คำแนะนำ / รับยา' },
  ];

  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === DISPENSE_STEPS.length - 1;
  const goPrevStep = () => setCurrentStep((s) => Math.max(0, s - 1));
  const goNextStep = () => setCurrentStep((s) => Math.min(DISPENSE_STEPS.length - 1, s + 1));
  const leaveDispense = () => history.push('/pharmacy/queue');
  const handleSaveDraft = () => {
    setDraftSavedAt(new Date());
    setDraftToast({ id: Date.now(), variant: 'success', message: 'บันทึกร่างการจ่ายยาแล้ว' });
  };
  const draftAutoSaveText = draftSavedAt
    ? `ร่างแบบฟอร์ม (บันทึกล่าสุด: ${draftSavedAt.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false })} น.)`
    : 'ร่างแบบฟอร์ม (บันทึกล่าสุด: ยังไม่ได้บันทึก)';

  /* Allergy conflicts get their own explicit "แพ้ยา" badge directly on the
     row (rather than the generic "?" mark below) so the pharmacist sees
     which drug — and which allergy class — without opening the alert
     banner above the table. */
  const allergyConflictMap = useMemo(() => new Map(conflicts.map((c) => [c.item.id, c])), [conflicts]);

  /* Rows to mark with a "?" for every OTHER conflict type — allergy
     conflicts are called out via `allergyConflictMap` instead.
     Interaction/duplicate conflicts key off drug NAME (not id). */
  const duplicateNames = useMemo(() => new Set(duplicates), [duplicates]);
  const conflictItemIds = useMemo(() => {
    const ids = new Set();
    highAlertItems.forEach((i) => ids.add(i.id));
    diseaseConflicts.forEach((d) => ids.add(d.item.id));
    doctorRestricted.forEach((d) => ids.add(d.item.id));
    const flaggedNames = new Set([
      ...interactions.flatMap((p) => [p.a, p.b]),
      ...duplicates,
    ]);
    row.items.forEach((it) => { if (flaggedNames.has(it.name)) ids.add(it.id); });
    return ids;
  }, [interactions, duplicates, highAlertItems, diseaseConflicts, doctorRestricted, row.items]);

  const itemsWithStock = row.items.map((item, sourceIndex) => {
    const stockEntry = getStock(item.name);
    const remaining = item.quantity - (item.quantityDispensed || 0);
    const effectiveTimestamp = item.statusEffectiveAt
      ? new Date(item.statusEffectiveAt).getTime()
      : Number.NaN;
    const isOrderInactive = item.orderStatus !== 'continue' && (
      item.statusEffectiveMode !== 'scheduled' ||
      !Number.isFinite(effectiveTimestamp) ||
      effectiveTimestamp <= Date.now()
    );
    /* A stopped/completed/held order that has taken effect must never
       contribute stock deduction or a dispense quantity. */
    const qtyNow = isOrderInactive ? 0 : (dispenseNow[item.id] ?? remaining);
    const insufficient = !!stockEntry && qtyNow > stockEntry.stock;
    const unitPrice = stockEntry?.unitPrice ?? 0;
    const subtotal = unitPrice * qtyNow;
    const drug = getRegistryDrug(item.name);
    /* ราคาที่เบิกได้ (ToR §1.9.2.4) — claimable only when the drug is
       eligible under the patient's rights; out-of-rights items are
       ชำระเงินเอง (patient pays, nothing claimable). */
    const claimable = drug?.rightsEligible.includes(mrPatient.rights) ? subtotal : 0;
    const inFormulary = drug ? drug.classification === 'nlem' : true;
    return { ...item, sourceIndex, stockEntry, remaining, qtyNow, insufficient, unitPrice, subtotal, claimable, inFormulary, isOrderInactive };
  }).sort((a, b) => {
    if (!!a.stat !== !!b.stat) return a.stat ? -1 : 1;
    return a.sourceIndex - b.sourceIndex;
  });
  const grandTotal = itemsWithStock.reduce((sum, i) => sum + i.subtotal, 0);
  const claimableTotal = itemsWithStock.reduce((sum, i) => sum + i.claimable, 0);
  /* ยานอกบัญชียาหลัก (NLEM) — คิดจาก itemsWithStock เพราะ flag `inFormulary`
     ถูกเติมตอนนั้น (row.items ดิบยังไม่มีค่านี้) */
  const nonFormularyItems = itemsWithStock.filter((i) => !i.inFormulary);
  const nlemTotal = itemsWithStock.filter((i) => i.inFormulary).reduce((sum, i) => sum + i.subtotal, 0);
  const nonNlemTotal = grandTotal - nlemTotal;
  const hasInsufficientStock = itemsWithStock.some((i) => i.qtyNow > 0 && i.insufficient);
  const hasMissingAuxLabels = itemsWithStock.some((i) => !i.isOrderInactive && !(i.auxLabels || []).length);
  const alreadyDispensed = row.status === DISPENSE_STATUS.DISPENSED;
  /* Closed = irreversible end states — lock the medication table.
     PROBLEM stays editable so เภสัช can still เปลี่ยนยา / ส่งกลับ / ปรับจำนวน
     after flagging (e.g. no safe substitute yet). */
  const isClosed = [
    DISPENSE_STATUS.DISPENSED,
    DISPENSE_STATUS.NO_SHOW,
    DISPENSE_STATUS.CANCELLED,
  ].includes(row.status);
  const isTerminal = isClosed || row.status === DISPENSE_STATUS.PROBLEM;
  const footerPrimaryLabel = isLastStep
    ? (alreadyDispensed ? 'จ่ายยาแล้ว' : row.status === DISPENSE_STATUS.PARTIAL ? 'จ่ายส่วนที่เหลือ' : 'ยืนยันจ่ายยา')
    : `ถัดไป: ${DISPENSE_STEPS[currentStep + 1].title}`;

  /* Inline "เปลี่ยนยา" — PharmacyChangeDrugPopup (เลือกยา → nested ระบุเหตุผล). */
  const handleQuickDrugChange = (item, newName, reason = '') => {
    if (!newName || newName === item.name) return;
    const drug = getRegistryDrug(newName);
    const oldName = item.name;
    updatePharmacyItem(row.queueNo, item.id, {
      name: newName,
      unit: drug?.unit === 'capsule' ? 'แคปซูล' : 'เม็ด',
      auxLabels: defaultAuxLabelsFor(newName),
    });
    const conflict = allergyConflictMap.get(item.id);
    const reasonPart = reason ? ` · เหตุผล: ${reason}` : '';
    appendPharmacistNote(
      row.queueNo,
      conflict
        ? `เปลี่ยนยาเนื่องจากผู้ป่วยแพ้ยา: จาก "${oldName}" (แพ้กลุ่ม ${conflict.allergyClass}) เป็น "${newName}"${reasonPart}`
        : `เปลี่ยนยาจาก "${oldName}" เป็น "${newName}"${reasonPart}`,
    );
    bump();
  };

  const columns = [
    { key: 'seq', label: 'ลำดับ', align: 'center', sortable: false, render: (r, i) => i + 1 },
    { key: 'image', label: 'รูป', sortable: false, render: (r) => <MedImageTile src={resolveMedicationImage(r.name)} alt={r.name} /> },
    {
      key: 'name', label: 'ชื่อยา', flex: true, minWidth: 220,
      render: (r) => {
        const allergyHit = allergyConflictMap.get(r.id);
        const isDuplicate = duplicateNames.has(r.name);
        const conflictHint = isDuplicate
          ? 'มีรายการที่ซ้ำกัน'
          : 'รายการนี้มีปัญหากับผู้ป่วย';
        return (
          <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-050)' }}>
            <div className='flex items-center min-w-0' style={{ gap: 'var(--dim-space-150)' }}>
              {allergyHit && (
                <Badge style='error' size='small' className='mih-pharmacy-alert-badge-blink'>แพ้ยา</Badge>
              )}
              {!allergyHit && conflictItemIds.has(r.id) && (
                <span
                  aria-label={conflictHint}
                  title={conflictHint}
                  className='inline-flex items-center justify-center shrink-0'
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 'var(--dim-radius-full)',
                    background: 'var(--surface-alert-error)',
                    color: 'var(--text-alert-error)',
                    fontSize: 'var(--type-size-xs)',
                    fontWeight: 'var(--type-weight-bold)',
                    cursor: 'help',
                  }}
                >
                  ?
                </span>
              )}
              <TableEllipsisText text={r.name} />
              {r.source === 'remed' && <Badge style='info' size='small'>Re-med</Badge>}
            </div>
            {allergyHit && (
              <span
                style={{
                  color: 'var(--text-alert-error)',
                  fontSize: 'var(--type-size-xs)',
                  fontFamily: 'var(--type-family-body)',
                  lineHeight: 1.4,
                }}
              >
                ผู้ป่วยแพ้กลุ่ม {allergyHit.allergyClass}
                {allergyHit.symptom ? ` — ${allergyHit.symptom}` : ''}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'orderStatus', label: 'สถานะยา', align: 'center', sortable: false,
      render: (r) => (
        <PharmacyMedicationOrderStatusBadge
          status={r.orderStatus}
          effectiveMode={r.statusEffectiveMode}
          effectiveAt={r.statusEffectiveAt}
          lastDoseAt={r.lastDoseAt}
          reason={r.statusReason}
          showDetails
        />
      ),
    },
    {
      key: 'stat', label: 'STAT Dose', align: 'center', sortable: false,
      render: (r) => (r.stat ? <Badge style='error' size='small'>STAT</Badge> : null),
    },
    {
      key: 'outOfFormulary', label: 'ยานอกบัญชี', align: 'center', sortable: false,
      render: (r) => {
        if (r.inFormulary) return null;
        const docs = r.outOfFormularyDocs || [];
        return (
          <div
            className='flex flex-col items-center'
            style={{ gap: 'var(--dim-space-100)' }}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <FormularyStatusBadge inFormulary={false} onlyOut />
            <BrandSubdueButton
              variant='outline'
              size='sm'
              leadingIcon={docs.length ? 'check' : 'upload_file'}
              disabled={isClosed}
              aria-label={`อัปโหลดเอกสารประกอบยานอกบัญชี — ${r.name}`}
              onClick={() => {
                setSupportDocTarget({ item: r, kind: 'formulary' });
                setSupportDocFiles([]);
              }}
            >
              {docs.length ? `แนบแล้ว (${docs.length})` : 'อัปโหลดเอกสาร'}
            </BrandSubdueButton>
          </div>
        );
      },
    },
    {
      key: 'outOfRights', label: 'ยานอกสิทธิ', align: 'center', sortable: false,
      render: (r) => {
        if (!outOfRightsIds.has(r.id)) return null;
        const docs = r.outOfRightsDocs || [];
        return (
          <div
            className='flex flex-col items-center'
            style={{ gap: 'var(--dim-space-100)' }}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <OutOfRightsBadge rightsLabel={mrPatient.rights} />
            <BrandSubdueButton
              variant='outline'
              size='sm'
              leadingIcon={docs.length ? 'check' : 'upload_file'}
              disabled={isClosed}
              aria-label={`อัปโหลดเอกสารประกอบยานอกสิทธิ — ${r.name}`}
              onClick={() => {
                setSupportDocTarget({ item: r, kind: 'rights' });
                setSupportDocFiles([]);
              }}
            >
              {docs.length ? `แนบแล้ว (${docs.length})` : 'อัปโหลดเอกสาร'}
            </BrandSubdueButton>
          </div>
        );
      },
    },
    { key: 'dose', label: 'ขนาด/ความถี่', render: (r) => `${r.dosePerTake} ${r.unit} · ${r.frequency} · ${r.when}` },
    { key: 'quantity', label: 'สั่งทั้งหมด', align: 'center', render: (r) => `${r.quantity} ${r.unit}` },
    {
      key: 'refillPlan', label: 'การแบ่งจ่าย', align: 'center', sortable: false,
      render: (r) => {
        const visitCount = r.refillPlan?.visits?.length;
        const isFull = !r.refillPlan;
        const applyFull = () => {
          clearRefillPlan(row.queueNo, r.id);
          setDispenseNow((s) => ({ ...s, [r.id]: r.remaining }));
          bump();
        };
        const applyRefill = (visits, intervalDays) => {
          const plan = createRefillPlan(row.queueNo, r.id, { visits, intervalDays });
          const qty = plan?.visits?.[0]?.quantity
            ?? Math.max(1, Math.ceil(r.remaining / visits));
          setDispenseNow((s) => ({ ...s, [r.id]: qty }));
          bump();
        };
        return (
          <div
            className='flex flex-col items-center'
            style={{ gap: 'var(--dim-space-100)' }}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              role='group'
              aria-label={`การแบ่งจ่าย ${r.name}`}
              className='flex items-center justify-center'
              style={{ gap: 'var(--dim-space-100)', flexWrap: 'nowrap' }}
            >
              <RefillQtyTag
                selected={isFull}
                disabled={isClosed || r.isOrderInactive || r.remaining <= 0}
                title='จ่ายเต็มจำนวน'
                onClick={applyFull}
              >
                เต็มจำนวน
              </RefillQtyTag>
              <RefillQtyTag
                selected={visitCount === 2}
                disabled={isClosed || r.isOrderInactive || r.remaining <= 0}
                title='แบ่งจ่าย 2 งวด'
                onClick={() => applyRefill(2, 14)}
              >
                2 งวด
              </RefillQtyTag>
              <RefillQtyTag
                selected={visitCount === 3}
                disabled={isClosed || r.isOrderInactive || r.remaining <= 0}
                title='แบ่งจ่าย 3 งวด'
                onClick={() => applyRefill(3, 10)}
              >
                3 งวด
              </RefillQtyTag>
            </div>
            {r.refillPlan && (
              <span
                style={{
                  color: 'var(--text-content-tertiary)',
                  fontSize: 'var(--type-size-xs)',
                  fontFamily: 'var(--type-family-body)',
                  lineHeight: 1.4,
                  textAlign: 'center',
                  whiteSpace: 'nowrap',
                }}
              >
                งวดนี้ {r.refillPlan.visits[0]?.quantity ?? r.qtyNow} {r.unit}
                {' · '}
                รวม {r.remaining} {r.unit} / {visitCount} งวด
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'qtyNow', label: 'สั่งจ่ายครั้งนี้(เม็ด)', align: 'center', sortable: false,
      render: (r) => (
        <div onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
          <Stepper
            size='small'
            value={r.qtyNow}
            min={0}
            max={r.remaining}
            onChange={(n) => setDispenseNow((s) => ({ ...s, [r.id]: n ?? 0 }))}
            disabled={isClosed || r.isOrderInactive || r.remaining <= 0}
            aria-label={`จำนวนที่จะจ่าย ${r.name}`}
          />
        </div>
      ),
    },
    {
      key: 'stock', label: 'คงคลัง', align: 'center',
      render: (r) => r.stockEntry
        ? (
          <Badge
            style={r.insufficient ? 'error' : 'neutral'}
            size='small'
            className={r.insufficient ? 'mih-pharmacy-alert-badge-blink' : undefined}
          >
            {r.stockEntry.stock} {r.stockEntry.unit}{r.insufficient ? ' (ไม่พอ)' : ''}
          </Badge>
        )
        : <span style={{ color: 'var(--text-content-tertiary)' }}>ไม่มีข้อมูล</span>,
    },
    { key: 'subtotal', label: 'ราคารวม (บาท)', align: 'center', render: (r) => r.subtotal.toLocaleString() },
    { key: 'claimable', label: 'ราคาที่เบิกได้ (บาท)', align: 'center', render: (r) => r.claimable > 0 ? r.claimable.toLocaleString() : <span style={{ color: 'var(--text-content-tertiary)' }}>เบิกไม่ได้</span> },
    {
      key: 'auxLabels',
      label: 'ฉลากช่วย (Auxiliary Label) *',
      flex: true,
      minWidth: 200,
      sortable: false,
      render: (r) => {
        const labels = r.auxLabels || [];
        return (
          <div className='flex items-start min-w-0 w-full' style={{ gap: 'var(--dim-space-150)' }}>
            <div className='flex-1 min-w-0'>
              {labels.length === 0 ? (
                <span style={{ color: 'var(--text-alert-error)', fontSize: 'var(--type-size-sm)' }}>
                  ต้องระบุฉลากช่วย
                </span>
              ) : (
                <ul
                  className='flex flex-col min-w-0 m-0'
                  style={{
                    gap: 'var(--dim-space-050)',
                    paddingLeft: 'var(--dim-space-400, 16px)',
                    listStyleType: 'disc',
                    color: 'var(--text-content-default)',
                    fontFamily: 'var(--type-family-body)',
                    fontSize: 'var(--type-size-sm)',
                    lineHeight: 1.4,
                  }}
                >
                  {labels.map((label) => (
                    <li key={label}>{label}</li>
                  ))}
                </ul>
              )}
            </div>
            <NeutralSubdueIconButton
              icon='edit'
              variant='outline'
              size='sm'
              disabled={isClosed}
              aria-label={`แก้ไขฉลากช่วยของ ${r.name}`}
              title='แก้ไขฉลากช่วย'
              onClick={(e) => {
                e?.stopPropagation?.();
                const current = [...(r.auxLabels || [])];
                const presets = current.filter((l) => AUX_LABEL_OPTIONS.includes(l));
                const customs = current.filter((l) => !AUX_LABEL_OPTIONS.includes(l));
                setAuxLabelItem(r);
                setAuxLabelDraft(presets);
                setAuxLabelOtherOn(customs.length > 0);
                setAuxLabelOtherText(customs.join('\n'));
              }}
            />
          </div>
        );
      },
    },
    {
      key: 'itemActions', label: 'ดำเนินการ', align: 'center', sortable: false,
      render: (r) => (
        <div
          className='flex items-center justify-center'
          style={{ gap: 'var(--dim-space-100)' }}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <BrandSubdueButton
            variant='outline'
            size='sm'
            leadingIcon='swap_horiz'
            disabled={isClosed}
            aria-label={`เปลี่ยนยาแทน ${r.name}`}
            onClick={() => setChangeDrugItem(r)}
          >
            เปลี่ยนยา
          </BrandSubdueButton>
          <BrandSubdueButton
            variant='outline'
            size='sm'
            leadingIcon={rediagnosisSentById[r.id] ? 'check' : 'stethoscope'}
            active={Boolean(rediagnosisSentById[r.id])}
            disabled={isClosed}
            aria-label={`ส่งกลับแพทย์เพื่อวินิจฉัยใหม่ — ${r.name}`}
            onClick={() => openSendBackForRediagnosis(r)}
          >
            ส่งกลับแพทย์เพื่อวินิจฉัยใหม่
          </BrandSubdueButton>
          <NeutralSubdueIconButton
            icon='delete'
            variant='outline'
            size='sm'
            disabled={isClosed}
            aria-label={`ลบ ${r.name}`}
            title='ลบรายการยา'
            onClick={() => setPendingDeleteItem(r)}
          />
        </div>
      ),
    },
  ];

  /* ตารางอ่านอย่างเดียวของ step "รายการยา" — ตัดทุกคอลัมน์ที่เป็นการตัดสินใจ
     หรือการกระทำของเภสัชกร (แบ่งจ่าย · สั่งจ่ายครั้งนี้ · คงคลัง · ฉลากช่วย ·
     ปุ่มดำเนินการ) เหลือเฉพาะสิ่งที่แพทย์สั่งมาจริง */
  const READONLY_HIDDEN_COLUMNS = ['refillPlan', 'qtyNow', 'stock', 'auxLabels', 'itemActions'];
  /* ยานอกบัญชี / ยานอกสิทธิ ต้องเห็นตั้งแต่ขั้นนี้ แต่ต้องเป็นป้ายเปล่า ๆ —
     ปุ่มอัปโหลดเอกสารในสองคอลัมน์นั้นเป็น action จึงเหลือไว้ที่ step ตรวจสอบ */
  const orderedItemColumns = columns
    .filter((c) => !READONLY_HIDDEN_COLUMNS.includes(c.key))
    .map((c) => {
      if (c.key === 'outOfFormulary') {
        return {
          ...c,
          render: (r) => (r.inFormulary ? null : <FormularyStatusBadge inFormulary={false} onlyOut />),
        };
      }
      if (c.key === 'outOfRights') {
        return {
          ...c,
          render: (r) => (outOfRightsIds.has(r.id) ? <OutOfRightsBadge rightsLabel={mrPatient.rights} /> : null),
        };
      }
      return c;
    });

  const handleMarkPreparing = () => {
    updatePharmacyRow(row.queueNo, { status: DISPENSE_STATUS.PREPARING });
    bump();
  };

  const handleConfirmDispense = () => {
    if (hasInsufficientStock || hasMissingAuxLabels || isTerminal) return;
    const dispensingItems = itemsWithStock.filter((i) => i.qtyNow > 0);
    deductStock(dispensingItems.map((i) => ({ name: i.name, quantity: i.qtyNow })));
    const nextItems = row.items.map((it) => {
      const withStock = itemsWithStock.find((i) => i.id === it.id);
      return { ...it, quantityDispensed: (it.quantityDispensed || 0) + (withStock?.qtyNow || 0) };
    });
    const allComplete = nextItems.every((it) => {
      const withStock = itemsWithStock.find((candidate) => candidate.id === it.id);
      return withStock?.isOrderInactive || it.quantityDispensed >= it.quantity;
    });
    updatePharmacyRow(row.queueNo, {
      items: nextItems,
      status: allComplete ? DISPENSE_STATUS.DISPENSED : DISPENSE_STATUS.PARTIAL,
      dispensedAt: 'เมื่อครู่',
    });
    setDispenseNow({});
    bump();
    history.push('/pharmacy/queue', { state: { justDispensed: row.queueNo } });
  };

  /* Opens the change-drug popup for the conflicting item (allergy alert). */
  const handleAllergySwap = (conflict) => {
    setAllergySwapConflict(conflict);
    setChangeDrugItem(conflict.item);
  };

  /* TOR: open reason popup before sending back to the prescribing doctor
     for a fresh diagnosis. `item` from a table row; omit for allergy-alert
     bulk action covering all conflicts. */
  const openSendBackForRediagnosis = (item) => {
    if (item) {
      const conflict = conflicts.find((c) => c.item.id === item.id);
      setRediagnosisTarget(item);
      setRediagnosisReason(
        conflict
          ? `ผู้ป่วยแพ้ยา ${item.name} (แพ้กลุ่ม ${conflict.allergyClass})`
          : '',
      );
      return;
    }
    const drugList = conflicts.map((c) => `${c.item.name} (แพ้กลุ่ม ${c.allergyClass})`).join(', ');
    setRediagnosisTarget('allergy-all');
    setRediagnosisReason(drugList ? `ผู้ป่วยแพ้ยา: ${drugList}` : '');
  };

  const closeRediagnosisPopup = () => {
    setRediagnosisTarget(null);
    setRediagnosisReason('');
  };

  const handleConfirmRediagnosis = () => {
    if (!rediagnosisReason.trim() || !rediagnosisTarget) return;
    const reason = `ส่งกลับแพทย์เพื่อวินิจฉัยใหม่: ${rediagnosisReason.trim()}`;
    appendPharmacistNote(row.queueNo, reason);
    logMedError(row.queueNo, reason, 'high');
    updatePharmacyRow(row.queueNo, { status: DISPENSE_STATUS.PROBLEM, problemFlag: true, problemReason: reason });

    const sentIds = rediagnosisTarget === 'allergy-all'
      ? conflicts.map((c) => c.item.id)
      : [rediagnosisTarget.id];
    setRediagnosisSentById((prev) => {
      const next = { ...prev };
      sentIds.forEach((id) => { next[id] = true; });
      return next;
    });
    setDraftToast({ id: Date.now(), variant: 'success', message: 'ส่งสำเร็จแล้ว' });
    closeRediagnosisPopup();
    bump();
  };

  const closeSupportDocPopup = () => {
    setSupportDocTarget(null);
    setSupportDocFiles([]);
  };

  const handleSaveSupportDocs = () => {
    if (!supportDocTarget || !supportDocFiles.length) return;
    const { item, kind } = supportDocTarget;
    const field = kind === 'formulary' ? 'outOfFormularyDocs' : 'outOfRightsDocs';
    const prev = item[field] || [];
    const added = supportDocFiles.map((f, i) => ({
      id: `supdoc-${item.id}-${Date.now()}-${i}`,
      name: f.name,
      size: f.size,
      type: f.type || '',
      url: URL.createObjectURL(f),
    }));
    updatePharmacyItem(row.queueNo, item.id, { [field]: [...prev, ...added] });
    if (kind === 'rights') {
      setOutOfRightsDocAttached(row.queueNo, true);
    }
    appendPharmacistNote(
      row.queueNo,
      `แนบเอกสารประกอบ${kind === 'formulary' ? 'ยานอกบัญชี' : 'ยานอกสิทธิ'}: ${item.name} — ${added.map((d) => d.name).join(', ')}`,
    );
    closeSupportDocPopup();
    bump();
    setDraftToast({ id: Date.now(), variant: 'success', message: 'แนบเอกสารประกอบแล้ว' });
  };

  const handleRemoveSupportDoc = (docId) => {
    if (!supportDocTarget) return;
    const { item, kind } = supportDocTarget;
    const field = kind === 'formulary' ? 'outOfFormularyDocs' : 'outOfRightsDocs';
    const prev = item[field] || [];
    const removed = prev.find((d) => d.id === docId);
    if (removed?.url) URL.revokeObjectURL(removed.url);
    const next = prev.filter((d) => d.id !== docId);
    updatePharmacyItem(row.queueNo, item.id, { [field]: next });
    if (kind === 'rights') {
      const stillAny = row.items.some((it) => {
        if (it.id === item.id) return next.length > 0;
        return (it.outOfRightsDocs || []).length > 0;
      });
      setOutOfRightsDocAttached(row.queueNo, stillAny);
    }
    /* Refresh target from live row so the list updates. */
    const live = findPharmacyRowByQueueNo(row.queueNo)?.items.find((it) => it.id === item.id);
    if (live) setSupportDocTarget({ item: live, kind });
    if (supportDocPreview?.id === docId) setSupportDocPreview(null);
    bump();
  };

  const openSupportDocPreview = (doc) => {
    if (!doc?.url) {
      setDraftToast({ id: Date.now(), variant: 'error', message: 'ไม่พบไฟล์สำหรับดูตัวอย่าง' });
      return;
    }
    setSupportDocPreview(doc);
  };

  const handleLogMedError = () => {
    if (!medErrorText.trim()) return;
    logMedError(row.queueNo, medErrorText.trim(), medErrorSeverity);
    setMedErrorText('');
    setMedErrorSeverity('medium');
    setMedErrorOpen(false);
    bump();
  };

  const handleNoShow = () => {
    if (!noShowReason.trim()) return;
    updatePharmacyRow(row.queueNo, { status: DISPENSE_STATUS.NO_SHOW, noShow: true, noShowReason: noShowReason.trim() });
    history.push('/pharmacy/queue');
  };

  const handleProblem = () => {
    if (!problemReason.trim()) return;
    updatePharmacyRow(row.queueNo, { status: DISPENSE_STATUS.PROBLEM, problemFlag: true, problemReason: problemReason.trim() });
    logMedError(row.queueNo, `ใบยามีปัญหา: ${problemReason.trim()}`, 'high');
    history.push('/pharmacy/queue');
  };

  return (
    <>
    <PharmacyLabelPrint patientName={patient.fullName} hn={row.hn} items={row.items} lang={labelLang} />
    <PharmacyPrescriptionPrint patient={patient.fullName} hn={row.hn} diagnosis={row.diagnosis} doctor={patient.doctor} items={row.items} lang={labelLang} />
    <PharmacyAuxLabelPrint items={row.items} />
    <div className='min-h-screen w-full flex mih-pharmacy-no-print' style={{ background: 'var(--background-screen-brand-100, #F4FBF8)' }}>
      <Sidebar activeKey='pharmacy' />
      <main className='flex-1 flex flex-col min-w-0'>
        <Header breadcrumb={breadcrumb} />
        <PatientCard
          sticky
          showBack={false}
          forceAlertRow
          patient={patient}
          title={`คิว ${row.queueNo} · จ่ายยา`}
          drugAllergies={mrPatient.drugAllergies}
          chronicDiseases={mrPatient.chronicDiseases}
        />
        <RecordWizardMorphBand
          hideTitle
          title={`จ่ายยา · คิว ${row.queueNo}`}
          steps={DISPENSE_STEPS}
          current={currentStep}
          onStepClick={setCurrentStep}
          stickyTop={MORPH_STICKY_BELOW_PATIENT}
        />
        <div className='flex-1 flex flex-col' style={{ padding: 'var(--dim-space-600)', gap: 'var(--dim-space-400)' }}>

          {row.orderChanged && alertsOpen.orderChanged && (
            <Alert type='info' title='แพทย์แก้ไขคำสั่งใช้ยา' subtext={`${row.orderChanged.at} — ${row.orderChanged.note}`}
              showDetail={false} showIndicator={false} showBadge={false} onClose={() => closeAlert('orderChanged')} style={{ maxWidth: '100%' }} />
          )}
          {/* ยกเลิกคำสั่งยา (ToR §1.9.2.10) — mirrors the orderChanged notice
              above but for a full cancellation by the doctor. */}
          {row.orderCancelled && (
            <Alert type='error' title='แพทย์ยกเลิกคำสั่งใช้ยา' subtext={`${row.orderCancelled.at} — ${row.orderCancelled.note}`}
              showDetail={false} showIndicator={false} showBadge={false} showCloseButton={false} style={{ maxWidth: '100%' }} />
          )}
          {/* PROBLEM ไม่ใช่คิวที่ปิดแล้ว แต่ `isTerminal` ปิดปุ่ม "ยืนยันจ่ายยา" ไว้
              — ถ้าไม่บอกเหตุผล เภสัชกรจะเจอปุ่มตายที่ step สุดท้ายโดยไม่รู้ว่าเพราะ
              เพิ่งกด "ส่งกลับแพทย์เพื่อวินิจฉัยใหม่" / "แจ้งปัญหาใบยา" */}
          {row.status === DISPENSE_STATUS.PROBLEM && (
            <Alert
              type='warning'
              title='คิวนี้ถูกส่งกลับแพทย์ / แจ้งปัญหาใบยาไว้'
              subtext={`${row.problemReason || 'รอแพทย์ตรวจสอบคำสั่งใช้ยาอีกครั้ง'} — ปุ่ม "ยืนยันจ่ายยา" จะกลับมาใช้ได้เมื่อคำสั่งใช้ยาถูกแก้ไขและส่งกลับมาที่ห้องยา`}
              showCloseButton={false} style={{ maxWidth: '100%' }}
            />
          )}
          {/* Terminal banners for closed queues only — PROBLEM has its own
              notice above; it is also logged under Med Error. */}
          {isClosed && (
            <Alert
              type={row.status === DISPENSE_STATUS.DISPENSED ? 'success' : 'warning'}
              title={row.status === DISPENSE_STATUS.DISPENSED ? 'จ่ายยาแล้ว' : row.status === DISPENSE_STATUS.NO_SHOW ? 'ผู้รับบริการไม่มารับยา' : 'ใบยาถูกยกเลิก'}
              subtext={row.status === DISPENSE_STATUS.DISPENSED ? `คิว ${row.queueNo} จ่ายยาเรียบร้อยแล้ว` : row.status === DISPENSE_STATUS.CANCELLED ? row.orderCancelled?.note : row.noShowReason}
              showCloseButton={false} style={{ maxWidth: '100%' }}
            />
          )}

          {/* Splits the rest of the page into steps (see `DISPENSE_STEPS`) —
              "รายการยา" first/default so the medication list is the first
              thing the pharmacist sees, not the last of 9 stacked sections. */}

          {currentStep === 1 && (
          <>
          {/* แพ้ยา (PharmacyAllergyEditor) ถูกถอดออกจากขั้นนี้ตามที่สั่ง —
              ประวัติแพ้ยายังแสดงบนแถบ PatientCard ด้านบนทุกขั้นตอนอยู่แล้ว
              และแก้ไขได้จากระบบคัดกรอง/เวชระเบียน ไม่ใช่หน้าจ่ายยา */}

          {/* Alerts */}
          {/* ตามที่สั่ง — ย้ายการแจ้งเตือน แพ้ยา / ยานอกบัญชี / ยานอกสิทธิ
              ไปแสดงที่ step "รายการยา" (อ่านอย่างเดียว) แทน ขั้นนี้เหลือเฉพาะ
              การตรวจสอบที่ต้องลงมือทำ */}
          {interactions.length > 0 && alertsOpen.interaction && (
            <Alert type='warning' title='ความเสี่ยงยาตีกัน (Drug Interaction)'
              subtext={interactions.map((p) => `${p.a} + ${p.b}: ${p.description}`).join(' · ')}
              showDetail={false} showIndicator={false} showBadge={false} onClose={() => closeAlert('interaction')} style={{ maxWidth: '100%' }} />
          )}
          {duplicates.length > 0 && alertsOpen.duplicate && (
            <Alert type='warning' title='พบรายการยาซ้ำ (Duplicate Drug)'
              subtext={`สั่งซ้ำ: ${duplicates.join(', ')} — กรุณาตรวจสอบกับแพทย์ผู้สั่งก่อนจ่าย`}
              showDetail={false} showIndicator={false} showBadge={false} onClose={() => closeAlert('duplicate')} style={{ maxWidth: '100%' }} />
          )}
          {highAlertItems.length > 0 && alertsOpen.highAlert && (
            <Alert type='error' title='มีรายการยาเสี่ยงสูง (High Alert Drug)'
              subtext={`${highAlertItems.map((i) => i.name).join(', ')} — ตรวจสอบขนาดยาและวิธีใช้อย่างละเอียดก่อนจ่าย`}
              showDetail={false} showIndicator={false} showBadge={false} onClose={() => closeAlert('highAlert')} style={{ maxWidth: '100%' }} />
          )}
          {hasWatchFlag && alertsOpen.watch && (
            <Alert type='warning' title='ผู้รับบริการต้องเฝ้าระวังพิเศษ'
              subtext={[watch.pregnant && 'ตั้งครรภ์', watch.breastfeeding && 'ให้นมบุตร', watch.g6pd && 'ภาวะพร่องเอนไซม์ G6PD'].filter(Boolean).join(' · ')}
              showDetail={false} showIndicator={false} showBadge={false} onClose={() => closeAlert('watch')} style={{ maxWidth: '100%' }} />
          )}
          {diseaseConflicts.length > 0 && alertsOpen.disease && (
            <Alert type='error' title='ยาขัดแย้งกับโรคประจำตัวของผู้ป่วย'
              subtext={diseaseConflicts.map((d) => `${d.item.name} ไม่ควรใช้ในผู้ป่วยที่มีโรคประจำตัว "${d.disease}"`).join(' · ')}
              showDetail={false} showIndicator={false} showBadge={false} onClose={() => closeAlert('disease')} style={{ maxWidth: '100%' }} />
          )}
          {doctorRestricted.length > 0 && alertsOpen.doctorGroup && (
            <Alert type='warning' title='ยาจำกัดกลุ่มแพทย์ผู้สั่ง'
              subtext={doctorRestricted.map((d) => `${d.item.name} — สั่งจ่ายได้เฉพาะกลุ่มแพทย์ "${d.group}" เท่านั้น กรุณายืนยันสิทธิ์แพทย์ผู้สั่งก่อนจ่าย`).join(' · ')}
              showDetail={false} showIndicator={false} showBadge={false} onClose={() => closeAlert('doctorGroup')} style={{ maxWidth: '100%' }} />
          )}
          {/* Exception actions — moved here (was its own section further down
              the old single-scroll page) since reporting a no-show/problem
              belongs with the rest of "ตรวจสอบ / แพ้ยา". */}
          {!isClosed && (
            <SectionCard title='กรณีพิเศษ'>
              <div className='flex flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
                <NeutralSubdueButton variant='outline' size='sm' leadingIcon='person_off' onClick={() => setNoShowOpen((v) => !v)}>ผู้รับบริการไม่มารับยา</NeutralSubdueButton>
                <NeutralSubdueButton variant='outline' size='sm' leadingIcon='report' onClick={() => setProblemOpen((v) => !v)}>แจ้งปัญหาใบยา</NeutralSubdueButton>
              </div>
              {noShowOpen && (
                <div className='flex flex-wrap items-end' style={{ gap: 'var(--dim-space-300)' }}>
                  <PharmacyVoiceSuggestInput
                    value={noShowReason} onChange={setNoShowReason}
                    placeholder='ระบุเหตุผล เช่น รอเกิน 3 วัน'
                    suggestions={NO_SHOW_SUGGESTIONS}
                    aria-label='เหตุผลที่ไม่มารับยา'
                  />
                  <BrandSubdueButton variant='outline' size='sm' disabled={!noShowReason.trim()} onClick={handleNoShow}>ยืนยัน</BrandSubdueButton>
                </div>
              )}
              {problemOpen && (
                <div className='flex flex-wrap items-end' style={{ gap: 'var(--dim-space-300)' }}>
                  <PharmacyVoiceSuggestInput
                    value={problemReason} onChange={setProblemReason}
                    placeholder='ระบุปัญหา เช่น ลายมือแพทย์อ่านไม่ออก'
                    suggestions={PROBLEM_SUGGESTIONS}
                    aria-label='ปัญหาใบยา'
                  />
                  <BrandSubdueButton variant='outline' size='sm' disabled={!problemReason.trim()} onClick={handleProblem}>ยืนยัน</BrandSubdueButton>
                </div>
              )}
            </SectionCard>
          )}
          </>
          )}

          {currentStep === 0 && (
          <>
          {/* ข้อมูลประกอบการจ่ายยา (ToR §1.9.2.2–3 / §1.9.4.2) — Doctor /
              Nurse Note, ผลการวินิจฉัย, lab/xray, ประวัติรักษา/ปรึกษา, นัดหมาย. */}
          <SectionCard title='ข้อมูลประกอบการจ่ายยา'>
            {/* 4-col on md+ (label · value · label · value) so left labels
                across both groups share one edge and values share another.
                2-col stacked pairs on small screens. */}
            <div className='mih-pharmacy-supporting-grid text-sm'>
              <SupportingInfoCells label='ผลการวินิจฉัย'>
                {supportingValue(row.supportingInfo.diagnosis)}
              </SupportingInfoCells>
              <SupportingInfoCells label='Vital Signs'>
                {supportingValue(row.supportingInfo.vitals)}
              </SupportingInfoCells>
              <SupportingInfoCells label='ข้อมูลนัดหมาย'>
                {supportingValue(row.supportingInfo.appointmentInfo)}
              </SupportingInfoCells>
              <SupportingInfoCells label='Doctor Note'>
                {supportingValue(row.supportingInfo.doctorNote)}
              </SupportingInfoCells>
              <SupportingInfoCells label='Nurse Note'>
                {supportingValue(row.supportingInfo.nurseNote)}
              </SupportingInfoCells>
              <SupportingInfoCells label='ประวัติการรักษา'>
                {supportingValue(row.supportingInfo.treatmentHistory)}
              </SupportingInfoCells>
              <SupportingInfoCells label='ประวัติส่งปรึกษา'>
                {supportingValue(row.supportingInfo.consultHistory)}
              </SupportingInfoCells>
              <SupportingInfoCells label='ผลตรวจทางห้องปฏิบัติการ'>
                {row.supportingInfo.labResults?.length ? (
                  <ul
                    className='flex flex-col m-0 p-0 list-none'
                    style={{ gap: 'var(--dim-space-100)' }}
                  >
                    {row.supportingInfo.labResults.map((l, idx) => (
                      <li
                        key={`${l.test}-${idx}`}
                        className='flex flex-wrap items-center'
                        style={{ gap: 'var(--dim-space-200)' }}
                      >
                        <span>
                          {l.date ? `${l.date} · ` : ''}{l.test}{l.result ? ` ${l.result}` : ''}
                        </span>
                        {l.flag && l.flag !== 'normal' && (
                          <Badge style={l.flag === 'critical' ? 'error' : 'warning'} size='small'>
                            {l.flag === 'critical' ? 'Critical' : 'ผิดปกติ'}
                          </Badge>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  supportingValue(null)
                )}
              </SupportingInfoCells>
              <SupportingInfoCells label='ผลตรวจทางรังสีวิทยา'>
                {supportingValue(row.supportingInfo.radiologyResults)}
              </SupportingInfoCells>
            </div>
          </SectionCard>

          {/* ความเสี่ยงของใบสั่งยานี้ — อ่านอย่างเดียว ไม่มีปุ่ม เพราะขั้นนี้คือ
              "แพทย์สั่งอะไรมา" การแก้ไข/เปลี่ยนยา/แนบเอกสารอยู่ที่ step ตรวจสอบ */}
          {conflicts.length > 0 && (
            <Alert
              type='warning'
              title='ผู้รับบริการมีประวัติแพ้ยาที่ตรงกับรายการในใบสั่งยา'
              subtext={conflicts.map((c) => `${c.item.name} อยู่ในกลุ่ม ${c.allergyClass} ซึ่งผู้ป่วยมีประวัติแพ้ (${c.symptom})`).join(' · ')}
              showDetail={false} showIndicator={false} showBadge={false} showCloseButton={false}
              style={{ maxWidth: '100%' }}
            />
          )}
          {nonFormularyItems.length > 0 && (
            <Alert
              type='warning'
              title='มีรายการยานอกบัญชียาหลัก'
              subtext={`${nonFormularyItems.map((i) => i.name).join(', ')} — โดยทั่วไปต้องมีเหตุผล/เอกสารประกอบการสั่งใช้`}
              showDetail={false} showIndicator={false} showBadge={false} showCloseButton={false}
              style={{ maxWidth: '100%' }}
            />
          )}
          {outOfRightsItems.length > 0 && (
            <Alert
              type='error'
              title='มีรายการยานอกสิทธิการรักษา'
              subtext={`${outOfRightsItems.map((i) => i.name).join(', ')} ไม่อยู่ในสิทธิ "${mrPatient.rights}" ของผู้ป่วย — ต้องมีเอกสารประกอบหรือให้ผู้ป่วยชำระเงินเอง`}
              showDetail={false} showIndicator={false} showBadge={false} showCloseButton={false}
              style={{ maxWidth: '100%' }}
            />
          )}

          {/* Step 1 = อ่านอย่างเดียว: เภสัชกรดู "แพทย์สั่งอะไรมา" ก่อน แล้วค่อย
              ลงมือแก้/จัด/พิมพ์ในขั้นตรวจสอบ (step 2) — ตารางที่แก้ไขได้พร้อม
              ปุ่มทั้งหมดย้ายไปอยู่ที่นั่นแล้ว */}
          <SectionCard title='รายการยาที่แพทย์สั่ง'>
            <Table
              columns={orderedItemColumns}
              rows={itemsWithStock}
              rowKey={(r) => r.id}
              stickyColCount={3}
              emptyMessage='ไม่มีรายการยา'
            />
          </SectionCard>
          </>
          )}

          {currentStep === 1 && (
          <>
          {/* Medication table */}
          <SectionCard
            title='รายการยาที่ต้องจ่าย'
            action={
              <div className='flex items-center' style={{ gap: 'var(--dim-space-200)' }}>
                <PharmacyPrintLangButton
                  mode='label'
                  label='พิมพ์ฉลากยา'
                  leadingIcon='print'
                  onLangChange={setLabelLang}
                />
                <PharmacyPrintLangButton
                  mode='prescription'
                  label='พิมพ์ใบสั่งยา'
                  leadingIcon='description'
                  onLangChange={setLabelLang}
                />
                <BrandSubdueButton
                  variant='outline'
                  size='sm'
                  leadingIcon='sticky_note_2'
                  onClick={() => triggerPharmacyPrint('auxlabel')}
                >
                  พิมพ์ฉลากช่วย
                </BrandSubdueButton>
                {!isClosed && (
                  <BrandSubdueButton variant='outline' size='sm' leadingIcon='add' onClick={() => setEditingItemId('new')}>
                    เพิ่มรายการยา
                  </BrandSubdueButton>
                )}
              </div>
            }
          >
            {row.status === DISPENSE_STATUS.PREPARING && <Badge style='info' size='small'>จัดยาแล้ว — รอยืนยันจ่ายยา</Badge>}
            <Table columns={columns} rows={itemsWithStock} rowKey={(r) => r.id} stickyColCount={3} emptyMessage='ไม่มีรายการยา' />
            <PharmacyMedicationEditor
              key={editingItemId || 'closed'}
              open={Boolean(editingItemId)}
              item={editingItemId && editingItemId !== 'new'
                ? row.items.find((it) => it.id === editingItemId)
                : null}
              allergies={mrPatient.drugAllergies}
              onCancel={() => { setEditingItemId(null); setAllergySwapConflict(null); }}
              onSave={(patch) => {
                if (editingItemId === 'new') {
                  const addedAt = new Date().toISOString();
                  addPharmacyItem(row.queueNo, {
                    ...patch,
                    addedByPharmacist: CURRENT_CLINICAL_PHARMACIST.name,
                    addedAt,
                  });
                  appendPharmacistNote(
                    row.queueNo,
                    `เพิ่มรายการยา "${patch.name}" โดยเภสัชกร · เหตุผล: ${patch.additionReason}`,
                    CURRENT_CLINICAL_PHARMACIST.name,
                  );
                  appendAuditEvent({
                    user: CURRENT_CLINICAL_PHARMACIST.name,
                    action: `เพิ่มยา ${patch.name} ในใบสั่งยา ${row.queueNo} · เหตุผล: ${patch.additionReason}`,
                    mod: 'ห้องยา',
                    ok: true,
                  });
                } else if (editingItemId) {
                  const oldItem = row.items.find((it) => it.id === editingItemId);
                  updatePharmacyItem(row.queueNo, editingItemId, patch);
                  if (allergySwapConflict?.item.id === editingItemId && patch.name !== oldItem?.name) {
                    appendPharmacistNote(
                      row.queueNo,
                      `เปลี่ยนยาเนื่องจากผู้ป่วยแพ้ยา: จาก "${oldItem.name}" (แพ้กลุ่ม ${allergySwapConflict.allergyClass}) เป็น "${patch.name}"`,
                    );
                  }
                }
                setEditingItemId(null);
                setAllergySwapConflict(null);
                bump();
              }}
            />
            <div
              className='flex flex-col items-end w-full'
              style={{
                paddingTop: 'var(--dim-space-200)',
                borderTop: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary, #F4F5F5)',
                gap: 'var(--dim-space-100)',
              }}
            >
              <span className='text-xs' style={{ color: 'var(--text-content-tertiary)' }}>
                ยาในบัญชี {nlemTotal.toLocaleString()} · ยานอกบัญชี {nonNlemTotal.toLocaleString()} · เบิกได้ {claimableTotal.toLocaleString()} บาท
              </span>
              <div className='flex items-center' style={{ gap: 'var(--dim-space-200)' }}>
                <span className='text-sm' style={{ color: 'var(--text-content-secondary)' }}>ยอดรวมทั้งใบสั่งยา</span>
                <span
                  style={{
                    color: 'var(--text-content-default)',
                    fontFamily: 'var(--type-family-body)',
                    fontSize: 'var(--type-size-xl, 20px)',
                    fontWeight: 'var(--type-weight-bold)',
                    lineHeight: 1.3,
                  }}
                >
                  {grandTotal.toLocaleString()} บาท
                </span>
              </div>
            </div>

            {/* แจ้งปัญหาใบยา / Med Error (ToR §1.9.2.4) — form ใน Popup */}
            <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)', paddingTop: 'var(--dim-space-200)', borderTop: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary, #F4F5F5)' }}>
              <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
                <span className='text-xs' style={{ color: 'var(--text-content-tertiary)', fontWeight: 'var(--type-weight-bold)' }}>
                  ยาไม่มีในคลัง / สั่งไม่ครบ / อ่านใบยาไม่ได้
                </span>
                {!isClosed && (
                  <NeutralSubdueButton
                    variant='outline'
                    size='sm'
                    leadingIcon='report'
                    onClick={() => setMedErrorOpen(true)}
                  >
                    แจ้งปัญหาใบยา (MedError)
                  </NeutralSubdueButton>
                )}
              </div>
              {row.medErrors.length > 0 && (
                <div className='flex flex-col' style={{ gap: 'var(--dim-space-150)' }}>
                  {row.medErrors.map((e) => (
                    <div key={e.id} className='flex items-start flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
                      <span className='text-xs' style={{ color: 'var(--text-content-tertiary)', whiteSpace: 'nowrap' }}>{e.at} · {e.by}</span>
                      <Badge style={e.severity === 'high' ? 'error' : e.severity === 'medium' ? 'warning' : 'neutral'} size='small'>
                        {{ low: 'ต่ำ', medium: 'ปานกลาง', high: 'สูง' }[e.severity] || e.severity}
                      </Badge>
                      <span className='text-xs flex-1 min-w-0' style={{ color: 'var(--text-content-secondary)' }}>{e.description}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </SectionCard>
          </>
          )}

          {currentStep === 2 && (
          <>
          {/* จัดยา checklist (ToR §1.9.3 — บันทึกสถานะการจัด และตรวจสอบรายการยา
              ทีละรายการ ก่อนเปลี่ยนสถานะเป็น "จัดยาแล้ว") */}
          {!isClosed && row.status !== DISPENSE_STATUS.WAITING && (
            <SectionCard
              title='จัดยา — ตรวจสอบรายการก่อนจ่าย'
              action={
                row.status === DISPENSE_STATUS.CALLED && (
                  <BrandSubdueButton
                    variant='outline' size='sm' leadingIcon='inventory_2'
                    disabled={!row.items.every((it) => it.prepared)}
                    onClick={handleMarkPreparing}
                  >
                    ยืนยันจัดยาแล้ว
                  </BrandSubdueButton>
                )
              }
            >
              <div className='flex flex-col' style={{ gap: 'var(--dim-space-200)' }}>
                {row.items.map((item) => (
                  <div
                    key={item.id}
                    className='flex items-center w-full'
                    style={{ ...PHARMACY_NESTED_PANEL, padding: 'var(--dim-space-300)' }}
                  >
                    <Checkbox
                      checked={!!item.prepared}
                      onChange={() => { toggleItemPrepared(row.queueNo, item.id); bump(); }}
                      label={item.name}
                      badge={<span className='text-xs' style={{ color: 'var(--text-content-tertiary)' }}>{item.quantity} {item.unit}</span>}
                    />
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {/* Medication Reconciliation — pharmacist can tick จัดยาแล้ว per
              line (§1.9.5.5); current Rx syncs `prepared`, own-meds use
              `reconciled`. */}
          <SectionCard title='การประสานรายการยา (Medication Reconciliation)'>
            <Table
              columns={[
                {
                  key: 'checked', label: 'จัดยาแล้ว', align: 'center', sortable: false,
                  render: (r) => (
                    <div
                      className='flex justify-center'
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Checkbox
                        checked={!!r.checked}
                        disabled={isClosed}
                        aria-label={`จัดยาแล้ว — ${r.name}`}
                        onChange={() => {
                          if (r.source === 'current') toggleItemPrepared(row.queueNo, r.itemId);
                          else toggleOwnMedicationReconciled(row.queueNo, r.ownId);
                          bump();
                        }}
                      />
                    </div>
                  ),
                },
                {
                  key: 'name', label: 'ชื่อยา', flex: true, minWidth: 220,
                  render: (r) => (
                    <div className='flex items-center min-w-0' style={{ gap: 'var(--dim-space-200)' }}>
                      <MedImageTile src={resolveMedicationImage(r.name)} alt={r.name} />
                      <TableEllipsisText text={r.name} />
                    </div>
                  ),
                },
                { key: 'source', label: 'แหล่งที่มา', render: (r) => <Badge style={r.source === 'current' ? 'success' : 'info'} size='small'>{r.source === 'current' ? 'ใบสั่งยาปัจจุบัน' : 'ยาที่ผู้ป่วยนำมาเอง'}</Badge> },
                { key: 'note', label: 'หมายเหตุ', flex: true, minWidth: 200, render: (r) => r.note || '—' },
              ]}
              rows={[
                /* §1.9.5.6 — a Re-med carry-forward item dispensed at 0
                   additional units this visit still gets a reconciliation
                   line, with a note that reads as "continued", not "empty". */
                ...row.items.map((it) => ({
                  id: `cur-${it.id}`,
                  itemId: it.id,
                  name: it.name,
                  source: 'current',
                  checked: !!it.prepared,
                  note: it.source === 'remed' && it.quantity === 0
                    ? 'ต่อเนื่องจากรายการเดิม — ไม่มีการจ่ายเพิ่มครั้งนี้'
                    : it.instructions,
                })),
                ...row.ownMedications.map((m) => ({
                  id: `own-${m.id}`,
                  ownId: m.id,
                  name: m.name,
                  source: 'own',
                  checked: !!m.reconciled,
                  note: m.note,
                })),
              ]}
              rowKey={(r) => r.id}
              emptyMessage='ไม่มีข้อมูล'
            />
          </SectionCard>

          {/* §1.9.5.9 — own medications as a separate section (DS form fields). */}
          <SectionCard title='ยาที่ผู้รับบริการนำมาเอง'>
            <PharmacyOwnMedicationsList
              queueNo={row.queueNo}
              row={row}
              onChange={bump}
              disabled={isClosed}
            />
          </SectionCard>
          </>
          )}

          {currentStep === 3 && (
          <>
          <SectionCard title='ตรวจสอบคำสั่งใช้ยา'>
            <PharmacyVerificationPanel queueNo={row.queueNo} row={row} onChange={bump} />
          </SectionCard>

          <SectionCard title='คำแนะนำการใช้ยา'>
            <PharmacyCounselingPanel queueNo={row.queueNo} row={row} onChange={bump} />
          </SectionCard>

          <SectionCard title='การรับยา'>
            <PharmacyDeliveryPanel queueNo={row.queueNo} row={row} onChange={bump} />
          </SectionCard>
          </>
          )}
        </div>

        <Footer
          type='with BTN'
          sticky
          /* Step 1 (รูปที่ 1): no auto-save chip. Step 2+ (รูปที่ 2): show draft status. */
          showAutoSave={!isFirstStep}
          autoSaveText={draftAutoSaveText}
          showButton3
          button3Label={isFirstStep ? 'ยกเลิก' : 'ย้อนกลับ'}
          onButton3Click={isFirstStep ? leaveDispense : goPrevStep}
          showButton2
          button2Label='บันทึกร่าง'
          button2Icon='save'
          onButton2Click={handleSaveDraft}
          showButton1
          button1Label={footerPrimaryLabel}
          button1TrailingIcon={isLastStep ? 'check' : 'arrow_forward'}
          button1Disabled={isLastStep && (hasInsufficientStock || hasMissingAuxLabels || isTerminal)}
          onButton1Click={isLastStep ? handleConfirmDispense : goNextStep}
        />
        <PhcisTopToast session={draftToast} onDismiss={() => setDraftToast(null)} />
      </main>
    </div>
    <DeleteMedicationConfirmPopup
      open={Boolean(pendingDeleteItem)}
      medicationName={pendingDeleteItem?.name}
      onClose={() => setPendingDeleteItem(null)}
      onConfirm={(reason) => {
        if (!pendingDeleteItem) return;
        appendPharmacistNote(row.queueNo, `ลบรายการยา "${pendingDeleteItem.name}" · เหตุผล: ${reason}`);
        removePharmacyItem(row.queueNo, pendingDeleteItem.id);
        setPendingDeleteItem(null);
        bump();
      }}
    />
    <PharmacyChangeDrugPopup
      open={Boolean(changeDrugItem)}
      currentName={changeDrugItem?.name || ''}
      allergies={mrPatient.drugAllergies}
      onClose={() => {
        setChangeDrugItem(null);
        setAllergySwapConflict(null);
      }}
      onConfirm={(payload) => {
        if (!changeDrugItem) return;
        const newName = typeof payload === 'string' ? payload : payload?.name;
        const reason = typeof payload === 'string' ? '' : (payload?.reason || '');
        handleQuickDrugChange(changeDrugItem, newName, reason);
        setChangeDrugItem(null);
        setAllergySwapConflict(null);
      }}
    />
    <Popup
      open={Boolean(auxLabelItem)}
      onClose={() => {
        setAuxLabelItem(null);
        setAuxLabelDraft([]);
        setAuxLabelOtherOn(false);
        setAuxLabelOtherText('');
      }}
      size='large'
      title='แก้ไขฉลากช่วย (Auxiliary Label)'
      subtitle={auxLabelItem ? `ยา: ${auxLabelItem.name}` : undefined}
      secondaryAction={{
        label: 'ยกเลิก',
        onClick: () => {
          setAuxLabelItem(null);
          setAuxLabelDraft([]);
          setAuxLabelOtherOn(false);
          setAuxLabelOtherText('');
        },
      }}
      primaryAction={{
        label: 'บันทึก',
        onClick: () => {
          if (!auxLabelItem) return;
          const other = auxLabelOtherText.trim();
          if (auxLabelOtherOn && !other) return;
          const next = [
            ...auxLabelDraft,
            ...(auxLabelOtherOn && other ? [other] : []),
          ];
          if (next.length === 0) return;
          updatePharmacyItem(row.queueNo, auxLabelItem.id, { auxLabels: next });
          setAuxLabelItem(null);
          setAuxLabelDraft([]);
          setAuxLabelOtherOn(false);
          setAuxLabelOtherText('');
          bump();
        },
        disabled: (
          (auxLabelOtherOn && !auxLabelOtherText.trim())
          || (auxLabelDraft.length === 0 && !(auxLabelOtherOn && auxLabelOtherText.trim()))
        ),
      }}
      bodyStyle={{ gap: 'var(--dim-space-300)', display: 'flex', flexDirection: 'column' }}
    >
      <p
        style={{
          margin: 0,
          color: 'var(--text-content-secondary)',
          fontSize: 'var(--type-size-sm)',
          fontFamily: 'var(--type-family-body)',
          lineHeight: 1.5,
        }}
      >
        ทุกรายการยาต้องมีฉลากช่วยอย่างน้อย 1 ข้อ
      </p>
      <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200)' }}>
        {AUX_LABEL_OPTIONS.map((label) => {
          const checked = auxLabelDraft.includes(label);
          return (
            <Checkbox
              key={label}
              checked={checked}
              label={label}
              onChange={(next) => {
                setAuxLabelDraft((prev) => (
                  next
                    ? (prev.includes(label) ? prev : [...prev, label])
                    : prev.filter((l) => l !== label)
                ));
              }}
            />
          );
        })}
        <Checkbox
          checked={auxLabelOtherOn}
          label='อื่นๆ'
          onChange={(next) => {
            setAuxLabelOtherOn(next);
            if (!next) setAuxLabelOtherText('');
          }}
        />
        {auxLabelOtherOn && (
          <Textarea
            label='ระบุฉลากช่วย'
            required
            showLabel
            value={auxLabelOtherText}
            onChange={setAuxLabelOtherText}
            placeholder='พิมพ์ข้อความฉลากช่วยเพิ่มเติม'
            rows={3}
            minHeight={96}
          />
        )}
      </div>
    </Popup>
    <Popup
      open={medErrorOpen}
      onClose={() => {
        setMedErrorOpen(false);
        setMedErrorText('');
        setMedErrorSeverity('medium');
      }}
      size='large'
      title='แจ้งปัญหาใบยา (MedError)'
      subtitle='บันทึก Med Error ระบุรายละเอียดและความรุนแรง'
      secondaryAction={{
        label: 'ยกเลิก',
        onClick: () => {
          setMedErrorOpen(false);
          setMedErrorText('');
          setMedErrorSeverity('medium');
        },
      }}
      primaryAction={{
        label: 'บันทึก',
        onClick: handleLogMedError,
        disabled: !medErrorText.trim(),
      }}
      bodyStyle={{ gap: 'var(--dim-space-400)', display: 'flex', flexDirection: 'column' }}
    >
      <SuggestibleTextarea
        voice
        label='ระบุปัญหา'
        required
        value={medErrorText}
        onChange={(e) => setMedErrorText(e?.target?.value ?? '')}
        suggestions={MED_ERROR_SUGGESTIONS}
        minChars={3}
        height={120}
        minHeight={96}
        placeholder='พิมพ์หรือพูด เช่น ลายมือแพทย์อ่านไม่ออก / จ่ายยาผิดขนาด'
        popoverAriaLabel='คำแนะนำปัญหาใบยา'
      />
      <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200)' }}>
        <span
          className='flex items-center'
          style={{
            gap: 'var(--dim-space-100)',
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-sm)',
            fontWeight: 'var(--type-weight-regular)',
            lineHeight: 1.5,
            color: 'var(--text-neutral-default)',
          }}
        >
          ระดับความรุนแรง
          <span style={{ color: 'var(--text-input-require, #DC2626)' }} aria-hidden>*</span>
        </span>
        <div
          role='radiogroup'
          aria-label='ระดับความรุนแรง'
          className='flex flex-wrap'
          style={{ gap: 'var(--dim-space-200)' }}
        >
          {MED_ERROR_SEVERITY_OPTIONS.map((opt) => {
            const selected = medErrorSeverity === opt.value;
            return (
              <BrandSubdueButton
                key={opt.value}
                variant={selected ? 'fill' : 'outline'}
                size='sm'
                active={selected}
                onClick={() => setMedErrorSeverity(opt.value)}
              >
                {opt.label}
              </BrandSubdueButton>
            );
          })}
        </div>
      </div>
    </Popup>
    <Popup
      open={Boolean(rediagnosisTarget)}
      onClose={closeRediagnosisPopup}
      size='large'
      title='ส่งกลับแพทย์เพื่อวินิจฉัยใหม่'
      subtitle={
        rediagnosisTarget && rediagnosisTarget !== 'allergy-all'
          ? `ยาที่เกี่ยวข้อง: ${rediagnosisTarget.name}`
          : 'ระบุเหตุผลก่อนส่งกลับให้แพทย์ทบทวนวินิจฉัย/คำสั่งยา'
      }
      secondaryAction={{
        label: 'ยกเลิก',
        onClick: closeRediagnosisPopup,
      }}
      primaryAction={{
        label: 'ยืนยันส่งกลับ',
        onClick: handleConfirmRediagnosis,
        disabled: !rediagnosisReason.trim(),
      }}
      bodyStyle={{ gap: 'var(--dim-space-400)', display: 'flex', flexDirection: 'column' }}
    >
      <SuggestibleTextarea
        voice
        label='ระบุเหตุผล'
        required
        value={rediagnosisReason}
        onChange={(e) => setRediagnosisReason(e?.target?.value ?? '')}
        suggestions={REDIAGNOSIS_SUGGESTIONS}
        minChars={3}
        height={120}
        minHeight={96}
        placeholder='พิมพ์หรือพูดเหตุผลที่ต้องส่งกลับแพทย์ เช่น ไม่มียาทดแทนที่เหมาะสม'
        popoverAriaLabel='คำแนะนำเหตุผลส่งกลับแพทย์'
      />
    </Popup>
    <Popup
      open={Boolean(supportDocTarget)}
      onClose={closeSupportDocPopup}
      size='large'
      title={
        supportDocTarget?.kind === 'formulary'
          ? 'แนบเอกสารประกอบยานอกบัญชี'
          : 'แนบเอกสารประกอบยานอกสิทธิ'
      }
      subtitle={supportDocTarget ? `ยา: ${supportDocTarget.item.name}` : ''}
      secondaryAction={{
        label: 'ยกเลิก',
        onClick: closeSupportDocPopup,
      }}
      primaryAction={{
        label: 'บันทึกเอกสาร',
        onClick: handleSaveSupportDocs,
        disabled: !supportDocFiles.length,
      }}
      bodyStyle={{ gap: 'var(--dim-space-400)', display: 'flex', flexDirection: 'column' }}
    >
      {(() => {
        const existing = supportDocTarget
          ? ((supportDocTarget.kind === 'formulary'
            ? supportDocTarget.item.outOfFormularyDocs
            : supportDocTarget.item.outOfRightsDocs) || [])
          : [];
        if (!existing.length) return null;
        return (
          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200)' }}>
            <span
              style={{
                fontFamily: 'var(--type-family-body)',
                fontSize: 'var(--type-size-sm)',
                color: 'var(--text-content-secondary)',
              }}
            >
              เอกสารที่แนบแล้ว
            </span>
            {existing.map((doc) => (
              <div
                key={doc.id}
                className='flex items-center w-full'
                style={{
                  gap: 'var(--dim-space-200)',
                  padding: 'var(--dim-space-200) var(--dim-space-300)',
                  borderRadius: 'var(--dim-radius-200, 8px)',
                  border: 'var(--dim-stroke-100) solid var(--border-card-default)',
                  background: 'var(--surface-card-100)',
                }}
              >
                <button
                  type='button'
                  className='flex items-center flex-1 min-w-0 text-left'
                  style={{
                    gap: 'var(--dim-space-200)',
                    background: 'transparent',
                    border: 'none',
                    padding: 0,
                    cursor: doc.url ? 'pointer' : 'default',
                  }}
                  onClick={() => openSupportDocPreview(doc)}
                  aria-label={`ดูตัวอย่าง ${doc.name}`}
                  title='ดูตัวอย่างเอกสาร'
                >
                  <Sym name='description' size={20} color='var(--icon-content-secondary)' />
                  <span
                    className='flex-1 min-w-0 truncate'
                    style={{
                      fontFamily: 'var(--type-family-body)',
                      fontSize: 'var(--type-size-sm)',
                      color: 'var(--text-brandprimarybutton-default, #007549)',
                      textDecoration: doc.url ? 'underline' : 'none',
                      textUnderlineOffset: 2,
                    }}
                  >
                    {doc.name}
                  </span>
                  <Sym name='visibility' size={18} color='var(--icon-brandprimarybutton-default, #007549)' />
                </button>
                {!isClosed && (
                  <NeutralSubdueIconButton
                    icon='close'
                    variant='outline'
                    size='sm'
                    aria-label={`ลบ ${doc.name}`}
                    onClick={() => handleRemoveSupportDoc(doc.id)}
                  />
                )}
              </div>
            ))}
          </div>
        );
      })()}
      <DragAndDrop
        size='sm'
        value={supportDocFiles}
        onChange={setSupportDocFiles}
        accept='.pdf,.png,.jpg,.jpeg,.doc,.docx'
        multiple
        disabled={isClosed}
      />
    </Popup>
    <Popup
      open={Boolean(supportDocPreview)}
      onClose={() => setSupportDocPreview(null)}
      size='extraLarge'
      title='ดูตัวอย่างเอกสาร'
      subtitle={supportDocPreview?.name || ''}
      secondaryAction={{
        label: 'ปิด',
        onClick: () => setSupportDocPreview(null),
      }}
      primaryAction={
        supportDocPreview?.url
          ? {
              label: 'เปิดในแท็บใหม่',
              onClick: () => window.open(supportDocPreview.url, '_blank', 'noopener,noreferrer'),
            }
          : undefined
      }
      bodyStyle={{ gap: 'var(--dim-space-300)', display: 'flex', flexDirection: 'column' }}
    >
      {supportDocPreview?.url && (
        (() => {
          const type = (supportDocPreview.type || '').toLowerCase();
          const name = (supportDocPreview.name || '').toLowerCase();
          const isImage = type.startsWith('image/') || /\.(png|jpe?g|gif|webp)$/.test(name);
          const isPdf = type === 'application/pdf' || name.endsWith('.pdf');
          if (isImage) {
            return (
              <img
                src={supportDocPreview.url}
                alt={supportDocPreview.name}
                style={{
                  maxWidth: '100%',
                  maxHeight: 'min(70vh, 720px)',
                  objectFit: 'contain',
                  borderRadius: 'var(--dim-radius-200, 8px)',
                  border: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary, #F4F5F5)',
                  background: 'var(--surface-neutral-quinary, #F9FAFB)',
                }}
              />
            );
          }
          if (isPdf) {
            return (
              <iframe
                title={supportDocPreview.name}
                src={supportDocPreview.url}
                style={{
                  width: '100%',
                  height: 'min(70vh, 720px)',
                  border: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary, #F4F5F5)',
                  borderRadius: 'var(--dim-radius-200, 8px)',
                  background: 'var(--surface-neutral-default, #FFFFFF)',
                }}
              />
            );
          }
          return (
            <div
              className='flex flex-col items-center text-center'
              style={{
                gap: 'var(--dim-space-200)',
                padding: 'var(--dim-space-800, 32px)',
                color: 'var(--text-content-secondary)',
                fontFamily: 'var(--type-family-body)',
                fontSize: 'var(--type-size-sm)',
              }}
            >
              <Sym name='draft' size={40} color='var(--icon-content-tertiary)' />
              <span>ไฟล์ประเภทนี้ยังดูในหน้าต่างนี้ไม่ได้ — กด «เปิดในแท็บใหม่» เพื่อดาวน์โหลดหรือเปิดด้วยแอปอื่น</span>
            </div>
          );
        })()
      )}
    </Popup>
    </>
  );
};

export default PharmacyDispensePage;
