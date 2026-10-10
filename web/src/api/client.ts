import { mockApi } from './mock';
import type {
  AdviseRequest,
  AdviseResponse,
  AuditEvent,
  BoardResponse,
  City,
  Crew,
  CrewWithPlan,
  DayPlan,
  GlobalStats,
  HealthResponse,
  PlanRequest,
  Scenario,
} from './types';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
const FORCE_MOCK = import.meta.env.VITE_USE_MOCK === '1' || import.meta.env.VITE_USE_MOCK === 'true';

let usingMockData = FORCE_MOCK;
const listeners = new Set<(isMock: boolean) => void>();

function notifyListeners() {
  listeners.forEach((fn) => fn(usingMockData));
}

export function isUsingMockData(): boolean {
  return usingMockData;
}

export function subscribeToMockStatus(callback: (isMock: boolean) => void): () => void {
  listeners.add(callback);
  callback(usingMockData);
  return () => {
    listeners.delete(callback);
  };
}

async function request<T>(endpoint: string, options: RequestInit = {}, fallbackFn: () => Promise<T>): Promise<T> {
  if (FORCE_MOCK) {
    if (!usingMockData) {
      usingMockData = true;
      notifyListeners();
    }
    return fallbackFn();
  }

  try {
    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} from ${endpoint}`);
    }

    const data = (await response.json()) as T;
    if (usingMockData) {
      usingMockData = false;
      notifyListeners();
    }
    return data;
  } catch (err) {
    console.warn(`[Chhaya API] Network request to ${endpoint} failed, falling back to mock data.`, err);
    if (!usingMockData) {
      usingMockData = true;
      notifyListeners();
    }
    return fallbackFn();
  }
}

export const apiClient = {
  getHealth: (): Promise<HealthResponse> => {
    return request('/health', { method: 'GET' }, () => mockApi.getHealth());
  },

  getCities: (): Promise<{ cities: City[] }> => {
    return request('/cities', { method: 'GET' }, () => mockApi.getCities());
  },

  getScenarios: (): Promise<Scenario[]> => {
    return request('/scenarios', { method: 'GET' }, () => mockApi.getScenarios());
  },

  getStats: (): Promise<GlobalStats> => {
    return request('/stats', { method: 'GET' }, () => mockApi.getStats());
  },

  getBoard: (mode: 'live' | 'replay' = 'replay'): Promise<BoardResponse> => {
    return request(`/board?mode=${mode}`, { method: 'GET' }, () => mockApi.getBoard(mode));
  },

  getAudit: (limit: number = 50): Promise<{ audit_events: AuditEvent[] }> => {
    return request(`/audit?limit=${limit}`, { method: 'GET' }, () => mockApi.getAudit(limit));
  },

  getCrews: (): Promise<{ crews: CrewWithPlan[] }> => {
    return request('/crews', { method: 'GET' }, () => mockApi.getCrews());
  },

  getPlan: (planReq: PlanRequest): Promise<DayPlan> => {
    return request(
      '/plan',
      {
        method: 'POST',
        body: JSON.stringify(planReq),
      },
      () => mockApi.getPlan(planReq)
    );
  },

  getAdvisory: (advReq: AdviseRequest): Promise<AdviseResponse> => {
    return request(
      '/advise',
      {
        method: 'POST',
        body: JSON.stringify(advReq),
      },
      () => mockApi.getAdvisory(advReq)
    );
  },

  createCrew: (crew: Partial<Crew>, passcode: string = 'demo-passcode'): Promise<{ crew: Crew }> => {
    return request(
      '/crews',
      {
        method: 'POST',
        headers: {
          'X-Chhaya-Passcode': passcode,
        },
        body: JSON.stringify(crew),
      },
      () => mockApi.createCrew(crew)
    );
  },
};
