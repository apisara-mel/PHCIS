import React from 'react';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import Icon from '@/components/icons/Icon';
import { CONSENT_CONFIRM, CONSENT_TYPE_TONE } from '@/data/consentRecords';
import { resolveConsentFormForWorklistType } from '@/data/consentFormRecords';

/* เนื้อหายืนยันการเพิกถอนความยินยอม — ใช้ร่วม 2 ที่:
     • AlertDialog เพิกถอนจากแถวในแท็บสถานะของ worklist (ConsentManagementPage)
     • ขั้น drill-down "ยืนยันการเพิกถอน" ใน popup แฟ้มผู้รับบริการ
       (ConsentConsentedFormsPopup — nested ไม่ซ้อน dialog)

   14 ส.ค. 2569: เปลี่ยนการ์ดบนจาก "ข้อมูลผู้รับบริการ" เป็น "รายละเอียดแบบฟอร์ม
   ที่จะเพิกถอน" (ผู้รับบริการเห็นอยู่แล้วจากหัว popup/แถวที่กด) และเพิ่มส่วน
   "การเสียผลประโยชน์" ให้เจ้าหน้าที่ใช้แจ้งผู้รับบริการก่อนยืนยัน */

export const REVOKE_IMPACT_NOTES = [
  'มีผลทันทีหลังพิสูจน์ตัวตนเจ้าของข้อมูลและดำเนินการเสร็จ',
  'ประวัติการให้ความยินยอมยังคงอยู่ในระบบ (read-only)',
  'ต้องสร้างคำขอความยินยอมใหม่หากต้องใช้สิทธิอีกครั้ง',
];

/* ผลประโยชน์ที่จะเสียไป แยกตามหัวข้อความยินยอม — mock ระดับ UI ให้เจ้าหน้าที่
   อ่านแจ้งผู้รับบริการ (ของจริงมากับเทมเพลตแบบฟอร์มฝั่ง backend) */
const BENEFIT_LOSS_BY_TYPE = {
  'ข้อมูลการรักษา': [
    'อาจไม่สามารถเข้าถึงการรักษาที่จำเป็นได้อย่างทันท่วงที เนื่องจากทีมแพทย์จะไม่เห็นประวัติการรักษาต่อเนื่อง',
    'การนัดหมายและการติดตามอาการต่อเนื่องที่บ้านจะหยุดลง ต้องมาติดต่อด้วยตนเองทุกครั้ง',
    'ผลตรวจและผลแล็บจะไม่ถูกส่งถึงแพทย์ผู้ดูแลโดยอัตโนมัติ',
  ],
  'การเบิกจ่าย': [
    'อาจไม่สามารถใช้สิทธิเบิกจ่ายได้ทันที — ต้องสำรองจ่ายแล้วยื่นเอกสารเบิกด้วยตนเอง',
    'การตรวจสอบสิทธิ ณ จุดบริการจะใช้เวลานานขึ้น อาจทำให้เข้ารับการรักษาที่จำเป็นได้ไม่ทันท่วงที',
    'เอกสารประกอบการเบิกต้องขอเป็นกระดาษทุกครั้ง',
  ],
  'ข้อมูลส่วนบุคคล': [
    'อาจไม่ได้รับการแจ้งเตือนนัดหมายและผลตรวจ ทำให้พลาดการรักษาที่จำเป็น',
    'ต้องกรอกข้อมูลใหม่ทุกครั้งที่มารับบริการ เพราะระบบไม่สามารถดึงข้อมูลเดิมมาใช้',
  ],
};
const BENEFIT_LOSS_DEFAULT = [
  'อาจไม่สามารถเข้าถึงการรักษาหรือบริการที่จำเป็นได้อย่างทันท่วงที',
  'บริการที่อาศัยความยินยอมฉบับนี้จะหยุดลง ต้องดำเนินการด้วยเอกสารแทน',
];

const LABEL = {
  color: 'var(--text-content-tertiary)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-xs)',
  lineHeight: 1.4,
};
const VALUE = {
  color: 'var(--text-content-default)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm)',
  fontWeight: 'var(--type-weight-medium)',
  lineHeight: 1.5,
};
const BODY = {
  color: 'var(--text-content-secondary)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm)',
  lineHeight: 1.5,
};
const NOTE = { ...BODY, color: 'var(--text-content-tertiary)', fontSize: 'var(--type-size-xs)' };

const ConsentRevokeConfirmBody = ({ record }) => {
  if (!record) return null;
  const resolved = resolveConsentFormForWorklistType(record.type);
  const formName = record.formName && record.formName !== '-'
    ? record.formName
    : (record.formTitle || resolved.formName || 'แบบฟอร์มความยินยอม');
  const formCode = record.formCode && record.formCode !== '-'
    ? record.formCode
    : (record.formId || resolved.formCode || '—');
  const benefitLoss = BENEFIT_LOSS_BY_TYPE[record.type] || BENEFIT_LOSS_DEFAULT;

  return (
    <div className='flex flex-col w-full min-w-0 text-left' style={{ gap: 'var(--dim-space-400)' }}>
      {/* รายละเอียดแบบฟอร์มที่จะเพิกถอน — แทนการ์ดผู้รับบริการเดิม
          (ชื่อ/HN ของคนเห็นอยู่แล้วจากบริบทที่กดมา) */}
      <div
        className='flex flex-col w-full min-w-0'
        style={{
          gap: 'var(--dim-space-200)',
          padding: 'var(--dim-space-400, 16px)',
          background: 'var(--surface-brandPrimary-quaternary, #F4FBF8)',
          border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
          borderRadius: 'var(--dim-radius-300)',
        }}
      >
        <span style={LABEL}>แบบฟอร์มที่จะเพิกถอน</span>
        <span style={VALUE}>{formName}</span>
        <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-150)' }}>
          <ColorfulBadge style='teal' size='small' hierarchy='secondary' width='hug'>{formCode}</ColorfulBadge>
          {record.version && (
            <ColorfulBadge style='blue' size='small' hierarchy='secondary' width='hug'>{record.version}</ColorfulBadge>
          )}
          {record.type && (
            <ColorfulBadge
              style={CONSENT_TYPE_TONE[record.type] || 'grey'}
              size='small'
              hierarchy='secondary'
              width='hug'
            >
              {record.type}
            </ColorfulBadge>
          )}
        </div>
        {record.signedDate && record.signedDate !== '-' && (
          <span style={NOTE}>ลงนามให้ความยินยอมเมื่อ {record.signedDate}</span>
        )}
      </div>

      {/* สองกลุ่มล่างจัดรูปแบบเดียวกัน: หัวข้อ = VALUE (sm/medium) · เนื้อหา =
          BODY (sm) · เว้นระหว่างกลุ่มกว้างกว่าระยะในกลุ่ม (marginTop 500) */}

      {/* การเสียผลประโยชน์ — เจ้าหน้าที่อ่านแจ้งผู้รับบริการก่อนกดยืนยัน
          เว้น 24px เหนือหัวข้อ (มติผู้ใช้ 25 ส.ค. 69) — เตือนเรื่องเสียสิทธิ
          ต้องแยกออกจากข้อมูลฉบับด้านบนให้ชัด ไม่ใช่ไหลต่อกันเป็นก้อนเดียว */}
      <div
        className='flex flex-col w-full min-w-0'
        style={{ gap: 'var(--dim-space-200)', marginTop: 'var(--dim-space-600, 24px)' }}
      >
        <span className='inline-flex items-center' style={{
          ...VALUE,
          gap: 'var(--dim-space-150)',
          color: 'var(--text-warning-default, #C2410C)',
        }}>
          <Icon name='warning' size={18} color='currentColor' />
          ผลประโยชน์ที่ผู้รับบริการจะเสียไป — โปรดแจ้งให้ทราบก่อนเพิกถอน
        </span>
        {benefitLoss.map((item) => (
          <div key={item} className='flex items-start w-full min-w-0' style={{ gap: 'var(--dim-space-150)' }}>
            <Icon
              name='do_not_disturb_on'
              size={16}
              color='var(--icon-warning-tertiary, #EA580C)'
              style={{ flexShrink: 0, marginTop: 'var(--dim-space-050, 2px)' }}
            />
            <span style={BODY}>{item}</span>
          </div>
        ))}
      </div>

      <div
        className='flex flex-col w-full'
        style={{ gap: 'var(--dim-space-200)', marginTop: 'var(--dim-space-500, 20px)' }}
      >
        <span style={VALUE}>{CONSENT_CONFIRM.revoke.description}</span>
        {REVOKE_IMPACT_NOTES.map((note) => (
          <div key={note} className='flex items-start w-full min-w-0' style={{ gap: 'var(--dim-space-150)' }}>
            <Icon
              name='check_circle'
              size={16}
              color='var(--icon-brandPrimary-default, #007549)'
              style={{ flexShrink: 0, marginTop: 'var(--dim-space-050, 2px)' }}
            />
            <span style={BODY}>{note}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ConsentRevokeConfirmBody;
