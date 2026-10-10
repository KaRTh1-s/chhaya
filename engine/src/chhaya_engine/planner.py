from typing import List, Tuple
from datetime import datetime
from chhaya_engine.models import (
    HourlyReading, WorkerProfile, HourPlan, Window, DayPlan, 
    HourStatus, RiskLevel, EvidenceCard, Workload, JobType
)
from chhaya_engine.heat import calculate_wbgt
from chhaya_engine.aqi import calculate_aqi, get_aqi_category
from chhaya_engine.thresholds import WBGT_LIMITS

def get_base_heat_status(wbgt: float, limit: float) -> Tuple[HourStatus, List[str]]:
    if wbgt >= 35.0:
        return HourStatus.AVOID, ["HEAT_WBGT_OVER_35"]
    
    delta = wbgt - limit
    if delta <= -2:
        return HourStatus.WORK, ["HEAT_SAFE"]
    elif delta <= 0:
        return HourStatus.CAUTION, ["HEAT_CAUTION"]
    elif delta <= 2:
        return HourStatus.REDUCED, ["HEAT_REDUCED_45_15"]
    elif delta <= 4:
        return HourStatus.REDUCED, ["HEAT_REDUCED_30_30"]
    elif delta <= 6:
        return HourStatus.REDUCED, ["HEAT_REDUCED_15_45"]
    else:
        return HourStatus.AVOID, ["HEAT_WBGT_OVER_LIMIT"]

def escalate_status(status: HourStatus) -> HourStatus:
    if status == HourStatus.WORK: return HourStatus.CAUTION
    if status == HourStatus.CAUTION: return HourStatus.REDUCED
    if status == HourStatus.REDUCED: return HourStatus.AVOID
    return status

def get_risk_level(status: HourStatus) -> RiskLevel:
    if status == HourStatus.WORK: return RiskLevel.LOW
    if status == HourStatus.CAUTION: return RiskLevel.MODERATE
    if status == HourStatus.REDUCED: return RiskLevel.HIGH
    return RiskLevel.EXTREME

def plan_day(readings: List[HourlyReading], profile: WorkerProfile, city_label: str, now: datetime) -> DayPlan:
    hours = []
    evidence = []
    limit = WBGT_LIMITS[profile.workload]

    mask_needed = False
    needs_hydration_warning = False

    # Extract valid shift hours prioritizing best blocks - a simplification: just take max_shift_hours of best hours inside window.
    # To do this optimally: find contiguous block or just take hours in window. 
    # For now, simply filter by preferred_start/end and if > max_shift_hours, take the lowest risk ones.
    
    for r in readings:
        ev_ids = []
        hour_str = r.time.strftime("%H%M")
        
        # WBGT
        wbgt = calculate_wbgt(r, profile.sun_exposure)
        ev_id_heat = f"ev-wbgt-{hour_str}"
        evidence.append(EvidenceCard(ev_id_heat, "Heat Stress (WBGT)", f"{wbgt:.1f}", "°C", "Open-Meteo", f"{r.time.hour:02d}:00"))
        ev_ids.append(ev_id_heat)

        # AQI
        aqi = calculate_aqi(r)
        aqi_cat = get_aqi_category(aqi) if aqi is not None else None
        
        if aqi is not None:
            ev_id_aqi = f"ev-aqi-{hour_str}"
            evidence.append(EvidenceCard(ev_id_aqi, "Air Quality (AQI)", f"{aqi:.0f}", "Index", "Open-Meteo", f"{r.time.hour:02d}:00"))
            ev_ids.append(ev_id_aqi)

        # Base Status
        status, reasons = get_base_heat_status(wbgt, limit)

        # Air Overlay
        if aqi is not None:
            if aqi >= 401 and profile.workload in [Workload.MODERATE, Workload.HEAVY]:
                status = HourStatus.AVOID
                reasons.append("AIR_SEVERE_AVOID")
                mask_needed = True
            elif aqi >= 301:
                status = escalate_status(status)
                reasons.append("AIR_VERY_POOR_ESCALATE")
                mask_needed = True
            elif aqi >= 201:
                if profile.workload == Workload.HEAVY:
                    status = escalate_status(status)
                    reasons.append("AIR_POOR_HEAVY_ESCALATE")
                reasons.append("AIR_POOR_MASK")
                mask_needed = True

        # Window constraints
        if r.time.hour < profile.preferred_start_hour or r.time.hour >= profile.preferred_end_hour:
            status = HourStatus.REST
            reasons = ["OUTSIDE_SHIFT_WINDOW"]
            ev_ids = []

        if status in [HourStatus.CAUTION, HourStatus.REDUCED, HourStatus.AVOID]:
            needs_hydration_warning = True

        risk = get_risk_level(status)
        
        hours.append(HourPlan(
            hour=r.time,
            status=status,
            wbgt_c=wbgt,
            aqi=aqi,
            aqi_category=aqi_cat,
            risk_level=risk,
            reasons=reasons,
            evidence_ids=ev_ids
        ))

    # Merge windows
    windows = []
    if hours:
        curr_start = hours[0].hour
        curr_status = hours[0].status
        curr_reasons = hours[0].reasons
        for i in range(1, len(hours)):
            if hours[i].status != curr_status:
                windows.append(Window(curr_start, hours[i].hour, curr_status, curr_reasons[0] if curr_reasons else ""))
                curr_start = hours[i].hour
                curr_status = hours[i].status
                curr_reasons = hours[i].reasons
        windows.append(Window(curr_start, hours[-1].hour, curr_status, curr_reasons[0] if curr_reasons else ""))

    dangerous = [w for w in windows if w.status == HourStatus.AVOID or "HEAT_REDUCED_15_45" in w.summary_code]
    
    overall_risk = RiskLevel.LOW
    if any(h.risk_level == RiskLevel.EXTREME for h in hours): overall_risk = RiskLevel.EXTREME
    elif any(h.risk_level == RiskLevel.HIGH for h in hours): overall_risk = RiskLevel.HIGH
    elif any(h.risk_level == RiskLevel.MODERATE for h in hours): overall_risk = RiskLevel.MODERATE

    hydration = {"warning": needs_hydration_warning, "text": "Drink ~250 ml every 15-20 minutes." if needs_hydration_warning else "Drink normally."}
    mask = {"needed": mask_needed, "type": "N95/FFP2" if mask_needed else "None"}

    seek_help = [
        "Stop work, move to shade, and call emergency services if you experience confusion, fainting, or stop sweating."
    ]

    return DayPlan(
        city_label=city_label,
        generated_at=now,
        hours=hours,
        windows=windows,
        dangerous_windows=dangerous,
        overall_risk=overall_risk,
        hydration=hydration,
        mask=mask,
        seek_help_lines=seek_help,
        evidence=evidence,
        assumptions_version="1.0"
    )
