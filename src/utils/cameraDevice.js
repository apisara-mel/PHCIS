/* Shared helpers for Registration "ถ่ายรูป" — native phone camera on mobile,
   Continuity Camera (wireless, no cable) on desktop via getUserMedia. */

export const PHONE_LABEL_HINTS = [
  'iphone', 'ipad', 'continuity', 'android', 'phone', 'mobile',
  'samsung', 'pixel', 'huawei', 'xiaomi', 'oppo', 'vivo', 'oneplus',
  'droidcam', 'epoccam', 'camo', 'iriun', 'desk view', 'continuity camera',
];

const BUILTIN_WEBCAM_HINTS = [
  'facetime', 'built-in', 'builtin', 'integrated', 'isight',
  'hd camera', 'webcam', 'logitech hd', 'microsoft', 'laptop',
];

export const isPhoneLikeLabel = (label = '') => {
  const lower = String(label).toLowerCase();
  return PHONE_LABEL_HINTS.some((hint) => lower.includes(hint));
};

export const isBuiltinWebcamLabel = (label = '') => {
  const lower = String(label).toLowerCase();
  return BUILTIN_WEBCAM_HINTS.some((hint) => lower.includes(hint));
};

/** True on phones / tablets — use `<input capture>` for the native camera app. */
export const isMobileBrowser = () => {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  if (/Android|iPhone|iPod/i.test(ua)) return true;
  if (/iPad/i.test(ua)) return true;
  if (/Mobile/i.test(ua)) return true;
  /* iPadOS desktop UA ("Macintosh") + touch → still a tablet camera flow. */
  if (navigator.maxTouchPoints > 1 && /MacIntel/.test(ua)) return true;
  return false;
};

/** Safari / Chrome on phone — opens the OS camera app (no cable). */
export const preferNativeCameraCapture = () => isMobileBrowser();

/** Use <input capture> on mobile, except in-app browsers that need getUserMedia. */
export const shouldUseNativeCameraInput = () =>
  preferNativeCameraCapture() && !prefersInPageCameraPopup();

/** In-app browsers often ignore `<input capture>` — use in-page getUserMedia instead. */
export const prefersInPageCameraPopup = () => {
  if (!isMobileBrowser()) return false;
  const ua = navigator.userAgent || '';
  return /FBAN|FBAV|Instagram|Line\/|MicroMessenger|Twitter|LinkedInApp|KAKAOTALK/i.test(ua);
};

/** @deprecated Use shouldUseNativeCameraInput() or useTakePhotoCapture hook. */
export const useNativeCameraForTakePhoto = () => shouldUseNativeCameraInput();

/** Prefer iPhone / Continuity (wireless) over the laptop webcam when possible. */
export const pickPreferredVideoDeviceId = (videoInputs = []) => {
  if (!videoInputs.length) return null;
  const phone = videoInputs.find((d) => isPhoneLikeLabel(d.label));
  if (phone?.deviceId) return phone.deviceId;
  const external = videoInputs.find(
    (d) => d.deviceId && !isBuiltinWebcamLabel(d.label) && !isPhoneLikeLabel(d.label),
  );
  if (external?.deviceId) return external.deviceId;
  return null;
};

export const listVideoInputDevices = async () => {
  if (!navigator.mediaDevices?.enumerateDevices) return [];
  const all = await navigator.mediaDevices.enumerateDevices();
  return all
    .filter((d) => d.kind === 'videoinput')
    .map((d) => ({ deviceId: d.deviceId, label: d.label || 'กล้องไม่ระบุชื่อ' }));
};
