import { DISPENSE_STATUS } from '@/data/pharmacyQueue';

/* Fixed 6-card summary rows for pharmacy queue pages — Figma PHCIS_Header_Summary
   / OPD QueuePage pattern: cards stay the same when status tabs change; only the
   table below filters. Counts always come from the full dataset (today's queue). */

/* ไม่มี predicate = นับไม่ได้ ไม่ใช่ 0 รายการ — แต่ต้องไม่ทำให้ทั้งหน้าพัง
   (แก้ 1 ก.ย. 69) แท็บ "นัดล่วงหน้า" ถูกเพิ่มเข้า `TABS` ของหน้าคิวห้องยาเมื่อ
   29 ส.ค. 69 โดยไม่มีคีย์คู่กันใน `TAB_STATUS_FILTER` การไล่นับทุกแท็บจึงเรียก
   `rows.filter(undefined)` แล้วโยน TypeError ตั้งแต่ตอน render — ทั้งหน้าขาว */
export const countRows = (rows, pred) => (
  typeof pred === 'function' ? (rows || []).filter(pred).length : 0
);

const dispenseStatusPred = {
  waiting:   (r) => r.status === DISPENSE_STATUS.WAITING,
  called:    (r) => r.status === DISPENSE_STATUS.CALLED,
  preparing: (r) => r.status === DISPENSE_STATUS.PREPARING,
  dispensed: (r) => r.status === DISPENSE_STATUS.DISPENSED || r.status === DISPENSE_STATUS.PARTIAL,
  problem:   (r) => r.status === DISPENSE_STATUS.PROBLEM,
  no_show:   (r) => r.status === DISPENSE_STATUS.NO_SHOW,
};

const DISPENSE_STATUS_CARDS = [
  { key: 'waiting',   label: 'รอเรียก',    color: 'inprogress',  icon: 'schedule'      },
  { key: 'called',    label: 'เรียกแล้ว',  color: 'info',        icon: 'volume_up'     },
  { key: 'preparing', label: 'จัดยา',      color: 'info',        icon: 'inventory_2'   },
  { key: 'dispensed', label: 'จ่ายแล้ว',   color: 'positive',    icon: 'check_circle'  },
  { key: 'problem',   label: 'มีปัญหา',    color: 'destructive', icon: 'report'        },
  { key: 'no_show',   label: 'ไม่มารับยา', color: 'brand',       icon: 'person_off'    },
];

/** Six status cards — same hierarchy as the queue TabPill row (excludes "ทั้งหมด"). */
export const buildDispenseStatusSummaryCards = (rows, { indicatorPrefix = 'วันนี้' } = {}) =>
  DISPENSE_STATUS_CARDS.map((card) => ({
    ...card,
    value: countRows(rows, dispenseStatusPred[card.key]),
    indicator: indicatorPrefix,
  }));

export const buildRegistrySummaryCards = (registry) => [
  { key: 'total',     label: 'รายการยาทั้งหมด', value: registry.length,                                           indicator: 'ทะเบียนยา', color: 'brand',       icon: 'pill'         },
  { key: 'active',    label: 'ใช้งานอยู่',       value: countRows(registry, (d) => d.active),                       indicator: 'พร้อมจ่าย',             color: 'positive',    icon: 'check_circle' },
  { key: 'inactive',  label: 'ปิดใช้งาน',        value: countRows(registry, (d) => !d.active),                      indicator: 'ไม่แสดงในคิวจ่าย',       color: 'inprogress',  icon: 'block'        },
  { key: 'highAlert', label: 'High Alert',       value: countRows(registry, (d) => d.highAlert),                    indicator: 'ต้องตรวจสอบพิเศษ',      color: 'destructive', icon: 'warning'      },
  { key: 'nlem',      label: 'ยา NLEM',          value: countRows(registry, (d) => d.classification === 'nlem'),    indicator: 'บัญชียาหลักแห่งชาติ',  color: 'info',        icon: 'medication'   },
  { key: 'nonNlem',   label: 'ยานอก NLEM',       value: countRows(registry, (d) => d.classification !== 'nlem'),    indicator: 'ยาทั่วไป/เวชภัณฑ์',     color: 'brand',       icon: 'vaccines'     },
];

export const buildStockSummaryCards = ({
  mainRows, subRows, nearExpiryMain, nearExpirySub, belowReorderMain, belowReorderSub,
  subWarehouseCount = 0,
}) => {
  const allRows = [...mainRows, ...subRows];
  return [
    { key: 'main',         label: 'คลังยาใหญ่ของศูนย์',   value: mainRows.length,                                      indicator: '1 คลังต่อศูนย์',     color: 'brand',       icon: 'warehouse'    },
    { key: 'sub',          label: 'คลังยาย่อย',           value: subRows.length,                                       indicator: subWarehouseCount > 0 ? `${subWarehouseCount} คลัง · ทุกรายการ` : 'รายการในคลังย่อย', color: 'info', icon: 'inventory_2' },
    { key: 'nearExpiry',   label: 'ใกล้หมดอายุ',          value: nearExpiryMain + nearExpirySub,                       indicator: '≤6 เดือน ทุคลัง',    color: 'inprogress',  icon: 'schedule'     },
    { key: 'belowReorder', label: 'ต่ำกว่าจุดสั่งซื้อ',   value: belowReorderMain + belowReorderSub,                   indicator: 'ควรเบิกเพิ่มเติม',    color: 'destructive', icon: 'trending_down' },
    { key: 'totalUnits',   label: 'จำนวนคงคลังรวม',       value: allRows.reduce((s, r) => s + r.stock, 0).toLocaleString(), indicator: 'ทุกรายการ',       color: 'positive',    icon: 'inventory'    },
    { key: 'totalItems',   label: 'รายการรวมทั้งสองชั้น', value: allRows.length,                                       indicator: 'คลังใหญ่ + คลังย่อย', color: 'brand',       icon: 'layers'       },
  ];
};

export const buildRequisitionSummaryCards = (requisitions, receiving) => [
  { key: 'reqTotal',    label: 'คำขอเบิกทั้งหมด',  value: requisitions.length,                                      indicator: 'เบิกจ่ายยา/เวชภัณฑ์', color: 'brand',       icon: 'move_down'     },
  { key: 'pending',     label: 'รอดำเนินการ',      value: countRows(requisitions, (r) => r.status === 'pending'),   indicator: 'รออนุมัติ',            color: 'inprogress',  icon: 'hourglass_top' },
  { key: 'approved',    label: 'อนุมัติแล้ว',       value: countRows(requisitions, (r) => r.status === 'approved'),  indicator: 'รอเบิกจ่าย',           color: 'info',        icon: 'task_alt'      },
  { key: 'fulfilled',   label: 'เบิกจ่ายแล้ว',      value: countRows(requisitions, (r) => r.status === 'fulfilled'), indicator: 'ปิดรายการแล้ว',         color: 'positive',    icon: 'check_circle'  },
  { key: 'receiving',   label: 'รับเข้าคลังใหญ่',   value: receiving.length,                                         indicator: 'รายการรับเข้า',         color: 'brand',       icon: 'move_up'       },
  { key: 'receivedQty', label: 'จำนวนรับรวม',       value: receiving.reduce((s, r) => s + r.quantity, 0).toLocaleString(), indicator: 'หน่วยทั้งหมด',     color: 'info',        icon: 'inventory_2'   },
];

/** MPI roster cards — ผู้รับบริการทั้งหมด (registration status). */
export const buildPatientsSummaryCards = (patients) => [
  { key: 'total',    label: 'ผู้รับบริการทั้งหมด', value: patients.length,                                      indicator: 'ทะเบียน MPI',       color: 'brand',       icon: 'groups'         },
  { key: 'active',   label: 'Active',              value: countRows(patients, (p) => p.status === 'active'),   indicator: 'ใช้งานได้',          color: 'positive',    icon: 'check_circle'   },
  { key: 'inactive', label: 'Inactive',            value: countRows(patients, (p) => p.status === 'inactive'), indicator: 'ปิดใช้งาน',          color: 'inprogress',  icon: 'block'          },
  { key: 'pending',  label: 'รอลงทะเบียน',         value: countRows(patients, (p) => p.status === 'pending'),  indicator: 'ยังไม่ครบข้อมูล',    color: 'inprogress',  icon: 'hourglass_top'  },
];

export const buildReportsSummaryCards = ({ detailRows, summaryRows, dispensedCount, totalValue, rangeLabel }) => [
  { key: 'prescriptions', label: 'ใบสั่งยาในช่วงที่เลือก', value: detailRows.length,                                      indicator: rangeLabel,              color: 'brand',       icon: 'description'    },
  { key: 'dispensed',     label: 'จ่ายแล้ว/บางส่วน',       value: dispensedCount,                                         indicator: 'ปิดรายการแล้ว',          color: 'positive',    icon: 'check_circle'   },
  { key: 'pending',       label: 'รอดำเนินการ',            value: detailRows.length - dispensedCount,                     indicator: 'ยังไม่จ่ายครบ',           color: 'inprogress',  icon: 'hourglass_top'  },
  { key: 'problem',       label: 'มีปัญหา',                value: countRows(detailRows, (r) => r.status === DISPENSE_STATUS.PROBLEM), indicator: 'ต้องติดตาม', color: 'destructive', icon: 'report'         },
  { key: 'noShow',        label: 'ไม่มารับยา',             value: countRows(detailRows, (r) => r.status === DISPENSE_STATUS.NO_SHOW), indicator: 'ไม่มารับยา',  color: 'brand',       icon: 'person_off'     },
  { key: 'drugTypes',     label: 'รายการยาที่สั่ง',         value: summaryRows.length,                                     indicator: `~฿${totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: 'info', icon: 'medication' },
];

export const buildRequisitionReportSummaryCards = (rows, rangeLabel) => [
  { key: 'total',     label: 'คำขอเบิกในช่วงที่เลือก', value: rows.length,                                      indicator: rangeLabel,     color: 'brand',       icon: 'move_down'     },
  { key: 'pending',   label: 'รอดำเนินการ',            value: countRows(rows, (r) => r.status === 'pending'),   indicator: 'รออนุมัติ',      color: 'inprogress',  icon: 'hourglass_top' },
  { key: 'approved',  label: 'อนุมัติแล้ว',             value: countRows(rows, (r) => r.status === 'approved'),  indicator: 'รอเบิกจ่าย',     color: 'info',        icon: 'task_alt'      },
  { key: 'fulfilled', label: 'เบิกจ่ายแล้ว',            value: countRows(rows, (r) => r.status === 'fulfilled'), indicator: 'ปิดรายการ',      color: 'positive',    icon: 'check_circle'  },
  { key: 'cancelled', label: 'ยกเลิกแล้ว',              value: countRows(rows, (r) => r.status === 'cancelled'), indicator: 'ไม่ดำเนินการ',    color: 'destructive', icon: 'block'         },
  { key: 'qty',       label: 'จำนวนขอรวม',             value: rows.reduce((s, r) => s + (Number(r.quantity) || 0), 0).toLocaleString(), indicator: 'หน่วยทั้งหมด', color: 'brand', icon: 'inventory_2' },
];

export const buildReceivingReportSummaryCards = (rows, rangeLabel) => [
  { key: 'total',     label: 'รายการรับเข้าในช่วงที่เลือก', value: rows.length, indicator: rangeLabel, color: 'brand', icon: 'move_up' },
  { key: 'purchase',  label: 'จัดซื้อ', value: countRows(rows, (r) => r.receivingType === 'purchase'), indicator: 'ประเภทการรับ', color: 'info', icon: 'shopping_cart' },
  { key: 'transfer',  label: 'โอนจากหน่วยงานอื่น', value: countRows(rows, (r) => r.receivingType === 'transfer'), indicator: 'ประเภทการรับ', color: 'inprogress', icon: 'swap_horiz' },
  { key: 'donation',  label: 'รับบริจาค', value: countRows(rows, (r) => r.receivingType === 'donation'), indicator: 'ประเภทการรับ', color: 'positive', icon: 'volunteer_activism' },
  { key: 'cancelled', label: 'ยกเลิกแล้ว', value: countRows(rows, (r) => r.status === 'cancelled'), indicator: 'ไม่นับเข้าคลัง', color: 'destructive', icon: 'block' },
  { key: 'qty',       label: 'จำนวนรับรวม', value: rows.filter((r) => r.status !== 'cancelled').reduce((s, r) => s + (Number(r.quantity) || 0), 0).toLocaleString(), indicator: 'หน่วยทั้งหมด', color: 'brand', icon: 'inventory_2' },
];

export const buildStockReportSummaryCards = ({ nearExpiryRows, reorderRows, mainCount, subCount }) => [
  { key: 'nearExpiry', label: 'ใกล้หมดอายุ', value: nearExpiryRows.length, indicator: '≤6 เดือน', color: 'inprogress', icon: 'schedule' },
  { key: 'reorder', label: 'ต่ำกว่าจุดสั่งซื้อ', value: reorderRows.length, indicator: 'ควรเบิกเพิ่ม', color: 'destructive', icon: 'trending_down' },
  { key: 'main', label: 'รายการคลังใหญ่', value: mainCount, indicator: 'ชั้นคลังใหญ่', color: 'brand', icon: 'warehouse' },
  { key: 'sub', label: 'รายการคลังย่อย', value: subCount, indicator: 'ทุกคลังย่อย', color: 'info', icon: 'inventory_2' },
  { key: 'alerts', label: 'รายการที่ต้องติดตาม', value: nearExpiryRows.length + reorderRows.length, indicator: 'ใกล้หมดอายุ + ต่ำจุดสั่ง', color: 'destructive', icon: 'report' },
  { key: 'ok', label: 'รายการคงคลังปกติ', value: Math.max(0, mainCount + subCount - nearExpiryRows.length - reorderRows.length), indicator: 'นอกเงื่อนไขแจ้งเตือน', color: 'positive', icon: 'check_circle' },
];

export const buildRegistryReportSummaryCards = ({ registryRows, newlyAddedRows, rangeLabel }) => [
  { key: 'total', label: 'รายการในรายงาน', value: registryRows.length, indicator: 'ทะเบียนยา', color: 'brand', icon: 'pill' },
  { key: 'new', label: 'เพิ่มเข้ามาใหม่', value: newlyAddedRows.length, indicator: rangeLabel, color: 'info', icon: 'add_circle' },
  { key: 'active', label: 'ใช้งานอยู่', value: countRows(registryRows, (d) => d.active), indicator: 'พร้อมจ่าย', color: 'positive', icon: 'check_circle' },
  { key: 'inactive', label: 'ปิดใช้งาน', value: countRows(registryRows, (d) => !d.active), indicator: 'ไม่แสดงในคิวจ่าย', color: 'inprogress', icon: 'block' },
  { key: 'highAlert', label: 'High Alert', value: countRows(registryRows, (d) => d.highAlert), indicator: 'ต้องตรวจสอบพิเศษ', color: 'destructive', icon: 'warning' },
  { key: 'nlem', label: 'ยา NLEM', value: countRows(registryRows, (d) => d.classification === 'nlem'), indicator: 'บัญชียาหลักแห่งชาติ', color: 'brand', icon: 'medication' },
];

export const buildPatientsReportSummaryCards = ({ rosterRows, serviceRows, rangeLabel }) => [
  { key: 'roster', label: 'ผู้รับบริการในรายงาน', value: rosterRows.length, indicator: 'ทะเบียน MPI', color: 'brand', icon: 'groups' },
  { key: 'active', label: 'Active', value: countRows(rosterRows, (p) => p.status === 'active'), indicator: 'ใช้งานได้', color: 'positive', icon: 'check_circle' },
  { key: 'allergy', label: 'มีประวัติแพ้ยา', value: countRows(rosterRows, (p) => (p.drugAllergies || []).length > 0 || p.flags?.allergyDrug), indicator: 'ต้องระวังตอนจ่าย', color: 'destructive', icon: 'warning' },
  { key: 'chronic', label: 'โรคเรื้อรัง', value: countRows(rosterRows, (p) => (p.chronicDiseases || []).length > 0 || p.flags?.chronic), indicator: 'ติดตามต่อเนื่อง', color: 'inprogress', icon: 'monitor_heart' },
  { key: 'served', label: 'มารับยาในช่วงที่เลือก', value: serviceRows.length, indicator: rangeLabel, color: 'info', icon: 'medication' },
  { key: 'visits', label: 'ใบสั่งยารวม', value: serviceRows.reduce((s, r) => s + (r.visitCount || 0), 0), indicator: 'ทุก HN ในช่วงวันที่', color: 'brand', icon: 'description' },
];

/** Single-page pharmacy reports KPI strip — one card per major report domain. */
export const buildUnifiedPharmacyReportSummaryCards = ({
  detailRows,
  dispensedCount,
  patientServiceRows,
  newlyAddedRows,
  requisitionRows,
  receivingRows,
  stockAlertCount,
  rangeLabel,
}) => [
  { key: 'rx', label: 'ใบสั่งยา', value: detailRows.length, indicator: rangeLabel, color: 'brand', icon: 'description' },
  { key: 'dispensed', label: 'จ่ายแล้ว/บางส่วน', value: dispensedCount, indicator: 'ปิดรายการแล้ว', color: 'positive', icon: 'check_circle' },
  { key: 'patients', label: 'ผู้มารับยา', value: patientServiceRows.length, indicator: 'HN ในช่วงวันที่', color: 'info', icon: 'groups' },
  { key: 'newDrugs', label: 'ยาเพิ่มใหม่', value: newlyAddedRows.length, indicator: rangeLabel, color: 'brand', icon: 'pill' },
  { key: 'req', label: 'คำขอเบิก', value: requisitionRows.length, indicator: rangeLabel, color: 'inprogress', icon: 'move_down' },
  { key: 'ops', label: 'รับเข้า + แจ้งเตือนคลัง', value: `${receivingRows.length} / ${stockAlertCount}`, indicator: 'รับเข้า · ต้องติดตาม', color: 'destructive', icon: 'warehouse' },
];
