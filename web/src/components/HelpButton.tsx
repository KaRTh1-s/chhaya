import React, { useState } from 'react';

interface HelpButtonProps {
  isOpen?: boolean;
  onToggle?: () => void;
}

export const HelpButton: React.FC<HelpButtonProps> = ({
  isOpen: controlledIsOpen,
  onToggle: controlledOnToggle,
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false);

  const isModalOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;
  const toggleModal = controlledOnToggle || (() => setInternalIsOpen(!internalIsOpen));

  const shortcuts = [
    { key: 'g then h', desc: 'Navigate to Home' },
    { key: 'g then b', desc: 'Navigate to Risk Board' },
    { key: 'g then a', desc: 'Navigate to Analytics' },
    { key: 'g then p', desc: 'Navigate to Plans' },
    { key: 'g then c', desc: 'Navigate to Crews' },
    { key: 'g then u', desc: 'Navigate to Audit' },
    { key: 'g then r', desc: 'Navigate to Report' },
    { key: 'g then s', desc: 'Navigate to Safety' },
    { key: 'g then d', desc: 'Navigate to Design System' },
    { key: '/', desc: 'Open / Focus Plan Generator' },
    { key: '?', desc: 'Toggle this Shortcuts Guide' },
    { key: 'Esc', desc: 'Close dialog / dismiss shortcut prefix' },
  ];

  return (
    <>
      <button
        type="button"
        className="floating-help-btn"
        onClick={toggleModal}
        aria-label="Keyboard shortcuts"
        title="Keyboard shortcuts (?)"
      >
        ?
      </button>

      {isModalOpen && (
        <div
          className="evidence-modal-backdrop"
          onClick={toggleModal}
          role="presentation"
        >
          <div
            className="evidence-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="shortcuts-title"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '520px' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--color-forest)', fontWeight: 600 }}>
                KEYBOARD NAVIGATION
              </span>
              <button
                type="button"
                onClick={toggleModal}
                style={{ fontFamily: 'var(--font-mono)', fontSize: '1rem', fontWeight: 600, padding: '4px 8px' }}
                aria-label="Close dialog"
              >
                &times;
              </button>
            </div>

            <h3 id="shortcuts-title" style={{ fontFamily: 'var(--font-serif)', fontSize: '1.6rem', marginBottom: '16px' }}>
              Shortcuts & Gestures
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '340px', overflowY: 'auto' }}>
              {shortcuts.map((s, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    backgroundColor: 'var(--color-cream-surface)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-beige-card)',
                  }}
                >
                  <span style={{ fontSize: '0.875rem', color: 'var(--color-ink)' }}>{s.desc}</span>
                  <kbd
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      backgroundColor: '#FFFFFF',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      border: '1px solid var(--color-ink)',
                      boxShadow: '1px 1px 0 var(--color-ink)',
                    }}
                  >
                    {s.key}
                  </kbd>
                </div>
              ))}
            </div>

            <div style={{ marginTop: '20px', textAlign: 'right' }}>
              <button
                type="button"
                className="btn btn-primary"
                style={{ padding: '6px 16px', fontSize: '0.875rem' }}
                onClick={toggleModal}
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
