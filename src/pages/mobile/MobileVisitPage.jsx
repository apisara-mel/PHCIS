import React from 'react';
import { useHistory, useParams } from 'react-router-dom';
import {
  MobileShell,
  MobileHeader,
  MobileCard,
  MobileButton,
  MobileBadge,
  Sym,
} from '@/components/mobile/MobileShell';
import { findVisit } from '@/data/mobileMock';

/* MIH PHCIS Mobile · Visit detail (TOR §4.4 + §4.6.1-§4.6.4).
   Each card group corresponds to one TOR sub-requirement so the
   reviewer can scan-tick.                                               */

const typeMeta = {
  visit:     { icon: 'medical_services', label: 'พบแพทย์',   tone: 'brand' },
  video:     { icon: 'video_camera_front', label: 'วิดีโอคอล', tone: 'info' },
  homevisit: { icon: 'home_health', label: 'เยี่ยมบ้าน',     tone: 'success' },
};

const Row = ({ label, value, mono }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--dim-space-300, 12px)', padding: '10px 0', borderBottom: '1px solid var(--border-content-quaternary, #F0F1F3)' }}>
    <span style={{ fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-tertiary)' }}>{label}</span>
    <span style={{
      fontSize: 'var(--type-size-sm, 14px)',
      fontWeight: 'var(--type-weight-bold, 700)',
      color: 'var(--text-content-primary)',
      fontFamily: mono ? 'ui-monospace, monospace' : 'inherit',
      textAlign: 'right',
    }}>{value}</span>
  </div>
);

const MobileVisitInner = () => {
  const history = useHistory();
  const { id } = useParams();
  const v = findVisit(id);
  if (!v) {
    return (
      <>
        <MobileHeader title='ไม่พบบันทึก' onBack={() => history.push('/m/records')} />
        <div style={{ padding: 'var(--dim-space-400, 16px)' }}>
          <MobileCard>
            <p style={{ margin: 0, color: 'var(--text-content-secondary)' }}>ไม่พบบันทึก {id} ในระบบ</p>
          </MobileCard>
        </div>
      </>
    );
  }
  const meta = typeMeta[v.type] || typeMeta.visit;
  return (
    <>
      <MobileHeader title='รายละเอียดการเข้ารับบริการ' onBack={() => history.push('/m/records')} />
      <div style={{ padding: 'var(--dim-space-400, 16px)', display: 'flex', flexDirection: 'column', gap: 'var(--dim-space-400, 16px)' }}>
        {/* Hero */}
        <MobileCard padding='var(--dim-space-500, 20px)'>
          <div className='flex items-center' style={{ gap: 12, marginBottom: 12 }}>
            <span style={{
              width: 48, height: 48, borderRadius: 'var(--dim-radius-400, 12px)',
              background: 'linear-gradient(135deg, #007549 0%, #4CC6AE 100%)',
              color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Sym name={meta.icon} size={24} fill />
            </span>
            <div className='flex-1 min-w-0'>
              <MobileBadge tone={meta.tone}>{meta.label}</MobileBadge>
              <p style={{
                margin: '4px 0 0',
                fontFamily: 'var(--type-family-display)',
                fontSize: 'var(--type-size-lg, 18px)',
                fontWeight: 'var(--type-weight-bold, 700)',
                color: 'var(--text-content-primary)',
              }}>{v.date} · {v.time} น.</p>
              <p style={{ margin: 0, fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-secondary)' }}>{v.center}</p>
            </div>
          </div>

          <Row label='แผนก / คลินิก' value={v.dept} />
          <Row label='เจ้าหน้าที่ผู้ตรวจ' value={v.doctor} />
          <Row label='อาการสำคัญ' value={v.cc} />
          <Row label='ผลการวินิจฉัย' value={v.dx} />
          <Row label='ยาที่ได้รับ' value={v.rx} />
          <Row label='แผนการรักษา' value={v.plan} />
        </MobileCard>

        {/* Attachments */}
        {v.files && v.files.length > 0 && (
          <MobileCard>
            <h3 style={{
              margin: '0 0 var(--dim-space-200, 8px)',
              fontFamily: 'var(--type-family-display)',
              fontSize: 'var(--type-size-base, 16px)',
              fontWeight: 'var(--type-weight-bold, 700)',
              color: 'var(--text-content-primary)',
            }}>เอกสารและผลตรวจ</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {v.files.map((f) => (
                <div key={f} className='flex items-center' style={{ gap: 8, padding: 'var(--dim-space-300, 12px)', background: 'var(--surface-content-secondary, #F5F6F7)', borderRadius: 'var(--dim-radius-300, 10px)' }}>
                  <Sym name={f.endsWith('.pdf') ? 'picture_as_pdf' : 'image'} size={20} color='var(--text-content-secondary)' />
                  <span style={{ flex: 1, fontSize: 'var(--type-size-sm, 14px)', fontFamily: 'ui-monospace, monospace' }}>{f}</span>
                  <button type='button' style={{ background: 'transparent', border: '1px solid var(--border-content-tertiary)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 'var(--type-size-xs, 12px)', fontWeight: 700, color: 'var(--text-brandPrimary-default)' }}>
                    เปิด
                  </button>
                </div>
              ))}
            </div>
          </MobileCard>
        )}

        <MobileButton variant='secondary' icon='download'
          onClick={() => history.push('/m/requests?type=medrecord')}>
          ขอเอกสารการรักษาฉบับเต็ม (e-Document)
        </MobileButton>
      </div>
    </>
  );
};

const MobileVisitPage = () => (
  <MobileShell>
    <MobileVisitInner />
  </MobileShell>
);

export default MobileVisitPage;
