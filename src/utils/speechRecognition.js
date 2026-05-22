/* Speech-to-text helpers — VoiceTextarea / VoiceInputField.
   Mobile: request mic permission via getUserMedia before SpeechRecognition
   (required on iOS Safari + Android Chrome). Desktop: prefer a connected
   phone / Continuity microphone when enumerating audio inputs. */

import { isMobileBrowser, isPhoneLikeLabel } from '@/utils/cameraDevice';

export function getSpeechRecognitionCtor() {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

export const isSpeechRecognitionAvailable = () => Boolean(getSpeechRecognitionCtor());

/* Return the FIRST phone-like audio input (Continuity Mic, USB mic on a
   paired phone, EpocCam audio, etc.) so the caller can prime it before
   SpeechRecognition starts. Returns both the deviceId and the label so
   the UI can surface "เชื่อมต่อโทรศัพท์ — [label]". */
const pickPreferredAudioInput = async () => {
  if (!navigator.mediaDevices?.enumerateDevices) return null;
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const inputs = devices.filter((d) => d.kind === 'audioinput');
    const phone = inputs.find((d) => isPhoneLikeLabel(d.label));
    if (!phone) return null;
    return { deviceId: phone.deviceId, label: phone.label || 'โทรศัพท์' };
  } catch {
    return null;
  }
};

/** Prime the OS/browser to use the device mic (or a connected phone mic on
    desktop). Resolves with `{ ok, deviceLabel?, isPhone? }` so the caller
    can show a "phone connected" chip while recording. `deviceLabel` is
    the chosen input's label (empty when the browser hasn't unmasked it),
    `isPhone` is true when the auto-picker matched a phone-like device. */
export async function ensureMicrophoneAccess() {
  if (!navigator.mediaDevices?.getUserMedia) {
    return { ok: true };
  }
  try {
    let audio = true;
    let isPhone = false;
    let deviceLabel = '';

    const phoneInput = await pickPreferredAudioInput();
    if (phoneInput) {
      audio = { deviceId: { ideal: phoneInput.deviceId } };
      isPhone = true;
      deviceLabel = phoneInput.label;
    } else if (isMobileBrowser()) {
      /* Phone browser → built-in mic; OS handles routing. */
      isPhone = true;
      deviceLabel = 'ไมค์โทรศัพท์';
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio });

    /* `enumerateDevices()` masks labels until the FIRST grant. Re-probe
       after permission so the caller gets a real device label (e.g.
       "iPhone Microphone") instead of an empty string. */
    if (!deviceLabel && navigator.mediaDevices?.enumerateDevices) {
      try {
        const trackLabel = stream.getAudioTracks?.()[0]?.label;
        if (trackLabel) {
          deviceLabel = trackLabel;
          if (isPhoneLikeLabel(trackLabel)) isPhone = true;
        }
      } catch {
        /* ignore — label is best-effort */
      }
    }

    stream.getTracks().forEach((t) => t.stop());
    return { ok: true, deviceLabel, isPhone };
  } catch (err) {
    return { ok: false, error: err };
  }
}

const speechErrorMessage = (err) => {
  const code = err?.error || err?.name;
  if (code === 'not-allowed' || code === 'NotAllowedError' || code === 'permission-denied') {
    return 'ไม่สามารถใช้ไมโครโฟนได้ — กรุณาอนุญาตการใช้ไมค์ในเบราว์เซอร์หรือการตั้งค่าโทรศัพท์';
  }
  if (code === 'no-speech') {
    return 'ไม่พบเสียงพูด กรุณาลองอีกครั้ง';
  }
  if (code === 'aborted') return '';
  return 'ไม่สามารถเริ่มบันทึกเสียงได้ กรุณาลองอีกครั้ง';
};

/**
 * Start a single-utterance recognition session. Returns the instance (call .stop() to end).
 * @param {{ lang: string, onTranscript: (text: string) => void, onEnd?: () => void, onError?: (message: string) => void }} opts
 */
export function startSpeechRecognition({ lang, onTranscript, onEnd, onError }) {
  const Ctor = getSpeechRecognitionCtor();
  if (!Ctor) return null;

  const rec = new Ctor();
  rec.lang = lang;
  rec.interimResults = false;
  rec.continuous = false;
  rec.maxAlternatives = 1;

  rec.onresult = (ev) => {
    const transcript = Array.from(ev.results)
      .map((r) => r[0]?.transcript ?? '')
      .join(' ')
      .trim();
    if (transcript) onTranscript?.(transcript);
  };

  rec.onend = () => onEnd?.();

  rec.onerror = (ev) => {
    const msg = speechErrorMessage(ev);
    if (msg) onError?.(msg);
    onEnd?.();
  };

  try {
    rec.start();
  } catch (err) {
    onError?.(speechErrorMessage(err) || 'ไม่สามารถเริ่มบันทึกเสียงได้');
    onEnd?.();
    return null;
  }

  return rec;
}

export function stopSpeechRecognition(rec) {
  if (!rec) return;
  try {
    rec.stop();
  } catch {
    /* already stopped */
  }
  try {
    rec.abort?.();
  } catch {
    /* ignore */
  }
}
