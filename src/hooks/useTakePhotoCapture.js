import { useRef, useState } from 'react';
import {
  isMobileBrowser,
  shouldUseNativeCameraInput,
} from '@/utils/cameraDevice';

let __mihTakePhotoInputSeq = 0;

/**
 * Shared "ถ่ายรูป" flow:
 *   • Phone/tablet (Safari, Chrome): native OS camera via `<input capture>` — no cable.
 *   • Phone in-app (LINE, etc.): in-page rear camera popup.
 *   • Desktop: CameraCapturePopup — prefers Continuity Camera (wireless iPhone near Mac).
 *
 * @param {(payload: { file?: File, dataUrl?: string }) => void} onCapture
 */
export function useTakePhotoCapture(onCapture) {
  const cameraInputRef = useRef(null);
  const inputIdRef = useRef(null);
  if (inputIdRef.current == null) {
    __mihTakePhotoInputSeq += 1;
    inputIdRef.current = `mih-take-photo-${__mihTakePhotoInputSeq}`;
  }
  const cameraInputId = inputIdRef.current;
  const [cameraOpen, setCameraOpen] = useState(false);
  const useNativeInput = shouldUseNativeCameraInput();

  const deliverFile = (file) => {
    if (!file) return;
    onCapture?.({ file });
  };

  const deliverDataUrl = (dataUrl) => {
    if (!dataUrl) return;
    onCapture?.({ dataUrl });
  };

  const openTakePhoto = () => {
    if (useNativeInput) {
      cameraInputRef.current?.click();
      return;
    }
    setCameraOpen(true);
  };

  const handleNativeInput = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) {
      deliverFile(file);
      return;
    }
    if (isMobileBrowser()) setCameraOpen(true);
  };

  const handlePopupCapture = (dataUrl) => {
    deliverDataUrl(dataUrl);
    setCameraOpen(false);
  };

  const closePopup = () => setCameraOpen(false);

  return {
    cameraInputId,
    cameraInputRef,
    cameraOpen,
    /* Alias kept for callers — true when the hidden <input capture> path is used. */
    useNativeCapture: useNativeInput,
    useNativeInput,
    openTakePhoto,
    handleNativeInput,
    handlePopupCapture,
    closePopup,
  };
}

export default useTakePhotoCapture;
