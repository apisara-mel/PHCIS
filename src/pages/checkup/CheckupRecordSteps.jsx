import React, { useMemo, useState } from 'react';
import Table from '@/components/table/Table';
import InputField from '@/components/forms/InputField';
import Select from '@/components/forms/Select';
import Radio from '@/components/radio/Radio';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import Icon from '@/components/icons/Icon';
import Information from '@/components/information/Information';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import {
  CHECKUP_ITEM_GROUPS, CHECKUP_ITEM_GROUP_LABEL, REF_SOURCES,
  CHECKUP_SUMMARY_SUGGESTIONS, CHECKUP_ADVICE_SUGGESTIONS,
  CHECKUP_PHYSICAL_SUGGESTIONS, CHECKUP_IMPRESSION_SUGGESTIONS,
  visitItems, visitRefOverrides, interpretValue, computeBmi, bmiBand,
  collectAbnormalFindings, generateSummaryDraft, formatRange,
  emrLinksFor, hasEmrHistory, findCatalogItem,
} from '@/data/checkupStore';
import {
  SectionHeader, SubCard, EmptyState, NoticeBar, ResultBadge, RefSourceBadge,
  ReadField, VerdictBadge, ReadOnlyLinkRow, StatTile,
} from '@/pages/checkup/CheckupUi';

/* CheckupRecordSteps — the four steps of บันทึกผลตรวจสุขภาพ (HCIS §2.13.3).

   TOR coverage:
     1.19.14  แสดง/บันทึกข้อมูลทางการแพทย์ (EMR link panel, read-only)
     1.19.15  เชื่อมโยง CPOE (read-only link panel)
     1.19.16  แปลผลและให้คำแนะนำโดยอัตโนมัติ
     1.19.17  แปลผล Lab + สรุปผล X-ray / EKG พร้อมคำแนะนำอัตโนมัติ
     1.19.18  ค่าอ้างอิง 3 ระดับ พร้อมแสดงที่มาต่อรายการ
     1.19.19  บันทึกสรุปผลการตรวจและคำแนะนำ

   Every clinician-typed field is a SuggestibleTextarea with voice +
   suggestions + minChars (project rule). */

/* ── read-only EMR / Lab rail ────────────────────────────────────── */

export const EmrLinkPanel = ({ hn }) => {
  const links = emrLinksFor(hn);
  return (
    <SubCard>
      <SectionHeader
        icon='link'
        title='ข้อมูลทางการแพทย์ที่เชื่อมโยง'
        subtitle='EMR · ผล Lab · รังสี · CPOE — เปิดดูอย่างเดียว ไม่มีการแก้ไขจากฝั่งตรวจสุขภาพ'
      />
      {hasEmrHistory(hn) ? (
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200)' }}>
          {links.map((l) => (
            <ReadOnlyLinkRow key={l.to} to={l.to} icon={l.icon} label={l.label} note={l.note} />
          ))}
        </div>
      ) : (
        <EmptyState
          compact
          icon='folder_off'
          title='ไม่มีข้อมูล'
          subtitle='ผู้รับบริการรายนี้ยังไม่มีประวัติในระบบ EMR / Lab / รังสี'
        />
      )}
    </SubCard>
  );
};

/* ── shared value field with live interpretation ─────────────────── */

const InterpretedNumberField = ({
  code, label, unit, value, onChange, overrides, locked, placeholder,
}) => {
  const verdict = interpretValue(code, value, overrides);
  const invalid = verdict.status === 'implausible';
  return (
    <div className='flex flex-col' style={{ gap: 'var(--dim-space-150)' }}>
      <InputField
        label={`${label}${unit ? ` (${unit})` : ''}`}
        showLeadingIcon={false}
        showHelperText={!!verdict.message}
        helperText={verdict.message}
        error={invalid}
        size='md'
        type='number'
        disabled={locked}
        placeholder={placeholder}
        value={value ?? ''}
        onChange={(e) => onChange(e?.target ? e.target.value : e)}
      />
      <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
        <ResultBadge verdict={verdict} />
        <RefSourceBadge sourceKey={verdict.source} range={verdict.range} />
      </div>
    </div>
  );
};

/* ── Step 1 — Vital signs ────────────────────────────────────────── */

export const CheckupStep1Vitals = ({ form, setForm, visit, locked }) => {
  const overrides = visitRefOverrides(visit);
  const v = form.vitals || {};
  const set = (key) => (val) => setForm((f) => ({ ...f, vitals: { ...f.vitals, [key]: val } }));
  const bmi = computeBmi(v.weight, v.height);
  const band = bmiBand(bmi);
  const waistCode = visit?.sex === 'หญิง' ? 'WAIST_F' : 'WAIST_M';

  return (
    <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-600)' }}>
      <SectionHeader
        icon='monitor_heart'
        title='สัญญาณชีพ น้ำหนัก ส่วนสูง รอบเอว และสายตา'
        subtitle='กรอกค่าแล้วระบบจะคำนวณ BMI และแปลผลตามเกณฑ์ของชุดตรวจนี้ทันที'
      />

      <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 w-full' style={{ gap: 'var(--dim-space-500)' }}>
        <InputField
          label='น้ำหนัก (กก.)'
          showLeadingIcon={false}
          showHelperText={false}
          size='md'
          type='number'
          disabled={locked}
          value={v.weight ?? ''}
          onChange={(e) => set('weight')(e?.target ? e.target.value : e)}
        />
        <InputField
          label='ส่วนสูง (ซม.)'
          showLeadingIcon={false}
          showHelperText={false}
          size='md'
          type='number'
          disabled={locked}
          value={v.height ?? ''}
          onChange={(e) => set('height')(e?.target ? e.target.value : e)}
        />
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-150)' }}>
          <ReadField label='ดัชนีมวลกาย (BMI) — คำนวณอัตโนมัติ' value={bmi != null ? `${bmi} kg/m²` : 'ยังไม่ครบข้อมูล'} />
          <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
            {band ? <ColorfulBadge style={band.badge} size='small' hierarchy='secondary'>{band.label}</ColorfulBadge> : null}
            {bmi != null ? <ResultBadge verdict={interpretValue('BMI', bmi, overrides)} /> : null}
            {bmi != null ? <RefSourceBadge sourceKey={interpretValue('BMI', bmi, overrides).source} range={interpretValue('BMI', bmi, overrides).range} /> : null}
          </div>
        </div>

        <InterpretedNumberField
          code={waistCode}
          label='รอบเอว'
          unit='ซม.'
          value={v.waist ?? ''}
          onChange={set('waist')}
          overrides={overrides}
          locked={locked}
        />
        <InterpretedNumberField
          code='SBP'
          label='ความดันโลหิตตัวบน (SBP)'
          unit='mmHg'
          value={v.sbp ?? ''}
          onChange={set('sbp')}
          overrides={overrides}
          locked={locked}
        />
        <InterpretedNumberField
          code='DBP'
          label='ความดันโลหิตตัวล่าง (DBP)'
          unit='mmHg'
          value={v.dbp ?? ''}
          onChange={set('dbp')}
          overrides={overrides}
          locked={locked}
        />
        <InputField
          label='ชีพจร (ครั้ง/นาที)'
          showLeadingIcon={false}
          showHelperText={false}
          size='md'
          type='number'
          disabled={locked}
          value={v.pulse ?? ''}
          onChange={(e) => set('pulse')(e?.target ? e.target.value : e)}
        />
        <InputField
          label='อุณหภูมิร่างกาย (°C)'
          showLeadingIcon={false}
          showHelperText={false}
          size='md'
          type='number'
          disabled={locked}
          value={v.temp ?? ''}
          onChange={(e) => set('temp')(e?.target ? e.target.value : e)}
        />
        <div />
        <InputField
          label='สายตาข้างซ้าย (Snellen)'
          showLeadingIcon={false}
          showHelperText={false}
          size='md'
          disabled={locked}
          placeholder='เช่น 20/20'
          value={v.visionL ?? ''}
          onChange={(e) => set('visionL')(e?.target ? e.target.value : e)}
        />
        <InputField
          label='สายตาข้างขวา (Snellen)'
          showLeadingIcon={false}
          showHelperText={false}
          size='md'
          disabled={locked}
          placeholder='เช่น 20/30'
          value={v.visionR ?? ''}
          onChange={(e) => set('visionR')(e?.target ? e.target.value : e)}
        />
      </div>

      <NoticeBar tone='info' icon='info'>
        {`ค่าอ้างอิงถูกเลือกตามลำดับ ${REF_SOURCES.api.short} › ${REF_SOURCES.hospital.short} › ${REF_SOURCES.standard.short} — ป้ายกำกับใต้แต่ละช่องบอกว่าค่าที่ใช้แปลผลมาจากระดับใด (TOR 1.19.18)`}
      </NoticeBar>
    </div>
  );
};

/* ── Step 2 — per-item results + auto interpretation ─────────────── */

export const CheckupStep2Results = ({ form, setForm, visit, locked }) => {
  const overrides = visitRefOverrides(visit);
  const items = useMemo(() => visitItems(visit), [visit]);
  const setResult = (code) => (val) => setForm((f) => ({ ...f, results: { ...f.results, [code]: val } }));

  const groupRows = (key) => items.filter((i) => i.group === key);

  const renderValueCell = (item) => {
    const value = form.results?.[item.code] ?? '';
    if (item.resultType === 'numeric') {
      const verdict = interpretValue(item.code, value, overrides);
      return (
        <InputField
          showLabel={false}
          showLeadingIcon={false}
          showHelperText={!!verdict.message}
          helperText={verdict.message}
          error={verdict.status === 'implausible'}
          size='sm'
          type='number'
          disabled={locked}
          placeholder={item.unit || 'ค่า'}
          value={value}
          onChange={(e) => setResult(item.code)(e?.target ? e.target.value : e)}
          style={{ minWidth: 'var(--dim-size-2000, 128px)' }}
        />
      );
    }
    if (item.resultType === 'choice') {
      return (
        <Select
          showFieldName={false}
          showHelperText={false}
          showLeadingIcon={false}
          size='sm'
          placeholder='เลือกผล'
          disabled={locked}
          options={(item.choices || []).map((c) => ({ value: c, label: c }))}
          value={value}
          onChange={(val) => setResult(item.code)(typeof val === 'string' ? val : val?.value)}
          style={{ minWidth: 'var(--dim-size-2450, 280px)' }}
        />
      );
    }
    if (item.resultType === 'text') {
      return (
        <div style={{ minWidth: 'var(--dim-size-2800, 512px)', width: '100%' }}>
          <SuggestibleTextarea
            voice
            value={value}
            disabled={locked}
            onChange={(e) => setResult(item.code)(e?.target ? e.target.value : e)}
            placeholder={`สรุปผล${item.name} — เช่น ปอดและหัวใจปกติ ไม่พบรอยโรค`}
            suggestions={CHECKUP_IMPRESSION_SUGGESTIONS}
            minChars={2}
            rows={2}
            height={96}
            minHeight={96}
          />
        </div>
      );
    }
    return <span style={{ color: 'var(--text-content-tertiary, #858C92)' }}>ไม่ต้องบันทึกผล</span>;
  };

  const verdictFor = (item) => {
    const value = form.results?.[item.code] ?? '';
    if (item.resultType === 'numeric') return interpretValue(item.code, value, overrides);
    if (value === '' || value == null) return { status: 'empty' };
    if (item.resultType === 'choice') {
      const isNormal = /^ปกติ|^ลบ|Negative|Non-reactive/i.test(String(value));
      return { status: isNormal ? 'normal' : 'abnormal', source: 'standard', range: null };
    }
    const readsNormal = /ปกติ|ไม่พบรอยโรค|ไม่พบความผิดปกติ|normal/i.test(String(value));
    return { status: readsNormal ? 'normal' : 'abnormal', source: 'standard', range: null };
  };

  const columns = [
    { key: 'code', label: 'รหัส' },
    {
      key: 'name',
      label: 'รายการตรวจ',
      flex: true,
      minWidth: 230,
      render: (r) => (
        <span className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-050, 2px)' }}>
          <span style={{ fontSize: 'var(--type-size-sm, 14px)' }}>{r.name}</span>
          {r.confidential ? (
            <ColorfulBadge style='red' size='small' hierarchy='secondary' icon='lock'>ข้อมูลลับ §1.4.2</ColorfulBadge>
          ) : null}
        </span>
      ),
    },
    { key: 'value', label: 'ผลตรวจ', flex: true, minWidth: 300, sortable: false, render: renderValueCell },
    {
      key: 'ref',
      label: 'ค่าอ้างอิง / ที่มา',
      sortable: false,
      render: (r) => {
        const verdict = verdictFor(r);
        if (r.resultType !== 'numeric') {
          return <span style={{ fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary, #858C92)' }}>แปลผลจากข้อความ/ตัวเลือก</span>;
        }
        if (verdict.status === 'no-criteria') {
          return <ColorfulBadge style='grey' size='small' hierarchy='secondary'>ยังไม่ตั้งเกณฑ์</ColorfulBadge>;
        }
        return (
          <span className='flex flex-col' style={{ gap: 'var(--dim-space-100)' }}>
            <ColorfulBadge style={REF_SOURCES[verdict.source]?.badge || 'grey'} size='small' hierarchy='secondary'>
              {REF_SOURCES[verdict.source]?.short || '—'}
            </ColorfulBadge>
            <span style={{ fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-secondary, #636B72)' }}>
              {formatRange(verdict.range)}
            </span>
          </span>
        );
      },
    },
    {
      key: 'verdict',
      label: 'แปลผล',
      sortable: false,
      render: (r) => <ResultBadge verdict={verdictFor(r)} />,
    },
    {
      key: 'advice',
      label: 'คำแนะนำอัตโนมัติ',
      flex: true,
      minWidth: 280,
      sortable: false,
      render: (r) => {
        const verdict = verdictFor(r);
        if (verdict.status !== 'abnormal') {
          return <span style={{ color: 'var(--text-content-tertiary, #858C92)' }}>—</span>;
        }
        const advice = verdict.advice
          || `พบผลผิดปกติจาก${r.name} — แนะนำพบแพทย์เพื่อประเมินและตรวจยืนยันเพิ่มเติม`;
        return (
          <span style={{ fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-alert-warning, #C2410C)' }}>
            {advice}
          </span>
        );
      },
    },
  ];

  const findings = collectAbnormalFindings(visit, form);

  return (
    <div className='grid grid-cols-1 xl:grid-cols-4 w-full' style={{ gap: 'var(--dim-space-600)' }}>
      <div className='xl:col-span-3 flex flex-col w-full' style={{ gap: 'var(--dim-space-600)' }}>
        <SectionHeader
          icon='biotech'
          title='ผลตรวจรายรายการ'
          subtitle='กรอกค่าแล้วระบบแปลผลทันที (ปกติ / ผิดปกติ) พร้อมแสดงแหล่งค่าอ้างอิงและคำแนะนำอัตโนมัติ'
        />

        {items.length === 0 ? (
          <EmptyState
            icon='checklist'
            title='ใบสั่งตรวจนี้ยังไม่มีรายการตรวจ'
            subtitle='กลับไปหน้าบันทึกส่งตรวจเพื่อเลือกชุดตรวจและเพิ่มรายการตรวจก่อน'
          />
        ) : (
          CHECKUP_ITEM_GROUPS.map((g) => {
            const rows = groupRows(g.key);
            if (rows.length === 0) return null;
            return (
              <div key={g.key} className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
                <SectionHeader icon={g.icon} title={CHECKUP_ITEM_GROUP_LABEL[g.key]} subtitle={`${rows.length} รายการ`} />
                <Table columns={columns} rows={rows} rowKey={(r) => r.code} emptyMessage='ไม่มีรายการ' />
              </div>
            );
          })
        )}

        <SubCard tone={findings.length > 0 ? 'warning' : 'success'}>
          <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-300)' }}>
            <Icon name={findings.length > 0 ? 'warning' : 'check_circle'} size={18} />
            <span className='flex-1 min-w-0' style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm, 14px)' }}>
              {findings.length > 0
                ? `พบรายการผิดปกติ ${findings.length} รายการจากผลที่กรอกแล้ว — ระบบจะร่างสรุปผลและคำแนะนำให้อัตโนมัติในขั้นตอนสุดท้าย`
                : 'ยังไม่พบรายการผิดปกติจากผลที่กรอกแล้ว'}
            </span>
          </div>
        </SubCard>
      </div>

      <div className='xl:col-span-1 flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
        <EmrLinkPanel hn={visit?.hn} />
        <SubCard tone='brand'>
          <SectionHeader icon='rule' title='ลำดับค่าอ้างอิง 3 ระดับ' />
          {Object.values(REF_SOURCES).map((src) => (
            <span key={src.key} className='inline-flex items-center' style={{ gap: 'var(--dim-space-200)' }}>
              <ColorfulBadge style={src.badge} size='small' hierarchy='secondary'>{src.short}</ColorfulBadge>
              <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-secondary, #636B72)' }}>
                {src.label}
              </span>
            </span>
          ))}
          <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary, #858C92)' }}>
            ระดับที่อยู่ก่อนหน้าจะถูกใช้ก่อนเสมอ — รายการที่ไม่มีเกณฑ์จะไม่ถูกแปลผล
          </span>
        </SubCard>
      </div>
    </div>
  );
};

/* ── Step 3 — physical examination ───────────────────────────────── */

export const CheckupStep3Physical = ({ form, setForm, locked }) => {
  const physical = form.physical || {};
  const set = (key) => (val) => setForm((f) => ({ ...f, physical: { ...f.physical, [key]: val } }));

  return (
    <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-600)' }}>
      <SectionHeader
        icon='stethoscope'
        title='การตรวจร่างกายโดยแพทย์'
        subtitle='สรุปผลการตรวจร่างกายเป็น ปกติ / ผิดปกติ พร้อมรายละเอียดที่พบ'
        required
      />

      <SubCard>
        <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-600)' }}>
          <Radio
            name='physical-overall'
            checked={physical.overall === 'normal'}
            onChange={() => set('overall')('normal')}
            disabled={locked}
            label='ปกติ'
            description='ตรวจร่างกายทุกระบบอยู่ในเกณฑ์ปกติ'
            showDescription
          />
          <Radio
            name='physical-overall'
            checked={physical.overall === 'abnormal'}
            onChange={() => set('overall')('abnormal')}
            disabled={locked}
            label='ผิดปกติ'
            description='พบความผิดปกติ — ระบุรายละเอียดด้านล่าง'
            showDescription
          />
        </div>
      </SubCard>

      {physical.overall === 'abnormal' && !(physical.detail || '').trim() ? (
        <NoticeBar tone='danger' icon='error'>
          เลือก "ผิดปกติ" แล้วต้องระบุรายละเอียดที่ตรวจพบก่อนบันทึก
        </NoticeBar>
      ) : null}

      <SuggestibleTextarea
        voice
        label='รายละเอียดการตรวจร่างกาย'
        required={physical.overall === 'abnormal'}
        value={physical.detail || ''}
        disabled={locked}
        onChange={(e) => set('detail')(e?.target ? e.target.value : e)}
        placeholder='เช่น ฟังเสียงหัวใจปกติ ไม่พบเสียงฟู่ · คลำได้ต่อมไทรอยด์โตเล็กน้อยข้างขวา'
        suggestions={CHECKUP_PHYSICAL_SUGGESTIONS}
        minChars={3}
      />

      <Information
        hierarchy='secondary'
        text='ผลการตรวจร่างกายที่ระบุว่า "ผิดปกติ" จะถูกนำไปรวมในสรุปผลและคำแนะนำอัตโนมัติของขั้นตอนสุดท้าย'
        showSubText={false}
        showBadge={false}
        maxWidth={900}
      />
    </div>
  );
};

/* ── Step 4 — summary + advice ───────────────────────────────────── */

export const CheckupStep4Summary = ({ form, setForm, visit, locked, saved, onConfirmSave }) => {
  const draft = useMemo(() => generateSummaryDraft(visit, form), [visit, form]);
  const [regenerated, setRegenerated] = useState(false);

  const applyAuto = () => {
    setForm((f) => ({
      ...f,
      summaryVerdict: draft.verdict,
      summaryText: draft.summaryText,
      adviceText: draft.adviceText,
      adviceAuto: draft.adviceAuto,
      adviceOverridden: false,
    }));
    setRegenerated(true);
  };

  const overridden = !!form.adviceText
    && !!form.adviceAuto
    && form.adviceText !== draft.adviceText;

  const findingColumns = [
    { key: 'label', label: 'รายการที่ผิดปกติ', flex: true, minWidth: 240 },
    { key: 'value', label: 'ค่าที่ตรวจได้', render: (r) => `${r.value}${r.unit ? ` ${r.unit}` : ''}` },
    {
      key: 'ref',
      label: 'ค่าอ้างอิง / ที่มา',
      sortable: false,
      render: (r) => (
        <span className='flex flex-col' style={{ gap: 'var(--dim-space-100)' }}>
          <ColorfulBadge style={REF_SOURCES[r.source]?.badge || 'grey'} size='small' hierarchy='secondary'>
            {REF_SOURCES[r.source]?.short || '—'}
          </ColorfulBadge>
          <span style={{ fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-secondary, #636B72)' }}>
            {formatRange(r.range)}
          </span>
        </span>
      ),
    },
    {
      key: 'advice',
      label: 'คำแนะนำที่ระบบสร้าง',
      flex: true,
      minWidth: 320,
      sortable: false,
      render: (r) => (
        <span style={{ fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-alert-warning, #C2410C)' }}>{r.advice}</span>
      ),
    },
  ];

  return (
    <div className='grid grid-cols-1 xl:grid-cols-4 w-full' style={{ gap: 'var(--dim-space-600)' }}>
      <div className='xl:col-span-3 flex flex-col w-full' style={{ gap: 'var(--dim-space-600)' }}>
        <SectionHeader
          icon='fact_check'
          title='สรุปผลและข้อแนะนำ'
          subtitle='ระบบสร้างร่างสรุปและคำแนะนำจากรายการผิดปกติให้อัตโนมัติ — แพทย์แก้ไขได้ และระบบเก็บทั้งฉบับอัตโนมัติและฉบับที่แก้'
          trailing={(
            <BrandSubdueButton variant='outline' size='sm' leadingIcon='auto_awesome' disabled={locked} onClick={applyAuto}>
              สร้างร่างอัตโนมัติ
            </BrandSubdueButton>
          )}
        />

        <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-300)' }}>
          <StatTile label='รายการผิดปกติที่พบ' value={draft.findings.length} unit='รายการ' tone={draft.findings.length > 0 ? 'danger' : 'brand'} icon='error' />
          <StatTile label='ผลสรุปที่ระบบเสนอ' value={draft.verdict === 'normal' ? 'ปกติ' : 'ผิดปกติ'} tone={draft.verdict === 'normal' ? 'brand' : 'warning'} icon='rule' />
        </div>

        {draft.findings.length === 0 ? (
          <SubCard tone='success'>
            <div className='flex items-center' style={{ gap: 'var(--dim-space-300)' }}>
              <Icon name='check_circle' size={18} />
              <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm, 14px)' }}>
                ไม่พบรายการผิดปกติจากผลที่บันทึกไว้ — ระบบเสนอสรุปผลเป็น "ปกติ"
              </span>
            </div>
          </SubCard>
        ) : (
          <Table
            columns={findingColumns}
            rows={draft.findings}
            rowKey={(r) => r.code}
            emptyMessage='ไม่พบรายการผิดปกติ'
          />
        )}

        <SubCard>
          <SectionHeader icon='rule' title='สรุปผลการตรวจ' required />
          <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-600)' }}>
            <Radio
              name='summary-verdict'
              checked={form.summaryVerdict === 'normal'}
              onChange={() => setForm((f) => ({ ...f, summaryVerdict: 'normal' }))}
              disabled={locked}
              label='ปกติ'
            />
            <Radio
              name='summary-verdict'
              checked={form.summaryVerdict === 'abnormal'}
              onChange={() => setForm((f) => ({ ...f, summaryVerdict: 'abnormal' }))}
              disabled={locked}
              label='ผิดปกติ'
            />
            <div className='flex-1' />
            <VerdictBadge verdict={form.summaryVerdict} />
          </div>
          {form.summaryVerdict && form.summaryVerdict !== draft.verdict ? (
            <NoticeBar tone='warning' icon='warning'>
              {`ผลสรุปที่เลือก (${form.summaryVerdict === 'normal' ? 'ปกติ' : 'ผิดปกติ'}) ต่างจากที่ระบบแปลผลอัตโนมัติ (${draft.verdict === 'normal' ? 'ปกติ' : 'ผิดปกติ'}) — ระบบจะบันทึกทั้งสองค่าไว้`}
            </NoticeBar>
          ) : null}
        </SubCard>

        <SuggestibleTextarea
          voice
          label='สรุปผลการตรวจสุขภาพ'
          required
          value={form.summaryText || ''}
          disabled={locked}
          onChange={(e) => setForm((f) => ({ ...f, summaryText: e?.target ? e.target.value : e }))}
          placeholder='เช่น ผลการตรวจสุขภาพพบความผิดปกติ 3 รายการ ได้แก่ ความดันโลหิตสูง น้ำตาลในเลือดสูง และไขมันในเลือดสูง'
          suggestions={CHECKUP_SUMMARY_SUGGESTIONS}
          minChars={3}
        />

        <SuggestibleTextarea
          voice
          label='ข้อแนะนำสำหรับผู้รับบริการ'
          required
          value={form.adviceText || ''}
          disabled={locked}
          onChange={(e) => setForm((f) => ({ ...f, adviceText: e?.target ? e.target.value : e, adviceOverridden: true }))}
          placeholder='เช่น ควบคุมอาหาร ลดหวาน มัน เค็ม ออกกำลังกายสัปดาห์ละ 150 นาที และนัดติดตามที่คลินิก NCD ใน 1 เดือน'
          suggestions={CHECKUP_ADVICE_SUGGESTIONS}
          minChars={3}
        />

        {form.adviceAuto ? (
          <SubCard tone='info'>
            <SectionHeader
              icon='auto_awesome'
              title='คำแนะนำฉบับที่ระบบสร้างอัตโนมัติ (เก็บไว้เทียบ)'
              subtitle={overridden ? 'แพทย์แก้ไขคำแนะนำแล้ว — ระบบเก็บทั้งสองเวอร์ชัน' : 'ยังไม่มีการแก้ไขจากฉบับอัตโนมัติ'}
              trailing={overridden ? <ColorfulBadge style='yellow' size='small' hierarchy='secondary'>แพทย์แก้ไขแล้ว</ColorfulBadge> : null}
            />
            <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-secondary, #636B72)', whiteSpace: 'pre-wrap' }}>
              {form.adviceAuto}
            </span>
          </SubCard>
        ) : null}

        {regenerated ? (
          <NoticeBar tone='success' icon='check_circle'>
            สร้างร่างสรุปผลและคำแนะนำอัตโนมัติแล้ว — ตรวจสอบและแก้ไขได้ตามดุลพินิจของแพทย์
          </NoticeBar>
        ) : null}

        <div
          className='flex items-center flex-wrap w-full'
          style={{
            gap: 'var(--dim-space-300)',
            paddingTop: 'var(--dim-space-400)',
            borderTop: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
          }}
        >
          <NeutralSubdueButton size='lg' leadingIcon='print' onClick={() => { if (typeof window !== 'undefined') window.print(); }}>
            พิมพ์แบบบันทึกผลตรวจ
          </NeutralSubdueButton>
          <div className='flex-1' />
          {saved ? (
            <ColorfulBadge style='green' size='default' hierarchy='secondary' icon='check_circle'>
              บันทึกผลตรวจแล้ว
            </ColorfulBadge>
          ) : (
            <BrandSubdueButton
              variant='fill'
              size='lg'
              leadingIcon='save'
              disabled={locked || !form.summaryVerdict || !(form.summaryText || '').trim()}
              onClick={onConfirmSave}
            >
              ยืนยันบันทึกผลตรวจสุขภาพ
            </BrandSubdueButton>
          )}
        </div>
      </div>

      <div className='xl:col-span-1 flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
        <EmrLinkPanel hn={visit?.hn} />
        <SubCard tone='brand'>
          <SectionHeader icon='summarize' title='ขั้นตอนถัดไป' />
          <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-secondary, #636B72)' }}>
            หลังบันทึกผลตรวจแล้ว ระบบจะสร้างรายงานผลรายบุคคลหน้าเดียวให้แพทย์ตรวจสอบและอนุมัติ
            ก่อนส่งถึงผู้รับบริการ
          </span>
        </SubCard>
      </div>
    </div>
  );
};

export const CHECKUP_RECORD_STEPS = [
  { title: 'สัญญาณชีพและการวัด', subtitle: 'Vital Signs' },
  { title: 'ผลตรวจรายรายการ', subtitle: 'Investigations' },
  { title: 'การตรวจร่างกาย', subtitle: 'Physical Exam' },
  { title: 'สรุปผลและข้อแนะนำ', subtitle: 'Summary & Advice' },
];

export const CHECKUP_RECORD_RENDERERS = [
  CheckupStep1Vitals, CheckupStep2Results, CheckupStep3Physical, CheckupStep4Summary,
];

/** Which steps count as complete (drives the stepper's success ticks). */
export const getCheckupRecordCompletedSteps = (form, stepIndex) => {
  const v = form.vitals || {};
  const done = [];
  if (v.weight && v.height && v.sbp && v.dbp) done.push(0);
  if (Object.values(form.results || {}).some((x) => x !== '' && x != null)) done.push(1);
  if (form.physical?.overall) done.push(2);
  if (form.summaryVerdict && (form.summaryText || '').trim()) done.push(3);
  return done.filter((i) => i !== stepIndex);
};

/** Codes used by the history compare table so both agree on what "key" means. */
export const recordHasAnyValue = (record) => {
  if (!record) return false;
  const v = record.vitals || {};
  return Object.values(v).some((x) => x !== '' && x != null)
    || Object.values(record.results || {}).some((x) => x !== '' && x != null);
};

export const describeItem = (code) => findCatalogItem(code)?.name || code;
