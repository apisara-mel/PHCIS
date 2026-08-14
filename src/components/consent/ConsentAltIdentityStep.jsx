import React from 'react';
import RadioButton from '@/components/radio/RadioButton';
import BrandButton from '@/components/button/BrandButton';
import DragAndDrop from '@/components/form-builder/DragAndDrop';
import PhotoUploadField from '@/components/forms/PhotoUploadField';
import Icon from '@/components/icons/Icon';

/* ยืนยันตัวตนกรณี "ไม่ได้นำบัตรประชาชนมา" — ต่อจากขั้นเสียบบัตร (ด.1.1.1)

   ขั้นตอนตามที่ user กำหนด (14 ส.ค. 2569):
     1. เลือกชนิดเอกสาร — ใบขับขี่ / หนังสือเดินทาง
     2. อัปโหลดไฟล์เอกสาร หรือถ่ายภาพจากกล้อง (ชุดเดียวกับสแกนแบบฟอร์มขอสิทธิ์
        ใน AccessRequestForm: DragAndDrop + PhotoUploadField + CameraCapturePopup)
     3. เจ้าหน้าที่ตรวจว่าข้อมูลตรงกับทะเบียน แล้วติ๊ก "ข้อมูลตรงกัน"
   ครบทั้งสามข้อจึงกด "ยืนยันตัวตน" ได้ — เก็บเป็น audit ของใบยินยอมฉบับนั้น

   ผู้ที่ "ไม่มีบัตรประชาชน / บุคคลต่างด้าว" ใช้สแกนลายนิ้วมือแทน
   (`ConsentFingerprintScanStep`) เพราะไม่มีเลข 13 หลักให้เทียบ */

export const ALT_IDENTITY_DOC_TYPES = [
  { value: 'driver-license', label: 'ใบขับขี่' },
  { value: 'passport', label: 'หนังสือเดินทาง (Passport)' },
];

export const ALT_IDENTITY_CASE_LABEL = {
  forgot: 'ไม่ได้นำบัตรประชาชนมา',
  none: 'ไม่มีบัตรประชาชน',
};

const FIELD_LABEL = {
  color: 'var(--text-content-default)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm)',
  fontWeight: 'var(--type-weight-medium)',
  lineHeight: 1.5,
};
const REQUIRED = { color: 'var(--text-danger-default, #B91C1C)' };

const ConsentAltIdentityStep = ({
  docType,
  onDocTypeChange,
  fileName,
  onFilePick,
  onOpenCamera,
  onClearFile,
  fileError,
  matched,
  onConfirmMatch,
}) => (
  /* รองพื้นเขียวอ่อนชุดเดียวกับกล่องเสียบบัตร/สแกนลายนิ้วมือ — สามแท็บ
     อ่านเป็นพื้นที่ "ยืนยันตัวตน" เดียวกัน */
  <div
    className='flex flex-col w-full flex-1'
    style={{
      gap: 'var(--dim-space-500)',
      padding: 'var(--dim-space-600, 24px)',
      background: 'var(--surface-brandPrimary-quaternary, #F4FBF8)',
      borderRadius: 'var(--dim-radius-300)',
    }}
  >
    <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
      <span style={FIELD_LABEL}>เอกสารที่ใช้แทนบัตรประชาชน <span style={REQUIRED}>*</span></span>
      <div className='flex flex-wrap items-center w-full' style={{ gap: 'var(--dim-space-200)' }}>
        {ALT_IDENTITY_DOC_TYPES.map((o) => (
          <RadioButton
            key={o.value}
            name='alt-identity-doc-type'
            value={o.value}
            title={o.label}
            checked={docType === o.value}
            onChange={() => onDocTypeChange?.(o.value)}
            border
            showRadio
            showCircleIcon={false}
            showIcon={false}
            showDescription={false}
            showBadge={false}
            showBadgeTitle={false}
            style={{
              minHeight: 48,
              paddingTop: 'var(--dim-space-200)',
              paddingBottom: 'var(--dim-space-200)',
              paddingLeft: 'var(--dim-space-400)',
              paddingRight: 'var(--dim-space-400)',
            }}
          />
        ))}
      </div>
    </div>

    <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
      <span style={FIELD_LABEL}>อัปโหลดหรือถ่ายภาพเอกสาร <span style={REQUIRED}>*</span></span>
      {fileName ? (
        <div
          className='flex items-center w-full min-w-0'
          style={{
            gap: 'var(--dim-space-300)',
            padding: 'var(--dim-space-400, 16px)',
            border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-tertiary, #C5EDDA)',
            background: 'var(--surface-brandPrimary-quaternary, #F4FBF8)',
            borderRadius: 'var(--dim-radius-300)',
          }}
        >
          <Icon name='description' size={20} color='var(--icon-brandPrimary-default, #007549)' />
          <span className='flex-1 truncate' style={{
            color: 'var(--text-content-default)',
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-sm)',
          }}>
            {fileName}
          </span>
          <button
            type='button'
            onClick={onClearFile}
            aria-label='ลบไฟล์ที่อัปโหลด'
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--icon-content-tertiary, #7A7F83)',
            }}
          >
            <Icon name='close' size={18} color='currentColor' />
          </button>
        </div>
      ) : (
        <div className='flex items-stretch w-full min-w-0' style={{ gap: 'var(--dim-space-400, 16px)' }}>
          <DragAndDrop
            value={[]}
            onChange={onFilePick}
            accept='.pdf,.jpg,.jpeg,.png,image/jpeg,image/png,application/pdf'
            multiple={false}
            preview={false}
            size='sm'
            title='ลากและวางไฟล์ หรือคลิกเพื่ออัปโหลด'
            helper='ไฟล์เอกสาร (PDF, JPG หรือ PNG)'
            ctaLabel='เลือกไฟล์'
            error={!!fileError}
            style={{
              flex: '1 1 0',
              minWidth: 0,
              width: '100%',
              background: 'var(--surface-card-100)',
            }}
          />
          <PhotoUploadField
            label='ถ่ายภาพเอกสาร'
            icon='photo_camera'
            onClick={onOpenCamera}
            aria-label='ถ่ายภาพเอกสารด้วยกล้อง'
            style={{
              width: 'var(--dim-size-2000, 128px)',
              height: 'var(--dim-size-2000, 128px)',
              flexShrink: 0,
              boxSizing: 'border-box',
              background: 'var(--surface-card-100)',
            }}
          />
        </div>
      )}
      {fileError && (
        <span role='alert' style={{
          color: 'var(--text-danger-default, #B91C1C)',
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-xs)',
        }}>
          {fileError}
        </span>
      )}
    </div>

    {/* เจ้าหน้าที่เป็นผู้ตรวจเทียบเอง — กดยืนยันแล้วจึงไปต่อได้
        (ปุ่มลงมืออยู่ในกล่องของวิธีนี้ · footer เหลือแต่ "ต่อไป") */}
    {matched ? (
      <span className='inline-flex items-center self-center' style={{
        gap: 'var(--dim-space-150)',
        color: 'var(--text-brandPrimary-default, #007549)',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-sm)',
        fontWeight: 'var(--type-weight-medium)',
      }}>
        <Icon name='check_circle' size={18} color='currentColor' />
        เจ้าหน้าที่ยืนยันแล้วว่าเป็นคนเดียวกับข้อมูลในทะเบียน
      </span>
    ) : (
      /* ปุ่มยืนยันอยู่กึ่งกลางคอลัมน์ — เป็นการลงมือหลักของแท็บนี้ */
      <div className='flex justify-center w-full'>
        <BrandButton
          type='button'
          variant='fill'
          size='md'
          leadingIcon='how_to_reg'
          disabled={!docType || !fileName}
          onClick={onConfirmMatch}
        >
          ยืนยันว่าเป็นคนเดียวกัน
        </BrandButton>
      </div>
    )}
  </div>
);

export default ConsentAltIdentityStep;
