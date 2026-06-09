import React from 'react';

const base = (size = 16) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
});

const filled = (size = 16) => ({
  width: size,
  height: size,
  viewBox: '0 -960 960 960',
  fill: 'currentColor',
});

export const Icon = ({ name, size = 16, className = '', style, ...rest }) => {
  const s = { ...base(size) };
  const f = { ...filled(size) };
  switch (name) {
    case 'apps':
      return (
        <svg {...s} className={className} style={style}><rect x='3' y='3' width='7' height='7' /><rect x='14' y='3' width='7' height='7' /><rect x='14' y='14' width='7' height='7' /><rect x='3' y='14' width='7' height='7' /></svg>
      );
    case 'home':
      return (
        <svg {...s} className={className} style={style}><path d='M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1V9.5z' /></svg>
      );
    case 'map-pin':
      return (
        <svg {...s} className={className} style={style}><path d='M12 22s7-7 7-12a7 7 0 1 0-14 0c0 5 7 12 7 12z' /><circle cx='12' cy='10' r='2.5' /></svg>
      );
    case 'chevron-down':
      return (<svg {...s} className={className} style={style}><polyline points='6 9 12 15 18 9' /></svg>);
    case 'chevron-left':
      return (<svg {...s} className={className} style={style}><polyline points='15 6 9 12 15 18' /></svg>);
    case 'chevron-right':
      return (<svg {...s} className={className} style={style}><polyline points='9 6 15 12 9 18' /></svg>);
    case 'calendar':
      return (
        <svg {...s} className={className} style={style}><rect x='3' y='5' width='18' height='16' rx='2' /><path d='M16 3v4M8 3v4M3 11h18' /></svg>
      );
    case 'book':
      return (<svg {...s} className={className} style={style}><path d='M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z' /><path d='M4 19.5V21h15.5' /></svg>);
    case 'bar-chart':
      return (<svg {...s} className={className} style={style}><line x1='12' y1='20' x2='12' y2='10' /><line x1='18' y1='20' x2='18' y2='4' /><line x1='6' y1='20' x2='6' y2='14' /></svg>);
    case 'face':
      return (<svg {...s} className={className} style={style}><circle cx='12' cy='12' r='9' /><circle cx='9' cy='10' r='1' /><circle cx='15' cy='10' r='1' /><path d='M8 15c1 1 2.5 1.5 4 1.5s3-.5 4-1.5' /></svg>);
    case 'stethoscope':
      return (<svg {...s} className={className} style={style}><path d='M5 3v6a4 4 0 0 0 8 0V3' /><circle cx='17' cy='14' r='2' /><path d='M9 13v2a4 4 0 0 0 8 0v-1' /></svg>);
    /* PHCIS Step 7 cert-type row (Figma 226:32124) — Material Outlined paths. */
    case 'sick':
      return (
        <svg {...s} className={className} style={style}>
          <path d='M12 4a4 4 0 0 1 4 4v1h1a3 3 0 0 1 3 3v4a3 3 0 0 1-3 3h-1v1a4 4 0 0 1-8 0v-1H7a3 3 0 0 1-3-3v-4a3 3 0 0 1 3-3h1V8a4 4 0 0 1 4-4z' />
          <path d='M12 8v4' />
          <path d='M10 14h4' />
        </svg>
      );
    case 'balance':
      return (
        <svg {...s} className={className} style={style}>
          <path d='M12 3v18' />
          <path d='M5 7h14' />
          <path d='M8 7L4 13h4l-2 4' />
          <path d='M16 7l4 6h-4l2 4' />
        </svg>
      );
    case 'flights_and_hotels':
    case 'flight':
      return (
        <svg {...s} className={className} style={style}>
          <path d='M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V23l3.5-1L17 21v-5.5l4 2.5z' />
        </svg>
      );
    case 'pill':
      return (
        <svg {...f} className={className} style={style}>
          <path d='M345-120q-94 0-159.5-65.5T120-345q0-45 17-86t49-73l270-270q32-32 73-49t86-17q94 0 159.5 65.5T840-615q0 45-17 86t-49 73L504-186q-32 32-73 49t-86 17Zm266-286 107-106q20-20 31-47t11-56q0-60-42.5-102.5T615-760q-29 0-56 11t-47 31L406-611l205 205ZM345-200q29 0 56-11t47-31l106-107-205-205-107 106q-20 20-31 47t-11 56q0 60 42.5 102.5T345-200Z' />
        </svg>
      );
    case 'radiology':
      return (
        <svg {...f} className={className} style={style}>
          <path d='M200-80q-33 0-56.5-23.5T120-160v-560q0-33 23.5-56.5T200-800h40v-80h80v80h320v-80h80v80h40q33 0 56.5 23.5T840-720v560q0 33-23.5 56.5T760-80H200Zm0-80h560v-560H200v560Zm160 0v-72l-72-84q-11-11-19.5-30t-8.5-44q0-13 2.5-25.5T271-440q-5-11-8-23.5t-3-26.5q0-25 8.5-44t19.5-30l72-84v-72h60v83q0 5-7 19l-80 94q-7 8-10 16.5t-3 17.5q0 20 13 34.5t33 14.5q9 0 17-3t14-10q17-17 38.5-26t44.5-9q23 0 44.5 9t38.5 26q7 7 15 10t16 3q20 0 33-14.5t13-33.5q0-9-3.5-17.5T627-523l-80-95q-4-4-5.5-9t-1.5-10v-83h60v72l73 86q14 16 20.5 34.5T700-489q0 13-3.5 25.5T688-440q6 12 9 24.5t3 25.5q0 25-8.5 44T672-316l-72 84v72h-60v-83q0-6 7-19l80-94q7-8 10-17t3-18q-11 5-22 7.5t-23 2.5q-20 0-40-8t-35-24q-7-8-17.5-12t-22.5-4q-11 0-21.5 4T440-413q-15 16-34.5 24t-39.5 8q-12 0-23.5-2.5T320-391q0 9 3 18t10 17l80 94q3 5 5 9.5t2 9.5v83h-60Zm-160 0v-560 560Z' />
        </svg>
      );
    case 'biotech':
      return (
        <svg {...f} className={className} style={style}>
          <path d='M200-120v-80h200v-80q-83 0-141.5-58.5T200-480q0-61 33.5-111t90.5-73q8-34 35.5-55t62.5-21l-22-62 38-14-14-36 76-28 12 38 38-14 110 300-38 14 14 38-76 28-12-38-38 14-24-66q-15 14-34.5 21t-39.5 5q-22-2-41-13.5T338-582q-27 16-42.5 43T280-480q0 50 35 85t85 35h320v80H520v80h240v80H200Zm346-458 36-14-68-188-38 14 70 188Zm-97.5-33.5Q460-623 460-640t-11.5-28.5Q437-680 420-680t-28.5 11.5Q380-657 380-640t11.5 28.5Q403-600 420-600t28.5-11.5ZM546-578Zm-126-62Zm0 0Z' />
        </svg>
      );
    case 'baht':
      return (
        <svg width={size} height={size} viewBox='0 0 20 20' fill='currentColor' className={className} style={style}>
          <path d='M7.5 2v1.6H6.2c-1 0-1.8.8-1.8 1.8v8.9c0 1 .8 1.8 1.8 1.8h1.3V18h1.6v-1.9h1.5v1.9h1.6v-1.95c1.9-.27 3.4-1.92 3.4-3.93 0-1.2-.55-2.27-1.4-2.97.46-.6.74-1.35.74-2.16 0-1.83-1.4-3.34-3.2-3.5V2H9.1v1.6H7.5V2zm0 3.2H11c1.05 0 1.9.86 1.9 1.92S12.05 9.05 11 9.05H7.5V5.2zm0 5.45h3.8c1.27 0 2.3 1.04 2.3 2.32s-1.03 2.32-2.3 2.32H6.5c-.28 0-.5-.22-.5-.5v-4.14h1.5z' />
        </svg>
      );
    case 'history':
      return (<svg {...s} className={className} style={style}><path d='M3 12a9 9 0 1 0 3-6.7L3 8' /><polyline points='3 3 3 8 8 8' /><polyline points='12 7 12 12 15 14' /></svg>);
    /* Lucide Clock — circle + hour/minute hands. Used in Schedule Mgmt
       tab "รอจัดตารางเวร" (Figma 16:52474). */
    case 'clock':
      return (<svg {...s} className={className} style={style}><circle cx='12' cy='12' r='10' /><polyline points='12 6 12 12 16 14' /></svg>);
    case 'users':
      return (<svg {...s} className={className} style={style}><path d='M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2' /><circle cx='9' cy='7' r='4' /><path d='M22 21v-2a4 4 0 0 0-3-3.87' /><path d='M16 3.13a4 4 0 0 1 0 7.75' /></svg>);
    case 'bell':
      return (<svg {...s} className={className} style={style}><path d='M18 16v-5a6 6 0 1 0-12 0v5l-2 2h16z' /><path d='M10 21a2 2 0 0 0 4 0' /></svg>);
    case 'clipboard':
      return (<svg {...s} className={className} style={style}><rect x='8' y='4' width='8' height='3' rx='1' /><path d='M16 6h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2' /></svg>);
    /* Figma PHCIS | OPD 299:52792 — copy MR row into "บันทึกประวัติใหม่".
       Lucide-aligned overlapping rects, same stroke contract as `plus`. */
    case 'copy':
      return (
        <svg {...s} className={className} style={style}>
          <rect x='8' y='8' width='13' height='13' rx='2' ry='2' />
          <path d='M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1' />
        </svg>
      );
    case 'plus':
      return (<svg {...s} className={className} style={style}><line x1='12' y1='5' x2='12' y2='19' /><line x1='5' y1='12' x2='19' y2='12' /></svg>);
    case 'minus':
      return (<svg {...s} className={className} style={style}><line x1='5' y1='12' x2='19' y2='12' /></svg>);
    case 'activity':
      return (<svg {...s} className={className} style={style}><polyline points='22 12 18 12 15 21 9 3 6 12 2 12' /></svg>);
    case 'check':
      return (<svg {...s} className={className} style={style}><polyline points='20 6 9 17 4 12' /></svg>);
    case 'menu':
      return (<svg {...s} className={className} style={style}><line x1='3' y1='6' x2='21' y2='6' /><line x1='3' y1='12' x2='21' y2='12' /><line x1='3' y1='18' x2='21' y2='18' /></svg>);
    case 'kebab-vertical':
      return (
        <svg {...s} className={className} style={style}>
          <circle cx='12' cy='6.5' r='1.25' fill='currentColor' />
          <circle cx='12' cy='12' r='1.25' fill='currentColor' />
          <circle cx='12' cy='17.5' r='1.25' fill='currentColor' />
        </svg>
      );
    case 'smile':
      return (<svg {...s} className={className} style={style}><circle cx='12' cy='12' r='10' /><circle cx='9' cy='10' r='1' /><circle cx='15' cy='10' r='1' /><path d='M8 14.5c1 1.2 2.5 2 4 2s3-.8 4-2' /></svg>);
    case 'meh':
      return (<svg {...s} className={className} style={style}><circle cx='12' cy='12' r='10' /><circle cx='9' cy='10' r='1' /><circle cx='15' cy='10' r='1' /><line x1='8' y1='15' x2='16' y2='15' /></svg>);
    case 'frown':
      return (<svg {...s} className={className} style={style}><circle cx='12' cy='12' r='10' /><circle cx='9' cy='10' r='1' /><circle cx='15' cy='10' r='1' /><path d='M8 16.5c1-1.2 2.5-2 4-2s3 .8 4 2' /></svg>);
    case 'fast-forward':
      return (<svg {...s} className={className} style={style}><polygon points='4 5 13 12 4 19 4 5' /><polygon points='13 5 22 12 13 19 13 5' /></svg>);
    case 'clipboard-list':
      return (<svg {...s} className={className} style={style}><rect x='8' y='3' width='8' height='4' rx='1' /><path d='M16 5h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2' /><line x1='9' y1='12' x2='15' y2='12' /><line x1='9' y1='16' x2='15' y2='16' /></svg>);
    case 'file-text':
      return (<svg {...s} className={className} style={style}><path d='M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z' /><polyline points='14 2 14 8 20 8' /><line x1='8' y1='13' x2='16' y2='13' /><line x1='8' y1='17' x2='13' y2='17' /></svg>);
    case 'file':
      return (<svg {...s} className={className} style={style}><path d='M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z' /><polyline points='14 2 14 8 20 8' /></svg>);
    case 'trash':
      return (<svg {...s} className={className} style={style}><polyline points='3 6 5 6 21 6' /><path d='M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6' /><path d='M10 11v6M14 11v6' /><path d='M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2' /></svg>);
    case 'edit':
      return (<svg {...s} className={className} style={style}><path d='M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7' /><path d='M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z' /></svg>);
    case 'eye':
      return (<svg {...s} className={className} style={style}><path d='M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z' /><circle cx='12' cy='12' r='3' /></svg>);
    case 'search':
      return (<svg {...s} className={className} style={style}><circle cx='11' cy='11' r='7' /><line x1='21' y1='21' x2='16.5' y2='16.5' /></svg>);
    case 'save':
      return (<svg {...s} className={className} style={style}><path d='M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z' /><polyline points='17 21 17 13 7 13 7 21' /><polyline points='7 3 7 8 15 8' /></svg>);
    case 'pin':
      return (<svg {...s} className={className} style={style}><line x1='12' y1='17' x2='12' y2='22' /><path d='M5 17h14V11l-3-3-2 2H10l-2-2-3 3z' /></svg>);
    case 'building':
      return (
        <svg {...s} className={className} style={style}>
          <rect x='6' y='3' width='12' height='18' rx='1.5' />
          <path d='M10 21v-4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v4' />
          <line x1='9' y1='7' x2='9' y2='7' />
          <line x1='12' y1='7' x2='12' y2='7' />
          <line x1='15' y1='7' x2='15' y2='7' />
          <line x1='9' y1='10.5' x2='9' y2='10.5' />
          <line x1='12' y1='10.5' x2='12' y2='10.5' />
          <line x1='15' y1='10.5' x2='15' y2='10.5' />
          <line x1='9' y1='14' x2='9' y2='14' />
          <line x1='12' y1='14' x2='12' y2='14' />
          <line x1='15' y1='14' x2='15' y2='14' />
        </svg>
      );
    case 'language':
      return (
        <svg {...s} className={className} style={style}>
          {/* Globe icon */}
          <circle cx='12' cy='12' r='9' />
          <path d='M3 12h18' />
          <path d='M12 3a14 14 0 0 1 0 18' />
          <path d='M12 3a14 14 0 0 0 0 18' />
        </svg>
      );
    case 'arrow-left':
      return (<svg {...s} className={className} style={style}><line x1='19' y1='12' x2='5' y2='12' /><polyline points='12 19 5 12 12 5' /></svg>);
    case 'check-circle':
      return (<svg {...s} className={className} style={style}><path d='M22 11.08V12a10 10 0 1 1-5.93-9.14' /><polyline points='22 4 12 14.01 9 11.01' /></svg>);
    /* Fallback — any unknown name is rendered via the Material Symbols
       Outlined font loaded in index.html. Lets pages reference glyphs
       like 'person_add', 'apartment', 'lock_person' without growing the
       curated SVG switch above. Underscores ARE valid in Material Symbols
       names; kebab-case names hit the cases above first. */
    default:
      return (
        <span
          className={`material-symbols-outlined ${className}`}
          style={{
            fontSize: size,
            lineHeight: 1,
            display: 'inline-flex',
            verticalAlign: 'middle',
            ...style,
          }}
          aria-hidden
          {...rest}
        >
          {name}
        </span>
      );
  }
};

export default Icon;
