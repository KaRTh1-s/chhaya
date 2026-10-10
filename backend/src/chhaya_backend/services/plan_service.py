"""Plan service for fetching weather/AQI readings and generating worker DayPlans."""
import json
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

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

from chhaya_backend.config import get_config
from chhaya_backend.services.audit_service import AuditService
from chhaya_backend.services.stats_service import StatsService
from chhaya_backend.store import DynamoDBStore

FIXTURES_DIR = Path(__file__).resolve().parent.parent.parent.parent.parent / "engine" / "tests" / "fixtures"

class PlanService:
    def __init__(self, store: DynamoDBStore, audit_service: AuditService, stats_service: StatsService):
        self.store = store
        self.audit_service = audit_service
        self.stats_service = stats_service
        self.config = get_config()
        self.openmeteo = OpenMeteoClient()

    def validate_plan_request(self, payload: dict[str, Any]) -> tuple[dict[str, Any] | None, str | None]:
        if not isinstance(payload, dict):
            return None, "Request body must be a JSON object"

        city_id = payload.get("city_id")
        lat = payload.get("lat")
        lon = payload.get("lon")

        city_label = "Custom Location"
        target_lat = None
        target_lon = None

        if city_id:
            city = get_city(str(city_id))
            if not city:
                return None, f"Unknown city_id '{city_id}'"
            city_label = city.name
            target_lat = round(city.lat, 2)
            target_lon = round(city.lon, 2)
        elif lat is not None and lon is not None:
            try:
                f_lat = float(lat)
                f_lon = float(lon)
            except (ValueError, TypeError):
                return None, "lat and lon must be valid numbers"

            if not (6.0 <= f_lat <= 38.0 and 68.0 <= f_lon <= 98.0):
                return None, "Coordinates outside India bounding box (lat: 6.0-38.0, lon: 68.0-98.0)"

            target_lat = round(f_lat, 2)
            target_lon = round(f_lon, 2)
            city_label = f"Location ({target_lat:.2f}, {target_lon:.2f})"
        else:
            return None, "Must provide either 'city_id' or both 'lat' and 'lon'"

        # Job type
        job_type_str = payload.get("job_type")
        if not job_type_str:
            return None, "Missing required field 'job_type'"
        try:
            job_type = JobType[str(job_type_str).upper()]
        except KeyError:
            return None, f"Invalid job_type '{job_type_str}'. Must be one of: {', '.join(j.name for j in JobType)}"

        # Workload
        workload = None
        if "workload" in payload and payload["workload"] is not None:
            try:
                workload = Workload[str(payload["workload"]).upper()]
            except KeyError:
                return None, f"Invalid workload '{payload['workload']}'. Must be one of: {', '.join(w.name for w in Workload)}"

        # Sun exposure
        sun_exposure = None
        if "sun_exposure" in payload and payload["sun_exposure"] is not None:
            try:
                sun_exposure = SunExposure[str(payload["sun_exposure"]).upper()]
            except KeyError:
                return None, f"Invalid sun_exposure '{payload['sun_exposure']}'. Must be one of: {', '.join(s.name for s in SunExposure)}"

        # Shift hours
        start_hr = payload.get("preferred_start_hour", 6)
        end_hr = payload.get("preferred_end_hour", 20)
        max_shift = payload.get("max_shift_hours", 8)

        try:
            start_hr = int(start_hr)
            end_hr = int(end_hr)
            max_shift = int(max_shift)
        except (ValueError, TypeError):
            return None, "Shift hours must be integers"

        if not (0 <= start_hr <= 23):
            return None, "preferred_start_hour must be between 0 and 23"
        if not (1 <= end_hr <= 24):
            return None, "preferred_end_hour must be between 1 and 24"
        if start_hr >= end_hr:
            return None, "preferred_start_hour must be strictly less than preferred_end_hour"
        if not (1 <= max_shift <= 16):
            return None, "max_shift_hours must be between 1 and 16"

        return {
            "city_id": city_id,
            "city_label": city_label,
            "lat": target_lat,
            "lon": target_lon,
            "job_type": job_type,
            "workload": workload,
            "sun_exposure": sun_exposure,
            "preferred_start_hour": start_hr,
            "preferred_end_hour": end_hr,
            "max_shift_hours": max_shift,
        }, None

    def _load_fixture_readings(self, city_id: str | None) -> list[HourlyReading]:
        filename = "real_coimbatore_mild.json"
        if city_id:
            c = city_id.lower()
            if "delhi" in c:
                filename = "real_delhi_summer_heat.json"
            elif "chennai" in c:
                filename = "real_chennai_humid_day.json"
            elif "coimbatore" in c:
                filename = "real_coimbatore_mild.json"

        fixture_path = FIXTURES_DIR / filename
        if not fixture_path.exists():
            # Fallback if running from packaged build
            fixture_path = Path("engine/tests/fixtures") / filename

        with open(fixture_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            raw_list = data.get("readings", data) if isinstance(data, dict) else data
            readings = []
            for d in raw_list:
                if isinstance(d, dict) and "temp_c" in d:
                    readings.append(HourlyReading(
                        time=datetime.fromisoformat(d["time"]),
                        temp_c=d["temp_c"],
                        rh_pct=d["rh_pct"],
                        shortwave_wm2=d["shortwave_wm2"],
                        wind_ms=d["wind_ms"],
                        pm2_5=d.get("pm2_5"),
                        pm10=d.get("pm10"),
                    ))
            return readings

    def get_readings(self, lat: float, lon: float, city_id: str | None = None) -> list[HourlyReading]:
        if self.config.data_mode == "fixture":
            return self._load_fixture_readings(city_id)

        lat_lon_key = f"{lat:.2f}_{lon:.2f}"
        cached_data = self.store.get_readings_cache(lat_lon_key)
        if cached_data:
            readings = []
            for d in cached_data:
                readings.append(HourlyReading(
                    time=datetime.fromisoformat(d["time"]),
                    temp_c=d["temp_c"],
                    rh_pct=d["rh_pct"],
                    shortwave_wm2=d["shortwave_wm2"],
                    wind_ms=d["wind_ms"],
                    pm2_5=d.get("pm2_5"),
                    pm10=d.get("pm10"),
                ))
            return readings

        # Live fetch
        readings = self.openmeteo.fetch_forecast(lat, lon)
        # Store in cache
        dict_readings = [r.to_dict() for r in readings]
        self.store.put_readings_cache(lat_lon_key, dict_readings, ttl_seconds=1800)
        self.audit_service.log_event("CACHE_REFRESH", {"location": lat_lon_key, "count": len(readings)})
        return readings

    def generate_plan(self, params: dict[str, Any], now: datetime | None = None) -> dict[str, Any]:
        profile = create_worker_profile(
            job_type=params["job_type"],
            workload=params["workload"],
            sun_exposure=params["sun_exposure"],
            preferred_start_hour=params["preferred_start_hour"],
            preferred_end_hour=params["preferred_end_hour"],
            max_shift_hours=params["max_shift_hours"],
        )
        
        now = now or datetime.now(UTC)
        readings = self.get_readings(params["lat"], params["lon"], params.get("city_id"))
        
        day_plan = plan_day(readings, profile, params["city_label"], now)
        
        # Record stats & audit
        self.stats_service.record_plan(day_plan)
        self.audit_service.log_event("PLAN_GENERATED", {
            "city": params["city_label"],
            "job_type": profile.job_type.value,
            "overall_risk": day_plan.overall_risk.value,
            "no_safe_window": day_plan.no_safe_window,
        })
        
        return day_plan.to_dict()
