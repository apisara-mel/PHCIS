import React, { useEffect } from 'react';
import { Redirect, useParams } from 'react-router-dom';

/** Production kiosk app — namonlims/bma.kiosk · main branch. */
export const KIOSK_PRODUCTION_URL = 'https://bma-kiosk.mih.co.th/Kiosk/02-insert-id-card';

/** Legacy /kiosk → external production app (old in-repo UI removed). */
export function KioskExternalRedirect() {
  useEffect(() => {
    window.location.replace(KIOSK_PRODUCTION_URL);
  }, []);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--type-family-body, Sarabun, sans-serif)',
        background: 'var(--background-screen-brand-100, #FAFCFA)',
        color: 'var(--text-content-default, #171A1F)',
        fontSize: 'var(--type-size-xl, 20px)',
      }}
    >
      กำลังไปยังตู้ Kiosk…
    </div>
  );
}

/** Legacy QR target — forward to live queue status (TOR 1.3.4.4). */
export function KioskTicketRedirect() {
  const { queueId } = useParams();
  const q = encodeURIComponent(queueId || '');
  return <Redirect to={`/queue-center/display/online?q=${q}`} />;
}
