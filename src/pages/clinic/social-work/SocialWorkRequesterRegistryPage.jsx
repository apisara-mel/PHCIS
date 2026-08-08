import React, { useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import Icon from '@/components/icons/Icon';
import InputField from '@/components/forms/InputField';
import Select from '@/components/forms/Select';
import DatePicker from '@/components/forms/DatePicker';
import Textarea from '@/components/forms/Textarea';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import SelectableTag from '@/components/forms/SelectableTag';
import Checkbox from '@/components/checkbox/Checkbox';
import Table from '@/components/table/Table';
import Pagination from '@/components/pagination/Pagination';
import Popup from '@/components/popup/Popup';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import BrandButton from '@/components/button/BrandButton';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import BrandDashedAddButton from '@/components/button/BrandDashedAddButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import DangerSubdueButton from '@/components/button/DangerSubdueButton';
import PatientCard from '@/components/card/PatientCard';
import { LineChart } from '@/components/graph/Charts';
import {
  SwSectionHeader, SwField, SwBanner, SwEmptyHint, SwInlineSearch, SwPagerBar,
} from '@/pages/clinic/social-work/SocialWorkShared';
import { getPatientByHN } from '@/data/patientProfiles';
import {
  SW_BARTHEL_ITEMS,
  SW_BARTHEL_MAX,
  SW_EXTRA_ASSESSMENT_SEED,
  SW_MATERIAL_OPTIONS,
  SW_REQUEST_REASONS,
  SW_REQUEST_STATUSES,
  findSwMaterial,
  interpretBarthel,
  isBarthelComplete,
  scoreBarthel,
  resolveSwRequestStatus,
  getSwRequesters,
  saveSwRequester,
  cancelSwRequester,
  reactivateSwRequester,
  setSwRequesterDecision,
  getSwAssessments,
  saveSwAssessment,
} from '@/data/socialWorkSupplies';
import {
  SW_WORKERS,
  SW_INFORMANT_RELATIONS,
  getSwQueueRows,
  SW_SCHEDULED_TODAY,
  getSwRegistrationByHn,
  hasSocialWorkRights,
  setSocialWorkRights,
  formatSwDate,
  formatSwDateTime,
  todayIso,
} from '@/data/socialWorkClinic';

/* SocialWorkRequesterRegistryPage — บันทึกทะเบียนผู้ขอวัสดุ (TOR 1.10.11.4).

   Registry pattern (list + inline create/edit) with an embedded
   การประเมินผู้ขอ: Barthel ADL 10 หัวข้อ ตามคู่มือระบบเดิม §2.4 —
   คีย์ครบทุกข้อ → "คำนวณคะแนน" จึงกดได้ → ระบบแปลผลลงตารางประวัติ
   (0-20 · 25-45 · 50-70 · 75-95 · 100). การแปลผลคำนวณเสมอ ห้ามพิมพ์เอง.
   พร้อม "แบบประเมินเพิ่มเติมตามที่ผู้ใช้งานกำหนด" ที่เพิ่มหัวข้อเองได้.

   ครบ 4 verbs: แสดง / บันทึก / แก้ไข / ยกเลิก (เหตุผลบังคับ + แถวสีจาง +
   เปิดใช้งานกลับได้) และคำขอที่อนุมัติแล้ว deep-link ไปแท็บจ่ายออกของ
   หน้ารับ-จ่ายวัสดุ. */

const breadcrumb = ['ระบบบันทึกการรักษา', 'งานสังคมสงเคราะห์', 'ทะเบียนผู้ขอวัสดุ'];
const PAGE_SIZE = 10;

const EMPTY_FORM = {
  id: '',
  requestNo: '',
  hn: '',
  name: '',
  caseNo: '',
  requestDate: todayIso(),
  proxyName: '',
  proxyRelation: '',
  phone: '',
  materials: [],
  reason: '',
  status: 'pending',
};

const EMPTY_ASSESSMENT = { answers: {}, extras: {}, note: '', assessor: '', date: todayIso() };

const struck = { color: 'var(--text-content-tertiary, #858C92)', textDecoration: 'line-through' };

const SocialWorkRequesterRegistryPage = () => {
  const history = useHistory();
  const [tick, setTick] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [, setRightsTick] = useState(0);

  const [editing, setEditing] = useState(null); /* null | 'new' | id */
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [banner, setBanner] = useState(null);

  const [assessTarget, setAssessTarget] = useState(null);
  const [assessment, setAssessment] = useState(EMPTY_ASSESSMENT);
  const [assessError, setAssessError] = useState('');
  const [extraItems, setExtraItems] = useState(SW_EXTRA_ASSESSMENT_SEED);
  const [newExtraLabel, setNewExtraLabel] = useState('');

  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState('');

  const [decisionTarget, setDecisionTarget] = useState(null);
  const [decisionStatus, setDecisionStatus] = useState('approved');
  const [decisionNote, setDecisionNote] = useState('');

  const canWrite = hasSocialWorkRights();
  const toggleRightsDemo = () => {
    setSocialWorkRights(!hasSocialWorkRights());
    setRightsTick((t) => t + 1);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const rows = useMemo(() => getSwRequesters(), [tick]);

  const patientPool = useMemo(() => {
    const seen = new Set();
    return [...getSwQueueRows(), ...SW_SCHEDULED_TODAY]
      .filter((p) => (seen.has(p.hn) ? false : seen.add(p.hn)));
  }, []);

  const patientOptions = patientPool.map((p) => ({ value: p.hn, label: `${p.name} · HN ${p.hn}` }));

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (!q) return true;
      return [r.requestNo, r.hn, r.name, r.proxyName, r.caseNo].some((f) => f && f.toLowerCase().includes(q));
    });
  }, [rows, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const summaryCards = useMemo(() => ([
    { key: 'total', label: 'คำขอทั้งหมด', value: rows.length, color: 'info', icon: 'assignment_ind' },
    { key: 'pending', label: 'รอประเมิน', value: rows.filter((r) => r.status === 'pending').length, color: 'warning', icon: 'pending_actions' },
    { key: 'approved', label: 'อนุมัติ รอรับของ', value: rows.filter((r) => r.status === 'approved').length, color: 'positive', icon: 'task_alt' },
    { key: 'rejected', label: 'ไม่อนุมัติ / ยกเลิก', value: rows.filter((r) => r.status === 'rejected' || r.status === 'cancelled').length, color: 'negative', icon: 'block' },
  ]), [rows]);

  /* ── form ──────────────────────────────────────────────────────── */
  const openCreate = () => {
    if (!canWrite) return;
    setForm({ ...EMPTY_FORM, requestDate: todayIso() });
    setErrors({});
    setBanner(null);
    setEditing('new');
  };

  const openEdit = (row) => {
    setForm({
      id: row.id,
      requestNo: row.requestNo,
      hn: row.hn,
      name: row.name,
      caseNo: row.caseNo || '',
      requestDate: row.requestDate,
      proxyName: row.proxyName || '',
      proxyRelation: row.proxyRelation || '',
      phone: row.phone || '',
      materials: row.materials || [],
      reason: row.reason || '',
      status: row.status,
    });
    setErrors({});
    setBanner(null);
    setEditing(row.id);
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const closeForm = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setErrors({});
  };

  const setField = (key) => (value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const pickPatient = (hn) => {
    const p = patientPool.find((r) => r.hn === hn);
    const reg = getSwRegistrationByHn(hn);
    setForm((f) => ({ ...f, hn, name: p?.name || '', caseNo: reg?.caseNo || '' }));
    setErrors((e) => ({ ...e, hn: undefined }));
  };

  const profile = useMemo(() => (form.hn ? getPatientByHN(form.hn) : null), [form.hn]);

  const save = () => {
    if (!canWrite) return;
    const errs = {};
    if (!form.hn) errs.hn = 'กรุณาเลือกผู้ขอ (HN)';
    if (!form.requestDate) errs.requestDate = 'กรุณาระบุวันที่ขอ';
    if ((form.materials || []).length === 0) errs.materials = 'กรุณาเลือกวัสดุที่ขออย่างน้อย 1 รายการ';
    if (!form.reason.trim()) errs.reason = 'กรุณาระบุเหตุผลการขอ';
    if (form.proxyName.trim() && !form.proxyRelation) errs.proxyRelation = 'ระบุผู้ขอแทนแล้ว กรุณาระบุความเกี่ยวข้อง';
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    const { saved, isNew } = saveSwRequester({
      id: form.id || undefined,
      hn: form.hn,
      name: form.name,
      caseNo: form.caseNo,
      requestDate: form.requestDate,
      proxyName: form.proxyName.trim(),
      proxyRelation: form.proxyRelation,
      phone: form.phone.trim(),
      materials: form.materials,
      reason: form.reason.trim(),
      status: form.status,
    });
    setTick((t) => t + 1);
    closeForm();
    setBanner({
      tone: 'brand',
      text: isNew
        ? `บันทึกคำขอวัสดุสำเร็จ — ออกเลขทะเบียนผู้ขอ ${saved.requestNo} ให้ ${saved.name} แล้ว`
        : `บันทึกการแก้ไขคำขอ ${saved.requestNo} แล้ว`,
    });
  };

  /* ── ยกเลิก / เปิดใช้งาน ───────────────────────────────────────── */
  const openCancel = (row) => {
    if (!canWrite) return;
    setCancelReason('');
    setCancelError('');
    setCancelTarget(row);
  };
  const confirmCancel = () => {
    if (!cancelReason.trim()) {
      setCancelError('กรุณาระบุเหตุผลการยกเลิกคำขอ');
      return;
    }
    cancelSwRequester(cancelTarget.id, cancelReason.trim());
    setCancelTarget(null);
    setTick((t) => t + 1);
  };
  const reactivate = (row) => {
    if (!canWrite) return;
    reactivateSwRequester(row.id);
    setTick((t) => t + 1);
  };

  /* ── การพิจารณาคำขอ ───────────────────────────────────────────── */
  const openDecision = (row) => {
    if (!canWrite) return;
    setDecisionStatus('approved');
    setDecisionNote('');
    setDecisionTarget(row);
  };
  const confirmDecision = () => {
    setSwRequesterDecision(decisionTarget.id, decisionStatus, decisionNote.trim());
    setDecisionTarget(null);
    setTick((t) => t + 1);
  };

  /* ── การประเมิน Barthel ADL ────────────────────────────────────── */
  const openAssess = (row) => {
    setAssessment({ ...EMPTY_ASSESSMENT, answers: {}, extras: {}, date: todayIso(), assessor: SW_WORKERS[0] });
    setAssessError('');
    setNewExtraLabel('');
    setAssessTarget(row);
  };

  const setAnswer = (key, score) => {
    if (!canWrite) return;
    setAssessment((a) => ({ ...a, answers: { ...a.answers, [key]: score } }));
    setAssessError('');
  };

  const toggleExtra = (key) => {
    setAssessment((a) => ({ ...a, extras: { ...a.extras, [key]: !a.extras[key] } }));
  };

  const addExtraItem = () => {
    if (!newExtraLabel.trim()) return;
    setExtraItems((list) => [...list, { key: `extra-${Date.now()}`, label: newExtraLabel.trim(), custom: true }]);
    setNewExtraLabel('');
  };

  const barthelComplete = isBarthelComplete(assessment.answers);
  const barthelScore = scoreBarthel(assessment.answers);
  const barthelInterp = interpretBarthel(barthelScore);
  const answeredCount = SW_BARTHEL_ITEMS.filter((i) => assessment.answers[i.key] !== undefined).length;

  const commitAssessment = () => {
    if (!canWrite) return;
    if (!barthelComplete) {
      setAssessError(`ต้องประเมินให้ครบทั้ง ${SW_BARTHEL_ITEMS.length} ข้อก่อนจึงจะคำนวณคะแนนได้ (ตอบแล้ว ${answeredCount} ข้อ)`);
      return;
    }
    if (!assessment.assessor) {
      setAssessError('กรุณาระบุผู้ประเมิน');
      return;
    }
    saveSwAssessment(assessTarget.id, {
      date: assessment.date || todayIso(),
      answers: assessment.answers,
      extras: assessment.extras,
      score: barthelScore,
      assessor: assessment.assessor,
      note: assessment.note.trim(),
    });
    setTick((t) => t + 1);
    setAssessTarget(null);
    setBanner({
      tone: 'brand',
      text: `บันทึกผลประเมิน Barthel ADL ของ ${assessTarget.name} แล้ว — ${barthelScore}/${SW_BARTHEL_MAX} คะแนน (${barthelInterp.label})`,
    });
  };

  const targetAssessments = useMemo(
    () => (assessTarget ? getSwAssessments(assessTarget.id) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [assessTarget, tick],
  );

  const latestAssessment = (row) => {
    const list = getSwAssessments(row.id);
    return list.length > 0 ? list[list.length - 1] : null;
  };

  /* ── columns ───────────────────────────────────────────────────── */
  const dim = (r) => (r.status === 'cancelled' ? struck : undefined);

  const columns = useMemo(() => ([
    { key: 'requestNo', label: 'เลขทะเบียนผู้ขอ', render: (r) => <span style={r.status === 'cancelled' ? struck : { fontWeight: 'var(--type-weight-medium)' }}>{r.requestNo}</span> },
    { key: 'requestDate', label: 'วันที่ขอ', render: (r) => <span style={dim(r)}>{formatSwDate(r.requestDate)}</span> },
    { key: 'hn', label: 'HN', render: (r) => <span style={dim(r)}>{r.hn}</span> },
    { key: 'name', label: 'ชื่อผู้ขอ', flex: true, minWidth: 170, render: (r) => <span style={dim(r)}>{r.name}</span> },
    { key: 'caseNo', label: 'เลข CASE', render: (r) => <span style={dim(r)}>{r.caseNo || '—'}</span> },
    {
      key: 'proxy', label: 'ผู้ขอแทน / ผู้ดูแล', flex: true, minWidth: 190,
      render: (r) => <span style={dim(r)}>{r.proxyName ? `${r.proxyName} (${r.proxyRelation})` : 'ผู้รับบริการมาเอง'}</span>,
    },
    {
      key: 'materials', label: 'วัสดุที่ขอ', flex: true, minWidth: 260,
      render: (r) => (
        <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-100, 4px)' }}>
          {(r.materials || []).map((code) => (
            <ColorfulBadge key={code} style={r.status === 'cancelled' ? 'grey' : 'blue'} size='small' hierarchy='secondary'>
              {findSwMaterial(code)?.name || code}
            </ColorfulBadge>
          ))}
          {(r.materials || []).length === 0 && '—'}
        </div>
      ),
    },
    {
      key: 'adl', label: 'ผลประเมิน ADL ล่าสุด',
      render: (r) => {
        const a = latestAssessment(r);
        if (!a) return <ColorfulBadge style='grey' size='small' hierarchy='secondary'>ยังไม่ประเมิน</ColorfulBadge>;
        const it = interpretBarthel(a.score);
        return (
          <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
            <ColorfulBadge style={it.style} size='small' hierarchy='secondary' width='hug' maxWidth={420}>
              {`${a.score}/${SW_BARTHEL_MAX} — ${it.label}`}
            </ColorfulBadge>
            <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
              {formatSwDate(a.date)} · {a.assessor}
            </span>
          </div>
        );
      },
    },
    {
      key: 'status', label: 'สถานะคำขอ',
      render: (r) => {
        if (r.status === 'cancelled') {
          return (
            <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
              <ColorfulBadge style='red' size='small' hierarchy='secondary'>ยกเลิกคำขอ</ColorfulBadge>
              {r.cancellation && (
                <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
                  โดย {r.cancellation.by} · {formatSwDateTime(r.cancellation.at)}
                  <br />เหตุผล: {r.cancellation.reason}
                </span>
              )}
            </div>
          );
        }
        const s = resolveSwRequestStatus(r.status);
        return (
          <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
            <ColorfulBadge style={s.style} size='small' hierarchy='secondary'>{s.label}</ColorfulBadge>
            {r.decisionNote && (
              <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
                {r.decisionNote}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'audit', label: 'ผู้บันทึก', sortable: false,
      render: (r) => (
        <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-secondary, #636B72)' }}>
          {r.recordedBy}<br />{formatSwDateTime(r.recordedAt)}
          {(r.editLog || []).length > 0 && (
            <><br />แก้ไขล่าสุด {r.editLog[r.editLog.length - 1].by} · {formatSwDateTime(r.editLog[r.editLog.length - 1].at)}</>
          )}
        </span>
      ),
    },
    {
      key: 'actions', label: 'การดำเนินการ', sortable: false,
      render: (r) => (
        <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          <NeutralSubdueButton size='sm' leadingIcon='assignment' onClick={(e) => { e.stopPropagation(); openAssess(r); }}>
            ประเมิน ADL
          </NeutralSubdueButton>
          {!canWrite ? (
            <ColorfulBadge style='grey' size='small' hierarchy='secondary'>สิทธิไม่เพียงพอ</ColorfulBadge>
          ) : r.status === 'cancelled' ? (
            <BrandSubdueButton variant='outline' size='sm' leadingIcon='restart_alt' onClick={(e) => { e.stopPropagation(); reactivate(r); }}>
              เปิดใช้งาน
            </BrandSubdueButton>
          ) : (
            <>
              <BrandSubdueButton variant='outline' size='sm' leadingIcon='edit' onClick={(e) => { e.stopPropagation(); openEdit(r); }}>
                แก้ไข
              </BrandSubdueButton>
              {r.status === 'pending' && (
                <BrandSubdueButton variant='outline' size='sm' leadingIcon='gavel' onClick={(e) => { e.stopPropagation(); openDecision(r); }}>
                  พิจารณา
                </BrandSubdueButton>
              )}
              {r.status === 'approved' && (
                <BrandSubdueButton
                  variant='fill' size='sm' leadingIcon='local_shipping'
                  onClick={(e) => {
                    e.stopPropagation();
                    history.push({
                      pathname: '/clinic/social-work/supplies',
                      state: { tab: 'issue', hn: r.hn, materialCode: (r.materials || [])[0] },
                    });
                  }}
                >
                  ไปจ่ายวัสดุ
                </BrandSubdueButton>
              )}
              <DangerSubdueButton size='sm' leadingIcon='block' onClick={(e) => { e.stopPropagation(); openCancel(r); }}>
                ยกเลิก
              </DangerSubdueButton>
            </>
          )}
        </div>
      ),
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ]), [tick, canWrite]);

  const filtersActive = search.trim() !== '' || statusFilter !== 'all';
  const clearFilters = () => { setSearch(''); setStatusFilter('all'); setPage(1); };

  /* กราฟแนวโน้มคะแนน ADL ของผู้ขอที่กำลังประเมิน */
  const trendPoints = targetAssessments.map((a) => ({ date: a.date, score: a.score }));

  return (
    <QueuePageShell
      activeKey='treat'
      breadcrumb={breadcrumb}
      title='ทะเบียนผู้ขอวัสดุและการประเมินผู้ขอ'
      onBack={() => history.push('/clinic/social-work')}
      backLabel='กลับหน้าคิว'
      actions={(
        <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-300, 12px)' }}>
          <NeutralSubdueButton
            size='sm'
            leadingIcon={canWrite ? 'lock_open' : 'lock'}
            onClick={toggleRightsDemo}
            title='สลับสิทธิงานสังคมสงเคราะห์ (สำหรับทดสอบ)'
          >
            {canWrite ? 'สิทธิ: เข้าถึงได้' : 'สิทธิ: ถูกจำกัด'}
          </NeutralSubdueButton>
          <BrandSubdueButton variant='outline' leadingIcon='inventory_2' onClick={() => history.push('/clinic/social-work/supplies')}>
            รับ-จ่ายวัสดุ
          </BrandSubdueButton>
          <BrandButton leadingIcon='person_add' onClick={openCreate} disabled={!canWrite}>
            ลงทะเบียนผู้ขอวัสดุ
          </BrandButton>
        </div>
      )}
      summaryCards={summaryCards}
    >
      {/* ── ยกเลิกคำขอ ────────────────────────────────────────────── */}
      <Popup
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        title='ยกเลิกคำขอวัสดุ'
        subtitle={cancelTarget ? `${cancelTarget.requestNo} · ${cancelTarget.name} · HN ${cancelTarget.hn}` : ''}
        tertiaryAction={{ label: 'ปิด', onClick: () => setCancelTarget(null) }}
        primaryAction={{ label: 'ยืนยันยกเลิกคำขอ', onClick: confirmCancel, tone: 'danger' }}
      >
        <Textarea
          label='เหตุผลการยกเลิก'
          required
          value={cancelReason}
          onChange={(v) => { setCancelReason(v); if (v.trim()) setCancelError(''); }}
          error={cancelError || undefined}
          placeholder='เช่น ผู้ขอแจ้งไม่ต้องการแล้ว / บันทึกซ้ำ / ได้รับความช่วยเหลือจากหน่วยงานอื่นแล้ว'
        />
      </Popup>

      {/* ── พิจารณาคำขอ ───────────────────────────────────────────── */}
      <Popup
        open={!!decisionTarget}
        onClose={() => setDecisionTarget(null)}
        title='พิจารณาคำขอวัสดุ'
        subtitle={decisionTarget ? `${decisionTarget.requestNo} · ${decisionTarget.name}` : ''}
        tertiaryAction={{ label: 'ปิด', onClick: () => setDecisionTarget(null) }}
        primaryAction={{ label: 'บันทึกผลการพิจารณา', onClick: confirmDecision }}
      >
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-300, 12px)' }}>
          {decisionTarget && !latestAssessment(decisionTarget) && (
            <SwBanner tone='warning' icon='assignment_late'>
              ผู้ขอรายนี้ยังไม่มีผลประเมิน ADL — ควรประเมินก่อนอนุมัติ เพื่อให้เลือกวัสดุได้เหมาะกับระดับการพึ่งพา
            </SwBanner>
          )}
          <SwField label='ผลการพิจารณา' required>
            <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
              <SelectableTag label='อนุมัติ' size='md' selected={decisionStatus === 'approved'} onClick={() => setDecisionStatus('approved')} />
              <SelectableTag label='ไม่อนุมัติ' size='md' selected={decisionStatus === 'rejected'} onClick={() => setDecisionStatus('rejected')} />
              <SelectableTag label='รับของแล้ว' size='md' selected={decisionStatus === 'received'} onClick={() => setDecisionStatus('received')} />
            </div>
          </SwField>
          <Textarea
            label='หมายเหตุการพิจารณา'
            value={decisionNote}
            onChange={setDecisionNote}
            placeholder='เช่น อนุมัติจ่ายผ้าอ้อม 8 ห่อ/เดือน เป็นเวลา 3 เดือน'
          />
        </div>
      </Popup>

      {/* ── การประเมินผู้ขอ (Barthel ADL) ─────────────────────────── */}
      <Popup
        open={!!assessTarget}
        onClose={() => setAssessTarget(null)}
        title='การประเมินผู้ขอ — Barthel ADL Index'
        subtitle={assessTarget ? `${assessTarget.requestNo} · ${assessTarget.name} · HN ${assessTarget.hn}` : ''}
        tertiaryAction={{ label: 'ปิด', onClick: () => setAssessTarget(null) }}
        primaryAction={canWrite ? { label: 'คำนวณคะแนนและบันทึกผล', onClick: commitAssessment } : undefined}
      >
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400, 16px)' }}>
          {!canWrite && (
            <SwBanner tone='warning' icon='lock'>
              บัญชีนี้ไม่มีสิทธิงานสังคมสงเคราะห์ — ดูผลประเมินย้อนหลังได้ แต่บันทึกผลใหม่ไม่ได้
            </SwBanner>
          )}

          <div className='flex items-start w-full flex-wrap' style={{ gap: 'var(--dim-space-400, 16px)' }}>
            <SwField label='วันที่ประเมิน' required>
              <DatePicker
                showLabel={false}
                disabled={!canWrite}
                value={assessment.date ? new Date(assessment.date) : null}
                onChange={(d) => setAssessment((a) => ({ ...a, date: d ? d.toISOString().slice(0, 10) : '' }))}
                placeholder='เลือกวันที่'
              />
            </SwField>
            <SwField label='ผู้ประเมิน' required>
              <Select
                showLabel={false} searchable size='lg'
                disabled={!canWrite}
                value={assessment.assessor}
                onChange={(v) => { setAssessment((a) => ({ ...a, assessor: v })); setAssessError(''); }}
                options={SW_WORKERS.map((w) => ({ value: w, label: w }))}
                placeholder='เลือกผู้ประเมิน'
              />
            </SwField>
          </div>

          {/* 10 หัวข้อ */}
          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
            <SwSectionHeader
              icon='checklist'
              aside={(
                <ColorfulBadge style={barthelComplete ? barthelInterp.style : 'grey'} size='small' hierarchy='secondary' width='hug' maxWidth={520}>
                  {barthelComplete
                    ? `คะแนนรวม ${barthelScore}/${SW_BARTHEL_MAX} — ${barthelInterp.label}`
                    : `ตอบแล้ว ${answeredCount}/${SW_BARTHEL_ITEMS.length} ข้อ — ยังคำนวณคะแนนไม่ได้`}
                </ColorfulBadge>
              )}
            >
              แบบประเมินความสามารถในการทำกิจวัตรประจำวัน (Barthel ADL)
            </SwSectionHeader>

            {SW_BARTHEL_ITEMS.map((item) => (
              <div key={item.key} className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                <span style={{ fontSize: 'var(--type-size-sm)', fontWeight: 'var(--type-weight-medium)', color: 'var(--text-content-default, #363B3F)' }}>
                  {item.label}
                </span>
                <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                  {item.options.map((opt) => (
                    <SelectableTag
                      key={`${item.key}-${opt.score}`}
                      label={`${opt.score} — ${opt.label}`}
                      size='md'
                      selected={assessment.answers[item.key] === opt.score}
                      onClick={() => setAnswer(item.key, opt.score)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* แบบประเมินเพิ่มเติมตามที่ผู้ใช้งานกำหนด */}
          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
            <SwSectionHeader icon='playlist_add_check'>แบบประเมินเพิ่มเติม (ตามที่ผู้ใช้งานกำหนด)</SwSectionHeader>
            {extraItems.map((x) => (
              <Checkbox
                key={x.key}
                checked={!!assessment.extras[x.key]}
                disabled={!canWrite}
                onChange={() => toggleExtra(x.key)}
                label={x.label}
                badge={x.custom ? <ColorfulBadge style='teal' size='small' hierarchy='secondary'>เพิ่มโดยผู้ใช้งาน</ColorfulBadge> : undefined}
              />
            ))}
            <div className='flex items-end w-full flex-wrap' style={{ gap: 'var(--dim-space-300, 12px)' }}>
              <SwField label='เพิ่มหัวข้อประเมินใหม่'>
                <InputField
                  disabled={!canWrite}
                  value={newExtraLabel}
                  onChange={setNewExtraLabel}
                  placeholder='เช่น ผู้ดูแลผ่านการอบรมการดูแลผู้ป่วยติดเตียง'
                />
              </SwField>
              <BrandDashedAddButton disabled={!canWrite || !newExtraLabel.trim()} onClick={addExtraItem}>
                เพิ่มหัวข้อ
              </BrandDashedAddButton>
            </div>
          </div>

          <SuggestibleTextarea
            label='บันทึกเพิ่มเติมของผู้ประเมิน'
            voice
            disabled={!canWrite}
            value={assessment.note}
            onChange={(e) => setAssessment((a) => ({ ...a, note: e.target.value }))}
            suggestions={[
              'ผู้รับบริการต้องการผู้ช่วยในการเคลื่อนย้ายตลอดเวลา',
              'ผู้ดูแลหลักเป็นผู้สูงอายุ ควรจัดหาอุปกรณ์ช่วยเคลื่อนย้าย',
              'ผู้รับบริการช่วยเหลือตนเองได้ดีขึ้นหลังได้รับกายอุปกรณ์',
              'มีความเสี่ยงต่อแผลกดทับสูง ควรได้รับที่นอนลม',
            ]}
            minChars={3}
            rows={2}
            minHeight={64}
            placeholder='ข้อสังเกตจากการประเมิน'
          />

          {assessError && <SwBanner tone='danger' icon='error'>{assessError}</SwBanner>}

          {/* ประวัติการประเมินของผู้ขอรายนี้ */}
          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
            <SwSectionHeader icon='monitoring'>ประวัติการประเมินของผู้ขอรายนี้</SwSectionHeader>
            {trendPoints.length >= 2 && (
              <LineChart
                months={trendPoints.map((p) => formatSwDate(p.date))}
                series={[{
                  label: 'คะแนน Barthel ADL',
                  color: 'var(--surface-colorfulbadge-teal-bold, #24A899)',
                  values: trendPoints.map((p) => p.score),
                }]}
                height={150}
              />
            )}
            <Table
              columns={[
                { key: 'date', label: 'วันที่ประเมิน', render: (r) => formatSwDate(r.date) },
                { key: 'score', label: 'คะแนน', align: 'right', render: (r) => `${r.score}/${SW_BARTHEL_MAX}` },
                {
                  key: 'interp', label: 'แปลผล', flex: true, minWidth: 280, sortable: false,
                  render: (r) => {
                    const it = interpretBarthel(r.score);
                    return <ColorfulBadge style={it.style} size='small' hierarchy='secondary' width='hug' maxWidth={420}>{it.label}</ColorfulBadge>;
                  },
                },
                { key: 'assessor', label: 'ผู้ประเมิน', flex: true, minWidth: 180 },
                { key: 'note', label: 'หมายเหตุ', flex: true, minWidth: 220, render: (r) => r.note || '—' },
              ]}
              rows={targetAssessments.map((a, i) => ({ ...a, _rk: a.id || `as-${i}` }))}
              rowKey={(r) => r._rk}
              emptyMessage='ยังไม่เคยประเมินผู้ขอรายนี้ — ประเมินให้ครบ 10 ข้อแล้วกดคำนวณคะแนน'
            />
          </div>
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
        {!canWrite && (
          <SwBanner tone='warning' icon='lock'>
            บัญชีนี้ไม่มีสิทธิงานสังคมสงเคราะห์ — ดูทะเบียนผู้ขอวัสดุได้ แต่บันทึก แก้ไข พิจารณา หรือยกเลิกไม่ได้
          </SwBanner>
        )}

        {banner && (
          <SwBanner tone={banner.tone} icon='check-circle' onClose={() => setBanner(null)}>{banner.text}</SwBanner>
        )}

        {/* ── Create / Edit form ──────────────────────────────────── */}
        {editing !== null && (
          <section
            className='w-full flex flex-col'
            style={{
              background: 'var(--surface-card-100, #FFFFFF)',
              borderRadius: 'var(--dim-radius-500, 16px)',
              border: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary, #E2F3EB)',
              boxShadow: 'var(--shadow-card-strong)',
              paddingTop: 'var(--dim-space-600, 24px)',
              paddingBottom: 'var(--dim-space-600, 24px)',
              paddingLeft: 'var(--dim-space-600, 24px)',
              paddingRight: 'var(--dim-space-600, 24px)',
              gap: 'var(--dim-space-600, 24px)',
            }}
          >
            <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
              <h1 className='text-base font-bold' style={{ color: 'var(--text-content-default, #363B3F)' }}>
                {editing === 'new' ? 'ลงทะเบียนผู้ขอวัสดุใหม่' : `แก้ไขคำขอ ${form.requestNo}`}
              </h1>
              <div className='flex-1' />
              <NeutralSubdueButton size='sm' leadingIcon='close' onClick={closeForm}>ปิดแบบฟอร์ม</NeutralSubdueButton>
            </div>

            <div className='flex items-start w-full flex-wrap' style={{ gap: 'var(--dim-space-400, 16px)' }}>
              <SwField
                label='เลขทะเบียนผู้ขอ'
                hint={form.requestNo ? 'ออกครั้งเดียวและไม่เปลี่ยนอีก' : 'ระบบจะออกเลขให้อัตโนมัติเมื่อบันทึกสำเร็จ'}
              >
                <InputField value={form.requestNo} onChange={() => {}} disabled placeholder='ออกให้อัตโนมัติเมื่อบันทึก' />
              </SwField>
              <SwField label='วันที่ขอ' required hint={errors.requestDate} hintTone='error'>
                <DatePicker
                  showLabel={false}
                  disabled={!canWrite}
                  value={form.requestDate ? new Date(form.requestDate) : null}
                  onChange={(d) => setField('requestDate')(d ? d.toISOString().slice(0, 10) : '')}
                  placeholder='เลือกวันที่ขอ'
                />
              </SwField>
              <SwField label='เลขที่สังคมสงเคราะห์ (เลข CASE)' hint='ดึงจากทะเบียนผู้รับบริการโดยอัตโนมัติ'>
                <InputField value={form.caseNo || '—'} onChange={() => {}} disabled />
              </SwField>
            </div>

            <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
              <SwSectionHeader icon='person'>ผู้ขอวัสดุ</SwSectionHeader>
              {editing === 'new' && (
                <SwField label='ผู้ขอ (HN / ชื่อ)' required hint={errors.hn} hintTone='error'>
                  <Select
                    showLabel={false} searchable size='lg'
                    value={form.hn}
                    onChange={pickPatient}
                    options={patientOptions}
                    placeholder='ค้นหา HN / ชื่อผู้รับบริการ'
                    error={errors.hn ? ' ' : undefined}
                  />
                </SwField>
              )}
              {form.hn && profile && <PatientCard patient={profile} title='ข้อมูลผู้ขอ' />}
              <div className='flex items-start w-full flex-wrap' style={{ gap: 'var(--dim-space-400, 16px)' }}>
                <SwField label='ผู้ขอแทน / ผู้ดูแล'>
                  <InputField disabled={!canWrite} value={form.proxyName} onChange={setField('proxyName')} placeholder='เว้นว่างหากผู้รับบริการมาเอง' />
                </SwField>
                <SwField label='ความเกี่ยวข้อง' hint={errors.proxyRelation} hintTone='error'>
                  <Select
                    showLabel={false} searchable={false} size='lg'
                    disabled={!canWrite}
                    value={form.proxyRelation}
                    onChange={setField('proxyRelation')}
                    options={SW_INFORMANT_RELATIONS.map((r) => ({ value: r.label, label: r.label }))}
                    placeholder='เลือกความเกี่ยวข้อง'
                    error={errors.proxyRelation ? ' ' : undefined}
                  />
                </SwField>
                <SwField label='โทรศัพท์ติดต่อ'>
                  <InputField disabled={!canWrite} value={form.phone} onChange={setField('phone')} placeholder='เช่น 081-234-5678' />
                </SwField>
              </div>
            </div>

            <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
              <SwSectionHeader icon='inventory_2'>วัสดุที่ขอและเหตุผล</SwSectionHeader>
              <SwField label='วัสดุที่ขอ (เลือกได้หลายรายการ)' required hint={errors.materials} hintTone='error' grow={false}>
                <Select
                  showLabel={false} searchable size='lg'
                  multiple
                  disabled={!canWrite}
                  value={form.materials}
                  onChange={setField('materials')}
                  options={SW_MATERIAL_OPTIONS}
                  placeholder='เลือกวัสดุที่ขอ'
                  error={errors.materials ? ' ' : undefined}
                />
              </SwField>
              <SwField label='เหตุผลการขอ' required hint={errors.reason} hintTone='error' grow={false}>
                <SuggestibleTextarea
                  voice
                  disabled={!canWrite}
                  value={form.reason}
                  onChange={(e) => setField('reason')(e.target.value)}
                  suggestions={SW_REQUEST_REASONS}
                  minChars={3}
                  placeholder='เหตุผลและความจำเป็นในการขอรับวัสดุ'
                />
              </SwField>
              <SwField label='สถานะคำขอ' grow={false}>
                <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                  {SW_REQUEST_STATUSES.map((s) => (
                    <SelectableTag
                      key={s.value}
                      label={s.label}
                      size='md'
                      selected={form.status === s.value}
                      onClick={() => { if (canWrite) setField('status')(s.value); }}
                    />
                  ))}
                </div>
              </SwField>
            </div>

            <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
              <div className='flex-1' />
              <NeutralSubdueButton size='lg' onClick={closeForm}>ยกเลิก</NeutralSubdueButton>
              <BrandButton size='lg' leadingIcon='save' onClick={save} disabled={!canWrite}>
                {editing === 'new' ? 'บันทึกและออกเลขทะเบียนผู้ขอ' : 'บันทึกการแก้ไข'}
              </BrandButton>
            </div>
          </section>
        )}

        {/* ── List ────────────────────────────────────────────────── */}
        <section
          className='w-full flex flex-col'
          style={{
            background: 'var(--surface-card-100, #FFFFFF)',
            borderRadius: 'var(--dim-radius-500, 16px)',
            border: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary, #E2F3EB)',
            boxShadow: 'var(--shadow-card-strong)',
            paddingTop: 'var(--dim-space-600, 24px)',
            paddingBottom: 'var(--dim-space-600, 24px)',
            paddingLeft: 'var(--dim-space-600, 24px)',
            paddingRight: 'var(--dim-space-600, 24px)',
            gap: 'var(--dim-space-400, 16px)',
          }}
        >
          <div className='flex flex-wrap items-center w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
            <SwInlineSearch
              value={search}
              onChange={(v) => { setSearch(v); setPage(1); }}
              placeholder='ค้นหาเลขทะเบียนผู้ขอ / HN / ชื่อ / ผู้ขอแทน'
            />
            <Select
              showLabel={false} searchable={false} size='md'
              value={statusFilter} onChange={(v) => { setStatusFilter(v); setPage(1); }}
              options={[
                { value: 'all', label: 'ทุกสถานะ' },
                ...SW_REQUEST_STATUSES.map((s) => ({ value: s.value, label: s.label })),
                { value: 'cancelled', label: 'ยกเลิกแล้ว' },
              ]}
              placeholder='สถานะคำขอ'
            />
            {filtersActive && (
              <NeutralSubdueButton variant='outline' size='sm' onClick={clearFilters}>ล้างตัวกรอง</NeutralSubdueButton>
            )}
          </div>

          {filtered.length === 0 ? (
            <SwEmptyHint icon={filtersActive ? 'search_off' : 'assignment_ind'}>
              {filtersActive
                ? `ไม่พบคำขอที่ตรงกับ${search.trim() ? ` "${search.trim()}"` : 'ตัวกรองที่เลือก'} — ลองล้างตัวกรอง`
                : 'ยังไม่มีทะเบียนผู้ขอวัสดุ — กด "ลงทะเบียนผู้ขอวัสดุ" เพื่อเริ่มบันทึก'}
            </SwEmptyHint>
          ) : (
            <Table
              columns={columns}
              rows={pageRows}
              rowKey={(r) => r.id}
              onRowClick={(r) => (r.status === 'cancelled' ? undefined : openEdit(r))}
              emptyMessage='ไม่มีคำขอ'
            />
          )}

          <SwPagerBar total={filtered.length} page={page} pageSize={PAGE_SIZE}>
            <Pagination currentPage={page} pageCount={totalPages} onPageChange={setPage} />
          </SwPagerBar>
        </section>

        <span className='inline-flex items-center' style={{ gap: 'var(--dim-space-100, 4px)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
          <Icon name='info' size={14} />
          คะแนน Barthel ADL เต็ม {SW_BARTHEL_MAX} คะแนน · แปลผลอัตโนมัติตามช่วง 0–20 / 25–45 / 50–70 / 75–95 / 100 ตามคู่มือระบบเดิม
        </span>
      </div>
    </QueuePageShell>
  );
};

export default SocialWorkRequesterRegistryPage;
