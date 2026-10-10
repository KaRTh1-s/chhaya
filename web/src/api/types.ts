/**
 * TypeScript API contracts matching docs/openapi.yaml on main (v0.2.1/v0.3.0).
 */

export type JobType = 'RIDER' | 'CONSTRUCTION' | 'VENDOR' | 'SANITATION';
export type Workload = 'LIGHT' | 'MODERATE' | 'HEAVY';
export type SunExposure = 'FULL' | 'PARTIAL' | 'SHADE';

export type HourStatus = 'WORK' | 'CAUTION' | 'REDUCED' | 'REST' | 'AVOID';
export type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'EXTREME';
export type Language = 'en' | 'hi' | 'ta';
export type AdvisorBackend = 'bedrock' | 'strands' | 'template';

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
  scenario?: string;
  lat?: number;
  lon?: number;
  job_type: JobType;
  workload?: Workload;
  sun_exposure?: SunExposure;
  preferred_start_hour?: number;
  preferred_end_hour?: number;
  max_shift_hours?: number;
}

export interface EvidenceCard {
  id: string;
  label: string;
  value: string;
  unit: string;
  source: string;
  hour_range?: string;
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
  data_source?: 'live' | 'fixture' | 'replay';
  scenario_id?: string | null;
  recorded_date?: string | null;
  hours: HourPlan[];
  windows: Window[];
  dangerous_windows: Window[];
  recommended_blocks: Window[];
  no_safe_window: boolean;
  overall_risk: RiskLevel;
  hydration: {
    needed?: boolean;
    frequent_windows?: Array<{ start: string; end: string; status?: string }>;
    guideline?: string;
    rate_ml_per_hour?: number;
    salt_supplement?: boolean;
    note?: string;
    evidence_ids?: string[];
  };
  mask: {
    needed: boolean;
    type?: string;
    note?: string;
    evidence_ids?: string[];
  };
  seek_help_lines: string[];
  evidence: EvidenceCard[];
  assumptions_version: string;
}

export interface Sentence {
  text: string;
  evidence_ids: string[];
}

export interface Advisory {
  language: Language;
  sentences: Sentence[];
  seek_help?: string[];
  used_fallback?: boolean;
  fallback_reason?: string | null;
  model_id?: string;
  prompt_version?: string;
  mode?: string;
  validated?: boolean;
  latency_ms?: number;
  raw_llm_response?: string | null;
}

export interface AdviseRequest extends PlanRequest {
  language?: Language;
  advisor_backend?: AdvisorBackend;
}

export interface AdviseResponse {
  plan: DayPlan;
  advisory: Advisory;
}

export interface BoardJob {
  job_type: JobType;
  current_risk: RiskLevel;
  peak_12h_risk: RiskLevel;
  peak_wbgt_c: number;
  hours_flagged: number;
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
  jobs?: BoardJob[];
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
  llm_first_pass_valid_rate?: number | null;
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

export interface AssumptionItem {
  component: string;
  assumption: string;
  value: string;
  why: string;
  source: string;
  status: string;
}
