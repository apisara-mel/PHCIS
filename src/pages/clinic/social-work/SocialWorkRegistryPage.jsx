import React, { useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import SearchResultCount from '@/components/search/SearchResultCount';
import Icon from '@/components/icons/Icon';
import InputField from '@/components/forms/InputField';
import Select from '@/components/forms/Select';
import DatePicker from '@/components/forms/DatePicker';
import Textarea from '@/components/forms/Textarea';
import SelectableTag from '@/components/forms/SelectableTag';
import BrandButton from '@/components/button/BrandButton';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import DangerSubdueButton from '@/components/button/DangerSubdueButton';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import Table from '@/components/table/Table';
import Pagination from '@/components/pagination/Pagination';
import Popup from '@/components/popup/Popup';
import PatientCard from '@/components/card/PatientCard';
import {
  SwSectionHeader, SwField, SwBanner, SwConfidentialMask, SwInlineSearch, SwPagerBar, toLocalIso,
} from '@/pages/clinic/social-work/SocialWorkShared';
import { getPatientByHN } from '@/data/patientProfiles';
import {
  SW_MASKED,
  SW_WORKERS,
  SW_CLIENT_TYPES,
  SW_INTAKE_CHANNELS,
  SW_TARGET_GROUPS,
  SW_INFORMANT_RELATIONS,
  SW_WELFARE_CARD_STATUS,
  resolveSwWelfareCard,
  swWelfareCardBadge,
  isSwCaseNoTaken,
  SW_PROBLEM_OPTIONS,
  resolveSwClientType,
  resolveSwIntakeChannel,
  resolveSwTargetGroup,
  resolveSwInformantRelation,
  resolveSwProblemLabel,
  isSwProblemSensitive,
  getSwRegistryRows,
  saveSwRegistration,
  cancelSwRegistration,
  reactivateSwRegistration,
  getSwQueueRows,
  SW_SCHEDULED_TODAY,
  hasSocialWorkRights,
  setSocialWorkRights,
  logSwPrint,
  getSwPrintLog,
  formatSwDate,
  formatSwDateTime,
  todayIso,
} from '@/data/socialWorkClinic';

/* SocialWorkRegistryPage — ทะเบียนผู้รับบริการสังคมสงเคราะห์ (TOR 1.10.11.1).

   Playbook §3 registry pattern (PharmacyRegistryPage / MentalHealthRegistry
   Page): list + create/edit on ONE page — the form expands above the list.
   All 4 TOR verbs live here:
     แสดง   — list rows + read state of the form (+ พิมพ์ทะเบียน)
     บันทึก — create: เลขที่สังคมสงเคราะห์ (เลข CASE) auto-runs ONLY on a
              successful save; the field stays read-only/blank before that
              and never changes on later edits
     แก้ไข  — row action reopens the same form prefilled + edit-history line
     ยกเลิก — reason popup + audit; cancelled rows stay visible greyed with
              ยกเลิกโดย/เมื่อ/เหตุผล + เปิดใช้งาน reactivate

   ข้อมูลลับ §1.4.2 — ที่อยู่ · ผู้ให้ข้อมูล · ปัญหาแรกรับที่เป็นรหัสลับ
   ถูกปกปิดเมื่อผู้ใช้ไม่มีสิทธิงานสังคมสงเคราะห์ และทุกการเขียนถูกปิด. */

const breadcrumb = ['บันทึกการรักษา', 'งานสังคมสงเคราะห์', 'ทะเบียนผู้รับบริการ'];
const PAGE_SIZE = 10;

const EMPTY_FORM = {
  id: '',
  caseNo: '',
  hn: '',
  name: '',
  receivedDate: todayIso(),
  clientType: 'new',
  intakeChannel: '',
  targetGroup: '',
  firstProblem: '',
  informant: '',
  informantRelation: '',
  informantPhone: '',
  currentAddress: '',
  houseRegAddress: '',
  sameAddress: false,
  owner: '',
  /* สถานะยากจน/รายได้น้อย อ้างอิงบัตรสวัสดิการแห่งรัฐ (มติ คทง.10 ครั้งที่ 3 ข้อ 16) */
  welfareCard: '',
  /* ปลดล็อกช่องเลขที่สังคมสงเคราะห์เพื่อแก้เลขที่บันทึกผิด (มติข้อ 13) */
  caseNoEdit: false,
  caseNoEditReason: '',
};

const SocialWorkRegistryPage = () => {
  const history = useHistory();
  const [tick, setTick] = useState(0);
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState('all');
  const [channelFilter, setChannelFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);

  /* null = list only · 'new' = create · row id = edit that row */
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [savedBanner, setSavedBanner] = useState(null);

  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState('');
  const [printTarget, setPrintTarget] = useState(null);
  const [printTick, setPrintTick] = useState(0);
  const [, setRightsTick] = useState(0);

  const canRead = hasSocialWorkRights();
  const toggleRightsDemo = () => {
    setSocialWorkRights(!hasSocialWorkRights());
    setRightsTick((t) => t + 1);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const rows = useMemo(() => getSwRegistryRows(), [tick]);

  /* ผู้รับบริการที่เลือกได้ตอนลงทะเบียนใหม่ — คิว + นัดวันนี้ ที่ยังไม่มีทะเบียน */
  const patientOptions = useMemo(() => {
    const registeredHns = rows.filter((r) => r.status !== 'cancelled').map((r) => r.hn);
    const pool = [...getSwQueueRows(), ...SW_SCHEDULED_TODAY];
    const seen = new Set();
    return pool
      .filter((p) => !registeredHns.includes(p.hn))
      .filter((p) => (seen.has(p.hn) ? false : seen.add(p.hn)))
      .map((p) => ({ value: p.hn, label: `${p.name} · HN ${p.hn}` }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, tick]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (groupFilter !== 'all' && r.targetGroup !== groupFilter) return false;
      if (channelFilter !== 'all' && r.intakeChannel !== channelFilter) return false;
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (!q) return true;
      return [r.caseNo, r.hn, r.name, r.owner].some((f) => f && f.toLowerCase().includes(q));
    });
  }, [rows, search, groupFilter, channelFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const summaryCards = useMemo(() => ([
    { key: 'total', label: 'ทะเบียนทั้งหมด', value: rows.length, color: 'info', icon: 'contact_page' },
    { key: 'active', label: 'ใช้งาน', value: rows.filter((r) => r.status === 'active').length, color: 'positive', icon: 'check_circle' },
    { key: 'cancelled', label: 'ยกเลิกแล้ว', value: rows.filter((r) => r.status === 'cancelled').length, color: 'negative', icon: 'block' },
    { key: 'new', label: 'รายใหม่ปีนี้', value: rows.filter((r) => r.clientType === 'new').length, color: 'warning', icon: 'person_add' },
  ]), [rows]);

  /* ── form open / close ─────────────────────────────────────────── */
  const openCreate = () => {
    if (!canRead) return;
    setForm({ ...EMPTY_FORM, receivedDate: todayIso() });
    setErrors({});
    setSavedBanner(null);
    setEditing('new');
  };

  const openEdit = (row) => {
    setForm({
      id: row.id,
      caseNo: row.caseNo,
      hn: row.hn,
      name: row.name,
      receivedDate: row.receivedDate,
      clientType: row.clientType || 'old',
      intakeChannel: row.intakeChannel || '',
      targetGroup: row.targetGroup || '',
      firstProblem: row.firstProblem || '',
      informant: row.informant || '',
      informantRelation: row.informantRelation || '',
      informantPhone: row.informantPhone || '',
      currentAddress: row.currentAddress || '',
      houseRegAddress: row.houseRegAddress || '',
      sameAddress: !!row.currentAddress && row.currentAddress === row.houseRegAddress,
      owner: row.owner || '',
      welfareCard: row.welfareCard || '',
      caseNoEdit: false,
      caseNoEditReason: '',
      status: row.status,
    });
    setErrors({});
    setSavedBanner(null);
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
    const p = [...getSwQueueRows(), ...SW_SCHEDULED_TODAY].find((r) => r.hn === hn);
    setForm((f) => ({
      ...f,
      hn,
      name: p?.name || '',
      targetGroup: f.targetGroup || p?.targetGroup || '',
      intakeChannel: f.intakeChannel || p?.intakeChannel || '',
      clientType: p?.clientType || f.clientType,
      firstProblem: f.firstProblem || p?.primaryProblem || '',
    }));
    setErrors((e) => ({ ...e, hn: undefined }));
  };

  const profile = useMemo(() => (form.hn ? getPatientByHN(form.hn) : null), [form.hn]);
  const clinicRow = useMemo(
    () => (form.hn ? [...getSwQueueRows(), ...SW_SCHEDULED_TODAY].find((r) => r.hn === form.hn) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [form.hn, tick],
  );

  const save = () => {
    if (!canRead) return;
    const nextErrors = {};
    if (!form.hn) nextErrors.hn = 'กรุณาเลือกผู้รับบริการ';
    if (!form.receivedDate) nextErrors.receivedDate = 'กรุณาระบุวันที่รับเรื่อง';
    if (!form.intakeChannel) nextErrors.intakeChannel = 'กรุณาเลือกช่องทางการรับเรื่อง';
    if (!form.targetGroup) nextErrors.targetGroup = 'กรุณาเลือกกลุ่มเป้าหมาย';
    if (!form.firstProblem) nextErrors.firstProblem = 'กรุณาเลือกปัญหาแรกรับ';
    if (!form.informant.trim()) nextErrors.informant = 'กรุณาระบุผู้ให้ข้อมูล';
    if (!form.informantRelation) nextErrors.informantRelation = 'กรุณาระบุความเกี่ยวข้องของผู้ให้ข้อมูล';
    if (!form.currentAddress.trim()) nextErrors.currentAddress = 'กรุณาระบุที่อยู่ปัจจุบัน';
    if (!form.owner) nextErrors.owner = 'กรุณาเลือกนักสังคมสงเคราะห์เจ้าของเคส';
    /* แก้เลขที่สังคมสงเคราะห์ที่บันทึกผิด (มติข้อ 13) — ต้องไม่ซ้ำและต้องมีเหตุผล */
    if (form.caseNoEdit) {
      if (!form.caseNo.trim()) nextErrors.caseNo = 'กรุณาระบุเลขที่สังคมสงเคราะห์ที่ถูกต้อง';
      else if (isSwCaseNoTaken(form.caseNo.trim(), form.id)) nextErrors.caseNo = 'เลขที่นี้ถูกใช้กับทะเบียนรายอื่นแล้ว';
      if (!form.caseNoEditReason.trim()) nextErrors.caseNoEditReason = 'ระบุเหตุผลที่แก้ไขเลขที่สังคมสงเคราะห์';
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }
    const { saved: entry, isNew } = saveSwRegistration({
      id: form.id || undefined,
      hn: form.hn,
      name: form.name,
      caseNo: form.caseNo || undefined,
      caseNoEditReason: form.caseNoEdit ? form.caseNoEditReason.trim() : '',
      welfareCard: form.welfareCard,
      receivedDate: form.receivedDate,
      clientType: form.clientType,
      intakeChannel: form.intakeChannel,
      targetGroup: form.targetGroup,
      firstProblem: form.firstProblem,
      informant: form.informant.trim(),
      informantRelation: form.informantRelation,
      informantPhone: form.informantPhone.trim(),
      currentAddress: form.currentAddress.trim(),
      houseRegAddress: form.sameAddress ? form.currentAddress.trim() : form.houseRegAddress.trim(),
      owner: form.owner,
      status: form.status,
    });
    setTick((t) => t + 1);
    closeForm();
    setSavedBanner({ caseNo: entry.caseNo, name: entry.name, isNew });
  };

  /* ── ยกเลิก / เปิดใช้งาน ───────────────────────────────────────── */
  const openCancel = (row) => {
    if (!canRead) return;
    setCancelReason('');
    setCancelError('');
    setCancelTarget(row);
  };
  const confirmCancel = () => {
    if (!cancelReason.trim()) {
      setCancelError('กรุณาระบุเหตุผลการยกเลิกทะเบียน');
      return;
    }
    cancelSwRegistration(cancelTarget.id, cancelReason.trim());
    setCancelTarget(null);
    setTick((t) => t + 1);
  };
  const reactivate = (row) => {
    if (!canRead) return;
    reactivateSwRegistration(row.id);
    setTick((t) => t + 1);
  };

  /* ── พิมพ์ทะเบียน / ปกแบบ สส.2 (audit ผู้พิมพ์ + เวลา) ──────────── */
  const doPrint = (row, docType) => {
    logSwPrint(row.hn, docType);
    setPrintTick((t) => t + 1);
    setPrintTarget({ ...row, docType });
  };

  const printLog = useMemo(
    () => (printTarget ? getSwPrintLog(printTarget.hn) : []),
    [printTarget, printTick],
  );

  /* ── list columns ──────────────────────────────────────────────── */
  const cancelledText = { color: 'var(--text-content-tertiary, #858C92)', textDecoration: 'line-through' };
  const dim = (r) => (r.status === 'cancelled' ? cancelledText : undefined);

  const columns = useMemo(() => ([
    {
      key: 'caseNo', label: 'เลขที่สังคมสงเคราะห์',
      render: (r) => (
        <span style={r.status === 'cancelled' ? cancelledText : { fontWeight: 'var(--type-weight-medium)' }}>
          {r.caseNo}
        </span>
      ),
    },
    { key: 'hn', label: 'HN', render: (r) => <span style={dim(r)}>{r.hn}</span> },
    { key: 'name', label: 'ชื่อ-นามสกุล', flex: true, minWidth: 170, render: (r) => <span style={dim(r)}>{r.name}</span> },
    { key: 'receivedDate', label: 'วันที่รับเรื่อง', render: (r) => <span style={dim(r)}>{formatSwDate(r.receivedDate)}</span> },
    { key: 'clientType', label: 'ประเภทผู้ใช้บริการ', render: (r) => <span style={dim(r)}>{resolveSwClientType(r.clientType)}</span> },
    { key: 'intakeChannel', label: 'การรับเรื่อง', render: (r) => <span style={dim(r)}>{resolveSwIntakeChannel(r.intakeChannel)}</span> },
    { key: 'targetGroup', label: 'กลุ่มเป้าหมาย', render: (r) => <span style={dim(r)}>{resolveSwTargetGroup(r.targetGroup)}</span> },
    {
      key: 'firstProblem', label: 'ปัญหาแรกรับ', flex: true, minWidth: 220,
      render: (r) => (
        <span
          style={dim(r)}
          title={isSwProblemSensitive(r.firstProblem) && !canRead ? 'ข้อมูลลับ §1.4.2 — สิทธิไม่เพียงพอ' : undefined}
        >
          {resolveSwProblemLabel(r.firstProblem)}
        </span>
      ),
    },
    { key: 'owner', label: 'เจ้าของเคส', flex: true, minWidth: 180, render: (r) => <span style={dim(r)}>{r.owner || '—'}</span> },
    {
      key: 'welfareCard', label: 'สถานะรายได้น้อย',
      render: (r) => (r.welfareCard
        ? (
          <ColorfulBadge style={swWelfareCardBadge(r.welfareCard)} size='small' hierarchy='secondary'>
            {resolveSwWelfareCard(r.welfareCard)}
          </ColorfulBadge>
        )
        : <span style={{ color: 'var(--text-content-tertiary, #858C92)' }}>ยังไม่ระบุ</span>),
    },
    {
      key: 'status', label: 'สถานะ',
      render: (r) => (r.status === 'cancelled' ? (
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
          <ColorfulBadge style='red' size='small' hierarchy='secondary'>ยกเลิกทะเบียน</ColorfulBadge>
          {r.cancellation && (
            <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
              โดย {r.cancellation.by} · {formatSwDateTime(r.cancellation.at)}
              <br />เหตุผล: {r.cancellation.reason}
            </span>
          )}
        </div>
      ) : (
        <ColorfulBadge style='green' size='small' hierarchy='secondary'>ใช้งาน</ColorfulBadge>
      )),
    },
    {
      key: 'recordedBy', label: 'ผู้บันทึก', sortable: false,
      render: (r) => (
        <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-secondary, #636B72)' }}>
          {r.recordedBy}<br />{formatSwDateTime(r.recordedAt)}
          {(r.editLog || []).length > 0 && (
            <>
              <br />
              <span style={{ color: 'var(--text-content-tertiary, #858C92)' }}>
                แก้ไขล่าสุด {r.editLog[r.editLog.length - 1].by} · {formatSwDateTime(r.editLog[r.editLog.length - 1].at)}
              </span>
            </>
          )}
          {(r.caseNoHistory || []).length > 0 && (
            <>
              <br />
              <span style={{ color: 'var(--text-warning-default, #C2410C)' }}>
                {`แก้เลขที่ ${r.caseNoHistory[r.caseNoHistory.length - 1].from} → ${r.caseNoHistory[r.caseNoHistory.length - 1].to}`}
                <br />
                {`โดย ${r.caseNoHistory[r.caseNoHistory.length - 1].by} · ${formatSwDateTime(r.caseNoHistory[r.caseNoHistory.length - 1].at)}`}
                {r.caseNoHistory[r.caseNoHistory.length - 1].reason
                  ? ` · เหตุผล: ${r.caseNoHistory[r.caseNoHistory.length - 1].reason}`
                  : ''}
              </span>
            </>
          )}
        </span>
      ),
    },
    {
      key: 'actions', label: 'การดำเนินการ', sortable: false,
      render: (r) => (
        <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          {!canRead ? (
            <ColorfulBadge style='grey' size='small' hierarchy='secondary'>สิทธิไม่เพียงพอ</ColorfulBadge>
          ) : r.status === 'cancelled' ? (
            <BrandSubdueButton
              variant='outline' size='sm' leadingIcon='restart_alt'
              onClick={(e) => { e.stopPropagation(); reactivate(r); }}
            >
              เปิดใช้งาน
            </BrandSubdueButton>
          ) : (
            <>
              <BrandSubdueButton
                variant='outline' size='sm' leadingIcon='edit'
                onClick={(e) => { e.stopPropagation(); openEdit(r); }}
              >
                แก้ไข
              </BrandSubdueButton>
              <NeutralSubdueButton
                size='sm' leadingIcon='print'
                onClick={(e) => { e.stopPropagation(); doPrint(r, 'ปกทะเบียนสังคมสงเคราะห์ (สส.2)'); }}
              >
                พิมพ์
              </NeutralSubdueButton>
              <DangerSubdueButton
                size='sm' leadingIcon='block'
                onClick={(e) => { e.stopPropagation(); openCancel(r); }}
              >
                ยกเลิก
              </DangerSubdueButton>
            </>
          )}
        </div>
      ),
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ]), [tick, canRead]);

  const filtersActive =
    search.trim() !== '' || groupFilter !== 'all' || channelFilter !== 'all' || statusFilter !== 'all';

  const clearFilters = () => {
    setSearch('');
    setGroupFilter('all');
    setChannelFilter('all');
    setStatusFilter('all');
    setPage(1);
  };

  return (
    <QueuePageShell
      activeKey='treat'
      breadcrumb={breadcrumb}
      title='ทะเบียนผู้รับบริการสังคมสงเคราะห์'
      onBack={() => history.push('/clinic/social-work')}
      backLabel='กลับหน้าคิว'
      actions={(
        <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-300, 12px)' }}>
          <ColorfulBadge style='red' size='small' hierarchy='secondary'>ข้อมูลลับ §1.4.2</ColorfulBadge>
          <NeutralSubdueButton
            size='sm'
            leadingIcon={canRead ? 'lock_open' : 'lock'}
            onClick={toggleRightsDemo}
            title='สลับสิทธิงานสังคมสงเคราะห์ (สำหรับทดสอบ)'
          >
            {canRead ? 'สิทธิ: เข้าถึงได้' : 'สิทธิ: ถูกจำกัด'}
          </NeutralSubdueButton>
          <BrandButton leadingIcon='person_add' onClick={openCreate} disabled={!canRead}>
            ลงทะเบียนผู้รับบริการใหม่
          </BrandButton>
        </div>
      )}
      summaryCards={summaryCards}
    >
      {/* ── ยกเลิกทะเบียน (เหตุผลบังคับ + audit) ───────────────────── */}
      <Popup
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        title='ยกเลิกทะเบียนสังคมสงเคราะห์'
        subtitle={cancelTarget ? `${cancelTarget.caseNo} · ${cancelTarget.name} · HN: ${cancelTarget.hn}` : ''}
        tertiaryAction={{ label: 'ปิด', onClick: () => setCancelTarget(null) }}
        primaryAction={{ label: 'ยืนยันยกเลิกทะเบียน', onClick: confirmCancel, tone: 'danger' }}
      >
        <Textarea
          label='เหตุผลการยกเลิก'
          required
          value={cancelReason}
          onChange={(v) => { setCancelReason(v); if (v.trim()) setCancelError(''); }}
          error={cancelError || undefined}
          placeholder='เช่น ลงทะเบียนซ้ำ / ย้ายไปรับบริการที่หน่วยงานอื่น / ผู้รับบริการเสียชีวิต'
        />
      </Popup>

      {/* ── ตัวอย่างก่อนพิมพ์ + print log ─────────────────────────── */}
      <Popup
        open={!!printTarget}
        onClose={() => setPrintTarget(null)}
        title='ตัวอย่างเอกสารก่อนพิมพ์'
        subtitle={printTarget ? `${printTarget.docType} · ${printTarget.caseNo} · ${printTarget.name}` : ''}
        tertiaryAction={{ label: 'ปิด', onClick: () => setPrintTarget(null) }}
      >
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary, #636B72)' }}>
            ระบบบันทึกการพิมพ์ทุกครั้ง (ผู้พิมพ์ + วันเวลา) ตามข้อกำหนดการตรวจสอบย้อนหลัง
          </span>
          {printLog.map((e, i) => (
            <span key={`${e.at}-${i}`} style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
              พิมพ์{e.docType} โดย {e.by} · {formatSwDateTime(e.at)}
            </span>
          ))}
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
        {!canRead && (
          <SwBanner tone='warning' icon='lock'>
            บัญชีนี้ไม่มีสิทธิงานสังคมสงเคราะห์ (§1.4.2) — ที่อยู่ ผู้ให้ข้อมูล และปัญหาที่เป็นข้อมูลลับถูกปกปิด
            และไม่สามารถบันทึก / แก้ไข / ยกเลิกทะเบียนได้
          </SwBanner>
        )}

        {savedBanner && (
          <SwBanner tone='brand' icon='check-circle' onClose={() => setSavedBanner(null)}>
            {savedBanner.isNew
              ? `ลงทะเบียนสำเร็จ — ออกเลขที่สังคมสงเคราะห์ ${savedBanner.caseNo} ให้ ${savedBanner.name} แล้ว`
              : `บันทึกการแก้ไขทะเบียน ${savedBanner.caseNo} (${savedBanner.name}) แล้ว`}
          </SwBanner>
        )}

        {/* ── Create / Edit form (expands above the list) ─────────── */}
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
                {editing === 'new'
                  ? 'ลงทะเบียนผู้รับบริการสังคมสงเคราะห์ใหม่'
                  : `${canRead ? 'แก้ไขทะเบียน' : 'ทะเบียน'} ${form.caseNo}`}
              </h1>
              <div className='flex-1' />
              <NeutralSubdueButton size='sm' leadingIcon='close' onClick={closeForm}>ปิดแบบฟอร์ม</NeutralSubdueButton>
            </div>

            {/* เลขที่สังคมสงเคราะห์ — ออกอัตโนมัติเมื่อบันทึกสำเร็จ และปลดล็อกให้
                แก้เลขที่บันทึกผิดได้ตามมติ คทง.10 ครั้งที่ 3 ข้อ 13 (บังคับเหตุผล
                + ตรวจเลขซ้ำ + เก็บประวัติการแก้ไว้ในแถว) */}
            <div className='flex items-start w-full flex-wrap' style={{ gap: 'var(--dim-space-400, 16px)' }}>
              <SwField
                label='เลขที่สังคมสงเคราะห์ (เลข CASE)'
                hint={errors.caseNo
                  || (form.caseNoEdit
                    ? 'กำลังแก้ไขเลขที่ — ต้องไม่ซ้ำกับทะเบียนรายอื่น'
                    : (form.caseNo
                      ? 'ออกอัตโนมัติเมื่อบันทึกสำเร็จ — กด "แก้เลขที่" เมื่อบันทึกผิด'
                      : 'ระบบจะออกเลขให้อัตโนมัติ (รูปแบบ สค.nnnn/ปี พ.ศ.) เมื่อบันทึกสำเร็จ'))}
                hintTone={errors.caseNo ? 'error' : undefined}
              >
                <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                  <InputField
                    value={form.caseNo}
                    onChange={setField('caseNo')}
                    disabled={!canRead || !form.caseNoEdit}
                    error={!!errors.caseNo}
                    showHelperText={false}
                    placeholder='ออกให้อัตโนมัติเมื่อบันทึก'
                  />
                  {canRead && editing !== 'new' && (
                    <NeutralSubdueButton
                      size='sm'
                      leadingIcon={form.caseNoEdit ? 'lock' : 'edit'}
                      onClick={() => setForm((f) => ({ ...f, caseNoEdit: !f.caseNoEdit, caseNoEditReason: '' }))}
                    >
                      {form.caseNoEdit ? 'ยกเลิกแก้เลขที่' : 'แก้เลขที่'}
                    </NeutralSubdueButton>
                  )}
                </div>
              </SwField>
              {form.caseNoEdit && (
                <SwField
                  label='เหตุผลที่แก้ไขเลขที่สังคมสงเคราะห์'
                  required
                  hint={errors.caseNoEditReason}
                  hintTone={errors.caseNoEditReason ? 'error' : undefined}
                  minWidth={280}
                >
                  <InputField
                    value={form.caseNoEditReason}
                    onChange={setField('caseNoEditReason')}
                    error={!!errors.caseNoEditReason}
                    showHelperText={false}
                    placeholder='เช่น บันทึกเลขซ้ำกับเคสอื่น / พิมพ์ปี พ.ศ. ผิด'
                  />
                </SwField>
              )}
              <SwField label='วันที่รับเรื่อง' required hint={errors.receivedDate} hintTone={errors.receivedDate ? 'error' : undefined}>
                <DatePicker
                  showLabel={false}
                  disabled={!canRead}
                  value={form.receivedDate ? new Date(form.receivedDate) : null}
                  onChange={(d) => setField('receivedDate')(d ? toLocalIso(d) : '')}
                  placeholder='เลือกวันที่รับเรื่อง'
                />
              </SwField>
              <SwField label='ประเภทผู้ใช้บริการ' required>
                <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                  {SW_CLIENT_TYPES.map((t) => (
                    <SelectableTag
                      key={t.value}
                      label={t.label}
                      size='md'
                      selected={form.clientType === t.value}
                      onClick={() => { if (canRead) setField('clientType')(t.value); }}
                    />
                  ))}
                </div>
              </SwField>
            </div>

            {/* §1 ข้อมูลทั่วไป — ดึงจากทะเบียนผู้ป่วย */}
            <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
              <SwSectionHeader icon='person'>ข้อมูลทั่วไป (ดึงจากทะเบียนผู้ป่วย)</SwSectionHeader>
              {editing === 'new' && (
                <SwField
                  label='ผู้รับบริการ'
                  required
                  hint={errors.hn || 'เลือกจากคิว/นัดหมายของวันนี้ที่ยังไม่มีทะเบียนสังคมสงเคราะห์'}
                  hintTone={errors.hn ? 'error' : undefined}
                >
                  <Select
                    showLabel={false}
                    searchable
                    size='lg'
                    value={form.hn}
                    onChange={pickPatient}
                    options={patientOptions}
                    placeholder='ค้นหาชื่อ / HN'
                    error={errors.hn ? ' ' : undefined}
                  />
                </SwField>
              )}
              {form.hn ? (
                <>
                  {profile && <PatientCard patient={profile} title='ข้อมูลผู้รับบริการ' />}
                  <div className='flex items-start w-full flex-wrap' style={{ gap: 'var(--dim-space-400, 16px)' }}>
                    <SwField label='HN'><InputField value={form.hn} onChange={() => {}} disabled /></SwField>
                    <SwField label='ชื่อ-นามสกุล'><InputField value={form.name} onChange={() => {}} disabled /></SwField>
                    <SwField label='เพศ / อายุ'>
                      <InputField
                        value={clinicRow ? `${clinicRow.sex || '—'} / ${clinicRow.age || '—'}` : (profile ? `${profile.sex || '—'} / ${profile.age || '—'}` : '—')}
                        onChange={() => {}}
                        disabled
                      />
                    </SwField>
                    <SwField label='เลขบัตรประชาชน'>
                      <InputField value={clinicRow?.cid || profile?.nationalId || '—'} onChange={() => {}} disabled />
                    </SwField>
                    <SwField label='สิทธิการรักษา'>
                      <InputField value={clinicRow?.insurance || profile?.insurance || '—'} onChange={() => {}} disabled />
                    </SwField>
                  </div>
                  {/* ผู้ไม่มีสิทธิ/สิทธิหมดอายุ — งานสังคมสงเคราะห์คือทางออกของกรณีนี้
                      จึงต้องเตือนแต่ห้ามบล็อก */}
                  {(clinicRow?.noRights || clinicRow?.rightsExpired) && (
                    <SwBanner tone='warning' icon='warning'>
                      ผู้รับบริการ{clinicRow.noRights ? 'ไม่มีสิทธิการรักษา' : 'สิทธิการรักษาหมดอายุ'} —
                      ยังลงทะเบียนและให้บริการสังคมสงเคราะห์ได้ตามปกติ (กรณีนี้คือกลุ่มเป้าหมายหลักของงาน)
                      และควรประสานงานสิทธิประโยชน์ต่อ
                    </SwBanner>
                  )}
                </>
              ) : (
                <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-tertiary, #858C92)' }}>
                  ยังไม่ได้เลือกผู้รับบริการ — ข้อมูลทั่วไปจะแสดงเมื่อเลือกแล้ว
                </span>
              )}
            </div>

            {/* §2 รายละเอียดด้านสังคมสงเคราะห์ */}
            <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
              <SwSectionHeader icon='diversity_3'>รายละเอียดด้านสังคมสงเคราะห์</SwSectionHeader>
              <div className='flex items-start w-full flex-wrap' style={{ gap: 'var(--dim-space-400, 16px)' }}>
                <SwField label='การรับเรื่อง' required hint={errors.intakeChannel} hintTone={errors.intakeChannel ? 'error' : undefined}>
                  <Select
                    showLabel={false} searchable={false} size='lg'
                    disabled={!canRead}
                    value={form.intakeChannel}
                    onChange={setField('intakeChannel')}
                    options={SW_INTAKE_CHANNELS}
                    placeholder='เลือกช่องทางการรับเรื่อง'
                    error={errors.intakeChannel ? ' ' : undefined}
                  />
                </SwField>
                <SwField label='กลุ่มเป้าหมาย' required hint={errors.targetGroup} hintTone={errors.targetGroup ? 'error' : undefined}>
                  <Select
                    showLabel={false} searchable={false} size='lg'
                    disabled={!canRead}
                    value={form.targetGroup}
                    onChange={setField('targetGroup')}
                    options={SW_TARGET_GROUPS}
                    placeholder='เลือกกลุ่มเป้าหมาย'
                    error={errors.targetGroup ? ' ' : undefined}
                  />
                </SwField>
                <SwField
                  label='นักสังคมสงเคราะห์เจ้าของเคส'
                  required
                  hint={errors.owner}
                  hintTone={errors.owner ? 'error' : undefined}
                >
                  <Select
                    showLabel={false} searchable size='lg'
                    disabled={!canRead}
                    value={form.owner}
                    onChange={setField('owner')}
                    options={SW_WORKERS.map((w) => ({ value: w, label: w }))}
                    placeholder='เลือกเจ้าของเคส'
                    error={errors.owner ? ' ' : undefined}
                  />
                </SwField>
                {/* สถานะยากจน/รายได้น้อย อ้างอิงบัตรสวัสดิการแห่งรัฐ (มติข้อ 16) */}
                <SwField
                  label='สถานะยากจน / รายได้น้อย (บัตรสวัสดิการแห่งรัฐ)'
                  hint='ใช้ประกอบการพิจารณาเงินสงเคราะห์และการช่วยเหลือด้านโภชนาการ'
                >
                  <Select
                    showLabel={false} searchable={false} size='lg'
                    disabled={!canRead}
                    value={form.welfareCard}
                    onChange={setField('welfareCard')}
                    options={SW_WELFARE_CARD_STATUS}
                    placeholder='เลือกสถานะบัตรสวัสดิการแห่งรัฐ'
                  />
                </SwField>
              </div>
              <SwField
                label='ปัญหาแรกรับ'
                required
                hint={errors.firstProblem || 'เลือกจากรหัสปัญหาสังคมสงเคราะห์ — รายละเอียดจะแก้ไขต่อได้ในแบบ สส.2'}
                hintTone={errors.firstProblem ? 'error' : undefined}
                grow={false}
              >
                <Select
                  showLabel={false} searchable size='lg'
                  disabled={!canRead}
                  value={form.firstProblem}
                  onChange={setField('firstProblem')}
                  options={SW_PROBLEM_OPTIONS}
                  placeholder='เลือกปัญหาแรกรับ'
                  error={errors.firstProblem ? ' ' : undefined}
                />
              </SwField>
            </div>

            {/* §3-4 ผู้ให้ข้อมูล + ที่อยู่ — ข้อมูลลับ §1.4.2 */}
            {!canRead ? (
              <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
                <SwSectionHeader icon='lock'>ผู้ให้ข้อมูลและที่อยู่</SwSectionHeader>
                <SwConfidentialMask what='ผู้ให้ข้อมูล ที่อยู่ปัจจุบัน และที่อยู่ตามทะเบียนบ้านของทะเบียนสังคมสงเคราะห์' />
              </div>
            ) : (
              <>
                <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
                  <SwSectionHeader icon='record_voice_over'>ผู้ให้ข้อมูล</SwSectionHeader>
                  <div className='flex items-start w-full flex-wrap' style={{ gap: 'var(--dim-space-400, 16px)' }}>
                    <SwField label='ชื่อผู้ให้ข้อมูล' required hint={errors.informant} hintTone={errors.informant ? 'error' : undefined}>
                      <InputField
                        value={form.informant}
                        onChange={setField('informant')}
                        error={errors.informant ? ' ' : undefined}
                        placeholder='เช่น นางสมทรง รุ่งเรือง'
                      />
                    </SwField>
                    <SwField label='ความเกี่ยวข้อง' required hint={errors.informantRelation} hintTone={errors.informantRelation ? 'error' : undefined}>
                      <Select
                        showLabel={false} searchable={false} size='lg'
                        value={form.informantRelation}
                        onChange={setField('informantRelation')}
                        options={SW_INFORMANT_RELATIONS}
                        placeholder='เลือกความเกี่ยวข้อง'
                        error={errors.informantRelation ? ' ' : undefined}
                      />
                    </SwField>
                    <SwField label='โทรศัพท์ติดต่อ'>
                      <InputField value={form.informantPhone} onChange={setField('informantPhone')} placeholder='เช่น 081-234-5678' />
                    </SwField>
                  </div>
                </div>

                <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
                  <SwSectionHeader icon='home'>ที่อยู่ปัจจุบัน</SwSectionHeader>
                  <Textarea
                    showLabel={false}
                    required
                    value={form.currentAddress}
                    onChange={(v) => {
                      setField('currentAddress')(v);
                      if (form.sameAddress) setForm((f) => ({ ...f, currentAddress: v, houseRegAddress: v }));
                    }}
                    error={errors.currentAddress}
                    rows={2}
                    placeholder='บ้านเลขที่ / หมู่ / ซอย / ถนน / แขวง / เขต / จังหวัด / รหัสไปรษณีย์'
                  />
                </div>

                <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
                  <SwSectionHeader icon='other_houses'>ที่อยู่ตามทะเบียนบ้าน</SwSectionHeader>
                  <SelectableTag
                    label='ตรงกับที่อยู่ปัจจุบัน'
                    size='lg'
                    selected={form.sameAddress}
                    onClick={() => setForm((f) => ({
                      ...f,
                      sameAddress: !f.sameAddress,
                      houseRegAddress: !f.sameAddress ? f.currentAddress : f.houseRegAddress,
                    }))}
                  />
                  {!form.sameAddress && (
                    <Textarea
                      showLabel={false}
                      value={form.houseRegAddress}
                      onChange={setField('houseRegAddress')}
                      rows={2}
                      placeholder='บ้านเลขที่ / หมู่ / ซอย / ถนน / แขวง / เขต / จังหวัด / รหัสไปรษณีย์'
                    />
                  )}
                </div>
              </>
            )}

            <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
              <div className='flex-1' />
              <NeutralSubdueButton size='lg' onClick={closeForm}>
                {canRead ? 'ยกเลิก' : 'ปิด'}
              </NeutralSubdueButton>
              <BrandButton size='lg' leadingIcon='save' onClick={save} disabled={!canRead}>
                {editing === 'new' ? 'บันทึกและออกเลขที่สังคมสงเคราะห์' : 'บันทึกการแก้ไข'}
              </BrandButton>
            </div>
          </section>
        )}

        {/* ── List card ───────────────────────────────────────────── */}
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
              placeholder='ค้นหาเลขที่สังคมสงเคราะห์ / HN / ชื่อ-สกุล / เจ้าของเคส'
            />
            <Select
              showLabel={false} searchable={false} size='md'
              value={groupFilter} onChange={(v) => { setGroupFilter(v); setPage(1); }}
              options={[{ value: 'all', label: 'ทุกกลุ่มเป้าหมาย' }, ...SW_TARGET_GROUPS]}
              placeholder='กลุ่มเป้าหมาย'
            />
            <Select
              showLabel={false} searchable={false} size='md'
              value={channelFilter} onChange={(v) => { setChannelFilter(v); setPage(1); }}
              options={[{ value: 'all', label: 'ทุกช่องทาง' }, ...SW_INTAKE_CHANNELS]}
              placeholder='การรับเรื่อง'
            />
            <Select
              showLabel={false} searchable={false} size='md'
              value={statusFilter} onChange={(v) => { setStatusFilter(v); setPage(1); }}
              options={[
                { value: 'all', label: 'ทุกสถานะ' },
                { value: 'active', label: 'ใช้งาน' },
                { value: 'cancelled', label: 'ยกเลิกแล้ว' },
              ]}
              placeholder='สถานะ'
            />
            {filtersActive && (
              <NeutralSubdueButton variant='outline' size='sm' onClick={clearFilters}>
                ล้างตัวกรอง
              </NeutralSubdueButton>
            )}
          </div>

          <SearchResultCount found={filtered.length} total={rows.length} />

          {filtersActive && filtered.length === 0 ? (
            <div className='flex flex-col w-full items-center' style={{ gap: 'var(--dim-space-300, 12px)' }}>
              <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-tertiary, #858C92)' }}>
                ไม่พบทะเบียนที่ตรงกับ{search.trim() ? ` "${search.trim()}"` : 'ตัวกรองที่เลือก'}
              </span>
              <NeutralSubdueButton size='sm' variant='outline' onClick={clearFilters}>ล้างตัวกรอง</NeutralSubdueButton>
            </div>
          ) : (
            <Table
              columns={columns}
              rows={pageRows}
              rowKey={(r) => r.id}
              onRowClick={(r) => (r.status === 'cancelled' ? undefined : openEdit(r))}
              emptyMessage='ยังไม่มีทะเบียนผู้รับบริการสังคมสงเคราะห์'
            />
          )}

          <SwPagerBar total={filtered.length} page={page} pageSize={PAGE_SIZE}>
            <Pagination currentPage={page} pageCount={totalPages} onPageChange={setPage} />
          </SwPagerBar>
        </section>

        <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
          <Icon name='info' size={14} /> เลขที่สังคมสงเคราะห์ที่ปกปิดจะแสดงเป็น {SW_MASKED} เมื่อผู้ใช้ไม่มีสิทธิ
        </span>
      </div>
    </QueuePageShell>
  );
};

export default SocialWorkRegistryPage;
