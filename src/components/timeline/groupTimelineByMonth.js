/** Shared Thai month labels + grouping helpers for vertical timelines. */

export const THAI_TIMELINE_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

/** แปลง "4 มีนาคม 2569 · 11:20" → { monthLabel, sortKey, instant } */
export const parseThaiTimelineDateTime = (dateTime) => {
  const raw = String(dateTime || '').trim();
  const monthIdx = THAI_TIMELINE_MONTHS.findIndex((m) => raw.includes(m));
  const yearMatch = raw.match(/(25\d{2}|20\d{2})/);
  const dayMatch = raw.match(/^(\d{1,2})\s/);
  const timeMatch = raw.match(/(\d{1,2}:\d{2})/);
  const year = yearMatch ? Number(yearMatch[1]) : 0;
  const month = monthIdx >= 0 ? monthIdx : 0;
  const day = dayMatch ? Number(dayMatch[1]) : 0;
  const [hh = 0, mm = 0] = (timeMatch?.[1] || '0:0').split(':').map(Number);
  const buddhistYear = year >= 2400 ? year : year > 0 ? year + 543 : 0;
  const monthLabel = monthIdx >= 0 && buddhistYear
    ? `${THAI_TIMELINE_MONTHS[monthIdx]} ${buddhistYear}`
    : 'ไม่ระบุเดือน';
  const sortKey = buddhistYear * 100 + month;
  const instant = buddhistYear * 1e10 + month * 1e8 + day * 1e6 + hh * 100 + mm;
  return { monthLabel, sortKey, instant };
};

/** จัดกลุ่มรายการ timeline ตามเดือน (ล่าสุดอยู่บน) */
export const groupTimelineEventsByMonth = (events, getDateTime = (ev) => ev.dateTime) => {
  const map = new Map();
  events.forEach((ev) => {
    const meta = parseThaiTimelineDateTime(getDateTime(ev));
    const enriched = { ...ev, _monthLabel: meta.monthLabel, _monthSort: meta.sortKey, _instant: meta.instant };
    if (!map.has(meta.monthLabel)) {
      map.set(meta.monthLabel, { label: meta.monthLabel, sortKey: meta.sortKey, events: [] });
    }
    map.get(meta.monthLabel).events.push(enriched);
  });
  const groups = [...map.values()];
  groups.forEach((g) => {
    g.events.sort((a, b) => b._instant - a._instant);
  });
  groups.sort((a, b) => b.sortKey - a.sortKey);
  return groups;
};
