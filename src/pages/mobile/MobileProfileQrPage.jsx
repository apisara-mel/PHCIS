import React from 'react';
import { useHistory } from 'react-router-dom';
import {
  MobileShell,
  MobileHeader,
  MobileCard,
  Sym,
} from '@/components/mobile/MobileShell';
import { CURRENT_USER } from '@/data/mobileMock';
import { FakeQR } from '@/pages/mobile/MobileRegisterPage';

/* MIH PHCIS Mobile · "My QR" — TOR §4.1.4.
   Shows the citizen's QR code to use at the kiosk / counter, plus the
   matching HN + center info. The QR is the registration evidence: scan
   at the kiosk to skip Thai-ID lookup and Verify steps.                  */

const MobileProfileQrInner = () => {
  const history = useHistory();
  return (
    <>
      <MobileHeader title='QR ของฉัน' subtitle='แสดงให้เจ้าหน้าที่หรือสแกนที่ตู้ Kiosk' onBack={() => history.push('/m/profile')} />
      <div style={{ padding: 'var(--dim-space-400, 16px)', display: 'flex', flexDirection: 'column', gap: 'var(--dim-space-400, 16px)' }}>
        <MobileCard padding='var(--dim-space-500, 20px)' style={{ textAlign: 'center' }}>
          <div style={{
            background: 'var(--surface-content-secondary, #F5F6F7)',
            borderRadius: 'var(--dim-radius-500, 16px)',
            padding: 'var(--dim-space-500, 20px)',
            display: 'inline-block',
          }}>
            <FakeQR seed={CURRENT_USER.citizenId} size={220} />
          </div>
          <p style={{
            marginTop: 'var(--dim-space-300, 12px)',
            marginBottom: 0,
            fontFamily: 'ui-monospace, monospace',
            fontSize: 'var(--type-size-base, 16px)',
            fontWeight: 'var(--type-weight-bold, 700)',
            letterSpacing: 1.5,
          }}>PHCIS-{CURRENT_USER.citizenId.slice(-6)}</p>
          <p style={{ margin: '4px 0 0', fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-tertiary)' }}>
            {CURRENT_USER.firstName} {CURRENT_USER.lastName} · HN {CURRENT_USER.centers[0].hn}
          </p>
        </MobileCard>

        <MobileCard style={{ background: 'var(--surface-info-quaternary, #ECF4FE)' }}>
          <div className='flex items-start' style={{ gap: 8 }}>
            <Sym name='qr_code_scanner' size={24} color='var(--text-info-default, #1F6FEB)' />
            <div>
              <p style={{ margin: 0, fontWeight: 700, color: 'var(--text-content-primary)' }}>วิธีใช้</p>
              <p style={{ margin: '4px 0 0', fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-secondary)', lineHeight: 1.5 }}>
                • นำเครื่องไปที่ตู้ Kiosk ของศูนย์<br />
                • เลือก "สแกน QR" และให้กล้องของเครื่องอ่าน QR นี้<br />
                • ระบบจะดึงข้อมูลผู้ป่วยและออกบัตรคิวให้อัตโนมัติ
              </p>
            </div>
          </div>
        </MobileCard>
      </div>
    </>
  );
};

const MobileProfileQrPage = () => (
  <MobileShell>
    <MobileProfileQrInner />
  </MobileShell>
);

export default MobileProfileQrPage;
