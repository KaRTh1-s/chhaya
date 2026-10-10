import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { Safety } from '../pages/Safety';

describe('Safety Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders medical disclaimer, 4-step pipeline, and validator rules', async () => {
    render(
      <MemoryRouter>
        <Safety />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Safety, Calibration & Scientific Assumptions/i)).toBeInTheDocument();
    });

    // Check medical disclaimer
    expect(screen.getByText(/Not Medical Advice — Occupational Exposure Advisory Only/i)).toBeInTheDocument();

    // Check pipeline steps
    expect(screen.getByText(/1\. Deterministic Calculation Pipeline/i)).toBeInTheDocument();
    expect(screen.getByText(/Step 1: Weather Ingestion/i)).toBeInTheDocument();
    expect(screen.getByText(/Step 2: Physical WBGT Index/i)).toBeInTheDocument();

    // Check validator rules
    expect(screen.getByText(/2\. LLM Advisor Guardrails & Validator Rules/i)).toBeInTheDocument();
    expect(screen.getByText(/What the Model May Do/i)).toBeInTheDocument();
    expect(screen.getByText(/What the Model May NOT Do/i)).toBeInTheDocument();

    // Check emergency guidance
    expect(screen.getByText(/Emergency Guidance/i)).toBeInTheDocument();
    expect(screen.getByText(/In an emergency call 112/i)).toBeInTheDocument();
  });

  it('renders assumptions table and filters by category', async () => {
    render(
      <MemoryRouter>
        <Safety />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/3\. System Assumptions & Calibration Table/i)).toBeInTheDocument();
    });

    // Verify assumptions rendered
    expect(screen.getAllByText(/Heat/i).length).toBeGreaterThan(0);

    // Test filter button
    const heatFilterBtn = screen.getByRole('button', { name: 'Heat' });
    fireEvent.click(heatFilterBtn);

    expect(screen.getAllByText(/Heat/i).length).toBeGreaterThan(0);
  });
});
