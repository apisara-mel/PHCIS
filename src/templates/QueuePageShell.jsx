import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from '@/components/layout/Sidebar';
import Header, { SubHeader } from '@/components/layout/Header';
import { isOpdScreeningMenuPath } from '@/data/opdScreeningMenuPaths';
import Footer from '@/components/layout/Footer';
import TabUnderline from '@/components/tab/TabUnderline';
import { morphTabStripPaddingStyle } from '@/components/layout/headerMorphStyles';
import TabPill, { TabBar } from '@/components/tab/TabPill';
import SummaryCardsBar from '@/components/layout/SummaryCardsBar';
import UpcomingAppointmentsPanel from '@/components/queue/UpcomingAppointmentsPanel';
import {
  countUpcomingAppointments, UPCOMING_RANGES, DEFAULT_UPCOMING_RANGE,
} from '@/data/upcomingAppointments';
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
     leadingActions   — button group rendered before the consent action
     summaryCards     — when set, renders <SummaryCardsBar cards={...} />
     summaryTitle     — optional h1 above the summary cards (Figma Topic tertiary)
     summaryFlushUnderSubHeader — when false, summary band uses Figma
                            PHCIS_Header_Summary chrome (auto false if no SubHeader)
     summaryBelowTabs — renders the summary band UNDER the sticky tab strip
                        instead of above it, detached from the white header
                        chrome (transparent, page padding) so the counts read
                        as their own card group belonging to the current tab
                        and scroll away with the list
                        (needs `tabs`; ระบบสังเกตอาการ uses this)
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
     upcoming         — เปิดแท็บ "นัดล่วงหน้า" ให้หน้านี้ (มติผู้ใช้ 29 ส.ค. 69)
                        `true` = ทุกแผนก · `{ depts, emptyMessage }` = เฉพาะแผนก
                        ของจุดงานนั้น · shell เป็นคนเติมแท็บและวาดเนื้อหาแทน
                        `children` เมื่อแท็บนั้นถูกเลือก หน้าจึงเพิ่มได้ด้วย prop
                        เดียวโดยไม่ต้องแก้ tab array และ body switch ของตัวเอง
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

/** คีย์ของแท็บนัดล่วงหน้า — หน้าไหนใช้คีย์นี้เองอยู่แล้ว shell จะไม่เติมซ้ำ */
export const UPCOMING_TAB_KEY = 'upcoming';

/* เดิมซ่อนชิปศูนย์ในระบบความยินยอม/จัดการระบบ เพราะสองระบบนั้นมีชิป `ศูนย์:`
   ของตัวเองอยู่ในหน้า — ย้ายขึ้น Header ให้เหมือน PHCIS แล้ว จึงไม่มีระบบไหน
   ต้องซ่อนอีก (มติผู้ใช้ 27 ส.ค. 69) */
const CLINIC_CHIP_HIDDEN_SYSTEMS = [];

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
  /** Hide chevron on the selected side-menu item for this shell. */
  sidebarHideActiveChevron = false,
  breadcrumb,
  brandTitle,
  title,
  /** โหนดที่แสดงต่อท้าย title ใน SubHeader (เช่น ชิปตัวกรอง) */
  afterTitle,
  onBack,
  backLabel,
  actions,
  leadingActions,
  summaryCards,
  summaryTitle,
  summaryFlushUnderSubHeader,
  summaryBelowTabs = false,
  headerInfo,
  stickyHeaderInfo = false,
  headerInfoDense = false,
  belowSummary,
  tabs,
  upcoming = null,
  tabVariant = 'underline',
  activeTab,
  onTabChange,
  stickyTopOffset = QUEUE_TOPBAR_HEIGHT,
  children,
}) => {
  const { pathname } = useLocation();
  /* หน้าที่ใช้ `summaryTitle` แทน `title` จะไม่มีชื่อเรื่องใน SubHeader — เดิม
     ไม่เป็นปัญหาเพราะไม่มี SubHeader แต่พอหน้านั้นมีปุ่ม (actions /
     leadingActions) SubHeader จะโผล่ขึ้นมาโดยมีแต่ปุ่มลอยอยู่แถวบน แล้วชื่อเรื่อง
     ไปอยู่แถวล่างเหนือการ์ดสรุป ซึ่งอ่านเป็นคนละหน้ากับจออื่นในระบบ
     จึงยกชื่อขึ้น SubHeader ทุกครั้งที่มีปุ่ม — ชื่อเรื่องซ้ายและปุ่มขวาในแถวเดียวกัน
     เหมือนหน้าอื่น ๆ (มติผู้ใช้ 28 ส.ค. 69)
     เงื่อนไข `isOpdScreeningMenuPath` เดิมยังอยู่ เพราะหน้าคัดกรองต้องมีชื่อเรื่อง
     แม้ไม่ได้ส่งปุ่มมาเอง (ปุ่มคำขอเข้าถึงข้อมูลมาจาก SubHeader เอง) */
  const effectiveTitle =
    title
    || (summaryTitle && (isOpdScreeningMenuPath(pathname) || actions || leadingActions)
      ? summaryTitle
      : null);
  const hasSubHeader = !!(effectiveTitle || onBack || actions || leadingActions);
  /** summaryTitle ถูกยกไป SubHeader แล้ว — ไม่แสดง h1 ซ้ำบน SummaryCardsBar */
  const summaryBarTitle =
    !title && summaryTitle && effectiveTitle === summaryTitle ? undefined : summaryTitle;
  const hasHeaderInfo = !!headerInfo;
  const hasBelowSummary = !!belowSummary;
  /* แท็บ "นัดล่วงหน้า" — ต่อท้ายแท็บของหน้า ก่อนแท็บที่เป็น "ทะเบียนทั้งหมด"
     ไม่ได้ เพราะ shell ไม่รู้ความหมายของแต่ละแท็บ จึงต่อท้ายสุดเสมอ
     ตัวเลขบนแท็บอ้างช่วงเริ่มต้นของพาเนล (ไม่ hardcode) — กดเข้าไปแล้วต้องเจอ
     จำนวนเท่าที่แท็บบอก ถ้าสองค่านี้หลุดกันผู้ใช้จะนับว่าระบบผิด */
  const upcomingCfg = upcoming === true ? {} : (upcoming || null);
  const upcomingCount = useMemo(
    () => (upcomingCfg
      ? countUpcomingAppointments({
        days: UPCOMING_RANGES.find((r) => r.key === DEFAULT_UPCOMING_RANGE)?.days ?? 7,
        depts: upcomingCfg.depts,
      })
      : 0),
    [upcomingCfg],
  );
  const tabsWithUpcoming = useMemo(() => {
    if (!tabs || !upcomingCfg) return tabs;
    if (tabs.some((t) => t.key === UPCOMING_TAB_KEY)) return tabs;
    return [...tabs, {
      key: UPCOMING_TAB_KEY,
      label: 'นัดล่วงหน้า',
      icon: 'event_upcoming',
      count: upcomingCount,
    }];
  }, [tabs, upcomingCfg, upcomingCount]);
  const showUpcomingBody = !!upcomingCfg && activeTab === UPCOMING_TAB_KEY;

  const hasTabs = !!tabs;
  /* Summary under the tabs — only possible when there ARE tabs; otherwise
     the flag is a no-op and the band stays in its normal slot. */
  const summaryAfterTabs = !!summaryCards && hasTabs && summaryBelowTabs;
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
  useHeaderAutoHide();

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
  }, [hasSubHeader, effectiveTitle, actions, leadingActions, onBack]);

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

  /* ความสูงของ chrome ที่ค้างอยู่ใต้แถบบน — เปลี่ยนตอน resize เท่านั้น
     ไม่เปลี่ยนตอน scroll */
  const chromeStackH = subHeaderH + belowSummaryH + tabsH;

  /* Publish live offset so page-sticky Table headers track Topbar auto-hide.
     เขียนเป็น `calc()` ที่อ้าง `--mih-topbar-offset` โดยตรง — เดิมบวกตัวเลข
     `topbarOffset` จาก state แล้วเขียนทับทุกเฟรม หัวตารางจึงตามหลังแถบบนอยู่
     หนึ่งเฟรมและเห็นแถวลอดออกมาเป็นช่องว่าง ตอนนี้ทั้งสองอ่านค่าเดียวกัน
     เฟรมเดียวกัน (28 ส.ค. 69) */
  useLayoutEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const root = document.documentElement;
    root.style.setProperty(
      STICKY_UNDER_TABS_VAR,
      `calc(${MIH_TOPBAR_OFFSET} + ${chromeStackH}px)`,
    );
    return () => {
      root.style.removeProperty(STICKY_UNDER_TABS_VAR);
    };
  }, [chromeStackH]);

  const consentSidebar = sidebarFallbackKey?.startsWith('consent-');
  const resolvedSidebarOpenWidth =
    sidebarOpenWidth
    ?? (consentSidebar
      ? 'calc(var(--dim-size-2500, 320px) + var(--dim-size-1700, 80px))'
      : undefined);
  const resolvedSidebarWrapLabels = sidebarWrapLabels ?? false;

  /* The summary band itself — rendered either in its normal slot (above the
     sticky tab strip) or, with `summaryBelowTabs`, directly under the tabs
     where it scrolls away beneath them. */
  const summaryBand = summaryCards ? (
    <SummaryCardsBar
      cards={summaryCards}
      title={summaryBarTitle}
      flushUnderSubHeader={summaryAfterTabs ? true : summaryFlush}
      bottomShadow={summaryAfterTabs ? false : summaryBottomShadow}
      /* ใต้แท็บ = หลุดจาก chrome สีขาว ยืนเป็นกลุ่มการ์ดของตัวเองบนพื้นหลังหน้า */
      detached={summaryAfterTabs}
    />
  ) : null;

  return (
  <div
    className='flex w-full min-h-screen'
    style={{ background: 'var(--background-screen-brand-100, #F4FBF8)' }}
  >
    <Sidebar
      activeKey={activeKey}
      items={sidebarItems}
      fallbackKey={sidebarFallbackKey}
      openWidth={resolvedSidebarOpenWidth}
      wrapLabels={resolvedSidebarWrapLabels}
      hideActiveChevron={sidebarHideActiveChevron}
    />
    <div className='flex-1 min-w-0 flex flex-col'>
      <Header
        breadcrumb={breadcrumb}
        brandTitle={brandTitle}
        standalone={!hasSubHeader}
        /* ระบบจัดการระบบ + ระบบจัดการความยินยอม ไม่มีชิปเลือกศูนย์บนแถบบน —
           สองระบบนี้เลือกศูนย์จากตัวกรองในหน้า (แดชบอร์ดมีช่อง "ศูนย์:" ของ
           ตัวเอง) มีชิปบนแถบบนด้วยจะกลายเป็นสองที่ที่ขัดกันได้
           (26 ส.ค. 2569 มติผู้ใช้) */
        showClinicFilter={!CLINIC_CHIP_HIDDEN_SYSTEMS.includes(brandTitle)}
      />
      <main className='flex-1 min-w-0 flex flex-col'>
        {(effectiveTitle || onBack || actions || leadingActions) ? (
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
              afterTitle={afterTitle}
              onBack={onBack}
              backLabel={backLabel}
              /* แถบ sticky ถัดไป (tabs / belowSummary) เป็นตัวทิ้งเงา — SubHeader ไม่ซ้อนเส้น */
              flushSummaryCardsBelow={subHeaderFlushBelow || hasTabs || hasBelowSummary}
              leadingActions={leadingActions}
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

        {summaryCards && !summaryAfterTabs ? summaryBand : null}

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
                {tabsWithUpcoming.map((t) => (
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
                /* ต้องเป็น `tabsWithUpcoming` ไม่ใช่ `tabs` — สาขา pill ใช้ถูกอยู่แล้ว
                   แต่สาขานี้ตกหล่น แท็บ "นัดล่วงหน้า" จึงไม่เคยขึ้นในหน้าที่ใช้แท็บ
                   แบบขีดเส้นใต้ ซึ่งคือ worklist เกือบทั้งหมด (29 ส.ค. 69) */
                tabs={tabsWithUpcoming}
                value={activeTab}
                onChange={onTabChange}
                morphOnScroll
                style={{ gap: 'var(--dim-space-0)' }}
              />
            )}
          </div>
        ) : null}

        {summaryAfterTabs ? summaryBand : null}

        {/* แท็บนัดล่วงหน้าแทน `children` ทั้งก้อน — ตัวกรอง/ตารางของหน้านั้น
            ผูกกับคิวของวัน ใช้กับนัดล่วงหน้าไม่ได้ และแท็บนี้มีตัวกรองช่วงเวลา
            ของตัวเองอยู่แล้ว */}
        {showUpcomingBody ? (
          <div
            className='flex flex-col flex-1 min-w-0'
            style={{ padding: 'var(--dim-space-600)', gap: 'var(--dim-space-600)' }}
          >
            <div
              className='w-full flex flex-col'
              style={{
                background: 'var(--surface-card-100)',
                borderRadius: 'var(--dim-radius-500)',
                boxShadow: 'var(--shadow-card-strong)',
                padding: 'var(--dim-space-600)',
                gap: 'var(--dim-space-600)',
              }}
            >
              <UpcomingAppointmentsPanel
                depts={upcomingCfg.depts}
                emptyMessage={upcomingCfg.emptyMessage}
              />
            </div>
          </div>
        ) : children}

        <Footer />
      </main>
    </div>
  </div>
  );
};

export default QueuePageShell;
