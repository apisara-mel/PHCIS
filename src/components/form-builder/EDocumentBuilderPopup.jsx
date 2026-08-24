import React, { useMemo, useState } from 'react';
import Popup from '@/components/popup/Popup';
import Icon from '@/components/icons/Icon';
import Alert from '@/components/alert/Alert';
import StatusBadge from '@/components/badge/StatusBadge';
import TextField from '@/components/forms/TextField';
import FormBuilderPalette from '@/components/form-builder/FormBuilderPalette';
import FormBuilderCanvas from '@/components/form-builder/FormBuilderCanvas';
import FormBuilderPatientPreview from '@/components/form-builder/FormBuilderPatientPreview';
import { FormBuilderProvider } from '@/components/form-builder/FormBuilderContext';
import useFormBuilder from '@/hooks/useFormBuilder';
import { FORMS, getCategory } from '@/data/formsLibrary';
import { blocksFromLibraryForm, rekeyBlocks } from '@/utils/formBuilderModel';

/* สร้าง e-Document ในระเบียนผู้รับบริการ — TOR §1.10.8.4
   ────────────────────────────────────────────────────────────────────────
   §1.10.8.4 asks for more than a file attachment: the visit must be able to
   PRODUCE a document, built with the form-builder, not only receive one.

   Two entry points, because both happen in the room:
     • เริ่มจากแบบฟอร์มในคลัง — the normal case. A ทางการ template (ใบยินยอม
       คุมกำเนิด, แบบประเมิน) is pulled in, then trimmed/extended for THIS
       client. Templates arrive as the flat catalog preview shape, so
       blocksFromLibraryForm maps them into editable builder blocks.
     • เริ่มจากเอกสารเปล่า — for the one-off letter the คลัง has no template
       for yet.

   Editing a saved e-Document re-opens the same builder on its own blocks
   (re-keyed, so two documents open in one session cannot collide on ids).  */

const TEMPLATE_CARD = (selected) => ({
  borderRadius: 'var(--dim-radius-200, 8px)',
  border: `${selected ? 'var(--dim-stroke-200, 2px)' : 'var(--dim-stroke-100, 1px)'} solid ${
    selected ? 'var(--border-brandPrimary-primary, #007549)' : 'var(--border-card-default, #EDEFF1)'
  }`,
  background: selected
    ? 'var(--surface-brandPrimary-quaternary, #E2F3EB)'
    : 'var(--surface-card-default, #FFFFFF)',
  paddingTop: 'var(--dim-space-250)',
  paddingRight: 'var(--dim-space-300)',
  paddingBottom: 'var(--dim-space-250)',
  paddingLeft: 'var(--dim-space-300)',
  textAlign: 'left',
  width: '100%',
});

/* ── step 1 · pick a starting point ─────────────────────────────────── */
const TemplatePicker = ({ query, setQuery, choice, setChoice }) => {
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return FORMS;
    return FORMS.filter((f) => `${f.name} ${f.code} ${f.summary}`.toLowerCase().includes(q));
  }, [query]);

  return (
    <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
      <Alert
        type='info'
        iconName='description'
        title='เลือกจุดเริ่มต้นของเอกสาร'
        subtext='เลือกแบบฟอร์มจากคลังเอกสาร e-document แล้วปรับให้ตรงกับผู้รับบริการรายนี้ได้ · หรือเริ่มจากเอกสารเปล่า'
        showBadge={false}
        showIndicator={false}
        showDetail={false}
      />

      <button
        type='button'
        onClick={() => setChoice({ kind: 'blank' })}
        style={TEMPLATE_CARD(choice?.kind === 'blank')}
        aria-pressed={choice?.kind === 'blank'}
      >
        <span
          className='flex items-center'
          style={{
            gap: 'var(--dim-space-150)',
            fontSize: 'var(--type-size-sm)',
            fontWeight: 'var(--type-weight-bold)',
            color: 'var(--text-content-primary, #21272A)',
          }}
        >
          <Icon name='add_circle' size={18} />
          เริ่มจากเอกสารเปล่า
        </span>
        <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #697077)' }}>
          ได้เอกสารว่างพร้อมส่วนประกอบตั้งต้น แล้วลากบล็อกที่ต้องการเข้ามาเอง
        </span>
      </button>

      <TextField
        label='ค้นหาแบบฟอร์มในคลัง'
        value={query}
        onChange={(e) => setQuery(e?.target ? e.target.value : e)}
        placeholder='เช่น ยินยอม / ประเมิน / F-1001'
      />

      <div
        className='flex flex-col w-full'
        style={{ gap: 'var(--dim-space-200)', maxHeight: 320, overflowY: 'auto' }}
      >
        {matches.length === 0 ? (
          <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-tertiary, #697077)' }}>
            ไม่พบแบบฟอร์มที่ตรงกับคำค้น
          </span>
        ) : matches.map((f) => {
          const selected = choice?.kind === 'template' && choice.slug === f.slug;
          const cat = getCategory(f.category);
          return (
            <button
              key={f.slug}
              type='button'
              onClick={() => setChoice({ kind: 'template', slug: f.slug })}
              style={TEMPLATE_CARD(selected)}
              aria-pressed={selected}
            >
              <span className='flex flex-wrap items-center' style={{ gap: 'var(--dim-space-150)' }}>
                <span
                  style={{
                    fontSize: 'var(--type-size-sm)',
                    fontWeight: 'var(--type-weight-bold)',
                    color: 'var(--text-content-primary, #21272A)',
                  }}
                >
                  {f.name}
                </span>
                <StatusBadge style='neutral' size='small'>{f.code}</StatusBadge>
                {cat && <StatusBadge style='info' size='small'>{cat.label}</StatusBadge>}
              </span>
              <span
                className='block'
                style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #697077)' }}
              >
                {f.summary} · {f.version} · {(f.sections ?? []).length} ส่วน
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

/* ── step 2 · the builder itself ────────────────────────────────────── */
const BuilderStage = ({ seed, seedName, onReady }) => {
  const builder = useFormBuilder({
    blocks: seed,
    name: seedName,
    /* embedded in a clinical record — never touch the คลังเอกสาร draft key */
    storageKey: null,
  });

  /* hand the live builder up so the popup's ปุ่มบันทึก can read it without
     lifting the whole builder state out of here */
  onReady(builder);

  return (
    <FormBuilderProvider value={builder}>
      <div className='w-full overflow-x-auto'>
        <div
          className='flex items-start'
          style={{
            gap: 'var(--dim-space-500)',
            width: 'max-content',
            minWidth: '100%',
            boxSizing: 'border-box',
          }}
        >
          <FormBuilderPalette />
          <FormBuilderCanvas />
          <FormBuilderPatientPreview />
        </div>
      </div>
    </FormBuilderProvider>
  );
};

const EDocumentBuilderPopup = ({
  open,
  onClose,
  onSave,               /* ({ name, blocks, templateSlug }) => void */
  editing = null,       /* saved e-Document being re-opened, or null */
  patientName,
}) => {
  const isEdit = Boolean(editing);
  const [stage, setStage] = useState(isEdit ? 'build' : 'pick');
  const [query, setQuery] = useState('');
  const [choice, setChoice] = useState(null);
  const builderRef = React.useRef(null);

  /* Seed is computed ONCE per builder mount — `stageKey` remounts
     BuilderStage when the starting point changes, which is what makes the
     seeded useState inside useFormBuilder pick up the new blocks. */
  const seed = useMemo(() => {
    if (isEdit) return rekeyBlocks(editing.blocks ?? []);
    if (choice?.kind === 'template') {
      const tpl = FORMS.find((f) => f.slug === choice.slug);
      const mapped = tpl ? blocksFromLibraryForm(tpl) : [];
      /* a template with no mappable field falls back to the starter set
         rather than opening an empty canvas with no explanation */
      return mapped.length ? mapped : undefined;
    }
    return undefined;
  }, [isEdit, editing, choice]);

  const seedName = useMemo(() => {
    if (isEdit) return editing.name;
    if (choice?.kind === 'template') return FORMS.find((f) => f.slug === choice.slug)?.name ?? '';
    return '';
  }, [isEdit, editing, choice]);

  const stageKey = isEdit ? `edit-${editing.id}` : (choice?.kind === 'template' ? choice.slug : 'blank');

  const reset = () => {
    setStage(isEdit ? 'build' : 'pick');
    setQuery('');
    setChoice(null);
    builderRef.current = null;
  };

  const close = () => { reset(); onClose(); };

  const save = () => {
    const b = builderRef.current;
    if (!b) return;
    onSave({
      name: (b.formName || '').trim() || 'e-Document ไม่มีชื่อ',
      blocks: b.blocks,
      templateSlug: choice?.kind === 'template' ? choice.slug : (editing?.templateSlug ?? null),
    });
    reset();
    onClose();
  };

  const primaryAction = stage === 'pick'
    ? { label: 'ถัดไป: สร้างเอกสาร', onClick: () => setStage('build'), disabled: !choice }
    : { label: isEdit ? 'บันทึกการแก้ไข' : 'บันทึก e-Document', onClick: save };

  const secondaryAction = stage === 'pick'
    ? { label: 'ยกเลิก', onClick: close }
    : (isEdit
      ? { label: 'ยกเลิก', onClick: close }
      : { label: 'ย้อนกลับ', onClick: () => setStage('pick') });

  return (
    <Popup
      open={open}
      onClose={close}
      title={isEdit ? `แก้ไข e-Document · ${editing.name}` : 'สร้าง e-Document'}
      subtitle={patientName
        ? `สร้างเอกสารสำหรับ ${patientName} ด้วยตัวสร้างแบบฟอร์ม — บันทึกแล้วเก็บไว้ในระเบียนการมารับบริการครั้งนี้`
        : 'สร้างเอกสารด้วยตัวสร้างแบบฟอร์ม แล้วเก็บไว้ในระเบียนการมารับบริการครั้งนี้'}
      size='extraLarge'
      bodyScrollable
      primaryAction={primaryAction}
      secondaryAction={secondaryAction}
    >
      {stage === 'pick' ? (
        <TemplatePicker query={query} setQuery={setQuery} choice={choice} setChoice={setChoice} />
      ) : (
        <BuilderStage
          key={stageKey}
          seed={seed}
          seedName={seedName}
          onReady={(b) => { builderRef.current = b; }}
        />
      )}
    </Popup>
  );
};

export default EDocumentBuilderPopup;
