import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TopBanner } from '../components/TopBanner';
import { STACK_SERVICES } from '../config/stack';

describe('Truthful Stack Flags Rendering', () => {
  it('renders truthful banner according to live flags', () => {
    const isLive = STACK_SERVICES.some((s) => s.live);

    render(<TopBanner />);

    if (isLive) {
      expect(screen.getByText(/Live on AWS/i)).toBeInTheDocument();
    } else {
      expect(screen.getByText(/Runs on your laptop/i)).toBeInTheDocument();
      expect(screen.getByText(/Local \/ Demo Mode/i)).toBeInTheDocument();
    }
  });
});
