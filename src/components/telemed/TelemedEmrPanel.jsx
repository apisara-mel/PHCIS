import React, { useEffect, useMemo, useState } from 'react';
import Icon from '@/components/icons/Icon';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import InputField from '@/components/forms/InputField';
import Select from '@/components/forms/Select';
import AddressMapBlock from '@/components/forms/AddressMapBlock';
import TelemedRpmSparkline from '@/components/telemed/TelemedRpmSparkline';
import {
  getRpmPatientByHn,
  getRpmReadings,
  evaluateRpmPatient,
  RPM_SOURCE,
} from '@/data/telemedRpm';
import {
  SUGGEST_SYMPTOM,
  SUGGEST_DIAGNOSIS,
  SUGGEST_PLAN,
  VITAL_LABELS,
  validateVitals,
  vitalSoftWarnings,
} from '@/data/telemedAssessments';
import { telemedCan, telemedDenyReason, logTelemedEvent, telemedActor } from '@/utils/telemedAccess';
import { getEmrChart } from '@/utils/telemedEmr';

/* TelemedEmrPanel — แท็บ "EMR / ประวัติ" + แผงประเมินในสาย (TOR §1.13.1,
   §1.13.2, §1.13.6). เสียบเข้า right panel ของ TelemedConsultOverlay แบบ
   additive — ไม่แตะ state เดิมของห้องตรวจ 3,057 บรรทัด.

   ทำไมเป็น component ใหม่: ไม่มีอะไรใน src/components/ ที่รวม
   "EMR chart ย่อ + แผงแก้ไขการประเมินตาม role + RPM 7 วัน" ไว้ในความกว้าง
   360 px ของ right panel; PatientSummaryCard / VitalsSignHorizontalPanel
   ถูกออกแบบสำหรับหน้าเต็มความกว้าง. ดู manifest.newComponents. */

const boxStyle = {
  borderRadius: 'var(--dim-radius-300, 10px)',
  border: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary, #F4F5F5)',
  background: 'var(--surface-card-100, #FFFFFF)',
  paddingTop: 'var(--dim-space-300, 12px)',
  paddingBottom: 'var(--dim-space-300, 12px)',
  paddingLeft: 'var(--dim-space-300, 12px)',
  paddingRight: 'var(--dim-space-300, 12px)',
};

const Section = ({ icon, title, right, children, empty }) => (
  <div style={{ ...boxStyle, marginTop: 'var(--dim-space-300, 12px)' }}>
    <div
      className='flex items-center'
      style={{ gap: 'var(--dim-space-150, 6px)', marginBottom: 'var(--dim-space-200, 8px)' }}
    >
      <Icon name={icon} size={16} style={{ color: 'var(--icon-brandPrimary-default, #007549)' }} />
      <span
        style={{
          flex: 1,
          minWidth: 0,
          fontFamily: 'var(--type-family-heading-graphic2, "Mitr", sans-serif)',
          fontSize: 'var(--type-size-sm, 14px)',
          color: 'var(--text-content-default, #363B3F)',
        }}
      >
        {title}
      </span>
      {right}
    </div>
    {empty ? (
      <div
        className='flex flex-col items-center text-center'
        style={{
          gap: 'var(--dim-space-100, 4px)',
          paddingTop: 'var(--dim-space-300, 12px)',
          paddingBottom: 'var(--dim-space-300, 12px)',
        }}
      >
        <Icon name='inbox' size={20} style={{ color: 'var(--text-content-quaternary, #ADB2B7)' }} />
        <span style={{ fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary, #858C92)' }}>
          {empty}
        </span>
      </div>
    ) : children}
  </div>
);

const Row = ({ label, value, tone }) => (
  <div
    className='flex items-baseline justify-between'
    style={{ gap: 'var(--dim-space-200, 8px)', paddingTop: 'var(--dim-space-050, 2px)', paddingBottom: 'var(--dim-space-050, 2px)' }}
  >
    <span style={{ fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary, #858C92)' }}>{label}</span>
    <span
      style={{
        fontSize: 'var(--type-size-sm, 14px)',
        fontWeight: 'var(--type-weight-medium, 500)',
        color: tone === 'danger'
          ? 'var(--text-alert-error, #B91C1C)'
          : tone === 'warn'
            ? 'var(--text-alert-warning, #C2410C)'
            : 'var(--text-content-default, #363B3F)',
        textAlign: 'right',
      }}
    >
      {value}
    </span>
  </div>
);

const InlineError = ({ children }) => (
  <span
    className='inline-flex items-center'
    style={{
      gap: 'var(--dim-space-100, 4px)',
      color: 'var(--text-alert-error, #B91C1C)',
      fontSize: 'var(--type-size-xs, 12px)',
    }}
  >
    <Icon name='error' size={12} />
    {children}
  </span>
);

/* ── EMR ที่ดึงจาก PHCIS ระหว่างสาย (TOR §1.13.6) ──────────────────────
   เดิม mock ผูกไว้กับ HN แค่ 2 ราย ทำให้ผู้รับบริการรายอื่นเห็นว่างทุกพาเนล
   (อ่านเหมือนระบบพัง). ตอนนี้ src/utils/telemedEmr.js สร้าง chart แบบ
   deterministic ให้ทุก HN โดยใช้ชื่อยา/LAB/X-ray จากแคตตาล็อกกลางจริง —
   ยังเป็นข้อมูลสาธิต (ไม่ได้ต่อ API PHCIS) จึงติดป้ายกำกับไว้ในพาเนล. */

const SEVERITY_OPTIONS = [
  { value: 'mild',     label: 'เล็กน้อย' },
  { value: 'moderate', label: 'ปานกลาง' },
  { value: 'severe',   label: 'รุนแรง — ต้องส่งต่อ' },
];

const VITAL_FIELDS = ['bpSys', 'bpDia', 'pulse', 'o2sat', 'temp', 'dtx'];

const TelemedEmrPanel = ({
  hn,
  patientName,
  visitId,
  role = 'doctor',
  /* อายุ (ปี) — ส่งมาจากคลินิกที่ mount แผงนี้ ใช้เลือกชุด chart จำลอง
     ให้เหมาะกับวัย (เด็ก < 15 ปีจะไม่ขึ้นยา/โรคของผู้ใหญ่) ไม่ส่งก็ได้ */
  ageYears,
  onOpenTreatmentRecord,
  onRequestAccess,
  onSaveAssessment,
  gis,
}) => {
  const [mode, setMode] = useState('emr'); // 'emr' | 'assess'
  const [draft, setDraft] = useState({
    symptoms: '', diagnosis: '', severity: 'mild', plan: '',
    bpSys: '', bpDia: '', pulse: '', o2sat: '', temp: '', dtx: '',
  });
  const [errors, setErrors] = useState({});
  const [saved, setSaved] = useState(null);
  const [accessRequested, setAccessRequested] = useState(false);

  const canViewEmr = telemedCan(role, 'viewEmr');
  const canEdit = telemedCan(role, 'edit') || telemedCan(role, 'add');
  const editDenyReason = telemedDenyReason(role, 'edit');

  const emr = useMemo(() => getEmrChart(hn, { name: patientName, ageYears }), [hn, patientName, ageYears]);

  const rpm = useMemo(() => {
    const p = getRpmPatientByHn(hn);
    if (!p) return null;
    const readings = getRpmReadings(p.id).slice(0, 7).reverse();
    return { patient: p, readings, ...evaluateRpmPatient(p, getRpmReadings(p.id)) };
  }, [hn]);

  /* ทุกครั้งที่เปิดดู EMR ระหว่างสายต้องยิง audit (TOR §1.13.11) */
  useEffect(() => {
    if (mode !== 'emr') return;
    logTelemedEvent(role, 'เปิดดูเวชระเบียน (EMR) ระหว่างสาย', {
      ok: canViewEmr,
      detail: `HN ${hn}`,
    });
  }, [mode, role, hn, canViewEmr]);

  const setField = (k) => (v) => {
    setDraft((d) => ({ ...d, [k]: typeof v === 'string' ? v : v?.target?.value ?? v }));
    setErrors((e) => (e[k] ? { ...e, [k]: undefined } : e));
  };

  const softWarns = vitalSoftWarnings(draft);

  const handleSave = () => {
    const vErrors = validateVitals(draft);
    const next = { ...vErrors };
    if (!draft.symptoms.trim()) next.symptoms = 'ต้องบันทึกอาการที่ประเมินได้';
    if (!draft.diagnosis.trim()) next.diagnosis = 'ต้องระบุการวินิจฉัยเบื้องต้น';
    setErrors(next);
    if (Object.keys(next).filter((k) => next[k]).length) return;
    const stamp = new Date();
    setSaved({ at: stamp, by: role });
    logTelemedEvent(role, 'บันทึกการประเมินระหว่างสาย', { detail: `HN ${hn}` });
    onSaveAssessment?.({ ...draft, visitId, hn, savedAt: stamp.toISOString() });
  };

  /* ── สิทธิ์ไม่พอ: เห็นแท็บได้ แต่ข้อมูลลับถูกซ่อน (TOR §1.4.2) ─────── */
  if (!canViewEmr) {
    return (
      <div style={{ paddingTop: 'var(--dim-space-400, 16px)', paddingBottom: 'var(--dim-space-400, 16px)', paddingLeft: 'var(--dim-space-400, 16px)', paddingRight: 'var(--dim-space-400, 16px)' }}>
        <div
          style={{
            ...boxStyle,
            background: 'var(--surface-alert-warning, #FFF9F0)',
            borderColor: 'var(--border-alert-warning, #FFEDD5)',
          }}
        >
          <div className='flex items-center' style={{ gap: 'var(--dim-space-200, 8px)', marginBottom: 'var(--dim-space-200, 8px)' }}>
            <Icon name='lock' size={18} style={{ color: 'var(--text-alert-warning, #C2410C)' }} />
            <span style={{ fontWeight: 'var(--type-weight-bold, 700)', fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-alert-warning, #C2410C)' }}>
              ต้องขอสิทธิ์เข้าถึงเวชระเบียน
            </span>
          </div>
          <p style={{ margin: 0, fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-secondary, #636B72)', lineHeight: 1.6 }}>
            {telemedDenyReason(role, 'viewEmr')} — ข้อมูลผู้รับบริการถูกซ่อนตาม TOR §1.4.2
            การเปิดดูทุกครั้งถูกบันทึกลงประวัติการใช้งาน
          </p>
          <div style={{ marginTop: 'var(--dim-space-300, 12px)' }}>
            {accessRequested ? (
              <ColorfulBadge style='blue' size='small' hierarchy='secondary'>ส่งคำขอสิทธิ์แล้ว · รอผู้ดูแลระบบอนุมัติ</ColorfulBadge>
            ) : (
              <BrandSubdueButton
                size='sm'
                variant='outline'
                leadingIcon='key'
                onClick={() => {
                  setAccessRequested(true);
                  logTelemedEvent(role, 'ขอสิทธิ์เข้าถึงเวชระเบียนระหว่างสาย', { detail: `HN ${hn}` });
                  onRequestAccess?.();
                }}
              >
                ขอสิทธิ์เข้าถึง
              </BrandSubdueButton>
            )}
          </div>
        </div>

        <Section icon='visibility' title='ข้อมูลที่เปิดให้ดูได้'>
          <Row label='ชื่อผู้รับบริการ' value={patientName || '—'} />
          <Row label='HN' value={hn || '—'} />
          <Row label='ข้อมูลคลินิก' value='ถูกปิดบังตามระดับสิทธิ์' tone='warn' />
        </Section>
      </div>
    );
  }

  return (
    <div style={{ paddingTop: 'var(--dim-space-400, 16px)', paddingBottom: 'var(--dim-space-400, 16px)', paddingLeft: 'var(--dim-space-400, 16px)', paddingRight: 'var(--dim-space-400, 16px)' }}>
      {/* สลับ EMR ↔ แผงประเมิน */}
      <div className='flex' style={{ gap: 'var(--dim-space-200, 8px)' }}>
        <NeutralSubdueButton
          size='sm'
          variant={mode === 'emr' ? 'fill' : 'outline'}
          leadingIcon='clinical_notes'
          onClick={() => setMode('emr')}
        >
          EMR / ประวัติ
        </NeutralSubdueButton>
        <NeutralSubdueButton
          size='sm'
          variant={mode === 'assess' ? 'fill' : 'outline'}
          leadingIcon='edit_note'
          onClick={() => setMode('assess')}
        >
          บันทึกประเมิน
        </NeutralSubdueButton>
      </div>

      {mode === 'emr' ? (
        <>
          {/* ที่มาของข้อมูล — ห้ามให้เข้าใจผิดว่าเป็น chart จริงจาก PHCIS */}
          <div
            style={{
              ...boxStyle,
              marginTop: 'var(--dim-space-300, 12px)',
              background: 'var(--surface-alert-info, #F0F6FF)',
              borderColor: 'var(--border-alert-info, #DBEAFE)',
            }}
          >
            <span className='inline-flex items-start' style={{ gap: 'var(--dim-space-150, 6px)', fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-secondary, #636B72)', lineHeight: 1.6 }}>
              <Icon name='info' size={14} style={{ color: 'var(--text-alert-info, #1D4ED8)', flexShrink: 0 }} />
              {emr.source}
            </span>
          </div>

          <Section
            icon='history'
            title='การมารับบริการย้อนหลัง'
            right={emr.visits.length > 1 ? (
              <ColorfulBadge style='grey' size='small' hierarchy='secondary'>{`${emr.visits.length} ครั้ง`}</ColorfulBadge>
            ) : undefined}
            empty={emr.lastVisit ? undefined : 'ผู้รับบริการรายใหม่ — ยังไม่มีประวัติการรักษาในระบบ'}
          >
            {emr.lastVisit && (
              <>
                <Row label='ล่าสุด' value={emr.lastVisit.date} />
                <Row label='หน่วยบริการ' value={emr.lastVisit.place} />
                <Row label='การวินิจฉัย' value={emr.lastVisit.dx} />
                <Row label='แพทย์' value={emr.lastVisit.doctor} />
                <Row label='ประเภท' value={emr.lastVisit.type} />
                {emr.visits.slice(1).map((v) => (
                  <Row key={v.id} label={v.date} value={`${v.dx} · ${v.place}`} />
                ))}
              </>
            )}
          </Section>

          <Section icon='pill' title='ยาเดิมที่ใช้อยู่' empty={emr.meds.length ? undefined : 'ยังไม่มีรายการยาเดิม'}>
            {emr.meds.map((m) => (
              <div
                key={m.name}
                className='flex flex-col'
                style={{ gap: 'var(--dim-space-050, 2px)', paddingTop: 'var(--dim-space-100, 4px)', paddingBottom: 'var(--dim-space-100, 4px)' }}
              >
                <span style={{ fontSize: 'var(--type-size-sm, 14px)', fontWeight: 'var(--type-weight-medium, 500)', color: 'var(--text-content-default, #363B3F)' }}>
                  {m.name}
                </span>
                <span style={{ fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-secondary, #636B72)' }}>
                  {m.sig}
                </span>
                <span style={{ fontSize: 'var(--type-size-xxs, 10px)', color: 'var(--text-content-tertiary, #858C92)' }}>
                  {`จ่ายครั้งล่าสุด ${m.lastDispensedAt}`}
                </span>
              </div>
            ))}
          </Section>

          <Section icon='allergy' title='การแพ้ยา / อาหาร' empty={emr.allergies.length ? undefined : 'ไม่มีประวัติแพ้ยาที่บันทึกไว้'}>
            <div className='flex flex-wrap' style={{ gap: 'var(--dim-space-150, 6px)' }}>
              {emr.allergies.map((a) => (
                <ColorfulBadge key={a} style='red' size='small' hierarchy='secondary'>{a}</ColorfulBadge>
              ))}
            </div>
          </Section>

          <Section icon='medical_information' title='โรคประจำตัว' empty={emr.chronic.length ? undefined : 'ไม่มีโรคประจำตัวที่บันทึกไว้'}>
            <div className='flex flex-wrap' style={{ gap: 'var(--dim-space-150, 6px)' }}>
              {emr.chronic.map((c) => (
                <ColorfulBadge key={c} style='orange' size='small' hierarchy='secondary'>{c}</ColorfulBadge>
              ))}
            </div>
          </Section>

          <Section icon='labs' title='ผลตรวจทางห้องปฏิบัติการ' empty={emr.labs.length ? undefined : 'ยังไม่มีผล LAB ในระบบ'}>
            {emr.labs.map((l, i) => (
              <div key={`${l.code}-${l.name}-${i}`} style={{ paddingTop: 'var(--dim-space-050, 2px)', paddingBottom: 'var(--dim-space-050, 2px)' }}>
                <Row label={`${l.name} · ${l.at}`} value={l.value} tone={l.abnormal ? 'danger' : undefined} />
                {(l.panel || l.ref) && (
                  <span style={{ fontSize: 'var(--type-size-xxs, 10px)', color: 'var(--text-content-tertiary, #858C92)' }}>
                    {[l.panel ? `${l.panel} (${l.code})` : '', l.ref].filter(Boolean).join(' · ')}
                  </span>
                )}
              </div>
            ))}
          </Section>

          <Section icon='radiology' title='ผลภาพรังสี (X-ray)' empty={emr.imaging.length ? undefined : 'ยังไม่มีผลภาพรังสีในระบบ'}>
            {emr.imaging.map((x) => (
              <div key={x.name} style={{ paddingTop: 'var(--dim-space-050, 2px)', paddingBottom: 'var(--dim-space-050, 2px)' }}>
                <Row label={x.at} value={x.name} />
                <span style={{ fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-secondary, #636B72)' }}>
                  {x.impression}
                </span>
              </div>
            ))}
          </Section>

          <Section icon='monitor_heart' title='ค่าจากอุปกรณ์ที่บ้าน 7 วันล่าสุด' empty={rpm && rpm.readings.length ? undefined : 'ผู้รับบริการรายนี้ยังไม่ได้ลงทะเบียนอุปกรณ์ RPM'}>
            {rpm && rpm.readings.length > 0 && (
              <>
                <TelemedRpmSparkline
                  width={300}
                  points={rpm.readings
                    .filter((r) => r.bpSys != null)
                    .map((r) => ({ at: r.at, value: r.bpSys, label: 'SBP' }))}
                  isBreach={(p) => p.value > (rpm.patient.thresholds.bpHighSys?.value ?? 160)}
                  ariaLabel='แนวโน้มความดันตัวบน 7 วันล่าสุด'
                />
                {rpm.latest && (
                  <>
                    <Row
                      label={`ล่าสุด · ${RPM_SOURCE[rpm.latest.source]?.label || '—'}`}
                      value={rpm.latest.bpSys != null ? `${rpm.latest.bpSys}/${rpm.latest.bpDia} mmHg` : `${rpm.latest.dtx} mg/dL`}
                      tone={rpm.level === 'critical' ? 'danger' : undefined}
                    />
                    {rpm.latest.source === 'self' && (
                      <ColorfulBadge style='orange' size='small' hierarchy='secondary'>
                        ค่านี้ผู้ป่วยส่งเอง (self-reported)
                      </ColorfulBadge>
                    )}
                  </>
                )}
                {rpm.alerts.slice(0, 2).map((a) => (
                  <div key={a.key} style={{ marginTop: 'var(--dim-space-150, 6px)' }}>
                    <ColorfulBadge style={a.level === 'critical' ? 'red' : 'orange'} size='small' hierarchy='secondary'>
                      {a.label}
                    </ColorfulBadge>
                    <div style={{ fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-secondary, #636B72)', marginTop: 'var(--dim-space-050, 2px)' }}>
                      {a.detail}
                    </div>
                  </div>
                ))}
              </>
            )}
          </Section>

          <Section icon='event_available' title='การนัดหมายถัดไป' empty={emr.appointments.length ? undefined : 'ยังไม่มีนัดหมายถัดไป'}>
            {emr.appointments.map((a, i) => (
              <Row key={`${a.at}-${i}`} label={a.clinic} value={a.at} />
            ))}
          </Section>

          {gis && (
            <Section icon='location_on' title='ตำแหน่งการประเมิน (GIS)'>
              <p style={{ marginTop: 0, marginRight: 0, marginBottom: 'var(--dim-space-200, 8px)', marginLeft: 0, fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary, #858C92)', lineHeight: 1.5 }}>
                {gis.label} · แผนที่สาธิต ไม่ใช่พิกัดจริงจากอุปกรณ์
              </p>
              <AddressMapBlock value={gis} readOnly compact heading='ตำแหน่งการประเมินผู้รับบริการ' hint='พิกัดจาก GIS ณ เวลาประเมิน (ดูอย่างเดียว)' />
            </Section>
          )}

          <div className='flex flex-col' style={{ gap: 'var(--dim-space-200, 8px)', marginTop: 'var(--dim-space-400, 16px)' }}>
            <BrandSubdueButton
              size='sm'
              variant='outline'
              leadingIcon='open_in_new'
              onClick={() => {
                logTelemedEvent(role, 'เปิด chart เต็มใน PHCIS จากห้องตรวจทางไกล', { detail: `HN ${hn}` });
                onOpenTreatmentRecord?.();
              }}
            >
              เปิด chart เต็มใน PHCIS
            </BrandSubdueButton>
            <span style={{ fontSize: 'var(--type-size-xxs, 10px)', color: 'var(--text-content-tertiary, #858C92)', lineHeight: 1.5 }}>
              {`ไปที่ /treat/record พร้อม HN ${hn || '—'} — พาเนลนี้แสดงเฉพาะข้อมูลย่อที่ใช้ระหว่างสาย`}
            </span>
          </div>
        </>
      ) : (
        <>
          {!canEdit && (
            <div
              style={{
                ...boxStyle,
                marginTop: 'var(--dim-space-300, 12px)',
                background: 'var(--surface-alert-warning, #FFF9F0)',
                borderColor: 'var(--border-alert-warning, #FFEDD5)',
              }}
            >
              <span className='inline-flex items-center' style={{ gap: 'var(--dim-space-150, 6px)', fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-alert-warning, #C2410C)' }}>
                <Icon name='visibility' size={14} />
                ดูอย่างเดียว — {editDenyReason}
              </span>
            </div>
          )}

          <Section icon='ecg_heart' title='สัญญาณชีพจากผู้ป่วย / อุปกรณ์'>
            <div className='grid' style={{ gridTemplateColumns: '1fr 1fr', gap: 'var(--dim-space-200, 8px)' }}>
              {VITAL_FIELDS.map((f) => (
                <div key={f} className='flex flex-col' style={{ gap: 'var(--dim-space-050, 2px)' }}>
                  <span style={{ fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary, #858C92)' }}>
                    {VITAL_LABELS[f]}
                  </span>
                  <InputField
                    size='md'
                    showLabel={false}
                    showHelperText={false}
                    value={draft[f]}
                    onChange={setField(f)}
                    disabled={!canEdit}
                    placeholder='—'
                  />
                  {errors[f] && <InlineError>{errors[f]}</InlineError>}
                </div>
              ))}
            </div>
            {softWarns.map((w) => (
              <div key={w} style={{ marginTop: 'var(--dim-space-150, 6px)' }}>
                <ColorfulBadge style='orange' size='small' hierarchy='secondary'>{w}</ColorfulBadge>
              </div>
            ))}
          </Section>

          <Section icon='sick' title='อาการที่ประเมินได้'>
            <SuggestibleTextarea
              voice
              minChars={3}
              suggestions={SUGGEST_SYMPTOM}
              value={draft.symptoms}
              onChange={setField('symptoms')}
              placeholder='บันทึกอาการที่สังเกต / ผู้รับบริการแจ้งระหว่างสาย'
              height={120}
              disabled={!canEdit}
            />
            {errors.symptoms && <InlineError>{errors.symptoms}</InlineError>}
          </Section>

          <Section icon='diagnosis' title='การวินิจฉัยเบื้องต้น'>
            <SuggestibleTextarea
              voice
              minChars={3}
              suggestions={SUGGEST_DIAGNOSIS}
              value={draft.diagnosis}
              onChange={setField('diagnosis')}
              placeholder='เช่น Essential hypertension, uncontrolled (I10)'
              height={100}
              disabled={!canEdit}
            />
            {errors.diagnosis && <InlineError>{errors.diagnosis}</InlineError>}
            <div style={{ marginTop: 'var(--dim-space-200, 8px)' }}>
              <Select
                showLabel={false}
                searchable={false}
                size='md'
                value={draft.severity}
                onChange={setField('severity')}
                options={SEVERITY_OPTIONS}
                disabled={!canEdit}
              />
            </div>
          </Section>

          <Section icon='clinical_notes' title='แผนการรักษา'>
            <SuggestibleTextarea
              voice
              minChars={3}
              suggestions={SUGGEST_PLAN}
              value={draft.plan}
              onChange={setField('plan')}
              placeholder='แผนการรักษา / การติดตามหลังจบสาย'
              height={110}
              disabled={!canEdit}
            />
          </Section>

          {saved && (
            <div style={{ ...boxStyle, marginTop: 'var(--dim-space-300, 12px)', background: 'var(--surface-brandPrimary-quaternary, #F4FBF8)', borderColor: 'var(--border-brandPrimary-quaternary, #E2F3EB)' }}>
              <span className='inline-flex items-center' style={{ gap: 'var(--dim-space-150, 6px)', fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-brandPrimary-default, #007549)' }}>
                <Icon name='check_circle' size={14} />
                {`บันทึกแล้ว · ผู้บันทึก ${telemedActor(saved.by)} · ${new Date(saved.at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.`}
              </span>
            </div>
          )}

          <div className='flex' style={{ gap: 'var(--dim-space-200, 8px)', marginTop: 'var(--dim-space-400, 16px)' }}>
            <BrandSubdueButton size='sm' leadingIcon='save' onClick={handleSave} disabled={!canEdit}>
              บันทึกการประเมิน
            </BrandSubdueButton>
            <NeutralSubdueButton
              size='sm'
              variant='outline'
              leadingIcon='restart_alt'
              disabled={!canEdit}
              onClick={() => {
                setDraft({ symptoms: '', diagnosis: '', severity: 'mild', plan: '', bpSys: '', bpDia: '', pulse: '', o2sat: '', temp: '', dtx: '' });
                setErrors({});
                setSaved(null);
              }}
            >
              ล้างแบบฟอร์ม
            </NeutralSubdueButton>
          </div>
        </>
      )}
    </div>
  );
};

export default TelemedEmrPanel;
