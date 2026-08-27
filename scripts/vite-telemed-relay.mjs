/* telemedSignalRelay — ช่องส่ง signalling ของ Telemedicine ระหว่าง "คนละเครื่อง"

   สายวิดีโอ WebRTC ต่อกันเองไม่ได้ถ้าไม่มีใครช่วยส่ง SDP/ICE ให้ตอนเริ่ม.
   ในเครื่องเดียวกัน BroadcastChannel ทำหน้าที่นี้ได้ แต่ตอน demo จริง
   (โน้ตบุ๊กเปิดหน้าแพทย์ · มือถือเปิด /m/telemed) เป็นคนละเบราว์เซอร์คนละเครื่อง
   จึงต้องมีคนกลาง. ที่นี่ใช้ dev server ที่มือถือต่อเข้ามาอยู่แล้วเป็นคนกลาง —
   ไม่ต้องตั้ง backend, ไม่ต้องพึ่ง broker สาธารณะ, ไม่เพิ่ม dependency.

   ขอบเขต: อยู่ในหน่วยความจำของ dev server เท่านั้น (รีสตาร์ท = ล้าง) และ
   ไม่ถูกรวมเข้า production build — บนโฮสต์ static จะไม่มี endpoint นี้
   แล้วฝั่ง client จะถอยไปใช้ BroadcastChannel เอง.

   API
     GET  /__telemed/signal?probe=1              → {ok:true}  ใช้ตรวจว่ามี relay ไหม
     GET  /__telemed/signal?room=R&since=N       → {cursor, messages[]}  (ตอบทันที)
     POST /__telemed/signal  {room, msg}         → {ok:true, cursor}

   ทำไมถึงตอบทันทีแทน long-poll: หน้าที่ค้าง request ไว้ตลอดจะไม่มีวัน
   "network idle" — `chrome --headless --screenshot / --dump-dom` ที่ repo นี้ใช้
   ตรวจงานจะค้างไปเลยทุกหน้าที่เปิด Telemedicine. ฝั่ง client จึง poll ถี่ ๆ แทน;
   signalling เกิดแค่ตอนเริ่มสาย ความหน่วง ~1 วินาทีจึงมองไม่เห็นในสายจริง.
*/

const PATH = '/__telemed/signal';
const MAX_MESSAGES = 300;      /* เก็บย้อนหลังพอให้ผู้มาทีหลังตามทัน ไม่ให้โตไม่จำกัด */
const ROOM_TTL_MS = 30 * 60 * 1000;
const MAX_BODY_BYTES = 512 * 1024;

const rooms = new Map();

const getRoom = (name) => {
  let entry = rooms.get(name);
  if (!entry) {
    entry = { seq: 0, messages: [], touched: Date.now() };
    rooms.set(name, entry);
  }
  entry.touched = Date.now();
  return entry;
};

const sweepRooms = () => {
  const now = Date.now();
  rooms.forEach((entry, name) => {
    if (now - entry.touched > ROOM_TTL_MS) rooms.delete(name);
  });
};

const sendJson = (res, status, body) => {
  const payload = JSON.stringify(body);
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  /* มือถือเข้าผ่าน IP ของ LAN ซึ่งเป็นคนละ origin กับที่โน้ตบุ๊กเปิดไว้ */
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.end(payload);
};

const readBody = (req) => new Promise((resolve, reject) => {
  let size = 0;
  const chunks = [];
  req.on('data', (chunk) => {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) {
      reject(new Error('body-too-large'));
      req.destroy();
      return;
    }
    chunks.push(chunk);
  });
  req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
  req.on('error', reject);
});

export const telemedSignalRelay = () => ({
  name: 'telemed-signal-relay',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      if (!req.url || !req.url.startsWith(PATH)) { next(); return; }

      const url = new URL(req.url, 'http://localhost');
      sweepRooms();

      if (req.method === 'OPTIONS') {
        res.statusCode = 204;
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        res.end();
        return;
      }

      if (req.method === 'POST') {
        readBody(req)
          .then((raw) => {
            let parsed = null;
            try { parsed = JSON.parse(raw); } catch { parsed = null; }
            if (!parsed || typeof parsed.room !== 'string' || !parsed.msg) {
              sendJson(res, 400, { ok: false, error: 'bad-request' });
              return;
            }
            const entry = getRoom(parsed.room);
            entry.seq += 1;
            entry.messages.push({ ...parsed.msg, __seq: entry.seq });
            if (entry.messages.length > MAX_MESSAGES) {
              entry.messages.splice(0, entry.messages.length - MAX_MESSAGES);
            }
            sendJson(res, 200, { ok: true, cursor: entry.seq });
          })
          .catch(() => sendJson(res, 413, { ok: false, error: 'body-too-large' }));
        return;
      }

      if (req.method !== 'GET') { sendJson(res, 405, { ok: false }); return; }

      if (url.searchParams.get('probe') != null) {
        sendJson(res, 200, { ok: true, cursor: 0 });
        return;
      }

      const roomName = url.searchParams.get('room');
      if (!roomName) { sendJson(res, 400, { ok: false, error: 'room-required' }); return; }
      const since = Number(url.searchParams.get('since') || 0) || 0;
      const entry = getRoom(roomName);

      /* ผู้มาทีหลัง (since=0) ไม่ควรได้ SDP เก่าของสายที่จบไปแล้วย้อนหลังทั้งกอง
         — ให้เริ่มจากตำแหน่งล่าสุดแทน แล้วรอข้อความถัดไป */
      if (since === 0 && entry.seq > 0) {
        sendJson(res, 200, { cursor: entry.seq, messages: [] });
        return;
      }

      const pending = entry.messages.filter((m) => m.__seq > since);
      sendJson(res, 200, { cursor: entry.seq, messages: pending.map(({ __seq, ...m }) => m) });
    });

    /* บอก IP ที่มือถือใช้เปิดได้ — ต้องรันด้วย `npm run dev:lan` ถึงจะผูกกับ LAN */
    server.httpServer?.once('listening', () => {
      const address = server.httpServer.address();
      if (address && typeof address === 'object' && address.address === '0.0.0.0') {
        console.log('\n  telemed relay: พร้อมจับคู่ข้ามเครื่องที่ ' + PATH + '\n');
      }
    });
  },
});

export default telemedSignalRelay;
