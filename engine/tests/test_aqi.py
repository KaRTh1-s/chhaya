from datetime import UTC, datetime

from chhaya_engine.aqi import calculate_aqi, get_aqi_category, get_effective_exposure_index
from chhaya_engine.models import HourlyReading, Workload


def test_calculate_aqi_pm25():
    # PM2.5 = 45 -> AQI ~75 Satisfactory
    dt = datetime(2026, 5, 1, 12, 0, tzinfo=UTC)
    r = HourlyReading(dt, 30, 50, 0, 0, pm2_5=45.0, pm10=None)
    aqi = calculate_aqi(r)
    assert abs(aqi - 75.0) < 1.0
    assert get_aqi_category(aqi) == "Satisfactory"

    # PM2.5 = 100 -> AQI ~232 Poor (91-120 -> 201-300, 9 over 91 -> 9/29 * 99 + 201 = 231.7)
    r2 = HourlyReading(dt, 30, 50, 0, 0, pm2_5=100.0, pm10=None)
    aqi2 = calculate_aqi(r2)
    assert abs(aqi2 - 231.7) < 1.0
    assert get_aqi_category(aqi2) == "Poor"

def test_calculate_aqi_pm10():
    dt = datetime(2026, 5, 1, 12, 0, tzinfo=UTC)
    r = HourlyReading(dt, 30, 50, 0, 0, pm2_5=None, pm10=75.0)
    aqi = calculate_aqi(r)
    # 51-100 -> 51-100
    assert abs(aqi - 75.0) < 1.0
    assert get_aqi_category(aqi) == "Satisfactory"

def test_calculate_aqi_max():
    dt = datetime(2026, 5, 1, 12, 0, tzinfo=UTC)
    r = HourlyReading(dt, 30, 50, 0, 0, pm2_5=100.0, pm10=50.0) # PM2.5=232, PM10=50
    aqi = calculate_aqi(r)
    assert abs(aqi - 231.7) < 1.0

def test_calculate_aqi_none():
    dt = datetime(2026, 5, 1, 12, 0, tzinfo=UTC)
    r = HourlyReading(dt, 30, 50, 0, 0, pm2_5=None, pm10=None)
    aqi = calculate_aqi(r)
    assert aqi is None

def test_calculate_aqi_clamp():
    dt = datetime(2026, 5, 1, 12, 0, tzinfo=UTC)
    r = HourlyReading(dt, 30, 50, 0, 0, pm2_5=1000.0, pm10=None)
    aqi = calculate_aqi(r)
    assert aqi == 500.0

def test_effective_exposure():
    assert get_effective_exposure_index(100.0, Workload.LIGHT) == 100.0
    assert get_effective_exposure_index(100.0, Workload.MODERATE) == 150.0
    assert get_effective_exposure_index(100.0, Workload.HEAVY) == 250.0


def test_calculate_aqi_intermediate_floats_no_500_spike():
    dt = datetime(2026, 5, 1, 12, 0, tzinfo=UTC)
    # 30.3, 30.5, 60.5, 90.5 must not fall through to 500
    r1 = HourlyReading(dt, 30, 50, 0, 0, pm2_5=30.3, pm10=44.1)
    aqi1 = calculate_aqi(r1)
    assert aqi1 is not None
    assert 50.0 <= aqi1 <= 55.0  # Satisfactory, NOT 500
    assert get_aqi_category(aqi1) == "Satisfactory"

    r2 = HourlyReading(dt, 30, 50, 0, 0, pm2_5=30.5, pm10=None)
    aqi2 = calculate_aqi(r2)
    assert aqi2 is not None
    assert 50.0 <= aqi2 <= 51.0

    r3 = HourlyReading(dt, 30, 50, 0, 0, pm2_5=60.5, pm10=None)
    aqi3 = calculate_aqi(r3)
    assert aqi3 is not None
    assert 100.0 <= aqi3 <= 102.0


def test_chennai_scenario_aqi_not_500():
    from chhaya_engine.scenarios import SCENARIOS, load_scenario_readings
    sc = next(s for s in SCENARIOS if "chennai" in s.id)
    readings = load_scenario_readings(sc)
    aqis = [calculate_aqi(r) for r in readings]
    assert all(a is not None for a in aqis)
    assert max(aqis) < 100.0  # Chennai coastal cyclone precursor day has max AQI ~55, never 500

