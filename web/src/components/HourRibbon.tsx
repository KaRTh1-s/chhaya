import React, { useState } from 'react';
import type { HourPlan } from '../api/types';

interface HourRibbonProps {
  hours: HourPlan[];
  className?: string;
  onHourClick?: (hour: HourPlan) => void;
}

export const HourRibbon: React.FC<HourRibbonProps> = ({
  hours,
  className = '',
  onHourClick,
}) => {
  const [hoveredHour, setHoveredHour] = useState<HourPlan | null>(null);

  const formatHourTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
    } catch {
      return isoString;
    }
  };

  const getHourNum = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.getHours().toString().padStart(2, '0');
    } catch {
      return '';
    }
  };

  return (
    <div className={`hour-ribbon-wrapper ${className}`.trim()}>
      <div
        className="hour-ribbon-grid"
        role="region"
        aria-label="24-hour heat and air exposure schedule"
      >
        {hours.slice(0, 24).map((h, index) => {
          const hourLabel = formatHourTime(h.hour);
          const hourNum = getHourNum(h.hour);
          const ariaText = `Hour ${hourLabel}: Status ${h.status}, WBGT ${h.wbgt_c.toFixed(1)}°C${
            h.aqi !== null ? `, AQI ${Math.round(h.aqi)}` : ''
          }. ${h.reasons.join(', ')}`;

          return (
            <div
              key={index}
              className={`hour-cell status-${h.status}`}
              tabIndex={0}
              role="button"
              aria-label={ariaText}
              onMouseEnter={() => setHoveredHour(h)}
              onMouseLeave={() => setHoveredHour(null)}
              onFocus={() => setHoveredHour(h)}
              onBlur={() => setHoveredHour(null)}
              onClick={() => {
                if (onHourClick) onHourClick(h);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  if (onHourClick) onHourClick(h);
                }
              }}
            >
              <span className="hour-cell-time">{hourNum}</span>
            </div>
          );
        })}
      </div>

      {hoveredHour && (
        <div className="hour-tooltip" role="tooltip">
          <div className="hour-tooltip-title">
            {formatHourTime(hoveredHour.hour)} &middot; {hoveredHour.status}
          </div>
          <div className="hour-tooltip-metrics">
            <span>WBGT: {hoveredHour.wbgt_c.toFixed(1)}°C</span>
            {hoveredHour.aqi !== null && <span>AQI: {Math.round(hoveredHour.aqi)}</span>}
            <span>Risk: {hoveredHour.risk_level}</span>
          </div>
          {hoveredHour.reasons.length > 0 && (
            <div style={{ fontSize: '0.75rem', opacity: 0.85, maxWidth: '240px', whiteSpace: 'normal' }}>
              {hoveredHour.reasons.join(' &middot; ')}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
