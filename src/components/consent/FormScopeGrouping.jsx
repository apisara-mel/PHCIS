import React, { useMemo } from 'react';

/** รวม scopes เป็น Group Policy → สาขาย่อย → แผนก (ไม่ซ้ำ). */
export function groupFormScopes(scopes = []) {
  const byGroup = new Map();
  scopes.forEach(({ group, subBranch, dept }) => {
    const g = group?.trim();
    if (!g || g === '-') return;
    if (!byGroup.has(g)) byGroup.set(g, new Map());
    const byBranch = byGroup.get(g);
    const branch = subBranch?.trim() || '—';
    if (!byBranch.has(branch)) byBranch.set(branch, new Set());
    const d = dept?.trim();
    if (d && d !== '-') byBranch.get(branch).add(d);
  });
  return [...byGroup.entries()].map(([group, branchMap]) => ({
    group,
    branches: [...branchMap.entries()].map(([subBranch, deptSet]) => ({
      subBranch,
      depts: [...deptSet],
    })),
  }));
}

export function resolveFormScopes(source) {
  if (Array.isArray(source)) return source;
  if (source?.scopes?.length) return source.scopes;
  return [{
    group: source?.group || '-',
    subBranch: source?.subBranch || '-',
    dept: source?.dept || '-',
  }];
}

const GROUP_LABEL = {
  color: 'var(--text-brandPrimary-default)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm)',
  fontWeight: 'var(--type-weight-medium)',
  lineHeight: 1.5,
};

const BRANCH_TEXT = {
  color: 'var(--text-content-default)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-xs)',
  fontWeight: 'var(--type-weight-medium)',
  lineHeight: 1.5,
};

const DEPT_TEXT = {
  color: 'var(--text-content-tertiary)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-xs)',
  fontWeight: 'var(--type-weight-regular)',
  lineHeight: 1.5,
};

const EMPTY_TEXT = {
  color: 'var(--text-content-tertiary)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm)',
  lineHeight: 1.5,
};

const PANEL_GROUP = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--dim-space-300)',
  padding: 'var(--dim-space-400)',
  borderRadius: 'var(--dim-radius-200, 8px)',
  border: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary, #E2F3EB)',
  background: 'var(--surface-card-100, #FFFFFF)',
};

const PANEL_GROUP_LABEL = {
  ...GROUP_LABEL,
  fontWeight: 'var(--type-weight-bold)',
  paddingBottom: 'var(--dim-space-200)',
  borderBottom: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary, #E2F3EB)',
};

/** แบ่งรายการกลุ่มเป็น N คอลัมน์ (เรียงบน→ล่าง แล้วค่อยคอลัมน์ถัดไป). */
export function splitGroupsIntoColumns(grouped, columnCount = 2) {
  const n = Math.max(1, columnCount);
  if (n === 1) return [grouped];
  const size = Math.ceil(grouped.length / n);
  return Array.from({ length: n }, (_, i) => grouped.slice(i * size, (i + 1) * size))
    .filter((col) => col.length > 0);
}

/** จัดกลุ่มเป็นแถวละ N คอลัมน์ — ใช้ให้กล่องซ้าย/ขวาในแถวเดียวกันสูงเท่ากัน. */
export function splitGroupsIntoRows(grouped, columnCount = 2) {
  const n = Math.max(1, columnCount);
  const rows = [];
  for (let i = 0; i < grouped.length; i += n) {
    rows.push(grouped.slice(i, i + n));
  }
  return rows;
}

function renderPanelGroup({ group, branches }, { isPanel, branchGap, stretch = false }) {
  return (
    <div
      key={group}
      className={`flex flex-col min-w-0 ${stretch ? 'h-full flex-1' : ''}`}
      style={isPanel ? { ...PANEL_GROUP, height: stretch ? '100%' : undefined } : { gap: branchGap }}
    >
      <span style={isPanel ? PANEL_GROUP_LABEL : GROUP_LABEL}>{group}</span>
      <ul
        className='flex flex-col min-w-0'
        style={{
          gap: branchGap,
          margin: 0,
          padding: 0,
          paddingLeft: isPanel ? 'var(--dim-space-200)' : 'var(--dim-space-300)',
          listStyle: 'none',
        }}
      >
        {branches.map(({ subBranch, depts }) => (
          <li
            key={`${group}-${subBranch}`}
            className={isPanel ? 'flex flex-col min-w-0' : 'min-w-0'}
            style={isPanel ? { gap: 'var(--dim-space-050)' } : undefined}
          >
            <span style={BRANCH_TEXT}>{subBranch}</span>
            {depts.length > 0 && isPanel ? (
              <span style={{ ...DEPT_TEXT, paddingLeft: 'var(--dim-space-300)' }}>
                {depts.join(', ')}
              </span>
            ) : depts.length > 0 ? (
              <>
                <span style={{ ...DEPT_TEXT, margin: '0 var(--dim-space-100)' }}>·</span>
                <span style={DEPT_TEXT}>{depts.join(', ')}</span>
              </>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Group Policy / สาขาย่อย / แผนก — แสดงแบบจัดกลุ่ม (ไม่ใช้ badge). */
export default function FormScopeGrouping({
  scopes, source, dense = false, variant = 'inline', columns = 1,
}) {
  const grouped = useMemo(
    () => groupFormScopes(resolveFormScopes(scopes ?? source)),
    [scopes, source],
  );

  if (!grouped.length) {
    return <span style={EMPTY_TEXT}>—</span>;
  }

  const isPanel = variant === 'panel';
  const groupGap = dense
    ? 'var(--dim-space-150)'
    : isPanel
      ? 'var(--dim-space-400)'
      : 'var(--dim-space-200)';
  const branchGap = dense
    ? 'var(--dim-space-050)'
    : isPanel
      ? 'var(--dim-space-200)'
      : 'var(--dim-space-100)';
  const layoutOpts = { isPanel, branchGap };
  const groupRows = useMemo(
    () => splitGroupsIntoRows(grouped, columns),
    [grouped, columns],
  );

  const groupList = (items, stretch = false) => (
    <div className='flex flex-col w-full min-w-0' style={{ gap: groupGap }}>
      {items.map((entry) => renderPanelGroup(entry, { ...layoutOpts, stretch }))}
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
              gap: 'var(--dim-space-500)',
              alignItems: 'stretch',
            }}
          >
            {row.map((entry) => (
              <div key={entry.group} className='flex min-w-0 h-full w-full'>
                {renderPanelGroup(entry, { ...layoutOpts, stretch: true })}
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
