"""Risk Board service computing compact risk matrix across seeded cities and job profiles."""
from datetime import UTC, datetime
from typing import Any

from chhaya_engine.cities import list_cities
from chhaya_engine.models import JobType, create_worker_profile
from chhaya_engine.planner import plan_day

from chhaya_backend.services.plan_service import PlanService


class BoardService:
    def __init__(self, plan_service: PlanService):
        self.plan_service = plan_service
        self._cached_board = None
        self._cache_time = 0.0

    def get_risk_board(self) -> dict[str, Any]:
        now = datetime.now(UTC)
        cities = list_cities()
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
            "cities": board_cities,
        }
