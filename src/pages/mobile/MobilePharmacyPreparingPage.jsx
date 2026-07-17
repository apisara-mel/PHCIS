import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { AppNotification, BrandButton, MobileShell } from '@/components/mobile';
import { StepIcon } from '@/components/mobile/stepIcons';
import Alert from '@/components/alert/Alert';
import LottieIllustration from '@/components/illustrations/LottieIllustration';
import { usePhcisLink } from '@/data/phcisLink';

const ILLUSTRATION_PATH = '/illustration/mobile/medical-folder-recolored.json';

const STEPS = [
  { key: 'book', label: 'จองนัด', icon: 'check', state: 'done' },
  { key: 'consult', label: 'ปรึกษาแพทย์', icon: 'check', state: 'done' },
  { key: 'pharmacy', label: 'จัดยา', icon: 'pill', state: 'active' },
  { key: 'pay', label: 'ชำระเงิน', icon: 'bill', state: 'upcoming' },
  { key: 'receive', label: 'รับยา', icon: 'medicine', state: 'upcoming' },
];

const PharmacyIllustration = () => {
  const [animationData, setAnimationData] = useState(null);

  useEffect(() => {
    let mounted = true;
    fetch(ILLUSTRATION_PATH)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (mounted) setAnimationData(data);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <LottieIllustration
      animationData={animationData}
      size='calc(var(--dim-size-2000, 128px) + var(--dim-size-600, 32px))'
      loop
    />
  );
};

const CareJourney = () => (
  <div
    className='flex items-start w-full'
    style={{ padding: 'var(--dim-space-600, 24px) 0' }}
  >
    {STEPS.map((step, index) => {
      const first = index === 0;
      const last = index === STEPS.length - 1;
      const completed = step.state === 'done';
      const active = step.state === 'active';
      const circleBackground = completed
        ? 'var(--surface-positive-tertiary, #D1F6EE)'
        : active
          ? 'var(--background-screen-brand-100, #F4FBF8)'
          : 'var(--surface-card-100, #FFFFFF)';

      return (
        <div
          key={step.key}
          className='flex flex-col items-center'
          style={{
            flex: 1,
            minWidth: 0,
            gap: 'var(--dim-space-100, 4px)',
          }}
        >
          <div className='flex items-center w-full'>
            <span
              style={{
                flex: 1,
                height: 'var(--dim-stroke-200, 2px)',
                background: first ? 'transparent' : 'var(--border-brandPrimary-default, #007549)',
              }}
            />
            <span
              className='inline-flex items-center justify-center shrink-0'
              style={{
                boxSizing: 'border-box',
                width: 'var(--dim-size-1000, 48px)',
                height: 'var(--dim-size-1000, 48px)',
                borderRadius: 'var(--dim-radius-full, 9999px)',
                border: 'var(--dim-stroke-200, 2px) solid var(--border-brandPrimary-default, #007549)',
                background: circleBackground,
              }}
            >
              <StepIcon name={step.icon} size='var(--dim-size-400, 20px)' />
            </span>
            <span
              style={{
                flex: 1,
                height: 'var(--dim-stroke-200, 2px)',
                background: last ? 'transparent' : 'var(--border-brandPrimary-default, #007549)',
              }}
            />
          </div>
          <span
            style={{
              fontFamily: 'var(--type-family-heading-graphic2)',
              fontSize: 'var(--type-size-xs, 12px)',
              lineHeight: 1.5,
              textAlign: 'center',
              color: completed
                ? 'var(--text-brandPrimary-default, #007549)'
                : 'var(--text-content-secondary, #636B72)',
            }}
          >
            {step.label}
          </span>
        </div>
      );
    })}
  </div>
);

const PharmacyPreparingInner = () => {
  const history = useHistory();
  const { appointments } = usePhcisLink();
  const [pharmacyReady, setPharmacyReady] = useState(false);
  const hasCompletedTelemed = appointments.some((appointment) => appointment.telemedDone);

  useEffect(() => {
    if (!hasCompletedTelemed) return undefined;
    const timer = window.setTimeout(() => setPharmacyReady(true), 5000);
    return () => window.clearTimeout(timer);
  }, [hasCompletedTelemed]);

  return (
    <main
      className='flex items-center justify-center'
      style={{
        height: '100%',
        minHeight: 0,
        position: 'relative',
        overflow: 'hidden',
        padding: 'var(--dim-space-600, 24px) var(--dim-space-400, 16px)',
        background: 'linear-gradient(155.3deg, rgb(19 178 146) 0%, rgb(1 180 160) 100%)',
      }}
    >
      {pharmacyReady && (
        <AppNotification
          title='พร้อมชำระเงินแล้ว'
          timeLabel='เมื่อสักครู่'
          body='เภสัชกรจัดยาสำหรับการปรึกษาวันที่ 1 ก.ค. 2569 เรียบร้อยแล้ว แตะเพื่อดูรายการและชำระเงิน'
          onDismiss={() => setPharmacyReady(false)}
          onClick={() => history.push('/m/pharmacy/payment')}
        />
      )}

      <section
        className='flex flex-col items-center'
        style={{
          width: '100%',
          gap: 'var(--dim-space-400, 16px)',
          padding: 'var(--dim-space-1200, 48px) var(--dim-space-400, 16px)',
          background: 'var(--surface-card-100, #FFFFFF)',
          borderTopLeftRadius: 'calc(var(--dim-size-1500, 68px) + var(--dim-size-600, 32px))',
          borderTopRightRadius: 'calc(var(--dim-size-1500, 68px) + var(--dim-size-600, 32px))',
          borderBottomLeftRadius: 'var(--dim-radius-600, 24px)',
          borderBottomRightRadius: 'var(--dim-radius-600, 24px)',
        }}
      >
        <PharmacyIllustration />

        <h1
          style={{
            margin: 0,
            width: '100%',
            fontFamily: 'var(--type-family-heading-graphic2)',
            fontSize: 'var(--type-size-2xl, 24px)',
            fontWeight: 'var(--type-weight-regular, 400)',
            lineHeight: 1.375,
            textAlign: 'center',
            color: 'var(--text-brandPrimary-default, #007549)',
          }}
        >
          กำลังส่งรายการยาไปที่ห้องยา
        </h1>

        <p
          style={{
            margin: 0,
            width: '100%',
            fontFamily: 'var(--type-family-heading-graphic2)',
            fontSize: 'var(--type-size-base, 16px)',
            lineHeight: 1.5,
            textAlign: 'center',
            color: 'var(--text-content-secondary, #636B72)',
          }}
        >
          เภสัชกรกำลังจัดยาของคุณ
          <br />
          ระบบจะแจ้งเตือนเมื่อจัดยาเสร็จ
        </p>

        <CareJourney />

        <Alert
          type='info'
          title='เราจะแจ้งเตือนเมื่อจัดยาเสร็จ ดังนั้นไม่จำเป็นต้องรออยู่ที่หน้านี้'
          showSubtext={false}
          showIndicator={false}
          showBadge={false}
          showDetail={false}
          maxContentHeight={null}
          titleStyle={{
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-xs, 12px)',
            fontWeight: 'var(--type-weight-medium, 500)',
            lineHeight: 1.5,
          }}
        />

        <BrandButton
          size='lg'
          leadingIcon='home'
          onClick={() => history.push('/m/home')}
          style={{
            width: 'var(--dim-size-2170, 177px)',
            whiteSpace: 'nowrap',
          }}
        >
          กลับหน้าหลัก
        </BrandButton>
      </section>
    </main>
  );
};

const MobilePharmacyPreparingPage = () => {
  const background = 'linear-gradient(155.3deg, rgb(19 178 146) 0%, rgb(1 180 160) 100%)';

  return (
    <MobileShell
      requireAuth
      showBottomNav={false}
      homeIndicatorOverlay
      homeIndicatorBackground='transparent'
      background={background}
      statusBarTone='transparentDark'
      statusBarStyle={{ height: 'var(--dim-size-1050, 50px)' }}
    >
      <PharmacyPreparingInner />
    </MobileShell>
  );
};

export default MobilePharmacyPreparingPage;
