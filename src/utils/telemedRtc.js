/* telemedRtc — สายวิดีโอจริงระหว่างแพทย์กับผู้รับบริการ (TOR §1.13.1)

   ก่อนหน้านี้ทั้งสองฝั่งเปิดกล้องตัวเองจริง (getUserMedia) แต่ "ภาพของอีกฝ่าย"
   เป็นรูป mock — ไม่มี RTCPeerConnection อยู่ในระบบเลย. ไฟล์นี้เติมชั้นที่ขาด:
   ต่อสายจริงแบบ peer-to-peer แล้วส่งภาพ/เสียงหากันจริง.

   สิ่งที่ไฟล์นี้ "ไม่" ทำ: มันไม่รู้จักช่องทางส่งข้อความ (signalling) เลย —
   ผู้เรียกต้องส่ง `sendSignal` เข้ามา แล้วป้อนข้อความที่ได้จากอีกฝั่งกลับเข้า
   `handleSignal`. ทำแบบนี้เพราะช่องทางต่างกันตามสภาพ demo:
     · สองแท็บในเครื่องเดียว → BroadcastChannel
     · โน้ตบุ๊ก ↔ มือถือ บน Wi-Fi เดียวกัน → relay ของ dev server
   ดู `telemedSessionBridge.js` ซึ่งรวมทั้งสองช่องไว้ให้แล้ว.

   รูปแบบการเจรจา: "perfect negotiation" (spec ของ W3C) — ฝั่งหนึ่งสุภาพ
   (polite = ยอมถอยเมื่อชนกัน) อีกฝั่งไม่สุภาพ. เรากำหนดให้
     web (แพทย์)    = impolite → เป็นคนเปิดสายก่อน
     mobile (ผู้ป่วย) = polite   → ยอมถอยเมื่อ offer ชนกัน
   ทำให้ต่างฝั่งต่างเริ่มพร้อมกันได้โดยไม่ค้างที่ glare.

   Transceiver ถูกสร้างครั้งเดียวตอนเปิดสาย แล้วเปิด/ปิดกล้อง-ไมค์ด้วย
   replaceTrack() — ไม่ใช่การ add/remove track ทีละครั้ง มิฉะนั้นทุกครั้งที่กด
   ปิดกล้องจะต้องเจรจา SDP ใหม่ทั้งรอบ และภาพอีกฝั่งจะกระตุก. */

/** STUN สาธารณะพอสำหรับ demo ที่อยู่บน Wi-Fi เดียวกัน (ไม่ข้าม NAT ที่เข้มงวด).
    ถ้าต้อง demo ข้ามเครือข่าย/มือถือ 4G ให้ใส่ TURN เพิ่มผ่าน iceServers. */
export const TELEMED_ICE_SERVERS = [
  { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
];

export const TELEMED_RTC_STATE = {
  idle: 'idle',
  connecting: 'connecting',
  connected: 'connected',
  reconnecting: 'reconnecting',
  failed: 'failed',
  closed: 'closed',
};

/** เบราว์เซอร์นี้ต่อสายจริงได้ไหม (บางเบราว์เซอร์ในแอป / http ที่ไม่ใช่ localhost จะไม่มี) */
export const rtcSupported = () => (
  typeof window !== 'undefined'
  && typeof window.RTCPeerConnection === 'function'
  && Boolean(navigator.mediaDevices?.getUserMedia)
);

/**
 * เปิดสาย WebRTC หนึ่งสาย
 * @param {object}   cfg
 * @param {boolean}  cfg.polite        ฝั่งที่ยอมถอยเมื่อ offer ชนกัน (mobile = true)
 * @param {Function} cfg.sendSignal    (payload) => void — ส่งไปให้อีกฝั่ง
 * @param {Function} [cfg.onRemoteStream] (MediaStream) => void
 * @param {Function} [cfg.onState]     (state, detail) => void
 * @param {Array}    [cfg.iceServers]
 */
export const createTelemedPeer = ({
  polite = false,
  sendSignal,
  onRemoteStream,
  onState,
  iceServers,
} = {}) => {
  if (!rtcSupported()) return null;

  const pc = new RTCPeerConnection({ iceServers: iceServers || TELEMED_ICE_SERVERS });
  const remoteStream = new MediaStream();

  /* sendrecv ทั้งคู่ตั้งแต่ต้น — ฝั่งที่ยังไม่เปิดกล้องก็ยังมีช่องรับภาพไว้รอ */
  const videoTx = pc.addTransceiver('video', { direction: 'sendrecv' });
  const audioTx = pc.addTransceiver('audio', { direction: 'sendrecv' });

  let makingOffer = false;
  let ignoreOffer = false;
  let settingRemoteAnswer = false;
  let closed = false;

  const emit = (state, detail) => { if (!closed || state === TELEMED_RTC_STATE.closed) onState?.(state, detail); };

  pc.addEventListener('track', (e) => {
    /* ontrack ยิงแยกต่อ track — รวมเข้า MediaStream เดียวเพื่อผูกกับ <video> ครั้งเดียว */
    if (!remoteStream.getTracks().includes(e.track)) remoteStream.addTrack(e.track);
    e.track.addEventListener('ended', () => {
      try { remoteStream.removeTrack(e.track); } catch { /* ignore */ }
    });
    onRemoteStream?.(remoteStream);
  });

  pc.addEventListener('icecandidate', (e) => {
    if (e.candidate) sendSignal?.({ candidate: e.candidate.toJSON() });
  });

  pc.addEventListener('negotiationneeded', async () => {
    try {
      makingOffer = true;
      await pc.setLocalDescription();
      sendSignal?.({ description: pc.localDescription });
    } catch { /* เจรจาไม่สำเร็จรอบนี้ — negotiate() เรียกซ้ำได้ */ } finally {
      makingOffer = false;
    }
  });

  pc.addEventListener('connectionstatechange', () => {
    switch (pc.connectionState) {
      case 'connected':    emit(TELEMED_RTC_STATE.connected); break;
      case 'connecting':   emit(TELEMED_RTC_STATE.connecting); break;
      case 'disconnected': emit(TELEMED_RTC_STATE.reconnecting); break;
      case 'failed':       emit(TELEMED_RTC_STATE.failed); break;
      case 'closed':       emit(TELEMED_RTC_STATE.closed); break;
      default: break;
    }
  });

  /** รับข้อความจากอีกฝั่ง (description หรือ candidate) */
  const handleSignal = async (payload) => {
    if (!payload || closed) return;
    const { description, candidate } = payload;
    try {
      if (description) {
        const readyForOffer = !makingOffer
          && (pc.signalingState === 'stable' || settingRemoteAnswer);
        const offerCollision = description.type === 'offer' && !readyForOffer;
        ignoreOffer = !polite && offerCollision;
        if (ignoreOffer) return;                       /* ฝั่ง impolite ไม่ถอย */

        settingRemoteAnswer = description.type === 'answer';
        await pc.setRemoteDescription(description);
        settingRemoteAnswer = false;

        if (description.type === 'offer') {
          await pc.setLocalDescription();
          sendSignal?.({ description: pc.localDescription });
        }
      } else if (candidate) {
        try {
          await pc.addIceCandidate(candidate);
        } catch (err) {
          if (!ignoreOffer) throw err;                 /* candidate ของ offer ที่ทิ้งไป */
        }
      }
    } catch { /* ข้อความเสีย/มาผิดจังหวะ — ปล่อยให้รอบถัดไปแก้ */ }
  };

  /**
   * บังคับเปิดการเจรจา — ใช้เมื่ออีกฝั่งเพิ่งเข้ามา (offer รอบแรกตกหายไปแล้ว
   * เพราะยังไม่มีใครฟัง) หรือเมื่อ ICE ล้มแล้วต้องเริ่มใหม่
   */
  const negotiate = async ({ iceRestart = false } = {}) => {
    if (closed) return;
    try {
      makingOffer = true;
      await pc.setLocalDescription(iceRestart ? await pc.createOffer({ iceRestart: true }) : undefined);
      sendSignal?.({ description: pc.localDescription });
      /* อย่าทับสถานะของสายที่ต่อติดอยู่แล้ว — การเจรจาใหม่ระหว่างสาย (เช่นเริ่ม
         แชร์หน้าจอ) ไม่ได้ทำให้สายหลุด และ connectionstatechange จะไม่ยิงซ้ำให้
         สถานะกลับมาเป็น connected เอง ผลคือ UI ค้างอยู่ที่ "กำลังเชื่อมต่อ" ตลอด */
      if (pc.connectionState !== 'connected') emit(TELEMED_RTC_STATE.connecting);
    } catch { /* ignore */ } finally {
      makingOffer = false;
    }
  };

  /** ใส่/ถอดภาพที่เราส่งออก — null = ปิดกล้อง (สายยังอยู่, ไม่ต้องเจรจาใหม่) */
  const setVideoTrack = async (track) => {
    try { await videoTx.sender.replaceTrack(track || null); } catch { /* ignore */ }
  };

  /** ใส่/ถอดเสียงที่เราส่งออก */
  const setAudioTrack = async (track) => {
    try { await audioTx.sender.replaceTrack(track || null); } catch { /* ignore */ }
  };

  /** ผูก stream ทั้งก้อน (สะดวกกว่าเมื่อ getUserMedia คืนมาใหม่ทั้งอัน) */
  const setLocalStream = async (stream) => {
    await setVideoTrack(stream?.getVideoTracks?.()[0] || null);
    await setAudioTrack(stream?.getAudioTracks?.()[0] || null);
  };

  const close = () => {
    if (closed) return;
    closed = true;
    try { pc.getSenders().forEach((s) => { try { s.replaceTrack(null); } catch { /* ignore */ } }); } catch { /* ignore */ }
    try { pc.close(); } catch { /* ignore */ }
    emit(TELEMED_RTC_STATE.closed);
  };

  /** สถิติสายจริง — ใช้แทน "จำลองสัญญาณ" บนแบนเนอร์คุณภาพสาย */
  const readStats = async () => {
    if (closed) return null;
    try {
      const report = await pc.getStats();
      let rttMs = null;
      let lossPct = null;
      let kbps = null;
      report.forEach((s) => {
        if (s.type === 'candidate-pair' && s.state === 'succeeded' && s.currentRoundTripTime != null) {
          rttMs = Math.round(s.currentRoundTripTime * 1000);
        }
        if (s.type === 'inbound-rtp' && s.kind === 'video') {
          const total = (s.packetsReceived || 0) + (s.packetsLost || 0);
          if (total > 0) lossPct = Math.round(((s.packetsLost || 0) / total) * 1000) / 10;
          if (s.bytesReceived != null) kbps = Math.round((s.bytesReceived * 8) / 1000);
        }
      });
      return { rttMs, lossPct, kbps };
    } catch {
      return null;
    }
  };

  return {
    pc,
    remoteStream,
    handleSignal,
    negotiate,
    setLocalStream,
    setVideoTrack,
    setAudioTrack,
    readStats,
    close,
    isClosed: () => closed,
    /* อ่านจาก pc ตรง ๆ ไม่ผ่าน state ของ React — ผู้เรียกที่อยู่ใน closure เก่า
       ต้องเห็นค่าปัจจุบัน ไม่ใช่ค่าตอนที่ closure ถูกสร้าง */
    isConnected: () => !closed && pc.connectionState === 'connected',
  };
};

/** แปลงสถิติเป็นระดับสัญญาณเดียวกับที่ UI ใช้อยู่ ('good' | 'weak' | 'lost') */
export const gradeConnection = (state, stats) => {
  if (state === TELEMED_RTC_STATE.failed || state === TELEMED_RTC_STATE.closed) return 'lost';
  if (state === TELEMED_RTC_STATE.reconnecting) return 'weak';
  if (state !== TELEMED_RTC_STATE.connected) return 'good';
  if (!stats) return 'good';
  if ((stats.rttMs != null && stats.rttMs > 400) || (stats.lossPct != null && stats.lossPct > 5)) return 'weak';
  return 'good';
};
