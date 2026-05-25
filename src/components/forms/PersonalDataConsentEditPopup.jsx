import React, { useState } from 'react';
import Popup from '@/components/popup/Popup';
import { FieldGrid, Field } from '@/components/forms/Fields';
import InputField from '@/components/forms/InputField';
import Select from '@/components/forms/Select';
import Icon from '@/components/icons/Icon';
import Signature from '@/components/form-builder/Signature';
import {
  PERSONAL_DATA_CONSENT_SECTIONS,
} from '@/data/personalDataConsentForm';

/** Mock stroke for read-only "signed" row — SVG data URL (FormBuilder Signature `value`). */
const DEMO_SIGNED_SIGNATURE_DATA_URL = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 72" width="280" height="72"><path d="M14 48c22-34 58-44 96-38 30 4 52 16 74 34 10 8 20 8 28-4" fill="none" stroke="#007549" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
)}`;

const PREFIX_OPTS = ['นาย', 'นาง', 'นางสาว', 'เด็กชาย', 'เด็กหญิง'].map((p) => ({
  value: p,
  label: p,
}));

/** Figma PHCIS | OPD · Popup ExtraLarge `351:66329` — modal title (ไม่มีคำว่า "เอกสาร"). */
export const PERSONAL_DATA_CONSENT_MODAL_TITLE =
  'ยินยอมการเข้าถึงข้อมูลส่วนบุคคลและการเข้ารับบริการทางการแพทย์';

const formStackShell = {
  width: '100%',
  maxWidth: 640,
  marginLeft: 'auto',
  marginRight: 'auto',
};

const consentFormCard = {
  background: 'var(--surface-card-100)',
  borderRadius: 'var(--dim-radius-400)',
  boxShadow: 'var(--shadow-brand-drop-bottom-200)',
  padding: 'var(--dim-space-600)',
  width: '100%',
};

const sectionTitleStyle = {
  margin: 'var(--dim-space-0)',
  width: '100%',
  color: 'var(--text-topic-secondary-title, var(--brand-p700))',
  fontFamily: 'var(--type-family-heading-content)',
  fontSize: 'var(--type-size-base)',
  fontWeight: 'var(--type-weight-bold)',
  lineHeight: 1.5,
};

const clauseTextStyle = {
  margin: 'var(--dim-space-0)',
  color: 'var(--text-content-secondary)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm)',
  fontWeight: 'var(--type-weight-regular)',
  lineHeight: 1.5,
};

function ConsentSectionTitle({ children }) {
  return <h3 style={sectionTitleStyle}>{children}</h3>;
}

/** Figma `351:66329` — ปุ่มเลือก ยินยอม / ไม่ยินยอม แบบ card + ไอคอนวงกลม */
function ConsentChoiceTiles({ value, onChange, name }) {
  const tileBase = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 'var(--dim-space-200)',
    minHeight: 56,
    padding: 'var(--dim-space-200) var(--dim-space-400)',
    borderRadius: 'var(--dim-radius-200)',
    border: 'var(--dim-stroke-100) solid var(--border-neutralbutton-tertiary, var(--border-neutral-quaternary))',
    background: 'var(--surface-neutralbutton-quinary, #fff)',
    cursor: 'pointer',
    fontFamily: 'var(--type-family-body)',
    fontSize: 'var(--type-size-sm)',
    color: 'var(--text-content-default)',
  };

  const ring = (active) =>
    active
      ? '0 0 0 var(--dim-stroke-200) var(--border-brandPrimaryButton-default, var(--brand-p700))'
      : 'none';

  const circle = (tone, selected) => ({
    width: 36,
    height: 36,
    borderRadius: 'var(--dim-radius-full, 9999px)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    background:
      tone === 'yes'
        ? 'var(--surface-positive-quaternary, var(--brand-p50))'
        : 'var(--surface-danger-quaternary, #fff0f0)',
    opacity: selected ? 1 : 0.65,
  });

  return (
    <div
      className='flex flex-wrap w-full min-w-0'
      style={{ gap: 'var(--dim-space-400)' }}
      role='group'
      aria-label={name}
    >
      <button
        type='button'
        onClick={() => onChange('yes')}
        style={{ ...tileBase, boxShadow: ring(value === 'yes') }}
      >
        <span style={circle('yes', value === 'yes')}>
          <Icon
            name='check'
            size={20}
            color='var(--text-brandprimary-default, var(--brand-p700))'
          />
        </span>
        ยินยอม
      </button>
      <button
        type='button'
        onClick={() => onChange('no')}
        style={{ ...tileBase, boxShadow: ring(value === 'no') }}
      >
        <span style={circle('no', value === 'no')}>
          <Icon name='close' size={20} color='var(--text-danger-secondary, #DC2626)' />
        </span>
        ไม่ยินยอม
      </button>
    </div>
  );
}

function sectionById(id) {
  return PERSONAL_DATA_CONSENT_SECTIONS.find((s) => s.id === id);
}

/**
 * แก้ไขแบบฟอร์ม F-1012 — เนื้อหาและโครงสร้างตาม Figma PHCIS | OPD · `351:66329`
 * (หัวข้อ modal, การ์ดขาวบนพื้น mint, ฟิลด์ส่วนที่ 1, มาตรา 2–6, tile ยินยอม, ลายเซ็น, ฟุตเตอร์ ยกเลิก + บันทึกการแก้ไข).
 */
export default function PersonalDataConsentEditPopup({
  open,
  onClose,
  onSaveDraft: _onSaveDraft,
  onConfirm,
}) {
  const [prefixTh, setPrefixTh] = useState('นาย');
  const [firstName, setFirstName] = useState('สมชาย');
  const [lastName, setLastName] = useState('มั่นใจดี');
  const [ageText, setAgeText] = useState('36 ปี - 7 เดือน - 11วัน');
  const [citizenId] = useState('1-1678-89302-23-5');
  const [issueDate] = useState('20 กุมภาพันธ์ 2563');
  const [expiryDate] = useState('19 สิงหาคม 2571');
  const [hn, setHn] = useState('HN: 67-004321');
  const [consentAccess, setConsentAccess] = useState('yes');
  const [consentDisclose, setConsentDisclose] = useState('yes');

  const sec1 = sectionById('1-declarant');
  const sec2 = sectionById('2-explanation');
  const sec3 = sectionById('3-delegation');
  const sec4 = sectionById('4-use');
  const sec5 = sectionById('5-consent-detail');
  const sec6 = sectionById('6-revocation');

  const payload = () => ({
    prefixTh,
    firstName,
    lastName,
    ageText,
    citizenId,
    issueDate,
    expiryDate,
    hn,
    consentAccess,
    consentDisclose,
  });

  const handleConfirm = () => {
    onConfirm && onConfirm(payload());
    onClose();
  };

  const sec6Intro = sec6?.paragraphs?.[0];
  const sec6Foot = sec6?.paragraphs?.slice(7) ?? [];

  return (
    <Popup
      open={open}
      onClose={onClose}
      size='extraLarge'
      title={PERSONAL_DATA_CONSENT_MODAL_TITLE}
      subtitle='โปรดอ่านแบบฟอร์มและทำความเข้าใจก่อนลงนาม'
      buttonLayout='horizontal'
      bodyStyle={{ background: 'var(--brand-p50)' }}
      actions={[
        { key: 'cancel', kind: 'secondary', label: 'ยกเลิก', onClick: onClose },
        { key: 'save', kind: 'primary', label: 'บันทึกการแก้ไข', onClick: handleConfirm },
      ]}
    >
      <div className='flex flex-col w-full min-w-0' style={formStackShell}>
        <div
          className='flex flex-col w-full min-w-0'
          style={{ gap: 'var(--dim-space-400)' }}
        >
          {/* 1. ผู้แสดงเจตนา — Figma `163:9836` */}
          <section style={consentFormCard}>
            <div
              className='flex flex-col w-full min-w-0'
              style={{ gap: 'var(--dim-space-400)' }}
            >
              <ConsentSectionTitle>{sec1?.heading ?? '1. ผู้แสดงเจตนา'}</ConsentSectionTitle>

              <div className='w-full min-w-0' style={{ maxWidth: 160 }}>
                <Field label='คำนำหน้า' required>
                  <Select
                    size='lg'
                    value={prefixTh}
                    onChange={setPrefixTh}
                    options={PREFIX_OPTS}
                    disabled
                    showFieldName={false}
                    showHelperText={false}
                  />
                </Field>
              </div>

              <FieldGrid cols={2}>
                <Field label='ชื่อ' required>
                  <InputField
                    size='lg'
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder='ชื่อ'
                    showLabel={false}
                    showHelperText={false}
                  />
                </Field>
                <Field label='นามสกุล' required>
                  <InputField
                    size='lg'
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder='นามสกุล'
                    showLabel={false}
                    showHelperText={false}
                  />
                </Field>
              </FieldGrid>

              <FieldGrid cols={2}>
                <Field label='อายุ (ปี-เดือน-วัน)' required>
                  <InputField
                    size='lg'
                    value={ageText}
                    onChange={(e) => setAgeText(e.target.value)}
                    placeholder='อายุ'
                    leadingIcon='calendar_today'
                    showLeadingIcon
                    showLabel={false}
                    showHelperText={false}
                  />
                </Field>
                <div aria-hidden className='min-w-0' />
              </FieldGrid>

              <FieldGrid cols={2}>
                <Field label='เลขบัตรประชาชน' required>
                  <InputField
                    size='lg'
                    value={citizenId}
                    disabled
                    showLabel={false}
                    showHelperText={false}
                  />
                </Field>
              </FieldGrid>

              <FieldGrid cols={2}>
                <Field label='วันออกบัตร' required>
                  <InputField
                    size='lg'
                    value={issueDate}
                    disabled
                    showLabel={false}
                    showHelperText={false}
                  />
                </Field>
                <Field label='วันหมดอายุ' required>
                  <InputField
                    size='lg'
                    value={expiryDate}
                    disabled
                    showLabel={false}
                    showHelperText={false}
                  />
                </Field>
              </FieldGrid>

              <FieldGrid cols={2}>
                <Field label='เลขบัตรประชาชน' required>
                  <InputField
                    size='lg'
                    value={citizenId}
                    disabled
                    showLabel={false}
                    showHelperText={false}
                  />
                </Field>
              </FieldGrid>

              <FieldGrid cols={2}>
                <Field label='เลข HN' required>
                  <InputField
                    size='lg'
                    value={hn}
                    onChange={(e) => setHn(e.target.value)}
                    placeholder='HN'
                    showLabel={false}
                    showHelperText={false}
                  />
                </Field>
              </FieldGrid>
            </div>
          </section>

          {/* 2. การรับทราบจากโรงพยาบาล */}
          {sec2 && (
            <section style={consentFormCard}>
              <div
                className='flex flex-col w-full min-w-0'
                style={{ gap: 'var(--dim-space-400)' }}
              >
                <ConsentSectionTitle>{sec2.heading}</ConsentSectionTitle>
                {sec2.paragraphs?.map((p, i) => (
                  <p key={i} style={clauseTextStyle}>
                    {p}
                  </p>
                ))}
              </div>
            </section>
          )}

          {/* 3. การมอบหมาย … */}
          {sec3 && (
            <section style={consentFormCard}>
              <div
                className='flex flex-col w-full min-w-0'
                style={{ gap: 'var(--dim-space-400)' }}
              >
                <ConsentSectionTitle>{sec3.heading}</ConsentSectionTitle>
                {sec3.paragraphs?.map((p, i) => (
                  <p key={i} style={clauseTextStyle}>
                    {p}
                  </p>
                ))}
              </div>
            </section>
          )}

          {/* 4. การใช้ข้อมูล */}
          {sec4 && (
            <section style={consentFormCard}>
              <div
                className='flex flex-col w-full min-w-0'
                style={{ gap: 'var(--dim-space-400)' }}
              >
                <ConsentSectionTitle>{sec4.heading}</ConsentSectionTitle>
                {sec4.paragraphs?.map((p, i) => (
                  <p key={i} style={clauseTextStyle}>
                    {p}
                  </p>
                ))}
              </div>
            </section>
          )}

          {/* 5. ความยินยอม … + tile เลือก */}
          {sec5 && (
            <section style={consentFormCard}>
              <div
                className='flex flex-col w-full min-w-0'
                style={{ gap: '32px' }}
              >
                <ConsentSectionTitle>{sec5.heading}</ConsentSectionTitle>
                <div
                  className='flex flex-col w-full min-w-0'
                  style={{ gap: 'var(--dim-space-300)' }}
                >
                  {sec5.consentItems?.map((item) => (
                    <div
                      key={item.key}
                      className='flex flex-col w-full min-w-0'
                      style={{ gap: 'var(--dim-space-300)' }}
                    >
                      <p style={clauseTextStyle}>{item.legend}</p>
                      <ConsentChoiceTiles
                        name={item.key}
                        value={item.key === 'access' ? consentAccess : consentDisclose}
                        onChange={item.key === 'access' ? setConsentAccess : setConsentDisclose}
                      />
                      {item.footnote && (
                        <p
                          style={{
                            ...clauseTextStyle,
                            fontSize: 'var(--type-size-xs)',
                            color: 'var(--text-modal-subtext)',
                          }}
                        >
                          {item.footnote}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* 6. การยกเลิกความยินยอม + ลายเซ็น + หมายเหตุ */}
          {sec6 && (
            <section style={consentFormCard}>
              <div
                className='flex flex-col w-full min-w-0'
                style={{ gap: '32px' }}
              >
                <ConsentSectionTitle>{sec6.heading}</ConsentSectionTitle>
                <div
                  className='flex flex-col w-full min-w-0'
                  style={{ gap: 'var(--dim-space-600)' }}
                >
                  {sec6Intro && <p style={clauseTextStyle}>{sec6Intro}</p>}

                  <div
                    className='flex flex-col items-center w-full min-w-0'
                    style={{ gap: 'var(--dim-space-150)' }}
                  >
                    <p style={{ ...clauseTextStyle, textAlign: 'center', width: '100%' }}>
                      ลงชื่อ
                    </p>
                    <div className='w-full max-w-[323px]'>
                      <Signature
                        value={DEMO_SIGNED_SIGNATURE_DATA_URL}
                        onChange={() => {}}
                        disabled
                        height={94}
                        showFooter={false}
                      />
                    </div>
                    <p style={{ ...clauseTextStyle, textAlign: 'center', width: '100%' }}>
                      สมชาย มั่นใจดี
                    </p>
                    <p style={{ ...clauseTextStyle, textAlign: 'center', width: '100%' }}>
                      ผู้ป่วย/ผู้มีอำนาจกระทำแทน
                    </p>
                  </div>

                  <div
                    className='flex flex-col w-full min-w-0 whitespace-pre-wrap'
                    style={{ gap: 'var(--dim-space-200)' }}
                  >
                    {sec6Foot.map((p, i) => (
                      <p key={i} style={clauseTextStyle}>
                        {p}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </Popup>
  );
}

/* Back-compat: older import path used `FORM_MODAL_TITLE` re-export */
export { PERSONAL_DATA_CONSENT_MODAL_TITLE as FORM_MODAL_TITLE };
