import React from 'react';

interface StatBlockProps {
  number: string | number;
  label: string;
  unit?: string;
  subnote?: string;
  isSeeded?: boolean;
  className?: string;
}

export const StatBlock: React.FC<StatBlockProps> = ({
  number,
  label,
  unit,
  subnote,
  isSeeded,
  className = '',
}) => {
  const displayVal = number === 0 ? '0' : number;

  return (
    <div className={`stat-block ${className}`.trim()}>
      <div className="stat-number">
        {displayVal}
        {unit && <span style={{ fontSize: '0.55em', marginLeft: '4px' }}>{unit}</span>}
      </div>
      <div className="stat-label">{label}</div>
      {subnote && (
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', opacity: 0.7, marginTop: '4px' }}>
          {subnote}
        </div>
      )}
      {isSeeded && (
        <div style={{ marginTop: '6px' }}>
          <span className="badge-demo" style={{ fontSize: '0.65rem' }}>
            demo counter
          </span>
        </div>
      )}
    </div>
  );
};
