"""Grounding facts extractor for Chhaya Advisory Agent."""
import re
from dataclasses import asdict, dataclass
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

@dataclass(frozen=True)
class Facts:
    city: str
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

    def to_dict(self) -> dict[str, Any]:
        return {
            "city": self.city,
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
        }

    def get_evidence_ids(self) -> set[str]:
        return {e.id for e in self.evidence_cards}


def _extract_numbers_from_str(s: str) -> set[str]:
    tokens = set()
    # Match decimal or integer numbers and HH:MM times
    for match in re.finditer(r"\b\d+(?:\.\d+)?(?::\d{2})?\b", s):
        raw = match.group(0)
        tokens.add(raw)
        # If integer like 06, also add 6
        if raw.isdigit():
            tokens.add(str(int(raw)))
        # If time like 13:00, also add 13 and 13:00
        if ":" in raw:
            parts = raw.split(":")
            tokens.add(parts[0])
            tokens.add(str(int(parts[0])))
    return tokens


def build_facts_from_plan(plan: DayPlan | dict[str, Any]) -> Facts:
    if isinstance(plan, dict):
        city = str(plan.get("city_label", "Your City"))
        overall_risk = str(plan.get("overall_risk", "LOW"))
        raw_windows = plan.get("windows", [])
        raw_blocks = plan.get("recommended_blocks", [])
        no_safe = bool(plan.get("no_safe_window", False))
        raw_mask = plan.get("mask", {})
        raw_hydration = plan.get("hydration", {})
        seek_help = list(plan.get("seek_help_lines", []))
        raw_evidence = plan.get("evidence", [])
    else:
        city = plan.city_label
        overall_risk = plan.overall_risk.value
        raw_windows = [w.to_dict() for w in plan.windows]
        raw_blocks = [b.to_dict() for b in plan.recommended_blocks]
        no_safe = plan.no_safe_window
        raw_mask = plan.mask
        raw_hydration = plan.hydration
        seek_help = list(plan.seek_help_lines)
        raw_evidence = [e.to_dict() for e in plan.evidence]

    fact_windows = []
    allowed_numbers = set()
    allowed_numbers.update(_extract_numbers_from_str(city))


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
        # Add range representations e.g. 13-17, 13:00-17:00
        allowed_numbers.add(f"{start_str}-{end_str}")
        allowed_numbers.add(f"{start_str[:2]}-{end_str[:2]}")

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
    allowed_numbers.update(_extract_numbers_from_str(mask_type)) # e.g. 95 from N95, 2 from FFP2

    freq_windows = []
    for hw in raw_hydration.get("frequent_windows", []):
        start_str = hw["start"][11:16] if len(hw.get("start", "")) >= 16 else str(hw.get("start", ""))
        end_str = hw["end"][11:16] if len(hw.get("end", "")) >= 16 else str(hw.get("end", ""))
        freq_windows.append({"start": start_str, "end": end_str})
        allowed_numbers.update(_extract_numbers_from_str(start_str))
        allowed_numbers.update(_extract_numbers_from_str(end_str))
        allowed_numbers.add(f"{start_str}-{end_str}")
        allowed_numbers.add(f"{start_str[:2]}-{end_str[:2]}")

    hydration_guideline = str(raw_hydration.get("guideline", "Drink normally."))
    allowed_numbers.update(_extract_numbers_from_str(hydration_guideline)) # e.g. 250, 15, 20

    fact_evidence = []
    for e in raw_evidence:
        ev_obj = FactEvidence(
            id=str(e.get("id", "")),
            label=str(e.get("label", "")),
            value=str(e.get("value", "")),
            unit=str(e.get("unit", "")),
        )
        fact_evidence.append(ev_obj)
        allowed_numbers.update(_extract_numbers_from_str(ev_obj.value))
        # Also extract hour from ev_id e.g. ev-wbgt-1200 -> 12, 12:00
        ev_id_nums = _extract_numbers_from_str(ev_obj.id)
        for num in ev_id_nums:
            if len(num) == 4 and num.isdigit():
                allowed_numbers.add(f"{num[:2]}:{num[2:]}")
                allowed_numbers.add(num[:2])
                allowed_numbers.add(str(int(num[:2])))

    for line in seek_help:
        allowed_numbers.update(_extract_numbers_from_str(line))

    # Basic universal counts
    allowed_numbers.update({"1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "12", "24"})

    return Facts(
        city=city,
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
    )
