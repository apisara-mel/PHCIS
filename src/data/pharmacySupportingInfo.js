/* ข้อมูลประกอบการจ่ายยา (ToR §1.9.4.2) — joins the pharmacy dispense view to
   the app's real, HN-keyed clinical modules:
     • ประวัติการรักษา     → treatmentVisits.js
     • ประวัติส่งปรึกษา    → treatmentConsult.js (consultsForPatient)
     • ผลตรวจ Lab         → labOrders.js (today's reported rows)
     • ผลตรวจรังสีวิทยา   → xrayOrders.js (reported/verified + history)
     • ข้อมูลนัดหมาย       → appointment module
   Per-row `overrides` in pharmacyQueue.js remain as a fallback only when the
   live join returns null (e.g. the Spironolactone kidney-consult demo on
   P-018 when that HN has no consult seed yet).

   Isolated in its own module (rather than inline in pharmacyQueue.js) so the
   one file that reaches across into lab/appointment/consult/xray internals
   is small and easy to keep in sync; every cross-module read is wrapped
   defensively so a shape change there degrades to "ไม่มีข้อมูล" instead of
   crashing the pharmacy queue. */

import { findVisitsByHn } from '@/data/treatmentVisits';
import { LAB_ORDERS, LAB_TEST_CATALOG } from '@/data/labOrders';
import { INITIAL_APPOINTMENTS, findAppointmentsByHn, formatApptListDate } from '@/pages/appointment/appointmentShared';
import { consultsForPatient, clinicMeta } from '@/data/treatmentConsult';
import { XRAY_ORDERS, withExamLabel, xrayHistoryFor } from '@/data/xrayOrders';
import { XRAY_EXAM_BY_ID } from '@/data/xrayCatalog';

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

const latestConsultHistory = (hn) => {
  try {
    const rows = consultsForPatient(hn)
      .filter((c) => c.status !== 'cancelled' && c.status !== 'draft')
      .sort((a, b) => String(b.sentAtIso || b.createdAtIso || '').localeCompare(String(a.sentAtIso || a.createdAtIso || '')));
    const c = rows[0];
    if (!c) return null;
    const clinic = clinicMeta(c.toClinic)?.label || c.toClinic || 'คลินิกอื่น';
    const when = c.sentAt || c.requestedAt || c.createdAt || '';
    const topic = c.question || c.provisionalDx || '';
    return `${when}${when ? ' · ' : ''}ส่งปรึกษา${clinic}${topic ? ` — ${topic}` : ''}`;
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

const recentRadiologyResults = (hn) => {
  try {
    const live = XRAY_ORDERS
      .filter((o) => o.hn === hn && (o.status === 'reported' || o.status === 'verified'))
      .slice(0, 3)
      .map((o) => {
        const d = withExamLabel(o);
        const detail = d.impression || d.resultTypeLabel || 'มีผลแล้ว';
        return `${d.examLabel} — ${detail}`;
      });
    if (live.length) return live.join(' · ');

    const hist = xrayHistoryFor(hn);
    if (!hist.length) return null;
    return hist.map((h) => {
      const exam = XRAY_EXAM_BY_ID[h.examId];
      return `${exam?.name || h.examId} (${h.daysAgo} วันก่อน) — ${h.resultSummary}`;
    }).join(' · ');
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
    exist and falling back to a per-row manual `overrides` object only when
    the live join returns null. */
export const getPharmacySupportingInfo = (hn, overrides = {}) => ({
  treatmentHistory: latestTreatmentHistory(hn) ?? overrides.treatmentHistory ?? null,
  consultHistory: latestConsultHistory(hn) ?? overrides.consultHistory ?? null,
  labResults: recentLabResults(hn) ?? overrides.labResults ?? null,
  radiologyResults: recentRadiologyResults(hn) ?? overrides.radiologyResults ?? null,
  appointmentInfo: nextAppointmentInfo(hn) ?? overrides.appointmentInfo ?? null,
});
