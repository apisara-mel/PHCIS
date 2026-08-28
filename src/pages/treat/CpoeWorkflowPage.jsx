import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import StepProgress from '@/components/step/StepProgress';
import InputField from '@/components/forms/InputField';
import Select from '@/components/forms/Select';
import Checkbox from '@/components/checkbox/Checkbox';
import Table, { EllipsisText } from '@/components/table/Table';
import StatusBadge from '@/components/badge/StatusBadge';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import BrandButton from '@/components/button/BrandButton';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import DangerSubdueButton from '@/components/button/DangerSubdueButton';
import Icon from '@/components/icons/Icon';
import Alert from '@/components/alert/Alert';
import AlertDialog from '@/components/popup/AlertDialog';
import UnsavedChangesPopup from '@/components/popup/UnsavedChangesPopup';
import { PATIENT_PROFILES } from '@/data/patientProfiles';
import {
  CPOE_CATALOG,
  CPOE_INITIAL_ORDER_IDS,
  CPOE_RECENT_RESULTS,
  CPOE_TYPE_META,
  buildNewTrackingRows,
  resolveCpoeOrder,
} from '@/data/cpoeWorkflow';
import { XRAY_EXAM_BY_ID } from '@/data/xrayCatalog';
import {
  InfoPair,
  PanelCard,
  PANEL_LABEL_STYLE,
  PANEL_TITLE_STYLE,
  PANEL_VALUE_STYLE,
} from '@/pages/treat/panels/panelKit';

const STEPS = [
  { title: 'สร้างคำสั่ง', subtitle: 'Create Order' },
  { title: 'เลือกรายการ', subtitle: 'Select Orders' },
  { title: 'ตรวจสอบและยืนยัน', subtitle: 'Review & Confirm' },
  { title: 'ติดตามและดูผล', subtitle: 'Tracking & Results' },
];

const TYPE_BADGE_STYLE = { lab: 'purple', xray: 'blue', procedure: 'teal' };
const STATUS_META = {
  sent: { style: 'info', label: 'ส่งปลายทางแล้ว', icon: 'send' },
  accepted: { style: 'yellow', label: 'รับคำสั่งแล้ว', icon: 'task_alt' },
  inprogress: { style: 'warning', label: 'กำลังดำเนินการ', icon: 'pending' },
  reported: { style: 'success', label: 'รายงานผลแล้ว', icon: 'check_circle' },
  critical: { style: 'error', label: 'ผลวิกฤต', icon: 'notification_important' },
  cancelled: { style: 'neutral', label: 'ยกเลิกแล้ว', icon: 'block' },
};

const URGENCY_OPTIONS = [
  { value: 'routine', label: 'Routine — ภายในเวลาปกติ' },
  { value: 'urgent', label: 'Urgent — ภายใน 2 ชั่วโมง' },
  { value: 'stat', label: 'STAT — ดำเนินการทันที' },
];

const TYPE_FILTERS = [
  { key: 'all', label: 'ทั้งหมด', icon: 'apps' },
  { key: 'lab', label: 'Lab', icon: 'biotech' },
  { key: 'xray', label: 'Radiology', icon: 'radiology' },
  { key: 'procedure', label: 'Procedure', icon: 'medical_services' },
];

const DEMO_PATIENT = PATIENT_PROFILES.find((item) => item.hn === '67-00003') || PATIENT_PROFILES[0];

/* วัน-เวลาปัจจุบันในรูปแบบ พ.ศ. ที่ทั้งหน้านี้ใช้ ("2569-08-25T10:20").
   เดิม initialHeader ตรึงวันไว้ที่ 24 ส.ค. 2569 — ทุกใบสั่งที่เปิดวันอื่น
   จึงถูกประทับวันย้อนหลัง และ `วันที่ต้องการตรวจ` ก็เป็นอดีตตั้งแต่เปิดฟอร์ม */
const pad2 = (n) => String(n).padStart(2, '0');
const toBuddhistDateTimeInput = (d) =>
  `${d.getFullYear() + 543}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
  + `T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
const buildInitialHeader = () => ({
  requestingUnit: 'opd-2',
  orderedAt: toBuddhistDateTimeInput(new Date()),
  requestedAt: toBuddhistDateTimeInput(new Date(Date.now() + 40 * 60 * 1000)),
  urgency: 'routine',
  indication: 'ไอเรื้อรัง เหนื่อยง่าย น้ำหนักลด ต้องการประเมินพยาธิสภาพทรวงอก',
  diagnosis: 'R05.3 — Chronic cough',
  physicianQuestion: 'ประเมินรอยโรคในทรวงอกและภาวะแทรกซ้อนก่อนวางแผนรักษา',
});

const initialSafety = {
  pregnancyStatus: 'not-pregnant',
  lmp: '2569-08-02',
  allergyReviewed: true,
  contrastAllergy: false,
  egfr: '38',
  diabetes: true,
  metformin: true,
  implant: false,
  isolation: false,
  weight: '62',
  height: '158',
  renalReason: '',
  renalProtection: false,
  radiologistConsulted: false,
};

const initialDelivery = { printGuide: true, queueTicket: true, sms: false };

const formatMoney = (value) => Number(value || 0).toLocaleString('th-TH');
const nowLabel = () => new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

const TypeBadge = ({ type }) => (
  <ColorfulBadge style={TYPE_BADGE_STYLE[type] || 'grey'} size='small' hierarchy='secondary'>
    {CPOE_TYPE_META[type]?.short || type}
  </ColorfulBadge>
);

const OrderTitle = ({ order }) => (
  <div className='flex items-start min-w-0' style={{ gap: 'var(--dim-space-200)' }}>
    <span
      className='inline-flex items-center justify-center shrink-0'
      style={{
        width: 'var(--dim-size-700)',
        height: 'var(--dim-size-700)',
        borderRadius: 'var(--dim-radius-200)',
        background: 'var(--surface-brandPrimary-quaternary)',
        color: 'var(--icon-brandprimarybutton-default)',
      }}
    >
      <Icon name={CPOE_TYPE_META[order.type]?.icon || 'assignment'} size='var(--dim-size-400)' />
    </span>
    <span className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-050)' }}>
      <span style={{ ...PANEL_VALUE_STYLE, fontWeight: 'var(--type-weight-medium)' }}>{order.name}</span>
      <span style={PANEL_LABEL_STYLE}>{order.code} · ส่ง {order.destination}</span>
    </span>
  </div>
);

const PatientBanner = ({ patient }) => (
  <section
    className='w-full flex flex-col lg:flex-row lg:items-center'
    style={{
      gap: 'var(--dim-space-400)',
      paddingTop: 'var(--dim-space-400)',
      paddingRight: 'var(--dim-space-500)',
      paddingBottom: 'var(--dim-space-400)',
      paddingLeft: 'var(--dim-space-500)',
      background: 'var(--surface-card-default)',
      border: 'var(--dim-stroke-100) solid var(--border-card-default)',
      borderRadius: 'var(--dim-radius-400)',
      boxShadow: 'var(--shadow-card)',
    }}
  >
    <div className='flex items-center min-w-0' style={{ gap: 'var(--dim-space-300)' }}>
      <img
        src={patient.avatarUrl}
        alt=''
        className='shrink-0 object-cover'
        style={{ width: 'var(--dim-size-1200)', height: 'var(--dim-size-1200)', borderRadius: 'var(--dim-radius-full)' }}
      />
      <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-100)' }}>
        <span style={{ ...PANEL_TITLE_STYLE, fontSize: 'var(--type-size-lg)' }}>{patient.fullName}</span>
        <span style={PANEL_LABEL_STYLE}>HN {patient.hn} · Visit {patient.vn} · {patient.sex} · {patient.age}</span>
      </div>
    </div>
    <div className='flex-1 grid grid-cols-2 md:grid-cols-4 min-w-0' style={{ gap: 'var(--dim-space-300)' }}>
      <InfoPair label='สิทธิการรักษา' value='บัตรทอง' minWidth={0} />
      <InfoPair label='แพ้ยา' value='Penicillin · ผื่นลมพิษ' minWidth={0} />
      <InfoPair label='eGFR ล่าสุด' value='38 mL/min/1.73m²' minWidth={0} />
      <InfoPair label='สัญญาณชีพ' value='BP 142/86 · PR 82' minWidth={0} />
    </div>
    <StatusBadge style='warning' size='default' icon='warning'>มีความเสี่ยงก่อนใช้ Contrast</StatusBadge>
  </section>
);

const MetricCard = ({ icon, label, value, tone = 'info' }) => (
  <div
    className='flex items-center min-w-0'
    style={{
      gap: 'var(--dim-space-300)',
      paddingTop: 'var(--dim-space-300)',
      paddingRight: 'var(--dim-space-400)',
      paddingBottom: 'var(--dim-space-300)',
      paddingLeft: 'var(--dim-space-400)',
      border: 'var(--dim-stroke-100) solid var(--border-card-default)',
      borderRadius: 'var(--dim-radius-300)',
      background: 'var(--surface-card-default)',
    }}
  >
    <StatusBadge style={tone} size='default' showText={false} icon={icon} />
    <span className='flex flex-col min-w-0'>
      <span style={{ ...PANEL_TITLE_STYLE, fontSize: 'var(--type-size-xl)' }}>{value}</span>
      <span style={PANEL_LABEL_STYLE}>{label}</span>
    </span>
  </div>
);

/* ทุกคำสั่งใน Visit ที่ CPOE แทนค่าได้ — ไม่ใช่แค่ 15 รายการที่ยกมาโชว์เป็น
   การ์ด เดิมกรองด้วย CPOE_CATALOG_BY_ID ทำให้แล็บ/รังสีที่สั่งจาก popup
   "เพิ่มรายการ" (แค็ตตาล็อกเต็ม) หายไปจากตะกร้า แล้วข้ามด่านลงนามไปเงียบ ๆ */
const treatmentOrderIds = (form) => [
  ...(form?.labs || []).map((item) => item.testId),
  ...(form?.xrayOrders || []).map((item) => item.examId),
  ...(form?.procedureOrders || []).filter((item) => !item.cancelledAt).map((item) => `procedure-${item.code}`),
].filter((id) => resolveCpoeOrder(id));

const CpoeWorkflowPage = ({ embedded = false, patient: patientProp, form, setForm }) => {
  const history = useHistory();
  const patient = patientProp || DEMO_PATIENT;
  const workflowSeed = form?.cpoeWorkflow || {};
  const draftKey = `mih:cpoe-workflow:draft:${patient?.hn || 'unknown'}`;
  const [step, setStep] = useState(workflowSeed.step || 0);
  const [header, setHeader] = useState(() => workflowSeed.header || buildInitialHeader());
  const [safety, setSafety] = useState(workflowSeed.safety || initialSafety);
  const [selectedIds, setSelectedIds] = useState(
    workflowSeed.selectedIds || (embedded ? treatmentOrderIds(form) : CPOE_INITIAL_ORDER_IDS),
  );
  const [delivery, setDelivery] = useState(workflowSeed.delivery || initialDelivery);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [coverageOnly, setCoverageOnly] = useState(false);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState('');
  const [attest, setAttest] = useState(false);
  const [signPin, setSignPin] = useState('');
  const [signatureError, setSignatureError] = useState('');
  const [routing, setRouting] = useState(workflowSeed.routing || []);
  const [trackingRows, setTrackingRows] = useState(workflowSeed.trackingRows || CPOE_RECENT_RESULTS);
  const [trackingQuery, setTrackingQuery] = useState('');
  const [trackingType, setTrackingType] = useState('all');
  const [trackingStatus, setTrackingStatus] = useState('all');
  const [selectedTrackingId, setSelectedTrackingId] = useState(CPOE_RECENT_RESULTS[0]?.id);
  const [sortConfig, setSortConfig] = useState({ key: 'orderedAt', direction: 'desc' });
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [ackTarget, setAckTarget] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [lastSaved, setLastSaved] = useState('ยังไม่บันทึก');
  const [leaveGuard, setLeaveGuard] = useState(false);
  const [toast, setToast] = useState('');
  const autosaveReady = useRef(false);

  const selectedOrders = useMemo(
    () => selectedIds.map((id) => resolveCpoeOrder(id)).filter(Boolean),
    [selectedIds],
  );

  const contrastOrders = selectedOrders.filter((order) => order.contrast);
  const femaleScreeningOrders = selectedOrders.filter((order) => order.femaleScreening);
  const egfrLow = Number(safety.egfr) > 0 && Number(safety.egfr) < 45;

  const readinessIssues = useMemo(() => {
    const issues = [];
    if (!header.requestingUnit) issues.push('ระบุหน่วยงานที่ส่งตรวจ');
    if (!header.requestedAt) issues.push('ระบุวันและเวลาที่ต้องการตรวจ');
    if (!header.indication.trim()) issues.push('ระบุข้อบ่งชี้ทางคลินิก');
    if (!header.diagnosis.trim()) issues.push('ระบุ provisional diagnosis / ICD-10');
    if (!safety.weight || !safety.height) issues.push('ระบุน้ำหนักและส่วนสูง');
    if (femaleScreeningOrders.length > 0 && safety.pregnancyStatus === 'unknown') {
      issues.push('ยืนยันสถานะการตั้งครรภ์/LMP ก่อนส่งตรวจ');
    }
    if (contrastOrders.length > 0 && !safety.allergyReviewed) issues.push('ทบทวนประวัติแพ้ยาและสารทึบรังสี');
    if (contrastOrders.length > 0 && safety.contrastAllergy && !safety.radiologistConsulted) {
      issues.push('ผู้ป่วยแพ้สารทึบรังสี ต้องปรึกษารังสีแพทย์และยืนยันแผน');
    }
    if (contrastOrders.length > 0 && egfrLow && (!safety.renalReason.trim() || !safety.renalProtection)) {
      issues.push('eGFR ต่ำกว่า 45 ต้องระบุเหตุผลและมาตรการป้องกันไต');
    }
    return issues;
  }, [contrastOrders.length, egfrLow, femaleScreeningOrders.length, header, safety]);

  useEffect(() => {
    if (!autosaveReady.current) {
      autosaveReady.current = true;
      return undefined;
    }
    setDirty(true);
    const timer = window.setTimeout(() => {
      const payload = {
        step, header, safety, selectedIds, delivery, routing, trackingRows,
        savedAt: new Date().toISOString(),
      };
      window.sessionStorage.setItem(draftKey, JSON.stringify(payload));
      setLastSaved(`บันทึกล่าสุด ${nowLabel()} น.`);
      setDirty(false);
    }, 800);
    return () => window.clearTimeout(timer);
  }, [delivery, draftKey, header, routing, safety, selectedIds, step, trackingRows]);

  /* Embedded mode is the canonical Step 6 CPOE surface. Keep every field
     on TreatmentFormPage's encounter-scoped form so the page-level draft,
     dirty guard, and patient switch safety cover this workflow too. */
  useEffect(() => {
    if (!embedded || !setForm) return;
    const nextWorkflow = {
      step, header, safety, selectedIds, delivery, routing, trackingRows,
    };
    setForm((current) => {
      if (JSON.stringify(current.cpoeWorkflow || {}) === JSON.stringify(nextWorkflow)) return current;
      return { ...current, cpoeWorkflow: nextWorkflow };
    });
  }, [delivery, embedded, header, routing, safety, selectedIds, setForm, step, trackingRows]);

  /* Category panels and the unified picker edit the same order arrays.
     Reconcile curated Lab/Radiology/Procedure IDs back into the workflow
     whenever a row is added or removed from either surface. */
  useEffect(() => {
    if (!embedded) return;
    const next = treatmentOrderIds(form);
    setSelectedIds((current) => (
      JSON.stringify(current) === JSON.stringify(next) ? current : next
    ));
  }, [embedded, form?.labs, form?.procedureOrders, form?.xrayOrders]);

  useEffect(() => {
    const guard = (event) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', guard);
    return () => window.removeEventListener('beforeunload', guard);
  }, [dirty]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(''), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const setHeaderField = (key, value) => setHeader((current) => ({ ...current, [key]: value }));
  const setSafetyField = (key, value) => setSafety((current) => ({ ...current, [key]: value }));
  const setDeliveryField = (key, value) => setDelivery((current) => ({ ...current, [key]: value }));

  const reloadCatalog = () => {
    setCatalogError('');
    setCatalogLoading(true);
    window.setTimeout(() => setCatalogLoading(false), 650);
  };

  const filteredCatalog = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('th-TH');
    return CPOE_CATALOG.filter((item) => (
      (typeFilter === 'all' || item.type === typeFilter)
      && (!coverageOnly || item.covered)
      && (!needle || `${item.code} ${item.name} ${item.preparation}`.toLocaleLowerCase('th-TH').includes(needle))
    ));
  }, [coverageOnly, query, typeFilter]);

  /* CPOE → form: ตะกร้าคือความจริงชุดเดียวกับคำสั่งใน Visit
     - แถวที่ CPOE แทนค่าไม่ได้ (ไม่อยู่ในแค็ตตาล็อกจริงเลย) ปล่อยไว้ ไม่แตะ
     - แถวหัตถการที่ยกเลิกแล้วเก็บไว้เป็นประวัติ ไม่ให้ตะกร้าลบทิ้ง
     เดิมกรองด้วยชุด id ของแค็ตตาล็อก 15 ใบ ติ๊กออกจากตะกร้าจึงลบได้เฉพาะ
     15 ใบนั้น ส่วนใบอื่นค้างอยู่ในฟอร์มแบบเงียบ ๆ */
  const syncTreatmentOrders = (nextIds) => {
    if (!embedded || !setForm) return;
    const wanted = new Set(nextIds);
    const keep = (id) => !resolveCpoeOrder(id) || wanted.has(id);

    setForm((current) => {
      const labs = (current.labs || []).filter((item) => keep(item.testId));
      const xrayOrders = (current.xrayOrders || []).filter((item) => keep(item.examId));
      const procedureOrders = (current.procedureOrders || []).filter((item) => (
        item.cancelledAt || keep(`procedure-${item.code}`)
      ));

      nextIds.forEach((id) => {
        const order = resolveCpoeOrder(id);
        if (!order) return;

        if (order.type === 'lab' && !labs.some((row) => row.testId === id)) {
          labs.push({
            id: `lab-${id}-${Date.now()}`,
            testId: id,
            urgency: header.urgency,
            note: header.physicianQuestion,
            quantity: 1,
            unit: 'ครั้ง',
          });
          return;
        }

        if (order.type === 'xray' && !xrayOrders.some((row) => row.examId === id)) {
          xrayOrders.push({
            examId: id,
            view: XRAY_EXAM_BY_ID[id]?.views?.[0] || '',
            urgency: header.urgency,
            note: header.physicianQuestion,
            quantity: 1,
            unit: 'ครั้ง',
          });
          return;
        }

        if (order.type === 'procedure'
          && !procedureOrders.some((row) => !row.cancelledAt && row.code === order.code)) {
          procedureOrders.push({
            id: `proc-${Date.now()}-${order.code}`,
            code: order.code,
            name: order.name,
            startDate: new Date().toISOString().slice(0, 10),
            startTime: '',
            endDate: '',
            endTime: '',
            site: '',
            qty: 1,
            unit: 'ครั้ง',
            unitPrice: order.price,
            claimPerUnit: order.covered ? order.price : 0,
            performer: 'somying',
            detail: header.physicianQuestion,
            urgency: header.urgency,
          });
        }
      });

      return { ...current, labs, xrayOrders, procedureOrders };
    });
  };

  const updateSelectedIds = (updater) => {
    const next = typeof updater === 'function' ? updater(selectedIds) : updater;
    setSelectedIds(next);
    syncTreatmentOrders(next);
  };

  const toggleOrder = (id) => updateSelectedIds((current) => (
    current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
  ));

  const selectedColumns = [
    { key: 'type', header: 'ประเภท', render: (row) => <TypeBadge type={row.type} /> },
    { key: 'name', header: 'รายการ', render: (row) => <OrderTitle order={row} /> },
    { key: 'urgency', header: 'ความเร่งด่วน', render: (row) => (
      <StatusBadge style={header.urgency === 'stat' ? 'error' : header.urgency === 'urgent' ? 'warning' : 'neutral'} size='small'>
        {header.urgency.toUpperCase()}
      </StatusBadge>
    ) },
    { key: 'coverage', header: 'สิทธิ/ราคา', render: (row) => (
      <span style={PANEL_VALUE_STYLE}>{row.covered ? 'เบิกได้' : 'ชำระบางส่วน'} · {formatMoney(row.price)} บาท</span>
    ) },
    { key: 'action', header: 'การดำเนินการ', render: (row) => (
      <DangerSubdueButton size='sm' variant='outline' leadingIcon='delete' onClick={() => toggleOrder(row.id)}>ลบ</DangerSubdueButton>
    ) },
  ];

  const groupedOrders = useMemo(() => selectedOrders.reduce((groups, order) => {
    if (!groups[order.destination]) groups[order.destination] = [];
    groups[order.destination].push(order);
    return groups;
  }, {}), [selectedOrders]);

  /* ปลายทางต้องมาจากรายการที่แพทย์เลือกจริง — เดิม hard-code ไว้ 3 ปลายทาง
     ทุกครั้ง สั่งแล็บใบเดียวก็ยังขึ้น "RIS/PACS ล้มเหลว" กับ "ห้องพยาบาล
     สำเร็จ" ทั้งที่ไม่ได้สั่ง (เห็นตอนเปิดหน้าจริง 25 ส.ค. 69)
     RIS/PACS ยังคงล้มเหลวไว้ตอนที่ "มีคำสั่งรังสีจริง" เพื่อให้ยังเดโม
     ปุ่มส่งซ้ำได้ ไม่ใช่เพื่อสุ่มความล้มเหลวให้ทุกใบ */
  const buildRoutingFor = (orders) => {
    const destinations = [];
    orders.forEach((order) => {
      const dest = order.destination || CPOE_TYPE_META[order.type]?.destination;
      if (dest && !destinations.includes(dest)) destinations.push(dest);
    });
    return destinations.map((destination) => (
      destination === 'RIS/PACS'
        ? { destination, status: 'error', detail: 'RIS ไม่ตอบกลับภายในเวลาที่กำหนด' }
        : {
          destination,
          status: 'success',
          detail: destination === 'LIS'
            ? 'LN-2569-10831 · รับเข้าคิวแล้ว'
            : 'คิว N-021 · รับคำสั่งแล้ว',
        }
    ));
  };

  /* คำสั่งที่ปลายทางตอบรับแล้วต้องโผล่ในตารางติดตาม (Step 4) ทันที —
     เดิมสร้างแถวเฉพาะตอนกด "ส่งซ้ำ" คนที่ส่งผ่านตั้งแต่ครั้งแรกจึงไป
     หน้าติดตามแล้วไม่เจอคำสั่งของตัวเอง */
  const appendTrackingRows = (orders) => {
    if (!orders.length) return;
    setTrackingRows((current) => {
      const existingIds = new Set(current.map((item) => item.item));
      const created = buildNewTrackingRows(orders).filter((item) => !existingIds.has(item.item));
      return [...created, ...current];
    });
  };

  const startRouting = () => {
    setSignatureError('');
    if (!attest) {
      setSignatureError('กรุณารับรองว่าทบทวนข้อมูลผู้ป่วยและคำสั่งทั้งหมดแล้ว');
      return;
    }
    if (signPin !== '123456') {
      setSignatureError('PIN ไม่ถูกต้อง — สำหรับต้นแบบใช้ 123456');
      return;
    }
    const nextRouting = buildRoutingFor(selectedOrders);
    setRouting(nextRouting);
    const delivered = new Set(
      nextRouting.filter((item) => item.status === 'success').map((item) => item.destination),
    );
    appendTrackingRows(selectedOrders.filter((order) => delivered.has(order.destination)));
    const okCount = nextRouting.filter((item) => item.status === 'success').length;
    setToast(okCount === nextRouting.length
      ? `ลงนามสำเร็จ · ส่งคำสั่งครบ ${okCount} ปลายทาง`
      : `ลงนามสำเร็จ · ส่งคำสั่งแล้ว ${okCount} จาก ${nextRouting.length} ปลายทาง`);
  };

  const retryFailedRouting = () => {
    const retried = routing.filter((item) => item.status === 'error').map((item) => item.destination);
    if (!retried.length) return;
    setRouting((current) => current.map((item) => (
      item.status === 'error'
        ? { ...item, status: 'success', detail: 'XN-2569-01496 · ส่งซ้ำสำเร็จและรับเข้าคิวแล้ว' }
        : item
    )));
    /* เฉพาะคำสั่งของปลายทางที่เพิ่งส่งซ้ำ — ของปลายทางอื่นขึ้นตารางไปแล้ว
       ตั้งแต่ตอนลงนาม */
    appendTrackingRows(selectedOrders.filter((order) => retried.includes(order.destination)));
    setToast(`ส่งคำสั่งเข้า ${retried.join(' · ')} ซ้ำสำเร็จ`);
  };

  const routingHasError = routing.some((item) => item.status === 'error');
  const routingComplete = routing.length > 0 && !routingHasError;

  const filteredTracking = useMemo(() => {
    const needle = trackingQuery.trim().toLocaleLowerCase('th-TH');
    const filtered = trackingRows.filter((row) => (
      (trackingType === 'all' || row.type === trackingType)
      && (trackingStatus === 'all' || row.status === trackingStatus)
      && (!needle || `${row.id} ${patient.hn} ${row.item} ${row.orderer}`.toLocaleLowerCase('th-TH').includes(needle))
    ));
    const direction = sortConfig.direction === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => String(a[sortConfig.key] || '').localeCompare(String(b[sortConfig.key] || ''), 'th') * direction);
  }, [sortConfig, trackingQuery, trackingRows, trackingStatus, trackingType]);

  const selectedTracking = trackingRows.find((row) => row.id === selectedTrackingId) || filteredTracking[0];

  const trackingColumns = [
    { key: 'id', header: 'Order ID', sortable: true, render: (row) => <ColorfulBadge style='indigo' size='small'>{row.id}</ColorfulBadge> },
    { key: 'orderedAt', header: 'วันที่สั่ง', sortable: true },
    { key: 'type', header: 'ประเภท', render: (row) => <TypeBadge type={row.type} /> },
    { key: 'item', header: 'รายการ', sortable: true, render: (row) => <EllipsisText text={row.item} /> },
    { key: 'orderer', header: 'แพทย์ผู้สั่ง', sortable: true },
    { key: 'status', header: 'สถานะ', render: (row) => {
      const meta = STATUS_META[row.status] || STATUS_META.sent;
      return <StatusBadge style={meta.style} size='small' icon={meta.icon}>{row.statusLabel || meta.label}</StatusBadge>;
    } },
  ];

  const onSort = (key) => setSortConfig((current) => ({
    key,
    direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
  }));

  const confirmCancel = () => {
    if (!cancelTarget || !cancelReason.trim()) return;
    setTrackingRows((current) => current.map((row) => (
      row.id === cancelTarget.id
        ? {
          ...row,
          status: 'cancelled',
          statusLabel: cancelTarget.status === 'sent' ? 'ยกเลิกแล้ว' : 'ส่งคำขอยกเลิกแล้ว',
          resultNote: `เหตุผล: ${cancelReason}`,
          timeline: [...row.timeline, {
            time: nowLabel(),
            title: cancelTarget.status === 'sent' ? 'ยกเลิกคำสั่ง' : 'ส่งคำขอยกเลิกไปยังปลายทาง',
            detail: cancelReason,
          }],
        }
        : row
    )));
    setCancelTarget(null);
    setCancelReason('');
    setToast('บันทึกเหตุผลและแจ้งปลายทางแล้ว');
  };

  const acknowledgeCritical = () => {
    if (!ackTarget) return;
    setTrackingRows((current) => current.map((row) => (
      row.id === ackTarget.id
        ? {
          ...row,
          acknowledged: true,
          timeline: [...row.timeline, { time: nowLabel(), title: 'แพทย์รับทราบผลวิกฤต', detail: 'พญ.สมหญิง รักษ์ดี · บันทึก Audit แล้ว' }],
        }
        : row
    )));
    setAckTarget(null);
    setToast('ยืนยันรับทราบผลวิกฤตและบันทึก Audit แล้ว');
  };

  const leavePage = () => {
    if (dirty) setLeaveGuard(true);
    else history.push('/treat/record');
  };

  const saveNowAndLeave = () => {
    window.sessionStorage.setItem(draftKey, JSON.stringify({
      step, header, safety, selectedIds, delivery, routing, trackingRows,
      savedAt: new Date().toISOString(),
    }));
    setDirty(false);
    history.push('/treat/record');
  };

  const goNext = () => {
    if (step === 0 && readinessIssues.length === 0) setStep(1);
    else if (step === 1 && selectedOrders.length > 0) setStep(2);
    else if (step === 2 && routing.length === 0) startRouting();
    else if (step === 2 && routingHasError) retryFailedRouting();
    else if (step === 2 && routingComplete) setStep(3);
    else if (step === 3) setToast(`รีเฟรชสถานะล่าสุด ${nowLabel()} น.`);
  };

  const nextDisabled = step === 0
    ? readinessIssues.length > 0
    : step === 1
      ? selectedOrders.length === 0
      : step === 2 && routing.length === 0
        ? (!attest || signPin.length !== 6)
        : false;

  const nextLabel = step === 0
    ? 'ไปเลือกรายการ'
    : step === 1
      ? 'ตรวจสอบคำสั่ง'
      : step === 2 && routing.length === 0
        ? 'ลงนามและส่งคำสั่ง'
        : step === 2 && routingHasError
          ? 'ส่งปลายทางที่ล้มเหลวอีกครั้ง'
          : step === 2
            ? 'ไปหน้าติดตาม'
            : 'รีเฟรชสถานะ';
  const mobileNextLabel = step === 0
    ? 'ถัดไป'
    : step === 1
      ? 'ตรวจสอบ'
      : step === 2 && routing.length === 0
        ? 'ส่งคำสั่ง'
        : step === 2 && routingHasError
          ? 'ส่งซ้ำ'
          : step === 2
            ? 'ติดตาม'
            : 'รีเฟรช';

  const renderCreateOrder = () => (
    <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
      {/* การ์ด "ข้อมูลคำสั่งร่วม" ถูกเอาออก 28 ส.ค. 69 */}

      {/* การ์ด "รายการที่เลือก" ถูกเอาออก 28 ส.ค. 69 */}

      <PanelCard title='แบบประเมินความปลอดภัยก่อนส่งคำสั่ง' subtitle='ระบบใช้ข้อมูลนี้ตรวจ warning และ hard stop ตามรายการที่เลือก'>
        <div className='grid grid-cols-1 xl:grid-cols-2' style={{ gap: 'var(--dim-space-500)' }}>
          <div className='flex flex-col' style={{ gap: 'var(--dim-space-400)' }}>
            <div className='grid grid-cols-1 md:grid-cols-2' style={{ gap: 'var(--dim-space-400)' }}>
              <Select
                label='สถานะการตั้งครรภ์'
                required={femaleScreeningOrders.length > 0}
                searchable={false}
                value={safety.pregnancyStatus}
                onChange={(value) => setSafetyField('pregnancyStatus', value)}
                options={[
                  { value: 'not-pregnant', label: 'ไม่ตั้งครรภ์' },
                  { value: 'pregnant', label: 'ตั้งครรภ์/สงสัยตั้งครรภ์' },
                  { value: 'unknown', label: 'ยังไม่ทราบ ต้องซักประวัติเพิ่ม' },
                  { value: 'not-applicable', label: 'ไม่เกี่ยวข้อง' },
                ]}
              />
              <InputField label='วันแรกของประจำเดือนครั้งสุดท้าย (LMP)' value={safety.lmp} onChange={(value) => setSafetyField('lmp', value)} disabled={safety.pregnancyStatus === 'not-applicable'} />
              <InputField label='eGFR ล่าสุด' required type='number' value={safety.egfr} onChange={(value) => setSafetyField('egfr', value)} helperText='mL/min/1.73m² · ผลวันที่ 24 ส.ค. 2569' />
              <div className='grid grid-cols-2' style={{ gap: 'var(--dim-space-300)' }}>
                <InputField label='น้ำหนัก (kg)' required type='number' value={safety.weight} onChange={(value) => setSafetyField('weight', value)} />
                <InputField label='ส่วนสูง (cm)' required type='number' value={safety.height} onChange={(value) => setSafetyField('height', value)} />
              </div>
            </div>
            <div className='grid grid-cols-1 md:grid-cols-2' style={{ gap: 'var(--dim-space-300)' }}>
              <Checkbox checked={safety.allergyReviewed} onChange={(value) => setSafetyField('allergyReviewed', value)} label='ทบทวนประวัติแพ้ยา/Contrast แล้ว' description='พบประวัติแพ้ Penicillin แต่ไม่เคยแพ้สารทึบรังสี' />
              <Checkbox checked={safety.contrastAllergy} onChange={(value) => setSafetyField('contrastAllergy', value)} label='มีประวัติแพ้สารทึบรังสี' />
              <Checkbox checked={safety.diabetes} onChange={(value) => setSafetyField('diabetes', value)} label='เบาหวาน' />
              <Checkbox checked={safety.metformin} onChange={(value) => setSafetyField('metformin', value)} label='ใช้ยา Metformin' description='พิจารณาหยุดยาตามแนวทางเมื่อใช้ Contrast' />
              <Checkbox checked={safety.implant} onChange={(value) => setSafetyField('implant', value)} label='มีโลหะฝัง/Pacemaker' />
              <Checkbox checked={safety.isolation} onChange={(value) => setSafetyField('isolation', value)} label='ต้องแยกโรค/ใช้ Isolation precaution' />
            </div>
          </div>
          <div className='flex flex-col' style={{ gap: 'var(--dim-space-300)' }}>
            {contrastOrders.length > 0 && egfrLow ? (
              <Alert
                type='destructive'
                title='Hard stop · eGFR ต่ำกว่า 45 และมีคำสั่งใช้สารทึบรังสี'
                subtext={`eGFR ${safety.egfr} · ${contrastOrders.map((item) => item.name).join(', ')}`}
                detail='ต้องระบุเหตุผลทางคลินิกและมาตรการลดความเสี่ยงต่อไตก่อนส่งคำสั่ง ระบบจะบันทึกทั้งสองรายการใน Audit log'
                showBadge={false}
                showIndicator={false}
              />
            ) : null}
            {/* แถบเขียว "ไม่พบข้อห้ามจากการทำงานของไต" ถูกเอาออก 28 ส.ค. 69 —
                แจ้งเฉพาะตอนมีข้อห้ามจริง (hard stop) พอ */}
            <InputField
              label='เหตุผลที่จำเป็นต้องใช้ Contrast'
              required={contrastOrders.length > 0 && egfrLow}
              value={safety.renalReason}
              onChange={(value) => setSafetyField('renalReason', value)}
              placeholder='ระบุ clinical benefit ที่มากกว่าความเสี่ยง'
              error={contrastOrders.length > 0 && egfrLow && !safety.renalReason.trim() ? 'จำเป็นต้องระบุเหตุผลก่อนส่งคำสั่ง' : undefined}
            />
            <Checkbox
              checked={safety.renalProtection}
              onChange={(value) => setSafetyField('renalProtection', value)}
              label='ยืนยันมาตรการป้องกันไต'
              description='ให้สารน้ำตามแนวทาง · ทบทวน Metformin · นัดตรวจ Creatinine ซ้ำ'
            />
            {safety.contrastAllergy ? (
              <Checkbox checked={safety.radiologistConsulted} onChange={(value) => setSafetyField('radiologistConsulted', value)} label='ปรึกษารังสีแพทย์และยืนยันแผนแล้ว' description='ระบุ premedication หรือเปลี่ยนวิธีตรวจไว้ใน Physician note' />
            ) : null}
            <div
              className='flex flex-col'
              style={{
                gap: 'var(--dim-space-200)',
                paddingTop: 'var(--dim-space-300)',
                paddingRight: 'var(--dim-space-300)',
                paddingBottom: 'var(--dim-space-300)',
                paddingLeft: 'var(--dim-space-300)',
                borderRadius: 'var(--dim-radius-200)',
                background: readinessIssues.length ? 'var(--surface-alert-warning)' : 'var(--surface-alert-success)',
                border: `var(--dim-stroke-100) solid ${readinessIssues.length ? 'var(--border-alert-warning)' : 'var(--border-alert-success)'}`,
              }}
            >
              <span style={PANEL_TITLE_STYLE}>{readinessIssues.length ? `ยังต้องแก้ไข ${readinessIssues.length} รายการ` : 'พร้อมไปเลือกรายการและตรวจสอบคำสั่ง'}</span>
              {readinessIssues.map((issue) => <span key={issue} style={PANEL_LABEL_STYLE}>• {issue}</span>)}
            </div>
          </div>
        </div>
      </PanelCard>
    </div>
  );

  const renderSelectOrders = () => (
    <div className='grid grid-cols-1 xl:grid-cols-3 w-full' style={{ gap: 'var(--dim-space-400)' }}>
      <div className='xl:col-span-2 flex flex-col min-w-0' style={{ gap: 'var(--dim-space-400)' }}>
        <PanelCard
          title='ค้นหาและเลือกรายการ'
          subtitle='ค้นด้วยรหัส ชื่อรายการ หรือการเตรียมตัว · ผลลัพธ์อัปเดตอัตโนมัติ'
          action={<NeutralSubdueButton size='sm' variant='outline' leadingIcon='refresh' onClick={reloadCatalog}>รีเฟรช</NeutralSubdueButton>}
        >
          <InputField label='ค้นหารายการ' showLabel={false} leadingIcon='search' value={query} onChange={setQuery} placeholder='เช่น CBC, CT chest, เย็บแผล' />
          <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
            {TYPE_FILTERS.map((item) => (
              <BrandSubdueButton key={item.key} size='sm' variant='outline' active={typeFilter === item.key} leadingIcon={item.icon} onClick={() => setTypeFilter(item.key)}>
                {item.label}
              </BrandSubdueButton>
            ))}
            <Checkbox checked={coverageOnly} onChange={setCoverageOnly} label='แสดงเฉพาะรายการที่เบิกได้เต็มจำนวน' />
          </div>

          {catalogError ? (
            <Alert
              type='error'
              title='โหลดรายการคำสั่งไม่สำเร็จ'
              subtext={catalogError}
              action={<BrandSubdueButton size='sm' onClick={reloadCatalog}>ลองอีกครั้ง</BrandSubdueButton>}
              showDetail={false}
              showBadge={false}
              showIndicator={false}
            />
          ) : catalogLoading ? (
            <div className='grid grid-cols-1 md:grid-cols-2' style={{ gap: 'var(--dim-space-300)' }} aria-label='กำลังโหลดรายการ'>
              {[0, 1, 2, 3].map((item) => (
                <div key={item} style={{ minHeight: 'var(--dim-size-1800)', borderRadius: 'var(--dim-radius-300)', background: 'var(--surface-table-hover)' }} />
              ))}
            </div>
          ) : filteredCatalog.length === 0 ? (
            <div className='flex flex-col items-center text-center' style={{ gap: 'var(--dim-space-200)', paddingTop: 'var(--dim-space-800)', paddingBottom: 'var(--dim-space-800)' }}>
              <Icon name='search_off' size='var(--dim-size-700)' color='var(--icon-neutral-tertiary)' />
              <span style={PANEL_TITLE_STYLE}>ไม่พบรายการที่ตรงกับ “{query}”</span>
              <span style={PANEL_LABEL_STYLE}>ลองใช้รหัสรายการ ชื่อภาษาอังกฤษ หรือเอาตัวกรองสิทธิออก</span>
            </div>
          ) : (
            <div className='grid grid-cols-1 md:grid-cols-2' style={{ gap: 'var(--dim-space-300)' }}>
              {filteredCatalog.map((order) => {
                const selected = selectedIds.includes(order.id);
                return (
                  <button
                    key={order.id}
                    type='button'
                    onClick={() => toggleOrder(order.id)}
                    aria-pressed={selected}
                    className='w-full flex flex-col text-left'
                    style={{
                      gap: 'var(--dim-space-300)',
                      paddingTop: 'var(--dim-space-400)',
                      paddingRight: 'var(--dim-space-400)',
                      paddingBottom: 'var(--dim-space-400)',
                      paddingLeft: 'var(--dim-space-400)',
                      borderRadius: 'var(--dim-radius-300)',
                      border: selected
                        ? 'var(--dim-stroke-200) solid var(--border-brandPrimary-default)'
                        : 'var(--dim-stroke-100) solid var(--border-card-default)',
                      background: selected ? 'var(--surface-card-brand100)' : 'var(--surface-card-default)',
                      boxShadow: selected ? 'var(--shadow-brand-top-200)' : 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <div className='flex items-start justify-between w-full' style={{ gap: 'var(--dim-space-300)' }}>
                      <OrderTitle order={order} />
                      <StatusBadge style={selected ? 'success' : 'neutral'} size='small' icon={selected ? 'check' : 'add'}>{selected ? 'เลือกแล้ว' : 'เพิ่ม'}</StatusBadge>
                    </div>
                    <span style={PANEL_LABEL_STYLE}>{order.preparation}</span>
                    <div className='flex items-center justify-between w-full' style={{ gap: 'var(--dim-space-300)' }}>
                      <TypeBadge type={order.type} />
                      <span style={PANEL_VALUE_STYLE}>{formatMoney(order.price)} บาท · {order.covered ? 'เบิกได้' : 'มีส่วนต่าง'}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </PanelCard>
      </div>

      <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-400)' }}>
        <PanelCard
          title={`ตะกร้าคำสั่ง (${selectedOrders.length})`}
          subtitle='รายการจะคงอยู่เมื่อเปลี่ยนหน้า'
          action={selectedOrders.length ? <DangerSubdueButton size='sm' variant='outline' onClick={() => updateSelectedIds([])}>ล้างทั้งหมด</DangerSubdueButton> : null}
        >
          {selectedOrders.length ? selectedOrders.map((order) => (
            <div
              key={order.id}
              className='flex items-start w-full'
              style={{
                gap: 'var(--dim-space-300)',
                paddingBottom: 'var(--dim-space-300)',
                borderBottom: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary)',
              }}
            >
              <div className='flex-1 min-w-0'><OrderTitle order={order} /></div>
              <DangerSubdueButton size='sm' variant='outline' showLabel={false} leadingIcon='delete' aria-label={`ลบ ${order.name}`} onClick={() => toggleOrder(order.id)} />
            </div>
          )) : (
            <span style={PANEL_LABEL_STYLE}>ยังไม่มีรายการ เลือกจากผลการค้นหาด้านซ้าย</span>
          )}
          <div className='flex items-center justify-between' style={{ gap: 'var(--dim-space-300)' }}>
            <span style={PANEL_TITLE_STYLE}>รวมโดยประมาณ</span>
            <span style={{ ...PANEL_TITLE_STYLE, fontSize: 'var(--type-size-lg)' }}>{formatMoney(selectedOrders.reduce((sum, order) => sum + order.price, 0))} บาท</span>
          </div>
        </PanelCard>
        {contrastOrders.length ? (
          <Alert type='warning' title='มีรายการใช้สารทึบรังสี' subtext='ระบบตรวจ eGFR, Metformin และประวัติแพ้แล้ว รายละเอียดจะแสดงซ้ำในหน้าตรวจสอบ' showDetail={false} showBadge={false} showIndicator={false} />
        ) : null}
      </div>
    </div>
  );

  const renderReview = () => (
    <div className='grid grid-cols-1 xl:grid-cols-3 w-full' style={{ gap: 'var(--dim-space-400)' }}>
      <div className='xl:col-span-2 flex flex-col min-w-0' style={{ gap: 'var(--dim-space-400)' }}>
        {Object.entries(groupedOrders).map(([destination, orders]) => (
          <PanelCard key={destination} title={`ส่งไป ${destination}`} subtitle={`${orders.length} รายการ · ส่งพร้อมกันภายใต้ลายเซ็นเดียว`} action={<StatusBadge style='info' size='small' icon='route'>{destination}</StatusBadge>}>
            {orders.map((order) => (
              <div key={order.id} className='flex flex-col md:flex-row md:items-center' style={{ gap: 'var(--dim-space-300)', paddingBottom: 'var(--dim-space-300)', borderBottom: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary)' }}>
                <div className='flex-1 min-w-0'><OrderTitle order={order} /></div>
                <span style={PANEL_LABEL_STYLE}>{order.requirement}</span>
                <span style={PANEL_VALUE_STYLE}>{formatMoney(order.price)} บาท</span>
              </div>
            ))}
          </PanelCard>
        ))}

        <PanelCard title='Clinical context และการนัดหมาย' subtitle='ข้อมูลที่จะส่งไปพร้อมทุก order message'>
          <div className='grid grid-cols-1 md:grid-cols-2' style={{ gap: 'var(--dim-space-300)' }}>
            <InfoPair label='Indication' value={header.indication} minWidth={0} />
            <InfoPair label='Diagnosis' value={header.diagnosis} minWidth={0} />
            <InfoPair label='ต้องการตรวจเมื่อ' value={header.requestedAt.replace('T', ' ')} minWidth={0} />
            <InfoPair label='ความเร่งด่วน' value={header.urgency.toUpperCase()} minWidth={0} />
          </div>
          <InfoPair label='คำถามถึงปลายทาง' value={header.physicianQuestion} minWidth={0} />
        </PanelCard>

        <PanelCard title='การแจ้งผู้ป่วยหลังยืนยัน' subtitle='เลือกเอกสารและช่องทางที่ต้องสร้างพร้อม Order ID'>
          <div className='grid grid-cols-1 md:grid-cols-3' style={{ gap: 'var(--dim-space-300)' }}>
            <Checkbox checked={delivery.printGuide} onChange={(value) => setDeliveryField('printGuide', value)} label='พิมพ์คำแนะนำการเตรียมตัว' />
            <Checkbox checked={delivery.queueTicket} onChange={(value) => setDeliveryField('queueTicket', value)} label='ออกบัตรคิวปลายทาง' />
            <Checkbox checked={delivery.sms} onChange={(value) => setDeliveryField('sms', value)} label='ส่ง SMS ให้ผู้ป่วย' description='08X-XXX-2194' />
          </div>
        </PanelCard>
      </div>

      <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-400)' }}>
        <PanelCard title='ผลการตรวจสอบ' subtitle='Blocking ต้องเป็นศูนย์ก่อนลงนาม'>
          <Alert type={readinessIssues.length ? 'error' : 'success'} title={readinessIssues.length ? `พบ Blocking ${readinessIssues.length} รายการ` : 'ผ่านการตรวจสอบทางคลินิก'} subtext={readinessIssues.length ? readinessIssues.join(' · ') : 'ข้อมูลจำเป็นครบ · ไม่พบ duplicate · ผ่านสิทธิและ safety rule'} showDetail={false} showBadge={false} showIndicator={false} />
          <div className='flex flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
            <StatusBadge style='success' size='small' icon='check'>Required fields</StatusBadge>
            <StatusBadge style='success' size='small' icon='check'>Duplicate check</StatusBadge>
            <StatusBadge style={readinessIssues.length ? 'error' : 'success'} size='small' icon={readinessIssues.length ? 'block' : 'check'}>Clinical safety</StatusBadge>
            <StatusBadge style='success' size='small' icon='verified_user'>Permission</StatusBadge>
          </div>
        </PanelCard>

        <PanelCard title='ลงนามคำสั่งรักษา' subtitle='พญ.สมหญิง รักษ์ดี · ใบอนุญาต ว.12345'>
          <Checkbox checked={attest} onChange={setAttest} label='ข้าพเจ้าได้ทบทวนตัวผู้ป่วย รายการ และความเสี่ยงทั้งหมดแล้ว' />
          <InputField label='PIN สำหรับลงนาม' required type='password' value={signPin} onChange={(value) => { setSignPin(value); setSignatureError(''); }} placeholder='PIN 6 หลัก' helperText='ต้นแบบใช้ 123456' error={signatureError || undefined} maxLength={6} />
          <div className='flex flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
            <BrandButton size='sm' leadingIcon='verified' onClick={startRouting} disabled={nextDisabled}>ลงนามและส่งคำสั่ง</BrandButton>
            <NeutralSubdueButton size='sm' variant='outline' onClick={() => setToast('เก็บคำสั่งไว้ในร่างแล้ว')}>ลงนามภายหลัง</NeutralSubdueButton>
          </div>
        </PanelCard>

        {routing.length ? (
          <PanelCard title='ผลการส่งคำสั่ง' subtitle='แต่ละปลายทางตอบกลับแยกกันเพื่อ retry ได้โดยไม่ส่งรายการซ้ำ'>
            {routing.map((item) => (
              <div key={item.destination} className='flex items-start' style={{ gap: 'var(--dim-space-300)' }}>
                <StatusBadge style={item.status === 'success' ? 'success' : 'error'} size='small' icon={item.status === 'success' ? 'check_circle' : 'error'}>{item.status === 'success' ? 'สำเร็จ' : 'ล้มเหลว'}</StatusBadge>
                <span className='flex flex-col min-w-0'>
                  <span style={PANEL_TITLE_STYLE}>{item.destination}</span>
                  <span style={PANEL_LABEL_STYLE}>{item.detail}</span>
                </span>
              </div>
            ))}
            {routingHasError ? <BrandSubdueButton size='sm' leadingIcon='refresh' onClick={retryFailedRouting}>ส่งเฉพาะปลายทางที่ล้มเหลวอีกครั้ง</BrandSubdueButton> : null}
          </PanelCard>
        ) : null}
      </div>
    </div>
  );

  const renderTracking = () => {
    const counts = trackingRows.reduce((acc, row) => ({ ...acc, [row.status]: (acc[row.status] || 0) + 1 }), {});
    return (
      <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
        <div className='grid grid-cols-2 lg:grid-cols-4' style={{ gap: 'var(--dim-space-300)' }}>
          <MetricCard icon='assignment' label='คำสั่งทั้งหมด' value={trackingRows.length} />
          <MetricCard icon='pending' label='กำลังดำเนินการ' value={(counts.sent || 0) + (counts.accepted || 0) + (counts.inprogress || 0)} tone='warning' />
          <MetricCard icon='check_circle' label='มีผลแล้ว' value={(counts.reported || 0) + (counts.critical || 0)} tone='success' />
          <MetricCard icon='notification_important' label='รอรับทราบผลวิกฤต' value={trackingRows.filter((row) => row.critical && !row.acknowledged).length} tone='error' />
        </div>

        <PanelCard
          title='ติดตามคำสั่งและผลตรวจ'
          subtitle='ค้นหา Order ID, HN, รายการ หรือแพทย์ผู้สั่ง · คลิกแถวเพื่อดู timeline'
          action={(
            <>
              <NeutralSubdueButton size='sm' variant='outline' leadingIcon='download' onClick={() => setToast('เตรียมไฟล์ CSV แล้ว')}>ส่งออก</NeutralSubdueButton>
              <NeutralSubdueButton size='sm' variant='outline' leadingIcon='print' onClick={() => window.print()}>พิมพ์</NeutralSubdueButton>
            </>
          )}
        >
          <div className='grid grid-cols-1 md:grid-cols-3' style={{ gap: 'var(--dim-space-300)' }}>
            <InputField label='ค้นหา' showLabel={false} leadingIcon='search' value={trackingQuery} onChange={setTrackingQuery} placeholder='Order ID, HN หรือชื่อรายการ' />
            <Select label='ประเภท' showFieldName={false} searchable={false} value={trackingType} onChange={setTrackingType} options={TYPE_FILTERS.map((item) => ({ value: item.key, label: item.label }))} />
            <Select label='สถานะ' showFieldName={false} searchable={false} value={trackingStatus} onChange={setTrackingStatus} options={[
              { value: 'all', label: 'ทุกสถานะ' },
              { value: 'sent', label: 'ส่งปลายทางแล้ว' },
              { value: 'accepted', label: 'รับคำสั่งแล้ว' },
              { value: 'reported', label: 'รายงานผลแล้ว' },
              { value: 'critical', label: 'ผลวิกฤต' },
              { value: 'cancelled', label: 'ยกเลิกแล้ว' },
            ]} />
          </div>
          <Table
            columns={trackingColumns}
            rows={filteredTracking}
            stickyColCount={1}
            sortConfig={sortConfig}
            onSort={onSort}
            onRowClick={(row) => setSelectedTrackingId(row.id)}
            emptyMessage='ไม่พบคำสั่งตามตัวกรอง'
            emptySubtext='ลองล้างคำค้นหรือเลือกทุกประเภทและทุกสถานะ'
            pageSize={5}
          />
        </PanelCard>

        {selectedTracking ? (
          <PanelCard
            title={`รายละเอียด ${selectedTracking.id}`}
            subtitle={`${selectedTracking.item} · ${selectedTracking.destination}`}
            action={(() => {
              const meta = STATUS_META[selectedTracking.status] || STATUS_META.sent;
              return <StatusBadge style={meta.style} size='small' icon={meta.icon}>{selectedTracking.statusLabel}</StatusBadge>;
            })()}
          >
            <div className='grid grid-cols-1 xl:grid-cols-3' style={{ gap: 'var(--dim-space-500)' }}>
              <div className='xl:col-span-2 flex flex-col' style={{ gap: 'var(--dim-space-300)' }}>
                <div className='grid grid-cols-1 md:grid-cols-3' style={{ gap: 'var(--dim-space-300)' }}>
                  <InfoPair label='วันที่สั่ง' value={selectedTracking.orderedAt} minWidth={0} />
                  <InfoPair label='แพทย์ผู้สั่ง' value={selectedTracking.orderer} minWidth={0} />
                  <InfoPair label='ปลายทาง' value={selectedTracking.destination} minWidth={0} />
                </div>
                <div
                  className='flex flex-col'
                  style={{
                    gap: 'var(--dim-space-200)',
                    paddingTop: 'var(--dim-space-400)',
                    paddingRight: 'var(--dim-space-400)',
                    paddingBottom: 'var(--dim-space-400)',
                    paddingLeft: 'var(--dim-space-400)',
                    borderRadius: 'var(--dim-radius-300)',
                    background: selectedTracking.critical && !selectedTracking.acknowledged ? 'var(--surface-alert-error)' : 'var(--surface-neutral-quaternary)',
                    border: selectedTracking.critical && !selectedTracking.acknowledged
                      ? 'var(--dim-stroke-100) solid var(--border-alert-error)'
                      : 'var(--dim-stroke-100) solid var(--border-neutral-quaternary)',
                  }}
                >
                  <div className='flex items-center justify-between flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
                    <span style={{ ...PANEL_TITLE_STYLE, fontSize: 'var(--type-size-lg)' }}>{selectedTracking.result}</span>
                    <div className='flex items-center' style={{ gap: 'var(--dim-space-200)' }}>
                      {selectedTracking.amended ? <StatusBadge style='warning' size='small' icon='history'>Amended v{selectedTracking.version}</StatusBadge> : null}
                      {selectedTracking.critical && selectedTracking.acknowledged ? <StatusBadge style='success' size='small' icon='done_all'>รับทราบแล้ว</StatusBadge> : null}
                    </div>
                  </div>
                  <span style={PANEL_LABEL_STYLE}>{selectedTracking.resultNote}</span>
                  <div className='flex flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
                    {selectedTracking.type === 'xray' ? <BrandSubdueButton size='sm' leadingIcon='image'>เปิดภาพ PACS</BrandSubdueButton> : null}
                    {['reported', 'critical'].includes(selectedTracking.status) ? <NeutralSubdueButton size='sm' variant='outline' leadingIcon='description'>เปิดรายงานฉบับเต็ม</NeutralSubdueButton> : null}
                    {selectedTracking.critical && !selectedTracking.acknowledged ? <BrandButton size='sm' leadingIcon='notification_important' onClick={() => setAckTarget(selectedTracking)}>ยืนยันรับทราบผลวิกฤต</BrandButton> : null}
                  </div>
                </div>
              </div>
              <div className='flex flex-col' style={{ gap: 'var(--dim-space-300)' }}>
                <span style={PANEL_TITLE_STYLE}>Order timeline</span>
                {selectedTracking.timeline.map((item, index) => (
                  <div key={`${item.time}-${index}`} className='flex items-start' style={{ gap: 'var(--dim-space-300)' }}>
                    <span
                      className='inline-flex items-center justify-center shrink-0'
                      style={{ width: 'var(--dim-size-600)', height: 'var(--dim-size-600)', borderRadius: 'var(--dim-radius-full)', background: 'var(--surface-brandPrimary-tertiary)', color: 'var(--icon-brandprimarybutton-default)' }}
                    >
                      <Icon name={index === selectedTracking.timeline.length - 1 ? 'check' : 'schedule'} size='var(--dim-size-300)' />
                    </span>
                    <span className='flex flex-col min-w-0'>
                      <span style={PANEL_TITLE_STYLE}>{item.time} · {item.title}</span>
                      <span style={PANEL_LABEL_STYLE}>{item.detail}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className='flex flex-wrap' style={{ gap: 'var(--dim-space-200)', paddingTop: 'var(--dim-space-300)', borderTop: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary)' }}>
              {selectedTracking.status === 'sent' ? <BrandSubdueButton size='sm' leadingIcon='edit'>แก้ไขคำสั่ง</BrandSubdueButton> : null}
              {['sent', 'accepted', 'inprogress'].includes(selectedTracking.status) ? (
                <DangerSubdueButton size='sm' variant='outline' leadingIcon='cancel' onClick={() => setCancelTarget(selectedTracking)}>
                  {selectedTracking.status === 'sent' ? 'ยกเลิกคำสั่ง' : 'ขอแก้ไข/ยกเลิก'}
                </DangerSubdueButton>
              ) : null}
              {['reported', 'critical'].includes(selectedTracking.status) ? <BrandSubdueButton size='sm' leadingIcon='replay' onClick={() => { const matched = CPOE_CATALOG.find((item) => selectedTracking.item.includes(item.name.split('—')[0].trim())); if (matched && !selectedIds.includes(matched.id)) updateSelectedIds((current) => [...current, matched.id]); setStep(0); }}>สั่งซ้ำ</BrandSubdueButton> : null}
              {['reported', 'critical'].includes(selectedTracking.status) ? <NeutralSubdueButton size='sm' variant='outline' leadingIcon='forward_to_inbox'>ส่งต่อผล</NeutralSubdueButton> : null}
            </div>
          </PanelCard>
        ) : null}
      </div>
    );
  };

  const screen = [renderCreateOrder, renderSelectOrders, renderReview, renderTracking][step]();

  if (embedded) {
    return (
      <section className='flex flex-col w-full' style={{ gap: 'var(--dim-space-500)' }}>
        {toast ? (
          <Alert
            type='success'
            title={toast}
            showDetail={false}
            showBadge={false}
            showIndicator={false}
            onClose={() => setToast('')}
          />
        ) : null}

        {/* การ์ด "รายละเอียดกระบวนการ CPOE" (แถบ 4 ขั้นย่อย) ถูกเอาออก
            28 ส.ค. 69 — ปุ่มท้ายฟอร์มพาไปขั้นถัดไปอยู่แล้ว */}

        {screen}

        {/* แถบปุ่มท้ายฟอร์ม (ย้อนกลับ · บันทึกร่าง CPOE · ไปเลือกรายการ)
            ถูกเอาออก 28 ส.ค. 69 — ฟอร์มอยู่ในขั้นตอนของหน้าบันทึกการรักษา
            ซึ่งมีแถบปุ่มของตัวเองอยู่ท้ายจออยู่แล้ว */}

        <AlertDialog
          open={!!cancelTarget}
          type='warning'
          title={cancelTarget?.status === 'sent' ? 'ยกเลิกคำสั่งก่อนปลายทางรับ' : 'ส่งคำขอแก้ไข/ยกเลิกไปยังปลายทาง'}
          description={cancelTarget ? `${cancelTarget.id} · ${cancelTarget.item}` : ''}
          confirmLabel={cancelTarget?.status === 'sent' ? 'ยืนยันยกเลิก' : 'ส่งคำขอ'}
          cancelLabel='กลับ'
          onConfirm={confirmCancel}
          onCancel={() => { setCancelTarget(null); setCancelReason(''); }}
          onClose={() => { setCancelTarget(null); setCancelReason(''); }}
        >
          <InputField
            label='เหตุผล'
            required
            value={cancelReason}
            onChange={setCancelReason}
            placeholder='ระบุเหตุผลเพื่อบันทึก Audit และแจ้งปลายทาง'
            error={cancelTarget && !cancelReason.trim() ? 'จำเป็นต้องระบุเหตุผล' : undefined}
          />
        </AlertDialog>

        <AlertDialog
          open={!!ackTarget}
          type='warning'
          title='ยืนยันรับทราบผลวิกฤต'
          description={ackTarget ? `${ackTarget.id} · ${ackTarget.result} · การยืนยันนี้จะบันทึกชื่อแพทย์และเวลาใน Audit log` : ''}
          confirmLabel='รับทราบและบันทึก'
          cancelLabel='กลับ'
          onConfirm={acknowledgeCritical}
          onCancel={() => setAckTarget(null)}
          onClose={() => setAckTarget(null)}
        />
      </section>
    );
  }

  return (
    <div className='mih-cpoe-workflow flex w-full min-h-screen' style={{ background: 'var(--background-screen-brand-100)' }}>
      <Sidebar activeKey='treat' />
      <div className='flex-1 min-w-0 flex flex-col'>
        <Header breadcrumb={['บันทึกการรักษา', 'CPOE', STEPS[step].title]} />
        <main
          className='flex-1 flex flex-col w-full min-w-0'
          style={{
            gap: 'var(--dim-space-500)',
            paddingTop: 'var(--dim-space-500)',
            paddingRight: 'var(--dim-space-600)',
            paddingBottom: 'var(--dim-space-600)',
            paddingLeft: 'var(--dim-space-600)',
          }}
        >
          {toast ? (
            <div className='sticky top-0 z-40'>
              <Alert type='success' title={toast} showDetail={false} showBadge={false} showIndicator={false} onClose={() => setToast('')} />
            </div>
          ) : null}
          <div className='flex flex-col lg:flex-row lg:items-end lg:justify-between' style={{ gap: 'var(--dim-space-400)' }}>
            <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-100)' }}>
              <span style={{ color: 'var(--text-brandprimary-default)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)', fontWeight: 'var(--type-weight-medium)' }}>Computerized Provider Order Entry</span>
              <h1 style={{ margin: 0, color: 'var(--text-content-default)', fontFamily: 'var(--type-family-heading-content)', fontSize: 'var(--type-size-2xl)', fontWeight: 'var(--type-weight-bold)', lineHeight: 1.5 }}>{STEPS[step].title}</h1>
              <span style={PANEL_LABEL_STYLE}>สร้าง ตรวจสอบ ส่ง และติดตามคำสั่ง Lab, Radiology และ Procedure ใน workflow เดียว</span>
            </div>
            <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
              <StatusBadge style={dirty ? 'warning' : 'success'} size='small' icon={dirty ? 'sync' : 'cloud_done'}>{dirty ? 'กำลังบันทึกร่าง…' : lastSaved}</StatusBadge>
              <NeutralSubdueButton size='sm' variant='outline' leadingIcon='close' onClick={leavePage}>กลับหน้ารักษา</NeutralSubdueButton>
            </div>
          </div>

          <PatientBanner patient={patient} />
          <div className='w-full overflow-x-auto' style={{ paddingTop: 'var(--dim-space-200)', paddingBottom: 'var(--dim-space-200)' }}>
            <StepProgress steps={STEPS} current={step} completedSteps={STEPS.map((_, index) => index < step || (index === 2 && routingComplete))} onStepClick={(index) => { if (index <= step || (index === 3 && routingComplete)) setStep(index); }} compact labelNoWrap />
          </div>
          {screen}
        </main>

        <div className='hidden md:block'>
          <Footer
            type='with BTN'
            sticky
            showLegal={false}
            showAutoSave
            autoSaveText={dirty ? 'กำลังบันทึกร่างอัตโนมัติ…' : lastSaved}
            showButton1
            button1Label={nextLabel}
            button1TrailingIcon={step < 3 && !(step === 2 && routing.length === 0) ? 'arrow_forward' : undefined}
            button1Icon={step === 2 && routing.length === 0 ? 'verified' : step === 3 ? 'refresh' : undefined}
            onButton1Click={goNext}
            button1Disabled={nextDisabled}
            showButton2
            button2Label={step === 3 ? 'ส่งออก CSV' : 'บันทึกร่าง'}
            button2Icon={step === 3 ? 'download' : 'save'}
            onButton2Click={() => setToast(step === 3 ? 'เตรียมไฟล์ CSV แล้ว' : 'บันทึกร่างเรียบร้อยแล้ว')}
            showButton3
            button3Label={step > 0 ? 'ย้อนกลับ' : 'กลับหน้ารักษา'}
            onButton3Click={() => (step > 0 ? setStep((current) => current - 1) : leavePage())}
          />
        </div>
        <div
          className='md:hidden sticky bottom-0 z-40 w-full flex items-center'
          style={{
            gap: 'var(--dim-space-200)',
            paddingTop: 'var(--dim-space-300)',
            paddingRight: 'var(--dim-space-300)',
            paddingBottom: 'var(--dim-space-300)',
            paddingLeft: 'var(--dim-space-300)',
            background: 'var(--surface-navigation-default)',
            borderTop: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
            boxShadow: 'var(--shadow-brand-drop-top-100)',
          }}
        >
          <NeutralSubdueButton
            size='sm'
            leadingIcon={step > 0 ? 'arrow_back' : 'close'}
            onClick={() => (step > 0 ? setStep((current) => current - 1) : leavePage())}
          >
            {step > 0 ? 'ย้อนกลับ' : 'ออก'}
          </NeutralSubdueButton>
          <div className='flex-1 min-w-0' />
          <BrandSubdueButton
            size='sm'
            variant='outline'
            showLabel={false}
            leadingIcon={step === 3 ? 'download' : 'save'}
            aria-label={step === 3 ? 'ส่งออก CSV' : 'บันทึกร่าง'}
            onClick={() => setToast(step === 3 ? 'เตรียมไฟล์ CSV แล้ว' : 'บันทึกร่างเรียบร้อยแล้ว')}
          />
          <BrandButton
            size='sm'
            leadingIcon={step === 2 && routing.length === 0 ? 'verified' : step === 3 ? 'refresh' : undefined}
            trailingIcon={step < 3 && !(step === 2 && routing.length === 0) ? 'arrow_forward' : undefined}
            onClick={goNext}
            disabled={nextDisabled}
          >
            {mobileNextLabel}
          </BrandButton>
        </div>

        <UnsavedChangesPopup
          open={leaveGuard}
          onClose={() => setLeaveGuard(false)}
          onSave={saveNowAndLeave}
          onDiscard={() => { setDirty(false); setLeaveGuard(false); history.push('/treat/record'); }}
          title='ยังมีข้อมูล CPOE ที่กำลังบันทึก'
          description='บันทึกร่างไว้เพื่อกลับมาทำต่อ หรือออกโดยไม่เก็บการเปลี่ยนแปลงล่าสุด'
        />

        <AlertDialog
          open={!!cancelTarget}
          type='warning'
          title={cancelTarget?.status === 'sent' ? 'ยกเลิกคำสั่งก่อนปลายทางรับ' : 'ส่งคำขอแก้ไข/ยกเลิกไปยังปลายทาง'}
          description={cancelTarget ? `${cancelTarget.id} · ${cancelTarget.item}` : ''}
          confirmLabel={cancelTarget?.status === 'sent' ? 'ยืนยันยกเลิก' : 'ส่งคำขอ'}
          cancelLabel='กลับ'
          onConfirm={confirmCancel}
          onCancel={() => { setCancelTarget(null); setCancelReason(''); }}
          onClose={() => { setCancelTarget(null); setCancelReason(''); }}
        >
          <InputField label='เหตุผล' required value={cancelReason} onChange={setCancelReason} placeholder='ระบุเหตุผลเพื่อบันทึก Audit และแจ้งปลายทาง' error={cancelTarget && !cancelReason.trim() ? 'จำเป็นต้องระบุเหตุผล' : undefined} />
        </AlertDialog>

        <AlertDialog
          open={!!ackTarget}
          type='warning'
          title='ยืนยันรับทราบผลวิกฤต'
          description={ackTarget ? `${ackTarget.id} · ${ackTarget.result} · การยืนยันนี้จะบันทึกชื่อแพทย์และเวลาใน Audit log` : ''}
          confirmLabel='รับทราบและบันทึก'
          cancelLabel='กลับ'
          onConfirm={acknowledgeCritical}
          onCancel={() => setAckTarget(null)}
          onClose={() => setAckTarget(null)}
        />
      </div>
    </div>
  );
};

export { CpoeWorkflowPage as CpoeWorkflowPanel };
export default CpoeWorkflowPage;
