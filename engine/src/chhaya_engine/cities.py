from dataclasses import dataclass


@dataclass
class City:
    id: str
    name: str
    lat: float
    lon: float
    tz: str
    state: str = ""

CITIES = [
    City("delhi", "Delhi", 28.6139, 77.2090, "Asia/Kolkata", "Delhi"),
    City("mumbai", "Mumbai", 19.0760, 72.8777, "Asia/Kolkata", "Maharashtra"),
    City("chennai", "Chennai", 13.0827, 80.2707, "Asia/Kolkata", "Tamil Nadu"),
    City("coimbatore", "Coimbatore", 11.0168, 76.9558, "Asia/Kolkata", "Tamil Nadu"),
    City("bengaluru", "Bengaluru", 12.9716, 77.5946, "Asia/Kolkata", "Karnataka"),
    City("hyderabad", "Hyderabad", 17.3850, 78.4867, "Asia/Kolkata", "Telangana"),
    City("kolkata", "Kolkata", 22.5726, 88.3639, "Asia/Kolkata", "West Bengal"),
    City("ahmedabad", "Ahmedabad", 23.0225, 72.5714, "Asia/Kolkata", "Gujarat"),
    City("pune", "Pune", 18.5204, 73.8567, "Asia/Kolkata", "Maharashtra"),
    City("jaipur", "Jaipur", 26.9124, 75.7873, "Asia/Kolkata", "Rajasthan"),
    City("lucknow", "Lucknow", 26.8467, 80.9462, "Asia/Kolkata", "Uttar Pradesh"),
    City("nagpur", "Nagpur", 21.1458, 79.0882, "Asia/Kolkata", "Maharashtra"),
]

def list_cities() -> list[City]:
    return list(CITIES)

def get_city(city_id: str) -> City | None:
    city_id = city_id.lower().strip()
    for c in CITIES:
        if c.id == city_id:
            return c
    return None
