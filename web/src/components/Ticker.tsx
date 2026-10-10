import React from 'react';
import { STACK_SERVICES } from '../config/stack';

export const Ticker: React.FC = () => {
  const liveServices = STACK_SERVICES.filter((s) => s.live);
  const displayServices = liveServices.length > 0 ? liveServices : STACK_SERVICES;
  const plannedServices = STACK_SERVICES.filter((s) => !s.live);

  // Duplicate for seamless infinite loop marquee
  const tickerItems = [...displayServices, ...displayServices];

  return (
    <div style={{ width: '100%', margin: 'var(--space-12) 0' }}>
      <div className="ticker-container" aria-label="AWS Architecture Stack">
        <div className="ticker-track">
          {tickerItems.map((service, idx) => (
            <div key={`${service.name}-${idx}`} className="ticker-item">
              <span className="ticker-item-dot" aria-hidden="true" />
              <span>{service.name}</span>
            </div>
          ))}
        </div>
      </div>

      {liveServices.length > 0 && plannedServices.length > 0 && (
        <div style={{ textAlign: 'center', marginTop: '8px', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-ink-light)' }}>
          <span>Next up on roadmap: </span>
          {plannedServices.map((p) => p.name).join(' &middot; ')}
        </div>
      )}
    </div>
  );
};
