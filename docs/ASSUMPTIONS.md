# Assumptions & Heuristics

This document logs every threshold, calibration parameter, and heuristic in Chhaya's engine to guarantee transparency.

| Component | Assumption/Heuristic | Value | Why | Source | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Heat** | Solar adjustment per kW/m² | +2.0 °C per 1000 W/m² (Full Sun) | Calibrated against Liljegren outdoor physical model to reduce hot-dry bias. | Calibration vs Liljegren (ECMWF thermofeel) | Calibrated against Liljegren outdoor reference on 4 recorded days; not field-validated |
| **Heat** | Base offset calibration | -4.5 °C base intercept correction | Compensates for ABOM indoor approximation overestimation in hot-dry climates. | Calibration vs Liljegren (ECMWF thermofeel) | Calibrated against Liljegren outdoor reference on 4 recorded days; not field-validated |
| **Heat** | WBGT continuous work limits | Light: 30°C, Mod: 28°C, Heavy: 26°C | Safe starting points for acclimatized workers | NIOSH/ISO 7243 | Calibrated / Verified |
| **Heat** | Work/Rest tiers (delta = WBGT - limit) | ≤0: Caution, ≤2: 45/15, ≤4: 30/30, ≤6: 15/45, >6: Avoid | Standardized incremental heat stress reduction | Adapted from standard charts | Verified |
| **AQI** | Hourly PM as proxy | Hourly PM2.5/PM10 interpolated directly into 24h breakpoints | 24-hour averages react too slowly to transient smog peaks | Engineering decision | Verified (Logic) |
| **AQI** | Workload multipliers | Light: 1.0, Mod: 1.5, Heavy: 2.5 | Increased ventilation rate dramatically increases inhaled dose | Respiratory physiology | Verified |
| **Health**| Hydration guidance | ~250ml every 15-20 min during frequent windows; otherwise drink normally | Derived ONLY from heat stress (WBGT caution or worse); air pollution escalation never triggers frequent hydration. | Occupational Physiology / NIOSH | Verified |
| **Schedule**| Recommended Blocks | Up to 2 non-overlapping blocks (min 2h each, total ≤ max_shift_hours) | Minimises combined risk, strictly preferring WORK > CAUTION > REDUCED; never includes AVOID. Block status = worst hour inside it. | Algorithmic Optimization | Verified |
| **Stats**| Flagged Hours (`hours_flagged`) | Count of AVOID or REDUCED(15/45) hours across generated DayPlans | Accurately identifies acute exposure hours prevented | Operational Definition | Verified |
| **Stats**| Lead Time (`avg_lead_time_hours`) | Mean hours between plan generation and the start of the first flagged dangerous window | Measures advance warning window for shift rescheduling | Operational Definition | Verified |
| **Backend** | Forecast cache TTL | 30 minutes (1800s) | Open-Meteo models update hourly; 30m cache minimizes duplicate network calls | System performance | Verified |
| **Backend** | API Gateway Throttling | Rate: 25 req/s, Burst: 50 | Protects backend against accidental traffic spikes in production | Cost / Stability | Verified |
| **Backend** | Audit log retention | 30 days TTL | Allows historical auditing while automatically purging stale records | Compliance | Verified |
| **Security** | Write protection | Constant-time `X-Chhaya-Passcode` | Protects crew mutations and bulk writes from unauthorized callers | Security baseline | Verified |
