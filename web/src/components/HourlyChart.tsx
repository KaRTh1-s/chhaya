import React from 'react';
import type { HourPlan, Workload } from '../api/types';

interface HourlyChartProps {
  hours: HourPlan[];
  workload?: Workload;
  shiftStart?: number;
  shiftEnd?: number;
  className?: string;
}

export const HourlyChart: React.FC<HourlyChartProps> = ({
  hours,
  workload = 'HEAVY',
  shiftStart = 6,
  shiftEnd = 20,
  className = '',
}) => {
  if (!hours || hours.length === 0) return null;

  // Working default continuous work limits
  const wbgtLimit = workload === 'LIGHT' ? 30 : workload === 'MODERATE' ? 28 : 26;

  const width = 800;
  const height = 240;
  const padding = { top: 25, right: 40, bottom: 35, left: 45 };

  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const maxWbgt = Math.max(38, ...hours.map((h) => h.wbgt_c + 2));
  const minWbgt = Math.min(18, ...hours.map((h) => h.wbgt_c - 2));

  const getX = (hourIndex: number) => {
    return padding.left + (hourIndex / (hours.length - 1)) * chartWidth;
  };

  const getY = (val: number) => {
    const clamped = Math.max(minWbgt, Math.min(maxWbgt, val));
    return padding.top + chartHeight - ((clamped - minWbgt) / (maxWbgt - minWbgt)) * chartHeight;
  };

  // Generate SVG path for WBGT curve
  const points = hours.map((h, idx) => `${getX(idx)},${getY(h.wbgt_c)}`).join(' ');
  const areaPoints = `${getX(0)},${padding.top + chartHeight} ${points} ${getX(hours.length - 1)},${padding.top + chartHeight}`;

  const limitY = getY(wbgtLimit);

  // Shift window shading
  const shiftStartX = getX(Math.max(0, Math.min(23, shiftStart)));
  const shiftEndX = getX(Math.max(0, Math.min(23, shiftEnd)));
  const shiftWidth = Math.max(0, shiftEndX - shiftStartX);

  return (
    <div className={`hourly-chart-container ${className}`.trim()} style={{ width: '100%', overflowX: 'auto' }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: '100%', minWidth: '560px', height: 'auto', display: 'block' }}
        role="img"
        aria-label="24-hour WBGT heat stress curve vs safe workload limit"
      >
        <defs>
          <linearGradient id="wbgtGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#EA580C" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#EA580C" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Shift Window Highlight */}
        {shiftWidth > 0 && (
          <rect
            x={shiftStartX}
            y={padding.top}
            width={shiftWidth}
            height={chartHeight}
            fill="rgba(4, 80, 74, 0.07)"
            rx="4"
          />
        )}

        {/* Horizontal grid lines */}
        {[20, 25, 30, 35].map((level) => {
          if (level < minWbgt || level > maxWbgt) return null;
          const yPos = getY(level);
          return (
            <g key={level}>
              <line
                x1={padding.left}
                y1={yPos}
                x2={width - padding.right}
                y2={yPos}
                stroke="rgba(27, 27, 27, 0.08)"
                strokeDasharray="4 4"
              />
              <text
                x={padding.left - 8}
                y={yPos + 4}
                textAnchor="end"
                fontFamily="var(--font-mono)"
                fontSize="10"
                fill="var(--color-ink-light)"
              >
                {level}&deg;C
              </text>
            </g>
          );
        })}

        {/* Safe Workload Limit Line */}
        <line
          x1={padding.left}
          y1={limitY}
          x2={width - padding.right}
          y2={limitY}
          stroke="var(--color-ember)"
          strokeWidth="1.5"
          strokeDasharray="6 3"
        />
        <text
          x={width - padding.right}
          y={limitY - 6}
          textAnchor="end"
          fontFamily="var(--font-mono)"
          fontSize="10"
          fill="var(--color-ember)"
          fontWeight="600"
        >
          {workload} LIMIT ({wbgtLimit}&deg;C)
        </text>

        {/* WBGT Area & Line */}
        <polygon points={areaPoints} fill="url(#wbgtGrad)" />
        <polyline
          fill="none"
          stroke="#EA580C"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />

        {/* Data points */}
        {hours.map((h, idx) => {
          const cx = getX(idx);
          const cy = getY(h.wbgt_c);
          const isDanger = h.wbgt_c > wbgtLimit;
          return (
            <circle
              key={idx}
              cx={cx}
              cy={cy}
              r={isDanger ? 3.5 : 2}
              fill={isDanger ? 'var(--status-avoid)' : '#EA580C'}
            />
          );
        })}

        {/* X-axis Hour Labels */}
        {hours.map((h, idx) => {
          if (idx % 3 !== 0 && idx !== hours.length - 1) return null;
          const cx = getX(idx);
          const hourNum = new Date(h.hour).getHours();
          const label = `${hourNum.toString().padStart(2, '0')}:00`;
          return (
            <text
              key={idx}
              x={cx}
              y={height - padding.bottom + 18}
              textAnchor="middle"
              fontFamily="var(--font-mono)"
              fontSize="10"
              fill="var(--color-ink-muted)"
            >
              {label}
            </text>
          );
        })}
      </svg>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', padding: '0 8px', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-ink-muted)' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '12px', height: '3px', backgroundColor: '#EA580C', display: 'inline-block' }} />
            <span>WBGT Heat Stress (&deg;C)</span>
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '12px', height: '2px', borderTop: '2px dashed var(--color-ember)', display: 'inline-block' }} />
            <span>Continuous Limit ({wbgtLimit}&deg;C)</span>
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '12px', height: '10px', backgroundColor: 'rgba(4, 80, 74, 0.15)', display: 'inline-block', borderRadius: '2px' }} />
            <span>Preferred Shift Window</span>
          </span>
        </div>
        <div>Source: Open-Meteo / CAMS modelled data</div>
      </div>
    </div>
  );
};
