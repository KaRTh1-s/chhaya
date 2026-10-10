import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { client, isUsingMockData } from '../api/client';
import { NavPill } from '../components/NavPill';
import { DemoFallbackBanner } from '../components/Feedback';

describe('Network Resilience & Demo Fallback Banner', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders demo data badge and fallback banner when API call fails', async () => {
    // Mock fetch to simulate network failure (e.g. 503 or network error)
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error / Service Unreachable'));

    render(
      <MemoryRouter>
        <div>
          <DemoFallbackBanner />
          <NavPill />
        </div>
      </MemoryRouter>
    );

    // Initial state before network failure (or initial mock status)
    // Now trigger an API request that will fail and engage fallback
    const health = await client.getHealth();
    expect(health.status).toBe('ok');
    expect(isUsingMockData()).toBe(true);

    // Verify demo badge and one-line banner are rendered
    await waitFor(() => {
      expect(screen.getByTestId('mock-badge')).toBeInTheDocument();
      expect(screen.getByText('demo data')).toBeInTheDocument();
      expect(
        screen.getByText('Showing recorded demo data because the live service is unreachable.')
      ).toBeInTheDocument();
    });
  });
});
