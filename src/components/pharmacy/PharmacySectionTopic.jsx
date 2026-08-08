import React from 'react';
import Topic from '@/components/topic/Topic';

/* Flat primary Topic for pharmacy section headers — same chrome as
   ทะเบียนยา wizard / popup title (brand title weight, not bold black h2). */

const FLAT_STYLE = {
  paddingLeft: 'var(--dim-space-0)',
  paddingRight: 'var(--dim-space-0)',
  paddingTop: 'var(--dim-space-0)',
  paddingBottom: 'var(--dim-space-0)',
  background: 'transparent',
};

const PharmacySectionTopic = ({ title, subtitle, trailing, style, ...rest }) => (
  <Topic
    hierarchy='primary'
    state='default'
    title={title}
    subText={subtitle || null}
    showLeadingIcon={false}
    showSubText={Boolean(subtitle)}
    showBadge={false}
    showChevron={false}
    showSuccess={false}
    trailing={trailing}
    style={{ ...FLAT_STYLE, ...style }}
    {...rest}
  />
);

export default PharmacySectionTopic;
