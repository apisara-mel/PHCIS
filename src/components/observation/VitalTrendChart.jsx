import React from 'react';

/**
 * Interactive SVG Sparkline & Multi-parameter Trend Chart for Vital Signs
 * Supports BP, Pulse, SpO2, Temp, RR with reference thresholds & point markers.
 */
export default function VitalTrendChart({ data = [], parameter = 'bp', height = 110 }) {
  if (!data || data.length === 0) {
    return <div className='text-xs text-gray-400 italic py-3 text-center'>ไม่มีข้อมูลสัญญาณชีพย้อนหลัง</div>;
  }

  const width = 500;
  const padding = 24;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  // Extract values based on parameter
  const timestamps = data.map((d) => d.time);
  let values1 = [];
  let values2 = []; // for Diastolic BP
  let minVal = 0;
  let maxVal = 100;
  let unit = '';
  let color1 = '#00875A'; // brand green
  let color2 = '#0052CC'; // blue
  let thresholdMin = null;
  let thresholdMax = null;

  if (parameter === 'bp') {
    values1 = data.map((d) => d.bpSys);
    values2 = data.map((d) => d.bpDia);
    minVal = Math.min(...values2, 50) - 10;
    maxVal = Math.max(...values1, 160) + 10;
    unit = 'mmHg';
    color1 = '#DE350B'; // Sys Red
    color2 = '#0052CC'; // Dia Blue
    thresholdMax = 140;
    thresholdMin = 90;
  } else if (parameter === 'pulse') {
    values1 = data.map((d) => d.pulse);
    minVal = Math.min(...values1, 50) - 10;
    maxVal = Math.max(...values1, 130) + 10;
    unit = 'bpm';
    color1 = '#00875A';
    thresholdMax = 100;
    thresholdMin = 60;
  } else if (parameter === 'spo2') {
    values1 = data.map((d) => d.spo2);
    minVal = Math.min(...values1, 88) - 2;
    maxVal = 100;
    unit = '%';
    color1 = '#0052CC';
    thresholdMin = 95;
  } else if (parameter === 'temp') {
    values1 = data.map((d) => d.temp);
    minVal = Math.min(...values1, 35.5) - 0.5;
    maxVal = Math.max(...values1, 39.5) + 0.5;
    unit = '°C';
    color1 = '#D97706';
    thresholdMax = 37.5;
  } else if (parameter === 'rr') {
    values1 = data.map((d) => d.rr);
    minVal = Math.min(...values1, 10) - 2;
    maxVal = Math.max(...values1, 30) + 2;
    unit = 'bpm';
    color1 = '#36B37E';
    thresholdMax = 20;
    thresholdMin = 12;
  }

  const getX = (idx) => {
    if (data.length <= 1) return width / 2;
    return padding + (idx / (data.length - 1)) * chartWidth;
  };

  const getY = (val) => {
    const range = maxVal - minVal || 1;
    return height - padding - ((val - minVal) / range) * chartHeight;
  };

  // Build SVG points line
  const points1 = values1.map((v, i) => `${getX(i)},${getY(v)}`).join(' ');
  const points2 = values2.length > 0 ? values2.map((v, i) => `${getX(i)},${getY(v)}`).join(' ') : null;

  return (
    <div className='bg-gray-50/70 rounded-xl p-2.5 border border-gray-100 w-full overflow-hidden'>
      <div className='flex items-center justify-between text-xs font-semibold mb-1.5 px-1'>
        <span className='text-gray-700 flex items-center gap-1.5 text-[11px]'>
          <span className='w-2 h-2 rounded-full' style={{ backgroundColor: color1 }} />
          {parameter === 'bp' && 'ความดันโลหิต (BP Systolic / Diastolic)'}
          {parameter === 'pulse' && 'ชีพจร (Pulse Rate)'}
          {parameter === 'spo2' && 'ออกซิเจนในเลือด (SpO2)'}
          {parameter === 'temp' && 'อุณหภูมิร่างกาย (Temperature)'}
          {parameter === 'rr' && 'อัตราการหายใจ (Respiratory Rate)'}
        </span>
        <span className='text-gray-400 font-mono text-[10px]'>หน่วย: {unit}</span>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className='w-full h-auto overflow-visible'>
        {/* Grid lines */}
        <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke='#E2E8F0' strokeDasharray='2 2' strokeWidth='0.75' />
        <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke='#E2E8F0' strokeDasharray='2 2' strokeWidth='0.75' />
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke='#CBD5E1' strokeWidth='0.75' />

        {/* Threshold lines */}
        {thresholdMax !== null && (
          <line
            x1={padding}
            y1={getY(thresholdMax)}
            x2={width - padding}
            y2={getY(thresholdMax)}
            stroke='#F87171'
            strokeDasharray='3 3'
            strokeWidth='0.75'
          />
        )}
        {thresholdMin !== null && (
          <line
            x1={padding}
            y1={getY(thresholdMin)}
            x2={width - padding}
            y2={getY(thresholdMin)}
            stroke='#38BDF8'
            strokeDasharray='3 3'
            strokeWidth='0.75'
          />
        )}

        {/* Main Trend Line 1 */}
        {values1.length > 1 ? (
          <polyline fill='none' stroke={color1} strokeWidth='1.5' points={points1} strokeLinecap='round' strokeLinejoin='round' />
        ) : null}

        {/* Trend Line 2 (Diastolic BP) */}
        {points2 && values2.length > 1 ? (
          <polyline fill='none' stroke={color2} strokeWidth='1.25' points={points2} strokeDasharray='3 2' strokeLinecap='round' strokeLinejoin='round' />
        ) : null}

        {/* Data points with values */}
        {values1.map((v, idx) => (
          <g key={`p1-${idx}`}>
            <circle cx={getX(idx)} cy={getY(v)} r='2.5' fill='#FFFFFF' stroke={color1} strokeWidth='1.5' />
            <text
              x={getX(idx)}
              y={getY(v) - 5}
              textAnchor='middle'
              fontSize='8.5'
              fontWeight='600'
              fill='#334155'
              className='font-mono'
            >
              {v}
            </text>
          </g>
        ))}

        {/* Data points for Line 2 */}
        {values2.map((v, idx) => (
          <g key={`p2-${idx}`}>
            <circle cx={getX(idx)} cy={getY(v)} r='2.5' fill='#FFFFFF' stroke={color2} strokeWidth='1.25' />
            <text
              x={getX(idx)}
              y={getY(v) + 11}
              textAnchor='middle'
              fontSize='8'
              fontWeight='500'
              fill='#64748B'
              className='font-mono'
            >
              {v}
            </text>
          </g>
        ))}

        {/* Timestamps X-axis */}
        {timestamps.map((t, idx) => (
          <text
            key={`t-${idx}`}
            x={getX(idx)}
            y={height - 4}
            textAnchor='middle'
            fontSize='7.5'
            fontWeight='500'
            fill='#64748B'
            className='font-mono'
          >
            {t.replace(/\s*น\./g, '')}
          </text>
        ))}
      </svg>
    </div>
  );
}
