import { DISPENSE_STATUS } from '@/data/pharmacyQueue';

/* Fixed 6-card summary rows for pharmacy queue pages — Figma PHCIS_Header_Summary
   / OPD QueuePage pattern: cards stay the same when status tabs change; only the
   table below filters. Counts always come from the full dataset (today's queue). */

export const countRows = (rows, pred) => rows.filter(pred).length;

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
  { key: 'draft',    label: 'ที่ร่างไว้',          value: countRows(patients, (p) => p.status === 'draft'),    indicator: 'บันทึกชั่วคราว',     color: 'info',        icon: 'edit_note'      },
];

export const buildReportsSummaryCards = ({ detailRows, summaryRows, dispensedCount, totalValue, rangeLabel }) => [
  { key: 'prescriptions', label: 'ใบสั่งยาในช่วงที่เลือก', value: detailRows.length,                                      indicator: rangeLabel,              color: 'brand',       icon: 'description'    },
  { key: 'dispensed',     label: 'จ่ายแล้ว/บางส่วน',       value: dispensedCount,                                         indicator: 'ปิดรายการแล้ว',          color: 'positive',    icon: 'check_circle'   },
  { key: 'pending',       label: 'รอดำเนินการ',            value: detailRows.length - dispensedCount,                     indicator: 'ยังไม่จ่ายครบ',           color: 'inprogress',  icon: 'hourglass_top'  },
  { key: 'problem',       label: 'มีปัญหา',                value: countRows(detailRows, (r) => r.status === DISPENSE_STATUS.PROBLEM), indicator: 'ต้องติดตาม', color: 'destructive', icon: 'report'         },
  { key: 'noShow',        label: 'ไม่มารับยา',             value: countRows(detailRows, (r) => r.status === DISPENSE_STATUS.NO_SHOW), indicator: 'ไม่มารับยา',  color: 'brand',       icon: 'person_off'     },
  { key: 'drugTypes',     label: 'รายการยาที่สั่ง',         value: summaryRows.length,                                     indicator: `~฿${totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: 'info', icon: 'medication' },
];
