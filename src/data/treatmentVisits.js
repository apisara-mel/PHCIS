import { enrichMeasurementRounds, enrichVitalBlock } from '@/utils/vitalBmi';

/* Treatment record (ระบบบันทึกการรักษา) mock data — keyed by HN so the
   form pages can pull a realistic visit history + previous vitals /
   diagnoses for the patient selected from TreatmentQueuePage. */

export const TREATMENT_VISITS = {
  '67-00001': [
    { date: '2 เมษายน 2569', center: 'ศูนย์ 8 บางนา', dept: 'อายุรกรรม', doctor: 'พญ.สมหญิง รักษ์ดี', cc: 'ปวดหลังช่วงล่างมาก ในเวลาที่ก้ม', dx: 'Low back pain (M54.5)', rx: 'Paracetamol, PT',
      meds: [{ name: 'Paracetamol 500 mg', sig: 'รับประทานครั้งละ 1 เม็ด ทุก 6 ชม. เวลาปวด', qty: '30 เม็ด' }, { name: 'กายภาพบำบัด (ไม่ใช่ยา)', sig: 'นัดทำ 2 สัปดาห์', qty: '—' }],
      duration: '2 สัปดาห์', painLabel: 'ปานกลาง', triage: 'Level 4 · Semi-urgent', room: 'ห้องตรวจที่ 2', bp: '132/84 mmHg', temp: '36.7 °C', pulse: '76 ครั้ง/นาที', weight: '68 กก.',
      labs: 'ไม่ได้สั่งตรวจ', imaging: 'X-ray L-S spine — ไม่พบกระดูกหัก', followUp: 'นัดกายภาพบำบัด 2 สัปดาห์', rights: 'สิทธิประกันสังคม', note: 'แนะนำท่าบริหารหลัง เลี่ยงยกของหนัก' },
    { date: '30 มีนาคม 2569', dept: 'อายุรกรรม', doctor: 'นพ.สมชาย ใจดี', cc: 'ตรวจสุขภาพประจำปี', dx: 'Health check-up (Z00.0)', rx: '—',
      duration: '—', painLabel: 'ไม่ปวด', triage: 'Level 5 · Non-urgent', room: 'ห้องตรวจที่ 1', bp: '124/78 mmHg', temp: '36.5 °C', pulse: '72 ครั้ง/นาที', weight: '68 กก.',
      labs: 'CBC · FBS · Lipid · LFT ปกติทั้งชุด', imaging: 'CXR ปกติ', followUp: 'ตรวจสุขภาพครั้งถัดไปปีหน้า', rights: 'สิทธิประกันสังคม', note: 'ผลอยู่ในเกณฑ์ปกติทั้งหมด' },
    { date: '15 มีนาคม 2569', dept: 'อายุรกรรม', doctor: 'นพ.สมชาย ใจดี', cc: 'ไอ น้ำมูก', dx: 'Acute pharyngitis (J02.9)', rx: 'Bromhexine',
      duration: '4 วัน', painLabel: 'เล็กน้อย', triage: 'Level 4 · Semi-urgent', room: 'ห้องตรวจที่ 3', bp: '120/76 mmHg', temp: '37.5 °C', pulse: '88 ครั้ง/นาที', weight: '67 กก.',
      labs: 'ไม่ได้สั่งตรวจ', imaging: 'ไม่ได้สั่งตรวจ', followUp: 'กลับมาพบแพทย์หากไข้ไม่ลดใน 3 วัน', rights: 'สิทธิประกันสังคม', note: 'ดื่มน้ำอุ่น พักเสียง' },
    { date: '2 กุมภาพันธ์ 2569', center: 'ศูนย์ 8 บางนา', dept: 'ตรวจรักษา', doctor: 'พญ.วิภา สุขศรี', cc: 'ปวดศีรษะ', dx: 'Tension headache (G44.2)', rx: '—',
      duration: '1 สัปดาห์', painLabel: 'ปานกลาง', triage: 'Level 5 · Non-urgent', room: 'ห้องตรวจที่ 2', bp: '128/82 mmHg', temp: '36.6 °C', pulse: '74 ครั้ง/นาที', weight: '68 กก.',
      labs: 'ไม่ได้สั่งตรวจ', imaging: 'ไม่ได้สั่งตรวจ', followUp: 'ติดตามอาการเอง', rights: 'สิทธิประกันสังคม', note: 'พักสายตาจากจอทุก 1 ชม.' },
    { date: '15 มกราคม 2569', dept: 'ตรวจรักษา', doctor: 'พญ.วิภา สุขศรี', cc: 'ท้องเสีย', dx: 'Acute gastroenteritis (A09)', rx: 'ORS',
      duration: '1 วัน', painLabel: 'มาก', triage: 'Level 3 · Urgent', room: 'ห้องตรวจที่ 1', bp: '112/70 mmHg', temp: '37.4 °C', pulse: '98 ครั้ง/นาที', weight: '66 กก.',
      labs: 'Stool exam — ไม่พบเชื้อบิด', imaging: 'ไม่ได้สั่งตรวจ', followUp: 'กลับมาพบแพทย์หากถ่ายเป็นมูกเลือด', rights: 'สิทธิประกันสังคม', note: 'ให้ ORS ชดเชยน้ำ' },
    { date: '8 มกราคม 2569', dept: 'ตรวจรักษา', doctor: 'นพ.สมชาย ใจดี', cc: 'ไข้ต่ำๆ', dx: 'Viral URI (J06.9)', rx: 'Paracetamol',
      duration: '2 วัน', painLabel: 'เล็กน้อย', triage: 'Level 4 · Semi-urgent', room: 'ห้องตรวจที่ 4', bp: '118/76 mmHg', temp: '37.9 °C', pulse: '90 ครั้ง/นาที', weight: '67 กก.',
      labs: 'CBC ปกติ', imaging: 'ไม่ได้สั่งตรวจ', followUp: 'กลับมาพบแพทย์หากไข้เกิน 3 วัน', rights: 'สิทธิประกันสังคม', note: 'พักผ่อนให้เพียงพอ' },
    { date: '8 ธันวาคม 2568', dept: 'ตรวจรักษา', doctor: 'พญ.วิภา สุขศรี', cc: 'ไอ น้ำมูก', dx: 'Acute pharyngitis (J02.9)', rx: 'Bromhexine, Cetirizine',
      duration: '5 วัน', painLabel: 'เล็กน้อย', triage: 'Level 4 · Semi-urgent', room: 'ห้องตรวจที่ 2', bp: '122/78 mmHg', temp: '37.6 °C', pulse: '86 ครั้ง/นาที', weight: '67 กก.',
      labs: 'ไม่ได้สั่งตรวจ', imaging: 'ไม่ได้สั่งตรวจ', followUp: 'ติดตามอาการเอง', rights: 'สิทธิประกันสังคม', note: 'อาการดีขึ้นหลังได้ยาแก้แพ้' },
  ],
  '67-00002': [
    { date: '6 พ.ค. 2569', dept: 'ตรวจรักษา', doctor: 'นพ.สมชาย ใจดี', cc: 'ปวดท้อง', dx: 'Functional dyspepsia (K30)', rx: 'Antacid',
      duration: '2 สัปดาห์', painLabel: 'ปานกลาง', triage: 'Level 4 · Semi-urgent', room: 'ห้องตรวจที่ 1', bp: '120/78 mmHg', temp: '36.6 °C', pulse: '78 ครั้ง/นาที', weight: '58 กก.',
      labs: 'H. pylori — ผลลบ', imaging: 'ไม่ได้สั่งตรวจ', followUp: 'นัดติดตาม 1 เดือน', rights: 'สิทธิบัตรทอง', note: 'งดอาหารรสจัด กาแฟ' },
    { date: '12 มี.ค. 2569', dept: 'ตรวจรักษา', doctor: 'นพ.สมชาย ใจดี', cc: 'ตรวจติดตาม', dx: 'Follow-up (Z09)', rx: '—',
      duration: 'ติดตามต่อเนื่อง', painLabel: 'ไม่ปวด', triage: 'Level 5 · Non-urgent', room: 'ห้องตรวจที่ 1', bp: '118/74 mmHg', temp: '36.5 °C', pulse: '74 ครั้ง/นาที', weight: '58 กก.',
      labs: 'ไม่ได้สั่งตรวจ', imaging: 'ไม่ได้สั่งตรวจ', followUp: 'นัดติดตาม 3 เดือน', rights: 'สิทธิบัตรทอง', note: 'อาการปวดท้องหายแล้ว' },
  ],
  '67-00003': [
    { date: '5 พ.ค. 2569', dept: 'ศัลยกรรม', doctor: 'นพ.ณัฐวุฒิ บุญมี', cc: 'แผลที่นิ้วชี้', dx: 'Skin laceration (S61.0)', rx: 'ทำแผล + Amoxicillin',
      duration: '1 วัน', painLabel: 'มาก', triage: 'Level 3 · Urgent', room: 'ห้องทำแผล', bp: '126/80 mmHg', temp: '36.8 °C', pulse: '92 ครั้ง/นาที', weight: '72 กก.',
      labs: 'ไม่ได้สั่งตรวจ', imaging: 'X-ray นิ้วชี้ — ไม่พบกระดูกหัก', followUp: 'นัดทำแผล 2 วัน · ตัดไหม 7 วัน', rights: 'สิทธิประกันสังคม', note: 'ฉีดวัคซีนบาดทะยักแล้ว' },
  ],
  '67-00004': [
    { date: '6 พ.ค. 2569', dept: 'อายุรกรรม', doctor: 'พญ.สมหญิง รักษ์ดี', cc: 'ความดันโลหิตสูง', dx: 'Essential HT (I10)', rx: 'Enalapril 5 mg',
      duration: '3 เดือน', painLabel: 'ไม่ปวด', triage: 'Level 4 · Semi-urgent', room: 'ห้องตรวจที่ 1', bp: '152/94 mmHg', temp: '36.5 °C', pulse: '82 ครั้ง/นาที', weight: '75 กก.',
      labs: 'BUN/Cr ปกติ · K 4.3', imaging: 'ไม่ได้สั่งตรวจ', followUp: 'นัดวัดความดัน 1 เดือน', rights: 'สิทธิข้าราชการ', note: 'ลดเค็ม ออกกำลังกายสม่ำเสมอ' },
  ],
  '67-00005': [
    { date: '14 มี.ค. 2569', dept: 'กุมารเวช', doctor: 'พญ.วิภา สุขศรี', cc: 'ผื่นที่แขน', dx: 'Atopic dermatitis (L20.9)', rx: 'Hydrocortisone cream',
      duration: '1 เดือน', painLabel: 'เล็กน้อย', triage: 'Level 5 · Non-urgent', room: 'ห้องตรวจเด็ก', bp: '—', temp: '36.7 °C', pulse: '96 ครั้ง/นาที', weight: '14 กก.',
      labs: 'ไม่ได้สั่งตรวจ', imaging: 'ไม่ได้สั่งตรวจ', followUp: 'นัดติดตาม 2 สัปดาห์', rights: 'สิทธิบัตรทอง', note: 'ทาครีมบำรุงผิวหลังอาบน้ำทุกครั้ง' },
  ],
  '67-00006': [
    { date: '5 พ.ค. 2569', dept: 'อายุรกรรม', doctor: 'พญ.สมหญิง รักษ์ดี', cc: 'เบาหวาน + ความดัน', dx: 'T2DM + HT (E11.9, I10)', rx: 'Metformin, Enalapril',
      duration: 'ติดตามต่อเนื่อง', painLabel: 'ไม่ปวด', triage: 'Level 5 · Non-urgent', room: 'ห้องตรวจที่ 1', bp: '142/88 mmHg', temp: '36.6 °C', pulse: '80 ครั้ง/นาที', weight: '80 กก.',
      labs: 'FBS 156 · HbA1c 8.1% · Cr 1.0', imaging: 'ไม่ได้สั่งตรวจ', followUp: 'นัดเจาะน้ำตาล 3 เดือน · ตรวจตาประจำปี', rights: 'สิทธิข้าราชการ', note: 'น้ำตาลยังสูงกว่าเป้า — ปรับขนาดยา' },
  ],
  '67-00007': [
    { date: '18 ก.พ. 2569', center: 'ศูนย์ 8 บางนา', dept: 'ตรวจรักษา', doctor: 'นพ.สมชาย ใจดี', cc: 'ปวดเข่า', dx: 'OA knee (M17.0)', rx: 'Diclofenac',
      meds: [{ name: 'Diclofenac 25 mg', sig: 'ครั้งละ 1 เม็ด วันละ 2 ครั้ง หลังอาหารทันที', qty: '30 เม็ด' }, { name: 'Omeprazole 20 mg', sig: 'ครั้งละ 1 เม็ด ก่อนอาหารเช้า (กันกระเพาะ)', qty: '30 เม็ด' }],
      duration: '1 เดือน', painLabel: 'มาก', triage: 'Level 4 · Semi-urgent', room: 'ห้องตรวจที่ 2', bp: '138/86 mmHg', temp: '36.5 °C', pulse: '78 ครั้ง/นาที', weight: '65 กก.',
      labs: 'ESR 28 · Uric acid ปกติ', imaging: 'X-ray เข่าทั้งสองข้าง — ช่องข้อแคบเล็กน้อย', followUp: 'นัดกายภาพบำบัด 4 สัปดาห์', rights: 'สิทธิประกันสังคม', note: 'ลดน้ำหนัก · เลี่ยงนั่งยอง ขึ้นลงบันได' },
  ],
  '67-00008': [
    { date: '26 เม.ย. 2569', dept: 'ตรวจรักษา', doctor: 'นพ.สมชาย ใจดี', cc: 'นอนไม่หลับ', dx: 'Insomnia (G47.00)', rx: 'Lorazepam (PRN)',
      duration: '2 เดือน', painLabel: 'ไม่ปวด', triage: 'Level 5 · Non-urgent', room: 'ห้องตรวจที่ 3', bp: '124/80 mmHg', temp: '36.6 °C', pulse: '76 ครั้ง/นาที', weight: '59 กก.',
      labs: 'TSH ปกติ', imaging: 'ไม่ได้สั่งตรวจ', followUp: 'นัดติดตาม 1 เดือน', rights: 'สิทธิบัตรทอง', note: 'แนะนำสุขอนามัยการนอน · เลี่ยงคาเฟอีนหลังเที่ยง' },
  ],
};

export const findVisitsByHn = (hn) => TREATMENT_VISITS[hn] || [];

export const TREATMENT_DEFAULT_VITALS = {
  bp: '128/82', hr: 78, temp: 36.8, rr: 18, spo2: 98, weight: 68, height: 168, bmi: 24.1,
};

export const TREATMENT_DEFAULT_SYMPTOMS = 'ผู้ป่วยมีอาการไข้ต่ำๆ ปวดศีรษะ และไอแห้ง ประมาณ 2 วันที่ผ่านมา ไม่มีอาการหายใจลำบาก ทานอาหารและน้ำได้ปกติ';
export const TREATMENT_DEFAULT_ALLERGIES = 'แพ้ Penicillin (ผื่นทั่วตัว, อาการรุนแรง — มาก)';

/* ─────────────────────────────────────────────────────────────
   Visit-detail records — feeds Step 1 ประวัติการรักษา
   (Figma PHCIS | CPOE · node 176:41635). Each entry powers one
   row in the left "วันที่รับบริการ" rail and, when selected,
   one full content panel (vitals, อาการป่วย, pain score,
   ประวัติการแพ้ยา, ประวัติโรคประจำตัว).
   ───────────────────────────────────────────────────────────── */

/* Raw vitals per measurement round — BMI is derived from weight + height
   via enrichVitalBlock (same formula as VitalsForm / BMICard). */
const VITAL_ROUND_LATEST = {
  temp:   { value: '36.8' },
  pr:     { value: '78'   },
  bp:     { value: '128/80', valueTone: 'danger', badge: { tone: 'warning', label: 'สูงเล็กน้อย' } },
  spo2:   { value: '98'   },
  rr:     { value: '20'   },
  height: { value: '182'  },
  weight: { value: '62'   },
  waist:  { value: '80'   },
};

const VITAL_ROUND_2 = {
  ...VITAL_ROUND_LATEST,
  bp:     { value: '130/82', valueTone: 'danger', badge: { tone: 'warning', label: 'สูงเล็กน้อย' } },
  weight: { value: '65'   },
  pr:     { value: '82'   },
};

const VITAL_ROUND_1 = {
  ...VITAL_ROUND_LATEST,
  bp:     { value: '118/76' },
  weight: { value: '58'   },
  temp:   { value: '36.5' },
  pr:     { value: '74'   },
};

export const DEFAULT_MEASUREMENT_ROUNDS = enrichMeasurementRounds([
  { id: 'latest', label: 'ครั้งล่าสุด', vitals: VITAL_ROUND_LATEST },
  { id: 'round-2', label: 'ครั้งที่ 2', vitals: VITAL_ROUND_2 },
  { id: 'round-1', label: 'ครั้งที่ 1', vitals: VITAL_ROUND_1 },
]);

export const DEFAULT_VITAL_BLOCK = enrichVitalBlock(VITAL_ROUND_LATEST);

export const DEFAULT_VISIT_DETAIL = {
  date: '2 เมษายน 2569',
  center: 'ศูนย์ 8 บางนา',
  vitals: DEFAULT_VITAL_BLOCK,
  measurementRounds: DEFAULT_MEASUREMENT_ROUNDS,
  cc: 'ปวดหลังช่วงล่างมาก ในเวลาที่ก้ม',
  duration: '1 สัปดาห์',
  pain: { icon: 'sentiment_dissatisfied', label: 'มาก' },
  allergies: [
    {
      name: 'Penicillin', severity: 'รุนแรง', probability: 'แน่นอน',
      symptom: 'อาการแพ้รุนแรง เช่น Anaphylaxis, ผื่นลมพิษทั่วตัว, หน้าบวม, หายใจไม่ออก',
      note: '-',
    },
    {
      name: 'NSAIDs', severity: 'เล็กน้อย', probability: 'น่าจะใช่',
      symptom: 'หืดกำเริบ / หลอดลมหดเกร็ง, ผื่นลมพิษ, คัดจมูก น้ำมูกไหล',
      note: '-',
    },
  ],
  chronicDiseases: [
    {
      name: 'ความดันโลหิตสูง (Hypertension (HT))',
      severity: 'ปานกลาง', status: 'อยู่ระหว่างการรักษา', /* orange */
      symptom: 'ปวดท้ายทอย, เวียนหัว',
      note: '-',
    },
    {
      name: 'โรคเกาต์ (Gout)',
      severity: 'เล็กน้อย', status: 'ควบคุมได้', /* indigo */
      symptom: 'ปวดบวมแดงร้อนที่นิ้วเท้า / ข้อเท้า กะทันหัน',
      note: 'งดเครื่องในสัตว์ · แอลกอฮอล์',
    },
  ],
};

/* ประวัติสำรองสำหรับ HN ที่ยังไม่มีในตาราง `TREATMENT_VISITS` ข้างบน — เดิมคืน
   `[DEFAULT_VISIT_DETAIL]` ใบเดียว ป๊อปอัป "ประวัติการรักษา" จึงมีวันที่รับบริการ
   แค่บรรทัดเดียวทุกครั้งที่เปิดจากหน้าที่ HN คนละรูปแบบ (เช่นหอสังเกตอาการที่ใช้
   `67004128` ขณะที่ตารางนี้คีย์ด้วย `67-00001`) ให้ประวัติหลายวันที่แทน เพื่อให้
   แถบซ้ายและการสลับวันที่ทำงานจริงบนทุกหน้า (มติผู้ใช้ 28 ส.ค. 69) */
const FALLBACK_VISITS = [
  { date: '2 เมษายน 2569',   center: 'ศูนย์ 8 บางนา',  dept: 'อายุรกรรม',  doctor: 'พญ.สมหญิง รักษ์ดี', cc: 'ปวดหลังช่วงล่างมาก ในเวลาที่ก้ม', dx: 'Low back pain (M54.5)',        rx: 'Paracetamol, PT',
      meds: [{ name: 'Paracetamol 500 mg', sig: 'รับประทานครั้งละ 1 เม็ด ทุก 6 ชม. เวลาปวด', qty: '30 เม็ด' }, { name: 'กายภาพบำบัด (ไม่ใช่ยา)', sig: 'นัดทำ 2 สัปดาห์', qty: '—' }],
    duration: '2 สัปดาห์', painLabel: 'ปานกลาง', triage: 'Level 4 · Semi-urgent', room: 'ห้องตรวจที่ 2', bp: '132/84 mmHg', temp: '36.7 °C', pulse: '76 ครั้ง/นาที', weight: '62 กก.',
    labs: 'ไม่ได้สั่งตรวจ', imaging: 'X-ray L-S spine — ไม่พบกระดูกหัก', followUp: 'นัดกายภาพบำบัด 2 สัปดาห์', rights: 'สิทธิประกันสังคม', note: 'แนะนำท่าบริหารหลังและหลีกเลี่ยงการยกของหนัก' },
  { date: '11 มีนาคม 2569',  center: 'ศูนย์ 4 ดินแดง', dept: 'อายุรกรรม',  doctor: 'นพ.วรวิทย์ เกียรติเจริญ', cc: 'แน่นหน้าอก เหนื่อยง่าย',   dx: 'Stable angina (I20.9)',        rx: 'ISDN (PRN), ตรวจ EKG',
      meds: [{ name: 'Isosorbide dinitrate 5 mg', sig: 'อมใต้ลิ้นเมื่อเจ็บหน้าอก ซ้ำได้ทุก 5 นาที ไม่เกิน 3 ครั้ง', qty: '10 เม็ด' }],
    duration: '3 วัน', painLabel: 'มาก', triage: 'Level 2 · Emergent', room: 'ห้องตรวจที่ 1', bp: '148/92 mmHg', temp: '36.9 °C', pulse: '98 ครั้ง/นาที', weight: '62 กก.',
    labs: 'Troponin-I ปกติ · Lipid profile สูง', imaging: 'CXR ปกติ', followUp: 'ส่งพบอายุรแพทย์หัวใจ 1 สัปดาห์', rights: 'สิทธิประกันสังคม', note: 'แนะนำพบแพทย์ทันทีหากเจ็บหน้าอกนานเกิน 15 นาที' },
  { date: '19 กุมภาพันธ์ 2569', center: 'ศูนย์ 4 ดินแดง', dept: 'ตรวจรักษา', doctor: 'พญ.ปรียาภรณ์ สุขสวัสดิ์', cc: 'ความดันสูง ปวดท้ายทอย',   dx: 'Essential hypertension (I10)', rx: 'Amlodipine 5 mg',
      meds: [{ name: 'Amlodipine 5 mg', sig: 'รับประทานครั้งละ 1 เม็ด วันละครั้ง เช้า', qty: '30 เม็ด' }],
    duration: '1 เดือน', painLabel: 'เล็กน้อย', triage: 'Level 4 · Semi-urgent', room: 'ห้องตรวจที่ 3', bp: '156/96 mmHg', temp: '36.5 °C', pulse: '84 ครั้ง/นาที', weight: '63 กก.',
    labs: 'BUN/Cr ปกติ · K 4.1', imaging: 'ไม่ได้สั่งตรวจ', followUp: 'นัดวัดความดัน 1 เดือน', rights: 'สิทธิประกันสังคม', note: 'ลดเค็ม · วัดความดันที่บ้านเช้า-เย็น' },
  { date: '8 มกราคม 2569',   center: 'ศูนย์ 8 บางนา',  dept: 'ตรวจรักษา',  doctor: 'นพ.สมชาย ใจดี',      cc: 'ไอ มีเสมหะ ไข้ต่ำ ๆ',        dx: 'Acute bronchitis (J20.9)',     rx: 'Bromhexine, Paracetamol',
      meds: [{ name: 'Bromhexine 8 mg', sig: 'รับประทานครั้งละ 1 เม็ด วันละ 3 ครั้ง หลังอาหาร', qty: '30 เม็ด' }, { name: 'Paracetamol 500 mg', sig: 'ครั้งละ 1 เม็ด ทุก 6 ชม. เวลามีไข้', qty: '20 เม็ด' }],
    duration: '5 วัน', painLabel: 'เล็กน้อย', triage: 'Level 4 · Semi-urgent', room: 'ห้องตรวจที่ 2', bp: '124/78 mmHg', temp: '37.8 °C', pulse: '92 ครั้ง/นาที', weight: '61 กก.',
    labs: 'CBC — WBC 9,800', imaging: 'CXR ไม่พบปอดอักเสบ', followUp: 'กลับมาพบแพทย์หากไข้ไม่ลดใน 3 วัน', rights: 'สิทธิประกันสังคม', note: 'ดื่มน้ำมาก ๆ พักผ่อนให้เพียงพอ' },
  { date: '3 ธันวาคม 2568',  center: 'ศูนย์ 4 ดินแดง', dept: 'อายุรกรรม',  doctor: 'พญ.สมหญิง รักษ์ดี',  cc: 'ตรวจติดตามระดับน้ำตาล',      dx: 'Follow-up T2DM (E11.9)',       rx: 'Metformin 500 mg',
      meds: [{ name: 'Metformin 500 mg', sig: 'รับประทานครั้งละ 1 เม็ด วันละ 2 ครั้ง หลังอาหาร เช้า-เย็น', qty: '60 เม็ด' }],
    duration: 'ติดตามต่อเนื่อง', painLabel: 'ไม่ปวด', triage: 'Level 5 · Non-urgent', room: 'ห้องตรวจที่ 1', bp: '128/80 mmHg', temp: '36.6 °C', pulse: '78 ครั้ง/นาที', weight: '63 กก.',
    labs: 'FBS 132 · HbA1c 7.2%', imaging: 'ไม่ได้สั่งตรวจ', followUp: 'นัดเจาะน้ำตาล 3 เดือน', rights: 'สิทธิประกันสังคม', note: 'คุมอาหารแป้ง/น้ำตาล · ตรวจเท้าประจำปี' },
  { date: '17 ตุลาคม 2568',  center: 'ศูนย์ 8 บางนา',  dept: 'ตรวจรักษา',  doctor: 'พญ.วิภา สุขศรี',     cc: 'ตรวจสุขภาพประจำปี',           dx: 'Health check-up (Z00.0)',      rx: '—',
    duration: '—', painLabel: 'ไม่ปวด', triage: 'Level 5 · Non-urgent', room: 'ห้องตรวจที่ 4', bp: '120/76 mmHg', temp: '36.4 °C', pulse: '72 ครั้ง/นาที', weight: '62 กก.',
    labs: 'CBC · FBS · Lipid · LFT ปกติทั้งชุด', imaging: 'CXR ปกติ', followUp: 'ตรวจสุขภาพครั้งถัดไปปีหน้า', rights: 'สิทธิประกันสังคม', note: 'ผลอยู่ในเกณฑ์ปกติทั้งหมด' },
];

/* จำนวนครั้งที่ป๊อปอัป "ประวัติการรักษา" ต้องมีเสมอ (มติผู้ใช้ 28 ส.ค. 69) —
   HN ส่วนใหญ่ใน `TREATMENT_VISITS` มีแค่ 1–2 ครั้ง แถบ "วันที่รับบริการ" จึงมี
   บรรทัดเดียวและสลับวันที่ไม่ได้ */
const VISIT_HISTORY_COUNT = 10;

/* ครั้งเก่ากว่าที่ใช้เติมให้ครบ 10 — วันที่ไล่ย้อนหลังต่อจากรายการจริงของ HN
   ไม่ให้ชนกัน และเนื้อหาหลากหลายพอให้แต่ละใบอ่านต่างกันจริง */
const OLDER_VISIT_POOL = [
  { date: '22 พฤศจิกายน 2568', center: 'ศูนย์ 4 ดินแดง', dept: 'ตรวจรักษา', doctor: 'พญ.วิภา สุขศรี',        cc: 'เจ็บคอ กลืนลำบาก',        dx: 'Acute tonsillitis (J03.9)',      rx: 'Amoxicillin, Paracetamol',
      meds: [{ name: 'Amoxicillin 500 mg', sig: 'ครั้งละ 1 แคปซูล ทุก 8 ชม. ให้ครบ 10 วัน', qty: '30 แคปซูล' }, { name: 'Paracetamol 500 mg', sig: 'ครั้งละ 1 เม็ด ทุก 6 ชม. เวลามีไข้', qty: '20 เม็ด' }],
    duration: '3 วัน', painLabel: 'ปานกลาง', triage: 'Level 4 · Semi-urgent', room: 'ห้องตรวจที่ 2', bp: '118/74 mmHg', temp: '38.4 °C', pulse: '96 ครั้ง/นาที', weight: '61 กก.',
    labs: 'Rapid strep test — บวก', imaging: 'ไม่ได้สั่งตรวจ', followUp: 'กินยาให้ครบ 10 วัน', rights: 'สิทธิประกันสังคม', note: 'กลั้วคอน้ำเกลือ · งดของเย็นจัด' },
  { date: '9 ตุลาคม 2568',    center: 'ศูนย์ 8 บางนา',  dept: 'อายุรกรรม',  doctor: 'พญ.สมหญิง รักษ์ดี',    cc: 'ตรวจติดตามความดัน',        dx: 'Essential hypertension (I10)',   rx: 'Amlodipine 5 mg',
      meds: [{ name: 'Amlodipine 5 mg', sig: 'รับประทานครั้งละ 1 เม็ด วันละครั้ง เช้า', qty: '30 เม็ด' }],
    duration: 'ติดตามต่อเนื่อง', painLabel: 'ไม่ปวด', triage: 'Level 5 · Non-urgent', room: 'ห้องตรวจที่ 1', bp: '138/86 mmHg', temp: '36.6 °C', pulse: '80 ครั้ง/นาที', weight: '62 กก.',
    labs: 'BUN/Cr ปกติ', imaging: 'ไม่ได้สั่งตรวจ', followUp: 'นัดวัดความดัน 2 เดือน', rights: 'สิทธิประกันสังคม', note: 'ความดันเริ่มลงหลังปรับยา' },
  { date: '3 กันยายน 2568',   center: 'ศูนย์ 4 ดินแดง', dept: 'ตรวจรักษา', doctor: 'นพ.สมชาย ใจดี',        cc: 'ผื่นคันตามแขน',            dx: 'Allergic dermatitis (L23.9)',    rx: 'CPM, Calamine',
      meds: [{ name: 'Chlorpheniramine 4 mg', sig: 'ครั้งละ 1 เม็ด วันละ 3 ครั้ง หลังอาหาร (ง่วงได้)', qty: '15 เม็ด' }, { name: 'Calamine lotion', sig: 'ทาบริเวณที่คัน วันละ 2-3 ครั้ง', qty: '1 ขวด' }],
    duration: '1 สัปดาห์', painLabel: 'เล็กน้อย', triage: 'Level 5 · Non-urgent', room: 'ห้องตรวจที่ 3', bp: '122/78 mmHg', temp: '36.8 °C', pulse: '76 ครั้ง/นาที', weight: '62 กก.',
    labs: 'ไม่ได้สั่งตรวจ', imaging: 'ไม่ได้สั่งตรวจ', followUp: 'กลับมาพบแพทย์หากผื่นลามขึ้น', rights: 'สิทธิประกันสังคม', note: 'เลี่ยงสบู่ที่มีน้ำหอม · สงสัยแพ้ผงซักฟอก' },
  { date: '18 สิงหาคม 2568',  center: 'ศูนย์ 8 บางนา',  dept: 'อายุรกรรม',  doctor: 'นพ.วรวิทย์ เกียรติเจริญ', cc: 'เวียนศีรษะ บ้านหมุน',    dx: 'Vertigo (H81.1)',                rx: 'Betahistine',
      meds: [{ name: 'Betahistine 24 mg', sig: 'ครั้งละ 1 เม็ด วันละ 2 ครั้ง หลังอาหาร', qty: '20 เม็ด' }],
    duration: '2 วัน', painLabel: 'ปานกลาง', triage: 'Level 3 · Urgent', room: 'ห้องตรวจที่ 1', bp: '134/82 mmHg', temp: '36.5 °C', pulse: '88 ครั้ง/นาที', weight: '62 กก.',
    labs: 'CBC ปกติ · Electrolyte ปกติ', imaging: 'ไม่ได้สั่งตรวจ', followUp: 'นัดติดตาม 2 สัปดาห์', rights: 'สิทธิประกันสังคม', note: 'ห้ามขับรถขณะมีอาการ · ลุกจากเตียงช้า ๆ' },
  { date: '30 มิถุนายน 2568', center: 'ศูนย์ 4 ดินแดง', dept: 'ตรวจรักษา', doctor: 'พญ.ปรียาภรณ์ สุขสวัสดิ์', cc: 'ปวดท้องบิด ถ่ายเหลว',   dx: 'Acute gastroenteritis (A09)',    rx: 'ORS, Domperidone',
      meds: [{ name: 'ORS (ผงเกลือแร่)', sig: 'ละลายน้ำ 1 ซอง จิบบ่อย ๆ หลังถ่าย', qty: '10 ซอง' }, { name: 'Domperidone 10 mg', sig: 'ครั้งละ 1 เม็ด ก่อนอาหาร 30 นาที เวลาคลื่นไส้', qty: '15 เม็ด' }],
    duration: '1 วัน', painLabel: 'มาก', triage: 'Level 3 · Urgent', room: 'ห้องตรวจที่ 2', bp: '110/70 mmHg', temp: '37.6 °C', pulse: '102 ครั้ง/นาที', weight: '60 กก.',
    labs: 'Stool exam — ไม่พบเชื้อบิด', imaging: 'ไม่ได้สั่งตรวจ', followUp: 'กลับมาพบแพทย์หากถ่ายเป็นมูกเลือด', rights: 'สิทธิประกันสังคม', note: 'ให้ ORS ชดเชยน้ำ · งดอาหารรสจัด' },
  { date: '12 พฤษภาคม 2568',  center: 'ศูนย์ 8 บางนา',  dept: 'อายุรกรรม',  doctor: 'พญ.สมหญิง รักษ์ดี',    cc: 'ตรวจติดตามระดับน้ำตาล',    dx: 'Follow-up T2DM (E11.9)',         rx: 'Metformin 500 mg',
      meds: [{ name: 'Metformin 500 mg', sig: 'รับประทานครั้งละ 1 เม็ด วันละ 2 ครั้ง หลังอาหาร เช้า-เย็น', qty: '60 เม็ด' }],
    duration: 'ติดตามต่อเนื่อง', painLabel: 'ไม่ปวด', triage: 'Level 5 · Non-urgent', room: 'ห้องตรวจที่ 1', bp: '126/80 mmHg', temp: '36.6 °C', pulse: '74 ครั้ง/นาที', weight: '63 กก.',
    labs: 'FBS 145 · HbA1c 7.8%', imaging: 'ไม่ได้สั่งตรวจ', followUp: 'นัดเจาะน้ำตาล 3 เดือน', rights: 'สิทธิประกันสังคม', note: 'น้ำตาลยังสูงกว่าเป้า · ทบทวนอาหาร' },
  { date: '4 เมษายน 2568',    center: 'ศูนย์ 4 ดินแดง', dept: 'ตรวจรักษา', doctor: 'นพ.สมชาย ใจดี',        cc: 'ไอเรื้อรัง 3 สัปดาห์',      dx: 'Chronic cough (R05)',            rx: 'ส่ง X-ray ปอด',
      meds: [{ name: 'ไม่มีการจ่ายยา', sig: 'ส่งตรวจ X-ray ปอดอย่างเดียว', qty: '—' }],
    duration: '3 สัปดาห์', painLabel: 'ไม่ปวด', triage: 'Level 4 · Semi-urgent', room: 'ห้องตรวจที่ 4', bp: '120/76 mmHg', temp: '36.9 °C', pulse: '80 ครั้ง/นาที', weight: '61 กก.',
    labs: 'CBC ปกติ · เสมหะ AFB ไม่พบเชื้อ', imaging: 'CXR — ไม่พบรอยโรค', followUp: 'นัดฟังผลเสมหะ 1 สัปดาห์', rights: 'สิทธิประกันสังคม', note: 'คัดกรองวัณโรคตามแนวทาง — ผลไม่พบเชื้อ' },
  { date: '19 กุมภาพันธ์ 2568', center: 'ศูนย์ 8 บางนา', dept: 'ตรวจรักษา', doctor: 'พญ.วิภา สุขศรี',       cc: 'ปวดเมื่อยกล้ามเนื้อคอบ่า',  dx: 'Myofascial pain (M79.1)',        rx: 'NSAIDs, กายภาพบำบัด',
      meds: [{ name: 'Ibuprofen 400 mg', sig: 'ครั้งละ 1 เม็ด วันละ 3 ครั้ง หลังอาหารทันที', qty: '30 เม็ด' }],
    duration: '2 สัปดาห์', painLabel: 'ปานกลาง', triage: 'Level 5 · Non-urgent', room: 'ห้องตรวจที่ 3', bp: '124/80 mmHg', temp: '36.5 °C', pulse: '74 ครั้ง/นาที', weight: '62 กก.',
    labs: 'ไม่ได้สั่งตรวจ', imaging: 'ไม่ได้สั่งตรวจ', followUp: 'นัดกายภาพบำบัด 6 ครั้ง', rights: 'สิทธิประกันสังคม', note: 'ปรับท่านั่งทำงาน · ยืดกล้ามเนื้อทุก 1 ชม.' },
  { date: '7 มกราคม 2568',    center: 'ศูนย์ 4 ดินแดง', dept: 'อายุรกรรม',  doctor: 'นพ.วรวิทย์ เกียรติเจริญ', cc: 'ตรวจสุขภาพประจำปี',      dx: 'Health check-up (Z00.0)',        rx: '—',
    duration: '—', painLabel: 'ไม่ปวด', triage: 'Level 5 · Non-urgent', room: 'ห้องตรวจที่ 1', bp: '118/74 mmHg', temp: '36.4 °C', pulse: '70 ครั้ง/นาที', weight: '61 กก.',
    labs: 'CBC · FBS · Lipid · LFT ปกติทั้งชุด', imaging: 'CXR ปกติ', followUp: 'ตรวจสุขภาพครั้งถัดไปปีหน้า', rights: 'สิทธิประกันสังคม', note: 'ผลอยู่ในเกณฑ์ปกติทั้งหมด' },
  { date: '11 พฤศจิกายน 2567', center: 'ศูนย์ 8 บางนา', dept: 'ตรวจรักษา', doctor: 'พญ.ปรียาภรณ์ สุขสวัสดิ์', cc: 'ตาแดง เคืองตา',          dx: 'Acute conjunctivitis (H10.3)',   rx: 'ยาหยอดตา',
      meds: [{ name: 'Chloramphenicol eye drop 0.5%', sig: 'หยอดตาข้างที่แดง ครั้งละ 1-2 หยด ทุก 4 ชม.', qty: '1 ขวด' }],
    duration: '2 วัน', painLabel: 'เล็กน้อย', triage: 'Level 4 · Semi-urgent', room: 'ห้องตรวจที่ 2', bp: '120/78 mmHg', temp: '36.7 °C', pulse: '76 ครั้ง/นาที', weight: '62 กก.',
    labs: 'ไม่ได้สั่งตรวจ', imaging: 'ไม่ได้สั่งตรวจ', followUp: 'กลับมาพบแพทย์หากตาพร่ามัว', rights: 'สิทธิประกันสังคม', note: 'ระวังการติดต่อ · ล้างมือบ่อย ๆ ไม่ใช้ผ้าเช็ดหน้าร่วมกัน' },
];

/* Per-HN list of visit-detail records — most recent first. The simple
   `TREATMENT_VISITS` table above already lists the dates for each HN;
   here we just attach a center label to the top entry and reuse the
   default detail block so every selected date renders a full panel.
   เติมจาก `OLDER_VISIT_POOL` จนครบ `VISIT_HISTORY_COUNT` ครั้งเสมอ. */
const buildVisitDetailsForHn = (hn) => {
  const seeded = TREATMENT_VISITS[hn]?.length ? TREATMENT_VISITS[hn] : FALLBACK_VISITS;
  const seededDates = new Set(seeded.map((v) => v.date));
  const padding = OLDER_VISIT_POOL
    .filter((v) => !seededDates.has(v.date))
    .slice(0, Math.max(0, VISIT_HISTORY_COUNT - seeded.length));
  const visits = [...seeded, ...padding].slice(0, VISIT_HISTORY_COUNT);
  return visits.map((v) => ({
    ...DEFAULT_VISIT_DETAIL,
    date: v.date,
    center: v.center ?? null,
    cc: v.cc || DEFAULT_VISIT_DETAIL.cc,
    dept: v.dept ?? null,
    doctor: v.doctor ?? null,
    dx: v.dx ?? null,
    rx: v.rx ?? null,
    /* ช่องรายละเอียดต่อครั้ง — ไม่ตกไปที่ DEFAULT_VISIT_DETAIL เพราะค่าเดียวกัน
       ซ้ำทุกใบจะอ่านเหมือนข้อมูลปลอม ไทม์ไลน์ตัดช่องที่ว่างทิ้งอยู่แล้ว */
    duration: v.duration ?? DEFAULT_VISIT_DETAIL.duration,
    painLabel: v.painLabel ?? null,
    triage: v.triage ?? null,
    room: v.room ?? null,
    bp: v.bp ?? null,
    temp: v.temp ?? null,
    pulse: v.pulse ?? null,
    weightText: v.weight ?? null,
    labs: v.labs ?? null,
    imaging: v.imaging ?? null,
    followUp: v.followUp ?? null,
    rights: v.rights ?? null,
    note: v.note ?? null,
    meds: v.meds ?? [],
  }));
};

export const findVisitDetailsByHn = (hn) => buildVisitDetailsForHn(hn);

/* ─────────────────────────────────────────────────────────────
   Screening summary — feeds Step 2 คัดกรองและซักประวัติ
   (Figma PHCIS | CPOE · node 183:14937). Read-only summary of
   the latest OPD screening: vitals (reuses the vital block
   shape), chief complaint + duration, triage level, mobility,
   pain score, nursing care orders, and the assessor.
   ───────────────────────────────────────────────────────────── */

/* ─────────────────────────────────────────────────────────────
   Physical examination — feeds Step 3 ตรวจร่างกาย
   (Figma PHCIS-ALL · node 2431:213971).
   ───────────────────────────────────────────────────────────── */

export const EXAM_SYSTEM_TABS = [
  { key: 'heent', label: 'Heent' },
  { key: 'heart', label: 'Heart' },
  { key: 'lungs', label: 'Lungs' },
  { key: 'abdomen', label: 'Abdomen' },
  { key: 'extremities', label: 'Extremities' },
];

export const EXAM_VIEW_TABS = [
  { key: 'both', label: 'ทั้งสองด้าน' },
  { key: 'front', label: 'ด้านหน้า' },
  { key: 'back', label: 'ด้านหลัง' },
  { key: 'sides', label: 'ทั้งสองข้าง' },
  { key: 'left', label: 'ด้านซ้าย' },
  { key: 'right', label: 'ด้านขวา' },
];

export const EXAM_SUPPORT_ITEMS = [
  { key: 'lab', label: 'ผลตรวจชันสูตร', circleIcon: 'biotech', hasResult: true },
  { key: 'radiology', label: 'ผลตรวจรังสี', circleIcon: 'radiology', hasResult: true },
  { key: 'vaccine', label: 'ประวัติการฉีดวัคซีน', circleIcon: 'vaccines', hasResult: false },
  { key: 'history', label: 'ประวัติการรักษา', circleIcon: 'stethoscope', hasResult: false },
  { key: 'referral', label: 'ประวัติส่งปรึกษา', circleIcon: 'forum', hasResult: false },
  { key: 'rx', label: 'ประวัติการจ่ายยา', circleIcon: 'pill', hasResult: false },
  { key: 'transfer', label: 'ประวัติการส่งต่อ', circleIcon: 'swap_horiz', hasResult: false },
];

export const DEFAULT_NURSE_EXAM_NOTES = {
  cc: 'ปวดหลังช่วงล่างมาก ในเวลาที่ก้ม',
  pi: '-',
  pe: '-',
  duration: '1 สัปดาห์',
};

/* Doctor column starts empty by design — the clinician should either copy
   from the nurse panel (which keeps the tick affordance meaningful) or
   type fresh. Seeding values would defeat both the empty-state UX and
   the nurse→doctor copy contract. */
export const DEFAULT_DOCTOR_EXAM_NOTES = {
  cc: '',
  pi: '',
  pe: '',
  duration: '',
};

/* Step 3 attachments ship empty so the treatment flow opens in a clean
   first-visit state — the doctor uploads lab PDFs / images inside Step 3
   and they appear in the Step 4 summary. Seeding entries here would
   pre-populate `hasExamRecord` and hide Step 4's "ยังไม่มีบันทึกการตรวจ
   ร่างกาย" empty state (Figma 329:38544) before the user ever touches
   Step 3. */
export const DEFAULT_EXAM_ATTACHMENTS = [];

/* Step 4 — วินิจฉัย / Diagnosis (Figma 317:29773).
   `DIAGNOSIS_TYPE_OPTIONS` mirrors the backend `DIAGTYPE` reference
   table (7 rows: PRINCIPLE DX / CO-MORBIDITY / COMPLICATION / OTHER /
   EXTERNAL CAUSE / ADDITIONAL CODE / MORPHOLOGY CODE). Each entry
   carries the DB code (`code`), the English + Thai labels, the
   composed `label` ("ENGLISH (ภาษาไทย)" matching the DB DESC column),
   and the ColorfulBadge palette the ICD table uses. Severity colors
   mirror clinical convention: magenta = primary diagnosis, blue =
   co-morbid chronic, orange = complication, grey = catch-all,
   purple = external cause, teal = additional code, pink = morphology
   code. */
export const DIAGNOSIS_TYPE_OPTIONS = [
  { value: 'principle',      code: '1', label: 'PRINCIPLE DX (การวินิจฉัยโรคหลัก)',        labelEn: 'PRINCIPLE DX',      labelTh: 'การวินิจฉัยโรคหลัก',  badgeStyle: 'magenta' },
  { value: 'comorbidity',    code: '2', label: 'CO-MORBIDITY (การวินิจฉัยโรคร่วม)',          labelEn: 'CO-MORBIDITY',      labelTh: 'การวินิจฉัยโรคร่วม',  badgeStyle: 'blue'    },
  { value: 'complication',   code: '3', label: 'COMPLICATION (การวินิจฉัยโรคแทรก)',          labelEn: 'COMPLICATION',      labelTh: 'การวินิจฉัยโรคแทรก',  badgeStyle: 'orange'  },
  { value: 'other',          code: '4', label: 'OTHER (อื่นๆ)',                            labelEn: 'OTHER',             labelTh: 'อื่นๆ',                badgeStyle: 'grey'    },
  { value: 'externalCause',  code: '5', label: 'EXTERNAL CAUSE (สาเหตุภายนอก)',             labelEn: 'EXTERNAL CAUSE',    labelTh: 'สาเหตุภายนอก',         badgeStyle: 'purple'  },
  { value: 'additionalCode', code: '6', label: 'ADDITIONAL CODE (รหัสเสริม)',               labelEn: 'ADDITIONAL CODE',   labelTh: 'รหัสเสริม',            badgeStyle: 'teal'    },
  { value: 'morphologyCode', code: '7', label: 'MORPHOLOGY CODE (รหัสเกี่ยวกับเนื้องอก)',     labelEn: 'MORPHOLOGY CODE',   labelTh: 'รหัสเกี่ยวกับเนื้องอก', badgeStyle: 'pink'    },
];

export const resolveDiagnosisType = (value) =>
  DIAGNOSIS_TYPE_OPTIONS.find((o) => o.value === value) || DIAGNOSIS_TYPE_OPTIONS[0];

/* Doctor roster used by Step 4's "แพทย์ผู้สั่ง" dropdown. Defaults to
   the patient's owning physician (set at page level in TreatmentFormPage). */
export const TREATMENT_DOCTOR_OPTIONS = [
  { value: 'somying',    label: 'พญ.สมหญิง รักษ์ดี' },
  { value: 'somchai',    label: 'นพ.สมชาย ใจดี'    },
  { value: 'wipa',       label: 'พญ.วิภา สุขศรี'    },
  { value: 'nattawut',   label: 'นพ.ณัฐวุฒิ บุญมี'  },
  { value: 'priyakorn',  label: 'พญ.ปริยากร เจริญสุข' },
];

/* Placeholder copy for the วินิจฉัยเบื้องต้น textarea on Step 4 — Figma
   PHCIS|Medical-examination 330:42665 "Text group" annotated
   "On first visit, the default state appears." The fields render empty
   with this example diagnosis shown in --text-input-default grey so the
   doctor sees the expected shape of the entry on a brand-new visit. */
export const DIAGNOSIS_NOTE_PLACEHOLDER = [
  'Lumbar strain / Mechanical low back pain',
  '- ปวดหลังส่วนล่างจากกล้ามเนื้อและเอ็น',
  '  โดยไม่มีสัญญาณอันตราย (No red flags)',
  '',
  'Lumbar disc herniation with radiculopathy',
  '- หมอนรองกระดูกสันหลังทับเส้นประสาท',
  '  บริเวณ L4-L5 / L5-S1',
].join('\n');

/* Placeholder copy for the คำสั่งแพทย์ textarea on Step 4 — same Figma
   first-visit default state (node 330:42665). Shown as greyed example
   text in the empty textarea, NOT as pre-filled content. */
export const DOCTOR_ORDER_NOTE_PLACEHOLDER = [
  '1. Paracetamol 500 mg 1 tab oral q 6 hr prn pain',
  '2. Ibuprofen 400 mg 1 tab oral tid pc (NSAIDs)',
  '3. Muscle relaxant: Methocarbamol 750 mg',
  '4. Hot compress บริเวณหลังส่วนล่าง วันละ 2 ครั้ง',
  '5. งดยกของหนัก งดก้มตัวกะทันหัน',
  '6. Physical therapy นัด 3 ครั้ง/สัปดาห์',
  '7. นัดติดตามอาการ 1 สัปดาห์',
  '8. ถ้าอาการไม่ดีขึ้น ส่ง X-ray Lumbar spine AP/Lateral',
].join('\n');

/* ICD-10 catalogue surfaced as Doctor AI suggestion capsules under the
   search input. Each entry stamps an action chip "ICD code + name" that
   the clinician can one-click into the diagnosis table.
   Also consumed by the Doctor AI <AISearch> via its `suggestions` prop
   — the panel filters this list by typed query (case-insensitive
   substring match on code or name) and pipes the result to AISearch
   typing-state dropdown.

   Scope: ~80 codes covering the conditions a Thai general OPD clinic
   most commonly bills (WHO ICD-10 + Thai MOH Thai-translation pool).
   Grouped by chapter to keep this readable — order doesn't affect the
   substring filter. Both Thai and English names live in the same
   string so the panel matches against either token. */
/* ═══ มติ คทง.1 ครั้งที่ 3 — ค้นหา ICD-10 ด้วย "ศัพท์แพทย์ทั่วไป" ═══════
   ช่องว่างที่ที่ประชุมชี้: แพทย์พิมพ์คำที่ใช้พูดกับคนไข้จริง ("ปวดหัว",
   "ความดัน", "เบาหวานลงไต", "BP สูง", "flu") แต่ index เดิมค้นเฉพาะชื่อ
   ทางการใน ICD-10 ซึ่งเป็นศัพท์ของ Coder → หาไม่เจอ ต้องเปิดหนังสือ

   ตารางนี้จึงเป็นชั้น synonym ทับ DEFAULT_ICD_SUGGESTIONS: code → คำพูด
   ที่ใช้จริงทั้งไทย/อังกฤษ/คำย่อที่แพทย์เขียนใน chart. ไม่แตะชื่อทางการ
   (ยังต้องส่งออกตามมาตรฐาน) — แค่เพิ่มทางเข้าให้หาเจอ                */
export const ICD10_COMMON_TERMS = {
  'A09':     ['ท้องเสียติดเชื้อ', 'ท้องร่วง', 'อาหารเป็นพิษ', 'food poisoning', 'AGE'],
  'A90':     ['ไข้เลือดออก', 'เดงกี่', 'dengue', 'DF'],
  'A91':     ['ไข้เลือดออกรุนแรง', 'DHF'],
  'B01.9':   ['อีสุกอีใส', 'สุกใส', 'chickenpox'],
  'B05.9':   ['หัด', 'ออกหัด', 'measles'],
  'B34.9':   ['ไวรัสลงกระเพาะ', 'ติดเชื้อไวรัส', 'viral'],
  'B86':     ['หิด', 'คันตามซอกนิ้ว'],
  'C50.9':   ['มะเร็งเต้านม', 'ก้อนที่เต้านม', 'breast cancer', 'CA breast'],
  'D17.9':   ['ก้อนไขมัน', 'ไขมันใต้ผิวหนัง', 'lipoma'],
  'E03.9':   ['ไทรอยด์ต่ำ', 'ขี้หนาว น้ำหนักขึ้น', 'hypothyroid'],
  'E11.9':   ['เบาหวาน', 'น้ำตาลสูง', 'DM', 'diabetes', 'เบาหวานชนิดที่ 2'],
  'E11.65': ['เบาหวานคุมไม่ได้', 'น้ำตาลสูงมาก', 'DM uncontrolled', 'เบาหวานลงไต'],
  'E66.9':   ['อ้วน', 'น้ำหนักเกิน', 'obesity', 'BMI สูง'],
  'E78.5':   ['ไขมันสูง', 'ไขมันในเลือดสูง', 'คอเลสเตอรอลสูง', 'DLP', 'dyslipidemia'],
  'E86':     ['ขาดน้ำ', 'dehydration'],
  'I10':   ['ความดัน', 'ความดันสูง', 'BP สูง', 'HT', 'hypertension'],
  'I48.91': ['หัวใจเต้นผิดจังหวะ', 'ใจสั่น', 'AF'],
  'I63.9': ['อัมพฤกษ์', 'อัมพาต', 'เส้นเลือดสมองตีบ', 'stroke', 'CVA'],
  'I83.9': ['เส้นเลือดขอด', 'varicose'],
  'J00':     ['หวัด', 'เป็นหวัด', 'น้ำมูกไหล', 'common cold', 'flu'],
  'J02.9': ['เจ็บคอ', 'คออักเสบ', 'sore throat'],
  'J03.9': ['ทอนซิลอักเสบ', 'ต่อมทอนซิล', 'tonsillitis'],
  'J06.9': ['ติดเชื้อทางเดินหายใจ', 'หวัดลงคอ', 'URI'],
  'J18.9': ['ปอดบวม', 'ปอดอักเสบ', 'pneumonia'],
  'J20.9': ['หลอดลมอักเสบ', 'ไอมีเสมหะ', 'bronchitis'],
  'J30.4': ['ภูมิแพ้อากาศ', 'แพ้อากาศ', 'จามบ่อย', 'AR', 'allergic rhinitis'],
  'J45.9': ['หอบหืด', 'หืด', 'asthma'],
  'K21.9': ['กรดไหลย้อน', 'แสบยอดอก', 'GERD'],
  'K29.7': ['โรคกระเพาะ', 'ปวดท้องโรคกระเพาะ', 'gastritis'],
  'K52.9': ['ลำไส้อักเสบ', 'ท้องเสียไม่ติดเชื้อ'],
  'K57.9': ['ถุงผนังลำไส้อักเสบ', 'diverticulitis'],
  'K59.0': ['ท้องผูก', 'ถ่ายไม่ออก', 'constipation'],
  'K80.5': ['นิ่วท่อน้ำดี', 'นิ่วถุงน้ำดี'],
  'L20.9': ['ผื่นภูมิแพ้ผิวหนัง', 'ผิวแห้งคัน', 'eczema', 'atopic'],
  'L23.9': ['ผื่นแพ้สัมผัส', 'แพ้ครีม', 'แพ้โลหะ'],
  'L29.9': ['คัน', 'คันตามตัว', 'itching'],
  'L70.0': ['สิว', 'acne'],
  'M10.9': ['เกาต์', 'ปวดข้อโป้งเท้า', 'gout', 'ยูริกสูง'],
  'M17.9': ['เข่าเสื่อม', 'ปวดเข่า', 'OA knee'],
  'M25.5': ['ปวดข้อ', 'joint pain'],
  'M54.2': ['ปวดคอ', 'คอเคล็ด', 'neck pain'],
  'M54.5': ['ปวดหลัง', 'ปวดเอว', 'low back pain', 'LBP'],
  'M54.9': ['ปวดหลังทั่วไป', 'back pain'],
  'M79.1': ['ปวดกล้ามเนื้อ', 'ปวดเมื่อย', 'myalgia'],
  'M81.0': ['กระดูกพรุน', 'วัยทองกระดูกบาง', 'osteoporosis'],
  'N18.9': ['ไตเรื้อรัง', 'ไตเสื่อม', 'CKD', 'ไตวาย'],
  'N20.0': ['นิ่วในไต', 'นิ่วไต', 'kidney stone'],
  'N39.0': ['ติดเชื้อทางเดินปัสสาวะ', 'ปัสสาวะแสบขัด', 'UTI', 'กระเพาะปัสสาวะอักเสบ'],
  'N40':     ['ต่อมลูกหมากโต', 'ปัสสาวะไม่พุ่ง', 'BPH'],
  'N94.6': ['ปวดประจำเดือน', 'ปวดท้องเมนส์', 'dysmenorrhea'],
  'O80':     ['คลอดปกติ', 'คลอดครบกำหนด', 'NL'],
  'R05':     ['ไอ', 'ไอแห้ง', 'cough'],
  'R07.4': ['เจ็บหน้าอก', 'แน่นหน้าอก', 'chest pain'],
  'R10.4': ['ปวดท้อง', 'ท้องอืด', 'abdominal pain'],
  'R11.0': ['คลื่นไส้', 'อยากอาเจียน', 'nausea'],
  'R19.7': ['ท้องเสีย', 'ถ่ายเหลว', 'diarrhea'],
  'R42':     ['เวียนหัว', 'หน้ามืด', 'บ้านหมุน', 'dizziness', 'vertigo'],
  'R50.9': ['ไข้', 'ตัวร้อน', 'fever'],
  'R51':     ['ปวดหัว', 'ปวดศีรษะ', 'headache'],
  'R53':     ['อ่อนเพลีย', 'ไม่มีแรง', 'เพลีย', 'fatigue'],
  'S00.0': ['แผลถลอกหัว', 'หัวแตก'],
  'S43.0': ['ไหล่หลุด', 'ข้อไหล่หลุด'],
  'S52.5': ['ข้อมือหัก', 'กระดูกข้อมือหัก'],
  'S93.4': ['ข้อเท้าแพลง', 'เท้าพลิก', 'ankle sprain'],
  'T78.4': ['ภูมิแพ้', 'แพ้ไม่ทราบสาเหตุ', 'allergy'],
  'Z00.0': ['ตรวจสุขภาพ', 'ตรวจประจำปี', 'check up', 'annual check'],
  'Z23':     ['ฉีดวัคซีน', 'มารับวัคซีน', 'vaccine'],
  'Z71.3': ['ปรึกษาเรื่องอาหาร', 'คุมอาหาร', 'diet counseling'],
};

export const commonTermsForIcd = (code) => ICD10_COMMON_TERMS[code] || [];

export const DEFAULT_ICD_SUGGESTIONS = [
  /* — Chapter I · Infectious and parasitic diseases (A00–B99) — */
  { code: 'A09',   name: 'Other gastroenteritis and colitis of infectious origin (ลำไส้อักเสบติดเชื้อ)' },
  { code: 'A90',   name: 'Dengue fever (ไข้เลือดออก)' },
  { code: 'A91',   name: 'Dengue haemorrhagic fever (ไข้เลือดออกเด็งกี่)' },
  { code: 'B01.9', name: 'Varicella without complication (โรคอีสุกอีใส)' },
  { code: 'B05.9', name: 'Measles without complication (โรคหัด)' },
  { code: 'B34.9', name: 'Viral infection, unspecified (ติดเชื้อไวรัส ไม่ระบุชนิด)' },
  { code: 'B86',   name: 'Scabies (โรคหิด)' },

  /* — Chapter II · Neoplasms (C00–D48) — */
  { code: 'C50.9', name: 'Malignant neoplasm of breast, unspecified (มะเร็งเต้านม)' },
  { code: 'D17.9', name: 'Benign lipomatous neoplasm, unspecified (ก้อนไขมัน Lipoma)' },

  /* — Chapter IV · Endocrine, nutritional, metabolic (E00–E90) — */
  { code: 'E03.9', name: 'Hypothyroidism, unspecified (ไทรอยด์ทำงานต่ำ)' },
  { code: 'E11.9', name: 'Type 2 diabetes mellitus without complications (เบาหวานชนิดที่ 2)' },
  { code: 'E11.65', name: 'Type 2 DM with hyperglycaemia (เบาหวาน HT control ไม่ดี)' },
  { code: 'E66.9', name: 'Obesity, unspecified (โรคอ้วน)' },
  { code: 'E78.5', name: 'Hyperlipidaemia, unspecified (ไขมันในเลือดสูง)' },
  { code: 'E86',   name: 'Volume depletion (ภาวะขาดน้ำ)' },

  /* — Chapter V · Mental and behavioural (F00–F99) — */
  { code: 'F32.9', name: 'Depressive episode, unspecified (โรคซึมเศร้า)' },
  { code: 'F41.1', name: 'Generalized anxiety disorder (โรควิตกกังวลทั่วไป)' },
  { code: 'F51.0', name: 'Nonorganic insomnia (นอนไม่หลับ)' },

  /* — Chapter VI · Nervous system (G00–G99) — */
  { code: 'G43.9', name: 'Migraine, unspecified (ไมเกรน ไม่ระบุชนิด)' },
  { code: 'G44.2', name: 'Tension-type headache (ปวดศีรษะจากความเครียด)' },
  { code: 'G47.0', name: 'Disorders of initiating and maintaining sleep (นอนไม่หลับเรื้อรัง)' },
  { code: 'G56.0', name: 'Carpal tunnel syndrome (โรครยางค์ข้อมือ Carpal tunnel)' },

  /* — Chapter VII · Eye and adnexa (H00–H59) — */
  { code: 'H10.9', name: 'Conjunctivitis, unspecified (ตาแดง)' },
  { code: 'H52.4', name: 'Presbyopia (สายตายาวตามวัย)' },

  /* — Chapter VIII · Ear and mastoid (H60–H95) — */
  { code: 'H66.9', name: 'Otitis media, unspecified (หูชั้นกลางอักเสบ)' },
  { code: 'H81.0', name: 'Ménière’s disease (โรคน้ำในหูไม่เท่ากัน)' },
  { code: 'H92.0', name: 'Otalgia (ปวดหู)' },

  /* — Chapter IX · Circulatory (I00–I99) — */
  { code: 'I10',   name: 'Essential (primary) hypertension (ความดันโลหิตสูง)' },
  { code: 'I25.9', name: 'Chronic ischaemic heart disease, unspecified (หลอดเลือดหัวใจตีบเรื้อรัง)' },
  { code: 'I48.91', name: 'Atrial fibrillation, unspecified (หัวใจเต้นผิดจังหวะ AF)' },
  { code: 'I63.9', name: 'Cerebral infarction, unspecified (โรคหลอดเลือดสมองตีบ Stroke)' },
  { code: 'I83.9', name: 'Varicose veins of lower extremities (เส้นเลือดขอด)' },

  /* — Chapter X · Respiratory (J00–J99) — */
  { code: 'J00',   name: 'Acute nasopharyngitis (โรคหวัด)' },
  { code: 'J02.9', name: 'Acute pharyngitis, unspecified (คออักเสบเฉียบพลัน)' },
  { code: 'J03.9', name: 'Acute tonsillitis, unspecified (ต่อมทอนซิลอักเสบ)' },
  { code: 'J06.9', name: 'Acute upper respiratory infection, unspecified (ติดเชื้อทางเดินหายใจส่วนบน URI)' },
  { code: 'J18.9', name: 'Pneumonia, unspecified organism (ปอดบวม)' },
  { code: 'J20.9', name: 'Acute bronchitis, unspecified (หลอดลมอักเสบเฉียบพลัน)' },
  { code: 'J30.4', name: 'Allergic rhinitis, unspecified (ภูมิแพ้จมูก)' },
  { code: 'J45.9', name: 'Asthma, unspecified (โรคหืด)' },

  /* — Chapter XI · Digestive (K00–K93) — */
  { code: 'K21.9', name: 'Gastro-oesophageal reflux disease (GERD กรดไหลย้อน)' },
  { code: 'K29.7', name: 'Gastritis, unspecified (โรคกระเพาะอักเสบ)' },
  { code: 'K52.9', name: 'Noninfective gastroenteritis and colitis (ลำไส้อักเสบไม่ติดเชื้อ)' },
  { code: 'K57.9', name: 'Diverticular disease of intestine (โรคถุงผนังลำไส้ใหญ่อักเสบ)' },
  { code: 'K59.0', name: 'Constipation (ท้องผูก)' },
  { code: 'K80.5', name: 'Calculus of bile duct without cholangitis (นิ่วในท่อน้ำดี)' },

  /* — Chapter XII · Skin and subcutaneous (L00–L99) — */
  { code: 'L20.9', name: 'Atopic dermatitis, unspecified (ผื่นภูมิแพ้ผิวหนัง)' },
  { code: 'L23.9', name: 'Allergic contact dermatitis, unspecified (ผื่นแพ้สัมผัส)' },
  { code: 'L29.9', name: 'Pruritus, unspecified (อาการคัน)' },
  { code: 'L70.0', name: 'Acne vulgaris (สิว)' },

  /* — Chapter XIII · Musculoskeletal (M00–M99) — */
  { code: 'M10.9', name: 'Gout, unspecified (โรคเกาต์)' },
  { code: 'M17.9', name: 'Osteoarthritis of knee, unspecified (ข้อเข่าเสื่อม)' },
  { code: 'M25.5', name: 'Pain in joint (ปวดข้อ)' },
  { code: 'M54.2', name: 'Cervicalgia (ปวดคอ)' },
  { code: 'M54.5', name: 'Low back pain (ปวดหลังส่วนล่าง)' },
  { code: 'M54.9', name: 'Dorsalgia, unspecified (ปวดหลังไม่ระบุรายละเอียด)' },
  { code: 'M79.1', name: 'Myalgia (ปวดกล้ามเนื้อ)' },
  { code: 'M81.0', name: 'Postmenopausal osteoporosis (กระดูกพรุนวัยทอง)' },

  /* — Chapter XIV · Genitourinary (N00–N99) — */
  { code: 'N18.9', name: 'Chronic kidney disease, unspecified (โรคไตเรื้อรัง CKD)' },
  { code: 'N20.0', name: 'Calculus of kidney (นิ่วในไต)' },
  { code: 'N39.0', name: 'Urinary tract infection, site not specified (ติดเชื้อทางเดินปัสสาวะ UTI)' },
  { code: 'N40',   name: 'Hyperplasia of prostate (ต่อมลูกหมากโต BPH)' },
  { code: 'N94.6', name: 'Dysmenorrhoea, unspecified (ปวดประจำเดือน)' },

  /* — Chapter XV · Pregnancy, childbirth (O00–O99) — */
  { code: 'O80',   name: 'Encounter for full-term uncomplicated delivery (คลอดปกติครบกำหนด)' },

  /* — Chapter XVIII · Symptoms, signs (R00–R99) — */
  { code: 'R05',   name: 'Cough (ไอ)' },
  { code: 'R07.4', name: 'Chest pain, unspecified (เจ็บหน้าอก)' },
  { code: 'R10.4', name: 'Other and unspecified abdominal pain (ปวดท้อง)' },
  { code: 'R11.0', name: 'Nausea (คลื่นไส้)' },
  { code: 'R19.7', name: 'Diarrhoea, unspecified (ท้องเสีย)' },
  { code: 'R42',   name: 'Dizziness and giddiness (เวียนศีรษะ)' },
  { code: 'R50.9', name: 'Fever, unspecified (มีไข้ ไม่ระบุสาเหตุ)' },
  { code: 'R51',   name: 'Headache (ปวดศีรษะ)' },
  { code: 'R53',   name: 'Malaise and fatigue (อ่อนเพลีย)' },

  /* — Chapter XIX · Injury, poisoning (S00–T98) — */
  { code: 'S00.0', name: 'Superficial injury of scalp (แผลถลอกหนังศีรษะ)' },
  { code: 'S43.0', name: 'Dislocation of shoulder joint (ข้อไหล่หลุด)' },
  { code: 'S52.5', name: 'Fracture of lower end of radius (กระดูกข้อมือหัก)' },
  { code: 'S93.4', name: 'Sprain and strain of ankle (ข้อเท้าแพลง)' },
  { code: 'T78.4', name: 'Allergy, unspecified (โรคภูมิแพ้ ไม่ระบุชนิด)' },

  /* — Chapter XXI · Health-status factors (Z00–Z99) — */
  { code: 'Z00.0', name: 'General adult medical examination (ตรวจสุขภาพประจำปี)' },
  { code: 'Z23',   name: 'Encounter for immunization (มาฉีดวัคซีน)' },
  { code: 'Z71.3', name: 'Dietary counselling and surveillance (ให้คำปรึกษาเรื่องอาหาร)' },
];

/* Past-visit diagnoses surfaced by the Re-Diagnosis popup (Figma PHCIS |
   Medical-examination 161:42074). Each entry stamps the visit date the
   diagnosis was committed in + the ICD code and name. The popup renders
   the list with checkboxes; selected rows commit into the active visit's
   `form.diagnoses` so the clinician can re-issue previously-recorded
   diagnoses without retyping them. Dates are formatted with Thai
   Buddhist year (พ.ศ.) to match the Figma copy exactly. */
export const PAST_VISIT_DIAGNOSES = [
  { id: 'pv1',  date: '2 เมษายน 2569',     code: 'I10',   name: 'Dorsalgia, unspecified (ปวดหลังไม่ระบุรายละเอียด)' },
  { id: 'pv2',  date: '2 เมษายน 2569',     code: 'E11',   name: 'Type 2 Diabetes mellitus (เบาหวานชนิดที่ 2)' },
  { id: 'pv3',  date: '10 กันยายน 2568',  code: 'Z115',  name: 'Hypertension (ความดันโลหิตสูง)' },
  { id: 'pv4',  date: '10 กันยายน 2568',  code: 'J06',   name: 'Acute upper respiratory infection' },
  { id: 'pv5',  date: '5 กันยายน 2568',   code: 'R059',  name: 'Cough (ไอ)' },
  { id: 'pv6',  date: '5 กันยายน 2568',   code: 'R060',  name: 'Dyspnoea (หายใจลำบาก)' },
  { id: 'pv7',  date: '12 มิถุนายน 2568', code: 'U071',  name: 'COVID-19, virus identified (lab confirmed)' },
  { id: 'pv8',  date: '2 มิถุนายน 2568',  code: 'J128',  name: 'Other viral pneumonia' },
  { id: 'pv9',  date: '1 มิถุนายน 2568',  code: 'J00',   name: 'Acute nasopharyngitis (common cold)' },
  { id: 'pv10', date: '1 มิถุนายน 2568',  code: 'U071',  name: 'COVID-19, virus identified (lab confirmed)' },
];

/* Free-text diagnosis suggestions surfaced by SuggestibleTextarea for
   Step 4. Pool covers MS / spine / neuro presentations that match the
   Figma 317:29773 sample diagnosis copy. */
export const DIAGNOSIS_SUGGESTIONS = [
  'Lumbar strain / Mechanical low back pain',
  'ปวดหลังส่วนล่างจากกล้ามเนื้อและเอ็น',
  'โดยไม่มีสัญญาณอันตราย (No red flags)',
  'Lumbar disc herniation with radiculopathy',
  'หมอนรองกระดูกสันหลังทับเส้นประสาท',
  'บริเวณ L4-L5 / L5-S1',
  'Acute viral upper respiratory tract infection',
  'ไข้หวัดใหญ่ / ติดเชื้อทางเดินหายใจส่วนบน',
  'Migraine headache without aura',
  'ปวดศีรษะไมเกรน',
  'Hypertension stage I, well-controlled',
  'ความดันโลหิตสูงระยะที่ 1 คุมได้ดี',
  'Type 2 diabetes mellitus, with neuropathy',
  'เบาหวานชนิดที่ 2 มีอาการทางประสาท',
  'Gastroesophageal reflux disease (GERD)',
  'Bronchial asthma — mild persistent',
  'หอบหืดระยะเรื้อรังน้อย',
  'Acute gastroenteritis, suspected viral',
  'ท้องเสียเฉียบพลัน สงสัยติดเชื้อไวรัส',
  'Allergic rhinitis, seasonal',
  'โรคจมูกอักเสบจากภูมิแพ้',
];

/* ─── Step 5 — สั่งการรักษา / Treatment Order (Figma 2508:98417) ─────
   Five-category TabCapsule strip (`type` maps to status: in-progress = blue
   dot, success = green tick, default = neutral). The active category drives
   which sub-table renders. */
export const TREATMENT_ORDER_CATEGORIES = [
  { key: 'medication', label: 'ยา',          type: 'default'      },
  { key: 'medicalSupply', label: 'เวชภัณฑ์มิใช่ยา', type: 'default' },
  { key: 'lab',        label: 'แล็บ',         type: 'in-progress'  },
  { key: 'xray',       label: 'X-ray / RIS',  type: 'success'      },
  { key: 'procedure',  label: 'หัตถการ',      type: 'default'      },
  { key: 'consult',    label: 'ปรึกษา',       type: 'default'      },
];

/* Common usage / route shorthand surfaced as "Often order" suggestion chips
   under the medication tab (Figma 2508:98582). `image` maps the chip
   to the same local pill photo used in DEFAULT_MEDICATION_ORDERS so
   chip-inserted rows render with a matching thumbnail in the รูป column.
   Images live in `public/images/medications/` and are referenced by
   absolute path so Vite serves them at runtime. */
export const OFTEN_ORDER_CHIPS = [
  { key: 'ibuprofen',     label: 'Ibuprofen 400 mg',     image: '/images/medications/med-ibuprofen.png' },
  { key: 'methocarbamol', label: 'Methocarbamol 750 mg', image: '/images/medications/med-methocarbamol.png' },
  /* Orphenadrine doesn't have its own pill photo yet — falls back to
     the ibuprofen tablet image so chip-inserted rows still get a
     placeholder thumbnail. Replace when public/images/medications/
     med-orphenadrine.png lands. */
  { key: 'orphenadrine',  label: 'Orphenadrine 35 mg',   image: '/images/medications/med-ibuprofen.png' },
  { key: 'omeprazole',    label: 'Omeprazole 20 mg',     image: '/images/medications/med-omeprazole.png' },
];

/* Pre-seeded medication order rows so the demo opens with a populated
   table matching the Figma PHCIS|CPOE 200:18627 medication tab.

   `image` paths point to AI-generated blister-pack photographs sitting
   in `public/images/medications/` (one per drug, ~50–70 KB each, 256 px
   square). Style matches Figma 200:18648 — silver foil blister with
   the actual pill colour/shape visible. The Table renders these as a
   40 × 40 circular avatar in the รูป column via `MedImageTile`.

   `status` flags drive the per-row action badges in the Approve /
   รอ Consult / STAT / พิมพ์ columns:
     • approve=true  → green "อนุมัติ" badge
     • consult=true  → orange "รอ Consult" badge
     • stat=true     → red "STAT" badge
     • print=true    → green "พิมพ์" badge
   At most ONE of {approve, consult, stat} is set per row — they
   represent mutually-exclusive workflow states. */
const MED_IMG = (slug) => `/images/medications/med-${slug}.png`;

export const DEFAULT_MEDICATION_ORDERS = [
  {
    id: 'med-1',
    image: MED_IMG('paracetamol'),
    name: 'Paracetamol 500mg',
    usage: 'รับประทานครั้งละ 1 เม็ดทุก 6 ชั่วโมงเมื่อมีอาการ',
    dosePerTake: '1',
    unit: 'เม็ด',
    frequency: 'ทุก 6 ชม.',
    when: 'หลังอาหาร / เมื่อมีอาการ',
    warning: 'ใช้เมื่อมีไข้/ปวด — ไม่เกิน 8 เม็ด/วัน หลีกเลี่ยงในผู้ป่วยโรคตับ',
    quantity: 20,
    totalPrice: 40,
    reimbursable: true,
    purpose: 'แก้ปวด ลดไข้',
    approve: true,
    consult: false,
    stat: false,
    print: true,
    editor: 'พญ.สมหญิง',
  },
  {
    id: 'med-2',
    image: MED_IMG('ibuprofen'),
    name: 'Ibuprofen 400mg',
    usage: 'รับประทานครั้งละ 1 เม็ดทุก 8 ชั่วโมงพร้อมอาหาร',
    dosePerTake: '1',
    unit: 'เม็ด',
    frequency: 'ทุก 8 ชม.',
    when: 'หลังอาหารทันที',
    warning: 'หลีกเลี่ยงในผู้ป่วยโรคไต / กระเพาะอักเสบ / NSAIDs allergy',
    quantity: 15,
    totalPrice: 75,
    reimbursable: true,
    purpose: 'แก้ปวด ต้านอักเสบ',
    approve: true,
    consult: false,
    stat: false,
    print: true,
    editor: 'พญ.สมหญิง',
  },
  {
    id: 'med-3',
    image: MED_IMG('methocarbamol'),
    name: 'Methocarbamol 750mg',
    usage: 'รับประทานครั้งละ 1 เม็ดทุก 8 ชั่วโมงเป็นเวลา 5 วัน',
    dosePerTake: '1',
    unit: 'เม็ด',
    frequency: 'ทุก 8 ชม.',
    when: 'พร้อมอาหาร',
    warning: 'อาจทำให้ง่วงซึม — งดขับขี่ยานพาหนะและงดดื่มแอลกอฮอล์',
    quantity: 15,
    totalPrice: 60,
    reimbursable: false,
    purpose: 'คลายกล้ามเนื้อ',
    approve: false,
    consult: true,
    stat: false,
    print: false,
    editor: 'พญ.สมหญิง',
  },
  {
    id: 'med-4',
    image: MED_IMG('amoxicillin'),
    name: 'Amoxicillin 500mg',
    usage: 'รับประทานครั้งละ 1 แคปซูลทุก 8 ชั่วโมง จนหมด',
    dosePerTake: '1',
    unit: 'แคปซูล',
    frequency: 'ทุก 8 ชม.',
    when: 'ก่อนอาหาร 1 ชม.',
    warning: 'แพ้ Penicillin: ห้ามใช้ — รับประทานจนหมดแม้อาการดีขึ้น',
    quantity: 21,
    totalPrice: 105,
    reimbursable: true,
    purpose: 'ฆ่าเชื้อแบคทีเรีย',
    approve: true,
    consult: false,
    stat: false,
    print: true,
    editor: 'พญ.สมหญิง',
  },
  {
    id: 'med-5',
    image: MED_IMG('omeprazole'),
    name: 'Omeprazole 20mg',
    usage: 'รับประทานครั้งละ 1 แคปซูลก่อนอาหารเช้า',
    dosePerTake: '1',
    unit: 'แคปซูล',
    frequency: 'วันละ 1 ครั้ง',
    when: 'ก่อนอาหารเช้า 30 นาที',
    warning: 'ใช้ระยะสั้นไม่เกิน 14 วัน หากอาการไม่ดีขึ้นพบแพทย์',
    quantity: 14,
    totalPrice: 70,
    reimbursable: true,
    purpose: 'ลดกรดในกระเพาะ',
    approve: true,
    consult: false,
    stat: false,
    print: true,
    editor: 'พญ.สมหญิง',
  },
  {
    id: 'med-6',
    image: MED_IMG('cetirizine'),
    name: 'Cetirizine 10mg',
    usage: 'รับประทานครั้งละ 1 เม็ดก่อนนอน',
    dosePerTake: '1',
    unit: 'เม็ด',
    frequency: 'วันละ 1 ครั้ง',
    when: 'ก่อนนอน',
    warning: 'อาจง่วงซึมเล็กน้อย ระวังในผู้สูงอายุ',
    quantity: 10,
    totalPrice: 25,
    reimbursable: true,
    purpose: 'แก้แพ้ คัดจมูก',
    approve: false,
    consult: false,
    stat: true,
    print: false,
    editor: 'พญ.สมหญิง',
  },
];

/* Past-visit medications surfaced by the Re-Medicine popup (Figma
   PHCIS|CPOE 200:23111 + the 271:194 image-tile edit). Mirrors
   DEFAULT_MEDICATION_ORDERS row shape + stamps the visit `date` (Thai
   Buddhist year) and diagnosis `code` the prescription was issued
   under so the clinician can scan chronologically and pick rows to
   re-prescribe in the current visit.

   Image mapping convention — only six drug photographs ship under
   `public/images/medications/` (paracetamol, ibuprofen, methocarbamol,
   amoxicillin, omeprazole, cetirizine), so entries fall back per
   pharmacological / visual class when an exact photo isn't available:
     • antibiotic tablets/capsules → amoxicillin
     • NSAIDs                      → ibuprofen
     • muscle relaxants            → methocarbamol
     • PPIs                        → omeprazole
     • antihistamines              → cetirizine
     • plain white round tablets   → paracetamol
     • non-tablet forms (inhalers, creams) → `image: ''` so the
       DrugImageTile fallback renders the brand-tinted medication
       pictogram instead of a misleading tablet photo.

   On confirm, selected rows are appended to `form.medications` with
   fresh `id`s (see appendPastMedications in TreatmentSteps.jsx). */
export const PAST_VISIT_MEDICATIONS = [
  {
    id: 'pvm-1',
    date: '2 เมษายน 2569',
    code: 'I10',
    image: MED_IMG('amoxicillin'),
    name: 'VILERM (Aciclovir 400 mg)',
    usage: 'รับประทาน (Oral)',
    dosePerTake: '1',
    unit: 'เม็ด',
    frequency: 'วันละ 2 ครั้ง',
    when: 'เช้า-เย็น',
    warning: 'ดื่มน้ำมากๆ ขณะใช้ยา',
    quantity: 35,
    totalPrice: 500,
    reimbursable: true,
    purpose: 'ยาด้านไวรัส (Antiviral)',
    approve: false, consult: false, stat: false, print: false,
    editor: 'พญ.สมหญิง',
  },
  {
    id: 'pvm-2',
    date: '2 เมษายน 2569',
    code: 'I10',
    image: MED_IMG('amoxicillin'),
    name: 'Amoxicillin 500 mg',
    usage: 'รับประทาน (Oral)',
    dosePerTake: '1',
    unit: 'แคปซูล',
    frequency: 'ทุก 8 ชั่วโมง',
    when: 'ก่อนอาหาร 1 ชม.',
    warning: 'แพ้ Penicillin: ห้ามใช้',
    quantity: 21,
    totalPrice: 105,
    reimbursable: true,
    purpose: 'ฆ่าเชื้อแบคทีเรีย',
    approve: false, consult: false, stat: false, print: false,
    editor: 'พญ.สมหญิง',
  },
  {
    id: 'pvm-3',
    date: '10 กันยายน 2568',
    code: 'Z115',
    image: MED_IMG('ibuprofen'),
    name: 'Ibuprofen 400 mg',
    usage: 'รับประทาน (Oral)',
    dosePerTake: '1',
    unit: 'เม็ด',
    frequency: 'ทุก 8 ชั่วโมง',
    when: 'หลังอาหารทันที',
    warning: 'หลีกเลี่ยงในผู้ป่วยโรคไต / กระเพาะอักเสบ',
    quantity: 15,
    totalPrice: 75,
    reimbursable: true,
    purpose: 'แก้ปวด ต้านอักเสบ',
    approve: false, consult: false, stat: false, print: false,
    editor: 'พญ.สมหญิง',
  },
  {
    id: 'pvm-4',
    date: '1 กันยายน 2568',
    code: 'J06',
    image: MED_IMG('methocarbamol'),
    name: 'Methocarbamol 750 mg',
    usage: 'รับประทาน (Oral)',
    dosePerTake: '1',
    unit: 'เม็ด',
    frequency: 'ทุก 8 ชั่วโมง',
    when: 'พร้อมอาหาร',
    warning: 'อาจทำให้ง่วงซึม — งดขับขี่ยานพาหนะ',
    quantity: 15,
    totalPrice: 60,
    reimbursable: false,
    purpose: 'คลายกล้ามเนื้อ',
    approve: false, consult: false, stat: false, print: false,
    editor: 'พญ.สมหญิง',
  },
  {
    id: 'pvm-5',
    date: '12 มิถุนายน 2568',
    code: 'R059',
    image: MED_IMG('paracetamol'),
    name: 'Paracetamol 500 mg',
    usage: 'รับประทาน (Oral)',
    dosePerTake: '1',
    unit: 'เม็ด',
    frequency: 'ทุก 6 ชั่วโมงเมื่อมีอาการ',
    when: 'หลังอาหาร / เมื่อมีอาการ',
    warning: 'ไม่เกิน 8 เม็ด/วัน หลีกเลี่ยงในผู้ป่วยโรคตับ',
    quantity: 20,
    totalPrice: 40,
    reimbursable: true,
    purpose: 'แก้ปวด ลดไข้',
    approve: false, consult: false, stat: false, print: false,
    editor: 'พญ.สมหญิง',
  },
  {
    id: 'pvm-6',
    date: '6 มิถุนายน 2568',
    code: 'R060',
    image: MED_IMG('omeprazole'),
    name: 'Omeprazole 20 mg',
    usage: 'รับประทาน (Oral)',
    dosePerTake: '1',
    unit: 'แคปซูล',
    frequency: 'วันละครั้ง',
    when: 'ก่อนอาหารเช้า',
    warning: 'รับประทานขณะท้องว่าง',
    quantity: 14,
    totalPrice: 84,
    reimbursable: true,
    purpose: 'ลดกรด',
    approve: false, consult: false, stat: false, print: false,
    editor: 'พญ.สมหญิง',
  },
  {
    id: 'pvm-7',
    date: '20 พฤษภาคม 2568',
    code: 'J00',
    image: MED_IMG('cetirizine'),
    name: 'Cetirizine 10 mg',
    usage: 'รับประทาน (Oral)',
    dosePerTake: '1',
    unit: 'เม็ด',
    frequency: 'วันละครั้ง',
    when: 'ก่อนนอน',
    warning: 'อาจทำให้ง่วงซึม — งดขับขี่ยานพาหนะ',
    quantity: 10,
    totalPrice: 50,
    reimbursable: true,
    purpose: 'แก้แพ้ ลดน้ำมูก',
    approve: false, consult: false, stat: false, print: false,
    editor: 'พญ.สมหญิง',
  },
  {
    id: 'pvm-8',
    date: '15 พฤษภาคม 2568',
    code: 'E11',
    image: MED_IMG('methocarbamol'),
    name: 'Metformin 500 mg',
    usage: 'รับประทาน (Oral)',
    dosePerTake: '1',
    unit: 'เม็ด',
    frequency: 'วันละ 2 ครั้ง',
    when: 'พร้อมอาหาร เช้า-เย็น',
    warning: 'อาจมีอาการคลื่นไส้ในช่วงเริ่มต้น',
    quantity: 60,
    totalPrice: 180,
    reimbursable: true,
    purpose: 'ควบคุมระดับน้ำตาลในเลือด',
    approve: false, consult: false, stat: false, print: false,
    editor: 'พญ.สมหญิง',
  },
  {
    id: 'pvm-9',
    date: '12 พฤษภาคม 2568',
    code: 'I10',
    image: MED_IMG('paracetamol'),
    name: 'Amlodipine 5 mg',
    usage: 'รับประทาน (Oral)',
    dosePerTake: '1',
    unit: 'เม็ด',
    frequency: 'วันละครั้ง',
    when: 'เช้า',
    warning: 'อาจทำให้ข้อเท้าบวม — แจ้งแพทย์หากบวมมาก',
    quantity: 30,
    totalPrice: 120,
    reimbursable: true,
    purpose: 'ลดความดันโลหิต',
    approve: false, consult: false, stat: false, print: false,
    editor: 'พญ.สมหญิง',
  },
  {
    id: 'pvm-10',
    date: '5 พฤษภาคม 2568',
    code: 'K21',
    image: MED_IMG('omeprazole'),
    name: 'Esomeprazole 40 mg',
    usage: 'รับประทาน (Oral)',
    dosePerTake: '1',
    unit: 'แคปซูล',
    frequency: 'วันละครั้ง',
    when: 'ก่อนอาหารเช้า 30 นาที',
    warning: 'รับประทานขณะท้องว่าง',
    quantity: 14,
    totalPrice: 168,
    reimbursable: false,
    purpose: 'รักษากรดไหลย้อน',
    approve: false, consult: false, stat: false, print: false,
    editor: 'พญ.สมหญิง',
  },
  {
    id: 'pvm-11',
    date: '28 เมษายน 2568',
    code: 'M545',
    image: MED_IMG('ibuprofen'),
    name: 'Naproxen 250 mg',
    usage: 'รับประทาน (Oral)',
    dosePerTake: '1',
    unit: 'เม็ด',
    frequency: 'ทุก 12 ชั่วโมง',
    when: 'หลังอาหารทันที',
    warning: 'หลีกเลี่ยงในผู้ป่วยโรคไต / กระเพาะอักเสบ',
    quantity: 20,
    totalPrice: 100,
    reimbursable: true,
    purpose: 'แก้ปวด ต้านอักเสบ',
    approve: false, consult: false, stat: false, print: false,
    editor: 'พญ.สมหญิง',
  },
  {
    id: 'pvm-12',
    date: '20 เมษายน 2568',
    code: 'J45',
    image: '',
    name: 'Salbutamol Inhaler 100 mcg',
    usage: 'พ่นทางปาก (Inhalation)',
    dosePerTake: '2',
    unit: 'puff',
    frequency: 'ทุก 4-6 ชั่วโมงเมื่อมีอาการ',
    when: 'เมื่อหายใจไม่สะดวก',
    warning: 'ใช้ตามคำสั่งแพทย์ — แจ้งหากใช้บ่อยขึ้น',
    quantity: 1,
    totalPrice: 250,
    reimbursable: true,
    purpose: 'ขยายหลอดลม',
    approve: false, consult: false, stat: false, print: false,
    editor: 'พญ.สมหญิง',
  },
  {
    id: 'pvm-13',
    date: '15 เมษายน 2568',
    code: 'B349',
    image: MED_IMG('cetirizine'),
    name: 'Loratadine 10 mg',
    usage: 'รับประทาน (Oral)',
    dosePerTake: '1',
    unit: 'เม็ด',
    frequency: 'วันละครั้ง',
    when: 'ก่อนนอน',
    warning: 'หลีกเลี่ยงในผู้ป่วยโรคตับรุนแรง',
    quantity: 7,
    totalPrice: 35,
    reimbursable: true,
    purpose: 'แก้แพ้ ลดน้ำมูก',
    approve: false, consult: false, stat: false, print: false,
    editor: 'พญ.สมหญิง',
  },
  {
    id: 'pvm-14',
    date: '8 เมษายน 2568',
    code: 'L209',
    image: '',
    name: 'Hydrocortisone Cream 1%',
    usage: 'ทาภายนอก (Topical)',
    dosePerTake: 'บางๆ',
    unit: 'ครั้ง',
    frequency: 'วันละ 2 ครั้ง',
    when: 'เช้า-เย็น',
    warning: 'หลีกเลี่ยงบริเวณใบหน้า / ผิวบาง — ห้ามใช้นานเกิน 2 สัปดาห์',
    quantity: 1,
    totalPrice: 80,
    reimbursable: false,
    purpose: 'ลดอาการคัน ผื่นแพ้',
    approve: false, consult: false, stat: false, print: false,
    editor: 'พญ.สมหญิง',
  },
  {
    id: 'pvm-15',
    date: '1 เมษายน 2568',
    code: 'A09',
    image: MED_IMG('cetirizine'),
    name: 'Loperamide 2 mg',
    usage: 'รับประทาน (Oral)',
    dosePerTake: '1-2',
    unit: 'เม็ด',
    frequency: 'หลังถ่ายเหลวแต่ละครั้ง',
    when: 'เมื่อมีอาการท้องเสีย',
    warning: 'ไม่เกิน 8 เม็ด/วัน — หยุดยาเมื่ออาการดีขึ้น',
    quantity: 10,
    totalPrice: 30,
    reimbursable: true,
    purpose: 'แก้ท้องเสีย',
    approve: false, consult: false, stat: false, print: false,
    editor: 'พญ.สมหญิง',
  },
  {
    id: 'pvm-16',
    date: '25 มีนาคม 2568',
    code: 'N390',
    image: MED_IMG('amoxicillin'),
    name: 'Ciprofloxacin 500 mg',
    usage: 'รับประทาน (Oral)',
    dosePerTake: '1',
    unit: 'เม็ด',
    frequency: 'ทุก 12 ชั่วโมง',
    when: 'หลังอาหาร 1 ชม.',
    warning: 'หลีกเลี่ยงผลิตภัณฑ์นม/แคลเซียม 2 ชม. ก่อน-หลังกินยา',
    quantity: 14,
    totalPrice: 140,
    reimbursable: true,
    purpose: 'ฆ่าเชื้อแบคทีเรียทางเดินปัสสาวะ',
    approve: false, consult: false, stat: false, print: false,
    editor: 'พญ.สมหญิง',
  },
];

/* ─── Step 6 — นัดหมาย / Appointment (Figma 2633:126009) ───────
   Six dropdowns + two radio toggles + a timeslot grid back this step.
   Options listed below match the Figma demo strings 1:1 — the labels
   appear verbatim in the page so editing here updates both the option
   list and the displayed defaults. */

export const APPT_CLINIC_OPTIONS = [
  { value: 'general',     label: 'คลินิกตรวจโรคทั่วไป (General Clinic)' },
  { value: 'internal',    label: 'คลินิกอายุรกรรม (Internal Medicine)' },
  { value: 'ortho',       label: 'คลินิกกระดูกและข้อ (Orthopedic Clinic)' },
  { value: 'pt',          label: 'แผนกกายภาพบำบัด (Physical Therapy)' },
  { value: 'cardiology',  label: 'คลินิกโรคหัวใจ (Cardiology Clinic)' },
];

export const APPT_TYPE_OPTIONS = [
  { value: 'doctor',     label: 'พบแพทย์' },
  { value: 'noDoctor',   label: 'ไม่พบแพทย์' },
  { value: 'followup',   label: 'ติดตามผล' },
  { value: 'consult',    label: 'ปรึกษา' },
];

export const APPT_DOCTOR_OPTIONS = [
  { value: 'wanchai',    label: 'นพ. วันชัย อยู่เย็น' },
  { value: 'somying',    label: 'พญ. สมหญิง รักษ์ดี' },
  { value: 'somchai',    label: 'นพ. สมชาย ใจดี' },
  { value: 'priyakorn',  label: 'พญ. ปริยากร เจริญสุข' },
];

/* Advance-order picker options — grouped into 5 categories. Each
   option carries a `badge: { style, label }` prefix so the Select
   trigger + dropdown rows render the small category pill BEFORE the
   item label (Figma 4025:14538 "Lab ตรวจเลือด" layout). Category
   colour mapping:
     • Lab (การตรวจทางห้องปฏิบัติการ)  → purple
     • Imaging (การตรวจภาพวินิจฉัย)    → indigo
     • Vital Signs (สัญญาณชีพ)         → teal
     • Procedure (หัตถการ)             → orange
     • Medication (ยา)                 → pink
   `group` / `groupLabel` are kept on the data so a future grouped-
   list rendering can surface category headers without re-deriving
   from the badge style. */
export const APPT_ADVANCE_ORDER_OPTIONS = [
  /* Lab — purple */
  { value: 'lab-cbc',         label: 'ความสมบูรณ์ของเม็ดเลือด (CBC)',     badge: { style: 'purple', label: 'Lab' },         group: 'lab',       groupLabel: 'การตรวจทางห้องปฏิบัติการ (Lab)' },
  { value: 'lab-fbs-hba1c',   label: 'น้ำตาลในเลือด (FBS / HbA1c)',       badge: { style: 'purple', label: 'Lab' },         group: 'lab',       groupLabel: 'การตรวจทางห้องปฏิบัติการ (Lab)' },
  { value: 'lab-lipid',       label: 'ไขมันในเลือด (Lipid profile)',      badge: { style: 'purple', label: 'Lab' },         group: 'lab',       groupLabel: 'การตรวจทางห้องปฏิบัติการ (Lab)' },
  { value: 'lab-renal',       label: 'การทำงานของไต (BUN, Creatinine)',  badge: { style: 'purple', label: 'Lab' },         group: 'lab',       groupLabel: 'การตรวจทางห้องปฏิบัติการ (Lab)' },
  { value: 'lab-lft',         label: 'การทำงานของตับ (LFT)',              badge: { style: 'purple', label: 'Lab' },         group: 'lab',       groupLabel: 'การตรวจทางห้องปฏิบัติการ (Lab)' },
  { value: 'lab-electrolyte', label: 'เกลือแร่ในเลือด (Electrolytes)',    badge: { style: 'purple', label: 'Lab' },         group: 'lab',       groupLabel: 'การตรวจทางห้องปฏิบัติการ (Lab)' },
  { value: 'lab-ua',          label: 'การตรวจปัสสาวะ (UA)',                badge: { style: 'purple', label: 'Lab' },         group: 'lab',       groupLabel: 'การตรวจทางห้องปฏิบัติการ (Lab)' },
  { value: 'lab-thyroid',     label: 'การทำงานของต่อมไทรอยด์ (TSH, FT4)', badge: { style: 'purple', label: 'Lab' },         group: 'lab',       groupLabel: 'การตรวจทางห้องปฏิบัติการ (Lab)' },

  /* Imaging — indigo */
  { value: 'img-cxr',         label: 'เอกซเรย์ทรวงอก',                    badge: { style: 'indigo', label: 'Imaging' },     group: 'imaging',   groupLabel: 'การตรวจภาพวินิจฉัย (Imaging)' },
  { value: 'img-ultrasound',  label: 'อัลตราซาวด์',                       badge: { style: 'indigo', label: 'Imaging' },     group: 'imaging',   groupLabel: 'การตรวจภาพวินิจฉัย (Imaging)' },
  { value: 'img-ct',          label: 'เอกซเรย์คอมพิวเตอร์ (CT Scan)',     badge: { style: 'indigo', label: 'Imaging' },     group: 'imaging',   groupLabel: 'การตรวจภาพวินิจฉัย (Imaging)' },
  { value: 'img-mri',         label: 'คลื่นแม่เหล็กไฟฟ้า (MRI)',          badge: { style: 'indigo', label: 'Imaging' },     group: 'imaging',   groupLabel: 'การตรวจภาพวินิจฉัย (Imaging)' },

  /* Vital signs — teal */
  { value: 'vital-bp',        label: 'ความดันโลหิต',                      badge: { style: 'teal',   label: 'Vital' },       group: 'vital',     groupLabel: 'สัญญาณชีพ (Vital Signs)' },
  { value: 'vital-dtx',       label: 'น้ำตาลปลายนิ้ว',                    badge: { style: 'teal',   label: 'Vital' },       group: 'vital',     groupLabel: 'สัญญาณชีพ (Vital Signs)' },
  { value: 'vital-anthropo',  label: 'น้ำหนัก / ส่วนสูง / BMI',           badge: { style: 'teal',   label: 'Vital' },       group: 'vital',     groupLabel: 'สัญญาณชีพ (Vital Signs)' },

  /* Procedure — orange */
  { value: 'proc-ekg',        label: 'คลื่นไฟฟ้าหัวใจ (EKG / ECG)',       badge: { style: 'orange', label: 'Procedure' },   group: 'procedure', groupLabel: 'หัตถการ (Procedure)' },
  { value: 'proc-spirometry', label: 'ตรวจสมรรถภาพปอด (Spirometry)',     badge: { style: 'orange', label: 'Procedure' },   group: 'procedure', groupLabel: 'หัตถการ (Procedure)' },
  { value: 'proc-eye',        label: 'ตรวจตา',                            badge: { style: 'orange', label: 'Procedure' },   group: 'procedure', groupLabel: 'หัตถการ (Procedure)' },
  { value: 'proc-foot',       label: 'ตรวจเท้า (สำหรับผู้ป่วยเบาหวาน)', badge: { style: 'orange', label: 'Procedure' },   group: 'procedure', groupLabel: 'หัตถการ (Procedure)' },

  /* Medication — pink */
  { value: 'med-continue',    label: 'สั่งยาต่อเนื่อง',                  badge: { style: 'pink',   label: 'Medication' },  group: 'medication', groupLabel: 'ยา (Medication)' },
  { value: 'med-adjust',      label: 'ปรับขนาดยา',                        badge: { style: 'pink',   label: 'Medication' },  group: 'medication', groupLabel: 'ยา (Medication)' },
];

/* Step 6 Voice + SuggestibleTextarea — Thai strings filtered by typed
   substring (useTextareaSuggestions). Keep entries long enough to match
   realistic clinic phrases after ≥2 characters. */
export const APPT_REASON_SUGGESTIONS = [
  'มาติดตามผลการรักษาและตรวจซ้ำตามนัด',
  'ปวดหลังร้าวลงขาด้านซ้าย ประมาณ 2 สัปดาห์',
  'เจาะเลือดตรวจระดับน้ำตาลและไขมันในเลือดตามแพทย์นัด',
  'ติดตามความดันโลหิตหลังปรับยาเมื่อ 2 สัปดาห์ที่แล้ว',
  'ตรวจคลื่นไฟฟ้าหัวใจตามที่สั่งไว้หลังมีอาการเจ็บหน้าอก',
  'มาตรวจ X-ray ตามใบสั่งหลังการรักษาในโรงพยาบาล',
  'อาการเวียนศีรษะเป็นๆ มา 1 สัปดาห์ ต้องการประเมินเพิ่มเติม',
  'มารับยาและรับคำแนะนำการใช้ยาตามนัดแพทย์',
];

export const APPT_PREPARATION_SUGGESTIONS = [
  'งดอาหารและเครื่องดื่มยกเว้นน้ำเปล่าเล็กน้อยอย่างน้อย 8 ชั่วโมงก่อนเจาะเลือด',
  'ดื่มน้ำสะอาดให้มากก่อนมาตรวจปัสสาวะตามนัด',
  'นำผลตรวจเก่า รายงาน X-ray และบัญชียามาด้วยทุกครั้ง',
  'งดยาละลายลิ่มเลือดตามคำแนะนำแพทย์ก่อนมาพบหากมีการสั่ง',
  'สวมใส่เสื้อผ้าหลวมสบายเพื่อความสะดวกในการตรวจร่างกาย',
  'พกบัตรประชาชน สิทธิการรักษา และใบนัดหมายทุกครั้ง',
  'มาถึงก่อนเวลานัดอย่างน้อย 15 นาทีเพื่อลงทะเบียน',
];

/* Suggestion roster for the Step-6 "เงื่อนไขก่อนทำ" VoiceTextarea
   (Figma 4053:7799). Surfaces as a typeahead popover the moment the
   doctor types one character (minChars=1 on the SuggestibleTextarea)
   so stock prep conditions are one tap away. */
export const APPT_PREPROCEDURE_SUGGESTIONS = [
  'งดอาหารและน้ำอย่างน้อย 6–8 ชั่วโมงก่อนหัตถการหรือการสลบ',
  'งดน้ำเปล่าเฉพาะกรณีที่มีการสั่งจากแพทย์ก่อนทำหัตถการ',
  'ห้ามดื่มแอลกอฮอล์อย่างน้อย 24 ชั่วโมงก่อนตรวจหรือทำหัตถการ',
  'งดยาละลายลิ่มเลือด (Warfarin / Aspirin) ตามที่แพทย์กำหนดก่อนทำหัตถการ',
  'งดยาเบาหวาน (Metformin / Insulin) เช้าวันตรวจ ตามที่แพทย์กำหนด',
  'งดน้ำยกเว้นยาน้ำเล็กน้อยสำหรับกินยาประจำตัวตามที่แพทย์อนุญาต',
  'งดสูบบุหรี่อย่างน้อย 24 ชั่วโมงก่อนตรวจปอด / Spirometry',
  'ดื่มน้ำให้เต็มกระเพาะปัสสาวะก่อนตรวจอัลตราซาวด์ช่องท้องส่วนล่าง',
  'ถอดเครื่องประดับโลหะและของมีแม่เหล็กก่อนตรวจ MRI',
  'แจ้งประวัติแพ้ยา / แพ้อาหาร และโรคประจำตัวก่อนเข้ารับการรักษา',
  'แจ้งหากตั้งครรภ์หรือสงสัยว่าตั้งครรภ์ก่อนตรวจที่ใช้รังสี',
  'มีผู้ดูแลเดินทางมาด้วยในวันทำหัตถการตามที่โรงพยาบาลกำหนด',
];

export const APPT_CONDITION_OPTIONS = [
  { value: 'before',     label: 'ก่อนพบแพทย์' },
  { value: 'after',      label: 'หลังพบแพทย์' },
  { value: 'concurrent', label: 'พร้อมการรักษา' },
];

/* Default Step 6 appointment record — Figma 2633:126009 sample data so
   the page renders fully populated. `slot` carries the value of the
   selected timeslot, `slotsTaken` marks the disabled (เต็ม) cells. */
/* Per Figma 4046:18305 — when the doctor flips the mode radio to
   "นัดหมาย" every field comes up in its default (empty) state EXCEPT
   `doctor`, which pre-fills with the visit's on-duty physician.
   TreatmentFormPage's `buildInitialForm` is responsible for setting
   that `doctor` from `orderingDoctor`; the constant below stays empty
   so any caller that spreads DEFAULT_APPOINTMENT gets the same
   blank-slate UX. */
export const DEFAULT_APPOINTMENT = {
  /* `mode` is intentionally unset on first paint — Figma 4046:19444
     shows Step 6 entering with NEITHER radio selected. */
  mode: undefined,                   // undefined | 'skip' | 'schedule'
  clinic: undefined,
  type: undefined,
  doctor: undefined,                 // pre-filled by buildInitialForm
  reason: '',
  preparation: '',
  advance: undefined,                // undefined | 'none' | 'has' — Figma 4046:18305 default leaves both radios unselected
  location: undefined,               // undefined | 'onsite' | 'telemedicine'
  date: '',
};

/* Static slot list driving the Step 6 timeslot grid (Figma 2624:104788).
   3 rows × 5 cols = 15 slots. `taken: true` renders the "(เต็ม)"
   disabled state. */
export const APPT_TIMESLOTS = [
  { value: '08:00-08:30', taken: true  },
  { value: '08:30-09:00', taken: false },
  { value: '09:00-09:30', taken: false },
  { value: '09:30-10:00', taken: false },
  { value: '10:00-10:30', taken: true  },
  { value: '10:30-11:00', taken: true  },
  { value: '11:00-11:30', taken: false },
  { value: '11:30-12:00', taken: false },
  { value: '13:00-13:30', taken: false },
  { value: '13:30-14:00', taken: false },
  { value: '14:00-14:30', taken: true  },
  { value: '14:30-15:00', taken: false },
  { value: '15:00-15:30', taken: false },
  { value: '15:30-16:00', taken: false },
];

/* ─── Step 7 — ใบรับรองแพทย์ / Medical Certificate (Figma 2767:120407) ──
   Four-icon certificate-type picker, rest-day pill row, and signer info.
   Tones map to existing surface- / text- tokens, but each option also
   carries a fallback hex (Figma swatches) so the chip retints correctly
   even before the semantic vars resolve. */
/* Issuance toggle — Figma 228:27018 (226:29085): "ไม่รับ" left,
   "รับ" right; Radio Button cards without the inner radio dot. */
export const CERT_ISSUE_OPTIONS = [
  { value: 'no',  label: 'ไม่รับ' },
  { value: 'yes', label: 'รับ'    },
];

export const CERT_TYPE_CARDS = [
  {
    value: 'general',
    titleTh: 'ใบรับรองทั่วไป',
    titleEn: 'General Certificate',
    icon: 'stethoscope',
    tone: { bg: 'var(--surface-brandPrimary-quaternary, #E2F3EB)', fg: 'var(--text-brandPrimary-default, #007549)' },
  },
  {
    value: 'sick',
    titleTh: 'ใบลาป่วย',
    titleEn: 'Sick Leave',
    icon: 'sick',
    tone: { bg: 'var(--surface-progress-quaternary, #FBFAF4)', fg: 'var(--text-progress-default, #F0C03D)' },
  },
  {
    value: 'medico',
    titleTh: 'ใบรับรองคดี',
    titleEn: 'Medico-Legal',
    icon: 'balance',
    tone: { bg: '#F4F9FD', fg: 'var(--text-info-default, #2580EA)' },
  },
  {
    value: 'travel',
    titleTh: 'ใบรับรองเดินทาง',
    titleEn: 'Travel Certificate',
    icon: 'flights_and_hotels',
    tone: { bg: '#F0F2FF', fg: '#6F82FF' },
  },
];

/* Rest-day quick-pick pills under "คำแนะนำการพักรักษา" (Figma 3263:174968).
   `custom: true` keeps the pill always shown without auto-computing
   start/end dates — clinicians type dates manually for that option. */
export const CERT_REST_DAY_PILLS = [
  { value: '1',      label: '1 วัน',     days: 1  },
  { value: '2',      label: '2 วัน',     days: 2  },
  { value: '3',      label: '3 วัน',     days: 3  },
  { value: '5',      label: '5 วัน',     days: 5  },
  { value: '7',      label: '7 วัน',     days: 7  },
  { value: 'custom', label: 'กำหนดเอง',  custom: true },
];

const CERT_REST_THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

const startOfLocalDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

const addLocalDays = (d, n) => {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
};

/** Thai Buddhist display string for certificate date inputs (Step 7). */
export const formatCertRestDate = (d) =>
  `${d.getDate()} ${CERT_REST_THAI_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`;

/** Inverse of `formatCertRestDate` for DatePicker `value` binding. */
export const parseCertRestDate = (raw) => {
  if (!raw) return null;
  if (raw instanceof Date) {
    return Number.isNaN(raw.getTime()) ? null : startOfLocalDay(raw);
  }
  const s = String(raw).trim();
  if (!s) return null;
  const m = s.match(/^(\d{1,2})\s+(\S+)\s+(\d{4})$/);
  if (!m) return null;
  const day = parseInt(m[1], 10);
  const monthIdx = CERT_REST_THAI_MONTHS.indexOf(m[2]);
  const buddhistYear = parseInt(m[3], 10);
  if (monthIdx < 0 || !Number.isFinite(day) || !Number.isFinite(buddhistYear)) return null;
  const gregorian = buddhistYear - 543;
  const d = startOfLocalDay(new Date(gregorian, monthIdx, day));
  if (d.getDate() !== day || d.getMonth() !== monthIdx || d.getFullYear() !== gregorian) {
    return null;
  }
  return d;
};

const CERT_SIGNED_THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

/** Timestamp line under the certificate signature pad (Step 7). */
export const formatCertSignedAt = (d = new Date()) => {
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${d.getDate()} ${CERT_SIGNED_THAI_MONTHS[d.getMonth()]} ${d.getFullYear() + 543} ${hh}.${mm} น.`;
};

/** Inclusive rest span from today: 1 วัน → today only; N วัน → today … today+N−1. */
export const computeCertRestDateRange = (dayCount) => {
  const n = Math.max(1, Number(dayCount) || 1);
  const start = startOfLocalDay(new Date());
  const end = addLocalDays(start, n - 1);
  return {
    startDate: formatCertRestDate(start),
    endDate: formatCertRestDate(end),
  };
};

export const CERT_DOCTOR_OPTIONS = [
  {
    value: 'somying',
    label: 'พญ.สมหญิง รักษ์ดี',
    avatarUrl: '/images/doctor-a.png',
    licenseValue: 'TH-00012345',
  },
  {
    value: 'somchai',
    label: 'นพ.สมชาย ใจดี',
    avatarUrl: '/images/doctor-a.png',
    licenseValue: 'TH-00034521',
  },
  {
    value: 'wipa',
    label: 'พญ.วิภา สุขศรี',
    avatarUrl: '/images/doctor-a.png',
    licenseValue: 'TH-00045678',
  },
  {
    value: 'priyakorn',
    label: 'พญ.ปริยากร เจริญสุข',
    avatarUrl: '/images/doctor-a.png',
    licenseValue: 'TH-00012345',
  },
];

export const CERT_LICENSE_OPTIONS = [
  { value: 'TH-00012345', label: 'ท.00012345' },
  { value: 'TH-00034521', label: 'ท.00034521' },
  { value: 'TH-00045678', label: 'ท.00045678' },
];

/* Doctor-order suggestions surfaced under คำสั่งแพทย์ — Thai-prefixed
   medication lines and follow-up instructions clinicians type often. */
export const DOCTOR_ORDER_SUGGESTIONS = [
  '1. Paracetamol 500 mg 1 tab oral q 6 hr prn pain',
  'Paracetamol 500 mg 1 tab oral q 6 hr prn pain',
  '2. Ibuprofen 400 mg 1 tab oral tid pc (NSAIDs)',
  'Ibuprofen 400 mg 1 tab oral tid pc',
  '3. Muscle relaxant: Methocarbamol 750 mg',
  'Amoxicillin 500 mg 1 cap oral tid x 7 days',
  '4. Hot compress บริเวณหลังส่วนล่าง วันละ 2 ครั้ง',
  'Hot compress บริเวณหลังส่วนล่าง วันละ 2 ครั้ง',
  '5. งดยกของหนัก งดก้มตัวกะทันหัน',
  'งดยกของหนัก งดก้มตัวกะทันหัน',
  '6. Physical therapy นัด 3 ครั้ง/สัปดาห์',
  'Physical therapy นัด 3 ครั้ง/สัปดาห์',
  '7. นัดติดตามอาการ 1 สัปดาห์',
  'นัดติดตามอาการ 1 สัปดาห์',
  '8. ถ้าอาการไม่ดีขึ้น ส่ง X-ray Lumbar spine AP/Lateral',
  'ส่ง X-ray Lumbar spine AP/Lateral',
  'CBC + BUN/Cr + electrolyte panel',
];

/** Body markers are stored per exam system (HEENT / Heart / Lungs / …)
    so that switching tabs doesn't bleed marks across systems. Shape:
    `{ [systemKey]: Marker[] }`. Step3Examination reads the current
    system's slice and writes back only to that slot. */
export const DEFAULT_BODY_MARKERS = {};

/** Drawings (pen · text · circle · square · arrow) — also keyed per
    exam system so the user's pen / text annotations stay scoped to
    the tab where they were drawn. Same shape + ownership rules as
    DEFAULT_BODY_MARKERS. */
export const DEFAULT_BODY_DRAWINGS = {};

/** Sample marker for component-library / docs previews only. */
export const DEMO_BODY_MARKERS = [
  {
    id: 'marker-demo-1',
    side: 'back',
    leftPercent: 82,
    topPercent: 40,
    note: 'ปวดหลังช่วงล่าง',
    saved: true,
    stackOrder: 1,
  },
];

export const DEFAULT_SCREENING_SUMMARY = {
  measurement: 'ครั้งล่าสุด',
  measurementRounds: DEFAULT_MEASUREMENT_ROUNDS,
  vitals: DEFAULT_VITAL_BLOCK,
  cc: 'ปวดหลังช่วงล่างมาก ในเวลาที่ก้ม',
  duration: '1 สัปดาห์',
  triage: { level: 4, label: 'Semi-urgent', subLabel: 'ไม่เร่งด่วน', tone: 'teal' },
  mobility: { icon: 'accessible', label: 'นั่งรถเข็น' },
  pain: { icon: 'sentiment_dissatisfied', label: 'มาก' },
  orders: ['Paracetamol (พารา) 500 mg ตามอาการ'],
  assessor: {
    name: 'กานต์พิชชา บุญส่งเสริม',
    role: 'ผู้ประเมิน (Assessor)',
    avatarUrl: '/avatars/mock-male-asian-a.png',
  },
  allergies: DEFAULT_VISIT_DETAIL.allergies,
  chronicDiseases: DEFAULT_VISIT_DETAIL.chronicDiseases,
};

/* Step-completion gating — drives StepProgress check mark for the 7
   Treatment steps so a step only shows ✓ once its required fields are
   filled. Steps 1, 2, 3, 5 don't expose required `<Field>` markers in
   TreatmentSteps.jsx (history/screening are read-only; physical exam +
   orders accept empty content), so they're considered complete once the
   doctor advances past them — the parent passes `stepIndex` so we can
   model that gating here. */

const trnonEmpty = (v) => String(v ?? '').trim() !== '';

const isTreatmentStep4Complete = (form) =>
  Boolean(form)
  && trnonEmpty(form.diagnosisNote)
  && trnonEmpty(form.doctorOrderNote)
  && trnonEmpty(form.orderingDoctor);

const isTreatmentStep6Complete = (form) => {
  const a = form?.appointment;
  if (!a?.mode) return false;
  if (a.mode === 'skip') return true;
  /* mode === 'schedule' — Figma 4046:18305 required fields. */
  return ['clinic', 'type', 'doctor', 'reason', 'preparation']
    .every((k) => trnonEmpty(a[k]));
};

const isTreatmentStep7Complete = (form) => {
  if (!form) return false;
  if (form.certIssue === 'no') return true;
  if (form.certIssue === 'yes') return trnonEmpty(form.certSignature);
  return false;
};

export const getTreatmentCompletedSteps = (form, stepIndex = 0) => [
  stepIndex > 0,                          /* Step 1 — read-only ประวัติ      */
  stepIndex > 1,                          /* Step 2 — read-only screening    */
  stepIndex > 2,                          /* Step 3 — exam (no required)     */
  isTreatmentStep4Complete(form),         /* Step 4 — diagnosis              */
  stepIndex > 4,                          /* Step 5 — orders are optional    */
  isTreatmentStep6Complete(form),         /* Step 6 — appointment            */
  isTreatmentStep7Complete(form),         /* Step 7 — certificate            */
];
