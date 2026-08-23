import React, { useState } from 'react';
import Icon from '@/components/icons/Icon';
import InputField from '@/components/forms/InputField';
import Select from '@/components/forms/Select';
import DatePicker from '@/components/forms/DatePicker';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import SelectableTag from '@/components/forms/SelectableTag';
import Checkbox from '@/components/checkbox/Checkbox';
import BrandDashedAddButton from '@/components/button/BrandDashedAddButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import {
  SwField, SwBanner, SwAuditLine, toLocalIso,
} from '@/pages/clinic/social-work/SocialWorkShared';
import {
  SW_CURRENT_USER,
  SW_WORKERS,
  SW_MAX_SECONDARY_PROBLEMS as SW_MAX_SECONDARY,
  SW_FUND_TYPES,
  SW_SERVICE_CATEGORIES,
  SW_CONTACT_CHANNELS,
  SW_CHILD_RISK_ITEMS,
  SW_VIOLENCE_TYPES,
  SW_VIOLENCE_ITEMS,
  SW_DISABILITY_TYPES,
  SW_DISABILITY_CARD_STATUS,
  SW_2Q_ITEMS,
  SW_PLAN_SUGGESTIONS,
  SW_EVALUATION_SUGGESTIONS,
  SW_SAFETY_PLAN_SUGGESTIONS,
  SW_DIAGNOSIS_SUGGESTIONS,
  SW_ASSESSMENT_SUGGESTIONS,
  SW_ADVICE_SUGGESTIONS,
  SW_FOLLOWUP_SUGGESTIONS,
  SW_TERMINATION_SUGGESTIONS,
  interpretChildRisk,
  interpretViolence,
  interpret2Q,
  resolveSwContactChannel,
  formatBaht,
  formatSwDate,
  formatSwDateTime,
  todayIso,
} from '@/data/socialWorkClinic';
import {
  SW_PROBLEM_CATEGORY_OPTIONS, SW_PROBLEM_SEVERITIES,
  swProblemSubOptions, resolveSwProblemCodeLabel,
} from '@/data/socialWorkProblems';
import {
  SW_BARTHEL_ITEMS, SW_BARTHEL_MAX, isBarthelComplete, scoreBarthel, interpretBarthel,
  SW_MATERIAL_OPTIONS, findSwMaterial,
} from '@/data/socialWorkSupplies';

/* SocialWorkSubFormPanels — เนื้อของ Pop-up "แบบย่อย 10 ชุด" ของแบบบันทึก
   ผู้ใช้บริการสังคมสงเคราะห์ (ส.ส.2) ตามมติ คทง.10 ครั้งที่ 3 ข้อ 2:
   เลิกบังคับเดิน step ยาว → หน้าเดียว (Intake + Fact Finding) แล้วเปิดหัวข้อ
   ย่อยเป็นปุ่ม Pop-up ที่ "แก้ไขได้ตลอดการลงข้อมูล".

   สัญญาของทุก panel เหมือนกัน:
     props = { value, onChange, locked, form, cardPatient }
     • `value`     — ออบเจ็กต์ของแบบย่อยชุดนั้น (form.subForms[key])
     • `onChange`  — (patch) => void  merge ลงในออบเจ็กต์เดียวกัน
     • `locked`    — อ่านอย่างเดียว (เคสยุติแล้ว / บันทึกแล้ว / สิทธิไม่พอ)
   การบันทึก · ยกเลิก · เตือนข้อมูลค้าง อยู่ที่ตัว Popup ในหน้า FormPage
   ทุก panel แสดง SwAuditLine ของตัวเอง (ผู้บันทึก + เวลา + เวลาแก้ไข). */

const Row = ({ children }) => (
  <div className='flex w-full flex-wrap' style={{ gap: 'var(--dim-space-400, 16px)' }}>{children}</div>
);

const Stack = ({ children, gap = 'var(--dim-space-400, 16px)' }) => (
  <div className='flex flex-col w-full' style={{ gap }}>{children}</div>
);

const PanelAudit = ({ value }) => (
  <SwAuditLine
    by={value?.savedBy || SW_CURRENT_USER}
    at={value?.savedAt}
    label={value?.savedAt ? 'บันทึกโดย' : 'จะบันทึกโดย'}
    formatDateTime={formatSwDateTime}
    extra={value?.editedAt ? `แก้ไขล่าสุด ${formatSwDateTime(value.editedAt)}` : undefined}
  />
);

const Chip = ({ children, tone = 'grey' }) => (
  <ColorfulBadge style={tone} size='small' hierarchy='secondary'>{children}</ColorfulBadge>
);

/* ── ① ประเมินและวินิจฉัยทางสังคม ─────────────────────────────────── */
const DiagnosisPanel = ({ value, onChange, locked }) => {
  const v = value || {};
  const secondary = v.secondaryProblems || [];

  const setSecondary = (idx, patch) => {
    const next = secondary.map((s, i) => (i === idx ? { ...s, ...patch } : s));
    onChange({ secondaryProblems: next });
  };

  const addSecondary = () => {
    if (secondary.length >= SW_MAX_SECONDARY) return;
    onChange({ secondaryProblems: [...secondary, { category: '', code: '', severity: '' }] });
  };

  return (
    <Stack>
      <SwBanner tone='neutral' icon='info'>
        บันทึกปัญหาหลัก 1 ข้อ และปัญหาร่วมไม่เกิน {SW_MAX_SECONDARY} ข้อ —
        แยกกล่องกันตามมติ คทง.10 ครั้งที่ 3 เลือกหัวข้อหลัก (หมวด 01–17)
        แล้วจึงเลือกหัวข้อย่อยที่เป็นรหัส 4 หลัก
      </SwBanner>

      {/* ── กล่องปัญหาหลัก ── */}
      <div
        className='flex flex-col w-full'
        style={{
          gap: 'var(--dim-space-300, 12px)',
          paddingTop: 'var(--dim-space-400, 16px)',
          paddingBottom: 'var(--dim-space-400, 16px)',
          paddingLeft: 'var(--dim-space-400, 16px)',
          paddingRight: 'var(--dim-space-400, 16px)',
          borderRadius: 'var(--dim-radius-300, 10px)',
          border: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary, #E2F3EB)',
          background: 'var(--surface-brandPrimary-quaternary, #F4FBF8)',
        }}
      >
        <div className='flex items-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          <Icon name='flag' size={18} />
          <span style={{ fontSize: 'var(--type-size-sm)', fontWeight: 'var(--type-weight-bold)' }}>
            ปัญหาหลัก (Diagnosis 1)
          </span>
          {v.primaryProblem && <Chip tone='teal'>{v.primaryProblem}</Chip>}
        </div>
        <Row>
          <SwField label='หัวข้อหลัก (หมวด 01–17)' required minWidth={300}>
            <Select
              showLabel={false}
              searchable
              size='lg'
              disabled={locked}
              value={v.primaryCategory || ''}
              onChange={(c) => onChange({ primaryCategory: c, primaryProblem: '' })}
              options={SW_PROBLEM_CATEGORY_OPTIONS}
              placeholder='เลือกหมวดปัญหา'
            />
          </SwField>
          <SwField
            label='หัวข้อย่อย (รหัส 4 หลัก)'
            required
            minWidth={360}
            hint={!v.primaryCategory ? 'เลือกหัวข้อหลักก่อน' : undefined}
          >
            <Select
              showLabel={false}
              searchable
              size='lg'
              disabled={locked || !v.primaryCategory}
              value={v.primaryProblem || ''}
              onChange={(code) => onChange({ primaryProblem: code })}
              options={swProblemSubOptions(v.primaryCategory)}
              placeholder='ค้นหา/เลือกหัวข้อย่อย'
            />
          </SwField>
          <SwField label='ระดับความรุนแรง' minWidth={280}>
            <Select
              showLabel={false}
              searchable={false}
              size='lg'
              disabled={locked}
              value={v.primarySeverity || ''}
              onChange={(s) => onChange({ primarySeverity: s })}
              options={SW_PROBLEM_SEVERITIES}
              placeholder='เลือกระดับความรุนแรง'
            />
          </SwField>
        </Row>
      </div>

      {/* ── กล่องปัญหาร่วม ── */}
      <div
        className='flex flex-col w-full'
        style={{
          gap: 'var(--dim-space-300, 12px)',
          paddingTop: 'var(--dim-space-400, 16px)',
          paddingBottom: 'var(--dim-space-400, 16px)',
          paddingLeft: 'var(--dim-space-400, 16px)',
          paddingRight: 'var(--dim-space-400, 16px)',
          borderRadius: 'var(--dim-radius-300, 10px)',
          border: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary, #EEF0F1)',
          background: 'var(--surface-card-quaternary, #F9FBFB)',
        }}
      >
        <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          <Icon name='library_add_check' size={18} />
          <span style={{ fontSize: 'var(--type-size-sm)', fontWeight: 'var(--type-weight-bold)' }}>
            {`ปัญหาร่วม (Diagnosis 2–4) — เลือกได้ไม่เกิน ${SW_MAX_SECONDARY} ข้อ`}
          </span>
          <div className='flex-1' />
          <Chip>{`${secondary.length}/${SW_MAX_SECONDARY}`}</Chip>
        </div>

        {secondary.length === 0 && (
          <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-tertiary, #858C92)' }}>
            ยังไม่ได้ระบุปัญหาร่วม — ไม่บังคับกรอก
          </span>
        )}

        {secondary.map((s, idx) => (
          <Row key={`sec-${idx}`}>
            <SwField label={`ปัญหาร่วมที่ ${idx + 1} — หัวข้อหลัก`} minWidth={280}>
              <Select
                showLabel={false}
                searchable
                size='lg'
                disabled={locked}
                value={s.category || ''}
                onChange={(c) => setSecondary(idx, { category: c, code: '' })}
                options={SW_PROBLEM_CATEGORY_OPTIONS}
                placeholder='เลือกหมวดปัญหา'
              />
            </SwField>
            <SwField label='หัวข้อย่อย (รหัส 4 หลัก)' minWidth={320}>
              <Select
                showLabel={false}
                searchable
                size='lg'
                disabled={locked || !s.category}
                value={s.code || ''}
                onChange={(code) => setSecondary(idx, { code })}
                options={swProblemSubOptions(s.category)}
                placeholder='ค้นหา/เลือกหัวข้อย่อย'
              />
            </SwField>
            <SwField label='ระดับความรุนแรง' minWidth={240}>
              <Select
                showLabel={false}
                searchable={false}
                size='lg'
                disabled={locked}
                value={s.severity || ''}
                onChange={(sev) => setSecondary(idx, { severity: sev })}
                options={SW_PROBLEM_SEVERITIES}
                placeholder='เลือกระดับ'
              />
            </SwField>
            <SwField label=' ' minWidth={120} grow={false}>
              <NeutralSubdueButton
                size='sm'
                leadingIcon='delete'
                disabled={locked}
                onClick={() => onChange({ secondaryProblems: secondary.filter((_, i) => i !== idx) })}
              >
                นำออก
              </NeutralSubdueButton>
            </SwField>
          </Row>
        ))}

        {!locked && secondary.length < SW_MAX_SECONDARY && (
          <BrandDashedAddButton onClick={addSecondary}>เพิ่มปัญหาร่วม</BrandDashedAddButton>
        )}
      </div>

      <SwField label='บันทึกการวินิจฉัยทางสังคม (Social Diagnosis)' required>
        <SuggestibleTextarea
          voice
          disabled={locked}
          value={v.socialDiagnosis || ''}
          onChange={(e) => onChange({ socialDiagnosis: e.target.value })}
          suggestions={SW_DIAGNOSIS_SUGGESTIONS}
          minChars={3}
          placeholder='สรุปการวินิจฉัยทางสังคมจากข้อเท็จจริงที่ค้นพบ'
        />
      </SwField>

      <SwField label='บันทึกประเมินผู้รับบริการ (Assessment)'>
        <SuggestibleTextarea
          voice
          disabled={locked}
          value={v.socialAssessment || ''}
          onChange={(e) => onChange({ socialAssessment: e.target.value })}
          suggestions={SW_ASSESSMENT_SUGGESTIONS}
          minChars={3}
          placeholder='ศักยภาพ ทรัพยากร และความต้องการของผู้รับบริการและครอบครัว'
        />
      </SwField>

      <PanelAudit value={v} />
    </Stack>
  );
};

/* ── ② วางแผนการช่วยเหลือ ─────────────────────────────────────────── */
const PlanPanel = ({ value, onChange, locked }) => {
  const v = value || {};
  const goals = v.goals || [];
  const [draft, setDraft] = useState({ goal: '', due: '', owner: '' });

  const addGoal = () => {
    if (!draft.goal.trim()) return;
    onChange({ goals: [...goals, { ...draft, goal: draft.goal.trim() }] });
    setDraft({ goal: '', due: '', owner: '' });
  };

  return (
    <Stack>
      <SwBanner tone='neutral' icon='checklist'>
        วางแผนการช่วยเหลือเป็นรายเป้าหมาย พร้อมกำหนดวันที่คาดว่าจะบรรลุและผู้รับผิดชอบ
        — แก้ไขเพิ่มเติมได้ตลอดการลงข้อมูล
      </SwBanner>

      {goals.length === 0 ? (
        <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-tertiary, #858C92)' }}>
          ยังไม่มีเป้าหมายในแผนการช่วยเหลือ
        </span>
      ) : (
        <Stack gap='var(--dim-space-200, 8px)'>
          {goals.map((g, i) => (
            <div
              key={`goal-${i}`}
              className='flex items-center w-full flex-wrap'
              style={{
                gap: 'var(--dim-space-200, 8px)',
                paddingTop: 'var(--dim-space-250, 10px)',
                paddingBottom: 'var(--dim-space-250, 10px)',
                paddingLeft: 'var(--dim-space-300, 12px)',
                paddingRight: 'var(--dim-space-300, 12px)',
                borderRadius: 'var(--dim-radius-200, 8px)',
                background: 'var(--surface-card-quaternary, #F9FBFB)',
                border: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary, #EEF0F1)',
                fontSize: 'var(--type-size-sm)',
              }}
            >
              <Icon name='flag' size={16} />
              <span className='min-w-0'>{g.goal}</span>
              <div className='flex-1' />
              {g.due && <Chip tone='yellow'>{`ภายใน ${formatSwDate(g.due)}`}</Chip>}
              {g.owner && <Chip>{g.owner}</Chip>}
              {!locked && (
                <NeutralSubdueButton
                  size='sm'
                  leadingIcon='delete'
                  onClick={() => onChange({ goals: goals.filter((_, idx) => idx !== i) })}
                >
                  นำออก
                </NeutralSubdueButton>
              )}
            </div>
          ))}
        </Stack>
      )}

      {!locked && (
        <Row>
          <SwField label='เป้าหมาย / กิจกรรมที่จะช่วยเหลือ' minWidth={320}>
            <InputField
              value={draft.goal}
              onChange={(val) => setDraft((d) => ({ ...d, goal: val }))}
              placeholder='เช่น ประสานเงินสงเคราะห์ครอบครัวจากสำนักงานเขต'
              showHelperText={false}
            />
          </SwField>
          <SwField label='กำหนดแล้วเสร็จ' minWidth={200}>
            <DatePicker
              showLabel={false}
              value={draft.due ? new Date(draft.due) : null}
              onChange={(d) => setDraft((x) => ({ ...x, due: d ? toLocalIso(d) : '' }))}
              placeholder='เลือกวันที่'
            />
          </SwField>
          <SwField label='ผู้รับผิดชอบ' minWidth={240}>
            <Select
              showLabel={false}
              searchable
              size='lg'
              value={draft.owner}
              onChange={(val) => setDraft((d) => ({ ...d, owner: val }))}
              options={SW_WORKERS.map((w) => ({ value: w, label: w }))}
              placeholder='เลือกผู้รับผิดชอบ'
            />
          </SwField>
          <SwField label=' ' minWidth={180} grow={false}>
            <BrandDashedAddButton onClick={addGoal}>เพิ่มเป้าหมาย</BrandDashedAddButton>
          </SwField>
        </Row>
      )}

      <SwField label='รายละเอียดแผนการช่วยเหลือ'>
        <SuggestibleTextarea
          voice
          disabled={locked}
          value={v.planNote || ''}
          onChange={(e) => onChange({ planNote: e.target.value })}
          suggestions={SW_PLAN_SUGGESTIONS}
          minChars={3}
          placeholder='อธิบายแนวทาง ระยะเวลา และหน่วยงานที่จะประสานในการช่วยเหลือ'
        />
      </SwField>

      <PanelAudit value={v} />
    </Stack>
  );
};

/* ── ③ Intervention (บริการ · เงินสนับสนุน · วัสดุ) ───────────────── */
const InterventionPanel = ({ value, onChange, locked }) => {
  const v = value || {};
  const services = v.services || {};
  const funds = v.funds || [];
  const materials = v.materials || [];
  const [fundDraft, setFundDraft] = useState({ type: '', amount: '', date: todayIso(), note: '' });
  const [matDraft, setMatDraft] = useState({ code: '', qty: '', note: '' });

  const toggleService = (catKey, item) => {
    const picked = services[catKey] || [];
    const next = picked.includes(item) ? picked.filter((i) => i !== item) : [...picked, item];
    onChange({ services: { ...services, [catKey]: next } });
  };

  const fundMeta = SW_FUND_TYPES.find((f) => f.value === fundDraft.type);
  const overCeiling = fundMeta && Number(fundDraft.amount) > fundMeta.ceiling;

  const addFund = () => {
    if (!fundDraft.type || !Number(fundDraft.amount)) return;
    onChange({ funds: [...funds, { ...fundDraft, amount: Number(fundDraft.amount) }] });
    setFundDraft({ type: '', amount: '', date: todayIso(), note: '' });
  };

  const addMaterial = () => {
    if (!matDraft.code || !Number(matDraft.qty)) return;
    onChange({ materials: [...materials, { ...matDraft, qty: Number(matDraft.qty) }] });
    setMatDraft({ code: '', qty: '', note: '' });
  };

  return (
    <Stack>
      <SwBanner tone='neutral' icon='volunteer_activism'>
        บันทึกกิจกรรมการช่วยเหลือที่ดำเนินการจริง — เชื่อมกับเงินสนับสนุนและวัสดุ
        เพื่อให้รายงาน Workload (ส.ส.5) และรายงานวัสดุนับได้ตรงกัน
      </SwBanner>

      {SW_SERVICE_CATEGORIES.map((cat) => (
        <SwField key={cat.key} label={cat.label}>
          <div className='flex flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
            {cat.items.map((item) => (
              <SelectableTag
                key={item}
                label={item}
                size='md'
                selected={(services[cat.key] || []).includes(item)}
                onClick={() => !locked && toggleService(cat.key, item)}
              />
            ))}
          </div>
        </SwField>
      ))}

      {/* เงินสนับสนุน */}
      <SwField label='เงินสนับสนุนที่ให้การช่วยเหลือ'>
        <Stack gap='var(--dim-space-200, 8px)'>
          {funds.map((f, i) => (
            <div
              key={`fund-${i}`}
              className='flex items-center w-full flex-wrap'
              style={{
                gap: 'var(--dim-space-200, 8px)',
                paddingTop: 'var(--dim-space-250, 10px)',
                paddingBottom: 'var(--dim-space-250, 10px)',
                paddingLeft: 'var(--dim-space-300, 12px)',
                paddingRight: 'var(--dim-space-300, 12px)',
                borderRadius: 'var(--dim-radius-200, 8px)',
                background: 'var(--surface-card-quaternary, #F9FBFB)',
                fontSize: 'var(--type-size-sm)',
              }}
            >
              <Icon name='payments' size={16} />
              <span>{SW_FUND_TYPES.find((t) => t.value === f.type)?.label || f.type}</span>
              <Chip tone='teal'>{formatBaht(f.amount)}</Chip>
              {f.date && <Chip>{formatSwDate(f.date)}</Chip>}
              <span className='min-w-0' style={{ color: 'var(--text-content-secondary, #636B72)' }}>{f.note}</span>
              <div className='flex-1' />
              {!locked && (
                <NeutralSubdueButton size='sm' leadingIcon='delete' onClick={() => onChange({ funds: funds.filter((_, idx) => idx !== i) })}>
                  นำออก
                </NeutralSubdueButton>
              )}
            </div>
          ))}
          {!locked && (
            <Row>
              <SwField label='ประเภทเงินสนับสนุน' minWidth={240}>
                <Select
                  showLabel={false}
                  searchable={false}
                  size='lg'
                  value={fundDraft.type}
                  onChange={(val) => setFundDraft((d) => ({ ...d, type: val }))}
                  options={SW_FUND_TYPES.map((f) => ({ value: f.value, label: `${f.label} (เพดาน ${formatBaht(f.ceiling)})` }))}
                  placeholder='เลือกประเภท'
                />
              </SwField>
              <SwField
                label='จำนวนเงิน (บาท)'
                minWidth={180}
                hint={overCeiling ? `เกินเพดาน ${formatBaht(fundMeta.ceiling)} — ต้องขออนุมัติเพิ่มเติม` : undefined}
                hintTone={overCeiling ? 'error' : undefined}
              >
                <InputField
                  type='number'
                  value={fundDraft.amount}
                  onChange={(val) => setFundDraft((d) => ({ ...d, amount: val }))}
                  placeholder='เช่น 3000'
                  error={!!overCeiling}
                  showHelperText={false}
                />
              </SwField>
              <SwField label='วันที่' minWidth={180}>
                <DatePicker
                  showLabel={false}
                  value={fundDraft.date ? new Date(fundDraft.date) : null}
                  onChange={(d) => setFundDraft((x) => ({ ...x, date: d ? toLocalIso(d) : '' }))}
                  placeholder='เลือกวันที่'
                />
              </SwField>
              <SwField label='หมายเหตุ' minWidth={240}>
                <InputField
                  value={fundDraft.note}
                  onChange={(val) => setFundDraft((d) => ({ ...d, note: val }))}
                  placeholder='ระบุวัตถุประสงค์'
                  showHelperText={false}
                />
              </SwField>
              <SwField label=' ' minWidth={160} grow={false}>
                <BrandDashedAddButton onClick={addFund}>เพิ่มรายการ</BrandDashedAddButton>
              </SwField>
            </Row>
          )}
        </Stack>
      </SwField>

      {/* วัสดุและกายอุปกรณ์ */}
      <SwField label='วัสดุและกายอุปกรณ์ที่ขอรับ'>
        <Stack gap='var(--dim-space-200, 8px)'>
          {materials.map((m, i) => (
            <div
              key={`mat-${i}`}
              className='flex items-center w-full flex-wrap'
              style={{
                gap: 'var(--dim-space-200, 8px)',
                paddingTop: 'var(--dim-space-250, 10px)',
                paddingBottom: 'var(--dim-space-250, 10px)',
                paddingLeft: 'var(--dim-space-300, 12px)',
                paddingRight: 'var(--dim-space-300, 12px)',
                borderRadius: 'var(--dim-radius-200, 8px)',
                background: 'var(--surface-card-quaternary, #F9FBFB)',
                fontSize: 'var(--type-size-sm)',
              }}
            >
              <Icon name='inventory_2' size={16} />
              <span>{findSwMaterial(m.code)?.name || m.code}</span>
              <Chip tone='teal'>{`${m.qty} ${findSwMaterial(m.code)?.unit || ''}`}</Chip>
              <span className='min-w-0' style={{ color: 'var(--text-content-secondary, #636B72)' }}>{m.note}</span>
              <div className='flex-1' />
              {!locked && (
                <NeutralSubdueButton size='sm' leadingIcon='delete' onClick={() => onChange({ materials: materials.filter((_, idx) => idx !== i) })}>
                  นำออก
                </NeutralSubdueButton>
              )}
            </div>
          ))}
          {!locked && (
            <Row>
              <SwField label='รายการวัสดุ' minWidth={320}>
                <Select
                  showLabel={false}
                  searchable
                  size='lg'
                  value={matDraft.code}
                  onChange={(val) => setMatDraft((d) => ({ ...d, code: val }))}
                  options={SW_MATERIAL_OPTIONS}
                  placeholder='เลือกวัสดุจากคลังงานสังคมสงเคราะห์'
                />
              </SwField>
              <SwField label='จำนวน' minWidth={140}>
                <InputField
                  type='number'
                  value={matDraft.qty}
                  onChange={(val) => setMatDraft((d) => ({ ...d, qty: val }))}
                  placeholder='เช่น 4'
                  showHelperText={false}
                />
              </SwField>
              <SwField label='หมายเหตุ' minWidth={240}>
                <InputField
                  value={matDraft.note}
                  onChange={(val) => setMatDraft((d) => ({ ...d, note: val }))}
                  placeholder='เช่น จ่ายรอบเดือนสิงหาคม'
                  showHelperText={false}
                />
              </SwField>
              <SwField label=' ' minWidth={160} grow={false}>
                <BrandDashedAddButton onClick={addMaterial}>เพิ่มรายการ</BrandDashedAddButton>
              </SwField>
            </Row>
          )}
        </Stack>
      </SwField>

      <SwField label='คำแนะนำที่ให้ผู้รับบริการ'>
        <SuggestibleTextarea
          voice
          disabled={locked}
          value={v.adviceNote || ''}
          onChange={(e) => onChange({ adviceNote: e.target.value })}
          suggestions={SW_ADVICE_SUGGESTIONS}
          minChars={3}
          placeholder='คำแนะนำและข้อตกลงที่ให้กับผู้รับบริการและครอบครัว'
        />
      </SwField>

      <PanelAudit value={v} />
    </Stack>
  );
};

/* ── ④ Follow-up & Evaluation ─────────────────────────────────────── */
const FollowUpPanel = ({ value, onChange, locked }) => {
  const v = value || {};
  const entries = v.followUps || [];
  const [draft, setDraft] = useState({ date: todayIso(), channel: 'center', reached: true, result: '' });

  const addEntry = () => {
    if (!draft.result.trim()) return;
    onChange({
      followUps: [...entries, { ...draft, result: draft.result.trim(), by: SW_CURRENT_USER, at: new Date().toISOString() }],
    });
    setDraft({ date: todayIso(), channel: 'center', reached: true, result: '' });
  };

  return (
    <Stack>
      <SwBanner tone='neutral' icon='event_repeat'>
        ช่องทางการติดตามใช้นิยามใหม่ตามมติ คทง.10 ครั้งที่ 3 ข้อ 7 —
        ศูนย์บริการสาธารณสุข / โทรติดตาม / ประสาน อสส.
      </SwBanner>

      {entries.length === 0 ? (
        <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-tertiary, #858C92)' }}>
          ยังไม่มีการติดตามผลในเคสนี้
        </span>
      ) : (
        <Stack gap='var(--dim-space-200, 8px)'>
          {entries.map((f, i) => (
            <div
              key={`fu-${i}`}
              className='flex items-start w-full flex-wrap'
              style={{
                gap: 'var(--dim-space-200, 8px)',
                paddingTop: 'var(--dim-space-250, 10px)',
                paddingBottom: 'var(--dim-space-250, 10px)',
                paddingLeft: 'var(--dim-space-300, 12px)',
                paddingRight: 'var(--dim-space-300, 12px)',
                borderRadius: 'var(--dim-radius-200, 8px)',
                background: 'var(--surface-card-quaternary, #F9FBFB)',
                fontSize: 'var(--type-size-sm)',
              }}
            >
              <Chip>{formatSwDate(f.date)}</Chip>
              <Chip tone='indigo'>{resolveSwContactChannel(f.channel)}</Chip>
              <Chip tone={f.reached ? 'green' : 'red'}>{f.reached ? 'ติดตามได้' : 'ติดตามไม่ได้'}</Chip>
              <span className='min-w-0' style={{ flex: '1 1 240px' }}>{f.result}</span>
              {!locked && (
                <NeutralSubdueButton size='sm' leadingIcon='delete' onClick={() => onChange({ followUps: entries.filter((_, idx) => idx !== i) })}>
                  นำออก
                </NeutralSubdueButton>
              )}
            </div>
          ))}
        </Stack>
      )}

      {!locked && (
        <Stack gap='var(--dim-space-300, 12px)'>
          <Row>
            <SwField label='วันที่ติดตาม' minWidth={200}>
              <DatePicker
                showLabel={false}
                value={draft.date ? new Date(draft.date) : null}
                onChange={(d) => setDraft((x) => ({ ...x, date: d ? toLocalIso(d) : '' }))}
                placeholder='เลือกวันที่'
              />
            </SwField>
            <SwField label='ช่องทางการติดตาม' minWidth={320}>
              <div className='flex flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                {SW_CONTACT_CHANNELS.map((c) => (
                  <SelectableTag
                    key={c.value}
                    label={c.label}
                    size='md'
                    selected={draft.channel === c.value}
                    onClick={() => setDraft((x) => ({ ...x, channel: c.value }))}
                  />
                ))}
              </div>
            </SwField>
            <SwField label='ผลการติดต่อ' minWidth={220}>
              <div className='flex flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                <SelectableTag label='ติดตามได้' size='md' selected={draft.reached} onClick={() => setDraft((x) => ({ ...x, reached: true }))} />
                <SelectableTag label='ติดตามไม่ได้' size='md' selected={!draft.reached} onClick={() => setDraft((x) => ({ ...x, reached: false }))} />
              </div>
            </SwField>
          </Row>
          <SwField label='ผลการติดตาม'>
            <SuggestibleTextarea
              voice
              value={draft.result}
              onChange={(e) => setDraft((x) => ({ ...x, result: e.target.value }))}
              suggestions={SW_FOLLOWUP_SUGGESTIONS}
              minChars={3}
              placeholder='บันทึกสิ่งที่พบและการดำเนินการในการติดตามครั้งนี้'
            />
          </SwField>
          <div className='flex w-full'>
            <div className='flex-1' />
            <BrandDashedAddButton onClick={addEntry}>เพิ่มการติดตาม</BrandDashedAddButton>
          </div>
        </Stack>
      )}

      <SwField label='การประเมินผลการช่วยเหลือ (Evaluation)'>
        <SuggestibleTextarea
          voice
          disabled={locked}
          value={v.evaluation || ''}
          onChange={(e) => onChange({ evaluation: e.target.value })}
          suggestions={SW_EVALUATION_SUGGESTIONS}
          minChars={3}
          placeholder='สรุปว่าบรรลุเป้าหมายในแผนช่วยเหลือหรือไม่ และควรดำเนินการต่ออย่างไร'
        />
      </SwField>

      <PanelAudit value={v} />
    </Stack>
  );
};

/* ── ⑤ Termination ────────────────────────────────────────────────── */
const TerminationPanel = ({ value, onChange, locked }) => {
  const v = value || {};
  return (
    <Stack>
      <SwBanner tone={v.terminated ? 'warning' : 'neutral'} icon={v.terminated ? 'lock' : 'task_alt'}>
        {v.terminated
          ? 'เคสนี้ถูกทำเครื่องหมายว่ายุติการให้บริการแล้ว — เมื่อบันทึกแบบ ส.ส.2 ระเบียนจะเป็นอ่านอย่างเดียว ต้องกด "เปิดเคสใหม่" พร้อมเหตุผลก่อนแก้ไข'
          : 'ยุติการให้บริการเมื่อบรรลุเป้าหมายในแผน หรือเมื่อเคสไม่อยู่ในความรับผิดชอบแล้ว'}
      </SwBanner>

      <div className='flex flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
        <SelectableTag
          label='ยังให้บริการต่อ'
          size='md'
          selected={!v.terminated}
          onClick={() => !locked && onChange({ terminated: false })}
        />
        <SelectableTag
          label='ยุติการให้บริการ'
          size='md'
          selected={!!v.terminated}
          onClick={() => !locked && onChange({ terminated: true, terminationDate: v.terminationDate || todayIso(), terminatedBy: SW_CURRENT_USER })}
        />
      </div>

      {v.terminated && (
        <>
          <Row>
            <SwField label='วันที่ยุติการให้บริการ' required minWidth={220}>
              <DatePicker
                showLabel={false}
                disabled={locked}
                value={v.terminationDate ? new Date(v.terminationDate) : null}
                onChange={(d) => onChange({ terminationDate: d ? toLocalIso(d) : '' })}
                placeholder='เลือกวันที่'
              />
            </SwField>
            <SwField label='ผู้ยุติการให้บริการ' minWidth={260}>
              <Select
                showLabel={false}
                searchable
                size='lg'
                disabled={locked}
                value={v.terminatedBy || SW_CURRENT_USER}
                onChange={(val) => onChange({ terminatedBy: val })}
                options={SW_WORKERS.map((w) => ({ value: w, label: w }))}
                placeholder='เลือกผู้ยุติ'
              />
            </SwField>
          </Row>
          <SwField label='เหตุผลการยุติการให้บริการ' required>
            <SuggestibleTextarea
              voice
              disabled={locked}
              value={v.terminationReason || ''}
              onChange={(e) => onChange({ terminationReason: e.target.value })}
              suggestions={SW_TERMINATION_SUGGESTIONS}
              minChars={3}
              placeholder='ระบุเหตุผลการยุติ เช่น บรรลุเป้าหมายตามแผน / ย้ายที่อยู่ / เสียชีวิต'
            />
          </SwField>
        </>
      )}

      {v.reopen && (
        <SwBanner tone='brand' icon='history'>
          {`เปิดเคสใหม่โดย ${v.reopen.by} · ${formatSwDateTime(v.reopen.at)} — เหตุผล: ${v.reopen.reason}`}
        </SwBanner>
      )}

      <PanelAudit value={v} />
    </Stack>
  );
};

/* ── ⑥ คัดกรองและเฝ้าระวังภาวะเสี่ยงในเด็ก ───────────────────────── */
const ChildRiskPanel = ({ value, onChange, locked }) => {
  const v = value || {};
  const risks = v.risks || [];
  const result = interpretChildRisk(risks);
  const needPlan = result.band.key === 'high';

  const toggle = (key) => {
    const next = risks.includes(key) ? risks.filter((r) => r !== key) : [...risks, key];
    onChange({ risks: next, level: interpretChildRisk(next).band.key });
  };

  return (
    <Stack>
      <SwBanner tone='neutral' icon='child_care'>
        ใช้กับผู้รับบริการอายุต่ำกว่า 18 ปี หรือกรณีที่มีเด็กในครอบครัวได้รับผลกระทบ
        — ผลรวมข้อที่พบจะแปลระดับความเสี่ยงให้อัตโนมัติ
      </SwBanner>

      <Stack gap='var(--dim-space-200, 8px)'>
        {SW_CHILD_RISK_ITEMS.map((item) => (
          <Checkbox
            key={item.key}
            checked={risks.includes(item.key)}
            onChange={() => !locked && toggle(item.key)}
            disabled={locked}
            label={item.label}
          />
        ))}
      </Stack>

      <SwBanner tone={needPlan ? 'danger' : (result.band.key === 'watch' ? 'warning' : 'brand')} icon='monitoring'>
        {`พบภาวะเสี่ยง ${result.count} ข้อ — ${result.band.label}`}
      </SwBanner>

      <SwField
        label='แผนการช่วยเหลือ / เฝ้าระวัง'
        required={needPlan}
        hint={needPlan && !(v.plan || '').trim() ? 'ผลคัดกรองเสี่ยงสูง — ต้องกรอกแผนช่วยเหลือก่อนยืนยันบันทึก' : undefined}
        hintTone={needPlan && !(v.plan || '').trim() ? 'error' : undefined}
      >
        <SuggestibleTextarea
          voice
          disabled={locked}
          value={v.plan || ''}
          onChange={(e) => onChange({ plan: e.target.value })}
          suggestions={[
            'ประสานสถานศึกษาเพื่อคงสถานภาพนักเรียนและขอทุนการศึกษา',
            'ส่งต่อบ้านพักเด็กและครอบครัวเพื่อคุ้มครองสวัสดิภาพ',
            'เข้าโปรแกรมช่วยเหลือด้านโภชนาการและติดตามการเจริญเติบโตทุกเดือน',
            'ประสาน อสส. ในพื้นที่เฝ้าระวังและรายงานความเปลี่ยนแปลง',
            'ส่งต่อคลินิกสุขภาพจิตเพื่อประเมินพัฒนาการและภาวะจิตใจ',
          ]}
          minChars={3}
          placeholder='ระบุแผนการช่วยเหลือและการเฝ้าระวังเด็กรายนี้'
        />
      </SwField>

      <PanelAudit value={v} />
    </Stack>
  );
};

/* ── ⑦ คัดกรองความรุนแรงในครอบครัว ──────────────────────────────── */
const ViolencePanel = ({ value, onChange, locked }) => {
  const v = value || {};
  const types = v.types || [];
  const items = v.items || [];
  const result = interpretViolence(items);
  const needPlan = result.band.key === 'high';

  const toggleType = (val) => {
    const next = types.includes(val) ? types.filter((t) => t !== val) : [...types, val];
    onChange({ types: next });
  };

  const toggleItem = (key) => {
    const next = items.includes(key) ? items.filter((i) => i !== key) : [...items, key];
    onChange({ items: next, level: interpretViolence(next).band.key });
  };

  return (
    <Stack>
      <SwBanner tone='danger' icon='shield_person'>
        แบบคัดกรองนี้เป็นข้อมูลลับตามข้อกำหนด §1.4.2 — เปิดดูและบันทึกได้เฉพาะ
        ผู้ที่ได้รับสิทธิงานสังคมสงเคราะห์ และไม่แสดง PII ในรายงานระดับกอง/ผู้บริหาร
      </SwBanner>

      <SwField label='ประเภทความรุนแรงที่พบ'>
        <div className='flex flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          {SW_VIOLENCE_TYPES.map((t) => (
            <SelectableTag
              key={t.value}
              label={t.label}
              size='md'
              selected={types.includes(t.value)}
              onClick={() => !locked && toggleType(t.value)}
            />
          ))}
        </div>
      </SwField>

      <SwField label='ข้อคำถามคัดกรอง'>
        <Stack gap='var(--dim-space-200, 8px)'>
          {SW_VIOLENCE_ITEMS.map((item) => (
            <Checkbox
              key={item.key}
              checked={items.includes(item.key)}
              onChange={() => !locked && toggleItem(item.key)}
              disabled={locked}
              label={item.label}
            />
          ))}
        </Stack>
      </SwField>

      <SwBanner tone={needPlan ? 'danger' : (result.band.key === 'moderate' ? 'warning' : 'brand')} icon='monitoring'>
        {`พบข้อบ่งชี้ ${result.count} ข้อ — ${result.band.label}`}
      </SwBanner>

      <SwField
        label='แผนช่วยเหลือ / การวางแผนความปลอดภัย'
        required={needPlan}
        hint={needPlan && !(v.plan || '').trim() ? 'ผลคัดกรองเสี่ยงสูง — ต้องกรอกแผนช่วยเหลือก่อนยืนยันบันทึก' : undefined}
        hintTone={needPlan && !(v.plan || '').trim() ? 'error' : undefined}
      >
        <SuggestibleTextarea
          voice
          disabled={locked}
          value={v.plan || ''}
          onChange={(e) => onChange({ plan: e.target.value })}
          suggestions={SW_SAFETY_PLAN_SUGGESTIONS}
          minChars={3}
          placeholder='ระบุแผนความปลอดภัย ช่องทางติดต่อฉุกเฉิน และหน่วยงานที่ประสาน'
        />
      </SwField>

      <PanelAudit value={v} />
    </Stack>
  );
};

/* ── ⑧ ประเมินความพิการ ───────────────────────────────────────────── */
const DisabilityPanel = ({ value, onChange, locked }) => {
  const v = value || {};
  const types = v.types || [];

  const toggleType = (val) => {
    const next = types.includes(val) ? types.filter((t) => t !== val) : [...types, val];
    onChange({ types: next });
  };

  return (
    <Stack>
      <SwBanner tone='neutral' icon='accessible'>
        ประเภทความพิการ 7 ประเภทตามพระราชบัญญัติส่งเสริมและพัฒนาคุณภาพชีวิตคนพิการ
        — ใช้เป็นข้อมูลตั้งต้นของรายงานฉบับที่ 8
      </SwBanner>

      <SwField label='ประเภทความพิการ' required>
        <div className='flex flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          {SW_DISABILITY_TYPES.map((t) => (
            <SelectableTag
              key={t.value}
              label={t.label}
              size='md'
              selected={types.includes(t.value)}
              onClick={() => !locked && toggleType(t.value)}
            />
          ))}
        </div>
      </SwField>

      <Row>
        <SwField label='สถานะบัตรประจำตัวคนพิการ' required minWidth={260}>
          <Select
            showLabel={false}
            searchable={false}
            size='lg'
            disabled={locked}
            value={v.card || ''}
            onChange={(val) => onChange({ card: val })}
            options={SW_DISABILITY_CARD_STATUS}
            placeholder='เลือกสถานะบัตร'
          />
        </SwField>
        <SwField label='เลขบัตรประจำตัวคนพิการ' minWidth={240}>
          <InputField
            disabled={locked || v.card === 'none'}
            value={v.cardNo || ''}
            onChange={(val) => onChange({ cardNo: val })}
            placeholder='กรอกเมื่อมีบัตรแล้ว'
          />
        </SwField>
        <SwField label='คะแนน ADL (Barthel Index)' minWidth={220} hint='ดูรายละเอียดในแบบย่อย "คัดกรองผู้สูงอายุ (ADL)"'>
          <InputField
            type='number'
            disabled={locked}
            value={v.adl ?? ''}
            onChange={(val) => onChange({ adl: val })}
            placeholder='0–100'
          />
        </SwField>
      </Row>

      <SwField label='ความต้องการการช่วยเหลือ'>
        <SuggestibleTextarea
          voice
          disabled={locked}
          value={v.need || ''}
          onChange={(e) => onChange({ need: e.target.value })}
          suggestions={[
            'ขาเทียมใต้เข่าและการฝึกใช้งาน',
            'รถเข็นนั่งและราวจับในห้องน้ำ',
            'เตียงลมป้องกันแผลกดทับและผ้าอ้อมผู้ใหญ่',
            'ประสานทำบัตรประจำตัวคนพิการและเข้าถึงเบี้ยความพิการ',
            'ปรับสภาพแวดล้อมที่อยู่อาศัยให้เหมาะกับการเคลื่อนไหว',
          ]}
          minChars={3}
          placeholder='ระบุกายอุปกรณ์หรือสิทธิที่ผู้รับบริการต้องการ'
        />
      </SwField>

      <PanelAudit value={v} />
    </Stack>
  );
};

/* ── ⑨ คัดกรองผู้สูงอายุ (Barthel ADL) ───────────────────────────── */
const ElderlyPanel = ({ value, onChange, locked }) => {
  const v = value || {};
  const answers = v.answers || {};
  const complete = isBarthelComplete(answers);
  const total = scoreBarthel(answers);
  const band = interpretBarthel(total);

  return (
    <Stack>
      <SwBanner tone='neutral' icon='elderly'>
        แบบประเมินความสามารถในการดำเนินชีวิตประจำวัน (Barthel ADL Index) 10 หัวข้อ
        — ระบบรวมคะแนนและแปลผลอัตโนมัติ ผู้ใช้พิมพ์ทับผลแปลไม่ได้
      </SwBanner>

      <Stack gap='var(--dim-space-300, 12px)'>
        {SW_BARTHEL_ITEMS.map((item, idx) => (
          <div
            key={item.key}
            className='flex flex-col w-full'
            style={{
              gap: 'var(--dim-space-200, 8px)',
              paddingTop: 'var(--dim-space-300, 12px)',
              paddingBottom: 'var(--dim-space-300, 12px)',
              paddingLeft: 'var(--dim-space-300, 12px)',
              paddingRight: 'var(--dim-space-300, 12px)',
              borderRadius: 'var(--dim-radius-200, 8px)',
              background: idx % 2 === 0 ? 'var(--surface-card-quaternary, #F9FBFB)' : 'var(--surface-card-100, #FFFFFF)',
              border: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary, #EEF0F1)',
            }}
          >
            <span style={{ fontSize: 'var(--type-size-sm)', fontWeight: 'var(--type-weight-medium)' }}>{item.label}</span>
            <div className='flex flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
              {item.options.map((opt) => (
                <SelectableTag
                  key={`${item.key}-${opt.score}`}
                  label={`${opt.label} (${opt.score})`}
                  size='md'
                  selected={answers[item.key] === opt.score}
                  onClick={() => !locked && onChange({ answers: { ...answers, [item.key]: opt.score } })}
                />
              ))}
            </div>
          </div>
        ))}
      </Stack>

      <SwBanner tone={complete ? 'brand' : 'neutral'} icon='calculate'>
        {complete
          ? `คะแนนรวม ${total} / ${SW_BARTHEL_MAX} — ${band.label}`
          : `ตอบให้ครบ 10 หัวข้อเพื่อให้ระบบแปลผล (ตอบแล้ว ${Object.keys(answers).length}/${SW_BARTHEL_ITEMS.length})`}
      </SwBanner>

      <SwField label='ข้อสังเกตเพิ่มเติมจากการคัดกรอง'>
        <SuggestibleTextarea
          voice
          disabled={locked}
          value={v.note || ''}
          onChange={(e) => onChange({ note: e.target.value, adl: total, band: band.label })}
          suggestions={[
            'ผู้สูงอายุอาศัยอยู่คนเดียว ไม่มีผู้ดูแลในเวลากลางวัน',
            'ต้องการกายอุปกรณ์ช่วยเดินและราวจับในห้องน้ำ',
            'ผู้ดูแลหลักเป็นผู้สูงอายุด้วยกัน ควรประสาน อสส. ช่วยเยี่ยม',
            'มีภาวะพึ่งพิงสูง ควรส่งต่อทีมพยาบาลเยี่ยมบ้าน',
          ]}
          minChars={3}
          placeholder='บันทึกสิ่งที่พบเพิ่มเติมจากคะแนน ADL'
        />
      </SwField>

      <PanelAudit value={v} />
    </Stack>
  );
};

/* ── ⑩ คัดกรองภาวะซึมเศร้า 2Q ─────────────────────────────────────── */
const Depression2QPanel = ({ value, onChange, locked }) => {
  const v = value || {};
  const answers = v.answers || {};
  const result = interpret2Q(answers);

  return (
    <Stack>
      <SwBanner tone='neutral' icon='sentiment_dissatisfied'>
        แบบคัดกรองภาวะซึมเศร้า 2 คำถาม (2Q) — ถ้าตอบ &quot;มี&quot; ข้อใดข้อหนึ่ง
        ถือว่าผลบวก ระบบจะขึ้น Flag ข้อควรระวังและชวนส่งปรึกษาคลินิกสุขภาพจิต
      </SwBanner>

      <Stack gap='var(--dim-space-300, 12px)'>
        {SW_2Q_ITEMS.map((item, idx) => (
          <div
            key={item.key}
            className='flex flex-col w-full'
            style={{
              gap: 'var(--dim-space-200, 8px)',
              paddingTop: 'var(--dim-space-300, 12px)',
              paddingBottom: 'var(--dim-space-300, 12px)',
              paddingLeft: 'var(--dim-space-300, 12px)',
              paddingRight: 'var(--dim-space-300, 12px)',
              borderRadius: 'var(--dim-radius-200, 8px)',
              background: 'var(--surface-card-quaternary, #F9FBFB)',
              border: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary, #EEF0F1)',
            }}
          >
            <span style={{ fontSize: 'var(--type-size-sm)', fontWeight: 'var(--type-weight-medium)' }}>
              {`${idx + 1}. ${item.label}`}
            </span>
            <div className='flex flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
              <SelectableTag
                label='มี'
                size='md'
                selected={answers[item.key] === 'yes'}
                onClick={() => !locked && onChange({ answers: { ...answers, [item.key]: 'yes' } })}
              />
              <SelectableTag
                label='ไม่มี'
                size='md'
                selected={answers[item.key] === 'no'}
                onClick={() => !locked && onChange({ answers: { ...answers, [item.key]: 'no' } })}
              />
            </div>
          </div>
        ))}
      </Stack>

      <SwBanner tone={result.positive ? 'danger' : (result.answered ? 'brand' : 'neutral')} icon='monitoring'>
        {result.label}
      </SwBanner>

      {result.positive && (
        <SwField label='การดำเนินการต่อ'>
          <SuggestibleTextarea
            voice
            disabled={locked}
            value={v.action || ''}
            onChange={(e) => onChange({ action: e.target.value })}
            suggestions={[
              'ส่งปรึกษาคลินิกสุขภาพจิตเพื่อประเมิน 9Q ต่อ',
              'ออกแบบส่งต่อ (ส.ส.3) ไปคลินิกสุขภาพจิตภายในศูนย์',
              'ให้คำปรึกษาเบื้องต้นและนัดติดตามภายใน 2 สัปดาห์',
              'ประเมินความเสี่ยงการฆ่าตัวตาย (8Q) เพิ่มเติม',
            ]}
            minChars={3}
            placeholder='ระบุการดำเนินการหลังพบผลคัดกรองเป็นบวก'
          />
        </SwField>
      )}

      <PanelAudit value={v} />
    </Stack>
  );
};

/* ── ทะเบียน panel ตามคีย์ของ SW_SUB_FORMS ────────────────────────── */
export const SW_SUB_FORM_PANELS = {
  diagnosis: DiagnosisPanel,
  plan: PlanPanel,
  intervention: InterventionPanel,
  followup: FollowUpPanel,
  termination: TerminationPanel,
  childRisk: ChildRiskPanel,
  violence: ViolencePanel,
  disability: DisabilityPanel,
  elderly: ElderlyPanel,
  depression2q: Depression2QPanel,
};

/**
 * ตรวจความครบถ้วนของแต่ละแบบย่อยก่อนบันทึก
 * @returns {string|null} ข้อความ error (null = ผ่าน)
 */
export const validateSwSubForm = (key, v) => {
  const value = v || {};
  if (key === 'diagnosis') {
    if (!value.primaryProblem) return 'เลือกปัญหาหลัก (รหัส 4 หลัก) ก่อนบันทึก';
    if (!(value.socialDiagnosis || '').trim()) return 'บันทึกการวินิจฉัยทางสังคมก่อนบันทึก';
    const dupes = (value.secondaryProblems || []).filter((s) => s.code === value.primaryProblem);
    if (dupes.length > 0) return 'ปัญหาร่วมซ้ำกับปัญหาหลัก — เลือกรหัสอื่น';
  }
  if (key === 'termination' && value.terminated) {
    if (!value.terminationDate) return 'ระบุวันที่ยุติการให้บริการ';
    if (!(value.terminationReason || '').trim()) return 'ระบุเหตุผลการยุติการให้บริการ';
  }
  if (key === 'childRisk') {
    const r = interpretChildRisk(value.risks);
    if (r.band.key === 'high' && !(value.plan || '').trim()) {
      return 'ผลคัดกรองเสี่ยงสูง — ต้องกรอกแผนการช่วยเหลือก่อนยืนยันบันทึก';
    }
  }
  if (key === 'violence') {
    const r = interpretViolence(value.items);
    if (r.band.key === 'high' && !(value.plan || '').trim()) {
      return 'ผลคัดกรองเสี่ยงสูง — ต้องกรอกแผนช่วยเหลือ/วางแผนความปลอดภัยก่อนยืนยันบันทึก';
    }
  }
  if (key === 'disability') {
    if ((value.types || []).length === 0) return 'เลือกประเภทความพิการอย่างน้อย 1 ประเภท';
    if (!value.card) return 'ระบุสถานะบัตรประจำตัวคนพิการ';
  }
  return null;
};

/** สรุปสั้น ๆ ที่แสดงใต้ปุ่มแต่ละแบบย่อย */
export const summarizeSwSubForm = (key, v) => {
  const value = v || {};
  if (!value.savedAt) return null;
  switch (key) {
    case 'diagnosis':
      return resolveSwProblemCodeLabel(value.primaryProblem);
    case 'plan':
      return `${(value.goals || []).length} เป้าหมายในแผน`;
    case 'intervention': {
      const services = Object.values(value.services || {}).reduce((s, arr) => s + (arr || []).length, 0);
      return `${services} บริการ · ${(value.funds || []).length} รายการเงินสนับสนุน · ${(value.materials || []).length} รายการวัสดุ`;
    }
    case 'followup':
      return `${(value.followUps || []).length} ครั้งที่ติดตาม`;
    case 'termination':
      return value.terminated ? `ยุติแล้ว ${formatSwDate(value.terminationDate)}` : 'ยังให้บริการต่อ';
    case 'childRisk':
      return interpretChildRisk(value.risks).band.label;
    case 'violence':
      return interpretViolence(value.items).band.label;
    case 'disability':
      return `${(value.types || []).length} ประเภท · ${value.card ? value.card : '—'}`;
    case 'elderly':
      return isBarthelComplete(value.answers)
        ? `ADL ${scoreBarthel(value.answers)}/${SW_BARTHEL_MAX} — ${interpretBarthel(scoreBarthel(value.answers)).label}`
        : 'ประเมินยังไม่ครบ';
    case 'depression2q':
      return interpret2Q(value.answers).label;
    default:
      return null;
  }
};

/** Flag ข้อควรระวังที่ต้องขึ้นบนหัวระเบียน */
export const swSubFormFlags = (form) => {
  const subs = form?.subForms || {};
  const flags = [];
  if (subs.depression2q?.savedAt && interpret2Q(subs.depression2q.answers).positive) {
    flags.push({ tone: 'red', icon: 'psychology', text: 'คัดกรองซึมเศร้า 2Q ผลบวก — ควรส่งปรึกษาคลินิกสุขภาพจิต' });
  }
  if (subs.violence?.savedAt && interpretViolence(subs.violence.items).band.key === 'high') {
    flags.push({ tone: 'red', icon: 'shield_person', text: 'คัดกรองความรุนแรงในครอบครัวเสี่ยงสูง — ต้องมีแผนความปลอดภัย' });
  }
  if (subs.childRisk?.savedAt && interpretChildRisk(subs.childRisk.risks).band.key === 'high') {
    flags.push({ tone: 'red', icon: 'child_care', text: 'คัดกรองเด็กเสี่ยงสูง — ต้องมีแผนช่วยเหลือทันที' });
  }
  if (subs.elderly?.savedAt && isBarthelComplete(subs.elderly.answers) && scoreBarthel(subs.elderly.answers) <= 11) {
    flags.push({ tone: 'yellow', icon: 'elderly', text: 'ADL ≤ 11 คะแนน — บุคคลที่มีภาวะพึ่งพิง ควรส่งทีมเยี่ยมบ้าน' });
  }
  return flags;
};

export default SW_SUB_FORM_PANELS;
