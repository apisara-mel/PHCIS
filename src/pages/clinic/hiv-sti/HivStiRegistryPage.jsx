import React, { useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import Icon from '@/components/icons/Icon';
import Table from '@/components/table/Table';
import Pagination from '@/components/pagination/Pagination';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import InputField from '@/components/forms/InputField';
import Select from '@/components/forms/Select';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import ConsentAuditBar from '@/components/forms/ConsentAuditBar';
import Popup from '@/components/popup/Popup';
import UnsavedChangesPopup from '@/components/popup/UnsavedChangesPopup';
import {
  HivStiConfidentialGate,
  MaskedPii,
  ReadOnlyBanner,
  Field,
  clientTypeBadge,
} from '@/pages/clinic/hiv-sti/hivStiShared';
import {
  HIV_STI_CLIENT_TYPES,
  HIV_STI_KEY_POPULATIONS,
  HIV_STI_OCCUPATIONS,
  HIV_STI_NATIONALITIES,
  HIV_STI_REFERRAL_SOURCES,
  HIV_STI_ARV_STATUS,
  resolveArvStatus,
  maskHivStiName,
  getHivStiRegistryRows,
  saveHivStiRegistryEntry,
  cancelHivStiRegistry,
  reactivateHivStiRegistry,
  getHivStiRegistryCancellation,
  canEditHivSti,
} from '@/data/hivStiVisits';

/* HivStiRegistryPage — ทะเบียนผู้รับบริการคลินิก HIV/STI (TOR 1.10.6.6 + .1).
   Covers all four registry verbs on one page (แสดง = the table, บันทึก =
   create popup, แก้ไข = edit popup, ยกเลิก = reason-required cancel +
   เปิดใช้งานใหม่ — the cancel/reactivate contract mirrors ANC's
   cancelAncRegistration/reactivate).

   This is a CLINIC-LEVEL enrollment (UIC code, กลุ่มประชากรเฉพาะ, แหล่ง
   ที่มา, สถานะ ARV — the ข้อมูลทั่วไป tab of the legacy บันทึกการดูแลรักษา
   เอดส์ฯ screen), keyed to the existing HN. It deliberately does NOT
   duplicate the central medical-record demographics.

   §1.4.2 — the table shows UIC + ชื่อย่อ; the full name reveals per-cell
   via PrivacyRevealPopup. Every save/cancel/edit stamps ผู้บันทึก+เวลา
   (shown through ConsentAuditBar in the edit popup + the cancel badge). */

const breadcrumb = ['ระบบบันทึกการรักษา', 'คลินิก HIV/STI', 'ทะเบียนผู้รับบริการ'];
const PAGE_SIZE = 20;

const CANCEL_REASON_SUGGESTIONS = [
  'ย้ายไปรับบริการที่สถานพยาบาลอื่น',
  'ผู้รับบริการขอยกเลิกการลงทะเบียนด้วยตนเอง',
  'ลงทะเบียนซ้ำซ้อน — รวมกับทะเบียนเดิม',
  'ขาดการติดต่อเกิน 1 ปี (LTFU)',
  'เสียชีวิต',
];

const EMPTY_FORM = {
  hn: '',
  name: '',
  uic: '',
  clientType: '',
  occupation: '',
  nationality: 'ไทย',
  keyPopulation: '',
  referral: '',
  arvStatus: '',
};

const keyPopulationLabel = (value) =>
  HIV_STI_KEY_POPULATIONS.find((k) => k.value === value)?.label || value || '—';

const ARV_BADGE_STYLE = {
  here: 'green', other: 'teal', none: 'grey', ltfu: 'red', na: 'grey',
};

const HivStiRegistryPage = () => {
  const history = useHistory();
  const [searchQ, setSearchQ] = useState('');
  const [keyPopFilter, setKeyPopFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [tick, setTick] = useState(0);
  const readOnlyRole = !canEditHivSti();

  /* Create / edit popup state. `editorTarget` = null (closed), 'new', or
     the row being edited. `formSeed` remembers the opening values so
     dirty-close can tell edits from noise. */
  const [editorTarget, setEditorTarget] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formSeed, setFormSeed] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [unsavedOpen, setUnsavedOpen] = useState(false);

  /* Cancel popup state. */
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState('');

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const rows = useMemo(() => getHivStiRegistryRows(), [tick]);

  const filtered = useMemo(() => {
    let result = rows;
    if (keyPopFilter !== 'all') result = result.filter((r) => r.keyPopulation === keyPopFilter);
    if (statusFilter !== 'all') {
      result = result.filter((r) => {
        const cancelled = !!getHivStiRegistryCancellation(r.hn);
        return statusFilter === 'cancelled' ? cancelled : !cancelled;
      });
    }
    if (searchQ.trim()) {
      const q = searchQ.trim().toLowerCase();
      result = result.filter((r) =>
        [r.hn, r.name, r.uic, r.occupation, r.referral].some((f) => f && String(f).toLowerCase().includes(q)));
    }
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, keyPopFilter, statusFilter, searchQ, tick]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const rangeStart = filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, filtered.length);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const summaryCards = useMemo(() => ([
    { key: 'total',     label: 'ทะเบียนทั้งหมด',    value: rows.length, color: 'info', icon: 'group' },
    { key: 'new',       label: 'รายใหม่',           value: rows.filter((r) => r.clientType === 'new').length, color: 'info', icon: 'assignment_add' },
    { key: 'arv',       label: 'รับยา ARV ที่ศูนย์ฯ', value: rows.filter((r) => r.arvStatus === 'here').length, color: 'positive', icon: 'medication' },
    { key: 'cancelled', label: 'ยกเลิกทะเบียน',      value: rows.filter((r) => !!getHivStiRegistryCancellation(r.hn)).length, color: 'warning', icon: 'block' },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ]), [rows, tick]);

  /* ── Create / edit ──────────────────────────────────────────────── */

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setFormSeed(EMPTY_FORM);
    setFormErrors({});
    setEditorTarget('new');
  };

  const openEdit = (row) => {
    const seed = {
      hn: row.hn, name: row.name, uic: row.uic,
      clientType: row.clientType || '', occupation: row.occupation || '',
      nationality: row.nationality || 'ไทย', keyPopulation: row.keyPopulation || '',
      referral: row.referral || '', arvStatus: row.arvStatus || '',
    };
    setForm(seed);
    setFormSeed(seed);
    setFormErrors({});
    setEditorTarget(row);
  };

  const isDirty = JSON.stringify(form) !== JSON.stringify(formSeed);
  const setField = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  const validate = () => {
    const errors = {};
    if (!form.hn.trim()) errors.hn = 'กรุณาระบุ HN';
    if (!form.name.trim()) errors.name = 'กรุณาระบุชื่อ-นามสกุล';
    if (!form.uic.trim()) errors.uic = 'กรุณาระบุ UIC code';
    if (!form.clientType) errors.clientType = 'กรุณาเลือกประเภทผู้รับบริการ';
    if (!form.keyPopulation) errors.keyPopulation = 'กรุณาเลือกกลุ่มประชากรเฉพาะ';
    if (!form.arvStatus) errors.arvStatus = 'กรุณาเลือกสถานะรับยา ARV';
    if (editorTarget === 'new' && rows.some((r) => r.hn === form.hn.trim())) {
      errors.hn = 'HN นี้ลงทะเบียนในคลินิกแล้ว — ใช้ปุ่มแก้ไขจากรายการเดิม';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const commitSave = () => {
    if (!validate()) return false;
    saveHivStiRegistryEntry(
      { ...form, hn: form.hn.trim(), name: form.name.trim(), uic: form.uic.trim() },
      { isNew: editorTarget === 'new' },
    );
    setEditorTarget(null);
    setTick((t) => t + 1);
    return true;
  };

  const requestCloseEditor = () => {
    if (isDirty) setUnsavedOpen(true);
    else setEditorTarget(null);
  };

  /* ── Cancel / reactivate ────────────────────────────────────────── */

  const openCancel = (row) => {
    setCancelReason('');
    setCancelError('');
    setCancelTarget(row);
  };

  const confirmCancel = () => {
    if (!cancelReason.trim()) {
      setCancelError('กรุณาระบุเหตุผลการยกเลิกก่อนยืนยัน');
      return;
    }
    cancelHivStiRegistry(cancelTarget.hn, cancelReason.trim());
    setCancelTarget(null);
    setTick((t) => t + 1);
  };

  const reactivate = (row) => {
    reactivateHivStiRegistry(row.hn);
    setTick((t) => t + 1);
  };

  /* ── Columns ────────────────────────────────────────────────────── */

  const renderClient = (row) => (
    <div className='flex flex-col min-w-0'>
      <span style={{ fontWeight: 'var(--type-weight-medium)', color: 'var(--text-content-default, #363B3F)' }}>
        {row.uic}
      </span>
      <MaskedPii
        hn={row.hn}
        masked={maskHivStiName(row.name)}
        full={row.name}
        fieldLabel='ชื่อ-นามสกุล ของผู้รับบริการ'
      />
    </div>
  );

  const renderStatus = (row) => {
    const cancellation = getHivStiRegistryCancellation(row.hn);
    if (cancellation) {
      return (
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
          <ColorfulBadge style='grey' size='small' hierarchy='secondary'>ยกเลิกทะเบียนแล้ว</ColorfulBadge>
          <span style={{ fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary, #858C92)' }}>
            {cancellation.reason} · {cancellation.by} · {cancellation.at}
          </span>
        </div>
      );
    }
    return <ColorfulBadge style='green' size='small' hierarchy='secondary'>ใช้งาน</ColorfulBadge>;
  };

  const renderActions = (row) => {
    const cancellation = getHivStiRegistryCancellation(row.hn);
    /* ติดตามการดูแล (1.10.6.8) เป็นการ "ดู" ข้อมูล — จึงยังกดได้แม้สิทธิ
       เป็น read-only แต่ซ่อนสำหรับทะเบียนที่ยกเลิกไปแล้ว */
    const followUpButton = cancellation ? null : (
      <NeutralSubdueButton
        size='sm'
        leadingIcon='monitoring'
        onClick={(e) => {
          e.stopPropagation();
          history.push({ pathname: '/clinic/hiv-sti/follow-up', state: { hn: row.hn } });
        }}
      >
        ติดตามการดูแล
      </NeutralSubdueButton>
    );
    if (readOnlyRole) {
      return followUpButton && (
        <div className='flex items-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          {followUpButton}
        </div>
      );
    }
    return (
      <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
        {followUpButton}
        {!cancellation && (
          <BrandSubdueButton
            variant='outline'
            size='sm'
            leadingIcon='edit'
            onClick={(e) => { e.stopPropagation(); openEdit(row); }}
          >
            แก้ไข
          </BrandSubdueButton>
        )}
        {cancellation ? (
          <BrandSubdueButton
            variant='outline'
            size='sm'
            leadingIcon='restart_alt'
            onClick={(e) => { e.stopPropagation(); reactivate(row); }}
          >
            เปิดใช้งานอีกครั้ง
          </BrandSubdueButton>
        ) : (
          <NeutralSubdueButton
            size='sm'
            leadingIcon='block'
            onClick={(e) => { e.stopPropagation(); openCancel(row); }}
          >
            ยกเลิก
          </NeutralSubdueButton>
        )}
      </div>
    );
  };

  const columns = useMemo(() => ([
    { key: 'hn',            label: 'HN',                width: 96 },
    { key: 'client',        label: 'ผู้รับบริการ (UIC)',  flex: true, minWidth: 200, render: renderClient },
    { key: 'clientType',    label: 'ประเภท',            width: 96, render: (r) => {
      const b = clientTypeBadge(r.clientType);
      return <ColorfulBadge style={b.style} size='small' hierarchy='secondary'>{b.label}</ColorfulBadge>;
    } },
    { key: 'keyPopulation', label: 'กลุ่มประชากรเฉพาะ',  flex: true, minWidth: 180, render: (r) => keyPopulationLabel(r.keyPopulation) },
    { key: 'occupation',    label: 'อาชีพ',             width: 140, render: (r) => r.occupation || '—' },
    { key: 'referral',      label: 'แหล่งที่มา / ส่งต่อจาก', flex: true, minWidth: 180, render: (r) => r.referral || '—' },
    { key: 'arvStatus',     label: 'สถานะรับยา ARV',    width: 170, render: (r) => {
      const s = resolveArvStatus(r.arvStatus);
      return s
        ? <ColorfulBadge style={ARV_BADGE_STYLE[r.arvStatus] || 'grey'} size='small' hierarchy='secondary'>{s.label}</ColorfulBadge>
        : '—';
    } },
    { key: 'registeredAt',  label: 'ลงทะเบียนเมื่อ',     width: 180, render: (r) => (
      <div className='flex flex-col'>
        <span>{r.registeredAt}</span>
        <span style={{ fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary, #858C92)' }}>
          {r.editedAt ? `แก้ไขล่าสุด ${r.editedAt} · ${r.editedBy}` : `โดย ${r.registeredBy}`}
        </span>
      </div>
    ) },
    { key: 'status',        label: 'สถานะทะเบียน',      width: 200, render: renderStatus },
    { key: 'actions',       label: 'การดำเนินการ',       width: 340, sortable: false, render: renderActions },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ]), [tick, readOnlyRole]);

  const filtersActive = searchQ.trim() !== '' || keyPopFilter !== 'all' || statusFilter !== 'all';
  const editingRow = editorTarget && editorTarget !== 'new' ? editorTarget : null;

  return (
    <QueuePageShell
      activeKey='treat'
      breadcrumb={breadcrumb}
      title='ทะเบียนผู้รับบริการคลินิก HIV/STI'
      summaryCards={summaryCards}
      actions={!readOnlyRole && (
        <BrandSubdueButton variant='fill' leadingIcon='person_add' onClick={openCreate}>
          ลงทะเบียนผู้รับบริการใหม่
        </BrandSubdueButton>
      )}
    >
      <HivStiConfidentialGate>
        {/* ── บันทึก / แก้ไขทะเบียน ── */}
        <Popup
          open={!!editorTarget}
          onClose={requestCloseEditor}
          title={editorTarget === 'new' ? 'ลงทะเบียนผู้รับบริการใหม่' : 'แก้ไขทะเบียนผู้รับบริการ'}
          subtitle='ข้อมูลระดับคลินิก (ข้อมูลทั่วไป — คู่มือ HCIS บทที่ 2) ผูกกับ HN ของเวชระเบียนกลาง'
          size='large'
          tertiaryAction={{ label: 'ยกเลิก', onClick: requestCloseEditor }}
          primaryAction={{ label: editorTarget === 'new' ? 'บันทึกการลงทะเบียน' : 'บันทึกการแก้ไข', onClick: commitSave }}
        >
          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400, 16px)' }}>
            <div className='flex items-start w-full flex-wrap' style={{ gap: 'var(--dim-space-400, 16px)' }}>
              <Field label='HN' required error={formErrors.hn} hint={editingRow ? 'HN แก้ไขไม่ได้ — ผูกกับเวชระเบียนกลาง' : undefined}>
                <InputField value={form.hn} onChange={setField('hn')} placeholder='เช่น 67-00031' disabled={!!editingRow} />
              </Field>
              <Field label='ชื่อ-นามสกุล' required error={formErrors.name}>
                <InputField value={form.name} onChange={setField('name')} placeholder='เช่น นายสมชาย ใจดี' />
              </Field>
              <Field label='UIC code' required error={formErrors.uic} hint='รหัสประจำตัวที่ใช้แสดงแทนชื่อในทุกตาราง (§1.4.2)'>
                <InputField value={form.uic} onChange={setField('uic')} placeholder='เช่น UIC-2530-05-17' />
              </Field>
            </div>
            <div className='flex items-start w-full flex-wrap' style={{ gap: 'var(--dim-space-400, 16px)' }}>
              <Field label='ประเภทผู้รับบริการ' required error={formErrors.clientType}>
                <Select showLabel={false} searchable={false} size='lg' value={form.clientType} onChange={setField('clientType')} options={HIV_STI_CLIENT_TYPES} placeholder='รายใหม่ / รายเก่า' />
              </Field>
              <Field label='อาชีพ'>
                <Select showLabel={false} searchable={false} size='lg' value={form.occupation} onChange={setField('occupation')} options={HIV_STI_OCCUPATIONS} placeholder='เลือกอาชีพ' />
              </Field>
              <Field label='สัญชาติ'>
                <Select showLabel={false} searchable={false} size='lg' value={form.nationality} onChange={setField('nationality')} options={HIV_STI_NATIONALITIES} placeholder='เลือกสัญชาติ' />
              </Field>
            </div>
            <div className='flex items-start w-full flex-wrap' style={{ gap: 'var(--dim-space-400, 16px)' }}>
              <Field label='กลุ่มประชากรเฉพาะ (Key population)' required error={formErrors.keyPopulation} hint='ใช้ศัพท์ CITC อย่างเป็นทางการ'>
                <Select showLabel={false} searchable={false} size='lg' value={form.keyPopulation} onChange={setField('keyPopulation')} options={HIV_STI_KEY_POPULATIONS} placeholder='เลือกกลุ่มประชากรเฉพาะ' />
              </Field>
              <Field label='แหล่งที่มาของโรค / ส่งต่อจาก'>
                <Select showLabel={false} searchable={false} size='lg' value={form.referral} onChange={setField('referral')} options={HIV_STI_REFERRAL_SOURCES} placeholder='เลือกแหล่งที่มา' />
              </Field>
              <Field label='สถานะรับยา ARV' required error={formErrors.arvStatus}>
                <Select showLabel={false} searchable={false} size='lg' value={form.arvStatus} onChange={setField('arvStatus')} options={HIV_STI_ARV_STATUS} placeholder='เลือกสถานะรับยา ARV' />
              </Field>
            </div>

            {/* Audit trail — ผู้บันทึก+เวลา ของรายการเดิม (TOR §1.4.2 audit) */}
            {editingRow && (
              <ConsentAuditBar
                recordedBy={editingRow.registeredBy}
                recordedAt={editingRow.registeredAt}
                editedAt={editingRow.editedAt}
              />
            )}
          </div>
        </Popup>

        {/* Dirty-close guard — บันทึกก่อนออก / ทิ้ง / อยู่ต่อ */}
        <UnsavedChangesPopup
          open={unsavedOpen}
          onClose={() => setUnsavedOpen(false)}
          title='ต้องการบันทึกทะเบียนที่แก้ไขค้างไว้หรือไม่ ?'
          description='ข้อมูลที่กรอกไว้ยังไม่ถูกบันทึก หากออกโดยไม่บันทึก การแก้ไขจะหายไป'
          onSave={() => {
            const ok = commitSave();
            setUnsavedOpen(false);
            if (!ok) return; /* validation failed — stay in editor with errors */
          }}
          onDiscard={() => {
            setUnsavedOpen(false);
            setEditorTarget(null);
          }}
        />

        {/* ── ยกเลิกทะเบียน (ต้องระบุเหตุผล) ── */}
        <Popup
          open={!!cancelTarget}
          onClose={() => setCancelTarget(null)}
          title='ยกเลิกทะเบียนผู้รับบริการ'
          subtitle={cancelTarget ? `${cancelTarget.uic} · HN: ${cancelTarget.hn}` : ''}
          tertiaryAction={{ label: 'ปิด', onClick: () => setCancelTarget(null) }}
          primaryAction={{ label: 'ยืนยันยกเลิกทะเบียน', onClick: confirmCancel, tone: 'danger' }}
        >
          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
            <SuggestibleTextarea
              voice
              value={cancelReason}
              onChange={(e) => { setCancelReason(e.target.value); if (cancelError) setCancelError(''); }}
              suggestions={CANCEL_REASON_SUGGESTIONS}
              minChars={2}
              placeholder='เหตุผลการยกเลิก (จำเป็น) — เช่น ย้ายไปรับบริการที่สถานพยาบาลอื่น'
            />
            {cancelError && (
              <span style={{ color: 'var(--text-input-error, #DC2626)', fontSize: 'var(--type-size-sm, 14px)' }}>
                {cancelError}
              </span>
            )}
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
          <div
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
            {readOnlyRole && (
              <ReadOnlyBanner>
                บัญชีของคุณไม่มีสิทธิแก้ไขทะเบียนคลินิก HIV/STI — เปิดดูได้อย่างเดียว
              </ReadOnlyBanner>
            )}

            <div className='flex flex-wrap items-center w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
              <div
                className='flex items-center flex-1'
                style={{
                  minWidth: 240,
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
                  value={searchQ}
                  onChange={(e) => setSearchQ(e.target.value)}
                  placeholder='ค้นหา HN / ชื่อ-สกุล / UIC'
                  className='flex-1 bg-transparent border-none outline-none text-sm'
                  style={{ color: 'var(--text-content-primary)' }}
                />
                {searchQ && (
                  <button type='button' onClick={() => setSearchQ('')} aria-label='ล้างคำค้น' style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-content-tertiary, #858C92)' }}>
                    <Icon name='close' size={16} />
                  </button>
                )}
              </div>
              <Select
                showLabel={false} searchable={false} size='md'
                value={keyPopFilter}
                onChange={setKeyPopFilter}
                options={[{ value: 'all', label: 'ทุกกลุ่มประชากร' }, ...HIV_STI_KEY_POPULATIONS]}
                placeholder='กลุ่มประชากรเฉพาะ'
              />
              <Select
                showLabel={false} searchable={false} size='md'
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  { value: 'all', label: 'ทุกสถานะ' },
                  { value: 'active', label: 'ใช้งาน' },
                  { value: 'cancelled', label: 'ยกเลิกแล้ว' },
                ]}
                placeholder='สถานะทะเบียน'
              />
              {filtersActive && (
                <NeutralSubdueButton
                  variant='outline'
                  size='sm'
                  onClick={() => { setSearchQ(''); setKeyPopFilter('all'); setStatusFilter('all'); }}
                >
                  ล้างตัวกรอง
                </NeutralSubdueButton>
              )}
            </div>

            {filtered.length === 0 ? (
              <div
                className='flex flex-col items-center text-center w-full'
                style={{
                  paddingTop: 'var(--dim-space-700, 32px)',
                  paddingBottom: 'var(--dim-space-700, 32px)',
                  gap: 'var(--dim-space-300, 12px)',
                }}
              >
                <Icon name='search_off' size={40} style={{ color: 'var(--text-content-quaternary, #ADB2B7)' }} />
                <span style={{ fontSize: 'var(--type-size-base, 16px)', fontWeight: 'var(--type-weight-medium)', color: 'var(--text-content-default, #363B3F)' }}>
                  {filtersActive ? 'ไม่พบผู้รับบริการ' : 'ยังไม่มีทะเบียนผู้รับบริการ'}
                </span>
                {filtersActive ? (
                  <NeutralSubdueButton variant='outline' size='sm' onClick={() => { setSearchQ(''); setKeyPopFilter('all'); setStatusFilter('all'); }}>
                    ล้างตัวกรอง
                  </NeutralSubdueButton>
                ) : (!readOnlyRole && (
                  <BrandSubdueButton variant='fill' size='sm' leadingIcon='person_add' onClick={openCreate}>
                    ลงทะเบียนผู้รับบริการใหม่
                  </BrandSubdueButton>
                ))}
              </div>
            ) : (
              <>
                <Table
                  columns={columns}
                  rows={pageRows}
                  rowKey={(row) => row.hn}
                  onRowClick={readOnlyRole ? undefined : openEdit}
                  emptyMessage='ไม่พบรายการ'
                />
                <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                  <span style={{ color: 'var(--text-content-secondary, #636B72)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm, 14px)' }}>
                    {`แสดง ${rangeStart}–${rangeEnd} จาก ${filtered.length} รายการ`}
                  </span>
                  <div className='flex-1' />
                  <Pagination currentPage={page} pageCount={totalPages} onPageChange={setPage} />
                </div>
              </>
            )}
          </div>
        </div>
      </HivStiConfidentialGate>
    </QueuePageShell>
  );
};

export default HivStiRegistryPage;
