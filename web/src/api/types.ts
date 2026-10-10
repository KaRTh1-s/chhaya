/**
 * TypeScript API contracts matching docs/openapi.yaml and contract notes.
 */

export type JobType = 'RIDER' | 'CONSTRUCTION' | 'VENDOR' | 'SANITATION';
export type Workload = 'LIGHT' | 'MODERATE' | 'HEAVY';
export type SunExposure = 'FULL' | 'PARTIAL' | 'SHADE';

export type HourStatus = 'WORK' | 'CAUTION' | 'REDUCED' | 'REST' | 'AVOID';
export type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'EXTREME';
export type Language = 'en' | 'hi' | 'ta';

export interface HealthResponse {
  status: string;
  version: string;
  region: string;
  data_mode: string;
  time: string;
}

export interface City {
  id: string;
  name: string;
  lat: number;
  lon: number;
  state: string;
}

export interface Scenario {
  id: string;
  label: string;
  city_id: string;
  date: string;
  max_temp_c: number;
  max_pm2_5: number;
}

export interface PlanRequest {
  city_id?: string;
  lat?: number;
  lon?: number;
  job_type: JobType;
  workload?: Workload;
  sun_exposure?: SunExposure;
  preferred_start_hour?: number;
  preferred_end_hour?: number;
  max_shift_hours?: number;
  scenario?: string;
}

export interface EvidenceCard {
  id: string;
  label: string;
  value: string;
  unit: string;
  source: string;
  hour_range: string;
}

export interface HourPlan {
  hour: string;
  status: HourStatus;
  wbgt_c: number;
  aqi: number | null;
  aqi_category: string | null;
  risk_level: RiskLevel;
  reasons: string[];
  evidence_ids: string[];
  hydration?: 'NORMAL' | 'FREQUENT';
}

export interface Window {
  start: string;
  end: string;
  status: HourStatus;
  summary_code: string;
}

export interface DayPlan {
  city_label: string;
  generated_at: string;
  hours: HourPlan[];
  windows: Window[];
  dangerous_windows: Window[];
  recommended_blocks: Window[];
  no_safe_window: boolean;
  overall_risk: RiskLevel;
  hydration: {
    needed: boolean;
    rate_ml_per_hour: number;
    salt_supplement: boolean;
    note: string;
    evidence_ids: string[];
  };
  mask: {
    needed: boolean;
    type: string;
    note: string;
    evidence_ids: string[];
  };
  seek_help_lines: string[];
  evidence: EvidenceCard[];
  assumptions_version: string;
  data_source?: 'live' | 'replay';
  scenario_id?: string;
  recorded_date?: string;
}

export interface AdvisorySentence {
  text: string;
  evidence_ids: string[];
}

export interface AdvisoryResult {
  sentences: AdvisorySentence[];
  seek_help: string[];
  mode: string;
  validated: boolean;
  fallback_reason: string | null;
}

export interface AdviseResponse {
  plan: DayPlan;
  advisory: AdvisoryResult;
}

export interface AdviseRequest {
  plan: DayPlan;
  language: Language;
}

export interface BoardCity {
  city_id: string;
  city_name: string;
  current_risk: RiskLevel;
  current_temp_c: number;
  current_wbgt_c: number;
  current_aqi: number;
  peak_12h_risk: RiskLevel;
  peak_12h_wbgt_c: number;
  dominant_factor: string;
  active_crews: number;
  status: 'SAFE' | 'CAUTION' | 'DANGER';
}

export interface BoardResponse {
  updated_at: string;
  mode: 'live' | 'replay';
  cities: BoardCity[];
}

export interface GlobalStats {
  plans_generated: number;
  cities_covered: number;
  hours_flagged: number;
  avg_lead_time_hours: number;
  crews_registered: number;
  alerts_sent: number;
  seeded?: boolean;
  advisories_generated?: number;
  llm_first_pass_valid_rate?: number;
}

export interface AuditEvent {
  id: string;
  event_type: string;
  timestamp: string;
  details: Record<string, unknown>;
}

export interface Crew {
  id: string;
  name: string;
  city_id: string;
  job_type: JobType;
  workload: Workload;
  size: number;
  created_at: string;
}

export interface CrewWithPlan extends Crew {
  plan_summary?: {
    overall_risk: RiskLevel;
    hours_avoid: number;
    safe_window: string;
  };
}

export interface CreateCrewRequest {
  name: string;
  city_id: string;
  job_type: JobType;
  workload?: Workload;
  size?: number;
}
