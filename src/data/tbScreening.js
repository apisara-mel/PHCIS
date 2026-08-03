/* tbScreening.js — คัดกรองกลุ่มเสี่ยงวัณโรค (TOR §1.10.4.9) mock store.
   Legacy คู่มือระบบวัณโรค.pdf: ทะเบียนกลุ่มเสี่ยง + verbal screening
   (ไอเรื้อรังเกิน 2 สัปดาห์ ฯลฯ) + ผลการตรวจหาวัณโรค (CXR / AFB /
   GeneXpert) สรุปเป็น ปกติ / สงสัย / พบเชื้อ. ผลพบเชื้อ → CTA ขึ้นทะเบียน
   (deep-link ไป TbRegistryPage). ผู้สัมผัสโรคจากแท็บผู้สัมผัสของทะเบียน
   ถูกส่งมาหน้านี้แบบ pre-filled. */

export const TB_RISK_GROUPS = [
  { value: 'household',  label: 'ผู้สัมผัสร่วมบ้าน' },
  { value: 'elderly',    label: 'ผู้สูงอายุ ≥ 65 ปี' },
  { value: 'dm',         label: 'ผู้ป่วยเบาหวาน' },
  { value: 'hiv',        label: 'ผู้ติดเชื้อ HIV' },
  { value: 'healthcare', label: 'บุคลากรสาธารณสุข' },
  { value: 'prison',     label: 'ผู้ต้องขัง / อดีตผู้ต้องขัง' },
  { value: 'migrant',    label: 'แรงงานข้ามชาติ' },
  { value: 'copd',       label: 'โรคปอดเรื้อรัง / สูบบุหรี่จัด' },
];

export const resolveTbRiskGroup = (value) => TB_RISK_GROUPS.find((g) => g.value === value) || null;

/* Verbal screening — อาการสงสัยวัณโรคตามคู่มือ. */
export const TB_VERBAL_SCREENING = [
  { key: 'cough2w',     label: 'ไอเรื้อรังเกิน 2 สัปดาห์' },
  { key: 'bloodSputum', label: 'ไอมีเลือดปน' },
  { key: 'fever',       label: 'ไข้ต่ำ ๆ ช่วงบ่าย/เย็น เกิน 1 สัปดาห์' },
  { key: 'nightSweat',  label: 'เหงื่อออกกลางคืน' },
  { key: 'weightLoss',  label: 'น้ำหนักลดโดยไม่ทราบสาเหตุ' },
  { key: 'fatigue',     label: 'อ่อนเพลีย เบื่ออาหาร' },
];

export const TB_SCREENING_SUMMARY = [
  { value: 'normal',  label: 'ปกติ',    badge: 'green' },
  { value: 'suspect', label: 'สงสัย',   badge: 'yellow' },
  { value: 'positive', label: 'พบเชื้อ', badge: 'red' },
  { value: 'pending', label: 'รอผลตรวจ', badge: 'grey' },
];

export const resolveTbScreeningSummary = (value) =>
  TB_SCREENING_SUMMARY.find((s) => s.value === value) || null;

const isoDaysAgo = (days) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
};

let seq = 20;

/* Records — คนในชุมชนศูนย์ฯ กทม. หลากหลายกลุ่มเสี่ยง + สถานะผล. */
export const TB_SCREENING_RECORDS = [
  {
    id: 'scr-001', name: 'นางสายใจ ศรีสมบูรณ์', idCard: '3550900447213', age: 49,
    hn: '', phone: '081-445-2871',
    riskGroups: ['household'], relatedRegNo: '01/2569',
    symptoms: {}, screeningDate: isoDaysAgo(50),
    cxrResult: 'ปกติ', afbResult: 'ไม่ได้ตรวจ', geneXpertResult: 'ไม่ได้ตรวจ',
    summary: 'normal', status: 'saved',
    recordedBy: 'พว.เพ็ญศรี สุขใจ', recordedAt: isoDaysAgo(50),
  },
  {
    id: 'scr-002', name: 'นางสาวปรียา อัครพงศ์', idCard: '5670012467991', age: 38,
    hn: '', phone: '089-002-4471',
    riskGroups: ['household'], relatedRegNo: '02/2569',
    symptoms: { cough2w: true, fatigue: true }, screeningDate: isoDaysAgo(88),
    cxrResult: 'พบ infiltration เล็กน้อยปอดขวาบน', afbResult: 'Negative', geneXpertResult: 'รอผล',
    summary: 'suspect', status: 'saved',
    recordedBy: 'พว.อรทัย แก้วประเสริฐ', recordedAt: isoDaysAgo(88),
  },
  {
    id: 'scr-003', name: 'นายเอกชัย พิทยาคม', idCard: '1101400485273', age: 29,
    hn: '67-00024', phone: '086-771-9034',
    riskGroups: ['household'], relatedRegNo: '52/2568',
    symptoms: { cough2w: true, nightSweat: true, weightLoss: true }, screeningDate: isoDaysAgo(9),
    cxrResult: 'พบ infiltration ปอดขวาบน', afbResult: 'รอผล', geneXpertResult: 'MTB detected',
    summary: 'positive', status: 'saved',
    recordedBy: 'พว.เพ็ญศรี สุขใจ', recordedAt: isoDaysAgo(9),
  },
  {
    id: 'scr-004', name: 'นายประยูร แจ่มใส', idCard: '3100200884756', age: 71,
    hn: '67-00012', phone: '02-455-8821',
    riskGroups: ['elderly', 'dm'], relatedRegNo: '',
    symptoms: { fatigue: true }, screeningDate: isoDaysAgo(14),
    cxrResult: 'ปกติ', afbResult: 'ไม่ได้ตรวจ', geneXpertResult: 'ไม่ได้ตรวจ',
    summary: 'normal', status: 'saved',
    recordedBy: 'พว.อรทัย แก้วประเสริฐ', recordedAt: isoDaysAgo(14),
  },
  {
    id: 'scr-005', name: 'นางสาววันดี ทองแท้', idCard: '1103700229981', age: 33,
    hn: '', phone: '095-212-6640',
    riskGroups: ['healthcare'], relatedRegNo: '',
    symptoms: {}, screeningDate: isoDaysAgo(30),
    cxrResult: 'ปกติ', afbResult: 'ไม่ได้ตรวจ', geneXpertResult: 'ไม่ได้ตรวจ',
    summary: 'normal', status: 'saved',
    recordedBy: 'พว.เพ็ญศรี สุขใจ', recordedAt: isoDaysAgo(30),
  },
  {
    id: 'scr-006', name: 'Mr. Aung Kyaw', idCard: 'MM-8804412', age: 27,
    hn: '', phone: '062-118-4425',
    riskGroups: ['migrant'], relatedRegNo: '',
    symptoms: { cough2w: true, fever: true }, screeningDate: isoDaysAgo(3),
    cxrResult: 'รอตรวจ', afbResult: 'รอผล', geneXpertResult: 'รอผล',
    summary: 'pending', status: 'saved',
    recordedBy: 'พว.อรทัย แก้วประเสริฐ', recordedAt: isoDaysAgo(3),
  },
  {
    id: 'scr-007', name: 'นายสุชาติ ปั้นทอง', idCard: '3101800337265', age: 58,
    hn: '', phone: '081-900-2216',
    riskGroups: ['copd'], relatedRegNo: '',
    symptoms: { cough2w: true }, screeningDate: isoDaysAgo(45),
    cxrResult: 'Emphysematous change, no active TB', afbResult: 'Negative', geneXpertResult: 'ไม่ได้ตรวจ',
    summary: 'normal', status: 'cancelled',
    cancelReason: 'บันทึกซ้ำกับรายการเดิม',
    recordedBy: 'พว.เพ็ญศรี สุขใจ', recordedAt: isoDaysAgo(45),
  },
];

export const getTbScreeningRows = () => TB_SCREENING_RECORDS;

export const getTbScreeningById = (id) => TB_SCREENING_RECORDS.find((r) => r.id === id) || null;

/* บันทึกผลคัดกรอง — ต้องมี ≥1 กลุ่มเสี่ยง และ ≥1 ผลตรวจ (validation ตาม spec). */
export const addTbScreeningRecord = (data, by) => {
  if (!data.name?.trim() || !(data.riskGroups?.length > 0)) {
    return { ok: false, error: 'ต้องระบุชื่อผู้รับการคัดกรอง และกลุ่มเสี่ยงอย่างน้อย 1 กลุ่ม' };
  }
  const hasResult = [data.cxrResult, data.afbResult, data.geneXpertResult]
    .some((r) => r && r !== 'ไม่ได้ตรวจ');
  if (!hasResult) {
    return { ok: false, error: 'ต้องบันทึกผลการตรวจอย่างน้อย 1 รายการ (CXR / AFB / GeneXpert)' };
  }
  const record = {
    id: `scr-${String(seq += 1).padStart(3, '0')}`,
    hn: '', phone: '', relatedRegNo: '', symptoms: {},
    ...data,
    status: 'saved',
    recordedBy: by || 'ผู้ใช้งานปัจจุบัน',
    recordedAt: new Date().toISOString().slice(0, 10),
  };
  TB_SCREENING_RECORDS.unshift(record);
  return { ok: true, record };
};

export const updateTbScreeningRecord = (id, patch, by) => {
  const record = getTbScreeningById(id);
  if (!record || record.status === 'cancelled') return false;
  Object.assign(record, patch, {
    editedBy: by || 'ผู้ใช้งานปัจจุบัน',
    editedAt: new Date().toISOString().slice(0, 10),
  });
  return true;
};

export const cancelTbScreeningRecord = (id, reason, by) => {
  const record = getTbScreeningById(id);
  if (!record || !reason?.trim()) return false;
  record.status = 'cancelled';
  record.cancelReason = reason.trim();
  record.cancelledBy = by || 'ผู้ใช้งานปัจจุบัน';
  record.cancelledAt = new Date().toISOString().slice(0, 10);
  return true;
};
