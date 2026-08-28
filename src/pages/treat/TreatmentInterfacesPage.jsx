import React, { useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import Table from '@/components/table/Table';
import StatusBadge from '@/components/badge/StatusBadge';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import Checkbox from '@/components/checkbox/Checkbox';
import Select from '@/components/forms/Select';
import InputField from '@/components/forms/InputField';
import Tooltip from '@/components/tooltip/Tooltip';
import BrandButton from '@/components/button/BrandButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import AlertDialog from '@/components/popup/AlertDialog';
import PhcisTopToast from '@/components/alert/PhcisTopToast';
import {
  PanelCard, PanelEmptyState, Sym, InfoPair,
  PANEL_LABEL_STYLE, PANEL_VALUE_STYLE,
} from '@/pages/treat/panels/panelKit';
import {
  useTreatmentAccess, useTreatmentStore, GuardedAction, AccessDeniedPanel,
  ReasonDialog, PanelAlert, CountLabel,
} from '@/pages/treat/panels/panelHooks';
import {
  interfaceStatusMeta, subscribeInterfaces, getInterfaces, retryInterface,
  inboundStatusMeta, subscribeInbound, getInboundResults,
  importInboundResult, flagInboundMismatch,
  subscribeLabNotifications, getLabNotifications, acknowledgeLabNotification,
  getLabSubscriptions, toggleLabSubscription,
  PACS_STUDIES, openPacsStudy, openPacsReport, isInterfaceUp,
  getDevices, buildDeviceVitalPatch, logDevicePull,
  queueDeviceVitalPatch, overwrittenVitalFields, vitalFieldLabel,
  telemedStateMeta, subscribeTelemedSessions, getTelemedSessions,
  startTelemedSession, setTelemedState,
  /* เวฟ TOR §1.4 เก็บ gap — 4 มุมมองรายละเอียดฝั่ง UI */
  hl7MessageFor, pacsQueryLogFor,
  DEVICE_FIELD_MAPPINGS, validateDeviceReading, deviceHasOutOfRange,
  telemedSessionLog, telemedConsentRecord, exportTelemedLog,
} from '@/data/treatmentInterfaces';
import { TREATMENT_QUEUE_ROWS } from '@/data/treatmentQueue';
import { NO_EDIT_RIGHT_TOOLTIP } from '@/data/treatmentAccess';
import DutyRosterAction from '@/components/patient/DutyRosterAction';

/* PHCIS | EMR §1.4.7.2 – §1.4.7.5 / §1.4.3.23 — สถานะการเชื่อมต่อระบบภายนอก.

   ประกาศตรงไปตรงมา: หน้านี้เป็น **interface monitor + mock feed**
   ไม่ใช่ engine จริง — ระบบยังไม่มี HL7 v2.5.1 parser, DICOMweb client,
   MQTT broker หรือ WebRTC media server ในตัว. สิ่งที่หน้านี้ทำได้จริงคือ
   แสดงสถานะ, จัดคิวรายการที่รอนำเข้า, บังคับกติกาความปลอดภัย
   (ห้าม auto-merge เมื่อ HN ไม่ตรง / ต้องรับทราบค่าวิกฤตก่อนนำเข้า /
   ต้องยืนยันก่อนเขียนทับค่าที่กรอกมือ) และบันทึกทุกอย่างลง audit. */

const breadcrumb = ['บันทึกการรักษา', 'สถานะการเชื่อมต่อระบบภายนอก'];

const TABS = [
  { key: 'status',   label: 'สถานะการเชื่อมต่อ' },
  { key: 'inbound',  label: 'ผลขาเข้าจาก LIS' },
  { key: 'notify',   label: 'การแจ้งเตือนผลแล็บ' },
  { key: 'pacs',     label: 'ภาพใน PACS' },
  { key: 'device',   label: 'อุปกรณ์วัดค่า' },
  { key: 'telemed',  label: 'ปรึกษาทางไกล' },
];

/* ── การ์ดสถานะต่อระบบ ─────────────────────────────────────── */

const InterfaceCard = ({ iface, retrying, onRetry, canEdit }) => {
  const meta = interfaceStatusMeta(iface.status);
  return (
    <div
      className='flex flex-col min-w-0'
      style={{
        gap: 'var(--dim-space-200, 8px)',
        flex: '1 1 320px',
        minWidth: 320,
        borderRadius: 'var(--dim-radius-300, 10px)',
        border: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary)',
        background: 'var(--surface-card-100)',
        paddingTop: 'var(--dim-space-400, 16px)',
        paddingRight: 'var(--dim-space-400, 16px)',
        paddingBottom: 'var(--dim-space-400, 16px)',
        paddingLeft: 'var(--dim-space-400, 16px)',
      }}
    >
      <div className='flex flex-wrap items-start justify-between w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
        <span className='inline-flex items-center min-w-0' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          <Sym name={iface.icon} size={20} color='var(--icon-brandPrimary-default, #007549)' />
          <span style={{ ...PANEL_VALUE_STYLE, fontWeight: 'var(--type-weight-bold)' }}>{iface.label}</span>
        </span>
        <StatusBadge style={meta.badge} size='small'>{meta.label}</StatusBadge>
      </div>

      <InfoPair label='ปลายทาง (endpoint)' value={iface.endpoint} minWidth={0} />
      <InfoPair label='โพรโทคอล' value={iface.protocol} minWidth={0} />

      <div className='flex flex-wrap w-full' style={{ gap: 'var(--dim-space-400, 16px)' }}>
        <InfoPair label='ซิงก์ล่าสุด' value={iface.lastSyncAt} minWidth={150} />
        <InfoPair label='ค้างอยู่' value={`${iface.pending || 0} รายการ`} minWidth={110} />
      </div>

      {iface.status === 'down' ? (
        <PanelAlert tone='error' icon='cloud_off' title='ขาดการเชื่อมต่อ'>
          เริ่มขาดการเชื่อมต่อตั้งแต่ {iface.downSince || 'ไม่ทราบเวลา'} — ฟังก์ชันที่ต้องพึ่งระบบนี้จะถูกล็อกไว้พร้อมเหตุผล
        </PanelAlert>
      ) : null}

      <div className='flex flex-wrap items-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
        <GuardedAction allowed={canEdit}>
          <NeutralSubdueButton
            variant='outline'
            size='sm'
            leadingIcon={retrying === 'trying' ? 'sync' : retrying === 'ok' ? 'check' : retrying === 'fail' ? 'error' : 'refresh'}
            disabled={retrying === 'trying'}
            onClick={onRetry}
          >
            {retrying === 'trying' ? 'กำลังลองเชื่อมต่อ…'
              : retrying === 'ok' ? 'เชื่อมต่อสำเร็จ'
                : retrying === 'fail' ? 'ลองใหม่ไม่สำเร็จ — ลองอีกครั้ง'
                  : 'ลองเชื่อมต่อใหม่'}
          </NeutralSubdueButton>
        </GuardedAction>
      </div>
    </div>
  );
};

/* ── หน้าเพจ ─────────────────────────────────────────────────── */

const TreatmentInterfacesPage = () => {
  const history = useHistory();
  const access = useTreatmentAccess();

  const [interfaces] = useTreatmentStore(subscribeInterfaces, getInterfaces);
  const [inbound] = useTreatmentStore(subscribeInbound, getInboundResults);
  const [notifications] = useTreatmentStore(subscribeLabNotifications, getLabNotifications);
  const [sessions] = useTreatmentStore(subscribeTelemedSessions, getTelemedSessions);

  const [tab, setTab] = useState('status');
  const [retryState, setRetryState] = useState({});
  const [toast, setToast] = useState(null);
  const [flagTarget, setFlagTarget] = useState(null);
  const [criticalGuard, setCriticalGuard] = useState(null);
  const [deviceTarget, setDeviceTarget] = useState(null);
  const [subs, setSubs] = useState(() => getLabSubscriptions());
  const [pacsResult, setPacsResult] = useState(null);
  const [telemedStart, setTelemedStart] = useState(false);
  const [telemedHn, setTelemedHn] = useState('');
  const [telemedTouched, setTelemedTouched] = useState(false);
  const [recordConsent, setRecordConsent] = useState(false);
  const [consentName, setConsentName] = useState('');
  const [reportTarget, setReportTarget] = useState(null);
  /* §1.4.7.3 HL7 inspector · §1.4.7.4 study detail · §1.4.7.5 device mapping
     · §1.4.3.23 telemed session log — 4 หน้าต่างรายละเอียดที่เพิ่มในเวฟนี้ */
  const [hl7Target, setHl7Target] = useState(null);
  const [studyTarget, setStudyTarget] = useState(null);
  const [mappingTarget, setMappingTarget] = useState(null);
  const [sessionTarget, setSessionTarget] = useState(null);
  const [exportResult, setExportResult] = useState(null);

  const showToast = (variant, message) => setToast({ id: Date.now(), variant, message });

  const devices = useMemo(() => getDevices(), []);
  const studies = PACS_STUDIES;
  const pacsUp = isInterfaceUp('pacs');

  /* ผู้รับบริการที่เลือกเปิดห้องสนทนาได้ = คิวตรวจรักษาของวันนี้
     (ห้าม hard-code คนไข้ — session ที่ผูกผิดคนคือ wrong-patient record) */
  const telemedPatients = useMemo(() => {
    const seen = new Set();
    return TREATMENT_QUEUE_ROWS.filter((r) => {
      if (!r.hn || seen.has(r.hn)) return false;
      seen.add(r.hn);
      return true;
    }).map((r) => ({ value: r.hn, label: `${r.name} (HN ${r.hn})`, name: r.name }));
  }, []);

  const telemedPatient = telemedPatients.find((p) => p.value === telemedHn) || null;

  const resetTelemedDialog = () => {
    setTelemedStart(false); setTelemedHn(''); setTelemedTouched(false);
    setRecordConsent(false); setConsentName('');
  };

  const summaryCards = useMemo(() => {
    const pendingInbound = inbound.filter((r) => r.status === 'pending').length;
    const mismatch = inbound.filter((r) => r.status === 'mismatch').length;
    const unread = notifications.filter((n) => !n.acknowledgedAt).length;
    return [
      { key: 'up',       label: 'เชื่อมต่อปกติ',   value: interfaces.filter((i) => i.status === 'up').length,       indicator: `จาก ${interfaces.length} ระบบ`, color: 'positive',    icon: 'cloud_done' },
      { key: 'degraded', label: 'ตอบสนองช้า',      value: interfaces.filter((i) => i.status === 'degraded').length, indicator: 'ต้องเฝ้าระวัง',      color: 'inprogress',  icon: 'cloud_sync' },
      { key: 'down',     label: 'ขาดการเชื่อมต่อ', value: interfaces.filter((i) => i.status === 'down').length,     indicator: 'ฟังก์ชันถูกล็อก',    color: 'destructive', icon: 'cloud_off' },
      { key: 'pending',  label: 'ผลรอนำเข้า',      value: pendingInbound,                                           indicator: 'จาก LIS',            color: 'info',        icon: 'inbox' },
      { key: 'mismatch', label: 'HN ไม่ตรง',       value: mismatch,                                                 indicator: 'ห้ามนำเข้าอัตโนมัติ', color: 'destructive', icon: 'person_alert' },
      { key: 'unread',   label: 'ยังไม่รับทราบ',   value: unread,                                                   indicator: 'การแจ้งเตือนผลแล็บ', color: 'brand',       icon: 'notifications_active' },
    ];
  }, [interfaces, inbound, notifications]);

  const doRetry = (iface) => {
    setRetryState((s) => ({ ...s, [iface.key]: 'trying' }));
    /* ไม่มี backend จริง — จำลองผลลัพธ์ผ่าน retryInterface() ของ store */
    window.setTimeout(() => {
      const res = retryInterface(iface.key);
      const ok = res && (res.status === 'up' || res.ok);
      setRetryState((s) => ({ ...s, [iface.key]: ok ? 'ok' : 'fail' }));
      showToast(ok ? 'success' : 'error',
        ok ? `เชื่อมต่อ ${iface.label} สำเร็จ` : `ยังเชื่อมต่อ ${iface.label} ไม่ได้ — ลองอีกครั้งหรือแจ้งผู้ดูแลระบบ`);
    }, 700);
  };

  /* การรับทราบค่าวิกฤตต้องจับคู่ด้วย hn + ชื่อการตรวจ — ไม่งั้นผู้ป่วยสองราย
     ที่มีค่าวิกฤตรายการเดียวกัน (เช่น Creatinine) จะถูกเคลียร์ข้ามคนกัน */
  const findUnackedNotification = (row) => notifications.find(
    (n) => n.hn === row.hn && n.testName === row.testName && !n.acknowledgedAt,
  );

  const doImport = (row) => {
    if (row.critical && findUnackedNotification(row)) {
      setCriticalGuard(row);
      return;
    }
    importInboundResult(row.id);
    showToast('success', `นำเข้าผล ${row.testName} เข้าสู่เวชระเบียนแล้ว`);
  };

  /* หน้านี้เป็น interface monitor ไม่มีฟอร์มสัญญาณชีพให้เขียนลงตรง ๆ —
     จึงจัดคิว patch ไว้ให้หน้าบันทึกการรักษาหยิบไปใช้ และรายงานตามจริง
     ว่า "จัดคิวไว้" ไม่ใช่ "เขียนลงแล้ว" */
  const doPullDevice = (device) => {
    /* ค่านอกช่วงถูกตัดออกจาก patch ตั้งแต่ชั้นข้อมูล — ถ้าไม่เหลือช่องไหนเลย
       ต้องบอกตามจริงว่าไม่ได้จัดคิวอะไร ไม่ใช่ขึ้น toast ว่าสำเร็จ */
    const patch = buildDeviceVitalPatch(device);
    const fields = Object.keys(patch);
    if (fields.length === 0) {
      setDeviceTarget(null);
      showToast('error', `ค่าจาก ${device.name} อยู่นอกช่วงที่ยอมรับทั้งหมด — ไม่ได้จัดคิวค่าใดเข้าสัญญาณชีพ ต้องตรวจสอบเครื่องก่อน`);
      return;
    }
    /* ยังไม่มีค่าปลายทางให้เทียบในหน้านี้ → ไม่มีการเขียนทับใด ๆ เกิดขึ้นจริง */
    const overwritten = overwrittenVitalFields(patch, {});
    queueDeviceVitalPatch({ hn: device.hn || '', device, patch });
    logDevicePull({ hn: device.hn || '', device, fields, overwritten, applied: false });
    setDeviceTarget(null);
    showToast(
      'success',
      `จัดคิวค่าจาก ${device.name} ไว้แล้ว — ช่อง ${fields.map(vitalFieldLabel).join(' · ')} จะถูกเขียนเมื่อเปิดสัญญาณชีพของ visit ที่เกี่ยวข้อง`,
    );
  };

  if (!access.canView) {
    return (
      <QueuePageShell activeKey='treat' breadcrumb={breadcrumb} title='สถานะการเชื่อมต่อระบบภายนอก'>
        <div style={{ paddingTop: 'var(--dim-space-600, 24px)', paddingRight: 'var(--dim-space-600, 24px)', paddingBottom: 'var(--dim-space-600, 24px)', paddingLeft: 'var(--dim-space-600, 24px)' }}>
          <AccessDeniedPanel what='สถานะการเชื่อมต่อระบบภายนอก' onBack={() => history.push('/treat/queue')} />
        </div>
      </QueuePageShell>
    );
  }

  const inboundColumns = [
    {
      key: 'patient', header: 'ผู้รับบริการ',
      render: (row) => (
        <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-100, 4px)' }}>
          <span style={PANEL_VALUE_STYLE}>{row.patientName}</span>
          <span style={PANEL_LABEL_STYLE}>HN {row.hn}</span>
        </div>
      ),
    },
    {
      key: 'testName', header: 'รายการตรวจ', flex: 1,
      render: (row) => (
        <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-100, 4px)' }}>
          <span className='inline-flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
            <span style={PANEL_VALUE_STYLE}>{row.testName}</span>
            {row.critical ? <StatusBadge style='error' size='small' icon='priority_high'>ค่าวิกฤต</StatusBadge> : null}
          </span>
          <span style={PANEL_LABEL_STYLE}>{row.result}</span>
          {row.note ? <span style={{ ...PANEL_LABEL_STYLE, color: 'var(--text-colorfulbadge-yellow, #A16207)' }}>{row.note}</span> : null}
        </div>
      ),
    },
    { key: 'resultedAt', header: 'เวลารายงานผล' },
    {
      key: 'status', header: 'สถานะ',
      render: (row) => {
        const meta = inboundStatusMeta(row.status);
        return <StatusBadge style={meta.badge} size='small'>{meta.label}</StatusBadge>;
      },
    },
    {
      key: 'actions', header: '',
      render: (row) => {
        /* §1.4.7.3 — เปิดดูข้อความ HL7 ต้นฉบับได้ทุกแถว รวมแถวที่ตีกลับ
           (ต้องตรวจได้ว่าทำไมถึงไม่ผ่าน) — ไม่ผูกกับสิทธิ์แก้ไข */
        const inspectBtn = (
          <NeutralSubdueButton
            variant='outline' size='sm' leadingIcon='code'
            onClick={() => setHl7Target(row)}
          >
            ดูข้อความ HL7
          </NeutralSubdueButton>
        );

        if (row.status === 'imported') {
          return (
            <div className='flex flex-wrap items-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
              <span style={PANEL_LABEL_STYLE}>นำเข้าแล้ว</span>
              {inspectBtn}
            </div>
          );
        }
        /* HN ไม่ตรง — ห้ามมีปุ่มนำเข้าเลย มีได้แค่ปุ่ม flag + ดูข้อความ */
        if (row.status === 'mismatch') {
          return (
            <div className='flex flex-wrap items-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
              {inspectBtn}
              <GuardedAction allowed={access.canEdit}>
                <NeutralSubdueButton variant='outline' size='sm' leadingIcon='flag' onClick={() => setFlagTarget(row)}>
                  ตีกลับ / แจ้งห้องแล็บ
                </NeutralSubdueButton>
              </GuardedAction>
            </div>
          );
        }
        return (
          <div className='flex flex-wrap items-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
            {inspectBtn}
            <GuardedAction allowed={access.canEdit}>
              <NeutralSubdueButton variant='outline' size='sm' leadingIcon='download' onClick={() => doImport(row)}>
                นำเข้าสู่ visit
              </NeutralSubdueButton>
            </GuardedAction>
          </div>
        );
      },
    },
  ];

  return (
    <QueuePageShell
      activeKey='treat'
      breadcrumb={breadcrumb}
      /* ทุกหน้าของเมนูบันทึกการรักษามีปุ่มนี้ (มติผู้ใช้ 28 ส.ค. 69) */
      leadingActions={<DutyRosterAction />}
      title='สถานะการเชื่อมต่อระบบภายนอก'
      onBack={() => history.push('/treat/queue')}
      backLabel='กลับไปหน้าคิว'
      summaryCards={summaryCards}
      tabs={TABS}
      activeTab={tab}
      onTabChange={setTab}
    >
      <PhcisTopToast session={toast} onDismiss={() => setToast(null)} />

      <div
        className='flex flex-col flex-1 min-w-0'
        style={{ paddingTop: 'var(--dim-space-600, 24px)', paddingRight: 'var(--dim-space-600, 24px)', paddingBottom: 'var(--dim-space-600, 24px)', paddingLeft: 'var(--dim-space-600, 24px)', gap: 'var(--dim-space-400, 16px)' }}
      >
        <PanelAlert tone='warning' icon='engineering' title='หน้านี้เป็นตัวติดตามสถานะ ไม่ใช่ตัวรับส่งข้อมูลจริง'>
          ระบบยังไม่มี HL7 v2.5.1 engine, DICOMweb client, MQTT broker หรือ WebRTC media server ในตัว —
          ข้อมูลที่แสดงเป็นชุดจำลองที่จัดรูปแบบตามข้อกำหนดไว้ล่วงหน้า เพื่อให้ตรวจสอบกติกาการทำงาน
          (สิทธิ์ · การรับทราบค่าวิกฤต · การกัน auto-merge · การบันทึก audit) ได้ครบก่อนต่อระบบจริง
        </PanelAlert>

        {tab === 'status' ? (
          <PanelCard title='การเชื่อมต่อทั้ง 4 เส้นทาง' subtitle='LIS · PACS · เกตเวย์อุปกรณ์วัดค่า · ระบบปรึกษาทางไกล'>
            <div className='flex flex-wrap w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
              {interfaces.map((i) => (
                <InterfaceCard
                  key={i.key}
                  iface={i}
                  retrying={retryState[i.key]}
                  canEdit={access.canEdit}
                  onRetry={() => doRetry(i)}
                />
              ))}
            </div>
          </PanelCard>
        ) : null}

        {tab === 'inbound' ? (
          <PanelCard
            title='กล่องข้อความขาเข้าจาก LIS'
            subtitle='ผลตรวจที่รอนำเข้า · ค่าวิกฤตที่ต้องรับทราบก่อน · แถวที่ HN ไม่ตรงซึ่งห้ามนำเข้าอัตโนมัติ'
            action={<CountLabel n={inbound.length} />}
          >
            {inbound.some((r) => r.status === 'mismatch') ? (
              <PanelAlert tone='error' icon='person_alert' title='พบผลที่ HN ไม่ตรงกับใบสั่งตรวจ'>
                ระบบไม่มีปุ่มนำเข้าให้แถวเหล่านี้โดยเจตนา — การรวมข้อมูลผู้ป่วยผิดคนเป็นความเสี่ยงร้ายแรง
                ทำได้เพียงตีกลับพร้อมเหตุผลเพื่อให้ห้องปฏิบัติการแก้ไขต้นทาง
              </PanelAlert>
            ) : null}

            {inbound.length === 0 ? (
              <PanelEmptyState
                icon='mark_email_read'
                title='ไม่มีผลตรวจค้างในกล่องขาเข้า'
                subtitle='ผลที่ห้องปฏิบัติการส่งมาทั้งหมดถูกนำเข้าเวชระเบียนเรียบร้อยแล้ว'
              />
            ) : (
              <div className='w-full min-w-0' style={{ overflowX: 'auto' }}>
                <Table columns={inboundColumns} rows={inbound} rowKey={(r) => r.id} />
              </div>
            )}
          </PanelCard>
        ) : null}

        {tab === 'notify' ? (
          <>
            <PanelCard
              title='การแจ้งเตือนเมื่อผลแล็บเสร็จ'
              subtitle='รายการนี้เป็นต้นทางของกระดิ่งบนแถบเฝ้าระวังในหน้าบันทึกการรักษา'
              action={<CountLabel n={notifications.length} />}
            >
              {notifications.length === 0 ? (
                <PanelEmptyState icon='notifications_off' title='ยังไม่มีการแจ้งเตือนผลแล็บ' subtitle='เมื่อห้องปฏิบัติการรายงานผล ระบบจะแจ้งเตือนผู้รับผิดชอบทันที' />
              ) : (
                <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      className='flex flex-wrap items-center justify-between w-full'
                      style={{
                        gap: 'var(--dim-space-200, 8px)',
                        borderRadius: 'var(--dim-radius-300, 10px)',
                        border: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary)',
                        paddingTop: 'var(--dim-space-300, 12px)',
                        paddingRight: 'var(--dim-space-300, 12px)',
                        paddingBottom: 'var(--dim-space-300, 12px)',
                        paddingLeft: 'var(--dim-space-300, 12px)',
                      }}
                    >
                      <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-100, 4px)' }}>
                        <span className='inline-flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                          <span style={PANEL_VALUE_STYLE}>{n.testName}</span>
                          {n.critical ? <StatusBadge style='error' size='small' icon='priority_high'>ค่าวิกฤต</StatusBadge> : null}
                        </span>
                        <span style={PANEL_LABEL_STYLE}>{n.patientName} (HN {n.hn}) · ผลเสร็จ {n.completedAt}</span>
                        <span style={PANEL_LABEL_STYLE}>
                          แจ้งไปยัง {n.recipient} เมื่อ {n.notifiedAt}
                          {n.acknowledgedAt ? ` · รับทราบเมื่อ ${n.acknowledgedAt}` : ''}
                        </span>
                      </div>
                      {n.acknowledgedAt ? (
                        <StatusBadge style='success' size='small' icon='check'>รับทราบแล้ว</StatusBadge>
                      ) : (
                        <GuardedAction allowed={access.canEdit}>
                          <NeutralSubdueButton variant='outline' size='sm' leadingIcon='check' onClick={() => acknowledgeLabNotification(n.id)}>
                            รับทราบ
                          </NeutralSubdueButton>
                        </GuardedAction>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </PanelCard>

            <PanelCard title='ตั้งค่าผู้รับการแจ้งเตือน' subtitle='กำหนดว่าใครได้รับ ช่องทางใด และรับเฉพาะค่าวิกฤตหรือไม่'>
              <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                {subs.map((s) => (
                  <div
                    key={s.id}
                    className='flex flex-wrap items-center justify-between w-full'
                    style={{
                      gap: 'var(--dim-space-200, 8px)',
                      borderRadius: 'var(--dim-radius-300, 10px)',
                      border: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary)',
                      paddingTop: 'var(--dim-space-200, 8px)',
                      paddingRight: 'var(--dim-space-300, 12px)',
                      paddingBottom: 'var(--dim-space-200, 8px)',
                      paddingLeft: 'var(--dim-space-300, 12px)',
                    }}
                  >
                    <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-100, 4px)' }}>
                      <span className='inline-flex items-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                        <ColorfulBadge style='grey' size='small' width='hug'>{s.scope}</ColorfulBadge>
                        <span style={PANEL_VALUE_STYLE}>{s.name}</span>
                      </span>
                      <span style={PANEL_LABEL_STYLE}>
                        ช่องทาง: {s.channel}{s.criticalOnly ? ' · เฉพาะค่าวิกฤต' : ''}
                      </span>
                    </div>
                    <Checkbox
                      checked={s.enabled}
                      disabled={!access.canEdit}
                      onChange={() => {
                        toggleLabSubscription(s.id, !s.enabled);
                        setSubs(getLabSubscriptions());
                      }}
                      label={s.enabled ? 'เปิดรับการแจ้งเตือน' : 'ปิดรับการแจ้งเตือน'}
                    />
                  </div>
                ))}
              </div>
            </PanelCard>
          </>
        ) : null}

        {tab === 'pacs' ? (
          <PanelCard
            title='รายการภาพใน PACS'
            subtitle='DICOMweb (WADO-RS / QIDO-RS) — การเปิดภาพถูกล็อกเมื่อการเชื่อมต่อขาด'
            action={<CountLabel n={studies.length} />}
          >
            {!pacsUp ? (
              <PanelAlert tone='error' icon='cloud_off' title='PACS ขาดการเชื่อมต่อ'>
                ปุ่มเปิดภาพถูกปิดไว้ทั้งหมดพร้อมเหตุผล — รายงานผลที่ดึงมาแล้วยังอ่านได้จากหน้าบันทึกการรักษา
              </PanelAlert>
            ) : null}
            <div className='w-full min-w-0' style={{ overflowX: 'auto' }}>
              <Table
                columns={[
                  { key: 'accession', header: 'Accession No.' },
                  { key: 'hn', header: 'HN' },
                  { key: 'examType', header: 'รายการตรวจ', flex: 1 },
                  { key: 'studyDate', header: 'วันเวลาที่ถ่าย' },
                  { key: 'images', header: 'จำนวนภาพ', render: (r) => `${r.images} ภาพ` },
                  {
                    key: 'status', header: 'สถานะ',
                    render: (r) => (
                      <ColorfulBadge style={r.status === 'พร้อมดูภาพ' ? 'teal' : 'yellow'} size='small' width='hug'>
                        {r.status}
                      </ColorfulBadge>
                    ),
                  },
                  {
                    key: 'actions', header: '',
                    render: (r) => (
                      <div className='flex flex-wrap items-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                        {/* §1.4.7.4 — รายละเอียด study + บันทึกการ query DICOMweb */}
                        <NeutralSubdueButton
                          variant='outline' size='sm' leadingIcon='travel_explore'
                          onClick={() => setStudyTarget(r)}
                        >
                          รายละเอียด / query log
                        </NeutralSubdueButton>
                        <NeutralSubdueButton
                          variant='outline' size='sm' leadingIcon='description'
                          onClick={() => setReportTarget(openPacsReport(r))}
                        >
                          ใบรายงานผล
                        </NeutralSubdueButton>
                        {pacsUp ? (
                          <NeutralSubdueButton variant='outline' size='sm' leadingIcon='image' onClick={() => setPacsResult(openPacsStudy(r))}>
                            เปิดภาพ
                          </NeutralSubdueButton>
                        ) : (
                          <Tooltip content='PACS ขาดการเชื่อมต่อ — เปิดภาพไม่ได้ในขณะนี้' position='top'>
                            <span style={{ display: 'inline-flex', cursor: 'not-allowed' }}>
                              <NeutralSubdueButton variant='outline' size='sm' leadingIcon='image' disabled>
                                เปิดภาพ
                              </NeutralSubdueButton>
                            </span>
                          </Tooltip>
                        )}
                      </div>
                    ),
                  },
                ]}
                rows={studies}
                rowKey={(r) => r.id}
              />
            </div>
          </PanelCard>
        ) : null}

        {tab === 'device' ? (
          <PanelCard
            title='อุปกรณ์วัดค่าทางการแพทย์'
            subtitle='ดึงค่าที่อุปกรณ์วัดได้เข้าสู่สัญญาณชีพ — ถ้าค่าปลายทางถูกกรอกด้วยมือไว้แล้ว ต้องยืนยันก่อนเขียนทับ'
            action={<CountLabel n={devices.length} unit='เครื่อง' />}
          >
            <div className='flex flex-wrap w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
              {devices.map((d) => (
                <div
                  key={d.id}
                  className='flex flex-col min-w-0'
                  style={{
                    gap: 'var(--dim-space-200, 8px)',
                    flex: '1 1 300px',
                    minWidth: 300,
                    borderRadius: 'var(--dim-radius-300, 10px)',
                    border: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary)',
                    paddingTop: 'var(--dim-space-300, 12px)',
                    paddingRight: 'var(--dim-space-300, 12px)',
                    paddingBottom: 'var(--dim-space-300, 12px)',
                    paddingLeft: 'var(--dim-space-300, 12px)',
                  }}
                >
                  <div className='flex flex-wrap items-start justify-between w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                    <span style={{ ...PANEL_VALUE_STYLE, fontWeight: 'var(--type-weight-bold)' }}>{d.name}</span>
                    <StatusBadge style={d.online ? 'success' : 'warning'} size='small'>
                      {d.online ? 'พร้อมใช้งาน' : 'ตรวจสอบก่อนใช้'}
                    </StatusBadge>
                  </div>
                  <span style={PANEL_LABEL_STYLE}>{d.code} · {d.room}</span>
                  {!d.online ? <span style={{ ...PANEL_LABEL_STYLE, color: 'var(--text-colorfulbadge-yellow, #A16207)' }}>{d.status}</span> : null}
                  <InfoPair label='ค่าที่อ่านได้ล่าสุด' value={d.readingLabel} minWidth={0} />
                  <InfoPair label='เวลาที่อ่าน' value={d.readAt} minWidth={0} />
                  {/* §1.4.7.5 — ค่านอกช่วงที่ยอมรับห้าม auto-fill */}
                  {deviceHasOutOfRange(d) ? (
                    <PanelAlert tone='error' icon='error' title='มีค่าอยู่นอกช่วงที่ยอมรับ'>
                      {validateDeviceReading(d).filter((r) => r.outOfRange).map((r) => r.message).join(' · ')}
                      {' '}— ระบบไม่ดึงค่าเข้าสัญญาณชีพอัตโนมัติ ต้องตรวจสอบเครื่องและยืนยันด้วยตนเอง
                    </PanelAlert>
                  ) : null}
                  <div className='flex flex-wrap items-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                    {/* §1.4.7.5 — ปุ่มต้องถูกปิดจริงเมื่อมีค่านอกช่วง ไม่ใช่แค่
                        ขึ้นข้อความเตือน (คำเตือนสัญญาว่า "ระบบไม่ดึงค่าอัตโนมัติ") */}
                    <GuardedAction
                      allowed={access.canEdit && d.online && !deviceHasOutOfRange(d)}
                      reason={deviceHasOutOfRange(d)
                        ? 'มีค่าอยู่นอกช่วงที่ยอมรับ — ต้องตรวจสอบเครื่องก่อนดึงค่า'
                        : !d.online ? 'อุปกรณ์ยังไม่พร้อมใช้งาน — ตรวจสอบเครื่องก่อน' : NO_EDIT_RIGHT_TOOLTIP}
                    >
                      <NeutralSubdueButton variant='outline' size='sm' leadingIcon='download' onClick={() => setDeviceTarget(d)}>
                        ดึงค่าเข้าสัญญาณชีพ
                      </NeutralSubdueButton>
                    </GuardedAction>
                    <NeutralSubdueButton variant='outline' size='sm' leadingIcon='settings_ethernet' onClick={() => setMappingTarget(d)}>
                      ตั้งค่าการ map ค่า
                    </NeutralSubdueButton>
                  </div>
                </div>
              ))}
            </div>

            {/* §1.4.7.5 — ตารางรวมการ map ค่าทุกเครื่อง (ผนวก ง) */}
            <span style={{ ...PANEL_VALUE_STYLE, fontWeight: 'var(--type-weight-bold)' }}>
              ตารางการเชื่อมโยงค่าจากอุปกรณ์ → ฟิลด์สัญญาณชีพ
            </span>
            <span style={PANEL_LABEL_STYLE}>
              ค่าที่อ่านได้นอกช่วงที่ยอมรับจะไม่ถูกเขียนลงสัญญาณชีพอัตโนมัติ — ต้องให้เจ้าหน้าที่ยืนยันทุกครั้ง
            </span>
            <div className='w-full min-w-0' style={{ overflowX: 'auto' }}>
              <Table
                columns={[
                  {
                    key: 'device', header: 'เครื่อง',
                    render: (r) => {
                      const d = devices.find((x) => x.id === r.deviceId);
                      return (
                        <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-100, 4px)' }}>
                          <span style={PANEL_VALUE_STYLE}>{d?.name || r.deviceId}</span>
                          <span style={PANEL_LABEL_STYLE}>{d?.code || ''}</span>
                        </div>
                      );
                    },
                  },
                  {
                    key: 'field', header: 'ฟิลด์สัญญาณชีพปลายทาง',
                    render: (r) => <span style={PANEL_VALUE_STYLE}>{vitalFieldLabel(r.field)}</span>,
                  },
                  { key: 'unit', header: 'หน่วย' },
                  {
                    key: 'range', header: 'ช่วงค่าที่ยอมรับ',
                    render: (r) => <span style={PANEL_LABEL_STYLE}>{r.min} – {r.max} {r.unit}</span>,
                  },
                  {
                    key: 'hl7Code', header: 'รหัสอ้างอิง (ผนวก ง)',
                    render: (r) => <span style={PANEL_LABEL_STYLE}>{r.hl7Code}</span>,
                  },
                  {
                    key: 'note', header: 'หมายเหตุ', flex: 1,
                    render: (r) => <span style={PANEL_LABEL_STYLE}>{r.note}</span>,
                  },
                ]}
                rows={DEVICE_FIELD_MAPPINGS}
                rowKey={(r) => `${r.deviceId}-${r.field}`}
              />
            </div>
          </PanelCard>
        ) : null}

        {tab === 'telemed' ? (
          <PanelCard
            title='การปรึกษาทางไกลของวันนี้'
            subtitle='WebRTC — การบันทึกภาพ/เสียงต้องได้รับความยินยอมและบันทึกผู้ให้ความยินยอมเสมอ'
            action={
              <>
                <CountLabel n={sessions.length} unit='ครั้ง' />
                <GuardedAction allowed={access.canEdit}>
                  <BrandButton variant='fill' size='sm' leadingIcon='video_call' onClick={() => setTelemedStart(true)}>
                    เริ่มการปรึกษาใหม่
                  </BrandButton>
                </GuardedAction>
              </>
            }
          >
            {sessions.length === 0 ? (
              <PanelEmptyState icon='videocam_off' title='ยังไม่มีการปรึกษาทางไกลในวันนี้' subtitle='กด "เริ่มการปรึกษาใหม่" เพื่อเปิดห้องสนทนากับผู้รับบริการ' />
            ) : (
              <div className='w-full min-w-0' style={{ overflowX: 'auto' }}>
                <Table
                  columns={[
                    {
                      key: 'patientName', header: 'ผู้รับบริการ',
                      render: (r) => (
                        <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-100, 4px)' }}>
                          <span style={PANEL_VALUE_STYLE}>{r.patientName}</span>
                          <span style={PANEL_LABEL_STYLE}>HN {r.hn}</span>
                        </div>
                      ),
                    },
                    {
                      key: 'state', header: 'สถานะ',
                      render: (r) => {
                        const meta = telemedStateMeta(r.state);
                        return <StatusBadge style={meta.badge} size='small'>{meta.label}</StatusBadge>;
                      },
                    },
                    { key: 'startedAt', header: 'เริ่ม' },
                    { key: 'endedAt', header: 'สิ้นสุด', render: (r) => r.endedAt || '—' },
                    { key: 'participants', header: 'ผู้เข้าร่วม', flex: 1 },
                    {
                      key: 'recording', header: 'การบันทึก',
                      render: (r) => (r.recording ? (
                        <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-100, 4px)' }}>
                          <StatusBadge style='info' size='small' icon='videocam'>บันทึกภาพ/เสียง</StatusBadge>
                          <span style={PANEL_LABEL_STYLE}>ยินยอมโดย {r.consentBy} ({r.consentAt})</span>
                        </div>
                      ) : <span style={PANEL_LABEL_STYLE}>ไม่บันทึก</span>),
                    },
                    {
                      key: 'actions', header: '',
                      render: (r) => (
                        <div className='flex flex-wrap items-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                          {/* §1.4.3.23 — ดูบันทึก session + หลักฐานความยินยอมได้ทุกแถว */}
                          <NeutralSubdueButton
                            variant='outline' size='sm' leadingIcon='receipt_long'
                            onClick={() => setSessionTarget(r)}
                          >
                            บันทึก session
                          </NeutralSubdueButton>
                          {r.state === 'waiting' || r.state === 'active' ? (
                            <>
                              <GuardedAction allowed={access.canEdit}>
                                <NeutralSubdueButton variant='outline' size='sm' leadingIcon='call_end' onClick={() => setTelemedState(r.id, 'ended')}>
                                  จบการสนทนา
                                </NeutralSubdueButton>
                              </GuardedAction>
                              {r.state === 'waiting' ? (
                                <GuardedAction allowed={access.canEdit}>
                                  <NeutralSubdueButton variant='outline' size='sm' leadingIcon='person_off' onClick={() => setTelemedState(r.id, 'noshow')}>
                                    ไม่เข้าห้อง
                                  </NeutralSubdueButton>
                                </GuardedAction>
                              ) : null}
                            </>
                          ) : null}
                        </div>
                      ),
                    },
                  ]}
                  rows={sessions}
                  rowKey={(r) => r.id}
                />
              </div>
            )}
          </PanelCard>
        ) : null}
      </div>

      {/* ตีกลับผลที่ HN ไม่ตรง */}
      <ReasonDialog
        open={!!flagTarget}
        type='destructive'
        title='ตีกลับผลตรวจที่ HN ไม่ตรง'
        description={flagTarget ? `${flagTarget.testName} — ระบุ HN ${flagTarget.hn} (${flagTarget.patientName}) ซึ่งไม่ตรงกับใบสั่งตรวจ ระบบจะแจ้งกลับห้องปฏิบัติการโดยไม่รวมข้อมูลเข้าเวชระเบียนใด ๆ` : ''}
        confirmLabel='ตีกลับพร้อมเหตุผล'
        suggestions={[
          'HN ในข้อความไม่ตรงกับใบสั่งตรวจ ขอให้ห้องปฏิบัติการตรวจสอบต้นทาง',
          'ชื่อผู้รับบริการใกล้เคียงกันแต่คนละราย — เสี่ยงต่อการรวมข้อมูลผิดคน',
          'ไม่พบใบสั่งตรวจที่ตรงกับผลนี้ในระบบ',
        ]}
        onConfirm={(reason) => {
          flagInboundMismatch(flagTarget.id, reason);
          setFlagTarget(null);
          showToast('success', 'ตีกลับผลตรวจและบันทึกเหตุผลเรียบร้อย');
        }}
        onClose={() => setFlagTarget(null)}
      />

      {/* ต้องรับทราบค่าวิกฤตก่อนนำเข้า */}
      <AlertDialog
        open={!!criticalGuard}
        type='warning'
        title='ต้องรับทราบค่าวิกฤตก่อนนำเข้า'
        description={criticalGuard ? `${criticalGuard.testName} — ${criticalGuard.result}\n\nระบบกำหนดให้ผู้รับผิดชอบกดรับทราบค่าวิกฤตก่อน จึงจะนำผลเข้าเวชระเบียนได้ เพื่อให้มีร่องรอยว่าใครทราบเมื่อไร` : ''}
        confirmLabel='รับทราบและนำเข้า'
        cancelLabel='ยังไม่นำเข้า'
        onConfirm={() => {
          const notif = findUnackedNotification(criticalGuard);
          if (notif) acknowledgeLabNotification(notif.id);
          importInboundResult(criticalGuard.id);
          setCriticalGuard(null);
          showToast('success', 'รับทราบค่าวิกฤตและนำเข้าผลเรียบร้อย');
        }}
        onCancel={() => setCriticalGuard(null)}
        onClose={() => setCriticalGuard(null)}
      />

      {/* ยืนยันก่อนดึงค่า — บอกตามจริงว่าหน้านี้ทำได้แค่จัดคิว */}
      <AlertDialog
        open={!!deviceTarget}
        type='warning'
        title='ดึงค่าจากอุปกรณ์เข้าสัญญาณชีพ'
        description={deviceTarget ? `${deviceTarget.name} (${deviceTarget.code}) — ${deviceTarget.readingLabel}\n\nหน้านี้ไม่ได้เปิดฟอร์มสัญญาณชีพของ visit ใด ระบบจึง "จัดคิว" ค่าไว้ให้หน้าบันทึกการรักษาหยิบไปเขียน — และจะขอยืนยันอีกครั้งที่นั่นถ้าช่องปลายทางมีค่าที่กรอกด้วยมืออยู่แล้ว พร้อมบันทึกว่าเขียนทับค่าใด` : ''}
        confirmLabel='จัดคิวค่าจากอุปกรณ์'
        cancelLabel='ยกเลิก'
        onConfirm={() => doPullDevice(deviceTarget)}
        onCancel={() => setDeviceTarget(null)}
        onClose={() => setDeviceTarget(null)}
      >
        {/* §1.4.7.5 — ต้องเห็นรายฟิลด์ว่าอะไรจะถูกเขียน และอะไรถูกกันไว้
            เพราะอยู่นอกช่วงที่ยอมรับ (ค่านอกช่วงไม่ถูกจัดคิวเด็ดขาด) */}
        {deviceTarget ? (
          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
            {validateDeviceReading(deviceTarget).filter((r) => r.value != null).map((r) => (
              <div key={r.field} className='flex flex-wrap items-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                <StatusBadge style={r.outOfRange ? 'error' : 'success'} size='small' icon={r.outOfRange ? 'error' : 'check_circle'}>
                  {r.outOfRange ? 'นอกช่วง — ไม่จัดคิว' : 'จัดคิวได้'}
                </StatusBadge>
                <span style={PANEL_VALUE_STYLE}>{vitalFieldLabel(r.field)}: {r.value} {r.unit}</span>
                <span style={PANEL_LABEL_STYLE}>{r.message}</span>
              </div>
            ))}
            {deviceHasOutOfRange(deviceTarget) ? (
              <PanelAlert tone='error' icon='error' title='ต้องตรวจสอบเครื่องก่อน'>
                ค่าที่อยู่นอกช่วงจะไม่ถูกเขียนลงสัญญาณชีพ — วัดซ้ำหรือส่งเครื่องตรวจสอบ
                แล้วจึงกรอกค่าด้วยมือพร้อมระบุที่มาแทน
              </PanelAlert>
            ) : null}
          </div>
        ) : null}
      </AlertDialog>

      {/* ใบรายงานผลจาก PACS — อ่านได้แม้การเชื่อมต่อขาด */}
      <AlertDialog
        open={!!reportTarget}
        type={reportTarget?.ok ? 'info' : 'warning'}
        title={reportTarget?.title || 'ใบรายงานผล'}
        description={reportTarget?.message || ''}
        confirmLabel='ปิด'
        showCancel={false}
        onConfirm={() => setReportTarget(null)}
        onClose={() => setReportTarget(null)}
      />

      <AlertDialog
        open={!!pacsResult}
        type={pacsResult?.ok ? 'success' : 'warning'}
        title={pacsResult?.ok ? 'เปิดภาพใน PACS' : 'เปิดภาพไม่สำเร็จ'}
        description={pacsResult?.message || 'ส่งคำขอเปิดภาพไปยัง PACS แล้ว และบันทึกการเข้าถึงไว้ในประวัติ'}
        confirmLabel='ตกลง'
        showCancel={false}
        onConfirm={() => setPacsResult(null)}
        onClose={() => setPacsResult(null)}
      />

      {/* เริ่ม session ใหม่ + ความยินยอมการบันทึก */}
      <AlertDialog
        open={telemedStart}
        type='info'
        title='เริ่มการปรึกษาทางไกล'
        description='เลือกผู้รับบริการที่จะเปิดห้องสนทนาให้ถูกคนก่อนเสมอ — ทุก session ถูกบันทึกลง audit ผูกกับ HN ที่เลือก. หากต้องการบันทึกภาพ/เสียง ต้องได้รับความยินยอมและระบุผู้ให้ความยินยอมด้วย'
        confirmLabel='เริ่มห้องสนทนา'
        cancelLabel='ยกเลิก'
        onConfirm={() => {
          setTelemedTouched(true);
          if (!telemedPatient) {
            showToast('error', 'ต้องเลือกผู้รับบริการก่อนเปิดห้องสนทนา');
            return;
          }
          const res = startTelemedSession({
            hn: telemedPatient.value,
            patientName: telemedPatient.name,
            recording: recordConsent,
            consentBy: recordConsent ? consentName.trim() : '',
          });
          if (!res.ok) { showToast('error', res.message); return; }
          resetTelemedDialog();
          showToast('success', `เปิดห้องสนทนากับ ${telemedPatient.name} (HN ${telemedPatient.value}) แล้ว — สถานะ: รอผู้รับบริการเข้าห้อง`);
        }}
        onCancel={resetTelemedDialog}
        onClose={resetTelemedDialog}
      >
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
          <Select
            label='ผู้รับบริการ'
            required
            value={telemedHn}
            onChange={(v) => { setTelemedHn(v); setTelemedTouched(false); }}
            options={telemedPatients.map((p) => ({ value: p.value, label: p.label }))}
            placeholder='เลือกผู้รับบริการจากคิวตรวจรักษา'
            error={telemedTouched && !telemedPatient ? 'ต้องเลือกผู้รับบริการก่อนเปิดห้องสนทนา' : undefined}
          />
          <Checkbox
            checked={recordConsent}
            onChange={() => setRecordConsent((v) => !v)}
            label='บันทึกภาพ/เสียงของการสนทนานี้'
            description='ต้องแจ้งผู้รับบริการและได้รับความยินยอมก่อนเริ่มบันทึกทุกครั้ง'
          />
          {recordConsent ? (
            <InputField
              label='ผู้ให้ความยินยอม'
              required
              value={consentName}
              onChange={setConsentName}
              showLeadingIcon={false}
              placeholder='เช่น ผู้รับบริการยินยอมด้วยวาจา'
              error={consentName.trim() ? undefined : 'ต้องระบุผู้ให้ความยินยอมก่อน จึงจะเริ่มการบันทึกได้'}
            />
          ) : null}
        </div>
      </AlertDialog>

      {/* ── §1.4.7.3 / §1.5.2.1 — ตัวตรวจข้อความ HL7 ORU^R01 ──────── */}
      <AlertDialog
        open={!!hl7Target}
        type={hl7Target && hl7MessageFor(hl7Target.id)?.malformed ? 'warning' : 'info'}
        title={`ข้อความ HL7 v2.5.1 — ${hl7Target?.testName || ''}`}
        description={hl7Target
          ? `ORU^R01 จาก LIS สำนักอนามัย · เลขที่ควบคุมข้อความ ${hl7MessageFor(hl7Target.id)?.controlId || '—'} · รับเมื่อ ${hl7Target.resultedAt}`
          : ''}
        confirmLabel='ปิด'
        showCancel={false}
        onConfirm={() => setHl7Target(null)}
        onClose={() => setHl7Target(null)}
      >
        {hl7Target ? (() => {
          const msg = hl7MessageFor(hl7Target.id);
          if (!msg) {
            return (
              <PanelEmptyState
                icon='code_off'
                title='ไม่มีข้อความต้นฉบับของแถวนี้'
                subtitle='แถวนี้ถูกบันทึกไว้ก่อนที่ระบบจะเก็บข้อความ HL7 ต้นฉบับ'
              />
            );
          }
          return (
            <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
              {msg.hasMismatch ? (
                <PanelAlert tone='error' icon='person_alert' title='HN ในข้อความไม่ตรงกับใบสั่งตรวจ'>
                  ดูข้อความได้เพื่อการตรวจสอบ แต่ <b>ไม่มีปุ่มนำเข้า</b> — ต้องตีกลับให้ห้องปฏิบัติการแก้ไขต้นทางเท่านั้น
                  ระบบไม่ยอมให้ merge ผลเข้าเวชระเบียนใด ๆ ทั้งสิ้น
                </PanelAlert>
              ) : null}
              {msg.malformed ? (
                <PanelAlert tone='warning' icon='report' title='ข้อความไม่สมบูรณ์ (malformed)'>
                  บาง segment ถูกตัดกลางคัน — ระบบยังแสดงข้อความดิบให้ครบและชี้ฟิลด์ที่ถอดไม่ได้ไว้ในตารางด้านล่าง
                  แทนที่จะล้มทั้งข้อความ ต้องให้ห้องปฏิบัติการส่งซ้ำ
                </PanelAlert>
              ) : null}

              <span style={{ ...PANEL_VALUE_STYLE, fontWeight: 'var(--type-weight-bold)' }}>
                ข้อความดิบ (raw segments)
              </span>
              <div
                className='w-full min-w-0'
                style={{
                  overflowX: 'auto',
                  borderRadius: 'var(--dim-radius-300, 10px)',
                  border: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary)',
                  background: 'var(--surface-neutral-quaternary, #F9FBFB)',
                  paddingTop: 'var(--dim-space-300, 12px)',
                  paddingRight: 'var(--dim-space-300, 12px)',
                  paddingBottom: 'var(--dim-space-300, 12px)',
                  paddingLeft: 'var(--dim-space-300, 12px)',
                }}
              >
                {msg.raw.map((line, i) => (
                  <div
                    key={i}
                    style={{
                      fontFamily: 'var(--type-family-mono, monospace)',
                      fontSize: 'var(--type-size-xs, 12px)',
                      lineHeight: 1.8,
                      whiteSpace: 'pre',
                      color: 'var(--text-content-default)',
                    }}
                  >
                    {line}
                  </div>
                ))}
              </div>

              <span style={{ ...PANEL_VALUE_STYLE, fontWeight: 'var(--type-weight-bold)' }}>
                ฟิลด์ที่ถอดได้ (ตามผนวก ง)
              </span>
              <div className='w-full min-w-0' style={{ overflowX: 'auto' }}>
                <Table
                  columns={[
                    {
                      key: 'seg', header: 'Segment',
                      render: (r) => <ColorfulBadge style='blue' size='small' width='hug'>{r.seg}</ColorfulBadge>,
                    },
                    { key: 'field', header: 'ฟิลด์', flex: 1 },
                    {
                      key: 'value', header: 'ค่า', flex: 2,
                      render: (r) => (
                        <span style={{
                          ...PANEL_VALUE_STYLE,
                          color: (r.malformed || r.mismatch)
                            ? 'var(--text-alert-error, #B91C1C)'
                            : 'var(--text-content-default)',
                        }}
                        >
                          {r.value}
                        </span>
                      ),
                    },
                  ]}
                  rows={msg.parsed}
                  rowKey={(r, i) => `${r.seg}-${r.field}-${i}`}
                />
              </div>

              <span style={PANEL_LABEL_STYLE}>
                หมายเหตุ: ระบบต้นแบบยังไม่มี HL7 parser จริง — ตารางนี้คือผลที่ parser ควรถอดได้ตามผนวก ง
                ไม่ได้ถอดสดจากข้อความดิบ
              </span>
            </div>
          );
        })() : null}
      </AlertDialog>

      {/* ── §1.4.7.4 — รายละเอียด study + บันทึกการ query DICOMweb ── */}
      <AlertDialog
        open={!!studyTarget}
        type='info'
        title={`รายละเอียด study — ${studyTarget?.examType || ''}`}
        description={studyTarget
          ? `Accession ${studyTarget.accession} · HN ${studyTarget.hn} · ถ่ายเมื่อ ${studyTarget.studyDate}`
          : ''}
        confirmLabel='ปิด'
        showCancel={false}
        onConfirm={() => setStudyTarget(null)}
        onClose={() => setStudyTarget(null)}
      >
        {studyTarget ? (
          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
            <div className='flex flex-wrap w-full' style={{ gap: 'var(--dim-space-400, 16px)' }}>
              <InfoPair label='จำนวนภาพ' value={`${studyTarget.images} ภาพ`} minWidth={120} />
              <InfoPair label='สถานะ' value={studyTarget.status} minWidth={160} />
              <InfoPair label='ผู้อ่านผล' value={studyTarget.reportedBy || 'ยังไม่ได้อ่านผล'} minWidth={240} />
              <InfoPair label='อ่านผลเมื่อ' value={studyTarget.reportedAt || '—'} minWidth={200} />
            </div>

            {!pacsUp ? (
              <PanelAlert tone='error' icon='cloud_off' title='PACS ขาดการเชื่อมต่อ'>
                การเรียก WADO-RS เพื่อดึงภาพถูกระงับไว้ — รายงานผลที่ดึงมาเก็บแล้วยังอ่านได้ตามปกติ
              </PanelAlert>
            ) : null}

            <span style={{ ...PANEL_VALUE_STYLE, fontWeight: 'var(--type-weight-bold)' }}>
              บันทึกการเรียก DICOMweb (QIDO-RS / WADO-RS)
            </span>
            <div className='w-full min-w-0' style={{ overflowX: 'auto' }}>
              <Table
                columns={[
                  {
                    key: 'kind', header: 'ชนิดคำขอ',
                    render: (r) => <ColorfulBadge style='purple' size='small' width='hug'>{r.kind}</ColorfulBadge>,
                  },
                  { key: 'purpose', header: 'วัตถุประสงค์', flex: 1 },
                  {
                    key: 'url', header: 'URL ที่เรียก', flex: 2,
                    render: (r) => (
                      <span style={{
                        fontFamily: 'var(--type-family-mono, monospace)',
                        fontSize: 'var(--type-size-xs, 12px)',
                        lineHeight: 1.6,
                        color: 'var(--text-content-tertiary)',
                        wordBreak: 'break-all',
                      }}
                      >
                        {r.method} {r.url}
                      </span>
                    ),
                  },
                  {
                    key: 'status', header: 'ผลตอบกลับ',
                    render: (r) => (
                      <StatusBadge style={r.ok ? 'success' : 'error'} size='small'>{r.status}</StatusBadge>
                    ),
                  },
                  {
                    key: 'detail', header: 'รายละเอียด', flex: 2,
                    render: (r) => <span style={PANEL_LABEL_STYLE}>{r.detail}</span>,
                  },
                ]}
                rows={pacsQueryLogFor(studyTarget)}
                rowKey={(r) => r.id}
              />
            </div>

            <span style={PANEL_LABEL_STYLE}>
              หมายเหตุ: ระบบต้นแบบยังไม่มี DICOMweb client จริง — URL และผลตอบกลับด้านบนเป็นรูปแบบที่ควรได้
              ไม่ได้ยิงคำขอออกไปจริง
            </span>
          </div>
        ) : null}
      </AlertDialog>

      {/* ── §1.4.7.5 — ตั้งค่าการ map ค่าของเครื่องหนึ่งเครื่อง ────── */}
      <AlertDialog
        open={!!mappingTarget}
        type='info'
        title={`การเชื่อมโยงค่า — ${mappingTarget?.name || ''}`}
        description={mappingTarget
          ? `${mappingTarget.code} · ${mappingTarget.room} · อ่านค่าล่าสุดเมื่อ ${mappingTarget.readAt}`
          : ''}
        confirmLabel='ปิด'
        showCancel={false}
        onConfirm={() => setMappingTarget(null)}
        onClose={() => setMappingTarget(null)}
      >
        {mappingTarget ? (
          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
            <div className='w-full min-w-0' style={{ overflowX: 'auto' }}>
              <Table
                columns={[
                  {
                    key: 'field', header: 'ฟิลด์สัญญาณชีพ',
                    render: (r) => <span style={PANEL_VALUE_STYLE}>{vitalFieldLabel(r.field)}</span>,
                  },
                  {
                    key: 'value', header: 'ค่าที่อ่านได้',
                    render: (r) => (r.value == null
                      ? <span style={PANEL_LABEL_STYLE}>—</span>
                      : (
                        <span style={{
                          ...PANEL_VALUE_STYLE,
                          fontWeight: 'var(--type-weight-bold)',
                          color: r.outOfRange ? 'var(--text-alert-error, #B91C1C)' : 'var(--text-content-default)',
                        }}
                        >
                          {r.value} {r.unit}
                        </span>
                      )),
                  },
                  {
                    key: 'range', header: 'ช่วงที่ยอมรับ',
                    render: (r) => <span style={PANEL_LABEL_STYLE}>{r.min} – {r.max} {r.unit}</span>,
                  },
                  {
                    key: 'check', header: 'ผลตรวจสอบ', flex: 2,
                    render: (r) => (
                      <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-100, 4px)' }}>
                        <StatusBadge
                          style={r.value == null ? 'neutral' : r.inRange ? 'success' : 'error'}
                          size='small'
                          icon={r.outOfRange ? 'error' : undefined}
                        >
                          {r.value == null ? 'ไม่มีค่า' : r.inRange ? 'ผ่าน' : 'นอกช่วง'}
                        </StatusBadge>
                        <span style={PANEL_LABEL_STYLE}>{r.message}</span>
                      </div>
                    ),
                  },
                  {
                    key: 'hl7Code', header: 'รหัสอ้างอิง',
                    render: (r) => <span style={PANEL_LABEL_STYLE}>{r.hl7Code}</span>,
                  },
                ]}
                rows={validateDeviceReading(mappingTarget)}
                rowKey={(r) => r.field}
              />
            </div>

            <PanelAlert tone='info' icon='history' title='ประวัติการดึงค่าและการเขียนทับ'>
              ทุกครั้งที่ดึงค่าเข้าสัญญาณชีพ ระบบบันทึกไว้ในประวัติการแก้ไข (แท็บประวัติการบันทึกฯ ของหน้าบันทึกการรักษา)
              พร้อมระบุว่าเขียนทับค่าที่กรอกด้วยมือฟิลด์ใดบ้าง และค่าเดิมคืออะไร — พฤติกรรมนี้ไม่เปลี่ยนแปลง
            </PanelAlert>

            <span style={PANEL_LABEL_STYLE}>
              หมายเหตุ: ตารางการ map เป็นค่าตั้งต้นตามผนวก ง — ระบบต้นแบบยังไม่มี MQTT broker จริง
              การแก้ไขค่าเหล่านี้จากหน้าจอจะเปิดใช้เมื่อเชื่อมเกตเวย์อุปกรณ์จริงแล้ว
            </span>
          </div>
        ) : null}
      </AlertDialog>

      {/* ── §1.4.3.23 — บันทึก session + หลักฐานความยินยอม ────────── */}
      <AlertDialog
        open={!!sessionTarget}
        type='info'
        title={`บันทึกการปรึกษาทางไกล — ${sessionTarget?.patientName || ''}`}
        description={sessionTarget
          ? `เลขที่ session ${sessionTarget.id} · HN ${sessionTarget.hn} · สถานะ ${telemedStateMeta(sessionTarget.state).label}`
          : ''}
        confirmLabel='ส่งออกบันทึก'
        cancelLabel='ปิด'
        onConfirm={() => {
          const res = exportTelemedLog(sessionTarget);
          setSessionTarget(null);
          setExportResult(res);
        }}
        onCancel={() => setSessionTarget(null)}
        onClose={() => setSessionTarget(null)}
      >
        {sessionTarget ? (() => {
          const consent = telemedConsentRecord(sessionTarget);
          return (
            <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
              <span style={{ ...PANEL_VALUE_STYLE, fontWeight: 'var(--type-weight-bold)' }}>
                เหตุการณ์ระหว่าง session
              </span>
              <div className='w-full min-w-0' style={{ overflowX: 'auto' }}>
                <Table
                  columns={[
                    { key: 'at', header: 'เวลา' },
                    { key: 'event', header: 'เหตุการณ์', flex: 1 },
                    {
                      key: 'detail', header: 'รายละเอียด', flex: 2,
                      render: (r) => <span style={PANEL_LABEL_STYLE}>{r.detail}</span>,
                    },
                  ]}
                  rows={telemedSessionLog(sessionTarget)}
                  rowKey={(r, i) => `${r.event}-${i}`}
                />
              </div>

              <span style={{ ...PANEL_VALUE_STYLE, fontWeight: 'var(--type-weight-bold)' }}>
                หลักฐานความยินยอม
              </span>
              {consent.recorded ? (
                <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                  <PanelAlert tone='success' icon='verified' title='ได้รับความยินยอมให้บันทึกภาพ/เสียงแล้ว'>
                    {consent.summary}
                  </PanelAlert>
                  <div className='flex flex-wrap w-full' style={{ gap: 'var(--dim-space-400, 16px)' }}>
                    <InfoPair label='ผู้ให้ความยินยอม' value={consent.consentBy} minWidth={220} />
                    <InfoPair label='ให้ความยินยอมเมื่อ' value={consent.consentAt} minWidth={200} />
                  </div>
                  <InfoPair label='ขอบเขตความยินยอม' value={consent.scope} minWidth={0} />
                  <InfoPair label='ระยะเวลาจัดเก็บ' value={consent.retention} minWidth={0} />
                </div>
              ) : (
                <PanelAlert tone='info' icon='videocam_off' title='session นี้ไม่ได้บันทึกภาพ/เสียง'>
                  {consent.summary}
                </PanelAlert>
              )}

              <span style={PANEL_LABEL_STYLE}>
                หมายเหตุ: ระบบต้นแบบยังไม่มี WebRTC media server จริง — "ส่งออกบันทึก" ได้เฉพาะบันทึกเหตุการณ์
                ไม่มีไฟล์ภาพ/เสียงให้ดาวน์โหลด
              </span>
            </div>
          );
        })() : null}
      </AlertDialog>

      {/* ผลการส่งออกบันทึก session */}
      <AlertDialog
        open={!!exportResult}
        type={exportResult?.ok ? 'success' : 'warning'}
        title={exportResult?.ok ? 'ส่งออกบันทึก session แล้ว' : 'ส่งออกไม่สำเร็จ'}
        description={exportResult?.message || ''}
        confirmLabel='ปิด'
        showCancel={false}
        onConfirm={() => setExportResult(null)}
        onClose={() => setExportResult(null)}
      >
        {exportResult?.text ? (
          <div
            className='w-full min-w-0'
            style={{
              overflowX: 'auto',
              maxHeight: 320,
              overflowY: 'auto',
              borderRadius: 'var(--dim-radius-300, 10px)',
              border: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary)',
              background: 'var(--surface-neutral-quaternary, #F9FBFB)',
              paddingTop: 'var(--dim-space-300, 12px)',
              paddingRight: 'var(--dim-space-300, 12px)',
              paddingBottom: 'var(--dim-space-300, 12px)',
              paddingLeft: 'var(--dim-space-300, 12px)',
            }}
          >
            <pre
              style={{
                fontFamily: 'var(--type-family-mono, monospace)',
                fontSize: 'var(--type-size-xs, 12px)',
                lineHeight: 1.7,
                color: 'var(--text-content-default)',
                whiteSpace: 'pre-wrap',
                margin: 0,
              }}
            >
              {exportResult.text}
            </pre>
          </div>
        ) : null}
      </AlertDialog>
    </QueuePageShell>
  );
};

export default TreatmentInterfacesPage;
