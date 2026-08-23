/* socialWorkReferrals.js — แบบส่งต่อผู้ใช้บริการสังคมสงเคราะห์ (ส.ส.3)
   ตามมติ คทง.10 ครั้งที่ 3 (รหัส สส.3-1 ถึง สส.3-13) และแบบฟอร์มรายงาน
   ฉบับที่ 3 ของมติครั้งที่ 4.

   ฟิลด์ตามต้นแบบกระดาษ:
     สส.3-1  ศูนย์บริการสาธารณสุข (ผู้ออกใบส่งต่อ)
     สส.3-2  วันที่ออกใบส่งต่อ
     สส.3-3  ที่ (เลขที่หนังสือ)
     สส.3-4  เรื่อง
     สส.3-5  เรียน (หน่วยงานปลายทาง)
     สส.3-6  ชื่อ-สกุลผู้ส่งตัว (เชื่อมเวชระเบียน)
     สส.3-7  อายุ (เชื่อมเวชระเบียน)
     สส.3-8  ที่อยู่ปัจจุบัน (เชื่อมเวชระเบียน — แก้ไขได้)
     สส.3-9  สถานที่ใกล้เคียง
     สส.3-10 การช่วยเหลือที่ได้ดำเนินการแล้ว
     สส.3-11 จึงเรียนมาเพื่อขอความช่วยเหลือเรื่อง
     สส.3-12 ลงชื่อผู้ส่งตัว (ชื่อ-สกุล + ตำแหน่ง)
     สส.3-13 โทรศัพท์ / โทรสาร

   ครบ 4 กริยาของ TOR: แสดง / บันทึก / แก้ไข / ยกเลิก (เหตุผลบังคับ + กู้คืน)
   ทุกแถวประทับผู้บันทึก เวลาบันทึก เวลาแก้ไข และ log การพิมพ์. */

import { SW_CURRENT_USER, todayIso } from '@/data/socialWorkClinic';

const storageAvailable = () =>
  typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';

const readJson = (key, fallback) => {
  if (!storageAvailable()) return fallback;
  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(key) || 'null');
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
};

const writeJson = (key, value) => {
  if (!storageAvailable()) return;
  window.sessionStorage.setItem(key, JSON.stringify(value));
};

const K = {
  referrals: 'mih:sw:referrals',
  referralRun: 'mih:sw:referral-run',
  printLog: 'mih:sw:referral-print-log',
};

export const SW_CENTER = {
  code: '21',
  name: 'ศูนย์บริการสาธารณสุข 21 วัดธาตุทอง',
  office: 'สำนักอนามัย กรุงเทพมหานคร',
  phone: '0 2391 3251',
  fax: '0 2391 3252',
};

/* ── หน่วยงานปลายทาง (จัดกลุ่มตามมติ: ใน กทม. / พม. / รพ. / ภายนอกอื่น) ── */
export const SW_REFERRAL_SCOPES = [
  { value: 'internal', label: 'ภายในศูนย์บริการสาธารณสุข' },
  { value: 'bma', label: 'หน่วยงานในสังกัดกรุงเทพมหานคร' },
  { value: 'msdhs', label: 'กระทรวงการพัฒนาสังคมและความมั่นคงของมนุษย์ (พม.)' },
  { value: 'hospital', label: 'โรงพยาบาล / สถานพยาบาล' },
  { value: 'external', label: 'หน่วยงานภายนอกอื่น ๆ' },
];

export const resolveSwReferralScope = (value) =>
  SW_REFERRAL_SCOPES.find((s) => s.value === value)?.label || '—';

export const SW_REFERRAL_AGENCIES = [
  { value: 'rehab-clinic', scope: 'internal', label: 'คลินิกเวชศาสตร์ฟื้นฟู (ภายในศูนย์)' },
  { value: 'mental-clinic', scope: 'internal', label: 'คลินิกสุขภาพจิต (ภายในศูนย์)' },
  { value: 'homecare-team', scope: 'internal', label: 'ทีมพยาบาลเยี่ยมบ้าน (ภายในศูนย์)' },
  { value: 'district-office', scope: 'bma', label: 'สำนักงานเขตวัฒนา — ฝ่ายพัฒนาชุมชนและสวัสดิการสังคม' },
  { value: 'bma-welfare', scope: 'bma', label: 'สำนักพัฒนาสังคม กรุงเทพมหานคร' },
  { value: 'bma-elderly', scope: 'bma', label: 'ศูนย์บริการผู้สูงอายุดินแดง กรุงเทพมหานคร' },
  { value: 'shelter-child', scope: 'msdhs', label: 'บ้านพักเด็กและครอบครัวกรุงเทพมหานคร (พม.)' },
  { value: 'homeless-center', scope: 'msdhs', label: 'ศูนย์คุ้มครองคนไร้ที่พึ่งกรุงเทพมหานคร (พม.)' },
  { value: 'otop-disability', scope: 'msdhs', label: 'กรมส่งเสริมและพัฒนาคุณภาพชีวิตคนพิการ (พก.)' },
  { value: 'hotline-1300', scope: 'msdhs', label: 'ศูนย์ช่วยเหลือสังคม สายด่วน 1300' },
  { value: 'ref-hospital', scope: 'hospital', label: 'โรงพยาบาลแม่ข่ายตามสิทธิการรักษา' },
  { value: 'bma-hospital', scope: 'hospital', label: 'โรงพยาบาลในสังกัดสำนักการแพทย์ กทม.' },
  { value: 'ngo-foundation', scope: 'external', label: 'มูลนิธิ / องค์กรสาธารณประโยชน์' },
  { value: 'school', scope: 'external', label: 'สถานศึกษาในพื้นที่' },
  { value: 'police', scope: 'external', label: 'สถานีตำรวจนครบาลในพื้นที่' },
];

export const referralAgencyOptions = (scope) => SW_REFERRAL_AGENCIES
  .filter((a) => !scope || scope === 'all' || a.scope === scope)
  .map((a) => ({ value: a.value, label: a.label }));

export const resolveSwReferralAgency = (value) =>
  SW_REFERRAL_AGENCIES.find((a) => a.value === value)?.label || '—';

/* ── สถานะการตอบกลับ ───────────────────────────────────────────────── */
export const SW_REFERRAL_STATUSES = [
  { value: 'pending', label: 'รอตอบกลับ', badge: 'yellow' },
  { value: 'accepted', label: 'ตอบรับแล้ว', badge: 'teal' },
  { value: 'closed', label: 'ปิดเรื่อง (ช่วยเหลือแล้ว)', badge: 'green' },
  { value: 'declined', label: 'ปลายทางปฏิเสธ / ส่งกลับ', badge: 'red' },
];

export const resolveSwReferralStatus = (value) =>
  SW_REFERRAL_STATUSES.find((s) => s.value === value)?.label || '—';

export const swReferralStatusBadge = (value) =>
  SW_REFERRAL_STATUSES.find((s) => s.value === value)?.badge || 'grey';

export const SW_REFERRAL_SUBJECTS = [
  'ขอความอนุเคราะห์ช่วยเหลือผู้ประสบปัญหาทางสังคม',
  'ขอความอนุเคราะห์สงเคราะห์เงินทุนประกอบอาชีพ',
  'ขอความอนุเคราะห์ที่พักพิงชั่วคราว',
  'ขอความอนุเคราะห์กายอุปกรณ์และเครื่องช่วยความพิการ',
  'ขอความอนุเคราะห์คุ้มครองสวัสดิภาพเด็กและครอบครัว',
  'ส่งต่อเพื่อเข้ารับการรักษา/ฟื้นฟูต่อเนื่อง',
];

export const SW_REFERRAL_DONE_SUGGESTIONS = [
  'ให้คำปรึกษารายบุคคลและประเมินสภาพปัญหาทางสังคมเบื้องต้นแล้ว',
  'ประสานสิทธิการรักษาพยาบาลให้ผู้รับบริการเรียบร้อยแล้ว',
  'จ่ายวัสดุและกายอุปกรณ์เบื้องต้นจากคลังงานสังคมสงเคราะห์แล้ว',
  'สงเคราะห์เงินทุนค่าพาหนะเดินทางมารับบริการแล้ว',
  'ลงเยี่ยมบ้านและประเมินสภาพแวดล้อมที่อยู่อาศัยแล้ว',
  'ประสานอาสาสมัครสาธารณสุข (อสส.) ในพื้นที่ให้ติดตามต่อเนื่องแล้ว',
];

export const SW_REFERRAL_REQUEST_SUGGESTIONS = [
  'ขอความอนุเคราะห์พิจารณาให้การช่วยเหลือตามอำนาจหน้าที่ของหน่วยงาน',
  'ขอความอนุเคราะห์จัดหาที่พักพิงชั่วคราวให้ผู้รับบริการ',
  'ขอความอนุเคราะห์สนับสนุนเงินสงเคราะห์ครอบครัวผู้มีรายได้น้อย',
  'ขอความอนุเคราะห์ประเมินและออกบัตรประจำตัวคนพิการ',
  'ขอความอนุเคราะห์รับตัวผู้รับบริการเข้ารับการดูแลต่อเนื่อง',
];

const nextReferralNo = () => {
  const run = readJson(K.referralRun, 6) + 1;
  writeJson(K.referralRun, run);
  return `กท ๐๗๐๔/${String(run).padStart(4, '0')}`;
};

/** เลขที่หนังสือถัดไปแบบอ่านอย่างเดียว (ไม่กินเลข) — ใช้แสดงในฟอร์มก่อนบันทึก */
export const peekNextReferralNo = () =>
  `กท ๐๗๐๔/${String(readJson(K.referralRun, 6) + 1).padStart(4, '0')}`;

const SEED = [
  {
    id: 'ref-1', docNo: 'กท ๐๗๐๔/0001', issueDate: '2026-03-06',
    hn: '67-00021', name: 'วรรณภา ทองดี', age: '50 ปี', caseNo: 'สค.0004/2569',
    sn: 'SN/2569/21/0021',
    subject: 'ขอความอนุเคราะห์คุ้มครองสวัสดิภาพเด็กและครอบครัว',
    scope: 'msdhs', agency: 'shelter-child',
    currentAddress: '77 ชุมชนคลองเตยล็อค 4 คลองเตย กรุงเทพมหานคร 10110',
    landmark: 'ตรงข้ามศูนย์เยาวชนคลองเตย',
    problemCode: '0102',
    doneAlready: 'ให้คำปรึกษารายบุคคล ประเมินความเสี่ยงความรุนแรงในครอบครัว และประสานตำรวจในพื้นที่แล้ว',
    request: 'ขอความอนุเคราะห์รับผู้รับบริการและบุตร 2 คน เข้าพักในบ้านพักฉุกเฉินระหว่างดำเนินการทางกฎหมาย',
    senderName: 'นางสาวอารยา ธรรมรักษ์', senderPosition: 'นักสังคมสงเคราะห์ชำนาญการ',
    phone: '0 2391 3251', fax: '0 2391 3252',
    attachments: [{ name: 'บันทึกประเมินความรุนแรงในครอบครัว.pdf', size: '412 KB' }],
    status: 'closed',
    replies: [
      { date: '2026-03-09', by: 'บ้านพักเด็กและครอบครัวกรุงเทพมหานคร', note: 'ตอบรับ รับตัวเข้าพักวันที่ 9 มี.ค. 2569' },
      { date: '2026-04-20', by: 'บ้านพักเด็กและครอบครัวกรุงเทพมหานคร', note: 'ปิดเรื่อง — ผู้รับบริการย้ายไปอยู่กับญาติที่ต่างจังหวัด' },
    ],
    recordedBy: 'นักสังคมสงเคราะห์ อารยา ธรรมรักษ์', recordedAt: '2026-03-06T13:20:00',
  },
  {
    id: 'ref-2', docNo: 'กท ๐๗๐๔/0002', issueDate: '2026-04-10',
    hn: '67-00014', name: 'ชัยวัฒน์ ก้องเกียรติ', age: '47 ปี', caseNo: 'สค.0005/2569',
    sn: 'SN/2569/21/0014',
    subject: 'ขอความอนุเคราะห์กายอุปกรณ์และเครื่องช่วยความพิการ',
    scope: 'msdhs', agency: 'otop-disability',
    currentAddress: '410/12 ซอยลาดพร้าว 80 วังทองหลาง กรุงเทพมหานคร 10310',
    landmark: 'ปากซอยมีร้านสะดวกซื้อ',
    problemCode: '1410',
    doneAlready: 'ประเมินความพิการเบื้องต้น จ่ายไม้ค้ำยันจากคลังงานสังคมสงเคราะห์ และประสานทำบัตรคนพิการแล้ว',
    request: 'ขอความอนุเคราะห์พิจารณาสนับสนุนขาเทียมใต้เข่าและการฝึกใช้งาน',
    senderName: 'นางสาวชนิดา ปรีชาญาณ', senderPosition: 'นักสังคมสงเคราะห์ชำนาญการพิเศษ',
    phone: '0 2391 3251', fax: '0 2391 3252',
    attachments: [
      { name: 'ใบรับรองแพทย์ความพิการ.pdf', size: '288 KB' },
      { name: 'สำเนาบัตรประจำตัวคนพิการ.pdf', size: '155 KB' },
    ],
    status: 'accepted',
    replies: [
      { date: '2026-04-24', by: 'กรมส่งเสริมและพัฒนาคุณภาพชีวิตคนพิการ', note: 'ตอบรับ นัดประเมิน 12 พ.ค. 2569' },
    ],
    recordedBy: 'นักสังคมสงเคราะห์ ชนิดา ปรีชาญาณ', recordedAt: '2026-04-10T09:12:00',
  },
  {
    id: 'ref-3', docNo: 'กท ๐๗๐๔/0003', issueDate: '2026-05-15',
    hn: '67-00009', name: 'กิตติ ศรีสมบูรณ์', age: '52 ปี', caseNo: '',
    sn: 'SN/2569/21/0009',
    subject: 'ขอความอนุเคราะห์ที่พักพิงชั่วคราว',
    scope: 'msdhs', agency: 'homeless-center',
    currentAddress: 'ไม่มีที่อยู่เป็นหลักแหล่ง — พักอาศัยบริเวณใต้สะพานพระราม 9',
    landmark: 'ใกล้จุดจอดรถประจำทางสาย 205',
    problemCode: '0801',
    doneAlready: 'ให้คำปรึกษา ประสานทำบัตรประจำตัวประชาชนใหม่ และจ่ายชุดเครื่องอุปโภคพื้นฐานแล้ว',
    request: 'ขอความอนุเคราะห์รับผู้รับบริการเข้าพักในสถานคุ้มครองคนไร้ที่พึ่ง และช่วยเหลือด้านสถานะทางทะเบียน',
    senderName: 'นายพีระพัฒน์ เกื้อกูล', senderPosition: 'นักสังคมสงเคราะห์ปฏิบัติการ',
    phone: '0 2391 3251', fax: '0 2391 3252',
    attachments: [],
    status: 'pending',
    replies: [],
    recordedBy: 'นักสังคมสงเคราะห์ พีระพัฒน์ เกื้อกูล', recordedAt: '2026-05-15T15:44:00',
  },
  {
    id: 'ref-4', docNo: 'กท ๐๗๐๔/0004', issueDate: '2026-06-02',
    hn: '67-00017', name: 'ภัคจิรา วงศ์อนันต์', age: '41 ปี', caseNo: 'สค.0006/2569',
    sn: 'SN/2569/21/0017',
    subject: 'ขอความอนุเคราะห์สงเคราะห์เงินทุนประกอบอาชีพ',
    scope: 'bma', agency: 'district-office',
    currentAddress: '9/4 ซอยบำรุงเมือง 5 ป้อมปราบศัตรูพ่าย กรุงเทพมหานคร 10100',
    landmark: 'ข้างวัดสระเกศ',
    problemCode: '1104',
    doneAlready: 'ประสานทุนการศึกษาให้บุตร 1 ทุน และให้คำปรึกษาการวางแผนการเงินครัวเรือนแล้ว',
    request: 'ขอความอนุเคราะห์พิจารณาสนับสนุนเงินสงเคราะห์ครอบครัวผู้มีรายได้น้อยตามระเบียบของสำนักงานเขต',
    senderName: 'นางสาวอารยา ธรรมรักษ์', senderPosition: 'นักสังคมสงเคราะห์ชำนาญการ',
    phone: '0 2391 3251', fax: '0 2391 3252',
    attachments: [{ name: 'หนังสือรับรองรายได้ครัวเรือน.pdf', size: '196 KB' }],
    status: 'declined',
    replies: [
      { date: '2026-06-19', by: 'สำนักงานเขตวัฒนา', note: 'ส่งกลับ — ผู้รับบริการมีภูมิลำเนาในพื้นที่เขตป้อมปราบฯ ให้ยื่นที่เขตตามทะเบียนบ้าน' },
    ],
    recordedBy: 'นักสังคมสงเคราะห์ อารยา ธรรมรักษ์', recordedAt: '2026-06-02T11:30:00',
  },
  {
    id: 'ref-5', docNo: 'กท ๐๗๐๔/0005', issueDate: '2026-06-26',
    hn: '67-00003', name: 'ปริญญา รัตนา', age: '54 ปี', caseNo: 'สค.0003/2569',
    sn: 'SN/2569/21/0003',
    subject: 'ส่งต่อเพื่อเข้ารับการรักษา/ฟื้นฟูต่อเนื่อง',
    scope: 'internal', agency: 'rehab-clinic',
    currentAddress: '256 หมู่ 7 ต.บางใหญ่ อ.บางใหญ่ จ.นนทบุรี 11140',
    landmark: 'หลังตลาดบางใหญ่',
    problemCode: '0701',
    doneAlready: 'ประเมิน ADL ให้คำปรึกษาผู้ดูแล และจ่ายผ้าอ้อมผู้ใหญ่รอบเดือนมิถุนายนแล้ว',
    request: 'ขอส่งต่อเพื่อประเมินและวางแผนกายภาพบำบัดที่บ้านสำหรับมารดาผู้รับบริการ',
    senderName: 'นางสาวอารยา ธรรมรักษ์', senderPosition: 'นักสังคมสงเคราะห์ชำนาญการ',
    phone: '0 2391 3251', fax: '0 2391 3252',
    attachments: [],
    status: 'accepted',
    replies: [{ date: '2026-06-30', by: 'คลินิกเวชศาสตร์ฟื้นฟู', note: 'ตอบรับ นัดเยี่ยมบ้านร่วมทีม 14 ก.ค. 2569' }],
    recordedBy: 'นักสังคมสงเคราะห์ อารยา ธรรมรักษ์', recordedAt: '2026-06-26T10:05:00',
  },
  {
    id: 'ref-6', docNo: 'กท ๐๗๐๔/0006', issueDate: '2026-07-14',
    hn: '67-00007', name: 'มาลี อ่อนน้อม', age: '45 ปี', caseNo: 'สค.0002/2569',
    sn: 'SN/2569/21/0007',
    subject: 'ขอความอนุเคราะห์ช่วยเหลือผู้ประสบปัญหาทางสังคม',
    scope: 'hospital', agency: 'ref-hospital',
    currentAddress: '19 ซอยเพชรบุรี 15 ถนนเพชรบุรี ราชเทวี กรุงเทพมหานคร 10400',
    landmark: 'ใกล้แยกอุรุพงษ์',
    problemCode: '1003',
    doneAlready: 'ประสานสิทธิประกันสังคมและให้คำปรึกษาเรื่องการผ่อนชำระค่ารักษาแล้ว',
    request: 'ขอความอนุเคราะห์พิจารณาลดหย่อนค่ารักษาพยาบาลของสามีผู้รับบริการ',
    senderName: 'นายพีระพัฒน์ เกื้อกูล', senderPosition: 'นักสังคมสงเคราะห์ปฏิบัติการ',
    phone: '0 2391 3251', fax: '0 2391 3252',
    attachments: [],
    status: 'cancelled',
    cancellation: { reason: 'ออกเลขที่หนังสือซ้ำกับ กท ๐๗๐๔/0004 — ยกเลิกและออกใหม่', by: 'นักสังคมสงเคราะห์ ชนิดา ปรีชาญาณ', at: '2026-07-15T09:10:00' },
    replies: [],
    recordedBy: 'นักสังคมสงเคราะห์ พีระพัฒน์ เกื้อกูล', recordedAt: '2026-07-14T14:20:00',
  },
];

export const getSwReferrals = () => {
  const overlay = readJson(K.referrals, {});
  const seedIds = SEED.map((r) => r.id);
  const merged = SEED.map((r) => (overlay[r.id] ? { ...r, ...overlay[r.id] } : r));
  const added = Object.values(overlay).filter((r) => !seedIds.includes(r.id));
  return [...merged, ...added].sort((a, b) => (b.issueDate || '').localeCompare(a.issueDate || ''));
};

export const getSwReferral = (id) => getSwReferrals().find((r) => r.id === id) || null;

export const getSwReferralsByHn = (hn, from, to) => getSwReferrals()
  .filter((r) => r.hn === hn)
  .filter((r) => (!from || r.issueDate >= from) && (!to || r.issueDate <= to));

export const saveSwReferral = (entry) => {
  const overlay = readJson(K.referrals, {});
  const previous = entry.id ? getSwReferral(entry.id) : null;
  const editLog = [...(previous?.editLog || [])];
  if (previous) editLog.push({ by: SW_CURRENT_USER, at: new Date().toISOString() });
  const saved = {
    ...(previous || {}),
    ...entry,
    id: entry.id || `ref-new-${Date.now()}`,
    /* เลขที่หนังสือออกครั้งเดียวตอนบันทึกสำเร็จ และคงเดิมเมื่อแก้ไขภายหลัง */
    docNo: previous?.docNo || entry.docNo || nextReferralNo(),
    issueDate: entry.issueDate || todayIso(),
    status: entry.status || previous?.status || 'pending',
    replies: entry.replies || previous?.replies || [],
    attachments: entry.attachments || previous?.attachments || [],
    recordedBy: previous?.recordedBy || SW_CURRENT_USER,
    recordedAt: previous?.recordedAt || new Date().toISOString(),
    editLog,
  };
  overlay[saved.id] = saved;
  writeJson(K.referrals, overlay);
  return { saved, isNew: !previous };
};

export const cancelSwReferral = (id, reason) => {
  const current = getSwReferral(id);
  if (!current) return null;
  const overlay = readJson(K.referrals, {});
  overlay[id] = {
    ...current,
    status: 'cancelled',
    cancellation: { reason: reason || '', by: SW_CURRENT_USER, at: new Date().toISOString() },
  };
  writeJson(K.referrals, overlay);
  return overlay[id];
};

export const reactivateSwReferral = (id) => {
  const current = getSwReferral(id);
  if (!current) return null;
  const overlay = readJson(K.referrals, {});
  overlay[id] = { ...current, status: 'pending', cancellation: null };
  writeJson(K.referrals, overlay);
  return overlay[id];
};

export const addSwReferralReply = (id, reply) => {
  const current = getSwReferral(id);
  if (!current) return null;
  const overlay = readJson(K.referrals, {});
  overlay[id] = {
    ...current,
    status: reply.status || current.status,
    replies: [...(current.replies || []), {
      date: reply.date || todayIso(),
      by: reply.by || '',
      note: reply.note || '',
      recordedBy: SW_CURRENT_USER,
      recordedAt: new Date().toISOString(),
    }],
  };
  writeJson(K.referrals, overlay);
  return overlay[id];
};

export const logSwReferralPrint = (id, docType = 'แบบส่งต่อ ส.ส.3') => {
  const log = readJson(K.printLog, {});
  log[id] = [...(log[id] || []), { docType, by: SW_CURRENT_USER, at: new Date().toISOString() }];
  writeJson(K.printLog, log);
};

export const getSwReferralPrintLog = (id) => readJson(K.printLog, {})[id] || [];

export default getSwReferrals;
