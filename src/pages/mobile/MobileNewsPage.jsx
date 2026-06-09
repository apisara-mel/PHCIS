import React, { useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import {
  MobileShell,
  MobileHeader,
  MobileCard,
  MobileBadge,
  Sym,
} from '@/components/mobile/MobileShell';
import { NEWS } from '@/data/mobileMock';

/* MIH PHCIS Mobile · News & announcements — TOR §4.9.
   Tab between all/video/audio/article. Each item routes to a detail
   screen with a "player surface" sized appropriately for the medium.    */

const TYPE_META = {
  video:   { icon: 'play_circle',   label: 'วิดีโอ',     tone: 'brand' },
  audio:   { icon: 'graphic_eq',    label: 'พอดแคสต์',  tone: 'info' },
  article: { icon: 'article',       label: 'บทความ',    tone: 'success' },
};

const MobileNewsListInner = () => {
  const history = useHistory();
  const [filter, setFilter] = useState('all');
  const list = filter === 'all' ? NEWS : NEWS.filter((n) => n.type === filter);
  return (
    <>
      <MobileHeader title='ข่าวสารและประกาศ' subtitle='TOR §4.9' onBack={() => history.push('/m/home')} />
      <div style={{ padding: 'var(--dim-space-400, 16px)', display: 'flex', flexDirection: 'column', gap: 'var(--dim-space-400, 16px)' }}>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto' }}>
          {[
            { k: 'all',     l: 'ทั้งหมด' },
            { k: 'video',   l: 'วิดีโอ' },
            { k: 'audio',   l: 'พอดแคสต์' },
            { k: 'article', l: 'บทความ' },
          ].map((f) => {
            const active = f.k === filter;
            return (
              <button key={f.k} type='button' onClick={() => setFilter(f.k)}
                style={{
                  flex: '0 0 auto', height: 32, padding: '0 12px',
                  borderRadius: 'var(--dim-radius-full)',
                  background: active ? 'var(--surface-brandPrimary-default)' : 'var(--surface-content-default)',
                  border: '1px solid ' + (active ? 'var(--surface-brandPrimary-default)' : 'var(--border-content-tertiary)'),
                  color: active ? '#FFFFFF' : 'var(--text-content-secondary)',
                  fontSize: 'var(--type-size-sm, 14px)', fontWeight: 700,
                  cursor: 'pointer', whiteSpace: 'nowrap',
                }}>{f.l}</button>
            );
          })}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--dim-space-300, 12px)' }}>
          {list.map((n) => {
            const m = TYPE_META[n.type];
            return (
              <MobileCard key={n.id} onClick={() => history.push(`/m/news/${n.id}`)} padding='var(--dim-space-300, 12px)'>
                <div style={{ display: 'flex', gap: 'var(--dim-space-300, 12px)' }}>
                  <div style={{
                    width: 96, height: 96, borderRadius: 'var(--dim-radius-300, 10px)',
                    background: 'linear-gradient(135deg, #54AA8C 0%, #4CC6AE 100%)',
                    color: '#FFFFFF',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    position: 'relative', flexShrink: 0,
                  }}>
                    <Sym name={m.icon} size={36} fill />
                    {(n.duration || n.readMinutes) && (
                      <span style={{
                        position: 'absolute', bottom: 6, right: 6,
                        background: 'rgba(0,0,0,0.55)',
                        color: '#FFFFFF',
                        padding: '2px 6px', borderRadius: 4,
                        fontSize: 10, fontWeight: 700,
                      }}>{n.duration || `${n.readMinutes} นาที`}</span>
                    )}
                  </div>
                  <div className='flex-1 min-w-0' style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div className='flex items-center' style={{ gap: 6, marginBottom: 4 }}>
                        <MobileBadge tone={m.tone}>{m.label}</MobileBadge>
                        <MobileBadge>{n.tag}</MobileBadge>
                      </div>
                      <p style={{
                        margin: 0,
                        fontSize: 'var(--type-size-sm, 14px)',
                        fontWeight: 'var(--type-weight-bold, 700)',
                        color: 'var(--text-content-primary)',
                        lineHeight: 1.4,
                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                      }}>{n.title}</p>
                    </div>
                    <p style={{ margin: 0, fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary)' }}>{n.publishedAt}</p>
                  </div>
                </div>
              </MobileCard>
            );
          })}
        </div>
      </div>
    </>
  );
};

const MobileNewsDetailInner = () => {
  const history = useHistory();
  const { id } = useParams();
  const n = NEWS.find((it) => it.id === id);
  if (!n) {
    return (
      <>
        <MobileHeader title='ไม่พบบทความ' onBack={() => history.push('/m/news')} />
      </>
    );
  }
  const meta = TYPE_META[n.type];
  return (
    <>
      <MobileHeader title={meta.label} onBack={() => history.push('/m/news')} />
      <div>
        {/* Player surface */}
        <div style={{
          width: '100%', aspectRatio: n.type === 'audio' ? '21/9' : '16/9',
          background: 'linear-gradient(135deg, #1F3D33 0%, #0F1B17 100%)',
          color: '#FFFFFF',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 12, position: 'relative',
        }}>
          <Sym name={meta.icon} size={72} fill />
          {n.duration && (
            <span style={{ position: 'absolute', bottom: 12, right: 12, background: 'rgba(0,0,0,0.5)', padding: '4px 10px', borderRadius: 4, fontSize: 'var(--type-size-xs, 12px)' }}>
              {n.duration}
            </span>
          )}
          {n.type !== 'article' && (
            <button type='button'
              style={{
                width: 64, height: 64, borderRadius: '50%',
                background: 'rgba(255,255,255,0.18)',
                border: '2px solid #FFFFFF', color: '#FFFFFF',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
              <Sym name='play_arrow' size={36} fill />
            </button>
          )}
        </div>

        <div style={{ padding: 'var(--dim-space-400, 16px)', display: 'flex', flexDirection: 'column', gap: 'var(--dim-space-300, 12px)' }}>
          <div className='flex items-center' style={{ gap: 8 }}>
            <MobileBadge tone={meta.tone}>{meta.label}</MobileBadge>
            <MobileBadge>{n.tag}</MobileBadge>
            <span style={{ fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary)' }}>{n.publishedAt}</span>
          </div>
          <h1 style={{
            margin: 0,
            fontFamily: 'var(--type-family-display)',
            fontSize: 'var(--type-size-xl, 20px)',
            fontWeight: 'var(--type-weight-bold, 700)',
            color: 'var(--text-content-primary)',
            lineHeight: 1.3,
          }}>{n.title}</h1>

          {/* Lorem-ipsum body — keeps the article slot looking real without
              hardcoding misleading clinical advice. */}
          <p style={{ margin: 0, fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-secondary)', lineHeight: 1.6 }}>
            สำนักอนามัย กรุงเทพมหานคร ขอเรียนเชิญประชาชนในเขตกรุงเทพมหานครและพื้นที่ใกล้เคียง
            เข้ารับบริการจากศูนย์บริการสาธารณสุข ทุกแห่งทั่วกรุงเทพมหานคร โดยรายละเอียดของบทความนี้
            อยู่ระหว่างการอัปเดต — กรุณาตรวจสอบข้อมูลเพิ่มเติมที่หน่วยบริการ
          </p>
          <p style={{ margin: 0, fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-secondary)', lineHeight: 1.6 }}>
            ระบบ PHCIS Mobile รองรับการเผยแพร่ทั้งวิดีโอ พอดแคสต์ และบทความ
            (TOR §4.9.1) เพื่อให้ประชาชนเข้าถึงข่าวสารด้านสาธารณสุขได้สะดวกที่สุด
          </p>
        </div>
      </div>
    </>
  );
};

export const MobileNewsPage = () => (
  <MobileShell>
    <MobileNewsListInner />
  </MobileShell>
);

export const MobileNewsDetailPage = () => (
  <MobileShell>
    <MobileNewsDetailInner />
  </MobileShell>
);

export default MobileNewsPage;
