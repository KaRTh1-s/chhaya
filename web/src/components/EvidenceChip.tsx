import React, { useState } from 'react';
import type { EvidenceCard } from '../api/types';

interface EvidenceChipProps {
  card: EvidenceCard;
  className?: string;
}

export const EvidenceChip: React.FC<EvidenceChipProps> = ({ card, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className={`evidence-chip ${className}`.trim()}
        onClick={() => setIsOpen(true)}
        title={`View evidence: ${card.label}`}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        <span style={{ opacity: 0.6 }}>[ev]</span>
        <span>{card.label}</span>
      </button>

      {isOpen && (
        <div
          className="evidence-modal-backdrop"
          onClick={() => setIsOpen(false)}
          role="presentation"
        >
          <div
            className="evidence-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`evidence-title-${card.id}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--color-forest)', fontWeight: 600 }}>
                EVIDENCE PIN #{card.id}
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                style={{ fontFamily: 'var(--font-mono)', fontSize: '1rem', fontWeight: 600, padding: '4px 8px' }}
                aria-label="Close dialog"
              >
                &times;
              </button>
            </div>

            <h3 id={`evidence-title-${card.id}`} style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', marginBottom: '12px' }}>
              {card.label}
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', margin: '16px 0', padding: '16px', backgroundColor: 'var(--color-cream-surface)', borderRadius: 'var(--radius-sm)' }}>
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-ink-muted)' }}>MEASURED / COMPUTED</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-ink)' }}>
                  {card.value} <span style={{ fontSize: '0.8rem', fontWeight: 400 }}>{card.unit}</span>
                </div>
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-ink-muted)' }}>TIME WINDOW</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1rem', fontWeight: 500, color: 'var(--color-ink)' }}>
                  {card.hour_range}
                </div>
              </div>
            </div>

            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-ink-muted)' }}>
              <strong>Source:</strong> {card.source}
            </div>

            <div style={{ marginTop: '20px', textAlign: 'right' }}>
              <button
                type="button"
                className="btn btn-primary"
                style={{ padding: '6px 16px', fontSize: '0.875rem' }}
                onClick={() => setIsOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
