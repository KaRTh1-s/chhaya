import React, { useState } from 'react';
import type { HourPlan } from '../api/types';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { EvidenceChip } from '../components/EvidenceChip';
import { FaqPanel } from '../components/FaqPanel';
import { Kicker, SerifHeading } from '../components/Headings';
import { HourRibbon } from '../components/HourRibbon';
import { RiskPill } from '../components/RiskPill';
import { StatBlock } from '../components/StatBlock';
import { Ticker } from '../components/Ticker';
import { WindowList } from '../components/WindowList';

import delhiHeatwavePlan from '../api/mock-data/delhi-heatwave-2025-06-09.json';

export const DesignPage: React.FC = () => {
  const [sampleHours] = useState<HourPlan[]>(
    (delhiHeatwavePlan as unknown as { hours: HourPlan[] }).hours
  );

  const sampleEvidence = {
    id: 'ev_wbgt_peak_14',
    label: 'WBGT 33.9°C at 14:00',
    value: '33.9',
    unit: '°C',
    source: 'Open-Meteo Archive (Delhi 2025-06-09)',
    hour_range: '13:00 - 15:00',
  };

  return (
    <div className="container" style={{ padding: 'var(--space-8) var(--space-4)' }}>
      <div style={{ marginBottom: 'var(--space-10)', borderBottom: '1px solid rgba(27,27,27,0.1)', paddingBottom: 'var(--space-6)' }}>
        <Kicker>LIVING STYLEGUIDE</Kicker>
        <SerifHeading level={1} size="display" text="Chhaya *Design System.*" />
        <p style={{ marginTop: 'var(--space-3)', fontSize: '1.1rem', color: 'var(--color-ink-muted)' }}>
          Design tokens, typography hierarchy, risk scale, and reusable UI components.
        </p>
      </div>

      {/* 1. COLOR PALETTE */}
      <section style={{ marginBottom: 'var(--space-12)' }}>
        <Kicker>01. Color Palette</Kicker>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 'var(--space-4)', marginTop: 'var(--space-4)' }}>
          {[
            { name: 'Cream Background', hex: '#FFFDF0', var: '--color-cream-bg', border: true },
            { name: 'Warm Beige Card', hex: '#E3E1D0', var: '--color-beige-card' },
            { name: 'Deep Forest Green', hex: '#04504A', var: '--color-forest', lightText: true },
            { name: 'Forest Dark Surface', hex: '#033B36', var: '--color-deep-forest', lightText: true },
            { name: 'Lavender CTA', hex: '#E9D5FF', var: '--color-lavender-cta' },
            { name: 'Ink & Borders', hex: '#1B1B1B', var: '--color-ink', lightText: true },
            { name: 'Ember Alert', hex: '#F0583A', var: '--color-ember', lightText: true },
          ].map((c) => (
            <div
              key={c.hex}
              style={{
                backgroundColor: c.hex,
                padding: 'var(--space-4)',
                borderRadius: 'var(--radius-md)',
                color: c.lightText ? '#FFFFFF' : 'var(--color-ink)',
                border: c.border ? '1px solid #E0DEC8' : 'none',
                boxShadow: 'var(--shadow-card-soft)',
              }}
            >
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{c.name}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', opacity: 0.85, marginTop: '4px' }}>
                {c.hex}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', opacity: 0.7, marginTop: '2px' }}>
                {c.var}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 2. RISK SCALE */}
      <section style={{ marginBottom: 'var(--space-12)' }}>
        <Kicker>02. Risk Scale &amp; Contrast Ratios</Kicker>
        <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap', marginTop: 'var(--space-4)' }}>
          <RiskPill level="LOW" label="Low Risk (WBGT < 28°C)" />
          <RiskPill level="MODERATE" label="Moderate Risk (28°C – 30°C)" />
          <RiskPill level="HIGH" label="High Risk (30°C – 32°C)" />
          <RiskPill level="EXTREME" label="Extreme Risk (WBGT > 32°C)" />
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap', marginTop: 'var(--space-3)' }}>
          <RiskPill level="WORK" />
          <RiskPill level="CAUTION" />
          <RiskPill level="REDUCED" />
          <RiskPill level="REST" />
          <RiskPill level="AVOID" />
        </div>
      </section>

      {/* 3. BUTTONS */}
      <section style={{ marginBottom: 'var(--space-12)' }}>
        <Kicker>03. Buttons &amp; Action States</Kicker>
        <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'center', flexWrap: 'wrap', marginTop: 'var(--space-4)' }}>
          <Button variant="primary">Primary Lavender Hard-Shadow</Button>
          <Button variant="secondary">Secondary Outline Pill</Button>
          <Button variant="dark">Dark Forest Action</Button>
          <Button variant="ghost">Ghost Link Button &rarr;</Button>
        </div>
      </section>

      {/* 4. TYPOGRAPHY */}
      <section style={{ marginBottom: 'var(--space-12)' }}>
        <Kicker>04. Typography Hierarchy</Kicker>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', marginTop: 'var(--space-4)' }}>
          <div>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-ink-light)' }}>DISPLAY (EB Garamond clamp)</span>
            <SerifHeading level={1} size="display" text="The 2 PM shift, *planned around the sky.*" />
          </div>
          <div>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-ink-light)' }}>HEADING 2 (EB Garamond)</span>
            <SerifHeading level={2} text="Built around *how outdoor work works.*" />
          </div>
          <div>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-ink-light)' }}>BODY TEXT (Inter Variable)</span>
            <p style={{ maxWidth: '600px' }}>
              Outdoor laborers in Indian metropolitan areas carry acute thermal and fine-particulate burden. Deterministic thresholds and verified weather records ensure trustworthy shift recommendations.
            </p>
          </div>
          <div>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-ink-light)' }}>MONOSPACE (JetBrains Mono)</span>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--color-forest)' }}>
              LIVE ap-south-1 &middot; WBGT: 33.9°C &middot; ISO_7243_HEAVY_LIMIT: 26.0°C
            </div>
          </div>
        </div>
      </section>

      {/* 5. STAT BLOCKS & CARDS */}
      <section style={{ marginBottom: 'var(--space-12)' }}>
        <Kicker>05. Stat Blocks &amp; Cards</Kicker>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-6)', marginTop: 'var(--space-4)' }}>
          <Card variant="beige">
            <StatBlock number={142} label="Advisories Generated" isSeeded />
          </Card>
          <Card variant="dark">
            <StatBlock number={4.8} unit="h" label="Median Alert Lead Time" />
          </Card>
          <Card variant="white">
            <StatBlock number="96%" label="LLM First-Pass Valid Rate" />
          </Card>
        </div>
      </section>

      {/* 6. HOUR RIBBON & EVIDENCE */}
      <section style={{ marginBottom: 'var(--space-12)' }}>
        <Kicker>06. Hourly Exposure Ribbon &amp; Evidence Pins</Kicker>
        <div style={{ marginTop: 'var(--space-4)', backgroundColor: '#FFFFFF', padding: 'var(--space-6)', borderRadius: 'var(--radius-card)', border: '1px solid rgba(27,27,27,0.1)' }}>
          <HourRibbon hours={sampleHours} />
          <div style={{ marginTop: 'var(--space-6)', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <span>Clickable evidence pin component:</span>
            <EvidenceChip card={sampleEvidence} />
          </div>
        </div>
      </section>

      {/* 7. WINDOW LIST & TICKER */}
      <section style={{ marginBottom: 'var(--space-12)' }}>
        <Kicker>07. Window List &amp; Live Ticker</Kicker>
        <div style={{ marginTop: 'var(--space-4)' }}>
          <WindowList
            title="SAMPLE DANGEROUS WINDOWS"
            windows={[
              { start: '2025-06-09T12:00:00+05:30', end: '2025-06-09T15:00:00+05:30', status: 'AVOID', summary_code: 'HEAT_EXTREME_AVOID' },
              { start: '2025-06-09T15:00:00+05:30', end: '2025-06-09T17:00:00+05:30', status: 'CAUTION', summary_code: 'HEAT_CAUTION' },
            ]}
          />
        </div>
        <Ticker />
      </section>

      {/* 8. FAQ PANEL */}
      <section style={{ marginBottom: 'var(--space-12)' }}>
        <Kicker>08. FAQ Two-Panel Widget</Kicker>
        <div style={{ marginTop: 'var(--space-4)' }}>
          <FaqPanel />
        </div>
      </section>
    </div>
  );
};
