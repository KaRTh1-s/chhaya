"""Fixture audit and scenarios verification script."""
import json
import sys
from pathlib import Path
from datetime import datetime

sys.path.extend(["engine/src", "backend/src"])
from chhaya_engine.scenarios import load_scenario_readings, get_scenario, SCENARIOS
from chhaya_engine.planner import plan_day
from chhaya_engine.models import JobType, Workload, create_worker_profile
from chhaya_engine.heat import calculate_wbgt
from chhaya_engine.aqi import calculate_aqi
from chhaya_backend.router import Router

def audit_fixtures():
    for sc in SCENARIOS:
        fpath = Path("engine/tests/fixtures") / sc.fixture_filename
        with open(fpath, "r", encoding="utf-8") as f:
            fdata = json.load(f)
        
        meta = fdata.get("_meta", {})
        readings = load_scenario_readings(sc)
        
        max_temp = max(r.temp_c for r in readings)
        max_pm25 = max((r.pm2_5 or 0.0) for r in readings)
        max_pm10 = max((r.pm10 or 0.0) for r in readings)
        
        peak_wbgt_r = max(readings, key=lambda r: calculate_wbgt(r, create_worker_profile(JobType.CONSTRUCTION).sun_exposure))
        peak_wbgt_val = calculate_wbgt(peak_wbgt_r, create_worker_profile(JobType.CONSTRUCTION).sun_exposure)
        peak_wbgt_hour = peak_wbgt_r.time.strftime("%H:%M")
        
        peak_aqi_r = max(readings, key=lambda r: (calculate_aqi(r) or 0.0))
        peak_aqi_val = calculate_aqi(peak_aqi_r)
        peak_aqi_hour = peak_aqi_r.time.strftime("%H:%M")
        
        # Construction Heavy Plan
        p_heavy = create_worker_profile(JobType.CONSTRUCTION, Workload.HEAVY)
        anchor_dt = datetime.fromisoformat(f"{sc.date}T00:00:00+00:00")
        plan_heavy = plan_day(readings, p_heavy, sc.label, anchor_dt)
        avoid_heavy = sum(1 for h in plan_heavy.hours if h.status.value == "AVOID" and "OUTSIDE_SHIFT_WINDOW" not in h.reasons)
        reduced_heavy = sum(1 for h in plan_heavy.hours if h.status.value == "REDUCED" and "OUTSIDE_SHIFT_WINDOW" not in h.reasons)
        
        # Rider Moderate Plan
        p_mod = create_worker_profile(JobType.RIDER, Workload.MODERATE)
        plan_mod = plan_day(readings, p_mod, sc.label, anchor_dt)
        avoid_mod = sum(1 for h in plan_mod.hours if h.status.value == "AVOID" and "OUTSIDE_SHIFT_WINDOW" not in h.reasons)
        reduced_mod = sum(1 for h in plan_mod.hours if h.status.value == "REDUCED" and "OUTSIDE_SHIFT_WINDOW" not in h.reasons)
        
        print(f"--------------------------------------------------------------------------------")
        print(f"Fixture File:       {sc.fixture_filename}")
        print(f"Scenario ID:        {sc.id}")
        print(f"Label:              {sc.label}")
        print(f"_meta Date:         {meta.get('date')}")
        print(f"_meta Retrieved At: {meta.get('retrieved_at')}")
        print(f"Source Weather URL: {meta.get('source_weather_url')}")
        print(f"Source AQI URL:     {meta.get('source_aqi_url')}")
        print(f"Max Temperature:    {max_temp:.1f} °C")
        print(f"Max PM2.5:          {max_pm25:.1f} µg/m³")
        print(f"Max PM10:           {max_pm10:.1f} µg/m³")
        print(f"Peak WBGT (Full):   {peak_wbgt_val:.2f} °C at hour {peak_wbgt_hour}")
        print(f"Peak AQI:           {peak_aqi_val:.1f} at hour {peak_aqi_hour}")
        print(f"CONSTRUCTION/HEAVY: {avoid_heavy}h AVOID, {reduced_heavy}h REDUCED (in shift)")
        print(f"RIDER/MODERATE:     {avoid_mod}h AVOID, {reduced_mod}h REDUCED (in shift)")

def print_router_scenarios():
    router = Router()
    event = {
        "rawPath": "/scenarios",
        "requestContext": {
            "http": {
                "method": "GET"
            }
        }
    }
    resp = router.route(event)
    print(resp.get("body", "{}"))

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "scenarios":
        print_router_scenarios()
    else:
        audit_fixtures()
