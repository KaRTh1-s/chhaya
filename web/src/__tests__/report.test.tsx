import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { Report } from '../pages/Report';
import { formatReportText } from '../utils/formatters';
import type { DayPlan } from '../api/types';

const mockPlan: DayPlan = {
  city_id: 'delhi',
  city_label: 'Delhi (NCR)',
  job_type: 'delivery',
  generated_at: '2026-06-09T08:00:00Z',
  recorded_date: '2026-06-09',
  overall_risk: 'AVOID',
  hours_flagged: 6,
  max_wbgt_c: 34.5,
  max_aqi: 220,
  heat_hours_over_threshold: 5,
  aqi_hours_over_threshold: 4,
  assumptions_version: '1.0.0',
  data_source: 'replay',
  scenario_id: 'delhi-heatwave-2025-06-09',
  hours: [],
  dangerous_windows: [
    {
      start: '2026-06-09T12:00:00Z',
      end: '2026-06-09T16:00:00Z',
      duration_hours: 4,
      status: 'REST',
      max_wbgt_c: 34.5,
      max_aqi: 210,
      primary_stressor: 'heat',
    },
  ],
  recommended_blocks: [
    {
      start: '2026-06-09T06:00:00Z',
      end: '2026-06-09T10:00:00Z',
      duration_hours: 4,
      avg_wbgt_c: 27.2,
      avg_aqi: 120,
      avg_workload_limit_c: 30.0,
      min_margin_c: 2.8,
    },
  ],
};

describe('Report Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders report brief with city, job, flagged windows and protocols', async () => {
    render(
      <MemoryRouter initialEntries={['/report?city=delhi&job=delivery']}>
        <Report />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Daily Exposure Brief')).toBeInTheDocument();
    });

    // Check header and sections
    expect(screen.getByText('OVERALL SHIFT EXPOSURE LEVEL')).toBeInTheDocument();
    expect(screen.getByText(/1\. Top Flagged Risk Windows/i)).toBeInTheDocument();
    expect(screen.getByText(/2\. Recommended Safe Work Blocks/i)).toBeInTheDocument();
    expect(screen.getByText(/3\. Mandatory Operational Directives/i)).toBeInTheDocument();
    expect(screen.getByText(/Hydration Protocol/i)).toBeInTheDocument();
    expect(screen.getByText(/Respiratory Protection/i)).toBeInTheDocument();
  });

  it('supports copying report as formatted text', async () => {
    const writeTextSpy = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextSpy,
      },
    });

    render(
      <MemoryRouter initialEntries={['/report?city=delhi&job=delivery']}>
        <Report />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Copy as Text/i)).toBeInTheDocument();
    });

    const copyBtn = screen.getByRole('button', { name: /Copy as Text/i });
    fireEvent.click(copyBtn);

    expect(writeTextSpy).toHaveBeenCalled();
  });

  it('triggers window.print on print button click', async () => {
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});

    render(
      <MemoryRouter initialEntries={['/report?city=delhi&job=delivery']}>
        <Report />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Print Daily Brief/i)).toBeInTheDocument();
    });

    const printBtn = screen.getByRole('button', { name: /Print Daily Brief/i });
    fireEvent.click(printBtn);

    expect(printSpy).toHaveBeenCalled();
  });
});

describe('formatReportText Formatter', () => {
  it('formats structured report plain text accurately', () => {
    const text = formatReportText('Delhi (NCR)', 'Delivery / Gig', mockPlan);
    expect(text).toContain('CHHAYA DAILY HEAT & EXPOSURE BRIEF');
    expect(text).toContain('DELHI (NCR)');
    expect(text).toContain('TOP FLAGGED WINDOWS');
    expect(text).toContain('REST');
    expect(text).toContain('RECOMMENDED SAFE WORK BLOCKS');
    expect(text).toContain('HYDRATION & PROTECTIVE GEAR');
    expect(text).toContain('Open-Meteo / CAMS modelled data');
  });
});
