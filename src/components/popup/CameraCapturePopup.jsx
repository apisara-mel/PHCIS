import React, { useCallback, useEffect, useRef, useState } from 'react';
import Popup from '@/components/popup/Popup';
import Select from '@/components/forms/Select';
import {
  isMobileBrowser,
  isPhoneLikeLabel,
  listVideoInputDevices,
  pickPreferredVideoDeviceId,
} from '@/utils/cameraDevice';

/* MIH CameraCapturePopup — used by the Registration form's "ถ่ายรูป"
   button (Figma PHCIS-ALL 2373:119045 / 1:3964) to capture a patient photo
   without leaving the page.

   Pipeline: getUserMedia → <video> live preview → snapshot to <canvas> →
   export as PNG data URL → hand back via `onCapture(dataUrl)` then close.

   Device picker: after permission we enumerate video inputs and auto-start
   a phone-like device when connected (Continuity Camera, USB phone, etc.).
   On mobile browsers the parent PhotoCluster opens the OS camera via
   `<input capture>` instead of this popup.

   On close we stop every MediaStreamTrack so the OS camera indicator turns
   off and the device isn't held by a hidden stream. */

const CameraCapturePopup = ({ open, onClose, onCapture }) => {
  const videoRef  = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [status, setStatus] = useState('idle'); /* idle | live | denied | error */
  const [errorMsg, setErrorMsg] = useState('');
  const [devices, setDevices] = useState([]); /* {deviceId, label} */
  const [activeDeviceId, setActiveDeviceId] = useState(null);
  /* Track whether we've already auto-picked a phone on this popup session
     so changing devices manually doesn't get overridden when we re-enumerate
     after a stream restart. */
  const autoPickedRef = useRef(false);

  /* Stop whatever stream is currently held so the camera indicator turns
     off before we ask for a new one. Used by both the unmount cleanup
     and the deviceId switcher. */
  const stopStream = useCallback(() => {
    const stream = streamRef.current;
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  /* Start (or restart) the camera. When `deviceId` is provided we pin to
     that input; otherwise we let the browser pick the user-facing camera.
     The function is idempotent — stops the prior stream first. */
  const startStream = useCallback(async (deviceId) => {
    stopStream();
    setStatus('idle');
    setErrorMsg('');
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('เบราว์เซอร์นี้ไม่รองรับการเข้าถึงกล้อง');
      }
      /* `ideal` (not `exact`) — Continuity Camera / USB phones often fail with
         exact constraints when the device is still negotiating. */
      const constraints = {
        video: deviceId
          ? { deviceId: { ideal: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }
          : isMobileBrowser()
            ? { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }
            : { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      /* Resolve which device we actually got — the browser may have
         substituted if the requested one became unavailable. */
      const trackSettings = stream.getVideoTracks()[0]?.getSettings?.();
      if (trackSettings?.deviceId) setActiveDeviceId(trackSettings.deviceId);
      setStatus('live');
      return stream;
    } catch (err) {
      const name = err?.name || '';
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        setStatus('denied');
        setErrorMsg('กรุณาอนุญาตให้เบราว์เซอร์เข้าถึงกล้อง');
      } else if (name === 'NotFoundError' || name === 'OverconstrainedError') {
        setStatus('error');
        setErrorMsg('ไม่พบกล้องที่ใช้งานได้');
      } else {
        setStatus('error');
        setErrorMsg(err?.message || 'ไม่สามารถเปิดกล้องได้');
      }
      return null;
    }
  }, [stopStream]);

  const refreshDevicesAndStream = useCallback(async (opts = {}) => {
    const { forcePhone = false } = opts;
    try {
      const videoIns = await listVideoInputDevices();
      setDevices(videoIns);

      const preferredId = pickPreferredVideoDeviceId(videoIns);
      const shouldAutoPick = forcePhone || !autoPickedRef.current;
      if (shouldAutoPick && preferredId) {
        autoPickedRef.current = true;
        await startStream(preferredId);
      } else if (!isMobileBrowser() && !preferredId) {
        setStatus('idle');
        setErrorMsg(
          'เปิด iPhone ใกล้ Mac เพื่อใช้ Continuity Camera (ไม่ต้องเสียบสาย) — ระบบจะเชื่อมอัตโนมัติเมื่อพร้อม',
        );
      } else if (isMobileBrowser() && shouldAutoPick) {
        await startStream(null);
      }
      return videoIns;
    } catch (err) {
      setStatus('error');
      setErrorMsg(err?.message || 'ไม่สามารถเปิดกล้องได้');
      return [];
    }
  }, [startStream]);

  /* Initial open: grant permission, enumerate, then start the phone-like
     camera first (Continuity / USB) instead of flashing the laptop webcam. */
  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    autoPickedRef.current = false;
    setDevices([]);
    setActiveDeviceId(null);

    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus('error');
        setErrorMsg('เบราว์เซอร์นี้ไม่รองรับการเข้าถึงกล้อง');
        return;
      }
      try {
        /* Short probe so enumerateDevices() returns real labels (iPhone / Continuity). */
        const probe = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        probe.getTracks().forEach((t) => t.stop());
        if (cancelled) return;

        await refreshDevicesAndStream({ forcePhone: true });
      } catch (err) {
        if (cancelled) return;
        const name = err?.name || '';
        if (name === 'NotAllowedError' || name === 'SecurityError') {
          setStatus('denied');
          setErrorMsg('กรุณาอนุญาตให้เบราว์เซอร์เข้าถึงกล้อง — หากใช้ iPhone ให้เปิด Continuity Camera บน Mac');
        } else {
          setStatus('error');
          setErrorMsg(err?.message || 'ไม่สามารถเปิดกล้องได้');
        }
      }
    })();

    const onDeviceChange = () => {
      if (cancelled) return;
      refreshDevicesAndStream({ forcePhone: true });
    };
    navigator.mediaDevices?.addEventListener?.('devicechange', onDeviceChange);

    return () => {
      cancelled = true;
      navigator.mediaDevices?.removeEventListener?.('devicechange', onDeviceChange);
      stopStream();
    };
  }, [open, refreshDevicesAndStream, stopStream]);

  const handlePickDevice = async (deviceId) => {
    if (!deviceId) return;
    await startStream(deviceId);
  };

  const handleCapture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || status !== 'live') return;
    const w = video.videoWidth  || 1280;
    const h = video.videoHeight || 720;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, w, h);
    const dataUrl = canvas.toDataURL('image/png');
    onCapture?.(dataUrl);
    onClose?.();
  };

  const phoneDevices = devices.filter((d) => isPhoneLikeLabel(d.label));
  const showPicker = devices.length > 1;
  const hasPhoneOption = phoneDevices.length > 0;
  const activeDevice = devices.find((d) => d.deviceId === activeDeviceId);
  const activeIsPhone = isMobileBrowser() || isPhoneLikeLabel(activeDevice?.label);
  const showPhoneConnected = activeIsPhone && status === 'live';
  const canCapture = status === 'live';

  return (
    <Popup
      open={open}
      onClose={onClose}
      title='ถ่ายรูปผู้รับบริการ'
      subtitle={
        isMobileBrowser()
          ? 'ใช้กล้องหลังของโทรศัพท์เพื่อถ่ายภาพ แล้วกด "ถ่ายรูป"'
          : hasPhoneOption
            ? 'ใช้กล้อง iPhone ผ่าน Continuity Camera (ไม่ต้องเสียบสาย) แล้วกด "ถ่ายรูป"'
            : 'เปิด iPhone ใกล้ Mac เพื่อใช้ Continuity Camera แบบไร้สาย แล้วกด "ถ่ายรูป"'
      }
      size='large'
      primaryAction={{
        label: 'ถ่ายรูป',
        onClick: handleCapture,
        disabled: !canCapture,
      }}
      secondaryAction={{ label: 'ยกเลิก', onClick: onClose }}
    >
      <div className='flex w-full flex-col items-stretch' style={{ gap: 'var(--dim-space-300)' }}>
        {/* Device picker — appears once enumerateDevices reports more than
            one video input. Aliases the design-system Select; the "เชื่อมต่อ
            โทรศัพท์" chip next to the field name confirms the active device
            is a phone-like input (Continuity Camera, USB phone, etc.). */}
        {(showPicker || showPhoneConnected) && (
          <div className='flex w-full flex-col' style={{ gap: 'var(--dim-space-100)' }}>
            <div
              className='inline-flex items-center flex-wrap'
              style={{
                gap: 'var(--dim-space-150)',
                color: 'var(--text-content-default)',
                fontFamily: 'var(--type-family-body)',
                fontWeight: 'var(--type-weight-medium)',
                fontSize: 'var(--type-size-sm)',
              }}
            >
              {showPicker ? 'เลือกกล้อง' : 'กล้องที่ใช้งาน'}
              {showPhoneConnected && (
                <span
                  style={{
                    padding: '2px var(--dim-space-200)',
                    borderRadius: 'var(--dim-radius-full)',
                    background: 'var(--surface-brandPrimary-quaternary, #F4FBF8)',
                    color: 'var(--text-brandPrimary-default, #007549)',
                    fontSize: 'var(--type-size-xs)',
                  }}
                >
                  เชื่อมต่อโทรศัพท์
                </span>
              )}
              {showPhoneConnected && !showPicker && activeDevice?.label && (
                <span
                  style={{
                    color: 'var(--text-content-secondary)',
                    fontSize: 'var(--type-size-xs)',
                    fontWeight: 'var(--type-weight-regular)',
                  }}
                >
                  {activeDevice.label}
                </span>
              )}
            </div>
            {showPicker && (
              <Select
                value={activeDeviceId || ''}
                onChange={handlePickDevice}
                options={devices.map((d) => ({
                  value: d.deviceId,
                  label: `${d.label}${isPhoneLikeLabel(d.label) ? '  📱' : ''}`,
                }))}
                placeholder='เลือกกล้อง'
                showFieldName={false}
                showLabel={false}
                showHelperText={false}
                searchable={false}
                size='md'
              />
            )}
          </div>
        )}

        <div
          className='relative w-full overflow-hidden'
          style={{
            aspectRatio: '4 / 3',
            background: 'var(--surface-neutral-secondary, #1F2937)',
            borderRadius: 'var(--dim-radius-400, 12px)',
          }}
        >
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            /* Mirror only when the active device looks like a laptop's
               front-facing webcam. Phone cameras are typically used to
               capture the patient (not the operator), so mirroring would
               just confuse what the doctor is seeing. */
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: activeIsPhone ? 'none' : 'scaleX(-1)',
            }}
          />
          {status !== 'live' && (
            <div
              className='absolute inset-0 flex items-center justify-center text-center'
              style={{
                background: 'var(--surface-overlay-default)',
                color: '#FFFFFF',
                fontFamily: 'var(--type-family-body)',
                fontSize: 'var(--type-size-sm)',
                padding: 'var(--dim-space-400)',
              }}
            >
              {status === 'idle' && (errorMsg || 'กำลังเปิดกล้อง…')}
              {status === 'denied' && errorMsg}
              {status === 'error' && errorMsg}
            </div>
          )}
        </div>
        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>
    </Popup>
  );
};

export default CameraCapturePopup;
