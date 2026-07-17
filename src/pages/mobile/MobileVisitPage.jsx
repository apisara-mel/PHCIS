import React, { useMemo } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import {
  MobileShell,
  MobileHeader,
  Sym,
  BrandButton,
  BrandSubdueButton,
} from '@/components/mobile';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import StatusBadge from '@/components/badge/StatusBadge';
import MobileIconBadge from '@/components/mobile/MobileIconBadge';
import { ConfirmDetailRow } from '@/components/mobile/BookingWizard';
import { resolveDoctorAvatar } from '@/data/mobileMock';
import { usePhcisLink } from '@/data/phcisLink';

/* BMA Health · Medical history detail — Figma 178:119767.
   Annotation 371:55805 specifies the shown case did not request a
   medical certificate, so that action is opt-in via certificateRequested. */

const Card = ({ children, style }) => (
  <div
    style={{
      background: 'var(--surface-card-100, #FFFFFF)',
      borderRadius: 'var(--dim-radius-500, 16px)',
      boxShadow: 'var(--shadow-brand-drop-bottom-200)',
      padding: 'var(--dim-space-400, 16px)',
      ...style,
    }}
  >
    {children}
  </div>
);

const SectionTitle = ({ children }) => (
  <p style={{
    margin: '0 0 var(--dim-space-300, 12px)',
    fontFamily: 'var(--type-family-heading-graphic2)',
    fontSize: 'var(--type-size-base, 16px)',
    color: 'var(--text-brandPrimary-default, #007549)',
  }}
  >
    {children}
  </p>
);

const VitalTile = ({ icon, label, value, badge }) => (
  <div
    style={{
      background: 'var(--surface-info-quaternary, #F4F9FD)',
      borderRadius: 'var(--dim-radius-400, 12px)',
      padding: 'var(--dim-space-300, 12px)',
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--dim-space-100, 4px)',
      minHeight: 88,
    }}
  >
    <div className='flex items-center justify-between'>
      <Sym name={icon} size={18} color='var(--text-brandPrimary-default)' />
      {badge && <StatusBadge style='warning' size='small'>{badge}</StatusBadge>}
    </div>
    <p style={{ margin: 0, fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>{label}</p>
    <p style={{
      margin: 0,
      fontSize: 'var(--type-size-base)',
      fontWeight: 'var(--type-weight-bold, 700)',
      color: 'var(--text-content-default)',
    }}
    >
      {value}
    </p>
  </div>
);

const MobileVisitInner = () => {
  const history = useHistory();
  const { id } = useParams();
  const { visits } = usePhcisLink();
  const v = useMemo(() => visits.find((x) => x.id === id), [visits, id]);

  if (!v) {
    return (
      <>
        <MobileHeader title='ไม่พบบันทึก' onBack={() => history.push('/m/records')} />
        <div style={{ padding: 'var(--dim-space-400, 16px)' }}>
          <Card>
            <p style={{ margin: 0, color: 'var(--text-content-secondary)' }}>ไม่พบบันทึก {id}</p>
          </Card>
        </div>
      </>
    );
  }

  const isOnline = v.type === 'video';
  const vitals = v.vitals || null;
  const files = Array.isArray(v.files)
    ? v.files.map((f) => (typeof f === 'string' ? { name: f, size: '—' } : f))
    : [];
  const orders = v.orders || (v.rx && v.rx !== '—' ? [v.rx] : []);

  return (
    <>
      <MobileHeader title='รายละเอียดการตรวจ' onBack={() => history.push('/m/records')} />

      <div
        className='flex-1 min-h-0 overflow-y-auto'
        style={{
          padding: 'var(--dim-space-400, 16px)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--dim-space-300, 12px)',
          background: 'var(--background-screen-brand-100, #F4FBF8)',
          paddingBottom: 'var(--dim-space-800, 32px)',
        }}
      >
        {/* Doctor */}
        <Card>
          <p style={{ margin: '0 0 var(--dim-space-300, 12px)', fontSize: 'var(--type-size-sm)', color: 'var(--text-content-tertiary)' }}>
            แพทย์ผู้รักษา
          </p>
          <div className='flex items-start' style={{ gap: 'var(--dim-space-300, 12px)' }}>
            <span className='overflow-hidden shrink-0' style={{ width: 56, height: 56, borderRadius: 'var(--dim-radius-full)' }}>
              <img
                src={v.doctorAvatar || resolveDoctorAvatar(v.doctor)}
                alt=''
                width={56}
                height={56}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </span>
            <div className='min-w-0' style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <p style={{ margin: 0, fontFamily: 'var(--type-family-heading-graphic2)', fontSize: 'var(--type-size-base)', fontWeight: 'var(--type-weight-bold, 700)' }}>
                {v.doctor}
              </p>
              <span className='inline-flex items-center' style={{ gap: 4, fontSize: 'var(--type-size-sm)', color: 'var(--text-content-tertiary)' }}>
                <Sym name='stethoscope' size={14} />
                แผนก: {v.specialty || v.dept}
              </span>
              {v.license && (
                <span className='inline-flex items-center' style={{ gap: 4, fontSize: 'var(--type-size-sm)', color: 'var(--text-content-tertiary)' }}>
                  <Sym name='badge' size={14} />
                  เลขใบประกอบวิชาชีพ: {v.license}
                </span>
              )}
            </div>
          </div>
        </Card>

        {/* Visit record */}
        <Card>
          <SectionTitle>บันทึกผลการตรวจรักษา</SectionTitle>
          <div className='flex flex-col' style={{ gap: 'var(--dim-space-400, 16px)' }}>
            <ConfirmDetailRow icon='calendar_today' label='วันที่' value={v.dateLabel || v.date} />
            <ConfirmDetailRow icon='schedule' label='เวลา' value={`${v.time} น.`} />
            <ConfirmDetailRow icon='location_on' label='จุดรับบริการ' value={v.locationLabel || v.center} />
            <ConfirmDetailRow
              icon={isOnline ? 'video' : 'map-pin'}
              label='ประเภทการเข้ารับบริการ'
              value={isOnline ? 'ออนไลน์ (Telemedicine)' : 'เข้ารับบริการที่ศูนย์'}
              tone={isOnline ? 'indigo' : 'green'}
            />
          </div>
        </Card>

        {/* Meds */}
        {(v.medPickup || v.rx) && (
          <Card>
            <SectionTitle>รายการยา</SectionTitle>
            <div className='flex items-start' style={{ gap: 'var(--dim-space-300, 12px)', marginBottom: 'var(--dim-space-300, 12px)' }}>
              <MobileIconBadge icon='medication' tone='green' size={40} iconSize={18} />
              <div>
                <p style={{ margin: 0, fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>ช่องทางรับยา</p>
                <p style={{ margin: 0, fontSize: 'var(--type-size-sm)', fontWeight: 'var(--type-weight-bold, 700)' }}>
                  {v.medPickup || 'รับที่ศูนย์บริการ'}
                </p>
              </div>
            </div>
            <BrandSubdueButton
              variant='outline'
              size='md'
              trailingIcon='chevron_right'
              onClick={() => window.alert(v.rx || 'ดูรายการยา (สาธิต)')}
            >
              ดูรายการยา
            </BrandSubdueButton>
          </Card>
        )}

        {/* Vitals */}
        {vitals && (
          <Card>
            <SectionTitle>สัญญาณชีพ</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--dim-space-200, 8px)' }}>
              <VitalTile icon='thermostat' label='อุณหภูมิ (°C)' value={vitals.temp} />
              <VitalTile icon='favorite' label='PR (bpm)' value={vitals.pr} />
              <VitalTile icon='monitor_heart' label='BP (mmHg)' value={vitals.bp} badge={vitals.bpFlag} />
              <VitalTile icon='water_drop' label='SpO2 (%)' value={vitals.spo2} />
              <VitalTile icon='air' label='RR (/min)' value={vitals.rr} />
              <VitalTile icon='height' label='ส่วนสูง (cm)' value={vitals.ht} />
              <VitalTile icon='monitor_weight' label='น้ำหนัก (kg)' value={vitals.wt} />
              <VitalTile icon='accessibility_new' label='BMI' value={vitals.bmi} />
              {vitals.waist && <VitalTile icon='straighten' label='รอบเอว (cm)' value={vitals.waist} />}
            </div>
          </Card>
        )}

        {/* CC */}
        {v.cc && (
          <Card>
            <SectionTitle>อาการ</SectionTitle>
            <p style={{ margin: 0, fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary)', lineHeight: 1.5 }}>
              {v.cc}
            </p>
          </Card>
        )}

        {/* DX */}
        {(v.dx || v.dxCode) && (
          <Card>
            <SectionTitle>วินิจฉัย</SectionTitle>
            <div className='flex items-center' style={{ gap: 'var(--dim-space-200, 8px)', marginBottom: 'var(--dim-space-200, 8px)', flexWrap: 'wrap' }}>
              {v.dxCode && (
                <ColorfulBadge style='blue' size='small' hierarchy='primary' width='hug'>
                  {v.dxCode}
                </ColorfulBadge>
              )}
              <span style={{ fontSize: 'var(--type-size-sm)', fontWeight: 'var(--type-weight-bold, 700)' }}>{v.dx}</span>
            </div>
            {v.dxNote && (
              <p style={{ margin: 0, fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary)', lineHeight: 1.5 }}>
                {v.dxNote}
              </p>
            )}
          </Card>
        )}

        {/* Orders */}
        {orders.length > 0 && (
          <Card>
            <SectionTitle>คำสั่งแพทย์</SectionTitle>
            <ol style={{ margin: 0, paddingLeft: 'var(--dim-space-500, 20px)', display: 'flex', flexDirection: 'column', gap: 'var(--dim-space-200, 8px)' }}>
              {orders.map((o) => (
                <li key={o} style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary)', lineHeight: 1.45 }}>
                  {o}
                </li>
              ))}
            </ol>
          </Card>
        )}

        {/* Attachments */}
        {files.length > 0 && (
          <Card>
            <SectionTitle>เอกสารแนบ</SectionTitle>
            <div className='flex flex-col' style={{ gap: 'var(--dim-space-200, 8px)' }}>
              {files.map((f) => (
                <div
                  key={f.name}
                  className='flex items-center'
                  style={{
                    gap: 'var(--dim-space-300, 12px)',
                    padding: 'var(--dim-space-300, 12px)',
                    borderRadius: 'var(--dim-radius-400, 12px)',
                    border: 'var(--dim-stroke-100) solid var(--border-content-tertiary)',
                  }}
                >
                  <MobileIconBadge icon='picture_as_pdf' tone='blue' size={40} iconSize={18} />
                  <div className='flex-1 min-w-0'>
                    <p style={{ margin: 0, fontSize: 'var(--type-size-sm)', fontWeight: 'var(--type-weight-bold, 700)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {f.name}
                    </p>
                    <p style={{ margin: 0, fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>{f.size}</p>
                  </div>
                  <button
                    type='button'
                    aria-label='ดาวน์โหลด'
                    onClick={() => window.alert(`ดาวน์โหลด ${f.name} (สาธิต)`)}
                    style={{
                      width: 36, height: 36, borderRadius: 'var(--dim-radius-full)', border: 0,
                      background: 'var(--surface-brandPrimary-quaternary)', color: 'var(--text-brandPrimary-default)',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <Sym name='download' size={18} />
                  </button>
                </div>
              ))}
            </div>
          </Card>
        )}

        {v.certificateRequested === true && (
          <BrandSubdueButton
            variant='outline'
            size='lg'
            leadingIcon='download'
            onClick={() => window.alert('บันทึกใบรับรองแพทย์แล้ว (สาธิต)')}
          >
            บันทึกใบรับรองแพทย์
          </BrandSubdueButton>
        )}

        {/* Payment */}
        {v.payment && (
          <Card>
            <SectionTitle>การชำระเงิน</SectionTitle>
            <div className='flex items-center' style={{ gap: 'var(--dim-space-300, 12px)', marginBottom: 'var(--dim-space-400, 16px)' }}>
              <MobileIconBadge icon='qr_code_2' tone='green' size={40} iconSize={18} />
              <div>
                <p style={{ margin: 0, fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>ช่องทางชำระเงิน</p>
                <p style={{ margin: 0, fontSize: 'var(--type-size-sm)', fontWeight: 'var(--type-weight-bold, 700)' }}>
                  {v.payment.channel || 'พร้อมเพย์'}
                </p>
              </div>
            </div>
            <div className='flex' style={{ gap: 'var(--dim-space-300, 12px)' }}>
              <BrandSubdueButton
                variant='outline'
                size='md'
                leadingIcon='visibility'
                style={{ flex: 1 }}
                onClick={() => history.push(v.payment.billId ? `/m/payment/${v.payment.billId}` : '/m/payment')}
              >
                ดูใบเสร็จ
              </BrandSubdueButton>
              <BrandButton
                size='md'
                leadingIcon='download'
                style={{ flex: 1 }}
                onClick={() => window.alert('บันทึกใบเสร็จแล้ว (สาธิต)')}
              >
                บันทึกใบเสร็จ
              </BrandButton>
            </div>
          </Card>
        )}
      </div>
    </>
  );
};

const MobileVisitPage = () => (
  <MobileShell
    requireAuth
    showBottomNav={false}
    background='var(--background-screen-brand-100, #F4FBF8)'
  >
    <MobileVisitInner />
  </MobileShell>
);

export default MobileVisitPage;
