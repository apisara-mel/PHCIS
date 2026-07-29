import React, { useState } from 'react';
import BrandButton from '@/components/button/BrandButton';
import BrandSubdueIconButton from '@/components/button/BrandSubdueIconButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import StatusBadge from '@/components/badge/StatusBadge';
import Icon from '@/components/icons/Icon';
import PersonalDataConsentEditPopup from '@/components/forms/PersonalDataConsentEditPopup';

/**
 * Step 5 — แบบฟอร์ม
 * Two sections:
 *  1. แบบฟอร์มที่ประเมินแล้ว (assessed / currently highlighted form)
 *  2. แบบฟอร์มที่ใช้บ่อย (frequently-used template grid)
 *
 * Form card chrome follows Figma MIH Design System — Card (FormCard · 150:1223):
 * ColorfulBadge = ประเภทฟอร์ม (text-only). Optional **version** — ColorfulBadge blue secondary
 * small (Figma Colorful Badge `161:920` · magenta). StatusBadge **ประเมินแล้ว** เฉพาะแถวที่ประเมินแล้ว —
 * กริด “แบบฟอร์มที่ใช้บ่อย” ยังไม่ผ่านการประเมิน จึงไม่แสดง success badge.
 *
 * Footer **Button Group** (Figma PHCIS | OPD · `162:20070` → Form Card):
 *   Brand Subdue Icon Button (`visibility`, 36×36) · Neutral Subdue outline + `edit` → **แก้ไข** (assessed row) ·
 *   Brand Subdue Icon Button · Brand Button outline + `edit` → **ประเมิน** (frequent templates).
 *
 * **Form cover** — `public/illustration/form-cover0N.svg` (227×113) ตามประเภทฟอร์ม:
 *   ใบยินยอม → 01 · ใบรับรองแพทย์ → 02 · ใบคำขอ → 03 · แบบฟอร์มประเมิน → 04 · เอกสารประกอบ → 05.
 *   Full-bleed strip, `object-cover`, bottom stroke `border/card/default`, `aspect-ratio` **227:113**.
 *
 * All brand colors flow through tailwind brand-* aliases →
 * switches with [data-brand].
 */

/** ประเภทฟอร์ม — maps to <ColorfulBadge style=…> (Figma: text-only category pill, no dot/icon). */
const FORM_CATEGORIES = {
  consent:     { style: 'blue',   label: 'ใบยินยอม' },
  assessment:  { style: 'teal',   label: 'แบบฟอร์มประเมิน' },
  certificate: { style: 'indigo', label: 'ใบรับรองแพทย์' },
  request:     { style: 'orange', label: 'ใบคำขอ' },
  document:    { style: 'grey',   label: 'เอกสารประกอบ' },
};

/** สถานะ success “ประเมินแล้ว” — ใช้เมื่อ `showStatusBadge` (แถวแบบฟอร์มที่ประเมินแล้ว). */
const FORM_STATUSES = {
  assessed: { style: 'success', icon: 'check_circle', label: 'ประเมินแล้ว' },
};

/** Cover art per category — `public/illustration/form-cover0N.svg` (227×113). */
const FORM_COVER_BY_CATEGORY = {
  consent: '/illustration/form-cover01.svg',
  certificate: '/illustration/form-cover02.svg',
  request: '/illustration/form-cover03.svg',
  assessment: '/illustration/form-cover04.svg',
  document: '/illustration/form-cover05.svg',
};

function resolveFormCoverSrc(category, thumbSrc) {
  if (thumbSrc) return thumbSrc;
  return FORM_COVER_BY_CATEGORY[category] ?? FORM_COVER_BY_CATEGORY.document;
}

/** Design frame 227×113 → `aspect-ratio` so height tracks card width. */
const FORM_THUMB_ASPECT_RATIO = '227 / 113';

const FormThumb = ({ src, alt = '' }) => (
  <div
    className='relative w-full shrink-0 overflow-hidden bg-brand-100'
    style={{
      aspectRatio: FORM_THUMB_ASPECT_RATIO,
      borderBottom: 'var(--dim-stroke-100) solid var(--border-card-default)',
    }}
  >
    <img
      src={src}
      alt={alt}
      className='absolute inset-0 h-full w-full object-cover object-center'
      loading='lazy'
      decoding='async'
    />
  </div>
);

/** Figma FormCard: default 1px frame → hover 4px brand-200 ring + Brand Drop Shadow Bottom/200 → selected 4px brand + same drop shadow. */
function formCardFrameStyle({ selected, hovered }) {
  const brandDrop = 'var(--shadow-brand-drop-bottom-200)';
  if (selected) {
    return {
      boxShadow: `0 0 0 4px var(--border-brandPrimaryButton-default), ${brandDrop}`,
    };
  }
  if (hovered) {
    return {
      boxShadow: `0 0 0 4px var(--border-brandPrimaryButton-tertiary), ${brandDrop}`,
    };
  }
  return { boxShadow: '0 0 0 1px var(--border-card-default)' };
}

const FormCard = ({
  category = 'document',
  status = 'assessed',
  /** แสดง success “ประเมินแล้ว” เฉพาะฟอร์มที่ประเมินแล้ว (กริดเทมเพลต = false). */
  showStatusBadge = true,
  /** Optional — override category-based cover from `public/illustration/form-cover0N.svg`. */
  thumbSrc,
  thumbAlt = '',
  title,
  code,
  /** เวอร์ชันแบบฟอร์ม — แสดงเป็น ColorfulBadge magenta (Figma `161:920`). */
  version,
  isOpen,
  selected = false,
  onPreview,
  onEdit,
  /** Label for the primary action button when `!isOpen` — defaults to the
     OPD "ประเมิน" verb; Registration's consent step passes 'กรอกแบบฟอร์ม'. */
  actionLabel = 'ประเมิน',
}) => {
  const [hovered, setHovered] = useState(false);
  const cat = FORM_CATEGORIES[category] || FORM_CATEGORIES.document;
  const st = showStatusBadge ? (FORM_STATUSES[status] || FORM_STATUSES.assessed) : null;
  const coverSrc = resolveFormCoverSrc(category, thumbSrc);

  return (
    <div
      role='group'
      className='w-full h-full min-h-0 bg-surface-card rounded-xl overflow-hidden flex flex-col gap-3 pb-3 transition-[box-shadow] duration-200 ease-out'
      style={formCardFrameStyle({ selected, hovered })}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <FormThumb src={coverSrc} alt={thumbAlt} />
      <div className='flex flex-1 min-h-0 flex-col gap-1.5 px-3'>
        <div className='flex flex-wrap gap-2 items-center'>
          <ColorfulBadge
            style={cat.style}
            size='small'
            hierarchy='secondary'
            showDot={false}
            showIcon={false}
          >
            {cat.label}
          </ColorfulBadge>
          {version != null && version !== '' && (
            <ColorfulBadge
              style='magenta'
              size='small'
              hierarchy='secondary'
              showDot={false}
              showIcon={false}
            >
              {version}
            </ColorfulBadge>
          )}
          {st && (
            <StatusBadge
              style={st.style}
              size='small'
              showDot={false}
              icon={st.icon}
            >
              {st.label}
            </StatusBadge>
          )}
        </div>
        <p className='text-sm font-bold text-ink leading-snug'>{title}</p>
        {code && <p className='text-xs text-ink-tertiary'>{code}</p>}
      </div>
      <div
        className='flex shrink-0 items-center justify-end gap-2 border-t border-solid pt-4 px-3'
        style={{ borderTopColor: 'var(--border-neutral-quaternary)' }}
      >
        <BrandSubdueIconButton
          type='button'
          size='sm'
          variant='fill'
          icon='visibility'
          aria-label='ดูแบบฟอร์ม'
          onClick={onPreview}
        />
        {isOpen ? (
          <NeutralSubdueButton
            type='button'
            size='sm'
            variant='outline'
            leadingIcon='edit'
            onClick={onEdit}
          >
            แก้ไข
          </NeutralSubdueButton>
        ) : (
          <BrandButton
            type='button'
            size='sm'
            variant='outline'
            leadingIcon='edit'
            onClick={onEdit}
          >
            {actionLabel}
          </BrandButton>
        )}
      </div>
    </div>
  );
};

/** Mock เทมเพลต OPD — ชื่อและประเภทใกล้ของใช้จริง (ไม่ซ้ำในกริด). */
const TEMPLATES = [
  { category: 'certificate', title: 'ใบรับรองแพทย์สำหรับการลา/ลาป่วย',                    code: 'F-1011', version: '1.0' },
  { category: 'certificate', title: 'ใบรับรองการป่วยสำหรับประกันสังคม (สปสช.)',            code: 'F-1013', version: '1.1' },
  { category: 'consent',     title: 'ใบยินยอมรับการผ่าตัดเล็กและหัตถการ (Minor procedure)', code: 'F-1008', version: '2.0' },
  { category: 'consent',     title: 'ใบยินยอมเจาะเลือดและสายสวนหลอดเลือดดำ',              code: 'F-1009', version: '1.3' },
  { category: 'consent',     title: 'ใบยินยอมรับการถ่ายภาพรังสีวินิจฉัย (X-ray / CT / MRI)', code: 'F-1014', version: '1.2' },
  { category: 'assessment',  title: 'แบบประเมินภาวะซึมเศร้า (PHQ-9)',                       code: 'F-1021', version: '1.0' },
  { category: 'request',     title: 'ใบคำขอสำเนาเอกสารเวชระเบียนและผลตรวจ',                code: 'F-1040', version: '1.4' },
  { category: 'assessment',  title: 'แบบคัดกรองซึมเศร้า 9 ข้อ (9Q Thai)',                 code: 'F-1020', version: '3.0' },
  { category: 'assessment',  title: 'แบบประเมินความเสี่ยงตกหกล้ม (Morse Fall Scale)',     code: 'F-1029', version: '2.1' },
  { category: 'document',    title: 'แบบบันทึกประวัติแพ้ยาและอาการไม่พึงประสงค์จากยา',    code: 'F-1035', version: '1.0' },
];

const FormsLibrary = () => {
  const [consentEditOpen, setConsentEditOpen] = useState(false);

  return (
  <>
  <PersonalDataConsentEditPopup
    open={consentEditOpen}
    onClose={() => setConsentEditOpen(false)}
  />
  <section className='bg-surface-card rounded-b-card p-6 flex flex-col gap-6'>
    <div className='flex items-center gap-2 w-full'>
      <span className='text-brand-500'><Icon name='clipboard' size={20} /></span>
      <h2 className='text-base font-bold text-brand-500'>แบบฟอร์ม</h2>
    </div>

    {/* — แบบฟอร์มที่ประเมินแล้ว — */}
    <div className='flex flex-col gap-3'>
      <h3 className='text-sm font-bold text-ink'>แบบฟอร์มที่ประเมินแล้ว</h3>
      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 items-stretch'>
        <FormCard
          category='consent'
          title='เอกสาร ใบยินยอมการเข้าถึงข้อมูลส่วนบุคคลและการเข้ารับบริการทางการแพทย์'
          code='F-1012'
          version='1.2'
          isOpen
          onEdit={() => setConsentEditOpen(true)}
        />
      </div>
    </div>

    {/* — แบบฟอร์มที่ใช้บ่อย — */}
    <div className='flex flex-col'>
      <div className='flex flex-col gap-3'>
        <h3 className='text-sm font-bold text-ink'>แบบฟอร์มที่ใช้บ่อย</h3>
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 items-stretch'>
          {TEMPLATES.map((t, i) => (
            <FormCard key={i} {...t} showStatusBadge={false} />
          ))}
        </div>
      </div>
      <div className='flex items-center justify-center mt-[32px]'>
        <NeutralSubdueButton type='button' size='lg' variant='outline' trailingIcon='chevron_right'>
          ดูทั้งหมด
        </NeutralSubdueButton>
      </div>
    </div>
  </section>
  </>
  );
};

export { FormCard };
export default FormsLibrary;
