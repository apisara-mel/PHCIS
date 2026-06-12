import React from 'react';
import { useHistory } from 'react-router-dom';
import Header from '@/components/layout/Header';
import { ClinicFilterProvider } from '@/components/layout/HeaderClinicContext';
import ScheduleFooter from '@/pages/schedule/ScheduleFooter';
import { SYSTEM_CATALOG_ROWS } from '@/data/systemCatalog';
import HubSidebar from './HubSidebar';
import HubCard from './HubCard';
import DoctorProfileAvatar from '@/components/layout/DoctorProfileAvatar';

/* MIH PHCIS · System Selection Hub
   Figma: PHCIS-Signin · node 21:1875.
   Landing page before entering any PHCIS subsystem — slim sidebar, gradient
   screen, greeting header with hero illustration, 3-column hub card grid, legal
   footer. Cards are fully clickable (no separate CTA button). */

const CURRENT_USER = {
  displayName: 'พญ.สมหญิง รักษ์ดี',
  displayNameEn: 'Somying Rakdee',
  /* Figma 43:11139 user-info banner chips */
  meta: [
    { label: 'Group Policy', value: 'แพทย์' },
    { label: 'สาขาย่อย', value: 'ทันตแพทย์' },
    { label: 'แผนก', value: 'ทันตกรรม' },
  ],
};

const THAI_DAYS = ['วันอาทิตย์', 'วันจันทร์', 'วันอังคาร', 'วันพุธ', 'วันพฤหัสบดี', 'วันศุกร์', 'วันเสาร์'];
const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

const formatHubGreeting = (date = new Date()) => {
  const day = THAI_DAYS[date.getDay()];
  const d = date.getDate();
  const month = THAI_MONTHS[date.getMonth()];
  const year = date.getFullYear() + 543;
  return `สวัสดี, ${day}ที่ ${d} ${month} ${year}`;
};

const SystemHubPage = () => {
  const history = useHistory();
  const greeting = formatHubGreeting();

  return (
    <ClinicFilterProvider>
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'stretch',
        fontFamily: 'var(--type-family-body)',
        boxSizing: 'border-box',
        background: 'var(--background-screen-brand-100, var(--brand-p50, #F4FBF8))',
      }}
    >
      <HubSidebar />

      <div
        style={{
          flex: '1 1 auto',
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          background: 'var(--background-screen-brand-100, var(--brand-p50, #F4FBF8))',
        }}
      >
        {/* Header+Sub header — Figma PHCIS | Consent 72:8062 · Brand Drop Shadow Bottom/200. */}
        <section
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 0,
            width: '100%',
            flexShrink: 0,
            position: 'relative',
            zIndex: 1,
            boxShadow: 'var(--shadow-brand-drop-bottom-200)',
            background: 'var(--surface-navigation-default, #FFFFFF)',
          }}
        >
          <Header variant='hub' standalone={false} flushShadow='brand-100' />

          {/* Text+Profile+Subtext — white backing card (Figma 43:11576). */}
          <header
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--dim-space-400, 16px)',
              width: '100%',
              boxSizing: 'border-box',
              padding: 'var(--dim-space-600, 24px)',
              background: 'var(--surface-card-100, #FFFFFF)',
            }}
          >
            <h1
              style={{
                margin: 0,
                fontFamily: 'var(--type-family-heading-graphic2, var(--type-family-body))',
                fontSize: 'var(--type-size-lg, 18px)',
                fontWeight: 'var(--type-weight-regular, 400)',
                lineHeight: 1.5,
                color: 'var(--text-content-default, #363B3F)',
              }}
            >
              {greeting}
            </h1>

            {/* User-info banner ("profile cover") — gradient follows the active
               brand theme; the Default theme keeps the original teal/green.
               (See .mih-hub-profile-cover in src/index.css.) */}
            <div
              className='mih-hub-profile-cover'
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--dim-space-600, 24px)',
                padding: 'var(--dim-space-400, 16px)',
                borderRadius: 'var(--dim-radius-500, 16px)',
              }}
            >
              <div
                style={{
                  flexShrink: 0,
                  borderRadius: 'var(--dim-radius-full, 9999px)',
                  border: 'var(--dim-stroke-400, 4px) solid var(--border-image-default, #FFFFFF)',
                  boxShadow: 'var(--shadow-formbuilder)',
                  lineHeight: 0,
                }}
              >
                <DoctorProfileAvatar size={64} alt={CURRENT_USER.displayName} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
                <span style={{ color: 'var(--text-content-on-content, #FFFFFF)', fontFamily: 'var(--type-family-heading-graphic2, var(--type-family-body))', fontSize: 'var(--type-size-base, 16px)', lineHeight: 1.5 }}>
                  {CURRENT_USER.displayName}
                </span>
                <span style={{ color: 'var(--text-content-on-content, #FFFFFF)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm, 14px)', lineHeight: 1.5, opacity: 0.85 }}>
                  {CURRENT_USER.displayNameEn}
                </span>
              </div>

              <div aria-hidden style={{ width: 'var(--dim-stroke-100, 1px)', alignSelf: 'stretch', background: 'var(--border-table-line, #F4FBF8)', opacity: 0.5, margin: 'var(--dim-space-200, 8px) 0' }} />

              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--dim-space-600, 24px)', flexWrap: 'wrap', flex: '1 1 0', minWidth: 0 }}>
                {CURRENT_USER.meta.map((m) => (
                  <div key={m.label} style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ color: 'var(--text-content-on-content, #FFFFFF)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs, 12px)', lineHeight: 1.5, opacity: 0.8 }}>
                      {m.label}
                    </span>
                    <span style={{ color: 'var(--text-content-on-content, #FFFFFF)', fontFamily: 'var(--type-family-heading-graphic2, var(--type-family-body))', fontSize: 'var(--type-size-sm, 14px)', fontWeight: 'var(--type-weight-medium, 500)', lineHeight: 1.25 }}>
                      {m.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </header>
        </section>

        <div
          style={{
            flex: '1 1 auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--dim-space-600, 24px)',
            paddingTop: 'var(--dim-space-600, 24px)',
            minHeight: 0,
          }}
        >
          {/* Card grid — intro text (Figma 72:8287) + 3×3 rows (Figma 7:773). */}
          <main
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--dim-space-600, 24px)',
              padding: '0 var(--dim-space-600, 24px) var(--dim-space-600, 24px)',
            }}
          >
            <p
              style={{
                margin: 0,
                fontFamily: 'var(--type-family-heading-graphic2, var(--type-family-body))',
                fontSize: 'var(--type-size-lg, 18px)',
                fontWeight: 'var(--type-weight-regular, 400)',
                lineHeight: 1.5,
                color: 'var(--text-brandPrimary-secondary, var(--brand-p600, #08A768))',
              }}
            >
              กรุณาเลือกระบบที่คุณต้องการปฏิบัติงานจากรายการด้านล่าง
            </p>

            {SYSTEM_CATALOG_ROWS.map((row) => (
              <div
                key={row.map((s) => s.key).join('-')}
                style={{
                  display: 'flex',
                  gap: 'var(--dim-space-600, 24px)',
                  alignItems: 'stretch',
                  width: '100%',
                }}
              >
                {row.map((system) => (
                  <HubCard
                    key={system.key}
                    illustration={system.illustration}
                    title={system.title}
                    description={system.desc}
                    lastUsed={system.lastUsed}
                    onClick={system.route ? () => history.push(system.route) : undefined}
                  />
                ))}
              </div>
            ))}
          </main>
        </div>

        <ScheduleFooter />
      </div>
    </div>
    </ClinicFilterProvider>
  );
};

export default SystemHubPage;
