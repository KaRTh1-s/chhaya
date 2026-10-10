import React, { useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import type { City, CrewWithPlan, JobType, Workload } from '../api/types';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { EmptyState, ErrorState, LoadingSkeleton } from '../components/Feedback';
import { Kicker, SerifHeading } from '../components/Headings';
import { RiskPill } from '../components/RiskPill';

const PASSCODE_STORAGE_KEY = 'chhaya_passcode';

export const CrewsPage: React.FC = () => {
  const [crews, setCrews] = useState<CrewWithPlan[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Auth & Passcode state stored in sessionStorage
  const [passcode, setPasscode] = useState<string>(
    sessionStorage.getItem(PASSCODE_STORAGE_KEY) || ''
  );
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [passcodeInput, setPasscodeInput] = useState('');

  // Create Form State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newCrewName, setNewCrewName] = useState('');
  const [newCrewCity, setNewCrewCity] = useState('delhi');
  const [newCrewJob, setNewCrewJob] = useState<JobType>('CONSTRUCTION');
  const [newCrewWorkload, setNewCrewWorkload] = useState<Workload>('HEAVY');
  const [newCrewSize, setNewCrewSize] = useState<number>(10);
  const [createError, setCreateError] = useState<string | null>(null);

  // Selected Crew Drawer State
  const [selectedCrew, setSelectedCrew] = useState<CrewWithPlan | null>(null);

  // Delete Confirmation State
  const [crewToDelete, setCrewToDelete] = useState<CrewWithPlan | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchCrews = async () => {
    setLoading(true);
    setError(null);
    try {
      const [crewsRes, citiesRes] = await Promise.all([
        apiClient.getCrews(),
        apiClient.getCities(),
      ]);
      setCrews(crewsRes.crews);
      setCities(citiesRes.cities);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch registered crews.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCrews();
  }, []);

  const handleSavePasscode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcodeInput.trim()) return;
    sessionStorage.setItem(PASSCODE_STORAGE_KEY, passcodeInput.trim());
    setPasscode(passcodeInput.trim());
    setIsAuthOpen(false);
    setPasscodeInput('');
    setActionSuccess('Passcode unlocked for this browser session.');
    setTimeout(() => setActionSuccess(null), 3500);
  };

  const handleClearPasscode = () => {
    sessionStorage.removeItem(PASSCODE_STORAGE_KEY);
    setPasscode('');
    setActionSuccess('Locked writes. Reads remain public.');
    setTimeout(() => setActionSuccess(null), 3500);
  };

  const handleCreateCrew = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    if (!passcode) {
      setIsAuthOpen(true);
      return;
    }

    try {
      await apiClient.createCrew(
        {
          name: newCrewName,
          city_id: newCrewCity,
          job_type: newCrewJob,
          workload: newCrewWorkload,
          size: newCrewSize,
        },
        passcode
      );
      setIsCreateOpen(false);
      setNewCrewName('');
      setActionSuccess(`Registered crew: ${newCrewName}`);
      setTimeout(() => setActionSuccess(null), 3500);
      fetchCrews();
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : 'Creation failed. Check passcode.');
    }
  };

  const handleDeleteCrew = async () => {
    if (!crewToDelete) return;
    try {
      await apiClient.deleteCrew(crewToDelete.id, passcode);
      setCrewToDelete(null);
      setActionSuccess(`Deleted crew: ${crewToDelete.name}`);
      setTimeout(() => setActionSuccess(null), 3500);
      fetchCrews();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Delete failed. Check passcode authorization.');
    }
  };

  const isUnlocked = Boolean(passcode);

  return (
    <div className="container" style={{ padding: 'var(--space-8) var(--space-4)' }}>
      {/* Toast */}
      {actionSuccess && (
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
          {actionSuccess}
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 'var(--space-8)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
        <div>
          <Kicker>WORKFORCE EXPOSURE ROSTER</Kicker>
          <SerifHeading level={1} size="display" text="Anonymous Worker *Crew Roster.*" />
          <p style={{ maxWidth: '680px', marginTop: 'var(--space-2)', fontSize: '1.1rem', color: 'var(--color-ink-muted)' }}>
            Public roster of registered cohorts for regional heat exposure monitoring. Mutations require passcode authentication.
          </p>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {isUnlocked ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="badge-demo" style={{ backgroundColor: 'var(--risk-low-bg)', color: 'var(--risk-low-text)' }}>
                🔓 Writes Unlocked
              </span>
              <Button variant="ghost" onClick={handleClearPasscode} style={{ fontSize: '0.75rem' }}>
                Lock
              </Button>
            </div>
          ) : (
            <Button variant="secondary" onClick={() => setIsAuthOpen(true)}>
              🔒 Unlock Writes
            </Button>
          )}

          <Button variant="primary" onClick={() => (isUnlocked ? setIsCreateOpen(true) : setIsAuthOpen(true))}>
            + Register Crew
          </Button>
        </div>
      </div>

      {/* CREWS LIST */}
      {loading && <LoadingSkeleton rows={5} height="90px" />}
      {error && <ErrorState title="Failed to load crews" message={error} onRetry={fetchCrews} />}

      {!loading && !error && crews.length === 0 && (
        <EmptyState
          title="No Crews Registered"
          description="Register your contractor crew to monitor shift heat exposure."
          actionText="+ Register First Crew"
          onAction={() => (isUnlocked ? setIsCreateOpen(true) : setIsAuthOpen(true))}
        />
      )}

      {!loading && !error && crews.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 'var(--space-6)' }}>
          {crews.map((crew) => {
            const hasFlagged = (crew.plan_summary?.hours_avoid || 0) > 0;
            const flaggedWorkers = hasFlagged ? crew.size : 0;

            return (
              <Card
                key={crew.id}
                variant="beige"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: 'var(--space-6)',
                  cursor: 'pointer',
                  position: 'relative',
                }}
                onClick={() => setSelectedCrew(crew)}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div>
                      <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem', margin: 0 }}>{crew.name}</h3>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-ink-muted)', marginTop: '2px' }}>
                        City: {crew.city_id.toUpperCase()} &middot; Size: {crew.size} workers
                      </div>
                    </div>
                    <RiskPill level={crew.plan_summary?.overall_risk || 'HIGH'} />
                  </div>

                  <div style={{ padding: '10px', backgroundColor: 'var(--color-cream-surface)', borderRadius: 'var(--radius-sm)', margin: '12px 0' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-forest)', fontWeight: 600 }}>
                      JOB: {crew.job_type} ({crew.workload})
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-ink-muted)', marginTop: '4px' }}>
                      Safe window: <strong>{crew.plan_summary?.safe_window || '06:00 – 10:00 AM'}</strong>
                    </div>
                  </div>

                  {/* Flagged estimate notice */}
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: hasFlagged ? 'var(--risk-extreme-text)' : 'var(--risk-low-text)' }}>
                    {hasFlagged
                      ? `⚠ ~${flaggedWorkers} workers in flagged high-risk windows (next 12h est.)`
                      : '✓ No dangerous windows flagged in current shift schedule'}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid rgba(27,27,27,0.08)' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-forest)' }}>
                    View plan summary &rarr;
                  </span>

                  {isUnlocked && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCrewToDelete(crew);
                      }}
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.75rem',
                        color: 'var(--risk-extreme-text)',
                        textDecoration: 'underline',
                        cursor: 'pointer',
                        padding: '2px 6px',
                      }}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* UNLOCK WRITES MODAL */}
      {isAuthOpen && (
        <div className="evidence-modal-backdrop" onClick={() => setIsAuthOpen(false)} role="presentation">
          <div className="evidence-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--color-forest)', fontWeight: 600 }}>
                PASSCODE AUTHENTICATION
              </span>
              <button type="button" onClick={() => setIsAuthOpen(false)} style={{ fontSize: '1rem', fontWeight: 600 }}>
                &times;
              </button>
            </div>

            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', marginBottom: '8px' }}>
              Unlock Contractor Writes
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-ink-muted)', marginBottom: '16px' }}>
              Reads are public and free. Creating or removing crew profiles requires an authorization passcode (saved only in session storage).
            </p>

            <form onSubmit={handleSavePasscode}>
              <label htmlFor="passcode-input" style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', marginBottom: '6px' }}>
                X-Chhaya-Passcode
              </label>
              <input
                id="passcode-input"
                type="password"
                value={passcodeInput}
                onChange={(e) => setPasscodeInput(e.target.value)}
                placeholder="Enter passcode (default: demo)"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid rgba(27,27,27,0.3)',
                  marginBottom: '16px',
                  fontFamily: 'var(--font-mono)',
                }}
                required
              />

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <Button variant="ghost" type="button" onClick={() => setIsAuthOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit">
                  Unlock
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE CREW MODAL */}
      {isCreateOpen && (
        <div className="evidence-modal-backdrop" onClick={() => setIsCreateOpen(false)} role="presentation">
          <div className="evidence-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--color-forest)', fontWeight: 600 }}>
                NEW WORKER COHORT
              </span>
              <button type="button" onClick={() => setIsCreateOpen(false)} style={{ fontSize: '1rem', fontWeight: 600 }}>
                &times;
              </button>
            </div>

            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', marginBottom: '16px' }}>
              Register Worker Crew
            </h3>

            {createError && (
              <div style={{ padding: '8px 12px', backgroundColor: 'var(--risk-extreme-bg)', color: 'var(--risk-extreme-text)', borderRadius: 'var(--radius-sm)', marginBottom: '12px', fontSize: '0.8rem' }}>
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateCrew} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label htmlFor="new-crew-name" style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', marginBottom: '4px' }}>
                  Crew Name / Label
                </label>
                <input
                  id="new-crew-name"
                  type="text"
                  value={newCrewName}
                  onChange={(e) => setNewCrewName(e.target.value)}
                  placeholder="e.g. South Delhi Concrete Unit 2"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(27,27,27,0.3)', fontFamily: 'inherit' }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label htmlFor="new-crew-city" style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', marginBottom: '4px' }}>
                    City
                  </label>
                  <select
                    id="new-crew-city"
                    value={newCrewCity}
                    onChange={(e) => setNewCrewCity(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(27,27,27,0.3)', fontFamily: 'inherit' }}
                  >
                    {cities.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="new-crew-job" style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', marginBottom: '4px' }}>
                    Job Category
                  </label>
                  <select
                    id="new-crew-job"
                    value={newCrewJob}
                    onChange={(e) => setNewCrewJob(e.target.value as JobType)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(27,27,27,0.3)', fontFamily: 'inherit' }}
                  >
                    <option value="CONSTRUCTION">Construction</option>
                    <option value="RIDER">Delivery Rider</option>
                    <option value="SANITATION">Sanitation</option>
                    <option value="VENDOR">Street Vendor</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label htmlFor="new-crew-workload" style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', marginBottom: '4px' }}>
                    Workload
                  </label>
                  <select
                    id="new-crew-workload"
                    value={newCrewWorkload}
                    onChange={(e) => setNewCrewWorkload(e.target.value as Workload)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(27,27,27,0.3)', fontFamily: 'inherit' }}
                  >
                    <option value="LIGHT">Light</option>
                    <option value="MODERATE">Moderate</option>
                    <option value="HEAVY">Heavy</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="new-crew-size" style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', marginBottom: '4px' }}>
                    Cohort Size (Headcount)
                  </label>
                  <input
                    id="new-crew-size"
                    type="number"
                    min="1"
                    max="500"
                    value={newCrewSize}
                    onChange={(e) => setNewCrewSize(parseInt(e.target.value, 10))}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(27,27,27,0.3)', fontFamily: 'inherit' }}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                <Button variant="ghost" type="button" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit">
                  Save Crew Profile
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREW DETAIL DRAWER */}
      {selectedCrew && (
        <div className="evidence-modal-backdrop" onClick={() => setSelectedCrew(null)} role="presentation">
          <div className="evidence-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--color-forest)', fontWeight: 600 }}>
                CREW PROFILE #{selectedCrew.id}
              </span>
              <button type="button" onClick={() => setSelectedCrew(null)} style={{ fontSize: '1rem', fontWeight: 600 }}>
                &times;
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div>
                <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.8rem', margin: 0 }}>{selectedCrew.name}</h3>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--color-ink-muted)' }}>
                  {selectedCrew.city_id.toUpperCase()} &middot; {selectedCrew.job_type} ({selectedCrew.workload})
                </div>
              </div>
              <RiskPill level={selectedCrew.plan_summary?.overall_risk || 'HIGH'} />
            </div>

            <div style={{ backgroundColor: 'var(--color-cream-surface)', padding: '16px', borderRadius: 'var(--radius-sm)', margin: '16px 0' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-forest)', marginBottom: '8px' }}>
                LIVE SHIFT EXPOSURE SUMMARY
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.85rem' }}>
                <div>
                  <div style={{ color: 'var(--color-ink-muted)', fontSize: '0.75rem' }}>CREW HEADCOUNT</div>
                  <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>{selectedCrew.size} workers</div>
                </div>
                <div>
                  <div style={{ color: 'var(--color-ink-muted)', fontSize: '0.75rem' }}>HOURS TO AVOID</div>
                  <div style={{ fontWeight: 600, fontSize: '1.1rem', color: 'var(--risk-extreme-text)' }}>
                    {selectedCrew.plan_summary?.hours_avoid || 4} hours
                  </div>
                </div>
                <div>
                  <div style={{ color: 'var(--color-ink-muted)', fontSize: '0.75rem' }}>RECOMMENDED BLOCK</div>
                  <div style={{ fontWeight: 600 }}>{selectedCrew.plan_summary?.safe_window || '06:00 – 10:00 AM'}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--color-ink-muted)', fontSize: '0.75rem' }}>REGISTERED DATE</div>
                  <div>{new Date(selectedCrew.created_at).toLocaleDateString('en-IN')}</div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <Button variant="secondary" onClick={() => setSelectedCrew(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {crewToDelete && (
        <div className="evidence-modal-backdrop" onClick={() => setCrewToDelete(null)} role="presentation">
          <div className="evidence-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', marginBottom: '8px', color: 'var(--risk-extreme-text)' }}>
              Delete Crew Profile?
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-ink-muted)', marginBottom: '16px' }}>
              Are you sure you want to remove <strong>{crewToDelete.name}</strong> from the active exposure roster?
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <Button variant="ghost" onClick={() => setCrewToDelete(null)}>
                Cancel
              </Button>
              <Button variant="primary" style={{ backgroundColor: 'var(--risk-extreme-fill)', color: '#FFFFFF' }} onClick={handleDeleteCrew}>
                Delete Crew
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
