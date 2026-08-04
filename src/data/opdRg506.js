/* TOR 1.2.3.6 — รง.506 surveillance reporting store (EPI-NET).
   Cases are auto-detected from OPD diagnoses (mock detector output below).
   sessionStorage-backed; status transitions are append-only audit events.
   EPI-NET is an external government system — "ส่งเข้าระบบ" here is mocked as a
   status transition + export-file stub. */

const STORAGE_KEY = 'mih:opd-rg506';

const canUseSessionStorage = () =>
  typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';

export const RG506_STATUS = {
  draft: { label: 'ร่าง', badge: 'warning' },
  saved: { label: 'บันทึกแล้ว', badge: 'info' },
  sent: { label: 'ส่ง EPI-NET แล้ว', badge: 'success' },
};

/* กลุ่มโรคเฝ้าระวังที่ mock detector จับจาก ICD-10 ของ OPD วันนี้ */
export const SURVEILLANCE_DISEASES = [
  { code: 'A90', label: 'ไข้เลือดออก (DF/DHF)' },
  { code: 'J11', label: 'ไข้หวัดใหญ่ (Influenza)' },
  { code: 'A15', label: 'วัณโรคปอด (TB)' },
  { code: 'A05', label: 'อาหารเป็นพิษ (Food poisoning)' },
  { code: 'B08.4', label: 'มือ เท้า ปาก (HFMD)' },
  { code: 'A09', label: 'อุจจาระร่วงเฉียบพลัน' },
];

export const PATIENT_TYPES = ['ผู้ป่วยนอก', 'ผู้ป่วยใน', 'ผู้ป่วยรับส่งต่อ'];
export const PATIENT_CONDITIONS = ['หาย', 'กำลังรักษา', 'ตาย', 'ไม่ทราบ'];

const nowStamp = () => {
  const d = new Date();
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return `${date} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const dateOffset = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/* Seed cases — auto-detected จากการวินิจฉัย OPD (บริบทศูนย์บริการสาธารณสุข กทม.) */
const SEED_CASES = [
  {
    id: 'RG-2569-0012',
    reportNo: 'รง506-2569/0012',
    hn: '67-00002',
    name: 'นางสาวดวงใจ พินิจ',
    diseaseCode: 'A90',
    disease: 'ไข้เลือดออก (DF/DHF)',
    icd10: 'A90',
    onsetDate: dateOffset(-3),
    foundDate: dateOffset(-1),
    patientType: 'ผู้ป่วยนอก',
    condition: 'กำลังรักษา',
    addressWhileIll: '215/8 ถ.ประชาสงเคราะห์ แขวงดินแดง เขตดินแดง กทม. 10400',
    status: 'sent',
    sentAt: `${dateOffset(-1)} 15:42`,
    exportFile: 'EPINET-506-2569-0012.txt',
    audit: [
      { at: `${dateOffset(-1)} 14:02`, by: 'พว.กานดา ศรีวิไล', action: 'สร้างรายงาน (ตรวจจับอัตโนมัติจากการวินิจฉัย)' },
      { at: `${dateOffset(-1)} 14:20`, by: 'พว.กานดา ศรีวิไล', action: 'บันทึกรายงาน' },
      { at: `${dateOffset(-1)} 15:42`, by: 'นวก.สาธารณสุข อรทัย บุญเรือง', action: 'ส่งเข้า EPI-NET (ไฟล์ EPINET-506-2569-0012.txt)' },
    ],
  },
  {
    id: 'RG-2569-0013',
    reportNo: 'รง506-2569/0013',
    hn: '67-00005',
    name: 'นางสุดา ปลอดโปร่ง',
    diseaseCode: 'J11',
    disease: 'ไข้หวัดใหญ่ (Influenza)',
    icd10: 'J11.1',
    onsetDate: dateOffset(-2),
    foundDate: dateOffset(0),
    patientType: 'ผู้ป่วยนอก',
    condition: 'กำลังรักษา',
    addressWhileIll: '99/12 ถ.มิตรไมตรี แขวงดินแดง เขตดินแดง กทม. 10400',
    status: 'saved',
    audit: [
      { at: `${dateOffset(0)} 09:12`, by: 'พว.ธิดารัตน์ คงมั่น', action: 'สร้างรายงาน (ตรวจจับอัตโนมัติจากการวินิจฉัย)' },
      { at: `${dateOffset(0)} 09:31`, by: 'พว.ธิดารัตน์ คงมั่น', action: 'บันทึกรายงาน' },
    ],
  },
  {
    id: 'RG-2569-0014',
    reportNo: 'รง506-2569/0014',
    hn: '67-00008',
    name: 'นางสาวธนพร สุนทรา',
    diseaseCode: 'A05',
    disease: 'อาหารเป็นพิษ (Food poisoning)',
    icd10: 'A05.9',
    onsetDate: dateOffset(0),
    foundDate: dateOffset(0),
    patientType: 'ผู้ป่วยนอก',
    condition: 'หาย',
    addressWhileIll: '', // ยังไม่กรอก — required ก่อนบันทึก
    status: 'draft',
    audit: [
      { at: `${dateOffset(0)} 10:05`, by: 'ระบบตรวจจับอัตโนมัติ', action: 'สร้างร่างรายงานจากการวินิจฉัย A05.9' },
    ],
  },
  {
    id: 'RG-2569-0015',
    reportNo: 'รง506-2569/0015',
    hn: '67-00009',
    name: 'นายชูชาติ อารีย์',
    diseaseCode: 'B08.4',
    disease: 'มือ เท้า ปาก (HFMD)',
    icd10: 'B08.4',
    onsetDate: dateOffset(-1),
    foundDate: dateOffset(0),
    patientType: 'ผู้ป่วยนอก',
    condition: 'กำลังรักษา',
    addressWhileIll: '31 ซ.ประชาราษฎร์บำเพ็ญ 14 แขวงห้วยขวาง เขตห้วยขวาง กทม. 10310',
    status: 'draft',
    audit: [
      { at: `${dateOffset(0)} 10:48`, by: 'ระบบตรวจจับอัตโนมัติ', action: 'สร้างร่างรายงานจากการวินิจฉัย B08.4' },
    ],
  },
];

const read = () => {
  if (!canUseSessionStorage()) return null;
  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) || 'null');
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const write = (rows) => {
  if (!canUseSessionStorage()) return;
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
};

const ensureSeeded = () => {
  const existing = read();
  if (existing) return existing;
  const seeded = SEED_CASES.map((c) => ({ ...c, audit: c.audit.map((a) => ({ ...a })) }));
  write(seeded);
  return seeded;
};

export const getRg506Cases = () => ensureSeeded().map((c) => ({ ...c }));

export const getRg506Case = (id) => {
  const found = ensureSeeded().find((c) => c.id === id);
  return found ? JSON.parse(JSON.stringify(found)) : null;
};

export const updateRg506Case = (id, patch = {}, auditEntry = null) => {
  const rows = ensureSeeded();
  const next = rows.map((c) => {
    if (c.id !== id) return c;
    const audit = auditEntry
      ? [...(c.audit || []), { at: nowStamp(), ...auditEntry }]
      : c.audit;
    return { ...c, ...patch, audit };
  });
  write(next);
  return next.find((c) => c.id === id) || null;
};

export const saveRg506Draft = (id, fields, by) =>
  updateRg506Case(id, { ...fields, status: 'draft' }, { by: by || 'พว.กานดา ศรีวิไล', action: 'บันทึกร่าง' });

export const saveRg506 = (id, fields, by) =>
  updateRg506Case(id, { ...fields, status: 'saved' }, { by: by || 'พว.กานดา ศรีวิไล', action: 'บันทึกรายงาน' });

/** Mock EPI-NET submit — status transition + generated export-file stub. */
export const sendRg506ToEpiNet = (id, by) => {
  const row = ensureSeeded().find((c) => c.id === id);
  if (!row) return null;
  const exportFile = `EPINET-506-${row.id.replace('RG-', '')}.txt`;
  return updateRg506Case(
    id,
    { status: 'sent', sentAt: nowStamp(), exportFile },
    { by: by || 'นวก.สาธารณสุข อรทัย บุญเรือง', action: `ส่งเข้า EPI-NET (ไฟล์ ${exportFile})` },
  );
};
