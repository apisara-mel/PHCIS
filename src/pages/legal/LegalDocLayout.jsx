import React from 'react';
import Icon from '@/components/icons/Icon';

/* Standalone legal-document shell — used by นโยบายความเป็นส่วนตัว (/privacy)
   and ข้อกำหนดการใช้งาน (/terms). These open in a NEW TAB from the <Footer>
   legal row, so they carry their own minimal chrome (seal + title + print)
   instead of the app sidebar/header.

   `sections` = [{ id, heading, body: [string | {list: string[]} | {table:{head,rows}}] }]
   Every value aliases a design.md token — dark-mode aware via the semantic
   surface/text/border tokens. */

const PAGE = {
  minHeight: '100vh',
  width: '100%',
  background: 'var(--background-screen-brand-100)',
  paddingTop: 'var(--dim-space-800)',
  paddingBottom: 'var(--dim-space-1200)',
  paddingLeft: 'var(--dim-space-600)',
  paddingRight: 'var(--dim-space-600)',
};

const SHEET = {
  width: '100%',
  maxWidth: 'var(--dim-size-2900)',
  marginLeft: 'auto',
  marginRight: 'auto',
  background: 'var(--surface-card-100)',
  border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
  borderRadius: 'var(--dim-radius-600)',
  boxShadow: 'var(--shadow-card)',
  padding: 'var(--dim-space-800)',
};

const H1 = {
  margin: 0,
  color: 'var(--text-brandPrimary-default)',
  fontFamily: 'var(--type-family-heading-graphic2)',
  fontSize: 'var(--type-size-2xl)',
  fontWeight: 'var(--type-weight-regular)',
  lineHeight: 1.375,
};

const META = {
  margin: 0,
  color: 'var(--text-content-tertiary)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm)',
  lineHeight: 1.5,
};

const H2 = {
  margin: 0,
  color: 'var(--text-content-default)',
  fontFamily: 'var(--type-family-heading-content)',
  fontSize: 'var(--type-size-base)',
  fontWeight: 'var(--type-weight-bold)',
  lineHeight: 1.5,
};

const BODY = {
  margin: 0,
  color: 'var(--text-content-secondary)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm)',
  fontWeight: 'var(--type-weight-regular)',
  lineHeight: 1.7,
};

const TH = {
  ...BODY,
  color: 'var(--text-content-default)',
  fontWeight: 'var(--type-weight-bold)',
  textAlign: 'left',
  padding: 'var(--dim-space-200) var(--dim-space-300)',
  borderBottom: 'var(--dim-stroke-100) solid var(--border-table-default)',
  whiteSpace: 'nowrap',
};

const TD = {
  ...BODY,
  padding: 'var(--dim-space-200) var(--dim-space-300)',
  borderBottom: 'var(--dim-stroke-100) solid var(--border-table-line)',
  verticalAlign: 'top',
};

const Block = ({ item }) => {
  if (typeof item === 'string') return <p style={BODY}>{item}</p>;
  if (item.list) {
    return (
      <ul style={{ ...BODY, margin: 0, paddingLeft: 'var(--dim-space-600)', listStyle: 'disc' }}>
        {item.list.map((li, i) => (
          <li key={i} style={{ marginBottom: 'var(--dim-space-100)' }}>{li}</li>
        ))}
      </ul>
    );
  }
  if (item.table) {
    return (
      <div style={{ width: '100%', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>{item.table.head.map((h, i) => <th key={i} style={TH}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {item.table.rows.map((row, i) => (
              <tr key={i}>{row.map((cell, j) => <td key={j} style={TD}>{cell}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  return null;
};

export default function LegalDocLayout({ title, updated, intro, sections = [], contact }) {
  return (
    <div style={PAGE}>
      <div style={SHEET} className='flex flex-col' >
        {/* Masthead */}
        <div className='flex items-start w-full' style={{ gap: 'var(--dim-space-400)' }}>
          <img
            src='/images/office-health-logo.png'
            alt='ตราสัญลักษณ์สำนักอนามัย'
            style={{ width: 'var(--dim-size-1000)', height: 'var(--dim-size-1000)' }}
            draggable={false}
          />
          <div className='flex flex-col flex-1 min-w-0' style={{ gap: 'var(--dim-space-100)' }}>
            <h1 style={H1}>{title}</h1>
            <p style={META}>ศูนย์บริการสาธารณสุข สำนักอนามัย กรุงเทพมหานคร · ระบบ PHCIS</p>
            <p style={META}>ปรับปรุงล่าสุด: {updated}</p>
          </div>
          <button
            type='button'
            onClick={() => window.print()}
            className='inline-flex items-center shrink-0'
            style={{
              gap: 'var(--dim-space-150)',
              height: 'var(--dim-size-800)',
              paddingLeft: 'var(--dim-space-300)',
              paddingRight: 'var(--dim-space-300)',
              borderRadius: 'var(--dim-radius-200)',
              border: 'var(--dim-stroke-100) solid var(--border-neutralButton-tertiary)',
              background: 'var(--surface-card-100)',
              color: 'var(--text-neutralButton-default)',
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-sm)',
              cursor: 'pointer',
            }}
          >
            <Icon name='printer' size={16} />
            พิมพ์
          </button>
        </div>

        <div
          style={{
            height: 'var(--dim-stroke-100)',
            background: 'var(--border-neutral-quaternary)',
            marginTop: 'var(--dim-space-600)',
            marginBottom: 'var(--dim-space-600)',
          }}
        />

        {intro && <p style={{ ...BODY, marginBottom: 'var(--dim-space-600)' }}>{intro}</p>}

        {/* Sections */}
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-700, 28px)' }}>
          {sections.map((s, i) => (
            <section key={s.id || i} className='flex flex-col' style={{ gap: 'var(--dim-space-300)' }}>
              <h2 style={H2}>{`${i + 1}. ${s.heading}`}</h2>
              {s.body.map((item, j) => <Block key={j} item={item} />)}
            </section>
          ))}
        </div>

        {/* Contact */}
        {contact && (
          <div
            className='flex flex-col'
            style={{
              gap: 'var(--dim-space-200)',
              marginTop: 'var(--dim-space-800)',
              padding: 'var(--dim-space-400)',
              borderRadius: 'var(--dim-radius-500)',
              background: 'var(--surface-brandPrimary-quaternary)',
              border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
            }}
          >
            <span style={{ ...H2, fontSize: 'var(--type-size-sm)' }}>{contact.heading}</span>
            {contact.lines.map((l, i) => <span key={i} style={BODY}>{l}</span>)}
          </div>
        )}

        <p style={{ ...META, marginTop: 'var(--dim-space-800)' }}>
          เอกสารนี้เป็นข้อมูลจำลอง (mock) สำหรับการสาธิตระบบ PHCIS — ยังไม่ใช่ฉบับที่มีผลบังคับใช้ทางกฎหมาย
        </p>
      </div>
    </div>
  );
}
