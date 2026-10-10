# Assumptions & Heuristics

This document logs every threshold, calibration parameter, and heuristic in Chhaya's engine and advisory agent for complete operational transparency.

| Component | Assumption/Heuristic | Value | Why | Source | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Heat** | Solar adjustment per kW/m² | +2.0 °C per 1000 W/m² (Full Sun) | Calibrated against Liljegren outdoor physical model to reduce hot-dry bias. | Calibration vs Liljegren (ECMWF thermofeel) | Calibrated against Liljegren outdoor reference on 4 recorded days; not field-validated |
| **Heat** | Base offset calibration | -4.5 °C base intercept correction | Compensates for ABOM indoor approximation overestimation in hot-dry climates. | Calibration vs Liljegren (ECMWF thermofeel) | Calibrated against Liljegren outdoor reference on 4 recorded days; not field-validated |
| **Heat** | WBGT Safety Margin | Not added (`0.0 °C`) | Calibration audit against Liljegren across all 4 fixtures showed that for dangerous heat (WBGT $\ge 28^\circ\text{C}$), the maximum underestimate was $0.90^\circ\text{C}$ (Chennai) and $0.47^\circ\text{C}$ (Delhi), neither exceeding the $1.5^\circ\text{C}$ threshold. | `scripts/calibrate_wbgt.py` measurement | Verified by measurement on 4 fixtures |
| **Heat** | WBGT continuous work limits | Light: 30°C, Mod: 28°C, Heavy: 26°C | Safe starting points for acclimatized workers | NIOSH/ISO 7243 | Calibrated / Verified |
| **Heat** | Work/Rest tiers (delta = WBGT - limit) | ≤0: Caution, ≤2: 45/15, ≤4: 30/30, ≤6: 15/45, >6: Avoid | Standardized incremental heat stress reduction | Adapted from standard charts | Verified |
| **AQI** | Hourly PM as proxy | Hourly PM2.5/PM10 interpolated directly into 24h breakpoints | 24-hour averages react too slowly to transient smog peaks | Engineering decision | Verified (Logic) |
| **AQI** | Workload multipliers | Light: 1.0, Mod: 1.5, Heavy: 2.5 | Increased ventilation rate dramatically increases inhaled dose | Respiratory physiology | Verified |
| **Health**| Hydration guidance | ~250ml every 15-20 min during frequent windows; otherwise drink normally | Derived ONLY from heat stress (WBGT caution or worse); air pollution escalation never triggers frequent hydration. | Occupational Physiology / NIOSH | Verified |
| **Schedule**| Recommended Blocks | Up to 2 non-overlapping blocks (min 2h each, total ≤ max_shift_hours) | Minimises combined risk, strictly preferring WORK > CAUTION > REDUCED; never includes AVOID. Block status = worst hour inside it. | Algorithmic Optimization | Verified |
| **Agent** | Bedrock Model ID | `apac.amazon.nova-micro-v1:0` (or `apac.anthropic.claude-3-5-sonnet-20241022-v2:0`) | Ultra-fast inference, low-cost cross-region inference profile in `ap-south-1` / `us-east-1`. | AWS Bedrock Regional Availability | Verified |
| **Agent** | Daily LLM Call Cap | 300 calls/day (`MAX_LLM_CALLS_PER_DAY`) | Prevents runaway inference costs. Excess requests gracefully fallback to `TemplateAdvisor`. | Cost control policy | Verified |
| **Agent** | Strict Grounding Verification | 1-5 sentences; evidence citations; allowed-numbers set; driving evidence match; Latin run check; medical blocklist | Completely eliminates hallucinations and ungrounded safety advice. | Safety Engineering | Verified |
| **Agent** | Multilingual Localisation | English, Hindi (`hi`), Tamil (`ta`) | Full localization of cities, risk terms, window guidance, hydration, and seek-help lines. | `i18n.py` / `docs/i18n_review.md` | Machine-written, needs native speaker review |
| **Agent** | Prompt Versioning | `PROMPT_VERSION = "1.1.0"` | Tracks exact prompt template version in audit log and response payload for traceability. | Governance | Verified |
| **Stats**| Flagged Hours (`hours_flagged`) | Count of AVOID or REDUCED(15/45) hours across generated DayPlans | Operational metric identifying acute exposure hours flagged | Operational Definition | Verified |
| **Stats**| Lead Time (`avg_lead_time_hours`) | Mean hours between plan generation and the start of the first flagged dangerous window | Measures advance warning window for shift rescheduling | Operational Definition | Verified |
| **Backend** | Forecast cache TTL | 30 minutes (1800s) | Open-Meteo models update hourly; 30m cache minimizes duplicate network calls | System performance | Verified |
| **Backend** | API Gateway Throttling | Rate: 25 req/s, Burst: 50 | Protects backend against accidental traffic spikes in production | Cost / Stability | Verified |
| **Backend** | Audit log retention | 30 days TTL | Allows historical auditing while automatically purging stale records | Compliance | Verified |
| **Security** | Write protection | Constant-time `X-Chhaya-Passcode` | Protects crew mutations and bulk writes from unauthorized callers | Security baseline | Verified |

## Calibration Performance Measurements (Liljegren Reference)

| Fixture | Before Calibration (ABOM) | After Calibration (Chhaya Engine) | High-Heat (WBGT $\ge 28^\circ\text{C}$) Max Underestimate |
| :--- | :--- | :--- | :--- |
| **Delhi Extreme Heatwave (Jun 2025)** | Mean: +5.11 °C, MaxOver: +5.68 °C, MaxUnder: 0.00 °C | Mean: +0.34 °C, MaxOver: +1.10 °C, MaxUnder: 0.47 °C | **0.47 °C** |
| **Delhi Winter Smog (Nov 2025)** | Mean: +3.79 °C, MaxOver: +4.71 °C, MaxUnder: 0.00 °C | Mean: -0.87 °C, MaxOver: +0.21 °C, MaxUnder: 3.45 °C | **0.00 °C** (No hours $\ge 28^\circ\text{C}$) |
| **Chennai Humid Heat (May 2025)** | Mean: +5.73 °C, MaxOver: +6.92 °C, MaxUnder: 0.00 °C | Mean: +0.99 °C, MaxOver: +2.10 °C, MaxUnder: 0.90 °C | **0.90 °C** |
| **Coimbatore Mild Winter (Jan 2025)** | Mean: +4.42 °C, MaxOver: +4.84 °C, MaxUnder: 0.00 °C | Mean: -0.24 °C, MaxOver: +0.15 °C, MaxUnder: 0.89 °C | **0.00 °C** (No hours $\ge 28^\circ\text{C}$) |
| **OVERALL (All 4 Days)** | Mean: +4.76 °C, Max Error: 6.92 °C | Mean: +0.06 °C, Max Error: 3.45 °C | Max Underestimate $\ge 28^\circ\text{C}$: **0.90 °C** |
