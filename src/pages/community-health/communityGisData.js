/* Mock data for the GIS map — ported from claude/Community
   community-gis.html (the "#gmap" widget instance, id="gmapWorld").

   The prototype's pin buttons carry data-title/data-sub/data-rows/data-badge/
   data-href as ad-hoc strings baked into that one page. Rather than
   re-typing a second, drifting copy of "บ้านเลขที่ 12 / ชุมชนดินแดง / 4 คน"
   here, this module *derives* the pin list from the mock registries the
   sibling list/detail pages already use (communityHouseholdData.js,
   communityChcData.js, communityVolunteerData.js) — so clicking a pin and
   opening its target route shows the same person/house/center everywhere.
   Percent coordinates (left/top) are kept as close as possible to the
   prototype's hand-placed layout for the matching kind + index.

   Kinds are scoped to the three the GIS page's legend and task call for —
   house / chc / vol. The prototype's 4th kind ("จุดสำรวจ" — survey pins,
   no badge/href) is dropped here; those points don't have a target page or
   a legend row of their own in the ported scope. */

import { HOUSEHOLDS, HOUSEHOLD_STATUS_META } from './communityHouseholdData';
import { CHC_LIST } from './communityChcData';
import { VOLUNTEERS } from './communityVolunteerData';

/** left%/top% lifted 1:1 from community-gis.html's 10 house pins (in
    document order) — kept even though the underlying households here are
    the shared mock registry's h1..h10, not the prototype's one-off rows. */
const HOUSE_POSITIONS = [
  { x: 30, y: 30 }, { x: 41, y: 25 }, { x: 37, y: 45 }, { x: 47, y: 39 },
  { x: 54, y: 33 }, { x: 33, y: 56 }, { x: 61, y: 51 }, { x: 27, y: 67 },
  { x: 66, y: 69 }, { x: 50, y: 62 },
];

const CHC_POSITIONS = { 'chc-4': { x: 72, y: 21 } };

const VOLUNTEER_POSITIONS = {
  '001': { x: 57, y: 19 }, // อสส. สมใจ ใจดี
  '003': { x: 64, y: 78 }, // อสส. หญิงจิต สมหวัง
};

const houseStatusBadge = (status) => {
  const meta = HOUSEHOLD_STATUS_META[status];
  if (!meta) return { label: 'ไม่ระบุ', tone: 'neutral' };
  if (status === 'surveyed') return { label: meta.label, tone: 'success' };
  if (status === 'inProgress') return { label: meta.label, tone: 'warning' };
  return { label: meta.label, tone: 'neutral' };
};

/** House pins — one per shared mock household (h1..h10), so "ไปที่บ้าน"
    lands on a real HouseholdDetailPage row instead of a dangling id. */
const HOUSE_PINS = HOUSEHOLDS.map((h, i) => {
  const badge = houseStatusBadge(h.status);
  return {
    id: `house-${h.id}`,
    kind: 'house',
    ...HOUSE_POSITIONS[i % HOUSE_POSITIONS.length],
    title: `บ้านเลขที่ ${h.houseNo}`,
    sub: h.community,
    rows: [
      ['เจ้าบ้าน', h.head],
      ['สมาชิกในบ้าน', `${h.memberCount} คน`],
      ['อสส. ผู้รับผิดชอบ', h.volunteer],
      ['สำรวจล่าสุด', h.surveyDate],
    ],
    badge,
    route: `/community-health/household/${h.id}`,
    routeLabel: 'ไปที่บ้านเลขที่นี้',
  };
});

/** ศูนย์บริการสาธารณสุข pins — from the same 6-row registry chc-detail.html
    reads; only chc-4 has a hand-placed position in the source prototype so
    only it ships as a pin here (see task scope: "starting dataset"). */
const CHC_PINS = CHC_LIST.filter((c) => CHC_POSITIONS[c.id]).map((c) => ({
  id: `chc-${c.id}`,
  kind: 'chc',
  ...CHC_POSITIONS[c.id],
  title: c.name,
  sub: 'ศูนย์บริการสาธารณสุข',
  rows: [
    ['ที่อยู่', c.address],
    ['ชุมชนที่รับผิดชอบ', `${c.communities.length} ชุมชน`],
    ['อสส. ในสังกัด', `${c.volunteerCount} คน`],
  ],
  badge: null,
  route: `/community-health/chc/${c.id}`,
  routeLabel: 'ไปที่ศูนย์บริการสาธารณสุข',
}));

/** อสส. (community health volunteer) pins — same two people the prototype
    placed on the map (อสส.001 สมใจ ใจดี, อสส.003 หญิงจิต สมหวัง). */
const VOLUNTEER_PINS = VOLUNTEERS.filter((v) => VOLUNTEER_POSITIONS[v.id]).map((v) => ({
  id: `vol-${v.id}`,
  kind: 'vol',
  ...VOLUNTEER_POSITIONS[v.id],
  title: `อสส. ${v.name}`,
  sub: 'อาสาสมัครสาธารณสุข (อสส.)',
  rows: [
    ['บ้านที่รับผิดชอบ', `${v.houses} หลัง`],
    ['ชุมชน', v.community],
    ['เบอร์ติดต่อ', v.phone],
  ],
  badge: v.status === 'active' ? { label: 'ปฏิบัติงาน', tone: 'success' } : { label: 'พ้นสภาพ', tone: 'neutral' },
  route: `/community-health/volunteer/${v.id}`,
  routeLabel: 'ไปที่โปรไฟล์ อสส.',
}));

export const GIS_PINS = [...HOUSE_PINS, ...CHC_PINS, ...VOLUNTEER_PINS];

/** Legend + pin styling meta — colors alias PHCIS_CHART (design.md tokens)
    instead of the prototype's raw #059669/#2563eb/#db2777, per CLAUDE.md.
    Picked the closest hue for each: teal for house (green), indigo for chc
    (blue — PHCIS_CHART has no blue swatch), pink for vol (matches exactly). */
export const GIS_KIND_META = {
  house: { label: 'บ้าน', icon: 'home' },
  chc: { label: 'ศูนย์บริการสาธารณสุข', icon: 'local_hospital' },
  vol: { label: 'อสส.', icon: 'volunteer_activism' },
};

/** Layer switcher — the prototype swaps a background image per layer; this
    port has no tile imagery to swap (out of scope), so each layer instead
    tints the map surface with a distinct design-token background, same
    "decorative, not a real basemap" spirit as the source. */
export const GIS_LAYERS = [
  { key: 'roads', label: 'แผนที่ถนน' },
  { key: 'satellite', label: 'ภาพถ่ายดาวเทียม' },
  { key: 'terrain', label: 'ภูมิประเทศ' },
];
