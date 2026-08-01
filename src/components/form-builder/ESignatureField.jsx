import React, { useMemo, useRef, useState } from 'react';
import Icon from '@/components/icons/Icon';
import Signature from '@/components/form-builder/Signature';

/* e-Signature 3 ช่องทาง — TOR 1.8.4.1–1.8.4.2:
   ผู้ลงนามเลือกได้ว่าจะ (1) เลือกลายเซ็นที่บันทึกไว้ (2) วาดลายเซ็นใหม่ด้วย
   canvas เดิม (Signature) หรือ (3) อัปโหลดรูปลายเซ็น. ทุกช่องทางจบที่
   onChange(dataUrl) เดียวกัน ผู้เรียกใช้ไม่ต้องรู้ว่าลายเซ็นมาจากช่องทางไหน.

   ยังไม่มี component นี้ใน MIH Design System — ลงทะเบียนใน
   docs/awaiting-components.md (รอเคสผู้ใช้ที่ 2 เพื่อยกขึ้น DS). */

const TABS = [
  { key: 'saved',  label: 'เลือกลายเซ็นที่บันทึก', icon: 'history_edu' },
  { key: 'draw',   label: 'วาดใหม่',               icon: 'stylus_note' },
  { key: 'upload', label: 'อัปโหลดรูป',            icon: 'upload_file' },
];

/* ลายเซ็นที่บันทึกไว้ของผู้ใช้ (mock) — วาดเป็นเส้นโค้ง SVG deterministic
   แทนรูปจริง เพื่อให้ preview อ่านออกว่าเป็นลายเซ็น. */
const SAVED_SIGNATURES = [
  { id: 'sig-1', label: 'ลายเซ็นหลัก',   savedAt: '12 มีนาคม 2569', seed: 3 },
  { id: 'sig-2', label: 'ลายเซ็นย่อ',    savedAt: '28 มกราคม 2569', seed: 7 },
];

const savedSigPath = (seed) => {
  const pts = Array.from({ length: 7 }, (_, i) => {
    const x = 12 + i * 20;
    const y = 26 + Math.sin((i + seed) * 1.7) * 12;
    return `${x},${y.toFixed(1)}`;
  });
  return `M${pts[0]} C ${pts.slice(1).join(' ')}`;
};

const savedSigDataUrl = (seed) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="152" height="52" viewBox="0 0 152 52"><path d="${savedSigPath(seed)}" fill="none" stroke="#0E7C66" stroke-width="2" stroke-linecap="round"/></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

const SavedSigCard = ({ sig, selected, onClick }) => (
  <button
    type='button'
    onClick={onClick}
    aria-pressed={selected}
    className='flex flex-col items-stretch text-left'
    style={{
      flex: '1 1 180px',
      minWidth: 0,
      gap: 'var(--dim-space-150)',
      padding: 'var(--dim-space-300)',
      background: selected ? 'var(--surface-formbuilder-default, #F4FBF8)' : 'var(--surface-card-100)',
      border: selected
        ? 'var(--dim-stroke-150) solid var(--border-brandPrimary-default)'
        : 'var(--dim-stroke-100) solid var(--border-card-default)',
      borderRadius: 'var(--dim-radius-200)',
      cursor: 'pointer',
    }}
  >
    <span
      className='flex items-center justify-center w-full'
      style={{
        height: 52,
        background: 'var(--surface-card-100)',
        border: 'var(--dim-stroke-100) dashed var(--border-formbuilder-default, #C5EDDA)',
        borderRadius: 'var(--dim-radius-150)',
        overflow: 'hidden',
      }}
    >
      <svg width='152' height='52' viewBox='0 0 152 52' aria-hidden>
        <path d={savedSigPath(sig.seed)} fill='none' stroke='var(--text-brandPrimary-default)' strokeWidth='2' strokeLinecap='round' />
      </svg>
    </span>
    <span className='flex items-center' style={{ gap: 'var(--dim-space-150)' }}>
      {selected && <Icon name='check_circle' size={16} color='var(--text-brandPrimary-default)' />}
      <span className='flex flex-col min-w-0'>
        <span className='truncate' style={{ color: 'var(--text-content-default)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)', fontWeight: 'var(--type-weight-medium)' }}>
          {sig.label}
        </span>
        <span className='truncate' style={{ color: 'var(--text-content-tertiary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)' }}>
          บันทึกเมื่อ {sig.savedAt}
        </span>
      </span>
    </span>
  </button>
);

/**
 * @param {string}   value       — data URL ของลายเซ็นปัจจุบัน ('' = ยังไม่ลงนาม)
 * @param {Function} onChange    — (dataUrl) ทุกช่องทางเรียกอันเดียวกัน
 * @param {string}   signerName  — ชื่อผู้ลงนาม ส่งต่อให้ canvas
 * @param {number}   height      — ความสูง canvas วาดใหม่
 */
export default function ESignatureField({ value = '', onChange, signerName, height = 120 }) {
  const [tab, setTab] = useState('saved');
  const [savedId, setSavedId] = useState(null);
  const [uploadName, setUploadName] = useState('');
  const fileRef = useRef(null);

  const pickSaved = (sig) => {
    setSavedId(sig.id);
    onChange?.(savedSigDataUrl(sig.seed));
  };

  const onUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setUploadName(file.name);
      onChange?.(String(reader.result));
    };
    reader.readAsDataURL(file);
  };

  const clearAll = () => {
    setSavedId(null);
    setUploadName('');
    if (fileRef.current) fileRef.current.value = '';
    onChange?.('');
  };

  const tabStyle = (active) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: 'var(--dim-space-100)',
    padding: 'var(--dim-space-150) var(--dim-space-300)',
    background: active ? 'var(--surface-brandPrimary-quaternary)' : 'transparent',
    color: active ? 'var(--text-brandPrimary-default)' : 'var(--text-content-secondary)',
    border: active
      ? 'var(--dim-stroke-100) solid var(--border-brandPrimary-tertiary, #9ADBBF)'
      : 'var(--dim-stroke-100) solid var(--border-card-default)',
    borderRadius: 'var(--dim-radius-full)',
    fontFamily: 'var(--type-family-body)',
    fontSize: 'var(--type-size-sm)',
    fontWeight: active ? 'var(--type-weight-medium)' : 'var(--type-weight-regular)',
    cursor: 'pointer',
  });

  const uploadedPreview = useMemo(
    () => (tab === 'upload' && value ? value : null),
    [tab, value],
  );

  return (
    <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
      <div className='flex items-center flex-wrap' role='tablist' aria-label='ช่องทางลายเซ็นอิเล็กทรอนิกส์' style={{ gap: 'var(--dim-space-200)' }}>
        {TABS.map((t) => (
          <button key={t.key} type='button' role='tab' aria-selected={tab === t.key} style={tabStyle(tab === t.key)} onClick={() => setTab(t.key)}>
            <Icon name={t.icon} size={16} />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'saved' && (
        <div className='flex flex-wrap w-full' style={{ gap: 'var(--dim-space-300)' }}>
          {SAVED_SIGNATURES.map((sig) => (
            <SavedSigCard key={sig.id} sig={sig} selected={savedId === sig.id} onClick={() => pickSaved(sig)} />
          ))}
        </div>
      )}

      {tab === 'draw' && (
        <Signature
          value={tab === 'draw' ? value : ''}
          onChange={(dataUrl) => { setSavedId(null); setUploadName(''); onChange?.(dataUrl); }}
          height={height}
          width='100%'
          signerName={signerName}
        />
      )}

      {tab === 'upload' && (
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200)' }}>
          <input ref={fileRef} type='file' accept='image/*' onChange={onUpload} className='sr-only' id='mih-esign-upload' />
          {uploadedPreview ? (
            <div
              className='flex flex-col items-center w-full'
              style={{
                gap: 'var(--dim-space-200)',
                padding: 'var(--dim-space-400)',
                border: 'var(--dim-stroke-100) solid var(--border-formbuilder-filled, #08A768)',
                background: 'var(--surface-formbuilder-default, #F4FBF8)',
                borderRadius: 'var(--dim-radius-200)',
              }}
            >
              <img src={uploadedPreview} alt={`ลายเซ็นที่อัปโหลด: ${uploadName}`} style={{ maxHeight: 90, maxWidth: '100%', objectFit: 'contain' }} />
              <span style={{ color: 'var(--text-content-tertiary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)' }}>{uploadName}</span>
            </div>
          ) : (
            <label
              htmlFor='mih-esign-upload'
              className='flex flex-col items-center justify-center w-full'
              style={{
                minHeight: 96,
                gap: 'var(--dim-space-150)',
                border: 'var(--dim-stroke-150) dashed var(--border-formbuilder-default, #C5EDDA)',
                background: 'var(--surface-formbuilder-default, #F4FBF8)',
                borderRadius: 'var(--dim-radius-200)',
                color: 'var(--text-formbuilder-subtext, #858C92)',
                cursor: 'pointer',
              }}
            >
              <Icon name='upload_file' size={20} />
              <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', fontWeight: 'var(--type-weight-medium)' }}>
                เลือกรูปลายเซ็นจากเครื่อง (PNG / JPG)
              </span>
            </label>
          )}
        </div>
      )}

      {value ? (
        <div className='flex items-center' style={{ gap: 'var(--dim-space-200)' }}>
          <Icon name='check_circle' size={16} color='var(--text-brandPrimary-default)' />
          <span style={{ flex: 1, color: 'var(--text-content-default)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)' }}>
            ลงลายเซ็นอิเล็กทรอนิกส์แล้ว
          </span>
          <button
            type='button'
            onClick={clearAll}
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer', padding: 0,
              color: 'var(--text-content-secondary)', fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-xs)', textDecoration: 'underline', textUnderlineOffset: 2,
            }}
          >
            ล้างลายเซ็น
          </button>
        </div>
      ) : null}
    </div>
  );
}
