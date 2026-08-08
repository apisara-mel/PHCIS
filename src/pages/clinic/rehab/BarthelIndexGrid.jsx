import React from 'react';
import Icon from '@/components/icons/Icon';
import Radio from '@/components/radio/Radio';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import {
  BARTHEL_ITEMS,
  BARTHEL_MAX,
  scoreBarthel,
  barthelDependency,
} from '@/data/rehabVisits';

/* BarthelIndexGrid — แบบประเมิน ADL ดัชนีบาร์เธล 10 หัวข้อ (0–100 คะแนน)
   ตามแทบ "Barthel" ของคู่มือระบบงานเวชศาสตร์ฟื้นฟูเดิม (§2.4).

   ยังไม่มีใน design system: DS มี Radio / ColorfulBadge / Table แต่ไม่มี
   ตารางให้คะแนนแบบ "หัวข้อ × ตัวเลือกคะแนน + รวมคะแนน + แปลผลระดับการ
   พึ่งพา" — จึงประกอบขึ้นในโมดูลนี้จาก primitive ของ DS ล้วน ๆ และรายงาน
   ผ่าน manifest.newComponents (playbook §4 — ห้ามแก้ awaiting-components.md
   เอง). ถ้ามีโมดูลที่สองเรียกใช้ (เช่น ผู้สูงอายุ / ADL ที่บ้าน) ค่อยยกขึ้น
   เป็น DS component จริง.

   สัญญาการใช้งาน:
     value       — { [itemKey]: number }  คะแนนที่เลือกไว้
     onChange    — (itemKey, score) => void
     readOnly    — ปิดการแก้ไขทั้งตาราง (สิทธิ์ดูอย่างเดียว)
     previousTotal / previousLabel — คะแนนครั้งก่อนเพื่อเทียบ (ไม่บังคับ)
     showIncompleteWarning — เตือนเมื่อยังให้คะแนนไม่ครบ แทนที่จะรวมเป็น 0
                             (spec edge case: partial = warning ไม่ใช่ 0 ปลอม) */

const HeaderCellText = ({ children, align = 'left' }) => (
  <span
    style={{
      fontSize: 'var(--type-size-xs)',
      fontWeight: 'var(--type-weight-bold)',
      color: 'var(--text-content-secondary)',
      textAlign: align,
    }}
  >
    {children}
  </span>
);

const BarthelIndexGrid = ({
  value = {},
  onChange,
  readOnly = false,
  previousTotal = null,
  previousLabel = 'คะแนนครั้งก่อน',
  showIncompleteWarning = true,
}) => {
  const { total, answered, complete } = scoreBarthel(value);
  const dependency = barthelDependency(complete ? total : null);
  const delta = complete && previousTotal != null ? total - previousTotal : null;

  return (
    <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
      {/* ตารางให้คะแนน — 1 แถวต่อ 1 หัวข้อ, ตัวเลือกเรียงตามคะแนนน้อย→มาก */}
      <div
        className='flex flex-col w-full overflow-x-auto'
        style={{
          borderRadius: 'var(--dim-radius-300)',
          border: 'var(--dim-stroke-100) solid var(--border-card-default)',
          background: 'var(--surface-card-100)',
        }}
      >
        <div
          className='flex items-center w-full'
          style={{
            gap: 'var(--dim-space-300)',
            paddingTop: 'var(--dim-space-200)',
            paddingBottom: 'var(--dim-space-200)',
            paddingLeft: 'var(--dim-space-400)',
            paddingRight: 'var(--dim-space-400)',
            borderBottom: 'var(--dim-stroke-100) solid var(--border-card-default)',
            background: 'var(--surface-neutral-quaternary)',
          }}
        >
          <span style={{ minWidth: 'var(--dim-size-2450, 280px)', flex: 1 }}>
            <HeaderCellText>หัวข้อกิจวัตรประจำวัน</HeaderCellText>
          </span>
          <span style={{ minWidth: 'var(--dim-size-2500, 320px)', flex: 2 }}>
            <HeaderCellText>ระดับความสามารถ (เลือก 1 ข้อ)</HeaderCellText>
          </span>
          <span style={{ width: 'var(--dim-size-1600, 72px)', textAlign: 'right' }}>
            <HeaderCellText align='right'>คะแนน</HeaderCellText>
          </span>
        </div>

        {BARTHEL_ITEMS.map((item, idx) => {
          const selected = value[item.key];
          const isAnswered = typeof selected === 'number';
          return (
            <div
              key={item.key}
              className='flex items-start w-full flex-wrap'
              style={{
                gap: 'var(--dim-space-300)',
                paddingTop: 'var(--dim-space-300)',
                paddingBottom: 'var(--dim-space-300)',
                paddingLeft: 'var(--dim-space-400)',
                paddingRight: 'var(--dim-space-400)',
                borderBottom: idx === BARTHEL_ITEMS.length - 1
                  ? 'none'
                  : 'var(--dim-stroke-100) solid var(--border-neutral-quaternary)',
                background: isAnswered ? 'var(--surface-card-100)' : 'var(--surface-alert-warning, #FFF9F0)',
              }}
            >
              <span
                className='flex flex-col'
                style={{ minWidth: 'var(--dim-size-2450, 280px)', flex: 1, gap: 'var(--dim-space-050)' }}
              >
                <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-default)' }}>
                  {idx + 1}. {item.label}
                </span>
                {!isAnswered && (
                  <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-warning-default, #C2410C)' }}>
                    ยังไม่ได้ให้คะแนนหัวข้อนี้
                  </span>
                )}
              </span>

              <span
                className='flex flex-col'
                style={{ minWidth: 'var(--dim-size-2500, 320px)', flex: 2, gap: 'var(--dim-space-150)' }}
              >
                {item.options.map((opt) => (
                  <Radio
                    key={`${item.key}-${opt.score}`}
                    name={`barthel-${item.key}`}
                    value={opt.score}
                    checked={selected === opt.score}
                    disabled={readOnly}
                    onChange={() => onChange?.(item.key, opt.score)}
                    label={`${opt.score} — ${opt.label}`}
                  />
                ))}
              </span>

              <span
                style={{
                  width: 'var(--dim-size-1600, 72px)',
                  textAlign: 'right',
                  fontSize: 'var(--type-size-sm)',
                  fontWeight: 'var(--type-weight-bold)',
                  color: isAnswered ? 'var(--text-content-default)' : 'var(--text-content-tertiary)',
                }}
              >
                {isAnswered ? selected : '—'}
              </span>
            </div>
          );
        })}
      </div>

      {/* สรุปคะแนน — ยังไม่ครบ = ไม่แสดงคะแนนรวม (ไม่สร้างเลข 0 ปลอม) */}
      <div
        className='flex items-center w-full flex-wrap'
        style={{
          gap: 'var(--dim-space-300)',
          paddingTop: 'var(--dim-space-400)',
          paddingBottom: 'var(--dim-space-400)',
          paddingLeft: 'var(--dim-space-400)',
          paddingRight: 'var(--dim-space-400)',
          borderRadius: 'var(--dim-radius-300)',
          border: `var(--dim-stroke-100) solid ${complete
            ? 'var(--border-brandPrimary-quaternary)'
            : 'var(--border-neutral-tertiary, #C6CACD)'}`,
          background: complete
            ? 'var(--surface-brandPrimary-quaternary, #F4FBF8)'
            : 'var(--surface-neutral-quaternary)',
        }}
      >
        <Icon name={complete ? 'assignment_turned_in' : 'assignment_late'} size={20} />
        {complete ? (
          <>
            <span style={{ fontSize: 'var(--type-size-lg)', fontWeight: 'var(--type-weight-bold)', color: 'var(--text-content-default)' }}>
              คะแนนรวม {total} / {BARTHEL_MAX}
            </span>
            <ColorfulBadge style={dependency.badge} size='small' hierarchy='secondary'>
              {dependency.label}
            </ColorfulBadge>
            {previousTotal != null && (
              <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary)' }}>
                {previousLabel} {previousTotal} คะแนน
                {delta != null && (
                  <span
                    style={{
                      marginLeft: 'var(--dim-space-100)',
                      fontWeight: 'var(--type-weight-medium)',
                      color: delta > 0
                        ? 'var(--text-brandPrimary-default, #007549)'
                        : delta < 0
                          ? 'var(--text-danger-default, #C72121)'
                          : 'var(--text-content-tertiary)',
                    }}
                  >
                    {delta > 0 ? `· ดีขึ้น ${delta} คะแนน` : delta < 0 ? `· ลดลง ${Math.abs(delta)} คะแนน` : '· ไม่เปลี่ยนแปลง'}
                  </span>
                )}
              </span>
            )}
          </>
        ) : (
          <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary)' }}>
            ให้คะแนนแล้ว {answered} จาก {BARTHEL_ITEMS.length} หัวข้อ —
            {showIncompleteWarning
              ? ' ระบบจะยังไม่คำนวณคะแนนรวมจนกว่าจะให้คะแนนครบทุกหัวข้อ (ป้องกันการแปลผลผิดจากคะแนนที่ยังไม่กรอก)'
              : ' ให้คะแนนให้ครบเพื่อคำนวณคะแนนรวม'}
          </span>
        )}
      </div>
    </div>
  );
};

export default BarthelIndexGrid;
