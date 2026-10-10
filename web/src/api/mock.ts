import type {
  AdviseRequest,
  AdviseResponse,
  AssumptionItem,
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

import advisoriesData from './mock-data/advisories.json';
import assumptionsData from './mock-data/assumptions.json';
import auditData from './mock-data/audit.json';
import boardData from './mock-data/board.json';
import chennaiHumidPlan from './mock-data/chennai-humid-2025-05-31.json';
import citiesData from './mock-data/cities.json';
import coimbatoreMildPlan from './mock-data/coimbatore-mild-2025-01-15.json';
import crewsData from './mock-data/crews.json';
import delhiHeatwavePlan from './mock-data/delhi-heatwave-2025-06-09.json';
import delhiRiderPlan from './mock-data/delhi-heatwave-rider.json';
import delhiSmogPlan from './mock-data/delhi-smog-2025-11-23.json';
import scenariosData from './mock-data/scenarios.json';
import statsData from './mock-data/stats.json';

const scenarioPlansMap: Record<string, DayPlan> = {
  'delhi-heatwave-2025-06-09': delhiHeatwavePlan as unknown as DayPlan,
  'delhi-smog-2025-11-23': delhiSmogPlan as unknown as DayPlan,
  'chennai-humid-2025-05-31': chennaiHumidPlan as unknown as DayPlan,
  'coimbatore-mild-2025-01-15': coimbatoreMildPlan as unknown as DayPlan,
};

export const mockApi = {
  getHealth: async (): Promise<HealthResponse> => {
    return {
      status: 'ok',
      version: '0.2.1',
      region: 'ap-south-1',
      data_mode: 'replay',
      time: new Date().toISOString(),
    };
  },

  getCities: async (): Promise<{ cities: City[] }> => {
    return { cities: citiesData as City[] };
  },

  getScenarios: async (): Promise<{ scenarios: Scenario[] }> => {
    return { scenarios: scenariosData as Scenario[] };
  },

  getStats: async (): Promise<GlobalStats> => {
    return statsData as GlobalStats;
  },

  getBoard: async (mode: 'live' | 'replay' = 'replay'): Promise<BoardResponse> => {
    const res = { ...(boardData as unknown as BoardResponse), mode };
    return res;
  },

  getAudit: async (_limit: number = 50): Promise<{ audit_events: AuditEvent[] }> => {
    return auditData as { audit_events: AuditEvent[] };
  },

  getCrews: async (): Promise<{ crews: CrewWithPlan[] }> => {
    return crewsData as { crews: CrewWithPlan[] };
  },

  getPlan: async (req: PlanRequest): Promise<DayPlan> => {
    if (req.scenario && scenarioPlansMap[req.scenario]) {
      return scenarioPlansMap[req.scenario];
    }
    if (req.job_type === 'RIDER' && req.city_id === 'delhi') {
      return delhiRiderPlan as unknown as DayPlan;
    }
    if (req.city_id === 'chennai') {
      return chennaiHumidPlan as unknown as DayPlan;
    }
    if (req.city_id === 'coimbatore') {
      return coimbatoreMildPlan as unknown as DayPlan;
    }
    if (req.city_id === 'delhi' && req.job_type === 'RIDER') {
      return delhiSmogPlan as unknown as DayPlan;
    }
    return delhiHeatwavePlan as unknown as DayPlan;
  },

  getAdvisory: async (req: AdviseRequest): Promise<AdviseResponse> => {
    const plan = await mockApi.getPlan(req);
    const scenarioId = req.scenario || plan.scenario_id || 'delhi-heatwave-2025-06-09';
    const lang = req.language || 'en';
    const scenarioAdvisories = (advisoriesData as Record<string, Record<string, unknown>>)[scenarioId];
    const adv =
      scenarioAdvisories?.[lang] ||
      (advisoriesData as Record<string, Record<string, unknown>>)['delhi-heatwave-2025-06-09']?.[lang] ||
      (advisoriesData as Record<string, Record<string, unknown>>)['delhi-heatwave-2025-06-09']['en'];

    return {
      plan,
      advisory: adv as unknown as AdviseResponse['advisory'],
    };
  },

  getAssumptions: async (): Promise<AssumptionItem[]> => {
    return assumptionsData as AssumptionItem[];
  },

  createCrew: async (crew: Partial<Crew>): Promise<{ crew: Crew }> => {
    const newCrew: Crew = {
      id: `crw_${Date.now()}`,
      name: crew.name || 'New Crew',
      city_id: crew.city_id || 'delhi',
      job_type: crew.job_type || 'CONSTRUCTION',
      workload: crew.workload || 'HEAVY',
      size: crew.size || 1,
      created_at: new Date().toISOString(),
    };
    return { crew: newCrew };
  },

  deleteCrew: async (crewId: string): Promise<{ deleted: boolean; crew_id: string }> => {
    return { deleted: true, crew_id: crewId };
  },
};
