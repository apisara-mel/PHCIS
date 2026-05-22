/* PHCIS | CPOE — clinical ColorfulBadge style maps (system-wide).
 *
 * Severity      · Figma dropdown 245:24395
 * Likelihood    · Figma dropdown 245:24530  (allergy · ความน่าจะเป็น)
 * Treatment     · Figma dropdown 245:24603  (disease · สถานะการรักษา)
 *
 * Each entry resolves to a ColorfulBadge `style` prop (secondary hierarchy).
 * Tokens: `--surface-colorfulbadge-{style}` + `--text-colorfulbadge-{style}`.
 */

/** @typedef {'severity'|'likelihood'|'treatmentStatus'} ClinicalBadgeKind */

export const SEVERITY_COLORFUL_BADGE = {
  critical: 'red',
  high:     'orange',
  medium:   'blue',
  low:      'teal',
  mild:     'yellow',
};

export const LIKELIHOOD_COLORFUL_BADGE = {
  definite:  'teal',
  probable:  'blue',
  possible:  'indigo',
  unlikely:  'purple',
};

export const TREATMENT_STATUS_COLORFUL_BADGE = {
  untreated:     'grey',
  chronic:       'red',
  inTreatment:   'orange',
  controlled:    'indigo',
  remission:     'blue',
  resolved:      'teal',
  /* Legacy / MR keys → same palette */
  new:           'grey',
  ongoing:       'orange',
  inactive:      'grey',
};

const SEVERITY_LABEL = {
  วิกฤต:     'red',
  รุนแรง:     'orange',
  ปานกลาง:   'blue',
  เล็กน้อย:   'teal',
  น้อย:       'yellow',
  มาก:       'orange', /* legacy mock */
};

const LIKELIHOOD_LABEL = {
  แน่นอน:       'teal',
  'น่าจะใช่':     'blue',
  'น่าจะเป็น':    'blue',
  'เป็นไปได้':    'indigo',
  สงสัย:         'purple',
};

const TREATMENT_STATUS_LABEL = {
  'ไม่ได้รักษา':           'grey',
  'เรื้อรังไม่หาย':         'red',
  'อยู่ระหว่างการรักษา':    'orange',
  'ควบคุมได้':              'indigo',
  'สงบ/หายดีชั่วคราว':      'blue',
  'หายแล้ว':                'teal',
  /* Legacy Thai labels */
  'ใหม่':                   'grey',
  'รักษาอยู่':              'orange',
  'หายดี':                  'teal',
  'หยุด':                   'grey',
};

const VALUE_LABEL = {
  severity: {
    critical: 'วิกฤต',
    high:     'รุนแรง',
    medium:   'ปานกลาง',
    low:      'เล็กน้อย',
    mild:     'น้อย',
  },
  likelihood: {
    definite:  'แน่นอน',
    probable:  'น่าจะใช่',
    possible:  'เป็นไปได้',
    unlikely:  'สงสัย',
  },
  treatmentStatus: {
    untreated:   'ไม่ได้รักษา',
    chronic:     'เรื้อรังไม่หาย',
    inTreatment: 'อยู่ระหว่างการรักษา',
    controlled:  'ควบคุมได้',
    remission:   'สงบ/หายดีชั่วคราว',
    resolved:    'หายแล้ว',
    new:         'ใหม่',
    ongoing:     'รักษาอยู่',
    inactive:    'หยุด',
  },
};

const MAP_BY_KIND = {
  severity:        SEVERITY_COLORFUL_BADGE,
  likelihood:      LIKELIHOOD_COLORFUL_BADGE,
  treatmentStatus: TREATMENT_STATUS_COLORFUL_BADGE,
  /** @deprecated use `likelihood` — allergy ความน่าจะเป็น */
  status:          LIKELIHOOD_COLORFUL_BADGE,
};

const LABEL_BY_KIND = {
  severity:        SEVERITY_LABEL,
  likelihood:      LIKELIHOOD_LABEL,
  treatmentStatus: TREATMENT_STATUS_LABEL,
  status:          LIKELIHOOD_LABEL,
};

/**
 * @param {ClinicalBadgeKind|'status'} kind
 * @param {string} valueOrLabel — option `value` or Thai `label`
 * @returns {import('@/components/badge/ColorfulBadge').default extends React.ComponentType<infer P> ? P['style'] : string}
 */
export const resolveClinicalBadgeStyle = (kind, valueOrLabel) => {
  if (!valueOrLabel) return 'grey';
  const key = String(valueOrLabel).trim();
  const byValue = MAP_BY_KIND[kind]?.[key];
  if (byValue) return byValue;
  const byLabel = LABEL_BY_KIND[kind]?.[key];
  if (byLabel) return byLabel;
  return 'grey';
};

/** @param {ClinicalBadgeKind|'status'} kind */
export const getClinicalBadgeLabel = (kind, valueOrLabel) => {
  if (!valueOrLabel) return '';
  const key = String(valueOrLabel).trim();
  const labels = VALUE_LABEL[kind];
  if (labels?.[key]) return labels[key];
  if (LABEL_BY_KIND[kind]?.[key] || MAP_BY_KIND[kind]?.[key]) return key;
  return key;
};

export const resolveSeverityBadgeStyle = (valueOrLabel) =>
  resolveClinicalBadgeStyle('severity', valueOrLabel);

export const resolveLikelihoodBadgeStyle = (valueOrLabel) =>
  resolveClinicalBadgeStyle('likelihood', valueOrLabel);

export const resolveTreatmentStatusBadgeStyle = (valueOrLabel) =>
  resolveClinicalBadgeStyle('treatmentStatus', valueOrLabel);
