from datetime import UTC, datetime

from chhaya_engine.heat import calculate_wbgt
from chhaya_engine.models import HourlyReading, SunExposure


def test_calculate_wbgt_known_values():
    # Test known values (tolerance 0.2): (T=35, rh=50) -> ~34.8; (T=25, rh=50) -> ~24.3
    # No sun for the baseline test.
    dt = datetime(2026, 5, 1, 12, 0, tzinfo=UTC)
    
    r1 = HourlyReading(dt, temp_c=35.0, rh_pct=50.0, shortwave_wm2=0.0, wind_ms=0.0)
    wbgt1 = calculate_wbgt(r1, SunExposure.SHADE)
    assert abs(wbgt1 - 34.8) < 0.2

    r2 = HourlyReading(dt, temp_c=25.0, rh_pct=50.0, shortwave_wm2=0.0, wind_ms=0.0)
    wbgt2 = calculate_wbgt(r2, SunExposure.SHADE)
    assert abs(wbgt2 - 24.3) < 0.2

def test_calculate_wbgt_monotonicity():
    dt = datetime(2026, 5, 1, 12, 0, tzinfo=UTC)
    r_base = HourlyReading(dt, temp_c=30.0, rh_pct=50.0, shortwave_wm2=0.0, wind_ms=0.0)
    r_hotter = HourlyReading(dt, temp_c=35.0, rh_pct=50.0, shortwave_wm2=0.0, wind_ms=0.0)
    r_humid = HourlyReading(dt, temp_c=30.0, rh_pct=80.0, shortwave_wm2=0.0, wind_ms=0.0)
    r_sun = HourlyReading(dt, temp_c=30.0, rh_pct=50.0, shortwave_wm2=1000.0, wind_ms=0.0)

    base_wbgt = calculate_wbgt(r_base, SunExposure.SHADE)
    assert calculate_wbgt(r_hotter, SunExposure.SHADE) > base_wbgt
    assert calculate_wbgt(r_humid, SunExposure.SHADE) > base_wbgt
    assert calculate_wbgt(r_sun, SunExposure.FULL) > base_wbgt
