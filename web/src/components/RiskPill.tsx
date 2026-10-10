import React from 'react';
import type { HourStatus, RiskLevel } from '../api/types';

interface RiskPillProps {
  level: RiskLevel | HourStatus | string;
  label?: string;
  className?: string;
}

export const RiskPill: React.FC<RiskPillProps> = ({ level, label, className = '' }) => {
  const normalized = level.toLowerCase();
  const displayLabel = label || level;

  return (
    <span className={`risk-pill ${normalized} ${className}`.trim()}>
      <span className="risk-pill-dot" aria-hidden="true" />
      <span>{displayLabel}</span>
    </span>
  );
};
