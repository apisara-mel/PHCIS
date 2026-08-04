/* TOR 4.2.5 "แจ้งเตือนกลับผู้รับบริการ" — MOCK push / LINE / SMS delivery log.

   ⚠️ This is a PROTOTYPE log only. There is no push provider, no LINE Messaging
   API and no SMS gateway behind it — every row is generated locally. 4.2.5 must
   therefore stay reported as **partial** until a real notification service is
   wired in. The store exists so that (a) the staff side can prove every decision
   produces an outbound message, and (b) the failure path (no device token /
   ผู้รับบริการปิดแจ้งเตือน) is exercisable with a ส่งซ้ำ action.

   sessionStorage-backed · React 17 subscribe+tick pattern. */

const STORAGE_KEY = 'mih:appointment-notify-log';

const canUseSessionStorage = () =>
  typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';

const pad2 = (n) => String(n).padStart(2, '0');

const stampMinutesAgo = (mins) => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - mins);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
};

const stampNow = () => stampMinutesAgo(0);

export const NOTIFY_CHANNELS = [
  { value: 'push', label: 'Push (Mobile App)', icon: 'notifications' },
  { value: 'line', label: 'LINE Official', icon: 'chat' },
  { value: 'sms', label: 'SMS', icon: 'sms' },
];

export const NOTIFY_KINDS = [
  { value: 'confirm', label: 'ยืนยันนัดหมาย' },
  { value: 'reject', label: 'ปฏิเสธคำขอนัด' },
  { value: 'propose', label: 'เสนอวัน-เวลาใหม่' },
  { value: 'reschedule', label: 'เลื่อนนัดหมาย' },
  { value: 'cancel', label: 'ยกเลิกนัดหมาย' },
  { value: 'reminder', label: 'เตือนก่อนวันนัด' },
  { value: 'holiday', label: 'แจ้งวันหยุดกระทบนัด' },
  { value: 'no_show', label: 'แจ้งบันทึกไม่มาตามนัด' },
  { value: 'recurring', label: 'แจ้งชุดนัดต่อเนื่อง' },
];

export const NOTIFY_STATUS = { SENT: 'sent', FAILED: 'failed' };

export const NOTIFY_FAIL_REASONS = [
  'ไม่พบ device token ของผู้รับบริการ (ยังไม่ติดตั้งแอป)',
  'ผู้รับบริการปิดการแจ้งเตือนในแอปพลิเคชัน',
  'หมายเลขโทรศัพท์ไม่ถูกต้อง / ส่ง SMS ไม่สำเร็จ',
  'ผู้รับบริการยังไม่ผูกบัญชี LINE Official',
];

const channelLabel = (value) =>
  NOTIFY_CHANNELS.find((c) => c.value === value)?.label || value;

export const notifyKindLabel = (value) =>
  NOTIFY_KINDS.find((k) => k.value === value)?.label || value;

export { channelLabel as notifyChannelLabel };

const buildSeed = () => ([
  {
    id: 'NT-9012', at: stampMinutesAgo(25), channel: 'push', kind: 'confirm',
    hn: '67-00003', patient: 'นางปริญญา รัตนา',
    title: 'ยืนยันนัดหมายเรียบร้อย',
    body: 'ยืนยันนัดคลินิกตรวจโรคทั่วไป · นพ. วันชัย อยู่เย็น — กรุณามาก่อนเวลานัด 30 นาที',
    status: NOTIFY_STATUS.SENT, failReason: null, retries: 0,
    requestId: 'REQ-2585', appointmentId: 'A-REQ-2585', actor: 'จนท.สมพร ทองดี',
  },
  {
    id: 'NT-9011', at: stampMinutesAgo(90), channel: 'line', kind: 'reject',
    hn: '67-00014', patient: 'นางสาวอรพิน ทองใบ',
    title: 'คำขอนัดหมายไม่ได้รับการอนุมัติ',
    body: 'คลินิกวัณโรคปิดให้บริการในวันที่ขอ — กรุณาเลือกวันอังคารหรือพฤหัสบดี',
    status: NOTIFY_STATUS.SENT, failReason: null, retries: 0,
    requestId: 'REQ-2580', appointmentId: null, actor: 'จนท.วีระ พงษ์พานิช',
  },
  {
    id: 'NT-9010', at: stampMinutesAgo(180), channel: 'push', kind: 'propose',
    hn: '67-00006', patient: 'นายศุภชัย แก้วใส',
    title: 'เจ้าหน้าที่เสนอวัน-เวลาใหม่',
    body: 'ช่วงเวลาที่ขอเต็มโควตา — เสนอเวลา 11:00 น. วันเดียวกัน กรุณายืนยันในแอป',
    status: NOTIFY_STATUS.FAILED, failReason: NOTIFY_FAIL_REASONS[1], retries: 1,
    requestId: 'REQ-2578', appointmentId: null, actor: 'จนท.สมพร ทองดี',
  },
  {
    id: 'NT-9009', at: stampMinutesAgo(300), channel: 'sms', kind: 'reminder',
    hn: '67-00001', patient: 'นายสมชาย มั่นใจดี',
    title: 'เตือนนัดหมายล่วงหน้า 1 วัน',
    body: 'พรุ่งนี้ 08:15 น. คลินิกตรวจโรคทั่วไป — งดอาหาร 8 ชม. ก่อนเจาะเลือด',
    status: NOTIFY_STATUS.SENT, failReason: null, retries: 0,
    requestId: null, appointmentId: 'A-002', actor: 'ระบบ (อัตโนมัติ)',
  },
  {
    id: 'NT-9008', at: stampMinutesAgo(420), channel: 'push', kind: 'reminder',
    hn: '67-00013', patient: 'นายอาทิตย์ จันทร์เพ็ญ',
    title: 'เตือนนัดหมายล่วงหน้า 1 วัน',
    body: 'พรุ่งนี้ 15:00 น. ทันตกรรม — แปรงฟันก่อนมาพบทันตแพทย์',
    status: NOTIFY_STATUS.FAILED, failReason: NOTIFY_FAIL_REASONS[0], retries: 2,
    requestId: null, appointmentId: 'A-028', actor: 'ระบบ (อัตโนมัติ)',
  },
]);

let log = null;
const listeners = new Set();

const notify = () => {
  listeners.forEach((fn) => {
    try { fn(); } catch { /* listener errors must not break the store */ }
  });
};

const persist = () => {
  if (!canUseSessionStorage()) return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(log));
  } catch { /* quota / private mode */ }
};

const load = () => {
  if (log) return log;
  if (canUseSessionStorage()) {
    try {
      const parsed = JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) || 'null');
      if (Array.isArray(parsed) && parsed.length) {
        log = parsed;
        return log;
      }
    } catch { /* fall through to seed */ }
  }
  log = buildSeed();
  persist();
  return log;
};

export const subscribeApptNotify = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

export const getNotifyLog = () => load().map((r) => ({ ...r }));

export const getNotifyCounts = () => {
  const rows = load();
  return {
    all: rows.length,
    sent: rows.filter((r) => r.status === NOTIFY_STATUS.SENT).length,
    failed: rows.filter((r) => r.status === NOTIFY_STATUS.FAILED).length,
  };
};

export const getFailedNotifyCount = () => getNotifyCounts().failed;

/**
 * Append one mock outbound message.
 * `forceFail` lets a caller demo the failure branch; otherwise a stable hash of
 * the HN decides so the same patient always behaves the same way in a demo.
 */
export const pushNotify = ({
  channel = 'push',
  kind = 'confirm',
  hn,
  patient,
  title,
  body,
  requestId = null,
  appointmentId = null,
  actor = 'จนท.สมพร ทองดี',
  forceFail = null,
} = {}) => {
  const digits = String(hn || '').replace(/\D/g, '');
  const autoFail = digits ? Number(digits.slice(-1)) % 5 === 0 : false;
  const failed = forceFail == null ? autoFail : !!forceFail;
  const row = {
    /* ต้องมีตัวคั่นกันชน — commitHoliday() วน pushNotify แบบ synchronous ทีละนัด
       ทุกแถวจึงเกิดใน ms เดียวกัน (React key ซ้ำ + retryNotify แก้แถวแรกเสมอ) */
    id: `NT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    at: stampNow(),
    channel,
    kind,
    hn: hn || '—',
    patient: patient || '—',
    title: title || notifyKindLabel(kind),
    body: body || '',
    status: failed ? NOTIFY_STATUS.FAILED : NOTIFY_STATUS.SENT,
    failReason: failed ? NOTIFY_FAIL_REASONS[digits ? Number(digits.slice(-1)) % NOTIFY_FAIL_REASONS.length : 0] : null,
    retries: 0,
    requestId,
    appointmentId,
    actor,
  };
  log = [row, ...load()];
  persist();
  notify();
  return { ...row };
};

/** ส่งซ้ำ — retry succeeds on the second attempt so the flow is demonstrable. */
export const retryNotify = (id, { actor = 'จนท.สมพร ทองดี' } = {}) => {
  const rows = load();
  const idx = rows.findIndex((r) => r.id === id);
  if (idx < 0) return null;
  const prev = rows[idx];
  const nextRetries = (prev.retries || 0) + 1;
  const succeeded = nextRetries >= 2;
  const next = {
    ...prev,
    at: stampNow(),
    retries: nextRetries,
    status: succeeded ? NOTIFY_STATUS.SENT : NOTIFY_STATUS.FAILED,
    failReason: succeeded ? null : prev.failReason,
    actor,
  };
  log = rows.map((r, i) => (i === idx ? next : r));
  persist();
  notify();
  return { ...next };
};

export const resetNotifyLog = () => {
  log = buildSeed();
  persist();
  notify();
};
