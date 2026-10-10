import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { NavPill } from '../components/NavPill';

describe('NavPill Component', () => {
  it('renders navigation tabs and highlights active tab', () => {
    render(
      <MemoryRouter initialEntries={['/board']}>
        <NavPill region="ap-south-1" />
      </MemoryRouter>
    );

    const boardTab = screen.getByRole('link', { name: /Risk Board/i });
    expect(boardTab).toHaveClass('active');

    const homeTab = screen.getByRole('link', { name: /^Home$/i });
    expect(homeTab).not.toHaveClass('active');
  });

  it('renders region and brand tag', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <NavPill region="ap-south-1" />
      </MemoryRouter>
    );

    expect(screen.getByText('ap-south-1')).toBeInTheDocument();
    expect(screen.getByText('Chhaya')).toBeInTheDocument();
    expect(screen.getByText('Heat & Air')).toBeInTheDocument();
  });
});
