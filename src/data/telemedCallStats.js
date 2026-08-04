/* สถิติการปรึกษาทางไกล + บันทึกการเข้าใช้งาน (TOR §1.13.10 / §1.13.11).

   หมายเหตุ: audit log กลาง (src/pages/audit/auditData.js) เป็น LOG ใน
   หน่วยความจำที่ append ได้อย่างเดียวและไม่มี persistence — พอ refresh
   เหตุการณ์ที่ผู้ใช้ทำระหว่าง session จะหายไป. ไฟล์นี้จึง seed เหตุการณ์
   ย้อนหลังของโมดูล Telemedicine ไว้เอง แล้วหน้า /telemed/reports รวม
   (seed + live audit) ก่อนแสดง — แท็บจะไม่ว่างเปล่าเมื่อเพิ่งเปิดหน้า. */

const pad2 = (n) => String(n).padStart(2, '0');

const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
};

const atDay = (n, h, m) => {
  const d = daysAgo(n);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
};

export const formatStatDate = (iso) => {
  const d = new Date(iso);
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear() + 543}`;
};

export const formatStatTime = (iso) => {
  const d = new Date(iso);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
};

export const formatMinutes = (min) => {
  if (min == null) return '—';
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? `${h} ชม. ${m} นาที` : `${m} นาที`;
};

/* ── ผลลัพธ์ของสาย ──────────────────────────────────────────────────── */
export const CALL_OUTCOME = {
  completed: { label: 'สำเร็จ',           tone: 'green' },
  noshow:    { label: 'ผู้รับบริการไม่เข้าห้อง (No-show)', tone: 'orange' },
  dropped:   { label: 'สัญญาณหลุด',       tone: 'red' },
  declined:  { label: 'ปฏิเสธการเข้าร่วม', tone: 'grey' },
};

export const CALL_DIRECTION = {
  in:  { label: 'สายเข้า (ผู้รับบริการเรียก)', tone: 'teal' },
  out: { label: 'สายออก (หน่วยบริการเรียก)',   tone: 'indigo' },
};

const DOCTORS = ['พญ.สมหญิง รักษาดี', 'นพ.ธนกร ใจดี', 'พญ.วราภรณ์ สุขใจ', 'นพ.ปรัชญา อินทรวิเชียร'];
const UNITS = [
  'รพ.สต. บางบัวทอง 2',
  'ศบส.4 ดินแดง (หน่วยชุมชน)',
  'ศบส.41 คลองเตย (ชุมชนล็อค 1-2-3)',
  'รพ.สต. คลองสามวา',
  'ศบส.21 วัดธาตุทอง (หน่วยเคลื่อนที่)',
  'ศบส.15 ลาดพร้าว',
];
const PATIENTS = [
  { hn: '67-00001', name: 'นายสมชาย มีสุข' },
  { hn: '67-00002', name: 'นางสาวดวงใจ พินิจ' },
  { hn: '67-00005', name: 'นางสาวกาญจนา ศรีสุข' },
  { hn: '67-00007', name: 'นางบุญมา ทองดี' },
  { hn: '67-00009', name: 'นายวิเชียร มั่นคง' },
  { hn: '67-00011', name: 'นายประเสริฐ วัฒนกุล' },
  { hn: '67-00013', name: 'นางมาลี ศรีวิไล' },
  { hn: '67-00016', name: 'นายอนุชา เรืองศรี' },
];

/* กระจายสาย 96 รายการย้อนหลัง 30 วัน — deterministic (ไม่ใช้ Math.random
   ตอน build) เพื่อให้ตัวเลขบนกราฟกับตารางตรงกันทุกครั้งที่ re-render */
const buildCalls = () => {
  const rows = [];
  for (let i = 0; i < 96; i += 1) {
    const dayOffset = i % 30;
    const hour = 8 + (i % 9);
    const minute = (i * 7) % 60;
    const doctor = DOCTORS[i % DOCTORS.length];
    const unit = UNITS[i % UNITS.length];
    const patient = PATIENTS[i % PATIENTS.length];
    const direction = i % 3 === 0 ? 'out' : 'in';
    const outcome =
      i % 13 === 0 ? 'noshow'
        : i % 17 === 0 ? 'dropped'
          : i % 23 === 0 ? 'declined'
            : 'completed';
    const durationMin = outcome === 'completed' ? 8 + ((i * 3) % 26) : (outcome === 'dropped' ? 2 + (i % 4) : 0);
    rows.push({
      id: `CALL-${1000 + i}`,
      at: atDay(dayOffset, hour, minute),
      direction,
      outcome,
      durationMin,
      doctor,
      unit,
      hn: patient.hn,
      name: patient.name,
      recorded: outcome === 'completed' && i % 4 !== 0,
      consented: i % 4 !== 0,
    });
  }
  return rows.sort((a, b) => new Date(b.at) - new Date(a.at));
};

export const TELEMED_CALLS = buildCalls();

export const getTelemedCalls = () => TELEMED_CALLS.map((c) => ({ ...c }));

/** กรองตามช่วงวัน / แพทย์ / หน่วยบริการ */
export const filterCalls = (calls, { from, to, doctor = 'all', unit = 'all', direction = 'all', outcome = 'all' } = {}) =>
  calls.filter((c) => {
    const t = new Date(c.at).getTime();
    if (from && t < new Date(from).setHours(0, 0, 0, 0)) return false;
    if (to && t > new Date(to).setHours(23, 59, 59, 999)) return false;
    if (doctor !== 'all' && c.doctor !== doctor) return false;
    if (unit !== 'all' && c.unit !== unit) return false;
    if (direction !== 'all' && c.direction !== direction) return false;
    if (outcome !== 'all' && c.outcome !== outcome) return false;
    return true;
  });

/** สรุปตัวเลขของชุดที่กรองแล้ว */
export const summarizeCalls = (calls) => {
  const completed = calls.filter((c) => c.outcome === 'completed');
  const totalMin = completed.reduce((s, c) => s + c.durationMin, 0);
  const recorded = calls.filter((c) => c.recorded).length;
  const consented = calls.filter((c) => c.consented).length;
  return {
    total: calls.length,
    callsIn: calls.filter((c) => c.direction === 'in').length,
    callsOut: calls.filter((c) => c.direction === 'out').length,
    completed: completed.length,
    noshow: calls.filter((c) => c.outcome === 'noshow').length,
    dropped: calls.filter((c) => c.outcome === 'dropped').length,
    declined: calls.filter((c) => c.outcome === 'declined').length,
    totalMin,
    avgMin: completed.length ? Math.round(totalMin / completed.length) : 0,
    recorded,
    recordedPct: calls.length ? Math.round((recorded / calls.length) * 100) : 0,
    consented,
    consentPct: calls.length ? Math.round((consented / calls.length) * 100) : 0,
  };
};

/** จัดกลุ่มตามคีย์ → [{ key, count, minutes, share }] เรียงมาก→น้อย */
export const groupCalls = (calls, key) => {
  const map = new Map();
  calls.forEach((c) => {
    const k = c[key];
    const cur = map.get(k) || { key: k, count: 0, minutes: 0 };
    cur.count += 1;
    cur.minutes += c.durationMin;
    map.set(k, cur);
  });
  const rows = Array.from(map.values()).sort((a, b) => b.count - a.count);
  const total = rows.reduce((s, r) => s + r.count, 0) || 1;
  return rows.map((r) => ({ ...r, share: Math.round((r.count / total) * 100) }));
};

/** สายต่อเดือน (ย้อนหลัง 6 เดือน) สำหรับกราฟแท่ง */
export const monthlySeries = (calls) => {
  const months = [];
  for (let i = 5; i >= 0; i -= 1) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString('th-TH', { month: 'short' }) });
  }
  const counts = months.map((m) => {
    const [y, mo] = m.key.split('-').map(Number);
    return calls.filter((c) => {
      const d = new Date(c.at);
      return d.getFullYear() === y && d.getMonth() === mo;
    }).length;
  });
  return { months: months.map((m) => m.label), counts };
};

/** สายรายช่วงเวลาของวัน */
export const hourlyBuckets = (calls) => {
  const buckets = [
    { label: '08:00–10:00', from: 8,  to: 10 },
    { label: '10:00–12:00', from: 10, to: 12 },
    { label: '13:00–15:00', from: 13, to: 15 },
    { label: '15:00–17:00', from: 15, to: 17 },
    { label: 'หลัง 17:00',   from: 17, to: 24 },
  ];
  return buckets.map((b) => ({
    label: b.label,
    value: calls.filter((c) => {
      const h = new Date(c.at).getHours();
      return h >= b.from && h < b.to;
    }).length,
  }));
};

/* ── seed audit ของโมดูล Telemedicine (TOR §1.13.11) ─────────────────── */
export const TELEMED_AUDIT_ACTIONS = [
  'เข้าสู่ระบบ Telemedicine',
  'เปิดห้องตรวจทางไกล',
  'เข้าร่วมสาย',
  'ออกจากสาย',
  'เริ่มบันทึกวิดีโอ',
  'หยุดบันทึกวิดีโอ',
  'ให้ความยินยอม PDPA',
  'ปฏิเสธความยินยอม PDPA',
  'เพิกถอนความยินยอม',
  'เปิดดูเวชระเบียน (EMR) ระหว่างสาย',
  'บันทึกการประเมิน',
  'แก้ไขการประเมิน',
  'ยกเลิกการประเมิน',
  'สั่งยา / สั่งตรวจระหว่างสาย',
  'ส่งข้อความแจ้งเตือนก่อนคิว',
];

const AUDIT_USERS = [
  'พญ.สมหญิง รักษาดี',
  'นพ.ธนกร ใจดี',
  'พว.กนกวรรณ ศรีทอง',
  'นายวีรยุทธ พงษ์ไพศาล',
  'นายอธิป ธำรงรัตน์',
  'พญ.วราภรณ์ สุขใจ',
];

const buildAuditSeed = () => {
  const rows = [];
  for (let i = 0; i < 64; i += 1) {
    const dayOffset = i % 14;
    const hour = 8 + (i % 10);
    const minute = (i * 11) % 60;
    const ok = i % 19 !== 0;
    rows.push({
      id: `TAUD-${2000 + i}`,
      at: atDay(dayOffset, hour, minute),
      user: AUDIT_USERS[i % AUDIT_USERS.length],
      action: TELEMED_AUDIT_ACTIONS[i % TELEMED_AUDIT_ACTIONS.length],
      hn: PATIENTS[i % PATIENTS.length].hn,
      name: PATIENTS[i % PATIENTS.length].name,
      ip: `10.20.${30 + (i % 5)}.${100 + (i % 40)}`,
      ok,
      result: ok ? 'สำเร็จ' : 'ล้มเหลว (สิทธิ์ไม่พอ)',
    });
  }
  return rows.sort((a, b) => new Date(b.at) - new Date(a.at));
};

export const TELEMED_AUDIT_SEED = buildAuditSeed();

export const getTelemedAuditSeed = () => TELEMED_AUDIT_SEED.map((r) => ({ ...r }));

/** สถิติที่ป้อน TelemedCallStatsCard (DashboardCards) */
export const toCallStatsCardProps = (summary, byDoctor) => ({
  avgDuration: `${String(Math.floor(summary.avgMin / 60)).padStart(2, '0')}:${String(summary.avgMin % 60).padStart(2, '0')}`,
  callsIn: String(summary.callsIn),
  callsOut: String(summary.callsOut),
  doctors: byDoctor.slice(0, 4).map((d) => ({ name: d.key, count: String(d.count), share: d.share })),
  donut: [
    { value: summary.callsIn,  color: '#14B8A6', label: 'สายเข้า' },
    { value: summary.callsOut, color: '#6366F1', label: 'สายออก' },
  ],
});
