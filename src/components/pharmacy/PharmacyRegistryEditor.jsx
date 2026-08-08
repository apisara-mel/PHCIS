import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import QueuePageShell from '@/templates/QueuePageShell';
import WizardMorphHeader, { WIZARD_MORPH_SHELL_PROPS } from '@/components/layout/WizardMorphHeader';
import { MIH_CHROME_MORPH_FOOTER } from '@/components/layout/wizardChromeMorphStyles';
import StepProgress from '@/components/step/StepProgress';
import Icon from '@/components/icons/Icon';
import InputField from '@/components/forms/InputField';
import DatePicker from '@/components/forms/DatePicker';
import Select from '@/components/forms/Select';
import CheckboxButton from '@/components/checkbox/CheckboxButton';
import SelectableTag from '@/components/forms/SelectableTag';
import SelectableCardButton from '@/components/button/SelectableCardButton';
import BrandButton from '@/components/button/BrandButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import NeutralSubdueIconButton from '@/components/button/NeutralSubdueIconButton';
import Stepper from '@/components/stepper/Stepper';
import DoctorAiDrugPanel from '@/components/search/DoctorAiDrugPanel';
import ConfirmAddDiagnosisPopup from '@/components/popup/ConfirmAddDiagnosisPopup';
import AlertDialog from '@/components/popup/AlertDialog';
import PharmacyPrescriberScopePopup from '@/components/pharmacy/PharmacyPrescriberScopePopup';
import PharmacyPrescriberPositionPopup from '@/components/pharmacy/PharmacyPrescriberPositionPopup';
import PhotoUploadField from '@/components/forms/PhotoUploadField';
import { PharmacyDrugImage } from '@/components/pharmacy/PharmacyDrugMetaBanner';
import FormScopeGrouping from '@/components/consent/FormScopeGrouping';
import FormPositionGrouping from '@/components/consent/FormPositionGrouping';
import Alert from '@/components/alert/Alert';
import Badge from '@/components/badge/Badge';
import Tooltip from '@/components/tooltip/Tooltip';
import Topic from '@/components/topic/Topic';
import PharmacySectionTopic from '@/components/pharmacy/PharmacySectionTopic';
import SuccessToast from '@/components/toast/SuccessToast';
import {
  DRUG_REGISTRY,
  DRUG_CLASSIFICATIONS,
  UNIT_TYPES,
  UNIT_CONVERSION_DEFAULTS,
  COUNT_UNIT_KEYS,
  RIGHTS_LIST,
  CHRONIC_DISEASE_OPTIONS,
  getRegistryDrugById,
  upsertRegistryDrug,
} from '@/data/pharmacyRegistry';
import {
  findFacilityRegistryMatch,
  tmtRowToRegistryForm,
  getTmtById,
  getTmtByTpu,
} from '@/data/pharmacyTmtCatalog';
import { stripConsentScopes } from '@/data/consentFormScopes';
import { PHARMACY_WORKLIST_CARD } from '@/pages/pharmacy/pharmacyContentCard';

/* Registry ชื่อยา photo — aliases design-system PhotoUploadField (Figma Photo
   3420:2565). Empty = dashed upload tile; filled = preview + clear. */
const RegistryDrugPhoto = ({ src, alt, onUpload, onClear }) => {
  const url = String(src || '').trim();
  if (url) {
    return (
      <div
        className='relative shrink-0 overflow-hidden'
        style={{
          width: 'var(--dim-size-2000, 128px)',
          height: 'var(--dim-size-2000, 128px)',
          borderRadius: 'var(--dim-radius-200, 8px)',
          border: 'var(--dim-stroke-100) solid var(--border-card-default)',
          background: 'var(--surface-formbuilder-default-on, var(--surface-card-100))',
          boxShadow: 'var(--shadow-formbuilder)',
          boxSizing: 'border-box',
        }}
      >
        <img
          src={url}
          alt={alt || 'medication'}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
        <div
          className='absolute'
          style={{ top: 'var(--dim-space-100)', right: 'var(--dim-space-100)' }}
        >
          <NeutralSubdueIconButton
            icon='close'
            size='sm'
            variant='outline'
            aria-label='ลบรูปยา'
            onClick={onClear}
          />
        </div>
      </div>
    );
  }
  return (
    <PhotoUploadField
      label='อัปโหลดรูปยา'
      icon='medication'
      accept='image/*'
      onFiles={(files) => {
        const file = files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = String(reader.result || '');
          if (dataUrl) onUpload?.(dataUrl);
        };
        reader.readAsDataURL(file);
      }}
    />
  );
};

const summaryFromPrescriberScopes = (scopes = []) => {
  const groups = [...new Set(scopes.map((s) => s.group).filter(Boolean))];
  return groups.join(', ');
};

/* Shared drug-registry add/edit wizard (ToR §1.9.1 + §1.9.10).
   Add flow mirrors ICD-10 Doctor AI: AISearch suggestions → confirm popup
   → seed facility fields → remaining steps (§5.1.2 TMT/GPU/TPU/GPO).
   · variant='page'  — QueuePageShell + WizardMorphHeader + sticky footer
   · variant='popup' — step body (+ compact StepProgress); parent Popup
     drives title / footer via onStateChange */

const STEPS = ['ข้อมูลพื้นฐาน', 'หน่วยและประเภท', 'สิทธิและข้อจำกัด', 'ราคา', 'ตรวจสอบ'];

/* Inset groups — same wash + soft border as registration SubCard (ที่อยู่…). */
const UNIT_GROUP_PANEL = {
  background: 'var(--surface-neutral-quaternary, #F9FBFB)',
  borderRadius: 'var(--dim-radius-300, 12px)',
  border: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary, #F4F5F5)',
  boxShadow: 'none',
};

const canNavigateToStep = (idx, step, completedSteps) =>
  idx < step || Boolean(completedSteps[idx - 1]);

const dateFromIso = (iso) => (iso ? new Date(`${iso}T12:00:00`) : null);
const isoFromDate = (d) => (d ? d.toISOString().slice(0, 10) : null);
const formatIsoDate = (iso) => {
  const d = dateFromIso(iso);
  if (!d) return '—';
  return d.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const unitLabel = (key) => UNIT_TYPES.find((u) => u.key === key)?.label || key || '—';

const ReviewRow = ({ label, value }) => (
  <div className='flex flex-wrap items-baseline w-full min-w-0' style={{ gap: 'var(--dim-space-200)' }}>
    <span
      className='shrink-0'
      style={{
        minWidth: 'var(--dim-size-2200, 140px)',
        color: 'var(--text-content-tertiary)',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-xs)',
        lineHeight: 1.5,
      }}
    >
      {label}
    </span>
    <span
      className='min-w-0'
      style={{
        color: 'var(--text-content-secondary)',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-sm)',
        lineHeight: 1.5,
        whiteSpace: 'pre-wrap',
      }}
    >
      {value == null || value === '' ? '—' : value}
    </span>
  </div>
);

let conversionRowSeq = 0;
const nextConversionId = () => `uc-${Date.now()}-${++conversionRowSeq}`;

const buildConversionRows = (unitKey, packSizeHint) => {
  const seeds = UNIT_CONVERSION_DEFAULTS[unitKey];
  if (seeds?.length) {
    return seeds.map((s) => ({
      id: nextConversionId(),
      qty: s.qty,
      toUnit: s.toUnit,
    }));
  }
  /* Base units (เม็ด/แคปซูล) start empty — staff can add rows. */
  if (packSizeHint > 0 && unitKey !== 'tablet' && unitKey !== 'capsule') {
    return [{ id: nextConversionId(), qty: packSizeHint, toUnit: 'tablet' }];
  }
  return [];
};

const syncPackFields = (unitConversions) => {
  const first = unitConversions[0];
  return {
    unitConversions,
    packSize: first?.qty || 0,
    convertToUnit: first?.toUnit || 'tablet',
  };
};

/** §1.9.1.2 defaults — e.g. 1 ขวด = 60 ซีซี; กล่อง seeds แผง + เม็ด. */
const defaultsForUnit = (unitKey, packSizeHint) => ({
  unit: unitKey,
  unitCount: 1,
  ...syncPackFields(buildConversionRows(unitKey, packSizeHint)),
});

const BLANK_DRUG = {
  id: 'new',
  code: '',
  name: '',
  genericName: '',
  tradeName: '',
  unit: 'tablet',
  unitCount: 1,
  packSize: 0,
  convertToUnit: 'tablet',
  unitConversions: [],
  classification: 'nlem',
  highAlert: false,
  rightsEligible: [], /* default: none selected — staff must pick claimable rights */
  priceSchedule: [{ id: 'p-new-1', effectiveFrom: new Date().toISOString().slice(0, 10), effectiveTo: null, price: 0 }],
  active: true,
  activeFrom: new Date().toISOString().slice(0, 10),
  activeTo: null,
  replacementId: '',
  manufacturer: '',
  distributor: '',
  usageRate: { avgPerMonth: 0, maxQty: 0, minQty: 0, reorderPoint: 0 },
  disallowedChronicDiseases: [],
  restrictedPrescriberScopes: [],
  restrictedPrescriberPositions: [],
  restrictedToDoctorGroup: '', /* legacy summary — derived from scopes on save */
};

/* `embedded` — header + body only (no second white card), for nesting
   under a shared PHARMACY_WORKLIST_CARD with the TMT search panel. */
const SectionCard = ({ icon, title, subtitle, children, action, embedded = false }) => (
  <section
    className='flex flex-col w-full'
    style={embedded
      ? { gap: 'var(--dim-space-400)' }
      : { ...PHARMACY_WORKLIST_CARD, padding: 'var(--dim-space-600)', gap: 'var(--dim-space-400)' }}
  >
    <PharmacySectionTopic title={title} subtitle={subtitle} trailing={action} />
    {children}
  </section>
);

const OptionCard = ({ label, sublabel, selected, onSelect }) => (
  <SelectableCardButton
    selected={selected}
    onClick={onSelect}
    ariaLabel={sublabel ? `${label} (${sublabel})` : label}
    className='w-full justify-start'
    minHeight={sublabel ? 56 : 48}
    showTrailingCheck
  >
    <span className='flex flex-col flex-1 min-w-0 text-left' style={{ gap: 'var(--dim-space-050, 2px)' }}>
      <span
        style={{
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-sm)',
          fontWeight: 'var(--type-weight-bold, 700)',
          color: selected ? 'var(--text-brandPrimary-default)' : 'var(--text-content-primary)',
          lineHeight: 1.4,
        }}
      >
        {label}
      </span>
      {sublabel ? (
        <span
          style={{
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-xs)',
            fontWeight: 'var(--type-weight-regular)',
            color: selected ? 'var(--text-brandPrimary-default)' : 'var(--text-content-secondary)',
            lineHeight: 1.4,
          }}
        >
          {sublabel}
        </span>
      ) : null}
    </span>
  </SelectableCardButton>
);

const buildInitialForm = (base) => {
  const unit = base.unit || 'tablet';
  const unitConversions = Array.isArray(base.unitConversions) && base.unitConversions.length
    ? base.unitConversions.map((c) => ({
      id: c.id || nextConversionId(),
      qty: Number(c.qty) || 0,
      toUnit: c.toUnit || 'tablet',
    }))
    : buildConversionRows(unit, base.packSize);
  const synced = syncPackFields(unitConversions);
  return {
    ...base,
    unit,
    unitCount: base.unitCount ?? 1,
    ...synced,
    /* Prefer existing packSize when editing legacy rows without unitConversions. */
    packSize: base.packSize > 0 && !base.unitConversions?.length
      ? base.packSize
      : synced.packSize,
    rightsEligible: [...(base.rightsEligible || [])],
    priceSchedule: (base.priceSchedule || []).map((p) => ({ ...p })),
    usageRate: { ...(base.usageRate || BLANK_DRUG.usageRate) },
    disallowedChronicDiseases: [...(base.disallowedChronicDiseases || [])],
    restrictedPrescriberScopes: stripConsentScopes(base.restrictedPrescriberScopes || []),
    restrictedPrescriberPositions: [...(base.restrictedPrescriberPositions || [])],
    restrictedToDoctorGroup: base.restrictedToDoctorGroup || '',
  };
};

/**
 * @param {object} props
 * @param {string} [props.drugId] — omit / 'new' for create; id string for edit
 * @param {() => void} props.onCancel
 * @param {() => void} props.onSaved
 * @param {'page' | 'popup'} [props.variant]
 * @param {(api: object) => void} [props.onStateChange] — popup footer / title bridge
 */
const PharmacyRegistryEditor = ({
  drugId,
  onCancel,
  onSaved,
  variant = 'page',
  onStateChange,
}) => {
  const isNew = !drugId || drugId === 'new';
  const existing = isNew ? null : getRegistryDrugById(drugId);
  const base = existing || BLANK_DRUG;

  const [form, setForm] = useState(() => buildInitialForm(base));
  const [saved, setSaved] = useState(false);
  const [step, setStep] = useState(0);
  /* Add-only: Doctor AI pick → confirm popup → seed facility fields. */
  const [catalogQuery, setCatalogQuery] = useState('');
  const [selectedTmt, setSelectedTmt] = useState(null);
  const [pendingTmtPick, setPendingTmtPick] = useState(null);
  const [duplicateWarn, setDuplicateWarn] = useState(null);
  /* Delete conversion / disease row — confirm before remove. */
  const [pendingConversionDelete, setPendingConversionDelete] = useState(null);
  const [pendingDiseaseDelete, setPendingDiseaseDelete] = useState(null); /* { idx, name } */
  const [prescriberScopeOpen, setPrescriberScopeOpen] = useState(false);
  const [prescriberPositionOpen, setPrescriberPositionOpen] = useState(false);

  const registryDuplicate = useMemo(
    () => (selectedTmt ? findFacilityRegistryMatch(selectedTmt) : null),
    [selectedTmt],
  );

  const resolveTmtFromPick = (picked) => {
    if (!picked) return null;
    return getTmtById(picked.tmtId)
      || getTmtByTpu(picked.tpuCode || picked.badge || picked.id)
      || null;
  };

  const pickFromCatalog = (row) => {
    if (!row) return;
    setSelectedTmt(row);
    setCatalogQuery('');
    setForm((prev) => {
      const seeded = tmtRowToRegistryForm(row);
      const unitDefaults = defaultsForUnit(seeded.unit, seeded.packSize);
      let unitConversions = unitDefaults.unitConversions;
      /* Solid TMT rows often carry packSize (e.g. 30 เม็ด) — apply to last/tablet row. */
      if (seeded.packSize > 0 && unitConversions.length) {
        const tabletIdx = unitConversions.findIndex((c) => c.toUnit === 'tablet' || c.toUnit === 'capsule');
        const idx = tabletIdx >= 0 ? tabletIdx : unitConversions.length - 1;
        unitConversions = unitConversions.map((c, i) => (
          i === idx ? { ...c, qty: seeded.packSize } : c
        ));
      }
      return {
        ...prev,
        ...seeded,
        ...unitDefaults,
        ...syncPackFields(unitConversions),
        /* Keep facility schedule defaults; identity fields come from TMT. */
        rightsEligible: Array.isArray(prev.rightsEligible) ? prev.rightsEligible : [],
        priceSchedule: prev.priceSchedule?.length
          ? prev.priceSchedule
          : [{ id: 'p-new-1', effectiveFrom: new Date().toISOString().slice(0, 10), effectiveTo: null, price: 0 }],
        active: true,
        activeFrom: prev.activeFrom || new Date().toISOString().slice(0, 10),
        activeTo: prev.activeTo ?? null,
        id: 'new',
      };
    });
  };

  const confirmPendingTmtPick = () => {
    const row = resolveTmtFromPick(pendingTmtPick);
    setPendingTmtPick(null);
    if (row) pickFromCatalog(row);
  };

  const clearCatalogPick = () => {
    setSelectedTmt(null);
    setCatalogQuery('');
    setForm(buildInitialForm(BLANK_DRUG));
  };

  /* Step ข้อมูลพื้นฐาน: รหัสยา / ชื่อยา / ชื่อสามัญ / ชื่อการค้า /
     วันที่เริ่มจำหน่าย บังคับครบ. */
  const step0Valid = Boolean(
    form.code.trim()
    && form.name.trim()
    && form.genericName.trim()
    && form.tradeName.trim()
    && String(form.activeFrom || '').trim()
  ) && !registryDuplicate;
  const conversions = form.unitConversions || [];
  const isBaseUnit = form.unit === 'tablet' || form.unit === 'capsule';
  const step1Valid = Boolean(
    (form.unitCount || 1) > 0
    && (isBaseUnit
      ? true
      : conversions.length > 0 && conversions.every((c) => c.qty > 0 && c.toUnit)),
  );
  const step2Valid = form.rightsEligible.length > 0;
  const step3Valid = (form.priceSchedule || []).length > 0;
  const allStepsValid = step0Valid && step1Valid && step2Valid && step3Valid;
  const completedSteps = [step0Valid, step1Valid, step2Valid, step3Valid, false];
  const canAdvance = step === 0 ? step0Valid
    : step === 1 ? step1Valid
    : step === 2 ? step2Valid
    : step === 3 ? step3Valid
    : allStepsValid;

  const handleStepClick = useCallback(
    (idx) => { if (canNavigateToStep(idx, step, completedSteps)) setStep(idx); },
    [step, step0Valid, step1Valid, step2Valid, step3Valid],
  );

  const nextLabel = useMemo(() => {
    if (step === 0) return 'ถัดไป: หน่วยและประเภท';
    if (step === 1) return 'ถัดไป: สิทธิและข้อจำกัด';
    if (step === 2) return 'ถัดไป: ราคา';
    if (step === 3) return 'ถัดไป: ตรวจสอบ';
    return isNew ? 'สร้างรายการยา' : 'บันทึกการเปลี่ยนแปลง';
  }, [step, isNew]);

  const summaryLine = useMemo(() => {
    const cls = DRUG_CLASSIFICATIONS.find((c) => c.key === form.classification)?.label || '—';
    return `${form.name.trim() || 'ยังไม่ระบุชื่อยา'} · ${cls} · ${form.rightsEligible.length} สิทธิ · ${unitLabel(form.unit)}${form.highAlert ? ' · High Alert' : ''}`;
  }, [form.name, form.classification, form.rightsEligible.length, form.unit, form.highAlert]);

  const selectUnit = (unitKey) => {
    setForm((prev) => ({ ...prev, ...defaultsForUnit(unitKey, prev.packSize) }));
  };

  const conversionFromLabel = unitLabel(form.unit);
  const conversionSummary = conversions.length
    ? conversions
      .map((c) => `${form.unitCount || 1} ${conversionFromLabel} = ${(form.unitCount || 1) * (c.qty || 0)} ${unitLabel(c.toUnit)}`)
      .join(' · ')
    : '—';

  const convertUnitOptions = UNIT_TYPES.map((u) => ({ value: u.key, label: u.label }));
  const prescriberScopes = form.restrictedPrescriberScopes || [];
  const prescriberPositions = form.restrictedPrescriberPositions || [];

  const title = isNew ? 'เพิ่มทะเบียนยา' : 'แก้ไขทะเบียนยา';

  const setField = (key, v) => setForm((prev) => ({ ...prev, [key]: v }));
  const toggleRight = (right) => setForm((prev) => ({
    ...prev,
    rightsEligible: prev.rightsEligible.includes(right)
      ? prev.rightsEligible.filter((r) => r !== right)
      : [...prev.rightsEligible, right],
  }));
  const diseaseOptionsForRow = (rowIdx) => {
    const current = form.disallowedChronicDiseases[rowIdx] || '';
    const taken = new Set(
      (form.disallowedChronicDiseases || []).filter((d, i) => i !== rowIdx && d),
    );
    return CHRONIC_DISEASE_OPTIONS
      .filter((name) => name === current || !taken.has(name))
      .map((name) => ({ value: name, label: name }));
  };

  /* Same pattern as เพิ่มช่วงราคา — button appends an empty Select row. */
  const addDisallowedDiseaseRow = () => setForm((prev) => ({
    ...prev,
    disallowedChronicDiseases: [...(prev.disallowedChronicDiseases || []), ''],
  }));
  const updateDisallowedDiseaseRow = (idx, value) => setForm((prev) => ({
    ...prev,
    disallowedChronicDiseases: prev.disallowedChronicDiseases.map((d, i) => (i === idx ? value : d)),
  }));
  const removeDisallowedDiseaseRow = (idx) => setForm((prev) => ({
    ...prev,
    disallowedChronicDiseases: prev.disallowedChronicDiseases.filter((_, i) => i !== idx),
  }));
  const confirmRemoveDisallowedDiseaseRow = () => {
    const idx = pendingDiseaseDelete?.idx;
    setPendingDiseaseDelete(null);
    if (idx != null) removeDisallowedDiseaseRow(idx);
  };
  const updatePriceRow = (idx, key, value) => setForm((prev) => ({
    ...prev,
    priceSchedule: prev.priceSchedule.map((p, i) => (i === idx ? { ...p, [key]: value } : p)),
  }));
  const addPriceRow = () => setForm((prev) => ({
    ...prev,
    priceSchedule: [...prev.priceSchedule, { id: `p-new-${prev.priceSchedule.length + 1}`, effectiveFrom: new Date().toISOString().slice(0, 10), effectiveTo: null, price: 0 }],
  }));

  const updateConversionRow = (id, key, value) => setForm((prev) => {
    const next = (prev.unitConversions || []).map((c) => (c.id === id ? { ...c, [key]: value } : c));
    return { ...prev, ...syncPackFields(next) };
  });
  const addConversionRow = () => setForm((prev) => {
    const next = [
      ...(prev.unitConversions || []),
      { id: nextConversionId(), qty: 1, toUnit: 'tablet' },
    ];
    return { ...prev, ...syncPackFields(next) };
  });
  const removeConversionRow = (id) => setForm((prev) => {
    const next = (prev.unitConversions || []).filter((c) => c.id !== id);
    return { ...prev, ...syncPackFields(next) };
  });
  const confirmRemoveConversionRow = () => {
    const id = pendingConversionDelete?.id;
    setPendingConversionDelete(null);
    if (id) removeConversionRow(id);
  };

  const handleSave = useCallback(() => {
    if (
      !form.code.trim()
      || !form.name.trim()
      || !form.genericName.trim()
      || !form.tradeName.trim()
      || !String(form.activeFrom || '').trim()
    ) return;
    upsertRegistryDrug({
      ...form,
      disallowedChronicDiseases: (form.disallowedChronicDiseases || []).filter(Boolean),
    });
    setSaved(true);
    /* Keep toast visible briefly before parent closes popup / navigates away. */
    setTimeout(() => onSaved?.(), 700);
  }, [form, onSaved]);

  const goNext = useCallback(() => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
      if (variant === 'page') window.scrollTo?.({ top: 0 });
      return;
    }
    handleSave();
  }, [step, variant, handleSave]);

  const goBack = useCallback(() => {
    if (step > 0) {
      setStep(step - 1);
      if (variant === 'page') window.scrollTo?.({ top: 0 });
      return;
    }
    onCancel?.();
  }, [step, variant, onCancel]);

  const onStateChangeRef = useRef(onStateChange);
  onStateChangeRef.current = onStateChange;
  const goNextRef = useRef(goNext);
  goNextRef.current = goNext;
  const goBackRef = useRef(goBack);
  goBackRef.current = goBack;

  useEffect(() => {
    onStateChangeRef.current?.({
      title,
      subtitle: summaryLine,
      step,
      steps: STEPS,
      nextLabel,
      canAdvance,
      isNew,
      goNext: () => goNextRef.current(),
      goBack: () => goBackRef.current(),
      cancel: () => onCancel?.(),
    });
  }, [title, summaryLine, step, nextLabel, canAdvance, isNew, onCancel]);

  const replacementOptions = DRUG_REGISTRY.filter((d) => d.id !== form.id);

  const stepBody = (
    <>
      {step === 0 && (() => {
        const nameFields = (
          <SectionCard
            embedded={isNew}
            icon='medication'
            title='ชื่อยา'
            action={
              isNew && selectedTmt ? (
                <NeutralSubdueButton size='sm' leadingIcon='search' onClick={clearCatalogPick}>
                  ล้างค่าและค้นหาใหม่
                </NeutralSubdueButton>
              ) : null
            }
          >
            {registryDuplicate ? (
              <Alert
                type='warning'
                title='รายการนี้อยู่ในทะเบียนสถานพยาบาลแล้ว'
                subtext={`พบ «${registryDuplicate.name}» (รหัส ${registryDuplicate.code}) ในทะเบียน — ไม่สามารถเพิ่มซ้ำได้ กรุณาแก้ไขจากหน้ารายการทะเบียนยา`}
              />
            ) : null}

            <div
              className='flex flex-col sm:flex-row w-full min-w-0'
              style={{ gap: 'var(--dim-space-400)' }}
            >
              <RegistryDrugPhoto
                src={form.image}
                alt={form.name || 'medication'}
                onUpload={(dataUrl) => setField('image', dataUrl)}
                onClear={() => setField('image', '')}
              />
              <div className='flex flex-col flex-1 min-w-0' style={{ gap: 'var(--dim-space-300)' }}>
                {selectedTmt ? (
                  <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
                    <Tooltip
                      variant='light'
                      position='top'
                      maxWidth={280}
                      wrap
                      content={`GPU (Generic Product) — รหัสระดับสารสำคัญ/สูตรยาในมาตรฐาน TMT · ${selectedTmt.gpuCode}`}
                    >
                      <span className='inline-flex cursor-default'>
                        <Badge style='success' size='small'>GPU {selectedTmt.gpuCode}</Badge>
                      </span>
                    </Tooltip>
                    <Tooltip
                      variant='light'
                      position='top'
                      maxWidth={280}
                      wrap
                      content={`TPU (Trade Product) — รหัสระดับผลิตภัณฑ์การค้าในมาตรฐาน TMT · ${selectedTmt.tpuCode}`}
                    >
                      <span className='inline-flex cursor-default'>
                        <Badge style='info' size='small'>TPU {selectedTmt.tpuCode}</Badge>
                      </span>
                    </Tooltip>
                    {selectedTmt.gpoCode ? (
                      <Tooltip
                        variant='light'
                        position='top'
                        maxWidth={280}
                        wrap
                        content={`GPO — รหัสอ้างอิงบัญชี/เบิกจ่ายที่ผูกกับรายการนี้ · ${selectedTmt.gpoCode}`}
                      >
                        <span className='inline-flex cursor-default'>
                          <Badge style='neutral' size='small'>GPO {selectedTmt.gpoCode}</Badge>
                        </span>
                      </Tooltip>
                    ) : null}
                  </div>
                ) : null}

                <div
                  className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 w-full min-w-0'
                  style={{ gap: 'var(--dim-space-300, 12px)' }}
                >
                  <InputField
                    label='รหัสยา'
                    value={form.code}
                    onChange={(v) => setField('code', v)}
                    placeholder={selectedTmt ? 'จาก TPU' : 'เช่น MED-0001'}
                    showHelperText={false}
                    required
                    disabled={Boolean(selectedTmt)}
                  />
                  <InputField
                    label='ชื่อยา'
                    value={form.name}
                    onChange={(v) => setField('name', v)}
                    placeholder='เช่น Losartan 100 mg'
                    showHelperText={false}
                    required
                  />
                  <InputField
                    label='ชื่อสามัญ (Generic name)'
                    value={form.genericName}
                    onChange={(v) => setField('genericName', v)}
                    placeholder='เช่น Losartan'
                    showHelperText={false}
                    required
                  />
                  <InputField
                    label='ชื่อการค้า (Trade name)'
                    value={form.tradeName}
                    onChange={(v) => setField('tradeName', v)}
                    placeholder='เช่น Cozaar'
                    showHelperText={false}
                    required
                  />
                </div>
              </div>
            </div>
          </SectionCard>
        );

        const datesCard = (
          <SectionCard icon='event' title='วันที่เริ่มจำหน่าย / วันที่ตัดรายการ'>
            <div
              className='grid grid-cols-1 md:grid-cols-2 w-full min-w-0'
              style={{ gap: 'var(--dim-space-300, 12px)' }}
            >
              <DatePicker
                label='วันที่เริ่มจำหน่ายยาในสถานพยาบาล'
                value={dateFromIso(form.activeFrom)}
                onChange={(d) => setField('activeFrom', isoFromDate(d) || '')}
                placeholder='เลือกวันที่'
                showHelperText={false}
                required
              />
              <DatePicker
                label='วันที่ตัดรายการยาออกจากสถานพยาบาล (ถ้ามี)'
                value={dateFromIso(form.activeTo)}
                onChange={(d) => setField('activeTo', isoFromDate(d))}
                placeholder='เลือกวันที่'
                showHelperText={false}
              />
            </div>
          </SectionCard>
        );

        if (!isNew) {
          return (
            <>
              {nameFields}
              {datesCard}
            </>
          );
        }

        /* One white card hosts TMT search + ชื่อยา form (same surface). */
        return (
          <>
            <section
              className='flex flex-col w-full'
              style={{
                ...PHARMACY_WORKLIST_CARD,
                padding: 'var(--dim-space-600)',
                gap: 'var(--dim-space-600)',
              }}
            >
              <div className='w-full flex justify-center'>
                <DoctorAiDrugPanel
                  value={catalogQuery}
                  onChange={setCatalogQuery}
                  onSubmit={(_next, picked) => {
                    if (!picked) return;
                    const row = resolveTmtFromPick(picked);
                    if (!row) return;
                    const dup = findFacilityRegistryMatch(row);
                    if (dup) {
                      setDuplicateWarn(dup);
                      return;
                    }
                    setPendingTmtPick({
                      code: row.tpuCode,
                      name: picked.label || row.name,
                      tmtId: row.id,
                      tpuCode: row.tpuCode,
                      gpuCode: row.gpuCode,
                      gpoCode: row.gpoCode || '',
                    });
                  }}
                />
              </div>
              {nameFields}
            </section>
            {datesCard}
          </>
        );
      })()}

      {step === 1 && (
        <>
          <SectionCard
            icon='straighten'
            title='หน่วยนับและอัตราแปลง'
            subtitle='เลือกหน่วยจ่ายหลัก และกำหนดอัตราแปลงของรายการยานี้'
          >
            <div
              className='grid grid-cols-1 md:grid-cols-2 w-full min-w-0'
              style={{ gap: 'var(--dim-space-400)' }}
            >
              <div
                className='flex flex-col min-w-0'
                style={{
                  ...UNIT_GROUP_PANEL,
                  gap: 'var(--dim-space-400)',
                  padding: 'var(--dim-space-400)',
                }}
              >
                <Topic
                  hierarchy='tertiary'
                  state='default'
                  title='หน่วยนับ'
                  subText='เลือกหน่วยจ่ายหลักของรายการยานี้'
                  showLeadingIcon={false}
                  showSubText
                  showBadge={false}
                  showChevron={false}
                  showSuccess={false}
                  style={{
                    paddingLeft: 'var(--dim-space-0)',
                    paddingRight: 'var(--dim-space-0)',
                    paddingTop: 'var(--dim-space-0)',
                    paddingBottom: 'var(--dim-space-0)',
                    background: 'transparent',
                  }}
                />
                <div className='grid w-full' style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 'var(--dim-space-300)' }}>
                  {UNIT_TYPES.filter((u) => COUNT_UNIT_KEYS.includes(u.key)).map((u) => (
                    <OptionCard
                      key={u.key}
                      label={u.label}
                      sublabel={u.labelEn}
                      selected={form.unit === u.key}
                      onSelect={() => selectUnit(u.key)}
                    />
                  ))}
                </div>
                <div className='flex flex-col' style={{ gap: 'var(--dim-space-150)' }}>
                  <span
                    style={{
                      fontFamily: 'var(--type-family-body)',
                      fontSize: 'var(--type-size-sm)',
                      fontWeight: 'var(--type-weight-regular)',
                      color: 'var(--text-content-secondary)',
                      lineHeight: 1.5,
                    }}
                  >
                    {`จำนวน (${unitLabel(form.unit)})`}
                  </span>
                  <Stepper
                    min={1}
                    value={form.unitCount != null ? form.unitCount : 1}
                    onChange={(n) => setField('unitCount', n == null || Number.isNaN(n) ? 1 : n)}
                    aria-label={`จำนวน (${unitLabel(form.unit)})`}
                  />
                </div>
              </div>

              <div
                className='flex flex-col min-w-0'
                style={{
                  ...UNIT_GROUP_PANEL,
                  gap: 'var(--dim-space-400)',
                  padding: 'var(--dim-space-400)',
                }}
              >
                <Topic
                  hierarchy='tertiary'
                  state='default'
                  title='อัตราแปลง'
                  subText='เลือกหน่วยแปลงได้หลายรายการ'
                  showLeadingIcon={false}
                  showSubText
                  showBadge={false}
                  showChevron={false}
                  showSuccess={false}
                  style={{
                    paddingLeft: 'var(--dim-space-0)',
                    paddingRight: 'var(--dim-space-0)',
                    paddingTop: 'var(--dim-space-0)',
                    paddingBottom: 'var(--dim-space-0)',
                    background: 'transparent',
                  }}
                />
                <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
                  {conversions.map((row, idx) => (
                    <div
                      key={row.id}
                      className='flex flex-wrap items-end w-full min-w-0'
                      style={{ gap: 'var(--dim-space-200)' }}
                    >
                      <div className='flex flex-col' style={{ gap: 'var(--dim-space-150)' }}>
                        {idx === 0 ? (
                          <span
                            style={{
                              fontFamily: 'var(--type-family-body)',
                              fontSize: 'var(--type-size-sm)',
                              fontWeight: 'var(--type-weight-regular)',
                              color: 'var(--text-content-secondary)',
                              lineHeight: 1.5,
                            }}
                          >
                            ปริมาณ
                          </span>
                        ) : null}
                        <Stepper
                          min={1}
                          size='large'
                          value={row.qty != null ? row.qty : 1}
                          onChange={(n) => updateConversionRow(
                            row.id,
                            'qty',
                            n == null || Number.isNaN(n) ? 1 : n,
                          )}
                          aria-label='ปริมาณ'
                        />
                      </div>
                      <div style={{ width: 'var(--dim-size-2100, 160px)', flexShrink: 0 }}>
                        <Select
                          label='หน่วยแปลง'
                          value={row.toUnit}
                          onChange={(v) => updateConversionRow(row.id, 'toUnit', v)}
                          searchable={false}
                          showLabel={idx === 0}
                          showHelperText={false}
                          options={convertUnitOptions}
                        />
                      </div>
                      <NeutralSubdueIconButton
                        icon='delete'
                        size='md'
                        variant='outline'
                        aria-label='ลบอัตราแปลง'
                        onClick={() => setPendingConversionDelete(row)}
                      />
                    </div>
                  ))}
                  <NeutralSubdueButton
                    size='sm'
                    leadingIcon='add'
                    onClick={addConversionRow}
                    className='w-fit'
                    style={{ alignSelf: 'flex-start', width: 'fit-content', maxWidth: 'none' }}
                  >
                    เพิ่มอัตราแปลง
                  </NeutralSubdueButton>
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard icon='category' title='กลุ่มยา' subtitle='บัญชียาหลักแห่งชาติ / วัตถุออกฤทธิ์ต่อจิตและประสาท'>
            <div className='grid w-full' style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 'var(--dim-space-300)' }}>
              {DRUG_CLASSIFICATIONS.map((c) => (
                <OptionCard key={c.key} label={c.label} selected={form.classification === c.key} onSelect={() => setField('classification', c.key)} />
              ))}
            </div>
          </SectionCard>

          <SectionCard icon='warning' title='ความเสี่ยง' subtitle='ระบุว่ารายการนี้เป็นยาเสี่ยงสูงหรือไม่ — ระบบจะแจ้งเตือนก่อนจ่ายเมื่อเลือกเสี่ยงสูง'>
            <div className='flex flex-wrap w-full' style={{ gap: 'var(--dim-space-200)' }}>
              <CheckboxButton
                checked={!form.highAlert}
                onChange={(v) => { if (v) setField('highAlert', false); }}
                label='เป็นยาไม่เสี่ยงสูง'
                border
                showCircleIcon={false}
                showIcon={false}
                showBadge={false}
                showBadge2={false}
                className='w-fit max-w-full'
                style={{ width: 'fit-content' }}
              />
              <CheckboxButton
                checked={form.highAlert}
                onChange={(v) => { if (v) setField('highAlert', true); }}
                label='เป็นยาเสี่ยงสูง'
                border
                showCircleIcon={false}
                showIcon={false}
                showBadge={false}
                showBadge2={false}
                className='w-fit max-w-full'
                style={{ width: 'fit-content' }}
              />
            </div>
          </SectionCard>
        </>
      )}

      {step === 2 && (
        <>
          <SectionCard icon='verified_user' title='สิทธิที่เบิกได้' subtitle='เลือกสิทธิการรักษาที่สามารถเบิกจ่ายยานี้ได้'>
            <div className='flex flex-wrap w-full' style={{ gap: 'var(--dim-space-200)' }}>
              {RIGHTS_LIST.map((r) => (
                <SelectableTag
                  key={r}
                  label={r}
                  selected={form.rightsEligible.includes(r)}
                  onClick={() => toggleRight(r)}
                  size='md'
                />
              ))}
            </div>
          </SectionCard>

          <SectionCard icon='block' title='ข้อจำกัดการสั่งจ่าย' subtitle='โรคประจำตัวที่ไม่อนุญาตให้จ่ายยานี้ (ถ้ามี)'>
            <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
              {(form.disallowedChronicDiseases || []).map((disease, idx) => (
                <div
                  key={`disease-${idx}`}
                  className='flex flex-wrap items-end w-fit max-w-full min-w-0'
                  style={{ gap: 'var(--dim-space-200)' }}
                >
                  <div
                    className='min-w-0'
                    style={{ width: 'min(100%, var(--dim-size-2500, 320px))' }}
                  >
                    <Select
                      label={idx === 0 ? 'โรคประจำตัว' : `โรคประจำตัว ${idx + 1}`}
                      value={disease || ''}
                      onChange={(v) => updateDisallowedDiseaseRow(idx, v || '')}
                      options={diseaseOptionsForRow(idx)}
                      placeholder='เลือกโรคประจำตัว'
                      searchable
                      showHelperText={false}
                    />
                  </div>
                  <NeutralSubdueIconButton
                    icon='delete'
                    size='md'
                    variant='outline'
                    aria-label='ลบโรคประจำตัว'
                    onClick={() => setPendingDiseaseDelete({ idx, name: disease || '' })}
                  />
                </div>
              ))}
              <NeutralSubdueButton
                size='sm'
                leadingIcon='add'
                onClick={addDisallowedDiseaseRow}
                className='w-fit'
                style={{ alignSelf: 'flex-start', width: 'fit-content', maxWidth: 'none' }}
              >
                เพิ่มโรคประจำตัว
              </NeutralSubdueButton>
            </div>
          </SectionCard>

          <SectionCard
            icon='groups'
            title='กลุ่มแพทย์เฉพาะที่อนุญาตให้สั่ง'
            subtitle='กำหนด Group Policy และตำแหน่งที่อนุญาตให้สั่งจ่ายยานี้'
          >
            <div
              className='grid w-full min-w-0'
              style={{
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
                gap: 'var(--dim-space-400)',
                alignItems: 'stretch',
              }}
            >
              <div
                className='flex flex-col w-full min-w-0 h-full'
                style={{
                  ...UNIT_GROUP_PANEL,
                  padding: 'var(--dim-space-400)',
                  gap: 'var(--dim-space-300)',
                }}
              >
                <span
                  style={{
                    color: 'var(--text-topic-tertiary-title, #363B3F)',
                    fontFamily: 'var(--type-family-heading-content, var(--type-family-body))',
                    fontSize: 'var(--type-size-sm)',
                    fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
                    lineHeight: 1.5,
                  }}
                >
                  Group Policy / สาขาย่อย / แผนก
                </span>
                {prescriberScopes.length > 0 ? (
                  <FormScopeGrouping scopes={prescriberScopes} columns={1} variant='panel' dense />
                ) : null}
                <NeutralSubdueButton
                  variant='outline'
                  size='sm'
                  leadingIcon='edit'
                  onClick={() => setPrescriberScopeOpen(true)}
                  className='w-fit'
                  style={{ alignSelf: 'flex-start', width: 'fit-content', marginTop: 'auto' }}
                >
                  {prescriberScopes.length ? 'แก้ไข Group Policy' : 'เลือก Group Policy'}
                </NeutralSubdueButton>
              </div>

              <div
                className='flex flex-col w-full min-w-0 h-full'
                style={{
                  ...UNIT_GROUP_PANEL,
                  padding: 'var(--dim-space-400)',
                  gap: 'var(--dim-space-300)',
                }}
              >
                <span
                  style={{
                    color: 'var(--text-topic-tertiary-title, #363B3F)',
                    fontFamily: 'var(--type-family-heading-content, var(--type-family-body))',
                    fontSize: 'var(--type-size-sm)',
                    fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
                    lineHeight: 1.5,
                  }}
                >
                  ตำแหน่ง
                </span>
                {prescriberPositions.length > 0 ? (
                  <FormPositionGrouping positions={prescriberPositions} columns={1} variant='panel' />
                ) : null}
                <NeutralSubdueButton
                  variant='outline'
                  size='sm'
                  leadingIcon='edit'
                  onClick={() => setPrescriberPositionOpen(true)}
                  className='w-fit'
                  style={{ alignSelf: 'flex-start', width: 'fit-content', marginTop: 'auto' }}
                >
                  {prescriberPositions.length ? 'แก้ไขตำแหน่ง' : 'เลือกตำแหน่ง'}
                </NeutralSubdueButton>
              </div>
            </div>
          </SectionCard>
        </>
      )}

      {step === 3 && (
        <>
          <SectionCard
            icon='payments'
            title='ราคาและช่วงเวลามีผล'
            subtitle='ปรับราคายาล่วงหน้าได้โดยกำหนดวันที่เริ่มต้นและวันที่สิ้นสุด'
          >
            <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
              {form.priceSchedule.map((p, i) => (
                <div
                  key={p.id}
                  className='grid grid-cols-1 md:grid-cols-4 w-full min-w-0'
                  style={{ gap: 'var(--dim-space-300, 12px)' }}
                >
                  <InputField
                    label='ราคา (บาท)'
                    type='number'
                    value={p.price != null ? String(p.price) : ''}
                    onChange={(v) => updatePriceRow(i, 'price', Number(v) || 0)}
                    showLabel={i === 0}
                    showHelperText={false}
                    className='w-full min-w-0'
                  />
                  <DatePicker
                    label='เริ่มมีผล'
                    value={dateFromIso(p.effectiveFrom)}
                    onChange={(d) => updatePriceRow(i, 'effectiveFrom', isoFromDate(d) || '')}
                    placeholder='เลือกวันที่'
                    showLabel={i === 0}
                    showHelperText={false}
                    className='w-full min-w-0'
                  />
                  <DatePicker
                    label='สิ้นสุด (ถ้ามี)'
                    value={dateFromIso(p.effectiveTo)}
                    onChange={(d) => updatePriceRow(i, 'effectiveTo', isoFromDate(d))}
                    placeholder='เลือกวันที่'
                    showLabel={i === 0}
                    showHelperText={false}
                    className='w-full min-w-0'
                  />
                </div>
              ))}
              <NeutralSubdueButton
                size='sm'
                leadingIcon='add'
                onClick={addPriceRow}
                className='w-fit'
                style={{ alignSelf: 'flex-start', width: 'fit-content', maxWidth: 'none' }}
              >
                เพิ่มช่วงราคา
              </NeutralSubdueButton>
            </div>
          </SectionCard>

          {!isNew && (
            <SectionCard icon='block' title='ปิดใช้งานและรายการทดแทน' subtitle='เมื่อปิดใช้งานรายการยานี้ สามารถตั้งค่ารายการทดแทนไว้ล่วงหน้าได้ (ToR §1.9.10)'>
              <div className='w-full md:w-1/2 min-w-0'>
                <Select
                  label='รายการทดแทน'
                  value={form.replacementId || ''}
                  onChange={(v) => setField('replacementId', v)}
                  searchable={false}
                  showHelperText={false}
                  options={[
                    { value: '', label: '— ไม่กำหนดรายการทดแทน —' },
                    ...replacementOptions.map((d) => ({ value: d.id, label: d.name })),
                  ]}
                />
              </div>
            </SectionCard>
          )}
        </>
      )}

      {step === 4 && (() => {
        const diseases = (form.disallowedChronicDiseases || []).filter(Boolean);
        const priceLines = (form.priceSchedule || []).map((p, i) => {
          const from = formatIsoDate(p.effectiveFrom);
          const to = p.effectiveTo ? formatIsoDate(p.effectiveTo) : 'ไม่กำหนดสิ้นสุด';
          const price = p.price != null
            ? `${Number(p.price).toLocaleString('th-TH')} บาท`
            : '—';
          return `ช่วงที่ ${i + 1}: ${price} · ${from} – ${to}`;
        });
        const replacementName = form.replacementId
          ? (replacementOptions.find((d) => d.id === form.replacementId)?.name || form.replacementId)
          : '';

        return (
          <>
            <SectionCard
              icon='fact_check'
              title='ตรวจสอบก่อนบันทึก'
            >
              <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200)' }}>
                <span
                  style={{
                    color: 'var(--text-content-tertiary)',
                    fontFamily: 'var(--type-family-body)',
                    fontSize: 'var(--type-size-xs)',
                    lineHeight: 1.5,
                  }}
                >
                  ตรวจทานความถูกต้องของข้อมูลทั้งหมด แล้วกดปุ่มบันทึกด้านล่าง
                </span>
              </div>
            </SectionCard>

            <SectionCard icon='medication' title='1. ข้อมูลพื้นฐาน'>
              <div
                className='flex flex-col sm:flex-row w-full min-w-0'
                style={{ gap: 'var(--dim-space-400)' }}
              >
                <PharmacyDrugImage
                  src={String(form.image || '').trim()}
                  alt={form.name || 'medication'}
                  size='var(--dim-size-1700, 80px)'
                  iconSize={36}
                  radius='var(--dim-radius-300, 12px)'
                />
                <div className='flex flex-col flex-1 min-w-0' style={{ gap: 'var(--dim-space-200)' }}>
                  <ReviewRow label='รหัสยา' value={form.code} />
                  <ReviewRow label='ชื่อยา' value={form.name} />
                  <ReviewRow label='ชื่อสามัญ' value={form.genericName} />
                  <ReviewRow label='ชื่อการค้า' value={form.tradeName} />
                  {(form.tmtGpu || form.tmtTpu || form.tmtGpo) ? (
                    <ReviewRow
                      label='รหัส TMT'
                      value={[
                        form.tmtGpu ? `GPU ${form.tmtGpu}` : null,
                        form.tmtTpu ? `TPU ${form.tmtTpu}` : null,
                        form.tmtGpo ? `GPO ${form.tmtGpo}` : null,
                      ].filter(Boolean).join(' · ')}
                    />
                  ) : null}
                  <ReviewRow label='วันที่เริ่มจำหน่าย' value={formatIsoDate(form.activeFrom)} />
                  <ReviewRow
                    label='วันที่ตัดรายการ'
                    value={form.activeTo ? formatIsoDate(form.activeTo) : 'ไม่กำหนด'}
                  />
                </div>
              </div>
            </SectionCard>

            <SectionCard icon='straighten' title='2. หน่วยและประเภท'>
              <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200)' }}>
                <ReviewRow
                  label='หน่วยนับ'
                  value={`${form.unitCount || 1} ${unitLabel(form.unit)}`}
                />
                <ReviewRow label='อัตราแปลง' value={conversionSummary} />
                <ReviewRow
                  label='กลุ่มยา'
                  value={DRUG_CLASSIFICATIONS.find((c) => c.key === form.classification)?.label}
                />
                <ReviewRow
                  label='ความเสี่ยง'
                  value={form.highAlert ? 'เป็นยาเสี่ยงสูง' : 'เป็นยาไม่เสี่ยงสูง'}
                />
              </div>
            </SectionCard>

            <SectionCard icon='verified_user' title='3. สิทธิและข้อจำกัด'>
              <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
                <ReviewRow
                  label='สิทธิที่เบิกได้'
                  value={form.rightsEligible?.length
                    ? form.rightsEligible.join(', ')
                    : '—'}
                />
                <ReviewRow
                  label='โรคประจำตัวที่ไม่อนุญาต'
                  value={diseases.length ? diseases.join(', ') : 'ไม่จำกัด'}
                />
                <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200)' }}>
                  <span
                    style={{
                      color: 'var(--text-content-tertiary)',
                      fontFamily: 'var(--type-family-body)',
                      fontSize: 'var(--type-size-xs)',
                      lineHeight: 1.5,
                    }}
                  >
                    Group Policy / สาขาย่อย / แผนก ที่อนุญาตให้สั่ง
                  </span>
                  {prescriberScopes.length > 0 ? (
                    <FormScopeGrouping scopes={prescriberScopes} columns={1} variant='panel' dense />
                  ) : (
                    <span
                      style={{
                        color: 'var(--text-content-secondary)',
                        fontFamily: 'var(--type-family-body)',
                        fontSize: 'var(--type-size-sm)',
                      }}
                    >
                      ไม่จำกัด
                    </span>
                  )}
                </div>
                <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200)' }}>
                  <span
                    style={{
                      color: 'var(--text-content-tertiary)',
                      fontFamily: 'var(--type-family-body)',
                      fontSize: 'var(--type-size-xs)',
                      lineHeight: 1.5,
                    }}
                  >
                    ตำแหน่งที่อนุญาตให้สั่ง
                  </span>
                  {prescriberPositions.length > 0 ? (
                    <FormPositionGrouping positions={prescriberPositions} columns={1} variant='panel' />
                  ) : (
                    <span
                      style={{
                        color: 'var(--text-content-secondary)',
                        fontFamily: 'var(--type-family-body)',
                        fontSize: 'var(--type-size-sm)',
                      }}
                    >
                      ไม่จำกัด
                    </span>
                  )}
                </div>
              </div>
            </SectionCard>

            <SectionCard icon='payments' title='4. ราคา'>
              <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200)' }}>
                {priceLines.length
                  ? priceLines.map((line) => (
                    <ReviewRow key={line} label='ช่วงราคา' value={line} />
                  ))
                  : <ReviewRow label='ช่วงราคา' value='—' />}
                {!isNew ? (
                  <ReviewRow
                    label='รายการทดแทน'
                    value={replacementName || 'ไม่กำหนดรายการทดแทน'}
                  />
                ) : null}
              </div>
            </SectionCard>
          </>
        );
      })()}
    </>
  );

  const toast = (
    <SuccessToast
      open={saved}
      message={isNew ? 'สร้างรายการยาสำเร็จ' : 'บันทึกการเปลี่ยนแปลงสำเร็จ'}
      onClose={() => setSaved(false)}
    />
  );

  if (!isNew && !existing) {
    if (variant === 'popup') {
      return (
        <div
          className='flex flex-1 items-center justify-center text-ink-tertiary'
          style={{ padding: 'var(--dim-space-600, 24px)' }}
        >
          ไม่พบรายการยาที่ตรงกับลิงก์นี้
        </div>
      );
    }
    return (
      <QueuePageShell
        activeKey='pharmacy'
        breadcrumb={['ระบบงานเภสัชกรรม', 'ทะเบียนยา', 'ไม่พบรายการยา']}
        title='ไม่พบรายการยา'
        onBack={onCancel}
        backLabel='กลับไปยังทะเบียนยา'
      >
        <div
          className='flex flex-1 items-center justify-center text-ink-tertiary'
          style={{ padding: 'var(--dim-space-600, 24px)' }}
        >
          ไม่พบรายการยาที่ตรงกับลิงก์นี้
        </div>
      </QueuePageShell>
    );
  }

  const pickOverlays = (
    <>
      <ConfirmAddDiagnosisPopup
        open={pendingTmtPick != null}
        onClose={() => setPendingTmtPick(null)}
        onConfirm={confirmPendingTmtPick}
        diagnosis={pendingTmtPick}
        title='คุณต้องการเพิ่มรหัสยานี้ ในทะเบียนยา'
        cancelLabel='ไม่เพิ่ม'
        confirmLabel='เพิ่มรหัสยา'
      />
      <AlertDialog
        open={duplicateWarn != null}
        type='warning'
        alignment='center'
        title='รายการนี้อยู่ในทะเบียนแล้ว'
        description={duplicateWarn
          ? `พบ «${duplicateWarn.name}» (รหัส ${duplicateWarn.code}) ในทะเบียนสถานพยาบาลแล้ว — ไม่สามารถเพิ่มซ้ำได้ กรุณาแก้ไขจากหน้ารายการทะเบียนยา`
          : ''}
        confirmLabel='รับทราบ'
        cancelLabel='ปิด'
        onConfirm={() => setDuplicateWarn(null)}
        onCancel={() => setDuplicateWarn(null)}
        onClose={() => setDuplicateWarn(null)}
      />
      <AlertDialog
        open={pendingConversionDelete != null}
        type='destructive'
        alignment='center'
        title='ยืนยันการลบอัตราแปลง'
        description={
          pendingConversionDelete
            ? `คุณต้องการลบอัตราแปลง ${pendingConversionDelete.qty ?? 1} ${unitLabel(pendingConversionDelete.toUnit)} ใช่หรือไม่`
            : ''
        }
        cancelLabel='ยกเลิก'
        confirmLabel='ลบอัตราแปลง'
        onConfirm={confirmRemoveConversionRow}
        onCancel={() => setPendingConversionDelete(null)}
        onClose={() => setPendingConversionDelete(null)}
      />
      <AlertDialog
        open={pendingDiseaseDelete != null}
        type='destructive'
        alignment='center'
        title='ยืนยันการลบโรคประจำตัว'
        description={
          pendingDiseaseDelete?.name
            ? `คุณต้องการลบโรคประจำตัว «${pendingDiseaseDelete.name}» ใช่หรือไม่`
            : 'คุณต้องการลบรายการโรคประจำตัวนี้ใช่หรือไม่'
        }
        cancelLabel='ยกเลิก'
        confirmLabel='ลบโรคประจำตัว'
        onConfirm={confirmRemoveDisallowedDiseaseRow}
        onCancel={() => setPendingDiseaseDelete(null)}
        onClose={() => setPendingDiseaseDelete(null)}
      />
      <PharmacyPrescriberScopePopup
        open={prescriberScopeOpen}
        scopes={prescriberScopes}
        drugCode={form.code}
        drugName={form.name}
        drugImage={form.image}
        onClose={() => setPrescriberScopeOpen(false)}
        onSave={(nextScopes) => {
          const scopes = stripConsentScopes(nextScopes || []);
          setForm((prev) => ({
            ...prev,
            restrictedPrescriberScopes: scopes,
            restrictedToDoctorGroup: summaryFromPrescriberScopes(scopes),
          }));
          setPrescriberScopeOpen(false);
        }}
      />
      <PharmacyPrescriberPositionPopup
        open={prescriberPositionOpen}
        positions={prescriberPositions}
        drugCode={form.code}
        drugName={form.name}
        drugImage={form.image}
        onClose={() => setPrescriberPositionOpen(false)}
        onSave={(nextPositions) => {
          setForm((prev) => ({
            ...prev,
            restrictedPrescriberPositions: [...(nextPositions || [])],
          }));
          setPrescriberPositionOpen(false);
        }}
      />
    </>
  );

  if (variant === 'popup') {
    return (
      <>
        <div className='flex flex-col w-full min-w-0' style={{ gap: 'var(--dim-space-400)' }}>
          <StepProgress
            steps={STEPS}
            current={step}
            onStepClick={handleStepClick}
            completedSteps={completedSteps}
            compact
          />
          <div className='flex flex-col w-full min-w-0' style={{ gap: 'var(--dim-space-400)' }}>
            {stepBody}
          </div>
        </div>
        {toast}
        {pickOverlays}
      </>
    );
  }

  const breadcrumb = ['ระบบงานเภสัชกรรม', 'ทะเบียนยา', isNew ? 'เพิ่มทะเบียนยา' : form.name || 'แก้ไขรายการยา'];

  return (
    <>
      <QueuePageShell
        activeKey='pharmacy'
        breadcrumb={breadcrumb}
        {...WIZARD_MORPH_SHELL_PROPS}
        headerInfo={(
          <WizardMorphHeader
            title={title}
            steps={STEPS}
            current={step}
            onStepClick={handleStepClick}
            completedSteps={completedSteps}
          />
        )}
      >
        <div
          className='flex flex-col flex-1 min-w-0'
          style={{ padding: 'var(--dim-space-600)', gap: 'var(--dim-space-400)', paddingBottom: 96 }}
        >
          {stepBody}
        </div>

        <div
          className={`sticky bottom-0 z-10 flex items-center w-full ${MIH_CHROME_MORPH_FOOTER}`}
          style={{
            background: 'var(--surface-card-100)',
            borderTop: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
            boxShadow: '0 -2px 8px rgba(8,167,104,0.06)',
            padding: 'var(--dim-space-400) var(--dim-space-600)',
            gap: 'var(--dim-space-600)',
          }}
        >
          {step > 0 ? (
            <NeutralSubdueButton
              size='lg'
              leadingIcon='arrow_back'
              onClick={goBack}
              className='shrink-0'
            >
              ย้อนกลับ
            </NeutralSubdueButton>
          ) : (
            <NeutralSubdueButton size='lg' onClick={onCancel} className='shrink-0'>
              ยกเลิก
            </NeutralSubdueButton>
          )}
          <div className='flex items-center min-w-0 flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
            <span style={{ width: 8, height: 8, borderRadius: 'var(--dim-radius-full)', background: 'var(--surface-positive-secondary, #A2EDDE)' }} />
            <span className='truncate' style={{ color: 'var(--text-content-secondary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)' }}>
              {summaryLine}
            </span>
          </div>
          <div className='flex-1' />
          <div className='flex items-center shrink-0' style={{ gap: 'var(--dim-space-300)' }}>
            {step > 0 && (
              <NeutralSubdueButton size='lg' onClick={onCancel}>
                ยกเลิก
              </NeutralSubdueButton>
            )}
            <BrandButton variant='fill' size='lg' trailingIcon={step < STEPS.length - 1 ? 'arrow_forward' : 'save'} disabled={!canAdvance} onClick={goNext}>
              {nextLabel}
            </BrandButton>
          </div>
        </div>
      </QueuePageShell>
      {toast}
      {pickOverlays}
    </>
  );
};

export default PharmacyRegistryEditor;
export { STEPS };
