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
import { triggerPharmacyPrint } from '@/components/pharmacy/pharmacyPrintUtils';
import PharmacyVerificationPanel from '@/components/pharmacy/PharmacyVerificationPanel';
import PharmacyCounselingPanel from '@/components/pharmacy/PharmacyCounselingPanel';
import PharmacyDeliveryPanel from '@/components/pharmacy/PharmacyDeliveryPanel';
import PharmacyOwnMedicationsList from '@/components/pharmacy/PharmacyOwnMedicationsList';
import PharmacyAllergyEditor from '@/components/pharmacy/PharmacyAllergyEditor';
import PharmacyMedicationEditor from '@/components/pharmacy/PharmacyMedicationEditor';
import PharmacyVoiceSuggestInput from '@/components/pharmacy/PharmacyVoiceSuggestInput';
import { PHARMACY_NESTED_PANEL, PHARMACY_WORKLIST_CARD } from '@/pages/pharmacy/pharmacyContentCard';
import StepProgress from '@/components/step/StepProgress';
import Checkbox from '@/components/checkbox/Checkbox';
import Icon from '@/components/icons/Icon';
import { DEFAULT_MR_PATIENT, findMrPatientByHn } from '@/data/mrPatients';
import { getPatientByHN } from '@/data/patientProfiles';
import { resolveMedicationImage } from '@/data/medicationCatalog';
import {
  DISPENSE_STATUS,
  PHARMACY_QUEUE,
  QUEUE_TYPES,
  PAYMENT_STATUS,
  checkAllergyConflicts,
  getStock,
  deductStock,
  updatePharmacyRow,
  findPharmacyRowByQueueNo,
  logMedError,
  toggleItemPrepared,
  setOutOfRightsDocAttached,
  setPaymentStatus,
  addPharmacyItem,
  updatePharmacyItem,
  removePharmacyItem,
  appendPharmacistNote,
  toggleAuxLabel,
  AUX_LABEL_OPTIONS,
  createRefillPlan,
  markRefillVisitPickedUp,
  getAllergySafeDrugs,
} from '@/data/pharmacyQueue';
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
    {title && (
      <div className='flex items-center justify-between'>
        <h2 style={{ margin: 0, fontFamily: 'var(--type-family-heading-content)', fontWeight: 'var(--type-weight-bold)', fontSize: 'var(--type-size-base)', color: 'var(--text-content-default)' }}>
          {title}
        </h2>
        {action}
      </div>
    )}
    {children}
  </div>
);

const resolveRow = (queueNo) =>
  findPharmacyRowByQueueNo(queueNo)
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
});

const QUEUE_TYPE_LABEL = Object.fromEntries(QUEUE_TYPES.map((t) => [t.key, t.label]));

/* Frequently-typed phrases per free-text field — surfaced as a
   suggestion dropdown once 3+ characters are typed (see
   PharmacyVoiceSuggestInput). Not pulled from any registry; these are
   just the wording that recurs across real ห้องจ่ายยา exception
   entries, so retyping the whole sentence isn't necessary every time. */
const MED_ERROR_SUGGESTIONS = [
  'จ่ายยาผิดขนาด',
  'จ่ายยาผิดชนิด',
  'จ่ายยาผิดคน',
  'ฉลากยาไม่ตรงกับคำสั่งแพทย์',
  'จำนวนยาที่จ่ายไม่ตรงกับใบสั่งยา',
  'ลืมแจ้งข้อควรระวังการใช้ยา',
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

const formatThaiDate = (iso) => new Date(iso).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });

const REFILL_VISIT_STATUS_PILL = {
  due:        { style: 'warning', label: 'ถึงกำหนดรับยา' },
  scheduled:  { style: 'neutral', label: 'รอกำหนด'       },
  picked_up:  { style: 'success', label: 'รับยาแล้ว'     },
};

const PAYMENT_STATUS_PILL = {
  [PAYMENT_STATUS.NOT_APPLICABLE]: { style: 'neutral', label: 'ไม่มีค่าใช้จ่าย' },
  [PAYMENT_STATUS.UNPAID]:         { style: 'error',   label: 'ค้างชำระ'       },
  [PAYMENT_STATUS.PAID]:           { style: 'success', label: 'ชำระแล้ว'       },
};

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

  /* Allergy conflicts get their own explicit "แพ้ยา" badge directly on the
     row (rather than the generic "?" mark below) so the pharmacist sees
     which drug — and which allergy class — without opening the alert
     banner above the table. */
  const allergyConflictMap = useMemo(() => new Map(conflicts.map((c) => [c.item.id, c])), [conflicts]);

  /* Rows to mark with a "?" (legacy convention — คู่มือระบบงานห้องจ่ายยาฯ
     §2.1.1 "กรณีผู้ป่วยแพ้ยา" — a "?" appears in front of the drug row
     that conflicts) for every OTHER conflict type — allergy conflicts are
     called out via `allergyConflictMap` instead. Interaction/duplicate
     conflicts key off drug NAME (not id), so every item sharing that name
     gets flagged too. */
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

  const itemsWithStock = row.items.map((item) => {
    const stockEntry = getStock(item.name);
    const remaining = item.quantity - (item.quantityDispensed || 0);
    const qtyNow = dispenseNow[item.id] ?? remaining;
    const insufficient = !!stockEntry && qtyNow > stockEntry.stock;
    const unitPrice = stockEntry?.unitPrice ?? 0;
    const subtotal = unitPrice * qtyNow;
    const drug = getRegistryDrug(item.name);
    /* ราคาที่เบิกได้ (ToR §1.9.2.4) — claimable only when the drug is
       eligible under the patient's rights; out-of-rights items are
       ชำระเงินเอง (patient pays, nothing claimable). */
    const claimable = drug?.rightsEligible.includes(mrPatient.rights) ? subtotal : 0;
    const inFormulary = drug ? drug.classification === 'nlem' : true;
    return { ...item, stockEntry, remaining, qtyNow, insufficient, unitPrice, subtotal, claimable, inFormulary };
  });
  const grandTotal = itemsWithStock.reduce((sum, i) => sum + i.subtotal, 0);
  const claimableTotal = itemsWithStock.reduce((sum, i) => sum + i.claimable, 0);
  const nlemTotal = itemsWithStock.filter((i) => i.inFormulary).reduce((sum, i) => sum + i.subtotal, 0);
  const nonNlemTotal = grandTotal - nlemTotal;
  const hasInsufficientStock = itemsWithStock.some((i) => i.qtyNow > 0 && i.insufficient);
  const alreadyDispensed = row.status === DISPENSE_STATUS.DISPENSED;
  const isTerminal = [DISPENSE_STATUS.DISPENSED, DISPENSE_STATUS.NO_SHOW, DISPENSE_STATUS.PROBLEM, DISPENSE_STATUS.CANCELLED].includes(row.status);

  /* Inline "เปลี่ยนยา" column — lets the pharmacist swap a line's drug
     directly from the table (no need to open the "แก้ไข" modal). The
     `<select>` options are pre-filtered via `getAllergySafeDrugs`, so an
     allergy-conflicting row can only be swapped to something safe. */
  const handleQuickDrugChange = (item, newName) => {
    if (!newName || newName === item.name) return;
    const drug = getRegistryDrug(newName);
    const oldName = item.name;
    updatePharmacyItem(row.queueNo, item.id, {
      name: newName,
      unit: drug?.unit === 'capsule' ? 'แคปซูล' : 'เม็ด',
    });
    const conflict = allergyConflictMap.get(item.id);
    appendPharmacistNote(
      row.queueNo,
      conflict
        ? `เปลี่ยนยาเนื่องจากผู้ป่วยแพ้ยา: จาก "${oldName}" (แพ้กลุ่ม ${conflict.allergyClass}) เป็น "${newName}"`
        : `เปลี่ยนยาจาก "${oldName}" เป็น "${newName}"`,
    );
    bump();
  };

  const columns = [
    { key: 'seq', label: 'ลำดับ', width: 50, align: 'center', sortable: false, render: (r, i) => i + 1 },
    { key: 'image', label: 'รูป', width: 60, sortable: false, render: (r) => <MedImageTile src={resolveMedicationImage(r.name)} alt={r.name} /> },
    {
      key: 'name', label: 'ชื่อยา', flex: true, minWidth: 200,
      render: (r) => {
        const allergyHit = allergyConflictMap.get(r.id);
        return (
          <div className='flex items-center' style={{ gap: 'var(--dim-space-150)' }}>
            {allergyHit && (
              <span title={`ผู้ป่วยแพ้ยากลุ่ม ${allergyHit.allergyClass} (${allergyHit.symptom})`}>
                <Badge style='error' size='small'>แพ้ยา</Badge>
              </span>
            )}
            {!allergyHit && conflictItemIds.has(r.id) && (
              <span
                aria-label='รายการนี้มีปัญหากับผู้ป่วย'
                title='รายการนี้มีปัญหากับผู้ป่วย'
                className='inline-flex items-center justify-center shrink-0'
                style={{ width: 18, height: 18, borderRadius: 'var(--dim-radius-full)', background: 'var(--surface-alert-error)', color: 'var(--text-alert-error)', fontSize: 'var(--type-size-xs)', fontWeight: 'var(--type-weight-bold)' }}
              >
                ?
              </span>
            )}
            <TableEllipsisText text={r.name} />
            {r.source === 'remed' && <Badge style='info' size='small'>Re-med</Badge>}
          </div>
        );
      },
    },
    { key: 'drugType', label: 'แหล่งยา', width: 90, align: 'center' },
    { key: 'dose', label: 'ขนาด/ความถี่', width: 200, render: (r) => `${r.dosePerTake} ${r.unit} · ${r.frequency} · ${r.when}` },
    { key: 'quantity', label: 'สั่งทั้งหมด', width: 90, align: 'center', render: (r) => `${r.quantity} ${r.unit}` },
    {
      key: 'qtyNow', label: 'จ่ายครั้งนี้', width: 150, align: 'center', sortable: false,
      render: (r) => (
        <Stepper
          size='small'
          value={r.qtyNow}
          min={0}
          max={r.remaining}
          onChange={(n) => setDispenseNow((s) => ({ ...s, [r.id]: n ?? 0 }))}
          disabled={isTerminal || r.remaining <= 0}
          aria-label={`จำนวนที่จะจ่าย ${r.name}`}
        />
      ),
    },
    {
      key: 'stock', label: 'คงคลัง', width: 130, align: 'center',
      render: (r) => r.stockEntry
        ? <Badge style={r.insufficient ? 'error' : 'neutral'} size='small'>{r.stockEntry.stock} {r.stockEntry.unit}{r.insufficient ? ' (ไม่พอ)' : ''}</Badge>
        : <span style={{ color: 'var(--text-content-tertiary)' }}>ไม่มีข้อมูล</span>,
    },
    { key: 'subtotal', label: 'ราคารวม', width: 90, align: 'center', render: (r) => `฿${r.subtotal.toLocaleString()}` },
    { key: 'claimable', label: 'ราคาที่เบิกได้', width: 110, align: 'center', render: (r) => r.claimable > 0 ? `฿${r.claimable.toLocaleString()}` : <span style={{ color: 'var(--text-content-tertiary)' }}>เบิกไม่ได้</span> },
    {
      key: 'changeDrug', label: 'เปลี่ยนยา', width: 180, align: 'center', sortable: false,
      render: (r) => (
        <select
          value={r.name}
          disabled={isTerminal}
          onChange={(e) => handleQuickDrugChange(r, e.target.value)}
          aria-label={`เปลี่ยนยาแทน ${r.name}`}
          style={{
            width: '100%',
            padding: 'var(--dim-space-150) var(--dim-space-200)',
            background: 'var(--surface-input-default)',
            border: 'var(--dim-stroke-100) solid var(--border-input-default)',
            borderRadius: 'var(--dim-radius-200)',
            fontSize: 'var(--type-size-xs)',
            appearance: 'none',
            cursor: isTerminal ? 'not-allowed' : 'pointer',
            opacity: isTerminal ? 0.6 : 1,
          }}
        >
          {getAllergySafeDrugs(mrPatient.drugAllergies, r.name).map((d) => (
            <option key={d.id} value={d.name}>{d.name}</option>
          ))}
        </select>
      ),
    },
    {
      key: 'itemActions', label: 'แก้ไข', width: 90, align: 'center', sortable: false,
      render: (r) => (
        <div className='flex items-center justify-center' style={{ gap: 'var(--dim-space-150)' }}>
          <button
            type='button'
            aria-label={`แก้ไข ${r.name}`}
            disabled={isTerminal}
            onClick={() => setEditingItemId(r.id)}
            style={{ background: 'transparent', border: 'none', cursor: isTerminal ? 'not-allowed' : 'pointer', color: 'var(--text-brandPrimary-default)', opacity: isTerminal ? 0.4 : 1 }}
          >
            <Icon name='edit' size={16} />
          </button>
          <button
            type='button'
            aria-label={`ลบ ${r.name}`}
            disabled={isTerminal}
            onClick={() => { removePharmacyItem(row.queueNo, r.id); bump(); }}
            style={{ background: 'transparent', border: 'none', cursor: isTerminal ? 'not-allowed' : 'pointer', color: 'var(--text-content-tertiary)', opacity: isTerminal ? 0.4 : 1 }}
          >
            <Icon name='close' size={16} />
          </button>
        </div>
      ),
    },
  ];

  const handleMarkPreparing = () => {
    updatePharmacyRow(row.queueNo, { status: DISPENSE_STATUS.PREPARING });
    bump();
  };

  const handleConfirmDispense = () => {
    if (hasInsufficientStock || isTerminal) return;
    const dispensingItems = itemsWithStock.filter((i) => i.qtyNow > 0);
    deductStock(dispensingItems.map((i) => ({ name: i.name, quantity: i.qtyNow })));
    const nextItems = row.items.map((it) => {
      const withStock = itemsWithStock.find((i) => i.id === it.id);
      return { ...it, quantityDispensed: (it.quantityDispensed || 0) + (withStock?.qtyNow || 0) };
    });
    const allComplete = nextItems.every((it) => it.quantityDispensed >= it.quantity);
    updatePharmacyRow(row.queueNo, {
      items: nextItems,
      status: allComplete ? DISPENSE_STATUS.DISPENSED : DISPENSE_STATUS.PARTIAL,
      dispensedAt: 'เมื่อครู่',
    });
    setDispenseNow({});
    bump();
    history.push('/pharmacy/queue', { state: { justDispensed: row.queueNo } });
  };

  /* Opens the medication editor pre-targeted at the conflicting item, from
     the allergy alert's "เปลี่ยนยา" action. */
  const handleAllergySwap = (conflict) => {
    setAllergySwapConflict(conflict);
    setEditingItemId(conflict.item.id);
  };

  /* TOR: alongside swapping the drug, the pharmacist must be able to send
     the case back to the prescribing doctor for a fresh diagnosis — e.g.
     when no safe substitute exists. Flags the row as a problem (blocking
     dispense until resolved), logs a note naming every conflicting drug,
     and routes into the doctor's treatment form for this patient. */
  const handleSendBackForRediagnosis = () => {
    const drugList = conflicts.map((c) => `${c.item.name} (แพ้กลุ่ม ${c.allergyClass})`).join(', ');
    const reason = `ส่งกลับแพทย์เพื่อวินิจฉัยใหม่ เนื่องจากผู้ป่วยแพ้ยา: ${drugList}`;
    appendPharmacistNote(row.queueNo, reason);
    logMedError(row.queueNo, reason, 'high');
    updatePharmacyRow(row.queueNo, { status: DISPENSE_STATUS.PROBLEM, problemFlag: true, problemReason: reason });
    bump();
    history.push({ pathname: '/treat/record', state: { hn: row.hn, name: patient.fullName } });
  };

  const handleLogMedError = () => {
    if (!medErrorText.trim()) return;
    logMedError(row.queueNo, medErrorText.trim(), medErrorSeverity);
    setMedErrorText('');
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
    <PharmacyPrescriptionPrint patient={patient.fullName} hn={row.hn} diagnosis={row.diagnosis} doctor={patient.doctor} items={row.items} />
    <PharmacyAuxLabelPrint items={row.items} />
    <div className='min-h-screen w-full flex mih-pharmacy-no-print' style={{ background: 'var(--background-screen-brand-100, #F4FBF8)' }}>
      <Sidebar activeKey='pharmacy' />
      <main className='flex-1 flex flex-col min-w-0'>
        <Header breadcrumb={breadcrumb} />
        <PatientCard
          patient={patient}
          title={`คิว ${row.queueNo} · จ่ายยา`}
          drugAllergies={mrPatient.drugAllergies}
          chronicDiseases={mrPatient.chronicDiseases}
          onBack={() => history.push('/pharmacy/queue')}
        />
        <div className='flex-1 flex flex-col' style={{ padding: 'var(--dim-space-600)', gap: 'var(--dim-space-400)' }}>

          {/* Order context — queue type, diagnosis, vitals snapshot, payment status */}
          <SectionCard>
            <div className='flex flex-wrap items-center justify-between w-full' style={{ gap: 'var(--dim-space-300)' }}>
              <div className='flex flex-wrap items-center' style={{ gap: 'var(--dim-space-300)' }}>
                <Badge style='info' size='small'>{QUEUE_TYPE_LABEL[row.queueType]}</Badge>
                <span className='text-sm' style={{ color: 'var(--text-content-default)' }}>
                  {row.diagnosis?.icd10} — {row.diagnosis?.name}
                </span>
                <span className='text-xs' style={{ color: 'var(--text-content-tertiary)' }}>
                  BP {row.vitalsSnapshot?.bp} · HR {row.vitalsSnapshot?.hr} · Temp {row.vitalsSnapshot?.temp}°C · น้ำหนัก {row.vitalsSnapshot?.weight} กก.
                </span>
              </div>
              {/* Nurse Note (ToR §1.9.2.2) — nursing history captured before
                  the doctor visit, shown read-only to pharmacy alongside vitals. */}
              <div className='w-full text-xs' style={{ color: 'var(--text-content-secondary)' }}>
                <span style={{ color: 'var(--text-content-tertiary)' }}>Nurse Note: </span>{row.nurseNote || 'ไม่มีข้อมูล'}
              </div>
              <div className='flex items-center' style={{ gap: 'var(--dim-space-200)' }}>
                <Badge style={PAYMENT_STATUS_PILL[row.paymentStatus].style} size='small'>{PAYMENT_STATUS_PILL[row.paymentStatus].label}</Badge>
                {row.paymentStatus === PAYMENT_STATUS.UNPAID && (
                  <BrandSubdueButton variant='outline' size='sm' leadingIcon='payments' onClick={() => { setPaymentStatus(row.queueNo, PAYMENT_STATUS.PAID); bump(); }}>
                    ยืนยันชำระเงินแล้ว
                  </BrandSubdueButton>
                )}
              </div>
            </div>
          </SectionCard>

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
          {isTerminal && (
            <Alert
              type={row.status === DISPENSE_STATUS.DISPENSED ? 'success' : row.status === DISPENSE_STATUS.NO_SHOW || row.status === DISPENSE_STATUS.CANCELLED ? 'warning' : 'error'}
              title={row.status === DISPENSE_STATUS.DISPENSED ? 'จ่ายยาแล้ว' : row.status === DISPENSE_STATUS.NO_SHOW ? 'ผู้รับบริการไม่มารับยา' : row.status === DISPENSE_STATUS.CANCELLED ? 'ใบยาถูกยกเลิก' : 'ใบยามีปัญหา'}
              subtext={row.status === DISPENSE_STATUS.DISPENSED ? `คิว ${row.queueNo} จ่ายยาเรียบร้อยแล้ว` : row.status === DISPENSE_STATUS.CANCELLED ? row.orderCancelled?.note : row.noShowReason || row.problemReason}
              showCloseButton={false} style={{ maxWidth: '100%' }}
            />
          )}

          {/* Splits the rest of the page into steps (see `DISPENSE_STEPS`) —
              "รายการยา" first/default so the medication list is the first
              thing the pharmacist sees, not the last of 9 stacked sections. */}
          <StepProgress
            framed
            steps={DISPENSE_STEPS}
            current={currentStep}
            onStepClick={setCurrentStep}
          />

          {currentStep === 1 && (
          <>
          {/* แพ้ยา — editable (ToR §1.9.2.2 / §1.9.5). Feeds `checkAllergyConflicts`
              directly below and `PatientCard`'s alert row above, both of which
              re-read `mrPatient.drugAllergies` fresh on every render. */}
          <SectionCard title='แพ้ยา'>
            <PharmacyAllergyEditor hn={row.hn} allergies={mrPatient.drugAllergies} onChange={bump} />
          </SectionCard>

          {/* Alerts */}
          {conflicts.length > 0 && alertsOpen.allergy && (
            <Alert type='warning' title='ความเสี่ยงการแพ้ยาข้ามกลุ่ม'
              subtext={conflicts.map((c) => `${c.item.name} อยู่ในกลุ่ม ${c.allergyClass} ซึ่งผู้ป่วยมีประวัติแพ้ (${c.symptom})`).join(' · ')}
              detail={
                <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200)' }}>
                  {conflicts.map((c) => (
                    <div key={c.item.id} className='flex items-center justify-between flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
                      <span className='text-xs' style={{ color: 'var(--text-content-secondary)' }}>
                        <strong>{c.item.name}</strong> — แพ้กลุ่ม {c.allergyClass} ({c.symptom})
                      </span>
                      <BrandSubdueButton variant='outline' size='sm' leadingIcon='swap_horiz' disabled={isTerminal} onClick={() => handleAllergySwap(c)}>
                        เปลี่ยนยา
                      </BrandSubdueButton>
                    </div>
                  ))}
                  <div className='flex justify-end' style={{ paddingTop: 'var(--dim-space-100)', borderTop: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary, #F4F5F5)' }}>
                    <NeutralSubdueButton variant='outline' size='sm' leadingIcon='stethoscope' onClick={handleSendBackForRediagnosis}>
                      ส่งกลับแพทย์เพื่อวินิจฉัยใหม่
                    </NeutralSubdueButton>
                  </div>
                </div>
              }
              showIndicator={false} showBadge={false} onClose={() => closeAlert('allergy')} style={{ maxWidth: '100%' }} />
          )}
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
          {outOfRightsItems.length > 0 && alertsOpen.rights && (
            <Alert type='error' title='มีรายการยานอกสิทธิการรักษา'
              subtext={`${outOfRightsItems.map((i) => i.name).join(', ')} ไม่อยู่ในสิทธิ "${mrPatient.rights}" ของผู้ป่วย — ต้องมีเอกสารประกอบหรือให้ผู้ป่วยชำระเงินเอง`}
              showDetail={false} showIndicator={false} showBadge={false} onClose={() => closeAlert('rights')} style={{ maxWidth: '100%' }} />
          )}
          {outOfRightsItems.length > 0 && (
            <div
              className='w-fit'
              style={{
                ...PHARMACY_NESTED_PANEL,
                padding: 'var(--dim-space-300)',
                ...(row.outOfRightsDocAttached ? { background: 'var(--surface-alert-success)' } : null),
              }}
            >
              <Checkbox
                checked={!!row.outOfRightsDocAttached}
                onChange={(next) => { setOutOfRightsDocAttached(row.queueNo, next); bump(); }}
                label='แนบเอกสารประกอบการสั่งยานอกสิทธิแล้ว'
              />
            </div>
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
          {!isTerminal && (
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
          {/* ข้อมูลประกอบการจ่ายยา (ToR §1.9.4.2) — treatment history / lab /
              appointment are joined live per-HN from treatmentVisits.js /
              labOrders.js / the appointment module (getPharmacySupportingInfo).
              Consult history / radiology results have no HN-keyed module
              anywhere in this app yet (docs/product-spec.md §10), so those two
              stay as illustrative per-row overrides or "ไม่มีข้อมูล". */}
          <SectionCard title='ข้อมูลประกอบการจ่ายยา'>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-3 w-full text-sm'>
              <div><span style={{ color: 'var(--text-content-tertiary)' }}>ประวัติการรักษา: </span>{row.supportingInfo.treatmentHistory || 'ไม่มีข้อมูล'}</div>
              <div><span style={{ color: 'var(--text-content-tertiary)' }}>ประวัติส่งปรึกษา: </span>{row.supportingInfo.consultHistory || 'ไม่มีข้อมูล'}</div>
              <div>
                <span style={{ color: 'var(--text-content-tertiary)' }}>ผลตรวจทางห้องปฏิบัติการ: </span>
                {row.supportingInfo.labResults
                  ? row.supportingInfo.labResults.map((l) => `${l.test} ${l.result}${l.flag !== 'normal' ? ` (${l.flag})` : ''}`).join(', ')
                  : 'ไม่มีข้อมูล'}
              </div>
              <div><span style={{ color: 'var(--text-content-tertiary)' }}>ผลตรวจทางรังสีวิทยา: </span>{row.supportingInfo.radiologyResults || 'ไม่มีข้อมูล'}</div>
              <div className='md:col-span-2'><span style={{ color: 'var(--text-content-tertiary)' }}>ข้อมูลนัดหมาย: </span>{row.supportingInfo.appointmentInfo || 'ไม่มีข้อมูล'}</div>
            </div>
          </SectionCard>

          {/* Medication table */}
          <SectionCard
            title='รายการยาที่ต้องจ่าย'
            action={
              <div className='flex items-center' style={{ gap: 'var(--dim-space-200)' }}>
                <NeutralSubdueButton variant='outline' size='sm' onClick={() => setLabelLang(labelLang === 'th' ? 'en' : 'th')}>
                  ฉลาก: {labelLang === 'th' ? 'ไทย' : 'English'}
                </NeutralSubdueButton>
                <BrandSubdueButton variant='outline' size='sm' leadingIcon='print' onClick={() => triggerPharmacyPrint('label')}>
                  พิมพ์ฉลากยา
                </BrandSubdueButton>
                <BrandSubdueButton variant='outline' size='sm' leadingIcon='description' onClick={() => triggerPharmacyPrint('prescription')}>
                  พิมพ์ใบสั่งยา
                </BrandSubdueButton>
                {!isTerminal && (
                  <BrandSubdueButton variant='outline' size='sm' leadingIcon='add' onClick={() => setEditingItemId('new')}>
                    เพิ่มรายการยา
                  </BrandSubdueButton>
                )}
              </div>
            }
          >
            {row.status === DISPENSE_STATUS.PREPARING && <Badge style='info' size='small'>จัดยาแล้ว — รอยืนยันจ่ายยา</Badge>}
            <Table columns={columns} rows={itemsWithStock} rowKey={(r) => r.id} stickyColCount={2} emptyMessage='ไม่มีรายการยา' />
            {editingItemId && (
              <PharmacyMedicationEditor
                item={editingItemId === 'new' ? null : row.items.find((it) => it.id === editingItemId)}
                allergies={mrPatient.drugAllergies}
                onCancel={() => { setEditingItemId(null); setAllergySwapConflict(null); }}
                onSave={(patch) => {
                  if (editingItemId === 'new') {
                    addPharmacyItem(row.queueNo, patch);
                  } else {
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
            )}
            <div className='flex items-center justify-end flex-wrap w-full' style={{ paddingTop: 'var(--dim-space-200)', borderTop: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary, #F4F5F5)', gap: 'var(--dim-space-400)' }}>
              <span className='text-xs' style={{ color: 'var(--text-content-tertiary)' }}>
                ยาในบัญชี ฿{nlemTotal.toLocaleString()} · ยานอกบัญชี ฿{nonNlemTotal.toLocaleString()} · เบิกได้ ฿{claimableTotal.toLocaleString()}
              </span>
              <span className='text-sm' style={{ color: 'var(--text-content-secondary)', marginRight: 'var(--dim-space-200)' }}>ยอดรวมทั้งใบสั่งยา</span>
              <span className='text-base font-bold' style={{ color: 'var(--text-content-default)' }}>฿{grandTotal.toLocaleString()}</span>
            </div>

            {/* Med Error (ToR §1.9.2.4) — manual log entry. */}
            <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200)', paddingTop: 'var(--dim-space-200)', borderTop: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary, #F4F5F5)' }}>
              <div className='flex items-center justify-between flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
                <span className='text-xs' style={{ color: 'var(--text-content-tertiary)', fontWeight: 'var(--type-weight-bold)' }}>Med Error</span>
                {!isTerminal && (
                  <NeutralSubdueButton variant='outline' size='sm' leadingIcon='error' onClick={() => setMedErrorOpen((v) => !v)}>
                    บันทึก Med Error
                  </NeutralSubdueButton>
                )}
              </div>
              {medErrorOpen && (
                <div className='flex flex-wrap items-end w-full' style={{ gap: 'var(--dim-space-300)' }}>
                  <PharmacyVoiceSuggestInput
                    value={medErrorText} onChange={setMedErrorText}
                    placeholder='ระบุรายละเอียด Med Error'
                    suggestions={MED_ERROR_SUGGESTIONS}
                    aria-label='รายละเอียด Med Error'
                  />
                  <select
                    value={medErrorSeverity} onChange={(e) => setMedErrorSeverity(e.target.value)}
                    style={{ padding: 'var(--dim-space-150) var(--dim-space-300)', background: 'var(--surface-input-default)', border: 'var(--dim-stroke-100) solid var(--border-input-default)', borderRadius: 'var(--dim-radius-200)', fontSize: 'var(--type-size-sm)', appearance: 'none' }}
                  >
                    <option value='low'>ความรุนแรงต่ำ</option>
                    <option value='medium'>ความรุนแรงปานกลาง</option>
                    <option value='high'>ความรุนแรงสูง</option>
                  </select>
                  <BrandSubdueButton variant='outline' size='sm' disabled={!medErrorText.trim()} onClick={handleLogMedError}>บันทึก</BrandSubdueButton>
                </div>
              )}
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

          {/* ฉลากช่วย (ToR §1.9.2.11) — per-item auxiliary-label sticker
              picker, separate from the main drug label. */}
          <SectionCard
            title='ฉลากช่วย (Auxiliary Label)'
            action={
              <BrandSubdueButton variant='outline' size='sm' leadingIcon='sticky_note_2' onClick={() => triggerPharmacyPrint('auxlabel')}>
                พิมพ์ฉลากช่วย
              </BrandSubdueButton>
            }
          >
            <div className='flex flex-col' style={{ gap: 'var(--dim-space-300)' }}>
              {row.items.map((item) => (
                <div key={item.id} className='flex flex-col' style={{ gap: 'var(--dim-space-150)' }}>
                  <span className='text-sm' style={{ color: 'var(--text-content-default)', fontWeight: 'var(--type-weight-medium)' }}>{item.name}</span>
                  <div className='flex flex-wrap' style={{ gap: 'var(--dim-space-150)' }}>
                    {AUX_LABEL_OPTIONS.map((label) => {
                      const active = (item.auxLabels || []).includes(label);
                      return (
                        <button
                          key={label}
                          type='button'
                          disabled={isTerminal}
                          onClick={() => { toggleAuxLabel(row.queueNo, item.id, label); bump(); }}
                          style={{
                            padding: '0 var(--dim-space-300)',
                            height: 'var(--dim-size-600, 32px)',
                            borderRadius: 'var(--dim-radius-full)',
                            border: `var(--dim-stroke-100) solid ${active ? 'var(--border-brandPrimary-default)' : 'var(--border-card-default)'}`,
                            background: active ? 'var(--surface-brandPrimary-quaternary)' : 'transparent',
                            color: active ? 'var(--text-brandPrimary-default)' : 'var(--text-content-secondary)',
                            fontSize: 'var(--type-size-xs)',
                            cursor: isTerminal ? 'not-allowed' : 'pointer',
                            opacity: isTerminal ? 0.6 : 1,
                          }}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* แบ่งจ่ายยาเป็นงวด (Refill — ToR §1.9.4.5) — split an item's
              remaining quantity across future scheduled pickups instead of
              handing it all out in one visit. */}
          <SectionCard title='แบ่งจ่ายยาเป็นงวด (Refill)'>
            <div className='flex flex-col' style={{ gap: 'var(--dim-space-400)' }}>
              {row.items.map((item) => (
                <div key={item.id} className='flex flex-col' style={{ gap: 'var(--dim-space-200)' }}>
                  <span className='text-sm' style={{ color: 'var(--text-content-default)', fontWeight: 'var(--type-weight-medium)' }}>{item.name}</span>
                  {!item.refillPlan ? (
                    <div className='flex flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
                      <NeutralSubdueButton variant='outline' size='sm' leadingIcon='event_repeat' disabled={isTerminal} onClick={() => { createRefillPlan(row.queueNo, item.id, { visits: 2, intervalDays: 14 }); bump(); }}>
                        แบ่งจ่าย 2 งวด (ทุก 14 วัน)
                      </NeutralSubdueButton>
                      <NeutralSubdueButton variant='outline' size='sm' leadingIcon='event_repeat' disabled={isTerminal} onClick={() => { createRefillPlan(row.queueNo, item.id, { visits: 3, intervalDays: 10 }); bump(); }}>
                        แบ่งจ่าย 3 งวด (ทุก 10 วัน)
                      </NeutralSubdueButton>
                    </div>
                  ) : (
                    <div className='flex flex-col' style={{ gap: 'var(--dim-space-150)' }}>
                      {item.refillPlan.visits.map((v) => (
                        <div key={v.id} className='flex items-center justify-between flex-wrap' style={{ ...PHARMACY_NESTED_PANEL, gap: 'var(--dim-space-200)', padding: 'var(--dim-space-200) var(--dim-space-300)' }}>
                          <span className='text-xs' style={{ color: 'var(--text-content-secondary)' }}>
                            งวดที่ {v.visitNo} · {formatThaiDate(v.scheduledDate)} · {v.quantity} {item.unit}
                          </span>
                          <div className='flex items-center' style={{ gap: 'var(--dim-space-200)' }}>
                            <Badge style={REFILL_VISIT_STATUS_PILL[v.status].style} size='small'>{REFILL_VISIT_STATUS_PILL[v.status].label}</Badge>
                            {v.status === 'due' && v.visitNo > 1 && (
                              <NeutralSubdueButton variant='outline' size='sm' onClick={() => { markRefillVisitPickedUp(row.queueNo, item.id, v.id); bump(); }}>
                                บันทึกรับยาแล้ว
                              </NeutralSubdueButton>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </SectionCard>
          </>
          )}

          {currentStep === 2 && (
          <>
          {/* จัดยา checklist (ToR §1.9.3 — บันทึกสถานะการจัด และตรวจสอบรายการยา
              ทีละรายการ ก่อนเปลี่ยนสถานะเป็น "จัดยาแล้ว") */}
          {!isTerminal && row.status !== DISPENSE_STATUS.WAITING && (
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

          {/* Medication Reconciliation */}
          <SectionCard title='การประสานรายการยา (Medication Reconciliation)'>
            <Table
              columns={[
                { key: 'name', label: 'ชื่อยา', flex: true, minWidth: 200 },
                { key: 'source', label: 'แหล่งที่มา', width: 220, render: (r) => <Badge style={r.source === 'current' ? 'success' : 'info'} size='small'>{r.source === 'current' ? 'ใบสั่งยาปัจจุบัน' : 'ยาที่ผู้ป่วยนำมาเอง'}</Badge> },
                { key: 'note', label: 'หมายเหตุ', flex: true, minWidth: 200, render: (r) => r.note || '—' },
              ]}
              rows={[
                /* §1.9.5.6 — a Re-med carry-forward item dispensed at 0
                   additional units this visit still gets a reconciliation
                   line, with a note that reads as "continued", not "empty". */
                ...row.items.map((it) => ({
                  id: `cur-${it.id}`, name: it.name, source: 'current',
                  note: it.source === 'remed' && it.quantity === 0 ? 'ต่อเนื่องจากรายการเดิม — ไม่มีการจ่ายเพิ่มครั้งนี้' : it.instructions,
                })),
                ...row.ownMedications.map((m) => ({ id: `own-${m.id}`, name: m.name, source: 'own', note: m.note })),
              ]}
              rowKey={(r) => r.id}
              emptyMessage='ไม่มีข้อมูล'
            />
            <PharmacyOwnMedicationsList queueNo={row.queueNo} row={row} onChange={bump} />
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
          showAutoSave={false}
          showButton2={false}
          showButton3
          button3Label='ย้อนกลับ'
          onButton3Click={() => history.push('/pharmacy/queue')}
          showButton1
          button1Label={alreadyDispensed ? 'จ่ายยาแล้ว' : row.status === DISPENSE_STATUS.PARTIAL ? 'จ่ายส่วนที่เหลือ' : 'ยืนยันจ่ายยา'}
          button1TrailingIcon='check'
          button1Disabled={hasInsufficientStock || isTerminal}
          onButton1Click={handleConfirmDispense}
        />
      </main>
    </div>
    </>
  );
};

export default PharmacyDispensePage;
