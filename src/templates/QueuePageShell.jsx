import React from 'react';
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

   The page body is rendered as `children` on the brand page background,
   so pages just declare their data and the body card.

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
     belowSummary     — optional slot rendered directly under the summary cards
                        (or under SubHeader when there are no summary cards),
                        above the sticky tab strip — e.g. a cross-module nav row
     tabs             — when set, renders the sticky tab strip
                        Array<{ key, label, icon? }>
     tabVariant       — 'underline' (default, page-level) | 'pill' (capsule TabBar)
     activeTab        — controlled tab value
     onTabChange      — fired when the user changes tabs
     stickyTopOffset  — px offset under the Topbar (default 64 = h-16)
     children         — page body (typically the white content card) */

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
  belowSummary,
  tabs,
  tabVariant = 'underline',
  activeTab,
  onTabChange,
  stickyTopOffset = 64,
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

  return (
  <div
    className='flex w-full min-h-screen'
    style={{ background: 'var(--background-screen-brand-100, #F4FBF8)' }}
  >
    <Sidebar activeKey={activeKey} items={sidebarItems} fallbackKey={sidebarFallbackKey} />
    <div className='flex-1 min-w-0 flex flex-col'>
      <Header breadcrumb={breadcrumb} brandTitle={brandTitle} standalone={!hasSubHeader} />
      <main className='flex-1 min-w-0 flex flex-col'>
        {(title || onBack || actions) ? (
          <SubHeader
            title={title}
            onBack={onBack}
            backLabel={backLabel}
            flushSummaryCardsBelow={subHeaderFlushBelow}
          >
            {actions}
          </SubHeader>
        ) : null}

        {headerInfo ? (
          <PageHeaderInfoPanel>{headerInfo}</PageHeaderInfoPanel>
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
              top: `${stickyTopOffset}px`,
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
            }}
          >
            {belowSummary}
          </div>
        ) : null}

        {tabs ? (
          <div
            className='w-full sticky'
            style={{
              top: `${stickyTopOffset}px`,
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
