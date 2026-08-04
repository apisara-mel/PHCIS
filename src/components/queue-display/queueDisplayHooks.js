import { useCallback, useEffect, useRef, useState } from 'react';
import { subscribe, getHeartbeat, getLastQueueEvent } from '@/data/queueDisplayView';
import { CANVAS_H, CANVAS_W } from './queueDisplayUi';

/* queueDisplayHooks — hook ร่วมของจอ TV เรียกคิว (TOR §1.3.4)

   ⚠ React 17: โปรเจกต์นี้ยังไม่มี useSyncExternalStore / useId /
   useTransition / useDeferredValue / useInsertionEffect — import มาจะเป็น
   undefined แล้ว crash ตอน render ทุก hook ด้านล่างจึงใช้เฉพาะ
   useState / useEffect / useRef / useCallback

   ⚠ จอ TV เปิดค้างข้ามวัน: ทุก interval / rAF / listener / SpeechSynthesis
   ต้องถูกเคลียร์ใน cleanup ของ useEffect ครบทุกตัว */

/* ── นาฬิกาเดินจริง ───────────────────────────────────────────────────── */

export const useTickingClock = (intervalMs = 1000) => {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
};

/* ── การสเกลจอ ────────────────────────────────────────────────────────────
   canvas ออกแบบไว้ที่ 1920×1270 แล้วสเกลทั้งผืนด้วย
   transform: scale(min(vw/1920, vh/1270)) แบบ **contain** (letterbox)
   → 16:9 / 16:10 / 4:3 / 21:9 / 4K พอดีจอหมด ไม่ยืดสัดส่วน ไม่มี scrollbar
   → ค่าที่ได้ถูกเขียนลง CSS custom property บน root element ของจอ
     (`--qd-tv-scale`) เผื่อ CSS ภายในอยากอ้างอิง

   ใช้ 100dvh ก่อน แล้ว fallback 100vh ผ่าน window.innerHeight สำหรับ browser
   ที่ยังไม่รู้จัก dvh (จอ TV ส่วนมากรัน Chrome kiosk-mode ที่ไม่มี URL bar) */
export const useTvScale = (rootRef) => {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    let frame = 0;
    const measure = () => {
      const vw = window.innerWidth || CANVAS_W;
      const vh = window.innerHeight || CANVAS_H;
      const next = Math.min(vw / CANVAS_W, vh / CANVAS_H);
      const safe = Number.isFinite(next) && next > 0 ? next : 1;
      setScale(safe);
      const node = rootRef && rootRef.current;
      if (node && node.style) node.style.setProperty('--qd-tv-scale', String(safe));
    };
    const onResize = () => {
      if (frame) window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, [rootRef]);

  return scale;
};

/* ── อ่านข้อมูลจาก store แบบ live ─────────────────────────────────────────
   ห้ามใช้ useSyncExternalStore (React 17) — subscribe เองใน useEffect

   ⚠ สัญญาการใช้งาน: `read` ต้องเป็นฟังก์ชันที่ memoize ด้วย useCallback และ
   ใส่ทุกค่าที่ selector อ่าน (stationId / zoneId / เลขคิวที่ผู้ใช้กรอก) ไว้ใน
   deps เพราะ hook ใช้ "identity ของ read" เป็นสัญญาณว่า argument ของ selector
   เปลี่ยน แล้วอ่านค่าใหม่ให้ทันที ถ้าส่ง arrow function สด ๆ ทุก render จะ
   อ่านใหม่ทุกรอบและวนไม่จบ

   เดิม effect ผูก deps เป็น [] ทำให้ snapshot อัปเดตเฉพาะตอน store notify
   → เปลี่ยน ?zone= / ?room= หรือกด "ตรวจสอบ" เลขคิวใหม่แล้วหน้าไม่ขยับ
   จนกว่าจะมีคนกดเรียกคิว */
export const useQueueSnapshot = (read) => {
  const readRef = useRef(read);
  readRef.current = read;

  const [snapshot, setSnapshot] = useState(() => readRef.current());

  const refresh = useCallback(() => {
    setSnapshot(readRef.current());
  }, []);

  /* subscribe ครั้งเดียวตลอดอายุ component — feed ของ store ไม่ผูกกับ selector */
  useEffect(() => {
    let alive = true;
    const apply = () => {
      if (alive) setSnapshot(readRef.current());
    };
    apply();
    const unsubscribe = subscribe(apply);
    return () => {
      alive = false;
      unsubscribe();
    };
  }, []);

  /* selector เปลี่ยน argument → อ่านใหม่ทันที ไม่ต้องรอ event จาก store */
  useEffect(() => {
    setSnapshot(readRef.current());
  }, [read]);

  return [snapshot, refresh];
};

/* ── Heartbeat — จอค้างต้องรู้ตัว ─────────────────────────────────────────
   `getHeartbeat()` คือ ping ของ adapter เอง (ทุก ~15 วิ) ไม่ใช่ event ของคิว
   → "ไม่มีใครกดเรียกคิวช่วงพักเที่ยง" จึงไม่ใช่ feed ตาย และจะไม่ขึ้นแถบ
   เตือนอีกต่อไป (บั๊กเดิม: จอเปิดทิ้งไว้เฉย ๆ ขึ้น "กำลังเชื่อมต่อ..." ค้าง
   ภายใน 45 วิแรกเสมอ จนเจ้าหน้าที่เรียนรู้ที่จะเพิกเฉยกับคำเตือน)

   ช่วง "ไม่มีการเรียกคิวมาแล้ว N นาที" เป็นคนละสัญญาณ — ดู `lastQueueEvent`
   ที่คืนกลับไปด้วย และ prop `lastCallAt` ของ QueueTvFrame */
export const useHeartbeat = (staleMs = 45000) => {
  const [stale, setStale] = useState(false);
  const [lastBeat, setLastBeat] = useState(() => getHeartbeat());
  const [lastQueueEvent, setLastQueueEvent] = useState(() => getLastQueueEvent());

  useEffect(() => {
    const check = () => {
      const beat = getHeartbeat();
      setLastBeat(beat);
      setLastQueueEvent(getLastQueueEvent());
      setStale(Date.now() - beat > staleMs);
    };
    check();
    const id = window.setInterval(check, 5000);
    return () => window.clearInterval(id);
  }, [staleMs]);

  return { stale, lastBeat, lastQueueEvent };
};

/* ── เสียงเรียกคิว (TOR 1.3.4.2) ──────────────────────────────────────────
   degrade เงียบ ๆ ทุกกรณี: ไม่มี SpeechSynthesis / ไม่มีเสียงไทย /
   autoplay ถูกบล็อกเพราะยังไม่มี user gesture — ห้าม throw และห้ามขึ้น
   error บนจอสาธารณะ */
export const useQueueAnnouncer = (enabled) => {
  const supported =
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    typeof window.SpeechSynthesisUtterance === 'function';

  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  const [hasThaiVoice, setHasThaiVoice] = useState(false);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    if (!supported) return undefined;
    const synth = window.speechSynthesis;
    const scan = () => {
      let voices = [];
      try {
        voices = synth.getVoices() || [];
      } catch (err) {
        voices = [];
      }
      setHasThaiVoice(voices.some((v) => String(v.lang || '').toLowerCase().indexOf('th') === 0));
    };
    scan();
    synth.addEventListener('voiceschanged', scan);
    return () => {
      synth.removeEventListener('voiceschanged', scan);
      try {
        synth.cancel();
      } catch (err) {
        /* ปิดจอระหว่างพูดค้าง — เงียบไว้ */
      }
    };
  }, [supported]);

  /** พูดประโยคใหม่ — cancel() ของเดิมก่อนเสมอ ไม่ให้พูดทับกัน */
  const speak = useCallback(
    (text) => {
      if (!supported || !enabledRef.current || !text) return false;
      try {
        const synth = window.speechSynthesis;
        synth.cancel();
        const utter = new window.SpeechSynthesisUtterance(String(text));
        utter.lang = 'th-TH';
        utter.rate = 0.92;
        utter.volume = 1;
        const voices = synth.getVoices() || [];
        const thai = voices.find((v) => String(v.lang || '').toLowerCase().indexOf('th') === 0);
        if (thai) utter.voice = thai;
        utter.onerror = () => setBlocked(true);
        synth.speak(utter);
        setBlocked(false);
        return true;
      } catch (err) {
        setBlocked(true);
        return false;
      }
    },
    [supported],
  );

  const cancel = useCallback(() => {
    if (!supported) return;
    try {
      window.speechSynthesis.cancel();
    } catch (err) {
      /* no-op */
    }
  }, [supported]);

  return { supported, hasThaiVoice, blocked, speak, cancel };
};

/* ── เอฟเฟกต์กระพริบตอนมีคิวใหม่ ─────────────────────────────────────────
   คืนค่า true ชั่วคราวเมื่อ `signature` เปลี่ยน (เลขคิว + ครั้งที่เรียก)
   timer เก่าถูก clear ก่อนเสมอ → เรียกซ้ำรัว ๆ ไม่กระพริบซ้อนกัน */
export const usePulseOnChange = (signature, durationMs = 2600) => {
  const [pulsing, setPulsing] = useState(false);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return undefined;
    }
    if (!signature) return undefined;
    setPulsing(true);
    const id = window.setTimeout(() => setPulsing(false), durationMs);
    return () => window.clearTimeout(id);
  }, [signature, durationMs]);

  return pulsing;
};

/* ── ตรวจจับ "มีการเรียกคิวใหม่" ของหลายจุดบริการพร้อมกัน ────────────────
   entries: [{ key, sig, speech }]  — `sig` = เลขคิว + ครั้งที่เรียก
   เมื่อ sig ของ key ใดเปลี่ยน → ตั้ง pulse ของ key นั้น แล้วเรียก onCall
   (หน้าเพจใช้ onCall ไปสั่งอ่านออกเสียง) timer เดิมของ key ถูก clear ก่อน
   เสมอ → เรียกซ้ำรัว ๆ ไม่ทำให้แอนิเมชันซ้อนกัน */
export const useQueueCallEvents = (entries, onCall, durationMs = 2600) => {
  const [pulses, setPulses] = useState({});
  const seenRef = useRef({});
  const timersRef = useRef({});
  const onCallRef = useRef(onCall);
  onCallRef.current = onCall;

  const fingerprint = (entries || []).map((e) => `${e.key}:${e.sig}`).join('|');

  useEffect(() => {
    const list = entries || [];
    const seen = seenRef.current;
    const timers = timersRef.current;
    const changed = [];

    list.forEach((entry) => {
      const known = Object.prototype.hasOwnProperty.call(seen, entry.key);
      if (known && seen[entry.key] !== entry.sig && entry.sig) changed.push(entry);
      seen[entry.key] = entry.sig;
    });

    if (!changed.length) return undefined;

    changed.forEach((entry) => {
      if (timers[entry.key]) window.clearTimeout(timers[entry.key]);
      setPulses((prev) => ({ ...prev, [entry.key]: true }));
      timers[entry.key] = window.setTimeout(() => {
        setPulses((prev) => ({ ...prev, [entry.key]: false }));
        delete timers[entry.key];
      }, durationMs);
    });

    /* อ่านออกเสียงเฉพาะรายการล่าสุด — พูดพร้อมกันสามแผนกฟังไม่รู้เรื่อง
       และ SpeechSynthesis จะ cancel ของก่อนหน้าอยู่แล้ว */
    if (onCallRef.current) onCallRef.current(changed[changed.length - 1]);
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fingerprint, durationMs]);

  /* จอเปิดค้าง 12 ชม. — เคลียร์ timer ที่ค้างทุกตัวตอน unmount */
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      Object.keys(timers).forEach((k) => window.clearTimeout(timers[k]));
    };
  }, []);

  return pulses;
};

/* ── Fullscreen + ซ่อน cursor + กันจอดับ ─────────────────────────────── */

export const useFullscreen = () => {
  const [active, setActive] = useState(false);

  useEffect(() => {
    const onChange = () => setActive(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  /** ออกด้วย Esc แล้วกดปุ่มเดิมกลับเข้าได้ (state ผูกกับ fullscreenchange) */
  const toggle = useCallback(() => {
    try {
      if (document.fullscreenElement) {
        if (document.exitFullscreen) document.exitFullscreen();
      } else if (document.documentElement.requestFullscreen) {
        const p = document.documentElement.requestFullscreen();
        if (p && typeof p.catch === 'function') p.catch(() => {});
      }
    } catch (err) {
      /* browser ไม่รองรับ → ข้ามเงียบ ๆ */
    }
  }, []);

  return { active, toggle };
};

/** ซ่อน cursor เมื่อไม่ขยับเมาส์เกิน idleMs (จอ TV ไม่มีคนคุม) */
export const useIdleCursor = (idleMs = 4000) => {
  const [idle, setIdle] = useState(false);

  useEffect(() => {
    let timer = window.setTimeout(() => setIdle(true), idleMs);
    const wake = () => {
      setIdle(false);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setIdle(true), idleMs);
    };
    window.addEventListener('mousemove', wake);
    window.addEventListener('touchstart', wake);
    window.addEventListener('keydown', wake);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('mousemove', wake);
      window.removeEventListener('touchstart', wake);
      window.removeEventListener('keydown', wake);
    };
  }, [idleMs]);

  return idle;
};

/** ขอ wakeLock ถ้ามี — ถ้าไม่มีให้ข้ามเงียบ ๆ ตามสเปก */
export const useScreenWakeLock = (active = true) => {
  useEffect(() => {
    if (!active) return undefined;
    if (typeof navigator === 'undefined' || !navigator.wakeLock) return undefined;
    let sentinel = null;
    let cancelled = false;

    const request = () => {
      try {
        const p = navigator.wakeLock.request('screen');
        if (p && typeof p.then === 'function') {
          p.then((s) => {
            if (cancelled) {
              try { s.release(); } catch (err) { /* no-op */ }
              return;
            }
            sentinel = s;
          }).catch(() => {});
        }
      } catch (err) {
        /* ไม่รองรับ → ข้าม */
      }
    };
    request();

    /* กลับมา visible อีกครั้ง (เช่นสลับ input จอ TV) ต้องขอใหม่ */
    const onVisible = () => {
      if (document.visibilityState === 'visible' && !sentinel) request();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      if (sentinel) {
        try { sentinel.release(); } catch (err) { /* no-op */ }
        sentinel = null;
      }
    };
  }, [active]);
};

/* ── ค่าที่จอจำได้เองหลังไฟดับ ─────────────────────────────────────────── */

/** key ของ localStorage ที่ launcher กับจอ TV ใช้ร่วมกัน */
export const STORAGE_KEYS = {
  sound: 'mih:queue-display:sound',
  layout: 'mih:queue-display:layout',
  zone: 'mih:queue-display:zone',
  station: 'mih:queue-display:station',
  ticket: 'mih:queue-display:ticket',
};

const readStored = (key, fallback) => {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch (err) {
    return fallback;
  }
};

/** localStorage-backed state — ให้จอ TV เปิดซ้ำเองได้ด้วยค่าเดิม */
export const useStoredSetting = (key, fallback) => {
  const [value, setValue] = useState(() => readStored(key, fallback));
  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      /* โหมด private / โควตาเต็ม → ข้ามเงียบ ๆ */
    }
  }, [key, value]);
  return [value, setValue];
};
