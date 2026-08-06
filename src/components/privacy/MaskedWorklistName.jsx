import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PrivacyRevealPopup from '@/components/popup/PrivacyRevealPopup';
import { EllipsisText } from '@/components/table/Table';
import { maskWorklistName } from '@/utils/piiMasking';
import {
  getWorklistNameRevealExpiresAt,
  isWorklistNameRevealed,
  logWorklistNameReveal,
  markWorklistNameRevealed,
} from '@/data/worklistPiiReveal';

/* MaskedWorklistName — ชื่อใน worklist ทุกโมดูล
   แสดง 3 ตัวแรก + 3 ตัวท้าย · คลิกชื่อ → PrivacyRevealPopup → แสดงชื่อเต็ม 30 นาที */

const LINK_STYLE = {
  color: 'var(--text-neutral-default)',
  fontWeight: 'var(--type-weight-medium)',
  cursor: 'pointer',
  textDecoration: 'none',
};

const BUTTON_STYLE = {
  ...LINK_STYLE,
  background: 'none',
  border: 'none',
  padding: 0,
  margin: 0,
  font: 'inherit',
  textAlign: 'left',
};

export default function MaskedWorklistName({
  name,
  recordKey = '',
  fieldLabel = 'ชื่อ-นามสกุล ของผู้รับบริการ',
  linkTo = null,
  onRevealedClick = null,
  className = 'min-w-0 flex-1 truncate',
  style = {},
  truncate = true,
  emptyLabel = '—',
  stopPropagation = true,
  onReveal,
}) {
  const full = String(name ?? '').trim();
  const revealKey = recordKey || full;
  const [revealed, setRevealed] = useState(() => isWorklistNameRevealed(revealKey));
  const [popupOpen, setPopupOpen] = useState(false);

  /* หมดเวลา 30 นาที → กลับมา masking อัตโนมัติ */
  useEffect(() => {
    if (!revealed || !revealKey) return undefined;
    const sync = () => setRevealed(isWorklistNameRevealed(revealKey));
    sync();
    const expiresAt = getWorklistNameRevealExpiresAt(revealKey);
    if (!expiresAt) {
      setRevealed(false);
      return undefined;
    }
    const ms = expiresAt - Date.now();
    if (ms <= 0) {
      setRevealed(false);
      return undefined;
    }
    const timer = setTimeout(() => setRevealed(false), ms);
    return () => clearTimeout(timer);
  }, [revealed, revealKey]);

  if (!full) {
    return <span className={className} style={style}>{emptyLabel}</span>;
  }

  const masked = maskWorklistName(full);
  const text = revealed ? full : masked;

  const handleRevealRequest = (e) => {
    if (stopPropagation) e.stopPropagation();
    if (revealed) return;
    e.preventDefault?.();
    setPopupOpen(true);
  };

  const handleConfirmReveal = () => {
    markWorklistNameRevealed(revealKey);
    logWorklistNameReveal(revealKey, fieldLabel);
    onReveal?.();
    setRevealed(true);
    setPopupOpen(false);
  };

  const textNode = truncate
    ? <EllipsisText text={text} className={className} fill={false} />
    : <span className={className} style={style}>{text}</span>;

  let control = null;
  if (revealed && linkTo) {
    control = (
      <Link
        to={linkTo}
        className={`${className} hover:underline`.trim()}
        style={{ ...LINK_STYLE, ...style }}
        onClick={(e) => { if (stopPropagation) e.stopPropagation(); }}
      >
        {textNode}
      </Link>
    );
  } else if (revealed && onRevealedClick) {
    control = (
      <button
        type='button'
        className={`${className} hover:underline`.trim()}
        style={{ ...BUTTON_STYLE, ...style }}
        onClick={(e) => {
          if (stopPropagation) e.stopPropagation();
          onRevealedClick(e);
        }}
      >
        {textNode}
      </button>
    );
  } else if (revealed) {
    control = (
      <span className={className} style={style}>{textNode}</span>
    );
  } else {
    control = (
      <button
        type='button'
        className={`${className} hover:underline`.trim()}
        style={{ ...BUTTON_STYLE, ...style }}
        aria-label={`แสดง${fieldLabel}`}
        onClick={handleRevealRequest}
      >
        {textNode}
      </button>
    );
  }

  return (
    <>
      {control}
      <PrivacyRevealPopup
        open={popupOpen}
        fieldLabel={fieldLabel}
        onClose={() => setPopupOpen(false)}
        onConfirm={handleConfirmReveal}
      />
    </>
  );
}
