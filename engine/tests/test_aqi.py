import pytest
from datetime import datetime, timezone
from chhaya_engine.aqi import calculate_aqi, get_aqi_category, get_effective_exposure_index
from chhaya_engine.models import HourlyReading, Workload

def test_calculate_aqi_pm25():
    # PM2.5 = 45 -> AQI ~75 Satisfactory
    dt = datetime(2026, 5, 1, 12, 0, tzinfo=timezone.utc)
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
    dt = datetime(2026, 5, 1, 12, 0, tzinfo=timezone.utc)
    r = HourlyReading(dt, 30, 50, 0, 0, pm2_5=None, pm10=75.0)
    aqi = calculate_aqi(r)
    # 51-100 -> 51-100
    assert abs(aqi - 75.0) < 1.0
    assert get_aqi_category(aqi) == "Satisfactory"

def test_calculate_aqi_max():
    dt = datetime(2026, 5, 1, 12, 0, tzinfo=timezone.utc)
    r = HourlyReading(dt, 30, 50, 0, 0, pm2_5=100.0, pm10=50.0) # PM2.5=232, PM10=50
    aqi = calculate_aqi(r)
    assert abs(aqi - 231.7) < 1.0

def test_calculate_aqi_none():
    dt = datetime(2026, 5, 1, 12, 0, tzinfo=timezone.utc)
    r = HourlyReading(dt, 30, 50, 0, 0, pm2_5=None, pm10=None)
    aqi = calculate_aqi(r)
    assert aqi is None

def test_calculate_aqi_clamp():
    dt = datetime(2026, 5, 1, 12, 0, tzinfo=timezone.utc)
    r = HourlyReading(dt, 30, 50, 0, 0, pm2_5=1000.0, pm10=None)
    aqi = calculate_aqi(r)
    assert aqi == 500.0

def test_effective_exposure():
    assert get_effective_exposure_index(100.0, Workload.LIGHT) == 100.0
    assert get_effective_exposure_index(100.0, Workload.MODERATE) == 150.0
    assert get_effective_exposure_index(100.0, Workload.HEAVY) == 250.0
