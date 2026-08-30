import React, { useEffect, useRef, useState } from 'react';
import BrandCircleIconButton from '@/components/button/BrandCircleIconButton';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import Icon from '@/components/icons/Icon';
import QueuePatientAvatar from '@/components/patient/QueuePatientAvatar';

/* MIH QueueSubMenu — Figma "Sub Menu B" (PHCIS-ALL 2624:122779 collapsed
   / 2624:122781 expanded).

   Compact patient-queue side panel that sits alongside the treatment
   form so the doctor can glance at the day's queue without leaving the
   open visit.    Four sections (top → bottom): ตรวจเสร็จแล้ว (teal) · ที่ร่างไว้
   (grey) · ตรวจอยู่ (blue, brand-100 outline) · รอคิว (orange).

   A single green circular toggle button is anchored to the right edge:
     • Collapsed (Figma 2624:122779) — only the toggle is visible
       (chevron_right). Click expands the panel.
     • Expanded  (Figma 2624:122781) — full 327 px panel renders with
       header, "ดูทั้งหมด" button, and queue sections. The toggle now
       shows chevron_left; click collapses it back. */

/* Collapsed strip is intentionally thin — Figma PHCIS|CPOE 195:28425
   shows only the round toggle button "peeking" past the right edge of
   a hairline-thin strip. The button (BrandCircleIconButton sm · 36 px)
   is anchored top-right and overflows the aside by ~half its width
   when collapsed, so the doctor sees just the green chevron knob. */
const COLLAPSED_WIDTH = 24;
/* กว้างพอให้ เลขคิว · รูป · ชื่อ · ปุ่มสามตัว อยู่บรรทัดเดียวไม่ตัดคำ
   (เดิม 327 — มติผู้ใช้ 27 ส.ค. 69 ให้ขยาย) */
/* 460 → 640: แถวหนึ่งต้องวาง เลขคิว + รูป + ชื่อเต็ม + badge (เช่น
   "VIP / ผู้ป่วยพิเศษ") + ปุ่มเรียก/พัก/ยกเลิก ให้ครบในบรรทัดเดียว พอปุ่มเรียก
   เปลี่ยนเป็น "เรียกแล้ว" (มีป้ายกำกับ ไม่ใช่ไอคอนเปล่า) ความกว้างเดิมไม่พอ
   ชื่อคนไข้โดนตัดเหลือ "นา..." ซึ่งเป็นข้อมูลที่ต้องอ่านออกก่อนเรียกคิว
   (มติผู้ใช้ 29 ส.ค. 69) */
const DEFAULT_EXPANDED_WIDTH = 640;
const TRANSITION = 'width 240ms cubic-bezier(0.32, 0.72, 0, 1)';

/* Each bucket is `{ items, total }` so the header can show the full
   queue size while the list renders only a short preview. Plain arrays
   are also accepted for backwards compatibility — see `normaliseBucket`. */
const DEFAULT_QUEUE = {
  done: {
    items: [
      { id: 'd1', name: 'นายสมชาย มีสุข' },
      { id: 'd2', name: 'นางสาวดวงใจ พินิจ' },
    ],
    total: 2,
  },
  draft: {
    items: [
      { id: 'dr1', name: 'นางปริญญา รัตนา' },
      { id: 'dr2', name: 'นายภูริ ใจกล้า' },
    ],
    total: 2,
  },
  inProgress: {
    items: [
      { id: 'p1', name: 'นางสุดา ปลอดโปร่ง', badge: 'VIP / ผู้ป่วยพิเศษ' },
      { id: 'p2', name: 'นายศุภชัย แก้วใส' },
    ],
    total: 2,
  },
  waiting: {
    items: [
      { id: 'w1', name: 'นางมาลี อ่อนน้อม' },
      { id: 'w2', name: 'นางสาวธนพร สุนทรา' },
    ],
    total: 2,
  },
};

/* Accepts either `{ items, total }` or a plain array (legacy callers).
   When passed an array, `total` falls back to the array length. */
const normaliseBucket = (bucket) => {
  if (!bucket) return { items: [], total: 0 };
  if (Array.isArray(bucket)) return { items: bucket, total: bucket.length };
  return { items: bucket.items ?? [], total: bucket.total ?? bucket.items?.length ?? 0 };
};

const DOT_TONES = {
  done:       'var(--icon-positive-tertiary, #3EC3B2)', /* teal   */
  draft:      'var(--icon-neutral-tertiary, #9CA3AF)',  /* grey   */
  inProgress: 'var(--icon-info-tertiary, #60A5FA)',     /* blue   */
  waiting:    'var(--icon-warning-tertiary, #FB923C)',  /* orange */
};

/* Row avatar — ขนาดเล็กกว่าตารางเวชระเบียน (36px) เพราะแถวในพาเนลเตี้ยกว่า */
const ROW_AVATAR_SIZE = 28;

/* Single queue row — dot · รูป profile · name · optional VIP badge · chevron.
   รูปใช้ <QueuePatientAvatar> ตัวเดียวกับตารางคิวเวชระเบียน คนคนเดียวกันจึงขึ้น
   รูปเดียวกันทั้งสองที่ และคนที่ยังไม่มีข้อมูลได้ silhouette "ผู้ใช้ใหม่"
   อัตโนมัติ (มติผู้ใช้ 27 ส.ค. 69) */
const QueueRow = ({
  name, hn, avatarUrl, newUser, tone, badge, queueNo, actions, sublabel,
  emphasis = false, showDot = true, divider = false, onClick,
}) => (
  /* สองทรง:
       • การ์ด (ค่าเริ่มต้น) — ใช้ในหน้าห้องตรวจ/คัดกรอง ตาม Figma "Sub Menu B"
       • `divider` — แถวเรียบคั่นด้วยเส้นบาง ทรงเดียวกับตาราง worklist
         (มติผู้ใช้ 27 ส.ค. 69: พาเนลคิวรอลงทะเบียนไม่ต้องเป็นการ์ด)
     โหมด divider จัดทุกอย่างในบรรทัดเดียว: เลขคิว → รูป → ชื่อ → ปุ่ม (ไม่มี chevron) */
  /* การ์ดที่มีปุ่มท้ายแถวจัดเป็นแนวนอนเหมือนโหมด divider — เดิมการ์ดเป็น
     `flex-col` ปุ่มจึงตกไปอยู่บรรทัดล่างของการ์ด กินความสูงเป็นเท่าตัว
     (พาเนลคิวคัดกรอง 28 ส.ค. 69) */
  <div
    className={divider || actions ? 'flex items-center w-full' : 'flex flex-col w-full'}
    style={divider ? {
      gap: 'var(--dim-space-300, 12px)',
      paddingTop: 'var(--dim-space-200, 8px)',
      paddingBottom: 'var(--dim-space-200, 8px)',
      /* สีเส้นเดียวกับเส้นคั่นแถวของตาราง worklist (--border-table-line)
         ไม่ใช่เทากลาง — พาเนลกับตารางอยู่จอเดียวกัน เส้นสองสีอ่านเป็นคนละระบบ
         (มติผู้ใช้ 28 ส.ค. 69) */
      borderBottom: 'var(--dim-stroke-100, 1px) solid var(--border-table-line, var(--brand-p50, #F4FBF8))',
    } : {
      gap: 'var(--dim-space-200, 8px)',
      padding: 'var(--dim-space-300, 12px)',
      border: emphasis
        ? 'var(--dim-stroke-200, 2px) solid var(--border-card-brand-100, #C5EDDA)'
        : 'var(--dim-stroke-100, 1px) solid var(--border-neutralbutton-tertiary, #E2E4E6)',
      borderRadius: 'var(--dim-radius-200, 8px)',
      background: 'var(--surface-card-default, #FFFFFF)',
      cursor: 'pointer',
    }}
  >
    <button
      type='button'
      onClick={onClick}
      className='flex items-center text-left min-w-0'
      style={{
        gap: 'var(--dim-space-200, 8px)',
        background: 'transparent',
        cursor: onClick ? 'pointer' : 'default',
        flex: '1 1 auto',
      }}
    >
      {showDot && (
        <span
          aria-hidden
          className='shrink-0'
          style={{
            width: 8, height: 8,
            borderRadius: 'var(--dim-radius-100, 4px)',
            background: tone,
          }}
        />
      )}
      {/* เลขคิว — ColorfulBadge teal ตัวเดียวกับคอลัมน์ "คิว" ในตาราง worklist */}
      {queueNo && (
        <span className='shrink-0'>
          <ColorfulBadge style='teal' size='small' width='hug' hierarchy='secondary'>
            {queueNo}
          </ColorfulBadge>
        </span>
      )}
      <QueuePatientAvatar
        name={name}
        hn={hn}
        avatarUrl={avatarUrl}
        newUser={newUser}
        size={ROW_AVATAR_SIZE}
      />
      {/* มี sublabel (เช่น "ลงทะเบียนโดย …") → ชื่อขึ้นบรรทัดบน sublabel บรรทัดล่าง
          แทนที่จะต่อท้ายในบรรทัดเดียว เพราะแถวนี้มี badge + ปุ่มสามอันอยู่แล้ว
          ถ้าเบียดเข้าไปอีกชื่อคนไข้จะโดนตัด (มติผู้ใช้ 29 ส.ค. 69) */}
      <span
        className={divider && !sublabel
          ? 'min-w-0 flex items-center'
          : 'flex-1 min-w-0 flex flex-col items-start'}
        style={{
          gap: divider && sublabel ? 'var(--dim-space-050, 2px)' : 'var(--dim-space-200, 8px)',
          flex: divider ? '1 1 auto' : undefined,
        }}
      >
        {name && name !== queueNo && (
          <span
            className='truncate'
            style={{
              color: 'var(--text-content-default, #171A1F)',
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-sm, 14px)',
              fontWeight: 'var(--type-weight-regular, 400)',
              lineHeight: 1.5,
            }}
          >
            {name}
          </span>
        )}
        {badge && (
          <ColorfulBadge style='red' size='small' width='hug' hierarchy='secondary'>
            {badge}
          </ColorfulBadge>
        )}
        {sublabel && (
          <span
            className='truncate w-full'
            style={{
              color: 'var(--text-content-tertiary)',
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-xs)',
              lineHeight: 1.5,
            }}
          >
            {sublabel}
          </span>
        )}
      </span>
      {/* chevron บอกว่าแถวกดเข้าไปได้ — ซ้ำซ้อนเมื่อมีปุ่มจริงอยู่ท้ายแถวแล้ว */}
      {!divider && !actions && <Icon name='chevron_right' size={16} className='shrink-0' />}
    </button>
    {actions && <span className='shrink-0'>{actions}</span>}
  </div>
);

const SectionLabel = ({ children, trailing }) => (
  <div
    className='flex items-center w-full'
    style={{ gap: 'var(--dim-space-400, 16px)' }}
  >
    <span
      className='flex-1 min-w-0'
      style={{
        color: 'var(--text-content-secondary, #565D6D)',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-xs, 12px)',
        fontWeight: 'var(--type-weight-regular, 400)',
        lineHeight: 1.5,
      }}
    >
      {children}
    </span>
    {trailing}
  </div>
);

const ViewAllButton = ({ onClick }) => (
  <button
    type='button'
    onClick={onClick}
    className='inline-flex items-center justify-center'
    style={{
      height: 36,
      gap: 'var(--dim-space-150, 6px)',
      padding: 'var(--dim-space-150, 6px) var(--dim-space-300, 12px)',
      border: 'var(--dim-stroke-100, 1px) solid var(--border-neutralbutton-tertiary, #E2E4E6)',
      borderRadius: 'var(--dim-radius-200, 8px)',
      background: 'var(--surface-neutralbutton-default, #FFFFFF)',
      color: 'var(--text-neutralbutton-default, #4D5358)',
      fontFamily: 'var(--type-family-body)',
      fontSize: 'var(--type-size-sm, 14px)',
      fontWeight: 'var(--type-weight-medium, 500)',
      cursor: 'pointer',
      whiteSpace: 'nowrap',
    }}
  >
    ดูทั้งหมด
    <Icon name='chevron_right' size={16} />
  </button>
);

const DEFAULT_SECTION_LABELS = {
  done:       (n) => `ตรวจเสร็จแล้ว (${n})`,
  draft:      (n) => `ที่ร่างไว้ (${n})`,
  inProgress: (n) => `ผู้ป่วยตรวจอยู่ (${n})`,
  waiting:    (n) => `ผู้ป่วยรอคิว (${n})`,
};

const QueueSubMenu = ({
  /** Controlled open/closed. If omitted, the panel manages its own state. */
  expanded: controlledExpanded,
  onExpandedChange,
  /** Patient buckets — defaults to mock data when omitted. */
  queue = DEFAULT_QUEUE,
  /** Optional per-module section labels — `(count) => string`. */
  sectionLabels = DEFAULT_SECTION_LABELS,
  /** Click handlers — wire to navigation when ready. */
  onViewAll,
  onPickPatient,
  /** เลือกว่าจะแสดงหมวดไหนบ้าง เรียงตามที่ส่งมา — ไม่ส่ง = ครบสี่หมวดเหมือนเดิม
      (หน้าลงทะเบียนส่ง ['waiting'] มา เพราะต้องการเห็นแค่คิวที่รอ — มติผู้ใช้
      27 ส.ค. 69) */
  sections = ['done', 'draft', 'inProgress', 'waiting'],
  /* แถวเรียบคั่นด้วยเส้นบางแทนการ์ด + ไม่มีจุดสีนำหน้า + ไม่มี chevron
     (ทรงเดียวกับตาราง worklist) */
  rowVariant = 'card',
  /** ความกว้างตอนกาง — ตั้งได้ต่อหน้าเผื่อพาเนลที่มีปุ่มท้ายแถว */
  expandedWidth = DEFAULT_EXPANDED_WIDTH,
  /** แสดงเลขคิวหน้าชื่อ (พาเนลคิวรอลงทะเบียนต้องเห็นเลขคิว) */
  showQueueNo = false,
  /** จุดสีนำหน้าชื่อ — บอกหมวดของแถว จึงไม่มีประโยชน์เมื่อพาเนลเหลือหมวดเดียว
      (พาเนลคิวคัดกรองปิดไว้ — มติผู้ใช้ 28 ส.ค. 69) แถวทรง `divider` ไม่มีจุด
      อยู่แล้วไม่ว่าค่านี้จะเป็นอะไร */
  showDots = true,
  /** ปุ่มจัดการคิวท้ายแถว — `(item, sectionKey) => ReactNode` */
  renderRowActions,
  /** โหนดบนสุดของพาเนลตอนกาง (เช่น ตัวสลับมุมมองของคิวรวมรอรับเคส) */
  headerSlot = null,
  /** แทนการเรนเดอร์แถวทั้งแถว — `(item, sectionKey, rowIdx) => ReactNode`
      ใช้เมื่อผู้เรียกต้องการการ์ดของตัวเอง (พาเนลคิวรวมใช้การ์ดเดียวกับบอร์ด
      ในหน้าคิวรวมรอรับเคส) ไม่ส่งมา = ใช้ QueueRow ตามเดิม */
  renderRow,
  className = '',
  style = {},
}) => {
  const [internalExpanded, setInternalExpanded] = useState(false);
  const isControlled = controlledExpanded !== undefined;
  const expanded = isControlled ? controlledExpanded : internalExpanded;
  /* Toggle handler — fires for BOTH icon variants (chevron_right when
     collapsed → expand · chevron_left when expanded → collapse). The
     parent can listen via `onExpandedChange` if it wants to sync other
     UI to the panel state. */
  const toggle = () => {
    const next = !expanded;
    if (!isControlled) setInternalExpanded(next);
    onExpandedChange?.(next);
  };

  /* คลิกนอกพาเนล → ปิดเอง (มติผู้ใช้ 27 ส.ค. 69) ผูกที่ `pointerdown` ไม่ใช่
     `click` เพราะปุ่มในแถวเรียก stopPropagation บน click ไว้ · ปุ่ม toggle เอง
     อยู่ใน rootRef อยู่แล้ว จึงไม่โดนนับเป็น "นอกกล่อง" แล้วสั่งปิดซ้อนกับ toggle
     · ป๊อปอัปยืนยันเปิดผ่าน portal นอก DOM นี้ ระหว่างเปิดจึงไม่ผูก listener
       ไม่งั้นกดปุ่มในป๊อปอัปแล้วพาเนลจะปิดไปด้วย */
  const rootRef = useRef(null);
  useEffect(() => {
    if (!expanded) return undefined;
    const onPointerDown = (e) => {
      if (rootRef.current?.contains(e.target)) return;
      /* คลิกใน overlay/ป๊อปอัปที่ render อยู่นอก aside — ไม่นับว่าคลิกนอกพาเนล */
      if (e.target.closest?.('[role="dialog"], [data-mih-portal]')) return;
      if (!isControlled) setInternalExpanded(false);
      onExpandedChange?.(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [expanded, isControlled, onExpandedChange]);

  /* หมวดสร้างจาก `sections` ที่ผู้เรียกส่งมา ไม่ใช่สี่คีย์ตายตัว — พาเนลคิวรวม
     รอรับเคสจัดหมวดตาม "คลินิก" ซึ่งคีย์เป็นอะไรก็ได้ (มติผู้ใช้ 30 ส.ค. 69)
     สี่คีย์เดิมยังทำงานเหมือนเดิมทุกประการ เพราะมันก็มาทาง `sections` อยู่แล้ว */
  const BUCKETS = Object.fromEntries(
    sections.map((key) => [key, normaliseBucket(queue[key])]),
  );

  return (
    <aside
      ref={rootRef}
      aria-label='คิวผู้ป่วย'
      className={`relative shrink-0 self-stretch ${className}`}
      style={{
        /* Outer placeholder — reserves just the collapsed strip
           footprint so the form column to the right sits flush
           against the panel. The visible panel below is the
           COLLAPSED_WIDTH (24 px) strip. */
        width: COLLAPSED_WIDTH,
        /* `overflow: visible` so the absolute child can extend past
           this placeholder horizontally when expanded. */
        overflow: 'visible',
        ...style,
      }}
    >
      {/* Visual panel — `position: fixed` so the panel (and its
          absolutely-positioned toggle button) stays anchored to the
          viewport regardless of page scroll. The aside placeholder
          above still reserves COLLAPSED_WIDTH in the flex flow so the
          form column never reflows when the panel expands.
          `left: var(--sm-width-closed)` parks the panel immediately
          after the Sidebar rail's collapsed footprint, matching the
          aside's in-flow position. */}
      <div
        className='fixed top-0 bottom-0'
        style={{
          left: 'var(--sm-width-closed)',
          width: expanded ? expandedWidth : COLLAPSED_WIDTH,
          transition: TRANSITION,
          background: 'var(--surface-navigation-default, #FFFFFF)',
          borderRight: 'var(--dim-stroke-100, 1px) solid var(--border-brandsecondary-quaternary, #EFF5EF)',
          boxShadow: 'var(--shadow-sidemenu, 0 1px 4px rgba(8,167,104,0.10), 0 1px 2px rgba(8,167,104,0.08))',
          /* Float above the form column AND the sticky page chrome
             (Header z=1200 · Footer z=40 · PatientCard sticky inside
             content) so the expanded overlay covers them cleanly. Set
             just under --sm-z-overlay (1300, Sidebar) so the global
             rail still wins if both stack. */
          zIndex: 1250,
          overflow: 'visible',
        }}
      >
      {/* Clipping wrapper — the panel itself runs `overflow: visible` so
          the toggle button can stick out, but the queue body keeps a
          fixed inner width (`expandedWidth`) so its layout doesn't
          reflow during the collapse animation. This wrapper hides the
          excess horizontally while the panel is narrower than the
          body. */}
      <div
        className='h-full'
        style={{ width: '100%', overflow: 'hidden' }}
      >
      {/* Expanded body — slides into view when open. Kept mounted in the
          collapsed state with opacity:0 so the slide-in animation has
          content to reveal (no flicker on first expand).
          `overscrollBehavior: contain` traps wheel / touch scroll
          inside this body so reaching the top or bottom never chains
          out to the page underneath — the form column only scrolls
          when the cursor sits outside this panel. */}
      <div
        aria-hidden={!expanded}
        className='flex flex-col h-full'
        style={{
          width: expandedWidth,
          padding: 'var(--dim-space-600, 24px)',
          gap: 'var(--dim-space-600, 24px)',
          opacity: expanded ? 1 : 0,
          pointerEvents: expanded ? 'auto' : 'none',
          transition: 'opacity 200ms ease',
          overflowY: 'auto',
          overflowX: 'hidden',
          overscrollBehavior: 'contain',
        }}
      >
        {headerSlot}
        {sections.map((key) => {
          const bucket = BUCKETS[key];
          if (!bucket) return null;
          return (
            <div key={key} className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
              {/* ปุ่ม "ดูทั้งหมด" ขึ้นเฉพาะเมื่อผู้เรียกส่ง onViewAll มา — หน้า
                  ลงทะเบียนไม่ส่งแล้ว (มติผู้ใช้ 27 ส.ค. 69) */}
              <SectionLabel
                trailing={onViewAll && key === sections[0]
                  ? <ViewAllButton onClick={onViewAll} />
                  : undefined}
              >
                {sectionLabels[key](bucket.total)}
              </SectionLabel>
              {bucket.items.map((p, rowIdx) => (renderRow ? (
                <React.Fragment key={p.id}>{renderRow(p, key, rowIdx)}</React.Fragment>
              ) : (
                <QueueRow
                  key={p.id}
                  name={p.name}
                  hn={p.hn}
                  avatarUrl={p.avatarUrl}
                  newUser={p.newUser}
                  queueNo={showQueueNo ? p.queue : undefined}
                  tone={DOT_TONES[key] || undefined}
                  badge={p.badge}
                  sublabel={p.sublabel}
                  emphasis={key === 'inProgress'}
                  divider={rowVariant === 'divider'}
                  showDot={showDots && rowVariant !== 'divider'}
                  actions={renderRowActions ? renderRowActions(p, key, rowIdx) : undefined}
                  onClick={onPickPatient ? () => onPickPatient(p, key) : undefined}
                />
              )))}
            </div>
          );
        })}
      </div>
      </div>

      {/* Toggle — Figma PHCIS|CPOE 195:28425 (collapsed · chevron_right)
          and 195:41153 (expanded · chevron_left, `left: 303` on a 327
          px wide panel → button overflows the right edge by 12 px). In
          BOTH states the button is `position: absolute` at top:24px and
          its right edge sits 12 px past the panel's right border, so
          the toggle keeps a fixed visual anchor across the expand /
          collapse animation. The aside runs `overflow: visible` so the
          peek is never clipped. */}
      <BrandCircleIconButton
        size='sm'
        icon={expanded ? 'chevron_left' : 'chevron_right'}
        onClick={toggle}
        aria-label={expanded ? 'ย่อแถบคิวผู้ป่วย' : 'ขยายแถบคิวผู้ป่วย'}
        aria-expanded={expanded}
        style={{
          position: 'absolute',
          top: 'var(--dim-space-600, 24px)',
          right: -20,
          zIndex: 1,
        }}
      />
      </div>
    </aside>
  );
};

export default QueueSubMenu;
