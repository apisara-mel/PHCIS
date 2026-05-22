import React from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Header, { SubHeader } from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import TabUnderline from '@/components/tab/TabUnderline';
import SummaryCardsBar from '@/components/layout/SummaryCardsBar';
import { ClinicFilterProvider } from '@/components/layout/HeaderClinicContext';

/* MIH QueuePageShell — shared chrome for queue / list pages.
   Composes the four chrome layers used across OPD / MR / Treatment / etc:

     1. Sidebar  +  Header (Topbar with breadcrumb)
     2. SubHeader: optional back button · title · optional action group
     3. SummaryCardsBar: optional row of status summary tiles
     4. Sticky TabUnderline: optional tab strip pinned under the Topbar

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
     tabs             — when set, renders the sticky <TabUnderline />
     activeTab        — controlled tab value
     onTabChange      — fired when the user changes tabs
     stickyTopOffset  — px offset under the Topbar (default 64 = h-16)
     children         — page body (typically the white content card) */

const QueuePageShell = ({
  activeKey,
  breadcrumb,
  title,
  onBack,
  backLabel,
  actions,
  summaryCards,
  summaryTitle,
  summaryFlushUnderSubHeader,
  tabs,
  activeTab,
  onTabChange,
  stickyTopOffset = 64,
  children,
}) => {
  const hasSubHeader = !!(title || onBack || actions);
  const summaryFlush = summaryFlushUnderSubHeader ?? hasSubHeader;

  return (
  <ClinicFilterProvider>
  <div
    className='flex w-full min-h-screen'
    style={{ background: 'var(--background-screen-brand-100, #F4FBF8)' }}
  >
    <Sidebar activeKey={activeKey} />
    <div className='flex-1 min-w-0 flex flex-col'>
      <Header breadcrumb={breadcrumb} />
      <main className='flex-1 min-w-0 flex flex-col'>
        {(title || onBack || actions) ? (
          <SubHeader
            title={title}
            onBack={onBack}
            backLabel={backLabel}
            flushSummaryCardsBelow={!!summaryCards}
          >
            {actions}
          </SubHeader>
        ) : null}

        {summaryCards ? (
          <SummaryCardsBar
            cards={summaryCards}
            title={summaryTitle}
            flushUnderSubHeader={summaryFlush}
          />
        ) : null}

        {tabs ? (
          <div
            className='w-full sticky'
            style={{
              top: `${stickyTopOffset}px`,
              zIndex: 1100,
              background: 'var(--surface-card-100)',
              paddingTop: 'var(--dim-space-200)',
              paddingLeft: 'var(--dim-space-400)',
              paddingRight: 'var(--dim-space-400)',
              borderTop: 0,
              borderBottom: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
              boxShadow: 'none',
            }}
          >
            <TabUnderline
              tabs={tabs}
              value={activeTab}
              onChange={onTabChange}
              style={{ gap: 'var(--dim-space-0)' }}
            />
          </div>
        ) : null}

        {children}

        <Footer />
      </main>
    </div>
  </div>
  </ClinicFilterProvider>
  );
};

export default QueuePageShell;
