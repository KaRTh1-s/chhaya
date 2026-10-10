import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import type { BoardCity, BoardResponse, JobType, RiskLevel } from '../api/types';
import { Card } from '../components/Card';
import { EmptyState, ErrorState, LoadingSkeleton } from '../components/Feedback';
import { Kicker, SerifHeading } from '../components/Headings';
import { RiskPill } from '../components/RiskPill';

const RISK_WEIGHT: Record<RiskLevel, number> = {
  EXTREME: 4,
  HIGH: 3,
  MODERATE: 2,
  LOW: 1,
};

export const BoardPage: React.FC = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'live' | 'replay'>('live');
  const [boardData, setBoardData] = useState<BoardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Sorting
  const [jobFilter, setJobFilter] = useState<JobType | 'ALL'>('ALL');
  const [sortBy, setSortBy] = useState<'risk' | 'temp' | 'name'>('risk');

  const fetchBoard = async (selectedMode: 'live' | 'replay') => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.getBoard(selectedMode);
      setBoardData(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load risk board data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBoard(mode);
  }, [mode]);

  // Handle City / Job Click -> Open /plans
  const handleSelectShift = (cityId: string, job: JobType) => {
    if (mode === 'replay') {
      // Map city to scenario
      const scenarioMap: Record<string, string> = {
        delhi: 'delhi-heatwave-2025-06-09',
        chennai: 'chennai-humid-2025-05-31',
        coimbatore: 'coimbatore-mild-2025-01-15',
      };
      const scenario = scenarioMap[cityId] || 'delhi-heatwave-2025-06-09';
      navigate(`/plans?scenario=${scenario}&job=${job}`);
    } else {
      navigate(`/plans?city=${cityId}&job=${job}`);
    }
  };

  // Filter and Sort Cities
  const filteredCities = (boardData?.cities || []).filter((city: BoardCity) => {
    if (jobFilter === 'ALL') return true;
    return city.jobs?.some((j) => j.job_type === jobFilter) ?? true;
  });

  const sortedCities = [...filteredCities].sort((a, b) => {
    if (sortBy === 'risk') {
      const weightA = RISK_WEIGHT[a.current_risk] || 0;
      const weightB = RISK_WEIGHT[b.current_risk] || 0;
      return weightB - weightA;
    }
    if (sortBy === 'temp') {
      return (b.current_wbgt_c || 0) - (a.current_wbgt_c || 0);
    }
    return a.city_name.localeCompare(b.city_name);
  });

  return (
    <div className="container" style={{ padding: 'var(--space-8) var(--space-4)' }}>
      {/* Header */}
      <div style={{ marginBottom: 'var(--space-8)' }}>
        <Kicker>REGIONAL EXPOSURE MATRIX</Kicker>
        <SerifHeading level={1} size="display" text="National Heat &amp; Smog *Risk Board.*" />
        <p style={{ maxWidth: '680px', marginTop: 'var(--space-2)', fontSize: '1.1rem', color: 'var(--color-ink-muted)' }}>
          Real-time thermal exposure and 12-hour peak risk projections across 12 Indian urban hubs and historical replay scenarios.
        </p>
      </div>

      {/* CONTROLS BAR: Tabs, Filter & Sort */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 'var(--space-4)',
          backgroundColor: '#FFFFFF',
          padding: 'var(--space-4) var(--space-6)',
          borderRadius: 'var(--radius-card)',
          border: '1px solid rgba(27,27,27,0.1)',
          boxShadow: 'var(--shadow-card-soft)',
          marginBottom: 'var(--space-8)',
        }}
      >
        {/* Mode Tabs */}
        <div style={{ display: 'flex', gap: '4px', backgroundColor: 'var(--color-cream-surface)', padding: '3px', borderRadius: 'var(--radius-pill)' }}>
          <button
            type="button"
            onClick={() => setMode('live')}
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.8rem',
              padding: '6px 18px',
              borderRadius: 'var(--radius-pill)',
              border: 'none',
              backgroundColor: mode === 'live' ? 'var(--color-forest)' : 'transparent',
              color: mode === 'live' ? '#FFFFFF' : 'var(--color-ink)',
              fontWeight: mode === 'live' ? 600 : 500,
              cursor: 'pointer',
            }}
          >
            Live Forecast (12 Cities)
          </button>
          <button
            type="button"
            onClick={() => setMode('replay')}
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.8rem',
              padding: '6px 18px',
              borderRadius: 'var(--radius-pill)',
              border: 'none',
              backgroundColor: mode === 'replay' ? 'var(--color-forest)' : 'transparent',
              color: mode === 'replay' ? '#FFFFFF' : 'var(--color-ink)',
              fontWeight: mode === 'replay' ? 600 : 500,
              cursor: 'pointer',
            }}
          >
            Recorded Replays (4 Days)
          </button>
        </div>

        {/* Filter by Job */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-ink-muted)' }}>Job:</span>
            <select
              value={jobFilter}
              onChange={(e) => setJobFilter(e.target.value as JobType | 'ALL')}
              style={{
                fontFamily: 'inherit',
                fontSize: '0.8rem',
                padding: '4px 10px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid rgba(27,27,27,0.2)',
              }}
              aria-label="Filter by Job Type"
            >
              <option value="ALL">All Jobs</option>
              <option value="CONSTRUCTION">Construction</option>
              <option value="RIDER">Delivery Rider</option>
              <option value="SANITATION">Sanitation</option>
              <option value="VENDOR">Street Vendor</option>
            </select>
          </div>

          {/* Sort By */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-ink-muted)' }}>Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'risk' | 'temp' | 'name')}
              style={{
                fontFamily: 'inherit',
                fontSize: '0.8rem',
                padding: '4px 10px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid rgba(27,27,27,0.2)',
              }}
              aria-label="Sort Cities By"
            >
              <option value="risk">Risk Severity (High &rarr; Low)</option>
              <option value="temp">WBGT Heat Index</option>
              <option value="name">Alphabetical</option>
            </select>
          </div>
        </div>
      </div>

      {/* MATRIX CONTENT */}
      {loading && <LoadingSkeleton rows={6} height="80px" />}

      {error && <ErrorState title="Failed to load Risk Board" message={error} onRetry={() => fetchBoard(mode)} />}

      {!loading && !error && sortedCities.length === 0 && (
        <EmptyState
          title="No Cities Found"
          description="No cities match the active job filter."
          actionText="Reset Filter"
          onAction={() => setJobFilter('ALL')}
        />
      )}

      {!loading && !error && sortedCities.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 'var(--space-6)' }}>
          {sortedCities.map((city) => (
            <Card key={city.city_id} variant="white" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 'var(--space-6)' }}>
              <div>
                {/* City Card Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div>
                    <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.6rem', margin: 0 }}>{city.city_name}</h3>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-ink-muted)', marginTop: '2px' }}>
                      Dominant: {city.dominant_factor || 'HEAT'} &middot; Active Crews: {city.active_crews}
                    </div>
                  </div>
                  <RiskPill level={city.current_risk} />
                </div>

                {/* Primary Metrics Strip */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr',
                    gap: '8px',
                    padding: '10px',
                    backgroundColor: 'var(--color-cream-surface)',
                    borderRadius: 'var(--radius-sm)',
                    marginBottom: '16px',
                    textAlign: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--color-ink-muted)' }}>CURRENT WBGT</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1rem', fontWeight: 600 }}>{city.current_wbgt_c.toFixed(1)}&deg;C</div>
                  </div>
                  <div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--color-ink-muted)' }}>12H PEAK WBGT</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1rem', fontWeight: 600, color: 'var(--risk-extreme-text)' }}>
                      {city.peak_12h_wbgt_c.toFixed(1)}&deg;C
                    </div>
                  </div>
                  <div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--color-ink-muted)' }}>AQI</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1rem', fontWeight: 600 }}>{city.current_aqi}</div>
                  </div>
                </div>

                {/* Job Breakdown Rows */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {(city.jobs || [
                    { job_type: 'CONSTRUCTION', current_risk: city.current_risk, peak_12h_risk: city.peak_12h_risk, peak_wbgt_c: city.peak_12h_wbgt_c, hours_flagged: 4 },
                    { job_type: 'RIDER', current_risk: city.current_risk, peak_12h_risk: city.peak_12h_risk, peak_wbgt_c: city.peak_12h_wbgt_c - 1.5, hours_flagged: 2 },
                    { job_type: 'SANITATION', current_risk: city.current_risk, peak_12h_risk: city.peak_12h_risk, peak_wbgt_c: city.peak_12h_wbgt_c, hours_flagged: 4 },
                    { job_type: 'VENDOR', current_risk: city.current_risk === 'EXTREME' ? 'HIGH' : 'LOW', peak_12h_risk: city.peak_12h_risk, peak_wbgt_c: city.peak_12h_wbgt_c - 2.5, hours_flagged: 1 },
                  ])
                    .filter((j) => jobFilter === 'ALL' || j.job_type === jobFilter)
                    .map((j) => (
                      <button
                        key={j.job_type}
                        type="button"
                        onClick={() => handleSelectShift(city.city_id, j.job_type as JobType)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          backgroundColor: '#FFFFFF',
                          border: '1px solid rgba(27,27,27,0.1)',
                          borderRadius: 'var(--radius-sm)',
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'all var(--transition-fast)',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'var(--color-lavender-light)';
                          e.currentTarget.style.borderColor = 'var(--color-ink)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#FFFFFF';
                          e.currentTarget.style.borderColor = 'rgba(27,27,27,0.1)';
                        }}
                        title={`Generate plan for ${city.city_name} ${j.job_type}`}
                      >
                        <div>
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 600 }}>{j.job_type}</div>
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--color-ink-muted)' }}>
                            Flagged: {j.hours_flagged}h &middot; Peak: {j.peak_wbgt_c.toFixed(1)}&deg;C
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <RiskPill level={j.peak_12h_risk} label={`12h: ${j.peak_12h_risk}`} />
                          <span style={{ fontSize: '0.8rem', color: 'var(--color-forest)' }}>&rarr;</span>
                        </div>
                      </button>
                    ))}
                </div>
              </div>

              <div style={{ marginTop: '16px', textAlign: 'right' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-forest)' }}>
                  Click row to plan shift &rarr;
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
