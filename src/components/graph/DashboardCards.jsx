import React, { useState } from 'react';
import Icon from '@/components/icons/Icon';
import {
  Donut, HBarList, VBars, LineChart, Gauge, Pyramid,
} from '@/components/graph/Charts';

/* MIH DashboardCards — self-contained dashboard chart cards extracted from
   /dashboard. Each card owns its own interaction state and ships with
   default data baked in, so it can be dropped onto any page without props.
   Override `rows` / `data` / `title` to feed real data. */

/* ── Internal helpers ─────────────────────────────────────── */

const Card = ({ title, icon, action, children, className = '', headerClassName = '' }) => (
  <section className={`bg-surface-card rounded-card shadow-card flex flex-col border-0 ${className}`}>
    {(title || icon || action) && (
      <header
        className={`flex items-center gap-2 px-4 py-3 border-b shadow-header border-b-0 ${headerClassName}`}
        /* borderBottomColor inline — Tailwind v2.1 JIT parses `border-[var(...)]`
           as border-width, so the class can't tint this rule. */
        style={{ borderBottomColor: 'var(--border-brandPrimary-quaternary)' }}
      >
        {icon && <span className='text-brand-500'><Icon name={icon} size={18} /></span>}
        <h3 className='flex-1 text-sm font-bold text-ink truncate'>{title}</h3>
        {action ?? (
          <button
            type='button'
            aria-label='options'
            className='w-7 h-7 flex items-center justify-center rounded-md text-ink-tertiary hover:bg-ink-neutral'
          >
            <Icon name='kebab-vertical' size={16} />
          </button>
        )}
      </header>
    )}
    <div className='flex-1 px-4 pb-4 pt-10 align-middle'>{children}</div>
  </section>
);

const TONE_COLOR = {
  brand:   'var(--brand-p700)',
  success: 'var(--text-pill-green)',
  teal:    'var(--text-pill-teal)',
  indigo:  'var(--text-pill-blue)',
  info:    'var(--text-pill-blue)',
  warning: 'var(--text-pill-orange)',
  danger:  'var(--text-pill-red)',
};
const TONE_BG = {
  brand:   'var(--brand-p100)',
  success: 'var(--surface-pill-green)',
  teal:    'var(--surface-pill-teal)',
  indigo:  'var(--surface-pill-blue)',
  info:    'var(--surface-pill-blue)',
  warning: 'var(--surface-pill-orange)',
  danger:  'var(--surface-pill-red)',
};

const Stat = ({ tone = 'brand', value, label, color }) => (
  <div className='flex items-center gap-2'>
    <span className='w-2.5 h-2.5 rounded-full shrink-0' style={{ background: color ?? TONE_COLOR[tone] }} />
    <span className='text-ink font-bold tabular-nums'>{value}</span>
    <span className='text-ink-tertiary'>{label}</span>
  </div>
);

const BigStat = ({ value, label, tone = 'brand', color, bg }) => (
  <div
    className='rounded-lg p-3 flex flex-col items-center text-center'
    style={{ background: bg ?? TONE_BG[tone], color: color ?? TONE_COLOR[tone] }}
  >
    <span className='text-base font-bold tabular-nums'>{value}</span>
    <span className='text-[10px] leading-tight mt-0.5'>{label}</span>
  </div>
);

const PersonStat = ({ avatar, materialSymbol, value, label }) => (
  <div className='flex items-center gap-2 p-2 rounded-lg bg-brand-50'>
    <span className='w-9 h-9 rounded-full bg-surface-card text-lg flex items-center justify-center text-ink-secondary'>
      {materialSymbol != null ? (
        <span className='material-symbols-outlined text-[22px] leading-none' aria-hidden>
          {materialSymbol}
        </span>
      ) : (
        avatar
      )}
    </span>
    <div className='flex flex-col'>
      <span className='text-sm font-bold text-ink tabular-nums'>{value}</span>
      <span className='text-[10px] text-ink-tertiary'>{label}</span>
    </div>
  </div>
);

/* ── Default datasets (mirror /dashboard live data) ───────── */

export const DEFAULT_TOP10 = [
  { label: 'โรคเบาหวานชนิดที่ 2',                value: 9620, second: 12471 },
  { label: 'โรคหัวใจขาดเลือด',                  value: 7820, second: 11084 },
  { label: 'ความดันโลหิตสูง',                   value: 6810, second: 8790  },
  { label: 'ภาวะความเครียด',                    value: 5720, second: 7501  },
  { label: 'โรคผิวหนัง',                         value: 4530, second: 5612  },
  { label: 'ปวดศีรษะแบบรุนแรง',                  value: 3920, second: 4730  },
  { label: 'ปวดหลัง',                            value: 3010, second: 3812  },
  { label: 'ภูมิแพ้ที่ผิวหนัง',                   value: 2580, second: 2901  },
  { label: 'โรคหัวใจ',                            value: 1900, second: 2110  },
  { label: 'ปวดท้องเรื้อรัง/ระบบทางเดิน',         value: 1260, second: 1340  },
];

export const DEFAULT_PYRAMID = [
  { label: '0-9',   male:  650, female:  720 },
  { label: '10-19', male:  920, female:  890 },
  { label: '20-29', male: 1210, female: 1340 },
  { label: '30-39', male: 1820, female: 2080 },
  { label: '40-49', male: 2110, female: 2360 },
  { label: '50-59', male: 1950, female: 2240 },
  { label: '60-69', male: 1450, female: 1820 },
  { label: '70-79', male:  920, female: 1180 },
  { label: '80+',   male:  410, female:  560 },
];

const MONTHS = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];

export const DEFAULT_VISITS_LINE = {
  months: MONTHS,
  series: [
    { label: 'ชาย',  color: '#6366F1', values: [820, 950, 1100, 980, 1280, 1340, 1280, 1180, 1080, 1240, 1320, 1410] },
    { label: 'หญิง', color: '#EC4899', values: [880, 1020, 1180, 1110, 1390, 1460, 1430, 1320, 1250, 1380, 1480, 1540] },
  ],
};

export const DEFAULT_DM_HT_BARS = {
  months: MONTHS,
  series: [
    { label: 'เบาหวาน',          color: '#14B8A6', values: [50,72,79,72,42,46,52,48,38,42,28,18] },
    { label: 'ความดัน',           color: '#6366F1', values: [12,14,18,17,28,28,16,18,11,14,8,6] },
    { label: 'เบาหวานร่วมความดัน', color: '#EC4899', values: [8,9,12,10,12,11,13,12,8,9,6,4] },
  ],
};

export const DEFAULT_DISEASE_21_GROUPS = [
  { label: '1. โรคติดเชื้อและปรสิต',                value: 8420,  second: 12340 },
  { label: '2. เนื้องอก (มะเร็ง)',                    value: 1820,  second:  3120 },
  { label: '3. โรคเลือดและอวัยวะสร้างเลือด',          value:  960,  second:  1480 },
  { label: '4. โรคต่อมไร้ท่อ โภชนาการ',              value: 11240, second: 19560 },
  { label: '5. ความผิดปกติทางจิตและพฤติกรรม',         value: 3640,  second:  5210 },
  { label: '6. โรคระบบประสาท',                       value: 2310,  second:  3470 },
  { label: '7. โรคตาและส่วนแวดล้อม',                 value: 4120,  second:  5870 },
  { label: '8. โรคหู',                                value: 1730,  second:  2240 },
  { label: '9. โรคระบบไหลเวียนเลือด',                value: 12480, second: 21340 },
  { label: '10. โรคระบบหายใจ',                       value: 14620, second: 23150 },
  { label: '11. โรคระบบย่อยอาหาร',                   value: 7820,  second: 10970 },
  { label: '12. โรคผิวหนังและเนื้อเยื่อใต้ผิวหนัง',    value: 5340,  second:  6810 },
  { label: '13. โรคระบบกล้ามเนื้อและโครงร่าง',        value: 6780,  second:  9420 },
  { label: '14. โรคระบบสืบพันธุ์-ปัสสาวะ',            value: 3920,  second:  5230 },
  { label: '15. การตั้งครรภ์ คลอดบุตร',              value: 1240,  second:  1830 },
  { label: '16. ภาวะระยะปริกำเนิด',                  value:  420,  second:   610 },
  { label: '17. รูปวิรูปแต่กำเนิด',                   value:  280,  second:   340 },
  { label: '18. อาการ/อาการแสดงไม่จำแนก',           value: 4180,  second:  5720 },
  { label: '19. การบาดเจ็บและพิษ',                   value: 5240,  second:  7180 },
  { label: '20. สาเหตุภายนอกของการเจ็บป่วย',        value: 1380,  second:  1620 },
  { label: '21. ปัจจัยที่มีผลต่อสุขภาพ',              value: 3140,  second:  4250 },
];

export const DEFAULT_VISIT_DONUT = [
  { label: 'คนที่มาใช้บริการ', value: 75373, color: '#14B8A6' },
  { label: 'คนที่ยังไม่มาใช้',   value: 41954, color: '#EC4899' },
];

export const DEFAULT_RIGHTS_DONUT = [
  { label: 'สิทธิประกันสังคม', value: 60, color: '#14B8A6' },
  { label: 'สิทธิข้าราชการ',    value: 22, color: '#6366F1' },
  { label: 'ประกันสุขภาพ',     value: 12, color: '#EC4899' },
  { label: 'อื่นๆ',              value:  6, color: '#F59E0B' },
];

/* ── Dashboard cards ──────────────────────────────────────── */

export const Top10DiseasesCard = ({ rows = DEFAULT_TOP10, title = 'Top 10 อันดับโรคที่พบบ่อย' }) => {
  const [active, setActive] = useState(null);
  return (
    <Card title={title} icon='clipboard-list' className='border-0' headerClassName='border-b-0'>
      <HBarList rows={rows} activeIndex={active} onRowClick={(i) => setActive((cur) => (cur === i ? null : i))} />
      {active != null && (
        <div className='mt-3 p-2 rounded-md bg-brand-50 border border-brand-200 text-xs text-ink-secondary flex items-center justify-between'>
          <span><strong className='text-brand-500'>{rows[active].label}</strong> · {rows[active].value.toLocaleString()} คน · {rows[active].second.toLocaleString()} ครั้ง</span>
          <button onClick={() => setActive(null)} className='text-ink-tertiary hover:text-ink' aria-label='ปิด'>
            <Icon name='x' size={12} />
          </button>
        </div>
      )}
    </Card>
  );
};

export const VisitTotalCard = ({
  segments = DEFAULT_VISIT_DONUT,
  centerLabel = '117,327',
  centerSub = 'คน',
  stats = [
    { color: '#6366F1', value: '117,327', label: 'คนทั้งหมด' },
    { color: '#14B8A6', value: '75,373',  label: 'คนที่มาใช้บริการ' },
    { color: '#EC4899', value: '159',     label: 'ผู้ป่วยกลุ่มเสี่ยง' },
  ],
  title = 'ผู้รับบริการทั้งหมด',
}) => {
  const [active, setActive] = useState(null);
  return (
    <Card title={title} icon='users' className='border-0' headerClassName='border-b-0'>
      <div className='flex items-center gap-4'>
        <Donut
          size={120}
          thickness={20}
          centerLabel={centerLabel}
          centerSub={centerSub}
          segments={segments}
          activeIndex={active}
          onSegmentClick={(i) => setActive((cur) => (cur === i ? null : i))}
        />
        <div className='flex flex-col gap-2 text-xs'>
          {stats.map((s, i) => <Stat key={i} color={s.color} value={s.value} label={s.label} />)}
        </div>
      </div>
    </Card>
  );
};

export const AgeServicePyramidCard = ({ groups = DEFAULT_PYRAMID, title = 'ข้อมูลตามช่วงการมารับบริการ' }) => (
  <Card title={title} icon='users'>
    <Pyramid groups={groups} maleColor='#6366F1' femaleColor='#EC4899' height={210} />
  </Card>
);

export const RightsDonutCard = ({ slices = DEFAULT_RIGHTS_DONUT, title = 'ข้อมูลสิทธิ' }) => {
  const [active, setActive] = useState(null);
  return (
    <Card title={title} icon='clipboard'>
      <div className='flex items-center gap-4'>
        <Donut
          size={120}
          thickness={20}
          centerLabel='100%'
          segments={slices}
          activeIndex={active}
          onSegmentClick={(i) => setActive((cur) => (cur === i ? null : i))}
        />
        <ul className='text-xs flex flex-col gap-1.5'>
          {slices.map((s, i) => (
            <li
              key={i}
              onClick={() => setActive((cur) => (cur === i ? null : i))}
              className={`flex items-center gap-2 cursor-pointer rounded px-1 py-0.5 ${active === i ? 'bg-brand-50' : 'hover:bg-brand-50/50'}`}
              style={{ color: s.color }}
            >
              <span className='w-2.5 h-2.5 rounded-full shrink-0' style={{ background: s.color }} />
              <span className='flex-1'>{s.label}</span>
              <span className='font-medium tabular-nums'>{s.value}%</span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
};

export const Top10DiseasesShortCard = ({ rows = DEFAULT_TOP10.slice(0, 8), title = 'Top 10 อันดับโรค' }) => {
  const [active, setActive] = useState(null);
  return (
    <Card title={title} icon='clipboard-list'>
      <HBarList rows={rows} activeIndex={active} onRowClick={(i) => setActive((cur) => (cur === i ? null : i))} />
    </Card>
  );
};

export const MonthlyVisitsCard = ({ data = DEFAULT_VISITS_LINE, title = 'จำนวนผู้รับบริการ' }) => {
  const [active, setActive] = useState(null);
  return (
    <Card title={title} icon='bar-chart'>
      <LineChart {...data} height={220} activeMonth={active} onMonthClick={(i) => setActive((cur) => (cur === i ? null : i))} />
      {active != null && (
        <div className='mt-2 p-2 rounded-md bg-brand-50 border border-brand-200 text-xs text-ink-secondary flex items-center justify-between'>
          <span>
            <strong className='text-brand-500'>{data.months[active]}</strong>
            {' · '}
            {data.series.map((s, i) => (
              <span key={i} className='ml-2'>{s.label}: <strong>{s.values[active].toLocaleString()}</strong></span>
            ))}
          </span>
          <button onClick={() => setActive(null)} className='text-ink-tertiary hover:text-ink' aria-label='ปิด'>
            <Icon name='x' size={12} />
          </button>
        </div>
      )}
    </Card>
  );
};

export const Disease21GroupsCard = ({ groups = DEFAULT_DISEASE_21_GROUPS, title = 'ผู้รับบริการตาม 21 กลุ่มโรค' }) => {
  const [active, setActive] = useState(null);
  const totals = {
    total:  groups.reduce((s, g) => s + g.value, 0),
    second: groups.reduce((s, g) => s + g.second, 0),
    top:    groups.reduce((m, g) => g.value > m.value ? g : m),
  };
  return (
    <Card title={title} icon='clipboard-list'>
      <div className='max-h-[320px] overflow-y-auto scrollbar-thin pr-1'>
        <HBarList
          rows={groups}
          valueLabel='คน'
          secondLabel='ครั้ง'
          activeIndex={active}
          onRowClick={(i) => setActive((cur) => (cur === i ? null : i))}
        />
      </div>
      {active != null && (
        <div className='mt-3 p-2 rounded-md bg-brand-50 border border-brand-200 text-xs text-ink-secondary flex items-center justify-between'>
          <span>
            <strong className='text-brand-500'>{groups[active].label}</strong>
            {' · '}{groups[active].value.toLocaleString()} คน
            {' · '}{groups[active].second.toLocaleString()} ครั้ง
          </span>
          <button onClick={() => setActive(null)} className='text-ink-tertiary hover:text-ink' aria-label='ปิด'>
            <Icon name='x' size={12} />
          </button>
        </div>
      )}
      <div className='mt-3 pt-3 border-t border-ink-line grid grid-cols-3 gap-2 text-[11px]'>
        <div className='text-center'>
          <div className='text-ink-tertiary'>รวมทั้งหมด</div>
          <div className='font-bold text-ink tabular-nums'>{totals.total.toLocaleString()} คน</div>
        </div>
        <div className='text-center'>
          <div className='text-ink-tertiary'>กลุ่มสูงสุด</div>
          <div className='font-bold text-brand-500 truncate' title={totals.top.label}>
            {(totals.top.label.split('. ')[1] || totals.top.label)}
          </div>
        </div>
        <div className='text-center'>
          <div className='text-ink-tertiary'>จำนวนครั้ง</div>
          <div className='font-bold text-ink tabular-nums'>{totals.second.toLocaleString()} ครั้ง</div>
        </div>
      </div>
    </Card>
  );
};

export const DmHtNewPatientsCard = ({
  data = DEFAULT_DM_HT_BARS,
  summary = [
    { value: '7,004',  label: 'เบาหวานครบใหม่ (คน)',         tone: 'success' },
    { value: '39,518', label: 'ความดันใหม่ (คน)',              tone: 'info'    },
    { value: '14,754', label: 'เบาหวานร่วมความดันใหม่ (คน)',   tone: 'danger'  },
  ],
  title = 'ผู้ป่วยเบาหวาน-ความดัน รายใหม่ 12 เดือนย้อนหลัง',
}) => {
  const [active, setActive] = useState(null);
  return (
    <Card title={title} icon='stethoscope'>
      <VBars {...data} stacked height={220} activeMonth={active} onMonthClick={(i) => setActive((cur) => (cur === i ? null : i))} />
      {active != null && (
        <div className='mt-2 p-2 rounded-md bg-brand-50 border border-brand-200 text-xs text-ink-secondary flex items-center justify-between'>
          <span>
            <strong className='text-brand-500'>{data.months[active]}</strong>
            {data.series.map((s, i) => (
              <span key={i} className='ml-2'>{s.label}: <strong>{s.values[active]}</strong></span>
            ))}
          </span>
          <button onClick={() => setActive(null)} className='text-ink-tertiary hover:text-ink' aria-label='ปิด'>
            <Icon name='x' size={12} />
          </button>
        </div>
      )}
      <div className='grid grid-cols-3 gap-3 mt-4'>
        {summary.map((s, i) => <BigStat key={i} value={s.value} label={s.label} tone={s.tone} />)}
      </div>
    </Card>
  );
};

/* Generic single-gauge card. The three Row 4 slots and ConsentCard all share
   this shape (gauge + sub-text). */
export const SingleGaugeCard = ({
  value,
  color,
  label,
  sub,
  title,
  icon = 'activity',
  size,
}) => (
  <Card title={title} icon={icon}>
    <div className='flex flex-col items-center gap-2 py-2'>
      <Gauge value={value} color={color} label={label} {...(size ? { size } : {})} />
      {sub && <p className='text-xs text-ink-tertiary'>{sub}</p>}
    </div>
  </Card>
);

export const DmControlGaugeCard = (props) => (
  <SingleGaugeCard
    title='ผู้ป่วยเบาหวานควบคุมน้ำตาลได้ ปีงบฯ 2569'
    icon='activity'
    value={59.21}
    color='#14B8A6'
    label='ของเป้าหมาย 60%'
    sub='เบาหวาน 9,620 คน'
    {...props}
  />
);

export const HtControlGaugeCard = (props) => (
  <SingleGaugeCard
    title='ผู้ป่วยความดันโลหิตควบคุมได้ ปีงบฯ 2569'
    icon='activity'
    value={71.13}
    color='#6366F1'
    label='ของเป้าหมาย 70%'
    sub='ความดัน 19,978 คน'
    {...props}
  />
);

export const WorkingAgeGroupsCard = (props) => (
  <SingleGaugeCard
    title='กลุ่มวัยทำงานในของกลุ่ม 8 กลุ่ม ปีงบฯ 2569'
    icon='users'
    value={57.5}
    color='#EC4899'
    label='ของเป้าหมาย 65%'
    sub='กลุ่ม 240 คน'
    {...props}
  />
);

export const ConsentCard = ({
  value = 0,
  color = '#EC4899',
  label = 'ยังไม่มีข้อมูล',
  title = 'การให้บริการรับยินยอม ปีงบฯ 2569',
  className = 'lg:col-span-1',
}) => (
  <Card title={title} icon='check-circle' className={className}>
    <div className='flex flex-col items-center gap-2 py-4'>
      <Gauge value={value} color={color} label={label} />
    </div>
  </Card>
);

export const CocCard = ({
  people = [
    { materialSymbol: 'man',   value: '2,320', label: 'ทั้งหมด (คน)' },
    { materialSymbol: 'woman', value: '522',   label: 'เคส (คน)' },
  ],
  stats = [
    { value: '9 ครั้ง', label: 'เฉลี่ย/คน/ปี',  tone: 'teal'   },
    { value: '2 ครั้ง', label: 'ครั้งล่าสุด',     tone: 'indigo' },
  ],
  title = 'ผู้ป่วยเข้ารับบริการตาม COC',
}) => (
  <Card title={title} icon='users'>
    <div className='grid grid-cols-2 gap-3'>
      {people.map((p, i) => <PersonStat key={`p${i}`} {...p} />)}
      {stats.map((s, i) => <BigStat key={`s${i}`} {...s} />)}
    </div>
  </Card>
);

export const DmComplicationsCard = ({
  gauges = [
    { value: 12.4, color: '#EC4899', label: 'ภาวะ Diabetic foot', size: 130 },
    { value: 8.9,  color: '#6366F1', label: 'ภาวะโรคไตเรื้อรัง',     size: 130 },
  ],
  title = 'ภาวะแทรกซ้อนผู้ป่วยเบาหวาน',
}) => (
  <Card title={title} icon='activity'>
    <div className='grid grid-cols-2 gap-3 py-2'>
      {gauges.map((g, i) => <Gauge key={i} {...g} />)}
    </div>
  </Card>
);
