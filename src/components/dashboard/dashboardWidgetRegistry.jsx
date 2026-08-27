import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '@/components/icons/Icon';
import FilterTag from '@/components/forms/FilterTag';
import SecondarySearch from '@/components/search/SecondarySearch';
import SearchResultCount from '@/components/search/SearchResultCount';
import Pagination from '@/components/pagination/Pagination';
import Popup from '@/components/popup/Popup';
import Badge from '@/components/badge/Badge';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import NeutralSubdueIconButton from '@/components/button/NeutralSubdueIconButton';
import Table from '@/components/table/Table';
import { DonutWithLegend, HBarList } from '@/components/graph/Charts';
import { ANC_PATIENTS } from '@/data/ancVisits';
import PHCIS_CHART, { PHCIS_CHART_PALETTE } from '@/data/phcisChartPalette';
import {
  ALLERGY_GROUPS,
  ALLERGY_REGISTRY,
  allergyCountsByGroup,
  allergyCountsBySeverity,
  allergyGroupLabel,
  allergySeverityLabel,
  topAllergens,
  totalAllergyPatients,
} from '@/data/dashboardAllergy';
import { centerLabel, formatIsoDateThai, maskHn, maskThaiName, safePct } from '@/data/dashboardCommon';
import {
  PopulationPyramidCard,
  OpdTypeLineCard,
  ResidencePieCard,
  ServiceCenterMapCard,
} from '@/components/graph/BigCharts';
import {
  Top10DiseasesCard,
  VisitTotalCard,
  AgeServicePyramidCard,
  RightsDonutCard,
  Top10DiseasesShortCard,
  MonthlyVisitsCard,
  Disease21GroupsCard,
  DmHtNewPatientsCard,
  DmControlGaugeCard,
  HtControlGaugeCard,
  WorkingAgeGroupsCard,
  CocCard,
  ConsentCard,
  DmComplicationsCard,
  TelemedCallStatsCard,
} from '@/components/graph/DashboardCards';

/* PHCIS | แดชบอร์ดภาพรวมโรงพยาบาล — ทะเบียนการ์ด (widget registry)

   เดิมการ์ดทั้ง 22 ใบประกอบอยู่ใน DashboardPage และการ์ดสามใบ (ANC / แพ้ยา /
   รายชื่อผู้รับบริการล่าสุด) ผูกกับ state ของหน้า จึงเรนเดอร์นอกหน้าไม่ได้ —
   ตัวอย่างในป๊อปอัปสร้างเทมเพลตเลยต้องเป็นกล่องเปล่า (ดู open-questions ของ vault)

   ยกออกมาไว้ที่นี่แล้ว: การ์ดสามใบนั้นถือ state ของตัวเอง ทะเบียนนี้จึงเรนเดอร์
   การ์ดใบไหนก็ได้ด้วย `<DashboardWidget type={...} />` ทั้งบนหน้าจริงและใน
   ตัวอย่างของ wizard — pattern เดียวกับ `consentDashboardWidgets.jsx` */

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
          <NeutralSubdueIconButton icon='more_vert' variant='outline' size='sm' ariaLabel='options' />
        )}
      </header>
    )}
    <div className='flex-1 px-4 pb-4 pt-10 align-middle'>{children}</div>
  </section>
);

/* Plain stat tile — used by the ANC results section (TOR 1.20.7.7
   "Dashboard ผลการฝากครรภ์"). Simpler than the chart cards since this is a
   KPI summary, not a graph. */
const StatTile = ({ label, value, tone }) => (
  <div className='flex flex-col gap-1'>
    <span
      className='text-2xl font-bold tabular-nums'
      style={{ color: tone === 'warning' ? 'var(--text-warning-default, #F46928)' : 'var(--text-brandPrimary-default, #007549)' }}
    >
      {value}
    </span>
    <span className='text-xs text-ink-tertiary'>{label}</span>
  </div>
);


const RECENT_PATIENTS = [
  { date: '6 พฤษภาคม 2569 21:19', cid: '1369900526072', name: 'นายสมชาย มั่นใจดี',         age: 36, doctor: 'พญ.สมหญิง รักษ์ดี', right: 'สิทธิประกันสังคม', room: 'ห้องตรวจ 1', status: 'รอตรวจ' },
  { date: '6 พฤษภาคม 2569 21:14', cid: '1359900126011', name: 'นางอัจฉรา ใจดี',           age: 47, doctor: 'นพ.วิรัช รักการ',     right: 'ประกันสุขภาพ',     room: 'ห้องตรวจ 2', status: 'กำลังตรวจ' },
  { date: '6 พฤษภาคม 2569 20:58', cid: '3409900562918', name: 'นายธนากร ศักดิ์สิทธิ์',     age: 52, doctor: 'พญ.สมหญิง รักษ์ดี', right: 'ข้าราชการ',         room: 'ห้องตรวจ 1', status: 'ตรวจเสร็จ' },
  { date: '6 พฤษภาคม 2569 20:42', cid: '1409900124467', name: 'น.ส.พิมลรัตน์ จันทร์โอภาส',  age: 28, doctor: 'นพ.อภิชาติ ภักดี',     right: 'สิทธิประกันสังคม', room: 'ห้องตรวจ 3', status: 'ตรวจเสร็จ' },
  { date: '6 พฤษภาคม 2569 20:30', cid: '3260900118732', name: 'นายอภินันท์ พิทักษ์',        age: 64, doctor: 'พญ.สมหญิง รักษ์ดี', right: 'ผู้สูงอายุ',          room: 'ห้องตรวจ 2', status: 'รอตรวจ' },
  { date: '6 พฤษภาคม 2569 20:12', cid: '1729900624481', name: 'นางวรรณา จิตรเย็น',         age: 41, doctor: 'นพ.วิรัช รักการ',     right: 'ประกันสุขภาพ',     room: 'ห้องตรวจ 1', status: 'กำลังตรวจ' },
  { date: '6 พฤษภาคม 2569 19:55', cid: '1102001834290', name: 'นายชัยรัตน์ พงศ์เพชร',       age: 33, doctor: 'นพ.อภิชาติ ภักดี',     right: 'สิทธิประกันสังคม', room: 'ห้องตรวจ 3', status: 'ตรวจเสร็จ' },
  { date: '6 พฤษภาคม 2569 19:40', cid: '3530100422115', name: 'นางสุวพร ภักดีไทย',          age: 58, doctor: 'พญ.สมหญิง รักษ์ดี', right: 'ข้าราชการ',         room: 'ห้องตรวจ 1', status: 'รอตรวจ' },
  { date: '6 พฤษภาคม 2569 19:25', cid: '1270400189772', name: 'น.ส.กชกร เจริญสุข',          age: 24, doctor: 'นพ.วิรัช รักการ',     right: 'ประกันสุขภาพ',     room: 'ห้องตรวจ 2', status: 'กำลังตรวจ' },
  { date: '6 พฤษภาคม 2569 19:08', cid: '3140600771044', name: 'นายปรีชา รักงาน',           age: 49, doctor: 'นพ.อภิชาติ ภักดี',     right: 'สิทธิประกันสังคม', room: 'ห้องตรวจ 3', status: 'ตรวจเสร็จ' },
  { date: '6 พฤษภาคม 2569 18:54', cid: '1100900318604', name: 'นางสมพิศ ใจสะอาด',          age: 71, doctor: 'พญ.สมหญิง รักษ์ดี', right: 'ผู้สูงอายุ',          room: 'ห้องตรวจ 1', status: 'รอตรวจ' },
  { date: '6 พฤษภาคม 2569 18:40', cid: '3209900555881', name: 'นายธีรพงษ์ มั่งมี',          age: 38, doctor: 'นพ.วิรัช รักการ',     right: 'สิทธิประกันสังคม', room: 'ห้องตรวจ 2', status: 'ตรวจเสร็จ' },
  { date: '6 พฤษภาคม 2569 18:25', cid: '1101800728914', name: 'น.ส.มัลลิกา จิรกุล',         age: 31, doctor: 'นพ.อภิชาติ ภักดี',     right: 'ประกันสุขภาพ',     room: 'ห้องตรวจ 3', status: 'รอตรวจ' },
  { date: '6 พฤษภาคม 2569 18:12', cid: '3300100994431', name: 'นายเกรียงไกร พรพิทักษ์',     age: 55, doctor: 'พญ.สมหญิง รักษ์ดี', right: 'ข้าราชการ',         room: 'ห้องตรวจ 2', status: 'ตรวจเสร็จ' },
  { date: '6 พฤษภาคม 2569 17:58', cid: '1260100822356', name: 'นางพรพิมล สุขสันต์',         age: 44, doctor: 'นพ.วิรัช รักการ',     right: 'สิทธิประกันสังคม', room: 'ห้องตรวจ 1', status: 'กำลังตรวจ' },
  { date: '6 พฤษภาคม 2569 17:42', cid: '3411500376012', name: 'นายอนุชิต รัตน์โกสินทร์',    age: 27, doctor: 'นพ.อภิชาติ ภักดี',     right: 'ประกันสุขภาพ',     room: 'ห้องตรวจ 3', status: 'ตรวจเสร็จ' },
  { date: '6 พฤษภาคม 2569 17:28', cid: '1100702641188', name: 'นางสาวอรัญญา บุญรอด',        age: 35, doctor: 'พญ.สมหญิง รักษ์ดี', right: 'สิทธิประกันสังคม', room: 'ห้องตรวจ 2', status: 'รอตรวจ' },
  { date: '6 พฤษภาคม 2569 17:14', cid: '3729900112566', name: 'นายไพศาล สงวนทรัพย์',        age: 62, doctor: 'นพ.วิรัช รักการ',     right: 'ผู้สูงอายุ',          room: 'ห้องตรวจ 1', status: 'ตรวจเสร็จ' },
  { date: '6 พฤษภาคม 2569 17:00', cid: '1809900821477', name: 'น.ส.รวิวรรณ ไทยเจริญ',       age: 22, doctor: 'นพ.อภิชาติ ภักดี',     right: 'ประกันสุขภาพ',     room: 'ห้องตรวจ 3', status: 'กำลังตรวจ' },
];


/* TOR 1.20.1.3 / 1.20.1.8 — ผู้รับบริการที่มีการแพ้ยา
   ตารางในป๊อปอัป “ดูรายงาน” ปกปิดชื่อและ HN เสมอ (ข้อมูลแพ้ยาเป็นข้อมูลสุขภาพ
   ที่ระบุตัวบุคคลได้) — ตัวเลขบนกราฟเป็นค่ารวมทั้งสำนักอนามัย */
const ALLERGY_VIEW_PAGE_SIZE = 10;

const ALLERGY_COLUMNS = [
  { key: 'hn', label: 'HN (ปกปิด)', render: (r) => maskHn(r.hn), csv: (r) => maskHn(r.hn) },
  {
    key: 'name', label: 'ชื่อ-สกุล (ปกปิด)', flex: true, minWidth: 200,
    render: (r) => maskThaiName(r.name), csv: (r) => maskThaiName(r.name),
  },
  { key: 'age', label: 'อายุ', align: 'center' },
  {
    key: 'group', label: 'กลุ่มยาที่แพ้', flex: true, minWidth: 200,
    render: (r) => allergyGroupLabel(r.group), csv: (r) => allergyGroupLabel(r.group),
  },
  { key: 'drug', label: 'ตัวยา', flex: true, minWidth: 180 },
  { key: 'reaction', label: 'อาการที่พบ', flex: true, minWidth: 220 },
  {
    key: 'severity', label: 'ความรุนแรง',
    render: (r) => (
      <Badge style={r.severity === 'severe' ? 'error' : r.severity === 'moderate' ? 'warning' : 'neutral'} size='small'>
        {allergySeverityLabel(r.severity)}
      </Badge>
    ),
    csv: (r) => allergySeverityLabel(r.severity),
  },
  {
    key: 'center', label: 'ศูนย์ที่บันทึก', flex: true, minWidth: 200,
    render: (r) => centerLabel(r.center), csv: (r) => centerLabel(r.center),
  },
  { key: 'source', label: 'แหล่งข้อมูล', flex: true, minWidth: 180 },
  {
    key: 'recordedAt', label: 'วันที่บันทึก',
    render: (r) => formatIsoDateThai(r.recordedAt), csv: (r) => r.recordedAt,
  },
];

/* Each Thai status label maps to a shared Badge style (Figma 302:73). */
const STATUS_TO_BADGE_STYLE = {
  'รอตรวจ':    'yellow',
  'กำลังตรวจ': 'info',
  'ตรวจเสร็จ': 'success',
};


/* ── ANC (TOR 1.20.7.7) — สถิติล้วน คำนวณในตัวการ์ดเอง ── */
export const AncSummaryCard = () => {
  const ancStats = useMemo(() => ({
    total:    ANC_PATIENTS.length,
    first:    ANC_PATIENTS.filter((p) => p.visitType === 'first').length,
    followup: ANC_PATIENTS.filter((p) => p.visitType === 'followup').length,
    low:      ANC_PATIENTS.filter((p) => p.riskLevel === 'low').length,
    intermediate: ANC_PATIENTS.filter((p) => p.riskLevel === 'intermediate').length,
    high:     ANC_PATIENTS.filter((p) => p.riskLevel === 'high').length,
  }), []);

  return (
    <Card
      title='ผลการฝากครรภ์ (ANC)'
      icon='face'
      action={
        <Link to='/treat/anc/queue'>
          <NeutralSubdueButton variant='outline' size='sm' trailingIcon='chevron_right'>
            ดูทั้งหมด
          </NeutralSubdueButton>
        </Link>
      }
    >
      <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
        <StatTile label='ฝากครรภ์ทั้งหมด' value={ancStats.total} />
        <StatTile label='ฝากครรภ์ครั้งแรก' value={ancStats.first} />
        <StatTile label='ตรวจติดตาม' value={ancStats.followup} />
        <StatTile label='ความเสี่ยงสูง/ปานกลาง' value={ancStats.intermediate + ancStats.high} tone='warning' />
      </div>
      <div className='flex items-center gap-2 mt-4'>
        <ColorfulBadge style='green' size='small' hierarchy='secondary'>ความเสี่ยงต่ำ {ancStats.low}</ColorfulBadge>
        <ColorfulBadge style='yellow' size='small' hierarchy='secondary'>ความเสี่ยงปานกลาง {ancStats.intermediate}</ColorfulBadge>
        <ColorfulBadge style='red' size='small' hierarchy='secondary'>ความเสี่ยงสูง {ancStats.high}</ColorfulBadge>
      </div>
    </Card>
  );
};

/* ── การแพ้ยา (TOR 1.20.1.3 / 1.20.1.8) — การ์ด + ป๊อปอัปดูรายงานในตัว ── */
export const DrugAllergyCard = () => {
  const [allergyOpen, setAllergyOpen] = useState(false);
  const [allergyPage, setAllergyPage] = useState(1);
  const [allergyGroupFilter, setAllergyGroupFilter] = useState('all');

  const allergyStats = useMemo(() => {
    const byGroup = allergyCountsByGroup();
    const bySeverity = allergyCountsBySeverity();
    const total = ALLERGY_REGISTRY.length;
    return {
      patients: totalAllergyPatients(),
      records: total,
      severe: bySeverity.get('severe') || 0,
      donut: ALLERGY_GROUPS
        .map((g, i) => ({
          label: g.label,
          value: byGroup.get(g.key) || 0,
          color: PHCIS_CHART_PALETTE[i % PHCIS_CHART_PALETTE.length],
        }))
        .filter((s) => s.value > 0),
      topDrugs: topAllergens(6).map((d) => ({
        label: d.label,
        value: d.value,
        segments: [{ value: d.value, color: PHCIS_CHART.pink, label: 'ราย' }],
      })),
    };
  }, []);

  const allergyRows = useMemo(() => (
    allergyGroupFilter === 'all'
      ? ALLERGY_REGISTRY
      : ALLERGY_REGISTRY.filter((r) => r.group === allergyGroupFilter)
  ), [allergyGroupFilter]);

  const allergyPageCount = Math.max(1, Math.ceil(allergyRows.length / ALLERGY_VIEW_PAGE_SIZE));
  const allergySafePage = Math.min(allergyPage, allergyPageCount);
  const allergyPageRows = allergyRows.slice(
    (allergySafePage - 1) * ALLERGY_VIEW_PAGE_SIZE,
    allergySafePage * ALLERGY_VIEW_PAGE_SIZE,
  );

  return (
    <>
    <Card
      title='ผู้รับบริการที่มีการแพ้ยา'
      icon='warning'
      action={
        <NeutralSubdueButton
          variant='outline'
          size='sm'
          leadingIcon='visibility'
          onClick={() => { setAllergyOpen(true); setAllergyPage(1); }}
        >
          ดูรายงาน
        </NeutralSubdueButton>
      }
    >
      <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
        <StatTile label='ผู้รับบริการที่แพ้ยา (ราย)' value={allergyStats.patients} />
        <StatTile label='รายการแพ้ยาที่บันทึก' value={allergyStats.records} />
        <StatTile label='แพ้ยาระดับรุนแรง' value={allergyStats.severe} tone='warning' />
        <StatTile
          label='สัดส่วนแพ้รุนแรง'
          value={`${safePct(allergyStats.severe, allergyStats.records)}%`}
          tone='warning'
        />
      </div>

      {allergyStats.donut.length === 0 ? (
        <p className='text-xs text-ink-tertiary mt-4'>ยังไม่มีข้อมูลการแพ้ยาในทะเบียน</p>
      ) : (
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4'>
          <div className='flex flex-col gap-2 min-w-0'>
            <span className='text-xs text-ink-tertiary'>ภาพรวมตามกลุ่มยาที่แพ้</span>
            <DonutWithLegend
              segments={allergyStats.donut}
              size={180}
              centerLabel={String(allergyStats.records)}
              centerSub='รายการ'
            />
          </div>
          <div className='flex flex-col gap-2 min-w-0'>
            <span className='text-xs text-ink-tertiary'>ตัวยาที่พบการแพ้บ่อยที่สุด (Top 6)</span>
            <HBarList valueLabel='ราย' rows={allergyStats.topDrugs} />
          </div>
        </div>
      )}
    </Card>
    {/* TOR 1.20.1.3 — ดูรายงานผู้รับบริการที่มีการแพ้ยา (ปกปิดชื่อและ HN) */}
    <Popup
      open={allergyOpen}
      onClose={() => setAllergyOpen(false)}
      size='extraLarge'
      title='รายงานผู้รับบริการที่มีการแพ้ยา'
      subtitle='ข้อมูลทั้งสำนักอนามัย · ปกปิดชื่อ-นามสกุลและ HN ตามหลักการคุ้มครองข้อมูลส่วนบุคคล'
      primaryAction={{ label: 'ปิด', onClick: () => setAllergyOpen(false) }}
    >
      <div className='flex flex-col w-full min-w-0' style={{ gap: 'var(--dim-space-400)' }}>
        <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-150)' }}>
          <FilterTag
            value='ทุกกลุ่มยา'
            selected={allergyGroupFilter === 'all'}
            onClick={() => { setAllergyGroupFilter('all'); setAllergyPage(1); }}
          />
          {ALLERGY_GROUPS.map((g) => (
            <FilterTag
              key={g.key}
              value={g.label}
              selected={allergyGroupFilter === g.key}
              onClick={() => { setAllergyGroupFilter(g.key); setAllergyPage(1); }}
            />
          ))}
        </div>

        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)', maxHeight: '58vh', overflowY: 'auto' }}>
          <Table
            columns={ALLERGY_COLUMNS}
            rows={allergyPageRows}
            rowKey={(r) => r.id}
            emptyMessage='ไม่พบรายการแพ้ยาในกลุ่มที่เลือก'
            emptySubtext='ลองเลือกกลุ่มยาอื่น หรือกด “ทุกกลุ่มยา”'
            pagination={false}
          />
          <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-600)' }}>
            <span className='flex-1 text-xs text-ink-secondary'>
              แสดง {allergyRows.length === 0 ? 0 : (allergySafePage - 1) * ALLERGY_VIEW_PAGE_SIZE + 1}
              -{Math.min(allergySafePage * ALLERGY_VIEW_PAGE_SIZE, allergyRows.length)} จาก {allergyRows.length} รายการ
            </span>
            <Pagination
              currentPage={allergySafePage}
              pageCount={allergyPageCount}
              onPageChange={setAllergyPage}
            />
          </div>
        </div>
      </div>
    </Popup>
    </>
  );
};

/* ── รายชื่อผู้รับบริการล่าสุด — ค้นหา/เรียง/แบ่งหน้าในตัวการ์ด ── */
export const RecentPatientsCard = () => {
  const [search, setSearch]   = useState('');
  const [sortKey, setSortKey] = useState('date');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage]       = useState(0);
  const [showAll, setShowAll] = useState(false);
  const PAGE_SIZE = 6;

  const filteredPatients = useMemo(() => {
    const q = search.trim().toLowerCase();
    let out = RECENT_PATIENTS;
    if (q) out = out.filter((p) =>
      p.name.toLowerCase().includes(q) ||
      p.cid.includes(q) ||
      p.doctor.toLowerCase().includes(q) ||
      p.status.includes(q)
    );
    out = [...out].sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      const cmp = typeof av === 'number' ? av - bv : String(av).localeCompare(String(bv), 'th');
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return out;
  }, [search, sortKey, sortDir]);

  const pageCount   = Math.max(1, Math.ceil(filteredPatients.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const visiblePatients = showAll
    ? filteredPatients.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE)
    : filteredPatients.slice(0, PAGE_SIZE);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
    setPage(0);
  };

  return (
    <Card title='รายชื่อผู้รับบริการล่าสุด' icon='users'
      action={
        <NeutralSubdueButton
          variant='outline'
          size='sm'
          trailingIcon={showAll ? 'expand_less' : 'chevron_right'}
          onClick={() => { setShowAll((v) => !v); setPage(0); }}
        >
          {showAll ? 'แสดงเฉพาะล่าสุด' : 'ดูข้อมูลทั้งหมด'}
        </NeutralSubdueButton>
      }
    >
      <div className='flex flex-col gap-2 mb-3'>
        <SecondarySearch
          size='small'
          value={search}
          onChange={(next) => { setSearch(next); setPage(0); }}
          placeholder='ค้นหา ชื่อ / เลขบัตร / แพทย์ / สถานะ'
          className='flex-1'
          style={{ width: 'auto', maxWidth: 360 }}
        />
        <SearchResultCount found={filteredPatients.length} total={RECENT_PATIENTS.length} />
      </div>

      <div className='overflow-x-auto'>
        <table className='w-full text-xs'>
          <thead>
            <tr
              className='text-ink-tertiary border-b'
              style={{ borderBottomColor: 'var(--border-table-default)' }}
            >
              {[
                { k: 'date',   label: 'วันที่' },
                { k: 'cid',    label: 'เลขบัตรประชาชน' },
                { k: 'name',   label: 'ชื่อ-สกุล' },
                { k: 'age',    label: 'อายุ' },
                { k: 'doctor', label: 'แพทย์' },
                { k: 'right',  label: 'สิทธิ' },
                { k: 'room',   label: 'ห้องตรวจ' },
                { k: 'status', label: 'สถานะ' },
              ].map((c) => {
                const isSorted = sortKey === c.k;
                return (
                  <th
                    key={c.k}
                    onClick={() => toggleSort(c.k)}
                    className={`text-left font-medium py-2 px-2 cursor-pointer select-none transition ${isSorted ? 'text-brand-500' : 'hover:text-ink'}`}
                  >
                    <span className='inline-flex items-center gap-1'>
                      {c.label}
                      <Icon
                        name={isSorted ? (sortDir === 'asc' ? 'chevron-up' : 'chevron-down') : 'chevron-down'}
                        size={10}
                        className={isSorted ? '' : 'opacity-30'}
                      />
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {visiblePatients.length === 0 && (
              <tr><td colSpan={8} className='text-center py-8 text-ink-tertiary'>ไม่พบรายการที่ตรงกัน</td></tr>
            )}
            {visiblePatients.map((p, i) => {
              const badgeStyle = STATUS_TO_BADGE_STYLE[p.status] || 'yellow';
              /* Row chrome mirrors the shared <Table>: line + hover come from
                 the same surface/border tokens, so this hand-rolled table
                 follows light/dark exactly like every other table. */
              return (
                <tr
                  key={`${p.cid}-${i}`}
                  className='border-b hover:bg-surface-tableHover'
                  style={{ borderBottomColor: 'var(--border-table-line)' }}
                >
                  <td className='py-2 px-2 text-ink-secondary'>{p.date}</td>
                  <td className='py-2 px-2 text-ink-secondary tabular-nums'>{p.cid}</td>
                  <td className='py-2 px-2 text-brand-500 font-medium'>{p.name}</td>
                  <td className='py-2 px-2 text-ink-secondary tabular-nums'>{p.age}</td>
                  <td className='py-2 px-2 text-ink-secondary'>{p.doctor}</td>
                  <td className='py-2 px-2 text-ink-secondary'>{p.right}</td>
                  <td className='py-2 px-2 text-ink-secondary'>{p.room}</td>
                  <td className='py-2 px-2'>
                    <Badge style={badgeStyle} size='small'>{p.status}</Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showAll && pageCount > 1 && (
        <div className='flex items-center justify-between mt-3 text-xs text-ink-secondary'>
          <span>
            หน้า {currentPage + 1} / {pageCount} ·{' '}
            {currentPage * PAGE_SIZE + 1}–{Math.min((currentPage + 1) * PAGE_SIZE, filteredPatients.length)}{' '}
            จาก {filteredPatients.length}
          </span>
          <Pagination
            currentPage={currentPage + 1}
            pageCount={pageCount}
            onPageChange={(p) => setPage(p - 1)}
          />
        </div>
      )}
    </Card>
  );
};

/** การ์ดทุกใบของหน้าแดชบอร์ด — key ตรงกับ DASHBOARD_WIDGET_CATALOG
    ('kpi' เป็นแถบสรุปด้านบน ไม่ได้อยู่ในทะเบียนนี้) */
export const DASHBOARD_WIDGET_RENDERERS = {
  top10:             ({ yearLabel }) => <Top10DiseasesCard title={`Top 10 อันดับโรคที่พบบ่อย ${yearLabel}`} />,
  visitTotal:        () => <VisitTotalCard />,
  agePyramid:        () => <AgeServicePyramidCard />,
  rights:            () => <RightsDonutCard />,
  top10Short:        ({ yearLabel }) => <Top10DiseasesShortCard title={`Top 10 อันดับโรค ${yearLabel}`} />,
  monthlyVisits:     ({ yearLabel }) => <MonthlyVisitsCard title={`จำนวนผู้รับบริการ ${yearLabel}`} />,
  anc:               () => <AncSummaryCard />,
  allergy:           () => <DrugAllergyCard />,
  disease21:         ({ yearLabel }) => <Disease21GroupsCard title={`ผู้รับบริการตาม 21 กลุ่มโรค ${yearLabel}`} />,
  dmhtNew:           () => <DmHtNewPatientsCard />,
  dmGauge:           () => <DmControlGaugeCard />,
  htGauge:           () => <HtControlGaugeCard />,
  workingAge:        () => <WorkingAgeGroupsCard />,
  coc:               () => <CocCard />,
  consent:           () => <ConsentCard />,
  dmComplications:   () => <DmComplicationsCard />,
  telemed:           ({ yearLabel }) => <TelemedCallStatsCard title={`สถิติการปรึกษาทางไกล (Telemedicine) ${yearLabel}`} />,
  recentPatients:    () => <RecentPatientsCard />,
  populationPyramid: () => <PopulationPyramidCard />,
  opdTypeLine:       () => <OpdTypeLineCard />,
  residencePie:      () => <ResidencePieCard />,
  serviceCenterMap:  () => <ServiceCenterMapCard />,
};

/** เรนเดอร์การ์ดใบเดียวตาม key — ใช้ทั้งบนหน้าแดชบอร์ดและในตัวอย่างของ wizard */
export const DashboardWidget = ({ type, yearLabel = 'ปีงบประมาณ 2569' }) => {
  const render = DASHBOARD_WIDGET_RENDERERS[type];
  return render ? render({ yearLabel }) : null;
};

export default DashboardWidget;
