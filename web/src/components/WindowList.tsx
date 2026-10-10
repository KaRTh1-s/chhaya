import React from 'react';
import type { Window } from '../api/types';
import { RiskPill } from './RiskPill';

interface WindowListProps {
  windows: Window[];
  title?: string;
  emptyMessage?: string;
  className?: string;
}

export const WindowList: React.FC<WindowListProps> = ({
  windows,
  title,
  emptyMessage = 'No specific windows detected.',
  className = '',
}) => {
  const formatTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    } catch {
      return isoString;
    }
  };

  return (
    <div className={`window-list-container ${className}`.trim()}>
      {title && (
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 600, marginBottom: '8px', color: 'var(--color-forest)' }}>
          {title}
        </div>
      )}
      {windows.length === 0 ? (
        <p style={{ fontSize: '0.85rem', color: 'var(--color-ink-muted)' }}>{emptyMessage}</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {windows.map((w, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                backgroundColor: 'rgba(255, 255, 255, 0.65)',
                border: '1px solid rgba(27, 27, 27, 0.08)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 500 }}>
                {formatTime(w.start)} &ndash; {formatTime(w.end)}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-ink-muted)' }}>
                  {w.summary_code}
                </span>
                <RiskPill level={w.status} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
