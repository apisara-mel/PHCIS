import React, { useEffect, useMemo, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import Footer from '@/components/layout/Footer';
import SuccessScreen from '@/components/layout/SuccessScreen';
import SYSTEM_NAV from '@/pages/system/systemNav';
import { useStructureForm, StructureFormBody } from '@/pages/system/structureForm';
import { findStructure } from '@/data/centerStructure';

/* ระบบจัดการระบบ · สร้าง/แก้ไขรูปแบบโครงสร้างศูนย์
   ตัวแก้ไขเป็นตัวเดียวกับที่หน้าเพิ่มศูนย์บริการใช้ (CenterStructureEditor)
   หน้านี้ห่อด้วยชื่อรูปแบบ + ปุ่มบันทึกเท่านั้น. */

const breadcrumb = ['จัดการระบบ', 'รูปแบบโครงสร้างศูนย์'];

const CARD = {
  background: 'var(--surface-card-100)',
  borderRadius: 'var(--dim-radius-500)',
  border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
  boxShadow: 'var(--shadow-card)',
  padding: 'var(--dim-space-600)',
};

export default function CenterStructureCreatePage() {
  const navigate = useHistory();
  const { id } = useParams();
  const existing = useMemo(() => (id ? findStructure(id) : null), [id]);

  /* state · validation · persist อยู่ที่ structureForm ตัวเดียวกับ popup */
  const form = useStructureForm({ existing });
  const { isEdit, valid, saved, handleSaveDraft, handleSubmit } = form;

  const backToList = () => navigate.push('/admin/structures');

  const onSaveDraft = () => { if (handleSaveDraft()) backToList(); };
  const onSubmit = () => { if (handleSubmit() && isEdit) backToList(); };

  if (id && !existing) {
    return (
      <QueuePageShell
        activeKey='system-org'
        sidebarItems={SYSTEM_NAV}
        sidebarFallbackKey='system-org'
        brandTitle='จัดการระบบ'
        breadcrumb={breadcrumb}
        title='รูปแบบโครงสร้างศูนย์'
        onBack={backToList}
      >
        <div style={{ padding: 'var(--dim-space-600)' }}>ไม่พบรูปแบบโครงสร้างนี้</div>
      </QueuePageShell>
    );
  }

  if (saved) {
    return (
      <SuccessScreen
        title={<>คุณสร้างรูปแบบโครงสร้างศูนย์<br />สำเร็จ</>}
        buttonLabel='เข้าสู่หน้ารูปแบบโครงสร้างศูนย์'
        onDone={backToList}
      />
    );
  }

  return (
    <QueuePageShell
      activeKey='system-org'
      sidebarItems={SYSTEM_NAV}
      sidebarFallbackKey='system-org'
      brandTitle='จัดการระบบ'
      breadcrumb={breadcrumb}
      title={isEdit ? 'แก้ไขรูปแบบโครงสร้างศูนย์' : 'สร้างรูปแบบโครงสร้างศูนย์'}
      onBack={() => navigate.push('/admin/structures')}
    >
      <div
        className='flex flex-col flex-1 min-w-0'
        style={{ padding: 'var(--dim-space-600)', gap: 'var(--dim-space-400)', paddingBottom: 'var(--dim-space-900)' }}
      >
        <StructureFormBody form={form} />
      </div>

      <Footer
        type='with BTN'
        sticky
        showLegal={false}
        showButton3
        button3Label='ยกเลิก'
        onButton3Click={backToList}
        showButton2
        button2Label='บันทึกร่าง'
        button2Icon='save'
        onButton2Click={onSaveDraft}
        showButton1
        button1Label={isEdit ? 'บันทึกรูปแบบ' : 'สร้างรูปแบบนี้'}
        button1TrailingIcon='check'
        button1Disabled={!valid}
        onButton1Click={onSubmit}
      />
    </QueuePageShell>
  );
}
