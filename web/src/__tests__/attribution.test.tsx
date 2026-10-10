import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';
import type { Window } from '../api/types';
import { WindowList } from '../components/WindowList';

describe('Attribution UI Prep', () => {
  it('renders driver chips (Heat, Air, Both) on windows when present', () => {
    const windowsWithDriver: Window[] = [
      {
        start: '2025-06-09T12:00:00+05:30',
        end: '2025-06-09T16:00:00+05:30',
        status: 'AVOID',
        summary_code: 'HEAT_WBGT_EXTREME',
        driver: 'HEAT',
      },
      {
        start: '2025-11-23T06:00:00+05:30',
        end: '2025-11-23T10:00:00+05:30',
        status: 'REDUCED',
        summary_code: 'SMOG_AQI_SEVERE',
        driver: 'AIR',
      },
      {
        start: '2025-06-09T14:00:00+05:30',
        end: '2025-06-09T15:00:00+05:30',
        status: 'AVOID',
        summary_code: 'HEAT_AND_AIR_CRITICAL',
        driver: 'BOTH',
      },
    ];

    render(<WindowList windows={windowsWithDriver} title="TEST WINDOWS" />);
    expect(screen.getByText('🔥 Heat')).toBeInTheDocument();
    expect(screen.getByText('🌫 Air')).toBeInTheDocument();
    expect(screen.getByText('⚡ Heat+Air')).toBeInTheDocument();
  });

  it('renders cleanly without driver chips when absent', () => {
    const windowsWithoutDriver: Window[] = [
      {
        start: '2025-06-09T12:00:00+05:30',
        end: '2025-06-09T16:00:00+05:30',
        status: 'AVOID',
        summary_code: 'HEAT_WBGT_EXTREME',
      },
    ];

    const { container } = render(<WindowList windows={windowsWithoutDriver} title="TEST WINDOWS" />);
    expect(screen.queryByText('🔥 Heat')).toBeNull();
    expect(screen.queryByText('🌫 Air')).toBeNull();
    expect(screen.queryByText('⚡ Heat+Air')).toBeNull();
    expect(container.querySelector('.badge-driver')).toBeNull();
    expect(screen.getByText('HEAT_WBGT_EXTREME')).toBeInTheDocument();
  });
});
