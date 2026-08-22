import React, { useMemo } from 'react';
import Checkbox from '@/components/checkbox/Checkbox';
import { splitGroupsIntoRows } from '@/components/consent/FormScopeGrouping';
import { consentScopeKey } from '@/data/consentFormScopes';

const GROUP_LABEL = {
  color: 'var(--text-brandPrimary-default)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm)',
  fontWeight: 'var(--type-weight-bold)',
  lineHeight: 1.5,
};

const GROUP_TITLE_BAND = {
  ...GROUP_LABEL,
  display: 'block',
  width: '100%',
  boxSizing: 'border-box',
  margin: 0,
  padding: 'var(--dim-space-300) var(--dim-space-400)',
  background: 'var(--surface-brandPrimary-quaternary, #F4FBF8)',
  borderBottom: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary, #E2F3EB)',
};

const PANEL_BODY = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--dim-space-300)',
  padding: 'var(--dim-space-400)',
  flex: 1,
  minWidth: 0,
};

const BRANCH_TEXT = {
  color: 'var(--text-content-default)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-xs)',
  fontWeight: 'var(--type-weight-medium)',
  lineHeight: 1.5,
};

const BRANCH_TITLE_BAND = {
  ...BRANCH_TEXT,
  display: 'block',
  width: 'fit-content',
  maxWidth: '100%',
  padding: 'var(--dim-space-100) var(--dim-space-200)',
  borderRadius: 'var(--dim-radius-100, 4px)',
  background: 'var(--surface-neutral-quaternary, #F9FBFB)',
};

const BULK_LABEL = {
  fontWeight: 'var(--type-weight-bold)',
};

function BulkCheckbox({ checked, onChange, label, readOnly = false }) {
  return (
    <Checkbox
      className='w-fit max-w-full [&_span_span:first-of-type]:font-bold'
      checked={checked}
      onChange={onChange}
      label={label}
      style={BULK_LABEL}
      disabled={readOnly}
    />
  );
}

const selectionState = (items, selectedKeys) => {
  const keys = items.map((scope) => consentScopeKey(scope));
  if (!keys.length) return { all: false, none: true, some: false };
  let selectedCount = 0;
  keys.forEach((key) => { if (selectedKeys.has(key)) selectedCount += 1; });
  return {
    all: selectedCount === keys.length,
    none: selectedCount === 0,
    some: selectedCount > 0 && selectedCount < keys.length,
  };
};

const PANEL_GROUP = {
  display: 'flex',
  flexDirection: 'column',
  padding: 0,
  borderRadius: 'var(--dim-radius-200, 8px)',
  border: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary, #E2F3EB)',
  background: 'var(--surface-card-100, #FFFFFF)',
  overflow: 'hidden',
};

/** จัด catalog เป็น Group → กิจกรรมย่อย → รายการแผนก (แต่ละแถว = scope เดียว). */
function groupCatalogForEditor(catalog = []) {
  const byGroup = new Map();
  catalog.forEach((scope) => {
    const g = scope.group?.trim();
    if (!g) return;
    if (!byGroup.has(g)) byGroup.set(g, new Map());
    const byBranch = byGroup.get(g);
    const branch = scope.subBranch?.trim() || '—';
    if (!byBranch.has(branch)) byBranch.set(branch, []);
    byBranch.get(branch).push(scope);
  });
  return [...byGroup.entries()].map(([group, branchMap]) => ({
    group,
    branches: [...branchMap.entries()].map(([subBranch, items]) => ({
      subBranch,
      items,
    })),
  }));
}

function EditorGroupCard({
  group, branches, selectedKeys, onToggle, onToggleMany, stretch = false, readOnly = false,
}) {
  const allGroupItems = branches.flatMap(({ items }) => items);
  const groupState = selectionState(allGroupItems, selectedKeys);

  return (
    <div
      className={`flex flex-col min-w-0 w-full ${stretch ? 'h-full flex-1' : ''}`}
      style={{ ...PANEL_GROUP, height: stretch ? '100%' : undefined }}
    >
      <span style={GROUP_TITLE_BAND}>{group}</span>
      <div style={PANEL_BODY}>
      {onToggleMany && allGroupItems.length > 0 && (
        <BulkCheckbox
          checked={groupState.all}
          onChange={() => onToggleMany(allGroupItems, !groupState.all)}
          label={`${group}ทั้งหมด`}
          readOnly={readOnly}
        />
      )}
      <div
        className='flex flex-col min-w-0'
        style={{ gap: 'var(--dim-space-600)' }}
      >
        {branches.map(({ subBranch, items }) => {
          const branchState = selectionState(items, selectedKeys);
          return (
          <div
            key={`${group}-${subBranch}`}
            className='flex flex-col min-w-0'
            style={{ gap: 'var(--dim-space-150)' }}
          >
            <span style={BRANCH_TITLE_BAND}>{subBranch}</span>
            <ul
              className='flex flex-col min-w-0'
              style={{
                gap: 'var(--dim-space-100)',
                margin: 0,
                padding: 0,
                paddingLeft: 'var(--dim-space-300)',
                listStyle: 'none',
              }}
            >
              {onToggleMany && items.length > 0 && (
                <li className='min-w-0'>
                  <BulkCheckbox
                    checked={branchState.all}
                    onChange={() => onToggleMany(items, !branchState.all)}
                    label={`${subBranch}ทั้งหมด`}
                    readOnly={readOnly}
                  />
                </li>
              )}
              {items.map((scope) => {
                const key = consentScopeKey(scope);
                const dept = scope.dept?.trim() || '—';
                return (
                  <li key={key} className='min-w-0'>
                    <Checkbox
                      className='w-fit max-w-full'
                      checked={selectedKeys.has(key)}
                      onChange={() => onToggle(scope)}
                      label={dept}
                      disabled={readOnly}
                    />
                  </li>
                );
              })}
            </ul>
          </div>
          );
        })}
      </div>
      </div>
    </div>
  );
}

/** แก้ไข กิจกรรม / กิจกรรมย่อย / แผนก — checkbox ครบ catalog · tick = เข้าถึงได้. */
export default function FormScopeEditor({
  catalog = [], selectedKeys, onToggle, onToggleMany, columns = 1, readOnly = false,
}) {
  const grouped = useMemo(() => groupCatalogForEditor(catalog), [catalog]);
  const groupRows = useMemo(
    () => splitGroupsIntoRows(grouped, columns),
    [grouped, columns],
  );

  if (!grouped.length) {
    return (
      <span
        style={{
          color: 'var(--text-content-tertiary)',
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-sm)',
          lineHeight: 1.5,
        }}
      >
        —
      </span>
    );
  }

  const groupGap = 'var(--dim-space-500)';

  const groupList = (items, stretch = false) => (
    <div className='flex flex-col w-full min-w-0' style={{ gap: groupGap }}>
      {items.map(({ group, branches }) => (
        <EditorGroupCard
          key={group}
          group={group}
          branches={branches}
          selectedKeys={selectedKeys}
          onToggle={onToggle}
          onToggleMany={onToggleMany}
          stretch={stretch}
          readOnly={readOnly}
        />
      ))}
    </div>
  );

  if (columns > 1) {
    return (
      <div className='flex flex-col w-full min-w-0' style={{ gap: groupGap }}>
        {groupRows.map((row, rowIdx) => (
          <div
            key={rowIdx}
            className='grid w-full min-w-0'
            style={{
              gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
              gap: 'var(--dim-space-600)',
              alignItems: 'stretch',
            }}
          >
            {row.map(({ group, branches }) => (
              <div key={group} className='flex min-w-0 h-full w-full'>
                <EditorGroupCard
                  group={group}
                  branches={branches}
                  selectedKeys={selectedKeys}
                  onToggle={onToggle}
                  onToggleMany={onToggleMany}
                  stretch
                  readOnly={readOnly}
                />
              </div>
            ))}
            {row.length < columns && Array.from({ length: columns - row.length }, (_, padIdx) => (
              <div key={`pad-${rowIdx}-${padIdx}`} aria-hidden className='min-w-0' />
            ))}
          </div>
        ))}
      </div>
    );
  }

  return groupList(grouped);
}
