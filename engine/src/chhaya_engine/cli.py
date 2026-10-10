import argparse
import json
import sys
from datetime import UTC, datetime

from chhaya_engine.cities import get_city
from chhaya_engine.clients.openmeteo import OpenMeteoClient
from chhaya_engine.models import (
    HourlyReading,
    JobType,
    SunExposure,
    Workload,
    create_worker_profile,
)
from chhaya_engine.planner import plan_day


def main():
    parser = argparse.ArgumentParser(description="Chhaya Engine CLI")
    parser.add_argument("--city", required=True, help="City ID (e.g. delhi)")
    parser.add_argument("--job", required=True, type=lambda j: JobType[j.upper()], help="Job type: RIDER, CONSTRUCTION, VENDOR, SANITATION")
    parser.add_argument("--workload", type=lambda w: Workload[w.upper()], help="Workload: LIGHT, MODERATE, HEAVY")
    parser.add_argument("--sun", type=lambda s: SunExposure[s.upper()], help="Sun exposure: FULL, PARTIAL, SHADE")
    parser.add_argument("--fixture", help="Path to JSON fixture file to use instead of network")
    parser.add_argument("--json", action="store_true", help="Output raw JSON plan")
    parser.add_argument("--now", help="ISO 8601 time for generating plan (e.g. 2026-05-01T12:00:00Z)")
    args = parser.parse_args()

    city = get_city(args.city)
    if not city:
        print(f"Error: Unknown city '{args.city}'", file=sys.stderr)
        sys.exit(1)
        
    profile = create_worker_profile(args.job, args.workload, args.sun)

    now = datetime.now(UTC)
    if args.now:
        now = datetime.fromisoformat(args.now)

    readings = []
    if args.fixture:
        with open(args.fixture, "r", encoding="utf-8") as f:
            data = json.load(f)
            raw_list = data.get("readings", data) if isinstance(data, dict) else data
            for d in raw_list:
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
    else:
        client = OpenMeteoClient()
        readings = client.fetch_forecast(city.lat, city.lon)

    plan = plan_day(readings, profile, city.name, now)

    if args.json:
        print(json.dumps(plan.to_dict(), indent=2))
        return

    # Human readable output
    print(f"Plan for {city.name} | {profile.job_type.value} ({profile.workload.value})")
    print("-" * 60)
    print(f"{'Time':<6} | {'Status':<10} | {'WBGT':<5} | {'AQI':<4} | {'Reasons'}")
    print("-" * 60)
    for h in plan.hours:
        time_str = h.hour.strftime("%H:%M")
        aqi_str = f"{h.aqi:.0f}" if h.aqi is not None else "-"
        print(f"{time_str:<6} | {h.status.value:<10} | {h.wbgt_c:<5.1f} | {aqi_str:<4} | {','.join(h.reasons)}")
        
    print("\nWindows:")
    for w in plan.windows:
        print(f"  {w.start.strftime('%H:%M')}-{w.end.strftime('%H:%M')} : {w.status.value} ({w.summary_code})")
        
    print("\nRecommendations:")
    if plan.no_safe_window:
        print("  Shift Guidance: No safe window today: reschedule")
    else:
        blocks_str = ", ".join(f"{b.start.strftime('%H:%M')}-{b.end.strftime('%H:%M')} [{b.status.value}]" for b in plan.recommended_blocks)
        print(f"  Best blocks:    {blocks_str}")
    print(f"  Hydration:      {plan.hydration['text']}")
    print(f"  Mask:           {plan.mask['type']}")
    print(f"  Evidence:       {len(plan.evidence)} cards generated")

if __name__ == "__main__":
    main()
