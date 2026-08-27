import React, { useMemo, useState } from 'react';
import QueuePageShell from '@/templates/QueuePageShell';
import Table from '@/components/table/Table';
import BrandButton from '@/components/button/BrandButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import NeutralSubdueIconButton from '@/components/button/NeutralSubdueIconButton';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import AlertDialog from '@/components/popup/AlertDialog';
import SuccessPopup from '@/components/popup/SuccessPopup';
import DashboardTemplatePopup from '@/components/dashboard/DashboardTemplatePopup';
import SYSTEM_NAV from '@/pages/system/systemNav';
import {
  listDashboardTemplates,
  getDefaultDashboardTemplateId,
  setDefaultDashboardTemplate,
  deleteDashboardTemplate,
  widgetLabel,
} from '@/data/dashboardTemplates';

/* PHCIS | จัดการระบบ — ทะเบียนเทมเพลตแดชบอร์ด

   ตัวสร้างเทมเพลตย้ายมาจากหน้าแดชบอร์ดมาเป็นงานของผู้ดูแลระบบ (มติผู้ใช้
   27 ส.ค. 69) — หน้าแดชบอร์ดเหลือหน้าที่ "เลือกใช้" อย่างเดียว ส่วนการสร้าง
   แก้ไข ลบ และตั้งค่าเริ่มต้นทำที่นี่ที่เดียว ใช้ป๊อปอัปตัวเดิม
   (`DashboardTemplatePopup`) จึงไม่มีตัวสร้างสองชุดให้ drift */

const breadcrumb = ['จัดการระบบ', 'เทมเพลตแดชบอร์ด'];

export default function SystemDashboardTemplatesPage() {
  const [templates, setTemplates] = useState(() => listDashboardTemplates());
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deleteFor, setDeleteFor] = useState(null);
  const [saved, setSaved] = useState(null);

  const defaultId = getDefaultDashboardTemplateId();
  const refresh = () => setTemplates(listDashboardTemplates());

  const openBuilder = (id) => { setEditingId(id || null); setBuilderOpen(true); };

  const runDelete = () => {
    const target = deleteFor;
    setDeleteFor(null);
    if (!target) return;
    deleteDashboardTemplate(target.id);
    refresh();
  };

  const columns = useMemo(() => ([
    {
      key: 'name',
      label: 'ชื่อเทมเพลต',
      flex: true,
      minWidth: 280,
      render: (t) => (
        <span className='inline-flex items-center flex-wrap' style={{ gap: 'var(--dim-space-150)' }}>
          <span>{t.name}</span>
          {t.locked && <ColorfulBadge style='grey' size='small' hierarchy='secondary' width='hug'>มาตรฐาน</ColorfulBadge>}
          {defaultId === t.id && <ColorfulBadge style='green' size='small' hierarchy='secondary' width='hug'>ค่าเริ่มต้น</ColorfulBadge>}
        </span>
      ),
      csv: (t) => t.name,
    },
    {
      key: 'widgets',
      label: 'การ์ดที่แสดง',
      flex: true,
      minWidth: 320,
      render: (t) => t.widgets.slice(0, 3).map(widgetLabel).join(' · ')
        + (t.widgets.length > 3 ? ` · +${t.widgets.length - 3}` : ''),
      csv: (t) => t.widgets.map(widgetLabel).join(' | '),
    },
    { key: 'count', label: 'จำนวน', align: 'center', render: (t) => `${t.widgets.length} การ์ด`, csv: (t) => t.widgets.length },
    { key: 'updatedAt', label: 'ปรับปรุงล่าสุด', render: (t) => `${t.updatedAt} · ${t.updatedBy}`, csv: (t) => t.updatedAt },
    {
      key: 'action',
      label: 'จัดการ',
      align: 'right',
      minWidth: 260,
      render: (t) => (
        <span className='inline-flex items-center justify-end' style={{ gap: 'var(--dim-space-150)' }}>
          <NeutralSubdueButton
            size='sm'
            disabled={defaultId === t.id}
            onClick={() => { setDefaultDashboardTemplate(t.id); refresh(); }}
          >
            ตั้งเป็นค่าเริ่มต้น
          </NeutralSubdueButton>
          <NeutralSubdueButton size='sm' leadingIcon='edit' onClick={() => openBuilder(t.id)}>
            {t.locked ? 'ใช้เป็นต้นแบบ' : 'แก้ไข'}
          </NeutralSubdueButton>
          <NeutralSubdueIconButton
            icon='delete'
            variant='outline'
            size='sm'
            aria-label='ลบเทมเพลต'
            title={t.locked ? 'เทมเพลตมาตรฐานลบไม่ได้' : 'ลบเทมเพลต'}
            disabled={t.locked}
            onClick={() => setDeleteFor(t)}
          />
        </span>
      ),
    },
  ]), [defaultId]);

  return (
    <QueuePageShell
      activeKey='system-dashboard-templates'
      sidebarItems={SYSTEM_NAV}
      sidebarFallbackKey='system-overview'
      brandTitle='จัดการระบบ'
      breadcrumb={breadcrumb}
      title='เทมเพลตแดชบอร์ด'
      actions={(
        <BrandButton size='md' leadingIcon='add' onClick={() => openBuilder(null)}>
          สร้างเทมเพลทใหม่
        </BrandButton>
      )}
    >
      <div
        className='flex flex-col flex-1 min-w-0'
        style={{
          paddingTop: 'var(--dim-space-600)',
          paddingRight: 'var(--dim-space-600)',
          paddingBottom: 'var(--dim-space-600)',
          paddingLeft: 'var(--dim-space-600)',
          gap: 'var(--dim-space-400)',
        }}
      >
        <Table
          columns={columns}
          rows={templates}
          rowKey={(t) => t.id}
          emptyMessage='ยังไม่มีเทมเพลตแดชบอร์ด'
          emptySubtext='กด “สร้างเทมเพลทใหม่” เพื่อเลือกการ์ดและลำดับที่จะแสดงบนหน้าแดชบอร์ด'
          pagination={false}
        />
      </div>

      <DashboardTemplatePopup
        open={builderOpen}
        onClose={() => setBuilderOpen(false)}
        currentTemplateId={editingId || 'std'}
        onApply={(result) => {
          refresh();
          if (result?.name) setSaved(result);
        }}
      />

      <AlertDialog
        open={!!deleteFor}
        type='destructive'
        title='ลบเทมเพลต?'
        description={deleteFor
          ? `ต้องการลบ "${deleteFor.name}" หรือไม่${defaultId === deleteFor.id ? ' — เทมเพลตนี้เป็นค่าเริ่มต้น ระบบจะสลับกลับไปใช้แดชบอร์ดมาตรฐาน' : ''}`
          : ''}
        confirmLabel='ลบ'
        cancelLabel='ยกเลิก'
        onConfirm={runDelete}
        onCancel={() => setDeleteFor(null)}
        onClose={() => setDeleteFor(null)}
      />

      <SuccessPopup
        open={Boolean(saved)}
        onClose={() => setSaved(null)}
        buttonLabel='เรียบร้อย'
        title={saved?.isEdit
          ? `บันทึกการแก้ไข “${saved?.name}” สำเร็จ`
          : `สร้างเทมเพลต “${saved?.name}” สำเร็จ`}
        description='เลือกใช้ได้จากช่อง Template บนหัวหน้าแดชบอร์ด'
      />
    </QueuePageShell>
  );
}
