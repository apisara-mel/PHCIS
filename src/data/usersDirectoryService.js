/* TOR §1.17.1.1 — Directory Service (OIDC / SAML 2.0) ของสถานพยาบาล.

   ⚠️ ข้อจำกัดที่ประกาศบนหน้าจอด้วย: ทั้งไฟล์นี้เป็น **mock ฝั่ง client**
   — ไม่มีการยิงไปยัง IdP จริง, ไม่มี discovery จริง, ไม่มีการแลก token.
   config เก็บใน localStorage และการเข้าสู่ระบบจริงยังเป็น mock auth ที่
   /login. ใช้เพื่อออกแบบ/ตรวจรับหน้าจอการตั้งค่า + attribute mapping
   ตามที่ TOR กำหนด. */

import { USER_ATTRIBUTES } from '@/data/usersAccess';

const STORAGE_KEY = 'mih:idp-config';

export const PROTOCOLS = [
  {
    key: 'oidc',
    label: 'OpenID Connect (OIDC)',
    icon: 'hub',
    desc: 'มาตรฐานบน OAuth 2.0 — เหมาะกับ IdP สมัยใหม่ (Azure AD / Keycloak / Google Workspace) ใช้ Discovery URL ดึง endpoint อัตโนมัติ',
  },
  {
    key: 'saml',
    label: 'SAML 2.0',
    icon: 'assignment_ind',
    desc: 'มาตรฐาน XML assertion — เหมาะกับ IdP เดิมของหน่วยงานราชการ (ADFS / Shibboleth) ใช้ metadata XML + ใบรับรอง X.509',
  },
];

export const OIDC_SCOPES = ['openid', 'profile', 'email', 'groups', 'phone', 'offline_access'];

export const NAMEID_FORMATS = [
  { value: 'emailAddress', label: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress' },
  { value: 'persistent',   label: 'urn:oasis:names:tc:SAML:2.0:nameid-format:persistent' },
  { value: 'transient',    label: 'urn:oasis:names:tc:SAML:2.0:nameid-format:transient' },
  { value: 'unspecified',  label: 'urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified' },
];

export const TRANSFORMS = [
  { value: 'none',      label: 'ไม่แปลงค่า' },
  { value: 'lowercase', label: 'แปลงเป็นตัวพิมพ์เล็ก' },
  { value: 'uppercase', label: 'แปลงเป็นตัวพิมพ์ใหญ่' },
  { value: 'trim',      label: 'ตัดช่องว่างหัว-ท้าย' },
];

/** Redirect URI ฝั่ง PHCIS — อ่านอย่างเดียว (คัดลอกไปวางที่ IdP). */
export const SP_REDIRECT_URI = 'https://phcis.bma.go.th/auth/oidc/callback';
export const SP_ENTITY_ID    = 'https://phcis.bma.go.th/sp/metadata';
export const SP_ACS_URL      = 'https://phcis.bma.go.th/auth/saml/acs';

/** ค่าเริ่มต้น — กรอกไว้ให้เห็นภาพว่าหน้าจอกรอกอะไรบ้าง (mock ทั้งชุด). */
export const DEFAULT_CONFIG = {
  protocol: 'oidc',
  enabled: false,
  oidc: {
    providerName: 'สำนักอนามัย SSO (Keycloak)',
    discoveryUrl: 'https://sso.bangkok.go.th/realms/anamai/.well-known/openid-configuration',
    issuer: 'https://sso.bangkok.go.th/realms/anamai',
    clientId: 'phcis-web',
    clientSecret: 'mock-secret-do-not-use',
    authorizationEndpoint: 'https://sso.bangkok.go.th/realms/anamai/protocol/openid-connect/auth',
    tokenEndpoint: 'https://sso.bangkok.go.th/realms/anamai/protocol/openid-connect/token',
    userinfoEndpoint: 'https://sso.bangkok.go.th/realms/anamai/protocol/openid-connect/userinfo',
    jwksUri: 'https://sso.bangkok.go.th/realms/anamai/protocol/openid-connect/certs',
    scopes: ['openid', 'profile', 'email', 'groups'],
  },
  saml: {
    providerName: 'สำนักอนามัย ADFS',
    entityId: 'https://adfs.bangkok.go.th/adfs/services/trust',
    ssoUrl: 'https://adfs.bangkok.go.th/adfs/ls/',
    sloUrl: 'https://adfs.bangkok.go.th/adfs/ls/?wa=wsignout1.0',
    nameIdFormat: 'emailAddress',
    metadataFile: 'anamai-adfs-metadata.xml',
    certificateFile: 'anamai-adfs-signing.cer',
    certificateExpiry: '2026-10-18',
  },
  attributeMap: null,   /* null → ใช้ DEFAULT_ATTRIBUTE_MAP */
  groupMap: null,       /* null → ใช้ DEFAULT_GROUP_MAP */
  autoProvision: true,
  deactivateOnRemoval: true,
  syncIntervalHours: 6,
};

/** ตาราง Attribute Mapping ตั้งต้น — ครบ 8 attribute ที่ TOR บังคับ. */
export const DEFAULT_ATTRIBUTE_MAP = [
  { id: 'am-1', claim: 'title',            target: 'title',          required: true,  transform: 'trim' },
  { id: 'am-2', claim: 'given_name',       target: 'givenName',      required: true,  transform: 'trim' },
  { id: 'am-3', claim: 'family_name',      target: 'lastName',       required: true,  transform: 'trim' },
  { id: 'am-4', claim: 'email',            target: 'email',          required: true,  transform: 'lowercase' },
  { id: 'am-5', claim: 'department',       target: 'department',     required: true,  transform: 'trim' },
  { id: 'am-6', claim: 'departmentNumber', target: 'departmentCode', required: true,  transform: 'uppercase' },
  { id: 'am-7', claim: 'licenseNumber',    target: 'licenseNo',      required: false, transform: 'trim' },
  { id: 'am-8', claim: '',                 target: 'active',         required: true,  transform: 'none' },
];

/** Group (ฝั่ง IdP) → บทบาท/บทบาทย่อยของ PHCIS — ต่อยอด 1.17.1.2. */
export const DEFAULT_GROUP_MAP = [
  { id: 'gm-1', group: 'CN=PHCIS-Doctors,OU=Groups',     role: 'doctor',     subRole: 'gp',         note: 'แพทย์ OPD ทุกศูนย์' },
  { id: 'gm-2', group: 'CN=PHCIS-Nurses,OU=Groups',      role: 'nurse',      subRole: 'opd-nurse',  note: 'พยาบาลผู้ป่วยนอก' },
  { id: 'gm-3', group: 'CN=PHCIS-Pharmacists,OU=Groups', role: 'pharmacist', subRole: 'dispenser',  note: 'เภสัชกรจ่ายยา' },
  { id: 'gm-4', group: 'CN=PHCIS-Registrars,OU=Groups',  role: 'registrar',  subRole: 'reception',  note: 'เจ้าหน้าที่เวชระเบียน' },
  { id: 'gm-5', group: 'CN=PHCIS-Admins,OU=Groups',      role: 'admin',      subRole: 'sys-admin',  note: 'ผู้ดูแลระบบระดับสำนัก' },
];

/** ประวัติการ sync ย้อนหลัง (mock — เทียบเท่าหน้าต่าง "ประวัติการบันทึก" ของคู่มือ MIS หน้า 1-9). */
export const SYNC_HISTORY = [
  { id: 'sy-5', at: '3 ส.ค. 2569 06:00', by: 'ระบบอัตโนมัติ', total: 148, created: 2, updated: 11, deactivated: 1, failed: 0, status: 'success' },
  { id: 'sy-4', at: '2 ส.ค. 2569 06:00', by: 'ระบบอัตโนมัติ', total: 147, created: 0, updated: 6,  deactivated: 0, failed: 3, status: 'partial' },
  { id: 'sy-3', at: '1 ส.ค. 2569 18:22', by: 'นายวรพล รัศมีพร', total: 147, created: 1, updated: 4, deactivated: 0, failed: 0, status: 'success' },
  { id: 'sy-2', at: '1 ส.ค. 2569 06:00', by: 'ระบบอัตโนมัติ', total: 146, created: 0, updated: 2,  deactivated: 2, failed: 0, status: 'success' },
  { id: 'sy-1', at: '31 ก.ค. 2569 06:00', by: 'ระบบอัตโนมัติ', total: 146, created: 0, updated: 0, deactivated: 0, failed: 12, status: 'failed' },
];

/** รายการที่ sync ไม่ผ่านของรอบ "partial" — ดาวน์โหลดเป็น CSV ได้จากหน้าจอ. */
export const SYNC_FAILURES = [
  { account: 'somchai.k@bangkok.go.th', reason: 'ไม่มี claim "departmentNumber" — แม็ป Department-Code ไม่ได้' },
  { account: 'ratree.w@bangkok.go.th',  reason: 'อีเมลซ้ำกับบัญชี local ที่มีอยู่แล้ว (ratree.w@phcis.bma.go.th)' },
  { account: 'nopporn.t@bangkok.go.th', reason: 'group ที่ส่งมาไม่ตรงกับ Group Mapping ใด — ไม่ทราบบทบาท' },
];

/* ── persistence (mock) ────────────────────────────────────────────────── */

const deepClone = (o) => JSON.parse(JSON.stringify(o));

export function readIdpConfig() {
  let stored = null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    stored = raw ? JSON.parse(raw) : null;
  } catch { stored = null; }
  const base = deepClone(DEFAULT_CONFIG);
  const merged = stored ? { ...base, ...stored, oidc: { ...base.oidc, ...(stored.oidc || {}) }, saml: { ...base.saml, ...(stored.saml || {}) } } : base;
  merged.attributeMap = merged.attributeMap || deepClone(DEFAULT_ATTRIBUTE_MAP);
  merged.groupMap = merged.groupMap || deepClone(DEFAULT_GROUP_MAP);
  return merged;
}

export function writeIdpConfig(config) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch { /* storage เต็ม — mock เท่านั้น ไม่ทำให้หน้าพัง */ }
  return config;
}

/* ── validation ────────────────────────────────────────────────────────── */

const isHttps = (v) => /^https:\/\/[^\s]+$/i.test(String(v || '').trim());

/**
 * ตรวจฟอร์มตาม protocol ที่เลือก **เท่านั้น** (สลับ OIDC↔SAML ไม่ล้างค่าอีกฝั่ง).
 * @returns {{errors: Object, missingAttributes: string[]}}
 */
export function validateIdpConfig(config) {
  const errors = {};
  if (config.protocol === 'oidc') {
    const o = config.oidc || {};
    if (!String(o.providerName || '').trim()) errors.providerName = 'กรุณาระบุชื่อผู้ให้บริการ';
    if (!isHttps(o.discoveryUrl)) errors.discoveryUrl = 'ต้องเป็น URL แบบ https://';
    if (!String(o.clientId || '').trim()) errors.clientId = 'กรุณากรอก Client ID';
    if (!String(o.clientSecret || '').trim()) errors.clientSecret = 'กรุณากรอก Client Secret';
    if (!isHttps(o.authorizationEndpoint)) errors.authorizationEndpoint = 'ต้องเป็น URL แบบ https://';
    if (!isHttps(o.tokenEndpoint)) errors.tokenEndpoint = 'ต้องเป็น URL แบบ https://';
    if (!isHttps(o.userinfoEndpoint)) errors.userinfoEndpoint = 'ต้องเป็น URL แบบ https://';
    if (!isHttps(o.jwksUri)) errors.jwksUri = 'ต้องเป็น URL แบบ https://';
    if (!(o.scopes || []).includes('openid')) errors.scopes = 'ต้องมี scope "openid" เสมอ';
  } else {
    const s = config.saml || {};
    if (!String(s.providerName || '').trim()) errors.providerName = 'กรุณาระบุชื่อผู้ให้บริการ';
    if (!String(s.entityId || '').trim()) errors.entityId = 'กรุณากรอก Entity ID';
    if (!isHttps(s.ssoUrl)) errors.ssoUrl = 'ต้องเป็น URL แบบ https://';
    if (s.sloUrl && !isHttps(s.sloUrl)) errors.sloUrl = 'ต้องเป็น URL แบบ https://';
    if (!s.certificateFile) errors.certificateFile = 'กรุณาอัปโหลดใบรับรอง X.509';
    if (!s.metadataFile) errors.metadataFile = 'กรุณาอัปโหลด IdP metadata (XML)';
  }

  /* attribute mapping — ครบ 8 ตัวตาม TOR ถึงจะเปิดใช้งานได้ */
  const rows = config.attributeMap || [];
  const filled = new Set(rows.filter((r) => String(r.claim || '').trim()).map((r) => r.target));
  const missingAttributes = USER_ATTRIBUTES.filter((a) => !filled.has(a.key)).map((a) => a.torLabel);

  /* claim ซ้ำไปยัง attribute เดียวกัน = error */
  const seen = new Map();
  rows.forEach((r) => {
    if (!r.target) return;
    seen.set(r.target, (seen.get(r.target) || 0) + 1);
  });
  const duplicated = [...seen.entries()].filter(([, n]) => n > 1).map(([k]) => k);
  if (duplicated.length) {
    errors.attributeMap = `มี attribute ปลายทางซ้ำกัน: ${duplicated.join(', ')} — แต่ละ attribute แม็ปได้ครั้งเดียว`;
  }

  return { errors, missingAttributes };
}

/** วันหมดอายุใบรับรอง — เตือนเมื่อเหลือ < 45 วัน. */
export function certificateStatus(expiry) {
  if (!expiry) return { tone: 'grey', label: 'ยังไม่ได้อัปโหลดใบรับรอง', days: null };
  const days = Math.round((new Date(expiry).getTime() - Date.now()) / 86400000);
  if (Number.isNaN(days)) return { tone: 'grey', label: 'อ่านวันหมดอายุไม่ได้', days: null };
  if (days < 0)  return { tone: 'red',    label: `ใบรับรองหมดอายุแล้ว ${Math.abs(days)} วัน`, days };
  if (days < 45) return { tone: 'orange', label: `ใบรับรองจะหมดอายุใน ${days} วัน`,          days };
  return { tone: 'green', label: `ใบรับรองใช้ได้อีก ${days} วัน`, days };
}

/* ── mock test / sync ─────────────────────────────────────────────────── */

/**
 * จำลอง "ทดสอบการเชื่อมต่อ" — คืนผลรายขั้น เพื่อให้ผู้ดูแลรู้ว่าติดตรงไหน
 * (ไม่ใช่แค่คำว่า "ล้มเหลว" ตาม edge case ที่สเปกกำหนด).
 */
export function runConnectionTest(config) {
  const { errors, missingAttributes } = validateIdpConfig(config);
  const isOidc = config.protocol === 'oidc';
  const steps = [];

  const discoveryOk = isOidc ? !errors.discoveryUrl : !errors.ssoUrl;
  steps.push({
    key: 'discovery',
    label: isOidc ? 'ค้นพบ Discovery document (.well-known)' : 'อ่าน IdP metadata (XML)',
    ok: discoveryOk,
    detail: discoveryOk
      ? (isOidc ? 'พบ issuer + endpoint ครบ 4 รายการ' : 'พบ EntityDescriptor + SSO binding แบบ HTTP-POST')
      : (isOidc ? 'เรียก discovery URL ไม่สำเร็จ — ตรวจว่าเป็น https และเข้าถึงได้จากเครือข่ายโรงพยาบาล' : 'ยังไม่ได้อัปโหลด metadata หรือ SSO URL ไม่ถูกต้อง'),
  });

  const credOk = isOidc ? (!errors.clientId && !errors.clientSecret) : !errors.certificateFile;
  steps.push({
    key: 'credential',
    label: isOidc ? 'แลก Token ด้วย Client ID / Secret' : 'ตรวจลายเซ็นด้วยใบรับรอง X.509',
    ok: discoveryOk && credOk,
    detail: !discoveryOk
      ? 'ข้ามขั้นนี้เพราะขั้นก่อนหน้าล้มเหลว'
      : credOk
        ? (isOidc ? 'ได้ access_token + id_token (อายุ 300 วินาที)' : 'ลายเซ็น assertion ถูกต้อง (SHA-256)')
        : (isOidc ? 'client_secret ไม่ถูกต้อง (invalid_client)' : 'ใบรับรองไม่ถูกต้องหรือยังไม่ได้อัปโหลด'),
  });

  const profileOk = discoveryOk && credOk;
  steps.push({
    key: 'userinfo',
    label: isOidc ? 'ดึงข้อมูลผู้ใช้จาก UserInfo endpoint' : 'อ่าน Attribute Statement จาก assertion',
    ok: profileOk,
    detail: profileOk ? 'ได้ claim ทั้งหมด 9 รายการจากผู้ใช้ทดสอบ' : 'ข้ามขั้นนี้เพราะยืนยันตัวตนไม่ผ่าน',
  });

  steps.push({
    key: 'mapping',
    label: 'แม็ป attribute ให้ครบตาม TOR (8 รายการ)',
    ok: profileOk && missingAttributes.length === 0,
    detail: missingAttributes.length
      ? `ยังไม่มี claim สำหรับ: ${missingAttributes.join(' · ')}`
      : 'แม็ปครบทั้ง 8 attribute',
  });

  const samplePayload = {
    title: 'พญ.',
    given_name: 'สมหญิง',
    family_name: 'รักษ์ดี',
    email: 'somying.r@phcis.bma.go.th',
    department: 'ผู้ป่วยนอก (OPD)',
    departmentNumber: missingAttributes.includes('Department-Code') ? null : 'DEP-OPD-01',
    licenseNumber: 'ว.28451',
    active: true,
    groups: ['CN=PHCIS-Doctors,OU=Groups'],
  };

  return {
    ok: steps.every((s) => s.ok),
    at: new Date().toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' }),
    steps,
    samplePayload,
    missingAttributes,
  };
}

/** จำลองการ sync ทันที — ผลลัพธ์อิงว่าการทดสอบผ่านหรือไม่. */
export function runSyncNow(config) {
  const test = runConnectionTest(config);
  const at = new Date().toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' });
  if (!test.ok) {
    return { id: `sy-${Date.now()}`, at, by: 'ผู้ดูแลระบบ', total: 0, created: 0, updated: 0, deactivated: 0, failed: SYNC_FAILURES.length, status: 'failed' };
  }
  return { id: `sy-${Date.now()}`, at, by: 'ผู้ดูแลระบบ', total: 149, created: 1, updated: 8, deactivated: 0, failed: 0, status: 'success' };
}
