/* telemedSessionBridge — จับคู่ session ระหว่างแท็บ web (แพทย์) กับแท็บ
   mobile (ผู้รับบริการ) ด้วยของที่เบราว์เซอร์มีอยู่แล้ว (TOR §1.13.7)

   เดิมฝั่งเว็บ "แกล้ง" ให้ผู้ป่วยขอเข้าห้องหลังหมอเข้าสาย 1.4 วินาที และฝั่ง
   มือถือก็ตั้งเวลาเข้าสายเองที่ 3.5 วินาที — สองฝั่งไม่รู้จักกันเลย.
   ไฟล์นี้ทำให้เหตุการณ์จริงเดินข้ามแท็บ: ขอเข้าห้อง → รับ/ปฏิเสธ → ออกจากสาย
   → เปลี่ยนสถานะความยินยอมให้บันทึก.

   ช่องทาง (ไล่ตามที่ใช้ได้จริง):
     1. BroadcastChannel   — เบราว์เซอร์สมัยใหม่
     2. localStorage 'storage' event — Safari รุ่นเก่า / โหมดที่ปิด BC
     3. ไม่มีเลย → supported = false และหน้าจอกลับไปใช้โหมดสาธิตเดิม

   ขอบเขตที่ต้องพูดให้ชัด: นี่คือการจับคู่ "ภายในเบราว์เซอร์เดียวกัน" เท่านั้น
   การจับคู่ข้ามเครื่องจริงต้องใช้ signalling server + WebRTC ซึ่งอยู่นอก
   ขอบเขต wave นี้ — UI จึงต้องคงป้าย "โหมดสาธิต" ไว้เสมอ. */

const CHANNEL = 'mih-telemed-session';
const RELAY_KEY = 'mih:telemed:session-relay:v1';
const PRESENCE_KEY = 'mih:telemed:session-presence:v1';
const PRESENCE_TTL_MS = 12000;
const HEARTBEAT_MS = 4000;
/* การเปิดบทบาทซ้ำต้องยืนยันด้วยแถวที่ "สด" กว่า presence ทั่วไป มิฉะนั้นการ
   รีโหลดหน้าเดิม (แถวเก่ายังไม่หมดอายุ) จะถูกอ่านผิดเป็น "เปิดสองแท็บ" */
const DUPLICATE_TTL_MS = HEARTBEAT_MS * 2;

export const TELEMED_SESSION_EVENTS = {
  hello: 'hello',                 /* ประกาศตัวเมื่อเปิดแท็บ */
  helloAck: 'hello-ack',
  joinRequest: 'join-request',    /* mobile → web: ขอเข้าห้อง */
  accept: 'accept',               /* web → mobile: รับเข้าห้อง */
  decline: 'decline',             /* web → mobile: ยังไม่รับ */
  leave: 'leave',                 /* ฝั่งใดฝั่งหนึ่งออกจากสาย */
  consent: 'consent',             /* เปลี่ยนสถานะยินยอมให้บันทึก */
  bye: 'bye',                     /* แท็บกำลังปิด */
};

const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const safeParse = (raw) => {
  try { return JSON.parse(raw); } catch { return null; }
};

const readPresence = () => {
  try {
    const parsed = safeParse(window.localStorage.getItem(PRESENCE_KEY));
    if (!Array.isArray(parsed)) return [];
    const fresh = parsed.filter((p) => p && Date.now() - (p.ts || 0) < PRESENCE_TTL_MS);
    return fresh;
  } catch {
    return [];
  }
};

const writePresence = (rows) => {
  try { window.localStorage.setItem(PRESENCE_KEY, JSON.stringify(rows)); } catch { /* ignore */ }
};

/**
 * เปิดช่องสื่อสารของ session
 * @param {{role:'web'|'mobile', onMessage:(msg)=>void, onPeerChange?:(state)=>void}} config
 * @returns {{post:Function, close:Function, supported:boolean, transport:string, tabId:string, hasPeer:()=>boolean, isDuplicate:()=>boolean}}
 */
export const openTelemedSession = ({ role, onMessage, onPeerChange } = {}) => {
  const tabId = newId();
  const hasBroadcast = typeof window !== 'undefined' && typeof window.BroadcastChannel === 'function';
  const hasStorage = (() => {
    try {
      window.localStorage.setItem('mih:telemed:probe', '1');
      window.localStorage.removeItem('mih:telemed:probe');
      return true;
    } catch { return false; }
  })();

  let channel = null;
  let closed = false;
  let peerSeenAt = 0;
  let duplicate = false;
  let heartbeatId = null;

  const transport = hasBroadcast ? 'broadcast' : hasStorage ? 'storage' : 'none';
  const supported = transport !== 'none';

  const notifyPeer = () => {
    onPeerChange?.({
      hasPeer: Date.now() - peerSeenAt < PRESENCE_TTL_MS,
      duplicate,
      transport,
      supported,
    });
  };

  /* ข้อความเดียวกันอาจมาทั้งทาง BroadcastChannel และ storage event —
     กันซ้ำด้วย id ต่อข้อความ (เก็บแบบมีเพดานไม่ให้ set โต) */
  const seen = [];
  const isDuplicateMessage = (id) => {
    if (!id) return false;
    if (seen.includes(id)) return true;
    seen.push(id);
    if (seen.length > 60) seen.splice(0, seen.length - 60);
    return false;
  };

  const handle = (msg) => {
    if (!msg || closed) return;
    if (msg.tabId === tabId) return;              /* ข้อความของตัวเอง */
    if (msg.channel !== CHANNEL) return;
    if (isDuplicateMessage(msg.msgId)) return;
    if (msg.role !== role) {
      peerSeenAt = Date.now();
      notifyPeer();
    }
    if (msg.role === role && msg.type === TELEMED_SESSION_EVENTS.hello) {
      /* แท็บบทบาทเดียวกันเปิดซ้ำ — ฝั่งที่มาทีหลังต้องรู้ตัว */
      if (!duplicate) {
        duplicate = true;
        notifyPeer();
        onMessage?.({ ...msg, type: 'duplicate' });
      }
      return;
    }
    if (msg.role === role && msg.type === TELEMED_SESSION_EVENTS.bye) {
      /* แท็บบทบาทเดียวกันปิดไปแล้ว → เลิกรายงานว่า "เปิดซ้ำ"
         (ถ้าไม่ล้างตรงนี้ แท็บที่เหลือจะค้างสถานะซ้ำตลอดไป — เส้นทางที่มีแต่
         BroadcastChannel ไม่มี presence heartbeat มาช่วยล้างให้) */
      if (duplicate) {
        duplicate = false;
        notifyPeer();
        onMessage?.({ type: 'duplicate-cleared', role, tabId: msg.tabId });
      }
      return;
    }
    if (msg.role === role) return;
    onMessage?.(msg);
  };

  const post = (type, payload = {}) => {
    if (closed || !supported) return false;
    const msg = { channel: CHANNEL, tabId, role, type, msgId: newId(), at: Date.now(), ...payload };
    if (channel) {
      try { channel.postMessage(msg); } catch { /* ignore */ }
    }
    if (hasStorage) {
      /* เขียนลง relay key เสมอ เพื่อให้แท็บที่ไม่มี BroadcastChannel ก็ได้ยิน */
      try { window.localStorage.setItem(RELAY_KEY, JSON.stringify(msg)); } catch { /* ignore */ }
    }
    return true;
  };

  const onStorage = (e) => {
    if (e.key !== RELAY_KEY || !e.newValue) return;
    handle(safeParse(e.newValue));
  };

  if (hasBroadcast) {
    try {
      channel = new window.BroadcastChannel(CHANNEL);
      channel.onmessage = (e) => handle(e.data);
    } catch {
      channel = null;
    }
  }
  if (hasStorage) window.addEventListener('storage', onStorage);

  /* presence: ใช้ตรวจ "มีแท็บคู่หูอยู่ไหม" และ "เปิดบทบาทซ้ำหรือเปล่า" */
  const beat = () => {
    if (closed) return;
    const rows = readPresence().filter((p) => p.tabId !== tabId);
    const sameRole = rows.find((p) => p.role === role && Date.now() - (p.ts || 0) < DUPLICATE_TTL_MS);
    const otherRole = rows.find((p) => p.role !== role);
    /* สถานะ "เปิดซ้ำ" ต้องคำนวณใหม่ทุกจังหวะ ไม่ใช่ latch ค้างไว้ — ปิดแท็บที่ซ้ำ
       แล้วแท็บที่เหลือต้องกลับไปแสดงสถานะจับคู่ปกติ */
    const dup = Boolean(sameRole);
    if (dup !== duplicate) {
      duplicate = dup;
      onMessage?.(dup
        ? { type: 'duplicate', role, tabId: sameRole.tabId }
        : { type: 'duplicate-cleared', role, tabId });
    }
    if (otherRole) peerSeenAt = Date.now();
    writePresence([...rows, { tabId, role, ts: Date.now() }]);
    notifyPeer();
  };

  if (hasStorage) {
    beat();
    heartbeatId = window.setInterval(beat, HEARTBEAT_MS);
  }
  post(TELEMED_SESSION_EVENTS.hello);

  const close = () => {
    if (closed) return;
    closed = true;
    post(TELEMED_SESSION_EVENTS.bye);
    if (heartbeatId != null) window.clearInterval(heartbeatId);
    window.removeEventListener('pagehide', close);
    if (hasStorage) {
      window.removeEventListener('storage', onStorage);
      writePresence(readPresence().filter((p) => p.tabId !== tabId));
    }
    if (channel) {
      try { channel.close(); } catch { /* ignore */ }
      channel = null;
    }
  };

  /* React ไม่ unmount ตอนปิด/รีโหลดแท็บ — ถ้าไม่เก็บกวาดตรงนี้ presence แถวเก่า
     จะค้างอยู่ แล้วหน้าที่โหลดใหม่จะอ่านตัวเองผิดเป็น "เปิดซ้ำสองแท็บ" */
  window.addEventListener('pagehide', close);

  return {
    post,
    close,
    supported,
    transport,
    tabId,
    hasPeer: () => Date.now() - peerSeenAt < PRESENCE_TTL_MS,
    isDuplicate: () => duplicate,
  };
};

/** ข้อความอธิบายช่องทางที่ใช้อยู่ — แสดงบนแบนเนอร์สาธิต */
export const transportLabel = (transport) => {
  switch (transport) {
    case 'broadcast': return 'จับคู่ข้ามแท็บด้วย BroadcastChannel';
    case 'storage':   return 'จับคู่ข้ามแท็บด้วย localStorage (เบราว์เซอร์นี้ไม่รองรับ BroadcastChannel)';
    default:          return 'เบราว์เซอร์นี้จับคู่ข้ามแท็บไม่ได้ — ใช้โหมดสาธิตในแท็บเดียว';
  }
};
