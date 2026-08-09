import React, { useEffect, useMemo, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import Footer from '@/components/layout/Footer';
import SuccessScreen from '@/components/layout/SuccessScreen';
import InputField from '@/components/forms/InputField';
import Topic from '@/components/topic/Topic';
import SYSTEM_NAV from '@/pages/system/systemNav';
import CenterStructureEditor from '@/pages/system/CenterStructureEditor';
import { readCenters } from '@/data/centerStore';
import {
  createStructureTemplate,
  defaultStructure,
  findStructure,
  upsertStructure,
  summarizeStructure,
} from '@/data/centerStructure';

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
  const isEdit = !!existing;

  const [name, setName] = useState('');
  const [units, setUnits] = useState(defaultStructure);
  const [appliedCenters, setAppliedCenters] = useState([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!existing) return;
    setName(existing.name || '');
    setUnits(existing.units?.length ? existing.units : defaultStructure());
    setAppliedCenters(existing.appliedCenters || []);
  }, [existing]);

  const centerOptions = useMemo(
    () => readCenters()
      .filter((c) => !c.draft)
      .map((c) => ({
        value: c.hcode9 || c.code,
        label: `${c.name || 'ศูนย์บริการ'}${c.hcode9 ? ` (${c.hcode9})` : ''}`,
      })),
    [],
  );

  /* ต้องมีชื่อรูปแบบ และทุกแผนก/คลินิกต้องมีชื่อ ไม่งั้นรายการจะอ่านไม่ออก */
  const valid = name.trim() && units.length > 0 && units.every((u) => u.name.trim());

  const save = (draft) => {
    const base = existing || createStructureTemplate({});
    upsertStructure({
      ...base,
      name: name.trim() || 'รูปแบบโครงสร้างศูนย์',
      units,
      appliedCenters,
      draft,
    });
  };

  const handleSaveDraft = () => {
    if (!name.trim()) {
      window.alert('กรุณาตั้งชื่อรูปแบบก่อนบันทึกร่าง');
      return;
    }
    save(true);
    navigate.push('/admin/structures');
  };

  const handleSubmit = () => {
    if (!valid) return;
    save(false);
    if (isEdit) {
      navigate.push('/admin/structures');
      return;
    }
    setSaved(true);
  };

  if (id && !existing) {
    return (
      <QueuePageShell
        activeKey='system-structures'
        sidebarItems={SYSTEM_NAV}
        sidebarFallbackKey='system-structures'
        brandTitle='จัดการระบบ'
        breadcrumb={breadcrumb}
        title='รูปแบบโครงสร้างศูนย์'
        onBack={() => navigate.push('/admin/structures')}
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
        onDone={() => navigate.push('/admin/structures')}
      />
    );
  }

  return (
    <QueuePageShell
      activeKey='system-structures'
      sidebarItems={SYSTEM_NAV}
      sidebarFallbackKey='system-structures'
      brandTitle='จัดการระบบ'
      breadcrumb={breadcrumb}
      title={isEdit ? 'แก้ไขรูปแบบโครงสร้างศูนย์' : 'สร้างรูปแบบโครงสร้างศูนย์'}
      onBack={() => navigate.push('/admin/structures')}
    >
      <div
        className='flex flex-col flex-1 min-w-0'
        style={{ padding: 'var(--dim-space-600)', gap: 'var(--dim-space-400)', paddingBottom: 'var(--dim-space-900)' }}
      >
        <section className='flex flex-col w-full' style={{ ...CARD, gap: 'var(--dim-space-400)' }}>
          <Topic
            hierarchy='primary'
            title='ชื่อรูปแบบ'
            subText='ตั้งชื่อให้จำง่าย เช่น "ศูนย์ขนาดกลาง — OPD + ทันตกรรม"'
            leadingIcon='account_tree'
            showBadge={false}
            showChevron={false}
            showSuccess={false}
          />
          <div className='flex flex-wrap items-end w-full' style={{ gap: 'var(--dim-space-400)' }}>
            <div style={{ flex: '2 1 320px', minWidth: 260 }}>
              <InputField
                label='ชื่อรูปแบบ'
                required
                value={name}
                onChange={setName}
                placeholder='เช่น ศูนย์ขนาดกลาง — OPD + ทันตกรรม'
                helperText='ชื่อนี้จะให้เลือกตอนเพิ่มศูนย์บริการ (step แผนกและคลินิก)'
              />
            </div>
            <div
              className='flex flex-col'
              style={{
                flex: '1 1 220px',
                minWidth: 200,
                gap: 'var(--dim-space-100)',
                paddingTop: 'var(--dim-space-300)',
                paddingRight: 'var(--dim-space-400)',
                paddingBottom: 'var(--dim-space-300)',
                paddingLeft: 'var(--dim-space-400)',
                background: 'var(--surface-brandPrimary-quaternary)',
                border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
                borderRadius: 'var(--dim-radius-300)',
              }}
            >
              <span style={{ color: 'var(--text-content-tertiary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)' }}>
                สรุปโครงสร้าง
              </span>
              <span style={{ color: 'var(--text-brandPrimary-default)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)' }}>
                {summarizeStructure(units)}
              </span>
            </div>
          </div>
        </section>

        <CenterStructureEditor
          units={units}
          onUnitsChange={setUnits}
          appliedCenters={appliedCenters}
          onAppliedCentersChange={setAppliedCenters}
          centerOptions={centerOptions}
        />
      </div>

      <Footer
        type='with BTN'
        sticky
        showLegal={false}
        showButton3
        button3Label='ยกเลิก'
        onButton3Click={() => navigate.push('/admin/structures')}
        showButton2
        button2Label='บันทึกร่าง'
        button2Icon='save'
        onButton2Click={handleSaveDraft}
        showButton1
        button1Label={isEdit ? 'บันทึกรูปแบบ' : 'สร้างรูปแบบนี้'}
        button1TrailingIcon='check'
        button1Disabled={!valid}
        onButton1Click={handleSubmit}
      />
    </QueuePageShell>
  );
}
