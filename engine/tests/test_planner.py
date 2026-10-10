from datetime import UTC, datetime

from chhaya_engine.models import HourlyReading, HourStatus, JobType, create_worker_profile
from chhaya_engine.planner import plan_day


def test_planner_basic():
    now = datetime(2026, 5, 1, 12, 0, tzinfo=UTC)
    profile = create_worker_profile(JobType.CONSTRUCTION)
    
    readings = []
    for i in range(24):
        dt = datetime(2026, 5, 1, i, 0, tzinfo=UTC)
        r = HourlyReading(dt, 20.0, 50.0, 0.0, 0.0, 30.0, 30.0) # safe values
        readings.append(r)
        
    plan = plan_day(readings, profile, "Delhi", now)
    
    assert len(plan.hours) == 24
    assert len(plan.windows) > 0
    
    # Hours before preferred_start (6) are REST
    assert plan.hours[5].status == HourStatus.REST
    # Hours inside (6-20) are WORK
    assert plan.hours[12].status == HourStatus.WORK

def test_temperature_monotonicity_a5():
    """A5(a): Raising temperature never improves status (severity stays same or increases)."""
    profile = create_worker_profile(JobType.CONSTRUCTION)
    now = datetime(2026, 5, 1, 12, 0, tzinfo=UTC)
    
    status_severity = {
        HourStatus.WORK: 1,
        HourStatus.CAUTION: 2,
        HourStatus.REDUCED: 3,
        HourStatus.AVOID: 4,
    }
    
    prev_sev = 0
    for temp in range(15, 48, 2):
        dt = datetime(2026, 5, 1, 12, 0, tzinfo=UTC)
        r = [HourlyReading(dt, float(temp), 50.0, 200.0, 2.0, 30.0, 30.0)]
        plan = plan_day(r, profile, "Delhi", now)
        current_sev = status_severity[plan.hours[0].status]
        assert current_sev >= prev_sev, f"Temperature {temp}°C gave lower severity ({current_sev}) than previous ({prev_sev})"
        prev_sev = current_sev

def test_evidence_id_references_a5():
    """A5(b): Every referenced evidence id in HourPlan exists in DayPlan.evidence."""
    profile = create_worker_profile(JobType.RIDER)
    now = datetime(2026, 5, 1, 12, 0, tzinfo=UTC)
    
    readings = []
    for i in range(24):
        dt = datetime(2026, 5, 1, i, 0, tzinfo=UTC)
        readings.append(HourlyReading(dt, 32.0, 60.0, 300.0, 2.0, 150.0, 200.0))
        
    plan = plan_day(readings, profile, "Delhi", now)
    valid_evidence_ids = {e.id for e in plan.evidence}
    
    for h in plan.hours:
        for ev_id in h.evidence_ids:
            assert ev_id in valid_evidence_ids, f"Evidence ID {ev_id} not found in plan.evidence"

def test_shift_window_clipping_a5():
    """A5(c): Hours outside preferred shift window are marked as REST with OUTSIDE_SHIFT_WINDOW."""
    profile = create_worker_profile(
        JobType.VENDOR, 
        preferred_start_hour=8, 
        preferred_end_hour=18
    )
    now = datetime(2026, 5, 1, 12, 0, tzinfo=UTC)
    
    readings = [
        HourlyReading(datetime(2026, 5, 1, i, 0, tzinfo=UTC), 40.0, 50.0, 500.0, 1.0, 200.0, 300.0)
        for i in range(24)
    ]
    plan = plan_day(readings, profile, "Delhi", now)
    
    for h in plan.hours:
        if h.hour.hour < 8 or h.hour.hour >= 18:
            assert h.status == HourStatus.REST
            assert "OUTSIDE_SHIFT_WINDOW" in h.reasons
        else:
            assert h.status != HourStatus.REST

def test_none_pollutant_handling_a5():
    """A5(d): When pollutants are None, calculations do not crash and plan generates safely."""
    profile = create_worker_profile(JobType.SANITATION)
    now = datetime(2026, 5, 1, 12, 0, tzinfo=UTC)
    
    readings = [
        HourlyReading(datetime(2026, 5, 1, i, 0, tzinfo=UTC), 28.0, 50.0, 100.0, 2.0, pm2_5=None, pm10=None)
        for i in range(24)
    ]
    plan = plan_day(readings, profile, "Delhi", now)
    assert len(plan.hours) == 24
    for h in plan.hours:
        assert h.aqi is None
        assert h.aqi_category is None
    assert plan.mask["needed"] is False

def test_hydration_heat_only_a1():
    """A1: HourPlan.hydration = NORMAL | FREQUENT derived ONLY from heat; smog rider has 0 FREQUENT hours."""
    import json
    with open("engine/tests/fixtures/real_delhi_winter_smog.json", "r", encoding="utf-8") as f:
        d = json.load(f)
    readings = [
        HourlyReading(
            time=datetime.fromisoformat(x["time"]),
            temp_c=x["temp_c"],
            rh_pct=x["rh_pct"],
            shortwave_wm2=x["shortwave_wm2"],
            wind_ms=x["wind_ms"],
            pm2_5=x.get("pm2_5"),
            pm10=x.get("pm10")
        )
        for x in d["readings"]
    ]
    profile = create_worker_profile(JobType.RIDER)
    plan = plan_day(readings, profile, "Delhi", datetime(2025, 11, 23, 0, 0, tzinfo=UTC))
    
    frequent_hours = [h for h in plan.hours if h.hydration == "FREQUENT"]
    assert len(frequent_hours) == 0
    assert plan.hydration["frequent_windows"] == []
    assert "about 250 ml every 15-20 minutes during frequent windows; otherwise drink normally" in plan.hydration["guideline"]

def test_recommended_blocks_delhi_smog_rider_a2():
    """A2: Delhi winter smog + RIDER/MODERATE first recommended block must be 13:00-17:00 WORK."""
    import json
    with open("engine/tests/fixtures/real_delhi_winter_smog.json", "r", encoding="utf-8") as f:
        d = json.load(f)
    readings = [
        HourlyReading(
            time=datetime.fromisoformat(x["time"]),
            temp_c=x["temp_c"],
            rh_pct=x["rh_pct"],
            shortwave_wm2=x["shortwave_wm2"],
            wind_ms=x["wind_ms"],
            pm2_5=x.get("pm2_5"),
            pm10=x.get("pm10")
        )
        for x in d["readings"]
    ]
    profile = create_worker_profile(JobType.RIDER)
    plan = plan_day(readings, profile, "Delhi", datetime(2025, 11, 23, 0, 0, tzinfo=UTC))
    
    assert len(plan.recommended_blocks) >= 1
    b0 = plan.recommended_blocks[0]
    assert b0.start.hour == 13
    assert b0.end.hour == 17
    assert b0.status == HourStatus.WORK

def test_recommended_blocks_coimbatore_mild_a2():
    """A2: Coimbatore mild blocks are WORK-only."""
    import json
    with open("engine/tests/fixtures/real_coimbatore_mild.json", "r", encoding="utf-8") as f:
        d = json.load(f)
    readings = [
        HourlyReading(
            time=datetime.fromisoformat(x["time"]),
            temp_c=x["temp_c"],
            rh_pct=x["rh_pct"],
            shortwave_wm2=x["shortwave_wm2"],
            wind_ms=x["wind_ms"],
            pm2_5=x.get("pm2_5"),
            pm10=x.get("pm10")
        )
        for x in d["readings"]
    ]
    profile = create_worker_profile(JobType.VENDOR)
    plan = plan_day(readings, profile, "Coimbatore", datetime(2025, 1, 15, 0, 0, tzinfo=UTC))
    
    assert len(plan.recommended_blocks) > 0
    for b in plan.recommended_blocks:
        assert b.status == HourStatus.WORK


