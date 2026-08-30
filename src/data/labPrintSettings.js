/* Lab sticker / report print settings.

   TOR ภาคผนวก ก §1.15.5.1 — "สามารถกำหนดข้อมูลบนสติกเกอร์ Lab ได้ตามเงื่อนไข
   ที่สำนักอนามัยกำหนด และสามารถพิมพ์สติกเกอร์ Lab ได้".

   The operative half is "กำหนดข้อมูล…ได้ตามเงื่อนไขที่สำนักอนามัยกำหนด": the
   field set is a configuration, not a hard-coded layout, because the
   สำนักอนามัย may specify a different one per site or revise it later. So
   the sticker renders whichever fields are switched on here, and the Setup
   page edits this list.

   `required: true` marks fields that cannot be switched off — a specimen
   label without an accession barcode or without a patient identifier is a
   patient-safety hazard, not a formatting preference. Those two are what
   make the tube traceable and matchable to a human being. */

export const LAB_STICKER_FIELDS = [
  /* ชื่อหน่วยบริการเคยพิมพ์ติดมาเสมอโดยไม่มีสวิตช์ — ตอนนี้ปิดได้ (มติผู้ใช้ 31 ส.ค. 69)
     บางศูนย์ใช้ม้วนสติกเกอร์เล็กจนบรรทัดนี้กินที่ของชื่อผู้ป่วย */
  { key: 'siteName',    label: 'ชื่อหน่วยบริการ',            required: false, hint: 'พิมพ์หัวสติกเกอร์ทุกใบ' },
  { key: 'barcode',     label: 'บาร์โค้ด + Accession',      required: true,  hint: 'ใช้สแกนที่หน้า Worklist' },
  { key: 'patientName', label: 'ชื่อ-นามสกุลผู้ป่วย',        required: true,  hint: 'ตัวระบุที่ 1' },
  { key: 'hn',          label: 'HN',                        required: true,  hint: 'ตัวระบุที่ 2' },
  { key: 'ageSex',      label: 'อายุ / เพศ',                 required: false, hint: 'ช่วยยืนยันตัวผู้ป่วยหน้าเตียง' },
  { key: 'testNames',   label: 'รายการตรวจ',                required: false, hint: 'บอกว่าหลอดนี้ส่งตรวจอะไร' },
  { key: 'tube',        label: 'ชนิดหลอด + สีจุก',           required: false, hint: 'กันเจาะผิดหลอด' },
  { key: 'volume',      label: 'ปริมาตรที่ต้องเก็บ',          required: false, hint: '' },
  { key: 'collectedAt', label: 'วัน-เวลาที่เก็บ',             required: false, hint: 'ใช้ดูเวลา stability ของตัวอย่าง' },
  { key: 'location',    label: 'จุดสั่ง / ward',              required: false, hint: '' },
  { key: 'doctor',      label: 'แพทย์ผู้สั่ง',                required: false, hint: '' },
  { key: 'urgency',     label: 'ความเร่งด่วน (STAT/ด่วน)',    required: false, hint: 'STAT ต้องเห็นชัดบนหลอด' },
  { key: 'fasting',     label: 'เงื่อนไขงดอาหาร',            required: false, hint: 'เตือนกรณีผู้ป่วยไม่ได้งด' },
];

/* Default field set — everything except the two most situational. Chosen so
   a freshly installed site prints a usable label without configuring
   anything first. */
const DEFAULT_ENABLED = [
  'barcode', 'patientName', 'hn', 'ageSex', 'testNames', 'tube',
  'volume', 'collectedAt', 'location', 'urgency',
];

/* Mutable settings + subscribe/notify, same minimal store shape as
   labCatalog.js and labOrders.js — no backend behind any of this. */
/* ขนาดสติกเกอร์ตามม้วนกระดาษความร้อนที่ห้องแล็บใช้จริง (มติผู้ใช้ 31 ส.ค. 69)
   50 × 25 มม. เป็นขนาดมาตรฐานที่พันรอบหลอดเลือด 13 × 75 มม. ได้พอดี ส่วนขนาดอื่น
   มีไว้สำหรับม้วนที่หน่วยงานมีอยู่เดิม (เล็กสำหรับหลอดจิ๋ว · ใหญ่สำหรับติดใบส่งตรวจ) */
export const LAB_STICKER_SIZES = [
  { value: '25x13', label: '25 × 13 มม. (หลอดเล็ก / ไมโครเทนเนอร์)', width: '25mm', height: '13mm' },
  { value: '38x25', label: '38 × 25 มม.', width: '38mm', height: '25mm' },
  { value: '50x25', label: '50 × 25 มม. (มาตรฐานหลอดเลือด)', width: '50mm', height: '25mm' },
  { value: '57x32', label: '57 × 32 มม.', width: '57mm', height: '32mm' },
  { value: '60x30', label: '60 × 30 มม. (ติดใบส่งตรวจ)', width: '60mm', height: '30mm' },
];

export const getStickerSize = (value) =>
  LAB_STICKER_SIZES.find((z) => z.value === value) || LAB_STICKER_SIZES[2];

const settings = {
  enabled: [...DEFAULT_ENABLED],
  stickerSize: '50x25',
  /* Printed at the top of every sticker and report so a tube that travels
     between sites is attributable. */
  siteName: 'ศูนย์บริการสาธารณสุข 4 ดินแดง',
  /* Two labels side by side is the common thermal-roll layout; one-up is
     used where the roll is narrow. */
  copiesPerTube: 1,
};

const listeners = new Set();

export const subscribePrintSettings = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

const notify = () => listeners.forEach((fn) => fn());

export const getPrintSettings = () => ({ ...settings, enabled: [...settings.enabled] });

/* ทุกช่องปิดได้จริง — ไม่บังคับ `required` ให้ติดค้างอีกแล้ว (มติผู้ใช้ 31 ส.ค. 69) */
export const isStickerFieldOn = (key) => {
  const field = LAB_STICKER_FIELDS.find((f) => f.key === key);
  if (!field) return false;
  return settings.enabled.includes(key);
};

/* ทุกช่องสลับเปิด-ปิดได้ รวมถึงช่องที่เคยตั้งเป็น `required` (มติผู้ใช้ 31 ส.ค. 69)
   — ธง `required` ยังอยู่ในแคตตาล็อกเพื่อบอกว่าช่องไหนเป็นตัวระบุที่จำเป็นต่อความ
   ปลอดภัยผู้ป่วย แต่ไม่ใช้บล็อกการปิดอีกแล้ว */
export const setStickerField = (key, on) => {
  const field = LAB_STICKER_FIELDS.find((f) => f.key === key);
  if (!field) return;
  settings.enabled = on
    ? [...new Set([...settings.enabled, key])]
    : settings.enabled.filter((k) => k !== key);
  notify();
};

export const setPrintSetting = (key, value) => {
  settings[key] = value;
  notify();
};

/* ─────────────────────────────────────────────────────────────────────────
   PRINT MODE

   One page can hold several print-only documents (the sticker sheet and the
   collection report). A root `data-lab-print-mode` attribute decides which
   one @media print reveals, so the two print buttons never print each
   other's content — same mechanism PharmacyLabelPrint.jsx uses for its
   label / prescription / aux-label split. */
/* The print visibility switch. Injected here rather than in any one print
   component because each lab print surface (sticker sheet, collection
   report, patient report) can mount on its own route without the others —
   and a page that renders a `.mih-lab-print-only` document without this
   stylesheet shows it on screen. Idempotent, module-load, same pattern as
   the chrome-free input styles elsewhere in the project. */
if (typeof document !== 'undefined') {
  /* Create-or-UPDATE, not create-if-missing. A create-if-missing guard goes
     stale under HMR: the tag from the previous module generation survives,
     the guard sees it and skips, and edits to these rules silently never
     take effect. Rewriting textContent every evaluation is the pattern
     CLAUDE.md calls for ("so HMR picks up edits without leaving a stale
     <style> tag behind"). */
  let el = document.getElementById('mih-lab-print-style');
  if (!el) {
    el = document.createElement('style');
    el.id = 'mih-lab-print-style';
    document.head.appendChild(el);
  }
  el.textContent = `
    .mih-lab-print-only { display: none; }
    @media print {
      body > *:not(.mih-lab-print-root) { display: none !important; }
      .mih-lab-no-print { display: none !important; }
      html[data-lab-print-mode="sticker"]    .mih-lab-print-only.mih-lab-print-sticker    { display: block !important; }
      html[data-lab-print-mode="collection"] .mih-lab-print-only.mih-lab-print-collection { display: block !important; }
      html[data-lab-print-mode="patient"]    .mih-lab-print-only.mih-lab-print-patient    { display: block !important; }
      /* Added with the send-out station and the cumulative history sheet.
         Both follow the same rule as the three above: the on-screen preview
         and the paper render from ONE component, and the mode attribute
         decides which of the page's print-only documents is revealed. */
      html[data-lab-print-mode="manifest"]   .mih-lab-print-only.mih-lab-print-manifest   { display: block !important; }
      html[data-lab-print-mode="cumulative"] .mih-lab-print-only.mih-lab-print-cumulative { display: block !important; }
      .mih-lab-sticker { break-inside: avoid; page-break-inside: avoid; }
    }
  `;
}

export const printLab = (mode) => {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-lab-print-mode', mode);
  window.print();
  /* Clear it after the print dialog returns so a later plain window.print()
     (e.g. the result printout in LabDetailPanel) is not hijacked. */
  window.setTimeout(() => {
    document.documentElement.removeAttribute('data-lab-print-mode');
  }, 500);
};
