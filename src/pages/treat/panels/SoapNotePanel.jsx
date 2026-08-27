import React, { useEffect, useMemo, useState } from 'react';
import Select from '@/components/forms/Select';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import StatusBadge from '@/components/badge/StatusBadge';
import TabPill, { TabBar } from '@/components/tab/TabPill';
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
  SOAP_FIELDS, SOAP_SUGGESTIONS,
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

/* แต่ละตัวอักษรเป็นการ์ดของตัวเองอยู่แล้ว แต่ทั้งสี่ใบหน้าตาเหมือนกันหมด
   กวาดตาแล้วแยกไม่ออกว่าอยู่ช่วงไหน — ติดแถบสีซ้ายตามสีประจำตัวอักษร
   (เดียวกับ LetterAvatar) แล้วเว้นระยะระหว่างการ์ดให้กว้างขึ้น
   (มติผู้ใช้ 28 ส.ค. 69) */
const soapCardStyle = (tone) => ({
  borderLeft: `var(--dim-stroke-400, 4px) solid ${tone.fg}`,
  boxShadow: 'var(--shadow-brand-drop-bottom-200)',
});

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
      fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
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
        <span style={{ ...PANEL_LABEL_STYLE, fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))' }}>{title}</span>
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

  const [copyOpen, setCopyOpen] = useState(false);
  const [copyPick, setCopyPick] = useState(null);
  const [saveGuard, setSaveGuard] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [amendTarget, setAmendTarget] = useState(null);
  /* เปิดมาที่ "การใช้ยา" เลย — เป็นหัวข้อที่หมอกรอกแทบทุกครั้ง และการ์ดที่ไม่มี
     ช่องพิมพ์เปิดอยู่จะดูเหมือนยังโหลดไม่เสร็จ (มติผู้ใช้ 28 ส.ค. 69) */
  const [adviceOpen, setAdviceOpen] = useState(PATIENT_ADVICE_TOPICS[0].key);

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

  /* เทมเพลต SOAP ถูกเอาออกทั้งชุด 28 ส.ค. 69 — ช่อง S/O/A/P ต้องเริ่มว่างเปล่า
     ไม่มีโครงร่างเติมให้ (ตัวเลือกเทมเพลตบนแถบเครื่องมือถูกตัดไปก่อนหน้านี้แล้ว) */

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
    <div className='flex flex-col w-full min-w-0' style={{ gap: 'var(--dim-space-600, 24px)' }}>
      {/* แถบเครื่องมือ SOAP บนสุด (หัวข้อ · เทมเพลต · คัดลอกจากครั้งก่อน ·
          ปุ่มบันทึกเป็นบันทึกทางคลินิก · ป้ายสถานะการบันทึก) ถูกเอาออก
          28 ส.ค. 69 — ⚠️ ปุ่มบันทึกที่ถูกตัดไปเป็นทางเดียวที่เรียก `doSave`
          ตอนนี้จึงไม่มีทางสร้าง "บันทึกทางคลินิก" จากขั้นนี้ ต้องหาที่ผูกใหม่
          (ร่างยังถูกเก็บอัตโนมัติตามเดิม) */}
      <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
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
      </div>

      {/* ── S ─────────────────────────────────────────────── */}
      <PanelCard
        style={soapCardStyle(LETTER_TONE.s)}
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
          style={{ maxWidth: 'none' }}
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
        style={soapCardStyle(LETTER_TONE.o)}
        title={<span className='inline-flex items-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          <LetterAvatar letter='O' tone={LETTER_TONE.o} />
          <span style={PANEL_TITLE_STYLE}>{SOAP_FIELDS[1].title}</span>
        </span>}
        subtitle={SOAP_FIELDS[1].hint}
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
          style={{ maxWidth: 'none' }}
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
        style={soapCardStyle(LETTER_TONE.a)}
        title={<span className='inline-flex items-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          <LetterAvatar letter='A' tone={LETTER_TONE.a} />
          <span style={PANEL_TITLE_STYLE}>{SOAP_FIELDS[2].title}</span>
        </span>}
        subtitle={SOAP_FIELDS[2].hint}
      >
        {/* empty state และปุ่ม "ไปลงรหัสวินิจฉัย" ถูกเอาออก 28 ส.ค. 69 —
            ขั้นวินิจฉัยมาก่อน SOAP ในลำดับใหม่แล้ว จึงไม่ต้องมีทางลัดย้อนกลับ */}
        {diagnoses.length === 0 ? null : (
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
          style={{ maxWidth: 'none' }}
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
        style={soapCardStyle(LETTER_TONE.p)}
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

        {/* แถบ Continue order (§1.5.1.3) ถูกเอาออก 28 ส.ค. 69 —
            `form.continueOrder` ยังอยู่ในฟอร์ม รอหาที่วางใหม่ */}

        <SuggestibleTextarea
          voice
          label='แผนการรักษา'
          style={{ maxWidth: 'none' }}
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
        style={{ boxShadow: 'var(--shadow-brand-drop-bottom-200)' }}
        action={<CountLabel n={adviceFilled} unit={`/ ${PATIENT_ADVICE_TOPICS.length} หัวข้อ`} />}
      >
        <div className='flex w-full'>
        <TabBar aria-label='หัวข้อคำแนะนำสำหรับผู้รับบริการ'>
          {/* ชิปหัวข้อคำแนะนำใช้ TabPill ของดีไซน์ซิสเทม ไม่ใช่ปุ่มที่เขียนสไตล์เอง
              (มติผู้ใช้ 28 ส.ค. 69) — หัวข้อที่กรอกแล้วเปลี่ยนไอคอนเป็น check_circle */}
          {PATIENT_ADVICE_TOPICS.map((t) => {
            const filled = String(advice[t.key] || '').trim().length > 0;
            return (
              <TabPill
                key={t.key}
                size='small'
                selected={adviceOpen === t.key}
                leadingIcon={filled ? 'check_circle' : t.icon}
                onClick={() => setAdviceOpen(adviceOpen === t.key ? '' : t.key)}
              >
                {t.label}
              </TabPill>
            );
          })}
        </TabBar>
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
        ) : null}
      </PanelCard>

      {/* การ์ด "SOAP Note ที่บันทึกไว้แล้วในการตรวจครั้งนี้" ถูกเอาออก 28 ส.ค. 69
          — บันทึกที่เก็บแล้วอ่านได้จากแท็บ "บันทึกทางคลินิก" อยู่แล้ว */}

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
              <span style={{ ...PANEL_VALUE_STYLE, fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))' }}>
                {v.visitDate} · {v.clinic}
              </span>
              <span style={PANEL_LABEL_STYLE}>ผู้บันทึก {v.author}</span>
              <span style={{ ...PANEL_LABEL_STYLE, whiteSpace: 'pre-wrap' }}>
                S: {v.s.slice(0, 90)}{v.s.length > 90 ? '…' : ''}
              </span>
              {copyPick?.id === v.id ? (
                <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-100, 4px)', marginTop: 'var(--dim-space-200, 8px)' }}>
                  <span style={{ ...PANEL_LABEL_STYLE, fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))' }}>
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
