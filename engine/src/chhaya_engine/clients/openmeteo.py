import json
import time
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone
from typing import Any

from chhaya_engine.models import HourlyReading


class OpenMeteoClient:
    def __init__(self, fetcher=None):
        # Allow injecting a fetcher for tests (mocking network)
        self.fetcher = fetcher if fetcher else self._default_fetcher
        
    def _default_fetcher(self, url: str) -> dict[str, Any]:
        for attempt in range(3):
            try:
                req = urllib.request.Request(url, headers={'User-Agent': 'Chhaya-Hackathon/0.1'})
                with urllib.request.urlopen(req, timeout=10) as response:
                    return json.loads(response.read().decode('utf-8'))
            except urllib.error.URLError as e:
                if attempt == 2:
                    raise RuntimeError(f"Failed to fetch {url}: {e}") from e
                time.sleep(2 ** attempt)

    def fetch_forecast(self, lat: float, lon: float) -> list[HourlyReading]:
        # Weather
        w_url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&hourly=temperature_2m,relative_humidity_2m,shortwave_radiation,wind_speed_10m&timezone=auto&forecast_days=2&wind_speed_unit=ms"
        # Air Quality
        a_url = f"https://air-quality-api.open-meteo.com/v1/air-quality?latitude={lat}&longitude={lon}&hourly=pm2_5,pm10&timezone=auto&forecast_days=2"

        w_data = self.fetcher(w_url)
        a_data = self.fetcher(a_url)
        
        utc_offset_seconds = w_data.get("utc_offset_seconds", 0)
        tz = timezone(timedelta(seconds=utc_offset_seconds))
        
        w_hourly = w_data.get("hourly", {})
        a_hourly = a_data.get("hourly", {})
        
        w_times = w_hourly.get("time", [])
        temps = w_hourly.get("temperature_2m", [])
        rhs = w_hourly.get("relative_humidity_2m", [])
        rads = w_hourly.get("shortwave_radiation", [])
        winds = w_hourly.get("wind_speed_10m", [])
        
        # AQI times should match weather times since both are 2-day hourly starting at 00:00 local
        pm25s = a_hourly.get("pm2_5", [])
        pm10s = a_hourly.get("pm10", [])

        readings = []
        for i, time_str in enumerate(w_times):
            # Parse Open-Meteo local time (e.g. "2023-01-01T00:00") and attach timezone
            dt = datetime.fromisoformat(time_str).replace(tzinfo=tz)
            
            pm25 = pm25s[i] if i < len(pm25s) else None
            pm10 = pm10s[i] if i < len(pm10s) else None

            # Handle null values in the JSON array gracefully (they appear as None in Python)
            readings.append(HourlyReading(
                time=dt,
                temp_c=temps[i] if temps[i] is not None else 0.0,
                rh_pct=rhs[i] if rhs[i] is not None else 0.0,
                shortwave_wm2=rads[i] if rads[i] is not None else 0.0,
                wind_ms=winds[i] if winds[i] is not None else 0.0,
                pm2_5=pm25,
                pm10=pm10
            ))
            
        return readings
