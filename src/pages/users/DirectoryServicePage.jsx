import React, { useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import Icon from '@/components/icons/Icon';
import InputField from '@/components/forms/InputField';
import PasswordField from '@/components/forms/PasswordField';
import Select from '@/components/forms/Select';
import Switch from '@/components/switch/Switch';
import SelectableTag from '@/components/forms/SelectableTag';
import FileUploadField from '@/components/forms/FileUploadField';
import SelectableOptionCard from '@/components/card/SelectableOptionCard';
import Table from '@/components/table/Table';
import Alert from '@/components/alert/Alert';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import BrandButton from '@/components/button/BrandButton';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import AlertDialog from '@/components/popup/AlertDialog';
import UnsavedChangesPopup from '@/components/popup/UnsavedChangesPopup';
import {
  PROTOCOLS,
  OIDC_SCOPES,
  NAMEID_FORMATS,
  TRANSFORMS,
  SP_REDIRECT_URI,
  SP_ENTITY_ID,
  SP_ACS_URL,
  SYNC_HISTORY,
  SYNC_FAILURES,
  readIdpConfig,
  writeIdpConfig,
  validateIdpConfig,
  certificateStatus,
  runConnectionTest,
  runSyncNow,
} from '@/data/usersDirectoryService';
import { ROLES, SUB_ROLES, USER_ATTRIBUTES, USERS } from '@/data/usersAccess';
import {
  EmptyState,
  LastEditedNote,
  ModuleCard,
  PermissionGate,
  ReadOnlyNotice,
  SectionTitle,
  auditAdmin,
} from '@/pages/users/usersShared';

/* DirectoryServicePage — TOR §1.17.1.1 "รองรับการทำงานร่วมกับ Directory
   Service ของสถานพยาบาล (OIDC / SAML)" + §1.17.1.2 (group → บทบาท) และ
   §1.17.1.3 (attribute mapping ครบ 8 ตัว).

   ⚠️ UI + mock เท่านั้น — ไม่ยิง IdP จริง (แจ้งไว้บนหน้าจอด้วย Alert ถาวร). */

const breadcrumb = ['ระบบงานผู้ดูแลระบบ', 'ผู้ใช้และสิทธิ์การเข้าถึง', 'Directory Service'];

const TABS = [
  { key: 'connection', label: 'การเชื่อมต่อ',      icon: 'hub' },
  { key: 'attributes', label: 'Attribute Mapping', icon: 'table_rows' },
  { key: 'groups',     label: 'Group Mapping',     icon: 'groups' },
  { key: 'sync',       label: 'สถานะ Sync',        icon: 'sync' },
];

const ReadOnlyField = ({ label, value, onCopy }) => (
  <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-100, 4px)' }}>
    <span style={{ color: 'var(--text-content-secondary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs, 12px)' }}>
      {label}
    </span>
    <div
      className='flex items-center w-full'
      style={{
        gap: 'var(--dim-space-200, 8px)',
        minHeight: 'var(--dim-size-800, 40px)',
        paddingLeft: 'var(--dim-space-300, 12px)',
        paddingRight: 'var(--dim-space-200, 8px)',
        background: 'var(--surface-brandPrimary-quaternary)',
        border: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary)',
        borderRadius: 'var(--dim-radius-200, 8px)',
      }}
    >
      <span
        className='flex-1 min-w-0 truncate'
        style={{ color: 'var(--text-content-primary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm, 14px)' }}
      >
        {value}
      </span>
      <NeutralSubdueButton variant='outline' size='sm' leadingIcon='content_copy' onClick={onCopy}>
        คัดลอก
      </NeutralSubdueButton>
    </div>
  </div>
);

const DirectoryServicePage = () => {
  const history = useHistory();
  const [config, setConfig] = useState(() => readIdpConfig());
  const [activeTab, setActiveTab] = useState('connection');
  const [dirty, setDirty] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [syncRows, setSyncRows] = useState(SYNC_HISTORY);
  const [saved, setSaved] = useState('');
  const [copied, setCopied] = useState('');
  const [confirmProtocol, setConfirmProtocol] = useState(null);
  const [confirmDisable, setConfirmDisable] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const { errors, missingAttributes } = useMemo(() => validateIdpConfig(config), [config]);
  const isOidc = config.protocol === 'oidc';
  const certState = certificateStatus(config.saml?.certificateExpiry);

  const patch = (branch, key, value) => {
    setDirty(true);
    setConfig((prev) => ({ ...prev, [branch]: { ...prev[branch], [key]: value } }));
  };
  const patchRoot = (key, value) => {
    setDirty(true);
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const copy = (text, label) => {
    try {
      navigator.clipboard?.writeText(text);
      setCopied(`คัดลอก ${label} แล้ว`);
      setTimeout(() => setCopied(''), 2500);
    } catch {
      setCopied('คัดลอกไม่สำเร็จ — คัดลอกด้วยตัวเองจากช่องด้านบน');
    }
  };

  const handleSave = () => {
    if (Object.keys(errors).length) {
      setSaved('');
      setActiveTab(errors.attributeMap ? 'attributes' : 'connection');
      auditAdmin('บันทึกการตั้งค่า Directory Service ไม่สำเร็จ (ข้อมูลไม่ครบ)', false);
      return;
    }
    writeIdpConfig(config);
    setDirty(false);
    setSaved('บันทึกการตั้งค่า Directory Service เรียบร้อยแล้ว (เก็บใน localStorage — mock)');
    auditAdmin(`บันทึกการตั้งค่า Directory Service (${isOidc ? 'OIDC' : 'SAML 2.0'})`);
    setTimeout(() => setSaved(''), 4000);
  };

  const handleCancel = () => {
    if (!dirty) { history.push('/users'); return; }
    setLeaving(true);
  };

  const discardChanges = () => {
    setConfig(readIdpConfig());
    setDirty(false);
    setLeaving(false);
    setTestResult(null);
  };

  const doTest = () => {
    const result = runConnectionTest(config);
    setTestResult(result);
    auditAdmin(`ทดสอบการเชื่อมต่อ Directory Service — ${result.ok ? 'สำเร็จ' : 'ล้มเหลว'}`, result.ok);
  };

  const doSync = () => {
    const row = runSyncNow(config);
    setSyncRows((prev) => [row, ...prev]);
    auditAdmin(`สั่ง Sync ผู้ใช้จาก Directory Service — ${row.status === 'success' ? 'สำเร็จ' : 'ไม่สำเร็จ'}`, row.status === 'success');
  };

  const switchProtocol = (key) => {
    if (key === config.protocol) return;
    setConfirmProtocol(key);
  };

  /* ── Attribute mapping ─────────────────────────────────────────────── */
  const setMapRow = (id, key, value) => {
    setDirty(true);
    setConfig((prev) => ({
      ...prev,
      attributeMap: prev.attributeMap.map((r) => (r.id === id ? { ...r, [key]: value } : r)),
    }));
  };
  const addMapRow = () => {
    setDirty(true);
    setConfig((prev) => ({
      ...prev,
      attributeMap: [...prev.attributeMap, { id: `am-${Date.now()}`, claim: '', target: '', required: false, transform: 'none' }],
    }));
  };
  const removeMapRow = (id) => {
    setDirty(true);
    setConfig((prev) => ({ ...prev, attributeMap: prev.attributeMap.filter((r) => r.id !== id) }));
  };

  const attributeColumns = useMemo(() => ([
    {
      key: 'claim', label: 'Claim / Assertion ฝั่ง IdP', flex: true, minWidth: 200, sortable: false,
      render: (r) => (
        <InputField
          showLabel={false}
          size='md'
          value={r.claim}
          onChange={(v) => setMapRow(r.id, 'claim', v)}
          placeholder='เช่น given_name'
          showHelperText={false}
        />
      ),
    },
    { key: 'arrow', label: '', sortable: false, render: () => <Icon name='arrow_forward' size={16} /> },
    {
      key: 'target', label: 'Attribute ฝั่ง PHCIS', sortable: false,
      render: (r) => (
        <Select
          showLabel={false}
          searchable={false}
          size='md'
          value={r.target}
          onChange={(v) => setMapRow(r.id, 'target', v)}
          options={USER_ATTRIBUTES.map((a) => ({ value: a.key, label: a.torLabel }))}
          placeholder='เลือก attribute'
        />
      ),
    },
    {
      key: 'transform', label: 'แปลงค่า', sortable: false,
      render: (r) => (
        <Select
          showLabel={false}
          searchable={false}
          size='md'
          value={r.transform}
          onChange={(v) => setMapRow(r.id, 'transform', v)}
          options={TRANSFORMS}
        />
      ),
    },
    {
      key: 'required', label: 'บังคับ', sortable: false,
      render: (r) => (
        <Switch checked={!!r.required} onChange={(v) => setMapRow(r.id, 'required', v)} aria-label='บังคับให้มีค่า' />
      ),
    },
    {
      key: 'status', label: 'สถานะ', sortable: false,
      render: (r) => (String(r.claim || '').trim()
        ? <ColorfulBadge style='green' size='small' icon='check_circle'>แม็ปแล้ว</ColorfulBadge>
        : <ColorfulBadge style='red' size='small' icon='error'>ยังไม่แม็ป</ColorfulBadge>)},
    {
      key: 'actions', label: '', sortable: false,
      render: (r) => (
        <NeutralSubdueButton variant='outline' size='sm' leadingIcon='delete' onClick={() => removeMapRow(r.id)}>
          ลบ
        </NeutralSubdueButton>
      ),
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ]), []);

  /* ── Group mapping ─────────────────────────────────────────────────── */
  const setGroupRow = (id, key, value) => {
    setDirty(true);
    setConfig((prev) => ({
      ...prev,
      groupMap: prev.groupMap.map((r) => (r.id === id ? { ...r, [key]: value } : r)),
    }));
  };
  const addGroupRow = () => {
    setDirty(true);
    setConfig((prev) => ({
      ...prev,
      groupMap: [...prev.groupMap, { id: `gm-${Date.now()}`, group: '', role: 'nurse', subRole: '', note: '' }],
    }));
  };
  const removeGroupRow = (id) => {
    setDirty(true);
    setConfig((prev) => ({ ...prev, groupMap: prev.groupMap.filter((r) => r.id !== id) }));
  };

  const groupColumns = useMemo(() => ([
    {
      key: 'group', label: 'Group / Role ฝั่ง IdP', flex: true, minWidth: 240, sortable: false,
      render: (r) => (
        <InputField showLabel={false} size='md' value={r.group} onChange={(v) => setGroupRow(r.id, 'group', v)} placeholder='CN=PHCIS-Doctors,OU=Groups' showHelperText={false} />
      ),
    },
    {
      key: 'role', label: 'บทบาทใน PHCIS', sortable: false,
      render: (r) => (
        <Select showLabel={false} searchable={false} size='md' value={r.role} onChange={(v) => setGroupRow(r.id, 'role', v)} options={ROLES.map((x) => ({ value: x.key, label: x.label }))} />
      ),
    },
    {
      key: 'subRole', label: 'บทบาทย่อย', sortable: false,
      render: (r) => (
        <Select
          showLabel={false}
          searchable={false}
          size='md'
          value={r.subRole}
          onChange={(v) => setGroupRow(r.id, 'subRole', v)}
          options={(SUB_ROLES[r.role] || []).map((x) => ({ value: x.key, label: x.label }))}
          placeholder='— ไม่ระบุ —'
        />
      ),
    },
    {
      key: 'note', label: 'หมายเหตุ', sortable: false,
      render: (r) => (
        <InputField showLabel={false} size='md' value={r.note} onChange={(v) => setGroupRow(r.id, 'note', v)} placeholder='คำอธิบายสั้น ๆ' showHelperText={false} />
      ),
    },
    {
      key: 'actions', label: '', sortable: false,
      render: (r) => (
        <NeutralSubdueButton variant='outline' size='sm' leadingIcon='delete' onClick={() => removeGroupRow(r.id)}>ลบ</NeutralSubdueButton>
      ),
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ]), []);

  const syncColumns = useMemo(() => ([
    { key: 'at', label: 'เวลา' },
    { key: 'by', label: 'ผู้ดำเนินการ' },
    { key: 'total', label: 'บัญชีทั้งหมด' },
    { key: 'created', label: 'สร้างใหม่' },
    { key: 'updated', label: 'อัปเดต' },
    { key: 'deactivated', label: 'ปิดใช้งาน' },
    { key: 'failed', label: 'ล้มเหลว' },
    {
      key: 'status', label: 'ผล', sortable: false,
      render: (r) => (
        <ColorfulBadge
          style={r.status === 'success' ? 'green' : r.status === 'partial' ? 'orange' : 'red'}
          size='small'
          icon={r.status === 'success' ? 'check_circle' : r.status === 'partial' ? 'warning' : 'cancel'}
        >
          {r.status === 'success' ? 'สำเร็จ' : r.status === 'partial' ? 'สำเร็จบางส่วน' : 'ล้มเหลว'}
        </ColorfulBadge>
      ),
    },
  ]), []);

  const idpUserCount = USERS.filter((u) => u.source === 'idp').length;
  const lastSync = syncRows[0];

  const summaryCards = useMemo(() => ([
    { key: 'state',  label: config.enabled ? 'สถานะการเชื่อมต่อ: เปิดใช้งาน' : 'สถานะการเชื่อมต่อ: ปิดอยู่', value: isOidc ? 'OIDC' : 'SAML 2.0', color: config.enabled ? 'positive' : 'info', icon: 'hub' },
    { key: 'users',  label: 'บัญชีที่มาจาก IdP',   value: idpUserCount, color: 'brand', icon: 'group' },
    { key: 'attrs',  label: 'Attribute ที่ยังไม่แม็ป', value: missingAttributes.length, color: missingAttributes.length ? 'destructive' : 'positive', icon: 'rule' },
    { key: 'sync',   label: `sync ล่าสุด ${lastSync?.at || '—'}`, value: lastSync?.failed ? `${lastSync.failed} error` : 'ไม่มี error', color: lastSync?.failed ? 'destructive' : 'positive', icon: 'sync' },
  ]), [config.enabled, isOidc, idpUserCount, missingAttributes.length, lastSync]);

  /* ── tab bodies ────────────────────────────────────────────────────── */

  const renderConnection = (readOnly) => (
    <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-500, 20px)' }}>
      <ModuleCard>
        <SectionTitle
          icon='settings_ethernet'
          title='เลือกโปรโตคอลการยืนยันตัวตน'
          subtitle='สลับโปรโตคอลจะเปลี่ยนชุดฟิลด์ด้านล่างทั้งชุด — ค่าที่กรอกไว้ของอีกฝั่งยังถูกเก็บไว้ ไม่ถูกลบทิ้ง'
          action={(
            <span className='inline-flex items-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
              <Switch
                checked={!!config.enabled}
                disabled={readOnly || missingAttributes.length > 0}
                onChange={(next) => (next ? patchRoot('enabled', true) : setConfirmDisable(true))}
                aria-label='เปิดใช้งานการเชื่อมต่อ IdP'
              />
              <span style={{ color: 'var(--text-content-secondary)', fontSize: 'var(--type-size-sm, 14px)' }}>
                {config.enabled ? 'เปิดใช้งาน' : 'ปิดอยู่'}
              </span>
            </span>
          )}
        />
        {missingAttributes.length > 0 ? (
          <Alert
            type='warning'
            title='ยังเปิดใช้งานไม่ได้ — แม็ป attribute ไม่ครบตามข้อกำหนด'
            subtext={`ขาด: ${missingAttributes.join(' · ')} — ไปเติมที่แท็บ Attribute Mapping ก่อน`}
            detail={(
              <BrandSubdueButton variant='outline' size='sm' leadingIcon='table_rows' onClick={() => setActiveTab('attributes')}>
                ไปที่ Attribute Mapping
              </BrandSubdueButton>
            )}
          />
        ) : null}
        <div className='flex flex-wrap w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
          {PROTOCOLS.map((p) => (
            <SelectableOptionCard
              key={p.key}
              icon={p.icon}
              title={p.label}
              description={p.desc}
              selected={config.protocol === p.key}
              disabled={readOnly}
              onSelect={() => switchProtocol(p.key)}
              style={{ width: 380, maxWidth: '100%' }}
            />
          ))}
        </div>
      </ModuleCard>

      {isOidc ? (
        <ModuleCard>
          <SectionTitle icon='hub' title='การตั้งค่า OpenID Connect' subtitle='กรอกค่าจากคอนโซลของ IdP — ทุก URL ต้องเป็น https' />
          <div className='grid grid-cols-1 md:grid-cols-2 w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
            <InputField label='ชื่อผู้ให้บริการ (Provider name)' required disabled={readOnly} value={config.oidc.providerName} onChange={(v) => patch('oidc', 'providerName', v)} error={errors.providerName} placeholder='เช่น สำนักอนามัย SSO' />
            <InputField label='Issuer / Discovery URL' required disabled={readOnly} value={config.oidc.discoveryUrl} onChange={(v) => patch('oidc', 'discoveryUrl', v)} error={errors.discoveryUrl} placeholder='https://.../.well-known/openid-configuration' />
            <InputField label='Client ID' required disabled={readOnly} value={config.oidc.clientId} onChange={(v) => patch('oidc', 'clientId', v)} error={errors.clientId} placeholder='phcis-web' />
            <PasswordField label='Client Secret' required disabled={readOnly} value={config.oidc.clientSecret} onChange={(v) => patch('oidc', 'clientSecret', v)} error={errors.clientSecret} helperText='ถูกปิดบังโดยค่าเริ่มต้น และไม่ถูกบันทึกลงประวัติการใช้งาน' />
            <InputField label='Authorization endpoint' required disabled={readOnly} value={config.oidc.authorizationEndpoint} onChange={(v) => patch('oidc', 'authorizationEndpoint', v)} error={errors.authorizationEndpoint} />
            <InputField label='Token endpoint' required disabled={readOnly} value={config.oidc.tokenEndpoint} onChange={(v) => patch('oidc', 'tokenEndpoint', v)} error={errors.tokenEndpoint} />
            <InputField label='UserInfo endpoint' required disabled={readOnly} value={config.oidc.userinfoEndpoint} onChange={(v) => patch('oidc', 'userinfoEndpoint', v)} error={errors.userinfoEndpoint} />
            <InputField label='JWKS URI' required disabled={readOnly} value={config.oidc.jwksUri} onChange={(v) => patch('oidc', 'jwksUri', v)} error={errors.jwksUri} />
          </div>
          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
            <span style={{ color: 'var(--text-content-secondary)', fontSize: 'var(--type-size-xs, 12px)' }}>Scopes ที่ขอจาก IdP</span>
            <div className='flex flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
              {OIDC_SCOPES.map((s) => (
                <SelectableTag
                  key={s}
                  label={s}
                  selected={(config.oidc.scopes || []).includes(s)}
                  onClick={() => {
                    if (readOnly) return;
                    const set = new Set(config.oidc.scopes || []);
                    if (set.has(s)) set.delete(s); else set.add(s);
                    patch('oidc', 'scopes', [...set]);
                  }}
                />
              ))}
            </div>
            {errors.scopes ? (
              <span style={{ color: 'var(--text-input-require)', fontSize: 'var(--type-size-xs, 12px)' }}>{errors.scopes}</span>
            ) : null}
          </div>
          <ReadOnlyField label='Redirect URI (นำไปวางที่ IdP)' value={SP_REDIRECT_URI} onCopy={() => copy(SP_REDIRECT_URI, 'Redirect URI')} />
        </ModuleCard>
      ) : (
        <ModuleCard>
          <SectionTitle icon='assignment_ind' title='การตั้งค่า SAML 2.0' subtitle='อัปโหลด metadata + ใบรับรองจาก IdP แล้วส่ง SP metadata กลับไปให้ผู้ดูแล IdP' />
          <div className='grid grid-cols-1 md:grid-cols-2 w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
            <InputField label='ชื่อผู้ให้บริการ (Provider name)' required disabled={readOnly} value={config.saml.providerName} onChange={(v) => patch('saml', 'providerName', v)} error={errors.providerName} />
            <InputField label='IdP Entity ID' required disabled={readOnly} value={config.saml.entityId} onChange={(v) => patch('saml', 'entityId', v)} error={errors.entityId} />
            <InputField label='SSO URL (SingleSignOnService)' required disabled={readOnly} value={config.saml.ssoUrl} onChange={(v) => patch('saml', 'ssoUrl', v)} error={errors.ssoUrl} />
            <InputField label='SLO URL (SingleLogoutService)' disabled={readOnly} value={config.saml.sloUrl} onChange={(v) => patch('saml', 'sloUrl', v)} error={errors.sloUrl} />
            <Select
              label='NameID format'
              searchable={false}
              disabled={readOnly}
              value={config.saml.nameIdFormat}
              onChange={(v) => patch('saml', 'nameIdFormat', v)}
              options={NAMEID_FORMATS}
            />
            <InputField
              label='วันหมดอายุใบรับรอง (YYYY-MM-DD)'
              disabled={readOnly}
              value={config.saml.certificateExpiry}
              onChange={(v) => patch('saml', 'certificateExpiry', v)}
              helperText='ระบบจะเตือนเมื่อเหลือน้อยกว่า 45 วัน'
            />
          </div>
          {certState.days !== null && certState.tone !== 'green' ? (
            <Alert type={certState.tone === 'red' ? 'error' : 'warning'} title='ใบรับรอง X.509' subtext={certState.label} />
          ) : (
            <ColorfulBadge style='green' size='small' icon='verified'>{certState.label}</ColorfulBadge>
          )}
          <div className='grid grid-cols-1 md:grid-cols-2 w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
            <FileUploadField
              label='IdP metadata (XML)'
              accept='.xml,text/xml'
              disabled={readOnly}
              fileName={config.saml.metadataFile}
              onFile={(f) => {
                if (!/\.xml$/i.test(f.name)) { setSaved(''); return; }
                patch('saml', 'metadataFile', f.name);
              }}
              onClear={() => patch('saml', 'metadataFile', '')}
              helperText='รับเฉพาะไฟล์ .xml ขนาดไม่เกิน 2 MB'
            />
            <FileUploadField
              label='ใบรับรอง X.509 (.cer / .pem)'
              accept='.cer,.pem,.crt'
              disabled={readOnly}
              fileName={config.saml.certificateFile}
              onFile={(f) => patch('saml', 'certificateFile', f.name)}
              onClear={() => patch('saml', 'certificateFile', '')}
              helperText='ใช้ตรวจลายเซ็นของ SAML assertion'
            />
          </div>
          {errors.metadataFile || errors.certificateFile ? (
            <Alert type='error' title='ไฟล์ยังไม่ครบ' subtext={[errors.metadataFile, errors.certificateFile].filter(Boolean).join(' · ')} />
          ) : null}
          <ReadOnlyField label='SP Entity ID' value={SP_ENTITY_ID} onCopy={() => copy(SP_ENTITY_ID, 'SP Entity ID')} />
          <ReadOnlyField label='Assertion Consumer Service (ACS) URL' value={SP_ACS_URL} onCopy={() => copy(SP_ACS_URL, 'ACS URL')} />
          <div>
            <NeutralSubdueButton variant='outline' size='sm' leadingIcon='download' onClick={() => copy(SP_ENTITY_ID, 'SP metadata')}>
              ดาวน์โหลด SP metadata
            </NeutralSubdueButton>
          </div>
        </ModuleCard>
      )}

      <ModuleCard>
        <SectionTitle icon='network_check' title='ทดสอบการเชื่อมต่อ' subtitle='ตรวจทีละขั้นเพื่อบอกได้ว่าติดตรงไหน (mock — ไม่ได้ยิงออกไปจริง)' />
        <div className='flex flex-wrap items-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          <BrandButton size='md' leadingIcon='play_arrow' disabled={readOnly} onClick={doTest}>
            ทดสอบการเชื่อมต่อ
          </BrandButton>
          {testResult ? (
            <ColorfulBadge style={testResult.ok ? 'green' : 'red'} size='small' icon={testResult.ok ? 'check_circle' : 'cancel'}>
              {testResult.ok ? 'ผ่านทุกขั้น' : 'มีขั้นที่ไม่ผ่าน'} · {testResult.at}
            </ColorfulBadge>
          ) : null}
        </div>
        {!testResult ? (
          <EmptyState icon='science' title='ยังไม่ได้ทดสอบการเชื่อมต่อ' subtitle='กดปุ่มด้านบนเพื่อให้ระบบไล่ตรวจ discovery → credential → userinfo → attribute mapping' />
        ) : (
          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
            {testResult.steps.map((s) => (
              <div
                key={s.key}
                className='flex items-start w-full'
                style={{
                  gap: 'var(--dim-space-300, 12px)',
                  paddingTop: 'var(--dim-space-300, 12px)',
                  paddingBottom: 'var(--dim-space-300, 12px)',
                  paddingLeft: 'var(--dim-space-300, 12px)',
                  paddingRight: 'var(--dim-space-300, 12px)',
                  borderRadius: 'var(--dim-radius-200, 8px)',
                  background: s.ok ? 'var(--surface-pill-green)' : 'var(--surface-pill-red)',
                  color: s.ok ? 'var(--text-pill-green)' : 'var(--text-pill-red)',
                }}
              >
                <Icon name={s.ok ? 'check_circle' : 'cancel'} size={18} />
                <span className='flex-1 min-w-0 flex flex-col' style={{ gap: 'var(--dim-space-050, 2px)' }}>
                  <span style={{ fontSize: 'var(--type-size-sm, 14px)', fontWeight: 'var(--type-weight-medium, 500)' }}>{s.label}</span>
                  <span style={{ fontSize: 'var(--type-size-xs, 12px)' }}>{s.detail}</span>
                </span>
              </div>
            ))}
            <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-100, 4px)' }}>
              <span style={{ color: 'var(--text-content-secondary)', fontSize: 'var(--type-size-xs, 12px)' }}>
                ตัวอย่างข้อมูลผู้ใช้ทดสอบหลังแม็ปแล้ว
              </span>
              <pre
                style={{
                  margin: 0,
                  overflowX: 'auto',
                  background: 'var(--surface-brandPrimary-quaternary)',
                  borderRadius: 'var(--dim-radius-200, 8px)',
                  paddingTop: 'var(--dim-space-300, 12px)',
                  paddingBottom: 'var(--dim-space-300, 12px)',
                  paddingLeft: 'var(--dim-space-300, 12px)',
                  paddingRight: 'var(--dim-space-300, 12px)',
                  color: 'var(--text-content-primary)',
                  fontSize: 'var(--type-size-xs, 12px)',
                }}
              >
                {JSON.stringify(testResult.samplePayload, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </ModuleCard>
    </div>
  );

  const renderAttributes = (readOnly) => (
    <ModuleCard>
      <SectionTitle
        icon='table_rows'
        title='Attribute Mapping'
        subtitle='claim/assertion ฝั่ง IdP → attribute ฝั่ง PHCIS — ต้องแม็ปครบ 8 รายการตามข้อกำหนดจึงจะเปิดใช้งานได้'
        action={!readOnly ? (
          <BrandSubdueButton variant='outline' size='sm' leadingIcon='add' onClick={addMapRow}>เพิ่มแถว</BrandSubdueButton>
        ) : null}
      />
      {errors.attributeMap ? <Alert type='error' title='แม็ปซ้ำ' subtext={errors.attributeMap} /> : null}
      {missingAttributes.length ? (
        <Alert type='warning' title={`ยังแม็ปไม่ครบ (ขาด ${missingAttributes.length} รายการ)`} subtext={missingAttributes.join(' · ')} />
      ) : (
        <Alert type='success' title='แม็ปครบทั้ง 8 attribute ตามข้อกำหนดแล้ว' subtext='เปิดใช้งานการเชื่อมต่อได้ที่แท็บ "การเชื่อมต่อ"' />
      )}
      {config.attributeMap.length === 0 ? (
        <EmptyState
          icon='rule'
          title='ยังไม่มีการแม็ป attribute'
          subtitle='เริ่มจากการเพิ่มแถวแรก แล้วจับคู่ claim ของ IdP กับ attribute ของ PHCIS'
          action={<BrandButton size='md' leadingIcon='add' onClick={addMapRow}>เพิ่มการแม็ปแรก</BrandButton>}
        />
      ) : (
        <Table columns={attributeColumns} rows={config.attributeMap} rowKey={(r) => r.id} emptyMessage='ไม่มีข้อมูล' />
      )}
    </ModuleCard>
  );

  const renderGroups = (readOnly) => (
    <ModuleCard>
      <SectionTitle
        icon='groups'
        title='Group → บทบาทและสิทธิ์'
        subtitle='กลุ่มที่ IdP ส่งมาถูกแปลงเป็นบทบาท/บทบาทย่อยของ PHCIS แล้วสิทธิ์ฟีเจอร์จะถูกกำหนดตามบทบาทนั้น'
        action={!readOnly ? (
          <BrandSubdueButton variant='outline' size='sm' leadingIcon='add' onClick={addGroupRow}>เพิ่มกลุ่ม</BrandSubdueButton>
        ) : null}
      />
      {config.groupMap.length === 0 ? (
        <EmptyState
          icon='groups'
          title='ยังไม่มีการแม็ปกลุ่ม'
          subtitle='ถ้าไม่แม็ปกลุ่มไว้ ผู้ใช้ที่ sync เข้ามาจะไม่ได้รับบทบาทใด ๆ และจะเข้าใช้งานไม่ได้'
          action={<BrandButton size='md' leadingIcon='add' onClick={addGroupRow}>เพิ่มกลุ่มแรก</BrandButton>}
        />
      ) : (
        <Table columns={groupColumns} rows={config.groupMap} rowKey={(r) => r.id} emptyMessage='ไม่มีข้อมูล' />
      )}
    </ModuleCard>
  );

  const renderSync = (readOnly) => (
    <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-500, 20px)' }}>
      <ModuleCard>
        <SectionTitle
          icon='sync'
          title='สถานะการ Sync ผู้ใช้'
          subtitle={`ตั้งเวลา sync อัตโนมัติทุก ${config.syncIntervalHours} ชั่วโมง — sync ล่าสุด ${lastSync?.at || 'ยังไม่เคย'}`}
          action={!readOnly ? (
            <BrandButton size='md' leadingIcon='sync' onClick={doSync}>Sync ตอนนี้</BrandButton>
          ) : null}
        />
        <div className='flex flex-wrap items-center w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
          <span className='inline-flex items-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
            <Switch checked={!!config.autoProvision} disabled={readOnly} onChange={(v) => patchRoot('autoProvision', v)} aria-label='สร้างบัญชีอัตโนมัติ' />
            <span style={{ fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-secondary)' }}>สร้างบัญชีใหม่อัตโนมัติเมื่อพบผู้ใช้ใหม่ใน IdP</span>
          </span>
          <span className='inline-flex items-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
            <Switch checked={!!config.deactivateOnRemoval} disabled={readOnly} onChange={(v) => patchRoot('deactivateOnRemoval', v)} aria-label='ปิดบัญชีเมื่อถูกลบจาก IdP' />
            <span style={{ fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-secondary)' }}>ปิดใช้งานบัญชีเมื่อถูกลบออกจาก IdP</span>
          </span>
        </div>
        {lastSync?.status === 'partial' || lastSync?.failed ? (
          <Alert
            type='warning'
            title={`รอบล่าสุดมีรายการที่ sync ไม่สำเร็จ ${lastSync.failed} รายการ`}
            subtext={SYNC_FAILURES.map((f) => `${f.account} — ${f.reason}`).join(' | ')}
            detail={(
              <NeutralSubdueButton
                variant='outline'
                size='sm'
                leadingIcon='download'
                onClick={() => {
                  const csv = ['บัญชี,สาเหตุ', ...SYNC_FAILURES.map((f) => `${f.account},${f.reason}`)].join('\n');
                  const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url; a.download = 'idp-sync-failures.csv';
                  document.body.appendChild(a); a.click(); document.body.removeChild(a);
                  setTimeout(() => URL.revokeObjectURL(url), 1000);
                  auditAdmin('ดาวน์โหลดรายการ sync ที่ผิดพลาดจาก Directory Service');
                }}
              >
                ดาวน์โหลดรายการที่ผิดพลาด
              </NeutralSubdueButton>
            )}
          />
        ) : null}
      </ModuleCard>

      <ModuleCard>
        <SectionTitle icon='history' title='ประวัติการ sync' subtitle='เทียบเท่าหน้าต่าง "ประวัติการบันทึก" ของระบบเดิม (วันที่ · ผู้บันทึก · ผล)' />
        {syncRows.length === 0 ? (
          <EmptyState icon='sync_problem' title='ยังไม่เคย sync' subtitle='กด "Sync ตอนนี้" เพื่อดึงบัญชีผู้ใช้จาก Directory Service เข้ามาครั้งแรก' />
        ) : (
          <Table columns={syncColumns} rows={syncRows} rowKey={(r) => r.id} emptyMessage='ไม่มีประวัติ' />
        )}
      </ModuleCard>
    </div>
  );

  return (
    <QueuePageShell
      activeKey='users'
      breadcrumb={breadcrumb}
      title='Directory Service (OIDC / SAML)'
      summaryCards={summaryCards}
      tabs={TABS}
      activeTab={activeTab}
      onTabChange={setActiveTab}
    >
      <UnsavedChangesPopup
        open={leaving}
        onClose={() => setLeaving(false)}
        onSave={() => { setLeaving(false); handleSave(); }}
        onDiscard={discardChanges}
        title='ทิ้งการตั้งค่าที่แก้ค้างไว้หรือไม่ ?'
        description='การตั้งค่า Directory Service ที่ยังไม่บันทึกจะถูกคืนเป็นค่าที่บันทึกไว้ล่าสุด'
      />

      <AlertDialog
        open={!!confirmProtocol}
        type='warning'
        title='สลับโปรโตคอลการยืนยันตัวตน ?'
        description={`กำลังจะเปลี่ยนเป็น ${confirmProtocol === 'saml' ? 'SAML 2.0' : 'OpenID Connect'} — ชุดฟิลด์จะเปลี่ยนทั้งหมด ค่าที่กรอกไว้ของอีกฝั่งยังถูกเก็บไว้ (ไม่ถูกลบ) และการเชื่อมต่อจะถูกปิดจนกว่าจะทดสอบผ่านอีกครั้ง`}
        cancelLabel='ไม่สลับ'
        confirmLabel='สลับโปรโตคอล'
        onCancel={() => setConfirmProtocol(null)}
        onClose={() => setConfirmProtocol(null)}
        onConfirm={() => {
          patchRoot('protocol', confirmProtocol);
          patchRoot('enabled', false);
          setTestResult(null);
          setConfirmProtocol(null);
          auditAdmin(`สลับโปรโตคอล Directory Service เป็น ${confirmProtocol === 'saml' ? 'SAML 2.0' : 'OIDC'}`);
        }}
      />

      <AlertDialog
        open={confirmDisable}
        type='destructive'
        title='ปิดการเชื่อมต่อ Directory Service ?'
        description='ผู้ใช้ที่ล็อกอินผ่าน IdP จะเข้าสู่ระบบไม่ได้จนกว่าจะเปิดใหม่ หรือจนกว่าจะตั้งรหัสผ่านแบบ Local ให้'
        cancelLabel='ยกเลิก'
        confirmLabel='ปิดการเชื่อมต่อ'
        onCancel={() => setConfirmDisable(false)}
        onClose={() => setConfirmDisable(false)}
        onConfirm={() => { patchRoot('enabled', false); setConfirmDisable(false); auditAdmin('ปิดการเชื่อมต่อ Directory Service'); }}
      />

      <div className='flex flex-col flex-1 min-w-0' style={{ paddingTop: 'var(--dim-space-600, 24px)', paddingRight: 'var(--dim-space-600, 24px)', paddingBottom: 'var(--dim-space-600, 24px)', paddingLeft: 'var(--dim-space-600, 24px)', gap: 'var(--dim-space-500, 20px)' }}>
        <PermissionGate feature='system.settings' featureLabel='ตั้งค่าระบบ'>
          {(readOnly) => (
            <>
              {readOnly ? <ReadOnlyNotice feature='การตั้งค่า Directory Service' /> : null}
              <Alert
                type='warning'
                title='ข้อจำกัด: หน้านี้เป็น UI + mock ยังไม่เชื่อม IdP จริง'
                subtext={'ค่าที่กรอกถูกเก็บใน localStorage ของเบราว์เซอร์เท่านั้น ปุ่ม "ทดสอบการเชื่อมต่อ" และ "Sync ตอนนี้" '
                  + 'จำลองผลลัพธ์จากค่าที่กรอก ไม่ได้ยิงไปยัง IdP จริง และการเข้าสู่ระบบจริงยังเป็น mock auth ที่หน้า /login'}
              />
              {copied ? <Alert type='success' title={copied} onClose={() => setCopied('')} /> : null}
              {saved ? <Alert type='success' title='บันทึกสำเร็จ' subtext={saved} onClose={() => setSaved('')} /> : null}

              {activeTab === 'connection' ? renderConnection(readOnly) : null}
              {activeTab === 'attributes' ? renderAttributes(readOnly) : null}
              {activeTab === 'groups' ? renderGroups(readOnly) : null}
              {activeTab === 'sync' ? renderSync(readOnly) : null}

              <section
                className='bg-surface-card rounded-card shadow-card flex flex-wrap items-center w-full sticky bottom-0'
                style={{
                  gap: 'var(--dim-space-300, 12px)',
                  paddingTop: 'var(--dim-space-400, 16px)',
                  paddingBottom: 'var(--dim-space-400, 16px)',
                  paddingLeft: 'var(--dim-space-500, 20px)',
                  paddingRight: 'var(--dim-space-500, 20px)',
                  zIndex: 60,
                }}
              >
                <div className='flex-1 min-w-0 flex items-center flex-wrap' style={{ gap: 'var(--dim-space-300, 12px)' }}>
                  <LastEditedNote by={lastSync?.by} at={lastSync?.at} prefix='sync ล่าสุดโดย' />
                  {dirty ? <ColorfulBadge style='orange' size='small' icon='edit'>มีการแก้ไขที่ยังไม่บันทึก</ColorfulBadge> : null}
                </div>
                <NeutralSubdueButton variant='outline' size='md' onClick={handleCancel}>ยกเลิก</NeutralSubdueButton>
                <BrandButton size='md' leadingIcon='save' disabled={readOnly} onClick={handleSave}>บันทึกการตั้งค่า</BrandButton>
              </section>
            </>
          )}
        </PermissionGate>
      </div>
    </QueuePageShell>
  );
};

export default DirectoryServicePage;
