import React, { useEffect, useMemo, useState } from 'react';
import Select from '@/components/forms/Select';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import StatusBadge from '@/components/badge/StatusBadge';
import BrandButton from '@/components/button/BrandButton';
import BrandPrimaryButton from '@/components/button/BrandPrimaryButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import AlertDialog from '@/components/popup/AlertDialog';
import Table from '@/components/table/Table';
import {
  PanelCard, PanelEmptyState, Sym, CancelledMark, strikeIf,
  PANEL_LABEL_STYLE, PANEL_VALUE_STYLE, PANEL_TITLE_STYLE,
} from '@/pages/treat/panels/panelKit';
import {
  useTreatmentAccess, useTreatmentStore, GuardedAction, AccessDeniedPanel,
  PanelAlert, ReasonDialog, CountLabel,
} from '@/pages/treat/panels/panelHooks';
import {
  SOAP_FIELDS, SOAP_SUGGESTIONS, SOAP_TEMPLATES, soapTemplateMeta,
  PATIENT_ADVICE_TOPICS, MIN_SOAP_CHARS, blankSoap, soapHasContent,
  soapDiffFields, pastSoapFor, rememberSoap, auditSoap,
} from '@/data/treatmentSoap';
import {
  addTreatmentNote, updateTreatmentNote, cancelTreatmentNote,
  notesForVisit, noteDisplayBody, subscribeTreatmentNotes,
} from '@/data/treatmentNotes';
import { labHistoryFor } from '@/data/labOrders';
import { xrayHistoryFor } from '@/data/xrayOrders';
import { DIAGNOSIS_TYPE_OPTIONS, resolveDiagnosisType } from '@/data/treatmentVisits';
import { NO_EDIT_RIGHT_TOOLTIP } from '@/data/treatmentAccess';

/* PHCIS | CPOE §1.5.1.1 / §1.5.1.3 / §1.5.4.10 / §1.5.6.5 — SOAP Note.

   ขั้นแรกที่แพทย์ลงบันทึกเอง (step 4 จาก 8) — S/O ดึงจากงานพยาบาลที่ทำมา
   แล้ว, A ส่งไม้ต่อให้ขั้นวินิจฉัย, P สรุปคำสั่งทุกชนิดในหน้าเดียว.

   บันทึกผ่าน addTreatmentNote({ structured: { s,o,a,p } }) — contract ที่
   treatmentNotes.js จองไว้ให้ Wave S จึงไปโผล่ที่ ClinicalNotesPanel และ
   AuditConfidentialPanel เองโดยไม่ต้องแก้ไฟล์เหล่านั้น. */

const LETTER_TONE = {
  s: { bg: 'var(--surface-colorfulbadge-teal, #D1F6EE)',   fg: 'var(--text-alert-success, #196C65)' },
  o: { bg: 'var(--surface-colorfulbadge-blue, #DBEAFE)',   fg: 'var(--text-alert-info, #1D4ED8)' },
  a: { bg: 'var(--surface-colorfulbadge-magenta, #FCE7F3)', fg: 'var(--text-colorfulbadge-magenta, #BE185D)' },
  p: { bg: 'var(--surface-colorfulbadge-orange, #FFEDD5)', fg: 'var(--text-statusbadge-warning, #C2410C)' },
};

const LetterAvatar = ({ letter, tone }) => (
  <span
    className='inline-flex items-center justify-center shrink-0'
    style={{
      width: 'var(--dim-size-600, 32px)',
      height: 'var(--dim-size-600, 32px)',
      borderRadius: 'var(--dim-radius-full)',
      background: tone.bg,
      color: tone.fg,
      fontFamily: 'var(--type-family-heading-content)',
      fontWeight: 'var(--type-weight-bold)',
      fontSize: 'var(--type-size-base, 16px)',
      lineHeight: 1,
    }}
    aria-hidden
  >
    {letter}
  </span>
);

/* กล่องอ้างอิงสีเทา — ข้อมูลต้นทางที่ดึงมาอัตโนมัติ (อ่านอย่างเดียว) */
const SourceCard = ({ title, lines, onPull, pullLabel = 'ดึงเข้าช่องนี้', disabled, changed }) => (
  <div
    className='flex flex-col w-full min-w-0'
    style={{
      gap: 'var(--dim-space-200, 8px)',
      borderRadius: 'var(--dim-radius-300, 10px)',
      border: `var(--dim-stroke-100, 1px) solid ${changed
        ? 'var(--border-colorfulbadge-warning, #FEF08A)'
        : 'var(--border-neutral-quaternary)'}`,
      background: changed
        ? 'var(--surface-colorfulbadge-yellow, #FEF9C3)'
        : 'var(--surface-neutral-quaternary, #F9FBFB)',
      paddingTop: 'var(--dim-space-300, 12px)',
      paddingRight: 'var(--dim-space-300, 12px)',
      paddingBottom: 'var(--dim-space-300, 12px)',
      paddingLeft: 'var(--dim-space-300, 12px)',
    }}
  >
    <div className='flex flex-wrap items-center justify-between w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
      <span className='inline-flex items-center' style={{ gap: 'var(--dim-space-100, 4px)' }}>
        <Sym name='auto_awesome' size={14} color='var(--icon-brandPrimary-default, #007549)' />
        <span style={{ ...PANEL_LABEL_STYLE, fontWeight: 'var(--type-weight-bold)' }}>{title}</span>
      </span>
      {onPull ? (
        <GuardedAction allowed={!disabled}>
          <NeutralSubdueButton variant='outline' size='sm' leadingIcon='south' onClick={onPull}>
            {pullLabel}
          </NeutralSubdueButton>
        </GuardedAction>
      ) : null}
    </div>
    {lines.length === 0 ? (
      <span style={PANEL_LABEL_STYLE}>ยังไม่มีข้อมูลจากขั้นตอนก่อนหน้า</span>
    ) : (
      lines.map((l, i) => (
        <span key={i} style={{ ...PANEL_VALUE_STYLE, whiteSpace: 'pre-wrap' }}>{l}</span>
      ))
    )}
  </div>
);

const joinLines = (arr) => arr.filter(Boolean).join('\n');

const SoapNotePanel = ({ form, setForm, patient, cardPatient, onStepChange, stepIndexes = {} }) => {
  const access = useTreatmentAccess();
  const hn = patient?.hn || '';
  const visitId = form?.visitId || 'v-current';

  const soap = form?.soap || blankSoap();
  const setSoap = (patch) => setForm((f) => ({
    ...f,
    soap: { ...(f.soap || blankSoap()), ...(typeof patch === 'function' ? patch(f.soap || blankSoap()) : patch) },
  }));
  const setField = (key) => (e) => setSoap({
    [key]: typeof e === 'string' ? e : e?.target?.value ?? '',
  });

  const [templateGuard, setTemplateGuard] = useState(null);
  const [copyOpen, setCopyOpen] = useState(false);
  const [copyPick, setCopyPick] = useState(null);
  const [saveGuard, setSaveGuard] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [amendTarget, setAmendTarget] = useState(null);
  const [adviceOpen, setAdviceOpen] = useState('');

  /* โน้ตของ visit นี้ที่บันทึกไปแล้ว (แสดง/แก้ไข/ยกเลิก ครบ 4 การกระทำ) */
  const [notes, refreshNotes] = useTreatmentStore(
    subscribeTreatmentNotes,
    () => notesForVisit(hn, visitId).filter((n) => n.structured),
    [hn, visitId],
  );

  const pastVisits = useMemo(() => pastSoapFor(hn, visitId), [hn, visitId]);

  /* ── แหล่งข้อมูล S ─────────────────────────────────────── */
  const sourceS = useMemo(() => ([
    form?.symptoms ? `อาการสำคัญ (จากขั้นคัดกรอง): ${form.symptoms}` : '',
    form?.allergies ? `ประวัติการแพ้: ${form.allergies}` : '',
  ].filter(Boolean)), [form?.symptoms, form?.allergies]);

  /* ── แหล่งข้อมูล O ─────────────────────────────────────── */
  const vitals = form?.vitals || {};
  const labHistory = useMemo(() => labHistoryFor(hn), [hn]);
  const xrayHistory = useMemo(() => xrayHistoryFor(hn), [hn]);

  const sourceO = useMemo(() => {
    const vitalLine = [
      vitals.temp != null ? `BT ${vitals.temp} °C` : null,
      vitals.hr != null ? `PR ${vitals.hr} /min` : null,
      vitals.rr != null ? `RR ${vitals.rr} /min` : null,
      vitals.bp ? `BP ${vitals.bp} mmHg` : null,
      vitals.spo2 != null ? `SpO2 ${vitals.spo2}%` : null,
      vitals.weight != null ? `น้ำหนัก ${vitals.weight} กก.` : null,
      vitals.height != null ? `ส่วนสูง ${vitals.height} ซม.` : null,
      vitals.bmi != null ? `BMI ${vitals.bmi}` : null,
    ].filter(Boolean).join(', ');

    const exam = [];
    if (Array.isArray(form?.nurseExam) && form.nurseExam.length) {
      exam.push(`ตรวจร่างกาย (พยาบาล): ${form.nurseExam.map((n) => n.text || n.note || n).filter((x) => typeof x === 'string').join(' · ')}`);
    } else if (typeof form?.nurseExam === 'string' && form.nurseExam.trim()) {
      exam.push(`ตรวจร่างกาย (พยาบาล): ${form.nurseExam}`);
    }
    if (Array.isArray(form?.doctorExam) && form.doctorExam.length) {
      exam.push(`ตรวจร่างกาย (แพทย์): ${form.doctorExam.map((n) => n.text || n.note || n).filter((x) => typeof x === 'string').join(' · ')}`);
    } else if (typeof form?.doctorExam === 'string' && form.doctorExam.trim()) {
      exam.push(`ตรวจร่างกาย (แพทย์): ${form.doctorExam}`);
    }
    const markers = (form?.bodyMarkers || []).length;
    if (markers) exam.push(`ตำแหน่งที่ทำเครื่องหมายบนภาพร่างกาย: ${markers} จุด`);

    const labs = labHistory.slice(0, 3).map(
      (h) => `ผลแล็บล่าสุด (${h.daysAgo} วันก่อน): ${h.resultSummary}`,
    );
    const films = xrayHistory.slice(0, 2).map(
      (h) => `ภาพรังสีล่าสุด (${h.daysAgo} วันก่อน): ${h.resultSummary || 'ดูรายงานผลในระบบ RIS'}`,
    );

    return [
      vitalLine ? `V/S: ${vitalLine}` : '',
      ...exam,
      ...labs,
      ...films,
    ].filter(Boolean);
  }, [vitals, form?.nurseExam, form?.doctorExam, form?.bodyMarkers, labHistory, xrayHistory]);

  /* ── แหล่งข้อมูล A — รหัสวินิจฉัยของ visit นี้ ────────────── */
  const diagnoses = form?.diagnoses || [];

  /* ── แหล่งข้อมูล P — จำนวนคำสั่งทุกชนิด ─────────────────── */
  const orderChips = useMemo(() => ([
    { key: 'medication', label: 'ยา',      icon: 'pill',              n: (form?.medications || []).length },
    { key: 'lab',        label: 'แล็บ',     icon: 'science',           n: (form?.labs || []).length },
    { key: 'xray',       label: 'X-ray',   icon: 'radiology',         n: (form?.xrayOrders || []).length },
    { key: 'procedure',  label: 'หัตถการ',  icon: 'medical_services',  n: (form?.procedureOrders || []).length },
    { key: 'consult',    label: 'ปรึกษา',   icon: 'forum',             n: (form?.consultOrders || []).length },
    { key: 'appointment', label: 'นัดหมาย', icon: 'event_available',   n: form?.appointment?.mode === 'schedule' ? 1 : 0 },
  ]), [form]);

  const totalOrders = orderChips.reduce((sum, c) => sum + c.n, 0);

  /* ── auto-fill ชนกับสิ่งที่พิมพ์เอง ───────────────────────
     เมื่อดึงเข้าช่องแล้วต้นทางเปลี่ยน ห้ามเขียนทับเงียบ ๆ — ขึ้นแถบให้เลือก.
     snapshot เก็บไว้ในร่าง (soap.sSnapshot / soap.oSnapshot) ไม่ใช่ใน state
     ของ component เพราะ flow ที่โฆษณาไว้คือ "ดึงเข้า O → กดไปแก้ผลตรวจร่างกาย
     → กลับมา" ซึ่ง panel ถูก unmount ระหว่างทาง state จึงหายและไม่เคยเตือนเลย */
  const sChanged = !!soap.pulledS && !!soap.sSnapshot && joinLines(sourceS) !== soap.sSnapshot;
  const oChanged = !!soap.pulledO && !!soap.oSnapshot && joinLines(sourceO) !== soap.oSnapshot;

  useEffect(() => {
    if (!soap.pulledS && soap.sSnapshot) setSoap({ sSnapshot: '' });
    if (!soap.pulledO && soap.oSnapshot) setSoap({ oSnapshot: '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [soap.pulledS, soap.pulledO, soap.sSnapshot, soap.oSnapshot]);

  const appendTo = (key, text) => {
    if (!text) return;
    setSoap((s) => {
      const prev = String(s[key] || '').trim();
      return { ...s, [key]: prev ? `${prev}\n${text}` : text };
    });
  };

  const pullS = () => {
    const text = joinLines(sourceS);
    appendTo('s', text);
    setSoap({ pulledS: true, sSnapshot: text });
    auditSoap({ hn, visitId, field: 'ดึงข้อมูลเข้าช่อง S', newValue: text.slice(0, 80) });
  };

  const pullO = () => {
    const text = joinLines(sourceO);
    appendTo('o', text);
    setSoap({ pulledO: true, oSnapshot: text });
    auditSoap({ hn, visitId, field: 'ดึงข้อมูลเข้าช่อง O', newValue: text.slice(0, 80) });
  };

  /* ── เทมเพลต ────────────────────────────────────────────── */
  const applyTemplate = (key) => {
    const tpl = soapTemplateMeta(key);
    if (!tpl) return;
    setSoap((s) => ({
      ...s,
      templateKey: key,
      s: s.s ? `${s.s}\n${tpl.body.s}` : tpl.body.s,
      o: s.o ? `${s.o}\n${tpl.body.o}` : tpl.body.o,
      a: s.a ? `${s.a}\n${tpl.body.a}` : tpl.body.a,
      p: s.p ? `${s.p}\n${tpl.body.p}` : tpl.body.p,
    }));
    auditSoap({ hn, visitId, field: 'ใช้เทมเพลต SOAP', newValue: tpl.label });
    setTemplateGuard(null);
  };

  const requestTemplate = (key) => {
    if (!key) return;
    if (['s', 'o', 'a', 'p'].some((k) => String(soap[k] || '').trim())) {
      setTemplateGuard(key);
      return;
    }
    applyTemplate(key);
  };

  /* ── copy-forward ───────────────────────────────────────── */
  const applyCopy = () => {
    if (!copyPick) return;
    const baseline = { s: copyPick.s, o: copyPick.o, a: copyPick.a, p: copyPick.p };
    setSoap({
      ...baseline,
      copiedFrom: copyPick.visitDate,
      copiedBaseline: baseline,
      copyConfirmedSame: false,
      pulledS: false,
      pulledO: false,
    });
    auditSoap({
      hn, visitId, field: 'คัดลอก SOAP จากการตรวจครั้งก่อน',
      oldValue: '—', newValue: `${copyPick.visitDate} · ${copyPick.author}`,
    });
    setCopyOpen(false);
    setCopyPick(null);
  };

  const changedFields = soapDiffFields(soap, soap.copiedBaseline);
  const copyUnchanged = !!soap.copiedBaseline && changedFields.length === 0 && !soap.copyConfirmedSame;

  /* ── บันทึกเป็นโน้ต ─────────────────────────────────────── */
  const doSave = () => {
    if (!soapHasContent(soap)) {
      setSaveGuard('ต้องมีเนื้อหาอย่างน้อย 1 ช่อง (S / O / A / P) ความยาวไม่น้อยกว่า '
        + `${MIN_SOAP_CHARS} ตัวอักษร จึงจะบันทึกเป็นบันทึกทางคลินิกได้`);
      return;
    }
    if (copyUnchanged) {
      setSaveGuard('เนื้อหายังเหมือนกับ SOAP ที่คัดลอกมาทุกช่อง — แก้ไขอย่างน้อย 1 ช่อง '
        + 'หรือกด "ยืนยันว่าอาการเหมือนเดิมทุกประการ" ก่อนบันทึก เพื่อป้องกันบันทึกซ้ำที่ไม่สะท้อนการตรวจจริง');
      return;
    }
    const structured = { s: soap.s, o: soap.o, a: soap.a, p: soap.p };
    const bodyText = SOAP_FIELDS
      .map((f) => (structured[f.key] ? `${f.letter}: ${structured[f.key]}` : null))
      .filter(Boolean).join('\n');
    const prefix = soap.copiedFrom ? `[คัดลอกจากการตรวจ ${soap.copiedFrom}] ` : '';

    if (soap.savedNoteId) {
      updateTreatmentNote(soap.savedNoteId, { body: prefix + bodyText, structured });
    } else {
      const note = addTreatmentNote({
        hn, visitId, type: 'doctor', body: prefix + bodyText, structured,
      });
      setSoap({ savedNoteId: note.id });
    }
    rememberSoap({ hn, visitId, clinic: 'ตรวจรักษาทั่วไป (OPD)', soap });
    refreshNotes();
  };

  const doCancelNote = (reason) => {
    if (!cancelTarget) return;
    cancelTreatmentNote(cancelTarget.id, reason);
    if (cancelTarget.id === soap.savedNoteId) setSoap({ savedNoteId: '' });
    setCancelTarget(null);
    refreshNotes();
  };

  const doAmendNote = (reason) => {
    if (!amendTarget) return;
    updateTreatmentNote(amendTarget.id, { amendReason: reason });
    auditSoap({
      hn, visitId, field: 'ขอแก้ไขย้อนหลัง (amendment)',
      oldValue: noteDisplayBody(amendTarget).slice(0, 60), newValue: reason,
    });
    setSoap({
      s: amendTarget.structured?.s || '',
      o: amendTarget.structured?.o || '',
      a: amendTarget.structured?.a || '',
      p: amendTarget.structured?.p || '',
      savedNoteId: amendTarget.id,
    });
    setAmendTarget(null);
    refreshNotes();
  };

  /* ── คำแนะนำสำหรับผู้รับบริการ (§1.5.4.10) ─────────────── */
  const advice = form?.patientAdviceTopics || {};
  const setAdvice = (key) => (e) => setForm((f) => ({
    ...f,
    patientAdviceTopics: {
      ...(f.patientAdviceTopics || {}),
      [key]: typeof e === 'string' ? e : e?.target?.value ?? '',
    },
  }));
  const adviceFilled = PATIENT_ADVICE_TOPICS.filter((t) => String(advice[t.key] || '').trim()).length;

  if (!access.canView) return <AccessDeniedPanel what='บันทึก SOAP Note' />;

  const canEdit = access.canEdit;
  const goto = (key) => {
    if (onStepChange && stepIndexes[key] != null) onStepChange(stepIndexes[key]);
  };

  return (
    <div className='flex flex-col w-full min-w-0' style={{ gap: 'var(--dim-space-400, 16px)' }}>
      {/* แถบเครื่องมือบนสุด — เทมเพลต + copy-forward + บันทึก */}
      <PanelCard
        title='SOAP Note — บันทึกการรักษาของแพทย์'
        subtitle={`ผู้บันทึก ${cardPatient?.fullName ? 'สำหรับ ' + cardPatient.fullName : ''} · บันทึกนี้จะไปแสดงที่แท็บ "บันทึกทางคลินิก" และประวัติการแก้ไขโดยอัตโนมัติ`}
        action={
          <>
            <GuardedAction
              allowed={canEdit && pastVisits.length > 0}
              reason={pastVisits.length === 0
                ? 'ผู้รับบริการรายนี้ยังไม่มี SOAP Note จากการตรวจครั้งก่อน จึงคัดลอกไม่ได้'
                : NO_EDIT_RIGHT_TOOLTIP}
            >
              <NeutralSubdueButton variant='outline' size='sm' leadingIcon='content_copy' onClick={() => setCopyOpen(true)}>
                คัดลอกจาก SOAP ครั้งก่อน
              </NeutralSubdueButton>
            </GuardedAction>
            <GuardedAction allowed={canEdit}>
              <BrandPrimaryButton size='sm' leadingIcon='save' onClick={doSave}>
                {soap.savedNoteId ? 'บันทึกการแก้ไข' : 'บันทึกเป็นบันทึกทางคลินิก'}
              </BrandPrimaryButton>
            </GuardedAction>
          </>
        }
      >
        <div className='flex flex-wrap items-end w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
          <div style={{ minWidth: 300, flex: 1 }}>
            <Select
              label='เทมเพลต SOAP'
              value={soap.templateKey}
              onChange={requestTemplate}
              disabled={!canEdit}
              options={SOAP_TEMPLATES.map((t) => ({ value: t.key, label: t.label, subtext: t.description }))}
              placeholder='เลือกเทมเพลตเพื่อเติมโครงร่างทั้ง 4 ช่อง'
              helperText='เทมเพลตจะ "ต่อท้าย" ข้อความเดิม ไม่เขียนทับสิ่งที่พิมพ์ไว้'
            />
          </div>
          {soap.copiedFrom ? (
            <ColorfulBadge style='yellow' size='default' width='hug' icon='content_copy'>
              คัดลอกจากการตรวจ {soap.copiedFrom}
            </ColorfulBadge>
          ) : null}
          {soap.savedNoteId ? (
            <StatusBadge style='success' size='default' icon='check_circle'>บันทึกแล้ว</StatusBadge>
          ) : (
            <StatusBadge style='neutral' size='default' icon='edit_note'>ยังไม่ได้บันทึก (ร่างถูกเก็บอัตโนมัติ)</StatusBadge>
          )}
        </div>

        {!canEdit ? (
          <PanelAlert tone='info' icon='visibility' title='โหมดดูอย่างเดียว'>
            {NO_EDIT_RIGHT_TOOLTIP} — อ่านบันทึกได้ทั้งหมด แต่ปุ่มบันทึก/แก้ไข/ยกเลิกถูกปิดไว้
          </PanelAlert>
        ) : null}

        {copyUnchanged ? (
          <PanelAlert tone='warning' icon='warning' title='ยังไม่ได้แก้ไขเนื้อหาที่คัดลอกมา'>
            บันทึกที่คัดลอกมาทั้งดุ้นโดยไม่แก้ไขจะกลายเป็นข้อมูลลวงในเวชระเบียน —
            แก้ไขอย่างน้อย 1 ช่อง หรือกดยืนยันว่าตรวจแล้วอาการเหมือนเดิมทุกประการ
            <span style={{ display: 'block', marginTop: 'var(--dim-space-200, 8px)' }}>
              <GuardedAction allowed={canEdit}>
                <NeutralSubdueButton
                  variant='outline'
                  size='sm'
                  leadingIcon='task_alt'
                  onClick={() => {
                    setSoap({ copyConfirmedSame: true });
                    auditSoap({ hn, visitId, field: 'ยืนยันว่าอาการเหมือนเดิมทุกประการ', newValue: `อ้างอิงการตรวจ ${soap.copiedFrom}` });
                  }}
                >
                  ยืนยันว่าอาการเหมือนเดิมทุกประการ
                </NeutralSubdueButton>
              </GuardedAction>
            </span>
          </PanelAlert>
        ) : null}
        {soap.copiedBaseline && changedFields.length > 0 ? (
          <PanelAlert tone='success' icon='difference' title={`แก้ไขจากฉบับที่คัดลอกมาแล้ว ${changedFields.length} ช่อง`}>
            ช่องที่แก้ไข: {changedFields.map((k) => SOAP_FIELDS.find((f) => f.key === k)?.letter).join(' · ')}
          </PanelAlert>
        ) : null}
      </PanelCard>

      {/* ── S ─────────────────────────────────────────────── */}
      <PanelCard
        title={<span className='inline-flex items-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          <LetterAvatar letter='S' tone={LETTER_TONE.s} />
          <span style={PANEL_TITLE_STYLE}>{SOAP_FIELDS[0].title}</span>
        </span>}
        subtitle={SOAP_FIELDS[0].hint}
      >
        {sChanged ? (
          <PanelAlert tone='warning' icon='sync_problem' title='ข้อมูลต้นทางมีการเปลี่ยนแปลง'>
            อาการสำคัญ/ประวัติที่ขั้นคัดกรองถูกแก้ไขหลังจากคุณดึงเข้าช่อง S แล้ว —
            ระบบไม่เขียนทับสิ่งที่คุณพิมพ์ กด "ดึงเข้าช่องนี้" อีกครั้งเพื่อต่อท้ายข้อมูลใหม่
          </PanelAlert>
        ) : null}
        <SourceCard
          title='ดึงอัตโนมัติจากขั้นคัดกรองและซักประวัติ (OPD screening)'
          lines={sourceS}
          onPull={sourceS.length ? pullS : null}
          disabled={!canEdit}
          changed={sChanged}
        />
        <SuggestibleTextarea
          voice
          label='บันทึก Subjective'
          value={soap.s}
          onChange={setField('s')}
          suggestions={SOAP_SUGGESTIONS.s}
          minChars={2}
          height={180}
          minHeight={120}
          disabled={!canEdit}
          popoverAriaLabel='ตัวอย่างข้อความ Subjective'
          placeholder='อาการสำคัญ ระยะเวลา อาการร่วม และสิ่งที่ผู้รับบริการทำมาแล้วก่อนมาพบแพทย์'
        />
      </PanelCard>

      {/* ── O ─────────────────────────────────────────────── */}
      <PanelCard
        title={<span className='inline-flex items-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          <LetterAvatar letter='O' tone={LETTER_TONE.o} />
          <span style={PANEL_TITLE_STYLE}>{SOAP_FIELDS[1].title}</span>
        </span>}
        subtitle={SOAP_FIELDS[1].hint}
        action={
          <NeutralSubdueButton
            variant='outline'
            size='sm'
            leadingIcon='monitor_heart'
            onClick={() => goto('examination')}
          >
            ไปแก้ไขผลตรวจร่างกาย
          </NeutralSubdueButton>
        }
      >
        {oChanged ? (
          <PanelAlert tone='warning' icon='sync_problem' title='ข้อมูลต้นทางมีการเปลี่ยนแปลง'>
            สัญญาณชีพหรือผลตรวจร่างกายถูกแก้ไขหลังจากคุณดึงเข้าช่อง O แล้ว —
            กด "ดึงเข้าช่องนี้" อีกครั้งเพื่อต่อท้ายค่าล่าสุด ระบบจะไม่ลบสิ่งที่คุณพิมพ์
          </PanelAlert>
        ) : null}
        <SourceCard
          title='ดึงอัตโนมัติจากสัญญาณชีพ · ผลตรวจร่างกาย · ผลแล็บและภาพรังสีล่าสุด'
          lines={sourceO}
          onPull={sourceO.length ? pullO : null}
          disabled={!canEdit}
          changed={oChanged}
        />
        <SuggestibleTextarea
          voice
          label='บันทึก Objective'
          value={soap.o}
          onChange={setField('o')}
          suggestions={SOAP_SUGGESTIONS.o}
          minChars={2}
          height={200}
          minHeight={140}
          disabled={!canEdit}
          popoverAriaLabel='ตัวอย่างข้อความ Objective'
          placeholder='สัญญาณชีพ ผลตรวจร่างกายตามระบบ และผลตรวจทางห้องปฏิบัติการ/ภาพรังสีที่เกี่ยวข้อง'
        />
      </PanelCard>

      {/* ── A ─────────────────────────────────────────────── */}
      <PanelCard
        title={<span className='inline-flex items-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          <LetterAvatar letter='A' tone={LETTER_TONE.a} />
          <span style={PANEL_TITLE_STYLE}>{SOAP_FIELDS[2].title}</span>
        </span>}
        subtitle={SOAP_FIELDS[2].hint}
        action={
          <BrandButton variant='outline' size='sm' leadingIcon='clinical_notes' onClick={() => goto('diagnosis')}>
            ไปลงรหัสวินิจฉัย
          </BrandButton>
        }
      >
        {diagnoses.length === 0 ? (
          <PanelEmptyState
            icon='clinical_notes'
            title='ยังไม่มีรหัสการวินิจฉัยของการตรวจครั้งนี้'
            subtitle='เขียนข้อสรุปทางคลินิกไว้ก่อนได้ แล้วไปลงรหัส ICD-10 / SNOMED-CT ที่ขั้นวินิจฉัย'
            action={
              <BrandButton variant='outline' size='sm' leadingIcon='arrow_forward' onClick={() => goto('diagnosis')}>
                ไปลงรหัสวินิจฉัย
              </BrandButton>
            }
          />
        ) : (
          <div className='flex flex-wrap items-center w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
            {diagnoses.map((d) => {
              const meta = resolveDiagnosisType(d.type)
                || DIAGNOSIS_TYPE_OPTIONS.find((o) => o.value === d.type)
                || { badgeStyle: 'grey', labelTh: d.type };
              return (
                <ColorfulBadge key={d.id || d.code} style={meta.badgeStyle} size='default' width='hug'>
                  {(d.code || 'ยังไม่ลงรหัส')} · {d.name} ({meta.labelTh})
                </ColorfulBadge>
              );
            })}
          </div>
        )}
        <SuggestibleTextarea
          voice
          label='ข้อสรุปทางคลินิก (Clinical impression)'
          value={soap.a}
          onChange={setField('a')}
          suggestions={SOAP_SUGGESTIONS.a}
          minChars={2}
          height={160}
          minHeight={110}
          disabled={!canEdit}
          popoverAriaLabel='ตัวอย่างข้อความ Assessment'
          placeholder='สรุปการวินิจฉัยพร้อมเหตุผลประกอบ และโรคที่ต้องแยก (differential diagnosis)'
        />
      </PanelCard>

      {/* ── P ─────────────────────────────────────────────── */}
      <PanelCard
        title={<span className='inline-flex items-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          <LetterAvatar letter='P' tone={LETTER_TONE.p} />
          <span style={PANEL_TITLE_STYLE}>{SOAP_FIELDS[3].title}</span>
        </span>}
        subtitle={SOAP_FIELDS[3].hint}
        action={<CountLabel n={totalOrders} unit='คำสั่ง' />}
      >
        {/* สรุปคำสั่งทุกชนิด — กดแล้วกระโดดไปแท็บนั้นในขั้นสั่งการรักษา */}
        <div className='flex flex-wrap items-center w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          {orderChips.map((c) => (
            <button
              key={c.key}
              type='button'
              onClick={() => {
                if (c.key === 'appointment') { goto('appointment'); return; }
                setForm((f) => ({ ...f, orderCategory: c.key }));
                goto('orders');
              }}
              className='inline-flex items-center'
              style={{
                gap: 'var(--dim-space-100, 4px)',
                borderRadius: 'var(--dim-radius-full)',
                border: `var(--dim-stroke-100, 1px) solid ${c.n > 0
                  ? 'var(--border-brandPrimary-tertiary, #C5EDDA)'
                  : 'var(--border-neutral-quaternary)'}`,
                background: c.n > 0
                  ? 'var(--surface-brandPrimary-quaternary, #F4FBF8)'
                  : 'var(--surface-neutral-quaternary, #F9FBFB)',
                paddingTop: 'var(--dim-space-200, 8px)',
                paddingRight: 'var(--dim-space-300, 12px)',
                paddingBottom: 'var(--dim-space-200, 8px)',
                paddingLeft: 'var(--dim-space-300, 12px)',
                cursor: 'pointer',
                fontFamily: 'var(--type-family-body)',
                fontSize: 'var(--type-size-sm, 14px)',
                color: 'var(--text-content-default)',
              }}
            >
              <Sym name={c.icon} size={16} color={c.n > 0
                ? 'var(--icon-brandPrimary-default, #007549)'
                : 'var(--icon-neutral-tertiary, #ADB2B7)'} />
              {c.label} {c.n}
            </button>
          ))}
        </div>

        {/* §1.5.1.3 Continue order — สานคำสั่งต่อจาก visit ก่อน */}
        <div
          className='flex flex-wrap items-center justify-between w-full'
          style={{
            gap: 'var(--dim-space-300, 12px)',
            borderRadius: 'var(--dim-radius-300, 10px)',
            border: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary)',
            paddingTop: 'var(--dim-space-300, 12px)',
            paddingRight: 'var(--dim-space-300, 12px)',
            paddingBottom: 'var(--dim-space-300, 12px)',
            paddingLeft: 'var(--dim-space-300, 12px)',
          }}
        >
          <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-100, 4px)' }}>
            <span style={{ ...PANEL_VALUE_STYLE, fontWeight: 'var(--type-weight-bold)' }}>
              Continue order — สั่งต่อเนื่องจากการตรวจครั้งก่อน
            </span>
            <span style={PANEL_LABEL_STYLE}>
              เปิดไว้เมื่อคำสั่งเดิม (ยา/แล็บ/หัตถการ) ยังใช้ต่อไปโดยไม่เปลี่ยนแปลง —
              ระบบจะติดป้าย "ต่อเนื่อง" ที่ทุกรายการและไม่นับเป็นคำสั่งใหม่ในรายงาน
            </span>
          </div>
          <GuardedAction allowed={canEdit}>
            <NeutralSubdueButton
              variant={form?.continueOrder ? 'fill' : 'outline'}
              size='sm'
              leadingIcon={form?.continueOrder ? 'toggle_on' : 'toggle_off'}
              onClick={() => setForm((f) => ({ ...f, continueOrder: !f.continueOrder }))}
            >
              {form?.continueOrder ? 'เปิดใช้ Continue order' : 'ปิดอยู่'}
            </NeutralSubdueButton>
          </GuardedAction>
        </div>

        <SuggestibleTextarea
          voice
          label='แผนการรักษา'
          value={soap.p}
          onChange={setField('p')}
          suggestions={SOAP_SUGGESTIONS.p}
          minChars={2}
          height={180}
          minHeight={120}
          disabled={!canEdit}
          popoverAriaLabel='ตัวอย่างข้อความ Plan'
          placeholder='ยา การตรวจเพิ่มเติม หัตถการ การส่งปรึกษา และการนัดหมาย'
        />
      </PanelCard>

      {/* คำแนะนำสำหรับผู้รับบริการ — §1.5.4.10 ครบ 6 หัวข้อ */}
      <PanelCard
        title='คำแนะนำสำหรับผู้รับบริการ'
        subtitle='TOR กำหนดครบ 6 หัวข้อ — การใช้ยา · การปฏิบัติตัว · อาหาร · การมาตามนัด · การออกกำลังกาย · การป้องกันภาวะแทรกซ้อน'
        action={<CountLabel n={adviceFilled} unit={`/ ${PATIENT_ADVICE_TOPICS.length} หัวข้อ`} />}
      >
        <div className='flex flex-wrap items-center w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          {PATIENT_ADVICE_TOPICS.map((t) => {
            const filled = String(advice[t.key] || '').trim().length > 0;
            return (
              <button
                key={t.key}
                type='button'
                onClick={() => setAdviceOpen(adviceOpen === t.key ? '' : t.key)}
                className='inline-flex items-center'
                style={{
                  gap: 'var(--dim-space-100, 4px)',
                  borderRadius: 'var(--dim-radius-full)',
                  border: `var(--dim-stroke-100, 1px) solid ${adviceOpen === t.key
                    ? 'var(--border-brandPrimary-default, #007549)'
                    : filled
                      ? 'var(--border-brandPrimary-tertiary, #C5EDDA)'
                      : 'var(--border-neutral-quaternary)'}`,
                  background: filled
                    ? 'var(--surface-brandPrimary-quaternary, #F4FBF8)'
                    : 'var(--surface-neutral-quaternary, #F9FBFB)',
                  paddingTop: 'var(--dim-space-200, 8px)',
                  paddingRight: 'var(--dim-space-300, 12px)',
                  paddingBottom: 'var(--dim-space-200, 8px)',
                  paddingLeft: 'var(--dim-space-300, 12px)',
                  cursor: 'pointer',
                  fontFamily: 'var(--type-family-body)',
                  fontSize: 'var(--type-size-sm, 14px)',
                  color: 'var(--text-content-default)',
                }}
              >
                <Sym
                  name={filled ? 'check_circle' : t.icon}
                  size={16}
                  color={filled ? 'var(--icon-positive-success, #10B981)' : 'var(--icon-neutral-tertiary, #ADB2B7)'}
                />
                {t.label}
              </button>
            );
          })}
        </div>
        {adviceOpen ? (
          <SuggestibleTextarea
            voice
            label={`คำแนะนำ — ${PATIENT_ADVICE_TOPICS.find((t) => t.key === adviceOpen)?.label}`}
            value={advice[adviceOpen] || ''}
            onChange={setAdvice(adviceOpen)}
            suggestions={PATIENT_ADVICE_TOPICS.find((t) => t.key === adviceOpen)?.suggestions || []}
            minChars={2}
            height={140}
            minHeight={100}
            disabled={!canEdit}
            popoverAriaLabel='ตัวอย่างคำแนะนำ'
            placeholder='พิมพ์คำแนะนำที่จะพิมพ์ลงเอกสารสรุปการรักษาให้ผู้รับบริการ'
          />
        ) : (
          <span style={PANEL_LABEL_STYLE}>เลือกหัวข้อด้านบนเพื่อพิมพ์คำแนะนำ — หัวข้อที่กรอกแล้วจะขึ้นเครื่องหมายถูก</span>
        )}
      </PanelCard>

      {/* บันทึกที่เก็บไว้แล้วของ visit นี้ — แสดง/แก้ไข/ยกเลิก */}
      <PanelCard
        title='SOAP Note ที่บันทึกไว้แล้วในการตรวจครั้งนี้'
        subtitle='บันทึกที่ยกเลิกจะถูกขีดฆ่าไว้พร้อมเหตุผล ไม่ลบออกจากเวชระเบียน'
        action={<CountLabel n={notes.length} unit='บันทึก' />}
      >
        {notes.length === 0 ? (
          <PanelEmptyState
            icon='note_add'
            title='ยังไม่ได้บันทึก SOAP Note ของการตรวจครั้งนี้'
            subtitle='พิมพ์เนื้อหาอย่างน้อย 1 ช่อง แล้วกด "บันทึกเป็นบันทึกทางคลินิก" ด้านบน'
          />
        ) : (
          <div className='w-full min-w-0' style={{ overflowX: 'auto' }}>
            <Table
              rowKey={(r) => r.id}
              rows={notes}
              columns={[
                {
                  key: 'recordedAt', header: 'เวลาบันทึก', width: 180,
                  render: (r) => (
                    <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
                      <span style={{ ...PANEL_VALUE_STYLE, ...strikeIf(!!r.cancelledAt) }}>{r.recordedAt}</span>
                      {r.amendedAt ? <span style={PANEL_LABEL_STYLE}>แก้ไข {r.amendedAt}</span> : null}
                    </div>
                  ),
                },
                { key: 'author', header: 'ผู้บันทึก', width: 180 },
                {
                  key: 'body', header: 'เนื้อหา', flex: 1,
                  render: (r) => (
                    <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-100, 4px)' }}>
                      <span style={{ ...PANEL_VALUE_STYLE, whiteSpace: 'pre-wrap', ...strikeIf(!!r.cancelledAt) }}>
                        {noteDisplayBody(r)}
                      </span>
                      {r.cancelledAt ? <CancelledMark at={r.cancelledAt} reason={r.cancelReason} label='บันทึกถูกยกเลิก' /> : null}
                    </div>
                  ),
                },
                {
                  key: 'actions', header: '', width: 210,
                  render: (r) => (
                    <div className='flex flex-wrap items-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                      <GuardedAction allowed={canEdit && !r.cancelledAt}>
                        <NeutralSubdueButton variant='outline' size='sm' leadingIcon='edit' onClick={() => setAmendTarget(r)}>
                          ขอแก้ไข
                        </NeutralSubdueButton>
                      </GuardedAction>
                      <GuardedAction allowed={canEdit && !r.cancelledAt}>
                        <NeutralSubdueButton variant='outline' size='sm' leadingIcon='block' onClick={() => setCancelTarget(r)}>
                          ยกเลิก
                        </NeutralSubdueButton>
                      </GuardedAction>
                    </div>
                  ),
                },
              ]}
              emptyMessage='ยังไม่มีบันทึก'
            />
          </div>
        )}
      </PanelCard>

      {/* เตือนก่อนใช้เทมเพลตทับของที่พิมพ์ไว้ */}
      <AlertDialog
        open={!!templateGuard}
        type='warning'
        title='ใช้เทมเพลตกับบันทึกที่มีเนื้อหาอยู่แล้ว'
        description={`ระบบจะ "ต่อท้าย" โครงร่างของเทมเพลต "${soapTemplateMeta(templateGuard)?.label || ''}" ลงในทุกช่องที่มีข้อความอยู่แล้ว โดยไม่ลบสิ่งที่คุณพิมพ์ไว้ ต้องการดำเนินการต่อหรือไม่`}
        confirmLabel='ต่อท้ายเทมเพลต'
        cancelLabel='ยกเลิก'
        onConfirm={() => applyTemplate(templateGuard)}
        onCancel={() => setTemplateGuard(null)}
        onClose={() => setTemplateGuard(null)}
      />

      {/* เลือก visit เพื่อคัดลอก */}
      <AlertDialog
        open={copyOpen}
        type='info'
        title='คัดลอกจาก SOAP ครั้งก่อน'
        description='เลือกการตรวจที่ต้องการคัดลอก — ระบบจะติดป้าย "คัดลอกจากการตรวจ <วันที่>" ไว้บนบันทึกที่ได้ และบังคับให้แก้ไขอย่างน้อย 1 ช่องก่อนบันทึก'
        confirmLabel='คัดลอกเนื้อหานี้'
        cancelLabel='ยกเลิก'
        onConfirm={applyCopy}
        onCancel={() => { setCopyOpen(false); setCopyPick(null); }}
        onClose={() => { setCopyOpen(false); setCopyPick(null); }}
      >
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          {pastVisits.length === 0 ? (
            <span style={PANEL_LABEL_STYLE}>ผู้รับบริการรายนี้ยังไม่มี SOAP Note จากการตรวจครั้งก่อน</span>
          ) : pastVisits.map((v) => (
            <button
              key={v.id}
              type='button'
              onClick={() => setCopyPick(v)}
              className='flex flex-col w-full text-left'
              style={{
                gap: 'var(--dim-space-100, 4px)',
                borderRadius: 'var(--dim-radius-300, 10px)',
                border: `var(--dim-stroke-100, 1px) solid ${copyPick?.id === v.id
                  ? 'var(--border-brandPrimary-default, #007549)'
                  : 'var(--border-neutral-quaternary)'}`,
                background: copyPick?.id === v.id
                  ? 'var(--surface-brandPrimary-quaternary, #F4FBF8)'
                  : 'var(--surface-card-100)',
                paddingTop: 'var(--dim-space-300, 12px)',
                paddingRight: 'var(--dim-space-300, 12px)',
                paddingBottom: 'var(--dim-space-300, 12px)',
                paddingLeft: 'var(--dim-space-300, 12px)',
                cursor: 'pointer',
              }}
            >
              <span style={{ ...PANEL_VALUE_STYLE, fontWeight: 'var(--type-weight-bold)' }}>
                {v.visitDate} · {v.clinic}
              </span>
              <span style={PANEL_LABEL_STYLE}>ผู้บันทึก {v.author}</span>
              <span style={{ ...PANEL_LABEL_STYLE, whiteSpace: 'pre-wrap' }}>
                S: {v.s.slice(0, 90)}{v.s.length > 90 ? '…' : ''}
              </span>
              {copyPick?.id === v.id ? (
                <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-100, 4px)', marginTop: 'var(--dim-space-200, 8px)' }}>
                  <span style={{ ...PANEL_LABEL_STYLE, fontWeight: 'var(--type-weight-bold)' }}>
                    ความต่างจากที่พิมพ์ไว้ตอนนี้
                  </span>
                  {SOAP_FIELDS.map((f) => {
                    const now = String(soap[f.key] || '').trim();
                    const next = String(v[f.key] || '').trim();
                    if (now === next) return null;
                    return (
                      <span key={f.key} style={PANEL_LABEL_STYLE}>
                        {f.letter}: {now ? 'จะถูกแทนที่ด้วยเนื้อหาของครั้งก่อน' : 'จะถูกเติมจากครั้งก่อน'}
                      </span>
                    );
                  })}
                </div>
              ) : null}
            </button>
          ))}
        </div>
      </AlertDialog>

      {/* กันบันทึกเมื่อยังไม่ผ่านเงื่อนไข */}
      <AlertDialog
        open={!!saveGuard}
        type='warning'
        title='ยังบันทึก SOAP Note ไม่ได้'
        description={saveGuard || ''}
        confirmLabel='กลับไปแก้ไข'
        showCancel={false}
        onConfirm={() => setSaveGuard(null)}
        onClose={() => setSaveGuard(null)}
      />

      {/* ยกเลิกบันทึก — บังคับเหตุผล */}
      <ReasonDialog
        open={!!cancelTarget}
        type='destructive'
        title='ยกเลิกบันทึก SOAP Note'
        description='ระบบจะขีดฆ่าบันทึกนี้ไว้พร้อมเหตุผลและเวลา ไม่ลบออกจากเวชระเบียน ตามข้อกำหนดการเก็บร่องรอยการแก้ไข'
        confirmLabel='ยืนยันการยกเลิก'
        suggestions={[
          'บันทึกผิดผู้รับบริการ — จะบันทึกใหม่ให้ถูกต้อง',
          'บันทึกซ้ำกับฉบับก่อนหน้าโดยไม่ตั้งใจ',
          'ข้อมูลที่บันทึกยังไม่ครบถ้วน ต้องตรวจเพิ่มเติมก่อน',
        ]}
        onConfirm={doCancelNote}
        onClose={() => setCancelTarget(null)}
      />

      {/* ขอแก้ไขย้อนหลัง — amendment ไม่ทับของเดิม */}
      <ReasonDialog
        open={!!amendTarget}
        type='warning'
        title='ขอแก้ไขบันทึกย้อนหลัง (Amendment)'
        description='บันทึกฉบับเดิมจะยังอยู่ในเวชระเบียน ระบบจะประทับเวลาแก้ไขและเหตุผลไว้ แล้วนำเนื้อหากลับมาที่ช่องพิมพ์ให้แก้'
        confirmLabel='นำกลับมาแก้ไข'
        suggestions={[
          'เพิ่มผลตรวจที่รายงานเข้ามาหลังบันทึกฉบับแรก',
          'แก้ไขข้อความที่พิมพ์ผิด ไม่ได้เปลี่ยนเนื้อหาทางคลินิก',
          'เพิ่มรายละเอียดแผนการรักษาตามที่ปรึกษาแพทย์เฉพาะทางแล้ว',
        ]}
        onConfirm={doAmendNote}
        onClose={() => setAmendTarget(null)}
      />
    </div>
  );
};

export default SoapNotePanel;
