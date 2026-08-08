import React, { useEffect, useMemo, useState } from 'react';
import Icon from '@/components/icons/Icon';
import InputField from '@/components/forms/InputField';
import Popup from '@/components/popup/Popup';
import FilterTag from '@/components/forms/FilterTag';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import BrandPrimaryButton from '@/components/button/BrandPrimaryButton';
import { CLAIM_ROLES, subscribeRightsClaim, NO_PERMISSION_HINT } from '@/data/rightsClaimStore';

/* Shared presentational pieces for the §1.7 สิทธิและการเบิกจ่าย module.
   Nothing here is a new design-system component — each one is a thin
   composition of existing DS parts (Icon / InputField / Popup / FilterTag /
   ColorfulBadge / buttons) plus token-only styling, kept in one file so the
   five sections + the detail page stay visually identical.

   The two pieces worth calling out to the integrator are `LookupPopup`
   (the HCIS "พิมพ์ 1-2 ตัวกรอง → เลือกแถว → ตกลง" dialog from
   คู่มือระบบงานห้องเงิน, which the DS has no equivalent for) and
   `RoleSwitcher` (a prototype-only stand-in for §1.17 permissions). */

/* ── text styles ─────────────────────────────────────────────── */

export const T = {
  label: {
    fontFamily: 'var(--type-family-body)',
    fontSize: 'var(--type-size-xs, 12px)',
    fontWeight: 'var(--type-weight-regular, 400)',
    color: 'var(--text-content-tertiary, #858C92)',
    lineHeight: 1.5,
  },
  value: {
    fontFamily: 'var(--type-family-body)',
    fontSize: 'var(--type-size-sm, 14px)',
    fontWeight: 'var(--type-weight-medium, 500)',
    color: 'var(--text-content-default, #363B3F)',
    lineHeight: 1.5,
  },
  body: {
    fontFamily: 'var(--type-family-body)',
    fontSize: 'var(--type-size-sm, 14px)',
    fontWeight: 'var(--type-weight-regular, 400)',
    color: 'var(--text-content-secondary, #636B72)',
    lineHeight: 1.5,
  },
  muted: {
    fontFamily: 'var(--type-family-body)',
    fontSize: 'var(--type-size-xs, 12px)',
    fontWeight: 'var(--type-weight-regular, 400)',
    color: 'var(--text-content-tertiary, #858C92)',
    lineHeight: 1.5,
  },
  heading: {
    fontFamily: 'var(--type-family-heading-content)',
    fontSize: 'var(--type-size-base, 16px)',
    fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
    color: 'var(--text-content-default, #363B3F)',
    lineHeight: 1.5,
  },
  metric: {
    fontFamily: 'var(--type-family-body)',
    fontSize: 'var(--type-size-lg, 18px)',
    fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
    color: 'var(--text-content-default, #363B3F)',
    lineHeight: 1.4,
  },
};

/** Re-render on any store mutation (module-level mutable arrays + listeners,
    same approach as PharmacyRegistryPage's `subscribeRegistry` tick). */
export const useRightsClaimTick = () => {
  const [tick, setTick] = useState(0);
  useEffect(() => subscribeRightsClaim(() => setTick((t) => t + 1)), []);
  return tick;
};

/* ── layout blocks ───────────────────────────────────────────── */

export const SectionCard = ({ title, subtitle, icon, actions, children, tone = 'default' }) => (
  <section
    className='flex flex-col w-full min-w-0'
    style={{
      gap: 'var(--dim-space-400)',
      borderRadius: 'var(--dim-radius-400, 12px)',
      border: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary)',
      background: tone === 'muted' ? 'var(--surface-neutral-quaternary, #F9FBFB)' : 'var(--surface-card-100, #FFFFFF)',
      paddingTop: 'var(--dim-space-400)',
      paddingRight: 'var(--dim-space-400)',
      paddingBottom: 'var(--dim-space-400)',
      paddingLeft: 'var(--dim-space-400)',
    }}
  >
    {(title || actions) && (
      <div className='flex items-start justify-between w-full' style={{ gap: 'var(--dim-space-300)' }}>
        <div className='flex items-start min-w-0' style={{ gap: 'var(--dim-space-200)' }}>
          {icon && (
            <span
              className='inline-flex items-center justify-center shrink-0'
              style={{
                width: 'var(--dim-size-700, 36px)',
                height: 'var(--dim-size-700, 36px)',
                borderRadius: 'var(--dim-radius-200, 8px)',
                background: 'var(--surface-brandPrimary-quaternary)',
                color: 'var(--text-brandPrimary-default)',
              }}
            >
              <Icon name={icon} size={18} />
            </span>
          )}
          <div className='flex flex-col min-w-0'>
            {title && <span style={T.heading}>{title}</span>}
            {subtitle && <span style={T.muted}>{subtitle}</span>}
          </div>
        </div>
        {actions && (
          <div className='flex items-center flex-wrap shrink-0 justify-end' style={{ gap: 'var(--dim-space-200)' }}>
            {actions}
          </div>
        )}
      </div>
    )}
    {children}
  </section>
);

export const ReadField = ({ label, value, tone, wide = false }) => (
  <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-050, 2px)', gridColumn: wide ? '1 / -1' : undefined }}>
    <span style={T.label}>{label}</span>
    <span style={tone ? { ...T.value, color: tone } : T.value}>{value == null || value === '' ? '-' : value}</span>
  </div>
);

export const FieldGrid = ({ children, cols = 3 }) => (
  <div
    className='grid w-full'
    style={{
      gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
      gap: 'var(--dim-space-300) var(--dim-space-400)',
    }}
  >
    {children}
  </div>
);

/** Audit trail line — "บันทึกโดย … · เวลา …" under every saveable block. */
export const AuditNote = ({ by, at, action, detail, prefix = 'บันทึกโดย' }) => {
  if (!by && !at) return null;
  return (
    <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-150)' }}>
      <Icon name='history' size={14} />
      <span style={T.muted}>
        {action ? `${action} · ` : ''}{prefix} {by || '-'}{at ? ` · ${at}` : ''}{detail ? ` · ${detail}` : ''}
      </span>
    </div>
  );
};

export const AuditList = ({ entries = [], emptyText = 'ยังไม่มีประวัติการแก้ไข' }) => {
  if (!entries.length) return <span style={T.muted}>{emptyText}</span>;
  return (
    <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-150)' }}>
      {entries.map((e) => (
        <div key={e.id} className='flex items-start' style={{ gap: 'var(--dim-space-200)' }}>
          <span style={{ color: 'var(--icon-neutral-tertiary, #ADB2B7)', display: 'inline-flex', paddingTop: 'var(--dim-space-050, 2px)' }}>
            <Icon name='check_small' size={14} />
          </span>
          <span style={T.muted}>
            <strong style={{ fontWeight: 'var(--type-weight-medium, 500)', color: 'var(--text-content-secondary, #636B72)' }}>{e.action}</strong>
            {e.detail ? ` — ${e.detail}` : ''} · {e.by || '-'} · {e.at}
          </span>
        </div>
      ))}
    </div>
  );
};

export const EmptyState = ({ icon = 'search_off', title, subtext }) => (
  <div
    className='flex flex-col items-center text-center w-full'
    style={{
      gap: 'var(--dim-space-200)',
      paddingTop: 'var(--dim-space-800)',
      paddingBottom: 'var(--dim-space-800)',
      paddingLeft: 'var(--dim-space-400)',
      paddingRight: 'var(--dim-space-400)',
    }}
  >
    <span style={{ color: 'var(--icon-neutral-tertiary, #ADB2B7)', display: 'inline-flex' }}>
      <Icon name={icon} size={32} />
    </span>
    <span style={T.value}>{title}</span>
    {subtext && <span style={T.muted}>{subtext}</span>}
  </div>
);

/** Small labelled metric — used in the claim section's roll-up strip and in
    the cycle table footer (§1.7.4.9 แถวรวมยอด). */
export const MetricTile = ({ label, value, hint, tone }) => (
  <div
    className='flex flex-col min-w-0'
    style={{
      gap: 'var(--dim-space-050, 2px)',
      borderRadius: 'var(--dim-radius-300, 10px)',
      border: 'var(--dim-stroke-100, 1px) solid var(--border-card-default, #E2E4E6)',
      background: 'var(--surface-card-100, #FFFFFF)',
      paddingTop: 'var(--dim-space-300)',
      paddingRight: 'var(--dim-space-300)',
      paddingBottom: 'var(--dim-space-300)',
      paddingLeft: 'var(--dim-space-300)',
    }}
  >
    <span style={T.label}>{label}</span>
    <span style={tone ? { ...T.metric, color: tone } : T.metric}>{value}</span>
    {hint && <span style={T.muted}>{hint}</span>}
  </div>
);

/* ── role switcher (prototype stand-in for §1.17 permissions) ─── */

export const RoleSwitcher = ({ value, onChange }) => (
  <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
    <span style={T.muted}>สิทธิผู้ใช้งาน (ตัวอย่าง):</span>
    {CLAIM_ROLES.map((r) => (
      <FilterTag
        key={r.key}
        leadingIcon={r.canConfirm ? 'verified_user' : 'visibility'}
        selected={value === r.key}
        onClick={() => onChange(r.key)}
        value={r.label}
      />
    ))}
  </div>
);

/** Disabled control + reason, so "สิทธิไม่พอ" is explained rather than silent. */
export const PermissionHint = ({ show, text = NO_PERMISSION_HINT }) => {
  if (!show) return null;
  return (
    <div className='flex items-center' style={{ gap: 'var(--dim-space-150)' }}>
      <span style={{ color: 'var(--text-statusbadge-warning, #C2410C)', display: 'inline-flex' }}>
        <Icon name='lock' size={14} />
      </span>
      <span style={{ ...T.muted, color: 'var(--text-statusbadge-warning, #C2410C)' }}>{text}</span>
    </div>
  );
};

/* ── HCIS-style lookup dialog ─────────────────────────────────── */

/* คู่มือระบบงานห้องเงิน's lookup pattern: the operator types one or two
   characters of the code or the name, the list narrows live, they pick a
   row, then confirm with ตกลง (nothing is committed on row-click alone, so
   ยกเลิก truly discards). Used for รหัสสถานพยาบาล (§1.7.2.4) and
   หน่วยงานต้นสังกัด (§1.7.4.7). */
export const LookupPopup = ({
  open,
  onClose,
  onConfirm,
  title,
  subtitle,
  rows,
  value,
  getKey = (r) => r.code,
  getPrimary = (r) => r.name,
  getSecondary = (r) => r.province,
  searchPlaceholder = 'พิมพ์รหัส 1-2 ตัว หรือชื่อบางส่วน',
  allowClear = false,
}) => {
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState(value ?? null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setPicked(value ?? null);
    }
  }, [open, value]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => [getKey(r), getPrimary(r), getSecondary(r)]
      .some((f) => f && String(f).toLowerCase().includes(q)));
  }, [rows, query, getKey, getPrimary, getSecondary]);

  if (!open) return null;

  return (
    <Popup
      open
      onClose={onClose}
      size='large'
      title={title}
      subtitle={subtitle}
      footer={(
        <div className='w-full flex items-center justify-between'>
          <div>
            {allowClear && (
              <NeutralSubdueButton size='sm' variant='outline' onClick={() => { onConfirm(null); onClose(); }}>
                ล้างค่า
              </NeutralSubdueButton>
            )}
          </div>
          <div className='flex items-center' style={{ gap: 'var(--dim-space-300)' }}>
            <NeutralSubdueButton size='md' onClick={onClose}>ยกเลิก</NeutralSubdueButton>
            <BrandPrimaryButton size='md' disabled={!picked} onClick={() => { onConfirm(picked); onClose(); }}>
              ตกลง
            </BrandPrimaryButton>
          </div>
        </div>
      )}
    >
      <div className='flex flex-col' style={{ gap: 'var(--dim-space-300)' }}>
        <InputField
          label='ค้นหา'
          leadingIcon='search'
          placeholder={searchPlaceholder}
          value={query}
          onChange={setQuery}
          showHelperText={false}
        />
        <div
          className='flex flex-col w-full overflow-y-auto'
          style={{
            gap: 'var(--dim-space-100)',
            maxHeight: 320,
            borderRadius: 'var(--dim-radius-300, 10px)',
            border: 'var(--dim-stroke-100, 1px) solid var(--border-card-default, #E2E4E6)',
            paddingTop: 'var(--dim-space-150)',
            paddingRight: 'var(--dim-space-150)',
            paddingBottom: 'var(--dim-space-150)',
            paddingLeft: 'var(--dim-space-150)',
          }}
        >
          {filtered.length === 0 ? (
            <EmptyState icon='search_off' title='ไม่พบรายการที่ตรงกับคำค้น' subtext='ลองพิมพ์รหัสหรือชื่อให้สั้นลง' />
          ) : filtered.map((r) => {
            const k = getKey(r);
            const selected = picked === k;
            return (
              <button
                key={k}
                type='button'
                onClick={() => setPicked(k)}
                onDoubleClick={() => { onConfirm(k); onClose(); }}
                className='flex items-center w-full text-left'
                style={{
                  gap: 'var(--dim-space-300)',
                  borderRadius: 'var(--dim-radius-200, 8px)',
                  border: selected
                    ? 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-default)'
                    : 'var(--dim-stroke-100, 1px) solid transparent',
                  background: selected ? 'var(--surface-brandPrimary-quaternary)' : 'var(--surface-card-100, #FFFFFF)',
                  paddingTop: 'var(--dim-space-200)',
                  paddingRight: 'var(--dim-space-300)',
                  paddingBottom: 'var(--dim-space-200)',
                  paddingLeft: 'var(--dim-space-300)',
                  cursor: 'pointer',
                }}
              >
                <ColorfulBadge badgeStyle={selected ? 'green' : 'grey'} size='small'>{k}</ColorfulBadge>
                <span className='flex flex-col min-w-0 flex-1'>
                  <span style={T.value}>{getPrimary(r)}</span>
                  {getSecondary(r) && <span style={T.muted}>{getSecondary(r)}</span>}
                </span>
                {selected && (
                  <span style={{ color: 'var(--text-brandPrimary-default)', display: 'inline-flex' }}>
                    <Icon name='check_circle' size={18} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <span style={T.muted}>เลือกแถวแล้วกด “ตกลง” เพื่อบันทึก (ดับเบิลคลิกที่แถวเพื่อเลือกและตกลงทันที)</span>
      </div>
    </Popup>
  );
};

/** Confirm-discard dialog used by every dirty form (§5 ยกเลิก/แก้ไข). */
export const DiscardChangesPopup = ({ open, onClose, onDiscard, message }) => (
  <Popup
    open={open}
    onClose={onClose}
    title='ทิ้งการแก้ไขที่ยังไม่บันทึก?'
    subtitle={message || 'ข้อมูลที่แก้ไว้จะหายไปและกลับไปใช้ค่าที่บันทึกไว้ล่าสุด'}
    primaryAction={{ label: 'ทิ้งการแก้ไข', onClick: () => { onDiscard(); onClose(); } }}
    secondaryAction={{ label: 'กลับไปแก้ต่อ', onClick: onClose }}
  />
);

/** Reason-required confirm dialog (ยกเลิกการยืนยัน / ขอแก้ไข). */
export const ReasonPopup = ({
  open,
  onClose,
  onConfirm,
  title,
  subtitle,
  label = 'เหตุผล',
  placeholder = 'ระบุเหตุผล',
  confirmLabel = 'ยืนยัน',
  presets = [],
}) => {
  const [reason, setReason] = useState('');
  useEffect(() => { if (open) setReason(''); }, [open]);
  if (!open) return null;
  return (
    <Popup
      open
      onClose={onClose}
      size='large'
      title={title}
      subtitle={subtitle}
      primaryAction={{
        label: confirmLabel,
        disabled: reason.trim().length < 3,
        onClick: () => { onConfirm(reason.trim()); onClose(); },
      }}
      secondaryAction={{ label: 'ยกเลิก', onClick: onClose }}
    >
      <div className='flex flex-col' style={{ gap: 'var(--dim-space-300)' }}>
        {presets.length > 0 && (
          <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
            {presets.map((p) => (
              <FilterTag key={p} selected={reason === p} onClick={() => setReason(p)} value={p} />
            ))}
          </div>
        )}
        <InputField
          label={label}
          required
          placeholder={placeholder}
          value={reason}
          onChange={setReason}
          error={reason.length > 0 && reason.trim().length < 3 ? 'ระบุเหตุผลอย่างน้อย 3 ตัวอักษร' : undefined}
          helperText='บันทึกลงประวัติการแก้ไขพร้อมชื่อผู้ทำรายการและเวลา'
        />
      </div>
    </Popup>
  );
};

export default SectionCard;
