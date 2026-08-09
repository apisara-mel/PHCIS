/* ข้อมูลประกอบการจ่ายยา (ToR §1.9.2.2–3 / §1.9.4.2) — joins the pharmacy
   dispense view to the app's real, HN-keyed clinical modules:
     • ผลการวินิจฉัย     → visit diagnosis on the pharmacy row / treatmentVisits
     • Doctor Note        → treatmentNotes (type=doctor) / row override
     • Nurse Note         → pharmacy row / treatmentNotes (type=nurse)
     • ประวัติการรักษา     → treatmentVisits.js
     • ประวัติส่งปรึกษา    → treatmentConsult.js (consultsForPatient)
     • ผลตรวจ Lab         → labOrders.js (today reported) + labCumulative prior
     • ผลตรวจรังสีวิทยา   → xrayOrders.js (reported/verified + history)
     • ข้อมูลนัดหมาย       → appointment module
   Per-row `overrides` in pharmacyQueue.js remain as a fallback only when the
   live join returns null.

   Isolated in its own module (rather than inline in pharmacyQueue.js) so the
   one file that reaches across into lab/appointment/consult/xray internals
   is small and easy to keep in sync; every cross-module read is wrapped
   defensively so a shape change there degrades to "ไม่มีข้อมูล" instead of
   crashing the pharmacy queue. */

import { findVisitsByHn } from '@/data/treatmentVisits';
import { notesForPatient, noteDisplayBody } from '@/data/treatmentNotes';
import { LAB_ORDERS, LAB_TEST_CATALOG } from '@/data/labOrders';
import { priorVisitsFor } from '@/data/labCumulative';
import { LAB_TEST_BY_ID } from '@/data/labCatalog';
import { INITIAL_APPOINTMENTS, findAppointmentsByHn, formatApptListDate } from '@/pages/appointment/appointmentShared';
import { consultsForPatient, clinicMeta } from '@/data/treatmentConsult';
import { XRAY_ORDERS, withExamLabel, xrayHistoryFor } from '@/data/xrayOrders';
import { XRAY_EXAM_BY_ID } from '@/data/xrayCatalog';

const TODAY_ISO = new Date().toISOString().slice(0, 10);

const formatDiagnosis = (dx) => {
  if (!dx) return null;
  if (typeof dx === 'string') return dx.trim() || null;
  const code = dx.icd10 || dx.code || '';
  const name = dx.name || dx.label || '';
  if (!code && !name) return null;
  return code && name ? `${code} — ${name}` : (code || name);
};

const latestDiagnosis = (hn) => {
  try {
    const visits = findVisitsByHn(hn);
    if (!visits.length) return null;
    return visits[0].dx || null;
  } catch {
    return null;
  }
};

const latestNoteOfType = (hn, type) => {
  try {
    const note = notesForPatient(hn).find((n) => n.type === type && !n.cancelledAt);
    if (!note) return null;
    const body = noteDisplayBody(note);
    if (!body) return null;
    return note.author ? `${body} (${note.author}${note.recordedAt ? ` · ${note.recordedAt}` : ''})` : body;
  } catch {
    return null;
  }
};

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

/* Today's reported lab orders first; if none, fall back to the most recent
   cumulative prior visit so pharmacy still sees lipid/FBS/etc. for chronic
   patients (e.g. HN 67-00003). */
const recentLabResults = (hn) => {
  try {
    const rows = LAB_ORDERS.filter((o) => o.patient?.hn === hn && o.status === 'reported' && o.resultSummary);
    if (rows.length) {
      return rows.map((o) => ({
        test: LAB_TEST_CATALOG[o.testKey]?.label || o.testKey,
        result: o.resultSummary,
        flag: o.critical ? 'critical' : o.abnormal ? 'abnormal' : 'normal',
        date: null,
      }));
    }

    const prior = priorVisitsFor(hn);
    if (!prior.length) return null;
    const v = prior[0];
    const parts = [];
    Object.entries(v.results || {}).forEach(([testId, analytes]) => {
      const test = LAB_TEST_BY_ID[testId];
      const label = test?.nameTh || test?.nameEn || testId;
      const vals = Object.entries(analytes || {})
        .map(([k, val]) => {
          const analyte = (test?.analytes || []).find((a) => a.key === k);
          return `${analyte?.label || k} ${val}${analyte?.unit ? ` ${analyte.unit}` : ''}`;
        })
        .join(' · ');
      if (vals) parts.push({ test: label, result: vals, flag: 'normal', date: v.date });
    });
    return parts.length ? parts : null;
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

const formatVitals = (v) => {
  if (!v || typeof v !== 'object') return null;
  const parts = [];
  if (v.bp != null && v.bp !== '' && v.bp !== '-') parts.push(`BP ${v.bp}`);
  if (v.hr != null && v.hr !== '' && v.hr !== '-') parts.push(`HR ${v.hr}`);
  if (v.temp != null && v.temp !== '' && v.temp !== '-') parts.push(`Temp ${v.temp}°C`);
  if (v.rr != null && v.rr !== '' && v.rr !== '-') parts.push(`RR ${v.rr}`);
  if (v.spo2 != null && v.spo2 !== '' && v.spo2 !== '-') parts.push(`SpO₂ ${v.spo2}%`);
  if (v.weight != null && v.weight !== '' && v.weight !== '-') parts.push(`น้ำหนัก ${v.weight} กก.`);
  if (v.height != null && v.height !== '' && v.height !== '-') parts.push(`ส่วนสูง ${v.height} ซม.`);
  return parts.length ? parts.join(' · ') : null;
};

/** Builds a pharmacy row's `supportingInfo`.
 *  @param {string} hn
 *  @param {object} [overrides] per-queueNo fallbacks from pharmacyQueue
 *  @param {object} [visit] current visit snapshot — { diagnosis, nurseNote, doctorNote, vitals }
 */
export const getPharmacySupportingInfo = (hn, overrides = {}, visit = {}) => ({
  diagnosis: formatDiagnosis(visit.diagnosis) ?? latestDiagnosis(hn) ?? overrides.diagnosis ?? null,
  vitals: formatVitals(visit.vitals || visit.vitalsSnapshot) ?? overrides.vitals ?? null,
  /* Current visit wins over the HN's note history — same precedence as
     diagnosis / vitals / nurseNote. A prescription the doctor pushed today
     must not be shadowed by an older treatmentNotes entry. */
  doctorNote: visit.doctorNote ?? latestNoteOfType(hn, 'doctor') ?? overrides.doctorNote ?? null,
  nurseNote: visit.nurseNote ?? latestNoteOfType(hn, 'nurse') ?? overrides.nurseNote ?? null,
  treatmentHistory: latestTreatmentHistory(hn) ?? overrides.treatmentHistory ?? null,
  consultHistory: latestConsultHistory(hn) ?? overrides.consultHistory ?? null,
  labResults: recentLabResults(hn) ?? overrides.labResults ?? null,
  radiologyResults: recentRadiologyResults(hn) ?? overrides.radiologyResults ?? null,
  appointmentInfo: nextAppointmentInfo(hn) ?? overrides.appointmentInfo ?? null,
});
