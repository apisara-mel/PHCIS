import React, { useEffect, useMemo, useState } from 'react';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import TabPill from '@/components/tab/TabPill';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import StatusBadge from '@/components/badge/StatusBadge';
import Checkbox from '@/components/checkbox/Checkbox';
import Tooltip from '@/components/tooltip/Tooltip';
import BrandButton from '@/components/button/BrandButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import UnsavedChangesPopup from '@/components/popup/UnsavedChangesPopup';
import {
  PanelCard, PanelEmptyState, CancelledMark, strikeIf,
  PANEL_LABEL_STYLE, PANEL_VALUE_STYLE,
} from '@/pages/treat/panels/panelKit';
import {
  useTreatmentAccess, useTreatmentStore, GuardedAction, AccessDeniedPanel,
  ReasonDialog, PanelAlert, CountLabel, MaskedValue,
} from '@/pages/treat/panels/panelHooks';
import {
  NOTE_TYPES, noteTypeMeta, canAuthorNoteType, noteSuggestions,
  subscribeTreatmentNotes, notesForPatient, noteDisplayBody,
  addTreatmentNote, updateTreatmentNote, cancelTreatmentNote, restoreTreatmentNote,
} from '@/data/treatmentNotes';
import { CURRENT_CLINICIAN, appendAudit } from '@/data/treatmentAudit';
import { NO_CONFIDENTIAL_RIGHT_TOOLTIP } from '@/data/treatmentAccess';

/* PHCIS | EMR §1.4.4.1 / §1.4.4.2 — บันทึกทางคลินิก (Clinical Notes).
   ครบ 5 ประเภทตาม TOR: แพทย์ / พยาบาล / ความคืบหน้า / หัตถการ / เภสัชกร
   โดยตัวเลือกประเภทถูก gate ด้วย role ผ่าน canAuthorNoteType.

   สัญญากับ Wave S (SOAP): wave นี้เขียน `structured: null` เสมอ และ
   ทุกจุดที่แสดงเนื้อหาอ่านผ่าน `noteDisplayBody(note)` ไม่ผูกกับ
   `note.body` ตรง ๆ — Wave S จึงสลับ SOAP composer เข้ามาได้โดยไม่ต้อง
   แก้ไฟล์นี้เลย. */

const MIN_NOTE_CHARS = 10;

/* ── การ์ด Note หนึ่งรายการ ─────────────────────────────────── */

const NoteCard = ({ note, canEdit, canSeeConfidential, revealed, onEdit, onCancel, onRestore, onReveal }) => {
  const meta = noteTypeMeta(note.type);
  const cancelled = !!note.cancelledAt;
  /* `revealed` = ผ่านประตูขอเปิดดูในรอบการทำงานนี้แล้ว (บันทึก access log ไว้) */
  const masked = note.confidential && !canSeeConfidential && !revealed;

  return (
    <article
      className='flex flex-col w-full min-w-0'
      style={{
        gap: 'var(--dim-space-200, 8px)',
        borderRadius: 'var(--dim-radius-300, 10px)',
        border: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary)',
        background: 'var(--surface-card-100)',
        paddingTop: 'var(--dim-space-300, 12px)',
        paddingRight: 'var(--dim-space-300, 12px)',
        paddingBottom: 'var(--dim-space-300, 12px)',
        paddingLeft: 'var(--dim-space-300, 12px)',
      }}
    >
      <header className='flex flex-wrap items-start justify-between w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
        <div className='flex flex-wrap items-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          <ColorfulBadge style={meta.tone} size='small' width='hug'>{meta.label}</ColorfulBadge>
          {note.confidential ? (
            <StatusBadge style='purple' size='small' icon='lock'>ข้อมูลลับ</StatusBadge>
          ) : null}
          <span style={PANEL_LABEL_STYLE}>{note.author}</span>
        </div>
        <div className='flex flex-wrap items-center shrink-0' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          {!cancelled ? (
            <>
              <GuardedAction allowed={canEdit && !masked}>
                <NeutralSubdueButton variant='outline' size='sm' leadingIcon='edit' onClick={() => onEdit(note)}>
                  แก้ไข
                </NeutralSubdueButton>
              </GuardedAction>
              <GuardedAction allowed={canEdit}>
                <NeutralSubdueButton variant='outline' size='sm' leadingIcon='block' onClick={() => onCancel(note)}>
                  ยกเลิก
                </NeutralSubdueButton>
              </GuardedAction>
            </>
          ) : (
            <GuardedAction allowed={canEdit}>
              <NeutralSubdueButton variant='outline' size='sm' leadingIcon='restore' onClick={() => onRestore(note)}>
                กู้คืน
              </NeutralSubdueButton>
            </GuardedAction>
          )}
        </div>
      </header>

      <p style={{ ...PANEL_VALUE_STYLE, whiteSpace: 'pre-wrap', ...strikeIf(cancelled) }}>
        <MaskedValue masked={masked} onReveal={() => onReveal(note)}>
          {noteDisplayBody(note)}
        </MaskedValue>
      </p>

      <footer className='flex flex-wrap items-center w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
        <span style={PANEL_LABEL_STYLE}>บันทึกเมื่อ {note.recordedAt}</span>
        {note.amendedAt ? (
          <span style={PANEL_LABEL_STYLE}>แก้ไขล่าสุด {note.amendedAt}</span>
        ) : null}
      </footer>

      {cancelled ? <CancelledMark at={note.cancelledAt} reason={note.cancelReason} /> : null}
    </article>
  );
};

/* ── panel หลัก ─────────────────────────────────────────────── */

const ClinicalNotesPanel = ({ form, setForm, patient }) => {
  const access = useTreatmentAccess();
  const hn = patient?.hn || '';
  const role = CURRENT_CLINICIAN.role;

  const [notes] = useTreatmentStore(
    subscribeTreatmentNotes,
    () => notesForPatient(hn),
    [hn],
  );

  const [type, setType] = useState('doctor');
  const [body, setBody] = useState('');
  const [confidential, setConfidential] = useState(false);
  const [editing, setEditing] = useState(null);
  const [touched, setTouched] = useState(false);
  const [filters, setFilters] = useState([]);            /* [] = ทั้งหมด */
  const [includeCancelled, setIncludeCancelled] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [revealTarget, setRevealTarget] = useState(null);
  /* id ของ note ที่ผ่านประตูขอเปิดดูแล้วในรอบนี้ — เปิดจริง ไม่ใช่แค่ปิด dialog */
  const [revealedIds, setRevealedIds] = useState([]);
  const [leaveGuard, setLeaveGuard] = useState(false);

  /* ค่าเริ่มต้นของ note ประเภทแพทย์ = ช่อง Doctor Note เดิมของ Step 4
     (คงฟิลด์ diagnosisNote ไว้ ไม่รื้อ) */
  useEffect(() => {
    if (!editing && type === 'doctor' && !body && form?.diagnosisNote) {
      setBody(form.diagnosisNote);
    }
    /* ตั้งค่าครั้งเดียวตอน mount เท่านั้น */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visible = useMemo(() => notes
    .filter((n) => (filters.length === 0 ? true : filters.includes(n.type)))
    .filter((n) => (includeCancelled ? true : !n.cancelledAt)),
  [notes, filters, includeCancelled]);

  const dirty = body.trim().length > 0;
  const tooShort = body.trim().length < MIN_NOTE_CHARS;
  const canAuthor = canAuthorNoteType(type, role);

  const resetComposer = () => {
    setBody(''); setEditing(null); setConfidential(false); setTouched(false);
  };

  const submit = () => {
    setTouched(true);
    if (tooShort || !canAuthor || !access.canEdit) return;
    if (editing) {
      updateTreatmentNote(editing.id, { body: body.trim(), type, confidential });
    } else {
      addTreatmentNote({ hn, visitId: form?.visitId || 'v-current', type, body: body.trim(), confidential });
      /* คง field เดิมของ Step 4 ให้ตรงกับ note ล่าสุดของแพทย์ */
      if (type === 'doctor') setForm((f) => ({ ...f, diagnosisNote: body.trim() }));
    }
    resetComposer();
  };

  const startEdit = (note) => {
    setEditing(note);
    setType(note.type);
    setBody(noteDisplayBody(note));
    setConfidential(!!note.confidential);
    setTouched(false);
  };

  const cancelEdit = () => {
    /* ต้องออกจากโหมดแก้ไขได้จริง — ถ้าเคลียร์แค่ body แต่คง `editing` ไว้
       ผู้ใช้จะติดอยู่ในโหมดแก้ไข และการกดบันทึกครั้งถัดไปจะไปทับ note เดิม */
    if (editing) {
      /* พิมพ์แก้ไปแล้วต่างจากของเดิม → ถามก่อนทิ้ง */
      if (body.trim() !== noteDisplayBody(editing).trim()) { setLeaveGuard(true); return; }
      resetComposer();
      return;
    }
    if (dirty) { setLeaveGuard(true); return; }
    resetComposer();
  };

  const toggleFilter = (key) => setFilters((f) => (
    f.includes(key) ? f.filter((k) => k !== key) : [...f, key]
  ));

  if (!access.canView) return <AccessDeniedPanel what='บันทึกทางคลินิก' />;

  const emptyKind = notes.length === 0
    ? 'none'
    : (visible.length === 0 ? 'filtered' : null);

  return (
    <div className='flex flex-col w-full min-w-0' style={{ gap: 'var(--dim-space-400, 16px)' }}>
      {/* ── Composer ─────────────────────────────────────── */}
      <PanelCard
        title={editing ? 'แก้ไขบันทึกทางคลินิก' : 'บันทึกทางคลินิก (Clinical Note)'}
        subtitle={
          editing
            ? `กำลังแก้ไขบันทึกของ ${editing.author} (${editing.recordedAt}) — ระบบจะประทับเวลาที่แก้ไขเพิ่ม ไม่ทับเวลาที่บันทึกเดิม`
            : 'เลือกประเภทบันทึก แล้วพิมพ์เนื้อหา — ทุกบันทึกจะประทับผู้บันทึกและเวลาโดยอัตโนมัติ'
        }
      >
        {/* ตัวเลือกประเภท — gate ตาม role */}
        <div className='flex flex-wrap w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          {NOTE_TYPES.map((t) => {
            const allowed = canAuthorNoteType(t.key, role);
            const pill = (
              <TabPill
                key={t.key}
                selected={type === t.key}
                disabled={!allowed}
                onClick={allowed ? () => setType(t.key) : undefined}
              >
                {t.label}
              </TabPill>
            );
            return allowed ? pill : (
              <Tooltip
                key={t.key}
                position='top'
                content={`ต้องมีบทบาท "${t.roles.map((r) => ({ doctor: 'แพทย์', nurse: 'พยาบาล', pharmacist: 'เภสัชกร' }[r] || r)).join(' หรือ ')}" จึงจะบันทึกประเภทนี้ได้ — บัญชีปัจจุบันคือ ${CURRENT_CLINICIAN.roleLabel}`}
              >
                <span style={{ display: 'inline-flex', cursor: 'not-allowed' }}>{pill}</span>
              </Tooltip>
            );
          })}
        </div>

        {!canAuthor ? (
          <PanelAlert tone='warning' icon='badge' title='บัญชีปัจจุบันบันทึกประเภทนี้ไม่ได้'>
            {noteTypeMeta(type).label} สงวนไว้สำหรับบทบาทที่กำหนดเท่านั้น — เลือกประเภทอื่น หรือให้ผู้มีบทบาทนั้นเป็นผู้บันทึก
          </PanelAlert>
        ) : null}

        <SuggestibleTextarea
          voice
          label={noteTypeMeta(type).label}
          required
          value={body}
          onChange={(e) => setBody(typeof e === 'string' ? e : e?.target?.value ?? '')}
          suggestions={noteSuggestions(type)}
          minChars={2}
          height={168}
          minHeight={112}
          disabled={!access.canEdit || !canAuthor}
          popoverAriaLabel={`คำแนะนำ${noteTypeMeta(type).label}`}
          placeholder='พิมพ์เนื้อหาบันทึก หรือเลือกจากคำแนะนำที่ระบบเสนอ'
        />

        {touched && tooShort ? (
          <span style={{ ...PANEL_LABEL_STYLE, color: 'var(--text-alert-error, #B91C1C)' }}>
            เนื้อหาบันทึกต้องมีอย่างน้อย {MIN_NOTE_CHARS} ตัวอักษร (ขณะนี้ {body.trim().length} ตัวอักษร)
          </span>
        ) : null}

        <div className='flex flex-wrap items-center justify-between w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
          <Checkbox
            checked={confidential}
            onChange={() => setConfidential((c) => !c)}
            disabled={!access.canEdit || !access.canSeeConfidential}
            label='ทำเครื่องหมายเป็นข้อมูลลับ (ผู้ที่ไม่มีสิทธิ์จะเห็นเป็น ••••)'
          />
          <div className='flex flex-wrap items-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
            {editing || dirty ? (
              <NeutralSubdueButton variant='outline' size='sm' leadingIcon='undo' onClick={cancelEdit}>
                ยกเลิกการแก้ไข
              </NeutralSubdueButton>
            ) : null}
            <GuardedAction allowed={access.canEdit && canAuthor}>
              <BrandButton variant='fill' size='sm' leadingIcon='save' onClick={submit}>
                {editing ? 'บันทึกการแก้ไข' : 'บันทึก'}
              </BrandButton>
            </GuardedAction>
          </div>
        </div>

        {!access.canSeeConfidential ? (
          <span style={PANEL_LABEL_STYLE}>{NO_CONFIDENTIAL_RIGHT_TOOLTIP}</span>
        ) : null}
      </PanelCard>

      {/* ── ประวัติ Note ─────────────────────────────────── */}
      <PanelCard
        title='ประวัติบันทึกทางคลินิก'
        subtitle='เรียงจากใหม่ไปเก่า — แสดงผู้บันทึก เวลาที่บันทึก และเวลาที่แก้ไข'
        action={<CountLabel n={visible.length} />}
      >
        <div className='flex flex-wrap items-center w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          <TabPill selected={filters.length === 0} onClick={() => setFilters([])}>ทั้งหมด</TabPill>
          {NOTE_TYPES.map((t) => (
            <TabPill
              key={t.key}
              selected={filters.includes(t.key)}
              onClick={() => toggleFilter(t.key)}
            >
              {t.short}
            </TabPill>
          ))}
          <div style={{ marginLeft: 'auto' }}>
            <Checkbox
              checked={includeCancelled}
              onChange={() => setIncludeCancelled((v) => !v)}
              label='รวมรายการที่ยกเลิก'
            />
          </div>
        </div>

        {emptyKind === 'none' ? (
          <PanelEmptyState
            icon='edit_note'
            title='ยังไม่มีบันทึกทางคลินิกของผู้รับบริการรายนี้'
            subtitle='บันทึกแรกจะปรากฏที่นี่ทันทีหลังกดบันทึกจากช่องด้านบน'
          />
        ) : emptyKind === 'filtered' ? (
          <PanelEmptyState
            icon='filter_alt_off'
            title={`ไม่พบบันทึกประเภท${filters.map((k) => noteTypeMeta(k).short).join(' / ')}`}
            subtitle={
              includeCancelled
                ? 'ผู้รับบริการมีบันทึกประเภทอื่นอยู่ — ลองเลือก "ทั้งหมด"'
                : 'อาจมีบันทึกที่ถูกยกเลิกไปแล้ว — ติ๊ก "รวมรายการที่ยกเลิก" เพื่อดู'
            }
            action={
              <NeutralSubdueButton variant='outline' size='sm' leadingIcon='filter_alt_off' onClick={() => { setFilters([]); setIncludeCancelled(true); }}>
                แสดงทั้งหมด
              </NeutralSubdueButton>
            }
          />
        ) : (
          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
            {visible.map((n) => (
              <NoteCard
                key={n.id}
                note={n}
                canEdit={access.canEdit}
                canSeeConfidential={access.canSeeConfidential}
                revealed={revealedIds.includes(n.id)}
                onEdit={startEdit}
                onCancel={setCancelTarget}
                onRestore={(note) => restoreTreatmentNote(note.id)}
                onReveal={setRevealTarget}
              />
            ))}
          </div>
        )}
      </PanelCard>

      {/* ยกเลิก Note — บังคับเหตุผล, soft-cancel */}
      <ReasonDialog
        open={!!cancelTarget}
        type='destructive'
        title='ยกเลิกบันทึกทางคลินิก'
        description='ระบบจะขีดฆ่าบันทึกนี้ไว้พร้อมเหตุผลและผู้ยกเลิก ไม่ลบออกจากประวัติ และสามารถกู้คืนได้ภายหลัง'
        confirmLabel='ยืนยันการยกเลิก'
        suggestions={[
          'บันทึกผิดผู้รับบริการ — บันทึกใหม่ในเวชระเบียนที่ถูกต้องแล้ว',
          'บันทึกซ้ำกับรายการก่อนหน้าโดยไม่ตั้งใจ',
          'เนื้อหาคลาดเคลื่อนจากการตรวจจริง — บันทึกฉบับแก้ไขไว้เป็นรายการใหม่',
          'ลงประเภทบันทึกผิด — ย้ายไปบันทึกในประเภทที่ถูกต้องแล้ว',
        ]}
        onConfirm={(reason) => { cancelTreatmentNote(cancelTarget.id, reason); setCancelTarget(null); }}
        onClose={() => setCancelTarget(null)}
      />

      {/* ขอเปิดดูข้อมูลลับ — บันทึก access log ทุกครั้ง */}
      <ReasonDialog
        open={!!revealTarget}
        type='warning'
        title='ขอเปิดดูบันทึกที่เป็นข้อมูลลับ'
        description='การเปิดดูจะถูกบันทึกลงประวัติการเข้าถึงพร้อมชื่อผู้ขอ เวลา และเหตุผล — ตรวจสอบย้อนหลังได้เสมอ'
        confirmLabel='ขอเปิดดู'
        minLength={10}
        suggestions={[
          'จำเป็นต่อการวางแผนการรักษาต่อเนื่องของผู้รับบริการรายนี้',
          'ตรวจสอบความถูกต้องของข้อมูลก่อนออกเอกสารรับรอง',
          'ผู้รับบริการร้องขอสำเนาเวชระเบียนด้วยตนเอง',
        ]}
        onConfirm={(reason) => {
          /* prototype: จำกัดที่ mask + reveal gate + access log —
             field-level encryption ต้องทำที่ backend.
             แต่ access log ต้องเขียนจริงลง TREATMENT_AUDIT ตาม §1.4.2.1
             และต้องเปิดค่าให้เห็นจริง ไม่ใช่แค่ปิด dialog */
          appendAudit({
            hn,
            visitId: form?.visitId || '',
            category: 'confidential',
            field: `ขอเปิดดูบันทึกลับ — ${noteTypeMeta(revealTarget.type).label} (${revealTarget.recordedAt})`,
            oldValue: 'ปิดบัง (••••)',
            newValue: `เปิดดูโดย ${CURRENT_CLINICIAN.name} — ${reason}`,
          });
          setRevealedIds((ids) => (ids.includes(revealTarget.id) ? ids : [...ids, revealTarget.id]));
          setRevealTarget(null);
        }}
        onClose={() => setRevealTarget(null)}
      />

      <UnsavedChangesPopup
        open={leaveGuard}
        onClose={() => setLeaveGuard(false)}
        onSave={() => { setLeaveGuard(false); submit(); }}
        onDiscard={() => { setLeaveGuard(false); resetComposer(); }}
        title={editing ? 'ยังไม่ได้บันทึกการแก้ไขบันทึกนี้' : 'ยังไม่ได้บันทึกเนื้อหาที่พิมพ์ไว้'}
        description={editing
          ? 'กด "บันทึก" เพื่อบันทึกการแก้ไขทับบันทึกเดิม หรือ "ไม่บันทึก" เพื่อออกจากโหมดแก้ไขโดยคงบันทึกเดิมไว้ตามเดิม'
          : 'กด "บันทึก" เพื่อเก็บเป็นบันทึกทางคลินิก หรือ "ไม่บันทึก" เพื่อล้างช่องพิมพ์'}
      />
    </div>
  );
};

export default ClinicalNotesPanel;
