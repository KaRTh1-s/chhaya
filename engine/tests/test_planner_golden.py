import json
from datetime import UTC, datetime

from chhaya_engine.models import HourlyReading, HourStatus, JobType, create_worker_profile
from chhaya_engine.planner import plan_day


def load_fixture(name):
    with open(f"engine/tests/fixtures/{name}", "r", encoding="utf-8") as f:
        data = json.load(f)
        readings_list = data.get("readings", data) if isinstance(data, dict) else data
        readings = []
        for d in readings_list:
            if isinstance(d, dict) and "temp_c" in d:
                readings.append(HourlyReading(
                    time=datetime.fromisoformat(d["time"]),
                    temp_c=d["temp_c"],
                    rh_pct=d["rh_pct"],
                    shortwave_wm2=d["shortwave_wm2"],
                    wind_ms=d["wind_ms"],
                    pm2_5=d.get("pm2_5"),
                    pm10=d.get("pm10")
                ))
        return readings

def test_planner_delhi_summer_construction():
    now = datetime(2025, 6, 9, 12, 0, tzinfo=UTC)
    profile = create_worker_profile(JobType.CONSTRUCTION)
    readings = load_fixture("real_delhi_summer_heat.json")
    
    plan = plan_day(readings, profile, "Delhi", now)
    
    # Assert AVOID windows in afternoon peak heat
    avoid_hours = [h for h in plan.hours if h.status == HourStatus.AVOID]
    assert len(avoid_hours) > 0
    assert any(12 <= h.hour.hour <= 16 for h in avoid_hours)
    # Check recommended blocks / no safe window
    assert len(plan.recommended_blocks) > 0 or plan.no_safe_window is True

def test_planner_coimbatore_mild_vendor():
    now = datetime(2025, 1, 15, 12, 0, tzinfo=UTC)
    profile = create_worker_profile(JobType.VENDOR)
    readings = load_fixture("real_coimbatore_mild.json")
    
    plan = plan_day(readings, profile, "Coimbatore", now)
    
    # Mostly WORK hours on a mild day
    work_hours = [h for h in plan.hours if h.status == HourStatus.WORK]
    assert len(work_hours) > 5
    assert not plan.no_safe_window
    assert len(plan.recommended_blocks) > 0

def test_planner_delhi_winter_rider():
    now = datetime(2025, 11, 23, 12, 0, tzinfo=UTC)
    profile = create_worker_profile(JobType.RIDER)
    readings = load_fixture("real_delhi_winter_smog.json")
    
    plan = plan_day(readings, profile, "Delhi", now)
    assert plan.mask["needed"] is True

def test_delhi_winter_smog_dominant_reason_a1():
    now = datetime(2026, 5, 1, 12, 0, tzinfo=UTC)
    profile = create_worker_profile(JobType.RIDER)
    # synthetic winter smog has PM2.5 = 300 (AQI > 400) at 06:00 and 07:00
    readings = load_fixture("synthetic_delhi_winter_smog.json")
    
    plan = plan_day(readings, profile, "Delhi", now)
    # The 06:00-08:00 AVOID window must report AIR_SEVERE_AVOID
    smog_avoid_windows = [w for w in plan.windows if w.start.hour == 6 and w.status == HourStatus.AVOID]
    assert len(smog_avoid_windows) >= 1
    for w in smog_avoid_windows:
        assert w.summary_code == "AIR_SEVERE_AVOID"


