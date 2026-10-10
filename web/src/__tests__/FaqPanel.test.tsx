import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FaqPanel } from '../components/FaqPanel';

describe('FaqPanel Component', () => {
  it('renders questions and allows switching active question', () => {
    render(<FaqPanel />);

    expect(screen.getAllByText('Is it safe?').length).toBeGreaterThan(0);
    expect(screen.getByText('What if Bedrock is down?')).toBeInTheDocument();

    // Default active question is "Is it safe?"
    expect(screen.getByText(/Evidence before the model:/i)).toBeInTheDocument();

    // Click "What if Bedrock is down?"
    const bedrockQuestionBtn = screen.getByRole('button', { name: /^What if Bedrock is down\?$/i });
    fireEvent.click(bedrockQuestionBtn);

    expect(screen.getByText(/Zero-LLM fallback:/i)).toBeInTheDocument();
  });
});
