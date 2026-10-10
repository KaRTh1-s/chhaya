import React from 'react';
import type { RiskLevel } from '../api/types';

export interface BarChartItem {
  label: string;
  counts: Record<RiskLevel, number>;
  totalHours: number;
}

interface BarChartProps {
  data: BarChartItem[];
  height?: number;
}

const RISK_COLORS: Record<RiskLevel, string> = {
  WORK: 'var(--color-risk-work, #10b981)',
  CAUTION: 'var(--color-risk-caution, #3b82f6)',
  REDUCED: 'var(--color-risk-reduced, #eab308)',
  AVOID: 'var(--color-risk-avoid, #f97316)',
  REST: 'var(--color-risk-rest, #ef4444)',
};

const RISK_ORDER: RiskLevel[] = ['WORK', 'CAUTION', 'REDUCED', 'AVOID', 'REST'];

export const BarChart: React.FC<BarChartProps> = ({ data, height = 220 }) => {
  if (!data || data.length === 0) {
    return <div className="bar-chart-empty">No distribution data available</div>;
  }

  const maxHours = Math.max(...data.map((d) => d.totalHours), 24);
  const chartWidth = 600;
  const paddingLeft = 110;
  const paddingRight = 40;
  const paddingTop = 20;
  const paddingBottom = 40;
  const plotWidth = chartWidth - paddingLeft - paddingRight;
  const plotHeight = height - paddingTop - paddingBottom;
  const rowHeight = plotHeight / data.length;

  return (
    <div className="custom-barchart-container" style={{ width: '100%', overflowX: 'auto' }}>
      <svg
        viewBox={`0 0 ${chartWidth} ${height}`}
        style={{ width: '100%', maxWidth: `${chartWidth}px`, height: 'auto', display: 'block', margin: '0 auto' }}
        aria-label="Risk hours distribution horizontal bar chart"
      >
        {/* Background grid lines */}
        {[0, 6, 12, 18, 24].map((h) => {
          const x = paddingLeft + (h / maxHours) * plotWidth;
          return (
            <g key={h}>
              <line
                x1={x}
                y1={paddingTop}
                x2={x}
                y2={paddingTop + plotHeight}
                stroke="var(--border, #333)"
                strokeDasharray="3 3"
                strokeWidth="1"
              />
              <text
                x={x}
                y={paddingTop + plotHeight + 16}
                textAnchor="middle"
                fontSize="11"
                fill="var(--text-muted, #888)"
                fontFamily="var(--font-mono, monospace)"
              >
                {h}h
              </text>
            </g>
          );
        })}

        {/* Rows */}
        {data.map((item, rowIdx) => {
          const y = paddingTop + rowIdx * rowHeight + rowHeight * 0.15;
          const barH = rowHeight * 0.7;
          let currentX = paddingLeft;

          return (
            <g key={item.label}>
              {/* Row Label */}
              <text
                x={paddingLeft - 10}
                y={y + barH / 2 + 4}
                textAnchor="end"
                fontSize="12"
                fontWeight="600"
                fill="var(--text-primary, #fff)"
                fontFamily="var(--font-sans, sans-serif)"
              >
                {item.label}
              </text>

              {/* Stacked Segments */}
              {RISK_ORDER.map((risk) => {
                const count = item.counts[risk] || 0;
                if (count <= 0) return null;
                const segWidth = (count / maxHours) * plotWidth;
                const segX = currentX;
                currentX += segWidth;

                return (
                  <g key={risk}>
                    <rect
                      x={segX}
                      y={y}
                      width={segWidth}
                      height={barH}
                      fill={RISK_COLORS[risk]}
                      rx="3"
                      opacity="0.9"
                    >
                      <title>{`${item.label}: ${count}h in ${risk}`}</title>
                    </rect>
                    {segWidth > 18 && (
                      <text
                        x={segX + segWidth / 2}
                        y={y + barH / 2 + 3.5}
                        textAnchor="middle"
                        fontSize="10"
                        fontWeight="700"
                        fill="#000"
                        fontFamily="var(--font-mono, monospace)"
                      >
                        {count}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="barchart-legend" style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
        {RISK_ORDER.map((risk) => (
          <div key={risk} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem' }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: RISK_COLORS[risk] }} />
            <span style={{ color: 'var(--text-secondary, #aaa)', fontWeight: 500 }}>{risk}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
