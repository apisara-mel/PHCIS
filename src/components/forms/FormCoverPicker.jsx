import React, { useRef, useState } from 'react';
import Icon from '@/components/icons/Icon';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import NeutralSubdueIconButton from '@/components/button/NeutralSubdueIconButton';
import AlertDialog from '@/components/popup/AlertDialog';
import OfficialFormCover from '@/components/consent/OfficialFormCover';

/* ตัวเลือกหน้าปกแบบฟอร์ม — แบบเดียวกับขั้นตอน "เลือกหน้าปกแบบฟอร์ม" ของ
   การสร้างใบยินยอม (มติผู้ใช้ 30 ส.ค. 69) : ช่องอัปโหลดเส้นประ + หน้าปกราชการ
   ตราสำนักอนามัย + รูปที่อัปโหลดเอง (เปลี่ยน/ลบได้ทีละใบ)

   เดิมหน้าสร้างเอกสาร e-document ใช้ dropzone ของ form-builder ซึ่งเป็นแค่
   ที่แนบไฟล์ ไม่ได้ให้เลือกว่าจะใช้ปกไหน และไม่มีหน้าปกราชการเป็นค่าเริ่มต้น */

const CARD_BASIS = '0 0 max(calc((100% - 4 * var(--dim-space-300)) / 5), var(--dim-size-2100, 160px))';

export const OFFICIAL_COVER_KEY = 'official';

/* ── การ์ดหน้าปกหนึ่งใบ ─────────────────────────────────────────────── */
const CoverCard = ({ cover, selected, onClick, style, onRemove, onReplace }) => {
  const [hovered, setHovered] = useState(false);
  const replaceInputRef = useRef(null);

  const card = (
    <button
      type='button'
      onClick={onClick}
      aria-label={`เลือก${cover.label}`}
      aria-pressed={selected}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className='relative min-w-0 overflow-hidden'
      style={{
        flex: '1 0 0',
        aspectRatio: '227 / 113',
        padding: 0,
        border: 'none',
        borderRadius: 'var(--dim-radius-400)',
        background: 'var(--surface-card-100)',
        /* ขอบวาดด้วย inset shadow เหมือนวงแหวนตอนถูกเลือก จึงไม่ดันเลย์เอาต์ */
        boxShadow: [
          'inset 0 0 0 var(--dim-stroke-100, 1px) var(--border-card-default)',
          hovered && !selected ? 'var(--shadow-card)' : '',
        ].filter(Boolean).join(', '),
        outline: 'none',
        cursor: 'pointer',
        transition: 'box-shadow 0.18s ease',
        ...(style || {}),
      }}
    >
      {cover.official ? (
        <OfficialFormCover compact />
      ) : (
        <img
          src={cover.image}
          alt={cover.label}
          draggable={false}
          className='block w-full h-full'
          style={{ objectFit: 'cover', borderRadius: 'inherit' }}
        />
      )}
      {selected && (
        <span
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 1,
            borderRadius: 'inherit',
            boxShadow: 'inset 0 0 0 var(--dim-stroke-200, 2px) var(--border-brandPrimary-default, #007549)',
            pointerEvents: 'none',
          }}
        />
      )}
    </button>
  );

  if (!onRemove && !onReplace) return card;

  /* ปุ่มลบ/เปลี่ยนรูปต้องอยู่นอก <button> ของการ์ด — ปุ่มซ้อนปุ่มเป็น DOM ที่
     ไม่ถูกต้อง และคลิกจะทะลุไปเลือกการ์ดแทน */
  const overlayWrap = {
    background: 'var(--surface-card-100)',
    borderRadius: 'var(--dim-radius-200, 8px)',
    lineHeight: 0,
  };

  return (
    <span
      className='relative min-w-0 inline-flex'
      style={{ flex: '1 0 0', ...(style || {}) }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {React.cloneElement(card, { style: { ...card.props.style, flex: '1 0 0', width: '100%' } })}
      <span
        className='absolute inline-flex items-center'
        style={{ top: 'var(--dim-space-200, 8px)', right: 'var(--dim-space-200, 8px)', gap: 'var(--dim-space-150, 6px)', zIndex: 2 }}
      >
        {onReplace ? (
          <span className='inline-flex' style={overlayWrap}>
            {/* input ซ่อนไว้แล้วสั่ง .click() เอง — ห่อปุ่มใน <label> ไม่ได้
                เพราะคลิก <button> ข้างในไม่ activate label */}
            <input
              ref={replaceInputRef}
              type='file'
              accept='image/*'
              className='hidden'
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (file) onReplace(file);
              }}
            />
            <NeutralSubdueIconButton
              icon='edit'
              variant='outline'
              size='sm'
              onClick={() => replaceInputRef.current?.click()}
              aria-label={`เปลี่ยน${cover.label}`}
              title='เปลี่ยนรูปนี้'
            />
          </span>
        ) : null}
        {onRemove ? (
          <span className='inline-flex' style={overlayWrap}>
            <NeutralSubdueIconButton
              icon='close'
              variant='outline'
              size='sm'
              onClick={onRemove}
              aria-label={`ลบ${cover.label}`}
              title='ลบรูปที่อัปโหลด'
            />
          </span>
        ) : null}
      </span>
    </span>
  );
};

/* ── ช่องอัปโหลดเส้นประ (Figma "Photo" 3420:2565) ───────────────────── */
const UploadDropzone = ({ onFile, style }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <label
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className='min-w-0 flex flex-col items-center justify-center'
      style={{
        flex: '1 0 0',
        aspectRatio: '227 / 113',
        border: `var(--dim-stroke-150) dashed ${hovered ? 'var(--border-formbuilder-hover, #08A768)' : 'var(--border-formbuilder-default, #c5edda)'}`,
        background: 'var(--surface-formbuilder-default, #f4fbf8)',
        borderRadius: 'var(--dim-radius-200)',
        gap: 'var(--dim-space-200)',
        padding: 'var(--dim-space-600)',
        color: 'var(--text-formbuilder-text, #007549)',
        cursor: 'pointer',
        transition: 'border-color 0.18s ease',
        ...(style || {}),
      }}
    >
      <input
        type='file'
        accept='image/*'
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files && e.target.files[0];
          if (file && onFile) onFile(file);
          e.target.value = '';
        }}
      />
      <Icon name='add_photo_alternate' size={20} />
      <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', fontWeight: 'var(--type-weight-medium)', textAlign: 'center' }}>
        เพิ่มรูปจากคอมพิวเตอร์
      </span>
    </label>
  );
};

/**
 * @param {string}   value          คีย์หน้าปกที่เลือกอยู่ ('official' หรือ 'custom-N')
 * @param {Function} onChange       (key) => void
 * @param {Function} onFilesChange  (files: File[]) => void — รายการไฟล์ที่อัปโหลดไว้ (ไว้บันทึกลงร่าง)
 */
export default function FormCoverPicker({
  value = OFFICIAL_COVER_KEY,
  onChange,
  onFilesChange,
  title = 'เลือกหน้าปกแบบฟอร์ม',
  subtext = 'หน้าปกราชการเป็นค่าเริ่มต้น หรืออัปโหลดรูปของหน่วยงานเองก็ได้',
}) {
  const [customCovers, setCustomCovers] = useState([]);
  const [confirmRemove, setConfirmRemove] = useState(null);
  const coverSeq = useRef(0);

  const emitFiles = (list) => {
    if (onFilesChange) onFilesChange(list.map((c) => c.file).filter(Boolean));
  };

  const select = (key) => { if (onChange) onChange(key); };

  const handleUpload = (file) => {
    coverSeq.current += 1;
    const key = `custom-${coverSeq.current}`;
    const next = [...customCovers, { key, url: URL.createObjectURL(file), name: file.name, file }];
    setCustomCovers(next);
    emitFiles(next);
    select(key);
  };

  /* เปลี่ยนรูปเฉพาะใบนั้น — คืน objectURL เดิมทิ้งไม่ให้ค้างในหน่วยความจำ */
  const handleReplace = (key, file) => {
    const next = customCovers.map((c) => {
      if (c.key !== key) return c;
      URL.revokeObjectURL(c.url);
      return { ...c, url: URL.createObjectURL(file), name: file.name, file };
    });
    setCustomCovers(next);
    emitFiles(next);
    select(key);
  };

  const handleRemove = () => {
    const key = confirmRemove;
    const next = customCovers.filter((c) => {
      if (c.key !== key) return true;
      URL.revokeObjectURL(c.url);
      return false;
    });
    setCustomCovers(next);
    emitFiles(next);
    /* ถ้ากำลังเลือกรูปที่ลบอยู่ ต้องถอยกลับไปหน้าปกราชการ */
    if (value === key) select(OFFICIAL_COVER_KEY);
    setConfirmRemove(null);
  };

  const coverCount = 1 + customCovers.length;

  return (
    <>
      <div className='flex items-start w-full' style={{ gap: 'var(--dim-space-300)' }}>
        <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-050)' }}>
          <h2
            style={{
              color: 'var(--text-brandPrimary-default)',
              fontFamily: 'var(--type-family-heading-graphic2)',
              fontSize: 'var(--type-size-base)',
              fontWeight: 'var(--type-weight-regular, 400)',
              lineHeight: 1.4,
            }}
          >
            {title}
          </h2>
          {subtext && (
            <span
              style={{
                color: 'var(--text-content-quaternary, #ADB2B7)',
                fontFamily: 'var(--type-family-body)',
                fontSize: 'var(--type-size-xs)',
                fontWeight: 'var(--type-weight-medium)',
              }}
            >
              {subtext}
            </span>
          )}
        </div>
        <div className='flex-1' />
        <ColorfulBadge style='green' size='small' hierarchy='secondary' width='hug'>
          {`${coverCount} หน้าปก`}
        </ColorfulBadge>
      </div>

      <div className='flex flex-wrap w-full min-w-0' style={{ gap: 'var(--dim-space-300)' }}>
        <UploadDropzone onFile={handleUpload} style={{ flex: CARD_BASIS }} />
        {/* หน้าปกราชการมาก่อน — เป็นตัวเลือกที่ถูกต้องสำหรับเอกสารที่ออกในนาม
            สำนักอนามัย */}
        <CoverCard
          cover={{ key: OFFICIAL_COVER_KEY, label: 'หน้าปกราชการ (ตราสำนักอนามัย)', official: true }}
          selected={value === OFFICIAL_COVER_KEY}
          onClick={() => select(OFFICIAL_COVER_KEY)}
          style={{ flex: CARD_BASIS }}
        />
        {customCovers.map((c, i) => (
          <CoverCard
            key={c.key}
            cover={{ key: c.key, label: c.name || `รูปที่อัปโหลด ${i + 1}`, image: c.url }}
            selected={value === c.key}
            onClick={() => select(c.key)}
            onReplace={(file) => handleReplace(c.key, file)}
            onRemove={() => setConfirmRemove(c.key)}
            style={{ flex: CARD_BASIS }}
          />
        ))}
      </div>

      <AlertDialog
        open={!!confirmRemove}
        type='warning'
        title='ลบรูปหน้าปกที่อัปโหลด?'
        description='รูปนี้จะถูกลบออกจากตัวเลือกหน้าปก และแบบฟอร์มจะกลับไปใช้หน้าปกราชการ'
        confirmLabel='ลบรูป'
        cancelLabel='ยกเลิก'
        onConfirm={handleRemove}
        onCancel={() => setConfirmRemove(null)}
        onClose={() => setConfirmRemove(null)}
      />
    </>
  );
}
