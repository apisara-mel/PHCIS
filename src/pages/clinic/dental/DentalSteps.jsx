import React, { useEffect, useMemo, useRef, useState } from 'react';
import Icon from '@/components/icons/Icon';
import Table from '@/components/table/Table';
import Pagination from '@/components/pagination/Pagination';
import Popup from '@/components/popup/Popup';
import Select from '@/components/forms/Select';
import InputField from '@/components/forms/InputField';
import Checkbox from '@/components/checkbox/Checkbox';
import SelectableTag from '@/components/forms/SelectableTag';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import DiagTypeSelect from '@/components/forms/DiagTypeSelect';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import Tooltip from '@/components/tooltip/Tooltip';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import BrandIconButton from '@/components/button/BrandIconButton';
import {
  MedicalHistoryReadOnlyLayout,
  Step5Orders,
  Step6Appointment,
  Step7Certificate,
} from '@/components/forms/TreatmentSteps';
import DocumentCenterPanel from '@/pages/treat/panels/DocumentCenterPanel';
import DentalChartPanel from '@/pages/clinic/dental/DentalChartPanel';
import {
  TopicHeader, StepCard, SectionCard, InfoPair, FieldLabel, Note, EmptyState,
  formatBaht, toothListLabel, ReimbursableBadge, AuditCell, MutedText, BodyText,
} from '@/pages/clinic/dental/dentalShared';
import {
  DENTAL_DIAGNOSES,
  DENTAL_ICD_SUGGESTIONS,
  DENTAL_SNOMED_BY_ICD,
  DENTAL_PROCEDURES,
  DENTAL_OTHER_SERVICES,
  DENTAL_CONSUMABLES,
  findDentalProcedure,
  findDentalConsumable,
  suggestProceduresForDiagnoses,
  resolveDentalRightKey,
  isProcedureReimbursable,
  dentalMaterialLabelOf,
  surfaceLabelOf,
} from '@/data/dentalCatalog';
import {
  DENTAL_DOCTORS,
  DENTAL_SCREENING_VITALS,
  getDentalAllergyRows,
  getDentalHealthProfile,
  getDentalPastDiagnoses,
  getDentalToothHistory,
  getDentalTeethWithHistory,
  stampDentalAudit,
  formatDentalDateTime,
  CURRENT_DENTAL_USER,
  DENTAL_CC_SUGGESTIONS,
  DENTAL_DOCTOR_NOTE_SUGGESTIONS,
  DENTAL_DIAGNOSIS_NOTE_SUGGESTIONS,
  DENTAL_TREATMENT_NOTE_SUGGESTIONS,
} from '@/data/dentalVisits';
import { resolveDiagnosisType } from '@/data/treatmentVisits';

/* DentalSteps — เนื้อของ 7 ขั้นตอนในหน้า บันทึกทันตกรรม
   (/clinic/dental/record, TOR §1.10.1.1 + §1.10.1.2).

   ลำดับขั้นถูกล็อกไว้ที่ 7 โดย getDentalCompletedSteps() ใน dentalVisits.js
   ซึ่งคืน boolean 7 ตัวเรียงตาม: ประวัติ / ตรวจฟัน / วินิจฉัย /
   หัตถการ+วัสดุ / คำสั่งทางการแพทย์ / นัดหมาย / ใบรับรองแพทย์ —
   ห้ามยุบหรือสลับขั้นโดยไม่แก้ helper พร้อมกัน.

   สิ่งที่ "ผูก ไม่ใช่เขียนใหม่" (playbook §2.8 + spec):
     • ขั้น 2  — DentalChartPanel เดิม (587 บรรทัด) ใช้ทั้งดุ้น เติมเฉพาะ
                 การให้บริการอื่น ๆ + ประวัติย้อนหลังต่อซี่ ที่ panel ไม่มี
     • ขั้น 1  — MedicalHistoryReadOnlyLayout (ประวัติการรักษา / รังสีวิทยา /
                 Lab / audit) จาก TreatmentSteps ของ OPD
     • ขั้น 5–7 — Step5Orders / Step6Appointment / Step7Certificate ของ OPD
                 (import อย่างเดียว ห้ามแก้ signature — ไฟล์กลาง 4,800 บรรทัด
                 ของโมดูลอื่น)

   ทุก textarea ที่บุคลากรพิมพ์เป็น SuggestibleTextarea + voice +
   suggestions + minChars, ทุกค่า visual alias token, padding แบบ longhand. */

const PROCEDURE_PAGE_SIZE = 20;

/* ── ตัวห่อโหมดอ่านอย่างเดียวสำหรับคอมโพเนนต์กลางที่ไม่รับ prop readOnly ──
   Step5Orders / Step6Appointment / Step7Certificate เป็นไฟล์ของโมดูล OPD
   จึงแก้ signature ไม่ได้ (playbook §4) — เมื่อ visit ถูกยกเลิก/ปิดแล้ว
   เราจึงกันการโต้ตอบที่ระดับ container พร้อมแบนเนอร์บอกเหตุผลเสมอ
   (ห้ามปิดเงียบ ๆ — Nielsen: visibility of system status). */
const ReadOnlyFence = ({ active, children }) => {
  if (!active) return children;
  return (
    <div
      aria-disabled='true'
      /* opacity ยังไม่มี token ใน design.md — ใช้ค่าเดียวกับ panelKit.strikeIf
         (0.7) เพื่อให้โหมดอ่านอย่างเดียวทั่วทั้งระบบดูเหมือนกัน */
      style={{ pointerEvents: 'none', opacity: 0.7 }}
    >
      {children}
    </div>
  );
};

const ReadOnlyBanner = ({ show, children }) => (
  show ? <Note tone='warning' icon='visibility'>{children}</Note> : null
);

/* ══════════════════════════════════════════════════════════════════════
   ขั้นที่ 1 — ประวัติและข้อมูลประกอบการวินิจฉัย
   ══════════════════════════════════════════════════════════════════════ */
export const DentalStep1History = ({
  patient, form, setForm, readOnly = false, hn,
}) => {
  const allergyRows = useMemo(() => getDentalAllergyRows(hn), [hn]);
  const healthProfile = useMemo(() => getDentalHealthProfile(hn), [hn]);

  const setField = (key) => (e) => {
    if (readOnly) return;
    const next = e?.target?.value ?? '';
    setForm((f) => ({ ...f, [key]: next }));
  };

  const allergyColumns = [
    { key: 'drug', label: 'ยา / สารที่แพ้', flex: true, minWidth: 160 },
    { key: 'symptom', label: 'อาการที่เกิด', flex: true, minWidth: 200 },
    {
      key: 'naranjo',
      label: 'ระดับความน่าจะเป็น (Naranjo)',
      width: 200,
      render: (r) => (
        <ColorfulBadge style={r.naranjo === 'Probable' ? 'orange' : 'grey'} size='small' hierarchy='secondary'>
          {r.naranjo}
        </ColorfulBadge>
      ),
    },
    {
      key: 'severity',
      label: 'ความรุนแรง',
      width: 120,
      render: (r) => (
        <ColorfulBadge style={r.severity === 'รุนแรง' ? 'red' : 'orange'} size='small' hierarchy='secondary'>
          {r.severity}
        </ColorfulBadge>
      ),
    },
    {
      key: 'recorded',
      label: 'ผู้บันทึก / วัน-เวลา',
      width: 200,
      sortable: false,
      render: (r) => <AuditCell by={r.recordedBy} at={r.recordedAt} />,
    },
    {
      key: 'updated',
      label: 'แก้ไขล่าสุด',
      width: 200,
      sortable: false,
      render: (r) => <AuditCell by={r.updatedBy} at={r.updatedAt} />,
    },
  ];

  return (
    <StepCard>
      {/* ข้อมูลประกอบการวินิจฉัย — ประวัติการรักษาย้อนหลัง + รังสีวิทยา +
          ผล Lab (แท็บในตัว MedicalHistoryReadOnlyLayout) */}
      <div className='flex flex-col w-full min-w-0' style={{ gap: 'var(--dim-space-300)' }}>
        <TopicHeader icon='history'>ข้อมูลประกอบการวินิจฉัย (ประวัติการรักษา · รังสีวิทยา · ผลตรวจ)</TopicHeader>
        <MedicalHistoryReadOnlyLayout patient={patient} hideSectionTitle />
      </div>

      {/* Vital signs + nurse note (ส่งต่อจากจุดคัดกรอง — อ่านอย่างเดียว) */}
      <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
        <TopicHeader icon='monitor_heart'>สัญญาณชีพและบันทึกพยาบาล (Vital Signs / Nurse Note)</TopicHeader>
        <SectionCard>
          <div className='flex items-start flex-wrap w-full' style={{ gap: 'var(--dim-space-500)' }}>
            {DENTAL_SCREENING_VITALS.values.map((v) => (
              <InfoPair key={v.key} label={v.label} value={`${v.value} ${v.unit}`} minWidth={120} />
            ))}
          </div>
          <div
            className='w-full'
            style={{ height: 'var(--dim-stroke-100)', background: 'var(--border-neutral-quaternary, #F4F5F5)' }}
            aria-hidden
          />
          <div className='flex flex-col' style={{ gap: 'var(--dim-space-100)' }}>
            <MutedText>บันทึกพยาบาล</MutedText>
            <BodyText>{DENTAL_SCREENING_VITALS.nurseNote}</BodyText>
            <MutedText>
              {`ผู้บันทึก ${DENTAL_SCREENING_VITALS.recordedBy} · ${DENTAL_SCREENING_VITALS.recordedAt}`}
            </MutedText>
          </div>
        </SectionCard>
      </div>

      {/* ประวัติแพ้ยา */}
      <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
        <TopicHeader icon='warning'>ประวัติการแพ้ยา / สารเคมี</TopicHeader>
        {allergyRows.length === 0 ? (
          <EmptyState
            icon='verified_user'
            title='ไม่พบประวัติการแพ้ยาของผู้รับบริการรายนี้'
            subtitle='หากซักประวัติแล้วพบการแพ้ ให้บันทึกที่ระบบเวชระเบียนก่อนสั่งยาชา/ยาปฏิชีวนะ'
          />
        ) : (
          <Table
            columns={allergyColumns}
            rows={allergyRows}
            rowKey={(r) => r.id}
            emptyMessage='ไม่พบประวัติการแพ้ยา'
          />
        )}
      </div>

      {/* โรคประจำตัว + พฤติกรรมสุขภาพ */}
      <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
        <TopicHeader icon='health_and_safety'>โรคประจำตัวและพฤติกรรมสุขภาพ</TopicHeader>
        <SectionCard>
          <div className='flex flex-col' style={{ gap: 'var(--dim-space-200)' }}>
            <MutedText>โรคประจำตัว</MutedText>
            {healthProfile.chronic.length === 0 ? (
              <BodyText>ไม่มีโรคประจำตัวที่บันทึกไว้</BodyText>
            ) : (
              <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
                {healthProfile.chronic.map((c) => (
                  <ColorfulBadge key={c} style='blue' size='small' hierarchy='secondary'>{c}</ColorfulBadge>
                ))}
              </div>
            )}
          </div>
          <div className='flex flex-col' style={{ gap: 'var(--dim-space-200)' }}>
            <MutedText>พฤติกรรมสุขภาพที่มีผลต่อช่องปาก</MutedText>
            {healthProfile.behaviors.length === 0 ? (
              <BodyText>ไม่มีข้อมูลพฤติกรรมสุขภาพ</BodyText>
            ) : (
              <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
                {healthProfile.behaviors.map((b) => (
                  <ColorfulBadge key={b} style='orange' size='small' hierarchy='secondary'>{b}</ColorfulBadge>
                ))}
              </div>
            )}
          </div>
          {healthProfile.note && <Note tone='info' icon='info'>{healthProfile.note}</Note>}
        </SectionCard>
      </div>

      {/* ประวัติเจ็บป่วยครั้งนี้ — CC + Doctor Note ทันตกรรม */}
      <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
        <TopicHeader icon='edit_note'>ประวัติการเจ็บป่วยครั้งนี้</TopicHeader>
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-150)' }}>
            <FieldLabel required>อาการสำคัญ (Chief Complaint)</FieldLabel>
            <SuggestibleTextarea
              voice
              disabled={readOnly}
              value={form.chiefComplaint}
              onChange={setField('chiefComplaint')}
              suggestions={DENTAL_CC_SUGGESTIONS}
              minChars={2}
              height={120}
              minHeight={96}
              placeholder='เช่น ปวดฟันกรามล่างขวา 3 วัน เคี้ยวแล้วเสียวมาก'
            />
          </div>
          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-150)' }}>
            <FieldLabel>บันทึกแพทย์ทันตกรรม (Dental Doctor Note)</FieldLabel>
            <SuggestibleTextarea
              voice
              disabled={readOnly}
              value={form.dentalDoctorNote}
              onChange={setField('dentalDoctorNote')}
              suggestions={DENTAL_DOCTOR_NOTE_SUGGESTIONS}
              minChars={3}
              height={140}
              minHeight={96}
              placeholder='เช่น พบฟันผุลึกด้าน O และ M ของ #46 ยังไม่ทะลุโพรงประสาทฟัน เคาะไม่เจ็บ'
            />
          </div>
        </div>
      </div>
    </StepCard>
  );
};

/* ══════════════════════════════════════════════════════════════════════
   ขั้นที่ 2 — การตรวจฟัน (ผูก DentalChartPanel + บริการอื่น ๆ + ประวัติต่อซี่)
   ══════════════════════════════════════════════════════════════════════ */
export const DentalStep2Chart = ({ form, setForm, readOnly = false, hn }) => {
  const marksAll = useMemo(() => ({
    ...(form.toothMarks?.permanent || {}),
    ...(form.toothMarks?.primary || {}),
  }), [form.toothMarks]);

  const teethWithHistory = useMemo(() => getDentalTeethWithHistory(hn), [hn]);
  const historyCandidates = useMemo(() => {
    const set = new Set([...Object.keys(marksAll).map(Number), ...teethWithHistory]);
    return [...set].sort((a, b) => a - b);
  }, [marksAll, teethWithHistory]);

  const [historyTooth, setHistoryTooth] = useState(null);
  const activeHistoryTooth = historyTooth ?? historyCandidates[0] ?? null;
  const toothHistory = useMemo(
    () => (activeHistoryTooth ? getDentalToothHistory(hn, activeHistoryTooth) : []),
    [hn, activeHistoryTooth],
  );

  const toggleService = (id) => {
    if (readOnly) return;
    setForm((f) => {
      const current = f.otherServices || [];
      return {
        ...f,
        otherServices: current.includes(id)
          ? current.filter((s) => s !== id)
          : [...current, id],
      };
    });
  };

  return (
    <StepCard>
      <div className='flex flex-col w-full min-w-0' style={{ gap: 'var(--dim-space-300)' }}>
        <TopicHeader icon='dentistry'>บันทึกตำแหน่งฟัน (Dental Chart)</TopicHeader>
        <DentalChartPanel
          dentition={form.dentition}
          onDentitionChange={(key) => !readOnly && setForm((f) => ({ ...f, dentition: key }))}
          toothMarks={form.toothMarks}
          onToothMarksChange={(next) => !readOnly && setForm((f) => ({ ...f, toothMarks: next }))}
          annotationMarkers={form.annotationMarkers}
          annotationDrawings={form.annotationDrawings}
          onAnnotationChange={({ markers, drawings }) => !readOnly && setForm((f) => ({
            ...f, annotationMarkers: markers, annotationDrawings: drawings,
          }))}
          readOnly={readOnly}
        />
      </div>

      {/* การให้บริการอื่น ๆ ตามรายการหัตถการ (TOR 1.10.1.2 ข้อสุดท้าย) —
          หัตถการที่ไม่ผูกกับซี่ฟัน เลือกที่นี่แล้วไหลไปเป็นแถวตั้งต้นใน
          ขั้นที่ 4 ได้ทันที */}
      <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
        <TopicHeader icon='medical_services'>การให้บริการอื่น ๆ ตามรายการหัตถการ</TopicHeader>
        <SectionCard>
          <MutedText>
            บริการที่ไม่ผูกกับซี่ฟันรายซี่ (ทั้งปาก/ต่อครั้ง) — เลือกที่นี่ แล้วบันทึกรายละเอียดค่าใช้จ่ายในขั้นตอนที่ 4
          </MutedText>
          <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
            {DENTAL_OTHER_SERVICES.map((s) => (
              <SelectableTag
                key={s.id}
                label={`${s.name} · ${formatBaht(s.price)}/${s.unit}`}
                size='lg'
                selected={(form.otherServices || []).includes(s.id)}
                onClick={() => toggleService(s.id)}
              />
            ))}
          </div>
          {(form.otherServices || []).length === 0 && (
            <MutedText>ยังไม่ได้เลือกการให้บริการอื่น ๆ — ไม่บังคับ ถ้าผู้รับบริการทำเฉพาะหัตถการรายซี่</MutedText>
          )}
        </SectionCard>
      </div>

      {/* ประวัติย้อนหลังต่อซี่ (TOR 1.10.1.2) */}
      <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
        <TopicHeader icon='manage_search'>ประวัติการให้บริการย้อนหลังของซี่ฟัน</TopicHeader>
        <SectionCard>
          {historyCandidates.length === 0 ? (
            <EmptyState
              icon='dentistry'
              title='ยังไม่มีซี่ฟันให้ดูประวัติ'
              subtitle='คลิกซี่ฟันบนผังด้านบนเพื่อเลือกตำแหน่ง หรือเลือกซี่ที่เคยมีประวัติการรักษา'
            />
          ) : (
            <>
              <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
                {historyCandidates.map((toothId) => (
                  <SelectableTag
                    key={toothId}
                    label={teethWithHistory.includes(toothId) ? `#${toothId} · มีประวัติ` : `#${toothId}`}
                    size='lg'
                    selected={activeHistoryTooth === toothId}
                    onClick={() => setHistoryTooth(toothId)}
                  />
                ))}
              </div>
              {toothHistory.length === 0 ? (
                <EmptyState
                  icon='inbox'
                  title={`ซี่ #${activeHistoryTooth} ยังไม่เคยมีประวัติการให้บริการในระบบ`}
                  subtitle='การบันทึกครั้งนี้จะเป็นรายการแรกของซี่นี้'
                />
              ) : (
                <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200)' }}>
                  {toothHistory.map((h) => (
                    <div
                      key={h.id}
                      className='flex items-start w-full'
                      style={{
                        gap: 'var(--dim-space-300)',
                        paddingTop: 'var(--dim-space-300)',
                        paddingBottom: 'var(--dim-space-300)',
                        paddingLeft: 'var(--dim-space-300)',
                        paddingRight: 'var(--dim-space-300)',
                        borderRadius: 'var(--dim-radius-200, 8px)',
                        background: 'var(--surface-brandPrimary-quaternary, #F4FBF8)',
                      }}
                    >
                      <ColorfulBadge style='teal' size='small' hierarchy='secondary'>{h.date}</ColorfulBadge>
                      <div className='flex flex-col flex-1 min-w-0' style={{ gap: 'var(--dim-space-050)' }}>
                        <BodyText weight='medium'>{h.procedure}</BodyText>
                        <MutedText>
                          {`ด้าน ${h.surfaces.length > 0 ? h.surfaces.join(', ') : '—'} · วัสดุ ${dentalMaterialLabelOf(h.material)} · ${h.dentist}`}
                        </MutedText>
                        {h.note && <MutedText>{h.note}</MutedText>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </SectionCard>
      </div>
    </StepCard>
  );
};

/* ══════════════════════════════════════════════════════════════════════
   ขั้นที่ 3 — วินิจฉัย (ICD-10-TM + SNOMED-CT + Diag Type + แนะนำหัตถการ)
   ══════════════════════════════════════════════════════════════════════ */
const ReDiagnosisPopup = ({ open, rows, onClose, onConfirm }) => {
  const [picked, setPicked] = useState([]);
  const toggle = (id) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  return (
    <Popup
      open={open}
      onClose={onClose}
      title='Re-Diagnosis — ดึงการวินิจฉัยจากการรักษาครั้งก่อน'
      subtitle='เลือกรายการที่ยังเป็นปัญหาอยู่เพื่อคัดลอกมาเป็นการวินิจฉัยของครั้งนี้'
      tertiaryAction={{ label: 'ปิด', onClick: onClose }}
      primaryAction={{
        label: `เพิ่มการวินิจฉัยที่เลือก (${picked.length})`,
        disabled: picked.length === 0,
        onClick: () => {
          onConfirm(rows.filter((r) => picked.includes(r.id)));
          setPicked([]);
          onClose();
        },
      }}
    >
      <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200)' }}>
        {rows.length === 0 ? (
          <EmptyState icon='inbox' title='ไม่พบการวินิจฉัยย้อนหลังของผู้รับบริการรายนี้' />
        ) : rows.map((r) => (
          <div
            key={r.id}
            className='flex items-center w-full'
            style={{
              gap: 'var(--dim-space-300)',
              paddingTop: 'var(--dim-space-200)',
              paddingBottom: 'var(--dim-space-200)',
              paddingLeft: 'var(--dim-space-300)',
              paddingRight: 'var(--dim-space-300)',
              borderRadius: 'var(--dim-radius-200, 8px)',
              background: 'var(--surface-card-200, #FDFDFD)',
            }}
          >
            <Checkbox checked={picked.includes(r.id)} onChange={() => toggle(r.id)} />
            <ColorfulBadge style='indigo' size='small' hierarchy='secondary'>{r.code}</ColorfulBadge>
            <div className='flex flex-col flex-1 min-w-0' style={{ gap: 'var(--dim-space-050)' }}>
              <BodyText>{r.name}</BodyText>
              <MutedText>{`วินิจฉัยเมื่อ ${r.date}`}</MutedText>
            </div>
          </div>
        ))}
      </div>
    </Popup>
  );
};

export const DentalStep3Diagnosis = ({
  form, setForm, readOnly = false, hn, confirmError, onGoToProcedures,
}) => {
  const [query, setQuery] = useState('');
  const [reOpen, setReOpen] = useState(false);
  const [flash, setFlash] = useState('');

  const pastDiagnoses = useMemo(() => getDentalPastDiagnoses(hn), [hn]);
  const chosenCodes = useMemo(
    () => new Set((form.diagnoses || []).map((d) => d.code)),
    [form.diagnoses],
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return DENTAL_DIAGNOSES.filter(
      (d) => d.code.toLowerCase().includes(q) || d.name.toLowerCase().includes(q),
    ).slice(0, 8);
  }, [query]);

  /* ประเภทการวินิจฉัยเริ่มต้น — แถวแรกเป็นโรคหลัก (Principle) ที่เหลือเป็น
     โรคร่วม (Co-morbidity) ตามธรรมเนียมการลงรหัส; แก้ได้ทุกแถวผ่าน
     DiagTypeSelect (ครบ 7 ค่ารวม Complication / External Cause ตาม TOR). */
  const addDiagnosis = (entry) => {
    if (readOnly) return;
    setForm((f) => {
      if ((f.diagnoses || []).some((d) => d.code === entry.code)) return f;
      const hasPrinciple = (f.diagnoses || []).some((d) => d.type === 'principle');
      return {
        ...f,
        diagnoses: [
          ...(f.diagnoses || []),
          {
            id: `dx-${entry.code}-${Date.now()}`,
            code: entry.code,
            name: entry.name,
            snomed: entry.snomed || DENTAL_SNOMED_BY_ICD[entry.code] || '—',
            type: hasPrinciple ? 'comorbidity' : 'principle',
            ...stampDentalAudit(),
          },
        ],
      };
    });
    setQuery('');
  };

  const removeDiagnosis = (id) => {
    if (readOnly) return;
    setForm((f) => ({ ...f, diagnoses: (f.diagnoses || []).filter((d) => d.id !== id) }));
  };

  const setDiagnosisType = (id, type) => {
    if (readOnly) return;
    setForm((f) => ({
      ...f,
      diagnoses: (f.diagnoses || []).map((d) => (
        d.id === id ? { ...d, type, ...stampDentalAudit() } : d
      )),
    }));
  };

  /* แนะนำหัตถการจากรหัสที่วินิจฉัยไว้ — กดแล้วเติมแถวในขั้นที่ 4 ทันที
     (ซี่ฟันเว้นว่างไว้ให้เลือกในขั้นนั้น เพราะที่นี่ยังไม่รู้ตำแหน่ง) */
  const suggestedProcedures = useMemo(
    () => suggestProceduresForDiagnoses(form.diagnoses || []),
    [form.diagnoses],
  );

  const addSuggestedProcedure = (proc) => {
    if (readOnly) return;
    setForm((f) => ({
      ...f,
      procedures: [
        ...(f.procedures || []),
        {
          id: `pr-${proc.id}-${Date.now()}`,
          procedureId: proc.id,
          teeth: [],
          quantity: 1,
          unitPrice: proc.price,
          performer: CURRENT_DENTAL_USER,
          startedAt: formatDentalDateTime(),
          ...stampDentalAudit(),
        },
      ],
    }));
    setFlash(`เพิ่ม "${proc.name}" ไปที่ขั้นตอนที่ 4 แล้ว — ระบุตำแหน่งฟันและจำนวนที่นั่น`);
  };

  const columns = [
    { key: 'code', label: 'ICD-10-TM', width: 120,
      render: (r) => <ColorfulBadge style='indigo' size='small' hierarchy='secondary'>{r.code}</ColorfulBadge> },
    { key: 'name', label: 'ชื่อโรค', flex: true, minWidth: 240 },
    { key: 'snomed', label: 'SNOMED-CT', width: 140,
      render: (r) => <MutedText size='sm'>{r.snomed || '—'}</MutedText> },
    {
      key: 'type', label: 'ประเภทการวินิจฉัย (Diag Type)', width: 240, sortable: false,
      render: (r) => (
        <DiagTypeSelect
          label={null}
          value={r.type}
          disabled={readOnly}
          onChange={(v) => setDiagnosisType(r.id, v)}
          pickedText={resolveDiagnosisType(r.type)?.labelTh}
        />
      ),
    },
    {
      key: 'audit', label: 'ผู้บันทึก / วัน-เวลา', width: 190, sortable: false,
      render: (r) => <AuditCell by={r.recordedBy} at={r.recordedAt} />,
    },
    {
      key: 'actions', label: 'จัดการ', width: 88, sortable: false,
      render: (r) => (readOnly ? <MutedText>—</MutedText> : (
        <BrandIconButton
          variant='ghost'
          size='sm'
          icon='delete'
          aria-label={`ลบการวินิจฉัย ${r.code}`}
          onClick={() => removeDiagnosis(r.id)}
        />
      )),
    },
  ];

  const setNote = (key) => (e) => {
    if (readOnly) return;
    const next = e?.target?.value ?? '';
    setForm((f) => ({ ...f, [key]: next }));
  };

  return (
    <StepCard>
      {confirmError && <Note tone='danger' icon='error'>{confirmError}</Note>}

      <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
        <TopicHeader
          icon='clinical_notes'
          action={pastDiagnoses.length === 0 ? (
            <Tooltip content='ผู้รับบริการรายนี้ยังไม่มีการวินิจฉัยย้อนหลังในระบบ' position='top'>
              <span style={{ display: 'inline-flex', cursor: 'not-allowed' }}>
                <NeutralSubdueButton size='sm' leadingIcon='restart_alt' disabled>
                  Re-Diagnosis
                </NeutralSubdueButton>
              </span>
            </Tooltip>
          ) : (
            <NeutralSubdueButton
              size='sm'
              leadingIcon='restart_alt'
              disabled={readOnly}
              onClick={() => setReOpen(true)}
            >
              {`Re-Diagnosis (${pastDiagnoses.length})`}
            </NeutralSubdueButton>
          )}
        >
          การวินิจฉัยโรค (Post Diagnosis / Complication)
        </TopicHeader>

        <SectionCard>
          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200)' }}>
            <FieldLabel>ค้นหารหัสวินิจฉัย (ICD-10-TM / ชื่อโรค)</FieldLabel>
            <InputField
              value={query}
              onChange={setQuery}
              disabled={readOnly}
              showLeadingIcon
              leadingIcon='search'
              placeholder='พิมพ์ เช่น K02 หรือ ฟันผุ'
            />
            {query.trim() && results.length === 0 && (
              <MutedText size='sm'>ไม่พบรายการที่ตรงกับคำค้น — ลองพิมพ์รหัสสั้นลง เช่น K04</MutedText>
            )}
            {results.length > 0 && (
              <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-100)' }}>
                {results.map((d) => (
                  <button
                    key={d.code}
                    type='button'
                    disabled={readOnly || chosenCodes.has(d.code)}
                    onClick={() => addDiagnosis(d)}
                    className='flex items-center w-full text-left'
                    style={{
                      gap: 'var(--dim-space-300)',
                      paddingTop: 'var(--dim-space-200)',
                      paddingBottom: 'var(--dim-space-200)',
                      paddingLeft: 'var(--dim-space-300)',
                      paddingRight: 'var(--dim-space-300)',
                      borderRadius: 'var(--dim-radius-200, 8px)',
                      border: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary, #F4F5F5)',
                      background: 'var(--surface-card-100, #FFFFFF)',
                      cursor: readOnly || chosenCodes.has(d.code) ? 'not-allowed' : 'pointer',
                      opacity: chosenCodes.has(d.code) ? 0.5 : 1,
                    }}
                  >
                    <ColorfulBadge style='indigo' size='small' hierarchy='secondary'>{d.code}</ColorfulBadge>
                    <span className='flex-1 min-w-0 truncate'><BodyText>{d.name}</BodyText></span>
                    <MutedText>{`SNOMED ${d.snomed}`}</MutedText>
                    <Icon name='plus' size={16} />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200)' }}>
            <MutedText>รหัสที่ใช้บ่อยในคลินิกทันตกรรม</MutedText>
            <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
              {DENTAL_ICD_SUGGESTIONS.map((d) => (
                <SelectableTag
                  key={d.code}
                  label={`${d.code} · ${d.name.split(' (')[0]}`}
                  leadingGlyph='plus'
                  size='lg'
                  selected={chosenCodes.has(d.code)}
                  onClick={() => (chosenCodes.has(d.code) ? null : addDiagnosis(d))}
                />
              ))}
            </div>
          </div>
        </SectionCard>

        {(form.diagnoses || []).length === 0 ? (
          <EmptyState
            icon='clinical_notes'
            title='ยังไม่มีบันทึกรหัสการวินิจฉัย (ICD-10-TM)'
            subtitle='ค้นหารหัสจากช่องด้านบน เลือกจากรหัสที่ใช้บ่อย หรือกด Re-Diagnosis เพื่อดึงจากการรักษาครั้งก่อน'
          />
        ) : (
          <Table
            columns={columns}
            rows={form.diagnoses}
            rowKey={(r) => r.id}
            emptyMessage='ยังไม่มีรหัสการวินิจฉัย'
          />
        )}
      </div>

      {/* แนะนำหัตถการ — โผล่เฉพาะเมื่อมีวินิจฉัยแล้ว (spec edge case) */}
      {suggestedProcedures.length > 0 && (
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
          <TopicHeader icon='lightbulb'>แนะนำหัตถการจากการวินิจฉัยที่บันทึกไว้</TopicHeader>
          <SectionCard tone='brand'>
            <MutedText>กดเพื่อเพิ่มเป็นแถวหัตถการในขั้นตอนที่ 4 (ระบุตำแหน่งฟัน/จำนวนได้ที่ขั้นนั้น)</MutedText>
            <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
              {suggestedProcedures.map((p) => (
                <SelectableTag
                  key={p.id}
                  label={`${p.name} · ${formatBaht(p.price)}/${p.unit}`}
                  leadingGlyph='plus'
                  size='lg'
                  selected={false}
                  onClick={() => addSuggestedProcedure(p)}
                />
              ))}
            </div>
            {flash && (
              <Note
                tone='info'
                icon='check-circle'
                action={onGoToProcedures ? (
                  <BrandSubdueButton variant='outline' size='sm' trailingIcon='arrow_forward' onClick={onGoToProcedures}>
                    ไปขั้นตอนที่ 4
                  </BrandSubdueButton>
                ) : null}
              >
                {flash}
              </Note>
            )}
          </SectionCard>
        </div>
      )}

      {/* บันทึกการวินิจฉัย + Treatment and Progress (คู่มือเดิม) */}
      <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
        <TopicHeader icon='file-text'>บันทึกการวินิจฉัยและแผนการรักษา</TopicHeader>
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-150)' }}>
          <FieldLabel>รายละเอียดการวินิจฉัย (Diagnosis Note)</FieldLabel>
          <SuggestibleTextarea
            voice
            disabled={readOnly}
            value={form.diagnosisNote}
            onChange={setNote('diagnosisNote')}
            suggestions={DENTAL_DIAGNOSIS_NOTE_SUGGESTIONS}
            minChars={3}
            height={130}
            minHeight={96}
            placeholder='เช่น ฟันผุลุกลามถึงเนื้อฟัน ซี่ 46 ด้าน O/M'
          />
        </div>
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-150)' }}>
          <FieldLabel>การรักษาและความก้าวหน้า (Treatment and Progress)</FieldLabel>
          <SuggestibleTextarea
            voice
            disabled={readOnly}
            value={form.treatmentNote}
            onChange={setNote('treatmentNote')}
            suggestions={DENTAL_TREATMENT_NOTE_SUGGESTIONS}
            minChars={3}
            height={130}
            minHeight={96}
            placeholder='เช่น อุดฟันด้วยคอมโพสิต ฉีดยาชา 1 หลอด ไม่มีภาวะแทรกซ้อน'
          />
        </div>
      </div>

      <ReDiagnosisPopup
        open={reOpen}
        rows={pastDiagnoses}
        onClose={() => setReOpen(false)}
        onConfirm={(picked) => picked.forEach((p) => addDiagnosis({
          code: p.code, name: p.name, snomed: DENTAL_SNOMED_BY_ICD[p.code],
        }))}
      />
    </StepCard>
  );
};

/* ══════════════════════════════════════════════════════════════════════
   ขั้นที่ 4 — หัตถการและวัสดุสิ้นเปลือง
   ══════════════════════════════════════════════════════════════════════ */
const emptyProcedureDraft = () => ({
  id: null,
  procedureId: '',
  teeth: [],
  quantity: '1',
  unitPrice: '',
  performer: CURRENT_DENTAL_USER,
});

const ProcedureEditorPopup = ({
  open, draft, setDraft, markedTeeth, rightKey, onClose, onSave,
}) => {
  const procedure = findDentalProcedure(draft.procedureId);
  const [error, setError] = useState('');
  const wasOpenRef = useRef(false);

  /* ล้าง error เฉพาะตอน popup เปิดใหม่ (open ↑ transition) — pattern เดียวกับ
     SurfacePickerPopup เพื่อไม่ให้ re-render ของ parent ลบข้อความที่เพิ่งขึ้น */
  useEffect(() => {
    if (open && !wasOpenRef.current) setError('');
    wasOpenRef.current = open;
  }, [open]);

  const quantityNum = Number(draft.quantity);
  const priceNum = Number(draft.unitPrice);
  const needsTeeth = !!procedure?.toothSpecific;

  const validate = () => {
    if (!procedure) return 'เลือกรายการหัตถการก่อนบันทึก';
    if (needsTeeth && markedTeeth.length === 0) {
      return 'หัตถการนี้ต้องระบุตำแหน่งฟัน — กลับไปเลือกซี่ฟันในขั้นตอนที่ 2 ก่อน';
    }
    if (needsTeeth && draft.teeth.length === 0) return 'เลือกตำแหน่งฟันอย่างน้อย 1 ซี่';
    if (!Number.isFinite(quantityNum) || quantityNum <= 0) return 'จำนวนต้องเป็นตัวเลขมากกว่า 0';
    if (!Number.isFinite(priceNum) || priceNum < 0) return 'ราคา/หน่วยต้องเป็นตัวเลข';
    return '';
  };

  const handleSave = () => {
    const message = validate();
    if (message) { setError(message); return; }
    setError('');
    onSave({
      ...draft,
      teeth: draft.teeth.map(Number),
      quantity: quantityNum,
      unitPrice: priceNum,
    });
    onClose();
  };

  const reimbursable = isProcedureReimbursable(procedure, rightKey);

  return (
    <Popup
      open={open}
      onClose={onClose}
      title={draft.id ? 'แก้ไขรายการหัตถการ' : 'เพิ่มรายการหัตถการ'}
      subtitle='บันทึกตามใบบันทึกการทำหัตถการ — รหัส ICD-9-CM / ICD-10-TM · ตำแหน่งฟัน · จำนวน · ราคา/หน่วย'
      tertiaryAction={{ label: 'ยกเลิก', onClick: onClose }}
      primaryAction={{ label: draft.id ? 'บันทึกการแก้ไข' : 'เพิ่มหัตถการ', onClick: handleSave }}
    >
      <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
        <Select
          label='รายการหัตถการ'
          required
          value={draft.procedureId}
          placeholder='เลือกหัตถการทันตกรรม'
          options={DENTAL_PROCEDURES.map((p) => ({
            value: p.id,
            label: `${p.name} · ICD-9 ${p.icd9} / ICD-10-TM ${p.icd10tm}`,
          }))}
          onChange={(v) => {
            const next = findDentalProcedure(v);
            setDraft((d) => ({
              ...d,
              procedureId: v,
              unitPrice: next ? String(next.price) : d.unitPrice,
              teeth: next?.toothSpecific ? d.teeth : [],
            }));
            setError('');
          }}
        />

        {needsTeeth && (
          markedTeeth.length === 0 ? (
            <Note tone='warning' icon='warning'>
              หัตถการนี้ผูกกับซี่ฟัน แต่ยังไม่ได้เลือกตำแหน่งฟันเลย — กลับไปขั้นตอนที่ 2 (การตรวจฟัน)
              แล้วคลิกซี่ฟันบนผังก่อน
            </Note>
          ) : (
            <Select
              label='ตำแหน่งฟัน (เลือกได้เฉพาะซี่ที่บันทึกไว้ในขั้นตอนที่ 2)'
              required
              multiple
              value={draft.teeth.map(String)}
              placeholder='เลือกซี่ฟัน'
              options={markedTeeth.map((t) => ({ value: String(t), label: `#${t}` }))}
              onChange={(v) => { setDraft((d) => ({ ...d, teeth: v })); setError(''); }}
            />
          )
        )}

        <div className='flex items-start w-full flex-wrap' style={{ gap: 'var(--dim-space-300)' }}>
          <div className='flex flex-col flex-1 min-w-0' style={{ gap: 'var(--dim-space-150)' }}>
            <FieldLabel required>จำนวน</FieldLabel>
            <InputField
              value={draft.quantity}
              onChange={(v) => { setDraft((d) => ({ ...d, quantity: v })); setError(''); }}
              placeholder='1'
            />
            <MutedText>{`หน่วย: ${procedure?.unit || '—'}`}</MutedText>
          </div>
          <div className='flex flex-col flex-1 min-w-0' style={{ gap: 'var(--dim-space-150)' }}>
            <FieldLabel required>ราคา/หน่วย (บาท)</FieldLabel>
            <InputField
              value={draft.unitPrice}
              onChange={(v) => { setDraft((d) => ({ ...d, unitPrice: v })); setError(''); }}
              placeholder='400'
            />
          </div>
        </div>

        <Select
          label='ผู้ทำหัตถการ'
          value={draft.performer}
          placeholder='เลือกทันตแพทย์'
          options={DENTAL_DOCTORS.map((d) => ({ value: d, label: d }))}
          onChange={(v) => setDraft((d) => ({ ...d, performer: v }))}
        />

        {procedure && (
          <SectionCard tone='brand'>
            <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-400)' }}>
              <InfoPair label='รหัส ICD-9-CM' value={procedure.icd9} minWidth={120} />
              <InfoPair label='รหัส ICD-10-TM' value={procedure.icd10tm} minWidth={140} />
              <InfoPair
                label='จำนวนเงินรวม'
                value={Number.isFinite(quantityNum) && Number.isFinite(priceNum)
                  ? formatBaht(quantityNum * priceNum)
                  : '—'}
                minWidth={140}
              />
              <div className='flex flex-col' style={{ gap: 'var(--dim-space-050)' }}>
                <MutedText>สิทธิการเบิก</MutedText>
                <ReimbursableBadge reimbursable={reimbursable} />
              </div>
            </div>
          </SectionCard>
        )}

        {error && <Note tone='danger' icon='error'>{error}</Note>}
      </div>
    </Popup>
  );
};

export const DentalStep4Procedures = ({ form, setForm, readOnly = false, insurance }) => {
  const rightKey = useMemo(() => resolveDentalRightKey(insurance), [insurance]);
  const [editorOpen, setEditorOpen] = useState(false);
  const [draft, setDraft] = useState(emptyProcedureDraft);
  const [page, setPage] = useState(1);
  const [consumableId, setConsumableId] = useState('');
  const [consumableQty, setConsumableQty] = useState('1');
  const [consumableError, setConsumableError] = useState('');

  const markedTeeth = useMemo(() => {
    const permanent = Object.keys(form.toothMarks?.permanent || {}).map(Number);
    const primary = Object.keys(form.toothMarks?.primary || {}).map(Number);
    return [...permanent, ...primary].sort((a, b) => a - b);
  }, [form.toothMarks]);

  const rows = form.procedures || [];

  /* แถวที่อ้างซี่ซึ่งถูกลบ mark ทีหลัง — DentalChartPanel.removeMark
     สัญญาไว้ว่าที่นี่จะ cascade เตือน (คอมเมนต์บรรทัด 396-398) */
  const orphanRows = useMemo(
    () => rows
      .map((r) => ({ row: r, missing: (r.teeth || []).filter((t) => !markedTeeth.includes(Number(t))) }))
      .filter((x) => x.missing.length > 0),
    [rows, markedTeeth],
  );
  const orphanIds = useMemo(() => new Set(orphanRows.map((x) => x.row.id)), [orphanRows]);

  const totals = useMemo(() => {
    let covered = 0;
    let selfPay = 0;
    rows.forEach((r) => {
      const proc = findDentalProcedure(r.procedureId);
      const amount = (Number(r.quantity) || 0) * (Number(r.unitPrice) || 0);
      if (isProcedureReimbursable(proc, rightKey)) covered += amount;
      else selfPay += amount;
    });
    return { covered, selfPay, all: covered + selfPay };
  }, [rows, rightKey]);

  const totalPages = Math.max(1, Math.ceil(rows.length / PROCEDURE_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = rows.slice((safePage - 1) * PROCEDURE_PAGE_SIZE, safePage * PROCEDURE_PAGE_SIZE);

  const openAdd = () => {
    setDraft(emptyProcedureDraft());
    setEditorOpen(true);
  };
  const openEdit = (row) => {
    setDraft({
      id: row.id,
      procedureId: row.procedureId,
      teeth: (row.teeth || []).map(String),
      quantity: String(row.quantity ?? '1'),
      unitPrice: String(row.unitPrice ?? ''),
      performer: row.performer || CURRENT_DENTAL_USER,
    });
    setEditorOpen(true);
  };
  const saveDraft = (next) => {
    setForm((f) => {
      const list = f.procedures || [];
      if (next.id) {
        return {
          ...f,
          procedures: list.map((r) => (r.id === next.id
            ? { ...r, ...next, ...stampDentalAudit() }
            : r)),
        };
      }
      return {
        ...f,
        procedures: [
          ...list,
          {
            ...next,
            id: `pr-${Date.now()}`,
            startedAt: formatDentalDateTime(),
            ...stampDentalAudit(),
          },
        ],
      };
    });
  };
  const removeRow = (id) => setForm((f) => ({
    ...f, procedures: (f.procedures || []).filter((r) => r.id !== id),
  }));

  const procedureColumns = [
    {
      key: 'seq', label: 'ลำดับ', width: 72, sortable: false,
      render: (r) => <BodyText>{rows.findIndex((x) => x.id === r.id) + 1}</BodyText>,
    },
    { key: 'startedAt', label: 'วัน-เวลาเริ่ม', width: 170,
      render: (r) => <MutedText size='sm'>{r.startedAt || '—'}</MutedText> },
    {
      key: 'teeth', label: 'ตำแหน่งฟัน', width: 150, sortable: false,
      render: (r) => {
        const proc = findDentalProcedure(r.procedureId);
        const needsTooth = proc?.toothSpecific && (r.teeth || []).length === 0;
        const warnStyle = {
          gap: 'var(--dim-space-100)',
          color: 'var(--text-warning-default, #C2410C)',
          fontSize: 'var(--type-size-xs)',
          fontFamily: 'var(--type-family-body)',
        };
        return (
          <div className='flex flex-col' style={{ gap: 'var(--dim-space-050)' }}>
            <BodyText>{toothListLabel(r.teeth)}</BodyText>
            {orphanIds.has(r.id) && (
              <span className='inline-flex items-center' style={warnStyle}>
                <Icon name='warning' size={12} />
                ซี่ที่อ้างถูกลบจากผังฟันแล้ว
              </span>
            )}
            {needsTooth && (
              <span className='inline-flex items-center' style={warnStyle}>
                <Icon name='warning' size={12} />
                ยังไม่ระบุตำแหน่งฟัน — กดแก้ไขเพื่อเลือกซี่
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'procedure', label: 'หัตถการ (ICD-9-CM / ICD-10-TM)', flex: true, minWidth: 260, sortable: false,
      render: (r) => {
        const proc = findDentalProcedure(r.procedureId);
        return (
          <div className='flex flex-col' style={{ gap: 'var(--dim-space-050)' }}>
            <BodyText weight='medium'>{proc?.name || '—'}</BodyText>
            <MutedText>{proc ? `ICD-9 ${proc.icd9} · ICD-10-TM ${proc.icd10tm}` : '—'}</MutedText>
          </div>
        );
      },
    },
    { key: 'quantity', label: 'จำนวน', width: 88, render: (r) => <BodyText>{r.quantity}</BodyText> },
    {
      key: 'unit', label: 'หน่วย', width: 88, sortable: false,
      render: (r) => <BodyText>{findDentalProcedure(r.procedureId)?.unit || '—'}</BodyText>,
    },
    { key: 'unitPrice', label: 'ราคา/หน่วย', width: 120,
      render: (r) => <BodyText>{formatBaht(r.unitPrice)}</BodyText> },
    {
      key: 'amount', label: 'จำนวนเงิน', width: 130, sortable: false,
      render: (r) => <BodyText weight='medium'>{formatBaht((Number(r.quantity) || 0) * (Number(r.unitPrice) || 0))}</BodyText>,
    },
    {
      key: 'coverage', label: 'สิทธิการเบิก', width: 170, sortable: false,
      render: (r) => (
        <ReimbursableBadge reimbursable={isProcedureReimbursable(findDentalProcedure(r.procedureId), rightKey)} />
      ),
    },
    { key: 'performer', label: 'ผู้ทำหัตถการ', width: 170 },
    {
      key: 'audit', label: 'ผู้บันทึก / วัน-เวลา', width: 190, sortable: false,
      render: (r) => <AuditCell by={r.recordedBy} at={r.recordedAt} />,
    },
    {
      key: 'actions', label: 'จัดการ', width: 104, sortable: false,
      render: (r) => (readOnly ? <MutedText>—</MutedText> : (
        <div className='flex items-center' style={{ gap: 'var(--dim-space-100)' }}>
          <BrandIconButton variant='quaternary' size='sm' icon='edit' aria-label='แก้ไขหัตถการ' onClick={() => openEdit(r)} />
          <BrandIconButton variant='ghost' size='sm' icon='delete' aria-label='ลบหัตถการ' onClick={() => removeRow(r.id)} />
        </div>
      )),
    },
  ];

  /* ── วัสดุสิ้นเปลือง ── */
  const addConsumable = () => {
    if (readOnly) return;
    if (!consumableId) { setConsumableError('เลือกรายการวัสดุก่อนเพิ่ม'); return; }
    const qty = Number(consumableQty);
    if (!Number.isFinite(qty) || qty <= 0) { setConsumableError('จำนวนต้องเป็นตัวเลขมากกว่า 0'); return; }
    setConsumableError('');
    setForm((f) => ({
      ...f,
      consumables: [
        ...(f.consumables || []),
        { id: `cs-${Date.now()}`, consumableId, quantity: qty, ...stampDentalAudit() },
      ],
    }));
    setConsumableId('');
    setConsumableQty('1');
  };
  const removeConsumable = (id) => setForm((f) => ({
    ...f, consumables: (f.consumables || []).filter((c) => c.id !== id),
  }));

  const consumableColumns = [
    {
      key: 'name', label: 'ชื่อวัสดุ', flex: true, minWidth: 220, sortable: false,
      render: (r) => <BodyText>{findDentalConsumable(r.consumableId)?.name || '—'}</BodyText>,
    },
    {
      key: 'unit', label: 'หน่วย', width: 110, sortable: false,
      render: (r) => <BodyText>{findDentalConsumable(r.consumableId)?.unit || '—'}</BodyText>,
    },
    {
      key: 'lot', label: 'Lot', width: 140, sortable: false,
      render: (r) => <MutedText size='sm'>{findDentalConsumable(r.consumableId)?.lot || '—'}</MutedText>,
    },
    { key: 'quantity', label: 'จำนวนที่ใช้', width: 110, render: (r) => <BodyText>{r.quantity}</BodyText> },
    {
      key: 'audit', label: 'ผู้บันทึก / วัน-เวลา', width: 190, sortable: false,
      render: (r) => <AuditCell by={r.recordedBy} at={r.recordedAt} />,
    },
    {
      key: 'actions', label: 'จัดการ', width: 88, sortable: false,
      render: (r) => (readOnly ? <MutedText>—</MutedText> : (
        <BrandIconButton variant='ghost' size='sm' icon='delete' aria-label='ลบวัสดุ' onClick={() => removeConsumable(r.id)} />
      )),
    },
  ];

  return (
    <StepCard>
      {markedTeeth.length === 0 && (
        <Note tone='warning' icon='warning'>
          ยังไม่ได้บันทึกตำแหน่งฟันในขั้นตอนที่ 2 — หัตถการที่ผูกกับซี่ฟัน (อุด/ถอน/ผ่า/เคลือบหลุมร่องฟัน)
          จะยังเพิ่มไม่ได้จนกว่าจะเลือกซี่ฟันบนผัง
        </Note>
      )}
      {orphanRows.length > 0 && (
        <Note tone='warning' icon='warning'>
          {`มี ${orphanRows.length} รายการหัตถการอ้างถึงซี่ฟันที่ถูกลบจากผังแล้ว: `}
          {orphanRows.map((x) => x.missing.map((t) => `#${t}`).join(', ')).join(' · ')}
          {' — แก้ไขแถวเหล่านั้นหรือกลับไปเลือกซี่ฟันใหม่ในขั้นตอนที่ 2'}
        </Note>
      )}

      <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
        <TopicHeader
          icon='medical_services'
          action={!readOnly && (
            <BrandSubdueButton variant='fill' size='sm' leadingIcon='add' onClick={openAdd}>
              เพิ่มหัตถการ
            </BrandSubdueButton>
          )}
        >
          บันทึกการทำหัตถการ
        </TopicHeader>

        {rows.length === 0 ? (
          <EmptyState
            icon='medical_services'
            title='ยังไม่มีรายการหัตถการในการตรวจครั้งนี้'
            subtitle='กด "เพิ่มหัตถการ" หรือกลับไปกดรายการที่ระบบแนะนำในขั้นตอนที่ 3'
          />
        ) : (
          <>
            <Table
              columns={procedureColumns}
              rows={pageRows}
              rowKey={(r) => r.id}
              emptyMessage='ยังไม่มีรายการหัตถการ'
            />
            {rows.length > PROCEDURE_PAGE_SIZE && (
              <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-200)' }}>
                <MutedText size='sm'>
                  {`แสดง ${(safePage - 1) * PROCEDURE_PAGE_SIZE + 1}–${Math.min(safePage * PROCEDURE_PAGE_SIZE, rows.length)} จาก ${rows.length} รายการ`}
                </MutedText>
                <div className='flex-1' />
                <Pagination currentPage={safePage} pageCount={totalPages} onPageChange={setPage} />
              </div>
            )}
            <SectionCard tone='brand'>
              <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-600)' }}>
                <InfoPair label='รวมส่วนที่เบิกได้' value={formatBaht(totals.covered)} minWidth={160} />
                <InfoPair label='รวมส่วนที่ชำระเอง' value={formatBaht(totals.selfPay)} minWidth={160} />
                <InfoPair label='รวมค่าใช้จ่ายทั้งสิ้น' value={formatBaht(totals.all)} minWidth={180} />
                <InfoPair label='สิทธิของผู้รับบริการ' value={insurance || '—'} minWidth={240} />
              </div>
              {rightKey === 'self' && (
                <MutedText>
                  ผู้รับบริการชำระเงินเอง — ทุกรายการขึ้นเป็น &quot;เบิกไม่ได้&quot; แต่ยังบันทึกได้ตามปกติ
                </MutedText>
              )}
            </SectionCard>
          </>
        )}
      </div>

      {/* วัสดุสิ้นเปลือง */}
      <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
        <TopicHeader icon='inventory_2'>บันทึกการใช้วัสดุสิ้นเปลือง</TopicHeader>
        {!readOnly && (
          <SectionCard>
            <div className='flex items-end flex-wrap w-full' style={{ gap: 'var(--dim-space-300)' }}>
              <div className='flex flex-col flex-1 min-w-0' style={{ gap: 'var(--dim-space-150)' }}>
                <Select
                  label='รายการวัสดุ'
                  value={consumableId}
                  placeholder='เลือกวัสดุที่ใช้'
                  options={DENTAL_CONSUMABLES.map((c) => ({ value: c.id, label: `${c.name} (Lot ${c.lot})` }))}
                  onChange={(v) => { setConsumableId(v); setConsumableError(''); }}
                />
              </div>
              <div className='flex flex-col' style={{ gap: 'var(--dim-space-150)', width: 160 }}>
                <FieldLabel required>จำนวน</FieldLabel>
                <InputField
                  value={consumableQty}
                  onChange={(v) => { setConsumableQty(v); setConsumableError(''); }}
                  placeholder='1'
                />
              </div>
              <BrandSubdueButton variant='fill' leadingIcon='add' onClick={addConsumable}>
                เพิ่มวัสดุ
              </BrandSubdueButton>
            </div>
            {consumableError && <Note tone='danger' icon='error'>{consumableError}</Note>}
          </SectionCard>
        )}
        {(form.consumables || []).length === 0 ? (
          <EmptyState
            icon='inventory_2'
            title='ยังไม่มีการบันทึกวัสดุสิ้นเปลือง'
            subtitle='บันทึกยาชา เข็ม วัสดุอุด และวัสดุอื่นที่ใช้จริงเพื่อให้คลังตัดยอดได้ถูกต้อง'
          />
        ) : (
          <Table
            columns={consumableColumns}
            rows={form.consumables}
            rowKey={(r) => r.id}
            emptyMessage='ยังไม่มีวัสดุสิ้นเปลือง'
          />
        )}
      </div>

      <ProcedureEditorPopup
        open={editorOpen}
        draft={draft}
        setDraft={setDraft}
        markedTeeth={markedTeeth}
        rightKey={rightKey}
        onClose={() => setEditorOpen(false)}
        onSave={saveDraft}
      />
    </StepCard>
  );
};

/* ══════════════════════════════════════════════════════════════════════
   ขั้นที่ 5 — คำสั่งทางการแพทย์ (CPOE) + e-Document / ส่งต่อ
   ══════════════════════════════════════════════════════════════════════ */
export const DentalStep5Orders = ({
  form, setForm, patient, cardPatient, readOnly = false, onStepChange, stepIndexes,
}) => (
  <StepCard>
    <ReadOnlyBanner show={readOnly}>
      บันทึกนี้อยู่ในโหมดอ่านอย่างเดียว — ดูคำสั่งทางการแพทย์ได้แต่แก้ไขไม่ได้
    </ReadOnlyBanner>
    <ReadOnlyFence active={readOnly}>
      <Step5Orders
        form={form}
        setForm={setForm}
        patient={patient}
        cardPatient={cardPatient}
        onStepChange={onStepChange}
        stepIndexes={stepIndexes}
      />
    </ReadOnlyFence>

    <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
      <TopicHeader icon='description'>เอกสารอิเล็กทรอนิกส์ (e-Document) และการส่งต่อ</TopicHeader>
      <ReadOnlyFence active={readOnly}>
        <DocumentCenterPanel form={form} setForm={setForm} patient={patient} />
      </ReadOnlyFence>
    </div>
  </StepCard>
);

/* ══════════════════════════════════════════════════════════════════════
   ขั้นที่ 6 — นัดหมาย
   ══════════════════════════════════════════════════════════════════════ */
export const DentalStep6Appointment = ({
  form, setForm, patient, cardPatient, readOnly = false,
}) => (
  <StepCard>
    <ReadOnlyBanner show={readOnly}>
      บันทึกนี้อยู่ในโหมดอ่านอย่างเดียว — ดูรายละเอียดนัดหมายได้แต่แก้ไขไม่ได้
    </ReadOnlyBanner>
    <Note tone='info' icon='event_available'>
      นัดหมายทันตกรรมต่อเนื่อง (อุดต่อ / ตัดไหม / ขูดหินน้ำลายรอบถัดไป) จะไปปรากฏในแท็บ
      “นัดแล้วยังไม่มาติดต่อ” ของคิวทันตกรรม พร้อมปุ่มส่งตรวจในวันนัด
    </Note>
    <ReadOnlyFence active={readOnly}>
      <Step6Appointment form={form} setForm={setForm} patient={patient} cardPatient={cardPatient} />
    </ReadOnlyFence>
  </StepCard>
);

/* ══════════════════════════════════════════════════════════════════════
   ขั้นที่ 7 — ใบรับรองแพทย์ + สรุป/ยืนยันการบันทึก
   ══════════════════════════════════════════════════════════════════════ */
export const DentalStep7Certificate = ({
  form, setForm, patient, readOnly = false, onStepChange, stepIndexes,
  saveState, confirmError, onSaveDraft, onConfirm, insurance,
}) => {
  const rightKey = useMemo(() => resolveDentalRightKey(insurance), [insurance]);
  const marksCount = Object.keys(form.toothMarks?.permanent || {}).length
    + Object.keys(form.toothMarks?.primary || {}).length;
  const total = (form.procedures || []).reduce(
    (sum, r) => sum + (Number(r.quantity) || 0) * (Number(r.unitPrice) || 0), 0,
  );
  const covered = (form.procedures || []).reduce((sum, r) => (
    isProcedureReimbursable(findDentalProcedure(r.procedureId), rightKey)
      ? sum + (Number(r.quantity) || 0) * (Number(r.unitPrice) || 0)
      : sum
  ), 0);

  return (
    <StepCard>
      <ReadOnlyBanner show={readOnly}>
        บันทึกนี้อยู่ในโหมดอ่านอย่างเดียว — ออก/พิมพ์ใบรับรองแพทย์ใหม่ไม่ได้จนกว่าจะกด “แก้ไข” ที่หัวบันทึก
      </ReadOnlyBanner>

      <ReadOnlyFence active={readOnly}>
        <Step7Certificate
          form={form}
          setForm={setForm}
          patient={patient}
          onStepChange={onStepChange}
          stepIndexes={stepIndexes}
        />
      </ReadOnlyFence>

      {/* สรุปการบันทึก + audit trail (playbook §5) */}
      <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
        <TopicHeader icon='fact_check'>สรุปการบันทึกทันตกรรมครั้งนี้</TopicHeader>
        <SectionCard tone='brand'>
          <div className='flex items-start flex-wrap w-full' style={{ gap: 'var(--dim-space-600)' }}>
            <InfoPair label='ตำแหน่งฟันที่บันทึก' value={`${marksCount} ซี่`} minWidth={140} />
            <InfoPair label='การวินิจฉัย' value={`${(form.diagnoses || []).length} รายการ`} minWidth={140} />
            <InfoPair label='หัตถการ' value={`${(form.procedures || []).length} รายการ`} minWidth={140} />
            <InfoPair label='วัสดุสิ้นเปลือง' value={`${(form.consumables || []).length} รายการ`} minWidth={140} />
            <InfoPair label='ค่าใช้จ่ายรวม' value={formatBaht(total)} minWidth={160} />
            <InfoPair label='ส่วนที่เบิกได้' value={formatBaht(covered)} minWidth={160} />
          </div>
          <div className='flex items-start flex-wrap w-full' style={{ gap: 'var(--dim-space-600)' }}>
            <InfoPair label='ผู้บันทึก' value={CURRENT_DENTAL_USER} minWidth={200} />
            <InfoPair label='บันทึกร่างล่าสุด' value={saveState?.draftAt || 'ยังไม่ได้บันทึกร่าง'} minWidth={220} />
            <InfoPair label='ยืนยันบันทึกเมื่อ' value={saveState?.confirmedAt || 'ยังไม่ได้ยืนยัน'} minWidth={220} />
          </div>
        </SectionCard>

        {confirmError && <Note tone='danger' icon='error'>{confirmError}</Note>}

        {!readOnly && (
          <div className='flex items-center flex-wrap w-full' style={{ gap: 'var(--dim-space-200)' }}>
            <BrandSubdueButton variant='outline' leadingIcon='save' onClick={onSaveDraft}>
              บันทึกร่าง
            </BrandSubdueButton>
            <BrandSubdueButton variant='fill' leadingIcon='check' onClick={onConfirm}>
              ยืนยันบันทึกการรักษา
            </BrandSubdueButton>
            <NeutralSubdueButton leadingIcon='print' onClick={() => window.print()}>
              พิมพ์ใบสรุปการรักษาทันตกรรม
            </NeutralSubdueButton>
          </div>
        )}
      </div>
    </StepCard>
  );
};

/* ── Validation ที่หน้า shell เรียกก่อนยืนยันบันทึก ────────────────────── */
export const validateDentalRecord = (form) => {
  if ((form.diagnoses || []).length === 0) {
    return {
      message: 'ยืนยันบันทึกไม่ได้ — ต้องระบุการวินิจฉัย (ICD-10-TM) อย่างน้อย 1 รายการในขั้นตอนที่ 3',
      stepIndex: 2,
    };
  }
  if (!(form.chiefComplaint || '').trim()) {
    return {
      message: 'ยืนยันบันทึกไม่ได้ — ต้องระบุอาการสำคัญ (Chief Complaint) ในขั้นตอนที่ 1',
      stepIndex: 0,
    };
  }
  const markedTeeth = [
    ...Object.keys(form.toothMarks?.permanent || {}).map(Number),
    ...Object.keys(form.toothMarks?.primary || {}).map(Number),
  ];
  const orphan = (form.procedures || []).find(
    (r) => (r.teeth || []).some((t) => !markedTeeth.includes(Number(t))),
  );
  if (orphan) {
    const proc = findDentalProcedure(orphan.procedureId);
    return {
      message: `ยืนยันบันทึกไม่ได้ — หัตถการ "${proc?.name || 'ไม่ทราบชื่อ'}" อ้างถึงซี่ฟันที่ถูกลบจากผังแล้ว แก้ไขในขั้นตอนที่ 4 ก่อน`,
      stepIndex: 3,
    };
  }
  const badQty = (form.procedures || []).find((r) => !(Number(r.quantity) > 0));
  if (badQty) {
    return {
      message: 'ยืนยันบันทึกไม่ได้ — มีรายการหัตถการที่จำนวนไม่ถูกต้อง (ต้องมากกว่า 0)',
      stepIndex: 3,
    };
  }
  /* หัตถการที่ผูกกับซี่ฟันต้องอ้างซี่จริงเสมอ — แถวที่มาจากปุ่ม
     "แนะนำหัตถการ" ในขั้นที่ 3 ถูกเพิ่มโดยยังไม่ระบุตำแหน่งฟัน */
  const missingTooth = (form.procedures || []).find((r) => {
    const proc = findDentalProcedure(r.procedureId);
    return proc?.toothSpecific && (r.teeth || []).length === 0;
  });
  if (missingTooth) {
    const proc = findDentalProcedure(missingTooth.procedureId);
    return {
      message: `ยืนยันบันทึกไม่ได้ — หัตถการ "${proc?.name || 'ไม่ทราบชื่อ'}" ยังไม่ได้ระบุตำแหน่งฟัน แก้ไขแถวนี้ในขั้นตอนที่ 4 ก่อน`,
      stepIndex: 3,
    };
  }
  return null;
};

/* payload ที่ saveDentalVisitRecord เก็บ (stamp savedBy/savedAt ให้เอง) */
export const buildDentalSavePayload = (form) => ({
  chiefComplaint: form.chiefComplaint,
  dentalDoctorNote: form.dentalDoctorNote,
  treatmentNote: form.treatmentNote,
  diagnosisNote: form.diagnosisNote,
  dentition: form.dentition,
  toothMarks: form.toothMarks,
  otherServices: form.otherServices,
  annotationMarkers: form.annotationMarkers,
  annotationDrawings: form.annotationDrawings,
  diagnoses: form.diagnoses,
  procedures: form.procedures,
  consumables: form.consumables,
  appointment: form.appointment,
  certIssue: form.certIssue,
});

export const summariseDentalSurfaces = (mark) =>
  (mark?.surfaces || []).map((s) => surfaceLabelOf(s)).join(' · ');
