import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { HourPlan } from '../api/types';
import { HourRibbon } from '../components/HourRibbon';

const sampleHours: HourPlan[] = Array.from({ length: 24 }, (_, i) => ({
  hour: `2025-06-09T${i.toString().padStart(2, '0')}:00:00+05:30`,
  status: i >= 12 && i <= 15 ? 'AVOID' : i >= 10 && i <= 17 ? 'CAUTION' : 'WORK',
  wbgt_c: 24.0 + (i === 14 ? 9.9 : (i >= 11 && i <= 16 ? 7.5 : 2.0)),
  aqi: 150,
  aqi_category: 'MODERATE',
  risk_level: i >= 12 && i <= 15 ? 'EXTREME' : 'LOW',
  reasons: i >= 12 && i <= 15 ? ['WBGT 33.9°C exceeds 26.0°C limit'] : ['Normal work conditions'],
  evidence_ids: ['ev_wbgt_peak_14'],
}));

describe('HourRibbon Component', () => {
  it('renders 24 interactive hourly cells with accessible ARIA labels', () => {
    render(<HourRibbon hours={sampleHours} />);

    const grid = screen.getByRole('region', { name: /24-hour heat and air exposure schedule/i });
    expect(grid).toBeInTheDocument();

    const cells = screen.getAllByRole('button');
    expect(cells).toHaveLength(24);

    expect(cells[14]).toHaveAttribute('aria-label', expect.stringContaining('AVOID'));
    expect(cells[14]).toHaveAttribute('aria-label', expect.stringContaining('WBGT 33.9°C'));
  });

  it('displays tooltip on hover with WBGT and AQI metrics', () => {
    render(<HourRibbon hours={sampleHours} />);

    const cells = screen.getAllByRole('button');
    fireEvent.mouseEnter(cells[14]);

    const tooltip = screen.getByRole('tooltip');
    expect(tooltip).toBeInTheDocument();
    expect(tooltip).toHaveTextContent(/WBGT: 33.9°C/);
    expect(tooltip).toHaveTextContent(/AQI: 150/);
    expect(tooltip).toHaveTextContent(/WBGT 33.9°C exceeds 26.0°C limit/);

    fireEvent.mouseLeave(cells[14]);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });
});
