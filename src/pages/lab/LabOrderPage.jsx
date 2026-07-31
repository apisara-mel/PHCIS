import React, { useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import Icon from '@/components/icons/Icon';
import Badge from '@/components/badge/Badge';
import BrandButton from '@/components/button/BrandButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import SuccessToast from '@/components/toast/SuccessToast';
import LabOrderPicker from '@/components/lab/LabOrderPicker';
import LabTubeDot from '@/pages/lab/LabTubeDot';
import { PATIENT_PROFILES } from '@/data/patientProfiles';
import {
  LAB_LOCATIONS, LAB_URGENCIES, labHistoryFor,
  priorOrdersFor, advanceOrdersFor, addAdvanceOrder,
} from '@/data/labOrders';
import { summariseSelection, LAB_TEST_BY_ID } from '@/data/labCatalog';

/* The mock's "today". A real deployment reads the clock; pinning it keeps
   the seeded advance orders reproducible across reloads. */
const TODAY = '2026-07-31';

/* สั่งตรวจทางห้องปฏิบัติการ — the ordering side of the lab module: a doctor
   or nurse picks the patient, the tests, and the urgency, and the request
   lands in the lab's worklist.

   The order-entry control itself is <LabOrderPicker>, which is where the
   five fixes the team wrote up in `Lab dicussion with team.pdf` live (see
   that component's header). This page is the surrounding context the picker
   needs to become a real order: who it's for, where it came from, how
   urgent it is, and what the resulting tubes/accessions will be.

   The team's flow puts ordering ahead of the worklist —
     "รายชื่อแพทย์ order > Order … Worklist พยาบาลหรือเจ้าหน้าที่ Lab เห็นว่า
      ต้องเก็บสารคัดหลั่งหรืออะไรบ้าง … ชื่อของผู้รับบริการและสามารถดูได้ว่าต้อง
      เก็บตัวอย่างอะไรบ้าง และเก็บข้อมูลดดยอะไร"
   — so what this page produces has to be exactly what the worklist consumes:
   one row per test, grouped into tubes, each tube carrying one accession.

   The picker is deliberately a standalone component so Treatment Step 5 can
   mount the same control against its `labs[]` slice without duplicating any
   of the grouping/summary/duplicate-warning logic. */

const breadcrumb = ['งานชันสูตรโรค (Lab)', 'สั่งตรวจทางห้องปฏิบัติการ'];

const SectionCard = ({ icon, title, subtitle, children, action }) => (
  <section
    className='bg-surface-card rounded-card shadow-card flex flex-col w-full'
    style={{ padding: 'var(--dim-space-600)', gap: 'var(--dim-space-400)' }}
  >
    <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-300)' }}>
      <div
        className='shrink-0 inline-flex items-center justify-center'
        style={{
          width: 'var(--dim-size-800, 40px)',
          height: 'var(--dim-size-800, 40px)',
          borderRadius: 'var(--dim-radius-300, 10px)',
          background: 'var(--surface-brandPrimary-quaternary)',
          color: 'var(--text-brandPrimary-default)',
        }}
      >
        <Icon name={icon} size={20} />
      </div>
      <div className='flex-1 min-w-0 flex flex-col'>
        <h2 className='text-base font-bold text-ink'>{title}</h2>
        {subtitle && <p className='text-xs text-ink-tertiary'>{subtitle}</p>}
      </div>
      {action}
    </div>
    {children}
  </section>
);

/* Same radio-card shape as PharmacyRegistryEditPage / UserEditPage, so the
   admin-edit visual language stays consistent across modules. */
const RadioCard = ({ label, sublabel, icon = 'category', selected, onSelect, tone }) => (
  <button
    type='button'
    onClick={onSelect}
    className='flex items-center w-full text-left'
    style={{
      gap: 'var(--dim-space-200)',
      paddingTop: 'var(--dim-space-300)',
      paddingRight: 'var(--dim-space-300)',
      paddingBottom: 'var(--dim-space-300)',
      paddingLeft: 'var(--dim-space-300)',
      background: selected ? 'var(--surface-brandPrimary-quaternary)' : 'var(--surface-card-100)',
      border: `var(--dim-stroke-100) solid ${selected ? 'var(--border-brandPrimary-default)' : 'var(--border-card-default)'}`,
      borderRadius: 'var(--dim-radius-200)',
      cursor: 'pointer',
    }}
  >
    <Icon name={icon} size={18} style={{ color: tone ?? (selected ? 'var(--text-brandPrimary-default)' : 'var(--text-content-tertiary)') }} />
    <span className='flex-1 min-w-0 flex flex-col'>
      <span className='text-sm font-bold' style={{ color: selected ? 'var(--text-brandPrimary-default)' : 'var(--text-content-primary)' }}>
        {label}
      </span>
      {sublabel && <span className='text-xs text-ink-tertiary'>{sublabel}</span>}
    </span>
    {selected && <Icon name='check_circle' size={18} style={{ color: 'var(--text-brandPrimary-default)' }} />}
  </button>
);

const SelectField = ({ label, value, onChange, options, required }) => (
  <label className='flex flex-col' style={{ gap: 'var(--dim-space-150)' }}>
    <span className='text-xs text-ink-secondary'>
      {label} {required && <span style={{ color: 'var(--text-input-require)' }}>*</span>}
    </span>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: '100%',
        paddingTop: 'var(--dim-space-150)',
        paddingRight: 'var(--dim-space-300)',
        paddingBottom: 'var(--dim-space-150)',
        paddingLeft: 'var(--dim-space-300)',
        background: 'var(--surface-input-default)',
        border: 'var(--dim-stroke-100) solid var(--border-input-default)',
        borderRadius: 'var(--dim-radius-200)',
        fontSize: 'var(--type-size-sm)',
        outline: 'none',
      }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  </label>
);

/* Accession preview — the team's "Barcode ตาม Tube" rule made visible before
   the order is submitted, so whoever draws the blood knows how many tubes
   and labels to expect. Sequence numbers are provisional; the real ones are
   issued by the lab when the order lands. */
const nextAccession = (i) => `L69-${String(800 + i).padStart(4, '0')}`;

const LabOrderPage = () => {
  const history = useHistory();

  const [patientIdx, setPatientIdx] = useState(0);
  const [location, setLocation] = useState(LAB_LOCATIONS[3]); /* ตรวจรักษาทั่วไป (OPD) */
  const [urgency, setUrgency] = useState('routine');
  const [note, setNote] = useState('');
  const [selected, setSelected] = useState([]);
  const [saved, setSaved] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');
  /* §1.15.4.7 — order now vs order ahead of a future visit. */
  const [isAdvance, setIsAdvance] = useState(false);
  const [scheduledFor, setScheduledFor] = useState('');

  const patient = PATIENT_PROFILES[patientIdx];
  /* Duplicate warnings are per-patient, so switching patient re-evaluates
     every option's "เคยตรวจ … เมื่อ N วันก่อน" note. */
  const history_ = useMemo(() => labHistoryFor(patient.hn), [patient.hn]);
  const summary = useMemo(() => summariseSelection(selected), [selected]);

  /* TOR §1.15.4.3 — prior orders for this patient, grouped the way the
     doctor placed them, so "สั่งซ้ำตามประวัติเดิม" is one click. */
  const priorOrders = useMemo(() => priorOrdersFor(patient.hn), [patient.hn]);
  /* Advance orders already queued for this patient, so the same tests are
     not booked twice. */
  const pendingAdvance = useMemo(() => advanceOrdersFor(patient.hn), [patient.hn, saved]);

  const canSubmit = selected.length > 0 && (!isAdvance || scheduledFor);

  const handleSubmit = () => {
    if (!canSubmit) return;
    if (isAdvance) {
      /* §1.15.4.7 — an advance order does NOT enter the lab's worklist. The
         patient is not here; the lab must not queue, draw or count it. It
         waits in its own list and is activated on the day they arrive. */
      addAdvanceOrder({
        patient,
        testIds: [...selected],
        doctor: patient.doctor,
        location,
        urgency,
        scheduledFor,
        note,
        createdAt: TODAY,
      });
      setSavedMsg(`บันทึกคำสั่งล่วงหน้าสำหรับวันที่ ${scheduledFor} แล้ว — ระบบจะดึงมาใช้เมื่อผู้ป่วยมาถึง`);
    } else {
      /* No backend — the worklist reads the static LAB_ORDERS mock, so a
         same-day order is confirmed rather than persisted. The shape it
         would POST is `summary.tests` × the header fields above. */
      setSavedMsg('ส่งคำขอตรวจไปยังห้องปฏิบัติการแล้ว');
    }
    setSaved(true);
    setSelected([]);
  };

  return (
    <div className='min-h-screen flex' style={{ background: 'var(--background-screen-brand-100, #F4FBF8)' }}>
      <Sidebar activeKey='lab' />
      <main className='flex-1 flex flex-col min-w-0'>
        <Header breadcrumb={breadcrumb} />
        <div className='p-3 md:p-6 flex-1 flex flex-col' style={{ gap: 'var(--dim-space-500)' }}>
          <div>
            <button
              type='button'
              onClick={() => history.push('/lab/queue')}
              className='inline-flex items-center gap-1 text-sm text-ink-secondary hover:text-brand-500'
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 'var(--dim-space-0)' }}
            >
              <Icon name='chevron-left' size={16} />
              กลับไปยัง Worklist
            </button>
          </div>

          {/* ผู้ป่วย + จุดสั่ง. "จุดสั่งคือคลินิกที่สั่ง" and it drives the
              worklist's จุดสั่ง/ward column, so it is a required header
              field rather than something inferred later. */}
          <SectionCard
            icon='person'
            title='ผู้ป่วยและจุดสั่งตรวจ'
            subtitle='ระบุตัวผู้ป่วยด้วย 2 identifiers (ชื่อ-สกุล + HN) ตามมาตรฐานความปลอดภัยผู้ป่วย'
          >
            <div className='grid grid-cols-1 md:grid-cols-3 gap-3 w-full'>
              <SelectField
                label='ผู้ป่วย'
                required
                value={String(patientIdx)}
                onChange={(v) => setPatientIdx(Number(v))}
                options={PATIENT_PROFILES.map((p, i) => ({ value: String(i), label: `${p.shortName} · HN ${p.hn}` }))}
              />
              <SelectField
                label='จุดสั่ง / คลินิก'
                required
                value={location}
                onChange={setLocation}
                options={LAB_LOCATIONS.map((l) => ({ value: l, label: l }))}
              />
              <label className='flex flex-col' style={{ gap: 'var(--dim-space-150)' }}>
                <span className='text-xs text-ink-secondary'>แพทย์ผู้สั่ง</span>
                <input
                  type='text'
                  value={patient.doctor}
                  readOnly
                  style={{
                    width: '100%',
                    paddingTop: 'var(--dim-space-150)',
                    paddingRight: 'var(--dim-space-300)',
                    paddingBottom: 'var(--dim-space-150)',
                    paddingLeft: 'var(--dim-space-300)',
                    background: 'var(--surface-card-200)',
                    border: 'var(--dim-stroke-100) solid var(--border-input-default)',
                    borderRadius: 'var(--dim-radius-200)',
                    fontSize: 'var(--type-size-sm)',
                    color: 'var(--text-content-secondary)',
                    outline: 'none',
                  }}
                />
              </label>
            </div>

            {/* The two identifiers, restated as a confirmation strip — this
                is the check that stops a specimen being drawn from the wrong
                patient, and it is worth being unmissable. */}
            <div
              className='flex items-center flex-wrap w-full'
              style={{
                gap: 'var(--dim-space-300)',
                background: 'var(--surface-brandPrimary-quaternary)',
                borderRadius: 'var(--dim-radius-200)',
                paddingTop: 'var(--dim-space-300)',
                paddingRight: 'var(--dim-space-400)',
                paddingBottom: 'var(--dim-space-300)',
                paddingLeft: 'var(--dim-space-400)',
              }}
            >
              <span className='text-sm font-bold text-ink'>{patient.fullName}</span>
              <span className='text-sm text-ink-secondary'>HN {patient.hn}</span>
              <span className='text-sm text-ink-secondary'>{parseInt(patient.age, 10)} ปี / {patient.sex}</span>
              <span className='text-sm text-ink-secondary'>หมู่เลือด {patient.bloodType}</span>
              <span className='text-xs text-ink-tertiary'>{patient.insurance}</span>
            </div>
          </SectionCard>

          {/* ความเร่งด่วน — three levels per the team, each with the SLA the
              worklist's aging column measures against, so the person
              ordering can see what they are committing the lab to. */}
          {/* TOR §1.15.4.3 — ประวัติการสั่ง Lab + สั่งตามประวัติเดิม.
              Placed above the picker because re-ordering a previous set is
              the faster path when it applies; picking tests one by one is
              the fallback, not the default, for a follow-up visit. */}
          {priorOrders.length > 0 && (
            <SectionCard
              icon='history'
              title='ประวัติการสั่งตรวจของผู้ป่วยรายนี้'
              subtitle='เลือก "สั่งซ้ำตามเดิม" เพื่อดึงรายการทั้งชุดมาใส่ในฟอร์ม แล้วปรับเพิ่ม-ลดได้'
              action={<Badge style='neutral' size='small'>{priorOrders.length} ครั้ง</Badge>}
            >
              <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200)' }}>
                {priorOrders.slice(0, 5).map((o) => (
                  <div
                    key={o.orderId}
                    className='flex flex-wrap items-center w-full'
                    style={{
                      gap: 'var(--dim-space-300)',
                      background: 'var(--surface-card-200)',
                      borderRadius: 'var(--dim-radius-200)',
                      border: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary)',
                      paddingTop: 'var(--dim-space-300)',
                      paddingRight: 'var(--dim-space-400)',
                      paddingBottom: 'var(--dim-space-300)',
                      paddingLeft: 'var(--dim-space-400)',
                    }}
                  >
                    <span className='text-xs text-ink-tertiary' style={{ width: 84 }}>{o.orderId}</span>
                    <span className='flex-1 min-w-0 flex flex-col'>
                      <span className='text-sm text-ink'>
                        {o.rows.map((r) => LAB_TEST_BY_ID[r.testId]?.nameEn ?? r.testId).join(' · ')}
                      </span>
                      <span className='text-xs text-ink-tertiary'>
                        {o.location} · {o.doctor} · {o.orderedAt}
                        {/* Whether the previous run was normal is what
                            decides if repeating it is worth doing. */}
                        {o.rows.some((r) => r.critical) && ' · เคยพบค่าวิกฤต'}
                      </span>
                    </span>
                    <NeutralSubdueButton
                      variant='outline'
                      size='sm'
                      leadingIcon='replay'
                      onClick={() => setSelected([...new Set([...selected, ...o.testIds])])}
                    >
                      สั่งซ้ำตามเดิม
                    </NeutralSubdueButton>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {/* §1.15.4.7 — สั่งล่วงหน้า. A toggle rather than a separate screen:
              everything else about the order (patient, tests, urgency) is
              identical; only WHEN it reaches the lab differs. */}
          <SectionCard
            icon='event_upcoming'
            title='เวลาที่ส่งคำขอ'
            subtitle='สั่งสำหรับวันนี้ หรือสั่งล่วงหน้าไว้ให้ดึงมาใช้อัตโนมัติในวันที่ผู้ป่วยมาตามนัด'
            action={pendingAdvance.length > 0 ? <Badge style='info' size='small'>มีคำสั่งล่วงหน้าค้าง {pendingAdvance.length}</Badge> : undefined}
          >
            <div className='grid grid-cols-1 md:grid-cols-2 gap-3 w-full'>
              <RadioCard
                label='สั่งสำหรับวันนี้'
                sublabel='เข้าสู่ Worklist ของห้องปฏิบัติการทันที'
                icon='bolt'
                selected={!isAdvance}
                onSelect={() => setIsAdvance(false)}
              />
              <RadioCard
                label='สั่งล่วงหน้า'
                sublabel='ยังไม่เข้า Worklist — ระบบจะดึงมาใช้ในวันที่ผู้ป่วยมา'
                icon='event_upcoming'
                selected={isAdvance}
                onSelect={() => setIsAdvance(true)}
              />
            </div>
            {isAdvance && (
              <label className='flex flex-col' style={{ gap: 'var(--dim-space-150)', maxWidth: 260 }}>
                <span className='text-xs text-ink-secondary'>
                  วันที่นัดตรวจ <span style={{ color: 'var(--text-input-require)' }}>*</span>
                </span>
                <input
                  type='date'
                  value={scheduledFor}
                  min={TODAY}
                  onChange={(e) => setScheduledFor(e.target.value)}
                  style={{
                    width: '100%',
                    paddingTop: 'var(--dim-space-150)',
                    paddingRight: 'var(--dim-space-300)',
                    paddingBottom: 'var(--dim-space-150)',
                    paddingLeft: 'var(--dim-space-300)',
                    background: 'var(--surface-input-default)',
                    border: 'var(--dim-stroke-100) solid var(--border-input-default)',
                    borderRadius: 'var(--dim-radius-200)',
                    fontSize: 'var(--type-size-sm)',
                    outline: 'none',
                  }}
                />
              </label>
            )}
            {pendingAdvance.length > 0 && (
              <div className='flex flex-col' style={{ gap: 'var(--dim-space-150)' }}>
                <span className='text-xs text-ink-secondary'>คำสั่งล่วงหน้าที่ยังไม่ถึงกำหนดของผู้ป่วยรายนี้</span>
                {pendingAdvance.map((a) => (
                  <span key={a.id} className='text-xs text-ink-tertiary'>
                    {a.scheduledFor} · {a.testIds.map((t) => LAB_TEST_BY_ID[t]?.nameEn ?? t).join(', ')} · {a.location}
                  </span>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard
            icon='priority_high'
            title='ความเร่งด่วน'
            subtitle='STAT จะถูกดันขึ้นบนสุดของ Worklist และแจ้งเตือนห้องปฏิบัติการทันที'
          >
            <div className='grid grid-cols-1 md:grid-cols-3 gap-3 w-full'>
              {LAB_URGENCIES.map((u) => (
                <RadioCard
                  key={u.key}
                  label={u.label}
                  sublabel={`เป้าหมายรายงานผลภายใน ${u.slaMinutes >= 60 ? `${u.slaMinutes / 60} ชม.` : `${u.slaMinutes} นาที`}`}
                  icon={u.key === 'stat' ? 'bolt' : u.key === 'urgent' ? 'schedule' : 'check_circle'}
                  selected={urgency === u.key}
                  onSelect={() => setUrgency(u.key)}
                  tone={u.key === 'stat' ? 'var(--text-statusbadge-error, #B91C1C)' : undefined}
                />
              ))}
            </div>
          </SectionCard>

          {/* The picker — everything the team asked for about test selection
              lives inside it, not here. */}
          <SectionCard
            icon='biotech'
            title='เลือกรายการตรวจ'
            subtitle='จัดกลุ่มตามกลุ่มตรวจเดียวกับ Worklist · ชุดตรวจ (Panel) กางดูรายการย่อยได้ · เตือนเมื่อสั่งซ้ำ'
            action={
              selected.length > 0
                ? <Badge style='info' size='small'>{selected.length} รายการ</Badge>
                : undefined
            }
          >
            <LabOrderPicker
              value={selected}
              onChange={setSelected}
              history={history_}
              patientName={patient.shortName}
            />
          </SectionCard>

          {/* Tube/accession preview — "Barcode ตาม Tube": one accession and
              one sticker per TUBE, not per test, which is why two Chemistry
              tests sharing a Clot tube produce a single label here. */}
          {summary.tubes.length > 0 && (
            <SectionCard
              icon='barcode'
              title='หลอดและสติกเกอร์ที่จะถูกสร้าง'
              subtitle='ออก Accession และบาร์โค้ด 1 ชุดต่อ 1 หลอด — รายการตรวจที่ใช้หลอดชนิดเดียวกันจะรวมเป็นหลอดเดียว'
            >
              <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200)' }}>
                {summary.tubes.map((t, i) => {
                  const testsInTube = summary.tests.filter((x) => x.tubeKey === t.tube.key);
                  return (
                    <div
                      key={t.tube.key}
                      className='flex items-center flex-wrap w-full'
                      style={{
                        gap: 'var(--dim-space-300)',
                        background: 'var(--surface-card-200)',
                        borderRadius: 'var(--dim-radius-200)',
                        border: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary)',
                        paddingTop: 'var(--dim-space-300)',
                        paddingRight: 'var(--dim-space-400)',
                        paddingBottom: 'var(--dim-space-300)',
                        paddingLeft: 'var(--dim-space-400)',
                      }}
                    >
                      <span
                        className='inline-flex items-center'
                        style={{ gap: 'var(--dim-space-150)', fontFamily: 'var(--type-family-mono, monospace)', fontSize: 'var(--type-size-sm)', color: 'var(--text-content-default)' }}
                      >
                        <Icon name='barcode' size={14} />
                        {nextAccession(i)}
                      </span>
                      <LabTubeDot tube={t.tube} count={t.count} />
                      <span className='text-xs text-ink-tertiary'>
                        {t.tube.volumeMl * t.count} mL · {t.tube.additive}
                      </span>
                      <span className='flex-1 min-w-0 text-xs text-ink-secondary truncate'>
                        {testsInTube.map((x) => x.nameEn).join(' · ')}
                      </span>
                      <span className='text-xs text-ink-tertiary'>{t.tube.note}</span>
                    </div>
                  );
                })}
              </div>
            </SectionCard>
          )}

          <SectionCard icon='edit_note' title='หมายเหตุถึงห้องปฏิบัติการ' subtitle='ไม่บังคับ — เช่น ข้อควรระวังในการเจาะ หรือบริบททางคลินิก'>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder='เช่น ผู้ป่วยมีภาวะเลือดออกง่าย ต้องกดห้ามเลือดนานกว่าปกติ'
              style={{
                width: '100%',
                paddingTop: 'var(--dim-space-300)',
                paddingRight: 'var(--dim-space-300)',
                paddingBottom: 'var(--dim-space-300)',
                paddingLeft: 'var(--dim-space-300)',
                background: 'var(--surface-input-default)',
                border: 'var(--dim-stroke-100) solid var(--border-input-default)',
                borderRadius: 'var(--dim-radius-200)',
                fontFamily: 'var(--type-family-body)',
                fontSize: 'var(--type-size-sm)',
                outline: 'none',
                resize: 'vertical',
              }}
            />
          </SectionCard>

          {/* Sticky submit bar — same shape as PharmacyRegistryEditPage's
              save footer, restating the order's cost and tube count so the
              last thing read before submitting is its real-world impact. */}
          <section
            className='bg-surface-card rounded-card shadow-card flex flex-wrap items-center w-full sticky bottom-0'
            style={{ gap: 'var(--dim-space-300)', padding: 'var(--dim-space-500)' }}
          >
            <span className='text-sm text-ink-secondary'>
              {selected.length === 0
                ? 'เลือกรายการตรวจอย่างน้อย 1 รายการเพื่อส่งคำขอ'
                : `${summary.testCount} รายการ · ${summary.tubeCount} หลอด · ${summary.totalPrice.toLocaleString('th-TH')} บาท`}
            </span>
            {summary.fastingHours > 0 && (
              <Badge style='warning' size='small'>งดอาหาร {summary.fastingHours} ชม.</Badge>
            )}
            {urgency === 'stat' && <Badge style='error' size='small'>STAT</Badge>}
            <div className='flex-1' />
            <NeutralSubdueButton variant='outline' size='md' onClick={() => history.push('/lab/queue')}>
              ยกเลิก
            </NeutralSubdueButton>
            <BrandButton size='md' leadingIcon={isAdvance ? 'event_upcoming' : 'send'} disabled={!canSubmit} onClick={handleSubmit}>
              {isAdvance ? 'บันทึกคำสั่งล่วงหน้า' : 'ส่งคำขอตรวจ'}
            </BrandButton>
          </section>
        </div>
      </main>
      <SuccessToast open={saved} message={savedMsg} onClose={() => setSaved(false)} />
    </div>
  );
};

export default LabOrderPage;
