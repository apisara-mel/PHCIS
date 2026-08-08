import React, { useEffect, useMemo, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import SearchResultCount from '@/components/search/SearchResultCount';
import Icon from '@/components/icons/Icon';
import InputField from '@/components/forms/InputField';
import Select from '@/components/forms/Select';
import DatePicker from '@/components/forms/DatePicker';
import Textarea from '@/components/forms/Textarea';
import SelectableTag from '@/components/forms/SelectableTag';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import Table from '@/components/table/Table';
import Pagination from '@/components/pagination/Pagination';
import Popup from '@/components/popup/Popup';
import MaskedWorklistName from '@/components/privacy/MaskedWorklistName';
import FamilyPlanningFollowUpCard, { printFpFollowUpCard } from '@/pages/clinic/family-planning/FamilyPlanningFollowUpCard';
import { getPatientByHN } from '@/data/patientProfiles';
import {
  FP_CLIENT_TYPES,
  FP_SERVICES,
  FP_REMOVAL_OPTIONS,
  FP_REGISTRY_VIEWS,
  matchFpRegistryView,
  resolveFpClientType,
  getFpRegistryRows,
  saveFpRegistration,
  cancelFpRegistration,
  reactivateFpRegistration,
  getFpQueueRows,
  FP_SCHEDULED_TODAY,
  getFpVisitRecords,
  buildFpFollowUpCard,
  hasFamilyPlanningRights,
  setFamilyPlanningRights,
  logFpPrint,
  getFpPrintLog,
  formatFpDateTime,
  todayIso,
} from '@/data/familyPlanningVisits';

/* FamilyPlanningRegistryPage — ทะเบียนผู้รับบริการวางแผนครอบครัว
   (TOR 1.10.8.6 · คู่มือระบบงาน §2.1.1.1 "เพิ่มเติม...").

   Playbook §3 registry pattern (PharmacyRegistryPage / MentalHealthRegistry):
   list + create/edit บนหน้าเดียว — ฟอร์มขยายออกเหนือรายการ ครบทั้ง 4 กริยา:
     แสดง   — แถวรายการ + ฟอร์มโหมดอ่าน + ตัวอย่างบัตรก่อนพิมพ์
     บันทึก — ลงทะเบียนใหม่ → ระบบออก "เลขที่วางแผนครอบครัว" ให้เมื่อบันทึก
              สำเร็จเท่านั้น (คู่มือ หน้า 2-3 ข้อ 2 — ก่อนบันทึกช่องนี้ว่าง)
     แก้ไข  — ปุ่มในแถว เปิดฟอร์มเดิมพร้อมข้อมูล + "ยกเลิกการแก้ไข" คืนค่าเดิม
     ยกเลิก — popup ระบุเหตุผล + audit (ผู้ยกเลิก/เวลา) และ "เปิดใช้งาน" คืนได้

   ค้นหาตามคู่มือ: ช่วง "วันที่ลงทะเบียน – ถึงวันที่" + ปุ่มค้นหา
   มุมมองรายงาน 7 ฉบับ (§2.2.1–2.2.7) ยุบเป็น filter chips ของทะเบียนเดียว */

const breadcrumb = ['ระบบบันทึกการรักษา', 'งานวางแผนครอบครัว', 'ทะเบียนผู้รับบริการ'];
const QUEUE_PATH = '/clinic/family-planning';
const PAGE_SIZE = 20;
const MASKED = '••••••••';

/* No-browser-chrome rule (CLAUDE.md) — wrapper เป็นเจ้าของ border จึงต้อง
   ถอด chrome ของ native input ทิ้งทั้งหมด (idempotent injection กัน HMR
   ทิ้ง <style> ค้าง) */
const SEARCH_INPUT_CLASS = 'mih-fp-registry-search-input';
if (typeof document !== 'undefined' && !document.getElementById('mih-fp-registry-search-style')) {
  const style = document.createElement('style');
  style.id = 'mih-fp-registry-search-style';
  style.textContent = `
.${SEARCH_INPUT_CLASS},
.${SEARCH_INPUT_CLASS}:focus,
.${SEARCH_INPUT_CLASS}:focus-visible {
  caret-color: transparent;
  border: 0 !important;
  outline: none !important;
  box-shadow: none !important;
  background: transparent !important;
  -webkit-appearance: none !important;
  appearance: none !important;
}
.${SEARCH_INPUT_CLASS}::placeholder {
  color: var(--text-input-placeholder, #ADB2B7);
  opacity: 1;
}`;
  document.head.appendChild(style);
}

const SectionHeader = ({ icon, children }) => (
  <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
    <span className='text-brand-500'><Icon name={icon} size={20} /></span>
    <h2 className='text-base font-bold text-brand-500'>{children}</h2>
  </div>
);

const Field = ({ label, required, children, hint, hintTone }) => (
  <div className='flex-1 flex flex-col gap-1.5 min-w-0' style={{ minWidth: 200 }}>
    <div className='flex items-center text-sm text-ink leading-snug'>
      <span>{label}</span>
      {required && <span className='ml-0.5' style={{ color: 'var(--text-input-require)' }}>*</span>}
    </div>
    {children}
    {hint && (
      <span style={{
        color: hintTone === 'error' ? 'var(--text-danger-default, #B91C1C)' : 'var(--text-content-quaternary, #ADB2B7)',
        fontSize: 'var(--type-size-xs)',
      }}>
        {hint}
      </span>
    )}
  </div>
);

const EMPTY_FORM = {
  id: '',
  hn: '',
  name: '',
  fpNumber: '',
  clientType: '',
  services: [],
  removals: [],
  dispensed: false,
  firstServiceDate: todayIso(),
  registeredAt: '',
  status: 'active',
};

const FamilyPlanningRegistryPage = () => {
  const history = useHistory();
  const { state: navState } = useLocation();

  const [tick, setTick] = useState(0);
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  /* ค้นหาจะมีผลก็ต่อเมื่อกดปุ่ม "ค้นหา" — ตรงกับ flow ของคู่มือ */
  const [appliedRange, setAppliedRange] = useState({ from: '', to: '' });
  const [viewFilter, setViewFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);

  /* null = list only · 'new' = สร้าง · row id = แก้ไขแถวนั้น */
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [pristine, setPristine] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [savedBanner, setSavedBanner] = useState(null);

  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState('');

  const [printTarget, setPrintTarget] = useState(null);
  const [printTick, setPrintTick] = useState(0);
  const [, setRightsTick] = useState(0);

  const canRead = hasFamilyPlanningRights();
  const toggleRightsDemo = () => {
    setFamilyPlanningRights(!hasFamilyPlanningRights());
    setRightsTick((t) => t + 1);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const rows = useMemo(() => getFpRegistryRows(), [tick]);

  /* ผู้รับบริการที่เลือกลงทะเบียนใหม่ได้ — คิว + นัดของวันนี้ ที่ยังไม่มี
     ทะเบียนใช้งานอยู่ */
  const patientOptions = useMemo(() => {
    const registeredHns = rows.filter((r) => r.status !== 'cancelled').map((r) => r.hn);
    const pool = [...getFpQueueRows(), ...FP_SCHEDULED_TODAY];
    const seen = new Set();
    return pool
      .filter((p) => !registeredHns.includes(p.hn))
      .filter((p) => (seen.has(p.hn) ? false : seen.add(p.hn)))
      .map((p) => ({ value: p.hn, label: `${p.name} · HN ${p.hn}` }));
  }, [rows]);

  const openCreate = (prefillHn) => {
    if (!canRead) return;
    const pool = [...getFpQueueRows(), ...FP_SCHEDULED_TODAY];
    const picked = prefillHn ? pool.find((p) => p.hn === prefillHn) : null;
    const next = {
      ...EMPTY_FORM,
      hn: picked?.hn || '',
      name: picked?.name || '',
      clientType: picked?.clientType || '',
      services: picked?.service ? [picked.service] : [],
      firstServiceDate: todayIso(),
    };
    setForm(next);
    setPristine(next);
    setErrors({});
    setSavedBanner(null);
    setEditing('new');
  };

  /* เปิดจากหน้าบันทึก (ปุ่ม "ลงทะเบียน" บนแบนเนอร์ "ไม่พบข้อมูล") */
  const [bootstrapped, setBootstrapped] = useState(false);
  useEffect(() => {
    if (bootstrapped) return;
    setBootstrapped(true);
    if (navState?.createFor && hasFamilyPlanningRights()) openCreate(navState.createFor);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bootstrapped, navState]);

  const openEdit = (row) => {
    const next = {
      id: row.id,
      hn: row.hn,
      name: row.name,
      fpNumber: row.fpNumber,
      clientType: row.clientType || '',
      services: row.services || [],
      removals: row.removals || [],
      dispensed: !!row.dispensed,
      firstServiceDate: row.firstServiceDate || todayIso(),
      registeredAt: row.registeredAt,
      status: row.status,
    };
    setForm(next);
    setPristine(next);
    setErrors({});
    setSavedBanner(null);
    setEditing(row.id);
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const closeForm = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setPristine(EMPTY_FORM);
    setErrors({});
  };

  /* ยกเลิกการแก้ไข — คืนค่าฟอร์มกลับสู่สำเนาก่อนแก้ (ไม่ปิดฟอร์ม) */
  const revertEdit = () => {
    setForm(pristine);
    setErrors({});
  };

  const dirty = JSON.stringify(form) !== JSON.stringify(pristine);

  const setField = (key) => (value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const pickPatient = (hn) => {
    const p = [...getFpQueueRows(), ...FP_SCHEDULED_TODAY].find((r) => r.hn === hn);
    setForm((f) => ({
      ...f,
      hn,
      name: p?.name || '',
      clientType: f.clientType || p?.clientType || '',
      services: f.services.length > 0 ? f.services : (p?.service ? [p.service] : []),
    }));
    setErrors((e) => ({ ...e, hn: undefined }));
  };

  const toggleService = (key) => setForm((f) => ({
    ...f,
    services: f.services.includes(key) ? f.services.filter((k) => k !== key) : [...f.services, key],
  }));

  const toggleRemoval = (key) => setForm((f) => ({
    ...f,
    removals: f.removals.includes(key) ? f.removals.filter((k) => k !== key) : [...f.removals, key],
  }));

  const profile = useMemo(() => (form.hn ? getPatientByHN(form.hn) : null), [form.hn]);
  const clinicRow = useMemo(
    () => (form.hn ? [...getFpQueueRows(), ...FP_SCHEDULED_TODAY].find((r) => r.hn === form.hn) : null),
    [form.hn],
  );

  const save = () => {
    if (!canRead) return;
    const nextErrors = {};
    if (!form.hn) nextErrors.hn = 'กรุณาเลือกผู้รับบริการ';
    if (!form.clientType) nextErrors.clientType = 'กรุณาเลือกประเภทผู้รับบริการ';
    if (form.services.length === 0) nextErrors.services = 'กรุณาเลือกบริการที่ได้รับอย่างน้อย 1 รายการ';
    if (!form.firstServiceDate) nextErrors.firstServiceDate = 'กรุณาระบุวันเริ่มรับบริการครั้งแรก';
    if (form.firstServiceDate && form.firstServiceDate > todayIso()) {
      nextErrors.firstServiceDate = 'วันเริ่มรับบริการต้องไม่เป็นวันในอนาคต';
    }
    if (Object.keys(nextErrors).length > 0) { setErrors(nextErrors); return; }

    const { saved: savedRow, isNew } = saveFpRegistration({
      id: form.id || undefined,
      hn: form.hn,
      name: form.name,
      fpNumber: form.fpNumber || undefined,
      clientType: form.clientType,
      services: form.services,
      removals: form.removals,
      dispensed: form.dispensed,
      firstServiceDate: form.firstServiceDate,
      registeredAt: form.registeredAt,
      status: form.status,
    });
    setTick((t) => t + 1);
    closeForm();
    setSavedBanner({ fpNumber: savedRow.fpNumber, name: savedRow.name, isNew });
  };

  /* ── ยกเลิก / เปิดใช้งาน ───────────────────────────────────────── */
  const openCancel = (row) => {
    if (!canRead) return;
    setCancelReason('');
    setCancelError('');
    setCancelTarget(row);
  };
  const confirmCancel = () => {
    if (!canRead) return;
    if (!cancelReason.trim()) { setCancelError('กรุณาระบุเหตุผลการยกเลิกทะเบียน'); return; }
    cancelFpRegistration(cancelTarget.id, cancelReason.trim());
    setCancelTarget(null);
    setTick((t) => t + 1);
  };
  const reactivate = (row) => {
    if (!canRead) return;
    reactivateFpRegistration(row.id);
    setTick((t) => t + 1);
  };

  /* ── พิมพ์บัตรติดตาม ───────────────────────────────────────────── */
  const printCard = useMemo(() => {
    if (!printTarget) return null;
    return buildFpFollowUpCard({
      registration: printTarget,
      patient: { hn: printTarget.hn, name: printTarget.name },
      visits: getFpVisitRecords(printTarget.hn),
      appointment: null,
    });
  }, [printTarget]);

  const printLog = useMemo(
    () => (printTarget ? getFpPrintLog(printTarget.hn) : []),
    [printTarget, printTick],
  );

  const doPrint = () => {
    if (!printTarget) return;
    logFpPrint(printTarget.hn, 'บัตรติดตามวางแผนครอบครัว');
    printFpFollowUpCard();
    setPrintTick((t) => t + 1);
    setPrintTarget(null);
  };

  /* ── filtering ─────────────────────────────────────────────────── */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (!matchFpRegistryView(r, viewFilter)) return false;
      const day = (r.registeredAt || '').slice(0, 10);
      if (appliedRange.from && day < appliedRange.from) return false;
      if (appliedRange.to && day > appliedRange.to) return false;
      if (!q) return true;
      return [r.fpNumber, r.hn, r.name].some((f) => f && String(f).toLowerCase().includes(q));
    });
  }, [rows, search, viewFilter, statusFilter, appliedRange]);

  const sorted = useMemo(
    () => [...filtered].sort((a, b) => String(b.registeredAt).localeCompare(String(a.registeredAt))),
    [filtered],
  );

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageRows = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const summaryCards = useMemo(() => ([
    { key: 'total',     label: 'ทะเบียนทั้งหมด', value: rows.length, color: 'info', icon: 'contact_page' },
    { key: 'active',    label: 'ใช้งาน',          value: rows.filter((r) => r.status === 'active').length, color: 'positive', icon: 'check_circle' },
    { key: 'cancelled', label: 'ยกเลิกแล้ว',      value: rows.filter((r) => r.status === 'cancelled').length, color: 'negative', icon: 'block' },
    { key: 'dispensed', label: 'จ่ายยาคุมกำเนิด', value: rows.filter((r) => r.dispensed).length, color: 'warning', icon: 'pill' },
  ]), [rows]);

  const cancelledText = { color: 'var(--text-content-tertiary, #858C92)' };

  const columns = useMemo(() => ([
    {
      key: 'registeredAt', label: 'วัน-เวลาที่ลงทะเบียน',
      render: (r) => (
        <span style={r.status === 'cancelled' ? cancelledText : undefined}>{formatFpDateTime(r.registeredAt)}</span>
      ),
    },
    {
      key: 'fpNumber', label: 'เลขที่วางแผนครอบครัว',
      render: (r) => (
        <span
          style={r.status === 'cancelled' ? cancelledText : { fontWeight: 'var(--type-weight-medium)' }}
          title={canRead ? undefined : 'ข้อมูลลับ §1.4.2 — สิทธิไม่เพียงพอ'}
        >
          {canRead ? r.fpNumber : MASKED}
        </span>
      ),
    },
    { key: 'hn', label: 'HN', render: (r) => <span style={r.status === 'cancelled' ? cancelledText : undefined}>{r.hn}</span> },
    {
      key: 'name', label: 'ชื่อ-สกุล', flex: true, minWidth: 180,
      render: (r) => <MaskedWorklistName name={r.name} recordKey={r.hn} />,
    },
    {
      key: 'clientType', label: 'ประเภทผู้รับบริการ', flex: true, minWidth: 170,
      render: (r) => <span style={r.status === 'cancelled' ? cancelledText : undefined}>{resolveFpClientType(r.clientType)}</span>,
    },
    {
      key: 'services', label: 'บริการที่ได้รับ', flex: true, minWidth: 200,
      render: (r) => {
        if (!canRead) return <span title='ข้อมูลลับ §1.4.2 — สิทธิไม่เพียงพอ'>{MASKED}</span>;
        return (
          <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-100, 4px)' }}>
            {(r.services || []).map((key) => {
              const s = FP_SERVICES.find((x) => x.key === key);
              return s ? (
                <ColorfulBadge key={key} style={s.tone} size='small' hierarchy='secondary'>{s.label}</ColorfulBadge>
              ) : null;
            })}
            {(r.removals || []).map((key) => {
              const rm = FP_REMOVAL_OPTIONS.find((x) => x.key === key);
              return rm ? (
                <ColorfulBadge key={`rm-${key}`} style='grey' size='small' hierarchy='secondary'>{rm.label}</ColorfulBadge>
              ) : null;
            })}
            {r.dispensed && <ColorfulBadge style='yellow' size='small' hierarchy='secondary'>จ่ายยาคุม</ColorfulBadge>}
          </div>
        );
      },
    },
    {
      key: 'status', label: 'สถานะ',
      render: (r) => (r.status === 'cancelled' ? (
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
          <ColorfulBadge style='red' size='small' hierarchy='secondary'>ยกเลิกทะเบียน</ColorfulBadge>
          {r.cancellation && (
            <span style={{ fontSize: 'var(--type-size-xs)', ...cancelledText }}>
              โดย {r.cancellation.by} · {formatFpDateTime(r.cancellation.at)}
              <br />เหตุผล: {r.cancellation.reason || 'ไม่ระบุ'}
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
          {r.recordedBy}<br />{formatFpDateTime(r.recordedAt)}
        </span>
      ),
    },
    {
      key: 'actions', label: 'การดำเนินการ', sortable: false,
      render: (r) => (
        <div className='flex items-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
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
              <BrandSubdueButton
                variant='outline' size='sm' leadingIcon='print'
                onClick={(e) => { e.stopPropagation(); setPrintTarget(r); }}
              >
                พิมพ์บัตร
              </BrandSubdueButton>
              <NeutralSubdueButton
                size='sm' leadingIcon='block'
                onClick={(e) => { e.stopPropagation(); openCancel(r); }}
              >
                ยกเลิก
              </NeutralSubdueButton>
            </>
          )}
        </div>
      ),
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ]), [tick, canRead]);

  const statusOptions = [
    { value: 'all', label: 'ทุกสถานะ' },
    { value: 'active', label: 'ใช้งาน' },
    { value: 'cancelled', label: 'ยกเลิกแล้ว' },
  ];

  const filtersActive =
    search.trim() !== '' || viewFilter !== 'all' || statusFilter !== 'all'
    || !!appliedRange.from || !!appliedRange.to;

  const clearFilters = () => {
    setSearch(''); setViewFilter('all'); setStatusFilter('all');
    setDateFrom(''); setDateTo(''); setAppliedRange({ from: '', to: '' });
    setPage(1);
  };

  const applyRange = () => {
    setAppliedRange({ from: dateFrom, to: dateTo });
    setPage(1);
  };

  const rangeInvalid = !!dateFrom && !!dateTo && dateFrom > dateTo;

  return (
    <QueuePageShell
      activeKey='treat'
      breadcrumb={breadcrumb}
      title='ทะเบียนผู้รับบริการวางแผนครอบครัว'
      onBack={() => history.push(QUEUE_PATH)}
      backLabel='กลับหน้าคิว'
      actions={(
        <div className='flex items-center' style={{ gap: 'var(--dim-space-300, 12px)' }}>
          <ColorfulBadge style='red' size='small' hierarchy='secondary'>ข้อมูลลับ §1.4.2</ColorfulBadge>
          <NeutralSubdueButton
            size='sm'
            leadingIcon={canRead ? 'lock_open' : 'lock'}
            onClick={toggleRightsDemo}
            title='สลับสิทธิการเข้าถึงข้อมูลลับ (สำหรับทดสอบ)'
          >
            {canRead ? 'สิทธิ: เข้าถึงได้' : 'สิทธิ: ถูกจำกัด'}
          </NeutralSubdueButton>
          <BrandSubdueButton variant='fill' leadingIcon='person_add' onClick={() => openCreate()} disabled={!canRead}>
            ลงทะเบียนวางแผนครอบครัวใหม่
          </BrandSubdueButton>
        </div>
      )}
      summaryCards={summaryCards}
    >
      {/* ── ยกเลิกทะเบียน ─────────────────────────────────────────── */}
      <Popup
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        title='ยกเลิกทะเบียนวางแผนครอบครัว'
        subtitle={cancelTarget ? `${cancelTarget.fpNumber} · ${cancelTarget.name} · HN: ${cancelTarget.hn}` : ''}
        tertiaryAction={{ label: 'ปิด', onClick: () => setCancelTarget(null) }}
        primaryAction={{ label: 'ยืนยันยกเลิกทะเบียน', onClick: confirmCancel, tone: 'danger' }}
      >
        <Textarea
          label='เหตุผลการยกเลิก'
          required
          value={cancelReason}
          onChange={(v) => { setCancelReason(v); if (v.trim()) setCancelError(''); }}
          error={cancelError || undefined}
          placeholder='เช่น ย้ายไปรับบริการที่สถานบริการอื่น / ตั้งครรภ์ / ลงทะเบียนซ้ำ'
        />
      </Popup>

      {/* ── ตัวอย่างก่อนพิมพ์บัตรติดตาม ────────────────────────────── */}
      <Popup
        open={!!printTarget}
        onClose={() => setPrintTarget(null)}
        size='large'
        title='ตัวอย่างก่อนพิมพ์ — บัตรติดตามวางแผนครอบครัว'
        subtitle={printTarget ? `${printTarget.name} · HN ${printTarget.hn} · ${printTarget.fpNumber}` : ''}
        tertiaryAction={{ label: 'ปิด', onClick: () => setPrintTarget(null) }}
        primaryAction={{ label: 'สั่งพิมพ์', onClick: doPrint }}
      >
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
          <FamilyPlanningFollowUpCard card={printCard} preview />
          {printLog.length > 0 && (
            <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
              {printLog.map((e, i) => (
                <span key={`${e.at}-${i}`} style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
                  พิมพ์{e.docType} โดย {e.by} · {formatFpDateTime(e.at)}
                </span>
              ))}
            </div>
          )}
        </div>
      </Popup>
      {/* สำเนา print-only (portal ไป <body>) */}
      {printTarget && <FamilyPlanningFollowUpCard card={printCard} />}

      <div className='flex flex-col flex-1 min-w-0' style={{
        paddingTop: 'var(--dim-space-600, 24px)',
        paddingBottom: 'var(--dim-space-600, 24px)',
        paddingLeft: 'var(--dim-space-600, 24px)',
        paddingRight: 'var(--dim-space-600, 24px)',
        gap: 'var(--dim-space-600, 24px)',
      }}>
        {!canRead && (
          <div
            className='flex items-center w-full'
            style={{
              gap: 'var(--dim-space-200, 8px)',
              paddingTop: 'var(--dim-space-300, 12px)',
              paddingBottom: 'var(--dim-space-300, 12px)',
              paddingLeft: 'var(--dim-space-400, 16px)',
              paddingRight: 'var(--dim-space-400, 16px)',
              borderRadius: 'var(--dim-radius-200, 8px)',
              background: 'var(--surface-warning-quaternary, #FFF9F0)',
              color: 'var(--text-warning-default, #C2410C)',
              fontSize: 'var(--type-size-sm)',
            }}
          >
            <Icon name='lock' size={18} />
            <span>
              บัญชีนี้ไม่มีสิทธิเข้าถึงข้อมูลลับของงานวางแผนครอบครัว (§1.4.2) —
              เลขที่วางแผนครอบครัวและบริการที่ได้รับถูกปกปิด และไม่สามารถ
              ลงทะเบียน / แก้ไข / ยกเลิก / พิมพ์บัตรได้
            </span>
          </div>
        )}

        {savedBanner && (
          <div
            className='flex items-center w-full'
            style={{
              gap: 'var(--dim-space-200, 8px)',
              paddingTop: 'var(--dim-space-300, 12px)',
              paddingBottom: 'var(--dim-space-300, 12px)',
              paddingLeft: 'var(--dim-space-400, 16px)',
              paddingRight: 'var(--dim-space-400, 16px)',
              borderRadius: 'var(--dim-radius-200, 8px)',
              background: 'var(--surface-brandPrimary-quaternary, #F4FBF8)',
              color: 'var(--text-brandPrimary-default, #007549)',
              fontSize: 'var(--type-size-sm)',
            }}
          >
            <Icon name='check-circle' size={18} />
            <span>
              {savedBanner.isNew
                ? `ลงทะเบียนสำเร็จ — ออกเลขที่วางแผนครอบครัว ${savedBanner.fpNumber} ให้ ${savedBanner.name} แล้ว`
                : `บันทึกการแก้ไขทะเบียน ${savedBanner.fpNumber} (${savedBanner.name}) แล้ว`}
            </span>
            <div className='flex-1' />
            <button
              type='button'
              onClick={() => setSavedBanner(null)}
              aria-label='ปิดการแจ้งเตือน'
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-brandPrimary-default, #007549)' }}
            >
              <Icon name='close' size={16} />
            </button>
          </div>
        )}

        {/* ── ฟอร์มลงทะเบียน / แก้ไข ─────────────────────────────── */}
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
                  ? 'ลงทะเบียนผู้รับบริการวางแผนครอบครัวใหม่'
                  : `${canRead ? 'แก้ไขทะเบียน' : 'ทะเบียน'} ${canRead ? form.fpNumber : MASKED}`}
              </h1>
              <div className='flex-1' />
              {dirty && (
                <NeutralSubdueButton size='sm' leadingIcon='undo' onClick={revertEdit}>
                  ยกเลิกการแก้ไข
                </NeutralSubdueButton>
              )}
              <NeutralSubdueButton size='sm' leadingIcon='close' onClick={closeForm}>ปิดแบบฟอร์ม</NeutralSubdueButton>
            </div>

            <div className='flex items-start w-full flex-wrap' style={{ gap: 'var(--dim-space-400, 16px)' }}>
              <Field
                label='เลขที่วางแผนครอบครัว'
                hint={form.fpNumber ? undefined : 'ระบบจะออกเลขที่ให้อัตโนมัติ (Run number) เมื่อบันทึกสำเร็จ (คู่มือ หน้า 2-3 ข้อ 2)'}
              >
                <InputField
                  value={canRead ? (form.fpNumber || '') : MASKED}
                  onChange={() => {}}
                  disabled
                  placeholder='ออกให้อัตโนมัติเมื่อบันทึก'
                />
              </Field>
              <Field
                label='วันเริ่มรับบริการครั้งแรก'
                required
                hint={errors.firstServiceDate}
                hintTone={errors.firstServiceDate ? 'error' : undefined}
              >
                <DatePicker
                  showLabel={false}
                  disabled={!canRead}
                  value={form.firstServiceDate ? new Date(form.firstServiceDate) : null}
                  onChange={(d) => setField('firstServiceDate')(d ? d.toISOString().slice(0, 10) : '')}
                  placeholder='เลือกวันที่'
                  error={errors.firstServiceDate ? ' ' : undefined}
                />
              </Field>
              <Field label='วัน-เวลาที่ลงทะเบียน' hint='ระบบกำหนดอัตโนมัติ แก้ไขไม่ได้ (คู่มือ หน้า 2-3 ข้อ 1)'>
                <InputField
                  value={form.registeredAt ? formatFpDateTime(form.registeredAt) : formatFpDateTime(new Date())}
                  onChange={() => {}}
                  disabled
                />
              </Field>
            </div>

            {/* ข้อมูลทั่วไป — ดึงจากทะเบียนผู้ป่วย (TOR 1.10.8.1) */}
            <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
              <SectionHeader icon='person'>ข้อมูลทั่วไป (ดึงจากทะเบียนผู้ป่วย)</SectionHeader>
              {editing === 'new' && (
                <Field
                  label='ผู้รับบริการ'
                  required
                  hint={errors.hn || 'เลือกจากคิว/นัดหมายของคลินิกวันนี้ที่ยังไม่มีทะเบียน'}
                  hintTone={errors.hn ? 'error' : undefined}
                >
                  <Select
                    showLabel={false} searchable size='lg'
                    disabled={!canRead}
                    value={form.hn} onChange={pickPatient}
                    options={patientOptions}
                    placeholder='ค้นหาชื่อ / HN'
                    error={errors.hn ? ' ' : undefined}
                  />
                </Field>
              )}
              {form.hn ? (
                <div className='flex items-start w-full flex-wrap' style={{ gap: 'var(--dim-space-400, 16px)' }}>
                  <Field label='HN'><InputField value={form.hn} onChange={() => {}} disabled /></Field>
                  <Field label='ชื่อ-สกุล'><InputField value={form.name} onChange={() => {}} disabled /></Field>
                  <Field label='เพศ / อายุ'>
                    <InputField
                      value={clinicRow ? `${clinicRow.sex || '—'} / ${clinicRow.age || '—'}` : (profile ? `${profile.sex || '—'} / ${profile.age || '—'}` : '—')}
                      onChange={() => {}} disabled
                    />
                  </Field>
                  <Field label='เลขบัตรประชาชน'>
                    <InputField value={clinicRow?.cid || profile?.nationalId || '—'} onChange={() => {}} disabled />
                  </Field>
                  <Field label='สิทธิการรักษา'>
                    <InputField value={clinicRow?.insurance || profile?.insurance || '—'} onChange={() => {}} disabled />
                  </Field>
                </div>
              ) : (
                <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-tertiary, #858C92)' }}>
                  ยังไม่ได้เลือกผู้รับบริการ — ข้อมูลทั่วไปจะแสดงเมื่อเลือกแล้ว
                </span>
              )}
            </div>

            {/* ประเภทผู้รับบริการ + บริการที่ได้รับ */}
            <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
              <SectionHeader icon='how_to_reg'>ประเภทผู้รับบริการ</SectionHeader>
              <div className='flex items-center gap-3 flex-wrap'>
                {FP_CLIENT_TYPES.map((t) => (
                  <SelectableTag
                    key={t.value}
                    label={t.label}
                    size='lg'
                    selected={form.clientType === t.value}
                    onClick={() => { if (canRead) setField('clientType')(t.value); }}
                  />
                ))}
              </div>
              {errors.clientType && (
                <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-danger-default, #B91C1C)' }}>{errors.clientType}</span>
              )}
            </div>

            <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
              <SectionHeader icon='vaccines'>บริการที่ได้รับ</SectionHeader>
              <div className='flex items-center gap-3 flex-wrap'>
                {FP_SERVICES.map((s) => (
                  <SelectableTag
                    key={s.key}
                    label={s.label}
                    size='lg'
                    selected={form.services.includes(s.key)}
                    onClick={() => { if (canRead) toggleService(s.key); }}
                  />
                ))}
              </div>
              {errors.services && (
                <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-danger-default, #B91C1C)' }}>{errors.services}</span>
              )}
              <div className='flex items-center gap-3 flex-wrap'>
                <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary, #636B72)' }}>
                  การถอด / การจ่ายยา (สำหรับมุมมองรายงานทะเบียน):
                </span>
                {FP_REMOVAL_OPTIONS.map((r) => (
                  <SelectableTag
                    key={r.key}
                    label={r.label}
                    size='md'
                    selected={form.removals.includes(r.key)}
                    onClick={() => { if (canRead) toggleRemoval(r.key); }}
                  />
                ))}
                <SelectableTag
                  label='จ่ายยาคุมกำเนิด'
                  size='md'
                  selected={form.dispensed}
                  onClick={() => { if (canRead) setField('dispensed')(!form.dispensed); }}
                />
              </div>
            </div>

            <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
              <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
                ทุกการบันทึกจะประทับผู้บันทึกและวัน-เวลาไว้ในทะเบียน (audit trail)
              </span>
              <div className='flex-1' />
              <NeutralSubdueButton size='lg' onClick={closeForm}>
                {canRead ? 'ยกเลิก' : 'ปิด'}
              </NeutralSubdueButton>
              <BrandSubdueButton variant='fill' size='lg' leadingIcon='save' onClick={save} disabled={!canRead}>
                {editing === 'new' ? 'บันทึกและออกเลขที่วางแผนครอบครัว' : 'บันทึกการแก้ไข'}
              </BrandSubdueButton>
            </div>
          </section>
        )}

        {/* ── รายการทะเบียน ───────────────────────────────────────── */}
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
          {/* ช่วงวันที่ลงทะเบียน + ปุ่มค้นหา (ตามคู่มือ "เพิ่มเติม...") */}
          <div className='flex flex-wrap items-end w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
            <Field
              label='วันที่ลงทะเบียน'
              hint={rangeInvalid ? 'วันที่เริ่มต้นต้องไม่เกินวันที่สิ้นสุด' : undefined}
              hintTone={rangeInvalid ? 'error' : undefined}
            >
              <DatePicker
                showLabel={false}
                value={dateFrom ? new Date(dateFrom) : null}
                onChange={(d) => setDateFrom(d ? d.toISOString().slice(0, 10) : '')}
                placeholder='เลือกวันที่เริ่มต้น'
                error={rangeInvalid ? ' ' : undefined}
              />
            </Field>
            <Field label='ถึงวันที่'>
              <DatePicker
                showLabel={false}
                value={dateTo ? new Date(dateTo) : null}
                onChange={(d) => setDateTo(d ? d.toISOString().slice(0, 10) : '')}
                placeholder='เลือกวันที่สิ้นสุด'
                error={rangeInvalid ? ' ' : undefined}
              />
            </Field>
            <BrandSubdueButton variant='outline' leadingIcon='search' onClick={applyRange} disabled={rangeInvalid}>
              ค้นหา
            </BrandSubdueButton>
          </div>

          <div className='flex flex-wrap items-center w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
            <div
              className='flex items-center flex-1'
              style={{
                minWidth: 218,
                gap: 'var(--dim-space-200, 8px)',
                height: 'var(--dim-size-800, 40px)',
                paddingLeft: 'var(--dim-space-300, 12px)',
                paddingRight: 'var(--dim-space-300, 12px)',
                borderRadius: 'var(--dim-radius-200, 8px)',
                background: 'var(--surface-input-default)',
                border: 'var(--dim-stroke-100, 1px) solid var(--border-input-default)',
              }}
            >
              <Icon name='search' size={18} />
              <input
                type='text'
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder='ค้นหาเลขที่วางแผนครอบครัว / HN / ชื่อ-สกุล'
                className={`${SEARCH_INPUT_CLASS} flex-1 text-sm`}
                style={{ color: 'var(--text-content-primary)' }}
              />
              {search && (
                <button
                  type='button' onClick={() => setSearch('')} aria-label='ล้างคำค้นหา'
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-content-tertiary, #858C92)' }}
                >
                  <Icon name='close' size={16} />
                </button>
              )}
            </div>
            <Select
              showLabel={false} searchable={false} size='md'
              value={statusFilter} onChange={(v) => { setStatusFilter(v); setPage(1); }}
              options={statusOptions} placeholder='สถานะ'
            />
            {filtersActive && (
              <NeutralSubdueButton variant='outline' size='sm' onClick={clearFilters}>
                ล้างตัวกรอง
              </NeutralSubdueButton>
            )}
          </div>

          {/* มุมมองรายงาน 7 ฉบับ (§2.2.1–2.2.7) เป็น chip — ตัวกรองเดียว
              ไม่ซ้ำกับ dropdown เพื่อไม่ให้มีสองที่ควบคุมค่าเดียวกัน */}
          <div className='flex items-center gap-2 flex-wrap'>
            <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary, #636B72)' }}>
              มุมมองทะเบียน:
            </span>
            {FP_REGISTRY_VIEWS.map((v) => (
              <SelectableTag
                key={v.value}
                label={v.label}
                size='md'
                selected={viewFilter === v.value}
                onClick={() => { setViewFilter(v.value); setPage(1); }}
              />
            ))}
          </div>

          <SearchResultCount found={sorted.length} total={rows.length} />

          <Table
            columns={columns}
            rows={pageRows}
            rowKey={(r) => r.id}
            onRowClick={canRead ? ((r) => (r.status === 'cancelled' ? undefined : openEdit(r))) : undefined}
            emptyMessage={
              filtersActive
                ? 'ไม่พบทะเบียนที่ตรงกับการค้นหา / ตัวกรอง'
                : 'ยังไม่มีทะเบียนผู้รับบริการวางแผนครอบครัว'
            }
            emptySubtext={
              filtersActive
                ? 'ลองล้างตัวกรอง หรือขยายช่วงวันที่ลงทะเบียน'
                : 'กด "ลงทะเบียนวางแผนครอบครัวใหม่" เพื่อออกเลขที่วางแผนครอบครัวให้ผู้รับบริการรายแรก'
            }
          />

          <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
            <span style={{ color: 'var(--text-content-secondary, #636B72)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)' }}>
              {`แสดง ${sorted.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, sorted.length)} จาก ${sorted.length} รายการ`}
            </span>
            <div className='flex-1' />
            <Pagination currentPage={page} pageCount={totalPages} onPageChange={setPage} />
          </div>
        </section>
      </div>
    </QueuePageShell>
  );
};

export default FamilyPlanningRegistryPage;
