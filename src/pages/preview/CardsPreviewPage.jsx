import React, { useState } from 'react';
import VitalSignTimelineCard from '@/components/card/VitalSignTimelineCard';

/* MIH Cards Sandbox — /preview/cards
   Standalone playground for the Group card family (MIH DS - Card · Figma
   133:1031). Currently hosts VitalSignTimelineCard with all four states;
   future Group cards (e.g. radio card, summary card) can be added as new
   sections under the same shell. */

const sampleEntry = {
  time: 'เวลา 21:19:27',
  date: '6 พฤษภาคม 2569',
  vitals: [
    { label: 'ความดัน', value: '128/80 mmHg' },
    { label: 'อุณหภูมิ', value: '36.5 °C' },
    { label: 'น้ำหนัก', value: '60 kg' },
  ],
};

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
      <div
        className='mx-auto flex flex-col'
        style={{ gap: 'var(--dim-space-200)', maxWidth: 280 }}
      >
        {children}
      </div>
    </div>
  </div>
);

const InteractiveTimeline = () => {
  const [active, setActive] = useState(0);
  const list = [
    { ...sampleEntry, time: 'เวลา 21:19:27' },
    { ...sampleEntry, time: 'เวลา 20:45:10', date: '6 พฤษภาคม 2569', vitals: [
      { label: 'ความดัน', value: '130/82 mmHg' },
      { label: 'อุณหภูมิ', value: '36.7 °C' },
      { label: 'น้ำหนัก', value: '60 kg' },
    ] },
    { ...sampleEntry, time: 'เวลา 17:10:32', badge: 'ผิดปกติ', vitals: [
      { label: 'ความดัน', value: '132/84 mmHg' },
      { label: 'อุณหภูมิ', value: '36.8 °C' },
      { label: 'น้ำหนัก', value: '60.2 kg' },
    ] },
  ];
  return list.map((it, i) => (
    <VitalSignTimelineCard
      key={i}
      {...it}
      selected={i === active}
      onClick={() => setActive(i)}
    />
  ));
};

const CardsPreviewPage = () => (
  <div
    className='w-full min-h-screen'
    style={{ background: 'var(--background-screen-brand-100, #F4FBF8)' }}
  >
    <main
      className='mx-auto flex flex-col'
      style={{ maxWidth: 1024, gap: 'var(--dim-space-600)', padding: 'var(--dim-space-600)' }}
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
          Cards — Group Card Family
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
          Preview แยกสำหรับ Group Card variants (MIH DS · Figma 133:1031)
        </p>
      </header>

      <Section
        title='VitalSignTimelineCard'
        description={'การ์ดประวัติการวัดสัญญาณชีพ มี 4 state: default · hover · selected · disabled. ' +
          'Hover + selected ใช้ stroke 2px (Figma 133:1448 / 133:1031) สี border/brandPrimary/tertiary. ' +
          'Token ทั้งหมดอ้างอิงจาก design.md (border/card/default, border/brandPrimary/tertiary, ' +
          'text/brandPrimaryButton/default ฯลฯ).'}
      >
        <Demo label='Default' hint='base state · no props'>
          <VitalSignTimelineCard {...sampleEntry} />
        </Demo>

        <Demo label='Hover' hint='auto-trigger when pointer enters'>
          <VitalSignTimelineCard {...sampleEntry} />
        </Demo>

        <Demo label='Selected' hint='selected={true} · 2px brand border'>
          <VitalSignTimelineCard {...sampleEntry} selected />
        </Demo>

        <Demo label='Selected + badge' hint='selected · badge="ผิดปกติ"'>
          <VitalSignTimelineCard {...sampleEntry} selected badge='ผิดปกติ' />
        </Demo>

        <Demo label='With badge (default)' hint='badge="ผิดปกติ"'>
          <VitalSignTimelineCard {...sampleEntry} badge='ผิดปกติ' />
        </Demo>

        <Demo label='Disabled' hint='disabled={true}'>
          <VitalSignTimelineCard {...sampleEntry} disabled />
        </Demo>

        <Demo label='Interactive timeline' hint='คลิกเพื่อเลือก · onClick + selected'>
          <InteractiveTimeline />
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

export default CardsPreviewPage;
