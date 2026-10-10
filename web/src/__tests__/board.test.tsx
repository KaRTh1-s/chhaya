import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { BoardPage } from '../pages/Board';

describe('Risk Board Page', () => {
  it('renders Live and Replay tabs and lists cities', async () => {
    render(
      <MemoryRouter>
        <BoardPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/National Heat & Smog/i)).toBeInTheDocument();
      expect(screen.getByText('Delhi')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /Live Forecast/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Recorded Replays/i })).toBeInTheDocument();
  });

  it('filters cities by job type', async () => {
    render(
      <MemoryRouter>
        <BoardPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Delhi')).toBeInTheDocument();
    });

    const jobSelect = screen.getByLabelText(/Filter by Job Type/i);
    fireEvent.change(jobSelect, { target: { value: 'RIDER' } });

    expect(screen.getAllByText('RIDER').length).toBeGreaterThan(0);
  });
});
