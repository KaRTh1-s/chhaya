from datetime import datetime, timezone
from chhaya_engine.models import HourlyReading, JobType, Workload, SunExposure, create_worker_profile

def test_hourly_reading_to_dict():
    dt = datetime(2026, 5, 1, 12, 0, tzinfo=timezone.utc)
    hr = HourlyReading(dt, 35.0, 50.0, 800.0, 2.0, 50.0, 100.0)
    d = hr.to_dict()
    assert d["time"] == dt.isoformat()
    assert d["temp_c"] == 35.0
    assert d["pm2_5"] == 50.0

def test_create_worker_profile_defaults():
    profile = create_worker_profile(JobType.RIDER)
    assert profile.workload == Workload.MODERATE
    assert profile.sun_exposure == SunExposure.FULL

    profile2 = create_worker_profile(JobType.VENDOR)
    assert profile2.workload == Workload.LIGHT
    assert profile2.sun_exposure == SunExposure.PARTIAL
