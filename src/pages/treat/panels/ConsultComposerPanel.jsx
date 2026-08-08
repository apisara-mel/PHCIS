import React, { useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import Table from '@/components/table/Table';
import Select from '@/components/forms/Select';
import InputField from '@/components/forms/InputField';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import StatusBadge from '@/components/badge/StatusBadge';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import BrandButton from '@/components/button/BrandButton';
import BrandPrimaryButton from '@/components/button/BrandPrimaryButton';
import AlertDialog from '@/components/popup/AlertDialog';
import {
  PanelCard, PanelEmptyState, InfoPair, Sym, CancelledMark, strikeIf,
  PANEL_LABEL_STYLE, PANEL_VALUE_STYLE,
} from '@/pages/treat/panels/panelKit';
import {
  useTreatmentAccess, useTreatmentStore, GuardedAction, PanelAlert,
  ReasonDialog, CountLabel,
} from '@/pages/treat/panels/panelHooks';
import ConsultPrintSheet from '@/pages/treat/ConsultPrintSheet';
import {
  CONSULT_CLINICS, CONSULT_TYPES, CONSULT_URGENCIES, TRAUMA_OPTIONS,
  clinicMeta, doctorMeta, doctorsForClinic, consultStatusMeta, consultTypeMeta,
  consultUrgencyMeta, blankConsult, saveConsult, sendConsult, cancelConsult,
  printConsult, consultsForVisit, subscribeConsults, missingConsultFields,
  isConsultIncomplete, CONSULT_QUESTION_SUGGESTIONS, CONSULT_CONTEXT_SUGGESTIONS,
  CONSULT_REQUEST_SUGGESTIONS, CONSULT_CANCEL_SUGGESTIONS,
} from '@/data/treatmentConsult';
import { CURRENT_CLINICIAN, stampNow } from '@/data/treatmentAudit';
import { NO_EDIT_RIGHT_TOOLTIP } from '@/data/treatmentAccess';

/* PHCIS | CPOE §1.5.6.1–.7 — ฟอร์มขอปรึกษาแพทย์ภายในหน่วยงาน.
   คำศัพท์ตามคู่มือ HCIS §2.2 ("ส่งไปคลินิกอื่น/ปรึกษา" + ส่งต่อคลินิก +
   สาเหตุ + ความเร่งด่วน + Trauma/NonTrauma + Doctor Note).

   ช่องค้นหาคลินิกทำ chrome-free ตาม CLAUDE.md (wrapper เป็นเจ้าของ border
   ส่วน <input> ข้างในถูกถอด chrome ทั้งหมดผ่าน stylesheet injection). */

const SEARCH_STYLE_ID = 'mih-consult-clinic-search-style';

const ensureSearchStyle = () => {
  if (typeof document === 'undefined') return;
  const prev = document.getElementById(SEARCH_STYLE_ID);
  if (prev) prev.remove();
  const el = document.createElement('style');
  el.id = SEARCH_STYLE_ID;
  el.textContent = `
.mih-consult-clinic-input,
.mih-consult-clinic-input:focus,
.mih-consult-clinic-input:focus-visible {
  caret-color: transparent;
  border: 0 !important;
  outline: none !important;
  box-shadow: none !important;
  background: transparent !important;
  -webkit-appearance: none !important;
  appearance: none !important;
}
.mih-consult-clinic-input::placeholder {
  color: var(--text-content-quaternary, #ADB2B7);
  opacity: 1;
}
`;
  document.head.appendChild(el);
};

const ClinicSearch = ({ value, onChange, disabled }) => {
  useEffect(() => { ensureSearchStyle(); }, []);
  return (
    <div
      className='flex items-center w-full'
      style={{
        gap: 'var(--dim-space-200, 8px)',
        borderRadius: 'var(--dim-radius-300, 10px)',
        border: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-tertiary, #E2E4E6)',
        background: 'var(--surface-card-100)',
        paddingTop: 'var(--dim-space-200, 8px)',
        paddingRight: 'var(--dim-space-300, 12px)',
        paddingBottom: 'var(--dim-space-200, 8px)',
        paddingLeft: 'var(--dim-space-300, 12px)',
      }}
    >
      <Sym name='search' size={18} color='var(--icon-neutral-tertiary, #ADB2B7)' />
      <input
        className='mih-consult-clinic-input flex-1 min-w-0'
        type='text'
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        placeholder='ค้นหาคลินิกที่ต้องการส่งปรึกษา'
        aria-label='ค้นหาคลินิก'
        style={{
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-sm, 14px)',
          color: 'var(--text-content-default)',
        }}
      />
      {value ? (
        <button
          type='button'
          onClick={() => onChange('')}
          aria-label='ล้างคำค้น'
          style={{ background: 'transparent', border: 0, cursor: 'pointer', lineHeight: 1 }}
        >
          <Sym name='close' size={16} color='var(--icon-neutral-tertiary, #ADB2B7)' />
        </button>
      ) : null}
    </div>
  );
};

const ConsultComposerPanel = ({ form, setForm, patient, cardPatient }) => {
  const access = useTreatmentAccess();
  const canEdit = access.canEdit;
  const history = useHistory();
  const hn = patient?.hn || '';
  const visitId = form?.visitId || 'v-current';

  const [rows, refreshRows] = useTreatmentStore(
    subscribeConsults,
    () => consultsForVisit(hn, visitId),
    [hn, visitId],
  );

  /* คำขอปรึกษาถูกเก็บใน store กลาง (CONSULTS) เท่านั้น การ์ด Plan ของ SOAP
     อ่าน form.consultOrders จึงขึ้น "ปรึกษา 0" ตลอดแม้จะออกคำขอไปแล้ว —
     สะท้อนรายการที่ยังไม่ถูกยกเลิกกลับเข้าฟอร์มทุกครั้งที่ store เปลี่ยน */
  useEffect(() => {
    const active = rows.filter((c) => c.status !== 'cancelled');
    const signature = active.map((c) => c.id).join('|');
    setForm((f) => (
      (f.consultOrders || []).map((c) => c.id).join('|') === signature
        ? f
        : { ...f, consultOrders: active }
    ));
  }, [rows, setForm]);

  const [draft, setDraft] = useState(null);
  const [query, setQuery] = useState('');
  const [cancelTarget, setCancelTarget] = useState(null);
  const [sendGuard, setSendGuard] = useState(null);
  const [printTarget, setPrintTarget] = useState(null);
  const [sourceChanged, setSourceChanged] = useState(false);
  const [autoSnapshot, setAutoSnapshot] = useState('');

  /* §1.5.6.5 — ผลการวินิจฉัยเบื้องต้นดึงอัตโนมัติจาก diagnoses + SOAP ช่อง A */
  const autoDx = useMemo(() => {
    const codes = (form?.diagnoses || [])
      .map((d) => `${d.code || 'ยังไม่ลงรหัส'} ${d.name}`)
      .join(' · ');
    const soapA = String(form?.soap?.a || '').trim();
    return [codes, soapA].filter(Boolean).join('\n');
  }, [form?.diagnoses, form?.soap?.a]);

  /* §1.5.6.6 — ข้อมูลประกอบดึงอัตโนมัติ (vitals + ยาที่ใช้อยู่) */
  const autoContext = useMemo(() => {
    const v = form?.vitals || {};
    const vital = [
      v.bp ? `BP ${v.bp} mmHg` : null,
      v.hr != null ? `PR ${v.hr} /min` : null,
      v.temp != null ? `BT ${v.temp} °C` : null,
      v.spo2 != null ? `SpO2 ${v.spo2}%` : null,
      v.weight != null ? `น้ำหนัก ${v.weight} กก.` : null,
    ].filter(Boolean).join(', ');
    const meds = (form?.medications || [])
      .filter((m) => !m.cancelledAt)
      .map((m) => `${m.name} ${m.dosePerTake || ''} ${m.unit || ''} ${m.frequency || ''}`.trim())
      .join(' · ');
    const allergies = patient?.drugAllergies?.length
      ? `ประวัติแพ้ยา: ${patient.drugAllergies.map((a) => a.name).join(', ')}`
      : 'ไม่พบประวัติแพ้ยาในเวชระเบียน';
    return [
      vital ? `สัญญาณชีพวันนี้: ${vital}` : null,
      meds ? `ยาที่สั่งในการตรวจครั้งนี้: ${meds}` : null,
      allergies,
    ].filter(Boolean).join('\n');
  }, [form?.vitals, form?.medications, patient?.drugAllergies]);

  /* auto-fill ชนกับสิ่งที่พิมพ์เอง — ห้ามเขียนทับเงียบ ๆ */
  useEffect(() => {
    if (!draft || !draft.provisionalDxAutoFilled) return;
    if (autoSnapshot && autoDx !== autoSnapshot) setSourceChanged(true);
  }, [autoDx, autoSnapshot, draft]);

  const openNew = () => {
    const blank = {
      ...blankConsult(),
      hn,
      cid: patient?.cid || patient?.nationalId || '',
      name: cardPatient?.fullName || patient?.name || '',
      rights: patient?.rights || '',
      age: patient?.age ? `${patient.age} ปี` : '',
      gender: patient?.gender || '',
      visitId,
      provisionalDx: autoDx,
      provisionalDxAutoFilled: !!autoDx,
      provisionalDxSource: autoDx ? `ดึงจากหน้าบันทึกการรักษา ${stampNow()}` : '',
      context: autoContext,
      requestedAt: stampNow(),
    };
    setDraft(blank);
    setAutoSnapshot(autoDx);
    setSourceChanged(false);
  };

  const openRow = (row) => {
    setDraft({ ...row });
    setAutoSnapshot(row.provisionalDx || '');
    setSourceChanged(false);
  };

  const setField = (key) => (v) => setDraft((d) => ({ ...d, [key]: v }));
  const setText = (key) => (e) => setDraft((d) => ({
    ...d, [key]: typeof e === 'string' ? e : e?.target?.value ?? '',
  }));

  const doSave = () => {
    const saved = saveConsult({ ...draft, direction: 'out' });
    setDraft({ ...saved });
    refreshRows();
    return saved;
  };

  const doSend = () => {
    const missing = missingConsultFields(draft);
    if (missing.length) { setSendGuard(missing); return; }
    const saved = saveConsult({ ...draft, direction: 'out' });
    const sent = sendConsult(saved.id);
    setDraft({ ...sent });
    refreshRows();
  };

  const doCancel = (reason) => {
    if (!cancelTarget) return;
    const updated = cancelConsult(cancelTarget.id, reason);
    if (draft?.id === updated.id) setDraft({ ...updated });
    setCancelTarget(null);
    refreshRows();
  };

  const doPrint = () => {
    const target = printTarget?.id ? printTarget : doSave();
    if (!target?.id) return;
    const updated = printConsult(target.id, 1);
    if (draft?.id === updated?.id) setDraft({ ...updated });
    setPrintTarget(null);
    refreshRows();
    if (typeof window !== 'undefined' && window.print) window.print();
  };

  const filteredClinics = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CONSULT_CLINICS;
    return CONSULT_CLINICS.filter(
      (c) => c.label.toLowerCase().includes(q) || c.short.toLowerCase().includes(q),
    );
  }, [query]);

  const locked = draft ? ['accepted', 'replied', 'cancelled'].includes(draft.status) : false;
  const availableDoctors = draft?.toClinic ? doctorsForClinic(draft.toClinic) : [];

  return (
    <div className='flex flex-col w-full min-w-0' style={{ gap: 'var(--dim-space-400, 16px)' }}>
      {/* ── ตารางคำขอของ visit นี้ ───────────────────────────── */}
      <PanelCard
        title='คำขอปรึกษาของการตรวจครั้งนี้'
        subtitle='แสดง / บันทึก / แก้ไข / ยกเลิก ได้ครบทุกใบ — ใบที่ยกเลิกจะถูกขีดฆ่าไว้พร้อมเหตุผล ไม่ลบทิ้ง'
        action={
          <>
            <NeutralSubdueButton
              variant='outline' size='sm' leadingIcon='list_alt'
              onClick={() => history.push('/treat/consult')}
            >
              ดูทะเบียนทั้งหมด
            </NeutralSubdueButton>
            <GuardedAction allowed={canEdit}>
              <BrandPrimaryButton size='sm' leadingIcon='add' onClick={openNew}>
                ขอปรึกษาใหม่
              </BrandPrimaryButton>
            </GuardedAction>
          </>
        }
      >
        {rows.length === 0 ? (
          <PanelEmptyState
            icon='forum'
            title='ยังไม่มีรายการขอปรึกษา'
            subtitle='กรุณาขอปรึกษา — กด "ขอปรึกษาใหม่" เพื่อเปิดฟอร์ม ระบบจะเติมข้อมูลผู้รับบริการและผลวินิจฉัยให้อัตโนมัติ'
            action={
              <GuardedAction allowed={canEdit}>
                <BrandButton variant='outline' size='sm' leadingIcon='add' onClick={openNew}>
                  ขอปรึกษาใหม่
                </BrandButton>
              </GuardedAction>
            }
          />
        ) : (
          <div className='w-full min-w-0' style={{ overflowX: 'auto' }}>
            <Table
              rowKey={(r) => r.id}
              rows={rows}
              onRowClick={openRow}
              columns={[
                {
                  key: 'consultNo', header: 'เลขที่คำขอ',
                  render: (r) => (
                    <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
                      <span style={{ ...PANEL_VALUE_STYLE, ...strikeIf(r.status === 'cancelled') }}>{r.consultNo}</span>
                      {isConsultIncomplete(r) ? (
                        <span className='inline-flex items-center' style={{ gap: 'var(--dim-space-100, 4px)' }}>
                          <Sym name='error' size={12} color='var(--icon-dangerButton-default, #B91C1C)' />
                          <span style={{ ...PANEL_LABEL_STYLE, color: 'var(--text-alert-error, #B91C1C)' }}>ข้อมูลไม่สมบูรณ์</span>
                        </span>
                      ) : null}
                    </div>
                  ),
                },
                {
                  key: 'toClinic', header: 'คลินิก / แพทย์ที่ปรึกษา', flex: 1,
                  render: (r) => (
                    <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-100, 4px)' }}>
                      <span style={PANEL_VALUE_STYLE}>{clinicMeta(r.toClinic)?.label || 'ยังไม่ระบุคลินิก'}</span>
                      <span style={PANEL_LABEL_STYLE}>{doctorMeta(r.toDoctor)?.name || 'ยังไม่ระบุแพทย์'}</span>
                    </div>
                  ),
                },
                {
                  key: 'type', header: 'ประเภท / ความเร่งด่วน',
                  render: (r) => (
                    <div className='flex flex-wrap items-center' style={{ gap: 'var(--dim-space-100, 4px)' }}>
                      <ColorfulBadge style='blue' size='small' width='hug'>{consultTypeMeta(r.consultType).label}</ColorfulBadge>
                      <StatusBadge style={consultUrgencyMeta(r.urgency).badge} size='small'>
                        {consultUrgencyMeta(r.urgency).label}
                      </StatusBadge>
                    </div>
                  ),
                },
                {
                  key: 'status', header: 'สถานะ',
                  render: (r) => (
                    <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
                      <StatusBadge style={consultStatusMeta(r.status).badge} size='small'>
                        {consultStatusMeta(r.status).label}
                      </StatusBadge>
                      {r.cancelledAt ? <CancelledMark at={r.cancelledAt} reason={r.cancelReason} /> : null}
                    </div>
                  ),
                },
                {
                  key: 'actions', header: '',
                  render: (r) => (
                    <div className='flex flex-wrap items-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                      <NeutralSubdueButton variant='outline' size='sm' leadingIcon='visibility' onClick={() => openRow(r)}>
                        แสดง / แก้ไข
                      </NeutralSubdueButton>
                      <GuardedAction allowed={canEdit && r.status !== 'cancelled'}>
                        <NeutralSubdueButton variant='outline' size='sm' leadingIcon='block' onClick={() => setCancelTarget(r)}>
                          ยกเลิก
                        </NeutralSubdueButton>
                      </GuardedAction>
                    </div>
                  ),
                },
              ]}
              emptyMessage='ยังไม่มีคำขอปรึกษา'
            />
          </div>
        )}
      </PanelCard>

      {/* ── ฟอร์มขอปรึกษา ────────────────────────────────────── */}
      {draft ? (
        <>
          <PanelCard
            title={`ฟอร์มขอปรึกษา ${draft.consultNo || '(ใบใหม่ — เลขที่จะออกให้เมื่อบันทึก)'}`}
            subtitle={`สถานะ ${consultStatusMeta(draft.status).label}`}
            action={
              <>
                <GuardedAction allowed={canEdit && !locked}>
                  <NeutralSubdueButton variant='outline' size='sm' leadingIcon='save' onClick={doSave}>
                    บันทึกร่าง
                  </NeutralSubdueButton>
                </GuardedAction>
                <GuardedAction allowed={canEdit && draft.status === 'draft'}>
                  <BrandPrimaryButton size='sm' leadingIcon='send' onClick={doSend}>
                    ส่งคำขอปรึกษา
                  </BrandPrimaryButton>
                </GuardedAction>
                <GuardedAction
                  allowed={canEdit && draft.status !== 'cancelled'}
                  reason={NO_EDIT_RIGHT_TOOLTIP}
                >
                  <NeutralSubdueButton variant='outline' size='sm' leadingIcon='print' onClick={() => setPrintTarget(draft)}>
                    พิมพ์ใบส่งปรึกษา
                  </NeutralSubdueButton>
                </GuardedAction>
                <NeutralSubdueButton variant='outline' size='sm' leadingIcon='close' onClick={() => setDraft(null)}>
                  ปิดฟอร์ม
                </NeutralSubdueButton>
              </>
            }
          >
            {locked && draft.status !== 'cancelled' ? (
              <PanelAlert tone='info' icon='lock' title='คำขอนี้ถูกรับเรื่องแล้ว'>
                แก้ไขเนื้อหาไม่ได้เพื่อรักษาความสอดคล้องกับฉบับที่แพทย์ปลายทางได้รับ —
                หากข้อมูลผิด ให้ยกเลิกใบนี้พร้อมเหตุผลแล้วออกใบใหม่
              </PanelAlert>
            ) : null}
            {draft.cancelledAt ? (
              <CancelledMark at={draft.cancelledAt} reason={draft.cancelReason} label='คำขอปรึกษาถูกยกเลิก' />
            ) : null}
            {missingConsultFields(draft).length ? (
              <PanelAlert tone='warning' icon='error' title='ข้อมูลไม่สมบูรณ์'>
                ยังขาด: {missingConsultFields(draft).join(' · ')} — บันทึกร่างได้ แต่กด "ส่งคำขอปรึกษา" ไม่ได้จนกว่าจะครบ
              </PanelAlert>
            ) : null}
            {!canEdit ? (
              <PanelAlert tone='info' icon='visibility' title='โหมดดูอย่างเดียว'>
                {NO_EDIT_RIGHT_TOOLTIP} — อ่านรายละเอียดได้ทั้งหมด แต่ปุ่มบันทึก/ส่ง/ยกเลิก/พิมพ์ถูกปิดไว้
              </PanelAlert>
            ) : null}

            {/* §1.5.6.1 หัวฟอร์ม auto-fill (อ่านอย่างเดียว) */}
            <div className='flex flex-wrap w-full' style={{ gap: 'var(--dim-space-400, 16px)' }}>
              <InfoPair label='วัน-เวลาที่บันทึกคำขอ' value={draft.requestedAt} minWidth={220} />
              <InfoPair label='แพทย์ผู้ขอปรึกษา' value={draft.requestedBy || CURRENT_CLINICIAN.name} minWidth={220} />
              <InfoPair label='หน่วยงานผู้ขอ' value={draft.fromClinic} minWidth={240} />
              <InfoPair label='เลขที่คำขอ' value={draft.consultNo || 'ระบบจะออกเลขให้เมื่อบันทึก'} minWidth={220} />
              <InfoPair label='HN / ชื่อผู้รับบริการ' value={`${draft.hn || '—'} · ${draft.name || '—'}`} minWidth={280} />
              <InfoPair label='สิทธิการรักษา' value={draft.rights || 'ไม่ระบุ'} minWidth={200} />
            </div>
          </PanelCard>

          {/* §1.5.6.2 เลือกคลินิก */}
          <PanelCard
            title='เลือกคลินิกที่ส่งปรึกษา'
            subtitle='ตัวเลขบนการ์ดคือคิวรอปรึกษาปัจจุบันของคลินิกนั้น — ใช้ช่วยตัดสินใจว่าจะได้รับการตอบกลับเร็วแค่ไหน'
          >
            <ClinicSearch value={query} onChange={setQuery} disabled={!canEdit || locked} />
            {filteredClinics.length === 0 ? (
              <PanelEmptyState
                icon='search_off'
                title={`ไม่พบคลินิกที่ตรงกับ "${query}"`}
                subtitle='ลองพิมพ์คำที่สั้นลง เช่น "อายุร" หรือ "ทันต"'
                action={
                  <NeutralSubdueButton variant='outline' size='sm' leadingIcon='backspace' onClick={() => setQuery('')}>
                    ล้างคำค้น
                  </NeutralSubdueButton>
                }
              />
            ) : (
              <div className='flex flex-wrap w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
                {filteredClinics.map((c) => {
                  const picked = draft.toClinic === c.key;
                  return (
                    <button
                      key={c.key}
                      type='button'
                      disabled={!canEdit || locked}
                      onClick={() => setDraft((d) => ({ ...d, toClinic: c.key, toDoctor: '' }))}
                      className='flex flex-col text-left'
                      style={{
                        gap: 'var(--dim-space-100, 4px)',
                        minWidth: 240,
                        flex: '1 1 240px',
                        borderRadius: 'var(--dim-radius-300, 10px)',
                        border: `var(--dim-stroke-100, 1px) solid ${picked
                          ? 'var(--border-brandPrimary-default, #007549)'
                          : 'var(--border-neutral-quaternary)'}`,
                        background: picked
                          ? 'var(--surface-brandPrimary-quaternary, #F4FBF8)'
                          : 'var(--surface-card-100)',
                        paddingTop: 'var(--dim-space-300, 12px)',
                        paddingRight: 'var(--dim-space-300, 12px)',
                        paddingBottom: 'var(--dim-space-300, 12px)',
                        paddingLeft: 'var(--dim-space-300, 12px)',
                        cursor: canEdit && !locked ? 'pointer' : 'not-allowed',
                      }}
                    >
                      <span className='inline-flex items-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                        <Sym name={c.icon} size={18} color={picked
                          ? 'var(--icon-brandPrimary-default, #007549)'
                          : 'var(--icon-neutral-tertiary, #ADB2B7)'} />
                        <span style={PANEL_VALUE_STYLE}>{c.label}</span>
                      </span>
                      <span style={PANEL_LABEL_STYLE}>
                        คิวรอปรึกษา {c.waiting} ราย · แพทย์ออกตรวจ {doctorsForClinic(c.key).filter((d) => d.onDuty).length} คน
                      </span>
                      {c.confidential ? (
                        <ColorfulBadge style='purple' size='small' width='hug'>ข้อมูลลับ — จำกัดการเข้าถึง</ColorfulBadge>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            )}
          </PanelCard>

          {/* §1.5.6.3 / §1.5.6.4 */}
          <PanelCard title='แพทย์ที่ปรึกษาและประเภทการปรึกษา'>
            <div className='flex flex-wrap w-full' style={{ gap: 'var(--dim-space-400, 16px)' }}>
              <div style={{ minWidth: 300, flex: 1 }}>
                <Select
                  label='แพทย์ที่ปรึกษา'
                  value={draft.toDoctor}
                  onChange={setField('toDoctor')}
                  disabled={!canEdit || locked || !draft.toClinic}
                  options={availableDoctors.map((d) => ({
                    value: d.key,
                    label: `${d.name}${d.onDuty ? '' : ' (ไม่ออกตรวจวันนี้)'}`,
                    subtext: d.specialty,
                  }))}
                  placeholder={draft.toClinic ? 'เลือกแพทย์ในคลินิกที่เลือก' : 'เลือกคลินิกก่อนจึงจะเลือกแพทย์ได้'}
                  helperText={draft.toClinic
                    ? 'ไม่เลือกแพทย์ก็ส่งได้ — คลินิกปลายทางจะมอบหมายแพทย์เอง'
                    : 'รายชื่อจะปรากฏหลังเลือกคลินิก'}
                />
              </div>
              <div style={{ minWidth: 300, flex: 1 }}>
                <Select
                  label='ประเภทการปรึกษา'
                  value={draft.consultType}
                  onChange={setField('consultType')}
                  disabled={!canEdit || locked}
                  options={CONSULT_TYPES.map((t) => ({ value: t.key, label: t.label }))}
                  placeholder='เลือกประเภทการปรึกษา'
                />
              </div>
              <div style={{ minWidth: 220, flex: 1 }}>
                <Select
                  label='ระดับความเร่งด่วน'
                  value={draft.urgency}
                  onChange={setField('urgency')}
                  disabled={!canEdit || locked}
                  options={CONSULT_URGENCIES.map((u) => ({ value: u.key, label: `${u.label} (ตอบกลับภายใน ${u.slaHours} ชม.)` }))}
                  placeholder='เลือกความเร่งด่วน'
                />
              </div>
              <div style={{ minWidth: 260, flex: 1 }}>
                <Select
                  label='Trauma / NonTrauma'
                  value={draft.trauma}
                  onChange={setField('trauma')}
                  disabled={!canEdit || locked}
                  options={TRAUMA_OPTIONS.map((t) => ({ value: t.key, label: t.label }))}
                  placeholder='เลือก'
                />
              </div>
            </div>
          </PanelCard>

          {/* §1.5.6.5 / §1.5.6.6 */}
          <PanelCard title='รายละเอียดการส่งปรึกษา'>
            {sourceChanged ? (
              <PanelAlert
                tone='warning'
                icon='sync_problem'
                title='ข้อมูลต้นทางมีการเปลี่ยนแปลง'
                onDismiss={() => setSourceChanged(false)}
              >
                รหัสวินิจฉัยหรือช่อง A ของ SOAP ถูกแก้ไขหลังจากระบบเติมข้อมูลลงใบนี้ —
                ระบบไม่เขียนทับสิ่งที่คุณแก้ไว้
                <span style={{ display: 'block', marginTop: 'var(--dim-space-200, 8px)' }}>
                  <NeutralSubdueButton
                    variant='outline' size='sm' leadingIcon='refresh'
                    onClick={() => {
                      setDraft((d) => ({ ...d, provisionalDx: autoDx, provisionalDxSource: `ดึงจากหน้าบันทึกการรักษา ${stampNow()}` }));
                      setAutoSnapshot(autoDx);
                      setSourceChanged(false);
                    }}
                  >
                    ดึงข้อมูลล่าสุดมาใหม่
                  </NeutralSubdueButton>
                </span>
              </PanelAlert>
            ) : null}

            {draft.provisionalDxAutoFilled ? (
              <ColorfulBadge style='teal' size='small' width='hug' icon='auto_awesome'>
                {draft.provisionalDxSource || 'ดึงจากหน้าบันทึกการรักษา'}
              </ColorfulBadge>
            ) : null}
            <SuggestibleTextarea
              voice
              label='ผลการวินิจฉัยเบื้องต้น'
              value={draft.provisionalDx}
              onChange={setText('provisionalDx')}
              suggestions={CONSULT_QUESTION_SUGGESTIONS}
              minChars={2}
              height={130}
              minHeight={96}
              disabled={!canEdit || locked}
              popoverAriaLabel='ตัวอย่างผลการวินิจฉัยเบื้องต้น'
              placeholder='รหัสและชื่อการวินิจฉัยของการตรวจครั้งนี้ — แก้ไขหรือเพิ่มเติมได้'
            />
            <SuggestibleTextarea
              voice
              required
              label='ประเด็นที่ต้องการปรึกษา'
              value={draft.question}
              onChange={setText('question')}
              suggestions={CONSULT_QUESTION_SUGGESTIONS}
              minChars={2}
              height={140}
              minHeight={100}
              disabled={!canEdit || locked}
              popoverAriaLabel='ตัวอย่างประเด็นที่ต้องการปรึกษา'
              placeholder='ระบุคำถามทางคลินิกที่ต้องการความเห็นให้ชัดเจน'
            />
            <SuggestibleTextarea
              voice
              label='ข้อมูลประกอบ (สัญญาณชีพ / ผลตรวจผิดปกติ / ยาที่ใช้อยู่)'
              value={draft.context}
              onChange={setText('context')}
              suggestions={CONSULT_CONTEXT_SUGGESTIONS}
              minChars={2}
              height={150}
              minHeight={110}
              disabled={!canEdit || locked}
              popoverAriaLabel='ตัวอย่างข้อมูลประกอบ'
              placeholder='ระบบเติมให้อัตโนมัติจากการตรวจครั้งนี้ — แก้ไขได้'
            />
            <SuggestibleTextarea
              voice
              label='สิ่งที่ต้องการให้ดำเนินการ'
              value={draft.request}
              onChange={setText('request')}
              suggestions={CONSULT_REQUEST_SUGGESTIONS}
              minChars={2}
              height={130}
              minHeight={96}
              disabled={!canEdit || locked}
              popoverAriaLabel='ตัวอย่างสิ่งที่ต้องการให้ดำเนินการ'
              placeholder='เช่น ขอให้ประเมินภายในวันนี้ / ขอให้รับไว้ดูแลต่อเนื่อง'
            />
            <SuggestibleTextarea
              voice
              label='Doctor Note (ตามคู่มือ §2.2)'
              value={draft.doctorNote}
              onChange={setText('doctorNote')}
              suggestions={CONSULT_CONTEXT_SUGGESTIONS}
              minChars={2}
              height={110}
              minHeight={80}
              disabled={!canEdit || locked}
              popoverAriaLabel='ตัวอย่าง Doctor Note'
              placeholder='บันทึกเพิ่มเติมถึงแพทย์ปลายทาง'
            />
          </PanelCard>

          {/* ตัวอย่างใบพิมพ์ */}
          <PanelCard
            title='ตัวอย่างใบส่งปรึกษาสำหรับพิมพ์'
            subtitle='พิมพ์ผ่าน @media print ขนาด A4 (ยังไม่มี PDF engine ในเวฟนี้) — ถ้ายังไม่ตอบกลับ ใบจะเว้นเส้นให้เขียนมือ'
          >
            <ConsultPrintSheet row={draft} />
          </PanelCard>
        </>
      ) : null}

      {/* ยกเลิกคำขอ */}
      <ReasonDialog
        open={!!cancelTarget}
        type='destructive'
        title='ยกเลิกคำขอปรึกษา'
        description={cancelTarget && ['accepted', 'replied'].includes(cancelTarget.status)
          ? 'คำขอนี้ถูกรับเรื่องโดยแพทย์ปลายทางแล้ว — ต้องแจ้งปลายทางด้วยตนเองเพิ่มเติม ระบบจะเก็บใบนี้ไว้พร้อมเหตุผล ไม่ลบออกจากทะเบียน'
          : 'ระบบจะขีดฆ่าคำขอนี้ไว้พร้อมเหตุผล ไม่ลบออกจากทะเบียน'}
        confirmLabel='ยืนยันการยกเลิก'
        suggestions={CONSULT_CANCEL_SUGGESTIONS}
        onConfirm={doCancel}
        onClose={() => setCancelTarget(null)}
      />

      {/* กันการส่งเมื่อข้อมูลไม่ครบ */}
      <AlertDialog
        open={!!sendGuard}
        type='warning'
        title='ยังส่งคำขอปรึกษาไม่ได้'
        description={`ข้อมูลที่จำเป็นยังไม่ครบ: ${(sendGuard || []).join(' · ')} — กรอกให้ครบก่อนจึงจะส่งได้ (บันทึกร่างไว้ก่อนได้)`}
        confirmLabel='กลับไปกรอกต่อ'
        showCancel={false}
        onConfirm={() => setSendGuard(null)}
        onClose={() => setSendGuard(null)}
      />

      {/* ยืนยันก่อนพิมพ์ */}
      <AlertDialog
        open={!!printTarget}
        type='info'
        title='พิมพ์ใบส่งปรึกษา'
        description={`ระบบจะนับจำนวนครั้งที่พิมพ์และบันทึกลงประวัติการแก้ไข (พิมพ์ไปแล้ว ${printTarget?.printCount || 0} ครั้ง) — ใบที่ยังไม่บันทึกจะถูกบันทึกร่างให้ก่อน`}
        confirmLabel='พิมพ์'
        cancelLabel='ยกเลิก'
        onConfirm={doPrint}
        onCancel={() => setPrintTarget(null)}
        onClose={() => setPrintTarget(null)}
      />
    </div>
  );
};

export default ConsultComposerPanel;
