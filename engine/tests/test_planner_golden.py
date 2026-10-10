import json
import pytest
from datetime import datetime, timezone
from chhaya_engine.models import HourlyReading, JobType, create_worker_profile, HourStatus
from chhaya_engine.planner import plan_day

def load_fixture(name):
    with open(f"engine/tests/fixtures/{name}", "r") as f:
        data = json.load(f)
        readings = []
        for d in data:
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
    now = datetime(2026, 5, 1, 12, 0, tzinfo=timezone.utc)
    profile = create_worker_profile(JobType.CONSTRUCTION)
    readings = load_fixture("delhi_summer_heat.json")
    
    plan = plan_day(readings, profile, "Delhi", now)
    
    # Assert AVOID windows in afternoon
    avoid_hours = [h for h in plan.hours if h.status == HourStatus.AVOID]
    assert len(avoid_hours) > 0
    # Should be inside working hours
    assert any(12 <= h.hour.hour <= 16 for h in avoid_hours)

def test_planner_coimbatore_mild_vendor():
    now = datetime(2026, 5, 1, 12, 0, tzinfo=timezone.utc)
    profile = create_worker_profile(JobType.VENDOR)
    readings = load_fixture("coimbatore_mild.json")
    
    plan = plan_day(readings, profile, "Coimbatore", now)
    
    # mostly WORK
    work_hours = [h for h in plan.hours if h.status == HourStatus.WORK]
    assert len(work_hours) > 5

def test_planner_delhi_winter_rider():
    now = datetime(2026, 5, 1, 12, 0, tzinfo=timezone.utc)
    profile = create_worker_profile(JobType.RIDER)
    readings = load_fixture("delhi_winter_smog.json")
    
    plan = plan_day(readings, profile, "Delhi", now)
    # Severe pollution should escalate
    avoid_hours = [h for h in plan.hours if h.status == HourStatus.AVOID]
    # Smog is high in morning/night, rider is moderate workload
    assert plan.mask["needed"] == True
