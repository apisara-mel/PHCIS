import React, { useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import PrimarySearch from '@/components/search/PrimarySearch';
import useSearchHistory from '@/components/search/useSearchHistory';
import PatientSummaryCard from '@/components/card/PatientSummaryCard';
import SelectableOptionCard from '@/components/card/SelectableOptionCard';
import SelectableTag from '@/components/forms/SelectableTag';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import Dropdown from '@/components/forms/Dropdown';
import Table from '@/components/table/Table';
import Pagination from '@/components/pagination/Pagination';
import Alert from '@/components/alert/Alert';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import BrandPrimaryButton from '@/components/button/BrandPrimaryButton';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import SuccessToast from '@/components/toast/SuccessToast';
import Popup from '@/components/popup/Popup';
import Icon from '@/components/icons/Icon';
import MaskedWorklistName from '@/components/privacy/MaskedWorklistName';

import QueueTicket, { QueueTicketPrintRoot } from './QueueTicket';
import { QueueReasonPopup, QueueTicketPopup } from './QueueCenterPopups';
import {
  useQueueCenter,
  QueueCenterSubNav,
  SectionCard,
  FieldLabel,
  HelperText,
  EmptyState,
  ReadOnlyBanner,
  RoleSwitcher,
  StatusChip,
  QueueCodeCell,
  PaginationFooter,
  PAGE_BODY_STYLE,
  CARD_STYLE,
} from './queueCenterShared';
import {
  QUEUE_STATIONS,
  QUEUE_PATIENT_POOL,
  URGENCY_LEVELS,
  ENTRY_CHANNELS,
  VISITOR_TYPES,
  SERVICE_TIMES,
  getQueueTypes,
  getStation,
  getQueues,
  getQueueById,
  getQueueSettings,
  getQueueActor,
  getAppointmentsNotArrived,
  issueQueue,
  issueFromAppointment,
  findActiveQueueFor,
  cancelQueue,
  reprintTicket,
  markPrinted,
  printQueueTicket,
  previewQueueCode,
  nextQueues,
  formatClock,
  isQueueClosed,
} from '@/data/queueCenterStore';

/* ════════════════════════════════════════════════════════════════════════
   QueueIssuePage — การออกคิว (TOR 1.3.2.1–1.3.2.6 + 1.3.6.1 + 1.3.1.4)

   เคาน์เตอร์ออกบัตรคิวแทนผู้รับบริการ เมื่อ Kiosk ขัดข้องหรือผู้สูงอายุใช้
   Kiosk ไม่ได้ — ค้นหา/สแกนผู้รับบริการ → เลือกบริการ (drill sub-service
   เหมือน /kiosk) → เลือกประเภทคิว/ความเร่งด่วน → ระบบจัดลำดับตามนัดหมาย
   หรือมาก่อน-หลัง → พิมพ์บัตรคิว

   prefix บัตรคิวใช้ชุดเดียวกับ `src/data/kioskMock.js` (S F P L A B K E C M
   D T V G X Y) บัตรที่ออกจากเคาน์เตอร์กับจากตู้จึงเป็นเลขชุดเดียวกัน
   ════════════════════════════════════════════════════════════════════════ */

const breadcrumb = ['ระบบบริหารจัดการคิว', 'การออกคิว'];
const SEARCH_HISTORY_KEY = 'mih:primarysearch-history:queue-issue';
const PAGE_SIZE = 10;

/* กลุ่มบริการชั้นบน — ตรงกับ SERVICES ของ /kiosk (drill = มีบริการย่อย) */
const SERVICE_GROUPS = [
  { key: 'screening',    label: 'ซักประวัติ',        desc: 'ผู้ป่วยใหม่ หรือผู้ที่ต้องวัดความดัน/น้ำหนัก', icon: 'assignment',  types: ['screening'] },
  { key: 'consultation', label: 'ห้องตรวจ',          desc: 'พบแพทย์เพื่อตรวจวินิจฉัยโรคทั่วไปและเฉพาะทาง', icon: 'stethoscope', types: ['consultation'] },
  { key: 'lab',          label: 'เจาะเลือด / ฉีดยา', desc: 'ห้องปฏิบัติการและงานพยาธิวิทยา',              icon: 'vaccines',    types: ['lab'] },
  { key: 'finance',      label: 'การเงิน',           desc: 'ชำระค่าบริการทางการแพทย์และออกใบเสร็จ',        icon: 'credit_card', types: ['finance'] },
  { key: 'pharmacy',     label: 'รับยา',             desc: 'รับยาสามัญและยาตามใบสั่งแพทย์',               icon: 'medication',  types: ['pharmacy'] },
  { key: 'other',        label: 'แผนกอื่นๆ',         desc: 'วัคซีน วางแผนครอบครัว เอกซเรย์ กายภาพบำบัด',   icon: 'more_horiz',  types: ['other'] },
];

const SYMPTOM_SUGGESTIONS = [
  'ไข้ ไอ เจ็บคอ',
  'ปวดศีรษะ เวียนศีรษะ',
  'ตรวจติดตามความดันโลหิตสูง',
  'ตรวจติดตามเบาหวาน + รับยาต่อเนื่อง',
  'ปวดท้อง แน่นท้อง',
  'ผื่นคันตามลำตัว',
  'มารับวัคซีนตามนัด',
  'ปวดเข่า/ปวดหลังเรื้อรัง',
  'นอนไม่หลับ เครียด',
  'ตรวจสุขภาพประจำปี',
  'มาตามใบส่งตัวจากสถานพยาบาลอื่น',
];

const emptyForm = {
  patient: null,
  anonymous: false,
  groupKey: '',
  stationId: '',
  queueType: 'general',
  urgency: 'normal',
  entryChannel: 'counter',
  visitorType: 'existing',
  serviceTime: 'inTime',
  symptom: '',
  note: '',
};

const QueueIssuePage = () => {
  useQueueCenter();
  const history = useHistory();
  const actor = getQueueActor();
  const canOperate = actor.canOperate;

  const [activeTab, setActiveTab] = useState('new');
  const [form, setForm] = useState(emptyForm);
  const [searchQ, setSearchQ] = useState('');
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState('');
  const [banner, setBanner] = useState(null);
  const [ticketTarget, setTicketTarget] = useState(null);
  const [printError, setPrintError] = useState('');
  const [duplicate, setDuplicate] = useState(null);   /* คิว active ใบเดิม */
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [aptPage, setAptPage] = useState(1);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [reprintTarget, setReprintTarget] = useState(null);

  const { history: searchHistory, push: pushHistory, clear: clearHistory } =
    useSearchHistory(SEARCH_HISTORY_KEY, { seedIfEmpty: [] });

  const settings = getQueueSettings();
  const queueTypes = getQueueTypes();
  const set = (key) => (val) => setForm((f) => ({ ...f, [key]: val }));

  const dirty = useMemo(() => (
    !!form.patient || form.anonymous || !!form.stationId || !!form.symptom.trim()
  ), [form]);

  /* ────────────────────────────────────────────────────── patient search */

  const matches = useMemo(() => {
    const q = searchQ.trim().toLowerCase();
    if (!q) return [];
    return QUEUE_PATIENT_POOL
      .filter((p) => [p.hn, p.name, p.fullName, p.nationalId]
        .some((f) => f && String(f).toLowerCase().includes(q)))
      .slice(0, 8);
  }, [searchQ]);

  const suggestions = matches.map((p) => ({
    id: p.hn,
    label: p.name,
    sublabel: p.rights,
    value: p.name,
    badges: [{ label: p.hn, tone: 'indigo' }],
    avatarSrc: p.avatarUrl,
  }));

  const pickPatient = (patient) => {
    setForm((f) => ({
      ...f,
      patient,
      anonymous: false,
      visitorType: patient?.patientType === 'new' ? 'new' : 'existing',
    }));
    setErrors((e) => ({ ...e, patient: undefined }));
  };

  const pickAnonymous = () => {
    setForm((f) => ({
      ...f,
      patient: {
        hn: '',
        name: 'ผู้รับบริการไม่ระบุตัวตน (Walk-in)',
        fullName: 'ผู้รับบริการไม่ระบุตัวตน (Walk-in)',
        nationalId: '',
        rights: 'ยังไม่ได้ตรวจสอบสิทธิ',
        rightsExpired: true,
        doctor: '',
      },
      anonymous: true,
      visitorType: 'new',
    }));
  };

  /* ─────────────────────────────────────────────────── service picker */

  const group = SERVICE_GROUPS.find((g) => g.key === form.groupKey);
  const groupStations = useMemo(() => (
    group ? QUEUE_STATIONS.filter((s) => group.types.includes(s.serviceType)) : []
  ), [group]);

  const pickGroup = (g) => {
    const stations = QUEUE_STATIONS.filter((s) => g.types.includes(s.serviceType));
    setForm((f) => ({
      ...f,
      groupKey: g.key,
      stationId: stations.length === 1 ? stations[0].id : '',
    }));
    setErrors((e) => ({ ...e, station: undefined }));
  };

  const station = getStation(form.stationId);

  /* นัดหมายวันนี้ของผู้รับบริการที่เลือก (1.3.2.3) */
  const appointment = useMemo(() => {
    if (!form.patient?.hn) return null;
    return getAppointmentsNotArrived().find(
      (a) => a.hn === form.patient.hn && (!form.stationId || a.stationId === form.stationId),
    ) || null;
  }, [form.patient, form.stationId]);

  useEffect(() => {
    if (appointment && form.queueType === 'general') {
      setForm((f) => ({ ...f, queueType: 'appointment', entryChannel: 'appointment' }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointment?.id]);

  /* ───────────────────────────────────────────────────────── preview */

  const previewQueue = form.stationId ? {
    id: 'preview',
    code: previewQueueCode(form.stationId),
    stationId: form.stationId,
    patient: form.patient || { name: 'ยังไม่ได้เลือกผู้รับบริการ' },
    queueType: form.queueType,
    issuedAt: new Date().toISOString(),
    appointmentTime: appointment?.time || null,
    printCount: 0,
  } : null;

  const waitingAhead = form.stationId ? nextQueues(form.stationId).length : 0;

  /* ───────────────────────────────────────────────────────── submit */

  const validate = () => {
    const e = {};
    if (!form.patient) e.patient = 'กรุณาค้นหาและเลือกผู้รับบริการ หรือกด "ผู้รับบริการไม่ระบุตัวตน"';
    if (!form.stationId) e.station = 'กรุณาเลือกจุดบริการที่จะออกคิว';
    if (!form.queueType) e.queueType = 'กรุณาเลือกประเภทคิว';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const doIssue = ({ force = false } = {}) => {
    if (!validate()) return;
    if (!force && form.patient?.hn) {
      const active = findActiveQueueFor(form.patient.hn, form.stationId);
      if (active) { setDuplicate(active); return; }
    }
    const res = issueQueue({
      stationId: form.stationId,
      patient: form.patient,
      queueType: form.queueType,
      urgency: form.urgency,
      entryChannel: form.entryChannel,
      visitorType: form.visitorType,
      serviceTime: form.serviceTime,
      symptom: form.symptom,
      appointmentTime: appointment?.time || null,
      note: form.note,
      reason: force ? 'ออกคิวใบใหม่ทั้งที่มีคิวเดิมอยู่ (เจ้าหน้าที่ยืนยัน)' : '',
    });
    if (!res.ok) {
      setBanner({ type: 'destructive', title: 'ออกคิวไม่สำเร็จ', subtext: res.message });
      return;
    }
    setDuplicate(null);
    setBanner(null);
    setToast(`ออกคิว ${res.queue.code} สำเร็จ`);
    setTicketTarget(res.queue);
    setForm(emptyForm);
    setSearchQ('');
  };

  /* นับเฉพาะ "พิมพ์ครั้งแรก" ของบัตรที่เพิ่งออกเท่านั้น — การพิมพ์ซ้ำถูกนับไปแล้ว
     ใน reprintTicket() ถ้าเรียก markPrinted ทับอีก โควตา "พิมพ์ซ้ำได้ 3 ครั้ง"
     จะหมดตั้งแต่ reprint จริงครั้งที่ 1–2 และท้ายบัตรจะโชว์ "พิมพ์ซ้ำครั้งที่ N"
     ผิด (QueueCenterConsolePage.handlePrint ไม่เรียก markPrinted จึงนับคนละแบบ) */
  const handlePrint = () => {
    const res = printQueueTicket('ticket');
    if (!res.ok) { setPrintError(res.message); return; }
    setPrintError('');
    const current = ticketTarget?.id ? getQueueById(ticketTarget.id) : null;
    if (current && (current.printCount || 0) === 0) {
      markPrinted(current.id);
      setTicketTarget(getQueueById(current.id));
    }
    setToast('ส่งบัตรคิวเข้าเครื่องพิมพ์แล้ว');
  };

  /* ──────────────────────────────────────────── tab 2: appointments */

  const appointments = getAppointmentsNotArrived();
  const aptPages = Math.max(1, Math.ceil(appointments.length / PAGE_SIZE));
  const aptRows = appointments.slice((aptPage - 1) * PAGE_SIZE, aptPage * PAGE_SIZE);
  useEffect(() => { if (aptPage > aptPages) setAptPage(aptPages); }, [aptPage, aptPages]);

  const appointmentColumns = [
    { key: 'time', label: 'เวลานัด', render: (r) => `${r.time} น.` },
    { key: 'hn', label: 'HN' },
    { key: 'name', label: 'ชื่อ-นามสกุล', flex: true, minWidth: 180 },
    { key: 'stationId', label: 'จุดบริการ', render: (r) => getStation(r.stationId)?.label || '—' },
    { key: 'doctor', label: 'แพทย์/ผู้ให้บริการ', flex: true, minWidth: 160 },
    { key: 'note', label: 'หมายเหตุนัด', flex: true, minWidth: 160 },
    {
      key: 'action',
      label: 'การดำเนินการ',
      sortable: false,
      render: (r) => (
        <BrandSubdueButton
          variant='fill'
          size='sm'
          leadingIcon='confirmation_number'
          disabled={!canOperate}
          onClick={() => {
            const res = issueFromAppointment(r.id);
            if (res.ok) { setToast(`ออกคิว ${res.queue.code} จากนัดหมาย ${r.time} แล้ว`); setTicketTarget(res.queue); }
            else setBanner({ type: 'destructive', title: 'ออกคิวไม่สำเร็จ', subtext: res.message });
          }}
        >
          ออกคิวจากนัดหมาย
        </BrandSubdueButton>
      ),
    },
  ];

  /* ─────────────────────────────────────────── tab 3: issued today */

  /* ทุกบัตรคิวของวันนี้ ไม่ว่าจะออกจากเคาน์เตอร์ ตู้ Kiosk หรือนัดหมาย */
  const issuedToday = getQueues().sort((a, b) => new Date(b.issuedAt) - new Date(a.issuedAt));
  const historyPages = Math.max(1, Math.ceil(issuedToday.length / PAGE_SIZE));
  const historyRows = issuedToday.slice((historyPage - 1) * PAGE_SIZE, historyPage * PAGE_SIZE);
  useEffect(() => { if (historyPage > historyPages) setHistoryPage(historyPages); }, [historyPage, historyPages]);

  const historyColumns = [
    { key: 'code', label: 'รหัสคิว', render: (r) => <QueueCodeCell queue={r} /> },
    { key: 'patient', label: 'ผู้รับบริการ', flex: true, minWidth: 180, render: (r) => (
      <MaskedWorklistName
        name={r.patient?.name}
        recordKey={r.id || r.patient?.hn}
        emptyLabel='ผู้รับบริการไม่ระบุตัวตน'
      />
    ) },
    { key: 'station', label: 'จุดบริการ', render: (r) => getStation(r.stationId)?.label || '—' },
    { key: 'issuedAt', label: 'เวลาออกคิว', render: (r) => `${formatClock(r.issuedAt)} น.` },
    { key: 'entryChannel', label: 'แหล่งที่มา', render: (r) => ENTRY_CHANNELS.find((c) => c.key === r.entryChannel)?.label || '—' },
    { key: 'printCount', label: 'พิมพ์แล้ว', render: (r) => `${r.printCount || 0} ครั้ง` },
    { key: 'status', label: 'สถานะ', render: (r) => <StatusChip status={r.status} /> },
    {
      key: 'action',
      label: 'การดำเนินการ',
      sortable: false,
      render: (r) => (
        <div className='flex items-center' style={{ gap: 'var(--dim-space-150)' }}>
          <NeutralSubdueButton
            variant='outline'
            size='sm'
            leadingIcon='print'
            disabled={!canOperate}
            onClick={() => setReprintTarget(r)}
          >
            พิมพ์ซ้ำ
          </NeutralSubdueButton>
          <NeutralSubdueButton
            variant='outline'
            size='sm'
            leadingIcon='cancel'
            disabled={!canOperate || isQueueClosed(r)}
            onClick={() => setCancelTarget(r)}
          >
            ยกเลิกบัตร
          </NeutralSubdueButton>
        </div>
      ),
    },
  ];

  /* ────────────────────────────────────────────────────────── render */

  const tabs = [
    { key: 'new', label: 'ออกคิวใหม่', icon: 'add_circle' },
    { key: 'appointments', label: `นัดหมายวันนี้ที่ยังไม่มาติดต่อ (${appointments.length})`, icon: 'event_upcoming' },
    { key: 'history', label: 'ประวัติการออกคิววันนี้', icon: 'history' },
  ];

  const actions = (
    <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
      <RoleSwitcher />
      <NeutralSubdueButton
        variant='outline'
        size='md'
        leadingIcon='campaign'
        onClick={() => { if (dirty) setConfirmLeave(true); else history.push('/queue-center'); }}
      >
        ไปหน้าจัดการคิว
      </NeutralSubdueButton>
    </div>
  );

  const summaryCards = [
    { key: 'today', label: 'ออกคิวแล้ววันนี้', value: issuedToday.length, indicator: 'ทุกจุดบริการ', color: 'info', icon: 'confirmation_number' },
    { key: 'counter', label: 'ออกจากเคาน์เตอร์', value: issuedToday.filter((q) => q.entryChannel === 'counter').length, indicator: 'Kiosk ขัดข้อง/ช่วยผู้สูงอายุ', color: 'brand', icon: 'support_agent' },
    { key: 'appointment', label: 'ออกจากนัดหมาย', value: issuedToday.filter((q) => q.entryChannel === 'appointment').length, indicator: `ค้างอีก ${appointments.length} นัด`, color: 'positive', icon: 'event_available' },
    { key: 'cancelled', label: 'บัตรที่ยกเลิก', value: issuedToday.filter((q) => q.status === 'cancelled').length, indicator: 'ไม่ลบทิ้ง', color: 'destructive', icon: 'cancel' },
  ];

  return (
    <>
      <QueuePageShell
        activeKey='queue-center'
        sidebarFallbackKey='opd'
        breadcrumb={breadcrumb}
        title='การออกคิว'
        actions={actions}
        summaryTitle='ออกบัตรคิวให้ผู้รับบริการ'
        summaryCards={summaryCards}
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      >
        <div className='flex flex-col flex-1 min-w-0' style={PAGE_BODY_STYLE}>
          {/* เมนูย่อยของโมดูล — วางในเนื้อหาแทน slot belowSummary ของ shell
              เพราะ shell ทำให้ slot นั้นกับแถบแท็บ sticky ทับกันที่ตำแหน่งเดียวกัน */}
          <QueueCenterSubNav />

          {!canOperate ? (
            <ReadOnlyBanner message='บทบาทของคุณดูข้อมูลได้อย่างเดียว — ต้องมีสิทธิเจ้าหน้าที่จุดบริการจึงจะออกคิว พิมพ์ซ้ำ หรือยกเลิกบัตรคิวได้' />
          ) : null}

          {banner ? (
            <Alert type={banner.type} title={banner.title} subtext={banner.subtext} onClose={() => setBanner(null)} />
          ) : null}

          {activeTab === 'new' ? (
            <div className='w-full flex items-start flex-wrap lg:flex-nowrap' style={{ gap: 'var(--dim-space-600)' }}>
              <div className='flex-1 min-w-0 flex flex-col' style={{ gap: 'var(--dim-space-600)' }}>

                {/* 1 — ผู้รับบริการ */}
                <SectionCard
                  icon='person_search'
                  title='1. ผู้รับบริการ'
                  subtitle='ค้นหาด้วย HN / เลขบัตรประชาชน / ชื่อ-สกุล หรือสแกนบัตรประชาชน'
                >
                  <div className='w-full flex items-start justify-center'>
                    <PrimarySearch
                      value={searchQ}
                      onChange={setSearchQ}
                      onSubmit={(label, item) => {
                        setSearchQ(label);
                        const found = (item?.id && QUEUE_PATIENT_POOL.find((p) => p.hn === item.id))
                          || matches[0];
                        if (found) { pickPatient(found); pushHistory(label); }
                      }}
                      suggestions={suggestions}
                      history={searchHistory}
                      onHistoryClear={searchHistory.length > 0 ? clearHistory : undefined}
                      placeholder='ค้นหา HN / เลขบัตรประชาชน / ชื่อ-สกุล'
                      width={640}
                    />
                  </div>

                  {searchQ.trim() && matches.length === 0 && !form.patient ? (
                    <EmptyState
                      icon='search_off'
                      title='ไม่พบผู้รับบริการที่ตรงกับคำค้น'
                      description='ตรวจสอบ HN / เลขบัตรประชาชน อีกครั้ง หรือออกคิวแบบไม่ระบุตัวตนไปก่อน แล้วให้เวชระเบียนลงทะเบียนภายหลัง'
                      action={(
                        <div className='flex items-center flex-wrap justify-center' style={{ gap: 'var(--dim-space-200)' }}>
                          <NeutralSubdueButton variant='outline' size='md' leadingIcon='filter_alt_off' onClick={() => setSearchQ('')}>
                            ล้างคำค้น
                          </NeutralSubdueButton>
                          <BrandSubdueButton variant='outline' size='md' leadingIcon='person_add' disabled={!canOperate} onClick={pickAnonymous}>
                            ผู้รับบริการไม่ระบุตัวตน (Walk-in)
                          </BrandSubdueButton>
                        </div>
                      )}
                    />
                  ) : null}

                  {form.patient ? (
                    <>
                      <PatientSummaryCard
                        avatarUrl={form.patient.avatarUrl}
                        avatarAlt={form.patient.name}
                        cells={[
                          { label: 'ชื่อ-นามสกุล', value: form.patient.fullName || form.patient.name },
                          { label: 'HN', value: form.patient.hn || 'ยังไม่มีเวชระเบียน' },
                          { label: 'สิทธิการรักษา', value: form.patient.rights || '—' },
                        ]}
                      />
                      {form.patient.rightsExpired ? (
                        <Alert
                          type='warning'
                          title='สิทธิการรักษาหมดอายุหรือตรวจสอบไม่ได้'
                          subtext='ออกคิวได้ตามปกติ แต่ระบบจะติดป้ายเตือนบนแถวคิวและบนบัตรคิว — โปรดแนะนำให้ตรวจสอบสิทธิที่เวชระเบียน'
                        />
                      ) : null}
                      <div className='flex items-center' style={{ gap: 'var(--dim-space-200)' }}>
                        <NeutralSubdueButton
                          variant='outline'
                          size='sm'
                          leadingIcon='close'
                          onClick={() => { setForm((f) => ({ ...f, patient: null, anonymous: false })); setSearchQ(''); }}
                        >
                          เปลี่ยนผู้รับบริการ
                        </NeutralSubdueButton>
                      </div>
                    </>
                  ) : (
                    <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
                      <BrandSubdueButton variant='outline' size='md' leadingIcon='person_add' disabled={!canOperate} onClick={pickAnonymous}>
                        ไม่พบในระบบ / ผู้รับบริการไม่ระบุตัวตน
                      </BrandSubdueButton>
                      {errors.patient ? <HelperText tone='error'>{errors.patient}</HelperText> : null}
                    </div>
                  )}
                </SectionCard>

                {/* 2 — บริการที่จะส่งไป */}
                <SectionCard
                  icon='apartment'
                  title='2. บริการและจุดบริการ'
                  subtitle='เลือกกลุ่มบริการ แล้วเลือกจุดบริการย่อย (โครงเดียวกับตู้ Kiosk)'
                >
                  <div
                    className='w-full grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3'
                    style={{ gap: 'var(--dim-space-300)' }}
                  >
                    {SERVICE_GROUPS.map((g) => (
                      <SelectableOptionCard
                        key={g.key}
                        icon={g.icon}
                        title={g.label}
                        description={g.desc}
                        selected={form.groupKey === g.key}
                        disabled={!canOperate}
                        onSelect={() => pickGroup(g)}
                      />
                    ))}
                  </div>

                  {group && groupStations.length > 1 ? (
                    <div className='w-full flex flex-col' style={{ gap: 'var(--dim-space-200)' }}>
                      <FieldLabel required>จุดบริการย่อยใน “{group.label}”</FieldLabel>
                      <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-150)' }}>
                        {groupStations.map((s) => (
                          <SelectableTag
                            key={s.id}
                            label={`${s.prefix} · ${s.label}${s.active ? '' : ' (ปิดรับคิว)'}`}
                            selected={form.stationId === s.id}
                            onClick={!canOperate || !s.active ? undefined : () => { set('stationId')(s.id); setErrors((e) => ({ ...e, station: undefined })); }}
                          />
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {station ? (
                    <HelperText>
                      {`ปลายทาง: ${station.label} · ${station.zone} ${station.floor} · รหัสคิวถัดไป ${previewQueueCode(station.id)} · มีคิวรออยู่ ${waitingAhead} คิว`}
                    </HelperText>
                  ) : null}
                  {errors.station ? <HelperText tone='error'>{errors.station}</HelperText> : null}
                </SectionCard>

                {/* 3 — ประเภทคิวและรายละเอียด */}
                <SectionCard
                  icon='tune'
                  title='3. ประเภทคิวและรายละเอียดการส่งตรวจ'
                  subtitle='ฟิลด์ตามระบบงานส่งตรวจเดิม — การเข้ามาของผู้ป่วย · ประเภทผู้มารับบริการ · เวลามารับบริการ · ความเร่งด่วน'
                >
                  {appointment ? (
                    <Alert
                      type='info'
                      title={`มีนัด ${appointment.time} น. — ระบบจัดลำดับตามช่วงเวลานัด`}
                      subtext={settings.appointmentRule.sortByAppointment
                        ? `รอบละ ${settings.appointmentRule.roundWindowMinutes} นาที · Walk-in ${settings.appointmentRule.walkinRule === 'append' ? 'ต่อท้ายรอบ' : 'สลับตามความเร่งด่วน'}`
                        : 'ปิดการจัดลำดับตามนัดหมายอยู่ — เปิดได้ที่หน้าการเชื่อมต่อข้อมูลคิว'}
                    />
                  ) : null}

                  <div className='w-full flex flex-col' style={{ gap: 'var(--dim-space-200)' }}>
                    <FieldLabel required>ประเภทคิว</FieldLabel>
                    <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-150)' }}>
                      {queueTypes.map((t) => (
                        <SelectableTag
                          key={t.key}
                          label={t.label}
                          selected={form.queueType === t.key}
                          onClick={canOperate ? () => set('queueType')(t.key) : undefined}
                        />
                      ))}
                    </div>
                    {errors.queueType ? <HelperText tone='error'>{errors.queueType}</HelperText> : null}
                  </div>

                  <div className='w-full flex flex-col' style={{ gap: 'var(--dim-space-200)' }}>
                    <FieldLabel>ความเร่งด่วน</FieldLabel>
                    <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-150)' }}>
                      {URGENCY_LEVELS.map((u) => (
                        <SelectableTag
                          key={u.key}
                          label={u.label}
                          selected={form.urgency === u.key}
                          onClick={canOperate ? () => set('urgency')(u.key) : undefined}
                        />
                      ))}
                    </div>
                  </div>

                  <div className='w-full grid grid-cols-1 md:grid-cols-3' style={{ gap: 'var(--dim-space-400)' }}>
                    <div className='flex flex-col' style={{ gap: 'var(--dim-space-150)' }}>
                      <FieldLabel>การเข้ามาของผู้รับบริการ</FieldLabel>
                      <Dropdown
                        value={form.entryChannel}
                        onChange={set('entryChannel')}
                        options={ENTRY_CHANNELS.map((c) => ({ value: c.key, label: c.label }))}
                        state={canOperate ? 'default' : 'disabled'}
                      />
                    </div>
                    <div className='flex flex-col' style={{ gap: 'var(--dim-space-150)' }}>
                      <FieldLabel>ประเภทผู้มารับบริการ</FieldLabel>
                      <Dropdown
                        value={form.visitorType}
                        onChange={set('visitorType')}
                        options={VISITOR_TYPES.map((c) => ({ value: c.key, label: c.label }))}
                        state={canOperate ? 'default' : 'disabled'}
                      />
                    </div>
                    <div className='flex flex-col' style={{ gap: 'var(--dim-space-150)' }}>
                      <FieldLabel>เวลามารับบริการ</FieldLabel>
                      <Dropdown
                        value={form.serviceTime}
                        onChange={set('serviceTime')}
                        options={SERVICE_TIMES.map((c) => ({ value: c.key, label: c.label }))}
                        state={canOperate ? 'default' : 'disabled'}
                      />
                    </div>
                  </div>

                  <SuggestibleTextarea
                    voice
                    label='อาการ / เหตุผลที่มารับบริการ'
                    value={form.symptom}
                    onChange={set('symptom')}
                    suggestions={SYMPTOM_SUGGESTIONS}
                    minChars={2}
                    disabled={!canOperate}
                    placeholder='เช่น ไข้ ไอ เจ็บคอ 2 วัน / มาตามนัดรับยาความดัน'
                  />
                </SectionCard>

                <div className='w-full flex items-center flex-wrap' style={{ gap: 'var(--dim-space-300)' }}>
                  <BrandPrimaryButton
                    size='lg'
                    leadingIcon='print'
                    disabled={!canOperate}
                    onClick={() => doIssue()}
                  >
                    ออกคิวและพิมพ์บัตรคิว
                  </BrandPrimaryButton>
                  <NeutralSubdueButton
                    variant='outline'
                    size='md'
                    leadingIcon='refresh'
                    onClick={() => { setForm(emptyForm); setSearchQ(''); setErrors({}); }}
                  >
                    ล้างฟอร์ม
                  </NeutralSubdueButton>
                </div>
              </div>

              {/* พรีวิวบัตรคิว */}
              <aside
                className='w-full lg:w-auto shrink-0 flex flex-col'
                style={{ gap: 'var(--dim-space-300)', minWidth: 'var(--dim-size-2700, 448px)' }}
              >
                <SectionCard icon='receipt_long' title='พรีวิวบัตรคิว' subtitle='ข้อความขั้นตอนดึงจากหน้าตั้งค่าระบบคิว'>
                  {previewQueue ? (
                    <QueueTicket queue={previewQueue} waitingAhead={waitingAhead} compact />
                  ) : (
                    <EmptyState
                      icon='confirmation_number'
                      title='ยังไม่มีอะไรให้พรีวิว'
                      description='เลือกจุดบริการก่อน ระบบจะสร้างรหัสคิวถัดไปและแสดงบัตรคิวตัวอย่างทันที'
                    />
                  )}
                </SectionCard>
              </aside>
            </div>
          ) : null}

          {activeTab === 'appointments' ? (
            <section className='w-full flex flex-col' style={CARD_STYLE}>
              {appointments.length === 0 ? (
                <EmptyState
                  icon='event_available'
                  title='ไม่มีนัดหมายวันนี้ที่ยังไม่มาติดต่อ'
                  description='ผู้รับบริการที่มีนัดวันนี้มาติดต่อครบแล้ว หรือยังไม่มีนัดในระบบ'
                />
              ) : (
                <>
                  <Alert
                    type='info'
                    title='ออกคิวจากนัดหมายได้โดยตรง'
                    subtext='ระบบจะตั้งประเภทคิวเป็น "นัดหมาย" และจัดลำดับตามช่วงเวลานัดให้อัตโนมัติ (ตั้งกติกาได้ที่หน้าการเชื่อมต่อข้อมูลคิว)'
                  />
                  <Table
                    columns={appointmentColumns}
                    rows={aptRows}
                    rowKey={(r) => r.id}
                    emptyMessage='ไม่มีนัดหมายที่ยังไม่มาติดต่อ'
                  />
                  <PaginationFooter rangeStart={appointments.length ? (aptPage - 1) * PAGE_SIZE + 1 : 0} rangeEnd={Math.min(aptPage * PAGE_SIZE, appointments.length)} total={appointments.length}>
                    <Pagination currentPage={aptPage} pageCount={aptPages} onPageChange={setAptPage} />
                  </PaginationFooter>
                </>
              )}
            </section>
          ) : null}

          {activeTab === 'history' ? (
            <section className='w-full flex flex-col' style={CARD_STYLE}>
              {issuedToday.length === 0 ? (
                <EmptyState
                  icon='history'
                  title='ยังไม่มีการออกคิววันนี้'
                  description='บัตรคิวที่ออกจากเคาน์เตอร์ ตู้ Kiosk และนัดหมาย จะมาปรากฏที่นี่'
                />
              ) : (
                <>
                  <Table
                    columns={historyColumns}
                    rows={historyRows}
                    rowKey={(r) => r.id}
                    emptyMessage='ไม่พบรายการ'
                  />
                  <PaginationFooter
                    rangeStart={(historyPage - 1) * PAGE_SIZE + 1}
                    rangeEnd={Math.min(historyPage * PAGE_SIZE, issuedToday.length)}
                    total={issuedToday.length}
                  >
                    <Pagination currentPage={historyPage} pageCount={historyPages} onPageChange={setHistoryPage} />
                  </PaginationFooter>
                </>
              )}
            </section>
          ) : null}
        </div>
      </QueuePageShell>

      {/* คิวซ้ำ — ผู้รับบริการมีคิว active ที่จุดบริการเดียวกันอยู่แล้ว */}
      <Popup
        open={!!duplicate}
        onClose={() => setDuplicate(null)}
        title='ผู้รับบริการรายนี้มีคิวอยู่แล้ว'
        subtitle={duplicate ? `${duplicate.code} · ${getStation(duplicate.stationId)?.label}` : ''}
        size='default'
        tertiaryAction={{ label: 'ไม่ออกใบใหม่', onClick: () => setDuplicate(null) }}
        primaryAction={{ label: 'ออกบัตรคิวใบใหม่', onClick: () => doIssue({ force: true }) }}
      >
        <div className='flex items-start w-full' style={{ gap: 'var(--dim-space-300)' }}>
          <Icon name='warning' size={20} style={{ color: 'var(--text-warning-default)' }} />
          <div className='flex-1 min-w-0 flex flex-col' style={{ gap: 'var(--dim-space-150)' }}>
            <span
              style={{
                fontFamily: 'var(--type-family-body)',
                fontSize: 'var(--type-size-sm, 14px)',
                color: 'var(--text-content-secondary)',
              }}
            >
              {duplicate
                ? `คิว ${duplicate.code} ออกเมื่อ ${formatClock(duplicate.issuedAt)} น. และยังไม่ปิด — การออกใบใหม่จะทำให้มี 2 คิวที่จุดบริการเดียวกัน`
                : ''}
            </span>
            <ColorfulBadge style='yellow' size='small' hierarchy='secondary'>
              ระบบจะบันทึกเหตุผล "ออกคิวใบใหม่ทั้งที่มีคิวเดิมอยู่" ไว้ในประวัติคิว
            </ColorfulBadge>
          </div>
        </div>
      </Popup>

      {/* ออกจากฟอร์มกลางคัน */}
      <Popup
        open={confirmLeave}
        onClose={() => setConfirmLeave(false)}
        title='ออกโดยไม่บันทึก ?'
        subtitle='ข้อมูลที่กรอกไว้ในฟอร์มออกคิวจะหายไป'
        size='default'
        tertiaryAction={{ label: 'กลับไปแก้ไข', onClick: () => setConfirmLeave(false) }}
        primaryAction={{ label: 'ออกโดยไม่บันทึก', onClick: () => { setConfirmLeave(false); history.push('/queue-center'); }, tone: 'danger' }}
      >
        <span
          style={{
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-sm, 14px)',
            color: 'var(--text-content-secondary)',
          }}
        >
          ยังไม่ได้กด “ออกคิวและพิมพ์บัตรคิว” — ออกจากหน้านี้เลยหรือไม่
        </span>
      </Popup>

      <QueueReasonPopup
        open={!!cancelTarget}
        mode='cancel'
        queue={cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={({ reason }) => {
          const res = cancelQueue(cancelTarget.id, reason);
          if (res.ok) setToast(`ยกเลิกบัตรคิว ${cancelTarget.code} แล้ว`);
          return res;
        }}
      />

      <QueueReasonPopup
        open={!!reprintTarget}
        mode='reprint'
        queue={reprintTarget}
        onClose={() => setReprintTarget(null)}
        onConfirm={({ reason }) => {
          const res = reprintTicket(reprintTarget.id, reason);
          if (res.ok) { setTicketTarget(getQueueById(reprintTarget.id)); setToast(`บันทึกการพิมพ์ซ้ำ ${reprintTarget.code} แล้ว`); }
          return res;
        }}
      />

      <QueueTicketPopup
        open={!!ticketTarget}
        queue={ticketTarget}
        printError={printError}
        onClose={() => { setTicketTarget(null); setPrintError(''); }}
        onPrint={handlePrint}
      />

      <SuccessToast open={!!toast} message={toast} onClose={() => setToast('')} topOffset='var(--dim-space-800, 32px)' />

      {/* เอกสารสำหรับพิมพ์ — portal ไป <body> โดยตรง (ดูหมายเหตุใน QueueTicket) */}
      <QueueTicketPrintRoot queue={ticketTarget} waitingAhead={waitingAhead} />
    </>
  );
};

export default QueueIssuePage;
