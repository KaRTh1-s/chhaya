import json
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path

from chhaya_engine.models import HourlyReading

FIXTURES_DIR = Path(__file__).resolve().parent.parent.parent / "tests" / "fixtures"

@dataclass(frozen=True)
class Scenario:
    id: str
    label: str
    city_id: str
    date: str
    max_temp_c: float
    max_pm2_5: float
    source: str = "recorded"
    fixture_filename: str = ""

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "label": self.label,
            "city_id": self.city_id,
            "date": self.date,
            "max_temp_c": self.max_temp_c,
            "max_pm2_5": self.max_pm2_5,
            "source": self.source,
        }

SCENARIOS: list[Scenario] = [
    Scenario(
        id="delhi-heatwave-2025-06-09",
        label="Delhi Extreme Heatwave (Jun 2025)",
        city_id="delhi",
        date="2025-06-09",
        max_temp_c=43.7,
        max_pm2_5=163.0,
        source="recorded",
        fixture_filename="real_delhi_summer_heat.json",
    ),
    Scenario(
        id="delhi-smog-2025-11-23",
        label="Delhi Winter Smog (Nov 2025)",
        city_id="delhi",
        date="2025-11-23",
        max_temp_c=25.9,
        max_pm2_5=247.7,
        source="recorded",
        fixture_filename="real_delhi_winter_smog.json",
    ),
    Scenario(
        id="chennai-humid-2025-05-31",
        label="Chennai Humid Heat (May 2025)",
        city_id="chennai",
        date="2025-05-31",
        max_temp_c=36.2,
        max_pm2_5=33.5,
        source="recorded",
        fixture_filename="real_chennai_humid_day.json",
    ),
    Scenario(
        id="coimbatore-mild-2025-01-15",
        label="Coimbatore Mild Winter (Jan 2025)",
        city_id="coimbatore",
        date="2025-01-15",
        max_temp_c=26.8,
        max_pm2_5=24.0,
        source="recorded",
        fixture_filename="real_coimbatore_mild.json",
    ),
]

def list_scenarios() -> list[Scenario]:
    return SCENARIOS

def get_scenario(scenario_id: str) -> Scenario | None:
    for s in SCENARIOS:
        if s.id == scenario_id:
            return s
    return None

def load_scenario_readings(scenario: Scenario) -> list[HourlyReading]:
    candidates = [
        Path(__file__).resolve().parent / "fixtures" / scenario.fixture_filename,
        FIXTURES_DIR / scenario.fixture_filename,
        Path("tests/fixtures") / scenario.fixture_filename,
        Path("engine/tests/fixtures") / scenario.fixture_filename,
    ]
    path = next((p for p in candidates if p.exists()), candidates[0])

    with open(path, "r", encoding="utf-8") as f:
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
