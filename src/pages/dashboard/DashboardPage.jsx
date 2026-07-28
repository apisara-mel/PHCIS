import React, { useMemo, useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { ClinicFilterProvider } from '@/components/layout/HeaderClinicContext';
import Icon from '@/components/icons/Icon';
import Dropdown from '@/components/forms/Dropdown';
import SecondarySearch from '@/components/search/SecondarySearch';
import { Reveal } from '@/components/graph/Charts';
import SummaryCardsBar from '@/components/layout/SummaryCardsBar';
import Pagination from '@/components/pagination/Pagination';
import Badge from '@/components/badge/Badge';
import BrandButton from '@/components/button/BrandButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import NeutralSubdueIconButton from '@/components/button/NeutralSubdueIconButton';
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

const YEAR_OPTIONS = [
  { value: '2569', label: 'ปีงบประมาณ 2569' },
  { value: '2568', label: 'ปีงบประมาณ 2568' },
  { value: '2567', label: 'ปีงบประมาณ 2567' },
  { value: '2566', label: 'ปีงบประมาณ 2566' },
];

/* Hospital-overview banner cards — feed into <SummaryCardsBar variant='banner' />.
   Each card uses a semantic-pill tone + optional sub line. */
const DASHBOARD_OVERVIEW_CARDS = [
  { key: 'pop',     icon: 'users',          tone: 'blue',   value: '332,628',   label: 'ประชากรทั้งหมด (คน)',          subIcon: 'users',        sub: 'ชาย 159,483 / หญิง 173,145' },
  { key: 'birth',   icon: 'smile',          tone: 'teal',   value: '10',        label: 'เกิด ปีงบฯ 2569 (คน)',          subIcon: 'history',      sub: 'ปีงบ 2568: 688 คน' },
  { key: 'death',   icon: 'activity',       tone: 'red',    value: '21',        label: 'เสียชีวิต ปีงบฯ 2569 (คน)',     subIcon: 'history',      sub: 'ปีงบ 2568: 1,575 คน' },
  { key: 'visits',  icon: 'clipboard-list', tone: 'brand',  value: '299,445',   label: 'การรับบริการสะสม (ครั้ง)',      subIcon: 'check-circle', sub: 'เฉลี่ย 820.40 ครั้ง/วัน', subTone: 'success' },
  { key: 'fee',     icon: 'baht',           tone: 'purple', value: '1,496,420', label: 'ค่าบริการสะสม (บาท)',           subIcon: 'file-text',    sub: 'รายรับ 0 บาท' },
  { key: 'units',   icon: 'building',       tone: 'orange', value: '69',        label: 'หน่วยบริการที่ส่งข้อมูล (แห่ง)' },
  { key: 'telemed', icon: 'stethoscope',    tone: 'teal',   value: '167',       label: 'สาย Telemed ปีงบฯ (ครั้ง)', subIcon: 'history', sub: 'เฉลี่ย 18:42 นาที/สาย' },
];

/* Card wrapper — used by the recent-patients table only. The chart cards
   already ship with their own internal Card chrome. */
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

/* Each Thai status label maps to a shared Badge style (Figma 302:73). */
const STATUS_TO_BADGE_STYLE = {
  'รอตรวจ':    'yellow',
  'กำลังตรวจ': 'info',
  'ตรวจเสร็จ': 'success',
};

const DashboardPage = () => {
  const [year, setYear] = useState('2569');
  const yearLabel = YEAR_OPTIONS.find((o) => o.value === year)?.label || `ปีงบประมาณ ${year}`;

  /* Recent patients table state */
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
  <ClinicFilterProvider>
  <div className='min-h-screen w-full flex bg-brand-50'>
    <Sidebar activeKey='dashboard' />
    <main className='flex-1 flex flex-col min-w-0'>
      <Header breadcrumb={['แดชบอร์ด']} />

      {/* — White section: page header + overview — */}
      <div className='bg-surface-card px-6 pt-6 pb-5 border-b-0 shadow-header flex flex-col gap-4'>
        <div className='flex items-center gap-4'>
          <h1 className='flex-1 text-xl font-bold text-ink'>แดชบอร์ดภาพรวมโรงพยาบาล</h1>
          <div className='relative w-[200px]' style={{ marginLeft: 'var(--dimension/space/300,12px)' }}>
            <Dropdown
              className='w-full'
              size='md'
              value={year}
              onChange={setYear}
              options={YEAR_OPTIONS}
              placeholder='เลือกปีงบประมาณ'
            />
          </div>
          <BrandButton
            variant='fill'
            size='sm'
            leadingIcon='save'
            onClick={() => alert(`ส่งออกข้อมูล ${yearLabel}`)}
          >
            ส่งออกข้อมูล
          </BrandButton>
        </div>

        <SummaryCardsBar variant='banner' cards={DASHBOARD_OVERVIEW_CARDS} />
      </div>

      {/* Body grid */}
      <div className='px-6 pt-6 pb-6 flex flex-col gap-4'>
        {/* — Row 1 — */}
        <Reveal className='grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4'>
          <Top10DiseasesCard title={`Top 10 อันดับโรคที่พบบ่อย ${yearLabel}`} />
          <VisitTotalCard />
          <AgeServicePyramidCard />
          <RightsDonutCard />
        </Reveal>

        {/* — Row 2 — */}
        <Reveal className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
          <Top10DiseasesShortCard title={`Top 10 อันดับโรค ${yearLabel}`} />
          <MonthlyVisitsCard title={`จำนวนผู้รับบริการ ${yearLabel}`} />
        </Reveal>

        {/* — Row 3 — */}
        <Reveal className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
          <Disease21GroupsCard title={`ผู้รับบริการตาม 21 กลุ่มโรค ${yearLabel}`} />
          <DmHtNewPatientsCard />
        </Reveal>

        {/* — Row 4 — */}
        <Reveal className='grid grid-cols-1 md:grid-cols-3 gap-4'>
          <DmControlGaugeCard />
          <HtControlGaugeCard />
          <WorkingAgeGroupsCard />
        </Reveal>

        {/* — Row 5 — */}
        <Reveal className='grid grid-cols-1 lg:grid-cols-3 gap-4'>
          <CocCard />
          <ConsentCard />
          <DmComplicationsCard />
        </Reveal>

        {/* — Row 5b: Telemedicine call stats (TOR 1.13.10) — */}
        <Reveal className='grid grid-cols-1 gap-4'>
          <TelemedCallStatsCard title={`สถิติการปรึกษาทางไกล (Telemedicine) ${yearLabel}`} />
        </Reveal>

        {/* — Row 6: recent patients table (search + sort + pagination) — */}
        <Reveal>
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
          <div className='flex items-center gap-2 mb-3'>
            <SecondarySearch
              size='small'
              value={search}
              onChange={(next) => { setSearch(next); setPage(0); }}
              placeholder='ค้นหา ชื่อ / เลขบัตร / แพทย์ / สถานะ'
              className='flex-1'
              style={{ width: 'auto', maxWidth: 360 }}
            />
            <span className='text-xs text-ink-tertiary tabular-nums'>
              พบ {filteredPatients.length} รายการ
            </span>
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
        </Reveal>

        {/* — Detailed analytical charts (Figma 4:8608-4:8611) — */}
        <Reveal><PopulationPyramidCard /></Reveal>
        <Reveal><OpdTypeLineCard /></Reveal>
        <Reveal><ResidencePieCard /></Reveal>
        <Reveal><ServiceCenterMapCard /></Reveal>

        {/* — Footer credits — */}
        <div className='py-3 flex items-center justify-between text-xs text-ink-tertiary'>
          <span>© 2026 ศูนย์การพยาบาลคุณภาพ ดินแดง กรุงเทพมหานคร</span>
          <div className='flex items-center gap-4'>
            <a href='/privacy' target='_blank' rel='noopener noreferrer' className='hover:text-brand-500'>Privacy Policy</a>
            <a href='/terms' target='_blank' rel='noopener noreferrer' className='hover:text-brand-500'>Terms of Service</a>
          </div>
        </div>
      </div>
    </main>
  </div>
  </ClinicFilterProvider>
  );
};

export default DashboardPage;
