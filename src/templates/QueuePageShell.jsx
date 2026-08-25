import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from '@/components/layout/Sidebar';
import Header, { SubHeader } from '@/components/layout/Header';
import { isOpdScreeningMenuPath } from '@/data/opdScreeningMenuPaths';
import Footer from '@/components/layout/Footer';
import TabUnderline from '@/components/tab/TabUnderline';
import { morphTabStripPaddingStyle } from '@/components/layout/headerMorphStyles';
import TabPill, { TabBar } from '@/components/tab/TabPill';
import SummaryCardsBar from '@/components/layout/SummaryCardsBar';
import PageHeaderInfoPanel from '@/components/layout/PageHeaderInfoPanel';
import { useHeaderAutoHide } from '@/context/HeaderAutoHideContext';
import { APP_TOPBAR_HEIGHT, MIH_TOPBAR_OFFSET } from '@/hooks/useHeaderAutoHide';
import { useHeaderMorphValue } from '@/hooks/useGlobalHeaderMorph';
import { MIH_CHROME_MORPH_STEP_BAND } from '@/components/layout/wizardChromeMorphStyles';

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
     headerInfoDense   — tighter collapsed padding on PageHeaderInfoPanel (consent wizard)
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
export const QUEUE_TOPBAR_HEIGHT = APP_TOPBAR_HEIGHT;
/** Fallback SubHeader height before measure (padding 16×2 + md control ~40). */
export const QUEUE_SUBHEADER_FALLBACK = 72;
/** Approx tab strip height (padding + TabUnderline / TabPill). */
export const QUEUE_TAB_STRIP_HEIGHT = 49;
/** Approx belowSummary strip (padding + TabUnderline SubNav). */
export const QUEUE_BELOW_SUMMARY_FALLBACK = 49;
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

const QueuePageShell = ({
  activeKey,
  /* Override the sidebar nav for a separate top-level system (e.g. Consent
     Management). Defaults to the PHCIS nav inside <Sidebar>. */
  sidebarItems,
  sidebarFallbackKey,
  /** Wider open rail for long nav labels (Consent uses 400px). */
  sidebarOpenWidth,
  /** Wrap sidemenu labels onto multiple lines. */
  sidebarWrapLabels,
  /** ซ่อน Sidebar ทั้งแถบ — ระบบจัดการความยินยอมไม่ใช้ side menu แล้ว
      (มติผู้ใช้ 25 ส.ค. 69) เนื้อหากินเต็มความกว้างแทน */
  hideSidebar = false,
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
  headerInfoDense = false,
  belowSummary,
  tabs,
  tabVariant = 'underline',
  activeTab,
  onTabChange,
  stickyTopOffset = QUEUE_TOPBAR_HEIGHT,
  children,
}) => {
  const { pathname } = useLocation();
  /* เมนู คัดกรองและซักประวัติ — บางหน้าใช้ summaryTitle แทน title แต่ยังต้องมี SubHeader + ปุ่มสร้างคำขอ */
  const effectiveTitle =
    title
    || (isOpdScreeningMenuPath(pathname) && summaryTitle ? summaryTitle : null);
  const hasSubHeader = !!(effectiveTitle || onBack || actions);
  /** summaryTitle ถูกยกไป SubHeader แล้ว — ไม่แสดง h1 ซ้ำบน SummaryCardsBar */
  const summaryBarTitle =
    !title && summaryTitle && effectiveTitle === summaryTitle ? undefined : summaryTitle;
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
  const belowSummaryRef = useRef(null);
  const tabsRef = useRef(null);
  const [subHeaderH, setSubHeaderH] = useState(
    hasSubHeader ? QUEUE_SUBHEADER_FALLBACK : 0,
  );
  const [belowSummaryH, setBelowSummaryH] = useState(
    hasBelowSummary ? QUEUE_BELOW_SUMMARY_FALLBACK : 0,
  );
  const [tabsH, setTabsH] = useState(hasTabs ? QUEUE_TAB_STRIP_HEIGHT : 0);
  const { topbarOffset } = useHeaderAutoHide() ?? { topbarOffset: stickyTopOffset };

  /* Pill status tabs: large at rest → small once scroll-morph engages.
     Hysteresis avoids flicker around the threshold. */
  const headerMorph = useHeaderMorphValue();
  const [pillCompact, setPillCompact] = useState(false);
  useEffect(() => {
    if (tabVariant !== 'pill') return undefined;
    setPillCompact((prev) => {
      if (headerMorph > 0.38) return true;
      if (headerMorph < 0.12) return false;
      return prev;
    });
    return undefined;
  }, [headerMorph, tabVariant]);
  const pillSize = tabVariant === 'pill' && pillCompact ? 'small' : 'large';

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
  }, [hasSubHeader, effectiveTitle, actions, onBack]);

  useLayoutEffect(() => {
    if (!hasBelowSummary) {
      setBelowSummaryH(0);
      return undefined;
    }
    const el = belowSummaryRef.current;
    if (!el) return undefined;
    const measure = () => setBelowSummaryH(Math.round(el.getBoundingClientRect().height));
    measure();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    return () => ro?.disconnect();
  }, [hasBelowSummary, belowSummary]);

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
  }, [hasTabs, tabVariant, activeTab, tabs, pillSize]);

  const tableStickyTop = topbarOffset + subHeaderH + belowSummaryH + tabsH;

  /* Publish live offset so page-sticky Table headers track Topbar auto-hide. */
  useLayoutEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const root = document.documentElement;
    root.style.setProperty(STICKY_UNDER_TABS_VAR, `${tableStickyTop}px`);
    return () => {
      root.style.removeProperty(STICKY_UNDER_TABS_VAR);
    };
  }, [tableStickyTop]);

  const consentSidebar = sidebarFallbackKey?.startsWith('consent-');
  const resolvedSidebarOpenWidth =
    sidebarOpenWidth
    ?? (consentSidebar
      ? 'calc(var(--dim-size-2500, 320px) + var(--dim-size-1700, 80px))'
      : undefined);
  const resolvedSidebarWrapLabels = sidebarWrapLabels ?? false;

  return (
  <div
    className='flex w-full min-h-screen'
    style={{ background: 'var(--background-screen-brand-100, #F4FBF8)' }}
  >
    {hideSidebar ? null : (
      <Sidebar
        activeKey={activeKey}
        items={sidebarItems}
        fallbackKey={sidebarFallbackKey}
        openWidth={resolvedSidebarOpenWidth}
        wrapLabels={resolvedSidebarWrapLabels}
      />
    )}
    <div className='flex-1 min-w-0 flex flex-col'>
      <Header
        breadcrumb={breadcrumb}
        brandTitle={brandTitle}
        standalone={!hasSubHeader}
      />
      <main className='flex-1 min-w-0 flex flex-col'>
        {(effectiveTitle || onBack || actions) ? (
          <div
            ref={subHeaderRef}
            className='w-full sticky'
            style={{
              top: MIH_TOPBAR_OFFSET,
              zIndex: 1101,
              background: 'var(--surface-navigation-default)',
            }}
          >
            <SubHeader
              title={effectiveTitle}
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
              className={`w-full sticky ${headerInfoDense ? MIH_CHROME_MORPH_STEP_BAND : ''}`.trim()}
              style={{
                top: hasSubHeader
                  ? `calc(${MIH_TOPBAR_OFFSET} + ${subHeaderH}px)`
                  : MIH_TOPBAR_OFFSET,
                zIndex: 1101,
                background: 'var(--surface-card-100)',
              }}
            >
              <PageHeaderInfoPanel dense={headerInfoDense}>{headerInfo}</PageHeaderInfoPanel>
            </div>
          ) : (
            <PageHeaderInfoPanel dense={headerInfoDense}>{headerInfo}</PageHeaderInfoPanel>
          )
        ) : null}

        {summaryCards ? (
          <SummaryCardsBar
            cards={summaryCards}
            title={summaryBarTitle}
            flushUnderSubHeader={summaryFlush}
            bottomShadow={summaryBottomShadow}
          />
        ) : null}

        {belowSummary ? (
          <div
            ref={belowSummaryRef}
            data-mih-sticky-subnav=''
            className='w-full sticky'
            style={{
              top: `calc(${MIH_TOPBAR_OFFSET} + ${subHeaderH}px)`,
              zIndex: 1101,
              background: 'var(--surface-card-100, #FFFFFF)',
              paddingBottom: 'var(--dim-space-0)',
              paddingLeft: 'var(--dim-space-400)',
              paddingRight: 'var(--dim-space-400)',
              borderTop: 0,
              borderBottom: belowSummaryBottomShadow
                ? 'none'
                : 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
              boxShadow: belowSummaryBottomShadow ? headerDropShadow : 'none',
              ...morphTabStripPaddingStyle,
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
              top: hasBelowSummary
                ? `calc(${MIH_TOPBAR_OFFSET} + ${subHeaderH}px + ${belowSummaryH}px)`
                : `calc(${MIH_TOPBAR_OFFSET} + ${subHeaderH}px)`,
              zIndex: 1100,
              background: 'var(--surface-card-100)',
              paddingBottom: tabVariant === 'pill'
                ? (pillCompact ? 'var(--dim-space-150)' : 'var(--dim-space-200)')
                : undefined,
              paddingLeft: 'var(--dim-space-400)',
              paddingRight: 'var(--dim-space-400)',
              borderTop: 0,
              borderBottom: tabsBottomShadow
                ? 'none'
                : 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
              boxShadow: tabsBottomShadow ? headerDropShadow : 'none',
              ...morphTabStripPaddingStyle,
            }}
          >
            {tabVariant === 'pill' ? (
              <TabBar
                aria-label='กรองตามสถานะ'
                align='center'
                className='w-full max-w-full'
                style={{
                  transition: 'padding 180ms cubic-bezier(0.32, 0.72, 0, 1)',
                }}
              >
                {tabs.map((t) => (
                  <TabPill
                    key={t.key}
                    size={pillSize}
                    selected={activeTab === t.key}
                    leadingIcon={t.icon || undefined}
                    count={typeof t.count === 'number' ? t.count : undefined}
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
                morphOnScroll
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
