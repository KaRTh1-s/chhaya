"""Grounding facts extractor for Chhaya Advisory Agent.
Extracts compact facts, driving evidence cards, peak WBGT/AQI, shift window metrics, and allowed numbers set.
"""
from dataclasses import asdict, dataclass
import re
from typing import Any

from chhaya_engine.models import DayPlan


@dataclass(frozen=True)
class FactWindow:
    start: str
    end: str
    status: str
    reason: str

@dataclass(frozen=True)
class FactBlock:
    start: str
    end: str
    status: str

@dataclass(frozen=True)
class FactEvidence:
    id: str
    label: str
    value: str
    unit: str
    hour: str

@dataclass(frozen=True)
class Facts:
    city: str
    city_id: str
    is_replay: bool
    recorded_date: str | None
    overall_risk: str
    windows: list[FactWindow]
    recommended_blocks: list[FactBlock]
    no_safe_window: bool
    mask_needed: bool
    mask_type: str
    hydration_frequent_windows: list[dict[str, str]]
    hydration_guideline: str
    seek_help_lines: list[str]
    evidence_cards: list[FactEvidence]
    allowed_numbers: set[str]
    # Driving Evidence Metadata
    peak_heat_evidence_id: str
    peak_heat_c: float
    peak_heat_hour: str
    peak_aqi_evidence_id: str
    peak_aqi_val: float | None
    peak_aqi_hour: str
    first_flagged_evidence_id: str | None
    first_flagged_hour: str | None
    evidence_id_to_numbers: dict[str, set[str]]

    def to_dict(self) -> dict[str, Any]:
        return {
            "city": self.city,
            "city_id": self.city_id,
            "is_replay": self.is_replay,
            "recorded_date": self.recorded_date,
            "overall_risk": self.overall_risk,
            "windows": [asdict(w) for w in self.windows],
            "recommended_blocks": [asdict(b) for b in self.recommended_blocks],
            "no_safe_window": self.no_safe_window,
            "mask_needed": self.mask_needed,
            "mask_type": self.mask_type,
            "hydration_frequent_windows": self.hydration_frequent_windows,
            "hydration_guideline": self.hydration_guideline,
            "seek_help_lines": self.seek_help_lines,
            "evidence_cards": [asdict(e) for e in self.evidence_cards],
            "peak_heat_evidence_id": self.peak_heat_evidence_id,
            "peak_heat_c": self.peak_heat_c,
            "peak_heat_hour": self.peak_heat_hour,
            "peak_aqi_evidence_id": self.peak_aqi_evidence_id,
            "peak_aqi_val": self.peak_aqi_val,
            "peak_aqi_hour": self.peak_aqi_hour,
        }

    def get_evidence_ids(self) -> set[str]:
        return {e.id for e in self.evidence_cards}


def _extract_numbers_from_str(s: str) -> set[str]:
    tokens = set()
    if not s:
        return tokens
    # Match decimal or integer numbers and HH:MM times
    for match in re.finditer(r"\b\d+(?:\.\d+)?(?::\d{2})?\b", s):
        raw = match.group(0)
        tokens.add(raw)
        if raw.isdigit():
            tokens.add(str(int(raw)))
        if ":" in raw:
            parts = raw.split(":")
            tokens.add(parts[0])
            tokens.add(str(int(parts[0])))
    return tokens


def build_facts_from_plan(plan: DayPlan | dict[str, Any]) -> Facts:
    if isinstance(plan, dict):
        city = str(plan.get("city_label", "Your City"))
        city_id = str(plan.get("scenario_id", "")).split("-")[0] if plan.get("scenario_id") else city.lower().split()[0]
        data_source = str(plan.get("data_source", "live"))
        is_replay = (data_source == "replay" or bool(plan.get("scenario_id")))
        recorded_date = plan.get("recorded_date")
        overall_risk = str(plan.get("overall_risk", "LOW"))
        raw_hours = plan.get("hours", [])
        raw_windows = plan.get("windows", [])
        raw_blocks = plan.get("recommended_blocks", [])
        no_safe = bool(plan.get("no_safe_window", False))
        raw_mask = plan.get("mask", {})
        raw_hydration = plan.get("hydration", {})
        seek_help = list(plan.get("seek_help_lines", []))
        raw_evidence = plan.get("evidence", [])
    else:
        city = plan.city_label
        sc_id = getattr(plan, "scenario_id", None)
        city_id = str(sc_id).split("-")[0] if sc_id else city.lower().split()[0]
        data_source = getattr(plan, "data_source", "live")
        is_replay = (data_source == "replay" or bool(sc_id))
        recorded_date = getattr(plan, "recorded_date", None)
        overall_risk = plan.overall_risk.value
        raw_hours = [h.to_dict() for h in plan.hours]

        raw_windows = [w.to_dict() for w in plan.windows]
        raw_blocks = [b.to_dict() for b in plan.recommended_blocks]
        no_safe = plan.no_safe_window
        raw_mask = plan.mask
        raw_hydration = plan.hydration
        seek_help = list(plan.seek_help_lines)
        raw_evidence = [e.to_dict() for e in plan.evidence]

    allowed_numbers = set()
    allowed_numbers.update(_extract_numbers_from_str(city))
    if recorded_date:
        allowed_numbers.update(_extract_numbers_from_str(recorded_date))

    # Parse Evidence Cards and index numbers per evidence card
    fact_evidence = []
    evidence_id_to_numbers = {}

    for e in raw_evidence:
        eid = str(e.get("id", ""))
        val_str = str(e.get("value", ""))
        label = str(e.get("label", ""))
        unit = str(e.get("unit", ""))
        # Extract hour from e e.g. "12:00"
        hour_val = ""
        # Try to parse hour from id e.g. ev-wbgt-1200 -> 12:00
        id_m = re.search(r"(\d{2})(\d{2})$", eid)
        if id_m:
            hour_val = f"{id_m.group(1)}:{id_m.group(2)}"
        
        card_numbers = set()
        card_numbers.update(_extract_numbers_from_str(val_str))
        card_numbers.update(_extract_numbers_from_str(hour_val))
        if id_m:
            card_numbers.add(id_m.group(1)) # "12"
            card_numbers.add(str(int(id_m.group(1)))) # "12" or "6"
        
        evidence_id_to_numbers[eid] = card_numbers
        allowed_numbers.update(card_numbers)

        fact_evidence.append(FactEvidence(
            id=eid,
            label=label,
            value=val_str,
            unit=unit,
            hour=hour_val,
        ))

    # Find shift hours to identify driving peaks inside the shift
    shift_hours = [h for h in raw_hours if "OUTSIDE_SHIFT_WINDOW" not in h.get("reasons", [])]
    if not shift_hours:
        shift_hours = raw_hours

    # Peak Heat Hour inside shift
    peak_h_hour = max(shift_hours, key=lambda h: float(h.get("wbgt_c", 0.0))) if shift_hours else raw_hours[0]
    peak_heat_c = float(peak_h_hour.get("wbgt_c", 0.0))
    time_str = peak_h_hour.get("hour", "")
    peak_heat_hour = time_str[11:16] if len(time_str) >= 16 else "12:00"
    hour_int_str = peak_heat_hour.replace(":", "")
    peak_heat_eid = f"ev-wbgt-{hour_int_str}"
    if peak_heat_eid not in evidence_id_to_numbers:
        # Fallback to first heat card
        heat_cards = [e.id for e in fact_evidence if "wbgt" in e.id]
        peak_heat_eid = heat_cards[0] if heat_cards else "ev-wbgt-0000"

    # Peak AQI Hour inside shift
    aqi_hours = [h for h in shift_hours if h.get("aqi") is not None]
    if aqi_hours:
        peak_a_hour = max(aqi_hours, key=lambda h: float(h.get("aqi", 0.0)))
        peak_aqi_val = float(peak_a_hour.get("aqi", 0.0))
        time_a_str = peak_a_hour.get("hour", "")
        peak_aqi_hour = time_a_str[11:16] if len(time_a_str) >= 16 else "08:00"
        hour_a_int_str = peak_aqi_hour.replace(":", "")
        peak_aqi_eid = f"ev-aqi-{hour_a_int_str}"
        if peak_aqi_eid not in evidence_id_to_numbers:
            aqi_cards = [e.id for e in fact_evidence if "aqi" in e.id]
            peak_aqi_eid = aqi_cards[0] if aqi_cards else peak_heat_eid
    else:
        peak_aqi_val = None
        peak_aqi_hour = "08:00"
        peak_aqi_eid = peak_heat_eid

    # First Flagged Dangerous Window
    flagged_wins = [w for w in raw_windows if w.get("status") in ("CAUTION", "REDUCED", "AVOID")]
    if flagged_wins:
        first_fw = flagged_wins[0]
        first_flagged_start = first_fw.get("start", "")
        first_flagged_hour = first_flagged_start[11:16] if len(first_flagged_start) >= 16 else "11:00"
        first_flagged_eid = f"ev-wbgt-{first_flagged_hour.replace(':', '')}"
        if first_flagged_eid not in evidence_id_to_numbers:
            first_flagged_eid = peak_heat_eid
    else:
        first_flagged_hour = None
        first_flagged_eid = None

    # Parse Windows
    fact_windows = []
    for w in raw_windows:
        start_str = w["start"][11:16] if len(w.get("start", "")) >= 16 else str(w.get("start", ""))
        end_str = w["end"][11:16] if len(w.get("end", "")) >= 16 else str(w.get("end", ""))
        fact_windows.append(FactWindow(
            start=start_str,
            end=end_str,
            status=str(w.get("status", "")),
            reason=str(w.get("summary_code", "")),
        ))
        allowed_numbers.update(_extract_numbers_from_str(start_str))
        allowed_numbers.update(_extract_numbers_from_str(end_str))
        allowed_numbers.add(f"{start_str}-{end_str}")
        allowed_numbers.add(f"{start_str[:2]}-{end_str[:2]}")

    # Parse Blocks
    fact_blocks = []
    for b in raw_blocks:
        start_str = b["start"][11:16] if len(b.get("start", "")) >= 16 else str(b.get("start", ""))
        end_str = b["end"][11:16] if len(b.get("end", "")) >= 16 else str(b.get("end", ""))
        fact_blocks.append(FactBlock(
            start=start_str,
            end=end_str,
            status=str(b.get("status", "")),
        ))
        allowed_numbers.update(_extract_numbers_from_str(start_str))
        allowed_numbers.update(_extract_numbers_from_str(end_str))
        allowed_numbers.add(f"{start_str}-{end_str}")
        allowed_numbers.add(f"{start_str[:2]}-{end_str[:2]}")

    mask_needed = bool(raw_mask.get("needed", False))
    mask_type = str(raw_mask.get("type", "None"))
    allowed_numbers.update(_extract_numbers_from_str(mask_type))

    freq_windows = []
    for hw in raw_hydration.get("frequent_windows", []):
        start_str = hw["start"][11:16] if len(hw.get("start", "")) >= 16 else str(hw.get("start", ""))
        end_str = hw["end"][11:16] if len(hw.get("end", "")) >= 16 else str(hw.get("end", ""))
        freq_windows.append({"start": start_str, "end": end_str})
        allowed_numbers.update(_extract_numbers_from_str(start_str))
        allowed_numbers.update(_extract_numbers_from_str(end_str))

    hydration_guideline = str(raw_hydration.get("guideline", "Drink normally."))
    allowed_numbers.update(_extract_numbers_from_str(hydration_guideline))
    # Standard numbers like 250, 15, 20
    allowed_numbers.update({"250", "15", "20", "15-20", "15–20", "30", "45"})

    for line in seek_help:
        allowed_numbers.update(_extract_numbers_from_str(line))

    # Basic universal counts
    allowed_numbers.update({"1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "23", "24"})

    return Facts(
        city=city,
        city_id=city_id,
        is_replay=is_replay,
        recorded_date=recorded_date,
        overall_risk=overall_risk,
        windows=fact_windows,
        recommended_blocks=fact_blocks,
        no_safe_window=no_safe,
        mask_needed=mask_needed,
        mask_type=mask_type,
        hydration_frequent_windows=freq_windows,
        hydration_guideline=hydration_guideline,
        seek_help_lines=seek_help,
        evidence_cards=fact_evidence,
        allowed_numbers=allowed_numbers,
        peak_heat_evidence_id=peak_heat_eid,
        peak_heat_c=peak_heat_c,
        peak_heat_hour=peak_heat_hour,
        peak_aqi_evidence_id=peak_aqi_eid,
        peak_aqi_val=peak_aqi_val,
        peak_aqi_hour=peak_aqi_hour,
        first_flagged_evidence_id=first_flagged_eid,
        first_flagged_hour=first_flagged_hour,
        evidence_id_to_numbers=evidence_id_to_numbers,
    )
