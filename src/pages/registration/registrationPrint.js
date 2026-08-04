/* Registration print switch — TOR 1.1.1.9 (บัตรคิว kiosk-fallback) +
   1.1.1.10 (OPD Card). Same mechanism as labPrintSettings.js: an
   idempotent module-load stylesheet plus a root `data-reg-print-mode`
   attribute deciding which print-only document @media print reveals, so
   the queue-ticket button can never print the OPD card (both popups can
   be mounted on the same page).

   Create-or-UPDATE (not create-if-missing) so HMR edits to these rules
   never go stale — per CLAUDE.md's stylesheet-injection contract. */

if (typeof document !== 'undefined') {
  let el = document.getElementById('mih-registration-print-style');
  if (!el) {
    el = document.createElement('style');
    el.id = 'mih-registration-print-style';
    document.head.appendChild(el);
  }
  el.textContent = `
    .mih-reg-print-root { display: none; }
    @media print {
      body > *:not(.mih-reg-print-root) { display: none !important; }
      html[data-reg-print-mode="opd-card"]     .mih-reg-print-root.mih-reg-print-opd-card     { display: block !important; }
      html[data-reg-print-mode="queue-ticket"] .mih-reg-print-root.mih-reg-print-queue-ticket { display: block !important; }
      .mih-reg-print-sheet { break-inside: avoid; page-break-inside: avoid; }
    }
  `;
}

/** Print one registration document: 'opd-card' | 'queue-ticket'. */
export const printRegistrationDoc = (mode) => {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-reg-print-mode', mode);

  /* Clear the switch only once the browser is genuinely done with the job,
     so a later plain window.print() elsewhere is not hijacked by our
     visibility rules. `afterprint` is the correct signal — a fixed timer is
     not: on browsers where window.print() returns before the job is spooled
     (or when the preview stays open and re-paints), stripping the attribute
     early makes @media print hide BOTH print roots → a blank page.
     The timer stays purely as a fallback for browsers without the event. */
  let cleared = false;
  let fallbackTimer = 0;
  const clear = () => {
    if (cleared) return;
    cleared = true;
    window.clearTimeout(fallbackTimer);
    window.removeEventListener('afterprint', clear);
    document.documentElement.removeAttribute('data-reg-print-mode');
  };

  const supportsAfterPrint = 'onafterprint' in window;
  if (supportsAfterPrint) window.addEventListener('afterprint', clear);
  /* Long enough that it never races a real print job; only reached on
     browsers that never fire afterprint. */
  fallbackTimer = window.setTimeout(clear, supportsAfterPrint ? 60000 : 500);

  window.print();
};
