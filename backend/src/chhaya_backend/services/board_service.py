"""Risk Board service computing compact risk matrix across seeded cities and job profiles."""
from datetime import UTC, datetime
from typing import Any

from chhaya_engine.cities import get_city, list_cities
from chhaya_engine.models import JobType, create_worker_profile
from chhaya_engine.planner import plan_day
from chhaya_engine.scenarios import list_scenarios, load_scenario_readings

from chhaya_backend.services.plan_service import PlanService


class BoardService:
    def __init__(self, plan_service: PlanService):
        self.plan_service = plan_service
        self._cached_board = None
        self._cache_time = 0.0

    def get_risk_board(self, mode: str = "live") -> dict[str, Any]:
        now = datetime.now(UTC)

        if mode == "replay":
            scenarios = list_scenarios()
            entries = []
            for sc in scenarios:
                city = get_city(sc.city_id)
                readings = load_scenario_readings(sc)
                sc_now = datetime.fromisoformat(f"{sc.date}T00:00:00+00:00")
                jobs_summary = {}

                for job_type in JobType:
                    profile = create_worker_profile(job_type)
                    plan = plan_day(readings, profile, city.name if city else sc.city_id, sc_now)

                    current_hr_plan = plan.hours[0] if plan.hours else None
                    current_risk = current_hr_plan.risk_level.value if current_hr_plan else "LOW"

                    next_12h = plan.hours[:12] if len(plan.hours) >= 12 else plan.hours
                    peak_risk = "LOW"
                    risk_order = ["LOW", "MODERATE", "HIGH", "EXTREME"]
                    for h in next_12h:
                        if risk_order.index(h.risk_level.value) > risk_order.index(peak_risk):
                            peak_risk = h.risk_level.value

                    jobs_summary[job_type.value] = {
                        "current_risk": current_risk,
                        "next_12h_peak_risk": peak_risk,
                        "workload": profile.workload.value,
                        "sun_exposure": profile.sun_exposure.value,
                    }

                entries.append({
                    "scenario_id": sc.id,
                    "label": sc.label,
                    "date": sc.date,
                    "city_id": sc.city_id,
                    "city_name": city.name if city else sc.city_id,
                    "lat": city.lat if city else 0.0,
                    "lon": city.lon if city else 0.0,
                    "jobs": jobs_summary,
                })

            return {
                "updated_at": now.isoformat(),
                "mode": "replay",
                "cities": entries,
            }

        # Live / Default mode: all 12 cities in live mode, or supported cities in fixture mode
        cities = list_cities()
        if self.plan_service.config.data_mode == "fixture":
            cities = [c for c in cities if c.id in ("delhi", "chennai", "coimbatore")]

        board_cities = []

        for city in cities:
            readings = self.plan_service.get_readings(city.lat, city.lon, city.id)
            jobs_summary = {}

            for job_type in JobType:
                profile = create_worker_profile(job_type)
                plan = plan_day(readings, profile, city.name, now)

                # Current hour risk (first hour in readings or matching now)
                current_hr_plan = plan.hours[0] if plan.hours else None
                current_risk = current_hr_plan.risk_level.value if current_hr_plan else "LOW"

                # Next 12h peak risk
                next_12h = plan.hours[:12] if len(plan.hours) >= 12 else plan.hours
                peak_risk = "LOW"
                risk_order = ["LOW", "MODERATE", "HIGH", "EXTREME"]
                for h in next_12h:
                    if risk_order.index(h.risk_level.value) > risk_order.index(peak_risk):
                        peak_risk = h.risk_level.value

                jobs_summary[job_type.value] = {
                    "current_risk": current_risk,
                    "next_12h_peak_risk": peak_risk,
                    "workload": profile.workload.value,
                    "sun_exposure": profile.sun_exposure.value,
                }

            board_cities.append({
                "city_id": city.id,
                "city_name": city.name,
                "lat": city.lat,
                "lon": city.lon,
                "jobs": jobs_summary,
            })

        return {
            "updated_at": now.isoformat(),
            "mode": "live",
            "cities": board_cities,
        }
