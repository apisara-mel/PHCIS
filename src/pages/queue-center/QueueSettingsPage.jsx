import React, { useEffect, useMemo, useState } from 'react';
import QueuePageShell from '@/templates/QueuePageShell';
import SYSTEM_NAV from '@/pages/system/systemNav';
import Table from '@/components/table/Table';
import Switch from '@/components/switch/Switch';
import InputField from '@/components/forms/InputField';
import Dropdown from '@/components/forms/Dropdown';
import SelectableTag from '@/components/forms/SelectableTag';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import ConsentAuditBar from '@/components/forms/ConsentAuditBar';
import Popup from '@/components/popup/Popup';
import Alert from '@/components/alert/Alert';
import Tooltip from '@/components/tooltip/Tooltip';
import Icon from '@/components/icons/Icon';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import StatusBadge from '@/components/badge/StatusBadge';
import BrandDashedAddButton from '@/components/button/BrandDashedAddButton';
import BrandPrimaryButton from '@/components/button/BrandPrimaryButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import DangerSubdueIconButton from '@/components/button/DangerSubdueIconButton';
import NeutralSubdueIconButton from '@/components/button/NeutralSubdueIconButton';
import SuccessToast from '@/components/toast/SuccessToast';

import QueueTicket from './QueueTicket';
import {
  useQueueCenter,
  useQueueSettingsTick,
  QueueCenterSubNav,
  SectionCard,
  FieldLabel,
  HelperText,
  EmptyState,
  ReadOnlyBanner,
  RoleSwitcher,
  DraftInputField,
  toNumberDraft,
  PAGE_BODY_STYLE,
  CARD_STYLE,
} from './queueCenterShared';
import {
  QUEUE_STATIONS,
  QUEUE_DISPLAYS,
  getQueueTypes,
  upsertQueueType,
  removeQueueType,
  upsertStation,
  removeStation,
  isPrefixTaken,
  setStationActive,
  getQueueSettings,
  setQueueSetting,
  getSettingsAudit,
  getQueueActor,
  getStation,
  previewQueueCode,
  formatClock,
  formatDateTh,
  stationSummary,
} from '@/data/queueCenterStore';

/* ════════════════════════════════════════════════════════════════════════
   QueueSettingsPage — ตั้งค่าระบบคิว
   (TOR 1.3.7.1 / 1.3.7.2 / 1.3.7.3 + 1.3.4.2 + 1.3.2.1 / 1.3.2.2 / 1.3.2.6)

   โครง section เดียวกับ LabSetupPage / OpdRoomConfigPage — การ์ดต่อหัวข้อ +
   Switch + Popup แก้ไข + ConsentAuditBar แสดงผู้แก้ไขล่าสุด

   ⚠️ 1.3.4.2 (เสียงเรียกคิว): repo ไม่มีไฟล์เสียง/ไปป์ไลน์ audio และเบราว์เซอร์
   บล็อก autoplay — หน้านี้ทำได้แค่ "เก็บค่า" + ปุ่มทดสอบที่เกิดจาก user
   gesture (Web Speech API ของเบราว์เซอร์) การเล่นจริงบนจอเป็นหน้าที่ของ
   โมดูลจอแสดงคิว จึงรายงาน checklist ข้อนี้เป็น partial ไม่ใช่ done
   ════════════════════════════════════════════════════════════════════════ */

const breadcrumb = ['ระบบบริหารจัดการคิว', 'ตั้งค่าระบบคิว'];

const RESET_CYCLES = [
  { value: 'daily', label: 'เริ่มนับใหม่ทุกวัน' },
  { value: 'monthly', label: 'เริ่มนับใหม่ทุกเดือน' },
  { value: 'never', label: 'ไม่เริ่มนับใหม่' },
];

const LANGUAGES = [
  { value: 'th', label: 'ไทย' },
  { value: 'en', label: 'อังกฤษ' },
  { value: 'th-en', label: 'ไทย แล้วตามด้วยอังกฤษ' },
];

const CHIMES = [
  { value: 'ding-dong', label: 'ติ๊ง-ต่อง (มาตรฐาน)' },
  { value: 'chime-soft', label: 'กระดิ่งเบา' },
  { value: 'none', label: 'ไม่มีเสียงกริ่งนำ' },
];

const ALERT_LEVELS = [
  { value: 'info', label: 'แจ้งให้ทราบ' },
  { value: 'warning', label: 'เตือน' },
  { value: 'critical', label: 'เร่งด่วน' },
];

const ALERT_CHANNELS = [
  { key: 'screen', label: 'ไฮไลต์บนตารางคิว' },
  { key: 'toast', label: 'แจ้งเตือนเด้งบนหน้าจอเจ้าหน้าที่' },
  { key: 'display', label: 'ขึ้นจุดแดงบนจอแสดงคิว' },
];

const BADGE_COLORS = ['red', 'orange', 'yellow', 'green', 'teal', 'blue', 'indigo', 'purple', 'magenta', 'pink', 'grey'];

const TICKET_TEXT_SUGGESTIONS = [
  'กรุณานั่งรอบริเวณหน้าจุดบริการ และเตรียมบัตรประชาชนให้เจ้าหน้าที่',
  'หากไม่ได้ยินเสียงเรียกคิว โปรดติดต่อเจ้าหน้าที่ประจำจุด',
  'กรุณามาก่อนเวลานัด 15 นาที',
  'งดน้ำ-งดอาหารตามที่แพทย์สั่ง',
  'ตรวจสอบชื่อ-สกุลบนซองยาทุกครั้งก่อนออกจากจุดบริการ',
  'หากต้องออกนอกอาคาร กรุณาแจ้งเจ้าหน้าที่ก่อนเพื่อไม่ให้ถูกข้ามคิว',
];

const emptyStationDraft = {
  id: '',
  code: '',
  label: '',
  zone: '',
  floor: '',
  prefix: '',
  sourceModule: 'manual',
  sourcePath: '',
  displayId: QUEUE_DISPLAYS[0]?.id || '',
  order: QUEUE_STATIONS.length + 1,
  active: true,
  serviceType: 'other',
};

const SERVICE_TYPES = [
  { value: 'screening', label: 'ซักประวัติ/คัดกรอง' },
  { value: 'consultation', label: 'ห้องตรวจ' },
  { value: 'lab', label: 'ห้องปฏิบัติการ' },
  { value: 'pharmacy', label: 'ห้องยา' },
  { value: 'finance', label: 'การเงิน' },
  { value: 'other', label: 'อื่น ๆ' },
];

const SOURCE_MODULES = [
  { value: 'manual', label: 'ไม่เชื่อมต่อ (บันทึกเอง)' },
  { value: 'registration', label: 'เวชระเบียน' },
  { value: 'opd', label: 'ผู้ป่วยนอก (OPD)' },
  { value: 'lab', label: 'ชันสูตรโรค (Lab)' },
  { value: 'pharmacy', label: 'ห้องยา' },
  { value: 'finance', label: 'การเงิน' },
  { value: 'xray', label: 'เอกซเรย์' },
];

const QueueSettingsPage = () => {
  useQueueCenter();
  useQueueSettingsTick();
  const actor = getQueueActor();
  const canAdmin = actor.canAdmin;

  const [activeTab, setActiveTab] = useState('stations');
  const [toast, setToast] = useState('');
  const [banner, setBanner] = useState(null);

  const [stationDraft, setStationDraft] = useState(null);
  const [stationErrors, setStationErrors] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteBlocked, setDeleteBlocked] = useState(null);

  const [typeDraft, setTypeDraft] = useState(null);
  const [typeErrors, setTypeErrors] = useState({});
  const [typeDeleteTarget, setTypeDeleteTarget] = useState(null);

  const [previewStationId, setPreviewStationId] = useState(QUEUE_STATIONS[1]?.id || QUEUE_STATIONS[0]?.id || '');
  const [voiceTestMsg, setVoiceTestMsg] = useState('');

  /* ยืนยัน "ออกโดยไม่บันทึก" ใช้ร่วมกันทั้งฟอร์มจุดบริการ / ประเภทคิว / ออกจากแท็บ
     — เดิม popup ประเภทคิวปิดแล้วทิ้งข้อมูลเงียบ ๆ ต่างจากอีกสองที่บนหน้าเดียวกัน
     { subtitle, body, onConfirm } — null = ไม่มีอะไรค้าง                        */
  const [discardPrompt, setDiscardPrompt] = useState(null);

  /* snapshot ตอนเปิดฟอร์ม ใช้เทียบว่า "แก้จริงหรือแค่เปิดดู" */
  const [stationDraftInit, setStationDraftInit] = useState(null);
  const [typeDraftInit, setTypeDraftInit] = useState(null);

  const settings = getQueueSettings();
  const queueTypes = getQueueTypes();

  const guardAdmin = () => {
    if (canAdmin) return true;
    setBanner({
      type: 'warning',
      title: 'ต้องมีสิทธิผู้ดูแลระบบ',
      subtext: 'บทบาทปัจจุบันดูค่าตั้งได้อย่างเดียว — เปลี่ยนบทบาทที่มุมขวาบนเพื่อทดลองแก้ไข',
    });
    return false;
  };

  const auditOf = (section) => {
    const a = getSettingsAudit(section);
    return a
      ? { by: a.by, at: `${formatDateTh(a.at)} ${formatClock(a.at)} น.` }
      : { by: '—', at: 'ยังไม่เคยแก้ไข' };
  };

  const patch = (section, key) => (value) => {
    if (!guardAdmin()) return;
    setQueueSetting(section, key, value);
  };

  /* ═══════════════════════════════════ (1) ผังจุดบริการ — 1.3.7.1 */

  const openStationDraft = (station) => {
    if (!guardAdmin()) return;
    setStationErrors({});
    const draft = station ? { ...station } : { ...emptyStationDraft, id: `st-${Date.now()}` };
    setStationDraft(draft);
    setStationDraftInit(draft);
  };

  const closeStationDraft = () => { setStationDraft(null); setStationDraftInit(null); };

  const stationDirty = !!stationDraft
    && JSON.stringify(stationDraft) !== JSON.stringify(stationDraftInit);

  /* ปิดฟอร์มจุดบริการ — ถามก่อนถ้ามีการแก้ค้างไว้ */
  const requestCloseStationDraft = () => {
    if (!stationDirty) { closeStationDraft(); return; }
    setDiscardPrompt({
      subtitle: 'ยังมีฟอร์มจุดบริการที่แก้ค้างไว้',
      body: 'ข้อมูลจุดบริการที่กรอกค้างไว้จะหายไป',
      onConfirm: closeStationDraft,
    });
  };

  const saveStation = () => {
    const d = stationDraft;
    const e = {};
    if (!d.label.trim()) e.label = 'กรุณาระบุชื่อจุดบริการ';
    if (!d.prefix.trim()) e.prefix = 'กรุณาระบุ prefix รหัสคิว';
    else if (isPrefixTaken(d.prefix, d.id)) e.prefix = `prefix "${d.prefix.toUpperCase()}" ถูกใช้กับจุดบริการอื่นแล้ว`;
    if (!Number.isFinite(Number(d.order)) || Number(d.order) < 1) e.order = 'ลำดับแสดงผลต้องเป็นตัวเลขตั้งแต่ 1';
    setStationErrors(e);
    if (Object.keys(e).length > 0) return;
    const res = upsertStation({ ...d, prefix: d.prefix.toUpperCase(), order: Number(d.order) });
    /* store เป็นด่านสุดท้าย — ถ้ามันปฏิเสธ (เช่น prefix ชนกับที่เพิ่งแก้จากแท็บอื่น)
       ให้ค้าง popup ไว้พร้อมข้อความ ไม่ปิดทิ้งเงียบ ๆ */
    if (!res.ok) { setStationErrors({ prefix: res.reason }); return; }
    setToast(`บันทึกจุดบริการ ${d.label} แล้ว`);
    closeStationDraft();
  };

  /* prefix ที่แก้จากตาราง "prefix ต่อจุดบริการ" — validate ก่อนบันทึกเสมอ */
  const [prefixGridError, setPrefixGridError] = useState({});

  const commitStationPrefix = (station, nextPrefix) => {
    if (!guardAdmin()) return;
    if (nextPrefix === station.prefix) return;   /* กด tab ผ่านเฉย ๆ ไม่ต้องเด้ง toast */
    const res = upsertStation({ ...station, prefix: nextPrefix });
    if (res.ok) {
      setPrefixGridError((m) => ({ ...m, [station.id]: undefined }));
      setToast(`บันทึก prefix ของ ${station.label} เป็น ${nextPrefix} แล้ว`);
      return;
    }
    setPrefixGridError((m) => ({ ...m, [station.id]: res.reason }));
    setBanner({ type: 'destructive', title: 'บันทึก prefix ไม่สำเร็จ', subtext: res.reason });
  };

  const askDeleteStation = (station) => {
    if (!guardAdmin()) return;
    const pending = stationSummary(station.id).remaining;
    if (pending > 0) { setDeleteBlocked({ station, pending }); return; }
    setDeleteTarget(station);
  };

  const stationColumns = [
    { key: 'prefix', label: 'รหัส', render: (r) => (
      <ColorfulBadge style='teal' size='small' hierarchy='secondary'>{r.prefix}</ColorfulBadge>
    ) },
    { key: 'label', label: 'ชื่อจุดบริการ', flex: true, minWidth: 200 },
    { key: 'zone', label: 'โซน / ชั้น', render: (r) => `${r.zone} · ${r.floor}` },
    { key: 'sourceModule', label: 'ระบบต้นทาง', render: (r) => SOURCE_MODULES.find((m) => m.value === r.sourceModule)?.label || '—' },
    { key: 'displayId', label: 'จอแสดงคิวที่ผูก', render: (r) => QUEUE_DISPLAYS.find((d) => d.id === r.displayId)?.label || '—' },
    { key: 'order', label: 'ลำดับแสดงผล' },
    {
      key: 'active',
      label: 'เปิดรับคิว',
      render: (r) => (
        <Tooltip content={canAdmin ? (r.active ? 'ปิดรับคิวชั่วคราว' : 'เปิดรับคิว') : 'ต้องมีสิทธิผู้ดูแลระบบ'} position='top'>
          <span className='inline-flex'>
            <Switch
              checked={r.active}
              disabled={!canAdmin}
              aria-label={`เปิด-ปิดรับคิว ${r.label}`}
              onChange={(next) => {
                if (!guardAdmin()) return;
                const value = typeof next === 'boolean' ? next : !r.active;
                const res = setStationActive(r.id, value, value ? '' : 'ปิดรับคิวจากหน้าตั้งค่า');
                if (res.ok) setToast(`${r.label} — ${value ? 'เปิด' : 'ปิด'}รับคิวแล้ว`);
                else setBanner({ type: 'destructive', title: 'ทำรายการไม่สำเร็จ', subtext: res.message });
              }}
            />
          </span>
        </Tooltip>
      ),
    },
    {
      key: 'action',
      label: 'การดำเนินการ',
      sortable: false,
      render: (r) => (
        <div className='flex items-center' style={{ gap: 'var(--dim-space-150)' }}>
          <Tooltip content={canAdmin ? 'แก้ไขจุดบริการ' : 'ต้องมีสิทธิผู้ดูแลระบบ'} position='top'>
            <span className='inline-flex'>
              <NeutralSubdueIconButton
                icon='edit'
                size='sm'
                variant='outline'
                disabled={!canAdmin}
                aria-label={`แก้ไข ${r.label}`}
                onClick={() => openStationDraft(r)}
              />
            </span>
          </Tooltip>
          <Tooltip content={canAdmin ? 'ลบจุดบริการ' : 'ต้องมีสิทธิผู้ดูแลระบบ'} position='top'>
            <span className='inline-flex'>
              <DangerSubdueIconButton
                icon='delete'
                size='sm'
                variant='fill'
                disabled={!canAdmin}
                aria-label={`ลบ ${r.label}`}
                onClick={() => askDeleteStation(r)}
              />
            </span>
          </Tooltip>
        </div>
      ),
    },
  ];

  /* ═══════════════════════════════ (2) ประเภทคิว — 1.3.7.1 + 1.3.2.2 */

  const openTypeDraft = (type) => {
    if (!guardAdmin()) return;
    setTypeErrors({});
    const draft = type
      ? { ...type }
      : { key: '', label: '', color: 'teal', weight: queueTypes.length + 1, stationIds: 'all' };
    setTypeDraft(draft);
    setTypeDraftInit(draft);
  };

  const closeTypeDraft = () => { setTypeDraft(null); setTypeDraftInit(null); };

  const typeDirty = !!typeDraft && JSON.stringify(typeDraft) !== JSON.stringify(typeDraftInit);

  /* ปิดฟอร์มประเภทคิว — ใช้ยืนยันชุดเดียวกับฟอร์มจุดบริการ (เดิมทิ้งเงียบ ๆ) */
  const requestCloseTypeDraft = () => {
    if (!typeDirty) { closeTypeDraft(); return; }
    setDiscardPrompt({
      subtitle: 'ยังมีฟอร์มประเภทคิวที่แก้ค้างไว้',
      body: 'ชื่อ/รหัส/น้ำหนักลำดับ/สีป้าย ที่กรอกค้างไว้จะหายไป',
      onConfirm: closeTypeDraft,
    });
  };

  const saveType = () => {
    const d = typeDraft;
    const e = {};
    if (!d.label.trim()) e.label = 'กรุณาระบุชื่อประเภทคิว';
    if (!d.key.trim()) e.key = 'กรุณาระบุรหัสประเภท (ภาษาอังกฤษ ไม่เว้นวรรค)';
    else if (!/^[a-zA-Z0-9_-]+$/.test(d.key)) e.key = 'ใช้ได้เฉพาะ a-z 0-9 _ -';
    if (!Number.isFinite(Number(d.weight)) || Number(d.weight) < 1) e.weight = 'น้ำหนักลำดับต้องเป็นตัวเลขตั้งแต่ 1';
    setTypeErrors(e);
    if (Object.keys(e).length > 0) return;
    upsertQueueType({ ...d, weight: Number(d.weight) });
    setToast(`บันทึกประเภทคิว ${d.label} แล้ว`);
    closeTypeDraft();
  };

  const typeColumns = [
    { key: 'label', label: 'ชื่อประเภทคิว', flex: true, minWidth: 180, render: (r) => (
      <ColorfulBadge style={r.color} size='small' hierarchy='secondary'>{r.label}</ColorfulBadge>
    ) },
    { key: 'key', label: 'รหัสประเภท' },
    { key: 'weight', label: 'น้ำหนักลำดับ', render: (r) => `${r.weight} (ยิ่งน้อยยิ่งก่อน)` },
    {
      key: 'stationIds',
      label: 'ใช้กับจุดบริการ',
      flex: true,
      minWidth: 180,
      render: (r) => (r.stationIds === 'all'
        ? 'ทุกจุดบริการ'
        : r.stationIds.map((id) => getStation(id)?.label).filter(Boolean).join(' · ') || '—')},
    {
      key: 'action',
      label: 'การดำเนินการ',
      sortable: false,
      render: (r) => (
        <div className='flex items-center' style={{ gap: 'var(--dim-space-150)' }}>
          <NeutralSubdueIconButton
            icon='edit'
            size='sm'
            variant='outline'
            disabled={!canAdmin}
            aria-label={`แก้ไข ${r.label}`}
            onClick={() => openTypeDraft(r)}
          />
          <DangerSubdueIconButton
            icon='delete'
            size='sm'
            variant='fill'
            disabled={!canAdmin}
            aria-label={`ลบ ${r.label}`}
            onClick={() => { if (guardAdmin()) setTypeDeleteTarget(r); }}
          />
        </div>
      ),
    },
  ];

  /* ══════════════════════════════════════ (3) รูปแบบรหัสคิว — 1.3.2.1 */

  const digitsError = settings.codeFormat.digits < 1 ? 'จำนวนหลักต้องอย่างน้อย 1' : undefined;

  /* ══════════════════════════════════════ (4) เสียงเรียกคิว — 1.3.4.2 */

  const templateError = useMemo(() => {
    const t = settings.voice.template || '';
    if (!t.includes('{queue}')) return 'ต้องมี {queue} ในข้อความประกาศ';
    if (!t.includes('{station}')) return 'ต้องมี {station} ในข้อความประกาศ';
    return undefined;
  }, [settings.voice.template]);

  /** ต้องเกิดจาก user gesture — เบราว์เซอร์บล็อก autoplay */
  const testVoice = () => {
    const st = getStation(previewStationId) || QUEUE_STATIONS[0];
    const text = (settings.voice.template || '')
      .replace('{queue}', previewQueueCode(st.id))
      .replace('{station}', st.label)
      .replace('{zone}', st.zone)
      .replace('{floor}', st.floor);
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      setVoiceTestMsg(`เบราว์เซอร์นี้ไม่รองรับการอ่านออกเสียง — ข้อความที่จะประกาศคือ “${text}”`);
      return;
    }
    try {
      const utter = new window.SpeechSynthesisUtterance(text);
      utter.lang = settings.voice.language === 'en' ? 'en-US' : 'th-TH';
      utter.volume = Math.min(1, Math.max(0, settings.voice.volume / 100));
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utter);
      setVoiceTestMsg(`กำลังทดสอบ: “${text}”`);
    } catch (err) {
      setVoiceTestMsg(`เล่นเสียงไม่ได้ในเบราว์เซอร์นี้ — ข้อความที่จะประกาศคือ “${text}”`);
    }
  };

  /* ═══════════════════════════════════ (6) ข้อความบนบัตรคิว — 1.3.7.3 */

  const ticketTextFor = (stationId) => (
    settings.ticketText.perStation[stationId] ?? settings.ticketText.default
  );

  const ticketTextLength = ticketTextFor(previewStationId).length;
  const ticketTooLong = ticketTextLength > settings.ticketText.maxChars;

  const previewTicketQueue = previewStationId ? {
    id: 'preview-ticket',
    code: previewQueueCode(previewStationId),
    stationId: previewStationId,
    patient: { hn: '67-00001', name: 'สมชาย มีสุข', fullName: 'นายสมชาย มีสุข' },
    queueType: 'general',
    issuedAt: new Date().toISOString(),
    printCount: 0,
  } : null;

  useEffect(() => {
    if (!QUEUE_STATIONS.some((s) => s.id === previewStationId)) {
      setPreviewStationId(QUEUE_STATIONS[0]?.id || '');
    }
  }, [previewStationId]);

  /* ═════════════════════════════════════════════════════════ render */

  const tabs = [
    { key: 'stations', label: 'ผังจุดบริการ', icon: 'apartment' },
    { key: 'types', label: 'ประเภทคิว', icon: 'category' },
    { key: 'code', label: 'รูปแบบรหัสคิว', icon: 'tag' },
    { key: 'voice', label: 'เสียงเรียกคิว', icon: 'volume_up' },
    { key: 'alert', label: 'การเตือนเวลารอ', icon: 'running_with_errors' },
    { key: 'ticket', label: 'ข้อความบนบัตรคิว', icon: 'receipt_long' },
  ];

  const summaryCards = [
    { key: 'stations', label: 'จุดบริการทั้งหมด', value: QUEUE_STATIONS.length, indicator: `เปิดรับคิว ${QUEUE_STATIONS.filter((s) => s.active).length}`, color: 'info', icon: 'apartment' },
    { key: 'types', label: 'ประเภทคิว', value: queueTypes.length, indicator: 'ใช้ทุกจุดบริการ', color: 'brand', icon: 'category' },
    { key: 'displays', label: 'จอแสดงคิวที่ผูก', value: QUEUE_DISPLAYS.length, indicator: 'โมดูลจอแสดงคิว', color: 'positive', icon: 'tv' },
    { key: 'voice', label: 'เสียงเรียกคิว', value: settings.voice.enabled ? 'เปิด' : 'ปิด', indicator: `ประกาศ ${settings.voice.repeat} ครั้ง`, color: 'inprogress', icon: 'volume_up' },
  ];

  return (
    <>
      <QueuePageShell
        activeKey='queue-center'
        sidebarItems={SYSTEM_NAV}
        sidebarFallbackKey='system-overview'
        breadcrumb={breadcrumb}
        title='ตั้งค่าระบบคิว'
        actions={<RoleSwitcher />}
        summaryTitle='ผังจุดบริการ · รหัสคิว · เสียงเรียก · เกณฑ์เวลารอ'
        summaryCards={summaryCards}
        belowSummary={<QueueCenterSubNav />}
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={(k) => {
          if (stationDirty || typeDirty) {
            setDiscardPrompt({
              subtitle: stationDirty ? 'ยังมีฟอร์มจุดบริการที่แก้ค้างไว้' : 'ยังมีฟอร์มประเภทคิวที่แก้ค้างไว้',
              body: 'ข้อมูลที่กรอกค้างไว้จะหายไป',
              onConfirm: () => { closeStationDraft(); closeTypeDraft(); setActiveTab(k); },
            });
            return;
          }
          setActiveTab(k);
        }}
      >
        <div className='flex flex-col flex-1 min-w-0' style={PAGE_BODY_STYLE}>
          {!canAdmin ? (
            <ReadOnlyBanner message='หน้าตั้งค่าระบบคิวต้องมีสิทธิผู้ดูแลระบบจึงจะแก้ไขได้ — ตอนนี้ดูค่าตั้งทั้งหมดได้ แต่บันทึกไม่ได้' />
          ) : null}

          {banner ? (
            <Alert type={banner.type} title={banner.title} subtext={banner.subtext} onClose={() => setBanner(null)} />
          ) : null}

          {/* ─────────────────────────── (1) ผังจุดบริการ */}
          {activeTab === 'stations' ? (
            <SectionCard
              icon='apartment'
              title='ผังจุดบริการ'
              subtitle='รหัส · ชื่อ · โซน/ชั้น · ระบบต้นทาง · จอแสดงคิวที่ผูก · ลำดับแสดงผล · เปิด/ปิดรับคิว'
              action={(
                <BrandDashedAddButton disabled={!canAdmin} onClick={() => openStationDraft(null)}>
                  เพิ่มจุดบริการ
                </BrandDashedAddButton>
              )}
            >
              {QUEUE_STATIONS.length === 0 ? (
                <EmptyState
                  icon='apartment'
                  title='ยังไม่มีจุดบริการ'
                  description='เพิ่มจุดบริการอย่างน้อย 1 จุด ระบบจึงจะออกคิวและเรียกคิวได้'
                  action={(
                    <BrandPrimaryButton leadingIcon='add' disabled={!canAdmin} onClick={() => openStationDraft(null)}>
                      เพิ่มจุดบริการ
                    </BrandPrimaryButton>
                  )}
                />
              ) : (
                <Table
                  columns={stationColumns}
                  rows={QUEUE_STATIONS}
                  rowKey={(r) => r.id}
                  emptyMessage='ยังไม่มีจุดบริการ'
                />
              )}
              <ConsentAuditBar recordedBy={auditOf('stations').by} recordedAt={auditOf('stations').at} />
            </SectionCard>
          ) : null}

          {/* ─────────────────────────── (2) ประเภทคิว */}
          {activeTab === 'types' ? (
            <SectionCard
              icon='category'
              title='ประเภทคิว'
              subtitle='สีป้ายและน้ำหนักลำดับมีผลกับการจัดคิวจริง — น้ำหนักน้อยกว่าถูกเรียกก่อน'
              action={(
                <BrandDashedAddButton disabled={!canAdmin} onClick={() => openTypeDraft(null)}>
                  เพิ่มประเภทคิว
                </BrandDashedAddButton>
              )}
            >
              <Table columns={typeColumns} rows={queueTypes} rowKey={(r) => r.key} emptyMessage='ยังไม่มีประเภทคิว' />
              <ConsentAuditBar recordedBy={auditOf('queueTypes').by} recordedAt={auditOf('queueTypes').at} />
            </SectionCard>
          ) : null}

          {/* ─────────────────────────── (3) รูปแบบรหัสคิว */}
          {activeTab === 'code' ? (
            <div className='w-full flex flex-col' style={{ gap: 'var(--dim-space-600)' }}>
              <SectionCard icon='tag' title='รูปแบบรหัสคิว' subtitle='prefix ต่อจุดบริการ · จำนวนหลัก · การเริ่มนับใหม่'>
                <div className='w-full grid grid-cols-1 md:grid-cols-3' style={{ gap: 'var(--dim-space-400)' }}>
                  <DraftInputField
                    label='จำนวนหลัก'
                    type='number'
                    value={settings.codeFormat.digits}
                    disabled={!canAdmin}
                    showLeadingIcon={false}
                    error={digitsError}
                    helperText='เช่น 3 → A-042'
                    parse={toNumberDraft}
                    onCommit={patch('codeFormat', 'digits')}
                  />
                  <InputField
                    label='ตัวคั่น'
                    value={settings.codeFormat.separator}
                    disabled={!canAdmin}
                    showLeadingIcon={false}
                    helperText='ปล่อยว่างได้ → A042'
                    onChange={(val) => patch('codeFormat', 'separator')(val)}
                  />
                  <div className='flex flex-col' style={{ gap: 'var(--dim-space-150)' }}>
                    <FieldLabel>เริ่มนับใหม่</FieldLabel>
                    <Dropdown
                      value={settings.codeFormat.resetCycle}
                      onChange={patch('codeFormat', 'resetCycle')}
                      options={RESET_CYCLES}
                      state={canAdmin ? 'default' : 'disabled'}
                    />
                    <HelperText>ค่าเตรียมไว้สำหรับงานตัดรอบประจำวัน — ข้อมูลจำลองในระบบนี้เป็นของวันเดียว จึงยังไม่เห็นผลบนหน้าจอ</HelperText>
                  </div>
                </div>

                {/* มติ คทง.1 ครั้งที่ 3 — คิวเดียวตลอดการรับบริการ (Single Queue)
                    เปิดไว้เป็นค่าเริ่มต้น; เปิด/ปิดได้เผื่อศูนย์ที่ยังใช้ระบบเดิม */}
                <div
                  className='w-full flex items-start flex-wrap'
                  style={{
                    gap: 'var(--dim-space-300)',
                    paddingTop: 'var(--dim-space-300)',
                    paddingBottom: 'var(--dim-space-300)',
                    paddingLeft: 'var(--dim-space-400)',
                    paddingRight: 'var(--dim-space-400)',
                    borderRadius: 'var(--dim-radius-200, 8px)',
                    background: 'var(--surface-brandPrimary-quaternary, #F4FBF8)',
                  }}
                >
                  <Switch
                    checked={settings.codeFormat.singleQueuePerVisit}
                    disabled={!canAdmin}
                    aria-label='คิวเดียวตลอดการรับบริการ'
                    onChange={(next) => {
                      if (!guardAdmin()) return;
                      const value = typeof next === 'boolean' ? next : !settings.codeFormat.singleQueuePerVisit;
                      patch('codeFormat', 'singleQueuePerVisit')(value);
                      setToast(value
                        ? 'เปิดคิวเดียวตลอดการรับบริการแล้ว — ผู้รับบริการถือเลขคิวใบเดียวทุกจุด'
                        : 'ปิดคิวเดียวตลอดการรับบริการ — แต่ละจุดจะออกเลขคิวของตัวเอง');
                    }}
                  />
                  <div className='flex flex-col flex-1 min-w-0' style={{ gap: 'var(--dim-space-050)' }}>
                    <FieldLabel>คิวเดียวตลอดการรับบริการ (Single Queue ต่อ 1 Visit)</FieldLabel>
                    <HelperText>
                      ผู้รับบริการถือเลขคิวใบเดียวตั้งแต่คัดกรอง → ห้องตรวจ → ห้องยา → การเงิน
                      ไม่ต้องรับบัตรคิวใหม่ทุกจุด และโอนคิวข้ามจุดแล้วเลขไม่เปลี่ยน ·
                      ลำดับ &quot;เรียก&quot; ยังเป็นของแต่ละจุด จอแสดงคิวจึงต้องมีข้อความกำกับว่า
                      ลำดับเรียกอาจไม่เรียงตามเลขคิว (มติ คทง.1)
                    </HelperText>
                  </div>
                </div>

                <div className='w-full flex items-center flex-wrap' style={{ gap: 'var(--dim-space-300)' }}>
                  <FieldLabel>พรีวิวสด</FieldLabel>
                  {QUEUE_STATIONS.slice(0, 8).map((s) => (
                    <ColorfulBadge key={s.id} style='teal' size='default' hierarchy='secondary'>
                      {`${s.label}: ${previewQueueCode(s.id)}`}
                    </ColorfulBadge>
                  ))}
                </div>
                <ConsentAuditBar recordedBy={auditOf('codeFormat').by} recordedAt={auditOf('codeFormat').at} />
              </SectionCard>

              {/* prefix แก้ในตารางนี้ต้องผ่าน validation ชุดเดียวกับ Popup จุดบริการ:
                  เดิมเขียนทะลุ upsertStation ทุก keystroke (isPrefixTaken เป็นแค่
                  ข้อความแดง) → prefix ซ้ำถูกบันทึกจริง สองจุดบริการออกรหัสคิว
                  เดียวกัน และล้างช่องทิ้งได้ทำให้ prefix เป็น '' แล้วรหัสขึ้น '?'
                  ตอนนี้พิมพ์ลง draft ก่อน แล้ว commit ตอน blur ถ้า store ปฏิเสธ
                  ก็เด้ง banner + คืนค่าเดิม                                    */}
              <SectionCard icon='label' title='prefix ต่อจุดบริการ' subtitle='prefix ห้ามซ้ำกัน — ระบบจะไม่บันทึกค่าที่ซ้ำหรือว่าง'>
                <div className='w-full grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3' style={{ gap: 'var(--dim-space-400)' }}>
                  {QUEUE_STATIONS.map((s) => (
                    <DraftInputField
                      key={s.id}
                      label={s.label}
                      value={s.prefix}
                      disabled={!canAdmin}
                      showLeadingIcon={false}
                      helperText={`ตัวอย่าง ${previewQueueCode(s.id)}`}
                      error={prefixGridError[s.id]}
                      parse={(raw) => String(raw || '').toUpperCase().slice(0, 2)}
                      onCommit={(next) => commitStationPrefix(s, next)}
                    />
                  ))}
                </div>
              </SectionCard>
            </div>
          ) : null}

          {/* ─────────────────────────── (4) เสียงเรียกคิว */}
          {activeTab === 'voice' ? (
            <SectionCard
              icon='volume_up'
              title='เสียงเรียกคิว'
              subtitle='ค่าเหล่านี้จอแสดงคิวอ่านไปเล่นจริง — หน้านี้เก็บค่าและทดสอบเท่านั้น'
            >
              <Alert
                type='info'
                title='การเล่นเสียงจริงอยู่ที่โมดูลจอแสดงคิว'
                subtext='เบราว์เซอร์บล็อก autoplay และโปรเจกต์ยังไม่มีไฟล์เสียง — ปุ่มทดสอบใช้เสียงสังเคราะห์ของเบราว์เซอร์และต้องกดเองทุกครั้ง'
              />

              <div className='w-full flex items-start justify-between flex-wrap' style={{ gap: 'var(--dim-space-400)' }}>
                <div className='flex-1 min-w-0 flex flex-col' style={{ gap: 'var(--dim-space-100)' }}>
                  <FieldLabel>เปิดเสียงเรียกคิว</FieldLabel>
                  <HelperText>ปิดแล้วจอแสดงคิวจะขึ้นตัวเลขอย่างเดียว ไม่ประกาศเสียง</HelperText>
                </div>
                <Switch
                  checked={settings.voice.enabled}
                  disabled={!canAdmin}
                  aria-label='เปิดเสียงเรียกคิว'
                  onChange={(next) => patch('voice', 'enabled')(typeof next === 'boolean' ? next : !settings.voice.enabled)}
                />
              </div>

              <div className='w-full grid grid-cols-1 md:grid-cols-2' style={{ gap: 'var(--dim-space-400)' }}>
                <div className='flex flex-col' style={{ gap: 'var(--dim-space-150)' }}>
                  <FieldLabel>ภาษา</FieldLabel>
                  <Dropdown
                    value={settings.voice.language}
                    onChange={patch('voice', 'language')}
                    options={LANGUAGES}
                    state={canAdmin ? 'default' : 'disabled'}
                  />
                </div>
                <div className='flex flex-col' style={{ gap: 'var(--dim-space-150)' }}>
                  <FieldLabel>เสียงกริ่งนำ</FieldLabel>
                  <Dropdown
                    value={settings.voice.chime}
                    onChange={patch('voice', 'chime')}
                    options={CHIMES}
                    state={canAdmin ? 'default' : 'disabled'}
                  />
                  <HelperText>ค่าเตรียมไว้สำหรับโมดูลจอแสดงคิว — ปุ่มทดสอบด้านล่างใช้เสียงสังเคราะห์ ไม่มีกริ่งนำ</HelperText>
                </div>
                <DraftInputField
                  label='จำนวนครั้งที่ประกาศ'
                  type='number'
                  value={settings.voice.repeat}
                  disabled={!canAdmin}
                  showLeadingIcon={false}
                  error={!(Number(settings.voice.repeat) >= 1) ? 'ต้องประกาศอย่างน้อย 1 ครั้ง' : undefined}
                  helperText='จอแสดงคิวอ่านค่านี้ไปประกาศซ้ำ'
                  parse={toNumberDraft}
                  onCommit={patch('voice', 'repeat')}
                />
                <DraftInputField
                  label='ระดับเสียง (0–100)'
                  type='number'
                  value={settings.voice.volume}
                  disabled={!canAdmin}
                  showLeadingIcon={false}
                  error={!(Number(settings.voice.volume) >= 0 && Number(settings.voice.volume) <= 100) ? 'ต้องอยู่ระหว่าง 0–100' : undefined}
                  helperText='จอแสดงคิวอ่านค่านี้ไปตั้งระดับเสียง'
                  parse={toNumberDraft}
                  onCommit={patch('voice', 'volume')}
                />
              </div>

              <InputField
                label='ข้อความประกาศ'
                value={settings.voice.template}
                disabled={!canAdmin}
                showLeadingIcon={false}
                error={templateError}
                helperText='ตัวแปรที่ใช้ได้: {queue} {station} {zone} {floor} — ต้องมี {queue} และ {station}'
                onChange={(val) => patch('voice', 'template')(val)}
              />

              <div className='w-full flex items-center flex-wrap' style={{ gap: 'var(--dim-space-300)' }}>
                <Dropdown
                  value={previewStationId}
                  onChange={setPreviewStationId}
                  options={QUEUE_STATIONS.map((s) => ({ value: s.id, label: s.label }))}
                  size='sm'
                  className='w-64'
                />
                <NeutralSubdueButton
                  variant='outline'
                  size='md'
                  leadingIcon='play_arrow'
                  disabled={!!templateError}
                  onClick={testVoice}
                >
                  ทดสอบเสียง
                </NeutralSubdueButton>
                {voiceTestMsg ? <HelperText>{voiceTestMsg}</HelperText> : null}
              </div>

              <ConsentAuditBar recordedBy={auditOf('voice').by} recordedAt={auditOf('voice').at} />
            </SectionCard>
          ) : null}

          {/* ─────────────────────────── (5) การเตือนเวลารอ */}
          {activeTab === 'alert' ? (
            <SectionCard
              icon='running_with_errors'
              title='การเตือนเวลารอ'
              subtitle='เกินเกณฑ์แล้วเวลารอในตารางเปลี่ยนเป็นสีเตือน ชิปจุดบริการขึ้นจุดแดง และขึ้นแถบเตือนบนหน้าจัดการคิว'
            >
              <div className='w-full flex items-start justify-between flex-wrap' style={{ gap: 'var(--dim-space-400)' }}>
                <div className='flex-1 min-w-0 flex flex-col' style={{ gap: 'var(--dim-space-100)' }}>
                  <FieldLabel>เปิดการเตือนเวลารอ</FieldLabel>
                  <HelperText>ปิดแล้วระบบจะไม่ไฮไลต์คิวที่รอนานและไม่นับ “รอเกินเกณฑ์” บนการ์ดสรุป</HelperText>
                </div>
                <Switch
                  checked={settings.waitAlert.enabled}
                  disabled={!canAdmin}
                  aria-label='เปิดการเตือนเวลารอ'
                  onChange={(next) => patch('waitAlert', 'enabled')(typeof next === 'boolean' ? next : !settings.waitAlert.enabled)}
                />
              </div>

              <div className='w-full grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4' style={{ gap: 'var(--dim-space-400)' }}>
                {queueTypes.map((t) => {
                  const value = settings.waitAlert.thresholds[t.key];
                  const invalid = !Number.isFinite(Number(value)) || Number(value) <= 0;
                  return (
                    <DraftInputField
                      key={t.key}
                      label={`เกณฑ์ ${t.label} (นาที)`}
                      type='number'
                      value={value ?? ''}
                      disabled={!canAdmin}
                      showLeadingIcon={false}
                      error={invalid ? 'ต้องเป็นตัวเลขมากกว่า 0' : undefined}
                      parse={toNumberDraft}
                      onCommit={(next) => {
                        if (!guardAdmin()) return;
                        setQueueSetting('waitAlert', 'thresholds', {
                          ...settings.waitAlert.thresholds,
                          [t.key]: next,
                        });
                      }}
                    />
                  );
                })}
              </div>

              <div className='w-full grid grid-cols-1 md:grid-cols-2' style={{ gap: 'var(--dim-space-400)' }}>
                <div className='flex flex-col' style={{ gap: 'var(--dim-space-150)' }}>
                  <FieldLabel>ระดับการเตือน</FieldLabel>
                  <Dropdown
                    value={settings.waitAlert.level}
                    onChange={patch('waitAlert', 'level')}
                    options={ALERT_LEVELS}
                    state={canAdmin ? 'default' : 'disabled'}
                  />
                  <HelperText>กำหนดโทนของแถบเตือนบนหน้า “จัดการคิวและเรียกคิว”</HelperText>
                </div>
                <div className='flex flex-col' style={{ gap: 'var(--dim-space-150)' }}>
                  <FieldLabel>ช่องทางแจ้งเตือน</FieldLabel>
                  <HelperText>ปิด “ไฮไลต์บนตารางคิว” แล้วเวลารอจะไม่ขึ้นสีเตือน · “ขึ้นจุดแดงบนจอแสดงคิว” เป็นค่าเตรียมไว้ให้โมดูลจอแสดงคิว</HelperText>
                  <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-150)' }}>
                    {ALERT_CHANNELS.map((c) => {
                      const on = settings.waitAlert.channels.includes(c.key);
                      return (
                        <SelectableTag
                          key={c.key}
                          label={c.label}
                          selected={on}
                          onClick={!canAdmin ? undefined : () => {
                            const next = on
                              ? settings.waitAlert.channels.filter((k) => k !== c.key)
                              : [...settings.waitAlert.channels, c.key];
                            setQueueSetting('waitAlert', 'channels', next);
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>

              <ConsentAuditBar recordedBy={auditOf('waitAlert').by} recordedAt={auditOf('waitAlert').at} />
            </SectionCard>
          ) : null}

          {/* ─────────────────────────── (6) ข้อความบนบัตรคิว */}
          {activeTab === 'ticket' ? (
            <div className='w-full flex items-start flex-wrap lg:flex-nowrap' style={{ gap: 'var(--dim-space-600)' }}>
              <div className='flex-1 min-w-0 flex flex-col' style={{ gap: 'var(--dim-space-600)' }}>
                <SectionCard
                  icon='receipt_long'
                  title='ข้อความขั้นตอนการรับบริการบนบัตรคิว'
                  subtitle='ตั้งค่าเริ่มต้นของหน่วยบริการ และเขียนทับเฉพาะบางจุดบริการได้'
                  action={(
                    <Dropdown
                      value={previewStationId}
                      onChange={setPreviewStationId}
                      options={QUEUE_STATIONS.map((s) => ({ value: s.id, label: s.label }))}
                      size='sm'
                      className='w-64'
                    />
                  )}
                >
                  <SuggestibleTextarea
                    voice
                    label='ข้อความเริ่มต้น (ใช้กับทุกจุดบริการที่ไม่ได้ตั้งค่าเฉพาะ)'
                    value={settings.ticketText.default}
                    onChange={(val) => patch('ticketText', 'default')(val)}
                    suggestions={TICKET_TEXT_SUGGESTIONS}
                    minChars={2}
                    disabled={!canAdmin}
                    placeholder='เช่น กรุณานั่งรอบริเวณหน้าจุดบริการ และเตรียมบัตรประชาชนให้เจ้าหน้าที่'
                  />

                  <SuggestibleTextarea
                    voice
                    label={`ข้อความเฉพาะจุดบริการ: ${getStation(previewStationId)?.label || '—'}`}
                    value={settings.ticketText.perStation[previewStationId] || ''}
                    onChange={(val) => {
                      if (!guardAdmin()) return;
                      const next = { ...settings.ticketText.perStation };
                      if (String(val).trim()) next[previewStationId] = val;
                      else delete next[previewStationId];
                      setQueueSetting('ticketText', 'perStation', next);
                    }}
                    suggestions={TICKET_TEXT_SUGGESTIONS}
                    minChars={2}
                    disabled={!canAdmin}
                    placeholder='ปล่อยว่างไว้เพื่อใช้ข้อความเริ่มต้น'
                  />

                  <div className='w-full flex items-center flex-wrap' style={{ gap: 'var(--dim-space-300)' }}>
                    <StatusBadge style={ticketTooLong ? 'error' : 'success'} size='small'>
                      {`${ticketTextLength} / ${settings.ticketText.maxChars} ตัวอักษร`}
                    </StatusBadge>
                    {ticketTooLong ? (
                      <HelperText tone='error'>
                        ข้อความยาวเกินความสูงบัตรคิว — ตัดให้สั้นลง มิฉะนั้นบรรทัดท้ายจะหลุดขอบกระดาษ
                      </HelperText>
                    ) : (
                      <HelperText>ความยาวพอดีกับบัตรคิวขนาดมาตรฐาน</HelperText>
                    )}
                  </div>

                  <DraftInputField
                    label='ความยาวสูงสุดที่ยอมให้พิมพ์ (ตัวอักษร)'
                    type='number'
                    value={settings.ticketText.maxChars}
                    disabled={!canAdmin}
                    showLeadingIcon={false}
                    error={!(Number(settings.ticketText.maxChars) >= 20) ? 'ต้องอย่างน้อย 20 ตัวอักษร' : undefined}
                    parse={toNumberDraft}
                    onCommit={patch('ticketText', 'maxChars')}
                  />

                  <ConsentAuditBar recordedBy={auditOf('ticketText').by} recordedAt={auditOf('ticketText').at} />
                </SectionCard>
              </div>

              <aside
                className='w-full lg:w-auto shrink-0 flex flex-col'
                style={{ gap: 'var(--dim-space-300)', minWidth: 'var(--dim-size-2700, 448px)' }}
              >
                <SectionCard icon='preview' title='พรีวิวบัตรคิวสด' subtitle='อัปเดตทันทีเมื่อแก้ข้อความด้านซ้าย'>
                  {previewTicketQueue ? (
                    <QueueTicket
                      queue={previewTicketQueue}
                      waitingAhead={stationSummary(previewStationId).waiting}
                      ticketText={ticketTextFor(previewStationId)}
                      compact
                    />
                  ) : (
                    <EmptyState icon='receipt_long' title='ยังไม่มีจุดบริการให้พรีวิว' />
                  )}
                </SectionCard>
              </aside>
            </div>
          ) : null}
        </div>
      </QueuePageShell>

      {/* ───────────────────────── Popup แก้ไข/เพิ่มจุดบริการ */}
      <Popup
        open={!!stationDraft}
        onClose={requestCloseStationDraft}
        title={stationDraft && QUEUE_STATIONS.some((s) => s.id === stationDraft.id) ? 'แก้ไขจุดบริการ' : 'เพิ่มจุดบริการ'}
        subtitle='รหัสคิวจะถูกสร้างจาก prefix ของจุดบริการนี้'
        size='large'
        tertiaryAction={{ label: 'ยกเลิก', onClick: requestCloseStationDraft }}
        primaryAction={{ label: 'บันทึก', onClick: saveStation }}
      >
        {stationDraft ? (
          <div className='w-full grid grid-cols-1 md:grid-cols-2' style={{ gap: 'var(--dim-space-400)' }}>
            <InputField
              label='ชื่อจุดบริการ'
              required
              value={stationDraft.label}
              showLeadingIcon={false}
              error={stationErrors.label}
              onChange={(val) => setStationDraft((d) => ({ ...d, label: val }))}
            />
            <InputField
              label='prefix รหัสคิว'
              required
              value={stationDraft.prefix}
              showLeadingIcon={false}
              error={stationErrors.prefix}
              helperText={stationDraft.prefix ? `ตัวอย่าง ${stationDraft.prefix.toUpperCase()}${getQueueSettings().codeFormat.separator}001` : 'เช่น A, B, P'}
              onChange={(val) => setStationDraft((d) => ({ ...d, prefix: String(val).toUpperCase().slice(0, 2) }))}
            />
            <InputField
              label='โซน'
              value={stationDraft.zone}
              showLeadingIcon={false}
              placeholder='เช่น โซน A'
              onChange={(val) => setStationDraft((d) => ({ ...d, zone: val }))}
            />
            <InputField
              label='ชั้น'
              value={stationDraft.floor}
              showLeadingIcon={false}
              placeholder='เช่น ชั้น 1'
              onChange={(val) => setStationDraft((d) => ({ ...d, floor: val }))}
            />
            <div className='flex flex-col' style={{ gap: 'var(--dim-space-150)' }}>
              <FieldLabel>ประเภทบริการ</FieldLabel>
              <Dropdown
                value={stationDraft.serviceType}
                onChange={(v) => setStationDraft((d) => ({ ...d, serviceType: v }))}
                options={SERVICE_TYPES}
              />
            </div>
            <div className='flex flex-col' style={{ gap: 'var(--dim-space-150)' }}>
              <FieldLabel>ระบบต้นทาง</FieldLabel>
              <Dropdown
                value={stationDraft.sourceModule}
                onChange={(v) => setStationDraft((d) => ({ ...d, sourceModule: v }))}
                options={SOURCE_MODULES}
              />
            </div>
            <InputField
              label='เส้นทางระบบต้นทาง'
              value={stationDraft.sourcePath}
              showLeadingIcon={false}
              placeholder='เช่น /opd/queue'
              onChange={(val) => setStationDraft((d) => ({ ...d, sourcePath: val }))}
            />
            <div className='flex flex-col' style={{ gap: 'var(--dim-space-150)' }}>
              <FieldLabel>จอแสดงคิวที่ผูก</FieldLabel>
              <Dropdown
                value={stationDraft.displayId}
                onChange={(v) => setStationDraft((d) => ({ ...d, displayId: v }))}
                options={QUEUE_DISPLAYS.map((d) => ({ value: d.id, label: d.label }))}
              />
            </div>
            <InputField
              label='ลำดับแสดงผล'
              type='number'
              value={String(stationDraft.order)}
              showLeadingIcon={false}
              error={stationErrors.order}
              onChange={(val) => setStationDraft((d) => ({ ...d, order: val }))}
            />
            <div className='flex items-center justify-between' style={{ gap: 'var(--dim-space-300)' }}>
              <FieldLabel>เปิดรับคิว</FieldLabel>
              <Switch
                checked={stationDraft.active}
                aria-label='เปิดรับคิว'
                onChange={(next) => setStationDraft((d) => ({ ...d, active: typeof next === 'boolean' ? next : !d.active }))}
              />
            </div>
          </div>
        ) : null}
      </Popup>

      {/* ───────────────────────── Popup แก้ไข/เพิ่มประเภทคิว */}
      <Popup
        open={!!typeDraft}
        onClose={requestCloseTypeDraft}
        title={typeDraft && queueTypes.some((t) => t.key === typeDraft.key) ? 'แก้ไขประเภทคิว' : 'เพิ่มประเภทคิว'}
        size='default'
        tertiaryAction={{ label: 'ยกเลิก', onClick: requestCloseTypeDraft }}
        primaryAction={{ label: 'บันทึก', onClick: saveType }}
      >
        {typeDraft ? (
          <div className='w-full flex flex-col' style={{ gap: 'var(--dim-space-400)' }}>
            <InputField
              label='ชื่อประเภทคิว'
              required
              value={typeDraft.label}
              showLeadingIcon={false}
              error={typeErrors.label}
              onChange={(val) => setTypeDraft((d) => ({ ...d, label: val }))}
            />
            <InputField
              label='รหัสประเภท (a-z 0-9 _ -)'
              required
              value={typeDraft.key}
              showLeadingIcon={false}
              error={typeErrors.key}
              onChange={(val) => setTypeDraft((d) => ({ ...d, key: val }))}
            />
            <InputField
              label='น้ำหนักลำดับ (ยิ่งน้อยยิ่งถูกเรียกก่อน)'
              type='number'
              value={String(typeDraft.weight)}
              showLeadingIcon={false}
              error={typeErrors.weight}
              onChange={(val) => setTypeDraft((d) => ({ ...d, weight: val }))}
            />
            <div className='flex flex-col' style={{ gap: 'var(--dim-space-150)' }}>
              <FieldLabel>สีป้าย</FieldLabel>
              <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-150)' }}>
                {BADGE_COLORS.map((c) => (
                  <button
                    key={c}
                    type='button'
                    aria-label={`เลือกสี ${c}`}
                    onClick={() => setTypeDraft((d) => ({ ...d, color: c }))}
                    style={{
                      borderRadius: 'var(--dim-radius-full, 9999px)',
                      border: `var(--dim-stroke-200, 2px) solid ${typeDraft.color === c ? 'var(--border-brandPrimary-tertiary)' : 'transparent'}`,
                      paddingTop: 'var(--dim-space-050)',
                      paddingRight: 'var(--dim-space-050)',
                      paddingBottom: 'var(--dim-space-050)',
                      paddingLeft: 'var(--dim-space-050)',
                    }}
                  >
                    <ColorfulBadge style={c} size='small' hierarchy='secondary'>
                      {typeDraft.label || 'ตัวอย่าง'}
                    </ColorfulBadge>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </Popup>

      {/* ───────────────────────── ยืนยันลบจุดบริการ */}
      <Popup
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title='ลบจุดบริการ ?'
        subtitle={deleteTarget ? `${deleteTarget.label} · ${deleteTarget.prefix}` : ''}
        size='default'
        tertiaryAction={{ label: 'ยกเลิก', onClick: () => setDeleteTarget(null) }}
        primaryAction={{
          label: 'ลบจุดบริการ',
          tone: 'danger',
          onClick: () => {
            const res = removeStation(deleteTarget.id);
            if (res.ok) setToast(`ลบจุดบริการ ${deleteTarget.label} แล้ว`);
            else setBanner({ type: 'destructive', title: 'ลบไม่ได้', subtext: `ยังมีคิวค้าง ${res.pending} รายการ` });
            setDeleteTarget(null);
          },
        }}
      >
        <span
          style={{
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-sm, 14px)',
            color: 'var(--text-content-secondary)',
          }}
        >
          คิวเก่าที่เคยออกจากจุดบริการนี้จะยังอยู่ในประวัติ แต่จะไม่สามารถออกคิวใหม่ได้อีก
        </span>
      </Popup>

      {/* ───────────────────────── ลบไม่ได้ — ยังมีคิวค้าง */}
      <Popup
        open={!!deleteBlocked}
        onClose={() => setDeleteBlocked(null)}
        title='ลบจุดบริการนี้ไม่ได้'
        subtitle={deleteBlocked ? `${deleteBlocked.station.label} · ยังมีคิวค้าง ${deleteBlocked.pending} รายการ` : ''}
        size='default'
        tertiaryAction={{ label: 'ปิด', onClick: () => setDeleteBlocked(null) }}
      >
        <div className='flex items-start w-full' style={{ gap: 'var(--dim-space-300)' }}>
          <Icon name='block' size={20} style={{ color: 'var(--text-danger-default)' }} />
          <span
            style={{
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-sm, 14px)',
              color: 'var(--text-content-secondary)',
            }}
          >
            ปิดรับคิวก่อน แล้วโอนคิวค้างไปจุดบริการอื่นจากหน้า “จัดการคิวและเรียกคิว” จึงจะลบได้
          </span>
        </div>
      </Popup>

      {/* ───────────────────────── ลบประเภทคิว */}
      <Popup
        open={!!typeDeleteTarget}
        onClose={() => setTypeDeleteTarget(null)}
        title='ลบประเภทคิว ?'
        subtitle={typeDeleteTarget?.label}
        size='default'
        tertiaryAction={{ label: 'ยกเลิก', onClick: () => setTypeDeleteTarget(null) }}
        primaryAction={{
          label: 'ลบประเภทคิว',
          tone: 'danger',
          onClick: () => {
            const res = removeQueueType(typeDeleteTarget.key);
            if (res.ok) setToast(`ลบประเภทคิว ${typeDeleteTarget.label} แล้ว`);
            else setBanner({ type: 'destructive', title: 'ลบไม่ได้', subtext: res.reason });
            setTypeDeleteTarget(null);
          },
        }}
      >
        <span
          style={{
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-sm, 14px)',
            color: 'var(--text-content-secondary)',
          }}
        >
          ลบได้เฉพาะประเภทที่ไม่มีคิวใช้งานอยู่ — คิวที่ปิดแล้วยังคงแสดงชื่อประเภทเดิมในประวัติ
        </span>
      </Popup>

      {/* ───────────────────────── ทิ้งข้อมูลที่แก้ค้างไว้ (ใช้ร่วมทุกฟอร์มในหน้านี้) */}
      <Popup
        open={!!discardPrompt}
        onClose={() => setDiscardPrompt(null)}
        title='ออกโดยไม่บันทึก ?'
        subtitle={discardPrompt?.subtitle || ''}
        size='default'
        tertiaryAction={{ label: 'กลับไปแก้ไข', onClick: () => setDiscardPrompt(null) }}
        primaryAction={{
          label: 'ออกโดยไม่บันทึก',
          tone: 'danger',
          onClick: () => { discardPrompt?.onConfirm?.(); setDiscardPrompt(null); },
        }}
      >
        <span
          style={{
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-sm, 14px)',
            color: 'var(--text-content-secondary)',
          }}
        >
          {discardPrompt?.body || 'ข้อมูลที่กรอกค้างไว้จะหายไป'}
        </span>
      </Popup>

      <SuccessToast open={!!toast} message={toast} onClose={() => setToast('')} topOffset='var(--dim-space-800, 32px)' />
    </>
  );
};

export default QueueSettingsPage;
