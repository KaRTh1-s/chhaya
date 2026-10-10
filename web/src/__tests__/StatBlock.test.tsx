import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatBlock } from '../components/StatBlock';

describe('StatBlock Component', () => {
  it('renders value and label with proper typography', () => {
    render(<StatBlock number={142} label="advisories generated" unit="" />);
    expect(screen.getByText('142')).toBeInTheDocument();
    expect(screen.getByText('advisories generated')).toBeInTheDocument();
  });

  it('renders unit and seeded demo tag when requested', () => {
    render(
      <StatBlock
        number={4.8}
        unit="h"
        label="median alert lead time"
        isSeeded={true}
      />
    );
    expect(screen.getByText('4.8')).toBeInTheDocument();
    expect(screen.getByText('h')).toBeInTheDocument();
    expect(screen.getByText('demo counter')).toBeInTheDocument();
  });

  it('renders zero count truthfully with subnote', () => {
    render(
      <StatBlock
        number={0}
        label="alerts dispatched"
        subnote="just launched"
      />
    );
    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText('just launched')).toBeInTheDocument();
  });
});
