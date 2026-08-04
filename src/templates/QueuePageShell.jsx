import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Header, { SubHeader } from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import TabUnderline from '@/components/tab/TabUnderline';
import TabPill, { TabBar } from '@/components/tab/TabPill';
import SummaryCardsBar from '@/components/layout/SummaryCardsBar';
import PageHeaderInfoPanel from '@/components/layout/PageHeaderInfoPanel';

/* MIH QueuePageShell — shared chrome for queue / list pages.
   Composes the four chrome layers used across OPD / MR / Treatment / etc:

     1. Sidebar  +  Header (Topbar with breadcrumb)
     2. SubHeader: optional back button · title · optional action group
     3. SummaryCardsBar: optional row of status summary tiles
     4. Sticky tab strip: TabUnderline (default) or TabPill capsule bar

   On scroll, SubHeader (title + actions) and tabs stick under the Topbar.
   Summary / headerInfo between them scroll away.

   Topbar auto-hide: นิ้วปัดขึ้น (scrollY เพิ่ม) → ซ่อน Header ·
   นิ้วปัดลงนิดหน่อย (scrollY ลด) → แสดง Header อีกครั้ง

   Props:
     breadcrumb       — array passed to Header
     title            — SubHeader title (omit to hide the SubHeader row)
     onBack           — when set, SubHeader renders a "← back" button
     backLabel        — back button label (default 'กลับ')
     actions          — right-side button group inside the SubHeader
     summaryCards     — when set, renders <SummaryCardsBar cards={...} />
     summaryTitle     — optional h1 above the summary cards (Figma Topic tertiary)
     summaryFlushUnderSubHeader — when false, summary band uses Figma
                            PHCIS_Header_Summary chrome (auto false if no SubHeader)
     headerInfo       — optional slot (Figma PHCIS_Header_Info) rendered in a white
                        panel flush under SubHeader — e.g. Appointment staff hero
     stickyHeaderInfo — when true, headerInfo sticks under Topbar (or SubHeader)
     belowSummary     — optional slot rendered directly under the summary cards
                        (or under SubHeader when there are no summary cards),
                        above the sticky tab strip — e.g. a cross-module nav row
     tabs             — when set, renders the sticky tab strip
                        Array<{ key, label, icon? }>
     tabVariant       — 'underline' (default, page-level) | 'pill' (capsule TabBar)
     activeTab        — controlled tab value
     onTabChange      — fired when the user changes tabs
     stickyTopOffset  — px offset under the Topbar when visible (default 64 = h-16)
     children         — page body (typically the white content card) */

/** Topbar height (Header h-16) — used by table stickyHeaderTop callers. */
export const QUEUE_TOPBAR_HEIGHT = 64;
/** Fallback SubHeader height before measure (padding 16×2 + md control ~40). */
export const QUEUE_SUBHEADER_FALLBACK = 72;
/** Approx tab strip height (padding + TabUnderline). */
export const QUEUE_TAB_STRIP_HEIGHT = 49;
/** Fallback px when CSS var ยังไม่ถูกตั้ง (Topbar + SubHeader + tabs). */
export const QUEUE_STICKY_UNDER_TABS_FALLBACK =
  QUEUE_TOPBAR_HEIGHT + QUEUE_SUBHEADER_FALLBACK + QUEUE_TAB_STRIP_HEIGHT;
/**
 * Live sticky offset for page-sticky table headers — QueuePageShell updates
 * `--mih-queue-sticky-under-tabs` when Topbar auto-hides / SubHeader·tabs resize.
 * Pass this to `<Table stickyHeaderTop={QUEUE_STICKY_UNDER_TABS} />`.
 */
export const QUEUE_STICKY_UNDER_TABS =
  `var(--mih-queue-sticky-under-tabs, ${QUEUE_STICKY_UNDER_TABS_FALLBACK}px)`;

const STICKY_UNDER_TABS_VAR = '--mih-queue-sticky-under-tabs';

/** ต้องเลื่อนเกินกี่ px ถึงสลับโหมดซ่อน/แสดง Header */
const HEADER_HIDE_DELTA = 12;
/** ใกล้ยอดหน้า — บังคับแสดง Header เสมอ */
const HEADER_SHOW_NEAR_TOP = 24;

const QueuePageShell = ({
  activeKey,
  /* Override the sidebar nav for a separate top-level system (e.g. Consent
     Management). Defaults to the PHCIS nav inside <Sidebar>. */
  sidebarItems,
  sidebarFallbackKey,
  breadcrumb,
  brandTitle,
  title,
  onBack,
  backLabel,
  actions,
  summaryCards,
  summaryTitle,
  summaryFlushUnderSubHeader,
  headerInfo,
  stickyHeaderInfo = false,
  belowSummary,
  tabs,
  tabVariant = 'underline',
  activeTab,
  onTabChange,
  stickyTopOffset = QUEUE_TOPBAR_HEIGHT,
  children,
}) => {
  const hasSubHeader = !!(title || onBack || actions);
  const hasHeaderInfo = !!headerInfo;
  const hasBelowSummary = !!belowSummary;
  const hasTabs = !!tabs;
  const summaryFlush = summaryFlushUnderSubHeader ?? hasSubHeader;
  const subHeaderFlushBelow = !!(summaryCards) || hasHeaderInfo;
  /* design.md §6.19 · Brand Drop Shadow Bottom/100 → --shadow-header */
  const headerDropShadow = 'var(--shadow-header)';
  const summaryBottomShadow = !!(summaryCards) && summaryFlush && !hasBelowSummary && !hasTabs;
  const belowSummaryBottomShadow = hasBelowSummary && !hasTabs;
  const tabsBottomShadow = hasTabs;

  const subHeaderRef = useRef(null);
  const tabsRef = useRef(null);
  const [subHeaderH, setSubHeaderH] = useState(
    hasSubHeader ? QUEUE_SUBHEADER_FALLBACK : 0,
  );
  const [tabsH, setTabsH] = useState(hasTabs ? QUEUE_TAB_STRIP_HEIGHT : 0);
  const [headerHidden, setHeaderHidden] = useState(false);
  const lastScrollY = useRef(0);

  useLayoutEffect(() => {
    if (!hasSubHeader) {
      setSubHeaderH(0);
      return undefined;
    }
    const el = subHeaderRef.current;
    if (!el) return undefined;
    const measure = () => setSubHeaderH(Math.round(el.getBoundingClientRect().height));
    measure();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    return () => ro?.disconnect();
  }, [hasSubHeader, title, actions, onBack]);

  useLayoutEffect(() => {
    if (!hasTabs) {
      setTabsH(0);
      return undefined;
    }
    const el = tabsRef.current;
    if (!el) return undefined;
    const measure = () => setTabsH(Math.round(el.getBoundingClientRect().height));
    measure();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    return () => ro?.disconnect();
  }, [hasTabs, tabVariant, activeTab, tabs]);

  useEffect(() => {
    lastScrollY.current = typeof window !== 'undefined' ? window.scrollY : 0;
    const onScroll = () => {
      const y = window.scrollY;
      const prev = lastScrollY.current;
      const delta = y - prev;
      lastScrollY.current = y;

      if (y <= HEADER_SHOW_NEAR_TOP) {
        setHeaderHidden(false);
        return;
      }
      /* นิ้วปัดขึ้น → เนื้อหาเลื่อนขึ้น (scrollY เพิ่ม) → ซ่อน Header
         นิ้วปัดลงนิดหน่อย → scrollY ลด → แสดง Header */
      if (delta > HEADER_HIDE_DELTA) setHeaderHidden(true);
      else if (delta < -HEADER_HIDE_DELTA) setHeaderHidden(false);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const chromeTop = headerHidden ? 0 : stickyTopOffset;
  const tabsStickyTop = chromeTop + subHeaderH;
  const headerInfoStickyTop = chromeTop + subHeaderH;
  const tableStickyTop = tabsStickyTop + tabsH;

  /* Publish live offset so page-sticky Table headers track Topbar auto-hide. */
  useLayoutEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const root = document.documentElement;
    root.style.setProperty(STICKY_UNDER_TABS_VAR, `${tableStickyTop}px`);
    return () => {
      root.style.removeProperty(STICKY_UNDER_TABS_VAR);
    };
  }, [tableStickyTop]);

  return (
  <div
    className='flex w-full min-h-screen'
    style={{ background: 'var(--background-screen-brand-100, #F4FBF8)' }}
  >
    <Sidebar activeKey={activeKey} items={sidebarItems} fallbackKey={sidebarFallbackKey} />
    <div className='flex-1 min-w-0 flex flex-col'>
      <Header
        breadcrumb={breadcrumb}
        brandTitle={brandTitle}
        standalone={!hasSubHeader}
        collapsed={headerHidden}
      />
      <main className='flex-1 min-w-0 flex flex-col'>
        {(title || onBack || actions) ? (
          <div
            ref={subHeaderRef}
            className='w-full sticky'
            style={{
              top: `${chromeTop}px`,
              zIndex: 1101,
              background: 'var(--surface-navigation-default)',
              transition: 'top 200ms ease',
            }}
          >
            <SubHeader
              title={title}
              onBack={onBack}
              backLabel={backLabel}
              /* แถบ sticky ถัดไป (tabs / belowSummary) เป็นตัวทิ้งเงา — SubHeader ไม่ซ้อนเส้น */
              flushSummaryCardsBelow={subHeaderFlushBelow || hasTabs || hasBelowSummary}
            >
              {actions}
            </SubHeader>
          </div>
        ) : null}

        {headerInfo ? (
          stickyHeaderInfo ? (
            <div
              className='w-full sticky'
              style={{
                top: `${headerInfoStickyTop}px`,
                zIndex: 1101,
                background: 'var(--surface-card-100)',
                transition: 'top 200ms ease',
              }}
            >
              <PageHeaderInfoPanel>{headerInfo}</PageHeaderInfoPanel>
            </div>
          ) : (
            <PageHeaderInfoPanel>{headerInfo}</PageHeaderInfoPanel>
          )
        ) : null}

        {summaryCards ? (
          <SummaryCardsBar
            cards={summaryCards}
            title={summaryTitle}
            flushUnderSubHeader={summaryFlush}
            bottomShadow={summaryBottomShadow}
          />
        ) : null}

        {belowSummary ? (
          <div
            className='w-full sticky'
            style={{
              top: `${tabsStickyTop}px`,
              zIndex: 1100,
              background: 'var(--surface-card-100)',
              paddingTop: 'var(--dim-space-200)',
              paddingBottom: 'var(--dim-space-0)',
              paddingLeft: 'var(--dim-space-400)',
              paddingRight: 'var(--dim-space-400)',
              borderTop: 0,
              borderBottom: belowSummaryBottomShadow
                ? 'none'
                : 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
              boxShadow: belowSummaryBottomShadow ? headerDropShadow : 'none',
              transition: 'top 200ms ease',
            }}
          >
            {belowSummary}
          </div>
        ) : null}

        {tabs ? (
          <div
            ref={tabsRef}
            className='w-full sticky'
            style={{
              top: `${tabsStickyTop}px`,
              zIndex: 1100,
              background: 'var(--surface-card-100)',
              paddingTop: 'var(--dim-space-200)',
              paddingBottom: tabVariant === 'pill' ? 'var(--dim-space-200)' : undefined,
              paddingLeft: 'var(--dim-space-400)',
              paddingRight: 'var(--dim-space-400)',
              borderTop: 0,
              borderBottom: tabsBottomShadow
                ? 'none'
                : 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
              boxShadow: tabsBottomShadow ? headerDropShadow : 'none',
              transition: 'top 200ms ease',
            }}
          >
            {tabVariant === 'pill' ? (
              <TabBar aria-label='กรองตามสถานะ'>
                {tabs.map((t) => (
                  <TabPill
                    key={t.key}
                    size='small'
                    selected={activeTab === t.key}
                    leadingIcon={t.icon || undefined}
                    onClick={() => onTabChange?.(t.key)}
                  >
                    {t.label}
                  </TabPill>
                ))}
              </TabBar>
            ) : (
              <TabUnderline
                tabs={tabs}
                value={activeTab}
                onChange={onTabChange}
                style={{ gap: 'var(--dim-space-0)' }}
              />
            )}
          </div>
        ) : null}

        {children}

        <Footer />
      </main>
    </div>
  </div>
  );
};

export default QueuePageShell;
