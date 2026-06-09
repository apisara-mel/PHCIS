import React from 'react';
import { useHistory } from 'react-router-dom';
import Icon from '@/components/icons/Icon';
import ScheduleFooter from '@/pages/schedule/ScheduleFooter';
import HubSidebar from './HubSidebar';

/* MIH PHCIS · System Selection Hub
   Figma: PHCIS-Signin · node 21:1875.
   Landing page before entering any PHCIS subsystem — slim sidebar, gradient
   screen, greeting header with hero illustration, 3-column hub card grid, legal
   footer. Cards are fully clickable (no separate CTA button). */

const HUB_HERO = '/illustration/hub/hub-hero.png';

const CURRENT_USER = {
  displayName: 'พญ.สมหญิง รักษ์ดี',
  avatarSrc: '/images/staff/doctors/doctor-portrait-01.png',
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

/* Catalog order = Figma left→right, top→bottom (8 cards, 3+3+2 grid). */
const SYSTEMS = [
  {
    key: 'phcis',
    icon: 'local_hospital',
    title: 'ระบบ PHCIS',
    desc: 'ระบบสารสนเทศศูนย์บริการสาธารณสุข สำหรับบริหารจัดการข้อมูลผู้ป่วย การรักษา และการบริการระดับปฐมภูมิอย่างครบวงจร',
    lastUsed: 'วันนี้, 08:30 น.',
    route: '/dashboard',
  },
  {
    key: 'community-health',
    icon: 'cottage',
    title: 'ระบบงานสาธารณสุขและระบบงานควบคุมป้องกันและส่งเสริมสุขภาพในชุมชน',
    desc: 'แพลตฟอร์มจัดการข้อมูลงานสาธารณสุข การเฝ้าระวังโรคติดต่อ และการส่งเสริมสุขภาพเชิงรุกในระดับพื้นที่และชุมชน',
    lastUsed: 'วันนี้, 08:30 น.',
    route: null,
  },
  {
    key: 'school-health',
    icon: 'school',
    title: 'ระบบสุขภาพนักเรียน',
    desc: 'ระบบจัดเก็บข้อมูลประวัติสุขภาพ การฉีดวัคซีน และการเฝ้าระวังพัฒนาการของเด็กนักเรียนในสถานศึกษา',
    lastUsed: 'วันนี้, 08:30 น.',
    route: null,
  },
  {
    key: 'inventory',
    icon: 'medication',
    title: 'ระบบคลังยาและเวชภัณฑ์',
    desc: 'ระบบควบคุมและติดตามการเบิกจ่าย การจัดซื้อ และการคงคลังของยา วัสดุทางการแพทย์ และเวชภัณฑ์ต่างๆ',
    lastUsed: 'วันนี้, 08:30 น.',
    route: null,
  },
  {
    key: 'schedule',
    icon: 'event_available',
    title: 'ระบบจัดตารางเวร',
    desc: 'จัดตารางเวรบุคลากร กำหนด แก้ไข และติดตามชั่วโมงการทำงานรายเดือน',
    lastUsed: 'วันนี้, 08:30 น.',
    route: '/schedule',
  },
  {
    key: 'consent',
    icon: 'verified_user',
    title: 'ระบบจัดการความยินยอม',
    desc: 'จัดการความยินยอมทั้งหมด รอลงนาม ยินยอมแล้ว ปฏิเสธ และหมดอายุ',
    lastUsed: 'วันนี้, 08:30 น.',
    route: null,
  },
  {
    key: 'audit',
    icon: 'history',
    title: 'ประวัติการใช้งาน',
    desc: 'บันทึกกิจกรรมทุกอย่างที่เกิดขึ้นในระบบแบบอัตโนมัติ ครอบคลุมการสร้าง แก้ไข ลบ และเข้าถึงข้อมูล Consent ของผู้ใช้ทุกคน',
    lastUsed: 'วันนี้, 08:30 น.',
    route: null,
  },
  {
    key: 'admin',
    icon: 'manage_accounts',
    title: 'จัดการระบบ',
    desc: 'ศูนย์กลางสำหรับผู้ดูแลระบบในการกำหนดโครงสร้างและนโยบายการใช้งานทั้งหมด ครอบคลุมการสร้างและบริหารแม่แบบเอกสาร การกำหนด Role และสิทธิ์การเข้าถึงของผู้ใช้แต่ละคน',
    lastUsed: 'วันนี้, 08:30 น.',
    route: '/users',
  },
];

const CARD_ROWS = [
  SYSTEMS.slice(0, 3),
  SYSTEMS.slice(3, 6),
  SYSTEMS.slice(6, 8),
];

const SystemCard = ({ system }) => {
  const history = useHistory();
  const disabled = !system.route;
  const go = () => { if (!disabled) history.push(system.route); };

  return (
    <article
      role={disabled ? undefined : 'button'}
      tabIndex={disabled ? undefined : 0}
      onClick={go}
      onKeyDown={(e) => {
        if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          go();
        }
      }}
      style={{
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        flex: '1 1 0',
        minWidth: 0,
        gap: 'var(--dim-space-400, 16px)',
        padding: 'var(--dim-space-600, 24px)',
        background: 'var(--surface-card-100, #FFFFFF)',
        border: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary, #E2F3EB)',
        borderRadius: 'var(--dim-radius-500, 16px)',
        boxShadow: 'var(--shadow-brand-drop-bottom-200, 0 1px 4px rgba(8,167,104,0.10), 0 1px 2px rgba(8,167,104,0.08))',
        cursor: disabled ? 'default' : 'pointer',
        transition: 'box-shadow 150ms ease, border-color 150ms ease',
      }}
      onMouseEnter={(e) => {
        if (disabled) return;
        e.currentTarget.style.boxShadow = 'var(--shadow-brand-drop-bottom-200, 0 2px 8px rgba(8,167,104,0.14), 0 1px 3px rgba(8,167,104,0.10))';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = 'var(--shadow-brand-drop-bottom-200, 0 1px 4px rgba(8,167,104,0.10), 0 1px 2px rgba(8,167,104,0.08))';
      }}
    >
      <div
        aria-hidden
        style={{
          width: 'var(--dim-size-1700, 80px)',
          height: 'var(--dim-size-1700, 80px)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon
          name={system.icon}
          size={48}
          color='var(--text-brandPrimary-default, var(--brand-p700, #007549))'
        />
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 'var(--dim-space-100, 4px)',
          width: '100%',
          textAlign: 'center',
        }}
      >
        <h2
          style={{
            margin: 0,
            fontFamily: 'var(--type-family-heading-graphic2, var(--type-family-body))',
            fontSize: 'var(--type-size-lg, 18px)',
            fontWeight: 'var(--type-weight-regular, 400)',
            lineHeight: 1.5,
            color: 'var(--text-content-default, #363B3F)',
          }}
        >
          {system.title}
        </h2>
        <p
          style={{
            margin: 0,
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-sm, 14px)',
            fontWeight: 'var(--type-weight-regular, 400)',
            lineHeight: 1.5,
            color: 'var(--text-content-tertiary, #858C92)',
          }}
        >
          {system.desc}
        </p>
      </div>

      <div
        aria-hidden
        style={{
          width: '100%',
          height: 'var(--dim-stroke-100, 1px)',
          background: 'var(--border-neutral-quaternary, #F4F5F5)',
          flexShrink: 0,
        }}
      />

      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--dim-space-100, 4px)' }}>
        <Icon name='schedule' size={14} color='var(--text-content-quaternary, #ADB2B7)' />
        <span
          style={{
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-xs, 12px)',
            fontWeight: 'var(--type-weight-medium, 500)',
            lineHeight: 1.5,
            color: 'var(--text-content-quaternary, #ADB2B7)',
            whiteSpace: 'nowrap',
          }}
        >
          เข้าใช้งานล่าสุด: {system.lastUsed}
        </span>
      </div>
    </article>
  );
};

const SystemHubPage = () => {
  const greeting = formatHubGreeting();

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'stretch',
        fontFamily: 'var(--type-family-body)',
        boxSizing: 'border-box',
        background: 'linear-gradient(180deg, var(--surface-card-default, #FFFFFF) 0%, var(--brand-p50, #F4FBF8) 100%)',
      }}
    >
      <HubSidebar avatarSrc={CURRENT_USER.avatarSrc} />

      <div
        style={{
          flex: '1 1 auto',
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
        }}
      >
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
          {/* Header — greeting + hero illustration (Figma 23:8892). */}
          <header
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--dim-space-600, 24px)',
              padding: '0 var(--dim-space-600, 24px)',
            }}
          >
            <div
              style={{
                flex: '1 1 0',
                minWidth: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--dim-space-300, 12px)',
              }}
            >
              <h1
                style={{
                  margin: 0,
                  fontFamily: 'var(--type-family-heading-graphic2, var(--type-family-body))',
                  fontSize: 'var(--type-size-xl, 20px)',
                  fontWeight: 'var(--type-weight-regular, 400)',
                  lineHeight: 1.375,
                  color: 'var(--text-content-default, #363B3F)',
                }}
              >
                {greeting}
              </h1>
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
                {CURRENT_USER.displayName}
              </p>
            </div>

            <img
              src={HUB_HERO}
              alt=''
              aria-hidden
              style={{
                flexShrink: 0,
                maxWidth: '40%',
                height: 'auto',
                objectFit: 'contain',
              }}
            />
          </header>

          {/* Card grid — 3 rows per Figma 7:773. */}
          <main
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--dim-space-600, 24px)',
              padding: '0 var(--dim-space-600, 24px) var(--dim-space-600, 24px)',
            }}
          >
            {CARD_ROWS.map((row, rowIdx) => (
              <div
                key={row.map(s => s.key).join('-')}
                style={{
                  display: 'flex',
                  gap: 'var(--dim-space-600, 24px)',
                  alignItems: 'stretch',
                  width: '100%',
                }}
              >
                {row.map(system => (
                  <SystemCard key={system.key} system={system} />
                ))}
                {rowIdx === 2 && (
                  <div style={{ flex: '1 1 0', minWidth: 0 }} aria-hidden />
                )}
              </div>
            ))}
          </main>
        </div>

        <ScheduleFooter />
      </div>
    </div>
  );
};

export default SystemHubPage;
