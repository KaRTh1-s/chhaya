"""Crew service for managing anonymous worker crews and their current exposure status."""
from datetime import UTC, datetime
from typing import Any

from chhaya_engine.cities import get_city
from chhaya_engine.models import JobType, Workload, create_worker_profile
from chhaya_engine.planner import plan_day

from chhaya_backend.services.audit_service import AuditService
from chhaya_backend.services.plan_service import PlanService
from chhaya_backend.store import DynamoDBStore


class CrewService:
    def __init__(self, store: DynamoDBStore, plan_service: PlanService, audit_service: AuditService):
        self.store = store
        self.plan_service = plan_service
        self.audit_service = audit_service

    def validate_create_crew(self, payload: dict[str, Any]) -> tuple[dict[str, Any] | None, str | None]:
        if not isinstance(payload, dict):
            return None, "Request body must be a JSON object"

        name = payload.get("name")
        if not name or not str(name).strip():
            return None, "Field 'name' is required and must not be empty"

        city_id = payload.get("city_id")
        if not city_id:
            return None, "Field 'city_id' is required"
        city = get_city(str(city_id))
        if not city:
            return None, f"Unknown city_id '{city_id}'"

        job_type_str = payload.get("job_type")
        if not job_type_str:
            return None, "Field 'job_type' is required"
        try:
            job_type = JobType[str(job_type_str).upper()]
        except KeyError:
            return None, f"Invalid job_type '{job_type_str}'. Must be one of: {', '.join(j.name for j in JobType)}"

        workload_str = payload.get("workload")
        workload = None
        if workload_str:
            try:
                workload = Workload[str(workload_str).upper()]
            except KeyError:
                return None, f"Invalid workload '{workload_str}'. Must be one of: {', '.join(w.name for w in Workload)}"

        size = payload.get("size", 1)
        try:
            size = int(size)
            if size < 1:
                return None, "Field 'size' must be at least 1"
        except (ValueError, TypeError):
            return None, "Field 'size' must be an integer"

        return {
            "name": str(name).strip(),
            "city_id": city.id,
            "job_type": job_type.value,
            "workload": workload.value if workload else None,
            "size": size,
        }, None

    def create_crew(self, data: dict[str, Any]) -> dict[str, Any]:
        saved = self.store.save_crew(data)
        self.audit_service.log_event("CREW_CREATED", {
            "crew_id": saved["id"],
            "city_id": saved["city_id"],
            "job_type": saved["job_type"],
            "size": saved["size"],
        })
        return saved

    def list_crews(self) -> list[dict[str, Any]]:
        return self.store.list_crews()

    def get_crew_with_plan(self, crew_id: str) -> dict[str, Any] | None:
        crew = self.store.get_crew(crew_id)
        if not crew:
            return None

        city = get_city(crew["city_id"])
        if not city:
            return crew

        job_type = JobType[crew["job_type"]]
        raw_workload = crew.get("workload")
        workload = None
        if raw_workload and raw_workload != "None":
            try:
                workload = Workload[raw_workload]
            except KeyError:
                workload = None

        profile = create_worker_profile(job_type, workload)
        
        now = datetime.now(UTC)
        readings = self.plan_service.get_readings(city.lat, city.lon, city.id)
        plan = plan_day(readings, profile, city.name, now)

        current_hr_plan = plan.hours[0] if plan.hours else None
        current_risk = current_hr_plan.risk_level.value if current_hr_plan else "LOW"

        return {
            **crew,
            "plan_summary": {
                "city_name": city.name,
                "current_risk": current_risk,
                "overall_risk": plan.overall_risk.value,
                "no_safe_window": plan.no_safe_window,
                "dangerous_windows_count": len(plan.dangerous_windows),
                "recommended_blocks": [w.to_dict() for w in plan.recommended_blocks],
            }
        }

    def delete_crew(self, crew_id: str) -> bool:
        crew = self.store.get_crew(crew_id)
        if not crew:
            return False
        deleted = self.store.delete_crew(crew_id)
        if deleted:
            self.audit_service.log_event("CREW_DELETED", {
                "crew_id": crew_id,
                "city_id": crew.get("city_id"),
            })
        return deleted
