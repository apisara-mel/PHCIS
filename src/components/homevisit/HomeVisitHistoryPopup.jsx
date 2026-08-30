import React, { useMemo, useState } from 'react';
import Popup from '@/components/popup/Popup';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import Icon from '@/components/icons/Icon';
import { getVisitHistory } from '@/data/homevisitRegistry';
import {
  BARTHEL_MAX_SCORE,
  interpretBarthel,
  formatHomeVisitDate,
  resolveProfession,
} from '@/data/homevisitVisits';

/* ประวัติการเยี่ยมบ้าน — ทรงเดียวกับป๊อปอัป "ข้อมูลทางการแพทย์ (EMR)"
   (MedicalHistoryPopup): รางวันที่อยู่ซ้าย เลือกครั้งไหนก็ได้ · รายละเอียดของ
   ครั้งนั้นอยู่ขวา (มติผู้ใช้ 30 ส.ค. 69)

   ต่างจากตารางย้อนหลังในขั้น "ประวัติ" ตรงที่ตารางไว้กวาดตาเทียบข้ามครั้ง
   ส่วนป๊อปอัปนี้ไว้เปิดอ่านครั้งใดครั้งหนึ่งเต็ม ๆ ระหว่างกำลังบันทึกอยู่ */

const VITAL_ROWS = [
  { key: 'sys',         label: 'ความดันโลหิต', render: (v) => (v.sys && v.dia ? `${v.sys}/${v.dia} mmHg` : '') },
  { key: 'pulse',       label: 'ชีพจร',        unit: 'ครั้ง/นาที' },
  { key: 'respiration', label: 'การหายใจ',     unit: 'ครั้ง/นาที' },
  { key: 'temp',        label: 'อุณหภูมิ',      unit: '°C' },
  { key: 'oxygen',      label: 'ออกซิเจนปลายนิ้ว', unit: '%' },
  { key: 'weight',      label: 'น้ำหนัก',       unit: 'กก.' },
  { key: 'height',      label: 'ส่วนสูง',       unit: 'ซม.' },
];

const labelStyle = {
  color: 'var(--text-content-subtle, #6B7280)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm)',
  lineHeight: 1.6,
  minWidth: 160,
};

const valueStyle = {
  color: 'var(--text-content-default)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm)',
  lineHeight: 1.6,
  flex: '1 1 200px',
  whiteSpace: 'pre-line',
};

const Row = ({ label, value }) => (
  <div className='flex flex-wrap w-full' style={{ gap: 'var(--dim-space-200)', alignItems: 'baseline' }}>
    <span style={labelStyle}>{label}</span>
    <span style={valueStyle}>{value || '—'}</span>
  </div>
);

const SectionTitle = ({ icon, children }) => (
  <div className='flex items-center' style={{ gap: 'var(--dim-space-200)' }}>
    <Icon name={icon} size={18} style={{ color: 'var(--text-brandPrimary-default, #007549)' }} />
    <span style={{
      color: 'var(--text-brandPrimary-default, #007549)',
      fontFamily: 'var(--type-family-heading-content)',
      fontSize: 'var(--type-size-sm)',
    }}>
      {children}
    </span>
  </div>
);

/* ปุ่มในรางวันที่ — ต้องตอบสนองการชี้เมาส์ (มติผู้ใช้ 30 ส.ค. 69) ปุ่มที่ไม่ขยับ
   ตอนชี้อ่านเหมือนป้ายข้อความ คนใช้จะไม่รู้ว่ากดได้ · ชุดสีเดียวกับสถานะ hover
   ของปุ่มการ์ดใน DS: เส้นขอบเป็น brand tertiary + เงาล่าง */
const RoundRailButton = ({ round, active, onClick }) => {
  const [hovered, setHovered] = useState(false);
  const border = active
    ? 'var(--dim-stroke-200) solid var(--border-brandPrimary-default, #007549)'
    : `var(--dim-stroke-100) solid ${hovered
      ? 'var(--border-brandprimarybutton-tertiary, #7FC3A8)'
      : 'var(--border-card-default, #E2E4E6)'}`;
  return (
    <button
      type='button'
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      className='flex flex-col w-full text-left'
      style={{
        gap: 'var(--dim-space-100)',
        padding: 'var(--dim-space-300) var(--dim-space-400)',
        borderRadius: 'var(--dim-radius-300, 10px)',
        border,
        background: active
          ? 'var(--surface-brandPrimary-quaternary, #F4FBF8)'
          : (hovered
            ? 'var(--surface-brandPrimary-quaternary, #F4FBF8)'
            : 'var(--surface-card-100, #FFFFFF)'),
        boxShadow: !active && hovered ? 'var(--shadow-brand-drop-bottom-200)' : 'none',
        cursor: 'pointer',
        transition: 'background-color 150ms ease, border-color 150ms ease, box-shadow 150ms ease',
      }}
    >
      <span style={{
        color: active || hovered
          ? 'var(--text-brandPrimary-default, #007549)'
          : 'var(--text-content-default)',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-sm)',
        fontWeight: 'var(--type-weight-medium)',
        transition: 'color 150ms ease',
      }}>
        ครั้งที่ {round.no} · {formatHomeVisitDate(round.date)}
      </span>
      <span style={{
        color: 'var(--text-content-subtle, #6B7280)',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-xs)',
      }}>
        {round.by}
      </span>
    </button>
  );
};

const HomeVisitHistoryPopup = ({ open, onClose, hn, patientName }) => {
  /* ครั้งล่าสุดขึ้นก่อน — คนเปิดดูมักถามว่า "ครั้งที่แล้วเจออะไร" */
  const rounds = useMemo(() => (hn ? getVisitHistory(hn).slice().reverse() : []), [hn]);
  const [selected, setSelected] = useState(0);
  const round = rounds[selected] || null;
  const adl = round && round.adl !== null && round.adl !== undefined ? round.adl : null;
  const adlInterp = adl === null ? null : interpretBarthel(adl);

  return (
    <Popup
      open={open}
      onClose={onClose}
      title='ประวัติการเยี่ยมบ้าน'
      subtitle={`บันทึกการเยี่ยมย้อนหลังของ ${patientName || 'ผู้รับบริการ'} — เลือกครั้งที่ต้องการดูรายละเอียดจากรางด้านซ้าย`}
      size='extraLarge'
      /* ป๊อปอัปคุมความสูงเอง แล้วให้สองคอลัมน์ยืดเต็ม — ไม่งั้นกล่องขวาจะสูงตาม
         เนื้อหาแล้วเหลือพื้นที่ว่างครึ่งล่าง (มติผู้ใช้ 30 ส.ค. 69) */
      bodyScrollable={false}
      primaryAction={{ label: 'ปิด', onClick: onClose }}
    >
      {rounds.length === 0 ? (
        <div style={{ ...valueStyle, padding: 'var(--dim-space-600)' }}>
          ยังไม่มีประวัติการเยี่ยมบ้านของผู้รับบริการรายนี้ — การเยี่ยมครั้งนี้จะเป็นครั้งแรกที่บันทึกเข้าระบบ
        </div>
      ) : (
        <div
          className='flex w-full items-stretch'
          style={{ gap: 'var(--dim-space-500)', height: '100%', minHeight: 0, flexWrap: 'wrap' }}
        >
          {/* รางวันที่ (ซ้าย) — ทรงเดียวกับรางวันที่ของป๊อปอัป EMR */}
          <div
            className='flex flex-col'
            style={{ flex: '0 0 260px', minWidth: 220, gap: 'var(--dim-space-200)', minHeight: 0, overflowY: 'auto' }}
          >
            {rounds.map((r, i) => (
              <RoundRailButton
                key={`${r.date}-${r.no}`}
                round={r}
                active={i === selected}
                onClick={() => setSelected(i)}
              />
            ))}
          </div>

          {/* รายละเอียดของครั้งที่เลือก (ขวา) */}
          <div
            className='flex flex-col'
            style={{
              flex: '1 1 420px',
              minWidth: 320,
              gap: 'var(--dim-space-500)',
              padding: 'var(--dim-space-500)',
              borderRadius: 'var(--dim-radius-400)',
              background: 'var(--surface-neutral-quaternary, #F9FBFB)',
              minHeight: 0,
              height: '100%',
              overflowY: 'auto',
            }}
          >
            <div className='flex flex-col' style={{ gap: 'var(--dim-space-200)' }}>
              <SectionTitle icon='event'>ข้อมูลการเยี่ยม</SectionTitle>
              <Row label='ครั้งที่' value={`${round.no}`} />
              <Row label='วันที่เยี่ยม' value={formatHomeVisitDate(round.date)} />
              <Row label='ผู้เยี่ยม' value={round.by} />
              <Row label='วิชาชีพ' value={resolveProfession(round.profession)?.label} />
            </div>

            <div className='flex flex-col' style={{ gap: 'var(--dim-space-200)' }}>
              <SectionTitle icon='favorite'>สัญญาณชีพ</SectionTitle>
              {VITAL_ROWS.map((v) => {
                const raw = round.vitals?.[v.key];
                const value = v.render ? v.render(round.vitals || {}) : (raw ? `${raw} ${v.unit || ''}`.trim() : '');
                return <Row key={v.key} label={v.label} value={value} />;
              })}
            </div>

            <div className='flex flex-col' style={{ gap: 'var(--dim-space-200)' }}>
              <SectionTitle icon='accessible'>ความสามารถในการทำกิจวัตร (ADL)</SectionTitle>
              {adl === null ? (
                <Row label='คะแนน ADL' value='' />
              ) : (
                <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
                  <span style={labelStyle}>คะแนน ADL</span>
                  <span style={{ ...valueStyle, flex: '0 0 auto' }}>{adl}/{BARTHEL_MAX_SCORE}</span>
                  <ColorfulBadge badgeStyle={adlInterp.badge} hierarchy='secondary' size='small' width='hug'>
                    {adlInterp.label}
                  </ColorfulBadge>
                </div>
              )}
            </div>

            <div className='flex flex-col' style={{ gap: 'var(--dim-space-200)' }}>
              <SectionTitle icon='clipboard-list'>สรุปการเยี่ยมและคำสั่งการรักษา</SectionTitle>
              <Row label='สรุปการเยี่ยม' value={round.summary} />
              <Row label='คำสั่งการรักษา' value={round.orders} />
            </div>
          </div>
        </div>
      )}
    </Popup>
  );
};

export default HomeVisitHistoryPopup;
