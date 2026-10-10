"""Record real hourly weather and air quality data from Open-Meteo archive APIs into fixture JSON files."""
import json
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

FIXTURES_DIR = Path(__file__).resolve().parent.parent / "engine" / "tests" / "fixtures"

CITIES = {
    "delhi_heat": {
        "name": "delhi",
        "lat": 28.61,
        "lon": 77.23,
        "date": "2025-06-09",
        "target_file": "real_delhi_summer_heat.json",
        "desc": "Delhi extreme heat day (2025-06-09)",
    },
    "delhi_smog": {
        "name": "delhi",
        "lat": 28.61,
        "lon": 77.23,
        "date": "2025-11-23",
        "target_file": "real_delhi_winter_smog.json",
        "desc": "Delhi winter smog peak PM2.5 day (2025-11-23)",
    },
    "chennai_humid": {
        "name": "chennai",
        "lat": 13.08,
        "lon": 80.27,
        "date": "2025-05-31",
        "target_file": "real_chennai_humid_day.json",
        "desc": "Chennai humid hot day (2025-05-31)",
    },
    "coimbatore_mild": {
        "name": "coimbatore",
        "lat": 11.01,
        "lon": 76.95,
        "date": "2025-01-15",
        "target_file": "real_coimbatore_mild.json",
        "desc": "Coimbatore mild normal day (2025-01-15)",
    },
}

def fetch_real_day_data(lat: float, lon: float, date_str: str):
    weather_params = {
        "latitude": lat,
        "longitude": lon,
        "start_date": date_str,
        "end_date": date_str,
        "hourly": "temperature_2m,relative_humidity_2m,shortwave_radiation,wind_speed_10m",
        "timezone": "Asia/Kolkata",
    }
    weather_url = f"https://archive-api.open-meteo.com/v1/archive?{urllib.parse.urlencode(weather_params)}"
    
    aqi_params = {
        "latitude": lat,
        "longitude": lon,
        "start_date": date_str,
        "end_date": date_str,
        "hourly": "pm10,pm2_5",
        "timezone": "Asia/Kolkata",
    }
    aqi_url = f"https://air-quality-api.open-meteo.com/v1/air-quality?{urllib.parse.urlencode(aqi_params)}"

    req_w = urllib.request.Request(weather_url, headers={"User-Agent": "Chhaya-Fixture-Recorder/1.0"})
    with urllib.request.urlopen(req_w) as resp:
        w_data = json.loads(resp.read().decode())

    req_a = urllib.request.Request(aqi_url, headers={"User-Agent": "Chhaya-Fixture-Recorder/1.0"})
    with urllib.request.urlopen(req_a) as resp:
        a_data = json.loads(resp.read().decode())

    times = w_data["hourly"]["time"]
    temps = w_data["hourly"]["temperature_2m"]
    rhs = w_data["hourly"]["relative_humidity_2m"]
    sws = w_data["hourly"]["shortwave_radiation"]
    winds = w_data["hourly"]["wind_speed_10m"]

    pm25s = a_data.get("hourly", {}).get("pm2_5", [None] * len(times))
    pm10s = a_data.get("hourly", {}).get("pm10", [None] * len(times))

    readings = []
    max_temp = -999.0
    max_pm25 = 0.0

    for i, t_str in enumerate(times):
        # Format time with timezone offset +05:30
        iso_time = f"{t_str}:00+05:30" if len(t_str) == 16 else f"{t_str}+05:30"
        temp = float(temps[i]) if temps[i] is not None else 25.0
        rh = float(rhs[i]) if rhs[i] is not None else 50.0
        sw = float(sws[i]) if sws[i] is not None else 0.0
        wind = float(winds[i]) if winds[i] is not None else 2.0
        pm25 = float(pm25s[i]) if i < len(pm25s) and pm25s[i] is not None else None
        pm10 = float(pm10s[i]) if i < len(pm10s) and pm10s[i] is not None else None

        max_temp = max(max_temp, temp)
        if pm25 and pm25 > max_pm25: max_pm25 = pm25

        readings.append({
            "time": iso_time,
            "temp_c": round(temp, 1),
            "rh_pct": round(rh, 1),
            "shortwave_wm2": round(sw, 1),
            "wind_ms": round(wind, 1),
            "pm2_5": round(pm25, 1) if pm25 is not None else None,
            "pm10": round(pm10, 1) if pm10 is not None else None,
        })

    meta = {
        "source_weather_url": weather_url,
        "source_aqi_url": aqi_url,
        "date": date_str,
        "retrieved_at": datetime.now(timezone.utc).isoformat(),
        "note": "real recorded data",
        "max_temp_c": max_temp,
        "max_pm2_5": max_pm25,
    }

    return meta, readings

def record_all():
    FIXTURES_DIR.mkdir(parents=True, exist_ok=True)
    summary = []

    for key, cfg in CITIES.items():
        print(f"Recording {cfg['desc']}...")
        meta, readings = fetch_real_day_data(cfg["lat"], cfg["lon"], cfg["date"])
        
        output_data = {
            "_meta": meta,
            "readings": readings
        }

        target_path = FIXTURES_DIR / cfg["target_file"]
        with open(target_path, "w", encoding="utf-8") as f:
            json.dump(output_data, f, indent=2)

        print(f"  -> Saved to {target_path.name}: Max Temp = {meta['max_temp_c']}°C, Max PM2.5 = {meta['max_pm2_5']} µg/m³")
        summary.append({
            "key": key,
            "file": cfg["target_file"],
            "date": cfg["date"],
            "max_temp_c": meta["max_temp_c"],
            "max_pm2_5": meta["max_pm2_5"],
        })

    return summary

if __name__ == "__main__":
    record_all()
