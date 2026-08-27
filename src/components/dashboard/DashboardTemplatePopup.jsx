import React, { useEffect, useMemo, useState } from 'react';
import Popup from '@/components/popup/Popup';
import AlertDialog from '@/components/popup/AlertDialog';
import PhcisTopToast from '@/components/alert/PhcisTopToast';
import InputField from '@/components/forms/InputField';
import Checkbox from '@/components/checkbox/Checkbox';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import NeutralSubdueIconButton from '@/components/button/NeutralSubdueIconButton';
import Icon from '@/components/icons/Icon';
import {
  DASHBOARD_WIDGET_CATALOG,
  DASHBOARD_WIDGET_GROUPS,
  listDashboardTemplates,
  getDashboardTemplate,
  getDefaultDashboardTemplateId,
  setDefaultDashboardTemplate,
  saveDashboardTemplate,
  deleteDashboardTemplate,
  widgetMeta,
} from '@/data/dashboardTemplates';

/* PHCIS | แดชบอร์ดภาพรวมโรงพยาบาล — ตัวสร้างเทมเพลท (TOR §1.20.11).
   Logic ชุดเดียวกับ Consent Dashboard Builder (ด.1.1.12): ตั้งชื่อ → เลือก
   widget + จัดลำดับ → บันทึก / ตั้งเป็นค่าเริ่มต้น / ลบ โดย template
   มาตรฐานล็อกไว้ (แก้ไม่ได้ ลบไม่ได้ ใช้เป็นต้นแบบได้).
   ต่างจาก consent ตรงที่นี่เป็น popup ไม่ใช่หน้าแยก — /dashboard ไม่มี
   page shell ที่มีปุ่มย้อนกลับให้ยืมใช้ */

const CARD_STYLE = {
  background: 'var(--surface-card-100)',
  borderRadius: 'var(--dim-radius-400)',
  border: 'var(--dim-stroke-100) solid var(--border-card-default)',
  paddingTop: 'var(--dim-space-400)',
  paddingRight: 'var(--dim-space-400)',
  paddingBottom: 'var(--dim-space-400)',
  paddingLeft: 'var(--dim-space-400)',
};

const TITLE_TEXT = {
  color: 'var(--text-brandPrimary-default)',
  fontFamily: 'var(--type-family-heading-graphic2)',
  fontSize: 'var(--type-size-base)',
  fontWeight: 'var(--type-weight-regular, 400)',
  lineHeight: 1.4,
  margin: 0,
};

const BODY_TEXT = {
  color: 'var(--text-content-secondary)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm)',
  lineHeight: 1.5,
};

const MUTED_XS = {
  color: 'var(--text-content-tertiary)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-xs)',
  lineHeight: 1.5,
};

const GROUP_LABEL = {
  ...MUTED_XS,
  color: 'var(--text-content-secondary)',
  fontWeight: 'var(--type-weight-medium)',
};

export default function DashboardTemplatePopup({
  open,
  onClose,
  currentTemplateId,
  onApply,
}) {
  const [templates, setTemplates] = useState(() => listDashboardTemplates());
  const [editingId, setEditingId] = useState(null);   /* template ที่กำลังแก้ (null = สร้างใหม่) */
  const [name, setName] = useState('');
  const [widgets, setWidgets] = useState([]);
  const [makeDefault, setMakeDefault] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [deleteFor, setDeleteFor] = useState(null);
  const [toast, setToast] = useState(null);

  const pushToast = (message) => setToast({ id: Date.now(), variant: 'success', message });
  const refresh = () => setTemplates(listDashboardTemplates());

  /* เปิด popup → ตั้งต้นจากเทมเพลทที่หน้าจอใช้อยู่ (สำเนา ถ้าตัวนั้นล็อก) */
  useEffect(() => {
    if (!open) return;
    const base = getDashboardTemplate(currentTemplateId) || getDashboardTemplate('std');
    setTemplates(listDashboardTemplates());
    setEditingId(base?.locked ? null : base?.id || null);
    setName(base ? (base.locked ? `${base.name} (สำเนา)` : base.name) : '');
    setWidgets(base ? [...base.widgets] : []);
    setMakeDefault(!base?.locked && getDefaultDashboardTemplateId() === base?.id);
    setDirty(false);
    setConfirmCancel(false);
    setDeleteFor(null);
  }, [open, currentTemplateId]);

  const selected = useMemo(() => new Set(widgets), [widgets]);

  const toggleWidget = (key, next) => {
    setWidgets((prev) => (next ? [...prev, key] : prev.filter((k) => k !== key)));
    setDirty(true);
  };

  /* จัดลำดับด้วยปุ่มเลื่อนขึ้น/ลง (ไม่ใช้ drag — pattern เดียวกับ consent builder) */
  const moveWidget = (idx, dir) => {
    setWidgets((prev) => {
      const to = idx + dir;
      if (to < 0 || to >= prev.length) return prev;
      const next = [...prev];
      const [m] = next.splice(idx, 1);
      next.splice(to, 0, m);
      return next;
    });
    setDirty(true);
  };

  const loadTemplate = (t) => {
    if (t.locked) {
      /* template มาตรฐานแก้ไม่ได้ — ใช้เป็นจุดตั้งต้น (สำเนา) */
      setEditingId(null);
      setName(`${t.name} (สำเนา)`);
      setMakeDefault(false);
    } else {
      setEditingId(t.id);
      setName(t.name);
      setMakeDefault(getDefaultDashboardTemplateId() === t.id);
    }
    setWidgets([...t.widgets]);
    setDirty(false);
  };

  const canSave = name.trim().length > 0 && widgets.length > 0;

  const save = () => {
    if (!canSave) return;
    const id = saveDashboardTemplate({
      id: editingId || undefined,
      name: name.trim(),
      widgets,
      updatedBy: 'ลดา ดีงาม',
    });
    if (makeDefault) setDefaultDashboardTemplate(id);
    refresh();
    setEditingId(id);
    setDirty(false);
    /* ป๊อปอัปสำเร็จเป็นของหน้าแดชบอร์ด (pattern เดียวกับ ConsentDashboardPage)
       ที่นี่จึงส่งผลลัพธ์ออกไปแล้วปิดตัวเอง ไม่ต้องขึ้น toast ซ้อน */
    onApply?.({ id, name: name.trim(), isEdit: Boolean(editingId), madeDefault: makeDefault });
    onClose?.();
  };

  const runDelete = () => {
    const t = deleteFor;
    setDeleteFor(null);
    if (!t) return;
    const wasDefault = getDefaultDashboardTemplateId() === t.id;
    deleteDashboardTemplate(t.id);
    refresh();
    if (editingId === t.id) { setEditingId(null); setName(''); setWidgets([]); setDirty(false); }
    onApply?.({ id: getDefaultDashboardTemplateId(), deleted: true });
    pushToast(wasDefault
      ? `ลบ "${t.name}" แล้ว — ค่าเริ่มต้นสลับกลับเป็นแดชบอร์ดมาตรฐาน`
      : `ลบเทมเพลท "${t.name}" แล้ว`);
  };

  const requestClose = () => (dirty ? setConfirmCancel(true) : onClose?.());
  const defaultId = getDefaultDashboardTemplateId();

  return (
    <>
      <Popup
        open={open}
        onClose={requestClose}
        size='extraLarge'
        title={editingId ? 'แก้ไขเทมเพลทแดชบอร์ด' : 'สร้างเทมเพลทแดชบอร์ด'}
        subtitle='เลือกการ์ดที่ต้องการให้แสดงบนหน้าแดชบอร์ดภาพรวม และจัดลำดับการแสดงผล'
        secondaryAction={{ label: 'ยกเลิก', onClick: requestClose }}
        primaryAction={{ label: 'บันทึกเทมเพลท', onClick: save, disabled: !canSave }}
      >
        <div className='flex flex-col w-full min-w-0' style={{ gap: 'var(--dim-space-400)' }}>
          {/* ── 1. ชื่อเทมเพลท ── */}
          <section className='flex flex-col w-full' style={{ ...CARD_STYLE, gap: 'var(--dim-space-300)' }}>
            <h3 style={TITLE_TEXT}>1. ตั้งชื่อเทมเพลท</h3>
            <InputField
              label='ชื่อเทมเพลท'
              required
              showLeadingIcon={false}
              showHelperText={false}
              placeholder='เช่น จอเฝ้าระวังโรคเรื้อรัง (NCD)'
              value={name}
              onChange={(v) => { setName(v); setDirty(true); }}
            />
            <span style={MUTED_XS}>
              {editingId
                ? 'กำลังแก้ไขเทมเพลทเดิม — บันทึกแล้วจะทับของเดิม'
                : 'จะบันทึกเป็นเทมเพลทใหม่ (เทมเพลทมาตรฐานของสำนักอนามัยแก้ไขไม่ได้)'}
            </span>
          </section>

          {/* ── 2. เลือกการ์ด + จัดลำดับ ── */}
          <section className='flex flex-col w-full' style={{ ...CARD_STYLE, gap: 'var(--dim-space-400)' }}>
            <div className='flex items-center flex-wrap w-full' style={{ gap: 'var(--dim-space-200)' }}>
              <h3 style={{ ...TITLE_TEXT, flex: '1 1 auto' }}>2. เลือกการ์ดที่จะแสดง</h3>
              <span style={MUTED_XS}>เลือกแล้ว {widgets.length} จาก {DASHBOARD_WIDGET_CATALOG.length} การ์ด</span>
            </div>

            <div className='grid grid-cols-1 lg:grid-cols-2' style={{ gap: 'var(--dim-space-400)' }}>
              {/* ซ้าย — คลังการ์ดแยกตามหมวด */}
              <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-300)' }}>
                {DASHBOARD_WIDGET_GROUPS.map((g) => (
                  <div key={g.key} className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-200)' }}>
                    <span style={GROUP_LABEL}>{g.label}</span>
                    {DASHBOARD_WIDGET_CATALOG.filter((w) => w.group === g.key).map((w) => (
                      <Checkbox
                        key={w.key}
                        checked={selected.has(w.key)}
                        onChange={(v) => toggleWidget(w.key, !!v)}
                        label={w.label}
                      />
                    ))}
                  </div>
                ))}
              </div>

              {/* ขวา — ลำดับการแสดงผลจริงบนหน้าแดชบอร์ด */}
              <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-200)' }}>
                <span style={GROUP_LABEL}>ลำดับการแสดงผล</span>
                {widgets.length === 0 ? (
                  <div
                    className='flex flex-col items-center justify-center'
                    style={{
                      gap: 'var(--dim-space-200)',
                      minHeight: 'var(--dim-size-2100, 160px)',
                      borderRadius: 'var(--dim-radius-300)',
                      border: 'var(--dim-stroke-100) dashed var(--border-card-default)',
                    }}
                  >
                    <Icon name='dashboard_customize' size={24} />
                    <span style={BODY_TEXT}>ยังไม่ได้เลือกการ์ด — ติ๊กจากรายการทางซ้าย</span>
                  </div>
                ) : (
                  widgets.map((key, idx) => {
                    const meta = widgetMeta(key);
                    return (
                      <div
                        key={key}
                        className='flex items-center w-full min-w-0'
                        style={{
                          gap: 'var(--dim-space-200)',
                          paddingTop: 'var(--dim-space-150)',
                          paddingRight: 'var(--dim-space-300)',
                          paddingBottom: 'var(--dim-space-150)',
                          paddingLeft: 'var(--dim-space-300)',
                          borderRadius: 'var(--dim-radius-300)',
                          border: 'var(--dim-stroke-100) solid var(--border-card-default)',
                          background: 'var(--surface-card-100)',
                        }}
                      >
                        <span style={{ ...MUTED_XS, minWidth: 'var(--dim-size-400, 20px)' }}>{idx + 1}</span>
                        <span className='flex-1 min-w-0 truncate' style={{ ...BODY_TEXT, color: 'var(--text-content-default)' }}>
                          {meta?.label || key}
                        </span>
                        <NeutralSubdueIconButton
                          icon='arrow_upward'
                          variant='outline'
                          size='sm'
                          aria-label='เลื่อนขึ้น'
                          disabled={idx === 0}
                          onClick={() => moveWidget(idx, -1)}
                        />
                        <NeutralSubdueIconButton
                          icon='arrow_downward'
                          variant='outline'
                          size='sm'
                          aria-label='เลื่อนลง'
                          disabled={idx === widgets.length - 1}
                          onClick={() => moveWidget(idx, 1)}
                        />
                        <NeutralSubdueIconButton
                          icon='close'
                          variant='outline'
                          size='sm'
                          aria-label='นำการ์ดออก'
                          onClick={() => toggleWidget(key, false)}
                        />
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <Checkbox
              checked={makeDefault}
              onChange={(v) => { setMakeDefault(!!v); setDirty(true); }}
              label='ตั้งเป็นแดชบอร์ดเริ่มต้นของเมนู "แดชบอร์ด"'
            />
          </section>

          {/* ── 3. เทมเพลตที่บันทึกไว้ ── */}
          <section className='flex flex-col w-full' style={{ ...CARD_STYLE, gap: 'var(--dim-space-300)' }}>
            <h3 style={TITLE_TEXT}>3. เทมเพลทที่บันทึกไว้</h3>
            <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200)' }}>
              {templates.map((t) => (
                <div
                  key={t.id}
                  className='flex items-center flex-wrap w-full'
                  style={{
                    gap: 'var(--dim-space-300)',
                    paddingTop: 'var(--dim-space-300)',
                    paddingRight: 'var(--dim-space-400)',
                    paddingBottom: 'var(--dim-space-300)',
                    paddingLeft: 'var(--dim-space-400)',
                    border: 'var(--dim-stroke-100) solid var(--border-card-default)',
                    borderRadius: 'var(--dim-radius-300)',
                    background: editingId === t.id ? 'var(--surface-brandPrimary-quaternary)' : 'var(--surface-card-100)',
                  }}
                >
                  <div className='flex flex-col min-w-0' style={{ flex: 1, gap: 'var(--dim-space-050)' }}>
                    <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-150)' }}>
                      <span style={{ ...BODY_TEXT, color: 'var(--text-content-default)', fontWeight: 'var(--type-weight-medium)' }}>{t.name}</span>
                      {t.locked && <ColorfulBadge style='grey' size='small' hierarchy='secondary' width='hug'>มาตรฐาน</ColorfulBadge>}
                      {defaultId === t.id && <ColorfulBadge style='green' size='small' hierarchy='secondary' width='hug'>ค่าเริ่มต้น</ColorfulBadge>}
                    </div>
                    <span style={MUTED_XS}>
                      {t.widgets.length} การ์ด · อัปเดต {t.updatedAt} โดย {t.updatedBy}
                    </span>
                  </div>
                  <div className='flex items-center shrink-0' style={{ gap: 'var(--dim-space-150)' }}>
                    <NeutralSubdueButton
                      size='sm'
                      disabled={defaultId === t.id}
                      onClick={() => { setDefaultDashboardTemplate(t.id); refresh(); pushToast(`ตั้ง "${t.name}" เป็นค่าเริ่มต้นแล้ว`); }}
                    >
                      ตั้งเป็นค่าเริ่มต้น
                    </NeutralSubdueButton>
                    <NeutralSubdueButton size='sm' leadingIcon='edit' onClick={() => loadTemplate(t)}>
                      {t.locked ? 'ใช้เป็นต้นแบบ' : 'แก้ไข'}
                    </NeutralSubdueButton>
                    <NeutralSubdueIconButton
                      icon='delete'
                      variant='outline'
                      size='sm'
                      aria-label='ลบเทมเพลท'
                      title={t.locked ? 'เทมเพลทมาตรฐานลบไม่ได้' : 'ลบเทมเพลท'}
                      disabled={t.locked}
                      onClick={() => setDeleteFor(t)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </Popup>

      {/* ปิดกลางทางขณะมีแก้ค้าง */}
      <AlertDialog
        open={confirmCancel}
        type='warning'
        title='ละทิ้งการแก้ไข?'
        description='การ์ดและการตั้งค่าที่ยังไม่บันทึกจะหายไป'
        confirmLabel='ละทิ้ง'
        cancelLabel='แก้ไขต่อ'
        onConfirm={() => { setConfirmCancel(false); onClose?.(); }}
        onCancel={() => setConfirmCancel(false)}
        onClose={() => setConfirmCancel(false)}
      />

      {/* ลบเทมเพลท (+ edge: ลบตัวที่เป็นค่าเริ่มต้น → สลับกลับมาตรฐาน) */}
      <AlertDialog
        open={!!deleteFor}
        type='destructive'
        title='ลบเทมเพลท?'
        description={deleteFor
          ? `ต้องการลบ "${deleteFor.name}" หรือไม่${defaultId === deleteFor.id ? ' — เทมเพลทนี้เป็นค่าเริ่มต้น ระบบจะสลับกลับไปใช้แดชบอร์ดมาตรฐาน' : ''}`
          : ''}
        confirmLabel='ลบ'
        cancelLabel='ยกเลิก'
        onConfirm={runDelete}
        onCancel={() => setDeleteFor(null)}
        onClose={() => setDeleteFor(null)}
      />

      <PhcisTopToast session={toast} onDismiss={() => setToast(null)} />
    </>
  );
}
