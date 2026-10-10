from collections import Counter
from datetime import datetime, timedelta

from chhaya_engine.aqi import calculate_aqi, get_aqi_category
from chhaya_engine.heat import calculate_wbgt
from chhaya_engine.models import (
    DayPlan,
    EvidenceCard,
    HourlyReading,
    HourPlan,
    HourStatus,
    RiskLevel,
    Window,
    WorkerProfile,
    Workload,
)
from chhaya_engine.thresholds import WBGT_LIMITS

REASON_SEVERITY = {
    "HEAT_WBGT_OVER_35": 100,
    "AIR_SEVERE_AVOID": 100,
    "HEAT_WBGT_OVER_LIMIT": 90,
    "AIR_VERY_POOR_ESCALATE": 80,
    "HEAT_REDUCED_15_45": 70,
    "HEAT_REDUCED_30_30": 60,
    "HEAT_REDUCED_45_15": 50,
    "AIR_POOR_HEAVY_ESCALATE": 40,
    "AIR_POOR_MASK": 30,
    "HEAT_CAUTION": 20,
    "HEAT_SAFE": 10,
    "OUTSIDE_SHIFT_WINDOW": 0,
}

def get_base_heat_status(wbgt: float, limit: float) -> tuple[HourStatus, list[str]]:
    if wbgt >= 35.0:
        return HourStatus.AVOID, ["HEAT_WBGT_OVER_35"]
    
    delta = round(wbgt - limit, 4)
    if delta <= -2.0:
        return HourStatus.WORK, ["HEAT_SAFE"]
    elif delta <= 0.0:
        return HourStatus.CAUTION, ["HEAT_CAUTION"]
    elif delta <= 2.0:
        return HourStatus.REDUCED, ["HEAT_REDUCED_45_15"]
    elif delta <= 4.0:
        return HourStatus.REDUCED, ["HEAT_REDUCED_30_30"]
    elif delta <= 6.0:
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

def get_dominant_reason(hours_in_block: list[HourPlan]) -> str:
    if not hours_in_block:
        return "OUTSIDE_SHIFT_WINDOW"
    
    all_reasons = []
    for h in hours_in_block:
        all_reasons.extend(h.reasons)
        
    non_safe = [r for r in all_reasons if r not in ("HEAT_SAFE", "OUTSIDE_SHIFT_WINDOW")]
    if not non_safe:
        return all_reasons[0] if all_reasons else "HEAT_SAFE"
        
    max_sev = max(REASON_SEVERITY.get(r, 0) for r in non_safe)
    candidates = [r for r in non_safe if REASON_SEVERITY.get(r, 0) == max_sev]
    
    # Ties -> most frequent in the block
    counts = Counter(candidates)
    most_common_code = max(candidates, key=lambda k: (counts[k], REASON_SEVERITY.get(k, 0)))
    return most_common_code

def compute_recommended_blocks(hours: list[HourPlan], profile: WorkerProfile) -> tuple[list[Window], bool]:
    shift_hours = [
        h for h in hours 
        if profile.preferred_start_hour <= h.hour.hour < profile.preferred_end_hour
    ]
    
    non_avoid_hours = [h for h in shift_hours if h.status != HourStatus.AVOID]
    if not non_avoid_hours:
        return [], True

    # Identify contiguous runs of non-AVOID hours
    runs: list[list[HourPlan]] = []
    current_run: list[HourPlan] = []
    for h in shift_hours:
        if h.status != HourStatus.AVOID:
            current_run.append(h)
        else:
            if current_run:
                runs.append(current_run)
                current_run = []
    if current_run:
        runs.append(current_run)

    if not runs:
        return [], True

    def hour_cost(h: HourPlan) -> float:
        if h.status == HourStatus.WORK: return 1.0
        if h.status == HourStatus.CAUTION: return 2.0
        if "HEAT_REDUCED_45_15" in h.reasons: return 3.0
        if "HEAT_REDUCED_30_30" in h.reasons: return 4.0
        if "HEAT_REDUCED_15_45" in h.reasons: return 5.0
        if h.status == HourStatus.REDUCED: return 3.5
        return 100.0

    # Find up to 2 contiguous blocks minimizing total cost
    best_blocks: list[list[HourPlan]] = []
    
    total_non_avoid = sum(len(r) for r in runs)
    if total_non_avoid <= profile.max_shift_hours and len(runs) <= 2:
        best_blocks = runs
    else:
        # Search candidate combinations of 1 or 2 sub-blocks
        all_subsegments: list[list[HourPlan]] = []
        for r in runs:
            for i in range(len(r)):
                for j in range(i + 1, min(i + profile.max_shift_hours + 1, len(r) + 1)):
                    all_subsegments.append(r[i:j])
        
        best_combo: tuple[list[HourPlan], ...] | None = None
        best_score = float('inf')
        
        # Check single subsegments
        for s1 in all_subsegments:
            dur = len(s1)
            if dur <= profile.max_shift_hours:
                cost = sum(hour_cost(h) for h in s1)
                # We want maximum duration up to max_shift_hours, then lowest cost
                score = -dur * 1000 + cost
                if score < best_score:
                    best_score = score
                    best_combo = (s1,)
        
        # Check 2 distinct subsegments from different runs
        for i, s1 in enumerate(all_subsegments):
            for s2 in all_subsegments[i+1:]:
                # Disjoint check: s1 and s2 must not overlap and be ordered
                if s1[-1].hour < s2[0].hour:
                    dur = len(s1) + len(s2)
                    if dur <= profile.max_shift_hours:
                        cost = sum(hour_cost(h) for h in s1) + sum(hour_cost(h) for h in s2)
                        score = -dur * 1000 + cost
                        if score < best_score:
                            best_score = score
                            best_combo = (s1, s2)

        best_blocks = list(best_combo) if best_combo else [runs[0][:profile.max_shift_hours]]

    windows: list[Window] = []
    for b in best_blocks:
        if not b: continue
        start_time = b[0].hour
        end_time = b[-1].hour + timedelta(hours=1)
        dom_reason = get_dominant_reason(b)
        
        # Dominant status
        status_counts = Counter(h.status for h in b)
        dom_status = max(status_counts.keys(), key=lambda s: (status_counts[s], get_risk_level(s).value))
        windows.append(Window(start_time, end_time, dom_status, dom_reason))

    return windows, False

def plan_day(readings: list[HourlyReading], profile: WorkerProfile, city_label: str, now: datetime) -> DayPlan:
    hours = []
    evidence = []
    limit = WBGT_LIMITS[profile.workload]

    mask_needed = False
    needs_hydration_warning = False

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
                reasons = ["AIR_SEVERE_AVOID"] + [x for x in reasons if x != "HEAT_SAFE"]
                mask_needed = True
            elif aqi >= 301:
                status = escalate_status(status)
                reasons = ["AIR_VERY_POOR_ESCALATE"] + [x for x in reasons if x != "HEAT_SAFE"]
                mask_needed = True
            elif aqi >= 201:
                if profile.workload == Workload.HEAVY:
                    status = escalate_status(status)
                    reasons = ["AIR_POOR_HEAVY_ESCALATE"] + [x for x in reasons if x != "HEAT_SAFE"]
                else:
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
        curr_block = [hours[0]]
        for i in range(1, len(hours)):
            if hours[i].status != curr_status:
                windows.append(Window(
                    curr_start, 
                    hours[i].hour, 
                    curr_status, 
                    get_dominant_reason(curr_block)
                ))
                curr_start = hours[i].hour
                curr_status = hours[i].status
                curr_block = [hours[i]]
            else:
                curr_block.append(hours[i])
        windows.append(Window(
            curr_start, 
            hours[-1].hour + timedelta(hours=1), 
            curr_status, 
            get_dominant_reason(curr_block)
        ))

    dangerous = [w for w in windows if w.status == HourStatus.AVOID or "HEAT_REDUCED_15_45" in w.summary_code]
    
    overall_risk = RiskLevel.LOW
    if any(h.risk_level == RiskLevel.EXTREME for h in hours): overall_risk = RiskLevel.EXTREME
    elif any(h.risk_level == RiskLevel.HIGH for h in hours): overall_risk = RiskLevel.HIGH
    elif any(h.risk_level == RiskLevel.MODERATE for h in hours): overall_risk = RiskLevel.MODERATE

    recommended_blocks, no_safe_window = compute_recommended_blocks(hours, profile)

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
        recommended_blocks=recommended_blocks,
        no_safe_window=no_safe_window,
        overall_risk=overall_risk,
        hydration=hydration,
        mask=mask,
        seek_help_lines=seek_help,
        evidence=evidence,
        assumptions_version="1.0"
    )
