import React from 'react';
import { createPortal } from 'react-dom';
import Popup from '@/components/popup/Popup';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import { formatNationalId, REGISTRATION_AUDIT_USER } from '@/data/registrationForm';
import { printRegistrationDoc } from './registrationPrint';

/* MIH PatientCardPrintPopup — TOR 1.1.1.10: พิมพ์บัตรผู้รับบริการ
   (ใบ OPD CARD ตามตัวอย่าง คู่มือระบบเวชระเบียน หน้า 2-4). Shown
   automatically after a successful registration save (legacy flow:
   บันทึก → พิมพ์ OPD Card) and on demand from the directory tab row
   overflow. Print via registrationPrint.js @media-print switch.

   Module-owned popup (src/pages/registration) per playbook §4. */

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];
const todayThai = () => {
  const d = new Date();
  return `${d.getDate()} ${THAI_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`;
};

/** Adapter — MR_PATIENTS row → flat OPD-card display object. */
export const buildOpdCardFromMr = (mr) => {
  if (!mr) return null;
  const addr = mr.address || {};
  const emergency = (mr.emergency && mr.emergency[0]) || null;
  return {
    hn: mr.hn,
    fullName: `${mr.prefixTh || ''}${mr.firstNameTh || ''} ${mr.lastNameTh || ''}`.trim(),
    nationalId: formatNationalId(mr.nationalId),
    passportNo: mr.passportNo || '',
    dob: mr.dob || '—',
    ageLabel: mr.age != null && mr.age !== '' ? `${mr.age} ปี` : '—',
    gender: mr.gender || '—',
    bloodType: mr.bloodType || '—',
    nationality: 'ไทย',
    religion: 'พุทธ',
    marital: mr.marital || '—',
    address: [
      addr.houseNo, addr.moo && `หมู่/ซอย ${addr.moo}`, addr.road && `ถ.${addr.road}`,
      addr.subdistrict && `แขวง${addr.subdistrict}`, addr.district && `เขต${addr.district}`,
      addr.province, addr.zip,
    ].filter(Boolean).join(' ') || '—',
    phone: mr.phone || '—',
    rights: mr.rights || '—',
    emergencyContact: emergency
      ? `${emergency.name} ${emergency.last} (${emergency.relation}) · ${emergency.phone}`
      : '—',
    issuedAt: todayThai(),
    issuedBy: REGISTRATION_AUDIT_USER,
    lifeStatus: mr.lifeStatus || 'alive',
  };
};

/** Adapter — registration form draft (after save) → OPD-card object. */
export const buildOpdCardFromForm = (form, hn) => {
  if (!form) return null;
  const addr = form.addressCurrent?.province ? form.addressCurrent : form.addressRegistered || {};
  const emergency = (form.emergency || []).find((e) => e?.name) || null;
  const ageLabel = form.dobUnknown
    ? (form.birthYearBE ? `${new Date().getFullYear() + 543 - Number(form.birthYearBE)} ปี` : '—')
    : (form.ageDisplay || '—');
  return {
    hn: hn || '—',
    fullName: `${form.prefixTh || ''}${form.firstNameTh || ''} ${form.lastNameTh || ''}`.trim() || '—',
    nationalId: form.nationalId || '—',
    passportNo: form.passportNo || '',
    dob: form.dobUnknown
      ? (form.birthYearBE ? `พ.ศ. ${form.birthYearBE} (ทราบเฉพาะปีเกิด)` : '—')
      : (form.dob || '—'),
    ageLabel,
    gender: form.gender || '—',
    bloodType: form.bloodType || '—',
    nationality: form.hnGroup === 'foreign-doc' ? 'ต่างชาติ' : 'ไทย',
    religion: 'พุทธ',
    marital: form.marital || '—',
    address: [
      addr.houseNo, addr.moo && `หมู่/ซอย ${addr.moo}`, addr.road && `ถ.${addr.road}`,
      addr.subdistrict && `แขวง${addr.subdistrict}`, addr.district && `เขต${addr.district}`,
      addr.province, addr.zip,
    ].filter(Boolean).join(' ') || '—',
    phone: form.phone || '—',
    rights: (form.rightsGroups?.[0]?.priorityItems?.[0]?.label) || 'รอตรวจสอบสิทธิ',
    emergencyContact: emergency
      ? `${emergency.name} ${emergency.last} (${emergency.relation}) · ${emergency.phone}`
      : '—',
    issuedAt: todayThai(),
    issuedBy: REGISTRATION_AUDIT_USER,
    lifeStatus: form.lifeStatus || 'alive',
  };
};

/* Barcode mock — striped gradient (gradients are the one sanctioned
   inline-value exception in CLAUDE.md; Figma/DS has no barcode token). */
const BarcodeMock = ({ value }) => (
  <div className='flex flex-col items-center' style={{ gap: 'var(--dim-space-100, 4px)' }}>
    <div
      aria-hidden
      style={{
        width: 180,
        height: 40,
        background:
          'repeating-linear-gradient(90deg, #17191B 0px, #17191B 2px, transparent 2px, transparent 4px, #17191B 4px, #17191B 7px, transparent 7px, transparent 9px)',
      }}
    />
    <span style={{
      fontFamily: 'var(--type-family-body)',
      fontSize: 'var(--type-size-xs, 12px)',
      letterSpacing: '0.2em',
      color: 'var(--text-content-default, #363B3F)',
    }}>
      {value}
    </span>
  </div>
);

const CardRow = ({ label, value }) => (
  <div className='flex w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
    <span style={{
      width: 132,
      flexShrink: 0,
      fontFamily: 'var(--type-family-body)',
      fontSize: 'var(--type-size-xs, 12px)',
      color: 'var(--text-content-tertiary, #858C92)',
      lineHeight: 1.6,
    }}>
      {label}
    </span>
    <span style={{
      fontFamily: 'var(--type-family-body)',
      fontSize: 'var(--type-size-xs, 12px)',
      color: 'var(--text-content-default, #363B3F)',
      fontWeight: 'var(--type-weight-medium, 500)',
      lineHeight: 1.6,
      minWidth: 0,
    }}>
      {value}
    </span>
  </div>
);

/* The OPD card sheet — shared by preview and print root. Fixed card
   layout per the legacy ใบ OPD CARD example (manual p.2-4). */
const OpdCardSheet = ({ card, forPrint = false }) => {
  if (!card) return null;
  return (
    <div
      className='mih-reg-print-sheet flex flex-col'
      style={{
        width: forPrint ? '148mm' : 480,
        marginLeft: 'auto',
        marginRight: 'auto',
        background: 'var(--surface-card-100, #FFFFFF)',
        border: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-tertiary, #E2E4E6)',
        borderRadius: forPrint ? 0 : 'var(--dim-radius-400, 12px)',
        paddingTop: 'var(--dim-space-500, 20px)',
        paddingBottom: 'var(--dim-space-500, 20px)',
        paddingLeft: 'var(--dim-space-600, 24px)',
        paddingRight: 'var(--dim-space-600, 24px)',
        gap: 'var(--dim-space-300, 12px)',
        fontFamily: 'var(--type-family-body)',
      }}
    >
      <div className='flex items-start w-full' style={{ gap: 'var(--dim-space-400, 16px)' }}>
        <div className='flex-1 min-w-0'>
          <div style={{
            fontSize: 'var(--type-size-base, 16px)',
            fontWeight: 'var(--type-weight-bold, 700)',
            color: 'var(--text-content-default, #363B3F)',
            lineHeight: 1.4,
          }}>
            บัตรผู้รับบริการ (OPD CARD)
          </div>
          <div style={{
            fontSize: 'var(--type-size-xs, 12px)',
            color: 'var(--text-content-secondary, #636B72)',
            lineHeight: 1.5,
          }}>
            ศูนย์บริการสาธารณสุข · สำนักอนามัย กรุงเทพมหานคร
          </div>
        </div>
        <BarcodeMock value={card.hn} />
      </div>

      <div
        className='flex items-center w-full'
        style={{
          gap: 'var(--dim-space-200, 8px)',
          borderTop: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary, #F4F5F5)',
          paddingTop: 'var(--dim-space-300, 12px)',
        }}
      >
        <span style={{
          fontSize: 'var(--type-size-lg, 18px)',
          fontWeight: 'var(--type-weight-bold, 700)',
          color: 'var(--text-content-default, #363B3F)',
        }}>
          HN {card.hn}
        </span>
        <span style={{
          fontSize: 'var(--type-size-base, 16px)',
          fontWeight: 'var(--type-weight-medium, 500)',
          color: 'var(--text-content-default, #363B3F)',
        }}>
          {card.fullName}
        </span>
        {card.lifeStatus === 'deceased' && (
          <span style={{
            fontSize: 'var(--type-size-xs, 12px)',
            color: 'var(--text-content-tertiary, #858C92)',
          }}>
            (เสียชีวิต)
          </span>
        )}
      </div>

      <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-100, 4px)' }}>
        <CardRow label='เลขบัตรประชาชน' value={card.nationalId || '—'} />
        {card.passportNo ? <CardRow label='Passport' value={card.passportNo} /> : null}
        <CardRow label='วันเกิด / อายุ' value={`${card.dob} · ${card.ageLabel}`} />
        <CardRow label='เพศ / หมู่เลือด' value={`${card.gender} · ${card.bloodType}`} />
        <CardRow label='สัญชาติ / ศาสนา' value={`${card.nationality} / ${card.religion}`} />
        <CardRow label='สถานภาพ' value={card.marital} />
        <CardRow label='ที่อยู่' value={card.address} />
        <CardRow label='โทรศัพท์' value={card.phone} />
        <CardRow label='สิทธิการรักษา' value={card.rights} />
        <CardRow label='ผู้ติดต่อฉุกเฉิน' value={card.emergencyContact} />
      </div>

      <div
        className='flex w-full items-center'
        style={{
          gap: 'var(--dim-space-200, 8px)',
          borderTop: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary, #F4F5F5)',
          paddingTop: 'var(--dim-space-300, 12px)',
        }}
      >
        <span style={{
          fontSize: 'var(--type-size-xs, 12px)',
          color: 'var(--text-content-tertiary, #858C92)',
          lineHeight: 1.5,
        }}>
          วันที่ออกบัตร {card.issuedAt} · ผู้ออกบัตร {card.issuedBy}
        </span>
      </div>
    </div>
  );
};

/**
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {object|null} props.card    — from buildOpdCardFromMr / buildOpdCardFromForm
 * @param {string} [props.subtitle]  — host context line (e.g. หลังบันทึกสำเร็จ)
 * @param {{label: string, onClick: () => void}} [props.extraAction]
 *        — optional third button. The registration form uses it for the
 *          legacy "บันทึก → OPD Card → ส่งตรวจ" hop straight to /registration/visit.
 */
const PatientCardPrintPopup = ({ open, onClose, card, subtitle, extraAction }) => (
  <>
    <Popup
      open={open}
      onClose={onClose}
      title='พิมพ์บัตรผู้รับบริการ (OPD Card)'
      subtitle={subtitle || 'ตรวจสอบข้อมูลบนบัตรก่อนสั่งพิมพ์'}
      size='large'
      tertiaryAction={extraAction}
      secondaryAction={{ label: 'ปิด', onClick: onClose }}
      primaryAction={{
        label: 'พิมพ์ OPD Card',
        onClick: () => printRegistrationDoc('opd-card'),
        disabled: !card,
      }}
    >
      <div className='flex flex-col w-full items-center' style={{ gap: 'var(--dim-space-300)' }}>
        {card?.rights && card.rights !== '—' && (
          <ColorfulBadge style='teal' size='small' hierarchy='secondary'>
            สิทธิ: {card.rights}
          </ColorfulBadge>
        )}
        <OpdCardSheet card={card} />
      </div>
    </Popup>

    {open && card && typeof document !== 'undefined' && createPortal(
      <div className='mih-reg-print-root mih-reg-print-opd-card'>
        <OpdCardSheet card={card} forPrint />
      </div>,
      document.body,
    )}
  </>
);

export default PatientCardPrintPopup;
