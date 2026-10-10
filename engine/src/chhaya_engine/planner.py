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

    # Generate all valid contiguous candidate blocks (length in [2, max_shift_hours] and no AVOID)
    candidate_blocks: list[list[HourPlan]] = []
    n = len(shift_hours)
    for i in range(n):
        for j in range(i + 2, min(i + profile.max_shift_hours + 1, n + 1)):
            sub = shift_hours[i:j]
            if all(h.status != HourStatus.AVOID for h in sub):
                candidate_blocks.append(sub)

    if not candidate_blocks:
        return [], True

    def hour_penalty(h: HourPlan) -> float:
        if h.status == HourStatus.WORK:
            return 0.0
        if h.status == HourStatus.CAUTION:
            return 100.0
        if "HEAT_REDUCED_45_15" in h.reasons:
            return 1000.0
        if "HEAT_REDUCED_30_30" in h.reasons:
            return 2000.0
        if "HEAT_REDUCED_15_45" in h.reasons:
            return 4000.0
        if h.status == HourStatus.REDUCED:
            return 1500.0
        return 100000.0

    def block_worst_status(block: list[HourPlan]) -> HourStatus:
        order = [HourStatus.WORK, HourStatus.CAUTION, HourStatus.REDUCED, HourStatus.REST, HourStatus.AVOID]
        worst = HourStatus.WORK
        for h in block:
            if order.index(h.status) > order.index(worst):
                worst = h.status
        return worst

    # Score combinations of 1 or 2 non-overlapping blocks
    best_combo: tuple[list[HourPlan], ...] | None = None
    best_score = float('inf')

    # Single blocks
    for b in candidate_blocks:
        dur = len(b)
        penalty = sum(hour_penalty(h) for h in b)
        score = penalty - (dur * 1.0)
        if score < best_score:
            best_score = score
            best_combo = (b,)

    # Pairs of non-overlapping blocks
    num_cand = len(candidate_blocks)
    for i in range(num_cand):
        b1 = candidate_blocks[i]
        for j in range(i + 1, num_cand):
            b2 = candidate_blocks[j]
            if b1[-1].hour < b2[0].hour:
                dur = len(b1) + len(b2)
                if dur <= profile.max_shift_hours:
                    penalty = sum(hour_penalty(h) for h in b1) + sum(hour_penalty(h) for h in b2)
                    score = penalty - (dur * 1.0)
                    if score < best_score:
                        best_score = score
                        best_combo = (b1, b2)
            elif b2[-1].hour < b1[0].hour:
                dur = len(b1) + len(b2)
                if dur <= profile.max_shift_hours:
                    penalty = sum(hour_penalty(h) for h in b1) + sum(hour_penalty(h) for h in b2)
                    score = penalty - (dur * 1.0)
                    if score < best_score:
                        best_score = score
                        best_combo = (b2, b1)

    if not best_combo:
        return [], True

    chosen_blocks = sorted(best_combo, key=lambda b: b[0].hour)
    windows: list[Window] = []
    for b in chosen_blocks:
        start_time = b[0].hour
        end_time = b[-1].hour + timedelta(hours=1)
        w_status = block_worst_status(b)
        dom_reason = get_dominant_reason(b)
        windows.append(Window(start_time, end_time, w_status, dom_reason))

    return windows, False

def plan_day(readings: list[HourlyReading], profile: WorkerProfile, city_label: str, now: datetime) -> DayPlan:
    hours = []
    evidence = []
    limit = WBGT_LIMITS[profile.workload]

    mask_needed = False

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
        base_status, reasons = get_base_heat_status(wbgt, limit)
        status = base_status

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

        # Shift window check
        is_shift_hour = (profile.preferred_start_hour <= r.time.hour < profile.preferred_end_hour)
        if not is_shift_hour:
            status = HourStatus.REST
            reasons = ["OUTSIDE_SHIFT_WINDOW"]
            ev_ids = []

        # Hydration is derived ONLY from heat component (WBGT within caution band or worse)
        # Air quality escalation must never trigger FREQUENT.
        hour_hydration = "FREQUENT" if (is_shift_hour and base_status in (HourStatus.CAUTION, HourStatus.REDUCED, HourStatus.AVOID)) else "NORMAL"

        risk = get_risk_level(status)
        
        hours.append(HourPlan(
            hour=r.time,
            status=status,
            wbgt_c=wbgt,
            aqi=aqi,
            aqi_category=aqi_cat,
            risk_level=risk,
            reasons=reasons,
            evidence_ids=ev_ids,
            hydration=hour_hydration
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

    # Structured hydration summary
    frequent_windows = []
    in_freq = False
    freq_start = None
    prev_h = None
    for h in hours:
        if h.hydration == "FREQUENT":
            if not in_freq:
                in_freq = True
                freq_start = h.hour
            prev_h = h.hour
        else:
            if in_freq:
                frequent_windows.append({
                    "start": freq_start.isoformat(),
                    "end": (prev_h + timedelta(hours=1)).isoformat()
                })
                in_freq = False
    if in_freq and freq_start and prev_h:
        frequent_windows.append({
            "start": freq_start.isoformat(),
            "end": (prev_h + timedelta(hours=1)).isoformat()
        })

    hydration = {
        "frequent_windows": frequent_windows,
        "guideline": "about 250 ml every 15-20 minutes during frequent windows; otherwise drink normally"
    }

    mask = {"needed": mask_needed, "type": "N95/FFP2" if mask_needed else "None"}

    seek_help = ["SEEK_HELP_HEAT_ILLNESS"]
    if mask_needed or any("AIR" in r for h in hours for r in h.reasons):
        seek_help.append("SEEK_HELP_AIR_POLLUTION")

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
