import React, { useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import QueuePageShell, { QUEUE_STICKY_UNDER_TABS } from '@/templates/QueuePageShell';
import PrimarySearch from '@/components/search/PrimarySearch';
import FilterTag, { FilterDropdown } from '@/components/forms/FilterTag';
import OverflowFlexRow from '@/components/overflow/OverflowFlexRow';
import Table from '@/components/table/Table';
import Checkbox from '@/components/checkbox/Checkbox';
import Switch from '@/components/switch/Switch';
import InputField from '@/components/forms/InputField';
import Select from '@/components/forms/Select';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import BrandSubdueIconButton from '@/components/button/BrandSubdueIconButton';
import Popup from '@/components/popup/Popup';
import Icon from '@/components/icons/Icon';
import TabCapsule from '@/components/tab/TabCapsule';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import {
  CHECKUP_CATALOG, CHECKUP_ITEM_GROUPS, CHECKUP_ITEM_GROUP_LABEL, LAB_PANELS,
  REF_SOURCES, REFERENCE_RANGES, CANCEL_REASON_SUGGESTIONS,
  listPackages, savePackage, deactivatePackage, reactivatePackage,
  isPackageInUse, packagePrice, nextPackageCode, findCatalogItem, formatBahtTh,
  formatThaiDateTime, referenceLevelsFor, formatRange, getCheckupRight,
  toggleCheckupRight, CHECKUP_STAFF,
} from '@/data/checkupStore';
import {
  PageBody, PageCard, PagerRow, EmptyState, NoticeBar, SectionHeader, SubCard,
  ReadField,
} from '@/pages/checkup/CheckupUi';

/* CheckupPackagePage — ทะเบียนชุดตรวจสุขภาพ (TOR 1.19.1 / 1.19.2 / 1.19.18).

   List + create/edit live on the same route, exactly like PharmacyRegistryPage:
   `mode` flips between the ทะเบียน table and the editor panel. Names and item
   groups follow HCIS §2.13.1 (รายการตรวจรังสี · ห้องปฏิบัติการ · หัตถการและ
   ค่าใช้จ่ายอื่น · รายการตรวจอื่นๆ) including the ชุด Lab shortcut.

   All four verbs of the requirement live here:
     แสดง   — the table + the read-only editor when the user lacks the right
     บันทึก — "บันทึกชุดตรวจ" commits create/edit
     แก้ไข  — row → editor prefilled
     ยกเลิก — a package referenced by an existing visit is never deleted; it
              is set inactive with a mandatory reason (and can be reopened). */

const breadcrumb = ['ระบบงานตรวจสุขภาพ', 'ทะเบียนชุดตรวจสุขภาพ'];
const PAGE_SIZE = 10;

const RIGHTS_OPTIONS = [
  { value: 'สิทธิหลักประกันสุขภาพแห่งชาติ (บัตรทอง)', label: 'สิทธิหลักประกันสุขภาพแห่งชาติ (บัตรทอง)' },
  { value: 'สิทธิประกันสังคม', label: 'สิทธิประกันสังคม' },
  { value: 'สิทธิเบิกจ่ายตรงกรมบัญชีกลาง', label: 'สิทธิเบิกจ่ายตรงกรมบัญชีกลาง' },
  { value: 'สิทธิข้าราชการกรุงเทพมหานคร', label: 'สิทธิข้าราชการกรุงเทพมหานคร' },
  { value: 'ชำระเงินเอง', label: 'ชำระเงินเอง' },
];

const SERVICE_TYPE_OPTIONS = [
  { value: 'ประชาชนทั่วไป', label: 'ประชาชนทั่วไป' },
  { value: 'ข้าราชการ / พนักงานของรัฐ', label: 'ข้าราชการ / พนักงานของรัฐ' },
  { value: 'ผู้สูงอายุ', label: 'ผู้สูงอายุ' },
  { value: 'เด็กและวัยเรียน', label: 'เด็กและวัยเรียน' },
  { value: 'ผู้ประกอบอาชีพเฉพาะ', label: 'ผู้ประกอบอาชีพเฉพาะ' },
  { value: 'หญิงตั้งครรภ์', label: 'หญิงตั้งครรภ์' },
];

const SEX_OPTIONS = [
  { value: 'ทุกเพศ', label: 'ทุกเพศ' },
  { value: 'ชาย', label: 'ชาย' },
  { value: 'หญิง', label: 'หญิง' },
];

const EMPTY_FORM = {
  id: '',
  code: '',
  name: '',
  rights: RIGHTS_OPTIONS[0].value,
  serviceType: SERVICE_TYPE_OPTIONS[0].value,
  sex: 'ทุกเพศ',
  ageFrom: '',
  ageTo: '',
  note: '',
  items: [],
  refOverrides: {},
  active: true,
};

/* ── item lookup popup (Look up ตามคู่มือ §2.13.1) ────────────────── */

const ItemLookupPopup = ({ open, group, selected, onClose, onConfirm }) => {
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState([]);

  useEffect(() => {
    if (open) { setQ(''); setPicked([]); }
  }, [open, group]);

  const groupLabel = CHECKUP_ITEM_GROUP_LABEL[group] || '';
  const minChars = group === 'procedure' ? 2 : 1;

  const candidates = useMemo(
    () => CHECKUP_CATALOG.filter((i) => i.group === group && !selected.includes(i.code)),
    [group, selected],
  );

  const results = useMemo(() => {
    if (q.trim().length < minChars) return [];
    const needle = q.trim().toLowerCase();
    return candidates.filter((i) => `${i.code} ${i.name}`.toLowerCase().includes(needle));
  }, [q, candidates, minChars]);

  const toggle = (code) => setPicked((p) => (p.includes(code) ? p.filter((c) => c !== code) : [...p, code]));

  const columns = [
    {
      key: 'pick',
      label: '',
      sortable: false,
      render: (row) => (
        <Checkbox
          checked={picked.includes(row.code)}
          onChange={() => toggle(row.code)}
          aria-label={`เลือก ${row.name}`}
        />
      ),
    },
    { key: 'code', label: 'รหัส' },
    { key: 'name', label: 'ชื่อรายการตรวจ', flex: true, minWidth: 260 },
    { key: 'price', label: 'ราคา', align: 'right', render: (r) => formatBahtTh(r.price) },
    { key: 'claimable', label: 'เบิกได้', align: 'right', render: (r) => formatBahtTh(r.claimable) },
  ];

  return (
    <Popup
      open={open}
      onClose={onClose}
      title={`เลือก${groupLabel}`}
      subtitle={`พิมพ์อย่างน้อย ${minChars} ตัวอักษรเพื่อค้นหา แล้วติกเลือกรายการที่ต้องการ (เลือกได้มากกว่า 1 รายการ)`}
      size='extraLarge'
      tertiaryAction={{ label: 'ยกเลิก', onClick: onClose }}
      primaryAction={{
        label: picked.length > 0 ? `ตกลง (${picked.length} รายการ)` : 'ตกลง',
        onClick: () => { onConfirm(picked); onClose(); },
        disabled: picked.length === 0,
      }}
    >
      <div className='flex flex-col' style={{ gap: 'var(--dim-space-400)' }}>
        <InputField
          label='คำค้นหา'
          showHelperText={false}
          leadingIcon='search'
          size='md'
          placeholder={`เช่น ${candidates[0]?.name?.slice(0, 12) || 'ชื่อรายการตรวจ'}`}
          value={q}
          onChange={(e) => setQ(e?.target ? e.target.value : e)}
        />
        {q.trim().length < minChars ? (
          <EmptyState
            compact
            icon='manage_search'
            title={`พิมพ์อย่างน้อย ${minChars} ตัวอักษรเพื่อเริ่มค้นหา`}
            subtitle={`มีทั้งหมด ${candidates.length} รายการที่ยังไม่ได้เลือกในกลุ่ม "${groupLabel}"`}
          />
        ) : results.length === 0 ? (
          <EmptyState
            compact
            icon='search_off'
            title='ไม่พบผลลัพธ์'
            subtitle='ลองพิมพ์คำค้นหาอื่น หรือรายการที่ค้นหาอาจถูกเลือกไว้แล้ว'
          />
        ) : (
          <Table columns={columns} rows={results} rowKey={(r) => r.code} emptyMessage='ไม่พบรายการ' />
        )}
      </div>
    </Popup>
  );
};

/* ── ชุด Lab popup (HCIS §2.13.1 step 7) ─────────────────────────── */

const LabPanelPopup = ({ open, onClose, onConfirm }) => {
  const [picked, setPicked] = useState([]);
  useEffect(() => { if (open) setPicked([]); }, [open]);

  const toggle = (code) => setPicked((p) => (p.includes(code) ? p.filter((c) => c !== code) : [...p, code]));

  return (
    <Popup
      open={open}
      onClose={onClose}
      title='เลือกชุด Lab'
      subtitle='ติกเลือกชุด Lab ที่ต้องการ — ระบบจะเพิ่มรายการตรวจในชุดนั้นเข้าไปทั้งหมด'
      tertiaryAction={{ label: 'ยกเลิก', onClick: onClose }}
      primaryAction={{
        label: 'ตกลง',
        onClick: () => { onConfirm(picked.flatMap((c) => LAB_PANELS.find((p) => p.code === c)?.members || [])); onClose(); },
        disabled: picked.length === 0,
      }}
    >
      <div className='flex flex-col' style={{ gap: 'var(--dim-space-300)' }}>
        {LAB_PANELS.map((panel) => (
          <Checkbox
            key={panel.code}
            checked={picked.includes(panel.code)}
            onChange={() => toggle(panel.code)}
            label={panel.name}
            description={panel.members.map((m) => findCatalogItem(m)?.name).filter(Boolean).join(' · ')}
          />
        ))}
      </div>
    </Popup>
  );
};

/* ── เกณฑ์แปลผล tab (§1.19.18) ───────────────────────────────────── */

const CriteriaTab = ({ form, setForm, readOnly }) => {
  const codes = (form.items || []).filter((c) => REFERENCE_RANGES[c] || findCatalogItem(c)?.resultType === 'numeric');
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState({ low: '', high: '', unit: '', advice: '' });

  const openEdit = (code) => {
    const current = (form.refOverrides || {})[code]
      || REFERENCE_RANGES[code]?.hospital
      || REFERENCE_RANGES[code]?.standard
      || { low: '', high: '', unit: findCatalogItem(code)?.unit || '', advice: '' };
    setDraft({
      low: current.low ?? '',
      high: current.high ?? '',
      unit: current.unit ?? (findCatalogItem(code)?.unit || ''),
      advice: current.advice ?? '',
    });
    setEditing(code);
  };

  const commit = () => {
    setForm((f) => ({
      ...f,
      refOverrides: {
        ...(f.refOverrides || {}),
        [editing]: {
          low: draft.low === '' ? null : Number(draft.low),
          high: draft.high === '' ? null : Number(draft.high),
          unit: draft.unit,
          advice: draft.advice,
          enabled: true,
        },
      },
    }));
    setEditing(null);
  };

  const clearOverride = (code) => {
    setForm((f) => {
      const next = { ...(f.refOverrides || {}) };
      delete next[code];
      return { ...f, refOverrides: next };
    });
  };

  const columns = [
    { key: 'code', label: 'รหัส' },
    { key: 'name', label: 'รายการตรวจ', flex: true, minWidth: 240, render: (r) => findCatalogItem(r.code)?.name || r.code },
    {
      key: 'levels',
      label: 'ค่าอ้างอิงตามลำดับ API › รพ. › มาตรฐาน',
      flex: true,
      minWidth: 380,
      sortable: false,
      render: (r) => {
        const levels = referenceLevelsFor(r.code, form.refOverrides || {});
        if (levels.length === 0) {
          return <ColorfulBadge style='grey' size='small' hierarchy='secondary'>ยังไม่ตั้งเกณฑ์</ColorfulBadge>;
        }
        return (
          <span className='flex flex-col' style={{ gap: 'var(--dim-space-100)' }}>
            {levels.map((lv) => (
              <span key={lv.key} className='inline-flex items-center' style={{ gap: 'var(--dim-space-150)' }}>
                <ColorfulBadge style={REF_SOURCES[lv.key].badge} size='small' hierarchy='secondary'>
                  {REF_SOURCES[lv.key].short}
                </ColorfulBadge>
                <span style={{ fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-secondary, #636B72)' }}>
                  {formatRange(lv.range)}
                  {lv.custom ? ' · ตั้งค่าเอง' : ''}
                  {REF_SOURCES[lv.key].editable ? '' : ' · อ่านอย่างเดียว'}
                </span>
              </span>
            ))}
          </span>
        );
      },
    },
    {
      key: 'actions',
      label: 'การดำเนินการ',
      sortable: false,
      render: (r) => (
        <span className='inline-flex items-center' style={{ gap: 'var(--dim-space-150)' }}>
          <BrandSubdueButton
            variant='outline'
            size='sm'
            leadingIcon='tune'
            disabled={readOnly}
            onClick={() => openEdit(r.code)}
          >
            ตั้งค่าโดยศูนย์ฯ
          </BrandSubdueButton>
          {(form.refOverrides || {})[r.code] ? (
            <NeutralSubdueButton size='sm' leadingIcon='undo' disabled={readOnly} onClick={() => clearOverride(r.code)}>
              ยกเลิกค่าที่ตั้ง
            </NeutralSubdueButton>
          ) : null}
        </span>
      ),
    },
  ];

  return (
    <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
      <SectionHeader
        icon='rule'
        title='เกณฑ์แปลผลของชุดตรวจนี้'
        subtitle='ระบบใช้ค่าอ้างอิงตามลำดับความสำคัญ API › ค่าที่ศูนย์ฯ ตั้งเอง › มาตรฐานทางการแพทย์ (TOR 1.19.18)'
      />
      <div className='grid grid-cols-1 md:grid-cols-3 w-full' style={{ gap: 'var(--dim-space-300)' }}>
        {Object.values(REF_SOURCES).map((src) => (
          <SubCard key={src.key} tone={src.editable ? 'brand' : 'neutral'}>
            <span className='inline-flex items-center' style={{ gap: 'var(--dim-space-200)' }}>
              <ColorfulBadge style={src.badge} size='small' hierarchy='secondary'>{`ระดับ ${src.order}`}</ColorfulBadge>
              <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm, 14px)', fontWeight: 'var(--type-weight-medium, 500)' }}>
                {src.label}
              </span>
            </span>
            <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary, #858C92)' }}>
              {src.note}
            </span>
          </SubCard>
        ))}
      </div>

      {codes.length === 0 ? (
        <EmptyState
          icon='rule'
          title='ยังไม่มีรายการตรวจที่แปลผลเป็นค่าตัวเลข'
          subtitle='เพิ่มรายการตรวจทางห้องปฏิบัติการหรือรายการตรวจอื่นๆ ที่มีค่าตัวเลขในแท็บ "รายการตรวจ" ก่อน'
        />
      ) : (
        <Table columns={columns} rows={codes.map((code) => ({ code }))} rowKey={(r) => r.code} emptyMessage='ไม่พบรายการ' />
      )}

      <Popup
        open={!!editing}
        onClose={() => setEditing(null)}
        title='ตั้งค่าเกณฑ์แปลผลโดยศูนย์บริการสาธารณสุข'
        subtitle={editing ? `${findCatalogItem(editing)?.name || editing} · ระดับ 2 (ตั้งค่าโดยศูนย์ฯ)` : ''}
        tertiaryAction={{ label: 'ยกเลิก', onClick: () => setEditing(null) }}
        primaryAction={{ label: 'บันทึกเกณฑ์', onClick: commit }}
      >
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-400)' }}>
          <NoticeBar tone='info' icon='info'>
            ค่าที่ตั้งที่นี่จะถูกใช้แทนค่ามาตรฐานทางการแพทย์ แต่ยังถูกแทนที่ด้วยค่าที่รับจาก API หากมี
          </NoticeBar>
          <div className='grid grid-cols-1 md:grid-cols-3' style={{ gap: 'var(--dim-space-300)' }}>
            <InputField
              label='ค่าต่ำสุดที่ถือว่าปกติ'
              showHelperText={false}
              showLeadingIcon={false}
              size='md'
              type='number'
              value={draft.low}
              onChange={(e) => setDraft((d) => ({ ...d, low: e?.target ? e.target.value : e }))}
            />
            <InputField
              label='ค่าสูงสุดที่ถือว่าปกติ'
              showHelperText={false}
              showLeadingIcon={false}
              size='md'
              type='number'
              value={draft.high}
              onChange={(e) => setDraft((d) => ({ ...d, high: e?.target ? e.target.value : e }))}
            />
            <InputField
              label='หน่วย'
              showHelperText={false}
              showLeadingIcon={false}
              size='md'
              value={draft.unit}
              onChange={(e) => setDraft((d) => ({ ...d, unit: e?.target ? e.target.value : e }))}
            />
          </div>
          <SuggestibleTextarea
            voice
            label='คำแนะนำอัตโนมัติเมื่อผลผิดปกติ'
            value={draft.advice}
            onChange={(e) => setDraft((d) => ({ ...d, advice: e?.target ? e.target.value : e }))}
            placeholder='เช่น ระดับน้ำตาลสูงกว่าเกณฑ์ของศูนย์ฯ — ส่งพบพยาบาลให้คำปรึกษาโภชนาการ'
            suggestions={[
              'ส่งพบแพทย์เพื่อประเมินเพิ่มเติม',
              'นัดตรวจซ้ำภายใน 3 เดือน',
              'ส่งต่อคลินิกโรคเรื้อรัง (NCD)',
              'ให้คำปรึกษาโภชนาการและการออกกำลังกาย',
              'ควบคุมอาหาร ลดหวาน มัน เค็ม',
            ]}
            minChars={2}
          />
        </div>
      </Popup>
    </div>
  );
};

/* ── editor ──────────────────────────────────────────────────────── */

const PackageEditor = ({ form, setForm, readOnly, onSave, onCancel, isNew, errors }) => {
  const [innerTab, setInnerTab] = useState('items');
  const [lookupGroup, setLookupGroup] = useState(null);
  const [panelOpen, setPanelOpen] = useState(false);

  const addItems = (codes) => setForm((f) => ({ ...f, items: [...new Set([...(f.items || []), ...codes])] }));
  const removeItem = (code) => setForm((f) => ({ ...f, items: (f.items || []).filter((c) => c !== code) }));

  const price = packagePrice(form);

  const groupRows = (groupKey) => (form.items || [])
    .map(findCatalogItem)
    .filter((i) => i && i.group === groupKey);

  const itemColumns = [
    { key: 'code', label: 'รหัส' },
    { key: 'name', label: 'ชื่อรายการตรวจ', flex: true, minWidth: 240 },
    { key: 'price', label: 'ราคา', align: 'right', render: (r) => formatBahtTh(r.price) },
    { key: 'claimable', label: 'เบิกได้', align: 'right', render: (r) => formatBahtTh(r.claimable) },
    {
      key: 'remove',
      label: '',
      sortable: false,
      render: (r) => (
        <BrandSubdueIconButton
          variant='outline'
          size='sm'
          icon='delete'
          disabled={readOnly}
          aria-label={`ลบ ${r.name} ออกจากชุดตรวจ`}
          onClick={() => removeItem(r.code)}
        />
      ),
    },
  ];

  return (
    <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-600)' }}>
      {readOnly ? (
        <NoticeBar tone='warning' icon='lock'>
          บัญชีผู้ใช้ของคุณไม่มีสิทธิ์จัดการทะเบียนชุดตรวจ — หน้านี้แสดงแบบอ่านอย่างเดียวและปุ่มบันทึกถูกปิดใช้งาน
        </NoticeBar>
      ) : null}

      <PageCard>
        <SectionHeader
          icon='inventory_2'
          title={isNew ? 'สร้างชุดตรวจใหม่' : `แก้ไขชุดตรวจ ${form.code}`}
          subtitle='ตั้งชื่อชุดตรวจ ระบุสิทธิการรักษา/ประเภทผู้รับบริการ แล้วเพิ่มรายการตรวจ 4 กลุ่มตามคู่มือ §2.13.1'
          trailing={(
            <span className='inline-flex items-center' style={{ gap: 'var(--dim-space-200)' }}>
              <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary, #858C92)' }}>
                สถานะใช้งาน
              </span>
              <Switch
                checked={!!form.active}
                onChange={(v) => setForm((f) => ({ ...f, active: v }))}
                disabled={readOnly}
                aria-label={form.active ? 'ปิดใช้งานชุดตรวจ' : 'เปิดใช้งานชุดตรวจ'}
              />
            </span>
          )}
        />

        <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 w-full' style={{ gap: 'var(--dim-space-400)' }}>
          <InputField
            label='รหัสชุดตรวจ'
            required
            showHelperText={!!errors.code}
            helperText={errors.code}
            error={!!errors.code}
            showLeadingIcon={false}
            size='md'
            disabled={readOnly}
            value={form.code}
            onChange={(e) => setForm((f) => ({ ...f, code: e?.target ? e.target.value : e }))}
          />
          <div className='md:col-span-1 xl:col-span-2'>
            <InputField
              label='ชื่อชุดตรวจ'
              required
              showHelperText={!!errors.name}
              helperText={errors.name}
              error={!!errors.name}
              showLeadingIcon={false}
              size='md'
              disabled={readOnly}
              placeholder='เช่น ตรวจสุขภาพสำหรับสิทธิประกันสุขภาพ (อายุ > 35 ปี และ BMI > 25) เพศหญิง'
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e?.target ? e.target.value : e }))}
            />
          </div>
          <Select
            label='สิทธิการรักษา'
            required
            showHelperText={false}
            showLeadingIcon={false}
            size='md'
            disabled={readOnly}
            options={RIGHTS_OPTIONS}
            value={form.rights}
            onChange={(v) => setForm((f) => ({ ...f, rights: typeof v === 'string' ? v : v?.value }))}
          />
          <Select
            label='ประเภทผู้รับบริการ'
            showHelperText={false}
            showLeadingIcon={false}
            size='md'
            disabled={readOnly}
            options={SERVICE_TYPE_OPTIONS}
            value={form.serviceType}
            onChange={(v) => setForm((f) => ({ ...f, serviceType: typeof v === 'string' ? v : v?.value }))}
          />
          <Select
            label='เพศที่ใช้ชุดตรวจนี้'
            showHelperText={false}
            showLeadingIcon={false}
            size='md'
            disabled={readOnly}
            options={SEX_OPTIONS}
            value={form.sex}
            onChange={(v) => setForm((f) => ({ ...f, sex: typeof v === 'string' ? v : v?.value }))}
          />
          <InputField
            label='อายุตั้งแต่ (ปี)'
            showHelperText={false}
            showLeadingIcon={false}
            size='md'
            type='number'
            disabled={readOnly}
            value={form.ageFrom}
            onChange={(e) => setForm((f) => ({ ...f, ageFrom: e?.target ? e.target.value : e }))}
          />
          <InputField
            label='ถึงอายุ (ปี)'
            showHelperText={false}
            showLeadingIcon={false}
            size='md'
            type='number'
            disabled={readOnly}
            value={form.ageTo}
            onChange={(e) => setForm((f) => ({ ...f, ageTo: e?.target ? e.target.value : e }))}
          />
        </div>

        <SuggestibleTextarea
          voice
          label='หมายเหตุของชุดตรวจ'
          value={form.note}
          disabled={readOnly}
          onChange={(e) => setForm((f) => ({ ...f, note: e?.target ? e.target.value : e }))}
          placeholder='เช่น ชุดตรวจตามนโยบายสำนักอนามัย ใช้กับรอบตรวจสุขภาพประจำปีของสำนักงานเขต'
          suggestions={[
            'ชุดตรวจตามนโยบายสำนักอนามัย',
            'ใช้กับรอบตรวจสุขภาพประจำปีของสำนักงานเขต',
            'สำหรับกลุ่มเสี่ยงโรค Metabolic',
            'เบิกได้เต็มตามสิทธิ',
            'ต้องงดอาหารก่อนตรวจ 8 ชั่วโมง',
          ]}
          minChars={2}
        />

        <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
          <TabCapsule variant='filter' label='รายการตรวจ' selected={innerTab === 'items'} onClick={() => setInnerTab('items')} />
          <TabCapsule variant='filter' label='เกณฑ์แปลผล' selected={innerTab === 'criteria'} onClick={() => setInnerTab('criteria')} />
        </div>

        {innerTab === 'items' ? (
          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-600)' }}>
            {CHECKUP_ITEM_GROUPS.map((group) => {
              const rows = groupRows(group.key);
              return (
                <div key={group.key} className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
                  <SectionHeader
                    icon={group.icon}
                    title={group.label}
                    subtitle={group.key === 'lab'
                      ? 'พิมพ์อย่างน้อย 1 ตัวอักษรเพื่อค้นหา หรือเลือกเป็นชุด Lab ทั้งชุด'
                      : group.key === 'procedure'
                        ? 'พิมพ์อย่างน้อย 2 ตัวอักษรเพื่อค้นหา (รหัส ICD-9-CM)'
                        : 'เลือกจาก Look up — เพิ่มได้มากกว่า 1 รายการ'}
                    trailing={(
                      <span className='inline-flex items-center' style={{ gap: 'var(--dim-space-200)' }}>
                        {group.key === 'lab' ? (
                          <NeutralSubdueButton size='sm' leadingIcon='library_add' disabled={readOnly} onClick={() => setPanelOpen(true)}>
                            เลือกชุด Lab
                          </NeutralSubdueButton>
                        ) : null}
                        <BrandSubdueButton variant='outline' size='sm' leadingIcon='search' disabled={readOnly} onClick={() => setLookupGroup(group.key)}>
                          Look up
                        </BrandSubdueButton>
                      </span>
                    )}
                  />
                  {rows.length === 0 ? (
                    <EmptyState
                      compact
                      icon={group.icon}
                      title={`ยังไม่มี${group.label}ในชุดตรวจนี้`}
                      subtitle='กด Look up เพื่อค้นหาและเพิ่มรายการตรวจ'
                      actionLabel={readOnly ? undefined : 'เพิ่มรายการตรวจ'}
                      onAction={readOnly ? undefined : () => setLookupGroup(group.key)}
                    />
                  ) : (
                    <Table columns={itemColumns} rows={rows} rowKey={(r) => r.code} emptyMessage='ไม่พบรายการ' />
                  )}
                </div>
              );
            })}

            {errors.items ? (
              <NoticeBar tone='danger' icon='error'>{errors.items}</NoticeBar>
            ) : null}

            <SubCard tone='brand'>
              <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-600)' }}>
                <ReadField label='จำนวนรายการตรวจ' value={`${price.count} รายการ`} />
                <ReadField label='ราคารวม' value={formatBahtTh(price.total)} />
                <ReadField label='เบิกได้รวม' value={formatBahtTh(price.claimable)} />
                <ReadField label='ส่วนที่ผู้รับบริการชำระ' value={formatBahtTh(price.total - price.claimable)} />
              </div>
            </SubCard>
          </div>
        ) : (
          <CriteriaTab form={form} setForm={setForm} readOnly={readOnly} />
        )}

        <div
          className='flex items-center w-full'
          style={{
            gap: 'var(--dim-space-300)',
            paddingTop: 'var(--dim-space-400)',
            borderTop: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
          }}
        >
          <NeutralSubdueButton size='lg' leadingIcon='close' onClick={onCancel}>
            ยกเลิก
          </NeutralSubdueButton>
          <div className='flex-1' />
          <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary, #858C92)' }}>
            {isNew
              ? `จะบันทึกโดย ${CHECKUP_STAFF.name}`
              : `แก้ไขล่าสุด ${formatThaiDateTime(form.updatedAt)} โดย ${form.updatedBy || CHECKUP_STAFF.name}`}
          </span>
          <BrandSubdueButton
            variant='fill'
            size='lg'
            leadingIcon='save'
            disabled={readOnly}
            onClick={onSave}
          >
            บันทึกชุดตรวจ
          </BrandSubdueButton>
        </div>
      </PageCard>

      <ItemLookupPopup
        open={!!lookupGroup}
        group={lookupGroup}
        selected={form.items || []}
        onClose={() => setLookupGroup(null)}
        onConfirm={addItems}
      />
      <LabPanelPopup open={panelOpen} onClose={() => setPanelOpen(false)} onConfirm={addItems} />
    </div>
  );
};

/* ── page ────────────────────────────────────────────────────────── */

const CheckupPackagePage = () => {
  const history = useHistory();
  const [mode, setMode] = useState('list'); /* 'list' | 'edit' */
  const [form, setForm] = useState(EMPTY_FORM);
  const [isNew, setIsNew] = useState(false);
  const [errors, setErrors] = useState({});
  const [tick, setTick] = useState(0);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQ, setSearchQ] = useState('');
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ rights: 'all', serviceType: 'all' });
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState('');
  const [savedToast, setSavedToast] = useState('');

  const canManage = getCheckupRight('managePackages');

  /* eslint-disable-next-line react-hooks/exhaustive-deps */
  const packages = useMemo(() => listPackages(), [tick]);

  const filtered = useMemo(() => {
    let rows = packages;
    if (activeTab === 'active') rows = rows.filter((p) => p.active);
    if (activeTab === 'inactive') rows = rows.filter((p) => !p.active);
    if (filters.rights !== 'all') rows = rows.filter((p) => p.rights === filters.rights);
    if (filters.serviceType !== 'all') rows = rows.filter((p) => p.serviceType === filters.serviceType);
    if (searchQ.trim()) {
      const q = searchQ.trim().toLowerCase();
      rows = rows.filter((p) => [p.code, p.name, p.rights, p.serviceType].some((f) => f && f.toLowerCase().includes(q)));
    }
    return rows;
  }, [packages, activeTab, filters, searchQ]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);

  const startNew = () => {
    setForm({ ...EMPTY_FORM, id: `PKG-${Date.now().toString().slice(-6)}`, code: nextPackageCode() });
    setIsNew(true);
    setErrors({});
    setMode('edit');
  };

  const startEdit = (pkg) => {
    setForm({ ...EMPTY_FORM, ...pkg });
    setIsNew(false);
    setErrors({});
    setMode('edit');
  };

  const validate = () => {
    const e = {};
    if (!form.code.trim()) e.code = 'ต้องระบุรหัสชุดตรวจ';
    else if (packages.some((p) => p.code === form.code.trim() && p.id !== form.id)) e.code = 'รหัสชุดตรวจนี้มีอยู่แล้ว';
    if (!form.name.trim()) e.name = 'ต้องระบุชื่อชุดตรวจ';
    if ((form.items || []).length === 0) e.items = 'ต้องเพิ่มรายการตรวจอย่างน้อย 1 รายการก่อนบันทึกชุดตรวจ';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    savePackage({ ...form, code: form.code.trim(), name: form.name.trim() });
    setTick((t) => t + 1);
    setSavedToast(`บันทึกชุดตรวจ ${form.code} เรียบร้อยแล้ว`);
    setMode('list');
  };

  const openCancel = (pkg) => {
    setCancelReason('');
    setCancelError('');
    setCancelTarget(pkg);
  };

  const confirmCancel = () => {
    if (!cancelReason.trim()) {
      setCancelError('ต้องระบุเหตุผลการยกเลิกใช้งานชุดตรวจ');
      return;
    }
    deactivatePackage(cancelTarget.id, cancelReason.trim());
    setCancelTarget(null);
    setTick((t) => t + 1);
  };

  const columns = useMemo(() => ([
    { key: 'code', label: 'รหัสชุดตรวจ' },
    {
      key: 'name',
      label: 'ชื่อชุดตรวจ',
      flex: true,
      minWidth: 320,
      render: (r) => (
        <span className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-050, 2px)' }}>
          <span style={{ fontSize: 'var(--type-size-sm, 14px)' }}>{r.name}</span>
          {r.note ? (
            <span style={{ fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary, #858C92)' }}>{r.note}</span>
          ) : null}
        </span>
      ),
    },
    { key: 'rights', label: 'สิทธิการรักษา', flex: true, minWidth: 230 },
    { key: 'serviceType', label: 'ประเภทผู้รับบริการ', flex: true, minWidth: 180 },
    {
      key: 'items',
      label: 'จำนวนรายการ',
      align: 'center',
      render: (r) => `${(r.items || []).length} รายการ`,
    },
    { key: 'price', label: 'ราคา', align: 'right', render: (r) => formatBahtTh(packagePrice(r).total) },
    { key: 'claim', label: 'เบิกได้', align: 'right', render: (r) => formatBahtTh(packagePrice(r).claimable) },
    {
      key: 'active',
      label: 'สถานะ',
      render: (r) => (r.active
        ? <ColorfulBadge style='green' size='small' hierarchy='secondary'>ใช้งาน</ColorfulBadge>
        : (
          <span className='flex flex-col' style={{ gap: 'var(--dim-space-100)' }}>
            <ColorfulBadge style='red' size='small' hierarchy='secondary'>ยกเลิกใช้งาน</ColorfulBadge>
            {r.inactiveReason ? (
              <span title={r.inactiveReason} style={{ fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary, #858C92)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 'var(--dim-size-2100, 160px)' }}>
                {r.inactiveReason}
              </span>
            ) : null}
          </span>
        )),
    },
    {
      key: 'actions',
      label: 'การดำเนินการ',
      sortable: false,
      render: (r) => (
        <span className='inline-flex items-center' style={{ gap: 'var(--dim-space-150)' }}>
          <BrandSubdueButton
            variant='outline'
            size='sm'
            leadingIcon={canManage ? 'edit' : 'visibility'}
            onClick={(e) => { e.stopPropagation(); startEdit(r); }}
          >
            {canManage ? 'แก้ไข' : 'แสดง'}
          </BrandSubdueButton>
          {r.active ? (
            <NeutralSubdueButton
              size='sm'
              leadingIcon='block'
              disabled={!canManage}
              accessibilityLabel={`ยกเลิกใช้งาน ${r.code}`}
              onClick={(e) => { e.stopPropagation(); openCancel(r); }}
            >
              ยกเลิกใช้งาน
            </NeutralSubdueButton>
          ) : (
            <BrandSubdueButton
              variant='fill'
              size='sm'
              leadingIcon='restart_alt'
              disabled={!canManage}
              onClick={(e) => { e.stopPropagation(); reactivatePackage(r.id); setTick((t) => t + 1); }}
            >
              เปิดใช้งาน
            </BrandSubdueButton>
          )}
        </span>
      ),
    },
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  ]), [canManage, packages]);

  const tabs = [
    { key: 'all', label: `ทั้งหมด (${packages.length})`, icon: 'list' },
    { key: 'active', label: `ใช้งาน (${packages.filter((p) => p.active).length})`, icon: 'check_circle' },
    { key: 'inactive', label: `ยกเลิกใช้งาน (${packages.filter((p) => !p.active).length})`, icon: 'block' },
  ];

  const actions = (
    <div className='flex items-center' style={{ gap: 'var(--dim-space-200)' }}>
      <NeutralSubdueButton
        size='md'
        leadingIcon={canManage ? 'lock_open' : 'lock'}
        onClick={() => { toggleCheckupRight('managePackages'); setTick((t) => t + 1); }}
        title='สลับสิทธิ์จัดการทะเบียนชุดตรวจ (สำหรับทดสอบ)'
      >
        {canManage ? 'สิทธิ์: จัดการได้' : 'สิทธิ์: อ่านอย่างเดียว'}
      </NeutralSubdueButton>
      {mode === 'list' ? (
        <BrandSubdueButton
          variant='fill'
          size='md'
          leadingIcon='add'
          disabled={!canManage}
          onClick={startNew}
        >
          สร้างชุดตรวจใหม่
        </BrandSubdueButton>
      ) : null}
    </div>
  );

  return (
    <QueuePageShell
      activeKey='checkup'
      breadcrumb={breadcrumb}
      title='ทะเบียนชุดตรวจสุขภาพ'
      onBack={() => (mode === 'edit' ? setMode('list') : history.push('/checkup'))}
      backLabel={mode === 'edit' ? 'กลับไปทะเบียน' : 'กลับไปคิวตรวจสุขภาพ'}
      actions={actions}
      tabs={mode === 'list' ? tabs : undefined}
      activeTab={activeTab}
      onTabChange={(k) => { setActiveTab(k); setPage(1); }}
    >
      <Popup
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        title='ยกเลิกใช้งานชุดตรวจ'
        subtitle={cancelTarget ? `${cancelTarget.code} · ${cancelTarget.name}` : ''}
        tertiaryAction={{ label: 'ปิด', onClick: () => setCancelTarget(null) }}
        primaryAction={{ label: 'ยืนยันยกเลิกใช้งาน', onClick: confirmCancel, tone: 'danger' }}
      >
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-300)' }}>
          {cancelTarget && isPackageInUse(cancelTarget.id) ? (
            <NoticeBar tone='warning' icon='warning'>
              ชุดตรวจนี้ถูกอ้างอิงโดยใบสั่งตรวจที่บันทึกไว้แล้ว — ระบบจะไม่ลบทิ้ง แต่จะตั้งเป็น "ยกเลิกใช้งาน"
              เพื่อไม่ให้เลือกใช้กับผู้รับบริการรายใหม่ ข้อมูลเดิมยังเปิดดูได้ตามปกติ
            </NoticeBar>
          ) : (
            <NoticeBar tone='info' icon='info'>
              ยังไม่มีใบสั่งตรวจที่อ้างอิงชุดตรวจนี้ — ระบบยังคงเก็บทะเบียนไว้และตั้งเป็น "ยกเลิกใช้งาน" เพื่อรักษาประวัติ
            </NoticeBar>
          )}
          <SuggestibleTextarea
            voice
            label='เหตุผลการยกเลิกใช้งาน'
            required
            value={cancelReason}
            onChange={(e) => { setCancelReason(e?.target ? e.target.value : e); setCancelError(''); }}
            placeholder='เช่น รอปรับราคาตามประกาศสำนักอนามัย ปี 2569'
            suggestions={[
              'รอปรับราคาตามประกาศสำนักอนามัย',
              'เปลี่ยนไปใช้ชุดตรวจใหม่แทน',
              'ยกเลิกตามนโยบายสำนักอนามัย',
              'รายการตรวจในชุดไม่พร้อมให้บริการ',
              ...CANCEL_REASON_SUGGESTIONS,
            ]}
            minChars={2}
          />
          {cancelError ? (
            <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-danger-secondary, #DC2626)' }}>
              {cancelError}
            </span>
          ) : null}
        </div>
      </Popup>

      <PageBody>
        {savedToast ? (
          <NoticeBar
            tone='success'
            icon='check_circle'
            trailing={(
              <button
                type='button'
                aria-label='ปิดการแจ้งเตือน'
                onClick={() => setSavedToast('')}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'inherit' }}
              >
                <Icon name='close' size={16} />
              </button>
            )}
          >
            {savedToast}
          </NoticeBar>
        ) : null}

        {mode === 'edit' ? (
          <PackageEditor
            form={form}
            setForm={setForm}
            readOnly={!canManage}
            isNew={isNew}
            errors={errors}
            onSave={handleSave}
            onCancel={() => setMode('list')}
          />
        ) : (
          <PageCard>
            <div className='w-full flex items-start justify-center'>
              <PrimarySearch
                value={searchQ}
                onChange={(v) => { setSearchQ(v); setPage(1); }}
                onSubmit={(label) => setSearchQ(label)}
                placeholder='ค้นหารหัสชุดตรวจ / ชื่อชุดตรวจ / สิทธิการรักษา'
                width={640}
              />
            </div>

            <div className='flex items-start w-full' style={{ gap: 'var(--dim-space-300)' }}>
              <OverflowFlexRow itemGap='var(--dim-space-200)' moreAriaLabel='แสดงตัวกรองที่ซ่อน'>
                <FilterTag
                  value='ทั้งหมด'
                  selected={filters.rights === 'all' && filters.serviceType === 'all'}
                  onClick={() => setFilters({ rights: 'all', serviceType: 'all' })}
                />
                <FilterDropdown
                  prefix='สิทธิ:'
                  options={[{ value: 'all', label: 'ทุกสิทธิ' }, ...RIGHTS_OPTIONS]}
                  value={filters.rights}
                  onChange={(v) => { setFilters((f) => ({ ...f, rights: v })); setPage(1); }}
                />
                <FilterDropdown
                  prefix='ประเภท:'
                  options={[{ value: 'all', label: 'ทุกประเภท' }, ...SERVICE_TYPE_OPTIONS]}
                  value={filters.serviceType}
                  onChange={(v) => { setFilters((f) => ({ ...f, serviceType: v })); setPage(1); }}
                />
              </OverflowFlexRow>
            </div>

            {packages.length === 0 ? (
              <EmptyState
                icon='inventory_2'
                title='ยังไม่มีชุดตรวจในทะเบียน'
                subtitle='สร้างชุดตรวจแรกเพื่อใช้สั่งรายการตรวจแบบ Package ตามประเภทผู้รับบริการ'
                actionLabel='สร้างชุดตรวจแรก'
                onAction={startNew}
              />
            ) : filtered.length === 0 ? (
              <EmptyState
                icon='search_off'
                title='ไม่พบผลลัพธ์'
                subtitle='ลองปรับคำค้นหาหรือล้างตัวกรอง'
                actionLabel='ล้างตัวกรองทั้งหมด'
                onAction={() => { setFilters({ rights: 'all', serviceType: 'all' }); setSearchQ(''); setActiveTab('all'); }}
              />
            ) : (
              <>
                <Table
                  columns={columns}
                  rows={pageRows}
                  rowKey={(r) => r.id}
                  onRowClick={startEdit}
                  stickyColCount={2}
                  stickyHeaderTop={QUEUE_STICKY_UNDER_TABS}
                  emptyMessage='ไม่พบรายการ'
                />
                <PagerRow page={page} pageSize={PAGE_SIZE} total={filtered.length} onPageChange={setPage} unit='ชุดตรวจ' />
              </>
            )}
          </PageCard>
        )}
      </PageBody>
    </QueuePageShell>
  );
};

export default CheckupPackagePage;
