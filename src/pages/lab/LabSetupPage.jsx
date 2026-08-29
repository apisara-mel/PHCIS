import React, { useEffect, useMemo, useState } from 'react';
import QueuePageShell from '@/templates/QueuePageShell';
import { SummaryCard } from '@/components/layout/SummaryCardsBar';
import PrimarySearch from '@/components/search/PrimarySearch';
import useSearchHistory from '@/components/search/useSearchHistory';
import { FilterDropdown } from '@/components/forms/FilterTag';
import ClearFiltersTag, { SmoothFilterResults } from '@/components/forms/ClearFiltersTag';
import useSmoothClearFilters from '@/hooks/useSmoothClearFilters';
import Icon from '@/components/icons/Icon';
import Badge from '@/components/badge/Badge';
import BrandButton from '@/components/button/BrandButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueIconButton from '@/components/button/NeutralSubdueIconButton';
import InputField from '@/components/forms/InputField';
import Select from '@/components/forms/Select';
import Checkbox from '@/components/checkbox/Checkbox';
import Radio from '@/components/radio/Radio';
import Popup from '@/components/popup/Popup';
import Table from '@/components/table/Table';
import SuccessToast from '@/components/toast/SuccessToast';
import LabTubeDot from '@/pages/lab/LabTubeDot';
import { SpecimenSticker, groupRowsByTube } from '@/components/lab/LabSpecimenLabel';
import { MIH_TOPBAR_OFFSET } from '@/hooks/useHeaderAutoHide';
import SYSTEM_NAV from '@/pages/system/systemNav';
import { LAB_ORDERS, withTestLabel } from '@/data/labOrders';
import {
  LAB_STICKER_FIELDS, getPrintSettings, isStickerFieldOn,
  setStickerField, setPrintSetting, subscribePrintSettings,
} from '@/data/labPrintSettings';
import {
  LAB_TESTS, LAB_GROUPS, LAB_TUBES, LAB_TUBE_LIST, LAB_RESULT_TYPES, LAB_RIGHTS,
  getTube, subscribeCatalog, upsertLabTest, setLabTestRetired,
} from '@/data/labCatalog';

/* ตั้งค่ารายการตรวจทางห้องปฏิบัติการ (Lab test catalog Setup).

   Modelled on the MyHOSPITAL Setup screen the team photographed into
   `Lab dicussion with team.pdf` (IMG_3945–3949, Kaebrain folder of the
   MIH-Docs-Vault vault) and documented in `คู่มือการใช้งาน - Lab.pdf`
   §"ตั้งค่ารายการตรวจ". Every field below is one the vendor screen has:

     รหัสรายการ · ชื่อ
     ชนิด: ◉ ITEM  ○ PANEL or PROFILE
     กลุ่ม: HEMATOLOGY / MICROSCOPY / BIOCHEMISTRY / BLOOD BANK /
            IMMUNOLOGY / MICROBIOLOGY / PATHOLOGY
     รหัสมาตรฐาน: รหัส TMLT · LOINC NUM · รหัส ICD10TM · รหัส OPBKK
     ราคาต้นทุน / ราคาขาย / ราคาที่เรียกเก็บ
     สิ่งส่งตรวจ + สีจุก (colour swatch row)
     ประเภทการรายงานผล: ○ จำนวน (ค่าปกติ 2 ค่าช่วง) ○ ข้อความ ◉ กำหนดเอง
                          (an editable Negative / Trace / Positive list)

   Two decisions from the team steer this away from a literal clone:

     • "เราใช้รหัส tmlt" — TMLT is the canonical code, so it leads the
       standard-codes row and is the only one marked required. LOINC and
       ICD10TM are secondary mappings.
     • "สร้าง Profile เหมือนเป็นการสร้าง Group" — choosing PANEL turns the
       analyte list into a profile builder, because in this system a profile
       IS a group of items rather than a separate concept.

   And one the team asked for on top of the vendor screen:
     • "ต้องเซ็ตเป็นชุดเซ็ตของ Lab ตาม สร้างเป็น column guide ไว้เฉพาะๆ" —
       hence the TMLT reference strip on each row and the "ดู TMLT" button on
       the รหัสมาตรฐาน card of the add/edit form, so whoever keys a code can
       check it against the national terminology without leaving the screen. */

const breadcrumb = ['จัดการระบบ', 'ทะเบียนรายการตรวจ'];

/* Links.md in the Kaebrain folder: the open-source Thai lab terminology
   browser the team uses to look codes up. */
const TMLT_BROWSER_URL = 'https://tmlt-browser.this.or.th/browser?domain=Main';

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

/* ทุกช่องกรอกในหน้านี้ต้อง alias มาจาก field ของ design system ไม่ใช่ <input>
   ที่จัดสไตล์เอง (มติผู้ใช้ 29 ส.ค. 69) — ของเดิมเป็น <input>/<select> เปล่า
   จึงได้ focus ring ฟ้าของเบราว์เซอร์และไม่มี state hover/error/disabled ตาม
   โทเคน. ตัวห่อสามตัวนี้คงลายเซ็นเดิมไว้ (label/value/onChange/hint/mono)
   หน้าจึงเรียกใช้เหมือนเดิมทุกจุด เปลี่ยนแค่ของข้างใน */

const MONO_INPUT_STYLE = { fontFamily: 'var(--type-family-mono, monospace)' };

const TextField = ({ label, value, onChange, placeholder, required, hint, mono }) => (
  <InputField
    label={label}
    required={required}
    helperText={hint}
    placeholder={placeholder}
    size='md'
    value={value ?? ''}
    onChange={onChange}
    inputStyle={mono ? MONO_INPUT_STYLE : undefined}
  />
);

const NumberField = ({ label, value, onChange, suffix, required }) => (
  <InputField
    label={label}
    required={required}
    helperText={suffix}
    type='number'
    min='0'
    size='md'
    placeholder='0'
    value={String(value ?? 0)}
    onChange={(v) => onChange(Number(v) || 0)}
  />
);

const SelectField = ({ label, value, onChange, options, required }) => (
  <Select
    label={label}
    required={required}
    size='md'
    value={value}
    onChange={onChange}
    options={options}
  />
);

/* Radio row — the vendor screen's ◉ ITEM ○ PANEL and its result-type row are
   both single-choice pills, so one control serves both. */
const RadioRow = ({ label, options, value, onChange }) => (
  <div className='flex flex-col' style={{ gap: 'var(--dim-space-200)' }}>
    <span className='text-xs text-ink-secondary'>{label}</span>
    <div className='flex flex-wrap' style={{ gap: 'var(--dim-space-400)' }}>
      {options.map((o) => (
        <Radio
          key={o.value}
          name={label}
          value={o.value}
          label={o.label}
          description={o.hint}
          checked={value === o.value}
          onChange={() => onChange(o.value)}
        />
      ))}
    </div>
  </div>
);

/* สิ่งส่งตรวจ + สีจุก — the vendor screen shows this as a row of coloured
   swatches. Picking one here is what wires the team's rule "ถ้าเลือก Heme
   สีหลอดจะ auto เปลี่ยนตาม": every consumer derives the colour from this
   choice, so it is set once, on the catalog entry, and never per order. */
const TubePicker = ({ value, onChange, label = 'สิ่งส่งตรวจ + สีจุก', allowNone = false }) => (
  <div className='flex flex-col' style={{ gap: 'var(--dim-space-200)' }}>
    <span className='text-xs text-ink-secondary'>{label}</span>
    <div className='flex flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
      {allowNone && (
        <button
          type='button'
          onClick={() => onChange(null)}
          className='inline-flex items-center'
          style={{
            gap: 'var(--dim-space-150)',
            minHeight: 'var(--dim-size-700, 36px)',
            paddingTop: 'var(--dim-space-200)',
            paddingRight: 'var(--dim-space-300)',
            paddingBottom: 'var(--dim-space-200)',
            paddingLeft: 'var(--dim-space-300)',
            background: value == null ? 'var(--surface-brandPrimary-quaternary)' : 'var(--surface-card-100)',
            border: `var(--dim-stroke-100) solid ${value == null ? 'var(--border-brandPrimary-default)' : 'var(--border-card-default)'}`,
            borderRadius: 'var(--dim-radius-200)',
            fontSize: 'var(--type-size-sm)',
            color: 'var(--text-content-secondary)',
            cursor: 'pointer',
          }}
        >
          ไม่กำหนด
        </button>
      )}
      {LAB_TUBE_LIST.map((t) => {
        const selected = value === t.key;
        return (
          <button
            key={t.key}
            type='button'
            onClick={() => onChange(t.key)}
            title={`${t.thai} · ${t.additive} · ${t.volumeMl} mL`}
            className='inline-flex items-center'
            style={{
              gap: 'var(--dim-space-200)',
              minHeight: 'var(--dim-size-700, 36px)',
              paddingTop: 'var(--dim-space-200)',
              paddingRight: 'var(--dim-space-300)',
              paddingBottom: 'var(--dim-space-200)',
              paddingLeft: 'var(--dim-space-300)',
              background: selected ? 'var(--surface-brandPrimary-quaternary)' : 'var(--surface-card-100)',
              border: `var(--dim-stroke-100) solid ${selected ? 'var(--border-brandPrimary-default)' : 'var(--border-card-default)'}`,
              borderRadius: 'var(--dim-radius-200)',
              cursor: 'pointer',
            }}
          >
            <span
              aria-hidden
              style={{
                width: 14, height: 14,
                borderRadius: 'var(--dim-radius-full, 9999px)',
                background: t.color,
                boxShadow: '0 0 0 1px var(--surface-card-100, #FFFFFF)',
              }}
            />
            <span className='text-sm' style={{ color: selected ? 'var(--text-brandPrimary-default)' : 'var(--text-content-secondary)' }}>
              {t.thai}
            </span>
          </button>
        );
      })}
    </div>
  </div>
);

/* A blank entry, shaped exactly like a catalog row so the form never has to
   special-case "new". */
const blankTest = () => ({
  id: '',
  code: '',
  type: 'item',
  nameEn: '',
  nameFull: '',
  nameTh: '',
  group: 'biochemistry',
  tubeKey: 'clot',
  altTubeKey: null,
  tubeCount: 1,
  fastingHours: 0,
  resultType: 'numeric',
  price: 0,
  costPrice: 0,
  chargePrice: 0,
  tmlt: '',
  loinc: '',
  icd10tm: '',
  opbkk: '',
  confidential: false,
  analytes: [{ key: 'value', label: '', unit: '', normalRange: '' }],
});

const LabSetupPage = () => {
  /* Re-render on catalog writes — the store is module-level mutable state,
     so a version counter is what turns a mutation into a render. */
  const [version, setVersion] = useState(0);
  useEffect(() => subscribeCatalog(() => setVersion((v) => v + 1)), []);

  /* Sticker settings live in their own store (labPrintSettings.js) because
     the sticker layout is not a property of any one test. */
  const [printVersion, setPrintVersion] = useState(0);
  useEffect(() => subscribePrintSettings(() => setPrintVersion((v) => v + 1)), []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const printSettings = useMemo(() => getPrintSettings(), [printVersion]);

  /* Preview uses a real order — the first one with more than one test on a
     tube, so the preview exercises the multi-test case rather than the
     easy one. */
  const previewGroup = useMemo(() => {
    const rows = LAB_ORDERS.map(withTestLabel);
    const groups = groupRowsByTube(rows);
    return groups.find((g) => g.rows.length > 1) ?? groups[0] ?? null;
  }, []);

  const [query, setQuery] = useState('');
  /* '' = ไม่กรอง (ชิปตัวกรองใช้ค่าว่างเป็น "ทั้งหมด" เหมือนหน้าอื่นในโมดูล) */
  const [groupFilter, setGroupFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [tubeFilter, setTubeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const { history: searchHistory, push: pushSearchHistory, clear: clearSearchHistory } =
    useSearchHistory('mih:primarysearch-history:lab-registry');
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(null);
  const [saved, setSaved] = useState(false);
  /* Which analyte's reference/critical block is open — only one at a time,
     since the block is tall and comparing two rarely helps. */
  const [expandedAnalyte, setExpandedAnalyte] = useState(null);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  /* ตัวกรองเป็นชิป (FilterTag) เท่าที่หัวคอลัมน์ต้องการจริง — กลุ่ม · ชนิด ·
     สิ่งส่งตรวจ · สถานะ (มติผู้ใช้ 29 ส.ค. 69) รหัสรายการ/TMLT/ราคาไม่ทำเป็นชิป
     เพราะเป็นค่าเฉพาะรายการ หาได้จากช่องค้นหาอยู่แล้ว */
  const filtersActive = !!(groupFilter || typeFilter || tubeFilter || statusFilter);
  const { showClearChip, resultsOpaque, clearFilters } = useSmoothClearFilters(
    filtersActive,
    () => { setGroupFilter(''); setTypeFilter(''); setTubeFilter(''); setStatusFilter(''); },
  );

  const rows = useMemo(() => LAB_TESTS
    .filter((t) => !groupFilter || t.group === groupFilter)
    .filter((t) => !typeFilter || (typeFilter === 'panel' ? t.type === 'panel' : t.type !== 'panel'))
    .filter((t) => !tubeFilter || t.tubeKey === tubeFilter)
    .filter((t) => !statusFilter || (statusFilter === 'retired' ? !!t.retired : !t.retired))
    .filter((t) => {
      const q = query.trim().toLowerCase();
      if (!q) return true;
      return [t.code, t.nameEn, t.nameTh, t.nameFull, t.tmlt, t.loinc]
        .some((f) => String(f ?? '').toLowerCase().includes(q));
    }),
  /* `version` is the dependency that matters — LAB_TESTS is mutated in
     place, so its identity never changes. */
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [query, groupFilter, typeFilter, tubeFilter, statusFilter, version]);

  /* The edit form renders far below the catalog list, so opening it without
     moving the viewport reads as "nothing happened". Scroll it into view on
     the next frame, once the form has actually rendered. */
  const startEdit = (test) => {
    setEditingId(test.id);
    /* Deep-copy the analytes so editing the draft doesn't mutate the stored
       entry before the user saves. */
    setForm({ ...test, analytes: (test.analytes ?? []).map((a) => ({ ...a })) });
  };

  const startNew = () => {
    setEditingId('new');
    setForm(blankTest());
  };

  const cancelEdit = () => { setEditingId(null); setForm(null); };

  const handleSave = () => {
    if (!form) return;
    /* A new entry gets its id from the code the user typed, lower-cased and
       prefixed the same way the seed catalog is keyed. */
    const id = form.id || `lab-${(form.code || form.nameEn).toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    upsertLabTest({ ...form, id });
    setSaved(true);
    cancelEdit();
  };

  /* การ์ดสรุปหัวหน้า — นับจากทะเบียนทั้งหมด ไม่ใช่ผลค้นหา เพราะเป็นภาพรวม
     ของทะเบียน ไม่ใช่ของตัวกรองที่เพิ่งพิมพ์ (มติผู้ใช้ 29 ส.ค. 69) */
  const summaryCards = useMemo(() => {
    const all = LAB_TESTS;
    const live = all.filter((t) => !t.retired);
    return [
      { key: 'total',   icon: 'biotech',        color: 'info',     value: String(all.length), label: 'รายการตรวจทั้งหมด' },
      { key: 'item',    icon: 'labs',           color: 'brand',    value: String(live.filter((t) => t.type !== 'panel').length), label: 'รายการเดี่ยว (ITEM)' },
      { key: 'panel',   icon: 'fact_check',     color: 'positive', value: String(live.filter((t) => t.type === 'panel').length), label: 'ชุดตรวจ (PANEL/PROFILE)' },
      { key: 'retired', icon: 'block',          color: 'warning',  value: String(all.filter((t) => t.retired).length), label: 'ยกเลิกใช้งาน' },
    ];
  /* LAB_TESTS ถูกแก้ในที่ — `version` คือ dependency ที่เปลี่ยนจริง */
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version]);

  /* คอลัมน์ทะเบียนรายการตรวจ — ใช้ <Table> กลางของระบบเหมือนทะเบียนยา
     (มติผู้ใช้ 29 ส.ค. 69) ของเดิมเป็นการ์ดแถวที่จัดสไตล์เอง จึงไม่มีหัวคอลัมน์
     ให้อ่าน ไม่มีการเรียงลำดับ และไม่มีหน้าแบ่งเมื่อรายการยาว */
  const catalogColumns = [
    {
      key: 'code',
      label: 'รหัสรายการ',
      minWidth: 96,
      /* รหัสรายการอ่านเป็นข้อมูลในตาราง ไม่ใช่โค้ด — ใช้ Sarabun ตัวเดียวกับ
         ทั้งตาราง (มติผู้ใช้ 29 ส.ค. 69) ของเดิมเป็น monospace เลยหลุดจาก
         ตัวอักษรของคอลัมน์อื่น */
      render: (t) => (
        <span style={{ fontFamily: 'var(--type-family-body)', color: 'var(--text-content-tertiary)' }}>
          {t.code}
        </span>
      ),
    },
    {
      key: 'name',
      label: 'ชื่อรายการตรวจ',
      flex: true,
      minWidth: 240,
      render: (t) => (
        <div className='flex flex-col min-w-0'>
          <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
            <span className='truncate' style={{ fontWeight: 'var(--type-weight-bold)' }}>{t.nameEn}</span>
            {t.retired ? <Badge style='neutral' size='small'>ยกเลิกใช้งาน</Badge> : null}
            {t.confidential ? (
              <span title='ผลเป็นความลับ — ปกปิดตาม TOR §1.15.2.4' style={{ color: 'var(--text-content-quaternary)' }}>
                <Icon name='lock' size={14} />
              </span>
            ) : null}
          </div>
          <span className='truncate' style={{ color: 'var(--text-content-tertiary)', fontSize: 'var(--type-size-xs)' }}>
            {t.nameTh}
          </span>
        </div>
      ),
    },
    {
      key: 'type',
      label: 'ชนิด',
      align: 'center',
      render: (t) => (
        <Badge style={t.type === 'panel' ? 'info' : 'neutral'} size='small'>
          {t.type === 'panel' ? `PANEL · ${t.analytes?.length ?? 0}` : 'ITEM'}
        </Badge>
      ),
    },
    {
      key: 'group',
      label: 'กลุ่ม',
      render: (t) => LAB_GROUPS.find((g) => g.key === t.group)?.code ?? '—',
    },
    {
      key: 'tube',
      label: 'สิ่งส่งตรวจ',
      sortable: false,
      render: (t) => <LabTubeDot tube={getTube(t)} count={t.tubeCount} size={9} />,
    },
    {
      /* "column guide" ที่ทีมขอ — รหัสมาตรฐานอยู่บนทุกแถว ไม่ต้องเปิดฟอร์มดู */
      key: 'tmlt',
      label: 'รหัส TMLT',
      render: (t) => (
        <span
          style={{ fontFamily: 'var(--type-family-mono, monospace)', color: 'var(--text-content-tertiary)' }}
          title={`TMLT ${t.tmlt}${t.loinc ? ` · LOINC ${t.loinc}` : ''}`}
        >
          {t.tmlt || '—'}
        </span>
      ),
    },
    {
      key: 'price',
      label: 'ราคา (บาท)',
      align: 'center',
      render: (t) => (t.price ?? 0).toLocaleString('th-TH'),
    },
    {
      key: 'actions',
      label: 'การดำเนินการ',
      align: 'center',
      sortable: false,
      render: (t) => (
        <div className='inline-flex items-center' style={{ gap: 'var(--dim-space-150)' }}>
          <NeutralSubdueIconButton
            icon='edit'
            variant='outline'
            size='sm'
            aria-label={`แก้ไข ${t.nameEn}`}
            onClick={(e) => { e.stopPropagation(); startEdit(t); }}
          />
          <NeutralSubdueIconButton
            icon={t.retired ? 'restart_alt' : 'block'}
            variant='outline'
            size='sm'
            aria-label={t.retired ? `เปิดใช้งาน ${t.nameEn}` : `ยกเลิกใช้งาน ${t.nameEn}`}
            title={t.retired ? 'เปิดใช้งานอีกครั้ง' : 'ยกเลิกใช้งาน (ไม่ลบ เพื่อให้ผลเดิมยังอ้างอิงได้)'}
            onClick={(e) => { e.stopPropagation(); setLabTestRetired(t.id, !t.retired); }}
          />
        </div>
      ),
    },
  ];

  const isPanel = form?.type === 'panel';

  /* Analyte list editing — for an ITEM this is the single value it reports;
     for a PANEL it is the profile's member list ("สร้าง Profile เหมือนเป็น
     การสร้าง Group"). */
  const setAnalyte = (i, key, value) => setForm((prev) => ({
    ...prev,
    analytes: prev.analytes.map((a, idx) => (idx === i ? { ...a, [key]: value } : a)),
  }));
  const addAnalyte = () => setForm((prev) => ({
    ...prev,
    analytes: [...prev.analytes, { key: `v${prev.analytes.length + 1}`, label: '', unit: '', normalRange: '' }],
  }));
  const removeAnalyte = (i) => setForm((prev) => ({
    ...prev,
    analytes: prev.analytes.filter((_, idx) => idx !== i),
  }));

  return (
    <>
    {/* หน้านี้เป็นของ "ระบบจัดการระบบ" — ใช้ QueuePageShell ตัวเดียวกับหน้าอื่น
        ในโมดูล (มติผู้ใช้ 29 ส.ค. 69) ชื่อหน้าและปุ่มหลักจึงอยู่ที่ SubHeader
        ตำแหน่งเดียวกับศูนย์บริการ · วันหยุดประจำปี · สิทธิ์การเข้าถึงระบบ
        ของเดิมประกอบ Sidebar+Header เอง ชื่อหน้าเลยไปโผล่กลางหน้าในการ์ด */}
    <QueuePageShell
      activeKey='system-lab-registry'
      sidebarItems={SYSTEM_NAV}
      sidebarFallbackKey='system-overview'
      brandTitle='จัดการระบบ'
      breadcrumb={breadcrumb}
      title='ทะเบียนรายการตรวจ'
      headerInfo={(
        <section className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
          <div className='flex items-stretch flex-wrap w-full' style={{ gap: 'var(--dim-space-400)' }}>
            {summaryCards.map((c) => <SummaryCard key={c.key} card={c} variant='panel' />)}
          </div>
        </section>
      )}
      actions={(
        <BrandButton variant='fill' size='md' leadingIcon='add' onClick={startNew}>
          เพิ่มรายการตรวจ
        </BrandButton>
      )}
    >
        <div className='flex flex-col flex-1 min-w-0' style={{ padding: 'var(--dim-space-600)', gap: 'var(--dim-space-500)' }}>
          {/* ─── Catalog list ─── */}
          <SectionCard
            icon='biotech'
            title='รายการตรวจในทะเบียน'
            subtitle={`${LAB_TESTS.length} รายการในระบบ · รหัสมาตรฐานที่ใช้อ้างอิงคือ TMLT`}
          >
            {/* กล่องค้นหาเป็น PrimarySearch กึ่งกลางการ์ด ตำแหน่งเดียวกับหน้าอื่น
                (ตำแหน่ง · เวชระเบียน · ทะเบียนยา) — มติผู้ใช้ 29 ส.ค. 69 */}
            <div className='w-full flex items-center' style={{ gap: 'var(--dim-space-300)' }}>
              <div className='flex-1' />
              <PrimarySearch
                value={query}
                onChange={setQuery}
                onSubmit={(q) => { if (q && q.trim()) pushSearchHistory(q.trim()); }}
                placeholder='ค้นหารหัสรายการ · ชื่อ · รหัส TMLT · LOINC'
                width={640}
                history={searchHistory}
                onHistoryClear={searchHistory.length > 0 ? clearSearchHistory : undefined}
              />
              <div className='flex-1' />
            </div>

            <div className='flex items-center justify-between w-full flex-wrap' style={{ gap: 'var(--dim-space-300)' }}>
              <div className='flex items-center min-w-0 flex-wrap' style={{ gap: 'var(--dim-space-300)' }}>
                <FilterDropdown
                  prefix='กลุ่ม:'
                  options={LAB_GROUPS.map((g) => ({ value: g.key, label: `${g.thai} (${g.code})` }))}
                  value={groupFilter}
                  onChange={setGroupFilter}
                  placeholder='ทุกกลุ่ม'
                />
                <FilterDropdown
                  prefix='ชนิด:'
                  options={[
                    { value: 'item', label: 'รายการเดี่ยว (ITEM)' },
                    { value: 'panel', label: 'ชุดตรวจ (PANEL/PROFILE)' },
                  ]}
                  value={typeFilter}
                  onChange={setTypeFilter}
                  placeholder='ทุกชนิด'
                />
                <FilterDropdown
                  prefix='สิ่งส่งตรวจ:'
                  options={LAB_TUBE_LIST.map((t) => ({ value: t.key, label: t.thai }))}
                  value={tubeFilter}
                  onChange={setTubeFilter}
                  placeholder='ทุกสิ่งส่งตรวจ'
                />
                <FilterDropdown
                  prefix='สถานะ:'
                  options={[
                    { value: 'active', label: 'ใช้งานอยู่' },
                    { value: 'retired', label: 'ยกเลิกใช้งาน' },
                  ]}
                  value={statusFilter}
                  onChange={setStatusFilter}
                  placeholder='ทุกสถานะ'
                />
                <ClearFiltersTag active={showClearChip} onClear={clearFilters} />
              </div>
              <Badge style='neutral' size='small'>{`${rows.length} รายการ`}</Badge>
            </div>

            <SmoothFilterResults opaque={resultsOpaque}>
            <Table
              columns={catalogColumns}
              rows={rows}
              rowKey={(t) => t.id}
              onRowClick={startEdit}
              emptyMessage={query || filtersActive
                ? 'ไม่พบรายการตรวจที่ตรงกับเงื่อนไข'
                : 'ยังไม่มีรายการในทะเบียน'}
              emptySubtext={query || filtersActive ? 'ลองล้างตัวกรองหรือแก้คำค้นหา' : null}
            />
            </SmoothFilterResults>
          </SectionCard>

          {/* ─── Sticker configuration ─── */}
          {/* TOR §1.15.5.1 — "สามารถกำหนดข้อมูลบนสติกเกอร์ Lab ได้ตามเงื่อนไข
              ที่สำนักอนามัยกำหนด". The field set is configuration, not a
              fixed layout, so it lives here rather than in the sticker
              component. Two fields are locked on: without an accession
              barcode and a patient identifier a tube is untraceable, which
              is a patient-safety failure rather than a formatting choice. */}
          <SectionCard
            icon='barcode'
            title='ข้อมูลบนสติกเกอร์ Lab'
            subtitle='เลือกว่าจะให้พิมพ์ข้อมูลใดลงบนสติกเกอร์ติดหลอด — รายการที่ล็อกไว้คือตัวระบุที่จำเป็นต่อความปลอดภัยผู้ป่วย'
            action={<Badge style='neutral' size='small'>{printSettings.enabled.length} / {LAB_STICKER_FIELDS.length} รายการ</Badge>}
          >
            <div className='grid grid-cols-1 md:grid-cols-3 gap-3 w-full'>
              {LAB_STICKER_FIELDS.map((f) => {
                const on = isStickerFieldOn(f.key);
                return (
                  <label
                    key={f.key}
                    className='flex items-start cursor-pointer'
                    style={{
                      gap: 'var(--dim-space-200)',
                      background: on ? 'var(--surface-brandPrimary-quaternary)' : 'var(--surface-card-100)',
                      border: `var(--dim-stroke-100) solid ${on ? 'var(--border-brandPrimary-default)' : 'var(--border-card-default)'}`,
                      borderRadius: 'var(--dim-radius-200)',
                      paddingTop: 'var(--dim-space-300)',
                      paddingRight: 'var(--dim-space-300)',
                      paddingBottom: 'var(--dim-space-300)',
                      paddingLeft: 'var(--dim-space-300)',
                      cursor: f.required ? 'not-allowed' : 'pointer',
                      opacity: f.required ? 0.85 : 1,
                    }}
                  >
                    <Checkbox
                      checked={on}
                      disabled={f.required}
                      onChange={(next) => setStickerField(f.key, next)}
                    />
                    <span className='flex flex-col min-w-0'>
                      <span className='text-sm' style={{ fontWeight: 'var(--type-weight-medium)', color: on ? 'var(--text-brandPrimary-default)' : 'var(--text-content-primary)' }}>
                        {f.label}{f.required && ' 🔒'}
                      </span>
                      {f.hint && <span className='text-xs text-ink-tertiary'>{f.hint}</span>}
                    </span>
                  </label>
                );
              })}
            </div>

            <div className='grid grid-cols-1 md:grid-cols-2 gap-3 w-full'>
              <TextField
                label='ชื่อหน่วยบริการที่พิมพ์บนสติกเกอร์'
                value={printSettings.siteName}
                onChange={(v) => setPrintSetting('siteName', v)}
              />
              <NumberField
                label='จำนวนสติกเกอร์ต่อหลอด'
                suffix='ใบ · บางหน่วยติดทั้งหลอดและใบส่งตรวจ'
                value={printSettings.copiesPerTube}
                onChange={(v) => setPrintSetting('copiesPerTube', Math.max(1, v))}
              />
            </div>

            {/* Live preview — the point of a configurable label is seeing
                what the change did, and a sticker is small enough to show
                inline. Uses a real worklist row so the preview reflects
                actual data rather than lorem. */}
            {previewGroup && (
              <div className='flex flex-col' style={{ gap: 'var(--dim-space-200)' }}>
                <span className='text-xs text-ink-secondary'>ตัวอย่างสติกเกอร์</span>
                <div
                  style={{
                    background: '#FFFFFF',
                    border: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary)',
                    borderRadius: 'var(--dim-radius-200)',
                    paddingTop: 'var(--dim-space-400)',
                    paddingRight: 'var(--dim-space-400)',
                    paddingBottom: 'var(--dim-space-400)',
                    paddingLeft: 'var(--dim-space-400)',
                    overflowX: 'auto',
                  }}
                >
                  <SpecimenSticker group={previewGroup} settings={printSettings} />
                </div>
              </div>
            )}
          </SectionCard>

          {/* ─── Edit form ─── */}
          {/* กด "เพิ่มรายการตรวจ" หรือไอคอนแก้ไขบนแถว → เปิดเป็น popup
              (มติผู้ใช้ 29 ส.ค. 69) ของเดิมต่อท้ายหน้าแล้วเลื่อนจอลงไปหา
              ทำให้ทะเบียนกับฟอร์มปนกันในหน้าเดียวและหาที่บันทึกไม่เจอ */}
          <Popup
            open={!!form}
            onClose={cancelEdit}
            size='extraLarge'
            title={editingId === 'new' ? 'เพิ่มรายการตรวจใหม่' : `แก้ไข ${form?.nameEn || form?.code || ''}`}
            secondaryAction={{ label: 'ยกเลิก', onClick: cancelEdit }}
            primaryAction={{
              label: 'บันทึกรายการตรวจ',
              onClick: handleSave,
              disabled: !form?.code || !form?.nameEn || !form?.nameTh || !form?.tmlt,
            }}
          >
            {form && (
            <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-500)' }}>
              <SectionCard
                icon='edit'
                title='ข้อมูลพื้นฐาน'
                subtitle='ข้อมูลพื้นฐานและการจัดกลุ่ม — กลุ่มตรวจเป็นตัวกำหนดหลอด/สีจุกที่ระบบจะใช้อัตโนมัติ'
              >
                <div className='grid grid-cols-1 md:grid-cols-4 gap-3 w-full'>
                  <TextField label='รหัสรายการ' required mono value={form.code} onChange={(v) => setField('code', v)} placeholder='เช่น L000009' />
                  <TextField label='ชื่อ (ย่อ/ที่ใช้เรียก)' required value={form.nameEn} onChange={(v) => setField('nameEn', v)} placeholder='เช่น HbA1c' />
                  <TextField label='ชื่อเต็ม (FSN)' value={form.nameFull} onChange={(v) => setField('nameFull', v)} placeholder='เช่น Hemoglobin A1c / Hb.total' />
                  <TextField label='ชื่อภาษาไทย' required value={form.nameTh} onChange={(v) => setField('nameTh', v)} placeholder='เช่น น้ำตาลสะสมในเลือด' />
                </div>

                <div className='grid grid-cols-1 md:grid-cols-2 gap-4 w-full'>
                  {/* ◉ ITEM ○ PANEL or PROFILE — the vendor screen's own
                      wording, kept verbatim so anyone moving between the two
                      systems recognises it. */}
                  <RadioRow
                    label='ชนิด'
                    value={form.type}
                    onChange={(v) => setField('type', v)}
                    options={[
                      { value: 'item', label: 'ITEM', hint: 'รายการเดี่ยว — รายงานค่าเดียว' },
                      { value: 'panel', label: 'PANEL or PROFILE', hint: 'ชุดตรวจ — รวมหลายรายการย่อย' },
                    ]}
                  />
                  <SelectField
                    label='กลุ่ม'
                    required
                    value={form.group}
                    onChange={(v) => setField('group', v)}
                    options={LAB_GROUPS.map((g) => ({ value: g.key, label: `${g.code} — ${g.thai}` }))}
                  />
                </div>
              </SectionCard>

              <SectionCard
                icon='qr_code_2'
                title='รหัสมาตรฐาน'
                subtitle='ทีมกำหนดให้ใช้รหัส TMLT เป็นรหัสอ้างอิงหลัก — LOINC / ICD10TM / OPBKK เป็นรหัสเทียบเคียง'
                /* ย้ายจากหัวหน้าทะเบียนมาไว้ตรงนี้ 29 ส.ค. 69 (มติผู้ใช้) — คนเปิด
                   TMLT Browser คือคนที่กำลังกรอกรหัส ไม่ใช่คนที่มาดูรายการ
                   ฐานข้อมูลระดับชาติ ไม่ใช่หน้าจอในระบบ จึงเปิดแท็บใหม่ */
                action={(
                  <BrandSubdueButton
                    variant='outline'
                    size='sm'
                    trailingIcon='open_in_new'
                    onClick={() => window.open(TMLT_BROWSER_URL, '_blank', 'noopener,noreferrer')}
                  >
                    ดู TMLT (ฐานข้อมูลรหัสมาตรฐาน)
                  </BrandSubdueButton>
                )}
              >
                <div className='grid grid-cols-1 md:grid-cols-4 gap-3 w-full'>
                  <TextField
                    label='รหัส TMLT'
                    required
                    mono
                    value={form.tmlt}
                    onChange={(v) => setField('tmlt', v)}
                    placeholder='เช่น 220123'
                    hint='ตรวจสอบรหัสได้ที่ TMLT Browser'
                  />
                  <TextField label='LOINC NUM' mono value={form.loinc} onChange={(v) => setField('loinc', v)} placeholder='เช่น 4548-4' />
                  <TextField label='รหัส ICD10TM' mono value={form.icd10tm} onChange={(v) => setField('icd10tm', v)} placeholder='เช่น 0531601' />
                  <TextField label='รหัส OPBKK' mono value={form.opbkk} onChange={(v) => setField('opbkk', v)} placeholder='เช่น 30208' />
                </div>
              </SectionCard>

              <SectionCard
                icon='colorize'
                title='สิ่งส่งตรวจและการเตรียมตัว'
                subtitle='หลอด/สีจุกผูกกับรายการตรวจ ไม่ใช่ผูกกับใบสั่ง — ทุกหน้าจอจะดึงสีจากตรงนี้เหมือนกันทั้งระบบ'
              >
                <TubePicker value={form.tubeKey} onChange={(v) => setField('tubeKey', v)} />
                {/* Some analytes accept a second tube type (Electrolytes:
                    "Clot หรือ Li-Hep"), so the alternative is a first-class
                    field rather than a note. */}
                <TubePicker
                  label='หลอดทางเลือก (ถ้ามี)'
                  allowNone
                  value={form.altTubeKey}
                  onChange={(v) => setField('altTubeKey', v)}
                />
                <div className='grid grid-cols-1 md:grid-cols-3 gap-3 w-full'>
                  <NumberField label='จำนวนหลอด' value={form.tubeCount} onChange={(v) => setField('tubeCount', v)} />
                  <NumberField label='ต้องงดอาหารก่อนตรวจ' suffix='ชั่วโมง · 0 = ไม่ต้องงด' value={form.fastingHours} onChange={(v) => setField('fastingHours', v)} />
                  <div className='flex flex-col justify-end' style={{ gap: 'var(--dim-space-150)' }}>
                    <span className='text-xs text-ink-secondary'>การปกปิดผล</span>
                    <div className='flex items-center' style={{ minHeight: 38 }}>
                      <Checkbox
                        label='เป็นผลตรวจที่ต้องปกปิด (เช่น Anti-HIV)'
                        checked={!!form.confidential}
                        onChange={(next) => setField('confidential', next)}
                      />
                    </div>
                  </div>
                </div>
                {form.tubeKey && (
                  <span className='text-xs text-ink-tertiary'>
                    ปริมาตรที่ต้องเก็บ {(LAB_TUBES[form.tubeKey]?.volumeMl ?? 0) * (form.tubeCount || 1)} mL ·
                    {' '}สารกันเลือดแข็ง {LAB_TUBES[form.tubeKey]?.additive} ·
                    {' '}{LAB_TUBES[form.tubeKey]?.note}
                  </span>
                )}
              </SectionCard>

              <SectionCard
                icon='payments'
                title='ราคา'
                subtitle='ราคาต้นทุน / ราคาขาย / ราคาที่เรียกเก็บ ตามหน้าตั้งค่าเดิมของ MyHOSPITAL'
              >
                <div className='grid grid-cols-1 md:grid-cols-3 gap-3 w-full'>
                  <NumberField label='ราคาต้นทุน' suffix='บาท' value={form.costPrice} onChange={(v) => setField('costPrice', v)} />
                  <NumberField label='ราคาขาย' suffix='บาท' required value={form.price} onChange={(v) => setField('price', v)} />
                  <NumberField label='ราคาที่เรียกเก็บ' suffix='บาท' value={form.chargePrice ?? form.price} onChange={(v) => setField('chargePrice', v)} />
                </div>
              </SectionCard>

              <SectionCard
                icon='fact_check'
                title={isPanel ? 'รายการย่อยในชุดตรวจ (Profile)' : 'การรายงานผล'}
                subtitle={isPanel
                  ? 'การสร้าง Profile คือการสร้างกลุ่มของรายการย่อย — แต่ละรายการมีหน่วยและค่าปกติของตัวเอง'
                  : 'ประเภทการรายงานผลกำหนดว่าเจ้าหน้าที่จะกรอกผลเป็นตัวเลข ข้อความ หรือเลือกจากรายการที่กำหนดไว้'}
                action={isPanel ? <NeutralSubdueButton variant='outline' size='sm' leadingIcon='add' onClick={addAnalyte}>เพิ่มรายการย่อย</NeutralSubdueButton> : undefined}
              >
                <RadioRow
                  label='ประเภทการรายงานผล'
                  value={form.resultType}
                  onChange={(v) => setField('resultType', v)}
                  options={LAB_RESULT_TYPES.map((r) => ({ value: r.key, label: r.label, hint: r.hint }))}
                />

                <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
                  {form.analytes.map((a, i) => (
                    <div
                      key={i}
                      className='flex flex-wrap items-end w-full'
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
                      <div style={{ flex: '1 1 200px', minWidth: 160 }}>
                        <TextField label={isPanel ? `รายการย่อยที่ ${i + 1}` : 'ชื่อค่าที่รายงาน'} value={a.label} onChange={(v) => setAnalyte(i, 'label', v)} placeholder='เช่น Hemoglobin (Hb)' />
                      </div>
                      <div style={{ flex: '0 1 120px', minWidth: 100 }}>
                        <TextField label='หน่วย' value={a.unit} onChange={(v) => setAnalyte(i, 'unit', v)} placeholder='g/dL' />
                      </div>
                      <div style={{ flex: '0 1 160px', minWidth: 120 }}>
                        <TextField label='ค่าปกติ' value={a.normalRange} onChange={(v) => setAnalyte(i, 'normalRange', v)} placeholder='12–17 หรือ Negative' />
                      </div>
                      <div style={{ flex: '0 1 200px', minWidth: 150 }}>
                        {/* กำหนดเอง → the editable Negative / Trace / Positive
                            list from the vendor screen. Stored as a plain
                            comma-separated string in the form and split on
                            save, which keeps the control a single input. */}
                        <TextField
                          label='ตัวเลือกผล (กำหนดเอง)'
                          value={Array.isArray(a.options) ? a.options.join(', ') : (a.options ?? '')}
                          onChange={(v) => setAnalyte(i, 'options', v.split(',').map((x) => x.trim()).filter(Boolean))}
                          placeholder='Negative, Trace, Positive'
                        />
                      </div>
                      {form.analytes.length > 1 && (
                        <NeutralSubdueIconButton
                          icon='delete'
                          variant='outline'
                          size='sm'
                          aria-label={`ลบรายการย่อยที่ ${i + 1}`}
                          onClick={() => removeAnalyte(i)}
                        />
                      )}

                      {/* TOR §1.15.3.2 — "สามารถบันทึกค่าวิกฤตและค่าอ้างอิงของ
                          ผลตรวจแยกตามเพศ อายุ หรือตามที่ผู้ใช้งานกำหนดได้".
                          Collapsed by default: most analytes use the flat
                          ค่าปกติ above, and only the few that genuinely
                          differ (Hb, Hct, Creatinine, HDL) need the split.
                          Forcing every row to show six more inputs would
                          bury the common case. */}
                      <div style={{ flexBasis: '100%' }}>
                        <NeutralSubdueButton
                          variant='outline'
                          size='sm'
                          trailingIcon={expandedAnalyte === i ? 'expand_less' : 'expand_more'}
                          onClick={() => setExpandedAnalyte(expandedAnalyte === i ? null : i)}
                        >
                          ค่าอ้างอิงแยกเพศ/อายุ และค่าวิกฤต
                          {(a.rangeBySex || a.rangeByAge?.length || typeof a.criticalLow === 'number' || typeof a.criticalHigh === 'number')
                            ? ' · ตั้งค่าไว้แล้ว' : ''}
                        </NeutralSubdueButton>

                        {expandedAnalyte === i && (
                          <div
                            className='flex flex-col'
                            style={{
                              gap: 'var(--dim-space-300)',
                              marginTop: 'var(--dim-space-300)',
                              paddingLeft: 'var(--dim-space-400)',
                              borderLeft: 'var(--dim-stroke-100) solid var(--border-brandPrimary-secondary)',
                            }}
                          >
                            {/* แยกตามเพศ */}
                            <div className='grid grid-cols-1 md:grid-cols-2 gap-3 w-full'>
                              <TextField
                                label='ค่าปกติ — เพศชาย'
                                value={a.rangeBySex?.male ?? ''}
                                onChange={(v) => setAnalyte(i, 'rangeBySex', { ...(a.rangeBySex ?? {}), male: v })}
                                placeholder='เช่น 13–17'
                                hint='เว้นว่างหากไม่แยกตามเพศ'
                              />
                              <TextField
                                label='ค่าปกติ — เพศหญิง'
                                value={a.rangeBySex?.female ?? ''}
                                onChange={(v) => setAnalyte(i, 'rangeBySex', { ...(a.rangeBySex ?? {}), female: v })}
                                placeholder='เช่น 12–15'
                              />
                            </div>

                            {/* แยกตามอายุ — ช่วงอายุเรียงจากน้อยไปมาก โดยช่วง
                                สุดท้ายครอบคลุมอายุที่เหลือทั้งหมด */}
                            <div className='flex flex-col' style={{ gap: 'var(--dim-space-200)' }}>
                              <div className='flex items-center' style={{ gap: 'var(--dim-space-300)' }}>
                                <span className='text-xs text-ink-secondary'>ค่าปกติแยกตามอายุ</span>
                                <NeutralSubdueButton
                                  variant='outline'
                                  size='sm'
                                  leadingIcon='add'
                                  onClick={() => setAnalyte(i, 'rangeByAge', [...(a.rangeByAge ?? []), { maxAge: 18, range: '' }])}
                                >
                                  เพิ่มช่วงอายุ
                                </NeutralSubdueButton>
                              </div>
                              {(a.rangeByAge ?? []).map((b, bi) => (
                                <div key={bi} className='flex flex-wrap items-end' style={{ gap: 'var(--dim-space-300)' }}>
                                  <div style={{ flex: '0 1 150px' }}>
                                    <NumberField
                                      label={`ถึงอายุ (ปี)`}
                                      value={Number.isFinite(b.maxAge) ? b.maxAge : 200}
                                      onChange={(v) => setAnalyte(i, 'rangeByAge', a.rangeByAge.map((x, xi) => (xi === bi ? { ...x, maxAge: v } : x)))}
                                    />
                                  </div>
                                  <div style={{ flex: '1 1 200px' }}>
                                    <TextField
                                      label='ค่าปกติในช่วงนี้'
                                      value={b.range}
                                      onChange={(v) => setAnalyte(i, 'rangeByAge', a.rangeByAge.map((x, xi) => (xi === bi ? { ...x, range: v } : x)))}
                                      placeholder='เช่น 0.4–4.0'
                                    />
                                  </div>
                                  <NeutralSubdueIconButton
                                    icon='delete'
                                    variant='outline'
                                    size='sm'
                                    aria-label={`ลบช่วงอายุที่ ${bi + 1}`}
                                    onClick={() => setAnalyte(i, 'rangeByAge', a.rangeByAge.filter((_, xi) => xi !== bi))}
                                  />
                                </div>
                              ))}
                            </div>

                            {/* ค่าวิกฤต — ไม่ใช่แค่ "ผิดปกติ" แต่คือค่าที่ต้อง
                                โทรแจ้งแพทย์ หน้าบันทึกผลจะบล็อกการรายงานผลจน
                                กว่าจะบันทึกการแจ้ง */}
                            <div className='grid grid-cols-1 md:grid-cols-2 gap-3 w-full'>
                              <TextField
                                label='ค่าวิกฤต — ต่ำกว่าหรือเท่ากับ'
                                value={a.criticalLow ?? ''}
                                onChange={(v) => setAnalyte(i, 'criticalLow', v === '' ? undefined : Number(v))}
                                placeholder='เช่น 2.5'
                                hint='เว้นว่างหากไม่มีค่าวิกฤตด้านต่ำ'
                              />
                              <TextField
                                label='ค่าวิกฤต — สูงกว่าหรือเท่ากับ'
                                value={a.criticalHigh ?? ''}
                                onChange={(v) => setAnalyte(i, 'criticalHigh', v === '' ? undefined : Number(v))}
                                placeholder='เช่น 6.0'
                              />
                            </div>
                            <span className='text-xs text-ink-tertiary'>
                              ค่าที่ถึงเกณฑ์วิกฤตจะบังคับให้บันทึกการแจ้งแพทย์ (ผู้รับแจ้ง เวลา ผู้แจ้ง และ read-back) ก่อนจึงจะรายงานผลได้
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>

              {/* TOR §1.15.3.3 — "สามารถบันทึกราคาและการเบิกแยกตามสิทธิการ
                  รักษาได้". Price and reimbursability are separate columns
                  because they answer different questions: what the patient
                  pays, and whether the หน่วยบริการ gets paid back. */}
              <SectionCard
                icon='payments'
                title='ราคาและการเบิกแยกตามสิทธิการรักษา'
                subtitle='กำหนดราคาต่อสิทธิ และระบุว่าสิทธินั้นเบิกคืนได้หรือไม่ — เว้นไว้เพื่อใช้ราคาขายตั้งต้น'
              >
                <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200)' }}>
                  {LAB_RIGHTS.map((r) => {
                    const row = form.priceByRight?.[r.key] ?? { price: form.price, reimbursable: r.key !== 'selfpay' && r.key !== 'other' };
                    const setRight = (patch) => setField('priceByRight', {
                      ...(form.priceByRight ?? {}),
                      [r.key]: { ...row, ...patch },
                    });
                    return (
                      <div
                        key={r.key}
                        className='flex flex-wrap items-center w-full'
                        style={{
                          gap: 'var(--dim-space-400)',
                          background: 'var(--surface-card-200)',
                          borderRadius: 'var(--dim-radius-200)',
                          border: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary)',
                          paddingTop: 'var(--dim-space-300)',
                          paddingRight: 'var(--dim-space-400)',
                          paddingBottom: 'var(--dim-space-300)',
                          paddingLeft: 'var(--dim-space-400)',
                        }}
                      >
                        <span className='text-sm font-bold text-ink' style={{ flex: '1 1 200px', minWidth: 160 }}>
                          {r.label}
                        </span>
                        <div className='flex items-center' style={{ gap: 'var(--dim-space-200)' }}>
                          <span className='text-xs text-ink-secondary'>ราคา (บาท)</span>
                          <div style={{ width: 110 }}>
                            <InputField
                              showLabel={false}
                              type='number'
                              min='0'
                              size='md'
                              placeholder='0'
                              aria-label={`ราคาสำหรับสิทธิ ${r.label}`}
                              value={String(row.price ?? 0)}
                              onChange={(v) => setRight({ price: Number(v) || 0 })}
                            />
                          </div>
                        </div>
                        <Checkbox
                          label='เบิกได้'
                          checked={!!row.reimbursable}
                          onChange={(next) => setRight({ reimbursable: next })}
                        />
                        {!row.reimbursable && (
                          <span className='text-xs' style={{ color: 'var(--text-statusbadge-warning, #C2410C)' }}>
                            ผู้ป่วยสิทธินี้ต้องชำระเอง
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </SectionCard>

            </div>
            )}
          </Popup>
        </div>
    </QueuePageShell>
    <SuccessToast open={saved} message='บันทึกรายการตรวจแล้ว' onClose={() => setSaved(false)} />
    </>
  );
};

export default LabSetupPage;
