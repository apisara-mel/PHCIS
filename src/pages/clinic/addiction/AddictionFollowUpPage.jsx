import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import PrimarySearch from '@/components/search/PrimarySearch';
import SearchResultCount from '@/components/search/SearchResultCount';
import useSearchHistory from '@/components/search/useSearchHistory';
import PatientCard from '@/components/card/PatientCard';
import DatePickerRange from '@/components/forms/DatePickerRange';
import SelectableTag from '@/components/forms/SelectableTag';
import Select from '@/components/forms/Select';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import Table from '@/components/table/Table';
import Pagination from '@/components/pagination/Pagination';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import ColorfulIconBadge from '@/components/badge/ColorfulIconBadge';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import Popup from '@/components/popup/Popup';
import UnsavedChangesPopup from '@/components/popup/UnsavedChangesPopup';
import { LineChart } from '@/components/graph/Charts';
import { getPatientByHN, DEFAULT_PATIENT } from '@/data/patientProfiles';
import {
  ADDICTION_SCHEDULED,
  getAddictionQueueRows,
  getMethadoneDispenses,
  formatAddictionDate,
  isRightsExpired,
  resolveProgram,
} from '@/data/addictionVisits';
import {
  FOLLOWUP_METHODS,
  FOLLOWUP_RESULTS,
  FOLLOWUP_NOTE_SUGGESTIONS,
  CANCEL_REASON_SUGGESTIONS,
  ADDICTION_MED_HISTORY,
  ADDICTION_LAB_HISTORY,
  ADDICTION_XRAY_HISTORY,
  resolveFollowUpMethod,
  resolveFollowUpResult,
  resolveRegistryStatus,
  getRegistryEntries,
  findRegistryEntryByHn,
  getFollowUps,
  addFollowUpRecord,
  updateFollowUpRecord,
  cancelFollowUpRecord,
  reactivateFollowUpRecord,
  getFollowUpCancellation,
  getFollowUpOverdue,
} from '@/data/addictionRegistry';
import { printAddictionFollowUpSummary } from '@/pages/clinic/addiction/addictionPrint';
import {
  AddictionAccessGate,
  AccessDemoToggle,
  ProgramBadge,
  NoticeBand,
  AuditStamp,
  SectionCard,
  EmptyHint,
} from '@/pages/clinic/addiction/addictionShared';

/* AddictionFollowUpPage — การติดตามการดูแลผู้ติดสารเสพติด
   (TOR 1.10.5.8 + 1.10.5.1, manual §2.2.4 บันทึกการติดตามผลการบำบัด
   + สยส.2-2 ผล Lab / สยส.2-3 Chest X-Ray).

   Same shape as MentalHealthFollowUpPage / NcdFollowUpPage: search a
   patient → pick a period → read the longitudinal picture in panels that
   each own their OWN empty state (a panel is never hidden, so "ไม่มี" is
   always distinguishable from "ไม่ได้แสดง"):
     1. ผลการติดตาม        — table + บันทึก/แก้ไข/ยกเลิก/เปิดใช้งานอีกครั้ง
     2. ผลตรวจปัสสาวะ      — ONE series on ONE axis (พบสาร=1 / ไม่พบ=0);
                              never mixed with dose or LFT values
     3. ยาที่ได้รับ         — ADDICTION_MED_HISTORY + เมทาโดนรายวัน (สยส.3)
     4. ผล Lab             — abnormal rows flagged
     5. ผล X-ray
   Deep-linked from the registry as /clinic/addiction/follow-up?hn=… */

const breadcrumb = ['ระบบบันทึกการรักษา', 'งานบำบัดสารเสพติด', 'ติดตามการดูแล'];
const SEARCH_HISTORY_KEY = 'mih:primarysearch-history:addiction-followup';
const FOLLOWUP_PAGE_SIZE = 8;

const URINE_SERIES_COLOR = 'var(--surface-colorfulbadge-teal-bold, #24A899)';

const isoOf = (d) => {
  const x = new Date(d);
  x.setHours(12, 0, 0, 0);
  return x.toISOString().slice(0, 10);
};
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
  { key: '2y', label: '2 ปี', from: () => monthsAgoIso(24) },
];

const TH_MONTHS_SHORT = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const shortThaiDate = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getDate()} ${TH_MONTHS_SHORT[d.getMonth()]}`;
};

const inRange = (iso, from, to) => !!iso && iso >= from && iso <= to;

/* ASCII-only test so an แ-escaped bundle never breaks the match. */
const isUrineTest = (test) => /urine/i.test(test || '');
const isPositive = (result) => /positive/i.test(result || '');

const EMPTY_RECORD_FORM = { no: null, method: '', result: '', note: '' };

const AddictionFollowUpPage = () => {
  const history = useHistory();
  const location = useLocation();

  const [tick, setTick] = useState(0);
  const [selectedHn, setSelectedHn] = useState(null);
  const [searchQ, setSearchQ] = useState('');
  const [quick, setQuick] = useState('6m');
  const [range, setRange] = useState({ from: monthsAgoIso(6), to: todayIso() });
  const [followUpPage, setFollowUpPage] = useState(1);

  const [recordOpen, setRecordOpen] = useState(false);
  const [recordForm, setRecordForm] = useState(EMPTY_RECORD_FORM);
  const [recordBaseline, setRecordBaseline] = useState('');
  const [recordErrors, setRecordErrors] = useState({});
  const [unsavedOpen, setUnsavedOpen] = useState(false);

  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState('');

  const [deepLinkMiss, setDeepLinkMiss] = useState(null);

  const {
    history: searchHistory,
    push: pushHistory,
    clear: clearHistory,
  } = useSearchHistory(SEARCH_HISTORY_KEY, { seedIfEmpty: [] });

  /* Patient pool — registry first (that is what "ติดตาม" is about), plus
     today's clinic roster so a not-yet-registered patient is findable. */
  const pool = useMemo(() => {
    const map = new Map();
    getRegistryEntries().forEach((r) => {
      map.set(r.hn, { hn: r.hn, name: r.name, program: r.program, therapist: r.therapist, registered: true });
    });
    [...getAddictionQueueRows(), ...ADDICTION_SCHEDULED].forEach((r) => {
      if (!map.has(r.hn)) {
        map.set(r.hn, { hn: r.hn, name: r.name, program: r.program, therapist: r.therapist, registered: false });
      }
    });
    return Array.from(map.values());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  /* Deep link ?hn=… from the registry's "ดูการติดตาม" action. */
  useEffect(() => {
    const q = new URLSearchParams(location.search).get('hn');
    if (!q) return;
    if (pool.some((p) => p.hn === q)) {
      setSelectedHn(q);
      setDeepLinkMiss(null);
    } else {
      setSelectedHn(null);
      setDeepLinkMiss(q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  const selectedRow = useMemo(() => pool.find((p) => p.hn === selectedHn) || null, [pool, selectedHn]);
  const cardPatient = useMemo(
    () => (selectedHn && getPatientByHN(selectedHn)) || DEFAULT_PATIENT,
    [selectedHn],
  );
  const registry = useMemo(
    // eslint-disable-next-line react-hooks/exhaustive-deps
    () => (selectedHn ? findRegistryEntryByHn(selectedHn) : null),
    [selectedHn, tick],
  );
  const overdue = useMemo(
    // eslint-disable-next-line react-hooks/exhaustive-deps
    () => (selectedHn ? getFollowUpOverdue(selectedHn) : null),
    [selectedHn, tick],
  );

  /* Range validation — an invalid range must NOT drive the panels. */
  const rangeInvalid = !!(range.from && range.to && range.to < range.from);
  const lastValidRange = useRef(range);
  useEffect(() => {
    if (!rangeInvalid) lastValidRange.current = range;
  }, [range, rangeInvalid]);
  const effRange = rangeInvalid ? lastValidRange.current : range;

  const followUps = useMemo(() => {
    if (!selectedHn) return [];
    return getFollowUps(selectedHn)
      .map((r) => ({ ...r, cancellation: getFollowUpCancellation(selectedHn, r.no) }))
      .filter((r) => inRange(r.date, effRange.from, effRange.to))
      .sort((a, b) => b.date.localeCompare(a.date) || b.no - a.no);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedHn, effRange, tick]);

  const meds = useMemo(() => {
    if (!selectedHn) return [];
    const base = (ADDICTION_MED_HISTORY[selectedHn] || []).map((r) => ({ ...r, source: 'ห้องยา' }));
    const methadone = getMethadoneDispenses(selectedHn).map((d) => ({
      date: d.date,
      item: 'เมทาโดน (Methadone) ชนิดน้ำ',
      dose: `${d.dose} รายวัน (สยส.3)`,
      qty: '1 ครั้ง',
      source: `จ่ายโดย ${d.by}`,
    }));
    return [...base, ...methadone]
      .filter((r) => inRange(r.date, effRange.from, effRange.to))
      .sort((a, b) => b.date.localeCompare(a.date));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedHn, effRange, tick]);

  const labs = useMemo(() => {
    if (!selectedHn) return [];
    return (ADDICTION_LAB_HISTORY[selectedHn] || [])
      .filter((r) => inRange(r.date, effRange.from, effRange.to))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [selectedHn, effRange]);

  const xrays = useMemo(() => {
    if (!selectedHn) return [];
    return (ADDICTION_XRAY_HISTORY[selectedHn] || [])
      .filter((r) => inRange(r.date, effRange.from, effRange.to))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [selectedHn, effRange]);

  /* One series, one axis — binary urine screens only. */
  const urinePoints = useMemo(
    () => labs
      .filter((r) => isUrineTest(r.test))
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((r) => ({ date: r.date, value: isPositive(r.result) ? 1 : 0, test: r.test })),
    [labs],
  );

  const activeFollowUps = followUps.filter((r) => !r.cancellation);

  const summaryCards = useMemo(() => ([
    { key: 'followups', label: 'ครั้งที่ติดตามในช่วง', value: activeFollowUps.length, color: 'info', icon: 'follow_the_signs' },
    { key: 'abstinent', label: 'ผลยังหยุดใช้สาร', value: activeFollowUps.filter((r) => r.result === 'abstinent').length, color: 'positive', icon: 'verified' },
    { key: 'relapsed', label: 'กลับไปใช้ซ้ำ / ติดตามไม่ได้', value: activeFollowUps.filter((r) => r.result !== 'abstinent').length, color: 'destructive', icon: 'running_with_errors' },
    { key: 'labs', label: 'ผล Lab ในช่วง', value: labs.length, color: 'brand', icon: 'labs' },
    { key: 'meds', label: 'รายการยาในช่วง', value: meds.length, color: 'inprogress', icon: 'medication' },
  ]), [activeFollowUps, labs, meds]);

  const totalFollowUpPages = Math.max(1, Math.ceil(followUps.length / FOLLOWUP_PAGE_SIZE));
  const followUpPageRows = followUps.slice(
    (followUpPage - 1) * FOLLOWUP_PAGE_SIZE,
    followUpPage * FOLLOWUP_PAGE_SIZE,
  );
  useEffect(() => { setFollowUpPage(1); }, [selectedHn, effRange.from, effRange.to]);
  useEffect(() => {
    if (followUpPage > totalFollowUpPages) setFollowUpPage(totalFollowUpPages);
  }, [followUpPage, totalFollowUpPages]);

  const pickQuick = (key) => {
    const q = QUICK_RANGES.find((r) => r.key === key);
    if (!q) return;
    setQuick(key);
    setRange({ from: q.from(), to: todayIso() });
  };

  /* ── บันทึก / แก้ไข การติดตาม ─────────────────────────────────── */
  const openAddRecord = () => {
    const next = { ...EMPTY_RECORD_FORM };
    setRecordForm(next);
    setRecordBaseline(JSON.stringify(next));
    setRecordErrors({});
    setRecordOpen(true);
  };

  const openEditRecord = (row) => {
    const next = { no: row.no, method: row.method, result: row.result, note: row.note || '' };
    setRecordForm(next);
    setRecordBaseline(JSON.stringify(next));
    setRecordErrors({});
    setRecordOpen(true);
  };

  const recordDirty = recordOpen && JSON.stringify(recordForm) !== recordBaseline;

  const requestCloseRecord = () => {
    if (recordDirty) setUnsavedOpen(true);
    else setRecordOpen(false);
  };

  const saveRecord = () => {
    const next = {};
    if (!recordForm.method) next.method = 'กรุณาเลือกวิธีติดตาม';
    if (!recordForm.result) next.result = 'กรุณาเลือกผลการติดตาม';
    if (recordForm.result === 'missed' && !recordForm.note.trim()) {
      next.note = 'ผล “ติดตามไม่ได้/ผิดนัด” ต้องระบุเหตุผลและแผนการติดตามครั้งถัดไป';
    }
    if (Object.keys(next).length > 0) {
      setRecordErrors(next);
      return;
    }
    if (recordForm.no == null) {
      addFollowUpRecord(selectedHn, {
        method: recordForm.method,
        result: recordForm.result,
        note: recordForm.note.trim(),
      });
    } else {
      updateFollowUpRecord(selectedHn, recordForm.no, {
        method: recordForm.method,
        result: recordForm.result,
        note: recordForm.note.trim(),
      });
    }
    setRecordOpen(false);
    setTick((t) => t + 1);
  };

  /* ── ยกเลิก / เปิดใช้งานอีกครั้ง ──────────────────────────────── */
  const openCancel = (row) => {
    setCancelReason('');
    setCancelError('');
    setCancelTarget(row);
  };
  const confirmCancel = () => {
    if (!cancelReason.trim()) {
      setCancelError('กรุณาระบุเหตุผลการยกเลิกรายการติดตาม');
      return;
    }
    cancelFollowUpRecord(selectedHn, cancelTarget.no, cancelReason.trim());
    setCancelTarget(null);
    setTick((t) => t + 1);
  };
  const reactivate = (row) => {
    reactivateFollowUpRecord(selectedHn, row.no);
    setTick((t) => t + 1);
  };

  /* ── search ─────────────────────────────────────────────────────── */
  const poolToSearchItem = (row) => ({
    id: row.hn,
    label: row.name,
    sublabel: resolveProgram(row.program)?.label || row.therapist,
    value: row.name,
    badges: [
      { label: row.hn, tone: 'indigo' },
      ...(row.registered ? [{ label: 'มีทะเบียน', tone: 'teal' }] : []),
    ],
    avatarSrc: getPatientByHN(row.hn)?.avatarUrl,
  });

  const pickerMatchCount = useMemo(() => {
    const q = searchQ.trim().toLowerCase();
    if (!q) return 0;
    return pool.filter((row) => [row.hn, row.name, row.therapist]
      .some((f) => f && f.toLowerCase().includes(q))).length;
  }, [searchQ, pool]);

  const searchSuggestions = useMemo(() => {
    const q = searchQ.trim().toLowerCase();
    if (!q) return [];
    return pool
      .filter((row) => [row.hn, row.name, row.therapist].some((f) => f && f.toLowerCase().includes(q)))
      .slice(0, 8)
      .map(poolToSearchItem);
  }, [searchQ, pool]);

  const resolveSearchRow = (query, item) => {
    if (item?.id) {
      const byId = pool.find((row) => row.hn === item.id);
      if (byId) return byId;
    }
    const q = (query ?? item?.value ?? item?.label ?? '').toString().trim().toLowerCase();
    if (!q) return null;
    return pool.find((row) => [row.hn, row.name].some((f) => f && f.toLowerCase().includes(q))) ?? null;
  };

  const selectPatient = (hn) => {
    setSelectedHn(hn);
    setDeepLinkMiss(null);
    setFollowUpPage(1);
  };

  /* ── table columns ──────────────────────────────────────────────── */
  const greyed = { color: 'var(--text-content-tertiary, #858C92)' };

  const followUpColumns = useMemo(() => ([
    { key: 'no', label: 'ครั้งที่', render: (r) => <span style={r.cancellation ? greyed : undefined}>{r.no}</span> },
    { key: 'date', label: 'วันที่ติดตาม', render: (r) => <span style={r.cancellation ? greyed : undefined}>{formatAddictionDate(r.date)}</span> },
    {
      key: 'method', label: 'วิธีติดตาม', sortable: false,
      render: (r) => <span style={r.cancellation ? greyed : undefined}>{resolveFollowUpMethod(r.method)?.label || '—'}</span>,
    },
    {
      key: 'result', label: 'ผลการติดตาม', sortable: false,
      render: (r) => {
        const res = resolveFollowUpResult(r.result);
        return res
          ? <ColorfulBadge style={r.cancellation ? 'grey' : res.badge} size='small' hierarchy='secondary'>{res.label}</ColorfulBadge>
          : <span>—</span>;
      },
    },
    { key: 'by', label: 'ผู้ติดตาม', flex: true, minWidth: 160, render: (r) => <span style={r.cancellation ? greyed : undefined}>{r.by || '—'}</span> },
    {
      key: 'note', label: 'บันทึก', flex: true, minWidth: 240, sortable: false,
      render: (r) => (
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
          <span style={r.cancellation ? greyed : undefined}>{r.note || '—'}</span>
          {r.cancellation && (
            <span style={{ fontSize: 'var(--type-size-xs)', ...greyed }}>
              ยกเลิกโดย {r.cancellation.by} · {r.cancellation.at}<br />เหตุผล: {r.cancellation.reason}
            </span>
          )}
          {!r.cancellation && r.editedBy && (
            <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
              แก้ไขล่าสุดโดย {r.editedBy} · {r.editedAt}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'actions', label: 'การดำเนินการ', sortable: false,
      render: (r) => (
        <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          {r.cancellation ? (
            <BrandSubdueButton variant='outline' size='sm' leadingIcon='restart_alt' onClick={(e) => { e.stopPropagation(); reactivate(r); }}>
              เปิดใช้งานอีกครั้ง
            </BrandSubdueButton>
          ) : (
            <>
              <BrandSubdueButton variant='outline' size='sm' leadingIcon='edit' onClick={(e) => { e.stopPropagation(); openEditRecord(r); }}>
                แก้ไข
              </BrandSubdueButton>
              <NeutralSubdueButton size='sm' leadingIcon='block' onClick={(e) => { e.stopPropagation(); openCancel(r); }}>
                ยกเลิก
              </NeutralSubdueButton>
            </>
          )}
        </div>
      ),
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ]), [tick, selectedHn]);

  const medColumns = [
    { key: 'date', label: 'วันที่', render: (r) => formatAddictionDate(r.date) },
    { key: 'item', label: 'รายการยา', flex: true, minWidth: 220 },
    { key: 'dose', label: 'วิธีใช้ / ขนาด', flex: true, minWidth: 200 },
    { key: 'qty', label: 'จำนวน' },
    { key: 'source', label: 'แหล่งข้อมูล', sortable: false },
  ];

  const labColumns = [
    { key: 'date', label: 'วันที่ตรวจ', render: (r) => formatAddictionDate(r.date) },
    { key: 'test', label: 'รายการตรวจ', flex: true, minWidth: 220 },
    { key: 'result', label: 'ผล', flex: true, minWidth: 220 },
    {
      key: 'abnormal', label: 'สถานะ', sortable: false,
      render: (r) => (r.abnormal ? (
        <div className='flex items-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          <ColorfulIconBadge style='red' size='medium' fill='default' icon='priority_high' />
          <ColorfulBadge style='red' size='small' hierarchy='secondary'>ผิดปกติ</ColorfulBadge>
        </div>
      ) : (
        <ColorfulBadge style='green' size='small' hierarchy='secondary'>ปกติ</ColorfulBadge>
      )),
    },
  ];

  const xrayColumns = [
    { key: 'date', label: 'วันที่ตรวจ', render: (r) => formatAddictionDate(r.date) },
    { key: 'exam', label: 'รายการตรวจ', flex: true, minWidth: 260 },
    { key: 'result', label: 'ผลการอ่าน', flex: true, minWidth: 280 },
  ];

  const doPrint = () => printAddictionFollowUpSummary({
    patientName: selectedRow?.name || registry?.name,
    hn: selectedHn,
    registry: registry ? {
      programLabel: resolveProgram(registry.program)?.label,
      statusLabel: resolveRegistryStatus(registry.status)?.label,
      therapist: registry.therapist,
    } : null,
    range: effRange,
    followUps: followUps.filter((r) => !r.cancellation).map((r) => ({
      ...r,
      methodLabel: resolveFollowUpMethod(r.method)?.label || '—',
      resultLabel: resolveFollowUpResult(r.result)?.label || '—',
    })),
    meds,
    labs,
    xrays,
  });

  return (
    <QueuePageShell
      activeKey='treat'
      breadcrumb={breadcrumb}
      title='ติดตามการดูแลผู้ติดสารเสพติด'
      onBack={() => history.push('/clinic/addiction')}
      backLabel='กลับหน้าคิว'
      actions={(
        <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-300, 12px)' }}>
          <AccessDemoToggle onRevoked={() => setTick((t) => t + 1)} />
          <NeutralSubdueButton variant='outline' size='sm' leadingIcon='print' onClick={doPrint} disabled={!selectedHn}>
            พิมพ์ใบสรุปการติดตาม
          </NeutralSubdueButton>
          <BrandSubdueButton variant='outline' leadingIcon='contact_page' onClick={() => history.push('/clinic/addiction/registry')}>
            ทะเบียนผู้ติดสารเสพติด
          </BrandSubdueButton>
        </div>
      )}
      summaryCards={summaryCards}
    >
      {/* ── บันทึก / แก้ไขการติดตาม ───────────────────────────────── */}
      <Popup
        open={recordOpen}
        onClose={requestCloseRecord}
        title={recordForm.no == null ? 'บันทึกการติดตามผลการบำบัด' : `แก้ไขการติดตามครั้งที่ ${recordForm.no}`}
        subtitle={selectedRow ? `${selectedRow.name} · HN: ${selectedRow.hn}` : ''}
        tertiaryAction={{ label: 'ปิด', onClick: requestCloseRecord }}
        primaryAction={{ label: recordForm.no == null ? 'บันทึกการติดตาม' : 'บันทึกการแก้ไข', onClick: saveRecord }}
      >
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-400, 16px)' }}>
          <div className='flex items-start w-full flex-wrap' style={{ gap: 'var(--dim-space-400, 16px)' }}>
            <div className='flex-1 flex flex-col' style={{ gap: 'var(--dim-space-150, 6px)', minWidth: 220 }}>
              <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-default, #363B3F)' }}>
                วิธีติดตาม <span style={{ color: 'var(--text-input-require)' }}>*</span>
              </span>
              <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                {FOLLOWUP_METHODS.map((m) => (
                  <SelectableTag
                    key={m.value}
                    label={m.label}
                    size='md'
                    selected={recordForm.method === m.value}
                    onClick={() => {
                      setRecordForm((f) => ({ ...f, method: m.value }));
                      setRecordErrors((e) => ({ ...e, method: undefined }));
                    }}
                  />
                ))}
              </div>
              {recordErrors.method && (
                <span style={{ color: 'var(--text-input-errorHelper, #DC2626)', fontSize: 'var(--type-size-xs)' }}>{recordErrors.method}</span>
              )}
            </div>
            <div className='flex-1 flex flex-col' style={{ gap: 'var(--dim-space-150, 6px)', minWidth: 240 }}>
              <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-default, #363B3F)' }}>
                ผลการติดตาม <span style={{ color: 'var(--text-input-require)' }}>*</span>
              </span>
              <Select
                showLabel={false}
                showHelperText={false}
                searchable={false}
                size='lg'
                value={recordForm.result}
                onChange={(v) => {
                  setRecordForm((f) => ({ ...f, result: v }));
                  setRecordErrors((e) => ({ ...e, result: undefined, note: undefined }));
                }}
                options={FOLLOWUP_RESULTS.map((r) => ({ value: r.value, label: r.label }))}
                placeholder='เลือกผลการติดตาม'
                error={recordErrors.result ? ' ' : undefined}
              />
              {recordErrors.result && (
                <span style={{ color: 'var(--text-input-errorHelper, #DC2626)', fontSize: 'var(--type-size-xs)' }}>{recordErrors.result}</span>
              )}
            </div>
          </div>
          <SuggestibleTextarea
            label='บันทึกการติดตาม'
            required={recordForm.result === 'missed'}
            voice
            value={recordForm.note}
            onChange={(e) => {
              const v = e.target.value;
              setRecordForm((f) => ({ ...f, note: v }));
              if (v.trim()) setRecordErrors((er) => ({ ...er, note: undefined }));
            }}
            suggestions={FOLLOWUP_NOTE_SUGGESTIONS}
            minChars={2}
            placeholder='สภาพผู้ป่วย ครอบครัว/ชุมชน และแผนการติดตามครั้งถัดไป'
          />
          {recordErrors.note && (
            <span style={{ color: 'var(--text-input-errorHelper, #DC2626)', fontSize: 'var(--type-size-xs)' }}>{recordErrors.note}</span>
          )}
          <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
            ระบบบันทึกผู้ติดตามและเวลาให้อัตโนมัติ (audit trail)
          </span>
        </div>
      </Popup>

      <UnsavedChangesPopup
        open={unsavedOpen}
        onClose={() => setUnsavedOpen(false)}
        onSave={() => { setUnsavedOpen(false); saveRecord(); }}
        onDiscard={() => { setUnsavedOpen(false); setRecordOpen(false); }}
        title='ออกจากแบบฟอร์มการติดตามโดยยังไม่บันทึก?'
        description='ข้อมูลการติดตามที่กรอกไว้จะหายไปหากออกโดยไม่บันทึก'
      />

      <Popup
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        title='ยกเลิกรายการติดตาม'
        subtitle={cancelTarget ? `ครั้งที่ ${cancelTarget.no} · ${formatAddictionDate(cancelTarget.date)}` : ''}
        tertiaryAction={{ label: 'กลับไปแก้ต่อ', onClick: () => setCancelTarget(null) }}
        primaryAction={{ label: 'ยืนยันยกเลิกรายการ', onClick: confirmCancel, tone: 'danger' }}
      >
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          <SuggestibleTextarea
            label='เหตุผลการยกเลิก'
            required
            voice
            value={cancelReason}
            onChange={(e) => { setCancelReason(e.target.value); if (e.target.value.trim()) setCancelError(''); }}
            suggestions={CANCEL_REASON_SUGGESTIONS}
            minChars={2}
            placeholder='เช่น บันทึกซ้ำ / บันทึกผิดคน'
          />
          <span style={{
            color: cancelError ? 'var(--text-input-errorHelper, #DC2626)' : 'var(--text-content-tertiary, #858C92)',
            fontSize: 'var(--type-size-xs)',
          }}>
            {cancelError || 'รายการที่ยกเลิกจะยังแสดงอยู่แบบเทา พร้อมผู้ยกเลิก เวลา และเหตุผล'}
          </span>
        </div>
      </Popup>

      <AddictionAccessGate>
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
          {/* ── ค้นหาผู้รับบริการ ─────────────────────────────────── */}
          <SectionCard icon='person_search' title='เลือกผู้รับบริการ'>
            <div className='w-full flex items-start justify-center'>
              <PrimarySearch
                value={searchQ}
                onChange={setSearchQ}
                onSubmit={(label, item) => {
                  setSearchQ(label);
                  const match = resolveSearchRow(label, item);
                  pushHistory(match ? poolToSearchItem(match) : (item ?? label));
                  if (match) selectPatient(match.hn);
                }}
                suggestions={searchSuggestions}
                history={searchHistory}
                onHistoryClear={searchHistory.length > 0 ? clearHistory : undefined}
                placeholder='ค้นหา HN / ชื่อ-สกุลผู้รับบริการ / ผู้บำบัด'
                width={640}
              />
            </div>
            {searchQ.trim() && !selectedHn ? (
              <SearchResultCount found={pickerMatchCount} total={pool.length} />
            ) : null}
            {deepLinkMiss && !selectedHn && (
              <NoticeBand tone='warning' icon='link_off'>
                ไม่พบ HN {deepLinkMiss} ในทะเบียนผู้ติดสารเสพติดหรือคิวของคลินิก —
                ค้นหาผู้รับบริการรายอื่น หรือกลับไปลงทะเบียนที่หน้าทะเบียนผู้ติดสารเสพติดก่อน
              </NoticeBand>
            )}
            {!selectedHn && searchQ.trim() && searchSuggestions.length === 0 && (
              <EmptyHint>ไม่พบผู้รับบริการที่ตรงกับ "{searchQ.trim()}" — ตรวจสอบ HN / ชื่อ แล้วลองอีกครั้ง</EmptyHint>
            )}
            {!selectedHn && !searchQ.trim() && !deepLinkMiss && (
              <EmptyHint icon='monitoring'>
                ค้นหาและเลือกผู้รับบริการเพื่อดูผลการติดตาม ผลตรวจปัสสาวะ ยาที่ได้รับ ผล Lab และ X-ray ย้อนหลังตามช่วงเวลา
              </EmptyHint>
            )}
          </SectionCard>

          {selectedHn && (
            <>
              <PatientCard
                patient={cardPatient}
                title='ติดตามการดูแลรายบุคคล'
                onBack={() => { setSelectedHn(null); setSearchQ(''); }}
                actions={(
                  <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-300, 12px)' }}>
                    <ColorfulBadge style='red' size='small' hierarchy='secondary'>ข้อมูลลับ §1.4.2</ColorfulBadge>
                    {registry ? (
                      <>
                        <ProgramBadge program={registry.program} />
                        <ColorfulBadge style={resolveRegistryStatus(registry.status)?.badge || 'grey'} size='small' hierarchy='secondary'>
                          {resolveRegistryStatus(registry.status)?.label || registry.status}
                        </ColorfulBadge>
                      </>
                    ) : (
                      <ColorfulBadge style='grey' size='small' hierarchy='secondary'>ยังไม่มีทะเบียน</ColorfulBadge>
                    )}
                  </div>
                )}
              />

              {isRightsExpired(selectedHn) && (
                <NoticeBand tone='warning' icon='warning'>
                  สิทธิการรักษาของ HN {selectedHn} หมดอายุ — ตรวจสอบสิทธิก่อนให้บริการ
                  (ยังบันทึกการติดตามได้ งานบำบัดสารเสพติดเป็นบริการที่ห้ามปฏิเสธ)
                </NoticeBand>
              )}

              {overdue && (
                <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                  <NoticeBand tone='danger' icon='running_with_errors'>
                    ผิดนัดติดตาม — จำหน่ายเพื่อติดตามผลแล้ว แต่ไม่มีการติดตามตั้งแต่ {formatAddictionDate(overdue.lastDate)}
                    {' '}(เกินกำหนด 30 วันมาแล้ว {overdue.daysOverdue} วัน)
                  </NoticeBand>
                  <div className='flex items-center'>
                    <BrandSubdueButton variant='fill' size='sm' leadingIcon='add' onClick={openAddRecord}>
                      บันทึกการติดตามทันที
                    </BrandSubdueButton>
                  </div>
                </div>
              )}

              {!registry && (
                <NoticeBand tone='info' icon='assignment_late'>
                  ผู้รับบริการรายนี้ยังไม่มีทะเบียนผู้ติดสารเสพติด — บันทึกการติดตามได้ แต่ควรลงทะเบียนเพื่อให้เห็นโปรแกรมบำบัดและสถานะการจำหน่าย
                </NoticeBand>
              )}

              {/* ── ช่วงเวลา ────────────────────────────────────────── */}
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
                      onChange={([from, to]) => { setRange({ from, to }); setQuick(null); }}
                      format={isoOf}
                      parse={(s) => (s ? new Date(s) : null)}
                    />
                  </div>
                  <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary, #636B72)' }}>
                    {formatAddictionDate(effRange.from)} – {formatAddictionDate(effRange.to)}
                  </span>
                </div>
                {rangeInvalid && (
                  <NoticeBand tone='danger' icon='error'>
                    วันที่สิ้นสุดต้องไม่ก่อนวันที่เริ่มต้น — ยังคงแสดงผลของช่วงเวลาก่อนหน้าจนกว่าจะแก้ไขให้ถูกต้อง
                  </NoticeBand>
                )}
              </SectionCard>

              {/* ── 1. ผลการติดตาม ─────────────────────────────────── */}
              <SectionCard
                icon='follow_the_signs'
                title='ผลการติดตาม'
                aside={(
                  <BrandSubdueButton variant='fill' size='sm' leadingIcon='add' onClick={openAddRecord}>
                    บันทึกการติดตาม
                  </BrandSubdueButton>
                )}
              >
                {followUps.length === 0 ? (
                  <EmptyHint
                    icon='event_note'
                    action={(
                      <BrandSubdueButton variant='fill' leadingIcon='add' onClick={openAddRecord}>
                        บันทึกการติดตามครั้งแรก
                      </BrandSubdueButton>
                    )}
                  >
                    ไม่มีรายการติดตามในช่วง {formatAddictionDate(effRange.from)} – {formatAddictionDate(effRange.to)}
                  </EmptyHint>
                ) : (
                  <>
                    <Table
                      columns={followUpColumns}
                      rows={followUpPageRows}
                      rowKey={(r) => `${selectedHn}-${r.no}`}
                      emptyMessage='ไม่มีรายการติดตามในช่วงเวลาที่เลือก'
                    />
                    <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                      <span style={{ color: 'var(--text-content-secondary, #636B72)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)' }}>
                        {`แสดง ${(followUpPage - 1) * FOLLOWUP_PAGE_SIZE + 1}–${Math.min(followUpPage * FOLLOWUP_PAGE_SIZE, followUps.length)} จาก ${followUps.length} รายการ`}
                      </span>
                      <div className='flex-1' />
                      <Pagination currentPage={followUpPage} pageCount={totalFollowUpPages} onPageChange={setFollowUpPage} />
                    </div>
                  </>
                )}
              </SectionCard>

              {/* ── 2. กราฟผลตรวจปัสสาวะ ────────────────────────────── */}
              <SectionCard
                icon='monitoring'
                title='ผลตรวจปัสสาวะตามช่วงเวลา'
                aside={(
                  <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
                    แกนเดียว ชุดข้อมูลเดียว — 1 = พบสาร · 0 = ไม่พบสาร
                  </span>
                )}
              >
                {urinePoints.length === 0 ? (
                  <EmptyHint icon='show_chart'>
                    ไม่มีผลตรวจปัสสาวะในช่วง {formatAddictionDate(effRange.from)} – {formatAddictionDate(effRange.to)}
                  </EmptyHint>
                ) : urinePoints.length === 1 ? (
                  <div className='flex items-center' style={{ gap: 'var(--dim-space-300, 12px)' }}>
                    <span
                      aria-hidden='true'
                      style={{
                        width: 'var(--dim-space-300, 12px)',
                        height: 'var(--dim-space-300, 12px)',
                        borderRadius: '50%',
                        background: URINE_SERIES_COLOR,
                        flexShrink: 0,
                      }}
                    />
                    <div className='flex flex-col'>
                      <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-default, #363B3F)' }}>
                        {formatAddictionDate(urinePoints[0].date)} · {urinePoints[0].value === 1 ? 'พบสาร' : 'ไม่พบสาร'}
                      </span>
                      <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
                        มีผลตรวจครั้งเดียวในช่วงนี้ — ต้องมีอย่างน้อย 2 ครั้งจึงแสดงเป็นเส้นแนวโน้ม
                      </span>
                    </div>
                  </div>
                ) : (
                  <LineChart
                    months={urinePoints.map((p) => shortThaiDate(p.date))}
                    series={[{
                      label: 'ผลตรวจปัสสาวะหาสารเสพติด',
                      color: URINE_SERIES_COLOR,
                      values: urinePoints.map((p) => p.value),
                    }]}
                    height={180}
                  />
                )}
              </SectionCard>

              {/* ── 3. ยาที่ได้รับ ──────────────────────────────────── */}
              <SectionCard
                icon='medication'
                title='ยาที่ได้รับในช่วงเวลา'
                aside={(
                  <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
                    รวมการรับ-จ่ายเมทาโดนรายวัน (สยส.3) — {meds.length} รายการ
                  </span>
                )}
              >
                {meds.length === 0 ? (
                  <EmptyHint icon='no_meds'>
                    ไม่มีรายการยาในช่วง {formatAddictionDate(effRange.from)} – {formatAddictionDate(effRange.to)}
                  </EmptyHint>
                ) : (
                  <Table columns={medColumns} rows={meds} rowKey={(r) => `${r.date}-${r.item}-${r.dose}`} emptyMessage='ไม่มีรายการยาในช่วงเวลาที่เลือก' />
                )}
              </SectionCard>

              {/* ── 4. ผล Lab (สยส.2-2) ─────────────────────────────── */}
              <SectionCard
                icon='labs'
                title='ผลตรวจทางห้องปฏิบัติการในช่วงเวลา'
                aside={(
                  <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
                    ตามแบบ สยส.2-2 — {labs.length} รายการ ({labs.filter((r) => r.abnormal).length} รายการผิดปกติ)
                  </span>
                )}
              >
                {labs.length === 0 ? (
                  <EmptyHint icon='science'>
                    ไม่มีผล Lab ในช่วง {formatAddictionDate(effRange.from)} – {formatAddictionDate(effRange.to)}
                  </EmptyHint>
                ) : (
                  <Table columns={labColumns} rows={labs} rowKey={(r) => `${r.date}-${r.test}-${r.result}`} emptyMessage='ไม่มีผล Lab ในช่วงเวลาที่เลือก' />
                )}
              </SectionCard>

              {/* ── 5. ผล X-ray (สยส.2-3) ───────────────────────────── */}
              <SectionCard
                icon='radiology'
                title='ผลเอกซเรย์ในช่วงเวลา'
                aside={(
                  <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
                    ตามแบบ สยส.2-3 — {xrays.length} รายการ
                  </span>
                )}
              >
                {xrays.length === 0 ? (
                  <EmptyHint icon='image_not_supported'>
                    ไม่มีผล X-ray ในช่วง {formatAddictionDate(effRange.from)} – {formatAddictionDate(effRange.to)}
                  </EmptyHint>
                ) : (
                  <Table columns={xrayColumns} rows={xrays} rowKey={(r) => `${r.date}-${r.exam}`} emptyMessage='ไม่มีผล X-ray ในช่วงเวลาที่เลือก' />
                )}
              </SectionCard>

              {registry && (
                <div className='flex items-center w-full flex-wrap' style={{ gap: 'var(--dim-space-300, 12px)' }}>
                  <AuditStamp
                    by={registry.recordedBy}
                    at={registry.recordedAt}
                    editedBy={registry.editedBy}
                    editedAt={registry.editedAt}
                  />
                  <div className='flex-1' />
                  <NeutralSubdueButton
                    size='sm'
                    leadingIcon='contact_page'
                    onClick={() => history.push('/clinic/addiction/registry')}
                  >
                    เปิดทะเบียนผู้ติดสารเสพติด
                  </NeutralSubdueButton>
                </div>
              )}
            </>
          )}
        </div>
      </AddictionAccessGate>
    </QueuePageShell>
  );
};

export default AddictionFollowUpPage;
