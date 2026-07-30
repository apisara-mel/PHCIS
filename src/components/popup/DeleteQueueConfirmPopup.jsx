import React from 'react';
import Popup from '@/components/popup/Popup';
import ColorfulBadge from '@/components/badge/ColorfulBadge';

/* MIH DeleteQueueConfirmPopup — destructive confirmation for "ลบคิว".
   Aliases the DS <Popup size='large'> shell so chrome (close X, footer
   layout) stays on-spec; the primary action uses `tone: 'danger'` so the
   footer swaps to <DangerButton variant='fill'> (red) — making the
   irreversible nature obvious per accessibility/UX patterns for
   destructive operations.

   Layout — figma node 282:42435 (Popup Large, "ยืนยันการลบคิว"):
     • Title  : "ยืนยันการลบคิว"  (h6)
     • Subtitle: short reminder that the queue will be removed
     • Body   : brand-tinted patient summary row (Avatar · Queue ·
                HN · Patient name) so the user can re-confirm the
                target *before* committing to the destructive action.
     • Footer : ยกเลิก  (DangerSubdueButton) · ยืนยัน (DangerButton fill)

   Overlay click / Esc / close X always means "keep" → fires `onClose` only.

   Props:
     • open        boolean
     • onClose     () => void   — close without deleting (overlay/Esc/X/ยกเลิก)
     • onConfirm   () => void   — proceed with deletion
     • queue       string       — queue badge label (e.g. "A003")
     • hn          string       — Hospital Number (e.g. "67-00001")
     • patientName string       — Patient short name in Thai
     • avatarSrc   string       — optional avatar URL; falls back to
                                  initials chip when missing/broken. */

const QueueDivider = () => (
  <span
    aria-hidden
    style={{
      width: 1,
      alignSelf: 'stretch',
      maxHeight: 48,
      background: 'var(--border-neutral-tertiary, #E2E4E6)',
      flexShrink: 0,
    }}
  />
);

const Avatar = ({ src, alt }) => {
  const [errored, setErrored] = React.useState(false);
  const showImage = !!src && !errored;
  const initial = (alt || '').trim().charAt(0) || '?';
  return (
    <span
      aria-hidden={!alt}
      style={{
        width: 68,
        height: 68,
        flexShrink: 0,
        borderRadius: 'var(--dim-radius-full)',
        border: 'var(--dim-stroke-400, 4px) solid var(--border-image-default, #FFFFFF)',
        background: 'var(--text-brandprimary-default, #007549)',
        overflow: 'hidden',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow:
          'var(--sds-size-depth-0, 0px) var(--sds-size-depth-025, 1px) var(--sds-size-depth-100, 4px) var(--sds-size-depth-0, 0px) var(--color-shadow-050, rgba(100, 116, 139, 0.10))',
      }}
    >
      {showImage ? (
        <img
          src={src}
          alt={alt || ''}
          onError={() => setErrored(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        <span
          style={{
            color: 'var(--text-content-on-content, #FFFFFF)',
            fontFamily: 'var(--type-family-heading-content)',
            fontWeight: 'var(--type-weight-bold)',
            fontSize: 20,
            lineHeight: 1,
          }}
        >
          {initial}
        </span>
      )}
    </span>
  );
};

const FieldLabel = ({ children }) => (
  <span
    style={{
      color: 'var(--text-content-tertiary, #858C92)',
      fontFamily: 'var(--type-family-body)',
      fontWeight: 'var(--type-weight-regular)',
      fontSize: 'var(--type-size-xs, 12px)',
      lineHeight: 1.5,
      whiteSpace: 'nowrap',
    }}
  >
    {children}
  </span>
);

const FieldValue = ({ children, muted = false }) => (
  <span
    style={{
      color: muted
        ? 'var(--text-content-default, #4D5358)'
        : 'var(--text-brandprimary-default, #007549)',
      fontFamily: 'var(--type-family-heading-content)',
      fontWeight: 'var(--type-weight-bold)',
      fontSize: 'var(--type-size-base, 16px)',
      lineHeight: 1.5,
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    }}
  >
    {children}
  </span>
);

/* The patient summary row — green-tinted card that lists the queue
   ticket being deleted. Mirrors the "Patient_Remove" frame in Figma
   (node 282:42420) so a user can sanity-check the target queue before
   confirming the destructive action. */
const PatientSummary = ({ queue, hn, patientName, avatarSrc }) => (
  <div
    className='flex items-center w-full'
    style={{
      gap: 'var(--dim-space-600, 24px)',
      padding: 'var(--dim-space-400, 16px)',
      borderRadius: 'var(--dim-radius-400, 12px)',
      background: 'var(--surface-brandprimary-quaternary, #F4FBF8)',
      border:
        'var(--dim-stroke-100, 1px) solid var(--border-brandprimary-quaternary, #E2F3EB)',
      minHeight: 100,
      boxSizing: 'border-box',
    }}
  >
    <Avatar src={avatarSrc} alt={patientName} />

    <div
      className='flex flex-col items-start'
      style={{ gap: 'var(--dim-space-100, 4px)', minWidth: 0 }}
    >
      <FieldLabel>คิว</FieldLabel>
      <ColorfulBadge style='teal' size='default'>
        {queue || '-'}
      </ColorfulBadge>
    </div>

    <QueueDivider />

    <div
      className='flex flex-col items-start min-w-0'
      style={{ gap: 'var(--dim-space-100, 4px)', flex: '0 1 auto' }}
    >
      <FieldLabel>HN (Hospital Number)</FieldLabel>
      <FieldValue>{hn || '-'}</FieldValue>
    </div>

    <QueueDivider />

    <div
      className='flex flex-col items-start min-w-0'
      style={{ gap: 'var(--dim-space-100, 4px)', flex: '1 1 0' }}
    >
      <FieldLabel>ชื่อ-นามสกุล ผู้ป่วย</FieldLabel>
      <FieldValue>{patientName || '-'}</FieldValue>
    </div>
  </div>
);

const DeleteQueueConfirmPopup = ({
  open,
  onClose,
  onConfirm,
  queue,
  hn,
  patientName,
  avatarSrc,
  title = 'ยืนยันการลบคิว',
  subtitle = 'คิวนี้จะถูกนำออกจากรายการ และไม่สามารถย้อนกลับได้',
}) => {
  return (
    <Popup
      open={open}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      size='large'
      secondaryAction={{ label: 'ยกเลิก', onClick: onClose }}
      primaryAction={{
        label: 'ยืนยัน',
        onClick: onConfirm,
        tone: 'danger',
      }}
    >
      <PatientSummary
        queue={queue}
        hn={hn}
        patientName={patientName}
        avatarSrc={avatarSrc}
      />
    </Popup>
  );
};

export default DeleteQueueConfirmPopup;
