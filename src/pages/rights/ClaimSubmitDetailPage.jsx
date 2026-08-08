import React, { useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import PatientCard from '@/components/card/PatientCard';
import Table from '@/components/table/Table';
import Select from '@/components/forms/Select';
import DiagTypeSelect from '@/components/forms/DiagTypeSelect';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import Alert from '@/components/alert/Alert';
import Popup from '@/components/popup/Popup';
import StatusBadge from '@/components/badge/StatusBadge';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import BrandPrimaryButton from '@/components/button/BrandPrimaryButton';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import DangerSubdueButton from '@/components/button/DangerSubdueButton';
import BrandIconButton from '@/components/button/BrandIconButton';
import { DIAGNOSIS_TYPE_OPTIONS, resolveDiagnosisType } from '@/data/treatmentVisits';
import {
  SectionCard,
  FieldGrid,
  ReadField,
  EmptyState,
  AuditNote,
  AuditList,
  LookupPopup,
  ReasonPopup,
  DiscardChangesPopup,
  PermissionHint,
  RoleSwitcher,
  useRightsClaimTick,
  T,
} from '@/pages/rights/rightsUi';
import {
  visitById,
  rightsById,
  clinicByKey,
  clinicLabelOf,
  CLINICS,
  ICD10_CATALOG,
  ICD9CM_CATALOG,
  PROCEDURE_STATUS_OPTIONS,
  procedureStatusLabel,
  icd10ByCode,
  icd9ByCode,
  saveVisitSubmitForm,
  confirmVisitTreatment,
  confirmVisitCodes,
  requestVisitRework,
  submitStatusOf,
  submitStatusMeta,
  computeVisitClaim,
  formatBaht,
  maskNationalId,
  formatNationalIdFull,
  visitKindMeta,
  getClaimRole,
  getClaimRoleKey,
  setClaimRoleKey,
  setRightsSection,
  PAYER_KINDS,
} from '@/data/rightsClaimStore';

/* §1.7.3.2 – §1.7.3.6 — ฟอร์มตรวจสอบ/ยืนยันข้อมูลส่งเบิกรายครั้งบริการ.

   Each of the four TOR verbs is a real action on this page:
     แสดง    — every field of the Close-Visit record, plus the claim split
     บันทึก   — "บันทึกข้อมูลส่งเบิก" writes the draft back to the store
     ยกเลิก   — restores the draft from the store (and guards navigation)
     แก้ไข    — clinic/sub-clinic/doctor selects + add/edit/delete on both
                code tables; after confirmation the form locks and "ขอแก้ไข"
                (reason required) reopens it and pushes the visit back to
                ต้องแก้ไข in the queue.

   §1.7.3.5 and §1.7.3.6 are two SEPARATE confirmations on purpose — the TOR
   lists them as distinct requirements, and in practice the coder who signs
   off the ICD codes is not the officer who signs off the treatment record.
   Both are gated on the mock role (เจ้าหน้าที่เบิกจ่าย may confirm,
   เจ้าหน้าที่ทั่วไป is read-only). */

const NOTE_SUGGESTIONS = [
  'ตรวจสอบแล้วข้อมูลการรักษาตรงกับเวชระเบียน ไม่มีรายการที่ต้องแก้ไข',
  'ตรวจสอบแล้ว รหัส ICD10 หลักสอดคล้องกับการวินิจฉัยของแพทย์ผู้ตรวจ',
  'เพิ่มรหัสโรคร่วมตามผลตรวจทางห้องปฏิบัติการที่แนบมาในครั้งบริการนี้',
  'แก้ไขคลินิกย่อยให้ตรงกับห้องตรวจที่ให้บริการจริง',
  'ระบุแพทย์ผู้วินิจฉัยเพิ่ม เนื่องจากเดิมบันทึกไม่ครบ',
  'หัตถการรายการนี้ทำโดยพยาบาลวิชาชีพภายใต้การกำกับของแพทย์เจ้าของไข้',
  'รอเอกสารยืนยันสิทธิจากหน่วยงานต้นสังกัดก่อนส่งเบิก',
];

const REWORK_PRESETS = [
  'รหัส ICD10 ไม่สอดคล้องกับบันทึกการรักษา',
  'ระบุแพทย์ผู้ตรวจไม่ถูกต้อง',
  'ขาดรหัสหัตถการที่ทำจริง',
  'ผู้เรียกเก็บตีกลับให้แก้ไขข้อมูล',
];

const makeDraft = (visit) => ({
  clinicKey: visit.clinicKey,
  subClinic: visit.subClinic,
  doctor: visit.doctor,
  icd10: visit.icd10.map((d) => ({ ...d })),
  icd9: visit.icd9.map((p) => ({ ...p })),
});

const sameDraft = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const ClaimSubmitDetailPage = () => {
  useRightsClaimTick();
  const { visitId } = useParams();
  const history = useHistory();
  const visit = visitById(visitId);
  const role = getClaimRole();

  const [draft, setDraft] = useState(() => (visit ? makeDraft(visit) : null));
  const [note, setNote] = useState('');
  const [addDxOpen, setAddDxOpen] = useState(false);
  const [addPxOpen, setAddPxOpen] = useState(false);
  const [editDxCode, setEditDxCode] = useState(null);   // row id being re-coded
  const [editPxCode, setEditPxCode] = useState(null);
  const [confirmKind, setConfirmKind] = useState(null); // 'treatment' | 'code'
  const [reworkScope, setReworkScope] = useState(null); // 'treatment' | 'code' | 'both'
  const [discardOpen, setDiscardOpen] = useState(false);
  const [pendingBack, setPendingBack] = useState(false);
  const [revealId, setRevealId] = useState(false);
  const [saved, setSaved] = useState(false);

  const goBackToQueue = () => {
    setRightsSection('submit');
    history.push('/rights');
  };

  if (!visit || !draft) {
    return (
      <QueuePageShell
        activeKey='rights'
        breadcrumb={['ระบบงานสิทธิและการเบิกจ่าย', 'ตรวจสอบข้อมูลส่งเบิก']}
        title='ตรวจสอบข้อมูลส่งเบิก'
        onBack={goBackToQueue}
        backLabel='กลับไปคิวส่งเบิก'
      >
        <div style={{ paddingTop: 'var(--dim-space-800)', paddingBottom: 'var(--dim-space-800)' }}>
          <EmptyState
            icon='error'
            title='ไม่พบครั้งบริการที่ระบุ'
            subtext='รายการนี้อาจถูกลบหรือลิงก์ไม่ถูกต้อง — กลับไปเลือกจากคิวส่งเบิกอีกครั้ง'
          />
        </div>
      </QueuePageShell>
    );
  }

  const status = submitStatusOf(visit);
  const statusMeta = submitStatusMeta(status);
  const locked = visit.treatmentConfirm.confirmed && visit.codeConfirm.confirmed;
  const readOnly = locked || !role.canEdit;
  const dirty = !sameDraft(draft, makeDraft(visit));
  const claim = computeVisitClaim(visit);
  const rights = rightsById(visit.billingRightsId);
  const clinic = clinicByKey(draft.clinicKey);

  /* Changing the clinic invalidates its sub-clinic + doctor lists, so both
     snap to the new clinic's first entry rather than keeping a value that
     doesn't belong to it. */
  const changeClinic = (key) => {
    const next = clinicByKey(key);
    setDraft((d) => ({
      ...d,
      clinicKey: key,
      subClinic: next.subClinics[0],
      doctor: next.doctors.includes(d.doctor) ? d.doctor : next.doctors[0],
    }));
  };

  const resetDraft = () => { setDraft(makeDraft(visit)); setNote(''); setSaved(false); };

  const handleSave = () => {
    saveVisitSubmitForm(visit.id, draft, role.userName);
    setSaved(true);
  };

  const attemptBack = () => {
    if (dirty) { setPendingBack(true); setDiscardOpen(true); return; }
    goBackToQueue();
  };

  /* ── ICD10 table (§1.7.3.3) ── */
  const addDx = (code) => {
    const meta = icd10ByCode(code);
    if (!meta) return;
    setDraft((d) => ({
      ...d,
      icd10: [...d.icd10, {
        id: `dx-new-${Date.now()}`,
        code: meta.code,
        term: meta.term,
        termTh: meta.termTh,
        /* First code on an empty visit is the principal diagnosis; anything
           after that defaults to โรคร่วม so two Principal DX never coexist. */
        diagType: d.icd10.length === 0 ? 'principle' : 'comorbidity',
        doctor: d.doctor,
      }],
    }));
  };
  const patchDx = (id, patch) => setDraft((d) => ({
    ...d,
    icd10: d.icd10.map((r) => (r.id === id ? { ...r, ...patch } : r)),
  }));
  const removeDx = (id) => setDraft((d) => ({ ...d, icd10: d.icd10.filter((r) => r.id !== id) }));

  /* ── ICD9CM table (§1.7.3.4) ── */
  const addPx = (code) => {
    const meta = icd9ByCode(code);
    if (!meta) return;
    setDraft((d) => ({
      ...d,
      icd9: [...d.icd9, {
        id: `px-new-${Date.now()}`,
        code: meta.code,
        term: meta.term,
        termTh: meta.termTh,
        status: d.icd9.length === 0 ? 'primary' : 'secondary',
        performer: d.doctor,
      }],
    }));
  };
  const patchPx = (id, patch) => setDraft((d) => ({
    ...d,
    icd9: d.icd9.map((r) => (r.id === id ? { ...r, ...patch } : r)),
  }));
  const removePx = (id) => setDraft((d) => ({ ...d, icd9: d.icd9.filter((r) => r.id !== id) }));

  const doctorOptions = clinic.doctors.map((d) => ({ value: d, label: d }));

  const dxColumns = [
    {
      key: 'code', label: 'รหัส ICD10', width: 150,
      render: (row) => (
        <div className='flex items-center min-w-0' style={{ gap: 'var(--dim-space-150)' }}>
          <span style={T.value}>{row.code}</span>
          {!readOnly && (
            <BrandIconButton
              icon='edit'
              size='sm'
              variant='ghost'
              aria-label='แก้ไขรหัสโรค'
              onClick={(e) => { e.stopPropagation(); setEditDxCode(row.id); }}
            />
          )}
        </div>
      ),
    },
    {
      key: 'term', label: 'ชื่อโรค', flex: true, minWidth: 220,
      render: (row) => (
        <div className='flex flex-col min-w-0'>
          <span style={T.value}>{row.termTh || row.term}</span>
          <span style={T.muted}>{row.term}</span>
        </div>
      ),
    },
    {
      key: 'diagType', label: 'สถานะการวินิจฉัย', width: 260, sortable: false,
      render: (row) => (readOnly ? (
        <ColorfulBadge badgeStyle={resolveDiagnosisType(row.diagType).badgeStyle} size='small'>
          {resolveDiagnosisType(row.diagType).labelEn}
        </ColorfulBadge>
      ) : (
        <div onClick={(e) => e.stopPropagation()} style={{ width: '100%' }}>
          <DiagTypeSelect
            label={null}
            value={row.diagType}
            options={DIAGNOSIS_TYPE_OPTIONS}
            onChange={(v) => patchDx(row.id, { diagType: v })}
          />
        </div>
      )),
    },
    {
      key: 'doctor', label: 'แพทย์ผู้วินิจฉัย', width: 220, sortable: false,
      render: (row) => (readOnly ? <span style={T.value}>{row.doctor}</span> : (
        <div onClick={(e) => e.stopPropagation()} style={{ width: '100%' }}>
          <Select
            showLabel={false}
            showHelperText={false}
            showLeadingIcon={false}
            searchable={false}
            size='md'
            placeholder='เลือกแพทย์'
            value={row.doctor}
            options={doctorOptions}
            onChange={(v) => patchDx(row.id, { doctor: v })}
          />
        </div>
      )),
    },
    ...(readOnly ? [] : [{
      key: 'remove', label: '', width: 64, sortable: false,
      render: (row) => (
        <BrandIconButton
          icon='delete'
          size='sm'
          variant='ghost'
          aria-label='ลบรหัสโรค'
          onClick={(e) => { e.stopPropagation(); removeDx(row.id); }}
        />
      ),
    }]),
  ];

  const pxColumns = [
    {
      key: 'code', label: 'รหัส ICD9CM', width: 150,
      render: (row) => (
        <div className='flex items-center min-w-0' style={{ gap: 'var(--dim-space-150)' }}>
          <span style={T.value}>{row.code}</span>
          {!readOnly && (
            <BrandIconButton
              icon='edit'
              size='sm'
              variant='ghost'
              aria-label='แก้ไขรหัสหัตถการ'
              onClick={(e) => { e.stopPropagation(); setEditPxCode(row.id); }}
            />
          )}
        </div>
      ),
    },
    {
      key: 'term', label: 'ชื่อหัตถการ', flex: true, minWidth: 220,
      render: (row) => (
        <div className='flex flex-col min-w-0'>
          <span style={T.value}>{row.termTh || row.term}</span>
          <span style={T.muted}>{row.term}</span>
        </div>
      ),
    },
    {
      key: 'status', label: 'สถานะ', width: 200, sortable: false,
      render: (row) => (readOnly ? <span style={T.value}>{procedureStatusLabel(row.status)}</span> : (
        <div onClick={(e) => e.stopPropagation()} style={{ width: '100%' }}>
          <Select
            showLabel={false}
            showHelperText={false}
            showLeadingIcon={false}
            searchable={false}
            size='md'
            placeholder='เลือกสถานะ'
            value={row.status}
            options={PROCEDURE_STATUS_OPTIONS}
            onChange={(v) => patchPx(row.id, { status: v })}
          />
        </div>
      )),
    },
    {
      key: 'performer', label: 'ผู้ทำหัตถการ', width: 220, sortable: false,
      render: (row) => (readOnly ? <span style={T.value}>{row.performer}</span> : (
        <div onClick={(e) => e.stopPropagation()} style={{ width: '100%' }}>
          <Select
            showLabel={false}
            showHelperText={false}
            showLeadingIcon={false}
            searchable={false}
            size='md'
            placeholder='เลือกผู้ทำหัตถการ'
            value={row.performer}
            options={doctorOptions}
            onChange={(v) => patchPx(row.id, { performer: v })}
          />
        </div>
      )),
    },
    ...(readOnly ? [] : [{
      key: 'remove', label: '', width: 64, sortable: false,
      render: (row) => (
        <BrandIconButton
          icon='delete'
          size='sm'
          variant='ghost'
          aria-label='ลบรหัสหัตถการ'
          onClick={(e) => { e.stopPropagation(); removePx(row.id); }}
        />
      ),
    }]),
  ];

  /* Plain array, not useMemo — this sits AFTER the "visit not found" early
     return, so a hook here would be a conditional hook. */
  const chargeColumns = [
    { key: 'label', label: 'รายการค่าใช้จ่าย', flex: true, minWidth: 220 },
    {
      key: 'payer', label: 'ผู้รับผิดชอบ', width: 130,
      render: (l) => <ColorfulBadge badgeStyle={PAYER_KINDS[l.payer].badge} size='small'>{PAYER_KINDS[l.payer].label}</ColorfulBadge>,
    },
    { key: 'amount', label: 'ราคาเต็ม', width: 110, render: (l) => <span style={T.value}>{formatBaht(l.amount)}</span> },
    { key: 'claimAmount', label: 'ส่วนเรียกเก็บ', width: 130, render: (l) => <span style={{ ...T.value, color: 'var(--text-statusbadge-success, #196C65)' }}>{formatBaht(l.claimAmount)}</span> },
    { key: 'cashAmount', label: 'ส่วนเงินสด', width: 120, render: (l) => <span style={T.value}>{formatBaht(l.cashAmount)}</span> },
  ];

  const dxCatalogRows = ICD10_CATALOG;
  const pxCatalogRows = ICD9CM_CATALOG;

  const editingDxRow = editDxCode ? draft.icd10.find((r) => r.id === editDxCode) : null;
  const editingPxRow = editPxCode ? draft.icd9.find((r) => r.id === editPxCode) : null;

  const hasPrincipal = draft.icd10.some((d) => d.diagType === 'principle');
  const multiplePrincipal = draft.icd10.filter((d) => d.diagType === 'principle').length > 1;

  return (
    <QueuePageShell
      activeKey='rights'
      breadcrumb={['ระบบงานสิทธิและการเบิกจ่าย', 'คิวส่งเบิก', visit.visitNo]}
      title={`ตรวจสอบข้อมูลส่งเบิก · ${visit.visitNo}`}
      onBack={attemptBack}
      backLabel='กลับไปคิวส่งเบิก'
      actions={(
        <div className='flex items-center flex-wrap justify-end' style={{ gap: 'var(--dim-space-300)' }}>
          <RoleSwitcher value={getClaimRoleKey()} onChange={setClaimRoleKey} />
          <BrandSubdueButton variant='outline' size='md' leadingIcon='print' onClick={() => window.print()}>
            พิมพ์สรุปรายการส่งเบิก
          </BrandSubdueButton>
        </div>
      )}
    >
      <div
        className='flex flex-col flex-1 min-w-0'
        style={{
          paddingTop: 'var(--dim-space-600)',
          paddingRight: 'var(--dim-space-600)',
          paddingBottom: 'var(--dim-space-600)',
          paddingLeft: 'var(--dim-space-600)',
          gap: 'var(--dim-space-500)',
        }}
      >
        <PatientCard
          patient={visit.patient}
          embedded
          tags={(
            <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
              <ColorfulBadge badgeStyle='indigo' size='small'>HN {visit.hn}</ColorfulBadge>
              <ColorfulBadge badgeStyle='teal' size='small'>
                บัตรประชาชน {revealId && role.canRevealId ? formatNationalIdFull(visit.patient.nationalId) : maskNationalId(visit.patient.nationalId)}
              </ColorfulBadge>
              <ColorfulBadge badgeStyle={rights?.badge || 'grey'} size='small'>{rights?.name || '-'}</ColorfulBadge>
              <ColorfulBadge badgeStyle={visitKindMeta(visit.visitKind).badge} size='small'>{visitKindMeta(visit.visitKind).label}</ColorfulBadge>
            </div>
          )}
        />

        {locked && (
          <Alert
            type='success'
            title='ครั้งบริการนี้ยืนยันครบทั้งสองส่วนแล้ว — ฟอร์มถูกล็อกเป็นอ่านอย่างเดียว'
            subtext={`ข้อมูลการรักษา: ${visit.treatmentConfirm.by} · ${visit.treatmentConfirm.at} — รหัสโรค: ${visit.codeConfirm.by} · ${visit.codeConfirm.at}`}
            detail={(
              <div className='flex justify-end w-full'>
                <DangerSubdueButton
                  size='sm'
                  disabled={!role.canConfirm}
                  title={role.canConfirm ? undefined : 'ต้องเป็นเจ้าหน้าที่เบิกจ่าย'}
                  onClick={() => setReworkScope('both')}
                >
                  ขอแก้ไขข้อมูล
                </DangerSubdueButton>
              </div>
            )}
          />
        )}

        {visit.reworkReason && (
          <Alert
            type='error'
            title='รายการนี้ถูกตีกลับให้แก้ไข'
            subtext={visit.reworkReason}
          />
        )}

        {!role.canEdit && !locked && (
          <Alert
            type='info'
            title='คุณกำลังดูในโหมดอ่านอย่างเดียว'
            subtext='บทบาท “เจ้าหน้าที่ทั่วไป” ดูข้อมูลได้แต่แก้ไขและยืนยันไม่ได้ — สลับบทบาทที่มุมขวาบนเพื่อทดลองสิทธิเจ้าหน้าที่เบิกจ่าย'
          />
        )}

        {saved && !dirty && (
          <Alert type='success' title='บันทึกข้อมูลส่งเบิกแล้ว' subtext={`บันทึกโดย ${visit.savedBy} · ${visit.savedAt}`} />
        )}

        {/* ── ข้อมูลการรับบริการครั้งนี้ (§1.7.3.1) ── */}
        <SectionCard
          title='ข้อมูลการรับบริการครั้งนี้'
          subtitle='ดึงจากครั้งบริการที่ Close Visit แล้ว'
          icon='assignment_turned_in'
          actions={<StatusBadge style={statusMeta.color === 'positive' ? 'success' : statusMeta.color} size='small'>{statusMeta.label}</StatusBadge>}
        >
          <FieldGrid cols={4}>
            <ReadField label='เลขที่การมารับบริการ' value={visit.visitNo} />
            <ReadField label='วันที่-เวลารับบริการ' value={`${visit.visitDate} · ${visit.visitTime} น.`} />
            <ReadField label='สิทธิที่ใช้เรียกเก็บ' value={rights?.name} />
            <ReadField label='ประเภทผู้รับบริการ' value={visitKindMeta(visit.visitKind).label} />
          </FieldGrid>
          <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-300)' }}>
            <NeutralSubdueButton
              size='sm'
              variant='outline'
              leadingIcon={revealId ? 'visibility_off' : 'visibility'}
              disabled={!role.canRevealId}
              title={role.canRevealId ? undefined : 'ต้องเป็นเจ้าหน้าที่เบิกจ่ายจึงจะเปิดเลขบัตรเต็มได้'}
              onClick={() => setRevealId((v) => !v)}
            >
              {revealId ? 'ซ่อนเลขบัตรประชาชน' : 'แสดงเลขบัตรประชาชนเต็ม'}
            </NeutralSubdueButton>
          </div>
        </SectionCard>

        {/* ── §1.7.3.2 คลินิก / คลินิกย่อย / แพทย์ผู้ตรวจ ── */}
        <SectionCard
          title='คลินิก คลินิกย่อย และแพทย์ผู้ตรวจ'
          subtitle='TOR §1.7.3.2 — แก้ไขได้เมื่อยังไม่ยืนยัน'
          icon='medical_information'
        >
          {readOnly ? (
            <FieldGrid cols={3}>
              <ReadField label='คลินิก' value={clinicLabelOf(visit)} />
              <ReadField label='คลินิกย่อย' value={visit.subClinic} />
              <ReadField label='แพทย์ผู้ตรวจ' value={visit.doctor} />
            </FieldGrid>
          ) : (
            <div className='grid' style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 'var(--dim-space-400)' }}>
              <Select
                label='คลินิก'
                required
                searchable={false}
                showHelperText={false}
                showLeadingIcon={false}
                placeholder='เลือกคลินิก'
                value={draft.clinicKey}
                options={CLINICS.map((c) => ({ value: c.key, label: c.label }))}
                onChange={changeClinic}
              />
              <Select
                label='คลินิกย่อย'
                required
                searchable={false}
                showHelperText={false}
                showLeadingIcon={false}
                placeholder='เลือกคลินิกย่อย'
                value={draft.subClinic}
                options={clinic.subClinics.map((s) => ({ value: s, label: s }))}
                onChange={(v) => setDraft((d) => ({ ...d, subClinic: v }))}
              />
              <Select
                label='แพทย์ผู้ตรวจ'
                required
                searchable={false}
                showHelperText={false}
                showLeadingIcon={false}
                placeholder='เลือกแพทย์ผู้ตรวจ'
                value={draft.doctor}
                options={doctorOptions}
                onChange={(v) => setDraft((d) => ({ ...d, doctor: v }))}
              />
            </div>
          )}
          <AuditNote prefix='บันทึกล่าสุดโดย' by={visit.savedBy} at={visit.savedAt} />
        </SectionCard>

        {/* ── §1.7.3.3 ICD10 ── */}
        <SectionCard
          title='รหัสโรค (ICD10)'
          subtitle='TOR §1.7.3.3 — รหัส + สถานะการวินิจฉัย + แพทย์ผู้วินิจฉัย'
          icon='coronavirus'
          actions={!readOnly && (
            <BrandSubdueButton size='sm' leadingIcon='add' onClick={() => setAddDxOpen(true)}>
              เพิ่มรหัสโรค
            </BrandSubdueButton>
          )}
        >
          {draft.icd10.length === 0 ? (
            <EmptyState icon='playlist_add' title='ยังไม่มีรหัสโรคในครั้งบริการนี้' subtext='กด “เพิ่มรหัสโรค” เพื่อค้นหาและเลือกรหัส ICD10' />
          ) : (
            <Table columns={dxColumns} rows={draft.icd10} rowKey={(r) => r.id} emptyMessage='ยังไม่มีรหัสโรค' />
          )}
          {!hasPrincipal && draft.icd10.length > 0 && (
            <Alert type='warning' title='ยังไม่มีการวินิจฉัยโรคหลัก (Principal DX)' subtext='ไฟล์ ODX ของ 16 แฟ้มต้องมีรหัสโรคหลักอย่างน้อย 1 รายการ' />
          )}
          {multiplePrincipal && (
            <Alert type='error' title='มีการวินิจฉัยโรคหลักมากกว่า 1 รายการ' subtext='ปรับสถานะรายการที่เกินเป็น CO-MORBIDITY หรือ COMPLICATION ก่อนยืนยัน' />
          )}
          <AuditNote prefix='ยืนยันรหัสโรคโดย' by={visit.codeConfirm.by} at={visit.codeConfirm.at} />
        </SectionCard>

        {/* ── §1.7.3.4 ICD9CM ── */}
        <SectionCard
          title='รหัสหัตถการ (ICD9CM)'
          subtitle='TOR §1.7.3.4 — รหัส + สถานะ + ผู้ทำหัตถการ'
          icon='healing'
          actions={!readOnly && (
            <BrandSubdueButton size='sm' leadingIcon='add' onClick={() => setAddPxOpen(true)}>
              เพิ่มรหัสหัตถการ
            </BrandSubdueButton>
          )}
        >
          {draft.icd9.length === 0 ? (
            <EmptyState icon='playlist_add' title='ไม่มีหัตถการในครั้งบริการนี้' subtext='ครั้งบริการที่ไม่มีหัตถการปล่อยว่างได้ — แฟ้ม OOP จะไม่มีบรรทัดของ visit นี้' />
          ) : (
            <Table columns={pxColumns} rows={draft.icd9} rowKey={(r) => r.id} emptyMessage='ไม่มีหัตถการ' />
          )}
        </SectionCard>

        {/* ── ยอดเรียกเก็บของครั้งบริการนี้ (อ่านอย่างเดียว — แก้ที่ section เรียกเก็บ) ── */}
        <SectionCard
          title='ยอดค่าใช้จ่ายและการเรียกเก็บของครั้งบริการนี้'
          subtitle='คำนวณจากสิทธิที่ใช้เรียกเก็บ — แก้ไขสิทธิ/ประเภท/ต้นสังกัดได้ที่แท็บ “เรียกเก็บ Claim”'
          icon='request_quote'
          tone='muted'
        >
          <Table columns={chargeColumns} rows={claim.lines} rowKey={(l) => l.id} emptyMessage='ไม่มีรายการค่าใช้จ่าย' />
          <FieldGrid cols={4}>
            <ReadField label='ค่าใช้จ่ายรวม' value={formatBaht(claim.totalCharge)} />
            <ReadField label='ยอดเรียกเก็บ' value={formatBaht(claim.claimTotal)} tone='var(--text-statusbadge-success, #196C65)' />
            <ReadField label='ส่วนเงินสด' value={formatBaht(claim.cashTotal)} />
            <ReadField label='ค้างชำระ' value={formatBaht(claim.cashOutstanding)} tone={claim.cashOutstanding > 0 ? 'var(--text-statusbadge-error, #B91C1C)' : undefined} />
          </FieldGrid>
          {claim.selfPay && (
            <Alert
              type='warning'
              title={visit.rightsExpired ? 'สิทธิของครั้งบริการนี้หมดอายุ' : 'ครั้งบริการนี้เป็นชำระเงินเอง'}
              subtext='ทุกบรรทัดตกเป็นเงินสด ไม่มีส่วนที่เรียกเก็บได้ — ตรวจสอบสิทธิที่แท็บ “เช็คสิทธิ” ก่อนส่งเบิก'
            />
          )}
        </SectionCard>

        {/* ── หมายเหตุการตรวจสอบ ── */}
        <SectionCard title='หมายเหตุการตรวจสอบ' subtitle='บันทึกไว้กับการยืนยันเป็นหลักฐาน' icon='edit_note'>
          <SuggestibleTextarea
            voice
            label='หมายเหตุของผู้ตรวจสอบ'
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder='เช่น ตรวจสอบแล้วข้อมูลตรงกับเวชระเบียน ไม่มีรายการที่ต้องแก้ไข'
            suggestions={NOTE_SUGGESTIONS}
            minChars={2}
            height={140}
            minHeight={96}
            disabled={readOnly}
          />
        </SectionCard>

        {/* ── §1.7.3.5 / §1.7.3.6 — สองส่วนแยกกัน ── */}
        <div className='grid' style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 'var(--dim-space-400)' }}>
          <SectionCard
            title='ยืนยันข้อมูลการรักษา'
            subtitle='TOR §1.7.3.5 — ตรวจสอบ ยืนยัน และแก้ไขได้ตามสิทธิของผู้ใช้งาน'
            icon='verified'
          >
            {visit.treatmentConfirm.confirmed ? (
              <>
                <StatusBadge style='success' icon='check_circle' size='small'>ยืนยันแล้ว</StatusBadge>
                <AuditNote prefix='ยืนยันโดย' by={visit.treatmentConfirm.by} at={visit.treatmentConfirm.at} detail={visit.treatmentConfirm.note} />
                <div className='flex justify-start'>
                  <NeutralSubdueButton
                    size='sm'
                    variant='outline'
                    disabled={!role.canConfirm}
                    onClick={() => setReworkScope('treatment')}
                  >
                    ขอแก้ไขข้อมูลการรักษา
                  </NeutralSubdueButton>
                </div>
              </>
            ) : (
              <>
                <StatusBadge style='info' icon='hourglass_top' size='small'>รอตรวจสอบ</StatusBadge>
                <span style={T.body}>ตรวจคลินิก/คลินิกย่อย/แพทย์ผู้ตรวจให้ตรงกับเวชระเบียนก่อนยืนยัน</span>
                <div className='flex justify-start'>
                  <BrandPrimaryButton
                    size='sm'
                    leadingIcon='check'
                    disabled={!role.canConfirm || dirty}
                    title={dirty ? 'บันทึกการแก้ไขก่อนยืนยัน' : role.canConfirm ? undefined : 'ต้องเป็นเจ้าหน้าที่เบิกจ่าย'}
                    onClick={() => setConfirmKind('treatment')}
                  >
                    ยืนยันข้อมูลการรักษา
                  </BrandPrimaryButton>
                </div>
                <PermissionHint show={!role.canConfirm} />
                {dirty && <span style={{ ...T.muted, color: 'var(--text-statusbadge-warning, #C2410C)' }}>มีการแก้ไขที่ยังไม่บันทึก — กด “บันทึกข้อมูลส่งเบิก” ก่อนยืนยัน</span>}
              </>
            )}
          </SectionCard>

          <SectionCard
            title='ยืนยันรหัสโรค'
            subtitle='TOR §1.7.3.6 — ตรวจสอบรหัสโรค ยืนยัน และแก้ไขได้ตามสิทธิของผู้ใช้งาน'
            icon='fact_check'
          >
            {visit.codeConfirm.confirmed ? (
              <>
                <StatusBadge style='success' icon='check_circle' size='small'>ยืนยันแล้ว</StatusBadge>
                <AuditNote prefix='ยืนยันโดย' by={visit.codeConfirm.by} at={visit.codeConfirm.at} detail={visit.codeConfirm.note} />
                <div className='flex justify-start'>
                  <NeutralSubdueButton
                    size='sm'
                    variant='outline'
                    disabled={!role.canConfirm}
                    onClick={() => setReworkScope('code')}
                  >
                    ขอแก้ไขรหัสโรค
                  </NeutralSubdueButton>
                </div>
              </>
            ) : (
              <>
                <StatusBadge style='info' icon='hourglass_top' size='small'>รอตรวจสอบ</StatusBadge>
                <span style={T.body}>ต้องมีรหัสโรคหลัก 1 รายการ และไม่ซ้ำกันมากกว่าหนึ่ง ก่อนยืนยัน</span>
                <div className='flex justify-start'>
                  <BrandPrimaryButton
                    size='sm'
                    leadingIcon='check'
                    disabled={!role.canConfirm || dirty || !hasPrincipal || multiplePrincipal}
                    title={!hasPrincipal ? 'ต้องมีรหัสโรคหลักก่อน' : multiplePrincipal ? 'มีรหัสโรคหลักมากกว่า 1 รายการ' : dirty ? 'บันทึกการแก้ไขก่อนยืนยัน' : undefined}
                    onClick={() => setConfirmKind('code')}
                  >
                    ยืนยันรหัสโรค
                  </BrandPrimaryButton>
                </div>
                <PermissionHint show={!role.canConfirm} />
              </>
            )}
          </SectionCard>
        </div>

        <SectionCard title='ประวัติการแก้ไข / ยืนยันของครั้งบริการนี้' icon='history' tone='muted'>
          <AuditList entries={visit.audit} emptyText='ยังไม่มีการแก้ไขในรอบการใช้งานนี้' />
        </SectionCard>

        {/* ── footer actions: แสดง / บันทึก / ยกเลิก / แก้ไข ── */}
        <div
          className='flex items-center flex-wrap w-full'
          style={{
            gap: 'var(--dim-space-300)',
            borderTop: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary)',
            paddingTop: 'var(--dim-space-400)',
          }}
        >
          <NeutralSubdueButton size='lg' leadingIcon='arrow_back' onClick={attemptBack}>
            กลับไปคิวส่งเบิก
          </NeutralSubdueButton>
          <div className='flex-1' />
          <NeutralSubdueButton
            size='lg'
            variant='outline'
            disabled={!dirty}
            onClick={() => setDiscardOpen(true)}
          >
            ยกเลิกการแก้ไข
          </NeutralSubdueButton>
          <BrandPrimaryButton
            size='lg'
            leadingIcon='save'
            disabled={readOnly || !dirty || multiplePrincipal}
            title={readOnly ? 'ฟอร์มถูกล็อก — กด “ขอแก้ไข” ก่อน' : undefined}
            onClick={handleSave}
          >
            บันทึกข้อมูลส่งเบิก
          </BrandPrimaryButton>
        </div>
      </div>

      {/* ── code lookups ── */}
      <LookupPopup
        open={addDxOpen}
        onClose={() => setAddDxOpen(false)}
        onConfirm={(code) => addDx(code)}
        title='เพิ่มรหัสโรค (ICD10)'
        subtitle='พิมพ์รหัสหรือชื่อโรคบางส่วน แล้วเลือกรายการ'
        rows={dxCatalogRows}
        getKey={(r) => r.code}
        getPrimary={(r) => r.termTh}
        getSecondary={(r) => r.term}
        searchPlaceholder='เช่น E11 หรือ เบาหวาน'
      />
      <LookupPopup
        open={!!editingDxRow}
        onClose={() => setEditDxCode(null)}
        onConfirm={(code) => {
          const meta = icd10ByCode(code);
          if (meta && editDxCode) patchDx(editDxCode, { code: meta.code, term: meta.term, termTh: meta.termTh });
        }}
        title='แก้ไขรหัสโรค (ICD10)'
        subtitle={editingDxRow ? `รหัสเดิม ${editingDxRow.code} · ${editingDxRow.termTh || editingDxRow.term}` : ''}
        rows={dxCatalogRows}
        value={editingDxRow?.code}
        getKey={(r) => r.code}
        getPrimary={(r) => r.termTh}
        getSecondary={(r) => r.term}
        searchPlaceholder='เช่น E11 หรือ เบาหวาน'
      />
      <LookupPopup
        open={addPxOpen}
        onClose={() => setAddPxOpen(false)}
        onConfirm={(code) => addPx(code)}
        title='เพิ่มรหัสหัตถการ (ICD9CM)'
        subtitle='พิมพ์รหัสหรือชื่อหัตถการบางส่วน แล้วเลือกรายการ'
        rows={pxCatalogRows}
        getKey={(r) => r.code}
        getPrimary={(r) => r.termTh}
        getSecondary={(r) => r.term}
        searchPlaceholder='เช่น 86.28 หรือ ทำแผล'
      />
      <LookupPopup
        open={!!editingPxRow}
        onClose={() => setEditPxCode(null)}
        onConfirm={(code) => {
          const meta = icd9ByCode(code);
          if (meta && editPxCode) patchPx(editPxCode, { code: meta.code, term: meta.term, termTh: meta.termTh });
        }}
        title='แก้ไขรหัสหัตถการ (ICD9CM)'
        subtitle={editingPxRow ? `รหัสเดิม ${editingPxRow.code} · ${editingPxRow.termTh || editingPxRow.term}` : ''}
        rows={pxCatalogRows}
        value={editingPxRow?.code}
        getKey={(r) => r.code}
        getPrimary={(r) => r.termTh}
        getSecondary={(r) => r.term}
        searchPlaceholder='เช่น 86.28 หรือ ทำแผล'
      />

      {/* ── confirm dialogs ── */}
      <Popup
        open={!!confirmKind}
        onClose={() => setConfirmKind(null)}
        size='large'
        title={confirmKind === 'code' ? 'ยืนยันรหัสโรคของครั้งบริการนี้' : 'ยืนยันข้อมูลการรักษาของครั้งบริการนี้'}
        subtitle={`${visit.visitNo} · ${visit.patient.shortName} · ${visit.visitDate}`}
        primaryAction={{
          label: 'ยืนยัน',
          onClick: () => {
            if (confirmKind === 'code') confirmVisitCodes(visit.id, role.userName, note.trim());
            else confirmVisitTreatment(visit.id, role.userName, note.trim());
            setConfirmKind(null);
          },
        }}
        secondaryAction={{ label: 'ยกเลิก', onClick: () => setConfirmKind(null) }}
      >
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-300)' }}>
          <span style={T.body}>
            {confirmKind === 'code'
              ? 'ระบบจะบันทึกว่ารหัสโรคของครั้งบริการนี้ผ่านการตรวจสอบแล้ว พร้อมชื่อผู้ยืนยันและเวลา'
              : 'ระบบจะบันทึกว่าข้อมูลการรักษา (คลินิก คลินิกย่อย แพทย์ผู้ตรวจ) ผ่านการตรวจสอบแล้ว พร้อมชื่อผู้ยืนยันและเวลา'}
          </span>
          <FieldGrid cols={2}>
            <ReadField label='ผู้ยืนยัน' value={`${role.userName} (${role.position})`} />
            <ReadField label='หมายเหตุ' value={note.trim() || 'ไม่ระบุ'} />
          </FieldGrid>
          {confirmKind === 'code' && (
            <div className='flex flex-col' style={{ gap: 'var(--dim-space-150)' }}>
              <span style={T.label}>รหัสที่จะยืนยัน</span>
              {draft.icd10.map((d) => (
                <span key={d.id} style={T.body}>
                  {d.code} · {d.termTh || d.term} — {resolveDiagnosisType(d.diagType).labelEn}
                </span>
              ))}
            </div>
          )}
          <span style={T.muted}>เมื่อยืนยันครบทั้งสองส่วน ฟอร์มจะถูกล็อกเป็นอ่านอย่างเดียว</span>
        </div>
      </Popup>

      <ReasonPopup
        open={!!reworkScope}
        onClose={() => setReworkScope(null)}
        onConfirm={(reason) => requestVisitRework(visit.id, reason, role.userName, reworkScope)}
        title='ขอแก้ไขข้อมูลที่ยืนยันแล้ว'
        subtitle='สถานะจะกลับเป็น “ต้องแก้ไข” ในคิวส่งเบิก และปลดล็อกฟอร์มให้แก้ได้'
        label='เหตุผลที่ขอแก้ไข'
        confirmLabel='ปลดล็อกและขอแก้ไข'
        presets={REWORK_PRESETS}
      />

      <DiscardChangesPopup
        open={discardOpen}
        onClose={() => { setDiscardOpen(false); setPendingBack(false); }}
        onDiscard={() => { resetDraft(); if (pendingBack) goBackToQueue(); setPendingBack(false); }}
        message='คลินิก/แพทย์ และรหัสโรค/หัตถการที่แก้ไว้จะกลับไปเป็นค่าที่บันทึกล่าสุด'
      />
    </QueuePageShell>
  );
};

export default ClaimSubmitDetailPage;
