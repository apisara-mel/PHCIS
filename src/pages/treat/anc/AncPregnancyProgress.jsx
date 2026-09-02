import React from 'react';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import Tooltip from '@/components/tooltip/Tooltip';
import {
  calculateGestationalAge, calculateEDC, formatAncDate, resolveAncRiskLevel,
  getAncVisitHistoryByHn,
} from '@/data/ancVisits';

/* Recommended activities per gestational-age band — same tier boundaries
   as `getAncVisitTier` (ancVisits.js) and the official manual's trimester
   activity table (pp.4-8), condensed to a hover suggestion rather than
   every catalog item verbatim. */
const PERIOD_SUGGESTIONS = [
  {
    from: 0, to: 12, label: 'ก่อน 12 สัปดาห์',
    items: [
      'Lab ครั้งที่ 1 (CBC/หมู่เลือด/VDRL/Anti-HIV/HBsAg)',
      'ตรวจปัสสาวะ',
      'คัดกรองดาวน์ซินโดรม + ธาลัสซีเมีย',
    ],
  },
  {
    from: 12, to: 20, label: '12-19 สัปดาห์',
    items: [
      'คัดกรองดาวน์ซินโดรม (14-18 สัปดาห์)',
      'Ultrasound ครั้งที่ 2 (20 สัปดาห์)',
    ],
  },
  {
    from: 20, to: 28, label: '20-27 สัปดาห์',
    items: [
      'คัดกรองเบาหวาน GCT (24-28 สัปดาห์)',
    ],
  },
  {
    from: 28, to: 40, label: '28-40 สัปดาห์',
    items: [
      'Lab ครั้งที่ 2',
      'ยืนยันเบาหวาน OGTT (30 สัปดาห์)',
      'วัคซีน dT/Tdap, ไข้หวัดใหญ่, Covid-19',
      'ยาเสริมธาตุเหล็ก/โฟลิก/ไอโอดีน/แคลเซียม',
      'Ultrasound ครั้งที่ 3 (34 สัปดาห์)',
      'NST + ตรวจน้ำคร่ำ (40 สัปดาห์)',
    ],
  },
];

/* AncPregnancyProgress — sits between PatientCard and the step shell on
   every ANC step, so gestational-age context (คิวคิ trimester 1/2/3, current
   GA marker, EDC) never scrolls out of view while charting. Matches the
   card-mockup layout: G/P/A + GA + PDPA/risk badges above a 0-40 week
   trimester timeline (boundaries at 12/28 wks per the official manual's
   trimester table, pp.4-8). Renders nothing until an LMP is on file — there
   is no gestational age to show before then. */

const parseAgeYears = (ageStr) => {
  const m = /(\d+)\s*ปี/.exec(ageStr || '');
  return m ? Number(m[1]) : null;
};

const clampWeeks = (w) => Math.max(0, Math.min(40, w));
const pctOf = (w) => `${(clampWeeks(w) / 40) * 100}%`;

const tickLabelStyle = {
  position: 'absolute',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-xs, 12px)',
  color: 'var(--text-content-tertiary, #858c92)',
  whiteSpace: 'nowrap',
};

/* ระยะแนวตั้งของเส้นเวลา — โหมดปกติเป็นการ์ดเต็ม ส่วนโหมดย่อ (`compact`)
   ไปอยู่แถวเดียวกับสัญญาณชีพใต้แถบขั้นตอน (มติผู้ใช้ 2 ก.ย. 69) จึงบีบทุกระยะ
   ลงครึ่งหนึ่งและตัดคำว่า "ไตรมาส" ออก เหลือหลักไมล์ที่อ่านจากตัวเลขได้เอง */
const SPINE = {
  full:    { box: 56, bar: 24, barH: 8, dot: 21, dotSize: 12, tick: 40, zone: 40 },
  compact: { box: 36, bar: 15, barH: 5, dot: 13, dotSize: 8,  tick: 22, zone: 22 },
};

const AncPregnancyProgress = ({ form, cardPatient, ancHn, visitNo, compact = false }) => {
  const ga = calculateGestationalAge(form?.lmp);
  if (!ga) return null;

  const edc = calculateEDC(form?.lmp);
  const gestWeeks = ga.weeks + ga.days / 7;
  const sp = compact ? SPINE.compact : SPINE.full;
  /* ใช้กับหมุดบนเส้นเวลาเท่านั้น — ป้าย G-P-A/GA บนหัวการ์ดย้ายไปอยู่แถว
     สัญญาณชีพใต้แถบขั้นตอนแล้ว (มติผู้ใช้ 2 ก.ย. 69) */
  const gaLabel = `GA ${ga.weeks}${ga.days ? `+${ga.days}` : ''} สัปดาห์`;

  const ageYears = parseAgeYears(cardPatient?.age);
  const isMinor = ageYears !== null && ageYears < 18;
  const riskInfo = resolveAncRiskLevel(form?.riskLevel);
  const dangerActive = Object.values(form?.dangerSigns || {}).some(Boolean);
  const gdmConfirmed = !!form?.gdmConfirmed;

  /* Prior visits, placed on the timeline at the gestational age they
     happened. This is the legacy exam grid's job (คู่มือระบบงานฝากครรภ์
     p.2-10 lists every visit above the current one) expressed in the form
     the record already has: a pregnancy IS a 40-week line, which is why
     the paper สมุดฝากครรภ์ is laid out this way too. Each marker is
     coloured by the risk recorded AT that visit, so the spine answers
     "where are we, what has happened, was anything wrong" in one read. */
  const priorVisits = (getAncVisitHistoryByHn(ancHn) || [])
    .map((v, i) => ({ ...v, weeks: Number(v.gestWeeks), seq: v.visitNo ?? i + 1 }))
    .filter((v) => Number.isFinite(v.weeks));

  /* Everything that needs a decision today, gathered in one place instead
     of scattered across the header, Step 2 and Step 3. Only rendered when
     non-empty — an empty strip would train the eye to ignore the row. */
  const alerts = [
    dangerActive && { key: 'danger', tone: 'red', dot: true, label: 'พบสัญญาณอันตราย — ควรส่งต่อทันที' },
    riskInfo && riskInfo.value !== 'low' && {
      key: 'risk', tone: riskInfo.value === 'high' ? 'red' : 'yellow', label: riskInfo.label,
    },
    gdmConfirmed && { key: 'gdm', tone: 'red', label: 'เบาหวานขณะตั้งครรภ์ (GDM)' },
    isMinor && { key: 'minor', tone: 'yellow', label: 'อายุ <18 → ยินยอมโดยผู้ปกครอง (PDPA)' },
  ].filter(Boolean);

  return (
    <div
      className={compact ? 'flex items-center' : 'w-full'}
      style={compact
        /* แคบลงอีกและดันไปชิดขวาสุดของแถว (มติผู้ใช้ 2 ก.ย. 69) */
        ? {
          flex: '0 0 auto',
          width: 220,
          minWidth: 180,
          gap: 'var(--dim-space-300, 12px)',
        }
        : {
          background: 'var(--surface-card-100, #FFFFFF)',
          borderRadius: 'var(--dim-radius-300, 10px)',
          boxShadow: 'var(--shadow-card)',
          padding: 'var(--dim-space-400, 16px) var(--dim-space-600, 24px)',
          margin: 'var(--dim-space-400, 16px) var(--dim-space-600, 24px) 0',
          width: 'auto',
        }}
    >
      {/* ป้าย G-P-A และ GA ย้ายไปอยู่แถวเดียวกับสัญญาณชีพแล้ว (มติผู้ใช้ 2 ก.ย. 69)
          — แถวบนสุดจึงเหลือแค่คำอธิบายจุดบนเส้น และแสดงเมื่อมีจุดให้ชี้จริง */}
      {!compact && priorVisits.length > 0 && (
        <div
          className='flex flex-wrap items-center'
          style={{ gap: 'var(--dim-space-200, 8px)', marginBottom: 'var(--dim-space-500, 20px)' }}
        >
          <span
            style={{
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-xs, 12px)',
              color: 'var(--text-content-secondary, #636B72)',
            }}
          >
            ฝากครรภ์มาแล้ว {priorVisits.length} ครั้ง — ชี้ที่จุดบนเส้นเพื่อดูผลตรวจครั้งนั้น
          </span>
        </div>
      )}

      {/* Trimester timeline — 0 to 40 weeks, marker at current GA */}
      <div className='relative w-full min-w-0' style={{ height: sp.box }}>
        <div
          className='absolute flex flex-col items-center'
          style={{ left: pctOf(gestWeeks), transform: 'translateX(-50%)', top: 0 }}
        >
          <span
            style={{
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-xs, 12px)',
              fontWeight: 'var(--type-weight-bold, 700)',
              color: 'var(--text-brandPrimary-default, #007549)',
              whiteSpace: 'nowrap',
            }}
          >
            ▲ {gaLabel}
          </span>
        </div>

        <div
          className='absolute w-full'
          style={{
            top: sp.bar,
            height: sp.barH,
            borderRadius: 'var(--dim-radius-full, 9999px)',
            background: 'var(--surface-neutralButton-tertiary, #F4F5F5)',
          }}
        >
          <div
            style={{
              height: '100%',
              width: pctOf(gestWeeks),
              borderRadius: 'var(--dim-radius-full, 9999px)',
              background: 'var(--surface-brandPrimary-default, #007549)',
              transition: 'width 300ms ease',
            }}
          />
          {/* Thin weekly tick marks — a ruler reading of the 0-40 week
              scale, on top of both the filled and unfilled portions.
              `multiply` blend keeps them visible against the green fill
              AND the light grey track without needing two tick colours. */}
          {Array.from({ length: 39 }, (_, i) => i + 1).map((w) => (
            <div
              key={w}
              className='absolute'
              style={{
                left: pctOf(w),
                top: 0,
                width: 1,
                height: '100%',
                background: 'rgba(0, 0, 0, 0.16)',
                mixBlendMode: 'multiply',
                transform: 'translateX(-50%)',
                pointerEvents: 'none',
              }}
            />
          ))}
        </div>

        {/* Hover suggestion zones — one per gestational-age band, each
            showing what should be checked/ordered during that period
            (matches getAncVisitTier's boundaries). Spans the full row
            height (not just the thin track) so the hit target is easy
            to land on, not just an 8px-tall strip. */}
        {PERIOD_SUGGESTIONS.map((p) => (
          <div
            key={p.label}
            className='absolute'
            style={{
              left: pctOf(p.from),
              width: `${((Math.min(p.to, 40) - p.from) / 40) * 100}%`,
              top: 0,
              height: sp.zone,
              cursor: 'help',
              zIndex: 1,
            }}
          >
            <Tooltip
              position='top'
              variant='light'
              maxWidth={420}
              className='w-full h-full'
              content={
                <div style={{
                  textAlign: 'left',
                  fontFamily: 'var(--type-family-body)',
                  fontSize: 'var(--type-size-xs, 12px)',
                  lineHeight: 1.5,
                }}
                >
                  <div style={{ fontWeight: 'var(--type-weight-bold, 700)', marginBottom: 'var(--dim-space-100, 4px)' }}>
                    {p.label} — แนะนำตรวจ
                  </div>
                  {p.items.map((item) => (
                    <div key={item}>• {item}</div>
                  ))}
                </div>
              }
            >
              <div style={{ width: '100%', height: '100%' }} />
            </Tooltip>
          </div>
        ))}

        {/* Prior-visit markers. Sit above the period hover zones (z-index)
            so the specific reading wins over the general band tooltip. */}
        {priorVisits.map((v) => {
          const tone = resolveAncRiskLevel(v.riskLevel)?.tone;
          return (
            <div
              key={`${v.seq}-${v.date}`}
              className='absolute'
              style={{
                left: pctOf(v.weeks),
                top: sp.dot,
                transform: 'translateX(-50%)',
                zIndex: 2,
              }}
            >
              {/* Opens downward: the markers sit directly beneath the
                  sticky PatientCard, and a top-positioned tooltip collides
                  with it — the header's text shows through the panel. */}
              <Tooltip
                position='bottom'
                variant='light'
                maxWidth={380}
                content={
                  <div style={{
                    textAlign: 'left',
                    fontFamily: 'var(--type-family-body)',
                    fontSize: 'var(--type-size-xs, 12px)',
                    lineHeight: 1.5,
                  }}
                  >
                    <div style={{ fontWeight: 'var(--type-weight-bold, 700)', marginBottom: 'var(--dim-space-100, 4px)' }}>
                      ครั้งที่ {v.seq} · {v.date} · {v.weeks} สัปดาห์
                    </div>
                    <div>BP {v.bp || '—'} · น้ำหนัก {v.weight ?? '—'} กก.</div>
                    <div>ยอดมดลูก {v.fundusHeight || '—'} · FHR {v.fetalHeartRate || '—'}</div>
                    <div>ปัสสาวะ {v.urineResult || '—'}</div>
                    {v.note && v.note !== '-' && <div style={{ marginTop: 4 }}>{v.note}</div>}
                  </div>
                }
              >
                <div
                  style={{
                    width: sp.dotSize,
                    height: sp.dotSize,
                    borderRadius: 'var(--dim-radius-full, 9999px)',
                    background: tone?.fg || 'var(--text-content-tertiary, #858c92)',
                    border: 'var(--dim-stroke-200, 2px) solid var(--surface-card-100, #FFFFFF)',
                    cursor: 'help',
                    boxSizing: 'content-box',
                  }}
                />
              </Tooltip>
            </div>
          );
        })}

        {!compact && (
          <>
            <span style={{ ...tickLabelStyle, top: sp.tick, left: pctOf(0) }}>ไตรมาส 1</span>
            <span style={{ ...tickLabelStyle, top: sp.tick, left: pctOf(30), transform: 'translateX(-50%)' }}>ไตรมาส 3</span>
            <span style={{ ...tickLabelStyle, top: sp.tick, left: pctOf(12), transform: 'translateX(-50%)' }}>12</span>
            <span style={{ ...tickLabelStyle, top: sp.tick, left: pctOf(28), transform: 'translateX(-50%)' }}>28</span>
          </>
        )}
        <span style={{ ...tickLabelStyle, top: sp.tick, left: pctOf(40), transform: 'translateX(-100%)' }}>
          {compact ? formatAncDate(edc) || '—' : `ครบกำหนด ${edc ? formatAncDate(edc) : '—'}`}
        </span>
      </div>

      {/* The one loud element on the screen. Everything above is neutral so
          that when this appears it is unmissable — the manual's rule is
          "พบภาวะเสี่ยงข้อใดข้อหนึ่งต้องส่งต่อหรือรายงานแพทย์", which only
          works if the clinician cannot scroll past it. */}
      {alerts.length > 0 && (
        <div
          className='flex flex-wrap items-center shrink-0'
          style={compact
            ? { gap: 'var(--dim-space-200, 8px)' }
            : {
              gap: 'var(--dim-space-200, 8px)',
              marginTop: 'var(--dim-space-400, 16px)',
              paddingTop: 'var(--dim-space-400, 16px)',
              borderTop: 'var(--dim-stroke-100, 1px) solid var(--border-neutralButton-tertiary, #E2E4E6)',
            }}
        >
          {alerts.map((a) => (
            <ColorfulBadge key={a.key} style={a.tone} size={compact ? 'small' : 'medium'} hierarchy='secondary' width='hug' showDot={a.dot}>
              {a.label}
            </ColorfulBadge>
          ))}
        </div>
      )}
    </div>
  );
};

export default AncPregnancyProgress;
