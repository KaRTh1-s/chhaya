"""Stats service for global metrics tracking."""
import os
from typing import Any

from chhaya_engine.cities import list_cities
from chhaya_engine.models import DayPlan, HourStatus

from chhaya_backend.store import DynamoDBStore


class StatsService:
    def __init__(self, store: DynamoDBStore):
        self.store = store

    def record_plan(self, plan: DayPlan) -> None:
        # Count flagged hours: AVOID or REDUCED with 15/45
        flagged = sum(
            1 for h in plan.hours 
            if h.status == HourStatus.AVOID or "HEAT_REDUCED_15_45" in h.reasons
        )
        
        # Calculate lead time to first dangerous window if any
        lead_time = 0.0
        lead_count = 0
        if plan.dangerous_windows:
            first_dang = plan.dangerous_windows[0]
            lead_time_hours = max(0.0, (first_dang.start - plan.generated_at).total_seconds() / 3600.0)
            lead_time = lead_time_hours
            lead_count = 1

        self.store.increment_stats(
            plans=1,
            hours_flagged=flagged,
            lead_time_sum=lead_time,
            lead_time_count=lead_count
        )

    def record_advisory(self, first_pass_valid: bool) -> None:
        self.store.increment_stats(
            advisories=1,
            llm_first_pass_valid=1 if first_pass_valid else 0
        )

    def get_global_stats(self) -> dict[str, Any]:
        stats = self.store.get_stats()
        crews = self.store.list_crews()
        cities = list_cities()
        seeded = (os.environ.get("CHHAYA_SEED_DEMO") == "1")
        
        return {
            "plans_generated": stats["plans_generated"],
            "cities_covered": len(cities),
            "hours_flagged": stats["hours_flagged"],
            "avg_lead_time_hours": stats["avg_lead_time_hours"],
            "crews_registered": len(crews),
            "advisories_generated": stats.get("advisories_generated", 0),
            "llm_first_pass_valid_rate": stats.get("llm_first_pass_valid_rate"),
            "alerts_sent": 0,
            "seeded": seeded,
        }
