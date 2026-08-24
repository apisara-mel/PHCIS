import React from 'react';
import { createPortal } from 'react-dom';
import Popup from '@/components/popup/Popup';
import Icon from '@/components/icons/Icon';

/* ใบ e-Document ที่สร้างจาก form-builder — มุมมองอ่านอย่างเดียว + พิมพ์
   ────────────────────────────────────────────────────────────────────────
   The builder's own FormBuilderPatientPreview is a 320px phone mock — right
   for authoring a form people fill on their phone, wrong for the paper the
   clinic hands the client. This renders the same blocks as an A4 sheet with
   ruled answer lines, so it prints as a real document.

   Print isolation follows the FamilyPlanningFollowUpCard / queueCenterStore
   pattern: Routes.jsx imports every page statically, so every module's print
   stylesheet is live at once. Each one must scope its @media print rules to
   its OWN attribute on <html>, otherwise modules hide each other's print
   root and the printout comes out blank. */

const PRINT_ATTR = 'data-mih-edoc-print-mode';
const PRINT_CLASS = 'mih-edoc-print-only';

if (typeof document !== 'undefined') {
  let css = document.getElementById('mih-edoc-print-style');
  if (!css) {
    css = document.createElement('style');
    css.id = 'mih-edoc-print-style';
    document.head.appendChild(css);
  }
  css.textContent = `
    .${PRINT_CLASS} { display: none; }
    @media print {
      html[${PRINT_ATTR}] body > *:not(.${PRINT_CLASS}) { display: none !important; }
      html[${PRINT_ATTR}] .${PRINT_CLASS} { display: block !important; }
    }
  `;
}

export const printEDocument = () => {
  if (typeof document === 'undefined' || typeof window === 'undefined') return;
  try {
    document.documentElement.setAttribute(PRINT_ATTR, 'sheet');
    window.print();
    window.setTimeout(() => document.documentElement.removeAttribute(PRINT_ATTR), 500);
  } catch (err) {
    document.documentElement.removeAttribute(PRINT_ATTR);
  }
};

const LABEL = {
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm)',
  color: 'var(--text-content-secondary, #4D5358)',
};

const RULE = {
  flex: 1,
  minWidth: 'var(--dim-size-2400, 160px)',
  borderBottom: 'var(--dim-stroke-100, 1px) dotted var(--border-neutral-tertiary, #C1C7CD)',
  height: 'var(--dim-size-500, 20px)',
};

const AnswerLine = ({ label, required, tall = false }) => (
  <div
    className='flex items-end w-full'
    style={{ gap: 'var(--dim-space-200)', marginBottom: 'var(--dim-space-200)' }}
  >
    <span style={{ ...LABEL, whiteSpace: 'nowrap' }}>
      {label}
      {required && <span style={{ color: 'var(--text-input-require, #DA1E28)' }}> *</span>}
    </span>
    <span style={{ ...RULE, height: tall ? 'var(--dim-size-1200, 48px)' : RULE.height }} />
  </div>
);

const Tickable = ({ label, round }) => (
  <span className='inline-flex items-center' style={{ gap: 'var(--dim-space-150)' }}>
    <span
      style={{
        width: 'var(--dim-size-350, 14px)',
        height: 'var(--dim-size-350, 14px)',
        flexShrink: 0,
        border: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-secondary, #878D96)',
        borderRadius: round ? 'var(--dim-radius-full)' : 'var(--dim-radius-050, 2px)',
      }}
    />
    <span style={LABEL}>{label}</span>
  </span>
);

const SheetBlock = ({ block }) => {
  const { type, title, required, fields, options, max } = block;

  if (type === 'divider') {
    return (
      <div
        style={{
          height: 1,
          background: 'var(--border-neutral-quaternary, #EDEFF1)',
          marginTop: 'var(--dim-space-300)',
          marginBottom: 'var(--dim-space-300)',
        }}
      />
    );
  }

  return (
    <section className='w-full' style={{ marginBottom: 'var(--dim-space-400)', breakInside: 'avoid' }}>
      {title && (
        <p
          className='m-0'
          style={{
            fontFamily: 'var(--type-family-heading-content)',
            fontSize: 'var(--type-size-sm)',
            fontWeight: 'var(--type-weight-bold)',
            color: 'var(--text-content-primary, #21272A)',
            marginBottom: 'var(--dim-space-200)',
          }}
        >
          {title}
          {required && <span style={{ color: 'var(--text-input-require, #DA1E28)' }}> *</span>}
        </p>
      )}

      {type === 'fields' && (fields ?? []).map((f) => (
        <AnswerLine
          key={f.id}
          label={f.label}
          required={f.required}
          tall={f.inputType === 'textarea'}
        />
      ))}

      {(type === 'radio' || type === 'checkbox' || type === 'dropdown') && (
        <div className='flex flex-wrap' style={{ gap: 'var(--dim-space-300) var(--dim-space-500)' }}>
          {(options ?? []).map((o) => (
            <Tickable key={o.id} label={o.label} round={type === 'radio'} />
          ))}
        </div>
      )}

      {type === 'rating' && (
        <div className='flex flex-wrap items-center' style={{ gap: 'var(--dim-space-300)' }}>
          {Array.from({ length: max ?? 5 }, (_, i) => (
            <Tickable key={i} label={String(i + 1)} round />
          ))}
        </div>
      )}

      {type === 'file' && (
        <span style={{ ...LABEL, fontStyle: 'italic' }}>(แนบไฟล์ประกอบ)</span>
      )}

      {type === 'signature' && (
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-150)', maxWidth: 320 }}>
          <span
            style={{
              height: 'var(--dim-size-1600, 64px)',
              borderBottom: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-secondary, #878D96)',
            }}
          />
          <span style={{ ...LABEL, fontSize: 'var(--type-size-xs)' }}>ลงชื่อ ................................................</span>
        </div>
      )}
    </section>
  );
};

/** The sheet body — reused by the on-screen preview and the print-only copy. */
export const EDocumentSheetBody = ({ doc, patient, center = 'ศูนย์บริการสาธารณสุข 4 ดินแดง' }) => (
  <article
    style={{
      background: '#FFFFFF',
      color: 'var(--text-content-primary, #21272A)',
      maxWidth: 720,
      marginLeft: 'auto',
      marginRight: 'auto',
      paddingTop: 'var(--dim-space-600)',
      paddingRight: 'var(--dim-space-600)',
      paddingBottom: 'var(--dim-space-600)',
      paddingLeft: 'var(--dim-space-600)',
    }}
  >
    <header style={{ marginBottom: 'var(--dim-space-500)' }}>
      <p className='m-0' style={{ ...LABEL, fontSize: 'var(--type-size-xs)' }}>{center}</p>
      <h2
        className='m-0'
        style={{
          fontFamily: 'var(--type-family-heading-content)',
          fontSize: 'var(--type-size-lg)',
          fontWeight: 'var(--type-weight-bold)',
          marginTop: 'var(--dim-space-100)',
        }}
      >
        {doc?.name}
      </h2>
      <p className='m-0' style={{ ...LABEL, fontSize: 'var(--type-size-xs)', marginTop: 'var(--dim-space-150)' }}>
        {patient?.fullName ? `ผู้รับบริการ ${patient.fullName}` : ''}
        {patient?.hn ? ` · HN ${patient.hn}` : ''}
        {doc?.createdBy ? ` · สร้างโดย ${doc.createdBy}` : ''}
      </p>
      <div
        style={{
          height: 1,
          background: 'var(--border-neutral-tertiary, #C1C7CD)',
          marginTop: 'var(--dim-space-300)',
        }}
      />
    </header>

    {(doc?.blocks ?? []).map((b) => <SheetBlock key={b.id} block={b} />)}
  </article>
);

const EDocumentSheetPopup = ({ open, onClose, doc, patient }) => (
  <>
    <Popup
      open={open}
      onClose={onClose}
      title={doc?.name ?? 'e-Document'}
      subtitle='ตัวอย่างเอกสารก่อนพิมพ์ — ช่องคำตอบเว้นว่างไว้ให้กรอกบนกระดาษ'
      size='large'
      primaryAction={{ label: 'พิมพ์', onClick: printEDocument }}
      secondaryAction={{ label: 'ปิด', onClick: onClose }}
    >
      <div
        style={{
          borderRadius: 'var(--dim-radius-200, 8px)',
          border: 'var(--dim-stroke-100, 1px) solid var(--border-card-default, #EDEFF1)',
          background: '#FFFFFF',
        }}
      >
        <EDocumentSheetBody doc={doc} patient={patient} />
      </div>
    </Popup>

    {/* print-only copy — MUST be a direct child of <body>: the print rule
        hides `body > *` that lack the class, so a nested copy would be
        hidden along with #root and the printout would come out blank. */}
    {open && typeof document !== 'undefined' && createPortal(
      <div className={PRINT_CLASS}>
        <EDocumentSheetBody doc={doc} patient={patient} />
      </div>,
      document.body,
    )}
  </>
);

export default EDocumentSheetPopup;
