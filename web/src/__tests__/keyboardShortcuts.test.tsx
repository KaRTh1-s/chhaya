import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';

describe('useKeyboardShortcuts Hook', () => {
  it('calls onOpenHelp when ? is pressed', () => {
    const onOpenHelp = vi.fn();
    const onCloseModal = vi.fn();

    render(
      <MemoryRouter>
        <TestComponent onOpenHelp={onOpenHelp} onCloseModal={onCloseModal} />
      </MemoryRouter>
    );

    fireEvent.keyDown(window, { key: '?' });
    expect(onOpenHelp).toHaveBeenCalledTimes(1);
  });

  it('calls onCloseModal when Escape is pressed', () => {
    const onCloseModal = vi.fn();

    render(
      <MemoryRouter>
        <TestComponent onCloseModal={onCloseModal} />
      </MemoryRouter>
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onCloseModal).toHaveBeenCalledTimes(1);
  });
});

function TestComponent({
  onOpenHelp,
  onCloseModal,
}: {
  onOpenHelp?: () => void;
  onCloseModal?: () => void;
}) {
  useKeyboardShortcuts({ onOpenHelp, onCloseModal });
  return <div>Test</div>;
}
