from typing import Optional, Tuple
from chhaya_engine.models import HourlyReading, Workload

# CPCB AQI Breakpoints (µg/m³ -> AQI Index)
# Verified from official CPCB National Air Quality Index document
# Source: https://app.cpcbccr.com/ccr_docs/How_AQI_Calculated.pdf or CPCB guidelines
# Note: CPCB normally uses 3+ pollutants and 24h averaging; we use hourly PM as an approximation.

PM25_BREAKPOINTS = [
    (0, 30, 0, 50),       # Good
    (31, 60, 51, 100),    # Satisfactory
    (61, 90, 101, 200),   # Moderate
    (91, 120, 201, 300),  # Poor
    (121, 250, 301, 400), # Very Poor
    (251, 350, 401, 500)  # Severe
]

PM10_BREAKPOINTS = [
    (0, 50, 0, 50),       # Good
    (51, 100, 51, 100),   # Satisfactory
    (101, 250, 101, 200), # Moderate
    (251, 350, 201, 300), # Poor
    (351, 430, 301, 400), # Very Poor
    (431, 600, 401, 500)  # Severe
]

def _calc_subindex(conc: float, breakpoints: list[tuple[float, float, int, int]]) -> float:
    for blo, bhi, ilo, ihi in breakpoints:
        if blo <= conc <= bhi:
            # Linear interpolation
            if bhi == blo:
                return ilo
            return ilo + (ihi - ilo) / (bhi - blo) * (conc - blo)
    # If above max range, clamp to 500 (or max possible for severe tier)
    _, bhi, ilo, ihi = breakpoints[-1]
    if conc > bhi:
        return ihi # clamp to 500
    # Fallback clamp for upper range
    return breakpoints[-1][3]


def calculate_aqi(reading: HourlyReading) -> Optional[float]:
    subindices = []
    if reading.pm2_5 is not None:
        subindices.append(_calc_subindex(reading.pm2_5, PM25_BREAKPOINTS))
    if reading.pm10 is not None:
        subindices.append(_calc_subindex(reading.pm10, PM10_BREAKPOINTS))
    
    if not subindices:
        return None
    
    aqi = max(subindices)
    return min(aqi, 500.0) # Clamp above 500

def get_aqi_category(aqi: float) -> str:
    if aqi <= 50: return "Good"
    if aqi <= 100: return "Satisfactory"
    if aqi <= 200: return "Moderate"
    if aqi <= 300: return "Poor"
    if aqi <= 400: return "Very Poor"
    return "Severe"

# Workload exposure multiplier (inhaled-dose heuristic)
WORKLOAD_AQI_MULTIPLIER = {
    Workload.LIGHT: 1.0,
    Workload.MODERATE: 1.5,
    Workload.HEAVY: 2.5
}

def get_effective_exposure_index(aqi: float, workload: Workload) -> float:
    return aqi * WORKLOAD_AQI_MULTIPLIER[workload]
