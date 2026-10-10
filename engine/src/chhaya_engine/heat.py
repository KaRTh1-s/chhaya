import math
from chhaya_engine.models import HourlyReading, SunExposure

SOLAR_ADJ_C_PER_KW_M2 = 3.0

def calculate_wbgt(reading: HourlyReading, sun_exposure: SunExposure) -> float:
    T = reading.temp_c
    rh = reading.rh_pct
    shortwave_wm2 = reading.shortwave_wm2

    # Vapour pressure e (hPa)
    e = (rh / 100.0) * 6.105 * math.exp(17.27 * T / (237.7 + T))

    # Australian Bureau of Meteorology approximation for WBGT in shade
    wbgt_shade = 0.567 * T + 0.393 * e + 3.94

    # Solar adjustment
    factor = 1.0
    if sun_exposure == SunExposure.PARTIAL:
        factor = 0.5
    elif sun_exposure == SunExposure.SHADE:
        factor = 0.0

    solar_adjustment = SOLAR_ADJ_C_PER_KW_M2 * (shortwave_wm2 / 1000.0) * factor
    return wbgt_shade + solar_adjustment
