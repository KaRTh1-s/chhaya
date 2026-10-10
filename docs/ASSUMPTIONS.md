# Assumptions & Heuristics

This document logs every threshold and heuristic in Chhaya's engine to guarantee transparency.

| Component | Assumption/Heuristic | Value | Why | Source | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Heat** | Solar adjustment per kW/m² | +3.0 °C per 1000 W/m² (Full Sun) | WBGT in sun is typically 2-3°C higher than shade. | General meteorology | To verify |
| **Heat** | WBGT continuous work limits | Light: 30°C, Mod: 28°C, Heavy: 26°C | Safe starting points for acclimatized workers | NIOSH/ISO 7243 | To verify |
| **Heat** | Work/Rest tiers (delta = WBGT - limit) | ≤0: Caution, ≤2: 45/15, ≤4: 30/30, ≤6: 15/45, >6: Avoid | Standardized incremental heat stress reduction | Adapted from standard charts | To verify |
| **AQI** | Hourly PM as proxy | Hourly PM2.5/PM10 interpolated directly into 24h breakpoints | 24-hour averages react too slowly to transient smog peaks | Engineering decision | Verified (Logic) |
| **AQI** | Workload multipliers | Light: 1.0, Mod: 1.5, Heavy: 2.5 | Increased ventilation rate dramatically increases inhaled dose | Respiratory physiology | To verify |
| **Health**| Hydration guidance | ~250ml every 15-20 min when CAUTION or worse | Baseline hydration necessary during heat stress | NIOSH | Verified |
| **Backend** | Forecast cache TTL | 30 minutes (1800s) | Open-Meteo models update hourly; 30m cache minimizes duplicate network calls | System performance | Verified |
| **Backend** | API Gateway Throttling | Rate: 25 req/s, Burst: 50 | Protects backend against accidental traffic spikes in production | Cost / Stability | Verified |
| **Backend** | Audit log retention | 30 days TTL | Allows historical auditing while automatically purging stale records | Compliance | Verified |
| **Security** | Write protection | Constant-time `X-Chhaya-Passcode` | Protects crew mutations and bulk writes from unauthorized callers | Security baseline | Verified |
