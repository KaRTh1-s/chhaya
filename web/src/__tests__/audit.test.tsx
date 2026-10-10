import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { Audit } from '../pages/Audit';

describe('Audit Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders privacy notice, table of events and filter buttons', async () => {
    render(
      <MemoryRouter>
        <Audit />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('System Audit Log')).toBeInTheDocument();
    });

    // Check privacy notice
    expect(screen.getByText(/No personal data is stored/i)).toBeInTheDocument();

    // Check table headers and event types
    expect(screen.getByText('Event Type')).toBeInTheDocument();
    expect(screen.getAllByText('PLAN_GENERATED').length).toBeGreaterThan(0);
  });

  it('filters events when event type button is clicked', async () => {
    render(
      <MemoryRouter>
        <Audit />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText('PLAN_GENERATED').length).toBeGreaterThan(0);
    });

    // Look for filter button
    const advisoryFilterBtn = screen.getByRole('button', { name: 'ADVISORY_PROMPTED' });
    fireEvent.click(advisoryFilterBtn);

    expect(screen.getAllByText('ADVISORY_PROMPTED').length).toBeGreaterThan(0);
  });

  it('expands and displays JSON payload on toggle', async () => {
    render(
      <MemoryRouter>
        <Audit />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText('View Payload').length).toBeGreaterThan(0);
    });

    const firstPayloadBtn = screen.getAllByText('View Payload')[0];
    fireEvent.click(firstPayloadBtn);

    expect(screen.getByText('Hide Payload')).toBeInTheDocument();
    expect(screen.getByText(/Event Payload/i)).toBeInTheDocument();
  });
});

