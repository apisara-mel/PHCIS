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
const settings = {
  enabled: [...DEFAULT_ENABLED],
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

export const isStickerFieldOn = (key) => {
  const field = LAB_STICKER_FIELDS.find((f) => f.key === key);
  if (field?.required) return true;
  return settings.enabled.includes(key);
};

export const setStickerField = (key, on) => {
  const field = LAB_STICKER_FIELDS.find((f) => f.key === key);
  /* Required fields are not switchable — see the note above. */
  if (!field || field.required) return;
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
