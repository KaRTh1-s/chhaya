import { describe, expect, it, vi } from 'vitest';
import { apiClient, isUsingMockData } from '../api/client';

describe('API Client Fallback and Mock Mode', () => {
  it('falls back to mock data when network fails and sets isUsingMockData to true', async () => {
    // Mock globalThis.fetch to simulate network failure
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    const stats = await apiClient.getStats();
    expect(stats).toBeDefined();
    expect(stats.cities_covered).toBe(12);
    expect(isUsingMockData()).toBe(true);

    globalThis.fetch = originalFetch;
  });

  it('retrieves valid scenario plans with real recorded numbers', async () => {
    const plan = await apiClient.getPlan({
      job_type: 'CONSTRUCTION',
      scenario: 'delhi-heatwave-2025-06-09',
    });

    expect(plan.city_label).toBe('Delhi');
    expect(plan.hours).toHaveLength(24);
    expect(plan.data_source).toBe('replay');
    expect(plan.overall_risk).toBe('EXTREME');
  });
});
