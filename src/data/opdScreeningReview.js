/* Live snapshot of what the nurse typed in OPD Screening steps 1–4, so the
   last step can review it instead of asking them to page backwards.

   Why a store and not props: steps 1/3/4 are built on shared DS forms
   (`VitalsForm`, `HistoryListForm`) that own their state. Each of them now
   accepts an optional `onValuesChange` / `onRecordsChange` callback; the OPD
   wrappers forward it here. Nothing else in the app reads this module, so a
   form that never publishes simply shows as "ยังไม่ได้กรอก" in the review.

   Scope is the browser tab (sessionStorage), same lifetime as
   `opdScreeningDrafts` — a refresh mid-screening keeps the review intact,
   and a new visit starts clean. */

const KEY = 'mih.opd.screening.review.v1';

const read = () => {
  if (typeof sessionStorage === 'undefined') return {};
  try {
    return JSON.parse(sessionStorage.getItem(KEY) || '{}') || {};
  } catch (err) {
    return {};
  }
};

const write = (next) => {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.setItem(KEY, JSON.stringify(next));
  } catch (err) {
    /* quota / private mode — the review just falls back to empty */
  }
};

const hnKey = (hn) => String(hn || 'unknown');

/** Overwrites one section of a patient's screening snapshot. */
export const setScreeningSection = (hn, section, data) => {
  const all = read();
  const forHn = all[hnKey(hn)] || {};
  all[hnKey(hn)] = { ...forHn, [section]: data };
  write(all);
};

/** Everything captured so far for this patient — `{}` when nothing yet. */
export const getScreeningReview = (hn) => read()[hnKey(hn)] || {};

/** Called when a screening is submitted so the next visit starts clean. */
export const clearScreeningReview = (hn) => {
  const all = read();
  delete all[hnKey(hn)];
  write(all);
};

/** Drops rows the nurse never filled in, so the review shows real entries. */
export const meaningfulRecords = (records = []) =>
  (Array.isArray(records) ? records : []).filter(
    (r) => r && [r.name, r.symptom, r.note].some((v) => String(v || '').trim() !== ''),
  );
