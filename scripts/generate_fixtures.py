import json
from datetime import datetime, timedelta, timezone

def generate_fixture(filename, base_temp, max_temp_add, base_rh, max_rh_add, pm25_base, pm10_base, tz_offset):
    tz = timezone(timedelta(seconds=tz_offset))
    start = datetime(2026, 5, 1, 0, 0, tzinfo=tz)
    
    readings = []
    for i in range(48):
        dt = start + timedelta(hours=i)
        
        # Simple diurnal cycle
        hour = dt.hour
        # Peak heat at 14:00
        heat_factor = max(0, 1.0 - abs(hour - 14) / 10.0)
        
        temp = base_temp + max_temp_add * heat_factor
        rh = base_rh + max_rh_add * (1.0 - heat_factor)
        
        # Peak solar radiation at 12:00
        solar = max(0, 1.0 - abs(hour - 12) / 6.0) * 1000.0 if 6 <= hour <= 18 else 0.0
        
        # Smog peaks at night/morning
        smog_factor = 1.0 if hour < 8 or hour > 20 else 0.5
        pm25 = pm25_base * smog_factor
        pm10 = pm10_base * smog_factor

        readings.append({
            "time": dt.isoformat(),
            "temp_c": temp,
            "rh_pct": rh,
            "shortwave_wm2": solar,
            "wind_ms": 2.0,
            "pm2_5": pm25,
            "pm10": pm10
        })

    with open(f"engine/tests/fixtures/{filename}", "w") as f:
        json.dump(readings, f, indent=2)

if __name__ == "__main__":
    generate_fixture("delhi_summer_heat.json", 30, 15, 20, 20, 50, 100, 19800)
    generate_fixture("delhi_winter_smog.json", 10, 10, 60, 30, 300, 450, 19800)
    generate_fixture("chennai_humid_day.json", 28, 7, 70, 20, 30, 60, 19800)
    generate_fixture("coimbatore_mild.json", 20, 10, 50, 20, 20, 40, 19800)
