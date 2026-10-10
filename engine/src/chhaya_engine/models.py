from dataclasses import asdict, dataclass
from datetime import datetime
from enum import Enum


class JobType(str, Enum):
    RIDER = "RIDER"
    CONSTRUCTION = "CONSTRUCTION"
    VENDOR = "VENDOR"
    SANITATION = "SANITATION"

class Workload(str, Enum):
    LIGHT = "LIGHT"
    MODERATE = "MODERATE"
    HEAVY = "HEAVY"

class SunExposure(str, Enum):
    FULL = "FULL"
    PARTIAL = "PARTIAL"
    SHADE = "SHADE"

class HourStatus(str, Enum):
    WORK = "WORK"
    CAUTION = "CAUTION"
    REDUCED = "REDUCED"
    REST = "REST"
    AVOID = "AVOID"

class RiskLevel(str, Enum):
    LOW = "LOW"
    MODERATE = "MODERATE"
    HIGH = "HIGH"
    EXTREME = "EXTREME"

@dataclass(frozen=True)
class HourlyReading:
    time: datetime
    temp_c: float
    rh_pct: float
    shortwave_wm2: float
    wind_ms: float
    pm2_5: float | None = None
    pm10: float | None = None

    def to_dict(self):
        return {
            "time": self.time.isoformat(),
            "temp_c": self.temp_c,
            "rh_pct": self.rh_pct,
            "shortwave_wm2": self.shortwave_wm2,
            "wind_ms": self.wind_ms,
            "pm2_5": self.pm2_5,
            "pm10": self.pm10,
        }

@dataclass(frozen=True)
class WorkerProfile:
    job_type: JobType
    workload: Workload
    sun_exposure: SunExposure
    preferred_start_hour: int = 6
    preferred_end_hour: int = 20
    max_shift_hours: int = 8

    def to_dict(self):
        return {
            "job_type": self.job_type.value,
            "workload": self.workload.value,
            "sun_exposure": self.sun_exposure.value,
            "preferred_start_hour": self.preferred_start_hour,
            "preferred_end_hour": self.preferred_end_hour,
            "max_shift_hours": self.max_shift_hours,
        }

@dataclass(frozen=True)
class EvidenceCard:
    id: str
    label: str
    value: str
    unit: str
    source: str
    hour_range: str

    def to_dict(self):
        return asdict(self)

@dataclass(frozen=True)
class HourPlan:
    hour: datetime
    status: HourStatus
    wbgt_c: float
    aqi: float | None
    aqi_category: str | None
    risk_level: RiskLevel
    reasons: list[str]
    evidence_ids: list[str]
    hydration: str = "NORMAL"

    def to_dict(self):
        d = asdict(self)
        d["hour"] = self.hour.isoformat()
        d["status"] = self.status.value
        d["risk_level"] = self.risk_level.value
        d["hydration"] = self.hydration
        return d

@dataclass(frozen=True)
class Window:
    start: datetime
    end: datetime
    status: HourStatus
    summary_code: str

    def to_dict(self):
        d = asdict(self)
        d["start"] = self.start.isoformat()
        d["end"] = self.end.isoformat()
        d["status"] = self.status.value
        return d

@dataclass(frozen=True)
class DayPlan:
    city_label: str
    generated_at: datetime
    hours: list[HourPlan]
    windows: list[Window]
    dangerous_windows: list[Window]
    recommended_blocks: list[Window]
    no_safe_window: bool
    overall_risk: RiskLevel
    hydration: dict
    mask: dict
    seek_help_lines: list[str]
    evidence: list[EvidenceCard]
    assumptions_version: str

    def to_dict(self):
        return {
            "city_label": self.city_label,
            "generated_at": self.generated_at.isoformat(),
            "hours": [h.to_dict() for h in self.hours],
            "windows": [w.to_dict() for w in self.windows],
            "dangerous_windows": [w.to_dict() for w in self.dangerous_windows],
            "recommended_blocks": [w.to_dict() for w in self.recommended_blocks],
            "no_safe_window": self.no_safe_window,
            "overall_risk": self.overall_risk.value,
            "hydration": self.hydration,
            "mask": self.mask,
            "seek_help_lines": self.seek_help_lines,
            "evidence": [e.to_dict() for e in self.evidence],
            "assumptions_version": self.assumptions_version,
        }

def create_worker_profile(
    job_type: JobType,
    workload: Workload | None = None,
    sun_exposure: SunExposure | None = None,
    preferred_start_hour: int = 6,
    preferred_end_hour: int = 20,
    max_shift_hours: int = 8
) -> WorkerProfile:
    if workload is None:
        if job_type == JobType.RIDER:
            workload = Workload.MODERATE
        elif job_type == JobType.CONSTRUCTION:
            workload = Workload.HEAVY
        elif job_type == JobType.VENDOR:
            workload = Workload.LIGHT
        elif job_type == JobType.SANITATION:
            workload = Workload.HEAVY
        
    if sun_exposure is None:
        if job_type == JobType.VENDOR:
            sun_exposure = SunExposure.PARTIAL
        else:
            sun_exposure = SunExposure.FULL

    return WorkerProfile(
        job_type=job_type,
        workload=workload,
        sun_exposure=sun_exposure,
        preferred_start_hour=preferred_start_hour,
        preferred_end_hour=preferred_end_hour,
        max_shift_hours=max_shift_hours
    )
