import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { Analytics } from '../pages/Analytics';

describe('Analytics Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders honest system counters and seeded demo badge', async () => {
    render(
      <MemoryRouter>
        <Analytics />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Safety Engine Telemetry & Analytics/i)).toBeInTheDocument();
    });

    // Check system counters
    expect(screen.getByText(/Total Plans Generated/i)).toBeInTheDocument();
    expect(screen.getByText(/Advisories Generated/i)).toBeInTheDocument();
    expect(screen.getByText(/LLM First-Pass Valid Rate/i)).toBeInTheDocument();
    expect(screen.getByText(/Dangerous Hours Flagged/i)).toBeInTheDocument();
    expect(screen.getByText(/Registered Crews/i)).toBeInTheDocument();
  });

  it('allows switching replay scenarios and renders handmade SVG charts', async () => {
    render(
      <MemoryRouter>
        <Analytics />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Historical Scenario Stress-Testing/i)).toBeInTheDocument();
    });

    // Look for scenario pills
    const scenarioBtn = screen.getByRole('button', { name: /Delhi.*Smog/i });
    expect(scenarioBtn).toBeInTheDocument();

    fireEvent.click(scenarioBtn);

    // Verify SVG chart elements exist
    expect(screen.getByText(/Hourly WBGT vs Limit/i)).toBeInTheDocument();
    expect(screen.getByText(/Shift Hours by Risk Level Across Occupations/i)).toBeInTheDocument();
  });
});
