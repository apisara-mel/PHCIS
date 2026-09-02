import React, { useMemo, useState } from 'react';
import Popup from '@/components/popup/Popup';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import Icon from '@/components/icons/Icon';
import { getVisitHistory, describeToolScores } from '@/data/homevisitRegistry';
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


/* ══════════════ แบบบันทึกทั้งใบของการเยี่ยมครั้งนั้น ══════════════
   ตั้งแต่ 2 ก.ย. 69 การกด "ส่งข้อมูลเข้าศูนย์ฯ" เก็บสำเนา `form` ไว้กับประวัติ
   ป๊อปอัปนี้จึงกางได้ทุกช่องที่ทีมกรอกจริง ไม่ใช่แค่สัญญาณชีพ/ADL/สรุป
   (ครั้งเก่าที่ไม่มี `form` จะไม่มีหมวดเหล่านี้ขึ้นมา — ไม่ได้หายไปไหน) */

const VISIT_TYPE_LABEL = { first: 'เยี่ยมครั้งแรก (แรกรับ)', followup: 'เยี่ยมติดตาม' };

const text = (v) => String(v ?? '').trim();

const yesNo = (v) => (v ? 'มี' : '');

const addressLine = (a) => {
  if (!a) return '';
  const parts = [a.houseNo, a.moo && `หมู่ ${a.moo}`, a.road, a.subdistrict, a.district, a.province, a.zip];
  return parts.filter((x) => text(x)).join(' ');
};

const listOf = (rows, render) => (rows || []).map(render).filter((v) => text(v)).join('\n');

/** หมวด/แถวทั้งหมดของแบบบันทึก — ตัดแถวที่ว่างทิ้ง แล้วตัดหมวดที่ไม่เหลือแถวทิ้ง */
const buildFormSections = (form) => {
  if (!form) return [];
  const sections = [
    {
      key: 'service', icon: 'event_available', title: 'ข้อมูลการให้บริการ',
      rows: [
        ['ประเภทการเยี่ยม', VISIT_TYPE_LABEL[form.visitType] || form.visitType],
        ['วันที่ให้บริการ', form.serviceDate ? formatHomeVisitDate(form.serviceDate) : ''],
        ['เวลาที่ถึงบ้าน', form.arrivalTime],
        ['ทีมผู้เยี่ยม', Array.isArray(form.team) ? form.team.join(' · ') : form.team],
      ],
    },
    {
      key: 'address', icon: 'map-pin', title: 'ที่อยู่และการเดินทาง',
      rows: [
        ['ที่อยู่ตามทะเบียนบ้าน', addressLine(form.addressRegistered)],
        ['ที่อยู่ปัจจุบัน', addressLine(form.addressCurrent)],
        ['บันทึกการเดินทาง', form.travelNote],
      ],
    },
    {
      key: 'contact', icon: 'call', title: 'ข้อมูลการติดต่อ',
      rows: [
        ['เบอร์โทรศัพท์', form.phone],
        ['อีเมล', form.email],
        ['ผู้ติดต่อฉุกเฉิน', listOf(form.emergency, (e) => [e.name, e.last, e.relation, e.phone].filter(Boolean).join(' '))],
      ],
    },
    {
      key: 'allergy', icon: 'flag', title: 'ประวัติการแพ้ · โรคประจำตัว',
      rows: [
        ['มีประวัติการแพ้', yesNo(form.flags?.allergyDrug)],
        ['รายละเอียดการแพ้', form.allergyFreeText],
        ['มีโรคประจำตัว', yesNo(form.flags?.chronic)],
        ['รายละเอียดโรคประจำตัว', form.chronicFreeText],
        ['หมายเหตุเพิ่มเติม', form.allergyNote],
      ],
    },
    {
      key: 'illness', icon: 'stethoscope', title: 'ประเมินอาการป่วย',
      rows: [
        ['อาการสำคัญ (CC)', form.chiefComplaint],
        ['ระยะเวลาที่มีอาการ', form.duration],
        ['ประวัติการเจ็บป่วยปัจจุบัน', form.illnessHistory],
        ['บันทึกสัญญาณชีพเพิ่มเติม', form.vitalsNote],
      ],
    },
    {
      key: 'assessment', icon: 'clipboard-list', title: 'ประเมินและคัดกรอง',
      rows: [
        ['ผู้ดูแลหลัก', form.caregiver],
        ['ภาวะโภชนาการ', form.nutrition],
        ['แผลกดทับ', form.pressureSore],
        ['ระดับความปวด', form.painScore === null || form.painScore === undefined ? '' : `${form.painScore}/10`],
        ['PPS', form.pps ? `${form.pps}%` : ''],
        ['สรุปการประเมิน', form.assessmentNote],
      ],
    },
    {
      key: 'plan', icon: 'family_restroom', title: 'Family Folder และแผนการดูแล',
      rows: [
        ['สมาชิกในครอบครัว', listOf(form.familyMembers, (m) => [m.name, m.relation, m.age && `${m.age} ปี`].filter(Boolean).join(' · '))],
        ['บันทึก Family Folder', form.familyNote],
        ['นัดเยี่ยมครั้งถัดไป', form.nextVisitDate ? formatHomeVisitDate(form.nextVisitDate) : ''],
        ['แผนการดูแลต่อเนื่อง', form.planNote],
      ],
    },
  ];

  return sections
    .map((sec) => ({ ...sec, rows: sec.rows.filter(([, value]) => text(value)) }))
    .filter((sec) => sec.rows.length > 0);
};

const HomeVisitHistoryPopup = ({ open, onClose, hn, patientName }) => {
  /* ครั้งล่าสุดขึ้นก่อน — คนเปิดดูมักถามว่า "ครั้งที่แล้วเจออะไร" */
  const rounds = useMemo(() => (hn ? getVisitHistory(hn).slice().reverse() : []), [hn]);
  const [selected, setSelected] = useState(0);
  const round = rounds[selected] || null;
  const adl = round && round.adl !== null && round.adl !== undefined ? round.adl : null;
  const adlInterp = adl === null ? null : interpretBarthel(adl);
  const toolScores = round ? describeToolScores(round.toolScores) : [];
  const formSections = useMemo(() => buildFormSections(round?.form), [round]);

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

            {/* เครื่องมือมาตรฐานของครั้งนั้น (TOR ๑.๑๐.๑๒.๔) — ต้องอ่านได้จาก
                ป๊อปอัปนี้ด้วย ไม่ใช่เฉพาะหน้าติดตาม เพราะทีมเยี่ยมเปิดดูระหว่าง
                กำลังบันทึกอยู่เพื่อเทียบกับที่กำลังประเมินอยู่ตรงหน้า */}
            <div className='flex flex-col' style={{ gap: 'var(--dim-space-200)' }}>
              <SectionTitle icon='clipboard'>แบบประเมินมาตรฐาน (MNA-SF · 9Q · PPS)</SectionTitle>
              {toolScores.length === 0 ? (
                <Row label='ผลการประเมิน' value='' />
              ) : toolScores.map((t) => (
                <div key={t.key} className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
                  <span style={labelStyle}>{t.label}</span>
                  <span style={{ ...valueStyle, flex: '0 0 auto' }}>
                    {t.unit === '%' ? `${t.total}%` : `${t.total}/${t.max}`}
                  </span>
                  {t.interp?.badge && (
                    <ColorfulBadge badgeStyle={t.interp.badge} hierarchy='secondary' size='small' width='hug'>
                      {t.interp.label}
                    </ColorfulBadge>
                  )}
                </div>
              ))}
              {round.toolsMock && (
                <span style={{ ...valueStyle, fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
                  ครั้งนี้บันทึกไว้ก่อนระบบมีขั้น “ประเมินและคัดกรอง” — คะแนนเป็นค่าจำลอง ไม่ใช่ผลประเมินจริง
                </span>
              )}
            </div>

            <div className='flex flex-col' style={{ gap: 'var(--dim-space-200)' }}>
              <SectionTitle icon='clipboard-list'>สรุปการเยี่ยมและคำสั่งการรักษา</SectionTitle>
              <Row label='สรุปการเยี่ยม' value={round.summary} />
              <Row label='คำสั่งการรักษา' value={round.orders} />
            </div>

            {/* ทุกช่องที่ทีมกรอกไว้ในแบบบันทึกของครั้งนั้น (มติผู้ใช้ 2 ก.ย. 69) */}
            {formSections.map((sec) => (
              <div key={sec.key} className='flex flex-col' style={{ gap: 'var(--dim-space-200)' }}>
                <SectionTitle icon={sec.icon}>{sec.title}</SectionTitle>
                {sec.rows.map(([label, value]) => (
                  <Row key={label} label={label} value={value} />
                ))}
              </div>
            ))}

            {!round.form && (
              <span style={{ ...valueStyle, fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
                การเยี่ยมครั้งนี้บันทึกไว้ก่อนระบบเก็บแบบบันทึกทั้งใบ — แสดงได้เท่าที่มีในประวัติ
              </span>
            )}
          </div>
        </div>
      )}
    </Popup>
  );
};

export default HomeVisitHistoryPopup;
