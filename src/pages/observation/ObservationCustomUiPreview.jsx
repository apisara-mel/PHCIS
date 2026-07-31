import React, { useState } from 'react';
import Alert from '@/components/alert/Alert';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import BrandPrimaryButton from '@/components/button/BrandPrimaryButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import { OVERSTAY_LIMIT_MINUTES } from '@/data/observationMock';

/* TEMPORARY — decision aid, not product surface.
   Route: /observation/preview-custom-ui

   The Observation module introduced two pieces of bespoke UI: a local
   `AlertChip` pill and five hand-rolled `<div role='alert'>` boxes. This
   page renders each of them beside the design-system component that
   already covers the same job, using identical content, so the question
   "should these be promoted into the design system, or replaced by what
   is already there?" can be answered by looking rather than arguing.

   Delete this file (and its route) once that call is made. */

/* Verbatim copy of the AlertChip declared inside ObservationQueuePage —
   duplicated here on purpose so the comparison shows exactly what ships
   today, and so deleting this preview cannot affect the real page. */
const AlertChip = ({ tone = 'red', icon, children }) => (
  <span
    className='inline-flex items-center whitespace-nowrap'
    style={{
      gap: 'var(--dim-space-100, 4px)',
      paddingTop: 'var(--dim-space-050, 2px)',
      paddingBottom: 'var(--dim-space-050, 2px)',
      paddingLeft: 'var(--dim-space-200, 8px)',
      paddingRight: 'var(--dim-space-200, 8px)',
      borderRadius: 'var(--dim-radius-150, 6px)',
      background: tone === 'red' ? 'var(--surface-colorfulbadge-red, #FEE2E2)' : 'var(--surface-colorfulbadge-orange, #FFEDD5)',
      color: tone === 'red' ? 'var(--text-colorfulbadge-red, #B91C1C)' : 'var(--text-colorfulbadge-orange, #C2410C)',
      border: `var(--dim-stroke-100, 1px) solid ${tone === 'red' ? 'var(--surface-colorfulbadge-red-bold, #EF4444)' : 'var(--surface-colorfulbadge-orange-bold, #F97316)'}`,
      fontSize: 'var(--type-size-xs)',
      fontWeight: 'var(--type-weight-bold)',
    }}
  >
    {icon && <span className='material-symbols-outlined' style={{ fontSize: 14 }}>{icon}</span>}
    {children}
  </span>
);

/* Verbatim copy of the hand-rolled alert box shape used five times
   across the Observation screens. */
const HandRolledAlert = ({ tone = 'red', icon, title, children }) => (
  <div
    role='alert'
    className='w-full flex flex-wrap items-center'
    style={{
      gap: 'var(--dim-space-300)',
      background: tone === 'red' ? 'var(--surface-colorfulbadge-red, #FEE2E2)' : 'var(--surface-colorfulbadge-orange, #FFEDD5)',
      border: `var(--dim-stroke-100) solid ${tone === 'red' ? 'var(--surface-colorfulbadge-red-bold, #EF4444)' : 'var(--surface-colorfulbadge-orange-bold, #F97316)'}`,
      borderRadius: 'var(--dim-radius-400)',
      paddingTop: 'var(--dim-space-400)',
      paddingRight: 'var(--dim-space-500)',
      paddingBottom: 'var(--dim-space-400)',
      paddingLeft: 'var(--dim-space-500)',
    }}
  >
    <span
      className='material-symbols-outlined'
      style={{ fontSize: 24, color: tone === 'red' ? 'var(--text-colorfulbadge-red, #B91C1C)' : 'var(--text-colorfulbadge-orange, #C2410C)' }}
    >
      {icon}
    </span>
    <div className='flex-1 min-w-0'>
      <div style={{ color: tone === 'red' ? 'var(--text-colorfulbadge-red, #B91C1C)' : 'var(--text-colorfulbadge-orange, #C2410C)', fontSize: 'var(--type-size-base)', fontWeight: 'var(--type-weight-bold)' }}>
        {title}
      </div>
      <div style={{ color: tone === 'red' ? 'var(--text-colorfulbadge-red, #B91C1C)' : 'var(--text-colorfulbadge-orange, #C2410C)', fontSize: 'var(--type-size-sm)' }}>
        {children}
      </div>
    </div>
  </div>
);

const Panel = ({ label, verdict, children }) => (
  <div
    className='flex-1 min-w-0 flex flex-col'
    style={{
      gap: 'var(--dim-space-300)',
      background: 'var(--surface-card-100)',
      border: 'var(--dim-stroke-100) solid var(--border-card-default)',
      borderRadius: 'var(--dim-radius-400)',
      paddingTop: 'var(--dim-space-400)',
      paddingRight: 'var(--dim-space-400)',
      paddingBottom: 'var(--dim-space-400)',
      paddingLeft: 'var(--dim-space-400)',
    }}
  >
    <div className='flex items-baseline' style={{ gap: 'var(--dim-space-200)' }}>
      <span style={{ color: 'var(--text-content-default)', fontSize: 'var(--type-size-sm)', fontWeight: 'var(--type-weight-bold)' }}>
        {label}
      </span>
      <span style={{ color: 'var(--text-content-tertiary)', fontSize: 'var(--type-size-xs)' }}>{verdict}</span>
    </div>
    <div className='flex flex-col' style={{ gap: 'var(--dim-space-300)' }}>{children}</div>
  </div>
);

const Section = ({ n, title, note, children }) => (
  <section className='flex flex-col' style={{ gap: 'var(--dim-space-400)' }}>
    <div>
      <h2 style={{ color: 'var(--text-content-default)', fontSize: 'var(--type-size-lg)', fontWeight: 'var(--type-weight-bold)' }}>
        {n}. {title}
      </h2>
      <p style={{ color: 'var(--text-content-secondary)', fontSize: 'var(--type-size-sm)' }}>{note}</p>
    </div>
    <div className='flex flex-wrap items-start' style={{ gap: 'var(--dim-space-400)' }}>{children}</div>
  </section>
);

export default function ObservationCustomUiPreview() {
  const [dark, setDark] = useState(false);

  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    /* Two switches, because the codebase has two: `data-mode` drives the
       Tailwind class overrides in src/index.css, `data-theme` drives the
       token overrides in @mih/design-tokens. Setting only one leaves the
       page half-converted. */
    ['data-mode', 'data-theme'].forEach((attr) => {
      if (next) document.documentElement.setAttribute(attr, 'dark');
      else document.documentElement.removeAttribute(attr);
    });
  };

  return (
    <div
      className='min-h-screen w-full'
      style={{
        background: 'var(--background-screen-brand-100, #F4FBF8)',
        paddingTop: 'var(--dim-space-600)',
        paddingRight: 'var(--dim-space-600)',
        paddingBottom: 'var(--dim-space-900, 48px)',
        paddingLeft: 'var(--dim-space-600)',
      }}
    >
      <div className='mx-auto flex flex-col' style={{ maxWidth: 1200, gap: 'var(--dim-space-700, 32px)' }}>
        <header className='flex flex-wrap items-end justify-between' style={{ gap: 'var(--dim-space-400)' }}>
          <div>
            <h1 style={{ color: 'var(--text-content-default)', fontSize: 'var(--type-size-2xl, 24px)', fontWeight: 'var(--type-weight-bold)' }}>
              UI ที่สร้างขึ้นใหม่ในระบบสังเกตอาการ
            </h1>
            <p style={{ color: 'var(--text-content-secondary)', fontSize: 'var(--type-size-sm)' }}>
              เทียบของที่เขียนเองกับ component ที่มีอยู่แล้วใน design system โดยใช้เนื้อหาเดียวกัน
              เพื่อตัดสินว่าควรเพิ่มเข้า design system หรือใช้ของเดิมแทน
            </p>
          </div>
          <div className='flex flex-col items-end' style={{ gap: 'var(--dim-space-150)' }}>
            <NeutralSubdueButton variant='outline' leadingIcon={dark ? 'light_mode' : 'dark_mode'} onClick={toggleDark}>
              {dark ? 'กลับเป็น Light mode' : 'ดูใน Dark mode'}
            </NeutralSubdueButton>
            <p style={{ color: 'var(--text-content-tertiary)', fontSize: 'var(--type-size-xs)', maxWidth: 340, textAlign: 'right' }}>
              หมายเหตุ: token ชุด <code>--surface-alert-*</code> และ <code>--surface-colorfulbadge-*</code>{' '}
              <strong>ไม่มีค่า override สำหรับ dark mode</strong> ใน token build ปัจจุบัน ทั้งคู่ — สลับโหมดแล้วสองฝั่งจึงไม่ต่างกัน
            </p>
          </div>
        </header>

        <Section
          n={1}
          title='ป้ายสถานะบนการ์ดเตียง'
          note='ใช้ 6 จุด — Code Red, เกินเวลา, เตียงเสริม ทั้งในการ์ดและในตาราง'
        >
          <Panel label='เขียนเอง — AlertChip' verdict='ประกาศไว้ใน ObservationQueuePage.jsx'>
            <div className='flex flex-wrap items-center' style={{ gap: 'var(--dim-space-200)' }}>
              <AlertChip tone='red' icon='emergency_home'>EWS Red Alert (EWS 7) — อาการทรุดลง</AlertChip>
              <AlertChip tone='orange' icon='hourglass_top'>Overstay Warning (เกิน {OVERSTAY_LIMIT_MINUTES / 60} ชม.)</AlertChip>
              <AlertChip tone='orange' icon='airline_seat_flat'>เตียงเสริม (Extra Bed)</AlertChip>
              <AlertChip tone='red' icon='emergency_home'>Code Red</AlertChip>
            </div>
          </Panel>

          <Panel label='ของเดิม — ColorfulBadge' verdict='@/components/badge/ColorfulBadge · Figma DS Foundation'>
            <div className='flex flex-wrap items-center' style={{ gap: 'var(--dim-space-200)' }}>
              <ColorfulBadge style='red' icon='emergency_home' fill='outline'>EWS Red Alert (EWS 7) — อาการทรุดลง</ColorfulBadge>
              <ColorfulBadge style='orange' icon='hourglass_top' fill='outline'>Overstay Warning (เกิน {OVERSTAY_LIMIT_MINUTES / 60} ชม.)</ColorfulBadge>
              <ColorfulBadge style='orange' icon='airline_seat_flat' fill='outline'>เตียงเสริม (Extra Bed)</ColorfulBadge>
              <ColorfulBadge style='red' icon='emergency_home' fill='outline'>Code Red</ColorfulBadge>
            </div>
            <div className='flex flex-wrap items-center' style={{ gap: 'var(--dim-space-200)' }}>
              <ColorfulBadge style='red' icon='emergency_home'>EWS Red Alert (EWS 7) — อาการทรุดลง</ColorfulBadge>
              <ColorfulBadge style='orange' icon='hourglass_top'>Overstay Warning (เกิน {OVERSTAY_LIMIT_MINUTES / 60} ชม.)</ColorfulBadge>
              <span style={{ color: 'var(--text-content-tertiary)', fontSize: 'var(--type-size-xs)' }}>← แบบ fill (ค่าเริ่มต้น)</span>
            </div>
          </Panel>
        </Section>

        <Section
          n={2}
          title='กล่องแจ้งเตือนระดับหน้าจอ'
          note='ใช้ 5 จุด — เตียงเต็ม, ค่า vital เกินช่วง, คำเตือน DAMA, ยืนยัน Code Red, STAT ค้าง'
        >
          <Panel label='เขียนเอง — div role="alert"' verdict='inline style ซ้ำกัน 5 ที่'>
            <HandRolledAlert tone='red' icon='do_not_disturb_on' title='เตียงเต็มทุกเตียง (Full Capacity)'>
              เตียงสังเกตอาการถูกครองครบทั้ง 10 เตียง — หากมีผู้ป่วยฉุกเฉินต้องการเตียงเพิ่ม ให้ลงทะเบียนเตียงเสริม (เตียง 11-Extra)
            </HandRolledAlert>
            <HandRolledAlert tone='red' icon='error' title='กรุณาตรวจสอบตัวเลขก่อนบันทึก'>
              อุณหภูมิ (Temp): กรอก 368 °C — ค่าที่รับได้คือ 30–43 °C
            </HandRolledAlert>
          </Panel>

          <Panel label='ของเดิม — Alert' verdict='@/components/alert/Alert · Figma 297:59'>
            <Alert
              type='error'
              title='เตียงเต็มทุกเตียง (Full Capacity)'
              subtext='เตียงสังเกตอาการถูกครองครบทั้ง 10 เตียง — หากมีผู้ป่วยฉุกเฉินต้องการเตียงเพิ่ม ให้ลงทะเบียนเตียงเสริม (เตียง 11-Extra)'
              showCloseButton={false}
            />
            <Alert
              type='error'
              title='กรุณาตรวจสอบตัวเลขก่อนบันทึก'
              subtext='อุณหภูมิ (Temp): กรอก 368 °C — ค่าที่รับได้คือ 30–43 °C'
              showCloseButton={false}
            />
            <Alert
              type='warning'
              title='ยังมีคำสั่งการรักษา STAT ค้างอยู่ 1 รายการ'
              subtext='คุณต้องการยกเลิกคำสั่งเหล่านี้ หรือยืนยันจำหน่ายต่อโดยคงคำสั่งไว้ในแฟ้ม?'
              indicators={['Prepare E-Referral to Central Hospital (โรงพยาบาลตากสิน) · สั่งเมื่อ 11:20 น.']}
              showCloseButton={false}
            />
          </Panel>
        </Section>

        <Section
          n={3}
          title='แถบต้องดูแลด่วน'
          note='ใช้ 1 จุด — ไม่มี component ใน design system ที่ตรงกับพฤติกรรมนี้ (รายการที่กดแล้วพาไปยังผู้ป่วยรายนั้น)'
        >
          <Panel label='เขียนเอง — Ward attention bar' verdict='ยังไม่มีของเทียบใน DS'>
            <div
              className='w-full flex flex-wrap items-center'
              style={{
                gap: 'var(--dim-space-300)',
                background: 'var(--surface-card-100)',
                border: 'var(--dim-stroke-200) solid var(--surface-colorfulbadge-red-bold, #EF4444)',
                borderRadius: 'var(--dim-radius-400)',
                paddingTop: 'var(--dim-space-400)',
                paddingRight: 'var(--dim-space-500)',
                paddingBottom: 'var(--dim-space-400)',
                paddingLeft: 'var(--dim-space-500)',
              }}
            >
              <span className='inline-flex items-center shrink-0' style={{ gap: 'var(--dim-space-200)', color: 'var(--text-content-default)', fontSize: 'var(--type-size-sm)', fontWeight: 'var(--type-weight-bold)' }}>
                <span className='material-symbols-outlined' style={{ fontSize: 20, color: 'var(--text-colorfulbadge-red, #B91C1C)' }}>notification_important</span>
                ต้องดูแลด่วน (2)
              </span>
              <div className='flex flex-wrap items-center flex-1 min-w-0' style={{ gap: 'var(--dim-space-200)' }}>
                {[
                  { tone: 'red', icon: 'emergency_home', bed: 'เตียง 04', name: 'นาย ประเสริฐ ยิ้มแย้ม', reason: 'NEWS 7 · อาการทรุดลง' },
                  { tone: 'orange', icon: 'hourglass_top', bed: 'เตียง 01', name: 'นาย สมชาย ใจดี', reason: 'ครองเตียง 6 ชม. 35 นาที · รอประเมินซ้ำ' },
                ].map((item) => (
                  <button
                    key={item.bed}
                    type='button'
                    className='mih-observation-focusable inline-flex items-center'
                    style={{
                      gap: 'var(--dim-space-150)',
                      paddingTop: 'var(--dim-space-200)',
                      paddingBottom: 'var(--dim-space-200)',
                      paddingLeft: 'var(--dim-space-300)',
                      paddingRight: 'var(--dim-space-300)',
                      borderRadius: 'var(--dim-radius-200, 8px)',
                      background: item.tone === 'red' ? 'var(--surface-colorfulbadge-red, #FEE2E2)' : 'var(--surface-colorfulbadge-orange, #FFEDD5)',
                      color: item.tone === 'red' ? 'var(--text-colorfulbadge-red, #B91C1C)' : 'var(--text-colorfulbadge-orange, #C2410C)',
                      border: `var(--dim-stroke-100) solid ${item.tone === 'red' ? 'var(--surface-colorfulbadge-red-bold, #EF4444)' : 'var(--surface-colorfulbadge-orange-bold, #F97316)'}`,
                      fontSize: 'var(--type-size-sm)',
                      minHeight: 'var(--dim-size-900, 44px)',
                    }}
                  >
                    <span className='material-symbols-outlined' style={{ fontSize: 18 }}>{item.icon}</span>
                    <strong>{item.bed}</strong>
                    <span className='truncate' style={{ maxWidth: 180 }}>{item.name}</span>
                    <span style={{ opacity: 0.85 }}>· {item.reason}</span>
                    <span className='material-symbols-outlined' style={{ fontSize: 18 }}>chevron_right</span>
                  </button>
                ))}
              </div>
            </div>
            <p style={{ color: 'var(--text-content-secondary)', fontSize: 'var(--type-size-xs)' }}>
              ถ้าจะทำให้ใช้ซ้ำได้ ต้องแยกเป็น 2 ส่วน: ตัวแถบ (AttentionBar) และรายการในแถบ ซึ่งจริง ๆ คือ ColorfulBadge ที่กดได้ —
              คำถามคือแผนกอื่น (เภสัช, Lab, X-Ray) ต้องการแถบแบบนี้ด้วยหรือเปล่า
            </p>
          </Panel>
        </Section>

        <div
          style={{
            background: 'var(--surface-brandPrimary-quaternary)',
            border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
            borderRadius: 'var(--dim-radius-400)',
            paddingTop: 'var(--dim-space-400)',
            paddingRight: 'var(--dim-space-500)',
            paddingBottom: 'var(--dim-space-400)',
            paddingLeft: 'var(--dim-space-500)',
          }}
        >
          <p style={{ color: 'var(--text-content-default)', fontSize: 'var(--type-size-sm)' }}>
            หน้านี้เป็นหน้าชั่วคราวสำหรับตัดสินใจ ไม่ใช่หน้าใช้งานจริง — ลบไฟล์
            <strong> src/pages/observation/ObservationCustomUiPreview.jsx </strong>
            และ route ของมันได้ทันทีเมื่อได้ข้อสรุป
          </p>
        </div>

        <div>
          <BrandPrimaryButton leadingIcon='arrow_back' variant='outline' onClick={() => { window.location.href = '/observation'; }}>
            กลับไปหน้าระบบสังเกตอาการ
          </BrandPrimaryButton>
        </div>
      </div>
    </div>
  );
}
