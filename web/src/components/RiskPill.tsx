import React from 'react';
import type { HourStatus, RiskLevel } from '../api/types';

interface RiskPillProps {
  level?: RiskLevel | HourStatus | string | null;
  label?: string;
  className?: string;
}

export const RiskPill: React.FC<RiskPillProps> = ({ level, label, className = '' }) => {
  const safeLevel = (level || 'LOW').toString();
  const normalized = safeLevel.toLowerCase();
  const displayLabel = label || safeLevel;

  return (
    <span className={`risk-pill ${normalized} ${className}`.trim()}>
      <span className="risk-pill-dot" aria-hidden="true" />
      <span>{displayLabel}</span>
    </span>
  );
};
