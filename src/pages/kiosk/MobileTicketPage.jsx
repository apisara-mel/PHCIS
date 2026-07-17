import React, { useRef, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';

/* MIH PHCIS · Kiosk Mobile Ticket Page
   Target of the QR code shown at the kiosk after queue issuance.
   Visitor scans → opens this URL on their phone → views the ticket +
   "บันทึกภาพ" downloads the ticket as a PNG to their device.

   URL shape:  /kiosk/ticket/A-042?dept=คลินิกโรคเรื้อรัง&name=...&hn=...&zone=...&calling=...&eta=...

   Image generation is pure-Canvas (no library) — we paint a fixed-layout
   800×1000px PNG that mirrors the on-screen card and download it via
   <a download>. Works on iOS Safari + Android Chrome:
   - iOS: file lands in Files; long-press the image preview to "Save to Photos"
   - Android: file lands in Downloads; auto-shows in Photos

   Standalone surface (no Sidebar/Header) — mobile-first, max width 480.
*/

const Sym = ({ name, size = 24, color, fill = false }) => (
  <span
    aria-hidden
    className='material-symbols-outlined'
    style={{
      fontFamily: 'Material Symbols Outlined',
      fontSize: size,
      lineHeight: 1,
      color: color || 'inherit',
      fontVariationSettings: `'FILL' ${fill ? 1 : 0}, 'wght' 400, 'GRAD' 0, 'opsz' ${size}`,
      userSelect: 'none',
    }}
  >
    {name}
  </span>
);

const FACILITY = 'สำนักอนามัย · ศูนย์ 4 ดินแดง';

/* Render the ticket to an 800×1000 canvas and trigger a PNG download.
   Brand-green header gradient, white card body, big queue number. */
const downloadTicketImage = ({ queueId, dept, name, hn, zone, calling, eta }) => {
  const W = 800, H = 1000;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  /* Background */
  ctx.fillStyle = '#FAFCFA';
  ctx.fillRect(0, 0, W, H);

  /* Brand header — linear gradient */
  const grad = ctx.createLinearGradient(0, 0, W, 0);
  grad.addColorStop(0, '#54AA8C');
  grad.addColorStop(1, '#4CC6AE');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, 120);

  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.font = 'bold 32px Sarabun, sans-serif';
  ctx.fillText(FACILITY, W / 2, 70);
  ctx.font = '20px Sarabun, sans-serif';
  ctx.fillText('PHCIS — บัตรคิวอิเล็กทรอนิกส์', W / 2, 100);

  /* Card body — rounded white card */
  const cardX = 40, cardY = 160, cardW = W - 80, cardH = H - 200;
  ctx.fillStyle = '#FFFFFF';
  roundRect(ctx, cardX, cardY, cardW, cardH, 24);
  ctx.fill();
  ctx.strokeStyle = '#B1E6CD';
  ctx.lineWidth = 2;
  ctx.stroke();

  /* "บัตรคิวของคุณ" + dept */
  ctx.textAlign = 'center';
  ctx.fillStyle = '#565D6D';
  ctx.font = '24px Sarabun, sans-serif';
  ctx.fillText('บัตรคิวของคุณ', W / 2, cardY + 60);
  ctx.fillStyle = '#007549';
  ctx.font = 'bold 32px Sarabun, sans-serif';
  ctx.fillText(`แผนก ${dept || '—'}`, W / 2, cardY + 110);

  /* Queue number box */
  const boxX = cardX + 30, boxY = cardY + 150, boxW = cardW - 60, boxH = 220;
  ctx.fillStyle = '#F7FCFA';
  roundRect(ctx, boxX, boxY, boxW, boxH, 16);
  ctx.fill();
  ctx.fillStyle = '#007549';
  ctx.font = 'bold 168px Inter, sans-serif';
  ctx.fillText(queueId || '—', W / 2, boxY + 160);

  /* Patient + meta rows */
  let y = boxY + boxH + 50;
  ctx.fillStyle = '#171A1F';
  ctx.font = 'bold 24px Sarabun, sans-serif';
  ctx.fillText(name || '—', W / 2, y);
  y += 36;
  ctx.fillStyle = '#858C92';
  ctx.font = '18px Sarabun, sans-serif';
  ctx.fillText(`HN ${hn || '—'}`, W / 2, y);

  /* Two-row stats */
  y += 60;
  ctx.fillStyle = '#565D6D';
  ctx.font = '20px Sarabun, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('คิวที่กำลังเรียก', cardX + 60, y);
  ctx.fillText('เวลารอประมาณ', cardX + 60, y + 36);
  ctx.fillStyle = '#171A1F';
  ctx.font = 'bold 24px Inter, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(calling || '—', cardX + cardW - 60, y);
  ctx.font = 'bold 24px Sarabun, sans-serif';
  ctx.fillText(`~ ${eta || '—'} นาที`, cardX + cardW - 60, y + 36);

  /* Zone */
  y += 110;
  ctx.fillStyle = '#565D6D';
  ctx.font = '20px Sarabun, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('กรุณาไปนั่งรอที่', W / 2, y);
  ctx.fillStyle = '#171A1F';
  ctx.font = 'bold 22px Sarabun, sans-serif';
  ctx.fillText(zone || '—', W / 2, y + 32);

  /* Footer disclaimer + date */
  ctx.fillStyle = '#858C92';
  ctx.font = '14px Sarabun, sans-serif';
  const stamp = new Date().toLocaleString('th-TH', { dateStyle: 'long', timeStyle: 'short' });
  ctx.fillText(`ออกบัตรเมื่อ ${stamp}`, W / 2, H - 60);

  /* Download */
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const ymd = new Date().toISOString().slice(0, 10);
    a.download = `queue-${queueId || 'ticket'}-${ymd}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, 'image/png');
};

const roundRect = (ctx, x, y, w, h, r) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
};

const MobileTicketPage = () => {
  const { queueId } = useParams();
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  const dept = params.get('dept') || '—';
  const name = params.get('name') || '—';
  const hn = params.get('hn') || '—';
  const zone = params.get('zone') || '—';
  const calling = params.get('calling') || '—';
  const eta = params.get('eta') || '—';

  const ticketRef = useRef(null);
  const [saved, setSaved] = useState(false);

  const onSave = () => {
    downloadTicketImage({ queueId, dept, name, hn, zone, calling, eta });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--background-screen-brand-100, #FAFCFA)',
        fontFamily: 'var(--type-family-body)',
        padding: 'var(--dim-space-400, 16px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 480,
          background: 'linear-gradient(90deg, #54AA8C 0%, #4CC6AE 100%)',
          color: 'var(--text-content-on-content)',
          padding: 'var(--dim-space-400, 16px) var(--dim-space-600, 24px)',
          borderRadius: 'var(--dim-radius-450, 14px)',
          marginBottom: 'var(--dim-space-400, 16px)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--dim-space-300, 12px)',
          boxShadow: 'var(--shadow-brand-drop-bottom-200)',
        }}
      >
        <Sym name='health_and_safety' size={28} color='#FFFFFF' fill />
        <div>
          <p style={{ margin: 0, fontSize: 'var(--type-size-base, 16px)', fontWeight: 'var(--type-weight-bold, 700)' }}>{FACILITY}</p>
          <p style={{ margin: 0, fontSize: 'var(--type-size-xs, 12px)', opacity: 0.9 }}>PHCIS · บัตรคิวอิเล็กทรอนิกส์</p>
        </div>
      </div>

      <div
        ref={ticketRef}
        style={{
          width: '100%',
          maxWidth: 480,
          background: '#FFFFFF',
          border: '2px solid var(--border-brandPrimary-quaternary, #B1E6CD)',
          borderRadius: 'var(--dim-radius-600, 24px)',
          padding: 'var(--dim-space-800, 32px) var(--dim-space-600, 24px)',
          textAlign: 'center',
          boxShadow: 'var(--shadow-brand-drop-bottom-200)',
        }}
      >
        <p style={{ margin: 0, fontSize: 'var(--type-size-lg, 18px)', color: 'var(--text-content-secondary, #565D6D)' }}>บัตรคิวของคุณ</p>
        <p style={{ margin: '8px 0 0', fontSize: 'var(--type-size-2xl, 24px)', fontWeight: 'var(--type-weight-bold, 700)', color: 'var(--text-brandPrimary-default, #007549)' }}>
          แผนก {dept}
        </p>

        <div
          style={{
            background: 'var(--surface-brandPrimary-quaternary, #F7FCFA)',
            borderRadius: 'var(--dim-radius-450, 14px)',
            padding: 'var(--dim-space-600, 24px) var(--dim-space-400, 16px)',
            margin: 'var(--dim-space-400, 16px) 0',
          }}
        >
          <span
            style={{
              fontFamily: 'Inter, var(--type-family-body)',
              fontSize: 96,
              fontWeight: 800,
              lineHeight: 1,
              letterSpacing: '-0.03em',
              color: 'var(--text-brandPrimary-default, #007549)',
            }}
          >
            {queueId}
          </span>
        </div>

        <p style={{ margin: 0, fontSize: 'var(--type-size-lg, 18px)', fontWeight: 'var(--type-weight-bold, 700)', color: 'var(--text-content-default, #171A1F)' }}>{name}</p>
        <p style={{ margin: '4px 0 0', fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-tertiary, #858C92)' }}>HN {hn}</p>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'rgba(243, 244, 246, 0.5)',
            borderRadius: 'var(--dim-radius-450, 14px)',
            padding: 'var(--dim-space-300, 12px) var(--dim-space-400, 16px)',
            marginTop: 'var(--dim-space-400, 16px)',
            fontSize: 'var(--type-size-base, 16px)',
          }}
        >
          <span style={{ color: 'var(--text-content-secondary, #565D6D)' }}>คิวกำลังเรียก</span>
          <strong style={{ fontFamily: 'Inter, var(--type-family-body)' }}>{calling}</strong>
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: 'var(--dim-space-300, 12px) var(--dim-space-400, 16px) 0',
            fontSize: 'var(--type-size-base, 16px)',
          }}
        >
          <span>เวลารอประมาณ</span>
          <strong>~ {eta} นาที</strong>
        </div>

        <div aria-hidden style={{ height: 1, background: 'var(--border-card-default, #E2E4E6)', margin: 'var(--dim-space-400, 16px) 0' }} />

        <p style={{ margin: 0, fontSize: 'var(--type-size-base, 16px)', color: 'var(--text-content-secondary, #565D6D)' }}>กรุณาไปนั่งรอที่</p>
        <p style={{ margin: '4px 0 0', fontSize: 'var(--type-size-lg, 18px)', fontWeight: 'var(--type-weight-bold, 700)', color: 'var(--text-content-default, #171A1F)' }}>{zone}</p>
      </div>

      <button
        type='button'
        onClick={onSave}
        style={{
          width: '100%',
          maxWidth: 480,
          marginTop: 'var(--dim-space-600, 24px)',
          background: saved ? 'var(--success, #08A768)' : 'var(--text-brandPrimary-default, #007549)',
          color: 'var(--text-content-on-content)',
          border: 'none',
          borderRadius: 'var(--dim-radius-450, 14px)',
          padding: 'var(--dim-space-600, 24px)',
          fontSize: 'var(--type-size-xl, 20px)',
          fontWeight: 'var(--type-weight-bold, 700)',
          cursor: 'pointer',
          boxShadow: 'var(--shadow-brand-drop-bottom-200)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 'var(--dim-space-200, 8px)',
          fontFamily: 'var(--type-family-body)',
        }}
      >
        <Sym name={saved ? 'check_circle' : 'download'} size={28} color='#FFFFFF' fill={saved} />
        {saved ? 'บันทึกภาพแล้ว' : 'บันทึกภาพบัตรคิว'}
      </button>

      <p
        style={{
          marginTop: 'var(--dim-space-400, 16px)',
          maxWidth: 480,
          fontSize: 'var(--type-size-xs, 12px)',
          color: 'var(--text-content-tertiary, #858C92)',
          textAlign: 'center',
          lineHeight: 1.5,
        }}
      >
        บนมือถือ iOS: ไฟล์ที่บันทึกจะอยู่ใน Files · เปิดดูแล้วกด <strong>Share → Save Image</strong> เพื่อเก็บลง Photos<br />
        บน Android: ไฟล์อยู่ใน Downloads · แอป Photos จะแสดงให้อัตโนมัติ
      </p>
    </div>
  );
};

export default MobileTicketPage;
