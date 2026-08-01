/* ข้อมูลประกอบการจ่ายยา (ToR §1.9.4.2) — joins the pharmacy dispense view to
   the app's real, HN-keyed clinical modules instead of the pharmacy-only
   `SUPPORTING_INFO_OVERRIDES` map in pharmacyQueue.js: ประวัติการรักษา from
   `treatmentVisits.js`, ผลตรวจทางห้องปฏิบัติการ from today's `LAB_ORDERS`
   worklist in `labOrders.js`, and ข้อมูลนัดหมาย from the appointment module.
   ประวัติส่งปรึกษา / ผลตรวจทางรังสีวิทยา have no dedicated HN-keyed module
   anywhere in the app yet (both are themselves undeveloped stub modules —
   see docs/product-spec.md §10.1/§10.5), so those two stay override-only
   until a real consult/radiology module exists.

   Isolated in its own module (rather than inline in pharmacyQueue.js) so the
   one file that reaches across into lab/appointment internals is small and
   easy to keep in sync if either of those modules' shapes change; every
   cross-module read is wrapped defensively so a shape change there degrades
   to "ไม่มีข้อมูล" instead of crashing the pharmacy queue. */

import { findVisitsByHn } from '@/data/treatmentVisits';
import { LAB_ORDERS, LAB_TEST_CATALOG } from '@/data/labOrders';
import { INITIAL_APPOINTMENTS, findAppointmentsByHn, formatApptListDate } from '@/pages/appointment/appointmentShared';

const TODAY_ISO = new Date().toISOString().slice(0, 10);

const latestTreatmentHistory = (hn) => {
  try {
    const visits = findVisitsByHn(hn);
    if (!visits.length) return null;
    const v = visits[0];
    return `${v.date} · ${v.dept}${v.doctor ? ` · ${v.doctor}` : ''} · ${v.dx}`;
  } catch {
    return null;
  }
};

/* `LAB_ORDERS` is today's lab worklist (no per-order date field beyond
   `orderedAt` time), so "recent lab results" here means today's reported
   results for this HN — the closest real analogue to the old repo's
   multi-day `labHistoryFor` history given this module's actual shape. */
const recentLabResults = (hn) => {
  try {
    const rows = LAB_ORDERS.filter((o) => o.patient?.hn === hn && o.status === 'reported' && o.resultSummary);
    if (!rows.length) return null;
    return rows.map((o) => ({
      test: LAB_TEST_CATALOG[o.testKey]?.label || o.testKey,
      result: o.resultSummary,
      flag: o.critical ? 'critical' : o.abnormal ? 'abnormal' : 'normal',
    }));
  } catch {
    return null;
  }
};

const nextAppointmentInfo = (hn) => {
  try {
    const rows = findAppointmentsByHn(INITIAL_APPOINTMENTS, hn)
      .filter((a) => a.status !== 'cancelled' && a.date >= TODAY_ISO)
      .sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || ''));
    const next = rows[0];
    if (!next) return null;
    const place = next.clinic || next.dept || '';
    return `${formatApptListDate(next.date)} เวลา ${next.time || '-'}${place ? ` · ${place}` : ''}${next.doctor ? ` · ${next.doctor}` : ''}`;
  } catch {
    return null;
  }
};

/** Builds a pharmacy row's `supportingInfo`, joining live modules where they
    exist (treatment/lab/appointment) and falling back to a per-row manual
    `overrides` object for the two fields (`consultHistory`,
    `radiologyResults`) that have no real HN-keyed source yet. */
export const getPharmacySupportingInfo = (hn, overrides = {}) => ({
  treatmentHistory: latestTreatmentHistory(hn) ?? overrides.treatmentHistory ?? null,
  consultHistory: overrides.consultHistory ?? null,
  labResults: recentLabResults(hn) ?? overrides.labResults ?? null,
  radiologyResults: overrides.radiologyResults ?? null,
  appointmentInfo: nextAppointmentInfo(hn) ?? overrides.appointmentInfo ?? null,
});
