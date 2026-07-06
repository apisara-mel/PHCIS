/* PHCIS ⇄ Patient-app shared data layer ("the link").
   ─────────────────────────────────────────────────────────────
   ONE source of truth for the logged-in patient's clinical timeline, shared by
   BOTH surfaces of this SPA:
     • PHCIS (doctor/nurse) WRITES — records a visit, books/updates an appointment.
     • Patient app (/m/*) READS — sees the result instantly ("หมอบันทึก → ผู้ป่วยเห็น").

   It's a tiny reactive store: module-level state + a listener set + localStorage
   persistence (so it survives reloads and navigation between /consent, /treat and
   /m routes). React-17-safe — no useSyncExternalStore.

   Seeded from src/data/mobileMock so nothing starts empty; once a PHCIS action
   writes, the new record is appended and every subscribed screen re-renders. */

import { useState, useEffect } from 'react';
import { APPOINTMENTS, VISIT_HISTORY, CURRENT_USER } from '@/data/mobileMock';

const STORAGE_KEY = 'phcis.link.v1';

/* The demo patient PHCIS and the app agree on (HN ties the two sides together). */
const PATIENT = {
  hn: (CURRENT_USER && CURRENT_USER.profile && CURRENT_USER.profile[0] && CURRENT_USER.profile[0].hn) || '67-00001',
  name: (CURRENT_USER && CURRENT_USER.name) || 'ผู้รับบริการ',
};

const seed = () => ({
  patient: PATIENT,
  appointments: APPOINTMENTS.map((a) => ({ ...a })),
  visits: VISIT_HISTORY.map((v) => ({ ...v })),
});

const load = () => {
  if (typeof window === 'undefined') return seed();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.appointments && parsed.visits) return parsed;
    }
  } catch (_e) { /* fall through to seed */ }
  return seed();
};

let state = load();
const listeners = new Set();

const persist = () => {
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_e) { /* non-fatal */ }
};
const emit = () => { persist(); listeners.forEach((l) => l()); };
const set = (next) => { state = next; emit(); };

/* ── Read ────────────────────────────────────────────────────── */
export const getLinkState = () => state;

/* ── Write (called from PHCIS doctor/nurse actions) ──────────── */

/* Doctor finishes a visit in PHCIS → patient sees it under "ผลการรักษา". */
export function recordVisit(visit) {
  const v = { id: visit.id || `V-${Date.now()}`, type: 'visit', status: 'completed', ...visit };
  set({ ...state, visits: [v, ...state.visits.filter((x) => x.id !== v.id)] });
  return v;
}

/* Book a new appointment (patient app OR PHCIS) → visible on both sides. */
export function bookAppointment(apt) {
  const a = { id: apt.id || `APT-${Date.now()}`, status: 'upcoming', type: 'visit', ...apt };
  set({ ...state, appointments: [a, ...state.appointments.filter((x) => x.id !== a.id)] });
  return a;
}

/* PHCIS confirms / reschedules / cancels → patient sees the new status. */
export function updateAppointment(id, patch) {
  set({ ...state, appointments: state.appointments.map((a) => (a.id === id ? { ...a, ...patch } : a)) });
}

/* Reset to the seeded demo data (handy for QA). */
export function resetLink() { set(seed()); }

/* ── React binding (re-renders subscribers on any write) ─────── */
export function usePhcisLink() {
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force((n) => n + 1);
    listeners.add(l);
    // Pick up writes from other tabs / windows too.
    const onStorage = (e) => { if (e.key === STORAGE_KEY) { state = load(); l(); } };
    if (typeof window !== 'undefined') window.addEventListener('storage', onStorage);
    return () => {
      listeners.delete(l);
      if (typeof window !== 'undefined') window.removeEventListener('storage', onStorage);
    };
  }, []);
  return state;
}

export default { getLinkState, recordVisit, bookAppointment, updateAppointment, resetLink, usePhcisLink };
