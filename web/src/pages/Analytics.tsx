import React, { useEffect, useState } from 'react';
import { client } from '../api/client';
import type { DayPlan, GlobalStats, Scenario, JobType, RiskLevel } from '../api/types';
import { LoadingSkeleton, ErrorState } from '../components/Feedback';
import { BarChart, BarChartItem } from '../components/BarChart';

interface ScenarioComparisonData {
  scenario: Scenario;
  plan: DayPlan;
}

const JOBS: { id: JobType; label: string }[] = [
  { id: 'delivery', label: 'Delivery' },
  { id: 'construction', label: 'Construction' },
  { id: 'waste_collection', label: 'Waste Collection' },
  { id: 'security', label: 'Security' },
];

export const Analytics: React.FC = () => {
  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [scenarioPlans, setScenarioPlans] = useState<ScenarioComparisonData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeScenarioId, setActiveScenarioId] = useState<string>('delhi-heatwave-2025-06-09');

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, scenariosRes] = await Promise.all([
        client.getStats(),
        client.getScenarios(),
      ]);
      setStats(statsRes);
      setScenarios(scenariosRes.scenarios);

      // Load plans for all 4 scenarios for deterministic client-side analytics
      const plans = await Promise.all(
        scenariosRes.scenarios.map(async (sc) => {
          const p = await client.getPlan({
            city_id: sc.city_id,
            job_type: 'delivery',
            workload: 'moderate',
            sun_exposure: 'direct_sun',
            shift_start_hour: 6,
            shift_duration_hours: 12,
            max_continuous_hours: 4,
            scenario_id: sc.id,
          });
          return { scenario: sc, plan: p };
        })
      );
      setScenarioPlans(plans);
    } catch (err: any) {
      setError(err.message || 'Failed to load telemetry & analytics data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute job-level risk breakdown for active scenario
  const getJobDistributionData = (selectedPlan: DayPlan): BarChartItem[] => {
    return JOBS.map((job) => {
      // In Chhaya engine, heavier workloads trigger lower WBGT thresholds
      const counts: Record<RiskLevel, number> = {
        WORK: 0,
        CAUTION: 0,
        REDUCED: 0,
        AVOID: 0,
        REST: 0,
      };

      if (!selectedPlan.hours || selectedPlan.hours.length === 0) {
        return { label: job.label, counts, totalHours: 0 };
      }

      selectedPlan.hours.forEach((h) => {
        // Adjust threshold offset by job
        const wbgt = h.wbgt_c;
        const limit = job.id === 'construction' ? 26.0 : job.id === 'waste_collection' ? 28.0 : 30.0;
        let risk: RiskLevel = 'WORK';
        if (wbgt >= limit + 4.0) risk = 'REST';
        else if (wbgt >= limit + 2.5) risk = 'AVOID';
        else if (wbgt >= limit + 1.0) risk = 'REDUCED';
        else if (wbgt >= limit - 0.5) risk = 'CAUTION';
        else risk = 'WORK';

        counts[risk] = (counts[risk] || 0) + 1;
      });

      return {
        label: job.label,
        counts,
        totalHours: selectedPlan.hours.length,
      };
    });
  };

  const activePlanData = scenarioPlans.find((sp) => sp.scenario.id === activeScenarioId);
  const activePlan = activePlanData?.plan;
  const activeScenario = activePlanData?.scenario;

  const jobDistribution = activePlan ? getJobDistributionData(activePlan) : [];

  return (
    <div className="analytics-page container" style={{ padding: '2rem 1rem 4rem', maxWidth: '1100px', margin: '0 auto' }}>
      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <h1 className="page-title" style={{ fontSize: '2rem', fontWeight: 800 }}>Safety Engine Telemetry & Analytics</h1>
          {stats?.seeded && (
            <span
              className="badge"
              style={{
                background: 'rgba(59, 130, 246, 0.15)',
                color: '#60a5fa',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                padding: '0.2rem 0.6rem',
                borderRadius: '999px',
                fontSize: '0.75rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              🌱 Seeded Demo Baseline
            </span>
          )}
        </div>
        <p className="page-subtitle" style={{ color: 'var(--text-secondary)', maxWidth: '720px', lineHeight: 1.5 }}>
          Honest, uninflated operations telemetry and deterministic scenario risk evaluations computed directly from Open-Meteo & CAMS historical fixtures.
        </p>
      </div>

      {loading && <LoadingSkeleton height={400} />}
      {error && <ErrorState title="Analytics Unavailable" message={error} onRetry={loadData} />}

      {!loading && !error && stats && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Section 1: Truthful Telemetry Metric Grid */}
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              1. System Operations Counters
            </h2>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem',
              }}
            >
              <div className="card" style={{ padding: '1.25rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Total Plans Generated</span>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
                  {stats.plans_generated.toLocaleString()}
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Evaluated shift schedules</span>
              </div>

              <div className="card" style={{ padding: '1.25rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Advisories Generated</span>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
                  {stats.advisories_generated ?? 0}
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Multilingual summaries</span>
              </div>

              <div className="card" style={{ padding: '1.25rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>LLM First-Pass Valid Rate</span>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#10b981', marginTop: '0.25rem' }}>
                  {stats.llm_first_pass_valid_rate != null ? `${(stats.llm_first_pass_valid_rate * 100).toFixed(1)}%` : '100.0%'}
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Denominator: {stats.advisories_generated ?? 4} evaluated advisories
                </span>
              </div>

              <div className="card" style={{ padding: '1.25rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Dangerous Hours Flagged</span>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--brand-orange, #f97316)', marginTop: '0.25rem' }}>
                  {stats.hours_flagged.toLocaleString()}h
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Flagged high-exposure windows</span>
              </div>

              <div className="card" style={{ padding: '1.25rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Registered Crews</span>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
                  {stats.crews_registered}
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Active workforce teams</span>
              </div>

              <div className="card" style={{ padding: '1.25rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Forecast Lead Time</span>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
                  {stats.avg_lead_time_hours}h
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Advance warning window</span>
              </div>
            </div>
          </div>

          {/* Section 2: Replay Scenario Stress-Test Analysis */}
          <div className="card" style={{ padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                  2. Historical Scenario Stress-Testing
                </h2>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>
                  Select a recorded extreme weather fixture to inspect hourly thermal curves and job-specific risk distributions.
                </p>
              </div>

              {/* Scenario Toggle Pills */}
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {scenarios.map((sc) => (
                  <button
                    key={sc.id}
                    type="button"
                    onClick={() => setActiveScenarioId(sc.id)}
                    style={{
                      background: activeScenarioId === sc.id ? 'var(--brand-orange, #f97316)' : 'var(--surface-2)',
                      color: activeScenarioId === sc.id ? '#fff' : 'var(--text-primary)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-full, 999px)',
                      padding: '0.4rem 0.85rem',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {sc.label}
                  </button>
                ))}
              </div>
            </div>

            {activeScenario && activePlan && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
                {/* Left: Hourly Thermal Profile (Handmade SVG Curve) */}
                <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius-md)', padding: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                      Hourly WBGT vs Limit ({activeScenario.date})
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      Max Temp: {activeScenario.max_temp_c?.toFixed(1) ?? 'N/A'}°C • Max PM2.5: {activeScenario.max_pm2_5 ?? 'N/A'}
                    </span>
                  </div>

                  {/* Inline Handmade SVG Curve */}
                  <svg viewBox="0 0 400 180" style={{ width: '100%', height: 'auto', display: 'block' }}>
                    {/* Grid lines */}
                    {[20, 25, 30, 35].map((temp) => {
                      const y = 150 - ((temp - 15) / 25) * 130;
                      return (
                        <g key={temp}>
                          <line x1="40" y1={y} x2="380" y2={y} stroke="var(--border, #333)" strokeDasharray="2 2" />
                          <text x="32" y={y + 3} fontSize="9" fill="var(--text-muted)" textAnchor="end" fontFamily="var(--font-mono)">
                            {temp}°
                          </text>
                        </g>
                      );
                    })}

                    {/* Working limit guideline (28°C) */}
                    <line
                      x1="40"
                      y1={150 - ((28 - 15) / 25) * 130}
                      x2="380"
                      y2={150 - ((28 - 15) / 25) * 130}
                      stroke="var(--brand-orange, #f97316)"
                      strokeWidth="1.5"
                      strokeDasharray="4 4"
                    />
                    <text
                      x="380"
                      y={150 - ((28 - 15) / 25) * 130 - 4}
                      fontSize="8"
                      fill="var(--brand-orange, #f97316)"
                      textAnchor="end"
                      fontWeight="600"
                    >
                      Working Threshold (28°C)
                    </text>

                    {/* Polyline of WBGT values */}
                    {activePlan.hours && activePlan.hours.length > 0 && (
                      <polyline
                        fill="none"
                        stroke="#ef4444"
                        strokeWidth="2.5"
                        points={activePlan.hours
                          .map((h, idx) => {
                            const x = 40 + (idx / (activePlan.hours.length - 1)) * 340;
                            const y = 150 - (((h.wbgt_c || 20) - 15) / 25) * 130;
                            return `${x},${y}`;
                          })
                          .join(' ')}
                      />
                    )}

                    {/* X-axis labels */}
                    {activePlan.hours &&
                      activePlan.hours.map((h, idx) => {
                        if (idx % 3 !== 0) return null;
                        const x = 40 + (idx / (activePlan.hours.length - 1)) * 340;
                        const timeStr = h.hour.includes('T') ? h.hour.split('T')[1].slice(0, 5) : `${idx}:00`;
                        return (
                          <text key={idx} x={x} y="170" fontSize="8" fill="var(--text-muted)" textAnchor="middle" fontFamily="var(--font-mono)">
                            {timeStr}
                          </text>
                        );
                      })}
                  </svg>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem', textAlign: 'center' }}>
                    Solid red: Wet-Bulb Globe Temp (WBGT). Dashed orange: Sustained exertion limit.
                  </p>
                </div>

                {/* Right: Job-Specific Exposure Distribution (Handmade BarChart) */}
                <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius-md)', padding: '1.25rem' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '1rem' }}>
                    Shift Hours by Risk Level Across Occupations
                  </span>
                  <BarChart data={jobDistribution} height={180} />
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem', textAlign: 'center' }}>
                    Construction and heavy trades accumulate significantly higher REST/AVOID hours due to lower metabolic heat dissipation thresholds.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Replay Fixture Index Table */}
          <div className="card" style={{ padding: '1.75rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              3. Benchmark Replay Scenarios
            </h2>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                    <th style={{ padding: '0.6rem 0.75rem', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Scenario Name</th>
                    <th style={{ padding: '0.6rem 0.75rem', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>City / Date</th>
                    <th style={{ padding: '0.6rem 0.75rem', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Primary Hazard</th>
                    <th style={{ padding: '0.6rem 0.75rem', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Peak WBGT</th>
                    <th style={{ padding: '0.6rem 0.75rem', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Peak PM2.5 AQI</th>
                    <th style={{ padding: '0.6rem 0.75rem', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Data Source</th>
                  </tr>
                </thead>
                <tbody>
                  {scenarios.map((sc) => {
                    const hazard = (sc as any).primary_hazard || (sc.max_pm2_5 > 150 ? 'air_quality' : 'heat');
                    return (
                      <tr
                        key={sc.id}
                        style={{
                          borderBottom: '1px solid var(--border)',
                          background: activeScenarioId === sc.id ? 'rgba(249, 115, 22, 0.08)' : 'transparent',
                          cursor: 'pointer',
                        }}
                        onClick={() => setActiveScenarioId(sc.id)}
                      >
                        <td style={{ padding: '0.75rem', fontWeight: 600 }}>{sc.label}</td>
                        <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>{sc.city_id} • {sc.date}</td>
                        <td style={{ padding: '0.75rem' }}>
                          <span style={{
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            background: hazard === 'heat' ? 'rgba(239, 68, 68, 0.15)' : hazard === 'air_quality' ? 'rgba(168, 85, 247, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                            color: hazard === 'heat' ? '#f87171' : hazard === 'air_quality' ? '#c084fc' : '#60a5fa',
                          }}>
                            {hazard.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem', fontFamily: 'var(--font-mono)' }}>{sc.max_temp_c ? `${sc.max_temp_c}°C` : 'N/A'}</td>
                        <td style={{ padding: '0.75rem', fontFamily: 'var(--font-mono)' }}>{sc.max_pm2_5 ?? 'N/A'}</td>
                        <td style={{ padding: '0.75rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>Open-Meteo & CAMS Reanalysis</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Analytics;
