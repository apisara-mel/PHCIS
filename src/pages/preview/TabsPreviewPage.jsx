import React, { useState } from 'react';
import { TabBar, TabPillLarge, TabPillSmall } from '@/components/tab/TabPill';
import TabUnderline from '@/components/tab/TabUnderline';

/* MIH Tabs Sandbox — /preview/tabs
   Standalone playground for the three tab primitives in the DS:
     • TabBar     — segmented "track" container (animated indicator)
     • TabPill    — pill-shaped child of TabBar (small/large × text/icon × states)
     • TabUnderline — underline tab (default / hover / selected / selected-hover)

   No Sidebar / no SubHeader — this page is intentionally chrome-free so the
   components can be inspected in isolation against the brand-50 screen
   surface (matches the inner "content card" used elsewhere). */

/* ─────────── Layout helpers ─────────── */

const Section = ({ title, description, children }) => (
  <section
    className='w-full flex flex-col'
    style={{
      gap: 'var(--dim-space-400)',
      padding: 'var(--dim-space-600)',
      background: 'var(--surface-card-100)',
      borderRadius: 'var(--dim-radius-500)',
      boxShadow: 'var(--shadow-card)',
    }}
  >
    <header className='flex flex-col' style={{ gap: 'var(--dim-space-100)' }}>
      <h2
        style={{
          margin: 'var(--dim-space-0)',
          color: 'var(--text-content-default)',
          fontFamily: 'var(--type-family-heading-content)',
          fontSize: 'var(--type-size-lg)',
          fontWeight: 'var(--type-weight-bold)',
          lineHeight: 1.5,
        }}
      >
        {title}
      </h2>
      {description && (
        <p
          style={{
            margin: 'var(--dim-space-0)',
            color: 'var(--text-content-secondary)',
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-sm)',
            lineHeight: 1.5,
          }}
        >
          {description}
        </p>
      )}
    </header>
    <div className='flex flex-col' style={{ gap: 'var(--dim-space-500)' }}>
      {children}
    </div>
  </section>
);

const Demo = ({ label, hint, children }) => (
  <div className='flex flex-col' style={{ gap: 'var(--dim-space-200)' }}>
    <div className='flex items-baseline' style={{ gap: 'var(--dim-space-300)' }}>
      <span
        style={{
          color: 'var(--text-content-default)',
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-sm)',
          fontWeight: 'var(--type-weight-medium)',
          lineHeight: 1.5,
        }}
      >
        {label}
      </span>
      {hint && (
        <code
          style={{
            color: 'var(--text-content-tertiary)',
            fontFamily: 'ui-monospace, SFMono-Regular, monospace',
            fontSize: 'var(--type-size-xs)',
          }}
        >
          {hint}
        </code>
      )}
    </div>
    <div
      className='w-full'
      style={{
        padding: 'var(--dim-space-400)',
        background: 'var(--background-screen-brand-100, #F4FBF8)',
        borderRadius: 'var(--dim-radius-300)',
        border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
      }}
    >
      {children}
    </div>
  </div>
);

/* ─────────── TabBar / TabPill demo ─────────── */

const TabBarSmallDemo = () => {
  const [tab, setTab] = useState('all');
  const tabs = [
    { v: 'all',    label: 'ทั้งหมด' },
    { v: 'pend',   label: 'รอดำเนินการ' },
    { v: 'done',   label: 'เสร็จสิ้น' },
  ];
  return (
    <TabBar align='start' aria-label='ตัวอย่าง TabBar small'>
      {tabs.map((t) => (
        <TabPillSmall
          key={t.v}
          showIcon={false}
          selected={tab === t.v}
          onClick={() => setTab(t.v)}
        >
          {t.label}
        </TabPillSmall>
      ))}
    </TabBar>
  );
};

const TabBarLargeDemo = () => {
  const [tab, setTab] = useState('single');
  const tabs = [
    { v: 'single', label: 'วันเดียว' },
    { v: 'range',  label: 'ช่วงวันที่' },
  ];
  return (
    <TabBar align='center' aria-label='ตัวอย่าง TabBar large'>
      {tabs.map((t) => (
        <TabPillLarge
          key={t.v}
          showIcon={false}
          selected={tab === t.v}
          onClick={() => setTab(t.v)}
        >
          {t.label}
        </TabPillLarge>
      ))}
    </TabBar>
  );
};

const TabBarWithIconDemo = () => {
  const [tab, setTab] = useState('day');
  const tabs = [
    { v: 'day',   label: 'รายวัน',   icon: 'calendar_today' },
    { v: 'week',  label: 'รายสัปดาห์', icon: 'date_range' },
    { v: 'month', label: 'รายเดือน',  icon: 'calendar_month' },
  ];
  return (
    <TabBar align='start' aria-label='ตัวอย่าง TabBar with icon'>
      {tabs.map((t) => (
        <TabPillSmall
          key={t.v}
          leadingIcon={t.icon}
          selected={tab === t.v}
          onClick={() => setTab(t.v)}
        >
          {t.label}
        </TabPillSmall>
      ))}
    </TabBar>
  );
};

const TabBarIconOnlyDemo = () => {
  const [tab, setTab] = useState('grid');
  const tabs = [
    { v: 'grid', icon: 'grid_view',  label: 'แบบตาราง' },
    { v: 'list', icon: 'view_list',  label: 'แบบรายการ' },
    { v: 'map',  icon: 'map',        label: 'แบบแผนที่' },
  ];
  return (
    <TabBar align='start' aria-label='ตัวอย่าง TabBar icon-only'>
      {tabs.map((t) => (
        <TabPillSmall
          key={t.v}
          style='icon'
          leadingIcon={t.icon}
          selected={tab === t.v}
          onClick={() => setTab(t.v)}
          aria-label={t.label}
        />
      ))}
    </TabBar>
  );
};

const TabBarStretchDemo = () => {
  const [tab, setTab] = useState('a');
  const tabs = [
    { v: 'a', label: 'ตัวเลือก A' },
    { v: 'b', label: 'ตัวเลือก B' },
    { v: 'c', label: 'ตัวเลือก C' },
    { v: 'd', label: 'ตัวเลือก D' },
  ];
  return (
    <TabBar align='start' stretch aria-label='ตัวอย่าง TabBar stretch'>
      {tabs.map((t) => (
        <TabPillSmall
          key={t.v}
          showIcon={false}
          selected={tab === t.v}
          onClick={() => setTab(t.v)}
        >
          {t.label}
        </TabPillSmall>
      ))}
    </TabBar>
  );
};

const TabBarDisabledDemo = () => {
  const [tab, setTab] = useState('a');
  return (
    <TabBar align='start' aria-label='ตัวอย่าง TabBar disabled state'>
      <TabPillSmall showIcon={false} selected={tab === 'a'} onClick={() => setTab('a')}>เปิดใช้</TabPillSmall>
      <TabPillSmall showIcon={false} selected={tab === 'b'} onClick={() => setTab('b')}>เลือกได้</TabPillSmall>
      <TabPillSmall showIcon={false} disabled>ปิดใช้งาน</TabPillSmall>
    </TabBar>
  );
};

const TabBarStaticDemo = () => {
  const [tab, setTab] = useState('a');
  const tabs = [
    { v: 'a', label: 'A' },
    { v: 'b', label: 'B' },
    { v: 'c', label: 'C' },
  ];
  return (
    <TabBar animated={false} align='start' aria-label='ตัวอย่าง TabBar non-animated'>
      {tabs.map((t) => (
        <TabPillSmall
          key={t.v}
          showIcon={false}
          selected={tab === t.v}
          onClick={() => setTab(t.v)}
        >
          {t.label}
        </TabPillSmall>
      ))}
    </TabBar>
  );
};

/* ─────────── TabUnderline demo ─────────── */

const TabUnderlineDemo = () => {
  const [active, setActive] = useState('all');
  const tabs = [
    { key: 'all',   label: 'ทั้งหมด' },
    { key: 'pend',  label: 'กำลังรอ' },
    { key: 'done',  label: 'เสร็จแล้ว' },
    { key: 'draft', label: 'ที่ร่างไว้' },
  ];
  return (
    <TabUnderline
      tabs={tabs}
      value={active}
      onChange={setActive}
      className='w-full'
      style={{
        gap: 'var(--dim-space-200)',
        borderBottom: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
      }}
    />
  );
};

const TabUnderlineWithCountDemo = () => {
  const [active, setActive] = useState('all');
  const tabs = [
    { key: 'all',   label: 'ทั้งหมด',     count: 130 },
    { key: 'pend',  label: 'รอลงทะเบียน', count: 12  },
    { key: 'prog',  label: 'กำลังลงทะเบียน', count: 8 },
    { key: 'done',  label: 'ลงทะเบียนแล้ว', count: 118 },
    { key: 'draft', label: 'ที่ร่างไว้',    count: 6 },
  ];
  return (
    <TabUnderline
      tabs={tabs}
      value={active}
      onChange={setActive}
      className='w-full'
      style={{
        gap: 'var(--dim-space-200)',
        borderBottom: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
      }}
    />
  );
};

const TabUnderlineWithIconDemo = () => {
  const [active, setActive] = useState('overview');
  const tabs = [
    { key: 'overview', label: 'ภาพรวม',     icon: 'dashboard' },
    { key: 'patient',  label: 'ผู้ป่วย',     icon: 'group',     count: 24 },
    { key: 'report',   label: 'รายงาน',     icon: 'analytics' },
    { key: 'setting',  label: 'ตั้งค่า',     icon: 'settings' },
  ];
  return (
    <TabUnderline
      tabs={tabs}
      value={active}
      onChange={setActive}
      className='w-full'
      style={{
        gap: 'var(--dim-space-200)',
        borderBottom: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
      }}
    />
  );
};

/* Overflow demo — Figma 2867:4170. Many tabs in a narrow container so
   the "More" trigger always appears; resize the wrapper or browser to
   change the cut-off. */
const TabUnderlineOverflowDemo = () => {
  const [active, setActive] = useState('all');
  const tabs = [
    { key: 'all',       label: 'ทั้งหมด',          count: 130 },
    { key: 'waiting',   label: 'รอตรวจ',           count: 7   },
    { key: 'progress',  label: 'กำลังตรวจ',         count: 3   },
    { key: 'lab',       label: 'รอผลแลป',          count: 12  },
    { key: 'xray',      label: 'รอผลเอ็กซเรย์',     count: 4   },
    { key: 'pharmacy',  label: 'รอเภสัชจ่ายยา',     count: 9   },
    { key: 'done',      label: 'เสร็จแล้ว',         count: 86  },
    { key: 'cancelled', label: 'ยกเลิก',           count: 2   },
  ];
  return (
    <div style={{ width: 480, maxWidth: '100%' }}>
      <TabUnderline
        tabs={tabs}
        value={active}
        onChange={setActive}
        className='w-full'
        style={{
          gap: 'var(--dim-space-200)',
          borderBottom: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
        }}
      />
    </div>
  );
};

/* ─────────── Page ─────────── */

const TabsPreviewPage = () => (
  <div
    className='w-full min-h-screen'
    style={{ background: 'var(--background-screen-brand-100, #F4FBF8)' }}
  >
    <main
      className='mx-auto flex flex-col'
      style={{
        maxWidth: 1024,
        gap: 'var(--dim-space-600)',
        padding: 'var(--dim-space-600)',
      }}
    >
      <header className='flex flex-col' style={{ gap: 'var(--dim-space-200)' }}>
        <span
          style={{
            color: 'var(--text-content-tertiary)',
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-xs)',
            fontWeight: 'var(--type-weight-medium)',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          Design System · Sandbox
        </span>
        <h1
          style={{
            margin: 'var(--dim-space-0)',
            color: 'var(--text-content-default)',
            fontFamily: 'var(--type-family-heading-content)',
            fontSize: 24,
            fontWeight: 'var(--type-weight-bold)',
            lineHeight: 1.4,
          }}
        >
          Tabs — TabBar · TabPill · TabUnderline
        </h1>
        <p
          style={{
            margin: 'var(--dim-space-0)',
            color: 'var(--text-content-secondary)',
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-base)',
            lineHeight: 1.5,
          }}
        >
          พื้นที่ preview แยกสำหรับ tab primitives สาม component
          ทดลองคลิกเพื่อดู micro-interaction (sliding indicator, ink-bar)
          และเปรียบเทียบ state ต่างๆ ที่ใช้ token จาก design.md
        </p>
      </header>

      <Section
        title='TabBar + TabPill — Segmented Control'
        description={
          'พื้น track สีอ่อน + indicator เลื่อนตามแท็บที่เลือก ' +
          '(Figma 2514:7929 + 370:30). TabPill เป็น child ของ TabBar เสมอ.'
        }
      >
        <Demo label='Small (default)' hint='size="small" · showIcon={false}'>
          <TabBarSmallDemo />
        </Demo>

        <Demo label='Large + align="center"' hint='size="large" · ใช้ใน DateFilterPopup'>
          <TabBarLargeDemo />
        </Demo>

        <Demo label='With icon' hint='leadingIcon="<material-symbol-name>"'>
          <TabBarWithIconDemo />
        </Demo>

        <Demo label='Icon only' hint='style="icon" · aria-label required'>
          <TabBarIconOnlyDemo />
        </Demo>

        <Demo label='Stretch (เต็มความกว้าง)' hint='stretch'>
          <TabBarStretchDemo />
        </Demo>

        <Demo label='Disabled state' hint='disabled prop บน TabPill ตัวที่ปิด'>
          <TabBarDisabledDemo />
        </Demo>

        <Demo label='Non-animated (legacy)' hint='animated={false}'>
          <TabBarStaticDemo />
        </Demo>
      </Section>

      <Section
        title='TabUnderline — Ink-bar Tabs'
        description={
          'แท็บแบบเส้นใต้ (ใช้ในหน้า OPD/MR/Treatment Queue). ' +
          'เส้นใต้เป็น scaleX(0→1) จากกึ่งกลาง สีตาม brand primary'
        }
      >
        <Demo label='เฉพาะ label' hint='tab.label'>
          <TabUnderlineDemo />
        </Demo>

        <Demo label='พร้อม count badge' hint='tab.count'>
          <TabUnderlineWithCountDemo />
        </Demo>

        <Demo label='พร้อม icon (และ count บางช่อง)' hint='tab.icon · tab.count'>
          <TabUnderlineWithIconDemo />
        </Demo>

        <Demo
          label='Overflow → More dropdown'
          hint='Figma 2867:4170 · แท็บที่ไม่พอจะถูกย่อเข้าปุ่ม ••• ⌄ ทางขวา'
        >
          <TabUnderlineOverflowDemo />
        </Demo>
      </Section>

      <footer
        style={{
          color: 'var(--text-content-tertiary)',
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-xs)',
          textAlign: 'center',
          paddingTop: 'var(--dim-space-400)',
        }}
      >
        Tokens อ้างอิงจาก{' '}
        <code style={{ fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}>design.md</code>
      </footer>
    </main>
  </div>
);

export default TabsPreviewPage;
