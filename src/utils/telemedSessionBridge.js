/* telemedSessionBridge — จับคู่ session ระหว่างฝั่งเว็บ (แพทย์) กับฝั่ง
   mobile (ผู้รับบริการ) และเป็นช่องส่ง signalling ของสายวิดีโอจริง (TOR §1.13.7)

   เดิมฝั่งเว็บ "แกล้ง" ให้ผู้ป่วยขอเข้าห้องหลังหมอเข้าสาย 1.4 วินาที และฝั่ง
   มือถือก็ตั้งเวลาเข้าสายเองที่ 3.5 วินาที — สองฝั่งไม่รู้จักกันเลย.
   ไฟล์นี้ทำให้เหตุการณ์จริงเดินข้ามแท็บ/ข้ามเครื่อง: ขอเข้าห้อง → รับ/ปฏิเสธ
   → ออกจากสาย → เปลี่ยนสถานะความยินยอมให้บันทึก → และ SDP/ICE ของ WebRTC.

   ช่องทาง (เปิดพร้อมกันได้ทั้งหมด — ข้อความซ้ำถูกกรองด้วย msgId):
     1. BroadcastChannel   — สองแท็บในเบราว์เซอร์เดียวกัน
     2. localStorage 'storage' event — Safari รุ่นเก่า / โหมดที่ปิด BC
     3. relay ของ dev server (`/__telemed/signal`) — **ข้ามเครื่องจริง**
        โน้ตบุ๊ก ↔ มือถือ บน Wi-Fi เดียวกัน โดยไม่ต้องมี backend แยก
        (ดู plugin `telemedSignalRelay` ใน vite.config.js)
     4. ไม่มีเลย → supported = false และหน้าจอกลับไปใช้โหมดสาธิตเดิม

   ข้อจำกัดที่ต้องพูดให้ชัด: ช่อง relay มีเฉพาะตอนรันผ่าน dev server เท่านั้น
   บนโฮสต์ static (UAT) จะเหลือแค่การจับคู่ภายในเบราว์เซอร์เดียว — UI จึงยังต้อง
   บอกสถานะช่องทางที่ใช้อยู่เสมอ. */

const CHANNEL = 'mih-telemed-session';
const RELAY_KEY = 'mih:telemed:session-relay:v1';
const PRESENCE_KEY = 'mih:telemed:session-presence:v1';
const PRESENCE_TTL_MS = 12000;
const HEARTBEAT_MS = 4000;
/* การเปิดบทบาทซ้ำต้องยืนยันด้วยแถวที่ "สด" กว่า presence ทั่วไป มิฉะนั้นการ
   รีโหลดหน้าเดิม (แถวเก่ายังไม่หมดอายุ) จะถูกอ่านผิดเป็น "เปิดสองแท็บ" */
const DUPLICATE_TTL_MS = HEARTBEAT_MS * 2;

/* relay ของ dev server — path เดียวกับที่ vite plugin เสิร์ฟ */
const RELAY_URL = '/__telemed/signal';
const RELAY_RETRY_MS = 1500;
const RELAY_BUSY_MS = 250;             /* กำลังเจรจาสาย — ต้องไว */
const RELAY_IDLE_MS = 1200;            /* อยู่เฉย ๆ — ประหยัดและปล่อยให้หน้า idle */
const RELAY_ACTIVE_WINDOW_MS = 20000;  /* นับว่า "กำลังคุยกัน" นานเท่านี้หลังมีข้อความ */
export const TELEMED_DEFAULT_ROOM = 'demo';

export const TELEMED_SESSION_EVENTS = {
  hello: 'hello',                 /* ประกาศตัวเมื่อเปิดแท็บ */
  helloAck: 'hello-ack',
  ping: 'ping',                   /* เต้นชีพจรข้ามเครื่อง — ไม่ส่งต่อให้หน้าจอ */
  joinRequest: 'join-request',    /* mobile → web: ขอเข้าห้อง */
  accept: 'accept',               /* web → mobile: รับเข้าห้อง */
  decline: 'decline',             /* web → mobile: ยังไม่รับ */
  leave: 'leave',                 /* ฝั่งใดฝั่งหนึ่งออกจากสาย */
  consentRequest: 'consent-request', /* web → mobile: แพทย์ขอความยินยอมบันทึกสาย */
  consent: 'consent',             /* คำตอบ/สถานะความยินยอมให้บันทึก */
  media: 'media',                 /* เปิด/ปิดกล้อง-ไมค์ ให้อีกฝั่งเห็นป้ายตรงกัน */
  signal: 'signal',               /* SDP / ICE ของ WebRTC (payload.signal) */
  rtcReady: 'rtc-ready',          /* พร้อมต่อสายแล้ว — อีกฝั่งเริ่มเจรจาได้ */
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
 * @param {{role:'web'|'mobile', room?:string, onMessage:(msg)=>void, onPeerChange?:(state)=>void}} config
 * @returns {{post:Function, close:Function, supported:boolean, transport:string, tabId:string, hasPeer:()=>boolean, isDuplicate:()=>boolean}}
 */
export const openTelemedSession = ({ role, room = TELEMED_DEFAULT_ROOM, onMessage, onPeerChange } = {}) => {
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
  /* แยกที่มาของ "เปิดซ้ำ" ออกจากกัน — presence ในเครื่อง (localStorage) กับ
     hello ที่มาข้ามเครื่องผ่าน relay ต้องไม่ลบล้างกันเองทุก ๆ 4 วินาที */
  let localDuplicate = false;
  let remoteDuplicate = false;
  let heartbeatId = null;
  let relayBeatId = null;

  /* relay (ข้ามเครื่อง) — เปิดใช้เมื่อ probe ผ่านเท่านั้น */
  let relayActive = false;
  let relayCursor = 0;
  let relayAbort = null;
  let relayActivityAt = 0;

  const localTransport = hasBroadcast ? 'broadcast' : hasStorage ? 'storage' : 'none';
  const supported = localTransport !== 'none';
  const transportName = () => {
    if (relayActive) return localTransport === 'none' ? 'relay' : `${localTransport}+relay`;
    return localTransport;
  };

  const isDuplicate = () => localDuplicate || remoteDuplicate;

  const notifyPeer = () => {
    onPeerChange?.({
      hasPeer: Date.now() - peerSeenAt < PRESENCE_TTL_MS,
      duplicate: isDuplicate(),
      transport: transportName(),
      relay: relayActive,
      supported: supported || relayActive,
    });
  };

  /* ข้อความเดียวกันอาจมาทั้งทาง BroadcastChannel, storage event และ relay —
     กันซ้ำด้วย id ต่อข้อความ (เก็บแบบมีเพดานไม่ให้ array โต) */
  const seen = [];
  const isDuplicateMessage = (id) => {
    if (!id) return false;
    if (seen.includes(id)) return true;
    seen.push(id);
    if (seen.length > 200) seen.splice(0, seen.length - 200);
    return false;
  };

  const handle = (msg) => {
    if (!msg || closed) return;
    if (msg.tabId === tabId) return;              /* ข้อความของตัวเอง */
    if (msg.channel !== CHANNEL) return;
    if (msg.room && msg.room !== room) return;    /* คนละห้องตรวจ */
    if (isDuplicateMessage(msg.msgId)) return;
    if (msg.role !== role) {
      peerSeenAt = Date.now();
      notifyPeer();
    }
    /* ชีพจร: ใช้ยืนยันว่ามีคู่หูอยู่เท่านั้น ไม่ต้องรบกวนหน้าจอ */
    if (msg.type === TELEMED_SESSION_EVENTS.ping) {
      if (msg.role === role && Date.now() - (msg.at || 0) < DUPLICATE_TTL_MS && !remoteDuplicate) {
        remoteDuplicate = true;
        notifyPeer();
        onMessage?.({ ...msg, type: 'duplicate' });
      }
      return;
    }
    if (msg.role === role && msg.type === TELEMED_SESSION_EVENTS.hello) {
      /* แท็บบทบาทเดียวกันเปิดซ้ำ — ฝั่งที่มาทีหลังต้องรู้ตัว */
      if (!remoteDuplicate) {
        remoteDuplicate = true;
        notifyPeer();
        onMessage?.({ ...msg, type: 'duplicate' });
      }
      return;
    }
    if (msg.role === role && msg.type === TELEMED_SESSION_EVENTS.bye) {
      /* แท็บบทบาทเดียวกันปิดไปแล้ว → เลิกรายงานว่า "เปิดซ้ำ"
         (ถ้าไม่ล้างตรงนี้ แท็บที่เหลือจะค้างสถานะซ้ำตลอดไป — เส้นทางที่มีแต่
         BroadcastChannel ไม่มี presence heartbeat มาช่วยล้างให้) */
      if (remoteDuplicate) {
        remoteDuplicate = false;
        notifyPeer();
        if (!localDuplicate) onMessage?.({ type: 'duplicate-cleared', role, tabId: msg.tabId });
      }
      return;
    }
    if (msg.role === role) return;
    onMessage?.(msg);
  };

  /* ── relay ข้ามเครื่อง ───────────────────────────────────────────────── */

  const relayPost = (msg) => {
    if (!relayActive) return;
    relayActivityAt = Date.now();
    try {
      window.fetch(RELAY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room, msg }),
        keepalive: true,     /* ให้ 'bye' ตอนปิดแท็บส่งออกทัน */
      }).catch(() => { /* ignore */ });
    } catch { /* ignore */ }
  };

  /* จังหวะ poll: ถี่ตอนกำลังเจรจาสาย ห่างตอนอยู่เฉย ๆ — และทุก request จบในตัว
     ไม่ค้างเป็น long-poll เพราะหน้าที่ค้าง request ไว้จะไม่มีวัน "network idle"
     แล้ว `chrome --headless --screenshot` ที่ใช้ตรวจงานใน repo นี้จะแขวนค้าง */
  const relayDelay = () => (Date.now() - relayActivityAt < RELAY_ACTIVE_WINDOW_MS
    ? RELAY_BUSY_MS
    : RELAY_IDLE_MS);

  const relayLoop = async () => {
    while (!closed && relayActive) {
      try {
        relayAbort = new AbortController();
        const res = await window.fetch(
          `${RELAY_URL}?room=${encodeURIComponent(room)}&since=${relayCursor}`,
          { signal: relayAbort.signal, cache: 'no-store' },
        );
        if (!res.ok) throw new Error('relay-not-ok');
        const data = await res.json();
        if (typeof data?.cursor === 'number') relayCursor = data.cursor;
        const messages = data?.messages || [];
        if (messages.length) relayActivityAt = Date.now();
        messages.forEach(handle);
        if (closed) return;
        await new Promise((resolve) => { window.setTimeout(resolve, relayDelay()); });
      } catch {
        if (closed) return;
        /* dev server รีสตาร์ท / เน็ตสะดุด — รอแล้วต่อใหม่ ไม่ต้องล้มทั้ง session */
        await new Promise((resolve) => { window.setTimeout(resolve, RELAY_RETRY_MS); });
      }
    }
  };

  const startRelay = async () => {
    if (typeof window === 'undefined' || typeof window.fetch !== 'function') return;
    try {
      const res = await window.fetch(`${RELAY_URL}?probe=1`, { cache: 'no-store' });
      if (!res.ok) return;
      /* โฮสต์ static จะตอบ index.html กลับมาเป็น 200 — ต้องเช็คว่าเป็น JSON จริง */
      if (!/application\/json/i.test(res.headers.get('content-type') || '')) return;
      const data = await res.json();
      if (data?.ok !== true || closed) return;
      relayActive = true;
      relayCursor = typeof data.cursor === 'number' ? data.cursor : 0;
      notifyPeer();
      relayLoop();
      /* ข้ามเครื่องไม่มี localStorage ร่วมกัน — ต้องเต้นชีพจรเองเพื่อให้ hasPeer ทำงาน */
      relayBeatId = window.setInterval(() => {
        if (!closed) post(TELEMED_SESSION_EVENTS.ping);
      }, HEARTBEAT_MS);
      post(TELEMED_SESSION_EVENTS.hello);
    } catch { /* ไม่มี relay — ใช้ช่องในเครื่องต่อไป */ }
  };

  /* ── ส่งออกทุกช่องทางที่เปิดอยู่ ──────────────────────────────────────── */

  const post = (type, payload = {}) => {
    if (closed) return false;
    if (!supported && !relayActive) return false;
    const msg = { channel: CHANNEL, room, tabId, role, type, msgId: newId(), at: Date.now(), ...payload };
    if (channel) {
      try { channel.postMessage(msg); } catch { /* ignore */ }
    }
    if (hasStorage) {
      /* เขียนลง relay key เสมอ เพื่อให้แท็บที่ไม่มี BroadcastChannel ก็ได้ยิน */
      try { window.localStorage.setItem(RELAY_KEY, JSON.stringify(msg)); } catch { /* ignore */ }
    }
    relayPost(msg);
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
    if (dup !== localDuplicate) {
      const wasDuplicate = isDuplicate();
      localDuplicate = dup;
      if (isDuplicate() !== wasDuplicate) {
        onMessage?.(isDuplicate()
          ? { type: 'duplicate', role, tabId: sameRole.tabId }
          : { type: 'duplicate-cleared', role, tabId });
      }
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
  startRelay();

  const close = () => {
    if (closed) return;
    post(TELEMED_SESSION_EVENTS.bye);
    closed = true;
    if (heartbeatId != null) window.clearInterval(heartbeatId);
    if (relayBeatId != null) window.clearInterval(relayBeatId);
    relayActive = false;
    try { relayAbort?.abort(); } catch { /* ignore */ }
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
    room,
    supported,
    get transport() { return transportName(); },
    get relay() { return relayActive; },
    tabId,
    hasPeer: () => Date.now() - peerSeenAt < PRESENCE_TTL_MS,
    isDuplicate,
  };
};

/** ข้อความอธิบายช่องทางที่ใช้อยู่ — แสดงบนแบนเนอร์สถานะการจับคู่ */
export const transportLabel = (transport) => {
  switch (transport) {
    case 'broadcast+relay':
    case 'storage+relay':
    case 'relay':     return 'จับคู่ข้ามเครื่องผ่าน dev server (โน้ตบุ๊ก ↔ มือถือ บน Wi-Fi เดียวกัน)';
    case 'broadcast': return 'จับคู่ข้ามแท็บด้วย BroadcastChannel';
    case 'storage':   return 'จับคู่ข้ามแท็บด้วย localStorage (เบราว์เซอร์นี้ไม่รองรับ BroadcastChannel)';
    default:          return 'เบราว์เซอร์นี้จับคู่ข้ามแท็บไม่ได้ — ใช้โหมดสาธิตในแท็บเดียว';
  }
};
