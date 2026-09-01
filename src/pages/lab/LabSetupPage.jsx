import React, { useEffect, useMemo, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
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
import Stepper from '@/components/stepper/Stepper';
import Switch from '@/components/switch/Switch';
import SelectableCardButton from '@/components/button/SelectableCardButton';
import Popup from '@/components/popup/Popup';
import StepProgress from '@/components/step/StepProgress';
import Table from '@/components/table/Table';
import SuccessToast from '@/components/toast/SuccessToast';
import LabTubeDot from '@/pages/lab/LabTubeDot';
import { SpecimenSticker, groupRowsByTube } from '@/components/lab/LabSpecimenLabel';
import { MIH_TOPBAR_OFFSET } from '@/hooks/useHeaderAutoHide';
import SYSTEM_NAV from '@/pages/system/systemNav';
import { LAB_ORDERS, withTestLabel } from '@/data/labOrders';
import {
  LAB_STICKER_FIELDS, LAB_STICKER_SIZES, getPrintSettings, getStickerSize, isStickerFieldOn,
  setStickerField, setPrintSetting, subscribePrintSettings,
} from '@/data/labPrintSettings';
import {
  LAB_TESTS, LAB_GROUPS, LAB_TUBES, LAB_TUBE_LIST, LAB_RESULT_TYPES, LAB_RIGHTS,
  getTube, subscribeCatalog, upsertLabTest, setLabTestRetired,
  LAB_CAP_COLORS, setTubeCapColor, addLabTube,
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

/* สารกันเลือดแข็ง/น้ำยาในหลอด — เป็นชุดมาตรฐานตามชนิดหลอดที่ห้องแล็บใช้จริง จึงเป็น
   ดรอปดาวน์ ไม่ใช่ช่องพิมพ์อิสระ (มติผู้ใช้ 31 ส.ค. 69) พิมพ์เองทำให้ได้ "K2-EDTA"
   "K2 EDTA" "EDTA" ปนกันจนจับคู่หลอดข้ามศูนย์ไม่ได้ */
const TUBE_ADDITIVES = [
  { value: 'K2-EDTA', label: 'K2-EDTA' },
  { value: 'K3-EDTA', label: 'K3-EDTA' },
  { value: 'Clot activator + gel', label: 'Clot activator + gel (SST)' },
  { value: 'Clot activator', label: 'Clot activator (ไม่มีเจล)' },
  { value: 'Sodium citrate 3.2%', label: 'Sodium citrate 3.2% (Coagulation)' },
  { value: 'Lithium heparin', label: 'Lithium heparin' },
  { value: 'Sodium heparin', label: 'Sodium heparin' },
  { value: 'NaF / K-oxalate', label: 'NaF / K-oxalate (Fluoride)' },
  { value: 'ACD', label: 'ACD (Acid citrate dextrose)' },
  { value: 'Broth medium', label: 'Broth medium (ขวดเพาะเชื้อ)' },
  { value: 'Transport medium', label: 'Transport medium (สวอบ/เชื้อ)' },
  { value: '—', label: 'ไม่มีสารกันเลือดแข็ง' },
];

/* ฟอร์มเพิ่ม/แก้ไขรายการตรวจเดินเป็นขั้นตอน (มติผู้ใช้ 30 ส.ค. 69) — ของเดิมเป็น
   การ์ด 6 ใบเรียงยาวในป๊อปอัปเดียว ต้องเลื่อนหาว่ากรอกถึงไหนแล้ว รูปแบบนี้ตรงกับ
   ทะเบียนยาใน จัดการระบบ (PharmacyRegistryEditor) ซึ่งเป็นหน้าคู่กัน จึงใช้
   StepProgress ตัวเดียวกันและจบด้วยขั้น "ตรวจสอบ" ก่อนบันทึกเหมือนกัน */
/* สองงานของหน้านี้แยกเป็นแท็บขีดเส้นใต้ใต้การ์ดสรุป (มติผู้ใช้ 30 ส.ค. 69) —
   ของเดิมวางการ์ดต่อกันลงมา ต้องเลื่อนผ่านทะเบียนทั้งตารางกว่าจะถึงการตั้งค่า
   สติกเกอร์ ทั้งที่เป็นงานคนละงาน ใช้ `tabs` ของ QueuePageShell ตัวเดียวกับ
   worklist อื่น แถบจึงติดหนึบใต้หัวจอและเลื่อนตามหน้าเหมือนกันทั้งระบบ */
const PAGE_TABS = [
  { key: 'catalog', label: 'รายการตรวจในทะเบียน' },
  { key: 'tubes',   label: 'ชนิดหลอดและสีจุก' },
  { key: 'sticker', label: 'ข้อมูลบนสติกเกอร์ Lab' },
];

const FORM_STEPS = ['ข้อมูลพื้นฐาน', 'สิ่งส่งตรวจ', 'การรายงานผล', 'ราคาและสิทธิ', 'ตรวจสอบ'];

/* เรียงลำดับตามหัวคอลัมน์ (มติผู้ใช้ 30 ส.ค. 69) — <Table> จะเปิดหัวคอลัมน์ให้กด
   ก็ต่อเมื่อได้รับทั้ง `sortConfig` และ `onSort` และตัวมันเองไม่เรียงแถวให้
   หน้าเป็นคนเรียง เหมือน LabQueuePage. คอลัมน์ที่ไม่ใช่ตัวอักษร (ชนิด · กลุ่ม ·
   สิ่งส่งตรวจ) แปลงเป็นค่าที่เรียงได้ก่อน ที่เหลือเทียบด้วย Intl.Collator ภาษาไทย
   ซึ่งจัดการทั้งไทยและรหัสที่มีตัวเลขปนได้ถูกต้อง */
const COLLATOR = new Intl.Collator('th', { numeric: true, sensitivity: 'base' });

const catalogSortValue = (t, key) => {
  switch (key) {
    case 'name':  return t.nameEn || t.nameTh || '';
    /* ชุดตรวจขึ้นก่อนรายการเดี่ยว แล้วเรียงตามจำนวนรายการย่อยในกลุ่มเดียวกัน */
    case 'type':  return t.type === 'panel' ? -(t.analytes?.length ?? 0) - 1 : 0;
    case 'group': return LAB_GROUPS.find((g) => g.key === t.group)?.code ?? '';
    case 'tube':  return LAB_TUBES[t.tubeKey]?.thai ?? '';
    case 'price': return Number(t.price ?? 0);
    default:      return t[key] ?? '';
  }
};

const sortCatalogRows = (rows, sortConfig) => {
  if (!sortConfig.key) return rows;
  const sign = sortConfig.direction === 'desc' ? -1 : 1;
  return [...rows].sort((a, b) => {
    const av = catalogSortValue(a, sortConfig.key);
    const bv = catalogSortValue(b, sortConfig.key);
    if (typeof av === 'number' && typeof bv === 'number') return sign * (av - bv);
    return sign * COLLATOR.compare(String(av), String(bv));
  });
};

/* ขั้น "ตรวจสอบ" — อ่านอย่างเดียว ใช้คู่ label/value เหมือน ReviewRow ของ
   ทะเบียนยา เพื่อให้สองทะเบียนอ่านออกแบบเดียวกัน */
const ReviewGroup = ({ title, full = false, children }) => (
  <div
    className={`flex flex-col min-w-0 ${full ? 'md:col-span-2' : ''}`}
    style={{
      gap: 'var(--dim-space-200)',
      background: 'var(--surface-card-200)',
      borderRadius: 'var(--dim-radius-200)',
      border: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary)',
      padding: 'var(--dim-space-400)',
    }}
  >
    <span className='text-sm font-bold text-ink'>{title}</span>
    {children}
  </div>
);

const ReviewRow = ({ label, value, mono = false }) => (
  <div className='flex flex-wrap items-baseline w-full min-w-0' style={{ gap: 'var(--dim-space-200)' }}>
    <span className='shrink-0 text-xs text-ink-tertiary' style={{ minWidth: 'var(--dim-size-2200, 140px)' }}>
      {label}
    </span>
    <span
      className='min-w-0 text-sm text-ink-secondary'
      style={mono ? MONO_INPUT_STYLE : undefined}
    >
      {value == null || value === '' ? '—' : value}
    </span>
  </div>
);

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

/* ช่องรหัส (รหัสรายการ · TMLT · LOINC · ICD10TM · OPBKK) ใช้ Sarabun เหมือนช่อง
   อื่นทั้งฟอร์ม (มติผู้ใช้ 31 ส.ค. 69) — ฟอนต์ monospace ทำให้แถวรหัสหลุดจาก
   ตัวอักษรของฟอร์ม · คงความ "อ่านเป็นรหัส" ไว้ด้วย tabular-nums ตัวเลขจึงกว้าง
   เท่ากันทุกตัว เทียบรหัสระหว่างบรรทัดได้เหมือนเดิม */
const MONO_INPUT_STYLE = {
  fontFamily: 'var(--type-family-body)',
  fontVariantNumeric: 'tabular-nums',
};

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

/* ตัวเลือกเดี่ยวของฟอร์มนี้ (ชนิด · ประเภทการรายงานผล) เป็นการ์ดปุ่มกดได้ทั้งใบ
   (มติผู้ใช้ 31 ส.ค. 69) — เดิมเป็นเรดิโอปุ่มเล็ก ๆ ที่พื้นที่กดมีแค่ตัววงกลม
   `SelectableCardButton` เป็นตัวเดียวกับที่หน้าคิวห้องปฏิบัติการใช้เลือกเหตุผล
   ปฏิเสธสิ่งส่งตรวจ จึงได้ hover/selected ตามโทเคนมาครบ */
const RadioRow = ({ label, options, value, onChange }) => (
  <div className='flex flex-col' style={{ gap: 'var(--dim-space-200)' }}>
    <span className='text-xs text-ink-secondary'>{label}</span>
    <div className='grid grid-cols-1 md:grid-cols-2 w-full' style={{ gap: 'var(--dim-space-300)' }}>
      {options.map((o) => (
        <SelectableCardButton
          key={o.value}
          selected={value === o.value}
          onClick={() => onChange(o.value)}
          ariaLabel={o.label}
          className='w-full'
        >
          <span className='flex flex-col min-w-0 text-left'>
            <span className='text-sm' style={{ fontWeight: 'var(--type-weight-medium)', color: 'var(--text-content-primary)' }}>
              {o.label}
            </span>
            {o.hint && <span className='text-xs text-ink-tertiary'>{o.hint}</span>}
          </span>
        </SelectableCardButton>
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

/* ปุ่มเลือกสีจุก — ใช้ทั้งในแท็บชนิดหลอดและป๊อปอัปเพิ่มชนิดหลอด มี hover จริง
   (มติผู้ใช้ 31 ส.ค. 69) ของเดิมเป็นวงกลมนิ่ง ๆ ชี้แล้วไม่มีอะไรตอบ เลยไม่รู้ว่า
   กดได้ · ขยายวงในเล็กน้อยตอน hover และเปลี่ยนสีขอบเป็นโทนแบรนด์ */
const CapColorSwatch = ({ color, thai, selected, ariaLabel, onClick }) => {
  const [hover, setHover] = useState(false);
  return (
    <button
      type='button'
      /* ไม่ใช้ `title` เพราะทูลทิปของเบราว์เซอร์เด้งขึ้นมาแบบกระตุกและคุมจังหวะไม่ได้
         ชื่อสีอ่านได้จาก aria-label อยู่แล้ว (มติผู้ใช้ 31 ส.ค. 69) */
      aria-label={ariaLabel || `จุกสี${thai}`}
      aria-pressed={selected}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      className='inline-flex items-center justify-center'
      style={{
        width: 'var(--dim-size-600, 32px)',
        height: 'var(--dim-size-600, 32px)',
        borderRadius: 'var(--dim-radius-full, 9999px)',
        background: hover && !selected ? 'var(--surface-list-hover, #F4FBF8)' : 'var(--surface-card-100)',
        border: `var(--dim-stroke-${selected ? '200' : '100'}) solid ${
          selected || hover ? 'var(--border-brandPrimary-default)' : 'var(--border-card-default)'
        }`,
        cursor: 'pointer',
        /* ทุกอย่างวิ่งบนโค้ง settle-don't-snap ชุดเดียวกับ StepProgress ของระบบ */
        transition: [
          'background-color 180ms cubic-bezier(0.16, 1, 0.3, 1)',
          'border-color 180ms cubic-bezier(0.16, 1, 0.3, 1)',
          'box-shadow 180ms cubic-bezier(0.16, 1, 0.3, 1)',
          'transform 180ms cubic-bezier(0.16, 1, 0.3, 1)',
        ].join(', '),
        transform: hover ? 'translateY(-1px)' : 'translateY(0)',
        boxShadow: hover ? '0 2px 8px rgba(8,167,104,0.16)' : '0 0 0 rgba(0,0,0,0)',
      }}
    >
      {/* ย่อ/ขยายด้วย transform ไม่ใช่ width/height — ไม่ไปกระทบ layout จึงลื่นกว่า */}
      <span
        aria-hidden
        style={{
          width: 16,
          height: 16,
          borderRadius: 'var(--dim-radius-full, 9999px)',
          background: color,
          transform: selected ? 'scale(1.14)' : hover ? 'scale(1.08)' : 'scale(1)',
          transition: 'transform 180ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      />
    </button>
  );
};

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
  /* คอลัมน์ "สถานะ" ในทะเบียนอ่านจากคีย์นี้ — ไม่ตั้งไว้ รายการใหม่จะเข้าไปแบบ
     สถานะไม่ระบุ แล้วสวิตช์ในตารางอ่านเป็นปิด (มติผู้ใช้ 31 ส.ค. 69) */
  active: true,
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
  /* ขั้นตอนที่กำลังกรอกในฟอร์มเพิ่ม/แก้ไข — รีเซ็ตเป็น 0 ทุกครั้งที่เปิดฟอร์มใหม่ */
  const [step, setStep] = useState(0);
  const [pageTab, setPageTab] = useState('catalog');
  /* ร่างชนิดหลอดใหม่ (มติผู้ใช้ 31 ส.ค. 69) — null = ยังไม่ได้เปิดฟอร์ม */
  const [tubeDraft, setTubeDraft] = useState(null);
  /* ยืนยันก่อนสลับสถานะรายการตรวจ (มติผู้ใช้ 31 ส.ค. 69) — ปิดใช้งานรายการที่เคยถูก
     สั่งไปแล้วกระทบใบสั่งเดิม จึงไม่ให้สลับด้วยการกดครั้งเดียว */
  const [activeChange, setActiveChange] = useState(null);
  const history = useHistory();
  const location = useLocation();
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
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

  /* ?new=1 — มาจากปุ่ม "เพิ่มรายการตรวจ" บนหัวจอโมดูลห้องปฏิบัติการ เปิดฟอร์ม
     ให้เลยแล้วล้าง query ทิ้ง เพื่อไม่ให้กดรีเฟรชหรือย้อนกลับแล้วเด้งฟอร์มซ้ำ */
  useEffect(() => {
    if (!new URLSearchParams(location.search).has('new')) return;
    startNew();
    history.replace(location.pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  /* "ค้นหาล่าสุด" — ถ้ายังไม่เคยค้นจริง ให้เสนอรายการตรวจที่ใช้บ่อยจากทะเบียนแทน
     จะได้เป็นของในหน้านี้ ไม่ใช่ตัวอย่างกลางของคอมโพเนนต์ */
  const searchHistoryItems = useMemo(() => {
    if (searchHistory.length) return searchHistory;
    return LAB_TESTS.filter((t) => !t.retired).slice(0, 5).map((t) => ({
      id: t.id,
      label: `${t.nameEn} — ${t.nameTh}`,
      sublabel: [t.code, t.tmlt ? `TMLT ${t.tmlt}` : ''].filter(Boolean).join(' · '),
      value: t.code,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchHistory, version]);

  /* ตัวช่วยเลือกขณะพิมพ์ — เอาจากผลกรองจริงของหน้า สูงสุด 8 รายการ */
  const searchSuggestions = useMemo(() => {
    if (!query.trim()) return [];
    return rows.slice(0, 8).map((t) => ({
      id: t.id,
      label: `${t.nameEn} — ${t.nameTh}`,
      sublabel: [t.code, t.tmlt ? `TMLT ${t.tmlt}` : '', t.loinc ? `LOINC ${t.loinc}` : '']
        .filter(Boolean).join(' · '),
      value: t.code,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, query]);

  const stickerBox = getStickerSize(printSettings.stickerSize);

  const sortedRows = useMemo(() => sortCatalogRows(rows, sortConfig), [rows, sortConfig]);

  const handleSort = (key) => setSortConfig((prev) => (
    prev.key === key ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' } : { key, direction: 'asc' }
  ));

  /* The edit form renders far below the catalog list, so opening it without
     moving the viewport reads as "nothing happened". Scroll it into view on
     the next frame, once the form has actually rendered. */
  const startEdit = (test) => {
    setEditingId(test.id);
    setStep(0);
    /* Deep-copy the analytes so editing the draft doesn't mutate the stored
       entry before the user saves. */
    setForm({ ...test, analytes: (test.analytes ?? []).map((a) => ({ ...a })) });
  };

  const startNew = () => {
    setEditingId('new');
    setStep(0);
    setForm(blankTest());
  };

  const cancelEdit = () => { setEditingId(null); setForm(null); setStep(0); };

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
      render: (t) => <LabTubeDot tube={getTube(t)} count={t.tubeCount} size={9} />,
    },
    {
      /* "column guide" ที่ทีมขอ — รหัสมาตรฐานอยู่บนทุกแถว ไม่ต้องเปิดฟอร์มดู */
      key: 'tmlt',
      label: 'รหัส TMLT',
      /* Sarabun เหมือนทุกคอลัมน์ (มติผู้ใช้ 30 ส.ค. 69) — รหัส TMLT อ่านเป็น
         ข้อมูลในตาราง monospace ทำให้คอลัมน์นี้หลุดจากตัวอักษรของคอลัมน์อื่น */
      render: (t) => (
        <span
          style={{ fontFamily: 'var(--type-family-body)', color: 'var(--text-content-tertiary)' }}
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
      key: 'active',
      label: 'สถานะ',
      align: 'center',
      sortable: false,
      render: (t) => (
        <Switch
          checked={!t.retired}
          onChange={(value) => setActiveChange({
            test: t,
            active: typeof value === 'boolean' ? value : !!t.retired,
          })}
          aria-label={`เปลี่ยนสถานะ ${t.nameEn}`}
        />
      ),
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
            /* ถังขยะแทนวงกลมขีด (มติผู้ใช้ 30 ส.ค. 69) — คนใช้งานมองหาไอคอนลบ
               ตรงนี้ ส่วนพฤติกรรมยังเป็น "ยกเลิกใช้งาน" ไม่ได้ลบจริง */
            icon={t.retired ? 'restart_alt' : 'delete'}
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

  /* เงื่อนไขผ่านของแต่ละขั้น — ขั้นแรกถือของบังคับเดิมทั้งชุด (รหัส · ชื่อ ·
     ชื่อไทย · TMLT) ที่เคยเป็นเงื่อนไขปิดปุ่มบันทึก จึงไม่มีทางไปถึงขั้นสุดท้าย
     โดยที่ยังกรอกไม่ครบ ขั้นชุดตรวจต้องมีชื่อรายการย่อยอย่างน้อยหนึ่งรายการ
     เพราะ PANEL ที่ไม่มีรายการย่อยคือชุดตรวจเปล่า */
  const stepValid = [
    !!form?.code && !!form?.nameEn && !!form?.nameTh && !!form?.tmlt,
    !!form?.tubeKey,
    !isPanel || (form?.analytes ?? []).some((a) => String(a.label ?? '').trim()),
    true,
    true,
  ];
  const completedSteps = FORM_STEPS.map((_, i) => i < step && stepValid[i]);
  const canAdvance = !!form && stepValid[step];
  const isLastStep = step === FORM_STEPS.length - 1;

  const goNextStep = () => {
    if (!canAdvance) return;
    if (isLastStep) { handleSave(); return; }
    setStep(step + 1);
  };
  const goPrevStep = () => (step > 0 ? setStep(step - 1) : cancelEdit());
  /* ย้อนไปแก้ขั้นก่อนหน้าได้เสมอ ส่วนการกระโดดไปข้างหน้าต้องผ่านขั้นก่อนหน้าแล้ว */
  const handleStepClick = (idx) => {
    if (idx < step || completedSteps[idx - 1]) setStep(idx);
  };

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
      tabs={PAGE_TABS}
      activeTab={pageTab}
      onTabChange={setPageTab}
      /* ปุ่ม "เพิ่มรายการตรวจ" ถูกเอาออกจากหัวหน้าทะเบียน 31 ส.ค. 69 (มติผู้ใช้) —
         ทางเข้าหลักคือปุ่มเดียวกันบนหัวจอโมดูลห้องปฏิบัติการ ซึ่งพาเข้ามาที่หน้านี้
         พร้อมเปิดฟอร์มให้เลย (`?new=1`) ฟังก์ชัน `startNew` จึงยังถูกใช้อยู่ */
    >
        <div className='flex flex-col flex-1 min-w-0' style={{ padding: 'var(--dim-space-600)', gap: 'var(--dim-space-500)' }}>
          {pageTab === 'catalog' && (
            <>
            {/* ─── Catalog list ─── */}
            <SectionCard
              icon='biotech'
              title='รายการตรวจในทะเบียน'
              subtitle={`${LAB_TESTS.length} รายการในระบบ · รหัสมาตรฐานที่ใช้อ้างอิงคือ TMLT`}
              /* ปุ่มเพิ่มกลับมาอยู่บนการ์ดทะเบียน (มติผู้ใช้ 31 ส.ค. 69) — ชื่อเดียวกับ
                 ปุ่มบนหัวจอโมดูลห้องปฏิบัติการ และเปิดฟอร์มเดียวกัน */
              action={(
                <BrandButton variant='fill' size='md' leadingIcon='add' onClick={startNew}>
                  เพิ่มทะเบียนรายการตรวจ
                </BrandButton>
              )}
            >
              {/* กล่องค้นหาเป็น PrimarySearch กึ่งกลางการ์ด ตำแหน่งเดียวกับหน้าอื่น
                  (ตำแหน่ง · เวชระเบียน · ทะเบียนยา) — มติผู้ใช้ 29 ส.ค. 69 */}
              <div className='w-full flex items-center' style={{ gap: 'var(--dim-space-300)' }}>
                <div className='flex-1' />
                {/* ช่องค้นหานี้ค้น "รายการตรวจ" ไม่ใช่ผู้รับบริการ (มติผู้ใช้ 31 ส.ค. 69)
                    — ไม่ได้ส่ง `historyKind` มาก่อน PrimarySearch จึงเดาจาก placeholder
                    แล้วตกไปใช้ mock "ค้นหาล่าสุด" แบบรายชื่อผู้ป่วย · ตอนนี้บอกชนิดเป็น
                    catalog และป้อนรายการที่ตรงคำค้นจากทะเบียนจริงเป็นตัวช่วยเลือก */}
                <PrimarySearch
                  value={query}
                  onChange={setQuery}
                  onSubmit={(q, item) => {
                    const picked = item?.value ?? q;
                    if (picked && String(picked).trim()) {
                      setQuery(String(picked).trim());
                      pushSearchHistory(String(picked).trim());
                    }
                  }}
                  placeholder='ค้นหารหัสรายการ · ชื่อรายการตรวจ · รหัส TMLT · LOINC'
                  width={640}
                  /* `historyKind='none'` ปิด mock "ค้นหาล่าสุด" กลางของ PrimarySearch
                     (แบบฟอร์ม PDPA · ชุดตรวจสุขภาพ ฯลฯ) ซึ่งไม่เกี่ยวกับหน้านี้เลย
                     แล้วป้อนรายการจากทะเบียนจริงแทน (มติผู้ใช้ 31 ส.ค. 69) */
                  historyKind='none'
                  suggestions={searchSuggestions}
                  history={searchHistoryItems}
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
                    /* จุดสีจุกนำหน้าทุกตัวเลือก (มติผู้ใช้ 31 ส.ค. 69) — ตารางแสดงหลอด
                       ด้วยจุดสีอยู่แล้ว ตัวกรองที่มีแต่ข้อความจึงจับคู่กับตารางไม่ติด
                       `leadingIcon` ของ FilterDropdown รับ element ได้ ไม่จำกัดแค่ชื่อไอคอน */
                    options={LAB_TUBE_LIST.map((t) => ({
                      value: t.key,
                      label: t.thai,
                      leadingIcon: (
                        <span
                          aria-hidden
                          style={{
                            display: 'inline-block',
                            width: 10,
                            height: 10,
                            borderRadius: 'var(--dim-radius-full, 9999px)',
                            background: t.color,
                            boxShadow: '0 0 0 1px var(--surface-card-100, #FFFFFF)',
                          }}
                        />
                      ),
                    }))}
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
                rows={sortedRows}
                rowKey={(t) => t.id}
                sortConfig={sortConfig}
                onSort={handleSort}
                onRowClick={startEdit}
                emptyMessage={query || filtersActive
                  ? 'ไม่พบรายการตรวจที่ตรงกับเงื่อนไข'
                  : 'ยังไม่มีรายการในทะเบียน'}
                emptySubtext={query || filtersActive ? 'ลองล้างตัวกรองหรือแก้คำค้นหา' : null}
              />
              </SmoothFilterResults>
            </SectionCard>
            </>
          )}

          {/* ─── Tube cap colours ─── */}
          {/* TOR §1.15.3 + กฎของทีม "ถ้าเลือก Heme สีหลอดจะ auto เปลี่ยนตาม" —
              สีจุกเป็นคุณสมบัติของ "ชนิดหลอด" ไม่ใช่ของรายการตรวจแต่ละรายการ
              จึงตั้งที่นี่ที่เดียว แล้วทุกหน้าจอที่ดึงสีจาก tubeKey (worklist ·
              สติกเกอร์ติดหลอด · หน้าสั่งตรวจ) เปลี่ยนตามทันที (มติผู้ใช้ 30 ส.ค. 69) */}
          {pageTab === 'tubes' && (
            <SectionCard
              icon='colorize'
              title='ชนิดหลอดและสีจุก'
              subtitle='กำหนดสีจุกของสิ่งส่งตรวจแต่ละชนิด — เปลี่ยนที่นี่แล้วทุกหน้าจอที่ใช้หลอดชนิดนี้เปลี่ยนตามทั้งระบบ'
              action={(
                <div className='flex items-center' style={{ gap: 'var(--dim-space-200)' }}>
                  <Badge style='neutral' size='small'>{`${LAB_TUBE_LIST.length} ชนิด`}</Badge>
                  <BrandButton
                    variant='fill'
                    /* md เท่ากับปุ่ม "เพิ่มทะเบียนรายการตรวจ" บนการ์ดแท็บแรก
                       (มติผู้ใช้ 31 ส.ค. 69) */
                    size='md'
                    leadingIcon='add'
                    onClick={() => setTubeDraft({ thai: '', additive: TUBE_ADDITIVES[0].value, volumeMl: 5, color: LAB_CAP_COLORS[0].color, capThai: LAB_CAP_COLORS[0].thai, note: '' })}
                  >
                    เพิ่มชนิดหลอด
                  </BrandButton>
                </div>
              )}
            >
              <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
                {LAB_TUBE_LIST.map((t) => {
                  const usedBy = LAB_TESTS.filter((x) => x.tubeKey === t.key || x.altTubeKey === t.key).length;
                  return (
                    <div
                      key={t.key}
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
                      <div className='flex items-center min-w-0' style={{ gap: 'var(--dim-space-300)', flex: '1 1 260px' }}>
                        <span
                          aria-hidden
                          style={{
                            width: 18, height: 18,
                            borderRadius: 'var(--dim-radius-full, 9999px)',
                            background: t.color,
                            boxShadow: '0 0 0 1px var(--surface-card-100, #FFFFFF)',
                            transition: 'background-color 160ms cubic-bezier(0.16, 1, 0.3, 1)',
                          }}
                        />
                        <div className='flex flex-col min-w-0'>
                          <span className='text-sm font-bold text-ink truncate'>{t.thai}</span>
                          <span className='text-xs text-ink-tertiary truncate'>
                            {t.additive} · {t.volumeMl} mL · ใช้กับ {usedBy} รายการตรวจ
                          </span>
                        </div>
                      </div>

                      <div className='flex flex-wrap items-center' style={{ gap: 'var(--dim-space-200)' }}>
                        {LAB_CAP_COLORS.map((c) => (
                          <CapColorSwatch
                            key={c.key}
                            color={c.color}
                            thai={c.thai}
                            selected={t.color === c.color}
                            ariaLabel={`ตั้งจุกของ ${t.thai} เป็นสี${c.thai}`}
                            onClick={() => setTubeCapColor(t.key, { color: c.color, capThai: c.thai })}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
              <span className='text-xs text-ink-tertiary'>
                สีจุกผูกกับชนิดหลอด ไม่ใช่กับใบสั่งตรวจ — รายการตรวจที่ใช้หลอดชนิดเดียวกันจึงได้สีเดียวกันเสมอ
              </span>

              <Popup
                open={!!tubeDraft}
                onClose={() => setTubeDraft(null)}
                /* ขยายเป็น large (มติผู้ใช้ 31 ส.ค. 69) — ที่ default (448px) จานสี
                   11 สีตกบรรทัดที่สอง และช่องสองคอลัมน์แคบจนอ่านป้ายไม่จบ */
                size='large'
                title='เพิ่มชนิดหลอด'
                secondaryAction={{ label: 'ยกเลิก', onClick: () => setTubeDraft(null) }}
                primaryAction={{
                  label: 'เพิ่มชนิดหลอด',
                  disabled: !tubeDraft?.thai.trim(),
                  onClick: () => {
                    addLabTube(tubeDraft);
                    setTubeDraft(null);
                    setSaved(true);
                  },
                }}
              >
                {tubeDraft ? (
                  /* ระยะห่างระหว่างช่อง 24px (มติผู้ใช้ 31 ส.ค. 69) — ทั้งแนวตั้งและ
                     ระหว่างสองคอลัมน์ในแถวเดียวกัน */
                  <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-600)' }}>
                    <TextField
                      label='ชื่อชนิดหลอด'
                      required
                      value={tubeDraft.thai}
                      onChange={(v) => setTubeDraft((c) => ({ ...c, thai: v }))}
                      placeholder='เช่น หลอดจุกดำ (ESR)'
                    />
                    <div className='grid grid-cols-1 md:grid-cols-2 w-full' style={{ gap: 'var(--dim-space-600)' }}>
                      <SelectField
                        label='สารกันเลือดแข็ง / น้ำยาในหลอด'
                        value={tubeDraft.additive}
                        onChange={(v) => setTubeDraft((c) => ({ ...c, additive: v }))}
                        options={TUBE_ADDITIVES}
                      />
                      {/* หน่วยอยู่ในวงเล็บท้ายชื่อช่อง ไม่ใช่บรรทัดคำอธิบายใต้ช่อง
                          (มติผู้ใช้ 31 ส.ค. 69) */}
                      <NumberField
                        label='ปริมาตรที่ต้องเก็บ (mL)'
                        value={tubeDraft.volumeMl}
                        onChange={(v) => setTubeDraft((c) => ({ ...c, volumeMl: v }))}
                      />
                    </div>
                    <TextField
                      label='ข้อควรระวังในการเก็บ'
                      value={tubeDraft.note}
                      onChange={(v) => setTubeDraft((c) => ({ ...c, note: v }))}
                      placeholder='เช่น กลับหลอด 8–10 ครั้ง ห้ามเขย่า'
                    />
                    <div className='flex flex-col' style={{ gap: 'var(--dim-space-200)' }}>
                      <span className='text-xs text-ink-secondary'>สีจุก</span>
                      <div className='flex flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
                        {LAB_CAP_COLORS.map((c) => (
                          <CapColorSwatch
                            key={c.key}
                            color={c.color}
                            thai={c.thai}
                            selected={tubeDraft.color === c.color}
                            ariaLabel={`จุกสี${c.thai}`}
                            onClick={() => setTubeDraft((cur) => ({ ...cur, color: c.color, capThai: c.thai }))}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                ) : null}
              </Popup>
            </SectionCard>
          )}

          {pageTab === 'sticker' && (
            /* ซ้ายฟอร์ม 2 ส่วน : ขวาตัวอย่างสติกเกอร์ 1 ส่วน — ทรงเดียวกับหน้า
               ตั้งค่าตู้ Kiosk (มติผู้ใช้ 31 ส.ค. 69) เดิมตัวอย่างอยู่ท้ายฟอร์ม
               ต้องเลื่อนผ่านช่องทั้งหมดกว่าจะเห็นผลของสิ่งที่เพิ่งติ๊ก */
            <div className='grid grid-cols-1 xl:grid-cols-3 w-full' style={{ gap: 'var(--dim-space-500)' }}>
            <div className='xl:col-span-2 flex min-w-0'>
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
              {/* กรอบครอบทั้งกลุ่ม (มติผู้ใช้ 31 ส.ค. 69) — เช็กบ็อกซ์ 13 ตัวลอยอยู่บน
                  พื้นการ์ดเปล่า ๆ อ่านไม่ออกว่าเป็นชุดเดียวกันถึงไหน ระยะภายใน 12px
                  พอเป็นเช็กบ็อกซ์เปล่าแล้ว 24px ห่างจนอ่านเป็นคนละกลุ่ม */}
              <div
                className='grid grid-cols-1 md:grid-cols-3 w-full'
                style={{
                  gap: 'var(--dim-space-300)',
                  padding: 'var(--dim-space-400)',
                  borderRadius: 'var(--dim-radius-300)',
                  border: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary)',
                  background: 'var(--surface-card-200)',
                }}
              >
                {LAB_STICKER_FIELDS.map((f) => (
                  /* เช็กบ็อกซ์เปล่า ๆ ไม่ต้องมีกรอบการ์ด (มติผู้ใช้ 31 ส.ค. 69) —
                     `Checkbox` ของดีไซน์ซิสเต็มมีทั้ง label และ description ในตัว
                     จึงไม่ต้องประกอบข้อความเองข้างนอก */
                  <Checkbox
                    key={f.key}
                    checked={isStickerFieldOn(f.key)}
                    onChange={(next) => setStickerField(f.key, next)}
                    label={f.label}
                    description={f.hint}
                  />
                ))}
              </div>

              <div className='grid grid-cols-1 md:grid-cols-2 w-full' style={{ gap: 'var(--dim-space-600)' }}>
                {/* ช่อง "ชื่อหน่วยบริการที่พิมพ์บนสติกเกอร์" ถูกลบ 31 ส.ค. 69 (มติผู้ใช้)
                    — ชื่อมาจากศูนย์ที่ให้บริการอยู่แล้ว เหลือแค่เช็กบ็อกซ์ว่าจะพิมพ์หรือไม่
                    · จำนวนสติกเกอร์เป็น Stepper ของดีไซน์ซิสเต็ม กดเพิ่ม-ลดได้ */}
                <div className='flex flex-col' style={{ gap: 'var(--dim-space-150)' }}>
                  <span className='text-xs text-ink-secondary'>จำนวนสติกเกอร์ต่อหลอด (ใบ)</span>
                  <Stepper
                    size='large'
                    value={printSettings.copiesPerTube}
                    min={1}
                    max={9}
                    onChange={(n) => setPrintSetting('copiesPerTube', Math.max(1, n ?? 1))}
                    aria-label='จำนวนสติกเกอร์ต่อหลอด'
                  />
                </div>
                {/* ขนาดสติกเกอร์ตามม้วนกระดาษที่หน่วยงานใช้ (มติผู้ใช้ 31 ส.ค. 69) */}
                <SelectField
                  label='ขนาดสติกเกอร์'
                  value={printSettings.stickerSize}
                  onChange={(v) => setPrintSetting('stickerSize', v)}
                  options={LAB_STICKER_SIZES}
                />
              </div>

              {/* Live preview — the point of a configurable label is seeing
                  what the change did, and a sticker is small enough to show
                  inline. Uses a real worklist row so the preview reflects
                  actual data rather than lorem. */}
            </SectionCard>
            </div>

            <SectionCard
              icon='barcode'
              title='ตัวอย่างสติกเกอร์'
              subtitle='อัปเดตตามข้อมูลที่เลือกไว้ทางซ้ายทันที'
            >
              {previewGroup ? (
                /* ตัวอย่างขยาย 2 เท่า (มติผู้ใช้ 31 ส.ค. 69) — สติกเกอร์วาดด้วยหน่วย
                   มิลลิเมตรจริง (50 × 25 มม.) บนจอจึงเล็กราว 190 × 95 px อ่านไม่ออก
                   ขยายด้วย `transform: scale` ไม่ใช่เปลี่ยนขนาดจริง ตัวที่ส่งไปพิมพ์
                   จึงยังเป็นขนาดเท่ากระดาษเป๊ะ ๆ */
                <div className='flex flex-col' style={{ gap: 'var(--dim-space-200)' }}>
                  <div
                    style={{
                      background: '#FFFFFF',
                      border: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary)',
                      borderRadius: 'var(--dim-radius-200)',
                      padding: 'var(--dim-space-400)',
                      overflow: 'auto',
                    }}
                  >
                    <div
                      style={{
                        transform: 'scale(2)',
                        transformOrigin: 'top left',
                        width: `calc(${stickerBox.width} * 2)`,
                        height: `calc(${stickerBox.height} * 2)`,
                      }}
                    >
                      <SpecimenSticker group={previewGroup} settings={printSettings} />
                    </div>
                  </div>
                  <span className='text-xs text-ink-tertiary'>
                    {`แสดงผลขยาย 2 เท่า · ขนาดพิมพ์จริง ${stickerBox.label.replace(/\s*\(.*\)$/, '')}`}
                  </span>
                </div>
              ) : (
                <span className='text-xs text-ink-tertiary'>ยังไม่มีรายการในคิวสำหรับทำตัวอย่างสติกเกอร์</span>
              )}
            </SectionCard>
            </div>
          )}

          {/* ─── Edit form ─── */}
          {/* กด "เพิ่มรายการตรวจ" หรือไอคอนแก้ไขบนแถว → เปิดเป็น popup
              (มติผู้ใช้ 29 ส.ค. 69) ของเดิมต่อท้ายหน้าแล้วเลื่อนจอลงไปหา
              ทำให้ทะเบียนกับฟอร์มปนกันในหน้าเดียวและหาที่บันทึกไม่เจอ */}
          <Popup
            open={!!form}
            onClose={cancelEdit}
            size='extraLarge'
            /* ชื่อป๊อปอัปตรงกับปุ่มที่กดเข้ามา (มติผู้ใช้ 31 ส.ค. 69) — ปุ่มเขียน
               "เพิ่มทะเบียนรายการตรวจ" แต่หัวป๊อปอัปเขียน "เพิ่มรายการตรวจใหม่"
               อ่านเหมือนคนละอย่าง */
            title={editingId === 'new' ? 'เพิ่มทะเบียนรายการตรวจ' : `แก้ไข ${form?.nameEn || form?.code || ''}`}
            /* ปุ่ม ‹ บนหัวป๊อปอัปคือย้อนขั้น ส่วน "ยกเลิก" ยังปิดฟอร์มทั้งใบเสมอ
               เหมือนป๊อปอัปทะเบียนยา ผู้ใช้จึงไม่ต้องเดาว่าปุ่มไหนออกจากฟอร์ม */
            onBack={step > 0 ? goPrevStep : undefined}
            tertiaryAction={step > 0 ? { label: 'ยกเลิก', onClick: cancelEdit } : undefined}
            secondaryAction={step > 0
              ? { label: 'ย้อนกลับ', onClick: goPrevStep }
              : { label: 'ยกเลิก', onClick: cancelEdit }}
            primaryAction={{
              label: isLastStep ? 'บันทึกรายการตรวจ' : 'ถัดไป',
              onClick: goNextStep,
              disabled: !canAdvance,
            }}
          >
            {form && (
            <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-500)' }}>
              {/* แถบขั้นตอนวางกึ่งกลางป๊อปอัป (มติผู้ใช้ 31 ส.ค. 69) — แถวของ
                  StepProgress กว้างเท่าเนื้อหา จึงจัดกลางที่ตัวห่อ */}
              <div className='flex w-full justify-center'>
                <StepProgress
                  steps={FORM_STEPS}
                  current={step}
                  completedSteps={completedSteps}
                  onStepClick={handleStepClick}
                  compact
                  className='justify-center'
                />
              </div>

              {step === 0 && (
                <>
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
                    />
                    <TextField label='LOINC NUM' mono value={form.loinc} onChange={(v) => setField('loinc', v)} placeholder='เช่น 4548-4' />
                    <TextField label='รหัส ICD10TM' mono value={form.icd10tm} onChange={(v) => setField('icd10tm', v)} placeholder='เช่น 0531601' />
                    <TextField label='รหัส OPBKK' mono value={form.opbkk} onChange={(v) => setField('opbkk', v)} placeholder='เช่น 30208' />
                  </div>

                  {/* คอลัมน์ "สถานะ" ของทะเบียนต้องตั้งได้จากฟอร์มด้วย (มติผู้ใช้
                      31 ส.ค. 69) — เดิมตั้งได้เฉพาะสวิตช์บนแถวหลังบันทึกไปแล้ว */}
                  <Checkbox
                    label='เปิดใช้งานรายการนี้'
                    description='ปิดไว้ = ยังอยู่ในทะเบียนแต่สั่งตรวจไม่ได้'
                    checked={form.active !== false}
                    onChange={(next) => setField('active', next)}
                  />
                </SectionCard>
                </>
              )}

              {step === 1 && (
                <>
                <SectionCard
                  icon='colorize'
                  title='สิ่งส่งตรวจและการเตรียมตัว'
                  subtitle='หลอด/สีจุกผูกกับรายการตรวจ ไม่ใช่ผูกกับใบสั่ง — ทุกหน้าจอจะดึงสีจากตรงนี้เหมือนกันทั้งระบบ'
                >
                  <TubePicker value={form.tubeKey} onChange={(v) => setField('tubeKey', v)} />
                  {/* ช่อง "หลอดทางเลือก (ถ้ามี)" ถูกเอาออก 31 ส.ค. 69 (มติผู้ใช้) —
                      `form.altTubeKey` ยังอยู่บนฟอร์มและยังขึ้นในขั้นตรวจสอบข้อมูล
                      ของรายการที่เคยตั้งค่าไว้ แค่ไม่มีที่ให้ตั้งใหม่แล้ว */}
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
                </>
              )}

              {step === 2 && (
                <>
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
                </>
              )}

              {step === 3 && (
                <>
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
                </>
              )}

              {step === 4 && (
                <SectionCard
                  icon='fact_check'
                  title='ตรวจสอบก่อนบันทึก'
                  subtitle='ทวนค่าที่กรอกทั้งหมดในหน้าเดียว — กดหัวข้อขั้นตอนด้านบนเพื่อย้อนกลับไปแก้ได้ทันที'
                >
                  <div className='grid grid-cols-1 md:grid-cols-2 w-full' style={{ gap: 'var(--dim-space-400)' }}>
                    <ReviewGroup title='ข้อมูลพื้นฐาน'>
                      <ReviewRow label='รหัสรายการ' value={form.code} mono />
                      <ReviewRow label='ชื่อ' value={form.nameEn} />
                      <ReviewRow label='ชื่อเต็ม (FSN)' value={form.nameFull} />
                      <ReviewRow label='ชื่อภาษาไทย' value={form.nameTh} />
                      <ReviewRow label='ชนิด' value={isPanel ? 'PANEL or PROFILE' : 'ITEM'} />
                      <ReviewRow label='กลุ่ม' value={LAB_GROUPS.find((g) => g.key === form.group)?.thai} />
                    </ReviewGroup>

                    <ReviewGroup title='รหัสมาตรฐาน'>
                      <ReviewRow label='รหัส TMLT' value={form.tmlt} mono />
                      <ReviewRow label='LOINC NUM' value={form.loinc} mono />
                      <ReviewRow label='รหัส ICD10TM' value={form.icd10tm} mono />
                      <ReviewRow label='รหัส OPBKK' value={form.opbkk} mono />
                    </ReviewGroup>

                    <ReviewGroup title='สิ่งส่งตรวจและการเตรียมตัว'>
                      <ReviewRow label='หลอด/สีจุก' value={LAB_TUBES[form.tubeKey]?.thai} />
                      <ReviewRow label='หลอดทางเลือก' value={form.altTubeKey ? LAB_TUBES[form.altTubeKey]?.thai : 'ไม่กำหนด'} />
                      <ReviewRow label='จำนวนหลอด' value={`${form.tubeCount || 1} หลอด`} />
                      <ReviewRow label='งดอาหารก่อนตรวจ' value={form.fastingHours ? `${form.fastingHours} ชั่วโมง` : 'ไม่ต้องงด'} />
                      <ReviewRow label='การปกปิดผล' value={form.confidential ? 'เป็นผลตรวจที่ต้องปกปิด' : 'ไม่ปกปิด'} />
                    </ReviewGroup>

                    <ReviewGroup title='ราคา'>
                      <ReviewRow label='ราคาต้นทุน' value={`${form.costPrice ?? 0} บาท`} />
                      <ReviewRow label='ราคาขาย' value={`${form.price ?? 0} บาท`} />
                      <ReviewRow label='ราคาที่เรียกเก็บ' value={`${form.chargePrice ?? form.price ?? 0} บาท`} />
                      <ReviewRow
                        label='แยกตามสิทธิ'
                        value={form.priceByRight
                          ? `กำหนดเอง ${Object.keys(form.priceByRight).length} สิทธิ`
                          : 'ใช้ราคาขายตั้งต้นทุกสิทธิ'}
                      />
                    </ReviewGroup>

                    <ReviewGroup title={isPanel ? 'รายการย่อยในชุดตรวจ' : 'การรายงานผล'} full>
                      <ReviewRow
                        label='ประเภทการรายงานผล'
                        value={LAB_RESULT_TYPES.find((r) => r.key === form.resultType)?.label}
                      />
                      {form.analytes.map((a, i) => (
                        <ReviewRow
                          key={i}
                          label={isPanel ? `รายการย่อยที่ ${i + 1}` : 'ค่าที่รายงาน'}
                          value={[a.label, a.unit, a.normalRange && `ค่าปกติ ${a.normalRange}`]
                            .filter(Boolean).join(' · ')}
                        />
                      ))}
                    </ReviewGroup>
                  </div>
                </SectionCard>
              )}

            </div>
            )}
          </Popup>
        </div>
    </QueuePageShell>
    {/* แถบบันทึกขึ้นเฉพาะแท็บ "ข้อมูลบนสติกเกอร์ Lab" (มติผู้ใช้ 31 ส.ค. 69) —
        อีกสองแท็บบันทึกทันทีที่กด: ทะเบียนรายการตรวจบันทึกจากฟอร์มในป๊อปอัป
        ส่วนสีจุกเขียนลงทะเบียนทันทีที่เลือก ปุ่มบันทึกจึงไม่มีอะไรให้ทำ */}
    {pageTab === 'sticker' ? (
    <div
      className='sticky flex items-center justify-end w-full'
      style={{
        bottom: 0,
        zIndex: 2,
        gap: 'var(--dim-space-300)',
        marginTop: 'var(--dim-space-200)',
        paddingTop: 'var(--dim-space-400)',
        paddingBottom: 'var(--dim-space-400)',
        paddingLeft: 'var(--dim-space-600)',
        paddingRight: 'var(--dim-space-600)',
        background: 'var(--surface-card-100)',
        borderTop: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
      }}
    >
      <BrandButton variant='fill' size='md' leadingIcon='save' onClick={() => setSaved(true)}>
        บันทึก
      </BrandButton>
    </div>
    ) : null}

    <Popup
      open={!!activeChange}
      onClose={() => setActiveChange(null)}
      size='default'
      title={activeChange?.active ? 'ยืนยันการเปิดใช้งานรายการตรวจ' : 'ยืนยันการยกเลิกใช้งานรายการตรวจ'}
      subtitle={`${activeChange?.test.nameEn || ''} — ${activeChange?.test.nameTh || ''}`}
      tertiaryAction={{ label: 'ยกเลิก', onClick: () => setActiveChange(null) }}
      primaryAction={{
        label: 'ยืนยัน',
        onClick: () => {
          setLabTestRetired(activeChange.test.id, !activeChange.active);
          setActiveChange(null);
        },
      }}
    >
      <p style={{ margin: 0, color: 'var(--text-content-secondary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)' }}>
        {activeChange?.active
          ? 'รายการนี้จะกลับมาเลือกได้ในหน้าสั่งตรวจทันที'
          : 'รายการนี้จะไม่ขึ้นให้เลือกในหน้าสั่งตรวจ แต่ผลตรวจเดิมที่เคยสั่งไปแล้วยังอ้างอิงได้ตามปกติ'}
      </p>
    </Popup>
    <SuccessToast open={saved} message='บันทึกรายการตรวจแล้ว' onClose={() => setSaved(false)} />
    </>
  );
};

export default LabSetupPage;
