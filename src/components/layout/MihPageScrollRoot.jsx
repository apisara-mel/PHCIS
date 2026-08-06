import React from 'react';
import { MIH_SCROLL_ROOT_ATTR } from '@/hooks/useHeaderAutoHide';

/**
 * Marks a page-level scroll container so `useHeaderAutoHide` drives the
 * top Header hide/show from nested scroll (not only window/document).
 * Use on `<main>` when the layout scrolls inside a panel (`h-screen` shells).
 */
const MihPageScrollRoot = ({
  as: Tag = 'main',
  className = '',
  style,
  children,
  ...rest
}) => (
  <Tag
    {...rest}
    {...{ [MIH_SCROLL_ROOT_ATTR]: '' }}
    className={className}
    style={style}
  >
    {children}
  </Tag>
);

export default MihPageScrollRoot;
