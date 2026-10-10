import pytest
from datetime import datetime, timezone, timedelta
from chhaya_engine.models import HourlyReading, JobType, create_worker_profile, HourStatus
from chhaya_engine.planner import plan_day

def test_planner_basic():
    now = datetime(2026, 5, 1, 12, 0, tzinfo=timezone.utc)
    profile = create_worker_profile(JobType.CONSTRUCTION)
    
    readings = []
    for i in range(24):
        dt = datetime(2026, 5, 1, i, 0, tzinfo=timezone.utc)
        r = HourlyReading(dt, 20.0, 50.0, 0.0, 0.0, 30.0, 30.0) # safe values
        readings.append(r)
        
    plan = plan_day(readings, profile, "Delhi", now)
    
    assert len(plan.hours) == 24
    assert len(plan.windows) > 0
    
    # Hours before preferred_start (6) are REST
    assert plan.hours[5].status == HourStatus.REST
    # Hours inside (6-20) are WORK
    assert plan.hours[12].status == HourStatus.WORK
