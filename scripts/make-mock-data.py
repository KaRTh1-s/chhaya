#!/usr/bin/env python3
"""
Generate realistic mock data JSON files for the Chhaya Web UI
directly from real engine fixtures and planner calculations.
"""
import json
import os
import sys
from datetime import UTC, datetime
from pathlib import Path

# Add engine/src to Python path so we can use chhaya_engine directly
REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT / "engine" / "src"))

from chhaya_engine.cities import CITIES, list_cities
from chhaya_engine.models import HourlyReading, HourStatus, JobType, RiskLevel, Workload, SunExposure, create_worker_profile
from chhaya_engine.planner import plan_day


def load_fixture_readings(filename: str) -> tuple[list[HourlyReading], dict]:
    fixture_path = REPO_ROOT / "engine" / "tests" / "fixtures" / filename
    with open(fixture_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    meta = data.get("_meta", {})
    raw_readings = data.get("readings", data) if isinstance(data, dict) else data
    readings = []
    for d in raw_readings:
        if isinstance(d, dict) and "temp_c" in d:
            readings.append(
                HourlyReading(
                    time=datetime.fromisoformat(d["time"]),
                    temp_c=d["temp_c"],
                    rh_pct=d["rh_pct"],
                    shortwave_wm2=d["shortwave_wm2"],
                    wind_ms=d["wind_ms"],
                    pm2_5=d.get("pm2_5"),
                    pm10=d.get("pm10"),
                )
            )
    return readings, meta


def generate_all_mock_data():
    out_dir = REPO_ROOT / "web" / "src" / "api" / "mock-data"
    out_dir.mkdir(parents=True, exist_ok=True)

    scenarios = [
        {
            "id": "delhi-heatwave-2025-06-09",
            "label": "Delhi Heatwave (43.7°C recorded peak)",
            "city_id": "delhi",
            "city_name": "Delhi",
            "date": "2025-06-09",
            "fixture": "real_delhi_summer_heat.json",
            "job_type": JobType.CONSTRUCTION,
            "workload": Workload.HEAVY,
            "max_temp_c": 43.7,
            "max_pm2_5": 163.0,
        },
        {
            "id": "delhi-smog-2025-11-23",
            "label": "Delhi Severe Winter Smog (AQI 400+)",
            "city_id": "delhi",
            "city_name": "Delhi",
            "date": "2025-11-23",
            "fixture": "real_delhi_winter_smog.json",
            "job_type": JobType.RIDER,
            "workload": Workload.MODERATE,
            "max_temp_c": 26.2,
            "max_pm2_5": 380.0,
        },
        {
            "id": "chennai-humid-2025-05-31",
            "label": "Chennai High Humidity Summer Day",
            "city_id": "chennai",
            "city_name": "Chennai",
            "date": "2025-05-31",
            "fixture": "real_chennai_humid_day.json",
            "job_type": JobType.SANITATION,
            "workload": Workload.HEAVY,
            "max_temp_c": 38.5,
            "max_pm2_5": 42.0,
        },
        {
            "id": "coimbatore-mild-2025-01-15",
            "label": "Coimbatore Mild Winter Day",
            "city_id": "coimbatore",
            "city_name": "Coimbatore",
            "date": "2025-01-15",
            "fixture": "real_coimbatore_mild.json",
            "job_type": JobType.VENDOR,
            "workload": Workload.LIGHT,
            "max_temp_c": 29.8,
            "max_pm2_5": 28.0,
        },
    ]

    # 1. Scenarios metadata
    scenarios_meta = [
        {
            "id": s["id"],
            "label": s["label"],
            "city_id": s["city_id"],
            "date": s["date"],
            "max_temp_c": s["max_temp_c"],
            "max_pm2_5": s["max_pm2_5"],
        }
        for s in scenarios
    ]
    with open(out_dir / "scenarios.json", "w", encoding="utf-8") as f:
        json.dump(scenarios_meta, f, indent=2)

    # 2. Cities metadata
    cities_data = [
        {"id": c.id, "name": c.name, "lat": c.lat, "lon": c.lon, "state": c.state}
        for c in CITIES
    ]
    with open(out_dir / "cities.json", "w", encoding="utf-8") as f:
        json.dump(cities_data, f, indent=2)

    # 3. Generate Scenario DayPlans
    for sc in scenarios:
        readings, meta = load_fixture_readings(sc["fixture"])
        profile = create_worker_profile(
            job_type=sc["job_type"],
            workload=sc["workload"],
            sun_exposure=SunExposure.FULL if sc["job_type"] != JobType.VENDOR else SunExposure.PARTIAL,
        )
        plan_dt = datetime.fromisoformat(f"{sc['date']}T12:00:00+05:30")
        plan = plan_day(readings, profile, sc["city_name"], plan_dt)
        plan_dict = plan.to_dict()
        plan_dict["data_source"] = "replay"
        plan_dict["scenario_id"] = sc["id"]
        plan_dict["recorded_date"] = sc["date"]

        with open(out_dir / f"{sc['id']}.json", "w", encoding="utf-8") as f:
            json.dump(plan_dict, f, indent=2)

    # 4. Generate Delhi heatwave rider comparison plan
    delhi_readings, _ = load_fixture_readings("real_delhi_summer_heat.json")
    rider_profile = create_worker_profile(JobType.RIDER, Workload.MODERATE, SunExposure.FULL)
    rider_plan = plan_day(delhi_readings, rider_profile, "Delhi", datetime.fromisoformat("2025-06-09T12:00:00+05:30"))
    rider_dict = rider_plan.to_dict()
    rider_dict["data_source"] = "replay"
    rider_dict["scenario_id"] = "delhi-heatwave-2025-06-09"
    rider_dict["recorded_date"] = "2025-06-09"
    with open(out_dir / "delhi-heatwave-rider.json", "w", encoding="utf-8") as f:
        json.dump(rider_dict, f, indent=2)

    # 5. Global Stats
    stats_data = {
        "plans_generated": 142,
        "cities_covered": 12,
        "hours_flagged": 864,
        "avg_lead_time_hours": 4.8,
        "crews_registered": 18,
        "alerts_sent": 56,
        "seeded": True,
        "advisories_generated": 142,
        "llm_first_pass_valid_rate": 0.96,
    }
    with open(out_dir / "stats.json", "w", encoding="utf-8") as f:
        json.dump(stats_data, f, indent=2)

    # 6. Risk Board
    board_data = {
        "updated_at": "2026-10-10T09:00:00+05:30",
        "mode": "replay",
        "cities": [
            {
                "city_id": "delhi",
                "city_name": "Delhi",
                "current_risk": "EXTREME",
                "current_temp_c": 41.2,
                "current_wbgt_c": 32.8,
                "current_aqi": 185,
                "peak_12h_risk": "EXTREME",
                "peak_12h_wbgt_c": 33.9,
                "dominant_factor": "HEAT",
                "active_crews": 6,
                "status": "DANGER",
            },
            {
                "city_id": "mumbai",
                "city_name": "Mumbai",
                "current_risk": "HIGH",
                "current_temp_c": 34.0,
                "current_wbgt_c": 30.8,
                "current_aqi": 110,
                "peak_12h_risk": "HIGH",
                "peak_12h_wbgt_c": 31.5,
                "dominant_factor": "HUMIDITY",
                "active_crews": 4,
                "status": "CAUTION",
            },
            {
                "city_id": "chennai",
                "city_name": "Chennai",
                "current_risk": "HIGH",
                "current_temp_c": 36.2,
                "current_wbgt_c": 31.6,
                "current_aqi": 75,
                "peak_12h_risk": "HIGH",
                "peak_12h_wbgt_c": 32.2,
                "dominant_factor": "HEAT_HUMIDITY",
                "active_crews": 3,
                "status": "CAUTION",
            },
            {
                "city_id": "coimbatore",
                "city_name": "Coimbatore",
                "current_risk": "LOW",
                "current_temp_c": 28.4,
                "current_wbgt_c": 24.1,
                "current_aqi": 42,
                "peak_12h_risk": "MODERATE",
                "peak_12h_wbgt_c": 26.5,
                "dominant_factor": "NONE",
                "active_crews": 2,
                "status": "SAFE",
            },
            {
                "city_id": "kolkata",
                "city_name": "Kolkata",
                "current_risk": "HIGH",
                "current_temp_c": 35.8,
                "current_wbgt_c": 31.2,
                "current_aqi": 140,
                "peak_12h_risk": "EXTREME",
                "peak_12h_wbgt_c": 32.9,
                "dominant_factor": "HEAT_HUMIDITY",
                "active_crews": 3,
                "status": "DANGER",
            },
        ],
    }
    with open(out_dir / "board.json", "w", encoding="utf-8") as f:
        json.dump(board_data, f, indent=2)

    # 7. Sample Advisories in 3 languages
    sample_advisories = {
        "delhi-heatwave-2025-06-09": {
            "en": {
                "language": "en",
                "sentences": [
                    {
                        "text": "Extreme heat stress is projected between 11:00 AM and 04:00 PM with WBGT peaking at 33.9°C.",
                        "evidence_ids": ["ev_wbgt_peak_14", "ev_temp_peak_14"],
                    },
                    {
                        "text": "Halt heavy physical work during 12:00 PM – 03:00 PM; prioritize the early morning 06:00 AM – 10:00 AM shift.",
                        "evidence_ids": ["ev_window_avoid_12_15", "ev_block_morning_safe"],
                    },
                    {
                        "text": "Drink at least 250ml water every 15–20 minutes and use shaded rest stations.",
                        "evidence_ids": ["ev_hydration_caution"],
                    },
                ],
                "seek_help": [
                    "Dizziness, confusion, cessation of sweating or nausea requires immediate medical assistance.",
                    "Call 108 for ambulance assistance during acute heat emergency.",
                ],
                "mode": "bedrock",
                "validated": True,
                "fallback_reason": None,
            },
            "hi": {
                "language": "hi",
                "sentences": [
                    {
                        "text": "दिल्ली में सुबह 11:00 से शाम 04:00 बजे के बीच अत्यधिक गर्मी का अनुमान है, जहाँ WBGT तापमान 33.9°C तक पहुँचेगा।",
                        "evidence_ids": ["ev_wbgt_peak_14", "ev_temp_peak_14"],
                    },
                    {
                        "text": "दोपहर 12:00 से 03:00 बजे के बीच भारी काम रोकें और सुबह 06:00 से 10:00 बजे के सुरक्षित समय में काम पूरा करें।",
                        "evidence_ids": ["ev_window_avoid_12_15", "ev_block_morning_safe"],
                    },
                    {
                        "text": "हर 15-20 मिनट में कम से कम 250 मिलीलीटर पानी या ओआरएस घोल अवश्य पिएं।",
                        "evidence_ids": ["ev_hydration_caution"],
                    },
                ],
                "seek_help": [
                    "चक्कर आना, भ्रम या पसीना बंद होना गंभीर खतरे के लक्षण हैं; तुरंत छाया में जाएं और 108 पर कॉल करें।",
                ],
                "mode": "bedrock",
                "validated": True,
                "fallback_reason": None,
            },
            "ta": {
                "language": "ta",
                "sentences": [
                    {
                        "text": "டெல்லியில் காலை 11:00 மணி முதல் மாலை 04:00 மணி வரை கடுமையான வெப்ப அழுத்தம் இருக்கும், WBGT 33.9°C ஐ எட்டும்.",
                        "evidence_ids": ["ev_wbgt_peak_14", "ev_temp_peak_14"],
                    },
                    {
                        "text": "மதியம் 12:00 முதல் 03:00 வரை கடுமையான வெளிப்புறப் பணிகளைத் தவிர்த்து, காலை 06:00 முதல் 10:00 மணி வரை வேலை செய்யவும்.",
                        "evidence_ids": ["ev_window_avoid_12_15", "ev_block_morning_safe"],
                    },
                    {
                        "text": "ஒவ்வொரு 15-20 நிமிடங்களுக்கும் குறைந்தது 250 மி.லி தண்ணீர் அல்லது ORS குடிக்கவும்.",
                        "evidence_ids": ["ev_hydration_caution"],
                    },
                ],
                "seek_help": [
                    "மயக்கம், குழப்பம் அல்லது வியர்வை நிற்காத நிலை ஏற்பட்டால் உடனே நிழலில் அமர்ந்து 108 அவசர உதவிக்கு அழைக்கவும்.",
                ],
                "mode": "bedrock",
                "validated": True,
                "fallback_reason": None,
            },
        }
    }
    with open(out_dir / "advisories.json", "w", encoding="utf-8") as f:
        json.dump(sample_advisories, f, indent=2)

    # 8. Audit Log
    audit_data = {
        "audit_events": [
            {
                "id": "aud_01jk982abc1",
                "event_type": "PLAN_GENERATED",
                "timestamp": "2026-10-10T08:45:12+05:30",
                "details": {
                    "city_id": "delhi",
                    "job_type": "CONSTRUCTION",
                    "workload": "HEAVY",
                    "overall_risk": "EXTREME",
                    "hours_flagged": 5,
                },
            },
            {
                "id": "aud_01jk982abc2",
                "event_type": "ADVISORY_PROMPTED",
                "timestamp": "2026-10-10T08:45:13+05:30",
                "details": {
                    "model": "anthropic.claude-3-5-sonnet",
                    "language": "hi",
                    "validated": True,
                    "evidence_card_count": 4,
                },
            },
            {
                "id": "aud_01jk982abc3",
                "event_type": "ALERT_DISPATCHED",
                "timestamp": "2026-10-10T08:30:00+05:30",
                "details": {
                    "city_id": "delhi",
                    "target_crew_count": 6,
                    "trigger_reason": "DANGEROUS_HEAT_WINDOW_APPROACHING",
                },
            },
            {
                "id": "aud_01jk982abc4",
                "event_type": "CREW_REGISTERED",
                "timestamp": "2026-10-10T07:12:44+05:30",
                "details": {
                    "crew_id": "crw_south_delhi_masonry",
                    "city_id": "delhi",
                    "job_type": "CONSTRUCTION",
                    "size": 14,
                },
            },
        ]
    }
    with open(out_dir / "audit.json", "w", encoding="utf-8") as f:
        json.dump(audit_data, f, indent=2)

    # 9. Crews Data
    crews_data = {
        "crews": [
            {
                "id": "crw_south_delhi_masonry",
                "name": "South Delhi Masonry Unit 4",
                "city_id": "delhi",
                "job_type": "CONSTRUCTION",
                "workload": "HEAVY",
                "size": 14,
                "created_at": "2026-10-08T10:00:00+05:30",
                "plan_summary": {
                    "overall_risk": "EXTREME",
                    "hours_avoid": 4,
                    "safe_window": "06:00 - 10:00 AM",
                },
            },
            {
                "id": "crw_noida_express_riders",
                "name": "Sector 62 Quick-Commerce Fleet",
                "city_id": "delhi",
                "job_type": "RIDER",
                "workload": "MODERATE",
                "size": 28,
                "created_at": "2026-10-09T14:30:00+05:30",
                "plan_summary": {
                    "overall_risk": "HIGH",
                    "hours_avoid": 2,
                    "safe_window": "07:00 - 11:00 AM, 05:00 - 09:00 PM",
                },
            },
            {
                "id": "crw_chennai_harbour_sanitation",
                "name": "Royapuram Coastal Sanitation Crew",
                "city_id": "chennai",
                "job_type": "SANITATION",
                "workload": "HEAVY",
                "size": 19,
                "created_at": "2026-10-07T09:15:00+05:30",
                "plan_summary": {
                    "overall_risk": "HIGH",
                    "hours_avoid": 3,
                    "safe_window": "05:30 - 09:30 AM",
                },
            },
        ]
    }
    with open(out_dir / "crews.json", "w", encoding="utf-8") as f:
        json.dump(crews_data, f, indent=2)

    print(f"[OK] Generated real fixture-derived mock data in: {out_dir}")


if __name__ == "__main__":
    generate_all_mock_data()
