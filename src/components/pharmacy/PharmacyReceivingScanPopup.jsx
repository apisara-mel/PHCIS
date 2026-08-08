import React, { useEffect, useRef, useState } from 'react';
import Popup from '@/components/popup/Popup';
import BrandButton from '@/components/button/BrandButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import Icon from '@/components/icons/Icon';
import { DEMO_SCAN_TARGETS } from '@/data/pharmacyReceivingScan';

/* §1.9.7.2 — camera / mock barcode scan for the receiving form.
   Prefer BarcodeDetector + getUserMedia when the browser supports them;
   otherwise fall back to "จำลองสแกน" quick-picks so the TOR demo always works. */

const PharmacyReceivingScanPopup = ({ open, onClose, onScan }) => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(0);
  const [cameraError, setCameraError] = useState('');
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    setCameraError('');
    setScanning(false);

    const stop = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
      streamRef.current?.getTracks?.().forEach((t) => t.stop());
      streamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
    };

    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError('เบราว์เซอร์นี้ไม่รองรับกล้อง — ใช้จำลองสแกนด้านล่างได้');
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setScanning(true);

        const Detector = typeof window !== 'undefined' ? window.BarcodeDetector : null;
        if (!Detector) {
          setCameraError('กล้องพร้อมแล้ว แต่ยังไม่มี BarcodeDetector — กดจำลองสแกนด้านล่าง');
          return;
        }
        const detector = new Detector({ formats: ['ean_13', 'code_128', 'qr_code'] });
        const tick = async () => {
          if (cancelled || !videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            const value = codes?.[0]?.rawValue;
            if (value) {
              onScan?.(value);
              onClose?.();
              return;
            }
          } catch {
            /* keep polling */
          }
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      } catch {
        setCameraError('เปิดกล้องไม่ได้ — อนุญาตสิทธิ์กล้อง หรือใช้จำลองสแกนด้านล่าง');
      }
    };

    start();
    return () => {
      cancelled = true;
      stop();
    };
  }, [open, onClose, onScan]);

  return (
    <Popup
      open={open}
      onClose={onClose}
      size='large'
      title='สแกนข้อมูลเข้าระบบ'
      subtitle='สแกนบาร์โค้ดยา หรือเลขที่ใบสั่งซื้อ / ใบส่งของ'
      tertiaryAction={{ label: 'ปิด', onClick: onClose }}
    >
      <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
        <div
          className='relative w-full overflow-hidden flex items-center justify-center'
          style={{
            aspectRatio: '4 / 3',
            maxHeight: 'var(--dim-size-3200, 320px)',
            background: 'var(--surface-neutral-secondary, #F4F5F5)',
            borderRadius: 'var(--dim-radius-300, 12px)',
            border: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary, #F4F5F5)',
          }}
        >
          <video
            ref={videoRef}
            muted
            playsInline
            className='w-full h-full object-cover'
            style={{ display: scanning ? 'block' : 'none' }}
          />
          {!scanning && (
            <div className='flex flex-col items-center' style={{ gap: 'var(--dim-space-200)', color: 'var(--text-content-tertiary)' }}>
              <Icon name='barcode_scanner' size={40} />
              <span style={{ fontSize: 'var(--type-size-sm)' }}>
                {cameraError || 'กำลังเปิดกล้อง…'}
              </span>
            </div>
          )}
        </div>

        {cameraError && scanning && (
          <p style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary)' }}>
            {cameraError}
          </p>
        )}

        <div className='flex flex-col' style={{ gap: 'var(--dim-space-200)' }}>
          <span style={{ fontSize: 'var(--type-size-sm)', fontWeight: 'var(--type-weight-medium)', color: 'var(--text-content-secondary)' }}>
            จำลองสแกน (สำหรับสาธิต)
          </span>
          <div className='flex flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
            {DEMO_SCAN_TARGETS.map((t) => (
              <NeutralSubdueButton
                key={t.code}
                size='sm'
                variant='outline'
                leadingIcon='barcode'
                onClick={() => { onScan?.(t.code); onClose?.(); }}
              >
                {t.label}
              </NeutralSubdueButton>
            ))}
          </div>
        </div>

        <BrandButton size='sm' leadingIcon='keyboard' onClick={onClose} className='self-start'>
          พิมพ์เลขเองที่ช่องสแกน
        </BrandButton>
      </div>
    </Popup>
  );
};

export default PharmacyReceivingScanPopup;
