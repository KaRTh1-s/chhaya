import React, { useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import type { DayPlan, GlobalStats, Language } from '../api/types';
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
import { LINKS } from '../config/links';

import delhiHeatwavePlan from '../api/mock-data/delhi-heatwave-2025-06-09.json';
import delhiRiderPlan from '../api/mock-data/delhi-heatwave-rider.json';
import advisoriesData from '../api/mock-data/advisories.json';

export const Home: React.FC = () => {
  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [activeLang, setActiveLang] = useState<Language>('en');
  const [plan] = useState<DayPlan>(delhiHeatwavePlan as unknown as DayPlan);
  const [riderPlan] = useState<DayPlan>(delhiRiderPlan as unknown as DayPlan);

  useEffect(() => {
    let mounted = true;
    apiClient
      .getStats()
      .then((data) => {
        if (mounted) setStats(data);
      })
      .catch((err) => {
        console.warn('Failed to load live stats', err);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const scenarioAdvisory =
    (advisoriesData as Record<string, Record<string, { mode?: string; validated?: boolean; sentences: Array<{ text: string; evidence_ids: string[] }>; seek_help?: string[] }>>)[
      'delhi-heatwave-2025-06-09'
    ]?.[activeLang] ||
    (advisoriesData['delhi-heatwave-2025-06-09']['en'] as { mode?: string; validated?: boolean; sentences: Array<{ text: string; evidence_ids: string[] }>; seek_help?: string[] });

  // Map evidence IDs to actual evidence objects
  const evidenceMap = new Map(plan.evidence.map((e) => [e.id, e]));

  return (
    <div className="home-page" id="main-content">
      {/* 1. HERO SECTION */}
      <section className="container" style={{ textAlign: 'center', paddingTop: 'var(--space-8)', paddingBottom: 'var(--space-12)' }}>
        <Kicker>Chhaya Heat and Air Copilot</Kicker>
        <SerifHeading level={1} size="display" text="The 2 PM shift, *planned around the sky.*" />
        <p style={{ maxWidth: '640px', margin: 'var(--space-4) auto var(--space-8)', fontSize: 'clamp(1rem, 1.5vw, 1.25rem)', color: 'var(--color-ink-muted)' }}>
          Finds the hours that are safe to work, per job and workload, in Hindi, Tamil or English, and flags the dangerous ones before they arrive.
        </p>

        <div style={{ display: 'flex', gap: 'var(--space-4)', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
          <Button variant="primary" as="a" href="#/plans">
            Open Shift Planner
          </Button>
          <Button variant="secondary" as="a" href="#/plans?scenario=delhi-heatwave-2025-06-09">
            See a real heatwave day
          </Button>
          <Button variant="ghost" as="a" href={LINKS.github} target="_blank" rel="noopener noreferrer">
            Code on GitHub &rarr;
          </Button>
        </div>
      </section>

      {/* 2. PRODUCT PREVIEW (TILTED / FRAMED LIVE COMPONENT) */}
      <section className="container" style={{ marginBottom: 'var(--space-16)' }}>
        <div
          style={{
            perspective: '1200px',
            maxWidth: '980px',
            margin: '0 auto',
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 'var(--radius-card-lg)',
              border: '2px solid var(--color-ink)',
              boxShadow: 'var(--shadow-card-elevated), 8px 8px 0 var(--color-beige-card)',
              overflow: 'hidden',
              transform: 'rotateX(1deg)',
              transition: 'transform var(--transition-medium)',
            }}
          >
            {/* Window header */}
            <div
              style={{
                backgroundColor: 'var(--color-deep-forest)',
                color: '#FFFFFF',
                padding: 'var(--space-3) var(--space-6)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--font-size-mono-sm)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-ember)' }} />
                <span>Recorded Day: Delhi, 9 Jun 2025 (Open-Meteo Archive)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span>Job: Construction (Heavy)</span>
                <RiskPill level={plan.overall_risk} />
              </div>
            </div>

            <div style={{ padding: 'var(--space-6)' }}>
              {/* Hour Ribbon Component */}
              <div style={{ marginBottom: 'var(--space-6)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-forest)' }}>
                    24-HOUR HOURLY EXPOSURE RIBBON
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-ink-muted)' }}>
                    Hover or focus hours for WBGT &amp; AQI details
                  </span>
                </div>
                <HourRibbon hours={plan.hours} />
              </div>

              {/* Grid: Windows & Recommended Blocks */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-6)', marginBottom: 'var(--space-6)' }}>
                <div style={{ backgroundColor: 'var(--color-cream-surface)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-beige-card)' }}>
                  <WindowList title="DANGEROUS WINDOWS (AVOID / REST)" windows={plan.dangerous_windows} emptyMessage="No extreme windows." />
                </div>
                <div style={{ backgroundColor: 'var(--color-cream-surface)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-beige-card)' }}>
                  <WindowList title="RECOMMENDED WORK BLOCKS" windows={plan.recommended_blocks} emptyMessage="No recommended blocks (continuous danger)." />
                </div>
              </div>

              {/* Language switcher & Live Advisory with Evidence Pins */}
              <div style={{ backgroundColor: 'var(--color-beige-card)', padding: 'var(--space-6)', borderRadius: 'var(--radius-card-sm)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, color: 'var(--color-forest)' }}>
                      Worker Advisory (Bedrock Phrasing)
                    </span>
                    <span className="badge-demo" style={{ fontSize: '0.65rem' }}>
                      mode: {scenarioAdvisory?.mode || 'bedrock'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '4px' }}>
                    {(['en', 'hi', 'ta'] as Language[]).map((lang) => (
                      <button
                        key={lang}
                        type="button"
                        onClick={() => setActiveLang(lang)}
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.75rem',
                          minWidth: '48px',
                          minHeight: '48px',
                          padding: '8px 12px',
                          borderRadius: 'var(--radius-pill)',
                          border: activeLang === lang ? '1px solid var(--color-ink)' : '1px solid transparent',
                          backgroundColor: activeLang === lang ? '#FFFFFF' : 'transparent',
                          fontWeight: activeLang === lang ? 600 : 400,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {lang === 'en' ? 'EN' : lang === 'hi' ? 'हिन्दी' : 'தமிழ்'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sentences with pinned EvidenceChips */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {scenarioAdvisory?.sentences.map((s, idx) => (
                    <div key={idx} style={{ fontSize: '0.95rem', lineHeight: '1.6', color: 'var(--color-ink)' }}>
                      <span>{s.text}</span>
                      {s.evidence_ids.map((evId) => {
                        const card = evidenceMap.get(evId);
                        return card ? <EvidenceChip key={evId} card={card} /> : null;
                      })}
                    </div>
                  ))}
                </div>

                {scenarioAdvisory?.seek_help && scenarioAdvisory.seek_help.length > 0 && (
                  <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid rgba(27, 27, 27, 0.1)', fontSize: '0.85rem', color: 'var(--risk-extreme-text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 600 }}>[Medical Safety Line]:</span>
                    <span>{scenarioAdvisory.seek_help.join(' ')}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. STATS BAND (DARK FOREST) */}
      <section style={{ backgroundColor: 'var(--color-forest)', color: '#FFFFFF', padding: 'var(--space-16) 0', margin: 'var(--space-16) 0' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
            <SerifHeading level={2} light text="Nobody forced to guess the *2 PM heat.*" />
            <p style={{ color: 'rgba(255, 255, 255, 0.8)', fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size-mono-sm)', marginTop: '8px' }}>
              Live telemetry numbers from current deployment tally.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-6)' }}>
            <StatBlock
              number={stats ? stats.advisories_generated ?? stats.plans_generated : 142}
              label="advisories generated"
              isSeeded={stats?.seeded ?? true}
            />
            <StatBlock
              number={stats ? stats.cities_covered : 12}
              label="Indian cities covered"
              isSeeded={stats?.seeded ?? true}
            />
            <StatBlock
              number={stats ? stats.hours_flagged : 864}
              label="dangerous hours flagged"
              isSeeded={stats?.seeded ?? true}
            />
            <StatBlock
              number={stats ? stats.avg_lead_time_hours : 4.8}
              unit="h"
              label="median alert lead time"
              isSeeded={stats?.seeded ?? true}
            />
          </div>
        </div>
      </section>

      {/* 4. COMPARISON SECTION: WEATHER APP VS CHHAYA */}
      <section className="container" style={{ margin: 'var(--space-16) auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-10)' }}>
          <Kicker>Why generic weather is not enough</Kicker>
          <SerifHeading level={2} text="A weather app gives numbers. *Chhaya gives a schedule.*" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--space-8)' }}>
          {/* Left: Weather App */}
          <Card variant="beige" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--color-ink-muted)', marginBottom: '12px' }}>
                Standard Weather App
              </div>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', marginBottom: '16px' }}>
                "Hot day. 43&deg;C. Stay hydrated."
              </h3>
              <p style={{ color: 'var(--color-ink-muted)', lineHeight: '1.6' }}>
                Broadcasts a single static city-level number. Does not know if you are a food delivery rider moving at 30 km/h or a mason lifting bricks under full sun on a roof. Leaves the worker to guess when heat exhaustion sets in.
              </p>
            </div>
            <div style={{ marginTop: '24px', padding: '12px', backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-ink-muted)' }}>
              No shift adjustments &middot; No AQI workload multipliers &middot; No language support
            </div>
          </Card>

          {/* Right: Chhaya */}
          <Card variant="white" style={{ border: '2px solid var(--color-forest)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--color-forest)', fontWeight: 600 }}>
                  Chhaya Copilot (Delhi 9 Jun 2025)
                </span>
                <span className="badge-demo" style={{ backgroundColor: 'var(--color-forest)', color: '#FFFFFF', borderColor: 'var(--color-forest)' }}>
                  Workload-aware
                </span>
              </div>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.75rem', marginBottom: '16px' }}>
                Two different workers, two distinct safety plans.
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.9rem' }}>
                <div style={{ padding: '10px', backgroundColor: 'var(--color-cream-surface)', borderRadius: 'var(--radius-sm)' }}>
                  <strong>Construction Mason (Heavy Workload):</strong>
                  <div style={{ color: 'var(--risk-extreme-text)', marginTop: '4px' }}>
                    Avoid 12:00 PM &ndash; 03:00 PM (WBGT 33.9&deg;C exceeds 26.0&deg;C limit). Shift work to 06:00 &ndash; 10:00 AM. Drink 250ml water every 15 min.
                  </div>
                </div>
                <div style={{ padding: '10px', backgroundColor: 'var(--color-cream-surface)', borderRadius: 'var(--radius-sm)' }}>
                  <strong>Delivery Rider (Moderate Workload):</strong>
                  <div style={{ color: 'var(--risk-high-text)', marginTop: '4px' }}>
                    Avoid 01:00 PM &ndash; 03:00 PM peak radiation. Ride freely 06:00 &ndash; 11:00 AM and 05:00 &ndash; 09:00 PM. {riderPlan.mask.needed ? 'N95 mask advised for PM2.5 hotspots.' : ''}
                  </div>
                </div>
              </div>
            </div>
            <div style={{ marginTop: '24px', padding: '12px', backgroundColor: 'var(--color-lavender-light)', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-forest)', fontWeight: 500 }}>
              Pinned to Open-Meteo & CAMS modelled data &middot; Calibrated WBGT working thresholds &middot; Hindi / Tamil / English
            </div>
          </Card>
        </div>
      </section>

      {/* 5. HOW IT WORKS (4 NUMBERED STEPS) */}
      <section className="container" style={{ margin: 'var(--space-16) auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-12)' }}>
          <Kicker>Deterministic logic first</Kicker>
          <SerifHeading level={2} text="How Chhaya builds a *verifiable day plan.*" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-6)' }}>
          {[
            {
              step: '01',
              title: 'Location & Job Profile',
              desc: 'Worker or contractor selects city coordinates, job category (rider, construction, vendor, sanitation) and workload intensity.',
            },
            {
              step: '02',
              title: 'Hyperlocal Ingestion',
              desc: 'Pulls hourly dry-bulb temp, relative humidity, direct solar radiation, wind speed and PM2.5/PM10 from Open-Meteo APIs without keys.',
            },
            {
              step: '03',
              title: 'Deterministic Engine',
              desc: 'Python engine computes physical WBGT heat stress, compares to workload limits, and identifies safe vs avoid windows.',
            },
            {
              step: '04',
              title: 'Strands Agent Phrasing',
              desc: 'Amazon Bedrock turns computed numbers into accessible advisories in Hindi, Tamil, or English, with every sentence pinned to evidence.',
            },
          ].map((item) => (
            <div
              key={item.step}
              style={{
                backgroundColor: 'var(--color-beige-card)',
                borderRadius: 'var(--radius-card)',
                padding: 'var(--space-6)',
                border: '1px solid rgba(27, 27, 27, 0.08)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: '2.5rem', color: 'var(--color-forest)', fontWeight: 600, marginBottom: '8px' }}>
                  {item.step}
                </div>
                <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.35rem', marginBottom: '12px' }}>{item.title}</h3>
                <p style={{ fontSize: '0.9rem', lineHeight: '1.6' }}>{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 6. FEATURE CARDS: "BUILT AROUND HOW OUTDOOR WORK WORKS" */}
      <section className="container" style={{ margin: 'var(--space-16) auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-12)' }}>
          <Kicker>Safety architecture</Kicker>
          <SerifHeading level={2} text="Built around *how outdoor work works.*" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--space-6)' }}>
          <Card variant="beige">
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', marginBottom: '12px' }}>
              Numbers before the model
            </h3>
            <p>
              All WBGT thresholds, safe windows, and hydration requirements are computed in deterministic code before the LLM runs. The model only phrases; it never invents numbers.
            </p>
          </Card>

          <Card variant="beige">
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', marginBottom: '12px' }}>
              One plan per job type
            </h3>
            <p>
              Riders on moving two-wheelers, heavy concrete workers in full sunlight, street vendors with pushcarts, and sanitation crews face completely distinct physical thermal limits.
            </p>
          </Card>

          <Card variant="beige">
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', marginBottom: '12px' }}>
              Hindi, Tamil and English
            </h3>
            <p>
              Worker-facing language is phrased natively, respecting local terms and idioms, with emergency heat illness instructions and 108 medical guidance.
            </p>
          </Card>

          <Card variant="beige">
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', marginBottom: '12px' }}>
              Works without Bedrock
            </h3>
            <p>
              Zero-LLM fallback mode ensures that even during cloud LLM outages or network partition, deterministic template advisories are produced instantly.
            </p>
          </Card>

          <Card variant="beige">
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', marginBottom: '12px' }}>
              Runs on your laptop too
            </h3>
            <p>
              A single PowerShell / Bash command boots the full engine against local mock data and Open-Meteo fixtures. No AWS credit card required for development.
            </p>
          </Card>

          <Card variant="beige">
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', marginBottom: '12px' }}>
              Honest by design
            </h3>
            <p>
              We say <em>flagged</em>, not <em>avoided</em>. Every metric is verifiable against our open Assumptions Ledger and public Open-Meteo historical datasets.
            </p>
          </Card>
        </div>
      </section>

      {/* 7. AWS ARCHITECTURE TICKER */}
      <Ticker />

      {/* 8. FAQ TWO-PANEL */}
      <section className="container" style={{ margin: 'var(--space-16) auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-10)' }}>
          <Kicker>Frequently Asked Questions</Kicker>
          <SerifHeading level={2} text="Good *questions.*" />
        </div>
        <FaqPanel />
      </section>

      {/* 9. CLOSING CTA BANNER */}
      <section className="container" style={{ margin: 'var(--space-20) auto' }}>
        <div
          style={{
            backgroundColor: 'var(--color-forest)',
            color: '#FFFFFF',
            borderRadius: 'var(--radius-card-lg)',
            padding: 'var(--space-12) var(--space-8)',
            textAlign: 'center',
            boxShadow: 'var(--shadow-card-elevated)',
            border: '2px solid var(--color-ink)',
          }}
        >
          <SerifHeading level={2} light size="display" text="Ready for the next *heatwave?*" />
          <p style={{ color: 'rgba(255, 255, 255, 0.85)', maxWidth: '560px', margin: 'var(--space-4) auto var(--space-8)', fontSize: '1.1rem' }}>
            Inspect city risk matrices, generate custom worker plans, or register your crew with our open-source copilot.
          </p>
          <div style={{ display: 'flex', gap: 'var(--space-4)', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button variant="primary" as="a" href="#/plans">
              Open Shift Planner
            </Button>
            <Button variant="secondary" as="a" href="#/crews" style={{ color: '#FFFFFF', borderColor: '#FFFFFF' }}>
              Register a Worker Crew
            </Button>
            <Button variant="ghost" as="a" href={LINKS.github} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-lavender-cta)' }}>
              Explore Documentation &rarr;
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};
