import React from 'react';
import { useHistory } from 'react-router-dom';
import SuccessScreen from '@/components/layout/SuccessScreen';

/* PHCIS Sign-in · Success — Figma "PHCIS-Signin" Success (node 112:10776).
   Terminal screen after the password is set. Reuses the shared <SuccessScreen>
   template (Check Mark Lottie + headline + CTA) used across the create/publish
   flows, so the success surface stays consistent system-wide. */

export default function LoginSuccessPage() {
  const history = useHistory();

  return (
    <SuccessScreen
      title='คุณเข้าสู่ระบบสำเร็จ'
      buttonLabel='เข้าสู่หน้าหลัก'
      onDone={() => history.push('/hub')}
      loop
      buttonWidth='var(--dim-size-2470)'
    />
  );
}
