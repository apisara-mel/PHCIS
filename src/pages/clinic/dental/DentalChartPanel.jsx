import React, { useEffect, useMemo, useRef, useState } from 'react';
import Popup from '@/components/popup/Popup';
import DrawingCanvasPopup from '@/components/popup/DrawingCanvasPopup';
import TabCapsule from '@/components/tab/TabCapsule';
import SelectableTag from '@/components/forms/SelectableTag';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import BrandIconButton from '@/components/button/BrandIconButton';
import Icon from '@/components/icons/Icon';
import {
  TEETH_BY_DENTITION,
  DENTITION_OPTIONS,
  DENTAL_SURFACES,
  SURFACE_KEYS,
  DENTAL_MATERIALS,
  dentalMaterialLabelOf,
  toothTypeOf,
} from '@/data/dentalCatalog';
import { DENTAL_TOOTH_NOTE_SUGGESTIONS } from '@/data/dentalVisits';

/* MIH DentalChartPanel — บันทึกตำแหน่งฟัน (TOR 1.10.1.2), NEW component.

   Interactive FDI odontogram: permanent/primary dentition toggle, every
   tooth clickable, live selected-teeth counter, and a per-tooth 5-surface
   picker (M / D / O-I / B-La / Li-P, multi-select + เลือกทุกด้าน) with a
   material dropdown per marking. NOT covered by BodyDiagramPanel/BodyMark
   — that component is a freehand drawing canvas over body images with no
   per-tooth / per-surface hit targets — so this panel is genuinely new
   (reported via the integrator manifest, per playbook §2.8). What IS
   reused: BodyDiagramPanel's card + TabCapsule-row + 320px-sidebar chrome
   (aliased below) and DrawingCanvasPopup for the freehand-annotation mode.

   Tooth glyphs are token-styled SVG shapes authored here (the classic
   odontogram square: 4 trapezoids M/D/B/L around an occlusal center) —
   not copied from any icon set; Material Symbols / Lucide have no
   per-surface odontogram glyph. */

/* ── Chrome-free input treatment (AISearch pattern, CLAUDE.md §3) ──────
   The surface-picker popup's material search field sits inside a wrapper
   that owns the border, so the native input must be stripped of every
   browser default with !important — inline style alone leaks vertical
   edge lines on Webkit. Idempotent module-load injection (HMR-safe). */
const STYLE_ID = 'mih-dental-chart-styles';
const injectDentalChartStyles = () => {
  if (typeof document === 'undefined') return;
  const prev = document.getElementById(STYLE_ID);
  if (prev) prev.remove();
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = `
.mih-dental-material-input,
.mih-dental-material-input:focus,
.mih-dental-material-input:focus-visible {
  caret-color: transparent;
  border: 0 !important;
  outline: none !important;
  box-shadow: none !important;
  background: transparent !important;
  -webkit-appearance: none !important;
  appearance: none !important;
}
.mih-dental-material-input::placeholder {
  color: var(--text-content-quaternary, #ADB2B7);
  opacity: 1;
}
`;
  document.head.appendChild(el);
};
injectDentalChartStyles();

/* ── Tooth glyph ──────────────────────────────────────────────────────
   36×36 odontogram square. Region → polygon mapping flips with the
   tooth's real orientation: Mesial always faces the midline (right-side
   quadrants 1/4/5/8 have M on the glyph's right edge), and Buccal faces
   outward (top edge on the upper arch, bottom edge on the lower arch).
   Incisors/canines get a slimmer incisal band instead of the square
   occlusal table. */
const RIGHT_SIDE_QUADRANTS = new Set([1, 4, 5, 8]);

const surfaceRegionsFor = (toothId, arch) => {
  const quadrant = Math.floor(Number(toothId) / 10);
  const mesialOnRight = RIGHT_SIDE_QUADRANTS.has(quadrant);
  const buccalOnTop = arch === 'upper';
  const left = 'M0 0 L10 10 L10 26 L0 36 Z';
  const right = 'M36 0 L26 10 L26 26 L36 36 Z';
  const top = 'M0 0 L36 0 L26 10 L10 10 Z';
  const bottom = 'M0 36 L36 36 L26 26 L10 26 Z';
  return {
    M: mesialOnRight ? right : left,
    D: mesialOnRight ? left : right,
    B: buccalOnTop ? top : bottom,
    L: buccalOnTop ? bottom : top,
  };
};

const ToothGlyph = ({ toothId, arch, surfaces = [], size = 36 }) => {
  const regions = surfaceRegionsFor(toothId, arch);
  const type = toothTypeOf(toothId);
  const fillFor = (key) => (surfaces.includes(key)
    ? 'var(--surface-brandPrimary-default, #007549)'
    : 'var(--surface-card-100, #FFFFFF)');
  const stroke = 'var(--border-neutral-tertiary, #E2E4E6)';
  const centerRect = (type === 'incisor' || type === 'canine')
    ? { x: 10, y: 14, width: 16, height: 8 }
    : { x: 10, y: 10, width: 16, height: 16 };
  return (
    <svg width={size} height={size} viewBox='0 0 36 36' aria-hidden focusable='false'>
      {['M', 'D', 'B', 'L'].map((key) => (
        <path key={key} d={regions[key]} fill={fillFor(key)} stroke={stroke} strokeWidth='1' />
      ))}
      <rect
        {...centerRect}
        fill={fillFor('O')}
        stroke={stroke}
        strokeWidth='1'
        rx='2'
      />
    </svg>
  );
};

/* ── Surface picker popup (per-tooth) ───────────────────────────────── */
const ALL_SURFACES = SURFACE_KEYS;

const SurfacePickerPopup = ({ open, toothId, arch, initialMark, onClose, onSave, onRemove }) => {
  const [surfaces, setSurfaces] = useState([]);
  const [material, setMaterial] = useState('');
  const [note, setNote] = useState('');
  const [materialQuery, setMaterialQuery] = useState('');
  const wasOpenRef = useRef(false);

  /* Reset session state only on the open ↑ transition (DrawingCanvasPopup's
     dirty-tracking pattern) so parent re-renders can't clobber edits. */
  useEffect(() => {
    if (open && !wasOpenRef.current) {
      setSurfaces(initialMark?.surfaces ? [...initialMark.surfaces] : []);
      setMaterial(initialMark?.material || '');
      setNote(initialMark?.note || '');
      setMaterialQuery('');
    }
    wasOpenRef.current = open;
  }, [open, initialMark]);

  const toggleSurface = (key) => setSurfaces((prev) => (
    prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
  ));
  const allSelected = ALL_SURFACES.every((k) => surfaces.includes(k));
  const toggleAll = () => setSurfaces(allSelected ? [] : [...ALL_SURFACES]);

  const dirty = useMemo(() => {
    const initSurfaces = [...(initialMark?.surfaces || [])].sort().join(',');
    const nowSurfaces = [...surfaces].sort().join(',');
    return initSurfaces !== nowSurfaces
      || (initialMark?.material || '') !== material
      || (initialMark?.note || '') !== note;
  }, [initialMark, surfaces, material, note]);

  const canSave = dirty && surfaces.length > 0 && !!material;

  const filteredMaterials = useMemo(() => {
    const q = materialQuery.trim().toLowerCase();
    if (!q) return DENTAL_MATERIALS;
    return DENTAL_MATERIALS.filter((m) => m.label.toLowerCase().includes(q));
  }, [materialQuery]);

  return (
    <Popup
      open={open}
      onClose={onClose}
      title={`บันทึกตำแหน่งฟัน ซี่ ${toothId ?? ''}`}
      subtitle='เลือกด้านของฟันที่พบรอยโรค/ทำหัตถการ พร้อมชนิดวัสดุ'
      tertiaryAction={initialMark
        ? { label: 'ลบเครื่องหมายซี่นี้', onClick: () => { onRemove?.(); onClose?.(); }, tone: 'danger' }
        : { label: 'ยกเลิก', onClick: onClose }}
      primaryAction={{
        label: 'บันทึกตำแหน่งฟัน',
        disabled: !canSave,
        onClick: () => {
          onSave?.({ surfaces, material, note });
          onClose?.();
        },
      }}
    >
      <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
        <div className='flex items-center justify-center'>
          <ToothGlyph toothId={toothId} arch={arch} surfaces={surfaces} size={96} />
        </div>

        <div className='flex flex-col' style={{ gap: 'var(--dim-space-200)' }}>
          <span style={{
            color: 'var(--text-content-default, #363B3F)',
            fontSize: 'var(--type-size-sm)',
            fontWeight: 'var(--type-weight-medium)',
          }}>
            ด้านของฟัน (เลือกได้หลายด้าน)
          </span>
          <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
            {DENTAL_SURFACES.map((s) => (
              <SelectableTag
                key={s.key}
                label={s.thai}
                size='lg'
                selected={surfaces.includes(s.key)}
                onClick={() => toggleSurface(s.key)}
              />
            ))}
            <SelectableTag
              label='เลือกทุกด้าน'
              size='lg'
              selected={allSelected}
              onClick={toggleAll}
            />
          </div>
          {surfaces.length === 0 && (
            <span style={{ color: 'var(--text-danger-default, #B91C1C)', fontSize: 'var(--type-size-xs)' }}>
              ต้องเลือกอย่างน้อย 1 ด้านก่อนบันทึก
            </span>
          )}
        </div>

        <div className='flex flex-col' style={{ gap: 'var(--dim-space-200)' }}>
          <span style={{
            color: 'var(--text-content-default, #363B3F)',
            fontSize: 'var(--type-size-sm)',
            fontWeight: 'var(--type-weight-medium)',
          }}>
            ชนิดวัสดุของเครื่องหมายนี้
          </span>
          {/* Wrapper owns the border — inner input is chrome-free via the
              injected .mih-dental-material-input rules above. */}
          <div
            className='flex items-center w-full'
            style={{
              gap: 'var(--dim-space-200)',
              paddingTop: 'var(--dim-space-200)',
              paddingBottom: 'var(--dim-space-200)',
              paddingLeft: 'var(--dim-space-300)',
              paddingRight: 'var(--dim-space-300)',
              borderRadius: 'var(--dim-radius-200, 8px)',
              border: 'var(--dim-stroke-100) solid var(--border-neutral-tertiary, #E2E4E6)',
              background: 'var(--surface-card-100, #FFFFFF)',
            }}
          >
            <Icon name='search' size={16} style={{ color: 'var(--text-content-quaternary, #ADB2B7)' }} />
            <input
              className='mih-dental-material-input flex-1 min-w-0'
              value={materialQuery}
              onChange={(e) => setMaterialQuery(e.target.value)}
              placeholder='ค้นหาวัสดุ เช่น คอมโพสิต / ฟลูออไรด์'
              aria-label='ค้นหาวัสดุทันตกรรม'
              style={{
                fontSize: 'var(--type-size-sm)',
                fontFamily: 'var(--type-family-body)',
                color: 'var(--text-content-default, #363B3F)',
              }}
            />
          </div>
          <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
            {filteredMaterials.map((m) => (
              <SelectableTag
                key={m.value}
                label={m.label}
                size='lg'
                selected={material === m.value}
                onClick={() => setMaterial(material === m.value ? '' : m.value)}
              />
            ))}
            {filteredMaterials.length === 0 && (
              <span style={{ color: 'var(--text-content-tertiary, #858C92)', fontSize: 'var(--type-size-sm)' }}>
                ไม่พบวัสดุที่ตรงกับคำค้น
              </span>
            )}
          </div>
          {surfaces.length > 0 && !material && (
            <span style={{ color: 'var(--text-danger-default, #B91C1C)', fontSize: 'var(--type-size-xs)' }}>
              เลือกชนิดวัสดุ (หรือ "ไม่ใช้วัสดุ" สำหรับการบันทึกรอยโรค)
            </span>
          )}
        </div>

        <div className='flex flex-col' style={{ gap: 'var(--dim-space-200)' }}>
          <span style={{
            color: 'var(--text-content-default, #363B3F)',
            fontSize: 'var(--type-size-sm)',
            fontWeight: 'var(--type-weight-medium)',
          }}>
            บันทึกเพิ่มเติมของซี่นี้
          </span>
          <SuggestibleTextarea
            voice
            value={note}
            onChange={(e) => setNote(e?.target?.value ?? '')}
            suggestions={DENTAL_TOOTH_NOTE_SUGGESTIONS}
            minChars={2}
            height={96}
            minHeight={64}
            placeholder='เช่น ผุลึกใกล้โพรงประสาทฟัน เฝ้าระวังอาการปวด'
          />
        </div>
      </div>
    </Popup>
  );
};

/* ── Arch row ─────────────────────────────────────────────────────────── */
const ToothButton = ({ toothId, arch, mark, readOnly, onClick }) => (
  <button
    type='button'
    onClick={readOnly ? undefined : onClick}
    aria-label={`ฟันซี่ ${toothId}${mark ? ` — เลือกแล้ว ${mark.surfaces.length} ด้าน` : ''}`}
    className='flex flex-col items-center shrink-0'
    style={{
      gap: 'var(--dim-space-100)',
      paddingTop: 'var(--dim-space-100)',
      paddingBottom: 'var(--dim-space-100)',
      paddingLeft: 'var(--dim-space-100)',
      paddingRight: 'var(--dim-space-100)',
      background: 'none',
      border: 'none',
      cursor: readOnly ? 'default' : 'pointer',
    }}
  >
    <ToothGlyph toothId={toothId} arch={arch} surfaces={mark?.surfaces || []} />
    <span
      style={{
        fontSize: 'var(--type-size-xs)',
        fontFamily: 'var(--type-family-body)',
        fontWeight: mark ? 'var(--type-weight-bold)' : 'var(--type-weight-regular)',
        color: mark
          ? 'var(--text-brandPrimary-default, #007549)'
          : 'var(--text-content-tertiary, #858C92)',
        paddingLeft: 'var(--dim-space-150)',
        paddingRight: 'var(--dim-space-150)',
        borderRadius: 'var(--dim-radius-full)',
        background: mark ? 'var(--surface-brandPrimary-quaternary, #F4FBF8)' : 'transparent',
      }}
    >
      {toothId}
    </span>
  </button>
);

const ArchRow = ({ teeth, arch, marks, readOnly, onPick }) => {
  const half = teeth.length / 2;
  return (
    <div className='flex items-center justify-center w-full' style={{ gap: 'var(--dim-space-100)' }}>
      {teeth.map((toothId, idx) => (
        <React.Fragment key={toothId}>
          {idx === half && (
            /* Midline separator between the two quadrants. */
            <div
              aria-hidden
              className='shrink-0 self-stretch'
              style={{ width: 'var(--dim-stroke-100)', background: 'var(--border-neutral-tertiary, #E2E4E6)' }}
            />
          )}
          <ToothButton
            toothId={toothId}
            arch={arch}
            mark={marks[toothId]}
            readOnly={readOnly}
            onClick={() => onPick(toothId, arch)}
          />
        </React.Fragment>
      ))}
    </div>
  );
};

/* ── Panel ────────────────────────────────────────────────────────────── */
const DentalChartPanel = ({
  dentition = 'permanent',
  onDentitionChange,
  toothMarks = { permanent: {}, primary: {} },
  onToothMarksChange,
  annotationMarkers = [],
  annotationDrawings = [],
  onAnnotationChange,
  readOnly = false,
}) => {
  const [picker, setPicker] = useState(null); // { toothId, arch } | null
  const [annotationOpen, setAnnotationOpen] = useState(false);

  const marks = toothMarks[dentition] || {};
  const selectedTeeth = Object.keys(marks).map(Number).sort((a, b) => a - b);
  const teethRows = TEETH_BY_DENTITION[dentition];

  const writeMarks = (nextForDentition) => {
    onToothMarksChange?.({ ...toothMarks, [dentition]: nextForDentition });
  };
  const saveMark = (toothId, mark) => {
    writeMarks({ ...marks, [toothId]: mark });
  };
  /* Deselecting a tooth clears its surfaces + material (Step 4 cascades a
     warning to any procedure row still referencing it — see DentalSteps). */
  const removeMark = (toothId) => {
    const next = { ...marks };
    delete next[toothId];
    writeMarks(next);
  };

  const archOf = (toothId) => (teethRows.upper.includes(Number(toothId)) ? 'upper' : 'lower');

  return (
    /* Card chrome aliased from BodyDiagramPanel's summary variant: white
       card + TabCapsule row + divider + body, sidebar 320px on the right. */
    <div className='flex flex-col w-full min-w-0' style={{ gap: 'var(--dim-space-300)' }}>
      <div className='flex items-center flex-wrap w-full' style={{ gap: 'var(--dim-space-200)' }}>
        {DENTITION_OPTIONS.map((opt) => (
          <TabCapsule
            key={opt.key}
            label={opt.label}
            selected={dentition === opt.key}
            showLeadingIcon={false}
            showTrailingIcon={false}
            onClick={() => onDentitionChange?.(opt.key)}
          />
        ))}
        <ColorfulBadge style={selectedTeeth.length > 0 ? 'teal' : 'grey'} size='small' hierarchy='secondary'>
          เลือกแล้ว {selectedTeeth.length} ซี่
        </ColorfulBadge>
        <div className='flex-1' />
        {!readOnly && (
          <BrandSubdueButton variant='outline' size='sm' leadingIcon='draw' onClick={() => setAnnotationOpen(true)}>
            วาดภาพประกอบเพิ่มเติม
          </BrandSubdueButton>
        )}
      </div>

      <div className='flex w-full min-w-0 items-stretch flex-col xl:flex-row' style={{ gap: 'var(--dim-space-300)' }}>
        {/* Odontogram card */}
        <div
          className='flex flex-col flex-1 min-w-0'
          style={{
            gap: 'var(--dim-space-300)',
            paddingTop: 'var(--dim-space-600)',
            paddingBottom: 'var(--dim-space-600)',
            paddingLeft: 'var(--dim-space-400)',
            paddingRight: 'var(--dim-space-400)',
            borderRadius: 'var(--dim-radius-400)',
            border: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary, #F4F5F5)',
            background: 'var(--surface-card-100, #FFFFFF)',
          }}
        >
          <div className='w-full' style={{ overflowX: 'auto' }}>
            <div className='flex flex-col' style={{ gap: 'var(--dim-space-300)', minWidth: 'fit-content' }}>
              <ArchRow teeth={teethRows.upper} arch='upper' marks={marks} readOnly={readOnly} onPick={(toothId, arch) => setPicker({ toothId, arch })} />
              <div
                aria-hidden
                className='w-full'
                style={{ height: 'var(--dim-stroke-100)', background: 'var(--border-neutral-tertiary, #E2E4E6)' }}
              />
              <ArchRow teeth={teethRows.lower} arch='lower' marks={marks} readOnly={readOnly} onPick={(toothId, arch) => setPicker({ toothId, arch })} />
            </div>
          </div>
          <span style={{
            color: 'var(--text-content-quaternary, #ADB2B7)',
            fontSize: 'var(--type-size-xs)',
            fontFamily: 'var(--type-family-body)',
            textAlign: 'center',
          }}>
            {readOnly
              ? 'บันทึกนี้เปิดแบบอ่านอย่างเดียว — กด "แก้ไข" ที่หัวบันทึกเพื่อแก้ไขตำแหน่งฟัน'
              : 'คลิกซี่ฟันเพื่อบันทึกด้าน (M / D / O-I / B-La / Li-P) และชนิดวัสดุ · สลับแท็บเพื่อบันทึกฟันน้ำนม'}
          </span>
        </div>

        {/* Sidebar — marked-teeth list (BodyDiagramPanel's 320px sidebar slot) */}
        <div
          className='flex flex-col shrink-0'
          style={{
            width: 320,
            gap: 'var(--dim-space-300)',
            paddingTop: 'var(--dim-space-400)',
            paddingBottom: 'var(--dim-space-400)',
            paddingLeft: 'var(--dim-space-400)',
            paddingRight: 'var(--dim-space-400)',
            borderRadius: 'var(--dim-radius-400)',
            border: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary, #F4F5F5)',
            background: 'var(--surface-card-100, #FFFFFF)',
          }}
        >
          <span style={{
            color: 'var(--text-content-default, #363B3F)',
            fontSize: 'var(--type-size-sm)',
            fontWeight: 'var(--type-weight-bold)',
            fontFamily: 'var(--type-family-heading-content)',
          }}>
            ตำแหน่งฟันที่บันทึก ({selectedTeeth.length})
          </span>
          {selectedTeeth.length === 0 ? (
            <span style={{ color: 'var(--text-content-quaternary, #ADB2B7)', fontSize: 'var(--type-size-sm)' }}>
              ยังไม่ได้เลือกตำแหน่งฟัน — คลิกซี่ฟันบนผังเพื่อเริ่มบันทึก
            </span>
          ) : (
            <div className='flex flex-col' style={{ gap: 'var(--dim-space-200)' }}>
              {selectedTeeth.map((toothId) => {
                const mark = marks[toothId];
                return (
                  <div
                    key={toothId}
                    className='flex items-start w-full'
                    style={{
                      gap: 'var(--dim-space-200)',
                      paddingTop: 'var(--dim-space-200)',
                      paddingBottom: 'var(--dim-space-200)',
                      paddingLeft: 'var(--dim-space-300)',
                      paddingRight: 'var(--dim-space-300)',
                      borderRadius: 'var(--dim-radius-200, 8px)',
                      background: 'var(--surface-brandPrimary-quaternary, #F4FBF8)',
                    }}
                  >
                    <ColorfulBadge style='green' size='small' hierarchy='secondary'>{`#${toothId}`}</ColorfulBadge>
                    <div className='flex flex-col flex-1 min-w-0' style={{ gap: 'var(--dim-space-050)' }}>
                      <span style={{ color: 'var(--text-content-default, #363B3F)', fontSize: 'var(--type-size-sm)' }}>
                        ด้าน {mark.surfaces.join(', ')}
                      </span>
                      <span style={{ color: 'var(--text-content-tertiary, #858C92)', fontSize: 'var(--type-size-xs)' }}>
                        {dentalMaterialLabelOf(mark.material)}
                      </span>
                      {mark.note && (
                        <span style={{ color: 'var(--text-content-tertiary, #858C92)', fontSize: 'var(--type-size-xs)' }}>
                          {mark.note}
                        </span>
                      )}
                    </div>
                    {!readOnly && (
                      <div className='flex items-center shrink-0' style={{ gap: 'var(--dim-space-100)' }}>
                        <BrandIconButton
                          variant='quaternary'
                          size='sm'
                          icon='edit'
                          aria-label={`แก้ไขตำแหน่งฟันซี่ ${toothId}`}
                          onClick={() => setPicker({ toothId, arch: archOf(toothId) })}
                        />
                        <BrandIconButton
                          variant='ghost'
                          size='sm'
                          icon='close'
                          aria-label={`ลบตำแหน่งฟันซี่ ${toothId}`}
                          onClick={() => removeMark(toothId)}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {annotationDrawings.length > 0 && (
            <NeutralSubdueButton size='sm' leadingIcon='image' onClick={() => setAnnotationOpen(true)}>
              ดูภาพประกอบที่วาดไว้ ({annotationDrawings.length})
            </NeutralSubdueButton>
          )}
        </div>
      </div>

      <SurfacePickerPopup
        open={!!picker}
        toothId={picker?.toothId}
        arch={picker?.arch}
        initialMark={picker ? marks[picker.toothId] : null}
        onClose={() => setPicker(null)}
        onSave={(mark) => picker && saveMark(picker.toothId, mark)}
        onRemove={() => picker && removeMark(picker.toothId)}
      />

      {/* Freehand annotation — DrawingCanvasPopup reused as-is (the spec's
          annotation mode); marks persist in the parent form state. */}
      <DrawingCanvasPopup
        open={annotationOpen}
        onClose={() => setAnnotationOpen(false)}
        title='วาดภาพประกอบการตรวจฟัน'
        subtitle='ใช้ปากกา/ข้อความอธิบายตำแหน่งรอยโรคเพิ่มเติมนอกเหนือจากผังฟัน'
        markers={annotationMarkers}
        drawings={annotationDrawings}
        onSave={(nextMarkers, nextDrawings) => {
          onAnnotationChange?.({ markers: nextMarkers, drawings: nextDrawings ?? annotationDrawings });
        }}
      />
    </div>
  );
};

export default DentalChartPanel;
