"""Dev-only script to calibrate WBGT approximation against reference Liljegren outdoor WBGT model."""
import json
import math
from pathlib import Path

import numpy as np

try:
    from thermofeel.thermofeel import calculate_wbgt_liljegren
except ImportError:
    calculate_wbgt_liljegren = None

from chhaya_engine.heat import (
    CALIBRATION_OFFSET_C,
    SOLAR_ADJ_C_PER_KW_M2,
    calculate_wbgt,
)
from chhaya_engine.models import HourlyReading, SunExposure

FIXTURES_DIR = Path(__file__).resolve().parent.parent / "engine" / "tests" / "fixtures"

FIXTURES = [
    ("Delhi Extreme Heatwave (Jun 2025)", "real_delhi_summer_heat.json"),
    ("Delhi Winter Smog (Nov 2025)", "real_delhi_winter_smog.json"),
    ("Chennai Humid Heat (May 2025)", "real_chennai_humid_day.json"),
    ("Coimbatore Mild Winter (Jan 2025)", "real_coimbatore_mild.json"),
]

def run_calibration():
    if calculate_wbgt_liljegren is None:
        print("Error: Reference WBGT library (thermofeel) is not installed. Run 'pip install thermofeel' in dev environment.")
        return

    print("=" * 75)
    print("  CHHAYA WBGT CALIBRATION REPORT (AGAINST LILJEGREN OUTDOOR REFERENCE)")
    print("=" * 75)
    print(f"  Constants: SOLAR_ADJ_C_PER_KW_M2 = {SOLAR_ADJ_C_PER_KW_M2}")
    print(f"             CALIBRATION_OFFSET_C  = {CALIBRATION_OFFSET_C}")
    print("-" * 75)
    print(f"{'Fixture':<36} | {'Mean Bias':<10} | {'MAE':<8} | {'Max Error':<10}")
    print("-" * 75)

    all_diffs_after = []
    all_diffs_before = []

    for label, filename in FIXTURES:
        fpath = FIXTURES_DIR / filename
        with open(fpath, "r", encoding="utf-8") as f:
            data = json.load(f)

        diffs_after = []
        diffs_before = []

        for r in data["readings"]:
            t_c = float(r["temp_c"])
            rh = float(r["rh_pct"])
            sw = float(r["shortwave_wm2"])
            wind = max(0.5, float(r["wind_ms"]))

            t_k = t_c + 273.15
            cossza = max(0.01, min(1.0, sw / 1000.0)) if sw > 0 else 0.01
            fdir = 0.7 if sw > 0 else 0.0

            # Reference Liljegren WBGT (outdoor with solar load)
            ref_k = calculate_wbgt_liljegren(
                t2_k=t_k,
                rh=rh,
                pressure=1013.25,
                va=wind,
                ssrd=sw,
                fdir=fdir,
                cossza=cossza,
            )
            ref_c = float(ref_k) - 273.15

            # Our calibrated estimate
            reading_obj = HourlyReading(
                time=None,
                temp_c=t_c,
                rh_pct=rh,
                shortwave_wm2=sw,
                wind_ms=wind,
            )
            est_c = calculate_wbgt(reading_obj, SunExposure.FULL)

            # Uncalibrated ABOM baseline
            e = (rh / 100.0) * 6.105 * math.exp(17.27 * t_c / (237.7 + t_c))
            uncal_shade = 0.567 * t_c + 0.393 * e + 3.94
            uncal_solar = 3.0 * (sw / 1000.0)
            uncal_c = uncal_shade + uncal_solar

            diff_after = est_c - ref_c
            diff_before = uncal_c - ref_c

            diffs_after.append(diff_after)
            diffs_before.append(diff_before)

        mean_bias = np.mean(diffs_after)
        mae = np.mean(np.abs(diffs_after))
        max_err = np.max(np.abs(diffs_after))

        all_diffs_after.extend(diffs_after)
        all_diffs_before.extend(diffs_before)

        print(f"{label:<36} | {mean_bias:+6.2f} °C   | {mae:5.2f} °C  | {max_err:5.2f} °C")

    print("-" * 75)
    print(f"{'OVERALL (All 4 Recorded Days)':<36} | {np.mean(all_diffs_after):+6.2f} °C   | {np.mean(np.abs(all_diffs_after)):5.2f} °C  | {np.max(np.abs(all_diffs_after)):5.2f} °C")
    print("=" * 75)
    print("\nComparison Before vs After Calibration:")
    print(f"  Uncalibrated Baseline (ABOM): Mean Bias = {np.mean(all_diffs_before):+.2f} °C, Max Error = {np.max(np.abs(all_diffs_before)):.2f} °C")
    print(f"  Calibrated Model:             Mean Bias = {np.mean(all_diffs_after):+.2f} °C, Max Error = {np.max(np.abs(all_diffs_after)):.2f} °C")
    print("=" * 75)

if __name__ == "__main__":
    run_calibration()
