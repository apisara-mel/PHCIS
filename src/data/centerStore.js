/* PHCIS | Assess-control — Service center registry (Figma 4D3nTx53 · 4:21032).
   Mock persistence via localStorage. */

const STORAGE_KEY = 'mih:service-centers';

const uid = () => `center-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const PROVINCE_LABELS = {
  bkk: 'กรุงเทพฯ',
  nonthaburi: 'นนทบุรี',
  samutprakan: 'สมุทรปราการ',
  pathumthani: 'ปทุมธานี',
};

const DISTRICT_LABELS = {
  dindaeng: 'ดินแดง',
  watthana: 'วัฒนา',
  bangsue: 'บางซื่อ',
  phranakhon: 'พระนคร',
};

const SUBDISTRICT_LABELS = {
  dindaeng: 'ดินแดง',
  samsennai: 'สามเสนใน',
};

export const DEMO_CENTERS = [
  {
    id: 'center-dindaeng',
    code: '4',
    name: 'ดินแดง',
    location: {
      zip: '10400',
      province: 'bkk',
      district: 'dindaeng',
      subdistrict: 'dindaeng',
      road: 'ประชาสงเคราะห์',
      moo: '',
      no: '395',
    },
    phones: ['0 2246 1553'],
    emails: ['healthcenter4@hotmail.com'],
    website: 'office.bangkok.go.th',
    hours: { inStart: '08:00', inEnd: '16:00', outStart: '17:00', outEnd: '20:00' },
    active: true,
    draft: false,
  },
];

export function readCenters() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw == null) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeCenters(centers) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(centers));
}

export function createCenter(payload) {
  const {
    code,
    name,
    location = {},
    phones = [],
    emails = [],
    website = '',
    hours = {},
    draft = false,
  } = payload;

  return {
    id: uid(),
    code: String(code || '').trim(),
    name: String(name || '').trim(),
    location,
    phones: phones.map((p) => String(p).trim()).filter(Boolean),
    emails: emails.map((e) => String(e).trim()).filter(Boolean),
    website: String(website || '').trim(),
    hours: {
      inStart: hours.inStart || '08:00',
      inEnd: hours.inEnd || '16:00',
      outStart: hours.outStart || '17:00',
      outEnd: hours.outEnd || '20:00',
    },
    active: true,
    draft: !!draft,
  };
}

export function computeCenterStats(centers) {
  const published = (centers || []).filter((c) => !c.draft);
  return {
    total: published.length,
    active: published.filter((c) => c.active).length,
    inactive: published.filter((c) => !c.active).length,
  };
}

export function isDuplicateCenterCode(centers, code, excludeId = null) {
  const norm = String(code || '').trim();
  if (!norm) return false;
  return centers.some((c) => c.id !== excludeId && String(c.code).trim() === norm);
}

function label(map, key) {
  if (!key) return '';
  return map[key] || key;
}

export function formatCenterAddress(loc = {}) {
  const sub = label(SUBDISTRICT_LABELS, loc.subdistrict);
  const dist = label(DISTRICT_LABELS, loc.district);
  const prov = label(PROVINCE_LABELS, loc.province);
  const zip = loc.zip || '';

  const parts = [
    loc.no,
    loc.road,
    sub ? `แขวง${sub}` : '',
    dist ? `เขต${dist}` : '',
    prov ? `${prov}${zip}` : zip,
  ].filter(Boolean);

  return parts.join(' ');
}

function formatHourToken(t) {
  if (!t) return '—';
  const [h, m] = String(t).split(':');
  const hour = Number(h);
  if (Number.isNaN(hour)) return t;
  const mins = m === '00' ? '' : `.${m}`;
  return `${hour}${mins}`;
}

export function formatCenterHoursLine(hours = {}, kind) {
  if (kind === 'in') {
    return `${formatHourToken(hours.inStart)}-${formatHourToken(hours.inEnd)}น.`;
  }
  return `${formatHourToken(hours.outStart)}-${formatHourToken(hours.outEnd)}น.`;
}

export function loadDemoCenters() {
  writeCenters(DEMO_CENTERS);
  return DEMO_CENTERS;
}

/* ══════════════════════════════════════════════════════════════════════
   TOR §1.17.5.4 — ศูนย์บริการที่กำลังให้บริการ (active center)
   ══════════════════════════════════════════════════════════════════════
   แหล่งความจริงของ "ศูนย์ที่กำลังให้บริการ" คือ `useClinicFilter()` ใน
   src/components/layout/HeaderClinicContext.jsx (69 ศูนย์, mount ไว้ที่
   App.jsx และ Header/Sidebar consume อยู่แล้ว). ส่วนนี้ทำหน้าที่แค่
   **persist + broadcast** ค่านั้น เพื่อให้รีเฟรชแล้วศูนย์ที่เลือกยังอยู่ —
   ห้ามสร้าง state ศูนย์ชุดที่สาม ไม่งั้น Header กับ /users จะโชว์คนละศูนย์.

   คู่มือระบบสารสนเทศส่วนกลาง (MIS/EIS) หน้า 1-4 ระบุกติกา scope ไว้ตรง ๆ ว่า
   "ศูนย์บริการสาธารณสุขจะสามารถดูข้อมูลได้เฉพาะข้อมูลของศูนย์ฯ ตัวเองเท่านั้น"
   → การสลับศูนย์ = สลับ scope ข้อมูล (คิว/รายงาน/แจ้งเตือน/หัวกระดาษพิมพ์)
   ไม่ใช่แค่เปลี่ยน label. */

export const ACTIVE_CENTER_KEY = 'mih:active-center';

const activeCenterListeners = new Set();

/** อ่านศูนย์ที่ค้างไว้จากรอบก่อน (null = ยังไม่เคยเลือก → ใช้ค่า default ของ context). */
export function readActiveCenter() {
  try {
    const raw = localStorage.getItem(ACTIVE_CENTER_KEY);
    return raw ? String(raw) : null;
  } catch {
    return null;
  }
}

/** จำศูนย์ที่กำลังให้บริการไว้ข้ามการรีเฟรช. */
export function writeActiveCenter(value) {
  try {
    localStorage.setItem(ACTIVE_CENTER_KEY, String(value));
  } catch { /* โหมด private / storage เต็ม — ข้ามไป ไม่ให้หน้าจอพัง */ }
  activeCenterListeners.forEach((fn) => { try { fn(value); } catch { /* ignore */ } });
}

export function subscribeActiveCenter(fn) {
  activeCenterListeners.add(fn);
  return () => activeCenterListeners.delete(fn);
}

/** รายละเอียดศูนย์จากทะเบียน (ถ้ามี) — ใช้เติมเบอร์/ที่อยู่บนป๊อปอัปสลับศูนย์. */
export function findCenterDetail(centerValue) {
  const code = String(centerValue || '').replace('hc-', '');
  const all = [...readCenters(), ...DEMO_CENTERS];
  return all.find((c) => String(c.code) === code) || null;
}
