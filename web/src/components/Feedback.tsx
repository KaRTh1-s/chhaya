import React, { useEffect, useState } from 'react';
import { Button } from './Button';

export const LoadingSkeleton: React.FC<{ rows?: number; height?: string; className?: string }> = ({
  rows = 3,
  height = '20px',
  className = '',
}) => {
  return (
    <div className={`loading-skeleton-container ${className}`.trim()} aria-busy="true" aria-label="Loading content">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          style={{
            height,
            backgroundColor: 'rgba(27, 27, 27, 0.08)',
            borderRadius: 'var(--radius-sm)',
            marginBottom: '10px',
            width: i === 0 ? '60%' : i === rows - 1 ? '40%' : '90%',
            animation: 'pulse-skeleton 1.5s ease-in-out infinite',
          }}
        />
      ))}
    </div>
  );
};

export const ErrorState: React.FC<{
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}> = ({
  title = 'Something went wrong',
  message = 'We could not load this information from the server.',
  onRetry,
  className = '',
}) => {
  return (
    <div
      className={`error-state-card ${className}`.trim()}
      role="alert"
      style={{
        padding: 'var(--space-8)',
        backgroundColor: 'var(--risk-extreme-bg)',
        border: '1px solid var(--risk-extreme-border)',
        borderRadius: 'var(--radius-card)',
        textAlign: 'center',
        margin: 'var(--space-6) 0',
      }}
    >
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--risk-extreme-text)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px' }}>
        Network / Engine Warning
      </div>
      <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.6rem', color: 'var(--risk-extreme-text)', marginBottom: '8px' }}>
        {title}
      </h3>
      <p style={{ color: 'var(--color-ink-muted)', maxWidth: '480px', margin: '0 auto var(--space-6)' }}>
        {message}
      </p>
      {onRetry && (
        <Button variant="primary" onClick={onRetry}>
          Try Again &circlearrowright;
        </Button>
      )}
    </div>
  );
};

export const EmptyState: React.FC<{
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  className?: string;
}> = ({ title, description, actionText, onAction, className = '' }) => {
  return (
    <div
      className={`empty-state-card ${className}`.trim()}
      style={{
        padding: 'var(--space-8)',
        backgroundColor: 'var(--color-cream-surface)',
        border: '1px dashed var(--color-beige-card)',
        borderRadius: 'var(--radius-card)',
        textAlign: 'center',
        margin: 'var(--space-6) 0',
      }}
    >
      <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem', color: 'var(--color-ink)', marginBottom: '6px' }}>
        {title}
      </h3>
      <p style={{ color: 'var(--color-ink-muted)', fontSize: '0.9rem', maxWidth: '420px', margin: '0 auto var(--space-4)' }}>
        {description}
      </p>
      {actionText && onAction && (
        <Button variant="secondary" onClick={onAction}>
          {actionText}
        </Button>
      )}
    </div>
  );
};

export const OfflineBanner: React.FC = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div
      role="status"
      style={{
        backgroundColor: 'var(--risk-high-fill)',
        color: '#FFFFFF',
        fontFamily: 'var(--font-mono)',
        fontSize: '0.75rem',
        textAlign: 'center',
        padding: '6px 12px',
        fontWeight: 600,
      }}
    >
      You are currently offline. Running on local cached fixtures.
    </div>
  );
};
