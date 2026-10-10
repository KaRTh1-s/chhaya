import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiClient } from '../api/client';
import type {
  Advisory,
  City,
  DayPlan,
  JobType,
  Language,
  Scenario,
  SunExposure,
  Workload,
} from '../api/types';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { EvidenceChip } from '../components/EvidenceChip';
import { EmptyState, ErrorState, LoadingSkeleton } from '../components/Feedback';
import { Kicker, SerifHeading } from '../components/Headings';
import { HourlyChart } from '../components/HourlyChart';
import { HourRibbon } from '../components/HourRibbon';
import { RiskPill } from '../components/RiskPill';
import { WindowList } from '../components/WindowList';
import { formatWhatsAppText } from '../utils/formatters';

export const PlansPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Cities & Scenarios
  const [cities, setCities] = useState<City[]>([]);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);

  // Form State
  const [mode, setMode] = useState<'live' | 'replay'>(
    searchParams.get('scenario') ? 'replay' : 'live'
  );
  const [selectedCity, setSelectedCity] = useState<string>(searchParams.get('city') || 'delhi');
  const [selectedScenario, setSelectedScenario] = useState<string>(
    searchParams.get('scenario') || 'delhi-heatwave-2025-06-09'
  );
  const [jobType, setJobType] = useState<JobType>(
    (searchParams.get('job') as JobType) || 'CONSTRUCTION'
  );
  const [workload, setWorkload] = useState<Workload>(
    (searchParams.get('workload') as Workload) || 'HEAVY'
  );
  const [sunExposure, setSunExposure] = useState<SunExposure>(
    (searchParams.get('sun') as SunExposure) || 'FULL'
  );
  const [preferredStart, setPreferredStart] = useState<number>(
    parseInt(searchParams.get('start') || '6', 10)
  );
  const [preferredEnd, setPreferredEnd] = useState<number>(
    parseInt(searchParams.get('end') || '20', 10)
  );
  const [maxHours, setMaxHours] = useState<number>(
    parseInt(searchParams.get('max_hours') || '8', 10)
  );
  const [language, setLanguage] = useState<Language>(
    (searchParams.get('lang') as Language) || 'en'
  );

  // Geolocation state
  const [geoLoc, setGeoLoc] = useState<{ lat: number; lon: number } | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);

  // Plan Data & Execution State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<DayPlan | null>(null);
  const [advisory, setAdvisory] = useState<Advisory | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Fetch Cities and Scenarios on mount
  useEffect(() => {
    let mounted = true;
    apiClient.getCities().then((res) => {
      if (mounted) setCities(res.cities);
    });
    apiClient.getScenarios().then((res) => {
      if (mounted) setScenarios(res.scenarios);
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Update Workload and Sun default when JobType changes
  const handleJobChange = (newJob: JobType) => {
    setJobType(newJob);
    if (newJob === 'RIDER') {
      setWorkload('MODERATE');
      setSunExposure('FULL');
    } else if (newJob === 'CONSTRUCTION') {
      setWorkload('HEAVY');
      setSunExposure('FULL');
    } else if (newJob === 'VENDOR') {
      setWorkload('LIGHT');
      setSunExposure('PARTIAL');
    } else if (newJob === 'SANITATION') {
      setWorkload('HEAVY');
      setSunExposure('FULL');
    }
  };

  // Sync state to URL Query Params
  useEffect(() => {
    const params: Record<string, string> = {
      job: jobType,
      workload,
      sun: sunExposure,
      lang: language,
      start: preferredStart.toString(),
      end: preferredEnd.toString(),
      max_hours: maxHours.toString(),
    };
    if (mode === 'replay') {
      params.scenario = selectedScenario;
    } else {
      params.city = selectedCity;
    }
    setSearchParams(params, { replace: true });
  }, [mode, selectedCity, selectedScenario, jobType, workload, sunExposure, preferredStart, preferredEnd, maxHours, language, setSearchParams]);

  // Generate / Fetch Plan
  const fetchPlan = async () => {
    setLoading(true);
    setError(null);

    try {
      const planReq = {
        city_id: mode === 'live' && !geoLoc ? selectedCity : undefined,
        scenario: mode === 'replay' ? selectedScenario : undefined,
        lat: geoLoc ? geoLoc.lat : undefined,
        lon: geoLoc ? geoLoc.lon : undefined,
        job_type: jobType,
        workload,
        sun_exposure: sunExposure,
        preferred_start_hour: preferredStart,
        preferred_end_hour: preferredEnd,
        max_shift_hours: maxHours,
      };

      const res = await apiClient.getAdvisory({
        ...planReq,
        language,
      });

      setPlan(res.plan);
      setAdvisory(res.advisory);
    } catch (err: unknown) {
      console.warn('Failed to generate full advisory, attempting fallback plan', err);
      try {
        const fallbackPlan = await apiClient.getPlan({
          city_id: mode === 'live' && !geoLoc ? selectedCity : undefined,
          scenario: mode === 'replay' ? selectedScenario : undefined,
          job_type: jobType,
          workload,
          sun_exposure: sunExposure,
          preferred_start_hour: preferredStart,
          preferred_end_hour: preferredEnd,
          max_shift_hours: maxHours,
        });
        setPlan(fallbackPlan);
        setAdvisory({
          language,
          sentences: [
            {
              text: `Shift guidance generated in deterministic fallback mode for ${fallbackPlan.city_label}. Overall risk is ${fallbackPlan.overall_risk}.`,
              evidence_ids: fallbackPlan.evidence.map((e) => e.id).slice(0, 2),
            },
          ],
          used_fallback: true,
          fallback_reason: 'Advisory agent fallback engaged',
        });
      } catch (fallbackErr: unknown) {
        setError(fallbackErr instanceof Error ? fallbackErr.message : 'Unable to generate shift plan.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchPlan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, selectedCity, selectedScenario, language]);

  // Geolocation Handler
  const handleUseLocation = () => {
    setGeoError(null);
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;

        // India Bounding Box: 8.0°N to 37.0°N, 68.0°E to 97.5°E
        if (lat < 8.0 || lat > 37.0 || lon < 68.0 || lon > 97.5) {
          setGeoError(
            `Location (${lat.toFixed(2)}°N, ${lon.toFixed(2)}°E) is outside India's meteorological bounding box (8°N–37°N, 68°E–97.5°E).`
          );
          return;
        }

        setGeoLoc({ lat, lon });
        setMode('live');
        fetchPlan();
      },
      (err) => {
        setGeoError(`Unable to retrieve position: ${err.message}`);
      }
    );
  };

  // Copy as WhatsApp text
  const handleCopyWhatsApp = () => {
    if (!plan) return;
    const text = formatWhatsAppText(plan, advisory, language);
    navigator.clipboard.writeText(text).then(() => {
      setToastMessage('Copied WhatsApp summary to clipboard!');
      setTimeout(() => setToastMessage(null), 3000);
    });
  };

  // Share
  const handleShare = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({
        title: `Chhaya Shift Plan - ${plan?.city_label || 'India'}`,
        text: `Check out the worker heat & air exposure shift safety plan on Chhaya`,
        url,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url).then(() => {
        setToastMessage('Link copied to clipboard!');
        setTimeout(() => setToastMessage(null), 3000);
      });
    }
  };

  // Evidence lookup map
  const evidenceMap = new Map((plan?.evidence || []).map((e) => [e.id, e]));

  return (
    <div className="container" style={{ padding: 'var(--space-8) var(--space-4)' }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            backgroundColor: 'var(--color-forest)',
            color: '#FFFFFF',
            padding: '10px 18px',
            borderRadius: 'var(--radius-pill)',
            boxShadow: 'var(--shadow-card-elevated)',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.85rem',
            zIndex: 100,
          }}
        >
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 'var(--space-8)' }}>
        <Kicker>CUSTOM SHIFT COPILOT</Kicker>
        <SerifHeading level={1} size="display" text="Shift Safety &amp; *Exposure Planner.*" />
        <p style={{ maxWidth: '680px', marginTop: 'var(--space-2)', fontSize: '1.1rem', color: 'var(--color-ink-muted)' }}>
          Generates work/rest intervals, hydration frequency, and plain-language guidance pinned to modelled Open-Meteo &amp; CAMS data.
        </p>
      </div>

      {/* PLANNER CONFIGURATION FORM */}
      <Card variant="beige" style={{ marginBottom: 'var(--space-8)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-forest)', textTransform: 'uppercase' }}>
            Shift Parameters
          </div>

          {/* Mode Toggle: Live vs Replay */}
          <div style={{ display: 'flex', gap: '4px', backgroundColor: 'rgba(27,27,27,0.06)', padding: '3px', borderRadius: 'var(--radius-pill)' }}>
            <button
              type="button"
              onClick={() => {
                setMode('live');
                setGeoLoc(null);
              }}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.75rem',
                padding: '4px 14px',
                borderRadius: 'var(--radius-pill)',
                border: 'none',
                backgroundColor: mode === 'live' ? '#FFFFFF' : 'transparent',
                fontWeight: mode === 'live' ? 600 : 400,
                cursor: 'pointer',
              }}
            >
              Live Forecast
            </button>
            <button
              type="button"
              onClick={() => setMode('replay')}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.75rem',
                padding: '4px 14px',
                borderRadius: 'var(--radius-pill)',
                border: 'none',
                backgroundColor: mode === 'replay' ? '#FFFFFF' : 'transparent',
                fontWeight: mode === 'replay' ? 600 : 400,
                cursor: 'pointer',
              }}
            >
              Recorded Replay
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)' }}>
          {/* City / Scenario Picker */}
          {mode === 'live' ? (
            <div>
              <label htmlFor="city-select" style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', marginBottom: '6px', fontWeight: 600 }}>
                City (12 Indian Metros)
              </label>
              <select
                id="city-select"
                value={selectedCity}
                disabled={Boolean(geoLoc)}
                onChange={(e) => {
                  setSelectedCity(e.target.value);
                  setGeoLoc(null);
                }}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid rgba(27,27,27,0.2)',
                  fontFamily: 'inherit',
                  fontSize: '0.9rem',
                }}
              >
                {cities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.state})
                  </option>
                ))}
              </select>

              <div style={{ marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={handleUseLocation}
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.7rem',
                    color: 'var(--color-forest)',
                    textDecoration: 'underline',
                    cursor: 'pointer',
                  }}
                >
                  {geoLoc ? `✓ Using GPS (${geoLoc.lat.toFixed(2)}°N)` : '📍 Use my GPS location'}
                </button>
                {geoError && (
                  <div style={{ color: 'var(--risk-extreme-text)', fontSize: '0.7rem', marginTop: '2px' }}>
                    {geoError}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div>
              <label htmlFor="scenario-select" style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', marginBottom: '6px', fontWeight: 600 }}>
                Historical Replay Scenario
              </label>
              <select
                id="scenario-select"
                value={selectedScenario}
                onChange={(e) => setSelectedScenario(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid rgba(27,27,27,0.2)',
                  fontFamily: 'inherit',
                  fontSize: '0.85rem',
                }}
              >
                {scenarios.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label} ({s.max_temp_c}°C / PM2.5 {s.max_pm2_5})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Job Type */}
          <div>
            <label htmlFor="job-select" style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', marginBottom: '6px', fontWeight: 600 }}>
              Job Category
            </label>
            <select
              id="job-select"
              value={jobType}
              onChange={(e) => handleJobChange(e.target.value as JobType)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid rgba(27,27,27,0.2)',
                fontFamily: 'inherit',
                fontSize: '0.9rem',
              }}
            >
              <option value="CONSTRUCTION">Construction (Mason/Labor)</option>
              <option value="RIDER">Delivery Rider (2-Wheeler)</option>
              <option value="VENDOR">Street Vendor (Cart/Market)</option>
              <option value="SANITATION">Sanitation / Waste Worker</option>
            </select>
          </div>

          {/* Workload */}
          <div>
            <label htmlFor="workload-select" style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', marginBottom: '6px', fontWeight: 600 }}>
              Physical Workload
            </label>
            <select
              id="workload-select"
              value={workload}
              onChange={(e) => setWorkload(e.target.value as Workload)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid rgba(27,27,27,0.2)',
                fontFamily: 'inherit',
                fontSize: '0.9rem',
              }}
            >
              <option value="LIGHT">Light (Limit 30°C)</option>
              <option value="MODERATE">Moderate (Limit 28°C)</option>
              <option value="HEAVY">Heavy (Limit 26°C)</option>
            </select>
          </div>

          {/* Sun Exposure */}
          <div>
            <label htmlFor="sun-select" style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', marginBottom: '6px', fontWeight: 600 }}>
              Direct Sun Exposure
            </label>
            <select
              id="sun-select"
              value={sunExposure}
              onChange={(e) => setSunExposure(e.target.value as SunExposure)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid rgba(27,27,27,0.2)',
                fontFamily: 'inherit',
                fontSize: '0.9rem',
              }}
            >
              <option value="FULL">Full Sunlight (+2.0°C adj)</option>
              <option value="PARTIAL">Partial Shade</option>
              <option value="SHADE">Full Indoor / Canopy Shade</option>
            </select>
          </div>

          {/* Language Selector */}
          <div>
            <label htmlFor="lang-select" style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', marginBottom: '6px', fontWeight: 600 }}>
              Advisory Language
            </label>
            <select
              id="lang-select"
              value={language}
              onChange={(e) => setLanguage(e.target.value as Language)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid rgba(27,27,27,0.2)',
                fontFamily: 'inherit',
                fontSize: '0.9rem',
              }}
            >
              <option value="en">English (Grounded)</option>
              <option value="hi">हिन्दी (Devanagari)</option>
              <option value="ta">தமிழ் (Tamil)</option>
            </select>
          </div>
        </div>

        {/* Shift Timing Sliders */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--space-4)', marginTop: 'var(--space-4)', paddingTop: '12px', borderTop: '1px solid rgba(27,27,27,0.08)' }}>
          <div>
            <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', marginBottom: '4px' }}>
              Shift Window: <strong>{preferredStart}:00 – {preferredEnd}:00</strong>
            </label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="range"
                min="0"
                max="23"
                value={preferredStart}
                onChange={(e) => setPreferredStart(parseInt(e.target.value, 10))}
                style={{ width: '50%' }}
                aria-label="Shift start hour"
              />
              <input
                type="range"
                min="0"
                max="23"
                value={preferredEnd}
                onChange={(e) => setPreferredEnd(parseInt(e.target.value, 10))}
                style={{ width: '50%' }}
                aria-label="Shift end hour"
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', marginBottom: '4px' }}>
              Max Working Hours: <strong>{maxHours} hours</strong>
            </label>
            <input
              type="range"
              min="2"
              max="14"
              value={maxHours}
              onChange={(e) => setMaxHours(parseInt(e.target.value, 10))}
              style={{ width: '100%' }}
              aria-label="Maximum shift working hours"
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end' }}>
            <Button variant="primary" onClick={fetchPlan} disabled={loading}>
              {loading ? 'Evaluating Model...' : 'Update Plan &rarr;'}
            </Button>
          </div>
        </div>
      </Card>

      {/* PLAN OUTPUT SECTION */}
      {loading && <LoadingSkeleton rows={5} height="40px" />}

      {error && (
        <ErrorState
          title="Could not evaluate day plan"
          message={error}
          onRetry={fetchPlan}
        />
      )}

      {!loading && !error && plan && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          {/* Plan Result Header */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 'var(--radius-card)',
              border: '2px solid var(--color-ink)',
              padding: 'var(--space-6)',
              boxShadow: 'var(--shadow-hard-cta)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 'var(--space-4)',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--color-forest)', textTransform: 'uppercase', fontWeight: 600 }}>
                  {plan.city_label} &middot; {plan.recorded_date || 'Live Run'}
                </span>
                <span className="badge-demo">
                  source: {plan.data_source || 'modelled'}
                </span>
              </div>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', margin: 0 }}>
                {jobType} Shift Plan &middot; {workload} Workload
              </h2>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--color-ink-muted)' }}>OVERALL DAY RISK</div>
                <RiskPill level={plan.overall_risk} />
              </div>
            </div>
          </div>

          {/* 24-Hour Ribbon */}
          <Card variant="white">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-forest)' }}>
                24-HOUR EXPOSURE RIBBON
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-ink-muted)' }}>
                Hourly ISO 7243 WBGT heat stress &amp; AQI tier
              </span>
            </div>
            <HourRibbon hours={plan.hours} />
          </Card>

          {/* Inline SVG Chart */}
          <Card variant="white">
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-forest)', marginBottom: '12px' }}>
              WBGT HEAT STRESS CURVE VS SAFE WORKLOAD THRESHOLD
            </div>
            <HourlyChart
              hours={plan.hours}
              workload={workload}
              shiftStart={preferredStart}
              shiftEnd={preferredEnd}
            />
          </Card>

          {/* Windows & Best Blocks Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--space-6)' }}>
            <Card variant="beige">
              <WindowList
                title="DANGEROUS SHIFT WINDOWS (AVOID / REST)"
                windows={plan.dangerous_windows}
                emptyMessage="✓ No extreme heat or smog windows detected in this shift."
              />
            </Card>

            <Card variant="beige">
              <WindowList
                title="RECOMMENDED SAFE WORK BLOCKS"
                windows={plan.recommended_blocks}
                emptyMessage="⚠ Continuous high risk: no completely safe block found. Staggered rest required."
              />
            </Card>
          </div>

          {/* Hydration & Mask Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--space-6)' }}>
            {/* Hydration Card */}
            <Card variant="beige">
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-forest)', marginBottom: '8px' }}>
                💧 HYDRATION GUIDANCE (HEAT STRESS DERIVED)
              </div>
              <p style={{ fontSize: '0.95rem', color: 'var(--color-ink)' }}>
                {plan.hydration.guideline ||
                  (plan.hydration.needed
                    ? 'Drink at least 250ml water every 15-20 minutes with ORS salts during high WBGT hours.'
                    : 'Maintain regular baseline hydration (250ml per hour).')}
              </p>
              {plan.hydration.frequent_windows && plan.hydration.frequent_windows.length > 0 && (
                <div style={{ marginTop: '8px', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--risk-high-text)' }}>
                  Frequent intake required: {plan.hydration.frequent_windows.map((w) => `${w.start}–${w.end}`).join(', ')}
                </div>
              )}
            </Card>

            {/* Mask Card */}
            <Card variant="beige">
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-forest)', marginBottom: '8px' }}>
                😷 PARTICULATE &amp; SMOG PROTECTION
              </div>
              <p style={{ fontSize: '0.95rem', color: 'var(--color-ink)' }}>
                {plan.mask.needed
                  ? `N95 particulate respirator advised during peak hours. ${plan.mask.note || 'High ambient PM2.5 detected.'}`
                  : 'Air quality levels within standard limits. Particulate mask optional.'}
              </p>
            </Card>
          </div>

          {/* Plain-Language Worker Advisory Card */}
          <Card variant="white" style={{ border: '2px solid var(--color-forest)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-forest)', textTransform: 'uppercase' }}>
                  Worker Advisory
                </span>
                <span className="badge-demo" style={{ backgroundColor: 'var(--color-forest)', color: '#FFFFFF' }}>
                  {advisory?.mode === 'bedrock' ? 'Amazon Bedrock' : 'Deterministic Template'}
                </span>
                {advisory?.validated && (
                  <span className="badge-demo" style={{ backgroundColor: 'var(--risk-low-bg)', color: 'var(--risk-low-text)' }}>
                    ✓ Grounded
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', gap: '4px' }}>
                {(['en', 'hi', 'ta'] as Language[]).map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setLanguage(l)}
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.75rem',
                      padding: '3px 10px',
                      borderRadius: 'var(--radius-pill)',
                      border: language === l ? '1px solid var(--color-ink)' : '1px solid transparent',
                      backgroundColor: language === l ? 'var(--color-lavender-cta)' : 'transparent',
                      fontWeight: language === l ? 600 : 400,
                      cursor: 'pointer',
                    }}
                  >
                    {l === 'en' ? 'English' : l === 'hi' ? 'हिन्दी' : 'தமிழ்'}
                  </button>
                ))}
              </div>
            </div>

            {/* Sentences with pinned EvidenceChips */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '1.05rem', lineHeight: '1.6' }}>
              {advisory?.sentences && advisory.sentences.length > 0 ? (
                advisory.sentences.map((s, idx) => (
                  <div key={idx}>
                    <span>{s.text}</span>
                    {s.evidence_ids.map((evId) => {
                      const card = evidenceMap.get(evId);
                      return card ? <EvidenceChip key={evId} card={card} /> : null;
                    })}
                  </div>
                ))
              ) : (
                <div>Generating plain-language guidance...</div>
              )}
            </div>

            {/* Emergency Seek-Help Notice */}
            <div
              style={{
                marginTop: '16px',
                padding: '12px 16px',
                backgroundColor: 'var(--risk-extreme-bg)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--risk-extreme-border)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
              }}
            >
              <span style={{ fontSize: '1.1rem' }}>🚨</span>
              <div style={{ fontSize: '0.85rem', color: 'var(--risk-extreme-text)' }}>
                <strong>When to seek immediate medical help:</strong>{' '}
                {advisory?.seek_help && advisory.seek_help.length > 0
                  ? advisory.seek_help.join(' ')
                  : 'Dizziness, confusion, cessation of sweating or vomiting requires immediate shaded rest and calling 108.'}
              </div>
            </div>

            {/* Trust and Fallback Status */}
            {advisory?.used_fallback && (
              <div style={{ marginTop: '10px', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--risk-high-text)' }}>
                ℹ Fallback reason: {advisory.fallback_reason || 'Bedrock model offline, served deterministic grounded template'}
              </div>
            )}
          </Card>

          {/* Action Buttons: WhatsApp / Share / Print */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <Button variant="primary" onClick={handleCopyWhatsApp}>
              📋 Copy as WhatsApp Text
            </Button>
            <Button variant="secondary" onClick={handleShare}>
              🔗 Share Link
            </Button>
            <Button variant="secondary" onClick={() => window.print()}>
              🖨 Print Brief
            </Button>
          </div>
        </div>
      )}

      {!loading && !error && !plan && (
        <EmptyState
          title="No Shift Plan Evaluated"
          description="Select your city or scenario above to generate an actionable exposure plan."
          actionText="Evaluate Now"
          onAction={fetchPlan}
        />
      )}
    </div>
  );
};
