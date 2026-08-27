import { FINANCE_QUEUE, formatBaht, PAYMENT_METHODS, PHARMACY_STATUSES, QUEUE_STATUSES } from '@/data/financePaymentPrototype';
import { PHARMACY_QUEUE } from '@/data/pharmacyQueue';
import { REGISTRATION_VISITS, VISIT_ARRIVALS, VISIT_URGENCIES } from '@/data/registrationVisits';
import { findMrPatientByHn } from '@/data/mrPatients';
import {
  TREATMENT_VISITS,
  DEFAULT_SCREENING_SUMMARY,
  DEFAULT_NURSE_EXAM_NOTES,
  DEFAULT_DOCTOR_EXAM_NOTES,
  DEFAULT_MEDICATION_ORDERS,
  TREATMENT_DOCTOR_OPTIONS,
} from '@/data/treatmentVisits';

/* รวมข้อมูลการรักษาตั้งแต่ลงทะเบียนจนชำระเงิน — ใช้ใน Step 1 ประวัติการรักษา
   (MedicalHistoryReadOnlyLayout) เพื่อแสดงภาพรวมครบวงจรต่อ visit ที่เลือก */

const arrivalLabel = (key) =>
  VISIT_ARRIVALS.find((a) => a.key === key)?.label ?? key ?? '—';

const urgencyLabel = (key) =>
  VISIT_URGENCIES.find((u) => u.key === key)?.label ?? key ?? '—';

const doctorLabel = (value) =>
  TREATMENT_DOCTOR_OPTIONS.find((o) => o.value === value)?.label ?? value ?? '—';

const paymentMethodLabel = (key) =>
  PAYMENT_METHODS.find((m) => m.key === key)?.label ?? key ?? '—';

const queueStatusLabel = (key) =>
  QUEUE_STATUSES.find((s) => s.key === key)?.label ?? key ?? '—';

const pharmacyQueueLabel = (key) =>
  PHARMACY_STATUSES[key]?.label ?? key ?? '—';

export const findFinanceRowByHn = (hn) =>
  FINANCE_QUEUE.find((r) => r.hn === hn) ?? null;

export const findPharmacyRowsByHn = (hn) =>
  PHARMACY_QUEUE.filter((r) => r.hn === hn);

export const findTreatmentVisitMeta = (hn, date) =>
  (TREATMENT_VISITS[hn] ?? []).find((v) => v.date === date) ?? null;

export const findRegistrationForVisit = (hn, visitMeta) => {
  const open = REGISTRATION_VISITS.find(
    (v) => v.hn === hn && v.status !== 'cancelled',
  );
  if (open) return open;

  const finance = findFinanceRowByHn(hn);
  const patient = findMrPatientByHn(hn);
  const name = patient
    ? `${patient.prefixTh}${patient.firstNameTh} ${patient.lastNameTh}`
    : hn;

  return {
    vn: finance?.vn ?? `VN-69-${hn.slice(-5)}`,
    hn,
    patientName: name,
    time: finance?.visitTime ? `${finance.visitTime} น.` : '08:30 น.',
    clinic: visitMeta?.dept
      ? `ห้องตรวจ${visitMeta.dept === 'ตรวจรักษา' ? 'โรคทั่วไป (OPD)' : visitMeta.dept}`
      : 'ห้องตรวจโรคทั่วไป (OPD)',
    doctor: visitMeta?.doctor ?? finance?.patient?.doctor ?? '—',
    urgency: 'normal',
    arrival: 'walkin',
    chiefComplaint: visitMeta?.cc ?? '—',
    condition: 'walk',
    openedBy: 'น.ส.พิมพ์ใจ ลงทะเบียน',
    openedAt: finance?.visitTime ? `${finance.visitTime} น.` : '08:30 น.',
    center: visitMeta?.center ?? finance?.center ?? '—',
    rights: finance?.rights?.label ?? '—',
  };
};

const mapMedicationLines = (rows = []) =>
  rows.map((m) => ({
    label: m.name,
    detail: [m.usage, m.frequency, m.when].filter(Boolean).join(' · '),
    qty: m.quantity,
    price: m.totalPrice,
  }));

const mapChargeLines = (items = []) =>
  items.map((it) => ({
    label: it.label,
    category: it.category,
    amount: it.amount,
    covered: it.covered,
    patientPortion: it.patientPortion,
  }));

/** สร้าง snapshot ครบวงจรสำหรับ visit ที่เลือก */
/* ผลที่เก็บเป็นข้อความเดียวคั่นด้วย " · " → รายการ · "ไม่ได้สั่งตรวจ" ถือว่า
   ไม่มีรายการ ไม่ใช่ผลหนึ่งบรรทัด */
const splitResultList = (text) => {
  const t = String(text || '').trim();
  if (!t || t === '—' || t === 'ไม่ได้สั่งตรวจ') return [];
  return t.split('·').map((x) => x.trim()).filter(Boolean);
};

export const buildVisitJourney = ({
  hn,
  visitDate,
  visitDetail = null,
  form = null,
  isCurrentVisit = false,
} = {}) => {
  const visitMeta = isCurrentVisit
    ? {
        date: visitDate ?? 'ครั้งนี้',
        dept: 'อายุรกรรม',
        doctor: doctorLabel(form?.orderingDoctor) || 'พญ.สมหญิง รักษ์ดี',
        cc: form?.symptoms ?? visitDetail?.cc,
        dx: form?.diagnosisNote || (form?.diagnoses?.length
          ? form.diagnoses.map((d) => `${d.code} ${d.name}`).join('; ')
          : null),
        rx: form?.medications?.length
          ? form.medications.map((m) => m.name).join(', ')
          : null,
        center: 'ศูนย์ 8 บางนา',
      }
    : findTreatmentVisitMeta(hn, visitDate);

  const registration = findRegistrationForVisit(hn, visitMeta);
  const screening = {
    ...DEFAULT_SCREENING_SUMMARY,
    ...(visitDetail ?? {}),
    cc: visitMeta?.cc ?? visitDetail?.cc ?? DEFAULT_SCREENING_SUMMARY.cc,
  };

  const nurseExam = isCurrentVisit && form?.nurseExam
    ? form.nurseExam
    : DEFAULT_NURSE_EXAM_NOTES;
  const doctorExam = isCurrentVisit && form?.doctorExam
    ? form.doctorExam
    : DEFAULT_DOCTOR_EXAM_NOTES;

  const diagnosisText = isCurrentVisit
    ? (form?.diagnosisNote || visitMeta?.dx || '—')
    : (visitMeta?.dx ?? '—');

  const doctorOrders = isCurrentVisit
    ? (form?.doctorOrderNote || '—')
    : (visitMeta?.rx ?? '—');

  const medications = isCurrentVisit && form?.medications?.length
    ? form.medications
    : (visitMeta?.rx && visitMeta.rx !== '—'
      ? DEFAULT_MEDICATION_ORDERS.slice(0, 2)
      : DEFAULT_MEDICATION_ORDERS.slice(0, 2));

  const pharmacyRows = findPharmacyRowsByHn(hn);
  const pharmacy = pharmacyRows[0] ?? null;

  const finance = findFinanceRowByHn(hn);
  const isPastVisit = !isCurrentVisit && visitDate;

  const payment = finance
    ? {
        ...finance,
        visitDateLabel: isPastVisit ? visitDate : finance.visitDate,
        statusLabel: queueStatusLabel(finance.status),
        pharmacyStatusLabel: pharmacyQueueLabel(finance.pharmacyStatus),
      }
    : null;

  const appointment = isCurrentVisit && form?.appointment
    ? form.appointment
    : null;

  const stages = [
    {
      key: 'registration',
      order: 1,
      label: 'ลงทะเบียน / เปิด Visit',
      icon: 'how_to_reg',
      status: 'completed',
      fields: [
        { label: 'VN', value: registration.vn },
        { label: 'ศูนย์บริการ', value: registration.center ?? visitMeta?.center ?? '—' },
        { label: 'ห้องตรวจ / คลินิก', value: registration.clinic },
        { label: 'แพทย์ผู้รับผิดชอบ', value: registration.doctor || visitMeta?.doctor || '—' },
        { label: 'สิทธิการรักษา', value: registration.rights ?? payment?.rights?.label ?? '—' },
        { label: 'การเข้ามา', value: arrivalLabel(registration.arrival) },
        { label: 'ความเร่งด่วน', value: urgencyLabel(registration.urgency) },
        { label: 'เวลาเปิด Visit', value: registration.openedAt ?? registration.time },
        { label: 'ผู้เปิด VN', value: registration.openedBy ?? '—' },
        { label: 'อาการสำคัญ (CC)', value: registration.chiefComplaint ?? visitMeta?.cc ?? '—' },
      ],
    },
    {
      key: 'screening',
      order: 2,
      label: 'คัดกรองและซักประวัติ',
      icon: 'monitor_heart',
      status: 'completed',
      fields: [
        { label: 'อาการ (CC)', value: screening.cc },
        { label: 'ระยะเวลา', value: screening.duration ?? visitDetail?.duration ?? '—' },
        { label: 'Triage', value: screening.triage ? `Level ${screening.triage.level} · ${screening.triage.label}` : '—' },
        { label: 'สภาพผู้รับบริการ', value: screening.mobility?.label ?? '—' },
        { label: 'Pain score', value: screening.pain?.label ?? visitDetail?.pain?.label ?? '—' },
        { label: 'ผู้ประเมิน', value: screening.assessor?.name ?? '—' },
      ],
      orders: screening.orders ?? [],
    },
    {
      key: 'exam',
      order: 3,
      label: 'ตรวจร่างกาย',
      icon: 'stethoscope',
      status: isCurrentVisit && !form?.doctorExam?.pe ? 'in-progress' : 'completed',
      fields: [
        { label: 'CC (พยาบาล)', value: nurseExam.cc },
        { label: 'PI (พยาบาล)', value: nurseExam.pi || '—' },
        { label: 'PE (พยาบาล)', value: nurseExam.pe || '—' },
        { label: 'CC (แพทย์)', value: doctorExam.cc || '—' },
        { label: 'PI (แพทย์)', value: doctorExam.pi || '—' },
        { label: 'PE (แพทย์)', value: doctorExam.pe || '—' },
        { label: 'ระยะเวลา', value: nurseExam.duration ?? '—' },
      ],
    },
    {
      key: 'diagnosis',
      order: 4,
      label: 'วินิจฉัย / SOAP Note',
      icon: 'diagnosis',
      status: diagnosisText && diagnosisText !== '—' ? 'completed' : 'pending',
      fields: [
        { label: 'การวินิจฉัย', value: diagnosisText },
        { label: 'แพทย์ผู้สั่ง', value: visitMeta?.doctor ?? doctorLabel(form?.orderingDoctor) },
        { label: 'คำสั่งแพทย์', value: doctorOrders },
      ],
      icdRows: isCurrentVisit && form?.diagnoses?.length
        ? form.diagnoses.map((d) => ({ code: d.code, name: d.name }))
        : (visitMeta?.dx
          ? [{ code: visitMeta.dx.match(/\(([A-Z0-9.]+)\)/)?.[1] ?? '—', name: visitMeta.dx }]
          : []),
    },
    {
      key: 'orders',
      order: 5,
      label: 'สั่งการรักษา',
      icon: 'medication',
      status: medications?.length ? 'completed' : 'pending',
      medications: mapMedicationLines(medications),
      /* ครั้งเก่าที่ไม่มีรายการในใบเสร็จ ให้ตกไปอ่านผลที่บันทึกไว้กับตัว visit
         (`labs` / `imaging` ใน treatmentVisits) — เดิมแท็บ "ผลการตรวจแล็บ" ของ
         โหมดดูตามวันที่จึงว่างเปล่าทุกครั้ง ทั้งที่ประวัติมีผลอยู่ (28 ส.ค. 69) */
      labs: isCurrentVisit && form?.labs?.length
        ? form.labs.map((l) => l.name ?? l.label ?? String(l))
        : (payment?.items?.filter((i) => i.category === 'lab').map((i) => i.label).length
          ? payment.items.filter((i) => i.category === 'lab').map((i) => i.label)
          : splitResultList(visitDetail?.labs)),
      imaging: isCurrentVisit && form?.xrayOrders?.length
        ? form.xrayOrders.map((o) => o.examId ?? String(o))
        : (payment?.items?.filter((i) => i.category === 'radiology').map((i) => i.label).length
          ? payment.items.filter((i) => i.category === 'radiology').map((i) => i.label)
          : splitResultList(visitDetail?.imaging)),
    },
    {
      key: 'pharmacy',
      order: 6,
      label: 'จ่ายยา / ห้องยา',
      icon: 'pill',
      status: pharmacy
        ? (pharmacy.status === 'dispensed' ? 'completed' : 'in-progress')
        : 'none',
      fields: pharmacy
        ? [
            { label: 'คิวห้องยา', value: pharmacy.queueNo },
            { label: 'เวลาสั่งจ่าย', value: pharmacy.issuedAt ? `${pharmacy.issuedAt} น.` : '—' },
            { label: 'สถานะ', value: pharmacy.status ?? '—' },
            { label: 'การวินิจฉัย (Rx)', value: pharmacy.diagnosis?.name ?? '—' },
          ]
        : [{ label: 'สถานะ', value: payment?.pharmacyStatusLabel ?? 'ไม่มีรายการยา' }],
      medications: pharmacy
        ? pharmacy.items.map((it) => ({
            label: it.name,
            detail: [it.frequency, it.when].filter(Boolean).join(' · '),
            qty: it.quantity,
          }))
        : [],
    },
    {
      key: 'appointment',
      order: 7,
      label: 'นัดหมาย',
      icon: 'event_available',
      status: appointment?.mode === 'schedule' ? 'completed'
        : appointment?.mode === 'skip' ? 'skipped'
          : 'none',
      fields: appointment?.mode === 'schedule'
        ? [
            { label: 'คลินิก', value: appointment.clinic ?? '—' },
            { label: 'ประเภท', value: appointment.type ?? '—' },
            { label: 'แพทย์', value: doctorLabel(appointment.doctor) },
            { label: 'วันที่นัด', value: appointment.date || '—' },
            { label: 'เหตุผล', value: appointment.reason || '—' },
          ]
        : [{ label: 'สถานะ', value: appointment?.mode === 'skip' ? 'ไม่นัดหมาย' : 'ยังไม่มีการนัด' }],
    },
    {
      key: 'payment',
      order: 8,
      label: 'ชำระเงิน',
      icon: 'payments',
      status: payment?.status === 'paid' ? 'completed'
        : payment?.status === 'voided' ? 'voided'
          : payment ? 'pending' : 'none',
      fields: payment
        ? [
            { label: 'คิวการเงิน', value: payment.queueNo },
            { label: 'วันที่รับบริการ', value: payment.visitDateLabel ?? payment.visitDate },
            { label: 'เวลารับบริการ', value: payment.visitTime ? `${payment.visitTime} น.` : '—' },
            { label: 'สถานะ', value: payment.statusLabel },
            { label: 'ยอดรวม', value: formatBaht(payment.totalCharge) },
            { label: 'เบิกสิทธิ', value: formatBaht(payment.rightsCoverage) },
            { label: 'ส่วนเกินสิทธิ / ผู้ป่วยจ่าย', value: formatBaht(payment.amountDue) },
            { label: 'ส่วนลด', value: payment.discount ? formatBaht(payment.discount) : '—' },
            { label: 'วิธีชำระ', value: payment.paymentMethod ? paymentMethodLabel(payment.paymentMethod) : '—' },
            { label: 'เลขที่ใบเสร็จ', value: payment.receiptNo ?? '—' },
            { label: 'วันที่รับชำระ', value: payment.paidAt ?? '—' },
            { label: 'แคชเชียร์', value: payment.cashier ?? '—' },
          ]
        : [{ label: 'สถานะ', value: isPastVisit ? 'ชำระแล้ว (ย้อนหลัง)' : '—' }],
      chargeLines: payment ? mapChargeLines(payment.items) : [],
    },
  ];

  return {
    hn,
    visitDate: visitDate ?? visitMeta?.date ?? 'ครั้งนี้',
    isCurrentVisit,
    visitMeta,
    registration,
    screening,
    nurseExam,
    doctorExam,
    diagnosisText,
    doctorOrders,
    medications,
    pharmacy,
    payment,
    appointment,
    stages,
  };
};
