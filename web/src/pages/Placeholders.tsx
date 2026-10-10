import React from 'react';
import { Card } from '../components/Card';
import { Kicker, SerifHeading } from '../components/Headings';

interface PlaceholderProps {
  kicker: string;
  title: string;
  description: string;
  phase?: string;
}

const PagePlaceholder: React.FC<PlaceholderProps> = ({
  kicker,
  title,
  description,
  phase = 'Phase 5',
}) => {
  return (
    <div className="container" style={{ padding: 'var(--space-8) var(--space-4)', minHeight: '60vh' }}>
      <div style={{ marginBottom: 'var(--space-8)' }}>
        <Kicker>{kicker}</Kicker>
        <SerifHeading level={1} size="h1" text={title} />
        <p style={{ maxWidth: '680px', marginTop: 'var(--space-3)', fontSize: '1.1rem', color: 'var(--color-ink-muted)' }}>
          {description}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--space-6)' }}>
        <Card variant="beige" style={{ minHeight: '220px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-forest)', textTransform: 'uppercase', marginBottom: '8px', fontWeight: 600 }}>
              Live Telemetry Stream
            </div>
            <div style={{ height: '18px', backgroundColor: 'rgba(27, 27, 27, 0.08)', borderRadius: '4px', width: '70%', marginBottom: '10px' }} />
            <div style={{ height: '14px', backgroundColor: 'rgba(27, 27, 27, 0.05)', borderRadius: '4px', width: '90%', marginBottom: '6px' }} />
            <div style={{ height: '14px', backgroundColor: 'rgba(27, 27, 27, 0.05)', borderRadius: '4px', width: '60%' }} />
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--color-ink-light)' }}>
            [Arrives in {phase} &middot; Proactive alerts &amp; live EventBridge integration]
          </div>
        </Card>

        <Card variant="white" style={{ minHeight: '220px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-forest)', textTransform: 'uppercase', marginBottom: '8px', fontWeight: 600 }}>
              Automated Synthesis Matrix
            </div>
            <div style={{ height: '18px', backgroundColor: 'rgba(27, 27, 27, 0.08)', borderRadius: '4px', width: '55%', marginBottom: '10px' }} />
            <div style={{ height: '14px', backgroundColor: 'rgba(27, 27, 27, 0.05)', borderRadius: '4px', width: '85%', marginBottom: '6px' }} />
            <div style={{ height: '14px', backgroundColor: 'rgba(27, 27, 27, 0.05)', borderRadius: '4px', width: '45%' }} />
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--color-ink-light)' }}>
            [Arrives in {phase} &middot; Amazon SNS broadcast triggers]
          </div>
        </Card>
      </div>
    </div>
  );
};

export const AnalyticsPage: React.FC = () => (
  <PagePlaceholder
    kicker="LONGITUDINAL TELEMETRY"
    title="Heat and smog *trends across India.*"
    description="Historical exposure metrics, high-risk window distributions, and contractor response latency."
  />
);

export const PlansPage: React.FC = () => (
  <PagePlaceholder
    kicker="CUSTOM SHIFT BUILDER"
    title="Generate a custom *shift plan.*"
    description="Interactive planner for individual job types, workload intensities, and recorded scenario replay."
  />
);

export const CrewsPage: React.FC = () => (
  <PagePlaceholder
    kicker="WORKER CREW ROSTER"
    title="Manage registered *crew profiles.*"
    description="Anonymous contractor cohorts and regional workforce clusters with passkey-authenticated mutations."
  />
);

export const AuditPage: React.FC = () => (
  <PagePlaceholder
    kicker="SECURITY & TRANSPARENCY"
    title="Append-only *audit ledger.*"
    description="Append-only (kept 30 days) trace of all generated plans, agent reasoning steps, and SMS broadcast dispatches."
  />
);

export const SafetyPage: React.FC = () => (
  <PagePlaceholder
    kicker="ASSUMPTIONS & THRESHOLDS"
    title="The open *assumptions ledger.*"
    description="Scientific basis for our calibrated WBGT formulas, AQI workload multipliers, and emergency guidelines."
  />
);
