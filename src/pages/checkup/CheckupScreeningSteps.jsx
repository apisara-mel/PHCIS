import React from 'react';
import Checkbox from '@/components/checkbox/Checkbox';
import Radio from '@/components/radio/Radio';
import Switch from '@/components/switch/Switch';
import Select from '@/components/forms/Select';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import SelectableTag from '@/components/forms/SelectableTag';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import {
  METABOLIC_CRITERIA, interpretMetabolic,
  CERVICAL_QUESTIONS, TB_QUESTIONS, interpretTb, DENTAL_QUESTIONS,
  MH_2Q, MH_9Q, MH_9Q_SCALE, MH_8Q, MH_ST5, MH_ST5_SCALE,
  is2QComplete, interpret2Q, is9QComplete, score9Q, interpret9Q,
  is8QComplete, score8Q, interpret8Q, isSt5Complete, scoreSt5, interpretSt5,
  AGE_BAND_SCREENINGS, ageBandFor,
  CHECKUP_SCREEN_NOTE_SUGGESTIONS, CHECKUP_IMPRESSION_SUGGESTIONS,
  formatThaiDateTime, getCheckupRight, logConfidentialAccess,
} from '@/data/checkupStore';
import {
  SectionHeader, SubCard, NoticeBar, ConfidentialGate, ReadField, StatTile,
} from '@/pages/checkup/CheckupUi';

/* CheckupScreeningSteps — แบบคัดกรอง 7 แบบ (TOR 1.19.7 + 1.19.13).

   Clinical logic cross-checked against the legacy HCIS manual
   (คู่มือระบบงานส่งเสริมสุขภาพเฉพาะกลุ่มที่สำคัญ §2.16 บันทึกคัดกรองยืนยันความ
   เสี่ยงต่อภาวะกลุ่มโรค metabolic, §2.17 บันทึกแบบประเมินและแบบทดสอบ):

     • Metabolic Syndrome — เข้าเกณฑ์เมื่อมีปัจจัยเสี่ยง ≥ 3 จาก 5 ข้อ
     • วัณโรค            — ไอเกิน 2 สัปดาห์ (หรือไอมีเลือด / CXR ผิดปกติ)
                            = presumptive TB → ส่ง CXR + เสมหะ
     • สุขภาพจิต         — 2Q ตอบ "ใช่" ข้อใดข้อหนึ่ง → เปิด 9Q
                            9Q รวม ≥ 7 → ต้องประเมิน 8Q (เสี่ยงฆ่าตัวตาย)
                            ST-5 ประเมินความเครียดแยกอิสระ
     • HIV               — ข้อมูลลับ §1.4.2: ต้องยืนยัน consent ก่อนเปิด step
                            และการเปิดดูถูกบันทึก access log

   The 2Q/8Q/9Q/ST-5 form pattern is deliberately re-implemented here instead of
   importing src/pages/clinic/mental-health/* — that module is owned by another
   builder in the same wave (playbook §4 file scope). */

const SKIP_LABEL = 'ไม่ได้คัดกรองในครั้งนี้';

/** Skip toggle + mandatory reason (every step is skippable per the TOR). */
export const SkipBar = ({ section, setSection, locked, what }) => {
  const skipped = !!section.skipped;
  return (
    <SubCard tone={skipped ? 'warning' : 'neutral'}>
      <div className='flex items-center flex-wrap w-full' style={{ gap: 'var(--dim-space-300)' }}>
        <Switch
          checked={skipped}
          onChange={(v) => setSection({ skipped: v, skipReason: v ? section.skipReason : '' })}
          disabled={locked}
          aria-label={skipped ? `เปิดการคัดกรอง${what}` : `ข้ามการคัดกรอง${what}`}
        />
        <span className='flex-1 min-w-0' style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm, 14px)' }}>
          {SKIP_LABEL}
          <span style={{ color: 'var(--text-content-tertiary, #858C92)' }}>{` — ${what}`}</span>
        </span>
        {skipped ? <ColorfulBadge style='yellow' size='small' hierarchy='secondary'>ข้ามการคัดกรอง</ColorfulBadge> : null}
      </div>
      {skipped ? (
        <>
          <SuggestibleTextarea
            voice
            label='เหตุผลที่ไม่ได้คัดกรอง'
            required
            value={section.skipReason || ''}
            disabled={locked}
            onChange={(e) => setSection({ skipReason: e?.target ? e.target.value : e })}
            placeholder='เช่น ผู้รับบริการปฏิเสธการคัดกรอง / ไม่เข้าเกณฑ์อายุ'
            suggestions={CHECKUP_SCREEN_NOTE_SUGGESTIONS}
            minChars={2}
            rows={2}
            height={96}
            minHeight={96}
          />
          {!(section.skipReason || '').trim() ? (
            <NoticeBar tone='danger' icon='error'>ต้องระบุเหตุผลเมื่อเลือกไม่คัดกรองในครั้งนี้</NoticeBar>
          ) : null}
        </>
      ) : null}
    </SubCard>
  );
};

const NoteField = ({ value, onChange, locked, label = 'บันทึกเพิ่มเติมของผู้คัดกรอง' }) => (
  <SuggestibleTextarea
    voice
    label={label}
    value={value || ''}
    disabled={locked}
    onChange={(e) => onChange(e?.target ? e.target.value : e)}
    placeholder='เช่น คัดกรองแล้วไม่พบความเสี่ยง · ส่งต่อคลินิกเฉพาะทางเพื่อคัดกรองเพิ่มเติม'
    suggestions={CHECKUP_SCREEN_NOTE_SUGGESTIONS}
    minChars={2}
    rows={2}
    height={96}
    minHeight={96}
  />
);

const YesNoRow = ({ label, value, onChange, locked, name }) => (
  <div className='flex items-center flex-wrap w-full' style={{ gap: 'var(--dim-space-300)' }}>
    <span className='flex-1 min-w-0' style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm, 14px)' }}>
      {label}
    </span>
    <span className='inline-flex items-center' style={{ gap: 'var(--dim-space-400)' }}>
      <Radio name={name} checked={value === true} onChange={() => onChange(true)} disabled={locked} label='ใช่' />
      <Radio name={name} checked={value === false} onChange={() => onChange(false)} disabled={locked} label='ไม่ใช่' />
    </span>
  </div>
);

const ScaleRow = ({ label, value, onChange, locked, scale }) => (
  <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200)' }}>
    <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm, 14px)' }}>{label}</span>
    <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
      {scale.map((s) => (
        <SelectableTag
          key={s.value}
          label={`${s.label} (${s.value})`}
          selected={value === s.value}
          size='sm'
          onClick={locked ? undefined : () => onChange(s.value)}
          ariaLabel={`${label} — ${s.label}`}
        />
      ))}
    </div>
  </div>
);

/* ── Step 1 — Metabolic Syndrome ─────────────────────────────────── */

export const ScreenStep1Metabolic = ({ form, setSection, locked }) => {
  const s = form.metabolic || {};
  const result = interpretMetabolic(s.checked || {});
  return (
    <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-500)' }}>
      <SectionHeader
        icon='monitor_weight'
        title='คัดกรองยืนยันความเสี่ยงต่อภาวะกลุ่มโรค Metabolic'
        subtitle='ติกข้อที่ผู้รับบริการเข้าเกณฑ์ — เข้าเกณฑ์ Metabolic Syndrome เมื่อมีปัจจัยเสี่ยง 3 ข้อขึ้นไปจาก 5 ข้อ'
      />
      <SkipBar section={s} setSection={setSection} locked={locked} what='กลุ่มโรค Metabolic' />
      {!s.skipped ? (
        <>
          <SubCard>
            <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
              {METABOLIC_CRITERIA.map((c) => (
                <Checkbox
                  key={c.key}
                  checked={!!(s.checked || {})[c.key]}
                  disabled={locked}
                  onChange={(v) => setSection({ checked: { ...(s.checked || {}), [c.key]: v } })}
                  label={c.label}
                />
              ))}
            </div>
          </SubCard>
          <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-300)' }}>
            <StatTile label='เข้าเกณฑ์' value={`${result.count}/${result.total}`} unit='ข้อ' tone={result.positive ? 'danger' : 'brand'} icon='rule' />
            <SubCard tone={result.positive ? 'danger' : 'success'} style={{ flex: '1 1 320px' }}>
              <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-300)' }}>
                <ColorfulBadge style={result.badge} size='default' hierarchy='secondary'>{result.label}</ColorfulBadge>
              </div>
              <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm, 14px)' }}>{result.advice}</span>
            </SubCard>
          </div>
          <NoteField value={s.note} onChange={(v) => setSection({ note: v })} locked={locked} />
        </>
      ) : null}
    </div>
  );
};

/* ── Step 2 — cervical cancer ────────────────────────────────────── */

export const ScreenStep2Cervical = ({ form, setSection, locked, visit }) => {
  const s = form.cervical || {};
  const answers = s.answers || {};
  const flags = CERVICAL_QUESTIONS.filter((q) => answers[q.key] === true).length;
  const notFemale = visit?.sex && visit.sex !== 'หญิง';
  return (
    <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-500)' }}>
      <SectionHeader
        icon='female'
        title='คัดกรองมะเร็งปากมดลูก'
        subtitle='แบบคัดกรองความเสี่ยง + บันทึกผล Pap smear (ถ้าตรวจในครั้งนี้)'
      />
      {notFemale ? (
        <NoticeBar tone='info' icon='info'>
          ผู้รับบริการเพศ{visit.sex} — ปกติไม่เข้าเกณฑ์คัดกรองมะเร็งปากมดลูก แนะนำเลือก "ไม่ได้คัดกรองในครั้งนี้" พร้อมระบุเหตุผล
        </NoticeBar>
      ) : null}
      <SkipBar section={s} setSection={setSection} locked={locked} what='มะเร็งปากมดลูก' />
      {!s.skipped ? (
        <>
          <SubCard>
            <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
              {CERVICAL_QUESTIONS.map((q) => (
                <YesNoRow
                  key={q.key}
                  name={`cervical-${q.key}`}
                  label={q.label}
                  value={answers[q.key]}
                  locked={locked}
                  onChange={(v) => setSection({ answers: { ...answers, [q.key]: v } })}
                />
              ))}
            </div>
          </SubCard>
          <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-300)' }}>
            <ColorfulBadge style={flags >= 2 ? 'red' : flags === 1 ? 'yellow' : 'green'} size='default' hierarchy='secondary'>
              {flags >= 2 ? `มีปัจจัยเสี่ยง ${flags} ข้อ — ควรตรวจ Pap smear` : flags === 1 ? 'มีปัจจัยเสี่ยง 1 ข้อ' : 'ไม่พบปัจจัยเสี่ยง'}
            </ColorfulBadge>
          </div>
          <SuggestibleTextarea
            voice
            label='ผลตรวจ Pap smear / การอ่านผลเซลล์วิทยา'
            value={s.papResult || ''}
            disabled={locked}
            onChange={(e) => setSection({ papResult: e?.target ? e.target.value : e })}
            placeholder='เช่น ไม่พบเซลล์ผิดปกติ (Negative for intraepithelial lesion)'
            suggestions={CHECKUP_IMPRESSION_SUGGESTIONS}
            minChars={2}
            rows={2}
            height={96}
            minHeight={96}
          />
          <NoteField value={s.note} onChange={(v) => setSection({ note: v })} locked={locked} />
        </>
      ) : null}
    </div>
  );
};

/* ── Step 3 — tuberculosis ───────────────────────────────────────── */

export const ScreenStep3Tb = ({ form, setSection, locked }) => {
  const s = form.tb || {};
  const answers = s.answers || {};
  const result = interpretTb(answers, s.cxrAbnormal);
  return (
    <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-500)' }}>
      <SectionHeader
        icon='coronavirus'
        title='คัดกรองวัณโรค'
        subtitle='อาการไอเรื้อรังเกิน 2 สัปดาห์ ไอมีเลือดปน หรือผลเอกซเรย์ทรวงอกผิดปกติ = เข้าเกณฑ์สงสัยวัณโรค'
      />
      <SkipBar section={s} setSection={setSection} locked={locked} what='วัณโรค' />
      {!s.skipped ? (
        <>
          <SubCard>
            <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
              {TB_QUESTIONS.map((q) => (
                <Checkbox
                  key={q.key}
                  checked={!!answers[q.key]}
                  disabled={locked}
                  onChange={(v) => setSection({ answers: { ...answers, [q.key]: v } })}
                  label={q.label}
                  description={q.key === 'cough2w' ? 'ข้อบ่งชี้หลักตามแนวทางคัดกรองวัณโรค' : undefined}
                />
              ))}
            </div>
          </SubCard>
          <SubCard>
            <div className='flex items-center flex-wrap w-full' style={{ gap: 'var(--dim-space-300)' }}>
              <Switch
                checked={!!s.cxrAbnormal}
                disabled={locked}
                onChange={(v) => setSection({ cxrAbnormal: v })}
                aria-label='ผลเอกซเรย์ทรวงอกผิดปกติ'
              />
              <span className='flex-1 min-w-0' style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm, 14px)' }}>
                ผลเอกซเรย์ทรวงอก (CXR) ผิดปกติ / สงสัยวัณโรค
              </span>
            </div>
          </SubCard>
          <SubCard tone={result.presumptive ? 'danger' : 'success'}>
            <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-300)' }}>
              <ColorfulBadge style={result.badge} size='default' hierarchy='secondary'>{result.label}</ColorfulBadge>
              <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary, #858C92)' }}>
                {`มีอาการเข้าเกณฑ์ ${result.count}/${TB_QUESTIONS.length} ข้อ`}
              </span>
            </div>
            <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm, 14px)' }}>{result.advice}</span>
          </SubCard>
          <NoteField value={s.note} onChange={(v) => setSection({ note: v })} locked={locked} />
        </>
      ) : null}
    </div>
  );
};

/* ── Step 4 — HIV (confidential §1.4.2) ──────────────────────────── */

export const ScreenStep4Hiv = ({ form, setSection, locked, visit }) => {
  const s = form.hiv || {};
  const allowed = getCheckupRight('viewConfidential');
  const [revealed, setRevealed] = React.useState(false);

  const reveal = () => {
    logConfidentialAccess('แบบคัดกรอง HIV', `${visit?.hn} · ${visit?.name}`);
    setRevealed(true);
  };

  return (
    <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-500)' }}>
      <SectionHeader
        icon='lock'
        title='คัดกรองการติดเชื้อเอชไอวี (HIV)'
        subtitle='ข้อมูลลับตามข้อกำหนด §1.4.2 — ต้องยืนยันความยินยอม (consent) ก่อนบันทึก และการเปิดดูจะถูกบันทึก access log'
        trailing={<ColorfulBadge style='red' size='small' hierarchy='secondary' icon='lock'>ข้อมูลลับ §1.4.2</ColorfulBadge>}
      />

      <ConfidentialGate
        what='แบบคัดกรอง HIV'
        allowed={allowed}
        revealed={revealed}
        onReveal={reveal}
      >
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-500)' }}>
          <SkipBar section={s} setSection={setSection} locked={locked} what='การติดเชื้อเอชไอวี' />
          {!s.skipped ? (
            <>
              <SubCard tone={s.consent ? 'success' : 'warning'}>
                <div className='flex items-start flex-wrap w-full' style={{ gap: 'var(--dim-space-300)' }}>
                  <Checkbox
                    checked={!!s.consent}
                    disabled={locked}
                    onChange={(v) => setSection({ consent: v, consentAt: v ? new Date().toISOString() : '' })}
                    label='ผู้รับบริการยินยอมให้ตรวจและบันทึกผลการคัดกรองเอชไอวี'
                    description='ต้องยืนยันความยินยอมก่อนเปิดช่องบันทึกผล — ระบบบันทึกเวลาที่ยินยอมไว้เป็นหลักฐาน'
                  />
                </div>
                {s.consent && s.consentAt ? (
                  <ReadField label='ยืนยันความยินยอมเมื่อ' value={formatThaiDateTime(s.consentAt)} minWidth={260} />
                ) : null}
              </SubCard>

              {!s.consent ? (
                <NoticeBar tone='warning' icon='lock'>
                  ยังไม่ได้ยืนยันความยินยอม — ช่องบันทึกผลถูกปิดไว้ตามข้อกำหนดข้อมูลลับ §1.4.2
                </NoticeBar>
              ) : (
                <>
                  <SubCard>
                    <SectionHeader icon='science' title='ผลการคัดกรอง' />
                    <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-400)' }}>
                      <Radio name='hiv-result' checked={s.result === 'non-reactive'} disabled={locked} onChange={() => setSection({ result: 'non-reactive' })} label='ลบ (Non-reactive)' />
                      <Radio name='hiv-result' checked={s.result === 'reactive'} disabled={locked} onChange={() => setSection({ result: 'reactive' })} label='บวก (Reactive) — ต้องตรวจยืนยัน' />
                      <Radio name='hiv-result' checked={s.result === 'pending'} disabled={locked} onChange={() => setSection({ result: 'pending' })} label='รอผล' />
                    </div>
                  </SubCard>
                  {s.result === 'reactive' ? (
                    <NoticeBar tone='danger' icon='error'>
                      ผลเบื้องต้นเป็นบวก — ส่งตรวจยืนยันตามแนวทาง และส่งต่อคลินิกโรคติดต่อทางเพศสัมพันธ์และโรคเอดส์
                      พร้อมให้คำปรึกษาแบบเป็นความลับ ผลนี้จะถูกปิดบังในคิวและรายงานกลุ่ม
                    </NoticeBar>
                  ) : null}
                  <NoteField value={s.note} onChange={(v) => setSection({ note: v })} locked={locked} label='บันทึกการให้คำปรึกษา (เป็นความลับ)' />
                </>
              )}
            </>
          ) : null}
        </div>
      </ConfidentialGate>
    </div>
  );
};

/* ── Step 5 — dental ─────────────────────────────────────────────── */

export const ScreenStep5Dental = ({ form, setSection, locked }) => {
  const s = form.dental || {};
  const answers = s.answers || {};
  const found = DENTAL_QUESTIONS.filter((q) => answers[q.key]).length;
  return (
    <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-500)' }}>
      <SectionHeader
        icon='dentistry'
        title='คัดกรองสุขภาพช่องปากและงานทันตกรรม'
        subtitle='ติกสิ่งที่ตรวจพบ — ระบบจะเสนอการส่งต่อคลินิกทันตกรรมเมื่อพบความผิดปกติ'
      />
      <SkipBar section={s} setSection={setSection} locked={locked} what='สุขภาพช่องปาก' />
      {!s.skipped ? (
        <>
          <SubCard>
            <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
              {DENTAL_QUESTIONS.map((q) => (
                <Checkbox
                  key={q.key}
                  checked={!!answers[q.key]}
                  disabled={locked}
                  onChange={(v) => setSection({ answers: { ...answers, [q.key]: v } })}
                  label={q.label}
                />
              ))}
            </div>
          </SubCard>
          <SubCard tone={found > 0 ? 'warning' : 'success'}>
            <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-300)' }}>
              <ColorfulBadge style={found > 0 ? 'yellow' : 'green'} size='default' hierarchy='secondary'>
                {found > 0 ? `พบความผิดปกติ ${found} รายการ` : 'สุขภาพช่องปากปกติ'}
              </ColorfulBadge>
            </div>
            <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm, 14px)' }}>
              {found > 0
                ? 'แนะนำส่งต่อคลินิกทันตกรรมเพื่อรักษาและนัดขูดหินปูน พร้อมให้คำแนะนำการแปรงฟันที่ถูกวิธี'
                : 'แนะนำแปรงฟันวันละ 2 ครั้ง ใช้ไหมขัดฟัน และตรวจสุขภาพช่องปากปีละครั้ง'}
            </span>
          </SubCard>
          <NoteField value={s.note} onChange={(v) => setSection({ note: v })} locked={locked} />
        </>
      ) : null}
    </div>
  );
};

/* ── Step 6 — mental health (2Q → 9Q/8Q + ST-5) ──────────────────── */

export const ScreenStep6Mental = ({ form, setSection, locked, visit }) => {
  const s = form.mental || {};
  const q2 = s.q2 || [];
  const q9 = s.q9 || [];
  const q8 = s.q8 || [];
  const st5 = s.st5 || [];
  const allowed = getCheckupRight('viewConfidential');
  const [revealed, setRevealed] = React.useState(false);

  const i2 = interpret2Q(q2);
  const s9 = score9Q(q9);
  const complete9 = is9QComplete(q9);
  const i9 = interpret9Q(s9);
  const requires8Q = complete9 && i9.requires8Q;
  const s8 = score8Q(q8);
  const complete8 = is8QComplete(q8);
  const i8 = interpret8Q(s8);
  const sSt5 = scoreSt5(st5);
  const completeSt5 = isSt5Complete(st5);
  const iSt5 = interpretSt5(sSt5);

  const setAt = (key) => (idx, value) => {
    const arr = [...(s[key] || [])];
    arr[idx] = value;
    setSection({ [key]: arr });
  };

  const set2 = setAt('q2');
  const set9 = setAt('q9');
  const set8 = setAt('q8');
  const setSt5Answer = setAt('st5');

  const reveal = () => {
    logConfidentialAccess('แบบคัดกรองสุขภาพจิต (2Q/9Q/8Q/ST-5)', `${visit?.hn} · ${visit?.name}`);
    setRevealed(true);
  };

  /* A positive 2Q (or 9Q ≥ 7) makes the record confidential — gate it. */
  const sensitive = i2.positive || (complete9 && s9 >= 7);

  const body = (
    <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-500)' }}>
      <SkipBar section={s} setSection={setSection} locked={locked} what='สุขภาพจิต' />
      {!s.skipped ? (
        <>
          <SubCard>
            <SectionHeader
              icon='psychology'
              title='แบบคัดกรองโรคซึมเศร้า 2 คำถาม (2Q)'
              subtitle='ตอบ "ใช่" ข้อใดข้อหนึ่ง → ต้องทำแบบประเมิน 9Q ต่อ'
            />
            <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
              {MH_2Q.map((label, idx) => (
                <YesNoRow
                  key={label}
                  name={`q2-${idx}`}
                  label={`${idx + 1}. ${label}`}
                  value={q2[idx]}
                  locked={locked}
                  onChange={(v) => set2(idx, v)}
                />
              ))}
            </div>
            {is2QComplete(q2) ? (
              <ColorfulBadge style={i2.badge} size='default' hierarchy='secondary'>{i2.label}</ColorfulBadge>
            ) : (
              <ColorfulBadge style='grey' size='small' hierarchy='secondary'>ยังตอบไม่ครบ 2 ข้อ</ColorfulBadge>
            )}
          </SubCard>

          {i2.positive ? (
            <SubCard>
              <SectionHeader
                icon='assignment'
                title='แบบประเมินโรคซึมเศร้า 9 คำถาม (9Q)'
                subtitle='ให้คะแนนตามความถี่ของอาการใน 2 สัปดาห์ที่ผ่านมา — คะแนนรวม ≥ 7 ต้องประเมิน 8Q ต่อ'
              />
              <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
                {MH_9Q.map((label, idx) => (
                  <ScaleRow
                    key={label}
                    label={`${idx + 1}. ${label}`}
                    value={q9[idx]}
                    locked={locked}
                    scale={MH_9Q_SCALE}
                    onChange={(v) => set9(idx, v)}
                  />
                ))}
              </div>
              <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-300)' }}>
                <StatTile label='คะแนน 9Q' value={s9} unit='คะแนน' tone={s9 >= 13 ? 'danger' : s9 >= 7 ? 'warning' : 'brand'} icon='calculate' />
                {complete9 ? (
                  <SubCard tone={s9 >= 7 ? 'warning' : 'success'} style={{ flex: '1 1 320px' }}>
                    <ColorfulBadge style={i9.badge} size='default' hierarchy='secondary'>{`ระดับ: ${i9.level}`}</ColorfulBadge>
                    <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm, 14px)' }}>{i9.advice}</span>
                  </SubCard>
                ) : (
                  <NoticeBar tone='info' icon='info'>ตอบให้ครบทั้ง 9 ข้อเพื่อให้ระบบแปลผลอัตโนมัติ</NoticeBar>
                )}
              </div>
            </SubCard>
          ) : (
            <NoticeBar tone='neutral' icon='info'>
              2Q ตอบ "ไม่ใช่" ทั้งสองข้อ — ไม่ต้องทำ 9Q / 8Q ตามแนวทาง (ระบบจะเปิดให้อัตโนมัติหากเปลี่ยนคำตอบ)
            </NoticeBar>
          )}

          {requires8Q ? (
            <SubCard tone='warning'>
              <SectionHeader
                icon='warning'
                title='แบบประเมินการฆ่าตัวตาย (8Q)'
                subtitle='บังคับประเมินเมื่อคะแนน 9Q ≥ 7 — คะแนนถ่วงน้ำหนักตามความรุนแรงของแต่ละข้อ'
              />
              <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
                {MH_8Q.map((q, idx) => (
                  <YesNoRow
                    key={q.label}
                    name={`q8-${idx}`}
                    label={`${idx + 1}. ${q.label} (น้ำหนัก ${q.weight})`}
                    value={q8[idx]}
                    locked={locked}
                    onChange={(v) => set8(idx, v)}
                  />
                ))}
              </div>
              <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-300)' }}>
                <StatTile label='คะแนน 8Q' value={s8} unit='คะแนน' tone={s8 >= 17 ? 'danger' : s8 >= 9 ? 'warning' : 'brand'} icon='calculate' />
                {complete8 ? (
                  <SubCard tone={s8 >= 9 ? 'danger' : 'success'} style={{ flex: '1 1 320px' }}>
                    <ColorfulBadge style={i8.badge} size='default' hierarchy='secondary'>{i8.level}</ColorfulBadge>
                    <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm, 14px)' }}>{i8.advice}</span>
                  </SubCard>
                ) : (
                  <NoticeBar tone='danger' icon='error'>คะแนน 9Q ≥ 7 — ต้องตอบแบบประเมิน 8Q ให้ครบทั้ง 8 ข้อ</NoticeBar>
                )}
              </div>
            </SubCard>
          ) : null}

          <SubCard>
            <SectionHeader
              icon='self_improvement'
              title='แบบประเมินความเครียด (ST-5)'
              subtitle='ประเมินความเครียดใน 2–4 สัปดาห์ที่ผ่านมา — คะแนนรวม 0–15'
            />
            <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
              {MH_ST5.map((label, idx) => (
                <ScaleRow
                  key={label}
                  label={`${idx + 1}. ${label}`}
                  value={st5[idx]}
                  locked={locked}
                  scale={MH_ST5_SCALE}
                  onChange={(v) => setSt5Answer(idx, v)}
                />
              ))}
            </div>
            <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-300)' }}>
              <StatTile label='คะแนน ST-5' value={sSt5} unit='คะแนน' tone={sSt5 >= 11 ? 'danger' : sSt5 >= 8 ? 'warning' : 'brand'} icon='calculate' />
              {completeSt5 ? (
                <SubCard tone={sSt5 >= 8 ? 'warning' : 'success'} style={{ flex: '1 1 320px' }}>
                  <ColorfulBadge style={iSt5.badge} size='default' hierarchy='secondary'>{iSt5.level}</ColorfulBadge>
                  <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm, 14px)' }}>{iSt5.advice}</span>
                </SubCard>
              ) : (
                <NoticeBar tone='info' icon='info'>ตอบให้ครบทั้ง 5 ข้อเพื่อให้ระบบแปลผลอัตโนมัติ</NoticeBar>
              )}
            </div>
          </SubCard>

          <NoteField value={s.note} onChange={(v) => setSection({ note: v })} locked={locked} label='บันทึกการให้คำปรึกษาสุขภาพจิต' />
        </>
      ) : null}
    </div>
  );

  return (
    <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-500)' }}>
      <SectionHeader
        icon='psychology'
        title='คัดกรองสุขภาพจิต'
        subtitle='2Q → 9Q/8Q ตามเกณฑ์ พร้อมแบบประเมินความเครียด ST-5 และการแปลผลอัตโนมัติ'
        trailing={sensitive ? <ColorfulBadge style='red' size='small' hierarchy='secondary' icon='lock'>ข้อมูลลับ §1.4.2</ColorfulBadge> : null}
      />
      {sensitive ? (
        <ConfidentialGate
          what='ผลคัดกรองสุขภาพจิตที่เข้าเกณฑ์เสี่ยง'
          allowed={allowed}
          revealed={revealed}
          onReveal={reveal}
        >
          {body}
        </ConfidentialGate>
      ) : body}
    </div>
  );
};

/* ── Step 7 — age-band screening ─────────────────────────────────── */

export const ScreenStep7AgeBand = ({ form, setSection, locked, visit }) => {
  const s = form.ageBand || {};
  const suggested = ageBandFor(visit?.age ?? 40);
  const bandKey = s.bandKey || suggested.key;
  const band = AGE_BAND_SCREENINGS.find((b) => b.key === bandKey) || suggested;
  const done = s.done || {};
  const completed = band.items.filter((i) => done[i]).length;

  return (
    <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-500)' }}>
      <SectionHeader
        icon='diversity_3'
        title='คัดกรองตามกลุ่มวัย'
        subtitle={`ระบบเสนอชุดคัดกรองตามอายุผู้รับบริการ (${visit?.age ?? '—'} ปี → ${suggested.label}) — เลือกกลุ่มวัยอื่นได้ตามดุลพินิจ`}
      />
      <SkipBar section={s} setSection={setSection} locked={locked} what='ตามกลุ่มวัย' />
      {!s.skipped ? (
        <>
          <Select
            label='ชุดคัดกรองตามกลุ่มวัย'
            showHelperText={false}
            showLeadingIcon={false}
            size='md'
            disabled={locked}
            options={AGE_BAND_SCREENINGS.map((b) => ({ value: b.key, label: b.label }))}
            value={bandKey}
            onChange={(v) => setSection({ bandKey: typeof v === 'string' ? v : v?.value, done: {} })}
          />
          <SubCard>
            <SectionHeader icon='checklist' title={`รายการคัดกรอง — ${band.label}`} subtitle={`ทำแล้ว ${completed}/${band.items.length} รายการ`} />
            <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
              {band.items.map((item) => (
                <Checkbox
                  key={item}
                  checked={!!done[item]}
                  disabled={locked}
                  onChange={(v) => setSection({ done: { ...done, [item]: v } })}
                  label={item}
                />
              ))}
            </div>
          </SubCard>
          <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-300)' }}>
            <StatTile label='คัดกรองครบ' value={`${completed}/${band.items.length}`} unit='รายการ' tone={completed === band.items.length ? 'brand' : 'warning'} icon='task_alt' />
            {bandKey !== suggested.key ? (
              <NoticeBar tone='warning' icon='warning'>
                {`ชุดที่เลือก (${band.label}) ไม่ตรงกับกลุ่มวัยตามอายุผู้รับบริการ (${suggested.label}) — ระบุเหตุผลในบันทึกเพิ่มเติม`}
              </NoticeBar>
            ) : null}
          </div>
          <NoteField value={s.note} onChange={(v) => setSection({ note: v })} locked={locked} />
        </>
      ) : null}
    </div>
  );
};

export const CHECKUP_SCREENING_STEPS = [
  { title: 'Metabolic Syndrome', subtitle: 'กลุ่มโรคเมตาบอลิก', key: 'metabolic' },
  { title: 'มะเร็งปากมดลูก', subtitle: 'Cervical cancer', key: 'cervical' },
  { title: 'วัณโรค', subtitle: 'Tuberculosis', key: 'tb' },
  { title: 'เอชไอวี (ข้อมูลลับ)', subtitle: 'HIV · §1.4.2', key: 'hiv' },
  { title: 'ทันตกรรม', subtitle: 'Oral health', key: 'dental' },
  { title: 'สุขภาพจิต', subtitle: '2Q / 9Q / 8Q / ST-5', key: 'mental' },
  { title: 'ตามกลุ่มวัย', subtitle: 'Age-band', key: 'ageBand' },
];

export const CHECKUP_SCREENING_RENDERERS = [
  ScreenStep1Metabolic, ScreenStep2Cervical, ScreenStep3Tb, ScreenStep4Hiv,
  ScreenStep5Dental, ScreenStep6Mental, ScreenStep7AgeBand,
];

/** A step counts as done when it is filled in OR explicitly skipped w/ reason. */
export const getScreeningCompletedSteps = (form, stepIndex) => {
  const done = [];
  const filled = (key, predicate) => {
    const s = form[key] || {};
    if (s.skipped) return !!(s.skipReason || '').trim();
    return predicate(s);
  };
  if (filled('metabolic', (s) => Object.keys(s.checked || {}).length > 0)) done.push(0);
  if (filled('cervical', (s) => Object.keys(s.answers || {}).length > 0)) done.push(1);
  if (filled('tb', (s) => Object.keys(s.answers || {}).length > 0 || s.cxrAbnormal)) done.push(2);
  if (filled('hiv', (s) => !!s.result)) done.push(3);
  if (filled('dental', (s) => Object.keys(s.answers || {}).length > 0)) done.push(4);
  if (filled('mental', (s) => is2QComplete(s.q2))) done.push(5);
  if (filled('ageBand', (s) => Object.values(s.done || {}).some(Boolean))) done.push(6);
  return done.filter((i) => i !== stepIndex);
};

/** Blocking validation per step (shown before advancing / saving). */
export const validateScreeningStep = (form, stepIndex) => {
  const key = CHECKUP_SCREENING_STEPS[stepIndex].key;
  const s = form[key] || {};
  if (s.skipped && !(s.skipReason || '').trim()) {
    return 'ต้องระบุเหตุผลเมื่อเลือกไม่คัดกรองในครั้งนี้';
  }
  if (key === 'hiv' && !s.skipped && s.result && !s.consent) {
    return 'ต้องยืนยันความยินยอมของผู้รับบริการก่อนบันทึกผลคัดกรองเอชไอวี';
  }
  if (key === 'mental' && !s.skipped) {
    const i2 = interpret2Q(s.q2 || []);
    const complete9 = is9QComplete(s.q9 || []);
    if (i2.positive && complete9 && score9Q(s.q9) >= 7 && !is8QComplete(s.q8 || [])) {
      return 'คะแนน 9Q ≥ 7 — ต้องประเมินแบบ 8Q ให้ครบก่อนบันทึก';
    }
  }
  return null;
};

/** One-line summary per step for the group panel + daily report. */
export const summariseScreening = (form) => {
  const out = [];
  const m = form.metabolic || {};
  if (!m.skipped && Object.keys(m.checked || {}).length) out.push(`Metabolic ${interpretMetabolic(m.checked).count}/5`);
  const c = form.cervical || {};
  if (!c.skipped && Object.keys(c.answers || {}).length) out.push('มะเร็งปากมดลูก');
  const t = form.tb || {};
  if (!t.skipped && (Object.keys(t.answers || {}).length || t.cxrAbnormal)) out.push(interpretTb(t.answers, t.cxrAbnormal).presumptive ? 'วัณโรค: สงสัย' : 'วัณโรค: ไม่เข้าเกณฑ์');
  const h = form.hiv || {};
  if (!h.skipped && h.result) out.push('HIV (ปิดบัง)');
  const d = form.dental || {};
  if (!d.skipped && Object.keys(d.answers || {}).length) out.push('ทันตกรรม');
  const mh = form.mental || {};
  if (!mh.skipped && is2QComplete(mh.q2 || [])) {
    const parts = [`2Q ${interpret2Q(mh.q2).positive ? 'บวก' : 'ลบ'}`];
    if (is9QComplete(mh.q9 || [])) parts.push(`9Q ${score9Q(mh.q9)}`);
    if (is8QComplete(mh.q8 || [])) parts.push(`8Q ${score8Q(mh.q8)}`);
    if (isSt5Complete(mh.st5 || [])) parts.push(`ST-5 ${scoreSt5(mh.st5)}`);
    out.push(parts.join(' · '));
  }
  const ab = form.ageBand || {};
  if (!ab.skipped && Object.values(ab.done || {}).some(Boolean)) out.push('ตามกลุ่มวัย');
  return out;
};
