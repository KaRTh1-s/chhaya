import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { client } from '../api/client';
import type { BoardCity, City, DayPlan, JobType } from '../api/types';
import { RiskPill } from '../components/RiskPill';
import { LoadingSkeleton, ErrorState } from '../components/Feedback';
import { formatReportText } from '../utils/formatters';

const JOBS: { id: JobType; label: string; icon: string }[] = [
  { id: 'RIDER', label: 'Delivery / Rider', icon: '🛵' },
  { id: 'CONSTRUCTION', label: 'Construction', icon: '🏗️' },
  { id: 'SANITATION', label: 'Sanitation / Waste', icon: '🧹' },
  { id: 'VENDOR', label: 'Street Vendor', icon: '🛡️' },
];

export const Report: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCity = searchParams.get('city') || 'delhi';
  const initialJob = (searchParams.get('job') as JobType) || 'RIDER';

  const [cities, setCities] = useState<City[]>([]);
  const [selectedCity, setSelectedCity] = useState<string>(initialCity);
  const [selectedJob, setSelectedJob] = useState<JobType>(initialJob);
  const [boardData, setBoardData] = useState<BoardCity[]>([]);
  const [plan, setPlan] = useState<DayPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Sync state to URL params
  useEffect(() => {
    setSearchParams({ city: selectedCity, job: selectedJob }, { replace: true });
  }, [selectedCity, selectedJob, setSearchParams]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [citiesRes, boardRes] = await Promise.all([
        client.getCities(),
        client.getBoard('live'),
      ]);
      setCities(citiesRes.cities);
      setBoardData(boardRes.cities);

      // Fetch day plan for the selected city and job
      const planRes = await client.getPlan({
        city_id: selectedCity,
        job_type: selectedJob,
        workload: selectedJob === 'CONSTRUCTION' ? 'HEAVY' : selectedJob === 'SANITATION' ? 'MODERATE' : 'LIGHT',
        sun_exposure: 'FULL',
        preferred_start_hour: 8,
        preferred_end_hour: 18,
        max_shift_hours: 10,
      });
      setPlan(planRes);
    } catch (err: any) {
      setError(err.message || 'Failed to generate daily brief');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedCity, selectedJob]);

  const handleCopyText = () => {
    if (!plan) return;
    const currentCityObj = cities.find((c) => c.id === selectedCity);
    const currentJobObj = JOBS.find((j) => j.id === selectedJob);
    const text = formatReportText(
      currentCityObj?.name || selectedCity,
      currentJobObj?.label || selectedJob,
      plan,
      boardData
    );
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  const currentCityObj = cities.find((c) => c.id === selectedCity);
  const currentJobObj = JOBS.find((j) => j.id === selectedJob);
  const dateStr = plan?.recorded_date || new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' });

  const maxWbgt = plan?.hours?.length ? Math.max(...plan.hours.map((h) => h.wbgt_c || 0)) : 0;
  const maxAqi = plan?.hours?.length ? Math.max(...plan.hours.map((h) => h.aqi || 0)) : 0;
  const hoursFlagged = plan?.hours?.length ? plan.hours.filter((h) => ['CAUTION', 'REDUCED', 'AVOID', 'REST'].includes(h.status)).length : 0;
  const aqiFlagged = (plan?.hours?.some((h) => (h.aqi || 0) > 150)) ?? false;

  return (
    <div className="report-page">
      {/* Screen Controls Header (Hidden in Print) */}
      <div className="report-controls no-print">
        <div className="controls-left">
          <h1 className="page-title">Daily Exposure Brief</h1>
          <p className="page-subtitle">Printable one-page occupational safety summary for dispatchers, safety leads, and team supervisors.</p>
        </div>
        <div className="controls-right">
          <button className="btn btn-secondary" onClick={handleCopyText} id="btn-copy-report-text">
            {copied ? '✓ Copied Text' : '📋 Copy as Text'}
          </button>
          <button className="btn btn-primary" onClick={handlePrint} id="btn-print-report">
            🖨️ Print Daily Brief
          </button>
          <Link to={`/plans?city=${selectedCity}&job=${selectedJob}`} className="btn btn-outline" id="link-open-plan">
            ⚡ Open in Shift Planner
          </Link>
        </div>
      </div>

      {/* Selectors Bar (Hidden in Print) */}
      <div className="report-selectors card no-print">
        <div className="selector-group">
          <label htmlFor="report-city-select" className="label">Target Location</label>
          <select
            id="report-city-select"
            className="select"
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
          >
            {cities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.state})
              </option>
            ))}
          </select>
        </div>

        <div className="selector-group">
          <label className="label">Job Profile</label>
          <div className="job-pill-group">
            {JOBS.map((j) => (
              <button
                key={j.id}
                type="button"
                className={`job-pill ${selectedJob === j.id ? 'active' : ''}`}
                onClick={() => setSelectedJob(j.id)}
              >
                <span>{j.icon}</span> {j.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading && <LoadingSkeleton height={500} />}
      {error && <ErrorState title="Brief Generation Failed" message={error} onRetry={loadData} />}

      {plan && !loading && !error && (
        <div className="printable-brief card">
          {/* Document Header */}
          <div className="brief-header">
            <div className="brief-brand">
              <span className="brand-logo">🛡️ CHHAYA</span>
              <span className="brand-tagline">Occupational Thermal & Air Quality Brief</span>
            </div>
            <div className="brief-meta">
              <div className="meta-item">
                <span className="meta-label">Date:</span>
                <span className="meta-value">{dateStr}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Location:</span>
                <span className="meta-value">{currentCityObj?.name || selectedCity}, {currentCityObj?.state}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Profile:</span>
                <span className="meta-value">{currentJobObj?.label || selectedJob}</span>
              </div>
            </div>
          </div>

          {/* Key Executive Risk Summary */}
          <div className="brief-risk-banner">
            <div className="banner-left">
              <span className="summary-label">OVERALL SHIFT EXPOSURE LEVEL</span>
              <div className="risk-display">
                <RiskPill level={plan.overall_risk} />
                <span className="risk-explanation">
                  {plan.overall_risk === 'EXTREME' && 'Critical thermal hazard. Mandatory halt to outdoor manual exertion during peak hours.'}
                  {plan.overall_risk === 'HIGH' && 'High thermal stress. Reduce workload and enforce shaded breaks.'}
                  {plan.overall_risk === 'MODERATE' && 'Moderate stress. Work-rest cycles and active hydration protocol active.'}
                  {plan.overall_risk === 'LOW' && 'Normal operational envelope with standard baseline hydration.'}
                </span>
              </div>
            </div>
            <div className="banner-metrics">
              <div className="metric-box">
                <span className="m-val">{hoursFlagged}h</span>
                <span className="m-lbl">Flagged Hours</span>
              </div>
              <div className="metric-box">
                <span className="m-val">{maxWbgt.toFixed(1)}°C</span>
                <span className="m-lbl">Peak WBGT</span>
              </div>
              <div className="metric-box">
                <span className="m-val">{maxAqi.toFixed(0)}</span>
                <span className="m-lbl">Peak PM2.5 AQI</span>
              </div>
            </div>
          </div>

          {/* 2-Column Operational Grid */}
          <div className="brief-grid">
            {/* Left Column: Shift Timing & Risk Windows */}
            <div className="brief-col">
              <h3 className="section-heading">1. Top Flagged Risk Windows</h3>
              {plan.dangerous_windows && plan.dangerous_windows.length > 0 ? (
                <div className="window-cards-list">
                  {plan.dangerous_windows.slice(0, 3).map((w, idx) => (
                    <div key={idx} className={`window-brief-card status-${w.status.toLowerCase()}`}>
                      <div className="wb-time">
                        {new Date(w.start).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                        {' – '}
                        {new Date(w.end).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                      </div>
                      <div className="wb-badge">
                        <RiskPill level={w.status} />
                      </div>
                      <div className="wb-metrics">
                        <span>Status: {w.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="clean-note">✓ No dangerous exposure windows flagged across this shift envelope.</p>
              )}

              <h3 className="section-heading" style={{ marginTop: '1.25rem' }}>2. Recommended Safe Work Blocks</h3>
              {plan.recommended_blocks && plan.recommended_blocks.length > 0 ? (
                <div className="safe-blocks-list">
                  {plan.recommended_blocks.map((b, idx) => (
                    <div key={idx} className="safe-block-item">
                      <span className="sb-icon">🟢</span>
                      <span className="sb-time">
                        {new Date(b.start).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                        {' – '}
                        {new Date(b.end).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                      </span>
                      <span className="sb-desc">Optimal window for strenuous tasks</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="clean-note">Continuous caution advised. Shift should be divided with frequent shade breaks.</p>
              )}
            </div>

            {/* Right Column: Protocols & Gear */}
            <div className="brief-col">
              <h3 className="section-heading">3. Mandatory Operational Directives</h3>
              
              <div className="protocol-box">
                <div className="proto-icon">💧</div>
                <div className="proto-text">
                  <strong>Hydration Protocol</strong>
                  <p>Enforce 500–750 ml cool electrolyte fluid per hour of active labor. Ensure shade tents provide chilled water points.</p>
                </div>
              </div>

              <div className="protocol-box">
                <div className="proto-icon">😷</div>
                <div className="proto-text">
                  <strong>Respiratory Protection</strong>
                  <p>
                    {aqiFlagged
                      ? 'N95 Particulate Respirator REQUIRED during flagged high particulate windows (AQI > 150).'
                      : 'Standard dust protection recommended for demolition / roadside particulate exposure.'}
                  </p>
                </div>
              </div>

              <div className="protocol-box">
                <div className="proto-icon">⏱️</div>
                <div className="proto-text">
                  <strong>Rest-to-Work Ratios</strong>
                  <p>
                    {plan.overall_risk === 'EXTREME' && 'Halt manual outdoor labor. Move crews into active cool zones.'}
                    {plan.overall_risk === 'HIGH' && 'Minimum 30 minutes shaded rest per 30 minutes exertion.'}
                    {plan.overall_risk === 'MODERATE' && '15 minutes shaded rest per 45 minutes exertion.'}
                    {plan.overall_risk === 'LOW' && 'Standard 10-15 minute hourly recovery breaks.'}
                  </p>
                </div>
              </div>

              <div className="protocol-box emergency">
                <div className="proto-icon">🚨</div>
                <div className="proto-text">
                  <strong>Heat Stroke Emergency (108)</strong>
                  <p>Symptoms: Confusion, hot red dry skin, fainting. Move immediately to shade, douse with cool water, fan vigorously, and call 108.</p>
                </div>
              </div>
            </div>
          </div>

          {/* National City Risk Comparison Table */}
          {boardData.length > 0 && (
            <div className="brief-ranking-section">
              <h3 className="section-heading">4. National Risk Context (12-City Overview)</h3>
              <div className="ranking-table-wrapper">
                <table className="ranking-table">
                  <thead>
                    <tr>
                      <th>City</th>
                      <th>State</th>
                      <th>Peak WBGT</th>
                      <th>Peak AQI</th>
                      <th>Risk Level</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...boardData]
                      .sort((a, b) => (b.peak_12h_wbgt_c || b.current_wbgt_c || 0) - (a.peak_12h_wbgt_c || a.current_wbgt_c || 0))
                      .slice(0, 6)
                      .map((c) => {
                        const cityObj = cities.find((city) => city.id === c.city_id);
                        return (
                          <tr key={c.city_id} className={c.city_id === selectedCity ? 'highlight-row' : ''}>
                            <td><strong>{c.city_name || cityObj?.name || c.city_id}</strong></td>
                            <td className="text-muted">{cityObj?.state || ''}</td>
                            <td>{(c.peak_12h_wbgt_c ?? c.current_wbgt_c ?? 0).toFixed(1)}°C</td>
                            <td>{(c.current_aqi ?? 0).toFixed(0)}</td>
                            <td><RiskPill level={c.current_risk} /></td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Document Footer */}
          <div className="brief-footer">
            <div className="footer-left">
              <span>Data Source: Modelled weather and air-quality data (Open-Meteo / CAMS).</span>
              <span>Working defaults pending local physiological validation (docs/ASSUMPTIONS.md).</span>
            </div>
            <div className="footer-right">
              <span>Chhaya Safety Engine v0.3.0 • chhaya.app</span>
            </div>
          </div>
        </div>
      )}

      {/* Embedded CSS for Page and Print */}
      <style>{`
        .report-page {
          max-width: 1000px;
          margin: 0 auto;
          padding: 1.5rem 1rem 3rem;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        .report-controls {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          flex-wrap: wrap;
          gap: 1rem;
        }
        .controls-right {
          display: flex;
          gap: 0.75rem;
          flex-wrap: wrap;
        }
        .report-selectors {
          display: flex;
          gap: 2rem;
          flex-wrap: wrap;
          align-items: center;
          padding: 1.25rem 1.5rem;
        }
        .selector-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .job-pill-group {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }
        .job-pill {
          background: var(--surface-2);
          border: 1px solid var(--border);
          color: var(--text-primary);
          padding: 0.4rem 0.8rem;
          border-radius: var(--radius-full);
          font-size: 0.875rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.4rem;
          transition: all 0.15s ease;
        }
        .job-pill.active {
          background: var(--brand-orange);
          color: #fff;
          border-color: var(--brand-orange);
          font-weight: 600;
        }
        .printable-brief {
          background: var(--surface-1);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          padding: 2rem;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        .brief-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 2px solid var(--border);
          padding-bottom: 1.25rem;
          flex-wrap: wrap;
          gap: 1rem;
        }
        .brief-brand {
          display: flex;
          flex-direction: column;
        }
        .brand-logo {
          font-size: 1.5rem;
          font-weight: 800;
          letter-spacing: -0.02em;
          color: var(--brand-orange);
        }
        .brand-tagline {
          font-size: 0.85rem;
          color: var(--text-secondary);
        }
        .brief-meta {
          display: flex;
          gap: 1.5rem;
          flex-wrap: wrap;
        }
        .meta-item {
          display: flex;
          flex-direction: column;
        }
        .meta-label {
          font-size: 0.75rem;
          color: var(--text-muted);
          text-transform: uppercase;
          font-weight: 600;
        }
        .meta-value {
          font-size: 0.95rem;
          font-weight: 600;
          color: var(--text-primary);
        }
        .brief-risk-banner {
          display: flex;
          justify-content: space-between;
          background: var(--surface-2);
          border-radius: var(--radius-md);
          padding: 1.25rem 1.5rem;
          align-items: center;
          gap: 1.5rem;
          flex-wrap: wrap;
        }
        .banner-left {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          max-width: 550px;
        }
        .summary-label {
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          font-weight: 700;
          color: var(--text-muted);
        }
        .risk-display {
          display: flex;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
        }
        .risk-explanation {
          font-size: 0.875rem;
          color: var(--text-secondary);
          line-height: 1.35;
        }
        .banner-metrics {
          display: flex;
          gap: 1.25rem;
        }
        .metric-box {
          display: flex;
          flex-direction: column;
          align-items: center;
          background: var(--surface-3);
          padding: 0.5rem 0.875rem;
          border-radius: var(--radius-sm);
        }
        .m-val {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--text-primary);
        }
        .m-lbl {
          font-size: 0.7rem;
          color: var(--text-muted);
          text-transform: uppercase;
        }
        .brief-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.75rem;
        }
        @media (max-width: 768px) {
          .brief-grid {
            grid-template-columns: 1fr;
          }
        }
        .section-heading {
          font-size: 0.95rem;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }
        .window-cards-list, .safe-blocks-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .window-brief-card {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.6rem 0.875rem;
          background: var(--surface-2);
          border-radius: var(--radius-sm);
          font-size: 0.875rem;
          border-left: 4px solid var(--border);
        }
        .window-brief-card.status-rest { border-left-color: #ef4444; }
        .window-brief-card.status-avoid { border-left-color: #f97316; }
        .window-brief-card.status-reduced { border-left-color: #eab308; }
        .window-brief-card.status-caution { border-left-color: #3b82f6; }
        .window-brief-card.status-work { border-left-color: #10b981; }
        .wb-time { font-weight: 600; }
        .wb-metrics {
          font-size: 0.75rem;
          color: var(--text-muted);
          display: flex;
          gap: 0.75rem;
        }
        .safe-block-item {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          padding: 0.5rem 0.75rem;
          background: rgba(16, 185, 129, 0.08);
          border: 1px solid rgba(16, 185, 129, 0.2);
          border-radius: var(--radius-sm);
          font-size: 0.875rem;
        }
        .sb-time { font-weight: 600; color: var(--text-primary); }
        .sb-desc { font-size: 0.75rem; color: var(--text-secondary); margin-left: auto; }
        .protocol-box {
          display: flex;
          gap: 0.75rem;
          padding: 0.65rem 0.875rem;
          background: var(--surface-2);
          border-radius: var(--radius-sm);
          margin-bottom: 0.5rem;
          font-size: 0.825rem;
        }
        .protocol-box.emergency {
          background: rgba(239, 68, 68, 0.08);
          border: 1px solid rgba(239, 68, 68, 0.25);
        }
        .proto-icon { font-size: 1.15rem; }
        .proto-text strong { display: block; font-size: 0.85rem; color: var(--text-primary); margin-bottom: 0.15rem; }
        .proto-text p { margin: 0; color: var(--text-secondary); line-height: 1.35; }
        .ranking-table-wrapper {
          overflow-x: auto;
        }
        .ranking-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.85rem;
        }
        .ranking-table th, .ranking-table td {
          padding: 0.5rem 0.75rem;
          text-align: left;
          border-bottom: 1px solid var(--border);
        }
        .ranking-table th {
          font-size: 0.75rem;
          text-transform: uppercase;
          color: var(--text-muted);
          background: var(--surface-2);
        }
        .ranking-table tr.highlight-row {
          background: rgba(249, 115, 22, 0.08);
        }
        .brief-footer {
          border-top: 1px solid var(--border);
          padding-top: 1rem;
          display: flex;
          justify-content: space-between;
          font-size: 0.75rem;
          color: var(--text-muted);
          flex-wrap: wrap;
          gap: 0.5rem;
        }
        .footer-left {
          display: flex;
          flex-direction: column;
        }

        /* PRINT STYLES */
        @media print {
          body {
            background: #fff !important;
            color: #000 !important;
          }
          .no-print, header, footer, nav {
            display: none !important;
          }
          .report-page {
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .printable-brief {
            border: 1px solid #ddd !important;
            box-shadow: none !important;
            padding: 1rem !important;
            background: #fff !important;
            color: #000 !important;
          }
          .brief-risk-banner, .window-brief-card, .protocol-box, .metric-box, .ranking-table th {
            background: #f8f8f8 !important;
            color: #000 !important;
            border-color: #ccc !important;
          }
          .risk-explanation, .meta-value, .proto-text p, .text-muted, .wb-metrics {
            color: #333 !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Report;
