import React, { useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import {
  MobileShell,
  MobileHeader,
  MobileCard,
  MobileBadge,
  MobileButton,
  Sym,
} from '@/components/mobile/MobileShell';
import { VISIT_HISTORY, ACTIVE_MEDS, ANC_PROFILE } from '@/data/mobileMock';

/* MIH PHCIS Mobile · Records & history — TOR §4.4 + §4.6 + §4.6.7.
   Tabs:
     • visits    — every visit / homevisit / videocall row (4.6.1 / 4.6.2 / 4.6.3)
     • meds      — active medication list (4.4.2)
     • anc       — pregnancy + well-child growth + immunization (4.6.7)
   "ขอเอกสารประวัติการรักษา" CTA routes to /m/requests with type=medrecord
   (4.6.4).                                                                 */

const typeMeta = {
  visit:     { icon: 'medical_services', label: 'พบแพทย์',   tone: 'brand' },
  video:     { icon: 'video_camera_front', label: 'วิดีโอคอล', tone: 'info' },
  homevisit: { icon: 'home_health', label: 'เยี่ยมบ้าน',     tone: 'success' },
};

const TabPill = ({ active, onClick, children }) => (
  <button type='button' onClick={onClick}
    style={{
      flex: 1, height: 40,
      background: active ? 'var(--surface-content-default, #FFFFFF)' : 'transparent',
      border: 'none', borderRadius: 'var(--dim-radius-300, 10px)',
      fontSize: 'var(--type-size-sm, 14px)',
      fontWeight: active ? 700 : 500,
      color: active ? 'var(--text-brandPrimary-default, #007549)' : 'var(--text-content-tertiary)',
      cursor: 'pointer', boxShadow: active ? 'var(--shadow-brand-drop-bottom-100)' : 'none',
    }}>{children}</button>
);

const VisitRow = ({ v }) => {
  const history = useHistory();
  const m = typeMeta[v.type] || typeMeta.visit;
  return (
    <MobileCard onClick={() => history.push(`/m/visit/${v.id}`)} padding='var(--dim-space-400, 16px)'>
      <div className='flex items-start' style={{ gap: 'var(--dim-space-300, 12px)' }}>
        <span style={{
          width: 40, height: 40, borderRadius: 'var(--dim-radius-300, 10px)',
          background: 'var(--surface-brandPrimary-quaternary)',
          color: 'var(--text-brandPrimary-default, #007549)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Sym name={m.icon} size={20} fill />
        </span>
        <div className='flex-1 min-w-0'>
          <div className='flex items-center' style={{ gap: 6, marginBottom: 4 }}>
            <MobileBadge tone={m.tone}>{m.label}</MobileBadge>
          </div>
          <p style={{ margin: 0, fontWeight: 700, color: 'var(--text-content-primary)' }}>{v.date} · {v.time} น.</p>
          <p style={{ margin: 0, fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-secondary)' }}>{v.dept} · {v.doctor}</p>
          <p style={{ margin: '2px 0 0', fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary)' }}>{v.dx}</p>
        </div>
        <Sym name='chevron_right' size={20} color='var(--text-content-tertiary)' />
      </div>
    </MobileCard>
  );
};

const MedCard = ({ m }) => (
  <MobileCard padding='var(--dim-space-400, 16px)'>
    <div className='flex items-start' style={{ gap: 'var(--dim-space-300, 12px)' }}>
      <span style={{
        width: 40, height: 40, borderRadius: 'var(--dim-radius-300, 10px)',
        background: 'var(--surface-info-quaternary, #ECF4FE)',
        color: 'var(--text-info-default, #1F6FEB)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Sym name='pill' size={22} fill />
      </span>
      <div className='flex-1 min-w-0'>
        <p style={{ margin: 0, fontWeight: 700, color: 'var(--text-content-primary)' }}>{m.name}</p>
        <p style={{ margin: 0, fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-secondary)' }}>{m.dose}</p>
        <p style={{ margin: '2px 0 0', fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary)' }}>
          เริ่มเมื่อ {m.start} · เหลือ {m.remaining} เม็ด
        </p>
      </div>
    </div>
  </MobileCard>
);

const AncBlock = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--dim-space-400, 16px)' }}>
    <MobileCard>
      <h3 style={sectionTitle}>การตั้งครรภ์</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--dim-space-300, 12px)' }}>
        <Stat label='อายุครรภ์'  value={`${ANC_PROFILE.ga} สัปดาห์`} />
        <Stat label='กำหนดคลอด' value={ANC_PROFILE.edd} />
        <Stat label='การตรวจครั้งล่าสุด' value={ANC_PROFILE.visits[0].date} />
      </div>
      <div style={{ marginTop: 'var(--dim-space-300, 12px)' }}>
        {ANC_PROFILE.visits.map((v, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: i === 0 ? '1px solid var(--border-content-quaternary)' : 'none' }}>
            <span style={{ fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary)' }}>{v.date} · GA {v.ga}</span>
            <span style={{ fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-primary)', fontWeight: 700 }}>BP {v.bp} · {v.weight} kg · FHR {v.fhr}</span>
          </div>
        ))}
      </div>
    </MobileCard>

    <MobileCard>
      <h3 style={sectionTitle}>สุขภาพลูก · {ANC_PROFILE.child.name}</h3>
      <p style={{ margin: 0, fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-tertiary)' }}>
        เกิด {ANC_PROFILE.child.birthDate} · กราฟการเจริญเติบโต
      </p>
      <GrowthChart data={ANC_PROFILE.child.growth} />
    </MobileCard>

    <MobileCard>
      <h3 style={sectionTitle}>วัคซีน · ตามเกณฑ์อายุ</h3>
      <div>
        {ANC_PROFILE.child.immunizations.map((im) => (
          <div key={im.code} className='flex items-center' style={{ gap: 'var(--dim-space-300, 12px)', padding: '10px 0', borderBottom: '1px solid var(--border-content-quaternary, #F0F1F3)' }}>
            <span style={{
              width: 28, height: 28, borderRadius: '50%',
              background: im.done ? 'var(--surface-success-default, #1F9D55)' : 'var(--surface-content-secondary)',
              color: im.done ? '#FFFFFF' : 'var(--text-content-tertiary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Sym name={im.done ? 'check' : 'schedule'} size={16} />
            </span>
            <div className='flex-1 min-w-0'>
              <p style={{ margin: 0, fontWeight: 700, color: 'var(--text-content-primary)' }}>{im.code}</p>
              <p style={{ margin: 0, fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary)' }}>
                {im.done ? `ได้รับ ${im.given}` : `นัดฉีด ${im.due}`}
              </p>
            </div>
          </div>
        ))}
      </div>
    </MobileCard>
  </div>
);

const Stat = ({ label, value }) => (
  <div>
    <p style={{ margin: 0, fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary)' }}>{label}</p>
    <p style={{ margin: 0, fontWeight: 700, color: 'var(--text-content-primary)' }}>{value}</p>
  </div>
);

const GrowthChart = ({ data }) => {
  /* Tiny SVG line — height/weight by month */
  const w = 340, h = 120, pad = 24;
  const months = data.map((d) => d.ageMonths);
  const heights = data.map((d) => d.height);
  const minM = Math.min(...months), maxM = Math.max(...months);
  const minH = Math.min(...heights), maxH = Math.max(...heights);
  const toX = (m) => pad + (m - minM) / Math.max(1, maxM - minM) * (w - pad * 2);
  const toY = (val) => h - pad - (val - minH) / Math.max(1, maxH - minH) * (h - pad * 2);
  const points = data.map((d) => `${toX(d.ageMonths)},${toY(d.height)}`).join(' ');
  return (
    <div style={{ overflowX: 'auto', marginTop: 'var(--dim-space-200, 8px)' }}>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} role='img' aria-label='Growth chart'>
        <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke='#E1E3E5' strokeWidth={1} />
        <polyline fill='none' stroke='var(--surface-brandPrimary-default, #007549)' strokeWidth={2} points={points} />
        {data.map((d, i) => (
          <g key={i}>
            <circle cx={toX(d.ageMonths)} cy={toY(d.height)} r={4} fill='var(--surface-brandPrimary-default, #007549)' />
            <text x={toX(d.ageMonths)} y={h - 6} fontSize={10} textAnchor='middle' fill='#858C92'>{d.ageMonths} ดด.</text>
            <text x={toX(d.ageMonths)} y={toY(d.height) - 8} fontSize={10} textAnchor='middle' fill='#0F1B17'>{d.height} cm</text>
          </g>
        ))}
      </svg>
    </div>
  );
};

const sectionTitle = {
  margin: '0 0 var(--dim-space-200, 8px)',
  fontFamily: 'var(--type-family-display)',
  fontSize: 'var(--type-size-base, 16px)',
  fontWeight: 'var(--type-weight-bold, 700)',
  color: 'var(--text-content-primary)',
};

const MobileRecordsInner = () => {
  const history = useHistory();
  const [tab, setTab] = useState('visits');

  const visitsByType = useMemo(() => ({
    all:       VISIT_HISTORY,
    visit:     VISIT_HISTORY.filter((v) => v.type === 'visit'),
    video:     VISIT_HISTORY.filter((v) => v.type === 'video'),
    homevisit: VISIT_HISTORY.filter((v) => v.type === 'homevisit'),
  }), []);
  const [visitFilter, setVisitFilter] = useState('all');

  return (
    <>
      <MobileHeader title='ประวัติการรักษา' subtitle='TOR §4.4 / §4.6' onBack={() => history.push('/m/home')} />
      <div style={{ padding: 'var(--dim-space-400, 16px)', display: 'flex', flexDirection: 'column', gap: 'var(--dim-space-400, 16px)' }}>
        {/* Top tab */}
        <div style={{ display: 'flex', padding: 4, background: 'var(--surface-content-secondary, #F5F6F7)', borderRadius: 'var(--dim-radius-300, 10px)', gap: 4 }}>
          <TabPill active={tab === 'visits'} onClick={() => setTab('visits')}>การรักษา</TabPill>
          <TabPill active={tab === 'meds'}   onClick={() => setTab('meds')}>รายการยา</TabPill>
          <TabPill active={tab === 'anc'}    onClick={() => setTab('anc')}>ครรภ์ / เด็ก</TabPill>
        </div>

        {tab === 'visits' && (
          <>
            {/* Filter chips */}
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto' }}>
              {[
                { k: 'all', l: 'ทั้งหมด' },
                { k: 'visit', l: 'พบแพทย์' },
                { k: 'video', l: 'วิดีโอคอล' },
                { k: 'homevisit', l: 'เยี่ยมบ้าน' },
              ].map((f) => {
                const active = f.k === visitFilter;
                return (
                  <button key={f.k} type='button' onClick={() => setVisitFilter(f.k)}
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
              {visitsByType[visitFilter].map((v) => <VisitRow key={v.id} v={v} />)}
            </div>

            <MobileButton variant='secondary' icon='download'
              onClick={() => history.push('/m/requests?type=medrecord')}>
              ขอเอกสารประวัติการรักษา (e-Document)
            </MobileButton>
          </>
        )}

        {tab === 'meds' && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--dim-space-300, 12px)' }}>
              {ACTIVE_MEDS.map((m, i) => <MedCard key={i} m={m} />)}
            </div>
            <MobileButton variant='secondary' icon='refresh'
              onClick={() => history.push('/m/requests?type=medicine')}>
              ขอเติมยาตามใบเดิม
            </MobileButton>
          </>
        )}

        {tab === 'anc' && <AncBlock />}
      </div>
    </>
  );
};

const MobileRecordsPage = () => (
  <MobileShell>
    <MobileRecordsInner />
  </MobileShell>
);

export default MobileRecordsPage;
