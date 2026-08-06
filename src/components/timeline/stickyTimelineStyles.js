/* Idempotent styles for sticky date headers in grouped timelines. */

const STYLE_ID = 'mih-sticky-timeline-date';

if (typeof document !== 'undefined') {
  const css = `
.mih-timeline-sticky-date-wrap {
  position: relative;
}
.mih-timeline-sticky-date-sentinel {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  pointer-events: none;
  visibility: hidden;
}
.mih-timeline-sticky-chrome {
  position: -webkit-sticky;
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  flex-direction: column;
  gap: var(--dim-space-200);
  padding-top: var(--dim-space-100);
  padding-bottom: var(--dim-space-200);
  margin-bottom: var(--dim-space-100);
  box-sizing: border-box;
  width: 100%;
  transition:
    box-shadow var(--motion-duration-popover, 160ms)
      var(--motion-easing-standard, cubic-bezier(0.4, 0, 0.2, 1));
}
.mih-timeline-sticky-chrome[data-scrolled] {
  box-shadow: var(--shadow-card);
}
.mih-timeline-sticky-chrome-date {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--dim-space-200);
  width: 100%;
  min-width: 0;
  padding-top: var(--dim-space-050);
}
.mih-timeline-month-in-flow {
  padding-top: var(--dim-space-100);
  padding-bottom: var(--dim-space-100);
}
.mih-timeline-filter-bar {
  position: relative;
  z-index: 1;
  padding-top: 0;
  padding-bottom: 0;
  margin-bottom: 0;
  box-sizing: border-box;
  width: 100%;
}
.mih-timeline-sticky-date {
  position: -webkit-sticky;
  position: sticky;
  z-index: 11;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--dim-space-200);
  padding-top: var(--dim-space-100);
  padding-bottom: var(--dim-space-200);
  margin-bottom: var(--dim-space-100);
  box-sizing: border-box;
  width: 100%;
  transition:
    box-shadow var(--motion-duration-popover, 160ms)
      var(--motion-easing-standard, cubic-bezier(0.4, 0, 0.2, 1));
}
.mih-timeline-sticky-date[data-stuck] {
  box-shadow: var(--shadow-card);
}
.mih-consent-timeline-page-scroll {
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  min-height: min(52vh, 560px);
}
@media (prefers-reduced-motion: reduce) {
  .mih-timeline-sticky-date {
    transition: none;
  }
}
`;
  let el = document.getElementById(STYLE_ID);
  if (!el) {
    el = document.createElement('style');
    el.id = STYLE_ID;
    document.head.appendChild(el);
  }
  if (el.textContent !== css) el.textContent = css;
}

/* Scrollport สำหรับ grouped timeline — overflow-x ต้องเป็น hidden ไม่ใช่ clip
   (clip ทำให้ position:sticky ไม่ทำงานในบาง browser) */
if (typeof document !== 'undefined') {
  const SCROLL_STYLE_ID = 'mih-grouped-timeline-scroll-style';
  const scrollCss = `
.mih-grouped-timeline-scroll {
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
}
`;
  let scrollEl = document.getElementById(SCROLL_STYLE_ID);
  if (!scrollEl) {
    scrollEl = document.createElement('style');
    scrollEl.id = SCROLL_STYLE_ID;
    document.head.appendChild(scrollEl);
  }
  if (scrollEl.textContent !== scrollCss) scrollEl.textContent = scrollCss;
}

export default null;
