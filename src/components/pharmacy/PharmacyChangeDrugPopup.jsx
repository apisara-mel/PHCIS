import React, { useEffect, useMemo, useState } from 'react';
import Popup from '@/components/popup/Popup';
import { useNestedPopupPanel } from '@/components/popup/useNestedPopupPanel';
import PrimarySearch from '@/components/search/PrimarySearch';
import Badge from '@/components/badge/Badge';
import Select from '@/components/forms/Select';
import Textarea from '@/components/forms/Textarea';
import FormularyStatusBadge from '@/components/pharmacy/FormularyStatusBadge';
import { getAllergySafeDrugs } from '@/data/pharmacyQueue';
import { resolveMedicationImage } from '@/data/medicationCatalog';

/* Pharmacy change-drug picker — single Popup with nested panel (not stacked
   modals):
   1) เลือกยาทดแทน (search + image + formulary badge)
   2) Nested panel: ระบุเหตุผลการเปลี่ยนยา (บังคับ) ก่อนยืนยัน */

const ROW_STYLE_ID = 'mih-pharmacy-change-drug-row-styles';
if (typeof document !== 'undefined' && !document.getElementById(ROW_STYLE_ID)) {
  const sheet = document.createElement('style');
  sheet.id = ROW_STYLE_ID;
  sheet.textContent = `
    .mih-pharmacy-change-drug-row {
      transition:
        background-color 150ms ease-out,
        border-color 150ms ease-out,
        box-shadow 150ms ease-out;
    }
    .mih-pharmacy-change-drug-row:hover {
      background: var(--surface-list-hover, #F4FBF8) !important;
    }
    .mih-pharmacy-change-drug-row[aria-pressed="true"] {
      background: var(--surface-list-hover, #F4FBF8) !important;
      border-color: var(--border-brandPrimary-tertiary, #C5EDDA) !important;
    }
    .mih-pharmacy-change-drug-row[aria-pressed="true"]:hover {
      background: var(--surface-brandPrimary-quaternary, #E6F4EE) !important;
    }
    .mih-pharmacy-change-drug-row:focus-visible {
      outline: none !important;
      box-shadow: 0 0 0 2px var(--border-brandPrimary-tertiary, #C5EDDA);
    }
  `;
  document.head.appendChild(sheet);
}

const REASON_PRESETS = [
  { value: 'allergy', label: 'ผู้ป่วยแพ้ยาที่สั่งเดิม' },
  { value: 'stock', label: 'ยาหมดสต็อก / ไม่มีในคลัง' },
  { value: 'doctor', label: 'แพทย์อนุญาตให้เปลี่ยนยาทดแทน' },
  { value: 'rights', label: 'ปรับตามสิทธิการเบิก / บัญชียา' },
  { value: 'interaction', label: 'หลีกเลี่ยงอันตรกิริยาระหว่างยา' },
  { value: 'other', label: 'อื่นๆ (ระบุในรายละเอียด)' },
];

const DrugImageTile = ({ src, alt }) => {
  const [broken, setBroken] = useState(false);
  const baseStyle = {
    width: 'var(--dim-size-700, 36px)',
    height: 'var(--dim-size-700, 36px)',
    borderRadius: 'var(--dim-radius-full, 9999px)',
    border: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary, #F4F5F5)',
    flexShrink: 0,
    boxSizing: 'border-box',
    overflow: 'hidden',
  };
  if (src && !broken) {
    return (
      <img
        src={src}
        alt={alt || 'medication'}
        loading='lazy'
        onError={() => setBroken(true)}
        style={{
          ...baseStyle,
          objectFit: 'cover',
          background: 'var(--surface-card-quaternary, #F9FBFB)',
        }}
      />
    );
  }
  return (
    <span
      className='inline-flex items-center justify-center material-symbols-outlined'
      style={{
        ...baseStyle,
        background: 'var(--surface-brandPrimary-quaternary, #E6F4EE)',
        color: 'var(--text-brandPrimary-default, #007549)',
        fontFamily: 'Material Symbols Outlined',
        fontSize: 18,
      }}
      aria-hidden
    >
      medication
    </span>
  );
};

const SwapSummary = ({ fromName, toName }) => (
  <div
    className='flex items-center w-full'
    style={{
      gap: 'var(--dim-space-300)',
      padding: 'var(--dim-space-400)',
      background: 'var(--surface-card-quaternary, #F9FBFB)',
      borderRadius: 'var(--dim-radius-300)',
      boxSizing: 'border-box',
    }}
  >
    <div className='flex items-center min-w-0' style={{ gap: 'var(--dim-space-200)', flex: '1 1 0' }}>
      <DrugImageTile src={resolveMedicationImage(fromName)} alt={fromName} />
      <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-050)' }}>
        <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>ยาเดิม</span>
        <span style={{ fontSize: 'var(--type-size-sm)', fontWeight: 'var(--type-weight-medium)', color: 'var(--text-content-default)' }}>
          {fromName || '—'}
        </span>
      </div>
    </div>
    <span
      className='material-symbols-outlined shrink-0'
      style={{ color: 'var(--icon-content-tertiary)', fontSize: 20 }}
      aria-hidden
    >
      arrow_forward
    </span>
    <div className='flex items-center min-w-0' style={{ gap: 'var(--dim-space-200)', flex: '1 1 0' }}>
      <DrugImageTile src={resolveMedicationImage(toName)} alt={toName} />
      <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-050)' }}>
        <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>ยาใหม่</span>
        <span style={{ fontSize: 'var(--type-size-sm)', fontWeight: 'var(--type-weight-medium)', color: 'var(--text-content-default)' }}>
          {toName || '—'}
        </span>
      </div>
    </div>
  </div>
);

const PharmacyChangeDrugPopup = ({
  open = false,
  onClose,
  onConfirm,
  allergies = [],
  currentName = '',
  title = 'เปลี่ยนยา',
  subtitle = 'เลือกรายการยาทดแทน — กรองยาที่ผู้ป่วยแพ้แล้ว',
}) => {
  const panels = useNestedPopupPanel('pick');
  const isReason = panels.step === 'reason';
  const [query, setQuery] = useState('');
  const [selectedName, setSelectedName] = useState(currentName);
  const [reasonPreset, setReasonPreset] = useState('');
  const [reasonDetail, setReasonDetail] = useState('');

  useEffect(() => {
    if (!open) {
      setQuery('');
      setSelectedName(currentName || '');
      setReasonPreset('');
      setReasonDetail('');
      panels.reset();
      return;
    }
    setQuery('');
    setSelectedName(currentName || '');
    setReasonPreset('');
    setReasonDetail('');
    panels.reset();
  }, [open, currentName]); // eslint-disable-line react-hooks/exhaustive-deps

  const options = useMemo(
    () => getAllergySafeDrugs(allergies, currentName),
    [allergies, currentName],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((d) => String(d.name || '').toLowerCase().includes(q));
  }, [options, query]);

  const canGoReason = Boolean(selectedName) && selectedName !== currentName;
  const presetLabel = REASON_PRESETS.find((p) => p.value === reasonPreset)?.label || '';
  const detailTrimmed = reasonDetail.trim();
  const canConfirmReason = Boolean(reasonPreset) && (
    reasonPreset !== 'other' ? true : detailTrimmed.length > 0
  );

  const buildReasonText = () => {
    if (reasonPreset === 'other') return detailTrimmed;
    if (detailTrimmed) return `${presetLabel} — ${detailTrimmed}`;
    return presetLabel;
  };

  const handleClose = () => {
    panels.reset();
    onClose?.();
  };

  const handleConfirm = () => {
    if (!canConfirmReason) return;
    onConfirm?.({ name: selectedName, reason: buildReasonText() });
    handleClose();
  };

  return (
    <Popup
      open={open}
      onClose={handleClose}
      onBack={isReason ? () => panels.goBack('pick') : undefined}
      size='large'
      title={isReason ? 'ระบุเหตุผลการเปลี่ยนยา' : title}
      subtitle={
        isReason
          ? 'ต้องระบุเหตุผลก่อนยืนยันการเปลี่ยนยา'
          : (currentName ? `${subtitle} · ยาปัจจุบัน: ${currentName}` : subtitle)
      }
      secondaryAction={
        isReason
          ? { label: 'ย้อนกลับ', onClick: () => panels.goBack('pick') }
          : { label: 'ยกเลิก', onClick: handleClose }
      }
      primaryAction={
        isReason
          ? {
              label: 'ยืนยันเปลี่ยนยา',
              onClick: handleConfirm,
              disabled: !canConfirmReason,
            }
          : {
              label: 'ถัดไป: ระบุเหตุผล',
              onClick: () => {
                if (!canGoReason) return;
                panels.goTo('reason');
              },
              disabled: !canGoReason,
            }
      }
      bodyStyle={{ gap: 'var(--dim-space-400)', display: 'flex', flexDirection: 'column', minHeight: 0 }}
    >
      {isReason ? (
        <div
          key='reason'
          data-direction={panels.direction}
          className='mih-step-content flex flex-col w-full min-w-0'
          style={{ gap: 'var(--dim-space-400)' }}
        >
          <SwapSummary fromName={currentName} toName={selectedName} />
          <Select
            label='เหตุผล'
            required
            searchable={false}
            value={reasonPreset}
            onChange={setReasonPreset}
            options={REASON_PRESETS}
            placeholder='เลือกเหตุผลการเปลี่ยนยา'
          />
          <Textarea
            label={reasonPreset === 'other' ? 'รายละเอียดเหตุผล' : 'รายละเอียดเพิ่มเติม (ถ้ามี)'}
            required={reasonPreset === 'other'}
            value={reasonDetail}
            onChange={setReasonDetail}
            placeholder={
              reasonPreset === 'other'
                ? 'ระบุเหตุผลการเปลี่ยนยา'
                : 'เช่น ชื่อยาทดแทนที่แพทย์แนะนำ / หมายเหตุถึงเภสัชกร'
            }
            rows={3}
            minHeight={96}
          />
        </div>
      ) : (
        <div
          key='pick'
          data-direction={panels.direction}
          className='mih-step-content flex flex-col w-full min-w-0'
          style={{ gap: 'var(--dim-space-400)' }}
        >
          <PrimarySearch
            value={query}
            onChange={setQuery}
            placeholder='ค้นหาชื่อยา / ชื่อสามัญ'
            width='100%'
            suggestions={[]}
            history={[]}
            historyEmptyMessage={null}
            emptyMessage={null}
            scrollOffsetTop={null}
          />

          <div
            role='listbox'
            aria-label='รายการยาที่เลือกได้'
            className='flex flex-col w-full overflow-y-auto'
            style={{
              gap: 'var(--dim-space-200)',
              maxHeight: 'min(420px, 50vh)',
              paddingRight: 'var(--dim-space-100)',
            }}
          >
            {filtered.length === 0 ? (
              <span
                style={{
                  color: 'var(--text-content-tertiary)',
                  fontSize: 'var(--type-size-sm)',
                  fontFamily: 'var(--type-family-body)',
                  padding: 'var(--dim-space-400)',
                }}
              >
                ไม่พบรายการยาที่ตรงกับคำค้น
              </span>
            ) : (
              filtered.map((drug) => {
                const inFormulary = drug.classification === 'nlem';
                const pressed = selectedName === drug.name;
                const isCurrent = drug.name === currentName;
                return (
                  <button
                    key={drug.id || drug.name}
                    type='button'
                    role='option'
                    aria-selected={pressed}
                    aria-pressed={pressed}
                    className='mih-pharmacy-change-drug-row flex items-center w-full text-left'
                    onClick={() => setSelectedName(drug.name)}
                    style={{
                      gap: 'var(--dim-space-300)',
                      padding: 'var(--dim-space-300)',
                      background: 'var(--surface-card-quaternary, #F9FBFB)',
                      border: 'var(--dim-stroke-100) solid transparent',
                      borderRadius: 'var(--dim-radius-300)',
                      cursor: 'pointer',
                      boxSizing: 'border-box',
                    }}
                  >
                    <DrugImageTile src={resolveMedicationImage(drug.name)} alt={drug.name} />
                    <span
                      className='flex-1 min-w-0'
                      style={{
                        fontFamily: 'var(--type-family-body)',
                        fontSize: 'var(--type-size-sm)',
                        fontWeight: 'var(--type-weight-medium)',
                        color: 'var(--text-content-default)',
                        lineHeight: 1.4,
                      }}
                    >
                      {drug.name}
                    </span>
                    <div className='flex items-center shrink-0' style={{ gap: 'var(--dim-space-100)' }}>
                      {isCurrent && (
                        <Badge style='neutral' size='small'>ยาปัจจุบัน</Badge>
                      )}
                      <FormularyStatusBadge inFormulary={inFormulary} />
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </Popup>
  );
};

export default PharmacyChangeDrugPopup;
