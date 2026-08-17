import { useEffect, useState } from 'react';
import { QUESTIONNAIRE_MODULES, QUESTIONNAIRE_META } from '@/data/questionnaire';

/* คลังคำตอบของแบบสัมภาษณ์ลูกค้า (BA/SA Questionnaire).

   ทำงานฝั่ง client ล้วน ๆ — เก็บใน localStorage คีย์เดียว เพื่อให้ผู้สัมภาษณ์
   เปิดหน้าเว็บ พิมพ์คำตอบระหว่างประชุม แล้วส่งออกเป็น CSV/JSON กลับไปรวมกับ
   ไฟล์ Excel ต้นทางได้ทันที ไม่ต้องรอ backend.

   store แบบ subscribe เอง (React 17 — ห้ามใช้ useSyncExternalStore ของ React 18)
   ทุกหน้าที่เรียก useQuestionnaireStore() จะ re-render พร้อมกันเมื่อมีการบันทึก */

export const STORAGE_KEY = 'mih.questionnaire.v1';

/** สถานะของแต่ละคำถาม — pending/answered คำนวณจากคำตอบ ส่วน followup/na ผู้ใช้กดเอง */
export const STATUSES = {
  pending:  { key: 'pending',  label: 'รอคำตอบ',    badge: 'neutral' },
  answered: { key: 'answered', label: 'ตอบแล้ว',    badge: 'success' },
  followup: { key: 'followup', label: 'ต้องติดตาม', badge: 'warning' },
  na:       { key: 'na',       label: 'ไม่เกี่ยวข้อง', badge: 'neutral' },
};

const EMPTY = { v: 1, answers: {}, session: {} };

const read = () => {
  if (typeof window === 'undefined') return EMPTY;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw);
    return {
      v: 1,
      answers: parsed.answers && typeof parsed.answers === 'object' ? parsed.answers : {},
      session: parsed.session && typeof parsed.session === 'object' ? parsed.session : {},
    };
  } catch (err) {
    return EMPTY;
  }
};

let state = read();
const listeners = new Set();

const commit = (next) => {
  state = next;
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (err) {
      /* โควตาเต็ม / โหมด private — ยังให้แก้บนหน้าจอต่อได้ แต่ไม่ค้างข้าม session */
    }
  }
  listeners.forEach((fn) => fn(state));
};

/** อัปเดตคำตอบ/หมายเหตุ/สถานะ ของคำถามหนึ่งข้อ (patch แบบ merge) */
export const setEntry = (id, patch) => {
  const prev = state.answers[id] || { answer: '', note: '', status: null };
  const next = { ...prev, ...patch, updatedAt: new Date().toISOString() };
  commit({ ...state, answers: { ...state.answers, [id]: next } });
};

/** ข้อมูลหัวการสัมภาษณ์รายโมดูล — วันที่ / ผู้สัมภาษณ์ / ผู้ตอบ */
export const setSession = (moduleKey, patch) => {
  const prev = state.session[moduleKey] || {};
  commit({ ...state, session: { ...state.session, [moduleKey]: { ...prev, ...patch } } });
};

export const clearModule = (moduleKey) => {
  const ids = new Set(
    (QUESTIONNAIRE_MODULES.find((m) => m.key === moduleKey)?.sections || [])
      .flatMap((s) => s.items.map((it) => it.id)),
  );
  const answers = {};
  Object.keys(state.answers).forEach((id) => { if (!ids.has(id)) answers[id] = state.answers[id]; });
  commit({ ...state, answers });
};

export const clearAll = () => commit({ ...EMPTY });

/** นำไฟล์สำรอง (JSON ที่ส่งออกจากหน้านี้) กลับเข้ามา */
export const importState = (raw) => {
  const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
  commit({
    v: 1,
    answers: parsed.answers && typeof parsed.answers === 'object' ? parsed.answers : {},
    session: parsed.session && typeof parsed.session === 'object' ? parsed.session : {},
  });
};

export const getState = () => state;

/** สถานะที่ใช้แสดงผลจริง — followup/na ชนะเสมอ ที่เหลือดูว่ามีคำตอบหรือยัง */
export const resolveStatus = (entry) => {
  if (!entry) return 'pending';
  if (entry.status === 'followup' || entry.status === 'na') return entry.status;
  return entry.answer && entry.answer.trim() ? 'answered' : 'pending';
};

/** นับความคืบหน้าของรายการคำถามที่ส่งเข้ามา */
export const tally = (items, answers) => {
  const out = { total: items.length, answered: 0, pending: 0, followup: 0, na: 0 };
  items.forEach((it) => { out[resolveStatus(answers[it.id])] += 1; });
  out.done = out.answered + out.na;
  out.percent = out.total ? Math.round((out.done / out.total) * 100) : 0;
  return out;
};

/** รายการคำถามทั้งหมดของหนึ่งโมดูล (flatten ข้ามหมวด) */
export const moduleItems = (mod) => (mod ? mod.sections.flatMap((s) => s.items) : []);

export function useQuestionnaireStore() {
  const [snapshot, setSnapshot] = useState(state);
  useEffect(() => {
    listeners.add(setSnapshot);
    setSnapshot(state);
    /* แท็บอื่นบันทึก → sync ตาม */
    const onStorage = (e) => { if (e.key === STORAGE_KEY) { state = read(); setSnapshot(state); } };
    window.addEventListener('storage', onStorage);
    return () => { listeners.delete(setSnapshot); window.removeEventListener('storage', onStorage); };
  }, []);
  return snapshot;
}

/* ---------------------------------------------------------------- export -- */

const csvCell = (v) => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;

const CSV_HEADER = [
  'โมดูล', 'หมวด', 'ลำดับ', 'หัวข้อ', 'คำถาม / ประเด็น', 'ประเภทข้อมูล',
  'คำตอบ / ข้อมูลที่ได้รับ', 'หมายเหตุ', 'สถานะ',
  'สัมภาษณ์วันที่', 'ผู้สัมภาษณ์', 'ผู้ตอบ (ลูกค้า)', 'อัปเดตล่าสุด',
];

/** สร้าง CSV (UTF-8 + BOM ให้ Excel อ่านภาษาไทยถูก) — modules ที่ส่งมาเท่านั้น */
export const toCsv = (modules, snapshot) => {
  const rows = [CSV_HEADER.map(csvCell).join(',')];
  modules.forEach((mod) => {
    const ses = snapshot.session[mod.key] || {};
    mod.sections.forEach((sec) => {
      sec.items.forEach((it) => {
        const e = snapshot.answers[it.id] || {};
        rows.push([
          mod.label, sec.title, it.no, it.topic, it.question, it.types.join(', '),
          e.answer || '', e.note || it.note || '', STATUSES[resolveStatus(e)].label,
          ses.interviewDate || '', ses.interviewer || '', ses.respondent || '',
          e.updatedAt ? new Date(e.updatedAt).toLocaleString('th-TH') : '',
        ].map(csvCell).join(','));
      });
    });
  });
  return `﻿${rows.join('\r\n')}`;
};

export const download = (filename, content, mime) => {
  const blob = new Blob([content], { type: `${mime};charset=utf-8;` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 0);
};

const stamp = () => new Date().toISOString().slice(0, 10);

export const exportCsv = (modules, snapshot, suffix = 'all') =>
  download(`HCIS_Questionnaire_${suffix}_${stamp()}.csv`, toCsv(modules, snapshot), 'text/csv');

export const exportJson = (snapshot) =>
  download(
    `HCIS_Questionnaire_backup_${stamp()}.json`,
    JSON.stringify({ ...snapshot, meta: QUESTIONNAIRE_META, exportedAt: new Date().toISOString() }, null, 2),
    'application/json',
  );
