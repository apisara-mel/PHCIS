import React from 'react';
import Select from '@/components/forms/Select';
import { HistoryPillBadge } from '@/components/forms/historyPillBadges';
import {
  SEVERITY_COLORFUL_BADGE,
  LIKELIHOOD_COLORFUL_BADGE,
  TREATMENT_STATUS_COLORFUL_BADGE,
} from '@/components/badge/clinicalBadgeStyles';

/**
 * MIH Badge Select Form — Figma MIH Design System Foundation "Default Select"
 * with **Show Badge** (node 2510:7072) + PHCIS | CPOE clinical dropdowns.
 *
 * @param {'severity'|'likelihood'|'treatmentStatus'|'status'|null} badgeKind
 *   `status` is a legacy alias for `likelihood` (allergy ความน่าจะเป็น).
 */
const BadgeSelectForm = ({
  badgeKind = null,
  label,
  required = false,
  value,
  onChange,
  options = [],
  placeholder = 'เลือก',
  size = 'lg',
  disabled = false,
  error,
  className = '',
  style,
}) => {
  const listOptions = options
    .filter((o) => o.value !== '')
    .map((o) => {
      if (!o.value) return o;
      if (badgeKind === 'severity') {
        const colorfulBadgeStyle = SEVERITY_COLORFUL_BADGE[o.value];
        return colorfulBadgeStyle ? { ...o, colorfulBadgeStyle } : o;
      }
      if (badgeKind === 'likelihood' || badgeKind === 'status') {
        const colorfulBadgeStyle = LIKELIHOOD_COLORFUL_BADGE[o.value];
        return colorfulBadgeStyle ? { ...o, colorfulBadgeStyle } : o;
      }
      if (badgeKind === 'treatmentStatus') {
        const colorfulBadgeStyle = TREATMENT_STATUS_COLORFUL_BADGE[o.value];
        return colorfulBadgeStyle ? { ...o, colorfulBadgeStyle } : o;
      }
      return o;
    });
  const ph =
    placeholder || options.find((o) => o.value === '')?.label || 'เลือก';
  const showBadge = !!badgeKind && !!value;

  return (
    <Select
      className={`flex-1 min-w-0 ${className}`.trim()}
      style={{ width: '100%', ...style }}
      label={label}
      required={required}
      value={value}
      onChange={onChange}
      options={listOptions}
      placeholder={ph}
      size={size}
      disabled={disabled}
      error={error}
      showFieldName
      showLabel
      showRequired
      showHelperText={false}
      showLeadingIcon={false}
      showBadge={showBadge}
      badge={showBadge ? <HistoryPillBadge kind={badgeKind} value={value} /> : null}
    />
  );
};

export default BadgeSelectForm;
