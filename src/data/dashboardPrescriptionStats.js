/* §1.20.6.1 — จำนวนใบสั่งยา + จำนวนรายการ ตามหน่วยบริการ/ช่วงเวลา (เดือน/ไตรมาส/ปี)
   §1.20.6.2 — การตีกลับใบยาให้แพทย์ ตามหน่วยบริการ/ช่วงเวลา
   §1.20.2.2 — สถิติการใช้เวชภัณฑ์

   pharmacyQueue mock มีเฉพาะใบสั่งยา "วันนี้" + 6 วันย้อนหลัง จึงไม่พอสำหรับ
   รายงานระดับ dashboard ที่ต้องดูรายเดือน/ไตรมาส/ปี — ไฟล์นี้เก็บ aggregate
   ข้ามศูนย์ 24 เดือน (อ่านอย่างเดียว ไม่แตะไฟล์ของโมดูลเภสัชกรรม) */

import {
  makeRng, pick, between, isoOffsetMonths, isoOffsetDays,
  BMA_SERVICE_CENTERS, SERVICE_UNITS, THAI_MONTHS_SHORT,
} from '@/data/dashboardCommon';

/** เหตุผลการตีกลับใบสั่งยาให้แพทย์ (§1.20.6.2) */
export const RX_REJECT_REASONS = [
  { key: 'dose',      label: 'ขนาดยาไม่เหมาะสม'           },
  { key: 'allergy',   label: 'ผู้ป่วยมีประวัติแพ้ยา'        },
  { key: 'duplicate', label: 'สั่งซ้ำซ้อนกับรายการเดิม'     },
  { key: 'interact',  label: 'ปฏิกิริยาระหว่างยา'           },
  { key: 'stock',     label: 'ยาไม่มีในคลัง/หมดสต็อก'       },
  { key: 'incomplete',label: 'ข้อมูลใบสั่งไม่ครบถ้วน'        },
  { key: 'right',     label: 'ไม่ครอบคลุมสิทธิการรักษา'     },
];

export const rxRejectReasonLabel = (key) =>
  RX_REJECT_REASONS.find((r) => r.key === key)?.label || key || '—';

/** ประเภทเวชภัณฑ์ (§1.20.2.2) */
export const SUPPLY_CATEGORIES = [
  { key: 'dressing',   label: 'เวชภัณฑ์ทำแผล'        },
  { key: 'syringe',    label: 'เข็ม/กระบอกฉีดยา'      },
  { key: 'glove',      label: 'ถุงมือ/อุปกรณ์ป้องกัน' },
  { key: 'testkit',    label: 'ชุดตรวจ/แถบตรวจ'       },
  { key: 'iv',         label: 'สารน้ำและชุดให้สารน้ำ'  },
  { key: 'other',      label: 'เวชภัณฑ์อื่น ๆ'         },
];

export const supplyCategoryLabel = (key) =>
  SUPPLY_CATEGORIES.find((c) => c.key === key)?.label || key || '—';

export const SUPPLY_ITEMS = [
  { name: 'ก๊อซปิดแผล 3x3 นิ้ว',       category: 'dressing', unit: 'ห่อ'   },
  { name: 'พลาสเตอร์ปิดแผล',           category: 'dressing', unit: 'ชิ้น'  },
  { name: 'Syringe 3 mL',              category: 'syringe',  unit: 'อัน'   },
  { name: 'เข็มฉีดยา 24G',             category: 'syringe',  unit: 'อัน'   },
  { name: 'ถุงมือยางตรวจโรค (M)',      category: 'glove',    unit: 'กล่อง' },
  { name: 'หน้ากากอนามัยทางการแพทย์',  category: 'glove',    unit: 'กล่อง' },
  { name: 'แถบตรวจน้ำตาลปลายนิ้ว',     category: 'testkit',  unit: 'กล่อง' },
  { name: 'ชุดตรวจ ATK',               category: 'testkit',  unit: 'ชุด'   },
  { name: 'NSS 0.9% 1000 mL',          category: 'iv',       unit: 'ถุง'   },
  { name: 'ชุดให้สารน้ำ',               category: 'iv',       unit: 'ชุด'   },
  { name: 'สำลีก้อน',                   category: 'other',    unit: 'ห่อ'   },
  { name: 'แอลกอฮอล์ 70%',             category: 'other',    unit: 'ขวด'   },
];

const monthBuckets = (count = 24) => {
  const out = [];
  for (let back = count - 1; back >= 0; back -= 1) {
    const iso = isoOffsetMonths(back, 1);
    const monthIdx = Number(iso.slice(5, 7)) - 1;
    out.push({
      iso,
      prefix: iso.slice(0, 7),
      label: THAI_MONTHS_SHORT[monthIdx],
      year: Number(iso.slice(0, 4)),
      monthIdx,
      quarter: Math.floor(monthIdx / 3) + 1,
    });
  }
  return out;
};

export const MONTH_BUCKETS = monthBuckets(24);

/** ใบสั่งยา + จำนวนรายการ รายเดือน × ศูนย์ × หน่วยบริการ (§1.20.6.1) */
const buildPrescriptionStats = () => {
  const rng = makeRng(45109922);
  const rows = [];
  MONTH_BUCKETS.forEach((m) => {
    BMA_SERVICE_CENTERS.forEach((c) => {
      SERVICE_UNITS.filter((u) => u.key !== 'checkup').forEach((u) => {
        const scale = u.key === 'opd' ? 3.1 : u.key === 'ncd' ? 2.4 : 1;
        const rxCount = Math.round(between(rng, 40, 130) * scale);
        const itemPerRx = 2 + rng() * 2.6;
        rows.push({
          id: `${m.prefix}|${c.key}|${u.key}`,
          prefix: m.prefix,
          iso: m.iso,
          monthLabel: m.label,
          year: m.year,
          quarter: m.quarter,
          center: c.key,
          unit: u.key,
          rxCount,
          itemCount: Math.round(rxCount * itemPerRx),
        });
      });
    });
  });
  return rows;
};

export const PRESCRIPTION_STATS = buildPrescriptionStats();

/** การตีกลับใบสั่งยาให้แพทย์ (§1.20.6.2) — รายเหตุการณ์ */
const buildRejections = () => {
  const rng = makeRng(77310244);
  const doctors = [
    'พญ.สมหญิง รักษ์ดี', 'นพ.วิรัช รักการ', 'นพ.อภิชาติ ภักดี',
    'พญ.ศิรินทร์ พัฒนกุล', 'นพ.ณัฐวุฒิ บุญมี',
  ];
  const pharmacists = ['ภก.ชนาธิป วงศ์ไทย', 'ภญ.ปิยะดา สุขเสมอ', 'ภก.ธนดล เจริญพร'];
  const reasonWeights = [
    ...Array(9).fill('dose'), ...Array(6).fill('allergy'), ...Array(8).fill('duplicate'),
    ...Array(5).fill('interact'), ...Array(7).fill('stock'), ...Array(6).fill('incomplete'),
    ...Array(3).fill('right'),
  ];
  const rows = [];
  for (let i = 0; i < 214; i += 1) {
    const reason = pick(rng, reasonWeights);
    rows.push({
      id: `rej-${String(i + 1).padStart(3, '0')}`,
      iso: isoOffsetDays(-between(rng, 0, 364)),
      rxNo: `RX-${between(rng, 69000, 69999)}`,
      center: pick(rng, BMA_SERVICE_CENTERS).key,
      unit: pick(rng, SERVICE_UNITS.filter((u) => u.key !== 'checkup')).key,
      reason,
      doctor: pick(rng, doctors),
      pharmacist: pick(rng, pharmacists),
      resolvedSameDay: rng() < 0.87,
    });
  }
  return rows.sort((a, b) => String(b.iso).localeCompare(String(a.iso)));
};

export const RX_REJECTIONS = buildRejections();

/** สถิติการใช้เวชภัณฑ์รายเดือน (§1.20.2.2) */
const buildSupplyUsage = () => {
  const rng = makeRng(3312007);
  const rows = [];
  MONTH_BUCKETS.slice(-12).forEach((m) => {
    SUPPLY_ITEMS.forEach((item) => {
      rows.push({
        id: `${m.prefix}|${item.name}`,
        prefix: m.prefix,
        iso: m.iso,
        monthLabel: m.label,
        name: item.name,
        category: item.category,
        unit: item.unit,
        quantity: between(rng, 40, 620),
      });
    });
  });
  return rows;
};

export const SUPPLY_USAGE = buildSupplyUsage();

/** §1.20.2.3 / §1.20.2.4 — จำนวนยาที่เบิกกับ สปสช. vs กองเภสัชกรรม รายเดือน */
const buildRequisitionSplit = () => {
  const rng = makeRng(9080706);
  return MONTH_BUCKETS.slice(-12).map((m) => ({
    prefix: m.prefix,
    iso: m.iso,
    monthLabel: m.label,
    nhso: between(rng, 1800, 5200),
    pharmacyDivision: between(rng, 2600, 7400),
  }));
};

export const REQUISITION_SPLIT = buildRequisitionSplit();

export const GRANULARITY_OPTIONS = [
  { key: 'month',   label: 'รายเดือน'  },
  { key: 'quarter', label: 'รายไตรมาส' },
  { key: 'year',    label: 'รายปี'      },
];
