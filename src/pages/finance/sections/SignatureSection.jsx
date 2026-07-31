import React, { useState } from 'react';
import Table, { EllipsisText } from '@/components/table/Table';
import Signature from '@/components/form-builder/Signature';
import InputField from '@/components/forms/InputField';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import StatusBadge from '@/components/badge/StatusBadge';
import Popup from '@/components/popup/Popup';
import { Icon } from '@/components/icons/Icon';

/* ตรวจสอบใบเสร็จ - Signature — TOR §1.5.4. Attaches a signature to a
   receipt via one of three sources (matches the TOR's three buttons):
   pick a previously-saved signature, draw a new one, or upload an
   image — then records it on the row.

   Scope note: "saved signatures" are mocked as a small staff directory
   whose signature image is generated on the fly (inline SVG data URI of
   the name in a script font) — there's no real signature-image store in
   this prototype. */

const SAVED_SIGNERS = ['จนท.การเงิน สมศรี', 'นพ.สมชาย ใจดี', 'จนท.ทะเบียน สมหญิง', 'หัวหน้าเจ้าหน้าที่การเงิน มาลี'];

const makeTextSignatureDataUrl = (name) => {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='320' height='100'><text x='12' y='60' font-family='Brush Script MT, cursive' font-style='italic' font-size='30' fill='#1F3D33'>${name}</text></svg>`;
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
};

const MODES = [
  { key: 'saved', label: 'เลือกลายเซ็นที่บันทึกไว้', icon: 'folder_open' },
  { key: 'draw', label: 'สร้างลายเซ็น', icon: 'draw' },
  { key: 'upload', label: 'อัปโหลดรูป', icon: 'upload' },
];

const SignForm = ({ row, onCancel, onConfirm }) => {
  const [mode, setMode] = useState('saved');
  const [q, setQ] = useState('');
  const [dataUrl, setDataUrl] = useState(row.signature?.dataUrl || null);
  const [signerName, setSignerName] = useState(row.signature?.signerName || '');

  const matches = SAVED_SIGNERS.filter((n) => n.toLowerCase().includes(q.trim().toLowerCase()));

  const handleUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setDataUrl(reader.result);
    reader.readAsDataURL(file);
  };

  const canConfirm = !!dataUrl && signerName.trim().length > 0;

  return (
    <div className='flex flex-col' style={{ gap: 'var(--dim-space-400)' }}>
      <div className='flex items-center' style={{ gap: 'var(--dim-space-200)' }}>
        {MODES.map((m) => (
          <NeutralSubdueButton
            key={m.key}
            size='sm'
            variant={mode === m.key ? 'fill' : 'outline'}
            onClick={() => { setMode(m.key); if (m.key !== 'saved') setDataUrl(m.key === 'draw' ? null : dataUrl); }}
          >
            {m.label}
          </NeutralSubdueButton>
        ))}
      </div>

      {mode === 'saved' && (
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-200)' }}>
          <InputField label='ค้นหาชื่อ - นามสกุล' value={q} onChange={setQ} placeholder='พิมพ์ชื่อผู้เซ็น' />
          <div className='flex flex-col' style={{ gap: 'var(--dim-space-100)' }}>
            {matches.map((name) => (
              <button
                key={name}
                type='button'
                onClick={() => { setSignerName(name); setDataUrl(makeTextSignatureDataUrl(name)); }}
                className='flex items-center justify-between'
                style={{
                  padding: 'var(--dim-space-200) var(--dim-space-300)',
                  borderRadius: 'var(--dim-radius-200)',
                  background: signerName === name ? 'var(--surface-brandPrimary-quaternary, #F4FBF8)' : 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'var(--type-family-body)',
                  fontSize: 'var(--type-size-sm)',
                  textAlign: 'left',
                }}
              >
                {name}
                {signerName === name && <Icon name='check' size={16} />}
              </button>
            ))}
          </div>
        </div>
      )}

      {mode === 'draw' && (
        <Signature
          value={dataUrl}
          onChange={setDataUrl}
          showFooter={false}
          height={120}
        />
      )}

      {mode === 'upload' && (
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-200)' }}>
          <input type='file' accept='image/*' onChange={handleUpload} />
          {dataUrl && <img src={dataUrl} alt='ลายเซ็นที่อัปโหลด' style={{ maxHeight: 120, objectFit: 'contain' }} />}
        </div>
      )}

      <InputField label='ชื่อ - นามสกุลผู้เซ็น' value={signerName} onChange={setSignerName} placeholder='ชื่อ-นามสกุล' />

      <div className='flex items-center justify-end' style={{ gap: 'var(--dim-space-200)' }}>
        <NeutralSubdueButton size='sm' onClick={onCancel}>ยกเลิก</NeutralSubdueButton>
        <BrandSubdueButton
          size='sm'
          disabled={!canConfirm}
          onClick={() => onConfirm({ dataUrl, signerName: signerName.trim() })}
        >
          ยืนยันลายเซ็น
        </BrandSubdueButton>
      </div>
    </div>
  );
};

const SignatureSection = ({ queue, onSign }) => {
  const [activeRow, setActiveRow] = useState(null);
  const [viewRow, setViewRow] = useState(null);

  const columns = [
    { key: 'queueNo', label: 'คิว', width: 80 },
    {
      key: 'patient', label: 'ผู้ป่วย', flex: true, minWidth: 200,
      render: (row) => (
        <div className='flex flex-col min-w-0'>
          <EllipsisText text={row.patient.shortName} />
          <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>HN {row.hn}</span>
        </div>
      ),
    },
    { key: 'receiptNo', label: 'เลขที่ใบเสร็จ', width: 140, render: (row) => row.receiptNo || '-' },
    {
      key: 'signature', label: 'สถานะลายเซ็น', width: 160,
      render: (row) => (row.signature
        ? <StatusBadge style='success' size='small'>เซ็นแล้ว</StatusBadge>
        : <StatusBadge style='warning' size='small'>ยังไม่เซ็น</StatusBadge>),
    },
    {
      key: 'action', label: '', width: 220,
      render: (row) => (
        <div className='flex items-center' style={{ gap: 'var(--dim-space-150)' }}>
          {row.signature && <NeutralSubdueButton size='sm' onClick={(e) => { e.stopPropagation(); setViewRow(row); }}>ดูลายเซ็น</NeutralSubdueButton>}
          <BrandSubdueButton size='sm' onClick={(e) => { e.stopPropagation(); setActiveRow(row); }}>
            {row.signature ? 'เซ็นใหม่' : 'เพิ่มลายเซ็น'}
          </BrandSubdueButton>
        </div>
      ),
    },
  ];

  return (
    <div className='flex flex-col' style={{ gap: 'var(--dim-space-400)' }}>
      <Table columns={columns} rows={queue} rowKey={(row) => row.id} emptyMessage='ไม่มีรายการ' />

      {activeRow && (
        <Popup
          open
          onClose={() => setActiveRow(null)}
          size='medium'
          title='บันทึกลายเซ็นใบเสร็จ'
          subtitle={`${activeRow.patient.shortName} · HN ${activeRow.hn} · คิว ${activeRow.queueNo}`}
        >
          <SignForm
            row={activeRow}
            onCancel={() => setActiveRow(null)}
            onConfirm={(signature) => {
              onSign(activeRow.id, signature);
              setActiveRow(null);
            }}
          />
        </Popup>
      )}

      {viewRow && (
        <Popup
          open
          onClose={() => setViewRow(null)}
          size='medium'
          title='ลายเซ็นใบเสร็จ'
          subtitle={`${viewRow.patient.shortName} · เซ็นโดย ${viewRow.signature.signerName}`}
          secondaryAction={{ label: 'ปิด', onClick: () => setViewRow(null) }}
        >
          <img src={viewRow.signature.dataUrl} alt={`ลายเซ็นของ ${viewRow.signature.signerName}`} style={{ maxHeight: 160, objectFit: 'contain' }} />
        </Popup>
      )}
    </div>
  );
};

export default SignatureSection;
