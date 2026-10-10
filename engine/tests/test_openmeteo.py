import json
import pytest
from datetime import datetime, timezone
from chhaya_engine.clients.openmeteo import OpenMeteoClient

def test_openmeteo_client_with_mock():
    # Mock fetcher
    def mock_fetcher(url):
        if "air-quality" in url:
            return {
                "utc_offset_seconds": 19800,
                "hourly": {
                    "time": ["2026-05-01T00:00"],
                    "pm2_5": [50.0],
                    "pm10": [100.0]
                }
            }
        else:
            return {
                "utc_offset_seconds": 19800,
                "hourly": {
                    "time": ["2026-05-01T00:00"],
                    "temperature_2m": [30.0],
                    "relative_humidity_2m": [50.0],
                    "shortwave_radiation": [100.0],
                    "wind_speed_10m": [2.0]
                }
            }

    client = OpenMeteoClient(fetcher=mock_fetcher)
    readings = client.fetch_forecast(28.6, 77.2)
    
    assert len(readings) == 1
    assert readings[0].temp_c == 30.0
    assert readings[0].pm2_5 == 50.0
    assert readings[0].time.tzinfo is not None

@pytest.mark.live
def test_openmeteo_client_live():
    client = OpenMeteoClient()
    readings = client.fetch_forecast(28.6, 77.2)
    assert len(readings) > 0
    assert readings[0].temp_c is not None
