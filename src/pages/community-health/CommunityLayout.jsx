import React from 'react';
import Header from '@/components/layout/Header';
import { ClinicFilterProvider } from '@/components/layout/HeaderClinicContext';
import CommunitySidebar from './CommunitySidebar';

/* MIH · ระบบงานสาธารณสุขและระบบงานควบคุมป้องกันและส่งเสริมสุขภาพในชุมชน
   (Community) — TOP-LEVEL system, sibling of PHCIS (SYSTEM_CATALOG key
   'community-health'). Owns its shell exactly like Schedule Management:
   no <PhcisChrome>, own <CommunitySidebar> + the shared PHCIS <Header>.

   Ported from claude/Community's static prototype ("Community System" ·
   prog__title + breadcrumb in every community/*.html <header class="header">).
   Every converted page composes this Layout around its own content. */

const CommunityLayout = ({ activeKey, breadcrumb, headerActions, children }) => (
  <ClinicFilterProvider>
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        background: 'var(--background-screen-brand-100, var(--brand-p50, #F4FBF8))',
        fontFamily: 'var(--type-family-body)',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'stretch',
        boxSizing: 'border-box',
      }}
    >
      <CommunitySidebar activeKey={activeKey} />

      <div
        style={{
          flex: '1 1 auto',
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
        }}
      >
        <Header brandTitle='Community System' breadcrumb={breadcrumb} standalone={false} />

        <main
          style={{
            flex: '1 1 auto',
            minWidth: 0,
            padding: 'var(--dim-space-600, 24px)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--dim-space-600, 24px)',
          }}
        >
          {headerActions}
          {children}
        </main>
      </div>
    </div>
  </ClinicFilterProvider>
);

export default CommunityLayout;
