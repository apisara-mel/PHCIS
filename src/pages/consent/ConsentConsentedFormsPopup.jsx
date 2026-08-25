import React, { useEffect, useMemo, useRef, useState } from 'react';
import Popup from '@/components/popup/Popup';
import PatientSummaryCard from '@/components/card/PatientSummaryCard';
import Table, { EllipsisText } from '@/components/table/Table';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import TabUnderline from '@/components/tab/TabUnderline';
import { ConsentCompareBody } from '@/pages/consent/ConsentComparePopup';
import { ConsentHistoryTimeline } from '@/pages/consent/ConsentHistoryPage';
import { getConsentRecords, subscribeConsentStore } from '@/data/consentWorkflowStore';
import { resolveConsentPatientCard } from '@/data/consentPatientDisplay';
import { toSignedFormViewEventFromRecord } from '@/data/signedConsentFormView';
import { CONSENT_STATUS, CONSENT_CONFIRM } from '@/data/consentRecords';
import SignedConsentFormBody from '@/pages/consent/SignedConsentFormBody';
import ConsentIdentityVerifyPanel from '@/components/consent/ConsentIdentityVerifyPanel';
import ConsentRevokeConfirmBody from '@/components/consent/ConsentRevokeConfirmBody';
import { formatNationalId, ID_CARD_CHIP_PHOTO_MOCK } from '@/data/registrationForm';
import { findMrPatientByHn } from '@/data/mrPatients';

/* PHCIS | Consent — ดูแบบฟอร์มความยินยอม (read-only inline)
   เปิดจาก icon view ใน worklist จัดการความยินยอม

   สองโหมด:
     • เจาะฉบับเดียว (default)  — ส่ง `record` หรือ `focusRecordId` มา
     • `allForPatient`          — แท็บผู้รับบริการทั้งหมด: 1 แถว = 1 คน จึงไม่มี
                                  "ฉบับที่กำลังดู" ต้องกางรายการทุกฉบับของคนนั้น
                                  ทุกสถานะ (รอดำเนินการ / รอลงนาม / ยินยอมแล้ว /
                                  ปฏิเสธ-เพิกถอน / ใกล้หมดอายุ / หมดอายุ) ให้เลือกก่อน */

const MUTED = {
  color: 'var(--text-content-tertiary)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-xs)',
  lineHeight: 1.5,
};

const CELL = {
  color: 'var(--text-content-default)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm)',
  fontWeight: 'var(--type-weight-regular)',
  lineHeight: 1.5,
};
const CELL_MUTED = { ...CELL, color: 'var(--text-content-tertiary)' };

const DateCell = ({ value }) => (
  value && value !== '-'
    ? <span className='block whitespace-nowrap' style={CELL}>{value}</span>
    : <span style={CELL_MUTED}>-</span>
);

/* โหมด allForPatient ใช้ Popup `extraLarge` (เต็ม viewport, สูงสุด 1440×1024)
   ไม่ใช่ width/height ที่กำหนดเอง — เพราะแท็บ Timeline ใช้ ConsentHistoryTimeline
   แบบ embedded ซึ่ง scroll ในตัวเองด้วย `flex: 1 1 0; height: 0` โซ่ flex จะทำงาน
   ก็ต่อเมื่อ dialog สูงตาม viewport (เงื่อนไขเดียวกับ ConsentHistoryPopup เดิม)
   ตั้ง width เองแล้ว panel นี้จะยุบเหลือ 0 · กว้างระดับนี้ยังพอให้ตาราง 7 คอลัมน์
   อ่านครบโดยไม่ต้องเลื่อนแนวนอน (ป้ายสถานะห้ามโดนตัด — design.md §6.34) */
/* ตัวฟอร์มเป็นเอกสารแนวตั้ง — คุมความกว้างไว้ ไม่ให้ field ยืดเต็ม 1120 */
const FORM_BODY_MAX_WIDTH = 880;

/* ระยะ scroll ที่ใช้ไล่ --consent-header-morph จาก 0 → 1 · สั้นกว่านี้จะรู้สึก
   "กระตุก" ยาวกว่านี้การ์ดค้างกินพื้นที่นานเกิน — 96px ≈ สองสามคลิกล้อ

   ⚠️ ห้ามใช้ชื่อ `--header-morph` (ของ useGlobalHeaderMorph ที่เซ็ตบน :root
   ตาม scroll ของหน้าเบื้องหลัง) — popup จะ inherit ค่านั้นมาแล้วการ์ดหายตั้งแต่
   เปิดถ้าหน้าข้างหลังถูกเลื่อนไว้ ต้องเป็นชื่อ scoped ของ popup เท่านั้น */
const HEADER_COLLAPSE_DISTANCE = 96;
const MORPH_EASE = 'var(--motion-easing-enter, cubic-bezier(0.16, 1, 0.3, 1))';

/* ค่า morph ไม่ได้ผูกกับ scrollTop ตรง ๆ แต่ไล่เข้าหาเป้าหมายทีละเฟรม (lerp)
   — ล้อเมาส์กระโดดทีละ 40-100px ถ้าผูกตรง ๆ การ์ดจะ "กระตุก" เป็นขั้น ๆ
   ยุบเร็วกว่าคลี่: ตอนยุบผู้ใช้กำลังจะอ่านเนื้อหา อยากให้หลบไว ๆ · ตอนคลี่กลับ
   ผู้ใช้เลื่อนขึ้นมาหาข้อมูลผู้ป่วย ให้มันค่อย ๆ คลี่เข้ามาจะอ่านง่ายกว่าเด้งพรืด */
const MORPH_LERP_COLLAPSE = 0.24;
const MORPH_LERP_EXPAND = 0.10;
const MORPH_SETTLE_EPSILON = 0.001;

/* การ์ดผู้รับบริการ: ยุบต่อเนื่องตาม --consent-header-morph (0 = กาง, 1 = ยุบสนิท)
   ไม่ใส่ CSS transition — เราขยับค่าเองทุกเฟรมอยู่แล้ว ถ้าใส่ทับจะได้ความหน่วง
   สองชั้นแล้วรู้สึกเหมือนตามนิ้วไม่ทัน */
const PATIENT_CARD_MORPH_STYLE = {
  maxHeight: 'calc(var(--consent-patient-card-h, 240px) * (1 - var(--consent-header-morph, 0)))',
  opacity: 'calc(1 - var(--consent-header-morph, 0))',
  transform: [
    'translateY(calc(-1 * var(--motion-panel-offset-y, 8px) * var(--consent-header-morph, 0)))',
    'scale(calc(1 + (0.97 - 1) * var(--consent-header-morph, 0)))',
  ].join(' '),
  transformOrigin: 'center top',
  overflow: 'hidden',
  willChange: 'max-height, opacity, transform',
  backfaceVisibility: 'hidden',
};

/* แถบแท็บกลายเป็นหัว sticky เมื่อการ์ดยุบ — เงาค่อย ๆ เข้ามาตาม morph
   ตัวเดียวกับที่ QueuePageShell ใช้ใต้แถบแท็บ (--shadow-header) */
const TAB_STRIP_SHADOW_STYLE = {
  position: 'absolute',
  left: 'var(--dim-space-0)',
  right: 'var(--dim-space-0)',
  bottom: 'var(--dim-space-0)',
  height: 'var(--dim-stroke-100, 1px)',
  boxShadow: 'var(--shadow-header)',
  opacity: 'var(--consent-header-morph, 0)',
  pointerEvents: 'none',
  transition: `opacity 120ms ${MORPH_EASE}`,
};

/** worklist mock อาจต่อท้าย HN ด้วย `-2`, `-3` เมื่อวนผู้ป่วยคนเดิม */
const baseHn = (value) => {
  const raw = String(value || '').trim();
  const m = raw.match(/^(\d{2}-\d{5})(?:-\d+)?$/);
  return m ? m[1] : raw;
};

/** ใหม่สุดขึ้นก่อน — เทียบจากวันที่ที่ขยับล่าสุดของฉบับนั้น */
const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];
const dateKey = (raw) => {
  const s = String(raw || '').trim();
  if (!s || s === '-') return 0;
  const monthIdx = THAI_MONTHS.findIndex((m) => s.includes(m));
  const yearMatch = s.match(/(25\d{2}|20\d{2})/);
  const dayMatch = s.match(/^(\d{1,2})\s/);
  if (monthIdx < 0 || !yearMatch || !dayMatch) return 0;
  let year = Number(yearMatch[1]);
  if (year >= 2400) year -= 543;
  return new Date(year, monthIdx, Number(dayMatch[1])).getTime() || 0;
};
const recordRecency = (r) => Math.max(
  dateKey(r.withdrawnDate), dateKey(r.signedDate), dateKey(r.createdDate),
);

const DATE_SORT_KEYS = new Set(['createdDate', 'signedDate', 'withdrawnDate']);

/** "V 1.2" · "V 1.0 → V 1.1" (ฉบับที่ถูกแทนที่) — ใช้เลขตัวท้าย = เวอร์ชันปัจจุบัน */
const versionSortKey = (raw) => {
  const nums = String(raw || '').match(/\d+(?:\.\d+)?/g);
  return nums ? Number(nums[nums.length - 1]) : 0;
};

/** เรียงสถานะตามลำดับใน CONSENT_STATUS (ลำดับ workflow) ไม่ใช่ตามตัวอักษร —
    ดึงจาก map ตรง ๆ เพื่อไม่ให้ลำดับหลุดจากกันเมื่อมีสถานะใหม่ */
const statusSortKey = (status) => {
  const idx = Object.keys(CONSENT_STATUS).indexOf(status);
  return idx < 0 ? Number.MAX_SAFE_INTEGER : idx;
};

/* ตารางแบบฟอร์มของผู้รับบริการ 1 ราย — คอลัมน์เดียวกับ worklist หลัก
   (รหัสฟอร์ม · เวอร์ชัน · วันที่ทั้งสาม · สถานะ) เพื่อให้ผู้ใช้ที่สลับไปมา
   ระหว่างแท็บสถานะกับแท็บผู้รับบริการอ่านคอลัมน์เดิมได้ทันที
   ไม่กำหนด width — Table เป็น content-fit ตาม design.md §6.34 */
const FORM_COLUMNS = [
  {
    key: 'formName', label: 'ชื่อแบบฟอร์ม', flex: true, minWidth: 260,
    render: (r) => (
      <div className='min-w-0 w-full' style={{ ...CELL, overflow: 'visible' }}>
        <EllipsisText text={r.formName || r.type || '-'} />
      </div>
    ),
  },
  {
    key: 'formCode', label: 'รหัสแบบฟอร์ม',
    render: (r) => (
      <span className='block whitespace-nowrap' style={CELL}>{r.formCode || '-'}</span>
    ),
  },
  {
    key: 'version', label: 'เวอร์ชัน',
    render: (r) => (
      <ColorfulBadge style='blue' size='small' hierarchy='secondary' width='hug'>
        {r.version}
      </ColorfulBadge>
    ),
  },
  { key: 'createdDate',   label: 'วันที่สร้างคำขอ',      render: (r) => <DateCell value={r.createdDate} /> },
  { key: 'signedDate',    label: 'วันที่ลงนาม',          render: (r) => <DateCell value={r.signedDate} /> },
  { key: 'withdrawnDate', label: 'วันที่ถอนความยินยอม',  render: (r) => <DateCell value={r.withdrawnDate} /> },
  {
    key: 'status', label: 'สถานะ',
    render: (r) => {
      const meta = CONSENT_STATUS[r.status] || {};
      return (
        <ColorfulBadge style={meta.tone || 'grey'} size='small' hierarchy='secondary' width='hug'>
          {meta.label || r.status}
        </ColorfulBadge>
      );
    },
  },
];

/** ต่อคอลัมน์ "การดำเนินการ" ท้ายตาราง เมื่อผู้เรียกส่ง renderer มาให้
    (ตัวเดียวกับหน้า worklist — CTA ตามสถานะ + ปุ่มแก้ไขของฉบับที่ลงนามแล้ว)
    หุ้มด้วย stopPropagation เพราะแถวทั้งแถวกดเพื่อเปิดเอกสารอยู่ กดปุ่มใน
    คอลัมน์นี้ต้องไม่เด้งเข้าหน้าเอกสารไปพร้อมกัน */
const buildFormColumns = (renderRecordAction) => (
  renderRecordAction
    ? [
      ...FORM_COLUMNS,
      {
        key: 'action',
        label: 'การดำเนินการ',
        sortable: false,
        render: (r) => (
          <div
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            role='presentation'
          >
            {renderRecordAction(r)}
          </div>
        ),
      },
    ]
    : FORM_COLUMNS
);

const ConsentConsentedFormsPopup = ({
  open,
  onClose,
  hn = null,
  name = null,
  record = null,
  focusRecordId = null,
  allForPatient = false,
  /** (record) => ReactNode — คอลัมน์ "การดำเนินการ" ของตารางแบบฟอร์มทั้งหมด
      ผู้เรียก (ConsentManagementPage) เป็นเจ้าของ dialog/verify/toast ทั้งหมด
      popup แค่วางปุ่ม ไม่ถือ workflow state เอง — ยกเว้นเพิกถอนที่เดินเป็น
      drill-down ในนี้ (ดู requestRevoke ด้านล่าง) */
  renderRecordAction = null,
  /** (record, audit) => void — ผู้เรียกลงมือเพิกถอนจริง (patch สถานะ + toast)
      หลังผ่านขั้นยืนยัน + ยืนยันตัวตนใน popup นี้แล้ว */
  onRevokeConfirmed = null,
}) => {
  const [records, setRecords] = useState(getConsentRecords);
  /* ฉบับที่ผู้ใช้เลือกจากตาราง (โหมด allForPatient เท่านั้น) */
  const [picked, setPicked] = useState(null);
  /* ...ส่วน Timeline ส่ง "เหตุการณ์" กลับมา ไม่ใช่ record — id ของเหตุการณ์เป็น
     คนละชุดกับ id ของ record จะ map กลับไม่ได้ จึงเก็บ event ไว้ตรง ๆ */
  const [pickedEvent, setPickedEvent] = useState(null);
  /* 3 มุมมองของผู้รับบริการรายเดียวกัน รวมใน popup เดียว — เดิมเป็น 3 popup แยก
     ที่เปิดจาก 3 ไอคอนในคอลัมน์การดำเนินการ */
  const [view, setView] = useState('forms'); /* forms | compare | timeline */
  /* key = null → ลำดับตั้งต้น "ขยับล่าสุดขึ้นก่อน" (ไม่ใช่คอลัมน์ใดคอลัมน์หนึ่ง) */
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'desc' });
  /* แท็บ Timeline: เลื่อนดูเหตุการณ์แล้วยุบการ์ดผู้รับบริการ ให้แถบแท็บขึ้นไปติดบน
     — ไทม์ไลน์ยาวกว่าจอเสมอ การ์ดที่ค้างอยู่กินพื้นที่อ่านไปเปล่า ๆ
     ยุบต่อเนื่องตามระยะ scroll (ไม่ใช่ on/off) ผ่าน CSS var 0→1 ตาม convention
     เดียวกับ scroll-morph ของ QueuePageShell แต่ใช้ชื่อ scoped ของ popup */
  const [headerCollapsed, setHeaderCollapsed] = useState(false);
  const timelinePanelRef = useRef(null);
  const morphHostRef = useRef(null);
  const patientCardRef = useRef(null);

  /* เพิกถอนแบบ drill-down ใน popup เดียวกัน — ไม่เปิด dialog/popup ซ้อน:
       list → 'confirm' (การ์ดแบบฟอร์ม + การเสียผลประโยชน์) → 'identity' (ด.1.1.1)
     mutation + toast เป็นของผู้เรียกผ่าน onRevokeConfirmed */
  const IDENTITY_IDLE = { verifiedAt: null, method: null, methodText: '', reading: false, subject: 'self', subjectLabel: '' };
  const [revokeFor, setRevokeFor] = useState(null);
  const [revokeStep, setRevokeStep] = useState('confirm'); /* 'confirm' | 'identity' */
  const [revokeIdentity, setRevokeIdentity] = useState(IDENTITY_IDLE);

  const beginRevoke = (rec) => {
    setRevokeFor(rec);
    setRevokeStep('confirm');
    setRevokeIdentity(IDENTITY_IDLE);
  };
  const exitRevoke = () => {
    setRevokeFor(null);
    setRevokeStep('confirm');
    setRevokeIdentity(IDENTITY_IDLE);
  };

  useEffect(() => subscribeConsentStore(() => setRecords(getConsentRecords())), []);
  /* เปิดใหม่ / เปลี่ยนคน = กลับไปแท็บแรก + ลำดับตั้งต้นเสมอ */
  useEffect(() => {
    setPicked(null);
    setPickedEvent(null);
    setView('forms');
    setSortConfig({ key: null, direction: 'desc' });
    setHeaderCollapsed(false);
    setRevokeFor(null);
    setRevokeStep('confirm');
    setRevokeIdentity(IDENTITY_IDLE);
  }, [open, hn]);

  /* ย้อนกลับจากหน้าเอกสาร → กลับไปแท็บเดิมที่กดมา */
  const goBackToList = () => {
    setPicked(null);
    setPickedEvent(null);
  };

  const handleSort = (key) => setSortConfig((prev) => (
    prev.key === key
      ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
      : { key, direction: 'asc' }
  ));

  const patientRecords = useMemo(() => {
    const target = baseHn(hn);
    if (!allForPatient || !target) return [];
    const mine = records.filter((r) => baseHn(r.hn) === target);
    const { key, direction } = sortConfig;
    const sign = direction === 'desc' ? -1 : 1;
    /* ยังไม่ได้เลือกคอลัมน์ → ขยับล่าสุดขึ้นก่อน */
    if (!key) return mine.sort((a, b) => recordRecency(b) - recordRecency(a) || b.id - a.id);

    return mine.sort((a, b) => {
      let primary;
      if (DATE_SORT_KEYS.has(key)) {
        const aEmpty = !a[key] || a[key] === '-';
        const bEmpty = !b[key] || b[key] === '-';
        /* วันที่ว่าง (-) อยู่ท้ายเสมอ ไม่ว่าเรียงขึ้นหรือลง — เหมือน worklist หลัก */
        if (aEmpty && bEmpty) primary = 0;
        else if (aEmpty) return 1;
        else if (bEmpty) return -1;
        else primary = sign * (dateKey(a[key]) - dateKey(b[key]));
        return primary !== 0 ? primary : a.id - b.id;
      }
      if (key === 'version') primary = versionSortKey(a.version) - versionSortKey(b.version);
      else if (key === 'status') primary = statusSortKey(a.status) - statusSortKey(b.status);
      else primary = String(a[key] ?? '').localeCompare(String(b[key] ?? ''), 'th');
      return primary !== 0 ? sign * primary : a.id - b.id;
    });
  }, [allForPatient, hn, records, sortConfig]);

  const sourceRecord = useMemo(() => {
    if (picked) return records.find((r) => r.id === picked.id) || picked;
    if (record) return record;
    if (!focusRecordId) return null;
    return records.find((r) => String(r.id) === String(focusRecordId)) || null;
  }, [picked, record, focusRecordId, records]);

  const viewEvent = useMemo(
    () => pickedEvent || toSignedFormViewEventFromRecord(sourceRecord),
    [pickedEvent, sourceRecord],
  );

  const patientCard = useMemo(() => {
    const resolvedHn = sourceRecord?.hn || hn;
    const resolvedName = sourceRecord?.name || name;
    if (!resolvedHn) return null;
    return resolveConsentPatientCard(resolvedHn, resolvedName);
  }, [sourceRecord, hn, name]);

  /* โหมดรายการ = เปิดแบบ allForPatient แล้วยังไม่ได้เจาะเข้าเอกสารไหน
     (ทั้งจากตาราง = sourceRecord และจาก Timeline = pickedEvent) */
  const listMode = allForPatient && !sourceRecord && !pickedEvent;
  const isTimelinePanel = listMode && view === 'timeline';

  /* ความสูงจริงของการ์ด — ใช้เป็นต้นทางของ maxHeight ตอนยุบ แทนการเดาเลขตายตัว
     (การ์ดสูงไม่เท่ากันตามความยาวชื่อ / ขนาดฟอนต์ที่ผู้ใช้ตั้ง) */
  useEffect(() => {
    const card = patientCardRef.current;
    const host = morphHostRef.current;
    if (!card || !host || !patientCard) return undefined;
    const measure = () => {
      const h = card.firstElementChild?.offsetHeight || card.offsetHeight;
      if (h) host.style.setProperty('--consent-patient-card-h', `${h}px`);
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(measure);
    ro.observe(card);
    return () => ro.disconnect();
  }, [patientCard, listMode, view]);

  /* ตัว scroll จริงอยู่ข้างใน ConsentHistoryTimeline (embedded) ซึ่งไม่ได้ส่ง ref
     ออกมา — เกาะจากคลาสของมัน (`mih-grouped-timeline-scroll`) ที่คงที่มาตลอด
     ถ้าวันหนึ่งคลาสนี้เปลี่ยน จะได้แค่ไม่ยุบหัว ไม่ทำให้ timeline พัง

     เขียนค่าเป็น CSS var ผ่าน rAF ตรง ๆ ไม่ผ่าน React state — scroll หนึ่งครั้ง
     ยิงหลายสิบเฟรม ถ้า setState ทุกเฟรมจะ re-render ทั้ง popup (ตารางหลายสิบแถว)
     แล้วกระตุก · state เหลือไว้แค่ธงหยาบ ๆ สำหรับ aria/pointer-events */
  useEffect(() => {
    const host = morphHostRef.current;
    if (!isTimelinePanel) {
      host?.style.setProperty('--consent-header-morph', '0');
      setHeaderCollapsed(false);
      return undefined;
    }
    const scroller = timelinePanelRef.current?.querySelector('.mih-grouped-timeline-scroll');
    if (!scroller || !host) return undefined;

    const reduceMotion = typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    let frame = 0;
    let current = 0;
    let lastFlag = false;

    const write = (v) => {
      host.style.setProperty('--consent-header-morph', v.toFixed(4));
      const flag = v > 0.99;
      if (flag !== lastFlag) {
        lastFlag = flag;
        setHeaderCollapsed(flag); /* re-render เฉพาะตอนข้ามเส้น ไม่ใช่ทุกเฟรม */
      }
    };

    const targetOf = () => Math.min(1, Math.max(
      0, scroller.scrollTop / HEADER_COLLAPSE_DISTANCE,
    ));

    const tick = () => {
      const target = targetOf();
      const diff = target - current;
      if (Math.abs(diff) < MORPH_SETTLE_EPSILON) {
        current = target;
        write(current);
        frame = 0;
        return;
      }
      current += diff * (diff > 0 ? MORPH_LERP_COLLAPSE : MORPH_LERP_EXPAND);
      write(current);
      frame = requestAnimationFrame(tick);
    };

    const onScroll = () => {
      if (reduceMotion) {
        current = targetOf();
        write(current);
        return;
      }
      if (!frame) frame = requestAnimationFrame(tick);
    };

    current = targetOf();
    write(current);
    scroller.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      scroller.removeEventListener('scroll', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [isTimelinePanel, hn, open]);

  /* ส่ง requestRevoke ของ popup เข้าไปให้ปุ่ม "เพิกถอน" ของผู้เรียก — ปุ่มอื่น
     (Reconsent / ยกเลิกคำขอ / แก้ไข) ยังเดินเส้นทางเดิมของหน้าแม่ */
  const actionRenderer = useMemo(() => (
    renderRecordAction
      ? (r) => renderRecordAction(r, { requestRevoke: beginRevoke })
      : null
  ), [renderRecordAction]);
  const formColumns = useMemo(
    () => buildFormColumns(actionRenderer),
    [actionRenderer],
  );

  /* ข้อมูลบัตรประชาชนในทะเบียน — คอลัมน์ซ้ายของขั้นยืนยันตัวตน (ชุดเดียวกับ
     ขั้นยืนยันของ popup กรอกแบบฟอร์ม) */
  const revokeIdCard = useMemo(() => {
    const targetHn = revokeFor?.hn || hn;
    if (!targetHn) return null;
    const card = resolveConsentPatientCard(targetHn, revokeFor?.name || name);
    const mr = findMrPatientByHn(baseHn(targetHn));
    const addr = mr?.address;
    return {
      photoUrl: card?.avatarUrl || '',
      idCardPhotoUrl: card?.idCardPhotoUrl || card?.avatarUrl || ID_CARD_CHIP_PHOTO_MOCK,
      fullName: card?.fullName
        || [mr?.prefixTh, mr?.firstNameTh, mr?.lastNameTh].filter(Boolean).join(' ')
        || revokeFor?.name || name || '',
      nationalId: mr?.nationalId ? formatNationalId(mr.nationalId) : '',
      dob: mr?.dob || '',
      gender: mr?.gender || '',
      hn: targetHn,
      address: addr
        ? [addr.houseNo, addr.moo && `หมู่ ${addr.moo}`, addr.road, addr.subdistrict, addr.district, addr.province, addr.zip]
          .filter(Boolean).join(' ')
        : '',
    };
  }, [revokeFor, hn, name]);

  const viewTabs = useMemo(() => [
    { key: 'forms',    label: 'แบบฟอร์มทั้งหมด', count: patientRecords.length },
    { key: 'compare',  label: 'เปรียบเทียบการให้ความยินยอม' },
    { key: 'timeline', label: 'Timeline การเปลี่ยนแปลงความยินยอม' },
  ], [patientRecords.length]);

  const VIEW_SUBTITLE = {
    forms:    `ทุกสถานะ · ${patientRecords.length} ฉบับ — เลือกฉบับที่ต้องการดู`,
    compare:  'แบบฟอร์มที่ให้ความยินยอม และแบบฟอร์มที่ไม่ให้ความยินยอม ของผู้รับบริการรายนี้',
    timeline: 'ลำดับเหตุการณ์ทุกครั้งที่ความยินยอมของผู้รับบริการรายนี้เปลี่ยนแปลง',
  };

  const popupTitle = listMode
    ? 'แบบฟอร์มความยินยอมทั้งหมด'
    : (viewEvent?.formName
      ? (
        <span
          style={{
            fontSize: 'var(--type-size-sm)',
            fontWeight: 'var(--type-weight-bold)',
            lineHeight: 1.4,
            display: 'block',
          }}
        >
          {viewEvent.formName}
        </span>
      )
      : 'แบบฟอร์มที่ให้ความยินยอม');
  const popupSubtitle = listMode
    ? VIEW_SUBTITLE[view]
    : (viewEvent
      ? [
        viewEvent.formCode,
        viewEvent.version,
        viewEvent.dateTime !== '—' ? `ลงนาม ${viewEvent.dateTime}` : null,
      ].filter(Boolean).join(' · ')
      : 'รายการแบบฟอร์มที่ผู้รับบริการให้ความยินยอมแล้ว');

  /* ขั้น drill-down เพิกถอน — เปลี่ยนหัว/ปุ่ม/เนื้อของ popup ใบเดิม (ห้ามซ้อน) */
  const inRevoke = !!revokeFor;
  const revokeConfirmStep = inRevoke && revokeStep === 'confirm';
  const revokeIdentityStep = inRevoke && revokeStep === 'identity';

  const finishRevoke = () => {
    onRevokeConfirmed?.(revokeFor, {
      method: revokeIdentity.method,
      methodText: revokeIdentity.methodText,
      subject: revokeIdentity.subject,
      subjectLabel: revokeIdentity.subjectLabel,
      verifiedAt: revokeIdentity.verifiedAt,
    });
    exitRevoke();
  };

  return (
    <Popup
      open={open}
      onClose={onClose}
      /* ขนาดคงที่ทั้ง 3 แท็บ + หน้าตัวฟอร์ม — ถ้าย่อ/ขยายตอนสลับแท็บหรือกดเข้า
         ฉบับ ผู้ใช้จะเสียตำแหน่งสายตาทุกครั้ง · ขั้นเพิกถอนหดตาม content */
      size={inRevoke ? 'large' : (allForPatient ? 'extraLarge' : 'large')}
      width={inRevoke ? (revokeIdentityStep ? 1040 : 640) : undefined}
      title={inRevoke
        ? (revokeConfirmStep ? CONSENT_CONFIRM.revoke.title : 'ยืนยันตัวตนผู้รับบริการ')
        : popupTitle}
      subtitle={inRevoke
        ? (revokeConfirmStep
          ? 'ตรวจรายละเอียดและแจ้งการเสียผลประโยชน์ให้ผู้รับบริการทราบก่อนยืนยัน'
          : 'ยืนยันตัวตนก่อนเพิกถอนความยินยอม')
        : popupSubtitle}
      /* ปุ่มย้อนกลับอยู่แถวเดียวกับหัว popup (‹ ของ Popup เอง) แบบ nested popup
         อื่น ๆ ในระบบ — ไม่ใช่ปุ่มลอยอยู่ในเนื้อหา · X ยังปิดทั้ง popup เหมือนเดิม */
      onBack={inRevoke
        ? (revokeIdentityStep ? () => setRevokeStep('confirm') : exitRevoke)
        : (allForPatient && !listMode ? goBackToList : undefined)}
      /* แท็บ Timeline scroll เอง — ปิด scroll ของ body ไม่งั้นได้ scrollbar ซ้อน */
      bodyScrollable={inRevoke ? true : !isTimelinePanel}
      primaryAction={revokeConfirmStep
        ? {
          label: CONSENT_CONFIRM.revoke.confirmLabel,
          tone: 'danger',
          onClick: () => setRevokeStep('identity'),
        }
        : (revokeIdentityStep
          ? {
            label: 'ต่อไป',
            onClick: finishRevoke,
            disabled: !revokeIdentity.verifiedAt || revokeIdentity.reading,
          }
          : undefined)}
      secondaryAction={inRevoke
        ? { label: 'ยกเลิก', onClick: exitRevoke, disabled: revokeIdentity.reading }
        : { label: 'ปิด', onClick: onClose }}
    >
      {/* ขั้นยืนยันการเพิกถอน — การ์ดแบบฟอร์ม + การเสียผลประโยชน์ */}
      {revokeConfirmStep && <ConsentRevokeConfirmBody record={revokeFor} />}

      {/* ขั้นยืนยันตัวตน (ด.1.1.1) — แผงเดียวกับทุกทางเข้าของโมดูล */}
      {revokeIdentityStep && (
        <ConsentIdentityVerifyPanel
          idCard={revokeIdCard}
          contextText='ยืนยันตัวตนก่อนเพิกถอนความยินยอม'
          onChange={setRevokeIdentity}
        />
      )}

      {!inRevoke && (
      <div
        ref={morphHostRef}
        className={`flex flex-col w-full min-w-0${isTimelinePanel ? ' flex-1 min-h-0' : ''}`}
        style={{ gap: 'var(--dim-space-400)' }}
      >
        {patientCard && (
          /* ยุบเมื่อเลื่อนไทม์ไลน์ — maxHeight + opacity แทน display:none
             เพื่อให้ยุบ/คลี่ต่อเนื่องและแถบแท็บไหลขึ้นไปติดบน · การ์ดยังอยู่ใน DOM
             (ไม่ต้อง re-mount ตอนเลื่อนกลับขึ้นบนสุด) */
          <div
            ref={patientCardRef}
            className='shrink-0 w-full min-w-0'
            aria-hidden={headerCollapsed || undefined}
            style={{
              ...PATIENT_CARD_MORPH_STYLE,
              pointerEvents: headerCollapsed ? 'none' : undefined,
            }}
          >
            <PatientSummaryCard
              /* พื้นหลังเข้ม — ชุดเดียวกับ popup ประวัติ / เปรียบเทียบ ที่ถูกยุบมารวมที่นี่ */
              variant='gradient'
              avatarUrl={patientCard.avatarUrl}
              avatarAlt={patientCard.fullName || patientCard.shortName || ''}
              cells={[
                {
                  label: 'ชื่อ-นามสกุล ผู้รับบริการ',
                  value: patientCard.fullName || patientCard.shortName || '—',
                },
                {
                  label: 'HN (Hospital Number)',
                  value: patientCard.hn || '—',
                },
              ]}
            />
          </div>
        )}

        {listMode ? (
          <>
            {/* shrink-0 — แถบแท็บไม่ scroll ไปกับไทม์ไลน์ พอการ์ดยุบมันจึงขึ้นไป
                อยู่บนสุดของ body เอง (ไม่ต้องใช้ position: sticky ซึ่งจะพังกับ
                scroll container ที่อยู่คนละชั้น) · เงาใต้แถบจางเข้ามาตาม morph
                ให้รู้ว่าตอนนี้มันกลายเป็นหัวที่มีเนื้อหาเลื่อนอยู่ข้างใต้ */}
            <div className='shrink-0 w-full min-w-0' style={{ position: 'relative' }}>
              <TabUnderline
                tabs={viewTabs}
                value={view}
                onChange={setView}
                style={{ borderBottom: 'var(--dim-stroke-100) solid var(--border-neutral-tertiary, #E2E4E6)' }}
              />
              <span aria-hidden style={TAB_STRIP_SHADOW_STYLE} />
            </div>
            {view === 'forms' && (
              <Table
                columns={formColumns}
                rows={patientRecords}
                rowKey={(r) => r.id}
                sortConfig={sortConfig}
                onSort={handleSort}
                onRowClick={(r) => setPicked(r)}
                emptyMessage='ยังไม่มีแบบฟอร์มความยินยอม'
                emptySubtext='ผู้รับบริการรายนี้ยังไม่เคยมีคำขอความยินยอมในระบบ'
              />
            )}
            {view === 'compare' && (
              /* การ์ดกดเข้าดูเอกสารได้เหมือนแถวในตาราง — item.id คือ id ของ
                 "ฉบับที่มีผลล่าสุด" ของแบบฟอร์มนั้น จึงหา record จริงเจอเสมอ */
              <ConsentCompareBody
                hn={baseHn(hn)}
                records={records}
                onSelectForm={(item) => {
                  const hit = records.find((r) => String(r.id) === String(item?.id));
                  if (hit) setPicked(hit);
                }}
              />
            )}
            {view === 'timeline' && (
              /* Timeline scroll ในตัวเอง — ต้องได้ความสูงจริงจาก popup body
                 (flex-1 + min-h-0) คู่กับ bodyScrollable={false} ด้านล่าง
                 ไม่งั้นมันจะถูกตัดเหลือแค่แถวตัวกรอง เหมือนใน ConsentHistoryPopup
                 onViewForm ส่ง viewEvent ไม่ใช่ record — หาแถวจริงจาก recordId
                 ก่อน เพื่อให้ปุ่มย้อนกลับ + หัว popup ทำงานเหมือนกดจากตาราง */
              <div
                ref={timelinePanelRef}
                className='flex flex-col flex-1 min-h-0 w-full min-w-0'
                style={{ flex: '1 1 0' }}
              >
                <ConsentHistoryTimeline
                  hn={baseHn(hn)}
                  records={records}
                  embedded
                  /* ไม่กรองวันที่ตั้งต้น — แท็บแบบฟอร์ม/เปรียบเทียบดูทั้งแฟ้ม
                     ถ้าไทม์ไลน์ default เป็น "ปีนี้" สามแท็บจะนับคนละช่วงเวลา */
                  defaultDateQuick='all'
                  onViewForm={setPickedEvent}
                />
              </div>
            )}
          </>
        ) : viewEvent ? (
          /* ปุ่มย้อนกลับย้ายไปอยู่บนหัว popup แล้ว (prop `onBack`) — ที่นี่เหลือ
             แต่ตัวเอกสาร ไม่มีปุ่มลอยคั่นระหว่างการ์ดผู้ป่วยกับฟอร์มอีก */
          <div
            className='w-full min-w-0'
            style={allForPatient
              ? { maxWidth: FORM_BODY_MAX_WIDTH, marginLeft: 'auto', marginRight: 'auto' }
              : undefined}
          >
            <SignedConsentFormBody
              event={viewEvent}
              /* เปิดจาก Timeline จะไม่มี sourceRecord — ตกไปใช้ข้อมูลของ
                 ผู้รับบริการที่ popup ถืออยู่ ไม่ให้ชื่อ/HN ในเอกสารว่าง */
              patientHn={sourceRecord?.hn || patientCard?.hn || hn || ''}
              patientName={sourceRecord?.name
                || patientCard?.fullName || patientCard?.shortName || name || ''}
              /* ไม่ต้องมีการ์ดหัวแบบฟอร์มซ้ำ (มติผู้ใช้ 25 ส.ค. 69) — ชื่อฟอร์ม
                 รหัส และเวอร์ชันเป็นหัวข้อกับคำบรรยายของ popup อยู่แล้ว */
              showFormHeader={false}
            />
          </div>
        ) : (
          <span style={MUTED}>ไม่พบข้อมูลแบบฟอร์มที่ให้ความยินยอม</span>
        )}
      </div>
      )}
    </Popup>
  );
};

export default ConsentConsentedFormsPopup;
