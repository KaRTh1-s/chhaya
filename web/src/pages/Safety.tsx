import React, { useEffect, useState } from 'react';
import { client } from '../api/client';
import type { AssumptionItem } from '../api/types';
import { LoadingSkeleton, ErrorState } from '../components/Feedback';
import mockAdvisories from '../api/mock-data/advisories.json';

export const Safety: React.FC = () => {
  const [assumptions, setAssumptions] = useState<AssumptionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('ALL');

  useEffect(() => {
    const loadAssumptions = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await client.getAssumptions();
        setAssumptions(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load assumptions matrix');
      } finally {
        setLoading(false);
      }
    };
    loadAssumptions();
  }, []);

  const categories = ['ALL', ...Array.from(new Set(assumptions.map((a) => a.component)))];

  const filteredAssumptions = assumptions.filter((a) => {
    if (activeCategory === 'ALL') return true;
    return a.component.toLowerCase() === activeCategory.toLowerCase();
  });

  return (
    <div className="safety-page container" style={{ padding: '2rem 1rem 4rem', maxWidth: '1100px', margin: '0 auto' }}>
      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: '2.5rem' }}>
        <h1 className="page-title" style={{ fontSize: '2.2rem', fontWeight: 800, marginBottom: '0.5rem' }}>
          Safety, Calibration & Scientific Assumptions
        </h1>
        <p className="page-subtitle" style={{ color: 'var(--text-secondary)', maxWidth: '780px', fontSize: '1.05rem', lineHeight: 1.5 }}>
          Radical transparency into the physiological thresholds, mathematical models, validator rules, and operational boundaries powering Chhaya.
        </p>
      </div>

      {/* Medical Disclaimer Banner */}
      <div
        className="card"
        style={{
          background: 'rgba(239, 68, 68, 0.08)',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          padding: '1.25rem 1.5rem',
          borderRadius: 'var(--radius-md)',
          marginBottom: '2.5rem',
          display: 'flex',
          gap: '1rem',
          alignItems: 'flex-start',
        }}
      >
        <span style={{ fontSize: '1.5rem', lineHeight: 1 }}>⚠️</span>
        <div>
          <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f87171', marginBottom: '0.35rem' }}>
            Not Medical Advice — Occupational Exposure Advisory Only
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
            Chhaya computes workplace environmental risk recommendations based on public meteorological models. It does not account for individual medical history, pre-existing cardiovascular conditions, medication use, dehydration status, or acute pregnancy. Always prioritize individual worker physical distress signals and seek immediate emergency medical care when needed.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
        {/* Section 1: How a Plan is Computed */}
        <section className="card" style={{ padding: '1.75rem' }}>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary)' }}>
            1. Deterministic Calculation Pipeline
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
            <div style={{ background: 'var(--surface-2)', padding: '1.25rem', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--brand-orange)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                Step 1: Weather Ingestion
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                Hourly temperature, relative humidity, direct solar radiation, and wind speed from Open-Meteo, paired with CAMS PM2.5 and PM10 particulate reanalysis.
              </p>
            </div>

            <div style={{ background: 'var(--surface-2)', padding: '1.25rem', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--brand-orange)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                Step 2: Physical WBGT Index
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                Outdoor Wet-Bulb Globe Temperature (WBGT) computed using Australian Bureau of Meteorology (ABOM) equations calibrated with direct solar radiant load coefficients.
              </p>
            </div>

            <div style={{ background: 'var(--surface-2)', padding: '1.25rem', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--brand-orange)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                Step 3: Metabolic Workload Thresholds
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                conservative working defaults chosen by the team; not yet validated against ISO 7243, NIOSH or ACGIH criteria; see the Status column.
              </p>
            </div>

            <div style={{ background: 'var(--surface-2)', padding: '1.25rem', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--brand-orange)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                Step 4: Shift Optimization
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                Algorithmic scheduling identifies safe continuous blocks and flags hazardous windows requiring mandatory shaded recovery pauses or task rescheduling.
              </p>
            </div>
          </div>
        </section>

        {/* Section 2: Model Guardrails & Validator Rules */}
        <section className="card" style={{ padding: '1.75rem' }}>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
            2. LLM Advisor Guardrails & Validator Rules
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
            To prevent generative hallucinations and protect frontline safety, LLM advisories are strictly verified by our deterministic code validator before reaching users.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '1.25rem', borderRadius: 'var(--radius-sm)' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#34d399', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>✓</span> What the Model May Do
              </h3>
              <ul style={{ fontSize: '0.825rem', color: 'var(--text-primary)', paddingLeft: '1.25rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <li>Synthesize computed engine numbers into concise operational summaries (1–5 sentences).</li>
                <li>Translate shift instructions accurately into Hindi and Tamil scripts.</li>
                <li>Cite explicit numerical EvidenceCards for every empirical claim.</li>
                <li>Format clear operational guidance for hydration, shaded rest, and mask wearing.</li>
              </ul>
            </div>

            <div style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '1.25rem', borderRadius: 'var(--radius-sm)' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f87171', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>✕</span> What the Model May NOT Do
              </h3>
              <ul style={{ fontSize: '0.825rem', color: 'var(--text-primary)', paddingLeft: '1.25rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <li>Never invent temperatures, AQI levels, or risk categories outside computed engine facts.</li>
                <li>Never override or loosen engine work-rest ratios or hydration volumes.</li>
                <li>Never offer medical diagnoses or prescribe pharmaceutical medications.</li>
                <li>Never claim unmeasured outcomes like "illness avoided" (must use "flagged").</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Section 3: Assumptions Matrix */}
        <section className="card" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
            <div>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '0.25rem', color: 'var(--text-primary)' }}>
                3. System Assumptions & Calibration Table
              </h2>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>
                Generated directly from documentation (<code style={{ color: 'var(--brand-orange)' }}>docs/ASSUMPTIONS.md</code>).
              </p>
            </div>

            {/* Category Filter Pills */}
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  style={{
                    background: activeCategory === cat ? 'var(--brand-orange, #f97316)' : 'var(--surface-2)',
                    color: activeCategory === cat ? '#fff' : 'var(--text-primary)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-full, 999px)',
                    padding: '0.3rem 0.75rem',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {loading && <LoadingSkeleton height={300} />}
          {error && <ErrorState title="Assumptions Table Error" message={error} onRetry={() => {}} />}

          {!loading && !error && (
            <div style={{ overflowX: 'auto' }} tabIndex={0} role="region" aria-label="Assumptions matrix table">
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '0.75rem', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Component</th>
                    <th style={{ padding: '0.75rem', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Assumption / Parameter</th>
                    <th style={{ padding: '0.75rem', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Configured Value</th>
                    <th style={{ padding: '0.75rem', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Scientific Rationale</th>
                    <th style={{ padding: '0.75rem', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Source</th>
                    <th style={{ padding: '0.75rem', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAssumptions.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '0.75rem', fontWeight: 600, color: 'var(--brand-orange)' }}>{item.component}</td>
                      <td style={{ padding: '0.75rem', fontWeight: 600 }}>{item.assumption}</td>
                      <td style={{ padding: '0.75rem', fontFamily: 'var(--font-mono)', color: '#60a5fa' }}>{item.value}</td>
                      <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>{item.why}</td>
                      <td style={{ padding: '0.75rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>{item.source}</td>
                      <td style={{ padding: '0.75rem' }}>
                        <span
                          style={{
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            background:
                              item.status?.toLowerCase().includes('not') || item.status?.toLowerCase().includes('to verify')
                                ? 'rgba(249, 115, 22, 0.15)'
                                : item.status?.toLowerCase().includes('calibrated')
                                ? 'rgba(234, 179, 8, 0.15)'
                                : 'rgba(16, 185, 129, 0.15)',
                            color:
                              item.status?.toLowerCase().includes('not') || item.status?.toLowerCase().includes('to verify')
                                ? '#fb923c'
                                : item.status?.toLowerCase().includes('calibrated')
                                ? '#facc15'
                                : '#34d399',
                            whiteSpace: 'normal',
                            display: 'inline-block',
                          }}
                        >
                          {item.status || 'To verify'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Section 4: Data Sources & Limitations */}
        <section className="card" style={{ padding: '1.75rem' }}>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary)' }}>
            4. Data Sources, Microclimates & Known Limitations
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
            <div style={{ background: 'var(--surface-2)', padding: '1.25rem', borderRadius: 'var(--radius-sm)' }}>
              <strong style={{ display: 'block', fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                🌐 Modelled Data (Not Physical Sensors)
              </strong>
              <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                All weather and atmospheric figures represent global meteorological simulations (Open-Meteo & Copernicus CAMS), not on-site IoT sensors. Local microclimates (asphalt heat, enclosed construction pits) can deviate by 2–4°C.
              </p>
            </div>

            <div style={{ background: 'var(--surface-2)', padding: '1.25rem', borderRadius: 'var(--radius-sm)' }}>
              <strong style={{ display: 'block', fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                🗣️ Multilingual Validation Status
              </strong>
              <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                Hindi (हिन्दी) and Tamil (தமிழ்) translation strings are verified computationally against Unicode block validators and medical blocklists, but remain pending native occupational field reviews.
              </p>
            </div>

            <div style={{ background: 'var(--surface-2)', padding: '1.25rem', borderRadius: 'var(--radius-sm)' }}>
              <strong style={{ display: 'block', fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                ⚡ Fallback Architecture
              </strong>
              <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                In the event of network disconnection, LLM API failure, or rate limiting, the zero-LLM <code style={{ color: 'var(--brand-orange)' }}>TemplateAdvisor</code> engine generates instant deterministic shift guidance.
              </p>
            </div>
          </div>
        </section>

        {/* Section 5: Emergency Guidance */}
        <section
          className="card"
          style={{
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(249, 115, 22, 0.05) 100%)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            padding: '1.75rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <span style={{ fontSize: '1.6rem' }}>🚨</span>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#f87171', margin: 0 }}>
              Emergency Guidance
            </h2>
          </div>
          <p style={{ fontSize: '0.95rem', color: 'var(--text-primary)', lineHeight: 1.5, marginBottom: '1.25rem', fontWeight: 600 }}>
            In an emergency call 112 (India's emergency number). In many states 108 also reaches an ambulance.
          </p>

          <div style={{ background: 'var(--surface-1)', padding: '1.25rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
              First Aid / When to Seek Immediate Medical Help (From Advisory Engine)
            </div>
            <ul style={{ margin: 0, paddingLeft: '1.25rem', color: 'var(--text-primary)', fontSize: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {(
                (mockAdvisories as Record<string, Record<string, { seek_help?: string[] }>>)['delhi-heatwave-2025-06-09']?.['en']?.seek_help || [
                  'Stop work, move to shade, and call emergency services if you experience confusion, fainting, or stop sweating.',
                ]
              ).map((line, idx) => (
                <li key={idx}>{line}</li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Safety;
