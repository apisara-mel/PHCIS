import React, { useEffect, useMemo, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import QueuePageShell, { QUEUE_STICKY_UNDER_TABS } from '@/templates/QueuePageShell';
import PrimarySearch from '@/components/search/PrimarySearch';
import SearchResultCount from '@/components/search/SearchResultCount';
import useSearchHistory from '@/components/search/useSearchHistory';
import FilterTag, { FilterDropdown } from '@/components/forms/FilterTag';
import FilterDateTag from '@/components/forms/FilterDateTag';
import OverflowFlexRow from '@/components/overflow/OverflowFlexRow';
import Table from '@/components/table/Table';
import Pagination from '@/components/pagination/Pagination';
import Popup from '@/components/popup/Popup';
import InputField from '@/components/forms/InputField';
import Select from '@/components/forms/Select';
import DatePicker from '@/components/forms/DatePicker';
import SelectableTag from '@/components/forms/SelectableTag';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import Icon from '@/components/icons/Icon';
import { TopicHeader, Field, Banner, ErrorNote, ReadOnlyBanner, EmptyPanel, RowAuditNote } from '@/pages/clinic/tb/tbShared';
import { getPatientByHN } from '@/data/patientProfiles';
import {
  TB_RISK_GROUPS,
  TB_VERBAL_SCREENING,
  TB_SCREENING_SUMMARY,
  resolveTbRiskGroup,
  resolveTbScreeningSummary,
  getTbScreeningRows,
  addTbScreeningRecord,
  updateTbScreeningRecord,
  cancelTbScreeningRecord,
} from '@/data/tbScreening';
import { getTbRegistryByRegNo, formatTbDate } from '@/data/tbRegistry';
import {
  canEditTb,
  maskTbName,
  TB_CURRENT_USER,
  TB_CANCEL_REASON_SUGGESTIONS,
  TB_SCREENING_SUGGESTIONS,
} from '@/data/tbVisits';

/* TbScreeningPage — คัดกรองกลุ่มเสี่ยงวัณโรค (TOR §1.10.4.9 + .8) ที่
   /clinic/tb/screening. ทะเบียนผู้ถูกคัดกรอง (list + filter + pagination)
   พร้อมคำกริยา TOR ครบสี่:
     • แสดง   — ตาราง + popup รายละเอียดพร้อมแถบ audit
     • บันทึก — popup "บันทึกการคัดกรองใหม่" (บังคับ ≥1 กลุ่มเสี่ยง และ
                ≥1 ผลตรวจ ตาม addTbScreeningRecord)
     • แก้ไข — popup เดิม pre-filled + dirty-check ก่อนปิด
     • ยกเลิก — บังคับเหตุผล; แถวที่ยกเลิกยังอยู่ในตารางแบบขีดฆ่า

   ผลสรุป "พบเชื้อ" ดัน CTA ขึ้นทะเบียนผู้ป่วยวัณโรค (deep-link ไป
   /clinic/tb/registry พร้อม prefill) และ "รอผลตรวจ" ไม่ถูกนับเป็นปกติ
   ในการ์ดสรุป. ผู้สัมผัสโรคจากแท็บผู้สัมผัสของทะเบียนถูกส่งมาแบบ prefill. */

const breadcrumb = ['ระบบบันทึกการรักษา', 'คลินิกวัณโรค', 'คัดกรองกลุ่มเสี่ยง'];
const SEARCH_HISTORY_KEY = 'mih:primarysearch-history:tb-screening';
const PAGE_SIZE = 10;

const FILTER_DEFAULTS = { riskGroup: 'all', summary: 'all', dateValue: { quick: 'all' } };
const DATE_CHIP_LABELS = { all: 'ทุกช่วงเวลา', today: 'วันนี้', week: '7 วันล่าสุด', month: '30 วันล่าสุด' };

const RESULT_OPTIONS = {
  cxr: ['ไม่ได้ตรวจ', 'รอตรวจ', 'ปกติ', 'พบความผิดปกติ — สงสัยวัณโรค', 'พบ infiltration', 'พบ cavity'],
  afb: ['ไม่ได้ตรวจ', 'รอผล', 'Negative', 'Scanty', '1+', '2+', '3+'],
  geneXpert: ['ไม่ได้ตรวจ', 'รอผล', 'MTB not detected', 'MTB detected', 'MTB detected, RIF resistance'],
};

const EMPTY_DRAFT = {
  name: '', idCard: '', age: '', phone: '', hn: '',
  riskGroups: [], symptoms: {},
  screeningDate: '',
  cxrResult: 'ไม่ได้ตรวจ', afbResult: 'ไม่ได้ตรวจ', geneXpertResult: 'ไม่ได้ตรวจ',
  summary: '', relatedRegNo: '', note: '',
};

const isoOf = (d) => d.toISOString().slice(0, 10);
const todayIso = () => isoOf(new Date());
const daysAgoIso = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return isoOf(d);
};

const KeyValue = ({ label, value }) => (
  <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-050, 2px)', minWidth: 150 }}>
    <span style={{ fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary, #858C92)' }}>{label}</span>
    <span style={{ fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-default, #363B3F)' }}>{value || '—'}</span>
  </div>
);

const TbScreeningPage = () => {
  const history = useHistory();
  const { state: navState } = useLocation();

  const [tick, setTick] = useState(0);
  const bump = () => setTick((t) => t + 1);
  const canEdit = canEditTb();

  const [searchQ, setSearchQ] = useState('');
  const [filters, setFilters] = useState(FILTER_DEFAULTS);
  const [page, setPage] = useState(1);

  const [viewTarget, setViewTarget] = useState(null);
  const [formMode, setFormMode] = useState(null); // null | 'create' | 'edit'
  const [editId, setEditId] = useState(null);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [baseline, setBaseline] = useState(EMPTY_DRAFT);
  const [formError, setFormError] = useState('');
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
  const rows = useMemo(() => getTbScreeningRows().slice(), [tick]);

  const displayName = (name) => (canEdit ? name : maskTbName(name));

  /* Deep-link จากแท็บผู้สัมผัสโรคของทะเบียน — เปิดฟอร์มพร้อม prefill. */
  useEffect(() => {
    if (!navState?.prefill) return;
    const p = navState.prefill;
    const seed = {
      ...EMPTY_DRAFT,
      name: p.name || '',
      age: p.age != null ? String(p.age) : '',
      hn: p.hn || '',
      riskGroups: p.riskGroups || [],
      relatedRegNo: p.relatedRegNo || '',
      screeningDate: todayIso(),
    };
    setDraft(seed);
    setBaseline(seed);
    setFormError('');
    setEditId(null);
    setFormMode('create');
  }, [navState]);

  /* ── กรอง / ค้นหา ──────────────────────────────────────────────── */

  const setFilter = (key) => (val) => { setFilters((f) => ({ ...f, [key]: val })); setPage(1); };
  const isAllDefault = filters.riskGroup === 'all' && filters.summary === 'all'
    && filters.dateValue.quick === 'all' && !searchQ.trim();
  const resetFilters = () => { setFilters(FILTER_DEFAULTS); setSearchQ(''); setPage(1); };

  const dateFloor = useMemo(() => {
    switch (filters.dateValue.quick) {
      case 'today': return todayIso();
      case 'week': return daysAgoIso(7);
      case 'month': return daysAgoIso(30);
      default: return null;
    }
  }, [filters.dateValue]);

  const filtered = useMemo(() => {
    const q = searchQ.trim().toLowerCase();
    return rows.filter((r) => {
      if (filters.riskGroup !== 'all' && !(r.riskGroups || []).includes(filters.riskGroup)) return false;
      if (filters.summary !== 'all' && r.summary !== filters.summary) return false;
      if (dateFloor && String(r.screeningDate) < dateFloor) return false;
      if (!q) return true;
      return [r.name, r.idCard, r.hn, r.phone].some((f) => f && f.toLowerCase().includes(q));
    });
  }, [rows, filters, searchQ, dateFloor]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const rangeStart = filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, filtered.length);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);

  /* การ์ดสรุปตาม TB_SCREENING_SUMMARY — นับเฉพาะรายการที่ไม่ถูกยกเลิก
     และ "รอผลตรวจ" มีการ์ดของตัวเอง (ไม่ถูกนับรวมเป็นปกติ). */
  const summaryCards = useMemo(() => {
    const live = rows.filter((r) => r.status !== 'cancelled');
    const colorOf = { normal: 'positive', suspect: 'warning', positive: 'destructive', pending: 'info' };
    const iconOf = { normal: 'check_circle', suspect: 'help', positive: 'coronavirus', pending: 'hourglass_top' };
    return [
      { key: 'total', label: 'คัดกรองทั้งหมด', value: live.length, color: 'info', icon: 'person_search' },
      ...TB_SCREENING_SUMMARY.map((s) => ({
        key: s.value,
        label: s.label,
        value: live.filter((r) => r.summary === s.value).length,
        color: colorOf[s.value] || 'info',
        icon: iconOf[s.value] || 'help'})),
    ];
  }, [rows]);

  const riskGroupOptions = useMemo(() => ([
    { value: 'all', label: 'ทุกกลุ่มเสี่ยง' },
    ...TB_RISK_GROUPS.map((g) => ({ value: g.value, label: g.label })),
  ]), []);
  const summaryOptions = useMemo(() => ([
    { value: 'all', label: 'ทุกผลสรุป' },
    ...TB_SCREENING_SUMMARY.map((s) => ({ value: s.value, label: s.label })),
  ]), []);

  const searchSuggestions = useMemo(() => {
    const q = searchQ.trim().toLowerCase();
    if (!q) return [];
    return rows
      .filter((r) => [r.name, r.idCard, r.hn, r.phone].some((f) => f && f.toLowerCase().includes(q)))
      .slice(0, 8)
      .map((r) => ({
        id: r.id,
        label: displayName(r.name),
        sublabel: r.idCard,
        value: displayName(r.name),
        badges: [{ label: resolveTbScreeningSummary(r.summary)?.label || '—', tone: 'teal' }],
        avatarSrc: r.hn ? getPatientByHN(r.hn)?.avatarUrl : undefined,
      }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQ, rows, canEdit]);

  /* ── บันทึก / แก้ไข ────────────────────────────────────────────── */

  const openCreate = () => {
    const seed = { ...EMPTY_DRAFT, screeningDate: todayIso() };
    setDraft(seed);
    setBaseline(seed);
    setFormError('');
    setEditId(null);
    setFormMode('create');
  };

  const openEdit = (row) => {
    const seed = {
      name: row.name || '',
      idCard: row.idCard || '',
      age: row.age != null ? String(row.age) : '',
      phone: row.phone || '',
      hn: row.hn || '',
      riskGroups: [...(row.riskGroups || [])],
      symptoms: { ...(row.symptoms || {}) },
      screeningDate: row.screeningDate || '',
      cxrResult: row.cxrResult || 'ไม่ได้ตรวจ',
      afbResult: row.afbResult || 'ไม่ได้ตรวจ',
      geneXpertResult: row.geneXpertResult || 'ไม่ได้ตรวจ',
      summary: row.summary || '',
      relatedRegNo: row.relatedRegNo || '',
      note: row.note || '',
    };
    setDraft(seed);
    setBaseline(seed);
    setFormError('');
    setEditId(row.id);
    setFormMode('edit');
  };

  const requestCloseForm = () => {
    if (JSON.stringify(draft) !== JSON.stringify(baseline)) setDiscardOpen(true);
    else setFormMode(null);
  };

  const toggleRisk = (value) => setDraft((d) => ({
    ...d,
    riskGroups: d.riskGroups.includes(value)
      ? d.riskGroups.filter((g) => g !== value)
      : [...d.riskGroups, value],
  }));

  const toggleSymptom = (key) => setDraft((d) => ({
    ...d,
    symptoms: { ...d.symptoms, [key]: !d.symptoms?.[key] },
  }));

  const submitForm = () => {
    /* กติกาเดียวกับ addTbScreeningRecord — บังคับกับโหมดแก้ไขด้วย เพราะ
       updateTbScreeningRecord ไม่ได้ validate ให้ (แก้ไขก็ต้องครบเหมือนกัน). */
    if (!draft.name.trim()) { setFormError('ต้องระบุชื่อผู้รับการคัดกรอง'); return; }
    if (draft.riskGroups.length === 0) { setFormError('ต้องเลือกกลุ่มเสี่ยงอย่างน้อย 1 กลุ่ม'); return; }
    const hasResult = [draft.cxrResult, draft.afbResult, draft.geneXpertResult]
      .some((r) => r && r !== 'ไม่ได้ตรวจ');
    if (!hasResult) { setFormError('ต้องบันทึกผลการตรวจอย่างน้อย 1 รายการ (CXR / AFB / GeneXpert)'); return; }
    if (!draft.screeningDate) { setFormError('ต้องระบุวันที่คัดกรอง'); return; }
    if (draft.screeningDate > todayIso()) { setFormError('วันที่คัดกรองต้องไม่เป็นวันในอนาคต'); return; }
    if (!draft.summary) { setFormError('ต้องเลือกผลสรุปการคัดกรอง'); return; }
    if (draft.relatedRegNo && !getTbRegistryByRegNo(draft.relatedRegNo)) {
      setFormError(`ไม่พบทะเบียนวัณโรคเลขที่ ${draft.relatedRegNo} — ตรวจสอบเลขที่ขึ้นทะเบียนต้นทาง`);
      return;
    }
    const payload = {
      ...draft,
      age: draft.age === '' ? null : Number(draft.age),
    };
    if (formMode === 'edit') {
      const ok = updateTbScreeningRecord(editId, payload, TB_CURRENT_USER.name);
      if (!ok) { setFormError('แก้ไขไม่สำเร็จ — รายการนี้ถูกยกเลิกไปแล้ว'); return; }
    } else {
      const result = addTbScreeningRecord(payload, TB_CURRENT_USER.name);
      if (!result.ok) { setFormError(result.error); return; }
    }
    setFormMode(null);
    bump();
  };

  /* ── ยกเลิก ────────────────────────────────────────────────────── */

  const confirmCancel = () => {
    if (!cancelReason.trim()) { setCancelError('ต้องระบุเหตุผลการยกเลิกก่อนยืนยัน'); return; }
    const ok = cancelTbScreeningRecord(cancelTarget.id, cancelReason.trim(), TB_CURRENT_USER.name);
    if (!ok) { setCancelError('ยกเลิกไม่สำเร็จ'); return; }
    setCancelTarget(null);
    setViewTarget(null);
    bump();
  };

  /* ── ส่งต่อขึ้นทะเบียนเมื่อผลสรุป "พบเชื้อ" ─────────────────────── */

  const goRegister = (row) => history.push({
    pathname: '/clinic/tb/registry',
    state: { prefill: { hn: row.hn, name: row.name, screeningId: row.id } },
  });

  const cancelledStyle = (r) => (r.status === 'cancelled'
    ? { textDecoration: 'line-through', color: 'var(--text-content-quaternary, #ADB2B7)' }
    : undefined);

  const columns = useMemo(() => ([
    { key: 'name', label: 'ชื่อ-นามสกุล', flex: true, minWidth: 180, render: (r) => <span style={cancelledStyle(r)}>{displayName(r.name)}</span> },
    { key: 'idCard', label: 'เลขบัตรประชาชน' },
    { key: 'age', label: 'อายุ', render: (r) => (r.age ? `${r.age} ปี` : '—') },
    {
      key: 'riskGroups', label: 'กลุ่มเสี่ยง', flex: true, minWidth: 200, sortable: false,
      render: (r) => (
        <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-100, 4px)' }}>
          {(r.riskGroups || []).map((g) => (
            <ColorfulBadge key={g} style='purple' size='small' hierarchy='secondary'>
              {resolveTbRiskGroup(g)?.label || g}
            </ColorfulBadge>
          ))}
        </div>
      ),
    },
    { key: 'screeningDate', label: 'วันที่คัดกรอง', render: (r) => formatTbDate(r.screeningDate) },
    { key: 'cxrResult', label: 'CXR', flex: true, minWidth: 150 },
    { key: 'afbResult', label: 'AFB' },
    { key: 'geneXpertResult', label: 'GeneXpert', flex: true, minWidth: 160 },
    {
      key: 'summary', label: 'ผลสรุป',
      render: (r) => {
        const s = resolveTbScreeningSummary(r.summary);
        return s ? <ColorfulBadge style={s.badge} size='small' hierarchy='secondary'>{s.label}</ColorfulBadge> : '—';
      },
    },
    {
      key: 'audit', label: 'ผู้บันทึก / สถานะ', flex: true, minWidth: 240, sortable: false,
      render: (r) => (
        <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-050, 2px)' }}>
          {r.status === 'cancelled' && <ColorfulBadge style='red' size='small' hierarchy='secondary'>ยกเลิกแล้ว</ColorfulBadge>}
          <RowAuditNote row={r} />
        </div>
      ),
    },
    {
      key: 'actions', label: 'การดำเนินการ', sortable: false,
      render: (r) => (
        <div className='inline-flex items-center flex-wrap' style={{ gap: 'var(--dim-space-100, 4px)' }}>
          <BrandSubdueButton variant='outline' size='sm' leadingIcon='visibility' onClick={(e) => { e.stopPropagation(); setViewTarget(r); }}>
            รายละเอียด
          </BrandSubdueButton>
          {canEdit && r.status !== 'cancelled' && (
            <>
              <BrandSubdueButton variant='outline' size='sm' leadingIcon='edit' onClick={(e) => { e.stopPropagation(); openEdit(r); }}>
                แก้ไข
              </BrandSubdueButton>
              <NeutralSubdueButton
                size='sm'
                leadingIcon='block'
                onClick={(e) => { e.stopPropagation(); setCancelReason(''); setCancelError(''); setCancelTarget(r); }}
              >
                ยกเลิก
              </NeutralSubdueButton>
            </>
          )}
        </div>
      ),
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ]), [canEdit, rows]);

  const draftPositive = draft.summary === 'positive';

  return (
    <QueuePageShell
      activeKey='treat'
      breadcrumb={breadcrumb}
      title='คัดกรองกลุ่มเสี่ยงวัณโรค'
      onBack={() => history.push('/clinic/tb')}
      backLabel='กลับหน้าคิว'
      actions={(
        <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          <BrandSubdueButton variant='outline' size='md' leadingIcon='contract' onClick={() => history.push('/clinic/tb/registry')}>
            ทะเบียนวัณโรค
          </BrandSubdueButton>
          <BrandSubdueButton variant='outline' size='md' leadingIcon='print' onClick={() => window.print()}>
            พิมพ์ทะเบียนคัดกรอง
          </BrandSubdueButton>
          {canEdit && (
            <BrandSubdueButton variant='fill' size='md' leadingIcon='person_add' onClick={openCreate}>
              บันทึกการคัดกรองใหม่
            </BrandSubdueButton>
          )}
        </div>
      )}
      summaryCards={summaryCards}
    >
      {/* ── แสดง: รายละเอียดการคัดกรอง ─────────────────────────────── */}
      <Popup
        open={!!viewTarget}
        onClose={() => setViewTarget(null)}
        size='large'
        title='รายละเอียดการคัดกรองกลุ่มเสี่ยงวัณโรค'
        subtitle={viewTarget ? `${displayName(viewTarget.name)} · คัดกรองเมื่อ ${formatTbDate(viewTarget.screeningDate)}` : ''}
        tertiaryAction={{ label: 'ปิด', onClick: () => setViewTarget(null) }}
        secondaryAction={{ label: 'พิมพ์', onClick: () => window.print() }}
        primaryAction={canEdit && viewTarget && viewTarget.status !== 'cancelled'
          ? { label: 'แก้ไขผลคัดกรอง', onClick: () => { const t = viewTarget; setViewTarget(null); openEdit(t); } }
          : undefined}
      >
        {viewTarget && (
          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400, 16px)' }}>
            {viewTarget.status === 'cancelled' && (
              <ReadOnlyBanner>
                รายการนี้ถูกยกเลิกแล้ว — เหตุผล: {viewTarget.cancelReason}
                {viewTarget.cancelledBy ? ` · โดย ${viewTarget.cancelledBy}` : ''}
                {viewTarget.cancelledAt ? ` · ${formatTbDate(viewTarget.cancelledAt)}` : ''}
              </ReadOnlyBanner>
            )}

            <TopicHeader icon='badge'>ข้อมูลบุคคล</TopicHeader>
            <div className='flex items-start flex-wrap w-full' style={{ gap: 'var(--dim-space-600, 24px)' }}>
              <KeyValue label='ชื่อ-สกุล' value={displayName(viewTarget.name)} />
              <KeyValue label='เลขบัตรประชาชน' value={viewTarget.idCard} />
              <KeyValue label='อายุ' value={viewTarget.age ? `${viewTarget.age} ปี` : '—'} />
              <KeyValue label='โทรศัพท์' value={viewTarget.phone} />
              <KeyValue label='HN (ถ้ามี)' value={viewTarget.hn} />
              <KeyValue label='ทะเบียนต้นทาง' value={viewTarget.relatedRegNo} />
            </div>

            <TopicHeader icon='groups'>กลุ่มเสี่ยง</TopicHeader>
            <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
              {(viewTarget.riskGroups || []).map((g) => (
                <ColorfulBadge key={g} style='purple' size='small' hierarchy='secondary'>
                  {resolveTbRiskGroup(g)?.label || g}
                </ColorfulBadge>
              ))}
            </div>

            <TopicHeader icon='clipboard-list'>การคัดกรองอาการ (Verbal screening)</TopicHeader>
            <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
              {TB_VERBAL_SCREENING.filter((s) => viewTarget.symptoms?.[s.key]).length === 0 ? (
                <ColorfulBadge style='green' size='small' hierarchy='secondary'>ไม่พบอาการสงสัย</ColorfulBadge>
              ) : TB_VERBAL_SCREENING.filter((s) => viewTarget.symptoms?.[s.key]).map((s) => (
                <ColorfulBadge key={s.key} style='orange' size='small' hierarchy='secondary'>{s.label}</ColorfulBadge>
              ))}
            </div>

            <TopicHeader icon='biotech'>ผลการตรวจหาวัณโรค</TopicHeader>
            <div className='flex items-start flex-wrap w-full' style={{ gap: 'var(--dim-space-600, 24px)' }}>
              <KeyValue label='ภาพรังสีทรวงอก (CXR)' value={viewTarget.cxrResult} />
              <KeyValue label='เสมหะ AFB' value={viewTarget.afbResult} />
              <KeyValue label='GeneXpert' value={viewTarget.geneXpertResult} />
              <KeyValue label='ผลสรุป' value={resolveTbScreeningSummary(viewTarget.summary)?.label} />
            </div>

            {viewTarget.note && (
              <>
                <TopicHeader icon='file-text'>บันทึกเพิ่มเติม</TopicHeader>
                <span style={{ fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-secondary, #636B72)' }}>
                  {viewTarget.note}
                </span>
              </>
            )}

            {viewTarget.summary === 'positive' && viewTarget.status !== 'cancelled' && (
              <Banner
                tone='danger'
                icon='error'
                action={canEdit ? (
                  <BrandSubdueButton variant='fill' size='sm' leadingIcon='person_add' onClick={() => goRegister(viewTarget)}>
                    ขึ้นทะเบียนผู้ป่วยวัณโรค
                  </BrandSubdueButton>
                ) : null}
              >
                ผลคัดกรองพบเชื้อวัณโรค — ต้องส่งพบแพทย์และขึ้นทะเบียนเพื่อเริ่มการรักษาโดยเร็ว
              </Banner>
            )}

            <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
              <RowAuditNote row={viewTarget} />
              {viewTarget.relatedRegNo && (
                <NeutralSubdueButton
                  size='sm'
                  leadingIcon='contract'
                  onClick={() => history.push({ pathname: '/clinic/tb/registry', state: { regNo: viewTarget.relatedRegNo } })}
                >
                  เปิดทะเบียนต้นทาง {viewTarget.relatedRegNo}
                </NeutralSubdueButton>
              )}
            </div>
          </div>
        )}
      </Popup>

      {/* ── บันทึก / แก้ไขการคัดกรอง ───────────────────────────────── */}
      <Popup
        open={!!formMode}
        onClose={requestCloseForm}
        size='large'
        title={formMode === 'edit' ? 'แก้ไขผลการคัดกรองกลุ่มเสี่ยง' : 'บันทึกการคัดกรองกลุ่มเสี่ยงวัณโรค'}
        subtitle='TOR §1.10.4.9 — ต้องเลือกกลุ่มเสี่ยงอย่างน้อย 1 กลุ่ม และบันทึกผลตรวจอย่างน้อย 1 รายการ'
        tertiaryAction={{ label: 'ยกเลิก', onClick: requestCloseForm }}
        primaryAction={{ label: formMode === 'edit' ? 'บันทึกการแก้ไข' : 'บันทึกการคัดกรอง', onClick: submitForm }}
      >
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400, 16px)' }}>
          <TopicHeader icon='badge'>ข้อมูลบุคคล</TopicHeader>
          <div className='flex items-start flex-wrap w-full' style={{ gap: 'var(--dim-space-400, 16px)' }}>
            <Field label='ชื่อ-สกุล' required>
              <InputField
                value={draft.name}
                onChange={(v) => { setDraft((d) => ({ ...d, name: v })); setFormError(''); }}
                placeholder='ชื่อ-สกุลผู้รับการคัดกรอง'
                showLabel={false} showHelperText={false}
              />
            </Field>
            <Field label='เลขบัตรประชาชน'>
              <InputField
                value={draft.idCard}
                onChange={(v) => setDraft((d) => ({ ...d, idCard: v }))}
                placeholder='13 หลัก / เลขหนังสือเดินทาง'
                showLabel={false} showHelperText={false}
              />
            </Field>
            <Field label='อายุ (ปี)'>
              <InputField
                value={draft.age}
                onChange={(v) => setDraft((d) => ({ ...d, age: v }))}
                type='number'
                placeholder='เช่น 49'
                showLabel={false} showHelperText={false}
              />
            </Field>
            <Field label='โทรศัพท์'>
              <InputField
                value={draft.phone}
                onChange={(v) => setDraft((d) => ({ ...d, phone: v }))}
                placeholder='08x-xxx-xxxx'
                showLabel={false} showHelperText={false}
              />
            </Field>
            <Field label='HN (ถ้ามี)' hint='ค้นจากเวชระเบียนได้ — เว้นว่างได้ถ้ายังไม่เคยมีเวชระเบียน'>
              <InputField
                value={draft.hn}
                onChange={(v) => setDraft((d) => ({ ...d, hn: v }))}
                placeholder='เช่น 67-00024'
                showLabel={false} showHelperText={false}
              />
            </Field>
            <Field label='ทะเบียนวัณโรคต้นทาง' hint='กรอกอัตโนมัติเมื่อส่งมาจากแท็บผู้สัมผัสโรค'>
              <InputField
                value={draft.relatedRegNo}
                onChange={(v) => { setDraft((d) => ({ ...d, relatedRegNo: v })); setFormError(''); }}
                placeholder='เช่น 01/2569'
                showLabel={false} showHelperText={false}
              />
            </Field>
          </div>
          {draft.hn && getPatientByHN(draft.hn) && (
            <Banner tone='info' icon='info'>
              พบเวชระเบียน HN {draft.hn} — {getPatientByHN(draft.hn).fullName}
            </Banner>
          )}

          <TopicHeader icon='groups'>กลุ่มเสี่ยง (เลือกได้มากกว่า 1)</TopicHeader>
          <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
            {TB_RISK_GROUPS.map((g) => (
              <SelectableTag
                key={g.value}
                label={g.label}
                size='lg'
                selected={draft.riskGroups.includes(g.value)}
                onClick={() => { toggleRisk(g.value); setFormError(''); }}
              />
            ))}
          </div>

          <TopicHeader icon='clipboard-list'>การคัดกรองอาการ (Verbal screening)</TopicHeader>
          <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
            {TB_VERBAL_SCREENING.map((s) => (
              <SelectableTag
                key={s.key}
                label={s.label}
                size='lg'
                selected={!!draft.symptoms?.[s.key]}
                onClick={() => toggleSymptom(s.key)}
              />
            ))}
          </div>

          <TopicHeader icon='biotech'>ผลการตรวจหาวัณโรค</TopicHeader>
          <div className='flex items-start flex-wrap w-full' style={{ gap: 'var(--dim-space-400, 16px)' }}>
            <Field label='วันที่คัดกรอง' required>
              <DatePicker
                value={draft.screeningDate ? new Date(draft.screeningDate) : null}
                onChange={(d) => { setDraft((prev) => ({ ...prev, screeningDate: d ? isoOf(d) : '' })); setFormError(''); }}
                placeholder='เลือกวันที่' showLabel={false} showHelperText={false}
              />
            </Field>
            <Field label='ภาพรังสีทรวงอก (CXR)'>
              <Select
                showLabel={false} showHelperText={false} searchable={false} size='lg'
                value={draft.cxrResult}
                onChange={(v) => { setDraft((d) => ({ ...d, cxrResult: v })); setFormError(''); }}
                options={RESULT_OPTIONS.cxr.map((o) => ({ value: o, label: o }))}
                placeholder='เลือกผล CXR'
              />
            </Field>
            <Field label='เสมหะ AFB'>
              <Select
                showLabel={false} showHelperText={false} searchable={false} size='lg'
                value={draft.afbResult}
                onChange={(v) => { setDraft((d) => ({ ...d, afbResult: v })); setFormError(''); }}
                options={RESULT_OPTIONS.afb.map((o) => ({ value: o, label: o }))}
                placeholder='เลือกผล AFB'
              />
            </Field>
            <Field label='GeneXpert'>
              <Select
                showLabel={false} showHelperText={false} searchable={false} size='lg'
                value={draft.geneXpertResult}
                onChange={(v) => { setDraft((d) => ({ ...d, geneXpertResult: v })); setFormError(''); }}
                options={RESULT_OPTIONS.geneXpert.map((o) => ({ value: o, label: o }))}
                placeholder='เลือกผล GeneXpert'
              />
            </Field>
            <Field label='ผลสรุปการคัดกรอง' required>
              <Select
                showLabel={false} showHelperText={false} searchable={false} size='lg'
                value={draft.summary}
                onChange={(v) => { setDraft((d) => ({ ...d, summary: v })); setFormError(''); }}
                options={TB_SCREENING_SUMMARY.map((s) => ({ value: s.value, label: s.label }))}
                placeholder='เลือกผลสรุป'
              />
            </Field>
          </div>

          <SuggestibleTextarea
            label='บันทึกเพิ่มเติม'
            voice
            value={draft.note}
            onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value }))}
            suggestions={TB_SCREENING_SUGGESTIONS}
            minChars={3}
            placeholder='เช่น ผู้สัมผัสร่วมบ้านของผู้ป่วยเสมหะพบเชื้อ — คัดกรองตามรอบ 6 เดือน'
          />

          {draftPositive && (
            <Banner tone='danger' icon='error'>
              ผลสรุป "พบเชื้อ" — หลังบันทึกให้ส่งพบแพทย์และขึ้นทะเบียนผู้ป่วยวัณโรคทันที
              (ปุ่มลัดจะปรากฏในรายละเอียดของรายการนี้)
            </Banner>
          )}
          {formError && <ErrorNote>{formError}</ErrorNote>}
        </div>
      </Popup>

      {/* dirty-check */}
      <Popup
        open={discardOpen}
        onClose={() => setDiscardOpen(false)}
        title='ทิ้งการแก้ไข?'
        subtitle='ข้อมูลที่กรอกไว้ยังไม่ได้บันทึก หากปิดหน้าต่างนี้ข้อมูลจะหายไป'
        tertiaryAction={{ label: 'กรอกต่อ', onClick: () => setDiscardOpen(false) }}
        primaryAction={{ label: 'ทิ้งการแก้ไข', tone: 'danger', onClick: () => { setDiscardOpen(false); setFormMode(null); } }}
      />

      {/* ยกเลิกการคัดกรอง */}
      <Popup
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        title='ยกเลิกรายการคัดกรอง'
        subtitle={cancelTarget ? `${displayName(cancelTarget.name)} · ${formatTbDate(cancelTarget.screeningDate)}` : ''}
        tertiaryAction={{ label: 'ปิด', onClick: () => setCancelTarget(null) }}
        primaryAction={{ label: 'ยืนยันการยกเลิก', onClick: confirmCancel, tone: 'danger' }}
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
            placeholder='เช่น บันทึกซ้ำกับรายการเดิม / บันทึกผิดคน'
          />
          <span style={{ fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary, #858C92)' }}>
            รายการที่ยกเลิกจะยังคงแสดงในตารางแบบขีดฆ่า พร้อมผู้ยกเลิก เวลา และเหตุผล
          </span>
          {cancelError && <ErrorNote>{cancelError}</ErrorNote>}
        </div>
      </Popup>

      {/* ── ทะเบียนผู้ถูกคัดกรอง ───────────────────────────────────── */}
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
        <div
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
            gap: 'var(--dim-space-600, 24px)',
          }}
        >
          {!canEdit && (
            <ReadOnlyBanner>
              สิทธิ์ของคุณดูได้อย่างเดียว — ชื่อผู้รับการคัดกรองถูกปิดบัง (§1.4.2) และไม่สามารถบันทึก แก้ไข หรือยกเลิกได้
            </ReadOnlyBanner>
          )}

          <div className='w-full flex items-start justify-center'>
            <PrimarySearch
              value={searchQ}
              onChange={(v) => { setSearchQ(v); setPage(1); }}
              onSubmit={(label, item) => {
                setSearchQ(label);
                setPage(1);
                pushHistory(item ?? label);
                const match = rows.find((r) => r.id === item?.id);
                if (match) setViewTarget(match);
              }}
              suggestions={searchSuggestions}
              history={searchHistory}
              onHistoryClear={searchHistory.length > 0 ? clearHistory : undefined}
              placeholder='ค้นหาชื่อ-สกุล / เลขบัตรประชาชน / HN / โทรศัพท์'
              width={640}
            />
          </div>

          <div className='flex items-start w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
            <OverflowFlexRow itemGap='var(--dim-space-200, 8px)' moreAriaLabel='แสดงตัวกรองที่ซ่อน'>
              <FilterTag value='ทั้งหมด' selected={isAllDefault} onClick={resetFilters} />
              <FilterDropdown prefix='กลุ่มเสี่ยง:' options={riskGroupOptions} value={filters.riskGroup} onChange={setFilter('riskGroup')} />
              <FilterDropdown prefix='ผลสรุป:' options={summaryOptions} value={filters.summary} onChange={setFilter('summary')} />
              <FilterDateTag
                prefix='ช่วงวันที่คัดกรอง:'
                value={filters.dateValue}
                onChange={setFilter('dateValue')}
                defaultQuick={FILTER_DEFAULTS.dateValue.quick}
                quickLabels={DATE_CHIP_LABELS}
              />
            </OverflowFlexRow>
          </div>

          <SearchResultCount found={filtered.length} total={rows.length} />

          {rows.length === 0 ? (
            <EmptyPanel
              icon='person_search'
              title='ยังไม่มีรายการคัดกรองกลุ่มเสี่ยง'
              subtitle='บันทึกรายการแรกได้จากปุ่ม "บันทึกการคัดกรองใหม่" ด้านบน'
              action={canEdit ? (
                <BrandSubdueButton variant='fill' size='sm' leadingIcon='person_add' onClick={openCreate}>
                  บันทึกการคัดกรองใหม่
                </BrandSubdueButton>
              ) : null}
            />
          ) : filtered.length === 0 ? (
            <EmptyPanel
              icon='search_off'
              title='ไม่พบรายการที่ตรงกับการค้นหา / ตัวกรอง'
              subtitle='ลองปรับคำค้นหรือล้างตัวกรองเพื่อดูรายการทั้งหมด'
              action={(
                <NeutralSubdueButton size='sm' leadingIcon='filter_alt_off' onClick={resetFilters}>
                  ล้างตัวกรอง
                </NeutralSubdueButton>
              )}
            />
          ) : (
            <>
              <Table
                columns={columns}
                rows={pageRows}
                rowKey={(r) => r.id}
                onRowClick={setViewTarget}
                stickyColCount={1}
                stickyHeaderTop={QUEUE_STICKY_UNDER_TABS}
                emptyMessage='ไม่พบรายการที่ตรงกับการค้นหา / ตัวกรอง'
              />
              <div
                className='flex items-center w-full'
                style={{
                  gap: 'var(--dim-space-200, 8px)',
                  position: 'sticky',
                  bottom: 'var(--dim-space-0, 0px)',
                  zIndex: 50,
                  background: 'var(--surface-card-100, #FFFFFF)',
                  paddingTop: 'var(--dim-space-200, 8px)',
                  borderTop: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary, #C5EDDA)',
                }}
              >
                <span style={{ color: 'var(--text-content-secondary, #636B72)', fontSize: 'var(--type-size-sm, 14px)' }}>
                  {`แสดง ${rangeStart}–${rangeEnd} จาก ${filtered.length} รายการ`}
                </span>
                <div className='flex-1' />
                <Pagination currentPage={page} pageCount={totalPages} onPageChange={setPage} />
              </div>
            </>
          )}

          <span className='inline-flex items-center' style={{ gap: 'var(--dim-space-100, 4px)', fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary, #858C92)' }}>
            <Icon name='info' size={14} />
            ผลสรุป "รอผลตรวจ" ถูกนับแยกจาก "ปกติ" ในการ์ดสรุปด้านบน — ต้องติดตามผลให้ครบก่อนสรุปการคัดกรอง
          </span>
        </div>
      </div>
    </QueuePageShell>
  );
};

export default TbScreeningPage;
