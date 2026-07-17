import React, { useEffect, useRef, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import {
  MobileShell,
  MobileHeader,
  MobileCard,
  MobileButton,
  MobileBadge,
  Sym,
} from '@/components/mobile/MobileShell';
import { CLINICS, findClinic } from '@/data/mobileMock';

/* MIH PHCIS Mobile · Find clinics — TOR §4.7.
   Two screens:
     • /m/clinics            — map (Leaflet) + list of nearby centers (4.7.1)
     • /m/clinics/:code      — detail (4.7.2 / 4.7.3) with contact + departments
*/

const useLeaflet = (mapRef, mapState, clinics, selected, onPick) => {
  const instanceRef = useRef(null);
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const L = window.L;
    if (!L || !mapRef.current) return undefined;
    if (instanceRef.current) return undefined;

    const center = mapState.center || [13.7, 100.55];
    const map = L.map(mapRef.current, {
      center,
      zoom: 11,
      zoomControl: false,
      attributionControl: false,
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);

    clinics.forEach((c) => {
      const icon = L.divIcon({
        html: `
          <div style="
            width: 32px; height: 32px; border-radius: 50%;
            background: #007549; color: #FFF;
            display: flex; align-items: center; justify-content: center;
            border: 3px solid #FFFFFF; box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            font-weight: 700; font-size: 14px;
          ">${c.code[0]}</div>`,
        className: 'mih-clinic-pin',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });
      const marker = L.marker([c.lat, c.lng], { icon }).addTo(map);
      marker.on('click', () => onPick(c));
    });
    instanceRef.current = map;

    return () => {
      try { map.remove(); } catch (e) { /* noop */ }
      instanceRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* React to selection change — pan to the picked clinic. */
  useEffect(() => {
    if (instanceRef.current && selected) {
      instanceRef.current.setView([selected.lat, selected.lng], 13, { animate: true });
    }
  }, [selected]);
};

const MobileClinicsListInner = () => {
  const history = useHistory();
  const mapRef = useRef(null);
  const [selected, setSelected] = useState(null);
  useLeaflet(mapRef, { center: [13.7, 100.55] }, CLINICS, selected, setSelected);

  return (
    <>
      <MobileHeader title='ค้นหาศูนย์บริการ' subtitle='TOR §4.7' onBack={() => history.push('/m/home')} />
      {/* Map */}
      <div style={{ height: 280, position: 'relative', background: '#DCEAE2' }}>
        <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
        {/* Fallback if Leaflet isn't loaded */}
        {typeof window !== 'undefined' && !window.L && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(135deg, #DCEAE2 0%, #C9DFD5 100%)',
            color: 'var(--text-content-tertiary)', fontSize: 'var(--type-size-sm, 14px)',
          }}>กำลังโหลดแผนที่…</div>
        )}
      </div>

      <div style={{ padding: 'var(--dim-space-400, 16px)', display: 'flex', flexDirection: 'column', gap: 'var(--dim-space-300, 12px)' }}>
        <div className='flex items-center justify-between'>
          <h3 style={{
            margin: 0,
            fontFamily: 'var(--type-family-display)',
            fontSize: 'var(--type-size-base, 16px)',
            fontWeight: 'var(--type-weight-bold, 700)',
            color: 'var(--text-content-primary)',
          }}>ศูนย์ใกล้คุณ ({CLINICS.length})</h3>
          <span style={{ fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary)' }}>เรียงตามระยะทาง</span>
        </div>

        {CLINICS.slice().sort((a, b) => a.distanceKm - b.distanceKm).map((c) => (
          <MobileCard key={c.code} onClick={() => history.push(`/m/clinics/${c.code}`)}>
            <div className='flex items-start' style={{ gap: 'var(--dim-space-300, 12px)' }}>
              <span style={{
                width: 40, height: 40, borderRadius: 'var(--dim-radius-300, 10px)',
                background: 'var(--surface-brandPrimary-quaternary, #F4FBF8)',
                color: 'var(--text-brandPrimary-default, #007549)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Sym name='local_hospital' size={20} fill />
              </span>
              <div className='flex-1 min-w-0'>
                <p style={{ margin: 0, fontWeight: 700, color: 'var(--text-content-primary)' }}>{c.name}</p>
                <p style={{ margin: 0, fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary)' }}>{c.address}</p>
                <div className='flex items-center' style={{ gap: 6, marginTop: 4 }}>
                  <MobileBadge tone='brand'>{c.distanceKm} กม.</MobileBadge>
                  <MobileBadge>{c.hours}</MobileBadge>
                </div>
              </div>
              <Sym name='chevron_right' size={20} color='var(--text-content-tertiary)' />
            </div>
          </MobileCard>
        ))}
      </div>
    </>
  );
};

const MobileClinicDetailInner = () => {
  const history = useHistory();
  const { code } = useParams();
  const c = findClinic(code);
  if (!c) {
    return (
      <>
        <MobileHeader title='ไม่พบศูนย์บริการ' onBack={() => history.push('/m/clinics')} />
      </>
    );
  }
  return (
    <>
      <MobileHeader title={c.name} onBack={() => history.push('/m/clinics')} />
      <div style={{ padding: 'var(--dim-space-400, 16px)', display: 'flex', flexDirection: 'column', gap: 'var(--dim-space-400, 16px)' }}>
        {/* Hero */}
        <MobileCard padding='var(--dim-space-500, 20px)'>
          <div style={{
            width: '100%', height: 140, borderRadius: 'var(--dim-radius-400, 12px)',
            background: 'linear-gradient(135deg, #54AA8C 0%, #4CC6AE 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-content-on-content)',
          }}>
            <Sym name='local_hospital' size={72} fill />
          </div>
          <p style={{
            margin: 'var(--dim-space-300, 12px) 0 4px',
            fontFamily: 'var(--type-family-display)',
            fontSize: 'var(--type-size-lg, 18px)',
            fontWeight: 'var(--type-weight-bold, 700)',
          }}>{c.name}</p>
          <p style={{ margin: 0, fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-secondary)' }}>{c.address}</p>
          <p style={{ margin: '4px 0 0', fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary)' }}>
            ห่างจากที่อยู่ปัจจุบัน {c.distanceKm} กม.
          </p>
        </MobileCard>

        {/* Contact */}
        <MobileCard>
          <h3 style={sectionTitle}>ติดต่อ</h3>
          <a href={`tel:${c.phone}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
            <Row icon='call' label='โทรศัพท์' value={c.phone} />
          </a>
          <Row icon='schedule' label='เวลาทำการ' value={c.hours} />
          <Row icon='place' label='พิกัด' value={`${c.lat.toFixed(4)}, ${c.lng.toFixed(4)}`} mono />
        </MobileCard>

        {/* Departments */}
        <MobileCard>
          <h3 style={sectionTitle}>คลินิกที่ให้บริการ</h3>
          <div>
            {c.departments.map((d) => (
              <div key={d.key} className='flex items-center' style={{ gap: 12, padding: '12px 0', borderBottom: '1px solid var(--border-content-quaternary)' }}>
                <Sym name='stethoscope' size={20} color='var(--text-brandPrimary-default)' fill />
                <span style={{ flex: 1, fontWeight: 700, color: 'var(--text-content-primary)' }}>{d.label}</span>
                <MobileBadge tone='brand'>{d.key}</MobileBadge>
              </div>
            ))}
          </div>
        </MobileCard>

        <MobileButton icon='event_available' onClick={() => history.push('/m/book')}>
          ทำนัดหมายที่ศูนย์นี้
        </MobileButton>
      </div>
    </>
  );
};

const Row = ({ icon, label, value, mono = false }) => (
  <div className='flex items-center' style={{ gap: 12, padding: '12px 0', borderBottom: '1px solid var(--border-content-quaternary, #F0F1F3)' }}>
    <Sym name={icon} size={20} color='var(--text-content-tertiary)' />
    <div className='flex-1 min-w-0'>
      <p style={{ margin: 0, fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary)' }}>{label}</p>
      <p style={{ margin: 0, fontWeight: 700, color: 'var(--text-content-primary)', fontFamily: mono ? 'ui-monospace, monospace' : 'inherit' }}>{value}</p>
    </div>
  </div>
);

const sectionTitle = {
  margin: '0 0 var(--dim-space-200, 8px)',
  fontFamily: 'var(--type-family-display)',
  fontSize: 'var(--type-size-base, 16px)',
  fontWeight: 'var(--type-weight-bold, 700)',
  color: 'var(--text-content-primary)',
};

export const MobileClinicsPage = () => (
  <MobileShell>
    <MobileClinicsListInner />
  </MobileShell>
);

export const MobileClinicDetailPage = () => (
  <MobileShell>
    <MobileClinicDetailInner />
  </MobileShell>
);

export default MobileClinicsPage;
