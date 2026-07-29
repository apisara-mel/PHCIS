import React from 'react';
import { buildRightsDetail } from '@/data/kioskMock';
import { Sym, cardSurface, primaryBtn, ghostBtn } from '@/pages/kiosk/kioskUi';

/* Stitch: rights-detail — TOR 1.16.1.1 / 1.16.1.2 / 1.16.1.3
   Ref: docs/kiosk/stitch/images/rights-detail.png */

const RightsDetailScreen = ({ patient, onConfirm, onPrint }) => {
  const rights = buildRightsDetail(patient);

  return (
    <div
      style={{
        flex: '1 1 0%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--dim-space-600, 24px)',
        fontFamily: 'var(--type-family-body)',
        minHeight: 0,
      }}
    >
      <div>
        <h1
          style={{
            margin: 0,
            fontSize: 'var(--type-size-3xl, 30px)',
            fontWeight: 'var(--type-weight-bold, 700)',
            color: 'var(--text-brandPrimary-default, #007549)',
          }}
        >
          สถานะการตรวจสอบสิทธิ์
        </h1>
        <p style={{ margin: 'var(--dim-space-100, 4px) 0 0', fontSize: 'var(--type-size-lg, 18px)', color: 'var(--text-content-secondary, #565D6D)' }}>
          โปรดยืนยันข้อมูลส่วนตัวและสถานะสิทธิประโยชน์ของคุณ
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 'var(--dim-space-600, 24px)', flex: 1, minHeight: 0 }}>
        <div style={{ ...cardSurface, padding: 'var(--dim-space-800, 32px)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--dim-space-400, 16px)' }}>
          <div style={{ position: 'relative' }}>
            <div
              style={{
                width: 120,
                height: 120,
                borderRadius: 'var(--dim-radius-full, 9999px)',
                background: 'var(--surface-brandPrimary-quaternary, #F4FBF8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: 'var(--dim-stroke-200, 2px) solid var(--border-brandPrimary-quaternary, #B1E6CD)',
              }}
            >
              <Sym name='person' size={64} color='var(--icon-brandPrimary-default, #007549)' />
            </div>
            <span
              style={{
                position: 'absolute',
                right: 4,
                bottom: 4,
                width: 32,
                height: 32,
                borderRadius: 'var(--dim-radius-full, 9999px)',
                background: 'var(--surface-brandPrimaryButton-default, #007549)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Sym name='check' size={20} color='#FFFFFF' />
            </span>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 'var(--type-size-xl, 20px)', fontWeight: 'var(--type-weight-bold, 700)', color: 'var(--text-content-default)' }}>
              {patient?.fullName || '—'}
            </div>
            <div style={{ marginTop: 4, fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-tertiary)' }}>
              รหัสผู้ป่วย: {patient?.hn || '—'}
            </div>
          </div>
          <dl style={{ width: '100%', margin: 0, display: 'flex', flexDirection: 'column', gap: 'var(--dim-space-300, 12px)', fontSize: 'var(--type-size-base, 16px)' }}>
            {[
              ['วันเกิด / อายุ', rights?.dobLabel],
              ['หมู่เลือด', rights?.bloodType],
              ['ภาษา', rights?.languages],
              ['กลุ่มสิทธิ์', patient?.rightsGroup],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <dt style={{ color: 'var(--text-content-tertiary)', margin: 0 }}>{k}</dt>
                <dd style={{ margin: 0, fontWeight: 'var(--type-weight-medium, 500)', color: 'var(--text-content-default)' }}>{v}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--dim-space-400, 16px)', minWidth: 0 }}>
          <div
            style={{
              ...cardSurface,
              background: 'var(--surface-brandPrimaryButton-default, #007549)',
              border: 'none',
              padding: 'var(--dim-space-600, 24px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 'var(--dim-space-400, 16px)',
              color: 'var(--text-content-on-content, #FFFFFF)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--dim-space-400, 16px)' }}>
              <Sym name='verified_user' size={40} color='#FFFFFF' fill />
              <div>
                <div style={{ fontSize: 'var(--type-size-2xl, 24px)', fontWeight: 'var(--type-weight-bold, 700)' }}>
                  {rights?.statusLabel}
                </div>
                <span
                  style={{
                    display: 'inline-block',
                    marginTop: 8,
                    padding: '4px 12px',
                    borderRadius: 'var(--dim-radius-full, 9999px)',
                    background: 'var(--surface-brandPrimary-secondary, #C5EDDA)',
                    color: 'var(--text-brandPrimary-default, #007549)',
                    fontSize: 'var(--type-size-sm, 14px)',
                    fontWeight: 'var(--type-weight-medium, 500)',
                  }}
                >
                  ใช้ได้ถึงปี {rights?.validUntil}
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--dim-space-400, 16px)' }}>
            <div style={{ ...cardSurface, padding: 'var(--dim-space-600, 24px)' }}>
              <Sym name='local_hospital' size={32} color='var(--icon-brandPrimary-default, #007549)' />
              <div style={{ marginTop: 12, fontWeight: 'var(--type-weight-bold, 700)', fontSize: 'var(--type-size-lg, 18px)' }}>
                {rights?.hospital}
              </div>
              <div style={{ marginTop: 8, color: 'var(--text-content-secondary)', fontSize: 'var(--type-size-sm, 14px)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Sym name='call' size={16} />
                {rights?.hospitalPhone}
              </div>
            </div>
            <div style={{ ...cardSurface, padding: 'var(--dim-space-600, 24px)' }}>
              <Sym name='description' size={32} color='var(--icon-brandPrimary-default, #007549)' />
              <div style={{ marginTop: 12, fontWeight: 'var(--type-weight-bold, 700)', fontSize: 'var(--type-size-lg, 18px)' }}>
                {rights?.coverageTitle}
              </div>
              <ul style={{ margin: '12px 0 0', paddingLeft: 20, color: 'var(--text-content-secondary)', fontSize: 'var(--type-size-sm, 14px)' }}>
                {(rights?.coverageItems || []).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 'var(--dim-space-300, 12px)', marginTop: 'auto' }}>
            <button type='button' onClick={onConfirm} style={{ ...primaryBtn, flex: 1 }}>
              <Sym name='person_add' size={24} color='#FFFFFF' />
              ยืนยันและเช็คอิน
            </button>
            <button type='button' onClick={onPrint} style={{ ...ghostBtn, width: 64, justifyContent: 'center', padding: 0 }} aria-label='พิมพ์สรุปสิทธิ์'>
              <Sym name='print' size={28} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RightsDetailScreen;
