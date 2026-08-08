import React, { useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import PrimarySearch from '@/components/search/PrimarySearch';
import SearchResultCount from '@/components/search/SearchResultCount';
import useSearchHistory from '@/components/search/useSearchHistory';
import PatientCard from '@/components/card/PatientCard';
import DatePickerRange from '@/components/forms/DatePickerRange';
import SelectableTag from '@/components/forms/SelectableTag';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import ColorfulIconBadge from '@/components/badge/ColorfulIconBadge';
import Table from '@/components/table/Table';
import Pagination from '@/components/pagination/Pagination';
import Icon from '@/components/icons/Icon';
import { LineChart } from '@/components/graph/Charts';
import {
  SwSectionCard, SwEmptyHint, SwConfidentialMask, SwBanner, SwPagerBar, toLocalIso,
} from '@/pages/clinic/social-work/SocialWorkShared';
import { getPatientByHN, DEFAULT_PATIENT } from '@/data/patientProfiles';
import {
  SW_FUND_TYPES,
  SW_SCHEDULED_TODAY,
  getSwQueueRows,
  getSwRegistrationByHn,
  getSwRegistryRows,
  getSwFollowUpHistory,
  getSwFundHistory,
  resolveSwFundType,
  resolveSwTargetGroup,
  resolveSwProblemLabel,
  hasSocialWorkRights,
  setSocialWorkRights,
  logSwPrint,
  getSwPrintLog,
  formatSwDate,
  formatSwDateTime,
  formatBaht,
} from '@/data/socialWorkClinic';
import {
  SW_BARTHEL_MAX,
  interpretBarthel,
  findSwMaterial,
  resolveSwCategory,
  getSwAssessmentsByHn,
  getSwIssuesByHn,
} from '@/data/socialWorkSupplies';

/* SocialWorkFollowUpPage — การติดตามการบริการทางสังคมสงเคราะห์
   (TOR 1.10.11.5). MentalHealthFollowUpPage pattern: ค้นหาผู้รับบริการ →
   เลือกช่วงเวลา → ดูภาพรวมย้อนหลัง 4 ส่วนตามข้อกำหนด:
     (ก) ผลการประเมินทางสังคมสงเคราะห์ — แนวโน้มคะแนน Barthel ADL
         (แกนเดียว) + ตารางประวัติการประเมิน
     (ข) การติดตามการช่วยเหลือ — ติดตามได้/ไม่ได้ + ผล + ผู้บันทึก
         (ป้อนจากขั้นตอนที่ 6 ของแบบ สส.2)
     (ค) วัสดุและกายอุปกรณ์ที่ได้รับ — จากบัญชีจ่ายออกของหน้ารับ-จ่ายวัสดุ
     (ง) เงินสนับสนุนที่ได้รับ — สรุปตามประเภทเงิน
   หน้านี้อ่านอย่างเดียว มีปุ่มพิมพ์สรุปพร้อม audit ผู้พิมพ์ + เวลา. */

const breadcrumb = ['ระบบบันทึกการรักษา', 'งานสังคมสงเคราะห์', 'ติดตามการบริการ'];
const SEARCH_HISTORY_KEY = 'mih:primarysearch-history:social-work-followup';
const PAGE_SIZE = 8;

/* yyyy-mm-dd จากเวลาท้องถิ่น — toISOString() จะเลื่อนวันถอยหลังที่ UTC+7 */
const isoOf = (d) => toLocalIso(d);
const todayIsoLocal = () => isoOf(new Date());
const monthsAgoIso = (n) => {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return isoOf(d);
};
const startOfMonthIso = () => {
  const d = new Date();
  d.setDate(1);
  return isoOf(d);
};

const QUICK_RANGES = [
  { key: 'thisMonth', label: 'เดือนนี้', from: startOfMonthIso },
  { key: '3m', label: '3 เดือน', from: () => monthsAgoIso(3) },
  { key: '6m', label: '6 เดือน', from: () => monthsAgoIso(6) },
  { key: '1y', label: '1 ปี', from: () => monthsAgoIso(12) },
];

const patientToSearchItem = (row) => ({
  id: row.hn,
  label: row.name,
  sublabel: row.worker || row.owner,
  value: row.name,
  badges: [
    { label: row.hn, tone: 'indigo' },
    ...(row.caseNo ? [{ label: row.caseNo, tone: 'teal' }] : []),
  ],
  avatarSrc: getPatientByHN(row.hn)?.avatarUrl,
});

const SocialWorkFollowUpPage = () => {
  const history = useHistory();
  const [selectedHn, setSelectedHn] = useState(null);
  const [searchQ, setSearchQ] = useState('');
  const [quick, setQuick] = useState('6m');
  const [range, setRange] = useState({ from: monthsAgoIso(6), to: todayIsoLocal() });
  const [followPage, setFollowPage] = useState(1);
  const [, setRightsTick] = useState(0);
  const [printTick, setPrintTick] = useState(0);

  const {
    history: searchHistory,
    push: pushHistory,
    clear: clearHistory,
  } = useSearchHistory(SEARCH_HISTORY_KEY, { seedIfEmpty: [] });

  const canRead = hasSocialWorkRights();
  const toggleRightsDemo = () => {
    setSocialWorkRights(!hasSocialWorkRights());
    setRightsTick((t) => t + 1);
  };

  /* ผู้รับบริการที่ค้นได้ = คิววันนี้ + นัดวันนี้ + ทุกคนในทะเบียน */
  const pool = useMemo(() => {
    const seen = new Set();
    return [...getSwQueueRows(), ...SW_SCHEDULED_TODAY, ...getSwRegistryRows()]
      .filter((p) => (seen.has(p.hn) ? false : seen.add(p.hn)));
  }, []);

  const selectedRow = useMemo(() => pool.find((p) => p.hn === selectedHn) || null, [pool, selectedHn]);
  const cardPatient = useMemo(
    () => (selectedHn && getPatientByHN(selectedHn)) || DEFAULT_PATIENT,
    [selectedHn],
  );
  const registration = useMemo(
    () => (selectedHn ? getSwRegistrationByHn(selectedHn) : null),
    [selectedHn],
  );

  const assessments = useMemo(
    () => (selectedHn ? getSwAssessmentsByHn(selectedHn, range.from, range.to) : []),
    [selectedHn, range],
  );
  const followUps = useMemo(
    () => (selectedHn ? getSwFollowUpHistory(selectedHn, range.from, range.to) : []),
    [selectedHn, range],
  );
  /* `issues` (กรองรายการยกเลิก) ใช้กับตัวนับสรุป + บรรทัดพิมพ์ —
     `issuesWithCancelled` ใช้กับตารางรายละเอียด เพื่อโชว์แถวยกเลิกพร้อม badge */
  const issues = useMemo(
    () => (selectedHn ? getSwIssuesByHn(selectedHn, range.from, range.to) : []),
    [selectedHn, range],
  );
  const issuesWithCancelled = useMemo(
    () => (selectedHn ? getSwIssuesByHn(selectedHn, range.from, range.to, { includeCancelled: true }) : []),
    [selectedHn, range],
  );
  const funds = useMemo(
    () => (selectedHn ? getSwFundHistory(selectedHn, range.from, range.to) : []),
    [selectedHn, range],
  );

  const followUpsSorted = useMemo(
    () => [...followUps].sort((a, b) => b.date.localeCompare(a.date)),
    [followUps],
  );

  const totalFollowPages = Math.max(1, Math.ceil(followUpsSorted.length / PAGE_SIZE));
  const followPageRows = followUpsSorted
    .slice((followPage - 1) * PAGE_SIZE, followPage * PAGE_SIZE)
    .map((r, i) => ({ ...r, _rk: `fu-${(followPage - 1) * PAGE_SIZE + i}` }));

  useEffect(() => {
    if (followPage > totalFollowPages) setFollowPage(totalFollowPages);
  }, [followPage, totalFollowPages]);

  const latestAssessment = assessments.length > 0 ? assessments[assessments.length - 1] : null;
  const totalFundAmount = funds.reduce((s, f) => s + (Number(f.amount) || 0), 0);
  const unreachedCount = followUps.filter((f) => f.reached === false).length;

  const summaryCards = useMemo(() => ([
    { key: 'assess', label: 'ครั้งที่ประเมิน ADL ในช่วง', value: assessments.length, color: 'info', icon: 'checklist' },
    { key: 'follow', label: 'ครั้งที่ติดตามในช่วง', value: followUps.length, color: 'positive', icon: 'fact_check' },
    { key: 'unreached', label: 'ติดตามไม่ได้', value: unreachedCount, color: unreachedCount > 0 ? 'negative' : 'positive', icon: 'phone_missed' },
    { key: 'funds', label: 'เงินสนับสนุนรวม (บาท)', value: canRead ? totalFundAmount.toLocaleString('th-TH') : '••••', color: 'warning', icon: 'payments' },
  ]), [assessments, followUps, unreachedCount, totalFundAmount, canRead]);

  const pickQuick = (key) => {
    const q = QUICK_RANGES.find((r) => r.key === key);
    if (!q) return;
    setQuick(key);
    setRange({ from: q.from(), to: todayIsoLocal() });
    setFollowPage(1);
  };

  const selectPatient = (hn) => {
    setSelectedHn(hn);
    setFollowPage(1);
  };

  const searchFields = (row) => [row.hn, row.cid, row.name, row.caseNo];

  const pickerMatchCount = useMemo(() => {
    const q = searchQ.trim().toLowerCase();
    if (!q) return 0;
    return pool.filter((row) => searchFields(row).some((f) => f && String(f).toLowerCase().includes(q))).length;
  }, [searchQ, pool]);

  const searchSuggestions = useMemo(() => {
    const q = searchQ.trim().toLowerCase();
    if (!q) return [];
    return pool
      .filter((row) => searchFields(row).some((f) => f && String(f).toLowerCase().includes(q)))
      .slice(0, 8)
      .map(patientToSearchItem);
  }, [searchQ, pool]);

  const resolveSearchRow = (query, item) => {
    if (item?.id) {
      const byId = pool.find((row) => row.hn === item.id);
      if (byId) return byId;
    }
    const q = (query ?? item?.value ?? item?.label ?? '').toString().trim().toLowerCase();
    if (!q) return null;
    return pool.find((row) => searchFields(row).some((f) => f && String(f).toLowerCase().includes(q))) ?? null;
  };

  /* พิมพ์สรุปการติดตาม (playbook §5 การพิมพ์เอกสาร) */
  const printLog = useMemo(
    () => (selectedHn ? getSwPrintLog(selectedHn) : []),
    [selectedHn, printTick],
  );

  const hasData = assessments.length > 0 || followUps.length > 0 || issues.length > 0 || funds.length > 0;

  const printSummary = () => {
    if (!selectedHn) return;
    logSwPrint(selectedHn, `สรุปการติดตามการบริการสังคมสงเคราะห์ (${formatSwDate(range.from)} – ${formatSwDate(range.to)})`);
    setPrintTick((t) => t + 1);
  };

  /* ── columns ───────────────────────────────────────────────────── */
  const assessmentColumns = [
    { key: 'date', label: 'วันที่ประเมิน', render: (r) => formatSwDate(r.date) },
    { key: 'requestNo', label: 'เลขทะเบียนผู้ขอ', render: (r) => r.requestNo || '—' },
    { key: 'score', label: 'คะแนน', align: 'right', render: (r) => `${r.score}/${SW_BARTHEL_MAX}` },
    {
      key: 'interp', label: 'แปลผล', flex: true, minWidth: 280, sortable: false,
      render: (r) => {
        const it = interpretBarthel(r.score);
        return <ColorfulBadge style={it.style} size='small' hierarchy='secondary' width='hug' maxWidth={420}>{it.label}</ColorfulBadge>;
      },
    },
    { key: 'assessor', label: 'ผู้ประเมิน', flex: true, minWidth: 190 },
    { key: 'note', label: 'หมายเหตุ', flex: true, minWidth: 220, render: (r) => r.note || '—' },
  ];

  const followColumns = [
    { key: 'date', label: 'วันที่ติดตาม', render: (r) => formatSwDate(r.date) },
    {
      key: 'reached', label: 'ผลการติดต่อ',
      render: (r) => (
        <ColorfulBadge style={r.reached ? 'green' : 'orange'} size='small' hierarchy='secondary'>
          {r.reached ? 'ติดตามได้' : 'ติดตามไม่ได้'}
        </ColorfulBadge>
      ),
    },
    { key: 'result', label: 'ผลการติดตาม / สาเหตุ', flex: true, minWidth: 360 },
    { key: 'by', label: 'ผู้บันทึก', flex: true, minWidth: 190 },
  ];

  const issueColumns = [
    { key: 'issueDate', label: 'วันที่ได้รับ', render: (r) => formatSwDate(r.issueDate) },
    { key: 'material', label: 'วัสดุ / กายอุปกรณ์', flex: true, minWidth: 240, render: (r) => findSwMaterial(r.materialCode)?.name || r.materialCode },
    { key: 'category', label: 'หมวด', render: (r) => resolveSwCategory(findSwMaterial(r.materialCode)?.category) },
    { key: 'qty', label: 'จำนวน', align: 'right', render: (r) => `${r.qty} ${r.unit || ''}` },
    { key: 'lot', label: 'Lot' },
    {
      key: 'status', label: 'สถานะ',
      render: (r) => (r.status === 'cancelled'
        ? <ColorfulBadge style='red' size='small' hierarchy='secondary'>ยกเลิกการจ่าย</ColorfulBadge>
        : <ColorfulBadge style='green' size='small' hierarchy='secondary'>จ่ายแล้ว</ColorfulBadge>),
    },
    { key: 'issuedBy', label: 'ผู้จ่าย', flex: true, minWidth: 190 },
  ];

  const fundColumns = [
    { key: 'date', label: 'วันที่', render: (r) => formatSwDate(r.date) },
    { key: 'type', label: 'ประเภทเงินสนับสนุน', flex: true, minWidth: 220, render: (r) => resolveSwFundType(r.type) },
    { key: 'amount', label: 'จำนวนเงิน', align: 'right', render: (r) => formatBaht(r.amount) },
    { key: 'note', label: 'หมายเหตุ', flex: true, minWidth: 240, render: (r) => r.note || '—' },
    { key: 'by', label: 'ผู้บันทึก', flex: true, minWidth: 190 },
  ];

  const fundsByType = SW_FUND_TYPES
    .map((t) => ({
      ...t,
      total: funds.filter((f) => f.type === t.value).reduce((s, f) => s + (Number(f.amount) || 0), 0),
      count: funds.filter((f) => f.type === t.value).length,
    }))
    .filter((t) => t.count > 0);

  return (
    <QueuePageShell
      activeKey='treat'
      breadcrumb={breadcrumb}
      title='ติดตามการบริการทางสังคมสงเคราะห์'
      onBack={() => history.push('/clinic/social-work')}
      backLabel='กลับหน้าคิว'
      actions={(
        <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-300, 12px)' }}>
          <NeutralSubdueButton
            size='sm'
            leadingIcon={canRead ? 'lock_open' : 'lock'}
            onClick={toggleRightsDemo}
            title='สลับสิทธิงานสังคมสงเคราะห์ (สำหรับทดสอบ)'
          >
            {canRead ? 'สิทธิ: เข้าถึงได้' : 'สิทธิ: ถูกจำกัด'}
          </NeutralSubdueButton>
          {selectedHn && canRead && hasData && (
            <BrandSubdueButton variant='outline' leadingIcon='print' onClick={printSummary}>
              พิมพ์สรุปการติดตาม
            </BrandSubdueButton>
          )}
          <BrandSubdueButton variant='outline' leadingIcon='contact_page' onClick={() => history.push('/clinic/social-work/registry')}>
            ทะเบียนผู้รับบริการ
          </BrandSubdueButton>
        </div>
      )}
      summaryCards={summaryCards}
    >
      <div
        className='flex flex-col flex-1 min-w-0'
        style={{
          paddingTop: 'var(--dim-space-600, 24px)',
          paddingBottom: 'var(--dim-space-600, 24px)',
          paddingLeft: 'var(--dim-space-600, 24px)',
          paddingRight: 'var(--dim-space-600, 24px)',
          gap: 'var(--dim-space-600, 24px)',
        }}
      >
        {/* ── Patient search ─────────────────────────────────────── */}
        <SwSectionCard icon='person_search' title='เลือกผู้รับบริการ'>
          <div className='w-full flex items-start justify-center'>
            <PrimarySearch
              value={searchQ}
              onChange={setSearchQ}
              onSubmit={(label, item) => {
                setSearchQ(label);
                const match = resolveSearchRow(label, item);
                pushHistory(match ? patientToSearchItem(match) : (item ?? label));
                if (match) selectPatient(match.hn);
              }}
              suggestions={searchSuggestions}
              history={searchHistory}
              onHistoryClear={searchHistory.length > 0 ? clearHistory : undefined}
              placeholder='ค้นหา HN / ชื่อ-สกุลผู้รับบริการ / เลขที่สังคมสงเคราะห์ (เลข CASE)'
              width={640}
            />
          </div>
          {searchQ.trim() && !selectedHn ? (
            <SearchResultCount found={pickerMatchCount} total={pool.length} />
          ) : null}
          {searchQ.trim() && searchSuggestions.length === 0 && !selectedHn && (
            <SwEmptyHint>
              ไม่พบผู้รับบริการที่ตรงกับ "{searchQ.trim()}" — ตรวจสอบ HN หรือเลข CASE แล้วลองอีกครั้ง
            </SwEmptyHint>
          )}
          {!selectedHn && !searchQ.trim() && (
            <SwEmptyHint icon='monitoring'>
              ค้นหาและเลือกผู้รับบริการเพื่อดูผลการประเมินทางสังคมสงเคราะห์ การติดตามการช่วยเหลือ
              วัสดุ/กายอุปกรณ์ที่ได้รับ และเงินสนับสนุนย้อนหลัง
            </SwEmptyHint>
          )}
        </SwSectionCard>

        {selectedHn && (
          <PatientCard
            patient={cardPatient}
            title='ติดตามการบริการรายบุคคล'
            onBack={() => setSelectedHn(null)}
            actions={(
              <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-300, 12px)' }}>
                <ColorfulBadge style='red' size='small' hierarchy='secondary'>ข้อมูลลับ §1.4.2</ColorfulBadge>
                {registration && (
                  <ColorfulBadge style='teal' size='small' hierarchy='secondary'>
                    {registration.caseNo} · {resolveSwTargetGroup(registration.targetGroup)}
                  </ColorfulBadge>
                )}
              </div>
            )}
          />
        )}

        {/* ผู้รับบริการยังไม่มีทะเบียน → ต้องลงทะเบียนก่อน */}
        {selectedHn && !registration && (
          <SwSectionCard icon='contact_page' title='ยังไม่มีทะเบียนสังคมสงเคราะห์'>
            <SwEmptyHint icon='assignment_late'>
              {selectedRow?.name || 'ผู้รับบริการ'} (HN {selectedHn}) ยังไม่ได้ลงทะเบียนผู้รับบริการสังคมสงเคราะห์ —
              ต้องลงทะเบียนและออกเลข CASE ก่อนจึงจะติดตามผลการบริการต่อเนื่องได้
            </SwEmptyHint>
            <div className='flex items-center justify-center w-full'>
              <BrandSubdueButton variant='fill' leadingIcon='person_add' onClick={() => history.push('/clinic/social-work/registry')}>
                ไปที่ทะเบียนผู้รับบริการ
              </BrandSubdueButton>
            </div>
          </SwSectionCard>
        )}

        {selectedHn && registration && (
          <>
            {/* ── ช่วงเวลา ────────────────────────────────────────── */}
            <SwSectionCard icon='date_range' title='ช่วงเวลาที่ติดตาม'>
              <div className='flex items-center w-full flex-wrap' style={{ gap: 'var(--dim-space-300, 12px)' }}>
                {QUICK_RANGES.map((r) => (
                  <SelectableTag key={r.key} label={r.label} size='md' selected={quick === r.key} onClick={() => pickQuick(r.key)} />
                ))}
                <div style={{ minWidth: 320 }}>
                  <DatePickerRange
                    showLabel={false}
                    showHelperText={false}
                    size='md'
                    value={[range.from, range.to]}
                    onChange={([from, to]) => {
                      setRange({ from, to });
                      setQuick(null);
                      setFollowPage(1);
                    }}
                    format={isoOf}
                    parse={(s) => (s ? new Date(s) : null)}
                  />
                </div>
                <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary, #636B72)' }}>
                  {formatSwDate(range.from)} – {formatSwDate(range.to)}
                </span>
              </div>
              <div className='flex items-center w-full flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                <ColorfulIconBadge style='teal' icon='badge' size='medium' />
                <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary, #636B72)' }}>
                  {registration.caseNo} · ปัญหาแรกรับ {resolveSwProblemLabel(registration.firstProblem)} ·
                  {` เจ้าของเคส ${registration.owner || '—'}`}
                </span>
              </div>
            </SwSectionCard>

            {!canRead ? (
              <SwSectionCard icon='lock_person' title='ข้อมูลการติดตามผล'>
                <SwConfidentialMask what='ผลการประเมิน การติดตามการช่วยเหลือ วัสดุที่ได้รับ และเงินสนับสนุน' />
              </SwSectionCard>
            ) : (
              <>
                {/* (ก) ผลการประเมินทางสังคมสงเคราะห์ */}
                <SwSectionCard
                  icon='monitoring'
                  title='ผลการประเมินทางสังคมสงเคราะห์ (Barthel ADL)'
                  aside={latestAssessment ? (
                    <ColorfulBadge
                      style={interpretBarthel(latestAssessment.score).style}
                      size='small' hierarchy='secondary' width='hug' maxWidth={480}
                    >
                      {`ล่าสุด ${latestAssessment.score}/${SW_BARTHEL_MAX} — ${interpretBarthel(latestAssessment.score).label}`}
                    </ColorfulBadge>
                  ) : undefined}
                >
                  {assessments.length === 0 ? (
                    <SwEmptyHint icon='show_chart'>
                      ไม่มีผลประเมินในช่วง {formatSwDate(range.from)} – {formatSwDate(range.to)} —
                      ปรับช่วงเวลา หรือประเมินจากหน้าทะเบียนผู้ขอวัสดุ
                    </SwEmptyHint>
                  ) : (
                    <>
                      {assessments.length >= 2 ? (
                        <div
                          className='flex flex-col w-full'
                          style={{
                            gap: 'var(--dim-space-200, 8px)',
                            paddingTop: 'var(--dim-space-400, 16px)',
                            paddingBottom: 'var(--dim-space-400, 16px)',
                            paddingLeft: 'var(--dim-space-400, 16px)',
                            paddingRight: 'var(--dim-space-400, 16px)',
                            borderRadius: 'var(--dim-radius-chart-area, 10px)',
                            border: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary, #EEF0F1)',
                            background: 'var(--surface-chart-area, #FEFEFE)',
                          }}
                        >
                          <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-chart-axis-label, #A3ACB4)' }}>
                            คะแนนเต็ม {SW_BARTHEL_MAX} — ยิ่งสูงยิ่งช่วยเหลือตนเองได้มาก
                          </span>
                          <LineChart
                            months={assessments.map((a) => formatSwDate(a.date))}
                            series={[{
                              label: 'คะแนน Barthel ADL',
                              color: 'var(--surface-colorfulbadge-teal-bold, #24A899)',
                              values: assessments.map((a) => a.score),
                            }]}
                            height={180}
                          />
                        </div>
                      ) : (
                        <SwBanner tone='neutral' icon='info'>
                          มีผลประเมินเพียงครั้งเดียวในช่วงนี้ ({assessments[0].score}/{SW_BARTHEL_MAX} เมื่อ {formatSwDate(assessments[0].date)}) —
                          ต้องมีอย่างน้อย 2 ครั้งจึงจะแสดงเป็นเส้นแนวโน้มได้
                        </SwBanner>
                      )}
                      <Table
                        columns={assessmentColumns}
                        rows={[...assessments].reverse().map((a, i) => ({ ...a, _rk: a.id || `as-${i}` }))}
                        rowKey={(r) => r._rk}
                        emptyMessage='ไม่มีผลประเมินในช่วงเวลาที่เลือก'
                      />
                    </>
                  )}
                </SwSectionCard>

                {/* (ข) การติดตามการช่วยเหลือ */}
                <SwSectionCard
                  icon='fact_check'
                  title='การติดตามการช่วยเหลือ'
                  aside={unreachedCount > 0 ? (
                    <ColorfulBadge style='orange' size='small' hierarchy='secondary'>
                      ติดตามไม่ได้ {unreachedCount} ครั้ง
                    </ColorfulBadge>
                  ) : undefined}
                >
                  {followUpsSorted.length === 0 ? (
                    <SwEmptyHint icon='event_note'>
                      ไม่มีบันทึกการติดตามในช่วงเวลาที่เลือก — บันทึกได้ที่ขั้นตอนที่ 6 ของแบบ สส.2
                    </SwEmptyHint>
                  ) : (
                    <>
                      <Table
                        columns={followColumns}
                        rows={followPageRows}
                        rowKey={(r) => r._rk}
                        emptyMessage='ไม่มีบันทึกการติดตาม'
                      />
                      <SwPagerBar total={followUpsSorted.length} page={followPage} pageSize={PAGE_SIZE}>
                        <Pagination currentPage={followPage} pageCount={totalFollowPages} onPageChange={setFollowPage} />
                      </SwPagerBar>
                    </>
                  )}
                </SwSectionCard>

                {/* (ค) วัสดุและกายอุปกรณ์ที่ได้รับ */}
                <SwSectionCard
                  icon='inventory_2'
                  title='วัสดุและกายอุปกรณ์ที่ได้รับ'
                  aside={(
                    <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
                      ดึงจากบัญชีจ่ายออกของหน้ารับ-จ่ายวัสดุ — {issues.length} รายการในช่วง
                    </span>
                  )}
                >
                  {issuesWithCancelled.length === 0 ? (
                    <SwEmptyHint icon='inventory'>
                      ยังไม่ได้รับวัสดุหรือกายอุปกรณ์ในช่วงเวลาที่เลือก
                    </SwEmptyHint>
                  ) : (
                    <Table
                      columns={issueColumns}
                      rows={issuesWithCancelled}
                      rowKey={(r) => r.id}
                      emptyMessage='ไม่มีรายการวัสดุ'
                    />
                  )}
                </SwSectionCard>

                {/* (ง) เงินสนับสนุนที่ได้รับ */}
                <SwSectionCard
                  icon='payments'
                  title='เงินสนับสนุนที่ได้รับ'
                  aside={(
                    <ColorfulBadge style='teal' size='small' hierarchy='secondary'>
                      รวม {formatBaht(totalFundAmount)}
                    </ColorfulBadge>
                  )}
                >
                  {funds.length === 0 ? (
                    <SwEmptyHint icon='payments'>ไม่มีการช่วยเหลือด้วยเงินสนับสนุนในช่วงเวลาที่เลือก</SwEmptyHint>
                  ) : (
                    <>
                      <div className='flex items-center w-full flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                        {fundsByType.map((t) => (
                          <ColorfulBadge key={t.value} style='blue' size='small' hierarchy='secondary' width='hug' maxWidth={420}>
                            {`${t.label}: ${formatBaht(t.total)} (${t.count} ครั้ง)`}
                          </ColorfulBadge>
                        ))}
                      </div>
                      <Table
                        columns={fundColumns}
                        rows={[...funds].sort((a, b) => b.date.localeCompare(a.date)).map((f, i) => ({ ...f, _rk: `fund-${i}` }))}
                        rowKey={(r) => r._rk}
                        emptyMessage='ไม่มีรายการเงินสนับสนุน'
                      />
                    </>
                  )}
                </SwSectionCard>

                {/* พิมพ์เอกสาร + audit */}
                <SwSectionCard
                  icon='print'
                  title='พิมพ์เอกสาร'
                  aside={(
                    <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
                      บันทึกผู้พิมพ์และเวลาทุกครั้ง (ข้อมูลลับ §1.4.2)
                    </span>
                  )}
                >
                  <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-300, 12px)' }}>
                    <BrandSubdueButton variant='outline' leadingIcon='print' disabled={!hasData} onClick={printSummary}>
                      พิมพ์สรุปการติดตาม
                    </BrandSubdueButton>
                    <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary, #636B72)' }}>
                      ช่วง {formatSwDate(range.from)} – {formatSwDate(range.to)} ·
                      ประเมิน {assessments.length} ครั้ง · ติดตาม {followUps.length} ครั้ง ·
                      วัสดุ {issues.length} รายการ · เงินสนับสนุน {formatBaht(totalFundAmount)}
                    </span>
                  </div>
                  {!hasData && (
                    <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
                      ไม่มีข้อมูลในช่วงที่เลือก — ปรับช่วงเวลาก่อนพิมพ์
                    </span>
                  )}
                  {printLog.length > 0 && (
                    <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
                      {printLog.map((e, i) => (
                        <span key={`${e.at}-${i}`} style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
                          พิมพ์{e.docType} โดย {e.by} · {formatSwDateTime(e.at)}
                        </span>
                      ))}
                    </div>
                  )}
                </SwSectionCard>
              </>
            )}
          </>
        )}

        <span className='inline-flex items-center' style={{ gap: 'var(--dim-space-100, 4px)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
          <Icon name='info' size={14} />
          หน้านี้แสดงข้อมูลอย่างเดียว — แก้ไขการติดตามที่แบบ สส.2 · แก้ไขการจ่ายวัสดุที่หน้ารับ-จ่ายวัสดุ
        </span>
      </div>
    </QueuePageShell>
  );
};

export default SocialWorkFollowUpPage;
