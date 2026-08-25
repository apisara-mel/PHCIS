import React, { useCallback, useEffect, useRef, useState } from 'react';
import BrandSubdueIconButton from '@/components/button/BrandSubdueIconButton';

/* MIH RichTextEditor — กล่องข้อความแบบจัดรูปแบบได้ตามที่เลือก (มติผู้ใช้ 25 ส.ค. 69)

   ทำงานแบบเดียวกับกล่องเขียนบล็อก: ไฮไลต์คำแล้วกด B จะหนา **เฉพาะคำนั้น**
   ไม่ใช่ทั้งช่อง — ของเดิมเก็บ bold/italic/underline เป็น flag ระดับช่อง
   จึงทำแบบนี้ไม่ได้

   ใช้ contentEditable + document.execCommand เพราะ:
   • ได้ selection-based formatting + undo/redo ของเบราว์เซอร์ฟรี
   • ไม่ต้องลง dependency ใหม่ (โปรเจกต์นี้ไม่มี rich-text lib อยู่แล้ว)
   execCommand ถูกมาร์ค deprecated แต่ยังทำงานทุกเบราว์เซอร์ที่ระบบรองรับ และ
   ยังไม่มีตัวแทนมาตรฐาน — ถ้าวันหนึ่งเลิกทำงาน ให้เปลี่ยนมาใช้ Selection API
   เขียน <b>/<i>/<u> เอง โดย API ของ component นี้ไม่ต้องเปลี่ยน

   value / onChange เป็น **HTML string** — ผู้เรียกต้องเรนเดอร์ด้วย
   `sanitizeRichText()` เสมอ ห้ามยัด innerHTML ดิบ */

const ALLOWED_TAGS = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'A', 'BR', 'DIV', 'P', 'SPAN']);

/** ตัดทุกอย่างที่ไม่ได้อยู่ในลิสต์ทิ้ง — กัน <script>/on* ที่หลุดมาจากการ paste */
export const sanitizeRichText = (html) => {
  if (!html || typeof document === 'undefined') return '';
  const root = document.createElement('div');
  root.innerHTML = String(html);
  const walk = (node) => {
    [...node.childNodes].forEach((child) => {
      if (child.nodeType === 3) return; /* text */
      if (child.nodeType !== 1 || !ALLOWED_TAGS.has(child.tagName)) {
        /* ไม่อนุญาต → เก็บแต่ข้อความข้างใน */
        const text = document.createTextNode(child.textContent || '');
        node.replaceChild(text, child);
        return;
      }
      [...child.attributes].forEach((attr) => {
        const keep = child.tagName === 'A'
          && (attr.name === 'href' || attr.name === 'target' || attr.name === 'rel');
        const safeHref = attr.name !== 'href'
          || /^(https?:|mailto:|tel:|\/)/i.test(String(attr.value).trim());
        if (!keep || !safeHref) child.removeAttribute(attr.name);
      });
      if (child.tagName === 'A') {
        child.setAttribute('target', '_blank');
        child.setAttribute('rel', 'noopener noreferrer');
      }
      walk(child);
    });
  };
  walk(root);
  return root.innerHTML;
};

/** ข้อความล้วนของ HTML — ใช้เช็ค "กรอกครบหรือยัง" และทำ preview แบบตัดคำ */
export const richTextToPlain = (html) => {
  if (!html) return '';
  if (typeof document === 'undefined') return String(html).replace(/<[^>]*>/g, '');
  const el = document.createElement('div');
  el.innerHTML = String(html);
  return el.textContent || '';
};

/* กรอบเป็นของกล่องด้านนอก — พื้นที่พิมพ์ต้องไม่มี chrome ของเบราว์เซอร์
   (กฎใน CLAUDE.md) ฉีดครั้งเดียวตอนโหลดโมดูล */
if (typeof document !== 'undefined' && !document.getElementById('mih-rich-text-style')) {
  const el = document.createElement('style');
  el.id = 'mih-rich-text-style';
  el.textContent = [
    '.mih-rich-text,',
    '.mih-rich-text:focus,',
    '.mih-rich-text:focus-visible {',
    '  border: 0 !important;',
    '  outline: none !important;',
    '  box-shadow: none !important;',
    '  background: transparent !important;',
    '  -webkit-appearance: none !important;',
    '  appearance: none !important;',
    '}',
    /* placeholder ของ contentEditable ทำด้วย ::before เพราะไม่มี attribute ให้ใช้ */
    '.mih-rich-text:empty::before {',
    '  content: attr(data-placeholder);',
    /* สีเดียวกับ ::placeholder ของ TextField/Textarea (_inputBox.jsx) */
    '  color: var(--text-input-default, #ADB2B7);',
    '  opacity: 1;',
    '  pointer-events: none;',
    '}',
    '.mih-rich-text a { color: var(--text-brandPrimary-default); text-decoration: underline; }',
  ].join('\n');
  document.head.appendChild(el);
}

/* ปุ่มทุกตัวใน toolbar = BrandSubdueIconButton ของ DS (มติผู้ใช้ 25 ส.ค. 69)
   จะได้ state hover / focus / active ตามสเปกคอมโพเนนต์ ไม่ต้องวาดเอง
   onMouseDown + preventDefault แทน onClick — ไม่งั้นคลิกปุ่มแล้วกล่องเสีย
   selection ก่อน execCommand จะได้ทำงาน (ทั้งชุดจึงส่งผ่าน ...rest) */
const ToolbarButton = ({ icon, label, active = false, onPress }) => (
  <BrandSubdueIconButton
    icon={icon}
    variant='outline'
    size='sm'
    active={active}
    aria-label={label}
    title={label}
    onMouseDown={(e) => { e.preventDefault(); onPress(); }}
  />
);

const COMMANDS = [
  { key: 'bold', cmd: 'bold', icon: 'format_bold', label: 'ตัวหนา' },
  { key: 'italic', cmd: 'italic', icon: 'format_italic', label: 'ตัวเอียง' },
  { key: 'underline', cmd: 'underline', icon: 'format_underlined', label: 'ขีดเส้นใต้' },
];

/**
 * @param {object}   props
 * @param {string}   props.value        — HTML string
 * @param {Function} props.onChange     — (html) => void
 * @param {string}   [props.placeholder]
 * @param {string}   [props.label]      — ข้อความเล็ก ๆ หน้าแถบปุ่ม
 * @param {string}   [props.ariaLabel]
 * @param {number}   [props.minHeight]  — px
 */
export default function RichTextEditor({
  value = '',
  onChange,
  placeholder = 'พิมพ์ข้อความ...',
  label,
  ariaLabel = 'กล่องข้อความ',
  minHeight = 72,
}) {
  const areaRef = useRef(null);
  const [active, setActive] = useState({});
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  /* selection ที่ผู้ใช้ไฮไลต์ไว้ก่อนจะไปคลิกช่องกรอก URL — ต้องเก็บไว้เอง
     เพราะพอโฟกัสหลุดไป input, selection ในกล่องจะหาย */
  const savedRange = useRef(null);

  /* uncontrolled โดยตั้งใจ: เขียน innerHTML ทับทุก render จะทำให้ caret เด้ง
     ไปท้ายกล่องทุกตัวอักษร — sync เฉพาะตอนค่าต่างจากที่อยู่ใน DOM จริง */
  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    const next = value || '';
    if (el.innerHTML !== next) el.innerHTML = next;
  }, [value]);

  const refreshActive = useCallback(() => {
    if (typeof document === 'undefined' || !document.queryCommandState) return;
    const el = areaRef.current;
    if (!el || !el.contains(document.getSelection()?.anchorNode || null)) return;
    const next = {};
    COMMANDS.forEach((c) => {
      try { next[c.key] = document.queryCommandState(c.cmd); } catch (_) { next[c.key] = false; }
    });
    setActive(next);
  }, []);

  useEffect(() => {
    document.addEventListener('selectionchange', refreshActive);
    return () => document.removeEventListener('selectionchange', refreshActive);
  }, [refreshActive]);

  const emit = () => {
    const el = areaRef.current;
    if (el) onChange?.(sanitizeRichText(el.innerHTML));
  };

  const run = (cmd, arg) => {
    areaRef.current?.focus();
    try { document.execCommand(cmd, false, arg); } catch (_) { /* noop */ }
    refreshActive();
    emit();
  };

  const saveRange = () => {
    const sel = document.getSelection();
    if (sel && sel.rangeCount && areaRef.current?.contains(sel.anchorNode)) {
      savedRange.current = sel.getRangeAt(0).cloneRange();
    }
  };

  const restoreRange = () => {
    const range = savedRange.current;
    if (!range) return;
    const sel = document.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  };

  const applyLink = () => {
    const url = linkUrl.trim();
    setLinkOpen(false);
    setLinkUrl('');
    if (!url) return;
    const href = /^(https?:|mailto:|tel:)/i.test(url) ? url : `https://${url}`;
    areaRef.current?.focus();
    restoreRange();
    try { document.execCommand('createLink', false, href); } catch (_) { /* noop */ }
    emit();
  };

  return (
    <div
      className='flex flex-col w-full min-w-0'
      style={{
        border: 'var(--dim-stroke-100, 1px) solid var(--border-card-default)',
        borderRadius: 'var(--dim-radius-200, 8px)',
        background: 'var(--surface-card-100)',
        overflow: 'hidden',
      }}
    >
      {/* แถบเครื่องมือมีพื้นเทาแยกจากพื้นที่พิมพ์ (มติผู้ใช้ 25 ส.ค. 69) */}
      <div
        className='flex items-center flex-wrap'
        role='toolbar'
        aria-label={`จัดรูปแบบ${label ? ` ${label}` : ''}`}
        style={{
          gap: 'var(--dim-space-150, 6px)',
          padding: 'var(--dim-space-200, 8px)',
          background: 'var(--surface-neutral-quaternary, #F9FBFB)',
        }}
      >
        {label ? <span className='text-xs text-ink-tertiary'>{label}</span> : null}
        {COMMANDS.map((c) => (
          <ToolbarButton
            key={c.key}
            icon={c.icon}
            label={c.label}
            active={Boolean(active[c.key])}
            onPress={() => run(c.cmd)}
          />
        ))}
        <ToolbarButton
          icon='link'
          label='แทรกลิงก์'
          active={linkOpen}
          onPress={() => { saveRange(); setLinkOpen((o) => !o); }}
        />
        <ToolbarButton icon='link_off' label='ลบลิงก์' onPress={() => run('unlink')} />
      </div>

      {linkOpen ? (
        <div
          className='flex items-center flex-wrap w-full min-w-0'
          style={{
            gap: 'var(--dim-space-200, 8px)',
            padding: 'var(--dim-space-200, 8px)',
            background: 'var(--surface-neutral-quaternary, #F9FBFB)',
          }}
        >
          <input
            autoFocus
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); applyLink(); }
              if (e.key === 'Escape') { setLinkOpen(false); setLinkUrl(''); }
            }}
            placeholder='วางลิงก์ เช่น https://bangkok.go.th'
            className='mih-rich-text flex-1 min-w-0'
            style={{
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-sm)',
              color: 'var(--text-content-primary)',
              border: 'var(--dim-stroke-100, 1px) solid var(--border-card-default)',
              borderRadius: 'var(--dim-radius-150, 6px)',
              padding: 'var(--dim-space-150, 6px) var(--dim-space-200, 8px)',
            }}
          />
          <button
            type='button'
            onMouseDown={(e) => { e.preventDefault(); applyLink(); }}
            className='inline-flex items-center justify-center shrink-0'
            style={{
              height: 'var(--dim-size-600, 32px)',
              paddingLeft: 'var(--dim-space-300, 12px)',
              paddingRight: 'var(--dim-space-300, 12px)',
              border: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary)',
              borderRadius: 'var(--dim-radius-150, 6px)',
              background: 'var(--surface-brandPrimary-quaternary)',
              color: 'var(--text-brandPrimary-default)',
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-xs)',
            }}
          >
            ใส่ลิงก์
          </button>
        </div>
      ) : null}

      <div
        ref={areaRef}
        role='textbox'
        aria-multiline
        aria-label={ariaLabel}
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onInput={emit}
        onBlur={() => { saveRange(); emit(); }}
        onKeyUp={refreshActive}
        onMouseUp={refreshActive}
        className='mih-rich-text w-full min-w-0'
        style={{
          minHeight,
          padding: 'var(--dim-space-300, 12px)',
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-sm)',
          lineHeight: 1.6,
          color: 'var(--text-content-primary)',
        }}
      />
    </div>
  );
}
