import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { CrewsPage } from '../pages/Crews';

describe('Crews Page', () => {
  it('renders registered crews with headcount and estimated flagged notices', async () => {
    render(
      <MemoryRouter>
        <CrewsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Anonymous Worker/i)).toBeInTheDocument();
      expect(screen.getByText('South Delhi Masonry Unit 4')).toBeInTheDocument();
    });

    expect(screen.getAllByText(/workers in flagged high-risk windows/i).length).toBeGreaterThan(0);
  });

  it('opens unlock writes modal and saves passcode in sessionStorage', async () => {
    render(
      <MemoryRouter>
        <CrewsPage />
      </MemoryRouter>
    );

    const unlockBtn = screen.getByRole('button', { name: /Unlock Writes/i });
    fireEvent.click(unlockBtn);

    expect(screen.getByText(/Unlock Contractor Writes/i)).toBeInTheDocument();

    const passInput = screen.getByLabelText(/X-Chhaya-Passcode/i);
    fireEvent.change(passInput, { target: { value: 'testpass' } });

    const submitBtn = screen.getByRole('button', { name: /^Unlock$/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(sessionStorage.getItem('chhaya_passcode')).toBe('testpass');
    });
  });
});
