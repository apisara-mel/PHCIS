import React from 'react';
import { useHistory } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import Footer from '@/components/layout/Footer';
import SuccessScreen from '@/components/layout/SuccessScreen';
import WizardMorphHeader, { WIZARD_MORPH_SHELL_PROPS } from '@/components/layout/WizardMorphHeader';
import DeleteCenterContactConfirmPopup from '@/components/popup/DeleteCenterContactConfirmPopup';
import SYSTEM_NAV from '@/pages/system/systemNav';
import {
  useCenterForm,
  CenterFormBody,
  ExistingCodesPopup,
  CENTER_FORM_STEPS,
} from '@/pages/system/centerForm';

/* ระบบจัดการระบบ · เพิ่มศูนย์บริการ (Figma 4D3nTx53 · 1:3273 "Create Branch").
   6 step: ข้อมูลศูนย์ → ที่ตั้ง → ข้อมูลการติดต่อ → เวลาทำการ → แผนกและคลินิก → รีวิว

   หน้านี้เป็นแค่ "เปลือกหน้าเต็ม" — state และเนื้อฟอร์มอยู่ที่ centerForm.jsx
   ซึ่งใช้ร่วมกับ CenterEditPopup (โหมดแก้ไขในตารางทะเบียน) จะได้ไม่มีฟอร์ม
   สองก๊อปปี้ที่ค่อย ๆ เพี้ยนจากกัน */

const breadcrumb = ['จัดการระบบ', 'ศูนย์บริการ', 'เพิ่มศูนย์บริการ'];

export default function AddCenterPage() {
  const navigate = useHistory();
  const form = useCenterForm();
  const { step, idx, setStep, footerPrimary, submitted, info } = form;

  if (submitted) {
    return (
      <SuccessScreen
        title={`คุณเพิ่มศูนย์บริการ ${info.name || 'ใหม่'} สำเร็จ`}
        buttonLabel='ศูนย์บริการ'
        onDone={() => navigate.push('/admin/centers')}
      />
    );
  }

  return (
    <QueuePageShell
      activeKey='system-centers'
      sidebarItems={SYSTEM_NAV}
      sidebarFallbackKey='system-centers'
      brandTitle='ระบบ PHCIS'
      breadcrumb={breadcrumb}
      {...WIZARD_MORPH_SHELL_PROPS}
      headerInfo={(
        <WizardMorphHeader
          title='เพิ่มศูนย์บริการ'
          steps={CENTER_FORM_STEPS.map((s) => s.label)}
          current={idx}
          onStepClick={(i) => { if (i < idx) setStep(CENTER_FORM_STEPS[i].key); }}
        />
      )}
    >
      <div className='flex flex-col flex-1 min-w-0' style={{ gap: 'var(--dim-space-600, 24px)' }}>
        <div className='flex flex-col flex-1 min-w-0' style={{ padding: 'var(--dim-space-600)', gap: 'var(--dim-space-400)' }}>
          {/* Content card — stepper lives in WizardMorphHeader (sticky morph band). */}
          <section
            className='flex flex-col w-full overflow-hidden'
            style={{
              background: 'var(--surface-card-100)',
              borderRadius: 'var(--dim-radius-500)',
              border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            <div className='flex flex-col' style={{ padding: 'var(--dim-space-600)' }}>
              <CenterFormBody form={form} />
            </div>
          </section>
        </div>

        <Footer
          type='with BTN'
          sticky
          showLegal={false}
          showButton3
          button3Label={idx === 0 ? 'ยกเลิก' : 'ย้อนกลับ'}
          button3Icon={idx === 0 ? undefined : 'arrow_back'}
          onButton3Click={idx === 0 ? form.cancel : form.goPrev}
          showButton2
          button2Label='บันทึกร่าง'
          button2Icon='save'
          onButton2Click={form.handleSaveDraft}
          showButton1
          button1Label={footerPrimary.label}
          button1TrailingIcon={footerPrimary.icon}
          button1Disabled={footerPrimary.disabled}
          onButton1Click={footerPrimary.onClick}
        />
      </div>

      <DeleteCenterContactConfirmPopup
        open={form.contactDelete !== null}
        kind={form.contactDelete?.kind ?? 'phone'}
        onClose={() => form.setContactDelete(null)}
        onConfirm={form.confirmContactDelete}
      />
      <ExistingCodesPopup
        open={form.showCodeList}
        mode={form.codeListMode}
        centers={form.existingCenters}
        onClose={() => form.setShowCodeList(false)}
      />
    </QueuePageShell>
  );
}
