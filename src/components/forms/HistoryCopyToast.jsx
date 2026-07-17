import React from 'react';
import PhcisTopToast, { PHCIS_TOP_TOAST_CYCLE_MS } from '@/components/alert/PhcisTopToast';

/* History copy feedback — delegates to PhcisTopToast (Figma 322:49597). */

/** @deprecated Import `PHCIS_TOP_TOAST_CYCLE_MS` from PhcisTopToast instead. */
export const HISTORY_COPY_TOAST_CYCLE_MS = PHCIS_TOP_TOAST_CYCLE_MS;

/**
 * @param {{ id: number, variant: 'success'|'error' } | null} props.session
 * @param {() => void} props.onDismiss
 */
export default function HistoryCopyToast({ session, onDismiss }) {
  const mapped = session
    ? {
      ...session,
      message: session.variant === 'error' ? 'คัดลอกไม่สำเร็จ' : 'คัดลอกสำเร็จ',
    }
    : null;
  return <PhcisTopToast session={mapped} onDismiss={onDismiss} />;
}
