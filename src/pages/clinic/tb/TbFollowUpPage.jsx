import React, { useEffect, useMemo, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import PrimarySearch from '@/components/search/PrimarySearch';
import useSearchHistory from '@/components/search/useSearchHistory';
import PatientCard from '@/components/card/PatientCard';
import DatePickerRange from '@/components/forms/DatePickerRange';
import DatePicker from '@/components/forms/DatePicker';
import Select from '@/components/forms/Select';
import InputField from '@/components/forms/InputField';
import SelectableTag from '@/components/forms/SelectableTag';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import Table from '@/components/table/Table';
import Pagination from '@/components/pagination/Pagination';
import Popup from '@/components/popup/Popup';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import ColorfulIconBadge from '@/components/badge/ColorfulIconBadge';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import Icon from '@/components/icons/Icon';
import { LineChart } from '@/components/graph/Charts';
import DotCalendarLog from '@/pages/clinic/tb/DotCalendarLog';
import { TopicHeader, Field, Banner, ErrorNote, ReadOnlyBanner, EmptyPanel, RowAuditNote } from '@/pages/clinic/tb/tbShared';
import { getPatientByHN, DEFAULT_PATIENT } from '@/data/patientProfiles';
import {
  getTbRegistryRows,
  getTbRegistryByRegNo,
  isTbRegistryReadOnly,
  addTbRow,
  updateTbRow,
  cancelTbRow,
  resolveTbRegimen,
  resolveTbSmearResult,
  resolveTbCultureResult,
  resolveTbOutcome,
  formatTbDate,
} from '@/data/tbRegistry';
import { resolveTbPatientType } from '@/data/tbQueue';
import { getDotLog, getDotConfig, computeDotAdherence } from '@/data/tbDotLog';
import {
  canEditTb,
  maskTbName,
  TB_CURRENT_USER,
  TB_FOLLOWUP_TYPES,
  TB_FOLLOWUP_SUGGESTIONS,
  TB_CANCEL_REASON_SUGGESTIONS,
} from '@/data/tbVisits';

/* TbFollowUpPage — ติดตามการดูแลผู้รับบริการวัณโรค + ผลตรวจผู้สัมผัสโรค
   (TOR §1.10.4.8 + .5 + .1) ที่ /clinic/tb/follow-up. โครงเดียวกับ
   MentalHealthFollowUpPage / NcdFollowUpPage: ค้นหาผู้ป่วย → PatientCard →
   เลือกช่วงเวลา → การ์ดสรุป · กราฟแนวโน้ม (small multiples — หนึ่งตัวชี้วัด
   ต่อหนึ่ง plot ไม่ปนแกน) · timeline การเปลี่ยนผลเสมหะ · ตารางการติดตาม
   (เพิ่ม/แก้ไข/ยกเลิกครบ) · ผู้สัมผัสโรค · ผลตรวจที่เกี่ยวข้องพร้อมลิงก์ออก
   ไประบบชันสูตร (/lab) และรังสีวินิจฉัย (/xray). */

const breadcrumb = ['ระบบบันทึกการรักษา', 'คลินิกวัณโรค', 'ติดตามการดูแล'];
const SEARCH_HISTORY_KEY = 'mih:primarysearch-history:tb-followup';
const FOLLOWUP_PAGE_SIZE = 8;

const isoOf = (d) => d.toISOString().slice(0, 10);
const todayIso = () => isoOf(new Date());
const monthsAgoIso = (n) => {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return isoOf(d);
};

const QUICK_RANGES = [
  { key: '3m', label: '3 เดือน', from: () => monthsAgoIso(3) },
  { key: '6m', label: '6 เดือน', from: () => monthsAgoIso(6) },
  { key: '1y', label: '1 ปี', from: () => monthsAgoIso(12) },
  { key: 'all', label: 'ตลอดการรักษา', from: () => '2000-01-01' },
];

const TH_MONTHS_SHORT = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const shortThaiDate = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getDate()} ${TH_MONTHS_SHORT[d.getMonth()]}`;
};

const SectionCard = ({ icon, title, aside, children }) => (
  <section
    className='w-full flex flex-col'
    style={{
      background: 'var(--surface-card-100, #FFFFFF)',
      borderRadius: 'var(--dim-radius-500, 16px)',
      border: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary, #C5EDDA)',
      boxShadow: 'var(--shadow-card-strong)',
      paddingTop: 'var(--dim-space-600, 24px)',
      paddingBottom: 'var(--dim-space-600, 24px)',
      paddingLeft: 'var(--dim-space-600, 24px)',
      paddingRight: 'var(--dim-space-600, 24px)',
      gap: 'var(--dim-space-400, 16px)',
    }}
  >
    <TopicHeader icon={icon} trailing={aside}>{title}</TopicHeader>
    {children}
  </section>
);

/* หนึ่งตัวชี้วัดต่อหนึ่ง plot — สีคงที่ต่อชุดข้อมูล ไม่สลับกันเอง. */
const TrendPlot = ({ label, unit, color, points }) => (
  <div
    className='flex flex-col'
    style={{
      gap: 'var(--dim-space-200, 8px)',
      paddingTop: 'var(--dim-space-400, 16px)',
      paddingBottom: 'var(--dim-space-400, 16px)',
      paddingLeft: 'var(--dim-space-400, 16px)',
      paddingRight: 'var(--dim-space-400, 16px)',
      borderRadius: 'var(--dim-radius-400, 12px)',
      border: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary, #F4F5F5)',
      background: 'var(--surface-card-100, #FFFFFF)',
    }}
  >
    <div className='flex items-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
      <span
        aria-hidden='true'
        style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }}
      />
      <span style={{ fontSize: 'var(--type-size-sm, 14px)', fontWeight: 'var(--type-weight-bold, 700)', color: 'var(--text-content-default, #363B3F)' }}>
        {label}
      </span>
      <span style={{ fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary, #858C92)' }}>{unit}</span>
    </div>
    {points.length >= 2 ? (
      <LineChart
        months={points.map((p) => shortThaiDate(p.date))}
        series={[{ label, color, values: points.map((p) => p.value) }]}
        height={160}
      />
    ) : points.length === 1 ? (
      <div className='flex items-center' style={{ gap: 'var(--dim-space-300, 12px)', paddingTop: 'var(--dim-space-400, 16px)', paddingBottom: 'var(--dim-space-400, 16px)' }}>
        <span aria-hidden='true' style={{ width: 12, height: 12, borderRadius: '50%', background: color, flexShrink: 0 }} />
        <div className='flex flex-col'>
          <span style={{ fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-default, #363B3F)' }}>
            {points[0].value} {unit} · {formatTbDate(points[0].date)}
          </span>
          <span style={{ fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary, #858C92)' }}>
            มีข้อมูลจุดเดียวในช่วงนี้ — ต้องมีอย่างน้อย 2 จุดจึงลากเป็นเส้นแนวโน้มได้
          </span>
        </div>
      </div>
    ) : (
      <span style={{ fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-tertiary, #858C92)', paddingTop: 'var(--dim-space-400, 16px)', paddingBottom: 'var(--dim-space-400, 16px)' }}>
        ไม่มีข้อมูลในช่วงเวลาที่เลือก
      </span>
    )}
  </div>
);

const StatTile = ({ icon, label, value, tone = 'blue' }) => (
  <div
    className='flex items-center flex-1'
    style={{
      minWidth: 220,
      gap: 'var(--dim-space-300, 12px)',
      paddingTop: 'var(--dim-space-400, 16px)',
      paddingBottom: 'var(--dim-space-400, 16px)',
      paddingLeft: 'var(--dim-space-400, 16px)',
      paddingRight: 'var(--dim-space-400, 16px)',
      borderRadius: 'var(--dim-radius-400, 12px)',
      border: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary, #F4F5F5)',
      background: 'var(--surface-neutral-quaternary, #F9FBFB)',
    }}
  >
    <ColorfulIconBadge style={tone} icon={icon} size='medium' />
    <div className='flex flex-col min-w-0'>
      <span style={{ fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary, #858C92)' }}>{label}</span>
      <span style={{ fontSize: 'var(--type-size-base, 16px)', fontWeight: 'var(--type-weight-bold, 700)', color: 'var(--text-content-default, #363B3F)' }}>
        {value}
      </span>
    </div>
  </div>
);

const TbFollowUpPage = () => {
  const history = useHistory();
  const { state: navState } = useLocation();

  const [tick, setTick] = useState(0);
  const bump = () => setTick((t) => t + 1);
  const canEdit = canEditTb();

  const [selectedId, setSelectedId] = useState(null);
  const [searchQ, setSearchQ] = useState('');
  const [quick, setQuick] = useState('6m');
  const [range, setRange] = useState({ from: monthsAgoIso(6), to: todayIso() });
  const [fuPage, setFuPage] = useState(1);

  /* popup เพิ่ม/แก้ไข/ยกเลิกการติดตาม */
  const [fuPopup, setFuPopup] = useState(null); // { mode, rowId }
  const [fuDraft, setFuDraft] = useState({ date: '', type: '', by: '', note: '' });
  const [fuBaseline, setFuBaseline] = useState({});
  const [fuError, setFuError] = useState('');
  const [discardOpen, setDiscardOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState('');

  const {
    history: searchHistory,
    push: pushHistory,
    clear: clearHistory,
  } = useSearchHistory(SEARCH_HISTORY_KEY, { seedIfEmpty: [] });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const pool = useMemo(() => getTbRegistryRows().slice(), [tick]);
  const record = useMemo(() => pool.find((r) => r.id === selectedId) || null, [pool, selectedId]);
  const readOnlyRecord = record ? isTbRegistryReadOnly(record) : false;
  const canMutate = canEdit && record && !readOnlyRecord;

  const cardPatient = useMemo(
    () => (record?.hn && getPatientByHN(record.hn)) || DEFAULT_PATIENT,
    [record],
  );

  /* Deep-link จากทะเบียน / คิว */
  useEffect(() => {
    if (!navState) return;
    const found = navState.regNo
      ? getTbRegistryByRegNo(navState.regNo)
      : navState.hn
        ? getTbRegistryRows().find((r) => r.hn === navState.hn && !r.cancelled)
        : null;
    if (found) setSelectedId(found.id);
  }, [navState]);

  const inRange = (iso) => !!iso && iso >= range.from && iso <= range.to;

  const displayName = (name) => (canEdit ? name : maskTbName(name));

  /* ── ข้อมูลในช่วงเวลา ─────────────────────────────────────────── */

  const regimenRows = useMemo(
    () => (record ? record.regimenRows.filter((r) => inRange(r.dispensedDate)) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [record, range, tick],
  );
  const sputumRows = useMemo(
    () => (record ? record.sputumRows.filter((r) => inRange(r.date)) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [record, range, tick],
  );
  const followUps = useMemo(
    () => (record ? record.followUps.filter((r) => inRange(r.date)) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [record, range, tick],
  );

  /* สำเนาตื้น — getDotLog คืน object เดิมที่ถูก mutate in place; ถ้าไม่ copy
     memo ของกราฟ %DOT จะไม่คำนวณใหม่เมื่อมีการบันทึก DOT จากหน้าอื่น. */
  const dotLog = useMemo(
    () => (record ? { ...getDotLog(record.id) } : {}),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [record, tick],
  );
  const dotConfig = record ? getDotConfig(record.id) : null;
  const adherence = useMemo(
    () => (record ? computeDotAdherence(record.id) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [record, tick],
  );

  /* น้ำหนัก (kg) จากแถวจ่ายยา — หนึ่ง plot */
  const weightPoints = useMemo(
    () => regimenRows
      .filter((r) => r.status !== 'cancelled' && r.weightKg)
      .sort((a, b) => String(a.dispensedDate).localeCompare(String(b.dispensedDate)))
      .map((r) => ({ date: r.dispensedDate, value: Number(r.weightKg) })),
    [regimenRows],
  );

  /* %DOT รายเดือน จาก log — คำนวณครั้งเดียวต่อ log/ช่วง (memo กัน re-compute
     ทุก render ตามข้อเตือนเรื่อง MDR ที่มี log ~150 วัน). */
  const dotMonthlyPoints = useMemo(() => {
    const buckets = {};
    Object.keys(dotLog).forEach((key) => {
      if (!inRange(key)) return;
      const entry = dotLog[key];
      if (!entry || entry.status === 'holiday') return;
      const month = key.slice(0, 7);
      if (!buckets[month]) buckets[month] = { taken: 0, total: 0 };
      buckets[month].total += 1;
      if (['taken', 'vot', 'self'].includes(entry.status)) buckets[month].taken += 1;
    });
    return Object.keys(buckets).sort().map((m) => ({
      date: `${m}-01`,
      value: Math.round((buckets[m].taken / buckets[m].total) * 100),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dotLog, range]);

  const pendingContacts = record
    ? record.contacts.filter((c) => c.status !== 'cancelled' && (!c.screeningResult || c.screeningResult === 'ยังไม่ได้คัดกรอง')).length
    : 0;

  const summaryCards = useMemo(() => ([
    { key: 'month', label: 'เดือนที่รักษา', value: record ? `เดือนที่ ${record.treatmentMonth ?? 0}` : '—', color: 'info', icon: 'calendar_month' },
    { key: 'dot', label: 'ความสม่ำเสมอ DOT', value: adherence ? `${adherence.percent}%` : '—', color: adherence && adherence.percent < 90 ? 'destructive' : 'positive', icon: 'medication' },
    { key: 'fu', label: 'การติดตามในช่วง', value: followUps.length, color: 'inprogress', icon: 'home_health' },
    { key: 'contacts', label: 'ผู้สัมผัสที่ยังไม่คัดกรอง', value: pendingContacts, color: pendingContacts > 0 ? 'destructive' : 'positive', icon: 'groups' },
  ]), [record, adherence, followUps, pendingContacts]);

  const totalFuPages = Math.max(1, Math.ceil(followUps.length / FOLLOWUP_PAGE_SIZE));
  const fuPageRows = followUps.slice((fuPage - 1) * FOLLOWUP_PAGE_SIZE, fuPage * FOLLOWUP_PAGE_SIZE);
  useEffect(() => { if (fuPage > totalFuPages) setFuPage(totalFuPages); }, [fuPage, totalFuPages]);

  const pickQuick = (key) => {
    const q = QUICK_RANGES.find((r) => r.key === key);
    if (!q) return;
    setQuick(key);
    setRange({ from: q.from(), to: todayIso() });
    setFuPage(1);
  };

  const searchSuggestions = useMemo(() => {
    const q = searchQ.trim().toLowerCase();
    if (!q) return [];
    return pool
      .filter((r) => [r.hn, r.name, r.regNo].some((f) => f && f.toLowerCase().includes(q)))
      .slice(0, 8)
      .map((r) => ({
        id: r.id,
        label: displayName(r.name),
        sublabel: `${r.regNo} · ${r.doctor}`,
        value: displayName(r.name),
        badges: [{ label: r.regNo, tone: 'teal' }, { label: r.hn, tone: 'indigo' }],
        avatarSrc: getPatientByHN(r.hn)?.avatarUrl,
      }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQ, pool, canEdit]);

  const resolveSearchRow = (query, item) => {
    if (item?.id) {
      const byId = pool.find((r) => r.id === item.id);
      if (byId) return byId;
    }
    const q = (query ?? item?.value ?? item?.label ?? '').toString().trim().toLowerCase();
    if (!q) return null;
    return pool.find((r) => [r.hn, r.name, r.regNo].some((f) => f && f.toLowerCase().includes(q))) || null;
  };

  /* ── การติดตาม: เพิ่ม / แก้ไข / ยกเลิก ────────────────────────── */

  const openFu = (row = null) => {
    const seed = {
      date: row?.date || todayIso(),
      type: row?.type || '',
      by: row?.by || TB_CURRENT_USER.name,
      note: row?.note || '',
    };
    setFuDraft(seed);
    setFuBaseline(seed);
    setFuError('');
    setFuPopup({ mode: row ? 'edit' : 'create', rowId: row?.id || null });
  };

  const requestCloseFu = () => {
    if (JSON.stringify(fuDraft) !== JSON.stringify(fuBaseline)) setDiscardOpen(true);
    else setFuPopup(null);
  };

  const submitFu = () => {
    if (!fuDraft.date || !fuDraft.type || !fuDraft.by.trim() || !fuDraft.note.trim()) {
      setFuError('ต้องระบุวันที่ ประเภทการติดตาม ผู้ติดตาม และบันทึกให้ครบ');
      return;
    }
    const ok = fuPopup.mode === 'edit'
      ? updateTbRow(record.id, 'followUp', fuPopup.rowId, fuDraft, TB_CURRENT_USER.name)
      : !!addTbRow(record.id, 'followUp', fuDraft, TB_CURRENT_USER.name);
    if (!ok) {
      setFuError('บันทึกไม่สำเร็จ — ทะเบียนนี้ถูกปิดหรือยกเลิกแล้ว');
      return;
    }
    setFuPopup(null);
    bump();
  };

  const confirmCancelFu = () => {
    if (!cancelReason.trim()) {
      setCancelError('ต้องระบุเหตุผลการยกเลิกก่อนยืนยัน');
      return;
    }
    const ok = cancelTbRow(record.id, 'followUp', cancelTarget.id, cancelReason.trim(), TB_CURRENT_USER.name);
    if (!ok) {
      setCancelError('ยกเลิกไม่สำเร็จ — ทะเบียนนี้ถูกปิดหรือยกเลิกแล้ว');
      return;
    }
    setCancelTarget(null);
    bump();
  };

  /* ── ผลตรวจที่เกี่ยวข้อง (culture + DST + CXR รวมตารางเดียว) ──── */

  const relatedResults = useMemo(() => {
    if (!record) return [];
    const out = [];
    if (record.cxr && inRange(record.cxr.date)) {
      out.push({
        id: `cxr-${record.id}`,
        date: record.cxr.date,
        kind: 'ภาพรังสีทรวงอก (CXR)',
        detail: record.cxr.result,
        flag: record.cxr.abnormal ? 'ผิดปกติ' : 'ปกติ',
        tone: record.cxr.abnormal ? 'red' : 'green',
        system: 'xray',
      });
    }
    record.cultureRows.filter((r) => inRange(r.sentDate)).forEach((r) => {
      const res = resolveTbCultureResult(r.result);
      out.push({
        id: r.id,
        date: r.sentDate,
        kind: `เพาะเชื้อ (${r.specimen})`,
        detail: r.organism || (r.reportDate ? '—' : 'รอผล'),
        flag: res?.label || r.result,
        tone: res?.badge || 'grey',
        system: 'lab',
      });
    });
    record.dstRows.filter((r) => inRange(r.sentDate)).forEach((r) => {
      out.push({
        id: r.id,
        date: r.sentDate,
        kind: 'ทดสอบความไวต่อยา (DST)',
        detail: `H:${r.isoniazid || '—'} · R:${r.rifampicin || '—'} · E:${r.ethambutol || '—'} · S:${r.streptomycin || '—'}`,
        flag: (r.isoniazid === 'R' || r.rifampicin === 'R') ? 'พบการดื้อยา' : 'ไวต่อยา',
        tone: (r.isoniazid === 'R' || r.rifampicin === 'R') ? 'red' : 'green',
        system: 'lab',
      });
    });
    return out.sort((a, b) => String(b.date).localeCompare(String(a.date)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [record, range, tick]);

  return (
    <QueuePageShell
      activeKey='treat'
      breadcrumb={breadcrumb}
      title='ติดตามการดูแลผู้รับบริการวัณโรค'
      onBack={() => history.push('/clinic/tb')}
      backLabel='กลับหน้าคิว'
      actions={(
        <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          <BrandSubdueButton variant='outline' size='md' leadingIcon='contract' onClick={() => history.push('/clinic/tb/registry')}>
            ทะเบียนวัณโรค
          </BrandSubdueButton>
          <BrandSubdueButton variant='outline' size='md' leadingIcon='print' onClick={() => window.print()}>
            พิมพ์สรุปการติดตาม
          </BrandSubdueButton>
        </div>
      )}
      summaryCards={record ? summaryCards : undefined}
    >
      {/* เพิ่ม / แก้ไขการติดตาม */}
      <Popup
        open={!!fuPopup}
        onClose={requestCloseFu}
        size='large'
        title={fuPopup?.mode === 'edit' ? 'แก้ไขการติดตาม' : 'บันทึกการติดตามใหม่'}
        subtitle={record ? `${record.regNo} · ${displayName(record.name)}` : ''}
        tertiaryAction={{ label: 'ยกเลิก', onClick: requestCloseFu }}
        primaryAction={{ label: fuPopup?.mode === 'edit' ? 'บันทึกการแก้ไข' : 'บันทึกการติดตาม', onClick: submitFu }}
      >
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400, 16px)' }}>
          <div className='flex items-start flex-wrap w-full' style={{ gap: 'var(--dim-space-400, 16px)' }}>
            <Field label='วันที่ติดตาม' required>
              <DatePicker
                value={fuDraft.date ? new Date(fuDraft.date) : null}
                onChange={(d) => { setFuDraft((f) => ({ ...f, date: d ? isoOf(d) : '' })); setFuError(''); }}
                placeholder='เลือกวันที่' showLabel={false} showHelperText={false}
              />
            </Field>
            <Field label='ประเภทการติดตาม' required>
              <Select
                showLabel={false} showHelperText={false} searchable={false} size='lg'
                value={fuDraft.type}
                onChange={(v) => { setFuDraft((f) => ({ ...f, type: v })); setFuError(''); }}
                options={TB_FOLLOWUP_TYPES}
                placeholder='เลือกประเภท'
              />
            </Field>
            <Field label='ผู้ติดตาม' required>
              <InputField
                value={fuDraft.by}
                onChange={(v) => { setFuDraft((f) => ({ ...f, by: v })); setFuError(''); }}
                placeholder='เช่น อสส.สมพร ใจดี'
                showLabel={false} showHelperText={false}
              />
            </Field>
          </div>
          <SuggestibleTextarea
            label='บันทึกการติดตาม'
            required
            voice
            value={fuDraft.note}
            onChange={(e) => { setFuDraft((f) => ({ ...f, note: e.target.value })); setFuError(''); }}
            suggestions={TB_FOLLOWUP_SUGGESTIONS}
            minChars={3}
            placeholder='เช่น มาตามนัด อาการดีขึ้น ไอลดลง น้ำหนักเพิ่ม'
          />
          {fuError && <ErrorNote>{fuError}</ErrorNote>}
        </div>
      </Popup>

      {/* dirty-check */}
      <Popup
        open={discardOpen}
        onClose={() => setDiscardOpen(false)}
        title='ทิ้งการแก้ไข?'
        subtitle='ข้อมูลที่แก้ไขไว้ยังไม่ได้บันทึก หากปิดหน้าต่างนี้ข้อมูลจะหายไป'
        tertiaryAction={{ label: 'แก้ไขต่อ', onClick: () => setDiscardOpen(false) }}
        primaryAction={{ label: 'ทิ้งการแก้ไข', tone: 'danger', onClick: () => { setDiscardOpen(false); setFuPopup(null); } }}
      />

      {/* ยกเลิกการติดตาม */}
      <Popup
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        title='ยกเลิกรายการติดตาม'
        subtitle={cancelTarget ? `${formatTbDate(cancelTarget.date)} · ${cancelTarget.type}` : ''}
        tertiaryAction={{ label: 'ปิด', onClick: () => setCancelTarget(null) }}
        primaryAction={{ label: 'ยืนยันการยกเลิก', onClick: confirmCancelFu, tone: 'danger' }}
      >
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          <SuggestibleTextarea
            label='เหตุผลการยกเลิก'
            required
            voice
            value={cancelReason}
            onChange={(e) => { setCancelReason(e.target.value); if (cancelError) setCancelError(''); }}
            suggestions={TB_CANCEL_REASON_SUGGESTIONS}
            minChars={2}
            placeholder='เช่น บันทึกซ้ำกับรายการเดิม'
          />
          <span style={{ fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary, #858C92)' }}>
            รายการที่ยกเลิกจะยังคงแสดงในตารางแบบขีดฆ่า พร้อมผู้ยกเลิก เวลา และเหตุผล
          </span>
          {cancelError && <ErrorNote>{cancelError}</ErrorNote>}
        </div>
      </Popup>

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
        {/* ── เลือกผู้รับบริการ ─────────────────────────────────────── */}
        <SectionCard icon='person_search' title='เลือกผู้รับบริการ'>
          {!canEdit && (
            <ReadOnlyBanner>
              สิทธิ์ของคุณดูได้อย่างเดียว — ชื่อผู้รับบริการถูกปิดบัง (§1.4.2) และปุ่มเพิ่ม/แก้ไข/ยกเลิกการติดตามถูกซ่อน
            </ReadOnlyBanner>
          )}
          <div className='w-full flex items-start justify-center'>
            <PrimarySearch
              value={searchQ}
              onChange={setSearchQ}
              onSubmit={(label, item) => {
                setSearchQ(label);
                const match = resolveSearchRow(label, item);
                pushHistory(item ?? label);
                if (match) { setSelectedId(match.id); setFuPage(1); }
              }}
              suggestions={searchSuggestions}
              history={searchHistory}
              onHistoryClear={searchHistory.length > 0 ? clearHistory : undefined}
              placeholder='ค้นหา HN / ชื่อ-สกุล / เลขที่ขึ้นทะเบียนวัณโรค'
              width={640}
            />
          </div>
          {!record && searchQ.trim() && searchSuggestions.length === 0 && (
            <EmptyPanel icon='search_off' title={`ไม่พบผู้รับบริการที่ตรงกับ "${searchQ.trim()}"`} subtitle='ตรวจสอบ HN / ชื่อ / เลขทะเบียน แล้วลองอีกครั้ง' />
          )}
          {!record && !searchQ.trim() && (
            <EmptyPanel
              icon='monitoring'
              title='เริ่มด้วยการค้นหาผู้รับบริการ'
              subtitle='ค้นหาแล้วเลือกผู้ป่วยเพื่อดูแนวโน้มน้ำหนัก ความสม่ำเสมอ DOT การเปลี่ยนผลเสมหะ และผลตรวจที่เกี่ยวข้อง'
            />
          )}
        </SectionCard>

        {record && (
          <>
            <PatientCard
              patient={cardPatient}
              title='ติดตามการดูแลรายบุคคล'
              onBack={() => setSelectedId(null)}
              actions={(
                <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                  <ColorfulBadge style='teal' size='small' hierarchy='secondary'>
                    ทะเบียน {record.regNo}
                  </ColorfulBadge>
                  <ColorfulBadge style='blue' size='small' hierarchy='secondary'>
                    {resolveTbPatientType(record.patientType)?.label || '—'}
                  </ColorfulBadge>
                  <ColorfulBadge style='red' size='small' hierarchy='secondary'>ข้อมูลลับ §1.4.2</ColorfulBadge>
                </div>
              )}
            />

            {readOnlyRecord && (
              <SectionCard icon='visibility' title='สถานะทะเบียน'>
                <ReadOnlyBanner>
                  {record.cancelled
                    ? `ทะเบียนนี้ถูกยกเลิกแล้ว — โดย ${record.cancelled.by} · ${record.cancelled.at} · เหตุผล: ${record.cancelled.reason}`
                    : `ปิดทะเบียนแล้วด้วยผล "${resolveTbOutcome(record.closure.outcome)?.label}" เมื่อ ${formatTbDate(record.closure.date)} โดย ${record.closure.by}`}
                  {' '}— เพิ่ม/แก้ไข/ยกเลิกรายการติดตามไม่ได้
                </ReadOnlyBanner>
              </SectionCard>
            )}

            {/* ── ช่วงเวลา ──────────────────────────────────────────── */}
            <SectionCard icon='date_range' title='ช่วงเวลาที่ติดตาม'>
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
                    onChange={([from, to]) => { setRange({ from, to }); setQuick(null); setFuPage(1); }}
                    format={isoOf}
                    parse={(s) => (s ? new Date(s) : null)}
                  />
                </div>
                <span style={{ fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-secondary, #636B72)' }}>
                  {formatTbDate(range.from)} – {formatTbDate(range.to)}
                </span>
              </div>
            </SectionCard>

            {/* ── การ์ดสรุป ────────────────────────────────────────── */}
            <SectionCard icon='dashboard' title='สรุปสถานะการดูแล'>
              <div className='flex items-stretch w-full flex-wrap' style={{ gap: 'var(--dim-space-300, 12px)' }}>
                <StatTile icon='calendar_month' label='เดือนที่รักษา' value={`เดือนที่ ${record.treatmentMonth ?? 0}`} tone='blue' />
                <StatTile icon='medication' label='สูตรยาปัจจุบัน' value={resolveTbRegimen(record.regimen)?.label || 'ยังไม่เริ่มยา'} tone='teal' />
                <StatTile
                  icon='how_to_reg'
                  label='ความสม่ำเสมอ DOT'
                  value={adherence ? `${adherence.percent}% · ขาดยา ${adherence.missed} วัน` : 'ยังไม่มีข้อมูล'}
                  tone={adherence && adherence.percent < 90 ? 'red' : 'green'}
                />
                <StatTile
                  icon='event_available'
                  label='นัดครั้งถัดไป'
                  value={record.nextAppointment ? `${formatTbDate(record.nextAppointment.date)} · ${record.nextAppointment.type}` : 'ยังไม่มีนัด'}
                  tone='purple'
                />
                <StatTile icon='groups' label='ผู้สัมผัสที่ยังไม่คัดกรอง' value={`${pendingContacts} คน`} tone={pendingContacts > 0 ? 'orange' : 'green'} />
              </div>
              {adherence && adherence.percent < 90 && (
                <Banner tone='danger' icon='warning'>
                  ความสม่ำเสมอในการกินยาต่ำกว่า 90% ({adherence.percent}%) — เสี่ยงต่อการดื้อยาและการรักษาล้มเหลว
                  ควรเพิ่มความถี่การเยี่ยมบ้าน/VOT และบันทึกไว้ในตารางการติดตาม
                </Banner>
              )}
            </SectionCard>

            {/* ── กราฟแนวโน้ม (หนึ่งตัวชี้วัดต่อหนึ่ง plot) ─────────── */}
            <SectionCard
              icon='monitoring'
              title='แนวโน้มระหว่างการรักษา'
              aside={(
                <span style={{ fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary, #858C92)' }}>
                  แยกคนละ plot — น้ำหนักและ %DOT ใช้หน่วยต่างกัน จึงไม่รวมแกน
                </span>
              )}
            >
              <div
                className='w-full'
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                  gap: 'var(--dim-space-400, 16px)',
                }}
              >
                <TrendPlot
                  label='น้ำหนักตัว'
                  unit='กก.'
                  color='var(--surface-colorfulbadge-teal-bold, #24A899)'
                  points={weightPoints}
                />
                <TrendPlot
                  label='ความสม่ำเสมอการกินยารายเดือน'
                  unit='%'
                  color='var(--surface-colorfulbadge-blue-bold, #3B82F6)'
                  points={dotMonthlyPoints}
                />
              </div>
            </SectionCard>

            {/* ── การเปลี่ยนผลเสมหะ ────────────────────────────────── */}
            <SectionCard icon='biotech' title='การเปลี่ยนผลเสมหะ (Sputum conversion)'>
              {sputumRows.length === 0 ? (
                <EmptyPanel icon='biotech' title='ไม่มีผลตรวจเสมหะในช่วงเวลาที่เลือก' subtitle='ปรับช่วงเวลา หรือบันทึกผลตรวจที่หน้าทะเบียนวัณโรค' />
              ) : (
                <div className='flex flex-col w-full'>
                  {sputumRows
                    .slice()
                    .sort((a, b) => String(a.date).localeCompare(String(b.date)))
                    .map((r, idx, arr) => {
                      const res = resolveTbSmearResult(r.result);
                      const isLast = idx === arr.length - 1;
                      return (
                        <div key={r.id} className='flex w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
                          <div className='flex flex-col items-center'>
                            <ColorfulIconBadge style={res?.badge || 'grey'} icon='biotech' size='medium' />
                            {!isLast && (
                              <div aria-hidden='true' style={{ width: 'var(--dim-stroke-200, 2px)', flex: 1, background: 'var(--border-neutral-quaternary, #F4F5F5)' }} />
                            )}
                          </div>
                          <div
                            className='flex flex-col flex-1 min-w-0'
                            style={{ gap: 'var(--dim-space-100, 4px)', paddingBottom: isLast ? 0 : 'var(--dim-space-500, 20px)' }}
                          >
                            <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                              <ColorfulBadge style={res?.badge || 'grey'} size='small' hierarchy='secondary'>
                                {res?.label || r.result}
                              </ColorfulBadge>
                              <span style={{ fontSize: 'var(--type-size-sm, 14px)', fontWeight: 'var(--type-weight-bold, 700)', color: 'var(--text-content-default, #363B3F)' }}>
                                {r.month} · สิ่งส่งตรวจครั้งที่ {r.specimenNo}
                              </span>
                              <span style={{ fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary, #858C92)' }}>
                                {formatTbDate(r.date)}
                              </span>
                              {r.status === 'cancelled' && (
                                <ColorfulBadge style='red' size='small' hierarchy='secondary'>ยกเลิก</ColorfulBadge>
                              )}
                            </div>
                            <RowAuditNote row={r} />
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </SectionCard>

            {/* ── ตารางการติดตาม ───────────────────────────────────── */}
            <SectionCard
              icon='home_health'
              title='การติดตามการดูแล'
              aside={canMutate ? (
                <BrandSubdueButton variant='outline' size='sm' leadingIcon='add' onClick={() => openFu()}>
                  เพิ่มการติดตาม
                </BrandSubdueButton>
              ) : null}
            >
              {followUps.length === 0 ? (
                <EmptyPanel
                  icon='home_health'
                  title='ไม่มีการติดตามในช่วงเวลาที่เลือก'
                  subtitle={canMutate ? 'ปรับช่วงเวลา หรือกด "เพิ่มการติดตาม" เพื่อบันทึกรายการแรก' : 'ปรับช่วงเวลาเพื่อดูรายการย้อนหลัง'}
                />
              ) : (
                <>
                  <Table
                    columns={[
                      {
                        key: 'date', label: 'วันที่', width: 130,
                        render: (r) => (
                          <span style={r.status === 'cancelled' ? { textDecoration: 'line-through', color: 'var(--text-content-quaternary, #ADB2B7)' } : undefined}>
                            {formatTbDate(r.date)}
                          </span>
                        ),
                      },
                      { key: 'type', label: 'ประเภท', width: 180 },
                      { key: 'note', label: 'บันทึก', flex: true, minWidth: 260 },
                      { key: 'by', label: 'ผู้ติดตาม', flex: true, minWidth: 150 },
                      {
                        key: 'audit', label: 'สถานะ / ผู้บันทึก', flex: true, minWidth: 240, sortable: false,
                        render: (r) => (
                          <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-050, 2px)' }}>
                            {r.status === 'cancelled' && <ColorfulBadge style='red' size='small' hierarchy='secondary'>ยกเลิกแล้ว</ColorfulBadge>}
                            <RowAuditNote row={r} />
                          </div>
                        ),
                      },
                      {
                        key: 'actions', label: 'การดำเนินการ', width: 180, sortable: false,
                        render: (r) => (canMutate && r.status !== 'cancelled' ? (
                          <div className='inline-flex items-center' style={{ gap: 'var(--dim-space-100, 4px)' }}>
                            <BrandSubdueButton variant='outline' size='sm' leadingIcon='edit' onClick={() => openFu(r)}>แก้ไข</BrandSubdueButton>
                            <NeutralSubdueButton size='sm' leadingIcon='block' onClick={() => { setCancelReason(''); setCancelError(''); setCancelTarget(r); }}>ยกเลิก</NeutralSubdueButton>
                          </div>
                        ) : null),
                      },
                    ]}
                    rows={fuPageRows}
                    rowKey={(r) => r.id}
                    emptyMessage='ไม่พบรายการติดตาม'
                  />
                  <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                    <span style={{ color: 'var(--text-content-secondary, #636B72)', fontSize: 'var(--type-size-sm, 14px)' }}>
                      {`แสดง ${followUps.length === 0 ? 0 : (fuPage - 1) * FOLLOWUP_PAGE_SIZE + 1}–${Math.min(fuPage * FOLLOWUP_PAGE_SIZE, followUps.length)} จาก ${followUps.length} รายการ`}
                    </span>
                    <div className='flex-1' />
                    <Pagination currentPage={fuPage} pageCount={totalFuPages} onPageChange={setFuPage} />
                  </div>
                </>
              )}
            </SectionCard>

            {/* ── ปฏิทิน DOT ย้อนหลัง ──────────────────────────────── */}
            <SectionCard
              icon='event_available'
              title='ปฏิทินการกำกับการกินยา (อ่านอย่างเดียว)'
              aside={dotConfig ? (
                <span style={{ fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary, #858C92)' }}>
                  ผู้กำกับ: {dotConfig.observerName}
                </span>
              ) : null}
            >
              {record.treatmentStartDate ? (
                <DotCalendarLog log={dotLog} startDate={record.treatmentStartDate} readOnly />
              ) : (
                <EmptyPanel icon='event_available' title='ยังไม่เริ่มการรักษา' subtitle='ปฏิทิน DOT จะแสดงเมื่อมีวันที่เริ่มยาแล้ว' />
              )}
            </SectionCard>

            {/* ── ผู้สัมผัสโรค ─────────────────────────────────────── */}
            <SectionCard icon='groups' title='ผู้สัมผัสโรคและผลการคัดกรอง'>
              {record.contacts.length === 0 ? (
                <EmptyPanel
                  icon='groups'
                  title='ยังไม่มีข้อมูลผู้สัมผัสโรค'
                  subtitle='บันทึกผู้สัมผัสได้ที่แท็บ "ผู้สัมผัสโรค" ของหน้าทะเบียนวัณโรค'
                  action={(
                    <BrandSubdueButton variant='outline' size='sm' leadingIcon='contract' onClick={() => history.push({ pathname: '/clinic/tb/registry', state: { regNo: record.regNo } })}>
                      เปิดทะเบียน
                    </BrandSubdueButton>
                  )}
                />
              ) : (
                <Table
                  columns={[
                    { key: 'name', label: 'ชื่อ-สกุล', flex: true, minWidth: 170, render: (r) => displayName(r.name) },
                    { key: 'relation', label: 'ความสัมพันธ์', width: 150 },
                    { key: 'age', label: 'อายุ', width: 80, render: (r) => (r.age ? `${r.age} ปี` : '—') },
                    {
                      key: 'screeningResult', label: 'ผลการคัดกรอง', width: 180,
                      render: (r) => {
                        const done = r.screeningResult && r.screeningResult !== 'ยังไม่ได้คัดกรอง';
                        return (
                          <ColorfulBadge style={done ? (r.screeningResult === 'ปกติ' ? 'green' : 'orange') : 'grey'} size='small' hierarchy='secondary'>
                            {r.screeningResult || 'ยังไม่ได้คัดกรอง'}
                          </ColorfulBadge>
                        );
                      },
                    },
                    { key: 'screeningDate', label: 'วันที่คัดกรอง', width: 130, render: (r) => (r.screeningDate ? formatTbDate(r.screeningDate) : '—') },
                    {
                      key: 'actions', label: 'การดำเนินการ', width: 170, sortable: false,
                      render: (r) => (
                        <NeutralSubdueButton
                          size='sm'
                          leadingIcon='person_search'
                          onClick={() => history.push({
                            pathname: '/clinic/tb/screening',
                            state: { prefill: { name: r.name, age: r.age, relatedRegNo: record.regNo, riskGroups: ['household'] } },
                          })}
                        >
                          ไปคัดกรอง
                        </NeutralSubdueButton>
                      ),
                    },
                  ]}
                  rows={record.contacts}
                  rowKey={(r) => r.id}
                  emptyMessage='ไม่พบผู้สัมผัสโรค'
                />
              )}
            </SectionCard>

            {/* ── ผลตรวจที่เกี่ยวข้อง (Lab / X-ray) ────────────────── */}
            <SectionCard
              icon='labs'
              title='ผลตรวจที่เกี่ยวข้อง (ชันสูตร / รังสีวินิจฉัย)'
              aside={(
                <div className='flex items-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                  <NeutralSubdueButton size='sm' leadingIcon='biotech' onClick={() => history.push('/lab')}>
                    เปิดระบบชันสูตร
                  </NeutralSubdueButton>
                  <NeutralSubdueButton size='sm' leadingIcon='radiology' onClick={() => history.push('/xray')}>
                    เปิดระบบรังสีวินิจฉัย
                  </NeutralSubdueButton>
                </div>
              )}
            >
              {relatedResults.length === 0 ? (
                <EmptyPanel icon='labs' title='ไม่มีผลตรวจในช่วงเวลาที่เลือก' subtitle='ปรับช่วงเวลา หรือเปิดระบบชันสูตร/รังสีวินิจฉัยเพื่อดูผลทั้งหมด' />
              ) : (
                <Table
                  columns={[
                    { key: 'date', label: 'วันที่', width: 130, render: (r) => formatTbDate(r.date) },
                    { key: 'kind', label: 'รายการตรวจ', flex: true, minWidth: 200 },
                    { key: 'detail', label: 'รายละเอียด', flex: true, minWidth: 260 },
                    {
                      key: 'flag', label: 'ผลสรุป', width: 150,
                      render: (r) => <ColorfulBadge style={r.tone} size='small' hierarchy='secondary'>{r.flag}</ColorfulBadge>,
                    },
                    {
                      key: 'system', label: 'ระบบต้นทาง', width: 170, sortable: false,
                      render: (r) => (
                        <NeutralSubdueButton
                          size='sm'
                          leadingIcon={r.system === 'xray' ? 'radiology' : 'biotech'}
                          onClick={() => history.push(r.system === 'xray' ? '/xray' : '/lab')}
                        >
                          {r.system === 'xray' ? 'รังสีวินิจฉัย' : 'ชันสูตร'}
                        </NeutralSubdueButton>
                      ),
                    },
                  ]}
                  rows={relatedResults}
                  rowKey={(r) => r.id}
                  emptyMessage='ไม่พบผลตรวจ'
                />
              )}
            </SectionCard>

            <span className='inline-flex items-center' style={{ gap: 'var(--dim-space-100, 4px)', fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary, #858C92)' }}>
              <Icon name='info' size={14} />
              ข้อมูลผู้ป่วยวัณโรคเป็นข้อมูลลับ §1.4.2 — เอกสารที่พิมพ์ออกจากระบบใช้ข้อความกลาง ไม่ระบุชื่อคลินิก
            </span>
          </>
        )}

        {/* เลือกผู้ป่วยแล้วแต่ไม่มีทะเบียน (deep-link HN ที่ยังไม่ขึ้นทะเบียน) */}
        {!record && navState?.hn && (
          <SectionCard icon='contract' title='ยังไม่มีทะเบียนวัณโรค'>
            <EmptyPanel
              icon='assignment_late'
              title={`HN ${navState.hn} ยังไม่ได้ขึ้นทะเบียนผู้ป่วยวัณโรค`}
              subtitle='ต้องขึ้นทะเบียนก่อนจึงจะติดตามการดูแลต่อเนื่องได้'
              action={(
                <BrandSubdueButton variant='fill' size='sm' leadingIcon='person_add' onClick={() => history.push('/clinic/tb/registry')}>
                  ไปที่ทะเบียนวัณโรค
                </BrandSubdueButton>
              )}
            />
          </SectionCard>
        )}
      </div>
    </QueuePageShell>
  );
};

export default TbFollowUpPage;
