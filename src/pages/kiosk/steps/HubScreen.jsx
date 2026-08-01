import React from 'react';
import { HUB_SERVICES } from '@/data/kioskMock';
import { Sym, cardSurface } from '@/pages/kiosk/kioskUi';

/* Stitch: service-select — hub for TOR §1.16 paths.
   Ref: docs/kiosk/stitch/images/service-select.png */

const HubScreen = ({ onPick }) => (
  <div
    style={{
      flex: '1 1 0%',
      minHeight: 0,
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 'var(--dim-space-800, 32px)',
      fontFamily: 'var(--type-family-body)',
    }}
  >
    <div style={{ textAlign: 'center', maxWidth: 900 }}>
      <h1
        style={{
          margin: 0,
          fontSize: 'var(--type-size-4xl, 36px)',
          fontWeight: 'var(--type-weight-bold, 700)',
          color: 'var(--text-content-default, #171A1F)',
          lineHeight: 1.3,
        }}
      >
        ยินดีต้อนรับสู่สำนักอนามัย
      </h1>
      <p
        style={{
          margin: 'var(--dim-space-200, 8px) 0 0',
          fontSize: 'var(--type-size-xl, 20px)',
          color: 'var(--text-content-secondary, #565D6D)',
        }}
      >
        กรุณาเลือกบริการที่คุณต้องการทำรายการในวันนี้
      </p>
      <p
        style={{
          margin: 'var(--dim-space-100, 4px) 0 0',
          fontSize: 'var(--type-size-base, 16px)',
          color: 'var(--text-content-tertiary, #858C92)',
        }}
      >
        Please select your desired service
      </p>
    </div>

    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
        gap: 'var(--dim-space-600, 24px)',
        width: '100%',
        maxWidth: 1280,
      }}
    >
      {HUB_SERVICES.map((svc) => (
        <button
          key={svc.key}
          type='button'
          onClick={() => onPick(svc)}
          style={{
            ...cardSurface,
            padding: 'var(--dim-space-800, 32px) var(--dim-space-600, 24px)',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            gap: 'var(--dim-space-400, 16px)',
            minHeight: 280,
            transition: 'transform 120ms ease, box-shadow 120ms ease',
          }}
        >
          <span
            style={{
              width: 72,
              height: 72,
              borderRadius: 'var(--dim-radius-full, 9999px)',
              background: 'var(--surface-brandPrimary-default, #54CF97)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-content-on-content, #FFFFFF)',
            }}
          >
            <Sym name={svc.icon} size={36} color='#FFFFFF' />
          </span>
          <div>
            <div
              style={{
                fontSize: 'var(--type-size-xl, 20px)',
                fontWeight: 'var(--type-weight-bold, 700)',
                color: 'var(--text-content-default, #171A1F)',
              }}
            >
              {svc.label}
            </div>
            <div
              style={{
                marginTop: 'var(--dim-space-100, 4px)',
                fontSize: 'var(--type-size-base, 16px)',
                fontWeight: 'var(--type-weight-bold, 700)',
                color: 'var(--text-brandPrimary-default, #007549)',
              }}
            >
              {svc.labelEn}
            </div>
            <div
              style={{
                marginTop: 'var(--dim-space-300, 12px)',
                fontSize: 'var(--type-size-sm, 14px)',
                color: 'var(--text-content-tertiary, #858C92)',
                lineHeight: 1.45,
              }}
            >
              {svc.desc}
            </div>
          </div>
        </button>
      ))}
    </div>

    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--dim-space-300, 12px)',
        padding: 'var(--dim-space-300, 12px) var(--dim-space-600, 24px)',
        borderRadius: 'var(--dim-radius-full, 9999px)',
        background: 'var(--surface-neutral-tertiary, #F4F5F5)',
        color: 'var(--text-content-secondary, #565D6D)',
        fontSize: 'var(--type-size-base, 16px)',
      }}
    >
      <span
        style={{
          width: 32,
          height: 32,
          borderRadius: 'var(--dim-radius-full, 9999px)',
          background: 'var(--surface-brandPrimary-default, #54CF97)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Sym name='help' size={20} color='#FFFFFF' />
      </span>
      ต้องการความช่วยเหลือ? เจ้าหน้าที่ของเราพร้อมให้บริการท่าน
    </div>
  </div>
);

export default HubScreen;
