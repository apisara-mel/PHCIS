import React, { useCallback, useMemo, useRef, useState } from 'react';
import VitalsForm from '@/components/forms/VitalsForm';
import VoiceTextarea from '@/components/forms/VoiceTextarea';
import { setScreeningSection } from '@/data/opdScreeningReview';
import VitalsGraphPopup from '@/components/popup/VitalsGraphPopup';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import Icon from '@/components/icons/Icon';

/* ScreeningStep1 — OPD Screening step 1 wrapper (sibling-file pattern, same
   reason as ScreeningStep4: keep ScreeningPage.jsx lean).

   Adds on top of the shared VitalsForm:
     • TOR 1.2.2.3 (PARTIAL) — two-tier HIGH/LOW alert strip per vital (BP,
       HR, RR, Temp, SpO2): orange warning + red danger pills with arrow
       direction, evaluated in BOTH directions (hypothermia, bradycardia,
       hypotension, low SpO2 alert too, not only high).
       ⚠ Scope limit: the strip grades the patient's last RECORDED round
       (buildVitalsSeries — the same series the history table shows), NOT the
       numbers the nurse is typing right now. `VitalsForm` is shared DS code
       and currently exposes only `onValidityChange` (no value/onChange), so
       there is no supported way to read live measurements from here without
       changing a shared component (playbook §4 → integrator task: add a
       `values` / `onValuesChange` pair to VitalsForm). Every label below is
       worded as "ค่าที่บันทึกล่าสุด" so the strip cannot be misread as live
       validation of the current entry.
     • TOR 1.2.2.4 — "ดูประวัติ" button opening VitalsGraphPopup with a
       DatePickerRange window that filters the series by real calendar date.

     • "บันทึกเพิ่มเติม" — ช่องพิมพ์/พูดแบบไม่บังคับ สำหรับสิ่งที่การ์ดสัญญาณชีพ
       เก็บไม่ได้ เช่น ท่าที่วัด เหตุที่ค่าผิดปกติ หรือคำที่ผู้ป่วยบอกระหว่างวัด
       วางไว้เหนือปุ่ม "เพิ่มรอบการวัด" ผ่าน `beforeAddRoundSlot` ของ VitalsForm
       (slot แบบ opt-in คู่กับ `headerAction` — เมนูอื่นที่ใช้ฟอร์มเดียวกันไม่กระทบ)
       ไม่ผูกกับ `onValidityChange` จึงไม่กันปุ่ม "ถัดไป" และไหลไปพร้อมค่าสัญญาณชีพ
       ใน review section เดียวกัน ขั้น "ตรวจสอบข้อมูล" จึงอ่านต่อได้ */

/* ── Two-tier thresholds (per vital, both directions) ────────────────── */
export const VITAL_THRESHOLDS = {
  temp: { label: 'อุณหภูมิ', unit: '°C', highDanger: 39, highWarn: 37.5, lowWarn: 35.5, lowDanger: 35 },
  pulse: { label: 'ชีพจร', unit: 'ครั้ง/นาที', highDanger: 130, highWarn: 100, lowWarn: 55, lowDanger: 45 },
  resp: { label: 'การหายใจ', unit: 'ครั้ง/นาที', highDanger: 28, highWarn: 22, lowWarn: 10, lowDanger: 8 },
  sbp: { label: 'ความดัน (SBP)', unit: 'mmHg', highDanger: 180, highWarn: 140, lowWarn: 95, lowDanger: 85 },
  spo2: { label: 'SpO2', unit: '%', lowWarn: 95, lowDanger: 90 },
};

/** Evaluate one vital → null | { tier: 'warn'|'danger', dir: 'high'|'low' } */
export const evaluateVital = (key, value) => {
  const t = VITAL_THRESHOLDS[key];
  if (!t || value === null || value === undefined || value === '') return null;
  const v = Number(value);
  if (Number.isNaN(v)) return null;
  if (t.highDanger !== undefined && v >= t.highDanger) return { tier: 'danger', dir: 'high' };
  if (t.lowDanger !== undefined && v <= t.lowDanger) return { tier: 'danger', dir: 'low' };
  if (t.highWarn !== undefined && v >= t.highWarn) return { tier: 'warn', dir: 'high' };
  if (t.lowWarn !== undefined && v <= t.lowWarn) return { tier: 'warn', dir: 'low' };
  return null;
};

/* Same token pairing as ScreeningPage's PAIN_TONE_TOKENS orange/red rows. */
const TIER_TOKENS = {
  warn: {
    bg: 'var(--surface-alert-warning, #FFF9F0)',
    fg: 'var(--text-warning-default, #C2410C)',
  },
  danger: {
    bg: 'var(--surface-danger-quaternary, #FFF0F0)',
    fg: 'var(--text-danger-default, #B91C1C)',
  },
};

/* ── Mock per-patient vitals series (also feeds the history popup) ─────
   Deterministic from HN so revisits show a stable story. Last entry =
   "ล่าสุด (วันนี้)" and drives the alert strip. */
const hashHn = (hn = '') => hn.split('').reduce((a, c) => a + c.charCodeAt(0), 0);

const dateLabel = (daysAgo) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
};

const dateAt = (daysAgo) => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - daysAgo);
  return d;
};

export const buildVitalsSeries = (hn = '') => {
  const h = hashHn(hn);
  const gaps = [180, 120, 60, 30, 7, 0];
  return gaps.map((daysAgo, i) => {
    const wob = ((h + i * 7) % 10) - 5; // -5..4 deterministic wobble
    const last = i === gaps.length - 1;
    /* Give ~1 in 3 patients an abnormal "today" row (high fever+HR or
       low BP+SpO2) so the two-tier strip is demonstrably exercised. */
    const abnormal = last ? h % 3 : -1;
    return {
      date: daysAgo === 0 ? `วันนี้ (${dateLabel(0)})` : dateLabel(daysAgo),
      /* Real Date so the history popup's DatePickerRange can filter by actual
         calendar window instead of mapping the window LENGTH to a row count
         (which made 1–7 ม.ค. and 1–7 ธ.ค. produce identical output). */
      when: dateAt(daysAgo),
      temp: abnormal === 0 ? 39.2 : +(36.5 + wob * 0.08).toFixed(1),
      pulse: abnormal === 0 ? 118 : abnormal === 1 ? 48 : 76 + wob * 2,
      resp: abnormal === 0 ? 24 : 18 + (wob > 0 ? 1 : 0),
      sbp: abnormal === 1 ? 88 : 118 + wob * 3,
      dbp: abnormal === 1 ? 56 : 76 + wob * 2,
      spo2: abnormal === 1 ? 92 : 98 - (wob > 3 ? 1 : 0),
      weight: +(58 + (h % 25) + wob * 0.3).toFixed(1),
      height: 155 + (h % 25),
    };
  });
};

const AlertPill = ({ label, value, unit, tier, dir }) => {
  const tone = TIER_TOKENS[tier];
  return (
    <span
      className='inline-flex items-center'
      style={{
        gap: 'var(--dim-space-100)',
        paddingTop: 'var(--dim-space-100)',
        paddingBottom: 'var(--dim-space-100)',
        paddingLeft: 'var(--dim-space-300)',
        paddingRight: 'var(--dim-space-300)',
        borderRadius: 'var(--dim-radius-full, 9999px)',
        background: tone.bg,
        color: tone.fg,
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-xs)',
        fontWeight: 'var(--type-weight-medium)',
      }}
    >
      <Icon name={dir === 'high' ? 'arrow_upward' : 'arrow_downward'} size={14} />
      {label} {value} {unit} {tier === 'danger' ? '(อันตราย)' : '(เฝ้าระวัง)'}
    </span>
  );
};

const ScreeningStep1 = ({ onValidityChange, patient = {} }) => {
  const [historyOpen, setHistoryOpen] = useState(false);
  const [note, setNote] = useState('');

  /* ใช้ ref ไม่ใช่ state เพราะผู้ส่งทั้งสองฝั่งต้องอ่านค่าล่าสุดของอีกฝั่ง
     โดยไม่ทำให้ VitalsForm ได้ callback ใหม่ทุกตัวอักษรที่พิมพ์ในบันทึก */
  const vitalsValuesRef = useRef(null);
  const noteRef = useRef('');

  const publishVitals = useCallback(() => {
    setScreeningSection(patient.hn, 'vitals', {
      ...(vitalsValuesRef.current || {}),
      note: noteRef.current,
    });
  }, [patient.hn]);

  const handleVitalsValues = useCallback((v) => {
    vitalsValuesRef.current = v;
    publishVitals();
  }, [publishVitals]);

  const handleNoteChange = useCallback((e) => {
    const next = e?.target?.value ?? '';
    noteRef.current = next;
    setNote(next);
    publishVitals();
  }, [publishVitals]);

  const series = useMemo(() => buildVitalsSeries(patient.hn || ''), [patient.hn]);
  const latest = series[series.length - 1];

  const alerts = useMemo(() => {
    const list = [];
    ['temp', 'pulse', 'resp', 'sbp', 'spo2'].forEach((key) => {
      const res = evaluateVital(key, latest[key]);
      if (res) {
        list.push({
          key,
          ...res,
          label: VITAL_THRESHOLDS[key].label,
          unit: VITAL_THRESHOLDS[key].unit,
          value: latest[key],
        });
      }
    });
    /* Danger first so the reddest problem leads the strip. */
    return list.sort((a, b) => (a.tier === b.tier ? 0 : a.tier === 'danger' ? -1 : 1));
  }, [latest]);

  /* ตัดตัวกรองช่วงเวลาออกแล้ว (มติผู้ใช้ 28 ส.ค. 69) — ประวัติของผู้รับบริการราย
     นี้สั้นพอจะกวาดตาอ่านทั้งชุด การบังคับเลือกช่วงก่อนถึงจะเห็นข้อมูลเป็นขั้นตอนเกิน */
  const visibleSeries = series;


  const cellStyle = {
    fontFamily: 'var(--type-family-body)',
    fontSize: 'var(--type-size-sm)',
    color: 'var(--text-content-default, #363B3F)',
    paddingTop: 'var(--dim-space-200)',
    paddingBottom: 'var(--dim-space-200)',
    paddingLeft: 'var(--dim-space-300)',
    paddingRight: 'var(--dim-space-300)',
    borderBottom: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary, #E2F3EB)',
    textAlign: 'left',
    whiteSpace: 'nowrap',
  };

  return (
    <div className='flex flex-col'>
      {/* ถอดการ์ด "ข้อมูลจากเวชระเบียน" ออกจากขั้นนี้ (มติผู้ใช้ 31 ส.ค. 69) —
          ทรงเดียวกับที่งานเยี่ยมบ้านถอดออกเมื่อ 30 ส.ค. 69 · สิทธิการรักษา ·
          แพ้ยา · โรคประจำตัว · ธงต่าง ๆ อ่านได้จากหัวแฟ้มผู้รับบริการด้านบน
          และขั้น "ประวัติการแพ้ / โรคประจำตัว" ซึ่งบันทึกซ้ำได้ด้วย */}

      <VitalsForm
        onValidityChange={onValidityChange}
        /* ToR ๑.๒.๒.๕ — ใช้ตัดสินว่าโชว์ BMI หรือกราฟการเจริญเติบโต */
        patientSex={patient.sex || patient.gender}
        patientAgeYears={parseInt(patient.age, 10) || undefined}
        /* ส่งค่าที่พยาบาลกรอกให้ step "ตรวจสอบข้อมูล" อ่านต่อ */
        onValuesChange={handleVitalsValues}
        /* ช่องบันทึกเพิ่มเติม — ไม่บังคับกรอก จึงไม่ผูกกับ onValidityChange */
        beforeAddRoundSlot={(
          <VoiceTextarea
            label='บันทึกเพิ่มเติม'
            value={note}
            onChange={handleNoteChange}
            placeholder='สิ่งที่การ์ดด้านบนเก็บไม่ได้ เช่น ท่าที่วัด · เหตุที่ค่าผิดปกติ · สิ่งที่ผู้ป่วยบอกระหว่างวัด (ไม่บังคับ)'
            helperText='ไม่บังคับกรอก — กดไมโครโฟนเพื่อพูดแทนการพิมพ์ได้'
            style={{ width: '100%', maxWidth: 'none' }}
          />
        )}
        /* ปุ่มไปอยู่แถวเดียวกับชิปช่วงอายุใน VitalsForm (มติผู้ใช้ 28 ส.ค. 69) —
           เดิมเป็นแถวของตัวเองเหนือฟอร์ม เสียบรรทัดเปล่าไปหนึ่งแถว */
        headerAction={(
          <BrandSubdueButton
            variant='outline'
            size='sm'
            leadingIcon='monitoring'
            onClick={() => setHistoryOpen(true)}
          >
            ดูประวัติสัญญาณชีพ
          </BrandSubdueButton>
        )}
      />

      {/* TOR 1.2.2.4 — ป๊อปอัปประวัติสัญญาณชีพ (แสดงทั้งชุด ไม่มีตัวกรองช่วงเวลา) */}
      <VitalsGraphPopup
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        title='ประวัติสัญญาณชีพ น้ำหนัก และส่วนสูง'
        subtitle={patient.hn ? `HN ${patient.hn}` : undefined}
        showFooter={false}
      >
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-400)' }}>
          {visibleSeries.length === 1 && (
            <div
              className='flex items-center'
              style={{
                gap: 'var(--dim-space-200)',
                paddingTop: 'var(--dim-space-200)',
                paddingBottom: 'var(--dim-space-200)',
                paddingLeft: 'var(--dim-space-300)',
                paddingRight: 'var(--dim-space-300)',
                background: 'var(--surface-alert-info, #F0F6FF)',
                borderRadius: 'var(--dim-radius-300, 10px)',
              }}
            >
              <Icon name='info' size={16} style={{ color: 'var(--text-info-default, #1D4ED8)' }} />
              <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-info-default, #1D4ED8)' }}>
                ผู้ป่วยมีการวัดเพียงครั้งเดียว — แสดงจุดข้อมูลเดียว
              </span>
            </div>
          )}
          <div className='w-full' style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%' }}>
              <thead>
                <tr>
                  {['วันที่', 'อุณหภูมิ (°C)', 'ชีพจร', 'หายใจ', 'ความดัน', 'SpO2 (%)', 'น้ำหนัก (kg)', 'ส่วนสูง (cm)'].map((hcell) => (
                    <th key={hcell} style={{ ...cellStyle, fontWeight: 'var(--type-weight-bold)', color: 'var(--text-content-secondary, #636B72)' }}>{hcell}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleSeries.map((row) => {
                  const rowAlert = ['temp', 'pulse', 'resp', 'sbp', 'spo2'].some((k) => evaluateVital(k, row[k]));
                  return (
                    <tr key={row.date} style={rowAlert ? { background: 'var(--surface-alert-warning, #FFF9F0)' } : undefined}>
                      <td style={{ ...cellStyle, fontWeight: 'var(--type-weight-medium)' }}>{row.date}</td>
                      <td style={cellStyle}>{row.temp}</td>
                      <td style={cellStyle}>{row.pulse}</td>
                      <td style={cellStyle}>{row.resp}</td>
                      <td style={cellStyle}>{row.sbp}/{row.dbp}</td>
                      <td style={cellStyle}>{row.spo2}</td>
                      <td style={cellStyle}>{row.weight}</td>
                      <td style={cellStyle}>{row.height}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </VitalsGraphPopup>
    </div>
  );
};

export default ScreeningStep1;
