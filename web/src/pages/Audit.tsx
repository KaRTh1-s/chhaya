import React, { useEffect, useState } from 'react';
import { client } from '../api/client';
import type { AuditEvent } from '../api/types';
import { LoadingSkeleton, ErrorState, EmptyState } from '../components/Feedback';

function formatRelativeTime(isoStr: string): string {
  try {
    const eventTime = new Date(isoStr).getTime();
    const now = Date.now();
    const diffSec = Math.floor((now - eventTime) / 1000);

    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour}h ago`;
    const diffDay = Math.floor(diffHour / 24);
    return `${diffDay}d ago`;
  } catch {
    return isoStr;
  }
}

export const Audit: React.FC = () => {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const loadAuditEvents = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await client.getAudit(50);
      setEvents(res.audit_events);
    } catch (err: any) {
      setError(err.message || 'Failed to load system audit log');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuditEvents();
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Derive unique event types for filtering
  const eventTypes = ['ALL', ...Array.from(new Set(events.map((e) => e.event_type)))];

  const filteredEvents = events.filter((e) => {
    if (typeFilter === 'ALL') return true;
    return e.event_type === typeFilter;
  });

  return (
    <div className="audit-page container" style={{ padding: '2rem 1rem 4rem', maxWidth: '1000px', margin: '0 auto' }}>
      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <h1 className="page-title" style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem' }}>
          System Audit Log
        </h1>
        <p className="page-subtitle" style={{ color: 'var(--text-secondary)', maxWidth: '720px', lineHeight: 1.5 }}>
          Immutable operational event trail of shift computations, model verification passes, and crew roster modifications.
        </p>
      </div>

      {/* Privacy Notice Banner */}
      <div
        className="card"
        style={{
          background: 'rgba(16, 185, 129, 0.08)',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          padding: '1rem 1.25rem',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          marginBottom: '1.5rem',
        }}
      >
        <span style={{ fontSize: '1.3rem' }}>🔒</span>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: 1.4 }}>
          <strong>No personal data is stored.</strong> Chhaya audit events record shift parameters, hazard thresholds, and engine executions. Worker identities and phone numbers are never persisted.
        </div>
      </div>

      {/* Filter and Action Bar */}
      <div
        className="card"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0.85rem 1.25rem',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <label htmlFor="audit-filter-type" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Event Type:
          </label>
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {eventTypes.map((t) => (
              <button
                key={t}
                type="button"
                className={`btn-filter ${typeFilter === t ? 'active' : ''}`}
                onClick={() => setTypeFilter(t)}
                style={{
                  background: typeFilter === t ? 'var(--brand-orange, #f97316)' : 'var(--surface-2)',
                  color: typeFilter === t ? '#fff' : 'var(--text-primary)',
                  border: '1px solid var(--border)',
                  padding: '0.3rem 0.7rem',
                  borderRadius: 'var(--radius-full, 999px)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={loadAuditEvents}
          style={{
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            color: 'var(--text-secondary)',
            padding: '0.35rem 0.8rem',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.8rem',
            cursor: 'pointer',
          }}
        >
          🔄 Refresh
        </button>
      </div>

      {loading && <LoadingSkeleton height={350} />}
      {error && <ErrorState title="Audit Trail Unavailable" message={error} onRetry={loadAuditEvents} />}

      {!loading && !error && filteredEvents.length === 0 && (
        <EmptyState
          title="No Matching Events"
          message={`No audit logs found for filter "${typeFilter}".`}
          actionLabel="Reset Filter"
          onAction={() => setTypeFilter('ALL')}
        />
      )}

      {!loading && !error && filteredEvents.length > 0 && (
        <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Time</th>
                <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Event Type</th>
                <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Event ID</th>
                <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Summary</th>
                <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', textAlign: 'right' }}>Details</th>
              </tr>
            </thead>
            <tbody>
              {filteredEvents.map((evt) => {
                const isExpanded = expandedIds.has(evt.id);
                const timeStr = new Date(evt.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                const relTime = formatRelativeTime(evt.timestamp);

                return (
                  <React.Fragment key={evt.id}>
                    <tr
                      style={{
                        borderBottom: isExpanded ? 'none' : '1px solid var(--border)',
                        background: isExpanded ? 'rgba(255, 255, 255, 0.02)' : 'transparent',
                      }}
                    >
                      <td style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{relTime}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{timeStr}</div>
                      </td>

                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span
                          style={{
                            padding: '0.25rem 0.55rem',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            fontFamily: 'var(--font-mono)',
                            background:
                              evt.event_type.includes('PLAN')
                                ? 'rgba(59, 130, 246, 0.15)'
                                : evt.event_type.includes('ADVISORY')
                                ? 'rgba(168, 85, 247, 0.15)'
                                : evt.event_type.includes('ALERT')
                                ? 'rgba(239, 68, 68, 0.15)'
                                : 'rgba(16, 185, 129, 0.15)',
                            color:
                              evt.event_type.includes('PLAN')
                                ? '#60a5fa'
                                : evt.event_type.includes('ADVISORY')
                                ? '#c084fc'
                                : evt.event_type.includes('ALERT')
                                ? '#f87171'
                                : '#34d399',
                          }}
                        >
                          {evt.event_type}
                        </span>
                      </td>

                      <td style={{ padding: '0.85rem 1rem', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {evt.id}
                      </td>

                      <td style={{ padding: '0.85rem 1rem', color: 'var(--text-primary)' }}>
                        {evt.details && typeof evt.details === 'object' ? (
                          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                            {Object.entries(evt.details).slice(0, 3).map(([k, v]) => (
                              <span
                                key={k}
                                style={{
                                  background: 'var(--surface-2)',
                                  padding: '0.15rem 0.45rem',
                                  borderRadius: '3px',
                                  fontSize: '0.75rem',
                                  color: 'var(--text-secondary)',
                                }}
                              >
                                {k}: <strong>{String(v)}</strong>
                              </span>
                            ))}
                          </div>
                        ) : (
                          'Event logged'
                        )}
                      </td>

                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => toggleExpand(evt.id)}
                          style={{
                            background: 'var(--surface-2)',
                            border: '1px solid var(--border)',
                            color: 'var(--text-primary)',
                            padding: '0.25rem 0.6rem',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                          }}
                        >
                          {isExpanded ? 'Hide Payload' : 'View Payload'}
                        </button>
                      </td>
                    </tr>

                    {/* Expandable JSON Detail Payload */}
                    {isExpanded && (
                      <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
                        <td colSpan={5} style={{ padding: '1rem' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                              Event Payload ({evt.id})
                            </span>
                            <pre
                              style={{
                                background: 'var(--surface-3)',
                                border: '1px solid var(--border)',
                                borderRadius: 'var(--radius-sm)',
                                padding: '0.85rem',
                                fontSize: '0.8rem',
                                color: '#a7f3d0',
                                fontFamily: 'var(--font-mono)',
                                overflowX: 'auto',
                                margin: 0,
                              }}
                            >
                              {JSON.stringify(evt.details, null, 2)}
                            </pre>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Audit;
