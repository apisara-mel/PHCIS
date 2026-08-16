import React, { useEffect, useMemo, useState } from 'react';
import Popup from '@/components/popup/Popup';
import InputField from '@/components/forms/InputField';
import Checkbox from '@/components/checkbox/Checkbox';
import TabPill, { TabBar } from '@/components/tab/TabPill';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import { Sym } from '@/components/forms/Fields';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import BrandPrimaryButton from '@/components/button/BrandPrimaryButton';
import BrandFilterTag from '@/components/forms/FilterTag';
import PatientSummaryCard from '@/components/card/PatientSummaryCard';
import AlertDialog from '@/components/popup/AlertDialog';
import {
  itemKindMeta,
  markOrderSetUsed,
  orderSetClassificationMeta,
  orderSetsForActor,
  subscribeOrderSets,
  upsertOrderSet,
} from '@/data/treatmentOrderSets';
import { PHCIS_CURRENT_USER } from '@/data/phcisCurrentUser';
import { DEPARTMENTS, USERS } from '@/data/usersAccess';
import { DRUG_REGISTRY, UNIT_TYPES, currentPrice } from '@/data/pharmacyRegistry';

if (typeof document !== 'undefined') {
  const styleId = 'mih-treatment-order-picker-row-style';
  const css = `
.mih-treatment-order-picker-row {
  background: var(--surface-list-default, #FFFFFF);
  border: var(--dim-stroke-100, 1px) solid transparent;
  transition: background-color 120ms ease, border-color 120ms ease, box-shadow 120ms ease;
}
.mih-treatment-order-picker-row:hover {
  background: var(--surface-list-hover, var(--surface-brandPrimary-quaternary, #EAF8F2));
  border-color: transparent;
}
.mih-treatment-order-picker-row[aria-pressed='true'],
.mih-treatment-order-picker-row[aria-pressed='true']:hover {
  background: var(--surface-list-hover, var(--surface-brandPrimary-quaternary, #EAF8F2));
  border-color: var(--border-brandPrimary-quaternary, #C6ECDD);
}
`;
  let el = document.getElementById(styleId);
  if (!el) {
    el = document.createElement('style');
    el.id = styleId;
    document.head.appendChild(el);
  }
  if (el.textContent !== css) el.textContent = css;
}

const CATEGORY_LABELS = {
  medication: 'ยา', medicalSupply: 'เวชภัณฑ์มิใช่ยา', lab: 'Lab',
  xray: 'X-ray', procedure: 'หัตถการ', consult: 'ปรึกษา',
};
const CATEGORY_BADGES = { medication: 'teal', medicalSupply: 'blue', lab: 'purple', xray: 'orange', procedure: 'green', consult: 'grey' };

const ORDER_SET_CATEGORY_BY_KIND = {
  medication: 'medication',
  medicalSupply: 'medicalSupply',
  lab: 'lab',
  xray: 'xray',
  procedure: 'procedure',
  consult: 'consult',
};

const normalizeOrderText = (value) => String(value || '')
  .toLocaleLowerCase('th-TH')
  .replace(/\s+/g, ' ')
  .trim();

const ORDER_SET_ALLERGY_GROUPS = [
  ['penicillin', 'amoxicillin', 'ampicillin', 'dicloxacillin', 'cloxacillin', 'co-amoxiclav', 'augmentin'],
  ['nsaid', 'nsaids', 'aspirin', 'ibuprofen', 'naproxen', 'diclofenac', 'mefenamic', 'piroxicam', 'celecoxib', 'indomethacin'],
  ['sulfa', 'sulfonamide', 'sulfamethoxazole', 'cotrimoxazole', 'trimethoprim'],
  ['paracetamol', 'acetaminophen'],
];

const allergyMatchForMedication = (medicationName, allergies) => {
  const medication = normalizeOrderText(medicationName);
  return (allergies || []).find((entry) => {
    const allergy = normalizeOrderText(entry?.name || entry);
    if (!allergy) return false;
    if (medication.includes(allergy) || allergy.includes(medication)) return true;
    return ORDER_SET_ALLERGY_GROUPS.some((group) => (
      group.some((term) => medication.includes(term))
      && group.some((term) => allergy.includes(term))
    ));
  });
};

const currentOrderSetActor = () => {
  const matched = USERS.find((user) => (
    user.id === PHCIS_CURRENT_USER.id && user.status === 'active'
  ));
  if (!matched || PHCIS_CURRENT_USER.status !== 'active') return null;
  const sessionDepartment = DEPARTMENTS.some((row) => row.key === PHCIS_CURRENT_USER.departmentKey)
    ? PHCIS_CURRENT_USER.departmentKey
    : '';
  return {
    ...matched,
    /* The explicit session profile is authoritative for this encounter.
       If it cannot be mapped to the directory vocabulary, fail closed. */
    departments: sessionDepartment ? [sessionDepartment] : [],
  };
};

const normalizeMedicationText = (value) => normalizeOrderText(value).replace(/\s+/g, '');

const medicationUnitLabel = (key) => UNIT_TYPES.find((row) => row.key === key)?.label || key || 'เม็ด';

const registryDrugIsAvailable = (drug) => {
  if (!drug || drug.active === false) return false;
  const today = new Date().toISOString().slice(0, 10);
  return (!drug.activeFrom || drug.activeFrom <= today) && (!drug.activeTo || drug.activeTo >= today);
};

const registryDrugForSetItem = (setItem) => {
  const refId = String(setItem?.refId || '');
  const byReference = DRUG_REGISTRY.find((drug) => (
    [drug.id, drug.code, drug.barcode].filter(Boolean).map(String).includes(refId)
  ));
  if (byReference) return byReference;
  const name = normalizeMedicationText(setItem?.label);
  return DRUG_REGISTRY.find((drug) => normalizeMedicationText(drug.name) === name) || null;
};

const presetDefaultsFor = (setItem, fallbackUnit = '', registryDefaults = {}) => ({
  quantity: Number(setItem?.quantity || 1),
  unit: setItem?.unit || fallbackUnit || '',
  dosePerTake: String(setItem?.dosePerTake || registryDefaults.dosePerTake || ''),
  frequency: String(setItem?.frequency || registryDefaults.frequency || ''),
  when: String(setItem?.when || registryDefaults.when || ''),
  days: String(setItem?.days || registryDefaults.days || ''),
  urgency: String(setItem?.urgency || 'routine'),
  note: String(setItem?.note || registryDefaults.note || ''),
});

const TreatmentOrderPickerPopup = ({ open, onClose, items = [], onConfirm, patient, cardPatient }) => {
  const [mode, setMode] = useState('items');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [selectedIds, setSelectedIds] = useState([]);
  const [creatingSet, setCreatingSet] = useState(false);
  const [setName, setSetName] = useState('');
  const [setDescription, setSetDescription] = useState('');
  const [allergyConfirmOpen, setAllergyConfirmOpen] = useState(false);
  const [orderSetRevision, setOrderSetRevision] = useState(0);
  const [selectedStoredSetId, setSelectedStoredSetId] = useState('');
  const actor = useMemo(currentOrderSetActor, []);

  useEffect(() => subscribeOrderSets(() => setOrderSetRevision((value) => value + 1)), []);

  useEffect(() => {
    if (!open) return;
    setMode('items'); setQuery(''); setCategory('all'); setSelectedIds([]); setCreatingSet(false); setAllergyConfirmOpen(false); setSelectedStoredSetId('');
  }, [open]);

  const storedSetCards = useMemo(() => orderSetsForActor(actor).map((set) => {
    const resolvedItems = (set.items || []).map((setItem) => {
      const expectedCategory = ORDER_SET_CATEGORY_BY_KIND[setItem.kind];
      if (!expectedCategory) return null;
      const refId = String(setItem.refId || '');
      const normalizedLabel = normalizeOrderText(setItem.label);
      const matched = items.find((item) => {
        if (item.category !== expectedCategory) return false;
        const sourceRefs = [
          item.id,
          item.source?.id,
          item.source?.code,
          item.source?.key,
          item.source?.value,
        ].filter(Boolean).map(String);
        const prefixedRef = refId ? `${expectedCategory}-${refId}` : '';
        if (refId && (sourceRefs.includes(refId) || sourceRefs.includes(prefixedRef))) return true;
        return normalizedLabel && normalizeOrderText(item.name) === normalizedLabel;
      });
      const customId = `admin-${set.id}-${setItem.id}`;
      if (setItem.kind === 'medication') {
        const registryDrug = registryDrugForSetItem(setItem);
        if (!registryDrugIsAvailable(registryDrug)) return null;
        const medicationMatch = matched || items.find((item) => (
          item.category === 'medication'
          && normalizeMedicationText(item.name) === normalizeMedicationText(registryDrug.name)
        ));
        const unit = setItem.unit || medicationUnitLabel(registryDrug.unit);
        const defaults = presetDefaultsFor(setItem, unit, registryDrug.administrationDefaults);
        const allergyMatch = allergyMatchForMedication(registryDrug.name, patient?.drugAllergies);
        const matchedSource = medicationMatch?.source || {};
        const unitPrice = currentPrice(registryDrug);
        const rightsEligible = registryDrug.rightsEligible || [];
        return {
          ...(medicationMatch || {}),
          id: customId,
          category: 'medication',
          name: registryDrug.name,
          unit,
          detail: medicationMatch?.detail || `${registryDrug.code} · รายการจากทะเบียนยาของสถานพยาบาล`,
          allergyMatch: allergyMatch?.name || allergyMatch || '',
          presetDefaults: defaults,
          presetKind: setItem.kind,
          source: {
            ...registryDrug,
            ...matchedSource,
            registryId: registryDrug.id,
            image: matchedSource.image || registryDrug.image,
            unit,
            unitPrice,
            totalPrice: unitPrice * defaults.quantity,
            reimbursable: matchedSource.reimbursable
              ?? rightsEligible.includes(patient?.rights),
            purpose: matchedSource.purpose || `จากชุดคำสั่ง ${set.name}`,
          },
        };
      }
      /* Non-drug orders must resolve to the active catalog supplied by CPOE.
         Never fabricate LIS/PACS/procedure/consult identifiers. */
      if (!matched || matched.source?.retired) return null;
      return {
        ...matched,
        id: customId,
        presetDefaults: presetDefaultsFor(setItem, matched.unit || matched.source?.unit),
        presetKind: setItem.kind,
      };
    }).filter(Boolean);
    const ownedByActor = !!actor?.id && set.scope === 'personal' && set.ownerId === actor.id;
    return {
      ...set,
      ownerType: ownedByActor ? 'doctor' : 'admin',
      itemIds: resolvedItems.map((item) => item.id),
      resolvedItems,
      unavailableCount: Math.max(0, (set.items || []).length - resolvedItems.length),
    };
  }), [actor, items, orderSetRevision, patient?.drugAllergies]);

  const selectableItems = useMemo(() => {
    const byId = new Map(items.map((item) => [item.id, item]));
    storedSetCards.forEach((set) => set.resolvedItems.forEach((item) => byId.set(item.id, item)));
    return [...byId.values()];
  }, [storedSetCards, items]);

  const visibleItems = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('th-TH');
    return items.filter((item) => (category === 'all' || item.category === category)
      && (!q || `${item.name} ${item.unit || ''} ${item.detail || ''}`.toLocaleLowerCase('th-TH').includes(q)));
  }, [category, items, query]);
  const toggle = (id) => {
    setSelectedStoredSetId('');
    setSelectedIds((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  };
  const chooseSet = (set) => {
    if (set.unavailableCount > 0 || set.itemIds.length === 0) return;
    const available = new Set(selectableItems.map((item) => item.id));
    setSelectedIds(set.itemIds.filter((id) => available.has(id)));
    setSelectedStoredSetId(set.id);
  };
  const selectedItems = selectableItems.filter((item) => selectedIds.includes(item.id));
  const selectedAllergyItems = selectedItems.filter((item) => item.allergyMatch);
  const commitSelection = () => {
    const applied = onConfirm?.(selectedItems, { orderSetId: selectedStoredSetId });
    if (applied !== false && selectedStoredSetId) markOrderSetUsed(selectedStoredSetId);
    onClose?.();
  };
  const handleConfirm = () => {
    if (selectedAllergyItems.length > 0) { setAllergyConfirmOpen(true); return; }
    commitSelection();
  };
  const saveDoctorSet = () => {
    if (!actor?.id || !setName.trim() || selectedItems.length === 0) return;
    const now = Date.now();
    const setItems = selectedItems.map((item, index) => {
      const kind = item.presetKind || item.category;
      const source = item.source || {};
      const registryDrug = kind === 'medication'
        ? (DRUG_REGISTRY.find((drug) => drug.id === source.registryId) || registryDrugForSetItem({ label: item.name }))
        : null;
      const refId = kind === 'medication'
        ? (source.registryId || registryDrug?.id || '')
        : kind === 'medicalSupply'
          ? (source.value || item.refId || item.id)
          : kind === 'lab' || kind === 'xray'
            ? (source.id || '')
            : kind === 'procedure'
              ? (source.code || '')
              : kind === 'consult'
                ? (source.key || '')
                : '';
      return {
        id: `personal-item-${now}-${index}`,
        kind,
        refId,
        label: item.name,
        ...(item.presetDefaults || presetDefaultsFor({}, item.unit || source.unit)),
      };
    });
    upsertOrderSet({
      name: setName.trim(),
      description: setDescription.trim() || 'ชุดคำสั่งส่วนตัวของแพทย์',
      scope: 'personal',
      ownerId: actor.id,
      owner: actor.name,
      classification: 'symptom',
      classificationLabel: '',
      access: { mode: 'restricted', roles: [], departments: [], users: [actor.id] },
      items: setItems,
      active: true,
    });
    setSetName(''); setSetDescription(''); setCreatingSet(false);
  };
  const patientName = cardPatient?.fullName || patient?.fullName || patient?.name
    || [patient?.prefixTh, patient?.firstNameTh, patient?.lastNameTh].filter(Boolean).join(' ')
    || 'ไม่พบชื่อผู้รับบริการ';
  const allergyNames = (patient?.drugAllergies || []).map((item) => item.name).filter(Boolean);

  return (
    <>
    <Popup open={open} onClose={onClose} size='extraLarge' title='เพิ่มรายการสั่งการรักษา'
      subtitle='ค้นหา เลือกหลายรายการ หรือเลือกชุดคำสั่งสำเร็จรูป'
      tertiaryAction={{ label: 'ล้างรายการที่เลือก', onClick: () => setSelectedIds([]), disabled: selectedIds.length === 0 }}
      secondaryAction={{ label: 'ยกเลิก', onClick: onClose }}
      primaryAction={{ label: `เพิ่ม ${selectedIds.length} รายการ`, onClick: handleConfirm, disabled: selectedIds.length === 0 }}
      bodyStyle={{ gap: 'var(--dim-space-400, 16px)' }}>
      <PatientSummaryCard
        variant='gradient'
        avatarUrl={cardPatient?.avatarUrl || patient?.avatarUrl}
        avatarAlt={patientName}
        cells={[
          { label: 'ชื่อ-นามสกุล ผู้รับบริการ', value: patientName },
          { label: 'HN (Hospital Number)', value: cardPatient?.hn || patient?.hn || '—' },
          { label: 'อายุ / เพศ', value: `${patient?.age != null ? `${patient.age} ปี` : '—'} / ${patient?.gender || '—'}` },
          { label: 'สิทธิการรักษา', value: patient?.rights || cardPatient?.insurance || '—' },
          {
            label: 'ประวัติแพ้ยา',
            value: allergyNames.length > 0 ? allergyNames.join(', ') : 'ไม่พบประวัติแพ้ยา',
          },
        ]}
      />
      <TabBar
        aria-label='วิธีเพิ่มรายการสั่งการรักษา'
        style={{ background: 'transparent', padding: 0 }}
      >
        <TabPill label='ค้นหารายการ' selected={mode === 'items'} onClick={() => setMode('items')} />
        <TabPill label='ชุดคำสั่งสำเร็จรูป' selected={mode === 'sets'} onClick={() => setMode('sets')} />
      </TabBar>
      {mode === 'items' ? <>
        <InputField label='ค้นหารายการ' value={query} onChange={(event) => setQuery(event?.target?.value ?? event ?? '')}
          placeholder='ค้นหายา Lab X-ray หัตถการ หรือคลินิกปรึกษา' leadingIcon='search' />
        <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          {[['all', 'ทั้งหมด'], ...Object.entries(CATEGORY_LABELS)].map(([key, label]) => (
            <BrandFilterTag
              key={key}
              variant='brand'
              size='lg'
              value={label}
              selected={category === key}
              showLeadingIcon={false}
              showTailingIcon={false}
              showTitle={false}
              onClick={() => setCategory(key)}
            />
          ))}
        </div>
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          {visibleItems.map((item) => { const checked = selectedIds.includes(item.id); return <button key={item.id} type='button' onClick={() => toggle(item.id)} aria-pressed={checked} className='mih-treatment-order-picker-row flex items-center w-full text-left' style={{ gap: 'var(--dim-space-300, 12px)', padding: 'var(--dim-space-300, 12px) var(--dim-space-400, 16px)', borderRadius: 'var(--dim-radius-200, 8px)' }}>
            <span onClick={(event) => event.stopPropagation()}><Checkbox checked={checked} onChange={() => toggle(item.id)} aria-label={`เลือก ${item.name}`} /></span>
            <span className='flex-1 min-w-0'>
              <span className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-150, 6px)' }}>
                <span style={{ color: 'var(--text-content-default, #202427)', fontSize: 'var(--type-size-sm, 14px)', fontWeight: 'var(--type-weight-medium, 500)' }}>{item.name}</span>
                {item.allergyMatch && <ColorfulBadge style='red' size='small'>ผู้รับบริการแพ้ยานี้</ColorfulBadge>}
              </span>
              <span style={{ display: 'block', color: 'var(--text-content-tertiary, #697077)', fontSize: 'var(--type-size-xs, 12px)' }}>{item.detail || (item.unit ? `หน่วย ${item.unit}` : 'กรอกรายละเอียดหลังเพิ่มรายการ')}</span>
            </span>
            <ColorfulBadge style={CATEGORY_BADGES[item.category] || 'grey'} size='small'>{CATEGORY_LABELS[item.category]}</ColorfulBadge>
          </button>; })}
          {visibleItems.length === 0 && <div className='flex flex-col items-center text-center' style={{ gap: 'var(--dim-space-200, 8px)', padding: 'var(--dim-space-800, 32px)' }}><Sym name='search_off' size={32} color='var(--icon-neutral-tertiary, #8A9095)' /><span style={{ color: 'var(--text-content-secondary, #454B50)', fontSize: 'var(--type-size-sm, 14px)' }}>ไม่พบรายการที่ค้นหา</span></div>}
        </div>
      </> : <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400, 16px)' }}>
        <div className='flex items-center justify-between flex-wrap' style={{ gap: 'var(--dim-space-300, 12px)' }}>
          <div><div style={{ color: 'var(--text-content-default, #202427)', fontSize: 'var(--type-size-base, 16px)', fontWeight: 'var(--type-weight-medium, 500)' }}>ชุดคำสั่งการรักษา</div><div style={{ color: 'var(--text-content-tertiary, #697077)', fontSize: 'var(--type-size-sm, 14px)' }}>ชุดมาตรฐานจัดการโดย Admin ส่วนแพทย์สร้างชุดส่วนตัวได้จากรายการที่เลือก</div></div>
          <BrandSubdueButton leadingIcon='add' disabled={!actor?.id || selectedIds.length === 0} onClick={() => setCreatingSet(true)}>เพิ่ม Order Set ของฉัน</BrandSubdueButton>
        </div>
        {creatingSet && <div className='flex flex-col' style={{ gap: 'var(--dim-space-300, 12px)', padding: 'var(--dim-space-400, 16px)', background: 'var(--surface-card-quaternary, #F9FBFB)', border: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary, #E2E4E6)', borderRadius: 'var(--dim-radius-300, 12px)' }}>
          <InputField label='ชื่อ Order Set' value={setName} onChange={(event) => setSetName(event?.target?.value ?? event ?? '')} placeholder='เช่น ชุดทำแผลประจำของฉัน' />
          <InputField label='คำอธิบาย' value={setDescription} onChange={(event) => setSetDescription(event?.target?.value ?? event ?? '')} placeholder='อธิบายว่าใช้ชุดนี้เมื่อใด' />
          <div className='flex items-center justify-end' style={{ gap: 'var(--dim-space-200, 8px)' }}><BrandSubdueButton onClick={() => setCreatingSet(false)}>ยกเลิก</BrandSubdueButton><BrandPrimaryButton disabled={!setName.trim()} onClick={saveDoctorSet}>บันทึก Order Set</BrandPrimaryButton></div>
        </div>}
        <div className='grid w-full' style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(var(--dim-size-2450, 280px), 1fr))', gap: 'var(--dim-space-300, 12px)' }}>
          {storedSetCards.map((set) => {
            const isAdminSet = set.ownerType === 'admin';
            const selected = set.itemIds.length > 0 && set.itemIds.every((id) => selectedIds.includes(id));
            const unavailable = set.unavailableCount > 0 || set.itemIds.length === 0;
            const classification = isAdminSet ? orderSetClassificationMeta(set.classification) : null;
            const kindCounts = isAdminSet ? (set.items || []).reduce((counts, item) => ({
              ...counts,
              [item.kind]: (counts[item.kind] || 0) + 1,
            }), {}) : {};
            return (
              <button
                key={set.id}
                type='button'
                onClick={() => chooseSet(set)}
                aria-pressed={selected}
                disabled={unavailable}
                className='flex flex-col items-start text-left'
                style={{
                  gap: 'var(--dim-space-200, 8px)',
                  padding: 'var(--dim-space-400, 16px)',
                  border: `${selected ? 'var(--dim-stroke-200, 2px)' : 'var(--dim-stroke-100, 1px)'} solid ${selected ? 'var(--border-brandPrimary-default, #007549)' : 'var(--border-neutral-quaternary, #F4F5F5)'}`,
                  borderRadius: 'var(--dim-radius-400, 12px)',
                  background: selected ? 'var(--surface-brandPrimary-quaternary, #F4FBF8)' : 'var(--surface-card-100, #FFFFFF)',
                }}
              >
                <span className='flex items-start justify-between w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                  <span style={{ color: 'var(--text-content-default, #363B3F)', fontSize: 'var(--type-size-base, 16px)', fontWeight: 'var(--type-weight-medium, 500)' }}>{set.name}</span>
                  <span className='flex items-center flex-wrap justify-end' style={{ gap: 'var(--dim-space-100, 4px)' }}>
                    {classification ? <ColorfulBadge style={classification.badge || 'blue'} size='small'>{classification.label}</ColorfulBadge> : null}
                    <ColorfulBadge style={isAdminSet ? 'grey' : 'teal'} size='small'>{isAdminSet ? 'Admin' : 'ของฉัน'}</ColorfulBadge>
                  </span>
                </span>
                {isAdminSet && set.classificationLabel ? (
                  <span style={{ color: 'var(--text-content-secondary, #636B72)', fontSize: 'var(--type-size-sm, 14px)', fontWeight: 'var(--type-weight-medium, 500)' }}>{set.classificationLabel}</span>
                ) : null}
                <span style={{ color: 'var(--text-content-tertiary, #858C92)', fontSize: 'var(--type-size-sm, 14px)' }}>{set.description}</span>
                {isAdminSet ? (
                  <span className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-100, 4px)' }}>
                    {Object.entries(kindCounts).map(([kind, count]) => (
                      <ColorfulBadge key={kind} style={itemKindMeta(kind).badge} size='small'>
                        {itemKindMeta(kind).label} {count}
                      </ColorfulBadge>
                    ))}
                  </span>
                ) : null}
                <span style={{ color: 'var(--text-brandPrimary-default, #007549)', fontSize: 'var(--type-size-xs, 12px)' }}>
                  {unavailable
                    ? `ไม่พร้อมใช้งาน · ตรวจสอบ ${set.unavailableCount || (set.items || []).length} รายการกับทะเบียนกลาง`
                    : `พร้อมเพิ่ม ${set.itemIds.length} รายการ`}
                </span>
              </button>
            );
          })}
        </div>
      </div>}
    </Popup>
    <AlertDialog
      open={allergyConfirmOpen}
      onClose={() => setAllergyConfirmOpen(false)}
      onCancel={() => setAllergyConfirmOpen(false)}
      onConfirm={() => { setAllergyConfirmOpen(false); commitSelection(); }}
      type='warning'
      alignment='center'
      title='ตรวจพบยาที่ผู้รับบริการมีประวัติแพ้'
      description=''
      cancelLabel='กลับไปตรวจสอบ'
      confirmLabel='ยืนยันเพิ่มรายการ'
    >
      <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
        {selectedAllergyItems.map((item) => (
          <div
            key={item.id}
            className='flex items-center w-full text-left'
            style={{
              gap: 'var(--dim-space-200, 8px)',
              padding: 'var(--dim-space-300, 12px)',
              background: 'var(--surface-list-default, #FFFFFF)',
              border: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-tertiary, #E2E4E6)',
              borderRadius: 'var(--dim-radius-200, 8px)',
              color: 'var(--text-content-default, #202427)',
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-sm, 14px)',
              fontWeight: 'var(--type-weight-medium, 500)',
            }}
          >
            <Sym name='medication' size={20} color='var(--icon-danger-default, #DC2626)' />
            <span>{item.name}</span>
          </div>
        ))}
      </div>
    </AlertDialog>
    </>
  );
};
export default TreatmentOrderPickerPopup;
