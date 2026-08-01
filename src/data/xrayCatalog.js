/* ทะเบียนรายการตรวจรังสี (X-ray exam catalog) — the registry the RIS Setup
   page edits and every other X-ray screen reads from (worklist columns,
   order-entry checkboxes, result entry).

   Grounded in three sources, not invented:

     • TOR ภาคผนวก ก §1.12 (docs/tor-checklist.html, "1.12 RIS") — the
       contract items each export exists to satisfy, cited inline.
     • คู่มืออบรมระบบงานรังสีวินิจฉัย สำนักอนามัย (legacy RIS manual) — §2.1
       บันทึกขอตรวจรังสี (รายการตรวจ / ชุด / รายการฟิล์ม / ผู้ถ่าย-ผู้ล้าง /
       รวมเงินทั้งหมด) and §2.5 ทะเบียนรายการตรวจรังสี (ประเภทงาน + รหัส +
       รายละเอียดฟิล์ม + ราคาค่าตรวจ).
     • คู่มือ MyHOSPITAL งานรังสีวิทยา (X-Ray) ของ MIH — "กำหนดรายการ X-ray"
       is the Setup screen this catalog backs.

   Same tier as labCatalog.js — mock data, no backend. */

/* ประเภทงานรังสี (modality) — the legacy manual's "ประเภทงานรังสี" Look-up on
   ลำดับการตรวจผู้ป่วย (§2.2 item 1) and the first grouping level of the
   catalog. A ศบส. (health centre) realistically operates plain X-ray,
   ultrasound, dental X-ray and a mobile mammography unit; the heavy
   modalities (fluoroscopy, CT, MRI, bone densitometry) exist in the
   catalog so the doctor can ORDER them, but carry `referralOnly: true`
   → the order prints a referral to a BMA hospital instead of joining the
   in-house queue.

   `icon` is the Material Symbols name (CLAUDE.md icon rule — Figma's base
   family), rendered via <Icon>/<Sym>. */
export const XRAY_MODALITIES = [
  { key: 'xr',  thai: 'เอกซเรย์ทั่วไป',          code: 'XR',  icon: 'radiology' },
  { key: 'fl',  thai: 'ฟลูออโรสโคปี',            code: 'FL',  icon: 'motion_photos_on', referralOnly: true },
  { key: 'us',  thai: 'อัลตราซาวด์',             code: 'US',  icon: 'ultrasound' },
  { key: 'mg',  thai: 'แมมโมแกรม',              code: 'MG',  icon: 'gynecology' },
  { key: 'ct',  thai: 'ซีทีสแกน',               code: 'CT',  icon: 'view_in_ar', referralOnly: true },
  { key: 'mri', thai: 'เอ็มอาร์ไอ (MRI)',        code: 'MRI', icon: 'sensors',   referralOnly: true },
  { key: 'bd',  thai: 'ตรวจความหนาแน่นกระดูก',   code: 'BD',  icon: 'skeleton',  referralOnly: true },
  { key: 'dn',  thai: 'เอกซเรย์ทันตกรรม',        code: 'DN',  icon: 'dentistry' },
];

/* ตำแหน่งที่ตรวจ — TOR §1.12.5.4 requires the order table to show
   "ตำแหน่งที่ตรวจ" as its own column, so the region is a first-class key on
   every exam rather than a substring of its name. */
export const XRAY_BODY_REGIONS = [
  { key: 'chest',     thai: 'ทรวงอก' },
  { key: 'abdomen',   thai: 'ช่องท้อง / KUB' },
  { key: 'skull',     thai: 'กะโหลกศีรษะ / ใบหน้า' },
  { key: 'cspine',    thai: 'กระดูกสันหลังส่วนคอ (C-spine)' },
  { key: 'tspine',    thai: 'กระดูกสันหลังส่วนอก (T-spine)' },
  { key: 'lsspine',   thai: 'กระดูกสันหลังส่วนเอว (LS-spine)' },
  { key: 'pelvis',    thai: 'เชิงกราน / ข้อสะโพก' },
  { key: 'upperext',  thai: 'แขนและมือ (Upper extremity)' },
  { key: 'lowerext',  thai: 'ขาและเท้า (Lower extremity)' },
  { key: 'neck',      thai: 'ลำคอ / ต่อมไทรอยด์' },
  { key: 'dental',    thai: 'ฟันและขากรรไกร' },
  { key: 'breast',    thai: 'เต้านม' },
  { key: 'obstetric', thai: 'ครรภ์ (Obstetric)' },
];

/* ท่าถ่าย (projection / view) — the radiographer's positioning vocabulary.
   Kept as its own lookup so order entry can render "CXR PA" and result
   entry can label each film; the legacy ใบฉายรังสี (§2.1 item 11) prints
   these per exposure. CC/MLO are the two standard mammographic views;
   PANO is the dental panoramic sweep (OPG). */
export const XRAY_VIEWS = [
  { key: 'pa',        thai: 'ด้านหลัง-หน้า (PA)',          code: 'PA' },
  { key: 'ap',        thai: 'ด้านหน้า-หลัง (AP)',          code: 'AP' },
  { key: 'lat',       thai: 'ด้านข้าง (Lateral)',          code: 'LAT' },
  { key: 'obl',       thai: 'เฉียง (Oblique)',             code: 'OBL' },
  { key: 'apSupine',  thai: 'AP ท่านอนหงาย (Supine)',      code: 'AP-SUP' },
  { key: 'apUpright', thai: 'AP ท่ายืน (Upright)',         code: 'AP-UPR' },
  { key: 'decub',     thai: 'ท่านอนตะแคง (Decubitus)',     code: 'DECUB' },
  { key: 'skyline',   thai: 'Skyline (ลูกสะบ้า)',          code: 'SKY' },
  { key: 'waters',    thai: 'Waters (โพรงไซนัส)',          code: 'WATERS' },
  { key: 'cc',        thai: 'บน-ล่าง (Craniocaudal)',      code: 'CC' },
  { key: 'mlo',       thai: 'เฉียงกลางลำตัว (MLO)',        code: 'MLO' },
  { key: 'pano',      thai: 'พาโนรามิก (Panoramic)',       code: 'PANO' },
];

/* สิทธิการรักษา — TOR §1.12.4.2 "บันทึกราคาและการเบิกแยกตามสิทธิการรักษา":
   the price is one number but what each fund reimburses differs per right,
   so `claimByRight` on every exam is keyed by these. The five rights are
   the ones the registration module actually issues (see
   PATIENT_PROFILES[].insurance). */
export const XRAY_RIGHTS = [
  { key: 'UCS',  thai: 'สิทธิหลักประกันสุขภาพถ้วนหน้า (บัตรทอง)', short: 'บัตรทอง' },
  { key: 'SSS',  thai: 'สิทธิประกันสังคม',                        short: 'ประกันสังคม' },
  { key: 'OFC',  thai: 'สิทธิข้าราชการ กรมบัญชีกลาง',             short: 'ข้าราชการ' },
  { key: 'BMA',  thai: 'สิทธิข้าราชการกรุงเทพมหานคร',             short: 'ข้าราชการ กทม.' },
  { key: 'CASH', thai: 'ชำระเงินเอง',                            short: 'ชำระเอง' },
];

export const XRAY_RIGHT_BY_KEY = Object.fromEntries(XRAY_RIGHTS.map((r) => [r.key, r]));

/* ขนาดฟิล์ม — legacy §2.1 item 8 บันทึก "รายการฟิล์ม" per request and §2.5
   item 2 "รายละเอียดฟิล์ม" per catalog entry. Inches are the trade sizes
   the ศบส. stocks; `digital` covers the US/CT/MRI case where no film is
   consumed (ภาพเก็บเข้าระบบ Scan ภาพเอกซเรย์ — legacy §2.4). */
export const XRAY_FILM_SIZES = [
  { key: '8x10',    thai: 'ฟิล์ม 8×10 นิ้ว' },
  { key: '10x12',   thai: 'ฟิล์ม 10×12 นิ้ว' },
  { key: '11x14',   thai: 'ฟิล์ม 11×14 นิ้ว' },
  { key: '14x17',   thai: 'ฟิล์ม 14×17 นิ้ว' },
  { key: 'dental',  thai: 'ฟิล์มทันตกรรม (3×4 ซม.)' },
  { key: 'digital', thai: 'ภาพดิจิทัล (ไม่ใช้ฟิล์ม)' },
];

/* ─────────────────────────────────────────────────────────────────────────
   THE CATALOG — TOR §1.12.4.1 "บันทึกข้อมูลรายการตรวจทางรังสีวิทยาตามที่
   ผู้ใช้งานกำหนดได้" (the Setup page edits this via the store below).

   Field notes:
     price / claimByRight   §1.12.4.2 — ราคา + ยอดเบิกได้แยกตามสิทธิ. CASH is
                            always 0 (ผู้ป่วยจ่ายเต็ม); some exams reimburse
                            only partially under UCS/SSS, which is exactly
                            the demo the สปสช. reviewers ask about.
     prep                   การเตรียมตัวก่อนตรวจ — printed on ใบนัดตรวจรังสี
                            (legacy §2.1 item 11) so the patient arrives ready.
     contrast               exam injects/ingests contrast media → order entry
                            must surface the ประวัติการแพ้ block (§1.12.5.3).
     femaleScreening        §1.12.5.3 — ประวัติประจำเดือน/การตั้งครรภ์ must be
                            asked before irradiating the abdomen/pelvis of a
                            female patient (and before mammography).
     durationMin            room-scheduling estimate for the นัดตรวจ flow
                            (§1.12.3).
     filmSizes              legacy §2.5 item 2 — ขนาดฟิล์มที่ใช้ per exam.
     defaultTemplateId      §1.12.6.7 — the report template result entry
                            preloads (ids live in xrayResultTemplates.js;
                            referenced as strings to avoid a module cycle).
     referralOnly           modality not available in-house — see
                            XRAY_MODALITIES above.
     retired                soft delete: a code already used on past orders
                            must keep resolving, so Setup toggles `retired`
                            and the order picker filters it out. */
export const XRAY_EXAMS = [
  /* ── เอกซเรย์ทั่วไป: ทรวงอก ─────────────────────────────────────────── */
  {
    id: 'xr-cxr-pa', code: 'X000001',
    name: 'เอกซเรย์ทรวงอก (CXR) PA', nameEn: 'Chest PA upright',
    modality: 'xr', region: 'chest', views: ['pa'],
    price: 250, claimByRight: { UCS: 250, SSS: 250, OFC: 250, BMA: 250, CASH: 0 },
    prep: 'ถอดสร้อยคอ เสื้อชั้นในที่มีโครงโลหะ และเปลี่ยนชุดตรวจ',
    contrast: false, femaleScreening: false, durationMin: 10,
    filmSizes: ['14x17'], defaultTemplateId: 'tpl-chest-normal', retired: false,
  },
  {
    id: 'xr-cxr-palat', code: 'X000002',
    name: 'เอกซเรย์ทรวงอก PA + Lateral', nameEn: 'Chest PA and lateral',
    modality: 'xr', region: 'chest', views: ['pa', 'lat'],
    price: 350, claimByRight: { UCS: 350, SSS: 350, OFC: 350, BMA: 350, CASH: 0 },
    prep: 'ถอดสร้อยคอ เสื้อชั้นในที่มีโครงโลหะ และเปลี่ยนชุดตรวจ',
    contrast: false, femaleScreening: false, durationMin: 15,
    filmSizes: ['14x17', '14x17'], defaultTemplateId: 'tpl-chest-normal', retired: false,
  },
  {
    id: 'xr-cxr-ap', code: 'X000003',
    name: 'เอกซเรย์ทรวงอก AP (เตียงนอน/Portable)', nameEn: 'Chest AP supine (portable)',
    modality: 'xr', region: 'chest', views: ['ap'],
    price: 250, claimByRight: { UCS: 250, SSS: 250, OFC: 250, BMA: 250, CASH: 0 },
    prep: 'ไม่ต้องเตรียมตัว (ถ่ายที่เตียงสำหรับผู้ป่วยลุกไม่ได้)',
    contrast: false, femaleScreening: false, durationMin: 15,
    filmSizes: ['14x17'], defaultTemplateId: 'tpl-chest-normal', retired: false,
  },

  /* ── เอกซเรย์ทั่วไป: ช่องท้อง ───────────────────────────────────────── */
  {
    id: 'xr-acute-abd', code: 'X000010',
    name: 'เอกซเรย์ช่องท้องเฉียบพลัน (Acute abdomen series)', nameEn: 'Acute abdomen series',
    modality: 'xr', region: 'abdomen', views: ['apSupine', 'apUpright'],
    price: 400, claimByRight: { UCS: 400, SSS: 400, OFC: 400, BMA: 400, CASH: 0 },
    prep: 'ไม่ต้องงดอาหาร — ตรวจได้ทันทีในภาวะฉุกเฉิน',
    contrast: false, femaleScreening: true, durationMin: 15,
    filmSizes: ['14x17', '14x17'], defaultTemplateId: 'tpl-kub-normal', retired: false,
  },
  {
    id: 'xr-kub', code: 'X000011',
    name: 'เอกซเรย์ช่องท้อง (Plain KUB)', nameEn: 'Plain KUB',
    modality: 'xr', region: 'abdomen', views: ['apSupine'],
    price: 250, claimByRight: { UCS: 250, SSS: 250, OFC: 250, BMA: 250, CASH: 0 },
    prep: 'งดอาหารที่ทำให้เกิดแก๊ส 1 มื้อก่อนตรวจ ถ้านัดล่วงหน้า',
    contrast: false, femaleScreening: true, durationMin: 10,
    filmSizes: ['14x17'], defaultTemplateId: 'tpl-kub-normal', retired: false,
  },

  /* ── เอกซเรย์ทั่วไป: กะโหลกศีรษะ / ใบหน้า ───────────────────────────── */
  {
    id: 'xr-skull', code: 'X000020',
    name: 'เอกซเรย์กะโหลกศีรษะ AP/Lateral', nameEn: 'Skull AP and lateral',
    modality: 'xr', region: 'skull', views: ['ap', 'lat'],
    price: 300, claimByRight: { UCS: 300, SSS: 300, OFC: 300, BMA: 300, CASH: 0 },
    prep: 'ถอดต่างหู กิ๊บติดผม แว่นตา และฟันปลอมชนิดถอดได้',
    contrast: false, femaleScreening: false, durationMin: 15,
    filmSizes: ['10x12', '10x12'], defaultTemplateId: null, retired: false,
  },
  {
    id: 'xr-pns', code: 'X000021',
    name: 'เอกซเรย์โพรงไซนัส (Waters view)', nameEn: 'Paranasal sinuses (Waters)',
    modality: 'xr', region: 'skull', views: ['waters'],
    price: 300, claimByRight: { UCS: 300, SSS: 300, OFC: 300, BMA: 300, CASH: 0 },
    prep: 'ถอดแว่นตาและเครื่องประดับบนใบหน้า',
    contrast: false, femaleScreening: false, durationMin: 10,
    filmSizes: ['10x12'], defaultTemplateId: null, retired: false,
  },

  /* ── เอกซเรย์ทั่วไป: กระดูกสันหลัง ──────────────────────────────────── */
  {
    id: 'xr-cspine', code: 'X000030',
    name: 'เอกซเรย์กระดูกสันหลังส่วนคอ AP/Lateral', nameEn: 'C-spine AP and lateral',
    modality: 'xr', region: 'cspine', views: ['ap', 'lat'],
    price: 350, claimByRight: { UCS: 350, SSS: 350, OFC: 350, BMA: 350, CASH: 0 },
    prep: 'ถอดสร้อยคอ ต่างหู และเครื่องประดับบริเวณลำคอ',
    contrast: false, femaleScreening: false, durationMin: 15,
    filmSizes: ['10x12', '10x12'], defaultTemplateId: null, retired: false,
  },
  {
    id: 'xr-tspine', code: 'X000031',
    name: 'เอกซเรย์กระดูกสันหลังส่วนอก AP/Lateral', nameEn: 'T-spine AP and lateral',
    modality: 'xr', region: 'tspine', views: ['ap', 'lat'],
    price: 350, claimByRight: { UCS: 350, SSS: 350, OFC: 350, BMA: 350, CASH: 0 },
    prep: 'เปลี่ยนชุดตรวจ ถอดเสื้อชั้นในที่มีโครงโลหะ',
    contrast: false, femaleScreening: false, durationMin: 15,
    filmSizes: ['14x17', '14x17'], defaultTemplateId: null, retired: false,
  },
  {
    id: 'xr-lsspine', code: 'X000032',
    name: 'เอกซเรย์กระดูกสันหลังส่วนเอว AP/Lateral', nameEn: 'LS-spine AP and lateral',
    modality: 'xr', region: 'lsspine', views: ['ap', 'lat'],
    price: 400, claimByRight: { UCS: 400, SSS: 400, OFC: 400, BMA: 400, CASH: 0 },
    prep: 'เปลี่ยนชุดตรวจ ถอดเข็มขัดและวัตถุโลหะบริเวณเอว',
    contrast: false, femaleScreening: true, durationMin: 15,
    filmSizes: ['14x17', '14x17'], defaultTemplateId: 'tpl-ls-spondylosis', retired: false,
  },
  {
    id: 'xr-lsspine-obl', code: 'X000033',
    name: 'เอกซเรย์กระดูกสันหลังส่วนเอว Oblique (ซ้าย-ขวา)', nameEn: 'LS-spine oblique both sides',
    modality: 'xr', region: 'lsspine', views: ['obl'],
    price: 400, claimByRight: { UCS: 400, SSS: 400, OFC: 400, BMA: 400, CASH: 0 },
    prep: 'เปลี่ยนชุดตรวจ ถอดเข็มขัดและวัตถุโลหะบริเวณเอว',
    contrast: false, femaleScreening: true, durationMin: 15,
    filmSizes: ['14x17', '14x17'], defaultTemplateId: null, retired: false,
  },

  /* ── เอกซเรย์ทั่วไป: เชิงกราน / สะโพก ───────────────────────────────── */
  {
    id: 'xr-pelvis', code: 'X000040',
    name: 'เอกซเรย์เชิงกราน AP', nameEn: 'Pelvis AP',
    modality: 'xr', region: 'pelvis', views: ['ap'],
    price: 300, claimByRight: { UCS: 300, SSS: 300, OFC: 300, BMA: 300, CASH: 0 },
    prep: 'ถอดเข็มขัด กระดุมโลหะ และของในกระเป๋ากางเกง',
    contrast: false, femaleScreening: true, durationMin: 10,
    filmSizes: ['14x17'], defaultTemplateId: null, retired: false,
  },
  {
    id: 'xr-hip', code: 'X000041',
    name: 'เอกซเรย์ข้อสะโพก AP/Lateral', nameEn: 'Hip AP and lateral',
    modality: 'xr', region: 'pelvis', views: ['ap', 'lat'],
    price: 350, claimByRight: { UCS: 350, SSS: 350, OFC: 350, BMA: 350, CASH: 0 },
    prep: 'ถอดเข็มขัดและวัตถุโลหะบริเวณสะโพก',
    contrast: false, femaleScreening: true, durationMin: 15,
    filmSizes: ['14x17', '10x12'], defaultTemplateId: 'tpl-fracture', retired: false,
  },

  /* ── เอกซเรย์ทั่วไป: แขนและมือ ──────────────────────────────────────── */
  {
    id: 'xr-shoulder', code: 'X000050',
    name: 'เอกซเรย์ข้อไหล่ AP', nameEn: 'Shoulder AP',
    modality: 'xr', region: 'upperext', views: ['ap'],
    price: 250, claimByRight: { UCS: 250, SSS: 250, OFC: 250, BMA: 250, CASH: 0 },
    prep: 'เปลี่ยนชุดตรวจ ถอดสร้อยคอและเสื้อที่มีโลหะ',
    contrast: false, femaleScreening: false, durationMin: 10,
    filmSizes: ['10x12'], defaultTemplateId: 'tpl-fracture', retired: false,
  },
  {
    id: 'xr-elbow', code: 'X000051',
    name: 'เอกซเรย์ข้อศอก AP/Lateral', nameEn: 'Elbow AP and lateral',
    modality: 'xr', region: 'upperext', views: ['ap', 'lat'],
    price: 250, claimByRight: { UCS: 250, SSS: 250, OFC: 250, BMA: 250, CASH: 0 },
    prep: 'ถอดนาฬิกา กำไล และเครื่องประดับที่แขน',
    contrast: false, femaleScreening: false, durationMin: 10,
    filmSizes: ['8x10', '8x10'], defaultTemplateId: 'tpl-fracture', retired: false,
  },
  {
    id: 'xr-wrist', code: 'X000052',
    name: 'เอกซเรย์ข้อมือ AP/Lateral', nameEn: 'Wrist AP and lateral',
    modality: 'xr', region: 'upperext', views: ['ap', 'lat'],
    price: 250, claimByRight: { UCS: 250, SSS: 250, OFC: 250, BMA: 250, CASH: 0 },
    prep: 'ถอดนาฬิกา กำไล และแหวน',
    contrast: false, femaleScreening: false, durationMin: 10,
    filmSizes: ['8x10', '8x10'], defaultTemplateId: 'tpl-fracture', retired: false,
  },
  {
    id: 'xr-hand', code: 'X000053',
    name: 'เอกซเรย์มือ AP/Oblique', nameEn: 'Hand AP and oblique',
    modality: 'xr', region: 'upperext', views: ['ap', 'obl'],
    price: 250, claimByRight: { UCS: 250, SSS: 250, OFC: 250, BMA: 250, CASH: 0 },
    prep: 'ถอดแหวนและเครื่องประดับที่มือ',
    contrast: false, femaleScreening: false, durationMin: 10,
    filmSizes: ['8x10', '8x10'], defaultTemplateId: 'tpl-fracture', retired: false,
  },

  /* ── เอกซเรย์ทั่วไป: ขาและเท้า ──────────────────────────────────────── */
  {
    id: 'xr-knee', code: 'X000060',
    name: 'เอกซเรย์ข้อเข่า AP/Lateral', nameEn: 'Knee AP and lateral',
    modality: 'xr', region: 'lowerext', views: ['ap', 'lat'],
    price: 250, claimByRight: { UCS: 250, SSS: 250, OFC: 250, BMA: 250, CASH: 0 },
    prep: 'พับขากางเกงเหนือเข่า หรือเปลี่ยนชุดตรวจ',
    contrast: false, femaleScreening: false, durationMin: 10,
    filmSizes: ['10x12', '10x12'], defaultTemplateId: null, retired: false,
  },
  {
    id: 'xr-knee-sky', code: 'X000061',
    name: 'เอกซเรย์ลูกสะบ้า (Skyline view)', nameEn: 'Knee skyline (patellar) view',
    modality: 'xr', region: 'lowerext', views: ['skyline'],
    price: 200, claimByRight: { UCS: 200, SSS: 200, OFC: 200, BMA: 200, CASH: 0 },
    prep: 'พับขากางเกงเหนือเข่า หรือเปลี่ยนชุดตรวจ',
    contrast: false, femaleScreening: false, durationMin: 10,
    filmSizes: ['8x10'], defaultTemplateId: null, retired: false,
  },
  {
    id: 'xr-ankle', code: 'X000062',
    name: 'เอกซเรย์ข้อเท้า AP/Lateral', nameEn: 'Ankle AP and lateral',
    modality: 'xr', region: 'lowerext', views: ['ap', 'lat'],
    price: 250, claimByRight: { UCS: 250, SSS: 250, OFC: 250, BMA: 250, CASH: 0 },
    prep: 'ถอดรองเท้าและถุงเท้า',
    contrast: false, femaleScreening: false, durationMin: 10,
    filmSizes: ['8x10', '8x10'], defaultTemplateId: 'tpl-fracture', retired: false,
  },
  {
    id: 'xr-foot', code: 'X000063',
    name: 'เอกซเรย์เท้า AP/Oblique', nameEn: 'Foot AP and oblique',
    modality: 'xr', region: 'lowerext', views: ['ap', 'obl'],
    price: 250, claimByRight: { UCS: 250, SSS: 250, OFC: 250, BMA: 250, CASH: 0 },
    prep: 'ถอดรองเท้าและถุงเท้า',
    contrast: false, femaleScreening: false, durationMin: 10,
    filmSizes: ['8x10', '8x10'], defaultTemplateId: 'tpl-fracture', retired: false,
  },

  /* ── อัลตราซาวด์ ────────────────────────────────────────────────────── */
  {
    id: 'us-upper-abd', code: 'X000100',
    name: 'อัลตราซาวด์ช่องท้องส่วนบน', nameEn: 'Ultrasound upper abdomen',
    modality: 'us', region: 'abdomen', views: [],
    price: 900, claimByRight: { UCS: 700, SSS: 700, OFC: 900, BMA: 900, CASH: 0 },
    prep: 'งดอาหารและเครื่องดื่ม (ยกเว้นน้ำเปล่า) 6–8 ชั่วโมงก่อนตรวจ',
    contrast: false, femaleScreening: false, durationMin: 30,
    filmSizes: ['digital'], defaultTemplateId: 'tpl-us-abd-normal', retired: false,
  },
  {
    id: 'us-whole-abd', code: 'X000101',
    name: 'อัลตราซาวด์ช่องท้องทั้งหมด', nameEn: 'Ultrasound whole abdomen',
    modality: 'us', region: 'abdomen', views: [],
    price: 1200, claimByRight: { UCS: 900, SSS: 900, OFC: 1200, BMA: 1200, CASH: 0 },
    prep: 'งดอาหาร 6–8 ชั่วโมง และดื่มน้ำกลั้นปัสสาวะก่อนตรวจ 1 ชั่วโมง',
    contrast: false, femaleScreening: false, durationMin: 40,
    filmSizes: ['digital'], defaultTemplateId: 'tpl-us-abd-normal', retired: false,
  },
  {
    id: 'us-kub', code: 'X000102',
    name: 'อัลตราซาวด์ระบบทางเดินปัสสาวะ (US KUB)', nameEn: 'Ultrasound KUB',
    modality: 'us', region: 'abdomen', views: [],
    price: 800, claimByRight: { UCS: 600, SSS: 600, OFC: 800, BMA: 800, CASH: 0 },
    prep: 'ดื่มน้ำ 3–4 แก้วและกลั้นปัสสาวะก่อนตรวจ 1 ชั่วโมง',
    contrast: false, femaleScreening: false, durationMin: 30,
    filmSizes: ['digital'], defaultTemplateId: null, retired: false,
  },
  {
    id: 'us-ob', code: 'X000103',
    name: 'อัลตราซาวด์ครรภ์ (OB Ultrasound)', nameEn: 'Obstetric ultrasound',
    modality: 'us', region: 'obstetric', views: [],
    price: 600, claimByRight: { UCS: 600, SSS: 600, OFC: 600, BMA: 600, CASH: 0 },
    prep: 'ไม่ต้องงดอาหาร — ดื่มน้ำกลั้นปัสสาวะถ้าอายุครรภ์น้อยกว่า 12 สัปดาห์',
    contrast: false, femaleScreening: false, durationMin: 30,
    filmSizes: ['digital'], defaultTemplateId: null, retired: false,
  },
  {
    id: 'us-thyroid', code: 'X000104',
    name: 'อัลตราซาวด์ต่อมไทรอยด์', nameEn: 'Ultrasound thyroid',
    modality: 'us', region: 'neck', views: [],
    price: 700, claimByRight: { UCS: 500, SSS: 500, OFC: 700, BMA: 700, CASH: 0 },
    prep: 'ไม่ต้องเตรียมตัว',
    contrast: false, femaleScreening: false, durationMin: 20,
    filmSizes: ['digital'], defaultTemplateId: null, retired: false,
  },
  {
    id: 'us-breast', code: 'X000105',
    name: 'อัลตราซาวด์เต้านมทั้งสองข้าง', nameEn: 'Ultrasound both breasts',
    modality: 'us', region: 'breast', views: [],
    price: 900, claimByRight: { UCS: 700, SSS: 700, OFC: 900, BMA: 900, CASH: 0 },
    prep: 'ไม่ต้องเตรียมตัว — งดทาแป้ง/โลชั่นบริเวณเต้านมและรักแร้',
    contrast: false, femaleScreening: false, durationMin: 30,
    filmSizes: ['digital'], defaultTemplateId: 'tpl-mammo-birads1', retired: false,
  },

  /* ── แมมโมแกรม (หน่วยเคลื่อนที่ของสำนักอนามัย) ──────────────────────── */
  {
    id: 'mg-bilateral', code: 'X000110',
    name: 'แมมโมแกรมทั้งสองข้าง', nameEn: 'Bilateral mammogram (CC + MLO)',
    modality: 'mg', region: 'breast', views: ['cc', 'mlo'],
    price: 1500, claimByRight: { UCS: 1200, SSS: 1200, OFC: 1500, BMA: 1500, CASH: 0 },
    prep: 'งดทาแป้ง โลชั่น และยาระงับกลิ่นกายบริเวณเต้านม-รักแร้ในวันตรวจ · ควรนัดหลังหมดประจำเดือน 7–10 วันเพื่อลดอาการเจ็บ',
    contrast: false, femaleScreening: true, durationMin: 30,
    filmSizes: ['digital'], defaultTemplateId: 'tpl-mammo-birads1', retired: false,
  },

  /* ── เอกซเรย์ทันตกรรม ───────────────────────────────────────────────── */
  {
    id: 'dn-periapical', code: 'X000120',
    name: 'เอกซเรย์ฟันเฉพาะซี่ (Periapical)', nameEn: 'Periapical dental film',
    modality: 'dn', region: 'dental', views: [],
    price: 100, claimByRight: { UCS: 100, SSS: 100, OFC: 100, BMA: 100, CASH: 0 },
    prep: 'ถอดฟันปลอมชนิดถอดได้และเครื่องประดับบริเวณใบหน้า',
    contrast: false, femaleScreening: false, durationMin: 5,
    filmSizes: ['dental'], defaultTemplateId: null, retired: false,
  },
  {
    id: 'dn-bitewing', code: 'X000121',
    name: 'เอกซเรย์ฟัน Bitewing', nameEn: 'Bitewing dental film',
    modality: 'dn', region: 'dental', views: [],
    price: 150, claimByRight: { UCS: 150, SSS: 150, OFC: 150, BMA: 150, CASH: 0 },
    prep: 'ถอดฟันปลอมชนิดถอดได้และเครื่องประดับบริเวณใบหน้า',
    contrast: false, femaleScreening: false, durationMin: 5,
    filmSizes: ['dental'], defaultTemplateId: null, retired: false,
  },
  {
    id: 'dn-opg', code: 'X000122',
    name: 'เอกซเรย์พาโนรามิกฟัน (OPG)', nameEn: 'Orthopantomogram (OPG)',
    modality: 'dn', region: 'dental', views: ['pano'],
    price: 350, claimByRight: { UCS: 350, SSS: 350, OFC: 350, BMA: 350, CASH: 0 },
    prep: 'ถอดฟันปลอม ต่างหู สร้อยคอ และกิ๊บติดผม',
    contrast: false, femaleScreening: false, durationMin: 10,
    filmSizes: ['digital'], defaultTemplateId: 'tpl-opg-normal', retired: false,
  },

  /* ── ส่งต่อภายนอก (referralOnly) — สั่งได้จาก ศบส. แต่ไปตรวจที่ รพ. ─── */
  {
    id: 'ct-brain', code: 'X000200',
    name: 'ซีทีสแกนสมอง (ไม่ฉีดสารทึบรังสี)', nameEn: 'CT brain non-contrast',
    modality: 'ct', region: 'skull', views: [],
    price: 2500, claimByRight: { UCS: 2500, SSS: 2500, OFC: 2500, BMA: 2500, CASH: 0 },
    prep: 'ถอดเครื่องประดับโลหะบริเวณศีรษะและลำคอ',
    contrast: false, femaleScreening: true, durationMin: 30,
    filmSizes: ['digital'], defaultTemplateId: null, referralOnly: true, retired: false,
  },
  {
    id: 'ct-chest', code: 'X000201',
    name: 'ซีทีสแกนทรวงอก (ฉีดสารทึบรังสี)', nameEn: 'CT chest with contrast',
    modality: 'ct', region: 'chest', views: [],
    price: 4500, claimByRight: { UCS: 4500, SSS: 4500, OFC: 4500, BMA: 4500, CASH: 0 },
    prep: 'งดอาหาร 4–6 ชั่วโมง · ต้องมีผล Creatinine ภายใน 3 เดือน · แจ้งประวัติแพ้สารทึบรังสี',
    contrast: true, femaleScreening: true, durationMin: 45,
    filmSizes: ['digital'], defaultTemplateId: null, referralOnly: true, retired: false,
  },
  {
    id: 'fl-ugi', code: 'X000210',
    name: 'กลืนแป้งตรวจหลอดอาหารและกระเพาะ (Upper GI study)', nameEn: 'Upper GI study (barium)',
    modality: 'fl', region: 'abdomen', views: [],
    price: 1500, claimByRight: { UCS: 1200, SSS: 1200, OFC: 1500, BMA: 1500, CASH: 0 },
    prep: 'งดอาหารและน้ำหลังเที่ยงคืนก่อนวันตรวจ',
    contrast: true, femaleScreening: true, durationMin: 45,
    filmSizes: ['digital'], defaultTemplateId: null, referralOnly: true, retired: false,
  },
  {
    id: 'mri-lspine', code: 'X000220',
    name: 'เอ็มอาร์ไอกระดูกสันหลังส่วนเอว', nameEn: 'MRI lumbosacral spine',
    modality: 'mri', region: 'lsspine', views: [],
    price: 8000, claimByRight: { UCS: 3500, SSS: 3500, OFC: 8000, BMA: 8000, CASH: 0 },
    prep: 'แจ้งหากมีโลหะ/เครื่องกระตุ้นหัวใจในร่างกาย · ถอดวัตถุโลหะทุกชนิดก่อนเข้าห้องตรวจ',
    contrast: false, femaleScreening: false, durationMin: 45,
    filmSizes: ['digital'], defaultTemplateId: null, referralOnly: true, retired: false,
  },
  {
    id: 'bd-dxa', code: 'X000230',
    name: 'ตรวจความหนาแน่นกระดูก (DXA) สะโพกและกระดูกสันหลัง', nameEn: 'Bone densitometry (DXA) hip and spine',
    modality: 'bd', region: 'lsspine', views: [],
    price: 1200, claimByRight: { UCS: 800, SSS: 800, OFC: 1200, BMA: 1200, CASH: 0 },
    prep: 'งดรับประทานแคลเซียมเสริมในวันตรวจ · ห้ามตรวจหลังกลืนแป้ง/ฉีดสารทึบรังสีภายใน 7 วัน',
    contrast: false, femaleScreening: true, durationMin: 20,
    filmSizes: ['digital'], defaultTemplateId: null, referralOnly: true, retired: false,
  },
];

export const XRAY_EXAM_BY_ID = Object.fromEntries(XRAY_EXAMS.map((e) => [e.id, e]));
export const XRAY_MODALITY_BY_KEY = Object.fromEntries(XRAY_MODALITIES.map((m) => [m.key, m]));
export const XRAY_REGION_BY_KEY = Object.fromEntries(XRAY_BODY_REGIONS.map((r) => [r.key, r]));

export const getModality = (exam) => (exam ? XRAY_MODALITY_BY_KEY[exam.modality] ?? null : null);
export const getRegion = (exam) => (exam ? XRAY_REGION_BY_KEY[exam.region] ?? null : null);

/* ชุดรายการตรวจ — legacy §2.1 item 7: "ถ้าต้องการเลือกรายการตรวจรังสีเป็นชุด
   ให้ไปเลือกที่ข้อมูลของ 'ชุด' หรือคลิกที่ปุ่ม 'ชุดรายการตรวจ'". Order entry
   expands a set into its member exams in one click. */
export const XRAY_EXAM_SETS = [
  { id: 'xset-tb',        name: 'ชุดคัดกรองวัณโรค (คลินิกวัณโรค)',      examIds: ['xr-cxr-pa'] },
  { id: 'xset-preemploy', name: 'ชุดตรวจสุขภาพก่อนเข้างาน',             examIds: ['xr-cxr-pa'] },
  { id: 'xset-lbp',       name: 'ชุดปวดหลังส่วนล่าง (Low back pain)',   examIds: ['xr-lsspine', 'xr-lsspine-obl'] },
  { id: 'xset-knee-oa',   name: 'ชุดข้อเข่าเสื่อม',                     examIds: ['xr-knee', 'xr-knee-sky'] },
  { id: 'xset-breast',    name: 'ชุดคัดกรองมะเร็งเต้านม',               examIds: ['mg-bilateral', 'us-breast'] },
  { id: 'xset-acute-abd', name: 'ชุดปวดท้องเฉียบพลัน',                  examIds: ['xr-acute-abd', 'us-upper-abd'] },
];

/* ─────────────────────────────────────────────────────────────────────────
   CATALOG STORE — TOR §1.12.4.1: the Setup page (ทะเบียนรายการตรวจ) edits
   this catalog, so it needs a way to write back and have the other screens
   notice. Same subscribe/notify pattern as labCatalog.js — deliberately
   minimal, since there is no backend: mutations land in the module-level
   arrays and subscribers re-render.

   `XRAY_EXAMS` is mutated in place rather than reassigned so that modules
   which captured the array reference at import time (the worklist, the
   order picker) keep seeing the same list. */
const listeners = new Set();

export const subscribeCatalog = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

const notify = () => listeners.forEach((fn) => fn());

/* Insert or update one exam. Returns the stored object. A new exam needs an
   `id`; the Setup page derives one from the รหัสรายการตรวจ the user types
   (legacy §2.5 item 1 — แก้ไขชื่อ/รหัสรายการตรวจ). */
export const upsertXrayExam = (exam) => {
  const idx = XRAY_EXAMS.findIndex((e) => e.id === exam.id);
  if (idx >= 0) XRAY_EXAMS[idx] = { ...XRAY_EXAMS[idx], ...exam };
  else XRAY_EXAMS.push(exam);
  XRAY_EXAM_BY_ID[exam.id] = XRAY_EXAMS[idx >= 0 ? idx : XRAY_EXAMS.length - 1];
  notify();
  return XRAY_EXAM_BY_ID[exam.id];
};

/* Retire an exam rather than deleting it — a code already used on past
   orders (and on printed ใบผลเอกซเรย์) must keep resolving, so Setup
   toggles `retired` and the order picker filters it out. */
export const setXrayExamRetired = (id, retired) => {
  const exam = XRAY_EXAM_BY_ID[id];
  if (!exam) return null;
  exam.retired = retired;
  notify();
  return exam;
};

/* ─────────────────────────────────────────────────────────────────────────
   ราคา + ยอดเบิกได้ต่อสิทธิ — TOR §1.12.4.2. `claim` is what the fund
   reimburses under `rightKey`; `patientPay` is the ส่วนต่าง the cashier
   collects. Unknown right ⇒ treat as ชำระเอง (claim 0). */
export const claimFor = (exam, rightKey) => {
  if (!exam) return { price: 0, claim: 0, patientPay: 0 };
  const price = exam.price ?? 0;
  const claim = Math.min(price, exam.claimByRight?.[rightKey] ?? 0);
  return { price, claim, patientPay: price - claim };
};

/* Order-entry footer summary — TOR §1.12.5.4: the order table must show
   ราคา + ยอดที่เบิกได้ per row AND the "ข้อมูลยอดรวมทั้งหมด" line; the legacy
   screen printed the same as "รวมเงินทั้งหมด" (§2.1 item 7.3 / item 9).
   `byModality` feeds the "เอกซเรย์ 2 · อัลตราซาวด์ 1" chip row so the
   radiographer knows how many rooms the visit touches. */
export const summariseSelection = (examIds = [], rightKey = 'CASH') => {
  const exams = examIds.map((id) => XRAY_EXAM_BY_ID[id]).filter(Boolean);

  let total = 0;
  let claimTotal = 0;
  const modalityCount = new Map();
  exams.forEach((exam) => {
    const { price, claim } = claimFor(exam, rightKey);
    total += price;
    claimTotal += claim;
    modalityCount.set(exam.modality, (modalityCount.get(exam.modality) ?? 0) + 1);
  });

  return {
    count: exams.length,
    total,
    claimTotal,
    patientPay: total - claimTotal,
    byModality: [...modalityCount.entries()].map(([key, count]) => ({
      key,
      thai: XRAY_MODALITY_BY_KEY[key]?.thai ?? key,
      count,
    })),
  };
};

/* ─────────────────────────────────────────────────────────────────────────
   DUPLICATE-ORDER WARNING — TOR §1.12.5.9 "แจ้งเตือนเมื่อมีการสั่งคำสั่ง
   X-ray ซ้ำภายในระยะเวลาที่กำหนด".

   Radiation dose makes this stricter than the lab equivalent: repeating a
   blood draw wastes a tube, repeating a radiograph re-irradiates the
   patient. Windows follow how fast the image can plausibly change —
   a CXR is rarely useful twice in a month outside admission; CT/fluoro
   carry a much higher dose; DXA/mammography are annual screenings. */
const REPEAT_WINDOW_DAYS = {
  'xr-cxr-pa': 30,
  'xr-cxr-palat': 30,
  'xr-cxr-ap': 30,
  'ct-brain': 90,
  'ct-chest': 90,
  'fl-ugi': 90,
  'mri-lspine': 180,
  'bd-dxa': 365,
  'mg-bilateral': 365,
  'dn-periapical': 7,
  'dn-bitewing': 7,
  default: 14,
};

export const repeatWindowDays = (examId) => REPEAT_WINDOW_DAYS[examId] ?? REPEAT_WINDOW_DAYS.default;

/* `history` — [{ examId, daysAgo, resultSummary }] (see XRAY_HISTORY_BY_HN
   in xrayOrders.js, which also feeds §1.12.5.7 สั่งตามประวัติเดิม).
   Returns null when the last identical exam is outside the repeat window.

   `level` — 'block' when the repeat is within ~10% of the window (e.g. a
   second CXR inside 3 days): the UI must demand an override reason, not
   just show a banner. Everything else inside the window is 'warn'. */
export const duplicateWarning = (examId, history = []) => {
  const exam = XRAY_EXAM_BY_ID[examId];
  if (!exam) return null;
  const windowDays = repeatWindowDays(examId);
  const recent = history
    .filter((h) => h.examId === examId && h.daysAgo <= windowDays)
    .sort((a, b) => a.daysAgo - b.daysAgo)[0];
  if (!recent) return null;

  const blockWithin = Math.max(1, Math.round(windowDays / 10));
  const level = recent.daysAgo <= blockWithin ? 'block' : 'warn';
  return {
    level,
    daysAgo: recent.daysAgo,
    windowDays,
    resultSummary: recent.resultSummary ?? null,
    message: recent.daysAgo === 0
      ? `เคยถ่าย ${exam.name} วันนี้แล้ว — ผู้ป่วยจะได้รับรังสีซ้ำ`
      : `เคยถ่าย ${exam.name} เมื่อ ${recent.daysAgo} วันก่อน (เกณฑ์เตือนซ้ำ ${windowDays} วัน)`,
  };
};
